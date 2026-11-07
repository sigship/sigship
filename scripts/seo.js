// Search and plain-English content shared by the site builds: structured data helpers, the home page FAQ,
// a plain explanation and questions for every check, the glossary and the guides.
// Write for a builder who has never heard the jargon: plain words first, the technical term second.

export const ORIGIN = 'https://sigship.dev';
export const GH = 'https://github.com/sigship/sigship';
export const NPM = 'https://www.npmjs.com/package/sigship';
export const DISCORD = 'https://discord.gg/hKG6rNM4W';
export const PUBLISHED = '2026-11-08';
// IndexNow key: public by design. It is served at /4545ec5815994cddeed0d89c88ad8e57.txt so search engines can confirm our submissions.
export const INDEXNOW_KEY = '4545ec5815994cddeed0d89c88ad8e57';

const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
// JSON-LD inside a script tag: escape "<" so no value can close the tag.
export const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export const ORG = {
  '@type': 'Organization',
  '@id': `${ORIGIN}/#org`,
  name: 'Zoof04 Inc.',
  alternateName: 'zoof04',
  url: 'https://zoof04.com',
  email: 'support@sigship.dev',
  logo: `${ORIGIN}/apple-touch-icon.png`,
  sameAs: [GH, NPM, DISCORD],
};

export const appLd = ({ version, description }) => ({
  '@type': 'SoftwareApplication',
  '@id': `${ORIGIN}/#app`,
  name: 'SIGSHIP',
  url: `${ORIGIN}/`,
  description,
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: 'Security scanner',
  operatingSystem: 'macOS, Windows, Linux',
  softwareVersion: version,
  downloadUrl: NPM,
  installUrl: `${ORIGIN}/docs/#start`,
  license: 'https://opensource.org/licenses/MIT',
  isAccessibleForFree: true,
  image: `${ORIGIN}/og.png`,
  publisher: { '@id': `${ORIGIN}/#org` },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
  keywords: 'vibe coding security, AI-built app security, Lovable security, Supabase RLS check, leaked API key scanner, Stripe webhook verification, pre-launch checklist, MCP server',
});

