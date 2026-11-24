// Builds the «خدمات و آموزش» section from content/skills and content/videos.json:
//   services/index.html                     skills catalogue + video tutorials
//   services/skills/<slug>/index.html       one page per skill (full SKILL.md, install steps)
//   public/downloads/skills/<slug>/SKILL.md raw file (also used by the quick-copy buttons)
//   public/downloads/skills/<slug>.zip      <slug>/SKILL.md, ready for upload to Claude.ai
//   services/pages.json                     page list for vite.config.js (inputs + sitemap)
// Everything written here is build output (git-ignored); content/ is the source.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT, SITE, BRAND, esc, faNum, jalali, jsonLd, fixText, ARROW, ico, orgLd, head, topbar, footer, ctaBand } from './lib/site.mjs';

const SKILLS = path.join(ROOT, 'content', 'skills');
const OUT = path.join(ROOT, 'services');
const DL = path.join(ROOT, 'public', 'downloads', 'skills');
const catalog = JSON.parse(readFileSync(path.join(SKILLS, 'catalog.json'), 'utf8'));
const videos = existsSync(path.join(ROOT, 'content', 'videos.json')) ? JSON.parse(readFileSync(path.join(ROOT, 'content', 'videos.json'), 'utf8')).videos || [] : [];
const problems = [];

/* ---------- skills ---------- */
const groups = catalog.groups;
const skills = catalog.skills.map(s => {
  const file = path.join(SKILLS, s.slug, 'SKILL.md');
  if (!existsSync(file)) throw new Error(`${s.slug}: content/skills/${s.slug}/SKILL.md is missing`);
  const raw = readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n').trimEnd() + '\n';
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) throw new Error(`${s.slug}: SKILL.md has no frontmatter`);
  const name = (fm[1].match(/^name:\s*(.+)$/m) || [])[1]?.trim();
  const desc = (fm[1].match(/^description:\s*(.+)$/m) || [])[1]?.trim().replace(/^"|"$/g, '') || '';
  if (name !== s.slug) problems.push(`${s.slug}: frontmatter name is "${name}"`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug) || s.slug.length > 64) problems.push(`${s.slug}: name must be lowercase kebab-case, max 64`);
  if (!desc || desc.length > 1024 || /[<>]/.test(desc)) problems.push(`${s.slug}: description missing, too long or contains < >`);
  if (!groups.some(g => g.id === s.group)) problems.push(`${s.slug}: unknown group "${s.group}"`);
  const updated = s.updated || new Date(statSync(file).mtime).toISOString().slice(0, 10);
  return { ...s, raw, desc, lines: raw.split('\n').length - 1, updated, title: fixText(s.title), summary: fixText(s.summary) };
});

/* ---------- zip (stored, no compression; a few KB of Markdown does not need deflate) ---------- */
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) {
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const local = [], central = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), data = Buffer.from(f.data, 'utf8'), crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8); h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10); c.writeUInt16LE(time, 12); c.writeUInt16LE(date, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    local.push(h, name, data); central.push(c, name); offset += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, e]);
}

