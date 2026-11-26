// Owner panel (/admin): overview, top-up review, customers (credit adjust, suspend), early-access list, audit log.
'use strict';

let saasOn = false;
const VIEWS = { overview, payments, users, waitlist, audit };

async function start() {
  const me = await api('/api/admin/me');
  if (!me.ok) return showLogin();
  $('#auth').hidden = true;
  $('#dash').hidden = false;
  $('#logout').onclick = async () => { await api('/api/admin/logout', {}); showLogin(); };
  window.onhashchange = route;
  route();
}

// eye icon drawn with SVG DOM calls (no innerHTML), open or crossed out
function eyeIcon(off) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const d = off ? ['M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.5 7.2C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17']
    : ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z', 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0'];
  for (const x of d) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', x); svg.append(p); }
  return svg;
}

function showLogin() {
  $('#dash').hidden = true;
  $('#auth').hidden = false;
  const eye = $('#pwEye');
  eye.replaceChildren(eyeIcon(false));
  eye.onclick = () => {
    const show = $('#pw').type === 'password';
    $('#pw').type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', String(show));
    eye.setAttribute('aria-label', show ? 'پنهان کردن رمز' : 'نمایش رمز');
    eye.replaceChildren(eyeIcon(show));
    $('#pw').focus();
  };
  $('#pw').focus();
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const r = await api('/api/admin/login', { password: $('#pw').value });
    if (!r.ok) return void ($('#loginErr').textContent = errText(r));
    $('#pw').value = '';
    $('#pw').type = 'password';
    start();
  };
}