// FAQ structured data from the visible questions on a page, so the two can never disagree.
export const faqFromHtml = (html) => {
  const qa = [...html.matchAll(/<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="acc-body">([\s\S]*?)<\/div>\s*<\/details>/g)]
    .map((m) => ({ q: strip(m[1]), a: strip(m[2]) })).filter((x) => x.q && x.a);
  if (!qa.length) return null;
  return { '@type': 'FAQPage', mainEntity: qa.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
};

export const crumbs = (list) => ({
  '@type': 'BreadcrumbList',
  itemListElement: list.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${ORIGIN}${path}` })),
});

// ---------- Home page questions (shown on the page, and used for its FAQ data) ----------
export const HOME_FAQ = [
  ['What is SIGSHIP?', 'A free safety check for apps built with AI tools like Lovable, Bolt, Cursor, Replit, v0 and Claude Code. It reads your app\'s code on your own computer and tells you, in plain English, what could leak, break or cost you money once real people use it, and how to fix each one.'],
  ['Is my vibe-coded app safe to launch?', 'Maybe not yet. AI tools often leave the same few mistakes behind: API keys in the code, database tables anyone can read, payment events nobody checks, and AI features with no spending limit. SIGSHIP looks for those and says GO when none are left. A GO doesn\'t prove the app is safe, but it means these common mistakes are gone.'],
  ['Does it work with Lovable, Bolt, Replit and v0?', 'Yes. Connect your project to GitHub (most AI builders have a button for it), download the code to your computer, and run npx sigship in that folder. It also works in Cursor, Claude Code and any project with JavaScript or TypeScript code.'],
  ['Do I need to know how to code?', 'No. You run one command, and it gives you one prompt to paste into your AI tool, which makes the fixes for you. Then you run the check again until it says GO.'],
  ['Does SIGSHIP upload my code?', 'No. The free tool runs entirely on your computer and makes no network calls. Your code, keys and results never leave your machine.'],
  ['Is it really free?', 'Yes. The tool is open source under the MIT licence, with no signup, no card and no limit on projects. Paid plans with extra checks are on the waitlist.'],
];

// ---------- Checks: a plain explanation, a search-friendly title, and questions people ask ----------
export const CHECK_EXTRA = {
  'secret-in-code': {
    seoTitle: 'API key or secret found in your code: how to fix it',
    plain: 'A secret key (a password that lets your app use a paid service, like OpenAI or Stripe) is written directly in your code. Anyone who can see the code, or the JavaScript your site sends to visitors, can copy it and use it on your bill.',
    faq: [['How do I know if my API key is exposed?', 'If the key is written in a file that ships to the browser, or in a public GitHub repo, treat it as exposed. SIGSHIP points to the file and line, without printing the key itself.'], ['Is deleting the key from my code enough?', 'No. Once a key has been exposed, copies may already exist. Create a new key in the provider\'s dashboard, delete the old one, and keep the new one in a server-side environment variable.']],
  },
  'env-file-committed': {
    seoTitle: '.env file committed to git: how to remove it safely',
    plain: 'Your .env file holds your app\'s secret keys. It has been saved into git, the history of your project, so anyone with a copy of the project, now or later, can read every key in it.',
    faq: [['Does deleting the .env file fix it?', 'No. Git keeps every old version, so the keys stay in the history. Stop tracking the file, add it to .gitignore, and replace every key it contained with a new one.'], ['What is .gitignore?', 'A list of files that git should never save. Your .env file belongs on it, so secrets stay on your computer and your host\'s settings, not in the project history.']],
  },
  'public-env-secret': {
    seoTitle: 'Secret key with a NEXT_PUBLIC_ or VITE_ prefix: why it leaks',
    plain: 'Some setting names start with a word like NEXT_PUBLIC_ or VITE_, which tells your build tool to copy the value into the website every visitor downloads. A secret with one of those names is public, even if it looks hidden.',
    faq: [['Which prefixes make a variable public?', 'Common ones are NEXT_PUBLIC_ in Next.js, VITE_ in Vite, PUBLIC_ in SvelteKit and Astro, REACT_APP_ in Create React App, and EXPO_PUBLIC_ in Expo. Only values that are safe for anyone to see should use them.'], ['Is the Supabase anon key safe to make public?', 'It is designed to be public, but only if row level security is on for every table. Your service role key must never be public.']],
  },
  'ai-key-in-browser': {
    seoTitle: 'OpenAI or Anthropic API key exposed in the browser: fix it',
    plain: 'Your app calls an AI service like OpenAI straight from the visitor\'s browser, which means your AI key is sent to every visitor. Anyone can copy it from their browser and run up your bill.',
    faq: [['Why is calling OpenAI from the frontend dangerous?', 'Anything the browser can use, the visitor can read. Your key shows up in the browser\'s developer tools, and a stranger can use it for their own projects.'], ['What is the safe way to call an AI API?', 'Create a small server route (or edge function) that keeps the key, checks who is asking, limits how often they can ask, and calls the AI service for them.']],
  },
  'rls-missing': {
    seoTitle: 'Supabase table without row level security (RLS): fix it',
    plain: 'Row level security is Supabase\'s lock that decides who can see each row of a table. This table has no lock, and the public key that unlocks your database is inside your website, so anyone can read everything in it.',
    faq: [['What is row level security in Supabase?', 'A set of rules on each table that decides which rows a person can see or change, for example "users can only see their own orders". Without it, the public key can read the whole table.'], ['How do I turn on RLS?', 'Enable row level security on the table, then add a policy, such as only letting a user read rows where user_id matches their login. Supabase\'s own security advisor in the dashboard can confirm it.']],
  },
  'rls-open-write': {
    seoTitle: 'Supabase RLS policy set to true: anyone can write your data',
    plain: 'Your table has a lock (row level security), but one of its rules says "yes" to everyone. That means a stranger can add, change or delete your data.',
    faq: [['What does "using (true)" mean in a policy?', 'It means the rule always passes, for everyone, including people who are not logged in. It turns the lock into an open door.'], ['What should the policy say instead?', 'Usually that the logged-in person owns the row, such as auth.uid() = user_id, for both reading and writing.']],
  },
  'stripe-webhook-unverified': {
    seoTitle: 'Stripe webhook not verified: how to check the signature',
    plain: 'A webhook is the message Stripe sends your app when someone pays. Your app trusts any message that arrives, without checking it really came from Stripe, so someone can fake a "payment succeeded" message and get your paid plan for free.',
    faq: [['How do I verify a Stripe webhook?', 'Use Stripe\'s library to check the signature on every event with your webhook signing secret and the raw request body, and reject anything that fails before you act on it.'], ['Where do I find the webhook signing secret?', 'In the Stripe dashboard, under Developers, then Webhooks, on the page for your endpoint. Keep it in a server-side environment variable.']],
  },
  'sql-string-concat': {
    seoTitle: 'SQL injection risk: user input inside a SQL query',
    plain: 'Text someone types into your app is being glued straight into a database command. A person can type something crafted that your database runs as a command of its own, such as reading or deleting data. This is called SQL injection.',
    faq: [['What is SQL injection?', 'A way to trick a database into running commands by typing them into a form or a link. It happens when an app builds database commands by joining text together.'], ['How do I prevent SQL injection?', 'Use parameterised queries, where the command and the values are sent separately, or a query builder that does it for you. Never build SQL with template strings.']],
  },
  'ai-route-no-rate-limit': {
    seoTitle: 'AI API route with no rate limit: how to cap your AI bill',
    plain: 'Your app has a feature that calls a paid AI service, and nothing limits how often it can be used. One script left running overnight can spend hundreds or thousands of dollars of your credit.',
    faq: [['What is a rate limit?', 'A rule that only lets each person (or each address) make a certain number of requests in a period, such as 20 a minute. Anything above that is refused.'], ['How do I stop a surprise AI bill?', 'Add a rate limit in front of the AI route, require a login for it, and set a monthly spending cap in your AI provider\'s dashboard.']],
  },
  'role-in-local-storage': {
    seoTitle: 'Admin role stored in localStorage: why it is unsafe',
    plain: 'Your app decides who is an admin using a value kept in the visitor\'s own browser. Anyone can change that value in a few seconds and give themselves admin powers.',
    faq: [['Why is localStorage not safe for roles?', 'Visitors control everything in their browser, including localStorage. Anything stored there should be treated as something the user typed.'], ['Where should user roles live?', 'In your database, checked by your server or by database rules every time someone tries a protected action.']],
  },
  'unsanitized-html': {
    seoTitle: 'Raw HTML rendered with dangerouslySetInnerHTML: XSS risk',
    plain: 'Your app shows text from users as raw HTML. Someone can hide a script in a comment or profile, and it runs in the browser of everyone who views it, which can steal their login. This is called XSS (cross-site scripting).',
    faq: [['What is XSS?', 'Cross-site scripting: when an attacker gets their own code to run on your site in other people\'s browsers, usually through text your app shows without cleaning it first.'], ['How do I fix it?', 'Show user text as plain text, or clean it with a library such as DOMPurify before showing it as HTML.']],
  },
  'cors-wildcard': {
    seoTitle: 'CORS set to * (any origin): what it means and the fix',
    plain: 'CORS is the setting that says which websites can talk to your app\'s server from a browser. Yours says "any website", so other sites can call your server.',
    faq: [['Is Access-Control-Allow-Origin * always bad?', 'Not for truly public data. For anything tied to a user or that changes data, list the exact web addresses of your own app instead.'], ['What should I put instead of *?', 'The full address of your site, such as https://yourapp.com, and any other domains you actually use.']],
  },
  'secret-in-logs': {
    seoTitle: 'Passwords or tokens written to logs: how to fix it',
    plain: 'Your app may be writing a password or secret key into its logs, the running notes your server keeps. More people and tools can usually read logs than your database.',
    faq: [['Why are secrets in logs a problem?', 'Logs are copied to hosting dashboards and log services, kept for a long time and shared with teammates, so a secret in a log spreads quietly.'], ['What should I log instead?', 'That the action happened, and maybe who did it, but never the password, token or key itself.']],
  },
  'no-error-boundary': {
    seoTitle: 'React app with no error boundary: avoid the white screen',
    plain: 'If one part of your page hits an error, the whole screen goes blank, and your user sees a white page with no explanation. An error boundary catches the error and shows a friendly message instead.',
    faq: [['What is an error boundary?', 'A React component that catches errors in the parts of the page inside it and shows a fallback, like "Something went wrong, try again", instead of a blank screen.'], ['How do I add one in Next.js?', 'Add an error.tsx file next to your pages. Next.js uses it as the error boundary for that part of the app.']],
  },
  'no-error-tracking': {
    seoTitle: 'No error tracking: find out about bugs before users do',
    plain: 'Nothing tells you when your app breaks for a user. Without error tracking, you only find out when someone is annoyed enough to email you, if they ever do.',
    faq: [['What is error tracking?', 'A service that records errors from your app as they happen, with details, and alerts you. Sentry is a common example.'], ['Do I need it before launch?', 'It is not a blocker, but it is the cheapest way to see what breaks in the first week with real users.']],
  },
  'no-tests': {
    seoTitle: 'No tests: protect signup, login and payments from breaking',
    plain: 'Nothing checks automatically that a change didn\'t break the most important parts of your app, like signing up, logging in and paying. A small fix can quietly break them.',
    faq: [['Which tests matter most?', 'One for each path that brings in money or users: sign up, log in and pay. A few tests there catch the breakages that hurt.'], ['Can my AI tool write the tests?', 'Yes. Ask it for one end-to-end test for each of those paths, and to run them on every change.']],
  },
  'no-lockfile': {
    seoTitle: 'No lockfile (package-lock.json): make deploys repeatable',
    plain: 'A lockfile records the exact version of every package your app uses. Without one, each deploy can quietly install newer versions, and your live app can break with no change from you.',
    faq: [['What is package-lock.json?', 'The lockfile npm creates. It pins every package to an exact version so every install, on any computer or server, gets the same code.'], ['Should I commit the lockfile?', 'Yes. Commit package-lock.json, pnpm-lock.yaml, yarn.lock or bun.lockb, whichever your project uses.']],
  },
};

// ---------- Glossary: the jargon, in plain English ----------
// [id, term, plain meaning, optional link]
export const GLOSSARY = [
  ['api-key', 'API key', 'A secret password that lets your app use a paid service, such as OpenAI, Stripe or Resend. Whoever has it can spend your money, so it must never be in code that visitors can see.', '/checks/secret-in-code/'],
  ['environment-variable', 'Environment variable (.env)', 'A setting kept outside your code, often in a file called .env or in your host\'s dashboard. It is where secret keys belong.', '/checks/env-file-committed/'],
  ['frontend-backend', 'Frontend and backend', 'The frontend is what runs in the visitor\'s browser, so anyone can see it. The backend (or server) runs on your host, out of sight. Secrets belong only in the backend.'],
  ['server-route', 'Server route, API route or edge function', 'A small piece of backend code your website calls. It can keep secrets, check who is asking and talk to paid services safely.'],
  ['repo', 'Repo (repository)', 'The folder that holds your app\'s code, usually tracked with git and often stored on GitHub.'],
  ['git', 'Git and git history', 'A tool that saves every version of your code. Old versions stay in the history, so something deleted later can still be found.'],
  ['commit', 'Commit', 'A saved snapshot of your code in git, with a short note about what changed.'],
  ['pull-request', 'Pull request (PR)', 'A proposed change on GitHub that can be reviewed and checked before it is added to the main code.'],
  ['ci', 'CI and GitHub checks', 'Automatic checks that run on every change, like tests or SIGSHIP. A failing check warns you before the change goes live.'],
  ['terminal', 'Terminal', 'The text window where you type commands. On a Mac it is the Terminal app; on Windows it is PowerShell.'],
  ['node', 'Node.js', 'The free program that runs JavaScript tools on your computer. SIGSHIP needs it, version 22 or newer, from nodejs.org.'],
  ['npx', 'npx', 'A command that comes with Node.js and runs a tool without installing it first. npx sigship downloads and runs SIGSHIP in one step.'],
  ['supabase', 'Supabase', 'A popular database and login service used by many AI app builders, including Lovable and Bolt.'],
  ['rls', 'Row level security (RLS)', 'Supabase\'s lock on each table that decides who can see or change each row. Without it, anyone with your public key can read the whole table.', '/checks/rls-missing/'],
  ['policy', 'Policy', 'One rule inside row level security, such as "people can only read their own orders".', '/checks/rls-open-write/'],
  ['anon-key', 'Anon key and service role key', 'Supabase gives you two keys. The anon key is meant to be public and is only safe with row level security on. The service role key skips every lock and must stay on the server.'],
  ['webhook', 'Webhook', 'A message one service sends to your app when something happens, such as Stripe telling you a payment went through. Your app must check it really came from that service.', '/checks/stripe-webhook-unverified/'],
  ['rate-limit', 'Rate limit', 'A cap on how often each person can use a feature, such as 20 times a minute. It stops scripts from running up your bill.', '/checks/ai-route-no-rate-limit/'],
  ['cors', 'CORS', 'A setting that says which websites may call your server from a browser. "*" means any website.', '/checks/cors-wildcard/'],
  ['sql-injection', 'SQL injection', 'Tricking a database into running a command by typing it into a form. It happens when apps glue user text into database commands.', '/checks/sql-string-concat/'],
  ['xss', 'XSS (cross-site scripting)', 'When someone gets their own script to run on your site in other people\'s browsers, usually through text your app shows as raw HTML.', '/checks/unsanitized-html/'],
  ['local-storage', 'localStorage', 'A small storage space in the visitor\'s browser. Visitors can read and change it, so it can\'t be trusted for things like admin access.', '/checks/role-in-local-storage/'],
  ['logs', 'Logs', 'Running notes your app and host keep about what happened. Many people and tools can read them, so secrets don\'t belong there.', '/checks/secret-in-logs/'],
  ['error-boundary', 'Error boundary', 'A safety net in a React app that shows a friendly message when part of the page fails, instead of a blank white screen.', '/checks/no-error-boundary/'],
  ['error-tracking', 'Error tracking', 'A service, such as Sentry, that records errors from your live app and alerts you.', '/checks/no-error-tracking/'],
  ['lockfile', 'Lockfile', 'A file, such as package-lock.json, that pins every package your app uses to an exact version, so deploys don\'t change by surprise.', '/checks/no-lockfile/'],
  ['deploy', 'Deploy and production', 'Deploying means putting your app online. Production is the live version real people use.'],
  ['mcp', 'MCP (Model Context Protocol)', 'A standard way to give AI coding tools extra abilities. SIGSHIP\'s MCP server lets Claude Code, Cursor and others run the check themselves.', '/ai-agents/'],
  ['coding-agent', 'Coding agent', 'An AI tool that writes and changes code for you, such as Claude Code, Cursor, or the agents inside Lovable, Bolt and Replit.', '/ai-agents/'],
  ['go-no-go', 'GO and NO-GO', 'SIGSHIP\'s verdict. NO-GO means something serious blocks launch. GO means these checks found nothing that blocks launch. It does not prove the app is safe.', '/docs/#report'],
  ['severity', 'SEV-1, SEV-2 and SEV-3', 'How serious a problem is. SEV-1 exposes data or money, SEV-2 makes abuse easy, and both block launch. SEV-3 is worth fixing but doesn\'t block.', '/docs/#report'],
  ['exit-code', 'Exit code', 'A number a command returns when it finishes. SIGSHIP returns 0 for GO and 1 for NO-GO, so scripts and AI agents can tell the result.', '/docs/#exit'],
  ['false-positive', 'False positive', 'A warning about something that is actually fine. Pattern checks sometimes get it wrong, and you can report it.'],
  ['self-hosted-cloud', 'Self-hosted and Cloud', 'Self-hosted runs on your own computer, like an app you install. Cloud is run for you on someone else\'s servers, like Gmail.', '/pricing/'],
  ['open-source', 'Open source (MIT)', 'The code is public for anyone to read, use and change. MIT is a short, permissive open source licence.'],
];

// ---------- Guides: plain-English articles for common questions ----------
const g = (path) => `<a href="${path}">`;
export const GUIDES = [
  {
    slug: 'vibe-coding-security-checklist',
    title: 'Vibe coding security checklist: 10 checks before launch',
    short: 'Vibe coding security checklist',
    description: 'A plain-English checklist for apps built with Lovable, Bolt, Cursor, Replit or v0: the ten mistakes AI tools leave behind most, and how to fix each one.',
    lede: 'AI tools build fast, and they leave the same few mistakes behind again and again. Here are the ten worth checking before real people use your app, in order of how much they can hurt.',
    body: `<h2>The five that can cost you money or data</h2>
<ol class="steps">
<li><b>No secret keys in your code.</b> Keys for OpenAI, Stripe and other paid services belong in environment variables on your server, never in code the browser downloads. ${g('/checks/secret-in-code/')}How to fix it</a>.</li>
<li><b>Your .env file isn't saved in git.</b> If it is, every key in it is in your project's history. Replace the keys and stop tracking the file. ${g('/checks/env-file-committed/')}How to fix it</a>.</li>
<li><b>Every database table is locked.</b> In Supabase, turn on row level security for every table and add rules for who can read and change each row. ${g('/guides/supabase-rls-explained/')}Supabase RLS, explained simply</a>.</li>
<li><b>Payments are verified.</b> Your app should only unlock paid features after checking that the payment message really came from Stripe. ${g('/checks/stripe-webhook-unverified/')}How to fix it</a>.</li>
<li><b>AI features have a spending limit.</b> Put a rate limit in front of any feature that calls a paid AI service, and set a monthly cap with your AI provider. ${g('/checks/ai-route-no-rate-limit/')}How to fix it</a>.</li>
</ol>
<h2>The five that make abuse easy or hide problems</h2>
<ol class="steps" start="6">
<li><b>Admin access is checked on the server,</b> not decided by a value in the visitor's browser. ${g('/checks/role-in-local-storage/')}Why</a>.</li>
<li><b>User text is shown as text,</b> not raw HTML, so nobody can hide a script in a comment. ${g('/checks/unsanitized-html/')}Why</a>.</li>
<li><b>Only your site can call your server.</b> Replace a CORS setting of "*" with your real web address. ${g('/checks/cors-wildcard/')}Why</a>.</li>
<li><b>You'll hear about errors before your users do.</b> Add error tracking and a friendly error screen. ${g('/checks/no-error-tracking/')}Why</a>.</li>
<li><b>Signup, login and payments are tested.</b> One automatic test for each catches the breakages that hurt most. ${g('/checks/no-tests/')}Why</a>.</li>
</ol>
<h2>Check all ten in one go</h2>
<p>SIGSHIP checks for these and more on your own computer, for free. Open a terminal in your project folder and run:</p>
<pre class="cmd-block"><code>npx sigship</code></pre>
<p>Then run <code>npx sigship --prompt</code> and paste the result into your AI tool. It fixes everything in order. Run the check again until it says <b>GO</b>. A GO means these checks found nothing that blocks launch. It does not prove the app is safe.</p>`,
    faq: [['Is vibe coding safe for production apps?', 'It can be, if you check the result. AI tools write working code quickly, but they often skip security steps like locking database tables or verifying payments. A checklist and an automatic check catch most of them.'], ['What is the most common security mistake in AI-built apps?', 'Secret keys and open databases. AI tools often put API keys where the browser can see them, and create Supabase tables without row level security.']],
  },
  {
    slug: 'check-lovable-bolt-replit-app',
    title: 'How to check an app built with Lovable, Bolt, Replit or v0',
    short: 'Check a Lovable, Bolt, Replit or v0 app',
    description: 'Step by step: get the code of your Lovable, Bolt, Replit or v0 app onto your computer and check it for leaked keys, open databases and other launch blockers, free.',
    lede: 'Your app lives inside an AI builder, but checking it takes the code on your own computer. It takes about five minutes, and you don\'t need to know how to code.',
    body: `<h2>1. Get your code onto your computer</h2>
<ul>
<li><b>Lovable or Bolt:</b> use the GitHub button in the builder to connect your project to a GitHub repository. Then, on GitHub, click <b>Code</b> and <b>Download ZIP</b>, and unzip it.</li>
<li><b>Replit:</b> download your project as a ZIP file from the Files menu, or connect it to GitHub and download from there.</li>
<li><b>v0:</b> download the generated code, or push it to GitHub, and download the project.</li>
</ul>
<p>Button names change from time to time. If you can't find them, ask the builder's own assistant: "How do I download my code or sync it to GitHub?"</p>
<h2>2. Install Node.js once</h2>
<p>Download Node.js version 22 or newer from <a href="https://nodejs.org">nodejs.org</a> and install it like any app. It's free.</p>
<h2>3. Run the check</h2>
<p>Open the Terminal app (Mac) or PowerShell (Windows). Type <code>cd</code> and a space, drag your project folder into the window, and press Enter. Then run:</p>
<pre class="cmd-block"><code>npx sigship ui</code></pre>
<p>This opens a private page in your browser with the verdict, every problem in plain English, and a button to copy the fixes. It runs on your computer only. Nothing is uploaded.</p>
<h2>4. Let your AI builder fix it</h2>
<p>Copy the fix prompt and paste it into the builder's chat. When it's done, sync and download again, and re-run the check until it says <b>GO</b>.</p>
<h2>5. Check the settings in your dashboards too</h2>
<p>SIGSHIP reads your code, so it can't see settings you changed only on a website, like Supabase table rules made in the dashboard. Run Supabase's own security advisor as well. ${g('/guides/supabase-rls-explained/')}Supabase RLS, explained simply</a>.</p>`,
    faq: [['Can SIGSHIP check my Lovable app without downloading it?', 'Not yet. The free tool reads code on your computer, so you download the project first. SIGSHIP Cloud, on the waitlist, is planned to connect to builders directly.'], ['Will running SIGSHIP change my app?', 'No. It only reads your files. Your AI tool makes the fixes.']],
  },
  {
    slug: 'supabase-rls-explained',
    title: 'Supabase row level security (RLS), explained simply',
    short: 'Supabase RLS, explained simply',
    description: 'What Supabase row level security is, why AI-built apps often ship without it, and how to turn it on and write a basic policy, in plain English.',
    lede: 'If your app uses Supabase, row level security is the single most important setting to get right. Here\'s what it is and how to check yours, without the jargon.',
    body: `<h2>What it is</h2>
<p>Your Supabase database comes with a public key that lives inside your website. That's normal: it's how your site talks to the database. <b>Row level security (RLS)</b> is the lock that decides what that public key is allowed to do, table by table and row by row.</p>
<p>Without RLS, the public key can read every row in the table. With RLS on and a good rule (a <b>policy</b>), each person only sees their own data.</p>
<h2>Why AI-built apps often miss it</h2>
<p>AI tools create tables quickly so your app works right away. Turning on RLS and writing policies is a separate step, and it's easy to skip when everything already seems to work.</p>
<h2>How to turn it on</h2>
<p>For each table, ask your AI tool, or run this in the Supabase SQL editor (replace <code>orders</code> with your table name):</p>
<pre class="cmd-block"><code>alter table orders enable row level security;

create policy "Users read their own orders"
  on orders for select
  using (auth.uid() = user_id);</code></pre>
<p>This turns on the lock, then lets a logged-in person read only the rows where <code>user_id</code> is their own ID. Add similar policies for adding, changing and deleting rows.</p>
<h2>The open-door mistake</h2>
<p>A policy that says <code>using (true)</code> lets everyone through, so RLS looks on but protects nothing. ${g('/checks/rls-open-write/')}Why it matters</a>.</p>
<h2>How to check yours</h2>
<ul><li>Run <code>npx sigship</code> in your project. It finds tables in your migration files without RLS, and policies that let anyone write.</li>
<li>Open Supabase's security advisor in your dashboard, which checks the live database, including settings made there.</li></ul>`,
    faq: [['Is the Supabase anon key a secret?', 'No, it is designed to be public. It is only safe when row level security is on for every table that holds private data. The service role key is the secret one.'], ['Does RLS slow down my app?', 'For most apps, not noticeably. Simple policies like matching the user ID are fast, especially with an index on that column.']],
  },
  {
    slug: 'leaked-api-key',
    title: 'Leaked an API key? What to do in the next 10 minutes',
    short: 'Leaked an API key? What to do now',
    description: 'You pushed an OpenAI, Stripe or other API key to GitHub or your website. Here is exactly what to do, in order, to stop the damage and keep it from happening again.',
    lede: 'It happens to everyone. A key ended up in your code, on GitHub or in your website. Here\'s what to do, in order.',
    body: `<h2>1. Replace the key, right now</h2>
<p>Go to the dashboard of the service (OpenAI, Anthropic, Stripe, Resend and so on). Create a new key, then delete or disable the old one. <b>Deleting the key from your code is not enough</b>: copies may already exist, and git keeps old versions.</p>
<h2>2. Check for damage</h2>
<p>Look at the service's usage and billing page for spending you don't recognise. Set a spending limit if the service offers one. If you see abuse, contact the service's support.</p>
<h2>3. Put the new key somewhere safe</h2>
<p>Store it as an environment variable in your host's settings (Vercel, Netlify, Supabase, Replit Secrets and similar), and only use it in server code. Never give it a public prefix like <code>NEXT_PUBLIC_</code> or <code>VITE_</code>. ${g('/checks/public-env-secret/')}Why</a>.</p>
<h2>4. Clean up the code</h2>
<p>Remove the key from your code and make sure your <code>.env</code> file is on the <code>.gitignore</code> list. ${g('/checks/env-file-committed/')}How</a>.</p>
<h2>5. Make sure it's the only one</h2>
<p>Run <code>npx sigship</code> in your project. It looks for keys in your code, committed .env files and secrets with public names, and tells you where they are without printing them.</p>`,
    faq: [['Does GitHub tell me if I leak a key?', 'GitHub\'s secret scanning catches many known key formats in public repositories and may alert you or the provider. Don\'t rely on it: replace the key yourself as soon as you know.'], ['Can I just make the repository private?', 'It helps going forward, but anyone who saw or copied the key while it was public still has it. Replace the key first.']],
  },
];
