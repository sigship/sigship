// Builds the whole site into site/: home, product pages, the 17 check pages, guides, legal, feeds and crawler files.
// Facts come from the code (src/rules.js, scripts/pricing.js, scripts/lookout.js, CHANGELOG.md, the pinned demo capture),
// so the pages can't drift from the tool. Run with: npm run docs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/rules.js';
import { FEATURES, REFUND_LINE, STATUS as FEATURE_STATUS, TRACKS, item } from './pricing.js';
import { BRAND_LABEL, brandIcon } from './brands.js';
import { CHECK_EXTRA, DISCORD, FILM, GH, GLOSSARY, GUIDES, HOME_FAQ, INDEXNOW_KEY, NPM, ORG, ORIGIN, PUBLISHED, appLd, crumbs, faqFromHtml, ld } from './seo.js';
import { NOTICES, STATUS, STACKS, feedJson, fmtDate, rssXml } from './lookout.js';
import { CARD, GROUPS, LEVEL } from './checks-copy.js';
import { ogFor } from './og-pages.js';
import { LEVELS, TOP, pill, shield, selfCheckedSvg } from './badges.js';
import { OWN_ID, OWN_LETTER, OWN_SITE, badgeId } from './badge-id.js';
// sigship.dev's own badge: Live-checked (the check runs on every change), not Expert, until an outside engineer signs a review.
const OWN_LEVEL = LEVELS.find((l) => l.id === 'live');
if (OWN_LETTER !== 'L') throw new Error('sigship.dev shows the Live-checked badge; scripts/badge-id.js disagrees.');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const site = join(root, 'site');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const NODE_MIN = pkg.engines.node.replace('>=', '');
const cap = JSON.parse(readFileSync(join(here, 'home/demo-run.json'), 'utf8'));
if (cap.version !== VERSION) throw new Error(`The demo capture is from ${cap.version}, package.json is ${VERSION}. Run npm run capture.`);
if (cap.rules.total !== RULES.length) throw new Error('RULES changed since the capture. Run npm run capture.');
const LASTMOD = (() => { try { return execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: root, encoding: 'utf8' }).trim(); } catch { return PUBLISHED; } })();
if (!existsSync(join(site, FILM.poster))) throw new Error(`The film poster ${FILM.poster} is missing.`);
// Polar checkout links for the self-hosted plans, set in the build environment once the products exist (docs/DESIGN.md).
// Without them the Pro and Business buttons stay on the waitlist.
const CHECKOUT = { pro: process.env.POLAR_CHECKOUT_PRO || '', business: process.env.POLAR_CHECKOUT_BUSINESS || '' };
for (const [plan, url] of Object.entries(CHECKOUT)) if (url && !/^https:\/\/[\w.-]+\.polar\.sh\//.test(url) && !/^https:\/\/polar\.sh\//.test(url)) throw new Error(`POLAR_CHECKOUT_${plan.toUpperCase()} must be an https://polar.sh link.`);
// The in-browser check lives at /check/ (built by scripts/build-check.js). Every "Check my app" goes there.
const CHECK = '/check/';
// The benchmark's results, when bench/run.js has written them.
const BENCH = existsSync(join(root, 'bench/results.json')) ? JSON.parse(readFileSync(join(root, 'bench/results.json'), 'utf8')) : null;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const clip = (t, n = 158) => (t.length <= n ? t : `${t.slice(0, t.lastIndexOf(' ', n - 1))}…`);
const write = (path, html) => { const file = join(site, path, 'index.html'); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, html); };

// ---------- Shared pieces ----------
const mark = (w = 27) => `<svg width="${w}" height="${Math.round(w / 1.21)}" viewBox="0 0 256 211" aria-hidden="true"><rect width="12" height="211" rx="6" fill="currentColor"/><rect x="16" y="12.8" width="240" height="160" rx="9.6" fill="var(--brand)"/><rect x="99.2" y="56" width="73.6" height="73.6" fill="#fff"/></svg>`;
const logo = () => `<a class="logo" href="/" aria-label="SIGSHIP home">${mark()}<b>SIGSHIP</b></a>`;
// Two voices for one line: plain (default) and dev.
const T = (s, d) => `<span class="s">${s}</span><span class="d">${d}</span>`;
const eyebrow = (text, c = 'violet') => `<div class="eyebrow" style="--c:var(--${c})"><i></i>${text}</div>`;
const splitH = (text, tag = 'h2', cls = 'display h2') => `<${tag} class="${cls} split-h">${text.split(' ').map((w, i) => `<span class="w"><i style="--i:${i}">${w}&nbsp;</i></span>`).join('')}</${tag}>`;
const copyPill = (cmd = 'npx sigship') => `<button class="copy-pill" type="button" data-copy="${esc(cmd)}"><span class="dollar">$</span>${esc(cmd)}<span class="state">copy</span></button>`;
const code = (text, title) => `<div class="code">${title ? `<div class="code-t">${esc(title)}</div>` : ''}<pre><code>${esc(text)}</code></pre></div>`;
const codeCopy = (text, title) => `<div class="code"><div class="code-t code-row"><span>${esc(title || '')}</span><button class="copy-btn" type="button" data-copy="${esc(text)}"><span class="copy-label">copy</span></button></div><pre><code>${esc(text)}</code></pre></div>`;
const MENUS = {
  Product: [['/checks/', 'The 17 checks', 'What we look for, in plain words'], ['/cloud/', 'SIGSHIP Cloud', 'Nightly checks + dashboard'], ['/badge/', 'Verified badge', 'Show customers you checked'], ['/lookout/', 'Lookout', 'New threats, caught early'], ['/pricing/', 'Pricing', CHECKOUT.pro ? 'Free forever, Pro on sale' : 'Free forever, plans soon'], ['/waitlist/', 'Waitlist', 'Early-bird pricing for paid plans']],
  Developers: [['/docs/', 'Docs', 'Install, flags, exit codes'], ['/agents/', 'AI agents', 'Claude Code, Cursor, MCP'], ['/api/', 'API', 'Connect SIGSHIP Cloud'], ['/changelog/', 'Changelog', 'Every change, dated'], ['/releases/', 'Releases', 'Versions and downloads']],
  Resources: [['/resources/', 'Guides', 'Check your Lovable or Bolt app'], ['/glossary/', 'Jargon, explained', 'Every term in plain words'], ['/score/', 'Readiness score', 'The formula, published'], ['/accuracy/', 'Accuracy', 'How often each check is right'], ['/expert-review/protocol/', 'Review protocol', 'What an expert review covers'], ['/incident-rule/', 'Incident rule', 'What happens if a badge fails you'], ['/open-source/', 'Open source', 'MIT, built in public'], ['/community/', 'Community', 'GitHub, Discord and help']],
};
const discordIcon = (sz = 18) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.8a13.7 13.7 0 0 0-.63 1.28 18.4 18.4 0 0 0-5.6 0 13.7 13.7 0 0 0-.63-1.28 19.7 19.7 0 0 0-4.89 1.52C.6 9.03-.24 13.57.18 18.05a19.9 19.9 0 0 0 6 3.03 14.6 14.6 0 0 0 1.28-2.1 12.9 12.9 0 0 1-2.02-.97l.5-.38a14.2 14.2 0 0 0 12.12 0l.5.38c-.64.38-1.32.71-2.02.97.37.74.8 1.44 1.28 2.1a19.8 19.8 0 0 0 6-3.03c.5-5.18-.84-9.68-3.5-13.68zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.34-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.34-.94 2.42-2.15 2.42z"/></svg>`;
const SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>';
const MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>';
const header = () => `<header class="top">
<nav class="navbar" aria-label="Main">
  ${logo()}
  <div class="menus">
    ${Object.entries(MENUS).map(([name, items]) => `<div class="menu"><button class="menu-btn" type="button" aria-expanded="false">${name}</button><div class="mega">${items.map(([to, t, d]) => `<a href="${to}"><b>${t}</b><span>${d}</span></a>`).join('')}</div></div>`).join('')}
    <a class="nav-link" href="/pricing/">Pricing</a>
  </div>
  <div class="nav-acts">
    <button class="mode-sw" type="button" data-mode-toggle aria-pressed="false" aria-label="Switch between simple and dev wording"><span class="knob"><i></i></span><span class="s">simple</span><span class="d">dev mode</span></button>
    <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch between dark and light">${SUN}${MOON}</button>
    <a class="icon-btn social" href="${GH}" target="_blank" rel="noopener" aria-label="GitHub (opens in a new tab)">${brandIcon('github', 18, true)}</a>
    <a class="icon-btn social" href="${DISCORD}" target="_blank" rel="noopener" aria-label="Discord (opens in a new tab)">${discordIcon(18)}</a>
    <a class="btn btn-primary btn-sm nav-cta" href="${CHECK}">Check my app</a>
    <button class="burger" type="button" data-mobile-toggle aria-label="Menu" aria-expanded="false"><i></i><i></i></button>
  </div>
</nav>
<div class="mobile-menu" hidden>
  <div class="links">${Object.values(MENUS).flat().map(([to, t]) => `<a href="${to}">${t}</a>`).join('')}</div>
  <div class="row"><button type="button" data-mode-toggle aria-pressed="false"><span class="s">Dev mode: off</span><span class="d">Dev mode: on</span></button><button type="button" data-theme-toggle aria-label="Switch between dark and light">${SUN}${MOON} Theme</button></div>
  <div class="row"><a href="${GH}" target="_blank" rel="noopener">${brandIcon('github', 16, true)} GitHub</a><a href="${DISCORD}" target="_blank" rel="noopener">${discordIcon(16)} Discord</a></div>
  <div class="row"><a class="btn btn-primary" href="${CHECK}">Check my app</a></div>
</div>
</header>`;
const FOOT_COLS = [
  ['Product', [['/checks/', '17 checks'], ['/cloud/', 'Cloud'], ['/badge/', 'Verified badge'], ['/lookout/', 'Lookout'], ['/pricing/', 'Pricing'], ['/waitlist/', 'Waitlist']]],
  ['Developers', [['/docs/', 'Docs'], ['/agents/', 'AI agents'], ['/api/', 'API'], ['/changelog/', 'Changelog'], ['/releases/', 'Releases']]],
  ['Company', [['/resources/', 'Resources'], ['/guides/', 'Guides'], ['/score/', 'Readiness score'], ['/accuracy/', 'Accuracy'], ['/incident-rule/', 'Incident rule'], ['/roadmap/', 'Roadmap'], ['/open-source/', 'Open source'], ['/community/', 'Community'], ['/brand/', 'Brand'], ['/privacy/', 'Privacy'], ['/terms/', 'Terms']]],
];
const footer = () => `<footer class="foot">
<div class="foot-grid">
  <div>${logo()}<p class="about">The launch check for apps built with AI. Free and open source.</p><p class="by">Powered and backed by <a class="text-spectrum" href="https://zoof04.com" target="_blank" rel="noopener">zoof04</a></p><div class="foot-badge" title="sigship.dev holds the Live-checked badge. Click it to see the record.">${pill(OWN_LEVEL, { site: OWN_SITE })}</div></div>
  ${FOOT_COLS.map(([h, links]) => `<div class="col"><div class="k">${h}</div><ul>${links.map(([to, t]) => `<li><a href="${to}">${t}</a></li>`).join('')}</ul></div>`).join('')}
</div>
<div class="word" aria-hidden="true">SIGSHIP</div>
<div class="legal"><span>© 2026 SIGSHIP by Zoof04 Inc. · MIT licensed · <a href="mailto:support@sigship.dev">support@sigship.dev</a></span><span>A GO means our checks found nothing blocking launch. It does not prove the app is safe.</span></div>
</footer>`;
// Before first paint: theme, voice, whether the announcement strip shows, and whether the loader shows (once per tab).
const STRIP_UNTIL = '2026-12-01T08:00:00Z';
const HEAD_SCRIPT = `<script>(function(){var d=document.documentElement;d.classList.add('js');var t=null,m=null,x=null,b=null;try{t=localStorage.getItem('sigship-theme');m=localStorage.getItem('sigship-dev');x=localStorage.getItem('sigship-strip-cm26');b=sessionStorage.getItem('sigship-boot');sessionStorage.setItem('sigship-boot','1')}catch(e){}if(t==='light')d.classList.add('light');if(m==='1'||(m===null&&/github\\.com|npmjs\\.com/.test(document.referrer)))d.setAttribute('data-dev','1');var q=new URLSearchParams(location.search);if(q.get('theme')==='light')d.classList.add('light');if(q.get('theme')==='dark')d.classList.remove('light');if(q.get('mode')==='dev')d.setAttribute('data-dev','1');if(q.get('mode')==='plain')d.removeAttribute('data-dev');if(!x&&Date.now()<Date.parse('${STRIP_UNTIL}'))d.classList.add('has-strip');if(b||matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('no-boot');})();</script>`;
// The loader: the flag waves while the page loads, with a short progress bar. Shown once per tab, never for reduced motion.
const BOOT_CSS = `<style>.boot{position:fixed;inset:0;z-index:300;display:grid;place-content:center;justify-items:center;gap:22px;background:#121316;transition:opacity .45s ease,visibility .45s}html.light .boot{background:#f9f9fb}html.no-boot .boot,.boot.done{opacity:0;visibility:hidden}.boot svg{width:96px;height:79px;color:#f4f4f6}html.light .boot svg{color:#16171b}.boot-bar{width:128px;height:3px;overflow:hidden;border-radius:999px;background:rgba(128,128,140,.25)}.boot-bar i{display:block;height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#b48cf2,#7cc4f0,#86d8d0,#c7f26b,#f2c66b,#f09b7a);transition:width .35s ease;animation:bootbar 1.4s cubic-bezier(.2,.7,.2,1) forwards}.boot.done .boot-bar i,.boot.full .boot-bar i{width:100%!important;animation:none}@keyframes bootbar{to{width:78%}}</style>`;
const BOOT = `<div class="boot" id="boot" aria-hidden="true"><svg viewBox="0 0 256 211"><rect width="12" height="211" rx="6" fill="currentColor"/><path fill="#2f5be0"><animate attributeName="d" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" values="M16 13 Q76 1 136 13 T256 13 L256 173 Q196 185 136 173 T16 173 Z;M16 13 Q76 25 136 13 T256 13 L256 173 Q196 161 136 173 T16 173 Z;M16 13 Q76 1 136 13 T256 13 L256 173 Q196 185 136 173 T16 173 Z"/></path><path fill="#fff"><animate attributeName="d" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" values="M99 52 Q118 48 136 52 T173 52 L173 126 Q154 130 136 126 T99 126 Z;M99 52 Q118 56 136 52 T173 52 L173 126 Q154 122 136 126 T99 126 Z;M99 52 Q118 48 136 52 T173 52 L173 126 Q154 130 136 126 T99 126 Z"/></path></svg><div class="boot-bar"><i></i></div></div>
<script>(function(){var b=document.getElementById('boot');if(!b||document.documentElement.classList.contains('no-boot'))return;var t0=Date.now();function go(){b.classList.add('full');setTimeout(function(){b.classList.add('done');setTimeout(function(){b.remove()},500)},Math.max(0,700-(Date.now()-t0)))}if(document.readyState==='complete')go();else addEventListener('load',go);setTimeout(go,2500)})();</script>`;
// The announcement strip. Dismissable; it hides itself after Cyber Monday.
const STRIP = `<div class="strip" id="strip" role="region" aria-label="Announcement"><div class="strip-in"><span class="strip-tag">Cyber Monday · Nov 30</span><span class="strip-text">Early birds get <b>50% off self-hosted plans</b>. Join the waitlist to lock in the price.</span><span class="strip-short">Early birds: <b>50% off self-hosted</b></span><a class="strip-cta" href="/waitlist/?plan=pro">Join the waitlist →</a></div><button class="strip-x" type="button" data-strip-close aria-label="Hide this announcement">×</button></div>`;

