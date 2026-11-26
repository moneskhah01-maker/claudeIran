// Owner panel (/admin): overview, top-up review, customers (credit, suspend), early-access list, audit log.
// Built from the same components as the customer console (ui.js), themed like the landing page (admin.css).
(() => {
'use strict';

const state = { ov: null, view: 'overview', query: '', filter: 'all', page: 1, perPage: 10, sort: { k: null, dir: 1 }, sel: {}, metric: 'revenue', uDays: 30, uMetric: 'requests', cache: {} };
const ui = createUI({ state, rerender: () => rerender() });
const { byId, fmt, tmn, kfmt, stamp, dateOf, phone, ago, ic, money, signedMoney, st, pwToggle, openModal, closeModal, confirmModal,
  head, tile, figure, btn, tapPill, cardHead, chart, ktable, tools, matches, viewBtn } = ui;

const NAV = [['overview', 'grid', 'نمای کلی'], ['usage', 'chart', 'گزارش مصرف'], ['payments', 'wallet', 'پرداخت‌ها'], ['customers', 'users', 'مشتریان'], ['waitlist', 'list', 'فهرست انتظار'], ['audit', 'shield', 'گزارش رویدادها']];
const PAY = { pending: 'در انتظار بررسی', paid: 'پرداخت‌شده', rejected: 'ردشده', failed: 'ناموفق' };
const USTAT = { active: 'فعال', suspended: 'غیرفعال' };
const WAIT = { new: 'جدید', approved: 'تأییدشده', invited: 'دعوت‌شده', rejected: 'ردشده' };
const KIND = { topup: 'شارژ', usage: 'مصرف API', adjustment: 'اصلاح مدیر', refund: 'کسر/بازپرداخت' };
const ACTION = {
  admin_login: 'ورود مدیر', signup: 'ثبت‌نام', login: 'ورود', key_create: 'ساخت کلید', key_revoke: 'ابطال کلید', topup_manual: 'درخواست کارت‌به‌کارت',
  payment_approve: 'تأیید پرداخت', payment_reject: 'رد پرداخت', payment_paid: 'پرداخت درگاه', credit_adjust: 'اصلاح اعتبار', user_status: 'تغییر وضعیت حساب',
  password_set: 'تعیین رمز', password_change: 'تغییر رمز',
};
const who = (name, sub) => h('span', { class: 'who' }, h('span', { class: 'av' }, (name || '?').trim().charAt(0)), h('span', null, h('b', null, name), sub ? h('small', null, sub) : null));
const contact = u => u.email || phone(u.mobile) || '—';

/* ================= login ================= */
function showLogin() {
  byId('dash').hidden = true;
  byId('auth').hidden = false;
  pwToggle(byId('pw'));
  byId('pw').focus();
  byId('loginForm').onsubmit = async e => {
    e.preventDefault();
    const r = await api('/api/admin/login', { password: byId('pw').value });
    if (!r.ok) { byId('loginErr').textContent = errText(r); return; }
    byId('pw').value = ''; byId('pw').type = 'password'; byId('loginErr').textContent = '';
    start();
  };
}

/* ================= shell ================= */
async function start() {
  const me = await api('/api/admin/me');
  if (!me.ok) return showLogin();
  const show = () => { byId('auth').hidden = true; byId('dash').hidden = false; };
  if (document.startViewTransition && !ui.reduced() && !byId('auth').hidden) document.startViewTransition(show); else show();
  window.onhashchange = () => go(location.hash.slice(1));
  go(location.hash.slice(1) || 'overview', true);
}
// Tabs are built once; afterwards only the selection and the pending badge change, so the thumb slides.
function renderTabs(instant) {
  const tabs = byId('tabs'), pending = state.ov?.totals?.pending_payments || 0;
  if (!tabs.children.length) tabs.replaceChildren(...NAV.map(([k, icon, label]) => h('button', { class: 'tab', type: 'button', role: 'tab', 'data-view': k, onclick: () => { location.hash = k; } },
    ic(icon), label, k === 'payments' ? h('span', { class: 'count num' }) : null)));
  for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.view === state.view));
  const badge = tabs.querySelector('.count');
  badge.textContent = String(pending); badge.hidden = !pending;
  requestAnimationFrame(() => {
    const sel = tabs.querySelector('[aria-selected="true"]');
    if (!sel) return;
    tabs.classList.toggle('no-anim', !!instant);
    tabs.style.setProperty('--tx', sel.offsetLeft + 'px');
    tabs.style.setProperty('--tw', sel.offsetWidth + 'px');
  });
}
addEventListener('resize', () => renderTabs(true));

