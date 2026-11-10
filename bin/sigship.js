#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { scan, verdict } from '../src/scan.js';
import { toHtml, toJson, toMarkdown, toPrompt, toSarif, toTerminal } from '../src/report.js';
import { TOOLS } from '../src/prompts.js';
import { init } from '../src/init.js';
import { hasPro, loadPro } from '../src/pro.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `sigship ${version}
The go/no-go check for AI-built apps. Runs on your machine. Sends nothing anywhere
unless you set SIGSHIP_KEY, and then only the key and a one-way repo fingerprint.

Usage
  npx sigship [folder]        Check a project. Exits 0 for GO, 1 for NO-GO.
  npx sigship init [folder]   Add the pull request check and the agent rule to
                              AGENTS.md and, when it exists, CLAUDE.md.
                              With --hook, add a pre-commit hook that blocks a
                              commit that adds a secret (staged files only, fast).
                              With --pro, the check comments on pull requests and
                              a nightly check runs too (Solo and Team).
  npx sigship history [folder]  Find secrets committed in the past, even if a later
                              commit removed them. Reads git log for up to 5,000
                              commits or 50 MB. Prints the commit and file, never
                              the value. Exits 1 when it finds one.
  npx sigship hook [folder]   What the pre-commit hook runs: the secret checks on
                              the staged files. Exits 1 when it finds one.
  npx sigship ui [folder]     Open the dashboard in your browser. It runs on this
                              computer only. Press Ctrl+C to stop it.
  npx sigship mcp             Start the MCP server for Claude Code, Cursor and others.

Options
  --prompt         Print the fixes as one prompt for your AI tool.
  --tool <name>    Word the prompt for one tool: ${TOOLS.join(', ')}.
  --json           Print the result as JSON.
  --markdown       Print the result as Markdown, for pull request comments.
  --sarif          Print the result as SARIF 2.1.0, for GitHub code scanning.
  --report         Also write sigship-report.html to send to a client (Solo and Team).
  --brand <name>   With --report, put this name on the report instead of SIGSHIP.
  --logo <file>    With --report, put this PNG, JPEG, SVG, GIF or WebP logo on the report.
  --strict         Also block on SEV-3 findings.
  --no-open        With ui, print the dashboard link without opening a browser.
  --version        Print the version.
  --help           Print this help.

Accepted risks
  Put sigship-accept.json in the folder to accept a finding for a while:
  [{ "rule": "cors-wildcard", "file": "src/api/x.ts", "reason": "why", "expires": "2026-12-31" }]
  Accepted findings are listed but don't count for the verdict until they expire.
  There is no flag or command that accepts a risk; only that file does.

Solo and Team
  Set SIGSHIP_KEY to your licence key to add the Pro pack of extra checks.
  See https://sigship.dev/#pricing
