import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import site, { badge, lookout, waitlist } from '../worker/site.js';
import { OWN_ID, badgeId } from '../scripts/badge-id.js';

const ENV = { WAITLIST_URL: 'https://script.example/exec', WAITLIST_SECRET: 'test-shared-secret' };
const NOW = () => 1_800_000_000_000;
const started = String(NOW() - 10_000);

function sheet(reply = { status: 200, body: { ok: true } }) {
  const rows = [];
  const fetch = async (url, init) => {
    if (reply === 'down') throw new Error('network');
    rows.push({ url, row: JSON.parse(init.body) });
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  };
  return { fetch, rows };
}

const post = (body, json = true, path = '/api/waitlist') =>
  new Request(`https://sigship.dev${path}`, {
    method: 'POST',
    headers: json ? { 'content-type': 'application/json', 'cf-ipcountry': 'IN' } : {},
    body: json ? JSON.stringify(body) : new URLSearchParams(body),
  });

const good = { email: 'Maker@Example.com', name: 'Asha', plan: 'team', tool: 'lovable', started };

describe('waitlist', () => {
  it('adds a sign-up to the sheet with the shared secret', async () => {
    const s = sheet();
    const res = await waitlist(post(good), ENV, { fetch: s.fetch, now: NOW });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(s.rows.length, 1);
    const { url, row } = s.rows[0];
    assert.equal(url, ENV.WAITLIST_URL);
    assert.equal(row.secret, ENV.WAITLIST_SECRET);
    assert.equal(row.email, 'maker@example.com');
    assert.equal(row.plan, 'team');
    assert.equal(row.tool, 'lovable');
    assert.equal(row.country, 'IN');
  });

  it('never sends the secret or sheet address back to the visitor', async () => {
    for (const reply of [{ status: 200, body: { ok: true } }, { status: 500, body: {} }, 'down']) {
      const text = await (await waitlist(post(good), ENV, { fetch: sheet(reply).fetch, now: NOW })).text();
      assert.ok(!text.includes(ENV.WAITLIST_SECRET) && !text.includes(ENV.WAITLIST_URL));
    }
  });

  it('rejects a bad email or plan without calling the sheet', async () => {
    const s = sheet();
    assert.equal((await waitlist(post({ ...good, email: 'nope' }), ENV, { fetch: s.fetch, now: NOW })).status, 400);
    assert.equal((await waitlist(post({ ...good, plan: 'free' }), ENV, { fetch: s.fetch, now: NOW })).status, 400);
    assert.equal((await waitlist(post({ ...good, plan: 'business' }), ENV, { fetch: sheet().fetch, now: NOW })).status, 200);
    assert.equal(s.rows.length, 0);
  });

  it('quietly drops bots that fill the hidden field or post too fast', async () => {
    const s = sheet();
    const honeypot = await waitlist(post({ ...good, website: 'spam.example' }), ENV, { fetch: s.fetch, now: NOW });
    const fast = await waitlist(post({ ...good, started: String(NOW() - 500) }), ENV, { fetch: s.fetch, now: NOW });
    assert.equal(honeypot.status, 200);
    assert.equal(fast.status, 200);
    assert.equal(s.rows.length, 0);
  });

  it('strips markup and drops unknown tools', async () => {
    const s = sheet();
    await waitlist(post({ ...good, name: '<script>x</script>Asha', tool: 'evil' }), ENV, { fetch: s.fetch, now: NOW });
    assert.equal(s.rows[0].row.name, 'scriptx/scriptAsha');
    assert.equal(s.rows[0].row.tool, '');
  });

  it('keeps names from running as formulas in the sheet', async () => {
    const s = sheet();
    await waitlist(post({ ...good, name: '=HYPERLINK("x")' }), ENV, { fetch: s.fetch, now: NOW });
    assert.equal(s.rows[0].row.name, `'=HYPERLINK("x")`);
  });

  it('works with only the sheet address, sending no secret', async () => {
    const s = sheet();
    const res = await waitlist(post(good), { WAITLIST_URL: ENV.WAITLIST_URL }, { fetch: s.fetch, now: NOW });
    assert.equal(res.status, 200);
    assert.equal('secret' in s.rows[0].row, false);
  });

  it('says the waitlist is not open when the secrets are missing', async () => {
    const res = await waitlist(post(good), {}, { fetch: sheet().fetch, now: NOW });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /support@sigship.dev/);
  });

  it('reports a sheet problem without losing the visitor', async () => {
    assert.equal((await waitlist(post(good), ENV, { fetch: sheet('down').fetch, now: NOW })).status, 502);
    assert.equal((await waitlist(post(good), ENV, { fetch: sheet({ status: 200, body: { ok: false } }).fetch, now: NOW })).status, 502);
  });

  it('works for a plain form post with no JavaScript', async () => {
    const res = await waitlist(post(good, false), ENV, { fetch: sheet().fetch, now: NOW });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('location'), 'https://sigship.dev/?waitlist=ok#waitlist');
  });

  it('only accepts POST', async () => {
    const res = await waitlist(new Request('https://sigship.dev/api/waitlist'), ENV);
    assert.equal(res.status, 405);
  });

  it('serves every other path from the static site', async () => {
    const env = { ASSETS: { fetch: async (req) => new Response(`asset ${new URL(req.url).pathname}`) } };
    const res = await site.fetch(new Request('https://sigship.dev/brand/'), env);
    assert.equal(await res.text(), 'asset /brand/');
  });
});

