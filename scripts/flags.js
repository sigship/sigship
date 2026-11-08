// The three GO flags: Q Cleared (free, self-declared), C Verified (Cloud, drawn live), H Pilot on board (human review).
// One source for the home page band, the /flags/ page and the badge SVG. Wording is deliberately modest:
// a flag says the owner checked before launching. It is never called a certificate or an audit.
import { RULES } from '../src/rules.js';

const N = RULES.length;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MARK = '<svg viewBox="0 0 34 28"><rect x="3" y="2" width="30" height="20" rx="1" fill="var(--flag-blue)"/><rect x="13" y="8.7" width="10" height="6.6" fill="var(--flag-white)"/></svg>';

export const TIERS = [
  {
    id: 'cleared', level: 1, flag: 'Q', cls: 'lv1', name: 'Cleared', status: 'live',
    small: `by SIGSHIP · ${N} checks passed`, shieldBg: 'var(--flag-yellow)', shieldText: `cleared · ${N}/${N}`,
    flagSvg: `<g class="wave"><rect x="5" y="3" width="56" height="38" rx="2" fill="var(--flag-yellow)"/></g>`,
    plain: `You ran the free check and all ${N} passed. Add the flag yourself, like a sticker on the door.`,
    dev: `Free CLI run, ${N}/${N}. Self-declared static SVG, like a licence badge.`,
    who: 'Anyone, free', proof: 'Your word. The badge says which version checked it.', how: 'Run the free check until it says GO, then copy the badge below.', earn: 'Free',
  },
  {
    id: 'verified', level: 2, flag: 'C', cls: 'lv2', name: 'Verified', status: 'soon',
    small: 'by SIGSHIP · checked every night · shows the date of the last pass', shieldBg: '#9fc0ff', shieldText: 'verified · nightly',
    flagSvg: `<g class="wave" style="animation-delay:.6s"><rect x="5" y="3" width="56" height="7.6" fill="var(--flag-blue)"/><rect x="5" y="10.6" width="56" height="7.6" fill="var(--flag-white)"/><rect x="5" y="18.2" width="56" height="7.6" fill="var(--flag-red)"/><rect x="5" y="25.8" width="56" height="7.6" fill="var(--flag-white)"/><rect x="5" y="33.4" width="56" height="7.6" fill="var(--flag-blue)"/></g>`,
    plain: 'SIGSHIP Cloud checks your app every night. The flag is drawn live with the date of the last pass, so it can\'t be faked or go stale. If a check fails, it comes down by itself.',
    dev: 'Solo, Team and Agency plans. Rendered by sigship.dev from the latest scan; fail a scan and the badge turns off.',
    who: 'Cloud plans (Solo, Team, Agency)', proof: 'SIGSHIP\'s servers. The image is drawn from the latest nightly scan and links to a public page.', how: 'Connect your repo to SIGSHIP Cloud. The flag appears after the first clean nightly check.', earn: 'Opens with Cloud plans',
  },
  {
    id: 'pilot', level: 3, flag: 'H', cls: 'lv3', name: 'Pilot on board', status: 'live',
    small: 'reviewed by a zoof04 engineer · signed and dated', shieldBg: '#f8e7a6', shieldText: 'pilot reviewed',
    flagSvg: `<g class="wave" style="animation-delay:1.2s"><rect x="5" y="3" width="28" height="38" fill="var(--flag-white)"/><rect x="33" y="3" width="28" height="38" fill="var(--flag-red)"/></g>`,
    plain: 'A real person at zoof04 read your code by hand and signed a written review. The page names the reviewer, the date and what was covered.',
    dev: 'Pilot review customers. Human code review with a signed report; the verification page lists reviewer, date and scope.',
    who: 'Pilot review customers', proof: 'A named engineer. The public page lists the reviewer, the date and the scope of the review.', how: 'Book a pilot review. You get the written review, the call, and the flag with its page.', earn: 'From $499, one-time',
  },
];

export const shield = (t) => `<span class="shield" aria-hidden="true"><span class="l">${MARK}SIGSHIP</span><span class="r" style="background:${t.shieldBg}">${esc(t.shieldText)}</span></span>`;

// The three plaques, for the home page band and the /flags/ page. `pageHref` is where the plaque's small URL points.
export const plaques = () => `<div class="plaques" data-progress>
<div class="rail" aria-hidden="true"><i></i></div>
${TIERS.map((t, i) => `<div class="tier ${t.cls} rv" id="tier-${t.id}" style="--i:${i}">
  <div class="pl-unlock"><div class="pl-float"${i ? ` style="animation-delay:-${i * 2}s"` : ''}><div class="plaque" style="--sd:${(i * 1.2).toFixed(1)}s">
    <div class="face">
      <svg viewBox="0 0 64 56" aria-hidden="true"><rect x="2" y="0" width="3" height="56" rx="1.5" fill="#6b7a99"/>${t.flagSvg}</svg>
      <div class="t"><b>${esc(t.name)}</b><small>${esc(t.small)}</small><code>sigship.dev/flags/#${t.id}</code></div>
    </div>
    <div class="sheen" aria-hidden="true"></div><div class="holo" aria-hidden="true"></div>
  </div></div></div>
  <h3>${esc(t.name)}</h3>
  <p class="who"><b>Level ${t.level} · flag ${t.flag}.</b> <span class="plain-only">${esc(t.plain)}</span><span class="dev-only">${esc(t.dev)}</span>${t.status === 'soon' ? ' <span class="soon">Opens with Cloud plans.</span>' : ''}</p>
  ${shield(t)}
</div>`).join('\n')}
</div>`;

// The static badge for a Cleared app: an SVG anyone can copy into a README. Self-declared, and it says so in its title.
export const clearedBadge = (version) => {
  const left = 'SIGSHIP', right = `cleared · ${N} checks · v${version}`;
  const lw = 94, rw = 16 + right.length * 6.4;
  const w = Math.round(lw + rw);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="24" role="img" aria-label="SIGSHIP: cleared, ${N} checks, version ${version}. Self-declared by the app's owner.">
<title>SIGSHIP cleared: the owner ran sigship ${version} and all ${N} checks passed. Self-declared; not a security certificate.</title>
<clipPath id="r"><rect width="${w}" height="24" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="24" fill="#0b1324"/><rect x="${lw}" width="${rw}" height="24" fill="#f5c518"/></g>
<rect x="9" y="6.5" width="2" height="12" fill="#6b7a99"/><rect x="11" y="7" width="14" height="9.3" rx="1" fill="#1f4fd1"/><rect x="15.7" y="10.1" width="4.7" height="3.1" fill="#fff"/>
<text x="31" y="16" fill="#f3f5f8" font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="700" letter-spacing=".3">${left}</text>
<text x="${lw + 8}" y="16" fill="#0b1324" font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="600">${esc(right)}</text>
</svg>
`;
};
