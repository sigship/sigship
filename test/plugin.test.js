import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
const json = (p) => JSON.parse(read(p))
const hook = join(root, 'plugins/sigship/scripts/launch-mode.js')
const cli = join(root, 'bin/sigship.js')

test('every plugin and listing JSON file parses', () => {
  for (const p of [
    '.claude-plugin/marketplace.json',
    'plugins/sigship/.claude-plugin/plugin.json',
    'plugins/sigship/.mcp.json',
    'plugins/sigship/hooks/hooks.json',
    'agent-plugins/sigship/plugin.json',
    'agent-plugins/sigship/mcp.json',
    'agent-plugins/sigship/.cursor-plugin/plugin.json',
    'glama.json',
  ]) assert.ok(json(p), p)
})

test('marketplace lists the sigship plugin at a real path, names match', () => {
  const m = json('.claude-plugin/marketplace.json')
  assert.ok(m.name && m.owner?.name)
  assert.equal(m.plugins.length, 1)
  assert.equal(m.plugins[0].name, 'sigship')
  assert.ok(existsSync(join(root, m.plugins[0].source, '.claude-plugin/plugin.json')))
  assert.equal(json('plugins/sigship/.claude-plugin/plugin.json').name, 'sigship')
})

test('MCP configs start the sigship server', () => {
  const claude = json('plugins/sigship/.mcp.json').mcpServers.sigship
  assert.equal(claude.command, 'npx')
  assert.deepEqual(claude.args, ['-y', 'sigship', 'mcp'])
  const std = json('agent-plugins/sigship/mcp.json')
  assert.match(std.$schema, /agent-plugins\.org/)
  assert.deepEqual(std.mcpServers.sigship.args, ['-y', 'sigship', 'mcp'])
  assert.equal(std.mcpServers.sigship.type, 'stdio')
  assert.match(json('agent-plugins/sigship/plugin.json').name, /^[a-z0-9]/)
})

test('the skill names the right command and the NO-GO rule', () => {
  for (const p of ['plugins/sigship/skills/launch/SKILL.md', 'agent-plugins/sigship/skills/launch/SKILL.md']) {
    const s = read(p)
    assert.match(s, /^---\nname: launch\n/)
    assert.match(s, /npx sigship/)
    assert.match(s, /sigship_check/)
    assert.match(s, /worst first/)
    assert.match(s, /Never say the work is done[^.]*NO-GO/)
  }
})

test('the Stop hook runs the launch-mode script and is on the Stop event', () => {
  const h = json('plugins/sigship/hooks/hooks.json').hooks.Stop[0].hooks[0]
  assert.equal(h.type, 'command')
  assert.ok(h.args.join(' ').includes('scripts/launch-mode.js'))
})

function runHook(dir, env = {}) {
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ session_id: 'test-' + Math.random().toString(36).slice(2), cwd: dir }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir, SIGSHIP_CLI: cli, ...env },
  })
}

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'sigship-plugin-'))
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true })
    writeFileSync(join(dir, name), body)
  }
  return dir
}

const planted = { 'package.json': '{"name":"t"}', 'src/a.js': 'const k = "sk_live_' + '51HabcdefghijklmnopqrstuvwxYZ0123";\n' }

test('hook exits 0 and says nothing in a folder with no package.json', () => {
  const r = runHook(project({ 'notes.txt': 'hi' }), { SIGSHIP_LAUNCH_MODE: '1' })
  assert.equal(r.status, 0)
  assert.equal(r.stderr, '')
})

test('hook is off by default, even on NO-GO', () => {
  const r = runHook(project(planted), { SIGSHIP_LAUNCH_MODE: '' })
  assert.equal(r.status, 0)
  assert.equal(r.stderr, '')
})

test('hook exits 2 with the fix list on a planted secret, via env or marker file', () => {
  const a = runHook(project(planted), { SIGSHIP_LAUNCH_MODE: '1' })
  assert.equal(a.status, 2)
  assert.match(a.stderr, /NO-GO/)
  assert.match(a.stderr, /\[SEV-1\]/)
  assert.match(a.stderr, /src\/a\.js:1/)
  assert.ok(!a.stderr.includes('51Habcdefghij'), 'never prints the secret value')
  const b = runHook(project({ ...planted, '.sigship-launch-mode': '' }), { SIGSHIP_LAUNCH_MODE: '' })
  assert.equal(b.status, 2)
})

test('hook exits 0 on a clean project in launch mode', () => {
  const r = runHook(project({ 'package.json': '{"name":"t"}' }), { SIGSHIP_LAUNCH_MODE: '1' })
  assert.equal(r.status, 0)
})

test('hook lets go after five refusals in one session', () => {
  const dir = project(planted)
  const env = { ...process.env, CLAUDE_PROJECT_DIR: dir, SIGSHIP_CLI: cli, SIGSHIP_LAUNCH_MODE: '1' }
  const input = JSON.stringify({ session_id: 'cap-' + Math.random().toString(36).slice(2) })
  const codes = Array.from({ length: 6 }, () => spawnSync(process.execPath, [hook], { input, encoding: 'utf8', env }).status)
  assert.deepEqual(codes, [2, 2, 2, 2, 2, 0])
})

test('publish-npm workflow uses OIDC and provenance, no token secret', () => {
  const w = read('.github/workflows/publish-npm.yml')
  assert.match(w, /id-token: write/)
  assert.match(w, /npm publish --provenance --access public/)
  assert.match(w, /types: \[published\]/)
  assert.ok(!/NODE_AUTH_TOKEN|NPM_TOKEN|secrets\./.test(w))
})
