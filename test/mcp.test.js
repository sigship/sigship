import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createServer, groupFindings, toolFor } from '../src/mcp.js';
import { badgeId } from '../src/badge-id.js';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '../bin/sigship.js');
const FAKE_STRIPE = ['sk', 'live', '51Hx0aB2cD3eF4gH5iJ6kL7mN8'].join('_');

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sigship-mcp-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const GOOD = { 'package.json': JSON.stringify({ name: 'good', scripts: { test: 'node --test' } }), 'src/index.js': 'export const ok = true;\n' };
const BAD = {
  'package.json': JSON.stringify({ name: 'bad', dependencies: { stripe: '^14.0.0' } }),
  '.env': `STRIPE_SECRET_KEY=${FAKE_STRIPE}\n`,
  'src/api/webhook.ts': `export async function POST(req) { const event = JSON.parse(await req.text()); return handle(event); }\n`,
  'src/api/a.ts': 'export const h = { "Access-Control-Allow-Origin": "*" };\n',
  'src/api/b.ts': 'export const h = { "Access-Control-Allow-Origin": "*" };\n',
};

// A stand-in for app.sigship.dev that counts every request, to prove the server sends nothing uninvited.
let api;
let hits = 0;
before(async () => {
  api = createHttpServer((req, res) => {
    hits += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{}');
  });
  await new Promise((r) => api.listen(0, '127.0.0.1', r));
});
after(() => api.close());

async function connect({ cwd, name = 'test', env = {} }) {
  const client = new Client({ name, version: '0.0.0' });
  await client.connect(
    new StdioClientTransport({
      command: 'node',
      args: [CLI, 'mcp'],
      cwd,
      env: { PATH: process.env.PATH, XDG_CACHE_HOME: mkdtempSync(join(tmpdir(), 'sigship-cache-')), SIGSHIP_APP: `http://127.0.0.1:${api.address().port}/api/v1`, ...env },
    }),
  );
  return client;
}

