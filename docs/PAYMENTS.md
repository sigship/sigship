# Paid plans

Status: not built. Solo and Team stay "open in January 2027" on the site until every step here works.

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

1. Create the Polar account and organisation.
2. Connect a payout account. The bank must be in the business's country and use its local currency. Wise, Payoneer and similar accounts usually fail.
3. Create the Solo and Team monthly products.
4. Add the License Keys benefit to each product.
5. Add the organisation ID as the Worker setting `POLAR_ORG_ID`. It goes in Cloudflare, not in code.

## How it works

The free tool must keep working with no network. Only a user who sets `SIGSHIP_KEY` ever contacts the server.

1. The CLI reads `SIGSHIP_KEY`. If it is not set, it runs the free checks and makes no network call.
2. If it is set, the CLI posts the key to a Cloudflare Worker at `https://api.sigship.dev/v1/pack`. It sends the key and nothing else: no code, file names or findings.
3. The Worker validates the key with `POST https://api.polar.sh/v1/customer-portal/license-keys/validate`, sending `key` and `organization_id`. For subscriptions, check the key's `status`.
4. If valid, the Worker returns the Pro pack as JSON. The CLI caches it for 24 hours.
5. If the server can't be reached, the CLI uses its cache or falls back to free checks, and says which it did. A network failure must never fail a scan.

The Pro pack must be data, such as patterns and messages. The CLI must never download and run code.

## Build order

1. Pro pack checks: Firebase rules, public storage buckets, API routes with no auth check, Razorpay webhooks, file upload limits, open redirects and weak session cookies.
2. The Worker in `worker/`, with tests that use a fake Polar response.
3. CLI support for `SIGSHIP_KEY`, with tests proving that free mode makes no network call.
4. `--report` for a client-ready HTML report.
5. A nightly GitHub Actions workflow for Solo, and a Slack step for Team.
6. Update the privacy page to say that paid plans send the licence key.
7. Add the checkout links with `node scripts/setup.js`, and remove the line with `id="soon"` from `site/index.html`.
8. The owner buys Solo with a real card, confirms it works, then refunds it.
