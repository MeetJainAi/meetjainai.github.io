/* ═══════════════════════════════════════════════════════════
   app.js — panels, the index, and keyboard access.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var W = window.WORLD;
  var panel   = document.getElementById('panel');
  var panelIn = document.getElementById('panelIn');
  var bodies  = document.getElementById('bodies');
  var cue     = document.getElementById('cue');
  var legend  = document.querySelectorAll('.legend button');

  function open(node) {
    if (window.TOUR && TOUR.isPlaying()) return;   // the tour owns the camera
    if (!node) return close();
    var src = bodies.querySelector('#' + node.panel);
    if (!src) return close();
    panelIn.innerHTML = src.innerHTML;
    panel.classList.add('on');
    document.body.classList.add('panelled');
    if (cue) cue.classList.add('gone');
    // pull the node clear of the panel on wide screens
    if (window.innerWidth > 860) {
      MAP.flyTo(node.x + 300 / 1.0, node.y, Math.max(0.78, 0.9));
    } else {
      MAP.flyTo(node.x, node.y - 180, 0.85);
    }
  }

  function close() {
    panel.classList.remove('on');
    document.body.classList.remove('panelled');
    MAP.select(null);
  }

  document.getElementById('panelX').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  // any input skips the opening beat — nobody should have to wait twice
  var curtain = document.getElementById('curtain');
  function dropCurtain() {
    // skipping the beat has to bring the chrome with it — otherwise the
    // reader trades a 2.5s title for 2.9s of an empty map.
    document.body.classList.add('skipped');
    if (curtain) curtain.style.animationDelay = '0s';
  }
  ['pointerdown','wheel','keydown','touchstart'].forEach(function (ev) {
    window.addEventListener(ev, dropCurtain, { once: true, passive: true });
  });

  MAP.init(document.getElementById('stage'), open);

  // the tour runs itself until the reader takes over
  TOUR.init({
    card:   document.getElementById('tCard'),
    k:      document.getElementById('tK'),
    t:      document.getElementById('tT'),
    b:      document.getElementById('tB'),
    cta:    document.getElementById('tCta'),
    bar:    document.getElementById('tBar'),
    toggle: document.getElementById('tToggle'),
    dots:   Array.prototype.slice.call(document.querySelectorAll('#tDots button'))
  });

  // the index flies the camera rather than scrolling anything
  legend.forEach(function (b) {
    b.addEventListener('click', function () {
      legend.forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var id = b.getAttribute('data-place');
      var place = W.places.filter(function (p) { return p.id === id; })[0];
      if (!place) return;
      close();
      if (place.z === 'fit') MAP.fit(); else MAP.flyTo(place.x, place.y, place.z);
      if (cue) cue.classList.add('gone');
    });
  });

  document.getElementById('zin').addEventListener('click',  function () { MAP.zoomBy(1.3); });
  document.getElementById('zout').addEventListener('click', function () { MAP.zoomBy(1 / 1.3); });

  // retire the hint once the reader has clearly got it
  ['pointerdown','wheel','touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () {
      setTimeout(function () { if (cue) cue.classList.add('gone'); }, 1400);
    }, { once: true, passive: true });
  });

  // keyboard: tab through the nodes in narrative order
  var order = ['parul','mobiuso','lambton','intern','engineer','etl','tf','finops','c3','w2','contact'];
  var ki = -1;
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    ki += (e.key === 'ArrowRight' ? 1 : -1);
    if (ki < 0) ki = order.length - 1;
    if (ki >= order.length) ki = 0;
    var n = W.byId[order[ki]];
    if (n) { MAP.select(n); open(n); }
  });
})();
