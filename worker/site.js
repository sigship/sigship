// The sigship.dev Worker. It serves the static site, takes waitlist and Lookout sign-ups, and draws badge pictures at /b/<ID>.svg.
import { ID_RE, OWN_ID, OWN_SITE, badgeSvg } from '../scripts/badge-id.js';
// Sign-ups go to a Google Sheet through an Apps Script web app. Its address is the Worker secret
// WAITLIST_URL and never appears in the page. WAITLIST_SECRET is an optional second lock.
// 'lookout' is the Monday notice from /lookout/. It goes to the cloud API when LOOKOUT_API is set
// (the subscribe address, https://app.sigship.dev/api/v1/lookout/subscribe), otherwise to the same sheet.
const PLANS = new Set(['pro', 'business', 'solo', 'team', 'agency', 'cloud', 'lookout']);
const TOOLS = new Set(['lovable', 'bolt', 'replit', 'v0', 'cursor', 'claude-code', 'codex', 'copilot', 'windsurf', 'other']);
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;
// A real person takes a few seconds to fill the form. Bots post at once.
const MIN_FILL_MS = 2500;
// Badge records live in the cloud API; Deep self-check records also in the licence Worker until the cloud API exists.
const BADGE_API = 'https://app.sigship.dev/api/v1/badges/';
const LICENCE_BADGE_API = 'https://api.sigship.dev/v1/badge/';
const RECORD_TTL = 300;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (value, max) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '');
// A cell that starts with = + - or @ runs as a formula in Google Sheets. A leading quote keeps it plain text.
const cell = (text) => (/^[=+\-@]/.test(text) ? `'${text}` : text);
const SORRY = 'Something went wrong on our side. Try again in a minute.';

async function readForm(request) {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return { data: await request.json(), wantsJson: true };
  const form = await request.formData();
  return { data: Object.fromEntries(form), wantsJson: false };
}

// Shared by the waitlist and the Lookout form: read the entry, drop bots, check the email.
// Returns { data, reply } or a Response to send straight back.
async function intake(request, { now, back, key }) {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let data;
  let wantsJson;
  try {
    ({ data, wantsJson } = await readForm(request));
  } catch {
    return json({ error: 'Send the form again.' }, 400);
  }
  // Plain HTML form posts (no JavaScript) get sent back to the page with the result in the address.
  const reply = (status, ok, error) =>
    wantsJson ? json(ok ? { ok: true } : { error }, status) : Response.redirect(new URL(`${back}?${key}=${ok ? 'ok' : 'error'}#${key}`, request.url).toString(), 303);
  // Bots fill the hidden field or post too fast. Tell them it worked and keep nothing.
  if (clean(data.website, 200)) return reply(200, true);
  const started = Number(data.started);
  if (Number.isFinite(started) && now() - started < MIN_FILL_MS) return reply(200, true);
  const email = clean(data.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return reply(400, false, 'Enter a valid email address.');
  return { data, email, reply };
}

async function toSheet(row, env, fetch) {
  try {
    const res = await fetch(env.WAITLIST_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...(env.WAITLIST_SECRET ? { secret: env.WAITLIST_SECRET } : {}), ...row }), redirect: 'follow' });
    const body = await res.json().catch(() => ({}));
    return res.ok && body.ok === true;
  } catch {
    return false;
  }
}

