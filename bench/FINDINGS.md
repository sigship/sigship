# What the planted cases revealed

`npm run bench` on version 0.3.2 over 704 planted cases gives 82.5% precision and 78.8% recall overall. Every miss and false alarm below was planted on purpose to probe a specific edge, except two that turned up by accident (marked **unexpected**). Nothing here changes `src/rules.js`; these are proposals, each with the exact pattern, for the owner of that file. The 30 real repositories in `bench/real-results.json` are quoted only as counts.

Scores per check at the time of writing:

| check | precision | recall | false alarms | missed |
|---|---|---|---|---|
| secret-in-code | 90.9% | 83.3% | 2 | 4 |
| env-file-committed | 70.8% | 85.0% | 7 | 3 |
| public-env-secret | 81.8% | 85.7% | 4 | 3 |
| ai-key-in-browser | 84.2% | 80.0% | 3 | 4 |
| rls-missing | 94.7% | 90.0% | 1 | 2 |
| rls-open-write | 94.4% | 85.0% | 1 | 3 |
| stripe-webhook-unverified | 65.2% | 75.0% | 8 | 5 |
| sql-string-concat | 88.2% | 75.0% | 2 | 5 |
| ai-route-no-rate-limit | 81.3% | 65.0% | 3 | 7 |
| role-in-local-storage | 94.1% | 76.2% | 1 | 5 |
| unsanitized-html | 71.4% | 71.4% | 6 | 6 |
| cors-wildcard | 82.4% | 66.7% | 3 | 7 |
| secret-in-logs | 72.2% | 61.9% | 5 | 8 |
| no-error-boundary | 81.8% | 85.7% | 4 | 3 |
| no-error-tracking | 75.0% | 100.0% | 7 | 0 |
| no-tests | 100.0% | 59.1% | 0 | 9 |
| no-lockfile | 90.5% | 95.0% | 2 | 1 |

## Themes across checks

1. **Comments count as code.** Six checks fire on, or are silenced by, text inside a comment: a commented-out `create table`, a commented-out open policy, a `constructEvent` call in a TODO, `rate limiting` in a TODO, `sanitize` in a TODO, `componentDidCatch` in a comment. One shared helper that strips `//`, `/* */`, `#` and `--` comments before matching (keeping line numbers) would fix all six at once. It should only strip comments for the *suppression* regexes and the positive matches; `secret-in-code` must keep scanning comments, because a key in a comment is still a leak.
2. **Presence of a word anywhere in the project switches a check off.** `ai-route-no-rate-limit` and `unsanitized-html` are silenced by a dependency or a word that is not actually applied to the route or the value. These are the two checks most likely to say GO when they should not.
3. **Only the first spelling of each risk is covered.** Vue `v-html`, Svelte `@html`, Python f-strings, `sessionStorage`, `console.error`, `cors()` with no options and `allow_origins=["*"]` are the most common AI-tool outputs the checks do not see.
4. **The four project-level checks are the noisiest on real repos.** On the 30 real repos, `no-error-tracking` fired on 26, `no-error-boundary` on 19 and `no-tests` on 17. Those are probably right most of the time, but the 7 false alarms on `no-error-tracking` here are all real products (New Relic, Honeybadger, AppSignal, Elastic APM, Application Insights, toucan-js, a Sentry loader script tag).

## secret-in-code

Missed (4):
- `whsec_` Stripe signing secrets, `AIza` Google API keys, `xoxb-` Slack bot tokens and `sb_secret_` Supabase keys have no pattern. Proposed additions to `SECRET_PATTERNS`:
  - `['a Stripe webhook signing secret', /\bwhsec_[A-Za-z0-9]{24,}/]`
  - `['a Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/]` (server-side only; a Maps key in a component is restricted by referrer, so consider reporting it at SEV-3 or only outside `CODE` files in client folders)
  - `['a Slack token', /\bxox[bpa]-[0-9]{10,}-[0-9A-Za-z-]{20,}/]`
  - `['a Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}/]`

False alarms (2):
- `sk-xxxxxxxx…` placeholders. Proposed: skip a match whose body, after the prefix, is one repeated character or matches `/^(x+|0+|\.+|your|changeme|replace)/i`.
- `AKIAIOSFODNN7EXAMPLE`, the key id used throughout the AWS documentation. Proposed: an allowlist of documented placeholders (`AKIAIOSFODNN7EXAMPLE`, `AKIAI44QH8DHBEXAMPLE`).

## env-file-committed