/* ---------- shared bits ---------- */
// The visual language is the landing's: eyebrow + light/bold display headings, gradient cards with an
// icon tile and an outlined number (.principle), the dark relief section with a white tabbed card (.dev,
// .code-card) and the two-column FAQ. Each block still carries one heading, one line and one action.
const groupTitle = id => groups.find(g => g.id === id)?.title || '';
const crumbs = items => `<nav class="crumbs" aria-label="مسیر صفحه">${items.map(([href, t], i) => (i ? '<span aria-hidden="true">/</span>' : '') + (href ? `<a href="${href}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join('')}</nav>`;
const crumbLd = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([href, name], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${href}` })) });
const zipUrl = s => `/downloads/skills/${s.slug}.zip`;
const mdUrl = s => `/downloads/skills/${s.slug}/SKILL.md`;
const pad = n => String(n).padStart(2, '0');
const eyebrow = (fa, en) => `<span class="eyebrow rv"><span class="dot" aria-hidden="true"></span>${fa} <span class="en">${en}</span></span>`;

/* the first lines of a SKILL.md, shortened and lightly highlighted, for the hero file card */
function preview(raw, n = 13) {
  return raw.split('\n').slice(0, 40).filter((l, i, a) => l.trim() || (a[i - 1] || '').trim()).slice(0, n).map(l => {
    const t = l.length > 54 ? l.slice(0, 52).trimEnd() + '…' : l;
    const e = esc(t);
    if (/^#/.test(t)) return `<b class="pv-h">${e}</b>`;
    if (/^(name|description):/.test(t)) return e.replace(/^(\w+):/, '<i class="pv-k">$1:</i>');
    if (t === '---') return `<i class="pv-m">${e}</i>`;
    return e;
  }).join('\n');
}
// hero art: a glass SKILL.md card with two floating labels (like the landing hero's floating stat cards)
/* full source with line numbers (numbers are CSS counters, so copying the text never includes them) */
function sourceLines(raw) {
  let fm = 0;
  return raw.replace(/\n$/, '').split('\n').map(l => {
    const e = esc(l); let cls = '';
    if (l === '---' && fm < 2) { fm++; cls = ' m'; }
    else if (fm === 1 && /^(name|description):/.test(l)) return `<span class="l">${e.replace(/^(\w+):/, '<i class="k">$1:</i>')}</span>`;
    else if (/^#{1,6} /.test(l)) cls = ' h';
    return `<span class="l${cls}">${e}</span>`;
  }).join('');
}

function fileCard(s, { copy = false, chipA, chipB } = {}) {
  return `<div class="svc-art rv rv-pop" style="--d:.2s">
    <div class="art-chip art-chip-a" aria-hidden="true"><span class="pr-ic">${ico(chipA.icon)}</span><span><b>${chipA.title}</b><small>${chipA.sub}</small></span></div>
    <div class="art-chip art-chip-b" aria-hidden="true"><span class="dot"></span>${chipB}</div>
    <div class="file-card" dir="ltr"${copy ? '' : ' aria-hidden="true"'}>
     <div class="file-top"><span class="file-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="file-name">${s.slug}/SKILL.md</span>${copy ? `<button type="button" class="copy-btn" data-copy-url="${mdUrl(s)}">${ico('copy')}<span>کپی</span></button>` : `<span class="file-lines">${s.lines} lines</span>`}</div>
     <pre class="file-body">${preview(s.raw)}</pre>
    </div>
   </div>`;
}

/* skill card: icon tile + number, role, one line, and a small inset that previews what the file covers */
const skillCard = (s, n) => `<a class="sk-card rv rv-pop" style="--d:${((n - 1) % 2) * 0.1}s" href="/services/skills/${s.slug}/" data-cluster="${esc(s.group)}">
   <span class="sk-body">
    <span class="pr-top"><span class="pr-ic">${ico(s.icon || 'book')}</span><span class="sk-n en">${pad(n)}</span></span>
    <h3>${esc(s.role)}</h3>
    <span class="sk-line">${esc(s.title)}</span>
    <span class="sk-go">مشاهده و نصب ${ARROW}</span>
   </span>
   <span class="sk-viz" aria-hidden="true">
    <span class="sk-file"><span class="en">SKILL.md</span><span class="en">${s.lines} lines</span></span>
    ${s.covers.slice(0, 3).map(c => `<span class="sk-row"><i></i><span>${esc(fixText(c))}</span></span>`).join('')}
   </span>
  </a>`;

/* install: the landing's dark developer section with a white tabbed card */
function installSection(s) {
  const slug = s ? s.slug : 'SKILL_NAME';
  const raw = `${SITE}/downloads/skills/${slug}/SKILL.md`;
  const ask = s?.prompts?.[0] || 'سلام';
  const tabs = [
    ['ai', 'Claude.ai', `<div class="inst-steps" dir="rtl">
      <ol>
       <li><b>فایل ZIP را بگیرید</b><span>${s ? 'از دکمهٔ بالای همین صفحه. لازم نیست بازش کنید.' : 'از صفحهٔ اسکیلِ نقش خودتان. لازم نیست بازش کنید.'}</span></li>
       <li><b>Settings › Capabilities</b><span>مطمئن شوید Code execution روشن است.</span></li>
       <li><b>Skills › Upload skill</b><span>فایل را انتخاب کنید. از این به بعد هر وقت لازم باشد، Claude خودش سراغ اسکیل می‌رود.</span></li>
      </ol>
      ${s ? `<a class="btn btn-dark" href="${zipUrl(s)}" download>${ico('download')}<span>دانلود ${s.slug}.zip</span></a>` : `<a class="btn btn-dark" href="#skills">انتخاب اسکیل ${ARROW}</a>`}
     </div>`],
    ['unix', 'macOS · Linux', `<pre><code># Claude Code: personal skill (all your projects)
mkdir -p ~/.claude/skills/${slug}
curl -fsSL ${raw} \\
  -o ~/.claude/skills/${slug}/SKILL.md

# for the whole team, use .claude/skills/${slug}/ inside the repository</code></pre>`],
    ['win', 'Windows', `<pre><code># Claude Code: personal skill (PowerShell)
New-Item -ItemType Directory -Force "$HOME\\.claude\\skills\\${slug}" | Out-Null
Invoke-WebRequest ${raw} \`
  -OutFile "$HOME\\.claude\\skills\\${slug}\\SKILL.md"</code></pre>`],
    ['api', 'API', `<pre><code>import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY
skill = open("SKILL.md", encoding="utf-8").read()

message = client.messages.create(
    model="MODEL_ID",
    max_tokens=2048,
    system=skill,  # the skill becomes the system prompt
    messages=[{"role": "user", "content": "${esc(ask).replace(/"/g, '\\"')}"}],
)
print(message.content[0].text)</code></pre>`],
  ];
  return `<section class="dev dark svc-install" id="install" aria-labelledby="inst-h">
  <img class="statue" src="/img/capital-persepolis.webp" width="1300" height="1602" alt="" aria-hidden="true" loading="lazy">
  <div class="wrap">
   <div class="dev-grid">
    <div>
     ${eyebrow('نصب در یک دقیقه', 'INSTALL')}
     <h2 id="inst-h" class="rv">یک فایل.<br><b>سه راه استفاده.</b></h2>
     <p class="lead rv">با Claude.ai کار می‌کنید؟ فایل ZIP را آپلود کنید. در Claude Code یک دستور کافی است. و اگر با API کار می‌کنید، متن اسکیل را بگذارید توی system prompt.</p>
     <div class="dev-facts inst-facts rv">
      <a href="${s ? '#source' : '#skills'}" title="${s ? 'متن کامل اسکیل' : 'انتخاب اسکیل'}">SKILL.md</a>
      <button type="button" data-tab-go="ai" aria-controls="panel-ai" title="نصب در Claude.ai">ZIP upload</button>
      <button type="button" data-tab-go="unix" aria-controls="panel-unix panel-win" title="نصب در Claude Code">Claude Code</button>
      <button type="button" data-tab-go="api" aria-controls="panel-api" title="استفاده با API">System prompt</button>
     </div>
    </div>
   </div>
   <div class="code-card rv" dir="ltr" data-tabs>
    <div class="code-top">
     <h3 dir="rtl">راهنمای نصب</h3>
     <div class="code-tabs" role="tablist" aria-label="روش نصب">${tabs.map(([id, t], i) => `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${t}</button>`).join('')}</div>
     <button class="copy-btn" type="button" data-copy-panel>${ico('copy')}<span>کپی کد</span></button>
    </div>
    ${tabs.map(([id, t, body]) => `<div class="code-body" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}">${body}</div>`).join('\n    ')}
    <div class="code-foot"><span dir="rtl">${s ? `${faNum(s.lines)} خط دستورالعمل · رایگان` : 'دستور آمادهٔ هر اسکیل در صفحهٔ خودش هست'}</span><span>${slug}/SKILL.md</span></div>
   </div>
  </div>
 </section>`;
}

/* ---------- skill page ---------- */
function skillPage(s) {
  const url = `${SITE}/services/skills/${s.slug}/`;
  const trail = [['/', BRAND], ['/services/', 'خدمات و آموزش'], [`/services/skills/${s.slug}/`, s.role]];
  const related = skills.filter(x => x !== s).sort((a, b) => (b.group === s.group) - (a.group === s.group)).slice(0, 2);
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'SoftwareSourceCode', '@id': `${url}#skill`, name: `${s.slug} — ${s.title}`, description: s.summary, url, inLanguage: 'fa-IR', programmingLanguage: 'Markdown', codeSampleType: 'full', dateModified: s.updated, author: { '@id': `${SITE}/#org` }, publisher: { '@id': `${SITE}/#org` }, isAccessibleForFree: true },
    orgLd, crumbLd(trail),
  ] };
  return head({ title: `${s.seoTitle || `اسکیل Claude برای ${s.role}`} | ${BRAND}`, description: s.seoDescription || s.summary, canonical: url, type: 'article', script: '/src/services.js', extra: `${jsonLd(ld)}\n` })
  + `\n<body class="is-services is-skill" data-ea-source="services">\n${topbar('/services/')}
  <div class="svc-hero">
   <div class="svc-hero-copy">
    ${crumbs([['/', 'کلاود ایران'], ['/services/', 'خدمات و آموزش'], ['', s.role]])}
    <span class="eyebrow"><span class="dot" aria-hidden="true"></span>${esc(groupTitle(s.group))} <span class="en">CLAUDE SKILL</span></span>
    <h1 class="rv" style="--d:.05s"><span class="h1-l">اسکیل <span class="en">Claude</span> برای</span><b class="h1-l">${esc(s.role)}</b></h1>
    <p class="lead rv" style="--d:.15s">${esc(fixText(s.intro || s.summary))}</p>
    <div class="svc-actions rv" style="--d:.25s"><a class="btn btn-primary" href="${zipUrl(s)}" download>${ico('download')}<span>دانلود ZIP برای Claude.ai</span></a><button type="button" class="btn btn-light" data-copy-url="${mdUrl(s)}">${ico('copy')}<span>کپی متن کامل</span></button></div>
    <p class="svc-meta rv" style="--d:.32s">${faNum(s.lines)} خط دستورالعمل · به‌روزرسانی <time datetime="${s.updated}">${jalali(s.updated)}</time> · رایگان</p>
   </div>
   ${fileCard(s, { copy: true, chipA: { icon: s.icon || 'book', title: esc(s.role), sub: `${esc(groupTitle(s.group))} · رایگان` }, chipB: `<span class="en">${s.lines} lines · SKILL.md</span>` })}
  </div>
 </div>
</header>
<main id="main">
 <section class="sec svc-sec" aria-labelledby="what-h">
  <div class="wrap">
   <div class="svc-head">
    ${eyebrow('داخل اسکیل', "WHAT'S INSIDE")}
    <h2 class="h-display rv" id="what-h">تجربهٔ یک متخصص،<br><b>در یک فایل.</b></h2>
    <p class="lead rv">با این اسکیل، Claude کار را مثل یک ${esc(s.role)} باتجربه جلو می‌برد. این‌ها مهم‌ترین چیزهایی است که بلد می‌شود:</p>
   </div>
   <div class="cv-grid">${s.covers.map((c, i) => `<div class="cv-card rv rv-pop" style="--d:${(i % 3) * 0.08}s"><span class="cv-n en">${pad(i + 1)}</span><p>${esc(fixText(c))}</p></div>`).join('')}</div>
  </div>
 </section>
 ${s.prompts?.length ? `<section class="sec svc-sec svc-try" aria-labelledby="ex-h">
  <div class="wrap">
   <div class="svc-head">
    ${eyebrow('نمونهٔ درخواست', 'TRY IT')}
    <h2 class="h-display rv" id="ex-h">بعد از نصب، <b>فقط بپرسید.</b></h2>
    <p class="lead rv">لازم نیست اسم اسکیل را بیاورید. هر وقت درخواست‌تان به این حوزه مربوط باشد، Claude خودش سراغش می‌رود. می‌توانید با یکی از این‌ها شروع کنید:</p>
   </div>
   <div class="try-card rv rv-pop" role="group" aria-label="نمونهٔ درخواست‌ها؛ برای کپی بزنید">
    ${s.prompts.map(p => `<button type="button" class="try-row" data-copy-text="${esc(p)}"><span class="try-q">${esc(fixText(p))}</span><span class="try-copy">${ico('copy')}<span>کپی</span></span></button>`).join('')}
    <span class="try-foot">روی هر نمونه بزنید تا کپی شود، بعد در گفت‌وگو با Claude بچسبانید.</span>
   </div>
  </div>
 </section>` : ''}
 ${installSection(s)}
 <section class="wrap svc-source-wrap" id="source" aria-labelledby="source-h">
  <div class="svc-head svc-head-row">
   <div>${eyebrow('متن کامل', 'SOURCE')}<h2 id="source-h" class="rv">متن کامل اسکیل</h2></div>
   <p class="rv">متن اسکیل انگلیسی است، چون Claude دستورالعمل انگلیسی را دقیق‌تر دنبال می‌کند؛ جواب‌ها اما فارسی می‌آیند. اگر خواستید برای تیم‌تان تغییرش بدهید، فقط <code>name</code> بالای فایل را دست نزنید.</p>
  </div>
  <div class="src-card rv rv-pop" data-src>
   <div class="src-top" dir="ltr">
    <span class="file-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="src-name">${s.slug}/SKILL.md</span>
    <span class="src-lines">${s.lines} lines</span>
    <span class="src-actions"><a class="src-btn" href="${mdUrl(s)}" download>${ico('download')}<span>Download</span></a><button type="button" class="src-btn" data-copy-url="${mdUrl(s)}">${ico('copy')}<span>Copy</span></button></span>
   </div>
   <div class="src-body"><pre id="src-pre" class="src-pre" dir="ltr" tabindex="0" aria-label="متن کامل اسکیل"><code>${sourceLines(s.raw)}</code></pre><span class="src-shade" aria-hidden="true"></span></div>
   <button type="button" class="src-more" aria-expanded="false" aria-controls="src-pre" data-more="ادامهٔ متن · ${faNum(Math.max(0, s.lines - 18))} خط دیگر" data-less="جمع کردن متن"><span>ادامهٔ متن · ${faNum(Math.max(0, s.lines - 18))} خط دیگر</span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
  </div>
 </section>
 <section class="sec svc-sec svc-related" aria-labelledby="rel-h">
  <div class="wrap">
   <div class="related-head"><div>${eyebrow('اسکیل‌های دیگر', 'MORE SKILLS')}<h2 class="rv" id="rel-h">برای هم‌تیمی‌هایتان</h2></div><a class="link-arrow rv" href="/services/#skills">همهٔ اسکیل‌ها ${ARROW}</a></div>
   <div class="sk-grid">${related.map(r => skillCard(r, skills.indexOf(r) + 1)).join('')}</div>
  </div>
 </section>
 <div class="wrap svc-cta">${ctaBand('اسکیل‌ها را در محصول خودتان<br><b>با Claude API به کار ببرید.</b>')}</div>
</main>
</div>
${footer()}`;
}

