// Live traffic for a presentation: sends real API requests through the local gateway, using the demo
// customers' keys (data/demo-keys.json, written by tools/seed-demo.mjs). Every request goes the real way:
// key check -> credit hold -> (mock) model -> settle -> ledger, so /app and /admin update while you present.
//
//   node tools/demo-traffic.mjs                     ~20 requests a minute to http://localhost:5230
//   node tools/demo-traffic.mjs --rate 60           busier
//   node tools/demo-traffic.mjs --url http://localhost:5231
// Stop with Ctrl+C (prints a summary). Only works against a local server; refuses other hosts.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const BASE = arg('url', 'http://localhost:5230').replace(/\/$/, '');
const RATE = Math.max(1, Math.min(240, Number(arg('rate', 20))));
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('demo-traffic only talks to a local server (localhost).'); process.exit(1); }
const FILE = path.join(ROOT, 'data', 'demo-keys.json');
if (!existsSync(FILE)) { console.error('No data/demo-keys.json yet: run  node tools/seed-demo.mjs  first.'); process.exit(1); }
const { keys } = JSON.parse(readFileSync(FILE, 'utf8'));

const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
const PROMPTS = [
  'یک پاسخ مؤدبانه به مشتری بنویس که سفارشش دیر رسیده است.', 'این قرارداد را در پنج بند خلاصه کن.', 'برای این تابع پایتون تست واحد بنویس.',
  'سه عنوان جذاب برای مقاله‌ای دربارهٔ هوش مصنوعی در آموزش پیشنهاد بده.', 'این متن را به انگلیسی رسمی ترجمه کن.', 'نظرات مشتریان این هفته را دسته‌بندی کن.',
  'یک ایمیل پیگیری برای جلسهٔ فروش بنویس.', 'خطای این کد جاوااسکریپت را پیدا کن.', 'برای این محصول توضیح کوتاه فروشگاهی بنویس.', 'خبر زیر را در سه جمله خلاصه کن.',
];
const weighted = w => { let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { if ((r -= w[i]) < 0) return i; } return w.length - 1; };
const between = (a, b) => Math.round(a + Math.random() * (b - a));
const toman = rial => new Intl.NumberFormat('en-US').format(Math.floor(rial / 10));
const time = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Tehran' });

const stats = { ok: 0, error: 0, noCredit: 0, spent: 0 };
const resting = new Map(); // keys that ran out of credit rest for a minute

async function one() {
  const live = keys.filter(k => !(resting.get(k.secret) > Date.now()));
  if (!live.length) return;
  const k = live[weighted(live.map(x => x.weight))];
  const model = MODELS[weighted(k.mix)];
  const content = PROMPTS[between(0, PROMPTS.length - 1)] + ' ' + 'متن نمونه '.repeat(between(Math.ceil(k.tin[0] / 3.3), Math.ceil(k.tin[1] / 3.3))); // ~3.3 tokens per 10-character phrase
  const max_tokens = Math.max(64, between(k.tout[0], k.tout[1]));
  let r;
  try {
    r = await fetch(`${BASE}/v1/messages`, { method: 'POST', headers: { 'x-api-key': k.secret, 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens, messages: [{ role: 'user', content }] }) });
  } catch (e) {
    console.log(`${time()}  server not reachable at ${BASE} (${e.cause?.code || e.message})`);
    return;
  }
  const charged = Number(r.headers.get('x-ci-cost-rial') || 0);
  if (r.status === 200) { stats.ok++; stats.spent += charged; }
  else if (r.status === 402) { stats.noCredit++; resting.set(k.secret, Date.now() + 60_000); }
  else stats.error++;
  const label = r.status === 200 ? `${toman(charged).padStart(7)} Toman` : r.status === 402 ? 'no credit (402)' : `HTTP ${r.status}`;
  console.log(`${time()}  ${k.customer.padEnd(24)} ${model.replace('claude-', '').padEnd(12)} ${label}`);
}

console.log(`Sending ~${RATE} requests/minute to ${BASE} with ${keys.length} demo keys. Ctrl+C to stop.\n`);
let stopped = false;
process.on('SIGINT', () => {
  stopped = true;
  console.log(`\n${stats.ok} answered · ${stats.noCredit} refused for credit · ${stats.error} errors · ${toman(stats.spent)} Toman charged`);
  process.exit(0);
});
while (!stopped) {
  one();                                                              // don't wait: requests overlap like real traffic
  await new Promise(r => setTimeout(r, (60_000 / RATE) * (.4 + Math.random() * 1.2)));
}