async function go(view, first) {
  if (!NAV.some(n => n[0] === view)) view = 'overview';
  const navigating = view !== state.view || !!first;
  const idx = v => NAV.findIndex(n => n[0] === v);
  const dir = idx(view) >= idx(state.view) ? 'next' : 'prev';
  // a link from another view may hand over a filter (e.g. overview -> payments "paid"); otherwise each view has its default
  if (navigating) Object.assign(state, { query: '', filter: state.nextFilter || (view === 'payments' ? 'pending' : 'all'), page: 1, sort: { k: null, dir: 1 } });
  state.nextFilter = null;
  state.view = view;
  if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
  if (navigating) ui.loading(true);
  const ov = await api('/api/admin/overview');
  if (!ov.ok) ui.loading(false);
  if (ov.status === 401) return showLogin();
  if (!ov.ok) return toast(errText(ov));
  state.ov = ov;
  renderTabs(!!first);
  byId('modeText').textContent = !ov.saas ? 'پایگاه داده تنظیم نشده' : ov.upstream === 'mock' ? 'API در حالت آزمایشی' : 'API فعال';
  byId('modePill').classList.toggle('live', ov.saas && ov.upstream !== 'mock');
  const v = byId('view');
  const content = !ov.saas && view !== 'waitlist'
    ? [head('ADMIN', 'پایگاه داده تنظیم نشده', 'DATABASE_URL خالی است؛ پنل مشتریان و API خاموش‌اند. فهرست انتظار کار می‌کند.', [btn('فهرست انتظار', 'list', () => { location.hash = 'waitlist'; }, 'btn-dark')])]
    : await VIEWS[view]();
  ui.loading(false);
  if (state.view !== view) return; // another tab was chosen while this one loaded
  await ui.swapView(v, content, { animate: navigating, dir });
  if (navigating && !first) { v.focus({ preventScroll: true }); scrollTo({ top: 0, behavior: ui.reduced() ? 'auto' : 'smooth' }); }
}
const rerender = () => go(state.view);
byId('refreshBtn').onclick = () => { rerender(); toast('به‌روز شد'); };
byId('logoutBtn').onclick = async () => { await api('/api/admin/logout', {}); history.replaceState(null, '', location.pathname); showLogin(); };
byId('modePill').onclick = () => openModal([
  h('h2', { id: 'dlgTitle' }, 'وضعیت سرویس'),
  h('dl', { class: 'dl' },
    h('div', null, h('dt', null, 'API بالادستی'), h('dd', null, state.ov.upstream === 'mock' ? 'آزمایشی (mock) — تا گذر از دروازهٔ G0' : state.ov.upstream)),
    h('div', null, h('dt', null, 'دفتر حساب'), h('dd', null, state.ov.ledgerOk ? 'تراز است' : 'ناتراز!')),
    h('div', null, h('dt', null, 'کارت‌به‌کارت'), h('dd', null, state.ov.payments?.manual.instructions ? 'فعال' : 'متن واریز تنظیم نشده')),
    h('div', null, h('dt', null, 'زرین‌پال'), h('dd', null, state.ov.payments?.zarinpal.enabled ? (state.ov.payments.zarinpal.sandbox ? 'آزمایشی' : 'فعال') : 'خاموش')),
    h('div', null, h('dt', null, 'تعرفه‌ها'), h('dd', null, state.ov.placeholderPrices ? 'موقت (placeholder)' : 'نهایی'))),
  h('div', { class: 'f-actions' }, h('button', { class: 'btn btn-dark', type: 'button', 'data-close': '' }, 'بستن')),
]);

/* ================= overview ================= */
function adminAlerts() {
  const o = state.ov, t = o.totals, list = [];
  if (!o.ledgerOk) list.push({ ic: 'alert', h: 'دفتر حساب ناتراز است', p: 'جمع تراکنش‌های یک یا چند حساب با موجودی یکی نیست؛ پیش از هر اقدام بررسی کنید.', go: () => { location.hash = 'audit'; }, bad: true });
  if (t.pending_payments) list.push({ ic: 'clock', h: `${t.pending_payments} پرداخت در انتظار بررسی`, p: 'واریزها را با حساب بانکی تطبیق دهید و تأیید یا رد کنید.', go: () => { location.hash = 'payments'; }, warn: true });
  if (o.upstream === 'mock') list.push({ ic: 'lock', h: 'API در حالت آزمایشی', p: 'هیچ مدلی فراخوانی نمی‌شود تا دروازهٔ G0 (تأمین مجاز) باز شود.', go: () => byId('modePill').click() });
  if (o.placeholderPrices) list.push({ ic: 'alert', h: 'تعرفه‌ها موقت‌اند', p: 'پیش از راه‌اندازی، saas/pricing.json را با قیمت‌های قرارداد به‌روز کنید.', go: () => byId('modePill').click() });
  if (!o.payments?.manual.instructions) list.push({ ic: 'wallet', h: 'متن واریز کارت‌به‌کارت تنظیم نشده', p: 'MANUAL_PAY_INFO را در فایل تنظیمات سرور بگذارید.', go: () => byId('modePill').click() });
  return list;
}
const METRICS = { revenue: ['دریافتی', 'cost', 'تومان'], usage: ['مصرف API', 'cost', 'تومان'], requests: ['درخواست', 'n', 'درخواست'], signups: ['ثبت‌نام', 'n', 'مشتری'] };

