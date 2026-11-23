import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from '@iconify/utils';

// Solar icons (Iconify, CC BY 4.0) are inlined into the HTML at build time,
// so the page is complete without JavaScript and without any network request.
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

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, target: 'es2020',
    // two pages: the landing and the self-contained interactive console demo
    rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), console: fileURLToPath(new URL('./console.html', import.meta.url)) } },
  },
  plugins: [{
    name: 'icons-and-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // SEO tags and JSON-LD belong to the landing only; the console demo is served as authored
        if (!/(^|[\\/])index\.html$/.test(ctx.filename || ctx.path || '')) return html;
        html = html.replace(/<i data-icon="([^"]+)"(?: class="([^"]*)")?><\/i>/g, (_, n, c) => icon(n, c));
        html = html.split('%SITE_URL%').join(SITE);
        return html.replace('</head>', `<script type="application/ld+json">${structuredData(html)}</script>\n</head>`);
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` });
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n` });
    },
  }],
});
