// Turns a Pro pack into checks. A pack is data only: patterns and messages.
// Nothing in a pack is ever run as code, so a bad or hostile pack can't do more than match text.
//
// Pack format v2. Every check has id, severity, title, forecast, fix and detail, plus one of:
//   match         a pattern, one finding per hit, in files selected by paths (default: code files).
//                 fileHas / fileLacks narrow to files that do or don't contain a pattern.
//   projectLacks  a pattern that must match somewhere in the selected files. One finding at
//                 package.json:1 (or the first selected file) when it matches nowhere.
//   policyFor / policyWhere   a "create policy" block in .sql files whose command is policyFor
//                 (select, insert, update, delete or all) and whose using / with check expression
//                 matches policyWhere. One finding per policy.
//   depMatch      a pattern on dependency names, with optional depBelow, a version: one finding per
//                 dependency that matches and, with depBelow, is installed below that version.
// Common to all: paths, depsLack (skip the check when a dependency matches), server, includeTests.
import { CODE, NOT_SHIPPED, SERVER_PATH, RULES_BY_ID, findAll } from './rules.js';

const TEXT_FIELDS = ['id', 'title', 'forecast', 'fix', 'detail'];
const PATTERN_FIELDS = ['paths', 'match', 'fileHas', 'fileLacks', 'depsLack', 'projectLacks', 'policyWhere', 'depMatch'];
const POLICY_COMMANDS = ['select', 'insert', 'update', 'delete', 'all'];
const MAX_RULES = 200;
const MAX_PATTERN = 500;

function pattern(value, field, id) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length > MAX_PATTERN) throw new Error(`Pro pack check ${id} has a bad ${field}.`);
  return new RegExp(value, 'i');
}

// A version as numbers, ignoring a range operator and any prerelease tag: "^1.2.3-beta" is [1, 2, 3].
export function parseVersion(value) {
  const m = String(value ?? '').match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
}

// Negative when a is lower than b, zero when equal, positive when higher. Null when either is not a version.
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// The version a lockfile pins for a package, from package-lock.json, pnpm-lock.yaml or yarn.lock.
export function lockedVersion(files, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const f of files) {
    if (/(^|\/)package-lock\.json$/.test(f.path)) {
      try {
        const lock = JSON.parse(f.text);
        const v = lock.packages?.[`node_modules/${name}`]?.version ?? lock.dependencies?.[name]?.version;
        if (v) return v;
      } catch {
        // An unreadable lockfile pins nothing.
      }
    } else if (/(^|\/)pnpm-lock\.yaml$/.test(f.path)) {
      const m = f.text.match(new RegExp(`^\\s+/?${escaped}@(\\d+\\.\\d+\\.\\d+)`, 'm')) ?? f.text.match(new RegExp(`^\\s+'?${escaped}'?:\\n\\s+(?:specifier: .*\\n\\s+)?version: (\\d+\\.\\d+\\.\\d+)`, 'm'));
      if (m) return m[1];
    } else if (/(^|\/)yarn\.lock$/.test(f.path)) {
      const m = f.text.match(new RegExp(`^"?${escaped}@[^\\n]*:\\n(?:\\s+[^\\n]*\\n)*?\\s+version:? "?(\\d+\\.\\d+\\.\\d+)`, 'm'));
      if (m) return m[1];
    }
  }
  return null;
}

const lineOfKey = (text, name) => {
  const index = text.search(new RegExp(`"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`));
  return index < 0 ? 1 : text.slice(0, index).split('\n').length;
};

// The text inside the balanced parentheses that follow a keyword, or an empty string.
function groupAfter(stmt, keyword) {
  const m = stmt.match(keyword);
  if (!m) return '';
  let i = stmt.indexOf('(', m.index + m[0].length);
  if (i < 0) return '';
  let depth = 0;
  const start = i + 1;
  for (; i < stmt.length; i += 1) {
    if (stmt[i] === '(') depth += 1;
    else if (stmt[i] === ')' && (depth -= 1) === 0) return stmt.slice(start, i).trim();
  }
  return stmt.slice(start).trim();
}

// Every "create policy" statement in a .sql file: its command and the expressions it tests.
export function parsePolicies(file) {
  return findAll(file, /create\s+policy[\s\S]*?;/i).map((hit) => {
    const stmt = hit.match[0];
    const command = (stmt.match(/\bfor\s+(select|insert|update|delete|all)\b/i)?.[1] ?? 'all').toLowerCase();
    const name = stmt.match(/create\s+policy\s+("[^"]*"|\S+)/i)?.[1]?.replace(/"/g, '') ?? '';
    return { file: hit.file, line: hit.line, name, command, using: groupAfter(stmt, /\busing\b/i), check: groupAfter(stmt, /\bwith\s+check\b/i) };
  });
}