describe('MCP 0.4', () => {
  it('lists three tools, the output schema and the launch-check prompt', async () => {
    const client = await connect({ cwd: project(GOOD) });
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['sigship_badge', 'sigship_check', 'sigship_explain']);
    const check = tools.find((t) => t.name === 'sigship_check');
    assert.ok(!check.inputSchema.required, 'path is optional');
    assert.deepEqual(Object.keys(check.outputSchema.properties).sort(), ['accepted', 'checksRun', 'counts', 'filesRead', 'findings', 'fixPrompt', 'go', 'since', 'summary', 'verdict', 'verdictText', 'warnings']);
    assert.ok(!tools.some((t) => /accept/i.test(t.name)), 'no tool accepts a risk');
    const { prompts } = await client.listPrompts();
    assert.deepEqual(prompts.map((p) => p.name), ['launch-check']);
    const prompt = await client.getPrompt({ name: 'launch-check', arguments: { site: 'myapp.com' } });
    assert.match(prompt.messages[0].content.text, /sigship_check/);
    assert.match(prompt.messages[0].content.text, /sigship_badge with site myapp.com/);
    assert.match(client.getInstructions(), /sigship_badge/);
    await client.close();
  });

  it('checks the working directory when path is left out and returns structured content', async () => {
    const root = project(BAD);
    const client = await connect({ cwd: root });
    const res = await client.callTool({ name: 'sigship_check', arguments: {} });
    const out = res.structuredContent;
    assert.equal(out.verdict, 'NO-GO');
    assert.equal(out.go, false);
    assert.equal(res.content[0].text, out.summary);
    assert.match(out.summary, /^NO-GO: \d+ SEV-1/);
    assert.equal(out.since, null, 'the first run has nothing to compare with');
    const cors = out.findings.find((f) => f.id === 'cors-wildcard');
    assert.equal(cors.count, 2);
    assert.equal(cors.where.length, 2);
    assert.equal(cors.more, 0);
    assert.ok(out.findings.every((f) => f.severity >= 1 && typeof f.fix === 'string'));
    assert.ok(!JSON.stringify(out).includes(FAKE_STRIPE), 'never a secret value');

    // Fix one thing, run again: since says what changed.
    rmSync(join(root, 'src/api/b.ts'));
    rmSync(join(root, 'src/api/a.ts'));
    const again = await client.callTool({ name: 'sigship_check', arguments: {} });
    const since = again.structuredContent.since;
    assert.equal(since.fixed, 2, 'the cors check no longer fires in either file');
    assert.equal(since.new, 0);
    assert.ok(since.left >= 1);
    assert.match(again.structuredContent.summary, /Since last run: 2 fixed/);
    assert.ok(again.structuredContent.findings.length > 0);
    await client.close();
    assert.equal(hits, 0, 'nothing was sent to the cloud without a token');
  });

  it('words the fix brief for the connected client', async () => {
    const root = project(BAD);
    const cursor = await connect({ cwd: root, name: 'cursor-vscode' });
    const res = await cursor.callTool({ name: 'sigship_check', arguments: { path: root } });
    assert.match(res.structuredContent.fixPrompt, /run `npx sigship` in the terminal/);
    await cursor.close();
    const claude = await connect({ cwd: root, name: 'claude-code' });
    const res2 = await claude.callTool({ name: 'sigship_check', arguments: { path: root } });
    assert.match(res2.structuredContent.fixPrompt, /sigship_check MCP tool/);
    await claude.close();
  });

  it('gives the badge after a GO and refuses while NO-GO', async () => {
    const good = project(GOOD);
    const client = await connect({ cwd: good });
    const check = await client.callTool({ name: 'sigship_check', arguments: {} });
    assert.equal(check.structuredContent.verdict, 'GO');
    assert.match(check.structuredContent.summary, /Show it with: npx sigship badge <site>$/);
    const res = await client.callTool({ name: 'sigship_badge', arguments: { site: 'https://www.myapp.com/' } });
    const id = badgeId('S', 'myapp.com');
    assert.equal(res.structuredContent.id, id);
    assert.equal(res.structuredContent.level, 'S');
    assert.equal(res.structuredContent.site, 'myapp.com');
    assert.match(res.structuredContent.embed, new RegExp(`https://sigship.dev/b/${id}.svg`));
    assert.equal(res.structuredContent.verify, `https://sigship.dev/verify/?id=${id}&site=myapp.com`);
    const bad = await client.callTool({ name: 'sigship_badge', arguments: { site: 'myapp.com', path: project(BAD) } });
    assert.equal(bad.isError, true);
    assert.match(bad.content[0].text, /NO-GO/);
    await client.close();
    assert.equal(hits, 0, 'the badge needs no network without a key');
  });

  it('still explains a check and reports a missing folder', async () => {
    const client = await connect({ cwd: project(GOOD) });
    const explain = await client.callTool({ name: 'sigship_explain', arguments: { id: 'rls-missing' } });
    assert.equal(JSON.parse(explain.content[0].text).severity, 1);
    const missing = await client.callTool({ name: 'sigship_check', arguments: { path: '/no/such/folder' } });
    assert.equal(missing.isError, true);
    await client.close();
  });
});

describe('MCP helpers', () => {
  it('maps the client name to a prompt template', () => {
    assert.equal(toolFor('Claude Code'), 'claude');
    assert.equal(toolFor('claude-ai'), 'claude');
    assert.equal(toolFor('Cursor'), 'cursor');
    assert.equal(toolFor('windsurf-ide'), 'windsurf');
    assert.equal(toolFor('something-else'), undefined);
    assert.equal(toolFor(undefined), undefined);
  });

  it('caps the places per check and counts the rest', () => {
    const findings = Array.from({ length: 13 }, (_, i) => ({ id: 'x', severity: 2, title: 'X', fix: 'f', file: `f${i}.js`, line: i + 1, detail: 'd' }));
    const [group] = groupFindings([...findings, { id: 'y', severity: 1, title: 'Y', fix: 'g', file: 'y.js', line: 1, detail: 'd' }]);
    assert.equal(group.count, 13);
    assert.equal(group.where.length, 10);
    assert.equal(group.more, 3);
  });

  it('answers prompts/get for an unknown prompt with an error, and notifications with nothing', async () => {
    const server = createServer({ version: '0.0.0' });
    const bad = await server.respond({ jsonrpc: '2.0', id: 1, method: 'prompts/get', params: { name: 'nope' } });
    assert.equal(bad.error.code, -32602);
    assert.equal(await server.respond({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  });
});
