// Builds the site from one template: home page, a page per check, legal pages, sitemap.
// Run with: npm run docs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/rules.js';
import { icon, tokens } from './marks.js';
import { PRODUCT_PAGES } from './pages.js';
import { CHECK_EXTRA, GLOSSARY, GUIDES, HOME_FAQ, INDEXNOW_KEY, ORG, PUBLISHED, crumbs, faqFromHtml, ld } from './seo.js';
import { NOTICES, STATUS, feedJson, fmtDate, rssXml } from './lookout.js';
import { TIERS, clearedBadge } from './flags.js';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '../site');
const ORIGIN = 'https://sigship.dev';
const SEV_NAME = { 1: 'SEV-1 · Critical: fix before launch', 2: 'SEV-2 · Serious: fix before launch', 3: 'SEV-3 · Worth fixing: does not block launch' };

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
// Every indexed page gets social tags, breadcrumbs, and FAQ data built from its own visible questions.
const crumbName = (title) => title.split(' | ')[0].split(': ')[0];
const shell = ({ title, description, path, body, wide = false, ld: extra = [], trail, ogType = 'website', head = '' }) => {
  const url = path ? `${ORIGIN}${path}` : '';
  const graph = path ? [crumbs(trail || [['Home', '/'], [crumbName(title), path]]), faqFromHtml(body), ...extra].filter(Boolean) : [];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${path ? `<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="SIGSHIP">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ORIGIN}/og.png">` : '<meta name="robots" content="noindex">'}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/jetbrains-mono.woff2" as="font" type="font/woff2" crossorigin>
<meta name="theme-color" content="#0b1324">
<meta name="color-scheme" content="light dark">
${graph.length ? ld({ '@context': 'https://schema.org', '@graph': graph }) : ''}
${head ? `${head}\n` : ''}${HEAD_SCRIPT}
<link rel="stylesheet" href="/home.css">
<link rel="stylesheet" href="/page.css">
<script src="/page.js" defer></script>
<script src="/harbour.js" defer></script>
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
};

const crumbNav = (list) => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${list.map(([name, href], i) => i === list.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${href}">${esc(name)}</a></li>`).join('')}</ol></nav>`;
const codeBox = (label, text) => `<div class="code"><div class="code-bar"><span>${esc(label)}</span><button class="copy-btn" type="button" data-copy="${esc(text)}" data-copy-label="${esc(label)}">Copy</button></div><pre><code>${esc(text)}</code></pre></div>`;
const acc = (faq) => `<div class="acc">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="acc-body"><p>${esc(a)}</p></div></details>`).join('\n')}</div>`;
const clip = (text, n = 158) => (text.length <= n ? text : `${text.slice(0, text.lastIndexOf(' ', n - 1))}…`);
// The date of the last commit, so the sitemap only changes when the site does.
const LASTMOD = (() => { try { return execFileSync('git', ['log', '-1', '--format=%cs'], { encoding: 'utf8' }).trim(); } catch { return PUBLISHED; } })();
const CTA_BAND = `<section class="cta-band" aria-labelledby="cta-h">
<div><h2 id="cta-h">Check your app before your users do.</h2><p>Free, open source, and nothing leaves your computer.</p></div>
<div><div class="cta-cmd dev-only"><code>$ npx sigship</code><button class="copy-btn" type="button" data-copy="npx sigship" data-copy-label="npx sigship">Copy</button></div><a class="btn-ink cta-go plain-only" href="/guides/check-lovable-bolt-replit-app/">Check my app, free</a>
<div class="cta-links"><a href="/guides/check-lovable-bolt-replit-app/">Never used a terminal?</a><a href="/glossary/">Jargon, explained</a><a href="/docs/">Read the docs</a></div></div>
</section>`;

function write(path, html) {
  const file = join(site, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

RULES.forEach((r, i) => {
  const prev = RULES[(i - 1 + RULES.length) % RULES.length];
  const next = RULES[(i + 1) % RULES.length];
  const x = CHECK_EXTRA[r.id];
  if (!x) throw new Error(`scripts/seo.js has no plain explanation for the check ${r.id}.`);
  const path = `/checks/${r.id}/`;
  const trail = [['Home', '/'], ['Checks', '/#checks'], [r.title, path]];
  const prompt = `Fix this problem in my project: ${r.title}. ${r.fix} Change only what this fix needs, then tell me what you changed and anything I have to do myself.`;
  write(`checks/${r.id}`, shell({
    title: `${x.seoTitle} | SIGSHIP`,
    description: clip(`${x.plain} Here's what happens if you ship it, and the fix.`),
    path,
    trail,
    ogType: 'article',
    ld: [{ '@type': 'TechArticle', headline: x.seoTitle, description: x.plain, url: `${ORIGIN}${path}`, inLanguage: 'en', datePublished: PUBLISHED, dateModified: LASTMOD, author: { '@id': `${ORIGIN}/#org` }, publisher: ORG, about: r.title, proficiencyLevel: 'Beginner' }],
    body: `${crumbNav(trail)}
<p class="sev">${SEV_NAME[r.severity]}</p>
<h1>${esc(r.title)}</h1>
<p class="plain"><b>In plain English:</b> ${esc(x.plain)}</p>
<h2>What happens if you ship it</h2>
<p>${esc(r.forecast)}</p>
<h2>How to fix it <span class="dev-tag">Technical</span></h2>
<p class="fix">${esc(r.fix)}</p>
<h2>Let your AI tool fix it</h2>
<p>Paste this into Lovable, Bolt, Cursor, Replit or Claude Code:</p>
${codeBox('Prompt for your AI tool', prompt)}
<h2>Check your app</h2>
<div class="try"><code class="cmd">npx sigship</code><p>Run it in your project folder. It reports this problem as <code>${r.id}</code>, along with ${RULES.length - 1} other checks. Nothing leaves your computer. <a href="/guides/check-lovable-bolt-replit-app/">New to the terminal?</a></p></div>
<h2>Questions</h2>
${acc(x.faq)}
<nav class="pager" aria-label="More checks"><a href="/checks/${prev.id}/"><span>Previous</span>${esc(prev.title)}</a><a href="/checks/${next.id}/"><span>Next</span>${esc(next.title)}</a></nav>
<p><a href="/#checks">See every check</a> · <a href="/glossary/">Jargon, explained</a></p>`,
  }));
});