function overview() {
  const o = state.ov, t = o.totals, m = state.metric;
  // chart() reads one numeric field per day; copy the chosen metric into it
  const days = o.series.map(d => ({ day: d.day, cost: m === 'revenue' ? d.revenue : d.usage, n: m === 'requests' ? d.requests : d.signups }));
  const field = METRICS[m][1];
  const sum30 = days.reduce((a, d) => a + Number(d[field]), 0);
  const alerts = adminAlerts();
  return [
    head('ADMIN · مدیریت', 'نمای کلی', 'درآمد، مصرف، مشتریان و کارهای در انتظار', [
      btn('به‌روزرسانی', 'refresh', () => { rerender(); toast('به‌روز شد'); }),
      t.pending_payments ? btn(`بررسی ${t.pending_payments} پرداخت`, 'wallet', () => { location.hash = 'payments'; }, 'btn-dark') : null,
    ]),
    h('div', { class: 'grid-main' },
      h('div', { class: 'stack' },
        h('article', { class: 'card' }, figure('دریافتی ۳۰ روز اخیر', t.paid30, 'تومان · پرداخت‌های تأییدشده', () => { state.nextFilter = 'paid'; location.hash = 'payments'; }),
          h('div', { class: 'kpi-row' },
            tile(fmt(t.users), 'کل مشتریان', h('span', { class: 'bd up' }, `+${fmt(t.users7)}`), () => { location.hash = 'customers'; }),
            tile(tmn(t.balances), 'موجودی نزد مشتریان · تومان', null, () => { location.hash = 'customers'; }),
            tile(tmn(t.usage30), 'مصرف API · ۳۰ روز · تومان'),
            tile(fmt(t.requests24), 'درخواست · ۲۴ ساعت'))),
        h('article', { class: 'card' },
          h('div', { class: 'chart-head' }, h('div', null, h('h2', null, `${METRICS[m][0]} روزانه`), h('p', { class: 'sub' }, `۳۰ روز گذشته · جمع: ${field === 'cost' ? tmn(sum30) : fmt(sum30)} ${METRICS[m][2]}`)),
            h('div', { class: 'fpills metric-pills', role: 'group', 'aria-label': 'شاخص نمودار' }, Object.entries(METRICS).map(([k, [label]]) =>
              h('button', { type: 'button', 'aria-pressed': String(m === k), onclick: () => { state.metric = k; delete state.sel.admin; rerender(); } }, label)))),
          chart('admin', days, field, METRICS[m][2], 190, `نمودار ${METRICS[m][0]} روزانه`))),
      h('div', { class: 'stack' },
        h('article', { class: 'alerts', 'aria-label': 'کارهای مدیر' },
          h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'نیاز به توجه'), h('p', { class: 'sub' }, alerts.length ? `${alerts.length} مورد` : 'همه چیز مرتب است'))),
          alerts.length ? alerts.map(a => h('div', { class: `arow tap-row ${a.bad ? 'focus' : ''}`.trim(), role: 'button', tabindex: 0, onclick: a.go, onkeydown: e => { if (e.key === 'Enter') a.go(); } },
            h('span', { class: 'itile' }, ic(a.ic)), h('div', null, h('h3', null, a.h, a.warn || a.bad ? h('span', { class: 'unread', 'aria-hidden': 'true' }) : null), h('p', null, a.p)),
            h('span', { class: 'when' }, ic('arrow-ur', 'flip'))))
            : h('div', { class: 'state' }, h('span', { class: 'itile' }, ic('check-sq')), h('h3', null, 'کاری در انتظار نیست'))),
        h('article', { class: 'card' }, cardHead('پرمصرف‌ترین مشتریان', '۳۰ روز اخیر'),
          o.topCustomers.length ? o.topCustomers.map((c, i) => h('div', { class: 'arow tap-row', role: 'button', tabindex: 0, onclick: () => customerModal(c.id), onkeydown: e => { if (e.key === 'Enter') customerModal(c.id); } },
            h('span', { class: 'rank' }, String(i + 1)), h('div', null, h('h3', null, c.name), h('p', null, h('span', { class: 'num' }, fmt(c.requests)), ' درخواست')),
            h('span', { class: 'when' }, money(c.spend)))) : h('p', { class: 'sub' }, 'هنوز مصرفی ثبت نشده است.')))),
    h('div', { class: 'grid-main split-b' },
      h('section', { class: 'tbl-card' },
        h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'آخرین پرداخت‌ها')), btn('همه', null, () => { state.nextFilter = 'all'; location.hash = 'payments'; }, 'btn-line')),
        ktable({ all: 1, rows: o.recentPayments, row: p => paymentModal(p.id), empty: 'پرداختی نیست', note: 'برای جزئیات روی ردیف بزنید.', cols: [
          { k: 'c', label: 'مشتری', cell: p => who(p.name) },
          { k: 'a', label: 'مبلغ', num: 1, cell: p => money(p.amount) },
          { k: 's', label: 'وضعیت', cls: 'lead2', cell: p => st(p.status, PAY[p.status]) },
        ] })),
      h('section', { class: 'tbl-card' },
        h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'مشتریان تازه')), btn('همه', null, () => { location.hash = 'customers'; }, 'btn-line')),
        ktable({ all: 1, rows: o.recentUsers, row: u => customerModal(u.id), empty: 'مشتری‌ای نیست', note: 'برای پروندهٔ مشتری روی ردیف بزنید.', cols: [
          { k: 'c', label: 'مشتری', cell: u => who(u.name, contact(u)) },
          { k: 'j', label: 'عضویت', cell: u => h('span', { class: 'dim' }, ago(u.created_at)) },
          { k: 's', label: 'وضعیت', cls: 'lead2', cell: u => st(u.status === 'active' ? 'ok' : 'error', USTAT[u.status]) },
        ] }))),
  ];
}

/* ================= usage report ================= */
const U_METRICS = { requests: ['درخواست', 'requests', 'درخواست'], cost: ['هزینه', 'cost', 'تومان'], tokens: ['توکن', 'tokens', 'توکن'], errors: ['خطا', 'errors', 'خطا'] };
const pct = (a, b) => (b ? (a / b * 100) : 0);

// average requests per hour of the day: 24 bars (00 to 23, Tehran time), the busiest hour highlighted
function hourBars(hourly) {
  const max = Math.max(1e-9, ...hourly.map(x => x.avg)), peak = hourly.findIndex(x => x.avg === max);
  const field = h('div', { class: 'barfield', role: 'img', 'aria-label': 'میانگین درخواست در هر ساعت شبانه‌روز' });
  field.style.height = '150px';
  hourly.forEach((x, i) => {
    const b = h('i', { class: i === peak ? 'hi' : null, title: `ساعت ${i}: ${x.avg.toFixed(1)} درخواست` });
    b.style.setProperty('--h', `${Math.max(1.5, x.avg / max * 100).toFixed(1)}%`);
    b.style.setProperty('--i', i);
    field.append(b);
  });
  const two = n => String(n).padStart(2, '0');
  return [field,
    h('div', { class: 'axis' }, [0, 3, 6, 9, 12, 15, 18, 21].map(hh => h('span', null, two(hh)))),
    h('p', { class: 'readout' },
      h('span', null, 'شلوغ‌ترین ساعت: ', h('b', null, `${two(peak)}:00 تا ${two(peak + 1)}:00 · ${hourly[peak].avg.toFixed(1)} درخواست در روز`)),
      h('span', null, 'به وقت تهران'))];
}

