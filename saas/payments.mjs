// Top-ups. Two providers behind one module:
//   manual   - always on. The customer pays by card-to-card / bank transfer using MANUAL_PAY_INFO,
//              submits the tracking number, and an admin approves or rejects it in /admin.
//   zarinpal - on when ZARINPAL_MERCHANT_ID is set. ZARINPAL_SANDBOX=1 uses Zarinpal's test gateway.
//
// Crediting is idempotent: a payment moves pending -> paid in one conditional UPDATE, and only the
// request that wins that UPDATE adds credit. A refreshed callback page or a double click cannot pay twice.
import { post } from './ledger.mjs';

export function createPayments({ db, audit, env = process.env, fetch = globalThis.fetch }) {
  const MIN = Number(env.TOPUP_MIN_RIAL || 1_000_000);       // 100,000 Toman
  const MAX = Number(env.TOPUP_MAX_RIAL || 1_000_000_000);   // 100,000,000 Toman
  const merchant = env.ZARINPAL_MERCHANT_ID || '';
  const zpHost = env.ZARINPAL_SANDBOX === '1' ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';

  const checkAmount = a => Number.isSafeInteger(a) && a >= MIN && a <= MAX;

  function info() {
    return {
      currency: 'IRR', min: MIN, max: MAX,
      manual: { enabled: true, instructions: env.MANUAL_PAY_INFO || '' },
      zarinpal: { enabled: !!merchant, sandbox: env.ZARINPAL_SANDBOX === '1' },
    };
  }

  // Marks a pending payment paid and credits the account, once. Returns false if it was not pending.
  async function markPaid(id, fields, actor) {
    return db.tx(async t => {
      const [p] = await t.query(
        `UPDATE payments SET status = 'paid', resolved_at = now(), ref_id = COALESCE($2, ref_id), card_pan = COALESCE($3, card_pan), note = COALESCE($4, note)
          WHERE id = $1 AND status = 'pending' RETURNING *`,
        [id, fields.refId ?? null, fields.cardPan ?? null, fields.note ?? null]);
      if (!p) return null;
      await post(t, { accountId: p.account_id, amount: p.amount, kind: 'topup', ref: `payment:${p.id}`, note: p.provider, actor });
      return p;
    });
  }

  async function markFailed(id, status, note) {
    const [p] = await db.query(`UPDATE payments SET status = $2, note = $3, resolved_at = now() WHERE id = $1 AND status = 'pending' RETURNING *`, [id, status, note]);
    return p || null;
  }

  async function createManual(accountId, amount, receipt) {
    const [{ n }] = await db.query(`SELECT count(*) AS n FROM payments WHERE account_id = $1 AND provider = 'manual' AND status = 'pending'`, [accountId]);
    if (n >= 3) return { error: 'too_many_pending' };
    const [p] = await db.query(`INSERT INTO payments (account_id, provider, amount, receipt) VALUES ($1, 'manual', $2, $3) RETURNING *`, [accountId, amount, receipt]);
    return { payment: p };
  }

  async function startZarinpal({ accountId, amount, callbackUrl, mobile, email }) {
    if (!merchant) return { error: 'zarinpal_disabled' };
    const [p] = await db.query(`INSERT INTO payments (account_id, provider, amount) VALUES ($1, 'zarinpal', $2) RETURNING *`, [accountId, amount]);
    const metadata = {};
    if (mobile) metadata.mobile = '0' + mobile.slice(3);
    if (email) metadata.email = email;
    let j;
    try {
      const r = await fetch(`${zpHost}/pg/v4/payment/request.json`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ merchant_id: merchant, amount, currency: 'IRR', callback_url: callbackUrl, description: `شارژ اعتبار کلاود ایران #${p.id}`, metadata }),
        signal: AbortSignal.timeout(15000),
      });
      j = await r.json();
    } catch (e) {
      await markFailed(p.id, 'failed', `request: ${e.message}`);
      return { error: 'gateway_unreachable' };
    }
    if (j?.data?.code !== 100 || !j.data.authority) {
      await markFailed(p.id, 'failed', `request code ${j?.data?.code ?? JSON.stringify(j?.errors).slice(0, 200)}`);
      return { error: 'gateway_refused' };
    }
    await db.query('UPDATE payments SET authority = $2 WHERE id = $1', [p.id, j.data.authority]);
    return { payment: p, redirect: `${zpHost}/pg/StartPay/${j.data.authority}` };
  }

  // Zarinpal sends the customer back to us with ?Authority=...&Status=OK|NOK. Never trust Status alone:
  // the payment counts only after our server asks Zarinpal to verify it (code 100, or 101 = verified before).
  // The payment is found by `authority` alone (unique per payment), so nothing depends on how the gateway builds the return URL.
  async function zarinpalCallback({ authority, status }) {
    const [p] = authority ? await db.query(`SELECT * FROM payments WHERE provider = 'zarinpal' AND authority = $1`, [String(authority)]) : [];
    if (!p) return { result: 'unknown' };
    if (p.status === 'paid') return { result: 'paid', payment: p };
    if (p.status !== 'pending') return { result: 'failed', payment: p };
    if (status !== 'OK') { await markFailed(p.id, 'failed', 'canceled by customer'); return { result: 'failed', payment: p }; }
    let j;
    try {
      const r = await fetch(`${zpHost}/pg/v4/payment/verify.json`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ merchant_id: merchant, amount: p.amount, authority: p.authority }),
        signal: AbortSignal.timeout(15000),
      });
      j = await r.json();
    } catch (e) {
      // Leave it pending: the admin can re-check it later. Do not mark failed, money may have moved.
      console.error('[zarinpal] verify unreachable:', e.message);
      return { result: 'pending', payment: p };
    }
    const code = j?.data?.code;
    if (code === 100 || code === 101) {
      const paid = await markPaid(p.id, { refId: String(j.data.ref_id ?? ''), cardPan: j.data.card_pan || null }, 'zarinpal');
      if (paid) await audit('zarinpal', 'payment_paid', `payment:${p.id}`, { amount: p.amount, ref: j.data.ref_id });
      return { result: 'paid', payment: paid || p };
    }
    await markFailed(p.id, 'failed', `verify code ${code ?? JSON.stringify(j?.errors).slice(0, 200)}`);
    return { result: 'failed', payment: p };
  }

  // Admin decision on a manual payment.
  async function review(id, decision, note, actor) {
    if (decision === 'approve') return markPaid(id, { note }, actor);
    if (decision === 'reject') return markFailed(id, 'rejected', note || null);
    throw new Error('decision must be approve or reject');
  }

  return { info, checkAmount, createManual, startZarinpal, zarinpalCallback, review };
}
