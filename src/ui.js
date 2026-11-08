// The local dashboard: npx sigship ui. It listens on 127.0.0.1 only and every request needs the
// random token printed in the terminal, so other pages and other machines can't call it.
// It serves one self-contained page and findings JSON, never file contents. Like the CLI, it
// makes no network call unless SIGSHIP_KEY is set.
import { spawn } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, lstatSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';
import { scan } from './scan.js';
import { loadPro } from './pro.js';
import { toJson, toPrompt } from './report.js';

const HOST = '127.0.0.1';

const expandHome = (path) => (path === '~' ? homedir() : path.replace(/^~(?=[/\\])/, homedir()));

function isFolder(path) {
  try {
    return existsSync(path) && lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}

function sameToken(given, token) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, status, type, body, extra = {}) {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'cross-origin-resource-policy': 'same-origin',
    ...extra,
  });
  res.end(body);
}

const sendJson = (res, status, data) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(data));

export async function startUi({ target = '.', strict = false, version = '', cwd = process.cwd(), env = process.env, fetch = globalThis.fetch, port = 0 } = {}) {
  const start = resolve(cwd, expandHome(target));
  if (!isFolder(start)) throw new Error(`Folder not found: ${target}`);
  const token = randomBytes(24).toString('hex');

  async function runScan(folder, strictRun) {
    const root = resolve(cwd, expandHome(folder));
    if (!isFolder(root)) return { status: 400, body: { error: `Folder not found: ${folder}` } };
    const pro = await loadPro(root, { env, fetch });
    const result = scan(root, { extraRules: pro.rules });
    const options = { strict: strictRun, pro };
    return { status: 200, body: { ...toJson(result, options), folder: root, name: basename(root), strict: strictRun, prompt: toPrompt(result, options) } };
  }

  const server = createServer(async (req, res) => {
    const { port: bound } = server.address();
    // A DNS rebinding page reaches 127.0.0.1 under its own host name. Only answer to ours.
    const host = String(req.headers.host ?? '').toLowerCase();
    if (host !== `${HOST}:${bound}` && host !== `localhost:${bound}`) return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden.');

    const url = new URL(req.url, `http://${HOST}`);
    if (!sameToken(url.searchParams.get('token'), token)) {
      return send(res, 403, 'text/plain; charset=utf-8', 'Open the dashboard with the link SIGSHIP printed in your terminal.');
    }
    if (req.method !== 'GET') return send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed.', { allow: 'GET' });

    if (url.pathname === '/') {
      const nonce = randomBytes(16).toString('base64');
      return send(res, 200, 'text/html; charset=utf-8', page({ nonce, version, strict }), {
        'content-security-policy': `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      });
    }
    if (url.pathname === '/api/scan') {
      try {
        const folder = url.searchParams.get('folder') || start;
        const strictRun = url.searchParams.has('strict') ? url.searchParams.get('strict') === '1' : strict;
        const { status, body } = await runScan(folder, strictRun);
        return sendJson(res, status, body);
      } catch (error) {
        return sendJson(res, 500, { error: error.message });
      }
    }
    return send(res, 404, 'text/plain; charset=utf-8', 'Not found.');
  });

  await new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, HOST, done);
  });
  const url = `http://${HOST}:${server.address().port}/?token=${token}`;
  const close = () =>
    new Promise((done) => {
      server.close(() => done());
      server.closeAllConnections();
    });
  return { server, url, token, close };
}

// Opens the user's browser. If that fails, the link printed in the terminal still works.
export function openBrowser(url) {
  const [command, args, extra] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '""', url], { windowsVerbatimArguments: true }]
        : ['xdg-open', [url]];
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true, ...extra });
    child.on('error', () => {});
    child.unref();
  } catch {
    // No browser to open. The printed link is enough.
  }
}

