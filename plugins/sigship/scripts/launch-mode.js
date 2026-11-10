#!/usr/bin/env node
// SIGSHIP launch mode: a Claude Code Stop hook.
// Off by default. It does anything only when SIGSHIP_LAUNCH_MODE=1 is set, or the
// project holds a file named .sigship-launch-mode. Then, while `npx sigship`
// says NO-GO, it exits 2 with the fix list on stderr, which keeps the session going.
// It skips silently (exit 0) when the folder has no package.json, when SIGSHIP
// cannot run, or after 5 refusals in one session, so it can never trap a session.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MAX_BLOCKS = 5

let input = {}
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}') } catch { /* no input is fine */ }

const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()

const on = process.env.SIGSHIP_LAUNCH_MODE === '1' || existsSync(join(dir, '.sigship-launch-mode'))
if (!on || !existsSync(join(dir, 'package.json'))) process.exit(0)

// SIGSHIP_CLI (path to a sigship bin file) is for tests and local builds; normally npx runs the published package.
const cli = process.env.SIGSHIP_CLI
const run = (args) => cli
  ? spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8', timeout: 100000 })
  : spawnSync('npx', ['-y', 'sigship', ...args], { cwd: dir, encoding: 'utf8', timeout: 100000, shell: process.platform === 'win32' })

const check = run(['.', '--prompt'])
if (check.error || check.status !== 1) process.exit(0) // GO (0), or SIGSHIP could not run: do not block

const id = String(input.session_id || 'session').replace(/[^\w-]/g, '')
const counter = join(tmpdir(), `sigship-launch-mode-${id}`)
let blocks = 0
try { blocks = Number(readFileSync(counter, 'utf8')) || 0 } catch { /* first block */ }
if (blocks >= MAX_BLOCKS) process.exit(0)
try { writeFileSync(counter, String(blocks + 1)) } catch { /* counter is best effort */ }

process.stderr.write(
  `SIGSHIP says NO-GO. Do not stop yet. Fix these, worst first, then run \`npx sigship\` again until it exits 0.\n` +
  `If a fix needs the owner (a leaked key to rotate, a dashboard setting), say so plainly instead of claiming it is done.\n\n` +
  `${check.stdout.trim()}\n`
)
process.exit(2)
