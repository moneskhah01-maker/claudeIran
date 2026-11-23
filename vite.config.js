import { defineConfig } from 'vite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from '@iconify/utils';

// Solar icons (Iconify, CC BY 4.0) are inlined into the HTML at build time,
// so the page is complete without JavaScript and without any network request.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const solar = JSON.parse(readFileSync(new URL('./node_modules/@iconify-json/solar/icons.json', import.meta.url), 'utf8'));
const site = JSON.parse(readFileSync(new URL('./site.config.json', import.meta.url), 'utf8'));
const SITE = site.siteUrl.replace(/\/$/, '');

function icon(name, cls = '') {
  const data = getIconData(solar, name);
  if (!data) throw new Error(`Unknown Solar icon: ${name}`);
  const r = iconToSVG(data, { height: '1em' });
  return iconToHTML(replaceIDs(r.body), { ...r.attributes, class: `ico ${cls}`.trim(), 'aria-hidden': 'true', focusable: 'false' });
}

const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const meta = (html, name) => (html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`)) || [])[1] || '';

// Structured data is derived from the page itself, so it can never drift from the visible copy.
function structuredData(html) {
  const faqs = [...html.matchAll(/<details[^>]*name="faq"[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)]
    .map(m => ({ '@type': 'Question', name: text(m[1]), acceptedAnswer: { '@type': 'Answer', text: text(m[2]) } }));
  const title = text((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
  const description = meta(html, 'description');
  const graph = [
    { '@type': 'Organization', '@id': `${SITE}/#org`, name: site.siteName, url: `${SITE}/`, logo: `${SITE}/icon-512.png` },
    { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: site.siteName, inLanguage: 'fa-IR', publisher: { '@id': `${SITE}/#org` } },
    { '@type': 'WebPage', '@id': `${SITE}/#webpage`, url: `${SITE}/`, name: title, description, inLanguage: 'fa-IR', isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': `${SITE}/#service` }, primaryImageOfPage: `${SITE}/og-image.png` },
    { '@type': 'Service', '@id': `${SITE}/#service`, name: 'پلتفرم API کلاود ایران', serviceType: 'دسترسی کنترل‌شده به مدل‌های Claude از راه API', description, provider: { '@id': `${SITE}/#org` }, inLanguage: 'fa-IR' },
  ];
  if (faqs.length) graph.push({ '@type': 'FAQPage', '@id': `${SITE}/#faq`, mainEntity: faqs, inLanguage: 'fa-IR' });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

// Blog pages are generated from content/blog/*.md by tools/build-blog.mjs (run before vite build).
const BLOG = path.join(ROOT, 'blog');
const posts = existsSync(path.join(BLOG, 'posts.json')) ? JSON.parse(readFileSync(path.join(BLOG, 'posts.json'), 'utf8')) : [];
const input = {
  main: path.join(ROOT, 'index.html'),
  console: path.join(ROOT, 'console.html'),
  ...(existsSync(path.join(ROOT, '404.html')) ? { notfound: path.join(ROOT, '404.html') } : {}),
  ...(existsSync(path.join(BLOG, 'index.html')) ? { blog: path.join(BLOG, 'index.html') } : {}),
};
for (const p of posts) if (existsSync(path.join(BLOG, p.slug, 'index.html'))) input[`post-${p.slug}`] = path.join(BLOG, p.slug, 'index.html');

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, target: 'es2020',
    // landing, console demo, 404, blog index and one page per article
    rollupOptions: { input },
  },
  plugins: [{
    name: 'icons-and-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // SEO tags, the latest-posts block and JSON-LD belong to the landing only; other pages carry their own
        const rel = path.relative(ROOT, ctx.filename || path.join(ROOT, ctx.path || '')).split(path.sep).join('/');
        if (rel !== 'index.html') return html;
        html = html.replace(/<i data-icon="([^"]+)"(?: class="([^"]*)")?><\/i>/g, (_, n, c) => icon(n, c));
        const latest = existsSync(path.join(BLOG, 'latest.html')) ? readFileSync(path.join(BLOG, 'latest.html'), 'utf8') : '';
        html = html.replace('<!--BLOG-LATEST-->', latest);
        html = html.split('%SITE_URL%').join(SITE);
        return html.replace('</head>', `<script type="application/ld+json">${structuredData(html)}</script>\n</head>`);
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n` });
      const today = new Date().toISOString().slice(0, 10);
      const urls = [
        { loc: `${SITE}/`, lastmod: today, freq: 'weekly', pr: '1.0' },
        ...(posts.length ? [{ loc: `${SITE}/blog/`, lastmod: posts.map(p => p.updated).sort().pop(), freq: 'weekly', pr: '0.8' }] : []),
        ...posts.map(p => ({ loc: `${SITE}/blog/${p.slug}/`, lastmod: p.updated, freq: 'monthly', pr: '0.7' })),
      ];
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pr}</priority></url>`).join('\n')}\n</urlset>\n` });
      if (existsSync(path.join(BLOG, 'feed.xml'))) this.emitFile({ type: 'asset', fileName: 'blog/feed.xml', source: readFileSync(path.join(BLOG, 'feed.xml'), 'utf8') });
    },
  }],
});
