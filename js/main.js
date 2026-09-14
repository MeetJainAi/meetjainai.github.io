/* ══════════════════════════════════════════════════════════════
   main.js — choreography.
   Boot sequence · splitting · scroll reveals · horizontal DAG
   · counters · magnetic cursor · rail telemetry
   Degrades gracefully: if GSAP fails to load, everything still
   renders and reads. Motion is an enhancement, never a gate.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root    = document.documentElement;
  var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var fine    = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  if (!hasGSAP || reduce) root.classList.add('no-motion');
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ────────────────────────────────────────────────
     1. TEXT SPLITTING
     ──────────────────────────────────────────────── */
  function splitChars(el) {
    var txt = el.textContent;
    el.textContent = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < txt.length; i++) {
      var s = document.createElement('span');
      s.className = 'char';
      s.textContent = txt[i] === ' ' ? ' ' : txt[i];
      s.style.transitionDelay = (i * 0.028) + 's';
      frag.appendChild(s);
    }
    el.appendChild(frag);
    return el.querySelectorAll('.char');
  }

  function splitWords(el) {
    var parts = el.textContent.split(/(\s+)/);
    el.textContent = '';
    var frag = document.createDocumentFragment();
    parts.forEach(function (p) {
      if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
      var s = document.createElement('span');
      s.className = 'wd';
      s.textContent = p;
      frag.appendChild(s);
    });
    el.appendChild(frag);
    return el.querySelectorAll('.wd');
  }

  // wrap section titles in an overflow-hidden line for the mask reveal
  document.querySelectorAll('[data-split-lines]').forEach(function (el) {
    var inner = document.createElement('span');
    inner.textContent = el.textContent;
    var ln = document.createElement('span');
    ln.className = 'ln';
    ln.appendChild(inner);
    el.textContent = '';
    el.appendChild(ln);
  });

  var heroChars = [];
  document.querySelectorAll('[data-split]').forEach(function (el) {
    heroChars.push(splitChars(el));
  });

  /* ────────────────────────────────────────────────
     2. COLD START — the boot sequence
     ──────────────────────────────────────────────── */
  var boot    = document.getElementById('boot');
  var bootLog = document.getElementById('bootLog');
  var bootFill= document.getElementById('bootFill');
  var bootPct = document.getElementById('bootPct');

  var LINES = [
    'resolving identity ............ meet-shah',
    'selecting region .............. ca-central-1 <b>ok</b>',
    'allocating memory ............. 3008 MB',
    'mounting layers ............... aws · terraform · airflow',
    'warming execution context ..... <b>ready</b>',
    'invoking control-plane ........ <b>200</b>'
  ];

  function startBoot() {
    if (!boot) { finishBoot(); return; }
    var i = 0, pct = 0;
    var safety = setTimeout(finishBoot, 5200); // never trap the user

    function nextLine() {
      if (i < LINES.length) {
        bootLog.innerHTML += (i ? '\n' : '') + '▸ ' + LINES[i];
        i++;
        setTimeout(nextLine, 220 + Math.random() * 130);
      }
    }
    nextLine();

    var tick = setInterval(function () {
      pct += Math.random() * 11 + 4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(tick);
        clearTimeout(safety);
        setTimeout(finishBoot, 420);
      }
      bootFill.style.width = pct + '%';
      bootPct.textContent = String(Math.floor(pct)).padStart(2, '0');
    }, 150);
  }

  var booted = false;
  function finishBoot() {
    if (booted) return;
    booted = true;
    if (boot) boot.classList.add('is-done');
    root.classList.remove('is-loading');
    setTimeout(function () { if (boot) boot.remove(); }, 800);
    revealHero();
  }

  function revealHero() {
    // characters rise out of their mask
    heroChars.forEach(function (set) {
      set.forEach(function (c) {
        c.style.transform = 'translateY(110%) rotate(6deg)';
        c.style.opacity = '0';
      });
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        heroChars.forEach(function (set) {
          set.forEach(function (c) {
            c.style.transition = 'transform 1.05s cubic-bezier(.22,1,.36,1) ' + c.style.transitionDelay +
                                 ', opacity .7s ease ' + c.style.transitionDelay;
            c.style.transform = 'translateY(0) rotate(0deg)';
            c.style.opacity = '1';
          });
        });
      });
    });

    document.querySelectorAll('.hero .reveal').forEach(function (el, idx) {
      setTimeout(function () { el.classList.add('is-in'); }, 420 + idx * 110);
    });
  }

  if (reduce) { finishBoot(); } else { startBoot(); }

  /* ────────────────────────────────────────────────
     3. SCROLL REVEALS (IntersectionObserver — always on)
     ──────────────────────────────────────────────── */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.reveal:not(.hero .reveal)').forEach(function (el) { io.observe(el); });

  // section-title mask reveal
  var titleIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var inner = e.target.querySelector('span');
      if (inner) {
        inner.style.transform = 'translateY(0)';
        inner.style.opacity = '1';
      }
      titleIO.unobserve(e.target);
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('.sec__title .ln').forEach(function (ln) {
    var inner = ln.querySelector('span');
    if (inner && !root.classList.contains('no-motion')) {
      inner.style.transform = 'translateY(105%)';
      inner.style.opacity = '0';
      inner.style.transition = 'transform 1.1s cubic-bezier(.22,1,.36,1), opacity .8s ease';
    }
    titleIO.observe(ln);
  });

  /* ────────────────────────────────────────────────
     4. WORD-BY-WORD SCROLL TEXT
     ──────────────────────────────────────────────── */
  var wordBlocks = [];
  document.querySelectorAll('[data-words]').forEach(function (el) {
    wordBlocks.push({ el: el, words: splitWords(el) });
  });

  function paintWords() {
    var vh = window.innerHeight;
    wordBlocks.forEach(function (b) {
      var r = b.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      // progress: starts when the block is 82% down the viewport, ends at 35%
      var p = (vh * 0.82 - r.top) / (r.height + vh * 0.30);
      p = Math.max(0, Math.min(1, p));
      var n = b.words.length;
      var lit = p * n * 1.18;
      for (var i = 0; i < n; i++) {
        var o = Math.max(0, Math.min(1, lit - i));
        b.words[i].style.opacity = (0.14 + o * 0.86).toFixed(3);
      }
    });
  }

  /* ────────────────────────────────────────────────
     5. HORIZONTAL DAG
     ──────────────────────────────────────────────── */
  var dag      = document.getElementById('orchestrate');
  var dagTrack = document.getElementById('dagTrack');

  if (dag && dagTrack && hasGSAP && !reduce && typeof gsap.matchMedia === 'function') {
    var mm = gsap.matchMedia();

    // Horizontal traversal only where there is room for it.
    // Below 900px the same graph reads better as a vertical stack (CSS handles that).
    mm.add('(min-width: 901px)', function () {
      var getShift = function () {
        var pad = parseFloat(getComputedStyle(dagTrack).paddingLeft) || 40;
        return Math.max(0, dagTrack.scrollWidth - window.innerWidth + pad);
      };

      var dagTween = gsap.to(dagTrack, {
        x: function () { return -getShift(); },
        ease: 'none',
        scrollTrigger: {
          trigger: dag,
          start: 'top top',
          end: function () { return '+=' + (getShift() + window.innerHeight * 0.35); },
          scrub: 0.7,
          pin: dag.querySelector('.dag__pin'),
          pinSpacing: true,
          invalidateOnRefresh: true,
          anticipatePin: 1
        }
      });

      // each card wakes as it crosses the centre, and dims on the way out
      gsap.utils.toArray('.node__card').forEach(function (card) {
        gsap.fromTo(card,
          { opacity: 0.3, scale: 0.94, filter: 'blur(2px)' },
          {
            opacity: 1, scale: 1, filter: 'blur(0px)', ease: 'none',
            scrollTrigger: {
              trigger: card, containerAnimation: dagTween,
              start: 'left 95%', end: 'left 45%', scrub: true
            }
          }
        );
        gsap.to(card, {
          opacity: 0.3, scale: 0.94, filter: 'blur(2px)', ease: 'none',
          scrollTrigger: {
            trigger: card, containerAnimation: dagTween,
            start: 'right 32%', end: 'right -8%', scrub: true
          }
        });
      });

      // cleanup when the media query stops matching
      return function () {
        gsap.set(dagTrack, { clearProps: 'transform' });
        gsap.set('.node__card', { clearProps: 'opacity,transform,filter' });
      };
    });
  }

  /* ────────────────────────────────────────────────
     6. COUNTERS
     ──────────────────────────────────────────────── */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec    = parseInt(el.getAttribute('data-dec') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (isNaN(target)) return;
    if (target === 0) { el.textContent = 'zero' + suffix; return; }

    var dur = 1500, t0 = null;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3.2);
      el.textContent = (target * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toFixed(dec) + suffix;
    }
    requestAnimationFrame(frame);
  }

  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      animateCount(e.target);
      countIO.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { countIO.observe(el); });

  /* ────────────────────────────────────────────────
     6b. SPARKLINES — a real trend, not a texture
     ──────────────────────────────────────────────── */
  (function sparklines() {
    var NS = 'http://www.w3.org/2000/svg';
    document.querySelectorAll('.metric').forEach(function (m, idx) {
      var host = m.querySelector('.metric__spark');
      var dirEl = m.querySelector('.metric__dir');
      if (!host) return;
      var down = dirEl && dirEl.textContent.indexOf('↓') > -1;

      // deterministic pseudo-noise so every reload draws the same chart
      var seed = idx * 977 + 13;
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x7fffffff); }

      var N = 26, W = 200, H = 34, pts = [];
      for (var i = 0; i < N; i++) {
        var t = i / (N - 1);
        // a clear trend plus noise, easing toward the end state
        var trend = down ? (1 - Math.pow(t, 1.5)) : Math.pow(t, 1.5);
        var v = trend * 0.78 + (rnd() - 0.5) * 0.26;
        v = Math.max(0.04, Math.min(0.96, v));
        pts.push([t * W, H - v * H]);
      }

      var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
      var area = d + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';

      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');

      if (!document.getElementById('sparkGrad')) {
        var defs = document.createElementNS(NS, 'defs');
        var g = document.createElementNS(NS, 'linearGradient');
        g.setAttribute('id', 'sparkGrad');
        g.setAttribute('x1', '0'); g.setAttribute('y1', '0');
        g.setAttribute('x2', '0'); g.setAttribute('y2', '1');
        [['0%', '.55'], ['100%', '0']].forEach(function (st) {
          var s2 = document.createElementNS(NS, 'stop');
          s2.setAttribute('offset', st[0]);
          s2.setAttribute('stop-color', '#FFB020');
          s2.setAttribute('stop-opacity', st[1]);
          g.appendChild(s2);
        });
        defs.appendChild(g);
        svg.appendChild(defs);
      }

      var fill = document.createElementNS(NS, 'path');
      fill.setAttribute('class', 'fillArea');
      fill.setAttribute('d', area);
      svg.appendChild(fill);

      var line = document.createElementNS(NS, 'path');
      line.setAttribute('d', d);
      svg.appendChild(line);
      host.appendChild(svg);

      try {
        var len = line.getTotalLength();
        line.style.setProperty('--len', len);
      } catch (err) { line.style.setProperty('--len', '400'); }
    });
  })();

  /* ────────────────────────────────────────────────
     7. ROTATING ROLE
     ──────────────────────────────────────────────── */
  var rot = document.getElementById('roleRot');
  if (rot && !reduce) {
    var items = rot.querySelectorAll('b');
    var ri = 0;
    setInterval(function () {
      ri = (ri + 1) % items.length;
      var offset = -ri * 1.35;
      items.forEach(function (b) { b.style.transform = 'translateY(' + offset + 'em)'; });
    }, 2400);
  }

  /* ────────────────────────────────────────────────
     8. CURSOR + MAGNETIC BUTTONS
     ──────────────────────────────────────────────── */
  var cursor = document.getElementById('cursor');
  if (cursor && fine && !reduce) {
    var dot   = cursor.querySelector('.cursor__dot');
    var ring  = cursor.querySelector('.cursor__ring');
    var label = cursor.querySelector('.cursor__label');
    var cx = 0, cy = 0, rx = 0, ry = 0;

    window.addEventListener('pointermove', function (e) {
      if (!cursor.classList.contains('is-awake')) {
        cx = rx = e.clientX; cy = ry = e.clientY;
        cursor.classList.add('is-awake');
      }
      cx = e.clientX; cy = e.clientY;
      dot.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
    }, { passive: true });

    (function ringLoop() {
      requestAnimationFrame(ringLoop);
      rx += (cx - rx) * 0.16;
      ry += (cy - ry) * 0.16;
      ring.style.transform  = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      label.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
    })();

    document.querySelectorAll('a,button,.mod,.cert,.node__card').forEach(function (el) {
      el.addEventListener('pointerenter', function () {
        cursor.classList.add('is-hot');
        label.textContent = el.getAttribute('data-cursor') || '';
      });
      el.addEventListener('pointerleave', function () {
        cursor.classList.remove('is-hot');
        label.textContent = '';
      });
    });
  }

  // magnetic pull
  if (fine && !reduce) {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + mx * 0.22 + 'px,' + my * 0.30 + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 560);
      });
    });
  }

  /* ────────────────────────────────────────────────
     9. SPOTLIGHT ON STACK MODULES + CERT TILT
     ──────────────────────────────────────────────── */
  document.querySelectorAll('.mod').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  if (fine && !reduce) {
    document.querySelectorAll('.tilt').forEach(function (el) {
      var inner = el.querySelector('.cert__in') || el;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        inner.style.transform = 'rotateY(' + (px * 13) + 'deg) rotateX(' + (-py * 13) + 'deg) translateZ(12px)';
      });
      el.addEventListener('pointerleave', function () { inner.style.transform = ''; });
    });
  }

  /* ────────────────────────────────────────────────
     10. RAIL TELEMETRY + NAV STATE
     ──────────────────────────────────────────────── */
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-section]'));
  var railTicks = document.getElementById('railTicks');
  var railFill  = document.getElementById('railFill');
  var railName  = document.getElementById('railName');
  var nav       = document.getElementById('nav');
  var navLinks  = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'));

  if (railTicks) {
    sections.forEach(function () { railTicks.appendChild(document.createElement('li')); });
  }
  var tickEls = railTicks ? Array.prototype.slice.call(railTicks.children) : [];

  var lastY = 0;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.body.scrollHeight - window.innerHeight;
    var p = max > 0 ? y / max : 0;

    if (railFill) railFill.style.height = (p * 100) + '%';
    if (nav) {
      nav.classList.toggle('is-stuck', y > 80);
      nav.classList.toggle('is-hidden', y > lastY && y > 400 && !nav.matches(':hover'));
    }
    lastY = y;

    // which section owns the viewport centre
    var mid = y + window.innerHeight * 0.4;
    var active = 0;
    sections.forEach(function (s, i) {
      if (s.offsetTop <= mid) active = i;
    });
    tickEls.forEach(function (t, i) { t.classList.toggle('is-on', i === active); });
    if (railName) railName.textContent = sections[active].getAttribute('data-name') || '';

    var id = sections[active].getAttribute('id');
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
    });

    paintWords();
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ────────────────────────────────────────────────
     10b. MOBILE MENU
     ──────────────────────────────────────────────── */
  var burger = document.getElementById('burger');
  var menu   = document.getElementById('menu');
  if (burger && menu) {
    var closeMenu = function () {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      menu.classList.remove('is-open');
      root.classList.remove('is-locked');
      setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 400);
    };
    var openMenu = function () {
      menu.hidden = false;
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
      root.classList.add('is-locked');
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
    };
    burger.addEventListener('click', function () {
      if (burger.getAttribute('aria-expanded') === 'true') closeMenu(); else openMenu();
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') closeMenu();
    });
  }

  /* ────────────────────────────────────────────────
     11. LIVE CLOCK (Toronto)
     ──────────────────────────────────────────────── */
  var clock = document.getElementById('clock');
  if (clock) {
    (function tickClock() {
      try {
        var t = new Date().toLocaleTimeString('en-CA', {
          timeZone: 'America/Toronto', hour12: false,
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        clock.textContent = t + ' toronto';
      } catch (err) { clock.textContent = 'toronto, on'; }
      setTimeout(tickClock, 1000);
    })();
  }

  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ────────────────────────────────────────────────
     12. TITLE MOOD
     ──────────────────────────────────────────────── */
  var realTitle = document.title;
  document.addEventListener('visibilitychange', function () {
    document.title = document.hidden ? '◦ still running…' : realTitle;
  });

  // first paint
  onScroll();
  if (hasGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 600);
})();
