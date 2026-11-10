// Secrets in git: the staged files (for the pre-commit hook) and the whole history (sigship history).
// Both run the secret checks from src/rules.js and never print a value.
import { execFileSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { RULES_BY_ID } from './rules.js';
import { runRules } from './engine.js';

const SECRET_RULES = ['secret-in-code', 'env-file-committed', 'public-env-secret'].map((id) => RULES_BY_ID[id]);
const MAX_COMMITS = 5000;
const MAX_BYTES = 50 * 1024 * 1024;

const git = (root, args, options = {}) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024, ...options });

// The secret checks on what is staged right now. Reads the staged content, not the working tree,
// so a secret that is in the file but not in the commit does not block, and one that is does.
export function checkStaged(target = '.') {
  const root = resolve(target);
  let paths;
  try {
    paths = git(root, ['diff', '--cached', '--name-only', '--diff-filter=ACM', '-z']).split('\0').filter(Boolean);
  } catch {
    throw new Error('Not a git repository, or git is not installed.');
  }
  const files = [];
  for (const path of paths) {
    try {
      const text = git(root, ['show', `:${path}`]);
      if (text.length <= 1_000_000) files.push({ path, text });
    } catch {
      // A submodule or an unreadable blob has no text to check.
    }
  }
  const ctx = { files, paths, tracked: paths, deps: {}, pkg: null, sql: [], usesSupabase: false };
  return { files: files.length, findings: runRules(SECRET_RULES, ctx) };
}

const sha1ish = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};

// Runs the secret checks over one side of a diff. Returns, per hit, the line's text (to match adds
// against removes) and the rule's detail. Lines are checked as one file so the rules see them as code.
function secretLines(path, lines) {
  if (!lines.length) return [];
  const text = lines.join('\n');
  const file = { path, text };
  return runRules([RULES_BY_ID['secret-in-code']], { files: [file], paths: [path], tracked: [path], deps: {}, pkg: null, sql: [], usesSupabase: false }).map((f) => ({
    key: sha1ish(lines[f.line - 1].trim()),
    detail: f.detail,
  }));
}

// Streams git log -p (newest first) through the secret checks. Reports every secret ever committed,
// with the commit and file, and whether a later commit removed it. Never the value.
export async function history(target = '.', { maxCommits = MAX_COMMITS, maxBytes = MAX_BYTES } = {}) {
  const root = resolve(target);
  try {
    git(root, ['rev-parse', '--git-dir']);
  } catch {
    throw new Error('Not a git repository, or git is not installed.');
  }
  return new Promise((done, fail) => {
    const child = spawn('git', ['-C', root, 'log', '-p', '--no-color', '--no-renames', '--unified=0', `--max-count=${maxCommits}`, '--date=short', '--format=commit %H%x00%ad%x00%s'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const found = []; // { sha, date, subject, file, detail, key }
    const removed = new Map(); // line key -> { sha, date } of the newest commit that removed it
    let commit = null;
    let file = null;
    let added = [];
    let dropped = [];
    let bytes = 0;
    let commits = 0;
    let capped = false;
    let rest = '';

    const flushFile = () => {
      if (!commit || !file) return;
      for (const hit of secretLines(file, added)) found.push({ ...commit, file, detail: hit.detail, key: hit.key });
      for (const hit of secretLines(file, dropped)) if (!removed.has(hit.key)) removed.set(hit.key, { sha: commit.sha, date: commit.date });
      added = [];
      dropped = [];
    };
    const line = (l) => {
      if (l.startsWith('commit ') && l.includes('\0')) {
        flushFile();
        file = null;
        const [sha, date, subject] = l.slice(7).split('\0');
        commit = { sha, date, subject };
        commits += 1;
      } else if (l.startsWith('diff --git ')) {
        flushFile();
        file = l.match(/ b\/(.+)$/)?.[1] ?? null;
      } else if (l.startsWith('+') && !l.startsWith('+++')) added.push(l.slice(1));
      else if (l.startsWith('-') && !l.startsWith('---')) dropped.push(l.slice(1));
    };

    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      rest += chunk.toString('utf8');
      const lines = rest.split('\n');
      rest = lines.pop();
      for (const l of lines) line(l);
      if (bytes > maxBytes) {
        capped = true;
        child.kill();
      }
    });
    child.on('error', fail);
    child.on('close', () => {
      if (rest) line(rest);
      flushFile();
      // Git lists newest first, so a removal seen before an add is a removal that came later in time.
      const seen = new Set();
      const secrets = [];
      for (const f of found) {
        const id = `${f.key}:${f.file}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const gone = removed.get(f.key);
        secrets.push({ commit: f.sha.slice(0, 10), date: f.date, subject: f.subject, file: f.file, detail: f.detail, removed: gone ? { commit: gone.sha.slice(0, 10), date: gone.date } : null });
      }
      done({ commits, bytes, capped: capped || commits >= maxCommits, secrets });
    });
  });
}
