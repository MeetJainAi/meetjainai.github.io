/* ══════════════════════════════════════════════════════════════
   aurora.js — raw WebGL fragment-shader backdrop.
   A slow, mouse-reactive nebula of "regions". No dependencies.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('glCanvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false })
        || canvas.getContext('experimental-webgl');
  if (!gl) { canvas.style.display = 'none'; return; }

  var VERT = [
    'attribute vec2 p;',
    'void main(){ gl_Position = vec4(p,0.0,1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform vec2  u_res;',
    'uniform float u_time;',
    'uniform vec2  u_mouse;',

    // simplex-ish value noise
    'vec2 hash(vec2 p){',
    '  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));',
    '  return -1.0 + 2.0*fract(sin(p)*43758.5453123);',
    '}',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f*f*(3.0-2.0*f);',
    '  return mix(mix(dot(hash(i+vec2(0.0,0.0)), f-vec2(0.0,0.0)),',
    '                 dot(hash(i+vec2(1.0,0.0)), f-vec2(1.0,0.0)), u.x),',
    '             mix(dot(hash(i+vec2(0.0,1.0)), f-vec2(0.0,1.0)),',
    '                 dot(hash(i+vec2(1.0,1.0)), f-vec2(1.0,1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }',
    '  return v;',
    '}',

    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / min(u_res.x,u_res.y);',
    '  float t = u_time * 0.035;',

    // flow-warped domain
    '  vec2 q = vec2(fbm(uv*1.6 + vec2(t,0.0)), fbm(uv*1.6 + vec2(3.7,-t)));',
    '  vec2 r = vec2(fbm(uv*2.1 + 3.0*q + vec2(1.7,9.2) + 0.13*t),',
    '               fbm(uv*2.1 + 3.0*q + vec2(8.3,2.8) + 0.11*t));',
    '  float f = fbm(uv*1.9 + 2.4*r);',

    // mouse gravity well
    '  vec2 m = (u_mouse - 0.5*u_res)/min(u_res.x,u_res.y);',
    '  float md = length(uv - m);',
    '  float well = exp(-md*2.4) * 0.5;',

    // palette: amber -> violet -> cyan, all very dark
    '  vec3 amber  = vec3(1.000, 0.690, 0.125);',
    '  vec3 violet = vec3(0.655, 0.545, 0.980);',
    '  vec3 cyan   = vec3(0.133, 0.827, 0.933);',

    '  vec3 col = vec3(0.019,0.023,0.039);',
    '  col = mix(col, amber  * 0.55, clamp(f*1.55 + well, 0.0, 1.0) * 0.42);',
    '  col = mix(col, violet * 0.60, clamp(length(q)*0.95, 0.0, 1.0) * 0.34);',
    '  col = mix(col, cyan   * 0.45, clamp(r.x*1.25, 0.0, 1.0) * 0.26);',

    // horizon falloff: keep the top dark so type stays readable
    '  float vign = smoothstep(1.25, 0.10, length(uv*vec2(0.78,1.0)));',
    '  col *= vign;',
    '  col += well * amber * 0.09;',

    // scanline grit
    '  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453) - 0.5) * 0.022;',

    '  float alpha = clamp(vign*0.95, 0.0, 1.0);',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[aurora] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes   = gl.getUniformLocation(prog, 'u_res');
  var uTime  = gl.getUniformLocation(prog, 'u_time');
  var uMouse = gl.getUniformLocation(prog, 'u_mouse');

  var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    mouse.tx = mouse.tx || canvas.width * 0.5;
    mouse.ty = mouse.ty || canvas.height * 0.55;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  window.addEventListener('pointermove', function (e) {
    mouse.tx = e.clientX * dpr;
    mouse.ty = (window.innerHeight - e.clientY) * dpr;
  }, { passive: true });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var visible = true;
  var hero = document.getElementById('hero');
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  }

  var start = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    mouse.x += (mouse.tx - mouse.x) * 0.055;
    mouse.y += (mouse.ty - mouse.y) * 0.055;
    gl.uniform1f(uTime, reduce ? 12.0 : (now - start) * 0.001);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
})();
