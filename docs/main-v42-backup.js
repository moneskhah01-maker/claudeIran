import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduce = reduceMQ.matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const fa = n => Number(n).toLocaleString('fa-IR');
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const cleanups = [];

/* ----------------------------------------------------------
   Smooth scroll — Lenis is the only smooth-scroll engine.
   Skipped entirely under prefers-reduced-motion.
---------------------------------------------------------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = time => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  cleanups.push(() => { gsap.ticker.remove(tick); lenis.destroy(); });
}
const headerOffset = () => -(($('[data-header]')?.offsetHeight || 72) + 12);
function scrollToTarget(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: headerOffset() });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/* ----------------------------------------------------------
   Header: solid on scroll, mobile menu, anchor links, active link
---------------------------------------------------------- */
const header = $('[data-header]');
const onScroll = () => header?.classList.toggle('is-solid', window.scrollY > 24);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const nav = $('#nav');
const navToggle = $('[data-nav-toggle]');
function setMenu(open) {
  if (!nav || !navToggle) return;
  nav.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? navToggle.dataset.labelClose : navToggle.dataset.labelOpen);
}
navToggle?.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav?.classList.contains('is-open')) { setMenu(false); navToggle.focus(); } });

document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  scrollToTarget(target);
  history.replaceState(null, '', `#${id}`);
  // move focus for keyboard and screen-reader users without a visible jump
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

const navLinks = $$('#nav a[href^="#"]');
if ('IntersectionObserver' in window && navLinks.length) {
  const map = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.removeAttribute('aria-current'));
      map.get(en.target.id)?.setAttribute('aria-current', 'true'); // sections outside the nav clear the highlight
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach(s => io.observe(s));
  cleanups.push(() => io.disconnect());
}

/* ----------------------------------------------------------
   Split headings into words (Persian words stay intact; runs of
   Latin words are kept together so bidi order is preserved).
   The original text stays as the accessible name.
---------------------------------------------------------- */
function splitWords(el) {
  if (el.dataset.splitDone) return [];
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  // Walk the authored markup: words keep their weight (<b> = strong), <br> stays a line break,
  // and a word that touches the previous node without a space is glued to it.
  const tokens = [];
  let spaceBefore = true;
  const walk = (node, strong) => {
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) {
        const s = n.textContent;
        s.split(/\s+/).forEach((w, i) => {
          if (!w) return;
          tokens.push({ w, strong, glue: i === 0 && !/^\s/.test(s) && !spaceBefore && tokens.length > 0 });
        });
        if (s.trim()) spaceBefore = /\s$/.test(s); else if (s) spaceBefore = true;
      } else if (n.nodeName === 'BR') { tokens.push({ br: n.className }); spaceBefore = true; }
      else if (n.nodeType === 1) walk(n, strong || n.nodeName === 'B' || n.nodeName === 'STRONG');
    });
  };
  walk(el, false);
  const chunks = [];
  for (const t of tokens) {
    if ('br' in t) { chunks.push({ br: t.br }); continue; }
    // Persian punctuation glued to a Latin word («API،») is split off, so the Latin run keeps its order
    const m = t.w.match(/^(.*[A-Za-z0-9])([،؛:.!؟]+)$/);
    const core = m && !/[؀-ۿ]/.test(m[1]) ? m[1] : t.w;
    const tail = core !== t.w ? m[2] : '';
    const latin = /[A-Za-z0-9]/.test(core) && !/[؀-ۿ]/.test(core);
    const last = chunks[chunks.length - 1];
    if (latin && last && last.latin && last.strong === t.strong && !t.glue) last.text += ' ' + core;
    else chunks.push({ text: core, latin, strong: t.strong, glue: t.glue });
    if (tail) chunks.push({ text: tail, latin: false, strong: t.strong, glue: true });
  }
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;
  const vis = document.createElement('span');
  vis.setAttribute('aria-hidden', 'true');
  const inner = [];
  chunks.forEach((c, i) => {
    if ('br' in c) { const b = document.createElement('br'); if (c.br) b.className = c.br; vis.appendChild(b); return; }
    const w = document.createElement('span');
    w.className = c.strong ? 'split-word is-strong' : 'split-word';
    if (c.latin) w.dir = 'ltr';
    const s = document.createElement('span');
    s.textContent = c.text;
    w.appendChild(s);
    vis.appendChild(w);
    const next = chunks[i + 1];
    if (next && !next.glue && !('br' in next)) vis.appendChild(document.createTextNode(' '));
    inner.push(s);
  });
  el.replaceChildren(sr, vis);
  el.dataset.splitDone = '1';
  return inner;
}

