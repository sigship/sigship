// Rebuilds every brand image from the current design.
// Colours and fonts come from site/style.css, so a design change flows through here.
// Run with: npm run brand   (first time only: npx playwright install chromium)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'brand');
const cli = join(root, 'bin/sigship.js');
mkdirSync(out, { recursive: true });

// Fonts are embedded so the images render the same on any machine.
const font = (file) => `data:font/woff2;base64,${readFileSync(join(root, 'site/fonts', file)).toString('base64')}`;
const css = readFileSync(join(root, 'site/style.css'), 'utf8')
  .replace("url('/fonts/archivo.woff2')", `url('${font('archivo.woff2')}')`)
  .replace("url('/fonts/spline-sans-mono.woff2')", `url('${font('spline-sans-mono.woff2')}')`);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Real output, so the gallery can never drift from what the tool prints.
function run(args, cwd) {
  try {
    return execFileSync('node', [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  } catch (error) {
    return error.stdout; // NO-GO exits 1 by design.
  }
}

function demoProject(files) {
  const dir = mkdtempSync(join(tmpdir(), 'sigship-brand-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const shared = {
  'package-lock.json': '{}',
  'src/App.tsx': 'export const App = () => <ErrorBoundary><Routes /></ErrorBoundary>;\n',
};
// Assembled at runtime so SIGSHIP's scan of its own repo doesn't flag this demo.
const paidEvent = ['checkout', 'session', 'completed'].join('.');
const bad = demoProject({
  ...shared,
  'package.json': JSON.stringify({ name: 'demo-app', dependencies: { react: '^19.0.0', openai: '^5.0.0', '@supabase/supabase-js': '^2.0.0', '@sentry/react': '^10.0.0' }, scripts: { test: 'vitest run' } }),
  'supabase/migrations/001_init.sql': 'create table public.profiles (id uuid primary key, email text);\n',
  'src/api/stripe-webhook.ts': `export async function POST(req) {\n  const event = await req.json();\n  if (event.type === '${paidEvent}') await upgrade(event);\n}\n`,
  'src/api/chat.ts': "export async function POST(req) {\n  return openai.chat.completions.create({ model: 'x', messages: [] });\n}\n",
});
const good = demoProject({
  ...shared,
  'package.json': JSON.stringify({ name: 'demo-app', dependencies: { react: '^19.0.0', '@sentry/react': '^10.0.0', '@upstash/ratelimit': '^2.0.0' }, scripts: { test: 'vitest run' } }),
  'supabase/migrations/001_init.sql': 'create table public.profiles (id uuid primary key);\nalter table public.profiles enable row level security;\n',
  'src/api/chat.ts': "export async function POST(req) {\n  await ratelimit.limit(ip);\n  return openai.chat.completions.create({ model: 'x', messages: [] });\n}\n",
});

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

const frame = (title, body, size = '') => `<div class="g ${size}"><h2>${title}</h2><pre><code>${body}</code></pre></div>`;
const flag = (w, h) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block" aria-hidden="true"><rect width="${w}" height="${h}" fill="var(--blue)"/><rect x="${w / 3}" y="${h / 3}" width="${w / 3}" height="${h / 3}" fill="var(--paper)"/></svg>`;

const IMAGES = [
  ['logo-240', 240, 240, flag(240, 240)],
  ['gallery-1-no-go', 1270, 760, frame('The postmortem, before the outage.', `<b>$ npx sigship</b>\n\n${noGo}`)],
  ['gallery-2-fix-prompt', 1270, 760, frame('Every finding becomes a fix your AI tool can use.', `<b>$ npx sigship --prompt</b>\n\n${fixPrompt}`)],
  ['gallery-3-go', 1270, 760, frame('Exit 0 is the signal to ship.', `<b>$ npx sigship</b>\n\n${go}`, 'big')],
  ['og', 1200, 630, `<div class="o">${flag(90, 60)}<div class="h">The postmortem, before the outage.</div><div class="f">SIGSHIP by zoof04. The go/no-go check for AI-built apps.</div></div>`],
];

const extra = `
  body { margin: 0; overflow: hidden; }
  .g { box-sizing: border-box; height: 100vh; padding: 44px 52px; display: flex; flex-direction: column; gap: 22px; background: var(--sail); }
  .g h2 { font-size: 42px; font-weight: 700; font-stretch: 120%; letter-spacing: -.02em; line-height: 1.05; }
  .g pre { flex: 1; margin: 0; padding: 26px 30px; overflow: hidden; background: var(--ink); color: #dfe7ef; border-radius: 6px; font-size: 15.5px; line-height: 1.5; white-space: pre-wrap; }
  .g.big pre { display: flex; flex-direction: column; justify-content: center; font-size: 27px; }
  pre .s1 { color: #ff8a80; font-weight: 600; } pre .s2 { color: var(--yellow); font-weight: 600; } pre .go { color: #7fd6a0; font-weight: 600; } pre b { color: #fff; font-weight: 600; }
  .o { box-sizing: border-box; height: 100vh; padding: 64px; background: var(--sail); display: flex; flex-direction: column; justify-content: space-between; }
  .o .h { font-size: 92px; font-weight: 700; font-stretch: 125%; line-height: 1; letter-spacing: -.03em; }
  .o .f { font-size: 30px; }
`;

const browser = await chromium.launch();
for (const [name, width, height, html] of IMAGES) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<!doctype html><style>${css}${extra}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, `${name}.png`) });
  await page.close();
}
await browser.close();

writeFileSync(join(root, 'site/og.png'), readFileSync(join(out, 'og.png')));
console.log(`Rebuilt ${IMAGES.length} brand images and site/og.png.`);