// Every indexed page gets social tags, breadcrumbs and FAQ data built from its own visible questions.
const page = ({ title, description, path, body, trail, ld: extra = [], ogType = 'website', canonical, noindex = false }) => {
  const url = `${ORIGIN}${canonical || path}`;
  const og = `${ORIGIN}${ogFor(canonical || path)}`;
  const graph = noindex ? [] : [crumbs(trail || [['Home', '/'], [title.split(' — ')[0], path]]), faqFromHtml(body), ...extra].filter(Boolean);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">
<meta name="author" content="Zoof04 Inc.">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="SIGSHIP">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:alt" content="${esc(title)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt">
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<meta name="theme-color" content="#121316">
<meta name="color-scheme" content="dark light">
${BOOT_CSS}
${graph.length ? ld({ '@context': 'https://schema.org', '@graph': graph }) : ''}
${HEAD_SCRIPT}
<link rel="stylesheet" href="/app.css">
<script src="/app.js" defer></script>
</head>
<body class="grain">
<a class="skip" href="#main">Skip to content</a>
${BOOT}
${STRIP}
${header()}
<main id="main">
${body}
</main>
${footer()}
<p class="sr" id="live" aria-live="polite"></p>
</body>
</html>
`;
};
const pageHero = ({ eyebrow: eb, title, sub, color = 'violet', extra = '', trail }) => `<section class="page-hero"><div class="grid-bg"></div><div class="glow" style="--c:var(--${color})"></div><div class="in">
${trail ? `<ol class="crumbs">${trail.map(([n, h], i) => (i === trail.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${h}">${esc(n)}</a></li>`)).join('')}</ol>` : ''}
${eyebrow(eb, color)}
${splitH(title, 'h1', 'display')}
<p class="lede rv" style="--d:.2s">${sub}</p>
${extra ? `<div class="extra rv" style="--d:.3s">${extra}</div>` : ''}
</div></section>`;
const section = (inner, cls = '') => `<section class="sec ${cls}"><div class="wrap wrap-5">${inner}</div></section>`;

// ---------- Content ----------
for (const r of RULES) if (!CARD[r.id]) throw new Error(`scripts/build-site.js has no card lines for the check ${r.id}.`);
const CHECKS = RULES.map((r) => ({ ...r, group: CARD[r.id][0], risk: CARD[r.id][1], fix1: CARD[r.id][2], level: LEVEL[r.severity] }));
const checkCard = (c, i) => { const g = GROUPS[c.group]; return `<a class="check-card rv" href="/checks/${c.id}/" data-group="${c.group}" style="--c:var(--${g.color});--d:${Math.min(i, 8) * 0.03}s">
<div class="glow"></div>
<div class="front"><div class="row"><span class="emoji">${g.emoji}</span><span class="tag" style="--c:var(--${c.level.c})">${T(c.level.label, c.level.dev)}</span></div><h3>${T(esc(c.title), c.id)}</h3><p class="risk">${esc(c.risk)}</p></div>
<div class="back"><div class="k">The fix</div><p>${esc(c.fix1)}</p><div class="id">${c.id}</div><span class="more">How to fix it →</span></div>
</a>`; };
const checksGrid = (limit) => `<div class="filters" role="group" aria-label="Filter by what the check protects"><button class="chip" type="button" data-group="all" aria-pressed="true">All ${RULES.length}</button>${Object.entries(GROUPS).map(([k, g]) => `<button class="chip" type="button" data-group="${k}" aria-pressed="false">${g.emoji} ${g.label}</button>`).join('')}</div>
<div class="check-grid">${CHECKS.slice(0, limit).map(checkCard).join('\n')}</div>`;

const BUILT = ['lovable', 'cursor', 'bolt', 'replit', 'v0', 'claude', 'windsurf', 'copilot'];
const AGENT_SETUP = [
  ['claude', 'Run this once in your terminal.', 'claude mcp add sigship -- npx -y sigship mcp'],
  ['cursor', 'Add to .cursor/mcp.json', '{ "mcpServers": { "sigship": { "command": "npx", "args": ["-y", "sigship", "mcp"] } } }'],
  ['windsurf', 'Add to ~/.codeium/windsurf/mcp_config.json', '{ "mcpServers": { "sigship": { "command": "npx", "args": ["-y", "sigship", "mcp"] } } }'],
  ['copilot', 'Add to .vscode/mcp.json', '{ "servers": { "sigship": { "command": "npx", "args": ["-y", "sigship", "mcp"] } } }'],
  ['gemini', 'Run in your terminal.', 'gemini mcp add sigship npx -y sigship mcp'],
  ['codex', 'Add to ~/.codex/config.toml', '[mcp_servers.sigship]\ncommand = "npx"\nargs = ["-y", "sigship", "mcp"]'],
  ['lovable', 'Paste into your Lovable chat after running the check.', 'npx sigship --prompt'],
];
const ORBIT = ['claude', 'cursor', 'windsurf', 'copilot', 'gemini', 'codex', 'lovable', 'mcp'];
const setupTabs = () => `<div class="setup"><div class="tabs" role="tablist" aria-label="Your AI tool">${AGENT_SETUP.map(([b], i) => `<button type="button" role="tab" id="st-${b}" aria-controls="sp-${b}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${brandIcon(b, 16)}${BRAND_LABEL[b]}</button>`).join('')}</div>
${AGENT_SETUP.map(([b, how, cmd], i) => `<div class="panel" role="tabpanel" id="sp-${b}" aria-labelledby="st-${b}"${i ? ' hidden' : ''}><div class="how"><span>${esc(how)}</span><button class="copy-btn" type="button" data-copy="${esc(cmd)}"><span class="copy-label">copy</span></button></div><pre>${esc(cmd)}</pre></div>`).join('')}</div>`;
const orbit = () => `<div class="orbit" aria-hidden="true">${[1, 0.7, 0.42].map((s) => `<div class="ring" style="width:${s * 100}%;height:${s * 100}%"></div>`).join('')}<div class="spin">${ORBIT.map((b, i) => { const a = (i / ORBIT.length) * Math.PI * 2; return `<div class="sat" style="--x:${(Math.cos(a) * 44).toFixed(2)}%;--y:${(Math.sin(a) * 44).toFixed(2)}%">${brandIcon(b, 26)}</div>`; }).join('')}</div><div class="core">${mark(48)}</div></div>`;

const DASH_APPS = [{ n: 'plantpal.app', b: 'lovable', s: 100, st: 'Ready' }, { n: 'invoicely.io', b: 'bolt', s: 86, st: '1 to fix' }, { n: 'tutor-ai.com', b: 'cursor', s: 64, st: '3 to fix' }, { n: 'fitloop.co', b: 'replit', s: 100, st: 'Ready' }];
const BARS = [62, 70, 68, 81, 77, 90, 88, 94, 92, 100, 97, 100, 100, 100];
const ALERTS = [['go', "plantpal.app passed last night's check", '2m'], ['warn', 'tutor-ai.com: your AI has no spending brake', '1h'], ['sky', 'New check added: Next.js image bug', '5h']];
const dashboard = () => `<div class="dash rv bars-host" data-apps='${JSON.stringify(DASH_APPS)}' role="img" aria-label="A preview of the SIGSHIP Cloud dashboard: four demo apps, a safety score, nightly checks, issues by type, badge status and alerts.">
<div class="dash-bar"><b>SIGSHIP Cloud <span class="tag" style="--c:var(--sky)">preview</span></b><span class="next"><i></i> Next check in 4h 12m</span></div>
<div class="dash-body">
  <aside class="dash-apps"><div class="k">Your apps</div>${DASH_APPS.map((a, i) => `<button type="button" aria-selected="${i === 0}" style="--c:var(--${a.s === 100 ? 'go' : a.s > 80 ? 'warn' : 'stop'})">${brandIcon(a.b, 16)}<span>${a.n}</span><i></i></button>`).join('')}</aside>
  <div class="dash-main">
    <div class="tile"><div class="k">Safety score</div><div class="ring-wrap" style="--c:var(--go)"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="50" stroke-width="10" fill="none"/><circle class="arc" cx="60" cy="60" r="50" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="0"/></svg><b>100</b></div><div class="status" style="--c:var(--go)">Ready</div></div>
    <div class="tile span2"><div class="row"><span>Nightly checks · last 14 nights</span><span class="check">↑ 38%</span></div><div class="bars">${BARS.map((h, i) => `<i style="--h:${h}%;--i:${i};--c:var(--${h === 100 ? 'go' : h > 80 ? 'teal' : 'violet'})"></i>`).join('')}</div></div>
    <div class="tile"><div class="k">Issues by type</div><div class="issue-rows">${[['Fix now', 'stop'], ['Fix soon', 'warn'], ['Nice to fix', 'muted-foreground']].map(([l, c]) => `<div><span>${l}</span><div class="meter"><i style="--w:4%;--c:var(--${c})"></i></div><span class="n">0</span></div>`).join('')}</div></div>
    <div class="tile"><div class="k">Badge status</div><div style="margin-top:20px" data-badge>${pill(LEVELS[2], { meter: false })}<span class="paused" hidden>⏸ Badge paused until fixed</span></div><div class="k" style="margin-top:16px">Last pass · 9 Nov 2026, 02:00</div></div>
    <div class="tile"><div class="k">Alerts</div><div class="alerts">${ALERTS.map(([c, t, w]) => `<div style="--c:var(--${c})"><i></i><span>${esc(t)}</span><small>${w}</small></div>`).join('')}</div></div>
  </div>
</div></div>`;

const STATUS_UI = { cov: ['✓ Covered', 'go'], part: ['◐ Partly covered', 'amber'], plan: ['● New check being written', 'amber'], watch: ['● Watching', 'sky'] };
const feed = (n = NOTICES.length) => `<div class="feed">${NOTICES.slice(0, n).map((x) => { const [label, c] = STATUS_UI[x.status]; return `<a href="/lookout/#${x.slug}"><span class="dt">${esc(fmtDate(x))}</span><span class="tg">${esc(STACKS[x.stack[0]] || x.stack[0])}</span><span class="ti">${T(esc(x.title.plain), esc(x.title.dev))}</span><span class="st" style="--c:var(--${c})">${label}</span></a>`; }).join('')}</div>`;
const pipeline = () => `<div class="pipeline"><div class="line"><i></i></div>${[['📡', 'Threat spotted', 'We watch security news, CVEs and attacks on apps like yours.', 'coral'], ['🛠️', 'New check written', 'Our team turns it into a new check within days.', 'amber'], ['🛡️', "You're covered", 'Your next check catches it — no action needed.', 'go']].map(([e, t, d, c], i) => `<div class="card pipe rv" style="--c:var(--${c});--d:${i * 0.25}s"><div class="em" style="--d:${i * 0.5}s">${e}</div><h3>${t}</h3><p class="sub">${d}</p></div>`).join('')}</div>`;

const byId = Object.fromEntries(TRACKS.flatMap((t) => t.plans).map((p) => [p.id, p]));
// Every card has the same rows in the same order (name, price, tagline, list, note, button), with fixed-height rows
// where the words vary, so the buttons sit on one line across the grid.
// The small status label next to a paid feature: at launch, or the month it rolls out by.
const stTag = (k) => (k && FEATURE_STATUS[k] ? `<span class="st-tag" style="--c:var(--${FEATURE_STATUS[k].c})" title="${esc(FEATURE_STATUS[k].long)}">${esc(FEATURE_STATUS[k].label)}</span>` : '');
const planCard = (p, { hot = false, live = false, href, cta } = {}) => {
  const buy = CHECKOUT[p.id] || '';
  const tag = live ? 'Live' : buy ? 'On sale' : 'Waitlist';
  const note = p.note ? `${p.note}${buy ? ` ${REFUND_LINE}` : ''}` : live ? 'Open source under MIT. No account, no card, no limits.' : 'Early estimate. You pay nothing until it opens.';
  return `<div class="plan card rv${hot ? ' hot spectrum-border' : ''}">
<div class="row"><h3>${esc(p.name)}</h3><span class="tag${live || buy ? '' : ' tag-plain'}" style="--c:var(--go)">${tag}</span></div>
${p.monthly ? `<div class="price"><span class="y"><b>${esc(p.price)}</b><span>${esc(p.per)}</span></span><span class="m"><b>${esc(p.monthly)}</b><span>${esc(p.perMonthly)}</span></span></div>` : `<div class="price"><span class="y"><b>${esc(p.price)}</b><span>${esc(p.per)}</span></span></div>`}
<p class="who">${esc(p.tagline)}</p>
<ul>${p.items.slice(0, 6).map(item).map((f) => `<li><i>✓</i><span>${esc(f.text)}${stTag(f.status)}</span></li>`).join('')}</ul>
<p class="note">${esc(note)}</p>
<a class="btn ${live || hot ? 'btn-primary' : 'btn-ghost'}" href="${href || (live ? CHECK : buy || `/waitlist/?plan=${p.id}`)}"${buy ? ' rel="noopener"' : ''}>${cta || (live ? 'Check my app' : buy ? `Buy ${esc(p.name)}` : 'Join waitlist')}</a>
</div>`;
};
const STATUS_KEY = `<p class="status-key">${Object.values(FEATURE_STATUS).map((s) => `<span><i style="--c:var(--${s.c})"></i>${esc(s.label)}: ${esc(s.long.charAt(0).toLowerCase() + s.long.slice(1))}</span>`).join('')}<span>${esc(REFUND_LINE)}</span></p>`;
const billToggle = () => `<div class="bill" role="group" aria-label="Billing"><button type="button" data-bill="yearly" aria-pressed="true">Yearly <small>save 20%</small></button><button type="button" data-bill="monthly" aria-pressed="false">Monthly</button></div>`;
// Self-hosted and Cloud, behind one segmented switch. Same component on the home page and the pricing page.
const pricingTabs = (id) => `<div class="seg rv" role="tablist" aria-label="How you want to run SIGSHIP">
<button type="button" role="tab" id="${id}-t-self" aria-controls="${id}-p-self" aria-selected="true"><b>On your computer</b><small>Self-hosted · pay once</small></button>
<button type="button" role="tab" id="${id}-t-cloud" aria-controls="${id}-p-cloud" aria-selected="false" tabindex="-1"><b>In the cloud</b><small>Coming soon · monthly</small></button>
</div>
<div role="tabpanel" id="${id}-p-self" aria-labelledby="${id}-t-self"><p class="seg-note">Like an app you install. Runs on your computer and in your own GitHub; your code never leaves.</p><div class="plan-grid">${planCard(byId.free, { live: true })}${planCard(byId.pro, { hot: true })}${planCard(byId.business)}</div></div>
<div role="tabpanel" id="${id}-p-cloud" aria-labelledby="${id}-t-cloud" hidden class="bill-panel"><p class="seg-note">Like Gmail: we run it for you and watch your live apps every night. Every Cloud plan includes every Pro check.</p>${billToggle()}<div class="plan-grid">${planCard(byId.solo)}${planCard(byId.team, { hot: true })}${planCard(byId.agency)}</div></div>
${STATUS_KEY}`;
const homePricing = () => pricingTabs('hp');

// ---------- Home ----------
const r1 = cap.run1;
const home = () => `<section class="hero"><div class="grid-bg"></div><div class="blob b1"></div><div class="blob b2"></div>
<div class="hero-in">
  <div class="hero-pills"><a class="pill spectrum-border" href="${GH}">${brandIcon('github', 14, true)}<b>Open source</b><span class="muted">· MIT · v${VERSION}</span></a><span class="pill"><span class="ping" style="--c:var(--sky)"></span>SIGSHIP Cloud is coming · <a class="sky" href="/cloud/">join waitlist →</a></span></div>
  <h1 class="display hero-h1">${['You', 'built', 'it', 'fast.'].map((w, i) => `<span class="w"><i style="--i:${i}">${w}&nbsp;</i></span>`).join('')}<br><span class="line2 text-spectrum shimmer">Launch it safe.</span></h1>
  <p class="lede hero-lede">${T('Made your app with Lovable, Cursor or Bolt? SIGSHIP spots the mistakes hackers look for, explains them like a friend, and gives you a fix to paste back into your AI.', `${RULES.length} deterministic checks for AI-generated code. Runs offline, zero deps, exit 0 only on GO — a real ‘definition of done’ for your coding agent.`)}</p>
  <div class="hero-acts"><a class="btn btn-primary btn-lg" href="${CHECK}">Check my app — free</a>${copyPill()}</div>
  <p class="fine">No sign-up · Nothing uploaded · Your code never leaves your computer</p>
  <div class="window-wrap"><div class="app-window" role="img" aria-label="Demo: a launch check on a small app finds three problems, each gets fixed, and the verdict turns to Ready.">
    <div class="win-bar"><i></i><i></i><i></i><span>demo-app · launch check · real findings from sigship ${VERSION}</span></div>
    <div class="win-body">
      <div class="score"><svg viewBox="0 0 120 120"><defs><linearGradient id="hg"><stop stop-color="var(--coral)"/><stop offset="1" stop-color="var(--amber)"/></linearGradient></defs><circle class="track" cx="60" cy="60" r="50" stroke-width="10" fill="none"/><circle class="arc" cx="60" cy="60" r="50" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="195"/></svg><div class="score-num"><b>38</b><small>safety</small></div><div class="pad"></div></div>
      <div class="issues">${r1.findings.map((f) => `<div class="issue" style="--c:var(--${f.severity === 1 ? 'stop' : 'warn'})"><span class="st">!</span><div class="t"><b>${T(esc(f.title), f.id)}</b><span>${esc(`${f.file}:${f.line}`)}</span></div><span class="r">Found</span></div>`).join('')}
      <div class="verdict">${T(`${r1.findings.length} things to fix before launch`, 'NO-GO · exit 1')}</div></div>
    </div>
  </div></div>