`;

// Options that take a value: --tool cursor or --tool=cursor.
const VALUE_FLAGS = new Set(['--tool', '--brand', '--logo']);
const args = process.argv.slice(2);
const flags = new Set();
const values = {};
const words = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (!arg.startsWith('-')) {
    words.push(arg);
    continue;
  }
  const eq = arg.indexOf('=');
  const name = eq > 0 ? arg.slice(0, eq) : arg;
  if (VALUE_FLAGS.has(name)) {
    values[name] = eq > 0 ? arg.slice(eq + 1) : args[(i += 1)];
    if (values[name] === undefined) {
      console.error(`${name} needs a value. Run npx sigship --help to see the options.`);
      process.exit(2);
    }
  }
  flags.add(name);
}

const LOGO_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
function logoDataUri(file) {
  const type = LOGO_TYPES[extname(file).slice(1).toLowerCase()];
  if (!type) throw new Error(`--logo must be a PNG, JPEG, SVG, GIF or WebP file, not ${basename(file)}.`);
  const bytes = readFileSync(file);
  if (bytes.length > 2 * 1024 * 1024) throw new Error('--logo must be under 2 MB.');
  return `data:${type};base64,${bytes.toString('base64')}`;
}

async function main() {
  if (flags.has('--help') || flags.has('-h')) return void process.stdout.write(HELP);
  if (flags.has('--version') || flags.has('-v')) return void console.log(version);

  const known = new Set(['--prompt', '--json', '--markdown', '--sarif', '--strict', '--report', '--pro', '--hook', '--no-open', ...VALUE_FLAGS]);
  const unknown = [...flags].filter((f) => !known.has(f));
  if (unknown.length) {
    console.error(`Unknown option ${unknown[0]}. Run npx sigship --help to see the options.`);
    process.exitCode = 2;
    return;
  }

  if (words[0] === 'mcp') {
    const { startMcp } = await import('../src/mcp.js');
    return startMcp(version);
  }
  if (words[0] === 'ui') {
    const { startUi, openBrowser } = await import('../src/ui.js');
    const ui = await startUi({ target: words[1] ?? '.', strict: flags.has('--strict'), version });
    console.log(`SIGSHIP dashboard: ${ui.url}`);
    console.log('It only answers this computer, through that link. Press Ctrl+C to stop.');
    if (!flags.has('--no-open')) openBrowser(ui.url);
    process.once('SIGINT', async () => {
      await ui.close();
      console.log('\nStopped the dashboard.');
      process.exit(0);
    });
    return;
  }
  if (words[0] === 'init') {
    for (const line of init(words[1], { pro: flags.has('--pro'), hook: flags.has('--hook') })) console.log(line);
    return;
  }
  if (words[0] === 'hook') {
    const { checkStaged } = await import('../src/history.js');
    const { files, findings } = checkStaged(words[1] ?? '.');
    if (!findings.length) return;
    console.error(`SIGSHIP: ${findings.length === 1 ? 'a secret is' : `${findings.length} secrets are`} in what you are about to commit (checked ${files} staged files).`);
    for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.detail}`);
    console.error('Move it to an environment variable, then stage the change and commit again. Value hidden.');
    process.exitCode = 1;
    return;
  }
  if (words[0] === 'history') {
    const { history } = await import('../src/history.js');
    const { commits, capped, secrets } = await history(words[1] ?? '.');
    if (flags.has('--json')) {
      console.log(JSON.stringify({ commits, capped, secrets }, null, 2));
    } else {
      console.log(`SIGSHIP read ${commits} commits${capped ? ' (stopped at the cap)' : ''}.`);
      for (const s of secrets) {
        console.log(`${s.removed ? 'REMOVED ' : 'PRESENT '} ${s.file}  ${s.detail}`);
        console.log(`         committed ${s.commit} on ${s.date}${s.removed ? `, removed ${s.removed.commit} on ${s.removed.date}` : ', still in the history and the code'}`);
      }
      console.log(secrets.length ? '\nA removed secret is still in the history and in every clone. Rotate it. Then rewrite history or leave it, as it is already exposed.' : 'No secret was found in the history.');
    }
    process.exitCode = secrets.length ? 1 : 0;
    return;
  }

  const target = (words[0] === 'check' ? words[1] : words[0]) ?? '.';
  const strict = flags.has('--strict');
  const logo = values['--logo'] ? logoDataUri(values['--logo']) : undefined;
  const pro = await loadPro(target);
  if (flags.has('--report') && !hasPro(pro)) {
    const reason = pro.message ? `${pro.message.replace(' Ran the free checks.', '')} ` : '';
    console.error(`${reason}The client report comes with Solo and Team. Set SIGSHIP_KEY to your licence key. See https://sigship.dev/#pricing`);
    process.exitCode = 2;
    return;
  }
  if (values['--tool'] !== undefined && !TOOLS.includes(values['--tool'])) {
    console.error(`Unknown tool ${values['--tool']}. Choose one of ${TOOLS.join(', ')}.`);
    process.exitCode = 2;
    return;
  }
  const result = scan(target, { extraRules: pro.rules });
  const options = { strict, pro, tool: values['--tool'], version };

  // Warnings go to stderr so they never break JSON or SARIF on stdout.
  if (!flags.has('--json') && !flags.has('--markdown')) for (const line of result.warnings ?? []) console.error(line);

  if (flags.has('--json')) console.log(JSON.stringify(toJson(result, options), null, 2));
  else if (flags.has('--sarif')) console.log(JSON.stringify(toSarif(result, options), null, 2));
  else if (flags.has('--markdown')) console.log(toMarkdown(result, options));
  else if (flags.has('--prompt')) console.log(toPrompt(result, options));
  else console.log(toTerminal(result, options));

  if (flags.has('--report')) {
    writeFileSync('sigship-report.html', toHtml(result, { strict, name: basename(resolve(target)), brand: values['--brand'], logo }));
    console.error('Wrote sigship-report.html.');
  }

  process.exitCode = verdict(result, { strict }).exitCode;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 2;
});
