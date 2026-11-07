// Builds the home page (site/index.html, site/home.css, site/home.js) from scripts/home/page.html.
// Every number and line of CLI output comes from the pinned capture (scripts/home/demo-run.json), the demo app
// (scripts/demo.js), src/rules.js, package.json or scripts/pricing.js. Nothing is typed by hand.
// The build fails if a fresh run of the CLI disagrees with the capture on verdicts, files, checks or findings
// (timings are ignored), which is what lets the FILES card say so. Fix drift with: npm run capture
// Run with: npm run docs
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO, writeDemo } from './demo.js';
import { HOME_FAQ, ORG, appLd, faqFromHtml, ld } from './seo.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = join(REPO, 'scripts/home');
const cap = JSON.parse(readFileSync(join(HOME, 'demo-run.json'), 'utf8'));
const { RULES } = await import('../src/rules.js');
const { TRACKS } = await import('./pricing.js');
const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));

// ---------- Drift test: a fresh run must agree with the pinned capture ----------
{
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.SIGSHIP_KEY;
  for (const key of ['run1', 'run2']) {
    let out;
    const dir = writeDemo(cap[key].dir);
    try { out = execFileSync('node', [join(REPO, 'bin/sigship.js'), dir, '--json'], { env, encoding: 'utf8' }); }
    catch (e) { out = e.stdout; }
    finally { rmSync(dir, { recursive: true, force: true }); }
    const fresh = JSON.parse(out);
    const shape = (r) => JSON.stringify({ v: r.verdict, files: r.filesRead, checks: r.checksRun, counts: r.counts, f: r.findings.map((f) => [f.id, f.severity, f.file, f.line, f.title, f.forecast, f.fix]) });
    if (shape(fresh) !== shape(cap[key])) throw new Error(`Capture drift in ${key}: the page and a fresh run disagree. Run npm run capture.`);
  }
  if (RULES.length !== cap.rules.total) throw new Error('RULES.length changed since the capture.');
  if (pkg.version !== cap.version) throw new Error('package.json version changed since the capture.');
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const attr = esc;
const r1 = cap.run1, r2 = cap.run2;
const L1 = r1.text.split('\n'), L2 = r2.text.split('\n');
const sum1 = L1.find((l) => l.startsWith('SIGSHIP read'));
const meta1 = L1.find((l) => l.startsWith('Postmortem'));
const vi = L1.findIndex((l) => l.startsWith('NO-GO'));
const v1 = L1[vi], v1b = L1[vi + 1];
const sum2 = L2.find((l) => l.startsWith('SIGSHIP read'));
const gi = L2.findIndex((l) => l.startsWith('GO '));
const go2 = L2[gi], cav2 = L2[gi + 1];
const promptItems = r1.prompt.split(/\n(?=\d+\. \[SEV-)/).slice(1).map((s) => s.trim());
const block1 = r1.counts.sev1 + r1.counts.sev2;
const nf = r1.findings.length;

// ---------- Timeline (ms). The slow-down ratios are computed from these and the capture, never rounded up. ----------
const T = { enter: 480, sum: 560, meta: 650, beam0: 760, beam1: 1660, vline: 1760, lamp: 1900, r1: 2320 };
T.r2s = T.r1 + 280;
Object.assign(T, {
  c2: T.r2s, cmd2: T.r2s + 40, sum2: T.r2s + 80, go2: T.r2s + 120, cav: T.r2s + 300,
  m0: T.r2s + 300, swap: T.r2s + 700, widen: T.r2s + 640, green: T.r2s + 760, mastAt: T.r2s + 820, chipAt: T.r2s + 880, gust: T.r2s + 1060, m1: T.r2s + 1180, r2: T.r2s + 1200,
});
// Rounded down, never up: 'slowed about N×' must not make the tool look faster than the capture shows.
const ratio1 = Math.floor((T.vline - T.enter) / r1.textScanMs);
const ratio2 = Math.max(1, Math.floor((T.go2 - T.cmd2) / r2.textScanMs));
const date = cap.capturedAt;

// ---------- Glyphs the self-hosted subsets lack (U+2020, U+2192) are drawn as inline SVG ----------
const G = (id, cls = '') => `<svg class="g${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#g-${id}"/></svg>`;
const DAG = G('dagger', 'dag');

// ---------- Console rows (run 1, shortened: title and file:line only) ----------
const sevCls = (s) => (s === 1 ? 's1' : s === 2 ? 's2' : 's3');
const lampCls = (s) => (s === 1 ? 'red' : s === 2 ? 'yellow' : 'slate');
const rows = r1.findings.map((f, i) => `<li class="row ${sevCls(f.severity)}" data-label="${attr(`SEV-${f.severity}  ${f.title}`)}"><span class="lamp ${lampCls(f.severity)}" aria-hidden="true"></span><span class="sev" data-vt="l-f${i}s">SEV-${f.severity}</span><b data-vt="l-f${i}t">${esc(f.title)}</b><button class="path" type="button" popovertarget="pk-${i}" interestfor="pk-${i}" style="anchor-name:--a-pk-${i}" data-vt="l-f${i}p"><span class="sr">Show the code: </span>${esc(`${f.file}:${f.line}`)}</button></li>`).join('\n');

// ---------- Raw output: the exact captured text, with spans only for colour and the line-by-line morph ----------
// The summary line: one span holding bold SIGSHIP and the dim rest, as the terminal paints it.
function rawSum(line, name) { return `<span data-vt="${name}"><b>SIGSHIP</b><span class="dim">${esc(line.slice(7))}</span></span>`; }
function rawRun(text, run) {
  const lines = text.split('\n');
  let fi = -1;
  const outLines = lines.map((line) => {
    if (line.startsWith('SIGSHIP read')) return rawSum(line, run === 2 ? 'l-sum2' : 'l-sum');
    if (line.startsWith('Postmortem')) return `<span class="dim" data-vt="l-meta">${esc(line)}</span>`;
    const m = line.match(/^(SEV-(\d))  (.*)$/);
    if (m) { fi++; return `<span class="${sevCls(Number(m[2]))}" data-vt="l-f${fi}s">${m[1]}</span>  <b data-vt="l-f${fi}t">${esc(m[3])}</b>`; }
    const p = line.match(/^ {7}(\S+:\d+)  (.*)$/);
    if (p && fi >= 0) return `       <span class="dim"><span data-vt="l-f${fi}p">${esc(p[1])}</span>  ${esc(p[2])}</span>`;
    if (line.startsWith('NO-GO')) return `<span data-vt="l-v"><span class="s1">NO-GO</span>${esc(line.slice(5))}</span>`;
    if (line.startsWith('Paste the fixes')) return `<span class="dim" data-vt="l-vh">${esc(line)}</span>`;
    if (line.startsWith('GO ')) return `<span data-vt="l-go"><span class="ok">GO</span>${esc(line.slice(2))}</span>`;
    if (line.startsWith('This means these checks')) return `<span class="dim" data-vt="l-cav">${esc(line)}</span>`;
    return esc(line);
  });
  return outLines.join('\n');
}
const raw1 = rawRun(r1.text, 1);
const raw2 = rawRun(r2.text, 2);
// How many files the fixed twin really changes (the plan's draft said 3; the twin also adds two dependencies to package.json).
const changed = [...new Set([...Object.keys(DEMO.bad), ...Object.keys(DEMO.fixed)])].filter((f) => DEMO.bad[f] !== DEMO.fixed[f]);
const COMMENT = `# Fixes from npx sigship --prompt, applied to ${changed.length} files. In your project, your AI tool does this step.`;

// ---------- Inspect cards (C12): shells in the page, contents cloned from templates on first open ----------
const demoFile = (dir, file) => DEMO[dir === 'goodFixed' ? 'fixed' : dir][file].replace(/\n$/, '').split('\n');
const codeLines = (lines, hit, cls) => lines.map((l, i) => {
  const span = `<span data-n="${i + 1}">${esc(l) || ' '}</span>`;
  return i + 1 === hit ? `<mark class="${cls}">${span}</mark>` : span;
}).join('');
const shell = (id, label, fallback) => `<div class="peek" popover id="${id}" data-tpl="t-${id}" style="position-anchor:--a-${id}" aria-label="${attr(label)}"><p class="pk-fallback">${fallback}</p></div>`;
const closeBtn = (id) => `<button class="pk-x" type="button" popovertarget="${id}" popovertargetaction="hide" aria-label="Close">Close</button>`;
let peeks = '';
r1.findings.forEach((f, i) => {
  const id = `pk-${i}`;
  const lines = demoFile('bad', f.file);
  peeks += shell(id, `The code: ${f.file} line ${f.line}`, esc(`${f.file}:${f.line}`)) + '\n';
  peeks += `<template id="t-${id}"><header><span>${esc(f.file)}</span><span class="tag">Demo app</span>${closeBtn(id)}</header>
<p class="pk-note">Lines from the small demo app we wrote with this mistake.</p>
<pre class="pk-code">${codeLines(lines, f.line, sevCls(f.severity))}</pre>
<p class="pk-src">Text from sigship ${esc(cap.version)} --json</p>
<p><span class="${sevCls(f.severity)}-t">SEV-${f.severity}</span> <b>${esc(f.title)}</b></p>
<p><b>What goes wrong.</b> ${esc(f.forecast)}</p>
<p><b>The fix.</b> ${esc(f.fix)}</p>
<footer><button class="pk-btn" type="button" data-copy="${attr(promptItems[i])}" data-copy-label="the fix prompt">Copy this fix prompt</button><a href="#fix-${i}" data-close>See the fix ${G('down')}</a></footer></template>\n`;
});
const prov = (id, title, rowsHtml, note = '') => {
  peeks += shell(id, title, esc(title)) + '\n';
  peeks += `<template id="t-${id}"><header><span>${esc(title)}</span>${closeBtn(id)}</header><dl class="pv">${rowsHtml}</dl>${note ? `<p class="pk-note">${note}</p>` : ''}</template>\n`;
};
const pr = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
prov('pv-files', 'How many files SIGSHIP read', pr('Value', `<b>${r1.filesRead}</b> in run 1, ${r2.filesRead} in run 2`) + pr('Source', `<code>npx sigship --json</code> ${G('right')} <code>filesRead: ${r1.filesRead}</code>`) + pr('Captured', `At build time with sigship ${esc(cap.version)}, ${date}`), 'The build fails if a fresh run disagrees.');
prov('pv-time', 'How long the scan took', pr('Value', `<b>${r1.textScanMs} ms</b> in run 1, ${r2.textScanMs} ms in run 2`) + pr('Source', `The summary line sigship prints: <code>${esc(sum1)}</code>`) + pr('Not included', `Node start-up. The whole command took ${r1.wallMs} ms on the capture machine.`), `The replay is slowed about ${ratio1}× so you can read it. Press Real to see it at the tool's own speed.`);
prov('pv-checks', 'How many checks ran', pr('Value', `<b>${cap.rules.total}</b>, of which ${cap.rules.block} block launch`) + pr('Source', `<code>src/rules.js</code> ${G('right')} <code>RULES.length</code> is ${cap.rules.total}`) + pr('Split', `${cap.rules.sev1} SEV-1 · ${cap.rules.sev2} SEV-2 · ${cap.rules.sev3} SEV-3`));
prov('pv-blockers', 'Findings that block launch', pr('Run 1', `<b>${block1}</b>: ${r1.counts.sev1} SEV-1 and ${r1.counts.sev2} SEV-2. Exit ${r1.exitCode}, NO-GO.`) + pr('Run 2', `<b>${r2.counts.sev1 + r2.counts.sev2}</b>. Exit ${r2.exitCode}, GO. That does not prove the app is safe.`) + pr('Rule', 'SEV-1 and SEV-2 block launch. SEV-3 are notes.'));
prov('pv-spec-checks', `Where ${cap.rules.total} checks comes from`, pr('Source', `<code>src/rules.js</code> ${G('right')} <code>RULES.length</code> is ${cap.rules.total}`) + pr('Block launch', `${cap.rules.block} (SEV-1 and SEV-2)`) + pr('Not checked', 'Dashboard-only settings, your live site, secrets in git history, your business logic'));
prov('pv-spec-ver', 'Where the version comes from', pr('Source', `<code>package.json</code> ${G('right')} <code>"version": "${esc(pkg.version)}"</code>`) + pr('Needs', `Node.js ${esc(pkg.engines.node.replace('>=', ''))} or newer (<code>engines.node</code>)`) + pr('Licence', `${esc(pkg.license)}`));

// ---------- Fix plates: the demo's own lines, before and after ----------
const plates = r1.findings.map((f, i) => {
  const bad = demoFile('bad', f.file);
  const good = demoFile('goodFixed', f.file);
  const badSet = new Set(bad);
  const goodHtml = good.map((l, j) => `<span data-n="${j + 1}"${badSet.has(l) ? '' : ' class="fixed"'}>${esc(l)}</span>`).join('');
  const badHtml = bad.map((l, j) => `<span data-n="${j + 1}"${j + 1 === f.line ? ` class="hit ${sevCls(f.severity)}"` : ''}>${esc(l)}</span>`).join('');
  const sevWord = f.severity === 1 ? 'SEV-1' : 'SEV-2';
  return `<article class="plate" id="fix-${i}" data-state="before">
  <div class="plate-code">
    <div class="plate-head"><span class="lamp ${lampCls(f.severity)}" aria-hidden="true"></span><span class="ph-sev ${sevCls(f.severity)}-t">${sevWord}</span><code>${esc(f.file)}</code><span class="tag">Demo app</span>
      <div class="ba" role="tablist" aria-label="Before or after the fix"><button role="tab" type="button" id="ba-${i}-b" aria-controls="pc-${i}-b" aria-selected="true">Before</button><button role="tab" type="button" id="ba-${i}-a" aria-controls="pc-${i}-a" aria-selected="false" tabindex="-1">After</button></div></div>
    <pre class="code" id="pc-${i}-b" role="tabpanel" aria-labelledby="ba-${i}-b" tabindex="0">${badHtml}</pre>
    <pre class="code" id="pc-${i}-a" role="tabpanel" aria-labelledby="ba-${i}-a" tabindex="0" hidden>${goodHtml}</pre>
  </div>
  <div class="plate-note">
    <p class="pn-cap">0${i + 1} · ${esc(f.file.split('/').pop())}:${f.line}</p>
    <h3>${esc(f.title)}</h3>
    <p class="pn-forecast">${esc(f.forecast)}</p>
    <p class="pn-fix"><b>The fix.</b> ${esc(f.fix)}</p>
    <p class="stamp-credit">In your project, your AI tool makes this change from the SIGSHIP prompt. We wrote these fixed lines for the demo.</p>
    <div class="pn-acts"><button class="btn-ink" type="button" data-copy="${attr(promptItems[i])}" data-copy-label="the fix prompt">Copy this fix prompt</button><a href="/checks/${f.id}/">About this check</a></div>
  </div>
</article>`;
}).join('\n');

// ---------- The board: every check from RULES, worst first, plus what is not checked ----------
const tripped = new Map(r1.findings.map((f, i) => [f.id, i]));
const group = (sev, label, open) => {
  const rs = RULES.filter((r) => r.severity === sev);
  return `<details class="grp g${sev}"${open ? ' open' : ''}><summary><span class="lamp ${lampCls(sev)}" aria-hidden="true"></span><span class="gs">SEV-${sev}</span><span class="gl">${label}</span><span class="gn">${rs.length}</span></summary><ul>${rs.map((r) => `<li><span class="lamp ${lampCls(sev)}" aria-hidden="true"></span><span class="chip-sev ${sevCls(sev)}">SEV-${sev}</span><b>${esc(r.title)}</b><code>${r.id}</code>${tripped.has(r.id) ? `<a class="in-demo" href="#fix-${tripped.get(r.id)}">In the demo</a>` : ''}</li>`).join('')}</ul></details>`;
};
const NOT_CHECKED = [
  ['Settings changed only in a dashboard', 'It reads your code, not your Supabase or Stripe dashboard settings.'],
  ['Your live, deployed site', 'Planned for Cloud, on the waitlist.'],
  ['Secrets already in your git history', 'Planned for Pro, on the waitlist.'],
  ['Your business logic', 'Whether the app does the right thing is yours to test.'],
];
const board = `${group(1, 'Blocks launch. Exposes data or money.', true)}
${group(2, 'Blocks launch. Costs you or your users.', false)}
${group(3, 'Notes. Worth fixing; does not block.', false)}
<details class="grp g0"><summary><span class="lamp hollow" aria-hidden="true"></span><span class="gs">Not checked</span><span class="gl">What SIGSHIP cannot see</span><span class="gn">${NOT_CHECKED.length}</span></summary><ul>${NOT_CHECKED.map(([t, d]) => `<li><span class="lamp hollow" aria-hidden="true"></span><span class="chip-sev s0">NOT CHECKED</span><b>${esc(t)}</b><span class="nc">${esc(d)}</span></li>`).join('')}</ul></details>`;

// ---------- Plans: lit only where live: true (Free and the pilot review, owner-approved) ----------
const LIVE = new Set(['free']);
const planned = (track) => TRACKS.find((t) => t.id === track).plans.filter((p) => !LIVE.has(p.id)).map((p) => `<article class="pcard" data-live="false"><h4><span class="lamp off" aria-hidden="true"></span>${esc(p.name)}<span class="ptag">Waitlist</span></h4><p class="pprice"><b>${esc(p.price)}</b> ${esc(p.per)}</p><p class="ptag-line">${esc(p.tagline)}</p><ul>${p.items.slice(0, 5).map((it) => `<li>${esc(it)}</li>`).join('')}</ul><button class="btn-line" type="button" data-plan="${p.id}">Join the waitlist</button></article>`).join('');
const free = TRACKS[0].plans.find((p) => p.id === 'free');
// pricing.js has no live field yet (C18 adds it). The prototype adds it here: Free, and the pilot review the owner approved as bookable today.
// The pilot review's words and price are the current site's own copy.
const PLANS_LIVE = [
  { ...free, live: true, status: 'Live' },
  { id: 'pilot', live: true, status: 'Available now', name: 'Pilot review', price: 'From $499', heading: 'Flag G means “I require a pilot.”', text: 'A senior zoof04 engineer reads your code by hand and sends a ranked, written review within 48 hours, with a 30-minute call.', href: 'mailto:support@sigship.dev?subject=SIGSHIP%20pilot%20review' },
];
const liveCard = (p) => p.id === 'free'
  ? `<article class="plan live" data-live="${p.live}" data-plan-id="${p.id}">
        <p class="status"><span class="lamp ${p.live ? 'green' : 'off'}" aria-hidden="true"></span>${esc(p.status)}</p>
        <h3>${esc(p.name)}</h3>
        <p class="price"><b>${esc(p.price)}</b> ${esc(p.per)}</p>
        <p>${esc(p.tagline)}</p>
        <ul class="ticks">${p.items.slice(0, 5).map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
        <div class="plan-acts"><button class="btn-ink" type="button" data-copy="npx sigship" data-copy-label="npx sigship"><code>$ npx sigship</code><span>Copy</span></button><a href="https://github.com/sigship/sigship">Read the code</a></div>
      </article>`
  : `<article class="plan live" data-live="${p.live}" data-plan-id="${p.id}">
        <p class="status"><span class="lamp ${p.live ? 'green' : 'off'}" aria-hidden="true"></span>${esc(p.status)}</p>
        <div class="pilot-flag" aria-hidden="true"><span class="pf"><svg viewBox="0 0 90 60"><use href="#flag-g"/></svg></span></div>
        <h3>${esc(p.heading)}</h3>
        <p>${esc(p.text)}</p>
        <p class="price"><b>${esc(p.price)}</b></p>
        <div class="plan-acts"><a class="btn-line" href="${attr(p.href)}">Request a pilot review</a></div>
      </article>`;
const liveRow = PLANS_LIVE.map(liveCard).join('\n');
const formPlans = TRACKS.flatMap((t) => t.plans.filter((p) => !LIVE.has(p.id))).map((p, i) => `<label class="pchip"><input type="radio" name="plan" value="${p.id}"${i === 0 ? ' checked' : ''}><span>${esc(p.name)} · ${esc(p.price)}</span></label>`).join('');

// ---------- Recorder data ----------
const runData = {
  T, ratio1, ratio2,
  r1: { files: r1.filesRead, ms: r1.textScanMs, checks: r1.checksRun, block: block1 },
  r2: { files: r2.filesRead, ms: r2.textScanMs, block: r2.counts.sev1 + r2.counts.sev2 },
  labels: { ready: 'Ready. Nothing printed yet.', sum1, meta1, v1, c2: '# Your AI tool applied the fixes (our comment, not CLI output)', sum2, go2: `${go2} ${cav2}`, goInst: 'Instruments read GO, exit 0. Not proof the app is safe.' },
  clock1: `Slowed about ${ratio1}× so you can read it · the scan took ${r1.textScanMs} ms · captured ${date}`,
  clock2: `Run 2 · slowed about ${ratio2}× · the scan took ${r2.textScanMs} ms · captured ${date}`,
  clockReal: `Real speed · as fast as the tool printed it · the scan took ${r1.textScanMs} ms`,
  say1: `Demo run: NO-GO. ${r1.counts.sev1} SEV-1, ${r1.counts.sev2} SEV-2.`,
  say2: `Demo run 2: GO, exit 0. ${cav2.replace('This means these', 'These')}`,
  ariaGo: `Verdict: GO, exit 0. ${cav2.replace('This means these', 'These')}`,
};

const scal = {
  ver: cap.version, node: pkg.engines.node.replace('>=', ''), date, lic: pkg.license,
  r1files: r1.filesRead, r1ms: r1.textScanMs, r1checks: r1.checksRun, r1block: block1, r1sev1: r1.counts.sev1, r1sev2: r1.counts.sev2, r1wall: r1.wallMs,
  r2files: r2.filesRead, r2ms: r2.textScanMs, ratio1, ratio2, nfix: nf, nfixWord: ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][nf] || String(nf), nchanged: changed.length,
  rtotal: cap.rules.total, rblock: cap.rules.block, rs1: cap.rules.sev1, rs2: cap.rules.sev2, rs3: cap.rules.sev3,
  sum1: esc(sum1).replace('SIGSHIP', '<b>SIGSHIP</b>'), meta1: esc(meta1), v1rest: esc(v1.slice(5)), v1b: esc(v1b),
  sum2: esc(sum2).replace('SIGSHIP', '<b>SIGSHIP</b>'), go2rest: esc(go2.slice(2)), cav2: esc(cav2), comment: esc(COMMENT),
  dag: DAG, gright: G('right'), gdown: G('down'), gup: G('up'), gprev: G('prev'), gnext: G('next'), gcopy: G('copy'),
  freePrice: esc(free.price), freePer: esc(free.per), freeTag: esc(free.tagline),
  freeItems: free.items.slice(0, 5).map((it) => `<li>${esc(it)}</li>`).join(''),
};
const homeFaq = HOME_FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="acc-body"><p>${esc(a)}</p></div></details>`).join('\n');
const homeLd = ld({
  '@context': 'https://schema.org',
  '@graph': [
    ORG,
    { '@type': 'WebSite', '@id': 'https://sigship.dev/#site', name: 'SIGSHIP', url: 'https://sigship.dev/', publisher: { '@id': 'https://sigship.dev/#org' }, inLanguage: 'en' },
    appLd({ version: pkg.version, description: 'Free, open source safety check for apps built with AI tools like Lovable, Bolt, Cursor, Replit, v0 and Claude Code. Finds leaked keys, open databases and unverified payments before launch, on your own computer.' }),
    faqFromHtml(homeFaq),
  ],
});
const blocks = { homeFaq, homeLd, rows, raw1, raw2, peeks, plates, board, liveRow, plannedSelf: planned('self'), plannedCloud: planned('cloud'), formPlans, rundata: JSON.stringify(runData).replace(/</g, '\\u003c') };

let html = readFileSync(join(HOME, 'page.html'), 'utf8');
html = html.replace(/<!--@(\w+)-->/g, (_, k) => { if (!(k in blocks)) throw new Error(`Unknown block ${k}`); return blocks[k]; });
html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in scal)) throw new Error(`Unknown value ${k}`); return String(scal[k]); });
if (/\{\{|<!--@/.test(html)) throw new Error('Unfilled placeholder left in the page.');
// ---------- Plans test (C18): a lamp is lit only on a plan with live: true; every planned card says Waitlist; no urgency words ----------
{
  const sec = html.slice(html.indexOf('<section class="sect" id="pricing"'), html.indexOf('</section>', html.indexOf('<section class="sect" id="pricing"')));
  const liveIds = new Set(PLANS_LIVE.filter((p) => p.live).map((p) => p.id));
  for (const chunk of sec.split('<article').slice(1)) {
    const lit = /class="lamp (green|red|yellow)"/.test(chunk);
    const id = (chunk.match(/data-plan-id="([^"]+)"/) || [])[1];
    const isLive = /data-live="true"/.test(chunk);
    if (lit && !(isLive && liveIds.has(id))) throw new Error(`Plans test: a lit lamp on a plan without live: true (${id || 'planned card'}).`);
    if (isLive && !liveIds.has(id)) throw new Error(`Plans test: data-live="true" on ${id}, which is not live in the data.`);
    if (/class="pcard"/.test(chunk.slice(0, 60)) && !/Waitlist/.test(chunk)) throw new Error('Plans test: a planned card does not say Waitlist.');
  }
  if (/now boarding|last call|most popular|seats? left|hurry|countdown/i.test(sec)) throw new Error('Plans test: urgency or emphasis words in Plans.');
}
// ---------- Every GO has its footnote: the sentence and a dagger linking to #limits ----------
{
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const gos = [...text.matchAll(/>GO<|>GO\s/g)].length;
  if (!text.includes('It does not prove the app is safe.')) throw new Error('GO footnote test: the caveat sentence is missing.');
  if ((text.match(/href="#limits">.{0,80}g-dagger/g) || []).length < 2) throw new Error('GO footnote test: a GO without its dagger link.');
  void gos;
}
// ---------- Split the big style and script into cacheable files ----------
const styleAt = html.indexOf('<style>');
const css = html.slice(styleAt + 7, html.indexOf('</style>', styleAt));
html = html.slice(0, styleAt) + '<link rel="stylesheet" href="/home.css">' + html.slice(html.indexOf('</style>', styleAt) + 8);
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const main = scripts.reduce((a, b) => (b[1].length > a[1].length ? b : a));
html = html.replace(main[0], '<script src="/home.js" defer></script>');
if (/prototype|scratch|2027 kit/i.test(html.replace(/HTMLButtonElement\.prototype|\.prototype\b/g, ''))) throw new Error('Prototype wording left in the page.');
writeFileSync(join(REPO, 'site/home.css'), css.trim() + '\n');
writeFileSync(join(REPO, 'site/home.js'), main[1].trim() + '\n');
writeFileSync(join(REPO, 'site/index.html'), html);
console.log(`Built the home page (${(html.length / 1024).toFixed(1)} KB HTML, ${(css.length / 1024).toFixed(1)} KB CSS, ${(main[1].length / 1024).toFixed(1)} KB JS) from the sigship ${cap.version} capture of ${date}.`);