describe('lookout sign-up', () => {
  const LOOKOUT_API = 'https://app.sigship.dev/api/v1/lookout/subscribe';
  const entry = { email: 'reader@example.com', started };
  const lp = (body, json = true) => post(body, json, '/api/lookout');

  it('forwards to the cloud API when LOOKOUT_API is set, and never to the sheet', async () => {
    const calls = [];
    const fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response('{"ok":true}', { status: 200 }); };
    const res = await lookout(lp(entry), { ...ENV, LOOKOUT_API }, { fetch, now: NOW });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, LOOKOUT_API);
    assert.deepEqual(calls[0].body, { email: 'reader@example.com', source: 'sigship.dev', country: 'IN' });
  });

  it('falls back to the sheet as plan "lookout" when LOOKOUT_API is not set', async () => {
    const s = sheet();
    const res = await lookout(lp(entry), ENV, { fetch: s.fetch, now: NOW });
    assert.equal(res.status, 200);
    assert.equal(s.rows.length, 1);
    assert.equal(s.rows[0].url, ENV.WAITLIST_URL);
    assert.equal(s.rows[0].row.plan, 'lookout');
    assert.equal(s.rows[0].row.email, 'reader@example.com');
    assert.equal(s.rows[0].row.secret, ENV.WAITLIST_SECRET);
  });

  it('rejects a bad email, drops bots, and reports an API problem', async () => {
    const calls = [];
    const fetch = async () => { calls.push(1); return new Response('', { status: 500 }); };
    assert.equal((await lookout(lp({ ...entry, email: 'nope' }), { LOOKOUT_API }, { fetch, now: NOW })).status, 400);
    assert.equal((await lookout(lp({ ...entry, website: 'spam' }), { LOOKOUT_API }, { fetch, now: NOW })).status, 200);
    assert.equal(calls.length, 0);
    assert.equal((await lookout(lp(entry), { LOOKOUT_API }, { fetch, now: NOW })).status, 502);
    assert.equal((await lookout(lp(entry), { LOOKOUT_API }, { fetch: async () => { throw new Error('down'); }, now: NOW })).status, 502);
    assert.equal((await lookout(lp(entry), {}, { fetch, now: NOW })).status, 503);
  });

  it('sends a plain form post back to the Lookout page', async () => {
    const res = await lookout(lp(entry, false), ENV, { fetch: sheet().fetch, now: NOW });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('location'), 'https://sigship.dev/lookout/?lookout=ok#lookout');
  });

  it('is routed at /api/lookout', async () => {
    // No list configured, so the Worker answers 503 before touching the network.
    const env = { ASSETS: { fetch: async () => new Response('asset') } };
    const res = await site.fetch(lp({ email: entry.email }), env);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /support@sigship.dev/);
  });
});

