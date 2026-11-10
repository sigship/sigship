import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';
import { inflate, listZip, stripRoot } from '../site/check/unzip.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// A minimal zip writer, enough to test the reader: stored or deflated entries, one central directory.
function zip(files, { stored = false } = {}) {
  const parts = [], central = [];
  let offset = 0;
  const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
  for (const [path, text] of Object.entries(files)) {
    const name = Buffer.from(path);
    const raw = Buffer.from(text);
    const isDir = path.endsWith('/');
    const method = stored || isDir ? 0 : 8;
    const data = method === 8 ? deflateRawSync(raw) : raw;
    const head = [u16(0), u16(method), u16(0), u16(0), u32(isDir ? 0 : crc32(raw)), u32(data.length), u32(raw.length), u16(name.length), u16(0)];
    const local = Buffer.concat([u32(0x04034b50), u16(20), ...head, name, data]);
    central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), ...head, u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    parts.push(local);
    offset += local.length;
  }
  const cd = Buffer.concat(central);
  const eocd = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(cd.length), u32(offset), u16(0)]);
  return Buffer.concat([...parts, cd, eocd]);
}

const FIXTURE = {
  'app/': '',
  'app/package.json': JSON.stringify({ name: 'zipped', dependencies: { react: '^19.0.0' } }),
  'app/src/index.tsx': 'export const x = 1;\n' + 'const line = "repeat me ";\n'.repeat(400),
  'app/README.md': 'hello\n',
  'app/.env': 'SECRET_TOKEN=abcdefghijklmnop\n',
};

describe('unzip', () => {
  it('inflates what node:zlib deflated, including long repeats and a dynamic block', () => {
    const text = 'abc'.repeat(5000) + Array.from({ length: 3000 }, (_, i) => String.fromCharCode(32 + (i * 7) % 90)).join('') + 'the end';
    const raw = Buffer.from(text);
    for (const level of [1, 6, 9]) {
      const out = inflate(new Uint8Array(deflateRawSync(raw, { level })), raw.length);
      assert.equal(Buffer.from(out).toString(), text, `level ${level}`);
    }
    // level 0 writes stored blocks
    const stored = inflate(new Uint8Array(deflateRawSync(raw, { level: 0 })), raw.length);
    assert.equal(Buffer.from(stored).toString(), text);
    // an unknown size still works
    assert.equal(Buffer.from(inflate(new Uint8Array(deflateRawSync(raw)), 0)).toString(), text);
  });

  it('reads deflated and stored entries back from a zip and skips folders', () => {
    for (const stored of [false, true]) {
      const entries = listZip(new Uint8Array(zip(FIXTURE, { stored })));
      const paths = entries.map((e) => e.path).sort();
      assert.deepEqual(paths, ['app/.env', 'app/README.md', 'app/package.json', 'app/src/index.tsx']);
      for (const e of entries) {
        assert.equal(new TextDecoder().decode(e.read()), FIXTURE[e.path], e.path);
        assert.equal(e.size, Buffer.byteLength(FIXTURE[e.path]));
      }
    }
  });

  it('strips the single top folder that Finder and GitHub add', () => {
    const entries = stripRoot(listZip(new Uint8Array(zip(FIXTURE))));
    assert.deepEqual(entries.map((e) => e.path).sort(), ['.env', 'README.md', 'package.json', 'src/index.tsx']);
    const flat = stripRoot(listZip(new Uint8Array(zip({ 'a.js': '1', 'b.js': '2' }))));
    assert.deepEqual(flat.map((e) => e.path).sort(), ['a.js', 'b.js']);
  });

  it('never lets a path climb out of the project', () => {
    const entries = listZip(new Uint8Array(zip({ '../../etc/passwd': 'x', 'ok/./file.js': 'y' })));
    assert.deepEqual(entries.map((e) => e.path).sort(), ['etc/passwd', 'ok/file.js']);
  });

  it('rejects something that is not a zip', () => {
    assert.throws(() => listZip(new Uint8Array(Buffer.from('not a zip at all, just text'))), /Not a zip/);
  });
});

// ---------- The engine bundle against the CLI ----------
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { scan } from '../src/scan.js';
import { toPrompt as cliPrompt } from '../src/report.js';
import { buildCheck } from '../scripts/build-check.js';

