/* ═══════════════════════════════════════════════════════════
   main.js

   The page has one big idea: it begins at night and ends in
   daylight, because the story does. Everything below serves
   that — the palette engine interpolates the live CSS custom
   properties from scroll position, and the reveals are timed
   so the reader is never waiting on an animation to read.

   Motion is an enhancement. If GSAP never loads, if JS is off,
   or if the reader asked for reduced motion, the document
   still reads top to bottom.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root   = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.add('flat');

  /* ─────────────────────────────────────────────
     1. THE PALETTE ENGINE
     ───────────────────────────────────────────── */

  // Each act is a complete palette. Contrast was checked at every
  // stop: fg-on-bg never drops below 11:1, dim-on-bg never below 4.6:1.
  var ACTS = {
    night: { bg:[  5,  7, 12], fg:[237,239,245], dim:[133,143,166], acc:[110,127,243], rule:0.10, glow:0 },
    deep:  { bg:[  9, 10, 22], fg:[234,237,245], dim:[131,140,164], acc:[138,124,240], rule:0.11, glow:0 },
    dusk:  { bg: [ 20, 14, 26], fg:[240,234,238], dim:[150,136,156], acc:[199,110,140], rule:0.12, glow:0.15 },
    dawn:  { bg: [ 38, 20, 25], fg:[251,237,230], dim:[176,146,135], acc:[232,134, 60], rule:0.14, glow:0.35 },
    day:   { bg:[245,240,230], fg:[ 23, 19, 16], dim:[107, 97, 87], acc:[194, 90, 30], rule:0.13, glow:1, dark:true }
  };

  // Narrative stops. `at` is a fraction through the named section —
  // holding a palette until the silent break lets the colour flip
  // happen where there is no text to become unreadable.
  var STOPS = [
    { sel:'.hero',     at:0,    act:'night' },
    { sel:'.beat',     at:0,    act:'night' },
    { sel:'.crossing', at:0,    act:'deep'  },
    { sel:'.path',     at:0.15, act:'deep'  },
    { sel:'.work',     at:0.10, act:'dusk'  },
    { sel:'.moved',    at:0.10, act:'dawn'  },
    { sel:'.break',    at:0.10, act:'dawn'  },   // hold through the last dark beat
    { sel:'.break',    at:0.80, act:'day'   },   // …then turn, in silence
    { sel:'.toolkit',  at:0,    act:'day'   }
  ];

  var marks = [];
  function measure() {
    marks = [];
    STOPS.forEach(function (s) {
      var el = document.querySelector(s.sel);
      if (!el) return;
      var r = el.getBoundingClientRect();
      var top = r.top + window.scrollY;
      marks.push({ y: top + r.height * s.at, act: ACTS[s.act] });
    });
    marks.sort(function (a, b) { return a.y - b.y; });
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function mixRGB(a, b, t) {
    return 'rgb(' + Math.round(lerp(a[0],b[0],t)) + ',' +
                    Math.round(lerp(a[1],b[1],t)) + ',' +
                    Math.round(lerp(a[2],b[2],t)) + ')';
  }

  var dayProgress = 0;
  window.__day = function () { return dayProgress; };

  function paint() {
    if (!marks.length) return;
    // read the palette at the viewport's reading line, not its top
    var y = window.scrollY + window.innerHeight * 0.42;
    var a = marks[0], b = marks[marks.length - 1], t = 0;

    if (y <= marks[0].y)                      { a = b = marks[0]; t = 0; }
    else if (y >= marks[marks.length - 1].y)  { a = b = marks[marks.length - 1]; t = 0; }
    else {
      for (var i = 0; i < marks.length - 1; i++) {
        if (y >= marks[i].y && y <= marks[i + 1].y) {
          a = marks[i]; b = marks[i + 1];
          var span = b.y - a.y;
          t = span > 0 ? (y - a.y) / span : 0;
          // ease the handover so colour never appears to "step"
          t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          break;
        }
      }
    }

    var A = a.act, B = b.act;
    var s = root.style;
    s.setProperty('--bg',     mixRGB(A.bg,  B.bg,  t));
    s.setProperty('--fg',     mixRGB(A.fg,  B.fg,  t));
    s.setProperty('--dim',    mixRGB(A.dim, B.dim, t));
    s.setProperty('--accent', mixRGB(A.acc, B.acc, t));

    var ruleV = lerp(A.rule, B.rule, t);
    var darkInk = lerp(A.dark ? 1 : 0, B.dark ? 1 : 0, t) > 0.5;
    s.setProperty('--rule', (darkInk ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + ruleV.toFixed(3) + ')');

    dayProgress = lerp(A.glow, B.glow, t);
    s.setProperty('--glow', dayProgress.toFixed(3));

    // the browser chrome should follow the sky too
    if (themeMeta) themeMeta.setAttribute('content', mixRGB(A.bg, B.bg, t));
  }
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  /* ─────────────────────────────────────────────
     2. THE CLOCK — narrative time, not wall time
     ───────────────────────────────────────────── */
  var hudTime = document.getElementById('hudTime');
  function clock() {
    if (!hudTime) return;
    var start = 4 * 60 + 12;            // 04:12, before first light
    var end   = 7 * 60 + 45;            // 07:45, well into the morning
    var mins  = Math.round(lerp(start, end, dayProgress));
    hudTime.textContent =
      String(Math.floor(mins / 60)).padStart(2, '0') + ':' +
      String(mins % 60).padStart(2, '0');
  }

  /* ─────────────────────────────────────────────
     3. REVEALS
     ───────────────────────────────────────────── */
  function observe(sel, cls, threshold) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add(cls);
        io.unobserve(e.target);
      });
    }, { threshold: threshold || 0.2, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll(sel).forEach(function (el) { io.observe(el); });
  }

  observe('.m', 'in', 0.5);
  observe('.rise', 'in', 0.3);
  observe('.reveal', 'in', 0.16);
  observe('.arc', 'in', 0.35);

  // hero copy arrives immediately — nothing gates the first read
  requestAnimationFrame(function () {
    document.querySelectorAll('.hero .m, .hero .rise').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('in'); }, 80 + i * 110);
    });
  });

  /* ─────────────────────────────────────────────
     4. WORD-BY-WORD READING LIGHT
     ───────────────────────────────────────────── */
  var blocks = [];
  document.querySelectorAll('[data-words]').forEach(function (el) {
    var parts = el.textContent.trim().split(/(\s+)/);
    el.textContent = '';
    var frag = document.createDocumentFragment();
    parts.forEach(function (p) {
      if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
      var s = document.createElement('span');
      s.className = 'wd';
      s.textContent = p;
      frag.appendChild(s);
    });
    el.appendChild(frag);
    blocks.push({ el: el, words: el.querySelectorAll('.wd') });
  });

  function litText() {
    if (reduce) return;
    var vh = window.innerHeight;
    blocks.forEach(function (b) {
      var r = b.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      var p = (vh * 0.80 - r.top) / (r.height + vh * 0.24);
      p = Math.max(0, Math.min(1, p));
      var n = b.words.length, lit = p * n * 1.25;
      for (var i = 0; i < n; i++) {
        b.words[i].style.opacity = (0.13 + Math.max(0, Math.min(1, lit - i)) * 0.87).toFixed(3);
      }
    });
  }

  /* ─────────────────────────────────────────────
     5. COUNTERS
     ───────────────────────────────────────────── */
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      var el = e.target;
      var target = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var suf = el.getAttribute('data-suffix') || '';
      if (isNaN(target)) return;
      if (reduce) { el.textContent = target.toFixed(dec) + suf; return; }
      var t0 = null, dur = 1400;
      (function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(dec) + suf;
      })(performance.now());
    });
  }, { threshold: 0.65 });
  document.querySelectorAll('[data-count]').forEach(function (el) { countIO.observe(el); });

  /* ─────────────────────────────────────────────
     6. CHAPTER DOTS
     ───────────────────────────────────────────── */
  var dots = Array.prototype.slice.call(document.querySelectorAll('.dots a'));
  var targets = dots.map(function (d) {
    return document.querySelector(d.getAttribute('href') === '#top' ? 'body' : d.getAttribute('href'));
  });
  function marks_dots() {
    var mid = window.scrollY + window.innerHeight * 0.45;
    var active = 0;
    targets.forEach(function (el, i) {
      if (!el) return;
      var top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= mid) active = i;
    });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === active); });
  }

  /* ─────────────────────────────────────────────
     7. LOOP
     ───────────────────────────────────────────── */
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      paint(); clock(); litText(); marks_dots();
      queued = false;
    });
  }

  function onResize() { measure(); onScroll(); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  measure();
  onScroll();
  setTimeout(onResize, 400);
})();
