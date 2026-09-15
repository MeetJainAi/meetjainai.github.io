/* ═══════════════════════════════════════════════════════════
   map.js — the camera and the canvas.

   Drag to pan, wheel or pinch to zoom, click a node to open it.
   There is no page scroll anywhere on this site; the wheel is
   free, so it does the one thing it should do on a map.
   ═══════════════════════════════════════════════════════════ */
window.MAP = (function () {
  'use strict';

  var W = window.WORLD;
  var canvas, ctx, dpr = 1, VW = 0, VH = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cam  = { x: 120, y: 60, z: 0.46 };
  var want = { x: 120, y: 60, z: 0.46 };
  var Z_MIN = 0.22, Z_MAX = 1.9;

  var drag = null, hover = null, active = null, moved = 0;
  var onSelect = function () {};

  /* ── coordinate transforms ─────────────────────────────── */
  function toScreen(x, y) {
    return [(x - cam.x) * cam.z + VW / 2, (y - cam.y) * cam.z + VH / 2];
  }
  function toWorld(sx, sy) {
    return [(sx - VW / 2) / cam.z + cam.x, (sy - VH / 2) / cam.z + cam.y];
  }

  /* ── palette read from CSS so the map matches the page ── */
  function cssRGB(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var m = v.match(/\d+/g);
    return m ? m.slice(0, 3).join(',') : fallback;
  }
  var PAL = { acc:'99,132,255', acc2:'196,92,255', warm:'255,138,64', fg:'236,238,255', dim:'132,140,180' };
  function refreshPalette() {
    PAL.acc  = cssRGB('--acc',  PAL.acc);
    PAL.acc2 = cssRGB('--acc2', PAL.acc2);
    PAL.warm = cssRGB('--warm', PAL.warm);
    PAL.fg   = cssRGB('--fg',   PAL.fg);
    PAL.dim  = cssRGB('--dim',  PAL.dim);
  }

  function nodeColour(n) {
    if (n.kind === 'hub')     return PAL.warm;
    if (n.kind === 'stack')   return PAL.acc2;
    if (n.kind === 'contact') return PAL.warm;
    if (n.kind === 'cert')    return PAL.acc;
    if (n.kind === 'post')    return PAL.dim;
    return PAL.acc;
  }

  /* ── hit testing ───────────────────────────────────────── */
  function nodeAt(sx, sy) {
    var w = toWorld(sx, sy);
    var best = null, bestD = Infinity;
    for (var i = 0; i < W.nodes.length; i++) {
      var n = W.nodes[i];
      var dx = w[0] - n.x, dy = w[1] - n.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      // generous target: the ring, plus a margin that grows when zoomed out
      var hitR = n.r + 18 / Math.max(cam.z, 0.35);
      if (d < hitR && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  /* ── drawing ───────────────────────────────────────────── */
  function drawGrid() {
    var step = 110 * cam.z;
    if (step < 16) return;
    var ox = (VW / 2 - cam.x * cam.z) % step;
    var oy = (VH / 2 - cam.y * cam.z) % step;
    ctx.fillStyle = 'rgba(' + PAL.dim + ',' + (0.13 * Math.min(1, cam.z * 1.6)).toFixed(3) + ')';
    for (var x = ox; x < VW; x += step) {
      for (var y = oy; y < VH; y += step) {
        ctx.fillRect(x, y, 1.4, 1.4);
      }
    }
  }

  function drawRegion(rg) {
    var a = toScreen(rg.x - rg.w / 2, rg.y - rg.h / 2);
    var w = rg.w * cam.z, h = rg.h * cam.z;
    ctx.save();
    ctx.setLineDash([9, 9]);
    ctx.strokeStyle = 'rgba(' + PAL.dim + ',.3)';
    ctx.lineWidth = 1;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(a[0], a[1], w, h, 22 * cam.z); ctx.stroke(); }
    else ctx.strokeRect(a[0], a[1], w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(' + PAL.dim + ',.85)';
    ctx.font = (11 * Math.max(.8, Math.min(1.25, cam.z))).toFixed(1) + 'px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(rg.label.toUpperCase() + '   ' + rg.sub, a[0] + 16 * cam.z, a[1] + 26 * cam.z);
    ctx.restore();
  }

  function drawEdge(e, t) {
    var A = toScreen(e.a.x, e.a.y), B = toScreen(e.b.x, e.b.y);
    var lit = active && (active === e.a || active === e.b);
    var col = e.kind === 'migration' ? PAL.warm : PAL.acc;
    var base = e.kind === 'thin' ? 0.2 : 0.42;

    ctx.strokeStyle = 'rgba(' + col + ',' + (lit ? 0.95 : base) + ')';
    ctx.lineWidth = (e.kind === 'thin' ? 1 : 1.6) * Math.max(0.6, Math.min(1.6, cam.z));
    if (e.kind === 'migration') ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    // the migration wire carries its distance
    if (e.kind === 'migration' && cam.z > 0.3) {
      var mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(Math.atan2(B[1] - A[1], B[0] - A[0]));
      ctx.fillStyle = 'rgba(' + PAL.warm + ',.95)';
      ctx.font = (11 * Math.max(.85, Math.min(1.3, cam.z))).toFixed(1) + 'px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('12,164 km', 0, -12 * cam.z);
      ctx.restore();
    }

    // traffic
    if (!reduce && e.kind !== 'thin') {
      var p = ((t * 0.00013) + (e.a.x + e.b.y) * 0.0004) % 1;
      var px = A[0] + (B[0] - A[0]) * p, py = A[1] + (B[1] - A[1]) * p;
      ctx.fillStyle = 'rgba(' + col + ',' + (lit ? 1 : 0.8) + ')';
      ctx.beginPath();
      ctx.arc(px, py, 2.4 * Math.max(0.7, Math.min(1.5, cam.z)), 0, 6.283);
      ctx.fill();
    }
  }

  function drawNode(n, t) {
    var s = toScreen(n.x, n.y);
    var r = n.r * cam.z;
    if (s[0] < -240 || s[0] > VW + 240 || s[1] < -240 || s[1] > VH + 240) return;

    var col = nodeColour(n);
    var isHover = hover === n, isActive = active === n;
    var pulse = reduce ? 1 : 0.86 + Math.sin(t * 0.0016 + n.x * 0.01) * 0.14;
    var lift = isHover || isActive ? 1.12 : 1;

    // halo
    var g = ctx.createRadialGradient(s[0], s[1], r * 0.2, s[0], s[1], r * 2.6 * lift);
    g.addColorStop(0, 'rgba(' + col + ',' + (0.3 * pulse * (isActive ? 1.6 : 1)) + ')');
    g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s[0], s[1], r * 2.6 * lift, 0, 6.283); ctx.fill();

    // body
    ctx.fillStyle = 'rgba(8,8,22,.92)';
    ctx.beginPath(); ctx.arc(s[0], s[1], r * lift, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(' + col + ',' + (isHover || isActive ? 1 : 0.8) + ')';
    ctx.lineWidth = (n.kind === 'hub' ? 2.6 : 1.8) * Math.max(0.6, Math.min(1.5, cam.z));
    ctx.beginPath(); ctx.arc(s[0], s[1], r * lift, 0, 6.283); ctx.stroke();

    // inner mark tells you what kind of thing it is
    ctx.fillStyle = 'rgba(' + col + ',.95)';
    if (n.kind === 'stack') {
      var q = r * 0.34;
      ctx.fillRect(s[0] - q, s[1] - q, q * 2, q * 0.5);
      ctx.fillRect(s[0] - q, s[1] - q * 0.25, q * 2, q * 0.5);
      ctx.fillRect(s[0] - q, s[1] + q * 0.5, q * 2, q * 0.5);
    } else if (n.kind === 'cert') {
      ctx.beginPath(); ctx.arc(s[0], s[1], r * 0.3, 0, 6.283); ctx.fill();
    } else if (n.kind === 'hub' || n.kind === 'contact') {
      ctx.beginPath(); ctx.arc(s[0], s[1], r * 0.26, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(' + col + ',.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(s[0], s[1], r * 0.58, 0, 6.283); ctx.stroke();
    } else {
      ctx.fillRect(s[0] - r * 0.22, s[1] - r * 0.22, r * 0.44, r * 0.44);
    }

    // Labels by kind. The cert arc and the writing row sit close
    // together, so at overview zoom their names would overlap into
    // mush — they earn a label only once you are close enough to read.
    var minZ = (n.kind === 'cert' || n.kind === 'post') ? 0.62
             : (n.kind === 'edu') ? 0.4 : 0;
    if (cam.z > minZ || isHover || isActive) {
      var fade = minZ ? Math.min(1, (cam.z - minZ) * 6) : 1;
      if (isHover || isActive) fade = 1;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(' + PAL.fg + ',' + (0.96 * fade).toFixed(2) + ')';
      ctx.font = '600 ' + (13 * Math.max(0.92, Math.min(1.18, cam.z))).toFixed(1) +
                 'px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText(n.label, s[0], s[1] + r * lift + 24);
      ctx.fillStyle = 'rgba(' + PAL.dim + ',' + (0.9 * fade).toFixed(2) + ')';
      ctx.font = (10 * Math.max(0.9, Math.min(1.1, cam.z))).toFixed(1) + 'px "JetBrains Mono", monospace';
      ctx.fillText(n.sub, s[0], s[1] + r * lift + 41);
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, VW, VH);
    drawGrid();
    W.regions.forEach(drawRegion);
    W.edges.forEach(function (e) { drawEdge(e, t); });
    // hub and active last so they sit on top
    W.nodes.forEach(function (n) { if (n !== active) drawNode(n, t); });
    if (active) drawNode(active, t);
  }

  /* ── camera easing ─────────────────────────────────────── */
  function tick(t) {
    requestAnimationFrame(tick);
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
    // keep the point under the cursor fixed
    var zc = { x: cam.x, y: cam.y, z: want.z };
    var after = [(sx - VW / 2) / zc.z + zc.x, (sy - VH / 2) / zc.z + zc.y];
    want.x += before[0] - after[0];
    want.y += before[1] - after[1];
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
    function release(e) {
      if (drag && moved < 6) {
        var n = nodeAt(e.clientX, e.clientY);
        if (n) { active = n; onSelect(n); }
        else { active = null; onSelect(null); }
      }
      drag = null;
      canvas.classList.remove('grabbing');
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', function () { drag = null; canvas.classList.remove('grabbing'); });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      touched = true;
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    // pinch
    var pinch = null;
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinch = dist(e.touches);
        drag = null;
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        var d = dist(e.touches);
        var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        var my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomAt(mx, my, d / pinch);
        pinch = d;
      }
    }, { passive: false });
    canvas.addEventListener('touchend', function () { pinch = null; });
    function dist(t) {
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy) || 1;
    }
  }

  var touched = false;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    VW = canvas.clientWidth; VH = canvas.clientHeight;
    canvas.width = Math.floor(VW * dpr);
    canvas.height = Math.floor(VH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!touched && VW && VH) {
      var b = W.bounds;
      want.x = (b.x0 + b.x1) / 2; want.y = (b.y0 + b.y1) / 2;
      want.z = Math.max(Z_MIN, Math.min(Z_MAX, Math.min(VW / (b.x1 - b.x0), VH / (b.y1 - b.y0))));
    }
  }

  return {
    init: function (el, select) {
      canvas = el; ctx = canvas.getContext('2d');
      onSelect = select || function () {};
      resize(); bind();
      window.addEventListener('resize', resize, { passive: true });
      // open on a wide shot, then settle into a framed view of everything
      var b = W.bounds;
      var fit = Math.min(VW / (b.x1 - b.x0), VH / (b.y1 - b.y0));
      want.x = cam.x = (b.x0 + b.x1) / 2;
      want.y = cam.y = (b.y0 + b.y1) / 2;
      want.z = Math.max(Z_MIN, Math.min(Z_MAX, fit));
      cam.z = want.z * 0.55;
      requestAnimationFrame(tick);
    },
    flyTo: function (x, y, z) {
      want.x = x; want.y = y;
      if (z === 'fit') {
        var b = W.bounds;
        var fit = Math.min(VW / (b.x1 - b.x0), VH / (b.y1 - b.y0));
        want.z = Math.max(Z_MIN, Math.min(Z_MAX, fit));
      } else if (z) {
        want.z = z;
      }
    },
    fit: function () {
      var b = W.bounds;
      want.x = (b.x0 + b.x1) / 2; want.y = (b.y0 + b.y1) / 2;
      want.z = Math.max(Z_MIN, Math.min(Z_MAX, Math.min(VW / (b.x1 - b.x0), VH / (b.y1 - b.y0))));
    },
    select: function (n) { active = n; },
    zoomBy: function (f) { zoomAt(VW / 2, VH / 2, f); },
    get active() { return active; }
  };
})();
