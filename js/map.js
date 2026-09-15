/* ═══════════════════════════════════════════════════════════
   map.js — the camera and the canvas.

   Drag to pan, wheel or pinch to zoom, click a node to open it.
   There is no page scroll anywhere on this site, so the wheel is
   free to do the one thing it should do on a map.

   Depth comes from three parallax star layers and a few soft
   nebulae well behind the graph. Edges bow rather than run
   straight — a straight diagonal reads as a generic force graph,
   a bowed one reads as a drawn diagram. Hovering a node focuses
   its neighbourhood and dims everything else, which is the whole
   point of showing a graph rather than a list.
   ═══════════════════════════════════════════════════════════ */
window.MAP = (function () {
  'use strict';

  var W = window.WORLD;
  var canvas, ctx, dpr = 1, VW = 0, VH = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cam  = { x: 0, y: 0, z: 0.4 };
  var want = { x: 0, y: 0, z: 0.4 };
  var Z_MIN = 0.22, Z_MAX = 2.0;

  var drag = null, hover = null, active = null, moved = 0, touched = false;
  var onSelect = function () {};

  /* ── entrance ──────────────────────────────────────────── */
  var born = 0, intro = 0;           // 0 → 1 across the opening beat
  var ORDER = ['parul','mobiuso','lambton','intern','engineer',
               'etl','tf','finops','c1','c2','c3','c4','c5','w1','w2','w3','contact'];
  var appearAt = {};
  ORDER.forEach(function (id, i) { appearAt[id] = 0.08 + (i / ORDER.length) * 0.62; });

  /* ── depth: stars and nebulae live in world space ──────── */
  var STAR_LAYERS = [], NEBULA = [];
  (function seedDepth() {
    var seed = 20260915;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    var b = W.bounds, pad = 1400;
    [[0.18, 150, 1.0], [0.36, 110, 1.4], [0.62, 70, 1.9]].forEach(function (L) {
      var arr = [];
      for (var i = 0; i < L[1]; i++) {
        arr.push({
          x: b.x0 - pad + rnd() * (b.x1 - b.x0 + pad * 2),
          y: b.y0 - pad + rnd() * (b.y1 - b.y0 + pad * 2),
          r: 0.5 + rnd() * L[2], a: 0.22 + rnd() * 0.55, ph: rnd() * 6.283
        });
      }
      STAR_LAYERS.push({ p: L[0], stars: arr });
    });
    NEBULA = [
      { x:-1150, y: 260, r:1100, c:'99,132,255',  a:0.1 },
      { x:  700, y: 120, r:1300, c:'255,138,64',  a:0.09 },
      { x: 1250, y: 470, r: 900, c:'196,92,255',  a:0.1 },
      { x: -200, y:-560, r: 800, c:'99,132,255',  a:0.06 }
    ];
  })();

  /* ── transforms ────────────────────────────────────────── */
  function toScreen(x, y) { return [(x - cam.x) * cam.z + VW / 2, (y - cam.y) * cam.z + VH / 2]; }
  function toWorld(sx, sy) { return [(sx - VW / 2) / cam.z + cam.x, (sy - VH / 2) / cam.z + cam.y]; }

  /* ── palette ───────────────────────────────────────────── */
  var PAL = { acc:'99,132,255', acc2:'196,92,255', warm:'255,138,64', fg:'236,238,255', dim:'132,140,180' };
  function refreshPalette() {
    var cs = getComputedStyle(document.documentElement);
    ['acc','acc2','warm','fg','dim'].forEach(function (k) {
      var m = cs.getPropertyValue('--' + k).trim().match(/\d+/g);
      if (m) PAL[k] = m.slice(0, 3).join(',');
    });
  }
  function nodeColour(n) {
    if (n.kind === 'hub' || n.kind === 'contact') return PAL.warm;
    if (n.kind === 'stack') return PAL.acc2;
    if (n.kind === 'post')  return PAL.dim;
    return PAL.acc;
  }

  /* ── focus: which nodes are lit right now ──────────────── */
  var neighbours = {};
  (function buildAdjacency() {
    W.edges.forEach(function (e) {
      (neighbours[e.a.id] = neighbours[e.a.id] || {})[e.b.id] = 1;
      (neighbours[e.b.id] = neighbours[e.b.id] || {})[e.a.id] = 1;
    });
  })();
  function focusNode() { return active || hover; }
  function litNode(n) {
    var f = focusNode();
    if (!f) return 1;
    if (n === f) return 1;
    return neighbours[f.id] && neighbours[f.id][n.id] ? 0.92 : 0.22;
  }
  function litEdge(e) {
    var f = focusNode();
    if (!f) return 1;
    return (e.a === f || e.b === f) ? 1 : 0.14;
  }

  /* ── bowed edges ───────────────────────────────────────── */
  function control(e) {
    var ax = e.a.x, ay = e.a.y, bx = e.b.x, by = e.b.y;
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var k = e.kind === 'migration' ? 0.1 : 0.14;
    return [(ax + bx) / 2 - dy * k, (ay + by) / 2 + dx * k];
  }
  function bez(e, c, t) {
    var u = 1 - t;
    return [u * u * e.a.x + 2 * u * t * c[0] + t * t * e.b.x,
            u * u * e.a.y + 2 * u * t * c[1] + t * t * e.b.y];
  }

  /* ── hit testing ───────────────────────────────────────── */
  function nodeAt(sx, sy) {
    var w = toWorld(sx, sy), best = null, bestD = Infinity;
    for (var i = 0; i < W.nodes.length; i++) {
      var n = W.nodes[i];
      var d = Math.hypot(w[0] - n.x, w[1] - n.y);
      var hitR = n.r + 18 / Math.max(cam.z, 0.35);
      if (d < hitR && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  /* ── drawing ───────────────────────────────────────────── */
  function drawDepth(t) {
    NEBULA.forEach(function (nb) {
      var s = [(nb.x - cam.x * 0.3) * cam.z + VW / 2, (nb.y - cam.y * 0.3) * cam.z + VH / 2];
      var r = nb.r * cam.z;
      if (s[0] < -r || s[0] > VW + r || s[1] < -r || s[1] > VH + r) return;
      var g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], r);
      g.addColorStop(0, 'rgba(' + nb.c + ',' + (nb.a * intro).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + nb.c + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(s[0] - r, s[1] - r, r * 2, r * 2);
    });

    STAR_LAYERS.forEach(function (L) {
      for (var i = 0; i < L.stars.length; i++) {
        var st = L.stars[i];
        var sx = (st.x - cam.x * L.p) * cam.z + VW / 2;
        var sy = (st.y - cam.y * L.p) * cam.z + VH / 2;
        if (sx < -20 || sx > VW + 20 || sy < -20 || sy > VH + 20) continue;
        var tw = reduce ? 1 : 0.68 + Math.sin(t * 0.0009 + st.ph) * 0.32;
        ctx.fillStyle = 'rgba(214,222,255,' + (st.a * tw * intro * 0.9).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(sx, sy, st.r * Math.max(0.6, cam.z), 0, 6.283); ctx.fill();
      }
    });
  }

  function drawRegion(rg) {
    var a = toScreen(rg.x - rg.w / 2, rg.y - rg.h / 2);
    var w = rg.w * cam.z, h = rg.h * cam.z;
    var f = focusNode();
    var dim = f ? 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = intro * dim;
    ctx.setLineDash([9, 9]);
    ctx.strokeStyle = 'rgba(' + PAL.dim + ',.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(a[0], a[1], w, h, 22 * cam.z); else ctx.rect(a[0], a[1], w, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(' + PAL.dim + ',.9)';
    ctx.font = (11 * Math.max(.8, Math.min(1.25, cam.z))).toFixed(1) + 'px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(rg.label.toUpperCase() + '   ' + rg.sub, a[0] + 16 * cam.z, a[1] + 26 * cam.z);
    ctx.restore();
  }

  function drawEdge(e, t) {
    // an edge only exists once both its ends have arrived
    var ready = Math.min(1, Math.max(0,
      (intro - Math.max(appearAt[e.a.id] || 0, appearAt[e.b.id] || 0) - 0.06) * 5));
    if (ready <= 0) return;

    var c = control(e);
    var A = toScreen(e.a.x, e.a.y), C = toScreen(c[0], c[1]), B = toScreen(e.b.x, e.b.y);
    var lit = litEdge(e);
    var col = e.kind === 'migration' ? PAL.warm : PAL.acc;
    var base = e.kind === 'thin' ? 0.22 : 0.46;

    ctx.save();
    ctx.globalAlpha = ready * lit;

    // the migration wire glows — it is the most important line here
    if (e.kind === 'migration') {
      ctx.strokeStyle = 'rgba(' + col + ',.18)';
      ctx.lineWidth = 7 * Math.max(0.6, Math.min(1.6, cam.z));
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(C[0], C[1], B[0], B[1]); ctx.stroke();
      ctx.setLineDash([11, 9]);
      ctx.lineDashOffset = reduce ? 0 : -t * 0.02;
    }

    ctx.strokeStyle = 'rgba(' + col + ',' + (lit >= 1 ? base + 0.3 : base) + ')';
    ctx.lineWidth = (e.kind === 'thin' ? 1 : 1.7) * Math.max(0.6, Math.min(1.7, cam.z));
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.quadraticCurveTo(C[0], C[1], B[0], B[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (e.kind === 'migration' && cam.z > 0.28) {
      var m = bez(e, c, 0.5), ms = toScreen(m[0], m[1]);
      var ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      ctx.save();
      ctx.translate(ms[0], ms[1]); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(' + PAL.warm + ',.98)';
      ctx.font = '600 ' + (11.5 * Math.max(.85, Math.min(1.3, cam.z))).toFixed(1) + 'px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('12,164 km', 0, -13 * cam.z);
      ctx.restore();
    }

    // traffic rides the curve
    if (!reduce && e.kind !== 'thin') {
      var n = e.kind === 'migration' ? 3 : 1;
      for (var i = 0; i < n; i++) {
        var p = ((t * 0.00011) + (e.a.x + e.b.y) * 0.0004 + i / n) % 1;
        var q = bez(e, c, p), qs = toScreen(q[0], q[1]);
        ctx.fillStyle = 'rgba(' + col + ',' + (lit >= 1 ? 1 : 0.75) + ')';
        ctx.beginPath();
        ctx.arc(qs[0], qs[1], 2.5 * Math.max(0.7, Math.min(1.5, cam.z)), 0, 6.283);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawNode(n, t) {
    var born_ = Math.min(1, Math.max(0, (intro - (appearAt[n.id] || 0)) * 3.4));
    if (born_ <= 0) return;
    var ease = 1 - Math.pow(1 - born_, 3);

    var s = toScreen(n.x, n.y);
    var r = n.r * cam.z * (0.6 + 0.4 * ease);
    if (s[0] < -260 || s[0] > VW + 260 || s[1] < -260 || s[1] > VH + 260) return;

    var col = nodeColour(n);
    var isHover = hover === n, isActive = active === n;
    var lit = litNode(n);
    var pulse = reduce ? 1 : 0.86 + Math.sin(t * 0.0016 + n.x * 0.01) * 0.14;
    var lift = isHover || isActive ? 1.14 : 1;

    ctx.save();
    ctx.globalAlpha = ease * lit;

    // halo
    var g = ctx.createRadialGradient(s[0], s[1], r * 0.2, s[0], s[1], r * 2.8 * lift);
    g.addColorStop(0, 'rgba(' + col + ',' + (0.32 * pulse * (isActive ? 1.7 : 1)).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s[0], s[1], r * 2.8 * lift, 0, 6.283); ctx.fill();

    // body
    ctx.fillStyle = 'rgba(6,7,20,.94)';
    ctx.beginPath(); ctx.arc(s[0], s[1], r * lift, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(' + col + ',' + (isHover || isActive ? 1 : 0.82) + ')';
    ctx.lineWidth = (n.kind === 'hub' ? 2.8 : 1.9) * Math.max(0.6, Math.min(1.5, cam.z));
    ctx.beginPath(); ctx.arc(s[0], s[1], r * lift, 0, 6.283); ctx.stroke();

    // a slow orbit ring, drawn only where it reads
    if ((n.kind === 'hub' || n.kind === 'contact' || isActive) && cam.z > 0.3) {
      ctx.save();
      ctx.translate(s[0], s[1]);
      ctx.rotate(reduce ? 0 : t * 0.00022 * (n.kind === 'hub' ? 1 : -1));
      ctx.strokeStyle = 'rgba(' + col + ',.42)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5 * cam.z, 8 * cam.z]);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.62 * lift, 0, 6.283); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // kind mark
    ctx.fillStyle = 'rgba(' + col + ',.95)';
    if (n.kind === 'stack') {
      var q2 = r * 0.34;
      for (var i = 0; i < 3; i++) ctx.fillRect(s[0] - q2, s[1] - q2 + i * q2 * 0.75, q2 * 2, q2 * 0.46);
    } else if (n.kind === 'cert') {
      ctx.beginPath(); ctx.arc(s[0], s[1], r * 0.3, 0, 6.283); ctx.fill();
    } else if (n.kind === 'hub' || n.kind === 'contact') {
      ctx.beginPath(); ctx.arc(s[0], s[1], r * 0.27, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(' + col + ',.5)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(s[0], s[1], r * 0.58, 0, 6.283); ctx.stroke();
    } else {
      ctx.fillRect(s[0] - r * 0.22, s[1] - r * 0.22, r * 0.44, r * 0.44);
    }

    // labels, gated by kind so dense clusters stay legible when far out
    var minZ = (n.kind === 'cert' || n.kind === 'post') ? 0.62 : (n.kind === 'edu') ? 0.4 : 0;
    if (cam.z > minZ || isHover || isActive) {
      var fade = minZ ? Math.min(1, (cam.z - minZ) * 6) : 1;
      if (isHover || isActive) fade = 1;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(' + PAL.fg + ',' + (0.97 * fade).toFixed(2) + ')';
      ctx.font = '600 ' + (13 * Math.max(0.92, Math.min(1.18, cam.z))).toFixed(1) +
                 'px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText(n.label, s[0], s[1] + r * lift + 24);
      ctx.fillStyle = 'rgba(' + PAL.dim + ',' + (0.92 * fade).toFixed(2) + ')';
      ctx.font = (10 * Math.max(0.9, Math.min(1.1, cam.z))).toFixed(1) + 'px "JetBrains Mono", monospace';
      ctx.fillText(n.sub, s[0], s[1] + r * lift + 41);
    }
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(0, 0, VW, VH);
    drawDepth(t);
    W.regions.forEach(drawRegion);
    W.edges.forEach(function (e) { drawEdge(e, t); });
    W.nodes.forEach(function (n) { if (n !== active && n !== hover) drawNode(n, t); });
    if (hover && hover !== active) drawNode(hover, t);
    if (active) drawNode(active, t);
  }

  function tick(t) {
    requestAnimationFrame(tick);
    if (!born) born = t;
    var el = (t - born) / (reduce ? 1 : 2100);
    intro = Math.min(1, Math.max(0, el));
    cam.x += (want.x - cam.x) * 0.12;
    cam.y += (want.y - cam.y) * 0.12;
    cam.z += (want.z - cam.z) * 0.12;
    refreshPalette();
    draw(t);
  }

  /* ── input ─────────────────────────────────────────────── */
  function zoomAt(sx, sy, factor) {
    var before = toWorld(sx, sy);
    want.z = Math.max(Z_MIN, Math.min(Z_MAX, want.z * factor));
    var after = [(sx - VW / 2) / want.z + cam.x, (sy - VH / 2) / want.z + cam.y];
    want.x += before[0] - after[0];
    want.y += before[1] - after[1];
  }

  function fitTo() {
    var b = W.bounds;
    want.x = (b.x0 + b.x1) / 2; want.y = (b.y0 + b.y1) / 2;
    want.z = Math.max(Z_MIN, Math.min(Z_MAX, Math.min(VW / (b.x1 - b.x0), VH / (b.y1 - b.y0))));
  }

  function bind() {
    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      touched = true;
      drag = { x: e.clientX, y: e.clientY, cx: want.x, cy: want.y };
      moved = 0;
      canvas.classList.add('grabbing');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (drag) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        want.x = drag.cx - dx / cam.z;
        want.y = drag.cy - dy / cam.z;
      } else {
        var h = nodeAt(e.clientX, e.clientY);
        if (h !== hover) { hover = h; canvas.style.cursor = h ? 'pointer' : 'grab'; }
      }
    });
    canvas.addEventListener('pointerup', function (e) {
      if (drag && moved < 6) {
        var n = nodeAt(e.clientX, e.clientY);
        active = n || null;
        onSelect(n || null);
      }
      drag = null; canvas.classList.remove('grabbing');
    });
    canvas.addEventListener('pointercancel', function () { drag = null; canvas.classList.remove('grabbing'); });
    canvas.addEventListener('pointerleave', function () { hover = null; });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault(); touched = true;
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    var pinch = null;
    function dist(tt) { return Math.hypot(tt[0].clientX - tt[1].clientX, tt[0].clientY - tt[1].clientY) || 1; }
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) { pinch = dist(e.touches); drag = null; touched = true; }
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        var d = dist(e.touches);
        zoomAt((e.touches[0].clientX + e.touches[1].clientX) / 2,
               (e.touches[0].clientY + e.touches[1].clientY) / 2, d / pinch);
        pinch = d;
      }
    }, { passive: false });
    canvas.addEventListener('touchend', function () { pinch = null; });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    VW = canvas.clientWidth; VH = canvas.clientHeight;
    canvas.width = Math.floor(VW * dpr);
    canvas.height = Math.floor(VH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!touched && VW && VH) fitTo();
  }

  return {
    init: function (el, select) {
      canvas = el; ctx = canvas.getContext('2d');
      onSelect = select || function () {};
      resize(); bind();
      window.addEventListener('resize', resize, { passive: true });
      fitTo();
      // the camera pulls back into frame while the graph draws itself in
      cam.x = want.x; cam.y = want.y; cam.z = want.z * 0.62;
      requestAnimationFrame(tick);
    },
    flyTo: function (x, y, z) {
      touched = true;
      want.x = x; want.y = y;
      if (z === 'fit') fitTo(); else if (z) want.z = z;
    },
    fit: function () { touched = true; fitTo(); },
    select: function (n) { active = n; },
    zoomBy: function (f) { touched = true; zoomAt(VW / 2, VH / 2, f); },
    get active() { return active; }
  };
})();
