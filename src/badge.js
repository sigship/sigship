// The badge for a site: the Self-checked embed code with no account, or the Deep self-check one with a licence key.
// Without a key this file makes no network call. With one it sends the key and the site's host name, nothing else.
import { verifyUrl as makeVerifyUrl, badgeId, host } from './badge-id.js';

export { badgeId, host };

const API = 'https://api.sigship.dev/v1/badge';
const TIMEOUT_MS = 8000;

const WORDS = { S: 'Self-checked', D: 'Deep self-check' };

export const badgeUrl = (id) => `https://sigship.dev/b/${id}.svg`;
export const verifyUrl = makeVerifyUrl;

// The same code the badge page on sigship.dev shows, so the two never disagree.
export function embedCode(id, site) {
  const words = WORDS[id[3]] ?? 'Checked';
  return `<a href="${verifyUrl(id, site)}" title="Check this SIGSHIP badge">\n  <img src="${badgeUrl(id)}"\n       alt="${words} with SIGSHIP, badge ${id}" height="32">\n</a>`;
}

function badgeApi(env) {
  if (!env.SIGSHIP_API) return API;
  try {
    return new URL('/v1/badge', env.SIGSHIP_API).href;
  } catch {
    return API;
  }
}

// Returns { id, level, site, embed, verify, message? }. Level S needs no account and no network.
// With SIGSHIP_KEY, registers the site for Deep self-check (level D) on the licence server; if that
// fails, falls back to the Self-checked badge and says why.
export async function badge(site, { env = process.env, fetch = globalThis.fetch } = {}) {
  const name = host(site);
  if (!name) throw new Error('Give the site the badge is for, for example: npx sigship badge myapp.com');
  const self = (message) => {
    const id = badgeId('S', name);
    return { id, level: 'S', site: name, embed: embedCode(id, name), verify: verifyUrl(id, name), ...(message ? { message } : {}) };
  };
  const key = env.SIGSHIP_KEY?.trim();
  if (!key) return self();

  let response;
  try {
    response = await fetch(badgeApi(env), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, site: name }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return self('Could not reach the SIGSHIP server, so this is the Self-checked badge. Try again for the Deep self-check one.');
  }
  let data = {};
  try {
    data = await response.json();
  } catch {
    // The status says enough.
  }
  if (!response.ok) {
    const reason = typeof data.error === 'string' ? data.error.replaceAll(key, '[key]') : response.status === 401 || response.status === 403 ? 'Your SIGSHIP_KEY was not accepted.' : 'The SIGSHIP server had a problem.';
    return self(`${reason} This is the Self-checked badge.`);
  }
  const id = typeof data.id === 'string' ? data.id : badgeId('D', name);
  const level = typeof data.level === 'string' ? data.level : 'D';
  return { id, level, site: name, embed: embedCode(id, name), verify: verifyUrl(id, name) };
}

// What the badge command prints.
export function badgeText({ id, level, site, embed, verify, message }) {
  const out = [];
  if (message) out.push(message, '');
  out.push(`${WORDS[level] ?? 'SIGSHIP'} badge ${id} for ${site}. Paste this into your site's footer:`, '', embed, '', `Anyone can check it at ${verify}`);
  if (level === 'S') out.push('The Self-checked badge says you ran SIGSHIP yourself. With a licence key, npx sigship badge registers the site for Deep self-check.');
  return out.join('\n');
}
