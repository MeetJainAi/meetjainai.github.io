/* ═══════════════════════════════════════════════════════════
   orb.js — the big shape.

   A raymarched-feeling liquid sphere built in a single fragment
   shader: domain-warped noise inside a soft-edged disc, lit from
   the upper left, pushed around by the cursor. It takes its two
   colours from the page's live palette, so the orb turns with the
   light the same way everything else does.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('orb');
  if (!canvas) return;
  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) { canvas.style.display = 'none'; return; }

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2  u_res;',
    'uniform float u_time;',
    'uniform vec2  u_mouse;',
    'uniform vec3  u_c1;',
    'uniform vec3  u_c2;',
    'uniform vec3  u_c3;',

    'vec3 hash3(vec2 p){',
    '  vec3 q = vec3(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)),dot(p,vec2(419.2,371.9)));',
    '  return fract(sin(q)*43758.5453);',
    '}',
    'float noise(vec2 p){',
    '  vec2 i=floor(p), f=fract(p);',
    '  vec2 u=f*f*(3.-2.*f);',
    '  float a=hash3(i).x, b=hash3(i+vec2(1,0)).x, c=hash3(i+vec2(0,1)).x, d=hash3(i+vec2(1,1)).x;',
    '  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v=0., a=.5;',
    '  for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.03; a*=.5; }',
    '  return v;',
    '}',

    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);',
    '  vec2 m =(u_mouse-.5*u_res)/min(u_res.x,u_res.y);',
    '  float t=u_time*.12;',

    // the sphere drifts and leans toward the cursor
    '  vec2 c = uv - m*.09 - vec2(sin(t*.6)*.02, cos(t*.45)*.025);',
    '  float r = length(c);',
    '  float R = .40;',

    // liquid interior: noise warped by noise
    '  vec2 q = vec2(fbm(c*2.2+vec2(t,0.)), fbm(c*2.2+vec2(5.2,-t)));',
    '  vec2 s = vec2(fbm(c*2.6+3.*q+vec2(1.7,9.2)+.16*t), fbm(c*2.6+3.*q+vec2(8.3,2.8)+.13*t));',
    '  float f = fbm(c*2.1+2.6*s);',

    // The silhouette gets its own slow, low-frequency wobble — reusing
    // the 6-octave interior noise here made the edge jitter per-pixel
    // and the sphere read as fur rather than liquid.
    '  float wob = noise(c*1.25 + vec2(t*0.55, -t*0.4));',
    '  float edge = R + (wob-.5)*.045;',
    '  float mask = smoothstep(edge, edge-.012, r);',
    '  if(mask<=0.001){ gl_FragColor=vec4(0.); return; }',

    // shade it: three palette stops mixed by the liquid field
    '  vec3 col = mix(u_c1, u_c2, clamp(f*1.5,0.,1.));',
    '  col = mix(col, u_c3, clamp(length(s)*1.15,0.,1.)*.62);',

    // lighting — a lambert-ish lift from the upper left plus a rim
    '  vec3 n = normalize(vec3(c, sqrt(max(0.,R*R-r*r))));',
    '  float lam = clamp(dot(n, normalize(vec3(-.55,.62,.62))),0.,1.);',
    '  col *= .52 + .78*lam;',
    '  float rim = pow(1.-clamp(dot(n,vec3(0,0,1)),0.,1.), 2.6);',
    '  col += rim*u_c3*.5;',

    // specular pop
    '  float spec = pow(clamp(dot(reflect(normalize(vec3(.55,-.62,-.62)),n),vec3(0,0,1)),0.,1.), 26.);',
    '  col += spec*.35;',

    // dither to kill banding across the big soft gradient
    '  col += (fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.012;',

    '  gl_FragColor = vec4(col, mask);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[orb]', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
  gl.useProgram(prog);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {
    res: gl.getUniformLocation(prog,'u_res'),   time: gl.getUniformLocation(prog,'u_time'),
    mouse: gl.getUniformLocation(prog,'u_mouse'),
    c1: gl.getUniformLocation(prog,'u_c1'), c2: gl.getUniformLocation(prog,'u_c2'), c3: gl.getUniformLocation(prog,'u_c3')
  };

  var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  var mouse = { x:0, y:0, tx:0, ty:0 };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    var w = canvas.clientWidth || 600, h = canvas.clientHeight || 600;
    canvas.width = Math.floor(w*dpr); canvas.height = Math.floor(h*dpr);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    if (!mouse.tx) { mouse.tx = canvas.width*0.5; mouse.ty = canvas.height*0.5; mouse.x = mouse.tx; mouse.y = mouse.ty; }
  }
  resize();
  window.addEventListener('resize', resize, { passive:true });
  window.addEventListener('pointermove', function(e){
    var r = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left)*dpr;
    mouse.ty = (r.height - (e.clientY - r.top))*dpr;
  }, { passive:true });

  function rgbVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var m = v.match(/\d+/g);
    if (!m) return fallback;
    return [ +m[0]/255, +m[1]/255, +m[2]/255 ];
  }

  var visible = true;
  var host = canvas.closest('section') || canvas.parentNode;
  if ('IntersectionObserver' in window && host) {
    new IntersectionObserver(function(e){ visible = e[0].isIntersecting; }, { threshold:0 }).observe(host);
  }

  var start = performance.now(), tick = 0;
  var c1 = [0.30,0.49,1.0], c2 = [0.66,0.33,1.0], c3 = [1.0,0.42,0.55];

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (++tick % 12 === 0) {
      c1 = rgbVar('--orb1', c1); c2 = rgbVar('--orb2', c2); c3 = rgbVar('--orb3', c3);
    }
    mouse.x += (mouse.tx-mouse.x)*0.06;
    mouse.y += (mouse.ty-mouse.y)*0.06;
    gl.uniform1f(U.time, reduce ? 6 : (now-start)*0.001);
    gl.uniform2f(U.mouse, mouse.x, mouse.y);
    gl.uniform3fv(U.c1, c1); gl.uniform3fv(U.c2, c2); gl.uniform3fv(U.c3, c3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
})();
