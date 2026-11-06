# Changelog

All notable changes to SIGSHIP are listed here. Versions follow [Semantic Versioning](https://semver.org).

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
