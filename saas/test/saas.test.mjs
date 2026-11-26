// Run: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, ADMIN_PASSWORD } from './helpers.mjs';
import { reconcile } from '../ledger.mjs';

// Fake Zarinpal: request -> authority, verify -> code 100 the first time, 101 afterwards.
const zp = { verified: new Set(), calls: [] };
async function fakeFetch(url, opts) {
  const body = JSON.parse(opts.body);
  zp.calls.push({ url, body });
  if (url.endsWith('/payment/request.json')) return Response.json({ data: { code: 100, authority: 'A' + body.amount + '_' + zp.calls.length }, errors: [] });
  if (url.endsWith('/payment/verify.json')) {
    const again = zp.verified.has(body.authority); zp.verified.add(body.authority);
    return Response.json({ data: { code: again ? 101 : 100, ref_id: 987654, card_pan: '6037**1234' }, errors: [] });
  }
  throw new Error('unexpected url ' + url);
}

let t;
before(async () => { t = await startTestServer({ env: { ZARINPAL_MERCHANT_ID: '00000000-0000-0000-0000-000000000000', ZARINPAL_SANDBOX: '1' }, fetch: fakeFetch }); });
after(async () => { await t.close(); });

async function newUser(email = `u${Math.random().toString(36).slice(2)}@example.com`) {
  const c = t.client();
  const r = await c.post('/api/auth/signup', { name: 'کاربر آزمایشی', email, password: 'a-good-password', terms: true });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { c, email, id: r.json.user.id };
}
async function admin() {
  const a = t.client();
  assert.equal((await a.post('/api/admin/login', { password: ADMIN_PASSWORD })).status, 200);
  return a;
}
async function accountOf(userId) {
  return (await t.db.query('SELECT a.* FROM accounts a WHERE owner_id = $1', [userId]))[0];
}
async function credit(userId, amount) {
  const a = await admin();
  const acc = await accountOf(userId);
  const r = await a.post('/api/admin/adjust', { accountId: acc.id, amount, note: 'test credit' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
}
const ask = (key, body = {}) => fetch(t.base + '/v1/messages', {
  method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 100, messages: [{ role: 'user', content: 'سلام' }], ...body }),
});

test('email signup, duplicate email, login, logout', async () => {
  const { c, email } = await newUser();
  assert.equal((await c.get('/api/auth/me')).status, 200);
  const dup = await t.client().post('/api/auth/signup', { name: 'x y', email: email.toUpperCase(), password: 'a-good-password', terms: true });
  assert.equal(dup.status, 409);
  const other = t.client();
  assert.equal((await other.post('/api/auth/login', { email, password: 'wrong-password' })).status, 401);
  assert.equal((await other.post('/api/auth/login', { email: 'nobody@example.com', password: 'whatever-123' })).status, 401);
  assert.equal((await other.post('/api/auth/login', { email, password: 'a-good-password' })).status, 200);
  await other.post('/api/auth/logout');
  assert.equal((await other.get('/api/auth/me')).status, 401);
});

test('weak input is rejected', async () => {
  const r = await t.client().post('/api/auth/signup', { name: 'a', email: 'bad', password: 'short', terms: false });
  assert.equal(r.status, 422);
  assert.deepEqual(Object.keys(r.json.errors).sort(), ['email', 'name', 'password', 'terms']);
});

test('SMS code: new number signs up with a name, wrong codes run out', async () => {
  const c = t.client();
  assert.equal((await c.post('/api/auth/otp/request', { mobile: '۰۹۱۲۱۲۳۴۵۶۷' })).status, 200); // Persian digits accepted
  const { mobile, code } = t.sent.at(-1);
  assert.equal(mobile, '+989121234567');
  assert.equal((await c.post('/api/auth/otp/request', { mobile: '09121234567' })).status, 429, 'second code within a minute');
  assert.equal((await c.post('/api/auth/otp/verify', { mobile, code: '000000' === code ? '111111' : '000000' })).status, 401);
  const need = await c.post('/api/auth/otp/verify', { mobile, code });
  assert.equal(need.json.needName, true);
  const ok = await c.post('/api/auth/otp/verify', { mobile, code, name: 'علی', terms: true });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal((await c.get('/api/auth/me')).json.user.mobile, mobile);
  assert.equal((await t.client().post('/api/auth/otp/verify', { mobile, code })).status, 401, 'a used code cannot log in again');
});

