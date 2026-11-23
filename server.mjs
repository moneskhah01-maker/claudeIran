// Local server for the landing page: serves the production build (dist/)
// and stores early-access requests in data/waitlist.json.
import http from 'node:http';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'data', 'waitlist.json');
const PORT = Number(process.env.PORT || process.argv[2] || 5230);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.ttf', '.txt', '.xml', '.webmanifest']);
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' };

const ROLES = new Set(['developer', 'founder', 'product', 'it', 'finance', 'other']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const MOBILE = /^(?:\+98|0098|0)?9\d{9}$/;
const toLatin = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

function send(req, res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  let buf = Buffer.from(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', ...SEC, ...extra };
  if (buf.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /text|json|javascript|svg|ttf/.test(type)) {
    buf = gzipSync(buf); headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding';
  }
  res.writeHead(code, headers);
  res.end(req.method === 'HEAD' ? undefined : buf);
}

async function readJson(req, limit = 16 * 1024) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('too large'), { code: 413 }); chunks.push(c); }
  const v = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Object.assign(new Error('not an object'), { code: 400 });
  return v;
}

function validate(b) {
  const errors = {};
  const name = String(b.name ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  const mobile = toLatin(b.mobile).replace(/[\s-]/g, '');
  const role = String(b.role ?? '');
  const usecase = String(b.usecase ?? '').trim();
  if (name.length < 2 || name.length > 80) errors.name = 'name';
  if (!EMAIL.test(email)) errors.email = 'email';
  if (mobile && !MOBILE.test(mobile)) errors.mobile = 'mobile';
  if (!ROLES.has(role)) errors.role = 'role';
  if (usecase.length < 10 || usecase.length > 500) errors.usecase = 'usecase';
  if (b.consent !== true) errors.consent = 'consent';
  return { errors, entry: { name, email, mobile, role, usecase } };
}

// Writes are serialized and atomic (temp file + rename), so concurrent sign-ups cannot be lost or corrupt the file.
let queue = Promise.resolve();
const withLock = fn => (queue = queue.then(fn, fn));

// Simple per-IP rate limit: 8 submissions per 10 minutes.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > 8;
}

async function handleWaitlist(req, res) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(req, res, 415, { ok: false, error: 'unsupported_media_type' });
  const origin = req.headers.origin;
  let sameOrigin = true;
  if (origin) { try { sameOrigin = new URL(origin).host === req.headers.host; } catch { sameOrigin = false; } }
  if (!sameOrigin) return send(req, res, 403, { ok: false, error: 'forbidden_origin' });
  if (limited(req.socket.remoteAddress || 'local')) return send(req, res, 429, { ok: false, error: 'rate_limited' }, undefined, { 'Retry-After': '600' });
  let body;
  try { body = await readJson(req); } catch (e) { return send(req, res, e.code === 413 ? 413 : 400, { ok: false, error: 'bad_request' }); }
  if (body.website) return send(req, res, 201, { ok: true }); // honeypot: accept silently, store nothing
  const { errors, entry } = validate(body);
  if (Object.keys(errors).length) return send(req, res, 422, { ok: false, errors });
  const result = await withLock(async () => {
    await mkdir(path.dirname(DATA), { recursive: true });
    const list = existsSync(DATA) ? JSON.parse(await readFile(DATA, 'utf8') || '[]') : [];
    if (list.some(x => x.email === entry.email)) return { duplicate: true };
    const now = new Date().toISOString();
    list.push({ ...entry, consentAt: now, createdAt: now });
    const tmp = DATA + '.tmp';
    await writeFile(tmp, JSON.stringify(list, null, 2));
    await rename(tmp, DATA);
    return { duplicate: false };
  });
  return send(req, res, result.duplicate ? 200 : 201, { ok: true, duplicate: result.duplicate });
}

async function serveStatic(req, res) {
  if (!existsSync(DIST)) return send(req, res, 503, 'Build not found. Run: npm run build', 'text/plain; charset=utf-8');
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { return send(req, res, 400, 'Bad request', 'text/plain; charset=utf-8'); }
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel === '/favicon.ico') rel = '/favicon.svg';
  const file = path.normalize(path.join(DIST, rel));
  if (file !== DIST && !file.startsWith(DIST + path.sep)) return send(req, res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not file');
    const ext = path.extname(file).toLowerCase();
    const hashed = /[\\/]assets[\\/]/.test(file);
    const cache = hashed ? 'public, max-age=31536000, immutable' : (ext === '.woff2' || ext === '.ttf') ? 'public, max-age=86400' : 'no-cache';
    const type = TYPES[ext] || 'application/octet-stream';
    const data = await readFile(file);
    if (COMPRESSIBLE.has(ext)) return send(req, res, 200, data, type, { 'Cache-Control': cache });
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, ...SEC });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    send(req, res, 404, await readFile(path.join(DIST, 'index.html'), 'utf8'), 'text/html; charset=utf-8');
  }
}

http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/waitlist')) {
      if (req.method !== 'POST') return send(req, res, 405, { ok: false, error: 'method_not_allowed' });
      return await handleWaitlist(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
    return await serveStatic(req, res);
  } catch (e) {
    console.error(e);
    send(req, res, 500, { ok: false, error: 'server_error' });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Landing running at http://localhost:${PORT}`));
