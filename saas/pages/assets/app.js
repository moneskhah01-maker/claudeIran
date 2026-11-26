// Customer panel (/app): login with SMS code or email, then overview, API keys, billing, usage, quick start.
'use strict';

const state = { me: null, overview: null };

/* ---------------- auth screen ---------------- */
function showAuth() {
  $('#dash').hidden = true;
  $('#auth').hidden = false;
  let method = 'sms', mode = 'login', smsStep = 'mobile';

  document.querySelectorAll('[data-method]').forEach(b => b.onclick = () => {
    method = b.dataset.method;
    document.querySelectorAll('[data-method]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#smsForm').hidden = method !== 'sms';
    $('#emailForm').hidden = method !== 'email';
  });

  // --- SMS: mobile -> code -> (new number) name + terms ---
  const smsStepTo = step => {
    smsStep = step;
    $('#mobile').readOnly = step !== 'mobile';
    $('#codeField').hidden = step === 'mobile';
    $('#smsNew').hidden = step !== 'name';
    $('#smsBack').hidden = step === 'mobile';
    $('#smsBtn').textContent = step === 'mobile' ? 'دریافت کد' : step === 'code' ? 'ورود' : 'ساخت حساب';
    (step === 'mobile' ? $('#mobile') : step === 'code' ? $('#code') : $('#smsName')).focus();
  };
  $('#smsBack').onclick = () => { $('#smsErr').textContent = ''; smsStepTo('mobile'); };
  $('#smsForm').onsubmit = async e => {
    e.preventDefault();
    const btn = $('#smsBtn'); btn.disabled = true; $('#smsErr').textContent = '';
    const mobile = latin($('#mobile').value);
    try {
      if (smsStep === 'mobile') {
        const r = await api('/api/auth/otp/request', { mobile });
        if (!r.ok) return void ($('#smsErr').textContent = r.errors?.mobile ? 'شمارهٔ موبایل ایران را درست وارد کنید (۰۹…).' : errText(r));
        toast('کد پیامک شد');
        return smsStepTo('code');
      }
      const body = { mobile, code: latin($('#code').value) };
      if (smsStep === 'name') Object.assign(body, { name: $('#smsName').value, terms: $('#smsTerms').checked });
      const r = await api('/api/auth/otp/verify', body);
      if (r.needName) return smsStepTo('name');
      if (!r.ok) return void ($('#smsErr').textContent = r.errors?.name ? 'نام را کامل وارد کنید.' : r.errors?.terms ? 'برای ساخت حساب، پذیرش قوانین لازم است.' : errText(r));
      start();
    } finally { btn.disabled = false; }
  };

  // --- email: login <-> sign-up ---
  const setMode = m => {
    mode = m;
    const up = m === 'signup';
    $('#authTitle').textContent = up ? 'ساخت حساب' : 'ورود به کنسول';
    $('#nameField').hidden = !up; $('#termsField').hidden = !up; $('#pwHint').hidden = !up;
    $('#password').autocomplete = up ? 'new-password' : 'current-password';
    $('#emailBtn').textContent = up ? 'ساخت حساب' : 'ورود';
    $('#swapText').textContent = up ? 'حساب دارید؟' : 'حساب ندارید؟';
    $('#swapMode').textContent = up ? 'ورود' : 'ساخت حساب';
    $('#emailErr').textContent = '';
  };
  $('#swapMode').onclick = () => setMode(mode === 'login' ? 'signup' : 'login');
  $('#emailForm').onsubmit = async e => {
    e.preventDefault();
    const btn = $('#emailBtn'); btn.disabled = true; $('#emailErr').textContent = '';
    const body = { email: $('#email').value, password: $('#password').value };
    if (mode === 'signup') Object.assign(body, { name: $('#name').value, terms: $('#terms').checked });
    const r = await api(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', body);
    btn.disabled = false;
    if (r.ok) return start();
    const f = r.errors || {};
    $('#emailErr').textContent = f.name ? 'نام را کامل وارد کنید.' : f.email ? 'ایمیل معتبر نیست.' : f.password ? 'رمز عبور باید دست‌کم ۱۰ نویسه باشد.' : f.terms ? 'پذیرش قوانین لازم است.' : errText(r);
  };
  smsStepTo('mobile');
}

/* ---------------- dashboard ---------------- */
const VIEWS = { overview, keys, billing, usage, docs };

async function start() {
  const me = await api('/api/auth/me');
  if (!me.ok) return showAuth();
  state.me = me.user;
  $('#auth').hidden = true;
  $('#dash').hidden = false;
  $('#whoName').textContent = me.user.name;
  $('#logout').onclick = async () => { await api('/api/auth/logout', {}); location.hash = ''; showAuth(); };
  window.onhashchange = route;
  route();
}

async function route() {
  const name = location.hash.slice(1) in VIEWS ? location.hash.slice(1) : 'overview';
  document.querySelectorAll('.side a').forEach(a => a.getAttribute('href') === '#' + name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const view = $('#view');
  view.replaceChildren(h('p', { class: 'muted' }, 'در حال بارگذاری…'));
  const ov = await api('/api/app/overview');
  if (ov.status === 401) return showAuth();
  state.overview = ov;
  const content = await VIEWS[name]();
  view.replaceChildren(...(ov.upstream === 'mock' ? [h('div', { class: 'banner' }, 'حالت آزمایشی: درخواست‌های API پاسخ شبیه‌سازی‌شده می‌گیرند و هیچ مدلی فراخوانی نمی‌شود. اعتبار و گزارش‌ها واقعی ثبت می‌شوند.')] : []), ...[content].flat().filter(Boolean));
  view.focus({ preventScroll: true });
}

const pageHead = (title, ...actions) => h('div', { class: 'top' }, h('h1', null, title), h('div', { class: 'row' }, actions));
const tile = (label, value, unit) => h('div', { class: 'card tile' }, h('div', { class: 'label' }, label), h('div', { class: 'num' }, value, unit ? h('small', null, unit) : null));

function usageRows(rows) {
  return rows.map(u => h('tr', null,
    h('td', null, when(u.created_at)),
    h('td', { class: 'mono' }, u.model),
    u.key_name !== undefined ? h('td', null, u.key_name || '—') : null,
    h('td', null, pill(u.status, STATUS_FA[u.status])),
    h('td', null, num(u.input_tokens), ' / ', num(u.output_tokens)),
    h('td', null, toman(u.cost)),
  ));
}

function overview() {
  const o = state.overview;
  const spent30 = o.days.reduce((s, d) => s + Number(d.cost), 0);
  return [
    pageHead('نمای کلی', h('a', { class: 'btn primary', href: '#billing' }, 'افزایش اعتبار')),
    h('div', { class: 'grid g4' },
      tile('اعتبار قابل استفاده', toman(o.available), 'تومان'),
      tile('رزرو برای درخواست‌های در جریان', toman(o.held), 'تومان'),
      tile('کلیدهای فعال', num(o.activeKeys)),
      tile('مصرف ۳۰ روز اخیر', toman(spent30), 'تومان')),
    h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', null, 'هزینهٔ روزانه، ۳۰ روز اخیر'), h('span', { class: 'small muted' }, 'تومان')), bars(o.days, 'cost')),
    h('div', { class: 'card' }, h('h2', null, 'آخرین درخواست‌ها'),
      table(['زمان', 'مدل', 'وضعیت', 'توکن ورودی / خروجی', 'هزینه (تومان)'], usageRows(o.recent), 'هنوز درخواستی نفرستاده‌اید. از «شروع سریع» یک کلید بسازید.')),
  ];
}

async function keys() {
  const r = await api('/api/app/keys');
  const reveal = h('div', { hidden: true });
  const nameIn = h('input', { type: 'text', id: 'keyName', placeholder: 'مثلاً: سرور اصلی', maxlength: 60 });
  const form = h('form', { class: 'row end', onsubmit: async e => {
    e.preventDefault();
    const k = await api('/api/app/keys', { name: nameIn.value });
    if (!k.ok) return toast(errText(k));
    // the full key exists in the browser only now; after this screen it cannot be shown again
    reveal.hidden = false;
    reveal.replaceChildren(h('div', { class: 'secret' }, h('code', null, k.secret), h('button', { class: 'btn primary sm', type: 'button', onclick: () => copy(k.secret) }, 'کپی کلید')),
      h('p', { class: 'small muted' }, 'این کلید فقط همین یک بار نمایش داده می‌شود. آن را در جای امن (مثلاً متغیر محیطی سرور) نگه دارید و در کد سمت مرورگر نگذارید.'));
    nameIn.value = '';
    list.replaceChildren(keyTable((await api('/api/app/keys')).keys));
  } }, h('div', { class: 'grow' }, h('label', { for: 'keyName' }, 'نام کلید'), nameIn), h('button', { class: 'btn primary' }, 'ساخت کلید'));
  const list = h('div', null, keyTable(r.keys || []));

  function keyTable(ks) {
    return table(['نام', 'شناسه', 'ساخته‌شده', 'آخرین استفاده', 'وضعیت', ''], ks.map(k => h('tr', null,
      h('td', null, k.name), h('td', { class: 'mono' }, k.prefix + '…'), h('td', null, when(k.created_at)), h('td', null, when(k.last_used_at)),
      h('td', null, k.revoked_at ? pill('revoked', 'باطل‌شده') : pill('active', 'فعال')),
      h('td', null, k.revoked_at ? '' : h('button', { class: 'btn danger sm', onclick: async () => {
        if (!confirm(`کلید «${k.name}» باطل شود؟ برنامه‌هایی که از آن استفاده می‌کنند فوراً از کار می‌افتند.`)) return;
        const x = await api('/api/app/keys/revoke', { id: k.id });
        if (!x.ok) return toast(errText(x));
        toast('کلید باطل شد');
        list.replaceChildren(keyTable((await api('/api/app/keys')).keys));
      } }, 'ابطال')))), 'هنوز کلیدی نساخته‌اید.');
  }
  return [pageHead('کلیدهای API'), h('div', { class: 'card stack' }, form, reveal), h('div', { class: 'card' }, list)];
}

async function billing() {
  const [p, l] = await Promise.all([api('/api/app/payments'), api('/api/app/ledger')]);
  const info = p.info;
  const o = state.overview;
  const result = new URLSearchParams(location.search).get('pay');
  const banner = result && h('div', { class: `banner ${result === 'paid' ? 'ok' : result === 'pending' ? '' : 'bad'}` },
    result === 'paid' ? 'پرداخت تأیید شد و اعتبار افزوده شد.' : result === 'pending' ? 'نتیجهٔ پرداخت هنوز از درگاه دریافت نشده؛ به‌زودی بررسی می‌شود.' : 'پرداخت انجام نشد و مبلغی کسر نشده است (اگر کسر شده، تا ۷۲ ساعت بانک بازمی‌گرداند).');
  if (result) history.replaceState(null, '', location.pathname + location.hash);

  let method = info.zarinpal.enabled ? 'zarinpal' : 'manual';
  const amountIn = h('input', { type: 'text', inputmode: 'numeric', id: 'amount', class: 'ltr', placeholder: 'مثلاً 500000' });
  const presets = [200_000, 500_000, 1_000_000, 5_000_000].map(t => h('button', { type: 'button', class: 'btn line sm', onclick: () => { amountIn.value = String(t); } }, toman(t * 10)));
  const receiptIn = h('input', { type: 'text', id: 'receipt', placeholder: 'شمارهٔ پیگیری یا ۴ رقم آخر کارت و ساعت واریز' });
  const manualBox = h('div', { class: 'stack' },
    h('div', { class: 'banner' }, info.manual.instructions || 'اطلاعات حساب برای واریز هنوز ثبت نشده است.'),
    h('div', null, h('label', { for: 'receipt' }, 'اطلاعات واریز'), receiptIn));
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'روش پرداخت' },
    info.zarinpal.enabled ? h('button', { type: 'button', 'aria-pressed': 'true', 'data-m': 'zarinpal' }, 'درگاه زرین‌پال' + (info.zarinpal.sandbox ? ' (آزمایشی)' : '')) : null,
    h('button', { type: 'button', 'aria-pressed': String(method === 'manual'), 'data-m': 'manual' }, 'کارت‌به‌کارت'));
  const syncMethod = () => {
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === method)));
    manualBox.hidden = method !== 'manual';
  };
  seg.onclick = e => { const b = e.target.closest('button'); if (b) { method = b.dataset.m; syncMethod(); } };
  syncMethod();
  const err = h('div', { class: 'err', role: 'alert' });
  const submit = h('button', { class: 'btn primary' }, 'ادامه');
  const form = h('form', { class: 'stack', onsubmit: async e => {
    e.preventDefault();
    err.textContent = '';
    const amount = Number(latin(amountIn.value).replace(/[^\d]/g, '')) * 10; // the form asks Toman, the API takes Rial
    submit.disabled = true;
    const r = await api('/api/app/topup', { method, amount, receipt: receiptIn.value });
    submit.disabled = false;
    if (!r.ok) return void (err.textContent = r.error === 'bad_amount' ? `مبلغ باید بین ${toman(info.min)} و ${toman(info.max)} تومان باشد.` : errText(r));
    if (r.redirect) return void location.assign(r.redirect);
    toast('درخواست ثبت شد و پس از بررسی، اعتبار افزوده می‌شود');
    route();
  } },
    h('div', null, h('label', null, 'روش پرداخت'), seg),
    h('div', null, h('label', { for: 'amount' }, `مبلغ (تومان، از ${toman(info.min)} تا ${toman(info.max)})`), amountIn, h('div', { class: 'row', style: 'margin-top:8px' }, presets)),
    manualBox, err, h('div', null, submit));

  return [
    pageHead('اعتبار و پرداخت'), banner,
    h('div', { class: 'grid g2' },
      h('div', { class: 'card' }, h('h2', null, 'افزایش اعتبار'), form),
      h('div', { class: 'stack' }, tile('اعتبار قابل استفاده', toman(o.available), 'تومان'),
        h('div', { class: 'card' }, h('h2', null, 'تعرفه (تومان برای هر یک میلیون توکن)'),
          table(['مدل', 'ورودی', 'خروجی'], o.models.map(m => h('tr', null, h('td', null, m.label), h('td', null, toman(m.input)), h('td', null, toman(m.output)))))))),
    h('div', { class: 'card' }, h('h2', null, 'درخواست‌های شارژ'),
      table(['زمان', 'روش', 'مبلغ (تومان)', 'وضعیت', 'پیگیری'], (p.rows || []).map(x => h('tr', null,
        h('td', null, when(x.created_at)), h('td', null, PROVIDER_FA[x.provider]), h('td', null, toman(x.amount)),
        h('td', null, pill(x.status, STATUS_FA[x.status])), h('td', { class: 'small' }, x.ref_id || x.receipt || '—'))), 'هنوز شارژی نداشته‌اید.')),
    h('div', { class: 'card' }, h('h2', null, 'گردش حساب'),
      table(['زمان', 'نوع', 'مبلغ (تومان)', 'شرح'], (l.rows || []).map(x => h('tr', null,
        h('td', null, when(x.created_at)), h('td', null, KIND_FA[x.kind]), h('td', null, signed(x.amount)), h('td', { class: 'small muted' }, x.note || x.ref || ''))), 'گردشی ثبت نشده است.')),
  ];
}

