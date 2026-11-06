# Security policy

SIGSHIP is a security tool, so we take problems in SIGSHIP itself seriously.

## Reporting a vulnerability

Please **don't open a public issue**. Email **support@sigship.dev** with:

- what you found and how to reproduce it,
- the SIGSHIP version (`npx sigship --version`) and your operating system,
- what someone could do with it.

We aim to reply within 2 business days and to ship a fix for confirmed problems as fast as their severity calls for. We'll credit you in the release notes unless you'd rather we didn't.

## In scope

- The `sigship` npm package: the command line tool, the local dashboard (`sigship ui`) and the MCP server.
- sigship.dev and api.sigship.dev.

Examples: SIGSHIP printing a secret value, the free tool making a network call, the dashboard answering a request without its token or serving file contents, or a Pro pack running code.

## Not a vulnerability

- A check that misses a problem or flags safe code. Please open a regular issue for those, using the false positive or missed problem template.

## Supported versions

Only the latest release gets security fixes. Update with `npx sigship@latest`.
