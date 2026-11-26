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
const PROVIDER_FA = { manual: 'کارت‌به‌کارت', zarinpal: 'زرین‌پال' };
