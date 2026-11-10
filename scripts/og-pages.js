// The social preview image for each page: what it says, and where it lives. scripts/build-og.js draws them,
// scripts/build-site.js points every page's og:image at its own picture.
import { RULES } from '../src/rules.js';
import { CARD, GROUPS, LEVEL } from './checks-copy.js';
import { CHECK_EXTRA, GUIDES } from './seo.js';

const N = RULES.length;
// slug → { eyebrow, color, head: [plain line, gradient line], sub }
const PAGES = {
  home: { eyebrow: 'Free · Open source · MIT', color: 'go', head: ['You built it fast.', 'Launch it safe.'], sub: 'The free launch check for apps built with Lovable, Cursor, Bolt, Replit and Claude Code. Plain words, a fix for your AI, nothing uploaded.' },
  checks: { eyebrow: `The ${N} checks`, color: 'amber', head: [`The ${N} mistakes AI tools make most.`, 'We check every one.'], sub: 'Leaked keys, open databases, fake payments, runaway AI bills. Each in plain words, with the fix.' },
  pricing: { eyebrow: 'Pricing', color: 'amber', head: ['Free today.', 'Bigger powers soon.'], sub: 'Open source and free on your computer. Self-hosted and Cloud plans are on the waitlist with early-bird pricing.' },
  waitlist: { eyebrow: 'Waitlist · early birds', color: 'amber', head: ['Lock in the early-bird price.', '50% off self-hosted plans.'], sub: 'Join the waitlist and we email you once, when your plan opens, with Cyber Monday pricing.' },
  cloud: { eyebrow: 'SIGSHIP Cloud · coming soon', color: 'sky', head: ['We keep watch.', 'You keep building.'], sub: 'Nightly checks of your live apps, a simple score, alerts and a Verified badge.' },
  badge: { eyebrow: 'Verified badge', color: 'go', head: ['Customers trust apps', 'that show they checked.'], sub: 'A live SIGSHIP badge for your site. It shows the last passing check and switches off if a check fails.' },
  lookout: { eyebrow: 'Lookout · always watching', color: 'coral', head: ['New threats appear every week.', "We're already on it."], sub: 'Every new attack on AI-built apps becomes a new check. Each notice has a source.' },
  docs: { eyebrow: 'Docs', color: 'sky', head: ['Everything in', 'one page.'], sub: 'Install, commands, flags, exit codes, the GitHub check and AI agents.' },
  agents: { eyebrow: 'AI agents', color: 'violet', head: ['Your AI checks its own work', 'before it says “done”.'], sub: 'Claude Code, Cursor, Windsurf, Copilot, Gemini CLI and Codex. One line over MCP.' },
  api: { eyebrow: 'Cloud API · preview', color: 'teal', head: ['Connect SIGSHIP', 'to anything.'], sub: 'Start checks, read results and badge status from your own tools.' },
  resources: { eyebrow: 'Resources', color: 'pink', head: ['Check your app', 'in 4 steps.'], sub: 'Never used a terminal? No problem. This takes about two minutes.' },
  guides: { eyebrow: 'Guides', color: 'pink', head: ['Launch your AI-built app', 'without the scary surprises.'], sub: "Short, plain-English guides for builders who aren't security experts." },
  glossary: { eyebrow: 'Glossary', color: 'teal', head: ['Jargon,', 'explained.'], sub: 'API keys, RLS, webhooks, CORS, MCP and more, each in one or two plain sentences.' },
  changelog: { eyebrow: 'Changelog', color: 'lime', head: ["What's new", 'in SIGSHIP.'], sub: 'Every change, dated and explained.' },
  releases: { eyebrow: 'Releases', color: 'sky', head: ['Every version,', 'on npm and GitHub.'], sub: 'npx sigship@latest always gets the newest checks.' },
  'open-source': { eyebrow: 'Open source · MIT', color: 'violet', head: ['Open', 'by default.'], sub: 'You should be able to read every line of the tool that checks your code. So you can.' },
  community: { eyebrow: 'Community', color: 'pink', head: ['Built in the open,', 'with builders.'], sub: 'GitHub, Discord, Discussions and support@sigship.dev. Every message is read by the team.' },
  roadmap: { eyebrow: 'Roadmap', color: 'lime', head: ['Where SIGSHIP', 'is going.'], sub: 'What is live, what lands by 30 November, and what Cloud aims for. No dates promised for Cloud.' },
  score: { eyebrow: 'Readiness score', color: 'lime', head: ['The score,', 'with the sums shown.'], sub: 'Start at 100, take points off per finding by severity, floor at 0. Accepted risks do not count.' },
  accuracy: { eyebrow: 'Accuracy', color: 'teal', head: ['How often', 'each check is right.'], sub: 'Precision and recall per check from the public benchmark. No claims we have not measured.' },
  'expert-review-protocol': { eyebrow: 'Expert review · protocol', color: 'violet', head: ['What an expert', 'review covers.'], sub: 'Logins and access, user data, payments, secret keys, AI spending. Signed by name. Three a week.' },
  'incident-rule': { eyebrow: 'Incident rule', color: 'coral', head: ['If a badge fails you,', 'this is what we do.'], sub: 'Revoke the badge, publish a write-up, ship a new check through the Lookout.' },
  brand: { eyebrow: 'Brand', color: 'violet', head: ['Flag P,', 'the Blue Peter.'], sub: 'The SIGSHIP logo, colours and type, with files to download.' },
};
for (const r of RULES) {
  const g = GROUPS[CARD[r.id][0]], l = LEVEL[r.severity];
  PAGES[`checks-${r.id}`] = { eyebrow: `${g.emoji} ${g.label} · ${l.label}`, color: g.color, head: [r.title, ''], sub: CHECK_EXTRA[r.id].plain, small: true };
}
for (const gd of GUIDES) PAGES[`guides-${gd.slug}`] = { eyebrow: 'Guide', color: 'pink', head: [gd.title, ''], sub: gd.description, small: true };

export const OG_PAGES = PAGES;
export const ogSlug = (path) => path.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home';
// The picture for a page, or the home picture when the page has none of its own.
export const ogFor = (path) => (PAGES[ogSlug(path)] ? `/og/${ogSlug(path)}.png` : '/og.png');
