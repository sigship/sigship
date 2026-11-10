# Changelog

All notable changes to SIGSHIP are listed here. Versions follow [Semantic Versioning](https://semver.org).

## Unreleased

### Added
- `--online`: the one free check that uses the network, and only when you ask. It sends the name and version of every package in `package.json` and your lockfile to OSV (`api.osv.dev/v1/querybatch`), nothing else, and reports a package with a known vulnerability as SEV-2. If OSV can't be reached, the scan runs without it and says so.
- Accepted risks: `sigship-accept.json` in the checked folder, a list of `{ rule, file?, reason, expires }`. A matching finding is listed as an accepted risk and does not count for the verdict, which reads `GO with 1 accepted risk` in the terminal, JSON, Markdown, SARIF and HTML outputs. Expired or malformed entries are ignored with a warning. There is no flag or command that accepts a risk.
- `--sarif`: SARIF 2.1.0 output with one rule per check and a stable fingerprint per result, for GitHub code scanning.
- `--tool lovable|cursor|bolt|claude|replit|windsurf`: words the fix prompt for one tool. Without it the prompt is unchanged.
- `npx sigship history [folder]`: finds secrets committed in the past, even ones a later commit removed, with the commit and file and never the value. Reads up to 5,000 commits or 50 MB of `git log -p`.
- `npx sigship init --hook`: a pre-commit hook (`.git/hooks/pre-commit`, or a line in `.husky/pre-commit`) that runs only the secret checks on the staged files and blocks a commit that adds one. `npx sigship hook` is what it runs.
- `init` adds the definition of done to `CLAUDE.md` too, when that file exists.
- `--report --brand "Name" --logo file.png`: the client report with your name and logo instead of SIGSHIP's. The logo is inlined, so the page still loads nothing from the network.
- Pack format v2 for the Pro pack: `projectLacks` (a pattern that must appear somewhere in the project), `policy` checks (`policyFor`, `policyWhere`) that read `create policy` blocks in SQL, and `dep` checks (`depMatch`, `depBelow`) that compare dependency versions against `package.json` and the lockfile. Every v1 field still works.

### Changed
- The checks now run in `src/engine.js`, which takes files already in memory and imports nothing from the file system or the network. `src/scan.js` only loads a folder from disk and calls it. Output is unchanged.
- The scanner reads `yarn.lock` and `pnpm-lock.yaml` for pinned versions.

## 0.3.2 — 2026-11-09

### Changed
- `npx sigship ui`: the dashboard has the new Night Harbour look, with Plain and Dev wording and a Night and Day switch. It still runs only on your computer and shows findings, never your files.

## 0.3.1 — 2026-11-07

### Changed
- Requires Node.js 22 or later. Node.js 20 reached end of life in April 2026. CI tests Node.js 22 and 24.
- A new README, plus a security policy, contribution guide and issue templates.
- Package details for npm: author, keywords and the changelog in the package.

## 0.3.0 — 2026-11-07

### Added
- `npx sigship ui [folder]`: a local dashboard in the browser with the verdict, every finding, a button to copy the fix prompt, re-run, and a box to check another folder. It listens on `127.0.0.1` only, needs the private link it prints, and serves findings, never file contents.
- `--no-open`, to print the dashboard link without opening a browser.

## 0.2.0 — 2026-11-07

### Added
- Licence key support with `SIGSHIP_KEY`, which adds the Pro pack of extra checks. Without a key, SIGSHIP still makes no network calls.
- `--report`, which writes `sigship-report.html`, a self-contained report to send to a client. Needs a licence key.
- `--markdown`, for pull request comments.
- `npx sigship init --pro`, which adds a pull request check that comments its result and a nightly check with an optional Slack alert.
- The MCP server loads the Pro pack when a key is set.
- The scanner now reads Firebase `.rules` and Terraform `.tf` files.

### Changed
- The Pro pack is data only: patterns and messages. SIGSHIP never runs code from it and rejects a pack it can't validate.
- A network problem never fails a scan: SIGSHIP falls back to its cached Pro pack, then to the free checks.

## 0.1.1 — 2026-11-06

### Changed
- Package details for npm and the MCP Registry.

## 0.1.0 — 2026-11-06

### Added
- First release: 17 checks for how AI-built apps fail, the command line tool with terminal, JSON and fix-prompt output, the pull request check (`npx sigship init`) and the MCP server.
