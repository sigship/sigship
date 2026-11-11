# Site layout audit

A pass over every page of sigship.dev (the 48 built pages, `/check/` and `404.html`) and the private beta build, on
11 November 2026, at 390, 768, 1280 and 1536 px wide, in both themes, both voices and with reduced motion.

## How it was measured

A headless Chromium script loaded every page at every width and variant and reported, for each page: any visible
element whose box left the viewport sideways without a clipping ancestor; any text wider than its box; any pair of
in-flow siblings whose boxes overlapped; the announcement strip sitting over the header or wrapping; open mega menus
and the phone menu leaving the viewport; and pictures larger than their stage. Sliced screenshots of each page were
read alongside the numbers. Decorative overflow that a container clips on purpose (the marquee, hero blobs, the hero
glow, the sliding three-step track) does not count.

## What was wrong, and the fix

| Where | Problem | Fix |
| --- | --- | --- |
| Home hero heading | `font-size: 13vw` made "You built it fast." 17 px wider than the hero at 390 px. | `clamp(2.5rem, 11.5vw, 5rem)` with `overflow-wrap: anywhere`; the tablet override stays. |
| Home hero score ring | The number sat on `margin-top: -96px` under the SVG, with a spacer div to pad the height. The label and ring drifted apart as the column changed width. | A `.score-ring` box with `aspect-ratio: 1` holds the SVG; the number is absolutely centred inside it. The spacer is gone. |
| Announcement strip on phones | "Join the waitlist →" plus the short text did not fit at 390 px and the link was hidden under 380 px, so the strip lost its action. | The link carries a long and a short label; phones show "Join →" (beta: "Open →"). The strip never wraps or covers the header. |
| Footer word "SIGSHIP" | `22vw` was wider than the viewport on phones (clipped by the footer, so it read as a cut-off word). | `clamp(4rem, 19.5vw, 16rem)`, one rule for every width. |
| Brand orbit (home, `/agents/`, `/ai-agents/`) | The satellites were placed at 44% of a square that spun around its centre, so at every width two of them stuck 8 to 40 px past the orbit and, at 390 px, past the page edge. | The spinning element has no size; each satellite is placed on the circle's radius with container units, so none can leave the orbit box. |
| Changelog on phones | Long inline code (`npx sigship badge <site>` and friends) could not break, pushing the list 19 px past the viewport. | `overflow-wrap: anywhere` on timeline items and on prose paragraphs and list items. |
| Lookout FAQ | A long link in a details card overflowed its card. | Same prose wrapping rule. |
| Badge ladder (`/badge/`, `/flags/`, home) | "Top level · Black platinum" was `nowrap`, pushing the level meter out of its 240 px column. | The head wraps and the label may break onto two lines. |
| Badge preview on tablets | The live badge pill in the badge stage overflowed its grid column at 768 px. | The preview's children get `min-width: 0; max-width: 100%` and the pill truncates its text. |
| Pricing comparison table | At a 640 px minimum the four plan columns squeezed the feature column to three words a line. | The table is 50 rem wide at least and the feature column keeps 13 rem; it scrolls inside its card on phones, as before. |
| Badge embed preview | The badge `<img>` had only a height, so a slow or missing image stretched to the card's width. | `width: auto` alongside the height. |
| Beta navbar at 768 px | With the extra "Sign in" link the menus and the actions touched, no gap. | A 12 px gap on the navbar and tighter menu padding between 768 and 1023 px. |

Things that looked wrong in the report but are by design, left alone: the check cards' back face sits below the card
until hover (clipped by the card); the marquee track and the three-step track overflow their clipping containers;
the hero blobs and page glows are blurred circles clipped by the hero; the loader is removed after the first paint.

## Test

`test/layout.test.js` reads the built pages and the stylesheet, without a browser, and fails when an inline style
sets a width wider than the screen, when an `<svg>` or `<img>` has neither a `width` attribute nor a class (its own or
an ancestor's) that a sizing rule names, when any rule sets `width: 100vw` without `max-width: 100%`, or when the
hero heading, footer word or score ring lose their bounded sizes.

## Verified clean

After the fixes the measurement script reported nothing on any of the 50 pages at 390, 768, 1280 and 1536 px, in
dark and light, plain and dev voice, and with `prefers-reduced-motion: reduce`, with every mega menu opened at 768 px
and above and the phone menu opened below. The beta build's home, pricing, waitlist, check and cloud pages were
measured clean at 390 and 1280 px; the beta strip reads "SIGSHIP private beta · Open →" on phones and the "Sign in"
link fits beside the buttons from 768 px up.

Not fixed, because it is not a layout fault: the badge preview image on `/badge/` only draws when the Worker serves
`/b/<ID>.svg`, so a plain static copy of the site shows the alt text there.