/* ----------------------------------------------------------
   Hero intro — the one orchestrated moment
---------------------------------------------------------- */
const intro = $$('[data-intro]');
const heroTitle = $('[data-hero-title]');
const consoleEl = $('[data-console]');
let demo = null;

const widgets = $$('[data-widget]');
const introPending = root.classList.contains('js-intro');
if (reduce || !introPending) {
  root.classList.remove('js-intro');
} else {
  const words = heroTitle ? splitWords(heroTitle) : [];
  gsap.set(intro, { autoAlpha: 0, y: 18 });
  gsap.set(words, { autoAlpha: 0, yPercent: 40 });
  gsap.set(widgets, { autoAlpha: 0, y: 34, scale: .97 });
  root.classList.remove('js-intro');
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: .12 });
  tl.to('[data-header]', { autoAlpha: 1, duration: .5 }, 0)
    .to('[data-intro="status"]', { autoAlpha: 1, y: 0, duration: .6 }, .05)
    .to(heroTitle, { autoAlpha: 1, y: 0, duration: .01 }, .15)
    .to(words, { autoAlpha: 1, yPercent: 0, duration: .8, stagger: .055 }, .18)
    .to('[data-intro="lead"]', { autoAlpha: 1, y: 0, duration: .7 }, '-=.45')
    .to('[data-intro="ctas"]', { autoAlpha: 1, y: 0, duration: .6 }, '-=.5')
    .to('[data-intro="proofs"]', { autoAlpha: 1, y: 0, duration: .6 }, '-=.45')
    .to(widgets, { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: 'expo.out', stagger: .1, clearProps: 'transform' }, .35);
}
// the live request demo starts when the product window comes into view
if (consoleEl && !reduce) {
  ScrollTrigger.create({ trigger: consoleEl, start: 'top 78%', once: true, onEnter: () => setTimeout(() => demo?.play(), 250) });
}

/* ----------------------------------------------------------
   Live metered request demo
---------------------------------------------------------- */
function createDemo(box) {
  const out = $('[data-stream]', box);
  const full = out.textContent.trim();
  const steps = Object.fromEntries($$('[data-step]', box).map(s => [s.dataset.step, s]));
  const tin = $('[data-tin]', box), tout = $('[data-tout]', box);
  const held = $('.held', box), spent = $('.spent', box), note = $('[data-wallet-note]', box);
  const replay = $('[data-replay]', box);
  const inTokens = Number(box.dataset.inTokens || 64);
  const tokens = full.match(/\S+\s*/g) || [full];
  const outFinal = Number(box.dataset.outFinal || Math.round(tokens.length * 1.7));
  const live = $('[data-live]', box);
  const label = replay?.querySelector('span');
  let timer = null, running = false, announce = false;
  const setLabel = playing => { if (label) label.textContent = playing ? replay.dataset.labelPause : replay.dataset.labelReplay; };

  const setStep = (name, state) => { const s = steps[name]; if (!s) return; s.classList.remove('is-on', 'is-live', 'is-ok'); if (state) { s.classList.add(...state.split(' ')); if (announce && live && (state.includes('is-ok') || state.includes('is-live'))) live.textContent = (live.dataset.prefix || '') + (s.dataset.liveText || ''); } };
  function finalState() {
    clearTimeout(timer);
    running = false; setLabel(false);
    out.textContent = full;
    box.classList.add('is-done');
    setStep('reserve', 'is-on is-ok'); setStep('stream', 'is-on is-ok'); setStep('settle', 'is-on is-ok');
    tin.textContent = fa(inTokens); tout.textContent = fa(outFinal);
    held.style.width = '0%'; spent.style.width = '9%';
    note.textContent = note.dataset.settled;
  }
  function reset() {
    clearTimeout(timer);
    out.textContent = '';
    box.classList.remove('is-done');
    ['reserve', 'stream', 'settle'].forEach(n => setStep(n, ''));
    tin.textContent = fa(0); tout.textContent = fa(0);
    held.style.width = '0%'; spent.style.width = '0%';
    note.textContent = '';
  }
  function play() {
    if (running) return;
    running = true; announce = true; setLabel(true);
    reset();
    let i = 0;
    const later = (fn, ms) => { timer = setTimeout(fn, ms); };
    later(() => {
      setStep('reserve', 'is-on');
      tin.textContent = fa(inTokens);
      held.style.width = '26%';
      note.textContent = note.dataset.held;
      later(() => {
        setStep('reserve', 'is-on is-ok');
        setStep('stream', 'is-on is-live');
        const next = () => {
          if (document.hidden) { later(next, 200); return; }
          out.textContent += tokens[i++];
          tout.textContent = fa(Math.round(i / tokens.length * outFinal));
          if (i < tokens.length) later(next, 38 + Math.random() * 46);
          else later(() => {
            setStep('stream', 'is-on is-ok');
            setStep('settle', 'is-on is-ok');
            box.classList.add('is-done');
            held.style.width = '0%'; spent.style.width = '9%';
            note.textContent = note.dataset.settled;
            running = false; setLabel(false);
          }, 420);
        };
        next();
      }, 650);
    }, 350);
  }
  // while streaming the button stops the demo (WCAG 2.2.2); afterwards it replays it
  replay?.addEventListener('click', () => { if (running || reduce) finalState(); else play(); });
  cleanups.push(() => clearTimeout(timer));
  return { play, finalState, reset };
}
if (consoleEl) {
  demo = createDemo(consoleEl);
  if (reduce) demo.finalState(); else demo.reset();
}

