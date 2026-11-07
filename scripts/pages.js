// The product pages: features, AI agents, pricing, docs, resources, changelog, roadmap and community.
// Plain English first; technical detail only where developers need it.
// Facts come from the code (checks, plans, the changelog, the MCP tools, the real demo capture), so pages can't drift.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/rules.js';
import { FEATURES, TRACKS } from './pricing.js';

// The Discord invite link. Leave it empty and the Community page says Discord is opening soon.
export const DISCORD_URL = 'https://discord.gg/hKG6rNM4W';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const capture = JSON.parse(readFileSync(join(root, 'scripts/home/demo-run.json'), 'utf8'));
const GH = 'https://github.com/sigship/sigship';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const flag = (f, cls = 'flag') => `<svg class="${cls}" viewBox="0 0 90 60" aria-hidden="true"><use href="#flag-${f}"/></svg>`;
const ICON = {
  terminal: '<svg viewBox="0 0 24 24"><path d="M4 6l5 6-5 6M12 18h8"/></svg>',
  browser: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>',
  pr: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v7M18 15.5V9a3 3 0 0 0-3-3h-4M13 4l-2 2 2 2"/></svg>',
  agent: '<svg viewBox="0 0 24 24"><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  code: '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M8 7h7"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 9.5C8 19.3 5 15.5 5 11V6l7-3z"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  pkg: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/></svg>',
};
const icon = (k) => `<span class="icon" aria-hidden="true">${ICON[k]}</span>`;
// Brand marks used only to link to these platforms.
const LOGO = {
  github: '<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>',
  discord: '<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.8a13.7 13.7 0 0 0-.63 1.28 18.4 18.4 0 0 0-5.6 0 13.7 13.7 0 0 0-.63-1.28 19.7 19.7 0 0 0-4.89 1.52C.6 9.03-.24 13.57.18 18.05a19.9 19.9 0 0 0 6 3.03 14.6 14.6 0 0 0 1.28-2.1 12.9 12.9 0 0 1-2.02-.97l.5-.38a14.2 14.2 0 0 0 12.12 0l.5.38c-.64.38-1.32.71-2.02.97.37.74.8 1.44 1.28 2.1a19.8 19.8 0 0 0 6-3.03c.5-5.18-.84-9.68-3.5-13.68zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.34-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.34-.94 2.42-2.15 2.42z"/></svg>',
};

const code = (label, text) => `<div class="code"><div class="code-bar"><span>${esc(label)}</span><button class="copy-btn" type="button" data-copy="${esc(text)}" data-copy-label="${esc(label)}">Copy</button></div><pre><code>${esc(text)}</code></pre></div>`;
const hero = (kicker, title, lede, acts = '') => `<header class="phero">
<p class="eyebrow"><b>SIGSHIP</b><i></i><span>${kicker}</span></p>
<h1>${title}</h1>
<p class="lede">${lede}</p>
${acts ? `<div class="acts-row">${acts}</div>` : ''}
</header>`;
const CTA = `<section class="cta-band" aria-labelledby="cta-h">
<div><h2 id="cta-h">Check your app before your users do.</h2><p>Free, open source, and nothing leaves your machine.</p></div>
<div><div class="cta-cmd"><code>$ npx sigship</code><button class="copy-btn" type="button" data-copy="npx sigship" data-copy-label="npx sigship">Copy</button></div>
<div class="cta-links"><a href="/docs/">Read the docs</a><a href="/pricing/">See pricing</a><a href="/#waitlist">Join the waitlist</a></div></div>
</section>`;
const btnInk = (href, text) => `<a class="btn-ink" href="${href}">${text}</a>`;
const btnLine = (href, text) => `<a class="btn-line" href="${href}">${text}</a>`;

const SEV = {
  1: ['var(--red)', 'Blocks launch. Puts your data or money at risk.'],
  2: ['var(--yellow)', 'Blocks launch. Makes abuse easy.'],
  3: ['var(--lamp-slate)', 'Worth fixing. Blocks only in strict mode.'],
};
const sevCol = (n) => {
  const rules = RULES.filter((r) => r.severity === n);
  return `<div class="sevcol"><h3><span class="dot" style="background:${SEV[n][0]}"></span>SEV-${n} · ${rules.length} checks</h3><p>${SEV[n][1]}</p>
<ul>${rules.map((r) => `<li><a href="/checks/${r.id}/">${esc(r.title)}</a></li>`).join('')}</ul></div>`;
};

