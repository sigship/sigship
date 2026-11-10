// Badge IDs and badge pictures. Shared by the site build and the site Worker (worker/site.js), and mirrored in site/app.js.
// Every badge carries an ID like SG-S-4K7Q2M and links to its record on sigship.dev/verify/.
// The letter is the level; the six characters come from the level and the site, so an ID only fits the site it was made for.
export const LEVEL_LETTER = { self: 'S', deep: 'D', daily: 'C', live: 'L', expert: 'X', top: 'T' };
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const host = (s) => String(s || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:\s]/)[0].slice(0, 80);

export function badgeId(letter, site) {
  let h = 0x811c9dc5;
  for (const ch of `${letter}:${host(site)}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  let code = '';
  for (let i = 0; i < 6; i++) { code += B32[h & 31]; h >>>= 5; }
  return `SG-${letter}-${code}`;
}
export const ID_RE = /^SG-[SDCLXT]-[0-9A-HJKMNP-TV-Z]{6}$/;
export const verifyUrl = (id, site) => `https://sigship.dev/verify/?id=${id}&site=${encodeURIComponent(host(site))}`;

// sigship.dev's own badge: Live-checked, because the check runs on every change to this site (see /verify/).
// Not Expert-reviewed until an outside engineer signs a review.
export const OWN_SITE = 'sigship.dev';
export const OWN_LETTER = 'L';
export const OWN_ID = badgeId(OWN_LETTER, OWN_SITE);

// The pill as an SVG for embedding. One metal per level, plus grey for a badge that is paused, revoked or not issued.
const METAL = {
  S: { a: '#a3aab4', b: '#858d98', e: '#727a85', ink: '#ffffff', word: 'Self-checked', n: 1, dot: '#f5c518' },
  D: { a: '#eab07a', b: '#9a5a26', e: '#7e4519', ink: '#ffffff', word: 'Deep self-check', n: 2, dot: '#f5c518' },
  C: { a: '#e9edf2', b: '#b4bcc8', e: '#8e97a5', ink: '#1f2733', word: 'Checked daily', n: 3, dot: '#22c55e' },
  L: { a: '#fff3c2', b: '#d9a520', e: '#b98a13', ink: '#4a3200', word: 'Live-checked', n: 4, dot: '#22c55e' },
  X: { a: '#eef3fb', b: '#b7c4dc', e: '#6f81a1', ink: '#14213a', word: 'Expert-reviewed', n: 5, dot: '#22c55e' },
  T: { a: '#2c313b', b: '#06070a', e: '#8ea2bd', ink: '#eef2f8', word: 'Expert & live', n: 5, dot: '#22c55e' },
};
const GREY = { a: '#8b929c', b: '#6b727c', e: '#5a616a', ink: '#f3f4f6', n: 0, dot: '#9ca3af' };
export const LEVEL_OF = { self: 'S', deep: 'D', daily: 'C', live: 'L', expert: 'X', top: 'T', S: 'S', D: 'D', C: 'C', L: 'L', X: 'X', T: 'T' };

const month = (iso) => { const d = new Date(iso); return Number.isNaN(d) ? '' : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }); };
const day = (iso) => { const d = new Date(iso); return Number.isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); };
const days = (iso, now) => { const d = new Date(iso); return Number.isNaN(d) ? 0 : Math.max(0, Math.floor((now - d.getTime()) / 86400000)); };

// What the badge says. Self-checked (S) says so from the formula alone. Every other level (D, C, L, X, T) needs a record:
// { id, level, state, site, lastPass, streakSince }. No record, or a paused or revoked one, draws grey.
export function badgeWords(id, rec, now = Date.now()) {
  const letter = id[3];
  if (letter === 'S') return { ...METAL.S };
  if (!rec || LEVEL_OF[rec.level] !== letter) return { ...GREY, word: 'Not issued', grey: true };
  if (rec.state === 'paused') return { ...GREY, word: `${METAL[letter].word} · paused`, grey: true };
  if (rec.state === 'revoked') return { ...GREY, word: 'Revoked', grey: true };
  if (rec.state && rec.state !== 'live') return { ...GREY, word: 'Not issued', grey: true };
  const m = { ...METAL[letter] };
  if (letter === 'C' && rec.lastPass) m.word = `Checked daily · ${day(rec.lastPass)}`;
  if (letter === 'L' && rec.streakSince) m.word = `${days(rec.streakSince, now)} days clean`;
  if (letter === 'X' && rec.lastPass) m.word = `Expert-reviewed · ${month(rec.lastPass)}`;
  return m;
}

export function badgeSvg(id, rec, now = Date.now()) {
  if (!ID_RE.test(id)) return null;
  const m = badgeWords(id, rec, now);
  const safe = String(m.word).replace(/[<>&"]/g, '');
  const tw = Math.round(safe.length * 6.9);
  const dotX = 94 + tw + 10, barX = dotX + 12, idX = barX + 30, w = idX + 74;
  const bars = [0, 1, 2, 3, 4].map((i) => `<rect x="${barX + i * 5}" y="${17 - i * 2}" width="3" height="${5 + i * 2}" rx="1"${i < m.n ? '' : ' opacity=".3"'}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="32" viewBox="0 0 ${w} 32" role="img" aria-label="SIGSHIP badge ${id}: ${safe}">
<title>SIGSHIP ${safe} · ${id} · verify at sigship.dev/verify</title>
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.a}"/><stop offset="1" stop-color="${m.b}"/></linearGradient></defs>
<rect x=".5" y=".5" width="${w - 1}" height="31" rx="15.5" fill="url(#g)" stroke="${m.e}"/>
<g transform="translate(11 8) scale(.178)"><rect x="6" y="0" width="6" height="90" rx="3" fill="${m.ink}"/><rect x="14" y="6" width="72" height="50" rx="2" fill="#2f5be0"/><rect x="38" y="22.7" width="24" height="16.6" fill="#fff"/></g>
<g fill="${m.ink}" font-family="Inter,system-ui,-apple-system,Segoe UI,sans-serif">
<text x="33" y="20" font-size="10" font-weight="800" letter-spacing="1">SIGSHIP</text>
<rect x="85" y="9" width="1" height="14" opacity=".35"/>
<text x="94" y="20.5" font-size="12.5" font-weight="600">${safe.replace(/&/g, '&amp;')}</text>
<circle cx="${dotX}" cy="16" r="4" fill="${m.dot}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
${bars}
<rect x="${idX - 6}" y="9" width="1" height="14" opacity=".35"/>
<text x="${idX}" y="19.5" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="9.5" font-weight="600" letter-spacing=".3">${id}</text>
</g>
</svg>
`;
}