/* pointer tilt — additive, fine pointers only */
const heroDemo = $('[data-tilt]');
if (heroDemo && consoleEl && finePointer && !reduce) {
  const rx = gsap.quickTo(consoleEl, 'rotationX', { duration: .6, ease: 'power3.out' });
  const ry = gsap.quickTo(consoleEl, 'rotationY', { duration: .6, ease: 'power3.out' });
  let raf = 0;
  const move = e => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = heroDemo.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      rx(-py * 5); ry(px * 6);
    });
  };
  const reset = () => { rx(0); ry(0); };
  heroDemo.addEventListener('pointermove', move);
  heroDemo.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  cleanups.push(() => { heroDemo.removeEventListener('pointermove', move); heroDemo.removeEventListener('pointerleave', reset); window.removeEventListener('blur', reset); });
}

/* ----------------------------------------------------------
   Section headings — word-by-word reveal, restrained
---------------------------------------------------------- */
if (!reduce) {
  $$('.sec-head h2').forEach(h => {
    const w = splitWords(h);
    gsap.set(w, { autoAlpha: 0, y: '0.45em' });
    ScrollTrigger.create({
      trigger: h, start: 'top 86%', once: true,
      onEnter: () => {
        gsap.to(w, { autoAlpha: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .045, onComplete: () => gsap.set(w, { clearProps: 'transform' }) });
        const p = h.parentElement.querySelector('p');
        if (p) gsap.fromTo(p, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .7, delay: .25, ease: 'power2.out' });
      },
    });
  });
}

/* ----------------------------------------------------------
   Hero stage — the product tilts up and settles flat as you scroll
   (transform on the stage; pointer tilt stays on the console)
---------------------------------------------------------- */
const stage = $('[data-tilt]');
if (stage && !reduce) {
  gsap.fromTo(stage, { rotationX: 14, scale: .94, y: 30 }, {
    rotationX: 0, scale: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: stage, start: 'top 100%', end: 'top 30%', scrub: .6 },
  });
}

