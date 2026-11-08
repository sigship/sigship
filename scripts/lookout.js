// The Lookout: new ways attackers get into AI-built apps, each mapped to what SIGSHIP does about it.
// One source for the home page section, the /lookout/ page, feed.json and rss.xml.
// Statuses are honest and checked against src/rules.js at build time:
//   cov   = a rule in RULES covers it today
//   part  = SIGSHIP catches the damage, not the cause
//   plan  = a rule is being written (named in `rules`, must NOT exist yet)
//   watch = no rule yet; the notice says what to do by hand
// Add a notice at the top. Dates are ISO. Every notice needs at least one source link.
import { RULES } from '../src/rules.js';

export const STATUS = {
  cov: { cls: 'st-cov', plain: 'Covered since 0.1.0', dev: 'Covered' },
  part: { cls: 'st-part', plain: 'Partly covered', dev: 'Partly covered' },
  plan: { cls: 'st-plan', plain: 'Check being written', dev: 'Rule in progress' },
  watch: { cls: 'st-watch', plain: 'Watching', dev: 'Watching' },
};

export const STACKS = {
  nextjs: 'Next.js', supabase: 'Supabase', lovable: 'Lovable', aikeys: 'AI keys', npm: 'npm packages', mcp: 'MCP', firebase: 'Firebase', stripe: 'Stripe', vercel: 'Vercel',
};

export const WATCHING = ['Supabase', 'Lovable', 'Bolt', 'Next.js', 'OpenAI keys', 'Gemini keys', 'Stripe', 'Razorpay', 'Firebase', 'npm packages', 'MCP servers', 'Vercel', 'Clerk', 'Cursor rules'];

