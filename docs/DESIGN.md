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

## Where the words come from

- The 17 checks, their titles and fixes: `src/rules.js`, with the short card lines in `scripts/build-site.js` (`CARD`).
- Plans and prices: `scripts/pricing.js`. Lookout notices: `scripts/lookout.js` (every notice has a source).
- The changelog and releases pages: `CHANGELOG.md`. The hero's findings: the pinned capture in `scripts/home/demo-run.json`.
- Guides, glossary, per-check explanations and structured data: `scripts/seo.js`.

The 60-second film shows only when `site/media/sigship-explainer.mp4` exists (or `SIGSHIP_FILM_URL` is set at build time).
Cloudflare serves files up to 25 MB, so compress the film before adding it.