/* ----------------------------------------------------------
   Billing lifecycle — pinned on desktop, scrubbed step by step
---------------------------------------------------------- */
const lc = $('[data-lifecycle]');
if (lc && !reduce) {
  const fill = $('.lc-fill', lc);
  const steps = $$('.lc-step', lc);
  const pinEl = $('[data-billing-stage]') || lc;
  const update = p => {
    gsap.set(fill, { scaleX: p });
    steps.forEach((s, i) => s.classList.toggle('is-on', p >= i / steps.length + .02));
  };
  gsap.set(fill, { scaleX: 0 });
  steps.forEach(s => s.classList.remove('is-on'));
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1081px) and (min-height: 860px)', () => {
    const st = ScrollTrigger.create({ trigger: pinEl, start: 'top top+=96', end: '+=130%', pin: true, pinSpacing: true, scrub: .5, onUpdate: s => update(s.progress) });
    return () => st.kill();
  });
  mm.add('(max-width: 1080px), (max-height: 859px)', () => {
    const st = ScrollTrigger.create({ trigger: lc, start: 'top 80%', end: 'bottom 55%', scrub: .5, onUpdate: s => update(s.progress) });
    return () => st.kill();
  });
  cleanups.push(() => mm.revert());
}

/* ----------------------------------------------------------
   Glass spotlight — a soft highlight follows the pointer on glass tiles
---------------------------------------------------------- */
if (finePointer && !reduce) {
  let raf = 0, last = null;
  const onMove = e => {
    last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const t = last.target.closest?.('.card, .compare, .lc-panel');
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${last.clientX - r.left}px`);
      t.style.setProperty('--my', `${last.clientY - r.top}px`);
    });
  };
  document.addEventListener('pointermove', onMove, { passive: true });
  cleanups.push(() => document.removeEventListener('pointermove', onMove));
}

/* ----------------------------------------------------------
   Ambient light drifts slightly with scroll (one scrub, whole page)
---------------------------------------------------------- */
if (!reduce) {
  const orbs = $$('.ambient i');
  if (orbs.length) {
    gsap.to(orbs[0], { yPercent: 18, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1 } });
    gsap.to(orbs[1], { yPercent: -22, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1 } });
  }
}

/* ----------------------------------------------------------
   Toasts (aria-live)
---------------------------------------------------------- */
const toastRegion = $('#toasts');
const okIcon = $('#tpl-ok')?.innerHTML || '';
const warnIcon = $('#tpl-warn')?.innerHTML || '';
function toast(msg, warn = false) {
  if (!toastRegion || !msg) return;
  const t = document.createElement('div');
  t.className = 'toast' + (warn ? ' is-warn' : '');
  t.innerHTML = warn ? warnIcon : okIcon;
  const span = document.createElement('span'); span.textContent = msg; t.appendChild(span);
  toastRegion.appendChild(t);
  while (toastRegion.children.length > 3) toastRegion.firstElementChild.remove();
  setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 300); }, 3200);
}

/* ----------------------------------------------------------
   Key settings demo
---------------------------------------------------------- */
const kp = $('[data-keypanel]');
if (kp) {
  const codeEl = $('[data-key-code]', kp), stateEl = $('[data-key-state]', kp);
  const rotateBtn = $('[data-act="rotate"]', kp), revokeBtn = $('[data-act="revoke"]', kp);
  const rows = $$('.kp-row', kp);
  const dlgRevoke = $('#dlg-revoke'), dlgRotate = $('#dlg-rotate');
  const newKeyEl = $('[data-new-key]', dlgRotate);
  const rand = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  const mask = s => `key_••••••••${s}`;
  let revoked = false, lastTrigger = null;
  const openDlg = (d, trigger) => { lastTrigger = trigger; lenis?.stop(); if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); };
  const closeDlg = d => { if (d.close) d.close(); else d.removeAttribute('open'); lenis?.start(); lastTrigger?.focus(); };
  [dlgRevoke, dlgRotate].forEach(d => d?.addEventListener('close', () => lenis?.start()));
  [dlgRevoke, dlgRotate].forEach(d => d?.addEventListener('click', e => { if (e.target === d) closeDlg(d); }));

  rotateBtn.addEventListener('click', () => {
    const tail = rand();
    codeEl.textContent = mask(tail);
    newKeyEl.textContent = `key_demo_••••••••••••${tail}`;
    if (revoked) {
      revoked = false;
      stateEl.textContent = stateEl.dataset.active; stateEl.classList.remove('is-revoked');
      rows.forEach(r => { r.classList.remove('is-disabled'); r.inert = false; });
      revokeBtn.disabled = false;
    }
    openDlg(dlgRotate, rotateBtn);
  });
  $('[data-dlg-done]', dlgRotate).addEventListener('click', () => { closeDlg(dlgRotate); toast(kp.dataset.msgRotate); });
  $('[data-dlg-copy]', dlgRotate).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(newKeyEl.textContent); toast(kp.dataset.msgCopied); }
    catch { const r = document.createRange(); r.selectNodeContents(newKeyEl); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  });
  revokeBtn.addEventListener('click', () => openDlg(dlgRevoke, revokeBtn));
  $('[data-dlg-cancel]', dlgRevoke).addEventListener('click', () => closeDlg(dlgRevoke));
  $('[data-dlg-confirm]', dlgRevoke).addEventListener('click', () => {
    revoked = true;
    stateEl.textContent = stateEl.dataset.revoked; stateEl.classList.add('is-revoked');
    rows.forEach(r => { r.classList.add('is-disabled'); r.inert = true; });
    revokeBtn.disabled = true;
    if (dlgRevoke.close) dlgRevoke.close(); else dlgRevoke.removeAttribute('open');
    lenis?.start();
    toast(kp.dataset.msgRevoke, true);
    rotateBtn.focus();
  });

  $$('input[data-model]', kp).forEach(inp => inp.addEventListener('change', () => {
    toast((inp.checked ? kp.dataset.msgModelOn : kp.dataset.msgModelOff).replace('{model}', inp.dataset.model));
  }));
  const budget = $('[data-budget]', kp), budgetOut = $('[data-budget-out]', kp);
  const paintBudget = () => {
    const v = Number(budget.value);
    budgetOut.textContent = `${fa(v)} ${budget.dataset.unit}`;
    budget.style.setProperty('--fill', `${((v - budget.min) / (budget.max - budget.min)) * 100}%`);
    budget.setAttribute('aria-valuetext', budgetOut.textContent);
  };
  budget.addEventListener('input', paintBudget);
  budget.addEventListener('change', () => toast(kp.dataset.msgBudget.replace('{value}', budgetOut.textContent)));
  paintBudget();
  $('[data-cap]', kp)?.addEventListener('change', e => toast(kp.dataset.msgCap.replace('{value}', e.target.selectedOptions[0].textContent.replace(/\s*توکن\s*$/, '').trim())));
  const roleHint = $('[data-role-hint]', kp);
  $('[data-role]', kp)?.addEventListener('change', e => {
    const opt = e.target.selectedOptions[0];
    if (roleHint) roleHint.textContent = opt.dataset.hint || '';
    toast(kp.dataset.msgRole.replace('{value}', opt.textContent.trim()));
  });
}

/* ----------------------------------------------------------
   Code tabs + copy
---------------------------------------------------------- */
$$('[data-tabs]').forEach(box => {
  const tabs = $$('[role="tab"]', box);
  const select = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  select(tabs[0]);
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      // RTL: ArrowLeft moves forward, ArrowRight moves back
      const dir = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); const t2 = e.key === 'Home' ? tabs[0] : tabs[tabs.length - 1]; select(t2); t2.focus(); return; }
      if (!dir) return;
      e.preventDefault();
      const n = tabs[(i + dir + tabs.length) % tabs.length]; select(n); n.focus();
    });
  });
  const copy = $('[data-copy]', box);
  copy?.addEventListener('click', async () => {
    const panel = $('[role="tabpanel"]:not([hidden]) pre', box);
    const label = copy.querySelector('span');
    try {
      await navigator.clipboard.writeText(panel.textContent);
      label.textContent = copy.dataset.done;
    } catch {
      const r = document.createRange(); r.selectNodeContents(panel); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      label.textContent = copy.dataset.manual;
    }
    setTimeout(() => { label.textContent = copy.dataset.label; }, 1800);
  });
});

/* ----------------------------------------------------------
   Early-access form
---------------------------------------------------------- */
const form = $('#join-form');
if (form) {
  const card = form.closest('.form-card');
  const alertBox = $('[data-form-alert]', form);
  const submit = $('button[type="submit"]', form);
  const toLatin = s => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  // each rule returns null when valid, otherwise 'required' or 'invalid' (message text lives in the markup)
  const rules = {
    name: v => { const t = v.trim(); return !t ? 'required' : t.length < 2 || t.length > 80 ? 'invalid' : null; },
    email: v => { const t = v.trim(); return !t ? 'required' : /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(t) ? null : 'invalid'; },
    mobile: v => (!v.trim() || /^(?:\+98|0098|0)?9\d{9}$/.test(toLatin(v).replace(/[\s-]/g, ''))) ? null : 'invalid',
    role: v => v ? null : 'required',
    usecase: v => { const t = v.trim(); return !t || t.length < 10 ? 'required' : t.length > 500 ? 'invalid' : null; },
    consent: (_, el) => el.checked ? null : 'required',
  };
  const fieldOf = name => form.elements[name]?.closest('.field, .consent');
  function mark(name, problem) {
    const el = form.elements[name], f = fieldOf(name);
    const err = f?.querySelector('.err');
    if (err) err.textContent = problem ? (err.dataset[problem] || err.dataset.invalid || err.dataset.required || '') : '';
    f?.classList.toggle('has-error', !!problem);
    el.setAttribute('aria-invalid', String(!!problem));
    return !problem;
  }
  const check = name => { const el = form.elements[name]; return mark(name, rules[name](el.value ?? '', el)); };
  Object.keys(rules).forEach(n => {
    const el = form.elements[n];
    el?.addEventListener('blur', () => { if (n !== 'consent' && el.value) check(n); });
    el?.addEventListener('input', () => { if (fieldOf(n)?.classList.contains('has-error')) check(n); });
    el?.addEventListener('change', () => { if (fieldOf(n)?.classList.contains('has-error')) check(n); });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    alertBox.classList.remove('is-on');
    alertBox.textContent = '';
    const bad = Object.keys(rules).filter(n => !check(n));
    if (bad.length) { form.elements[bad[0]].focus(); return; }
    const data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      mobile: toLatin(form.elements.mobile.value).replace(/[\s-]/g, ''),
      role: form.elements.role.value,
      usecase: form.elements.usecase.value.trim(),
      consent: form.elements.consent.checked,
      website: form.elements.website.value,
    };
    form.classList.add('is-submitting');
    submit.disabled = true;
    const label = submit.querySelector('[data-label]');
    label.textContent = submit.dataset.busy;
    try {
      const res = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json().catch(() => ({}));
      if (res.status === 422 && json.errors) {
        const keys = Object.keys(json.errors);
        keys.forEach(k => { if (form.elements[k]) mark(k, 'invalid'); });
        form.elements[keys[0]]?.focus();
        return;
      }
      if (!res.ok || !json.ok) throw Object.assign(new Error('failed'), { kind: res.status === 429 ? 'rate' : 'server' });
      card.classList.add('is-done');
      const done = $('[data-success]', card);
      done.querySelector('[data-dup]').hidden = !json.duplicate;
      const tNew = done.querySelector('[data-title-new]'), tDup = done.querySelector('[data-title-dup]');
      if (tNew && tDup) { tNew.hidden = !!json.duplicate; tDup.hidden = !json.duplicate; }
      done.querySelectorAll('[data-sent-email]').forEach(n => { n.textContent = data.email; });
      done.setAttribute('tabindex', '-1');
      done.focus();
    } catch (err) {
      const kind = err?.kind || 'network';
      setTimeout(() => { alertBox.textContent = alertBox.dataset[kind] || alertBox.dataset.network; alertBox.classList.add('is-on'); }, 60);
    } finally {
      form.classList.remove('is-submitting');
      submit.disabled = false;
      label.textContent = submit.dataset.label;
    }
  });
}

const yr = $('[data-year]');
if (yr) { try { const y = new Date().toLocaleDateString('fa-IR', { year: 'numeric' }); if (/[۰-۹]{4}/.test(y)) yr.textContent = y.match(/[۰-۹]{4}/)[0]; } catch {} }

/* ----------------------------------------------------------
   Measurements after fonts; cleanup on page hide
---------------------------------------------------------- */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener('load', () => ScrollTrigger.refresh());
window.addEventListener('pagehide', e => { if (e.persisted) return; cleanups.forEach(fn => { try { fn(); } catch {} }); ScrollTrigger.getAll().forEach(t => t.kill()); }, { once: true });