export const NOTICES = [
  {
    slug: 'nextjs-imageresponse-rce-2026-09',
    date: '2026-09-23',
    sev: 1,
    status: 'plan',
    rules: ['outdated-framework'],
    stack: ['nextjs', 'vercel'],
    spotted: 'Vercel security release; reported by The Hacker News',
    cve: 'CVE-2026-94545',
    title: { plain: 'A hole in Next.js lets a crafted link run code on your server', dev: 'Next.js ImageResponse remote code execution on the Node runtime' },
    summary: {
      plain: 'Many apps make a little preview image for links shared on social media. In Next.js 16.2 through 16.3.5, if that image includes words a visitor can control, such as a name from the web address, a visitor can hide code in those words and run it on your server. Vercel rates it critical. Apps hosted on Vercel were protected; apps hosted elsewhere were not.',
      dev: 'Satori, which turns the ImageResponse layout into SVG, did not escape certain attacker-controlled values, so a crafted value is parsed as SVG and can reach other dependencies. Affects 16.2.0 to 16.3.5 on the Node runtime; Edge and 15.x unaffected. CVSS 9.5 (Vercel) against 5.3 (Satori). Fixed in 16.3.6 and hardened in 15.5.26.',
    },
    short: { plain: 'If your app makes social-preview images and runs Next.js 16.2 to 16.3.5, a visitor can slip code into them. Fixed in 16.3.6.', dev: 'Satori failed to escape attacker-controlled values rendered by ImageResponse. 16.2.0 to 16.3.5 on Node affected. Fix: next@16.3.6 or 15.5.26.' },
    affects: ['Next.js 16.2 to 16.3.5', 'Social preview images', 'Self-hosted apps'],
    sigship: {
      plain: 'A new check will warn when your app uses a version with a known critical hole. The list of bad versions ships inside SIGSHIP itself, so the free check still makes no network calls.',
      dev: 'The rule compares package.json and lockfile versions against an advisory table bundled in the package, updated with each release, no network. It ships with the next release.',
    },
    action: {
      plain: 'Ask your AI tool to update Next.js to 16.3.6 (or 15.5.26). Until then, keep anything a visitor can type out of your preview images.',
      dev: 'npm i next@16.3.6, or next@15.5.26 on 15.x. Interim: no attacker-controlled values in ImageResponse content, attributes or styles.',
    },
    sources: [
      ['The Hacker News, 23 Sep 2026', 'https://thehackernews.com/2026/09/critical-nextjs-imageresponse-flaw-can.html'],
      ['CSA Singapore alert', 'https://www.csa.gov.sg/alerts-and-advisories/alerts/al-2026-148/'],
      ['Canadian Centre for Cyber Security', 'https://cyber.gc.ca/en/alerts-advisories/nextjs-security-advisory-av26-851'],
    ],
  },
  {
    slug: 'ios-ai-apps-leak-llm-keys-2026-06',
    date: '2026-06-30',
    sev: 1,
    status: 'cov',
    rules: ['ai-key-in-browser', 'ai-route-no-rate-limit'],
    stack: ['aikeys'],
    spotted: 'Researchers at Wake Forest University (LLMKeyLens)',
    title: { plain: '282 of 444 AI apps on iPhone gave away their paid AI access', dev: 'Two-thirds of iOS AI chatbot apps leak LLM credentials or act as open relays' },
    summary: {
      plain: 'Researchers watched the traffic of 444 AI chat apps. 282 handed over paid AI access in one of three ways: the secret key sat in the traffic in plain sight (54 apps), the app\'s own server answered anyone who asked, with no login (92 apps), or a "temporary" pass that never really expired could be copied and reused (136 apps). One token was set to expire in the year 2125. Three months after being told, only 28% had fixed it.',
      dev: 'Plaintext keys in requests (54 apps, 28 also leaking the system prompt), unauthenticated backend relays (92), and replayable or long-lived tokens (136; one expiring in 2125, one "one-hour" token valid 128 days later). At least ten providers, OpenAI most common. Sysdig\'s worst-case LLMjacking figure: more than $46,000 a day.',
    },
    short: { plain: 'Researchers watched 444 AI chat apps. 282 handed paid AI access to anyone who looked at their traffic.', dev: '54 apps shipped plaintext keys, 92 ran open relays, 136 issued replayable tokens. Only 28% fixed it within three months.' },
    affects: ['Any app that calls OpenAI, Gemini or Anthropic', 'Web and mobile', 'Lovable, Bolt and v0 defaults'],
    sigship: {
      plain: 'SIGSHIP already flags an AI key that visitors can see, and an AI route with no spending brake. The "server answers anyone" case gets its own check in Pro.',
      dev: 'Web equivalents covered. The open-relay class (a model route with no auth check) lands as route-no-auth in the Pro pack.',
    },
    action: {
      plain: 'Run the check. If it finds your key, create a new one and let the AI talk to the provider from your server, behind a login and a limit.',
      dev: 'npx sigship, then rotate the key and proxy through an authenticated, rate-limited server route.',
    },
    sources: [
      ['The Hacker News, 30 Jun 2026', 'https://thehackernews.com/2026/06/282-ios-apps-found-leaking-llm-api-keys.html'],
      ['The paper (arXiv 2606.12212)', 'https://arxiv.org/abs/2606.12212'],
    ],
  },
  {
    slug: 'npm-worm-canistersprawl-2026-04',
    date: '2026-04-22',
    sev: 1,
    status: 'watch',
    rules: ['install-scripts'],
    stack: ['npm'],
    spotted: 'Socket and StepSecurity',
    cve: 'CanisterSprawl',
    title: { plain: 'A worm hides in code packages and steals every password on your computer', dev: 'Self-propagating npm worm steals developer tokens and republishes poisoned versions' },
    summary: {
      plain: 'Your app is built from hundreds of small code packages other people publish. Six of them were poisoned: installing one ran a hidden script that copied your secrets file, cloud logins, SSH keys and browser passwords, then used your own publishing rights to poison more packages. It also tried to spread to Python.',
      dev: 'postinstall hooks exfiltrate .npmrc, .env, SSH keys, .git-credentials, AWS, GCP and Azure credentials, Kubernetes and Docker configs, Terraform and Vault material and browser credentials to an ICP canister and an HTTPS webhook, then publish new poisoned versions with the stolen npm tokens. PyPI propagation through .pth payloads. Six packages named, including pgserve 1.1.11 to 1.1.14.',
    },
    short: { plain: 'Installing one bad package ran a hidden script that took your .env file, cloud logins and SSH keys, then used them to infect more packages.', dev: 'postinstall hooks exfiltrate .env, SSH, cloud and npm tokens, then republish poisoned versions. Six packages named.' },
    affects: ['Every JavaScript project', 'CI servers', 'Developers\' laptops'],
    sigship: {
      plain: 'SIGSHIP already warns when your app can pull in new package versions by itself. A check that lists the packages allowed to run scripts when installed is next.',
      dev: 'no-lockfile (SEV-3) today. Planned: install-scripts, which lists dependencies with lifecycle scripts and suggests ignore-scripts in CI. Pro adds look-alike package detection.',
    },
    action: {
      plain: 'Keep a lockfile so versions don\'t change on their own, and ask your AI tool to check whether any of the six named packages are in your app. If one is, treat every password on that computer as stolen and change them.',
      dev: 'npm ci with a committed lockfile. npm config set ignore-scripts true in CI. Search the lockfile for the six packages and rotate everything if present.',
    },
    sources: [
      ['The Hacker News, 22 Apr 2026', 'https://thehackernews.com/2026/04/self-propagating-supply-chain-worm.html'],
      ['The New Stack', 'https://thenewstack.io/npm-supply-chain-worm-attack/'],
    ],
  },
  {
    slug: 'lovable-48-day-exposure-2026-04',
    date: '2026-04-21',
    sev: 1,
    status: 'part',
    rules: ['secret-in-code', 'rls-missing', 'rls-open-write'],
    stack: ['lovable', 'supabase'],
    spotted: 'An independent researcher; reported by TNW',
    cve: 'BOLA in the platform API',
    title: { plain: 'Thousands of Lovable projects were readable by anyone for 48 days', dev: 'Lovable API BOLA exposed source code, hardcoded Supabase credentials and chat logs' },
    summary: {
      plain: 'Anyone with a free Lovable account could open other people\'s projects: the source code, the database passwords written into it, the AI chat history, and users\' personal details. It was reported on 3 March, fixed for new projects, and left open for existing ones for 48 days. Lovable first said it was "intentional behaviour", then partly apologised.',
      dev: 'Broken object-level authorisation in Lovable\'s API: five calls from any free account reached another user\'s profile, source and database credentials. Patched for new projects only; projects created before November 2025 stayed exposed. A follow-up report was closed as a duplicate by bounty triage.',
    },
    short: { plain: 'Any free account could reach other people\'s source code, database passwords and chat history. Older projects stayed open after new ones were fixed.', dev: 'Five API calls from any free account reached another user\'s source and DB credentials. Pre-November-2025 projects stayed exposed after the patch.' },
    affects: ['Lovable projects from before November 2025', 'Supabase keys written into code'],
    sigship: {
      plain: 'No scan of your app can find a hole in Lovable\'s own servers. What SIGSHIP can do is find what made the leak dangerous: database passwords written into your code, and tables anyone can read.',
      dev: 'Platform-side BOLA is out of scope by design. secret-in-code catches hardcoded Supabase service keys; rls-missing and rls-open-write catch the open tables that turned a code leak into a data leak.',
    },
    action: {
      plain: 'If your project is older than November 2025, create new database keys today, then run the check and fix anything marked Stop.',
      dev: 'Rotate the Supabase service_role and anon keys, then npx sigship and clear every SEV-1.',
    },
    sources: [['TNW, 21 Apr 2026', 'https://thenextweb.com/news/lovable-vibe-coding-security-crisis-exposed']],
  },
  {
    slug: 'lovable-exam-app-18k-users-2026-02',
    date: '2026-02-27',
    sev: 1,
    status: 'cov',
    rules: ['rls-missing', 'rls-open-write'],
    stack: ['lovable', 'supabase'],
    spotted: 'Taimur Khan; reported by The Register',
    title: { plain: 'One AI-built exam app left 18,697 people\'s details open to anyone', dev: 'Lovable-hosted app: 16 flaws, 6 critical, no RLS, inverted auth in RPC functions' },
    summary: {
      plain: 'A popular exam-grading app built on Lovable had no protection on its database. Anyone, without logging in, could read every user record, delete accounts, grade other people\'s tests and send bulk emails. One login check even worked backwards: it blocked people who were logged in and let strangers through. 18,697 records, including 4,538 students.',
      dev: 'Supabase backend without RLS or role checks. An RPC-based auth function had inverted logic, blocking authenticated users and admitting anonymous ones, repeated across several critical functions. 18,697 records: 14,928 unique emails, 870 with full PII. The support ticket was closed without a response; Lovable says it acted within minutes of a formal disclosure.',
    },
    short: { plain: 'An exam app had no protection on its database. Anyone could read every user record, delete accounts and grade other people\'s tests.', dev: 'No RLS, no role checks, and an RPC auth function with inverted logic. 18,697 records exposed.' },
    affects: ['Supabase apps', 'Lovable, Bolt and v0 defaults'],
    sigship: {
      plain: 'The open database is exactly what SIGSHIP\'s first two Stop checks look for. The backwards login logic is the kind of thing only a person reading the code catches, which is what a pilot review is for.',
      dev: 'Missing or open policies: covered. Inverted auth logic in RPC: not pattern-detectable with confidence; a pilot review item.',
    },
    action: {
      plain: 'Run the check. If it says a table is open, copy the fix into your AI tool, then run it again until you get a GO.',
      dev: 'npx sigship --prompt, apply, re-run until exit 0.',
    },
    sources: [
      ['The Register, 27 Feb 2026', 'https://www.theregister.com/2026/02/27/lovable_app_vulnerabilities'],
      ['Cybernews on related Lovable exposures', 'https://cybernews.com/security/lovable-ai-apps-expose-personal-information/'],
    ],
  },
  {
    slug: 'mcp-30-cves-60-days-2026-02',
    date: '2026-02-28',
    dateLabel: 'Jan to Feb 2026',
    sev: 2,
    status: 'watch',
    rules: ['mcp-config'],
    stack: ['mcp'],
    spotted: 'A roundup of CVEs and vendor disclosures',
    cve: '30+ CVEs',
    title: { plain: 'The plug-ins your AI coding tool uses had 30 security holes in 60 days', dev: 'MCP: 30+ CVEs in 60 days, and 38 to 41% of servers with no authentication' },
    summary: {
      plain: 'AI tools like Cursor and Claude Code connect to small helper programs called MCP servers. Over 30 holes were reported in two months: helpers that run commands they\'re told to by hidden text, helpers with no login at all, and fake helpers that quietly copy your keys. Earlier cases leaked WhatsApp chats and private GitHub code.',
      dev: 'Shell and exec injection 43%, tooling flaws 20%, auth bypass 13%, path traversal 10%. Of 2,614 implementations, 82% had traversal-prone file operations. Named: mcp-remote CVE-2025-6514 (CVSS 9.6), Cursor MCPoison CVE-2025-54136, GitHub MCP prompt injection through public issues, Smithery isolation traversal, Postmark impersonation.',
    },
    short: { plain: 'Over 30 holes in two months in the helper programs AI coding tools connect to: some run hidden commands, some have no login, some are fakes that copy your keys.', dev: 'Exec injection 43%, tooling flaws 20%, auth bypass 13%, traversal 10%. mcp-remote CVE-2025-6514 scored 9.6.' },
    affects: ['Cursor, Claude Code and Windsurf users', 'Any project with an MCP config'],
    sigship: {
      plain: 'SIGSHIP\'s own helper has no outside parts, never runs commands and never touches the network, and you can check that yourself. A check that looks at the helpers in your project\'s settings is planned.',
      dev: 'SIGSHIP\'s MCP server: zero dependencies, stdio only, no shell, no network. Planned rule mcp-config: unpinned server versions, unknown publishers, servers granted access to environment variables.',
    },
    action: {
      plain: 'Only install helpers from people you can name, remove the ones you don\'t use, and don\'t let them see your secrets file.',
      dev: 'Pin exact server versions, never @latest. Review tool descriptions. Remove unused servers. Scan with mcp-scan. Deny env access.',
    },
    sources: [
      ['MCP Security 2026 roundup, 10 Mar 2026', 'https://heyuan110.com/posts/ai/2026-03-10-mcp-security-2026'],
      ['Practical DevSecOps', 'https://www.practical-devsecops.com/mcp-security-vulnerabilities/'],
    ],
  },
  {
    slug: 'vibe-coded-sites-leak-secrets-2025-09',
    date: '2025-09-23',
    sev: 1,
    status: 'cov',
    rules: ['secret-in-code', 'public-env-secret', 'env-file-committed'],
    stack: ['aikeys', 'firebase', 'supabase'],
    spotted: 'RedHunt Labs (Project Resonance, Wave 15)',
    title: { plain: '1 in 5 AI-built websites is leaking a secret key', dev: '130k vibe-coded sites scanned: 26k leak secrets, with 16k Firebase and 3k Supabase credentials' },
    summary: {
      plain: 'Researchers scanned about 130,000 websites built with 13 AI app builders. Roughly 26,000 had at least one secret key sitting where any visitor could read it: keys for OpenAI, Gemini, Stripe, Razorpay, Telegram bots and Airtable, and over 16,000 Firebase and 3,000 Supabase database credentials. Gemini keys made up almost three-quarters of the AI keys found, and more than 300 of them worked.',
      dev: 'About 130k sites across 13 platforms; about 26k with at least one leaked secret; about 25k unique secrets after filtering low-entropy values. Bearer tokens 25%, OpenAI 12%, reCAPTCHA 8%, ElevenLabs 7%, Razorpay key IDs 4.5%, Stripe 1.9%. Gemini 72% of AI secrets; 300+ Google keys validated against Gemini APIs. Server-side exposures were excluded, so this is a floor.',
    },
    short: { plain: 'Of 130,000 websites built with AI tools, about 26,000 had a secret key sitting where any visitor could read it.', dev: '26k of 130k sites leaked secrets: 16k Firebase and 3k Supabase credentials, and Gemini keys were 72% of the AI keys found.' },
    affects: ['Apps from any AI builder', 'Firebase and Supabase apps', 'Anything with a Gemini or OpenAI key'],
    sigship: {
      plain: 'Three of SIGSHIP\'s first checks exist because of this pattern. Firebase access rules get their own check in Pro.',
      dev: 'Literal secrets, build-exposed env names (VITE_, NEXT_PUBLIC_) and committed .env files: covered. Firebase rules land in the Pro pack.',
    },
    action: {
      plain: 'Run the check. Any key it finds is already public: create a new one and delete the old one, then move it to your server.',
      dev: 'npx sigship, rotate every hit, and never prefix a server secret with VITE_ or NEXT_PUBLIC_.',
    },
    sources: [
      ['RedHunt Labs, 23 Sep 2025', 'https://redhuntlabs.com/blog/echoes-of-ai-exposure-thousands-of-secrets-leaking-through-vibe-coded-sites-wave-15-project-resonance/'],
      ['Cyble: 8,000+ ChatGPT keys publicly accessible, Feb 2026', 'https://cyble.com/blog/when-ai-secrets-go-public-chatgpt/'],
    ],
  },
];