async function usage() {
  const r = await api('/api/admin/usage?days=' + state.uDays);
  if (!r.ok) return [head('USAGE', 'گزارش مصرف', errText(r))];
  const t = r.totals, m = state.uMetric, field = U_METRICS[m][1];
  const totalCost = r.byModel.reduce((a, x) => a + x.cost, 0) || 1;
  return [
    head('USAGE · گزارش مصرف', 'گزارش مصرف', 'حجم استفاده از API به تفکیک روز، مدل، مشتری و ساعت', [
      h('div', { class: 'fpills', role: 'group', 'aria-label': 'بازهٔ زمانی' }, [[7, '۷ روز'], [30, '۳۰ روز'], [60, '۶۰ روز']].map(([d, l]) =>
        h('button', { type: 'button', 'aria-pressed': String(state.uDays === d), onclick: () => { state.uDays = d; delete state.sel.ausage; rerender(); } }, l))),
    ]),
    h('div', { class: 'kpi-row' },
      tile(fmt(t.requests), `درخواست · ${r.days} روز`),
      tile(tmn(t.cost), 'هزینهٔ مصرف · تومان'),
      tile(fmt(t.customers), 'مشتری فعال'),
      tile(t.latency ? (t.latency / 1000).toFixed(1) + 's' : '—', 'میانگین زمان پاسخ')),
    h('div', { class: 'kpi-row mt12' },
      tile(kfmt(t.tin), 'توکن ورودی'), tile(kfmt(t.tout), 'توکن خروجی'),
      tile(pct(t.errors, t.requests).toFixed(1) + '%', 'نرخ خطا'),
      tile(t.requests ? tmn(t.cost / t.requests) : '—', 'میانگین هزینهٔ هر درخواست · تومان')),
    h('article', { class: 'card mt12' },
      h('div', { class: 'chart-head' }, h('div', null, h('h2', null, `${U_METRICS[m][0]} روزانه`), h('p', { class: 'sub' }, `${r.days} روز گذشته`)),
        h('div', { class: 'fpills metric-pills', role: 'group', 'aria-label': 'شاخص نمودار' }, Object.entries(U_METRICS).map(([k, [label]]) =>
          h('button', { type: 'button', 'aria-pressed': String(m === k), onclick: () => { state.uMetric = k; delete state.sel.ausage; rerender(); } }, label)))),
      chart('ausage', r.daily, field, U_METRICS[m][2], 200, `نمودار ${U_METRICS[m][0]} روزانه`)),
    h('div', { class: 'grid-main split-b' },
      h('section', { class: 'tbl-card' },
        h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'به تفکیک مدل'), h('p', { class: 'sub' }, 'سهم هر مدل از هزینهٔ مصرف'))),
        ktable({ all: 1, rows: r.byModel, empty: 'در این بازه مصرفی نیست', note: '', cols: [
          { k: 'm', label: 'مدل', cell: x => h('span', { class: 'pc' }, r.models[x.model] || x.model) },
          { k: 'r', label: 'درخواست', num: 1, cell: x => h('span', { class: 'num' }, fmt(x.requests)) },
          { k: 'c', label: 'هزینه', num: 1, cell: x => money(x.cost) },
          { k: 's', label: 'سهم', cls: 'lead2', cell: x => {
            const bar = h('span'); bar.style.width = pct(x.cost, totalCost).toFixed(1) + '%';
            return h('span', { class: 'share-cell' }, h('span', { class: 'progress share' }, bar), h('span', { class: 'num dim' }, pct(x.cost, totalCost).toFixed(0) + '%'));
          } },
        ] })),
      h('article', { class: 'card' }, cardHead('ساعت‌های شلوغ', 'میانگین درخواست در هر ساعت از شبانه‌روز'), hourBars(r.hourly))),
    h('section', { class: 'tbl-card' },
      h('div', { class: 'card-head' }, h('div', null, h('h2', { class: 'fs-md' }, 'به تفکیک مشتری'), h('p', { class: 'sub' }, 'برای پروندهٔ مشتری روی ردیف بزنید'))),
      ktable({ rows: r.byCustomer, row: c => customerModal(c.id), empty: 'در این بازه مصرفی نیست', note: `${fmt(r.byCustomer.length)} مشتری در این بازه درخواست فرستاده‌اند.`, cols: [
        { k: 'n', label: 'مشتری', sort: c => c.name, cell: c => who(c.name, contact(c)) },
        { k: 'r', label: 'درخواست', num: 1, sort: c => c.requests, cell: c => h('span', { class: 'num' }, fmt(c.requests)) },
        { k: 't', label: 'توکن', num: 1, sort: c => c.tokens, cell: c => h('span', { class: 'num' }, kfmt(c.tokens)) },
        { k: 'c', label: 'هزینه', num: 1, sort: c => c.cost, cell: c => money(c.cost) },
        { k: 'e', label: 'خطا', num: 1, sort: c => c.errors, cell: c => h('span', { class: 'num dim' }, pct(c.errors, c.requests).toFixed(1) + '%') },
        { k: 'l', label: 'آخرین درخواست', sort: c => c.last, cell: c => h('span', { class: 'dim' }, ago(c.last)) },
        { k: 's', label: 'وضعیت', cls: 'lead2', cell: c => st(c.status === 'active' ? 'ok' : 'error', USTAT[c.status]) },
      ] })),
  ];
}

