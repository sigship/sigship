// A small MCP server over stdio with no dependencies.
// The test suite drives it with the official MCP client to prove it speaks the protocol.
// Like the CLI, it makes no network call unless SIGSHIP_KEY is set or you have run npx sigship login.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { scan, verdict } from './scan.js';
import { BADGE_HINT, toPrompt } from './report.js';
import { RULES_BY_ID } from './rules.js';
import { loadPro } from './pro.js';
import { TOOLS as PROMPT_TOOLS } from './prompts.js';
import { badge } from './badge.js';
import { cacheDir, reportRun } from './cloud.js';

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_WHERE = 10;

const INSTRUCTIONS =
  'Run sigship_check before telling the user that work is finished or ready to ship. ' +
  'Do not say it is done while the verdict is NO-GO. Fix the findings, then run it again. ' +
  'After a GO, sigship_badge gives the badge code for the site.';

const WHERE = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    line: { type: 'integer' },
    detail: { type: 'string', description: 'What was found there, with any secret value hidden.' },
  },
  required: ['file', 'line', 'detail'],
};

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['GO', 'NO-GO'] },
    verdictText: { type: 'string', description: 'The verdict in words, for example "GO with 1 accepted risk".' },
    go: { type: 'boolean' },
    summary: { type: 'string', description: 'One line: the verdict, the counts and what changed since the last run.' },
    counts: {
      type: 'object',
      properties: { sev1: { type: 'integer' }, sev2: { type: 'integer' }, sev3: { type: 'integer' } },
      required: ['sev1', 'sev2', 'sev3'],
    },
    accepted: {
      type: 'array',
      description: 'Accepted risks from sigship-accept.json. They do not count for the verdict.',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, severity: { type: 'integer' }, title: { type: 'string' }, file: { type: 'string' }, line: { type: 'integer' }, reason: { type: 'string' }, expires: { type: 'string' } },
        required: ['id', 'severity', 'title', 'file', 'line', 'reason', 'expires'],
      },
    },
    checksRun: { type: 'integer' },
    filesRead: { type: 'integer' },
    findings: {
      type: 'array',
      description: 'Worst first, one entry per check that found something.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          severity: { type: 'integer', description: '1 and 2 block launch; 3 blocks only with strict.' },
          title: { type: 'string' },
          fix: { type: 'string' },
          count: { type: 'integer', description: 'How many places this check found.' },
          where: { type: 'array', items: WHERE, description: `At most ${MAX_WHERE} places.` },
          more: { type: 'integer', description: 'How many places are not listed in where.' },
        },
        required: ['id', 'severity', 'title', 'fix', 'count', 'where', 'more'],
      },
    },
    since: {
      type: ['object', 'null'],
      description: 'Compared with the last run of the same folder on this machine. Null on the first run.',
      properties: { fixed: { type: 'integer' }, left: { type: 'integer' }, new: { type: 'integer' }, previousRun: { type: 'string' } },
      required: ['fixed', 'left', 'new', 'previousRun'],
    },
    fixPrompt: { type: 'string', description: 'The fixes as one brief, worded for the connected client.' },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'verdictText', 'go', 'summary', 'counts', 'accepted', 'checksRun', 'filesRead', 'findings', 'since', 'fixPrompt', 'warnings'],
};

