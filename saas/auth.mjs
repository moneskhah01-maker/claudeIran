// Customer sign-up and login: email + password, or mobile + SMS code.
// Sessions: a random token in an HttpOnly cookie; only its SHA-256 hash is in the database,
// so someone who reads the sessions table still cannot log in as anyone.
import {
  hashPassword, checkPassword, DUMMY_HASH, sha256, randomToken, otpCode, readCookie, cookie,
  rateLimiter, EMAIL, normEmail, normMobile, latinDigits,
} from './security.mjs';
import { timingSafeEqual } from 'node:crypto';

const COOKIE = 'ci_session';
const SESSION_DAYS = 30;
const OTP_TTL_MIN = 3, OTP_MAX_ATTEMPTS = 5;

const cleanName = v => String(v ?? '').trim().replace(/\s+/g, ' ');
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, mobile: u.mobile, hasPassword: !!u.password_hash, createdAt: u.created_at });

export function createAuth({ db, sms, send, readJson, clientIp, audit }) {
  const ipLogin = rateLimiter({ max: 10, windowMs: 15 * 60_000 });   // failed logins per IP
  const emailLogin = rateLimiter({ max: 8, windowMs: 60 * 60_000 }); // failed logins per account (stops slow distributed guessing)
  const ipSignup = rateLimiter({ max: 5, windowMs: 60 * 60_000 });
  const ipOtp = rateLimiter({ max: 10, windowMs: 60 * 60_000 });

  // A user and their account are created together, in one transaction: never one without the other.
  async function createUser({ name, email = null, mobile = null, passwordHash = null, mobileVerified = false }) {
    return db.tx(async t => {
      const [u] = await t.query(
        `INSERT INTO users (name, email, mobile, password_hash, mobile_verified_at)
         VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN now() END) RETURNING *`,
        [name, email, mobile, passwordHash, mobileVerified]);
      await t.query('INSERT INTO accounts (owner_id) VALUES ($1)', [u.id]);
      return u;
    });
  }

  async function startSession(req, userId) {
    const token = randomToken();
    await db.query(
      `INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent)
       VALUES ($1, $2, now() + make_interval(days => $3), $4, $5)`,
      [sha256(token), userId, SESSION_DAYS, clientIp(req), String(req.headers['user-agent'] || '').slice(0, 300)]);
    return cookie(req, COOKIE, token, { maxAge: SESSION_DAYS * 86400 });
  }

  // Returns { user, account } for a logged-in, active customer, or null.
  async function currentUser(req) {
    const token = readCookie(req, COOKIE);
    if (!token) return null;
    const [row] = await db.query(
      `SELECT u.*, a.id AS account_id, a.balance, a.held
         FROM sessions s JOIN users u ON u.id = s.user_id JOIN accounts a ON a.owner_id = u.id
        WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active'`, [sha256(token)]);
    if (!row) return null;
    return { user: row, account: { id: row.account_id, balance: row.balance, held: row.held } };
  }

  // --- email + password ---
  async function signup(req, res) {
    const ip = clientIp(req);
    if (ipSignup.over(ip)) return send(req, res, 429, { ok: false, error: 'rate_limited' });
    const b = await readJson(req, 4096);
    const name = cleanName(b.name), email = normEmail(b.email), password = String(b.password ?? '');
    const errors = {};
    if (name.length < 2 || name.length > 80) errors.name = 'name';
    if (!EMAIL.test(email) || email.length > 254) errors.email = 'email';
    if (password.length < 10 || password.length > 200) errors.password = 'password';
    if (b.terms !== true) errors.terms = 'terms';
    if (Object.keys(errors).length) return send(req, res, 422, { ok: false, errors });
    let u;
    try {
      u = await createUser({ name, email, passwordHash: hashPassword(password) });
    } catch (e) {
      if (e.code === '23505') return send(req, res, 409, { ok: false, error: 'email_taken' }); // unique_violation
      throw e;
    }
    await audit(`user:${u.id}`, 'signup', `user:${u.id}`, { method: 'email' }, ip);
    return send(req, res, 201, { ok: true, user: publicUser(u) }, undefined, { 'Set-Cookie': await startSession(req, u.id) });
  }

  async function login(req, res) {
    const ip = clientIp(req);
    const b = await readJson(req, 4096);
    const email = normEmail(b.email), password = String(b.password ?? '');
    if (ipLogin.over(ip, false) || emailLogin.over(email, false)) {
      return send(req, res, 429, { ok: false, error: 'rate_limited' }, undefined, { 'Retry-After': '900' });
    }
    const [u] = EMAIL.test(email) ? await db.query('SELECT * FROM users WHERE email = $1', [email]) : [];
    // Always run scrypt, even for unknown emails, and give one error for both cases.
    const ok = checkPassword(password, u?.password_hash || DUMMY_HASH) && !!u?.password_hash;
    if (!ok) {
      ipLogin.over(ip); emailLogin.over(email);
      return send(req, res, 401, { ok: false, error: 'bad_credentials' });
    }
    if (u.status !== 'active') return send(req, res, 403, { ok: false, error: 'suspended' });
    ipLogin.reset(ip); emailLogin.reset(email);
    await audit(`user:${u.id}`, 'login', `user:${u.id}`, { method: 'password' }, ip);
    return send(req, res, 200, { ok: true, user: publicUser(u) }, undefined, { 'Set-Cookie': await startSession(req, u.id) });
  }

  // --- mobile + SMS code ---
  async function otpRequest(req, res) {
    const ip = clientIp(req);
    const b = await readJson(req, 1024);
    const mobile = normMobile(b.mobile);
    if (!mobile) return send(req, res, 422, { ok: false, errors: { mobile: 'mobile' } });
    if (ipOtp.over(ip)) return send(req, res, 429, { ok: false, error: 'rate_limited' });
    // Per number: one code a minute, five an hour (stops someone flooding a stranger's phone, and SMS costs money).
    const [c] = await db.query(
      `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 minute') AS last_min,
              count(*) AS last_hour
         FROM otp_codes WHERE mobile = $1 AND created_at > now() - interval '1 hour'`, [mobile]);
    if (c.last_min > 0 || c.last_hour >= 5) return send(req, res, 429, { ok: false, error: 'otp_wait' }, undefined, { 'Retry-After': '60' });
    const code = otpCode();
    await db.query(
      `INSERT INTO otp_codes (mobile, code_hash, expires_at, ip) VALUES ($1, $2, now() + make_interval(mins => $3), $4)`,
      [mobile, sha256(`${mobile}:${code}`), OTP_TTL_MIN, ip]);
    try {
      await sms.sendOtp(mobile, code);
    } catch (e) {
      console.error('[sms] send failed:', e.message);
      return send(req, res, 502, { ok: false, error: 'sms_failed' });
    }
    // Same answer whether or not this number has an account, so the form cannot be used to look up customers.
    return send(req, res, 200, { ok: true, ttl: OTP_TTL_MIN * 60 });
  }

  async function otpVerify(req, res) {
    const ip = clientIp(req);
    const b = await readJson(req, 1024);
    const mobile = normMobile(b.mobile), code = latinDigits(b.code).replace(/\D/g, '');
    if (!mobile || code.length !== 6) return send(req, res, 422, { ok: false, error: 'bad_code' });
    const [otp] = await db.query(
      `UPDATE otp_codes SET attempts = attempts + 1
        WHERE id = (SELECT id FROM otp_codes WHERE mobile = $1 AND used_at IS NULL AND expires_at > now()
                     ORDER BY created_at DESC LIMIT 1)
          AND attempts < $2
        RETURNING *`, [mobile, OTP_MAX_ATTEMPTS]);
    const match = otp && timingSafeEqual(Buffer.from(otp.code_hash), Buffer.from(sha256(`${mobile}:${code}`)));
    if (!match) return send(req, res, 401, { ok: false, error: 'bad_code' });

    let [u] = await db.query('SELECT * FROM users WHERE mobile = $1', [mobile]);
    if (!u) {
      // New number: the client asks for a name and sends the same code again (it is not used up yet).
      const name = cleanName(b.name);
      if (!name) return send(req, res, 200, { ok: true, needName: true });
      if (name.length < 2 || name.length > 80) return send(req, res, 422, { ok: false, errors: { name: 'name' } });
      if (b.terms !== true) return send(req, res, 422, { ok: false, errors: { terms: 'terms' } });
      try {
        u = await createUser({ name, mobile, mobileVerified: true });
      } catch (e) {
        if (e.code !== '23505') throw e;
        [u] = await db.query('SELECT * FROM users WHERE mobile = $1', [mobile]); // signed up a moment ago in another tab
      }
      await audit(`user:${u.id}`, 'signup', `user:${u.id}`, { method: 'sms' }, ip);
    }
    await db.query('UPDATE otp_codes SET used_at = now() WHERE id = $1', [otp.id]);
    if (u.status !== 'active') return send(req, res, 403, { ok: false, error: 'suspended' });
    if (!u.mobile_verified_at) await db.query('UPDATE users SET mobile_verified_at = now() WHERE id = $1', [u.id]);
    await audit(`user:${u.id}`, 'login', `user:${u.id}`, { method: 'sms' }, ip);
    return send(req, res, 200, { ok: true, user: publicUser(u) }, undefined, { 'Set-Cookie': await startSession(req, u.id) });
  }

  async function logout(req, res) {
    const token = readCookie(req, COOKIE);
    if (token) await db.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
    return send(req, res, 200, { ok: true }, undefined, { 'Set-Cookie': cookie(req, COOKIE, '', { maxAge: 0 }) });
  }

  async function me(req, res) {
    const s = await currentUser(req);
    if (!s) return send(req, res, 401, { ok: false, error: 'unauthorized' });
    return send(req, res, 200, { ok: true, user: publicUser(s.user) });
  }

  return {
    currentUser,
    routes: {
      'POST /api/auth/signup': signup,
      'POST /api/auth/login': login,
      'POST /api/auth/otp/request': otpRequest,
      'POST /api/auth/otp/verify': otpVerify,
      'POST /api/auth/logout': logout,
      'GET /api/auth/me': me,
    },
  };
}
