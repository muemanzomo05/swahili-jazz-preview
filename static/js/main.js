/* Swahili Jazz — interactions
   Premium, restrained motion: reveals, nav behaviour, gallery, micro-interactions. */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ nav */
  (function nav() {
    var bar = $('[data-nav]');
    if (!bar) return;
    var last = window.scrollY;
    var ticking = false;

    function update() {
      var y = window.scrollY;
      bar.classList.toggle('is-stuck', y > 24);
      // hide on downward scroll past the hero, reveal on any upward scroll
      var menuOpen = document.body.classList.contains('is-locked');
      bar.classList.toggle('is-hidden', !menuOpen && y > 520 && y > last + 4);
      last = y;
      ticking = false;
    }
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  /* ------------------------------------------------------------ mobile menu */
  (function menu() {
    var toggle = $('[data-menu-toggle]');
    var panel = $('[data-menu]');
    if (!toggle || !panel) return;
    panel.removeAttribute('hidden');
    panel.setAttribute('aria-hidden', 'true');

    function set(open) {
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
      if (open) { var f = $('a', panel); if (f) f.focus({ preventScroll: true }); }
    }

    toggle.addEventListener('click', function () {
      set(!panel.classList.contains('is-open'));
    });
    $$('[data-menu-link], .menu__cta', panel).forEach(function (a) {
      a.addEventListener('click', function () { set(false); });
    });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) { set(false); toggle.focus(); }
    });
    matchMedia('(min-width: 1024px)').addEventListener('change', function (e) {
      if (e.matches) set(false);
    });
  })();

  /* ------------------------------------------------------------ reveals */
  (function reveals() {
    var nodes = $$('[data-reveal], [data-reveal-group]');
    if (!nodes.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    nodes.forEach(function (n) { io.observe(n); });
  })();

  /* ------------------------------------------------------------ scrollspy */
  (function spy() {
    var links = $$('.nav__link');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute('href');
      if (id && id.charAt(0) === '#') { var s = $(id); if (s) map[id.slice(1)] = a; }
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-current'); });
        var a = map[en.target.id];
        if (a) a.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  })();

  /* ------------------------------------------------------------ gallery */
  (function gallery() {
    var stage = $('[data-gallery]');
    if (!stage) return;

    var slides = $$('.slide', stage);
    var thumbs = $$('[data-thumb]', stage);
    var strip = $('[data-thumbs]', stage);
    var caption = $('[data-caption]', stage);
    var count = $('[data-count]', stage);
    var bar = $('[data-progress]', stage);
    var live = $('[data-live]', stage);
    var total = slides.length;
    var index = parseInt(stage.getAttribute('data-start'), 10) || 0;
    var delay = parseInt(stage.getAttribute('data-autoplay'), 10) || 0;
    var timer = null, start = 0, raf = null, paused = false;

    var pad = function (n) { return String(n).padStart(2, '0'); };

    /* Centre the active thumbnail inside its own strip.
       Deliberately NOT scrollIntoView(): that walks up and scrolls every
       scrollable ancestor including the document, which yanked the page down
       to the gallery on each slide change. scrollBy on the strip is confined
       to the strip, so the reader's scroll position is never touched. */
    function centreThumb() {
      if (!strip || strip.scrollWidth <= strip.clientWidth) return;
      var t = thumbs[index].getBoundingClientRect();
      var s = strip.getBoundingClientRect();
      var delta = (t.left + t.width / 2) - (s.left + s.width / 2);
      if (Math.abs(delta) < 1) return;
      if (strip.scrollBy) {
        strip.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
      } else {
        strip.scrollLeft += delta;
      }
    }

    function show(next, viaUser) {
      next = (next + total) % total;
      if (next === index) return;
      slides[index].classList.remove('is-active');
      slides[index].setAttribute('aria-hidden', 'true');
      thumbs[index].classList.remove('is-active');
      thumbs[index].removeAttribute('aria-current');

      index = next;
      var slide = slides[index];
      slide.classList.add('is-active');
      slide.removeAttribute('aria-hidden');
      thumbs[index].classList.add('is-active');
      thumbs[index].setAttribute('aria-current', 'true');

      // eager-load the newly shown image if it was lazy
      var im = $('img', slide);
      if (im && im.loading === 'lazy') im.loading = 'eager';

      if (caption) {
        caption.classList.add('is-swapping');
        setTimeout(function () {
          caption.textContent = im ? im.alt : '';
          caption.classList.remove('is-swapping');
        }, reduced ? 0 : 200);
      }
      if (count) count.textContent = pad(index + 1);
      if (live) live.textContent = 'Image ' + (index + 1) + ' of ' + total;

      centreThumb();

      if (viaUser) restart();
    }

    /* autoplay + progress bar */
    function tick(now) {
      if (paused || !delay) return;
      var pct = Math.min((now - start) / delay, 1);
      if (bar) bar.style.width = (pct * 100).toFixed(2) + '%';
      if (pct >= 1) { show(index + 1); start = now; }
      raf = requestAnimationFrame(tick);
    }
    function restart() {
      if (!delay || reduced) return;
      cancelAnimationFrame(raf);
      start = performance.now();
      if (bar) bar.style.width = '0%';
      raf = requestAnimationFrame(tick);
    }
    function pause(on) {
      paused = on;
      if (!on) { start = performance.now() - (bar ? parseFloat(bar.style.width || 0) / 100 * delay : 0);
        cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    }

    $('[data-prev]', stage).addEventListener('click', function () { show(index - 1, true); });
    $('[data-next]', stage).addEventListener('click', function () { show(index + 1, true); });
    thumbs.forEach(function (b, i) {
      b.addEventListener('click', function () { show(i, true); });
    });

    stage.addEventListener('mouseenter', function () { pause(true); });
    stage.addEventListener('mouseleave', function () { pause(false); });
    stage.addEventListener('focusin', function () { pause(true); });
    stage.addEventListener('focusout', function () {
      if (!stage.contains(document.activeElement)) pause(false);
    });
    document.addEventListener('visibilitychange', function () { pause(document.hidden); });

    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, true); }
    });

    /* swipe */
    var x0 = null, y0 = null;
    var vp = $('.gallery__viewport', stage);
    vp.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    vp.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1), true);
      x0 = y0 = null;
    }, { passive: true });

    restart();
  })();

  /* ------------------------------------------------------------ newsletter */
  (function newsletter() {
    var form = $('[data-newsletter]');
    if (!form) return;
    var msg = $('[data-nl-msg]', form);
    var input = $('input', form);
    var mailto = form.getAttribute('action') || '';
    var success = 'Thank you — you’re on the list.';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input.checkValidity()) { input.reportValidity(); return; }
      var addr = mailto.replace(/^mailto:/, '').split('?')[0];
      var href = 'mailto:' + addr +
        '?subject=' + encodeURIComponent('Newsletter signup') +
        '&body=' + encodeURIComponent('Please add ' + input.value + ' to the Swahili Jazz mailing list.');
      window.location.href = href;
      if (msg) msg.textContent = success;
      input.value = '';
    });
  })();

  /* ------------------------------------------------------------ smooth anchors */
  (function anchors() {
    if (!('scrollBehavior' in document.documentElement.style)) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.pushState(null, '', id);
    });
  })();
})();
