// The product pages: features, AI agents, pricing, docs, resources, changelog, roadmap and community.
// Plain English first; technical detail only where developers need it.
// Facts come from the code (checks, plans, the changelog, the MCP tools, the real demo capture), so pages can't drift.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/rules.js';
import { FEATURES, TRACKS } from './pricing.js';
import { COUNTS, NOTICES, PLANNED_RULES, STACKS, STATUS, WATCHING, bridge, fmtDate, noticeList, watchline } from './lookout.js';
import { TIERS, plaques } from './flags.js';

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
<div><div class="cta-cmd dev-only"><code>$ npx sigship</code><button class="copy-btn" type="button" data-copy="npx sigship" data-copy-label="npx sigship">Copy</button></div><a class="btn-ink cta-go plain-only" href="/guides/check-lovable-bolt-replit-app/">Check my app, free</a>
<div class="cta-links"><a href="/docs/">Read the docs</a><a href="/pricing/">See pricing</a><a href="/lookout/">The Lookout</a></div></div>
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
  title: 'Features: what SIGSHIP checks in your AI-built app | SIGSHIP',
  description: 'What SIGSHIP finds in apps built with Lovable, Bolt, Cursor or Replit: leaked API keys, open Supabase tables, fake payments and runaway AI bills, plus the fix.',
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
<div class="card">${icon('agent')}<h3>Your AI coding agent</h3><p>Connect it to Claude Code, Cursor and others, with one rule: the job isn't done until SIGSHIP says GO.</p><a class="more" href="/ai-agents/">AI agents →</a></div>
</div></section>

