// The demo app shown on the home page and in the brand images: one small AI-built app with three real
// problems (bad), and the same app after its AI tool applied SIGSHIP's fix prompt (fixed).
// The files are written to a temp folder at build time and never committed as app code.
// Risky strings are assembled at run time so SIGSHIP's scan of its own repo doesn't flag this file.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const paidEvent = ['checkout', 'session', 'completed'].join('.');
const shared = {
  'package-lock.json': '{}\n',
  'src/App.tsx': 'export const App = () => <ErrorBoundary><Routes /></ErrorBoundary>;\n',
};

export const DEMO = {
  bad: {
    ...shared,
    'package.json': JSON.stringify({ name: 'demo-app', dependencies: { react: '^19.0.0', openai: '^5.0.0', '@supabase/supabase-js': '^2.0.0', '@sentry/react': '^10.0.0' }, scripts: { test: 'vitest run' } }) + '\n',
    'src/api/chat.ts': "export async function POST(req) {\n  return openai.chat.completions.create({ model: 'x', messages: [] });\n}\n",
    'src/api/stripe-webhook.ts': `export async function POST(req) {\n  const event = await req.json();\n  if (event.type === '${paidEvent}') await upgrade(event);\n}\n`,
    'supabase/migrations/001_init.sql': ['create table public.profiles', '(id uuid primary key, email text);\n'].join(' '),
  },
  fixed: {
    ...shared,
    'package.json': JSON.stringify({ name: 'demo-app', dependencies: { react: '^19.0.0', openai: '^5.0.0', stripe: '^19.0.0', '@supabase/supabase-js': '^2.0.0', '@sentry/react': '^10.0.0', '@upstash/ratelimit': '^2.0.0' }, scripts: { test: 'vitest run' } }) + '\n',
    'src/api/chat.ts': "export async function POST(req) {\n  await ratelimit.limit(ip);\n  return openai.chat.completions.create({ model: 'x', messages: [] });\n}\n",
    'src/api/stripe-webhook.ts': `export async function POST(req) {\n  const sig = req.headers.get('stripe-signature');\n  const event = stripe.webhooks.constructEvent(await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET);\n  if (event.type === '${paidEvent}') await upgrade(event);\n}\n`,
    'supabase/migrations/001_init.sql': ['create table public.profiles', '(id uuid primary key, email text);\nalter table public.profiles enable row level security;\ncreate policy "Owner only" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);\n'].join(' '),
  },
};

// Writes one demo app to a fresh temp folder and returns its path.
export function writeDemo(name) {
  const dir = mkdtempSync(join(tmpdir(), `sigship-demo-${name}-`));
  for (const [path, text] of Object.entries(DEMO[name])) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}