// ---------- Build-time honesty checks ----------
const ids = new Set(RULES.map((r) => r.id));
for (const n of NOTICES) {
  if (!n.sources?.length) throw new Error(`Lookout: the notice ${n.slug} has no source.`);
  if (n.status === 'cov' && !n.rules.every((id) => ids.has(id))) throw new Error(`Lookout: ${n.slug} says covered, but a named rule is not in src/rules.js.`);
  if (n.status === 'plan' && n.rules.some((id) => ids.has(id))) throw new Error(`Lookout: ${n.slug} says a rule is being written, but it already exists. Change the status to cov.`);
  if (n.status === 'part' && !n.rules.some((id) => ids.has(id))) throw new Error(`Lookout: ${n.slug} says partly covered, but names no existing rule.`);
}

export const LATEST = NOTICES.map((n) => n.date).sort().at(-1);
export const COUNTS = { total: NOTICES.length, cov: NOTICES.filter((n) => n.status === 'cov').length, plan: NOTICES.filter((n) => n.status === 'plan').length, watch: NOTICES.filter((n) => n.status === 'watch').length, part: NOTICES.filter((n) => n.status === 'part').length };
export const PLANNED_RULES = [...new Set(NOTICES.filter((n) => ['plan', 'watch'].includes(n.status)).flatMap((n) => n.rules).filter((id) => !ids.has(id)))];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (n) => n.dateLabel || `${Number(n.date.slice(8, 10))} ${MONTHS[Number(n.date.slice(5, 7)) - 1]} ${n.date.slice(0, 4)}`;
const sevPill = (sev) => (sev === 1 ? '<span class="tagpill stop">Stop</span>' : sev === 2 ? '<span class="tagpill warn">Fix soon</span>' : '<span class="tagpill later">Later</span>');
const statusLine = (n) => {
  const st = STATUS[n.status];
  const rules = n.rules.join(', ');
  return `<span class="lk-status ${st.cls}"><span class="plain-only">${st.plain}</span><span class="dev-only">${st.dev} · ${esc(rules)}</span></span>`;
};

