# The Lookout: how to add a notice

The Lookout (`/lookout/`) is a living watch, not a changelog. Every notice is a real incident, advisory or piece of
research that touches apps built with AI tools, mapped to what SIGSHIP does about it. New checks start here.

Everything comes from one file: `scripts/lookout.js`. The home page section, the `/lookout/` page, `feed.json`,
`rss.xml` and `llms-full.txt` are all built from it. Add a notice at the top of `NOTICES`, then `npm run build`.

## The Monday routine (15 minutes)

1. Read the week: The Hacker News, BleepingComputer, Vercel/Supabase/Lovable security notes, Socket and StepSecurity
   blogs, the GitHub advisory database for `next`, `@supabase/*`, `stripe`, `firebase`, `openai`.
2. Pick the one or two items that touch our stacks (Lovable, Bolt, Cursor, v0, Replit, Supabase, Firebase, Next.js,
   Stripe, Razorpay, the AI providers, npm, MCP).
3. Write the notice. Two voices: `plain` for a founder who does not code, `dev` for an engineer. Same facts, no spin.
4. Pick the honest status (the build enforces it):
   - `cov`: a rule in `src/rules.js` finds it today. Every id in `rules` must exist.
   - `part`: SIGSHIP catches the damage, not the cause. At least one id in `rules` must exist.
   - `plan`: a rule is being written. Name it in `rules`; it must NOT exist yet.
   - `watch`: no rule yet. The `action` text must tell people what to do by hand.
5. Add at least one source link. "Spotted by" credits the researcher or outlet, never us.
6. `npm run build && npm test`, look at `/lookout/`, commit, `npm run ship`.

## Fields

```js
{
  slug: 'kebab-case-unique',          // the anchor on /lookout/ and the id in the feeds
  date: '2026-09-23',                 // ISO, when the first source published it
  dateLabel: 'Jan to Feb 2026',       // optional, for a roundup that spans dates
  sev: 1 | 2 | 3,                     // 1 Stop, 2 Fix soon, 3 Later
  status: 'cov' | 'part' | 'plan' | 'watch',
  rules: ['rule-id'],                 // SIGSHIP rule ids this maps to
  stack: ['nextjs', 'supabase'],      // keys from STACKS, drive the filters
  spotted: 'Who found it',
  cve: 'CVE-2026-12345',              // optional, shown in Dev mode
  title: { plain, dev },
  summary: { plain, dev },            // the full story
  short: { plain, dev },              // one or two sentences for the home page card and the feeds
  affects: ['Next.js 16.2 to 16.3.5'],
  sigship: { plain, dev },            // what SIGSHIP does about it, honestly
  action: { plain, dev },             // what the reader should do now
  sources: [['Label, date', 'https://...']],
}
```

## The email list

The "Monday notice by email" form posts to `/api/lookout` on the site Worker (`worker/site.js`). When the Worker secret
`LOOKOUT_API` is set to the cloud subscribe address (`https://app.sigship.dev/api/v1/lookout/subscribe`), the Worker forwards
the address there and the cloud API confirms it by email and sends the notice. Until then the Worker writes it to the waitlist
sheet with `plan=lookout`, and sending the email is manual (filter the sheet by `lookout`). Set it with
`npx wrangler secret put LOOKOUT_API`.
