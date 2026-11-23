/* ----------------------------------------------------------
   Early-access dialog (header button, announcement bar, mobile menu, sticky CTA,
   blog CTAs) → POST /api/waitlist with source "header" or "blog".
   Three fields: full name, email, mobile. Without JavaScript every trigger is a
   plain link to the full form at /#early-access, so nothing is lost.
---------------------------------------------------------- */
import './early-access.css';

const toLatin = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
export const cleanPhone = v => toLatin(v).replace(/[\s\-().]/g, '');
// Iranian mobile (09…, +989…, 00989…) or an international number in E.164 form.
export const PHONE_OK = v => /^(?:\+98|0098|0)?9\d{9}$/.test(v) || /^(?:\+|00)(?!98)[1-9]\d{7,14}$/.test(v);
export const EMAIL_OK = v => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(v);

const RELIEF = '/img/relief-servants.webp';

const markup = () => `
<dialog class="ea" id="ea-dialog" aria-labelledby="ea-title" aria-describedby="ea-desc">
 <div class="ea-card">
  <aside class="ea-side" aria-hidden="true">
   <img src="${RELIEF}" width="1100" height="1472" alt="" loading="lazy" decoding="async">
   <span class="eyebrow"><span class="dot"></span>دسترسی زودهنگام <span class="en">EARLY ACCESS</span></span>
   <p class="ea-side-h">خبر راه‌اندازی،<br><b>اول به شما می‌رسد.</b></p>
   <ul class="ea-side-list">
    <li><svg class="ico"><use href="#i-check"/></svg>بدون هزینه و بدون تعهد</li>
    <li><svg class="ico"><use href="#i-check"/></svg>پیام راه‌اندازی با ایمیل و پیامک</li>
    <li><svg class="ico"><use href="#i-check"/></svg>اطلاعات فقط برای همین کار</li>
   </ul>
  </aside>
  <div class="ea-main">
   <button class="ea-close" type="button" data-ea-close aria-label="بستن پنجرهٔ دسترسی زودهنگام"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></button>
   <div class="ea-body" data-ea-form-view>
    <span class="ea-kicker"><span class="dot" aria-hidden="true"></span>پیش‌عرضه · ظرفیت پایلوت محدود</span>
    <h2 id="ea-title">درخواست دسترسی زودهنگام</h2>
    <p id="ea-desc" class="ea-lead">نام، ایمیل و شمارهٔ موبایلتان را بنویسید تا به‌محض راه‌اندازی کلاود ایران، پیام شروع را برایتان بفرستیم.</p>
    <form class="ea-form" novalidate>
     <div class="field">
      <label for="ea-name">نام و نام خانوادگی</label>
      <input id="ea-name" name="name" type="text" autocomplete="name" required maxlength="80" placeholder="مثلاً سارا احمدی" aria-describedby="ea-e-name">
      <span class="err" id="ea-e-name" data-required="نام و نام خانوادگی را بنویسید." data-invalid="نام باید دست‌کم ۲ حرف باشد."></span>
     </div>
     <div class="field">
      <label for="ea-email">ایمیل</label>
      <input id="ea-email" name="email" type="email" dir="ltr" autocomplete="email" inputmode="email" required maxlength="254" placeholder="name@example.com" aria-describedby="ea-e-email">
      <span class="err" id="ea-e-email" data-required="ایمیل را وارد کنید." data-invalid="این ایمیل درست به نظر نمی‌رسد؛ نمونهٔ درست: name@example.com"></span>
     </div>
     <div class="field">
      <label for="ea-mobile">شمارهٔ موبایل</label>
      <input id="ea-mobile" name="mobile" type="tel" dir="ltr" inputmode="tel" autocomplete="tel" required maxlength="20" placeholder="۰۹۱۲ ۰۰۰ ۰۰۰۰" aria-describedby="ea-e-mobile">
      <span class="err" id="ea-e-mobile" data-required="شمارهٔ موبایل را وارد کنید." data-invalid="شماره را ۱۱ رقمی و با ۰۹ بنویسید؛ شمارهٔ خارج از ایران را با کد کشور، مثل ‎+44…"></span>
     </div>
     <div class="hp" aria-hidden="true"><label>وب‌سایت<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
     <div class="consent">
      <input id="ea-consent" name="consent" type="checkbox" required aria-describedby="ea-e-consent">
      <label for="ea-consent">می‌پذیرم کلاود ایران برای خبر راه‌اندازی و هماهنگی پایلوت با ایمیل یا پیامک با من تماس بگیرد.</label>
      <span class="err" id="ea-e-consent" data-required="برای ثبت درخواست، این گزینه را تأیید کنید."></span>
     </div>
     <p class="form-alert" role="alert" data-form-alert data-network="ارسال انجام نشد. اتصال اینترنت را بررسی کنید و دوباره روی «ثبت درخواست دسترسی» بزنید؛ اطلاعاتی که نوشته‌اید پاک نمی‌شود." data-server="مشکلی در سمت ما پیش آمد و درخواست ثبت نشد. چند دقیقه بعد دوباره امتحان کنید." data-rate="تعداد تلاش‌ها زیاد بود. حدود ۱۰ دقیقهٔ دیگر دوباره امتحان کنید؛ اطلاعاتی که نوشته‌اید پاک نمی‌شود."></p>
     <button class="btn btn-dark ea-submit" type="submit" data-label="ثبت درخواست دسترسی" data-busy="در حال ثبت…"><span class="spinner" aria-hidden="true"></span><span data-label>ثبت درخواست دسترسی</span><svg class="ico flip" aria-hidden="true"><use href="#i-arrow-ur"/></svg></button>
     <p class="ea-fine"><svg class="ico" aria-hidden="true"><use href="#i-lock"/></svg><span>اطلاعاتتان به کسی داده نمی‌شود و با پاسخ به هر ایمیل ما حذف می‌شود. عضویت به معنی پذیرش قطعی در پایلوت نیست.</span></p>
    </form>
   </div>
   <div class="ea-done" data-ea-done role="status" tabindex="-1" hidden>
    <span class="ok" aria-hidden="true"><svg class="ico"><use href="#i-check"/></svg></span>
    <h2 data-title-new>درخواست شما ثبت شد.</h2>
    <h2 data-title-dup hidden>این ایمیل از قبل در فهرست است.</h2>
    <p>به‌محض راه‌اندازی، پیام شروع را به <bdi dir="ltr" data-sent-email></bdi> و شمارهٔ <bdi dir="ltr" data-sent-mobile></bdi> می‌فرستیم. تا آن زمان کار دیگری لازم نیست.</p>
    <p data-dup hidden>اگر شماره یا نامتان را این بار کامل‌تر نوشتید، به اطلاعات قبلی اضافه شد.</p>
    <button class="btn btn-line" type="button" data-ea-close>بستن</button>
   </div>
  </div>
 </div>
</dialog>`;

