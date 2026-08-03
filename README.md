# Swahili Jazz — official website

Static, dependency-free production site recreating the supplied reference design,
built entirely from the supplied assets and content JSON.

Open `index.html` directly in a browser, or serve the folder — both work. There is
no runtime `fetch`, no framework and no CDN.

---

## Layout

```
index.html                   generated — do not edit by hand
robots.txt                   generated — mirrors the noindex flag
data/site-content.json       ALL site content (single source of truth)
Assets/juma-tutu-links.json  canonical URLs, supplied — referenced, never duplicated
Assets/                      original supplied assets, untouched (never served)
build/generate.mjs           renders index.html from the JSON
build/build-images.py        Assets/ -> static/img/ WebP derivatives
build/icons.mjs              inline SVG icon set
static/css/styles.css        design system + sections
static/js/main.js            interactions (vanilla, ~7 KB)
static/fonts/                self-hosted Playfair Display / Montserrat / Inter (woff2)
static/img/                  optimized WebP derivatives + manifest.json
```

> **Why `static/` and not `assets/`:** Windows filenames are case-insensitive, so a
> folder named `assets/` silently merges into the supplied `Assets/` folder. The
> build output is kept under `static/` so the originals stay clean and separate.
>
> **Only `index.html`, `robots.txt` and `static/` are deployed.** `Assets/` (21 MB of
> full-resolution originals) is a build input and must never be uploaded.

## Editing content

Everything visible on the page comes from `data/site-content.json` — navigation,
headings, paragraphs, the five services, events, client list, gallery captions,
footer and calls to action.

URLs are **never** written into the content file. They are referenced with an `@`
token that resolves against the supplied `Assets/juma-tutu-links.json`:

| Token | Resolves to |
|---|---|
| `@bookTheBand` | booking enquiry `mailto:` |
| `@watchLive` | YouTube performance |
| `@contactEmail` | contact `mailto:` |
| `@social.facebook` … `@social.bandcamp` | the seven social profiles |

`target="_blank"` / `rel="noopener noreferrer"` are applied from that file's
`implementation` block, so changing it changes every external link at once.

After editing either JSON:

```bash
node build/generate.mjs
```

## Rebuilding images

Derivatives (crops, sizes, WebP, favicons, `manifest.json`) are generated from
`Assets/` into `static/img/`. Re-run only if the source assets change:

```bash
python build/build-images.py      # needs Pillow
node   build/generate.mjs         # manifest feeds the srcset, so regenerate after
```

## Search-engine visibility

`site.noindex` in `data/site-content.json` controls it:

* `true` (current) — emits `<meta name="robots" content="noindex, nofollow">` and a
  `Disallow: /` robots.txt. Correct for client-review deploys.
* `false` — normal indexing plus a sitemap reference. **Set this before launch.**

---

## Design system

Colours, gradients and metrics were sampled directly from the reference, not
approximated:

| Token | Value | Used for |
|---|---|---|
| `--black` | `#131212` | page background |
| `--charcoal` | `#181716` | events / clients band |
| `--body` | `#b4b4b4` | body copy |
| `--gold` | `#c59d58` | eyebrows, dates, links, small accents |
| `--gold-flat` | `#b28f51` | section heading italics |
| `--grad-metallic` | `#f1e3c8 -> #c5a76e -> #9c8353 -> #c1a56c` | hero headline, CTA headline, about stat numbers |
| `--grad-button` | `#e7d19c -> #cfaa64 -> #a97e45` | filled buttons, "Est. 2010" badge |

The reference uses **two distinct golds**, which the build preserves:

* a **metallic gradient** on the largest display type — the hero headline, the
  closing CTA headline and the About stat numbers;
* a **flat `#b28f51`** on the smaller section-heading italics ("Meets Innovation",
  "One Passion.", "Beyond the Stage", "Next", "Worked With", "in Motion").

Type: Playfair Display (display serif), Montserrat (labels, buttons, event
titles), Inter (body). Self-hosted, latin subset, preloaded, `font-display: swap`.

Client logos render as flat white silhouettes at 44% opacity — this is what the
reference does, and it normalises marks that ship as black-on-transparent artwork
(Kempinski) so they read on a dark surface.

## Responsive behaviour

One design, scaled — not a separate mobile layout. Every size is fluid
(`clamp()`), so breakpoints only change grid track counts:

| Width | About | Services | Why | Events + Clients | Nav |
|---|---|---|---|---|---|
| >= 1200 px | 2 col | 3 col | 5 col | 2 col | links |
| 1024-1199 px | 2 col | 3 col | 2 col + wide | 2 col | links |
| 700-1023 px | 2 col | 2 col | 2 col + wide | stacked | hamburger |
| < 700 px | stacked | 2 col | 2 col + wide | stacked | hamburger |

Verified free of horizontal overflow at 320 / 390 / 480 / 700 / 864 / 1024 / 1280 /
1440 / 1920 px.

## Interactions

Scroll reveals with staggered children, nav that condenses and hides on scroll-down,
scrollspy, animated hamburger with a full-screen menu, image hover zoom, card lift,
button sheen and arrow nudge, and a gallery with autoplay + progress bar, prev/next,
thumbnail strip, keyboard arrows, swipe, and pause on hover/focus/tab-hidden.

All motion is disabled under `prefers-reduced-motion`.

## Performance & accessibility

* 56 WebP derivatives, responsive `srcset`/`sizes`, hero preloaded, everything else
  lazy-loaded.
* Explicit `width`/`height` and `aspect-ratio` on every image — no layout shift.
* Landmarks, skip link, visible focus rings, labelled controls, `aria-live` on the
  gallery counter, `MusicGroup` JSON-LD, Open Graph tags.

---

## Notes for launch

Three destinations are **inferred**, because the supplied JSON has no URL for them.
Change the `href` in `data/site-content.json` when the real pages exist:

* event **Details** -> booking enquiry `mailto:`
* **View All Events** -> Facebook (where the band posts events)
* **View All Clients** -> booking enquiry `mailto:`

The newsletter form has no backend; on submit it opens a pre-filled `mailto:` to
`swahilijazz@yahoo.com`. Point it at a real list provider before launch.

Per the supplied JSON's own note, confirm the published WhatsApp number
(+254 715 706 236) with the band before going live.

Remember to set `site.noindex` to `false` before the public launch.
