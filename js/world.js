/* ═══════════════════════════════════════════════════════════
   world.js — the account.

   Meet Shah's career laid out as infrastructure on a single
   canvas: two regions, the migration between them, the stacks
   he shipped, the credentials, the writing. Coordinates are
   world units; the camera does the rest.
   ═══════════════════════════════════════════════════════════ */
window.WORLD = (function () {
  'use strict';

  var N = [
    // ── ap-south-1 · India ────────────────────────────────
    { id:'parul',    x:-1350, y: 380, r:34, kind:'edu',    region:'in',
      label:'Parul University',   sub:'B.Tech CS · 2016—20',  panel:'p-parul' },
    { id:'mobiuso',  x:-1080, y: 150, r:40, kind:'role',   region:'in',
      label:'Mobiuso',            sub:'Software Engineer · 2020—21', panel:'p-mobiuso' },

    // ── ca-central-1 · Toronto ────────────────────────────
    { id:'lambton',  x:   60, y:-240, r:34, kind:'edu',    region:'ca',
      label:'Lambton College',    sub:'Cloud Computing · 2022—23', panel:'p-lambton' },
    { id:'intern',   x:  340, y: -40, r:36, kind:'role',   region:'ca',
      label:'Cloud Support',      sub:'Intern · 2023',        panel:'p-intern' },
    { id:'engineer', x:  650, y: 120, r:56, kind:'hub',    region:'ca',
      label:'Cloud Engineer',     sub:'Arihant · 2024—25',    panel:'p-engineer' },

    // ── stacks ────────────────────────────────────────────
    { id:'etl',      x: 1120, y: 300, r:42, kind:'stack',
      label:'Real Estate ETL',    sub:'99.8% reliability',    panel:'p-etl' },
    { id:'tf',       x: 1380, y: 500, r:42, kind:'stack',
      label:'Terraform Library',  sub:'50% faster deploys',   panel:'p-tf' },
    { id:'finops',   x: 1080, y: 620, r:42, kind:'stack',
      label:'Cost Optimisation',  sub:'30% cost cut',         panel:'p-finops' },

    // ── credentials ───────────────────────────────────────
    { id:'c1', x: 680, y:-430, r:24, kind:'cert', label:'Solutions Architect',  sub:'AWS', panel:'p-certs' },
    { id:'c2', x: 900, y:-516, r:24, kind:'cert', label:'ML Engineer',          sub:'AWS', panel:'p-certs' },
    { id:'c3', x:1120, y:-546, r:24, kind:'cert', label:'Data Engineer',        sub:'AWS', panel:'p-certs' },
    { id:'c4', x:1340, y:-516, r:24, kind:'cert', label:'Terraform',            sub:'HashiCorp', panel:'p-certs' },
    { id:'c5', x:1555, y:-430, r:24, kind:'cert', label:'Generative AI',        sub:'Oracle', panel:'p-certs' },

    // ── writing ───────────────────────────────────────────
    { id:'w1', x:-620, y:-500, r:26, kind:'post', label:'AWS ETL, end to end',  sub:'Jan 2025', panel:'p-w1' },
    { id:'w2', x:-330, y:-600, r:26, kind:'post', label:'LLM benchmarks',       sub:'Sep 2024', panel:'p-w2' },
    { id:'w3', x: -40, y:-500, r:26, kind:'post', label:'Statistics for DS',    sub:'Jan 2022', panel:'p-w3' },

    // ── contact ───────────────────────────────────────────
    { id:'contact',  x: 620, y: 790, r:46, kind:'contact',
      label:'Open to work',       sub:'hire@meetshahdev.com', panel:'p-contact' }
  ];

  var E = [
    ['parul','mobiuso'],
    ['mobiuso','lambton','migration'],   // 12,164 km
    ['lambton','intern'],
    ['intern','engineer'],
    ['engineer','etl'], ['engineer','tf'], ['engineer','finops'],
    ['engineer','c3','thin'],
    ['c1','c2','thin'], ['c2','c3','thin'], ['c3','c4','thin'], ['c4','c5','thin'],
    ['lambton','w3','thin'], ['w3','w2','thin'], ['w2','w1','thin'],
    ['engineer','contact']
  ];

  // Region boxes are derived from the nodes inside them, with room for
  // the region label above and the node labels below. Hand-typed
  // rectangles drifted out of sync the moment a node moved.
  var REGION_DEFS = [
    { id:'in', label:'ap-south-1',   sub:'India',   members:['parul','mobiuso'] },
    { id:'ca', label:'ca-central-1', sub:'Toronto', members:['lambton','intern','engineer'] }
  ];
  var PAD = { x: 130, top: 86, bottom: 104 };   // bottom clears the two label lines


  var byId = {};
  N.forEach(function (n) { byId[n.id] = n; });

  var REGIONS = REGION_DEFS.map(function (d) {
    var xs = [], ys = [];
    d.members.forEach(function (id) {
      var n = byId[id]; if (!n) return;
      xs.push(n.x - n.r, n.x + n.r);
      ys.push(n.y - n.r, n.y + n.r);
    });
    var x0 = Math.min.apply(null, xs) - PAD.x, x1 = Math.max.apply(null, xs) + PAD.x;
    var y0 = Math.min.apply(null, ys) - PAD.top, y1 = Math.max.apply(null, ys) + PAD.bottom;
    return { id:d.id, label:d.label, sub:d.sub,
             x:(x0 + x1) / 2, y:(y0 + y1) / 2, w:x1 - x0, h:y1 - y0 };
  });

  // Overview frames everything that exists, rather than a guessed zoom.
  var bx = [], by = [];
  N.forEach(function (n) { bx.push(n.x - n.r - 190, n.x + n.r + 190); by.push(n.y - n.r - 150, n.y + n.r + 170); });
  REGIONS.forEach(function (r) { bx.push(r.x - r.w/2, r.x + r.w/2); by.push(r.y - r.h/2, r.y + r.h/2); });
  var BOUNDS = { x0:Math.min.apply(null,bx), x1:Math.max.apply(null,bx),
                 y0:Math.min.apply(null,by), y1:Math.max.apply(null,by) };

  // resolve edges to node references once
  var edges = E.map(function (e) {
    return { a: byId[e[0]], b: byId[e[1]], kind: e[2] || 'wire' };
  }).filter(function (e) { return e.a && e.b; });

  // where the legend flies you
  var PLACES = [
    { id:'all',      label:'Overview',    x:(BOUNDS.x0+BOUNDS.x1)/2, y:(BOUNDS.y0+BOUNDS.y1)/2, z:'fit' },
    { id:'mobiuso',  label:'Origin',      x:-1200, y: 260, z:0.95 },
    { id:'lambton',  label:'The move',    x:-500, y: -60, z:0.58 },
    { id:'engineer', label:'The work',    x: 650, y: 120, z:1.05 },
    { id:'etl',      label:'Stacks',      x:1190, y: 470, z:0.82 },
    { id:'c3',       label:'Certified',   x:1045, y:-470, z:0.92 },
    { id:'w2',       label:'Writing',     x: -95, y:-550, z:1.0  },
    { id:'contact',  label:'Contact',     x: 620, y: 790, z:1.1  }
  ];

  return { nodes: N, edges: edges, byId: byId, regions: REGIONS, places: PLACES, bounds: BOUNDS };
})();
