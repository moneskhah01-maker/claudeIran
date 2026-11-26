// Customer console (/app): the console.html concept, wired to the real API.
// Wrapped in a function so none of its names can collide with browser globals (window.top, window.screen...).
(() => {
'use strict';

const STATUS = { ok: 'تسویه‌شده', error: 'ناموفق', pending: 'در انتظار', paid: 'پرداخت‌شده', failed: 'ناموفق', rejected: 'ردشده', active: 'فعال', revoked: 'باطل‌شده' };
const KIND = { topup: 'افزایش اعتبار کیف پول', usage: 'تسویه درخواست API', adjustment: 'اصلاح اعتبار توسط پشتیبانی', refund: 'کسر/بازپرداخت توسط پشتیبانی' };
const modelLabel = id => state.ov?.models.find(m => m.id === id)?.label.replace('Claude ', '') || id;

/* ================= state ================= */
const state = { ov: null, view: 'overview', period: 7, query: '', filter: 'all', page: 1, perPage: 8, sort: { k: null, dir: 1 }, sel: {}, cache: {} };
const NAV = [
  ['overview', 'grid', 'نمای کلی'], ['usage', 'chart', 'گزارش مصرف'], ['keys', 'key', 'کلیدهای API'],
  ['requests', 'list', 'درخواست‌ها'], ['billing', 'wallet', 'کیف پول و مالی'], ['account', 'shield', 'حساب و امنیت'], ['docs', 'code', 'شروع سریع'],
];

/* ================= shared components (ui.js) ================= */
const ui = createUI({ state, rerender: () => rerender() });
const { byId, fmt, tmn, kfmt, jDate, jDay, jWd, dateOf, stamp, dayDate, phone, ago, ic, money, signedMoney, st,
  pwToggle, openModal, closeModal, openPop, closePop, confirmModal, head, tile, btn, tapPill, cardHead, chart, ktable, tools, matches, viewBtn, csv } = ui;
const figure = (label, rial, unit, onclick, cls) => ui.figure(label, rial, unit, onclick, cls, state.ov.upstream === 'mock' ? 'آزمایشی' : null);

/* ================= auth screen ================= */
let otpTimer = null;
function showAuth() {
  byId('dash').hidden = true;
  byId('auth').hidden = false;
  closeModal();
  let method = 'sms', mode = 'login', step = 'mobile', sentAt = 0, ttl = 120;
  pwToggle(byId('password'));

  document.querySelectorAll('[data-method]').forEach(b => b.onclick = () => {
    method = b.dataset.method;
    document.querySelectorAll('[data-method]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    byId('smsForm').hidden = method !== 'sms';
    byId('pwForm').hidden = method !== 'password';
    byId('authTitle').textContent = method === 'password' && mode === 'signup' ? 'ساخت حساب' : 'ورود به کنسول';
  });

  // --- SMS: mobile -> code (valid 2 minutes; a new one after 1 minute) -> name + terms for a new number ---
  const tick = () => {
    const left = Math.max(0, ttl - Math.floor((Date.now() - sentAt) / 1000));
    const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0');
    byId('otpMeta').classList.toggle('expired', left === 0);
    byId('otpLeft').replaceChildren(left ? h('span', null, 'اعتبار کد: ', h('span', { class: 'num' }, `${mm}:${ss}`)) : h('span', null, h('span', { class: 'num' }, 'کد منقضی شد'), ' — کد تازه بگیرید.'));
    byId('resend').hidden = Date.now() - sentAt < 60_000;
    if (!left) clearInterval(otpTimer);
  };
  const toStep = s => {
    step = s;
    byId('mobile').readOnly = s !== 'mobile';
    byId('codeBox').hidden = s === 'mobile';
    byId('smsNew').hidden = s !== 'name';
    byId('smsBackRow').hidden = s === 'mobile';
    byId('smsBtn').textContent = s === 'mobile' ? 'دریافت کد' : s === 'code' ? 'ورود' : 'ساخت حساب';
    if (s === 'mobile') clearInterval(otpTimer);
    (s === 'mobile' ? byId('mobile') : s === 'code' ? byId('code') : byId('smsName')).focus();
  };
  const requestCode = async () => {
    const r = await api('/api/auth/otp/request', { mobile: latin(byId('mobile').value) });
    if (!r.ok) { byId('smsErr').textContent = r.errors?.mobile ? 'شمارهٔ موبایل ایران را درست وارد کنید (۰۹…).' : errText(r); return false; }
    sentAt = Date.now(); ttl = r.ttl || 120;
    clearInterval(otpTimer); otpTimer = setInterval(tick, 1000); tick();
    byId('code').value = '';
    toast('کد پیامک شد');
    return true;
  };
  byId('resend').onclick = async () => { byId('smsErr').textContent = ''; if (await requestCode()) toStep('code'); };
  byId('smsBack').onclick = () => { byId('smsErr').textContent = ''; toStep('mobile'); };
  byId('smsForm').onsubmit = async e => {
    e.preventDefault();
    const b = byId('smsBtn'); b.disabled = true; byId('smsErr').textContent = '';
    try {
      if (step === 'mobile') { if (await requestCode()) toStep('code'); return; }
      const body = { mobile: latin(byId('mobile').value), code: latin(byId('code').value) };
      if (step === 'name') Object.assign(body, { name: byId('smsName').value, terms: byId('smsTerms').checked });
      const r = await api('/api/auth/otp/verify', body);
      if (r.needName) return toStep('name');
      if (!r.ok) { byId('smsErr').textContent = r.errors?.name ? 'نام را کامل وارد کنید.' : r.errors?.terms ? 'برای ساخت حساب، پذیرش قوانین لازم است.' : errText(r); return; }
      clearInterval(otpTimer);
      start();
    } finally { b.disabled = false; }
  };

  // --- password: log in with email or mobile, or create an account with email ---
  const setMode = m => {
    mode = m;
    const up = m === 'signup';
    byId('authTitle').textContent = up ? 'ساخت حساب' : 'ورود به کنسول';
    byId('nameField').hidden = !up; byId('termsRow').hidden = !up; byId('pwHint').hidden = !up;
    byId('identLbl').textContent = up ? 'ایمیل' : 'ایمیل یا شمارهٔ موبایل';
    byId('ident').type = up ? 'email' : 'text';
    byId('password').autocomplete = up ? 'new-password' : 'current-password';
    byId('pwBtn').textContent = up ? 'ساخت حساب' : 'ورود';
    byId('swapText').textContent = up ? 'حساب دارید؟' : 'حساب ندارید؟';
    byId('swapMode').textContent = up ? 'ورود' : 'ساخت حساب با ایمیل';
    byId('pwErr').textContent = '';
  };
  byId('swapMode').onclick = () => setMode(mode === 'login' ? 'signup' : 'login');
  byId('pwForm').onsubmit = async e => {
    e.preventDefault();
    const b = byId('pwBtn'); b.disabled = true; byId('pwErr').textContent = '';
    const up = mode === 'signup';
    const r = await api(up ? '/api/auth/signup' : '/api/auth/login', up
      ? { name: byId('name').value, email: byId('ident').value, password: byId('password').value, terms: byId('terms').checked }
      : { identifier: latin(byId('ident').value), password: byId('password').value });
    b.disabled = false;
    if (r.ok) return start();
    const f = r.errors || {};
    byId('pwErr').textContent = f.name ? 'نام را کامل وارد کنید.' : f.email ? 'ایمیل معتبر نیست.' : f.password ? 'رمز عبور باید دست‌کم ۱۰ نویسه باشد.' : f.terms ? 'برای ساخت حساب، پذیرش قوانین لازم است.' : errText(r);
  };
  setMode('login');
  toStep('mobile');
}


// terms & privacy reader (sign-up checkbox, footer, account menu)
function openLegal(which) {
  const render = k => openModal(legalView(k, render).concat(h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-dark', type: 'button', 'data-close': '' }, 'بستن'))), true);
  render(which);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-legal]'); if (b) { e.preventDefault(); closePop(); openLegal(b.dataset.legal); } });

/* ================= console shell ================= */
async function start() {
  const me = await api('/api/auth/me');
  if (!me.ok) return showAuth();
  const show = () => { byId('auth').hidden = true; byId('dash').hidden = false; };
  if (document.startViewTransition && !ui.reduced() && !byId('auth').hidden) document.startViewTransition(show); else show();
  byId('meBtn').textContent = me.user.name.trim().charAt(0); // one letter: two Persian initials often spell a word (م+ا = «ما»)
  window.onhashchange = () => go(location.hash.slice(1));
  go(location.hash.slice(1) || 'overview', true);
}

// The tab buttons are built once; later only aria-selected changes, so the white thumb can slide between tabs.
function renderTabs(instant) {
  const tabs = byId('tabs');
  if (!tabs.children.length) tabs.replaceChildren(...NAV.map(([k, icon, label]) => h('button', {
    class: 'tab', type: 'button', role: 'tab', 'data-view': k, onclick: () => { location.hash = k; },
  }, ic(icon), label)));
  for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.view === state.view));
  requestAnimationFrame(() => moveThumb(instant));
}
function moveThumb(instant) {
  const tabs = byId('tabs'), sel = tabs.querySelector('[aria-selected="true"]');
  if (!sel) return;
  tabs.classList.toggle('no-anim', !!instant);
  tabs.style.setProperty('--tx', sel.offsetLeft + 'px');
  tabs.style.setProperty('--tw', sel.offsetWidth + 'px');
}
addEventListener('resize', () => moveThumb(true));

async function go(view, first) {
  if (!NAV.some(n => n[0] === view)) view = 'overview';
  // navigating = a different tab (animated); otherwise it is a re-render of the same view after a filter/sort (instant)
  const navigating = view !== state.view || !!first;
  const idx = v => NAV.findIndex(n => n[0] === v);
  const dir = idx(view) >= idx(state.view) ? 'next' : 'prev';
  if (navigating) Object.assign(state, { query: '', filter: 'all', page: 1, sort: { k: null, dir: 1 } });
  state.view = view;
  if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
  closePop();
  renderTabs(!!first);
  if (navigating) ui.loading(true);
  const ov = await api('/api/app/overview');
  if (!ov.ok) ui.loading(false);
  if (ov.status === 401) return showAuth();
  if (!ov.ok) return toast(errText(ov));
  state.ov = ov;
  // mode pill + footer say plainly whether calls reach a model
  const mock = ov.upstream === 'mock';
  byId('modeText').textContent = mock ? 'حالت آزمایشی · پاسخ‌ها شبیه‌سازی‌اند' : 'سرویس فعال';
  byId('modePill').classList.toggle('live', !mock);
  byId('footNote').textContent = mock
    ? 'کنسول کلاود ایران · حالت آزمایشی: درخواست‌های API پاسخ شبیه‌سازی‌شده می‌گیرند؛ اعتبار، کلیدها و گزارش‌ها واقعی‌اند.'
    : 'کنسول کلاود ایران · مبالغ به تومان.';
  byId('bellBtn').classList.toggle('has', alerts().some(a => a.warn));
  const view$ = byId('view');
  const content = await VIEWS[view]();
  ui.loading(false);
  if (state.view !== view) return; // the user already moved to another tab while this one was loading
  await ui.swapView(view$, content, { animate: navigating, dir });
  if (navigating && !first) { view$.focus({ preventScroll: true }); scrollTo({ top: 0, behavior: ui.reduced() ? 'auto' : 'smooth' }); }
}
const rerender = () => go(state.view);

/* ---------- top bar ---------- */
byId('modePill').onclick = () => openModal([
  h('h2', { id: 'dlgTitle' }, state.ov.upstream === 'mock' ? 'حالت آزمایشی' : 'سرویس فعال'),
  h('p', { class: 'mnote' }, state.ov.upstream === 'mock'
    ? 'تا تأیید تأمین مجاز سرویس، درخواست‌های API به هیچ مدلی فرستاده نمی‌شوند و پاسخ شبیه‌سازی‌شده می‌گیرند. ثبت‌نام، کلیدها، اعتبار، رزرو و کسر هزینه و گزارش‌ها واقعی کار می‌کنند، پس می‌توانید یکپارچه‌سازی خود را از همین حالا بسازید و آزمایش کنید.'
    : 'درخواست‌ها به مدل ارسال و بر اساس تعرفه از اعتبار کسر می‌شوند.'),
  h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-dark', type: 'button', 'data-close': '' }, 'متوجه شدم')),
]);
byId('bellBtn').onclick = e => {
  const list = alerts();
  openPop(e.currentTarget, [h('h3', null, 'اعلان‌ها'), list.length ? list.map(a => h('button', { class: 'mi', type: 'button', onclick: () => { closePop(); a.go(); } },
    h('span', { class: 'itile' }, ic(a.ic)), h('span', null, h('b', null, a.h), h('small', null, a.p)), h('span', { class: 'end' }, ic('arrow-ur', 'flip')))) : h('p', { class: 'spot-empty' }, 'اعلانی نیست.')]);
};
byId('meBtn').onclick = e => {
  const u = state.ov.user;
  openPop(e.currentTarget, [
    h('div', { class: 'pop-id' }, h('span', { class: 'av' }, byId('meBtn').textContent), h('span', null, h('b', null, u.name), h('small', { class: 'en' }, u.email || phone(u.mobile)))),
    h('hr'),
    h('button', { class: 'mi', type: 'button', onclick: () => { closePop(); location.hash = 'account'; } }, ic('shield'), h('span', null, 'حساب و امنیت')),
    h('button', { class: 'mi', type: 'button', onclick: () => { closePop(); location.hash = 'billing'; } }, ic('wallet'), h('span', null, 'کیف پول و مالی')),
    h('button', { class: 'mi', type: 'button', 'data-legal': 'terms' }, ic('doc'), h('span', null, 'قوانین و حریم خصوصی')),
    h('hr'),
    h('button', { class: 'mi', type: 'button', onclick: logout }, ic('logout'), h('span', null, 'خروج')),
  ]);
};
async function logout() { closePop(); await api('/api/auth/logout', {}); history.replaceState(null, '', location.pathname); showAuth(); }

// window lights: minimise to the dock, full screen
byId('minBtn').onclick = () => { document.querySelector('.app').classList.add('min'); byId('dock').classList.add('on'); byId('dockBtn').tabIndex = 0; byId('dockBtn').focus(); };
byId('dockBtn').onclick = () => { document.querySelector('.app').classList.remove('min'); byId('dock').classList.remove('on'); byId('dockBtn').tabIndex = -1; };
byId('fullBtn').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {});

// Weekly spend: the last four weeks of real usage, current week highlighted.
function weeklyCard() {
  const days = state.ov.days.slice(-28);
  const weeks = [0, 1, 2, 3].map(w => days.slice(w * 7, w * 7 + 7).reduce((s, d) => s + Number(d.cost), 0));
  const mx = Math.max(1, ...weeks), s = state.week ?? 3;
  const L = ['۳ هفته پیش', '۲ هفته پیش', 'هفتهٔ گذشته', 'هفتهٔ جاری'];
  const total = weeks.reduce((a, b) => a + b, 0);
  return h('article', { class: 'card mini' },
    h('h2', null, 'هزینهٔ هفتگی'),
    h('div', { class: 'big num' }, tmn(weeks[s])), h('p', { class: 'sub' }, 'تومان · ', L[s]),
    h('div', { class: 'steps', role: 'group', 'aria-label': 'هزینهٔ هفتگی' }, weeks.map((v, i) => {
      const b = h('button', { type: 'button', class: i === 3 ? 'hi' : null, 'aria-pressed': String(i === s), 'aria-label': `${L[i]}: ${tmn(v)} تومان`, onclick: () => { state.week = i; rerender(); } },
        i === s ? h('span', { class: `pill ${i === 3 ? 'p' : 'dk'} num`, 'aria-hidden': 'true' }, total ? Math.round(v / total * 100) + '%' : '0%') : null);
      b.style.height = `${Math.max(12, v / mx * 86).toFixed(1)}%`;
      return b;
    })),
    h('div', { class: 'legend' }, h('span', null, h('i', { class: 'p' }), L[s]), h('span', { class: 'num' }, tmn(weeks[s]))));
}

// Credit allocation gauge: of everything ever credited, how much is used, reserved, still free.
function gaugeCard() {
  const o = state.ov, credited = Math.max(1, o.money.credited);
  const pct = v => +Math.min(100, Math.max(0, v / credited * 100)).toFixed(1);
  const V = { used: pct(o.money.used), reserved: pct(o.held), free: pct(o.available) };
  const g = state.gsel || 'free';
  const L = { used: ['مصرف‌شده', 'اعتبار مصرف‌شده'], reserved: ['رزرو', 'رزرو موقت · در انتظار تسویه'], free: ['آزاد', 'اعتبار قابل استفاده'] };
  const NS = 'http://www.w3.org/2000/svg', arc = 'M14 104a86 86 0 0 1 172 0';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 116'); svg.setAttribute('aria-hidden', 'true');
  const path = (k, attrs) => {
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', arc); p.setAttribute('fill', 'none'); p.dataset.gsel = k;
    for (const [a, v] of Object.entries(attrs)) p.setAttribute(a, v);
    p.addEventListener('click', () => { state.gsel = k; rerender(); });
    svg.append(p);
  };
  const sw = k => g === k ? 11 : 8;
  path('free', { stroke: g === 'free' ? '#767C89' : '#3A404C', 'stroke-width': sw('free'), 'stroke-linecap': 'round' });
  path('used', { stroke: '#D97757', 'stroke-width': sw('used'), 'stroke-linecap': 'round', pathLength: 100, 'stroke-dasharray': `${V.used} 100`, opacity: g === 'used' || g === 'free' ? 1 : .45 });
  path('reserved', { stroke: '#8A8D95', 'stroke-width': sw('reserved'), pathLength: 100, 'stroke-dasharray': `0 ${V.used + .6} ${V.reserved} 100`, opacity: g === 'reserved' ? 1 : .6 });
  return h('article', { class: 'card gauge mini' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', null, 'توزیع اعتبار'), h('p', { class: 'sub' }, 'از کل اعتبار شارژشده'))),
    h('div', { class: 'big num' }, `${V[g]}%`), h('p', { class: 'sub' }, L[g][1]), svg,
    h('div', { class: 'legend' }, ['used', 'reserved', 'free'].map(k => {
      const dot = h('i', { class: k === 'used' ? 'p' : null });
      if (k === 'reserved') dot.style.background = '#8A8D95';
      return h('button', { type: 'button', 'aria-pressed': String(g === k), onclick: () => { state.gsel = k; rerender(); } }, dot, L[k][0]);
    })));
}

// Terracotta card: share of credited money already spent.
function capCard() {
  const o = state.ov, used = o.money.used, credited = o.money.credited;
  const p = credited ? Math.min(100, Math.round(used / credited * 100)) : 0;
  const bar = h('span'); bar.style.width = p + '%';
  const goBilling = () => { location.hash = 'billing'; };
  return h('article', { class: 'cap tap', role: 'button', tabindex: 0, onclick: goBilling, onkeydown: e => { if (e.key === 'Enter') goBilling(); }, 'aria-label': 'مصرف از اعتبار؛ رفتن به کیف پول' },
    h('span', { class: 'title' }, 'مصرف از اعتبار'),
    h('div', { class: 'big' }, h('span', { class: 'num' }, p + '%'), h('small', null, 'مصرف شده')),
    h('div', { class: 'progress', 'aria-hidden': 'true' }, bar),
    h('div', { class: 'pfoot' }, h('span', null, 'مصرف‌شده: ', h('span', { class: 'num' }, tmn(used))), h('span', null, 'کل شارژ: ', h('span', { class: 'num' }, tmn(credited)), ' تومان')),
    h('p', null, 'پیش از هر درخواست، حداکثر هزینهٔ آن رزرو می‌شود و پس از پاسخ فقط هزینهٔ واقعی کسر می‌شود.'));
}

// Alerts, derived from the account's real state.
function alerts() {
  const o = state.ov, list = [];
  const goTo = v => () => { location.hash = v; };
  if (o.upstream === 'mock') list.push({ ic: 'alert', h: 'حالت آزمایشی', p: 'پاسخ‌های API شبیه‌سازی‌اند', go: () => byId('modePill').click() });
  if (o.payments.pending) list.push({ ic: 'clock', h: `${o.payments.pending} شارژ در انتظار بررسی`, p: 'پس از تأیید واریز، اعتبار افزوده می‌شود', go: goTo('billing'), warn: true });
  if (o.money.credited && o.available < 500_000) list.push({ ic: 'down', h: 'اعتبار رو به پایان است', p: `موجودی: ${tmn(o.available)} تومان`, go: goTo('billing'), warn: true });
  if (!o.money.credited) list.push({ ic: 'wallet', h: 'اعتبار حساب صفر است', p: 'برای ارسال درخواست، حساب را شارژ کنید', go: goTo('billing'), warn: true });
  if (o.stats.failed24) list.push({ ic: 'alert', h: `${o.stats.failed24} درخواست ناموفق در ۲۴ ساعت`, p: 'هزینه‌ای بابت آن‌ها کسر نشده است', go: goTo('requests'), warn: true });
  if (!Number(o.activeKeys)) list.push({ ic: 'key', h: 'هنوز کلید API فعالی ندارید', p: 'برای شروع یک کلید بسازید', go: goTo('keys') });
  if (!o.user.hasPassword) list.push({ ic: 'lock', h: 'رمز عبور تعیین نشده', p: 'برای ورود بدون پیامک، رمز بگذارید', go: goTo('account') });
  return list;
}
function alertsCard() {
  const list = alerts();
  return h('article', { class: 'alerts', 'aria-label': 'هشدارها' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'هشدارها'), h('p', { class: 'sub' }, list.length ? `${list.length} مورد` : 'همه چیز مرتب است'))),
    list.length ? list.map(a => h('div', { class: 'arow tap-row', role: 'button', tabindex: 0, onclick: a.go, onkeydown: e => { if (e.key === 'Enter') a.go(); } },
      h('span', { class: 'itile' }, ic(a.ic)), h('div', null, h('h3', null, a.h, a.warn ? h('span', { class: 'unread', 'aria-hidden': 'true' }) : null), h('p', null, a.p)),
      h('span', { class: 'when' }, ic('arrow-ur', 'flip')))) : h('div', { class: 'state' }, h('span', { class: 'itile' }, ic('check-sq')), h('h3', null, 'هشداری نیست')));
}

async function load(name, path) { const r = await api(path); state.cache[name] = r; return r; }

/* ================= views ================= */
function overview() {
  const o = state.ov, s = o.stats;
  const chartCard = h('article', { class: 'card' },
    cardHead('روند مصرف API', '۳۰ روز گذشته · توکن خروجی', tapPill('گزارش کامل', () => { location.hash = 'usage'; })),
    chart('overview', o.days, 'output', 'توکن', 170, 'نمودار توکن خروجی در ۳۰ روز گذشته'));
  const recent = h('section', { class: 'tbl-card' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'درخواست‌های اخیر'), h('p', { class: 'sub' }, 'پنج درخواست آخر · برای جزئیات روی ردیف بزنید')),
      btn('مشاهده همه', null, () => { location.hash = 'requests'; }, 'btn-line')),
    ktable({ all: 1, row: reqModal, rows: o.recent, empty: 'هنوز درخواستی نفرستاده‌اید', cols: [
      { k: 'i', label: 'شناسه', cell: r => h('span', { class: 'id' }, `req_${r.id}`) },
      { k: 'm', label: 'مدل', cell: r => h('span', { class: 'id' }, modelLabel(r.model)) },
      { k: 'c', label: 'هزینه', num: 1, cell: r => money(r.cost) },
      { k: 'st', label: 'وضعیت', cls: 'lead2', cell: r => st(r.status, STATUS[r.status]) },
    ], note: 'مبالغ به تومان · هر کسر با شناسهٔ درخواست قابل پیگیری است.' }));
  return [
    head('OVERVIEW · نمای کلی', 'نمای کلی', 'وضعیت حساب، هزینه‌ها و درخواست‌ها در یک نگاه', [
      btn('۳۰ روز گذشته', 'clock', () => { state.period = 30; location.hash = 'usage'; }),
      btn('ساخت کلید', 'plus', keyModal, 'btn-dark'),
    ]),
    h('div', { class: 'grid-main' },
      h('div', { class: 'stack' },
        figure('اعتبار قابل استفاده', o.available, 'تومان · رفتن به کیف پول', () => { location.hash = 'billing'; }),
        h('div', { class: 'tiles' },
          tile(tmn(s.spend7), 'هزینهٔ ۷ روز · تومان', null, () => { location.hash = 'billing'; }),
          tile(String(o.activeKeys).padStart(2, '0'), 'کلیدهای API فعال', null, () => { location.hash = 'keys'; }),
          tile(fmt(s.req7), 'درخواست · ۷ روز', null, () => { location.hash = 'requests'; }),
          tile(s.latency ? (s.latency / 1000).toFixed(1) + 's' : '—', 'میانگین زمان پاسخ', null, () => { location.hash = 'usage'; })),
        chartCard),
      h('div', { class: 'stack' }, h('div', { class: 'tiles two' }, weeklyCard(), gaugeCard()), alertsCard())),
    recent,
  ];
}