async function usage() {
  const r = await api('/api/app/usage');
  const o = state.overview;
  return [
    pageHead('گزارش مصرف'),
    h('div', { class: 'card' }, h('h2', null, 'تعداد درخواست روزانه'), bars(o.days, 'requests')),
    h('div', { class: 'card' }, h('h2', null, '۲۰۰ درخواست اخیر'),
      table(['زمان', 'مدل', 'کلید', 'وضعیت', 'توکن ورودی / خروجی', 'هزینه (تومان)'], usageRows(r.rows || []), 'هنوز درخواستی ثبت نشده است.')),
  ];
}

function docs() {
  const base = location.origin;
  const model = state.overview.models[0]?.id || 'claude-sonnet-5-5';
  const curl = `curl ${base}/v1/messages \\
  -H "x-api-key: $CLAUDEIRAN_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "${model}",
    "max_tokens": 512,
    "messages": [{"role": "user", "content": "سلام! خودت را معرفی کن."}]
  }'`;
  const py = `import os, anthropic

client = anthropic.Anthropic(
    api_key=os.environ["CLAUDEIRAN_API_KEY"],
    base_url="${base}",
)
msg = client.messages.create(
    model="${model}",
    max_tokens=512,
    messages=[{"role": "user", "content": "سلام!"}],
)
print(msg.content[0].text)`;
  const block = (title, code) => h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('h2', null, title), h('button', { class: 'btn line sm', onclick: () => copy(code) }, 'کپی')), h('pre', null, code));
  return [
    pageHead('شروع سریع'),
    h('div', { class: 'card' }, h('ol', null,
      h('li', null, 'از بخش ', h('a', { href: '#keys' }, 'کلیدهای API'), ' یک کلید بسازید و در متغیر محیطی CLAUDEIRAN_API_KEY بگذارید.'),
      h('li', null, 'از بخش ', h('a', { href: '#billing' }, 'اعتبار و پرداخت'), ' حساب را شارژ کنید. هر درخواست پیش از ارسال، حداکثر هزینهٔ ممکنش را رزرو می‌کند و پس از پاسخ فقط هزینهٔ واقعی کسر می‌شود.'),
      h('li', null, 'درخواست‌ها هم‌شکل Messages API هستند؛ کتابخانه‌های رسمی با تغییر base_url کار می‌کنند. پخش زنده (stream) هنوز پشتیبانی نمی‌شود.'))),
    block('cURL', curl), block('Python (anthropic SDK)', py),
  ];
}

start();
