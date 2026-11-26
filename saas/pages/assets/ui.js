// Shared components for /app and /admin (the console.html design system, built with h() so data is never parsed as HTML).
// createUI({ state, rerender }) binds the stateful parts (tables, filters, charts) to the page that uses them.
'use strict';

function createUI(ctx) {
const state = ctx.state;
const rerender = () => ctx.rerender();

const byId = id => document.getElementById(id);
const nfEn = new Intl.NumberFormat('en-US');
const fmt = n => nfEn.format(Math.round(Number(n) || 0));
const tmn = rial => fmt(Math.floor((Number(rial) || 0) / 10));               // Rial -> Toman
const kfmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n));
const jDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tehran' });
const jTime = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tehran' });
const jDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Tehran' });
const jWd = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'narrow', timeZone: 'Asia/Tehran' });
const dateOf = v => v ? jDate.format(new Date(v)) : '—';
const timeOf = v => v ? jTime.format(new Date(v)) : '';
const stamp = v => v ? `${dateOf(v)} · ${timeOf(v)}` : '—';
const dayDate = d => new Date(d + 'T12:00:00+03:30');
const phone = m => m ? (m.startsWith('+98') ? '0' + m.slice(3) : m) : ''; // +989121234567 -> 09121234567
function ago(v) {
  if (!v) return 'هرگز';
  const s = (Date.now() - new Date(v)) / 1000;
  if (s < 60) return 'همین حالا';
  if (s < 3600) return `${Math.floor(s / 60)} دقیقه پیش`;
  if (s < 86400) return `${Math.floor(s / 3600)} ساعت پیش`;
  if (s < 172800) return 'دیروز';
  return `${Math.floor(s / 86400)} روز پیش`;
}

function ic(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `ico ${cls}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}
const money = rial => h('span', { class: 'money' }, h('span', { class: 'num' }, tmn(rial)), ' ', h('span', { class: 'dim cur' }, 'تومان'));
const signedMoney = rial => h('span', { class: 'money' }, h('span', { class: `num amt ${rial > 0 ? 'plus' : ''}` }, (rial > 0 ? '+' : '−') + tmn(Math.abs(rial))), ' ', h('span', { class: 'dim cur' }, 'تومان'));
function st(kind, label) { // .st dot + label, same as the concept
  const cls = { ok: '', active: '', paid: '', settled: '', pending: 'off', revoked: 'off', error: 'bad', failed: 'bad', rejected: 'bad' }[kind] ?? '';
  return h('span', { class: `st ${cls}`.trim() }, h('i'), label);
}

// A password field gets an eye button that switches between hidden and visible text.
function pwToggle(input) {
  const wrap = input.closest('.pw');
  if (!wrap || wrap.querySelector('button')) return;
  const btn = h('button', { type: 'button', 'aria-label': 'نمایش رمز', 'aria-pressed': 'false' }, ic('eye'));
  btn.onclick = () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? 'پنهان کردن رمز' : 'نمایش رمز');
    btn.replaceChildren(ic(show ? 'eye-off' : 'eye'));
    input.focus();
  };
  wrap.append(btn);
}


/* ================= modal, popover, toast ================= */
let lastFocus = null;
function openModal(nodes, wide = false) {
  closePop();
  const m = byId('modal');
  m.classList.remove('closing');
  if (!m.classList.contains('open')) lastFocus = document.activeElement;
  byId('dialog').classList.toggle('wide', wide);
  byId('dlgBody').replaceChildren(...[nodes].flat(Infinity).filter(Boolean));
  m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  byId('dialog').scrollTop = 0;
  (m.querySelector('.dialog input:not([type=radio]),.dialog select') || byId('dlgClose')).focus();
}
function closeModal() {
  const m = byId('modal');
  if (!m.classList.contains('open') || m.classList.contains('closing')) return;
  const done = () => {
    m.classList.remove('open', 'closing'); m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus?.isConnected) lastFocus.focus();
  };
  if (reduced()) return done();
  m.classList.add('closing');            // panel.css plays a short fade/scale-out, then the sheet is hidden
  setTimeout(done, 180);
}
byId('dlgClose').onclick = closeModal;
byId('scrim').onclick = closeModal;
byId('dlgBody').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });

let popFor = null;
function openPop(anchor, nodes) {
  const pop = byId('pop');
  if (popFor === anchor) return closePop();
  closePop();
  pop.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  pop.classList.add('open');
  const r = anchor.getBoundingClientRect(), w = pop.offsetWidth;
  pop.style.top = `${r.bottom + 10}px`;
  pop.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2))}px`;
  anchor.setAttribute('aria-expanded', 'true');
  popFor = anchor;
}
function closePop() {
  byId('pop').classList.remove('open');
  popFor?.setAttribute('aria-expanded', 'false');
  popFor = null;
}
document.addEventListener('click', e => { if (popFor && !e.target.closest('#pop') && !popFor.contains(e.target)) closePop(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePop(); closeModal(); } });

