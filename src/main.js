// ClaudeIran landing — Keel redesign (behaviour from the redesign's page script) + early-access form.
import './styles.css';
import './blog.css';
import { initEarlyAccess, cleanPhone, PHONE_OK } from './early-access.js';

initEarlyAccess({ source: 'header', triggers: 'a[href="#early-access"], a[href="/#early-access"]' });
(function(){
 'use strict';
 var root=document.documentElement; root.classList.add('js');
 var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

 /* mobile menu */
 var mb=document.getElementById('menuBtn'), mn=document.getElementById('mnav');
 mb.addEventListener('click',function(){var o=mn.classList.toggle('open');mb.setAttribute('aria-expanded',String(o));mb.setAttribute('aria-label',o?'بستن منو':'باز کردن منو')});
 mn.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){mn.classList.remove('open');mb.setAttribute('aria-expanded','false')})});
 addEventListener('keydown',function(e){if(e.key==='Escape'&&mn.classList.contains('open')){mn.classList.remove('open');mb.setAttribute('aria-expanded','false');mb.focus()}});

 /* dense Keel bar field: n thin bars shaped from a few anchor heights; last share highlighted */
 function field(el,anchors,n,hiFrom,seed){
  var html='',s=seed||1;function rnd(){s=(s*9301+49297)%233280;return s/233280}
  for(var i=0;i<n;i++){
   var p=i/(n-1)*(anchors.length-1),k=Math.floor(p),f=p-k,a=anchors[k],b=anchors[Math.min(k+1,anchors.length-1)];
   var h=a+(b-a)*(f*f*(3-2*f));h=Math.max(8,Math.min(100,h*(.78+rnd()*.34)));
   html+='<i style="--h:'+h.toFixed(1)+'%"'+(i>=n*hiFrom?' class="hi"':'')+'></i>';
  }
  el.innerHTML=html;
 }
 /* the hero preview chart (#heroBars) is drawn by the hero console module below */

 var periods={'7':{total:'18,420',used:68,heights:[39,63,52,85,66,72,96,69,77,56],label:'۷ روز اخیر'},'30':{total:'72,680',used:84,heights:[65,43,70,48,75,58,81,73,92,83],label:'۳۰ روز اخیر'}};
 var ub=document.getElementById('usageBars');
 function setPeriod(k){var d=periods[k];field(ub,d.heights,96,.7,k==='7'?3:11);
  document.getElementById('requestCount').textContent=d.total;document.getElementById('budgetValue').textContent=d.used+'%';
  document.getElementById('budgetBar').style.width=d.used+'%';document.getElementById('periodNote').textContent=d.label;
  ub.setAttribute('aria-label','نمودار نمایشی تعداد درخواست‌ها؛ '+(k==='7'?'۷':'۳۰')+' روز اخیر');}
 setPeriod('7');
 document.querySelectorAll('[data-period]').forEach(function(btn){btn.addEventListener('click',function(){
  document.querySelectorAll('[data-period]').forEach(function(b){b.setAttribute('aria-pressed',String(b===btn))});setPeriod(btn.dataset.period);ub.classList.add('in');});});

 /* demo switches */
 document.querySelectorAll('.switch').forEach(function(s){s.addEventListener('click',function(){s.setAttribute('aria-checked',String(s.getAttribute('aria-checked')!=='true'))})});

 /* code samples (from the source page, unchanged) */
 var snippets={
  curl:'# Example only — not an active endpoint\ncurl https://api.example.com/v1/messages \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "model": "MODEL_ID",\n    "max_tokens": 1024,\n    "messages": [{"role":"user","content":"سلام"}]\n  }\'',
  node:'// Example only — replace the endpoint\nconst res = await fetch(\n  "https://api.example.com/v1/messages", {\n  method: "POST",\n  headers: {\n    Authorization: `Bearer ${process.env.API_KEY}`,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    model: "MODEL_ID", max_tokens: 1024,\n    messages: [{ role: "user", content: "سلام" }]\n  })\n});',
  python:'# Example only — replace the endpoint\nimport os, requests\n\nresponse = requests.post(\n    "https://api.example.com/v1/messages",\n    headers={"Authorization": "Bearer " + os.environ["API_KEY"]},\n    json={\n        "model": "MODEL_ID",\n        "max_tokens": 1024,\n        "messages": [{"role": "user", "content": "سلام"}]\n    },\n)'
 };
 var sel='curl',out=document.getElementById('codeOutput'),cl=document.querySelector('#copyBtn span');out.textContent=snippets[sel];
 document.querySelectorAll('[data-lang]').forEach(function(btn){btn.addEventListener('click',function(){sel=btn.dataset.lang;out.textContent=snippets[sel];
  document.querySelectorAll('[data-lang]').forEach(function(b){b.setAttribute('aria-selected',String(b===btn))});cl.textContent='کپی کد'})});
 document.getElementById('copyBtn').addEventListener('click',function(){
  if(navigator.clipboard){navigator.clipboard.writeText(snippets[sel]).then(function(){cl.textContent='کپی شد'},function(){cl.textContent='متن را انتخاب کنید'})}else{cl.textContent='متن را انتخاب کنید'}});

 /* nav pill: a white indicator slides to the hovered/focused link and rests on the current section */
 var np=document.querySelector('.navpill');
 function navTo(a){if(!np||!a||!a.offsetWidth)return;np.style.setProperty('--nx',a.offsetLeft+'px');np.style.setProperty('--nw',a.offsetWidth+'px');np.style.setProperty('--no','1')}
 var navHov=null;
 function navCur(){if(np)navTo(navHov||np.querySelector('a[aria-current="true"]'))}
 /* measure after the first frame: reading offsetLeft during start-up would force a full-page layout inside the script task */
 if(np){np.classList.add('ready');requestAnimationFrame(function(){requestAnimationFrame(navCur)});
  np.querySelectorAll('a').forEach(function(a){a.addEventListener('pointerenter',function(){navHov=a;navTo(a)});a.addEventListener('focus',function(){navTo(a)})});
  np.addEventListener('pointerleave',function(){navHov=null;navCur()});np.addEventListener('focusout',function(e){if(!np.contains(e.relatedTarget))navCur()});
  addEventListener('resize',navCur);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(navCur);}
 /* active nav pill follows scroll */
 var links=[].slice.call(document.querySelectorAll('.navpill a'));
 if('IntersectionObserver' in window)addEventListener('scroll',function once(){removeEventListener('scroll',once);
  var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.setAttribute('aria-current',String(l.getAttribute('href')==='#'+e.target.id))});if(np&&!np.matches(':hover'))navCur()}})},{rootMargin:'-45% 0px -50% 0px'});
  ['features','dashboard','how','products','developers','faq'].forEach(function(id){var el=document.getElementById(id);if(el)so.observe(el)});
 },{passive:true});

 /* FAQ: expose state on summary */
 document.querySelectorAll('.qa details').forEach(function(d){var su=d.querySelector('summary');su.setAttribute('aria-expanded',String(d.open));d.addEventListener('toggle',function(){su.setAttribute('aria-expanded',String(d.open))})});
 /* mobile sticky CTA after the hero, hidden over the sign-up form and the footer */
 var sc=document.getElementById('stickyCta'),heroEl=document.querySelector('.hero-panel'),footEl=document.querySelector('.footer'),joinEl=document.getElementById('early-access'),hv=true,fv=false,jv=false;
 function upd(){var on=!hv&&!fv&&!jv;sc.classList.toggle('show',on);sc.querySelector('a').tabIndex=on?0:-1}
 if('IntersectionObserver' in window){new IntersectionObserver(function(e){hv=e[0].isIntersecting;upd()}).observe(heroEl);new IntersectionObserver(function(e){fv=e[0].isIntersecting;upd()}).observe(footEl);if(joinEl)new IntersectionObserver(function(e){jv=e[0].isIntersecting;upd()}).observe(joinEl);}
 /* reveal */
 var rv=document.querySelectorAll('.rv,.grow');
 if(reduce||!('IntersectionObserver' in window)||/[?&]static\b/.test(location.search)){rv.forEach(function(e){e.classList.add('in')});}
 else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.08});rv.forEach(function(e){io.observe(e)});}
})();

