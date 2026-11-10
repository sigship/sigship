// The page script for sigship.dev/check/. Picks a folder or zip, hands it to the worker, and shows the verdict.
// Nothing here talks to the network. The badge ID and embed code mirror site/app.js and scripts/badge-id.js.
import { toPrompt, verdict } from './engine.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = $('[data-check]');
if (root) init();

function init() {
  const status = $('[data-status]');
  const drop = $('[data-drop]');
  const steps = { pick: $('#step-pick'), verdict: $('#step-verdict'), fix: $('#step-fix'), again: $('#step-again'), badge: $('#step-badge') };
  const folderBtn = $('[data-pick-folder]');
  const zipBtn = $('[data-pick-zip]');
  const zipInput = $('[data-zip-input]');
  const folderInput = $('[data-folder-input]');
  const canPick = 'showDirectoryPicker' in window;
  const canInputDir = 'webkitdirectory' in document.createElement('input');
  if (!canPick && !canInputDir) folderBtn.hidden = true;

  let worker = null;
  let source = null; // the last thing checked, so "Check again" can re-read it

  const say = (text, tone, busy) => {
    status.dataset.tone = tone || '';
    status.innerHTML = '';
    if (busy) { const bar = document.createElement('span'); bar.className = 'ck-bar'; bar.innerHTML = '<i></i>'; status.append(bar); }
    status.append(document.createTextNode(text));
  };

  // The worker starts with the page, so its scripts load now and nothing is requested later.
  const fresh = () => {
    if (worker) return worker;
    worker = new Worker('/check/worker.js', { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') say(`Reading… ${data.read} files found`, '', true);
      else if (data.type === 'result') show(data);
      else if (data.type === 'error') fail(data.message);
    };
    worker.onerror = (e) => { fail(e.message || 'The check could not run in this browser.'); worker.terminate(); worker = null; };
    return worker;
  };
  fresh();

  function run(src) {
    source = src;
    for (const k of ['verdict', 'fix', 'again', 'badge']) steps[k].hidden = true;
    say('Reading your project…', '', true);
    const w = fresh();
    if (src.kind === 'zip') {
      src.file.arrayBuffer().then((buffer) => w.postMessage({ kind: 'zip', buffer }, [buffer])).catch((e) => fail(e.message));
    } else if (src.kind === 'handle') {
      w.postMessage({ kind: 'handle', handle: src.handle });
    } else {
      w.postMessage({ kind: 'files', files: src.files });
    }
  }

  function fail(message) {
    say(message, 'stop');
    steps.again.hidden = false;
  }

  function show({ result, listed }) {
    const v = verdict(result);
    const { sev1, sev2, sev3 } = result.counts;
    if (!listed) {
      say('That looks empty. Pick the folder that holds your project, or a zip of it.', 'stop');
      return;
    }
    say(`Read ${result.filesRead} files in ${result.ms} ms, ran ${result.checksRun} checks.`);
    const box = $('[data-verdict]');
    box.className = 'ck-verdict' + (v.go ? ' go' : '');
    box.innerHTML = `<b>${v.go ? 'Ready' : 'Fix first'}</b><span>${sev1} fix now · ${sev2} fix soon · ${sev3} worth fixing</span>`;
    $('[data-caveat]').textContent = v.go
      ? 'Ready (a GO) means these checks found nothing that blocks launch. It does not prove the app is safe.'
      : 'Fix first (a NO-GO) means at least one finding would block launch. Fix those, then check again.';
    renderFindings(result.findings);
    const prompt = toPrompt(result);
    $('[data-prompt]').textContent = prompt;
    for (const b of $$('[data-copy-fix]')) b.dataset.copy = prompt;
    steps.verdict.hidden = false;
    steps.fix.hidden = v.go;
    steps.again.hidden = false;
    steps.badge.hidden = !v.go;
    if (v.go) paintBadge();
    steps.verdict.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  const GROUPS = [
    { sev: 1, plain: 'Fix now', dev: 'SEV-1 · blocks launch', c: 'var(--stop)' },
    { sev: 2, plain: 'Fix soon', dev: 'SEV-2 · blocks launch', c: 'var(--warn)' },
    { sev: 3, plain: 'Worth fixing', dev: 'SEV-3 · advice', c: 'var(--muted-foreground)' },
  ];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function renderFindings(findings) {
    const out = $('[data-findings]');
    if (!findings.length) {
      out.innerHTML = '<p class="ck-empty">No findings. Every one of the checks came back clean.</p>';
      return;
    }
    out.innerHTML = GROUPS.map((g) => {
      const list = findings.filter((f) => f.severity === g.sev);
      if (!list.length) return '';
      return `<div class="ck-group" style="--c:${g.c}"><h3><i></i><span class="s">${g.plain}</span><span class="d">${g.dev}</span><span class="muted">· ${list.length}</span></h3><div class="ck-list">${list
        .map(
          (f) => `<div class="finding"><b>${esc(f.title)}</b><span class="where">${esc(f.file)}:${f.line} · ${esc(f.detail)}</span><p><span class="s">What happens if you ship it: </span><span class="d">Forecast: </span>${esc(f.forecast)}</p><p><span>Fix: </span>${esc(f.fix)}</p></div>`,
        )
        .join('')}</div></div>`;
    }).join('');
  }

  // ---------- Badge (same formula as scripts/badge-id.js and site/app.js) ----------
  const host = (v) => String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:\s]/)[0].slice(0, 80);
  const badgeId = (letter, site) => {
    let h = 0x811c9dc5;
    for (const ch of `${letter}:${host(site)}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
    let code = '';
    for (let i = 0; i < 6; i++) { code += '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[h & 31]; h >>>= 5; }
    return `SG-${letter}-${code}`;
  };
  function paintBadge() {
    const site = host($('[data-site]').value) || 'myapp.com', id = badgeId('S', site), rec = `https://sigship.dev/verify/?id=${id}&site=${encodeURIComponent(site)}`;
    const code = `<a href="${rec}" title="Check this SIGSHIP badge">\n  <img src="https://sigship.dev/b/${id}.svg"\n       alt="Self-checked with SIGSHIP, badge ${id}" height="32">\n</a>`;
    $('[data-badge-code]').textContent = code;
    $('[data-badge-copy]').dataset.copy = code;
    for (const el of $$('[data-badge-id]')) el.textContent = id;
    const link = $('[data-badge-link]');
    link.href = rec.replace('https://sigship.dev', '');
    link.setAttribute('aria-label', `SIGSHIP badge: Self-checked, level 1 of 5 (Steel), ID ${id}. Check this badge on sigship.dev`);
  }
  $('[data-site]').addEventListener('input', paintBadge);

  // ---------- Picking ----------
  folderBtn.addEventListener('click', async () => {
    if (canPick) {
      try {
        const handle = await window.showDirectoryPicker({ mode: 'read' });
        run({ kind: 'handle', handle });
      } catch (e) {
        if (e && e.name !== 'AbortError') fail(e.message);
      }
    } else {
      folderInput.click();
    }
  });
  zipBtn.addEventListener('click', () => zipInput.click());
  zipInput.addEventListener('change', () => { if (zipInput.files[0]) run({ kind: 'zip', file: zipInput.files[0] }); zipInput.value = ''; });
  folderInput.addEventListener('change', () => {
    const files = [...folderInput.files].map((file) => ({ path: stripTop(file.webkitRelativePath || file.name), file }));
    if (files.length) run({ kind: 'files', files });
    folderInput.value = '';
  });
  const stripTop = (p) => p.split('/').slice(1).join('/') || p;

  for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); });
  for (const ev of ['dragleave', 'drop']) drop.addEventListener(ev, () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    const item = e.dataTransfer.items && e.dataTransfer.items[0];
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!item) return;
    try {
      if (item.getAsFileSystemHandle) {
        const handle = await item.getAsFileSystemHandle();
        if (handle && handle.kind === 'directory') return run({ kind: 'handle', handle });
      }
      const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
      if (entry && entry.isDirectory) {
        say('Reading your project…', '', true);
        const files = await readEntry(entry, '');
        return run({ kind: 'files', files });
      }
      if (file && /\.zip$/i.test(file.name)) return run({ kind: 'zip', file });
      say('Drop a folder or a .zip file.', 'stop');
    } catch (err) {
      fail(err.message);
    }
  });

  // Walks a dropped folder in browsers without file system handles (Firefox, Safari).
  async function readEntry(entry, prefix) {
    const out = [];
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const child of batch) {
        if (child.isDirectory) {
          if (!['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output', '.vercel', '.turbo', 'coverage', 'vendor', '.venv', '__pycache__', '.cache'].includes(child.name)) out.push(...(await readEntry(child, prefix + child.name + '/')));
        } else {
          const f = await new Promise((res, rej) => child.file(res, rej));
          out.push({ path: prefix + child.name, file: f });
        }
      }
    }
    return out;
  }

  $('[data-again]').addEventListener('click', () => {
    if (!source) return;
    if (source.kind === 'zip') { say('Export the zip again and pick the new file.'); zipInput.click(); return; }
    run(source);
  });
  $('[data-pick-other]').addEventListener('click', () => {
    source = null;
    for (const k of ['verdict', 'fix', 'again', 'badge']) steps[k].hidden = true;
    say('');
    steps.pick.scrollIntoView({ block: 'start' });
    folderBtn.hidden ? zipBtn.focus() : folderBtn.focus();
  });
}
