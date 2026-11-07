// Pins a real capture of SIGSHIP on the demo app (bad = run 1, fixed = run 2) for the home page:
// the text, --json and --prompt output, the CLI's own scan time, the capture date and the check counts.
// Run with: npm run capture   (needed only when the checks, the demo or the version change; the home build says so)
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeDemo } from './demo.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(root, 'bin/sigship.js');
const env = { ...process.env, NO_COLOR: '1' };
delete env.SIGSHIP_KEY;

function run(dir, flag) {
  const t0 = process.hrtime.bigint();
  let out = '';
  let code = 0;
  try {
    out = execFileSync('node', [CLI, dir, ...(flag ? [flag] : [])], { env, encoding: 'utf8' });
  } catch (e) {
    out = e.stdout;
    code = e.status;
  }
  return { out, code, wallMs: Number(process.hrtime.bigint() - t0) / 1e6 };
}

const runs = {};
for (const [key, name] of [['run1', 'bad'], ['run2', 'fixed']]) {
  const dir = writeDemo(name);
  try {
    const json = run(dir, '--json');
    const text = run(dir, '');
    const prompt = run(dir, '--prompt');
    const data = JSON.parse(json.out);
    runs[key] = {
      dir: name,
      exitCode: text.code,
      verdict: data.verdict,
      filesRead: data.filesRead,
      checksRun: data.checksRun,
      scanMs: data.ms,
      textScanMs: Number((text.out.match(/in (\d+) ms/) || [])[1]),
      wallMs: Math.round(text.wallMs),
      counts: data.counts,
      findings: data.findings.map(({ id, severity, title, file, line, detail, forecast, fix }) => ({ id, severity, title, file, line, detail, forecast, fix })),
      text: text.out,
      prompt: prompt.out,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const { RULES } = await import('../src/rules.js');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const capture = {
  tool: `sigship ${pkg.version}`,
  version: pkg.version,
  node: pkg.engines.node,
  capturedAt: new Date().toISOString().slice(0, 10),
  rules: {
    total: RULES.length,
    block: RULES.filter((r) => r.severity <= 2).length,
    sev1: RULES.filter((r) => r.severity === 1).length,
    sev2: RULES.filter((r) => r.severity === 2).length,
    sev3: RULES.filter((r) => r.severity === 3).length,
  },
  ...runs,
};
writeFileSync(join(root, 'scripts/home/demo-run.json'), JSON.stringify(capture, null, 2) + '\n');
console.log(`Captured run 1 ${runs.run1.verdict} and run 2 ${runs.run2.verdict} with sigship ${pkg.version}.`);
