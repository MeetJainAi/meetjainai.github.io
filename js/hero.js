/* ═══════════════════════════════════════════════════════════
   hero.js — "the infrastructure you never see"

   A complete architecture exists behind the headline at all
   times: services on a jittered grid, wired to their neighbours
   with right-angled runs, traffic moving between them.

   None of it is drawn. It is only rendered where the reader is
   looking — a torch over a system that was always there. On the
   line "you never see", that is the whole point.

   Touch devices get a slow drifting reveal instead of a cursor,
   so the idea still lands without a pointer.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('heroGrid');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  var LABELS = ['lambda','s3','vpc','iam','glue','rds','sqs','ecs','kms','route53',
                'dynamo','athena','ec2','sns','efs','cloudfront'];

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, CELL = 0;
  var nodes = [], edges = [], packets = [];
  var R = 300;                        // reveal radius
  var ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, live: false };
  var t0 = performance.now();

  function build() {
    nodes = []; edges = []; packets = [];
    CELL = W < 700 ? 88 : 116;
    var cols = Math.ceil(W / CELL) + 1;
    var rows = Math.ceil(H / CELL) + 1;
    var grid = [];

    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        var kindRoll = Math.random();
        grid[r][c] = {
          x: c * CELL + CELL * 0.5 + (Math.random() - 0.5) * CELL * 0.34,
          y: r * CELL + CELL * 0.5 + (Math.random() - 0.5) * CELL * 0.34,
          // services read as boxes, functions as dots — it should look
          // like a diagram, not a particle field
          kind: kindRoll < 0.30 ? 'box' : (kindRoll < 0.86 ? 'dot' : 'svc'),
          label: Math.random() < 0.22 ? LABELS[(Math.random() * LABELS.length) | 0] : null,
          ph: Math.random() * 6.283
        };
        nodes.push(grid[r][c]);
      }
    }

    // wire each node to the neighbour right and below, skipping some
    // so the mesh reads as a network rather than graph paper
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var a = grid[r][c];
        if (c + 1 < cols && Math.random() < 0.62) edges.push({ a: a, b: grid[r][c + 1] });
        if (r + 1 < rows && Math.random() < 0.52) edges.push({ a: a, b: grid[r + 1][c] });
      }
    }
  }

  function resize() {
    W = canvas.clientWidth  || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.max(220, Math.min(340, Math.min(W, H) * 0.36));
    build();
  }

  // right-angled run between two nodes: infrastructure doesn't
  // travel in straight diagonals
  function elbow(a, b) {
    return [[a.x, a.y], [b.x, a.y], [b.x, b.y]];
  }

  function reveal(x, y) {
    var dx = x - ptr.x, dy = y - ptr.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > R) return 0;
    var v = 1 - d / R;
    return Math.pow(v, 1.45) * 1.35;  // tight falloff — a torch, not a wash
  }

  function accent() {
    var s = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    var m = s.match(/\d+/g);
    return m ? m.slice(0, 3).join(',') : '110,127,243';
  }

  var ACC = '110,127,243';
  var accTick = 0;

  function frame(now) {
    requestAnimationFrame(frame);

    // the layer only exists while the hero does
    var fade = 1 - Math.min(1, window.scrollY / (window.innerHeight * 0.75));
    if (fade <= 0.01) { ctx.clearRect(0, 0, W, H); return; }

    if (++accTick % 20 === 0) ACC = accent();

    // no pointer? drift the torch on a slow lissajous so touch
    // readers still discover the idea
    if (!ptr.live || !fine) {
      var t = (now - t0) * 0.00016;
      ptr.tx = W * (0.5 + 0.30 * Math.sin(t));
      ptr.ty = H * (0.52 + 0.24 * Math.sin(t * 1.37 + 1.1));
    }
    if (ptr.x < -9000) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    ptr.x += (ptr.tx - ptr.x) * 0.09;
    ptr.y += (ptr.ty - ptr.y) * 0.09;

    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;

    // ── runs ──
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      var v = Math.max(reveal(e.a.x, e.a.y), reveal(e.b.x, e.b.y));
      if (v <= 0.01) continue;
      var p = elbow(e.a, e.b);
      ctx.strokeStyle = 'rgba(' + ACC + ',' + (v * 0.54 * fade).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      ctx.lineTo(p[1][0], p[1][1]);
      ctx.lineTo(p[2][0], p[2][1]);
      ctx.stroke();
    }

    // ── traffic ──
    if (!reduce && packets.length < 30 && Math.random() < 0.4) {
      var pick = edges[(Math.random() * edges.length) | 0];
      if (pick && reveal(pick.a.x, pick.a.y) > 0.15) {
        packets.push({ e: pick, t: 0, sp: 0.012 + Math.random() * 0.02 });
      }
    }
    for (i = packets.length - 1; i >= 0; i--) {
      var pk = packets[i];
      pk.t += pk.sp;
      if (pk.t >= 1) { packets.splice(i, 1); continue; }
      var seg = elbow(pk.e.a, pk.e.b);
      // two legs of the elbow, each half the journey
      var leg = pk.t < 0.5 ? 0 : 1;
      var lt  = pk.t < 0.5 ? pk.t * 2 : (pk.t - 0.5) * 2;
      var ax = seg[leg][0], ay = seg[leg][1], bx = seg[leg + 1][0], by = seg[leg + 1][1];
      var px = ax + (bx - ax) * lt, py = ay + (by - ay) * lt;
      var pv = reveal(px, py);
      if (pv <= 0.01) continue;
      ctx.fillStyle = 'rgba(' + ACC + ',' + (pv * fade * 0.95).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(px, py, 1.9, 0, 6.283);
      ctx.fill();
    }

    // ── services ──
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var nv = reveal(n.x, n.y);
      if (nv <= 0.01) continue;
      var pulse = reduce ? 1 : 0.78 + Math.sin(now * 0.0018 + n.ph) * 0.22;
      var a = nv * fade * pulse;

      ctx.strokeStyle = 'rgba(' + ACC + ',' + (a * 0.95).toFixed(3) + ')';
      ctx.fillStyle   = 'rgba(' + ACC + ',' + (a * 0.14).toFixed(3) + ')';

      if (n.kind === 'box') {
        ctx.beginPath(); ctx.rect(n.x - 4.5, n.y - 4.5, 9, 9);
        ctx.fill(); ctx.stroke();
      } else if (n.kind === 'svc') {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(n.x - 15, n.y - 7, 30, 14, 3);
        else ctx.rect(n.x - 15, n.y - 7, 30, 14);
        ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(' + ACC + ',' + (a * 0.85).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.8, 0, 6.283); ctx.fill();
      }

      if (n.label && nv > 0.34) {
        ctx.fillStyle = 'rgba(' + ACC + ',' + (nv * fade * 0.62).toFixed(3) + ')';
        ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + (n.kind === 'svc' ? 20 : 15));
      }
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', function (e) {
    if (!fine) return;
    var r = canvas.getBoundingClientRect();
    ptr.tx = e.clientX - r.left;
    ptr.ty = e.clientY - r.top;
    if (!ptr.live) {
      ptr.live = true;
      document.body.classList.add('pointed');   // retires the hint
    }
  }, { passive: true });

  resize();
  requestAnimationFrame(frame);
})();