const FAKE_OPENAI = ['sk', 'proj', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'].join('-');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (role) => [b64({ alg: 'HS256', typ: 'JWT' }), b64({ iss: 'supabase', role, exp: 2000000000 }), 'c2lnbmF0dXJlLXZhbHVlLWhlcmU'].join('.');

// A project with one hit for most checks. No git repo: both the CLI and the browser decide .env by .gitignore.
const PROJECT = {
  'package.json': JSON.stringify({ name: 'bad', dependencies: { react: '^19.0.0', openai: '^5.0.0', '@supabase/supabase-js': '^2.0.0' }, scripts: { test: 'echo "Error: no test specified" && exit 1' } }),
  '.env': `OPENAI_API_KEY=${FAKE_OPENAI}\n`,
  'src/lib/ai.ts': `export const ai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_KEY, dangerouslyAllowBrowser: true });\n`,
  'src/lib/admin.ts': `export const supabaseAdmin = createClient(url, '${jwt('service_role')}');\n`,
  'src/pages/Admin.tsx': `const isAdmin = localStorage.getItem('isAdmin');\nconst p = <div dangerouslySetInnerHTML={{ __html: bio }} />;\nconsole.log('login', password);\n`,
  'src/api/stripe-webhook.ts': `export async function POST(req) {\n  const event = await req.json();\n  if (event.type === 'checkout.session.completed') await upgrade(event);\n}\n`,
  'src/api/chat.ts': `export async function POST(req) {\n  return openai.chat.completions.create({ model: 'x', messages: [] });\n}\n`,
  'src/api/search.ts': 'export const q = (name) => db.query(`select * from users where name = \'${name}\'`);\nconst h = { "Access-Control-Allow-Origin": "*" };\n',
  'supabase/migrations/001.sql': `create table public.profiles (id uuid primary key);\ncreate policy "open" on public.safe for update using (true);\n`,
  'node_modules/evil/index.js': `const k = '${FAKE_OPENAI}';\n`,
  'logo.png': 'not really text',
  'docs/notes.md': 'nothing here',
};

const write = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'sigship-check-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};

// What the worker hands the engine: every path with a lazy reader, like a folder handle or a zip.
const entriesOf = (files) => Object.entries(files).map(([path, text]) => ({ path, size: Buffer.byteLength(text), text: async () => text }));

describe('browser engine', () => {
  it('gives the same findings as scan() on the same files', async () => {
    buildCheck();
    const engine = await import('../site/check/engine.js?' + Date.now());
    const root = write(PROJECT);
    try {
      const cli = scan(root);
      const ctx = await engine.contextFromEntries(entriesOf(PROJECT));
      const web = engine.scanFiles(ctx);
      assert.ok(cli.findings.length >= 10, `the fixture should trip many checks, got ${cli.findings.length}`);
      assert.deepEqual(web.findings, cli.findings);
      assert.deepEqual(web.counts, cli.counts);
      assert.equal(web.filesRead, cli.filesRead);
      assert.equal(web.checksRun, cli.checksRun);
      assert.equal(engine.toPrompt(web), cliPrompt(cli));
      assert.equal(engine.verdict(web).label, 'NO-GO');
      assert.equal(engine.VERSION, JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('treats .env as safe when .gitignore covers it, like the CLI outside git', async () => {
    const engine = await import('../site/check/engine.js');
    const files = { ...PROJECT, '.gitignore': 'node_modules\n.env\n' };
    const root = write(files);
    try {
      const cli = scan(root);
      const web = engine.scanFiles(await engine.contextFromEntries(entriesOf(files)));
      assert.deepEqual(web.findings, cli.findings);
      assert.ok(!web.findings.some((f) => f.id === 'env-file-committed'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('is zero findings and GO on a clean project, with the same prompt text', async () => {
    const engine = await import('../site/check/engine.js');
    const files = { 'package.json': JSON.stringify({ name: 'tiny', scripts: { test: 'vitest run' } }), 'package-lock.json': '{}', 'src/index.ts': 'export const ok = 1;\n', 'src/a.test.ts': 'test("x", () => {});\n' };
    const web = engine.scanFiles(await engine.contextFromEntries(entriesOf(files)));
    assert.deepEqual(web.findings, []);
    assert.equal(engine.verdict(web).go, true);
    assert.equal(engine.toPrompt(web), 'SIGSHIP found nothing blocking. Nothing to fix.');
  });

  it('runs end to end from a zip through the context loader', async () => {
    const engine = await import('../site/check/engine.js');
    const entries = stripRoot(listZip(new Uint8Array(zip(Object.fromEntries(Object.entries(PROJECT).map(([p, t]) => ['app/' + p, t]))))))
      .map((e) => ({ path: e.path, size: e.size, text: () => new TextDecoder().decode(e.read()) }));
    const web = engine.scanFiles(await engine.contextFromEntries(entries));
    const root = write(PROJECT);
    try {
      assert.deepEqual(web.findings, scan(root).findings);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('check page', () => {
  it('exists, loads nothing from outside sigship.dev, and carries the GO caveat', () => {
    const html = readFileSync(join(ROOT, 'site/check/index.html'), 'utf8');
    assert.ok(html.includes('<main id="main">') && html.includes('</main>'));
    const urls = [...html.matchAll(/\b(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
    const external = urls.filter((u) => /^(https?:)?\/\//.test(u) && !/^https:\/\/sigship\.dev\//.test(u));
    // The header and footer link out to GitHub, Discord and zoof04; those are links, not loads.
    const loads = [...html.matchAll(/<(?:script|link|img|iframe|video|audio|source)\b[^>]*\b(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(loads.filter((u) => /^(https?:)?\/\//.test(u) && !/^https:\/\/sigship\.dev\//.test(u)), [], 'every script, stylesheet and image is served from this site');
    assert.ok(external.every((u) => /^https:\/\/(github\.com|discord\.gg|zoof04\.com)(\/|$)/.test(u)), external.join(' '));
    assert.ok(/It does not prove the app is safe/.test(html));
    assert.ok(html.includes('/check/check.js') && html.includes('/app.css'));
    for (const f of ['engine.js', 'worker.js', 'check.js', 'unzip.js']) {
      const code = readFileSync(join(ROOT, 'site/check', f), 'utf8');
      assert.ok(!/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|importScripts\s*\(\s*['"]https?:/.test(code), `${f} makes no network calls`);
    }
    assert.ok(statSync(join(ROOT, 'site/check/engine.js')).size > 10_000);
  });
});