const FLAG_U = '<svg class="flag-u" viewBox="0 0 90 60" role="img" aria-label="Signal flag U"><rect width="90" height="60" fill="var(--flag-white)"/><rect width="45" height="30" fill="var(--flag-red)"/><rect x="45" y="30" width="45" height="30" fill="var(--flag-red)"/></svg>';
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
<p>Inter for headings and text. JetBrains Mono for commands and output. Both are open source (SIL Open Font License) and served from this site, so no third party sees who reads it.</p>
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
  description: 'SIGSHIP runs on your computer and sends nothing anywhere. What the tool, the website, the waitlist and paid plans collect, in plain English.',
  path: '/privacy/',
  body: `<h1>Privacy</h1>
<p>Last updated: 2026-11-09.</p>
<h2>The command line tool and MCP server</h2>
<p>They run on your machine and have no telemetry. Without a licence key they make no network calls at all. Your code, findings and secrets stay with you.</p>
<h2>Solo and Team</h2>
<p>If you set <code>SIGSHIP_KEY</code>, the tool sends two things to api.sigship.dev: your licence key, and a one-way fingerprint of the repository made from its git address mixed with your key. It sends no code, file names or findings.</p>
<p>We pass the key to Polar to check it and to count the repository against your plan's limit. We keep the fingerprint and Polar's activation ID so each repository is counted once. The Pro pack is cached on your machine for 24 hours.</p>
<h2>This website</h2>
<p>This site uses Cloudflare Web Analytics, which counts visits without cookies.</p>
<h2>Waitlist and the Lookout email</h2>
<p>If you join the waitlist or ask for the Lookout notice by email, we keep your email address, your name if you give it, the plan or list you picked, the tool you build with if you give it, your country as reported by Cloudflare, and the time. It is stored in a Google Sheet that only Zoof04 can open. We use it only to email you when your plan opens or to send the Lookout notice. Every email has an unsubscribe link, or email <a href="mailto:support@sigship.dev">support@sigship.dev</a> and we will delete it.</p>
<h2>Payments</h2>
<p>Polar is the merchant of record. Polar collects your payment details and shares your name, email and order with us so we can provide the service.</p>
<h2>Pilot review</h2>
<p>If you buy a pilot review, you choose what code to share with us. We use it only for that review and delete it when the review ends, unless you ask us to keep it.</p>
<h2>Contact</h2>
<p>Zoof04 Inc. Email <a href="mailto:support@sigship.dev">support@sigship.dev</a>.</p>`,
}));

