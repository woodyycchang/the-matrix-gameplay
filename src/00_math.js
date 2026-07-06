/* THE CONSTRUCT — 00_math.js — pure math/util, no DOM */
(function (G) {
  'use strict';
  var C = G.C = G.C || {};
  C.VER = 'v38';   // bump on every push: the HUD wears it

  C.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  C.lerp = function (a, b, t) { return a + (b - a) * t; };
  C.easeOutCubic = function (t) { t = C.clamp(t, 0, 1); var u = 1 - t; return 1 - u * u * u; };
  C.easeInCubic = function (t) { t = C.clamp(t, 0, 1); return t * t * t; };
  C.easeInOut = function (t) { t = C.clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  C.smooth = function (t) { t = C.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  // Deterministic RNG (mulberry32)
  C.rng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Color helpers: '#rrggbb' <-> [r,g,b]
  C.hex2rgb = function (h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  };
  C.rgb2hex = function (r, g, b) {
    r = C.clamp(Math.round(r), 0, 255); g = C.clamp(Math.round(g), 0, 255); b = C.clamp(Math.round(b), 0, 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };
  C.mixHex = function (a, b, t) {
    var A = C.hex2rgb(a), B = C.hex2rgb(b);
    return C.rgb2hex(C.lerp(A[0], B[0], t), C.lerp(A[1], B[1], t), C.lerp(A[2], B[2], t));
  };
  C.scaleHex = function (a, s) {
    var A = C.hex2rgb(a);
    return C.rgb2hex(A[0] * s, A[1] * s, A[2] * s);
  };

  // Vec3 as plain arrays
  C.v3 = function (x, y, z) { return [x || 0, y || 0, z || 0]; };
  C.add = function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; };
  C.sub = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
  C.mul = function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; };
  C.dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  C.cross = function (a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  };
  C.len = function (a) { return Math.sqrt(C.dot(a, a)); };
  C.norm = function (a) { var l = C.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  C.rotY = function (p, ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  };

  // Sutherland–Hodgman clip of a camera-space polygon against depth d >= ZN.
  // pts: [{x,y,d}] where d is positive depth in front of camera.
  C.ZN = 0.12;
  C.clipNear = function (pts) {
    var ZN = C.ZN, out = [], n = pts.length, i, a, b, ain, bin, t;
    for (i = 0; i < n; i++) {
      a = pts[i]; b = pts[(i + 1) % n];
      ain = a.d >= ZN; bin = b.d >= ZN;
      if (ain) out.push(a);
      if (ain !== bin) {
        t = (ZN - a.d) / (b.d - a.d);
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, d: ZN });
      }
    }
    return out;
  };

  C.TAU = Math.PI * 2;
})(typeof globalThis !== 'undefined' ? globalThis : this);
