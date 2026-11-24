// Builds the page-weight assets from the full-size originals (run after changing an image or font):
//   node tools/optimize-media.mjs
// - responsive WebP widths for every photo (served with srcset/sizes)
// - Vazirmatn subset to Persian/Arabic + punctuation (Latin is drawn by Manrope)
import sharp from 'sharp';
import subsetFont from 'subset-font';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'public', 'img');
const kb = f => Math.round(statSync(f).size / 1024) + ' KB';

const IMAGES = {
  'capital-persepolis': [480, 800, 1100], // hero statue (≤540px wide, 2× on retina), blog feature, dev section
  'relief-guard': [300, 400, 600],             // access section (≤340px) + footer (150px)
  'relief-servants': [600],               // alerts section (≤330px), dialog side, blog CTA
};
for (const [name, widths] of Object.entries(IMAGES)) {
  const src = path.join(IMG, `${name}.webp`);
  for (const w of widths) {
    const out = path.join(IMG, `${name}-${w}.webp`);
    await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: 74, alphaQuality: 80, effort: 6, smartSubsample: true }).toFile(out);
    console.log(`${name}-${w}.webp  ${kb(out)}  (original ${kb(src)})`);
  }
}

// Persian/Arabic letters, Persian digits, ZWNJ/bidi marks, Arabic punctuation, plus basic punctuation/space
const ranges = [[0x20, 0x7e], [0xa0, 0xbb], [0x600, 0x6ff], [0x200c, 0x200f], [0x2010, 0x2027], [0x2066, 0x2069], [0x2190, 0x2193], [0xfdfc, 0xfdfc]];
let text = '';
for (const [a, b] of ranges) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);
const full = path.join(ROOT, 'public', 'fonts', 'Vazirmatn-wght.woff2');
const out = path.join(ROOT, 'public', 'fonts', 'Vazirmatn-fa.woff2');
writeFileSync(out, await subsetFont(readFileSync(full), text, { targetFormat: 'woff2', variationAxes: { wght: { min: 100, max: 900 } } }));
console.log(`Vazirmatn-fa.woff2  ${kb(out)}  (full ${kb(full)})`);