write('terms', shell({
  title: 'Terms and refunds | SIGSHIP',
  description: 'The terms for using SIGSHIP, the free open source tool and the paid plans, and how refunds work, in plain English.',
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
// The Lookout as machine-readable feeds, and the Cleared badge anyone can copy into a README.
writeFileSync(join(site, 'lookout/feed.json'), feedJson(ORIGIN));
writeFileSync(join(site, 'lookout/rss.xml'), rssXml(ORIGIN));
writeFileSync(join(site, 'flags/cleared.svg'), clearedBadge(VERSION));

// ---------- Glossary ----------
{
  const path = '/glossary/';
  write('glossary', shell({
    title: 'Jargon, explained: app security terms in plain English | SIGSHIP',
    description: 'API keys, environment variables, row level security, webhooks, rate limits, CORS, MCP and more, explained in plain English for people building apps with AI tools.',
    path,
    wide: true,
    ld: [{ '@type': 'DefinedTermSet', '@id': `${ORIGIN}${path}#terms`, name: 'App security terms in plain English', url: `${ORIGIN}${path}`, hasDefinedTerm: GLOSSARY.map(([id, term, plain]) => ({ '@type': 'DefinedTerm', name: term, description: plain, url: `${ORIGIN}${path}#${id}`, inDefinedTermSet: `${ORIGIN}${path}#terms` })) }],
    body: `<header class="phero"><p class="eyebrow"><b>SIGSHIP</b><i></i><span>Glossary</span></p>
<h1>Jargon, explained. <span>In plain English.</span></h1>
<p class="lede">Building with AI tools means running into words nobody explained. Here's what each one means, in one or two sentences, and where it matters.</p></header>
<nav class="gloss-index" aria-label="Terms">${GLOSSARY.map(([id, term]) => `<a href="#${id}">${esc(term.split(' (')[0])}</a>`).join('')}</nav>
<dl class="gloss">${GLOSSARY.map(([id, term, plain, link]) => `<div id="${id}"><dt>${esc(term)}</dt><dd>${esc(plain)}${link ? ` <a href="${link}">Learn more</a>` : ''}</dd></div>`).join('\n')}</dl>
${CTA_BAND}`,
  }));
}

// ---------- Guides ----------
{
  const hub = '/guides/';
  write('guides', shell({
    title: 'Guides: launch an AI-built app safely, in plain English | SIGSHIP',
    description: 'Plain-English guides for people building apps with Lovable, Bolt, Cursor, Replit and v0: a pre-launch security checklist, Supabase RLS, leaked API keys and more.',
    path: hub,
    wide: true,
    ld: [{ '@type': 'CollectionPage', name: 'SIGSHIP guides', url: `${ORIGIN}${hub}`, hasPart: GUIDES.map((gd) => ({ '@type': 'Article', headline: gd.title, url: `${ORIGIN}${hub}${gd.slug}/` })) }],
    body: `<header class="phero"><p class="eyebrow"><b>SIGSHIP</b><i></i><span>Guides</span></p>
<h1>Launch your AI-built app <span>without the scary surprises.</span></h1>
<p class="lede">Short, plain-English guides for builders who aren't security experts. No jargon without an explanation.</p></header>
<div class="cards">${GUIDES.map((gd) => `<a class="card" href="${hub}${gd.slug}/"><span class="tagline">Guide</span><h3>${esc(gd.short)}</h3><p>${esc(gd.description)}</p><span class="more">Read the guide →</span></a>`).join('\n')}
<a class="card" href="/glossary/"><span class="tagline">Glossary</span><h3>Jargon, explained</h3><p>API keys, RLS, webhooks, CORS, MCP and more, each in one or two plain sentences.</p><span class="more">Open the glossary →</span></a></div>
${CTA_BAND}`,
  }));
  for (const gd of GUIDES) {
    const path = `${hub}${gd.slug}/`;
    const trail = [['Home', '/'], ['Guides', hub], [gd.short, path]];
    const words = (gd.lede + gd.body).replace(/<[^>]+>/g, ' ').split(/\s+/).length;
    const others = GUIDES.filter((o) => o !== gd);
    write(`guides/${gd.slug}`, shell({
      title: `${gd.title} | SIGSHIP`,
      description: gd.description,
      path,
      trail,
      ogType: 'article',
      ld: [{ '@type': 'Article', headline: gd.title, description: gd.description, url: `${ORIGIN}${path}`, mainEntityOfPage: `${ORIGIN}${path}`, image: `${ORIGIN}/og.png`, inLanguage: 'en', datePublished: PUBLISHED, dateModified: LASTMOD, wordCount: words, author: { '@id': `${ORIGIN}/#org` }, publisher: ORG }],
      body: `<article class="guide-a">${crumbNav(trail)}
<p class="sev">Guide · ${Math.max(2, Math.round(words / 220))} min read · Updated <time datetime="${LASTMOD}">${new Date(`${LASTMOD}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time></p>
<h1>${esc(gd.title)}</h1>
<p class="plain">${esc(gd.lede)}</p>
${gd.body}
<h2>Questions</h2>
${acc(gd.faq)}
<h2>More guides</h2>
<ul class="related">${others.map((o) => `<li><a href="${hub}${o.slug}/">${esc(o.short)}</a></li>`).join('')}<li><a href="/glossary/">Jargon, explained</a></li></ul>
</article>
${CTA_BAND}`,
    }));
  }
}

const urls = ['/', ...PRODUCT_PAGES.map((pg) => pg.path), '/guides/', ...GUIDES.map((gd) => `/guides/${gd.slug}/`), '/glossary/', ...RULES.map((r) => `/checks/${r.id}/`), '/brand/', '/privacy/', '/terms/'];
const priority = (u) => (u === '/' ? '1.0' : /^\/(pricing|features|docs|ai-agents|guides|lookout|flags)\/$/.test(u) ? '0.9' : u.startsWith('/guides/') || u.startsWith('/checks/') || u === '/glossary/' ? '0.8' : /^\/(privacy|terms|brand)\/$/.test(u) ? '0.3' : '0.6');
writeFileSync(join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc><lastmod>${LASTMOD}</lastmod><priority>${priority(u)}</priority></url>`).join('\n')}
</urlset>
`);
// Search engines and AI assistants are welcome everywhere except the waitlist endpoint.
const BOTS = ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'DuckDuckBot', 'CCBot'];
writeFileSync(join(site, 'robots.txt'), `${BOTS.map((b) => `User-agent: ${b}`).join('\n')}\nAllow: /\nDisallow: /api/\n\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

const ABOUT = 'SIGSHIP is a free, open source safety check for apps built with AI tools such as Lovable, Bolt, Cursor, Replit, v0 and Claude Code. It reads a project on the user\'s own computer, explains in plain English what will leak, break or cost money in production, gives the fix for each problem (including one prompt to paste into an AI tool), and ends with a verdict: GO or NO-GO. It exits 0 only on GO. A GO means its checks found nothing that blocks launch; it does not prove an app is safe. Made by Zoof04 Inc. Contact: support@sigship.dev.';
const CMDS = `- Check a project: \`npx sigship\`
- Get every fix as one prompt for an AI tool: \`npx sigship --prompt\`
- Open the private browser dashboard: \`npx sigship ui\`
- Add it to Claude Code: \`claude mcp add sigship -- npx -y sigship mcp\`
- Add a GitHub pull request check and an AGENTS.md rule: \`npx sigship init\`
- Requires Node.js 22 or newer. The free tool makes no network calls and never prints a secret value.`;
writeFileSync(join(site, 'llms.txt'), `# SIGSHIP

> ${ABOUT}

${CMDS}

## Start here
- [Features](${ORIGIN}/features/): what it checks and where it runs
- [Docs](${ORIGIN}/docs/): install, commands, reading the report, exit codes
- [AI agents](${ORIGIN}/ai-agents/): MCP setup for Claude Code, Cursor and other agents
- [Pricing](${ORIGIN}/pricing/): free today; self-hosted and Cloud plans on the waitlist
- [The Lookout](${ORIGIN}/lookout/): new ways attackers get into AI-built apps, each mapped to a SIGSHIP check (feeds: /lookout/feed.json, /lookout/rss.xml)
- [GO flags](${ORIGIN}/flags/): Cleared (free, self-declared), Verified (nightly, SIGSHIP Cloud) and Pilot on board (human review)
- [Glossary](${ORIGIN}/glossary/): app security terms in plain English
- [Full text for language models](${ORIGIN}/llms-full.txt)

## Guides
${GUIDES.map((gd) => `- [${gd.title}](${ORIGIN}/guides/${gd.slug}/): ${gd.description}`).join('\n')}

## Checks
${RULES.map((r) => `- [${r.title}](${ORIGIN}/checks/${r.id}/): SEV-${r.severity}. ${CHECK_EXTRA[r.id].plain}`).join('\n')}

## Optional
- [Changelog](${ORIGIN}/changelog/)
- [Roadmap](${ORIGIN}/roadmap/)
- [Source code on GitHub](https://github.com/sigship/sigship)
- [npm package](https://www.npmjs.com/package/sigship)
`);
const plainText = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<\/(p|li|h2|h3|pre|tr|dt|dd)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
writeFileSync(join(site, 'llms-full.txt'), `# SIGSHIP: full text

${ABOUT}

## Commands
${CMDS}

## Common questions
${HOME_FAQ.map(([q, a]) => `### ${q}\n${a}`).join('\n\n')}

## Checks
${RULES.map((r) => `### ${r.title} (${r.id}, SEV-${r.severity})
In plain English: ${CHECK_EXTRA[r.id].plain}
What happens if you ship it: ${r.forecast}
How to fix it: ${r.fix}
${CHECK_EXTRA[r.id].faq.map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n')}`).join('\n\n')}

## The Lookout: recent attack patterns against AI-built apps
${NOTICES.map((n) => `### ${n.title.plain} (${fmtDate(n)}${n.cve ? `, ${n.cve}` : ''})
${n.summary.plain}
Affects: ${n.affects.join(', ')}.
SIGSHIP: ${STATUS[n.status].plain}${n.rules.length ? ` (${n.rules.join(', ')})` : ''}. ${n.sigship.plain}
What to do: ${n.action.plain}
Sources: ${n.sources.map(([t, u]) => `${t} ${u}`).join('; ')}`).join('\n\n')}

## GO flags
${TIERS.map((t) => `- ${t.name} (level ${t.level}, flag ${t.flag}): ${t.plain} Who: ${t.who}. Proof: ${t.proof}`).join('\n')}
A flag says the owner checked before launching. It is not a security certificate.

## Guides
${GUIDES.map((gd) => `### ${gd.title}
${ORIGIN}/guides/${gd.slug}/
${gd.lede}

${plainText(gd.body)}
${gd.faq.map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n')}`).join('\n\n')}

## Glossary
${GLOSSARY.map(([, term, plain]) => `- ${term}: ${plain}`).join('\n')}
`);
writeFileSync(join(site, 'manifest.webmanifest'), `${JSON.stringify({ name: 'SIGSHIP', short_name: 'SIGSHIP', description: 'Free security check for vibe-coded and AI-built apps.', start_url: '/', display: 'standalone', background_color: '#0b1324', theme_color: '#0b1324', icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] }, null, 2)}\n`);
writeFileSync(join(site, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
mkdirSync(join(site, '.well-known'), { recursive: true });
writeFileSync(join(site, '.well-known/security.txt'), `Contact: mailto:support@sigship.dev\nExpires: ${Number(LASTMOD.slice(0, 4)) + 1}${LASTMOD.slice(4)}T00:00:00.000Z\nPreferred-Languages: en\nPolicy: https://github.com/sigship/sigship/blob/main/SECURITY.md\nCanonical: ${ORIGIN}/.well-known/security.txt\n`);
writeFileSync(join(site, 'favicon.svg'), icon({ blue: token('blue'), paper: token('paper'), ink: token('ink') }, ' xmlns="http://www.w3.org/2000/svg"'));

// The home page is built separately by scripts/build-home.js.
console.log(`Built ${urls.length} pages for ${ORIGIN}.`);
