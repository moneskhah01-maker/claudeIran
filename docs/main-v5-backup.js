// ClaudeIran landing — Keel redesign (behaviour from the redesign's page script) + early-access form.
import './styles.css';
(function(){
 'use strict';
 var root=document.documentElement; root.classList.add('js');
 var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

 /* mobile menu */
 var mb=document.getElementById('menuBtn'), mn=document.getElementById('mnav');
 mb.addEventListener('click',function(){var o=mn.classList.toggle('open');mb.setAttribute('aria-expanded',String(o));mb.setAttribute('aria-label',o?'بستن منو':'باز کردن منو')});
 mn.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){mn.classList.remove('open');mb.setAttribute('aria-expanded','false')})});

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
 field(document.getElementById('heroBars'),[38,52,47,66,58,72,63,82,70,94],110,.72,7);

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

 /* active nav pill follows scroll */
 var links=[].slice.call(document.querySelectorAll('.navpill a'));
 if('IntersectionObserver' in window)addEventListener('scroll',function once(){removeEventListener('scroll',once);
  var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.setAttribute('aria-current',String(l.getAttribute('href')==='#'+e.target.id))})}})},{rootMargin:'-45% 0px -50% 0px'});
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
   Early-access form → POST /api/waitlist (server.mjs)
   Validation rules mirror server.mjs; message text lives in the markup.
---------------------------------------------------------- */
const form = document.getElementById('join-form');
if (form) {
  const card = form.closest('.form-card');
  const alertBox = form.querySelector('[data-form-alert]');
  const submit = form.querySelector('button[type="submit"]');
  const toLatin = s => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
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
