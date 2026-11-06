// A small MCP server over stdio with no dependencies.
// The test suite drives it with the official MCP client to prove it speaks the protocol.
import { createInterface } from 'node:readline';
import { scan } from './scan.js';
import { toJson, toPrompt } from './report.js';
import { RULES_BY_ID } from './rules.js';

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS =
  'Run sigship_check before telling the user that work is finished or ready to ship. ' +
  'Do not say it is done while the verdict is NO-GO. Fix the findings, then run it again.';

const TOOLS = [
  {
    name: 'sigship_check',
    description:
      'Read a project folder and return a GO or NO-GO verdict with each production problem, where it is, and how to fix it. Runs locally and changes no files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path of the project folder to check.' },
        strict: { type: 'boolean', description: 'Also block on SEV-3 findings.' },
      },
      required: ['path'],
      additionalProperties: false,
    },
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
];

const text = (value, isError = false) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

function callTool(name, args = {}) {
  try {
    if (name === 'sigship_check') {
      if (typeof args.path !== 'string') return text('path is required.', true);
      const options = { strict: args.strict === true };
      const result = scan(args.path);
      return text({ ...toJson(result, options), fixPrompt: toPrompt(result, options) });
    }
    if (name === 'sigship_explain') {
      const rule = RULES_BY_ID[args.id];
      if (!rule) return text(`No check named ${args.id}.`, true);
      return text({ id: rule.id, severity: rule.severity, title: rule.title, forecast: rule.forecast, fix: rule.fix });
    }
    return text(`No tool named ${name}.`, true);
  } catch (error) {
    return text(error.message, true);
  }
}

function respond(message, version) {
  const { id, method, params } = message;
  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  switch (method) {
    case 'initialize':
      return reply({
        protocolVersion: VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'sigship', version },
        instructions: INSTRUCTIONS,
      });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call':
      return reply(callTool(params?.name, params?.arguments));
    default:
      if (id === undefined) return null; // Notifications get no reply.
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

export function startMcp(version) {
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
    const reply = respond(message, version);
    if (reply) send(reply);
  });
  return new Promise((resolve) => lines.on('close', resolve));
}
