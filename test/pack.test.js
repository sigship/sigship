import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compilePack, compareVersions, lockedVersion, parsePolicies } from '../src/pack.js';
import { scanFiles } from '../src/engine.js';

const base = { severity: 2, title: 'T', forecast: 'F', fix: 'X', detail: 'D' };
const rule = (extra) => compilePack({ rules: [{ id: 'test-rule', ...base, ...extra }] });
const run = (extra, files, more = {}) => scanFiles({ files, extraRules: rule(extra), ...more }).findings.filter((f) => f.id === 'test-rule');

describe('pack v2: projectLacks', () => {
  const files = [
    { path: 'package.json', text: '{"name":"x"}' },
    { path: 'src/api/a.ts', text: 'export const a = 1;\n' },
    { path: 'src/b.ts', text: 'helmet();\n' },
  ];
  it('fires once at package.json:1 when the pattern matches nowhere', () => {
    const hits = run({ projectLacks: 'helmet\\(', server: true }, files);
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), ['package.json:1']);
  });
  it('is quiet when any selected file matches', () => {
    assert.equal(run({ projectLacks: 'helmet\\(' }, files).length, 0);
  });
  it('points at the first selected file when there is no package.json', () => {
    const hits = run({ projectLacks: 'helmet\\(', paths: '\\.py$' }, [{ path: 'app/main.py', text: 'x = 1\n' }]);
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), ['app/main.py:1']);
  });
  it('is quiet when no file is selected', () => {
    assert.equal(run({ projectLacks: 'helmet\\(', paths: '\\.rb$' }, files).length, 0);
  });
  it('is skipped when depsLack names an installed package', () => {
    const withDep = [{ path: 'package.json', text: '{"dependencies":{"helmet":"7.0.0"}}' }, files[1]];
    assert.equal(run({ projectLacks: 'helmet\\(', depsLack: '^helmet$' }, withDep).length, 0);
  });
});

describe('pack v2: policy', () => {
  const sql = `create table public.t (id uuid);
create policy "open write" on public.t for update using (true) with check (true);
create policy "open read" on public.t for select using (true);
create policy "own" on public.t for delete using (auth.uid() = user_id);
create policy "all" on public.t using (is_admin());
`;
  const files = [{ path: 'supabase/migrations/1.sql', text: sql }];

  it('parses command and expressions', () => {
    const p = parsePolicies(files[0]);
    assert.deepEqual(p.map((x) => [x.command, x.using, x.check]), [
      ['update', 'true', 'true'],
      ['select', 'true', ''],
      ['delete', 'auth.uid() = user_id', ''],
      ['all', 'is_admin()', ''],
    ]);
    assert.equal(p[0].line, 2);
  });
  it('matches by command and expression', () => {
    assert.deepEqual(run({ policyFor: 'update', policyWhere: '^true$' }, files).map((h) => h.line), [2]);
    assert.deepEqual(run({ policyFor: 'select', policyWhere: '^true$' }, files).map((h) => h.line), [3]);
  });
  it('a policy for all counts for every command', () => {
    assert.deepEqual(run({ policyFor: 'delete', policyWhere: 'is_admin|auth\\.uid' }, files).map((h) => h.line), [4, 5]);
  });
  it('policyFor alone matches every policy of that command, including those for all', () => {
    assert.deepEqual(run({ policyFor: 'select' }, files).map((h) => h.line), [3, 5]);
  });
  it('skips test fixtures', () => {
    assert.equal(run({ policyFor: 'update', policyWhere: 'true' }, [{ path: 'test/fixture.sql', text: sql }]).length, 0);
  });
});

describe('pack v2: dep', () => {
  const pkg = { path: 'package.json', text: '{\n  "dependencies": {\n    "next": "^13.4.0",\n    "react": "^18.0.0"\n  }\n}' };
  it('fires for a matching dependency below the version, at its line in package.json', () => {
    const hits = run({ depMatch: '^next$', depBelow: '14.2.25' }, [pkg]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 3);
    assert.match(hits[0].detail, /next 13\.4\.0/);
  });
  it('prefers the lockfile version over the package.json range', () => {
    const lock = { path: 'package-lock.json', text: JSON.stringify({ packages: { 'node_modules/next': { version: '14.2.30' } } }) };
    assert.equal(run({ depMatch: '^next$', depBelow: '14.2.25' }, [pkg, lock]).length, 0);
    const yarn = { path: 'yarn.lock', text: '"next@^13.4.0":\n  version "13.5.1"\n  resolved "x"\n' };
    assert.equal(lockedVersion([yarn], 'next'), '13.5.1');
    const pnpm = { path: 'pnpm-lock.yaml', text: "packages:\n  /next@13.4.9:\n    resolution: {}\n" };
    assert.equal(lockedVersion([pnpm], 'next'), '13.4.9');
  });
  it('without depBelow, any matching dependency is a finding', () => {
    assert.equal(run({ depMatch: '^(next|react)$' }, [pkg]).length, 2);
  });
  it('compares versions numerically', () => {
    assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
    assert.ok(compareVersions('^2.0.0-beta.1', '2.0.0') === 0);
    assert.ok(compareVersions('0.9', '1') < 0);
    assert.equal(compareVersions('latest', '1.0.0'), null);
  });
});

describe('pack v2: validation', () => {
  const bad = (extra) => () => rule(extra);
  it('needs exactly one kind', () => {
    assert.throws(bad({}), /exactly one of/);
    assert.throws(bad({ match: 'a', projectLacks: 'b' }), /exactly one of/);
  });
  it('rejects a bad policyFor', () => assert.throws(bad({ policyFor: 'drop' }), /bad policyFor/));
  it('rejects depBelow without depMatch', () => assert.throws(bad({ match: 'a', depBelow: '1.0.0' }), /depBelow without depMatch/));
  it('rejects a depBelow that is not a version', () => assert.throws(bad({ depMatch: 'a', depBelow: 'soon' }), /bad depBelow/));
  it('rejects a bad projectLacks pattern', () => assert.throws(bad({ projectLacks: '(' }), /Invalid regular expression/));
  it('still accepts a v1 pack', () => assert.equal(rule({ match: 'TODO', paths: '\\.ts$', fileHas: 'x', fileLacks: 'y', depsLack: 'z', server: true, includeTests: true }).length, 1));
});
