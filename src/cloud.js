// Sign in to SIGSHIP Cloud from the terminal, and report each run's verdict once signed in.
// Without a saved token this file makes no network call at all. With one, a scan sends only
// its verdict and counts: never code, file names or findings. SIGSHIP_NO_REPORT=1 turns that off.
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { repoFingerprint } from './pro.js';
import { verdict } from './engine.js';

export const APP = 'https://app.sigship.dev/api/v1';
const TIMEOUT_MS = 8000;
const REPORT_TIMEOUT_MS = 4000;

// The same cache folder the Pro pack uses: $XDG_CACHE_HOME/sigship or ~/.cache/sigship.
export const cacheDir = (env = process.env) => join(env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'sigship');
export const tokenFile = (env = process.env) => join(cacheDir(env), 'token');
export const appUrl = (env = process.env) => (env.SIGSHIP_APP || APP).replace(/\/+$/, '');

export function readToken(env = process.env) {
  try {
    const token = readFileSync(tokenFile(env), 'utf8').trim();
    return token || null;
  } catch {
    return null;
  }
}

function saveToken(token, env) {
  const file = tokenFile(env);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, token + '\n', { mode: 0o600 });
  chmodSync(file, 0o600); // writeFileSync keeps the old mode of a file that already exists.
  return file;
}

async function call(base, path, { method = 'GET', body, token, fetch, timeout = TIMEOUT_MS } = {}) {
  const headers = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
  let data = {};
  try {
    data = await response.json();
  } catch {
    // An empty or non-JSON reply. The status says enough.
  }
  return { ok: response.ok, status: response.status, data };
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

// The device-code flow: the terminal shows a short code, the person types it into the app, the terminal polls until approved.
export async function login({ env = process.env, fetch = globalThis.fetch, open = () => {}, log = console.log, sleep = wait } = {}) {
  const base = appUrl(env);
  const start = await call(base, '/device', { method: 'POST', body: {}, fetch });
  if (!start.ok || typeof start.data.code !== 'string') throw new Error(start.data.error || 'SIGSHIP Cloud could not start a sign-in. Try again in a minute.');
  const { code, user_code: userCode, verify_url: verifyUrl, expires_in: expiresIn = 600, interval = 5 } = start.data;

  log(`Open ${verifyUrl} and enter this code: ${userCode}`);
  log('Waiting for you to approve it in the browser…');
  open(verifyUrl);

  const deadline = Date.now() + expiresIn * 1000;
  let token;
  while (Date.now() < deadline) {
    await sleep(Math.max(1, interval) * 1000);
    const poll = await call(base, '/device/poll', { method: 'POST', body: { code }, fetch });
    if (poll.ok && poll.data.status === 'ok' && typeof poll.data.token === 'string') {
      token = poll.data.token;
      break;
    }
    if (poll.ok && poll.data.status === 'pending') continue;
    if (poll.status === 429) continue; // Slow down; the next poll waits another interval.
    throw new Error(poll.data.error || 'The sign-in was not approved. Run npx sigship login again.');
  }
  if (!token) throw new Error('The code expired before it was approved. Run npx sigship login again.');

  const file = saveToken(token, env);
  const me = await call(base, '/me', { token, fetch });
  const email = me.ok ? me.data.user?.email || me.data.account?.email : undefined;
  log(email ? `Signed in as ${email}.` : 'Signed in.');
  log(`The token is in ${file}. Each check now reports its verdict to SIGSHIP Cloud; set SIGSHIP_NO_REPORT=1 to stop that, or run npx sigship logout.`);
  return { email, file };
}

export function logout({ env = process.env } = {}) {
  const file = tokenFile(env);
  const had = existsSync(file);
  rmSync(file, { force: true });
  return had;
}

// What a run sends, in the open: a one-way repo fingerprint, the version, the counts, the verdict,
// the date and the folder's name. Never code, file names or findings.
export function runReport(result, { root, version, token, now = new Date() } = {}) {
  const full = resolve(root);
  return {
    fingerprint: repoFingerprint(full, token),
    version,
    counts: { sev1: result.counts.sev1, sev2: result.counts.sev2, sev3: result.counts.sev3 },
    verdict: verdict(result).label,
    date: now.toISOString(),
    name: basename(full),
  };
}

// Reports a run to SIGSHIP Cloud. Silent and never throws, so it can neither block nor fail a scan.
// Does nothing without a saved token or with SIGSHIP_NO_REPORT set.
export async function reportRun(result, { root, version, env = process.env, fetch = globalThis.fetch } = {}) {
  if (env.SIGSHIP_NO_REPORT && env.SIGSHIP_NO_REPORT !== '0') return false;
  const token = readToken(env);
  if (!token) return false;
  try {
    const sent = await call(appUrl(env), '/runs', { method: 'POST', body: runReport(result, { root, version, token }), token, fetch, timeout: REPORT_TIMEOUT_MS });
    return sent.ok;
  } catch {
    return false;
  }
}
