// Wires the SaaS together and gives server.mjs one function: handle(req, res) -> true if it answered.
// All configuration comes from environment variables (see docs/saas/README.md); nothing secret is in code.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.mjs';
import { sameOrigin } from './security.mjs';
import { createSms } from './sms.mjs';
import { createAuth } from './auth.mjs';
import { createPayments } from './payments.mjs';
import { createUpstream } from './upstream.mjs';
import { createGateway } from './gateway.mjs';
import { createAppApi } from './app-api.mjs';
import { createAdmin } from './admin.mjs';

const PAGES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages');
const ASSET_TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
// Private pages: never indexed, never framed, scripts only from our own origin (no inline JS: XSS can't run injected code).
const PAGE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

// `sms`, `fetch` and `env` can be passed in by tests to replace the real SMS provider, network and settings.
export async function createSaas({ send, readJson, clientIp, withLock, loadList, saveList, env = process.env, fetch = globalThis.fetch, sms: smsOverride }) {
  // No default on purpose: without DATABASE_URL the SaaS stays off and the site runs exactly as before.
  // Development: DATABASE_URL=pglite:./data/pgdata (in .env). Production: postgres://... (in /etc/claudeiran.env).
  const url = env.DATABASE_URL || '';
  let db = null;
  if (url) {
    db = await openDb(url);
    console.log(`[saas] database: ${db.driver}`);
  } else {
    console.warn('[saas] DATABASE_URL not set: customer panel and API are off (admin waitlist still works)');
  }

  const audit = async (actor, action, target = null, detail = null, ip = null) => {
    if (db) await db.query('INSERT INTO audit_log (actor, action, target, detail, ip) VALUES ($1, $2, $3, $4, $5)', [actor, action, target, detail ? JSON.stringify(detail) : null, ip]);
  };
  const publicUrl = req => (env.PUBLIC_URL || `${/^(localhost|127\.0\.0\.1)/.test(req.headers.host || '') ? 'http' : 'https'}://${req.headers.host}`).replace(/\/$/, '');

  const payments = db ? createPayments({ db, audit, env, fetch }) : null;
  const admin = createAdmin({ db, payments, send, readJson, withLock, loadList, saveList, clientIp, audit, env });
  let routes = { ...admin.routes };
  let timers = [];
  if (db) {
    const sms = smsOverride || createSms(env, { fetch });
    const auth = createAuth({ db, sms, send, readJson, clientIp, audit });
    const gateway = createGateway({ db, upstream: createUpstream(env), send, readJson });
    const app = createAppApi({ db, auth, payments, send, readJson, audit, clientIp, publicUrl });
    routes = { ...routes, ...auth.routes, ...gateway.routes, ...app.routes };
    // housekeeping: expired sessions and old codes, and holds left by a crash
    const sweep = async () => {
      try {
        await gateway.releaseStaleHolds();
        await db.query(`DELETE FROM sessions WHERE expires_at < now()`);
        await db.query(`DELETE FROM otp_codes WHERE created_at < now() - interval '1 day'`);
      } catch (e) { console.error('[saas] sweep failed:', e.message); }
    };
    await sweep();
    timers.push(setInterval(sweep, 5 * 60_000).unref());
  }

  async function page(req, res, file) {
    return send(req, res, 200, await readFile(path.join(PAGES, file)), 'text/html; charset=utf-8', PAGE_HEADERS);
  }
  async function asset(req, res, name) {
    const ext = path.extname(name);
    if (!/^[a-z0-9-]+\.(js|css|svg)$/.test(name)) return false;
    try {
      return send(req, res, 200, await readFile(path.join(PAGES, 'assets', name)), ASSET_TYPES[ext], { 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex' }), true;
    } catch { return false; }
  }

  async function handle(req, res) {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname;
    if (p === '/admin' || p === '/app') return send(req, res, 301, '', 'text/plain; charset=utf-8', { Location: p + '/' + u.search }), true;
    if (p === '/admin/') return page(req, res, 'admin.html'), true;
    if (p === '/app/') return db ? (page(req, res, 'app.html'), true) : false;
    if (p.startsWith('/saas-assets/')) return asset(req, res, p.slice('/saas-assets/'.length));

    const fn = routes[`${req.method} ${p}`];
    if (!fn) {
      if (p.startsWith('/api/admin/') || p.startsWith('/api/app/') || p.startsWith('/api/auth/')) return send(req, res, 404, { ok: false, error: 'not_found' }), true;
      if (p.startsWith('/v1/')) return send(req, res, 404, { type: 'error', error: { type: 'not_found_error', message: 'unknown endpoint' } }), true;
      return false;
    }
    // Cookie-authenticated POSTs: same origin and JSON only (CSRF defence). /v1/ uses API keys, not cookies.
    if (req.method === 'POST' && p.startsWith('/api/')) {
      if (!sameOrigin(req)) return send(req, res, 403, { ok: false, error: 'forbidden_origin' }), true;
      if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(req, res, 415, { ok: false, error: 'unsupported_media_type' }), true;
    }
    try {
      await fn(req, res);
    } catch (e) {
      if (e.code === 413 || e instanceof SyntaxError || e.code === 400) send(req, res, 400, { ok: false, error: 'bad_request' });
      else throw e;
    }
    return true;
  }

  return { handle, db, close: async () => { timers.forEach(clearInterval); await db?.close(); } };
}
