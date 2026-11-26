// Starts the SaaS on a random local port with an in-memory database, fake SMS and fake network.
import http from 'node:http';
import { createSaas } from '../index.mjs';
import { hashPassword } from '../security.mjs';

export const ADMIN_PASSWORD = 'test-admin-password-123';

// minimal copies of server.mjs helpers (same contract)
function send(req, res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  const buf = Buffer.from(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  res.writeHead(code, { 'Content-Type': type, ...extra });
  res.end(buf);
}
async function readJson(req, limit = 16 * 1024) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('too large'), { code: 413 }); chunks.push(c); }
  const v = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Object.assign(new Error('not an object'), { code: 400 });
  return v;
}

export async function startTestServer({ env = {}, fetch } = {}) {
  const sent = []; // SMS codes "sent" during the test
  let waitlist = [];
  const saas = await createSaas({
    send, readJson,
    clientIp: req => req.headers['x-test-ip'] || '127.0.0.1',
    withLock: fn => fn(), loadList: async () => waitlist, saveList: async l => { waitlist = l; },
    env: { DATABASE_URL: 'pglite:memory', MOCK_LATENCY: '0', ADMIN_PASSWORD_HASH: hashPassword(ADMIN_PASSWORD), MANUAL_PAY_INFO: 'card 6037-xxxx', ...env },
    fetch,
    sms: { name: 'test', sendOtp: async (mobile, code) => { sent.push({ mobile, code }); } },
  });
  const server = http.createServer(async (req, res) => {
    try { if (!(await saas.handle(req, res))) send(req, res, 404, 'nope', 'text/plain'); }
    catch (e) { console.error(e); send(req, res, 500, { ok: false, error: 'server_error' }); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  // a tiny browser: keeps cookies per client
  let ipCounter = 0;
  function client() {
    const jar = new Map();
    const ip = `10.0.0.${++ipCounter}`; // each test client looks like a different visitor, so per-IP limits don't collide
    async function call(method, path, body, headers = {}) {
      const h = { 'x-test-ip': ip, ...headers };
      if (body !== undefined) h['Content-Type'] = 'application/json';
      if (jar.size) h.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      const r = await fetch_(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
      for (const c of r.headers.getSetCookie()) {
        const [kv] = c.split(';'); const [k, v] = kv.split('=');
        if (/Max-Age=0/.test(c)) jar.delete(k); else jar.set(k, v);
      }
      const text = await r.text();
      let json; try { json = JSON.parse(text); } catch { json = text; }
      return { status: r.status, headers: r.headers, json };
    }
    return { get: (p, h) => call('GET', p, undefined, h), post: (p, b = {}, h) => call('POST', p, b, h), jar };
  }
  const fetch_ = globalThis.fetch;

  return { base, saas, db: saas.db, sent, client, close: async () => { server.close(); await saas.close(); } };
}
