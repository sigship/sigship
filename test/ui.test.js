import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { startUi } from '../src/ui.js';

const KEY = ['POLAR', 'TEST', 'KEY', '0000'].join('-');

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sigship-ui-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

// A raw request, so tests can set the Host header a browser would send.
function get(url, { host } = {}) {
  const target = new URL(url);
  return new Promise((done, fail) => {
    const req = request({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers: host ? { host } : {} }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', fail);
    req.end();
  });
}

const SECRET = ['sk', 'live', '51HxQxYzAbCdEfGhIjKlMnOpQrStUv'].join('_');

describe('sigship ui', () => {
  let root, ui, calls;
  const noNetwork = async (...args) => {
    calls.push(args);
    throw new Error('network used');
  };

  before(async () => {
    calls = [];
    root = project({
      'package.json': JSON.stringify({ name: 'demo', dependencies: { stripe: '1' } }),
      'src/pay.js': `const stripe = require('stripe')('${SECRET}');\n`,
    });
    ui = await startUi({ target: root, env: {}, fetch: noNetwork });
  });
  after(async () => {
    await ui.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('binds to 127.0.0.1 only, on a free port', () => {
    const address = ui.server.address();
    assert.equal(address.address, '127.0.0.1');
    assert.ok(address.port > 0);
    assert.match(ui.url, /^http:\/\/127\.0\.0\.1:\d+\/\?token=[0-9a-f]{48}$/);
  });

  it('rejects requests without the token or with a wrong one', async () => {
    const base = ui.url.split('?')[0];
    assert.equal((await get(base)).status, 403);
    assert.equal((await get(`${base}api/scan`)).status, 403);
    assert.equal((await get(`${base}api/scan?token=${'0'.repeat(48)}`)).status, 403);
  });

  it('rejects another host name, so a rebinding page cannot reach it', async () => {
    const res = await get(ui.url, { host: `evil.example:${ui.server.address().port}` });
    assert.equal(res.status, 403);
  });

  it('serves one self-contained page with no external URLs', async () => {
    const res = await get(ui.url);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.headers['content-security-policy'], /default-src 'none'/);
    assert.match(res.body, /Copy fix prompt/);
    assert.match(res.body, /Re-run/);
    assert.doesNotMatch(res.body, /(src|href)="https?:/);
    assert.doesNotMatch(res.body, /url\(['"]?https?:/);
  });

  it('returns findings JSON without file contents or secret values', async () => {
    const res = await get(ui.url.replace('/?', '/api/scan?'));
    assert.equal(res.status, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.verdict, 'NO-GO');
    assert.equal(data.go, false);
    assert.equal(data.folder, root);
    const hit = data.findings.find((f) => f.id === 'secret-in-code');
    assert.ok(hit, 'secret-in-code finding is returned');
    assert.equal(hit.file, 'src/pay.js');
    assert.equal(hit.line, 1);
    assert.ok(hit.forecast && hit.fix);
    assert.match(data.prompt, /Fix these production problems/);
    assert.ok(!res.body.includes(SECRET), 'the secret value is never sent');
    assert.ok(!res.body.includes('require('), 'file contents are never sent');
  });

  it('checks another folder typed into the picker, and reports a missing one', async () => {
    const clean = project({ 'README.md': '# hi\n' });
    try {
      const ok = await get(`${ui.url.replace('/?', '/api/scan?')}&folder=${encodeURIComponent(clean)}`);
      assert.equal(ok.status, 200);
      assert.equal(JSON.parse(ok.body).folder, clean);
      const missing = await get(`${ui.url.replace('/?', '/api/scan?')}&folder=${encodeURIComponent(join(clean, 'nope'))}`);
      assert.equal(missing.status, 400);
      assert.match(JSON.parse(missing.body).error, /Folder not found/);
    } finally {
      rmSync(clean, { recursive: true, force: true });
    }
  });

  it('makes no network call without SIGSHIP_KEY', () => {
    assert.equal(calls.length, 0);
  });

  it('refuses to start on a folder that does not exist', async () => {
    await assert.rejects(startUi({ target: join(root, 'missing'), env: {}, fetch: noNetwork }), /Folder not found/);
  });
});

describe('sigship ui with SIGSHIP_KEY', () => {
  it('adds the Pro pack and never sends the key to the page', async () => {
    const root = project({ 'server/api.js': '// TODO(launch) finish auth\n' });
    const cache = mkdtempSync(join(tmpdir(), 'sigship-ui-cache-'));
    const pack = { version: 1, rules: [{ id: 'test-todo-in-server', severity: 2, title: 'A TODO is left in server code', forecast: 'Something half-built ships.', fix: 'Finish it or remove it.', detail: 'A TODO marker is in server code.', server: true, match: 'TODO\\(launch\\)' }] };
    let sent = 0;
    const fakeFetch = async () => {
      sent += 1;
      return new Response(JSON.stringify({ pack }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const ui = await startUi({ target: root, env: { SIGSHIP_KEY: KEY, XDG_CACHE_HOME: cache }, fetch: fakeFetch });
    try {
      const res = await get(ui.url.replace('/?', '/api/scan?'));
      const data = JSON.parse(res.body);
      assert.equal(sent, 1);
      assert.equal(data.pro.status, 'live');
      assert.ok(data.findings.some((f) => f.id === 'test-todo-in-server'));
      assert.ok(!res.body.includes(KEY));
    } finally {
      await ui.close();
      rmSync(root, { recursive: true, force: true });
      rmSync(cache, { recursive: true, force: true });
    }
  });
});
