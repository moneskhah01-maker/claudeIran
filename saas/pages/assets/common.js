// Shared by /app and /admin. Builds DOM with textContent only (never innerHTML with data),
// so a customer name like "<img onerror=...>" is shown as text and can never run as code.
'use strict';

// h('div', {class: 'x', onclick: fn}, 'text', childNode, [more...])
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v; // CSSOM: allowed by the CSP, unlike a style attribute in HTML
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const $ = (sel, root = document) => root.querySelector(sel);

async function api(path, body) {
  const opts = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  let r;
  try { r = await fetch(path, { credentials: 'same-origin', ...opts }); }
  catch { return { ok: false, error: 'network', status: 0 }; }
  const j = await r.json().catch(() => ({ ok: false, error: 'bad_response' }));
  return { ...j, status: r.status };
}

const nf = new Intl.NumberFormat('fa-IR');
const toman = rial => nf.format(Math.floor(Number(rial || 0) / 10));
const num = n => nf.format(Number(n || 0));
const dt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' });
const dOnly = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'short', day: 'numeric', timeZone: 'Asia/Tehran' });
const when = v => (v ? dt.format(new Date(v)) : '—');
const day = v => dOnly.format(new Date(v + 'T12:00:00+03:30'));
const latin = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

const ERRORS = {
  network: 'اتصال برقرار نشد. اینترنت را بررسی کنید.', rate_limited: 'تلاش‌ها زیاد بود. چند دقیقه بعد دوباره امتحان کنید.',
  bad_credentials: 'ایمیل یا رمز عبور درست نیست.', email_taken: 'با این ایمیل قبلاً حساب ساخته شده است. وارد شوید.',
  bad_code: 'کد درست نیست یا منقضی شده است.', otp_wait: 'برای کد تازه یک دقیقه صبر کنید.', sms_failed: 'ارسال پیامک ناموفق بود. کمی بعد امتحان کنید.',
  suspended: 'این حساب غیرفعال شده است. با پشتیبانی تماس بگیرید.', unauthorized: 'نشست شما تمام شده است. دوباره وارد شوید.',
  bad_amount: 'مبلغ خارج از محدودهٔ مجاز است.', bad_receipt: 'شمارهٔ پیگیری را کامل وارد کنید.', too_many_pending: 'سه درخواست در انتظار بررسی دارید؛ صبر کنید تا بررسی شوند.',
  zarinpal_disabled: 'پرداخت آنلاین هنوز فعال نیست.', gateway_unreachable: 'درگاه در دسترس نیست. کمی بعد امتحان کنید.', gateway_refused: 'درگاه درخواست را نپذیرفت.',
  too_many_keys: 'حداکثر ۲۰ کلید فعال مجاز است.', not_found: 'پیدا نشد.', not_pending: 'این مورد قبلاً بررسی شده است.',
  insufficient_funds: 'موجودی برای این کسر کافی نیست.', note_required: 'توضیح (حداقل ۳ حرف) لازم است.', wrong_password: 'رمز نادرست است.',
  admin_disabled: 'ورود مدیر فعال نیست: ADMIN_PASSWORD_HASH تنظیم نشده است.',
};
const errText = r => ERRORS[r.error] || (r.errors ? 'فیلدهای مشخص‌شده را اصلاح کنید.' : 'خطایی رخ داد. دوباره امتحان کنید.');

function toast(msg) {
  const host = document.getElementById('toast'); // the console's own toast (/app)
  if (host) {
    host.textContent = msg;
    host.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => host.classList.remove('on'), 2800);
    return;
  }
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('کپی شد'); } catch { toast('کپی نشد؛ دستی انتخاب کنید'); }
}
function table(head, rows, empty = 'موردی نیست') {
  if (!rows.length) return h('div', { class: 'empty' }, empty);
  return h('div', { class: 'table-wrap' }, h('table', null,
    h('thead', null, h('tr', null, head.map(x => h('th', null, x)))),
    h('tbody', null, rows)));
}
const pill = (cls, text) => h('span', { class: `pill ${cls}` }, text);
const signed = rial => h('span', { class: rial > 0 ? 'pos' : 'neg' }, (rial > 0 ? '+' : '−') + toman(Math.abs(rial)));
function bars(days, key) {
  const max = Math.max(1, ...days.map(d => Number(d[key])));
  return h('div', { class: 'bars', role: 'img', 'aria-label': 'نمودار ۳۰ روز اخیر' },
    days.map((d, i) => h('span', { class: i === days.length - 1 ? 'today' : null, style: `height:${Math.max(1.5, (Number(d[key]) / max) * 100)}%`, title: `${day(d.day)}: ${key === 'cost' ? toman(d[key]) + ' تومان' : num(d[key])}` })));
}
const STATUS_FA = {
  ok: 'موفق', error: 'خطا', pending: 'در انتظار', paid: 'پرداخت‌شده', failed: 'ناموفق', rejected: 'ردشده',
  active: 'فعال', suspended: 'غیرفعال', new: 'جدید', approved: 'تأییدشده', invited: 'دعوت‌شده',
};
const KIND_FA = { topup: 'شارژ', usage: 'مصرف API', adjustment: 'اصلاح مدیر', refund: 'کسر/بازپرداخت' };
const PROVIDER_FA = { manual: 'کارت‌به‌کارت', zarinpal: 'زرین‌پال' };