// pointer-following sheen on glass cards (fine pointers only, as in the concept)
if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
  document.addEventListener('pointermove', e => {
    const c = e.target.closest?.('.card,.tile,.alerts,.tbl-card,.cap');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`);
    c.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}


/* ================= building blocks (concept components) ================= */
function head(eyebrow, title, sub, actions = []) {
  return h('div', { class: 'head' },
    h('div', null, h('span', { class: 'eyebrow' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), eyebrow), h('h1', null, title), h('p', null, sub)),
    h('div', { class: 'head-actions' }, actions));
}
function tile(value, label, badge, onclick) {
  const plain = /^[\d,]+$/.test(String(value));
  const inner = [h('span', { class: 'row' }, h('b', { class: 'num', 'data-count': plain ? String(value).replace(/,/g, '') : null }, value), badge || null), h('small', null, label)];
  return onclick ? h('button', { type: 'button', class: 'tile tap', onclick }, inner) : h('div', { class: 'tile' }, inner);
}
function figure(label, rial, unit, onclick, extraCls = '', badgeText = null) {
  const b = tmn(rial), cut = Math.max(0, b.length - 4);
  return h('button', { class: `figure ${extraCls}`.trim(), type: 'button', onclick },
    h('span', null, h('span', { class: 'label' }, label), h('span', { class: 'big num', 'data-count': String(Math.floor((Number(rial) || 0) / 10)), 'data-split': '' }, b.slice(0, cut), h('span', { class: 'tail' }, b.slice(cut))), h('span', { class: 'unit' }, unit)),
    badgeText ? h('span', { class: 'pill w' }, badgeText) : null);
}
const btn = (label, icon, onclick, cls = '') => h('button', { class: `btn ${cls}`.trim(), type: 'button', onclick }, icon ? ic(icon) : null, label);
const tapPill = (label, onclick) => h('button', { class: 'pill tap-pill', type: 'button', onclick }, label, ic('arrow-ur', 'flip'));
const cardHead = (title, sub, end) => h('div', { class: 'card-head' }, h('div', null, h('h2', null, title), sub ? h('p', { class: 'sub' }, sub) : null), end || null);

// Interactive bar chart: one bar per day; hover shows the day, click a bar or an axis pill pins it.
function chart(key, days, field, unit, height, label) {
  const vals = days.map(d => Number(d[field]) || 0), n = vals.length, max = Math.max(1, ...vals);
  const peak = vals.indexOf(Math.max(...vals)), sel = state.sel[key], show = sel ?? peak;
  const fmtV = v => field === 'cost' ? tmn(v) + ' تومان' : `${kfmt(v)} ${unit}`;
  const tip = h('span', { class: 'tip', 'aria-hidden': 'true' });
  const field$ = h('div', { class: 'barfield', role: 'img', 'aria-label': label });
  field$.style.height = `${height}px`;
  vals.forEach((v, i) => {
    const bar = h('i', { class: [i >= n - 7 ? 'hi' : '', sel === i ? 'sel' : ''].filter(Boolean).join(' ') || null });
    bar.style.setProperty('--h', `${Math.max(1.5, (v / max) * 100).toFixed(1)}%`);
    bar.style.setProperty('--i', i);
    field$.append(bar);
  });
  const marker = h('span', { class: 'marker hl' }, h('b', null, fmtV(vals[show])), jDay.format(dayDate(days[show].day)));
  marker.style.setProperty('--x', `${((show + .5) / n * 100).toFixed(2)}%`);
  marker.style.setProperty('--y', `${Math.min(76, (vals[show] / max) * 100).toFixed(1)}%`);
  field$.append(marker, tip);
  const idxAt = e => { const r = field$.getBoundingClientRect(); return Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * n))); };
  field$.addEventListener('pointermove', e => {
    const i = idxAt(e);
    field$.querySelectorAll('i').forEach((b, j) => b.classList.toggle('hov', j === i));
    tip.replaceChildren(h('b', null, fmtV(vals[i])), jDay.format(dayDate(days[i].day)));
    tip.style.setProperty('--x', `${((i + .5) / n * 100).toFixed(2)}%`);
    tip.classList.add('on');
  });
  field$.addEventListener('pointerleave', () => { tip.classList.remove('on'); field$.querySelectorAll('i.hov').forEach(b => b.classList.remove('hov')); });
  field$.addEventListener('click', e => { state.sel[key] = idxAt(e); rerender(); });
  const stepN = n > 10 ? Math.ceil(n / 7) : 1;
  const axis = h('div', { class: 'axis', role: 'group', 'aria-label': 'انتخاب روز' });
  for (let i = n - 1; i >= 0; i -= stepN) {
    axis.prepend(h('button', { type: 'button', class: i >= n - 7 ? 'hi' : null, 'aria-pressed': String(sel === i), 'aria-label': jDay.format(dayDate(days[i].day)),
      onclick: () => { state.sel[key] = i; rerender(); } }, n > 10 ? jDate.format(dayDate(days[i].day)).slice(5) : jWd.format(dayDate(days[i].day))));
  }
  const readout = h('p', { class: 'readout' },
    h('span', null, sel == null ? 'اوج دوره' : 'روز انتخاب‌شده', ': ', h('b', null, jDay.format(dayDate(days[show].day)), ' · ', fmtV(vals[show]))),
    sel == null ? h('span', null, 'برای بررسی، روی ستون‌ها بزنید') : h('button', { type: 'button', class: 'linkbtn', onclick: () => { delete state.sel[key]; rerender(); } }, 'نمایش اوج'));
  return [field$, axis, readout];
}


// Keel table with sorting and paging (search/filter state lives in `state`).
function ktable({ cols, rows, row, note, empty, all }) {
  const data = rows.slice();
  if (state.sort.k) {
    const c = cols.find(x => x.k === state.sort.k);
    if (c?.sort) data.sort((a, b) => { const x = c.sort(a), y = c.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * state.sort.dir; });
  }
  const pages = Math.max(1, Math.ceil(data.length / state.perPage));
  state.page = Math.min(Math.max(1, state.page), pages);
  const part = all ? data : data.slice((state.page - 1) * state.perPage, state.page * state.perPage);
  const thead = h('thead', null, h('tr', null, cols.map(c => {
    const s = state.sort.k === c.k ? (state.sort.dir > 0 ? 'ascending' : 'descending') : 'none';
    return h('th', { scope: 'col', class: c.num ? 'n' : null, 'aria-sort': c.sort ? s : null },
      c.sort ? h('button', { type: 'button', onclick: () => { state.sort = { k: c.k, dir: state.sort.k === c.k ? -state.sort.dir : 1 }; rerender(); } },
        c.label, h('span', { class: 'ar', 'aria-hidden': 'true' }, h('span', { class: 'u' }, '▲'), h('span', { class: 'd' }, '▼'))) : c.label);
  })));
  const emptyRow = h('tr', null, h('td', { colspan: cols.length }, h('div', { class: 'state' }, h('span', { class: 'itile' }, ic('empty')), h('h3', null, empty || 'نتیجه‌ای یافت نشد'),
    h('p', null, rows.length ? 'عبارت جست‌وجو یا فیلتر را تغییر دهید.' : 'هنوز موردی ثبت نشده است.'),
    state.query || state.filter !== 'all' ? h('button', { class: 'btn btn-line', type: 'button', onclick: () => { state.query = ''; state.filter = 'all'; rerender(); } }, 'پاک کردن فیلترها') : null)));
  const tbody = h('tbody', null, part.length ? part.map(r => h('tr', row ? {
    class: 'click', tabindex: 0,
    onclick: e => { if (!e.target.closest('button')) row(r); },
    onkeydown: e => { if (e.key === 'Enter' && e.target === e.currentTarget) row(r); },
  } : null, cols.map(c => h('td', { class: [c.num ? 'n' : '', c.cls || ''].join(' ').trim() || null, 'data-l': c.label }, c.cell(r))))) : emptyRow);
  [...tbody.rows].forEach((tr, n) => tr.style.setProperty('--r', Math.min(n, 12)));
  const from = data.length ? (state.page - 1) * state.perPage + 1 : 0, to = Math.min(data.length, state.page * state.perPage);
  const pageBtns = Array.from({ length: pages }, (_, i) => h('button', { type: 'button', 'aria-current': i + 1 === state.page ? 'page' : null, onclick: () => { state.page = i + 1; rerender(); } }, String(i + 1)))
    .slice(Math.max(0, state.page - 4), state.page + 3);
  const pager = all || !data.length ? null : h('div', { class: 'row' },
    h('span', { class: 'pcount' }, 'نمایش ', h('span', { class: 'num' }, `${from}–${to}`), ' از ', h('span', { class: 'num' }, String(data.length))),
    h('div', { class: 'pager', role: 'navigation', 'aria-label': 'صفحه‌بندی' },
      h('button', { type: 'button', disabled: state.page <= 1, 'aria-label': 'قبلی', onclick: () => { state.page--; rerender(); } }, '‹'),
      pageBtns,
      h('button', { type: 'button', disabled: state.page >= pages, 'aria-label': 'بعدی', onclick: () => { state.page++; rerender(); } }, '›')));
  return [h('div', { class: 'twrap' }, h('table', { class: 'kt' }, thead, tbody)), h('div', { class: 'tfoot' }, h('p', { class: 'fnote' }, note), pager)];
}
function tools(placeholder, filters, extra) {
  const input = h('input', { type: 'search', value: state.query, placeholder });
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      state.query = input.value; state.page = 1;
      await rerender();
      const q = document.querySelector('#view .search input');
      if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }, 250);
  });
  return h('div', { class: 'tools' },
    h('div', { class: 'l' }, h('label', { class: 'search' }, ic('search'), h('span', { class: 'sr-only' }, placeholder), input),
      filters.length ? h('div', { class: 'fpills', role: 'group', 'aria-label': 'فیلتر وضعیت' }, filters.map(([v, l]) =>
        h('button', { type: 'button', 'aria-pressed': String(state.filter === v), onclick: () => { state.filter = v; state.page = 1; rerender(); } }, l))) : null),
    extra || null);
}
const matches = (status, text) => (state.filter === 'all' || status === state.filter) && text.toLowerCase().includes(state.query.trim().toLowerCase());
const viewBtn = onclick => h('button', { class: 'rowbtn', type: 'button', onclick }, 'مشاهده', ic('arrow-ur', 'flip'));
function csv(name, headRow, rows) {
  const cell = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob(['﻿' + [headRow, ...rows].map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ================= motion ================= */
// Everything below is skipped when the visitor asked their system for reduced motion.
function reduced() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

// Thin progress bar at the top while a view loads; only appears if loading takes longer than 150 ms.
const bar = h('div', { class: 'navprog', 'aria-hidden': 'true' });
document.body.append(bar);
let barTimer = null;
function loading(on) {
  clearTimeout(barTimer);
  if (on) barTimer = setTimeout(() => bar.classList.add('on'), 150);
  else { bar.classList.remove('on'); }
}

// Numbers count up from zero to their value (data-count), easing out.
function countUps(root) {
  if (reduced()) return;
  for (const el of root.querySelectorAll('[data-count]')) {
    const to = Number(el.dataset.count);
    if (!Number.isFinite(to) || to <= 0) continue;
    const split = el.hasAttribute('data-split'), t0 = performance.now(), dur = 700 + Math.min(500, Math.log10(to + 1) * 60);
    const paint = v => {
      const s = fmt(v);
      if (!split) { el.textContent = s; return; }
      const cut = Math.max(0, s.length - 4);   // keep the grey "tail" of big balances while counting
      el.replaceChildren(s.slice(0, cut), h('span', { class: 'tail' }, s.slice(cut)));
    };
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      paint(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    };
    paint(0);
    requestAnimationFrame(step);
  }
}

// Replaces the view's content. On navigation (animate=true) the old view slides out and the new one in,
// from the side of the tab that was chosen (dir = 'next' | 'prev'); filtering/sorting just swaps instantly.
async function swapView(el, nodes, { animate = false, dir = 'next' } = {}) {
  const on = animate && !reduced();
  const apply = () => {
    el.replaceChildren(...[nodes].flat(Infinity).filter(Boolean));
    el.classList.toggle('enter', on);
  };
  if (!on) { apply(); return; }
  document.documentElement.dataset.dir = dir;
  if (document.startViewTransition) {
    // the browser snapshots the old view, runs apply(), then animates old -> new (see ::view-transition in panel.css)
    await document.startViewTransition(apply).updateCallbackDone;
  } else {
    apply();
    el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim');   // fallback: the concept's "rise" entrance
  }
  countUps(el);
}

// Live views refresh themselves every few seconds, quietly (no animation), but never while the visitor is
// typing, reading a sheet or menu, or the tab is in the background.
function autoRefresh(views, ms = 15000) {
  setInterval(() => {
    if (document.hidden || !views.includes(state.view)) return;
    if (byId('modal').classList.contains('open') || byId('pop').classList.contains('open')) return;
    if (document.activeElement?.matches('input,select,textarea')) return;
    if (byId('dash')?.hidden) return;
    rerender();
  }, ms);
}

// A confirm step in the console's own sheet instead of the browser's confirm() box. Resolves true/false.
function confirmModal({ title, text, action, danger = false, note }) {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    const noteIn = note ? h('input', { id: 'cNote', maxlength: 300, placeholder: note.placeholder || '' }) : null;
    openModal([
      h('h2', { id: 'dlgTitle' }, title), h('p', { class: 'mnote' }, text),
      note ? h('div', { class: 'field' }, h('label', { for: 'cNote' }, note.label), noteIn) : null,
      h('div', { class: 'f-actions' },
        h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-dark'}`, type: 'button', onclick: () => { const v = noteIn ? noteIn.value : true; finish(v === '' ? true : v); closeModal(); } }, action),
        h('button', { class: 'btn btn-line', type: 'button', 'data-close': '' }, 'انصراف')),
    ]);
    const m = byId('modal');
    const obs = new MutationObserver(() => { if (!m.classList.contains('open')) { obs.disconnect(); finish(false); } });
    obs.observe(m, { attributes: true, attributeFilter: ['class'] });
  });
}

return { byId, fmt, tmn, kfmt, jDate, jTime, jDay, jWd, dateOf, timeOf, stamp, dayDate, phone, ago, ic, money, signedMoney, st,
  pwToggle, openModal, closeModal, openPop, closePop, confirmModal, reduced, loading, countUps, swapView, autoRefresh, head, tile, figure, btn, tapPill, cardHead, chart, ktable, tools, matches, viewBtn, csv };
}
