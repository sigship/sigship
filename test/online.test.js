import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { packagesFrom, vulnerablePackages } from '../src/online.js';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '../bin/sigship.js');
const run = promisify(execFile);

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sigship-osv-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

// A local stand-in for api.osv.dev that records every request body.
let server;
let url;
let requests;
let reply;
before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push({ path: req.url, body: JSON.parse(body || '{}') });
      const [status, payload] = reply(JSON.parse(body || '{}'));
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}/v1/querybatch`;
});
after(() => server.close());

const PKG = JSON.stringify({ name: 'demo', dependencies: { lodash: '^4.17.15', react: '^19.0.0' }, scripts: { test: 'vitest' } }, null, 2);
const LOCK = JSON.stringify({ packages: { '': { name: 'demo' }, 'node_modules/lodash': { version: '4.17.15' }, 'node_modules/react': { version: '19.1.0' }, 'node_modules/react/node_modules/deep': { version: '1.0.0' } } });
let root;
beforeEach(() => {
  requests = [];
  reply = (body) => [200, { results: body.queries.map((q) => (q.package.name === 'lodash' ? { vulns: [{ id: 'GHSA-p6mc-m468-83gw', summary: 'Prototype pollution' }] } : {})) }];
  root = project({ 'package.json': PKG, 'package-lock.json': LOCK });
});

const cli = (args, env = {}) =>
  run('node', [CLI, ...args], { cwd: root, env: { PATH: process.env.PATH, NO_COLOR: '1', SIGSHIP_OSV: url, ...env } }).then(
    (r) => ({ code: 0, out: r.stdout, err: r.stderr }),
    (e) => ({ code: e.code, out: e.stdout, err: e.stderr }),
  );

describe('--online', () => {
  it('makes no network call without the flag', async () => {
    const result = await cli(['.']);
    assert.equal(requests.length, 0);
    assert.equal(result.code, 0);
    assert.doesNotMatch(result.out, /vulnerab/i);
  });

  it('sends only package names and versions, and reports a vulnerable package as SEV-2', async () => {
    const result = await cli(['.', '--online']);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/v1/querybatch');
    const { queries } = requests[0].body;
    assert.deepEqual(Object.keys(requests[0].body), ['queries']);
    for (const q of queries) assert.deepEqual(Object.keys(q).sort(), ['package', 'version']);
    assert.deepEqual(
      queries.map((q) => `${q.package.name}@${q.version}`).sort(),
      ['deep@1.0.0', 'lodash@4.17.15', 'react@19.1.0'],
    );
    assert.ok(queries.every((q) => q.package.ecosystem === 'npm'));
    assert.equal(result.code, 1);
    assert.match(result.out, /SEV-2  A package you use has a known vulnerability/);
    assert.match(result.out, /package\.json:4  lodash 4\.17\.15: GHSA-p6mc-m468-83gw/);
    assert.match(result.out, /ran 18 checks/);
  });

  it('uses the package.json range when there is no lockfile', () => {
    const files = [{ path: 'package.json', text: PKG }];
    assert.deepEqual(packagesFrom(files), [
      { name: 'lodash', version: '4.17.15' },
      { name: 'react', version: '19.0.0' },
    ]);
  });

  it('never fails the scan when OSV is down, and says so', async () => {
    const result = await cli(['.', '--online'], { SIGSHIP_OSV: 'http://127.0.0.1:9/v1/querybatch' });
    assert.equal(result.code, 0);
    assert.match(result.out, /Could not reach OSV/);
    reply = () => [500, {}];
    const r = await vulnerablePackages([{ path: 'package.json', text: PKG }], { url });
    assert.equal(r.findings.length, 0);
    assert.match(r.warnings[0], /Could not reach OSV/);
  });

  it('an accepted risk covers the online finding too, and JSON and SARIF carry it', async () => {
    writeFileSync(join(root, 'sigship-accept.json'), JSON.stringify([{ rule: 'vulnerable-package', reason: 'Not reachable from user input.', expires: '2099-01-01' }]));
    const result = await cli(['.', '--online', '--json']);
    assert.equal(result.code, 0);
    const json = JSON.parse(result.out);
    assert.equal(json.verdictText, 'GO with 1 accepted risk');
    assert.equal(json.accepted[0].id, 'vulnerable-package');
    const sarif = JSON.parse((await cli(['.', '--online', '--sarif'])).out);
    assert.ok(sarif.runs[0].tool.driver.rules.some((r) => r.id === 'vulnerable-package'));
  });

  it('is named in --help with what is sent', async () => {
    const { out } = await cli(['--help']);
    assert.match(out, /--online/);
    assert.match(out, /api\.osv\.dev\/v1\/querybatch/);
    assert.match(out, /name and\s+version of every package/);
  });

  after(() => rmSync(root, { recursive: true, force: true }));
});
