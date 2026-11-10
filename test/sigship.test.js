import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { scan, verdict } from '../src/scan.js';
import { toJson, toPrompt, toTerminal } from '../src/report.js';
import { RULES } from '../src/rules.js';

// A signed-in machine would report every CLI run these tests make. Keep the tests off the network.
process.env.SIGSHIP_NO_REPORT = '1';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '../bin/sigship.js');

// Fake secrets are assembled at run time so this file never trips a secret scanner.
const FAKE_OPENAI = ['sk', 'proj', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'].join('-');
const FAKE_STRIPE = ['sk', 'live', '51Hx0aB2cD3eF4gH5iJ6kL7mN8'].join('_');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (role) => [b64({ alg: 'HS256', typ: 'JWT' }), b64({ iss: 'supabase', role, exp: 2000000000 }), 'c2lnbmF0dXJlLXZhbHVlLWhlcmU'].join('.');

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sigship-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'ignore' });
const gitInit = (root) => {
  git(root, 'init', '-q');
  git(root, 'add', '-A');
};

const BAD = {
  'package.json': JSON.stringify({ name: 'bad', dependencies: { react: '^19.0.0', openai: '^5.0.0' }, scripts: { test: 'echo "Error: no test specified" && exit 1' } }),
  '.env': `OPENAI_API_KEY=${FAKE_OPENAI}\n`,
  'src/lib/ai.ts': `import OpenAI from 'openai';\nexport const ai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_KEY, dangerouslyAllowBrowser: true });\n`,
  'src/lib/admin.ts': `export const supabaseAdmin = createClient(url, '${jwt('service_role')}');\nexport const stripe = '${FAKE_STRIPE}';\n`,
  'src/lib/anon.ts': `export const anon = '${jwt('anon')}';\n`,
  'src/pages/Admin.tsx': `const isAdmin = localStorage.getItem('isAdmin');\nconst p = <div dangerouslySetInnerHTML={{ __html: bio }} />;\nconsole.log('login', password);\n`,
  'src/api/stripe-webhook.ts': `export async function POST(req) {\n  const event = await req.json();\n  if (event.type === 'checkout.session.completed') await upgrade(event);\n}\n`,
  'src/api/chat.ts': `export async function POST(req) {\n  return openai.chat.completions.create({ model: 'x', messages: [] });\n}\n`,
  'src/api/search.ts': 'export const q = (name) => db.query(`select * from users where name = \'${name}\'`);\nconst h = { "Access-Control-Allow-Origin": "*" };\n',
  'supabase/migrations/001.sql': `create table public.profiles (id uuid primary key);\ncreate table public.safe (id uuid primary key);\nalter table public.safe enable row level security;\ncreate policy "open" on public.safe for update using (true);\ncreate policy "read" on public.safe for select using (true);\ncreate table auth.audit (id uuid);\n`,
};

const GOOD = {
  'package.json': JSON.stringify({ name: 'good', dependencies: { react: '^19.0.0', '@sentry/react': '^10.0.0', '@upstash/ratelimit': '^2.0.0' }, scripts: { test: 'vitest run' } }),
  'package-lock.json': '{}',
  '.gitignore': '.env\nnode_modules\n',
  '.env': `OPENAI_API_KEY=${FAKE_OPENAI}\n`,
  '.env.example': 'OPENAI_API_KEY=your-key-here\nVITE_SUPABASE_ANON_KEY=your-anon-key\n',
  'src/App.tsx': 'export const App = () => <ErrorBoundary><Routes /></ErrorBoundary>;\n',
  'src/App.test.tsx': 'test("x", () => {});\n',
  'src/api/stripe-webhook.ts': `const event = stripe.webhooks.constructEvent(body, sig, secret);\nif (event.type === 'checkout.session.completed') await upgrade(event);\n`,
  'src/api/chat.ts': `await ratelimit.limit(ip);\nreturn openai.chat.completions.create({ model: 'x', messages: [] });\n`,
  'src/lib/db.ts': 'export const q = (name) => db.query("select * from users where name = $1", [name]);\n',
  'supabase/migrations/001.sql': `create table public.profiles (id uuid primary key);\nalter table public.profiles enable row level security;\ncreate policy "own" on public.profiles for update using (auth.uid() = id);\n`,
};

