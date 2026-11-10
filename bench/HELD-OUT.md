# The held-out set

`bench/repos.txt` lists 30 public repositories built with AI app builders or AI coding tools. They were found on GitHub by fingerprint files, not by what their README claims: `lovable-tagger` in `package.json` for Lovable, a `.bolt/` folder for Bolt, the default `my-v0-project` name for v0, `.cursorrules` or `.cursor/` for Cursor, `CLAUDE.md` with `.claude/` for Claude Code, `.windsurfrules` for Windsurf and `.replit` for Replit. For the editor tools the fingerprint shows the tool was used on the repo, not that it wrote all of it.

The list is split into two sets, marked in the third column:

- **dev** (20 repos): we may read these, label them and use what we learn to change a check.
- **held-out** (10 repos): we never read these to tune a check. They are scanned only to report numbers, so the figure on the held-out set is the one that has not been fitted to the data. If a check is changed because of something seen in a held-out repo, that repo moves to the dev set and is replaced.

Both sets are scanned the same way: `npm run bench:real` clones each repository shallowly into a temporary folder, runs the scanner, keeps the counts and deletes the clone. `bench/real-results.json` holds the date, the SIGSHIP version, the commit scanned and the number of findings per check. It never holds code, file paths or values.

## Labelling

The planted cases in `bench/fixtures` give precision and recall against cases we wrote. Real repositories tell us how often a finding is right in the wild, and that needs a person to look.

1. Run `npm run bench:real`. It writes `bench/labels.json` with an entry for every finding, with `label: null`. Existing labels are kept.
2. For each finding in a dev repo, open the repository at the recorded commit, find what the check pointed at, and set `label` to `true` (a real problem a careful reviewer would fix before launch) or `false` (a false alarm), with a one-line `note` saying why. Never copy code or secret values into the note.
3. While reading, list under `missed` the ids of checks that should have fired but did not.
4. Run `node bench/real.js --score` for hand-labelled precision per check. Recall on real repos is only as complete as the reading was, so report it as a lower bound.
5. Label the held-out repos last, and only when publishing numbers. Do not change a check because of them.

The repositories belong to their authors. We report only counts, never names next to findings, and never a secret value.
