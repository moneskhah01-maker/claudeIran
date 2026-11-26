// Customer panel API (/api/app/*). Every route needs a logged-in customer, and every query is
// scoped to that customer's account_id: a customer can only ever see or change their own data.
import { randomToken, sha256 } from './security.mjs';
import { pricing } from './gateway.mjs';

const MAX_KEYS = 20;

export function createAppApi({ db, auth, payments, send, readJson, audit, clientIp, publicUrl }) {
  // wraps a handler so it only runs for a logged-in customer
  const authed = fn => async (req, res) => {
    const s = await auth.currentUser(req);
    if (!s) return send(req, res, 401, { ok: false, error: 'unauthorized' });
    return fn(req, res, s);
  };

  async function overview(req, res, { user, account }) {
    const [days, [keys], recent] = await Promise.all([
      db.query(
        `SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(sum(u.cost), 0) AS cost, count(u.id) AS requests,
                COALESCE(sum(u.input_tokens + u.output_tokens), 0) AS tokens
           FROM generate_series(current_date - 29, current_date, interval '1 day') d
           LEFT JOIN usage_events u ON u.account_id = $1 AND u.created_at >= d AND u.created_at < d + interval '1 day' AND u.status = 'ok'
          GROUP BY d ORDER BY d`, [account.id]),
      db.query(`SELECT count(*) FILTER (WHERE revoked_at IS NULL) AS active FROM api_keys WHERE account_id = $1`, [account.id]),
      db.query(`SELECT id, model, status, input_tokens, output_tokens, cost, latency_ms, created_at FROM usage_events WHERE account_id = $1 ORDER BY id DESC LIMIT 10`, [account.id]),
    ]);
    return send(req, res, 200, {
      ok: true,
      user: { name: user.name, email: user.email, mobile: user.mobile },
      balance: account.balance, held: account.held, available: account.balance - account.held,
      activeKeys: keys.active, days, recent,
      upstream: process.env.UPSTREAM || 'mock',
      models: Object.entries(pricing.models).map(([id, p]) => ({ id, label: p.label, input: p.input, output: p.output })),
    });
  }

  // --- API keys: the full secret is shown once, at creation; afterwards only its prefix ---
  async function listKeys(req, res, { account }) {
    const keys = await db.query(`SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE account_id = $1 ORDER BY id DESC`, [account.id]);
    return send(req, res, 200, { ok: true, keys });
  }

  async function createKey(req, res, { user, account }) {
    const b = await readJson(req, 1024);
    const name = String(b.name ?? '').trim().slice(0, 60) || 'کلید بدون نام';
    const [{ n }] = await db.query('SELECT count(*) AS n FROM api_keys WHERE account_id = $1 AND revoked_at IS NULL', [account.id]);
    if (n >= MAX_KEYS) return send(req, res, 409, { ok: false, error: 'too_many_keys' });
    const secret = 'ci_' + randomToken(32);
    const [k] = await db.query(
      `INSERT INTO api_keys (account_id, name, prefix, key_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, prefix, created_at`,
      [account.id, name, secret.slice(0, 10), sha256(secret)]);
    await audit(`user:${user.id}`, 'key_create', `key:${k.id}`, { name }, clientIp(req));
    return send(req, res, 201, { ok: true, key: k, secret });
  }

  async function revokeKey(req, res, { user, account }) {
    const b = await readJson(req, 1024);
    const [k] = await db.query(`UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND account_id = $2 AND revoked_at IS NULL RETURNING id`, [Number(b.id) || 0, account.id]);
    if (!k) return send(req, res, 404, { ok: false, error: 'not_found' });
    await audit(`user:${user.id}`, 'key_revoke', `key:${k.id}`, null, clientIp(req));
    return send(req, res, 200, { ok: true });
  }

  // --- history ---
  async function ledger(req, res, { account }) {
    const rows = await db.query(`SELECT id, amount, kind, ref, note, created_at FROM ledger WHERE account_id = $1 ORDER BY id DESC LIMIT 200`, [account.id]);
    return send(req, res, 200, { ok: true, rows });
  }

  async function usage(req, res, { account }) {
    const rows = await db.query(
      `SELECT u.id, u.model, u.status, u.input_tokens, u.output_tokens, u.cost, u.latency_ms, u.created_at, k.name AS key_name
         FROM usage_events u LEFT JOIN api_keys k ON k.id = u.api_key_id
        WHERE u.account_id = $1 ORDER BY u.id DESC LIMIT 200`, [account.id]);
    return send(req, res, 200, { ok: true, rows });
  }

  // --- top-ups ---
  async function listPayments(req, res, { account }) {
    const rows = await db.query(`SELECT id, provider, amount, status, receipt, ref_id, note, created_at, resolved_at FROM payments WHERE account_id = $1 ORDER BY id DESC LIMIT 100`, [account.id]);
    return send(req, res, 200, { ok: true, rows, info: payments.info() });
  }

  async function topup(req, res, { user, account }) {
    const b = await readJson(req, 2048);
    const amount = Number(b.amount);
    if (!payments.checkAmount(amount)) return send(req, res, 422, { ok: false, error: 'bad_amount', limits: payments.info() });
    if (b.method === 'manual') {
      const receipt = String(b.receipt ?? '').trim();
      if (receipt.length < 4 || receipt.length > 200) return send(req, res, 422, { ok: false, error: 'bad_receipt' });
      const r = await payments.createManual(account.id, amount, receipt);
      if (r.error) return send(req, res, 409, { ok: false, error: r.error });
      await audit(`user:${user.id}`, 'topup_manual', `payment:${r.payment.id}`, { amount }, clientIp(req));
      return send(req, res, 201, { ok: true, payment: r.payment });
    }
    if (b.method === 'zarinpal') {
      const r = await payments.startZarinpal({ accountId: account.id, amount, callbackUrl: `${publicUrl(req)}/pay/zarinpal/callback`, mobile: user.mobile, email: user.email });
      if (r.error) return send(req, res, 502, { ok: false, error: r.error });
      return send(req, res, 200, { ok: true, redirect: r.redirect });
    }
    return send(req, res, 422, { ok: false, error: 'bad_method' });
  }

  // Browser lands here from Zarinpal; we verify server-side, then send the customer back to the panel.
  async function zarinpalReturn(req, res) {
    const q = new URL(req.url, 'http://x').searchParams;
    const r = await payments.zarinpalCallback({ authority: q.get('Authority'), status: q.get('Status') });
    return send(req, res, 303, '', 'text/plain; charset=utf-8', { Location: `/app/?pay=${r.result}#billing` });
  }

  return {
    routes: {
      'GET /api/app/overview': authed(overview),
      'GET /api/app/keys': authed(listKeys),
      'POST /api/app/keys': authed(createKey),
      'POST /api/app/keys/revoke': authed(revokeKey),
      'GET /api/app/ledger': authed(ledger),
      'GET /api/app/usage': authed(usage),
      'GET /api/app/payments': authed(listPayments),
      'POST /api/app/topup': authed(topup),
      'GET /pay/zarinpal/callback': zarinpalReturn,
    },
  };
}
