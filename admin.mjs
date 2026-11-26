// Admin API for claudeiran.com: owner login + early-access (waitlist) management.
// server.mjs sends every /api/admin/* request here.
// The password is never stored: only its scrypt hash, in ADMIN_PASSWORD_HASH.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = 'ci_admin';
const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours
const STATUSES = new Set(['new', 'approved', 'invited', 'rejected']);

// Used once from the command line to create ADMIN_PASSWORD_HASH (see tools/admin-hash.mjs).
export function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(String(password), salt, 64);
  return `scrypt:${salt.toString('base64')}:${key.toString('base64')}`;
}

function checkPassword(password, stored) {
  const [alg, salt, key] = String(stored).split(':');
  if (alg !== 'scrypt' || !salt || !key) return false;
  const want = Buffer.from(key, 'base64');
  const got = scryptSync(String(password), Buffer.from(salt, 'base64'), want.length);
  return timingSafeEqual(want, got);
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

// CSV for Excel: UTF-8 BOM so Persian shows correctly, and cells that start
// with = + - @ are prefixed with ' so Excel never runs them as formulas.
function toCsv(rows) {
  const cell = v => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}

export function createAdmin({ send, readJson, withLock, loadList, saveList, clientIp }) {
  const HASH = process.env.ADMIN_PASSWORD_HASH || '';
  if (!HASH) console.log('[admin] ADMIN_PASSWORD_HASH not set — admin panel login is off');

  const sessions = new Map(); // token -> expiry time
  const fails = new Map();    // ip -> failed login times

  function session(req) {
    const token = readCookie(req, COOKIE);
    const exp = token && sessions.get(token);
    if (!exp) return null;
    if (exp < Date.now()) { sessions.delete(token); return null; }
    return token;
  }

  function cookie(req, value, maxAgeSec) {
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
    return `${COOKIE}=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${local ? '' : '; Secure'}`;
  }

  function tooManyFails(ip) {
    const now = Date.now(), win = 15 * 60 * 1000;
    const list = (fails.get(ip) || []).filter(t => now - t < win);
    fails.set(ip, list);
    return list.length >= 5;
  }

  async function login(req, res) {
    const ip = clientIp(req);
    if (!HASH) return send(req, res, 503, { ok: false, error: 'admin_disabled' });
    if (tooManyFails(ip)) return send(req, res, 429, { ok: false, error: 'rate_limited' }, undefined, { 'Retry-After': '900' });
    const body = await readJson(req, 2048);
    if (!checkPassword(body.password || '', HASH)) {
      fails.get(ip).push(Date.now());
      console.warn(`[admin] failed login from ${ip}`);
      return send(req, res, 401, { ok: false, error: 'wrong_password' });
    }
    fails.delete(ip);
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, Date.now() + SESSION_MS);
    console.log(`[admin] login from ${ip}`);
    return send(req, res, 200, { ok: true }, undefined, { 'Set-Cookie': cookie(req, token, SESSION_MS / 1000) });
  }

  function logout(req, res) {
    sessions.delete(readCookie(req, COOKIE));
    return send(req, res, 200, { ok: true }, undefined, { 'Set-Cookie': cookie(req, '', 0) });
  }

  async function list(req, res) {
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
  async function update(req, res) {
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

  async function csv(req, res) {
    const items = await withLock(loadList);
    const head = ['email', 'name', 'mobile', 'role', 'usecase', 'source', 'status', 'note', 'createdAt'];
    const rows = [head, ...items.map(x => head.map(k => k === 'status' ? (x.status || 'new') : x[k]))];
    const name = `claudeiran-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    return send(req, res, 200, toCsv(rows), 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="${name}"` });
  }

  return async function handleAdmin(req, res) {
    const route = `${req.method} ${new URL(req.url, 'http://x').pathname}`;
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(req, res, 403, { ok: false, error: 'forbidden_origin' });
      if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(req, res, 415, { ok: false, error: 'unsupported_media_type' });
    }
    try {
      if (route === 'POST /api/admin/login') return await login(req, res);
      if (!session(req)) return send(req, res, 401, { ok: false, error: 'unauthorized' });
      if (route === 'GET /api/admin/me') return send(req, res, 200, { ok: true });
      if (route === 'POST /api/admin/logout') return logout(req, res);
      if (route === 'GET /api/admin/signups') return await list(req, res);
      if (route === 'POST /api/admin/signups/update') return await update(req, res);
      if (route === 'GET /api/admin/signups.csv') return await csv(req, res);
      return send(req, res, 404, { ok: false, error: 'not_found' });
    } catch (e) {
      if (e.code === 413 || e instanceof SyntaxError || e.code === 400) return send(req, res, 400, { ok: false, error: 'bad_request' });
      throw e;
    }
  };
}