async function usage() {
  const o = state.ov, r = await load('usage', '/api/app/usage');
  const days = o.days.slice(-state.period);
  const since = Date.now() - state.period * 86400_000;
  const rows = (r.rows || []).filter(u => new Date(u.created_at) > since);
  const total = days.reduce((a, d) => a + Number(d.requests), 0);
  const byKey = {};
  for (const u of rows) {
    const name = u.key_name || '—';
    const k = byKey[name] || (byKey[name] = { name, prefix: u.key_prefix, req: 0, tin: 0, tout: 0, cost: 0, err: 0 });
    k.req++; k.tin += u.input_tokens; k.tout += u.output_tokens; k.cost += u.cost; if (u.status === 'error') k.err++;
  }
  const sum = f => rows.reduce((a, u) => a + (Number(u[f]) || 0), 0);
  const okRows = rows.filter(u => u.status === 'ok' && u.latency_ms != null);
  const lat = okRows.length ? okRows.reduce((a, u) => a + u.latency_ms, 0) / okRows.length : 0;
  return [
    head('USAGE · گزارش مصرف', 'گزارش مصرف', 'درخواست‌ها، توکن‌ها و هزینه در بازهٔ انتخابی', [
      h('div', { class: 'fpills', role: 'group', 'aria-label': 'بازهٔ زمانی' }, [[7, '۷ روز'], [30, '۳۰ روز']].map(([p, l]) =>
        h('button', { type: 'button', 'aria-pressed': String(state.period === p), onclick: () => { state.period = p; delete state.sel.usage; rerender(); } }, l))),
    ]),
    h('div', { class: 'grid-main split-a' }, capCard(),
      h('article', { class: 'card' },
        h('div', { class: 'card-head' }, h('div', null, h('p', { class: 'sub m0' }, 'درخواست‌های ثبت‌شده'), h('div', { class: 'bigline' }, h('strong', { class: 'num' }, fmt(total)), h('span', { class: 'sub' }, 'درخواست موفق'))),
          tapPill(state.period === 7 ? '۷ روز اخیر' : '۳۰ روز اخیر', () => { location.hash = 'requests'; })),
        chart('usage', days, 'requests', 'درخواست', 200, 'نمودار تعداد درخواست‌ها'))),
    h('div', { class: 'tiles t3 mt12' },
      tile(kfmt(sum('input_tokens')), 'توکن ورودی'), tile(kfmt(sum('output_tokens')), 'توکن خروجی'), tile(lat ? (lat / 1000).toFixed(1) + 's' : '—', 'میانگین زمان پاسخ')),
    h('section', { class: 'tbl-card' },
      h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'مصرف به تفکیک کلید'), h('p', { class: 'sub' }, 'مرتب‌سازی با کلیک روی سرستون'))),
      ktable({ all: 1, rows: Object.values(byKey), empty: 'در این بازه درخواستی نیست', cols: [
        { k: 'n', label: 'کلید', sort: k => k.name, cell: k => h('span', { class: 'pc' }, k.name) },
        { k: 'p', label: 'شناسه', cell: k => h('span', { class: 'id' }, k.prefix ? k.prefix + '…' : '—') },
        { k: 'r', label: 'درخواست', num: 1, sort: k => k.req, cell: k => h('span', { class: 'num' }, fmt(k.req)) },
        { k: 't', label: 'توکن ورودی / خروجی', num: 1, sort: k => k.tin + k.tout, cell: k => h('span', { class: 'num' }, `${kfmt(k.tin)} / ${kfmt(k.tout)}`) },
        { k: 'c', label: 'هزینه', num: 1, sort: k => k.cost, cell: k => money(k.cost) },
        { k: 'e', label: 'ناموفق', cls: 'lead2', cell: k => k.err ? st('error', fmt(k.err)) : st('ok', '0') },
      ], note: 'هزینه‌ها پس از تسویه با مصرف واقعی ثبت می‌شوند.' })),
  ];
}