Missed (3):
- `.gitignore` containing `.env.*` does not ignore `.env`, but `ignoresEnv` in `src/scan.js` accepts it: `/^\s*\/?\.env(\*|\.\*)?\s*$/`. Proposed: `/^\s*\/?\.env(\*)?\s*$|^\s*\*\.env\s*$/` and treat `.env.*` as covering only files with a suffix.
- `REDIS_URL` and `MONGODB_URI` carrying `user:password@`. Proposed: a second line pattern for any variable whose value matches `/^[a-z+]+:\/\/[^\s:@]+:[^\s@]{4,}@/i`.

False alarms (7, one **unexpected**):
- **Unexpected:** empty values. `secretLine` ends in `\s*=\s*['"]?[^\s'"#]{8,}` and `\s*` after `=` crosses the line end, so `OPENAI_API_KEY=` followed by `STRIPE_SECRET_KEY=` on the next line matches with the next variable's *name* as the value. Proposed: `[ \t]*=[ \t]*` instead of `\s*=\s*`. This is the most common shape of a committed template.
- `${OTHER_VAR}` references. Proposed: add `^\$\{` and `^\$[A-Z_]+$` to `placeholder`.
- `DATABASE_URL="file:./dev.db"` (the Prisma SQLite default). Proposed: add `file:` to `placeholder`.
- `SESSION_TOKEN_TTL=86400000`, `API_KEY_HEADER=x-api-key`. Proposed: skip values that are all digits, and names ending in `_TTL`, `_HEADER`, `_NAME`, `_URL_PATH`, `_MIN_LENGTH`, `_EXPIRY`, `_TIMEOUT`.
- `.env.test` with dummy CI values. Proposed: treat `.env.test` and `.env.ci` like `.env.example` when every value contains `test`, `dummy` or `fake`, or drop them from the file filter.
- `*.env` in `.gitignore` does ignore `.env`. Covered by the `ignoresEnv` change above.

## public-env-secret

Missed (3): `VITE_GEMINI_API_KEY`, `NEXT_PUBLIC_RESEND_API_KEY`, `NEXT_PUBLIC_GROQ_API_KEY`. The provider list is `(?:OPENAI|ANTHROPIC)`. Proposed: `(?:OPENAI|ANTHROPIC|GEMINI|GOOGLE_AI|GROQ|MISTRAL|COHERE|RESEND|SENDGRID|TWILIO|STRIPE_SECRET)[A-Z0-9_]*(?:KEY|TOKEN)`. Anything named `*_API_KEY` under a public prefix is worth at least a SEV-2 unless it is on a known-public list (`MAPS`, `RECAPTCHA`, `TURNSTILE`, `POSTHOG`, `SENTRY`, `ANON`, `PUBLISHABLE`, `SITE`).

False alarms (4): `NEXT_PUBLIC_PASSWORD_MIN_LENGTH`, `VITE_ENABLE_PRIVATE_BETA`, `NEXT_PUBLIC_PASSWORD_RESET_URL`, `NEXT_PUBLIC_OPENAI_TOKEN_LIMIT`. Proposed: require the sensitive word to be the last word or followed only by `_KEY`/`_TOKEN`, and skip names ending in `_LENGTH`, `_LIMIT`, `_URL`, `_PATH`, `_BETA`, `_ENABLED`, `_MODE`, `_FLAG`.

## ai-key-in-browser

Missed (4):
- The flag set from an expression: `typeof window !== 'undefined'` or a constant. Proposed: flag any `dangerouslyAllowBrowser\s*:\s*(?!false\b)` in a file under `src/`, `components/`, `app/` that is not a route, at SEV-2 when the value is not the literal `true`.
- A raw `fetch` to `api.openai.com` or `api.anthropic.com` in a file that also reads a `VITE_`/`NEXT_PUBLIC_`/`REACT_APP_`/`EXPO_PUBLIC_` variable, or sends `anthropic-dangerous-direct-browser-access`. Proposed: `/api\.(openai|anthropic)\.com/` together with `/\b(?:VITE|NEXT_PUBLIC|REACT_APP|EXPO_PUBLIC)_\w+/` in a non-server file, or the header name on its own.

False alarms (3): the flag inside a `//` comment, a README and a CHANGELOG. Proposed: strip comments (theme 1) and limit this check to `CODE` files, since the flag only matters in code. `README.md` files are not under `NOT_SHIPPED` today.

## rls-missing

Missed (2): `disable row level security` after `enable`; a commented-out `enable`. Proposed: build `enabled` from the *last* enable/disable statement per table, and strip `--` comments first.