// Three latest notices as compact cards for the home page.
export const homeCards = () => NOTICES.slice(0, 3).map((n, i) => `<a class="notice rv" style="--i:${i + 1}" href="/lookout/#${n.slug}">
<div class="meta">${sevPill(n.sev)}<span>${esc(fmtDate(n))}</span>${n.cve ? `<span class="dev-only mono">${esc(n.cve)}</span>` : ''}</div>
<h3><span class="plain-only">${esc(n.title.plain)}</span><span class="dev-only">${esc(n.title.dev)}</span></h3>
<p><span class="plain-only">${esc(n.short.plain)}</span><span class="dev-only">${esc(n.short.dev)}</span></p>
${statusLine(n)}
</a>`).join('\n');

export const bridge = (rulesLive) => `<div class="bridge"><span class="live"><i aria-hidden="true"></i><b>Watching</b></span><span><b>${COUNTS.total}</b> notices since ${MONTHS[Number(NOTICES.at(-1).date.slice(5, 7)) - 1]} ${NOTICES.at(-1).date.slice(0, 4)}</span><span>Last notice <b>${esc(fmtDate(NOTICES[0]))}</b></span><span><b>${rulesLive}</b> checks live · <b>${PLANNED_RULES.length}</b> being written</span><span class="plain-only">A new notice most Mondays</span><span class="dev-only mono" style="font-size:.78rem">/lookout/feed.json · /lookout/rss.xml</span></div>`;

