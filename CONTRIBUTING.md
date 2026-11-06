# Contributing to SIGSHIP

Thanks for helping. False-positive reports, missed problems and new checks are the most useful contributions.

## Ground rules

- **Zero runtime dependencies.** The package must stay installable with nothing else.
- **The free tool never touches the network.** No telemetry, no update checks.
- **Never print a secret value**, in any output format.
- **Honest output.** A GO means these checks found nothing that blocks launch, never that an app is safe.

## Set up

Requires Node.js 22 or later.

```bash
git clone https://github.com/sigship/sigship.git
cd sigship
npm install
npm test
node bin/sigship.js .
```

Both `npm test` and the self-scan (`node bin/sigship.js .`) must pass. CI runs both on every pull request.

## Adding or changing a check

Checks live in [`src/rules.js`](src/rules.js). Each one is plain data plus one small function:

- `id`: short and kebab-case, such as `stripe-webhook-unverified`.
- `severity`: `1` exposes data or money, `2` makes abuse easy, `3` is a reliability gap.
- `title`: what is wrong, in plain words.
- `forecast`: what happens in production if it ships, in one sentence.
- `fix`: what to do about it, specific enough to paste into an AI tool.
- `run(context)`: returns findings with a file, line and detail.

Every check needs tests in [`test/sigship.test.js`](test/sigship.test.js): a project it must flag, and a fixed version it must leave alone. Fake secrets in tests are assembled at run time, so the repo never trips a secret scanner.

The website builds a page for each check from `src/rules.js`. Run `npm run docs` and commit the changes in `site/`.

## Pull requests

- Keep each pull request to one change, with a short description of why.
- Update [`CHANGELOG.md`](CHANGELOG.md) under a new heading for anything users will notice.
- Write user-facing text plainly: short sentences, no jargon.

## Releases

Maintainers bump the version in `package.json`, `package-lock.json` and both fields in `server.json`, update the changelog, tag the release, and publish to npm and the MCP Registry.
