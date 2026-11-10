# SIGSHIP agent plugin

One folder, two manifests, for the editors and agents that load plugins from a folder:

- `plugin.json`, `skills/` and `mcp.json` follow the Agent Plugins 1.0.0 layout (Codex, GitHub Copilot, VS Code, Kiro).
- `.cursor-plugin/plugin.json` is the manifest Cursor's plugin directory reads. Cursor finds `skills/launch/SKILL.md` and `mcp.json` in their default places.

It holds one skill, `launch` (run `npx sigship`, fix findings worst first, run again until GO, never claim done on NO-GO), and one MCP server (`npx -y sigship mcp`).

Try it in Cursor by copying this folder to `~/.cursor/plugins/local/sigship` and running **Developer: Reload Window**.

The Claude Code plugin lives in [`plugins/sigship`](../../plugins/sigship).
