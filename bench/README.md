# Benchmark

How well each of the 17 checks does, measured two ways.

## Planted cases

`bench/fixtures/<check-id>/hit/<nn>/` holds tiny projects that must trigger the check. `bench/fixtures/<check-id>/miss/<nn>/` holds look-alikes that must not: comments, tests, examples, placeholders, environment references, sanitised values, policies with real conditions. Each folder has a `WHY` file saying what it probes. The misses are meant to be hard, the shapes AI tools really produce. Fake keys have the right shape but are never real.

```bash
npm run bench
```

prints true positives, false positives, false negatives, precision and recall per check, lists every wrong answer, and writes `bench/results.json` (`{ date, version, checks: [{ id, hits, misses, tp, fp, fn, precision, recall }], overall }`). Pass check ids to run a subset without writing the file.

`test/bench.test.js` is the release gate: it fails when any check's precision or recall falls below `bench/results.json`, or when a case folder is empty. A change that trades recall for precision on purpose must run `npm run bench` and commit the new numbers.

The folder is named `fixtures` so the scanner's own self-scan skips it (fixtures are never shipped code). Keep it that way; do not move the cases to a folder the scanner reads.

## Real repositories

`bench/repos.txt` lists 30 public repositories built with AI tools, split into a dev set and a held-out set (see `HELD-OUT.md`).

```bash
npm run bench:real
```

clones each one shallowly into a temporary folder, scans it, deletes the clone, and writes `bench/real-results.json` (counts per check only; no code, paths or values) and a `bench/labels.json` template for hand labelling. `node bench/real.js --score` prints hand-labelled precision once labels are filled in.

`FINDINGS.md` lists what the cases revealed, as proposed changes to the checks with exact patterns.
