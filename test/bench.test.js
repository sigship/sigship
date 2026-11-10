import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { RULES } from '../src/rules.js';
import { FIXTURES, RESULTS, bench, listCases } from '../bench/run.js';

// bench/results.json is the published accuracy figure. A change to a check may
// not make any check less precise or less complete than that record says without
// running `npm run bench` and committing the new numbers on purpose.
const recorded = JSON.parse(readFileSync(RESULTS, 'utf8'));
const byId = Object.fromEntries(recorded.checks.map((c) => [c.id, c]));

describe('benchmark cases', () => {
  it('has a hit and a miss folder with cases for every check', () => {
    for (const { id } of RULES) {
      const cases = listCases(id);
      assert.ok(cases.hit.length > 0, `${id} has no hit cases`);
      assert.ok(cases.miss.length > 0, `${id} has no miss cases`);
    }
  });

  it('has no empty case folder', () => {
    for (const { id } of RULES) {
      for (const kind of ['hit', 'miss']) {
        const dir = join(FIXTURES, id, kind);
        for (const name of readdirSync(dir)) {
          const folder = join(dir, name);
          if (!statSync(folder).isDirectory()) continue;
          const files = readdirSync(folder, { recursive: true }).filter((f) => f !== 'WHY' && statSync(join(folder, f)).isFile());
          assert.ok(files.length > 0, `${id}/${kind}/${name} holds no project files`);
          assert.ok(existsSync(join(folder, 'WHY')), `${id}/${kind}/${name} has no WHY file`);
        }
      }
    }
  });

  it('records every check in results.json', () => {
    for (const { id } of RULES) assert.ok(byId[id], `${id} is missing from bench/results.json; run npm run bench`);
  });
});

describe('release gate', () => {
  const result = bench();

  for (const check of result.checks) {
    it(`${check.id} is at least as precise and complete as bench/results.json records`, () => {
      const was = byId[check.id];
      assert.ok(was, `${check.id} is not in bench/results.json`);
      const list = (kind) => (result.wrong[check.id] ?? []).filter((w) => w.kind === kind).map((w) => `${w.case} (${w.why})`).join('; ');
      assert.ok(
        check.precision >= was.precision,
        `${check.id} precision fell from ${was.precision} to ${check.precision}. False alarms: ${list('false-alarm')}`,
      );
      assert.ok(
        check.recall >= was.recall,
        `${check.id} recall fell from ${was.recall} to ${check.recall}. Missed: ${list('missed')}`,
      );
    });
  }

  it('overall precision and recall did not fall', () => {
    assert.ok(result.overall.precision >= recorded.overall.precision, `overall precision fell to ${result.overall.precision}`);
    assert.ok(result.overall.recall >= recorded.overall.recall, `overall recall fell to ${result.overall.recall}`);
  });
});
