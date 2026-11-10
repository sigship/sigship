import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { login, logout, readToken, reportRun, runReport, tokenFile } from '../src/cloud.js';
import { scan } from '../src/scan.js';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '../bin/sigship.js');
const run = promisify(execFile);
const TOKEN = 'sgt_test_token_value';

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sigship-cloud-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

// A stand-in for app.sigship.dev/api/v1 that records every request.
let server;
let app;
let requests;
let polls;
before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const json = body ? JSON.parse(body) : undefined;
      requests.push({ method: req.method, path: req.url, auth: req.headers.authorization, body: json });
      const send = (status, payload) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      };
      if (req.url === '/api/v1/device') return send(200, { code: 'secret-device-code', user_code: 'SHIP-1234', verify_url: 'https://app.example/device', expires_in: 60, interval: 1 });
      if (req.url === '/api/v1/device/poll') {
        polls += 1;
        return send(200, polls < 3 ? { status: 'pending' } : { status: 'ok', token: TOKEN });
      }
      if (req.url === '/api/v1/me') return req.headers.authorization === `Bearer ${TOKEN}` ? send(200, { user: { email: 'founder@example.com' } }) : send(401, { error: 'Sign in.' });
      if (req.url === '/api/v1/runs') return req.headers.authorization === `Bearer ${TOKEN}` ? send(200, { ok: true }) : send(401, { error: 'Sign in.' });
      send(404, { error: 'Not found.' });
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  app = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => server.close());

let cache;
let env;
let root;
beforeEach(() => {
  requests = [];
  polls = 0;
  cache = mkdtempSync(join(tmpdir(), 'sigship-cache-'));
  env = { XDG_CACHE_HOME: cache, SIGSHIP_APP: app };
  root = project({ 'package.json': '{"name":"demo"}', 'src/index.js': 'export const ok = 1;\n' });
});

const cli = (args, extra = {}) =>
  run('node', [CLI, ...args], { cwd: root, env: { PATH: process.env.PATH, NO_COLOR: '1', ...env, ...extra } }).then(
    (r) => ({ code: 0, out: r.stdout, err: r.stderr }),
    (e) => ({ code: e.code, out: e.stdout, err: e.stderr }),
  );

describe('sigship login', () => {
  it('runs the device-code flow, opens the browser, saves the token with mode 600 and says who signed in', async () => {
    const log = [];
    const opened = [];
    const { email, file } = await login({ env, open: (url) => opened.push(url), log: (l) => log.push(l), sleep: () => Promise.resolve() });
    assert.equal(email, 'founder@example.com');
    assert.equal(file, tokenFile(env));
    assert.ok(log[0].includes('SHIP-1234') && log[0].includes('https://app.example/device'));
    assert.deepEqual(opened, ['https://app.example/device']);
    assert.ok(log.some((l) => l === 'Signed in as founder@example.com.'));
    assert.equal(readFileSync(file, 'utf8').trim(), TOKEN);
    assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.equal(polls, 3);
    assert.deepEqual(requests.map((r) => r.path), ['/api/v1/device', '/api/v1/device/poll', '/api/v1/device/poll', '/api/v1/device/poll', '/api/v1/me']);
    assert.deepEqual(requests[1].body, { code: 'secret-device-code' });
    assert.ok(!log.some((l) => l.includes(TOKEN)), 'the token is never printed');
  });

  it('gives up when the code expires', async () => {
    const slow = { ...env, SIGSHIP_APP: app };
    polls = -1000; // Never approved.
    const clock = { now: Date.now() };
    const sleep = () => {
      clock.now += 30_000;
      return Promise.resolve();
    };
    const realNow = Date.now;
    Date.now = () => clock.now;
    try {
      await assert.rejects(login({ env: slow, log: () => {}, sleep }), /expired/);
    } finally {
      Date.now = realNow;
    }
    assert.equal(readToken(slow), null);
  });

  it('logout deletes the token and says so', async () => {
    await login({ env, log: () => {}, sleep: () => Promise.resolve() });
    assert.ok(existsSync(tokenFile(env)));
    assert.equal(logout({ env }), true);
    assert.ok(!existsSync(tokenFile(env)));
    assert.equal(logout({ env }), false);
    const result = await cli(['logout']);
    assert.match(result.out, /not signed in/);
  });
});

describe('run reports', () => {
  it('sends nothing when there is no token', async () => {
    const result = await cli(['.']);
    assert.equal(result.code, 0);
    assert.equal(requests.length, 0);
    assert.equal(await reportRun(scan(root), { root, version: '0.0.0', env }), false);
    assert.equal(requests.length, 0);
  });

  it('after login, every check sends only the fingerprint, version, counts, verdict, date and name', async () => {
    await login({ env, log: () => {}, sleep: () => Promise.resolve() });
    requests = [];
    const result = await cli(['.', '--json']);
    assert.equal(result.code, 0);
    assert.equal(requests.length, 1);
    const [sent] = requests;
    assert.equal(sent.path, '/api/v1/runs');
    assert.equal(sent.auth, `Bearer ${TOKEN}`);
    assert.deepEqual(Object.keys(sent.body).sort(), ['counts', 'date', 'fingerprint', 'name', 'verdict', 'version']);
    assert.match(sent.body.fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(sent.body.verdict, 'GO');
    assert.deepEqual(Object.keys(sent.body.counts).sort(), ['sev1', 'sev2', 'sev3']);
    assert.equal(sent.body.sev1 ?? sent.body.counts.sev1, 0);
    assert.equal(sent.body.name, root.split('/').pop());
    assert.ok(!JSON.stringify(sent.body).includes('index.js'), 'no file names');
    assert.equal(JSON.parse(result.out).verdict, 'GO', 'JSON output is untouched');
  });

  it('SIGSHIP_NO_REPORT=1 turns it off, and a dead server never fails the scan', async () => {
    await login({ env, log: () => {}, sleep: () => Promise.resolve() });
    requests = [];
    const off = await cli(['.'], { SIGSHIP_NO_REPORT: '1' });
    assert.equal(off.code, 0);
    assert.equal(requests.length, 0);
    const down = await cli(['.'], { SIGSHIP_APP: 'http://127.0.0.1:9/api/v1' });
    assert.equal(down.code, 0);
    assert.equal(down.err, '');
    assert.match(down.out, /GO/);
  });

  it('the report carries the folder name and a fingerprint salted with the token', () => {
    const result = scan(root);
    const a = runReport(result, { root, version: '1.0.0', token: 'one' });
    const b = runReport(result, { root, version: '1.0.0', token: 'two' });
    assert.notEqual(a.fingerprint, b.fingerprint);
    assert.equal(a.name, root.split('/').pop());
    assert.match(a.date, /^\d{4}-\d{2}-\d{2}T/);
  });
});