function compileRule(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Pro pack has a check that is not an object.');
  for (const field of TEXT_FIELDS) {
    if (typeof raw[field] !== 'string' || !raw[field].trim()) throw new Error(`Pro pack check ${raw.id ?? '?'} is missing ${field}.`);
  }
  if (!/^[a-z0-9-]{3,60}$/.test(raw.id)) throw new Error(`Pro pack check ${raw.id} has a bad id.`);
  if (RULES_BY_ID[raw.id]) throw new Error(`Pro pack check ${raw.id} clashes with a free check.`);
  if (![1, 2, 3].includes(raw.severity)) throw new Error(`Pro pack check ${raw.id} has a bad severity.`);

  const [paths, match, fileHas, fileLacks, depsLack, projectLacks, policyWhere, depMatch] = PATTERN_FIELDS.map((f) => pattern(raw[f], f, raw.id));
  const serverOnly = raw.server === true;
  const includeTests = raw.includeTests === true;

  let policyFor = null;
  if (raw.policyFor !== undefined || policyWhere) {
    policyFor = raw.policyFor === undefined ? 'all' : raw.policyFor;
    if (!POLICY_COMMANDS.includes(policyFor)) throw new Error(`Pro pack check ${raw.id} has a bad policyFor.`);
  }
  let depBelow = null;
  if (raw.depBelow !== undefined) {
    if (!depMatch) throw new Error(`Pro pack check ${raw.id} has depBelow without depMatch.`);
    if (typeof raw.depBelow !== 'string' || !parseVersion(raw.depBelow)) throw new Error(`Pro pack check ${raw.id} has a bad depBelow.`);
    depBelow = raw.depBelow;
  }
  const kinds = [match && 'match', projectLacks && 'projectLacks', policyFor && 'policy', depMatch && 'dep'].filter(Boolean);
  if (kinds.length !== 1) throw new Error(`Pro pack check ${raw.id} needs exactly one of match, projectLacks, policyFor and depMatch.`);
  const kind = kinds[0];

  const selected = (files) =>
    files
      .filter((f) => (paths ? paths.test(f.path) : kind === 'policy' ? /\.sql$/i.test(f.path) : CODE.test(f.path)))
      .filter((f) => includeTests || !NOT_SHIPPED.test(f.path))
      .filter((f) => !serverOnly || SERVER_PATH.test(f.path));

  const run = {
    match: ({ files }) =>
      selected(files)
        .filter((f) => (!fileHas || fileHas.test(f.text)) && (!fileLacks || !fileLacks.test(f.text)))
        .flatMap((f) => findAll(f, match))
        .map((h) => ({ file: h.file, line: h.line, detail: raw.detail })),

    projectLacks: ({ files }) => {
      const chosen = selected(files).filter((f) => (!fileHas || fileHas.test(f.text)) && (!fileLacks || !fileLacks.test(f.text)));
      if (!chosen.length || chosen.some((f) => projectLacks.test(f.text))) return [];
      const at = files.find((f) => f.path === 'package.json') ?? chosen[0];
      return [{ file: at.path, line: 1, detail: raw.detail }];
    },

    policy: ({ files }) =>
      selected(files)
        .flatMap(parsePolicies)
        .filter((p) => policyFor === 'all' || p.command === policyFor || p.command === 'all')
        .filter((p) => !policyWhere || policyWhere.test(p.using) || policyWhere.test(p.check))
        .map((p) => ({ file: p.file, line: p.line, detail: raw.detail })),

    dep: ({ files, deps }) => {
      const pkgFile = files.find((f) => f.path === 'package.json');
      return Object.entries(deps)
        .filter(([name]) => depMatch.test(name))
        .map(([name, range]) => ({ name, version: lockedVersion(files, name) ?? range }))
        .filter(({ version }) => !depBelow || compareVersions(version, depBelow) < 0)
        .map(({ name, version }) => ({
          file: 'package.json',
          line: pkgFile ? lineOfKey(pkgFile.text, name) : 1,
          detail: `${raw.detail} (${name} ${String(version).replace(/^[\^~>=<\s]+/, '')})`,
        }));
    },
  }[kind];

  return {
    id: raw.id,
    severity: raw.severity,
    title: raw.title,
    forecast: raw.forecast,
    fix: raw.fix,
    pro: true,
    run(ctx) {
      if (depsLack && Object.keys(ctx.deps).some((d) => depsLack.test(d))) return [];
      return run(ctx);
    },
  };
}

export function compilePack(pack) {
  if (!pack || !Array.isArray(pack.rules)) throw new Error('Pro pack has no checks.');
  if (pack.rules.length > MAX_RULES) throw new Error('Pro pack has too many checks.');
  const rules = pack.rules.map(compileRule);
  const ids = new Set(rules.map((r) => r.id));
  if (ids.size !== rules.length) throw new Error('Pro pack has two checks with the same id.');
  return rules;
}