export const watchline = () => { const items = WATCHING.map((w) => `<span><i aria-hidden="true"></i>${esc(w)}</span>`).join(''); return `<div class="watchline" aria-hidden="true"><div class="tk">${items}${items}</div></div>`; };

// The full notice list for /lookout/.
export const noticeList = () => NOTICES.map((n) => `<article class="nt rv" id="${n.slug}" data-status="${n.status}" data-stack="${n.stack.join(' ')}">
<div class="when"><b>${esc(fmtDate(n))}</b>${sevPill(n.sev)}${n.cve ? `<span class="dev-only mono" style="font-size:.78rem">${esc(n.cve)}</span>` : ''}<span>Spotted by ${esc(n.spotted)}</span></div>
<div class="body">
<h3><a href="${esc(n.sources[0][1])}" rel="noopener"><span class="plain-only">${esc(n.title.plain)}</span><span class="dev-only">${esc(n.title.dev)}</span></a></h3>
<p><span class="plain-only">${esc(n.summary.plain)}</span><span class="dev-only">${esc(n.summary.dev)}</span></p>
<dl class="kv">
<dt>Affects</dt><dd><div class="stacks">${n.affects.map((a) => `<span>${esc(a)}</span>`).join('')}</div></dd>
<dt>SIGSHIP</dt><dd>${statusLine(n)}<span class="muted"><span class="plain-only">${esc(n.sigship.plain)}</span><span class="dev-only">${esc(n.sigship.dev)}</span></span></dd>
<dt><span class="plain-only">Do now</span><span class="dev-only">Fix</span></dt><dd><span class="plain-only">${esc(n.action.plain)}</span><span class="dev-only mono" style="font-size:.86rem">${esc(n.action.dev)}</span></dd>
<dt>Sources</dt><dd class="srcs">${n.sources.map(([t, u]) => `<a href="${esc(u)}" rel="noopener">${esc(t)}</a>`).join('')}</dd>
</dl>
</div>
</article>`).join('\n');

