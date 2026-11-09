// Draws the social preview pictures (1200 × 630) for every page in scripts/og-pages.js into site/og/, and the home one to site/og.png.
// Run with: node scripts/build-og.js   (npm run brand runs it after the brand images)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { OG_PAGES } from './og-pages.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'site');
const font = (file) => `data:font/woff2;base64,${readFileSync(join(site, 'fonts', file)).toString('base64')}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Hex twins of the site's oklch accents, so the picture matches the page.
const C = { go: '#7fe0a8', amber: '#f2c66b', sky: '#7cc4f0', violet: '#b48cf2', teal: '#86d8d0', coral: '#f09b7a', lime: '#c7f26b', pink: '#f29ac6' };
const MARK = '<svg width="52" height="43" viewBox="0 0 256 211"><rect width="12" height="211" rx="6" fill="#f4f4f6"/><rect x="16" y="12.8" width="240" height="160" rx="9.6" fill="#2f5be0"/><rect x="99.2" y="56" width="73.6" height="73.6" fill="#fff"/></svg>';

const html = ({ eyebrow, color, head, sub, small }) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url('${font('inter.woff2')}') format('woff2'); font-weight: 100 900; }
@font-face { font-family: Mono; src: url('${font('jetbrains-mono.woff2')}') format('woff2'); font-weight: 100 800; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative; background: #121316; color: #f4f4f6; font-family: Inter, sans-serif; -webkit-font-smoothing: antialiased; }
.grid { position: absolute; inset: 0; background-image: linear-gradient(to right, rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.05) 1px, transparent 1px); background-size: 60px 60px; -webkit-mask-image: radial-gradient(ellipse at 30% 40%, #000 25%, transparent 80%); }
.b1 { position: absolute; left: -220px; top: -180px; width: 640px; height: 640px; border-radius: 50%; background: rgba(180,140,242,.30); filter: blur(120px); }
.b2 { position: absolute; right: -200px; bottom: -260px; width: 580px; height: 580px; border-radius: 50%; background: ${C[color] || C.teal}44; filter: blur(120px); }
.in { position: relative; display: flex; flex-direction: column; height: 100%; padding: 60px 72px 56px; }
.top { display: flex; align-items: center; justify-content: space-between; }
.logo { display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 800; letter-spacing: .02em; }
.eyebrow { display: inline-flex; align-items: center; gap: 10px; padding: 9px 16px; border: 1px solid rgba(255,255,255,.12); border-radius: 999px; background: rgba(255,255,255,.04); color: #a8acb8; font: 600 15px Mono, monospace; letter-spacing: .12em; text-transform: uppercase; }
.eyebrow i { width: 9px; height: 9px; border-radius: 50%; background: ${C[color] || C.violet}; }
h1 { margin-top: auto; max-width: 1040px; font-size: ${small ? 58 : 70}px; font-weight: 600; line-height: 1.04; letter-spacing: -.035em; text-wrap: balance; }
h1 .g { background: linear-gradient(90deg, #b48cf2, #7cc4f0, #86d8d0, #c7f26b, #f2c66b, #f09b7a); -webkit-background-clip: text; color: transparent; }
p { margin-top: 22px; max-width: 980px; color: #a8acb8; font-size: ${small ? 24 : 26}px; line-height: 1.35; }
.bot { display: flex; align-items: center; justify-content: space-between; margin-top: 36px; padding-top: 26px; border-top: 1px solid rgba(255,255,255,.1); color: #a8acb8; font-size: 20px; }
.pill { display: inline-flex; align-items: center; gap: 12px; padding: 12px 22px; border: 1px solid rgba(255,255,255,.14); border-radius: 999px; background: rgba(255,255,255,.04); color: #f4f4f6; font: 500 21px Mono, monospace; }
.pill b { color: #7fe0a8; font-weight: 500; }
</style></head><body>
<div class="grid"></div><div class="b1"></div><div class="b2"></div>
<div class="in">
  <div class="top"><div class="logo">${MARK}SIGSHIP</div><div class="eyebrow"><i></i>${esc(eyebrow)}</div></div>
  <h1>${esc(head[0])}${head[1] ? ` <span class="g">${esc(head[1])}</span>` : ''}</h1>
  <p>${esc(sub)}</p>
  <div class="bot"><span class="pill"><b>$</b> npx sigship</span><span>sigship.dev · free &amp; open source · by zoof04</span></div>
</div>
</body></html>`;

mkdirSync(join(site, 'og'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let n = 0;
for (const [slug, spec] of Object.entries(OG_PAGES)) {
  await page.setContent(html(spec), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  writeFileSync(join(site, 'og', `${slug}.png`), png);
  if (slug === 'home') writeFileSync(join(site, 'og.png'), png);
  n++;
}
await browser.close();
console.log(`Drew ${n} social preview pictures into site/og/ and site/og.png.`);
