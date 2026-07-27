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
    var prevY = 0;
    var onScroll = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (y === lastY) return;
      mast.classList.toggle('is-stuck', y > 12);
      /* retract on the way down, return the moment they scroll back up */
      var down = y > prevY && y > 220;
      if (!document.body.classList.contains('nav-open')) {
        mast.classList.toggle('is-hidden', down);
      }
      prevY = y;
      lastY = y;
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

  /* --- headlines are split into words so they can rise individually --- */
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

  /* Only split headings made purely of text and line breaks, so nested
     markup such as <strong> or a link is never destroyed. */
  function splittable(el) {
    return Array.prototype.every.call(el.childNodes, function (n) {
      return n.nodeType === 3 || n.tagName === 'BR';
    });
  }

  if (!reduce) {
    /* Tier 1, once per page. The page's own headline, and the interlude line
       if the page has one. Nothing else gets the title-sequence treatment. */
    document.querySelectorAll('h1.d1, h1.d2, .plate__line').forEach(function (el) {
      if (splittable(el)) { splitWords(el); el.classList.add('reveal-w'); }
    });

    /* Tier 2, full-bleed and feature photography only. These wipe open. */
    document.querySelectorAll('.split__media > .ph, .hero__plate, .mapframe, .capture > .ph')
      .forEach(function (el) { el.setAttribute('data-media', ''); });

    /* Tier 3, everything in a grid. A quiet settle with an index stagger, so
       eight tiles read as one gesture rather than eight events. */
    document.querySelectorAll('.gal, .cols, .deliv').forEach(function (grid) {
      var tiles = grid.children;
      for (var t = 0; t < tiles.length; t++) {
        if (tiles[t].hasAttribute('data-media')) continue;
        tiles[t].setAttribute('data-tile', '');
        tiles[t].style.setProperty('--i', t);
      }
    });
  }

  /* --- reveal on scroll ---------------------------------------------- */
  var watched = document.querySelectorAll('[data-rise], [data-media], [data-tile], .reveal-w, .hr');
  if (!watched.length) {
    /* nothing to do */
  } else if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < watched.length; i++) watched[i].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    for (var j = 0; j < watched.length; j++) io.observe(watched[j]);
  }

  /* --- parallax, a slow drift on the full-bleed photography ----------- */
  if (!reduce) {
    var layers = [];
    document.querySelectorAll('.plate__bg img, .hero--plate .hero__bg img').forEach(function (img) {
      img.setAttribute('data-parallax', '');
      layers.push({ el: img, box: img.closest('.plate, .hero') || img.parentElement });
    });
    if (layers.length) {
      /* give the image room to travel without exposing an edge */
      layers.forEach(function (l) { l.el.style.height = '118%'; l.el.style.top = '-9%'; l.el.style.position = 'absolute'; });
      var ticking = false;
      var drift = function () {
        var vh = window.innerHeight;
        layers.forEach(function (l) {
          var r = l.box.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var progress = (r.top + r.height / 2 - vh / 2) / vh;   /* -1 .. 1 */
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
      window.addEventListener('resize', onDrift);
    }
  }

  /* --- gallery frames name themselves on hover ----------------------- */
  document.querySelectorAll('.gal').forEach(function (gal) {
    Array.prototype.forEach.call(gal.querySelectorAll('button'), function (b, n) {
      if (b.querySelector('.gal__n')) return;
      var tag = document.createElement('span');
      tag.className = 'gal__n';
      tag.setAttribute('aria-hidden', 'true');
      tag.textContent = String(n + 1).padStart(2, '0');
      b.appendChild(tag);
    });
  });

  /* --- gallery lightbox ---------------------------------------------- */
  var lbox = document.querySelector('.lbox');
  if (lbox) {
    var lImg = lbox.querySelector('img');
    var lCount = lbox.querySelector('.lbox__count');
    var group = [];
    var index = 0;
    var lastFocus = null;

    var lCap = lbox.querySelector('.lbox__cap');

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

    /* frames cross-fade rather than snapping to a new src */
    function show(n) {
      if (!group.length) return;
      if (!lbox.classList.contains('is-open') || reduce) { paint(n); return; }
      lbox.classList.add('is-swapping');
      window.setTimeout(function () {
        paint(n);
        lbox.classList.remove('is-swapping');
      }, 190);
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
