// Builds the blog from content/blog/*.md into static HTML sources that Vite then bundles:
//   blog/index.html, blog/<slug>/index.html, 404.html, blog/posts.json, blog/latest.html
// The generated files are build output (git-ignored); the Markdown files are the source.
// Format of an article: docs/seo/article-format.md
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Marked } from 'marked';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'content', 'blog');
const OUT = path.join(ROOT, 'blog');
const site = JSON.parse(readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const SITE = site.siteUrl.replace(/\/$/, '');
const BRAND = site.siteName;

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = html => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const tt = s => esc(s).replace(/(Claude|Messages|OpenAI) (API)/g, '$1&nbsp;$2'); // keep brand + API together in headings
const faNum = n => Number(n).toLocaleString('fa-IR', { useGrouping: false });
const jalali = iso => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date(iso + 'T12:00:00Z'));
const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const CLUSTER_ORDER = ['مبانی', 'هزینه و توکن', 'مدل‌ها', 'مقایسه', 'توسعه', 'امنیت'];

/* ---------- bidi hygiene ----------
   Latin words separated by the Persian comma («Haiku، Sonnet») form one LTR run and read in
   reverse order; a right-to-left mark after every «،» breaks the run. Tokens that start with a dot
   (.env, .gitignore) are isolated so the dot stays in front. Code is never touched. */
const RLM = String.fromCharCode(0x200F), LRI = String.fromCharCode(0x2066), PDI = String.fromCharCode(0x2069);
const fixText = s => String(s ?? '').split('،').join('،' + RLM).replace(new RegExp(`(^|[\\s(«])(\\.[A-Za-z][\\w.-]*)`, 'g'), `$1${LRI}$2${PDI}`);
const fixHtml = html => html.replace(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)|([^<]+)/g, (m, keep, text) => keep || fixText(text));

/* ---------- parsing ---------- */
function parseFile(file) {
  const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${path.basename(file)}: missing frontmatter`);
  const fm = {};
  for (const line of m[1].split('\n')) {
    const k = line.match(/^([A-Za-z]+):\s*(.*?)\s*$/);
    if (k) fm[k[1]] = k[2].replace(/\s+\(.*\)$/, '');
  }
  for (const key of ['slug', 'title', 'description', 'cluster', 'date']) if (!fm[key]) throw new Error(`${path.basename(file)}: frontmatter "${key}" is required`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fm.slug)) throw new Error(`${fm.slug}: slug must be latin kebab-case`);
  for (const k of ['title', 'seoTitle', 'description', 'excerpt']) if (fm[k]) fm[k] = fixText(fm[k]);
  return { ...fm, featured: fm.featured === 'true', keywords: (fm.keywords || '').split(/[,،]/).map(s => s.trim()).filter(Boolean), updated: fm.updated || fm.date, body: m[2].trim() };
}

const marked = new Marked({ gfm: true, breaks: false });
function slugifyHeading(text, used) {
  let id = strip(text).split(RLM).join('').split(LRI).join('').split(PDI).join('').replace(/[«»"'`:؟?!.,،؛;()[\]{}\/\\|<>*+=#%^&~]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').toLowerCase().slice(0, 64) || 'section';
  let n = id, i = 2; while (used.has(n)) n = `${id}-${i++}`; used.add(n); return n;
}
function renderBody(md) {
  let html = fixHtml(marked.parse(md));
  const used = new Set(), toc = [];
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, lvl, inner) => {
    const id = slugifyHeading(inner, used);
    if (lvl === '2') toc.push({ id, text: strip(inner) });
    return `<h${lvl} id="${id}"><a class="h-anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${lvl}>`;
  });
  // code blocks: language label + copy button, always LTR
  html = html.replace(/<pre><code(?: class="language-([\w+-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_, lang = '', code) => {
    const label = { js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript', py: 'Python', python: 'Python', bash: 'Terminal', sh: 'Terminal', shell: 'Terminal', curl: 'Terminal', json: 'JSON', xml: 'XML', text: 'Text', txt: 'Text', prompt: 'Prompt', yaml: 'YAML', env: '.env', http: 'HTTP' }[lang.toLowerCase()] || (lang ? lang.toUpperCase() : 'CODE');
    return `<figure class="code" dir="ltr"><figcaption><span>${label}</span><button type="button" class="code-copy" data-copy aria-label="کپی کد"><svg class="ico" aria-hidden="true"><use href="#i-copy"/></svg><span>Copy</span></button></figcaption><pre><code${lang ? ` class="language-${lang}"` : ''}>${code}</code></pre></figure>`;
  });
  html = html.replace(/<table>/g, '<div class="table-wrap" tabindex="0" role="region" aria-label="جدول"><table>').replace(/<\/table>/g, '</table></div>');
  html = html.replace(/<blockquote>\s*([\s\S]*?)<\/blockquote>/g, (_, inner) => {
    const k = inner.match(/^<p><strong>(نکته|هشدار|خلاصه|مثال)[:：]?<\/strong>/);
    const kind = k ? { 'نکته': 'tip', 'هشدار': 'warn', 'خلاصه': 'sum', 'مثال': 'ex' }[k[1]] : 'quote';
    return kind === 'quote' ? `<blockquote>${inner}</blockquote>` : `<aside class="callout callout-${kind}">${inner}</aside>`;
  });
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
  return { html, toc };
}
function splitFaq(md) {
  const m = md.match(/\n##\s*(?:سؤالات|سوالات|پرسش‌های)\s*(?:متداول|رایج)\s*\n([\s\S]*)$/);
  if (!m) return { body: md, faq: [] };
  const faq = m[1].split(/^###\s+/m).map(s => s.trim()).filter(Boolean).map(block => {
    const [q, ...rest] = block.split('\n');
    return { q: fixText(q.trim()), a: rest.join('\n').trim() };
  }).filter(x => x.q && x.a);
  return { body: md.slice(0, m.index), faq };
}
const readMinutes = html => Math.max(3, Math.round(strip(html).split(/\s+/).length / 200));