export async function waitlist(request, env, { fetch = globalThis.fetch, now = Date.now } = {}) {
  const in_ = await intake(request, { now, back: '/', key: 'waitlist' });
  if (in_ instanceof Response) return in_;
  const { data, email, reply } = in_;
  const plan = clean(data.plan, 20).toLowerCase();
  const tool = clean(data.tool, 20).toLowerCase();
  if (!PLANS.has(plan)) return reply(400, false, 'Choose a plan.');
  if (!env.WAITLIST_URL) return reply(503, false, 'The waitlist is not open yet. Email support@sigship.dev and we will add you.');
  let link = clean(data.link, 200);
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link && !/^https?:\/\/[\w.-]+\.[a-z]{2,}(?:[/?#][^\s]*)?$/i.test(link)) return reply(400, false, 'The link should look like https://yourapp.com.');
  const row = { email: cell(email), name: cell(clean(data.name, 80)), building: cell(clean(data.building, 300)), link: cell(link), plan, tool: TOOLS.has(tool) ? tool : '', country: clean(request.headers.get('cf-ipcountry') ?? '', 4), at: new Date(now()).toISOString() };
  return (await toSheet(row, env, fetch)) ? reply(200, true) : reply(502, false, SORRY);
}

// The Monday notice sign-up from /lookout/. The cloud API confirms the address by email (double opt-in) once LOOKOUT_API is set.
export async function lookout(request, env, { fetch = globalThis.fetch, now = Date.now } = {}) {
  const in_ = await intake(request, { now, back: '/lookout/', key: 'lookout' });
  if (in_ instanceof Response) return in_;
  const { email, reply } = in_;
  const country = clean(request.headers.get('cf-ipcountry') ?? '', 4);
  if (env.LOOKOUT_API) {
    try {
      const res = await fetch(env.LOOKOUT_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, source: 'sigship.dev', country }) });
      if (res.status === 400) return reply(400, false, 'Enter a valid email address.');
      if (!res.ok) return reply(502, false, SORRY);
      return reply(200, true);
    } catch {
      return reply(502, false, SORRY);
    }
  }
  if (!env.WAITLIST_URL) return reply(503, false, 'The list is not open yet. Email support@sigship.dev and we will add you.');
  const row = { email: cell(email), name: '', plan: 'lookout', tool: '', country, at: new Date(now()).toISOString() };
  return (await toSheet(row, env, fetch)) ? reply(200, true) : reply(502, false, SORRY);
}

// The badge record for an issued level, from the cloud API, with the licence Worker as the second source for Deep self-check.
// Cached for five minutes at the edge. A missing or broken record is null, which draws the grey "not issued" badge.
async function record(id, env, fetch) {
  const sources = [`${env.BADGE_API || BADGE_API}${id}`];
  if (id[3] === 'D') sources.push(`${env.LICENCE_BADGE_API || LICENCE_BADGE_API}${id}`);
  for (const url of sources) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' }, cf: { cacheTtl: RECORD_TTL, cacheEverything: true } });
      if (!res.ok) continue;
      const rec = await res.json();
      if (rec && rec.id === id && typeof rec.level === 'string') return rec;
    } catch { /* next source */ }
  }
  return null;
}

// Self-checked (S) badges for any site come from the formula. Every other level comes from its record.
// sigship.dev's own Live-checked badge is drawn here when the record store has nothing yet.
export async function badge(pathname, env = {}, { fetch = globalThis.fetch, now = Date.now } = {}) {
  const id = decodeURIComponent(pathname.slice(3, -4)).toUpperCase();
  const headers = { 'content-type': 'image/svg+xml; charset=utf-8', 'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" };
  if (!pathname.endsWith('.svg') || !ID_RE.test(id)) return new Response('Not a SIGSHIP badge.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (id[3] === 'S') return new Response(badgeSvg(id), { headers: { ...headers, 'cache-control': 'public, max-age=86400' } });
  let rec = await record(id, env, fetch);
  if (!rec && id === OWN_ID) rec = { id, level: 'L', state: 'live', site: OWN_SITE };
  return new Response(badgeSvg(id, rec, now()), { headers: { ...headers, 'cache-control': `public, max-age=${RECORD_TTL}` } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/waitlist') return waitlist(request, env);
    if (url.pathname === '/api/lookout') return lookout(request, env);
    if (url.pathname.startsWith('/b/')) return badge(url.pathname, env);
    return env.ASSETS.fetch(request);
  },
};
