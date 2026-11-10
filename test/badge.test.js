import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { badge, badgeText, embedCode } from '../src/badge.js';
import { badgeId as packagedId, host as packagedHost, verifyUrl as packagedVerify } from '../src/badge-id.js';
import { badgeId as siteId, host as siteHost, verifyUrl as siteVerify } from '../scripts/badge-id.js';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '../bin/sigship.js');
const run = promisify(execFile);
const KEY = ['POLAR', 'TEST', 'KEY', '0000'].join('-');

let server;
let api;
let requests;
let reply;
before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push({ path: req.url, body: JSON.parse(body || '{}') });
      const [status, payload] = reply();
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  api = `http://127.0.0.1:${server.address().port}/v1/pack`; // The same variable the Pro pack uses; badge derives /v1/badge from it.
});
after(() => server.close());
beforeEach(() => {
  requests = [];
  reply = () => [200, { id: 'SG-D-ABCDEF', site: 'myapp.com', level: 'D' }];
});

const cli = (args, env = {}) =>
  run('node', [CLI, ...args], { cwd: mkdtempSync(join(tmpdir(), 'sigship-badge-')), env: { PATH: process.env.PATH, NO_COLOR: '1', SIGSHIP_API: api, ...env } }).then(
    (r) => ({ code: 0, out: r.stdout, err: r.stderr }),
    (e) => ({ code: e.code, out: e.stdout, err: e.stderr }),
  );

describe('sigship badge', () => {
  it('uses the same ID formula as the site', () => {
    for (const site of ['myapp.com', 'https://www.Example.com/path?x=1', 'sigship.dev', 'a b', '']) {
      assert.equal(packagedHost(site), siteHost(site));
      for (const letter of ['S', 'D']) assert.equal(packagedId(letter, site), siteId(letter, site));
      assert.equal(packagedVerify('SG-S-ABCDEF', site), siteVerify('SG-S-ABCDEF', site));
    }
  });

  it('prints the Self-checked embed code with no key and no network call', async () => {
    const result = await cli(['badge', 'https://www.MyApp.com/']);
    assert.equal(result.code, 0);
    const id = packagedId('S', 'myapp.com');
    assert.match(result.out, new RegExp(`Self-checked badge ${id} for myapp.com`));
    assert.ok(result.out.includes(embedCode(id, 'myapp.com')));
    assert.ok(result.out.includes(`https://sigship.dev/b/${id}.svg`));
    assert.ok(result.out.includes(`https://sigship.dev/verify/?id=${id}&site=myapp.com`));
    assert.equal(requests.length, 0);
    let called = false;
    const b = await badge('myapp.com', { env: { SIGSHIP_KEY: '' }, fetch: () => (called = true) });
    assert.equal(called, false);
    assert.equal(b.level, 'S');
  });

  it('asks for the site when none is given and no package.json names one', async () => {
    const result = await cli(['badge']);
    assert.equal(result.code, 2);
    assert.match(result.err, /npx sigship badge myapp.com/);
  });

  it('takes the site from package.json homepage', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sigship-badge-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', homepage: 'https://myapp.com' }));
    const result = await run('node', [CLI, 'badge'], { cwd: dir, env: { PATH: process.env.PATH } });
    assert.match(result.stdout, /for myapp.com/);
  });

  it('with a key, registers the site for Deep self-check and prints that embed code', async () => {
    const result = await cli(['badge', 'myapp.com'], { SIGSHIP_KEY: KEY });
    assert.equal(result.code, 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/v1/badge');
    assert.deepEqual(requests[0].body, { key: KEY, site: 'myapp.com' });
    assert.match(result.out, /Deep self-check badge SG-D-ABCDEF for myapp.com/);
    assert.ok(result.out.includes('alt="Deep self-check with SIGSHIP, badge SG-D-ABCDEF"'));
    assert.ok(result.out.includes('https://sigship.dev/b/SG-D-ABCDEF.svg'));
  });

  it('falls back to Self-checked when the key is refused, and never prints the key', async () => {
    reply = () => [403, { error: `Key ${KEY} is not active.` }];
    const result = await cli(['badge', 'myapp.com'], { SIGSHIP_KEY: KEY });
    assert.equal(result.code, 0);
    assert.match(result.out, /not active. This is the Self-checked badge/);
    assert.match(result.out, new RegExp(packagedId('S', 'myapp.com')));
    assert.ok(!result.out.includes(KEY));
    const down = await cli(['badge', 'myapp.com'], { SIGSHIP_KEY: KEY, SIGSHIP_API: 'http://127.0.0.1:9/v1/pack' });
    assert.equal(down.code, 0);
    assert.match(down.out, /Could not reach the SIGSHIP server/);
  });

  it('badgeText reads well for both levels', () => {
    assert.match(badgeText({ id: 'SG-S-ABCDEF', level: 'S', site: 'x.com', embed: '<a>', verify: 'v' }), /Self-checked badge SG-S-ABCDEF for x.com/);
    assert.doesNotMatch(badgeText({ id: 'SG-D-ABCDEF', level: 'D', site: 'x.com', embed: '<a>', verify: 'v' }), /With a licence key/);
  });
});
