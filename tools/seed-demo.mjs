// Fills the LOCAL development database with realistic demo data, so /app and /admin have something to show.
//   node tools/seed-demo.mjs            add demo customers (skips if they already exist)
//   node tools/seed-demo.mjs --reset    delete the demo customers first, then add them again
// Safety: refuses to run unless DATABASE_URL is a PGlite (local) database. Never point this at production.
//
// Demo login for /app:  mobile 09120000000  (or demo@claudeiran.test)  +  password  demo-password-123
//
// Money rules are kept: every balance is exactly the sum of its ledger rows (the admin overview checks this).
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../saas/db.mjs';
import { hashPassword, randomToken, sha256 } from '../saas/security.mjs';
import { pricing, cost } from '../saas/gateway.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(path.join(ROOT, '.env'))) {
  for (const line of readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const URL_ = process.env.DATABASE_URL || '';
if (!URL_.startsWith('pglite:')) {
  console.error('Refusing to seed: DATABASE_URL is not a local PGlite database (seed data is for development only).');
  process.exit(1);
}

// small deterministic random generator, so every run produces the same demo
let seed = 42;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const pick = a => a[Math.floor(rnd() * a.length)];
const between = (a, b) => Math.round(a + rnd() * (b - a));
const DAY = 86400_000;
const at = (daysAgo, hour = between(9, 22), min = between(0, 59)) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setUTCHours(hour - 3, min - 30, between(0, 59), 0); // Tehran = UTC+3:30
  return d.toISOString();
};
const DEMO_DOMAIN = 'claudeiran.test';

const CUSTOMERS = [
  { name: 'کاربر نمایشی', email: `demo@${DEMO_DOMAIN}`, mobile: '+989120000000', password: 'demo-password-123', joined: 29, rate: 60, growth: 1.8,
    keys: [['Production · Support', 26], ['Content · Studio', 20], ['Analytics · Read-only', 12], ['Development · Test', 27, 9]],
    topups: [[28, 2_000_000, 'manual', 'paid'], [12, 5_000_000, 'zarinpal', 'paid'], [3, 3_000_000, 'manual', 'rejected', 'مبلغ واریزی با درخواست یکی نبود'], [0, 1_000_000, 'manual', 'pending']] },
  { name: 'سارا رضایی', email: `sara@${DEMO_DOMAIN}`, mobile: '+989121110001', joined: 24, rate: 35, growth: 1.3,
    keys: [['Backend', 22], ['Staging', 15]], topups: [[22, 3_000_000, 'zarinpal', 'paid'], [6, 2_000_000, 'zarinpal', 'paid']] },
  { name: 'استودیو پیکسل', email: `team@pixel.${DEMO_DOMAIN}`, joined: 20, rate: 90, growth: 1.1,
    keys: [['Chatbot', 19], ['Docs search', 10]], topups: [[19, 10_000_000, 'manual', 'paid'], [1, 5_000_000, 'manual', 'pending']] },
  { name: 'علی محمدی', mobile: '+989351110002', joined: 14, rate: 12, growth: 1.5,
    keys: [['Laptop', 13]], topups: [[13, 500_000, 'manual', 'paid'], [0, 1_000_000, 'manual', 'pending']] },
  { name: 'مریم کریمی', email: `maryam@${DEMO_DOMAIN}`, mobile: '+989191110003', joined: 9, rate: 8, growth: 1,
    keys: [['Thesis project', 8]], topups: [[8, 1_000_000, 'zarinpal', 'paid']] },
  { name: 'فروشگاه نارون', email: `dev@naroon.${DEMO_DOMAIN}`, joined: 17, rate: 25, growth: .6, suspended: true,
    keys: [['Store assistant', 16]], topups: [[16, 2_000_000, 'manual', 'paid']] },
  { name: 'حسین نوری', mobile: '+989121110004', joined: 2, rate: 0, keys: [], topups: [] },
  { name: 'نگار احمدی', email: `negar@${DEMO_DOMAIN}`, joined: 1, rate: 0, keys: [], topups: [[0, 500_000, 'manual', 'pending']] },
];
const MODELS = Object.entries(pricing.models);

