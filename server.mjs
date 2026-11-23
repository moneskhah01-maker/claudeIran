// Server for claudeiran.com: serves the production build (dist/) and stores
// early-access requests in data/waitlist.json (the primary record).
// Every new or changed request is then mirrored to a Google Sheet in the owner's
// Drive through a Google Apps Script web app (tools/google-sheet/Code.gs).
// The mirror is optional and retried: if Google is unreachable nothing is lost,
// unsynced rows are sent again on the next attempt.
import http from 'node:http';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = path.join(ROOT, 'data');
const DATA = path.join(DATA_DIR, 'waitlist.json');
const SYNC_STATE = path.join(DATA_DIR, 'sheet-sync.json');
const PORT = Number(process.env.PORT || process.argv[2] || 5230);

// Optional local env file (production: /etc/claudeiran.env through systemd EnvironmentFile).
for (const f of [path.join(ROOT, '.env')]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const SHEET_URL = process.env.SHEETS_WEBHOOK_URL || '';
const SHEET_SECRET = process.env.SHEETS_WEBHOOK_SECRET || '';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.ttf', '.txt', '.xml', '.webmanifest']);
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' };

const ROLES = new Set(['developer', 'founder', 'product', 'it', 'finance', 'other']);
const SOURCES = new Set(['section', 'header', 'blog']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const IR_MOBILE = /^(?:\+98|0098|0)?(9\d{9})$/;
const INTL = /^(?:\+|00)((?!98)[1-9]\d{7,14})$/;
const toLatin = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
// Phones are stored in E.164 (+989121234567), ready for an SMS gateway.
function normPhone(v) {
  const t = toLatin(v).replace(/[\s\-().]/g, '');
  let m = t.match(IR_MOBILE); if (m) return '+98' + m[1];
  m = t.match(INTL); if (m) return '+' + m[1];
  return null;
}

function send(req, res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  let buf = Buffer.from(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', ...SEC, ...extra };
  if (buf.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /text|json|javascript|svg|ttf|xml/.test(type)) {
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

// The full form (source "section") also asks for role and use case; the short
// header/blog dialog asks for name, email and mobile only.
function validate(b) {
  const errors = {};
  const source = SOURCES.has(b.source) ? b.source : 'section';
  const full = source === 'section';
  const name = String(b.name ?? '').trim().replace(/\s+/g, ' ');
  const email = String(b.email ?? '').trim().toLowerCase();
  const mobileRaw = String(b.mobile ?? '').trim();
  const mobile = mobileRaw ? normPhone(mobileRaw) : '';
  const role = String(b.role ?? '');
  const usecase = String(b.usecase ?? '').trim();
  const page = String(b.page ?? '').slice(0, 160).replace(/[^\w\-/.%]/g, '');
  if (name.length < 2 || name.length > 80) errors.name = 'name';
  if (!EMAIL.test(email) || email.length > 254) errors.email = 'email';
  if (!mobile) errors.mobile = 'mobile';
  if (full && !ROLES.has(role)) errors.role = 'role';
  if (!full && role && !ROLES.has(role)) errors.role = 'role';
  if (full && (usecase.length < 10 || usecase.length > 500)) errors.usecase = 'usecase';
  if (!full && usecase.length > 500) errors.usecase = 'usecase';
  if (b.consent !== true) errors.consent = 'consent';
  return { errors, entry: { name, email, mobile, role, usecase, source, page } };
}

// Writes are serialized and atomic (temp file + rename), so concurrent sign-ups cannot be lost or corrupt the file.
let queue = Promise.resolve();
const withLock = fn => (queue = queue.then(fn, fn));
async function loadList() { return existsSync(DATA) ? JSON.parse(await readFile(DATA, 'utf8') || '[]') : []; }
async function saveJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  await writeFile(tmp, JSON.stringify(value, null, 2));
  await rename(tmp, file);
}

// Per-client rate limit: 8 submissions per 10 minutes. Behind Nginx the socket is
// loopback, so the client address comes from X-Real-IP / X-Forwarded-For.
const hits = new Map();
function clientIp(req) {
  const remote = req.socket.remoteAddress || '';
  if (/^(::ffff:)?127\.|^::1$/.test(remote)) {
    const fwd = req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0];
    if (fwd && fwd.trim()) return fwd.trim();
  }
  return remote || 'local';
}
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < win)) hits.delete(k);
  return list.length > 8;
}

