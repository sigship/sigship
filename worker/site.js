// The sigship.dev Worker. It serves the static site and takes waitlist sign-ups.
// Sign-ups go to a Google Sheet through an Apps Script web app. Its address is the Worker secret
// WAITLIST_URL and never appears in the page. WAITLIST_SECRET is an optional second lock.
// 'lookout' is the Monday notice from /lookout/, kept in the same sheet.
const PLANS = new Set(['pro', 'business', 'solo', 'team', 'agency', 'lookout']);
const TOOLS = new Set(['lovable', 'bolt', 'replit', 'v0', 'cursor', 'claude-code', 'codex', 'copilot', 'windsurf', 'other']);
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;
// A real person takes a few seconds to fill the form. Bots post at once.
const MIN_FILL_MS = 2500;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (value, max) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '');
// A cell that starts with = + - or @ runs as a formula in Google Sheets. A leading quote keeps it plain text.
const cell = (text) => (/^[=+\-@]/.test(text) ? `'${text}` : text);

async function readForm(request) {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return { data: await request.json(), wantsJson: true };
  const form = await request.formData();
  return { data: Object.fromEntries(form), wantsJson: false };
}

export async function waitlist(request, env, { fetch = globalThis.fetch, now = Date.now } = {}) {
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
    wantsJson ? json(ok ? { ok: true } : { error }, status) : Response.redirect(new URL(`/?waitlist=${ok ? 'ok' : 'error'}#waitlist`, request.url).toString(), 303);

  // Bots fill the hidden field or post too fast. Tell them it worked and keep nothing.
  if (clean(data.website, 200)) return reply(200, true);
  const started = Number(data.started);
  if (Number.isFinite(started) && now() - started < MIN_FILL_MS) return reply(200, true);

  const email = clean(data.email, 254).toLowerCase();
  const plan = clean(data.plan, 20).toLowerCase();
  const tool = clean(data.tool, 20).toLowerCase();
  if (!EMAIL.test(email)) return reply(400, false, 'Enter a valid email address.');
  if (!PLANS.has(plan)) return reply(400, false, 'Choose a plan.');

  if (!env.WAITLIST_URL) return reply(503, false, 'The waitlist is not open yet. Email support@sigship.dev and we will add you.');

  const row = {
    ...(env.WAITLIST_SECRET ? { secret: env.WAITLIST_SECRET } : {}),
    email: cell(email),
    name: cell(clean(data.name, 80)),
    plan,
    tool: TOOLS.has(tool) ? tool : '',
    country: clean(request.headers.get('cf-ipcountry') ?? '', 4),
    at: new Date(now()).toISOString(),
  };
  try {
    const res = await fetch(env.WAITLIST_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(row), redirect: 'follow' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.ok !== true) return reply(502, false, 'Something went wrong on our side. Try again in a minute.');
  } catch {
    return reply(502, false, 'Something went wrong on our side. Try again in a minute.');
  }
  return reply(200, true);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/waitlist') return waitlist(request, env);
    return env.ASSETS.fetch(request);
  },
};