False alarm (1): `create table` inside a `--` comment. Same comment stripping.

## rls-open-write

Missed (3): `using (1=1)`, `with check ((true))`, and a policy inside a TypeScript template string. Proposed: `/(using|with\s+check)\s*\(+\s*(?:true|1\s*=\s*1)\s*\)+/i`, and also scan `sql\`…\`` template literals in `.ts`/`.js` files for `create policy`.

False alarm (1): commented-out policy. Comment stripping.

## stripe-webhook-unverified

This is the least precise check (65.2%) because it is file-scoped: any file holding a Stripe event name without `constructEvent` in the same file fires.

False alarms (8): verification in an imported helper (very common), a handler module with the switch, a type union, a NestJS decorator from `@golevelup/nestjs-stripe`, a setup script calling `webhookEndpoints.create`, a billing-history page labelling events, an analytics call and a client `CustomEvent`. Proposed, in order of value:
1. Only consider files that *parse a request body*: require one of `req\.json\(|req\.body|request\.json\(|JSON\.parse\(|await c\.req\.json|@Body\(` in the file.
2. Treat the project as verified when any non-test file contains `constructEvent(Async)?\(|construct_event\(` **and** the file under inspection imports from that file or from `@/lib`, or simply when the project has one at all (trades a little recall for a lot of precision).
3. Skip files under `scripts/`, `types/`, `components/`, `pages/` that are not `pages/api/`, and `.tsx` files.
4. Treat `@golevelup/nestjs-stripe`, `stripe-event-types` and `@stripe/stripe-webhook` style dependencies as verification.

Missed (5): verification only in a comment; a `try/catch` that falls back to `JSON.parse(raw)`; `invoice.payment_failed`, `charge.succeeded`, `checkout.session.async_payment_succeeded`. Proposed: strip comments; flag `constructEvent` wrapped in a `catch` block that also contains `JSON.parse`; extend `events` to `/['"\`](?:checkout\.session\.(?:completed|async_payment_\w+)|customer\.subscription\.\w+|invoice\.\w+|payment_intent\.\w+|charge\.\w+)['"\`]/`.

## sql-string-concat

Missed (5), all common:
- A value destructured from `req.params` on the previous line and then interpolated (`${id}`). Proposed: within the same function, remember identifiers assigned from `req.`, `request.`, `params`, `body`, `searchParams.get(`, `formData.get(`, then flag `${name}` for those names. A cheap approximation: flag any `${identifier}` inside a query template when the file contains `identifier\s*=\s*(?:req|request)\.` or `\{\s*…identifier…\s*\}\s*=\s*(?:req|request)\.(?:params|query|body)`.
- `"… WHERE id = " + req.params.id`. Proposed: `/\.(?:query|execute|raw)\s*\(\s*['"][^'"]*['"]\s*\+\s*(?:req|request|params|body)\b/`.
- Python `cursor.execute(f"… {x} …")` and `"…" % x`. Proposed: `/\.execute\(\s*f["'][^"']*\{/` and `/\.execute\(\s*["'][^"']*["']\s*%/`.
- `sql.unsafe(\`…${q}\`)` from postgres.js. Proposed: add `unsafe` to the method list.
- `LIKE '%${q}%'`: the quoted form `'\$\{` does not match because `%` sits between the quote and `${`. Proposed: `'%?\$\{`.

False alarms (2): `${req.user.id}` (set by auth middleware, not user input) and an example in a comment. Proposed: exclude `req\.user\b|request\.user\b|req\.auth\b|ctx\.state\.user\b` from `userInput`; strip comments.

## ai-route-no-rate-limit

The lowest recall (65%) because the check gives up as soon as it sees a limiter anywhere.

Missed (7):
- The words `rate limiting` in a TODO comment silence the whole project. Strip comments.
- `express-rate-limit` installed but not applied; `@upstash/redis` (not `@upstash/ratelimit`) installed for caching; `lodash` `throttle` used for a debounce in another server file. Proposed: drop `upstash` from the dependency regex (match `@upstash/ratelimit` exactly), drop `throttle` (or require `throttle(` next to `req`/`ip`/`user`), and when a limiter dependency exists still require its import in the AI route's file or in a middleware file (`middleware.ts`, `server/index.*`, `app.use(`).
- `src/server.ts` and `src/index.ts` as Express entry points are not `SERVER_PATH`. Proposed: add `(^|\/)(server|index|app|main)\.(c|m)?(j|t)s$` when the file contains `express\(\)|new Hono\(|fastify\(`.
- The AI call lives in `lib/ai.ts` and the route only imports it. Proposed: when a non-server file makes the call, flag the server file that imports it (follow `from '@/lib/ai'` and relative imports one level).
- Vercel AI SDK `streamText(`/`generateText(`/`generateObject(` with `@ai-sdk/*`. Proposed: add `\b(?:streamText|generateText|generateObject|streamObject)\s*\(` to `calls`. On the 30 real repos this is probably why `ai-route-no-rate-limit` fired on only 3 even though far more call AI APIs.