/* ================= payments ================= */
async function payments() {
  const r = await api('/api/admin/payments?status=all');
  state.cache.payments = r.rows || [];
  const all = state.cache.payments;
  const rows = all.filter(p => matches(p.status, `${p.name} ${p.email || ''} ${p.mobile || ''} ${p.receipt || ''} ${p.ref_id || ''} pay_${p.id}`));
  const pendingSum = all.filter(p => p.status === 'pending').reduce((a, p) => a + p.amount, 0);
  return [
    head('PAYMENTS · پرداخت‌ها', 'پرداخت‌ها', 'بررسی کارت‌به‌کارت‌ها و پیگیری پرداخت‌های درگاه', []),
    h('div', { class: 'tiles t3' },
      tile(String(all.filter(p => p.status === 'pending').length), 'در انتظار بررسی', null, () => { state.filter = 'pending'; rerender(); }),
      tile(tmn(pendingSum), 'مبلغ در انتظار · تومان'),
      tile(tmn(state.ov.totals.paid30), 'تأییدشده · ۳۰ روز · تومان', null, () => { state.filter = 'paid'; rerender(); })),
    h('section', { class: 'tbl-card' },
      tools('نام، ایمیل، موبایل یا شمارهٔ پیگیری', [['pending', 'در انتظار'], ['paid', 'پرداخت‌شده'], ['rejected', 'ردشده'], ['failed', 'ناموفق'], ['all', 'همه']]),
      ktable({ rows, row: p => paymentModal(p.id), empty: 'پرداختی با این فیلتر نیست', note: 'تأیید کارت‌به‌کارت فقط پس از دیدن واریز در حساب بانکی. هر تأیید یا رد در گزارش رویدادها ثبت می‌شود.', cols: [
        { k: 'i', label: 'شناسه', sort: p => p.id, cell: p => h('span', { class: 'id' }, `pay_${p.id}`) },
        { k: 'c', label: 'مشتری', sort: p => p.name, cell: p => who(p.name, contact(p)) },
        { k: 'm', label: 'روش', cell: p => PROVIDER_FA[p.provider] },
        { k: 'a', label: 'مبلغ', num: 1, sort: p => p.amount, cell: p => money(p.amount) },
        { k: 'r', label: 'اطلاعات واریز / مرجع', cell: p => h('span', { class: 'dim' }, p.receipt || p.ref_id || '—') },
        { k: 'd', label: 'زمان', sort: p => p.created_at, cell: p => h('span', { class: 'num dim' }, stamp(p.created_at)) },
        { k: 's', label: 'وضعیت', cls: 'lead2', cell: p => st(p.status, PAY[p.status]) },
        { k: 'x', label: 'اقدام', cls: 'act', cell: p => p.status === 'pending' && p.provider === 'manual'
          ? h('span', { class: 'row-acts' }, h('button', { class: 'rowbtn', type: 'button', onclick: () => review(p, 'approve') }, ic('check'), 'تأیید'), ' ', h('button', { class: 'rowbtn', type: 'button', onclick: () => review(p, 'reject') }, 'رد'))
          : viewBtn(() => paymentModal(p.id)) },
      ] })),
  ];
}
async function paymentModal(id) {
  let p = (state.cache.payments || []).find(x => x.id === id);
  if (!p) { const r = await api('/api/admin/payments?status=all'); state.cache.payments = r.rows || []; p = state.cache.payments.find(x => x.id === id); }
  if (!p) return toast('پرداخت پیدا نشد');
  const can = p.status === 'pending' && p.provider === 'manual';
  openModal([
    h('h2', { id: 'dlgTitle' }, `پرداخت ${PROVIDER_FA[p.provider]}`), h('p', { class: 'sub' }, h('span', { class: 'id' }, `pay_${p.id}`), ' · ', st(p.status, PAY[p.status])),
    h('div', { class: 'mbig' }, h('span', { class: 'num' }, tmn(p.amount)), ' ', h('small', null, 'تومان')),
    h('dl', { class: 'dl' },
      h('div', null, h('dt', null, 'مشتری'), h('dd', null, h('button', { class: 'linkbtn', type: 'button', onclick: () => customerModal(p.user_id) }, p.name))),
      h('div', null, h('dt', null, 'تماس'), h('dd', { class: 'en' }, contact(p))),
      h('div', null, h('dt', null, 'ثبت'), h('dd', { class: 'num' }, stamp(p.created_at))),
      h('div', null, h('dt', null, 'نتیجه'), h('dd', { class: 'num' }, p.resolved_at ? stamp(p.resolved_at) : '—')),
      p.receipt ? h('div', null, h('dt', null, 'اطلاعات واریز مشتری'), h('dd', null, p.receipt)) : null,
      p.ref_id ? h('div', null, h('dt', null, 'کد مرجع درگاه'), h('dd', { class: 'num' }, p.ref_id)) : null,
      p.card_pan ? h('div', null, h('dt', null, 'کارت'), h('dd', { class: 'num' }, p.card_pan)) : null,
      p.note ? h('div', null, h('dt', null, 'یادداشت'), h('dd', null, p.note)) : null),
    can ? h('div', { class: 'warn' }, ic('alert'), h('div', null, 'پیش از تأیید، واریز همین مبلغ را در حساب بانکی ببینید. تأیید، اعتبار را فوراً به حساب مشتری اضافه می‌کند.')) : null,
    h('div', { class: 'f-actions' },
      can ? h('button', { class: 'btn btn-dark', type: 'button', onclick: () => review(p, 'approve') }, ic('check'), 'تأیید و افزودن اعتبار') : null,
      can ? h('button', { class: 'btn btn-line', type: 'button', onclick: () => review(p, 'reject') }, 'رد') : null,
      h('button', { class: 'btn btn-line', type: 'button', 'data-close': '' }, 'بستن')),
  ]);
}
async function review(p, decision) {
  const ok = decision === 'approve'
    ? await confirmModal({ title: 'تأیید پرداخت', text: `واریز ${tmn(p.amount)} تومان از «${p.name}» را در حساب بانکی دیده‌اید؟ با تأیید، این مبلغ به اعتبار مشتری افزوده می‌شود.`, action: 'تأیید و افزودن اعتبار' })
    : await confirmModal({ title: 'رد پرداخت', text: `درخواست ${tmn(p.amount)} تومانی «${p.name}» رد شود؟ دلیل به مشتری نمایش داده می‌شود.`, action: 'رد پرداخت', danger: true, note: { label: 'دلیل رد', placeholder: 'مثلاً: واریزی با این مشخصات پیدا نشد' } });
  if (ok === false) return;
  const r = await api('/api/admin/payments/review', { id: p.id, decision, note: typeof ok === 'string' ? ok : '' });
  if (!r.ok) return toast(errText(r));
  toast(decision === 'approve' ? 'اعتبار افزوده شد' : 'پرداخت رد شد');
  rerender();
}

