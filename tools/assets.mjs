// Generates public/og-image.png (1200x630) and PNG app icons from the brand mark (Keel redesign).
// The OG card uses the page's own <h1> and og:description, so it always matches the copy.
// Run: node tools/assets.mjs   (uses the locally installed Chrome)
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const strip = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// hero h1 = <span class="en">Latin line</span><b>bold Persian line</b><span class="aside">tagline</span>
const h1Raw = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
const part = re => strip((h1Raw.match(re) || [])[1] || '');
const latin = part(/<span class="en"[^>]*>([\s\S]*?)<\/span>/) || 'Claude API';
const bold = part(/<b>([\s\S]*?)<\/b>/) || 'کلاود ایران';
const aside = part(/<span class="aside">([\s\S]*?)<\/span>/);
const tag = strip((html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || '');
// the card is written to a temp file and opened with file://, so fonts and the image load from public/
const data = (dir, f) => pathToFileURL(path.join(ROOT, 'public', dir, f)).href;

// brand mark: diamond with a terracotta bar on an ink tile (same as favicon.svg)
const markInner = `<path d="m16 6.5 8.2 9.5-8.2 9.5L7.8 16 16 6.5Z" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/><path d="M12.2 16h7.6" stroke="#D97757" stroke-width="2.4" stroke-linecap="round"/>`;
const mark = `<svg viewBox="0 0 32 32" width="100%" height="100%"><rect width="32" height="32" rx="9" fill="#181C25"/>${markInner}</svg>`;

const og = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>
@font-face { font-family: V; src: url(${data('fonts', 'Vazirmatn-wght.woff2')}); font-weight: 100 900; }
@font-face { font-family: M; src: url(${data('fonts', 'Manrope-wght.woff2')}); font-weight: 200 800; }
html,body{margin:0}
.c{width:1200px;height:630px;position:relative;overflow:hidden;color:#181C25;font-family:V;background:#E9E9EB}
.g{position:absolute;left:-120px;bottom:-200px;width:620px;height:620px;background:radial-gradient(closest-side,rgba(217,119,87,.45),rgba(217,119,87,0))}
.statue{position:absolute;left:40px;bottom:-140px;width:420px;filter:drop-shadow(0 30px 40px rgba(24,28,37,.2))}
.card{position:absolute;left:300px;top:250px;width:230px;padding:18px 20px;border-radius:22px;background:#181C25;color:#fff;box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
.card small{display:block;font-size:15px;color:#A9ADB6}
.card b{display:block;font-family:M;font-size:50px;font-weight:400;line-height:1.1;margin-top:6px;letter-spacing:-1px}
.card i{display:block;height:6px;border-radius:6px;margin-top:14px;background:#D97757;width:68%}
.b{position:absolute;top:58px;right:76px;display:flex;align-items:center;gap:14px;font-weight:800;font-size:30px}
.b i{display:block;width:48px;height:48px}
.en{position:absolute;right:76px;top:150px;font-family:M;font-weight:300;font-size:92px;line-height:1;letter-spacing:-5px;direction:ltr}
h1{position:absolute;right:76px;top:262px;margin:0;font-weight:800;font-size:76px;line-height:1.2}
.aside{position:absolute;right:80px;top:372px;font-size:30px;font-weight:400}
p{position:absolute;right:80px;width:620px;bottom:56px;margin:0;font-size:21px;line-height:1.8;color:#4F535D}
</style></head><body><div class="c"><div class="g"></div><img class="statue" src="${data('img', 'capital-persepolis.webp')}"><div class="card"><small>بودجهٔ ماهانه · نمونه</small><b>68%</b><i></i></div><div class="b"><i>${mark}</i>کلاود ایران</div><div class="en">${latin}</div><h1>${bold}</h1><div class="aside">${aside}</div><p>${tag}</p></div></body></html>`;

const iconHtml = size => `<!doctype html><html><body style="margin:0;background:#181C25"><div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:#181C25"><div style="width:${Math.round(size * .78)}px;height:${Math.round(size * .78)}px"><svg viewBox="4 4 24 24" width="100%" height="100%">${markInner}</svg></div></div></body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
const ogFile = path.join(os.tmpdir(), `claudeiran-og-${process.pid}.html`);
writeFileSync(ogFile, og);
await page.goto(pathToFileURL(ogFile).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
writeFileSync(path.join(ROOT, 'public', 'og-image.png'), await page.screenshot({ type: 'png' }));
for (const s of [180, 192, 512]) {
  await page.setViewport({ width: s, height: s, deviceScaleFactor: 1 });
  await page.setContent(iconHtml(s), { waitUntil: 'load' });
  const name = s === 180 ? 'apple-touch-icon.png' : `icon-${s}.png`;
  writeFileSync(path.join(ROOT, 'public', name), await page.screenshot({ type: 'png' }));
}
await browser.close();
console.log('og-image.png + icons written; h1 =', latin, '/', bold, '/', aside);
