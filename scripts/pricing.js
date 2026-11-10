// Plans and features for the pricing section. One source for the cards, the comparison table and the waitlist form.
// Only Free is on sale today. Every paid feature carries a status: 'launch' (built and in use today) or the month
// it rolls out by. The site shows the status next to the feature, and a feature that misses its month is refunded on request.

export const PLAN_IDS = ['free', 'pro', 'business', 'solo', 'team', 'agency'];

// Feature status: the label shown on the site, and its colour.
export const STATUS = {
  launch: { label: 'At launch', long: 'Built and in use today', c: 'go' },
  dec: { label: 'By December', long: 'Rolling out by December 2026', c: 'amber' },
  jan: { label: 'By January', long: 'Rolling out by January 2027', c: 'amber' },
  feb: { label: 'By February', long: 'Rolling out by February 2027', c: 'amber' },
};
export const REFUND_LINE = 'A feature that misses its date is refunded on request.';
// A plan item is a string (live today, no label) or [text, status].
export const item = (f) => (Array.isArray(f) ? { text: f[0], status: f[1] } : { text: f, status: '' });

export const TRACKS = [
  {
    id: 'self',
    label: 'Self-hosted',
    blurb: 'Runs on your machine and in your own GitHub. Your code never leaves.',
    plans: [
      {
        id: 'free',
        name: 'Free',
        tag: 'Available now',
        price: '$0',
        per: 'forever',
        tagline: 'The open source check for every AI-built app.',
        cta: { label: 'Get started free', href: '/check/' },
        alt: { label: 'Read the code', href: 'https://github.com/sigship/sigship' },
        lead: 'What you get today',
        items: [
          '17 core checks',
          'Unlimited repos, on your machine',
          'Terminal, browser dashboard and MCP',
          'Pull request check for GitHub',
          'Fix prompt for any AI tool',
          'JSON and Markdown output',
          'Open source under MIT',
          'Community support on GitHub',
          'Self-checked badge for your site',
          ['Known vulnerable packages, opt-in online check', 'dec'],
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        tag: 'Waitlist',
        featured: true,
        price: '$149',
        per: 'one-time',
        note: 'Includes 1 year of new checks. Keep it forever.',
        tagline: 'Every check we have, on your own machine and CI.',
        cta: { label: 'Join the waitlist', plan: 'pro' },
        lead: 'Everything in Free, plus',
        items: [
          ['Pro pack of 7 extra checks', 'launch'],
          ['Client-ready HTML report', 'launch'],
          ['Pull request comments and nightly checks', 'launch'],
          ['Slack alert when a nightly check fails', 'launch'],
          ['Deep Supabase policy check', 'dec'],
          ['Security headers and login rate limits', 'dec'],
          ['Hallucinated and look-alike packages', 'dec'],
          ['Secrets in your git history', 'dec'],
          ['Prompts tuned for Lovable, Cursor, Bolt and more', 'dec'],
          ['Pre-commit hook and GitHub code scanning', 'dec'],
          ['Accepted risks file', 'dec'],
          ['Pre-launch checklist PDF', 'dec'],
          ['Deep self-check badge', 'dec'],
          '5 repos, unlimited team members',
          'Email support',
        ],
      },
      {
        id: 'business',
        name: 'Business',
        tag: 'Waitlist',
        price: '$499',
        per: 'one-time',
        note: 'Includes 1 year of new checks. Keep it forever.',
        tagline: 'For studios and agencies shipping client apps.',
        cta: { label: 'Join the waitlist', plan: 'business' },
        lead: 'Everything in Pro, plus',
        items: ['25 repos', ['White-label client reports', 'dec'], 'Priority support', 'Unlimited team members'],
      },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    blurb: 'We run it for you. Connect a repo, and SIGSHIP keeps watch on your code and your live site.',
    plans: [
      {
        id: 'solo',
        note: 'Yearly billing saves 20%. Cancel anytime. 14-day trial, no card.',
        name: 'Solo',
        tag: 'Waitlist',
        price: '$19',
        monthly: '$24',
        per: 'a month, billed yearly',
        perMonthly: 'a month, billed monthly',
        tagline: 'For a founder with an app in production.',
        cta: { label: 'Join the waitlist', plan: 'solo' },
        lead: 'All Pro checks, plus',
        items: [
          ['Connect through GitHub, for apps from Lovable, Bolt, Replit and v0', 'jan'],
          ['Checks on every push and every night', 'jan'],
          ['Live site scan, 1 site daily', 'jan'],
          ['Live Supabase probe', 'jan'],
          ['SSL, domain and downtime alerts', 'jan'],
          ['New vulnerability alerts', 'jan'],
          ['Launch readiness score and history', 'jan'],
          ['Automatic re-check after a fix', 'jan'],
          ['Checked daily badge, drawn by sigship.dev', 'jan'],
          ['3 projects, email alerts and support', 'jan'],
        ],
      },
      {
        id: 'team',
        note: 'Yearly billing saves 20%. Cancel anytime. 14-day trial, no card.',
        name: 'Team',
        tag: 'Waitlist',
        featured: true,
        price: '$59',
        monthly: '$74',
        per: 'a month, billed yearly',
        perMonthly: 'a month, billed monthly',
        tagline: 'For small teams shipping every week.',
        cta: { label: 'Join the waitlist', plan: 'team' },
        lead: 'Everything in Solo, plus',
        items: [
          ['10 projects and 5 seats', 'feb'],
          ['Live site scans, 10 sites hourly', 'feb'],
          ['Draft fix pull requests for simple problems', 'feb'],
          ['Pull request comments and merge block', 'feb'],
          ['Slack, Discord and email alerts', 'feb'],
          ['Roles and activity log', 'feb'],
          ['Live-checked badge with a clean-days streak', 'feb'],
          'Priority support',
        ],
      },
      {
        id: 'agency',
        note: 'Yearly billing saves 20%. Cancel anytime. 14-day trial, no card.',
        name: 'Agency',
        tag: 'Waitlist',
        price: '$149',
        monthly: '$186',
        per: 'a month, billed yearly',
        perMonthly: 'a month, billed monthly',
        tagline: 'For agencies running many client apps.',
        cta: { label: 'Join the waitlist', plan: 'agency' },
        lead: 'Everything in Team, plus',
        items: [['30 projects and 15 seats', 'feb'], ['Live site scans, 30 sites hourly', 'feb'], ['White-label client reports', 'feb'], ['An alert channel per client', 'feb'], ['Sign in with Google or GitHub', 'jan'], 'Onboarding call'],
      },
    ],
  },
];

// Comparison table. A cell is true (included), false (not included) or text. Order: free, pro, business, solo, team, agency.
// The fourth field is the status: one key for the row, or one key per plan ('' for a plan where the cell is live or empty).
const all = [true, true, true, true, true, true];
const paid = [false, true, true, true, true, true];
const cloud = [false, false, false, true, true, true];
const selfPaid = [false, true, true, false, false, false];
const selfDec = ['', 'dec', 'dec', 'jan', 'jan', 'jan'];

export const FEATURES = [
  {
    group: 'Plan',
    rows: [
      ['Repos or projects', 'How many codebases the plan covers.', ['Unlimited', '5', '25', '3', '10', '30']],
      ['Team members', 'Who can use it. Self-hosted plans have no seat limit.', ['Unlimited', 'Unlimited', 'Unlimited', '1', '5', '15']],
      ['New checks and updates', 'Self-hosted paid plans include a year of new checks. You keep what you have after that.', ['Always', '1 year', '1 year', 'Always', 'Always', 'Always']],
    ],
  },
  {
    group: 'Checks',
    rows: [
      ['17 core checks', 'Leaked keys, committed .env files, open Supabase tables, unverified Stripe webhooks, AI routes with no spending brake and more.', all],
      ['Pro pack, 7 checks', 'Open Firebase rules, public storage buckets, routes that change data with no auth, Razorpay webhooks, upload limits, open redirects and weak session cookies.', paid, ['', 'launch', 'launch', 'jan', 'jan', 'jan']],
      ['Known vulnerable packages', 'An opt-in online check: add --online and SIGSHIP sends package names and versions to the OSV advisory database, nothing else. Free for everyone.', all, 'dec'],
      ['Deep Supabase policy check', 'Finds policies that exist but do not restrict anything, the service key used in the browser, and email confirmation turned off.', paid, selfDec],
      ['Security headers', 'Content security policy, clickjacking protection and HSTS in your Next.js, Vercel or Netlify config.', paid, selfDec],
      ['Login and signup rate limits', 'Catches auth endpoints anyone can hammer with guesses.', paid, selfDec],
      ['Hallucinated and look-alike packages', 'AI tools sometimes invent package names, and attackers register them. SIGSHIP flags packages that look wrong.', paid, selfDec],
      ['Secrets in git history', 'Finds keys that were committed once and deleted later. They are still in your history.', paid, selfDec],
      ['AI app checks', 'User input pasted into system prompts, and AI output rendered as raw HTML.', paid, selfDec],
      ['More payment webhooks', 'Paddle, Lemon Squeezy and Polar, as well as Stripe and Razorpay.', paid, selfDec],
    ],
  },
  {
    group: 'Fix',
    rows: [
      ['Fix prompt for any AI tool', 'Every finding as one prompt you can paste into your AI tool.', all],
      ['Prompts tuned for your tool', 'Fix prompts written for Lovable, Cursor, Bolt, Claude Code and Replit.', paid, selfDec],
      ['Draft fix pull requests for simple problems', 'SIGSHIP opens a draft pull request with the fix for three mechanical problems: a CORS wildcard, a secret in logs and a missing lockfile. You review and merge it.', [false, false, false, false, true, true], 'feb'],
      ['Automatic re-check after a fix', 'Push a fix, and SIGSHIP checks again on its own.', cloud, 'jan'],
    ],
  },
  {
    group: 'Where it runs',
    rows: [
      ['Terminal, browser dashboard and MCP', 'Run it yourself, click through results in your browser, or give it to your coding agent.', all],
      ['Pull request check', 'A GitHub check that fails when a change brings a serious problem back.', all],
      ['Pre-commit hook', 'Stops a secret before it is ever committed.', selfPaid, 'dec'],
      ['GitHub code scanning', 'Findings appear in the Security tab of your GitHub repo.', paid, selfDec],
      ['Pull request comments and nightly checks', 'Results posted on each pull request, and a check every night.', paid, ['', 'launch', 'launch', 'jan', 'jan', 'jan']],
      ['Connect through GitHub', 'Connect apps from Lovable, Bolt, Replit and v0 through their GitHub sync. Nothing to install.', cloud, 'jan'],
    ],
  },
  {
    group: 'Watch',
    rows: [
      ['Live site scan', 'Checks your deployed site from the outside: exposed .env or .git, source maps, missing headers and open admin pages.', [false, false, false, '1 site, daily', '10 sites, hourly', '30 sites, hourly'], ['', '', '', 'jan', 'feb', 'feb']],
      ['Live Supabase probe', 'Tries your public key the way an attacker would and reports which tables it can read, never the rows.', cloud, 'jan'],
      ['SSL, domain and downtime alerts', 'Warns you before a certificate or domain expires, and when the site goes down.', cloud, 'jan'],
      ['New vulnerability alerts', 'Tells you when a package you use gets a new security advisory.', cloud, 'jan'],
    ],
  },
  {
    group: 'Reports',
    rows: [
      ['Terminal, JSON and Markdown output', 'For people, scripts and pull request comments.', all],
      ['Client-ready report', 'A clean HTML report to send to a client or investor.', paid, ['', 'launch', 'launch', 'jan', 'jan', 'jan']],
      ['Pre-launch checklist', 'A one-page checklist showing what was checked before launch. Print it to PDF.', paid, selfDec],
      ['White-label reports', 'Your logo and name on client reports.', [false, false, true, false, false, true], ['', '', 'dec', '', '', 'feb']],
      ['Launch readiness score and history', 'A score from 0 to 100 with a published formula, and a graph of your app getting safer.', cloud, 'jan'],
      ['Badge for your site', 'Comes with the plan, never sold alone. Each badge has its own ID and links to its record on sigship.dev. It never claims your app is certified.', ['Self-checked', 'Deep self-check', 'Deep self-check', 'Checked daily', 'Live-checked', 'Live-checked'], ['', 'dec', 'dec', 'jan', 'feb', 'feb']],
    ],
  },
  {
    group: 'Team and control',
    rows: [
      ['Accepted risks file', 'Mark a finding as known, with a reason and an expiry date, so it stops blocking.', paid, selfDec],
      ['Alerts', 'Where SIGSHIP tells you when something turns NO-GO.', [false, 'Slack', 'Slack', 'Email', 'Slack, Discord, email', 'All, plus a channel per client'], ['', 'launch', 'launch', 'jan', 'feb', 'feb']],
      ['Roles and activity log', 'Who can do what, and a record of what changed.', [false, false, false, false, true, true], 'feb'],
      ['Sign in with Google or GitHub', 'One click to sign in. No passwords to keep.', cloud, 'jan'],
    ],
  },
  {
    group: 'Support',
    rows: [['Support', 'How to reach us.', ['Community', 'Email', 'Priority', 'Email', 'Priority', 'Onboarding call']]],
  },
];
