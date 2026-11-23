// Blog, article and 404 pages: shared Keel styles + blog layer, early-access dialog,
// mobile menu, reading progress, table of contents, code copy and topic filters.
import './styles.css';
import './blog.css';
import { initEarlyAccess } from './early-access.js';

const root = document.documentElement;
root.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

initEarlyAccess({ source: 'blog', triggers: '[data-ea]' });

/* mobile menu */
const mb = document.getElementById('menuBtn'), mn = document.getElementById('mnav');
if (mb && mn) {
  mb.addEventListener('click', () => {
    const o = mn.classList.toggle('open');
    mb.setAttribute('aria-expanded', String(o));
    mb.setAttribute('aria-label', o ? 'بستن منو' : 'باز کردن منو');
  });
  mn.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { mn.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); }));
  addEventListener('keydown', e => { if (e.key === 'Escape' && mn.classList.contains('open')) { mn.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); mb.focus(); } });
}

/* FAQ: expose state on summary */
document.querySelectorAll('.qa details').forEach(d => {
  const su = d.querySelector('summary');
  su.setAttribute('aria-expanded', String(d.open));
  d.addEventListener('toggle', () => su.setAttribute('aria-expanded', String(d.open)));
});

/* mobile sticky CTA: after the page head, hidden over the closing CTA band and the footer */
const sc = document.getElementById('stickyCta');
if (sc && 'IntersectionObserver' in window) {
  const seen = new Map();
  const upd = () => { const on = ![...seen.values()].some(Boolean); sc.classList.toggle('show', on); sc.querySelector('a').tabIndex = on ? 0 : -1; };
  const io = new IntersectionObserver(es => { es.forEach(e => seen.set(e.target, e.isIntersecting)); upd(); });
  document.querySelectorAll('.page-hero, .post-cta, .footer').forEach(el => { seen.set(el, true); io.observe(el); });
}

/* table of contents: closed by default on narrow screens, active section follows scroll */
const toc = document.querySelector('.toc');
if (toc) {
  if (matchMedia('(max-width:1020px)').matches) toc.open = false;
  const links = [...toc.querySelectorAll('a')];
  const map = new Map(links.map(a => [decodeURIComponent(a.hash.slice(1)), a]));
  const heads = [...map.keys()].map(id => document.getElementById(id)).filter(Boolean);
  let current = null;
  const setActive = id => {
    if (id === current) return; current = id;
    links.forEach(a => { const on = map.get(id) === a; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  };
  const onScroll = () => {
    let id = heads[0]?.id;
    for (const h of heads) { if (h.getBoundingClientRect().top < 140) id = h.id; else break; }
    setActive(id);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  links.forEach(a => a.addEventListener('click', () => { if (matchMedia('(max-width:1020px)').matches) toc.open = false; }));
}

/* reading progress */
const bar = document.querySelector('.read-progress');
const article = document.getElementById('article');
if (bar && article && !reduce) {
  let raf = 0;
  const draw = () => {
    raf = 0;
    const r = article.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight * .6)));
    bar.style.setProperty('--p', p.toFixed(4));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(draw); }, { passive: true });
  addEventListener('resize', draw);
  draw();
}

/* copy buttons on code blocks */
document.querySelectorAll('[data-copy]').forEach(btn => {
  const label = btn.querySelector('span');
  btn.addEventListener('click', async () => {
    const code = btn.closest('.code')?.querySelector('pre')?.innerText ?? '';
    try { await navigator.clipboard.writeText(code); label.textContent = 'Copied'; btn.classList.add('is-done'); }
    catch { label.textContent = 'Select'; }
    setTimeout(() => { label.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1800);
  });
});

/* topic filters on /blog/ (all posts stay in the HTML for crawlers and no-JS readers) */
const filters = [...document.querySelectorAll('[data-filter]')];
if (filters.length) {
  const cards = [...document.querySelectorAll('#postCards .post-card')];
  const empty = document.getElementById('filterEmpty');
  const apply = val => {
    filters.forEach(f => f.setAttribute('aria-pressed', String(f.dataset.filter === val)));
    let shown = 0;
    // the featured article sits above the list; it joins the list only when its topic is filtered
    cards.forEach(c => { const on = 'dup' in c.dataset ? !!val && c.dataset.cluster === val : !val || c.dataset.cluster === val; c.hidden = !on; if (on) shown++; });
    if (empty) empty.hidden = shown > 0;
    // keep the 3-column grid full: when one card would be left alone, the first card spans two columns
    const vis = cards.filter(c => !c.hidden);
    cards.forEach(c => c.classList.remove('is-wide'));
    if (vis.length > 3 && vis.length % 3 === 1) vis[0].classList.add('is-wide');
    if (live) live.textContent = `${shown.toLocaleString('fa-IR')} مقاله نمایش داده می‌شود`;
  };
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  document.getElementById('postCards')?.after(live);
  apply('');
  filters.forEach(f => f.addEventListener('click', () => apply(f.dataset.filter)));
}