<section class="block"><h2>Private <span>by design.</span></h2>
<div class="cards">
<div class="card">${icon('lock')}<h3>Nothing leaves your machine</h3><p>The free tool makes no network calls. Your code, keys and findings stay with you.</p></div>
<div class="card">${icon('eye')}<h3>Never prints a secret</h3><p>When it finds a leaked key it tells you where, never what.</p></div>
<div class="card">${icon('code')}<h3>Open source</h3><p>Free to use, with all the code public on GitHub, so anyone can check what it does.</p><a class="more" href="${GH}">GitHub →</a></div>
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
  title: 'AI agents: connect SIGSHIP to Claude Code, Cursor and MCP | SIGSHIP',
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
<p class="sub">The technical details for the curious. The MCP server runs locally over stdio, has no dependencies, never changes your files and makes no network calls without a licence key.</p>
<div class="tools">${tools.map((t) => `<article class="tool"><div class="tool-name"><code>${t.name}</code><p>${esc(t.description)}</p></div>
<dl class="tool-params">${t.params.map((p) => `<div><dt><code>${p.name}</code><span>${p.type}${p.required ? '' : ' · optional'}</span></dt><dd>${esc(p.description)}</dd></div>`).join('')}</dl></article>`).join('')}</div>
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
const TICK = '<svg class="tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>';
const TRACK_UI = {
  self: { tab: 'On my machine', sub: 'Self-hosted', ids: ['free', 'pro', 'business'], note: 'Pay once and keep it. Includes a year of new checks.' },
  cloud: { tab: 'Run it for me', sub: 'Cloud', ids: ['solo', 'team', 'agency'], note: 'Every Cloud plan includes every Pro check. The free tool still works on your machine.' },
};
const planCard = (p) => {
  const live = p.id === 'free';
  const top = p.items.slice(0, 4), rest = p.items.slice(4);
  const cta = live
    ? `<a class="btn-ink plain-only" href="/guides/check-lovable-bolt-replit-app/">Check my app, free</a><button class="btn-ink dev-only" type="button" data-copy="npx sigship" data-copy-label="npx sigship"><code>$ npx sigship</code><span>Copy</span></button>`
    : `<a class="${p.featured ? 'btn-ink' : 'btn-line'}" href="/#waitlist">Join the waitlist</a>`;
  return `<article class="pc${p.featured ? ' featured' : ''}">
${p.featured ? '<p class="pc-flag">Best for most</p>' : ''}<div class="pc-head"><h3>${esc(p.name)}</h3><span class="pill ${live ? 'live' : 'wait'}">${live ? 'Available now' : 'Waitlist'}</span></div>
<p class="pc-who">${esc(p.tagline)}</p>
<p class="pc-price"><b>${esc(p.price)}</b><span>${esc(p.per)}</span></p>
${cta}
<p class="pc-lead">${esc(live ? 'What you get' : p.lead)}</p>
<ul class="pc-list">${top.map((i) => `<li>${TICK}${esc(i)}</li>`).join('')}</ul>
${rest.length ? `<details class="pc-more"><summary>See all ${p.items.length} features</summary><ul class="pc-list">${rest.map((i) => `<li>${TICK}${esc(i)}</li>`).join('')}</ul></details>` : ''}
</article>`;
};
const cell = (v) => v === true ? `${TICK}<span class="sr">Included</span>` : v === false ? '<span class="no" aria-hidden="true">–</span><span class="sr">Not included</span>' : `<span class="txt">${esc(v)}</span>`;
const compareFor = (ui) => {
  const cols = ui.ids.map((id) => PLAN_ORDER.indexOf(id));
  const groups = FEATURES.map((g) => ({ ...g, rows: g.rows.filter(([, , c]) => cols.some((i) => c[i] !== false)) })).filter((g) => g.rows.length);
  const table = (g) => `<table class="cmp"><caption>${esc(g.group)}</caption><colgroup><col><col><col><col></colgroup><tbody>
${g.rows.map(([name, help, c]) => `<tr><th scope="row">${esc(name)}<small>${esc(help)}</small></th>${cols.map((i) => `<td>${cell(c[i])}</td>`).join('')}</tr>`).join('\n')}
</tbody></table>`;
  const count = groups.reduce((n, g) => n + g.rows.length, 0);
  return `<div class="cmp-wrap"><div class="cmp-head" aria-hidden="true"><span>Compare</span>${ui.ids.map((id) => `<b>${planById[id].name}</b>`).join('')}</div>
${groups.slice(0, 2).map(table).join('\n')}
<details class="cmp-more"><summary><span class="closed">Show all ${count} features</span><span class="opened">Show fewer</span></summary>${groups.slice(2).map(table).join('\n')}</details></div>`;
};
const pricing = {
  path: '/pricing/',
  title: 'Pricing: free forever, plus self-hosted and Cloud plans | SIGSHIP',
  description: 'SIGSHIP is free and open source, with no signup. Self-hosted Pro and Business, and SIGSHIP Cloud for vibe coders and teams, are on the waitlist.',
  body: `${hero('Pricing', 'Simple pricing. <span>Start free.</span>',
    'The free tool works today with no signup and no card. Paid plans are on the waitlist and open soon. <b>First, pick how you want to run it.</b>')}

<section class="block pr-pick" id="plans" aria-label="Plans">
<div class="seg" role="tablist" aria-label="How you want to run it">${Object.entries(TRACK_UI).map(([id, ui], i) => `<button type="button" role="tab" id="pt-${id}" aria-controls="pp-${id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}><b>${ui.tab}</b><small>${ui.sub}</small></button>`).join('')}</div>
${Object.entries(TRACK_UI).map(([id, ui], i) => `<div role="tabpanel" id="pp-${id}" aria-labelledby="pt-${id}"${i ? ' hidden' : ''}>
<p class="seg-note">${esc(ui.note)}</p>
<div class="pcs">${ui.ids.map((pid) => planCard(planById[pid])).join('')}</div>
<h2 class="cmp-title">What's included</h2>
${compareFor(ui)}
</div>`).join('\n')}
</section>

<section class="pilot" aria-labelledby="pilot-h">
<div><span class="pill live">Available now</span><h2 id="pilot-h">Want a person to read your code?</h2><p>A senior zoof04 engineer reviews your repo by hand. You get a ranked written review within 48 hours, a 30-minute call, and fix prompts for your AI tool.</p></div>
<div class="pilot-buy"><p class="pc-price"><b>$499</b><span>from, one-time</span></p><a class="btn-ink" href="mailto:support@sigship.dev?subject=SIGSHIP%20pilot%20review">Request a pilot review</a></div>
</section>

<section class="block"><h2>Not sure <span>which one?</span></h2>
<div class="guide">
<div><b>Just trying it out</b><span>Use <a href="/docs/">Free</a>. It's the real tool, forever.</span></div>
<div><b>Launching to real users</b><span><b>Pro</b> adds every check, on your own machine.</span></div>
<div><b>Want someone to keep watch</b><span><b>Cloud Solo</b> checks every change and your live site.</span></div>
</div></section>

<section class="block"><h2>Questions</h2><div class="acc">
<details><summary>Is the free version really free?</summary><div class="acc-body"><p>Yes. It's open source under the MIT licence, needs no signup, has no repo limit and runs on your machine for as long as you like.</p></div></details>
<details><summary>What's the difference between self-hosted and Cloud?</summary><div class="acc-body"><p>Self-hosted runs on your own computer and GitHub, like an app you install: your code never leaves. Cloud is run for you, like Gmail: connect a repo and we check every change and watch your live site.</p></div></details>
<details><summary>Do you ever see my code?</summary><div class="acc-body"><p>Not with self-hosted. With a licence key it sends only the key and a one-way repo fingerprint. Cloud will read your code in an isolated runner, delete it within minutes and keep only the findings.</p></div></details>
<details><summary>What does one-time mean?</summary><div class="acc-body"><p>Pay once and use it for as long as you like. The price includes a year of new checks. After that you can renew, or keep the version you have, forever.</p></div></details>
<details><summary>When do paid plans open?</summary><div class="acc-body"><p>Soon. Join the waitlist and we'll email you once, when your plan opens, with launch pricing.</p></div></details>
<details><summary>What if it isn't right for me?</summary><div class="acc-body"><p>Ask within 14 days of your first payment for a full refund. Non-profits and students get a discount: email support@sigship.dev.</p></div></details>
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
  title: 'Docs: install and run SIGSHIP in one command | SIGSHIP',
  description: 'How to install, run and read SIGSHIP, fix what it finds with your AI tool, and add it to pull requests and coding agents.',
  body: `${hero('Docs', 'Get started <span>in one command.</span>', 'Everything you need to run SIGSHIP, read what it says and fix what it finds. If you have never used a terminal, start with <b>Quick start</b>, and keep the <a href="/glossary/">plain-English glossary</a> open for any word you don\'t know.')}
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
  title: 'Changelog: every SIGSHIP release | SIGSHIP',
  description: 'Every SIGSHIP release, newest first: new checks, the browser dashboard, licence keys, MCP support and what changed in each version.',
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
  title: 'Roadmap: what is live and what is next | SIGSHIP',
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

// ---------- The Lookout ----------
// A living watch, not a changelog: every notice is a real incident or advisory, mapped to a check.
const stackChips = Object.entries(STACKS).filter(([k]) => NOTICES.some((n) => n.stack.includes(k)));
const statusChips = Object.entries(STATUS).filter(([k]) => NOTICES.some((n) => n.status === k));
const lookout = {
  path: '/lookout/',
  title: 'The Lookout: new ways hackers get into AI-built apps, and what SIGSHIP does about each | SIGSHIP',
  description: `${COUNTS.total} notices on real attacks and leaks hitting apps built with Lovable, Bolt, Cursor and Supabase, each mapped to the SIGSHIP check that covers it, is being written, or is still being watched. New notice most Mondays.`,
  head: `<link rel="alternate" type="application/feed+json" title="SIGSHIP Lookout" href="/lookout/feed.json">\n<link rel="alternate" type="application/rss+xml" title="SIGSHIP Lookout" href="/lookout/rss.xml">`,
  ld: [{ '@type': 'CollectionPage', name: 'The SIGSHIP Lookout', url: 'https://sigship.dev/lookout/', description: 'New ways attackers get into AI-built apps, each mapped to what SIGSHIP covers, is writing, or is watching.', hasPart: NOTICES.map((n) => ({ '@type': 'Article', headline: n.title.plain, datePublished: n.date, url: `https://sigship.dev/lookout/#${n.slug}`, citation: n.sources.map(([, u]) => u) })) }],
  body: `${hero('The Lookout', '<span class="plain-only">New ways in are found every week. <span>We keep watch.</span></span><span class="dev-only">Notices to mariners. <span>New attack patterns, mapped to rules.</span></span>',
    `<span class="plain-only">What attackers are doing to apps like yours right now, in plain words, and what SIGSHIP does about each one. Not a changelog: a watch. New checks start here.</span><span class="dev-only">Advisories, incidents and research that touch AI-built stacks, each mapped to the rule that covers it, the one being written, or an honest "watching". Rules are born here.</span>`)}
<div class="rv">${bridge(RULES.length)}</div>
${watchline()}
<div class="fchips rv" role="group" aria-label="Filter by what SIGSHIP does"><span class="lk-count" style="margin-right:6px">Show</span><button class="fchip" type="button" data-fs="all" aria-pressed="true">All</button>${statusChips.map(([k, s]) => `<button class="fchip" type="button" data-fs="${k}" aria-pressed="false"><i class="${s.cls}" style="background:currentColor"></i><span class="plain-only">${esc(s.plain.replace(' since 0.1.0', ''))}</span><span class="dev-only">${esc(s.dev)}</span></button>`).join('')}</div>
<div class="fchips rv" role="group" aria-label="Filter by what you build with" style="margin-top:10px"><span class="lk-count" style="margin-right:6px">For</span><button class="fchip" type="button" data-fk="all" aria-pressed="true">Everything</button>${stackChips.map(([k, name]) => `<button class="fchip" type="button" data-fk="${k}" aria-pressed="false">${esc(name)}</button>`).join('')}</div>
<div class="lk-grid">
<div>
<p class="lk-count" id="lk-count" aria-live="polite">Showing ${NOTICES.length} of ${NOTICES.length} notices</p>
${noticeList()}
<p class="mini-note" style="margin-top:20px">Newest first. Dates are when the notice was published by its first source. "Spotted by" credits the researcher or outlet that found it, never us, unless it was us.</p>
</div>
<aside class="side">
<div class="card" id="subscribe">
<h3><span class="plain-only">The Monday notice, by email</span><span class="dev-only">Subscribe</span></h3>
<p><span class="plain-only">One short email most Mondays: what's new, who it affects, what to do. No marketing, unsubscribe in one click.</span><span class="dev-only">Plain-text digest most Mondays. Or take the feeds below and skip the inbox.</span></p>
<form class="lk-sub" method="post" action="/api/waitlist" novalidate data-ok="All aboard. The next Monday notice will find you.">
<label class="sr" for="lk-email">Email</label>
<div class="field"><input id="lk-email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com" aria-describedby="lk-err"><button class="btn-ink" type="submit">Keep me posted</button></div>
<input type="hidden" name="plan" value="lookout"><input type="hidden" name="started" value="">
<div class="hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>
<p class="wl-err" id="lk-err" hidden>Enter an email address, like you@example.com.</p>
</form>
<p class="lk-ok" hidden tabindex="-1"></p>
<p class="mini-note dev-only" style="margin-top:12px"><a href="/lookout/feed.json">feed.json</a> · <a href="/lookout/rss.xml">rss.xml</a></p>
</div>
<div class="card">
<h3>How a notice becomes a check</h3>
<ol class="nsteps">
<li><b>Spotted</b>A researcher, a vendor advisory or a reader reports a new way in.</li>
<li><b>Read and mapped</b>We work out which apps it touches and whether a check already covers it.</li>
<li><b>Written as a rule</b>If it can be found in code with confidence, it becomes a check: a pattern, a plain explanation and a fix.</li>
<li><b>Shipped</b>Free checks ship in the open source tool. Deeper ones join the Pro pack. The notice is updated to say so.</li>
</ol>
<p class="mini-note">Being written now: ${PLANNED_RULES.length ? PLANNED_RULES.map((r) => `<code>${esc(r)}</code>`).join(', ') : 'nothing at the moment'}.</p>
</div>
<div class="card">
<h3>What we watch</h3>
<div class="watchlist">${WATCHING.map((w) => `<div>${esc(w)}</div>`).join('')}</div>
<p class="mini-note" style="margin-top:12px">Build with something else? <a href="${GH}/discussions">Tell us</a> and we add it to the watch.</p>
</div>
<div class="card">
<h3>Spotted something?</h3>
<p>A new leak, a new trick, a scary thread. Send it and we'll read it. Confirmed reports are credited in the notice and, if it becomes a check, in the check's source.</p>
<div class="acts-row" style="margin-top:12px">${btnLine(`${GH}/issues/new/choose`, 'Report a pattern')}${btnLine('mailto:support@sigship.dev?subject=Lookout%20tip', 'Email a tip')}</div>
</div>
</aside>
</div>
<section class="block"><h2>Questions</h2><div class="acc">
<details><summary>Is this a list of every vulnerability on the internet?</summary><div class="acc-body"><p>No. It is the ones that touch apps built with AI tools: Lovable, Bolt, Cursor, v0, Replit, Supabase, Firebase, Next.js, Stripe and the AI providers. Big, general CVE databases exist; this is the short, relevant list, in plain words.</p></div></details>
<details><summary>What do the statuses mean?</summary><div class="acc-body"><p>Covered: a check in the free tool finds it today. Partly covered: SIGSHIP catches the damage, not the cause. Check being written: a rule is in progress and is named. Watching: no check yet, so the notice says what to do by hand.</p></div></details>
<details><summary>Does SIGSHIP fetch this list when I run it?</summary><div class="acc-body"><p>No. The free tool makes no network calls. Checks ship inside the package, so run <code>npx sigship@latest</code> to get the newest ones.</p></div></details>
<details><summary>Can I get it as a feed?</summary><div class="acc-body"><p>Yes: <a href="/lookout/feed.json">JSON Feed</a> and <a href="/lookout/rss.xml">RSS</a>. Both carry the plain summary, the technical summary, the fix and the sources.</p></div></details>
</div></section>
${CTA}`,
};

