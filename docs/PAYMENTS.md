# Paid plans

Status: paused for SIGSHIP Cloud. The CLI Pro pack, licence server and Polar products still work, but the site now shows Solo ($19), Team ($59) and Agency ($149) as Cloud plans with a waitlist. Keys already sold keep working. Reopen sales when Cloud ships, with new Polar products at the new prices.

The Pro pack and the licence server live in the private repo `sigship/sigship-pro`, so buyers get the checks and this public repo never shows them.

## Plans

| Plan | Price | Includes |
| --- | --- | --- |
| Free | $0 | 17 core checks, CLI, MCP, pull request check, fix prompts |
| Solo | $10 a month | Pro pack, 3 private repos, report for clients, nightly check |
| Team | $49 a month | Pro pack, 10 private repos, pull request comments, Slack alerts |
| Pilot review | From $499, one time | A senior zoof04 engineer reads the repo by hand. Written review in 48 hours and a 30-minute call |

## Payment provider

Use Polar as merchant of record, so it handles checkout and global tax.

## What the owner must do first

These need the owner's own accounts, so only the owner can do them:

1. Create the Polar account and organisation. Done.
2. Connect a payout account. The bank must be in the business's country and use its local currency. Wise, Payoneer and similar accounts usually fail.
3. Create the Solo and Team monthly products. Solo exists at $10 a month. Team exists but is set as a one-time $49 purchase, and must be changed to $49 a month.
4. Make one checkout link per product, so each button opens only its own plan. A link holding both products shows a plan picker.
5. Add the License Keys benefit to each product, with an activation limit of 3 for Solo and 10 for Team.
6. Add the organisation ID as the Worker setting `POLAR_ORG_ID`. It goes in Cloudflare, not in code.

## How it works

The free tool must keep working with no network. Only a user who sets `SIGSHIP_KEY` ever contacts the server.

1. The CLI reads `SIGSHIP_KEY`. If it is not set, it runs the free checks and makes no network call.
2. If it is set, the CLI posts the key and a one-way repo fingerprint to a Cloudflare Worker at `https://api.sigship.dev/v1/pack`. The fingerprint is a SHA-256 of the key and the repo's git address. It sends no code, file names or findings.
3. The Worker activates the key once per repo with `POST https://api.polar.sh/v1/customer-portal/license-keys/activate`, so Polar enforces the 3 or 10 repo limit, then validates it with `.../validate` and checks the key's `status`. It sends `key`, `organization_id` and the activation ID.
4. If valid, the Worker returns the Pro pack as JSON. The CLI caches it for 24 hours.
5. If the server can't be reached, the CLI uses its cache or falls back to free checks, and says which it did. A network failure must never fail a scan.

The Pro pack must be data, such as patterns and messages. The CLI must never download and run code.

## Build order

1. Done: Pro pack checks for Firebase rules, public storage buckets, API routes with no auth check, Razorpay webhooks, file upload limits, open redirects and weak session cookies. They live in `sigship-pro/pack.json`.
2. Done: the Worker in `sigship-pro/src/worker.js`, with tests that use a fake Polar.
3. Done: CLI support for `SIGSHIP_KEY`, with tests proving that free mode makes no network call.
4. Done: `--report` for a client-ready HTML report.
5. Done: `npx sigship init --pro` adds pull request comments and a nightly check, with a Slack step for Team.
6. Done: the privacy page says that paid plans send the licence key and a repo fingerprint.
7. Done: sigship 0.2.0 is on npm.
8. Done: the KV namespace exists, `POLAR_ORG_ID` is set, and the Worker is live at api.sigship.dev.
9. Done: the Solo and Team buttons go to their own Polar checkout links.
10. The owner buys Solo with a real card, confirms it works, then refunds it.