async function handleWaitlist(req, res) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(req, res, 415, { ok: false, error: 'unsupported_media_type' });
  const origin = req.headers.origin;
  let sameOrigin = true;
  if (origin) { try { sameOrigin = new URL(origin).host === req.headers.host; } catch { sameOrigin = false; } }
  if (!sameOrigin) return send(req, res, 403, { ok: false, error: 'forbidden_origin' });
  if (limited(clientIp(req))) return send(req, res, 429, { ok: false, error: 'rate_limited' }, undefined, { 'Retry-After': '600' });
  let body;
  try { body = await readJson(req); } catch (e) { return send(req, res, e.code === 413 ? 413 : 400, { ok: false, error: 'bad_request' }); }
  if (body.website) return send(req, res, 201, { ok: true, mobile: '' }); // honeypot: accept silently, store nothing
  const { errors, entry } = validate(body);
  if (Object.keys(errors).length) return send(req, res, 422, { ok: false, errors });
  const result = await withLock(async () => {
    const list = await loadList();
    const now = new Date().toISOString();
    const old = list.find(x => x.email === entry.email);
    if (old) {
      // Same email again: keep what was there, fill in only what was missing.
      let changed = false;
      for (const k of ['name', 'mobile', 'role', 'usecase']) if (!old[k] && entry[k]) { old[k] = entry[k]; changed = true; }
      if (!String(old.source || '').split('+').includes(entry.source)) { old.source = old.source ? `${old.source}+${entry.source}` : entry.source; changed = true; }
      if (changed) { old.updatedAt = now; await saveJson(DATA, list); }
      return { duplicate: true, mobile: old.mobile || entry.mobile };
    }
    list.push({ ...entry, consentAt: now, createdAt: now, updatedAt: now });
    await saveJson(DATA, list);
    return { duplicate: false, mobile: entry.mobile };
  });
  scheduleSync(800);
  return send(req, res, result.duplicate ? 200 : 201, { ok: true, duplicate: result.duplicate, mobile: result.mobile });
}