// ---------- The GO flags ----------
const TIER_ROW = (t) => `<article class="card fg-card" id="${t.id}">
<div class="fg-top">${t.status === 'live' ? '<span class="pill live">Available now</span>' : '<span class="pill wait">Opens with Cloud plans</span>'}<span class="fg-lv">Level ${t.level} · flag ${t.flag}</span></div>
<h3>${esc(t.name)}</h3>
<dl class="kv">
<dt>Who</dt><dd>${esc(t.who)}</dd>
<dt>Proof</dt><dd>${esc(t.proof)}</dd>
<dt>How</dt><dd>${esc(t.how)}</dd>
<dt>Cost</dt><dd>${esc(t.earn)}</dd>
</dl>
</article>`;
const BADGE_MD = `[![SIGSHIP: cleared](https://sigship.dev/flags/cleared.svg)](https://sigship.dev/flags/#cleared)`;
const BADGE_HTML = `<a href="https://sigship.dev/flags/#cleared"><img src="https://sigship.dev/flags/cleared.svg" alt="SIGSHIP: cleared. The owner ran all ${RULES.length} checks and they passed." height="24"></a>`;
const flags = {
  path: '/flags/',
  title: 'GO flags: Cleared, Verified and Pilot on board | SIGSHIP',
  description: 'Three signal flags for apps that passed SIGSHIP: Cleared (free, self-declared), Verified (checked nightly by SIGSHIP Cloud) and Pilot on board (reviewed by a person). What each proves, how to earn it, and how to add it to your README or site.',
  ld: [{ '@type': 'ItemList', name: 'SIGSHIP GO flags', itemListElement: TIERS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name} (flag ${t.flag})`, description: t.plain, url: `https://sigship.dev/flags/#${t.id}` })) }],
  body: `${hero('GO flags', '<span class="plain-only">Passed the check? <span>Show the world.</span></span><span class="dev-only">Passed? <span>Hoist the flag.</span></span>',
    'Three real signal flags from the International Code of Signals, three levels of proof. Each one says exactly what was checked, by whom, and when.<span class="plain-only"> Hover a flag.</span>')}
<div class="fg-band">${plaques()}</div>
<section class="block"><h2>What each flag <span>proves.</span></h2>
<p class="sub">A flag says the owner checked before launching. It is not a security certificate or an audit, and every flag page says that too.</p>
<div class="cards fg-cards">${TIERS.map(TIER_ROW).join('\n')}</div>
<div class="verify-strip"><b>How to tell a real flag:</b> <span>Cleared is the owner's word, and the badge says so. Verified and Pilot flags link to a page on sigship.dev that shows the date, the checks and, for a pilot review, the reviewer. If that page doesn't exist, the flag isn't real.</span></div>
</section>
<section class="block" id="cleared-badge"><h2>Add the Cleared flag <span>in a minute.</span></h2>
<div class="split2"><div>
<p><span class="plain-only">Run the free check. When it says <b>GO</b>, copy one of these into your README, your site footer or your launch post. It's your way of saying "I checked before I launched."</span><span class="dev-only">Run <code>npx sigship</code>. On exit 0, paste either snippet. The badge is a static SVG with the version in it; it does not call home and it does not update itself.</span></p>
<p class="badge-demo"><img src="/flags/cleared.svg" alt="SIGSHIP: cleared badge" height="24"></p>
<p class="mini-note">Please don't add it while the check says NO-GO. People will run the check too.</p>
</div><div>
${code('Markdown', BADGE_MD)}
${code('HTML', BADGE_HTML)}
</div></div></section>
<section class="block"><h2>Verified and Pilot <span>flags.</span></h2>
<div class="cards">
<div class="card">${flag('c')}<h3>Verified · flag C</h3><p>Comes with SIGSHIP Cloud. We check your app every night; the flag is drawn live with the date of the last pass and turns off by itself if a check fails. Opens with the Cloud plans.</p><a class="more" href="/#waitlist">Join the Cloud waitlist →</a></div>
<div class="card">${flag('h')}<h3>Pilot on board · flag H</h3><p>Comes with a pilot review: a senior zoof04 engineer reads your code by hand and signs a written review. The flag page names the reviewer, the date and the scope.</p><a class="more" href="mailto:support@sigship.dev?subject=SIGSHIP%20pilot%20review">Request a pilot review →</a></div>
</div></section>
<section class="block"><h2>The flags, <span>and what they mean at sea.</span></h2>
<div class="cards">
<div class="card">${flag('q')}<h3>Q · Quebec</h3><p>"My vessel is healthy and I request free pratique": permission to enter port. A ship flies it to say it has nothing to hide. Cleared.</p></div>
<div class="card">${flag('c')}<h3>C · Charlie</h3><p>"Yes" or "affirmative". Flown by a ship that has been asked a question and can answer it. Verified.</p></div>
<div class="card">${flag('h')}<h3>H · Hotel</h3><p>"I have a pilot on board": a local expert is guiding the ship through tricky water. Pilot on board.</p></div>
</div></section>
<section class="block"><h2>Rules <span>of the flag.</span></h2>
<ul class="rules">
<li>Use a flag only for the app that earned it, at the version that earned it.</li>
<li>Take the Cleared flag down if a later check says NO-GO, until it says GO again.</li>
<li>Never describe a flag as a certification, an audit or a guarantee. It's a check, and we say so.</li>
<li>The flag images are ours; use them as they are, unchanged. See the <a href="/brand/">brand page</a>.</li>
</ul></section>
<section class="block"><h2>Questions</h2><div class="acc">
<details><summary>Is a flag a security certificate?</summary><div class="acc-body"><p>No. A GO means SIGSHIP's checks found nothing that blocks launch. It does not prove the app is safe. A flag says the owner checked before launching, nothing more, and the flag pages say so.</p></div></details>
<details><summary>Can anyone add the Cleared flag?</summary><div class="acc-body"><p>Yes. It is self-declared, like a licence badge. That is exactly why Verified exists: it is drawn by SIGSHIP from a real nightly check, so it cannot be added by hand.</p></div></details>
<details><summary>What happens if a Verified app fails a check?</summary><div class="acc-body"><p>The flag comes down by itself and the page shows the date of the last pass. It goes back up when a nightly check is clean again.</p></div></details>
<details><summary>Does a flag expire?</summary><div class="acc-body"><p>Cleared shows the version that checked the app, so readers can see how old it is. Verified shows the date of the last pass. A pilot review flag shows the date it was signed.</p></div></details>
</div></section>
${CTA}`,
};

// ---------- Resources ----------
const resources = {
  path: '/resources/',
  title: 'Resources: guides, docs, changelog and roadmap | SIGSHIP',
  description: 'Docs, changelog, roadmap, releases, community and brand resources for SIGSHIP.',
  body: `${hero('Resources', 'Everything around <span>SIGSHIP.</span>', 'Guides, release notes, plans and the people building it.')}
<div class="cards">
<a class="card" href="/lookout/">${icon('eye')}<h3>The Lookout</h3><p>New ways attackers get into AI-built apps, in plain words, and what SIGSHIP does about each one.</p></a>
<a class="card" href="/flags/">${flag('q')}<h3>GO flags</h3><p>Cleared, Verified and Pilot on board: what each proves and how to earn it.</p></a>
<a class="card" href="/guides/">${icon('spark')}<h3>Guides</h3><p>Plain-English guides: the pre-launch checklist, Supabase RLS, leaked keys and more.</p></a>
<a class="card" href="/glossary/">${icon('book')}<h3>Jargon, explained</h3><p>Every technical term on this site, in one or two plain sentences.</p></a>
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
  title: 'Community and help: GitHub, Discord and support | SIGSHIP',
  description: 'Get help with SIGSHIP: ask questions on GitHub Discussions or Discord, report a false positive, suggest a new check, or contribute code.',
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

export const PRODUCT_PAGES = [features, agents, pricing, docs, lookout, flags, resources, changelog, roadmap, community];