const TOOLS = [
  {
    name: 'sigship_check',
    description:
      'Read a project folder and return a GO or NO-GO verdict with each production problem, where it is, and how to fix it. Runs locally and changes no files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: "Absolute path of the project folder to check. Defaults to the server's working directory." },
        strict: { type: 'boolean', description: 'Also block on SEV-3 findings.' },
      },
      additionalProperties: false,
    },
    outputSchema: OUTPUT_SCHEMA,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'sigship_explain',
    description: 'Explain one SIGSHIP check: what goes wrong and how to fix it.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'The check id, for example rls-missing.' } },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'sigship_badge',
    description:
      'After a GO: the Self-checked badge code to paste into the site, and the link where anyone can check it. Checks the folder first and refuses while the verdict is NO-GO. Makes no network call unless SIGSHIP_KEY is set.',
    inputSchema: {
      type: 'object',
      properties: {
        site: { type: 'string', description: 'The site the badge is for, for example myapp.com.' },
        path: { type: 'string', description: "Absolute path of the project folder. Defaults to the server's working directory." },
      },
      required: ['site'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The badge ID, for example SG-S-4K7Q2M.' },
        level: { type: 'string', description: 'S for Self-checked, D for Deep self-check.' },
        site: { type: 'string' },
        embed: { type: 'string', description: 'The HTML to paste into the site.' },
        verify: { type: 'string', description: 'Where anyone can check the badge.' },
      },
      required: ['id', 'level', 'site', 'embed', 'verify'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
];

const PROMPTS = [
  {
    name: 'launch-check',
    title: 'Launch check',
    description: 'Check the project with SIGSHIP, fix what blocks launch, re-run until GO, then get the badge.',
    arguments: [
      { name: 'path', description: "Absolute path of the project folder. Defaults to the server's working directory.", required: false },
      { name: 'site', description: 'The site the badge is for, once the verdict is GO.', required: false },
    ],
  },
];

function launchPrompt({ path, site } = {}) {
  const where = path ? ` on ${path}` : '';
  const lines = [
    `Run sigship_check${where}. It returns a GO or NO-GO verdict with each production problem, where it is and how to fix it.`,
    'If it is NO-GO, fix the findings worst first (every SEV-1, then every SEV-2), changing only what each fix needs. For the wording of one check, call sigship_explain with its id.',
    'If a fix needs a key rotated or a setting changed in a dashboard, stop and tell me exactly what to do instead of guessing.',
    'Run sigship_check again after the fixes and keep going until it is GO. Do not tell me the work is done while it is NO-GO.',
    `Once it is GO, call sigship_badge${site ? ` with site ${site}` : ' with the site the app is published on'} and give me the badge code to paste into the site.`,
  ];
  return { description: PROMPTS[0].description, messages: [{ role: 'user', content: { type: 'text', text: lines.join('\n') } }] };
}

// Which --tool template fits the connected client, from the name it gave in initialize.
export function toolFor(clientName) {
  const name = String(clientName ?? '').toLowerCase();
  if (!name) return undefined;
  if (name.includes('claude')) return 'claude';
  return PROMPT_TOOLS.find((tool) => name.includes(tool));
}

// Findings grouped by check, worst first, with at most MAX_WHERE places each.
export function groupFindings(findings, max = MAX_WHERE) {
  const groups = new Map();
  for (const f of findings) {
    if (!groups.has(f.id)) groups.set(f.id, { id: f.id, severity: f.severity, title: f.title, fix: f.fix, count: 0, where: [], more: 0 });
    const g = groups.get(f.id);
    g.count += 1;
    if (g.where.length < max) g.where.push({ file: f.file, line: f.line, detail: f.detail });
    else g.more += 1;
  }
  return [...groups.values()];
}

// What changed since the last run of the same folder on this machine. The state is a small JSON
// per folder in the cache dir: the keys of the last findings (check and file, not line), never code.
const folderKey = (root) => createHash('sha256').update(resolve(root)).digest('hex').slice(0, 24);
export const stateFile = (root, env = process.env) => join(cacheDir(env), 'runs', `${folderKey(root)}.json`);
const findingKeys = (findings) => [...new Set(findings.map((f) => `${f.id}\t${f.file}`))];

export function sinceLastRun(root, findings, { env = process.env, now = new Date() } = {}) {
  const file = stateFile(root, env);
  const keys = findingKeys(findings);
  let since = null;
  try {
    const last = JSON.parse(readFileSync(file, 'utf8'));
    if (Array.isArray(last.keys)) {
      const before = new Set(last.keys);
      const current = new Set(keys);
      since = {
        fixed: last.keys.filter((k) => !current.has(k)).length,
        left: keys.filter((k) => before.has(k)).length,
        new: keys.filter((k) => !before.has(k)).length,
        previousRun: String(last.date ?? ''),
      };
    }
  } catch {
    // No last run, or an unreadable one: this run is the first.
  }
  try {
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, JSON.stringify({ date: now.toISOString(), keys }));
  } catch {
    // A read-only cache folder only means no comparison next time.
  }
  return since;
}

export function summaryLine(result, v, since) {
  const { sev1, sev2, sev3 } = result.counts;
  const parts = [`${v.text}: ${sev1} SEV-1, ${sev2} SEV-2, ${sev3} SEV-3 in ${result.filesRead} files, ${result.checksRun} checks.`];
  if (since) parts.push(`Since last run: ${since.fixed} fixed, ${since.left} left, ${since.new} new.`);
  parts.push(v.go ? BADGE_HINT : 'Fix the findings, then run sigship_check again.');
  return parts.join(' ');
}