False alarms (3): a limiter in Next.js `middleware.ts` (not under `SERVER_PATH`), a per-user quota check, Arcjet. Proposed: include root `middleware.(t|j)s` in the files searched for the limiter; add `quota|429|Too Many Requests|arcjet|tokenBucket` to `limiter`.

## role-in-local-storage

Missed (5): a role inside a stored `user` object (`JSON.parse(localStorage.getItem('user')).role`), `sessionStorage`, bracket access (`localStorage['isAdmin']`), `Cookies.get('role')`, a `permissions` array. Proposed: `/(?:localStorage|sessionStorage)(?:\.(?:get|set)Item\(\s*|\[\s*)['"\`](?:isAdmin|is_admin|admin|role|userRole|user_role|permissions|isSuperuser)['"\`]/` plus `/(?:localStorage|sessionStorage)\.getItem\([^)]*\)[^;\n]*\)\s*\.(?:role|isAdmin|is_admin)\b/` for the parsed-object form, and `Cookies\.get\(\s*['"](?:role|isAdmin)['"]`.

False alarm (1): comment. Strip comments.

## unsanitized-html

Missed (6): `sanitize` in a TODO comment or in an unrelated function name silences the file; Vue `v-html="…"`; Svelte `{@html …}`; `el.innerHTML = value`; `insertAdjacentHTML(…, value)`. Proposed: require the sanitiser to appear *inside* the `__html:` expression or as an import (`from ['"](?:dompurify|isomorphic-dompurify|sanitize-html|xss)['"]`), not anywhere in the file; add `v-html="(?!['"])` (Vue), `\{@html\s+(?![`'"])` (Svelte), `\.innerHTML\s*=\s*(?![`'"])` and `insertAdjacentHTML\([^,]+,\s*(?![`'"])` for the DOM forms, each with the same literal/constant exclusions.

False alarms (6): `xss(…)` library, a cleaner imported from `@/lib/html`, a bundled SVG, a CSS string, `renderToString(<Comp/>)`, and shiki output. Proposed: add `xss\(|clean\(|purify|escape\(|highlight|codeToHtml|renderToString\(|\.svg(\?raw)?['"]` to the safe list, and treat an imported identifier as safe when the import path contains `sanitize|purify|html|clean`.

## cors-wildcard

Missed (7, one **unexpected**):
- **Unexpected:** Flask `response.headers['Access-Control-Allow-Origin'] = '*'`. The regex needs `:` or `,` after the header name; Python uses `] =`. Proposed: `Access-Control-Allow-Origin['"\]]*\s*[:,=]\s*['"]\*['"]`.
- `cors()` with no options defaults to `*`. Proposed: `\bcors\(\s*\)`.
- `cors({ origin: true })` reflects every origin, which is worse than `*` with credentials. Proposed: `cors\(\s*\{[^}]*origin\s*:\s*true\b`.
- The request origin reflected back (`req.headers.get('origin')`, `req.headers.origin`). Proposed: `Access-Control-Allow-Origin['"]?\s*[:,]\s*(?:req|request|c\.req)\.headers`.
- `next.config.js` `{ key: 'Access-Control-Allow-Origin', value: '*' }`. Proposed: `key\s*:\s*['"]Access-Control-Allow-Origin['"]\s*,\s*value\s*:\s*['"]\*['"]`.
- FastAPI `allow_origins=["*"]`. Proposed: `allow_origins\s*=\s*\[\s*['"]\*['"]`.
- `vercel.json` / `netlify.toml` / `_headers` headers. Proposed: scan those config files for the same `key`/`value` pair.
On the 30 real repos this check made 44 findings in 7 repos; most are the Supabase edge-function template header, which is a true wildcard.

False alarms (3): a comment, the header sent from a browser-side `fetch` (meaningless there), a public read-only badge endpoint. Proposed: strip comments; skip files that only call `fetch(` and never create a `Response`/`res.`; for the public-endpoint case there is no safe rule, so leave it at SEV-3 as now.

## secret-in-logs

The lowest recall (61.9%).

Missed (8):
- `console.error` and `console.warn` are not in the list; error logs are the ones shipped to a tracker. Proposed: `console\.(?:log|info|debug|warn|error)\(`.
- `access_token`, `OPENAI_API_KEY`, `stripeSecretKey`: `\btoken\b` cannot see a word joined by `_` or camel case. Proposed: `/(?:^|[^a-z])(?:password|passwd|token|secret|apiKey|api_key|access_token|refresh_token|private_key|credentials?)(?:$|[^a-z])/i` applied to the argument text with `_` treated as a boundary: replace `_` with a space before testing.
- `console.log(process.env)` and `console.log(req.body)` on a login route. Proposed: `\bprocess\.env\s*[,)]` always; `req\.body|request\.body` when the file contains `password`.
- Python `print(password)`. Proposed: `print\(([^\n]*)\)` with the same word test for `.py` files.
- `logger.info({ token })` with pino or winston. Proposed: `(?:logger|log|console)\.(?:log|info|debug|warn|error)\(`.

False alarms (5): a template literal holding the word `Token` as prose, `password.length`, `maskToken(token)`, `token.slice(0, 4)`, `token ? 'has token' : 'no token'`. Proposed: strip template text outside `${…}` before testing; skip when the sensitive word is followed by `.length`, `.slice(`, `.substring(`, `?` or `!==`/`===`, or wrapped in `mask|redact|hash|Boolean\(|!!`.

## no-error-boundary

Missed (3): a page named `error.tsx` in a Vite app (the path test accepts any `error.tsx`); `ErrorBoundary` in a README; `componentDidCatch` in a comment. Proposed: only accept `error.tsx` under `app/` or `src/app/` (Next.js) and otherwise require the text test; run the text test only on `CODE` files with comments stripped.

False alarms (4): React Router `errorElement`, TanStack Router `errorComponent`, a component library with React only in `devDependencies`, and `pages/_error.tsx`. Proposed: add `errorElement|errorComponent|ErrorComponent` to the text test; accept `pages/_error.(t|j)sx`; skip when `react` is only in `devDependencies` and `peerDependencies` lists it (a library, not an app).

## no-error-tracking

False alarms (7): New Relic (`newrelic`), Honeybadger (`@honeybadger-io/js`), AppSignal, Elastic APM, Application Insights, `toucan-js` (Sentry for Workers), and a Sentry loader `<script>` with no npm package. Proposed dependency regex: `/sentry|bugsnag|rollbar|highlight|logrocket|datadog|posthog|newrelic|honeybadger|appsignal|elastic-apm|applicationinsights|toucan|raygun|faro|openreplay/i`, and also accept `sentry-cdn\.com|browser\.sentry|js\.sentry` in an `index.html`. On the 30 real repos this check fired on 26, the most of any check; some of those will be these products.

## no-tests

Recall 59.1%: the check trusts any `test` script that is not npm's default, and any folder named `tests`, `e2e` or `__tests__`.

Missed (9): `"test": "echo ok"`, `"exit 0"`, `"true"`, `"npm run lint"`; `vitest`/`jest` scripts with zero test files; `tests/` holding only a README; `e2e/` holding only a config; a spec file whose only tests are `.skip`/`.todo`. Proposed:
- Treat the script as real only when it names a runner: `/vitest|jest|mocha|node\s+--test|playwright|cypress|ava|tap|uvu|bun\s+test|deno\s+test|pytest|jasmine|karma/`.
- Count test *files* (`\.(test|spec)\.[a-z]+$` or `.py` files named `test_*`) rather than folders; a folder named `tests` with no such file does not count.
- When test files exist but every `it(`/`test(` in them is `.skip`/`.todo`, report it with a softer detail.

## no-lockfile

Missed (1): a lockfile only in `frontend/` while the root `package.json` has dependencies of its own. Proposed: require the lockfile next to each `package.json` that has `dependencies`, or at least next to the root one.

False alarms (2): `npm-shrinkwrap.json` and `deno.lock`. Proposed: `(^|\/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|deno\.lock)$`.

## Where to look first

By expected impact on a real GO/NO-GO answer:

1. `env-file-committed`: the empty-value regex bug (one-character fix, removes the most common false alarm on templates).
2. Comment stripping shared by six checks.
3. `stripe-webhook-unverified`: require a request body parse in the file.
4. `ai-route-no-rate-limit`: Vercel AI SDK calls, and do not let a stray word switch the check off.
5. `secret-in-logs`: `console.error`, and `_` as a word boundary.
6. `no-tests`: count files, not folders, and require a real runner in the script.