test('SMS code locks after 5 wrong attempts', async () => {
  const c = t.client();
  await c.post('/api/auth/otp/request', { mobile: '09351112222' });
  const { mobile, code } = t.sent.at(-1);
  const wrong = String((Number(code) + 1) % 1e6).padStart(6, '0');
  for (let i = 0; i < 5; i++) await c.post('/api/auth/otp/verify', { mobile, code: wrong });
  assert.equal((await c.post('/api/auth/otp/verify', { mobile, code, name: 'x y', terms: true })).status, 401, 'right code after 5 misses is refused');
});

test('API key: no credit -> 402; with credit -> charged, nothing left held, ledger balances', async () => {
  const { c, id } = await newUser();
  const k = await c.post('/api/app/keys', { name: 'سرور اصلی' });
  assert.equal(k.status, 201);
  assert.match(k.json.secret, /^ci_/);
  assert.equal((await c.get('/api/app/keys')).json.keys[0].prefix, k.json.secret.slice(0, 10));
  assert.ok(!JSON.stringify((await c.get('/api/app/keys')).json).includes(k.json.secret), 'secret is never shown again');

  assert.equal((await ask(k.json.secret)).status, 402);
  await credit(id, 5_000_000);
  const r = await ask(k.json.secret);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.type, 'message');
  const charged = Number(r.headers.get('x-ci-cost-rial'));
  assert.ok(charged > 0);
  const acc = await accountOf(id);
  assert.equal(acc.balance, 5_000_000 - charged);
  assert.equal(acc.held, 0);
  assert.deepEqual(await reconcile(t.db), []);
  const ov = await c.get('/api/app/overview');
  assert.equal(ov.json.days.length, 30);
  assert.equal(ov.json.recent[0].cost, charged);
});

test('gateway validation and bad keys', async () => {
  assert.equal((await ask('ci_not-a-key')).status, 401);
  const { c, id } = await newUser();
  await credit(id, 5_000_000);
  const { json: { secret } } = await c.post('/api/app/keys', {});
  assert.equal((await ask(secret, { model: 'gpt-4' })).status, 400);
  assert.equal((await ask(secret, { max_tokens: 0 })).status, 400);
  assert.equal((await ask(secret, { messages: [] })).status, 400);
  assert.equal((await ask(secret, { stream: true })).status, 400);
  const keys = (await c.get('/api/app/keys')).json.keys;
  await c.post('/api/app/keys/revoke', { id: keys[0].id });
  assert.equal((await ask(secret)).status, 401, 'revoked key stops working');
});

test('parallel requests can never spend more than the balance', async () => {
  const { c, id } = await newUser();
  const { json: { secret } } = await c.post('/api/app/keys', {});
  // haiku: max cost of one request ~ (input est * 1M + 100 * 5M) / 1e6 -> about 600 Rial; give room for ~3
  await credit(id, 2_000);
  const results = await Promise.all(Array.from({ length: 20 }, () => ask(secret)));
  const codes = results.map(r => r.status);
  assert.ok(codes.includes(200) && codes.includes(402), `expected a mix, got ${codes}`);
  const acc = await accountOf(id);
  assert.ok(acc.balance >= 0);
  assert.equal(acc.held, 0);
  assert.deepEqual(await reconcile(t.db), []);
});

test('customers cannot touch each other\'s keys (IDOR)', async () => {
  const a = await newUser(), b = await newUser();
  const k = await a.c.post('/api/app/keys', { name: 'A' });
  const r = await b.c.post('/api/app/keys/revoke', { id: k.json.key.id });
  assert.equal(r.status, 404);
  assert.equal((await a.c.get('/api/app/keys')).json.keys[0].revoked_at, null);
});

