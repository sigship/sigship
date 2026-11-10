// The engine. It takes files already loaded by someone else (the CLI from disk, the cloud from a
// tarball, the browser from a folder picker) and returns findings. It imports nothing from fs,
// child_process or the network, so it runs anywhere JavaScript runs.
import { RULES } from './rules.js';

export const ACCEPT_FILE = 'sigship-accept.json';

const SEV_KEYS = { 1: 'sev1', 2: 'sev2', 3: 'sev3' };

// Builds the parts of the context that follow from the files themselves, when the caller left them out.
export function buildContext({ files = [], paths, tracked, pkg, deps, sql, usesSupabase } = {}) {
  paths = paths ?? files.map((f) => f.path);
  tracked = tracked ?? paths;
  if (pkg === undefined) {
    pkg = null;
    const pkgFile = files.find((f) => f.path === 'package.json');
    if (pkgFile) {
      try {
        pkg = JSON.parse(pkgFile.text);
      } catch {
        pkg = null;
      }
    }
  }
  deps = deps ?? { ...pkg?.dependencies, ...pkg?.devDependencies };
  sql = sql ?? files.filter((f) => /\.sql$/i.test(f.path));
  usesSupabase = usesSupabase ?? (Object.keys(deps).some((d) => d.startsWith('@supabase/')) || paths.some((p) => /(^|\/)supabase\/(migrations|config\.toml)/.test(p)));
  return { files, paths, tracked, pkg, deps, sql, usesSupabase };
}

const isoDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s));

// Reads sigship-accept.json: an array of { rule, file?, reason, expires }. Bad entries become warnings,
// never errors, so a typo in the file can't block a scan or quietly accept anything.
export function parseAccepts(text, { now = Date.now() } = {}) {
  const warnings = [];
  const entries = [];
  if (text == null) return { entries, warnings };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    warnings.push(`${ACCEPT_FILE} is not valid JSON, so no risk was accepted.`);
    return { entries, warnings };
  }
  if (!Array.isArray(data)) {
    warnings.push(`${ACCEPT_FILE} must be a JSON array, so no risk was accepted.`);
    return { entries, warnings };
  }
  data.forEach((entry, i) => {
    const where = `${ACCEPT_FILE} entry ${i + 1}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return void warnings.push(`${where} is not an object. Ignored.`);
    if (typeof entry.rule !== 'string' || !entry.rule.trim()) return void warnings.push(`${where} has no rule. Ignored.`);
    if (typeof entry.reason !== 'string' || !entry.reason.trim()) return void warnings.push(`${where} (${entry.rule}) has no reason. Ignored.`);
    if (!isoDate(entry.expires)) return void warnings.push(`${where} (${entry.rule}) has no expires date in YYYY-MM-DD form. Ignored.`);
    if (entry.file !== undefined && typeof entry.file !== 'string') return void warnings.push(`${where} (${entry.rule}) has a file that is not text. Ignored.`);
    // A date with no time means the whole of that day.
    const expires = /^\d{4}-\d{2}-\d{2}$/.test(entry.expires) ? Date.parse(entry.expires) + 24 * 60 * 60 * 1000 : Date.parse(entry.expires);
    if (expires <= now) return void warnings.push(`${where} (${entry.rule}) expired on ${entry.expires.slice(0, 10)}. The finding counts again.`);
    entries.push({ rule: entry.rule, file: entry.file, reason: entry.reason, expires: entry.expires });
  });
  return { entries, warnings };
}

// Moves findings covered by an accepted risk out of the list that decides the verdict.
export function applyAccepts(findings, entries) {
  const kept = [];
  const accepted = [];
  for (const f of findings) {
    const entry = entries.find((e) => e.rule === f.id && (e.file === undefined || e.file === f.file));
    if (entry) accepted.push({ ...f, reason: entry.reason, expires: entry.expires });
    else kept.push(f);
  }
  return { findings: kept, accepted };
}

export function countBySeverity(findings) {
  const counts = { sev1: 0, sev2: 0, sev3: 0 };
  for (const f of findings) counts[SEV_KEYS[f.severity]] += 1;
  return counts;
}

export function sortFindings(findings) {
  return findings.sort((a, b) => a.severity - b.severity || a.file.localeCompare(b.file) || a.line - b.line);
}

export function runRules(rules, ctx) {
  return sortFindings(
    rules.flatMap((rule) =>
      rule.run(ctx).map((hit) => ({
        id: rule.id,
        severity: rule.severity,
        title: rule.title,
        forecast: rule.forecast,
        fix: rule.fix,
        file: hit.file,
        line: hit.line,
        detail: hit.detail,
      })),
    ),
  );
}

// Runs every check over files that are already in memory.
//   files: [{ path, text }], paths relative to the project root with forward slashes
//   tracked: paths git tracks (defaults to every path)
//   paths: every path in the project, including files whose text was not loaded
//   deps, pkg, sql, usesSupabase: worked out from the files when left out
//   extraRules: Pro pack checks from compilePack
//   accept: the text of sigship-accept.json (defaults to that file among files, if present)
//   now: the time used for expiry, for tests
export function scanFiles({ files = [], tracked, paths, deps, pkg, sql, usesSupabase, extraRules = [], accept, now } = {}) {
  const ctx = buildContext({ files, paths, tracked, pkg, deps, sql, usesSupabase });
  const rules = [...RULES, ...extraRules];
  const all = runRules(rules, ctx);
  const acceptText = accept ?? files.find((f) => f.path === ACCEPT_FILE)?.text;
  const { entries, warnings } = parseAccepts(acceptText, now === undefined ? {} : { now });
  const { findings, accepted } = applyAccepts(all, entries);
  return { findings, accepted, warnings, counts: countBySeverity(findings), checksRun: rules.length };
}

// Adds findings from a check that ran outside scanFiles (the online check), under the same accepted
// risks. Warnings about the accept file were already given by scanFiles, so they are not repeated.
export function addFindings(result, extra, { accept, now } = {}) {
  const { entries } = parseAccepts(accept, now === undefined ? {} : { now });
  const split = applyAccepts(extra, entries);
  const findings = sortFindings([...result.findings, ...split.findings]);
  const accepted = [...(result.accepted ?? []), ...split.accepted];
  return { ...result, findings, accepted, counts: countBySeverity(findings), checksRun: result.checksRun + 1, warnings: [...(result.warnings ?? [])] };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function verdict(result, { strict = false } = {}) {
  const { sev1, sev2, sev3 } = result.counts;
  const blocked = sev1 + sev2 + (strict ? sev3 : 0) > 0;
  const label = blocked ? 'NO-GO' : 'GO';
  const accepted = result.accepted?.length ?? 0;
  const text = accepted ? `${label} with ${plural(accepted, 'accepted risk')}` : label;
  return { go: !blocked, label, text, accepted, exitCode: blocked ? 1 : 0 };
}