/* ================= customers ================= */
async function customers() {
  const r = await api('/api/admin/users');
  const all = r.rows || [];
  const rows = all.filter(u => matches(u.status, `${u.name} ${u.email || ''} ${u.mobile || ''} ${phone(u.mobile)} ${u.id}`));
  return [
    head('CUSTOMERS · مشتریان', 'مشتریان', 'پروندهٔ هر مشتری: موجودی، کلیدها، پرداخت‌ها و گردش حساب', []),
    h('div', { class: 'tiles t3' },
      tile(fmt(all.length), 'کل مشتریان'), tile(fmt(all.filter(u => u.status === 'suspended').length), 'غیرفعال', null, () => { state.filter = 'suspended'; rerender(); }),
      tile(tmn(all.reduce((a, u) => a + u.balance, 0)), 'موجودی کل · تومان')),
    h('section', { class: 'tbl-card' },
      tools('نام، ایمیل، موبایل یا شناسه', [['all', 'همه'], ['active', 'فعال'], ['suspended', 'غیرفعال']]),
      ktable({ rows, row: u => customerModal(u.id), empty: 'مشتری‌ای پیدا نشد', note: 'برای پرونده، اصلاح اعتبار یا غیرفعال‌کردن حساب روی ردیف بزنید.', cols: [
        { k: 'n', label: 'مشتری', sort: u => u.name, cell: u => who(u.name, contact(u)) },
        { k: 'b', label: 'موجودی', num: 1, sort: u => u.balance, cell: u => money(u.balance) },
        { k: 'k', label: 'کلید فعال', num: 1, sort: u => Number(u.keys), cell: u => h('span', { class: 'num' }, String(u.keys)) },
        { k: 'l', label: 'آخرین درخواست', sort: u => u.last_request || '', cell: u => h('span', { class: 'dim' }, u.last_request ? ago(u.last_request) : '—') },
        { k: 'j', label: 'عضویت', sort: u => u.created_at, cell: u => h('span', { class: 'num dim' }, dateOf(u.created_at)) },
        { k: 's', label: 'وضعیت', cls: 'lead2', cell: u => st(u.status === 'active' ? 'ok' : 'error', USTAT[u.status]) },
      ] })),
  ];
}
async function customerModal(id, tab = 'ledger') {
  const r = await api('/api/admin/user?id=' + id);
  if (!r.ok) return toast(errText(r));
  const u = r.user, on = u.status === 'active';
  const amount = h('input', { id: 'adjAmount', inputmode: 'numeric', dir: 'ltr', placeholder: '50000 یا -50000' });
  const note = h('input', { id: 'adjNote', maxlength: 300, placeholder: 'هدیه، جبران خطا، بازپرداخت…' });
  const adjust = h('form', { class: 'adj', onsubmit: async e => {
    e.preventDefault();
    const t = Number(latin(amount.value).replace(/[^\d-]/g, ''));
    if (!t) return toast('مبلغ را به تومان وارد کنید');
    if (note.value.trim().length < 3) return toast('توضیح لازم است (دست‌کم ۳ حرف)');
    const ok = await confirmModal({ title: 'اصلاح اعتبار', text: `${t > 0 ? 'افزودن' : 'کسر'} ${fmt(Math.abs(t))} تومان ${t > 0 ? 'به' : 'از'} حساب «${u.name}»؟ این تراکنش در گردش حساب مشتری و گزارش رویدادها ثبت می‌شود.`, action: 'ثبت', danger: t < 0 });
    if (!ok) return customerModal(id, tab);
    const x = await api('/api/admin/adjust', { accountId: u.account_id, amount: t * 10, note: note.value });
    if (!x.ok) { toast(errText(x)); return customerModal(id, tab); }
    toast('ثبت شد'); customerModal(id, tab); if (['customers', 'overview'].includes(state.view)) rerender();
  } }, h('div', { class: 'field' }, h('label', { for: 'adjAmount' }, 'اصلاح اعتبار (تومان)'), amount),
    h('div', { class: 'field' }, h('label', { for: 'adjNote' }, 'توضیح'), note), h('button', { class: 'btn btn-dark', type: 'submit' }, 'ثبت'));
  const toggle = async () => {
    const ok = await confirmModal(on
      ? { title: 'غیرفعال‌کردن حساب', text: `حساب «${u.name}» غیرفعال شود؟ مشتری از همهٔ دستگاه‌ها خارج می‌شود و کلیدهایش کار نمی‌کنند. موجودی دست نمی‌خورد.`, action: 'غیرفعال کن', danger: true }
      : { title: 'فعال‌کردن حساب', text: `حساب «${u.name}» دوباره فعال شود؟`, action: 'فعال کن' });
    if (!ok) return customerModal(id, tab);
    const x = await api('/api/admin/users/status', { id: u.id, status: on ? 'suspended' : 'active' });
    if (!x.ok) return toast(errText(x));
    toast(on ? 'حساب غیرفعال شد' : 'حساب فعال شد'); customerModal(id, tab); rerender();
  };
  const TABS = { ledger: `گردش حساب (${r.ledger.length})`, payments: `پرداخت‌ها (${r.payments.length})`, keys: `کلیدها (${r.keys.length})`, usage: `درخواست‌ها (${r.usage.length})` };
  const tables = {
    ledger: () => ktable({ all: 1, rows: r.ledger.slice(0, 40), empty: 'تراکنشی نیست', note: '۴۰ تراکنش آخر', cols: [
      { k: 'd', label: 'زمان', cell: l => h('span', { class: 'num dim' }, stamp(l.created_at)) },
      { k: 'k', label: 'نوع', cell: l => KIND[l.kind] },
      { k: 'a', label: 'مبلغ', num: 1, cell: l => signedMoney(l.amount) },
      { k: 'n', label: 'شرح', cell: l => h('span', { class: 'dim' }, l.note === 'manual' ? 'کارت‌به‌کارت' : l.note === 'zarinpal' ? 'زرین‌پال' : l.note || l.ref || '') },
      { k: 'b', label: 'انجام‌دهنده', cls: 'lead2', cell: l => h('span', { class: 'dim' }, l.actor) } ] }),
    payments: () => ktable({ all: 1, rows: r.payments, empty: 'پرداختی نیست', note: '', cols: [
      { k: 'd', label: 'زمان', cell: p => h('span', { class: 'num dim' }, stamp(p.created_at)) },
      { k: 'm', label: 'روش', cell: p => PROVIDER_FA[p.provider] },
      { k: 'a', label: 'مبلغ', num: 1, cell: p => money(p.amount) },
      { k: 'r', label: 'مرجع', cell: p => h('span', { class: 'dim' }, p.ref_id || p.receipt || '—') },
      { k: 's', label: 'وضعیت', cls: 'lead2', cell: p => st(p.status, PAY[p.status]) } ] }),
    keys: () => ktable({ all: 1, rows: r.keys, empty: 'کلیدی نیست', note: 'متن کامل کلیدها هیچ‌جا ذخیره نمی‌شود؛ فقط پیشوند.', cols: [
      { k: 'n', label: 'نام', cell: k => h('span', { class: 'pc' }, k.name) },
      { k: 'p', label: 'شناسه', cell: k => h('span', { class: 'id' }, k.prefix + '••••') },
      { k: 'l', label: 'آخرین استفاده', cell: k => h('span', { class: 'dim' }, ago(k.last_used_at)) },
      { k: 's', label: 'وضعیت', cls: 'lead2', cell: k => st(k.revoked_at ? 'revoked' : 'ok', k.revoked_at ? 'باطل‌شده' : 'فعال') } ] }),
    usage: () => ktable({ all: 1, rows: r.usage, empty: 'درخواستی نیست', note: '۵۰ درخواست آخر', cols: [
      { k: 'd', label: 'زمان', cell: x => h('span', { class: 'num dim' }, stamp(x.created_at)) },
      { k: 'm', label: 'مدل', cell: x => h('span', { class: 'id' }, x.model) },
      { k: 't', label: 'توکن', num: 1, cell: x => h('span', { class: 'num' }, `${kfmt(x.input_tokens)} / ${kfmt(x.output_tokens)}`) },
      { k: 'c', label: 'هزینه', num: 1, cell: x => money(x.cost) },
      { k: 's', label: 'وضعیت', cls: 'lead2', cell: x => st(x.status, x.status === 'ok' ? 'موفق' : x.status === 'error' ? 'ناموفق' : 'در جریان') } ] }),
  };
  openModal([
    h('h2', { id: 'dlgTitle' }, u.name), h('p', { class: 'sub' }, st(on ? 'ok' : 'error', USTAT[u.status]), ' · ', h('span', { class: 'en' }, contact(u)), ' · عضویت ', ago(u.created_at)),
    h('div', { class: 'tiles t3 mt12' }, tile(tmn(u.balance), 'موجودی · تومان'), tile(tmn(u.held), 'رزرو · تومان'), tile(String(r.keys.filter(k => !k.revoked_at).length), 'کلید فعال')),
    h('dl', { class: 'dl' },
      h('div', null, h('dt', null, 'موبایل'), h('dd', { class: 'en' }, phone(u.mobile) || '—', u.mobile_verified_at ? ' ✓' : '')),
      h('div', null, h('dt', null, 'ایمیل'), h('dd', { class: 'en' }, u.email || '—'))),
    adjust,
    h('div', { class: 'fpills sub-tabs', role: 'group', 'aria-label': 'بخش‌های پرونده' }, Object.entries(TABS).map(([k, label]) =>
      h('button', { type: 'button', 'aria-pressed': String(tab === k), onclick: () => customerModal(id, k) }, label))),
    tables[tab](),
    h('div', { class: 'f-actions' }, h('button', { class: `btn ${on ? 'btn-danger' : 'btn-dark'}`, type: 'button', onclick: toggle }, on ? 'غیرفعال‌کردن حساب' : 'فعال‌کردن حساب'), h('button', { class: 'btn btn-line', type: 'button', 'data-close': '' }, 'بستن')),
  ], true);
}