test('CSRF: cross-site and non-JSON POSTs are refused', async () => {
  const { c } = await newUser();
  assert.equal((await c.post('/api/app/keys', {}, { Origin: 'https://evil.example' })).status, 403);
  const r = await fetch(t.base + '/api/app/keys', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: [...c.jar].map(([k, v]) => `${k}=${v}`).join('; ') }, body: 'name=x' });
  assert.equal(r.status, 415);
});

test('manual top-up: admin approves once, second approval is refused', async () => {
  const { c, id } = await newUser();
  assert.equal((await c.post('/api/app/topup', { method: 'manual', amount: 100, receipt: '123456' })).status, 422, 'below minimum');
  const r = await c.post('/api/app/topup', { method: 'manual', amount: 2_000_000, receipt: 'پیگیری 123456' });
  assert.equal(r.status, 201);
  const a = await admin();
  const pending = (await a.get('/api/admin/payments?status=pending')).json.rows;
  assert.ok(pending.some(p => p.id === r.json.payment.id));
  assert.equal((await a.post('/api/admin/payments/review', { id: r.json.payment.id, decision: 'approve' })).status, 200);
  assert.equal((await a.post('/api/admin/payments/review', { id: r.json.payment.id, decision: 'approve' })).status, 409);
  assert.equal((await accountOf(id)).balance, 2_000_000);
});

test('Zarinpal: verified once, a repeated callback does not credit twice, Status=NOK fails', async () => {
  const { c, id } = await newUser();
  const r = await c.post('/api/app/topup', { method: 'zarinpal', amount: 3_000_000 });
  assert.equal(r.status, 200);
  assert.match(r.json.redirect, /^https:\/\/sandbox\.zarinpal\.com\/pg\/StartPay\//);
  const authority = r.json.redirect.split('/').pop();
  assert.equal(zp.calls.at(-1).body.callback_url, t.base + '/pay/zarinpal/callback');
  const cb = `/pay/zarinpal/callback?Authority=${authority}&Status=OK`;
  const first = await c.get(cb);
  assert.equal(first.status, 303);
  assert.match(first.headers.get('location'), /pay=paid/);
  await c.get(cb);
  assert.equal((await accountOf(id)).balance, 3_000_000);

  const r2 = await c.post('/api/app/topup', { method: 'zarinpal', amount: 1_500_000 });
  const bad = await c.get(`/pay/zarinpal/callback?Authority=${r2.json.redirect.split('/').pop()}&Status=NOK`);
  assert.match((await c.get('/pay/zarinpal/callback?Authority=forged&Status=OK')).headers.get('location'), /pay=unknown/, 'unknown authority credits nothing');
  assert.match(bad.headers.get('location'), /pay=failed/);
  assert.equal((await accountOf(id)).balance, 3_000_000);
  assert.deepEqual(await reconcile(t.db), []);
});

test('admin: login required, suspend logs the customer out and blocks their keys', async () => {
  assert.equal((await t.client().get('/api/admin/users')).status, 401);
  assert.equal((await t.client().post('/api/admin/login', { password: 'wrong' })).status, 401);
  const { c, id } = await newUser();
  await credit(id, 5_000_000);
  const { json: { secret } } = await c.post('/api/app/keys', {});
  const a = await admin();
  assert.equal((await a.post('/api/admin/users/status', { id, status: 'suspended' })).status, 200);
  assert.equal((await c.get('/api/auth/me')).status, 401);
  assert.equal((await ask(secret)).status, 401);
  const detail = await a.get(`/api/admin/user?id=${id}`);
  assert.equal(detail.json.user.status, 'suspended');
  const ov = await a.get('/api/admin/overview');
  assert.equal(ov.json.ledgerOk, true);
  assert.ok((await a.get('/api/admin/audit')).json.rows.some(r => r.action === 'user_status'));
});
