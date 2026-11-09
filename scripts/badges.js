// The SIGSHIP badge family: five levels plus a top tier, each a metal people already rank.
// Each level adds a proof the one below can't give. Nothing says "certified".
export const LEVELS = [
  { id: 'self', n: 1, metal: 'steel', metalName: 'Steel', title: 'Self-checked', short: 'Self-checked', plan: 'Free', per: 'forever', status: 'Available now', live: true, mark: 'dot-q', shield: '17/17 passed',
    items: ['You ran the <b>17 core checks</b> and all passed', 'Shows the SIGSHIP version you used', 'Links to a public page that explains what was checked'],
    why: 'Shows you care. But it is your own word and anyone can paste it, so visitors give it less weight.' },
  { id: 'deep', n: 2, metal: 'bronze', metalName: 'Bronze', title: 'Deep self-check', short: 'Deep self-check', plan: '$149', per: 'one-time · Pro', status: 'Waitlist', mark: 'dot-q', shield: 'deep · 17/17',
    items: ['Core checks <b>plus the Pro pack</b>', 'Same self-declared badge, more ground covered', '“Deep” on the badge'],
    alt: '<b>Business $499</b> one-time: the same level, for a team.',
    why: 'Covers more of your app. Still your own word, so it stays bronze, below the metals SIGSHIP checks itself.' },
  { id: 'daily', n: 3, metal: 'silver', metalName: 'Silver', title: 'Checked daily', short: 'Checked daily', plan: '$19', per: '/month · Solo', status: 'With Cloud', mark: 'dot', shield: 'daily · 9 Nov',
    items: ['<b>SIGSHIP re-runs the check</b> itself, every night', 'Badge is drawn by sigship.dev with <b>today’s date</b>', '<b>Turns off by itself</b> if a check fails', 'Your own verification page'],
    why: 'The first badge we stand behind. It cannot go stale or be copied, because we draw it.' },
  { id: 'live', n: 4, metal: 'gold', metalName: 'Gold', title: 'Live-checked', short: 'Live-checked', plan: '$59', per: '/month · Team', status: 'With Cloud', mark: 'dot', shield: '42 days clean', pop: true,
    items: ['Everything in Checked daily', 'Checked <b>every time your code changes</b>, not just daily', 'A <b>clean-days streak</b> on the badge', '<b>Public history page</b> buyers and investors can open'],
    alt: '<b>Agency $149/mo</b>: this level for client apps, shown as “via your studio”.',
    why: 'The streak grows every day you stay clean. Time is the proof nobody can fake.' },
  { id: 'expert', n: 5, metal: 'plat', metalName: 'Platinum', title: 'Expert-reviewed', short: 'Expert-reviewed', plan: 'from $499', per: 'per review', status: 'Available now', live: true, mark: 'chk', shield: 'Nov 2026',
    items: ['A <b>SIGSHIP expert engineer</b> reviews your code by hand', 'Follows the <b>SIGSHIP review protocol</b>: logins and access, user data, payments, secret keys, AI spending', 'Signed with the <b>engineer’s name and review date</b>', 'A report page: what was checked, what was found, what was out of scope'],
    why: 'The answer to “did an expert actually look?” A person with a protocol, not only a scanner.' },
];
export const TOP = { id: 'top', n: 5, metal: 'obs', metalName: 'Black platinum', title: 'Expert-reviewed & live-checked', short: 'Expert & live', mark: 'dot', shield: 'expert & live',
  text: 'A SIGSHIP expert engineer reviewed the code <b>and</b> SIGSHIP re-checks it every time the code changes. Any Team or Agency plan plus an expert review in the last 12 months. The black platinum finish is reserved for this, so it stays rare.' };

const MK = '<svg class="mk" viewBox="0 0 90 90" aria-hidden="true"><rect x="6" y="0" width="6" height="90" rx="3" fill="currentColor"/><rect x="14" y="6" width="72" height="50" rx="2" fill="#2f5be0"/><rect x="38" y="22.7" width="24" height="16.6" fill="#fff"/></svg>';
const MKW = '<svg class="mk" viewBox="0 0 90 90" aria-hidden="true"><rect x="6" y="0" width="6" height="90" rx="3" fill="#fff" opacity=".85"/><rect x="14" y="6" width="72" height="50" rx="2" fill="#2f5be0"/><rect x="38" y="22.7" width="24" height="16.6" fill="#fff"/></svg>';
const CHK = '<span class="chk" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
const bars = (n) => `<span class="lvl" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i${i <= n ? ' class="f"' : ''}></i>`).join('')}</span>`;
const end = (l) => (l.mark === 'chk' ? CHK : `<span class="dot${l.mark === 'dot-q' ? ' q' : ''}" aria-hidden="true"></span>`);

// The pill: the default badge. `brand` adds the SIGSHIP word, `meter` adds the level bars.
export const pill = (l, { brand = true, meter = true, label = l.short, cls = '' } = {}) =>
  `<span class="sg-pill m-${l.metal}${cls ? ` ${cls}` : ''}" role="img" aria-label="SIGSHIP badge: ${label.replace(/&/g, 'and')}, level ${l.n} of 5 (${l.metalName})">${MK}${brand ? '<span class="brand">SIGSHIP</span>' : ''}<span class="t">${label}</span>${end(l)}${meter ? bars(l.n) : ''}</span>`;
// The shield: the README shape. Dark left, the level's metal on the right.
export const shield = (l, right = l.shield) => `<span class="sg-shield m-${l.metal}" role="img" aria-label="SIGSHIP badge: ${right.replace(/&/g, 'and')}"><span class="l">${MKW}SIGSHIP</span><span class="r">${right}</span></span>`;

// The real, static Self-checked badge people can embed today (steel pill, light and dark friendly).
export const selfCheckedSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="236" height="32" viewBox="0 0 236 32" role="img" aria-label="Self-checked with SIGSHIP">
<title>Self-checked with SIGSHIP</title>
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3aab4"/><stop offset="1" stop-color="#858d98"/></linearGradient></defs>
<rect x=".5" y=".5" width="235" height="31" rx="15.5" fill="url(#s)" stroke="#727a85"/>
<rect x="1" y="1" width="234" height="1" rx=".5" fill="#fff" opacity=".45"/>
<g transform="translate(11 8) scale(.178)"><rect x="6" y="0" width="6" height="90" rx="3" fill="#ffffff"/><rect x="14" y="6" width="72" height="50" rx="2" fill="#2f5be0"/><rect x="38" y="22.7" width="24" height="16.6" fill="#fff"/></g>
<text x="33" y="20" fill="#ffffff" font-family="Inter,system-ui,-apple-system,Segoe UI,sans-serif" font-size="10" font-weight="800" letter-spacing="1">SIGSHIP</text>
<rect x="85" y="9" width="1" height="14" fill="#ffffff" opacity=".35"/>
<text x="94" y="20.5" fill="#ffffff" font-family="Inter,system-ui,-apple-system,Segoe UI,sans-serif" font-size="12.5" font-weight="600">Self-checked</text>
<circle cx="182" cy="16" r="4" fill="#f5c518" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
<g fill="#ffffff"><rect x="194" y="17" width="3" height="5" rx="1"/><rect x="199" y="15" width="3" height="7" rx="1" opacity=".3"/><rect x="204" y="13" width="3" height="9" rx="1" opacity=".3"/><rect x="209" y="11" width="3" height="11" rx="1" opacity=".3"/><rect x="214" y="9" width="3" height="13" rx="1" opacity=".3"/></g>
</svg>
`;
