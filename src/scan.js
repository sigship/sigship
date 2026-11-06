import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { RULES } from './rules.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output', '.vercel', '.turbo', 'coverage', 'vendor', '.venv', '__pycache__', '.cache']);
const TEXT = /\.(c|m)?(j|t)sx?$|\.vue$|\.svelte$|\.astro$|\.py$|\.sql$|\.json$|\.ya?ml$|\.toml$|\.html$|\.md$|\.txt$|\.sh$|\.rules$|\.tf$|(^|\/)\.env(\.[a-z]+)?$/i;
const MAX_BYTES = 1_000_000;

const toPosix = (p) => p.split(sep).join('/');

function gitFiles(root) {
  try {
    const run = (...args) =>
      execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 })
        .split('\n')
        .filter(Boolean);
    const tracked = run('ls-files', '--cached');
    const others = run('ls-files', '--others', '--exclude-standard');
    return { tracked, all: [...new Set([...tracked, ...others])] };
  } catch {
    return null;
  }
}

function walk(root) {
  const out = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(join(dir, entry.name));
      } else if (entry.isFile()) {
        out.push(toPosix(relative(root, join(dir, entry.name))));
      }
    }
  };
  visit(root);
  return out;
}

function ignoresEnv(root) {
  const file = join(root, '.gitignore');
  if (!existsSync(file)) return false;
  return readFileSync(file, 'utf8').split('\n').some((l) => /^\s*\/?\.env(\*|\.\*)?\s*$/.test(l));
}

function loadContext(root) {
  const git = gitFiles(root);
  const paths = (git ? git.all : walk(root)).filter((p) => !p.split('/').some((part) => SKIP_DIRS.has(part)));
  // Outside a git repo, treat a .env file as committed unless .gitignore covers it.
  const tracked = git ? git.tracked : ignoresEnv(root) ? paths.filter((p) => !/(^|\/)\.env/.test(p)) : paths;

  const files = [];
  for (const path of paths) {
    if (!TEXT.test(path)) continue;
    const full = join(root, path);
    try {
      const stat = lstatSync(full);
      if (!stat.isFile() || stat.size > MAX_BYTES) continue;
      files.push({ path, text: readFileSync(full, 'utf8') });
    } catch {
      // A file removed during the scan is not a finding.
    }
  }

  let pkg = null;
  const pkgFile = files.find((f) => f.path === 'package.json');
  if (pkgFile) {
    try {
      pkg = JSON.parse(pkgFile.text);
    } catch {
      pkg = null;
    }
  }
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const sql = files.filter((f) => /\.sql$/i.test(f.path));
  const usesSupabase = Object.keys(deps).some((d) => d.startsWith('@supabase/')) || paths.some((p) => /(^|\/)supabase\/(migrations|config\.toml)/.test(p));
  return { root, paths, tracked, files, sql, pkg, deps, usesSupabase };
}

export function scan(target = '.', { extraRules = [] } = {}) {
  const root = resolve(target);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    throw new Error(`Folder not found: ${target}`);
  }
  const started = performance.now();
  const ctx = loadContext(root);
  const rules = [...RULES, ...extraRules];
  const findings = rules.flatMap((rule) =>
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
  ).sort((a, b) => a.severity - b.severity || a.file.localeCompare(b.file) || a.line - b.line);

  const counts = { sev1: 0, sev2: 0, sev3: 0 };
  for (const f of findings) counts[`sev${f.severity}`] += 1;

  return {
    root,
    filesRead: ctx.files.length,
    checksRun: rules.length,
    ms: Math.round(performance.now() - started),
    counts,
    findings,
  };
}

export function verdict(result, { strict = false } = {}) {
  const { sev1, sev2, sev3 } = result.counts;
  const blocked = sev1 + sev2 + (strict ? sev3 : 0) > 0;
  return { go: !blocked, label: blocked ? 'NO-GO' : 'GO', exitCode: blocked ? 1 : 0 };
}
