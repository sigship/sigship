// Loads the Pro pack for Solo and Team. Without SIGSHIP_KEY this does nothing and makes no network call.
// With a key it sends the key and a one-way repo fingerprint, never code, file names or findings.
// A network problem never fails a scan: it falls back to the cache, then to the free checks.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { compilePack } from './pack.js';

const API = 'https://api.sigship.dev/v1/pack';
const DAY_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// The repo's git address, stripped of protocol, login and .git, so every clone of a repo matches.
function repoAddress(root) {
  try {
    const url = execFileSync('git', ['-C', root, 'config', '--get', 'remote.origin.url'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (url) {
      return url
        .replace(/^[a-z+]+:\/\//i, '')
        .replace(/^[^@/]+@/, '')
        .replace(':', '/')
        .replace(/\.git$/i, '')
        .replace(/\/+$/, '')
        .toLowerCase();
    }
  } catch {
    // Not a git repo, or no remote. The folder path stands in for it.
  }
  return resolve(root);
}

// Mixed with the key, so the fingerprint can't be matched to a repo by anyone without the key.
export const repoFingerprint = (root, key) => sha256(`${key}\n${repoAddress(root)}`);

function cacheFile(key, repo, env) {
  const base = env.XDG_CACHE_HOME || join(homedir(), '.cache');
  return join(base, 'sigship', `pack-${sha256(`${key}\n${repo}`).slice(0, 24)}.json`);
}

function readCache(file) {
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    return { pack: saved.pack, age: Date.now() - saved.savedAt };
  } catch {
    return null;
  }
}

function fromPack(pack, status, message) {
  try {
    return { rules: compilePack(pack), status, message };
  } catch (error) {
    return { rules: [], status: 'free', message: `${error.message} Ran the free checks.` };
  }
}

export async function loadPro(target = '.', { env = process.env, fetch = globalThis.fetch } = {}) {
  const key = env.SIGSHIP_KEY?.trim();
  if (!key) return { rules: [], status: 'off' };

  const repo = repoFingerprint(resolve(target), key);
  const file = cacheFile(key, repo, env);
  const cached = readCache(file);
  if (cached && cached.age < DAY_MS) return fromPack(cached.pack, 'cached');

  let response;
  try {
    response = await fetch(env.SIGSHIP_API || API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, repo }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    if (cached) return fromPack(cached.pack, 'cached', 'Could not reach the SIGSHIP server, so the Pro pack came from your last download.');
    return { rules: [], status: 'free', message: 'Could not reach the SIGSHIP server. Ran the free checks.' };
  }

  if (response.status === 401 || response.status === 403) {
    rmSync(file, { force: true });
    let reason = 'Your SIGSHIP_KEY was not accepted.';
    try {
      const body = await response.json();
      if (typeof body.error === 'string') reason = body.error.replaceAll(key, '[key]');
    } catch {
      // Keep the plain reason.
    }
    return { rules: [], status: 'rejected', message: `${reason} Ran the free checks.` };
  }

  if (!response.ok) {
    if (cached) return fromPack(cached.pack, 'cached', 'The SIGSHIP server had a problem, so the Pro pack came from your last download.');
    return { rules: [], status: 'free', message: 'The SIGSHIP server had a problem. Ran the free checks.' };
  }

  let pack;
  try {
    ({ pack } = await response.json());
  } catch {
    return { rules: [], status: 'free', message: 'The SIGSHIP server sent a reply SIGSHIP could not read. Ran the free checks.' };
  }
  const loaded = fromPack(pack, 'live');
  if (loaded.status === 'live') {
    try {
      if (!existsSync(join(file, '..'))) mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, JSON.stringify({ savedAt: Date.now(), pack }));
    } catch {
      // A read-only home folder only means no cache.
    }
  }
  return loaded;
}

export const hasPro = (pro) => pro.status === 'live' || pro.status === 'cached';
