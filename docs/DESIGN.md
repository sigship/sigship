# The site design

sigship.dev is a static site built by `scripts/build-site.js` into `site/`. One stylesheet (`site/app.css`), one script
(`site/app.js`), no framework and no third-party requests. Dark is the default; every page also works in the light theme.

## Two switches, on every page

- **Theme** (sun/moon button): dark or light. Stored as `sigship-theme` in the visitor's browser. `?theme=light` forces one.
- **Voice** (`simple` / `dev mode` pill): plain words for founders, or the technical version of the same line for developers.
  Stored as `sigship-dev`. Visitors arriving from GitHub or npm start in dev mode. `?mode=dev` or `?mode=plain` forces one.

Write both voices in one place with `T(plain, dev)` in the build script, which renders `<span class="s">…</span><span class="d">…</span>`.
Same facts in both; only the words change. Prices, forms, the verdict and the GO caveat are never inside a voice-only span.

## Tokens

`:root` in `site/app.css` holds the palette in oklch: a near-black neutral background, soft off-white text, thin borders,
and small accents (violet, teal, amber, coral, lime, sky, pink). `html.light` redefines the same tokens for the light theme.
`--go`, `--warn` and `--stop` mean only Ready, Fix soon and Fix now. `--brand` is the flag blue, used for the logo and little else.
Third-party brand marks (Lovable, Cursor, Supabase and so on) keep their own colours; they live in `scripts/brands.js`.

## Motion

CSS only, plus a few scroll listeners in `site/app.js`: the hero shrinks as it scrolls away, the three steps pin and slide
sideways on wide screens, cards rise in as they enter view, the app window fixes its own findings, the dashboard cycles
through demo apps. Everything stops for `prefers-reduced-motion`, and every element is visible without JavaScript.

## Small parts

- **Announcement strip** above the header: `STRIP` in `scripts/build-site.js`, with an end date. Closing it is remembered in the browser.
- **Loader**: flag P waves with a short progress bar while the page loads, once per tab, never for reduced motion (`BOOT` and `BOOT_CSS`).
- **Cloud billing**: yearly prices are the ones in `scripts/pricing.js`; monthly is 25% more (`monthly`), behind the Yearly / Monthly switch.
- **Feature status**: every paid feature in `scripts/pricing.js` carries a status key from `STATUS` (`launch` for built and in use today, or `dec`, `jan`, `feb` for the month it rolls out by). A plan item is `'text'` or `['text', status]`; a comparison row's fourth field is one key for the row or one per plan. The build renders it as a small `.st-tag` label and prints `REFUND_LINE` ("A feature that misses its date is refunded on request") next to the 14-day refund line. Keep the labels true: move a feature to `launch` only when it ships.
- **Checkout**: set `POLAR_CHECKOUT_PRO` and `POLAR_CHECKOUT_BUSINESS` in the build environment (`POLAR_CHECKOUT_PRO=https://polar.sh/... npm run build`) to the Polar checkout links. The Pro and Business buttons then say "Buy" and go to Polar, the plan tag says "On sale", and the docs, terms and FAQ wording follows. Without them the buttons stay on the waitlist. The links must be `https://polar.sh/` or `https://*.polar.sh/` addresses; the build refuses anything else. Cloud plans stay on the waitlist until Solo opens.
- **Check my app**: every "Check my app" button goes to `/check/`, the in-browser check (`scripts/build-check.js`, `site/check/`). The sitemap lists it only when `site/check/index.html` exists.
- **Badges**: `scripts/badges.js` holds the levels (each says which plan it comes with and its status; badges have no price of their own). `scripts/badge-id.js` gives every badge an ID like `SG-S-4K7Q2M` from its level and site, used by the build, by `site/app.js` and by the Worker. The Worker draws `/b/<ID>.svg`: Self-checked (S) from the formula, every other level from its record at `app.sigship.dev/api/v1/badges/<ID>` (JSON `{ id, level, state, site, lastPass, streakSince }`, cached five minutes; Deep self-check (D) also tries the licence server at `api.sigship.dev/v1/badge/<ID>`). No record, or a paused or revoked one, draws a grey badge. `/verify/` looks the same records up in the browser. Every ID links to its record on `/verify/`. The footer carries sigship.dev's own badge, which is Live-checked (the check runs on every change to the site), not Expert-reviewed, until an outside engineer signs a review.
- **Lookout email**: the form on `/lookout/` posts to `/api/lookout` on the Worker, which forwards to the cloud API when the secret `LOOKOUT_API` holds the subscribe address (`https://app.sigship.dev/api/v1/lookout/subscribe`), otherwise to the waitlist sheet as plan `lookout`.
- **Pages with no code behind them**: `/score/` (the readiness score formula, both voices), `/accuracy/` (reads `bench/results.json` when it exists, otherwise says the benchmark is being built), `/expert-review/protocol/` and `/incident-rule/` are written in `scripts/build-site.js` and repeated in `llms-full.txt`.
- **Social pictures**: `scripts/og-pages.js` lists one per page; `scripts/build-og.js` draws them.

## Where the words come from

- The 17 checks, their titles and fixes: `src/rules.js`, with the short card lines in `scripts/checks-copy.js`.
- Plans and prices: `scripts/pricing.js`. Lookout notices: `scripts/lookout.js` (every notice has a source).
- The changelog and releases pages: `CHANGELOG.md`. The hero's findings: the pinned capture in `scripts/home/demo-run.json`.
- Guides, glossary, per-check explanations and structured data: `scripts/seo.js`.

The 60-second film shows only when `site/media/sigship-explainer.mp4` exists (or `SIGSHIP_FILM_URL` is set at build time).
Cloudflare serves files up to 25 MB, so compress the film before adding it.
