// Every SIGSHIP check lives here. A check is plain data plus one small function.
// Checks only read files. They never call the network and never print a secret.

const CODE = /\.(c|m)?(j|t)sx?$|\.vue$|\.svelte$|\.astro$|\.py$/;
const SERVER_PATH = /(^|\/)(api|server|functions|edge|backend|routes)(\/|$)|route\.(t|j)s$|\.server\.(t|j)sx?$/;
// Tests, samples and docs are not what ships, so the code checks skip them.
const NOT_SHIPPED = /(\.example|\.sample|\.template|\.dist)$|(^|\/)(examples?|samples?|fixtures?|mocks?|tests?|e2e|spec|__tests__|__mocks__|docs?|demo)(\/|$)|\.(test|spec|stories)\.[a-z]+$/i;

const WEB_FRAMEWORK = /^(react|next|vue|nuxt|svelte|@sveltejs\/kit|express|fastify|hono|@nestjs\/core|astro)$/;

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function findAll(file, regex) {
  const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
  return [...file.text.matchAll(new RegExp(regex.source, flags))].map((m) => ({
    file: file.path,
    line: lineOf(file.text, m.index),
    match: m,
  }));
}

function isServiceRoleKey(token) {
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    // supabase-demo marks the public default key that every local Supabase install shares.
    return claims.role === 'service_role' && claims.iss !== 'supabase-demo';
  } catch {
    return false;
  }
}

