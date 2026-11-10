// Loads a project from disk, then hands it to the engine. Everything that touches the file system
// or git lives here, so src/engine.js stays free of both.
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { scanFiles, verdict } from './engine.js';

export { verdict };

export const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output', '.vercel', '.turbo', 'coverage', 'vendor', '.venv', '__pycache__', '.cache']);
export const TEXT = /\.(c|m)?(j|t)sx?$|\.vue$|\.svelte$|\.astro$|\.py$|\.sql$|\.json$|\.ya?ml$|\.toml$|\.html$|\.md$|\.txt$|\.sh$|\.rules$|\.tf$|\.lock$|(^|\/)\.env(\.[a-z]+)?$/i;
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

// Reads the project: every path, which of them git tracks, and the text of each file a check can read.
export function loadContext(root) {
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
  return { root, paths, tracked, files };
}

export function scan(target = '.', { extraRules = [] } = {}) {
  const root = resolve(target);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    throw new Error(`Folder not found: ${target}`);
  }
  const started = performance.now();
  const ctx = loadContext(root);
  const result = scanFiles({ files: ctx.files, tracked: ctx.tracked, paths: ctx.paths, extraRules });
  return {
    root,
    filesRead: ctx.files.length,
    checksRun: result.checksRun,
    ms: Math.round(performance.now() - started),
    counts: result.counts,
    findings: result.findings,
    accepted: result.accepted,
    warnings: result.warnings,
  };
}