</div></section>

<section class="builtwith"><p>Works with apps made in</p><div class="marquee" aria-label="Lovable, Cursor, Bolt, Replit, v0, Claude Code, Windsurf and GitHub Copilot"><div class="track" aria-hidden="true">${[...BUILT, ...BUILT].map((b) => `<div class="brand-item">${brandIcon(b, 26)}<span>${BRAND_LABEL[b]}</span></div>`).join('')}</div></div></section>

<section class="film" aria-labelledby="film-h"><div class="film-head">${eyebrow('60-second film', 'pink')}${splitH('See SIGSHIP in a minute.').replace('<h2 ', '<h2 id="film-h" ')}</div>
<div class="film-frame" data-vimeo="${FILM.vimeoId}" data-title="${esc(FILM.title)}"><img class="film-poster" src="${FILM.poster}" width="1280" height="720" alt="${esc(FILM.title)}" loading="lazy"><button class="play" type="button" aria-label="Play the film (loads the Vimeo player)"><span><svg width="28" height="28" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span></button></div>
<p class="fine">${FILM.duration.replace('PT', '').replace('S', ' seconds')}. The video player loads from Vimeo only when you press play.</p></section>

<section class="hiw" aria-labelledby="hiw-h"><div class="hiw-sticky">
  <div class="hiw-head">${eyebrow('How it works', 'amber')}<h2 class="display h2" id="hiw-h">Three steps. <span class="muted">No tech degree.</span></h2><div class="bar"><i></i></div></div>
  <div class="hiw-track">
    <div class="step" style="--c:var(--violet)"><div class="step-in"><div class="step-copy"><div class="n">01</div><h3>Point it at your app</h3><p>${T('Open your project folder and run one line. Nothing gets uploaded.', `npx sigship in the repo root. Reads files locally, about ${r1.textScanMs} ms on the demo app.`)}</p></div>
      <div class="step-art"><div class="art1"><div class="orbit-ring"></div><div class="cmd"><span class="dollar">$</span> npx sigship<span class="caret">▍</span></div>${['📁 src', '📄 .env', '🗄️ supabase'].map((f, k) => `<div class="file" style="top:${15 + k * 30}%;left:${k % 2 ? '8%' : '70%'};--d:${k * 0.4}s">${f}</div>`).join('')}</div></div></div></div>
    <div class="step" style="--c:var(--amber)"><div class="step-in"><div class="step-copy"><div class="n">02</div><h3>Read what's wrong, in plain words</h3><p>${T('Each problem says what could happen and how bad it is.', 'Findings sorted by severity with file:line and impact.')}</p></div>
      <div class="step-art"><div class="art2">${[['Fix now', 'stop', 'Your Stripe webhook accepts anything'], ['Fix soon', 'warn', 'Your AI route has no spending brake'], ['Nice to fix', 'muted-foreground', 'Any website can call your API']].map(([l, c, t]) => `<div class="row" style="--c:var(--${c})"><span>${l}</span><div>${t}</div></div>`).join('')}</div></div></div></div>
    <div class="step" style="--c:var(--go)"><div class="step-in"><div class="step-copy"><div class="n">03</div><h3>Paste the fix into your AI</h3><p>${T('Copy the fix, paste it into Lovable or Cursor, check again until it says Ready.', '--prompt emits a fix brief. Loop until exit 0.')}</p></div>
      <div class="step-art"><div class="art3"><div class="note"><small>Fix prompt</small>Move the key to the server…</div><div class="arrow">→</div><div class="tool">${brandIcon('lovable', 40)}</div><div class="ready">✓ Ready</div></div></div></div></div>
  </div>
</div></section>

<section class="sec" id="checks"><div class="wrap">
  <div class="rv" style="max-width:48rem;margin-bottom:48px">${eyebrow(`The ${RULES.length} checks`, 'amber')}<h2 class="display h2">The ${RULES.length} mistakes AI tools make most. <span class="muted">We check every one.</span></h2><p class="lede" style="margin-top:20px">Hover a card to see the fix. No jargon — just what could happen and what to do.</p></div>
  ${checksGrid()}
</div></section>

<section class="sec"><div class="wrap">
  <div class="rv" style="max-width:42rem">${eyebrow('Fix it with your AI', 'teal')}<h2 class="display h2">We find it. <span class="text-spectrum">Your AI fixes it.</span></h2></div>
  <div class="grid-3" style="margin-top:56px">${[['The problem', 'stop', 'const openai = new OpenAI({\n  apiKey: "sk-live-9fX…"\n});', 'Your AI key is in the browser'], ['The fix prompt', 'violet', 'Move the OpenAI call into a\nserver function. Read the key\nfrom process.env.OPENAI_KEY.', 'Copy → paste into your AI'], ['Fixed', 'go', '// server only\nconst openai = new OpenAI({\n  apiKey: process.env.OPENAI_KEY\n});', 'Check again → Ready ✓']].map(([t, c, codeText, note], i) => `<div class="card fix-card rv" style="--c:var(--${c});--d:${i * 0.12}s"><div class="row"><span>${t}</span><span class="dot" style="--c:var(--${c})"></span></div><pre>${esc(codeText)}</pre><div class="note">${note}</div></div>`).join('')}</div>
</div></section>

<section class="sec agents"><div class="blob b3"></div><div class="wrap agents-grid">
  <div><div class="rv">${eyebrow('For AI agents', 'violet')}<h2 class="display h2">Your AI checks its own work <span class="text-spectrum">before it says “done”.</span></h2><p class="lede" style="margin-top:20px">Plug SIGSHIP into Claude Code, Cursor, Windsurf, Copilot or any tool that speaks MCP — the standard way AI tools connect to helpers. Your agent runs the check and keeps fixing until it's Ready.</p></div><div class="rv" style="--d:.15s">${setupTabs()}</div></div>
  <div class="rv" style="--d:.1s">${orbit()}</div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="rv center" style="max-width:48rem;margin:0 auto">${eyebrow('Verified badge', 'go')}<h2 class="display h2">Customers trust apps <br><span class="text-spectrum">that show they checked.</span></h2><p class="lede" style="max-width:36rem;margin:20px auto 0">Put a live SIGSHIP badge on your site. It tells visitors you take their data seriously — and it updates itself.</p></div>
  ${badgeStage()}
  ${badgeLevels()}
  <div class="acts"><a class="btn btn-primary btn-lg" href="/cloud/">Get your Verified badge</a><a class="btn btn-ghost btn-lg" href="/badge/">How badges work</a></div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="rv" style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:48px"><div style="max-width:42rem">${eyebrow('SIGSHIP Cloud · coming soon', 'sky')}<h2 class="display h2">We keep watch. <span class="muted">You keep building.</span></h2><p class="lede" style="margin-top:20px">Connect your apps once. Every night we check them, show you a simple score, and ping you the moment something needs fixing.</p></div><a class="btn btn-primary" href="/cloud/">Join the waitlist</a></div>
  ${dashboard()}
</div></section>

<section class="sec"><div class="wrap">
  <div class="rv" style="max-width:48rem;margin-bottom:48px">${eyebrow('Lookout · always watching', 'coral')}<h2 class="display h2">New threats appear every week. <span class="text-spectrum">We're already on it.</span></h2><p class="lede" style="margin-top:20px">SIGSHIP keeps growing. When a new attack shows up, we add a check for it — proactively, before it reaches you.</p></div>
  ${pipeline()}
  <div style="margin-top:24px">${feed(4)}</div>
  <a class="link-c" href="/lookout/">See the full Lookout →</a>
</div></section>

<section class="sec"><div class="wrap">
  <div class="rv center" style="margin-bottom:48px">${eyebrow("Who it's for", 'lime')}<h2 class="display h2">Built for everyone who ships with AI.</h2></div>
  <div class="grid-2">${[['Vibe coders & founders', 'pink', '✨', ['Plain words, no tech degree', 'Copy the fix, paste into your AI', 'Nothing uploaded, ever', 'A badge to show customers'], CHECK, 'Check my app'], ['Developers & studios', 'sky', '⌘', ['GitHub check on every pull request', 'MCP server for your agents', '--json and --markdown reports', 'Exit codes for any CI'], '/docs/', 'Read the docs']].map(([t, c, e, l, href, cta], i) => `<div class="card aud-card rv" style="--c:var(--${c});--d:${i * 0.1}s"><div class="glow"></div><div class="in"><div class="em">${e}</div><h3>${t}</h3><ul>${l.map((x) => `<li><i>✓</i>${x}</li>`).join('')}</ul><a class="btn btn-ghost" href="${href}">${cta} →</a></div></div>`).join('')}</div>
  <p class="center muted" style="margin-top:24px;font-size:.875rem">🧪 Testers & QA teams — tools for you are coming soon.</p>
</div></section>

<section class="sec" id="pricing"><div class="wrap">
  <div class="rv center" style="margin-bottom:48px">${eyebrow('Pricing', 'amber')}<h2 class="display h2">Free today. <span class="muted">Bigger powers soon.</span></h2></div>
  ${homePricing()}
  <p class="center muted" style="margin-top:20px;font-size:.875rem">${CHECKOUT.pro ? 'Cloud prices are early estimates and may change before launch.' : 'Prices for paid plans are early estimates and may change before launch.'} <a href="/pricing/" style="text-decoration:underline">See every plan →</a></p>
</div></section>

<section class="sec"><div class="wrap"><div class="final-box rv"><div class="glow"></div><div class="in">
  <div class="pill">${brandIcon('github', 14, true)} Open source · MIT · built in public</div>
  <h2 class="display">Ship it. <span class="text-spectrum">Sleep well.</span></h2>
  <p>One line. Free forever. Powered and backed by <b>zoof04</b>.</p>
  <div class="acts">${copyPill()}<a class="btn btn-ghost btn-lg" href="${GH}">★ Star on GitHub</a></div>
</div></div></div></section>`;

function badgeStage() {
  return `<div class="badge-stage rv"><div class="glow"></div><div class="badge-grid">
  <div><label for="badge-app">Try it with your app</label><input id="badge-app" value="myapp.com" maxlength="40" autocomplete="off" spellcheck="false"><div class="badge-preview"><div class="tilt">${pill(LEVELS[3], { cls: 'big', site: 'myapp.com' })}</div></div>
    <ul><li>✓ A unique ID for your site, printed on the badge</li><li>✓ Click it and you land on its public record on sigship.dev</li><li>✓ Live badges turn off by themselves if a check fails</li></ul></div>
  <div class="mock tilt" aria-hidden="true"><div class="mbar"><i></i><i></i><span data-app>myapp.com</span></div><div class="mbody"><div class="ln a"></div><div class="ln b"></div><div class="ln c"></div><div class="ln e"></div><div class="btns"><i></i><i></i></div><div class="mfoot"><div class="ln"></div>${pill(LEVELS[3], { brand: false, meter: false })}</div></div></div>
