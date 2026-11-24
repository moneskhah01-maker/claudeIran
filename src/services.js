// «خدمات و آموزش»: /services/ and /services/skills/<slug>/.
// Reuses the blog layer (menu, early-access dialog, code copy, FAQ, area filter) and adds the
// landing's scroll reveals, copy of a whole SKILL.md, the tabbed install card and click-to-load video.
import './blog.js';
import './services.css';

/* reveals (same .rv / .in contract as the landing; styles.css shows everything under reduced motion) */
const rv = [...document.querySelectorAll('.rv')];
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  rv.forEach(el => io.observe(el));
} else rv.forEach(el => el.classList.add('in'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* nav pill: the white indicator slides to the hovered link and rests on the current page (as on the landing) */
const np = document.querySelector('.navpill');
if (np) {
  let hov = null;
  const to = a => { if (!a || !a.offsetWidth) return; np.style.setProperty('--nx', a.offsetLeft + 'px'); np.style.setProperty('--nw', a.offsetWidth + 'px'); np.style.setProperty('--no', '1'); };
  const cur = () => to(hov || np.querySelector('a[aria-current]'));
  np.classList.add('ready'); cur();
  np.querySelectorAll('a').forEach(a => { a.addEventListener('pointerenter', () => { hov = a; to(a); }); a.addEventListener('focus', () => to(a)); });
  np.addEventListener('pointerleave', () => { hov = null; cur(); });
  addEventListener('resize', cur);
  document.fonts?.ready.then(cur);
}

/* area filter: an ink indicator slides between the buttons; shown cards pop in again */
const seg = document.querySelector('.seg');
if (seg) {
  const place = () => { const b = seg.querySelector('[aria-pressed="true"]'); if (!b) return; seg.style.setProperty('--tx', b.offsetLeft + 'px'); seg.style.setProperty('--tw', b.offsetWidth + 'px'); seg.style.setProperty('--to', '1'); };
  seg.classList.add('ready'); place();
  addEventListener('resize', place);
  document.fonts?.ready.then(place);
  seg.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    place();
    const shown = [...document.querySelectorAll('.sk-card:not([hidden])')];
    shown.forEach((c, i) => { c.classList.remove('in'); c.style.setProperty('--d', `${Math.min(i, 5) * 0.06}s`); });
    requestAnimationFrame(() => requestAnimationFrame(() => shown.forEach(c => c.classList.add('in'))));
  }));
}

/* gloss: pointer-following sheen + terracotta edge glow, the landing's .glow contract */
if (fine) {
  document.querySelectorAll('.sk-card,.vid,.cv-card,.file-card,.art-chip,.try-row').forEach(el => el.classList.add('glow'));
  let raf = 0, ev;
  document.addEventListener('pointermove', e => {
    ev = e; if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const el = ev.target.closest?.('.glow'); if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); el.style.setProperty('--my', (ev.clientY - r.top) + 'px'); });
  }, { passive: true });
}

/* the hero file card tilts toward the pointer */
const art = document.querySelector('.svc-art'), card = art?.querySelector('.file-card');
if (art && card && fine && !reduce) {
  let raf = 0, ev;
  art.addEventListener('pointermove', e => { ev = e; if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const r = art.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5; card.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg'); card.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg'); }); });
  art.addEventListener('pointerleave', () => { card.style.setProperty('--ry', '0deg'); card.style.setProperty('--rx', '0deg'); });
}

/* full skill text: the first lines are shown; the bar under the card opens or closes the rest.
   One eased animation drives the height frame by frame. While closing, the page scrolls in step
   so the bar stays under the pointer instead of the page jumping. */
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
document.querySelectorAll('[data-src]').forEach(box => {
  const pre = box.querySelector('pre'), btn = box.querySelector('.src-more'), label = btn.querySelector('span');
  let raf = 0;
  const collapsedHeight = () => { const lh = parseFloat(getComputedStyle(pre).lineHeight) || 24; return Math.round(lh * 18 + 34); };
  btn.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    const open = !box.classList.contains('open');
    const from = pre.getBoundingClientRect().height;
    const to = open ? pre.scrollHeight : collapsedHeight();
    const dur = reduce ? 0 : Math.min(950, 420 + Math.abs(to - from) * 0.12);
    const anchor = btn.getBoundingClientRect().top;
    pre.style.maxHeight = from + 'px';
    box.classList.toggle('open', open); // starts the shade fade; the inline height holds the size meanwhile
    btn.setAttribute('aria-expanded', String(open));
    label.textContent = open ? btn.dataset.less : btn.dataset.more;
    const t0 = performance.now();
    const step = now => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      pre.style.maxHeight = (from + (to - from) * easeInOut(k)) + 'px';
      if (!open) { const drift = btn.getBoundingClientRect().top - anchor; if (Math.abs(drift) > .5) window.scrollBy({ top: drift, behavior: 'instant' }); }
      if (k < 1) raf = requestAnimationFrame(step);
      else pre.style.maxHeight = open ? 'none' : '';
    };
    raf = requestAnimationFrame(step);
  });
});

