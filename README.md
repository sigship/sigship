# SIGSHIP

The go/no-go check for AI-built apps. By [zoof04](https://zoof04.com).

SIGSHIP reads your repo on your own machine and writes the postmortem before the outage. It exits `0` only when it finds nothing serious, which gives your coding agent a real test for done.

```bash
npx sigship
```

No signup. No telemetry. No dependencies. Your code never leaves your machine.

## What you get

```text
SEV-1  A database table has no row level security
       supabase/migrations/001_init.sql:1  Table profiles is created without row level security.
       Anyone with your public Supabase key can read this table. That key ships in your JavaScript.

NO-GO  1 SEV-1, 0 SEV-2, 2 SEV-3. Exit 1.
```

| Exit code | Meaning |
| --- | --- |
| `0` | GO. No SEV-1 or SEV-2 findings. |
| `1` | NO-GO. Something blocks launch. |
| `2` | SIGSHIP could not run. |

GO means these checks found nothing that blocks launch. It does not prove the app is safe.

## Use it four ways

**In your terminal**

```bash
npx sigship              # check this folder
npx sigship --prompt     # print every fix as one prompt for your AI tool
npx sigship --json       # machine-readable output
npx sigship --strict     # also block on SEV-3
```

**In your browser**

```bash
npx sigship ui           # open the dashboard for this folder
npx sigship ui ../app    # or for another folder
```

The dashboard shows the verdict and every finding with its file, line, forecast and fix. It has a button to copy the fix prompt, a re-run button and a box to check another folder. It runs on your computer only: it listens on 127.0.0.1, answers only the link it prints, and serves findings, never your files. Press Ctrl+C to stop it. Add `--no-open` to print the link without opening a browser.

**On every pull request**

```bash
npx sigship init
```

This adds a GitHub Actions workflow and a definition of done in `AGENTS.md`. It never overwrites an existing file.

**Inside your coding agent**

Claude Code:

```bash
claude mcp add sigship -- npx -y sigship mcp
```

Cursor, in `.cursor/mcp.json`:

```json
{ "mcpServers": { "sigship": { "command": "npx", "args": ["-y", "sigship", "mcp"] } } }
```

The agent gets two tools, `sigship_check` and `sigship_explain`, and an instruction not to say it is done while the verdict is NO-GO.

## Solo and Team

Set `SIGSHIP_KEY` to your licence key from [sigship.dev](https://sigship.dev/#pricing) to add the Pro pack of extra checks.

```bash
SIGSHIP_KEY=your-key npx sigship            # free checks plus the Pro pack
SIGSHIP_KEY=your-key npx sigship --report   # also write sigship-report.html for a client
npx sigship init --pro                      # pull request comments and a nightly check
```

With a key, SIGSHIP sends the key and a one-way repo fingerprint to api.sigship.dev, and nothing else: no code, file names or findings. Without a key it makes no network calls. If the server can't be reached, it uses the last Pro pack it downloaded, or the free checks, and never fails the scan because of it.

For the nightly check and pull request comments, add the key as the repository secret `SIGSHIP_KEY`. On Team, add `SLACK_WEBHOOK_URL` for Slack alerts.

## What it checks

SEV-1: live secrets in code, a committed `.env` with secrets, server secrets with browser-visible names, AI keys in the browser, missing Supabase row level security, policies that let anyone write, unverified Stripe webhooks, and user input inside SQL.

SEV-2: AI routes with no rate limit, roles stored in `localStorage`, and unsanitised HTML.

SEV-3: wildcard CORS, secrets in logs, no error boundary, no error tracking, no tests, and no lockfile.

SIGSHIP uses pattern checks. It can miss real problems and flag safe code. It reads code, so it can't see settings changed only in a dashboard.

## License

MIT
