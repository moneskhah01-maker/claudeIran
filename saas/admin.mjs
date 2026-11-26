// Owner (admin) API, /api/admin/*: one owner login (scrypt hash in ADMIN_PASSWORD_HASH), then
// early-access list, customers, top-up review, credit adjustments and the audit log.
// Admin sessions live in memory: a server restart logs the owner out, which is acceptable for one person.
import { randomToken, checkPassword, readCookie, cookie, rateLimiter } from './security.mjs';
import { post, reconcile, InsufficientFunds } from './ledger.mjs';

const COOKIE = 'ci_admin';
const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours
const STATUSES = new Set(['new', 'approved', 'invited', 'rejected']);

// CSV for Excel: UTF-8 BOM so Persian shows correctly, and cells that start
// with = + - @ are prefixed with ' so Excel never runs them as formulas.
function toCsv(rows) {
  const cell = v => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}

export function createAdmin({ db, payments, send, readJson, withLock, loadList, saveList, clientIp, audit, env = process.env }) {
  const HASH = env.ADMIN_PASSWORD_HASH || '';
  if (!HASH) console.log('[admin] ADMIN_PASSWORD_HASH not set — admin panel login is off');

  const sessions = new Map(); // token -> expiry time
  const fails = rateLimiter({ max: 5, windowMs: 15 * 60_000 });

  function session(req) {
    const token = readCookie(req, COOKIE);
    const exp = token && sessions.get(token);
    if (!exp) return null;
    if (exp < Date.now()) { sessions.delete(token); return null; }
    return token;
  }
  const adminCookie = (req, value, maxAge) => cookie(req, COOKIE, value, { maxAge, path: '/api/admin', sameSite: 'Strict' });

  async function login(req, res) {
    const ip = clientIp(req);
    if (!HASH) return send(req, res, 503, { ok: false, error: 'admin_disabled' });
    if (fails.over(ip, false)) return send(req, res, 429, { ok: false, error: 'rate_limited' }, undefined, { 'Retry-After': '900' });
    const body = await readJson(req, 2048);
    if (!checkPassword(body.password || '', HASH)) {
      fails.over(ip);
      console.warn(`[admin] failed login from ${ip}`);
      return send(req, res, 401, { ok: false, error: 'wrong_password' });
    }
    fails.reset(ip);
    const token = randomToken();
    sessions.set(token, Date.now() + SESSION_MS);
    await audit('admin', 'admin_login', null, null, ip);
    return send(req, res, 200, { ok: true }, undefined, { 'Set-Cookie': adminCookie(req, token, SESSION_MS / 1000) });
  }

  function logout(req, res) {
    sessions.delete(readCookie(req, COOKIE));
    return send(req, res, 200, { ok: true }, undefined, { 'Set-Cookie': adminCookie(req, '', 0) });
  }

  // --- early-access list (JSON file, unchanged from before the SaaS) ---
  async function signups(req, res) {
    const items = await withLock(loadList);
    const stats = { total: items.length, new: 0, approved: 0, invited: 0, rejected: 0, last7: 0 };
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const x of items) {
      stats[x.status || 'new']++;
      if (Date.parse(x.createdAt) > week) stats.last7++;
    }
    items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return send(req, res, 200, { ok: true, stats, items });
  }

  // Status and note are admin-only fields. updatedAt is left alone on purpose,
  // so an admin edit does not re-send the row to the Google Sheet.
  async function updateSignup(req, res) {
    const body = await readJson(req, 4096);
    const email = String(body.email || '').trim().toLowerCase();
    if (body.status !== undefined && !STATUSES.has(body.status)) return send(req, res, 422, { ok: false, error: 'bad_status' });
    if (body.note !== undefined && String(body.note).length > 1000) return send(req, res, 422, { ok: false, error: 'note_too_long' });
    const item = await withLock(async () => {
      const all = await loadList();
      const x = all.find(i => i.email === email);
      if (!x) return null;
      if (body.status !== undefined) x.status = body.status;
      if (body.note !== undefined) x.note = String(body.note).trim();
      x.adminAt = new Date().toISOString();
      await saveList(all);
      return x;
    });
    if (!item) return send(req, res, 404, { ok: false, error: 'not_found' });
    return send(req, res, 200, { ok: true, item });
  }

  async function signupsCsv(req, res) {
    const items = await withLock(loadList);
    const head = ['email', 'name', 'mobile', 'role', 'usecase', 'source', 'status', 'note', 'createdAt'];
    const rows = [head, ...items.map(x => head.map(k => k === 'status' ? (x.status || 'new') : x[k]))];
    const name = `claudeiran-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    return send(req, res, 200, toCsv(rows), 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="${name}"` });
  }

  // --- SaaS ---
  async function overview(req, res) {
    if (!db) return send(req, res, 200, { ok: true, saas: false });
    const [[t], mismatched] = await Promise.all([
      db.query(`SELECT
          (SELECT count(*) FROM users) AS users,
          (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days') AS users7,
          (SELECT COALESCE(sum(balance), 0) FROM accounts) AS balances,
          (SELECT count(*) FROM payments WHERE status = 'pending') AS pending_payments,
          (SELECT COALESCE(sum(amount), 0) FROM payments WHERE status = 'paid' AND resolved_at > now() - interval '30 days') AS paid30,
          (SELECT COALESCE(sum(cost), 0) FROM usage_events WHERE status = 'ok' AND created_at > now() - interval '30 days') AS usage30,
          (SELECT count(*) FROM usage_events WHERE created_at > now() - interval '24 hours') AS requests24`),
      reconcile(db),
    ]);
    return send(req, res, 200, { ok: true, saas: true, totals: t, ledgerOk: mismatched.length === 0, upstream: env.UPSTREAM || 'mock', payments: payments.info() });
  }

  async function users(req, res) {
    const q = String(new URL(req.url, 'http://x').searchParams.get('q') || '').trim().slice(0, 100);
    const rows = await db.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.status, u.created_at, a.id AS account_id, a.balance, a.held,
              (SELECT count(*) FROM api_keys k WHERE k.account_id = a.id AND k.revoked_at IS NULL) AS keys,
              (SELECT max(created_at) FROM usage_events e WHERE e.account_id = a.id) AS last_request
         FROM users u JOIN accounts a ON a.owner_id = u.id
        WHERE $1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.mobile LIKE '%' || $1 || '%'
        ORDER BY u.id DESC LIMIT 200`, [q]);
    return send(req, res, 200, { ok: true, rows });
  }

  async function userDetail(req, res) {
    const id = Number(new URL(req.url, 'http://x').searchParams.get('id')) || 0;
    const [u] = await db.query(`SELECT u.id, u.name, u.email, u.mobile, u.status, u.created_at, u.mobile_verified_at, a.id AS account_id, a.balance, a.held
                                  FROM users u JOIN accounts a ON a.owner_id = u.id WHERE u.id = $1`, [id]);
    if (!u) return send(req, res, 404, { ok: false, error: 'not_found' });
    const [keys, ledger, pays, usage] = await Promise.all([
      db.query('SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE account_id = $1 ORDER BY id DESC', [u.account_id]),
      db.query('SELECT id, amount, kind, ref, note, actor, created_at FROM ledger WHERE account_id = $1 ORDER BY id DESC LIMIT 100', [u.account_id]),
      db.query('SELECT id, provider, amount, status, receipt, ref_id, note, created_at, resolved_at FROM payments WHERE account_id = $1 ORDER BY id DESC LIMIT 100', [u.account_id]),
      db.query('SELECT id, model, status, input_tokens, output_tokens, cost, created_at FROM usage_events WHERE account_id = $1 ORDER BY id DESC LIMIT 50', [u.account_id]),
    ]);
    return send(req, res, 200, { ok: true, user: u, keys, ledger, payments: pays, usage });
  }

  async function setUserStatus(req, res) {
    const b = await readJson(req, 1024);
    if (!['active', 'suspended'].includes(b.status)) return send(req, res, 422, { ok: false, error: 'bad_status' });
    const [u] = await db.query('UPDATE users SET status = $2 WHERE id = $1 RETURNING id', [Number(b.id) || 0, b.status]);
    if (!u) return send(req, res, 404, { ok: false, error: 'not_found' });
    if (b.status === 'suspended') await db.query('DELETE FROM sessions WHERE user_id = $1', [u.id]); // log them out everywhere
    await audit('admin', 'user_status', `user:${u.id}`, { status: b.status }, clientIp(req));
    return send(req, res, 200, { ok: true });
  }

  // Manual credit correction (gift, refund, mistake). Needs a note: every Rial must be explainable later.
  async function adjust(req, res) {
    const b = await readJson(req, 2048);
    const amount = Number(b.amount), note = String(b.note ?? '').trim();
    if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 10_000_000_000) return send(req, res, 422, { ok: false, error: 'bad_amount' });
    if (note.length < 3 || note.length > 300) return send(req, res, 422, { ok: false, error: 'note_required' });
    try {
      const row = await db.tx(t => post(t, { accountId: Number(b.accountId) || 0, amount, kind: amount > 0 ? 'adjustment' : 'refund', note, actor: 'admin' }));
      await audit('admin', 'credit_adjust', `account:${b.accountId}`, { amount, note }, clientIp(req));
      return send(req, res, 200, { ok: true, balance: row.balance });
    } catch (e) {
      if (e instanceof InsufficientFunds) return send(req, res, 409, { ok: false, error: 'insufficient_funds' });
      if (/not found/.test(e.message)) return send(req, res, 404, { ok: false, error: 'not_found' });
      throw e;
    }
  }

  async function paymentsList(req, res) {
    const status = new URL(req.url, 'http://x').searchParams.get('status') || 'pending';
    const rows = await db.query(
      `SELECT p.*, u.id AS user_id, u.name, u.email, u.mobile FROM payments p
         JOIN accounts a ON a.id = p.account_id JOIN users u ON u.id = a.owner_id
        WHERE $1 = 'all' OR p.status = $1 ORDER BY p.id DESC LIMIT 200`, [status]);
    return send(req, res, 200, { ok: true, rows });
  }

  async function paymentReview(req, res) {
    const b = await readJson(req, 2048);
    if (!['approve', 'reject'].includes(b.decision)) return send(req, res, 422, { ok: false, error: 'bad_decision' });
    const [p] = await db.query(`SELECT provider FROM payments WHERE id = $1`, [Number(b.id) || 0]);
    if (!p) return send(req, res, 404, { ok: false, error: 'not_found' });
    if (p.provider !== 'manual') return send(req, res, 409, { ok: false, error: 'not_manual' });
    const note = String(b.note ?? '').trim().slice(0, 300) || null;
    const done = await payments.review(Number(b.id), b.decision, note, 'admin');
    if (!done) return send(req, res, 409, { ok: false, error: 'not_pending' });
    await audit('admin', `payment_${b.decision}`, `payment:${b.id}`, { amount: done.amount, note }, clientIp(req));
    return send(req, res, 200, { ok: true });
  }

  async function auditList(req, res) {
    const rows = await db.query('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300');
    return send(req, res, 200, { ok: true, rows });
  }

  const saasRoutes = {
    'GET /api/admin/users': users,
    'GET /api/admin/user': userDetail,
    'POST /api/admin/users/status': setUserStatus,
    'POST /api/admin/adjust': adjust,
    'GET /api/admin/payments': paymentsList,
    'POST /api/admin/payments/review': paymentReview,
    'GET /api/admin/audit': auditList,
  };
  const routes = {
    'GET /api/admin/me': (req, res) => send(req, res, 200, { ok: true }),
    'POST /api/admin/logout': logout,
    'GET /api/admin/overview': overview,
    'GET /api/admin/signups': signups,
    'POST /api/admin/signups/update': updateSignup,
    'GET /api/admin/signups.csv': signupsCsv,
  };

  return {
    routes: {
      'POST /api/admin/login': login,
      // everything else requires an admin session
      ...Object.fromEntries(Object.entries({ ...routes, ...(db ? saasRoutes : {}) }).map(([k, fn]) => [k, (req, res) =>
        session(req) ? fn(req, res) : send(req, res, 401, { ok: false, error: 'unauthorized' })])),
    },
  };
}
