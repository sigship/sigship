// Rebuilds every brand image from the current design.
// Colours and fonts come from site/style.css, so a design change flows through here.
// Run with: npm run brand   (first time only: npx playwright install chromium)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { icon, mark, tokens } from './marks.js';
import { writeDemo } from './demo.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'brand');
const site = join(root, 'site');
const press = join(site, 'brand');
const cli = join(root, 'bin/sigship.js');
mkdirSync(out, { recursive: true });
mkdirSync(press, { recursive: true });

// Fonts are embedded so the images render the same on any machine.
const font = (file) => `data:font/woff2;base64,${readFileSync(join(site, 'fonts', file)).toString('base64')}`;
const rawCss = readFileSync(join(site, 'style.css'), 'utf8');
const css = rawCss
  .replace("url('/fonts/archivo.woff2')", `url('${font('archivo.woff2')}')`)
  .replace("url('/fonts/spline-sans-mono.woff2')", `url('${font('spline-sans-mono.woff2')}')`);
const token = tokens(rawCss);

// The flag patterns come from the home page, so the images always match the hero.
const FLAG_DEFS = `<defs>${[...readFileSync(join(root, 'scripts/home/page.html'), 'utf8').matchAll(/<symbol id="flag-[a-z]"[\s\S]*?<\/symbol>/g)].map((m) => m[0]).join('')}</defs>`;
const HOIST = `<svg width="0" height="0" style="position:absolute">${FLAG_DEFS}</svg><ol class="hoist">${[...'sigship']
  .map((f, i) => `<li style="--i:${i}"><button type="button"><svg viewBox="0 0 90 60"><use href="#flag-${f}"/></svg></button></li>`)
  .join('')}</ol>`;
const VERDICT = '<ol class="verdict"><li class="no"><b>NO-GO</b><span>Exit 1. Your fix list is ready.</span></li><li class="to">→</li><li class="go"><b>GO</b><span>Exit 0. Nothing serious found.</span></li></ol>';

