// Shared chrome and text helpers for the generated pages (blog, services, 404).
// Every generated page uses the same head, top bar, footer and closing CTA as the landing.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const site = JSON.parse(readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
export const SITE = site.siteUrl.replace(/\/$/, '');
export const BRAND = site.siteName;

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const strip = html => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
export const tt = s => esc(s).replace(/(Claude|Messages|OpenAI) (API)/g, '$1&nbsp;$2'); // keep brand + API together in headings
export const faNum = n => Number(n).toLocaleString('fa-IR', { useGrouping: false });
export const jalali = iso => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date(iso + 'T12:00:00Z'));
export const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

/* ---------- bidi hygiene ----------
   Latin words separated by the Persian comma («Haiku، Sonnet») form one LTR run and read in
   reverse order; a right-to-left mark after every «،» breaks the run. Tokens that start with a dot
   (.env, .gitignore) are isolated so the dot stays in front. Code is never touched. */
export const RLM = String.fromCharCode(0x200F), LRI = String.fromCharCode(0x2066), PDI = String.fromCharCode(0x2069);
export const fixText = s => String(s ?? '').split('،').join('،' + RLM).replace(new RegExp(`(^|[\\s(«])(\\.[A-Za-z][\\w.-]*)`, 'g'), `$1${LRI}$2${PDI}`);
export const fixHtml = html => html.replace(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)|([^<]+)/g, (m, keep, text) => keep || fixText(text));

/* ---------- shared chrome ---------- */
export const sprite = (() => {
  const idx = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = idx.match(/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">[\s\S]*?<\/svg>/);
  if (!m) throw new Error('icon sprite not found in index.html');
  return m[0];
})();
export const ARROW = '<svg class="ico flip" aria-hidden="true"><use href="#i-arrow-ur"/></svg>';
export const ico = id => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;

export function head({ title, description, canonical, type = 'website', robots = 'index, follow, max-image-preview:large', extra = '', script = '/src/blog.js' }) {
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
${extra}<script type="module" src="${script}"></script>
</head>`;
}

export const NAV = [['/#features', 'مزیت‌ها'], ['/#dashboard', 'داشبورد'], ['/#how', 'روش کار'], ['/#products', 'محصولات'], ['/#developers', 'توسعه‌دهندگان'], ['/#faq', 'سؤالات'], ['/services/', 'خدمات و آموزش'], ['/blog/', 'بلاگ']];
export function topbar(current = '/blog/') {
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

export function footer() {
  return `<footer class="footer dark">
 <div class="wrap">
  <div class="f-top">
   <div class="f-brand">
    <a class="brand" href="/"><svg class="ico" aria-hidden="true"><use href="#i-brand"/></svg><span>کلاود ایران</span></a>
    <p class="f-about">زیرساختی در حال توسعه برای مدیریت دسترسی به Claude API با کنترل هزینه، کلیدهای اختصاصی و گزارش مصرف قابل پیگیری.</p>
    <a class="f-status" href="/#early-access" data-ea><span class="dot" aria-hidden="true"></span>پیش‌عرضه · ثبت‌نام پایلوت باز است</a>
   </div>
   <nav class="f-col" aria-label="محصول"><h3>محصول</h3><a href="/#features">مزیت‌ها</a><a href="/#dashboard">داشبورد</a><a href="/#how">روش کار</a><a href="/#products">مسیر توسعه</a></nav>
   <nav class="f-col" aria-label="اطلاعات"><h3>اطلاعات</h3><a href="/services/">خدمات و آموزش</a><a href="/blog/">بلاگ</a><a href="/#developers">توسعه‌دهندگان</a><a href="/#faq">سؤالات متداول</a><a href="/#early-access" data-ea>دسترسی زودهنگام</a></nav>
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

export function ctaBand(h = 'وقتی راه‌اندازی شد،<br><b>اول به شما خبر می‌دهیم.</b>') {
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