async function route() {
  const name = location.hash.slice(1) in VIEWS ? location.hash.slice(1) : 'overview';
  document.querySelectorAll('.side a').forEach(a => a.getAttribute('href') === '#' + name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const view = $('#view');
  view.replaceChildren(h('p', { class: 'muted' }, 'در حال بارگذاری…'));
  const ov = await api('/api/admin/overview');
  if (ov.status === 401) return showLogin();
  saasOn = ov.saas;
  $('#pendingBadge').replaceChildren(saasOn && ov.totals.pending_payments ? pill('pending', num(ov.totals.pending_payments)) : '');
  if (!saasOn && name !== 'waitlist' && name !== 'overview') return view.replaceChildren(h('div', { class: 'banner' }, 'پایگاه داده تنظیم نشده (DATABASE_URL)؛ فقط فهرست انتظار در دسترس است.'));
  view.replaceChildren(...[await VIEWS[name](ov)].flat().filter(Boolean));
  view.focus({ preventScroll: true });
}

const pageHead = (title, ...actions) => h('div', { class: 'top' }, h('h1', null, title), h('div', { class: 'row' }, actions));
const tile = (label, value, unit) => h('div', { class: 'card tile' }, h('div', { class: 'label' }, label), h('div', { class: 'num' }, value, unit ? h('small', null, unit) : null));

function overview(ov) {
  if (!ov.saas) return [pageHead('نمای کلی'), h('div', { class: 'banner' }, 'پایگاه داده تنظیم نشده (DATABASE_URL)؛ پنل مشتریان و API خاموش است. فهرست انتظار کار می‌کند.')];
  const t = ov.totals;
  return [
    pageHead('نمای کلی'),
    ov.upstream === 'mock' ? h('div', { class: 'banner' }, 'API در حالت آزمایشی (mock) است: هیچ مدلی فراخوانی نمی‌شود. اتصال به تأمین‌کننده فقط پس از گذر از دروازهٔ G0.') : null,
    ov.ledgerOk ? null : h('div', { class: 'banner bad' }, 'هشدار: جمع دفتر حساب با موجودی یک یا چند حساب نمی‌خواند. پیش از هر تراکنش دیگری بررسی کنید.'),
    h('div', { class: 'grid g4' },
      tile('مشتریان', num(t.users), `+${num(t.users7)} در ۷ روز`),
      tile('پرداخت‌های در انتظار', num(t.pending_payments)),
      tile('دریافتی ۳۰ روز', toman(t.paid30), 'تومان'),
      tile('مصرف API در ۳۰ روز', toman(t.usage30), 'تومان')),
    h('div', { class: 'grid g3' },
      tile('مجموع موجودی مشتریان', toman(t.balances), 'تومان'),
      tile('درخواست‌های ۲۴ ساعت', num(t.requests24)),
      h('div', { class: 'card tile' }, h('div', { class: 'label' }, 'درگاه‌ها'), h('div', { class: 'stack small' },
        h('div', null, 'کارت‌به‌کارت: ', ov.payments.manual.instructions ? pill('ok', 'فعال') : pill('pending', 'متن واریز تنظیم نشده')),
        h('div', null, 'زرین‌پال: ', ov.payments.zarinpal.enabled ? pill('ok', ov.payments.zarinpal.sandbox ? 'آزمایشی' : 'فعال') : pill('', 'خاموش'))))),
  ];
}

async function payments() {
  const status = new URLSearchParams(location.hash.split('?')[1] || '').get('s') || 'pending';
  const r = await api(`/api/admin/payments?status=${status}`);
  const filter = h('div', { class: 'seg', role: 'group', 'aria-label': 'وضعیت' }, ['pending', 'paid', 'rejected', 'failed', 'all'].map(s =>
    h('button', { type: 'button', 'aria-pressed': String(s === status), onclick: async () => { list.replaceChildren(await paymentTable(s)); filter.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === (STATUS_FA[s] || 'همه')))); } }, STATUS_FA[s] || 'همه')));
  const list = h('div', null, render(r.rows || []));

  async function paymentTable(s) { return render((await api(`/api/admin/payments?status=${s}`)).rows || []); }
  function render(rows) {
    return table(['زمان', 'مشتری', 'روش', 'مبلغ (تومان)', 'اطلاعات واریز / مرجع', 'وضعیت', ''], rows.map(p => h('tr', null,
      h('td', null, when(p.created_at)),
      h('td', null, h('button', { class: 'btn line sm', onclick: () => openUser(p.user_id) }, p.name), h('div', { class: 'small muted ltr' }, p.email || p.mobile)),
      h('td', null, PROVIDER_FA[p.provider]), h('td', null, h('strong', null, toman(p.amount))),
      h('td', { class: 'small' }, p.receipt || p.ref_id || '—', p.note ? h('div', { class: 'muted' }, p.note) : null),
      h('td', null, pill(p.status, STATUS_FA[p.status])),
      h('td', null, p.status === 'pending' && p.provider === 'manual' ? h('div', { class: 'row' },
        h('button', { class: 'btn primary sm', onclick: () => review(p, 'approve') }, 'تأیید و شارژ'),
        h('button', { class: 'btn danger sm', onclick: () => review(p, 'reject') }, 'رد')) : ''))), 'موردی نیست.');
  }
  async function review(p, decision) {
    const msg = decision === 'approve'
      ? `واریز ${toman(p.amount)} تومان را در حساب بانکی دیدید؟ با تأیید، این مبلغ به اعتبار «${p.name}» افزوده می‌شود.`
      : `درخواست ${toman(p.amount)} تومانی «${p.name}» رد شود؟`;
    if (!confirm(msg)) return;
    const note = decision === 'reject' ? prompt('دلیل رد (به مشتری نمایش داده می‌شود):') : '';
    if (note === null) return;
    const x = await api('/api/admin/payments/review', { id: p.id, decision, note });
    if (!x.ok) return toast(errText(x));
    toast(decision === 'approve' ? 'اعتبار افزوده شد' : 'رد شد');
    route();
  }
  return [pageHead('پرداخت‌ها', filter), h('div', { class: 'card' }, list)];
}