describe('sigship', () => {
  let bad, good;
  before(() => {
    bad = project(BAD);
    gitInit(bad);
    good = project(GOOD);
    gitInit(good);
  });
  after(() => {
    rmSync(bad, { recursive: true, force: true });
    rmSync(good, { recursive: true, force: true });
  });

  it('every check has an id, a forecast and a fix', () => {
    assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
    for (const r of RULES) assert.ok(r.title && r.forecast && r.fix && [1, 2, 3].includes(r.severity), r.id);
  });

  it('fires every check on the bad project', () => {
    const ids = new Set(scan(bad).findings.map((f) => f.id));
    const missing = RULES.map((r) => r.id).filter((id) => !ids.has(id));
    assert.deepEqual(missing, []);
  });

  it('finds nothing on the good project', () => {
    const r = scan(good);
    assert.deepEqual(r.findings.map((f) => `${f.id} ${f.file}`), []);
    assert.equal(verdict(r).exitCode, 0);
  });

  it('never prints a secret value in any format', () => {
    const r = scan(bad);
    const outputs = [toTerminal(r), toPrompt(r), JSON.stringify(toJson(r))].join('\n');
    assert.ok(!outputs.includes(FAKE_OPENAI));
    assert.ok(!outputs.includes(FAKE_STRIPE));
    assert.ok(!outputs.includes(jwt('service_role')));
  });

  it('flags a service_role key and ignores a public anon key', () => {
    const hits = scan(bad).findings.filter((f) => f.id === 'secret-in-code').map((f) => f.file);
    assert.ok(hits.includes('src/lib/admin.ts'));
    assert.ok(!hits.includes('src/lib/anon.ts'));
  });

  it('checks only public tables for row level security', () => {
    const hits = scan(bad).findings.filter((f) => f.id === 'rls-missing');
    assert.equal(hits.length, 1);
    assert.match(hits[0].detail, /profiles/);
  });

  it('allows a read policy of true but not a write policy of true', () => {
    const hits = scan(bad).findings.filter((f) => f.id === 'rls-open-write');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 4);
  });

  it('reports the real line number', () => {
    const hit = scan(bad).findings.find((f) => f.id === 'role-in-local-storage');
    assert.equal(hit.file, 'src/pages/Admin.tsx');
    assert.equal(hit.line, 1);
  });

  it('does not flag a git-ignored .env file', () => {
    assert.ok(!scan(good).findings.some((f) => f.id === 'env-file-committed'));
  });

  it('keeps quiet about things that are not problems', () => {
    const demoKey = [b64({ alg: 'HS256' }), b64({ iss: 'supabase-demo', role: 'service_role' }), 'c2lnbmF0dXJlLXZhbHVlLWhlcmU'].join('.');
    const root = project({
      'package.json': JSON.stringify({ name: 'x', dependencies: { react: '^19.0.0', '@sentry/react': '^10.0.0' }, scripts: { test: 'vitest' } }),
      'package-lock.json': '{}',
      '.env': 'NEXT_PUBLIC_APP_URL=https://example.com\nDATABASE_URL=your-database-url\n',
      'src/App.tsx': `const THEME = 'x';\nconst a = <script dangerouslySetInnerHTML={{ __html: THEME }} />;\nconst b = <script dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;\nconst c = <ErrorBoundary />;\nconsole.log('enter your secret token');\nconst d = customer.subscription.id;\n`,
      'db/migrations/1.sql': 'create table public.orders (id uuid primary key);\n',
      'supabase-seed.ts': `export const local = '${demoKey}';\n`,
      'src/lib/report.ts': 'const r = await pool.query(`select ${COLS} from t ${where} order by date`, vals);\n',
      'prompts/spec.txt': 'Set VITE_ANTHROPIC_API_KEY in your notes.\n',
      'test/fixture.sql': 'create policy "x" on t for update using (true);\n',
    });
    gitInit(root);
    assert.deepEqual(scan(root).findings.map((f) => f.id), []);
    rmSync(root, { recursive: true, force: true });
  });

  it('works outside a git repo', () => {
    const root = project(BAD);
    const ids = scan(root).findings.map((f) => f.id);
    assert.ok(ids.includes('env-file-committed'));
    rmSync(root, { recursive: true, force: true });
  });

  it('exits 1 on NO-GO, 0 on GO and 2 on a bad folder', () => {
    assert.equal(spawnSync('node', [CLI, bad]).status, 1);
    assert.equal(spawnSync('node', [CLI, good]).status, 0);
    assert.equal(spawnSync('node', [CLI, '/no/such/folder']).status, 2);
    assert.equal(spawnSync('node', [CLI, '--nonsense']).status, 2);
  });

  it('strict mode blocks on SEV-3', () => {
    const root = project({ 'package.json': JSON.stringify({ name: 'x' }) });
    assert.equal(spawnSync('node', [CLI, root]).status, 0);
    assert.equal(spawnSync('node', [CLI, root, '--strict']).status, 1);
    rmSync(root, { recursive: true, force: true });
  });

  it('init adds the gate once and keeps existing content', () => {
    const root = project({ 'AGENTS.md': '# Mine\n' });
    spawnSync('node', [CLI, 'init', root]);
    spawnSync('node', [CLI, 'init', root]);
    const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
    assert.ok(agents.startsWith('# Mine'));
    assert.equal(agents.match(/Definition of done/g).length, 1);
    assert.match(readFileSync(join(root, '.github/workflows/sigship.yml'), 'utf8'), /npx --yes sigship@latest/);
    rmSync(root, { recursive: true, force: true });
  });

  it('works as an MCP server through a real client', async () => {
    const client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: 'node', args: [CLI, 'mcp'] }));
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['sigship_badge', 'sigship_check', 'sigship_explain']);
    assert.match(client.getInstructions(), /NO-GO/);

    const res = await client.callTool({ name: 'sigship_check', arguments: { path: bad } });
    const body = res.structuredContent;
    assert.equal(body.verdict, 'NO-GO');
    assert.equal(res.content[0].text, body.summary);
    assert.equal(body.findings.length, RULES.length, 'one group per check, and every check fires on the bad project');
    assert.ok(body.findings.every((f) => f.count >= 1 && f.where.length >= 1));
    assert.ok(!JSON.stringify(body).includes(FAKE_OPENAI));

    const explain = await client.callTool({ name: 'sigship_explain', arguments: { id: 'rls-missing' } });
    assert.equal(JSON.parse(explain.content[0].text).severity, 1);

    const missing = await client.callTool({ name: 'sigship_check', arguments: { path: '/no/such/folder' } });
    assert.equal(missing.isError, true);
    await client.close();
  });
});
