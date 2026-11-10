<p align="center">
  <a href="https://sigship.dev"><img src="https://raw.githubusercontent.com/sigship/sigship/main/brand/sigship-logo.png" alt="SIGSHIP" width="320"></a>
</p>

<p align="center"><strong>The go/no-go check for AI-built apps.</strong><br>The postmortem, before the outage.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/sigship"><img src="https://img.shields.io/npm/v/sigship?color=123f9c&label=npm" alt="npm version"></a>
  <a href="https://github.com/sigship/sigship/actions/workflows/test.yml"><img src="https://img.shields.io/github/actions/workflow/status/sigship/sigship/test.yml?branch=main&label=tests" alt="Tests"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2e9e5b" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/runtime%20dependencies-0-f6c500" alt="Zero runtime dependencies">
</p>

---

SIGSHIP reads your repo on your own machine and lists what will break in production: leaked keys, open databases, unverified webhooks, AI routes with no spending brake. It exits `0` only when it finds nothing serious, which gives you and your coding agent a real test for done.

```bash
npx sigship
```

No signup, no telemetry, no runtime dependencies. The free tool never touches the network.

## Contents

- [What you get](#what-you-get)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Pull requests](#pull-requests)
- [Coding agents (MCP)](#coding-agents-mcp)
- [What it checks](#what-it-checks)
- [Privacy](#privacy)
- [Plans and licence keys](#sigship-cloud-and-licence-keys)
- [Limits](#limits)
- [Contributing and security](#contributing-and-security)

## What you get

```text
SIGSHIP read 6 files in 22 ms, ran 17 checks

Postmortem, written before the outage. Worst first.

SEV-1  Your Stripe webhook accepts anything
       src/api/stripe-webhook.ts:3  Handles Stripe events with no signature check in this file.
       Someone posts a fake "payment succeeded" event to your endpoint and
       gets your paid plan for free.

SEV-2  Your AI route has no spending brake
       src/api/chat.ts:2  This route calls a paid AI API and the project has no rate limiter.
       One script loops on this endpoint overnight and you wake up to the invoice.

NO-GO  1 SEV-1, 1 SEV-2, 0 SEV-3. Exit 1.
Paste the fixes into your AI tool: npx sigship --prompt
```

| Exit code | Meaning |
| --- | --- |
| `0` | **GO.** No SEV-1 or SEV-2 findings. |
| `1` | **NO-GO.** Something blocks launch. |
| `2` | SIGSHIP could not run, for example the folder does not exist. |

A GO means these checks found nothing that blocks launch. It does not prove the app is safe.

## Quick start

Requires Node.js 22 or later.

```bash
npx sigship                 # check the current folder
npx sigship path/to/app     # check another folder
npx sigship --prompt        # turn every fix into one prompt for your AI tool
npx sigship --prompt --tool lovable   # worded for Lovable, Cursor, Bolt, Claude Code, Replit or Windsurf
npx sigship --online        # also ask OSV about your packages (the one network call, only when you ask)
npx sigship ui              # open the same results as a dashboard in your browser
```

## Commands

| Command | What it does |
| --- | --- |
| `npx sigship [folder]` | Check a project and print the postmortem. |
| `npx sigship ui [folder]` | Open a local dashboard: verdict, findings, a copy-the-fix-prompt button and re-run. |
| `npx sigship init [folder]` | Add a pull request check and a definition of done to `AGENTS.md` and, when it exists, `CLAUDE.md`. With `--hook`, add a pre-commit hook too. |
| `npx sigship history [folder]` | Find secrets committed in the past, even ones a later commit removed. |
| `npx sigship hook [folder]` | What the pre-commit hook runs: the secret checks on the staged files only. |
| `npx sigship mcp` | Start the MCP server for coding agents. |

| Option | What it does |
| --- | --- |
| `--prompt` | Print the fixes as one prompt for your AI tool. |
| `--tool <name>` | Word the prompt for one tool: `lovable`, `cursor`, `bolt`, `claude`, `replit` or `windsurf`. |
| `--json` | Print the result as JSON. |
| `--markdown` | Print the result as Markdown, for pull request comments. |
| `--sarif` | Print the result as SARIF 2.1.0, for GitHub code scanning and other tools that read it. |
| `--online` | Also check for packages with known vulnerabilities through OSV. The one free check that uses the network, and only when you ask. See [Privacy](#privacy). |
| `--strict` | Also block on SEV-3 findings. |
| `--report` | Also write `sigship-report.html` for a client. Needs a licence key. |
| `--brand <name>`, `--logo <file>` | With `--report`, put your name and logo on the report instead of SIGSHIP's. |
| `--no-open` | With `ui`, print the dashboard link without opening a browser. |
| `--version`, `--help` | Print the version or the help. |

### Accepted risks

Sometimes a finding is real but you have decided to live with it for now. Put `sigship-accept.json` in the folder you check:

```json
[
  { "rule": "cors-wildcard", "file": "src/api/public.ts", "reason": "This endpoint is public by design.", "expires": "2026-12-31" }
]
```

`rule` is the check id, `file` is optional, and `expires` is a date. A matching finding is listed as an accepted risk and no longer counts for the verdict, which reads `GO with 1 accepted risk`. An expired or malformed entry is ignored with a warning, so the finding counts again. There is no flag, command or MCP tool that accepts a risk: only that file, which goes through code review like everything else.

### Secrets in git history

```bash
npx sigship history
```

A secret that was committed and later removed is still in every clone. This reads `git log -p` for up to 5,000 commits or 50 MB, runs the secret checks on every added line, and prints the commit and file of each secret, with whether a later commit removed it. It never prints the value. It is a separate command because it is slower than a scan.

### Pre-commit hook

```bash
npx sigship init --hook
```

Writes `.git/hooks/pre-commit`, or adds a line to `.husky/pre-commit` when your project uses Husky. The hook runs only the secret checks, only on the staged files, so it takes well under a second, and it blocks a commit that would add a secret.

The dashboard listens on `127.0.0.1` only, answers only the private link it prints, and serves findings, never file contents. Press Ctrl+C to stop it.

## Pull requests

```bash
npx sigship init
```

Adds `.github/workflows/sigship.yml`, which fails a pull request that brings back a SEV-1 or SEV-2 problem, and a definition of done in `AGENTS.md` (and in `CLAUDE.md`, when that file exists) that tells coding agents to run SIGSHIP before saying they are finished. It never overwrites an existing file.

For GitHub code scanning, run `npx sigship --sarif > sigship.sarif` in the workflow and upload it with `github/codeql-action/upload-sarif`. Each result carries a stable fingerprint, so a finding stays one alert across runs.

## Coding agents (MCP)

Claude Code:

```bash
claude mcp add sigship -- npx -y sigship mcp
```

Cursor, in `.cursor/mcp.json`:

```json
{ "mcpServers": { "sigship": { "command": "npx", "args": ["-y", "sigship", "mcp"] } } }
```

The agent gets two tools, `sigship_check` and `sigship_explain`, and one instruction: don't say it's done while the verdict is NO-GO. SIGSHIP is listed in the MCP Registry as `io.github.sigship/sigship`.

## What it checks

17 checks, chosen for how AI-built apps actually fail. Each links to a page with what goes wrong and how to fix it.

**SEV-1: blocks launch, exposes data or money**
[Live secret in code](https://sigship.dev/checks/secret-in-code/) ·
[Committed `.env`](https://sigship.dev/checks/env-file-committed/) ·
[Server secret with a browser-visible name](https://sigship.dev/checks/public-env-secret/) ·
[AI key in the browser](https://sigship.dev/checks/ai-key-in-browser/) ·
[Table with no row level security](https://sigship.dev/checks/rls-missing/) ·
[Policy that lets anyone write](https://sigship.dev/checks/rls-open-write/) ·
[Unverified Stripe webhook](https://sigship.dev/checks/stripe-webhook-unverified/) ·
[User input in SQL](https://sigship.dev/checks/sql-string-concat/)

**SEV-2: blocks launch, abuse is easy**
[AI route with no rate limit](https://sigship.dev/checks/ai-route-no-rate-limit/) ·
[Admin role in `localStorage`](https://sigship.dev/checks/role-in-local-storage/) ·
[Unsanitised HTML](https://sigship.dev/checks/unsanitized-html/)

**SEV-3: reported, blocks only with `--strict`**
[Wildcard CORS](https://sigship.dev/checks/cors-wildcard/) ·
[Secret in logs](https://sigship.dev/checks/secret-in-logs/) ·
[No error boundary](https://sigship.dev/checks/no-error-boundary/) ·
[No error tracking](https://sigship.dev/checks/no-error-tracking/) ·
[No tests](https://sigship.dev/checks/no-tests/) ·
[No lockfile](https://sigship.dev/checks/no-lockfile/)

## Privacy

- The free tool, dashboard and MCP server run entirely on your machine. They make no network calls and have no telemetry.
- SIGSHIP never prints a secret value, in any output format.
- With `--online`, and only then, SIGSHIP sends the name and version of every package in `package.json` and your lockfile to OSV at `api.osv.dev/v1/querybatch`, and nothing else: no code, no file names, no findings. A vulnerable package is a SEV-2 finding. If OSV can't be reached, the other checks still run and the scan still passes or fails on them.
- With a licence key, and only then, SIGSHIP sends the key and a one-way repo fingerprint to `api.sigship.dev`. It never sends code, file names or findings.

Full details: [sigship.dev/privacy](https://sigship.dev/privacy/).

## SIGSHIP Cloud and licence keys

The free tool is open source and available now. Paid plans are on the way, in two kinds:

- **Self-hosted Pro ($149) and Business ($499)**, one-time with a year of new checks: every check we have, run on your own machine and CI. Your code never leaves.
- **SIGSHIP Cloud: Solo ($19), Team ($59) and Agency ($149) a month.** Connect a repo from GitHub, Lovable, Bolt, Replit and other AI tools, and SIGSHIP checks every push, watches your live site and tells you what to fix in plain English.

See every feature and [join the waitlist](https://sigship.dev/#pricing).

If you already have a licence key, set it to add the Pro pack of extra checks:

```bash
SIGSHIP_KEY=your-key npx sigship            # free checks plus the Pro pack
SIGSHIP_KEY=your-key npx sigship --report   # also write a client-ready HTML report
SIGSHIP_KEY=your-key npx sigship --report --brand "Your Studio" --logo logo.png   # with your name and logo on it
npx sigship init --pro                      # pull request comments and a nightly check
```

For the nightly check and pull request comments, add the key as the repository secret `SIGSHIP_KEY`, and optionally `SLACK_WEBHOOK_URL` for Slack alerts. If the licence server can't be reached, SIGSHIP uses its last download of the Pro pack, or the free checks. A network problem never fails a scan.

## Limits

- SIGSHIP uses pattern checks. It can miss real problems and flag safe code.
- It reads your repo, so it can't see settings changed only in a dashboard, such as Supabase policies created in the web console.
- A GO is not a security audit. For a human review, see the [pilot review](https://sigship.dev/#pricing).

## Contributing and security

- Found a false positive or a missed problem? [Open an issue](https://github.com/sigship/sigship/issues/new/choose).
- Want to add a check or fix a bug? See [CONTRIBUTING.md](CONTRIBUTING.md).
- Found a security problem in SIGSHIP itself? Please follow [SECURITY.md](SECURITY.md) and don't open a public issue.

## License

[MIT](LICENSE) © Zoof04 Inc. · [sigship.dev](https://sigship.dev) · support@sigship.dev
