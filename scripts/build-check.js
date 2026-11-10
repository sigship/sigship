// Builds the free in-browser check at /check/: site/check/engine.js (the checks plus a browser copy of the
// context loader, concatenated from src/rules.js) and site/check/index.html (the page, wrapped in the same
// header and footer as the rest of the site, taken from an already built page so the nav stays in sync).
// No bundler, no dependency. Run after `npm run docs`: node scripts/build-check.js
//
// When src/engine.js (the pure scanFiles engine) lands, swap ENGINE_TAIL for the body of that file so the
// browser and the CLI share one engine: the signature here already matches it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export const ENGINE_HEAD = `// Built by scripts/build-check.js from src/rules.js. Do not edit; edit the source and rebuild.
// Runs in a Web Worker on sigship.dev/check/ and in Node for the tests. It never touches the network.

// rules.js decodes a JWT payload with Buffer, which browsers do not have. The same call, done with atob.
const Buffer = globalThis.Buffer || {
  from(s, enc) {
    let b64 = String(s);
    if (enc === 'base64url') b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return { toString: () => new TextDecoder().decode(bytes) };
  },
};

`;

// Mirrors loadContext in src/scan.js for a list of files that is already in memory.
export const ENGINE_TAIL = `
export { RULES, RULES_BY_ID, CODE, SERVER_PATH, NOT_SHIPPED, findAll };

// Same rules as src/scan.js: which folders are skipped, which files are read, and how big a file may be.
export const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output', '.vercel', '.turbo', 'coverage', 'vendor', '.venv', '__pycache__', '.cache']);
export const TEXT = /\\.(c|m)?(j|t)sx?$|\\.vue$|\\.svelte$|\\.astro$|\\.py$|\\.sql$|\\.json$|\\.ya?ml$|\\.toml$|\\.html$|\\.md$|\\.txt$|\\.sh$|\\.rules$|\\.tf$|(^|\\/)\\.env(\\.[a-z]+)?$/i;
export const MAX_BYTES = 1_000_000;

export const skipped = (path) => path.split('/').some((part) => SKIP_DIRS.has(part));
export const wantsText = (path, size) => TEXT.test(path) && !(size > MAX_BYTES);

// Outside a git repo, a .env file counts as committed unless .gitignore covers it. Same test as the CLI.
export const ignoresEnv = (gitignore) => String(gitignore || '').split('\\n').some((l) => /^\\s*\\/?\\.env(\\*|\\.\\*)?\\s*$/.test(l));

// Builds the context every check reads from.
// entries: [{ path, size, text() }] where text() returns the file's text (a string or a promise of one).
// Paths are posix, relative to the project root. Files in skipped folders are dropped, binary and oversized files are listed but not read.
export async function contextFromEntries(entries) {
  const kept = entries.filter((e) => !skipped(e.path));
  const paths = kept.map((e) => e.path);
  const files = [];
  for (const e of kept) {
    if (!wantsText(e.path, e.size)) continue;
    try {
      const text = await e.text();
      if (typeof text === 'string') files.push({ path: e.path, text });
    } catch {
      // A file that cannot be read is not a finding.
    }
  }
  const gitignore = kept.find((e) => e.path === '.gitignore');
  let ignore = false;
  if (gitignore) {
    try { ignore = ignoresEnv(await gitignore.text()); } catch { ignore = false; }
  }
  const tracked = ignore ? paths.filter((p) => !/(^|\\/)\\.env/.test(p)) : paths;
  return { paths, tracked, files };
}

