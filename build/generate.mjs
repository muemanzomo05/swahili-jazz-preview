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
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { icon } from './icons.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const C = read('data/site-content.json');
const LINKS = read('Assets/juma-tutu-links.json');
const MANIFEST = read('static/img/manifest.json');
const PAGES = read('data/service-pages.json');

/* Path context. The nav, footer, booking form and floating buttons are shared
   between the homepage and the service pages, which sit one directory deeper,
   so every asset and internal link is resolved through here. */
const CTX = { base: '', home: '', services: 'services/', active: null };
const atRoot = () => { CTX.base = ''; CTX.home = ''; CTX.services = 'services/'; };
const atService = (slug) => { CTX.base = '../'; CTX.home = '../index.html'; CTX.services = ''; CTX.active = slug; };

/** Resolve an internal anchor or an "@link" reference for the current page. */
function link(href) {
  if (typeof href === 'string' && href.startsWith('#')) return `${CTX.home}${href}`;
  return url(href);
}
const servicePath = (slug) => `${CTX.services}${slug}.html`;

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
  const srcset = uniq.length > 1 ? ` srcset="${uniq.map((e) => `${CTX.base}static/img/${e.src} ${e.w}w`).join(', ')}"` : '';
  const h = ratio ? Math.round(largest.w / ratio) : null;
  return (
    `<img src="${CTX.base}static/img/${largest.src}"${srcset}${sizes ? ` sizes="${sizes}"` : ''}` +
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
  const href = link(b.href);
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
  const links = C.nav.links.map((l) => `<li><a class="nav__link" href="${esc(link(l.href))}"${l.href === '#services' && CTX.active ? ' aria-current="true"' : ''}>${esc(l.label)}</a></li>`).join('');
  const brand =
    `<a class="brand" href="${esc(link('#home'))}" aria-label="${esc(C.site.name)} home">` +
    `${img('logo', { alt: '', cls: 'brand__mark', sizes: '44px', eager: true, ratio: 320 / 338 })}` +
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
    <ul>${C.nav.links.map((l, i) => `<li style="--i:${i}"><a href="${esc(link(l.href))}" data-menu-link>${esc(l.label)}</a></li>`).join('')}</ul>
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
      <source media="(max-width: 700px)" srcset="${CTX.base}static/img/${MANIFEST['hero-portrait'].at(-1).src}">
      <img src="${CTX.base}static/img/${MANIFEST.hero.at(-1).src}"
           srcset="${MANIFEST.hero.map((e) => `${CTX.base}static/img/${e.src} ${e.w}w`).join(', ')}"
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
      const href = it.page ? servicePath(it.page) : link(it.href);
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
    .map((it) => `<li class="event" data-reveal>
      <div class="event__link event__link--past">
        <span class="event__date"><b>Past</b><i>${esc(e.pastLabel)}</i></span>
        <span class="event__main"><span class="event__title">${esc(it.title)}</span></span>
      </div>
    </li>`)
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
${e.cta ? `      <div class="duo__cta" data-reveal>${button(e.cta, 'btn--sm')}</div>\n` : ''}
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

/** Listen: the Spotify artist embed is the only on-page player.
 *  The artist id is parsed from the supplied links JSON, never hardcoded. */
function listen() {
  const l = C.listen;
  if (!l) return '';

  const spotifyUrl = url('@social.spotify');
  const artistId = (spotifyUrl.match(/artist\/([A-Za-z0-9]+)/) || [])[1];
  if (!artistId) throw new Error(`Could not parse a Spotify artist id from: ${spotifyUrl}`);

  const platforms = l.platforms
    .map((p) => {
      const href = url(p.href);
      return `<a class="platform" href="${esc(href)}"${linkAttrs(href)}>${icon(p.icon)}<span>${esc(p.label)}</span></a>`;
    })
    .join('');

  return `<section class="listen section" id="${l.id}">
  <div class="shell">
    <div class="section__head" data-reveal-group>
      ${eyebrow(l.eyebrow, 'center')}
      ${headline(l.headline, 'h2', 'hl--center')}
      ${ornament()}
      <p class="listen__intro">${esc(l.intro)}</p>
    </div>
    <div class="listen__player" data-reveal>
      <h3 class="listen__heading">${esc(l.spotify.heading)}</h3>
      <div class="listen__embed">
        <iframe title="${esc(C.site.name)} on Spotify" loading="lazy"
                src="https://open.spotify.com/embed/artist/${esc(artistId)}?theme=0"
                frameborder="0" style="border:0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
      </div>
      <p class="listen__note">${esc(l.spotify.note)}</p>
      <div class="platforms">${platforms}</div>
    </div>
  </div>
</section>`;
}

/** Booking form. Posts to `endpoint` when set; otherwise composes a
 *  structured mailto and shows a visible fallback so it cannot fail silently. */
function bookingForm(f, submitLabel) {
  const submit = submitLabel || f.submit;
  const field = (fl) => {
    const id = `bk-${fl.name}`;
    const req = fl.required ? ' required' : '';
    const mark = fl.required ? ` <span class="field__req" title="${esc(f.required)}">*</span>` : '';
    const ac = fl.autocomplete ? ` autocomplete="${esc(fl.autocomplete)}"` : '';
    let control;
    if (fl.type === 'textarea') {
      control = `<textarea id="${id}" name="${esc(fl.name)}" rows="${fl.rows || 4}"${req}${ac}></textarea>`;
    } else if (fl.type === 'select') {
      const opts = ['<option value="">Please choose</option>']
        .concat(fl.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`))
        .join('');
      control = `<select id="${id}" name="${esc(fl.name)}"${req}>${opts}</select>`;
    } else {
      control = `<input id="${id}" name="${esc(fl.name)}" type="${esc(fl.type)}"${req}${ac}>`;
    }
    return `<p class="field${fl.span === 2 ? ' field--wide' : ''}">
        <label for="${id}">${esc(fl.label)}${mark}</label>${control}
      </p>`;
  };

  const mailto = url('@contactEmail');
  const whatsapp = url('@social.whatsapp');

  return `<form class="form" data-booking
      ${f.endpoint ? `action="${esc(f.endpoint)}" method="post"` : ''}
      data-endpoint="${esc(f.endpoint || '')}"
      data-mailto="${esc(mailto)}"
      novalidate>
      <div class="form__grid">${f.fields.map(field).join('')}</div>
      <p class="form__gotcha" aria-hidden="true">
        <label for="bk-company">Do not fill this in</label>
        <input id="bk-company" name="_company" type="text" tabindex="-1" autocomplete="off">
      </p>
      <button class="btn btn--gold form__submit" type="submit">
        <span data-submit-label>${esc(submit)}</span>${icon('arrow-right', 'btn__arrow')}
      </button>
      <div class="form__status" role="status" aria-live="polite" data-form-status hidden>
        <p class="form__status-heading" data-status-heading></p>
        <p class="form__status-body" data-status-body></p>
        <div class="form__fallback" data-status-fallback hidden>
          <a class="platform" href="${esc(mailto)}">${icon('mail')}<span>${esc(mailto.replace('mailto:', ''))}</span></a>
          <button class="platform" type="button" data-copy="${esc(mailto.replace('mailto:', ''))}"
                  data-copy-label="${esc(f.mailtoNote.copyLabel)}" data-copied-label="${esc(f.mailtoNote.copiedLabel)}">
            ${icon('copy')}<span>${esc(f.mailtoNote.copyLabel)}</span>
          </button>
          <a class="platform" href="${esc(whatsapp)}"${linkAttrs(whatsapp)}>${icon('whatsapp')}<span>WhatsApp</span></a>
        </div>
      </div>
      <script type="application/json" data-form-copy>${JSON.stringify({
        success: f.success, mailtoNote: f.mailtoNote, error: f.error, sending: f.sending, submit,
      })}</script>
    </form>`;
}

function ctaBand(submitLabel) {
  const c = C.cta;
  return `<section class="cta section" id="${c.id}">
  <div class="cta__glow" aria-hidden="true"></div>
  <div class="shell cta__inner">
    <div data-reveal-group>
      ${eyebrow(submitLabel || c.eyebrow, 'center')}
      ${headline(c.headline, 'h2', 'hl--center hl--cta')}
      <p class="cta__intro">${esc(c.intro)}</p>
    </div>
    <div class="cta__form" data-reveal>${bookingForm(c.form, submitLabel)}</div>
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
  const explore = f.explore.links.map((l) => `<li><a href="${esc(link(l.href))}">${esc(l.label)}</a></li>`).join('');
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
        <a class="brand" href="${esc(link('#home'))}" aria-label="${esc(C.site.name)} home">
          ${img('logo', { alt: '', cls: 'brand__mark', sizes: '40px', ratio: 320 / 338 })}
          <span class="brand__word">${esc(C.site.wordmark)}</span>
        </a>
        <p class="footer__tagline">${esc(f.tagline)}</p>
        <ul class="footer__contact">${contact}</ul>
        <div class="newsletter">
          <h2 class="footer__heading">${esc(f.newsletter.heading)}</h2>
          <p class="footer__text">${esc(f.newsletter.text)}</p>
          <form class="newsletter__form" data-newsletter action="${esc(url(f.newsletter.action))}" method="post"
                data-success="${esc(f.newsletter.success)}">
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

/** Fixed bottom-left contact dock. Rendered outside <main> so it floats over
 *  every section without participating in any section's layout. */
function floatingActions() {
  const f = C.floatingActions;
  if (!f?.items?.length) return '';
  const items = f.items
    .map((it) => {
      const href = it.wa
        ? `https://wa.me/${it.wa.phone}?text=${encodeURIComponent(it.wa.message)}`
        : url(it.href);
      const attrs = it.wa ? linkAttrs(href) : '';
      return (
        `<a class="fab fab--${it.variant}" href="${esc(href)}"${attrs} aria-label="${esc(it.aria)}">` +
        `${icon(it.icon, 'fab__icon')}<span class="fab__label" aria-hidden="true">${esc(it.label)}</span></a>`
      );
    })
    .join('');
  return `<div class="fab-dock" role="group" aria-label="${esc(f.ariaLabel)}">${items}</div>`;
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
  // not rendered on the page — structured data only
  telephone: (() => {
    const wa = C.floatingActions?.items?.find((i) => i.wa);
    return wa ? `+${wa.wa.phone}` : undefined;
  })(),
  sameAs: Object.values(LINKS.social),
};

/** Shared document shell. `preload` is the hero image on the homepage and the
 *  banner on a service page, so each page preloads the right LCP candidate. */
function document_({ title, description, body, canonical, preload, schema: sch }) {
  const B = CTX.base;
  const pre = preload
    ? `\n<link rel="preload" as="image" href="${B}static/img/${preload.at(-1).src}"` +
      ` imagesrcset="${preload.map((e) => `${B}static/img/${e.src} ${e.w}w`).join(', ')}" imagesizes="100vw">`
    : '';
  return `<!doctype html>
<html lang="${C.site.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="${C.site.themeColor}">${
  C.site.noindex ? '\n<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${B}static/img/${(preload ?? MANIFEST.hero).at(-1).src}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${B}static/img/icon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="${B}static/img/icon-180.png">
<link rel="preload" href="${B}static/fonts/playfair-display-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${B}static/fonts/montserrat-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${B}static/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>${pre}
<link rel="stylesheet" href="${B}static/fonts/fonts.css">
<link rel="stylesheet" href="${B}static/css/styles.css">
<script>document.documentElement.classList.add('js')</script>
<script type="application/ld+json">${JSON.stringify(sch)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${navBar()}
<main id="main">
${body}
</main>
${footer()}
${floatingActions()}
<script src="${B}static/js/main.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------ service pages */

const siteUrl = LINKS.website.replace(/\/?$/, '/');

function breadcrumbs(page) {
  const b = PAGES.breadcrumb;
  return `<nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="${esc(link('#home'))}">${esc(b.home)}</a></li>
        <li><a href="${esc(link('#services'))}">${esc(b.section)}</a></li>
        <li><span aria-current="page">${esc(page.navLabel)}</span></li>
      </ol>
    </nav>`;
}

function pageHero(page) {
  return `<section class="page-hero">
  <div class="page-hero__media" aria-hidden="true">
    ${img(page.hero.slug, { alt: '', sizes: '100vw', ratio: 2.4, eager: true })}
    <div class="page-hero__scrim"></div>
  </div>
  <div class="shell page-hero__body">
    ${breadcrumbs(page)}
    <div data-reveal-group>
      ${eyebrow(page.eyebrow)}
      ${headline(page.headline, 'h1', 'hl--page')}
      <p class="page-hero__lede">${esc(page.lede)}</p>
      <div class="page-hero__actions">
        ${button({ label: page.ctaLabel, href: '#booking', variant: 'gold', icon: 'arrow-right' })}
      </div>
    </div>
  </div>
</section>`;
}

function pageIntro(p) {
  return `<section class="section about">
  <div class="shell about__grid">
    <figure class="about__figure" data-reveal>
      <div class="frame">${img(p.image.slug, { alt: p.image.alt, sizes: '(max-width: 900px) 92vw, 50vw', ratio: 5 / 4 })}</div>
    </figure>
    <div class="about__body" data-reveal-group>
      ${eyebrow(p.eyebrow)}
      ${headline(p.headline)}
      ${p.paragraphs.map((t) => `<p class="prose">${esc(t)}</p>`).join('')}
    </div>
  </div>
</section>`;
}

function pageOffering(o) {
  const items = o.items
    .map(
      (it) => `<li class="offer" data-reveal>
      <span class="offer__tick" aria-hidden="true">${icon('check')}</span>
      <span class="offer__body">
        <span class="offer__title">${esc(it.title)}</span>
        <span class="offer__text">${esc(it.text)}</span>
      </span>
    </li>`
    )
    .join('');
  return `<section class="section offering">
  <div class="shell">
    <div class="section__head" data-reveal-group>
      ${eyebrow(o.eyebrow, 'center')}
      ${headline(o.headline, 'h2', 'hl--center')}
      ${ornament()}
    </div>
    <ul class="offer-grid">${items}</ul>
  </div>
</section>`;
}

function pageProcess(pr) {
  const steps = pr.steps
    .map(
      (s, i) => `<li class="step" data-reveal>
      <span class="step__n">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="step__title">${esc(s.title)}</h3>
      <p class="step__text">${esc(s.text)}</p>
    </li>`
    )
    .join('');
  return `<section class="section process">
  <div class="shell">
    <div class="section__head" data-reveal-group>
      ${eyebrow(pr.eyebrow, 'center')}
      ${headline(pr.headline, 'h2', 'hl--center')}
      ${ornament()}
    </div>
    <ol class="step-grid">${steps}</ol>
  </div>
</section>`;
}

function pageWhy(w) {
  const items = w.items
    .map(
      (it) => `<article class="tile tile--text" data-reveal>
      <span class="tile__icon">${icon(it.icon)}</span>
      <h3 class="tile__title">${esc(it.title)}</h3>
      <p class="tile__text">${esc(it.text)}</p>
    </article>`
    )
    .join('');
  return `<section class="section why-page">
  <div class="shell">
    <div class="section__head" data-reveal-group>
      ${eyebrow(w.eyebrow, 'center')}
      ${headline(w.headline, 'h2', 'hl--center')}
      ${ornament()}
    </div>
    <div class="why__grid why__grid--text">${items}</div>
  </div>
</section>`;
}

function pageMedia(m) {
  const shots = m.images
    .map(
      (im) => `<figure class="shot" data-reveal>${img(im.slug, {
        alt: im.alt,
        sizes: '(max-width: 640px) 88vw, (max-width: 1023px) 46vw, 30vw',
        ratio: 4 / 3,
      })}</figure>`
    )
    .join('');
  return `<section class="section media">
  <div class="shell">
    <div class="section__head" data-reveal-group>
      ${eyebrow(m.eyebrow, 'center')}
      ${headline(m.headline, 'h2', 'hl--center')}
      ${ornament()}
    </div>
    <div class="shot-grid">${shots}</div>
  </div>
</section>`;
}

function relatedServices(currentSlug) {
  const r = PAGES.related;
  const others = PAGES.pages.filter((p) => p.slug !== currentSlug);
  const svc = C.services.items;
  const cards = others
    .map((p) => {
      const match = svc.find((s) => s.page === p.slug);
      return `<article class="card" data-reveal>
      <a class="card__link" href="${esc(servicePath(p.slug))}">
        <div class="card__media">${img(match.image.slug, {
          alt: '',
          sizes: '(max-width: 640px) 46vw, 24vw',
          ratio: 4 / 3,
        })}<span class="card__icon">${icon(match.icon)}</span></div>
        <div class="card__body">
          <h3 class="card__title">${esc(p.cardTitle)}</h3>
          <p class="card__text">${esc(p.lede)}</p>
          <span class="link-more">${esc(r.linkLabel)}${icon('arrow-right', 'link-more__arrow')}</span>
        </div>
      </a>
    </article>`;
    })
    .join('');
  return `<section class="section related">
  <div class="shell">
    <div class="section__head" data-reveal-group>
      ${eyebrow(r.eyebrow, 'center')}
      ${headline(r.headline, 'h2', 'hl--center')}
      ${ornament()}
    </div>
    <div class="related__grid">${cards}</div>
  </div>
</section>`;
}

function servicePage(page) {
  atService(page.slug);
  const body = [
    pageHero(page),
    pageIntro(page.intro),
    pageOffering(page.offering),
    page.process ? pageProcess(page.process) : '',
    pageWhy(page.why),
    pageMedia(page.media),
    relatedServices(page.slug),
    ctaBand(page.ctaLabel),
  ]
    .filter(Boolean)
    .join('\n');

  return document_({
    title: page.title,
    description: page.description,
    canonical: `${siteUrl}services/${page.slug}.html`,
    preload: MANIFEST[page.hero.slug],
    body,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: page.navLabel,
      description: page.description,
      serviceType: page.navLabel,
      areaServed: 'KE',
      provider: { '@type': 'MusicGroup', name: C.site.name, url: LINKS.website },
      url: `${siteUrl}services/${page.slug}.html`,
    },
  });
}

/* ---------------------------------------------------------------- write */

atRoot();
const html = document_({
  title: C.site.title,
  description: C.site.description,
  canonical: LINKS.website,
  preload: MANIFEST.hero,
  schema,
  body: [hero(), about(), services(), why(), eventsAndClients(), gallery(), ctaBand()].join('\n'),
});

writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
console.log(`index.html written — ${(html.length / 1024).toFixed(1)} KB`);

mkdirSync(join(ROOT, 'services'), { recursive: true });
for (const page of PAGES.pages) {
  const out = servicePage(page);
  writeFileSync(join(ROOT, 'services', `${page.slug}.html`), out, 'utf8');
  console.log(`services/${page.slug}.html — ${(out.length / 1024).toFixed(1)} KB`);
}
atRoot();

// robots.txt mirrors the noindex flag so a review deploy stays out of search
writeFileSync(
  join(ROOT, 'robots.txt'),
  C.site.noindex
    ? '# Client review build. Not for indexing.\nUser-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${LINKS.website.replace(/\/?$/, '/')}sitemap.xml\n`,
  'utf8'
);
console.log(`robots.txt written — ${C.site.noindex ? 'DISALLOW ALL (noindex build)' : 'allow all'}`);
