/* ═══════════════════════════════════════════════════════════
   sky.js — stars that go out as the sun comes up.

   Deliberately quiet. The previous version of this site had a
   particle network fighting the headline for attention; this one
   is meant to be felt and not looked at. Opacity is driven by the
   same day-progress value that drives the palette, so the field
   fades to nothing exactly as the page reaches daylight.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('stars');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, stars = [], drift = 0;

  function build() {
    var n = Math.round(Math.min(190, (W * H) / 9000));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() < 0.9 ? Math.random() * 0.9 + 0.3 : Math.random() * 1.5 + 1.1,
        a: Math.random() * 0.55 + 0.2,
        tw: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.5 + 0.25
      });
    }
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function frame(now) {
    requestAnimationFrame(frame);

    var day = typeof window.__day === 'function' ? window.__day() : 0;
    var sky = 1 - Math.min(1, day * 1.45);   // gone well before full daylight
    if (sky <= 0.01) { ctx.clearRect(0, 0, W, H); return; }

    ctx.clearRect(0, 0, W, H);
    drift += 0.02;

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.65 + Math.sin(now * 0.0007 * s.sp + s.tw) * 0.35;
      var x = s.x * W + Math.sin(drift * 0.004 + s.tw) * 6;
      var y = s.y * H;
      ctx.globalAlpha = s.a * tw * sky;
      ctx.fillStyle = '#EAF0FF';
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
