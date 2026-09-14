/* ══════════════════════════════════════════════════════════════
   network.js — the living topology behind the hero.
   Nodes = services. Edges = dependencies. Packets = data in flight.
   Pure canvas 2D, no dependencies.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('netCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var AMBER  = '255,176,32';
  var CYAN   = '34,211,238';
  var VIOLET = '167,139,250';
  var PALETTE = [AMBER, CYAN, VIOLET];

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var nodes = [], edges = [], packets = [];
  var pointer = { x: -9999, y: -9999, has: false };

  function count() {
    var a = (window.innerWidth * window.innerHeight) / 20000;
    return Math.max(26, Math.min(80, Math.round(a)));
  }

  function build() {
    nodes = []; edges = []; packets = [];
    var n = count();
    for (var i = 0; i < n; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() < 0.16 ? 2.6 : 1.35,
        hub: Math.random() < 0.16,
        c: PALETTE[(Math.random() * PALETTE.length) | 0],
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  var LINK = 165;

  function spawnPacket() {
    if (!edges.length || packets.length > 26) return;
    var e = edges[(Math.random() * edges.length) | 0];
    packets.push({ a: e.a, b: e.b, t: 0, sp: 0.006 + Math.random() * 0.011, c: e.a.c });
  }

  function step(now) {
    ctx.clearRect(0, 0, W, H);
    edges.length = 0;

    var i, j, a, b, dx, dy, d;

    // integrate
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      if (!reduce) { a.x += a.vx; a.y += a.vy; }
      if (a.x < -40) a.x = W + 40; else if (a.x > W + 40) a.x = -40;
      if (a.y < -40) a.y = H + 40; else if (a.y > H + 40) a.y = -40;

      // pointer repulsion — the topology reacts to you
      if (pointer.has) {
        dx = a.x - pointer.x; dy = a.y - pointer.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150 && d > 0.1) {
          var f = (150 - d) / 150 * 0.9;
          a.x += (dx / d) * f;
          a.y += (dy / d) * f;
        }
      }
    }

    // edges
    ctx.lineWidth = 1;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = a.x - b.x; dy = a.y - b.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK) {
          var o = (1 - d / LINK) * 0.3;
          edges.push({ a: a, b: b });
          ctx.strokeStyle = 'rgba(' + a.c + ',' + o.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // packets travelling the graph
    if (!reduce && Math.random() < 0.13) spawnPacket();
    for (i = packets.length - 1; i >= 0; i--) {
      var p = packets[i];
      p.t += p.sp;
      if (p.t >= 1) { packets.splice(i, 1); continue; }
      var px = p.a.x + (p.b.x - p.a.x) * p.t;
      var py = p.a.y + (p.b.y - p.a.y) * p.t;
      var fade = Math.sin(p.t * Math.PI);
      ctx.fillStyle = 'rgba(' + p.c + ',' + (0.9 * fade).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(px, py, 1.9, 0, 6.283);
      ctx.fill();
      // trail
      ctx.strokeStyle = 'rgba(' + p.c + ',' + (0.28 * fade).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - (p.b.x - p.a.x) * 0.045, py - (p.b.y - p.a.y) * 0.045);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // nodes
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      var pulse = reduce ? 1 : 0.68 + Math.sin(now * 0.0016 + a.ph) * 0.32;
      if (a.hub) {
        ctx.fillStyle = 'rgba(' + a.c + ',' + (0.10 * pulse).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * 6, 0, 6.283);
        ctx.fill();
        // service square, not a dot — these are "regions"
        ctx.strokeStyle = 'rgba(' + a.c + ',' + (0.7 * pulse).toFixed(3) + ')';
        ctx.strokeRect(a.x - a.r * 1.9, a.y - a.r * 1.9, a.r * 3.8, a.r * 3.8);
      } else {
        ctx.fillStyle = 'rgba(' + a.c + ',' + (0.55 * pulse).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, 6.283);
        ctx.fill();
      }
    }
  }

  var visible = true;
  var hero = document.getElementById('hero');
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  }

  function loop(now) { requestAnimationFrame(loop); if (visible) step(now); }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.has = true;
  }, { passive: true });
  window.addEventListener('pointerleave', function () { pointer.has = false; });

  resize();
  requestAnimationFrame(loop);
})();
