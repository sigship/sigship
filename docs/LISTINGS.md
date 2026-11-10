# Listings and publishing

Where agents and package managers find SIGSHIP, what is done, and what only the owner can do. Status words: **done** (in the repo or live), **owner** (needs a person with the account), **needs the remote server** (waits for the cloud MCP at app.sigship.dev).

Checked against the live docs on 10 Nov 2026.

## Checklist

| Listing | Status | What is left |
| --- | --- | --- |
| npm package `sigship` | done (0.3.2 is live) | From 0.4.0 the release publishes it, see "npm trusted publishing". |
| Official MCP Registry `io.github.sigship/sigship` | done, but stale | Live versions are 0.1.1 and 0.3.1; 0.3.2 never reached it. `publish-mcp.yml` runs when a GitHub release is published, so publishing the 0.4.0 release puts 0.4.0 there. Nothing to rewrite. **owner:** create the release. |
| Claude Code plugin marketplace | done | `claude plugin marketplace add sigship/sigship` then `claude plugin install sigship@sigship`. Works once this branch is on `main`. |
| Anthropic directory (claude.ai) | owner | Needs a paid claude.ai plan. Submit `plugins/sigship` at claude.ai/directory/manage. Run `claude plugin validate plugins/sigship --strict` first and the pre-submission checklist on claude.com. The hook does not load on claude.ai or in Cowork; the skill and MCP server do. The stdio MCP server there is not a hosted connector, so the connector route **needs the remote server**. |
| Agent Plugins folder (Codex, Copilot, VS Code, Kiro) | done in repo, listing not submitted | `agent-plugins/sigship`. See "Agent Plugins: what was confirmed". |
| Cursor plugin directory | owner | Submit the repository at cursor.com/marketplace/publish. Plugins there are open-source Git repos, reviewed by hand, and every update is reviewed. Point it at `agent-plugins/sigship`. If the form wants the manifest at the repository root, ask Cursor how a subfolder plugin is accepted. |
| Glama | owner | `glama.json` is in the repo. Sign in at glama.ai, find the SIGSHIP server and press Claim ownership. For a repository under an organisation, the `glama.json` route is the one that works. The `maintainers` list holds the GitHub username `thenerdviper`; **change it to the account that signs in at Glama**, then claim again. |
| GitHub MCP Registry | owner | The GitHub registry is fed from the official registry plus a partner programme. Email partnerships@github.com (text below). |
| awesome-mcp-servers | owner | Open the pull request with the line below. |
| MCP Market | owner | Submit through the form on mcpmarket.com using the repository URL and the description below. Not verified here: the form is behind their site. |
| Lovable guide | needs the site (workstream C) | A "check your Lovable app" guide on sigship.dev, then submit it to Lovable's community and docs channels. Not started here. |
| Remote MCP at app.sigship.dev/api/v1/mcp | needs the remote server | Add it to the MCP Registry as a `remotes` entry and to the Anthropic directory as a connector once it is live. |

## npm trusted publishing

`.github/workflows/publish-npm.yml` runs on a published GitHub release (or by hand): it installs, runs the tests and the self-scan, checks the tag matches `package.json`, then runs `npm publish --provenance --access public`. It has no token secret. `publish-mcp.yml` is unchanged and also runs on the release.

**One-time setup, owner, on npmjs.com:**

