import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const WORKFLOW = `name: SIGSHIP
on: [pull_request]
jobs:
  sigship:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx --yes sigship@latest
`;

const AGENT_RULE = `
## Definition of done

Before saying work is finished, run \`npx sigship\`.
If it exits 1, fix what it reports and run it again. Only say the work is done after it exits 0.
`;

// Adds the CI gate and the agent rule. Never overwrites a file that already exists.
export function init(target = '.') {
  const root = resolve(target);
  const done = [];

  const workflow = join(root, '.github/workflows/sigship.yml');
  if (existsSync(workflow)) {
    done.push('Kept .github/workflows/sigship.yml (already there).');
  } else {
    mkdirSync(dirname(workflow), { recursive: true });
    writeFileSync(workflow, WORKFLOW);
    done.push('Added .github/workflows/sigship.yml. Pull requests now run the check.');
  }

  const agents = join(root, 'AGENTS.md');
  const current = existsSync(agents) ? readFileSync(agents, 'utf8') : '';
  if (current.includes('npx sigship')) {
    done.push('Kept AGENTS.md (rule already there).');
  } else {
    appendFileSync(agents, AGENT_RULE);
    done.push('Added the definition of done to AGENTS.md.');
  }
  return done;
}