/* ---------- Google Sheet mirror ---------- */
const ROLE_FA = { developer: 'توسعه‌دهنده یا فریلنسر', founder: 'مدیر فنی یا سرپرست تیم', product: 'مدیر محصول', it: 'مدیر فناوری اطلاعات', finance: 'مدیر مالی یا حسابداری', other: 'سایر' };
let syncTimer = null, syncing = false, failures = 0;
function scheduleSync(ms) {
  if (!SHEET_URL || !SHEET_SECRET) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncSheet, ms);
}
async function writeSyncState(state) { try { await saveJson(SYNC_STATE, state); } catch {} }
async function syncSheet() {
  if (syncing) return scheduleSync(2000);
  syncing = true;
  let pending = [];
  try {
    const list = await withLock(loadList);
    pending = list.filter(x => !x.syncedAt || x.syncedAt < x.updatedAt || (!x.updatedAt && !x.syncedAt));
    if (!pending.length) { failures = 0; return; }
    const batch = pending.slice(0, 200);
    const rows = batch.map(x => ({
      email: x.email, name: x.name, mobile: x.mobile || '', role: ROLE_FA[x.role] || '', usecase: x.usecase || '',
      source: x.source || '', page: x.page || '', createdAt: x.createdAt, updatedAt: x.updatedAt || x.createdAt, consentAt: x.consentAt || '',
    }));
    const r = await fetch(SHEET_URL, {
      method: 'POST', redirect: 'follow', signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script reads e.postData.contents
      body: JSON.stringify({ secret: SHEET_SECRET, rows }),
    });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    if (!r.ok || !json || json.ok !== true) throw new Error(`sheet ${r.status}: ${(json && json.error) || text.slice(0, 120)}`);
    const stamp = new Date().toISOString();
    const done = new Map(batch.map(x => [x.email, x.updatedAt || x.createdAt]));
    await withLock(async () => {
      const cur = await loadList();
      for (const x of cur) if (done.has(x.email) && (x.updatedAt || x.createdAt) === done.get(x.email)) x.syncedAt = stamp;
      await saveJson(DATA, cur);
    });
    failures = 0;
    await writeSyncState({ lastOk: stamp, lastError: null, sent: batch.length, pending: pending.length - batch.length });
    console.log(`[sheet] synced ${batch.length} row(s)`);
    if (pending.length > batch.length) scheduleSync(1500);
  } catch (e) {
    failures++;
    const wait = Math.min(30 * 60e3, 15e3 * 2 ** Math.min(failures, 7));
    console.error(`[sheet] sync failed (${failures}), retry in ${Math.round(wait / 1000)}s:`, e.message);
    await writeSyncState({ lastOk: null, lastError: `${new Date().toISOString()} ${e.message}`, pending: pending.length, failures });
    scheduleSync(wait);
  } finally {
    syncing = false;
  }
}
if (SHEET_URL && SHEET_SECRET) {
  scheduleSync(3000); // backfill anything not yet mirrored
  setInterval(() => scheduleSync(0), 10 * 60e3).unref();
} else {
  console.log('[sheet] SHEETS_WEBHOOK_URL / SHEETS_WEBHOOK_SECRET not set — Google Sheet mirror is off');
}

/* ---------- static files ---------- */
async function notFound(req, res) {
  const page = path.join(DIST, '404.html');
  const html = existsSync(page) ? await readFile(page, 'utf8') : 'Not found';
  return send(req, res, 404, html, 'text/html; charset=utf-8');
}
async function serveStatic(req, res) {
  if (!existsSync(DIST)) return send(req, res, 503, 'Build not found. Run: npm run build', 'text/plain; charset=utf-8');
  let url, rel;
  try { url = new URL(req.url, 'http://localhost'); rel = decodeURIComponent(url.pathname); }
  catch { return send(req, res, 400, 'Bad request', 'text/plain; charset=utf-8'); }
  if (rel === '/favicon.ico') rel = '/favicon.svg';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(DIST, rel));
  if (file !== DIST && !file.startsWith(DIST + path.sep)) return send(req, res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  let s = null;
  try { s = await stat(file); } catch {}
  if (s && s.isDirectory()) {
    // /blog/post → /blog/post/ (one canonical URL per page)
    if (existsSync(path.join(file, 'index.html'))) return send(req, res, 301, '', 'text/plain; charset=utf-8', { Location: url.pathname + '/' + url.search, 'Cache-Control': 'public, max-age=3600' });
    return notFound(req, res);
  }
  if (!s || !s.isFile() || path.basename(file) === '404.html' && rel !== '/404.html') return notFound(req, res);
  const ext = path.extname(file).toLowerCase();
  const hashed = /[\\/]assets[\\/]/.test(file);
  const cache = hashed ? 'public, max-age=31536000, immutable' : (ext === '.woff2' || ext === '.ttf' || ext === '.webp') ? 'public, max-age=86400' : 'no-cache';
  const type = TYPES[ext] || 'application/octet-stream';
  const data = await readFile(file);
  if (COMPRESSIBLE.has(ext)) return send(req, res, 200, data, type, { 'Cache-Control': cache });
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, ...SEC });
  res.end(req.method === 'HEAD' ? undefined : data);
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
