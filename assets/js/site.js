/* ==========================================================================
   SEEN Portraits, front end behaviour
   Progressive enhancement only. Every page reads and navigates without JS.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- masthead: condense once the page moves ------------------------- */
  var mast = document.querySelector('.mast');
  if (mast) {
    var lastY = -1;
    var onScroll = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (y === lastY) return;
      lastY = y;
      mast.classList.toggle('is-stuck', y > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- mobile drawer -------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var drawer = document.querySelector('.drawer');

  function closeDrawer() {
    document.body.classList.remove('nav-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    drawer.addEventListener('click', function (e) {
      var head = e.target.closest('.drawer__head');
      if (head) {
        var group = head.parentElement;
        var isOpen = group.classList.toggle('is-open');
        head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        return;
      }
      if (e.target.closest('a')) closeDrawer();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  /* --- reveal on scroll ---------------------------------------------- */
  var rises = document.querySelectorAll('[data-rise]');
  if (!rises.length) {
    /* nothing to do */
  } else if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < rises.length; i++) rises[i].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    for (var j = 0; j < rises.length; j++) io.observe(rises[j]);
  }

  /* --- gallery lightbox ---------------------------------------------- */
  var lbox = document.querySelector('.lbox');
  if (lbox) {
    var lImg = lbox.querySelector('img');
    var lCount = lbox.querySelector('.lbox__count');
    var group = [];
    var index = 0;
    var lastFocus = null;

    function show(n) {
      if (!group.length) return;
      index = (n + group.length) % group.length;
      var src = group[index].getAttribute('data-full') || group[index].querySelector('img').src;
      var alt = group[index].querySelector('img').alt || '';
      lImg.src = src;
      lImg.alt = alt;
      if (lCount) lCount.textContent = (index + 1) + ' / ' + group.length;
    }

    function openLb(btn) {
      var gal = btn.closest('.gal');
      group = gal ? Array.prototype.slice.call(gal.querySelectorAll('button')) : [btn];
      lastFocus = btn;
      show(group.indexOf(btn));
      lbox.classList.add('is-open');
      lbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var x = lbox.querySelector('.lbox__x');
      if (x) x.focus();
    }

    function closeLb() {
      lbox.classList.remove('is-open');
      lbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lImg.removeAttribute('src');
      if (lastFocus) lastFocus.focus();
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.gal button');
      if (btn) { e.preventDefault(); openLb(btn); }
    });

    lbox.addEventListener('click', function (e) {
      if (e.target.closest('.lbox__x') || e.target === lbox) return closeLb();
      if (e.target.closest('.lbox__prev')) return show(index - 1);
      if (e.target.closest('.lbox__next')) return show(index + 1);
    });

    document.addEventListener('keydown', function (e) {
      if (!lbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* --- gift voucher stepper ------------------------------------------ */
  var vform = document.querySelector('[data-voucher]');
  if (vform) {
    var kindBtns = vform.querySelectorAll('[data-kind]');
    var stepSession = vform.querySelector('[data-step="session"]');
    var sessionBtns = vform.querySelectorAll('[data-session]');
    var summary = vform.querySelector('[data-summary]');
    var summaryName = vform.querySelector('[data-summary-name]');
    var summaryLine = vform.querySelector('[data-summary-line]');
    var summaryImg = vform.querySelector('[data-summary-img]');

    kindBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        kindBtns.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        var isSession = b.getAttribute('data-kind') === 'session';
        if (stepSession) stepSession.classList.toggle('is-hidden', !isSession);
        if (!isSession && summary) summary.classList.add('is-hidden');
      });
    });

    sessionBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        sessionBtns.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        if (summary) {
          summary.classList.remove('is-hidden');
          if (summaryName) summaryName.textContent = b.getAttribute('data-session');
          if (summaryLine) summaryLine.textContent = b.getAttribute('data-line') || '';
          if (summaryImg) summaryImg.src = b.getAttribute('data-img') || summaryImg.src;
        }
      });
    });
  }

  /* --- shop filters --------------------------------------------------- */
  var shop = document.querySelector('[data-shop]');
  if (shop) {
    var chips = shop.querySelectorAll('[data-filter]');
    var items = shop.querySelectorAll('[data-cat]');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var want = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          c.classList.toggle('chip--on', c === chip);
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
        });
        items.forEach(function (item) {
          var show = want === 'all' || item.getAttribute('data-cat') === want;
          item.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  /* --- enquiry form: carry the session through ------------------------ */
  var frame = document.querySelector('[data-prefill-frame]');
  if (frame) {
    var params = new URLSearchParams(window.location.search);
    var session = params.get('session');
    if (session) {
      var label = document.querySelector('[data-prefill-label]');
      if (label) label.textContent = session.replace(/-/g, ' ');
      var wrap = document.querySelector('[data-prefill-wrap]');
      if (wrap) wrap.classList.remove('is-hidden');
      var src = frame.getAttribute('src');
      frame.setAttribute('src', src + (src.indexOf('?') > -1 ? '&' : '?') + 'session=' + encodeURIComponent(session));
    }
  }

  /* --- session links pass their name to the enquiry form -------------- */
  document.querySelectorAll('[data-enquire-for]').forEach(function (a) {
    var name = a.getAttribute('data-enquire-for');
    if (!name) return;
    var href = a.getAttribute('href') || 'enquiry.html';
    a.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') + 'session=' + encodeURIComponent(name));
  });

  /* --- footer year ---------------------------------------------------- */
  var yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