describe('badge pictures', () => {
  const RECORDS = {};
  const api = (opts = {}) => {
    const calls = [];
    const fetch = async (url) => {
      calls.push(url);
      if (opts.down) throw new Error('network');
      const id = url.split('/').pop();
      const rec = RECORDS[`${url.includes('api.sigship.dev') ? 'licence:' : ''}${id}`];
      return rec ? new Response(JSON.stringify(rec), { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('{"error":"not found"}', { status: 404 });
    };
    return { fetch, calls };
  };
  const NOW_DATE = Date.UTC(2026, 10, 10); // 10 Nov 2026

  it('draws a self-checked badge from the formula, without any lookup', async () => {
    const id = badgeId('S', 'myapp.com');
    const a = api();
    const res = await badge(`/b/${id}.svg`, {}, { fetch: a.fetch, now: () => NOW_DATE });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /svg/);
    const svg = await res.text();
    assert.match(svg, new RegExp(id));
    assert.match(svg, /Self-checked/);
    assert.equal(a.calls.length, 0);
  });

  it('draws issued levels from the badge record, cached for five minutes', async () => {
    const id = badgeId('L', 'plantpal.app');
    RECORDS[id] = { id, level: 'live', state: 'live', site: 'plantpal.app', lastPass: '2026-11-10T02:00:00Z', streakSince: '2026-09-29T00:00:00Z' };
    const a = api();
    const res = await badge(`/b/${id}.svg`, {}, { fetch: a.fetch, now: () => NOW_DATE });
    const svg = await res.text();
    assert.deepEqual(a.calls, [`https://app.sigship.dev/api/v1/badges/${id}`]);
    assert.match(svg, /42 days clean/);
    assert.equal(res.headers.get('cache-control'), 'public, max-age=300');
    const daily = badgeId('C', 'invoicely.io');
    RECORDS[daily] = { id: daily, level: 'daily', state: 'live', site: 'invoicely.io', lastPass: '2026-11-09T02:00:00Z' };
    assert.match(await (await badge(`/b/${daily}.svg`, {}, { fetch: api().fetch, now: () => NOW_DATE })).text(), /Checked daily · 9 Nov/);
  });

  it('draws a grey badge when the record is missing, paused or revoked', async () => {
    const missing = badgeId('C', 'nobody.example');
    assert.match(await (await badge(`/b/${missing}.svg`, {}, { fetch: api().fetch })).text(), /Not issued/);
    assert.match(await (await badge(`/b/${missing}.svg`, {}, { fetch: api({ down: true }).fetch })).text(), /Not issued/);
    const paused = badgeId('L', 'paused.example');
    RECORDS[paused] = { id: paused, level: 'live', state: 'paused', site: 'paused.example' };
    assert.match(await (await badge(`/b/${paused}.svg`, {}, { fetch: api().fetch })).text(), /paused/);
    const revoked = badgeId('X', 'revoked.example');
    RECORDS[revoked] = { id: revoked, level: 'expert', state: 'revoked', site: 'revoked.example' };
    assert.match(await (await badge(`/b/${revoked}.svg`, {}, { fetch: api().fetch })).text(), /Revoked/);
    // A record whose level disagrees with the ID's letter is not trusted.
    const wrong = badgeId('T', 'wrong.example');
    RECORDS[wrong] = { id: wrong, level: 'self', state: 'live', site: 'wrong.example' };
    assert.match(await (await badge(`/b/${wrong}.svg`, {}, { fetch: api().fetch })).text(), /Not issued/);
  });

  it('asks the licence Worker for a Deep self-check record when the cloud API has none', async () => {
    const id = badgeId('D', 'studio.example');
    RECORDS[`licence:${id}`] = { id, level: 'deep', state: 'live', site: 'studio.example' };
    const a = api();
    const svg = await (await badge(`/b/${id}.svg`, {}, { fetch: a.fetch })).text();
    assert.deepEqual(a.calls, [`https://app.sigship.dev/api/v1/badges/${id}`, `https://api.sigship.dev/v1/badge/${id}`]);
    assert.match(svg, /Deep self-check/);
    // Anyone cannot get a Deep self-check badge just by asking.
    assert.match(await (await badge(`/b/${badgeId('D', 'anyone.example')}.svg`, {}, { fetch: api().fetch })).text(), /Not issued/);
  });

  it('draws sigship.dev’s own Live-checked badge even before the record store exists', async () => {
    assert.equal(OWN_ID[3], 'L');
    const svg = await (await badge(`/b/${OWN_ID}.svg`, {}, { fetch: api().fetch })).text();
    assert.match(svg, /Live-checked/);
    assert.doesNotMatch(svg, /Not issued/);
    assert.match(await (await badge(`/b/${badgeId('T', 'other.com')}.svg`, {}, { fetch: api().fetch })).text(), /Not issued/);
  });

  it('refuses anything that is not an ID', async () => {
    assert.equal((await badge('/b/<script>.svg', {}, { fetch: api().fetch })).status, 404);
    assert.equal((await badge('/b/SG-S-AAAAAA.png', {}, { fetch: api().fetch })).status, 404);
  });
});
