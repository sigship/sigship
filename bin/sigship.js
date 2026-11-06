#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { scan, verdict } from '../src/scan.js';
import { toHtml, toJson, toMarkdown, toPrompt, toTerminal } from '../src/report.js';
import { init } from '../src/init.js';
import { hasPro, loadPro } from '../src/pro.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `sigship ${version}
The go/no-go check for AI-built apps. Runs on your machine. Sends nothing anywhere
unless you set SIGSHIP_KEY, and then only the key and a one-way repo fingerprint.

Usage
  npx sigship [folder]        Check a project. Exits 0 for GO, 1 for NO-GO.
  npx sigship init [folder]   Add the pull request check and the agent rule.
                              With --pro, the check comments on pull requests and
                              a nightly check runs too (Solo and Team).
  npx sigship ui [folder]     Open the dashboard in your browser. It runs on this
                              computer only. Press Ctrl+C to stop it.
  npx sigship mcp             Start the MCP server for Claude Code, Cursor and others.

Options
  --prompt     Print the fixes as one prompt for your AI tool.
  --json       Print the result as JSON.
  --markdown   Print the result as Markdown, for pull request comments.
  --report     Also write sigship-report.html to send to a client (Solo and Team).
  --strict     Also block on SEV-3 findings.
  --no-open    With ui, print the dashboard link without opening a browser.
  --version    Print the version.
  --help       Print this help.

Solo and Team
  Set SIGSHIP_KEY to your licence key to add the Pro pack of extra checks.
  See https://sigship.dev/#pricing
`;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('-')));
const words = args.filter((a) => !a.startsWith('-'));

async function main() {
  if (flags.has('--help') || flags.has('-h')) return void process.stdout.write(HELP);
  if (flags.has('--version') || flags.has('-v')) return void console.log(version);

  const known = new Set(['--prompt', '--json', '--markdown', '--strict', '--report', '--pro', '--no-open']);
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
    for (const line of init(words[1], { pro: flags.has('--pro') })) console.log(line);
    return;
  }

  const target = (words[0] === 'check' ? words[1] : words[0]) ?? '.';
  const strict = flags.has('--strict');
  const pro = await loadPro(target);
  if (flags.has('--report') && !hasPro(pro)) {
    const reason = pro.message ? `${pro.message.replace(' Ran the free checks.', '')} ` : '';
    console.error(`${reason}The client report comes with Solo and Team. Set SIGSHIP_KEY to your licence key. See https://sigship.dev/#pricing`);
    process.exitCode = 2;
    return;
  }
  const result = scan(target, { extraRules: pro.rules });
  const options = { strict, pro };

  if (flags.has('--json')) console.log(JSON.stringify(toJson(result, options), null, 2));
  else if (flags.has('--markdown')) console.log(toMarkdown(result, options));
  else if (flags.has('--prompt')) console.log(toPrompt(result, options));
  else console.log(toTerminal(result, options));

  if (flags.has('--report')) {
    writeFileSync('sigship-report.html', toHtml(result, { strict, name: basename(resolve(target)) }));
    console.error('Wrote sigship-report.html.');
  }

  process.exitCode = verdict(result, { strict }).exitCode;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 2;
});