/* ================= early-access list ================= */
async function waitlist() {
  const r = await api('/api/admin/signups');
  const s = r.stats || {}, all = (r.items || []).map(x => ({ ...x, status: x.status || 'new' }));
  const rows = all.filter(x => matches(x.status, `${x.name} ${x.email} ${x.mobile} ${x.usecase || ''} ${x.role || ''}`));
  const save = async (x, patch) => { const y = await api('/api/admin/signups/update', { email: x.email, ...patch }); toast(y.ok ? 'ذخیره شد' : errText(y)); };
  return [
    head('EARLY ACCESS · فهرست انتظار', 'فهرست انتظار', 'درخواست‌های دسترسی زودهنگام از فرم وب‌سایت', [
      h('a', { class: 'btn btn-line', href: '/api/admin/signups.csv' }, ic('download'), 'خروجی Excel (CSV)')]),
    h('div', { class: 'tiles' }, tile(fmt(s.total), 'کل درخواست‌ها'), tile(fmt(s.last7), '۷ روز اخیر'), tile(fmt(s.new), 'جدید · بررسی‌نشده', null, () => { state.filter = 'new'; rerender(); }), tile(fmt(s.invited), 'دعوت‌شده')),
    h('section', { class: 'tbl-card' },
      tools('نام، ایمیل، موبایل یا کاربرد', [['all', 'همه'], ['new', 'جدید'], ['approved', 'تأییدشده'], ['invited', 'دعوت‌شده'], ['rejected', 'ردشده']]),
      ktable({ rows, empty: all.length ? 'موردی پیدا نشد' : 'هنوز درخواستی نیست', note: 'تغییر وضعیت یا یادداشت فوراً ذخیره می‌شود.', cols: [
        { k: 'n', label: 'نام', sort: x => x.name, cell: x => who(x.name, x.email) },
        { k: 'm', label: 'موبایل', cell: x => h('span', { class: 'num dim' }, phone(x.mobile)) },
        { k: 'u', label: 'کاربرد', cell: x => h('span', { class: 'dim' }, x.usecase || x.role || '—') },
        { k: 'd', label: 'زمان', sort: x => x.createdAt, cell: x => h('span', { class: 'num dim' }, dateOf(x.createdAt)) },
        { k: 's', label: 'وضعیت', cell: x => h('select', { class: 'inline-sel', 'aria-label': 'وضعیت', onchange: e => save(x, { status: e.target.value }) },
          Object.entries(WAIT).map(([v, l]) => h('option', { value: v, selected: x.status === v }, l))) },
        { k: 'o', label: 'یادداشت', cls: 'act', cell: x => h('input', { class: 'inline-note', value: x.note || '', 'aria-label': 'یادداشت', placeholder: 'یادداشت…', onchange: e => save(x, { note: e.target.value }) }) },
      ] })),
  ];
}

