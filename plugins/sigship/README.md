# SIGSHIP for Claude Code

The go/no-go check for AI-built apps, as a Claude Code plugin. It runs on your machine and sends nothing anywhere.

## Install

```bash
claude plugin marketplace add sigship/sigship
claude plugin install sigship@sigship
```

You get:

- **The MCP server** (`npx -y sigship mcp`) with the tools `sigship_check` and `sigship_explain`.
- **`/sigship:launch`**: runs the check, fixes findings worst first, runs it again until it exits 0, and never calls the work done on NO-GO.
- **Launch mode** (a Stop hook), off until you switch it on.

## Launch mode

When it is on, Claude cannot finish a turn in a project while `npx sigship` says NO-GO. The hook sends the fix list back, and Claude keeps working. It is off by default.

Turn it on for one project by creating an empty file in the project root:

```bash
touch .sigship-launch-mode
```

Or for every project, by setting `SIGSHIP_LAUNCH_MODE=1` in your shell or in the `env` block of your Claude Code settings. Delete the file or unset the variable to turn it off, or disable the plugin's hooks by disabling the plugin.

Launch mode only acts when the folder has a `package.json`. It skips silently when SIGSHIP cannot run, and it lets go after 5 refusals in one session, so it cannot trap you. Run `npx sigship` yourself to see what it sees.

A GO means these checks found nothing that blocks launch. It does not prove the app is safe.

More at [sigship.dev](https://sigship.dev).
