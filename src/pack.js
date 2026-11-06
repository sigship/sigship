// Turns a Pro pack into checks. A pack is data only: patterns and messages.
// Nothing in a pack is ever run as code, so a bad or hostile pack can't do more than match text.
import { CODE, NOT_SHIPPED, SERVER_PATH, RULES_BY_ID, findAll } from './rules.js';

const TEXT_FIELDS = ['id', 'title', 'forecast', 'fix', 'detail'];
const PATTERN_FIELDS = ['paths', 'match', 'fileHas', 'fileLacks', 'depsLack'];
const MAX_RULES = 200;
const MAX_PATTERN = 500;

function pattern(value, field, id) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length > MAX_PATTERN) throw new Error(`Pro pack check ${id} has a bad ${field}.`);
  return new RegExp(value, 'i');
}

function compileRule(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Pro pack has a check that is not an object.');
  for (const field of TEXT_FIELDS) {
    if (typeof raw[field] !== 'string' || !raw[field].trim()) throw new Error(`Pro pack check ${raw.id ?? '?'} is missing ${field}.`);
  }
  if (!/^[a-z0-9-]{3,60}$/.test(raw.id)) throw new Error(`Pro pack check ${raw.id} has a bad id.`);
  if (RULES_BY_ID[raw.id]) throw new Error(`Pro pack check ${raw.id} clashes with a free check.`);
  if (![1, 2, 3].includes(raw.severity)) throw new Error(`Pro pack check ${raw.id} has a bad severity.`);

  const [paths, match, fileHas, fileLacks, depsLack] = PATTERN_FIELDS.map((f) => pattern(raw[f], f, raw.id));
  if (!match) throw new Error(`Pro pack check ${raw.id} is missing match.`);
  const serverOnly = raw.server === true;
  const includeTests = raw.includeTests === true;

  return {
    id: raw.id,
    severity: raw.severity,
    title: raw.title,
    forecast: raw.forecast,
    fix: raw.fix,
    pro: true,
    run({ files, deps }) {
      if (depsLack && Object.keys(deps).some((d) => depsLack.test(d))) return [];
      return files
        .filter((f) => (paths ? paths.test(f.path) : CODE.test(f.path)))
        .filter((f) => includeTests || !NOT_SHIPPED.test(f.path))
        .filter((f) => !serverOnly || SERVER_PATH.test(f.path))
        .filter((f) => (!fileHas || fileHas.test(f.text)) && (!fileLacks || !fileLacks.test(f.text)))
        .flatMap((f) => findAll(f, match))
        .map((h) => ({ file: h.file, line: h.line, detail: raw.detail }));
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
