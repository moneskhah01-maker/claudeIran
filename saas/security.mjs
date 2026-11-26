// Security helpers shared by the admin panel, the user panel and the API gateway.
import { scryptSync, randomBytes, randomInt, timingSafeEqual, createHash } from 'node:crypto';

// --- passwords: scrypt (slow on purpose, salted), so a leaked database does not reveal passwords ---
export function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(String(password), salt, 64);
  return `scrypt:${salt.toString('base64')}:${key.toString('base64')}`;
}
export function checkPassword(password, stored) {
  const [alg, salt, key] = String(stored || '').split(':');
  if (alg !== 'scrypt' || !salt || !key) return false;
  const want = Buffer.from(key, 'base64');
  const got = scryptSync(String(password), Buffer.from(salt, 'base64'), want.length);
  return timingSafeEqual(want, got);
}
// Checked against when the user does not exist, so "no such user" takes as long as "wrong password"
// and response time does not reveal which emails are registered.
export const DUMMY_HASH = hashPassword('not-a-real-password');

// --- random tokens (sessions, API keys) are long and random, so a fast SHA-256 hash is enough to store them ---
export const sha256 = s => createHash('sha256').update(String(s)).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const otpCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

// --- cookies ---
export function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}
const isLocal = req => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
export function cookie(req, name, value, { maxAge, path = '/', sameSite = 'Lax' }) {
  return `${name}=${value}; Path=${path}; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${isLocal(req) ? '' : '; Secure'}`;
}

// --- CSRF: browsers always send Origin on cross-site POSTs; we accept only our own host.
// Together with "JSON bodies only" (a plain HTML form cannot send application/json) this blocks
// other sites from making a logged-in user's browser call our API.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

// --- sliding-window rate limiter kept in memory (one server process) ---
export function rateLimiter({ max, windowMs }) {
  const hits = new Map();
  return {
    // true when this key has used up its allowance; counts the attempt when count=true
    over(key, count = true) {
      const now = Date.now();
      const list = (hits.get(key) || []).filter(t => now - t < windowMs);
      if (count) list.push(now);
      hits.set(key, list);
      if (hits.size > 10000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k);
      return list.length > max;
    },
    reset(key) { hits.delete(key); },
  };
}

// --- input normalisation (same rules as the waitlist form) ---
export const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const toLatin = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
export function normMobile(v) {
  const m = toLatin(v).replace(/[\s\-().]/g, '').match(/^(?:\+98|0098|0)?(9\d{9})$/);
  return m ? '+98' + m[1] : null; // SMS login is for Iranian mobiles only
}
export const normEmail = v => String(v ?? '').trim().toLowerCase();
export const latinDigits = toLatin;