export function initEarlyAccess({ source = 'header', triggers = '[data-ea]' } = {}) {
  if (typeof HTMLDialogElement !== 'function') return; // very old browsers keep the plain links
  document.body.insertAdjacentHTML('beforeend', markup());
  const dlg = document.getElementById('ea-dialog');
  const form = dlg.querySelector('form');
  const alertBox = form.querySelector('[data-form-alert]');
  const submit = form.querySelector('button[type="submit"]');
  const label = submit.querySelector('[data-label]');
  const formView = dlg.querySelector('[data-ea-form-view]');
  const done = dlg.querySelector('[data-ea-done]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const title = dlg.querySelector('#ea-title');
  title.tabIndex = -1;
  let opener = null;

  const rules = {
    name: v => { const t = v.trim(); return !t ? 'required' : t.length < 2 || t.length > 80 ? 'invalid' : null; },
    email: v => { const t = v.trim(); return !t ? 'required' : EMAIL_OK(t) ? null : 'invalid'; },
    mobile: v => { const t = cleanPhone(v); return !t ? 'required' : PHONE_OK(t) ? null : 'invalid'; },
    consent: (_, el) => el.checked ? null : 'required',
  };
  const fieldOf = n => form.elements[n]?.closest('.field, .consent');
  function mark(n, problem) {
    const el = form.elements[n], f = fieldOf(n), err = f?.querySelector('.err');
    if (err) err.textContent = problem ? (err.dataset[problem] || err.dataset.invalid || err.dataset.required || '') : '';
    f?.classList.toggle('has-error', !!problem);
    el.setAttribute('aria-invalid', String(!!problem));
    return !problem;
  }
  const check = n => { const el = form.elements[n]; return mark(n, rules[n](el.value ?? '', el)); };
  Object.keys(rules).forEach(n => {
    const el = form.elements[n];
    el.addEventListener('blur', () => { if (n !== 'consent' && el.value) check(n); });
    ['input', 'change'].forEach(t => el.addEventListener(t, () => { if (fieldOf(n)?.classList.contains('has-error')) check(n); }));
  });

  function open(e) {
    if (e) e.preventDefault();
    if (dlg.open) return;
    opener = document.activeElement;
    // a link inside the mobile menu disappears when the menu closes; return focus to the menu button instead
    if (opener && opener.closest && opener.closest('#mnav')) opener = document.getElementById('menuBtn') || opener;
    dlg.classList.remove('is-closing');
    dlg.showModal();
    document.documentElement.classList.add('ea-lock');
    // on touch screens do not pop the keyboard over the sheet; focus the heading instead
    const touch = matchMedia('(pointer: coarse)').matches;
    const first = !done.hidden ? done : touch ? title : form.elements.name;
    requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }
  function close() {
    if (!dlg.open || dlg.classList.contains('is-closing')) return;
    const finish = () => { dlg.classList.remove('is-closing'); dlg.close(); };
    if (reduce.matches) return finish();
    dlg.classList.add('is-closing');
    setTimeout(finish, 180);
  }
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('ea-lock');
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  });
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); }); // Esc: animate out
  // backdrop: only a click that also started on the backdrop (not a text selection dragged out of a field)
  let downOnBackdrop = false;
  dlg.addEventListener('pointerdown', e => { downOnBackdrop = e.target === dlg; });
  dlg.addEventListener('click', e => { if (e.target === dlg && downOnBackdrop) close(); downOnBackdrop = false; });
  dlg.querySelectorAll('[data-ea-close]').forEach(b => b.addEventListener('click', close));

  document.querySelectorAll(triggers).forEach(a => a.addEventListener('click', open));
  if (location.hash === '#ea') open();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    alertBox.classList.remove('is-on');
    alertBox.textContent = '';
    const bad = Object.keys(rules).filter(n => !check(n));
    if (bad.length) { form.elements[bad[0]].focus(); return; }
    const data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      mobile: cleanPhone(form.elements.mobile.value),
      consent: form.elements.consent.checked,
      website: form.elements.website.value,
      source,
      page: location.pathname,
    };
    form.classList.add('is-submitting');
    submit.disabled = true;
    label.textContent = submit.dataset.busy;
    try {
      const res = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json().catch(() => ({}));
      if (res.status === 422 && json.errors) {
        const keys = Object.keys(json.errors).filter(k => form.elements[k]);
        keys.forEach(k => mark(k, 'invalid'));
        form.elements[keys[0]]?.focus();
        if (keys.length) return;
      }
      if (!res.ok || !json.ok) throw Object.assign(new Error('failed'), { kind: res.status === 429 ? 'rate' : 'server' });
      done.querySelector('[data-dup]').hidden = !json.duplicate;
      done.querySelector('[data-title-new]').hidden = !!json.duplicate;
      done.querySelector('[data-title-dup]').hidden = !json.duplicate;
      done.querySelector('[data-sent-email]').textContent = data.email.toLowerCase();
      done.querySelector('[data-sent-mobile]').textContent = json.mobile || data.mobile;
      formView.hidden = true;
      done.hidden = false;
      dlg.classList.add('is-done');
      done.focus();
      try { window.dispatchEvent(new CustomEvent('ea:joined', { detail: { source } })); } catch {}
    } catch (err) {
      const kind = err?.kind || 'network';
      setTimeout(() => { alertBox.textContent = alertBox.dataset[kind] || alertBox.dataset.network; alertBox.classList.add('is-on'); }, 60);
    } finally {
      form.classList.remove('is-submitting');
      submit.disabled = false;
      label.textContent = submit.dataset.label;
    }
  });
  return { open, close };
}
