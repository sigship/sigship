#!/usr/bin/env node
// Runs every planted case through the scanner and measures each check.
//
// Layout: bench/fixtures/<check-id>/hit/<nn>/ must trigger the check,
//         bench/fixtures/<check-id>/miss/<nn>/ must not. Each folder is a tiny
//         project plus a WHY file (no extension, so the scanner ignores it).
//
// Each case is copied to a temporary folder before it is scanned, so the result
// is what `npx sigship` would say about that project on its own, outside this
// repository's git history.
//
// Usage: node bench/run.js [--json] [--quiet] [check-id ...]
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '../src/scan.js';
import { RULES } from '../src/rules.js';

const here = dirname(fileURLToPath(import.meta.url));
export const FIXTURES = join(here, 'fixtures');
export const RESULTS = join(here, 'results.json');

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

export function listCases(id) {
  const out = { hit: [], miss: [] };
  for (const kind of ['hit', 'miss']) {
    const dir = join(FIXTURES, id, kind);
    if (!isDir(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      const folder = join(dir, name);
      if (!isDir(folder)) continue;
      let why = '';
      try {
        why = readFileSync(join(folder, 'WHY'), 'utf8').trim();
      } catch {
        // A case without a WHY file still counts.
      }
      out[kind].push({ name, folder, why });
    }
  }
  return out;
}

function scanCase(folder) {
  const tmp = mkdtempSync(join(tmpdir(), 'sigship-bench-'));
  try {
    cpSync(folder, tmp, { recursive: true });
    return scan(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const ratio = (a, b) => (b === 0 ? 1 : Math.round((a / b) * 1000) / 1000);

export function benchCheck(id) {
  const cases = listCases(id);
  const wrong = [];
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const kind of ['hit', 'miss']) {
    for (const kase of cases[kind]) {
      const fired = scanCase(kase.folder).findings.some((f) => f.id === id);
      if (kind === 'hit') {
        if (fired) tp += 1;
        else {
          fn += 1;
          wrong.push({ kind: 'missed', case: kase.name, why: kase.why });
        }
      } else if (fired) {
        fp += 1;
        wrong.push({ kind: 'false-alarm', case: kase.name, why: kase.why });
      } else tn += 1;
    }
  }
  return {
    id,
    hits: cases.hit.length,
    misses: cases.miss.length,
    tp,
    fp,
    fn,
    tn,
    precision: ratio(tp, tp + fp),
    recall: ratio(tp, tp + fn),
    wrong,
  };
}

export function bench(ids = RULES.map((r) => r.id)) {
  const checks = ids.map(benchCheck);
  const sum = (k) => checks.reduce((n, c) => n + c[k], 0);
  const tp = sum('tp');
  const fp = sum('fp');
  const fn = sum('fn');
  const { version } = JSON.parse(readFileSync(join(here, '../package.json'), 'utf8'));
  return {
    date: new Date().toISOString().slice(0, 10),
    version,
    checks: checks.map(({ wrong, ...c }) => c),
    overall: {
      cases: sum('hits') + sum('misses'),
      tp,
      fp,
      fn,
      tn: sum('tn'),
      precision: ratio(tp, tp + fp),
      recall: ratio(tp, tp + fn),
    },
    wrong: Object.fromEntries(checks.filter((c) => c.wrong.length).map((c) => [c.id, c.wrong])),
  };
}

export function table(result) {
  const pct = (n) => `${(n * 100).toFixed(1)}%`.padStart(7);
  const lines = [`${'check'.padEnd(26)} ${'hits'.padStart(4)} ${'miss'.padStart(4)} ${'tp'.padStart(3)} ${'fp'.padStart(3)} ${'fn'.padStart(3)}  precision  recall`];
  for (const c of result.checks) {
    lines.push(`${c.id.padEnd(26)} ${String(c.hits).padStart(4)} ${String(c.misses).padStart(4)} ${String(c.tp).padStart(3)} ${String(c.fp).padStart(3)} ${String(c.fn).padStart(3)}  ${pct(c.precision)}  ${pct(c.recall)}`);
  }
  const o = result.overall;
  lines.push(`${'overall'.padEnd(26)} ${String(o.cases).padStart(9)} ${String(o.tp).padStart(3)} ${String(o.fp).padStart(3)} ${String(o.fn).padStart(3)}  ${pct(o.precision)}  ${pct(o.recall)}`);
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const ids = args.filter((a) => !a.startsWith('--'));
  const result = bench(ids.length ? ids : undefined);
  if (flags.has('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(table(result));
    if (!flags.has('--quiet')) {
      for (const [id, list] of Object.entries(result.wrong)) {
        console.log(`\n${id}`);
        for (const w of list) console.log(`  ${w.kind.padEnd(11)} ${w.case}  ${w.why}`);
      }
    }
  }
  if (!ids.length) {
    const { wrong, ...saved } = result;
    writeFileSync(RESULTS, JSON.stringify(saved, null, 2) + '\n');
    console.log(`\nWrote ${RESULTS}`);
  }
}
