/**
 * Swahili Jazz — static site generator.
 *
 *   data/site-content.json      content (single source of truth)
 *   Assets/juma-tutu-links.json canonical URLs, referenced as "@name" / "@social.name"
 *   static/img/manifest.json    real pixel widths, for accurate srcset
 *        ->  index.html
 *
 * Run:  node build/generate.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { icon } from './icons.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const C = read('data/site-content.json');
const LINKS = read('Assets/juma-tutu-links.json');
const MANIFEST = read('static/img/manifest.json');

/* ---------------------------------------------------------------- helpers */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Resolve "@bookTheBand" / "@social.facebook" against the supplied links JSON. */
function url(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('@')) return ref;
  const path = ref.slice(1).split('.');
  let v = LINKS;
  for (const k of path) {
    v = v?.[k];
    if (v === undefined) {
      // allow "@bandcamp" as shorthand for "@social.bandcamp"
      v = LINKS.social?.[path[path.length - 1]];
      break;
    }
  }
  if (typeof v !== 'string') throw new Error(`Unresolved link ref: ${ref}`);
  return v;
}

const isExternal = (href) => /^(https?:|mailto:|tel:)/.test(href);

/** rel/target attributes, driven by links JSON `implementation` block. */
function linkAttrs(href) {
  if (!isExternal(href) || href.startsWith('mailto:')) return '';
  const { externalLinksTarget: t, externalLinksRel: r } = LINKS.implementation ?? {};
  return `${t ? ` target="${t}"` : ''}${r ? ` rel="${r}"` : ''}`;
}