export const feedJson = (origin) => JSON.stringify({
  version: 'https://jsonfeed.org/version/1.1',
  title: 'SIGSHIP Lookout',
  home_page_url: `${origin}/lookout/`,
  feed_url: `${origin}/lookout/feed.json`,
  description: 'New ways attackers get into AI-built apps, each mapped to what SIGSHIP covers, is writing, or is watching.',
  items: NOTICES.map((n) => ({
    id: `${origin}/lookout/#${n.slug}`,
    url: `${origin}/lookout/#${n.slug}`,
    title: n.title.plain,
    summary: n.short.plain,
    content_text: `${n.summary.plain}\n\nAffects: ${n.affects.join(', ')}.\nSIGSHIP: ${STATUS[n.status].plain}${n.rules.length ? ` (${n.rules.join(', ')})` : ''}. ${n.sigship.plain}\nWhat to do: ${n.action.plain}\nSources: ${n.sources.map(([t, u]) => `${t} ${u}`).join('; ')}`,
    date_published: `${n.date}T09:00:00Z`,
    tags: [n.sev === 1 ? 'stop' : n.sev === 2 ? 'fix-soon' : 'later', n.status, ...n.stack],
    _sigship: { severity: n.sev, status: n.status, rules: n.rules, technical_title: n.title.dev, technical_summary: n.summary.dev, fix: n.action.dev, cve: n.cve || null },
  })),
}, null, 2);

export const rssXml = (origin) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>SIGSHIP Lookout</title>
<link>${origin}/lookout/</link>
<atom:link href="${origin}/lookout/rss.xml" rel="self" type="application/rss+xml"/>
<description>New ways attackers get into AI-built apps, each mapped to what SIGSHIP covers, is writing, or is watching.</description>
<language>en</language>
${NOTICES.map((n) => `<item>
<title>${esc(n.title.plain)}</title>
<link>${origin}/lookout/#${n.slug}</link>
<guid isPermaLink="true">${origin}/lookout/#${n.slug}</guid>
<pubDate>${new Date(`${n.date}T09:00:00Z`).toUTCString()}</pubDate>
<description>${esc(`${n.short.plain} SIGSHIP: ${STATUS[n.status].plain}. ${n.action.plain}`)}</description>
</item>`).join('\n')}
</channel>
</rss>
`;
