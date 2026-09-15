/* ═══════════════════════════════════════════════════════════
   tour.js — the account tours itself.

   A pan-and-zoom canvas is interactive but it is not effortless:
   it asks the visitor to work out the controls before they learn
   anything. So by default nobody has to touch it. The camera
   flies the story on its own, captions arrive with each shot, and
   the one genuinely cinematic move — the 12,164 km crossing — is
   flown along the actual curve of the migration wire.

   Touch anything and the tour steps aside immediately, leaving a
   fully explorable map and a Resume control.
   ═══════════════════════════════════════════════════════════ */
window.TOUR = (function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // move: seconds easing to the shot. hold: seconds resting on it.
  var SHOTS = [
    { id:'origin',   at:'mobiuso', z:0.90, move:2.2, hold:3.4,
      k:'2016 — 2021 · ap-south-1',
      t:'It started in Vadodara',
      b:'A B.Tech in Computer Science, then a software engineer at Mobiuso migrating on-premise systems into AWS — and writing the Terraform that cut environment setup from days to hours.' },

    { id:'crossing', fly:['mobiuso','lambton'], z:0.52, move:4.6, hold:2.4,
      k:'2022 · the crossing',
      t:'Then he left',
      b:'Twelve thousand one hundred and sixty-four kilometres. He gave up a software engineering job in India, moved to Toronto, and enrolled as a student again.' },

    { id:'restart',  at:'intern', z:1.0, move:2.2, hold:3.6,
      k:'2023 · ca-central-1',
      t:'And started over as an intern',
      b:'A title he had already outgrown once. Four months holding up client-critical EC2, S3 and RDS — and automating away 35% of the manual operations work.' },

    { id:'climb',    at:'engineer', z:0.95, move:2.4, hold:4.0,
      k:'2024 — 2025 · primary',
      t:'Eighteen months later he was the architect',
      b:'Designing the systems he had been supporting. Serverless on Lambda, S3 and DynamoDB. Glue and Airflow ETL. 25% lower operational cost, 40% fewer configuration errors.' },

    { id:'stacks',   at:'tf', z:0.52, move:2.6, hold:3.4,
      k:'shipped',
      t:'Three systems that outlived the demo',
      b:'A pipeline that stopped needing a person. A module library people actually adopted. A platform that reads the invoice for you.' },

    { id:'certs',    at:'c3', z:0.62, move:2.6, hold:3.0,
      k:'credentials',
      t:'Five certifications, all current',
      b:'AWS Solutions Architect, Machine Learning Engineer and Data Engineer. HashiCorp Terraform. Oracle Generative AI.' },

    { id:'contact',  at:'contact', z:1.0, move:2.4, hold:5.0,
      k:'status · available',
      t:'Open to work',
      b:'Cloud architecture, data engineering, MLOps — Toronto or remote.',
      cta:true }
  ];

  var el = {}, i = -1, t0 = 0, raf = 0, playing = false, ended = false;
  var from = null, curve = null;

  function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

  function target(shot) {
    if (shot.fly) {
      var b = MAP.node(shot.fly[1]);
      return { x:b.x, y:b.y, z:shot.z };
    }
    var n = MAP.node(shot.at);
    return { x:n.x, y:n.y, z:shot.z };
  }

  function show(shot) {
    el.k.textContent = shot.k;
    el.t.textContent = shot.t;
    el.b.textContent = shot.b;
    el.cta.hidden = !shot.cta;
    el.card.classList.remove('in');
    void el.card.offsetWidth;                 // restart the entrance
    el.card.classList.add('in');
  }

  function go(n) {
    i = n;
    var shot = SHOTS[i];
    from = { x:MAP.cam.x, y:MAP.cam.y, z:MAP.cam.z };
    curve = shot.fly ? MAP.edgeCurve(shot.fly[0], shot.fly[1]) : null;
    t0 = performance.now();
    el.dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    setTimeout(function () { if (playing && i === n) show(shot); }, shot.move * 620);
  }

  function frame(now) {
    if (!playing) return;
    raf = requestAnimationFrame(frame);
    var shot = SHOTS[i];
    var el_s = (now - t0) / 1000;
    var to = target(shot);

    if (el_s < shot.move) {
      var p = ease(el_s / shot.move);
      if (curve) {
        // fly the actual arc, not a straight line between its ends
        var pt = curve(p);
        // ease out to a wide shot at the midpoint, back in on arrival
        var arc = Math.sin(p * Math.PI);
        MAP.setCam(pt[0], pt[1], from.z + (to.z - from.z) * p - arc * 0.22);
      } else {
        MAP.setCam(from.x + (to.x - from.x) * p,
                   from.y + (to.y - from.y) * p,
                   from.z + (to.z - from.z) * p);
      }
    } else {
      // a slow drift while the caption is read, so nothing feels frozen
      var d = (el_s - shot.move) * 0.35;
      MAP.setCam(to.x + Math.sin(d) * 12, to.y + Math.cos(d * 0.8) * 8, to.z);
      if (el_s > shot.move + shot.hold) {
        if (i + 1 < SHOTS.length) go(i + 1);
        else finish();
      }
    }
    // progress across the whole tour
    var done = 0, total = 0;
    SHOTS.forEach(function (s, k) {
      total += s.move + s.hold;
      if (k < i) done += s.move + s.hold;
      else if (k === i) done += Math.min(el_s, s.move + s.hold);
    });
    el.bar.style.transform = 'scaleX(' + (done / total).toFixed(4) + ')';
  }

  function play() {
    if (ended) { ended = false; i = -1; }
    playing = true;
    document.body.classList.add('touring');
    el.toggle.setAttribute('aria-label', 'Pause tour');
    el.toggle.classList.add('playing');
    if (i < 0) go(0); else { t0 = performance.now(); from = { x:MAP.cam.x, y:MAP.cam.y, z:MAP.cam.z }; }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function pause(hard) {
    playing = false;
    cancelAnimationFrame(raf);
    MAP.release();
    document.body.classList.remove('touring');
    el.toggle.setAttribute('aria-label', 'Play tour');
    el.toggle.classList.remove('playing');
    if (hard) el.card.classList.remove('in');
  }

  function finish() {
    ended = true;
    pause(false);
    document.body.classList.add('toured');    // reveals the free-explore chrome
  }

  return {
    init: function (nodes) {
      el = nodes;
      el.toggle.addEventListener('click', function () { playing ? pause(true) : play(); });
      el.dots.forEach(function (d, k) {
        d.addEventListener('click', function () { ended = false; play(); go(k); });
      });
      // any real input on the canvas hands control straight over
      MAP.onUserInput(function () { if (playing) { pause(true); finish(); } });
      if (reduce) { finish(); return; }
      setTimeout(play, 2600);                 // after the name beat
    },
    play: play,
    isPlaying: function () { return playing; }
  };
})();