async function keys() {
  const r = await load('keys', '/api/app/keys');
  const all = (r.keys || []).map(k => ({ ...k, status: k.revoked_at ? 'revoked' : 'active' }));
  const rows = all.filter(k => matches(k.status, `${k.name} ${k.prefix}`));
  return [
    head('API KEYS · کلیدها', 'کلیدهای API', 'ساخت، ردیابی و ابطال کلیدهای دسترسی', [btn('ساخت کلید', 'plus', keyModal, 'btn-dark')]),
    h('article', { class: 'card card-w note-card' },
      h('div', { class: 'l' }, h('span', { class: 'itile' }, ic('lock')), h('div', null, h('h2', null, 'نکتهٔ امنیتی'), h('p', null, 'رشتهٔ کامل کلید فقط یک‌بار، هنگام ساخت، نمایش داده می‌شود. کلید را در کد سمت مرورگر نگذارید.'))),
      h('span', { class: 'pill soft' }, `${all.filter(k => k.status === 'active').length} کلید فعال`)),
    h('section', { class: 'tbl-card' },
      tools('جست‌وجو بر اساس نام یا شناسه', [['all', 'همه'], ['active', 'فعال'], ['revoked', 'باطل‌شده']],
        h('button', { class: 'btn btn-line', type: 'button', onclick: () => csv('claudeiran-keys.csv', ['name', 'prefix', 'created', 'last_used', 'status'], all.map(k => [k.name, k.prefix, k.created_at, k.last_used_at, k.status])) }, ic('download'), 'CSV')),
      ktable({ rows, row: keyDetail, empty: all.length ? 'کلیدی پیدا نشد' : 'هنوز کلیدی نساخته‌اید', cols: [
        { k: 'n', label: 'عنوان کلید', sort: k => k.name, cell: k => h('span', { class: 'pc' }, k.name) },
        { k: 't', label: 'شناسهٔ پنهان', cell: k => h('span', { class: 'id' }, k.prefix + '••••') },
        { k: 'c', label: 'تاریخ ساخت', num: 1, sort: k => k.created_at, cell: k => h('span', { class: 'num dim' }, dateOf(k.created_at)) },
        { k: 'l', label: 'آخرین استفاده', sort: k => k.last_used_at || '', cell: k => h('span', { class: 'dim' }, ago(k.last_used_at)) },
        { k: 'st', label: 'وضعیت', cls: 'lead2', cell: k => st(k.status, STATUS[k.status]) },
        { k: 'a', label: 'عملیات', cls: 'act', cell: k => k.status === 'active' ? h('button', { class: 'rowbtn', type: 'button', onclick: () => revokeKey(k) }, 'ابطال') : h('span', { class: 'dim' }, '—') },
      ], note: 'ابطال فوری است و برنامه‌هایی که از آن کلید استفاده می‌کنند بلافاصله از کار می‌افتند.' })),
  ];
}
function keyModal() {
  const name = h('input', { id: 'kName', required: true, maxlength: 60, placeholder: 'مثلاً Production · Support' });
  const err = h('p', { class: 'err-line', role: 'alert' });
  openModal([
    h('h2', { id: 'dlgTitle' }, 'ساخت کلید API'), h('p', { class: 'sub' }, 'کلید به اعتبار همین حساب متصل است.'),
    h('form', { onsubmit: async e => {
      e.preventDefault();
      const r = await api('/api/app/keys', { name: name.value });
      if (!r.ok) { err.textContent = errText(r); return; }
      keyShown(r.key.name, r.secret);
    } }, h('div', { class: 'field' }, h('label', { for: 'kName' }, 'عنوان کلید'), name, h('span', { class: 'hint' }, 'برای تشخیص کلیدها؛ مثلاً نام سرور یا پروژه.')), err,
      h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-dark', type: 'submit' }, 'ساخت کلید'), h('button', { class: 'btn btn-line', type: 'button', 'data-close': '' }, 'انصراف'))),
  ]);
}
function keyShown(name, secret) {
  const copyBtn = h('button', { class: 'btn', type: 'button', onclick: () => copy(secret) }, ic('copy'), 'کپی');
  byId('dlgBody').replaceChildren(
    h('h2', { id: 'dlgTitle' }, 'کلید ساخته شد'), h('p', { class: 'sub' }, name),
    h('div', { class: 'keybox' }, h('code', null, secret), copyBtn),
    h('div', { class: 'warn' }, ic('alert'), h('div', null, h('strong', null, 'این کلید فقط همین یک‌بار نمایش داده می‌شود.'), h('br'), 'آن را در جای امن (مثلاً متغیر محیطی سرور) نگه دارید.')),
    h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-dark', type: 'button', onclick: () => { closeModal(); if (location.hash === '#keys') rerender(); else location.hash = 'keys'; } }, 'ذخیره کردم')));
  copyBtn.focus();
}
function keyDetail(k) {
  openModal([
    h('h2', { id: 'dlgTitle' }, k.name), h('p', { class: 'sub' }, st(k.status, STATUS[k.status])),
    h('dl', { class: 'dl' },
      h('div', null, h('dt', null, 'شناسهٔ پنهان'), h('dd', { class: 'id' }, k.prefix + '••••')),
      h('div', null, h('dt', null, 'تاریخ ساخت'), h('dd', { class: 'num' }, stamp(k.created_at))),
      h('div', null, h('dt', null, 'آخرین استفاده'), h('dd', null, k.last_used_at ? stamp(k.last_used_at) : 'هرگز')),
      h('div', null, h('dt', null, 'تاریخ ابطال'), h('dd', null, k.revoked_at ? stamp(k.revoked_at) : '—'))),
    h('div', { class: 'f-actions' },
      k.status === 'active' ? h('button', { class: 'btn btn-dark', type: 'button', onclick: () => revokeKey(k) }, 'ابطال کلید') : null,
      h('button', { class: 'btn btn-line', type: 'button', 'data-close': '' }, 'بستن')),
  ]);
}
async function revokeKey(k) {
  if (!await confirmModal({ title: 'ابطال کلید', text: `کلید «${k.name}» باطل شود؟ برنامه‌هایی که از آن استفاده می‌کنند فوراً از کار می‌افتند. این کار برگشت‌پذیر نیست.`, action: 'ابطال کلید', danger: true })) return;
  const r = await api('/api/app/keys/revoke', { id: k.id });
  if (!r.ok) return toast(errText(r));
  closeModal(); toast('کلید باطل شد'); rerender();
}

async function requests() {
  const r = await load('usage', '/api/app/usage');
  const all = r.rows || [];
  const rows = all.filter(u => matches(u.status, `req_${u.id} ${u.model} ${u.key_name || ''}`));
  return [
    head('REQUESTS · درخواست‌ها', 'درخواست‌ها', 'ردیابی هر درخواست، توکن‌ها، رزرو و تسویه', [
      h('button', { class: 'btn btn-line', type: 'button', onclick: () => csv('claudeiran-requests.csv', ['id', 'time', 'model', 'key', 'input_tokens', 'output_tokens', 'cost_rial', 'status'], all.map(u => [`req_${u.id}`, u.created_at, u.model, u.key_name, u.input_tokens, u.output_tokens, u.cost, u.status])) }, ic('download'), 'CSV'),
    ]),
    h('section', { class: 'tbl-card' },
      tools('شناسهٔ درخواست، مدل یا کلید', [['all', 'همه'], ['ok', 'تسویه‌شده'], ['error', 'ناموفق']]),
      ktable({ rows, row: reqModal, empty: all.length ? 'درخواستی پیدا نشد' : 'هنوز درخواستی ثبت نشده است', cols: [
        { k: 'i', label: 'شناسهٔ درخواست', sort: u => u.id, cell: u => h('span', { class: 'id' }, `req_${u.id}`) },
        { k: 'k', label: 'کلید', cell: u => u.key_name || '—' },
        { k: 'm', label: 'مدل', cell: u => h('span', { class: 'id' }, modelLabel(u.model)) },
        { k: 'tk', label: 'توکن ورودی / خروجی', num: 1, sort: u => u.input_tokens, cell: u => h('span', { class: 'num' }, u.input_tokens ? `${fmt(u.input_tokens)} / ${fmt(u.output_tokens)}` : '—') },
        { k: 'c', label: 'هزینه', num: 1, sort: u => u.cost, cell: u => money(u.cost) },
        { k: 'tm', label: 'زمان', sort: u => u.created_at, cell: u => h('span', { class: 'dim num' }, stamp(u.created_at)) },
        { k: 'st', label: 'وضعیت', cls: 'lead2', cell: u => st(u.status, STATUS[u.status]) },
        { k: 'a', label: 'جزئیات', cls: 'act', cell: u => viewBtn(() => reqModal(u)) },
      ], note: 'هر درخواست یک شناسه دارد؛ همین شناسه در گردش حساب کیف پول آمده است.' })),
  ];
}
function reqModal(u) {
  const released = Math.max(0, (u.hold || 0) - u.cost);
  openModal([
    h('h2', { id: 'dlgTitle' }, h('span', { class: 'id' }, `req_${u.id}`)), h('p', { class: 'sub' }, stamp(u.created_at), ' · ', st(u.status, STATUS[u.status])),
    h('div', { class: 'mbig' }, h('span', { class: 'num' }, tmn(u.cost)), ' ', h('small', null, 'تومان هزینهٔ نهایی')),
    h('dl', { class: 'dl' },
      h('div', null, h('dt', null, 'مدل'), h('dd', { class: 'id' }, u.model)),
      h('div', null, h('dt', null, 'کلید'), h('dd', null, u.key_name || '—')),
      h('div', null, h('dt', null, 'توکن ورودی'), h('dd', { class: 'num' }, fmt(u.input_tokens))),
      h('div', null, h('dt', null, 'توکن خروجی'), h('dd', { class: 'num' }, fmt(u.output_tokens))),
      u.hold != null ? h('div', null, h('dt', null, 'رزرو پیش از ارسال'), h('dd', null, money(u.hold))) : null,
      u.hold != null ? h('div', null, h('dt', null, 'آزادشده پس از تسویه'), h('dd', null, money(released))) : null,
      h('div', null, h('dt', null, 'زمان پاسخ'), h('dd', { class: 'num' }, u.latency_ms != null ? (u.latency_ms / 1000).toFixed(2) + 's' : '—')),
      h('div', null, h('dt', null, 'وضعیت'), h('dd', null, STATUS[u.status]))),
    u.error ? h('div', { class: 'warn' }, ic('alert'), h('div', null, h('strong', null, 'خطا: '), u.error, h('br'), 'بابت این درخواست هزینه‌ای کسر نشد.')) : null,
    h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-dark', type: 'button', 'data-close': '' }, 'بستن')),
  ]);
}

async function billing() {
  const o = state.ov;
  const [l, p] = await Promise.all([load('ledger', '/api/app/ledger'), load('payments', '/api/app/payments')]);
  state.payInfo = p.info;
  const result = new URLSearchParams(location.search).get('pay');
  if (result) {
    history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(() => toast(result === 'paid' ? 'پرداخت تأیید شد و اعتبار افزوده شد' : result === 'pending' ? 'نتیجهٔ پرداخت هنوز از درگاه نرسیده؛ به‌زودی بررسی می‌شود' : 'پرداخت انجام نشد و اعتباری کسر نشد'), 300);
  }
  const all = l.rows || [];
  const rows = all.filter(x => matches(x.kind, `tx_${x.id} ${KIND[x.kind]} ${x.ref || ''} ${x.note || ''}`));
  const pays = p.rows || [];
  return [
    head('BILLING · مالی', 'کیف پول و امور مالی', 'موجودی، رزرو اعتبار و ریز تراکنش‌ها', [
      h('button', { class: 'btn btn-line', type: 'button', onclick: () => csv('claudeiran-statement.csv', ['id', 'date', 'type', 'amount_rial', 'ref'], all.map(x => [`tx_${x.id}`, x.created_at, x.kind, x.amount, x.ref])) }, ic('download'), 'دریافت گردش حساب'),
      btn('افزایش اعتبار', 'plus', topupModal, 'btn-dark'),
    ]),
    h('div', { class: 'grid-main' },
      h('article', { class: 'card card-w glow-card' }, h('div', { class: 'blob' }),
        figure('موجودی قابل استفاده', o.available, 'تومان · برای افزایش اعتبار بزنید', topupModal, 'flat'),
        h('div', { class: 'tiles t3 mt12' },
          tile(tmn(o.held), 'رزرو موقت · در انتظار تسویه'),
          tile(tmn(o.stats.spend30), 'هزینهٔ ۳۰ روز اخیر'),
          tile(String(o.payments.pending), 'شارژ در انتظار بررسی', null, o.payments.pending ? () => byId('paysCard')?.scrollIntoView({ behavior: 'smooth' }) : null))),
      capCard()),
    h('section', { class: 'tbl-card' },
      tools('جست‌وجو در تراکنش‌ها', [['all', 'همه'], ['topup', 'شارژ'], ['usage', 'مصرف']]),
      ktable({ rows, row: txModal, empty: all.length ? 'تراکنشی پیدا نشد' : 'هنوز تراکنشی ندارید', cols: [
        { k: 'i', label: 'شناسه تراکنش', sort: x => x.id, cell: x => h('span', { class: 'id' }, `tx_${x.id}`) },
        { k: 'd', label: 'شرح', cell: x => h('span', { class: 'pc' }, KIND[x.kind]) },
        { k: 'dt', label: 'تاریخ', num: 1, sort: x => x.created_at, cell: x => h('span', { class: 'num dim' }, stamp(x.created_at)) },
        { k: 'a', label: 'مبلغ', num: 1, sort: x => x.amount, cell: x => signedMoney(x.amount) },
        { k: 'st', label: 'وضعیت', cls: 'lead2', cell: () => st('settled', 'تسویه‌شده') },
        { k: 'r', label: 'جزئیات', cls: 'act', cell: x => x.ref?.startsWith('usage:') ? h('button', { class: 'rowbtn', type: 'button', onclick: () => openReq(x.ref.slice(6)) }, 'پیگیری درخواست', ic('arrow-ur', 'flip')) : viewBtn(() => txModal(x)) },
      ], note: 'هر کسر با شناسهٔ درخواست قابل پیگیری است.' })),
    h('section', { class: 'tbl-card', id: 'paysCard' },
      h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'درخواست‌های شارژ'), h('p', { class: 'sub' }, 'کارت‌به‌کارت پس از بررسی واریز، درگاه پس از تأیید بانک')),
        btn('افزایش اعتبار', 'plus', topupModal, 'btn-line')),
      ktable({ all: 1, rows: pays, empty: 'هنوز شارژی نداشته‌اید', cols: [
        { k: 'i', label: 'شناسه', cell: x => h('span', { class: 'id' }, `pay_${x.id}`) },
        { k: 'm', label: 'روش', cell: x => PROVIDER_FA[x.provider] },
        { k: 'a', label: 'مبلغ', num: 1, cell: x => money(x.amount) },
        { k: 'd', label: 'تاریخ', cell: x => h('span', { class: 'num dim' }, stamp(x.created_at)) },
        { k: 'r', label: 'پیگیری', cell: x => h('span', { class: 'dim' }, x.status === 'rejected' && x.note ? `ردشده: ${x.note}` : x.ref_id || x.receipt || '—') },
        { k: 'st', label: 'وضعیت', cls: 'lead2', cell: x => st(x.status, STATUS[x.status]) },
      ], note: 'اگر درخواستی رد شود، دلیل آن در ستون پیگیری می‌آید.' })),
  ];
}
async function openReq(id) {
  const r = state.cache.usage?.rows ? state.cache.usage : await load('usage', '/api/app/usage');
  const u = (r.rows || []).find(x => String(x.id) === String(id));
  if (u) reqModal(u); else toast('درخواست پیدا نشد');
}
function txModal(x) {
  openModal([
    h('h2', { id: 'dlgTitle' }, KIND[x.kind]), h('p', { class: 'sub' }, h('span', { class: 'id' }, `tx_${x.id}`), ' · ', stamp(x.created_at)),
    h('div', { class: 'mbig' }, h('span', { class: 'num' }, (x.amount > 0 ? '+' : '−') + tmn(Math.abs(x.amount))), ' ', h('small', null, 'تومان')),
    h('dl', { class: 'dl' },
      h('div', null, h('dt', null, 'نوع'), h('dd', null, KIND[x.kind])),
      h('div', null, h('dt', null, 'مرجع'), h('dd', { class: 'id' }, x.ref || '—')),
      x.note ? h('div', null, h('dt', null, 'توضیح'), h('dd', null, x.note === 'manual' ? 'کارت‌به‌کارت' : x.note === 'zarinpal' ? 'زرین‌پال' : x.note)) : null),
    h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-dark', type: 'button', 'data-close': '' }, 'بستن')),
  ]);
}
function topupModal() {
  const info = state.payInfo || { min: 1_000_000, max: 1_000_000_000, manual: { enabled: true, instructions: '' }, zarinpal: { enabled: false } };
  let method = info.zarinpal.enabled ? 'zarinpal' : 'manual';
  const amounts = [500_000, 1_000_000, 2_000_000, 5_000_000];
  const custom = h('input', { id: 'tCustom', inputmode: 'numeric', dir: 'ltr', placeholder: 'مبلغ دلخواه به تومان' });
  const chips = h('fieldset', { class: 'chips' }, h('legend', { class: 'sr-only' }, 'مبلغ به تومان'),
    amounts.map((v, i) => h('label', { class: 'chip' }, h('input', { type: 'radio', name: 'amt', value: v, checked: i === 1, onchange: () => { custom.value = ''; } }), h('span', { class: 'num' }, fmt(v)))));
  custom.addEventListener('input', () => { chips.querySelectorAll('input').forEach(i => { i.checked = false; }); });
  const receipt = h('input', { id: 'tReceipt', maxlength: 200, placeholder: 'شمارهٔ پیگیری یا ۴ رقم آخر کارت و ساعت واریز' });
  const manualBox = h('div', null,
    h('div', { class: 'warn' }, ic('wallet'), h('div', null, h('strong', null, 'اطلاعات واریز'), h('br'), info.manual.instructions || 'اطلاعات حساب برای واریز هنوز ثبت نشده است؛ با پشتیبانی تماس بگیرید.')),
    h('div', { class: 'field' }, h('label', { for: 'tReceipt' }, 'اطلاعات واریز شما'), receipt, h('span', { class: 'hint' }, 'پس از بررسی و تأیید واریز، اعتبار افزوده می‌شود.')));
  const methods = h('div', { class: 'fpills', role: 'group', 'aria-label': 'روش پرداخت' },
    info.zarinpal.enabled ? h('button', { type: 'button', 'data-m': 'zarinpal' }, 'درگاه زرین‌پال' + (info.zarinpal.sandbox ? ' (آزمایشی)' : '')) : null,
    h('button', { type: 'button', 'data-m': 'manual' }, 'کارت‌به‌کارت'));
  const sync = () => { methods.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === method))); manualBox.hidden = method !== 'manual'; };
  methods.onclick = e => { const b = e.target.closest('button'); if (b) { method = b.dataset.m; sync(); } };
  sync();
  const err = h('p', { class: 'err-line', role: 'alert' });
  const submit = h('button', { class: 'btn btn-dark', type: 'submit' }, 'ادامه');
  openModal([
    h('h2', { id: 'dlgTitle' }, 'افزایش اعتبار'), h('p', { class: 'sub' }, `مبالغ به تومان · از ${tmn(info.min)} تا ${tmn(info.max)}`),
    h('form', { onsubmit: async e => {
      e.preventDefault(); err.textContent = '';
      const picked = chips.querySelector('input:checked')?.value;
      const toman = Number(latin(custom.value).replace(/[^\d]/g, '')) || Number(picked) || 0;
      submit.disabled = true;
      const r = await api('/api/app/topup', { method, amount: toman * 10, receipt: receipt.value }); // the API takes Rial
      submit.disabled = false;
      if (!r.ok) { err.textContent = r.error === 'bad_amount' ? `مبلغ باید بین ${tmn(info.min)} و ${tmn(info.max)} تومان باشد.` : errText(r); return; }
      if (r.redirect) { location.assign(r.redirect); return; }
      closeModal(); toast('درخواست ثبت شد و پس از بررسی، اعتبار افزوده می‌شود'); rerender();
    } },
      chips, h('div', { class: 'field' }, h('label', { for: 'tCustom' }, 'یا مبلغ دلخواه'), custom),
      h('div', { class: 'field' }, h('label', null, 'روش پرداخت'), methods), manualBox, err,
      h('div', { class: 'f-actions' }, submit, h('button', { class: 'btn btn-line', type: 'button', 'data-close': '' }, 'انصراف'))),
  ]);
}