</div></div>`;
}
const METALS = () => `<div class="metal-strip" aria-label="Badge levels from lowest to highest">${[...LEVELS, TOP].map((l) => `<a href="#lv-${l.id}" class="m-${l.metal}">${l.metalName}<small>${l === TOP ? 'Top level' : `Level ${l.n}`}</small></a>`).join('')}</div>`;
const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const meter = (n) => `<span class="meter" aria-hidden="true">${[1, 2, 3, 4, 5].map((k) => `<i${k <= n ? ' class="f"' : ''}></i>`).join('')}</span>`;
// One row per level: who it is for and which plan it comes with, what it proves, and the badge itself.
const levelRow = (l, i) => `<article class="lv lm-${l.metal}${l.pop ? ' pop' : ''} rv" id="lv-${l.id}" style="--d:${i * 0.05}s">
<div class="lv-a"><div class="lv-head"><span class="lv-no">${l === TOP ? 'Top level' : `Level ${l.n}`} · <b>${l.metalName}</b></span>${meter(l.n)}</div>
<h3>${l.title}</h3>
<div class="lv-comes"><span>Comes with</span><b>${l.comes}</b></div>
<span class="tag${l.live ? '' : ' tag-plain'}" style="--c:var(--go)">${l.status}</span>${l.pop ? '<span class="tag pop-tag">Most picked</span>' : ''}</div>
<div class="lv-b">${l === TOP ? `<p>${l.text}</p>` : `<ul>${l.items.map((x) => `<li>${TICK}<span>${x}</span></li>`).join('')}</ul>`}${l.alt ? `<p class="alt">${l.alt}</p>` : ''}${l.why ? `<p class="why">${l.why}</p>` : ''}</div>
<div class="lv-c">${pill(l, { brand: false, site: 'myapp.com' })}${shield(l)}</div>
</article>`;
function badgeLevels() {
  return `${METALS()}<div class="ladder">${[...LEVELS, TOP].map(levelRow).join('')}</div><p class="muted badge-free-note">Badges are never sold on their own. Each one comes with the plan or review above it, and moves up when you do.</p>`;
}
const BADGE_ROWS = [
  ['A unique ID that links back to its record on sigship.dev', [1, 1, 1, 1, 1]], ['You ran the 17 core checks', [1, 1, 1, 1, 1]], ['Pro pack checks', [0, 1, 1, 1, 1]], ['SIGSHIP re-runs the check itself', [0, 0, 'Nightly', 'Every change', 'At review']],
  ['Date drawn on the badge', [0, 0, 1, 1, 'Review date']], ['Turns off by itself on a failed check', [0, 0, 1, 1, 0]], ['Clean-days streak', [0, 0, 0, 1, 0]],
  ['Your own public page', ['ID record', 'ID record', 'Verification page', 'Page + history', 'Review report']], ['A SIGSHIP expert engineer reviews the code', [0, 0, 0, 0, 1]], ['Signed with name and date', [0, 0, 0, 0, 1]],
];
const badgeTable = () => `<div class="table-wrap"><table class="cmp"><thead><tr><th>What each badge proves</th>${LEVELS.map((l) => `<th><span class="sw m-${l.metal}"></span>${l.title}<small style="display:block;color:var(--muted-foreground);font-weight:400">${l.plans}</small></th>`).join('')}</tr></thead><tbody>${BADGE_ROWS.map(([name, v]) => `<tr><td>${name}</td>${v.map((x) => `<td>${x === 1 ? '<span class="check">✓</span>' : x === 0 ? '<span class="no">—</span>' : esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

const homeDescription = `Free, open source launch check for apps built with Lovable, Cursor, Bolt, Replit and Claude Code. Finds leaked keys, open databases and fake payments, in plain words, with a fix for your AI. Watch the 60-second film. Powered by zoof04.`;
write('', page({
  title: 'SIGSHIP — Is your AI-built app safe to launch?',
  description: homeDescription,
  path: '/',
  body: home(),
  trail: [['Home', '/']],
  ld: [ORG, { '@type': 'WebSite', '@id': `${ORIGIN}/#site`, name: 'SIGSHIP', url: `${ORIGIN}/`, publisher: { '@id': `${ORIGIN}/#org` }, inLanguage: 'en' }, appLd({ version: VERSION, description: homeDescription }), { '@type': 'VideoObject', '@id': `${ORIGIN}/#film`, name: FILM.title, description: FILM.description, thumbnailUrl: [`${ORIGIN}${FILM.poster}`], uploadDate: FILM.uploadDate, duration: FILM.duration, embedUrl: `https://player.vimeo.com/video/${FILM.vimeoId}`, contentUrl: `https://vimeo.com/${FILM.vimeoId}`, publisher: { '@id': `${ORIGIN}/#org` }, inLanguage: 'en', isFamilyFriendly: true }],
}));

// ---------- Checks ----------
const CHECKS_PATH = '/checks/';
const checksBody = pageHero({ eyebrow: `The ${RULES.length} checks`, color: 'amber', title: 'Every mistake we look for, in plain words.', sub: 'Hover any card to see the fix. Switch on Dev mode in the menu to see rule IDs and severity codes.' }) + section(`<div class="levels-row">${Object.values(LEVEL).map((l, i) => `<div class="card card-sm" style="--c:var(--${l.c})"><b>${l.label}</b><div>${["Don't launch until this is fixed.", 'Fix this before you grow.', 'Good habit, low risk.'][i]} <span class="mono" style="font-size:.75rem">(${l.dev})</span></div></div>`).join('')}</div>${checksGrid()}`, 'sec-tight');
write('checks', page({ title: `The ${RULES.length} checks — SIGSHIP`, description: `Every mistake SIGSHIP looks for in AI-built apps: leaked keys, open Supabase tables, fake payments, runaway AI bills and more, explained in plain words with the fix.`, path: CHECKS_PATH, body: checksBody }));
write('features', page({ title: `The ${RULES.length} checks — SIGSHIP`, description: 'Every mistake SIGSHIP looks for in AI-built apps, in plain words with the fix.', path: '/features/', canonical: CHECKS_PATH, noindex: true, body: checksBody }));

RULES.forEach((r, i) => {
  const prev = RULES[(i - 1 + RULES.length) % RULES.length], next = RULES[(i + 1) % RULES.length];
  const x = CHECK_EXTRA[r.id];
  if (!x) throw new Error(`scripts/seo.js has no plain explanation for ${r.id}.`);
  const c = CHECKS[i], g = GROUPS[c.group];
  const path = `/checks/${r.id}/`;
  const trail = [['Home', '/'], ['The 17 checks', CHECKS_PATH], [r.title, path]];
  const prompt = `Fix this problem in my project: ${r.title}. ${r.fix} Change only what this fix needs, then tell me what you changed and anything I have to do myself.`;
  write(`checks/${r.id}`, page({
    title: `${x.seoTitle} — SIGSHIP`,
    description: clip(`${x.plain} What happens if you ship it, and the fix.`),
    path, trail, ogType: 'article',
    ld: [{ '@type': 'TechArticle', headline: x.seoTitle, description: x.plain, url: `${ORIGIN}${path}`, inLanguage: 'en', datePublished: PUBLISHED, dateModified: LASTMOD, author: { '@id': `${ORIGIN}/#org` }, publisher: ORG, about: r.title, proficiencyLevel: 'Beginner' }],
    body: pageHero({ eyebrow: `${g.emoji} ${g.label} · ${c.level.label} (${c.level.dev})`, color: g.color, title: r.title, sub: `<b>In plain English:</b> ${esc(x.plain)}`, trail }) + section(`<div class="prose">
<h2>What happens if you ship it</h2><p>${esc(r.forecast)}</p>
<h2>How to fix it <span class="tag tag-plain">technical</span></h2><div class="callout">${esc(r.fix)}</div>
<h2>Let your AI tool fix it</h2><p>Paste this into Lovable, Bolt, Cursor, Replit or Claude Code:</p>${codeCopy(prompt, 'Prompt for your AI tool')}
<h2>Check your app</h2><p>Run <code>npx sigship</code> in your project folder. It reports this problem as <code>${r.id}</code>, along with ${RULES.length - 1} other checks. Nothing leaves your computer. <a href="/resources/">New to the terminal?</a></p>
<h2>Questions</h2></div><div class="faq" style="max-width:46rem">${x.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
<nav class="pager" aria-label="More checks"><a href="/checks/${prev.id}/"><span>Previous</span>${esc(prev.title)}</a><a href="/checks/${next.id}/"><span>Next</span>${esc(next.title)}</a></nav>
<p style="margin-top:24px"><a href="${CHECKS_PATH}" style="color:var(--sky)">See every check</a> · <a href="/glossary/" style="color:var(--sky)">Jargon, explained</a></p>`, 'sec-tight'),
  }));
});

// ---------- Cloud, badge, API ----------
const waitlist = (plan, placeholder = 'you@startup.com', action = '/api/waitlist') => `<form class="wl-form" method="post" action="${action}" data-waitlist novalidate><input type="email" name="email" placeholder="${placeholder}" autocomplete="email" inputmode="email" required aria-label="Email"><input type="hidden" name="plan" value="${plan}"><input type="hidden" name="started" value=""><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn btn-primary" type="submit">Join waitlist</button><p class="wl-err" hidden></p></form><div class="wl-ok" hidden tabindex="-1">You're on the list 🎉 We'll email you once, when Cloud opens.</div>`;
write('cloud', page({
  title: 'SIGSHIP Cloud — SIGSHIP', description: 'Nightly checks of your live apps, a simple dashboard, alerts and a Verified badge. Coming soon: join the waitlist.', path: '/cloud/',
  body: pageHero({ eyebrow: 'SIGSHIP Cloud · coming soon', color: 'sky', title: 'Set it once. We watch every night.', sub: 'Connect your apps, see one simple score, and get a ping the moment something needs fixing.', extra: waitlist('cloud') }) + `<div class="wrap">${dashboard()}</div>` + section(`<div class="grid-3">${[['🌙', 'Nightly checks', 'Every app, every night, automatically.'], ['🔔', 'Instant alerts', 'Email or Slack the moment something breaks.'], ['✅', 'Live badge', 'Shows the last pass — switches off if it fails.']].map(([e, t, d]) => `<div class="card"><div style="font-size:1.875rem">${e}</div><h3 style="margin-top:16px">${t}</h3><p class="sub">${d}</p></div>`).join('')}</div><p class="muted" style="margin-top:24px;font-size:.875rem">Cloud plans start at ${esc(byId.solo.price)} ${esc(byId.solo.per)}. <a href="/pricing/" style="text-decoration:underline">See the plans</a>. The free check keeps working on your computer either way.</p>`),
}));
const badgeBody = pageHero({ eyebrow: 'Verified badge', color: 'go', title: 'Trust you can show.', sub: 'One badge family, five levels and a top tier, each in a metal people already rank: Steel, Bronze, Silver, Gold, Platinum, then Black platinum. Every level adds a proof the one below can’t give. None of them says “certified”.' })
  + `<div class="wrap">${badgeStage()}<h2 class="display h2" style="margin-top:80px">Each level proves more.</h2><p class="lede" style="margin-top:12px;max-width:44rem">Each badge answers two questions in everyday words: who checked it, and how often. The metal answers the third: how high is this. The bars repeat the level for anyone who can’t tell colours apart.</p>${badgeLevels()}</div>`
  + section(`<h2 class="display" style="font-size:1.875rem">Same footer, every level</h2><p class="muted" style="margin-top:8px">The metal climbs, and the word and the bars climb with it. Every badge ends in its own ID and links to its record. It reads on a light site and a dark one.</p><div class="grid-2" style="margin-top:24px"><div class="badge-demo light">${[...LEVELS, TOP].map((l) => pill(l, { site: 'myapp.com' })).join('')}</div><div class="badge-demo dark">${[...LEVELS, TOP].map((l) => pill(l, { site: 'myapp.com' })).join('')}</div></div>`, 'sec-tight')
  + section(`<h2 class="display" style="font-size:1.875rem;margin-bottom:24px">What each badge actually proves</h2>${badgeTable()}`, 'sec-tight')
  + section(`<h2 class="display" style="font-size:1.875rem" id="embed">Add it to your site</h2><p class="muted" style="margin-top:8px">The <b>Self-checked</b> badge comes with the free check, today. Type your site’s address, copy the code, and paste it into your footer. The badge carries your site’s own ID and links to its record on sigship.dev. The live badges arrive with Cloud and are drawn by sigship.dev.</p>
<div class="embed-card card"><label for="embed-site">Your site</label><input id="embed-site" data-embed-site value="myapp.com" maxlength="80" autocomplete="off" spellcheck="false" inputmode="url">
<div class="embed-preview"><a data-embed-link href="/verify/?id=${badgeId('S', 'myapp.com')}&amp;site=myapp.com"><img data-embed-img src="/b/${badgeId('S', 'myapp.com')}.svg" height="32" alt="Self-checked with SIGSHIP, badge ${badgeId('S', 'myapp.com')}"></a><span class="muted">Badge ID <b class="mono" data-embed-id>${badgeId('S', 'myapp.com')}</b></span></div>
<div class="code"><div class="code-t code-row"><span>Paste into your site</span><button class="copy-btn" type="button" data-embed-copy data-copy=""><span class="copy-label">copy</span></button></div><pre><code data-embed-code></code></pre></div></div>
<p class="muted" style="margin-top:24px;font-size:.875rem">Anyone can open a badge’s record at <a href="/verify/" style="text-decoration:underline">sigship.dev/verify</a> and see what it means and who checked. A badge means the owner checked before launching, or that SIGSHIP or an expert did, as the level says. It isn’t a security certificate, and the record says so. What an expert review covers is written down in the <a href="/expert-review/protocol/" style="text-decoration:underline">review protocol</a>, and the <a href="/incident-rule/" style="text-decoration:underline">incident rule</a> says what happens if a badge fails you.</p>`);
write('badge', page({ title: 'Verified badge — SIGSHIP', description: 'Show customers your app was checked. A SIGSHIP badge for apps that pass the free check today, and a live nightly badge with Cloud.', path: '/badge/', body: badgeBody }));
write('flags', page({ title: 'Verified badge — SIGSHIP', description: 'Show customers your app was checked.', path: '/flags/', canonical: '/badge/', noindex: true, body: badgeBody }));

// ---------- Badge records: every badge's ID links here ----------
const CHECKED_ON = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const recRow = (k, v) => `<div class="rec-row"><dt>${k}</dt><dd>${v}</dd></div>`;
const verifyBody = pageHero({ eyebrow: 'Badge record', color: 'go', title: 'Check a SIGSHIP badge.', sub: 'Every SIGSHIP badge carries its own ID and links here. This page shows what the badge means, who checked, and whether the ID belongs to the site showing it.' })
  + section(`<div class="verify-app" data-own-id="${OWN_ID}" data-own-site="${OWN_SITE}">
<div class="rec card" data-rec aria-live="polite">
  <div class="rec-top"><span class="tag" style="--c:var(--go)" data-rec-state>Genuine · issued by SIGSHIP</span><span class="mono muted" data-rec-id>${OWN_ID}</span></div>
  <div class="rec-badge" data-rec-badge>${pill(OWN_LEVEL, { site: OWN_SITE })}</div>
  <h2 class="display" data-rec-title>${OWN_SITE} holds the Live-checked badge</h2>
  <dl class="rec-list" data-rec-list>
    ${recRow('Site', `<a href="https://${OWN_SITE}/">${OWN_SITE}</a>`)}
    ${recRow('Level', `${OWN_LEVEL.metalName} · ${OWN_LEVEL.title}`)}
    ${recRow('Live-checked', 'The SIGSHIP check runs on every change to this site. A deploy can’t go out unless the check passes, and every push to GitHub runs it again.')}
    ${recRow('Not expert-reviewed', `No outside engineer has signed a review of this site yet, so it does not carry the Expert-reviewed badge. The <a href="/expert-review/protocol/">review protocol</a> says what one would cover.`)}
    ${recRow('Last check', `GO with sigship ${VERSION}, ${CHECKED_ON}`)}
  </dl>
  <p class="rec-note">A GO means these checks found nothing that blocks launch. It does not prove the app is safe.</p>
</div>
<form class="rec-form card" action="/verify/" method="get"><h3>Check another badge</h3><p class="muted">Enter the ID printed on the badge and the site that shows it.</p>
  <label for="v-id">Badge ID</label><input id="v-id" name="id" placeholder="SG-S-4K7Q2M" maxlength="11" autocomplete="off" spellcheck="false" style="text-transform:uppercase">
  <label for="v-site">Site</label><input id="v-site" name="site" placeholder="myapp.com" maxlength="80" autocomplete="off" spellcheck="false" inputmode="url">
  <button class="btn btn-primary" type="submit">Check badge</button></form>
</div>`, 'sec-tight');
write('verify', page({ title: 'Check a badge — SIGSHIP', description: 'Every SIGSHIP badge has its own ID. Look one up to see what it means, who checked, and whether it belongs to the site showing it.', path: '/verify/', body: verifyBody }));

const ENDPOINTS = [['POST', '/v1/scans', 'Start a check for an app'], ['GET', '/v1/scans/{id}', "Get a check's result"], ['GET', '/v1/apps', 'List your connected apps'], ['GET', '/v1/apps/{id}/badge', 'Badge status and last pass date'], ['POST', '/v1/webhooks', 'Get notified when a check fails']];
const SAMPLES = [['curl', 'curl https://api.sigship.dev/v1/scans \\\n  -H "Authorization: Bearer $SIGSHIP_KEY" \\\n  -d \'{ "app": "plantpal.app" }\''], ['JavaScript', 'const res = await fetch("https://api.sigship.dev/v1/scans", {\n  method: "POST",\n  headers: { Authorization: `Bearer ${process.env.SIGSHIP_KEY}` },\n  body: JSON.stringify({ app: "plantpal.app" }),\n});\nconst scan = await res.json(); // { id, verdict: "GO" | "NO-GO", findings }'], ['Python', 'import os, requests\nr = requests.post(\n  "https://api.sigship.dev/v1/scans",\n  headers={"Authorization": f"Bearer {os.environ[\'SIGSHIP_KEY\']}"},\n  json={"app": "plantpal.app"},\n)\nprint(r.json()["verdict"])']];
write('api', page({
  title: 'Cloud API (preview) — SIGSHIP', description: 'Connect SIGSHIP Cloud to your tools: start checks, read results and badge status over a simple REST API. A preview of what Cloud will offer.', path: '/api/',
  body: pageHero({ eyebrow: 'Cloud API · preview', color: 'teal', title: 'Connect SIGSHIP to anything.', sub: 'Start checks, read results and badge status from your own tools. Preview — the API ships with Cloud, and endpoints may change before launch.' }) + section(`<div class="grid-2" style="gap:32px"><div><h2 class="display" style="font-size:1.5rem">Endpoints</h2><div class="endpoints">${ENDPOINTS.map(([m, p, d]) => `<div style="--c:var(--${m === 'GET' ? 'teal' : 'violet'})"><span class="m">${m}</span><span class="p">${p}</span><span class="dd">${d}</span></div>`).join('')}</div><h3 style="margin-top:32px;font-weight:600">Authentication</h3><p class="muted" style="margin-top:8px;font-size:.875rem">Create a key in your Cloud dashboard and send it as a Bearer token. Keep it on your server — SIGSHIP would flag it otherwise.</p></div>
<div><div class="lang-tabs" role="tablist" aria-label="Language">${SAMPLES.map(([l], i) => `<button type="button" role="tab" id="lt-${l}" aria-controls="lp-${l}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${l}</button>`).join('')}</div>${SAMPLES.map(([l, s], i) => `<div role="tabpanel" id="lp-${l}" aria-labelledby="lt-${l}"${i ? ' hidden' : ''}>${code(s, 'Start a check')}</div>`).join('')}<div style="margin-top:16px">${code('{\n  "id": "scn_8f2a",\n  "verdict": "NO-GO",\n  "findings": [\n    { "id": "rls-missing", "level": "fix_now", "file": "001_init.sql" }\n  ]\n}', 'Response')}</div></div></div>`),
}));

// ---------- Lookout ----------
const noticeFull = (n) => { const [label, c] = STATUS_UI[n.status]; const src = (n.sources || []).map((s) => (Array.isArray(s) ? { href: s[0], label: s[1] } : s)); return `<details class="card" id="${n.slug}" style="scroll-margin-top:110px"><summary style="cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:12px"><span class="dt mono muted" style="font-size:.75rem;width:96px">${esc(fmtDate(n))}</span><span class="tg pill" style="padding:2px 10px">${esc(STACKS[n.stack[0]] || n.stack[0])}</span><span style="flex:1 1 16rem;font-weight:500">${T(esc(n.title.plain), esc(n.title.dev))}</span><span class="st" style="font-size:.75rem;font-weight:600;color:var(--${c})">${label}</span></summary>
<div class="prose" style="margin-top:16px"><p>${T(esc(n.summary?.plain || n.short?.plain || ''), esc(n.summary?.dev || n.short?.dev || ''))}</p>${n.affects?.length ? `<p class="muted"><b>Affects:</b> ${n.affects.map(esc).join(' · ')}</p>` : ''}${n.spotted ? `<p class="muted" style="font-size:.875rem">Spotted by ${esc(n.spotted)}${n.cve ? ` · <code>${esc(n.cve)}</code>` : ''}</p>` : ''}${src.length ? `<p class="muted" style="font-size:.875rem"><b>Sources:</b> ${src.map((s) => `<a href="${esc(s.href || s.url)}" target="_blank" rel="noopener">${esc(s.label || s.title || s.href)}</a>`).join(' · ')}</p>` : ''}</div></details>`; };
write('lookout', page({
  title: 'Lookout — SIGSHIP', description: 'SIGSHIP watches for new attacks on AI-built apps and turns them into new checks. Every notice has a source and says what SIGSHIP does about it.', path: '/lookout/',
  body: pageHero({ eyebrow: 'Lookout · always watching', color: 'coral', title: "We stay ahead so you don't have to.", sub: 'Attackers find new tricks every week. SIGSHIP keeps learning: each new threat becomes a new check, and your next run catches it automatically.' }) + section(pipeline(), 'sec-tight') + section(`<h2 class="display" style="font-size:1.875rem;margin-bottom:24px">The watch list</h2><div style="display:grid;gap:8px">${NOTICES.map(noticeFull).join('')}</div><p class="muted" style="margin-top:24px;font-size:.875rem">Spotted something we should watch? <a href="${GH}/issues" style="color:var(--coral)">Tell us on GitHub →</a></p><div class="card" style="margin-top:40px"><h3>The Monday notice, by email</h3><p class="sub" style="margin-bottom:16px">One short email a week when there is something new. No marketing.</p>${waitlist('lookout', 'you@example.com', '/api/lookout').replace("You're on the list 🎉 We'll email you once, when Cloud opens.", "You're on the list. The next notice lands on a Monday.")}</div>`, 'sec-tight'),
}));
writeFileSync(join(site, 'lookout/feed.json'), feedJson(ORIGIN));
writeFileSync(join(site, 'lookout/rss.xml'), rssXml(ORIGIN));

// ---------- Pricing ----------
const PLAN_ORDER = ['free', 'pro', 'business', 'solo', 'team', 'agency'];
const cell = (v) => (v === true ? '<span class="check">✓</span>' : v === false ? '<span class="no">—</span>' : esc(v));
write('pricing', page({
  title: 'Pricing — SIGSHIP', description: 'SIGSHIP is free forever on your computer. Self-hosted Pro and Business, and SIGSHIP Cloud plans, are on the waitlist with early pricing.', path: '/pricing/',
  body: pageHero({ eyebrow: 'Pricing', color: 'amber', title: CHECKOUT.pro ? 'Free today. Pro and Business on sale.' : 'Free today. Bigger powers soon.', sub: `${CHECKOUT.pro ? 'Cloud prices are early estimates and may change before launch.' : 'Prices for paid plans are early estimates and may change before launch.'} Every paid feature says whether it is built today or the month it rolls out by. The free check is open source and stays free.` })
    + section(`${pricingTabs('pp')}
<div class="card" style="margin-top:24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px"><div><h3>Expert review · from $499</h3><p class="sub">A SIGSHIP expert engineer reads your code by hand against the <a href="/expert-review/protocol/" style="text-decoration:underline">review protocol</a> and sends a ranked, written review within 48 hours, with a 30-minute call. Available now, three a week.</p></div><a class="btn btn-ghost" href="mailto:support@sigship.dev?subject=SIGSHIP%20expert%20review">Request an expert review</a></div>`, 'sec-tight')
    + section(`<div class="table-wrap"><table class="cmp"><thead><tr><th>Feature</th>${PLAN_ORDER.map((id) => `<th>${esc(byId[id].name)}</th>`).join('')}</tr></thead><tbody>${FEATURES.map((g) => `<tr class="grp"><td colspan="7">${esc(g.group)}</td></tr>${g.rows.map(([name, help, cells, st]) => `<tr><td>${esc(name)}${typeof st === 'string' ? stTag(st) : ''}<small>${esc(help)}</small></td>${cells.map((v, i) => `<td>${cell(v)}${Array.isArray(st) && v !== false ? stTag(st[i]) : ''}</td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div>${STATUS_KEY}`, 'sec-tight')
    + section(`<h2 class="display" style="font-size:1.875rem;margin-bottom:24px">Questions</h2><div class="faq">${[['Is the free version really free?', "Yes. It's open source (MIT) and runs on your computer. No account, no limits on projects, no card."], ['Do you upload my code?', 'Never in the free version: it makes no network calls at all. With a licence key it sends only the key and a one-way repo fingerprint. Cloud will read only the apps you connect, in an isolated runner, and you can disconnect any time.'], ["Does a 'Ready' mean my app is 100% safe?", `No tool can promise that. It means our ${RULES.length} checks found nothing blocking launch. It does not prove the app is safe.`], ['What does one-time mean?', 'Pay once and use it for as long as you like. The price includes a year of new checks. After that you can renew, or keep the version you have.'], ['When do paid plans open?', CHECKOUT.pro ? 'Pro and Business are on sale now. Cloud plans are on the waitlist: join it and we email you once, when your plan opens.' : "Soon. Join the waitlist and we'll email you once, when your plan opens, with launch pricing."], ['What do the dates next to features mean?', `“At launch” means the feature is built and in use today. “By December”, “By January” or “By February” means it is being built and rolls out by then. ${REFUND_LINE}`], ["What if it isn't right for me?", `Ask within 14 days of your first payment for a full refund. ${REFUND_LINE}`]].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`, 'sec-tight'),
}));

// ---------- Waitlist ----------
const WL_PLANS = [['pro', 'Pro', byId.pro.price + ' one-time', 'self-hosted'], ['business', 'Business', byId.business.price + ' one-time', 'self-hosted'], ['solo', 'Solo', byId.solo.price + ' a month', 'cloud'], ['team', 'Team', byId.team.price + ' a month', 'cloud'], ['agency', 'Agency', byId.agency.price + ' a month', 'cloud']];
write('waitlist', page({
  title: 'Join the waitlist — SIGSHIP', description: 'Paid SIGSHIP plans open soon. Pick a plan, leave your email, and get one message when it opens. Early birds get 50% off self-hosted plans on Cyber Monday.', path: '/waitlist/',
  body: pageHero({ eyebrow: 'Waitlist · early birds', color: 'amber', title: 'Lock in the early-bird price.', sub: 'Paid plans open soon. Tell us which one you want and we email you once, when it opens. <b>Early birds get 50% off self-hosted plans on Cyber Monday, 30 November.</b> No spam, and you can leave any time.' })
    + section(`<form class="card wl-page" method="post" action="/api/waitlist" data-waitlist novalidate>
<fieldset class="plan-pick"><legend>Which plan?</legend>${WL_PLANS.map(([id, name, price, kind], i) => `<label class="pick"><input type="radio" name="plan" value="${id}"${i === 0 ? ' checked' : ''}><span><b>${name}</b><small>${esc(price)} · ${kind}</small></span></label>`).join('')}</fieldset>
<label class="wl-label" for="wl-email">Your email</label>
<div class="wl-form" style="max-width:none"><input id="wl-email" type="email" name="email" placeholder="you@startup.com" autocomplete="email" inputmode="email" required><input type="hidden" name="started" value=""><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn btn-primary" type="submit">Join the waitlist</button></div>
<p class="wl-err" hidden></p>
<p class="muted" style="margin-top:16px;font-size:.85rem">One email when your plan opens, with the early-bird price. Prices shown are early estimates. <a href="/privacy/" style="text-decoration:underline">Privacy</a>.</p>
</form><div class="wl-ok card" hidden tabindex="-1">You're on the list 🎉 We'll email you once, when your plan opens, with the early-bird price.</div>
<div class="grid-3" style="margin-top:40px">${[['🖥️', 'Self-hosted', 'Pro and Business run on your computer and in your own GitHub. Pay once, keep it, and get a year of new checks.'], ['☁️', 'Cloud', 'Solo, Team and Agency check your live apps every night and keep a Verified badge up to date.'], ['🎟️', 'Early birds', '50% off self-hosted plans for everyone on the waitlist when they open on Cyber Monday.']].map(([e, t, d]) => `<div class="card"><div style="font-size:1.75rem">${e}</div><h3 style="margin-top:12px">${t}</h3><p class="sub">${d}</p></div>`).join('')}</div>`, 'sec-tight'),
}));

// ---------- Docs ----------
const DOCS = [
  ['install', 'Install', `You need Node.js ${NODE_MIN} or newer. No install step — run it with npx in your project folder.`, 'npx sigship'],
  ['commands', 'Commands', "The main ones you'll use.", `npx sigship            # run all ${RULES.length} checks\nnpx sigship --prompt   # one fix brief for your AI\nnpx sigship init       # add the GitHub check + AGENTS.md rule\nnpx sigship mcp        # start the MCP server\nnpx sigship ui         # private local dashboard`],
  ['flags', 'Flags', 'Shape the output for humans, CI or agents.', '--json       machine-readable output\n--markdown   report for a pull request comment\n--prompt     paste-ready fix brief\n--strict     also fail on Nice-to-fix (SEV-3)\n--report     write sigship-report.html (licence key)\n--no-open    with ui: print the link, no browser'],
  ['exit', 'Exit codes', 'Your CI and agents can trust these.', '0  GO      nothing blocks launch\n1  NO-GO   at least one Fix now / Fix soon\n2  ERROR   the check could not run'],
  ['github', 'GitHub check', 'npx sigship init adds this workflow. It checks every pull request and blocks merges that bring a serious problem back. It never overwrites a file you already have.', '# .github/workflows/sigship.yml\nname: sigship\non: [pull_request]\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n      - run: npx --yes sigship@latest'],
  ['agents', 'AI agents', 'The MCP server gives your coding agent two tools: sigship_check and sigship_explain. Setup for each tool is on the AI agents page.', 'claude mcp add sigship -- npx -y sigship mcp'],
  ['key', 'Licence key', `${CHECKOUT.pro ? 'A Pro or Business purchase gives you a licence key.' : 'Paid plans are on the waitlist.'} Set it to add the Pro pack of extra checks and the client report. A network problem never fails a scan.`, 'SIGSHIP_KEY=your-key npx sigship'],
  ['privacy', 'Privacy and limits', 'The free tool, the dashboard and the MCP server run on your machine with no network calls and never print a secret value. SIGSHIP reads your code, so it can’t see settings changed only in a dashboard, and a GO is not a security audit.', 'npx sigship ui   # dashboard on 127.0.0.1 only'],
];
write('docs', page({
  title: 'Docs — SIGSHIP', description: 'Install SIGSHIP, learn the commands, flags and exit codes, and wire it into GitHub and your AI agent. Everything on one page.', path: '/docs/',
  body: pageHero({ eyebrow: 'Docs', color: 'sky', title: 'Everything in one page.', sub: 'From your first check to a fully automated pipeline. Never used a terminal? Start with the <a href="/resources/" style="color:var(--sky);text-decoration:underline">4-step guide</a>.' }) + `<div class="docs-grid"><aside class="docs-side">${DOCS.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}<a href="/glossary/">Jargon, explained</a></aside><div class="docs-main">${DOCS.map(([id, t, p, c]) => `<section id="${id}"><h2 class="display">${t}</h2><p class="p">${p}</p>${codeCopy(c)}</section>`).join('')}</div></div>`,
}));

// ---------- Agents ----------
// One-click installs: the Cursor deeplink and the VS Code link carry the MCP server config; Claude Code installs the plugin.
const MCP_CONFIG = { command: 'npx', args: ['-y', 'sigship', 'mcp'] };
const CURSOR_INSTALL = `cursor://anysphere.cursor-deeplink/mcp/install?name=sigship&config=${Buffer.from(JSON.stringify(MCP_CONFIG)).toString('base64')}`;
const VSCODE_INSTALL = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'sigship', ...MCP_CONFIG }))}`;
const CLAUDE_PLUGIN = '/plugin marketplace add sigship/sigship\n/plugin install sigship@sigship';
const installButtons = () => `<div class="install-row">
<a class="btn btn-primary" href="${esc(CURSOR_INSTALL)}">${brandIcon('cursor', 16)} Add to Cursor</a>
<a class="btn btn-ghost" href="${esc(VSCODE_INSTALL)}">${brandIcon('copilot', 16)} Add to VS Code</a>
<button class="btn btn-ghost" type="button" data-copy="${esc(CLAUDE_PLUGIN)}">${brandIcon('claude', 16)} <span class="copy-label">Copy the Claude Code commands</span></button>
</div>
<p class="fine" style="margin-top:12px">The Cursor and VS Code buttons open the editor with SIGSHIP’s MCP server ready to add. In Claude Code, paste the two commands: <code>/plugin marketplace add sigship/sigship</code>, then <code>/plugin install sigship@sigship</code>.</p>`;
const agentsBody = pageHero({ eyebrow: 'AI agents', color: 'violet', title: 'Your AI checks its own work.', sub: 'SIGSHIP speaks MCP, the standard way AI coding tools connect to helpers. Add it once and your agent won’t say “done” until the check says Ready.', extra: installButtons() })
  + section(`<div class="grid-2" style="align-items:center;gap:40px">${orbit()}<div style="display:grid;gap:16px">${[['sigship_check', `Runs all ${RULES.length} checks and returns what to fix.`], ['sigship_explain', 'Explains one finding in plain words with a fix.']].map(([t, d]) => `<div class="card card-sm"><div class="mono" style="color:var(--violet);font-size:.875rem">${t}</div><div class="sub">${d}</div></div>`).join('')}${code('## Definition of done\n\nBefore saying work is finished, run `npx sigship`.\nIf it is not GO, fix what it reports and run it again. Only say the work is done after it exits 0.', 'AGENTS.md rule (added by npx sigship init)')}</div></div>`, 'sec-tight')
  + section(`<div class="grid-2">${AGENT_SETUP.map(([b, how, cmd], i) => `<div class="card rv" style="--d:${(i % 2) * 0.1}s"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><span style="display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--background)">${brandIcon(b, 22)}</span><div><div style="font-weight:600">${BRAND_LABEL[b]}</div><div class="muted" style="font-size:.75rem">${esc(how)}</div></div></div>${codeCopy(cmd)}</div>`).join('')}</div>`, 'sec-tight');
write('agents', page({ title: 'AI agents — SIGSHIP', description: 'Connect SIGSHIP to Claude Code, Cursor, Windsurf, Copilot, Gemini CLI and Codex over MCP, so your agent checks its own work before it says done.', path: '/agents/', body: agentsBody }));
write('ai-agents', page({ title: 'AI agents — SIGSHIP', description: 'Connect SIGSHIP to your AI coding agent over MCP.', path: '/ai-agents/', canonical: '/agents/', noindex: true, body: agentsBody }));

// ---------- Changelog and releases, from CHANGELOG.md ----------
const releases = readFileSync(join(root, 'CHANGELOG.md'), 'utf8').split(/^## /m).slice(1).map((chunk) => {
  const [head, ...rest] = chunk.split('\n');
  const [version, date] = head.split(/\s+—\s+/);
  const groups = rest.join('\n').split(/^### /m).slice(1).map((g) => { const [name, ...lines] = g.split('\n'); return { name: name.trim(), items: lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)) }; });
  return { version: version.trim(), date: (date || '').trim(), groups };
});
const pretty = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
write('changelog', page({
  title: 'Changelog — SIGSHIP', description: 'Every change to SIGSHIP, dated and explained: new checks, the browser dashboard, licence keys, MCP support and more.', path: '/changelog/',
  body: pageHero({ eyebrow: 'Changelog', color: 'lime', title: "What's new.", sub: 'Small, steady improvements. Every change, dated.' }) + section(`<div class="timeline">${releases.map((r, i) => `<div class="item rv" style="--d:${i * 0.05}s" id="v${r.version.replace(/\./g, '-')}"><div class="dt">${pretty(r.date)} · v${r.version}</div><h2>${i === 0 ? 'Latest · ' : ''}${esc(r.groups[0]?.items[0]?.split(/[:.]/)[0] || `Version ${r.version}`)}</h2>${r.groups.map((g) => `<h3>${esc(g.name)}</h3><ul>${g.items.map((it) => `<li>— ${inline(it)}</li>`).join('')}</ul>`).join('')}</div>`).join('')}</div>`, 'sec-tight'),
}));
write('releases', page({
  title: 'Releases — SIGSHIP', description: 'SIGSHIP versions, what each brought, and where to get them on npm and GitHub.', path: '/releases/',
  body: pageHero({ eyebrow: 'Releases', color: 'sky', title: 'Versions.', sub: 'Get the latest from npm, or browse the source on GitHub.', extra: copyPill('npx sigship@latest') }) + section(`<div class="grid-2">${releases.map((r, i) => `<div class="card rel-card${i === 0 ? ' spectrum-border' : ''}"${i === 0 ? ' style="border-color:transparent"' : ''}><div class="row"><span class="v">v${r.version}</span>${i === 0 ? '<span class="tag" style="--c:var(--go)">Latest</span>' : ''}</div><div class="sub">${pretty(r.date)} · ${esc(r.groups[0]?.items[0]?.split(/[:.]/)[0] || '')}</div><div class="acts2"><a href="${NPM}/v/${r.version}">${brandIcon('npm', 14)} npm</a><a href="${GH}/releases/tag/v${r.version}">${brandIcon('github', 14, true)} Notes</a><a href="/changelog/#v${r.version.replace(/\./g, '-')}">Changelog</a></div></div>`).join('')}</div>`, 'sec-tight'),
}));

// ---------- Resources (4 steps), guides, glossary ----------
const GUIDE_LINKS = [['lovable', 'Check a Lovable app', '/guides/check-lovable-bolt-replit-app/'], ['bolt', 'Check a Bolt app', '/guides/check-lovable-bolt-replit-app/'], ['cursor', 'Check a Cursor project', '/docs/'], ['replit', 'Check a Replit app', '/guides/check-lovable-bolt-replit-app/'], ['supabase', 'Lock down Supabase tables', '/guides/supabase-rls-explained/'], ['stripe', 'Secure Stripe payments', '/checks/stripe-webhook-unverified/']];
write('resources', page({
  title: 'Resources — SIGSHIP', description: 'Step-by-step guides to check apps built with Lovable, Bolt, Cursor and Replit before launch, even if you have never used a terminal.', path: '/resources/',
  body: pageHero({ eyebrow: 'Resources', color: 'pink', title: 'Check your app in 4 steps.', sub: 'Never used a terminal? No problem. This takes about two minutes.' }) + section(`<div class="grid-2 steps-grid">${[['Get your code', "In Lovable or Bolt, connect GitHub and download your project. In Cursor or Replit, it's already on your computer."], ['Open a terminal in that folder', "On Mac: right-click the folder → New Terminal at Folder. On Windows: type cmd in the folder's address bar."], ['Run the check', 'Paste the line below and press Enter. It takes a second.', 'npx sigship'], ['Paste the fixes into your AI', "Run it with --prompt, copy everything, paste it into your AI tool's chat. Check again until it says Ready.", 'npx sigship --prompt']].map(([t, d, c], i) => `<div class="card rv" style="--d:${i * 0.08}s"><div class="n">${i + 1}</div><h3>${t}</h3><p class="sub">${d}</p>${c ? `<div style="margin-top:16px">${codeCopy(c)}</div>` : ''}</div>`).join('')}</div>`, 'sec-tight') + section(`<h2 class="display" style="font-size:1.875rem;margin-bottom:24px">Guides</h2><div class="grid-3" style="gap:12px">${GUIDE_LINKS.map(([b, t, href]) => `<a class="guide-row" href="${href}">${brandIcon(b, 28)}<b>${t}</b><span class="ar">→</span></a>`).join('')}${GUIDES.map((g) => `<a class="guide-row" href="/guides/${g.slug}/">📘<b>${esc(g.short)}</b><span class="ar">→</span></a>`).join('')}</div>`, 'sec-tight'),
}));
write('guides', page({
  title: 'Guides — SIGSHIP', description: 'Plain-English guides for people building apps with Lovable, Bolt, Cursor, Replit and v0: a pre-launch security checklist, Supabase RLS, leaked API keys and more.', path: '/guides/',
  ld: [{ '@type': 'CollectionPage', name: 'SIGSHIP guides', url: `${ORIGIN}/guides/`, hasPart: GUIDES.map((g) => ({ '@type': 'Article', headline: g.title, url: `${ORIGIN}/guides/${g.slug}/` })) }],
  body: pageHero({ eyebrow: 'Guides', color: 'pink', title: 'Launch your AI-built app without the scary surprises.', sub: "Short, plain-English guides for builders who aren't security experts." }) + section(`<div class="grid-2">${GUIDES.map((g) => `<a class="card rv" href="/guides/${g.slug}/"><span class="tag tag-plain">Guide</span><h3 style="margin-top:16px">${esc(g.short)}</h3><p class="sub">${esc(g.description)}</p><span style="display:block;margin-top:16px;color:var(--sky);font-size:.875rem">Read the guide →</span></a>`).join('')}<a class="card rv" href="/glossary/"><span class="tag tag-plain">Glossary</span><h3 style="margin-top:16px">Jargon, explained</h3><p class="sub">API keys, RLS, webhooks, CORS, MCP and more, each in one or two plain sentences.</p><span style="display:block;margin-top:16px;color:var(--sky);font-size:.875rem">Open the glossary →</span></a></div>`, 'sec-tight'),
}));
for (const g of GUIDES) {
  const path = `/guides/${g.slug}/`;
  const trail = [['Home', '/'], ['Guides', '/guides/'], [g.short, path]];
  const words = (g.lede + g.body).replace(/<[^>]+>/g, ' ').split(/\s+/).length;
  write(`guides/${g.slug}`, page({
    title: `${g.title} — SIGSHIP`, description: g.description, path, trail, ogType: 'article',
    ld: [{ '@type': 'Article', headline: g.title, description: g.description, url: `${ORIGIN}${path}`, mainEntityOfPage: `${ORIGIN}${path}`, image: `${ORIGIN}/og.png`, inLanguage: 'en', datePublished: PUBLISHED, dateModified: LASTMOD, wordCount: words, author: { '@id': `${ORIGIN}/#org` }, publisher: ORG }],
    body: pageHero({ eyebrow: `Guide · ${Math.max(2, Math.round(words / 220))} min read`, color: 'pink', title: g.title, sub: esc(g.lede), trail }) + section(`<div class="prose">${g.body.replace(/<pre class="cmd-block">/g, '<pre class="code" style="padding:16px">').replace(/<(ol|ul) class="steps">/g, '<$1>')}<h2>Questions</h2></div><div class="faq" style="max-width:46rem">${g.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}<div class="prose"><h2>More guides</h2><ul>${GUIDES.filter((o) => o !== g).map((o) => `<li><a href="/guides/${o.slug}/">${esc(o.short)}</a></li>`).join('')}<li><a href="/glossary/">Jargon, explained</a></li></ul></div>`, 'sec-tight'),
  }));
}
write('glossary', page({
  title: 'Jargon, explained: app security terms in plain English — SIGSHIP', description: 'API keys, environment variables, row level security, webhooks, rate limits, CORS, MCP and more, explained in plain English for people building apps with AI tools.', path: '/glossary/',
  ld: [{ '@type': 'DefinedTermSet', '@id': `${ORIGIN}/glossary/#terms`, name: 'App security terms in plain English', url: `${ORIGIN}/glossary/`, hasDefinedTerm: GLOSSARY.map(([id, term, plain]) => ({ '@type': 'DefinedTerm', name: term, description: plain, url: `${ORIGIN}/glossary/#${id}`, inDefinedTermSet: `${ORIGIN}/glossary/#terms` })) }],
  body: pageHero({ eyebrow: 'Glossary', color: 'teal', title: 'Jargon, explained.', sub: "Building with AI tools means running into words nobody explained. Here's what each one means, in one or two sentences, and where it matters." }) + section(`<nav class="gloss-index" aria-label="Terms">${GLOSSARY.map(([id, term]) => `<a href="#${id}">${esc(term.split(' (')[0])}</a>`).join('')}</nav><dl class="gloss">${GLOSSARY.map(([id, term, plain, link]) => `<div id="${id}"><dt>${esc(term)}</dt><dd>${esc(plain)}${link ? ` <a href="${link}">Learn more</a>` : ''}</dd></div>`).join('')}</dl>`, 'sec-tight'),
}));

// ---------- Open source, community, roadmap ----------
write('open-source', page({
  title: 'Open source — SIGSHIP', description: 'SIGSHIP is MIT licensed and built in public. Zero dependencies, every check a small readable rule. Powered and backed by zoof04.', path: '/open-source/',
  body: pageHero({ eyebrow: 'Open source · MIT', color: 'violet', title: 'Open by default.', sub: 'You should be able to read every line of the tool that checks your code. So you can.', extra: `<a class="btn btn-primary btn-lg" href="${GH}">${brandIcon('github', 16, true)} View on GitHub</a>` }) + section(`<div class="grid-3">${[['Read it', 'Zero dependencies. Every check is a small, readable rule.'], ['Improve it', 'Found a false alarm or a missed mistake? Open an issue or PR.'], ['Use it anywhere', 'MIT license — personal, commercial, client work.']].map(([t, d]) => `<div class="card"><h3>${t}</h3><p class="sub">${d}</p></div>`).join('')}</div>`, 'sec-tight') + section(`<div class="grid-2" style="align-items:center;gap:32px"><div><h2 class="display" style="font-size:1.875rem">Powered and backed by <span class="text-spectrum">zoof04</span></h2><p class="muted" style="margin-top:12px">SIGSHIP is built and maintained by Zoof04 Inc. The core stays free and open forever; Cloud and Pro fund the work.</p></div>${codeCopy(`git clone ${GH}\ncd sigship\nnpm test`, 'Contribute')}</div>`, 'sec-tight'),
}));
write('community', page({
  title: 'Community and help — SIGSHIP', description: 'Get help with SIGSHIP: ask questions on GitHub Discussions or Discord, report a false positive, suggest a new check, or contribute code.', path: '/community/',
  body: pageHero({ eyebrow: 'Community', color: 'pink', title: 'Built in the open, with builders.', sub: 'Ask a question, suggest a check, report something it got wrong, or help build it. Every message is read by the team.', extra: `<a class="btn btn-primary btn-lg" href="${GH}/discussions">Ask a question</a>` }) + section(`<div class="grid-3" style="gap:12px">${[[brandIcon('github', 28, true), 'GitHub', 'The code, releases and issues. Star it to follow along.', GH], [discordIcon(28), 'Discord', 'Chat with other builders and the team behind SIGSHIP.', DISCORD], ['💬', 'Discussions', 'Questions, ideas and show-and-tell.', `${GH}/discussions`], ['🐛', 'Report a false positive', 'It flagged safe code, or missed a real problem? Tell us with the smallest example.', `${GH}/issues/new/choose`], ['🛠️', 'Contribute', 'Add a check or fix a bug. The guide shows how, tests included.', `${GH}/blob/main/CONTRIBUTING.md`], ['🔒', 'Report a security problem', 'Found a problem in SIGSHIP itself? Report it privately.', `${GH}/blob/main/SECURITY.md`], ['✉️', 'Email us', 'support@sigship.dev for anything else, including expert reviews.', 'mailto:support@sigship.dev']].map(([ic, t, d, href]) => `<a class="card rv" href="${href}"><div style="font-size:1.75rem;height:32px;display:flex;align-items:center">${ic}</div><h3 style="margin-top:16px">${t}</h3><p class="sub">${d}</p></a>`).join('')}</div>`, 'sec-tight'),
}));
// The roadmap: the months from the build plan. Self-hosted work carries its month. Cloud has no dates promised as a whole;
// what is promised is each feature's month on the pricing page, with a refund if it misses.
const ROADMAP = [
  ['Shipped', 'go', 'Live now, in the free tool.', releases.slice().reverse().map((r) => `v${r.version} · ${r.groups[0]?.items[0]?.split(/[:.]/)[0] || ''}`)],
  ['By 30 November', 'warn', 'Self-hosted. Being built now.', ['Everything on this site true today or labelled with its month', 'The in-browser check at /check/: nothing uploaded', 'sigship 0.4.0: accepted risks file, SARIF for GitHub code scanning, fix prompts tuned to your tool, a pre-commit hook, secrets in git history, and the opt-in online check for known vulnerable packages', 'Pro and Business on sale through Polar, with licence keys', 'The Deep self-check badge, issued only to licensed sites', 'The Lookout intake run by the system, with the Monday notice sent by it']],
  ['December', 'sky', 'Cloud. Our aim, not a promise.', ['Private beta of SIGSHIP Cloud with the first 20 founders, on a free Checked daily badge', 'Remote MCP, so a coding agent can ask Cloud for the latest verdict', 'Watch checks: live site scan, live Supabase probe, SSL, domain and downtime alerts', 'The benchmark published on the accuracy page', 'Deeper Pro checks: Supabase policies, security headers, login rate limits']],
  ['January and after', 'sky', 'Cloud. Our aim, not a promise.', ['Solo opens with a 14-day trial and no card', 'Public launch', 'Team and Agency as soon as roles and the merge block are solid, which we aim for by February: draft fix pull requests, Slack and Discord alerts, the Live-checked badge with a clean-days streak, white-label reports']],
];
write('roadmap', page({
  title: 'Roadmap — SIGSHIP', description: 'What SIGSHIP has shipped, what lands by 30 November for self-hosted Pro and Business, and what SIGSHIP Cloud aims for in December and January. No dates promised for Cloud.', path: '/roadmap/',
  body: pageHero({ eyebrow: 'Roadmap', color: 'lime', title: 'Where SIGSHIP is going.', sub: `What is live, what lands this month, and what Cloud aims for after that. Self-hosted work carries its month. For Cloud, no dates promised: what we promise is each feature's month on the <a href="/pricing/" style="color:var(--sky);text-decoration:underline">pricing page</a>, and ${REFUND_LINE.charAt(0).toLowerCase()}${REFUND_LINE.slice(1)}`, extra: `<a class="btn btn-primary" href="${GH}/discussions">Suggest an idea</a>` }) + section(`<div class="grid-2">${ROADMAP.map(([t, c, d, items]) => `<div class="card"><div class="row" style="display:flex;align-items:center;gap:8px"><span class="dot" style="--c:var(--${c})"></span><h3>${t}</h3></div><p class="sub">${d}</p><ul style="display:grid;gap:8px;margin-top:16px;font-size:.875rem;color:var(--muted-foreground)">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div><p class="muted" style="margin-top:24px;font-size:.875rem">Every new check starts in the <a href="/lookout/" style="text-decoration:underline">Lookout</a>. The <a href="/incident-rule/" style="text-decoration:underline">incident rule</a> says what happens when a check should have caught something and didn’t.</p>`, 'sec-tight'),
}));

// ---------- The readiness score, accuracy, the review protocol and the incident rule ----------
const SCORE_TEXT = `<h2>The formula</h2>
<p>${T('Every app starts at 100. Each problem the check finds takes points away, by how serious it is. The score can’t go below 0.', 'Start at 100. Subtract per finding by severity, with a cap on how many findings of each severity count. Floor at 0.')}</p>
<table><thead><tr><th>Finding</th><th>Points off</th><th>Counted at most</th></tr></thead><tbody>
<tr><td>${T('Fix now', 'SEV-1')}</td><td>30 each</td><td>2</td></tr>
<tr><td>${T('Fix soon', 'SEV-2')}</td><td>12 each</td><td>3</td></tr>
<tr><td>${T('Nice to fix', 'SEV-3')}</td><td>4 each</td><td>5</td></tr>
</tbody></table>
<p>${T('So the lowest an app can score is 100 minus 60, 36 and 20, which is 0. A clean app scores 100.', 'Minimum 100 − (2×30 + 3×12 + 5×4) = 100 − 116, floored to 0. A clean run scores 100.')}</p>
<h2>What does not count</h2>
<p>${T('A problem you have marked as an accepted risk, with a reason and an expiry date, is left out of the score.', 'Findings matched by an entry in sigship-accept.json are excluded. Expired entries count again.')}</p>
<h2>What the score is for</h2>
<p>${T('The score is for the graph: it shows your app getting safer over time, and it lets you compare two days. It never decides the verdict.', 'The score feeds the history graph and the badge record. GO and NO-GO are unchanged by it: any SEV-1 or SEV-2 finding is NO-GO, whatever the score.')}</p>
<div class="callout plain">${T('A score of 100 means these checks found nothing that blocks launch. It does not prove the app is safe.', 'Score 100 means zero findings from a pattern check. It is not a security audit and does not prove the app is safe.')}</div>
<h2>Worked examples</h2>
<table><thead><tr><th>Findings</th><th>Score</th><th>Verdict</th></tr></thead><tbody>
<tr><td>None</td><td>100</td><td>GO</td></tr>
<tr><td>${T('1 Nice to fix', '1 × SEV-3')}</td><td>96</td><td>GO</td></tr>
<tr><td>${T('1 Fix soon, 2 Nice to fix', '1 × SEV-2, 2 × SEV-3')}</td><td>80</td><td>NO-GO</td></tr>
<tr><td>${T('1 Fix now, 1 Fix soon', '1 × SEV-1, 1 × SEV-2')}</td><td>58</td><td>NO-GO</td></tr>
<tr><td>${T('3 Fix now (only 2 count), 4 Fix soon (only 3 count)', '3 × SEV-1 (cap 2), 4 × SEV-2 (cap 3)')}</td><td>4</td><td>NO-GO</td></tr>
</tbody></table>
<h2>Where you see it</h2>
<p>${T('The score and its history come with every Cloud plan, rolling out by January. The free check gives you the verdict and the list of findings today.', 'Cloud plans store a score per run and draw the history; rolling out by January. The CLI, MCP and the in-browser check report findings and the verdict; the score is computed from the same counts.')}</p>`;
write('score', page({
  title: 'Readiness score: the formula — SIGSHIP', description: 'How the SIGSHIP launch readiness score is worked out, from 0 to 100: start at 100, take points off per finding by severity, with caps, and a floor of 0. Accepted risks do not count. The verdict never depends on the score.', path: '/score/',
  body: pageHero({ eyebrow: 'Readiness score', color: 'lime', title: 'The score, with the sums shown.', sub: `${T('A number from 0 to 100 that shows how close your app is to Ready, and how it changes over time. Here is exactly how it is worked out.', 'One published formula from the finding counts. No weights hidden in a model, no machine learning.')}` }) + section(`<div class="prose">${SCORE_TEXT}</div>`, 'sec-tight'),
}));

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const ACCURACY_TEXT = BENCH
  ? `<h2>The numbers</h2>
<p>${T(`Measured on ${esc(String(BENCH.date || '')).slice(0, 10)} with sigship ${esc(String(BENCH.version || VERSION))}. For each check, the benchmark runs it over files that must set it off and look-alike files that must not.`, `Run ${esc(String(BENCH.date || '')).slice(0, 10)}, sigship ${esc(String(BENCH.version || VERSION))}. Per check: planted positives and look-alike negatives. Precision = true positives ÷ flagged. Recall = true positives ÷ planted.`)}</p>
<table><thead><tr><th>Check</th><th>${T('Right when it flags', 'Precision')}</th><th>${T('Finds what is there', 'Recall')}</th><th>Cases</th></tr></thead><tbody>
${(BENCH.checks || []).map((c) => `<tr><td>${esc(RULES.find((r) => r.id === c.id)?.title || c.id)}</td><td>${pct(c.precision)}</td><td>${pct(c.recall)}</td><td>${esc(String(c.cases ?? ''))}</td></tr>`).join('\n')}
</tbody></table>
${BENCH.repos ? `<h2>Real repositories</h2><p>${T(`Also run on ${esc(String(BENCH.repos.count))} public apps built with AI tools, labelled by hand.`, `${esc(String(BENCH.repos.count))} public AI-built repositories, hand-labelled once; held-out set listed separately.`)} ${T('Right when it flags', 'Precision')}: ${pct(BENCH.repos.precision)}. ${T('Finds what is there', 'Recall')}: ${pct(BENCH.repos.recall)}.</p>` : ''}
<h2>How to read it</h2>
<p>${T('100% on both lines means the check never cried wolf and never missed a planted problem in the benchmark. Real apps are messier, so treat these as the best case.', 'Planted cases are the upper bound. A check’s recorded precision is a floor for releases: a release fails if any check drops below it.')}</p>`
  : `<h2>Being built</h2>
<p>${T('The benchmark is being built now and we aim to publish it in December. This page will show its results, by check, the day they exist. Until then we make no accuracy claims.', 'bench/run.js and bench/results.json are in progress; publication is planned for December. No precision or recall figures are claimed until then.')}</p>
<h2>What it will measure</h2>
<ul>
<li>${T('For each of the 17 checks, about 20 files that must set it off and 20 look-alike files that must not.', 'Per check, ~20 planted positives and ~20 near-miss negatives.')}</li>
<li>${T('How often a check is right when it flags something, and how often it finds a problem that is really there.', 'Precision and recall per check, written to bench/results.json with the date and version.')}</li>
<li>${T('A run over public apps built with AI tools, labelled by hand once, with a separate set kept back so we can’t tune to it.', 'A labelled set of public AI-built repositories, plus a held-out set listed separately.')}</li>
<li>${T('A release is blocked if any check gets worse than its last published number.', 'A test fails the release if any check’s precision drops below its recorded value.')}</li>
</ul>`;
write('accuracy', page({
  title: 'Accuracy — SIGSHIP', description: BENCH ? 'How often each SIGSHIP check is right, measured by the public benchmark: precision and recall per check, with the date and version.' : 'SIGSHIP makes no accuracy claims yet. The public benchmark is being built, and this page shows precision and recall per check the day it exists.', path: '/accuracy/',
  body: pageHero({ eyebrow: 'Accuracy', color: 'teal', title: BENCH ? 'How often each check is right.' : 'No numbers yet. Here is what we will measure.', sub: T('We don’t claim an accuracy number we haven’t measured in public. The benchmark lives in the open source repo, so anyone can re-run it.', `The benchmark is in <a href="${GH}/tree/main/bench" style="color:var(--sky);text-decoration:underline">bench/</a> in the public repo. Re-run it yourself; the numbers on this page come from its results file.`) }) + section(`<div class="prose">${ACCURACY_TEXT}<h2>Something it got wrong?</h2><p>${T('A false alarm or a missed problem is a bug. Tell us with the smallest example you can.', 'Report false positives and misses with a minimal case; each one becomes a benchmark fixture.')} <a href="${GH}/issues/new/choose">Report it on GitHub</a>.</p></div>`, 'sec-tight'),
}));

const PROTOCOL_TEXT = `<h2>What a review covers</h2>
<p>${T('A SIGSHIP expert engineer reads your code by hand, in this order, and writes down what they found under each heading.', 'A SIGSHIP expert engineer reviews the repository by hand against five areas, in order, and reports per area.')}</p>
<ol>
<li><b>Logins and access.</b> ${T('Who can sign in, who can see or change what, and whether an admin is decided on the server, not in the browser.', 'Authentication, session handling, authorization on every route and database rule, role checks on the server.')}</li>
<li><b>User data.</b> ${T('Where personal data lives, who can read it, and whether a stranger can read another user’s rows.', 'Data model and access policies (for example RLS), exports, backups, deletion, and what logs contain.')}</li>
<li><b>Payments.</b> ${T('That a payment message really came from your payment provider before anything is unlocked, and that prices and amounts are set on the server.', 'Webhook signature verification, idempotency, server-side pricing, refund and cancellation paths.')}</li>
<li><b>Secret keys.</b> ${T('That no key is in the code, the browser or the git history, and that each one has the least power it needs.', 'Secrets in code, bundles and history; key scope and rotation; environment variable prefixes.')}</li>
<li><b>AI spending.</b> ${T('That no feature can run up your AI bill without limit, and that what users type can’t take over your AI’s instructions.', 'Rate limits and spend caps on model calls, prompt injection paths, model output rendered as HTML.')}</li>
</ol>
<p>${T('The review also runs the full SIGSHIP check, including the Pro pack, so the written review starts where the scanner stops.', 'The engineer runs the CLI with the Pro pack first; the written review covers what pattern checks cannot see.')}</p>
<h2>What it does not cover</h2>
<p>${T('A review reads your code. It does not test your live site from the outside, does not review your hosting account or dashboards, and is not a penetration test or a compliance audit. Anything out of scope is listed in the report so nobody assumes it was checked.', 'Static review of the repository only. No live testing, no infrastructure or dashboard review, not a penetration test, not a SOC 2 or ISO audit. Out-of-scope items are listed in the report.')}</p>
<h2>Who signs it</h2>
<p>${T('One named SIGSHIP expert engineer does the review and signs the report with their name and the review date. The same person is available for the 30-minute call.', 'The reviewing engineer signs the report with name and date. One engineer per review; the signer takes the call.')}</p>
<h2>How many we take</h2>
<p>${T('At most three reviews a week, so each one gets a full read. If the week is full you get the next open slot, and you can cancel for a full refund until work starts.', 'Cap: three reviews per week. Written review within 48 hours of the start of your slot. Full refund until work starts.')}</p>
<h2>What the report page shows</h2>
<p>${T('An app that passes gets the Expert-reviewed badge, and the badge links to a report page that anyone can open. It shows:', 'The Expert-reviewed badge links to a public report page with:')}</p>
<ul>
<li>${T('What was checked, under the five headings above.', 'Scope: the five areas and the commit reviewed.')}</li>
<li>${T('What was found and fixed before the badge was issued, in plain words, without details that would help an attacker.', 'Findings fixed before issue, summarised without exploit detail.')}</li>
<li>${T('What was out of scope.', 'Out-of-scope list.')}</li>
<li>${T('The engineer’s name, the review date, and the SIGSHIP version used.', 'Signer, date, sigship version.')}</li>
</ul>
<p>${T('The badge is valid for 12 months from the review date and the report says so. An app that changes a lot is reviewed again before the badge is renewed.', 'Validity: 12 months from the review date, shown on the badge and the record. Renewal needs a new review.')}</p>
<div class="callout plain">${T('An expert review is a careful read by one person with a written protocol. It is not a guarantee that the app is safe, and the report never says it is.', 'A review is one engineer’s reading against a fixed protocol. It is not a certificate and does not prove the app is safe.')}</div>
<h2>Price</h2>
<p>${T('From $499, with a ranked, written review within 48 hours and a 30-minute call. Available now.', 'From $499. Ranked written review in 48 hours plus a 30-minute call. Available now; request by email.')} <a href="mailto:support@sigship.dev?subject=SIGSHIP%20expert%20review">Request an expert review</a>.</p>`;
write('expert-review/protocol', page({
  title: 'Expert review protocol — SIGSHIP', description: 'What a SIGSHIP expert review covers (logins and access, user data, payments, secret keys, AI spending), what it leaves out, who signs it, the weekly cap, and what the public report page shows.', path: '/expert-review/protocol/',
  trail: [['Home', '/'], ['Verified badge', '/badge/'], ['Expert review protocol', '/expert-review/protocol/']],
  body: pageHero({ eyebrow: 'Expert review · protocol', color: 'violet', title: 'What an expert review covers.', sub: T('The Expert-reviewed badge means a person looked, not only a scanner. This page is the protocol that person follows, so you know exactly what “looked” means.', 'The fixed protocol behind the Expert-reviewed badge: scope, exclusions, signer, cap and the public report.'), trail: [['Home', '/'], ['Verified badge', '/badge/'], ['Expert review protocol', '/expert-review/protocol/']] }) + section(`<div class="prose">${PROTOCOL_TEXT}</div>`, 'sec-tight'),
}));

const INCIDENT_TEXT = `<h2>The rule</h2>
<div class="callout plain">${T('If an app that carries a SIGSHIP badge is breached through something one of our checks should have caught, we revoke the badge, publish a write-up, and add a new check through the Lookout.', 'A breach of a badge-holding app through a class of problem a SIGSHIP check should have caught triggers: badge revocation, a public write-up, and a new check via the Lookout.')}</div>
<h2>What counts</h2>
<p>${T('It counts when the way in was a problem a check already looks for, or one our checks should have looked for given what they promise: a leaked key, an open database table, an unverified payment message, an AI route with no limit, and the rest of the list.', 'In scope: an initial access vector matching an existing rule, or a class the rules claim to cover (secrets, data access policies, webhook verification, rate limits, injection, and the rest of the check list). Out of scope: hosting account compromise, phishing, zero-days in platforms we do not scan.')}</p>
<h2>What happens</h2>
<ol>
<li><b>${T('The badge is revoked', 'Revocation')}.</b> ${T('Within one working day of confirming the breach, the badge switches to Revoked and its record page says why.', 'Within one working day of confirmation the badge state becomes revoked; the /verify/ record shows the reason.')}</li>
<li><b>${T('We write it up', 'Write-up')}.</b> ${T('A public notice in the Lookout: what happened, what our check saw, what it should have seen, and what we changed. No details that would help an attacker, and nothing that names the victim without their agreement.', 'A Lookout notice with the vector, what the check did and did not see, and the change. No exploit detail; the affected party is named only with consent.')}</li>
<li><b>${T('A new check', 'New check')}.</b> ${T('Within 14 days, the gap becomes a new check, or an existing check is widened, and it ships to the free tool as well as the paid plans.', 'Within 14 days the gap lands as a new or widened rule, in the free tool and the Pro pack, with a test.')}</li>
<li><b>${T('The badge comes back', 'Reinstatement')}.</b> ${T('After the fix, a fresh pass of the check restores the badge. For an Expert-reviewed badge the engineer reviews the fix first.', 'A passing run after the fix restores the badge; Expert-reviewed badges need the signer’s review of the fix.')}</li>
</ol>
<h2>What this does not mean</h2>
<p>${T('A badge is not insurance and not a promise that the app is safe. It means the checks at that level found nothing that blocks launch, on the date shown. This rule is how we own it when the checks were not good enough.', 'The badge is not a warranty. It records that the level’s checks passed on the date shown. This rule is our accountability when the checks were insufficient.')}</p>
<h2>Reporting a breach</h2>
<p>${T('Owners, researchers and users can report one to', 'Report to')} <a href="mailto:support@sigship.dev?subject=SIGSHIP%20incident">support@sigship.dev</a>. ${T('We reply within one working day. Reports about SIGSHIP itself follow our', 'Replies within one working day. For vulnerabilities in SIGSHIP itself see')} <a href="${GH}/blob/main/SECURITY.md">security policy</a>.</p>
<h2>Incidents so far</h2>
<p>${T('None. This page lists every one, with a link to its write-up, the day there is one.', 'None to date. Each incident is listed here with its Lookout write-up.')}</p>`;
write('incident-rule', page({
  title: 'Incident rule — SIGSHIP', description: 'What happens when an app with a SIGSHIP badge is breached through something a check should have caught: the badge is revoked, we publish a write-up, and a new check ships through the Lookout.', path: '/incident-rule/',
  body: pageHero({ eyebrow: 'Incident rule', color: 'coral', title: 'If a badge fails you, this is what we do.', sub: T('A badge should mean something, so we say in advance what happens when it lets you down.', 'The published accountability rule for every badge level.') }) + section(`<div class="prose">${INCIDENT_TEXT}</div>`, 'sec-tight'),
}));

// ---------- Legal, brand, 404 ----------
const prosePage = (slug, title, description, eb, color, sub, html) => write(slug, page({ title: `${title} — SIGSHIP`, description, path: `/${slug}/`, body: pageHero({ eyebrow: eb, color, title, sub }) + section(`<div class="prose">${html}</div>`, 'sec-tight') }));
prosePage('privacy', 'Privacy', 'SIGSHIP runs on your computer and sends nothing anywhere. What the tool, the website, the waitlist and paid plans collect, in plain English.', 'Privacy', 'teal', 'Last updated: 2026-11-09.', `<h2>The command line tool and MCP server</h2><p>They run on your machine and have no telemetry. Without a licence key they make no network calls at all. Your code, findings and secrets stay with you.</p>
<h2>Licence keys</h2><p>If you set <code>SIGSHIP_KEY</code>, the tool sends two things to api.sigship.dev: your licence key, and a one-way fingerprint of the repository made from its git address mixed with your key. It sends no code, file names or findings. We pass the key to Polar to check it and to count the repository against your plan's limit. The Pro pack is cached on your machine for 24 hours.</p>
<h2>This website</h2><p>This site has no analytics scripts and sets no cookies. Cloudflare, which serves it, counts requests at the network edge. Your theme, wording choice and whether you closed an announcement are kept in your own browser only. The 60-second film is hosted on Vimeo; its player, and Vimeo's own privacy terms, apply only after you press play.</p>
<h2>Waitlist and the Lookout email</h2><p>If you join a waitlist or ask for the Lookout notice by email, we keep your email address, the plan or list you picked, your country as reported by Cloudflare, and the time. It is stored in a Google Sheet that only Zoof04 can open, or, for the Lookout notice, in the SIGSHIP Cloud database once that list moves there. We use it only to email you when your plan opens or to send the Lookout notice. Every email has an unsubscribe link, or email <a href="mailto:support@sigship.dev">support@sigship.dev</a> and we will delete it.</p>
<h2>Payments</h2><p>Polar is the merchant of record. Polar collects your payment details and shares your name, email and order with us so we can provide the service.</p>
<h2>Expert review</h2><p>If you buy an expert review, you choose what code to share with us. We use it only for that review and delete it when the review ends, unless you ask us to keep it.</p>
<h2>Contact</h2><p>Zoof04 Inc. Email <a href="mailto:support@sigship.dev">support@sigship.dev</a>.</p>`);
prosePage('terms', 'Terms and refunds', 'The terms for using SIGSHIP, the free open source tool and the paid plans, and how refunds work, in plain English.', 'Terms', 'amber', 'Last updated: 2026-11-06.', `<h2>The tool</h2><p>The open source tool is licensed under MIT. SIGSHIP uses pattern checks. A GO result is not a security audit and does not prove your app is safe. You stay responsible for your app.</p>
<h2>Paid plans</h2><p>${CHECKOUT.pro ? 'Self-hosted Pro and Business are on sale; Cloud plans are not yet.' : 'Paid plans are not on sale yet.'} Self-hosted Pro and Business are one-time purchases that include a year of new checks, and you keep using what you bought after that year. Cloud plans renew monthly or yearly until you cancel, after a 14-day trial with no card. Cancel at any time and you keep access until the end of the paid period.</p>
<h2>Refunds</h2><p>Ask within 14 days of your first payment and we refund it in full. A feature that misses its date is refunded on request: every paid feature on the <a href="/pricing/">pricing page</a> says whether it is built today or the month it rolls out by. An expert review can be refunded in full until work starts.</p>
<h2>Who you are dealing with</h2><p>Polar is the merchant of record for payments. The service is provided by Zoof04 Inc. Email <a href="mailto:support@sigship.dev">support@sigship.dev</a>.</p>`);
const SWATCHES = [['brand', 'Peter blue', 'The flag, the logo, one primary accent'], ['go', 'Go', 'Ready, passed, GO'], ['warn', 'Fix soon', 'SEV-2'], ['stop', 'Fix now', 'SEV-1'], ['violet', 'Violet', 'AI agents, your users’ data'], ['teal', 'Teal', 'Website safety'], ['amber', 'Amber', 'Keys and passwords'], ['coral', 'Coral', 'Lookout'], ['lime', 'Lime', 'Payments'], ['sky', 'Sky', 'Cloud, logins'], ['pink', 'Pink', 'AI costs, guides']];
prosePage('brand', 'Brand', 'The SIGSHIP logo, colours, type and flag story, with files to download.', 'Brand', 'violet', 'Everything you need to write about SIGSHIP. Write the name in capitals, as SIGSHIP, and say it is by zoof04.', `<h2>Logo</h2><p>Signal flag P, the Blue Peter, on a staff, with the SIGSHIP wordmark.</p><div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:12px"><div class="card" style="padding:32px">${mark(80)}</div><div class="card" style="padding:32px;display:flex;align-items:center;gap:14px">${mark(40)}<b style="font-size:1.6rem;font-weight:800;letter-spacing:.02em">SIGSHIP</b></div></div><p>Files: <a href="/brand/sigship-logo.png" download>logo PNG</a> · <a href="/brand/sigship-logo-dark.png" download>logo on dark PNG</a> · <a href="/brand/sigship-mark.svg" download>mark SVG</a> · <a href="/brand/sigship-icon.svg" download>icon SVG</a> · <a href="/og.png" download>social card</a>.</p>
<h2>Colours</h2><div class="swatches" style="margin-top:12px">${SWATCHES.map(([c, n, u]) => `<div><i style="--c:var(--${c})"></i><b>${n}</b><code>--${c}</code><small class="muted" style="display:block;font-size:.75rem">${u}</small></div>`).join('')}</div><p>Green, amber and red mean only Ready, Fix soon and Fix now. Everything else is an accent.</p>
<h2>Type</h2><p>Inter for headings and text, JetBrains Mono for commands and output. Both are open source (SIL Open Font License) and served from this site, so no third party sees who reads it.</p>
<h2>The flags</h2><p>The mark is flag P, the Blue Peter, from the International Code of Signals. A ship raises it when it is about to sail. In computing, a signal is a message a program has to act on. SIGSHIP is both: one clear message that an app is ready to leave port, or that it isn't yet.</p>
<h2>Please don't</h2><ul><li>Recolour flag P or change its white centre.</li><li>Stretch, rotate or add effects to the logo.</li><li>Use the logo to suggest SIGSHIP has reviewed or approved an app.</li></ul>
<h2>Contact</h2><p>For press and partnerships, email <a href="mailto:support@sigship.dev">support@sigship.dev</a>.</p>`);
writeFileSync(join(site, '404.html'), page({ title: 'Page not found — SIGSHIP', description: 'This page does not exist.', path: '/404.html', noindex: true, body: pageHero({ eyebrow: '404', color: 'coral', title: 'Page not found.', sub: "The page you're looking for doesn't exist or has been moved.", extra: '<a class="btn btn-primary" href="/">Go home</a> <a class="btn btn-ghost" href="/checks/">See every check</a>' }) }));

// ---------- The embeddable Self-checked badge ----------
mkdirSync(join(site, 'badge'), { recursive: true });
writeFileSync(join(site, 'badge/self-checked.svg'), selfCheckedSvg());
writeFileSync(join(site, 'flags/cleared.svg'), selfCheckedSvg());

// ---------- Crawler files ----------
const urls = ['/', ...(existsSync(join(site, 'check/index.html')) ? [CHECK] : []), '/checks/', '/cloud/', '/badge/', '/verify/', '/expert-review/protocol/', '/score/', '/accuracy/', '/incident-rule/', '/lookout/', '/pricing/', '/waitlist/', '/docs/', '/agents/', '/api/', '/changelog/', '/releases/', '/resources/', '/guides/', ...GUIDES.map((g) => `/guides/${g.slug}/`), '/glossary/', '/open-source/', '/community/', '/roadmap/', ...RULES.map((r) => `/checks/${r.id}/`), '/brand/', '/privacy/', '/terms/'];
const priority = (u) => (u === '/' ? '1.0' : /^\/(check|pricing|checks|docs|agents|cloud|badge|resources)\/$/.test(u) ? '0.9' : u.startsWith('/guides/') || u.startsWith('/checks/') || u === '/glossary/' || u === '/lookout/' ? '0.8' : /^\/(privacy|terms|brand)\/$/.test(u) ? '0.3' : '0.6');
const videoXml = `<video:video><video:thumbnail_loc>${ORIGIN}${FILM.poster}</video:thumbnail_loc><video:title>${esc(FILM.title)}</video:title><video:description>${esc(FILM.description)}</video:description><video:player_loc>https://player.vimeo.com/video/${FILM.vimeoId}</video:player_loc><video:duration>56</video:duration><video:publication_date>${FILM.uploadDate}T00:00:00+00:00</video:publication_date><video:family_friendly>yes</video:family_friendly><video:live>no</video:live></video:video>`;
writeFileSync(join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc><lastmod>${LASTMOD}</lastmod><priority>${priority(u)}</priority>${u === '/' ? videoXml : ''}</url>`).join('\n')}\n</urlset>\n`);
const BOTS = ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'DuckDuckBot', 'CCBot'];
writeFileSync(join(site, 'robots.txt'), `${BOTS.map((b) => `User-agent: ${b}`).join('\n')}\nAllow: /\nDisallow: /api/\n\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
const ABOUT = `SIGSHIP is a free, open source launch check for apps built with AI tools such as Lovable, Bolt, Cursor, Replit, v0 and Claude Code. It reads a project on the user's own computer, explains in plain words what could leak, break or cost money once real people use the app, gives the fix for each problem (including one prompt to paste into an AI tool), and ends with a verdict: GO (Ready) or NO-GO. It exits 0 only on GO. A GO means its ${RULES.length} checks found nothing that blocks launch; it does not prove an app is safe. Made by Zoof04 Inc. Contact: support@sigship.dev.`;
const CMDS = `- Check a project: \`npx sigship\`\n- Get every fix as one prompt for an AI tool: \`npx sigship --prompt\`\n- Open the private browser dashboard: \`npx sigship ui\`\n- Add it to Claude Code: \`claude mcp add sigship -- npx -y sigship mcp\`\n- Add a GitHub pull request check and an AGENTS.md rule: \`npx sigship init\`\n- Requires Node.js ${NODE_MIN} or newer. The free tool makes no network calls and never prints a secret value.`;
writeFileSync(join(site, 'llms.txt'), `# SIGSHIP\n\n> ${ABOUT}\n\n${CMDS}\n\n## Start here\n- [The ${RULES.length} checks](${ORIGIN}/checks/): every mistake it looks for, in plain words\n- [Docs](${ORIGIN}/docs/): install, commands, flags, exit codes\n- [AI agents](${ORIGIN}/agents/): MCP setup for Claude Code, Cursor, Windsurf, Copilot, Gemini CLI and Codex\n- [Pricing](${ORIGIN}/pricing/): free today; paid plans on the waitlist\n- [SIGSHIP Cloud](${ORIGIN}/cloud/): nightly checks and a Verified badge, coming soon\n- [Lookout](${ORIGIN}/lookout/): new threats and what SIGSHIP does about each\n- [Glossary](${ORIGIN}/glossary/): app security terms in plain English\n- [Readiness score](${ORIGIN}/score/): the published formula behind the 0 to 100 score\n- [Accuracy](${ORIGIN}/accuracy/): how often each check is right, from the public benchmark\n- [Expert review protocol](${ORIGIN}/expert-review/protocol/): what a SIGSHIP expert engineer checks by hand\n- [Incident rule](${ORIGIN}/incident-rule/): what happens when a badge-holding app is breached through something a check should have caught\n- [Full text for language models](${ORIGIN}/llms-full.txt)\n\n## Guides\n${GUIDES.map((g) => `- [${g.title}](${ORIGIN}/guides/${g.slug}/): ${g.description}`).join('\n')}\n\n## Checks\n${RULES.map((r) => `- [${r.title}](${ORIGIN}/checks/${r.id}/): SEV-${r.severity}. ${CHECK_EXTRA[r.id].plain}`).join('\n')}\n\n## Optional\n- [Changelog](${ORIGIN}/changelog/)\n- [Roadmap](${ORIGIN}/roadmap/)\n- [Source code on GitHub](${GH})\n- [npm package](${NPM})\n`);
// Text for language models keeps the plain voice only.
const plainVoice = (html) => html.replace(/<span class="d">[\s\S]*?<\/span>/g, '');
const plainText = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<\/(p|li|h2|h3|pre|tr|dt|dd)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
writeFileSync(join(site, 'llms-full.txt'), `# SIGSHIP: full text\n\n${ABOUT}\n\n## Commands\n${CMDS}\n\n## Common questions\n${HOME_FAQ.map(([q, a]) => `### ${q}\n${a}`).join('\n\n')}\n\n## Checks\n${RULES.map((r) => `### ${r.title} (${r.id}, SEV-${r.severity})\nIn plain English: ${CHECK_EXTRA[r.id].plain}\nWhat happens if you ship it: ${r.forecast}\nHow to fix it: ${r.fix}\n${CHECK_EXTRA[r.id].faq.map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n')}`).join('\n\n')}\n\n## Guides\n${GUIDES.map((g) => `### ${g.title}\n${ORIGIN}/guides/${g.slug}/\n${g.lede}\n\n${plainText(g.body)}\n${g.faq.map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n')}`).join('\n\n')}\n\n## Readiness score\n${plainText(plainVoice(SCORE_TEXT))}\n\n## Accuracy\n${plainText(plainVoice(ACCURACY_TEXT))}\n\n## Expert review protocol\n${plainText(plainVoice(PROTOCOL_TEXT))}\n\n## Incident rule\n${plainText(plainVoice(INCIDENT_TEXT))}\n\n## Glossary\n${GLOSSARY.map(([, term, plain]) => `- ${term}: ${plain}`).join('\n')}\n`);
writeFileSync(join(site, 'manifest.webmanifest'), `${JSON.stringify({ name: 'SIGSHIP', short_name: 'SIGSHIP', description: 'Is your AI-built app safe to launch? Free, open source launch check.', start_url: '/', display: 'standalone', background_color: '#121316', theme_color: '#121316', icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] }, null, 2)}\n`);
writeFileSync(join(site, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
mkdirSync(join(site, '.well-known'), { recursive: true });
writeFileSync(join(site, '.well-known/security.txt'), `Contact: mailto:support@sigship.dev\nExpires: ${Number(LASTMOD.slice(0, 4)) + 1}${LASTMOD.slice(4)}T00:00:00.000Z\nPreferred-Languages: en\nPolicy: ${GH}/blob/main/SECURITY.md\nCanonical: ${ORIGIN}/.well-known/security.txt\n`);
writeFileSync(join(site, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#121316"/><g transform="translate(10 12) scale(0.172)"><rect width="12" height="211" rx="6" fill="#ffffff"/><rect x="16" y="12.8" width="240" height="160" rx="9.6" fill="#2f5be0"/><rect x="99.2" y="56" width="73.6" height="73.6" fill="#ffffff"/></g></svg>\n`);

// The verdict caveat appears on every page, in the footer; the wording never changes.
const homeHtml = readFileSync(join(site, 'index.html'), 'utf8');
if (!homeHtml.includes('It does not prove the app is safe.')) throw new Error('The GO caveat is missing from the footer.');
if (/combinator/i.test(homeHtml)) throw new Error('The page must not mention Y Combinator.');
console.log(`Built ${urls.length} pages for ${ORIGIN} with sigship ${VERSION}.`);