const db = await openDb(URL_);
const demoUsers = await db.query(`SELECT id FROM users WHERE email LIKE $1 OR mobile = ANY($2)`, [`%${DEMO_DOMAIN}`, CUSTOMERS.map(c => c.mobile).filter(Boolean)]);
if (demoUsers.length) {
  if (!process.argv.includes('--reset')) { console.log('Demo data already exists. Run with --reset to recreate it.'); await db.close(); process.exit(0); }
  const ids = demoUsers.map(u => u.id);
  await db.tx(async t => {
    const acc = (await t.query('SELECT id FROM accounts WHERE owner_id = ANY($1)', [ids])).map(a => a.id);
    for (const table of ['ledger', 'usage_events', 'payments', 'api_keys']) await t.query(`DELETE FROM ${table} WHERE account_id = ANY($1)`, [acc]);
    await t.query(`DELETE FROM audit_log WHERE actor = ANY($1) OR target = ANY($1)`, [ids.map(i => `user:${i}`)]);
    await t.query('DELETE FROM accounts WHERE id = ANY($1)', [acc]);
    await t.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
  });
  console.log(`Removed ${ids.length} demo customers.`);
}

const audit = [];
for (const c of CUSTOMERS) {
  await db.tx(async t => {
    const [u] = await t.query(
      `INSERT INTO users (name, email, mobile, password_hash, status, mobile_verified_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [c.name, c.email || null, c.mobile || null, c.password ? hashPassword(c.password) : null, c.suspended ? 'suspended' : 'active', c.mobile ? at(c.joined) : null, at(c.joined, 10)]);
    const [a] = await t.query('INSERT INTO accounts (owner_id, created_at) VALUES ($1, $2) RETURNING id', [u.id, at(c.joined, 10)]);
    audit.push(['user:' + u.id, 'signup', 'user:' + u.id, { method: c.mobile ? 'sms' : 'email' }, at(c.joined, 10)]);

    // keys: [name, created days ago, revoked days ago?]
    const keyIds = [];
    for (const [name, made, revoked] of c.keys) {
      const [k] = await t.query(`INSERT INTO api_keys (account_id, name, prefix, key_hash, created_at, revoked_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [a.id, name, 'ci_' + randomToken(6).slice(0, 7), sha256(randomToken()), at(made), revoked != null ? at(revoked) : null]);
      keyIds.push({ id: k.id, made, revoked });
    }

    // top-ups: [days ago, Toman, provider, status, note]
    const credits = [];
    for (const [ago, toman, provider, status, note] of c.topups) {
      const amount = toman * 10, created = at(ago), resolved = status === 'pending' ? null : new Date(Date.parse(created) + between(5, 90) * 60_000).toISOString();
      const [p] = await t.query(
        `INSERT INTO payments (account_id, provider, amount, status, receipt, ref_id, card_pan, note, authority, created_at, resolved_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [a.id, provider, amount, status, provider === 'manual' ? `پیگیری ${between(100000, 999999)}` : null, provider === 'zarinpal' && status === 'paid' ? String(between(10_000_000, 99_999_999)) : null,
          provider === 'zarinpal' && status === 'paid' ? '6037**' + between(1000, 9999) : null, note || null, provider === 'zarinpal' ? 'A' + randomToken(12) : null, created, resolved]);
      if (status === 'paid') {
        credits.push({ at: resolved, amount });
        await t.query(`INSERT INTO ledger (account_id, amount, kind, ref, note, actor, created_at) VALUES ($1, $2, 'topup', $3, $4, $5, $6)`,
          [a.id, amount, `payment:${p.id}`, provider, provider === 'manual' ? 'admin' : 'zarinpal', resolved]);
        if (provider === 'manual') audit.push(['admin', 'payment_approve', `payment:${p.id}`, { amount }, resolved]);
      }
      if (status === 'rejected') audit.push(['admin', 'payment_reject', `payment:${p.id}`, { amount, note }, resolved]);
    }

    // traffic: requests per day grow from rate to rate*growth; never spend more than was credited by that moment
    let balance = 0, ci = 0;
    const events = [];
    for (let ago = c.joined - 1; ago >= 0 && c.rate; ago--) {
      const n = Math.round(c.rate * (1 + (c.growth - 1) * (1 - ago / c.joined)) * (.6 + rnd() * .8) * ([5, 6].includes(new Date(Date.now() - ago * DAY).getDay()) ? .55 : 1));
      for (let i = 0; i < n; i++) {
        const when = at(ago);
        while (ci < credits.length && credits[ci].at <= when) balance += credits[ci++].amount; // top-ups that arrived before this request
        const live = keyIds.filter(k => k.made >= ago && (k.revoked == null || k.revoked < ago));
        if (!live.length) continue;
        const key = pick(live), [model, price] = MODELS[rnd() < .62 ? 1 : rnd() < .7 ? 2 : 0];
        const input = between(250, 4200), output = between(80, Math.min(1400, price.maxOutput)), hold = cost(price, Math.round(input * 1.5) + 50, output + 400);
        const failed = rnd() < .025, c$ = failed ? 0 : cost(price, input, output);
        if (c$ > balance) continue; // the gateway would have answered 402: no credit
        balance -= c$;
        events.push({ account_id: a.id, api_key_id: key.id, model, status: failed ? 'error' : 'ok', hold, input_tokens: failed ? 0 : input, output_tokens: failed ? 0 : output,
          cost: c$, upstream: 'mock', error: failed ? pick(['upstream timeout', 'upstream 529 overloaded']) : null, latency_ms: failed ? between(15000, 30000) : between(600, 4200),
          created_at: when, settled_at: when });
      }
    }
    if (events.length) {
      // one INSERT for all rows: json_to_recordset turns a JSON array into table rows
      await t.query(`INSERT INTO usage_events (account_id, api_key_id, model, status, hold, input_tokens, output_tokens, cost, upstream, error, latency_ms, created_at, settled_at)
        SELECT * FROM json_to_recordset($1) AS x(account_id bigint, api_key_id bigint, model text, status text, hold bigint, input_tokens int, output_tokens int,
          cost bigint, upstream text, error text, latency_ms int, created_at timestamptz, settled_at timestamptz)`, [JSON.stringify(events)]);
      await t.query(`INSERT INTO ledger (account_id, amount, kind, ref, created_at)
        SELECT account_id, -cost, 'usage', 'usage:' || id, settled_at FROM usage_events WHERE account_id = $1 AND cost > 0`, [a.id]);
      await t.query(`UPDATE api_keys k SET last_used_at = (SELECT max(created_at) FROM usage_events e WHERE e.api_key_id = k.id) WHERE account_id = $1`, [a.id]);
    }
    // the cached balance is set from the ledger, never computed separately
    await t.query(`UPDATE accounts SET balance = (SELECT COALESCE(sum(amount), 0) FROM ledger WHERE account_id = $1) WHERE id = $1`, [a.id]);
    if (c.suspended) audit.push(['admin', 'user_status', 'user:' + u.id, { status: 'suspended' }, at(3)]);
    console.log(`  ${c.name.padEnd(16)} ${String(events.length).padStart(5)} requests, ${c.topups.length} top-ups`);
  });
}
await db.query(`INSERT INTO audit_log (actor, action, target, detail, ip, created_at)
  SELECT actor, action, target, detail, '127.0.0.1', created_at FROM json_to_recordset($1) AS x(actor text, action text, target text, detail jsonb, created_at timestamptz)`,
  [JSON.stringify(audit.map(([actor, action, target, detail, created_at]) => ({ actor, action, target, detail, created_at })))]);

// early-access list for the admin panel (only if the local file does not exist yet)
const WAIT = path.join(ROOT, 'data', 'waitlist.json');
if (!existsSync(WAIT)) {
  const roles = ['developer', 'founder', 'product', 'it', 'finance', 'other'];
  const people = ['رضا کاظمی', 'لیلا صادقی', 'امیر حسینی', 'شبنم مرادی', 'کاوه جعفری', 'نسرین طاهری', 'پویا رحیمی', 'مهسا قاسمی', 'بهرام یزدانی', 'تینا فرهادی'];
  const uses = ['چت‌بات پشتیبانی فروشگاه', 'خلاصه‌سازی اسناد حقوقی', 'دستیار برنامه‌نویسی تیم', 'تحلیل نظرات مشتریان', 'تولید محتوای آموزشی', 'ترجمهٔ مستندات فنی'];
  const list = people.map((name, i) => ({ name, email: `wait${i + 1}@${DEMO_DOMAIN}`, mobile: `+98912${String(3000000 + i * 1371).padStart(7, '0')}`, role: roles[i % roles.length],
    usecase: pick(uses), source: pick(['section', 'header', 'blog', 'services']), page: '/', createdAt: at(between(0, 25)), status: pick(['new', 'new', 'approved', 'invited']) }));
  mkdirSync(path.dirname(WAIT), { recursive: true });
  writeFileSync(WAIT, JSON.stringify(list, null, 2));
  console.log(`  early-access list: ${list.length} sample sign-ups`);
}

const [chk] = await db.query(`SELECT count(*) AS bad FROM accounts a WHERE a.balance <> (SELECT COALESCE(sum(amount), 0) FROM ledger l WHERE l.account_id = a.id)`);
console.log(chk.bad ? `WARNING: ${chk.bad} account(s) do not reconcile` : 'Ledger reconciles. Demo login: 09120000000 / demo-password-123');
await db.close();
