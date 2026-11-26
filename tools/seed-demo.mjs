// Fills the LOCAL development database with a realistic demo business, so /app and /admin can be presented.
//   node tools/seed-demo.mjs            add the demo customers (skips if they already exist)
//   node tools/seed-demo.mjs --reset    delete the demo customers first, then add them again
// Safety: refuses to run unless DATABASE_URL is a PGlite (local) database. Never point this at production.
//
// What it creates (60 days of history, ending now):
//   16 customers with different stories (agency, enterprise, student, a startup ramping up, one that stopped,
//   one suspended...), their API keys, top-ups (paid / pending / rejected), and every API request with tokens,
//   cost, hold and latency. Traffic follows Tehran office hours and is lower on Thursday and Friday.
//   Also: an early-access list (data/waitlist.json) and data/demo-keys.json, the live keys used by
//   tools/demo-traffic.mjs to send new requests during a presentation. data/ is git-ignored.
//
// Demo login for /app:  09120000000  (or demo@claudeiran.test)  +  demo-password-123
// Money rules are kept: every balance is exactly the sum of its ledger rows (the admin overview checks this).
import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
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
const KEYS_FILE = path.join(ROOT, 'data', 'demo-keys.json');
const WAIT_FILE = path.join(ROOT, 'data', 'waitlist.json');
const DOMAIN = 'claudeiran.test';

/* ---------- deterministic randomness: every run builds the same business ---------- */
let seed = 7;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const pick = a => a[Math.floor(rnd() * a.length)];
const between = (a, b) => Math.round(a + rnd() * (b - a));
const weighted = w => { let r = rnd() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { if ((r -= w[i]) < 0) return i; } return w.length - 1; };
const DAY = 86400_000, NOW = Date.now();
// Tehran office rhythm: quiet at night, peaks late morning and afternoon
const HOURS = [1, .5, .3, .2, .2, .3, .8, 2, 4, 7, 9, 10, 8, 6, 8, 9, 9, 8, 6, 5, 4, 3, 2, 1.5];
// a moment `daysAgo` days back at a Tehran hour (UTC+3:30); null if that moment is still in the future
function at(daysAgo, hour = weighted(HOURS)) {
  const d = new Date(NOW - daysAgo * DAY);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, between(0, 59), between(0, 59)) - 3.5 * 3600_000;
  return t > NOW ? null : new Date(t).toISOString();
}
const after = (iso, minutes) => new Date(Date.parse(iso) + minutes * 60_000).toISOString();

/* ---------- the demo business ----------
   joined: days ago · rate: requests/day at the start · growth: multiplier reached by today
   use: share of paid credit spent so far (default .7) · mix: share of [Opus, Sonnet, Haiku] · tin/tout: input/output token ranges
   keys: [name, created days ago, revoked days ago?] · topups: [days ago, Toman, provider, status, note?]
   stoppedAt: no traffic after this many days ago · suspended: account blocked by the admin */
