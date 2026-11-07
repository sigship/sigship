// Builds the site from one template: home page, a page per check, legal pages, sitemap.
// Run with: npm run docs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/rules.js';
import { icon, mark, tokens } from './marks.js';
import { FEATURES, TRACKS } from './pricing.js';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '../site');
const ORIGIN = 'https://sigship.dev';
const SEV_NAME = { 1: 'SEV-1: blocks launch', 2: 'SEV-2: blocks launch', 3: 'SEV-3: reported, blocks only with --strict' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Colours come from the :root tokens in site/style.css, the one source for the brand.
const css = readFileSync(join(site, 'style.css'), 'utf8');
const token = tokens(css);
const MARK = mark({ blue: 'var(--blue)', paper: 'var(--flag-white)', ink: 'var(--ink)' }, ' aria-hidden="true"');
const FOOT_MARK = mark({ blue: 'var(--blue)', paper: 'var(--flag-white)', ink: 'var(--on-panel)' }, ' aria-hidden="true"');

// The flag patterns come from the home page template, so the footer flags always match its hero.
const homeFile = join(here, 'home/page.html');
const FLAGS = Object.fromEntries([...readFileSync(homeFile, 'utf8').matchAll(/<symbol id="flag-([a-z])" viewBox="0 0 90 60">([\s\S]*?)<\/symbol>/g)].map((m) => [m[1], m[2]]));
const flagRow = [...'sigship'].map((f) => `<svg viewBox="0 0 90 60">${FLAGS[f]}</svg>`).join('');

// Picks dark or light before the page paints, so there is no flash. The toggle in site.js changes it.
const TOGGLE = () => TOGGLE_HTML;
const THEME_SCRIPT = `<script>(function(){var d=document.documentElement,t;try{t=localStorage.getItem('sigship-theme')}catch(e){}if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark')})()</script>`;
const TOGGLE_HTML = '<button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to dark mode"><svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg><svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg></button>';

// A page without a path, such as the 404 page, is kept out of search results.
const shell = ({ title, description, path, body }) => `<!doctype html>
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
${THEME_SCRIPT}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#edf2f6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#060b14" media="(prefers-color-scheme: dark)">
<link rel="stylesheet" href="/style.css">
<script src="/site.js" defer></script>
</head>
<body>
${HEADER}
<main class="page">
${body}
</main>
${FOOTER}
</body>
</html>
`;

// One header for every page. On narrow screens the links move into a menu behind the button.
const NAV = [
  ['/#how', 'How it works'],
  ['/#checks', 'Checks'],
  ['/#pricing', 'Pricing'],
  ['/#cloud', 'Cloud'],
  ['https://github.com/sigship/sigship', 'GitHub'],
];
const HEADER = `<header class="mast">
  <a class="brand" href="/">${MARK}SIGSHIP</a>
  <nav class="nav" aria-label="Main">${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>
  <div class="mast-actions">
    ${TOGGLE()}
    <a class="btn btn-sm" href="/#start">Get started</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><span></span><span></span></button>
  </div>
  <div class="menu" id="menu" hidden>
    <nav aria-label="Menu">${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}<a href="/#waitlist">Join the waitlist</a><a href="https://zoof04.com" target="_blank" rel="noopener">by zoof04<span class="sr"> (opens in a new tab)</span></a></nav>
    <a class="btn block" href="/#start">Get started free</a>
  </div>
</header>`;

// Pricing: two tracks of plan cards, then a table comparing every feature.
const CHECK = '<svg class="ic-check" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7"/></svg>';
const cell = (v) => (v === true ? `${CHECK}<span class="sr">Included</span>` : v === false ? '<span class="ic-dash" aria-hidden="true">–</span><span class="sr">Not included</span>' : esc(v));
const planCard = (p) => {
  const cta = p.cta.plan
    ? `<a class="btn block${p.featured ? '' : ' alt'}" href="#waitlist" data-plan="${p.cta.plan}">${p.cta.label}</a>`
    : `<a class="btn block" href="${p.cta.href}">${p.cta.label}</a>${p.alt ? `<a class="pcard-alt" href="${p.alt.href}">${p.alt.label}</a>` : ''}`;
  return `<article class="pcard${p.featured ? ' featured' : ''}${p.cta.plan ? '' : ' live'}" data-reveal>
      <div class="pcard-head"><h3>${p.name}</h3><span class="tag">${p.tag}</span></div>
      <p class="pcard-tagline">${esc(p.tagline)}</p>
      <p class="pcard-price"><span class="amount">${p.price}</span> <span class="per">${p.per}</span></p>
      <p class="pcard-note">${p.note ? esc(p.note) : 'No signup. No limits.'}</p>
      <div class="pcard-cta">${cta}</div>
      <p class="pcard-lead">${p.lead}</p>
      <ul>${p.items.map((i) => `<li>${CHECK}<span>${esc(i)}</span></li>`).join('')}</ul>
      ${p.cta.plan ? '<p class="pcard-foot">Planned features. They arrive at launch.</p>' : ''}
    </article>`;
};
const PLANS_FLAT = TRACKS.flatMap((t) => t.plans);
const PRICING = `<div class="tracks" role="tablist" aria-label="How you run SIGSHIP">
      ${TRACKS.map((t, i) => `<button type="button" role="tab" id="tab-${t.id}" aria-controls="track-${t.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${t.label}<small>${t.id === 'self' ? 'Your machine' : 'We run it'}</small></button>`).join('')}
    </div>
    ${TRACKS.map((t) => `<div class="track" id="track-${t.id}" role="tabpanel" aria-labelledby="tab-${t.id}">
      <p class="track-blurb">${esc(t.blurb)}</p>
      <div class="pgrid">${t.plans.map(planCard).join('')}</div>
    </div>`).join('\n    ')}
    <details class="compare" data-reveal>
      <summary><span>Compare every feature</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg></summary>
      <div class="compare-scroll" role="region" aria-label="Feature comparison" tabindex="0">
        <table>
          <thead>
            <tr><td></td><th scope="colgroup" colspan="3">Self-hosted</th><th scope="colgroup" colspan="3">Cloud</th></tr>
            <tr><th scope="col" class="feat">Feature</th>${PLANS_FLAT.map((p) => `<th scope="col">${p.name}<small>${p.price}${p.per === 'a month' ? '/mo' : p.per === 'one-time' ? ' once' : ''}</small></th>`).join('')}</tr>
          </thead>
          <tbody>
${FEATURES.map((g) => `            <tr class="group"><th scope="rowgroup" colspan="7">${g.group}</th></tr>
${g.rows.map(([name, help, cells]) => `            <tr><th scope="row" class="feat"><span class="fname">${esc(name)}</span><span class="fhelp">${esc(help)}</span></th>${cells.map((c) => `<td>${cell(c)}</td>`).join('')}</tr>`).join('\n')}`).join('\n')}
          </tbody>
        </table>
      </div>
      <p class="compare-note">Free is available now. Everything in paid plans is planned and arrives at launch.</p>
    </details>`;

// One footer for every page, the home page included.
const FOOTER = `<footer class="site-foot">
  <div class="foot-top">
    <div class="foot-brand">
      <a class="brand" href="/">${FOOT_MARK}SIGSHIP</a>
      <p>The go/no-go check for AI-built apps. The postmortem, before the outage.</p>
      <code class="foot-cmd">npx sigship</code>
      <div class="foot-flags" aria-hidden="true">${flagRow}</div>
    </div>
    <nav class="foot-cols" aria-label="Footer">
      <div><p class="foot-h">Product</p><a href="/#checks">Checks</a><a href="/#cloud">SIGSHIP Cloud</a><a href="/#pricing">Pricing</a><a href="/#waitlist">Join the waitlist</a></div>
      <div><p class="foot-h">Developers</p><a href="https://github.com/sigship/sigship">GitHub</a><a href="https://www.npmjs.com/package/sigship">npm</a><a href="/llms.txt">llms.txt</a></div>
      <div><p class="foot-h">Company</p><a href="https://zoof04.com" target="_blank" rel="noopener">zoof04<span class="sr"> (opens in a new tab)</span></a><a href="/brand/">Brand</a><a href="mailto:support@sigship.dev">support@sigship.dev</a></div>
      <div><p class="foot-h">Legal</p><a href="/privacy/">Privacy</a><a href="/terms/">Terms and refunds</a></div>
    </nav>
  </div>
  <div class="foot-bottom">
    <span>© ${new Date().getFullYear()} Zoof04 Inc.</span>
    <span class="foot-status"><i aria-hidden="true"></i>The free tool runs on your machine. Nothing leaves it.</span>
    <a class="made-by" href="https://zoof04.com" target="_blank" rel="noopener" aria-label="SIGSHIP by zoof04 (opens in a new tab)"><span>by</span><img src="/zoof04-logo.svg" alt="" width="156" height="28"></a>
  </div>
  <div class="foot-word" aria-hidden="true">SIGSHIP</div>
</footer>`;

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

const urls = ['/', '/privacy/', '/terms/', '/brand/', ...RULES.map((r) => `/checks/${r.id}/`)];
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