/* ----------------------------------------------------------
   Hero console preview: working tabs, 7/30-day switch, chart hover + pinned day,
   gauge and weekly-bar read-outs, bell popover, subtle tilt and count-up.
   Sample data only (mirrors console.html). Cards get a pointer-following glow.
---------------------------------------------------------- */
(function () {
  'use strict';
  const dev = document.getElementById('dashboard-preview');
  if (!dev) return;
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STATIC = /[?&]static\b/.test(location.search);
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DAYS = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه', 'یکشنبه'];
  const SHORT = ['د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی'];
  const kfmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n));
  function series(a, n, seed) {
    let s = seed || 1; const o = []; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1) * (a.length - 1), k = Math.floor(p), f = p - k, x = a[k], y = a[Math.min(k + 1, a.length - 1)];
      o.push(Math.max(8, Math.min(100, (x + (y - x) * (f * f * (3 - 2 * f))) * (.78 + r() * .34))));
    }
    return o;
  }
  // '@status' renders a status dot, '#text' renders Latin/numeric text
  const ST = { active: ['', 'فعال'], paused: [' off', 'متوقف'], settled: ['', 'تسویه‌شده'], failed: [' bad', 'ناموفق'] };
  const cell = (v, i) => v[0] === '@' ? `<span class="st${ST[v.slice(1)][0]}"><i></i>${ST[v.slice(1)][1]}</span>` : v[0] === '#' ? `<span class="${i ? 'dim ' : ''}en">${v.slice(1)}</span>` : v;
  // tiles: [value, label, pill]; chart: [title, unit note, anchors, seed, scale, unit]; table: [title, heads, rows, console view, link label]
  const V = {
    overview: { tiles: [['68%', 'بودجه مصرف‌شده', 'ماهانه'], ['03', 'کلیدهای API فعال', 'فعال'], ['18,420', 'درخواست · ۷ روز', ''], ['1.8s', 'میانگین زمان پاسخ', '']],
      chart: ['روند مصرف API', 'توکن خروجی · نمونه', [38, 52, 47, 66, 58, 72, 63, 82, 70, 94], 7, 480, 'توکن خروجی'],
      table: ['پروژه‌های اخیر', ['پروژه', 'مدل', 'وضعیت'], [['دستیار پشتیبانی', '#Claude Sonnet', '@active'], ['استودیوی محتوا', '#Claude Haiku', '@active']], 'projects', 'همه پروژه‌ها'] },
    usage: { tiles: [['2.84M', 'توکن ورودی', '↑ 9%'], ['782K', 'توکن خروجی', '↑ 4%'], ['18,420', 'درخواست · ۷ روز', '↑ 12%'], ['1.8s', 'میانگین زمان پاسخ', '↓ 0.2s']],
      chart: ['درخواست‌های ثبت‌شده', 'درخواست · نمونه', [40, 63, 52, 85, 66, 72, 96, 69, 77, 56], 3, 40, 'درخواست'],
      table: ['مصرف به تفکیک پروژه', ['پروژه', 'درخواست', 'هزینه ماه'], [['دستیار پشتیبانی', '#5,312', '#428,400'], ['استودیوی محتوا', '#4,020', '#182,000']], 'usage', 'گزارش کامل'] },
    projects: { tiles: [['06', 'پروژه', '۴ فعال'], ['2.71M', 'سقف بودجه کل', ''], ['1.09M', 'مصرف ماه جاری', ''], ['40%', 'از سقف کل', '']],
      chart: ['هزینهٔ پروژه‌ها', 'هزینه روزانه به تومان · نمونه', [30, 36, 44, 40, 52, 58, 55, 62, 60, 70], 5, 2600, 'تومان'],
      table: ['پروژه‌ها', ['پروژه', 'مدل', 'وضعیت'], [['تحلیل بازخورد', '#Claude Sonnet', '@active'], ['دستیار داخلی', '#Claude Sonnet', '@paused']], 'projects', 'همه پروژه‌ها'] },
    keys: { tiles: [['03', 'کلید فعال', 'فعال'], ['01', 'کلید متوقف', ''], ['04', 'کل کلیدها', ''], ['2h', 'آخرین استفاده', '']],
      chart: ['استفاده از کلیدها', 'درخواست با هر کلید · نمونه', [44, 50, 48, 60, 57, 64, 61, 70, 66, 78], 9, 36, 'درخواست'],
      table: ['کلیدهای API', ['عنوان کلید', 'شناسه پنهان', 'وضعیت'], [['#Production · Support', '#•••• 2491', '@active'], ['#Development · Test', '#•••• 9028', '@paused']], 'keys', 'همه کلیدها'] },
    requests: { tiles: [['18,420', 'درخواست · ۷ روز', '↑ 12%'], ['06', 'درخواست امروز', ''], ['01', 'ناموفق', ''], ['12,480', 'هزینه req_7f3a', 'تومان']],
      chart: ['درخواست‌ها', 'درخواست · نمونه', [52, 58, 49, 70, 64, 77, 90, 72, 80, 66], 4, 40, 'درخواست'],
      table: ['درخواست‌های اخیر', ['شناسه', 'هزینه', 'وضعیت'], [['#req_7f3a92', '#12,480', '@settled'], ['#req_700ee2', '#0', '@failed']], 'requests', 'همه درخواست‌ها'] },
  };
  let cur = 'overview', p30 = false, sel = null, chart = null, hd = -1;
  const tabs = $('dTabs'), bars = $('heroBars'), axis = $('dAxis'), read = $('dRead'), tb = [...tabs.querySelectorAll('button')];

  function countUp(els) {
    if (STATIC || reduce) return;
    els.forEach(el => {
      const m = el.textContent.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/); if (!m) return;
      const raw = m[2], end = parseFloat(raw.replace(/,/g, '')), dec = (raw.split('.')[1] || '').length, comma = raw.includes(','), pad = /^0\d/.test(raw) ? raw.length : 0, t0 = performance.now();
      const f = n => { let s = n.toFixed(dec); if (comma) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); if (pad) s = s.padStart(pad, '0'); return m[1] + s + m[3]; };
      const step = now => { const p = Math.min(1, (now - t0) / 900); el.textContent = f(end * (1 - Math.pow(1 - p, 3))); if (p < 1 && el.isConnected) requestAnimationFrame(step); };
      el.textContent = f(0); requestAnimationFrame(step);
    });
  }
  function renderTiles() {
    $('dTiles').innerHTML = V[cur].tiles.map(t => `<div class="tile${fine ? ' glow' : ''}"><div class="t-top"><b class="num">${t[0]}</b>${t[2] ? `<span class="pill pill-soft">${t[2]}</span>` : ''}</div><small>${t[1]}</small></div>`).join('');
  }
  function renderTable() {
    const t = V[cur].table, l = $('dTblLink');
    $('dTblH').textContent = t[0]; l.textContent = t[4] + ' ↖'; l.href = '/console.html?view=' + t[3];
    $('dTbl').innerHTML = `<thead><tr>${t[1].map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${t[2].map(r => `<tr>${r.map((c, i) => `<td>${cell(c, i)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }
  function readout(d, hovering) {
    const pin = d == null || d < 0 ? chart.peak : d;
    const lead = hovering ? 'روز' : d == null ? 'اوج دوره' : 'روز انتخاب‌شده';
    const hint = hovering ? 'برای ثابت کردن، بزنید' : d == null ? 'برای بررسی، روی ستون‌ها بزنید' : 'برای لغو، دوباره بزنید';
    read.innerHTML = `<span>${lead}: <b>${chart.labels[pin]} · <span class="num">${kfmt(chart.avg[pin] * chart.S)}</span> ${chart.unit}</b></span><span>${hint}</span>`;
  }
  function drawChart(replay) {
    const c = V[cur].chart, D = p30 ? 30 : 7, n = 110, h = series(c[2], n, c[3] + (p30 ? 11 : 0)), seg = i => Math.floor(i * D / n);
    const sum = Array(D).fill(0), cnt = Array(D).fill(0);
    h.forEach((v, i) => { sum[seg(i)] += v; cnt[seg(i)]++; });
    const avg = sum.map((s, d) => s / cnt[d]);
    chart = { n, D, avg, S: c[4], unit: c[5], peak: avg.indexOf(Math.max(...avg)), labels: D === 7 ? DAYS : Array.from({ length: 30 }, (_, i) => 'روز ' + (i + 1)) };
    if (sel != null && sel >= D) sel = null;
    bars.innerHTML = h.map((v, i) => { const k = [i >= n * .72 ? 'hi' : '', sel != null && seg(i) === sel ? 'sel' : ''].join(' ').trim(); return `<i style="--h:${v.toFixed(1)}%"${k ? ` class="${k}"` : ''}></i>`; }).join('') + '<span class="d-tip"></span>';
    const ax = D === 7 ? SHORT.map((s, i) => [i, s]) : [0, 4, 9, 14, 19, 24, 29].map(i => [i, String(i + 1).padStart(2, '0')]);
    axis.classList.toggle('en', D === 30);
    axis.innerHTML = ax.map(([i, l]) => `<span data-d="${i}" class="${[i >= Math.floor(D * .72) ? 'hi' : '', sel === i ? 'sel' : ''].join(' ').trim()}">${l}</span>`).join('');
    const per = (p30 ? '۳۰' : '۷') + ' روز گذشته';
    $('dChartH').textContent = c[0]; $('dChartP').textContent = per + ' · ' + c[1]; $('dChartPill').textContent = per;
    hd = -1; readout(sel, false);
    if (replay && !STATIC && !reduce) { bars.classList.remove('in'); void bars.offsetWidth; bars.classList.add('in'); }
  }
  const dayAt = x => { const r = bars.getBoundingClientRect(), p = Math.min(.9999, Math.max(0, (x - r.left) / r.width)); return Math.floor(Math.floor(p * chart.n) * chart.D / chart.n); };
  function hover(d) {
    if (d === hd) return; hd = d;
    bars.querySelectorAll('i').forEach((b, i) => b.classList.toggle('hov', d >= 0 && Math.floor(i * chart.D / chart.n) === d));
    axis.querySelectorAll('span').forEach(s => s.classList.toggle('hov', +s.dataset.d === d));
    const tip = bars.querySelector('.d-tip');
    if (d < 0) { tip.classList.remove('on'); readout(sel, false); return; }
    tip.innerHTML = `<b>${kfmt(chart.avg[d] * chart.S)}</b>${chart.labels[d]}`;
    tip.style.setProperty('--x', ((d + .5) / chart.D * 100).toFixed(2) + '%'); tip.classList.add('on');
    readout(d, true);
  }
  bars.addEventListener('pointermove', e => hover(dayAt(e.clientX)));
  bars.addEventListener('pointerleave', () => hover(-1));
  bars.addEventListener('click', e => { const d = dayAt(e.clientX); sel = sel === d ? null : d; drawChart(false); });

  // tabs with a sliding thumb
  function thumb(instant) {
    const b = tabs.querySelector('[aria-pressed="true"]');
    if (!b || !b.offsetWidth) return;
    if (instant) tabs.classList.add('no-anim');
    tabs.style.setProperty('--tx', b.offsetLeft + 'px'); tabs.style.setProperty('--tw', b.offsetWidth + 'px'); tabs.classList.add('ready');
    if (instant) { void tabs.offsetWidth; tabs.classList.remove('no-anim'); }
  }
  function show(v) {
    if (v === cur || !V[v]) return;
    cur = v; sel = null;
    tb.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dtab === v)));
    thumb(false);
    const parts = [$('dTiles'), dev.querySelector('.chart-card'), dev.querySelector('.proj')];
    const swap = () => { renderTiles(); renderTable(); drawChart(true); parts.forEach(p => p.classList.remove('swap')); countUp(dev.querySelectorAll('#dTiles b.num')); };
    if (STATIC || reduce) swap(); else { parts.forEach(p => p.classList.add('swap')); setTimeout(swap, 170); }
  }
  tb.forEach(b => b.addEventListener('click', () => show(b.dataset.dtab)));
  addEventListener('resize', () => { const b = tabs.querySelector('[aria-pressed="true"]'); if (b && !b.offsetWidth) show('overview'); thumb(true); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => thumb(true));

  // 7 / 30 days
  $('dPeriod').addEventListener('click', e => { p30 = !p30; e.currentTarget.setAttribute('aria-pressed', String(p30)); sel = null; drawChart(true); });

  // bell popover
  const bell = $('dBell'), pop = $('dPop');
  const setPop = o => { pop.hidden = !o; bell.setAttribute('aria-expanded', String(o)); };
  bell.addEventListener('click', e => { e.stopPropagation(); setPop(pop.hidden); });
  document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) setPop(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { setPop(false); bell.focus(); } });

  // gauge read-out on hover (legend items and arcs)
  const g = $('dGauge'), gv = $('dGaugeV'), gl = $('dGaugeL'), leg = {};
  g.querySelectorAll('[data-g]').forEach(s => { leg[s.dataset.g] = s; });
  const gOn = k => { const s = leg[k]; g.dataset.on = k; gv.textContent = s.dataset.v; gl.textContent = s.dataset.l; };
  const gOff = () => { delete g.dataset.on; gv.textContent = '68%'; gl.textContent = 'بودجهٔ تخصیص‌یافته'; };
  Object.keys(leg).forEach(k => { leg[k].addEventListener('pointerenter', () => gOn(k)); leg[k].addEventListener('pointerleave', gOff); });
  [['g-used', 'used'], ['g-res', 'res'], ['g-free', 'free']].forEach(([c, k]) => { const p = g.querySelector('.' + c); p.addEventListener('pointerenter', () => gOn(k)); p.addEventListener('pointerleave', gOff); });

  // first paint of the chart, then count-up when the device scrolls into view
  drawChart(false);
  if (!STATIC && !reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); countUp(dev.querySelectorAll('[data-count],#dTiles b.num,.mini .big.num')); } }, { threshold: .3 });
    io.observe(dev);
  }

  // subtle tilt toward the pointer (fine pointers, motion allowed)
  if (fine && !reduce && !STATIC) {
    let raf = 0, ev;
    dev.addEventListener('pointermove', e => { ev = e; if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const r = dev.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5; dev.style.setProperty('--ry', (x * 2.2).toFixed(2) + 'deg'); dev.style.setProperty('--rx', (-y * 1.8).toFixed(2) + 'deg'); }); });
    dev.addEventListener('pointerleave', () => { dev.style.setProperty('--ry', '0deg'); dev.style.setProperty('--rx', '0deg'); });
  }

  // pointer-following sheen + edge glow on cards across the page
  if (fine) {
    document.querySelectorAll('.device .tile,.device .mini,.device .chart-card,.device .proj,.float,.principle,.cost-card,.plan,.f-console').forEach(el => el.classList.add('glow'));
    let raf = 0, ev;
    document.addEventListener('pointermove', e => {
      ev = e; if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; const el = ev.target.closest && ev.target.closest('.glow'); if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); el.style.setProperty('--my', (ev.clientY - r.top) + 'px'); });
    }, { passive: true });
  }
})();

/* ----------------------------------------------------------
   Tech banner pause control (the banner never pauses on hover).
   Roadmap: on wide screens the section pins and scrolling moves the focus card
   by card, with a hold on each card, eased (lerped) depth and a dark wipe on the
   focused card. If the whole section does not fit the viewport, only the cards pin.
   Narrower screens: the card crossing the middle of the screen is focused.
---------------------------------------------------------- */
(function () {
  'use strict';
  const banner = document.getElementById('techBanner'), tg = document.getElementById('mqToggle');
  if (banner && tg) tg.addEventListener('click', () => {
    const p = banner.classList.toggle('paused');
    tg.setAttribute('aria-pressed', String(p));
    tg.setAttribute('aria-label', p ? 'ادامه حرکت نوار' : 'توقف حرکت نوار');
  });

  const track = document.getElementById('plansTrack');
  if (!track) return;
  const pin = track.querySelector('.plans-pin'), stage = track.querySelector('.plans-stage');
  const cards = [...track.querySelectorAll('.plan')], steps = [...track.querySelectorAll('[data-step]')], n = cards.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
  let mode = 'none', top = 24, offset0 = 0, travel = 1, target = 0, cur = 0, running = false;
  let idx = Math.max(0, cards.findIndex(c => c.classList.contains('core'))), keyIdx = -1, hoverIdx = -1, io = null;
  cards.forEach(c => c.classList.remove('hl')); // static highlight is the no-JS fallback

  function apply() {
    const a = keyIdx >= 0 ? keyIdx : hoverIdx >= 0 ? hoverIdx : idx;
    cards.forEach((c, i) => c.classList.toggle('on', i === a));
    steps.forEach((s, i) => { s.classList.toggle('on', i === a); s.setAttribute('aria-pressed', String(i === a)); });
  }
  // progress (0..1) -> focus position with a hold on every card
  function focusAt(p) { const t = p * (n - 1), k = Math.min(n - 2, Math.floor(t)), f = t - k; return k + smoother(clamp((f - .22) / .56, 0, 1)); }
  function render(p) {
    const x = focusAt(p);
    cards.forEach((c, i) => { const d = Math.min(1, Math.abs(x - i)); c.style.setProperty('--s', (1 - .045 * d).toFixed(4)); c.style.setProperty('--ty', (d * 16).toFixed(2) + 'px'); });
    steps.forEach((s, i) => s.style.setProperty('--f', clamp(x - i + 1, 0, 1).toFixed(3)));
    const i = Math.round(x);
    if (i !== idx) { idx = i; apply(); }
  }
  function frame() {
    cur += (target - cur) * (reduce ? 1 : .12);
    if (Math.abs(target - cur) < .0004) cur = target;
    render(cur);
    if (cur !== target) requestAnimationFrame(frame); else running = false;
  }
  function onScroll() {
    if (mode === 'none') return;
    const r = track.getBoundingClientRect();
    target = clamp((top - r.top - offset0) / travel, 0, 1);
    if (keyIdx >= 0 && document.activeElement && !track.contains(document.activeElement)) keyIdx = -1;
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
  function layout() {
    track.classList.remove('pin-all', 'pin-cards', 'live');
    track.style.height = '';
    cards.forEach(c => { c.style.removeProperty('--s'); c.style.removeProperty('--ty'); });
    mode = 'none';
    if (innerWidth > 1020) {
      track.classList.add('live'); // live layout (steps visible, compact cards) for measuring
      const whole = pin.offsetHeight, st = stage.offsetHeight;
      if (whole + 48 <= innerHeight) mode = 'all'; else if (st + 48 <= innerHeight) mode = 'cards'; else track.classList.remove('live');
    }
    if (io) { io.disconnect(); io = null; }
    if (mode !== 'none') {
      travel = Math.round(innerHeight * 1.9);
      offset0 = mode === 'all' ? 0 : stage.getBoundingClientRect().top - track.getBoundingClientRect().top;
      const stickyH = mode === 'all' ? pin.offsetHeight : stage.offsetHeight;
      top = Math.max(24, Math.round((innerHeight - stickyH) / 2));
      track.style.setProperty('--pin-top', top + 'px');
      track.style.height = Math.round(offset0 + stickyH + travel) + 'px';
      track.classList.add('pin-' + mode);
      const r = track.getBoundingClientRect();
      target = cur = clamp((top - r.top - offset0) / travel, 0, 1);
      render(cur);
    } else if (innerWidth <= 1020 && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { idx = cards.indexOf(e.target); apply(); } }), { rootMargin: '-45% 0px -45% 0px' });
      cards.forEach(c => io.observe(c));
    }
    apply();
  }
  cards.forEach((c, i) => {
    // hover only steers the highlight when scrolling does not (unpinned wide layout)
    c.addEventListener('pointerenter', e => { if (mode === 'none' && innerWidth > 1020 && e.pointerType === 'mouse') { hoverIdx = i; apply(); } });
    c.addEventListener('pointerleave', () => { if (hoverIdx === i) { hoverIdx = -1; apply(); } });
    c.addEventListener('focusin', () => { keyIdx = i; apply(); });
    c.addEventListener('focusout', e => { if (!c.contains(e.relatedTarget)) { keyIdx = -1; apply(); } });
  });
  steps.forEach((s, i) => s.addEventListener('click', () => {
    if (mode === 'none') { idx = i; apply(); return; }
    const r = track.getBoundingClientRect();
    scrollTo({ top: scrollY + r.top + offset0 - top + travel * (i / (n - 1)), behavior: reduce ? 'auto' : 'smooth' });
  }));
  addEventListener('scroll', onScroll, { passive: true });
  // innerWidth/innerHeight force a full layout in Chrome: read them after the first frame, not at start-up
  let rt = 0, lastW = 0, lastH = 0;
  requestAnimationFrame(() => { lastW = innerWidth; lastH = innerHeight; });
  addEventListener('resize', () => { if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 80) return; lastW = innerWidth; lastH = innerHeight; clearTimeout(rt); rt = setTimeout(layout, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  requestAnimationFrame(layout); // measure after the first paint, not inside the start-up task
})();

/* ----------------------------------------------------------
   How it works: the timeline line fills with scroll, the step crossing the
   reading line is highlighted, and the matching row of the request card lights up.
---------------------------------------------------------- */
(function () {
  'use strict';
  const how = document.getElementById('how');
  if (!how) return;
  const list = how.querySelector('.op-list'), ops = [...list.querySelectorAll('.op')], rows = [...how.querySelectorAll('.alerts .arow')];
  rows.forEach(r => r.classList.remove('focus'));
  let cur = -1, raf = 0;
  function update() {
    raf = 0;
    const mark = innerHeight * .55, lr = list.getBoundingClientRect();
    list.style.setProperty('--fill', Math.min(1, Math.max(0, (mark - lr.top - 30) / Math.max(1, lr.height - 60))).toFixed(4));
    let i = 0;
    ops.forEach((o, k) => { const r = o.getBoundingClientRect(); if (r.top + r.height / 2 <= mark) i = k; });
    if (i !== cur) {
      cur = i;
      ops.forEach((o, k) => { o.classList.toggle('on', k === i); o.classList.toggle('done', k < i); });
      rows.forEach((r, k) => r.classList.toggle('lit', k === i));
    }
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', update);
  requestAnimationFrame(update);
})();

/* ----------------------------------------------------------
   Early-access form → POST /api/waitlist (server.mjs)
   Validation rules mirror server.mjs; message text lives in the markup.
---------------------------------------------------------- */
const form = document.getElementById('join-form');
if (form) {
  const card = form.closest('.form-card');
  const alertBox = form.querySelector('[data-form-alert]');
  const submit = form.querySelector('button[type="submit"]');
  const rules = {
    name: v => { const t = v.trim(); return !t ? 'required' : t.length < 2 || t.length > 80 ? 'invalid' : null; },
    email: v => { const t = v.trim(); return !t ? 'required' : /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(t) ? null : 'invalid'; },
    mobile: v => { const t = cleanPhone(v); return !t ? 'required' : PHONE_OK(t) ? null : 'invalid'; },
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
      mobile: cleanPhone(form.elements.mobile.value),
      role: form.elements.role.value,
      usecase: form.elements.usecase.value.trim(),
      consent: form.elements.consent.checked,
      website: form.elements.website.value,
      source: 'section',
      page: location.pathname,
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
      const done = card.querySelector('[data-success]');
      done.querySelector('[data-dup]').hidden = !json.duplicate;
      done.querySelector('[data-title-new]').hidden = !!json.duplicate;
      done.querySelector('[data-title-dup]').hidden = !json.duplicate;
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