const C = [
  { name: 'کاربر نمایشی', email: `demo@${DOMAIN}`, mobile: '+989120000000', password: 'demo-password-123', joined: 45, rate: 45, growth: 2.2, use: .75, mix: [.1, .65, .25],
    tin: [400, 3500], tout: [120, 900], keys: [['Production · Support', 44], ['Content · Studio', 30], ['Analytics · Read-only', 20], ['Development · Test', 43, 15]],
    topups: [[44, 3_000_000, 'manual', 'paid'], [26, 5_000_000, 'zarinpal', 'paid'], [9, 5_000_000, 'zarinpal', 'paid'], [3, 3_000_000, 'manual', 'rejected', 'واریزی با این مشخصات در حساب پیدا نشد'], [0, 2_000_000, 'manual', 'pending']] },
  { name: 'استودیو پیکسل', email: `team@pixel.${DOMAIN}`, joined: 58, rate: 70, growth: 1.4, use: .85, mix: [.3, .55, .15], tin: [800, 4000], tout: [200, 1200],
    keys: [['Chatbot', 57], ['Docs search', 40], ['Client · Rayan', 22]], topups: [[57, 10_000_000, 'manual', 'paid'], [38, 15_000_000, 'manual', 'paid'], [18, 20_000_000, 'zarinpal', 'paid'], [1, 10_000_000, 'manual', 'pending']] },
  { name: 'داده‌پردازان آرین', email: `ai@arian.${DOMAIN}`, joined: 35, rate: 80, growth: 1.9, use: .6, mix: [.05, .75, .2], tin: [600, 5000], tout: [150, 800],
    keys: [['ETL · Batch', 34], ['Support bot', 30], ['Internal search', 14]], topups: [[34, 20_000_000, 'manual', 'paid'], [15, 30_000_000, 'manual', 'paid']] },
  { name: 'سارا رضایی', email: `sara@${DOMAIN}`, mobile: '+989121110001', joined: 50, rate: 22, growth: 1.3, mix: [0, .85, .15], tin: [300, 2500], tout: [100, 700],
    keys: [['Backend', 49], ['Staging', 30]], topups: [[49, 3_000_000, 'zarinpal', 'paid'], [20, 4_000_000, 'zarinpal', 'paid']] },
  { name: 'رسانهٔ خبری نبض', email: `tech@nabz.${DOMAIN}`, joined: 19, rate: 50, growth: 1.5, mix: [0, .4, .6], tin: [3000, 9000], tout: [200, 600],
    keys: [['Summaries', 18], ['Headlines', 10]], topups: [[18, 5_000_000, 'zarinpal', 'paid'], [7, 6_000_000, 'zarinpal', 'paid'], [0, 4_000_000, 'manual', 'pending']] },
  { name: 'بانک اطلاعات حقوقی داد', email: `it@dad.${DOMAIN}`, joined: 41, rate: 12, growth: 1.2, mix: [.6, .4, 0], tin: [6000, 15000], tout: [400, 1500],
    keys: [['Contract review', 40]], topups: [[40, 8_000_000, 'manual', 'paid'], [16, 10_000_000, 'manual', 'paid']] },
  { name: 'آموزشگاه زبان پارسه', email: `office@parse.${DOMAIN}`, mobile: '+989121110005', joined: 26, rate: 28, growth: 1.2, mix: [0, .7, .3], tin: [300, 1800], tout: [150, 900],
    keys: [['Tutor', 25]], topups: [[25, 3_000_000, 'manual', 'paid'], [8, 3_000_000, 'manual', 'paid']] },
  { name: 'تیم توسعهٔ سپهر', email: `dev@sepehr.${DOMAIN}`, joined: 12, rate: 8, growth: 5, use: .55, mix: [.05, .8, .15], tin: [500, 3000], tout: [200, 1000],
    keys: [['MVP', 11], ['CI tests', 5]], topups: [[11, 2_000_000, 'zarinpal', 'paid'], [4, 5_000_000, 'zarinpal', 'paid']] },
  { name: 'کلینیک دندان‌پزشکی لبخند', mobile: '+989121110006', joined: 33, rate: 15, growth: 1.1, mix: [0, .2, .8], tin: [200, 1200], tout: [80, 400],
    keys: [['Booking assistant', 32]], topups: [[32, 1_500_000, 'manual', 'paid'], [12, 1_500_000, 'manual', 'paid']] },
  { name: 'محمدرضا اکبری', mobile: '+989351110007', joined: 28, rate: 12, growth: 1, mix: [0, .9, .1], tin: [500, 3000], tout: [200, 900], stoppedAt: 9,
    keys: [['Freelance projects', 27]], topups: [[27, 2_000_000, 'zarinpal', 'paid']] },
  { name: 'فروشگاه نارون', email: `dev@naroon.${DOMAIN}`, joined: 40, rate: 25, growth: .8, mix: [0, .5, .5], tin: [300, 1500], tout: [100, 500], stoppedAt: 12, suspended: 12,
    keys: [['Store assistant', 39]], topups: [[39, 4_000_000, 'manual', 'paid']] },
  { name: 'علی محمدی', mobile: '+989351110002', joined: 21, rate: 8, growth: 1.6, mix: [0, .3, .7], tin: [200, 1500], tout: [100, 600],
    keys: [['Laptop', 20]], topups: [[20, 500_000, 'manual', 'paid'], [0, 1_000_000, 'manual', 'pending']] },
  { name: 'مریم کریمی', email: `maryam@${DOMAIN}`, mobile: '+989191110003', joined: 16, rate: 5, growth: 1, mix: [0, .5, .5], tin: [500, 2500], tout: [200, 800],
    keys: [['Thesis project', 15]], topups: [[15, 1_000_000, 'zarinpal', 'paid']] },
  { name: 'فاطمه حسینی', mobile: '+989121110008', joined: 7, rate: 4, growth: 1, mix: [0, .6, .4], tin: [300, 1500], tout: [100, 600],
    keys: [['Personal', 6]], topups: [[6, 500_000, 'manual', 'paid']] },
  { name: 'حسین نوری', mobile: '+989121110004', joined: 2, rate: 0, keys: [], topups: [] },
  { name: 'نگار احمدی', email: `negar@${DOMAIN}`, joined: 1, rate: 0, keys: [], topups: [[0, 500_000, 'manual', 'pending']] },
];
const MODELS = Object.entries(pricing.models); // [Opus, Sonnet, Haiku] in pricing.json order

