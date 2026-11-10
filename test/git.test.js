import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { init } from '../src/init.js';
import { checkStaged, history } from '../src/history.js';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '../bin/sigship.js');
const cli = (args, cwd) => spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
const FAKE_STRIPE = ['sk', 'live', '51Hx0aB2cD3eF4gH5iJ6kL7mN8'].join('_');
const FAKE_AWS = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');

function repo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'sigship-git-'));
  write(root, files);
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Test');
  git(root, 'config', 'commit.gpgsign', 'false');
  return root;
}
function write(root, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}
const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const commit = (root, message) => {
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', message);
};

describe('init --hook and CLAUDE.md', () => {
  it('writes an executable pre-commit hook into .git/hooks and keeps an existing one', () => {
    const root = repo({ 'package.json': '{}' });
    const lines = init(root, { hook: true });
    const file = join(root, '.git/hooks/pre-commit');
    assert.ok(lines.some((l) => /Added \.git\/hooks\/pre-commit/.test(l)));
    assert.match(readFileSync(file, 'utf8'), /sigship hook/);
    assert.ok(statSync(file).mode & 0o100);
    assert.ok(init(root, { hook: true }).some((l) => /Kept \.git\/hooks\/pre-commit \(SIGSHIP already there\)/.test(l)));
    rmSync(root, { recursive: true, force: true });
  });

  it('appends to .husky/pre-commit when the project uses Husky', () => {
    const root = repo({ '.husky/pre-commit': 'npm test\n' });
    init(root, { hook: true });
    const text = readFileSync(join(root, '.husky/pre-commit'), 'utf8');
    assert.equal(text, 'npm test\nnpx --yes sigship hook\n');
    assert.equal(existsSync(join(root, '.git/hooks/pre-commit')), false);
    init(root, { hook: true });
    assert.equal(readFileSync(join(root, '.husky/pre-commit'), 'utf8'), text);
    rmSync(root, { recursive: true, force: true });
  });

  it('says so when there is no git repository', () => {
    const root = mkdtempSync(join(tmpdir(), 'sigship-nogit-'));
    assert.ok(init(root, { hook: true }).some((l) => /No \.git folder/.test(l)));
    rmSync(root, { recursive: true, force: true });
  });

  it('adds the rule to CLAUDE.md only when that file exists, once', () => {
    const root = repo({ 'CLAUDE.md': '# Project\n' });
    init(root);
    init(root);
    const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
    assert.ok(claude.startsWith('# Project'));
    assert.equal(claude.match(/Definition of done/g).length, 1);
    assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8').match(/Definition of done/g).length, 1);
    rmSync(root, { recursive: true, force: true });
    const bare = repo({});
    init(bare);
    assert.equal(existsSync(join(bare, 'CLAUDE.md')), false);
    assert.ok(existsSync(join(bare, 'AGENTS.md')));
    rmSync(bare, { recursive: true, force: true });
  });
});

describe('sigship hook', () => {
  it('blocks a staged secret, passes a clean stage, and never prints the value', () => {
    const root = repo({ 'src/a.ts': 'export const a = 1;\n' });
    git(root, 'add', '-A');
    assert.equal(checkStaged(root).findings.length, 0);
    assert.equal(cli(['hook', root]).status, 0);

    write(root, { 'src/pay.ts': `export const key = '${FAKE_STRIPE}';\n` });
    // Not staged yet: the hook looks at the index, not the working tree.
    assert.equal(cli(['hook', root]).status, 0);
    git(root, 'add', '-A');
    const out = cli(['hook', root]);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /src\/pay\.ts:1/);
    assert.ok(!out.stderr.includes(FAKE_STRIPE));

    // The real hook, through git commit.
    init(root, { hook: true });
    const blocked = spawnSync('git', ['-C', root, 'commit', '-q', '-m', 'x'], { encoding: 'utf8', env: { ...process.env, PATH: process.env.PATH } });
    assert.notEqual(blocked.status, 0);
    assert.equal(spawnSync('git', ['-C', root, 'commit', '-q', '-m', 'x', '--no-verify'], { encoding: 'utf8' }).status, 0);
    rmSync(root, { recursive: true, force: true });
  });

  it('fails cleanly outside a git repository', () => {
    const root = mkdtempSync(join(tmpdir(), 'sigship-nogit-'));
    const out = cli(['hook', root]);
    assert.equal(out.status, 2);
    assert.match(out.stderr, /Not a git repository/);
    rmSync(root, { recursive: true, force: true });
  });
});

describe('sigship history', () => {
  it('finds a secret that a later commit removed, with commit and file, never the value', async () => {
    const root = repo({ 'src/a.ts': 'export const a = 1;\n' });
    commit(root, 'start');
    write(root, { 'src/pay.ts': `export const key = '${FAKE_STRIPE}';\n` });
    commit(root, 'add key');
    write(root, { 'src/pay.ts': "export const key = process.env.STRIPE_KEY;\n" });
    commit(root, 'move key to env');
    write(root, { 'src/aws.ts': `const id = '${FAKE_AWS}';\n` });
    commit(root, 'aws');

    const r = await history(root);
    assert.equal(r.commits, 4);
    assert.equal(r.capped, false);
    assert.equal(r.secrets.length, 2);
    const stripe = r.secrets.find((s) => s.file === 'src/pay.ts');
    assert.match(stripe.detail, /Stripe/);
    assert.equal(stripe.subject, 'add key');
    assert.ok(stripe.removed && stripe.removed.commit !== stripe.commit);
    const aws = r.secrets.find((s) => s.file === 'src/aws.ts');
    assert.equal(aws.removed, null);
    assert.ok(!JSON.stringify(r).includes(FAKE_STRIPE) && !JSON.stringify(r).includes(FAKE_AWS));

    const out = cli(['history', root]);
    assert.equal(out.status, 1);
    assert.match(out.stdout, /REMOVED\s+src\/pay\.ts/);
    assert.match(out.stdout, /PRESENT\s+src\/aws\.ts/);
    assert.ok(!out.stdout.includes(FAKE_STRIPE));
    assert.equal(JSON.parse(cli(['history', root, '--json']).stdout).secrets.length, 2);
    rmSync(root, { recursive: true, force: true });
  });

  it('stops at the commit cap and reports it', async () => {
    const root = repo({ 'a.txt': '0\n' });
    for (let i = 1; i <= 4; i += 1) {
      write(root, { 'a.txt': `${i}\n` });
      commit(root, `c${i}`);
    }
    const r = await history(root, { maxCommits: 2 });
    assert.equal(r.commits, 2);
    assert.equal(r.capped, true);
    assert.equal(r.secrets.length, 0);
    assert.equal(cli(['history', root]).status, 0);
    rmSync(root, { recursive: true, force: true });
  });

  it('fails cleanly outside a git repository', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sigship-nogit-'));
    await assert.rejects(history(root), /Not a git repository/);
    assert.equal(cli(['history', root]).status, 2);
    rmSync(root, { recursive: true, force: true });
  });
});
