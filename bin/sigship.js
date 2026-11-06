#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { scan, verdict } from '../src/scan.js';
import { toJson, toPrompt, toTerminal } from '../src/report.js';
import { init } from '../src/init.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `sigship ${version}
The go/no-go check for AI-built apps. Runs on your machine. Sends nothing anywhere.

Usage
  npx sigship [folder]        Check a project. Exits 0 for GO, 1 for NO-GO.
  npx sigship init [folder]   Add the pull request check and the agent rule.
  npx sigship mcp             Start the MCP server for Claude Code, Cursor and others.

Options
  --prompt     Print the fixes as one prompt for your AI tool.
  --json       Print the result as JSON.
  --strict     Also block on SEV-3 findings.
  --version    Print the version.
  --help       Print this help.
`;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('-')));
const words = args.filter((a) => !a.startsWith('-'));

async function main() {
  if (flags.has('--help') || flags.has('-h')) return void process.stdout.write(HELP);
  if (flags.has('--version') || flags.has('-v')) return void console.log(version);

  const known = new Set(['--prompt', '--json', '--strict']);
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
  if (words[0] === 'init') {
    for (const line of init(words[1])) console.log(line);
    return;
  }

  const target = words[0] === 'check' ? words[1] : words[0];
  const strict = flags.has('--strict');
  const result = scan(target ?? '.');

  if (flags.has('--json')) console.log(JSON.stringify(toJson(result, { strict }), null, 2));
  else if (flags.has('--prompt')) console.log(toPrompt(result, { strict }));
  else console.log(toTerminal(result, { strict }));

  process.exitCode = verdict(result, { strict }).exitCode;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 2;
});