// ---------- Features ----------
const promptSample = capture.run1.prompt.trim();
const features = {
  path: '/features/',
  title: 'Features | SIGSHIP',
  description: 'Everything SIGSHIP does, in plain English: catches the expensive mistakes in AI-built apps, turns them into fixes for your AI tool, and runs on your machine.',
  body: `${hero('Features', 'Everything it does. <span>In plain English.</span>',
    `SIGSHIP reads the code your AI tool wrote and tells you, before launch, what will leak, break or cost you money. <b>Then it hands you the fix.</b>`,
    btnInk('/docs/', 'Get started free') + btnLine('/pricing/', 'See pricing'))}

<section class="block"><h2>Catches the mistakes <span>that cost you.</span></h2>
<p class="sub">${RULES.length} checks, chosen from how AI-built apps actually fail: leaked keys, open databases, fake payments and runaway AI bills. Tap any check to see what goes wrong and how to fix it.</p>
<div class="sevlist">${[1, 2, 3].map(sevCol).join('')}</div></section>

<section class="block"><h2>Fixes with the AI tool <span>you already use.</span></h2>
<div class="split2"><div>
<p>Every problem comes with a plain fix. Run <code>npx sigship --prompt</code> and you get one prompt with every fix, in order, ready to paste into Lovable, Cursor, Bolt, Replit or Claude Code.</p>
<p>Your AI tool makes the changes. Run SIGSHIP again, and when it says GO, nothing serious is left.</p>
<p><a href="/ai-agents/">Let your coding agent do the loop for you →</a></p>
</div>${code('Real output · npx sigship --prompt', promptSample)}</div></section>

<section class="block"><h2>Runs where <span>you work.</span></h2>
<div class="cards">
<div class="card">${icon('terminal')}<h3>Your terminal</h3><p>One command, no signup. A clear GO or NO-GO in seconds.</p></div>
<div class="card">${icon('browser')}<h3>Your browser</h3><p>Prefer buttons? <code>npx sigship ui</code> opens a private dashboard on your own computer.</p></div>
<div class="card">${icon('pr')}<h3>Every pull request</h3><p>A GitHub check that fails when a change brings a serious problem back.</p></div>
<div class="card">${icon('agent')}<h3>Your AI coding agent</h3><p>Over MCP, with one rule: don't say it's done until SIGSHIP says GO.</p><a class="more" href="/ai-agents/">AI agents →</a></div>
</div></section>

<section class="block"><h2>Private <span>by design.</span></h2>
<div class="cards">
<div class="card">${icon('lock')}<h3>Nothing leaves your machine</h3><p>The free tool makes no network calls. Your code, keys and findings stay with you.</p></div>
<div class="card">${icon('eye')}<h3>Never prints a secret</h3><p>When it finds a leaked key it tells you where, never what.</p></div>
<div class="card">${icon('code')}<h3>Open source</h3><p>MIT licensed with zero dependencies. Read every line it runs.</p><a class="more" href="${GH}">GitHub →</a></div>
<div class="card">${icon('shield')}<h3>An honest verdict</h3><p>GO means these checks found nothing that blocks launch. It does not prove your app is safe, and we say so.</p></div>
</div></section>

<section class="block"><h2>Coming with <span>paid plans.</span></h2>
<p class="sub">Planned features, on the waitlist. They arrive at launch.</p>
<div class="cards">
<div class="card"><span class="tagline">Waitlist</span><h3>More checks</h3><p>Deeper Supabase policy checks, security headers, login rate limits, risky packages and secrets in your git history.</p></div>
<div class="card"><span class="tagline">Waitlist</span><h3>Reports for clients</h3><p>A clean report and a pre-launch checklist you can send to a client or investor.</p></div>
<div class="card"><span class="tagline">Waitlist</span><h3>SIGSHIP Cloud</h3><p>Connect a repo once. We check every change and watch your live site, and tell you what to fix in plain English.</p></div>
</div>
<div class="acts-row">${btnLine('/roadmap/', 'See the roadmap')}${btnLine('/pricing/', 'Compare plans')}</div></section>
${CTA}`,
};

