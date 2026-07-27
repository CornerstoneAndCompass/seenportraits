/* ==========================================================================
   SEEN Portraits, front end behaviour

   Progressive enhancement. The reveal styles in site.css hide content until
   .is-in lands, so this file's first duty is making sure that always happens:
   every feature is isolated behind guard(), the observer is attached before
   .no-js is cleared, and a timeout reveals everything if anything stalls.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function guard(name, fn) {
    try {
      fn();
    } catch (err) {
      if (window.console && console.warn) console.warn('[seen] ' + name + ' failed', err);
    }
  }

  function revealAll() {
    var all = document.querySelectorAll('[data-rise], [data-media], [data-tile], .reveal-w, .hr');
    for (var i = 0; i < all.length; i++) all[i].classList.add('is-in');
  }

  var focusableSel = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

  /* ----------------------------------------------------------------------
     Headline word splitting, tier 1 motion
     ------------------------------------------------------------------- */

  function splittable(el) {
    return Array.prototype.every.call(el.childNodes, function (n) {
      return n.nodeType === 3 || n.tagName === 'BR';
    });
  }

  function splitWords(el) {
    if (el.dataset.split) return;
    var out = [];
    var i = 0;
    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (!chunk.trim()) { out.push(document.createTextNode(chunk)); return; }
          var outer = document.createElement('span');
          outer.className = 'w';
          var inner = document.createElement('span');
          inner.className = 'w__i';
          inner.textContent = chunk;
          inner.style.transitionDelay = (i * 0.055).toFixed(3) + 's';
          i++;
          outer.appendChild(inner);
          out.push(outer);
        });
      } else {
        out.push(node.cloneNode(true));
      }
    });
    el.innerHTML = '';
    out.forEach(function (n) { el.appendChild(n); });
    el.dataset.split = '1';
  }

  guard('motion tiers', function () {
    if (reduce) return;

    /* Tier 1, once per page: the page headline, and the interlude line. */
    document.querySelectorAll('h1.d1, h1.d2, .plate__line').forEach(function (el) {
      if (splittable(el)) { splitWords(el); el.classList.add('reveal-w'); }
    });

    /* Tier 2, full-bleed and feature photography wipes open. */
    document.querySelectorAll('.split__media > .ph, .mapframe, .capture > .ph')
      .forEach(function (el) { el.setAttribute('data-media', ''); });

    /* Tier 3, grid tiles settle quietly, staggered by index. */
    document.querySelectorAll('.gal, .cols, .deliv').forEach(function (grid) {
      var tiles = grid.children;
      for (var t = 0; t < tiles.length; t++) {
        if (tiles[t].hasAttribute('data-media')) continue;
        tiles[t].setAttribute('data-tile', '');
        tiles[t].style.setProperty('--i', t);
      }
    });
  });

  /* ----------------------------------------------------------------------
     Reveal on scroll

     Nothing is hidden until html.js-anim is set, and that only happens once
     the observer is about to run in a visible tab. If any of this fails, or
     the tab is in the background, the page simply renders complete. Content
     is never conditional on an animation.
     ------------------------------------------------------------------- */

  function startReveals() {
    var watched = document.querySelectorAll('[data-rise], [data-media], [data-tile], .reveal-w, .hr');
    if (!watched.length || reduce || !('IntersectionObserver' in window)) return;

    root.classList.add('js-anim');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    for (var i = 0; i < watched.length; i++) io.observe(watched[i]);

    /* if the observer somehow reports nothing, show everything */
    window.setTimeout(function () {
      if (!document.querySelector('.is-in')) revealAll();
    }, 2500);
  }

  root.classList.remove('no-js');

  guard('reveal', function () {
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', function onShow() {
        if (document.visibilityState === 'hidden') return;
        document.removeEventListener('visibilitychange', onShow);
        startReveals();
      });
    } else {
      startReveals();
    }
  });

  /* ----------------------------------------------------------------------
     Masthead
     ------------------------------------------------------------------- */

  guard('masthead', function () {
    var mast = document.querySelector('.mast');
    if (!mast) return;
    var lastY = -1;
    var prevY = 0;
    var onScroll = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (y === lastY) return;
      mast.classList.toggle('is-stuck', y > 12);
      var down = y > prevY && y > 220;
      if (!document.body.classList.contains('nav-open')) {
        mast.classList.toggle('is-retracted', down);
      }
      prevY = y;
      lastY = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  });

  /* ----------------------------------------------------------------------
     Navigation dropdowns. CSS drives the reveal; this adds the state
     assistive tech needs, plus Escape to dismiss.
     ------------------------------------------------------------------- */

  guard('nav', function () {
    document.querySelectorAll('.nav__item').forEach(function (item, n) {
      var panel = item.querySelector('.nav__panel');
      var link = item.querySelector('.nav__link');
      if (!panel || !link) return;
      var id = 'nav-panel-' + n;
      panel.id = id;
      panel.setAttribute('role', 'group');
      link.setAttribute('aria-haspopup', 'true');
      link.setAttribute('aria-expanded', 'false');
      link.setAttribute('aria-controls', id);

      var sync = function (open) { link.setAttribute('aria-expanded', open ? 'true' : 'false'); };
      item.addEventListener('mouseenter', function () { sync(true); });
      item.addEventListener('mouseleave', function () { sync(false); });
      item.addEventListener('focusin', function () { sync(true); });
      item.addEventListener('focusout', function () {
        if (!item.contains(document.activeElement)) sync(false);
      });
      item.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        item.classList.add('is-dismissed');
        sync(false);
        link.focus();
        window.setTimeout(function () { item.classList.remove('is-dismissed'); }, 400);
      });
    });
  });

  /* ----------------------------------------------------------------------
     Mobile drawer. Modal: locks the page, cycles focus, returns it.
     ------------------------------------------------------------------- */

  guard('drawer', function () {
    var burger = document.querySelector('.burger');
    var drawer = document.querySelector('.drawer');
    if (!burger || !drawer) return;
    var scrollLock = '';

    function openDrawer() {
      document.body.classList.add('nav-open');
      burger.setAttribute('aria-expanded', 'true');
      scrollLock = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      var first = drawer.querySelector(focusableSel);
      if (first) first.focus();
    }

    function closeDrawer(returnFocus) {
      if (!document.body.classList.contains('nav-open')) return;
      document.body.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = scrollLock;
      if (returnFocus !== false) burger.focus();
    }

    burger.addEventListener('click', function () {
      if (document.body.classList.contains('nav-open')) closeDrawer();
      else openDrawer();
    });

    drawer.addEventListener('click', function (e) {
      /* only the collapsible groups are buttons. The plain links must not be
         given an aria-expanded state, and must close the drawer. */
      var head = e.target.closest('.drawer__head');
      if (head && head.tagName === 'BUTTON') {
        var group = head.parentElement;
        var isOpen = group.classList.toggle('is-open');
        head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        return;
      }
      if (e.target.closest('a')) closeDrawer(false);
    });

    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.filter.call(
        drawer.querySelectorAll(focusableSel),
        function (el) { return el.offsetParent !== null; }
      );
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

  /* ----------------------------------------------------------------------
     Parallax on full-bleed photography. Reads batched ahead of writes.
     ------------------------------------------------------------------- */

  guard('parallax', function () {
    if (reduce) return;
    var layers = [];
    document.querySelectorAll('.plate__bg img, .hero--plate .hero__bg img').forEach(function (img) {
      img.setAttribute('data-parallax', '');
      img.style.height = '118%';
      img.style.top = '-9%';
      img.style.position = 'absolute';
      layers.push({ el: img, box: img.closest('.plate, .hero') || img.parentElement });
    });
    if (!layers.length) return;

    var ticking = false;
    var drift = function () {
      var vh = window.innerHeight;
      var reads = layers.map(function (l) { return l.box.getBoundingClientRect(); });
      layers.forEach(function (l, i) {
        var r = reads[i];
        if (r.bottom < -200 || r.top > vh + 200) return;
        var progress = (r.top + r.height / 2 - vh / 2) / vh;
        l.el.style.transform = 'translate3d(0,' + (progress * -7).toFixed(2) + '%,0)';
      });
      ticking = false;
    };
    var onDrift = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(drift);
    };
    drift();
    window.addEventListener('scroll', onDrift, { passive: true });
    window.addEventListener('resize', onDrift, { passive: true });
  });

  /* ----------------------------------------------------------------------
     Gallery: frame numbers, and a real name on each button
     ------------------------------------------------------------------- */

  guard('gallery labels', function () {
    document.querySelectorAll('.gal').forEach(function (gal) {
      Array.prototype.forEach.call(gal.querySelectorAll('button'), function (b, n) {
        var img = b.querySelector('img');
        if (img && !b.getAttribute('aria-label')) {
          b.setAttribute('aria-label', 'Enlarge image ' + (n + 1) + ', ' + (img.alt || 'portrait'));
        }
        if (b.querySelector('.gal__n')) return;
        var tag = document.createElement('span');
        tag.className = 'gal__n';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = String(n + 1).padStart(2, '0');
        b.appendChild(tag);
      });
    });
  });

  /* ----------------------------------------------------------------------
     Lightbox
     ------------------------------------------------------------------- */

  guard('lightbox', function () {
    var lbox = document.querySelector('.lbox');
    if (!lbox) return;
    var lImg = lbox.querySelector('img');
    var lCount = lbox.querySelector('.lbox__count');
    var lCap = lbox.querySelector('.lbox__cap');
    var group = [];
    var index = 0;
    var lastFocus = null;
    var scrollLock = '';

    function paint(n) {
      index = (n + group.length) % group.length;
      var frame = group[index];
      lImg.src = frame.getAttribute('data-full') || frame.querySelector('img').src;
      lImg.alt = frame.querySelector('img').alt || '';
      if (lCap) lCap.textContent = lImg.alt;
      if (lCount) {
        lCount.innerHTML = '<b>' + String(index + 1).padStart(2, '0') + '</b> / '
                         + String(group.length).padStart(2, '0');
      }
    }

    function show(n) {
      if (!group.length) return;
      if (!lbox.classList.contains('is-open') || reduce) { paint(n); return; }
      lbox.classList.add('is-swapping');
      window.setTimeout(function () {
        paint(n);
        lbox.classList.remove('is-swapping');
      }, 190);
    }

    function hideBehind(on) {
      ['main', '.foot', '.mast', '.util', '.dock'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (!el) return;
        if (on) el.setAttribute('aria-hidden', 'true');
        else el.removeAttribute('aria-hidden');
      });
    }

    function openLb(btn) {
      var gal = btn.closest('.gal');
      group = gal ? Array.prototype.slice.call(gal.querySelectorAll('button')) : [btn];
      lastFocus = btn;
      paint(group.indexOf(btn));
      lbox.classList.add('is-open');
      lbox.setAttribute('aria-hidden', 'false');
      scrollLock = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      hideBehind(true);
      var x = lbox.querySelector('.lbox__x');
      if (x) x.focus();
    }

    function closeLb() {
      lbox.classList.remove('is-open');
      lbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = scrollLock;
      hideBehind(false);
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
      if (e.key === 'Escape') return closeLb();
      if (e.key === 'ArrowLeft') return show(index - 1);
      if (e.key === 'ArrowRight') return show(index + 1);
      if (e.key !== 'Tab') return;
      var items = Array.prototype.slice.call(lbox.querySelectorAll(focusableSel));
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

  /* ----------------------------------------------------------------------
     Gift voucher stepper
     ------------------------------------------------------------------- */

  guard('voucher', function () {
    var vform = document.querySelector('[data-voucher]');
    if (!vform) return;
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
        if (!summary) return;
        summary.classList.remove('is-hidden');
        if (summaryName) summaryName.textContent = b.getAttribute('data-session');
        if (summaryLine) summaryLine.textContent = b.getAttribute('data-line') || '';
        if (summaryImg) summaryImg.src = b.getAttribute('data-img') || summaryImg.src;
      });
    });
  });

  /* ----------------------------------------------------------------------
     Shop filters
     ------------------------------------------------------------------- */

  guard('shop', function () {
    var shop = document.querySelector('[data-shop]');
    if (!shop) return;
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
          item.classList.toggle('is-hidden', !(want === 'all' || item.getAttribute('data-cat') === want));
        });
      });
    });
  });

  /* ----------------------------------------------------------------------
     Enquiry form: carry the session through from the page they came from
     ------------------------------------------------------------------- */

  guard('prefill', function () {
    var frame = document.querySelector('[data-prefill-frame]');
    if (!frame) return;
    var session = new URLSearchParams(window.location.search).get('session');
    if (!session) return;
    var label = document.querySelector('[data-prefill-label]');
    if (label) label.textContent = session.replace(/-/g, ' ');
    var wrap = document.querySelector('[data-prefill-wrap]');
    if (wrap) wrap.classList.remove('is-hidden');
    var src = frame.getAttribute('src');
    frame.setAttribute('src', src + (src.indexOf('?') > -1 ? '&' : '?') + 'session=' + encodeURIComponent(session));
  });

  guard('session links', function () {
    document.querySelectorAll('[data-enquire-for]').forEach(function (a) {
      var name = a.getAttribute('data-enquire-for');
      if (!name) return;
      var href = a.getAttribute('href') || 'enquiry.html';
      a.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') + 'session=' + encodeURIComponent(name));
    });
  });

  guard('year', function () {
    var yr = document.querySelector('[data-year]');
    if (yr) yr.textContent = new Date().getFullYear();
  });
})();
