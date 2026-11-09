// Plans and features for the pricing section. One source for the cards, the comparison table and the waitlist form.
// Only Free is on sale. Everything in a paid plan is planned, and the page says so.

export const PLAN_IDS = ['free', 'pro', 'business', 'solo', 'team', 'agency'];

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
        cta: { label: 'Get started free', href: '#start' },
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
          'Pro pack of extra checks',
          'Deep Supabase policy check',
          'Security headers and login rate limits',
          'Hallucinated and vulnerable packages',
          'Secrets in your git history',
          'Prompts tuned for Lovable, Cursor, Bolt and more',
          'Pre-commit hook and GitHub code scanning',
          'Pull request comments and nightly checks',
          'Client report and pre-launch checklist PDF',
          'Accepted risks file',
          'Slack, Discord and email alerts',
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
        items: ['25 repos', 'White-label client reports', 'Priority support', 'Unlimited team members'],
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
        note: 'Yearly billing saves 20%. Cancel anytime.',
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
          'Connect from GitHub, Lovable, Bolt, Replit or v0',
          'Checks on every push and every night',
          'Live site scan, 1 site daily',
          'Live Supabase probe',
          'SSL, domain and downtime alerts',
          'New vulnerability alerts',
          'Launch readiness score and history',
          'Automatic re-check after a fix',
          '"Checked by SIGSHIP" badge',
          '3 projects, email alerts and support',
        ],
      },
      {
        id: 'team',
        note: 'Yearly billing saves 20%. Cancel anytime.',
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
          '10 projects and 5 seats',
          'Live site scans, 10 sites hourly',
          'One-click fix pull requests',
          'Pull request comments and merge block',
          'Slack, Discord and email alerts',
          'Roles and activity log',
          'Priority support',
        ],
      },
      {
        id: 'agency',
        note: 'Yearly billing saves 20%. Cancel anytime.',
        name: 'Agency',
        tag: 'Waitlist',
        price: '$149',
        monthly: '$186',
        per: 'a month, billed yearly',
        perMonthly: 'a month, billed monthly',
        tagline: 'For agencies running many client apps.',
        cta: { label: 'Join the waitlist', plan: 'agency' },
        lead: 'Everything in Team, plus',
        items: ['30 projects and 15 seats', 'Live site scans, 30 sites hourly', 'White-label client reports', 'An alert channel per client', 'Single sign-on', 'Onboarding call'],
      },
    ],
  },
];

// Comparison table. A cell is true (included), false (not included) or text. Order: free, pro, business, solo, team, agency.
const all = [true, true, true, true, true, true];
const paid = [false, true, true, true, true, true];
const cloud = [false, false, false, true, true, true];
const selfPaid = [false, true, true, false, false, false];

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
      ['Pro pack', 'Open Firebase rules, public storage buckets, routes that change data with no auth, Razorpay webhooks, upload limits, open redirects and weak session cookies.', paid],
      ['Deep Supabase policy check', 'Finds policies that exist but do not restrict anything, the service key used in the browser, and email confirmation turned off.', paid],
      ['Security headers', 'Content security policy, clickjacking protection and HSTS in your Next.js, Vercel or Netlify config.', paid],
      ['Login and signup rate limits', 'Catches auth endpoints anyone can hammer with guesses.', paid],
      ['Hallucinated and look-alike packages', 'AI tools sometimes invent package names, and attackers register them. SIGSHIP flags packages that look wrong.', paid],
      ['Known vulnerable packages', 'Checks your dependencies against public security advisories.', paid],
      ['Secrets in git history', 'Finds keys that were committed once and deleted later. They are still in your history.', paid],
      ['AI app checks', 'User input pasted into system prompts, and AI output rendered as raw HTML.', paid],
      ['More payment webhooks', 'Paddle, Lemon Squeezy and Polar, as well as Stripe and Razorpay.', paid],
    ],
  },
  {
    group: 'Fix',
    rows: [
      ['Fix prompt for any AI tool', 'Every finding as one prompt you can paste into your AI tool.', all],
      ['Prompts tuned for your tool', 'Fix prompts written for Lovable, Cursor, Bolt, Claude Code and Replit.', paid],
      ['One-click fix pull requests', 'SIGSHIP opens a pull request with the fix for simple problems.', [false, false, false, false, true, true]],
      ['Automatic re-check after a fix', 'Push a fix, and SIGSHIP checks again on its own.', cloud],
    ],
  },
  {
    group: 'Where it runs',
    rows: [
      ['Terminal, browser dashboard and MCP', 'Run it yourself, click through results in your browser, or give it to your coding agent.', all],
      ['Pull request check', 'A GitHub check that fails when a change brings a serious problem back.', all],
      ['Pre-commit hook', 'Stops a secret before it is ever committed.', selfPaid],
      ['GitHub code scanning', 'Findings appear in the Security tab of your GitHub repo.', paid],
      ['Pull request comments and nightly checks', 'Results posted on each pull request, and a check every night.', paid],
      ['Connect from AI builders', 'Connect projects from GitHub, Lovable, Bolt, Replit and v0. Nothing to install.', cloud],
    ],
  },
  {
    group: 'Watch',
    rows: [
      ['Live site scan', 'Checks your deployed site from the outside: exposed .env or .git, source maps, missing headers and open admin pages.', [false, false, false, '1 site, daily', '10 sites, hourly', '30 sites, hourly']],
      ['Live Supabase probe', 'Tries your public key the way an attacker would and reports which tables it can read.', cloud],
      ['SSL, domain and downtime alerts', 'Warns you before a certificate or domain expires, and when the site goes down.', cloud],
      ['New vulnerability alerts', 'Tells you when a package you use gets a new security advisory.', cloud],
    ],
  },
  {
    group: 'Reports',
    rows: [
      ['Terminal, JSON and Markdown output', 'For people, scripts and pull request comments.', all],
      ['Client-ready report', 'A clean HTML report to send to a client or investor.', paid],
      ['Pre-launch checklist PDF', 'A one-page checklist showing what was checked before launch.', paid],
      ['White-label reports', 'Your logo and name on client reports.', [false, false, true, false, false, true]],
      ['Launch readiness score and history', 'A score from 0 to 100, and a graph of your app getting safer.', cloud],
      ['"Checked by SIGSHIP" badge', 'A badge for your site showing the latest verdict. It never claims your app is certified.', cloud],
    ],
  },
  {
    group: 'Team and control',
    rows: [
      ['Accepted risks file', 'Mark a finding as known, with a reason and an expiry date, so it stops blocking.', paid],
      ['Alerts', 'Where SIGSHIP tells you when something turns NO-GO.', [false, 'Slack, Discord, email', 'Slack, Discord, email', 'Email', 'Slack, Discord, email', 'All, plus a channel per client']],
      ['Roles and activity log', 'Who can do what, and a record of what changed.', [false, false, false, false, true, true]],
      ['Single sign-on', 'Sign in with your company identity provider.', [false, false, false, false, false, true]],
    ],
  },
  {
    group: 'Support',
    rows: [['Support', 'How to reach us.', ['Community', 'Email', 'Priority', 'Email', 'Priority', 'Onboarding call']]],
  },
];