/* ---------- shared chrome ---------- */
const sprite = (() => {
  const idx = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = idx.match(/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">[\s\S]*?<\/svg>/);
  if (!m) throw new Error('icon sprite not found in index.html');
  return m[0];
})();
const ARROW = '<svg class="ico flip" aria-hidden="true"><use href="#i-arrow-ur"/></svg>';

function head({ title, description, canonical, type = 'website', robots = 'index, follow, max-image-preview:large', extra = '' }) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
${canonical ? `<link rel="canonical" href="${canonical}">\n<link rel="alternate" hreflang="fa-IR" href="${canonical}">\n<link rel="alternate" hreflang="x-default" href="${canonical}">` : ''}
<meta name="theme-color" content="${site.themeColor || '#E9E9EB'}">
<meta name="color-scheme" content="light">
<meta property="og:type" content="${type}">
<meta property="og:locale" content="fa_IR">
<meta property="og:site_name" content="${esc(BRAND)}">
${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="بلاگ ${esc(BRAND)}" href="${SITE}/blog/feed.xml">
<link rel="preload" href="/fonts/Vazirmatn-fa.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Manrope-wght.woff2" as="font" type="font/woff2" crossorigin>
${extra}<script type="module" src="/src/blog.js"></script>
</head>`;
}

const NAV = [['/#features', 'مزیت‌ها'], ['/#dashboard', 'داشبورد'], ['/#how', 'روش کار'], ['/#products', 'محصولات'], ['/#developers', 'توسعه‌دهندگان'], ['/#faq', 'سؤالات'], ['/blog/', 'بلاگ']];
function topbar(current = '/blog/') {
  const links = NAV.map(([h, t]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `${sprite}
<a class="skip" href="#main">پرش به محتوای اصلی</a>
<div class="announce" role="note"><span class="dot" aria-hidden="true"></span><span>کلاود ایران در مرحله پیش‌عرضه است؛ ثبت‌نام برای پایلوت اولیه باز است.</span><a href="/#early-access" data-ea>درخواست دسترسی زودهنگام</a></div>`
  + `\n<div class="sheet">\n<header class="hero-panel page-hero" id="top">\n <div class="wrap">
  <div class="nav">
   <a class="brand" href="/" aria-label="کلاود ایران — صفحهٔ اصلی"><svg class="ico" aria-hidden="true"><use href="#i-brand"/></svg><span>کلاود ایران</span></a>
   <nav class="navpill" aria-label="ناوبری اصلی">${links}</nav>
   <div class="nav-end">
    <a class="btn btn-dark" href="/#early-access" data-ea>درخواست دسترسی ${ARROW}</a>
    <button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="mnav" aria-label="باز کردن منو"><svg class="ico" aria-hidden="true"><use href="#i-menu"/></svg></button>
   </div>
  </div>
  <nav class="mnav" id="mnav" aria-label="ناوبری موبایل">${NAV.map(([h, t]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t === 'سؤالات' ? 'سؤالات متداول' : t}</a>`).join('')}<a href="/#early-access" data-ea>درخواست دسترسی زودهنگام ↖</a></nav>`;
}

function footer() {
  return `<footer class="footer dark">
 <div class="wrap">
  <div class="f-top">
   <div class="f-brand">
    <a class="brand" href="/"><svg class="ico" aria-hidden="true"><use href="#i-brand"/></svg><span>کلاود ایران</span></a>
    <p class="f-about">زیرساختی در حال توسعه برای مدیریت دسترسی به Claude API با کنترل هزینه، کلیدهای اختصاصی و گزارش مصرف قابل پیگیری.</p>
    <a class="f-status" href="/#early-access" data-ea><span class="dot" aria-hidden="true"></span>پیش‌عرضه · ثبت‌نام پایلوت باز است</a>
   </div>
   <nav class="f-col" aria-label="محصول"><h3>محصول</h3><a href="/#features">مزیت‌ها</a><a href="/#dashboard">داشبورد</a><a href="/#how">روش کار</a><a href="/#products">مسیر توسعه</a></nav>
   <nav class="f-col" aria-label="اطلاعات"><h3>اطلاعات</h3><a href="/blog/">بلاگ</a><a href="/#developers">توسعه‌دهندگان</a><a href="/#faq">سؤالات متداول</a><a href="/#early-access" data-ea>دسترسی زودهنگام</a></nav>
   <a class="f-console" href="/console.html">
    <img class="f-relief" src="/img/relief-guard-300.webp" decoding="async" width="900" height="1805" alt="" aria-hidden="true" loading="lazy">
    <span class="f-console-top"><span class="eyebrow"><span class="dot" aria-hidden="true"></span>کنسول تعاملی <span class="en">LIVE DEMO</span></span><span class="go" aria-hidden="true"><svg class="ico flip"><use href="#i-arrow-ur"/></svg></span></span>
    <b>پیش از شروع پایلوت، کنسول را امتحان کنید.</b>
    <small>پروژه بسازید، کلید آزمایشی بگیرید و هزینهٔ هر درخواست را تا سطح توکن دنبال کنید؛ همه با دادهٔ نمونه.</small>
   </a>
  </div>
  <div class="f-bottom"><span>© ۲۰۲۶ کلاود ایران. همهٔ حقوق محفوظ است.</span><span class="f-legal">Claude و Anthropic علائم تجاری Anthropic هستند. کلاود ایران وابسته به Anthropic نیست.</span><a class="to-top" href="#top" aria-label="بازگشت به بالای صفحه"><svg class="ico" aria-hidden="true"><use href="#i-up"/></svg></a></div>
 </div>
</footer>
<div class="sticky-cta" id="stickyCta"><a class="btn btn-dark" href="/#early-access" data-ea tabindex="-1">درخواست دسترسی زودهنگام ${ARROW}</a></div>
</body>
</html>
`;
}

function ctaBand(h = 'وقتی راه‌اندازی شد،<br><b>اول به شما خبر می‌دهیم.</b>') {
  return `<section class="post-cta" aria-labelledby="cta-h">
  <img src="/img/relief-servants-600.webp" decoding="async" width="1100" height="1472" alt="" aria-hidden="true" loading="lazy">
  <div class="post-cta-copy">
   <span class="eyebrow"><span class="dot" aria-hidden="true"></span>دسترسی زودهنگام <span class="en">EARLY ACCESS</span></span>
   <h2 id="cta-h">${h}</h2>
   <p>کلاود ایران در مرحلهٔ پیش‌عرضه است: کلید جدا برای هر پروژه، بودجه و سقف مصرف، و تسویه تا سطح توکن. نام، ایمیل و شماره‌تان را بگذارید تا پیام شروع را بفرستیم؛ بدون هزینه و تعهد.</p>
   <div class="post-cta-actions"><a class="btn btn-primary" href="/#early-access" data-ea>درخواست دسترسی زودهنگام ${ARROW}</a><a class="btn btn-ghost-dark" href="/console.html">دیدن کنسول نمونه</a></div>
  </div>
 </section>`;
}

function card(p, { big = false, headingLevel = 3, dup = false } = {}) {
  const h = `h${headingLevel}`;
  return `<article class="post-card${big ? ' is-big' : ''}" data-cluster="${esc(p.cluster)}"${dup ? ' data-dup hidden' : ''}>
  <a class="post-card-link" href="/blog/${p.slug}/">
   <span class="post-card-top"><span class="chip"><span class="dot" aria-hidden="true"></span>${esc(p.cluster)}</span><span class="post-card-go" aria-hidden="true"><svg class="ico flip"><use href="#i-arrow-ur"/></svg></span></span>
   <${h}>${tt(p.title)}</${h}>
   <p>${esc(p.excerpt || p.description)}</p>
   <span class="post-card-meta"><span><svg class="ico" aria-hidden="true"><use href="#i-clock"/></svg>${faNum(p.minutes)} دقیقه مطالعه</span><time datetime="${p.updated}">${jalali(p.updated)}</time></span>
  </a>
 </article>`;
}

/* ---------- pages ---------- */
function articlePage(p, posts) {
  const url = `${SITE}/blog/${p.slug}/`;
  const related = posts.filter(x => x.slug !== p.slug).sort((a, b) => (b.cluster === p.cluster) - (a.cluster === p.cluster) || (b.featured - a.featured)).slice(0, 3);
  const faqHtml = p.faq.length ? `<section class="post-faq" aria-labelledby="faq-h"><h2 id="faq-h"><a class="h-anchor" href="#faq-h" aria-hidden="true" tabindex="-1">#</a>سؤالات متداول</h2><div class="qa">${p.faq.map(f => `<details name="post-faq"><summary>${esc(f.q)}<span class="plus" aria-hidden="true"><svg class="ico"><use href="#i-plus"/></svg></span></summary><div class="qa-a">${fixHtml(marked.parseInline(f.a))}</div></details>`).join('')}</div></section>` : '';
  const toc = [...p.toc, ...(p.faq.length ? [{ id: 'faq-h', text: 'سؤالات متداول' }] : [])];
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', '@id': `${url}#article`, headline: p.title, description: p.description, inLanguage: 'fa-IR', datePublished: p.date, dateModified: p.updated, mainEntityOfPage: url, url, image: `${SITE}/og-image.png`, keywords: p.keywords.join(', '), articleSection: p.cluster, wordCount: p.words, timeRequired: `PT${p.minutes}M`,
      author: { '@type': 'Organization', name: `تیم تحریریهٔ ${BRAND}`, url: `${SITE}/` }, publisher: { '@id': `${SITE}/#org` }, isPartOf: { '@id': `${SITE}/blog/#blog` } },
    { '@type': 'Organization', '@id': `${SITE}/#org`, name: BRAND, url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: BRAND, item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'بلاگ', item: `${SITE}/blog/` },
      { '@type': 'ListItem', position: 3, name: p.title, item: url }] },
    ...(p.faq.length ? [{ '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: 'fa-IR', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: strip(f.q), acceptedAnswer: { '@type': 'Answer', text: strip(marked.parseInline(f.a)) } })) }] : []),
  ] };
  return head({
    title: `${p.seoTitle || p.title} | ${BRAND}`, description: p.description, canonical: url, type: 'article',
    extra: `<meta property="article:published_time" content="${p.date}">\n<meta property="article:modified_time" content="${p.updated}">\n<meta property="article:section" content="${esc(p.cluster)}">\n${jsonLd(ld)}\n`,
  }) + `\n<body class="is-post">\n<div class="read-progress" aria-hidden="true"><i></i></div>\n${topbar()}
  <div class="post-head">
   <nav class="crumbs" aria-label="مسیر صفحه"><a href="/">کلاود ایران</a><span aria-hidden="true">/</span><a href="/blog/">بلاگ</a><span aria-hidden="true">/</span><span>${esc(p.cluster)}</span></nav>
   <span class="eyebrow"><span class="dot" aria-hidden="true"></span>${esc(p.cluster)}</span>
   <h1>${tt(p.title)}</h1>
   <p class="post-dek">${esc(p.description)}</p>
   <div class="post-meta"><span><svg class="ico" aria-hidden="true"><use href="#i-book"/></svg>تیم تحریریهٔ کلاود ایران</span><span><svg class="ico" aria-hidden="true"><use href="#i-clock"/></svg>${faNum(p.minutes)} دقیقه مطالعه</span><span>به‌روزرسانی <time datetime="${p.updated}">${jalali(p.updated)}</time></span></div>
  </div>
 </div>
</header>
<main id="main">
 <div class="wrap post-grid">
  <aside class="post-aside" aria-label="فهرست مطالب و دسترسی زودهنگام">
   <details class="toc" open><summary id="toc-h">در این مقاله<svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></summary><nav aria-labelledby="toc-h"><ol>${toc.map(t => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav></details>
   <div class="aside-cta"><span class="eyebrow"><span class="dot" aria-hidden="true"></span>پیش‌عرضه</span><b>کلید جدا، بودجهٔ روشن، تسویه تا سطح توکن.</b><a class="btn btn-dark" href="/#early-access" data-ea>درخواست دسترسی ${ARROW}</a></div>
  </aside>
  <article class="prose" id="article">
${p.html}
${faqHtml}
   <p class="post-disclaimer">کلاود ایران سرویسی مستقل و در مرحلهٔ پیش‌عرضه است و وابسته به Anthropic نیست. Claude و Anthropic علائم تجاری Anthropic هستند. برای مشخصات به‌روز مدل‌ها و قیمت‌ها همیشه مستندات رسمی را ببینید.</p>
  </article>
 </div>
 <div class="wrap">${ctaBand()}</div>
 <section class="wrap related" aria-labelledby="rel-h">
  <div class="related-head"><h2 id="rel-h">ادامهٔ مطالعه</h2><a class="link-arrow" href="/blog/">همهٔ مقاله‌ها ${ARROW}</a></div>
  <div class="post-cards">${related.map(r => card(r)).join('')}</div>
 </section>
</main>
</div>
${footer()}`;
}

function indexPage(posts) {
  const url = `${SITE}/blog/`;
  const featured = posts.find(p => p.featured) || posts[0];
  const rest = posts.filter(p => p !== featured);
  const clusters = CLUSTER_ORDER.filter(c => posts.some(p => p.cluster === c)).concat([...new Set(posts.map(p => p.cluster))].filter(c => !CLUSTER_ORDER.includes(c)));
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Blog', '@id': `${url}#blog`, url, name: `بلاگ ${BRAND}`, description: 'راهنماهای فارسی Claude API برای توسعه‌دهندگان و تیم‌ها', inLanguage: 'fa-IR', publisher: { '@id': `${SITE}/#org` },
      blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}/`, datePublished: p.date, dateModified: p.updated })) },
    { '@type': 'Organization', '@id': `${SITE}/#org`, name: BRAND, url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: BRAND, item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: 'بلاگ', item: url }] },
  ] };
  return head({ title: `بلاگ Claude API؛ راهنمای فارسی برای تیم‌ها | ${BRAND}`, description: 'راهنماهای فارسی و دقیق Claude API: توکن و هزینه، انتخاب مدل، مهاجرت از OpenAI، پرامپت‌نویسی و امنیت کلید؛ برای توسعه‌دهندگان، مدیران محصول و تیم‌های مالی.', canonical: url, extra: `${jsonLd(ld)}\n` })
  + `\n<body class="is-blog">\n${topbar()}
  <div class="blog-head">
   <div>
    <nav class="crumbs" aria-label="مسیر صفحه"><a href="/">کلاود ایران</a><span aria-hidden="true">/</span><span>بلاگ</span></nav>
    <span class="eyebrow"><span class="dot" aria-hidden="true"></span>بلاگ کلاود ایران <span class="en">FIELD NOTES</span></span>
    <h1>راهنمای <span class="en">Claude API</span>،<br><b>برای تیم‌هایی که محصول می‌سازند.</b></h1>
   </div>
   <div class="blog-head-side">
    <p class="lead">توکن و هزینه، انتخاب مدل، مهاجرت از OpenAI، پرامپت‌نویسی و امنیت کلید؛ به فارسی، دقیق و بر پایهٔ مستندات رسمی.</p>
    <dl class="blog-facts"><div><dt>مقاله</dt><dd class="num">${faNum(posts.length)}</dd></div><div><dt>موضوع</dt><dd class="num">${faNum(clusters.length)}</dd></div><div><dt>به‌روزرسانی</dt><dd>${jalali(posts.map(p => p.updated).sort().pop())}</dd></div></dl>
   </div>
  </div>
 </div>
</header>
<main id="main">
 <section class="wrap blog-featured" aria-label="مقالهٔ ستون">
  <a class="feature" href="/blog/${featured.slug}/">
   <span class="feature-art" aria-hidden="true"><img src="/img/capital-persepolis-800.webp" srcset="/img/capital-persepolis-480.webp 480w, /img/capital-persepolis-800.webp 800w, /img/capital-persepolis-1100.webp 1100w" sizes="(max-width:1020px) 70vw, 440px" width="1300" height="1602" alt="" fetchpriority="high" decoding="async"></span>
   <span class="feature-copy">
    <span class="chip chip-dark"><span class="dot" aria-hidden="true"></span>نقطهٔ شروع · ${esc(featured.cluster)}</span>
    <h2>${tt(featured.title)}</h2>
    <p>${esc(featured.excerpt || featured.description)}</p>
    <span class="post-card-meta"><span><svg class="ico" aria-hidden="true"><use href="#i-clock"/></svg>${faNum(featured.minutes)} دقیقه مطالعه</span><time datetime="${featured.updated}">${jalali(featured.updated)}</time></span>
    <span class="btn btn-primary feature-btn">خواندن راهنما ${ARROW}</span>
   </span>
  </a>
 </section>
 <section class="wrap blog-list" aria-labelledby="list-h">
  <div class="blog-list-head">
   <h2 id="list-h">همهٔ مقاله‌ها</h2>
   <div class="filters" role="group" aria-label="فیلتر موضوع"><button type="button" class="filter" data-filter="" aria-pressed="true">همه <span class="num">${faNum(posts.length)}</span></button>${clusters.map(c => `<button type="button" class="filter" data-filter="${esc(c)}" aria-pressed="false">${esc(c)} <span class="num">${faNum(posts.filter(p => p.cluster === c).length)}</span></button>`).join('')}</div>
  </div>
  <div class="post-cards" id="postCards">${[featured, ...rest].map(p => card(p, { dup: p === featured })).join('')}</div>
  <p class="filter-empty" id="filterEmpty" hidden>در این موضوع هنوز مقاله‌ای منتشر نشده است.</p>
 </section>
 <div class="wrap">${ctaBand('راهنماها را خواندید؟<br><b>برای پایلوت در فهرست باشید.</b>')}</div>
</main>
</div>
${footer()}`;
}