async function users() {
  const q = h('input', { type: 'search', placeholder: 'جست‌وجو: نام، ایمیل یا موبایل', 'aria-label': 'جست‌وجوی مشتری' });
  const list = h('div');
  let timer;
  const load = async () => {
    const r = await api('/api/admin/users?q=' + encodeURIComponent(latin(q.value)));
    list.replaceChildren(table(['#', 'نام', 'ایمیل / موبایل', 'موجودی (تومان)', 'کلید فعال', 'آخرین درخواست', 'وضعیت'], (r.rows || []).map(u =>
      h('tr', { class: 'click', tabindex: 0, onclick: () => openUser(u.id), onkeydown: e => e.key === 'Enter' && openUser(u.id) },
        h('td', null, num(u.id)), h('td', null, u.name), h('td', { class: 'ltr small' }, u.email || u.mobile),
        h('td', null, toman(u.balance)), h('td', null, num(u.keys)), h('td', null, when(u.last_request)), h('td', null, pill(u.status, STATUS_FA[u.status])))), 'مشتری‌ای پیدا نشد.'));
  };
  q.oninput = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
  await load();
  return [pageHead('مشتریان'), h('div', { class: 'card stack' }, q, list)];
}

async function openUser(id) {
  const dlg = $('#userDlg');
  const r = await api('/api/admin/user?id=' + id);
  if (!r.ok) return toast(errText(r));
  const u = r.user;
  const amount = h('input', { type: 'text', inputmode: 'numeric', class: 'ltr', id: 'adjAmount', placeholder: 'مثلاً 50000 یا -50000' });
  const note = h('input', { type: 'text', id: 'adjNote', placeholder: 'دلیل (الزامی): هدیه، جبران خطا…' });
  const adjust = h('form', { class: 'row end', onsubmit: async e => {
    e.preventDefault();
    const t = Number(latin(amount.value).replace(/[^\d-]/g, ''));
    if (!t) return toast('مبلغ را وارد کنید');
    if (!confirm(`${t > 0 ? 'افزودن' : 'کسر'} ${toman(Math.abs(t) * 10)} تومان ${t > 0 ? 'به' : 'از'} حساب «${u.name}»؟`)) return;
    const x = await api('/api/admin/adjust', { accountId: u.account_id, amount: t * 10, note: note.value });
    if (!x.ok) return toast(errText(x));
    toast('ثبت شد');
    openUser(id);
  } }, h('div', { class: 'grow' }, h('label', { for: 'adjAmount' }, 'اصلاح اعتبار (تومان؛ منفی برای کسر)'), amount),
    h('div', { class: 'grow' }, h('label', { for: 'adjNote' }, 'توضیح'), note), h('button', { class: 'btn' }, 'ثبت'));
  const toggle = h('button', { class: u.status === 'active' ? 'btn danger sm' : 'btn line sm', onclick: async () => {
    const next = u.status === 'active' ? 'suspended' : 'active';
    if (!confirm(next === 'suspended' ? 'حساب غیرفعال شود؟ مشتری خارج می‌شود و کلیدهایش کار نمی‌کنند.' : 'حساب دوباره فعال شود؟')) return;
    const x = await api('/api/admin/users/status', { id: u.id, status: next });
    if (!x.ok) return toast(errText(x));
    openUser(id); if (location.hash.startsWith('#users')) route();
  } }, u.status === 'active' ? 'غیرفعال‌کردن حساب' : 'فعال‌کردن دوباره');

  dlg.replaceChildren(
    h('div', { class: 'row between' }, h('h2', { id: 'userDlgTitle' }, u.name, ' ', pill(u.status, STATUS_FA[u.status])), h('button', { class: 'btn line sm', onclick: () => dlg.close() }, 'بستن')),
    h('p', { class: 'small muted' }, h('span', { class: 'ltr' }, [u.email, u.mobile].filter(Boolean).join(' · ')), ' — عضویت: ', when(u.created_at)),
    h('div', { class: 'grid g3' }, tile('موجودی', toman(u.balance), 'تومان'), tile('رزرو', toman(u.held), 'تومان'), h('div', { class: 'card tile' }, h('div', { class: 'label' }, 'وضعیت'), toggle)),
    h('div', { class: 'card' }, adjust),
    h('div', { class: 'card' }, h('h2', null, 'گردش حساب'), table(['زمان', 'نوع', 'مبلغ', 'شرح', 'انجام‌دهنده'], r.ledger.map(l => h('tr', null,
      h('td', null, when(l.created_at)), h('td', null, KIND_FA[l.kind]), h('td', null, signed(l.amount)), h('td', { class: 'small' }, l.note || l.ref || ''), h('td', { class: 'small muted' }, l.actor))))),
    h('div', { class: 'card' }, h('h2', null, 'پرداخت‌ها'), table(['زمان', 'روش', 'مبلغ', 'وضعیت', 'مرجع'], r.payments.map(p => h('tr', null,
      h('td', null, when(p.created_at)), h('td', null, PROVIDER_FA[p.provider]), h('td', null, toman(p.amount)), h('td', null, pill(p.status, STATUS_FA[p.status])), h('td', { class: 'small' }, p.ref_id || p.receipt || '—'))))),
    h('div', { class: 'card' }, h('h2', null, 'کلیدها'), table(['نام', 'شناسه', 'آخرین استفاده', 'وضعیت'], r.keys.map(k => h('tr', null,
      h('td', null, k.name), h('td', { class: 'mono' }, k.prefix + '…'), h('td', null, when(k.last_used_at)), h('td', null, k.revoked_at ? pill('revoked', 'باطل') : pill('active', 'فعال')))))),
  );
  dlg.querySelectorAll('.card').forEach(c => c.style.marginTop = '14px');
  if (!dlg.open) dlg.showModal();
}