const ON_LIGHT = { blue: 'var(--blue)', paper: 'var(--flag-white)', ink: 'var(--ink)' };
const ON_DARK = { blue: 'var(--blue)', paper: 'var(--flag-white)', ink: 'var(--flag-white)' };
const HEX = { blue: token('blue'), paper: token('paper'), ink: token('ink') };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Real output, so the gallery can never drift from what the tool prints.
function run(args, cwd) {
  let text;
  try {
    text = execFileSync('node', [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  } catch (error) {
    text = error.stdout; // NO-GO exits 1 by design.
  }
  // Scan time changes on every run. Pinning it means the images only change when the design or output does.
  return text.replace(/ in \d+ ms,/, ' in 22 ms,');
}

// The same demo app as the home page: the bad version, and the fixed one its AI tool produced from SIGSHIP's prompt.
const bad = writeDemo('bad');
const good = writeDemo('fixed');

const paint = (text) =>
  esc(text.trim())
    .replace(/^SEV-1/gm, '<span class="s1">SEV-1</span>')
    .replace(/^SEV-2/gm, '<span class="s2">SEV-2</span>')
    .replace(/^NO-GO/gm, '<span class="s1">NO-GO</span>')
    .replace(/^GO/gm, '<span class="go">GO</span>');

const noGo = paint(run(['.'], bad));
const fixPrompt = esc(run(['--prompt'], bad).trim());
const go = paint(run(['.'], good));
rmSync(bad, { recursive: true, force: true });
rmSync(good, { recursive: true, force: true });

// A terminal window like the one on the home page, with the verdict on its title bar.
const frame = (title, cmd, body, verdict = '', size = '') => `<div class="g ${size}"><h2>${title}</h2><div class="win"><div class="bar"><span class="lights"><i></i><i></i><i></i></span><span class="path">demo-app</span>${verdict ? `<b class="vb ${verdict === 'GO' ? 'go' : 'no'}">${verdict}</b>` : ''}</div><pre><code><b>$ ${cmd}</b>\n\n${body}</code></pre></div></div>`;
const lockup = (colors, cls = '') => `<div class="lk ${cls}">${mark(colors, ' class="m"')}<span>SIGSHIP</span></div>`;

// [file name, width, height, html, folders, options]. "fit" crops to the artwork; "clear" keeps a transparent background.
const IMAGES = [
  ['logo-240', 240, 240, icon(ON_LIGHT, ' class="ic"'), [out], { clear: true }],
  ['sigship-avatar', 400, 400, icon(ON_LIGHT, ' class="ic"'), [out, press], { clear: true }],
  ['apple-touch-icon', 180, 180, `<div class="tile">${icon(ON_LIGHT, ' class="ic"')}</div>`, [site]],
  ['sigship-logo', 800, 240, lockup(ON_LIGHT), [out, press], { fit: true, clear: true }],
  ['sigship-logo-dark', 800, 240, lockup(ON_DARK, 'dark'), [out, press], { fit: true, clear: true }],
  ['sigship-logo-stacked', 600, 400, lockup(ON_LIGHT, 'stack'), [out, press], { fit: true, clear: true }],
  ['gallery-1-no-go', 1270, 760, frame('The postmortem, before the outage.', 'npx sigship', noGo, 'NO-GO'), [out]],
  ['gallery-2-fix-prompt', 1270, 760, frame('Every finding becomes a fix your AI tool can use.', 'npx sigship --prompt', fixPrompt), [out]],
  ['gallery-3-go', 1270, 760, frame('Exit 0 is the signal to ship.', 'npx sigship', go, 'GO', 'big'), [out]],
  ['og', 1200, 630, `<div class="o">${HOIST}<div class="h">The postmortem, before the outage.</div><div class="row">${VERDICT}<div class="by">${mark(ON_LIGHT, ' class="m"')}<span><b>SIGSHIP</b> by zoof04</span><code>npx sigship</code></div></div></div>`, [out]],
];

const extra = `
  *, *::before, *::after { animation: none !important; transition: none !important; }
  body { margin: 0; overflow: hidden; }
  .ic { display: block; width: 100vw; height: 100vh; }
  .tile { width: 100vw; height: 100vh; background: var(--ink); }
  .lk { display: inline-flex; align-items: center; gap: 28px; padding: 24px; color: var(--ink); }
  .lk .m { display: block; width: 112px; height: auto; }
  .lk span { font-size: 104px; font-weight: 750; font-stretch: 125%; letter-spacing: -0.01em; line-height: 1; }
  .lk.dark { color: var(--paper); }
  .lk.stack { flex-direction: column; gap: 22px; }
  .lk.stack .m { width: 150px; }
  .lk.stack span { font-size: 84px; }
  .g { box-sizing: border-box; height: 100vh; padding: 36px 52px 40px; display: flex; flex-direction: column; gap: 20px; background: var(--sail); }
  .g h2 { font-size: 42px; font-weight: 700; font-stretch: 120%; letter-spacing: -.02em; line-height: 1.05; }
  .win { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .bar { display: flex; align-items: center; gap: 18px; padding: 12px 16px; background: var(--deck); border-radius: 8px 8px 0 0; }
  .path { color: var(--term-dim); font: 500 15px 'Archivo', sans-serif; }
  .vb { margin-left: auto; padding: 4px 12px 3px; border-radius: 4px; font-size: 17px; font-weight: 750; font-stretch: 125%; letter-spacing: .02em; }
  .vb.no { background: var(--red); color: var(--paper); }
  .vb.go { background: var(--green); color: var(--ink); }
  .g pre { flex: 1; margin: 0; padding: 22px 30px; overflow: hidden; background: var(--ink); color: var(--term-text); border-radius: 0 0 8px 8px; font-size: 15px; line-height: 1.45; white-space: pre-wrap; }
  .g.big pre { display: flex; flex-direction: column; justify-content: center; font-size: 27px; }
  pre .s1 { color: var(--sev1-dark); font-weight: 600; } pre .s2 { color: var(--yellow); font-weight: 600; } pre .go { color: var(--go); font-weight: 600; } pre b { color: var(--paper); font-weight: 600; }
  .o { box-sizing: border-box; height: 100vh; padding: 52px 64px 56px; overflow: hidden; background: var(--sail); display: flex; flex-direction: column; justify-content: space-between; }
  .o .hoist { gap: 14px; padding-top: 14px; }
  .o .hoist li::before { top: -14px; height: 14px; }
  .o .hoist li::after { top: -14px; }
  .o .h { font-size: 80px; font-weight: 700; font-stretch: 125%; line-height: 1; letter-spacing: -.03em; }
  .o .row { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; }
  .o .verdict { margin: 0; }
  .o .verdict b { font-size: 30px; }
  .o .verdict span { font-size: 18px; }
  .o .by { display: grid; grid-template-columns: auto auto; align-items: center; gap: 4px 14px; font-size: 24px; }
  .o .by .m { grid-row: span 2; width: 54px; height: auto; }
  .o .by code { color: var(--slate); font-size: 20px; }
`;

const browser = await chromium.launch();
for (const [name, width, height, html, folders, { fit = false, clear = false } = {}] of IMAGES) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: fit ? 2 : 1 });
  await page.setContent(`<!doctype html><style>${css}${extra}${clear ? 'body { background: transparent; }' : ''}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  const target = fit ? page.locator('.lk') : page;
  const png = await target.screenshot({ omitBackground: clear });
  for (const folder of folders) writeFileSync(join(folder, `${name}.png`), png);
  await page.close();
}
await browser.close();

for (const folder of [out, press]) {
  writeFileSync(join(folder, 'sigship-mark.svg'), mark(HEX, ' xmlns="http://www.w3.org/2000/svg"'));
  writeFileSync(join(folder, 'sigship-icon.svg'), icon(HEX, ' xmlns="http://www.w3.org/2000/svg"'));
}
writeFileSync(join(site, 'og.png'), readFileSync(join(out, 'og.png')));
console.log(`Rebuilt ${IMAGES.length} brand images, the logo files and site/og.png.`);