/* ---------- the server must not be running on the same database ---------- */
// A running ClaudeIran server keeps the database open; writing to it from here at the same time loses data.
for (const port of [process.env.PORT || '5230']) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/v1/models`, { signal: AbortSignal.timeout(800) });
    if (r.ok && (await r.json()).data) {
      console.error(`A ClaudeIran server is running on port ${port}. Stop it first (Ctrl+C in its terminal), then run:  npm run demo`);
      process.exit(1);
    }
  } catch { /* nothing listening: good */ }
}

/* ---------- reset ---------- */
let db;
try { db = await openDb(URL_); }
catch (e) { if (e.code === 'DB_LOCKED') { console.error(e.message); process.exit(1); } throw e; }
const existing = await db.query(`SELECT id FROM users WHERE email LIKE $1 OR mobile = ANY($2)`, [`%${DOMAIN}`, C.map(c => c.mobile).filter(Boolean)]);
if (existing.length) {
  if (!process.argv.includes('--reset')) { console.log('Demo data already exists. Run with --reset to recreate it.'); await db.close(); process.exit(0); }
  const ids = existing.map(u => u.id);
  await db.tx(async t => {
    const acc = (await t.query('SELECT id FROM accounts WHERE owner_id = ANY($1)', [ids])).map(a => a.id);
    for (const table of ['ledger', 'usage_events', 'payments', 'api_keys']) await t.query(`DELETE FROM ${table} WHERE account_id = ANY($1)`, [acc]);
    await t.query(`DELETE FROM audit_log WHERE actor = ANY($1) OR target = ANY($1) OR detail->>'demo' = 'true'`, [ids.map(i => `user:${i}`)]);
    await t.query('DELETE FROM sessions WHERE user_id = ANY($1)', [ids]);
    await t.query('DELETE FROM accounts WHERE id = ANY($1)', [acc]);
    await t.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
  });
  rmSync(KEYS_FILE, { force: true });
  console.log(`Removed ${ids.length} demo customers.`);
}

/* ---------- build ---------- */
const audit = [], liveKeys = [];
const log = (actor, action, target, detail, when, ip = '127.0.0.1') => audit.push({ actor, action, target, detail: { ...detail, demo: true }, ip, created_at: when });
let totalReq = 0;

for (const c of C) {
  await db.tx(async t => {
    const joined = at(c.joined, between(9, 20));
    const [u] = await t.query(
      `INSERT INTO users (name, email, mobile, password_hash, status, mobile_verified_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [c.name, c.email || null, c.mobile || null, c.password ? hashPassword(c.password) : null, c.suspended ? 'suspended' : 'active', c.mobile ? joined : null, joined]);
    const [a] = await t.query('INSERT INTO accounts (owner_id, created_at) VALUES ($1, $2) RETURNING id', [u.id, joined]);
    log(`user:${u.id}`, 'signup', `user:${u.id}`, { method: c.mobile ? 'sms' : 'email' }, joined, `5.${between(100, 250)}.${between(0, 255)}.${between(1, 254)}`);

    // keys: a real secret per key, so the live-traffic script can use the active ones
    const keys = [];
    for (const [name, made, revoked] of c.keys) {
      const secret = 'ci_' + randomToken(32), createdAt = at(made, between(9, 18));
      const [k] = await t.query(`INSERT INTO api_keys (account_id, name, prefix, key_hash, created_at, revoked_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [a.id, name, secret.slice(0, 10), sha256(secret), createdAt, revoked != null ? at(revoked, 11) : null]);
      keys.push({ id: k.id, made, revoked });
      log(`user:${u.id}`, 'key_create', `key:${k.id}`, { name }, createdAt);
      if (revoked != null) log(`user:${u.id}`, 'key_revoke', `key:${k.id}`, {}, at(revoked, 11));
      else if (!c.suspended) liveKeys.push({ customer: c.name, key: name, secret, weight: c.rate * c.growth, mix: c.mix, tin: c.tin, tout: c.tout });
    }

    // traffic first: every request this customer would have sent, with its tokens and price
    const reqs = [];
    for (let ago = c.joined - 1; ago >= 0 && c.rate; ago--) {
      if (c.stoppedAt != null && ago < c.stoppedAt) break;
      const wd = new Date(NOW - ago * DAY).getUTCDay(); // 4 = Thursday, 5 = Friday (Iranian weekend)
      const dayFactor = wd === 5 ? .35 : wd === 4 ? .65 : 1;
      const n = Math.round(c.rate * (1 + (c.growth - 1) * (1 - ago / c.joined)) * (.75 + rnd() * .5) * dayFactor);
      for (let i = 0; i < n; i++) {
        const when = at(ago);
        if (!when) continue;
        const live = keys.filter(k => k.made > ago && (k.revoked == null || k.revoked < ago));
        if (!live.length) continue;
        const m = weighted(c.mix), [model, price] = MODELS[m];
        const input = between(c.tin[0], c.tin[1]), output = Math.min(price.maxOutput, between(c.tout[0], c.tout[1]));
        const failed = rnd() < .018;
        reqs.push({ when, key: live[Math.floor(rnd() * live.length)], m, model, price, input, output, failed,
          hold: cost(price, Math.round(input * 1.5) + 50, Math.round(output * 1.6) + 200), charge: failed ? 0 : cost(price, input, output) });
      }
    }
    reqs.sort((x, y) => x.when.localeCompare(y.when));

    // top-ups sized like a real customer's: what they paid covers their spend with some left over
    // (c.use = share of credit used, default 70%); the listed amounts only set the proportions. Rounded to 500,000 Toman.
    const spendToman = reqs.reduce((sum, r) => sum + r.charge, 0) / 10;
    const paidWeight = c.topups.filter(x => x[3] === 'paid').reduce((sum, x) => sum + x[1], 0);
    const scale = spendToman && paidWeight ? spendToman / (c.use || .7) / paidWeight : 1;
    const nice = toman => Math.max(500_000, Math.round(toman * scale / 500_000) * 500_000);

    const credits = [];
    for (const [ago, weight, provider, status, note] of c.topups) {
      const amount = nice(weight) * 10, created = at(ago, between(9, 20)) || new Date(NOW - 3600_000).toISOString();
      const resolved = status === 'pending' ? null : after(created, between(4, 180));
      const paidByGateway = provider === 'zarinpal' && status === 'paid';
      const [p] = await t.query(
        `INSERT INTO payments (account_id, provider, amount, status, receipt, ref_id, card_pan, note, authority, created_at, resolved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [a.id, provider, amount, status, provider === 'manual' ? `پیگیری ${between(100000, 999999)} · ${pick(['ملت', 'ملی', 'سامان', 'پاسارگاد', 'تجارت'])}` : null,
          paidByGateway ? String(between(10_000_000, 99_999_999)) : null, paidByGateway ? `6037**${between(1000, 9999)}` : null, note || null,
          provider === 'zarinpal' ? 'A' + randomToken(14) : null, created, resolved]);
      if (provider === 'manual') log(`user:${u.id}`, 'topup_manual', `payment:${p.id}`, { amount }, created);
      if (status === 'paid') {
        credits.push({ at: resolved, amount });
        await t.query(`INSERT INTO ledger (account_id, amount, kind, ref, note, actor, created_at) VALUES ($1, $2, 'topup', $3, $4, $5, $6)`,
          [a.id, amount, `payment:${p.id}`, provider, provider === 'manual' ? 'admin' : 'zarinpal', resolved]);
        log(provider === 'manual' ? 'admin' : 'zarinpal', provider === 'manual' ? 'payment_approve' : 'payment_paid', `payment:${p.id}`, { amount }, resolved);
      }
      if (status === 'rejected') log('admin', 'payment_reject', `payment:${p.id}`, { amount, note }, resolved);
    }

    // replay the requests in time order against the balance: one that would overspend is dropped,
    // exactly as the gateway answers it 402
    credits.sort((x, y) => x.at.localeCompare(y.at));
    let balance = 0, ci = 0;
    const events = [];
    for (const r of reqs) {
      while (ci < credits.length && credits[ci].at <= r.when) balance += credits[ci++].amount; // top-ups that arrived before this request
      if (r.hold > balance) continue;
      balance -= r.charge;
      const latency = r.failed ? between(15000, 30000) : Math.round((350 + r.output * 1.2 + rnd() * 600) * (r.m === 0 ? 1.6 : r.m === 2 ? .6 : 1));
      events.push({ account_id: a.id, api_key_id: r.key.id, model: r.model, status: r.failed ? 'error' : 'ok', hold: r.hold,
        input_tokens: r.failed ? 0 : r.input, output_tokens: r.failed ? 0 : r.output, cost: r.charge, upstream: 'mock',
        error: r.failed ? pick(['upstream timeout', 'upstream 529 overloaded', 'upstream 500']) : null, latency_ms: latency,
        created_at: r.when, settled_at: after(r.when, latency / 60000) });
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
    // the cached balance always comes from the ledger
    await t.query(`UPDATE accounts SET balance = (SELECT COALESCE(sum(amount), 0) FROM ledger WHERE account_id = $1) WHERE id = $1`, [a.id]);
    if (c.suspended) log('admin', 'user_status', `user:${u.id}`, { status: 'suspended' }, at(c.suspended, 12));
    for (let d = Math.min(c.joined, 30); d >= 0; d -= between(2, 6)) { const w = at(d); if (w) log(`user:${u.id}`, 'login', `user:${u.id}`, { method: c.mobile ? 'sms' : 'password' }, w); }
    totalReq += events.length;
    console.log(`  ${c.name.padEnd(24)} ${String(events.length).padStart(6)} requests · ${c.topups.length} top-ups`);
  });
}
for (let d = 44; d >= 0; d -= between(1, 3)) { const w = at(d, between(8, 11)); if (w) log('admin', 'admin_login', null, {}, w); }
await db.query(`INSERT INTO audit_log (actor, action, target, detail, ip, created_at)
  SELECT actor, action, target, detail, ip, created_at FROM json_to_recordset($1) AS x(actor text, action text, target text, detail jsonb, ip text, created_at timestamptz)`,
  [JSON.stringify(audit)]);