const FLAGS = {
  s: '<rect width="90" height="60" fill="var(--flag-white)"/><rect x="30" y="20" width="30" height="20" fill="var(--blue)"/>',
  i: '<rect width="90" height="60" fill="var(--yellow)"/><circle cx="45" cy="30" r="17" fill="var(--flag-black)"/>',
  g: '<rect width="90" height="60" fill="var(--yellow)"/><rect x="15" width="15" height="60" fill="var(--blue)"/><rect x="45" width="15" height="60" fill="var(--blue)"/><rect x="75" width="15" height="60" fill="var(--blue)"/>',
  h: '<rect width="45" height="60" fill="var(--flag-white)"/><rect x="45" width="45" height="60" fill="var(--red)"/>',
  p: '<rect width="90" height="60" fill="var(--blue)"/><rect x="30" y="20" width="30" height="20" fill="var(--flag-white)"/>',
};

const ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#1f4fd1"/><rect x="30" y="20" width="30" height="20" fill="#fff"/></svg>')}`;

function page({ nonce, version, strict }) {
  const defs = Object.entries(FLAGS)
    .map(([id, shapes]) => `<symbol id="flag-${id}" viewBox="0 0 90 60">${shapes}</symbol>`)
    .join('');
  const hoist = [...'sigship'].map((id) => `<li><svg viewBox="0 0 90 60"><use href="#flag-${id}"/></svg></li>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="referrer" content="no-referrer">
<title>SIGSHIP dashboard</title>
<link rel="icon" href="${ICON}">
<style nonce="${nonce}">${CSS}</style>
<script nonce="${nonce}">(function(){var d=document.documentElement,t,m;try{t=localStorage.getItem('sigship-theme');m=localStorage.getItem('sigship-mode')}catch(e){}if(t!=='light')d.classList.add('dark');if(m==='dev')d.dataset.mode='dev'})()</script>
</head>
<body data-strict="${strict ? '1' : '0'}">
<svg class="defs" width="0" height="0" aria-hidden="true"><defs>${defs}</defs></svg>
<header class="mast">
  <span class="brand"><svg viewBox="0 0 90 80" aria-hidden="true"><rect width="90" height="3" fill="var(--ink)"/><rect x="16" width="3" height="20" fill="var(--ink)"/><rect x="71" width="3" height="20" fill="var(--ink)"/><rect y="20" width="90" height="60" fill="var(--blue)"/><rect x="30" y="40" width="30" height="20" fill="var(--flag-white)"/></svg>SIGSHIP <span class="tag">dashboard</span></span>
  <span class="local">Runs on this computer. Nothing is uploaded.</span>
  <span class="ctl">
    <button class="sw" type="button" id="mode" aria-pressed="false" aria-label="Switch between plain words and developer mode"><span class="l1">Plain</span><span class="knob" aria-hidden="true"></span><span class="l2">Dev</span></button>
    <button class="icon-btn" type="button" id="theme" aria-label="Switch between day and night"><svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg><svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg></button>
  </span>
</header>
<div class="hoist-wrap" aria-hidden="true"><ol class="hoist" id="hoist">${hoist}</ol></div>
<main>
  <form class="pick" id="pick">
    <label for="folder"><span class="plain-only">Which app? Paste the folder your app lives in</span><span class="dev-only">Folder to check</span></label>
    <div class="row">
      <input id="folder" name="folder" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="/path/to/your/app">
      <button type="submit" id="go">Check folder</button>
    </div>
    <label class="strict"><input type="checkbox" id="strict"> <span class="plain-only">Strict: also stop for the small things (SEV-3)</span><span class="dev-only">Also block launch on SEV-3 (--strict)</span></label>
  </form>

  <section class="board" id="board" aria-labelledby="verdict" aria-busy="true">
    <p class="where" id="where">Checking…</p>
    <h1 class="verdict" id="verdict"><span class="wait">…</span></h1>
    <p class="tally" id="tally"></p>
    <p class="note" id="note"></p>
    <p class="meta dev-only" id="meta"></p>
    <p class="meta" id="pro" hidden></p>
    <p class="error" id="error" role="alert" hidden></p>
    <div class="actions">
      <button type="button" id="copy" hidden>Copy fix prompt</button>
      <button type="button" id="rerun" class="ghost">Re-run</button>
      <span class="status" id="status" role="status" aria-live="polite"></span>
    </div>
  </section>

  <div id="findings"></div>
</main>
<footer>
  <p>SIGSHIP ${version}. <span class="plain-only">To close the dashboard, go back to the terminal window and press Ctrl+C.</span><span class="dev-only">To stop the dashboard, press Ctrl+C in the terminal.</span></p>
  <p>SIGSHIP uses pattern checks. A GO means these checks found nothing that blocks launch. It does not prove the app is safe.</p>
  <p><span class="plain-only">Plain words are on. Flip the switch at the top for file paths and technical detail.</span><span class="dev-only">Developer mode: file paths, timings and flags are shown. Exit 0 only on GO.</span></p>
</footer>
<script nonce="${nonce}">${SCRIPT}</script>
</body>
</html>
`;
}

// Colour tokens mirror site/style.css (Night Harbour). Flags keep their true colours in both themes.
// Night is the default, like the website. Day and Plain/Dev are remembered in this browser only.
const CSS = `
:root {
  --sail: #f6f7f9; --paper: #ffffff; --ink: #0b1324; --slate: #5b6578; --line: #dde1e8; --line-strong: #8a96a8;
  --blue: #1f4fd1; --red: #c81e1e; --yellow: #f5c518; --green: #15803d; --amber: #b45309;
  --flag-white: #ffffff; --flag-black: #0b1324; --flag-blue: #1f4fd1; --flag-red: #d92d20; --flag-yellow: #f5c518;
  --panel: #0b1324; --on-panel: #ffffff; --deck: #141d31;
  --link: #1f4fd1; --btn-bg: #1f4fd1; --btn-text: #ffffff; --glow-rgb: 31, 79, 209;
  --gutter: clamp(16px, 4vw, 56px); --r: 12px;
  color-scheme: light;
}
:root.dark {
  --sail: #0b1324; --paper: #141d31; --ink: #f3f5f8; --slate: #9aa3b5; --line: #26304a; --line-strong: #3b4a68;
  --red: #f87171; --green: #4ade80; --amber: #fbbf24; --panel: #070d1b; --deck: #0f1a2e;
  --link: #7fa2f7; --glow-rgb: 127, 162, 247;
  color-scheme: dark;
}
:root.dark body {
  background:
    radial-gradient(1100px 600px at 80% -10%, rgb(31 79 209 / .28), transparent 60%),
    linear-gradient(rgb(127 162 247 / .05) 1px, transparent 1px) 0 0 / 56px 56px,
    linear-gradient(90deg, rgb(127 162 247 / .05) 1px, transparent 1px) 0 0 / 56px 56px,
    var(--sail);
}
:root.dark .verdict.no b { box-shadow: 0 0 40px rgb(248 113 113 / .45); }
:root.dark .verdict.go b { box-shadow: 0 0 40px rgb(74 222 128 / .5); }
:root.dark .hoist li::after { box-shadow: 0 0 12px rgb(var(--glow-rgb) / .55); }
:root[data-mode="dev"] .plain-only { display: none !important; }
:root:not([data-mode="dev"]) .dev-only { display: none !important; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; min-height: 100vh; background: var(--sail); color: var(--ink); font: 400 1.03rem/1.55 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; transition: background .25s, color .25s; }
h1, h2, h3, p, ol { margin: 0; }
h1, h2, h3 { letter-spacing: -.02em; }
ol { padding: 0; list-style: none; }
code { font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 0.92em; overflow-wrap: anywhere; }
a { color: var(--link); }
:focus-visible { outline: 2px solid var(--link); outline-offset: 3px; }
[hidden] { display: none !important; }
.defs { position: absolute; }

.mast { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 12px var(--gutter); background: color-mix(in srgb, var(--sail) 82%, transparent); -webkit-backdrop-filter: blur(14px) saturate(1.3); backdrop-filter: blur(14px) saturate(1.3); border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: 0.04em; }
.brand svg { width: 30px; height: 27px; margin-top: -6px; }
.tag { color: var(--slate); font-weight: 500; letter-spacing: 0; }
.local { color: var(--slate); font-size: 0.9rem; }
.ctl { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; }
.sw { display: inline-flex; align-items: center; gap: 9px; min-height: 40px; padding: 4px 6px 4px 13px; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); color: var(--slate); font-family: inherit; font-size: .8rem; font-weight: 600; line-height: 1; cursor: pointer; }
.sw:hover { border-color: var(--link); filter: none; }
.sw .l1 { color: var(--ink); } :root[data-mode="dev"] .sw .l1 { color: var(--slate); } :root[data-mode="dev"] .sw .l2 { color: var(--ink); }
.knob { position: relative; width: 36px; height: 22px; border-radius: 999px; background: var(--line); transition: background .25s; }
.knob::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--ink); transition: transform .25s cubic-bezier(.2, .7, .2, 1); }
:root[data-mode="dev"] .knob { background: var(--blue); } :root[data-mode="dev"] .knob::after { transform: translateX(14px); background: #fff; }
.icon-btn { display: grid; place-items: center; width: 40px; height: 40px; padding: 0; border: 1px solid var(--line); border-radius: var(--r); background: var(--paper); color: var(--ink); cursor: pointer; }
.icon-btn:hover { border-color: var(--link); filter: none; }
.icon-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.icon-btn .sun { display: none; } :root.dark .icon-btn .sun { display: block; } :root.dark .icon-btn .moon { display: none; }

.hoist-wrap { padding: 0 var(--gutter); overflow: hidden; }
.hoist { display: grid; grid-template-columns: repeat(7, 1fr); gap: clamp(4px, 0.9vw, 10px); max-width: 460px; padding-top: 12px; }
.hoist li { position: relative; transform-origin: 50% 0; }
.hoist li:nth-child(1) { --i: 0; } .hoist li:nth-child(2) { --i: 1; } .hoist li:nth-child(3) { --i: 2; } .hoist li:nth-child(4) { --i: 3; } .hoist li:nth-child(5) { --i: 4; } .hoist li:nth-child(6) { --i: 5; } .hoist li:nth-child(7) { --i: 6; }
.hoist li::after { content: ''; position: absolute; top: -10px; left: -100vw; right: -100vw; height: 2px; background: var(--line-strong); }
.hoist li::before { content: ''; position: absolute; top: -10px; left: 14%; right: 14%; height: 10px; border-inline: 2px solid var(--line-strong); }
.hoist svg { display: block; width: 100%; height: auto; border-radius: 2px; box-shadow: 0 6px 16px rgb(0 0 0 / .25); }
.busy .hoist li { animation: sway 1.2s ease-in-out infinite alternate; animation-delay: calc(var(--i) * -0.2s); }
@keyframes sway { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }

main { padding: 28px var(--gutter) 40px; max-width: 1100px; }
.pick { display: grid; gap: 8px; max-width: 760px; }
.pick > label { font-weight: 600; }
.row { display: flex; gap: 8px; }
input[type='text'] {
  flex: 1; min-width: 0; padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--r);
  background: var(--paper); color: var(--ink); font: 1rem 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
input[type='text']:focus { border-color: var(--link); }
button {
  padding: 12px 18px; border: 1px solid var(--btn-bg); border-radius: var(--r); background: var(--btn-bg); color: var(--btn-text);
  font-family: inherit; font-size: 1rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: transform .2s, box-shadow .2s, background .2s;
}
button:hover { background: #2a5be0; border-color: #2a5be0; transform: translateY(-1px); box-shadow: 0 10px 26px rgb(31 79 209 / .35); }
button:disabled { opacity: 0.55; cursor: progress; transform: none; box-shadow: none; }
button.ghost { background: transparent; color: var(--ink); border-color: var(--line); }
button.ghost:hover { background: transparent; border-color: var(--link); box-shadow: none; }
.strict { display: inline-flex; align-items: center; gap: 8px; color: var(--slate); font-size: 0.95rem; }
.strict input { width: 18px; height: 18px; accent-color: var(--blue); }

.board { margin-top: 32px; padding: clamp(20px, 4vw, 36px); background: var(--paper); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 12px 30px rgb(0 0 0 / .08); }
.where { color: var(--slate); font-size: 0.95rem; overflow-wrap: anywhere; }
.verdict { margin: 10px 0 14px; line-height: 1; }
.verdict b, .verdict .wait {
  display: inline-block; padding: 12px 24px 10px; border-radius: 14px;
  font-size: clamp(3rem, 12vw, 6.5rem); font-weight: 800; letter-spacing: -0.02em;
}
.verdict .wait { padding-inline: 0; color: var(--slate); }
.verdict.no b { background: #c81e1e; color: #ffffff; }
.verdict.go b { background: #4ade80; color: #0b1324; }
.verdict b { animation: light 600ms ease-out both; }
@keyframes light { from { opacity: 0.3; filter: grayscale(1); } to { opacity: 1; filter: none; } }
.tally { font-size: 1.2rem; font-weight: 600; }
.note, .meta { margin-top: 6px; color: var(--slate); max-width: 70ch; }
.error { margin-top: 12px; padding: 12px 14px; border-left: 4px solid var(--red); background: var(--sail); border-radius: 0 var(--r) var(--r) 0; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 22px; }
.status { color: var(--slate); font-size: 0.95rem; }

.group { margin-top: 36px; }
.group h2 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; font-size: 1.35rem; }
.group h2 small { color: var(--slate); font-size: 0.95rem; font-weight: 500; }
.group ol { display: grid; gap: 12px; margin-top: 14px; }
.finding { padding: 18px 20px; background: var(--paper); border: 1px solid var(--line); border-left: 6px solid var(--bar); border-radius: 14px; }
.s1 { --bar: var(--red); } .s2 { --bar: var(--yellow); } .s3 { --bar: var(--slate); }
.sev { display: inline-block; margin-right: 8px; font-size: 0.8rem; font-weight: 750; letter-spacing: 0.04em; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.s1 .sev { color: var(--red); } .s2 .sev { color: var(--amber); } .s3 .sev { color: var(--slate); }
.finding h3 { display: inline; font-size: 1.1rem; }
.finding .loc { margin-top: 6px; color: var(--slate); font-size: 0.95rem; }
.finding .loc code { color: var(--ink); margin-right: 6px; }
.finding .forecast { margin-top: 8px; max-width: 75ch; }
.finding .fix { margin-top: 10px; padding: 10px 12px; background: var(--sail); border-radius: 8px; max-width: 80ch; }
.finding .fix b { margin-right: 6px; }

footer { padding: 24px var(--gutter) 40px; color: var(--slate); font-size: 0.9rem; display: grid; gap: 4px; max-width: 90ch; }

@media (max-width: 560px) {
  .row { flex-direction: column; }
  .local { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .busy .hoist li, .verdict b { animation: none; }
  body, button, .knob, .knob::after { transition: none; }
}
`;

// Builds every element with textContent, so nothing from a scan is ever read as HTML.
const SCRIPT = `
(() => {
  const token = new URLSearchParams(location.search).get('token') || '';
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const GROUPS = {
    1: 'Blocks launch. Fix first.',
    2: 'Blocks launch.',
    3: 'Worth fixing. Blocks launch only in strict mode.',
  };
  const strictBox = $('strict');
  strictBox.checked = document.body.dataset.strict === '1';
  // Plain/Dev and Night/Day, remembered in this browser only. Same keys as the website.
  const root = document.documentElement;
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const syncMode = () => $('mode').setAttribute('aria-pressed', String(root.dataset.mode === 'dev'));
  $('mode').addEventListener('click', () => { if (root.dataset.mode === 'dev') delete root.dataset.mode; else root.dataset.mode = 'dev'; store('sigship-mode', root.dataset.mode === 'dev' ? 'dev' : 'plain'); syncMode(); });
  $('theme').addEventListener('click', () => { root.classList.toggle('dark'); store('sigship-theme', root.classList.contains('dark') ? 'dark' : 'light'); });
  syncMode();
  let last = { folder: '', prompt: '' };

  function busy(on, folder) {
    document.body.classList.toggle('busy', on);
    $('board').setAttribute('aria-busy', on ? 'true' : 'false');
    for (const id of ['go', 'rerun', 'copy']) $(id).disabled = on;
    if (on) $('status').textContent = folder ? 'Checking ' + folder + '…' : 'Checking…';
  }

  function render(data) {
    last = { folder: data.folder, prompt: data.prompt };
    $('folder').value = data.folder;
    strictBox.checked = !!data.strict;
    $('error').hidden = true;
    $('where').textContent = data.name + ' · ' + data.folder;
    const verdict = $('verdict');
    verdict.className = 'verdict ' + (data.go ? 'go' : 'no');
    verdict.replaceChildren(el('b', null, data.verdict));
    const c = data.counts;
    $('tally').textContent = c.sev1 + ' SEV-1, ' + c.sev2 + ' SEV-2, ' + c.sev3 + ' SEV-3.';
    $('note').textContent = data.go
      ? 'These checks found nothing that blocks launch. It does not prove the app is safe.'
      : 'Something blocks launch. Copy the fix prompt and paste it into your AI tool, then re-run.';
    $('meta').textContent = 'Read ' + data.filesRead + ' files in ' + data.ms + ' ms, ran ' + data.checksRun + ' checks.';
    const pro = $('pro');
    if (data.pro) {
      const parts = [];
      if (data.pro.checks) parts.push('Pro pack: ' + data.pro.checks + ' extra checks included.');
      if (data.pro.message) parts.push(data.pro.message);
      pro.textContent = parts.join(' ');
      pro.hidden = !parts.length;
    } else {
      pro.hidden = true;
    }
    $('copy').hidden = data.go;
    document.title = data.verdict + ' · ' + data.name + ' · SIGSHIP';

    const list = $('findings');
    list.replaceChildren();
    for (const sev of [1, 2, 3]) {
      const items = data.findings.filter((f) => f.severity === sev);
      if (!items.length) continue;
      const group = el('section', 'group');
      const h2 = el('h2', null, 'SEV-' + sev + ' (' + items.length + ')');
      h2.append(el('small', null, sev === 3 && data.strict ? 'Blocks launch in strict mode.' : GROUPS[sev]));
      group.append(h2);
      const ol = el('ol');
      for (const f of items) {
        const li = el('li', 'finding s' + sev);
        li.append(el('span', 'sev', 'SEV-' + sev), el('h3', null, f.title));
        const loc = el('p', 'loc');
        loc.append(el('code', null, f.file + ':' + f.line), document.createTextNode(f.detail));
        const fix = el('p', 'fix');
        fix.append(el('b', null, 'Fix'), document.createTextNode(f.fix));
        li.append(loc, el('p', 'forecast', f.forecast), fix);
        ol.append(li);
      }
      group.append(ol);
      list.append(group);
    }
  }

  async function run(folder) {
    busy(true, folder);
    const q = new URLSearchParams({ token });
    if (folder) q.set('folder', folder);
    q.set('strict', strictBox.checked ? '1' : '0');
    try {
      const res = await fetch('/api/scan?' + q.toString(), { cache: 'no-store' });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.error || 'SIGSHIP could not run. Is the dashboard still running in your terminal?');
      render(data);
      $('status').textContent = 'Checked. ' + data.verdict + '.';
    } catch (error) {
      const msg = error instanceof TypeError ? 'Lost the dashboard. Start it again with npx sigship ui.' : error.message;
      $('error').textContent = msg;
      $('error').hidden = false;
      $('status').textContent = '';
    } finally {
      busy(false);
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = el('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
  }

  $('pick').addEventListener('submit', (event) => {
    event.preventDefault();
    const folder = $('folder').value.trim();
    run(folder || last.folder);
  });
  $('rerun').addEventListener('click', () => run(last.folder));
  strictBox.addEventListener('change', () => { if (last.folder) run(last.folder); });
  $('copy').addEventListener('click', async () => {
    await copy(last.prompt);
    $('status').textContent = 'Fix prompt copied. Paste it into your AI tool.';
  });
  run('');
})();
`;