function notFoundPage(posts) {
  return head({ title: `صفحه پیدا نشد | ${BRAND}`, description: 'این نشانی در کلاود ایران وجود ندارد.', canonical: '', robots: 'noindex, follow' })
  + `\n<body class="is-404">\n${topbar('')}
  <div class="blog-head nf-head">
   <div>
    <span class="eyebrow"><span class="dot" aria-hidden="true"></span>خطای ۴۰۴ <span class="en">NOT FOUND</span></span>
    <h1>این صفحه<br><b>پیدا نشد.</b></h1>
    <p class="lead">نشانی را بررسی کنید، یا از یکی از راه‌های زیر ادامه دهید.</p>
    <div class="hero-cta"><a class="btn btn-dark" href="/">صفحهٔ اصلی ${ARROW}</a><a class="btn btn-line" href="/blog/">بلاگ</a></div>
   </div>
  </div>
 </div>
</header>
<main id="main">
 <section class="wrap related" aria-labelledby="rel-h">
  <div class="related-head"><h2 id="rel-h">مقاله‌های پیشنهادی</h2><a class="link-arrow" href="/blog/">همهٔ مقاله‌ها ${ARROW}</a></div>
  <div class="post-cards">${posts.slice(0, 3).map(r => card(r)).join('')}</div>
 </section>
</main>
</div>
${footer()}`;
}