// The pure engine: the same signature as src/engine.js. Everything after files, tracked and paths is derived when missing.
export function scanFiles({ files, tracked, paths, deps, pkg, sql, usesSupabase, extraRules = [] }) {
  const started = performance.now();
  paths = paths || files.map((f) => f.path);
  tracked = tracked || paths;
  if (pkg === undefined) {
    pkg = null;
    const pkgFile = files.find((f) => f.path === 'package.json');
    if (pkgFile) {
      try { pkg = JSON.parse(pkgFile.text); } catch { pkg = null; }
    }
  }
  deps = deps || { ...pkg?.dependencies, ...pkg?.devDependencies };
  sql = sql || files.filter((f) => /\\.sql$/i.test(f.path));
  if (usesSupabase === undefined) {
    usesSupabase = Object.keys(deps).some((d) => d.startsWith('@supabase/')) || paths.some((p) => /(^|\\/)supabase\\/(migrations|config\\.toml)/.test(p));
  }
  const ctx = { paths, tracked, files, sql, pkg, deps, usesSupabase };
  const rules = [...RULES, ...extraRules];
  const findings = rules.flatMap((rule) =>
    rule.run(ctx).map((hit) => ({
      id: rule.id,
      severity: rule.severity,
      title: rule.title,
      forecast: rule.forecast,
      fix: rule.fix,
      file: hit.file,
      line: hit.line,
      detail: hit.detail,
    })),
  ).sort((a, b) => a.severity - b.severity || a.file.localeCompare(b.file) || a.line - b.line);
  const counts = { sev1: 0, sev2: 0, sev3: 0 };
  for (const f of findings) counts[\`sev\${f.severity}\`] += 1;
  return { filesRead: files.length, checksRun: rules.length, ms: Math.round(performance.now() - started), counts, findings };
}

export function verdict(result, { strict = false } = {}) {
  const { sev1, sev2, sev3 } = result.counts;
  const blocked = sev1 + sev2 + (strict ? sev3 : 0) > 0;
  return { go: !blocked, label: blocked ? 'NO-GO' : 'GO', exitCode: blocked ? 1 : 0 };
}

// The same text as \`npx sigship --prompt\` (toPrompt in src/report.js).
export function toPrompt(result, { strict = false } = {}) {
  const blocking = result.findings.filter((f) => f.severity <= (strict ? 3 : 2));
  if (!blocking.length) return 'SIGSHIP found nothing blocking. Nothing to fix.';
  const items = blocking.map((f, i) => \`\${i + 1}. [SEV-\${f.severity}] \${f.title}\\n   Where: \${f.file}:\${f.line}\\n   Fix: \${f.fix}\`);
  return [
    'Fix these production problems in order. Change only what each fix needs.',
    'After the fixes, run \`npx sigship\` again and keep going until it exits 0.',
    'If a fix needs a key rotated or a dashboard changed, stop and tell me what to do.',
    '',
    ...items,
  ].join('\\n');
}
`;

export function buildEngine() {
  const version = JSON.parse(read('package.json')).version;
  const rules = read('src/rules.js').replace(/^export (const|function|let|class) /gm, '$1 ');
  return `${ENGINE_HEAD}export const VERSION = ${JSON.stringify(version)};\n\n${rules}\n${ENGINE_TAIL}`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const T = (plain, dev) => `<span class="s">${plain}</span><span class="d">${dev}</span>`;

const TITLE = 'Check your app in the browser — SIGSHIP';
const DESC = 'Pick your project folder or a zip and get a Ready or Fix-first verdict in seconds. The 17 checks run in your browser. Nothing is uploaded.';

const PAGE_CSS = `
.ck { max-width: 52rem; margin: 0 auto; display: grid; gap: 20px; }
.ck-step { position: relative; padding: 24px; border: 1px solid var(--border); border-radius: 24px; background: var(--surface); }
.ck-step .n { display: inline-grid; place-items: center; width: 28px; height: 28px; margin-bottom: 12px; border-radius: 50%; background: var(--surface-2); color: var(--muted-foreground); font: 600 12px var(--mono); }
.ck-step h2 { font-size: 1.25rem; font-weight: 600; letter-spacing: -.02em; }
.ck-step .sub { margin-top: 6px; color: var(--muted-foreground); font-size: .9rem; }
.ck-step[hidden] { display: none; }
.ck-acts { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.drop { margin-top: 16px; padding: 32px 20px; border: 2px dashed var(--input); border-radius: 18px; background: var(--background); text-align: center; transition: border-color .2s, background .2s; }
.drop.over { border-color: var(--sky); background: color-mix(in oklab, var(--sky) 8%, var(--background)); }
.drop p { color: var(--muted-foreground); font-size: .9rem; }
.drop .ck-acts { justify-content: center; }
.ck-status { display: flex; align-items: center; gap: 10px; min-height: 24px; margin-top: 14px; color: var(--muted-foreground); font: 500 .8rem var(--mono); }
.ck-status[data-tone="stop"] { color: var(--stop); }
.ck-bar { flex: 1; max-width: 220px; height: 4px; overflow: hidden; border-radius: 999px; background: var(--surface-2); }
.ck-bar i { display: block; width: 40%; height: 100%; border-radius: 999px; background: var(--gradient-spectrum); animation: ckbar 1.1s var(--ease) infinite alternate; }
@keyframes ckbar { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
.ck-fine { margin-top: 14px; color: var(--muted-foreground); font-size: .75rem; }
.ck-fine code { padding: 1px 6px; border-radius: 6px; background: var(--surface-2); }
.ck-verdict { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; margin-top: 16px; padding: 18px 20px; border-radius: 16px; background: color-mix(in oklab, var(--stop) 10%, transparent); color: var(--stop); }
.ck-verdict.go { background: color-mix(in oklab, var(--go) 15%, transparent); color: var(--go); }
.ck-verdict b { font-size: 1.6rem; font-weight: 700; letter-spacing: -.03em; }
.ck-verdict span { font: 500 .8rem var(--mono); }
.ck-caveat { margin-top: 12px; color: var(--muted-foreground); font-size: .85rem; }
.ck-group { margin-top: 20px; }
.ck-group h3 { display: flex; align-items: center; gap: 8px; color: var(--c); font: 600 .75rem var(--mono); letter-spacing: .1em; text-transform: uppercase; }
.ck-group h3 i { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.ck-list { display: grid; gap: 10px; margin-top: 10px; }
.finding { padding: 14px 16px; border: 1px solid var(--border); border-left: 3px solid var(--c); border-radius: 12px; background: var(--background); }
.finding b { display: block; font-size: .95rem; font-weight: 600; }
.finding .where { display: block; margin-top: 4px; color: var(--muted-foreground); font: 400 12px var(--mono); overflow-wrap: anywhere; }
.finding p { margin-top: 8px; font-size: .875rem; line-height: 1.55; }
.finding p span { color: var(--muted-foreground); }
.ck-empty { margin-top: 16px; color: var(--muted-foreground); font-size: .9rem; }
.ck-code { margin-top: 16px; }
.ck-code pre { max-height: 22rem; overflow: auto; }
.ck-embed { display: grid; gap: 12px; margin-top: 16px; }
.ck-embed label { font-size: .8rem; font-weight: 600; }
.ck-embed input { width: 100%; max-width: 420px; height: 44px; padding: 0 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2); color: var(--foreground); font: 500 .95rem var(--mono); }
.ck-embed .code pre { white-space: pre-wrap; word-break: break-all; }
.ck-badge-pill { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 4px; padding: 18px; border-radius: 14px; background: var(--surface-2); }
.ck-keep { margin-top: 16px; padding: 14px 16px; border-radius: 14px; border: 1px solid color-mix(in oklab, var(--sky) 30%, transparent); background: color-mix(in oklab, var(--sky) 8%, var(--surface)); font-size: .9rem; }
.ck-keep a { color: var(--sky); text-decoration: underline; text-underline-offset: 3px; }
.ck-alt { margin-top: 28px; text-align: center; color: var(--muted-foreground); font-size: .85rem; }
.ck-alt code { padding: 2px 8px; border-radius: 6px; background: var(--surface-2); font-size: .9em; }
.ck noscript p { margin-top: 16px; padding: 14px 16px; border-radius: 14px; background: color-mix(in oklab, var(--warn) 14%, transparent); font-size: .9rem; }
@media (prefers-reduced-motion: reduce) { .ck-bar i { animation: none; width: 100%; } .drop { transition: none; } }
@media (max-width: 480px) { .ck-step { padding: 20px 16px; border-radius: 18px; } .ck-verdict b { font-size: 1.35rem; } }
`;

function body() {
  return `
<section class="page-hero"><div class="grid-bg"></div><div class="glow" style="--c:var(--teal)"></div><div class="in">
<div class="eyebrow" style="--c:var(--teal)"><i></i>Free · runs in your browser</div>
<h1 class="display">Check your app without installing anything.</h1>
<p class="lede">${T('Pick your project folder or a zip of it. We read it right here in this tab, and nothing leaves your computer.', 'Pick the repo folder or a zip of it. The 17 checks run in a Web Worker in this tab. No upload, and no request after the page loads.')}</p>
</div></section>
<section class="sec sec-tight"><div class="wrap">
<style>${PAGE_CSS}</style>
<div class="ck" id="check" data-check>
<noscript><p>${T('This check runs inside your browser and needs JavaScript turned on. Or open a terminal in your project and run <code>npx sigship</code>.', 'JavaScript is off. Run <code>npx sigship</code> in the repo instead; it is the same engine.')}</p></noscript>

<div class="ck-step" id="step-pick">
<div class="n">1</div>
<h2>${T('Pick your project', 'Pick the repo')}</h2>
<p class="sub">${T('The folder you downloaded from Lovable, Bolt or GitHub, or the one Cursor and Replit put on your computer. A zip of it works too.', 'The folder or a zip export. node_modules, .git and build folders are skipped; text files up to 1 MB are read.')}</p>
<div class="drop" data-drop>
<p data-drop-text>${T('Drop a folder or a zip here', 'Drop a folder or a zip here')}</p>
<div class="ck-acts">
<button class="btn btn-primary" type="button" data-pick-folder>Choose a folder</button>
<button class="btn btn-ghost" type="button" data-pick-zip>Choose a zip</button>
</div>
<input type="file" accept=".zip,application/zip,application/x-zip-compressed" data-zip-input hidden>
<input type="file" webkitdirectory directory multiple data-folder-input hidden>
</div>
<div class="ck-status" data-status aria-live="polite"></div>
<p class="ck-fine">${T('Nothing is uploaded. If you like, turn off your Wi-Fi first and the check still works.', 'No network calls: open the network tab and watch. The worker only reads what you picked.')}</p>
</div>

<div class="ck-step" id="step-verdict" hidden>
<div class="n">2</div>
<h2>${T('Read the verdict', 'The verdict')}</h2>
<p class="sub">${T('Ready means you can launch. Fix first means something serious needs attention before you do.', 'GO or NO-GO, same as the CLI exit code: SEV-1 and SEV-2 block, SEV-3 is advice.')}</p>
<div class="ck-verdict" data-verdict role="status"></div>
<p class="ck-caveat" data-caveat></p>
<div data-findings></div>
</div>

<div class="ck-step" id="step-fix" hidden>
<div class="n">3</div>
<h2>Copy the fix</h2>
<p class="sub">${T('Paste this into Lovable, Bolt, Cursor, or whichever AI tool built your app. It knows what to do with it.', 'The same text as <code>npx sigship --prompt</code>: blocking findings in order, each with file:line and the fix.')}</p>
<div class="ck-acts"><button class="btn btn-primary" type="button" data-copy="" data-copy-fix><span class="copy-label">Copy the fix</span></button></div>
<div class="code ck-code"><div class="code-t code-row"><span>What gets copied</span><button class="copy-btn" type="button" data-copy="" data-copy-fix><span class="copy-label">copy</span></button></div><pre><code data-prompt></code></pre></div>
</div>

<div class="ck-step" id="step-again" hidden>
<div class="n">4</div>
<h2>Check again</h2>
<p class="sub">${T('After your AI tool makes the changes, run the check once more. Keep going until it says Ready.', 'Re-reads the same folder. For a zip, export it again and pick the new file.')}</p>
<div class="ck-acts"><button class="btn btn-primary" type="button" data-again>Check again</button><button class="btn btn-ghost" type="button" data-pick-other>Pick something else</button></div>
</div>

<div class="ck-step" id="step-badge" hidden>
<div class="n">5</div>
<h2>${T('Show it with a badge', 'Add the Self-checked badge')}</h2>
<p class="sub">${T('Your app passed. Put the Self-checked badge on your site so customers can see you checked. It is free and needs no account.', 'The Self-checked badge is self-declared and free. Its ID is computed from your site name, so it only fits the site it was made for.')}</p>
<div class="ck-embed"><label for="ck-site">Your site</label><input id="ck-site" data-site value="myapp.com" maxlength="80" autocomplete="off" spellcheck="false" inputmode="url">
<div class="ck-badge-pill"><a class="sg-pill m-steel" data-badge-link href="/verify/?id=&amp;site=" aria-label="SIGSHIP badge: Self-checked, level 1 of 5 (Steel)"><svg class="mk" viewBox="0 0 90 90" aria-hidden="true"><rect x="6" y="0" width="6" height="90" rx="3" fill="currentColor"/><rect x="14" y="6" width="72" height="50" rx="2" fill="#2f5be0"/><rect x="38" y="22.7" width="24" height="16.6" fill="#fff"/></svg><span class="brand">SIGSHIP</span><span class="t">Self-checked</span><span class="dot" aria-hidden="true"></span><span class="lvl" aria-hidden="true"><i class="f"></i><i></i><i></i><i></i><i></i></span><span class="id" data-badge-id></span></a><span class="muted">Badge ID <b class="mono" data-badge-id></b></span></div>
<div class="code"><div class="code-t code-row"><span>Paste into your site</span><button class="copy-btn" type="button" data-copy="" data-badge-copy><span class="copy-label">copy</span></button></div><pre><code data-badge-code></code></pre></div></div>
<p class="ck-keep">${T('Want it checked every night, with a badge that proves it? <a href="/cloud/">SIGSHIP Cloud</a> keeps watch and tells you the moment something changes.', 'For nightly runs on every push and a Live-checked badge, see <a href="/cloud/">SIGSHIP Cloud</a>.')}</p>
</div>
</div>
<p class="ck-alt">${T('Prefer the terminal? Open one in your project and run <code>npx sigship</code>. Same checks, same verdict.', 'CLI: <code>npx sigship</code> in the repo. MCP and CI in the <a href="/docs/" style="text-decoration:underline">docs</a>.')}</p>
</div></section>
`;
}

// Takes the head, header and footer from a built page so the nav, strip and footer always match the rest of the site.
export function buildPage() {
  const built = read('site/resources/index.html');
  const mainStart = built.indexOf('<main id="main">');
  const mainEnd = built.indexOf('</main>');
  if (mainStart < 0 || mainEnd < 0) throw new Error('site/resources/index.html has no <main>; run npm run docs first');
  let head = built.slice(0, mainStart);
  const tail = built.slice(mainEnd);
  const swap = (re, to) => { head = head.replace(re, to); };
  swap(/<title>[^<]*<\/title>/, `<title>${esc(TITLE)}</title>`);
  swap(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(DESC)}">`);
  swap(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://sigship.dev/check/">');
  swap(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(TITLE)}">`);
  swap(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(DESC)}">`);
  swap(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://sigship.dev/check/">');
  swap(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="https://sigship.dev/og.png">');
  swap(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${esc(TITLE)}">`);
  swap(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(TITLE)}">`);
  swap(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(DESC)}">`);
  swap(/<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="https://sigship.dev/og.png">');
  swap(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sigship.dev/' }, { '@type': 'ListItem', position: 2, name: 'Check your app', item: 'https://sigship.dev/check/' }] },
        { '@type': 'WebApplication', name: 'SIGSHIP browser check', url: 'https://sigship.dev/check/', applicationCategory: 'DeveloperApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, description: DESC },
      ],
    })}</script>`,
  );
  swap(/<script src="\/app\.js" defer><\/script>/, '<script src="/app.js" defer></script>\n<script type="module" src="/check/check.js"></script>');
  return `${head}<main id="main">${body()}${tail}`;
}

export function buildCheck() {
  mkdirSync(join(ROOT, 'site/check'), { recursive: true });
  writeFileSync(join(ROOT, 'site/check/engine.js'), buildEngine());
  writeFileSync(join(ROOT, 'site/check/index.html'), buildPage());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildCheck();
  console.log('Built site/check/engine.js and site/check/index.html');
}