/* ---------- side files ---------- */
mkdirSync(path.dirname(KEYS_FILE), { recursive: true });
writeFileSync(KEYS_FILE, JSON.stringify({ note: 'LOCAL DEMO KEYS for tools/demo-traffic.mjs. Development database only; never use in production.', keys: liveKeys }, null, 2));

// early-access list: written when missing, or when it only holds earlier demo entries (real local sign-ups are kept)
const old = existsSync(WAIT_FILE) ? JSON.parse(readFileSync(WAIT_FILE, 'utf8') || '[]') : [];
if (old.every(x => String(x.email).endsWith(DOMAIN))) {
  const roles = ['developer', 'founder', 'product', 'it', 'finance', 'other'];
  const people = ['رضا کاظمی', 'لیلا صادقی', 'امیر حسینی', 'شبنم مرادی', 'کاوه جعفری', 'نسرین طاهری', 'پویا رحیمی', 'مهسا قاسمی', 'بهرام یزدانی', 'تینا فرهادی',
    'آرش نیک‌پور', 'الهام رستمی', 'سینا موسوی', 'یاسمن عباسی', 'کامران شریفی', 'پریسا کاظمی', 'میلاد زارعی', 'هانیه بهرامی'];
  const uses = ['چت‌بات پشتیبانی فروشگاه اینترنتی', 'خلاصه‌سازی اسناد حقوقی', 'دستیار برنامه‌نویسی برای تیم', 'تحلیل نظرات مشتریان', 'تولید محتوای آموزشی',
    'ترجمهٔ مستندات فنی', 'پاسخ‌گویی خودکار به ایمیل‌ها', 'جست‌وجوی هوشمند در دانش‌نامهٔ داخلی'];
  const list = people.map((name, i) => {
    const ago = Math.floor(i * 1.6 + rnd() * 2);
    return { name, email: `wait${i + 1}@${DOMAIN}`, mobile: `+98912${String(3000000 + i * 1371).padStart(7, '0')}`, role: roles[i % roles.length],
      usecase: pick(uses), source: pick(['section', 'section', 'header', 'blog', 'services']), page: '/', createdAt: at(ago, between(9, 22)) || new Date(NOW - 7200_000).toISOString(),
      status: ago > 20 ? pick(['invited', 'approved']) : ago > 8 ? pick(['new', 'approved', 'invited']) : 'new', note: ago > 20 ? 'به پایلوت دعوت شد' : '' };
  });
  writeFileSync(WAIT_FILE, JSON.stringify(list, null, 2));
  console.log(`  early-access list: ${list.length} sign-ups`);
} else {
  console.log('  early-access list: kept (it has real local sign-ups)');
}

const [chk] = await db.query(`SELECT count(*) AS bad FROM accounts a WHERE a.balance <> (SELECT COALESCE(sum(amount), 0) FROM ledger l WHERE l.account_id = a.id)`);
console.log(`\n${totalReq} requests over 60 days, ${liveKeys.length} live keys saved to data/demo-keys.json`);
console.log(chk.bad ? `WARNING: ${chk.bad} account(s) do not reconcile` : 'Ledger reconciles. Demo customer login: 09120000000 / demo-password-123');
await db.close();