function latestSection(posts) {
  const pick = [posts.find(p => p.featured) || posts[0], ...posts.filter(p => !p.featured)].slice(0, 3);
  return `<section class="sec blog-latest" id="blog" aria-labelledby="blog-h">
  <div class="wrap">
   <div class="related-head">
    <div><span class="eyebrow rv"><span class="dot" aria-hidden="true"></span>از بلاگ <span class="en">FIELD NOTES</span></span>
    <h2 class="h-display rv" id="blog-h" style="--d:.1s">پیش از پایلوت، <b>Claude API را بشناسید.</b></h2></div>
    <a class="link-arrow rv" href="/blog/">همهٔ مقاله‌ها ${ARROW}</a>
   </div>
   <div class="post-cards rv" style="--d:.15s">${pick.map(p => card(p)).join('')}</div>
  </div>
 </section>`;
}

function rss(posts) {
  const items = posts.map(p => `  <item>\n   <title>${esc(p.title)}</title>\n   <link>${SITE}/blog/${p.slug}/</link>\n   <guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid>\n   <pubDate>${new Date(p.date + 'T08:00:00Z').toUTCString()}</pubDate>\n   <category>${esc(p.cluster)}</category>\n   <description>${esc(p.description)}</description>\n  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n <channel>\n  <title>بلاگ ${esc(BRAND)}</title>\n  <link>${SITE}/blog/</link>\n  <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>\n  <description>راهنماهای فارسی Claude API برای توسعه‌دهندگان و تیم‌ها</description>\n  <language>fa-IR</language>\n${items}\n </channel>\n</rss>\n`;
}

/* ---------- build ---------- */
const files = existsSync(SRC) ? readdirSync(SRC).filter(f => f.endsWith('.md') && !f.startsWith('_')) : [];
const posts = files.map(f => {
  const p = parseFile(path.join(SRC, f));
  const { body, faq } = splitFaq(p.body);
  const { html, toc } = renderBody(body);
  const words = strip(html).split(/\s+/).length;
  return { ...p, html, toc, faq, words, minutes: readMinutes(html) };
}).sort((a, b) => (b.featured - a.featured) || b.date.localeCompare(a.date) || CLUSTER_ORDER.indexOf(a.cluster) - CLUSTER_ORDER.indexOf(b.cluster));

const slugs = new Set(posts.map(p => p.slug));
if (slugs.size !== posts.length) throw new Error('duplicate slug');
const problems = [];
for (const p of posts) {
  for (const m of p.html.matchAll(/href="\/blog\/([^"/#]+)\/?[^"]*"/g)) if (!slugs.has(m[1])) problems.push(`${p.slug}: link to missing article /blog/${m[1]}/`);
  if ((p.seoTitle || p.title).length > 60) problems.push(`${p.slug}: seoTitle is ${(p.seoTitle || p.title).length} chars (max 60)`);
  if (p.description.length > 160) problems.push(`${p.slug}: description is ${p.description.length} chars (max 160)`);
  if (!p.faq.length) problems.push(`${p.slug}: no FAQ section`);
  if (/<h1/.test(p.html)) problems.push(`${p.slug}: body contains an H1`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
if (posts.length) {
  writeFileSync(path.join(OUT, 'index.html'), indexPage(posts));
  for (const p of posts) { mkdirSync(path.join(OUT, p.slug), { recursive: true }); writeFileSync(path.join(OUT, p.slug, 'index.html'), articlePage(p, posts)); }
  writeFileSync(path.join(OUT, 'latest.html'), latestSection(posts));
  writeFileSync(path.join(OUT, 'feed.xml'), rss(posts));
}
writeFileSync(path.join(ROOT, '404.html'), notFoundPage(posts));
writeFileSync(path.join(OUT, 'posts.json'), JSON.stringify(posts.map(({ slug, title, date, updated, cluster }) => ({ slug, title, date, updated, cluster })), null, 1));
console.log(`blog: ${posts.length} article(s) → blog/`);
for (const p of posts) console.log(`  /blog/${p.slug}/  ${p.words} words, ${p.minutes} min, ${p.toc.length} h2, ${p.faq.length} faq`);
if (problems.length) { console.warn('blog warnings:\n  ' + problems.join('\n  ')); if (process.env.BLOG_STRICT) process.exit(1); }
