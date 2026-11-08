# Night Harbour: the design system

The site, the dashboard (`npx sigship ui`) and the brand images share one look. Dark ("night") is the default;
every page also works in the light theme. Two switches live in the header of every page and in the big footer:

- **Night / Day**: the theme. Stored as `sigship-theme` (`dark`, `light` or `system`). Dark unless the visitor chooses.
- **Plain / Dev**: the words. Stored as `sigship-mode`. Plain is the default for everyone; Dev shows the terminal,
  the commands and the technical terms. Visitors arriving from GitHub, npm or an MCP directory start in Dev.
  `?mode=dev` or `?mode=plain` in the address forces one.

## Writing for both modes

Wrap the two versions of a sentence in `<span class="plain-only">…</span><span class="dev-only">…</span>`.
Same facts in both; Plain uses everyday words ("a key anyone can see"), Dev uses the real term ("`service_role`
key in the client bundle"). Things that must never be hidden by a mode: forms, the verdict, the GO footnote, prices.
`scripts/build-home.js` fails the build if a form or the verdict sits inside a mode-only block.

Headings: `<h2><span class="plain-only">Short. <span>Quiet second half.</span></span><span class="dev-only">…</span></h2>`.
The inner `<span>` is the grey second half; the mode wrapper keeps the heading colour.

## Tokens

The palette lives in `scripts/home/page.html` (`:root` and `:root.dark`) and is mirrored in `site/style.css`, which
the build scripts read for the favicon and brand images. Flags keep their true colours in both themes through
`--flag-blue`, `--flag-yellow`, `--flag-red`, `--flag-white`, `--flag-black`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--sail` | `#f6f7f9` | `#0b1324` | page background |
| `--paper` | `#ffffff` | `#141d31` | cards |
| `--ink` | `#0b1324` | `#f3f5f8` | text |
| `--slate` | `#5b6578` | `#9aa3b5` | quiet text |
| `--line` | `#dde1e8` | `#26304a` | borders |
| `--blue` | `#1f4fd1` | `#1f4fd1` | buttons, flag P, links (light) |
| `--link` | `#1f4fd1` | `#7fa2f7` | links |
| `--red` / `--green` / `--warn` | `#c81e1e` / `#15803d` / `#b45309` | `#f87171` / `#4ade80` / `#fbbf24` | Stop / GO / Fix soon |
| `--panel` | `#0b1324` | `#070d1b` | terminal, footer, the flags band |

Type: Inter (text) and JetBrains Mono (commands and output), both self-hosted from `site/fonts/` under the OFL.

## Where the pieces live

- `scripts/home/page.html`: the home page template, with the shared header, footer and menu that every page reuses.
- `scripts/home/harbour.css`: the design layer, appended to `site/home.css` by the build. Reveals, the GO-flag
  plaques, the Lookout cards, the switches, the inner-page extras.
- `site/harbour.js`: the Plain/Dev switch, scroll reveals, plaque tilt, Lookout filters and the Lookout email form.
- `scripts/lookout.js`: the notices (see `docs/LOOKOUT.md`). `scripts/flags.js`: the three GO flags and the badge.
- `scripts/pages.js`: every inner page, including `/lookout/` and `/flags/`.
- `src/ui.js`: the local dashboard, same palette and switches, no network, no external fonts.

Motion is CSS and SVG with a little JavaScript. It honours `prefers-reduced-motion` and the site's own Motion switch
(`data-motion="off"`). Everything is visible without JavaScript; with it, blocks rise in as they enter view.