/** <img> with srcset built from the real widths in the manifest. */
function img(slug, { alt = '', sizes, cls = '', eager = false, ratio } = {}) {
  const set = MANIFEST[slug];
  if (!set?.length) throw new Error(`No images for slug: ${slug}`);
  const uniq = [...new Map(set.map((e) => [e.w, e])).values()].sort((a, b) => a.w - b.w);
  const largest = uniq[uniq.length - 1];
  const srcset = uniq.length > 1 ? ` srcset="${uniq.map((e) => `static/img/${e.src} ${e.w}w`).join(', ')}"` : '';
  const h = ratio ? Math.round(largest.w / ratio) : null;
  return (
    `<img src="static/img/${largest.src}"${srcset}${sizes ? ` sizes="${sizes}"` : ''}` +
    ` alt="${esc(alt)}" width="${largest.w}" height="${h ?? Math.round(largest.w * 0.66)}"` +
    `${cls ? ` class="${cls}"` : ''}` +
    ` ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
  );
}

/** Headline chunks -> spans. `plain` white, `gold` flat, `metallic` gradient. */
function headline(chunks, tag = 'h2', cls = '') {
  const parts = chunks.map((c, i) => {
    const k = c.style === 'metallic' ? 'hl-metallic' : c.style === 'gold' ? 'hl-gold' : 'hl-plain';
    const br = i > 0 && !c.inline ? '<br>' : i > 0 ? ' ' : '';
    return `${br}<span class="${k}">${esc(c.text)}</span>`;
  });
  return `<${tag} class="hl${cls ? ' ' + cls : ''}">${parts.join('')}</${tag}>`;
}

const eyebrow = (text, variant = '') =>
  `<p class="eyebrow${variant ? ' eyebrow--' + variant : ''}"><span class="eyebrow__rule"></span>${esc(text)}${
    variant === 'center' ? '<span class="eyebrow__rule"></span>' : ''
  }</p>`;

const ornament = () =>
  '<div class="ornament" aria-hidden="true"><span></span><i></i><span></span></div>';

function button(b, extraCls = '') {
  if (!b) return '';
  const href = url(b.href);
  const variant = b.variant === 'gold' ? 'btn--gold' : b.variant === 'outline' ? 'btn--outline' : 'btn--outline';
  const lead = b.icon === 'play' ? `<span class="btn__play">${icon('play')}</span>` : '';
  const trail = b.icon && b.icon !== 'play' ? icon(b.icon, 'btn__arrow') : '';
  return (
    `<a class="btn ${variant}${extraCls ? ' ' + extraCls : ''}" href="${esc(href)}"${linkAttrs(href)}>` +
    `${lead}<span>${esc(b.label)}</span>${trail}</a>`
  );
}

/* ---------------------------------------------------------------- sections */

function navBar() {
  const links = C.nav.links.map((l) => `<li><a class="nav__link" href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('');
  const brand =
    `<a class="brand" href="#home" aria-label="${esc(C.site.name)} — home">` +
    `${img('logo', { alt: '', cls: 'brand__mark', sizes: '40px', eager: true, ratio: 320 / 338 })}` +
    `<span class="brand__word">${esc(C.site.wordmark)}</span></a>`;
  const cta = button({ ...C.nav.cta, variant: 'outline', icon: null }, 'btn--sm nav__cta');
  return `<header class="nav" id="nav" data-nav>
  <div class="nav__inner shell">
    ${brand}
    <nav class="nav__links" aria-label="Primary"><ul>${links}</ul></nav>
    <div class="nav__actions">${cta}
      <button class="nav__toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
        <span class="nav__toggle-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
    </div>
  </div>
</header>
<div class="menu" id="mobile-menu" data-menu hidden>
  <nav class="menu__inner" aria-label="Mobile">
    <ul>${C.nav.links.map((l, i) => `<li style="--i:${i}"><a href="${esc(l.href)}" data-menu-link>${esc(l.label)}</a></li>`).join('')}</ul>
    ${button({ ...C.nav.cta, variant: 'gold', icon: 'arrow-right' }, 'menu__cta')}
  </nav>
</div>`;
}

function hero() {
  const h = C.hero;
  const disciplines = h.disciplines
    .map((d) => `<span class="hero__disc">${esc(d)}</span>`)
    .join('<i class="hero__dot" aria-hidden="true"></i>');
  return `<section class="hero" id="home">
  <div class="hero__media">
    <picture>
      <source media="(max-width: 700px)" srcset="static/img/${MANIFEST['hero-portrait'].at(-1).src}">
      <img src="static/img/${MANIFEST.hero.at(-1).src}"
           srcset="${MANIFEST.hero.map((e) => `static/img/${e.src} ${e.w}w`).join(', ')}"
           sizes="100vw" alt="${esc(h.image.alt)}" width="1536" height="1024"
           fetchpriority="high" decoding="async">
    </picture>
    <div class="hero__scrim" aria-hidden="true"></div>
  </div>
  <div class="hero__body shell">
    <div class="hero__content" data-reveal-group>
      ${eyebrow(h.eyebrow)}
      ${headline(h.headline, 'h1', 'hl--hero')}
      <p class="hero__disciplines">${disciplines}</p>
      <div class="hero__actions">${h.buttons.map((b) => button(b)).join('')}</div>
    </div>
  </div>
  <a class="hero__scroll" href="#about" aria-label="${esc(h.scrollLabel)}">
    <span>${esc(h.scrollLabel)}</span><i aria-hidden="true"></i>
  </a>
</section>`;
}

function about() {
  const a = C.about;
  const stats = a.stats
    .map(
      (s) =>
        `<div class="stat"><p class="stat__value ${s.style === 'metallic' ? 'hl-metallic' : ''}">${esc(s.value)}</p>` +
        `<p class="stat__label">${esc(s.label)}</p></div>`
    )
    .join('');
  return `<section class="about section" id="${a.id}">
  <div class="shell about__grid">
    <figure class="about__figure" data-reveal>
      <div class="frame">${img(a.image.slug, {
        alt: a.image.alt,
        sizes: '(max-width: 900px) 92vw, 50vw',
        ratio: 5 / 4,
      })}</div>
      <div class="badge" aria-hidden="true"><span>${esc(a.badge.top)}</span><span>${esc(a.badge.bottom)}</span></div>
    </figure>
    <div class="about__body" data-reveal-group>
      ${eyebrow(a.eyebrow)}
      ${headline(a.headline)}
      ${a.paragraphs.map((p) => `<p class="prose">${esc(p)}</p>`).join('')}
      <div class="about__stats">${stats}</div>
      <div class="about__cta">${button(a.cta)}</div>
    </div>
  </div>
</section>`;
}

function services() {
  const s = C.services;
  const cards = s.items
    .map((it) => {
      const href = url(it.href);
      return `<article class="card" data-reveal>
      <div class="card__media">${img(it.image.slug, {
        alt: it.image.alt,
        sizes: '(max-width: 640px) 46vw, (max-width: 1023px) 46vw, 30vw',
        ratio: 4 / 3,
      })}<span class="card__icon">${icon(it.icon)}</span></div>
      <div class="card__body">
        <h3 class="card__title">${esc(it.title)}</h3>
        <p class="card__text">${esc(it.description)}</p>
        <a class="link-more" href="${esc(href)}"${linkAttrs(href)}>${esc(s.linkLabel)}${icon('arrow-right', 'link-more__arrow')}</a>
      </div>
    </article>`;
    })
    .join('');
  return `<section class="services section" id="${s.id}">
  <div class="shell">
    <div class="section__head" data-reveal-group>
      ${eyebrow(s.eyebrow, 'center')}
      ${headline(s.headline, 'h2', 'hl--center')}
      ${ornament()}
    </div>
    <div class="services__grid">${cards}</div>
  </div>
</section>`;
}

function why() {
  const w = C.why;
  const cards = w.items
    .map(
      (it) => `<article class="tile" data-reveal>
      <span class="tile__icon">${icon(it.icon)}</span>
      <p class="tile__value">${esc(it.value)}</p>
      <p class="tile__label">${esc(it.label)}</p>
      <p class="tile__text">${esc(it.description)}</p>
    </article>`
    )
    .join('');
  return `<section class="why section">
  <div class="why__bg" aria-hidden="true">${img(w.background.slug, {
    alt: '',
    sizes: '100vw',
    ratio: 5 / 2,
  })}</div>
  <div class="shell why__inner">
    <div class="section__head" data-reveal-group>
      ${eyebrow(w.eyebrow, 'center')}
      ${headline(w.headline, 'h2', 'hl--center')}
      ${ornament()}
    </div>
    <div class="why__grid">${cards}</div>
  </div>
</section>`;
}

function eventsAndClients() {
  const e = C.events;
  const cl = C.clients;

  const rows = e.items
    .map((it) => {
      const href = url(it.href);
      return `<li class="event" data-reveal>
      <a class="event__link" href="${esc(href)}"${linkAttrs(href)}>
        <span class="event__date"><b>${esc(it.day)}</b><i>${esc(it.month)}</i></span>
        <span class="event__main">
          <span class="event__title">${esc(it.title)}</span>
          <span class="event__meta">
            <span>${icon('pin')}${esc(it.venue)}</span>
            <span>${icon('clock')}${esc(it.time)}</span>
          </span>
        </span>
        <span class="event__cta">${esc(e.detailsLabel)}${icon('arrow-right', 'link-more__arrow')}</span>
      </a>
    </li>`;
    })
    .join('');

  const logos = cl.logos
    .map((l) => {
      const entry = MANIFEST[`client:${l.slug}`]?.[0];
      if (!entry) throw new Error(`Missing client logo: ${l.slug}`);
      const dims = entry.w ? ` width="${entry.w}" height="${entry.h}"` : '';
      return `<li class="client"><img src="static/img/${entry.src}" alt="${esc(l.name)}"${dims} loading="lazy" decoding="async"></li>`;
    })
    .join('');

  return `<section class="duo section" id="${e.id}">
  <div class="shell duo__grid">
    <div class="duo__col">
      <div data-reveal-group>
        ${eyebrow(e.eyebrow)}
        ${headline(e.headline, 'h2', 'hl--sm')}
      </div>
      <ul class="events">${rows}</ul>
      <div class="duo__cta" data-reveal>${button(e.cta, 'btn--sm')}</div>
    </div>
    <div class="duo__col">
      <div data-reveal-group>
        ${eyebrow(cl.eyebrow)}
        ${headline(cl.headline, 'h2', 'hl--sm')}
      </div>
      <ul class="clients" data-reveal>${logos}</ul>
      <div class="duo__cta" data-reveal>${button(cl.cta, 'btn--sm')}</div>
    </div>
  </div>
</section>`;
}

function gallery() {
  const g = C.gallery;
  const start = Math.min(Math.max((g.startIndex ?? 1) - 1, 0), g.items.length - 1);

  const slides = g.items
    .map(
      (it, i) => `<figure class="slide${i === start ? ' is-active' : ''}" data-slide="${i}" ${
        i === start ? '' : 'aria-hidden="true"'
      }>${img(it.slug, {
        alt: it.caption,
        sizes: '(max-width: 1023px) 94vw, 1220px',
        ratio: 16 / 9,
        eager: i === start,
      })}</figure>`
    )
    .join('');

  const thumbs = g.items
    .map(
      (it, i) =>
        `<li><button class="thumb${i === start ? ' is-active' : ''}" type="button" data-thumb="${i}"` +
        ` aria-label="Show image ${i + 1}: ${esc(it.caption)}"${i === start ? ' aria-current="true"' : ''}>` +
        `${img(it.slug + '-thumb', { alt: '', sizes: '120px', ratio: 4 / 3 })}</button></li>`
    )
    .join('');

  const total = String(g.items.length).padStart(2, '0');

  return `<section class="gallery section" id="${g.id}">
  <div class="shell">
    <div class="section__head" data-reveal-group>
      ${eyebrow(g.eyebrow, 'center')}
      ${headline(g.headline, 'h2', 'hl--center')}
      ${ornament()}
    </div>
    <div class="gallery__stage" data-gallery data-autoplay="${g.autoplayMs ?? 0}" data-start="${start}" data-reveal>
      <div class="gallery__viewport">
        <span class="gallery__progress" aria-hidden="true"><i data-progress></i></span>
        ${slides}
        <div class="gallery__scrim" aria-hidden="true"></div>
        <p class="gallery__caption" data-caption>${esc(g.items[start].caption)}</p>
        <p class="gallery__count" aria-hidden="true"><b data-count>${String(start + 1).padStart(2, '0')}</b> / ${total}</p>
        <button class="gallery__nav gallery__nav--prev" type="button" aria-label="Previous image" data-prev>${icon('chevron-left')}</button>
        <button class="gallery__nav gallery__nav--next" type="button" aria-label="Next image" data-next>${icon('chevron-right')}</button>
        <p class="sr-only" role="status" aria-live="polite" data-live></p>
      </div>
      <ul class="gallery__thumbs" data-thumbs>${thumbs}</ul>
    </div>
  </div>
</section>`;
}

function ctaBand() {
  const c = C.cta;
  return `<section class="cta section">
  <div class="cta__glow" aria-hidden="true"></div>
  <div class="shell cta__inner" data-reveal-group>
    ${eyebrow(c.eyebrow, 'center')}
    ${headline(c.headline, 'h2', 'hl--center hl--cta')}
    <div class="cta__action">${button(c.button)}</div>
  </div>
</section>`;
}

function footer() {
  const f = C.footer;
  const contact = f.contact
    .map((c) => {
      const href = url(c.href);
      return `<li><a href="${esc(href)}"${linkAttrs(href)}>${icon(c.icon)}<span>${esc(c.label)}</span></a></li>`;
    })
    .join('');
  const explore = f.explore.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('');
  const social = f.follow.links
    .map((l) => {
      const href = url(l.href);
      return `<li><a class="social" href="${esc(href)}"${linkAttrs(href)} aria-label="${esc(l.label)}">${icon(l.icon)}</a></li>`;
    })
    .join('');

  return `<footer class="footer" id="${f.id}">
  <div class="shell">
    <div class="footer__grid">
      <div class="footer__brand">
        <a class="brand" href="#home" aria-label="${esc(C.site.name)} — home">
          ${img('logo', { alt: '', cls: 'brand__mark', sizes: '40px', ratio: 320 / 338 })}
          <span class="brand__word">${esc(C.site.wordmark)}</span>
        </a>
        <p class="footer__tagline">${esc(f.tagline)}</p>
        <ul class="footer__contact">${contact}</ul>
        <div class="newsletter">
          <h2 class="footer__heading">${esc(f.newsletter.heading)}</h2>
          <p class="footer__text">${esc(f.newsletter.text)}</p>
          <form class="newsletter__form" data-newsletter action="${esc(url(f.newsletter.action))}" method="post">
            <label class="sr-only" for="nl-email">${esc(f.newsletter.placeholder)}</label>
            <input id="nl-email" name="email" type="email" required autocomplete="email"
                   placeholder="${esc(f.newsletter.placeholder)}">
            <button class="btn btn--gold btn--block" type="submit">
              <span>${esc(f.newsletter.button)}</span>${icon('arrow-right', 'btn__arrow')}
            </button>
            <p class="newsletter__msg" role="status" aria-live="polite" data-nl-msg></p>
          </form>
        </div>
      </div>
      <div class="footer__col">
        <h2 class="footer__heading">${esc(f.explore.heading)}</h2>
        <ul class="footer__links">${explore}</ul>
      </div>
      <div class="footer__col">
        <h2 class="footer__heading">${esc(f.follow.heading)}</h2>
        <ul class="footer__social">${social}</ul>
      </div>
    </div>
    <div class="footer__bar">
      <p>${esc(f.copyright)}</p>
      <p class="footer__credit">${esc(f.credit.before)} ${icon('heart', 'footer__heart')} ${esc(f.credit.after)}</p>
    </div>
  </div>
</footer>`;
}

/* ---------------------------------------------------------------- document */

const schema = {
  '@context': 'https://schema.org',
  '@type': 'MusicGroup',
  name: C.site.name,
  slogan: C.site.slogan,
  description: C.site.description,
  url: LINKS.website,
  foundingDate: C.about.badge.bottom,
  email: url('@contactEmail').replace('mailto:', ''),
  telephone: C.footer.contact.find((c) => c.icon === 'phone')?.label,
  sameAs: Object.values(LINKS.social),
};

const html = `<!doctype html>
<html lang="${C.site.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(C.site.title)}</title>
<meta name="description" content="${esc(C.site.description)}">
<meta name="theme-color" content="${C.site.themeColor}">${
  C.site.noindex ? '\n<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="canonical" href="${esc(LINKS.website)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(C.site.title)}">
<meta property="og:description" content="${esc(C.site.description)}">
<meta property="og:url" content="${esc(LINKS.website)}">
<meta property="og:image" content="static/img/${MANIFEST.hero.at(-1).src}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="static/img/icon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="static/img/icon-180.png">
<link rel="preload" href="static/fonts/playfair-display-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="static/fonts/montserrat-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="static/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" href="static/img/${MANIFEST.hero.at(-1).src}"
      imagesrcset="${MANIFEST.hero.map((e) => `static/img/${e.src} ${e.w}w`).join(', ')}" imagesizes="100vw">
<link rel="stylesheet" href="static/fonts/fonts.css">
<link rel="stylesheet" href="static/css/styles.css">
<script>document.documentElement.classList.add('js')</script>
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${navBar()}
<main id="main">
${hero()}
${about()}
${services()}
${why()}
${eventsAndClients()}
${gallery()}
${ctaBand()}
</main>
${footer()}
<script src="static/js/main.js" defer></script>
</body>
</html>
`;

writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
console.log(`index.html written — ${(html.length / 1024).toFixed(1)} KB`);

// robots.txt mirrors the noindex flag so a review deploy stays out of search
writeFileSync(
  join(ROOT, 'robots.txt'),
  C.site.noindex
    ? '# Client review build — not for indexing.\nUser-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${LINKS.website.replace(/\/?$/, '/')}sitemap.xml\n`,
  'utf8'
);
console.log(`robots.txt written — ${C.site.noindex ? 'DISALLOW ALL (noindex build)' : 'allow all'}`);
