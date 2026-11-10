import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scan, verdict } from '../src/scan.js';
import { scanFiles } from '../src/engine.js';
import { toHtml, toJson, toMarkdown, toPrompt, toSarif, toTerminal } from '../src/report.js';
import { TOOLS, template } from '../src/prompts.js';

// A signed-in machine would report every CLI run these tests make. Keep the tests off the network.
process.env.SIGSHIP_NO_REPORT = '1';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '../bin/sigship.js');
const cli = (args, cwd) => spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sigship-fmt-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

// One SEV-2 finding (a role in localStorage) and one SEV-3 (wildcard CORS).
const APP = {
  'package.json': JSON.stringify({ name: 'x', scripts: { test: 'vitest' } }),
  'package-lock.json': '{}',
  'src/Admin.tsx': "const isAdmin = localStorage.getItem('isAdmin');\n",
  'src/api/x.ts': 'const h = { "Access-Control-Allow-Origin": "*" };\n',
};
const next = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const accept = (entries) => JSON.stringify(entries);

describe('accepted risks', () => {
  let root;
  before(() => (root = project(APP)));
  after(() => rmSync(root, { recursive: true, force: true }));

  it('a matching entry turns NO-GO into GO with an accepted risk', () => {
    writeFileSync(join(root, 'sigship-accept.json'), accept([{ rule: 'role-in-local-storage', file: 'src/Admin.tsx', reason: 'Admin pages are behind a VPN.', expires: next }]));
    const r = scan(root);
    assert.equal(r.findings.length, 1);
    assert.equal(r.accepted.length, 1);
    assert.equal(r.accepted[0].reason, 'Admin pages are behind a VPN.');
    const v = verdict(r);
    assert.equal(v.label, 'GO');
    assert.equal(v.text, 'GO with 1 accepted risk');
    assert.equal(v.exitCode, 0);
    assert.deepEqual(r.warnings, []);
  });

  it('every format shows the verdict and lists the accepted risk', () => {
    const r = scan(root);
    const t = toTerminal(r);
    assert.match(t, /GO with 1 accepted risk/);
    assert.match(t, /Accepted until \d{4}-\d{2}-\d{2}: Admin pages are behind a VPN\./);
    const md = toMarkdown(r);
    assert.match(md, /^## SIGSHIP: GO with 1 accepted risk/);
    assert.match(md, /### Accepted risks/);
    assert.match(md, /Admin pages are behind a VPN/);
    const j = toJson(r);
    assert.equal(j.verdict, 'GO');
    assert.equal(j.verdictText, 'GO with 1 accepted risk');
    assert.equal(j.accepted.length, 1);
    const page = toHtml(r);
    assert.match(page, /GO with 1 accepted risk/);
    assert.match(page, /<h2>Accepted risks<\/h2>/);
    assert.equal(cli([root]).status, 0);
    assert.match(cli([root]).stdout, /GO with 1 accepted risk/);
  });

  it('an entry without a file covers every finding of that rule, and plural reads right', () => {
    const files = Object.entries({ ...APP, 'src/Other.tsx': "localStorage.setItem('role', 'x');\n" }).map(([path, text]) => ({ path, text }));
    const r = scanFiles({ files, accept: accept([{ rule: 'role-in-local-storage', reason: 'VPN.', expires: next }]) });
    assert.equal(r.accepted.length, 2);
    assert.equal(verdict(r).text, 'GO with 2 accepted risks');
  });

  it('an expired entry is ignored with a warning and the finding counts again', () => {
    writeFileSync(join(root, 'sigship-accept.json'), accept([{ rule: 'role-in-local-storage', reason: 'VPN.', expires: '2020-01-01' }]));
    const r = scan(root);
    assert.equal(r.accepted.length, 0);
    assert.equal(verdict(r).label, 'NO-GO');
    assert.match(r.warnings[0], /expired on 2020-01-01/);
    const out = cli([root], root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /expired on 2020-01-01/);
  });

  it('malformed entries are ignored with a warning, never an error', () => {
    const entries = [{ rule: 'role-in-local-storage' }, { rule: 'cors-wildcard', reason: 'x', expires: 'soon' }, 'nope', { reason: 'no rule', expires: next }];
    writeFileSync(join(root, 'sigship-accept.json'), accept(entries));
    const r = scan(root);
    assert.equal(r.accepted.length, 0);
    assert.equal(r.warnings.length, 4);
    writeFileSync(join(root, 'sigship-accept.json'), '{not json');
    assert.match(scan(root).warnings[0], /not valid JSON/);
    assert.equal(cli([root]).status, 1);
  });

  it('the JSON output keeps warnings out of stdout and the CLI has no flag to accept a risk', () => {
    writeFileSync(join(root, 'sigship-accept.json'), '{not json');
    const out = cli([root, '--json']);
    assert.doesNotThrow(() => JSON.parse(out.stdout));
    assert.equal(cli([root, '--accept']).status, 2);
    assert.equal(cli([root, '--accept', 'cors-wildcard']).status, 2);
    assert.doesNotMatch(cli(['--help']).stdout, /--accept/);
  });
});

describe('SARIF', () => {
  it('is SARIF 2.1.0 with one rule per check and a fingerprint per result', () => {
    const files = Object.entries(APP).map(([path, text]) => ({ path, text }));
    const r = scanFiles({ files, accept: accept([{ rule: 'cors-wildcard', reason: 'Public API.', expires: next }]) });
    const sarif = toSarif(r, { version: '9.9.9' });
    assert.equal(sarif.version, '2.1.0');
    const run = sarif.runs[0];
    assert.equal(run.tool.driver.name, 'SIGSHIP');
    assert.equal(run.tool.driver.version, '9.9.9');
    assert.equal(run.tool.driver.rules.length, r.checksRun);
    assert.equal(run.results.length, 2);
    const hit = run.results.find((x) => x.ruleId === 'role-in-local-storage');
    assert.equal(hit.level, 'error');
    assert.equal(hit.locations[0].physicalLocation.artifactLocation.uri, 'src/Admin.tsx');
    assert.equal(hit.locations[0].physicalLocation.region.startLine, 1);
    assert.match(hit.partialFingerprints['sigship/v1'], /^[0-9a-f]{8}$/);
    assert.equal(run.tool.driver.rules[hit.ruleIndex].id, 'role-in-local-storage');
    const suppressed = run.results.find((x) => x.ruleId === 'cors-wildcard');
    assert.equal(suppressed.suppressions[0].kind, 'external');
    assert.equal(run.properties.verdict, 'NO-GO with 1 accepted risk');
    // The same finding gets the same fingerprint on the next run.
    assert.equal(toSarif(r).runs[0].results[0].partialFingerprints['sigship/v1'], hit.partialFingerprints['sigship/v1']);
  });

  it('--sarif prints it', () => {
    const root = project(APP);
    const out = cli([root, '--sarif']);
    assert.equal(out.status, 1);
    assert.equal(JSON.parse(out.stdout).runs[0].results.length, 2);
    rmSync(root, { recursive: true, force: true });
  });
});

describe('prompt templates', () => {
  const files = Object.entries(APP).map(([path, text]) => ({ path, text }));
  const r = scanFiles({ files });

  it('the default prompt is unchanged', () => {
    const p = toPrompt(r);
    assert.ok(p.startsWith('Fix these production problems in order. Change only what each fix needs.\nAfter the fixes, run `npx sigship` again and keep going until it exits 0.\nIf a fix needs a key rotated or a dashboard changed, stop and tell me what to do.\n\n1. [SEV-2]'));
  });

  it('every tool has a template that keeps the fix list', () => {
    for (const tool of TOOLS) {
      const p = toPrompt(r, { tool });
      assert.match(p, /1\. \[SEV-2\] Admin access is decided in the browser\n   Where: src\/Admin\.tsx:1/, tool);
      assert.ok(template(tool).intro.length >= 3, tool);
    }
    assert.match(toPrompt(r, { tool: 'replit' }), /Replit Secrets/);
    assert.match(toPrompt(r, { tool: 'claude' }), /sigship_check/);
    assert.throws(() => template('vim'), /Unknown tool/);
  });

  it('--tool picks the template and rejects an unknown one', () => {
    const root = project(APP);
    assert.match(cli([root, '--prompt', '--tool', 'lovable']).stdout, /Supabase Edge Function secret/);
    assert.match(cli([root, '--prompt', '--tool=cursor']).stdout, /keep the existing code style/);
    const bad = cli([root, '--prompt', '--tool', 'vim']);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /Unknown tool vim/);
    assert.equal(cli([root, '--tool']).status, 2);
    rmSync(root, { recursive: true, force: true });
  });
});

describe('white-label report', () => {
  const files = Object.entries(APP).map(([path, text]) => ({ path, text }));
  const r = { ...scanFiles({ files }), filesRead: 4, ms: 1 };
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  it('puts the brand and logo on the page and drops the SIGSHIP footer line', () => {
    const page = toHtml(r, { name: 'Client app', brand: 'Acme <Studio>', logo: png });
    assert.match(page, /<title>Client app: Acme &lt;Studio&gt; report/);
    assert.match(page, /<img src="data:image\/png;base64,[A-Za-z0-9+/=]+" alt="Acme &lt;Studio&gt;"/);
    assert.match(page, /Prepared by Acme &lt;Studio&gt;\./);
    assert.doesNotMatch(page, /Made with SIGSHIP/);
    assert.match(page, /It does not prove the app is safe/);
  });

  it('without a brand the page is as before, and a logo that is not a data URI is dropped', () => {
    const page = toHtml(r, { name: 'Client app', logo: 'https://example.com/x.png' });
    assert.match(page, /Made with SIGSHIP by zoof04/);
    assert.doesNotMatch(page, /<img/);
  });

  it('--logo reads the file and refuses other types', () => {
    const root = project({ ...APP, 'logo.png': Buffer.from(png.split(',')[1], 'base64').toString('binary'), 'logo.txt': 'x' });
    const bad = cli([root, '--report', '--logo', join(root, 'logo.txt')], root);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /--logo must be a PNG/);
    rmSync(root, { recursive: true, force: true });
  });
});
