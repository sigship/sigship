import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import site, { waitlist } from '../worker/site.js';

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

const post = (body, json = true) =>
  new Request('https://sigship.dev/api/waitlist', {
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