const SECRET_PATTERNS = [
  ['an Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{32,}/],
  ['an OpenAI API key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/],
  ['a live Stripe secret key', /\b[sr]k_live_[0-9A-Za-z]{20,}/],
  ['an AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['a GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}/],
];

const tableName = (raw) => raw.replace(/"/g, '').replace(/^public\./i, '').toLowerCase();

export const RULES = [
  {
    id: 'secret-in-code',
    severity: 1,
    title: 'A live secret is sitting in your code',
    forecast: 'Someone reads it from your repo or your JavaScript bundle, and the bill or the data breach arrives before you do.',
    fix: 'Rotate this key now, because it is already exposed. Move it to a server-side environment variable, read it only from server code, and remove it from the code.',
    run({ files }) {
      const out = [];
      for (const f of files) {
        if (NOT_SHIPPED.test(f.path) || /\.md$/i.test(f.path)) continue;
        for (const [label, regex] of SECRET_PATTERNS) {
          for (const hit of findAll(f, regex)) {
            out.push({ file: hit.file, line: hit.line, detail: `Looks like ${label}. Value hidden.` });
          }
        }
        for (const hit of findAll(f, /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/)) {
          if (isServiceRoleKey(hit.match[0])) {
            out.push({ file: hit.file, line: hit.line, detail: 'A Supabase service_role key. It bypasses row level security. Value hidden.' });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'env-file-committed',
    severity: 1,
    title: 'Your .env file is committed',
    forecast: 'Every secret in that file is now in your git history, including every fork and clone of it.',
    fix: 'Add .env to .gitignore, run git rm --cached on the file, and rotate every value it contained. Deleting the file later does not remove it from history.',
    run({ tracked, files }) {
      const secretLine = /^\s*(?!#)(?:export\s+)?(?!NEXT_PUBLIC_|VITE_|REACT_APP_|EXPO_PUBLIC_)\w*(?:SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE|API_?KEY|SERVICE_ROLE|DATABASE_URL)\w*\s*=\s*['"]?[^\s'"#]{8,}/im;
      const placeholder = /=\s*['"]?(?:your|change|replace|xxx|placeholder|example|<)|localhost|127\.0\.0\.1/i;
      return files
        .filter((f) => tracked.includes(f.path) && /(^|\/)\.env(\.[a-z]+)?$/i.test(f.path) && !NOT_SHIPPED.test(f.path))
        .flatMap((f) => findAll(f, new RegExp(secretLine.source, 'im')).filter((h) => !placeholder.test(h.match[0])).slice(0, 1))
        .map((h) => ({ file: h.file, line: h.line, detail: 'This file is tracked by git and holds a secret.' }));
    },
  },
  {
    id: 'public-env-secret',
    severity: 1,
    title: 'A server secret has a browser-visible name',
    forecast: 'Your build tool copies it into the JavaScript every visitor downloads, where anyone can read it.',
    fix: 'Rename this variable without the public prefix, and move the call that needs it into a server route or edge function.',
    run({ files }) {
      const regex = /\b(?:VITE|NEXT_PUBLIC|REACT_APP|EXPO_PUBLIC)_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|(?:OPENAI|ANTHROPIC)[A-Z0-9_]*(?:KEY|TOKEN))[A-Z0-9_]*\b/;
      return files
        .filter((f) => !NOT_SHIPPED.test(f.path) && (CODE.test(f.path) || /(^|\/)\.env/.test(f.path)))
        .flatMap((f) => findAll(f, regex))
        .map((h) => ({ file: h.file, line: h.line, detail: `${h.match[0]} is exposed to the browser.` }));
    },
  },
  {
    id: 'ai-key-in-browser',
    severity: 1,
    title: 'Your AI key runs in the browser',
    forecast: 'A stranger copies your key from the network tab and spends your credit on their own project.',
    fix: 'Remove dangerouslyAllowBrowser. Create a server route that holds the key, checks who is asking, and calls the AI provider for the browser.',
    run({ files }) {
      return files
        .filter((f) => !NOT_SHIPPED.test(f.path))
        .flatMap((f) => findAll(f, /dangerouslyAllowBrowser\s*:\s*true/))
        .map((h) => ({ file: h.file, line: h.line, detail: 'The SDK is told to run in the browser with your key.' }));
    },
  },
  {
    id: 'rls-missing',
    severity: 1,
    title: 'A database table has no row level security',
    forecast: 'Anyone with your public Supabase key can read this table. That key ships in your JavaScript.',
    fix: 'Add "alter table <name> enable row level security;" in a new migration, then write a policy that limits each row to its owner.',
    run({ sql: allSql, usesSupabase }) {
      if (!usesSupabase) return [];
      const out = [];
      const sql = allSql.filter((f) => !NOT_SHIPPED.test(f.path));
      const all = sql.map((f) => f.text).join('\n');
      const enabled = new Set(
        [...all.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)\s+enable\s+row\s+level\s+security/gi)].map((m) => tableName(m[1])),
      );
      for (const f of sql) {
        for (const hit of findAll(f, /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/i)) {
          const raw = hit.match[1].replace(/"/g, '').toLowerCase();
          if (raw.includes('.') && !raw.startsWith('public.')) continue;
          const name = tableName(hit.match[1]);
          if (!enabled.has(name)) out.push({ file: hit.file, line: hit.line, detail: `Table ${name} is created without row level security.` });
        }
      }
      return out;
    },
  },
  {
    id: 'rls-open-write',
    severity: 1,
    title: 'A database policy lets anyone write',
    forecast: 'Row level security is on, but this policy says yes to everyone, so a stranger can edit or delete your data.',
    fix: 'Replace true with a real condition, such as auth.uid() = user_id, on both the using and with check clauses.',
    run({ sql, usesSupabase }) {
      if (!usesSupabase) return [];
      const out = [];
      for (const f of sql.filter((file) => !NOT_SHIPPED.test(file.path))) {
        for (const hit of findAll(f, /create\s+policy[\s\S]*?;/i)) {
          const stmt = hit.match[0];
          const isRead = /\bfor\s+select\b/i.test(stmt);
          const open = /(using|with\s+check)\s*\(\s*true\s*\)/i.test(stmt);
          const staffOnly = /\bto\s+service_role\b/i.test(stmt);
          if (open && !isRead && !staffOnly) out.push({ file: hit.file, line: hit.line, detail: 'This write policy has a condition of true.' });
        }
      }
      return out;
    },
  },
  {
    id: 'stripe-webhook-unverified',
    severity: 1,
    title: 'Your Stripe webhook accepts anything',
    forecast: 'Someone posts a fake "payment succeeded" event to your endpoint and gets your paid plan for free.',
    fix: "Verify every event with stripe.webhooks.constructEvent, using the raw request body and your webhook signing secret, before you act on it.",
    run({ files }) {
      const events = /['"`](?:checkout\.session\.completed|customer\.subscription\.(?:created|updated|deleted)|invoice\.(?:paid|payment_succeeded)|payment_intent\.succeeded)['"`]/;
      return files
        .filter((f) => CODE.test(f.path) && !NOT_SHIPPED.test(f.path) && events.test(f.text) && !/constructEvent(?:Async)?\s*\(|verify_webhook|Webhook\.construct_event/.test(f.text))
        .map((f) => {
          const hit = findAll(f, events)[0];
          return { file: f.path, line: hit.line, detail: 'Handles Stripe events with no signature check in this file.' };
        });
    },
  },
  {
    id: 'sql-string-concat',
    severity: 1,
    title: 'User input may be pasted into a SQL query',
    forecast: 'Someone types a crafted value into a form and your database runs it as a command.',
    fix: 'Use a parameterised query. Pass values as parameters and never build SQL with template strings.',
    run({ files }) {
      const query = /\.(?:query|execute|raw|\$queryRawUnsafe|\$executeRawUnsafe)\s*\(\s*`([^`]*)`/;
      const userInput = /'\$\{|\$\{\s*(?:req|request|ctx\.request|params|body|searchParams|formData|input|args)\b/;
      return files
        .filter((f) => CODE.test(f.path) && !NOT_SHIPPED.test(f.path))
        .flatMap((f) => findAll(f, query))
        .filter((h) => userInput.test(h.match[1]))
        .map((h) => ({ file: h.file, line: h.line, detail: 'User input is placed directly inside a query.' }));
    },
  },
  {
    id: 'ai-route-no-rate-limit',
    severity: 2,
    title: 'Your AI route has no spending brake',
    forecast: 'One script loops on this endpoint overnight and you wake up to the invoice.',
    fix: 'Add a per-user and per-IP rate limit in front of this route, plus a monthly spending cap in your AI provider dashboard.',
    run({ files, deps }) {
      const limiter = /rate.?limit|ratelimit|throttle|upstash|slowapi/i;
      if (Object.keys(deps).some((d) => limiter.test(d))) return [];
      const server = files.filter((f) => SERVER_PATH.test(f.path) && !NOT_SHIPPED.test(f.path));
      if (server.some((f) => limiter.test(f.text))) return [];
      const calls = /chat\.completions\.create|messages\.create\(|responses\.create\(|api\.openai\.com|api\.anthropic\.com|generateContent\(/;
      return server.filter((f) => calls.test(f.text)).map((f) => ({
        file: f.path,
        line: findAll(f, calls)[0].line,
        detail: 'This route calls a paid AI API and the project has no rate limiter.',
      }));
    },
  },
  {
    id: 'role-in-local-storage',
    severity: 2,
    title: 'Admin access is decided in the browser',
    forecast: 'Someone opens dev tools, changes one value, and becomes an admin.',
    fix: 'Store roles in the database and check them on the server for every protected action. Treat anything in the browser as user input.',
    run({ files }) {
      const regex = /localStorage\.(?:get|set)Item\(\s*['"`](?:isAdmin|is_admin|admin|role|userRole|user_role)['"`]/;
      return files
        .filter((f) => CODE.test(f.path) && !NOT_SHIPPED.test(f.path))
        .flatMap((f) => findAll(f, regex))
        .map((h) => ({ file: h.file, line: h.line, detail: 'A role is read from or saved to localStorage.' }));
    },
  },
  {
    id: 'unsanitized-html',
    severity: 2,
    title: 'Raw HTML goes straight onto the page',
    forecast: 'A comment or profile field carries a script, and it runs in the browser of every visitor who sees it.',
    fix: 'Sanitise the value with DOMPurify before rendering it, or render it as plain text.',
    run({ files }) {
      return files
        .filter((f) => CODE.test(f.path) && !NOT_SHIPPED.test(f.path) && !/DOMPurify|sanitize/i.test(f.text))
        .flatMap((f) => findAll(f, /dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]*)\}\}/))
        .filter((h) => !/^\s*(?:[A-Z][A-Z0-9_]*|`[^`$]*`|'[^']*'|"[^"]*"|JSON\.stringify\()/.test(h.match[1]))
        .map((h) => ({ file: h.file, line: h.line, detail: 'No sanitiser is used in this file.' }));
    },
  },
  {
    id: 'cors-wildcard',
    severity: 3,
    title: 'Any website can call your API',
    forecast: 'Another site calls your endpoints from its own pages, and you never see it in your logs as a problem.',
    fix: 'Replace the wildcard with the exact origins of your app.',
    run({ files }) {
      const regex = /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]|cors\(\s*\{\s*origin\s*:\s*['"]\*['"]/;
      return files
        .filter((f) => CODE.test(f.path) && !NOT_SHIPPED.test(f.path))
        .flatMap((f) => findAll(f, regex))
        .map((h) => ({ file: h.file, line: h.line, detail: 'The allowed origin is *.' }));
    },
  },
  {
    id: 'secret-in-logs',
    severity: 3,
    title: 'A secret may be going to your logs',
    forecast: 'Passwords or tokens end up in a log service that more people can read than your database.',
    fix: 'Remove this log line, or log only that the action happened.',
    run({ files }) {
      const sensitive = /\b(?:password|passwd|token|secret|apiKey|api_key)\b/i;
      return files
        .filter((f) => CODE.test(f.path) && !NOT_SHIPPED.test(f.path))
        .flatMap((f) => findAll(f, /console\.(?:log|info|debug)\(([^\n]*)\)/))
        .filter((h) => sensitive.test(h.match[1].replace(/'[^']*'|"[^"]*"/g, '').replace(/`[^`$]*`/g, '')))
        .map((h) => ({ file: h.file, line: h.line, detail: 'A sensitive value appears in a log statement.' }));
    },
  },
  {
    id: 'no-error-boundary',
    severity: 3,
    title: 'One crash takes down the whole screen',
    forecast: 'A single bad record gives your users a white page, and nobody tells you.',
    fix: 'Add a React error boundary around your routes, or error.tsx in a Next.js app, with a friendly message and a retry.',
    run({ files, deps, paths }) {
      if (!deps.react) return [];
      const has = paths.some((p) => /(^|\/)(global-)?error\.(t|j)sx$/.test(p)) || files.some((f) => /ErrorBoundary|componentDidCatch/.test(f.text));
      return has ? [] : [{ file: 'package.json', line: 1, detail: 'No error boundary was found.' }];
    },
  },
  {
    id: 'no-error-tracking',
    severity: 3,
    title: 'You will hear about errors from your users',
    forecast: 'Your app fails for a week before someone is annoyed enough to email you.',
    fix: 'Add an error tracker such as Sentry on both the client and the server.',
    run({ deps, paths }) {
      if (!Object.keys(deps).some((d) => WEB_FRAMEWORK.test(d))) return [];
      const has = Object.keys(deps).some((d) => /sentry|bugsnag|rollbar|highlight|logrocket|datadog|posthog/i.test(d));
      return has ? [] : [{ file: 'package.json', line: 1, detail: 'No error tracking package was found.' }];
    },
  },
  {
    id: 'no-tests',
    severity: 3,
    title: 'Nothing checks that a change did not break login',
    forecast: 'A small fix goes live on Friday and signup is broken until Monday.',
    fix: 'Add one test for each money path: sign up, log in, and pay. Run them on every pull request.',
    run({ paths, pkg }) {
      if (!paths.includes('package.json')) return [];
      const hasFiles = paths.some((p) => /\.(test|spec)\.[a-z]+$|(^|\/)(tests?|e2e|__tests__)\//i.test(p));
      const script = pkg?.scripts?.test ?? '';
      const real = script && !/no test specified/i.test(script);
      return hasFiles || real ? [] : [{ file: 'package.json', line: 1, detail: 'No test files or test script were found.' }];
    },
  },
  {
    id: 'no-lockfile',
    severity: 3,
    title: 'Your deploys are not repeatable',
    forecast: 'A dependency updates itself on the next deploy and production breaks with no code change.',
    fix: 'Commit your lockfile: package-lock.json, pnpm-lock.yaml, yarn.lock or bun.lockb.',
    run({ paths }) {
      if (!paths.includes('package.json')) return [];
      const has = paths.some((p) => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(p));
      return has ? [] : [{ file: 'package.json', line: 1, detail: 'No lockfile was found.' }];
    },
  },
];

export const RULES_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]));
