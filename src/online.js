// The one free check that uses the network, and only with --online. It sends the name and version of
// every package in package.json and the lockfile to OSV (https://osv.dev), nothing else: no code, no
// file names, no findings, no key. A network problem adds a warning and never fails the scan.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { lockedVersion, parseVersion } from './pack.js';

export const OSV_URL = 'https://api.osv.dev/v1/querybatch';
const BATCH = 1000;
const TIMEOUT_MS = 10000;

export const VULNERABLE_PACKAGE = {
  id: 'vulnerable-package',
  severity: 2,
  title: 'A package you use has a known vulnerability',
  forecast: 'The hole is public, with a write-up, so the first scanner that finds your site walks in through it.',
  fix: 'Update the package to a fixed version (npm update <name>, or change the version in package.json) and redeploy. If no fix exists yet, look for a replacement.',
};

const LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];

// The packages to ask about: every package in package-lock.json, else every direct dependency with the
// version the lockfile pins or the lowest version package.json allows.
export function packagesFrom(files) {
  const pkgFile = files.find((f) => f.path === 'package.json');
  let pkg = null;
  try {
    pkg = pkgFile ? JSON.parse(pkgFile.text) : null;
  } catch {
    pkg = null;
  }
  const out = new Map();
  const add = (name, version) => {
    const v = parseVersion(version);
    if (name && v && !out.has(`${name}@${v.join('.')}`)) out.set(`${name}@${v.join('.')}`, { name, version: v.join('.') });
  };
  const lock = files.find((f) => f.path === 'package-lock.json');
  if (lock) {
    try {
      const data = JSON.parse(lock.text);
      for (const [path, entry] of Object.entries(data.packages ?? {})) {
        const name = path.split('node_modules/').pop();
        if (path && entry?.version && !entry.link) add(name, entry.version);
      }
      for (const [name, entry] of Object.entries(data.dependencies ?? {})) if (entry?.version) add(name, entry.version);
    } catch {
      // Fall through to package.json.
    }
  }
  const direct = { ...pkg?.dependencies, ...pkg?.devDependencies };
  for (const [name, range] of Object.entries(direct)) add(name, lockedVersion(files, name) ?? range);
  return [...out.values()];
}

const lineOfKey = (text, name) => {
  const index = text.search(new RegExp(`"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`));
  return index < 0 ? 1 : text.slice(0, index).split('\n').length;
};

// Asks OSV about the packages and turns each vulnerable one into a SEV-2 finding.
export async function vulnerablePackages(files, { fetch = globalThis.fetch, url = OSV_URL } = {}) {
  const packages = packagesFrom(files);
  const sent = packages.map((p) => ({ name: p.name, version: p.version }));
  if (!packages.length) return { findings: [], warnings: [], sent };
  const pkgText = files.find((f) => f.path === 'package.json')?.text ?? '';
  const results = [];
  for (let i = 0; i < packages.length; i += BATCH) {
    const chunk = packages.slice(i, i + BATCH);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queries: chunk.map((p) => ({ package: { name: p.name, ecosystem: 'npm' }, version: p.version })) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      if (!Array.isArray(body.results)) throw new Error('bad reply');
      results.push(...body.results);
    } catch {
      return { findings: [], warnings: ['Could not reach OSV, so the known-vulnerability check did not run. The other checks did.'], sent };
    }
  }
  const findings = [];
  results.forEach((r, i) => {
    const vulns = (r?.vulns ?? []).filter((v) => typeof v?.id === 'string');
    if (!vulns.length) return;
    const { name, version } = packages[i];
    const ids = vulns.map((v) => v.id);
    const shown = ids.slice(0, 3).join(', ') + (ids.length > 3 ? ` and ${ids.length - 3} more` : '');
    findings.push({ ...VULNERABLE_PACKAGE, file: 'package.json', line: lineOfKey(pkgText, name), detail: `${name} ${version}: ${shown}. See https://osv.dev/vulnerability/${ids[0]}` });
  });
  return { findings, warnings: [], sent };
}

// Reads package.json and the lockfiles from a folder, for the CLI.
export function packageFiles(target = '.') {
  const root = resolve(target);
  return ['package.json', ...LOCKFILES].filter((name) => existsSync(join(root, name))).map((path) => ({ path, text: readFileSync(join(root, path), 'utf8') }));
}
