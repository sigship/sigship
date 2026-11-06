// Builds the site from one template: home page, a page per check, legal pages, sitemap.
// Run with: npm run docs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '../site');
const ORIGIN = 'https://sigship.dev';
const SEV_NAME = { 1: 'SEV-1: blocks launch', 2: 'SEV-2: blocks launch', 3: 'SEV-3: reported, blocks only with --strict' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FLAG_P = `<svg viewBox="0 0 90 60" aria-hidden="true"><rect width="90" height="60" fill="#123f9c"/><rect x="30" y="20" width="30" height="20" fill="#fff"/></svg>`;

const shell = ({ title, description, path, body }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN}${path}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="mast">
  <a class="brand" href="/">${FLAG_P}SIGSHIP</a>
  <nav aria-label="Main"><a href="/#pricing">Pricing</a><a href="https://github.com/YOUR_GITHUB_USERNAME/sigship">GitHub</a><a href="https://zoof04.com">by zoof04</a></nav>
</header>
<main class="page">
${body}
</main>
${FOOTER}
</body>
</html>
`;

const FOOTER = `<footer>
  <p>SIGSHIP is a zoof04 product. zoof04 is a software studio founded by Smitesh More, with its engineering base in Navi Mumbai, India.</p>
  <nav aria-label="Footer"><a href="/privacy/">Privacy</a><a href="/terms/">Terms and refunds</a><a href="mailto:connect@zoof04.com">connect@zoof04.com</a></nav>
</footer>`;

function write(path, html) {
  const file = join(site, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

for (const r of RULES) {
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
<p>Run <code>npx sigship</code> in your project. It runs on your machine and reports this check as <code>${r.id}</code>.</p>
<p><a href="/#checks">See every check</a></p>`,
  }));
}

write('privacy', shell({
  title: 'Privacy | SIGSHIP',
  description: 'SIGSHIP runs on your machine and sends nothing anywhere.',
  path: '/privacy/',
  body: `<h1>Privacy</h1>
<p>Last updated: UPDATE_THIS_DATE.</p>
<h2>The command line tool and MCP server</h2>
<p>They run on your machine. They have no telemetry and make no network calls. Your code, findings and secrets stay with you.</p>
<h2>This website</h2>
<p>This site uses Cloudflare Web Analytics, which counts visits without cookies.</p>
<h2>Payments</h2>
<p>Polar is the merchant of record. Polar collects your payment details and shares your name, email and order with us so we can provide the service.</p>
<h2>Pilot review</h2>
<p>If you buy a pilot review, you choose what code to share with us. We use it only for that review and delete it when the review ends, unless you ask us to keep it.</p>
<h2>Contact</h2>
<p>LEGAL_ENTITY_NAME. Email <a href="mailto:connect@zoof04.com">connect@zoof04.com</a>.</p>`,
}));

write('terms', shell({
  title: 'Terms and refunds | SIGSHIP',
  description: 'The terms for using SIGSHIP and how refunds work.',
  path: '/terms/',
  body: `<h1>Terms and refunds</h1>
<p>Last updated: UPDATE_THIS_DATE.</p>
<h2>The tool</h2>
<p>The open source tool is licensed under MIT. SIGSHIP uses pattern checks. A GO result is not a security audit and does not prove your app is safe. You stay responsible for your app.</p>
<h2>Paid plans</h2>
<p>Solo and Team renew monthly until you cancel. Cancel at any time and you keep access until the end of the paid month.</p>
<h2>Refunds</h2>
<p>Ask within 14 days of your first payment and we refund it in full. A pilot review can be refunded in full until work starts.</p>
<h2>Who you are dealing with</h2>
<p>Polar is the merchant of record for payments. The service is provided by LEGAL_ENTITY_NAME. Email <a href="mailto:connect@zoof04.com">connect@zoof04.com</a>.</p>`,
}));

const urls = ['/', '/privacy/', '/terms/', ...RULES.map((r) => `/checks/${r.id}/`)];
writeFileSync(join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(site, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
writeFileSync(join(site, 'llms.txt'), `# SIGSHIP

> The go/no-go check for AI-built apps, by zoof04. It reads a repo locally, reports production problems with fixes, and exits 0 only when no SEV-1 or SEV-2 finding remains.

Run it with: npx sigship
Add it to a coding agent with: claude mcp add sigship -- npx -y sigship mcp

## Checks
${RULES.map((r) => `- [${r.title}](${ORIGIN}/checks/${r.id}/): SEV-${r.severity}`).join('\n')}
`);
writeFileSync(join(site, 'favicon.svg'), FLAG_P.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));

// Fill the check lists on the home page.
const home = join(site, 'index.html');
let html = readFileSync(home, 'utf8');
for (const sev of [1, 2, 3]) {
  const list = RULES.filter((r) => r.severity === sev).map((r) => `<li><a href="/checks/${r.id}/">${esc(r.title)}</a></li>`).join('');
  html = html.replace(new RegExp(`<ul data-sev="${sev}">[\\s\\S]*?</ul>`), `<ul data-sev="${sev}">${list}</ul>`);
}
writeFileSync(home, html);
console.log(`Built ${urls.length} pages for ${ORIGIN}.`);