/* ================= audit log ================= */
async function audit() {
  const r = await api('/api/admin/audit');
  const all = (r.rows || []).map(a => ({ ...a, status: a.actor === 'admin' ? 'admin' : a.actor.startsWith('user:') ? 'user' : 'system' }));
  const rows = all.filter(a => matches(a.status, `${a.actor} ${a.action} ${ACTION[a.action] || ''} ${a.target || ''} ${a.ip || ''}`));
  return [
    head('AUDIT · گزارش رویدادها', 'گزارش رویدادها', 'هر ورود، تغییر پول و اقدام مدیر با زمان و IP', []),
    h('section', { class: 'tbl-card' },
      tools('رویداد، هدف یا IP', [['all', 'همه'], ['admin', 'مدیر'], ['user', 'مشتری'], ['system', 'سیستم']]),
      ktable({ rows, empty: 'رویدادی نیست', note: '۳۰۰ رویداد آخر.', cols: [
        { k: 'd', label: 'زمان', sort: a => a.created_at, cell: a => h('span', { class: 'num dim' }, stamp(a.created_at)) },
        { k: 'w', label: 'انجام‌دهنده', cell: a => h('span', { class: a.actor === 'admin' ? 'pill dk' : 'pill' }, a.actor === 'admin' ? 'مدیر' : a.actor) },
        { k: 'a', label: 'رویداد', cell: a => h('span', { class: 'pc' }, ACTION[a.action] || a.action) },
        { k: 't', label: 'هدف', cell: a => a.target?.startsWith('user:') ? h('button', { class: 'linkbtn', type: 'button', onclick: () => customerModal(Number(a.target.slice(5))) }, a.target) : h('span', { class: 'id' }, a.target || '—') },
        { k: 'x', label: 'جزئیات', cell: a => h('span', { class: 'mono-detail' }, a.detail ? JSON.stringify(a.detail) : '') },
        { k: 'i', label: 'IP', cls: 'lead2', cell: a => h('span', { class: 'id' }, a.ip || '') },
      ] })),
  ];
}

const VIEWS = { overview, usage, payments, customers, waitlist, audit };
ui.autoRefresh(['overview', 'usage', 'payments', 'customers', 'audit']); // live numbers during a demo or a busy day
start();
})();