async function waitlist() {
  const r = await api('/api/admin/signups');
  const s = r.stats || {};
  const STAT = ['new', 'approved', 'invited', 'rejected'];
  return [
    pageHead('فهرست انتظار', h('a', { class: 'btn line', href: '/api/admin/signups.csv' }, 'خروجی Excel (CSV)')),
    h('div', { class: 'grid g4' }, tile('کل', num(s.total)), tile('۷ روز اخیر', num(s.last7)), tile('جدید', num(s.new)), tile('دعوت‌شده', num(s.invited))),
    h('div', { class: 'card' }, table(['زمان', 'نام', 'ایمیل / موبایل', 'نقش و کاربرد', 'منبع', 'وضعیت', 'یادداشت'], (r.items || []).map(x => {
      const sel = h('select', { 'aria-label': 'وضعیت', onchange: async () => { const y = await api('/api/admin/signups/update', { email: x.email, status: sel.value }); toast(y.ok ? 'ذخیره شد' : errText(y)); } },
        STAT.map(v => h('option', { value: v, selected: (x.status || 'new') === v }, STATUS_FA[v])));
      const note = h('input', { type: 'text', value: x.note || '', 'aria-label': 'یادداشت', onchange: async () => { const y = await api('/api/admin/signups/update', { email: x.email, note: note.value }); toast(y.ok ? 'ذخیره شد' : errText(y)); } });
      return h('tr', null, h('td', null, when(x.createdAt)), h('td', null, x.name), h('td', { class: 'ltr small' }, x.email, h('br'), x.mobile),
        h('td', { class: 'small' }, x.role || '', x.usecase ? h('div', { class: 'muted' }, x.usecase) : null), h('td', { class: 'small' }, x.source), h('td', null, sel), h('td', null, note));
    }), 'هنوز ثبت‌نامی نیست.')),
  ];
}

async function audit() {
  const r = await api('/api/admin/audit');
  return [pageHead('گزارش رویدادها'), h('div', { class: 'card' }, table(['زمان', 'انجام‌دهنده', 'رویداد', 'هدف', 'جزئیات', 'IP'], (r.rows || []).map(a => h('tr', null,
    h('td', null, when(a.created_at)), h('td', { class: 'small' }, a.actor), h('td', null, a.action), h('td', { class: 'small ltr' }, a.target || ''),
    h('td', { class: 'mono small' }, a.detail ? JSON.stringify(a.detail) : ''), h('td', { class: 'small ltr' }, a.ip || '')))))];
}

start();
