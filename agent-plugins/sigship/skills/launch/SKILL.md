---
name: launch
description: Run the SIGSHIP go/no-go check on this project, fix what it finds worst first, and re-run until it says GO. Use before saying a build is done, before a launch, or when asked if the app is ready for production.
---

# Launch check

Use SIGSHIP to decide whether this project is ready to ship. The check runs on this machine and sends nothing anywhere.

1. Run the check from the project root: `npx sigship`. If the SIGSHIP MCP tools are connected, call `sigship_check` instead. Exit code `0` is GO, `1` is NO-GO.
2. On NO-GO, work through the findings worst first: every SEV-1, then every SEV-2. For the wording and the fix of one finding, call `sigship_explain` with its id, or run `npx sigship --prompt` for all of them as one list.
3. Make the smallest change that fixes each finding. Do not delete a check, hide a file or add an ignore rule to turn the verdict green.
4. If a fix needs something only the owner can do (rotate a leaked key, change a dashboard setting, set a secret in the host), stop and tell them exactly what to do. Do not pretend it is fixed.
5. Run `npx sigship` again after each round. Repeat until it exits 0.
6. Report the final verdict as it is. Never say the work is done, ready or safe to launch while the verdict is NO-GO. When it is GO, say what GO means: these checks found nothing that blocks launch. It does not prove the app is safe. Mention any SEV-3 findings that remain.

Use `npx sigship --strict` when the owner wants SEV-3 findings to block as well.
