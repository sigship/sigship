import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scanFiles, verdict, parseAccepts } from '../src/engine.js';
import { RULES } from '../src/rules.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../src');
const FAKE_STRIPE = ['sk', 'live', '51Hx0aB2cD3eF4gH5iJ6kL7mN8'].join('_');

describe('engine', () => {
  it('imports nothing from the file system, child processes or the network', () => {
    for (const name of ['engine.js', 'rules.js', 'pack.js']) {
      const text = readFileSync(join(SRC, name), 'utf8');
      assert.doesNotMatch(text, /from 'node:(fs|child_process|http|https|net)'|\bfetch\s*\(/, name);
    }
  });

  it('scans files that are already in memory', () => {
    const files = [
      { path: 'package.json', text: JSON.stringify({ name: 'x', dependencies: { react: '1.0.0' } }) },
      { path: 'src/pay.ts', text: `export const stripe = '${FAKE_STRIPE}';\n` },
    ];
    const result = scanFiles({ files });
    assert.equal(result.checksRun, RULES.length);
    assert.ok(result.findings.some((f) => f.id === 'secret-in-code' && f.file === 'src/pay.ts' && f.line === 1));
    assert.ok(result.findings.some((f) => f.id === 'no-lockfile'));
    assert.equal(result.counts.sev1, 1);
    assert.equal(verdict(result).label, 'NO-GO');
    assert.ok(!JSON.stringify(result).includes(FAKE_STRIPE));
  });

  it('works out Supabase use from the paths alone', () => {
    const files = [{ path: 'supabase/migrations/1.sql', text: 'create table public.t (id uuid);\n' }];
    const result = scanFiles({ files, paths: ['supabase/migrations/1.sql', 'supabase/config.toml'] });
    assert.ok(result.findings.some((f) => f.id === 'rls-missing'));
    assert.ok(!scanFiles({ files: [{ path: 'db/1.sql', text: files[0].text }] }).findings.some((f) => f.id === 'rls-missing'));
  });

  it('tells a tracked .env from an untracked one', () => {
    const files = [{ path: '.env', text: 'STRIPE_SECRET_KEY=abcdefghijklmnop\n' }];
    assert.ok(scanFiles({ files }).findings.some((f) => f.id === 'env-file-committed'));
    assert.ok(!scanFiles({ files, tracked: [] }).findings.some((f) => f.id === 'env-file-committed'));
  });

  it('ignores a malformed accept file with a warning', () => {
    const { entries, warnings } = parseAccepts('{"rule":"x"}');
    assert.equal(entries.length, 0);
    assert.match(warnings[0], /must be a JSON array/);
  });
});