/* sample requests: a click copies the request, ready to paste into a chat with Claude */
document.querySelectorAll('[data-copy-text]').forEach(row => {
  const label = row.querySelector('.try-copy span'), original = label.textContent;
  row.addEventListener('click', async () => {
    let ok = true;
    try { await navigator.clipboard.writeText(row.dataset.copyText); } catch { ok = false; }
    row.classList.toggle('is-done', ok);
    label.textContent = ok ? 'کپی شد' : 'کپی نشد';
    clearTimeout(row._t);
    row._t = setTimeout(() => { row.classList.remove('is-done'); label.textContent = original; }, 1800);
  });
});

/* clipboard helpers */
const flash = (btn, ok, text) => {
  const label = btn.querySelector('span');
  const original = label?.dataset.original ?? label?.textContent;
  if (label) { label.dataset.original = original; label.textContent = ok ? (text || 'کپی شد') : 'کپی نشد'; }
  btn.classList.toggle('is-done', ok);
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.classList.remove('is-done'); if (label) label.textContent = original; }, 1800);
};

/* copy a whole skill: fetch the raw SKILL.md. ClipboardItem with a promise keeps the user
   gesture alive in Safari while the file loads. */
const cache = new Map();
const load = url => cache.get(url) || cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })).get(url);
document.querySelectorAll('[data-copy-url]').forEach(btn => {
  btn.addEventListener('pointerenter', () => load(btn.dataset.copyUrl).catch(() => cache.delete(btn.dataset.copyUrl)), { once: true });
  btn.addEventListener('click', async () => {
    const url = btn.dataset.copyUrl;
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': load(url).then(t => new Blob([t], { type: 'text/plain' })) })]);
      } else {
        await navigator.clipboard.writeText(await load(url));
      }
      flash(btn, true);
    } catch {
      try { await navigator.clipboard.writeText(await load(url)); flash(btn, true); } catch { cache.delete(url); flash(btn, false); }
    }
  });
});

/* tabbed install card (WAI-ARIA tabs; in RTL ArrowLeft moves forward). The copy button copies
   the code of the visible tab and hides itself on a tab without code. */
document.querySelectorAll('[data-tabs]').forEach(box => {
  const tabs = [...box.querySelectorAll('[role="tab"]')];
  const copy = box.querySelector('[data-copy-panel]');
  const panelOf = t => document.getElementById(t.getAttribute('aria-controls'));
  // the chips beside the heading (ZIP upload, Claude Code, System prompt) are shortcuts to these tabs
  const chips = [...(box.closest('section')?.querySelectorAll('[data-tab-go]') || [])];
  const isWin = /Win/i.test(navigator.userAgentData?.platform || navigator.platform || '');
  const chipOf = id => (id === 'win' ? 'unix' : id);
  const select = (tab, focus) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panelOf(t).hidden = !on;
    });
    if (copy) copy.hidden = !panelOf(tab).querySelector('pre');
    const id = tab.id.replace('tab-', '');
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.tabGo === chipOf(id))));
    if (focus) tab.focus();
  };
  chips.forEach(c => c.addEventListener('click', () => {
    let id = c.dataset.tabGo;
    if (id === 'unix' && isWin) id = 'win';
    const tab = document.getElementById('tab-' + id);
    if (!tab) return;
    select(tab);
    // on narrow screens the card sits below the heading: bring it into view
    const r = box.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: r.height > innerHeight - 100 ? 'start' : 'center' });
    box.classList.remove('is-ping'); void box.offsetWidth; box.classList.add('is-ping');
  }));
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const next = { ArrowLeft: i + 1, ArrowRight: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  });
  copy?.addEventListener('click', async () => {
    const pre = tabs.map(panelOf).find(p => !p.hidden)?.querySelector('pre');
    if (!pre) return;
    try { await navigator.clipboard.writeText(pre.innerText); flash(copy, true); } catch { flash(copy, false); }
  });
  select(tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0]);
});

/* videos: nothing third-party loads until the visitor presses play */
document.querySelectorAll('button.vid-thumb').forEach(btn => {
  btn.addEventListener('click', () => {
    const { embed, src, title } = btn.dataset;
    let el;
    if (embed) {
      el = document.createElement('iframe');
      Object.assign(el, { src: embed, title, allowFullscreen: true });
      el.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    } else if (src) {
      el = document.createElement('video');
      Object.assign(el, { src, controls: true, autoplay: true, playsInline: true });
      el.setAttribute('aria-label', title);
    } else return;
    el.className = 'video-frame';
    btn.replaceWith(el);
    el.focus?.();
  });
});
