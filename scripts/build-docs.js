// Builds the site from one template: home page, a page per check, legal pages, sitemap.
// Run with: npm run docs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/rules.js';
import { icon, tokens } from './marks.js';
import { PRODUCT_PAGES } from './pages.js';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '../site');
const ORIGIN = 'https://sigship.dev';
const SEV_NAME = { 1: 'SEV-1: blocks launch', 2: 'SEV-2: blocks launch', 3: 'SEV-3: reported, blocks only with --strict' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Colours come from the :root tokens in site/style.css, the one source for the brand.
const css = readFileSync(join(site, 'style.css'), 'utf8');
const token = tokens(css);
// Inner pages share the home page's header, menu and footer, taken from its template so they never drift.
const TEMPLATE = readFileSync(join(here, 'home/page.html'), 'utf8');
const grab = (start, end) => {
  const i = TEMPLATE.indexOf(start);
  if (i < 0) throw new Error(`Home template is missing ${start}`);
  return TEMPLATE.slice(i, TEMPLATE.indexOf(end, i) + end.length);
};
const VERSION = JSON.parse(readFileSync(join(here, '../package.json'), 'utf8')).version;
// Links point back to the home page's sections; <use href="#..."> stays local because it draws the flags and icons.
const forInner = (html) => html.replaceAll('href="#top"', 'href="/"').replace(/(<a\b[^>]*?\shref=")#/g, '$1/#').replaceAll('{{ver}}', VERSION);
const HEAD_SCRIPT = grab('<script>(function(){var d=document.documentElement', '</script>');
const DEFS = grab('<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>', '</defs></svg>');
// The demo-state chip in the header only makes sense next to the home page's console.
const HEADER = forInner(grab('<header class="mast"', '</header>').replace(/\n {2}<div class="hud"[\s\S]*?\n {2}<\/div>/, ''));
const MENU = forInner(grab('<dialog class="menu"', '</dialog>'));
const FOOTER = forInner(grab('<footer class="site-foot">', '</footer>'));

// A page without a path, such as the 404 page, is kept out of search results.
const shell = ({ title, description, path, body, wide = false }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${path ? `<link rel="canonical" href="${ORIGIN}${path}">` : '<meta name="robots" content="noindex">'}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<meta name="theme-color" content="#edf2f6">
<meta name="color-scheme" content="light dark">
${HEAD_SCRIPT}
<link rel="stylesheet" href="/home.css">
<link rel="stylesheet" href="/page.css">
<script src="/page.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${DEFS}
${HEADER}
<main class="page${wide ? ' wide' : ''}" id="main">
${body}
</main>
${FOOTER}
${MENU}
<p class="sr" id="live" aria-live="polite"></p>
</body>
</html>
`;







function write(path, html) {
  const file = join(site, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

RULES.forEach((r, i) => {
  const prev = RULES[(i - 1 + RULES.length) % RULES.length];
  const next = RULES[(i + 1) % RULES.length];
  write(`checks/${r.id}`, shell({
    title: `${r.title} | SIGSHIP`,
    description: `${r.forecast} How to find it and fix it.`,
    path: `/checks/${r.id}/`,
    body: `<p class="sev">${SEV_NAME[r.severity]}</p>
<h1>${esc(r.title)}</h1>
<h2>What goes wrong</h2>
<p>${esc(r.forecast)}</p>
<h2>How to fix it</h2>
<p class="fix">${esc(r.fix)}</p>
<h2>Check your app</h2>
<div class="try"><code class="cmd">npx sigship</code><p>Run it in your project. It reports this check as <code>${r.id}</code>, along with ${RULES.length - 1} others. Nothing leaves your machine.</p></div>
<nav class="pager" aria-label="More checks"><a href="/checks/${prev.id}/"><span>Previous</span>${esc(prev.title)}</a><a href="/checks/${next.id}/"><span>Next</span>${esc(next.title)}</a></nav>
<p><a href="/#checks">See every check</a></p>`,
  }));
});

const FLAG_U = '<svg class="flag-u" viewBox="0 0 90 60" role="img" aria-label="Signal flag U"><rect width="90" height="60" fill="var(--flag-white)"/><rect width="45" height="30" fill="var(--red)"/><rect x="45" y="30" width="45" height="30" fill="var(--red)"/></svg>';
writeFileSync(join(site, '404.html'), shell({
  title: 'Page not found | SIGSHIP',
  description: 'This page does not exist.',
  body: `${FLAG_U}
<h1>Flag U: you are standing into danger.</h1>
<p>This page doesn't exist. It may have moved, or the link may be wrong.</p>
<p><a href="/">Go back to SIGSHIP</a> or <a href="/#checks">see every check</a>.</p>`,
}));

// Brand page. The files it links to are rendered by scripts/build-brand.js.
const SWATCHES = [
  ['blue', 'Flag blue', 'Flag P, links, focus'],
  ['red', 'Signal red', 'SEV-1 and NO-GO'],
  ['yellow', 'Signal yellow', 'SEV-2 and highlights'],
  ['green', 'Go green', 'GO'],
  ['ink', 'Ink', 'Text and dark panels'],
  ['paper', 'Paper', 'Cards and flag white'],
  ['sail', 'Sail', 'Page background'],
];
write('brand', shell({
  title: 'Brand | SIGSHIP',
  description: 'The SIGSHIP logo, colours, type and flag story, with files to download.',
  path: '/brand/',
  body: `<h1>Brand</h1>
<p>Everything you need to write about SIGSHIP. Write the name in capitals, as SIGSHIP, and say it is by zoof04.</p>
<h2>Logo</h2>
<div class="logos">
  <figure><div class="tile"><img src="/brand/sigship-logo.png" alt="SIGSHIP logo" width="600" height="160"></div><figcaption>Logo <a href="/brand/sigship-logo.png" download>PNG</a></figcaption></figure>
  <figure><div class="tile dark"><img src="/brand/sigship-logo-dark.png" alt="SIGSHIP logo for dark backgrounds" width="600" height="160"></div><figcaption>Logo on dark <a href="/brand/sigship-logo-dark.png" download>PNG</a></figcaption></figure>
  <figure><div class="tile"><img src="/brand/sigship-logo-stacked.png" alt="SIGSHIP stacked logo" width="400" height="320"></div><figcaption>Stacked <a href="/brand/sigship-logo-stacked.png" download>PNG</a></figcaption></figure>
  <figure><div class="tile"><img src="/brand/sigship-mark.svg" alt="SIGSHIP mark" width="180" height="160"></div><figcaption>Mark <a href="/brand/sigship-mark.svg" download>SVG</a></figcaption></figure>
  <figure><div class="tile"><img src="/brand/sigship-icon.svg" alt="SIGSHIP icon" width="160" height="160"></div><figcaption>Icon <a href="/brand/sigship-icon.svg" download>SVG</a> <a href="/brand/sigship-avatar.png" download>PNG</a></figcaption></figure>
  <figure><div class="tile"><img src="/og.png" alt="SIGSHIP social card" width="600" height="315"></div><figcaption>Social card <a href="/og.png" download>PNG</a></figcaption></figure>
</div>
<h2>Colours</h2>
<ul class="swatches">
${SWATCHES.map(([name, label, use]) => `  <li><span style="background:${token(name)}"></span><b>${label}</b><code>${token(name)}</code><small>${use}</small></li>`).join('\n')}
</ul>
<h2>Type</h2>
<p>Archivo for headings and text, set wide for headings. Spline Sans Mono for commands and output. Both are open source and served from this site.</p>
<h2>The flags</h2>
<p>The home page spells SIGSHIP in flags from the International Code of Signals. The mark is flag P, the Blue Peter, which a ship raises when it is about to sail. A signal in Unix is a message a program has to act on. SIGSHIP is both.</p>
<h2>Please don't</h2>
<ul>
  <li>Recolour flag P or change its white centre.</li>
  <li>Stretch, rotate or add effects to the logo.</li>
  <li>Use the logo to suggest SIGSHIP has reviewed or approved an app.</li>
</ul>
<h2>Contact</h2>
<p>For press and partnerships, email <a href="mailto:support@sigship.dev">support@sigship.dev</a>.</p>`,
}));

write('privacy', shell({
  title: 'Privacy | SIGSHIP',
  description: 'SIGSHIP runs on your machine and sends nothing anywhere.',
  path: '/privacy/',
  body: `<h1>Privacy</h1>
<p>Last updated: 2026-11-07.</p>
<h2>The command line tool and MCP server</h2>
<p>They run on your machine and have no telemetry. Without a licence key they make no network calls at all. Your code, findings and secrets stay with you.</p>
<h2>Solo and Team</h2>
<p>If you set <code>SIGSHIP_KEY</code>, the tool sends two things to api.sigship.dev: your licence key, and a one-way fingerprint of the repository made from its git address mixed with your key. It sends no code, file names or findings.</p>
<p>We pass the key to Polar to check it and to count the repository against your plan's limit. We keep the fingerprint and Polar's activation ID so each repository is counted once. The Pro pack is cached on your machine for 24 hours.</p>
<h2>This website</h2>
<p>This site uses Cloudflare Web Analytics, which counts visits without cookies.</p>
<h2>Waitlist</h2>
<p>If you join the SIGSHIP Cloud waitlist, we keep your email address, your name if you give it, the plan you picked, the tool you build with if you give it, your country as reported by Cloudflare, and the time. It is stored in a Google Sheet that only Zoof04 can open. We use it only to email you when your plan opens. Email <a href="mailto:support@sigship.dev">support@sigship.dev</a> and we will delete it.</p>
<h2>Payments</h2>
<p>Polar is the merchant of record. Polar collects your payment details and shares your name, email and order with us so we can provide the service.</p>
<h2>Pilot review</h2>
<p>If you buy a pilot review, you choose what code to share with us. We use it only for that review and delete it when the review ends, unless you ask us to keep it.</p>
<h2>Contact</h2>
<p>Zoof04 Inc. Email <a href="mailto:support@sigship.dev">support@sigship.dev</a>.</p>`,
}));

write('terms', shell({
  title: 'Terms and refunds | SIGSHIP',
  description: 'The terms for using SIGSHIP and how refunds work.',
  path: '/terms/',
  body: `<h1>Terms and refunds</h1>
<p>Last updated: 2026-11-06.</p>
<h2>The tool</h2>
<p>The open source tool is licensed under MIT. SIGSHIP uses pattern checks. A GO result is not a security audit and does not prove your app is safe. You stay responsible for your app.</p>
<h2>Paid plans</h2>
<p>Paid plans are not on sale yet. When they open: self-hosted Pro and Business are one-time purchases that include a year of new checks, and you keep using what you bought after that year. Cloud plans renew monthly until you cancel. Cancel at any time and you keep access until the end of the paid month.</p>
<h2>Refunds</h2>
<p>Ask within 14 days of your first payment and we refund it in full. A pilot review can be refunded in full until work starts.</p>
<h2>Who you are dealing with</h2>
<p>Polar is the merchant of record for payments. The service is provided by Zoof04 Inc. Email <a href="mailto:support@sigship.dev">support@sigship.dev</a>.</p>`,
}));

for (const pg of PRODUCT_PAGES) write(pg.path.slice(1, -1), shell({ ...pg, body: pg.body, wide: true }));

const urls = ['/', ...PRODUCT_PAGES.map((pg) => pg.path), '/privacy/', '/terms/', '/brand/', ...RULES.map((r) => `/checks/${r.id}/`)];
writeFileSync(join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(site, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
writeFileSync(join(site, 'llms.txt'), `# SIGSHIP

> The go/no-go check for AI-built apps, by zoof04. It reads a repo locally, reports production problems with fixes, and exits 0 only when no SEV-1 or SEV-2 finding remains.

Run it with: npx sigship
Open the local dashboard with: npx sigship ui
Add it to a coding agent with: claude mcp add sigship -- npx -y sigship mcp
Add the pull request check with: npx sigship init

## Checks
${RULES.map((r) => `- [${r.title}](${ORIGIN}/checks/${r.id}/): SEV-${r.severity}`).join('\n')}
`);
writeFileSync(join(site, 'favicon.svg'), icon({ blue: token('blue'), paper: token('paper'), ink: token('ink') }, ' xmlns="http://www.w3.org/2000/svg"'));

// The home page is built separately by scripts/build-home.js.
console.log(`Built ${urls.length} pages for ${ORIGIN}.`);