// ---------- AI agents ----------
const mcpText = readFileSync(join(root, 'src/mcp.js'), 'utf8');
const tools = [...mcpText.matchAll(/name: '(sigship_\w+)',\s*description:\s*'([^']+)'[\s\S]*?properties: \{([\s\S]*?)\n?\s*\},\s*\n?\s*required: \[([^\]]*)\]/g)].map((m) => ({
  name: m[1],
  description: m[2],
  params: [...m[3].matchAll(/(\w+): \{ type: '(\w+)', description: '([^']+)' \}/g)].map((p) => ({ name: p[1], type: p[2], description: p[3], required: m[4].includes(`'${p[1]}'`) })),
}));
if (tools.length < 2) throw new Error('Could not read the MCP tools from src/mcp.js.');
const initText = readFileSync(join(root, 'src/init.js'), 'utf8');
const agentRule = initText.match(/const AGENT_RULE = `([\s\S]*?)`;/)[1].replace(/\\`/g, '`').trim();
const AGENT_PROMPT = 'Run npx sigship in this project. Fix every SEV-1 and SEV-2 it reports, in order, changing only what each fix needs. Run it again and keep going until it exits 0 (GO). If a fix needs a key rotated or a dashboard changed, stop and tell me what to do.';
const MCP_JSON = '{\n  "mcpServers": {\n    "sigship": { "command": "npx", "args": ["-y", "sigship", "mcp"] }\n  }\n}';
const setup = [
  ['claude', 'Claude Code', `<p>Run this once in your terminal. Claude Code can now check your project any time.</p>${code('Terminal', 'claude mcp add sigship -- npx -y sigship mcp')}`],
  ['cursor', 'Cursor', `<p>Add this to <code>.cursor/mcp.json</code> in your project, then reload Cursor.</p>${code('.cursor/mcp.json', MCP_JSON)}`],
  ['other', 'Other MCP apps', `<p>Most apps that support MCP use this same setup. Find "MCP servers" in your app's settings and add:</p>${code('MCP server config', MCP_JSON)}`],
  ['prompt', 'No MCP? Use a prompt', `<p>Any AI tool can run commands for you. Paste this prompt and it will loop until your app is GO.</p>${code('Prompt', AGENT_PROMPT)}`],
];
const agents = {
  path: '/ai-agents/',
  title: 'AI agents | SIGSHIP',
  description: 'Give your AI coding agent a real test for done: it runs SIGSHIP, fixes what it finds and keeps going until your app is GO.',
  body: `${hero('AI agents', 'A real test for <span>"done".</span>',
    'AI agents say they are finished when the code runs. SIGSHIP gives them a stricter finish line: <b>no leaked keys, no open database, no fake payments.</b> The agent keeps fixing until SIGSHIP says GO.',
    btnInk('#setup', 'Set it up in a minute') + btnLine('/docs/', 'Read the docs'))}

<section class="block"><h2>How it works</h2>
<div class="cards">
<div class="card">${flag('s')}<h3>1. Your agent writes code</h3><p>Same as today, in Claude Code, Cursor or any agent you like.</p></div>
<div class="card">${flag('i')}<h3>2. It runs SIGSHIP</h3><p>Before saying it's done, it checks the project on your machine. Nothing is uploaded.</p></div>
<div class="card">${flag('g')}<h3>3. It fixes and repeats</h3><p>It fixes each problem in order and runs the check again until the answer is GO.</p></div>
</div></section>

<section class="block" id="setup"><h2>Set it up <span>in a minute.</span></h2>
<div class="ptabs" role="tablist" aria-label="Your AI tool">${setup.map(([id, label], i) => `<button type="button" role="tab" id="t-${id}" aria-controls="p-${id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${label}</button>`).join('')}</div>
${setup.map(([id, , html], i) => `<div role="tabpanel" id="p-${id}" aria-labelledby="t-${id}"${i ? ' hidden' : ''}>${html}</div>`).join('\n')}
<div class="callout"><p><b>Make it a habit for every agent.</b> <code>npx sigship init</code> adds this rule to your project's <code>AGENTS.md</code>, which most coding agents read, plus a pull request check.</p>${code('AGENTS.md', agentRule)}</div></section>

<section class="block"><h2>What your agent gets <span class="dev-tag">For developers</span></h2>
<p class="sub">The MCP server runs locally over stdio, has no dependencies, never changes your files and makes no network calls without a licence key.</p>
<div class="cards">${tools.map((t) => `<div class="card dark"><h3><code>${t.name}</code></h3><p>${esc(t.description)}</p>
<table class="ref"><thead><tr><th>Input</th><th>Type</th><th>Meaning</th></tr></thead><tbody>${t.params.map((p) => `<tr><td><code>${p.name}</code>${p.required ? '' : ' <small>(optional)</small>'}</td><td>${p.type}</td><td>${esc(p.description)}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>
<p class="sub">The server also tells the agent: don't say it's done while the verdict is NO-GO.</p></section>

<section class="block"><h2>Questions</h2><div class="acc">
<details><summary>Does my agent upload my code anywhere?</summary><div class="acc-body"><p>No. SIGSHIP runs on your machine and reads files there. The free tool makes no network calls at all.</p></div></details>
<details><summary>Can SIGSHIP change my code?</summary><div class="acc-body"><p>No. It only reads. Your AI agent makes the fixes, using SIGSHIP's instructions.</p></div></details>
<details><summary>What if a fix needs something outside the code?</summary><div class="acc-body"><p>Some fixes need a key rotated or a dashboard setting changed. The prompt tells your agent to stop and ask you for those.</p></div></details>
<details><summary>Does a GO mean my app is safe?</summary><div class="acc-body"><p>No. GO means these checks found nothing that blocks launch. SIGSHIP uses pattern checks, so it can miss real problems and flag safe code.</p></div></details>
</div></section>
${CTA}`,
};

// ---------- Pricing ----------
const allPlans = TRACKS.flatMap((t) => t.plans);
const planById = Object.fromEntries(allPlans.map((p) => [p.id, p]));
const PLAN_ORDER = ['free', 'pro', 'business', 'solo', 'team', 'agency'];
const plannedCard = (p) => {
  const head = p.items.slice(0, 5), rest = p.items.slice(5);
  return `<article class="plan2 planned"><h3>${esc(p.name)} <span class="tagline">Waitlist</span></h3>
<p class="price">${esc(p.price)} <small>${esc(p.per)}</small></p>
<p class="note">${esc(p.note || '')}</p><p class="who">${esc(p.tagline)}</p>
<div class="cta"><a class="btn-line" href="/#waitlist">Join the waitlist</a></div>
<p class="note">${esc(p.lead)}</p>
<ul class="ticks">${head.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
${rest.length ? `<details><summary>Show all ${p.items.length} features</summary><ul class="ticks">${rest.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></details>` : ''}
<p class="stamp">Planned · arrives at launch</p></article>`;
};
const free = planById.free;
const chip = (planId, v) => {
  const name = planById[planId].name;
  if (v === false) return `<span class="chip off">${name}<span class="sr"> not included</span></span>`;
  return `<span class="chip on">${name}${v === true ? '' : `: ${esc(v)}`}</span>`;
};
const compare = FEATURES.map((g, gi) => `<details${gi === 1 ? ' open' : ''}><summary>${esc(g.group)}<small>${g.rows.length} ${g.rows.length === 1 ? 'item' : 'items'}</small></summary><div class="acc-body">
${g.rows.map(([name, help, cells]) => `<div class="feat-row"><div><b>${esc(name)}</b><span class="h">${esc(help)}</span></div><div class="chips">${cells.map((v, i) => chip(PLAN_ORDER[i], v)).join('')}</div></div>`).join('\n')}
</div></details>`).join('\n');
const pricing = {
  path: '/pricing/',
  title: 'Pricing | SIGSHIP',
  description: 'Start free with the open source tool. Self-hosted Pro and Business, and SIGSHIP Cloud, are on the waitlist.',
  body: `${hero('Pricing', 'Start free. <span>Upgrade when it pays for itself.</span>',
    'The free tool is open source and works today, with no signup and no card. Paid plans are on the waitlist: <b>self-hosted</b> if you want every check on your own machine, <b>Cloud</b> if you want us to keep watch.',
    btnInk('#plans', 'See the plans') + btnLine('#compare', 'Compare every feature'))}

<section class="block" id="plans"><h2>Available <span>today.</span></h2>
<div class="plans2">
<article class="plan2 live"><h3>${esc(free.name)} <span class="tagline live">Live</span></h3><p class="price">${esc(free.price)} <small>${esc(free.per)}</small></p>
<p class="who">${esc(free.tagline)}</p>
<div class="cta"><button class="btn-ink" type="button" data-copy="npx sigship" data-copy-label="npx sigship"><code>$ npx sigship</code><span>Copy</span></button><a class="btn-line" href="/docs/">Read the docs</a></div>
<ul class="ticks">${free.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></article>
<article class="plan2 live"><h3>Pilot review <span class="tagline live">Available now</span></h3><p class="price">$499 <small>from, one-time</small></p>
<p class="who">A senior zoof04 engineer reads your repo by hand.</p>
<div class="cta"><a class="btn-ink" href="mailto:support@sigship.dev?subject=SIGSHIP%20pilot%20review">Request a pilot review</a></div>
<ul class="ticks"><li>Every file read by a person, not a pattern</li><li>A ranked, written review within 48 hours</li><li>A 30-minute call to walk through it</li><li>Fix prompts for your AI tool</li></ul></article>
</div></section>

<section class="block"><h2>On the <span>waitlist.</span></h2>
<p class="sub">Not sure which kind? <b>Self-hosted</b> is like an app you install: it runs on your machine and your code never leaves. <b>Cloud</b> is like Gmail: we run it for you and watch your live site.</p>
<div class="ptabs" role="tablist" aria-label="Plan type">${TRACKS.map((t, i) => `<button type="button" role="tab" id="pt-${t.id}" aria-controls="pp-${t.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${t.label}</button>`).join('')}</div>
${TRACKS.map((t, i) => `<div role="tabpanel" id="pp-${t.id}" aria-labelledby="pt-${t.id}"${i ? ' hidden' : ''}><p class="sub">${esc(t.blurb)}</p><div class="plans2">${t.plans.filter((p) => p.id !== 'free').map(plannedCard).join('')}</div></div>`).join('\n')}
</section>

<section class="block" id="compare"><h2>Compare <span>every feature.</span></h2>
<p class="sub">Open a group to see which plans include each feature. Free is available now; everything else is planned.</p>
<div class="legend"><span class="chip on">Included</span><span class="chip off">Not included</span></div>
<div class="acc">${compare}</div></section>

<section class="block"><h2>Questions</h2><div class="acc">
<details><summary>Is the free version really free?</summary><div class="acc-body"><p>Yes. It is open source under the MIT licence, needs no signup, has no repo limit and runs on your machine for as long as you like.</p></div></details>
<details><summary>Do you ever see my code?</summary><div class="acc-body"><p>Not with self-hosted: it runs on your machine. With a licence key it sends only the key and a one-way repo fingerprint. Cloud will read your code in an isolated runner, delete it within minutes and keep only the findings.</p></div></details>
<details><summary>What does one-time mean?</summary><div class="acc-body"><p>Pay once and use it for as long as you like. The price includes a year of new checks. After that you can renew, or keep the last version you downloaded, forever.</p></div></details>
<details><summary>Can I switch between self-hosted and Cloud?</summary><div class="acc-body"><p>Yes. Cloud plans include every Pro check.</p></div></details>
<details><summary>When do paid plans open?</summary><div class="acc-body"><p>Soon. Join the waitlist and we will email you once, when your plan opens, with launch pricing.</p></div></details>
<details><summary>What if it is not right for me?</summary><div class="acc-body"><p>Ask within 14 days of your first payment for a full refund. Non-profits and students get a discount: email support@sigship.dev.</p></div></details>
</div></section>
${CTA}`,
};

// ---------- Docs ----------
const DOC_SECTIONS = [
  ['start', 'Quick start'],
  ['report', 'Reading the report'],
  ['fix', 'Fixing problems'],
  ['commands', 'Commands and options'],
  ['exit', 'Exit codes'],
  ['ci', 'Pull request check'],
  ['agents', 'AI coding agents'],
  ['dashboard', 'Browser dashboard'],
  ['keys', 'Licence keys'],
  ['privacy', 'Privacy'],
  ['limits', 'Limits'],
  ['trouble', 'Troubleshooting'],
];
const tocList = `<ol>${DOC_SECTIONS.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol>`;
const nodeMin = pkg.engines.node.replace('>=', '');
const docs = {
  path: '/docs/',
  title: 'Docs | SIGSHIP',
  description: 'How to install, run and read SIGSHIP, fix what it finds with your AI tool, and add it to pull requests and coding agents.',
  body: `${hero('Docs', 'Get started <span>in one command.</span>', 'Everything you need to run SIGSHIP, read what it says and fix what it finds. If you have never used a terminal, start with <b>Quick start</b>.')}
<details class="toc-m"><summary>On this page</summary>${tocList}</details>
<div class="docs"><nav class="toc" aria-label="On this page"><p>On this page</p>${tocList}</nav><div class="doc-body">

<h2 id="start">Quick start</h2>
<p>You need <a href="https://nodejs.org">Node.js</a> ${nodeMin} or newer. Open a terminal in your project folder and run:</p>
${code('Terminal', 'npx sigship')}
<p>That's it. No signup, no install, no config. SIGSHIP reads your project, prints what it found, and ends with <b>GO</b> or <b>NO-GO</b>.</p>
<div class="callout"><p><b>Never used a terminal?</b> On a Mac, open the Terminal app. On Windows, open PowerShell. Type <code>cd</code>, a space, drag your project folder into the window, press Enter, then run the command above. Built your app in Lovable, Bolt or Replit? Export it to GitHub first and download it, or ask your AI tool to run SIGSHIP for you.</p></div>

<h2 id="report">Reading the report</h2>
<p>Each problem has a severity, a plain title, where it is (<code>file:line</code>), and what happens in production if you ship it.</p>
<table class="ref"><thead><tr><th>Severity</th><th>What it means</th></tr></thead><tbody>
<tr><td><b>SEV-1</b></td><td>Blocks launch. Exposes your data or money, like a leaked key or an open database table.</td></tr>
<tr><td><b>SEV-2</b></td><td>Blocks launch. Makes abuse easy, like an AI route with no spending limit.</td></tr>
<tr><td><b>SEV-3</b></td><td>Worth fixing. Reported, but blocks only with <code>--strict</code>.</td></tr></tbody></table>
<p>The last line is the verdict. <b>GO</b> means these checks found nothing that blocks launch. It does not prove your app is safe.</p>

<h2 id="fix">Fixing problems</h2>
<p>You don't have to fix things by hand. Print every fix as one prompt and paste it into your AI tool:</p>
${code('Terminal', 'npx sigship --prompt')}
<p>Your AI tool makes the changes. Run <code>npx sigship</code> again, and repeat until it says GO. Each check also has its own page explaining the fix, linked from the <a href="/#checks">full list</a>.</p>

<h2 id="commands">Commands and options <span class="dev-tag">Reference</span></h2>
<table class="ref"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody>
<tr><td><code>npx sigship [folder]</code></td><td>Check a project and print the report.</td></tr>
<tr><td><code>npx sigship ui [folder]</code></td><td>Open the browser dashboard for the project.</td></tr>
<tr><td><code>npx sigship init [folder]</code></td><td>Add the pull request check and the agent rule.</td></tr>
<tr><td><code>npx sigship mcp</code></td><td>Start the MCP server for coding agents.</td></tr></tbody></table>
<table class="ref"><thead><tr><th>Option</th><th>What it does</th></tr></thead><tbody>
<tr><td><code>--prompt</code></td><td>Print every fix as one prompt for your AI tool.</td></tr>
<tr><td><code>--json</code></td><td>Print the result as JSON.</td></tr>
<tr><td><code>--markdown</code></td><td>Print the result as Markdown, for pull request comments.</td></tr>
<tr><td><code>--strict</code></td><td>Also block on SEV-3.</td></tr>
<tr><td><code>--report</code></td><td>Write <code>sigship-report.html</code> for a client. Needs a licence key.</td></tr>
<tr><td><code>--no-open</code></td><td>With <code>ui</code>, print the dashboard link without opening a browser.</td></tr>
<tr><td><code>--version</code>, <code>--help</code></td><td>Print the version or the help.</td></tr></tbody></table>

<h2 id="exit">Exit codes <span class="dev-tag">Reference</span></h2>
<table class="ref"><thead><tr><th>Code</th><th>Meaning</th></tr></thead><tbody>
<tr><td><code>0</code></td><td>GO. No SEV-1 or SEV-2 findings.</td></tr>
<tr><td><code>1</code></td><td>NO-GO. Something blocks launch.</td></tr>
<tr><td><code>2</code></td><td>SIGSHIP could not run, for example the folder does not exist.</td></tr></tbody></table>
<p>Scripts and CI can rely on these, which is what makes SIGSHIP a real test for done.</p>

<h2 id="ci">Pull request check</h2>
${code('Terminal', 'npx sigship init')}
<p>This adds <code>.github/workflows/sigship.yml</code>, a GitHub check that fails when a pull request brings back a SEV-1 or SEV-2 problem, and a definition of done in <code>AGENTS.md</code>. It never overwrites a file that already exists.</p>

<h2 id="agents">AI coding agents</h2>
<p>Connect SIGSHIP to Claude Code, Cursor or any MCP app so your agent checks its own work. Setup for each tool is on the <a href="/ai-agents/">AI agents page</a>.</p>

<h2 id="dashboard">Browser dashboard</h2>
${code('Terminal', 'npx sigship ui')}
<p>Opens a private dashboard with the verdict, every finding, a button to copy the fix prompt and a re-run button. It runs on your computer only: it listens on <code>127.0.0.1</code>, answers only the private link it prints, and shows findings, never your files. Press Ctrl+C to stop it.</p>

<h2 id="keys">Licence keys</h2>
<p>Paid plans are on the waitlist. If you already have a licence key, set it to add the Pro pack of extra checks:</p>
${code('Terminal', 'SIGSHIP_KEY=your-key npx sigship')}
<p>For pull request comments and a nightly check, run <code>npx sigship init --pro</code> and add the key as the repository secret <code>SIGSHIP_KEY</code>. If the licence server can't be reached, SIGSHIP uses its last download of the Pro pack or the free checks. A network problem never fails a scan.</p>

<h2 id="privacy">Privacy</h2>
<ul><li>The free tool, the dashboard and the MCP server run entirely on your machine, with no network calls and no telemetry.</li>
<li>SIGSHIP never prints a secret value, in any output.</li>
<li>With a licence key, and only then, it sends the key and a one-way repo fingerprint. Never code, file names or findings.</li></ul>
<p>Full details are in the <a href="/privacy/">privacy policy</a>.</p>

<h2 id="limits">Limits</h2>
<ul><li>SIGSHIP uses pattern checks. It can miss real problems and flag safe code.</li>
<li>It reads your repo, so it can't see settings changed only in a dashboard, such as Supabase policies made in the web console.</li>
<li>A GO is not a security audit. For a person to read your code, see the <a href="/pricing/">pilot review</a>.</li></ul>

<h2 id="trouble">Troubleshooting</h2>
<div class="acc">
<details><summary>"npx: command not found" or a Node.js error</summary><div class="acc-body"><p>Install Node.js ${nodeMin} or newer from nodejs.org, open a new terminal and try again. Check your version with <code>node --version</code>.</p></div></details>
<details><summary>It flagged something that is safe</summary><div class="acc-body"><p>Pattern checks can be wrong. Please <a href="${GH}/issues/new/choose">report a false positive</a> with the smallest code that shows it, without any real secrets.</p></div></details>
<details><summary>It missed a real problem</summary><div class="acc-body"><p>Tell us with the same form, and suggest a new check in <a href="${GH}/discussions">Discussions</a>.</p></div></details>
<details><summary>Getting an old version</summary><div class="acc-body"><p>Run <code>npx sigship@latest</code> to make sure you have the newest checks. This is version ${pkg.version}.</p></div></details>
</div>
<p>Still stuck? Ask in the <a href="/community/">community</a> or email <a href="mailto:support@sigship.dev">support@sigship.dev</a>.</p>
</div></div>
${CTA}`,
};

// ---------- Changelog ----------
const changelogMd = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const releases = changelogMd.split(/^## /m).slice(1).map((chunk) => {
  const [head, ...rest] = chunk.split('\n');
  const [version, date] = head.split(/\s+—\s+/);
  const groups = rest.join('\n').split(/^### /m).slice(1).map((g) => {
    const [name, ...lines] = g.split('\n');
    return { name: name.trim(), items: lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)) };
  });
  return { version: version.trim(), date: (date || '').trim(), groups };
});
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const changelog = {
  path: '/changelog/',
  title: 'Changelog | SIGSHIP',
  description: 'Every SIGSHIP release and what changed.',
  body: `${hero('Changelog', 'What\'s new <span>in SIGSHIP.</span>', `Every release, newest first. You are on version <b>${pkg.version}</b> if you run <code>npx sigship@latest</code>.`,
    btnLine(`${GH}/releases`, 'GitHub releases') + btnLine('https://www.npmjs.com/package/sigship', 'npm package') + btnLine('/roadmap/', "What's next"))}
<div class="timeline">${releases.map((r, i) => `<article class="tl-item${i === 0 ? ' latest' : ''}" id="v${r.version.replace(/\./g, '-')}">
<div class="tl-head"><h2 class="v">${esc(r.version)}</h2><time datetime="${esc(r.date)}">${esc(r.date)}</time>${i === 0 ? '<span class="pill">Latest</span>' : ''}</div>
${r.groups.map((g) => `<h3>${esc(g.name)}</h3><ul>${g.items.map((it) => `<li>${inline(it)}</li>`).join('')}</ul>`).join('')}
</article>`).join('\n')}</div>
${CTA}`,
};

// ---------- Roadmap ----------
// Plain-language highlights; the full detail lives on the changelog page.
const SHIPPED = [
  ['0.1.0', '17 checks, a GO or NO-GO verdict and fix prompts for your AI tool'],
  ['0.1.0', 'Pull request check and an MCP server for coding agents'],
  ['0.2.0', 'Licence keys, the Pro pack and reports for clients'],
  ['0.3.0', 'A private dashboard in your browser'],
  ['0.3.1', 'Newer Node.js, a security policy and a contribution guide'],
];
const NEXT = ['More checks: deep Supabase policies, security headers, login rate limits', 'Risky and look-alike packages', 'Secrets in your git history', 'Pre-commit hook', 'Pull request comments and a nightly check', 'Reports and a pre-launch checklist for clients', 'Accepted-risk notes, so known issues stay quiet', 'Slack, Discord and email alerts'];
const LATER = ['Connect a repo from GitHub, Lovable, Bolt or Replit', 'Checks on every push, plus a nightly check', 'Watch your live site: SSL, domain, downtime and new problems', 'A launch-readiness score and history', 'One-click fix pull requests', 'A "Checked by SIGSHIP" badge', 'Team roles, activity log and white-label reports'];
const lane = (items) => items.map((i) => `<li>${esc(i)}</li>`).join('');
const roadmap = {
  path: '/roadmap/',
  title: 'Roadmap | SIGSHIP',
  description: 'What SIGSHIP has shipped, what is planned next, and how to suggest ideas.',
  body: `${hero('Roadmap', 'Where SIGSHIP <span>is going.</span>', 'What is live, what is planned next, and what comes after. Plans can change and <b>we don\'t promise dates</b>. Tell us what matters to you in Discussions.',
    btnInk(`${GH}/discussions`, 'Suggest an idea') + btnLine('/changelog/', 'See the changelog'))}
<div class="lanes">
<section class="lane"><h3><span class="dot green"></span>Shipped</h3><p>Live now, in the free tool.</p><ul>
${SHIPPED.map(([v, t]) => `<li><b>${v}</b> · ${esc(t)}</li>`).join('')}</ul></section>
<section class="lane dashed"><h3><span class="dot warm"></span>Next: self-hosted Pro and Business</h3><p>Planned, on the waitlist.</p><ul>
${lane(NEXT)}</ul></section>
<section class="lane dashed"><h3><span class="dot"></span>Later: SIGSHIP Cloud</h3><p>Planned, on the waitlist.</p><ul>
${lane(LATER)}</ul></section>
</div>
<section class="block"><h2>Have an idea?</h2><p class="sub">The roadmap follows what builders need. Suggest a check, vote on ideas, or tell us how you use SIGSHIP.</p>
<div class="acts-row">${btnInk(`${GH}/discussions`, 'Open Discussions')}${btnLine(`${GH}/issues/new/choose`, 'Suggest a check')}</div></section>
${CTA}`,
};

// ---------- Resources ----------
const resources = {
  path: '/resources/',
  title: 'Resources | SIGSHIP',
  description: 'Docs, changelog, roadmap, releases, community and brand resources for SIGSHIP.',
  body: `${hero('Resources', 'Everything around <span>SIGSHIP.</span>', 'Guides, release notes, plans and the people building it.')}
<div class="cards">
<a class="card" href="/docs/">${icon('book')}<h3>Docs</h3><p>Install, run, read the report and fix what it finds.</p></a>
<a class="card" href="/changelog/">${icon('clock')}<h3>Changelog</h3><p>Every release and what changed.</p></a>
<a class="card" href="/roadmap/">${icon('map')}<h3>Roadmap</h3><p>What is live, what is next, and what comes after.</p></a>
<a class="card" href="${GH}/releases">${icon('tag')}<h3>Releases</h3><p>Tagged versions with notes, on GitHub.</p></a>
<a class="card" href="/ai-agents/">${icon('agent')}<h3>AI agents</h3><p>Connect SIGSHIP to Claude Code, Cursor and other agents.</p></a>
<a class="card" href="/#checks">${icon('shield')}<h3>All ${RULES.length} checks</h3><p>What each one catches and how to fix it.</p></a>
<a class="card" href="/community/">${icon('heart')}<h3>Community</h3><p>Ask questions, share ideas and get help.</p></a>
<a class="card" href="https://www.npmjs.com/package/sigship">${icon('pkg')}<h3>npm package</h3><p>Version ${pkg.version}, zero dependencies.</p></a>
<a class="card" href="${GH}/blob/main/SECURITY.md">${icon('lock')}<h3>Security policy</h3><p>How to report a problem in SIGSHIP itself.</p></a>
<a class="card" href="/brand/">${icon('spark')}<h3>Brand</h3><p>Logos, colours and the story behind the flags.</p></a>
</div>
${CTA}`,
};

// ---------- Community ----------
const discordCard = DISCORD_URL
  ? `<a class="card dark" href="${esc(DISCORD_URL)}">${LOGO.discord}<h3>Discord</h3><p>Chat with other builders and the team behind SIGSHIP.</p><span class="more">Join the Discord →</span></a>`
  : `<div class="card dark">${LOGO.discord}<span class="tagline">Opening soon</span><h3>Discord</h3><p>A place to chat with other builders and the team. Opening soon; until then, Discussions is the place to talk.</p></div>`;
const community = {
  path: '/community/',
  title: 'Community and help | SIGSHIP',
  description: 'Get help with SIGSHIP, ask questions, suggest checks and contribute.',
  body: `${hero('Community', 'Built in the open, <span>with builders.</span>', 'Ask a question, suggest a check, report something it got wrong, or help build it. <b>Every message is read by the team.</b>',
    btnInk(`${GH}/discussions`, 'Ask a question') + btnLine('/docs/', 'Read the docs'))}
<div class="cards">
<a class="card dark" href="${GH}">${LOGO.github}<h3>GitHub</h3><p>The code, releases and issues. Star it to follow along.</p><span class="more">Open on GitHub →</span></a>
${discordCard}
<a class="card" href="${GH}/discussions">${icon('heart')}<h3>Discussions</h3><p>Questions, ideas and show-and-tell. The best place to talk today.</p></a>
<a class="card" href="${GH}/issues/new/choose">${icon('shield')}<h3>Report a false positive</h3><p>It flagged safe code, or missed a real problem? Tell us with the smallest example.</p></a>
<a class="card" href="${GH}/blob/main/CONTRIBUTING.md">${icon('code')}<h3>Contribute</h3><p>Add a check or fix a bug. The guide shows how, tests included.</p></a>
<a class="card" href="${GH}/blob/main/SECURITY.md">${icon('lock')}<h3>Report a security problem</h3><p>Found a problem in SIGSHIP itself? Report it privately, not in public.</p></a>
<a class="card" href="mailto:support@sigship.dev">${icon('mail')}<h3>Email us</h3><p>support@sigship.dev for anything else, including pilot reviews.</p></a>
</div>
<section class="block"><h2>Getting help</h2><div class="acc">
<details open><summary>Where should I ask a question?</summary><div class="acc-body"><p>Start a thread in <a href="${GH}/discussions">GitHub Discussions</a>. Others can learn from the answer too. For anything private, email support@sigship.dev.</p></div></details>
<details><summary>What should a bug report include?</summary><div class="acc-body"><p>Your SIGSHIP version (<code>npx sigship --version</code>), your operating system and Node.js version, and the smallest code that shows the problem. Never include real keys or customer data.</p></div></details>
<details><summary>Can I suggest a new check?</summary><div class="acc-body"><p>Yes, please. Tell us what goes wrong in production and what it looks like in code, using the "Idea for a check" form on GitHub.</p></div></details>
</div></section>
${CTA}`,
};

export const PRODUCT_PAGES = [features, agents, pricing, docs, resources, changelog, roadmap, community];
