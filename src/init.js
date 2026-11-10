import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
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

// Solo and Team: the same gate, plus a comment on the pull request with what it found.
const PRO_WORKFLOW = `name: SIGSHIP
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
jobs:
  sigship:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Run SIGSHIP
        id: check
        env:
          SIGSHIP_KEY: \${{ secrets.SIGSHIP_KEY }}
        run: |
          set +e
          npx --yes sigship@latest --markdown > sigship.md
          echo "exit=$?" >> "$GITHUB_OUTPUT"
      - name: Comment on the pull request
        if: always() && github.event.pull_request.head.repo.full_name == github.repository
        env:
          GH_TOKEN: \${{ github.token }}
        run: gh pr comment \${{ github.event.pull_request.number }} --body-file sigship.md --edit-last --create-if-none
      - name: Block on NO-GO
        if: steps.check.outputs.exit != '0'
        run: exit 1
`;

// Solo and Team: a check every night. GitHub emails you when it fails, and Team can add a Slack alert.
const NIGHTLY_WORKFLOW = `name: SIGSHIP nightly
on:
  schedule:
    - cron: '17 3 * * *'
  workflow_dispatch:
jobs:
  sigship:
    runs-on: ubuntu-latest
    env:
      SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Run SIGSHIP
        env:
          SIGSHIP_KEY: \${{ secrets.SIGSHIP_KEY }}
        run: npx --yes sigship@latest
      - name: Tell Slack
        if: failure() && env.SLACK_WEBHOOK_URL != ''
        run: |
          curl -sS -X POST -H 'Content-Type: application/json' \\
            --data "{\\"text\\":\\"SIGSHIP: \${{ github.repository }} is NO-GO. \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}\\"}" \\
            "$SLACK_WEBHOOK_URL"
`;

const AGENT_RULE = `
## Definition of done

Before saying work is finished, run \`npx sigship\`.
If it exits 1, fix what it reports and run it again. Only say the work is done after it exits 0.
`;

const HOOK_LINE = 'npx --yes sigship hook';

// The pre-commit hook. It runs only the secret checks, on staged files only, so it takes well under a second.
const HOOK = `#!/bin/sh
# SIGSHIP: blocks a commit that adds a secret. Checks the staged files only. Delete this file to stop.
if npx --no-install sigship --version >/dev/null 2>&1; then exec npx --no-install sigship hook; fi
exec ${HOOK_LINE}
`;

// Writes the pre-commit hook: into .husky/ when the project uses Husky, else into .git/hooks/.
function addHook(root, done) {
  const husky = join(root, '.husky');
  if (existsSync(husky)) {
    const file = join(husky, 'pre-commit');
    const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (current.includes('sigship')) {
      done.push('Kept .husky/pre-commit (SIGSHIP already there).');
    } else {
      appendFileSync(file, `${current && !current.endsWith('\n') ? '\n' : ''}${HOOK_LINE}\n`);
      chmodSync(file, 0o755);
      done.push(`${current ? 'Added SIGSHIP to' : 'Added'} .husky/pre-commit. A commit that adds a secret is now blocked.`);
    }
    return;
  }
  const git = join(root, '.git');
  if (!existsSync(git)) {
    done.push('No .git folder here, so no pre-commit hook was added. Run git init first, or add a .husky folder.');
    return;
  }
  const file = join(git, 'hooks', 'pre-commit');
  if (existsSync(file)) {
    const current = readFileSync(file, 'utf8');
    done.push(current.includes('sigship') ? 'Kept .git/hooks/pre-commit (SIGSHIP already there).' : `Kept .git/hooks/pre-commit (already there). Add this line to it yourself: ${HOOK_LINE}`);
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, HOOK);
  chmodSync(file, 0o755);
  done.push('Added .git/hooks/pre-commit. A commit that adds a secret is now blocked.');
}

// Adds the definition of done to one agent file. Creates AGENTS.md; only appends to CLAUDE.md when it exists.
function addRule(root, name, done, { create }) {
  const file = join(root, name);
  if (!existsSync(file)) {
    if (!create) return;
    appendFileSync(file, AGENT_RULE);
    done.push(`Added the definition of done to ${name}.`);
    return;
  }
  if (readFileSync(file, 'utf8').includes('npx sigship')) done.push(`Kept ${name} (rule already there).`);
  else {
    appendFileSync(file, AGENT_RULE);
    done.push(`Added the definition of done to ${name}.`);
  }
}

// Adds the CI gate and the agent rule. Never overwrites a file that already exists.
export function init(target = '.', { pro = false, hook = false } = {}) {
  const root = resolve(target);
  const done = [];

  const workflow = join(root, '.github/workflows/sigship.yml');
  if (existsSync(workflow)) {
    done.push(`Kept .github/workflows/sigship.yml (already there).${pro ? ' Delete it and run this again to get pull request comments.' : ''}`);
  } else {
    mkdirSync(dirname(workflow), { recursive: true });
    writeFileSync(workflow, pro ? PRO_WORKFLOW : WORKFLOW);
    done.push(`Added .github/workflows/sigship.yml. Pull requests now run the check${pro ? ' and get a comment with the result' : ''}.`);
  }

  if (pro) {
    const nightly = join(root, '.github/workflows/sigship-nightly.yml');
    if (existsSync(nightly)) {
      done.push('Kept .github/workflows/sigship-nightly.yml (already there).');
    } else {
      writeFileSync(nightly, NIGHTLY_WORKFLOW);
      done.push('Added .github/workflows/sigship-nightly.yml. The check runs every night, and GitHub emails you when it fails.');
    }
    done.push('Add your licence key as the repository secret SIGSHIP_KEY. On Team, add SLACK_WEBHOOK_URL too for Slack alerts.');
  }

  addRule(root, 'AGENTS.md', done, { create: true });
  addRule(root, 'CLAUDE.md', done, { create: false });
  if (hook) addHook(root, done);
  return done;
}