1. Sign in as a maintainer of `sigship` and open the package, then Settings, then Trusted Publisher.
2. Choose GitHub Actions and fill in: organisation or user `sigship`, repository `sigship`, workflow filename `publish-npm.yml` (the file name only, with `.yml`). Leave environment empty.
3. Under allowed actions, allow `npm publish` (npm's default only allows staged publishes).
4. Save. npm does not check the settings when you save; a mistake shows up at the first publish. A new setting that has not completed a publish within 2 days expires, so do this just before the release.
5. Optional: after the first successful trusted publish, set the package to "Require two-factor authentication and disallow tokens" so no token can publish.

Needs npm CLI 11.5.1 or later (the workflow uses Node 24, which ships it) and `repository.url` in `package.json` matching the GitHub repository, which it does. Provenance is added automatically for a public repository; the flag is kept so it is explicit.

Release steps: bump `package.json`, `server.json` and the changelog, merge, tag `vX.Y.Z`, publish the GitHub release. The tag must equal `v` plus the `package.json` version or the workflow stops before publishing.

## Agent Plugins: what was confirmed

Confirmed on agent-plugins.org (the specification page, 10 Nov 2026):

- Version 1.0.0 is marked "Published", not draft. Layout: `plugin.json` at the root, optional `skills/<name>/SKILL.md`, optional `mcp.json`.
- `plugin.json` requires `$schema` (`https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`) and `name`; `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords` and `extensions` are optional. Unknown top-level fields are ignored.
- `mcp.json` has `$schema` (`https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`) and `mcpServers`; a stdio server needs `type` and `command`.
- Cursor documents its own manifest, `.cursor-plugin/plugin.json`, which needs only `name`, and finds `skills/` and `mcp.json` in their default places.

Not confirmed:

- Which clients load the standard format today. Secondary articles name ChatGPT, Codex, Cursor, GitHub Copilot, Kiro and VS Code, and disagree on who published it. Each client's own docs were not checked, so the folder is written to the spec and the Cursor docs only, and has not been loaded in Codex, Copilot, VS Code or Kiro.
- Whether Cursor's directory accepts a plugin in a subfolder, and its full manifest schema (the reference page returned 404).
- Any install path for the standard other than copying the folder.
- The spec's files were read through a summarising fetch, not downloaded, so field details should be rechecked against the schemas before a client rejects the folder.

## Claude Code plugin: what was confirmed

From code.claude.com (plugins, plugin manifest reference, marketplace guide, hooks, publishing): manifest at `.claude-plugin/plugin.json`, marketplace at `.claude-plugin/marketplace.json` with `name`, `owner` and `plugins` (each with `name` and `source`), skills under `skills/<name>/SKILL.md` run as `/plugin:skill`, `.mcp.json` and `hooks/hooks.json` at the plugin root, `${CLAUDE_PLUGIN_ROOT}` in hook commands, and Stop hooks block with exit code 2 and the stderr text. `claude plugin validate .` and `claude plugin validate plugins/sigship` both pass; the only warning is the missing `version`, left out on purpose. The plugin sets no `version`, so users get updates by commit.

## Text to paste

### awesome-mcp-servers (github.com/punkpeye/awesome-mcp-servers)

Their guide says: one line per server, name linked to the repository, short description, alphabetical inside its category, public GitHub repository you can run yourself. Put it under the closest existing category (Security, or Developer Tools if Security does not exist). Check the emoji legend at the top of their README for the language and scope icons before you open the PR; this was not verifiable from their contributing guide. Line, with Node as the language and local as the scope:

```md
- [sigship/sigship](https://github.com/sigship/sigship) 📇 🏠 - Go/no-go check for AI-built apps. Scans a repo locally for leaked keys, open databases, unverified webhooks and other production problems, returns the fixes worst first, and says NO-GO until they are done. Zero dependencies, nothing leaves your machine.
```

PR title: `Add sigship`

PR body:

```md
Adds SIGSHIP, an MCP server (`npx -y sigship mcp`) with two tools: `sigship_check` scans a project folder and returns a GO or NO-GO verdict with findings and fixes, and `sigship_explain` explains one finding. It runs locally with no network access and no runtime dependencies. MIT licensed. Also in the official MCP Registry as io.github.sigship/sigship.
```

### GitHub MCP Registry email

To: partnerships@github.com

Subject: MCP Registry listing request: io.github.sigship/sigship

```text
Hello,

We maintain SIGSHIP, an MCP server that checks AI-built apps for production problems and returns a go/no-go verdict with fixes. It runs locally over stdio and sends nothing off the machine.

- Repository: https://github.com/sigship/sigship (MIT)
- npm: sigship (published with provenance), run with: npx -y sigship mcp
- Official MCP Registry: io.github.sigship/sigship
- Tools: sigship_check, sigship_explain
- Site: https://sigship.dev

We would like it listed in the GitHub MCP Registry. Tell us if you need anything more from us.

Zoof04 Inc.
support@sigship.dev
```

### MCP Market and Cursor directory description

> SIGSHIP is the go/no-go check for AI-built apps. It reads your repo on your own machine, lists what will break in production (leaked keys, open databases, unverified webhooks, AI routes with no spending brake), and exits 0 only when it finds nothing serious. Your coding agent calls it, fixes the findings worst first, and runs it again until it says GO. Free, MIT, zero dependencies, no telemetry.

Install line: `npx -y sigship mcp`. Claude Code: `claude plugin marketplace add sigship/sigship`.
