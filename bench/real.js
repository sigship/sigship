#!/usr/bin/env node
// Scans public AI-built repositories listed in bench/repos.txt.
//
// Each repository is cloned shallowly into a temporary folder, scanned, and
// deleted. Only counts are kept: bench/real-results.json never holds code,
// file paths or secret values.
//
// Usage: node bench/real.js [--set dev|held-out] [--limit N] [--score]
//   --score  reads bench/labels.json and prints hand-labelled precision per check
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '../src/scan.js';
import { RULES } from '../src/rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const REPOS = join(here, 'repos.txt');
const RESULTS = join(here, 'real-results.json');
const LABELS = join(here, 'labels.json');

export function readRepos() {
  return readFileSync(REPOS, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [url, tool, set] = l.split(/\s+/);
      return { url, tool, set: set ?? 'dev' };
    });
}

function clone(url, dir) {
  execFileSync('git', ['clone', '--depth', '1', '--quiet', '--no-tags', url, dir], {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    timeout: 120_000,
  });
  return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function scanRepo(repo) {
  const dir = mkdtempSync(join(tmpdir(), 'sigship-real-'));
  try {
    const commit = clone(repo.url, dir);
    const result = scan(dir);
    const checks = {};
    for (const f of result.findings) checks[f.id] = (checks[f.id] ?? 0) + 1;
    return { ...repo, commit, filesRead: result.filesRead, ms: result.ms, counts: result.counts, checks };
  } catch (err) {
    return { ...repo, error: String(err.message ?? err).split('\n')[0] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function summarise(repos) {
  const scanned = repos.filter((r) => !r.error);
  const perCheck = {};
  for (const { id } of RULES) {
    const withFinding = scanned.filter((r) => r.checks[id]).length;
    const findings = scanned.reduce((n, r) => n + (r.checks[id] ?? 0), 0);
    perCheck[id] = { repos: withFinding, findings };
  }
  const noGo = scanned.filter((r) => r.counts.sev1 + r.counts.sev2 > 0).length;
  return { repos: repos.length, scanned: scanned.length, failed: repos.length - scanned.length, noGo, perCheck };
}

function labelsTemplate(repos) {
  const existing = existsSync(LABELS) ? JSON.parse(readFileSync(LABELS, 'utf8')) : { repos: {} };
  const out = {
    about: [
      'Hand labels for bench/real-results.json. For every finding the scanner made, set label to true (a real problem),',
      'false (a false alarm) or leave null (not yet looked at), and add a short note. List checks the scanner should have',
      'fired but did not under missed, as check ids. Precision per check = true / (true + false). Run node bench/real.js --score.',
    ].join(' '),
    repos: {},
  };
  for (const r of repos) {
    if (r.error) continue;
    const prev = existing.repos?.[r.url] ?? {};
    const findings = {};
    for (const [id, count] of Object.entries(r.checks)) {
      findings[id] = { count, label: prev.findings?.[id]?.label ?? null, note: prev.findings?.[id]?.note ?? '' };
    }
    out.repos[r.url] = { tool: r.tool, set: r.set, commit: r.commit, findings, missed: prev.missed ?? [] };
  }
  return out;
}

function score() {
  const labels = JSON.parse(readFileSync(LABELS, 'utf8'));
  const per = {};
  for (const { id } of RULES) per[id] = { yes: 0, no: 0, unlabelled: 0, missed: 0 };
  for (const repo of Object.values(labels.repos)) {
    for (const [id, f] of Object.entries(repo.findings ?? {})) {
      if (f.label === true) per[id].yes += 1;
      else if (f.label === false) per[id].no += 1;
      else per[id].unlabelled += 1;
    }
    for (const id of repo.missed ?? []) if (per[id]) per[id].missed += 1;
  }
  console.log(`${'check'.padEnd(26)} real  false  unlabelled  missed  precision`);
  for (const [id, p] of Object.entries(per)) {
    const labelled = p.yes + p.no;
    const precision = labelled ? `${((p.yes / labelled) * 100).toFixed(0)}%` : 'n/a';
    console.log(`${id.padEnd(26)} ${String(p.yes).padStart(4)}  ${String(p.no).padStart(5)}  ${String(p.unlabelled).padStart(10)}  ${String(p.missed).padStart(6)}  ${precision.padStart(9)}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args.includes('--score')) {
    score();
  } else {
    const set = args.includes('--set') ? args[args.indexOf('--set') + 1] : null;
    const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
    const repos = readRepos().filter((r) => !set || r.set === set).slice(0, limit);
    const { version } = JSON.parse(readFileSync(join(here, '../package.json'), 'utf8'));
    const results = [];
    for (const repo of repos) {
      process.stdout.write(`${repo.url} ... `);
      const r = scanRepo(repo);
      results.push(r);
      console.log(r.error ? `failed: ${r.error}` : `${r.filesRead} files, sev1 ${r.counts.sev1}, sev2 ${r.counts.sev2}, sev3 ${r.counts.sev3}`);
    }
    const summary = summarise(results);
    const out = { date: new Date().toISOString().slice(0, 10), version, summary, repos: results };
    writeFileSync(RESULTS, JSON.stringify(out, null, 2) + '\n');
    writeFileSync(LABELS, JSON.stringify(labelsTemplate(results), null, 2) + '\n');
    console.log(`\n${'check'.padEnd(26)} repos  findings`);
    for (const [id, p] of Object.entries(summary.perCheck)) console.log(`${id.padEnd(26)} ${String(p.repos).padStart(5)}  ${String(p.findings).padStart(8)}`);
    console.log(`\n${summary.scanned} of ${summary.repos} repos scanned, ${summary.failed} failed, ${summary.noGo} NO-GO.`);
    console.log(`Wrote ${RESULTS} and ${LABELS}`);
  }
}
