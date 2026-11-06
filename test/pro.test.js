import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { compilePack } from '../src/pack.js';
import { loadPro } from '../src/pro.js';
import { init } from '../src/init.js';
import { scan } from '../src/scan.js';
import { toMarkdown } from '../src/report.js';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '../bin/sigship.js');
const run = promisify(execFile);
const KEY = ['POLAR', 'TEST', 'KEY', '0000'].join('-');

// A sample pack for tests. The real Pro pack is private.
const PACK = {
  version: 1,
  rules: [
    {
      id: 'test-todo-in-server',
      severity: 2,
      title: 'A TODO is left in server code',
      forecast: 'Something half-built ships.',
      fix: 'Finish it or remove it.',
      detail: 'A TODO marker is in server code.',
      server: true,
      match: 'TODO\\(launch\\)',
    },
  ],
};

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sigship-pro-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

// A local stand-in for api.sigship.dev that counts every request it gets.
let server;
let api;
let requests;
let reply;

before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push(JSON.parse(body || '{}'));
      const [status, payload] = reply();
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  api = `http://127.0.0.1:${server.address().port}/v1/pack`;
});
after(() => server.close());

let root;
let cache;
beforeEach(() => {
  requests = [];
  reply = () => [200, { pack: PACK }];
  root = project({ 'package.json': '{"name":"demo"}', 'package-lock.json': '{}', 'src/api/x.ts': 'export const x = 1; // TODO(launch)\n' });
  cache = mkdtempSync(join(tmpdir(), 'sigship-cache-'));
});

const cli = (args, env = {}) =>
  run('node', [CLI, ...args], { cwd: root, env: { PATH: process.env.PATH, NO_COLOR: '1', SIGSHIP_API: api, XDG_CACHE_HOME: cache, ...env } }).then(
    (r) => ({ code: 0, out: r.stdout, err: r.stderr }),
    (e) => ({ code: e.code, out: e.stdout, err: e.stderr }),
  );

describe('Pro pack', () => {
  it('free mode makes no network call at all', async () => {
    const result = await cli(['.']);
    assert.equal(requests.length, 0);
    assert.doesNotMatch(result.out, /Pro pack/);
    let called = false;
    const pro = await loadPro(root, { env: {}, fetch: () => (called = true) });
    assert.equal(pro.status, 'off');
    assert.equal(called, false);
  });

  it('with a key, sends only the key and a repo fingerprint, and adds the checks', async () => {
    const result = await cli(['.', '--json'], { SIGSHIP_KEY: KEY });
    assert.equal(requests.length, 1);
    assert.deepEqual(Object.keys(requests[0]).sort(), ['key', 'repo']);
    assert.match(requests[0].repo, /^[a-f0-9]{64}$/);
    const json = JSON.parse(result.out);
    assert.equal(json.pro.status, 'live');
    assert.ok(json.findings.some((f) => f.id === 'test-todo-in-server'));
    assert.equal(result.code, 1);
  });

  it('uses the cache for a day instead of asking again', async () => {
    await cli(['.'], { SIGSHIP_KEY: KEY });
    const second = await cli(['.'], { SIGSHIP_KEY: KEY });
    assert.equal(requests.length, 1);
    assert.match(second.out, /Pro pack: 1 extra checks included/);
  });

  it('never fails a scan when the server is down', async () => {
    const result = await cli(['.'], { SIGSHIP_KEY: KEY, SIGSHIP_API: 'http://127.0.0.1:9/v1/pack' });
    assert.equal(result.code, 0);
    assert.match(result.out, /Could not reach the SIGSHIP server. Ran the free checks/);
  });

  it('falls back to the free checks on a refused key, and never prints the key', async () => {
    reply = () => [403, { error: `Key ${KEY} is no longer active.` }];
    const result = await cli(['.'], { SIGSHIP_KEY: KEY });
    assert.equal(result.code, 0);
    assert.match(result.out, /no longer active. Ran the free checks/);
    assert.ok(!result.out.includes(KEY) && !result.err.includes(KEY));
  });

  it('falls back to the free checks on a broken pack', async () => {
    reply = () => [200, { pack: { rules: [{ id: 'x' }] } }];
    const result = await cli(['.'], { SIGSHIP_KEY: KEY });
    assert.equal(result.code, 0);
    assert.match(result.out, /Ran the free checks/);
  });

  it('writes a client report only with a working key', async () => {
    const without = await cli(['.', '--report']);
    assert.equal(without.code, 2);
    assert.match(without.err, /comes with Solo and Team/);
    assert.equal(existsSync(join(root, 'sigship-report.html')), false);

    const withKey = await cli(['.', '--report'], { SIGSHIP_KEY: KEY });
    const page = readFileSync(join(root, 'sigship-report.html'), 'utf8');
    assert.match(page, /NO-GO/);
    assert.match(page, /A TODO is left in server code/);
    assert.doesNotMatch(page, /<script|https?:\/\/(?!sigship\.dev)/);
    assert.ok(!page.includes(KEY));
    assert.match(withKey.err, /Wrote sigship-report.html/);
  });
});

describe('Pro pack format', () => {
  const base = PACK.rules[0];
  const bad = (change) => () => compilePack({ rules: [{ ...base, ...change }] });

  it('accepts a valid pack', () => assert.equal(compilePack(PACK).length, 1));
  it('rejects a missing field', () => assert.throws(bad({ fix: undefined }), /missing fix/));
  it('rejects a bad severity', () => assert.throws(bad({ severity: 4 }), /bad severity/));
  it('rejects a bad pattern', () => assert.throws(bad({ match: '(' }), /Invalid regular expression/));
  it('rejects a clash with a free check', () => assert.throws(bad({ id: 'no-tests' }), /clashes/));
  it('rejects a pattern that is not text', () => assert.throws(bad({ match: { source: 'x' } }), /bad match/));
});

describe('Solo and Team extras', () => {
  it('init --pro adds the commenting check and the nightly check', () => {
    const dir = project({});
    const lines = init(dir, { pro: true });
    const pr = readFileSync(join(dir, '.github/workflows/sigship.yml'), 'utf8');
    const nightly = readFileSync(join(dir, '.github/workflows/sigship-nightly.yml'), 'utf8');
    assert.match(pr, /secrets\.SIGSHIP_KEY/);
    assert.match(pr, /gh pr comment/);
    assert.match(nightly, /schedule:/);
    assert.match(nightly, /SLACK_WEBHOOK_URL != ''/);
    assert.ok(lines.some((l) => /repository secret SIGSHIP_KEY/.test(l)));
    rmSync(dir, { recursive: true, force: true });
  });

  it('prints Markdown for pull request comments', () => {
    const md = toMarkdown(scan(root, { extraRules: compilePack(PACK) }));
    assert.match(md, /^## SIGSHIP: NO-GO/);
    assert.match(md, /\| SEV-2 \| A TODO is left in server code \| `src\/api\/x.ts:1` \|/);
  });
});
