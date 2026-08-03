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

  /* ------------------------------------------------------------ video facade */
  (function facade() {
    $$('[data-facade]').forEach(function (box) {
      var btn = $('[data-facade-play]', box);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var id = box.getAttribute('data-video');
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + id +
          '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
        f.title = btn.textContent.trim() || 'Video';
        f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        f.setAttribute('frameborder', '0');
        box.classList.add('is-playing');
        box.appendChild(f);
        f.focus({ preventScroll: true });
      });
    });
  })();

  /* ------------------------------------------------------------ booking form */
  (function booking() {
    var form = $('[data-booking]');
    if (!form) return;

    var copyNode = $('[data-form-copy]', form);
    var COPY = {};
    try { COPY = JSON.parse(copyNode.textContent); } catch (e) { /* keep defaults */ }

    var statusBox = $('[data-form-status]', form);
    var statusHead = $('[data-status-heading]', form);
    var statusBody = $('[data-status-body]', form);
    var fallback = $('[data-status-fallback]', form);
    var submit = $('.form__submit', form);
    var label = $('[data-submit-label]', form);
    var endpoint = form.getAttribute('data-endpoint');
    var mailto = form.getAttribute('data-mailto');

    function show(state, heading, body, withFallback) {
      statusBox.hidden = false;
      statusBox.classList.toggle('is-error', state === 'error');
      statusHead.textContent = heading || '';
      statusBody.textContent = body || '';
      fallback.hidden = !withFallback;
    }

    /* inline validation, one message per field */
    function fieldOf(el) { return el.closest('.field'); }
    function clearError(el) {
      var f = fieldOf(el);
      if (!f) return;
      f.classList.remove('is-invalid');
      var m = $('.field__error', f);
      if (m) m.remove();
      el.removeAttribute('aria-invalid');
    }
    function setError(el, msg) {
      var f = fieldOf(el);
      if (!f) return;
      clearError(el);
      f.classList.add('is-invalid');
      el.setAttribute('aria-invalid', 'true');
      var p = document.createElement('p');
      p.className = 'field__error';
      p.textContent = msg;
      f.appendChild(p);
    }
    function validate() {
      var bad = null;
      $$('input, select, textarea', form).forEach(function (el) {
        if (el.name === '_company') return;
        clearError(el);
        if (!el.checkValidity()) {
          var msg = el.validity.valueMissing ? 'This one is needed'
            : el.validity.typeMismatch ? 'Check this is correct'
            : 'Check this field';
          setError(el, msg);
          if (!bad) bad = el;
        }
      });
      return bad;
    }
    $$('input, select, textarea', form).forEach(function (el) {
      el.addEventListener('input', function () { clearError(el); });
      el.addEventListener('change', function () { clearError(el); });
    });

    function values() {
      var out = [];
      $$('input, select, textarea', form).forEach(function (el) {
        if (!el.name || el.name === '_company' || !el.value.trim()) return;
        var lab = $('label[for="' + el.id + '"]', form);
        var name = lab ? lab.textContent.replace('*', '').trim() : el.name;
        out.push([name, el.value.trim()]);
      });
      return out;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // honeypot: silently accept, do nothing
      if (form.elements._company && form.elements._company.value) return;

      var bad = validate();
      if (bad) {
        bad.focus({ preventScroll: false });
        return;
      }

      var pairs = values();

      /* no endpoint configured -> compose a structured email and show a
         visible fallback, because mailto can fail with no error at all */
      if (!endpoint) {
        var body = pairs.map(function (p) { return p[0] + ': ' + p[1]; }).join('\n');
        var href = mailto + '?subject=' + encodeURIComponent('Booking enquiry via the website') +
          '&body=' + encodeURIComponent(body);
        window.location.href = href;
        show('note', COPY.mailtoNote.heading, COPY.mailtoNote.body, true);
        return;
      }

      /* real endpoint -> POST it */
      form.classList.add('is-sending');
      if (label) label.textContent = COPY.sending || 'Sending';
      var data = new FormData(form);
      data.delete('_company');

      fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          show('ok', COPY.success.heading, COPY.success.body, false);
          form.reset();
        })
        .catch(function () {
          show('error', COPY.error.heading, COPY.error.body, true);
        })
        .then(function () {
          form.classList.remove('is-sending');
          if (label) label.textContent = COPY.submit || 'Send Enquiry';
        });
    });

    /* copy-the-address fallback */
    $$('[data-copy]', form).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var span = $('span', btn);
        var done = function () {
          if (!span) return;
          span.textContent = btn.getAttribute('data-copied-label');
          setTimeout(function () { span.textContent = btn.getAttribute('data-copy-label'); }, 2200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        } else {
          var t = document.createElement('textarea');
          t.value = text; document.body.appendChild(t); t.select();
          try { document.execCommand('copy'); done(); } catch (err) { /* ignore */ }
          document.body.removeChild(t);
        }
      });
    });
  })();

  /* ------------------------------------------------------------ newsletter */
  (function newsletter() {
    var form = $('[data-newsletter]');
    if (!form) return;
    var msg = $('[data-nl-msg]', form);
    var input = $('input', form);
    var mailto = form.getAttribute('action') || '';
    // copy lives in data/site-content.json, not here
    var success = form.getAttribute('data-success') || 'Thank you. You are on the list.';

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