/* ---------- videos ---------- */
function embedOf(v) {
  if (v.aparat) return `https://www.aparat.com/video/video/embed/videohash/${encodeURIComponent(v.aparat)}/vt/frame`;
  if (v.youtube) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube)}?autoplay=1&rel=0`;
  return '';
}
function videoCard(v, i) {
  const live = v.status === 'live' && (v.aparat || v.youtube || v.src);
  const meta = [v.level && `سطح ${v.level}`].filter(Boolean).map(esc).join(' · ');
  const tone = { 'شروع کار': 1, 'اسکیل‌ها': 2, 'طراحی': 3, 'توسعه': 4, 'Claude API': 5 }[v.topic] || 1;
  const inner = `${v.poster ? `<img src="${esc(v.poster)}" alt="" loading="lazy" width="640" height="360">` : `<span class="vid-n en" aria-hidden="true">${pad(i + 1)}</span>`}<span class="vid-ep">قسمت ${faNum(pad(i + 1))}</span><span class="vid-play">${ico('play')}</span><span class="vid-tag">${esc(v.topic)}</span><span class="vid-state">${live ? (v.minutes ? `${faNum(v.minutes)} دقیقه` : 'پخش') : 'به‌زودی'}</span>`;
  return `<article class="vid rv rv-pop${live ? '' : ' is-soon'}" data-tone="${tone}" style="--d:${(i % 3) * 0.08}s">
   ${live ? `<button type="button" class="vid-thumb" data-embed="${esc(embedOf(v))}" data-src="${esc(v.src || '')}" data-title="${esc(v.title)}" aria-label="پخش ویدیو: ${esc(v.title)}">${inner}</button>` : `<div class="vid-thumb" aria-hidden="true">${inner}</div>`}
   <div class="vid-body"><span class="vid-meta">${meta}</span><h3>${esc(fixText(v.title))}</h3><p>${esc(fixText(v.summary))}</p></div>
  </article>`;
}

/* ---------- index ---------- */
const FAQ = [
  ['اسکیل دقیقاً چیست؟', 'یک فایل متنی به اسم SKILL.md که روال کار یک متخصص را برای Claude توضیح می‌دهد. Claude اول فقط خلاصهٔ چندخطی بالای فایل را می‌بیند و هر وقت درخواست شما به آن حوزه مربوط شد، بقیه‌اش را می‌خواند. این‌طوری لازم نیست در هر گفت‌وگو همه‌چیز را از اول توضیح بدهید.'],
  ['پولی است؟', 'نه، همه رایگان‌اند و می‌توانید هر طور دوست دارید برای خودتان یا تیم‌تان تغییرشان بدهید. فقط هزینهٔ معمول استفاده از خود Claude را می‌پردازید.'],
  ['چرا متن اسکیل‌ها انگلیسی است؟', 'چون Claude دستورالعمل انگلیسی را دقیق‌تر دنبال می‌کند و قالب رسمی اسکیل‌ها هم انگلیسی است. نگران نباشید؛ جواب‌ها فارسی و با نیم‌فاصله و نشانه‌گذاری درست نوشته می‌شوند.'],
  ['از Claude.ai استفاده نمی‌کنم؛ باز هم به کارم می‌آید؟', 'بله. در Claude Code فایل را در پوشهٔ skills بگذارید و در API متنش را توی system prompt. دستور آمادهٔ هر دو در صفحهٔ هر اسکیل هست.'],
];

function indexPage() {
  const url = `${SITE}/services/`;
  const used = groups.filter(g => skills.some(s => s.group === g.id));
  const liveVideos = videos.filter(v => v.status === 'live');
  const soon = liveVideos.length < videos.length;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', '@id': `${url}#page`, url, name: `خدمات و آموزش ${BRAND}`, inLanguage: 'fa-IR', isPartOf: { '@id': `${SITE}/#website` }, publisher: { '@id': `${SITE}/#org` },
      mainEntity: { '@type': 'ItemList', name: 'اسکیل‌های آمادهٔ Claude', numberOfItems: skills.length, itemListElement: skills.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/services/skills/${s.slug}/`, name: `اسکیل Claude برای ${s.role}` })) } },
    orgLd, crumbLd([['/', BRAND], ['/services/', 'خدمات و آموزش']]),
    { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: 'fa-IR', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ...liveVideos.filter(v => v.uploadDate && v.poster).map(v => ({ '@type': 'VideoObject', name: v.title, description: v.summary, uploadDate: v.uploadDate, thumbnailUrl: `${SITE}${v.poster}`, ...(embedOf(v) ? { embedUrl: embedOf(v) } : {}), ...(v.src ? { contentUrl: `${SITE}${v.src}` } : {}), inLanguage: 'fa-IR' })),
  ] };
  return head({ title: `اسکیل‌های آمادهٔ Claude و آموزش ویدیویی | ${BRAND}`, description: `${faNum(skills.length)} اسکیل حرفه‌ای و رایگان Claude برای طراح، توسعه‌دهنده، تحلیلگر داده، تولیدکنندهٔ محتوا و مدیر محصول؛ کپی، دانلود و نصب در یک دقیقه، همراه با آموزش ویدیویی فارسی.`, canonical: url, script: '/src/services.js', extra: `${jsonLd(ld)}\n` })
  + `\n<body class="is-services" data-ea-source="services">\n${topbar('/services/')}
  <div class="svc-hero">
   <div class="svc-hero-copy">
    ${crumbs([['/', 'کلاود ایران'], ['', 'خدمات و آموزش']])}
    <span class="eyebrow"><span class="dot" aria-hidden="true"></span>خدمات و آموزش <span class="en">SKILLS &amp; TUTORIALS</span></span>
    <h1 class="rv" style="--d:.05s"><span class="h1-l">اسکیل‌های آمادهٔ <span class="en">Claude</span></span><b class="h1-l">برای هر نقش در تیم.</b></h1>
    <p class="lead rv" style="--d:.15s">هر اسکیل تجربهٔ یک متخصص است که در یک فایل جمع شده: روال کار، نکته‌ها و چک‌لیست‌هایش. نصبش کنید تا Claude در کار شما هم همان‌طور فکر کند. همه رایگان‌اند.</p>
    <div class="svc-actions rv" style="--d:.25s"><a class="btn btn-dark" href="#skills">مشاهدهٔ اسکیل‌ها ${ARROW}</a><a class="btn btn-line" href="#tutorials">${ico('play')}<span>آموزش ویدیویی</span></a></div>
    <ul class="svc-proof rv" style="--d:.32s"><li>${ico('check')}رایگان و قابل تغییر</li><li>${ico('check')}روی Claude.ai، Claude Code و API</li><li>${ico('check')}فارسی و راست‌به‌چپ را بلد است</li></ul>
   </div>
   ${fileCard(skills[0], { chipA: { icon: 'layers', title: `${faNum(skills.length)} اسکیل آماده`, sub: used.map(g => esc(g.title)).join(' · ') }, chipB: '<span class="en">Claude.ai · Claude Code · API</span>' })}
  </div>
 </div>
</header>
<main id="main">
 <section class="sec center svc-sec" id="skills" aria-labelledby="skills-h">
  <div class="wrap">
   ${eyebrow('اسکیل‌های آماده', 'CLAUDE SKILLS')}
   <h2 class="h-display rv" id="skills-h">یک نقش، <b>یک متخصص آماده.</b></h2>
   <p class="lead rv">از طراحی لوگو تا نوشتن API و تحلیل داده. هر کارت را باز کنید تا ببینید آن اسکیل دقیقاً چه کارهایی بلد است.</p>
   <div class="seg rv" role="group" aria-label="فیلتر حوزه"><button type="button" data-filter="" aria-pressed="true">همه <span class="num">${faNum(skills.length)}</span></button>${used.map(g => `<button type="button" data-filter="${esc(g.id)}" aria-pressed="false">${esc(g.title)} <span class="num">${faNum(skills.filter(s => s.group === g.id).length)}</span></button>`).join('')}</div>
   <div class="sk-grid" id="postCards" data-unit="اسکیل">${skills.map((s, i) => skillCard(s, i + 1)).join('')}</div>
  </div>
 </section>

 ${installSection(null)}

 <section class="sec center svc-sec" id="tutorials" aria-labelledby="tut-h">
  <div class="wrap">
   ${eyebrow('آموزش ویدیویی', 'VIDEO TUTORIALS')}
   <h2 class="h-display rv" id="tut-h">اول ببینید، <b>بعد بسازید.</b></h2>
   <p class="lead rv">ویدیوهای کوتاه فارسی؛ از نصب اولین اسکیل تا ساختن یک محصول واقعی روی Claude API.</p>
   <div class="vid-grid">${videos.map(videoCard).join('')}</div>
   ${soon ? `<p class="vid-note rv">${ico('bell')}<span>داریم ویدیوها را یکی‌یکی آماده می‌کنیم.</span><a class="inline-link" href="/#early-access" data-ea>وقتی منتشر شد خبرم کنید</a></p>` : ''}
  </div>
 </section>

 <section class="sec faq svc-faq" aria-labelledby="faq-h">
  <div class="wrap faq-grid">
   <div>${eyebrow('سؤالات متداول', 'FAQ')}<h2 class="rv" id="faq-h" style="--d:.08s">سؤال‌هایی که<br><b>معمولاً می‌پرسند.</b></h2><p class="lead rv" style="--d:.16s">جوابی که دنبالش هستید اینجا نیست؟ <a class="inline-link" href="/#early-access" data-ea>برایمان بنویسید</a>.</p></div>
   <div class="qa">${FAQ.map(([q, a], i) => `<details name="svc-faq" class="rv rv-pop" style="--d:${0.08 + i * 0.08}s"><summary>${esc(fixText(q))}<span class="plus" aria-hidden="true">${ico('plus')}</span></summary><div class="qa-a">${esc(fixText(a))}</div></details>`).join('')}</div>
  </div>
 </section>
 <div class="wrap svc-cta">${ctaBand('اسکیل‌ها را در محصول خودتان<br><b>با Claude API به کار ببرید.</b>')}</div>
</main>
</div>
${footer()}`;
}

/* ---------- build ---------- */
const slugs = new Set(skills.map(s => s.slug));
if (slugs.size !== skills.length) throw new Error('duplicate skill slug');
for (const s of skills) {
  if ((s.seoTitle || `اسکیل Claude برای ${s.role}`).length > 60) problems.push(`${s.slug}: seo title over 60 chars`);
  if ((s.seoDescription || s.summary).length > 160) problems.push(`${s.slug}: meta description is ${(s.seoDescription || s.summary).length} chars (max 160)`);
  if (!s.covers?.length) problems.push(`${s.slug}: no "covers" list`);
}

rmSync(OUT, { recursive: true, force: true });
rmSync(DL, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'index.html'), indexPage());
for (const s of skills) {
  mkdirSync(path.join(OUT, 'skills', s.slug), { recursive: true });
  writeFileSync(path.join(OUT, 'skills', s.slug, 'index.html'), skillPage(s));
  mkdirSync(path.join(DL, s.slug), { recursive: true });
  writeFileSync(path.join(DL, s.slug, 'SKILL.md'), s.raw);
  writeFileSync(path.join(DL, `${s.slug}.zip`), zip([{ name: `${s.slug}/SKILL.md`, data: s.raw }]));
}
const lastmod = [...skills.map(s => s.updated), ...videos.map(v => v.uploadDate).filter(Boolean)].sort().pop();
writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify([
  { key: 'services', file: 'services/index.html', loc: '/services/', lastmod },
  ...skills.map(s => ({ key: `skill-${s.slug}`, file: `services/skills/${s.slug}/index.html`, loc: `/services/skills/${s.slug}/`, lastmod: s.updated })),
], null, 1));
console.log(`services: ${skills.length} skill(s), ${videos.length} video(s) → services/`);
for (const s of skills) console.log(`  /services/skills/${s.slug}/  ${s.lines} lines`);
if (problems.length) { console.warn('services warnings:\n  ' + problems.join('\n  ')); if (process.env.BLOG_STRICT) process.exit(1); }