function account() {
  const u = state.ov.user;
  const pwField = (id, label, ac) => {
    const input = h('input', { id, type: 'password', autocomplete: ac, dir: 'ltr' });
    const f = h('div', { class: 'field' }, h('label', { for: id }, label), h('div', { class: 'pw' }, input));
    pwToggle(input);
    return [f, input];
  };
  const [curF, cur] = pwField('pwCur', 'رمز فعلی', 'current-password');
  const [newF, nw] = pwField('pwNew', 'رمز تازه (دست‌کم ۱۰ نویسه)', 'new-password');
  const [repF, rep] = pwField('pwRep', 'تکرار رمز تازه', 'new-password');
  const msg = h('p', { class: 'err-line', role: 'alert' });
  const form = h('form', { onsubmit: async e => {
    e.preventDefault(); msg.textContent = '';
    if (nw.value.length < 10) { msg.textContent = 'رمز تازه باید دست‌کم ۱۰ نویسه باشد.'; return; }
    if (nw.value !== rep.value) { msg.textContent = 'تکرار رمز با رمز تازه یکی نیست.'; return; }
    const r = await api('/api/auth/password', { current: u.hasPassword ? cur.value : undefined, password: nw.value });
    if (!r.ok) { msg.textContent = r.error === 'wrong_current' ? 'رمز فعلی درست نیست.' : errText(r); return; }
    toast(u.hasPassword ? 'رمز عبور تغییر کرد' : 'رمز عبور تعیین شد');
    rerender();
  } }, u.hasPassword ? curF : null, newF, repF, msg,
    h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-dark', type: 'submit' }, u.hasPassword ? 'تغییر رمز' : 'تعیین رمز')));
  const row = (label, value, sub) => h('div', { class: 'set-row' }, h('div', null, h('strong', null, label), sub ? h('p', null, sub) : null), h('span', { class: 'en dim' }, value || '—'));
  return [
    head('ACCOUNT · حساب', 'حساب و امنیت', 'اطلاعات حساب، رمز عبور و قوانین', []),
    h('div', { class: 'grid-main split-b' },
      h('article', { class: 'card card-w' }, cardHead('اطلاعات حساب', 'برای تغییر نام، ایمیل یا موبایل با پشتیبانی تماس بگیرید.'),
        row('نام', u.name), row('موبایل', phone(u.mobile), u.mobile ? 'ورود با کد پیامکی یا رمز عبور' : null), row('ایمیل', u.email),
        h('div', { class: 'set-row' }, h('div', null, h('strong', null, 'رمز عبور'), h('p', null, u.hasPassword ? 'تعیین شده' : 'هنوز تعیین نشده')), st(u.hasPassword ? 'ok' : 'pending', u.hasPassword ? 'فعال' : 'ندارد')),
        h('div', { class: 'set-row tap-row', role: 'button', tabindex: 0, 'data-legal': 'terms' }, h('div', null, h('strong', null, 'قوانین استفاده و حریم خصوصی'), h('p', null, 'متن کامل را بخوانید')), ic('arrow-ur', 'flip')),
        h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-line', type: 'button', onclick: logout }, ic('logout'), 'خروج از حساب'))),
      h('article', { class: 'card card-w' },
        cardHead(u.hasPassword ? 'تغییر رمز عبور' : 'تعیین رمز عبور',
          u.hasPassword ? 'پس از تغییر، از همهٔ دستگاه‌های دیگر خارج می‌شوید.' : `با رمز می‌توانید بدون پیامک، با ${u.mobile ? 'شمارهٔ موبایل' : 'ایمیل'} و رمز وارد شوید.`),
        form)),
  ];
}

function docs() {
  const base = location.origin, model = state.ov.models[1]?.id || state.ov.models[0]?.id;
  const curl = `curl ${base}/v1/messages \\\n  -H "x-api-key: $CLAUDEIRAN_API_KEY" \\\n  -H "content-type: application/json" \\\n  -d '{\n    "model": "${model}",\n    "max_tokens": 512,\n    "messages": [{"role": "user", "content": "سلام!"}]\n  }'`;
  const py = `import os, anthropic\n\nclient = anthropic.Anthropic(\n    api_key=os.environ["CLAUDEIRAN_API_KEY"],\n    base_url="${base}",\n)\nmsg = client.messages.create(\n    model="${model}",\n    max_tokens=512,\n    messages=[{"role": "user", "content": "سلام!"}],\n)\nprint(msg.content[0].text)`;
  const block = (title, code) => h('article', { class: 'card card-w' }, cardHead(title, null, h('button', { class: 'pill tap-pill', type: 'button', onclick: () => copy(code) }, 'کپی', ic('copy'))), h('pre', { class: 'code' }, code));
  return [
    head('QUICK START · شروع سریع', 'شروع سریع', 'از ساخت کلید تا اولین درخواست', [btn('ساخت کلید', 'plus', keyModal, 'btn-dark')]),
    h('div', { class: 'grid-main split-b' },
      h('article', { class: 'card card-w' }, cardHead('سه قدم'), h('ol', { class: 'steps-list' },
        h('li', null, 'یک ', h('button', { class: 'linkbtn', type: 'button', onclick: keyModal }, 'کلید API'), ' بسازید و در متغیر محیطی CLAUDEIRAN_API_KEY بگذارید.'),
        h('li', null, h('button', { class: 'linkbtn', type: 'button', onclick: topupModal }, 'اعتبار حساب'), ' را افزایش دهید.'),
        h('li', null, 'درخواست بفرستید: شکل درخواست و پاسخ مانند Messages API است و کتابخانه‌های رسمی با تغییر base_url کار می‌کنند. پخش زنده (stream) هنوز پشتیبانی نمی‌شود.'))),
      h('article', { class: 'card card-w' }, cardHead('تعرفه', 'تومان برای هر یک میلیون توکن'),
        ktable({ all: 1, rows: state.ov.models, cols: [
          { k: 'm', label: 'مدل', cell: m => h('span', { class: 'pc' }, m.label) },
          { k: 'i', label: 'ورودی', num: 1, cell: m => h('span', { class: 'num' }, tmn(m.input)) },
          { k: 'o', label: 'خروجی', num: 1, cell: m => h('span', { class: 'num' }, tmn(m.output)) },
        ], note: 'هزینهٔ هر درخواست = توکن ورودی × تعرفهٔ ورودی + توکن خروجی × تعرفهٔ خروجی.' }))),
    block('cURL', curl), block('Python (anthropic SDK)', py),
  ];
}

const VIEWS = { overview, usage, keys, requests, billing, account, docs };
ui.autoRefresh(['overview', 'usage', 'requests', 'billing']); // live numbers during a demo or a busy day
start();
})();
