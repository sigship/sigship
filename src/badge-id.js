// Badge IDs, the same formula as scripts/badge-id.js on the site (a test keeps them equal).
// It lives here too because only bin/ and src/ ship in the npm package.
// Every badge carries an ID like SG-S-4K7Q2M: the letter is the level, the six characters come from the level and the site.
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const host = (s) => String(s || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:\s]/)[0].slice(0, 80);

export function badgeId(letter, site) {
  let h = 0x811c9dc5;
  for (const ch of `${letter}:${host(site)}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += B32[h & 31];
    h >>>= 5;
  }
  return `SG-${letter}-${code}`;
}

export const ID_RE = /^SG-[SDCLXT]-[0-9A-HJKMNP-TV-Z]{6}$/;
export const verifyUrl = (id, site) => `https://sigship.dev/verify/?id=${id}&site=${encodeURIComponent(host(site))}`;