const text = (value, isError = false) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

const structured = (summary, structuredContent) => ({ content: [{ type: 'text', text: summary }], structuredContent });

export function createServer({ version = '0.0.0', cwd = process.cwd(), env = process.env, fetch = globalThis.fetch } = {}) {
  let client = {};

  const folder = (path) => {
    if (path !== undefined && typeof path !== 'string') throw new Error('path must be a string.');
    return resolve(cwd, path || '.');
  };

  async function check(args) {
    const root = folder(args.path);
    const options = { strict: args.strict === true, tool: toolFor(client.name) };
    const pro = await loadPro(root, { env, fetch });
    const result = scan(root, { extraRules: pro.rules });
    const v = verdict(result, options);
    const since = sinceLastRun(root, result.findings, { env });
    void reportRun(result, { root, version, env, fetch });
    const summary = summaryLine(result, v, since);
    return structured(summary, {
      verdict: v.label,
      verdictText: v.text,
      go: v.go,
      summary,
      counts: result.counts,
      accepted: (result.accepted ?? []).map((f) => ({ id: f.id, severity: f.severity, title: f.title, file: f.file, line: f.line, reason: f.reason, expires: f.expires })),
      checksRun: result.checksRun,
      filesRead: result.filesRead,
      findings: groupFindings(result.findings),
      since,
      fixPrompt: toPrompt(result, options),
      warnings: result.warnings ?? [],
    });
  }

  async function callTool(name, args = {}) {
    try {
      if (name === 'sigship_check') return await check(args);
      if (name === 'sigship_explain') {
        const rule = RULES_BY_ID[args.id];
        if (!rule) return text(`No check named ${args.id}.`, true);
        return text({ id: rule.id, severity: rule.severity, title: rule.title, forecast: rule.forecast, fix: rule.fix });
      }
      if (name === 'sigship_badge') {
        if (typeof args.site !== 'string' || !args.site.trim()) return text('site is required, for example myapp.com.', true);
        const root = folder(args.path);
        const pro = await loadPro(root, { env, fetch });
        const v = verdict(scan(root, { extraRules: pro.rules }));
        if (!v.go) return text(`The verdict for ${root} is ${v.text}. Fix the findings and run sigship_check until it is GO, then ask for the badge.`, true);
        const b = await badge(args.site, { env, fetch });
        const { message, ...out } = b;
        const words = out.level === 'D' ? 'Deep self-check' : 'Self-checked';
        return structured(`${message ? `${message} ` : ''}${words} badge ${out.id} for ${out.site}. Paste the embed code into the site. Anyone can check it at ${out.verify}`, out);
      }
      return text(`No tool named ${name}.`, true);
    } catch (error) {
      return text(error.message, true);
    }
  }

  async function respond(message) {
    const { id, method, params } = message;
    const reply = (result) => ({ jsonrpc: '2.0', id, result });
    const fail = (code, text) => ({ jsonrpc: '2.0', id, error: { code, message: text } });
    switch (method) {
      case 'initialize':
        client = params?.clientInfo ?? {};
        return reply({
          protocolVersion: VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : VERSIONS[0],
          capabilities: { tools: {}, prompts: {} },
          serverInfo: { name: 'sigship', version },
          instructions: INSTRUCTIONS,
        });
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: TOOLS });
      case 'tools/call':
        return reply(await callTool(params?.name, params?.arguments));
      case 'prompts/list':
        return reply({ prompts: PROMPTS });
      case 'prompts/get':
        if (params?.name !== 'launch-check') return fail(-32602, `No prompt named ${params?.name}.`);
        return reply(launchPrompt(params?.arguments));
      default:
        if (id === undefined) return null; // Notifications get no reply.
        return fail(-32601, `Method not found: ${method}`);
    }
  }

  return { respond, callTool, tools: TOOLS, prompts: PROMPTS };
}

export function startMcp(version) {
  const server = createServer({ version });
  const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
  const lines = createInterface({ input: process.stdin });
  lines.on('line', (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      return;
    }
    server.respond(message).then((reply) => {
      if (reply) send(reply);
    });
  });
  return new Promise((resolve) => lines.on('close', resolve));
}
