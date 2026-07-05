/* THE CONSTRUCT — 03_props.js — procedural prop library (pure) */
(function (G) {
  'use strict';
  var C = G.C;
  var P = C.props = {};

  // Merge src mesh into dst at pos with yaw (non-articulated meshes only).
  C.mergeMesh = function (dst, src, pos, yaw) {
    var base = dst.v.length, i;
    var cy = Math.cos(yaw || 0), sy = Math.sin(yaw || 0);
    for (i = 0; i < src.v.length; i++) {
      var p = src.v[i];
      var x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy;
      dst.v.push([x + pos[0], p[1] + pos[1], z + pos[2]]);
    }
    for (i = 0; i < src.f.length; i++) {
      var f = src.f[i], idx = [];
      for (var k = 0; k < f.i.length; k++) idx.push(f.i[k] + base);
      var n = f.n;
      var nf = { i: idx, c: f.c, n: [n[0] * cy + n[2] * sy, n[1], -n[0] * sy + n[2] * cy] };
      if (f.tag) nf.tag = f.tag;
      dst.f.push(nf);
    }
    return dst;
  };

  function fin(m, density, seed, maxPer) {
    C.anchorize(m, density == null ? 3.2 : density, seed || 11, maxPer);
    return C.meshBounds(m);
  }

  // ---------- weapons ----------
  P.rifle = function (col) {
    col = col || '#23262b';
    var m = C.newMesh();
    C.addBox(m, 0.02, 0.46, 0, 0.62, 0.10, 0.07, col);                 // receiver
    C.addBox(m, 0.46, 0.485, 0, 0.34, 0.045, 0.045, '#16181c');        // barrel
    C.addBox(m, 0.06, 0.34, 0, 0.10, 0.13, 0.06, '#16181c');           // magazine
    C.addBox(m, -0.40, 0.42, 0, 0.22, 0.12, 0.065, '#2c3036');         // stock
    C.addBox(m, -0.05, 0.27, 0, 0.07, 0.08, 0.055, '#16181c');         // grip
    C.addBox(m, 0.13, 0.56, 0, 0.16, 0.05, 0.05, '#101216');           // sight
    return fin(m, 28, 21, 8);
  };
  P.pistol = function () {
    var m = C.newMesh();
    C.addBox(m, 0.02, 0.10, 0, 0.24, 0.07, 0.05, '#23262b');
    C.addBox(m, -0.06, 0.0, 0, 0.07, 0.11, 0.05, '#16181c');
    return fin(m, 60, 22, 6);
  };
  P.shotgun = function () {
    var m = C.newMesh();
    C.addBox(m, 0.05, 0.46, 0, 0.8, 0.085, 0.07, '#3a3026');
    C.addBox(m, 0.5, 0.485, 0, 0.42, 0.05, 0.05, '#16181c');
    C.addBox(m, 0.32, 0.40, 0, 0.2, 0.05, 0.06, '#241d16');            // pump
    C.addBox(m, -0.44, 0.42, 0, 0.24, 0.12, 0.07, '#241d16');
    return fin(m, 24, 23, 8);
  };
  // Viewmodel pistol (engine subtracts 0.42 from y; build around y≈0.30–0.58, +x forward)
  P.heldGun = function () {
    var m = C.newMesh();
    C.addBox(m, 0.10, 0.46, 0, 0.34, 0.10, 0.075, '#26292e');   // slide
    C.addBox(m, 0.27, 0.475, 0, 0.10, 0.05, 0.05, '#15171a');   // muzzle
    C.addBox(m, -0.02, 0.30, 0.0, 0.10, 0.17, 0.07, '#191b1f'); // grip
    C.addBox(m, 0.06, 0.40, 0, 0.07, 0.07, 0.06, '#101216');    // trigger guard
    C.meshBounds(m); m.an = [];
    return m;
  };

  // Gun rack: steel frame + shelves stacked with hardware.
  P.rack = function (seed) {
    var r = C.rng(seed || 5);
    var m = C.newMesh();
    var W = 2.6, H = 2.15, D = 0.55, frame = '#383d44';
    C.addBox(m, -W / 2, 0, 0, 0.09, H, D, frame);
    C.addBox(m, W / 2, 0, 0, 0.09, H, D, frame);
    var shelves = [0.18, 0.72, 1.26, 1.8];
    for (var s = 0; s < shelves.length; s++) {
      C.addBox(m, 0, shelves[s], 0, W - 0.12, 0.06, D, '#454b53');
      var kinds = [P.rifle, P.shotgun, P.rifle];
      for (var g = 0; g < 3; g++) {
        var gun = (r() < 0.18 ? P.shotgun : kinds[g % kinds.length])();
        C.mergeMesh(m, gun, [-0.82 + g * 0.82, shelves[s] + 0.06, (r() - 0.5) * 0.1], (r() - 0.5) * 0.06);
      }
    }
    return fin(m, 2.6, seed || 5, 10);
  };

  // ---------- furniture / props ----------
  P.chair = function () { // worn red leather wingback — the only saturated thing in the void
    var m = C.newMesh(), red = '#7e2a20', dark = '#5c1f17';
    C.addBox(m, 0, 0.0, 0, 0.62, 0.34, 0.6, dark);                     // base
    C.addBox(m, 0, 0.34, 0.02, 0.6, 0.14, 0.56, red);                  // cushion
    C.addBox(m, 0, 0.34, -0.26, 0.6, 0.78, 0.12, red);                 // back
    C.addBox(m, -0.27, 0.34, 0.0, 0.07, 0.3, 0.5, dark);               // arms
    C.addBox(m, 0.27, 0.34, 0.0, 0.07, 0.3, 0.5, dark);
    return fin(m, 6, 31);
  };
  P.table = function () {
    var m = C.newMesh(), wood = '#8a6a45';
    C.addBox(m, 0, 0.72, 0, 1.4, 0.06, 0.8, wood);
    var L = [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]];
    for (var i = 0; i < 4; i++) C.addBox(m, L[i][0], 0, L[i][1], 0.08, 0.72, 0.08, '#5f4830');
    return fin(m, 4, 32);
  };
  P.tv = function () { // old CRT on a cabinet; screen face streams code even in the "real" render
    var m = C.newMesh();
    C.addBox(m, 0, 0, 0, 0.9, 0.5, 0.5, '#5b4630');                    // cabinet
    C.addBox(m, 0, 0.5, 0, 0.74, 0.58, 0.56, '#7a6248');               // shell
    var f = C.addQuadZ(m, -0.3, 0.58, 0.3, 1.0, 0.281, '#0a120c', true, 'screen');
    f.n = [0, 0, 1];
    return fin(m, 6, 33);
  };
  P.lamp = function () {
    var m = C.newMesh();
    C.addCyl(m, 0, 0, 0, 0.18, 0.05, '#3a3d42', 8);
    C.addBox(m, 0, 0.05, 0, 0.05, 1.35, 0.05, '#3a3d42');
    C.addCone(m, 0, 1.25, 0, 0.26, 0.3, '#d9cfa8', 8);
    return fin(m, 8, 34);
  };
  P.tree = function (seed) {
    var r = C.rng(seed || 9), m = C.newMesh();
    var h = 0.9 + r() * 0.5;
    C.addCyl(m, 0, 0, 0, 0.12, h, '#5d4631', 6);
    C.addCone(m, 0, h - 0.1, 0, 0.85, 1.1, '#3f7d4a', 7);
    C.addCone(m, 0, h + 0.6, 0, 0.62, 0.95, '#498a55', 7);
    C.addCone(m, 0, h + 1.25, 0, 0.4, 0.8, '#54975f', 7);
    return fin(m, 2.2, seed || 9, 12);
  };
  P.crate = function () {
    var m = C.newMesh();
    C.addBox(m, 0, 0, 0, 0.8, 0.8, 0.8, '#9b815a');
    C.addBox(m, 0, 0.36, 0, 0.84, 0.08, 0.84, '#836c4b');
    return fin(m, 4, 35);
  };
  P.car = function (col) {
    var m = C.newMesh();
    col = col || '#5a6a72';
    C.addBox(m, 0, 0.28, 0, 4.1, 0.55, 1.75, col);
    C.addBox(m, -0.2, 0.83, 0, 2.0, 0.5, 1.6, C.scaleHex(col, 0.9));
    var W = [[-1.35, -0.85], [1.35, -0.85], [-1.35, 0.85], [1.35, 0.85]];
    for (var i = 0; i < 4; i++) {
      C.addBox(m, W[i][0], 0.0, W[i][1], 0.52, 0.5, 0.22, '#1c1e22');
    }
    return fin(m, 1.4, 36, 10);
  };
  P.booth = function () { // the exit — a glass phone box
    var m = C.newMesh(), frame = '#23524a', glass = '#39524f';
    C.addBox(m, 0, 0, 0, 1.05, 0.1, 1.05, frame);
    var px = [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]];
    for (var i = 0; i < 4; i++) C.addBox(m, px[i][0], 0.1, px[i][1], 0.09, 2.2, 0.09, frame);
    C.addQuadZ(m, -0.48, 0.1, 0.48, 2.3, -0.48, glass, false);
    C.addQuadZ(m, -0.48, 0.1, 0.48, 2.3, -0.47, C.scaleHex(glass, 1.12), true);   // inner faces so the
    C.addQuadX(m, -0.48, 0.1, 0.48, 2.3, -0.48, glass, false);
    C.addQuadX(m, -0.48, 0.1, 0.48, 2.3, -0.47, C.scaleHex(glass, 1.12), true);   // glass reads from the
    C.addQuadX(m, -0.48, 0.1, 0.48, 2.3, 0.48, glass, true);
    C.addQuadX(m, -0.48, 0.1, 0.48, 2.3, 0.47, C.scaleHex(glass, 1.12), false);   // open doorway too
    C.addBox(m, 0, 2.3, 0, 1.1, 0.22, 1.1, frame, { tagZ: 'sign' });
    C.addBox(m, 0.2, 1.05, -0.35, 0.22, 0.32, 0.1, '#10211e');         // the phone
    return fin(m, 3, 37);
  };
  P.dummy = function () { // wooden training dummy
    var m = C.newMesh(), wood = '#a87c4f';
    C.addBox(m, 0, 0, 0, 0.9, 0.12, 0.9, '#6e4f30');
    C.addCyl(m, 0, 0.12, 0, 0.14, 1.55, wood, 8);
    var arm = C.newMesh(); C.addBox(arm, 0.27, -0.03, 0, 0.55, 0.07, 0.07, '#8a6238');
    C.mergeMesh(m, arm, [0, 1.32, 0], 0.5);
    C.mergeMesh(m, arm, [0, 1.18, 0], -0.55);
    C.mergeMesh(m, arm, [0, 0.95, 0], 0.05);
    var leg = C.newMesh(); C.addBox(leg, 0.25, -0.04, 0, 0.5, 0.08, 0.08, '#8a6238');
    C.mergeMesh(m, leg, [0, 0.5, 0], -0.2);
    return fin(m, 5, 38);
  };
  P.pedestal = function () {
    var m = C.newMesh();
    C.addBox(m, 0, 0, 0, 0.7, 0.12, 0.7, '#e4e2dc');
    C.addBox(m, 0, 0.12, 0, 0.5, 0.85, 0.5, '#efede7');
    C.addBox(m, 0, 0.97, 0, 0.64, 0.08, 0.64, '#e4e2dc');
    return fin(m, 6, 39);
  };
  P.mirror = function () {
    var m = C.newMesh();
    C.addBox(m, 0, 0, 0, 1.0, 0.1, 0.5, '#2a2d31');
    C.addBox(m, 0, 0.1, 0, 0.84, 1.9, 0.1, '#07090b', { flat: true });
    return fin(m, 4, 40);
  };
  P.beacon = function () { // landing marker for the jump program
    var m = C.newMesh();
    C.addCyl(m, 0, 0, 0, 0.55, 0.07, '#2f9e57', 10, { flat: true });
    C.addCyl(m, 0, 0.07, 0, 0.06, 1.7, '#2f9e57', 6, { flat: true });
    return fin(m, 10, 41, 14);
  };
  P.bench = function () {
    var m = C.newMesh();
    C.addBox(m, 0, 0.32, 0, 1.7, 0.07, 0.45, '#6f5639');
    C.addBox(m, -0.7, 0, 0, 0.1, 0.32, 0.45, '#3a3d42');
    C.addBox(m, 0.7, 0, 0, 0.1, 0.32, 0.45, '#3a3d42');
    C.addBox(m, 0, 0.39, -0.2, 1.7, 0.45, 0.07, '#6f5639');
    return fin(m, 4, 42);
  };
  P.lamppost = function () {
    var m = C.newMesh();
    C.addCyl(m, 0, 0, 0, 0.09, 4.4, '#3c4046', 6);
    C.addBox(m, 0.45, 4.3, 0, 1.0, 0.12, 0.2, '#3c4046');
    C.addBox(m, 0.85, 4.2, 0, 0.34, 0.1, 0.3, '#e8e3c8', { flat: true });
    return fin(m, 1.6, 43, 8);
  };
  P.fountain = function () {
    var m = C.newMesh();
    C.addCyl(m, 0, 0, 0, 2.4, 0.45, '#9aa0a4', 12);
    var w = C.addQuadY(m, -2.0, -2.0, 2.0, 2.0, 0.46, '#6e8d9a');
    w.tag = 'water';
    C.addCyl(m, 0, 0.46, 0, 0.4, 1.0, '#9aa0a4', 8);
    C.addCyl(m, 0, 1.46, 0, 0.9, 0.12, '#9aa0a4', 10);
    return fin(m, 1.5, 44, 10);
  };

  // ---------- vehicles & blades (feel constants ported from the author's STREET PROTOCOL) ----------
  P.car = function (hue) { // low street car; nose at +z like every prop front
    var m = C.newMesh();
    var hull = '#0b0b16', glass = '#141a2e';
    C.addBox(m, 0, 0.34, 0, 1.62, 0.52, 3.5, hull);                 // body
    C.addBox(m, 0, 0.74, -0.25, 1.30, 0.34, 1.7, glass);            // cabin
    C.addQuadY(m, -0.7, -1.6, 0.7, 1.6, 0.055, hue);                // neon underglow
    C.addBox(m, -0.52, 0.42, 1.74, 0.28, 0.10, 0.06, '#f5f7ff');    // headlights
    C.addBox(m, 0.52, 0.42, 1.74, 0.28, 0.10, 0.06, '#f5f7ff');
    C.addBox(m, -0.52, 0.42, -1.74, 0.28, 0.10, 0.06, '#ff2b55');   // taillights
    C.addBox(m, 0.52, 0.42, -1.74, 0.28, 0.10, 0.06, '#ff2b55');
    C.addBox(m, 0, 0.16, 1.1, 1.5, 0.3, 0.5, '#07070d');            // wheel masses
    C.addBox(m, 0, 0.16, -1.1, 1.5, 0.3, 0.5, '#07070d');
    C.meshBounds(m);
    return m;
  };

  P.emgStrip = function (state) { // reactor emergency strip: off | dead | red | half
    var m = C.newMesh();
    var cc = state === 'red' ? '#ff4038' : state === 'half' ? '#8a5a2e' : state === 'dead' ? '#05070c' : '#141a24';
    C.addBox(m, 0, 0, 0, 0.14, 2.6, 0.5, '#0a0e16');
    C.addQuadX(m, -0.24, -1.2, 0.24, 1.2, 0.09, cc, false);
    C.meshBounds(m);
    return m;
  };

  P.dragonHead = function () { // the bridge prow: a stone dragon head facing +z
    var m = C.newMesh();
    var ST='#a89c86';
    C.addBox(m, 0, 0.35, 0.5, 0.8, 0.7, 1.4, ST);
    C.addBox(m, 0, 0.62, 1.35, 0.62, 0.5, 0.8, ST);
    C.addBox(m, 0, 0.42, 1.85, 0.5, 0.26, 0.5, '#948a76');
    var b = m.v.length; m.v.push([-0.18, 0.95, 0.15], [-0.34, 1.5, -0.35], [-0.06, 0.95, -0.1]);
    C.addFace(m, [b, b+1, b+2], '#8a8070');
    var b2 = m.v.length; m.v.push([0.06, 0.95, -0.1], [0.34, 1.5, -0.35], [0.18, 0.95, 0.15]);
    C.addFace(m, [b2, b2+1, b2+2], '#8a8070');
    C.addBox(m, -0.2, 0.72, 1.6, 0.1, 0.1, 0.1, '#c9a24a');
    C.addBox(m, 0.2, 0.72, 1.6, 0.1, 0.1, 0.1, '#c9a24a');
    C.meshBounds(m);
    return m;
  };

  P.lantern = function (lit) { // palace lantern on a post
    var m = C.newMesh();
    C.addBox(m, 0, 0.85, 0, 0.09, 1.7, 0.09, '#3a2a1c');
    C.addBox(m, 0, 1.9, 0, 0.52, 0.62, 0.52, lit ? '#ffb85e' : '#4a3626');
    C.addBox(m, 0, 2.28, 0, 0.62, 0.1, 0.62, '#22262c', { noBottom: true });
    C.meshBounds(m);
    return m;
  };

  P.ding = function () { // bronze tripod vessel
    var m = C.newMesh();
    var BR='#6a4a22';
    for (var i = 0; i < 8; i++) {
      var a0 = i * Math.PI / 4, a1 = (i + 1) * Math.PI / 4;
      var b = m.v.length;
      m.v.push([Math.cos(a0)*0.75, 0.55, Math.sin(a0)*0.75], [Math.cos(a0)*0.85, 1.35, Math.sin(a0)*0.85],
               [Math.cos(a1)*0.85, 1.35, Math.sin(a1)*0.85], [Math.cos(a1)*0.75, 0.55, Math.sin(a1)*0.75]);
      C.addFace(m, [b, b+1, b+2, b+3], BR);
    }
    C.addBox(m, 0, 1.4, 0, 1.55, 0.12, 1.55, '#7a5628', { noBottom: true });
    C.addBox(m, -0.45, 0.28, -0.3, 0.16, 0.6, 0.16, '#54381a');
    C.addBox(m, 0.45, 0.28, -0.3, 0.16, 0.6, 0.16, '#54381a');
    C.addBox(m, 0, 0.28, 0.52, 0.16, 0.6, 0.16, '#54381a');
    C.meshBounds(m);
    return m;
  };

  P.shuttle = function () { // the docked skiff: fuselage + cone nose along +x, skids, wing, tail, canopy, engine glow
    var m = C.newMesh();
    var R = 1.05, L = 5.0, N = 8;
    for (var i = 0; i < N; i++) {
      var a0 = i * Math.PI * 2 / N, a1 = (i + 1) * Math.PI * 2 / N;
      var y0 = 1.45 + Math.cos(a0) * R, z0 = Math.sin(a0) * R;
      var y1 = 1.45 + Math.cos(a1) * R, z1 = Math.sin(a1) * R;
      var b = m.v.length; m.v.push([-L/2, y0, z0], [L/2, y0, z0], [L/2, y1, z1], [-L/2, y1, z1]);
      C.addFace(m, [b, b+1, b+2, b+3], '#4a4640');
      var b2 = m.v.length; m.v.push([L/2, y0, z0], [L/2 + 1.7, 1.45, 0], [L/2, y1, z1]);
      C.addFace(m, [b2, b2+1, b2+2], '#2c2a28');
      var b3 = m.v.length; m.v.push([-L/2, y1, z1], [-L/2, 1.45, 0], [-L/2, y0, z0]);
      C.addFace(m, [b3, b3+1, b3+2], '#232120');
    }
    C.addBox(m, 0, 0.32, -1.15, 4.2, 0.6, 0.42, '#26242a');
    C.addBox(m, 0, 0.32, 1.15, 4.2, 0.6, 0.42, '#26242a');
    C.addBox(m, -0.6, 2.35, 0, 1.5, 0.4, 4.2, '#33302c', { noBottom: true });
    C.addBox(m, -2.2, 2.9, 0, 0.4, 1.3, 1.0, '#2c2a28', { noBottom: true });
    C.addBox(m, 1.35, 1.95, 0, 1.1, 0.5, 1.15, '#0e141c', { noBottom: true });
    var e = m.v.length; m.v.push([-L/2 - 0.02, 0.95, -0.55], [-L/2 - 0.02, 1.95, -0.55], [-L/2 - 0.02, 1.95, 0.55], [-L/2 - 0.02, 0.95, 0.55]);
    C.addFace(m, [e, e+1, e+2, e+3], '#ffb85e');
    C.meshBounds(m);
    return m;
  };

  P.sunShaft = function (on) { // bridge viewport light column: day on, night off
    var m = C.newMesh();
    var cc = on ? '#3a3220' : '#0b0d13';
    var b = m.v.length; m.v.push([-0.35, 1.4, 0], [-0.35, 2.3, 0], [2.9, 0.2, 6.4], [2.9, 0.05, 6.4]);
    C.addFace(m, [b, b + 1, b + 2, b + 3], cc);
    C.meshBounds(m);
    return m;
  };

  P.cabDoor = function (open) { // med-bay cabinet door: shut, or swung open (ghost)
    var m = C.newMesh();
    C.addBox(m, 0, 0, open ? -0.36 : 0, 0.05, 0.95, 0.78, '#232a38');
    C.meshBounds(m);
    return m;
  };

  P.figure = function () { // the alcove figure: a still dark silhouette
    var m = C.newMesh();
    var ink = '#04060a';
    C.addBox(m, 0, 0.8, 0, 0.46, 1.6, 0.3, ink);        // body column
    C.addBox(m, 0, 1.74, 0, 0.26, 0.26, 0.24, ink);      // head
    C.addBox(m, -0.16, 0.7, 0.02, 0.12, 1.35, 0.22, '#03050a');
    C.addBox(m, 0.16, 0.7, 0.02, 0.12, 1.35, 0.22, '#03050a');
    C.meshBounds(m);
    return m;
  };

  P.bike = function () { // original naked street bike; nose at +z like every prop front
    var m = C.newMesh();
    var body = '#2b3037', tank = '#3f4651', dark = '#15171a', steel = '#7c828a', accent = '#2f9e57';
    function wheel(cz) {
      C.addBox(m, 0, 0.34, cz, 0.16, 0.66, 0.66, dark);            // tire block
      C.addBox(m, 0, 0.34, cz, 0.18, 0.30, 0.30, '#23262b');       // hub
      C.addBox(m, 0, 0.34, cz, 0.20, 0.08, 0.50, '#3a3d42');       // spoke v
      C.addBox(m, 0, 0.34, cz, 0.20, 0.50, 0.08, '#3a3d42');       // spoke h
    }
    wheel(-0.62); wheel(0.64);
    C.addBox(m, 0, 0.40, 0.02, 0.40, 0.34, 0.58, body);            // engine/frame mass
    C.addBox(m, 0.22, 0.30, -0.34, 0.08, 0.08, 0.66, steel);       // exhaust pipe
    C.addBox(m, 0, 0.70, 0.08, 0.36, 0.26, 0.52, tank);            // fuel tank (raised)
    C.addQuadY(m, -0.12, 0.20, 0.12, 0.40, 0.831, accent);         // code-green tank stripe
    C.addBox(m, 0, 0.66, -0.42, 0.34, 0.12, 0.50, '#191b1f');      // seat
    C.addBox(m, 0, 0.76, -0.70, 0.30, 0.14, 0.20, body);           // tail cowl
    C.addBox(m, -0.12, 0.34, 0.58, 0.07, 0.62, 0.07, steel);       // front forks
    C.addBox(m,  0.12, 0.34, 0.58, 0.07, 0.62, 0.07, steel);
    C.addBox(m, 0, 0.98, 0.52, 0.70, 0.06, 0.07, '#1b1d20');       // handlebar
    C.addBox(m, -0.34, 0.96, 0.50, 0.07, 0.10, 0.10, '#101216');   // grips
    C.addBox(m,  0.34, 0.96, 0.50, 0.07, 0.10, 0.10, '#101216');
    C.addBox(m, 0, 0.82, 0.70, 0.20, 0.18, 0.07, '#f0ead0', { flat: true }); // headlamp
    return fin(m, 2.4, 71, 12);
  };
  P.katanaStand = function () { // low rack, blade resting across it
    var m = C.newMesh(), wood = '#3a3026';
    C.addBox(m, 0, 0, 0, 0.74, 0.06, 0.24, wood);
    C.addBox(m, -0.26, 0.06, 0, 0.06, 0.30, 0.16, wood);
    C.addBox(m,  0.26, 0.06, 0, 0.06, 0.30, 0.16, wood);
    C.addBox(m, -0.52, 0.33, 0, 0.22, 0.05, 0.05, '#1b1d20');           // handle
    C.addBox(m, -0.40, 0.305, 0, 0.045, 0.10, 0.09, '#23262b');         // guard
    C.addBox(m, 0.06, 0.335, 0, 0.88, 0.035, 0.04, '#d6dde2');          // blade
    return fin(m, 16, 72, 8);
  };
  // Viewmodel katana (engine subtracts 0.42 from y; build around y≈0.30–0.58, +x forward)
  P.heldKatana = function () {
    var m = C.newMesh();
    C.addBox(m, 0.05, 0.385, 0, 0.24, 0.055, 0.05, '#1b1d20');          // wrapped handle
    C.addBox(m, 0.18, 0.355, 0, 0.045, 0.115, 0.095, '#23262b');        // guard
    C.addBox(m, 0.63, 0.405, 0, 0.86, 0.038, 0.02, '#d6dde2');          // blade
    C.addBox(m, 0.63, 0.437, 0, 0.86, 0.012, 0.014, '#9aa6ad');         // spine
    C.meshBounds(m); m.an = [];
    return m;
  };

  // ---------- articulated human ----------
  // parts: 0 body, 1 legL, 2 legR, 3 armL, 4 armR, 5 head
  // Render tiers — the principle lifted from STREET PROTOCOL (not its WebGL code):
  // geometry detail encodes a figure's status. 'terminal' = lowest-detail (a few coarse
  // blocks), 'retail' = mid, 'custom' = full detail (the original P.human look).
  P.human = function (opt) {
    opt = opt || {};
    var tier = opt.tier || 'custom';
    var m = C.newMesh();
    m.vp = []; m.pivots = [];
    function part(pid, pivot, fn) {
      var v0 = m.v.length;
      fn();
      for (var i = v0; i < m.v.length; i++) m.vp[i] = pid;
      m.pivots[pid] = pivot;
    }
    var suit = opt.suit || '#5a5c60', pants = opt.pants || C.scaleHex(suit, 0.8);
    var skin = opt.skin || '#b7b2aa', hair = opt.hair || '#3a3a3c', shoe = '#222428';
    var dress = !!opt.dress;

    if (tier === 'terminal') {
      // lowest render budget: a blocky torso, two stub legs, a cube head — no shoes, hands, hair detail
      part(0, [0, 0, 0], function () {
        C.addBox(m, 0, 0.78, 0, 0.5, 0.7, 0.32, suit, { flat: true });     // slab torso
      });
      part(1, [-0.12, 0.78, 0], function () { C.addBox(m, -0.12, 0.06, 0, 0.2, 0.72, 0.24, pants, { flat: true }); });
      part(2, [0.12, 0.78, 0], function () { C.addBox(m, 0.12, 0.06, 0, 0.2, 0.72, 0.24, pants, { flat: true }); });
      part(3, [-0.3, 1.34, 0], function () { C.addBox(m, -0.3, 0.74, 0, 0.14, 0.6, 0.16, suit, { flat: true }); });
      part(4, [0.3, 1.34, 0], function () { C.addBox(m, 0.3, 0.74, 0, 0.14, 0.6, 0.16, suit, { flat: true }); });
      part(5, [0, 1.4, 0], function () { C.addBox(m, 0, 1.42, 0, 0.3, 0.32, 0.3, skin, { flat: true }); }); // cube head
      return fin(m, 2.0, opt.seed || 45, 4);
    }

    part(0, [0, 0, 0], function () {
      if (dress) {
        C.addBox(m, 0, 0.42, 0, 0.52, 0.55, 0.34, opt.suit || '#c1121f'); // skirt
        C.addBox(m, 0, 0.97, 0, 0.4, 0.45, 0.26, opt.suit || '#c1121f');  // bodice
      } else {
        C.addBox(m, 0, 0.84, 0, 0.44, 0.58, 0.26, suit);                  // jacket
        if (opt.shirt && tier === 'custom') C.addQuadZ(m, -0.07, 0.96, 0.07, 1.36, 0.131, opt.shirt, true);
      }
    });
    var legY = dress ? 0.42 : 0.86, legH = legY - 0.02;
    part(1, [-0.11, legY, 0], function () {
      C.addBox(m, -0.11, 0.1, 0, 0.17, legH - 0.1, 0.2, dress ? skin : pants);
      if (tier === 'custom') C.addBox(m, -0.11, 0, 0.04, 0.18, 0.1, 0.3, shoe);
    });
    part(2, [0.11, legY, 0], function () {
      C.addBox(m, 0.11, 0.1, 0, 0.17, legH - 0.1, 0.2, dress ? skin : pants);
      if (tier === 'custom') C.addBox(m, 0.11, 0, 0.04, 0.18, 0.1, 0.3, shoe);
    });
    var shY = 1.36;
    part(3, [-0.28, shY, 0], function () {
      C.addBox(m, -0.28, shY - 0.62, 0, 0.13, 0.62, 0.15, dress ? skin : suit);
    });
    part(4, [0.28, shY, 0], function () {
      C.addBox(m, 0.28, shY - 0.62, 0, 0.13, 0.62, 0.15, dress ? skin : suit);
    });
    part(5, [0, 1.42, 0], function () {
      C.addBox(m, 0, 1.44, 0, 0.24, 0.26, 0.24, skin);
      C.addBox(m, 0, 1.62, -0.01, 0.26, 0.1, 0.26, hair);
      if (opt.longhair) C.addBox(m, 0, 1.3, -0.13, 0.26, 0.36, 0.08, hair);
      if (opt.glasses) C.addQuadZ(m, -0.11, 1.5, 0.11, 1.57, 0.125, '#0b0d0f', true);
    });
    return fin(m, tier === 'retail' ? 3.2 : 4.5, opt.seed || 45, 6);
  };

  P.agent = function () {
    return P.human({ tier: 'custom', suit: '#1c1e22', pants: '#191b1f', skin: '#c4bdb2', hair: '#2a2620', shirt: '#e8e6e0', glasses: true, seed: 46 });
  };
  P.redDress = function () {
    return P.human({ tier: 'custom', dress: true, suit: '#c1121f', skin: '#d8b9a4', hair: '#caa84a', longhair: true, seed: 47 });
  };

  // ---- hallway props (ported from construct-deja-vu) ----
  P.doorLeaf = function (mir) {
    var m = C.newMesh();
    m.vp = []; m.pivots = [];
    var zd = mir ? -1 : 1;
    var v0 = m.v.length;
    C.addBox(m, 0, 0.02, zd * 0.415, 0.06, 2.02, 0.79, '#241c15');
    C.addQuadX(m, zd * 0.06, 0.14, zd * 0.70, 1.92, mir ? -0.034 : 0.034, '#2c2118', !mir);
    C.addBox(m, 0.055, 0.98, zd * 0.70, 0.05, 0.09, 0.05, '#8a6b2f');   // knob
    for (var i = v0; i < m.v.length; i++) m.vp[i] = 5;
    m.pivots[5] = [0, 1.0, 0];
    C.anchorize(m, 0.9, mir ? 411 : 410, 4); C.meshBounds(m);
    return m;
  };

  P.hallDoor = function (bricked) {
    var m = C.newMesh();
    var W = 0.95, H = 2.05, wood = '#3a2d20', frame = '#2c221a';
    C.addBox(m, -W / 2 - 0.05, 0, 0, 0.1, H + 0.06, 0.13, frame);      // jamb L
    C.addBox(m, W / 2 + 0.05, 0, 0, 0.1, H + 0.06, 0.13, frame);       // jamb R
    C.addBox(m, 0, H + 0.02, 0, W + 0.2, 0.09, 0.13, frame);           // lintel
    C.addBox(m, 0, 0, 0, W + 0.2, 0.03, 0.13, '#241c15');              // threshold
    if (!bricked) {
      C.addQuadZ(m, -W / 2, 0.02, W / 2, H, -0.02, '#080706', true);   // the dark behind
      var leaf = C.newMesh();
      C.addBox(leaf, W / 2 - 0.02, 0.03, 0, W - 0.04, H - 0.05, 0.045, wood);
      C.addBox(leaf, W - 0.12, 1.02, 0.035, 0.03, 0.03, 0.05, '#8a7a4c'); // knob
      C.mergeMesh(m, leaf, [-W / 2, 0, 0.03], -0.62);                  // hinged at the left jamb, ajar
    } else {
      C.addQuadZ(m, -W / 2, 0.02, W / 2, H, -0.01, '#3a322c', true);   // mortar bed
      var r = C.rng(88);
      for (var row = 0; row * 0.235 < H - 0.2; row++) {
        var y = 0.05 + row * 0.235;
        var off = (row % 2) * 0.16;
        for (var x = -W / 2 + 0.02 + off - 0.16; x < W / 2 - 0.05; x += 0.325) {
          var bw = Math.min(0.30, W / 2 - 0.03 - x);
          if (bw < 0.08) continue;
          C.addBox(m, Math.max(-W / 2 + 0.17, x + bw / 2), y, 0.015, bw, 0.21, 0.06,
            C.mixHex('#5d3a2e', '#4a2f26', r()));
        }
      }
    }
    return fin(m, 6, bricked ? 92 : 91, 6);
  };

  P.hallWindow = function (barred) {
    var m = C.newMesh();
    var W = 1.1, Y0 = 1.05, Y1 = 2.15, frame = '#2e2721';
    C.addBox(m, 0, Y0 - 0.07, 0, W + 0.24, 0.09, 0.16, frame);          // sill
    C.addBox(m, 0, Y1, 0, W + 0.24, 0.08, 0.12, frame);                 // head
    C.addBox(m, -W / 2 - 0.05, Y0, 0, 0.1, Y1 - Y0, 0.12, frame);
    C.addBox(m, W / 2 + 0.05, Y0, 0, 0.1, Y1 - Y0, 0.12, frame);
    C.addQuadZ(m, -W / 2, Y0, W / 2, Y1, 0.0, '#0b1220', true);         // night
    C.addQuadZ(m, -W / 2 + 0.12, Y0 + 0.55, W / 2 - 0.55, Y1 - 0.18, 0.005, '#1d2a44', true); // moon wash
    C.addBox(m, 0, Y0, 0.02, 0.05, Y1 - Y0, 0.05, frame);               // muntin |
    C.addBox(m, 0, (Y0 + Y1) / 2, 0.02, W, 0.05, 0.05, frame);          // muntin —
    if (barred) {
      for (var i = 0; i < 5; i++) {
        var x = -W / 2 + 0.09 + i * ((W - 0.18) / 4);
        C.addBox(m, x, Y0 - 0.02, 0.085, 0.035, Y1 - Y0 + 0.08, 0.035, '#101114');
      }
      C.addBox(m, 0, Y0 + 0.16, 0.085, W + 0.1, 0.045, 0.045, '#141518'); // cross strap
      C.addBox(m, 0, Y1 - 0.22, 0.085, W + 0.1, 0.045, 0.045, '#141518');
    }
    return fin(m, 7, barred ? 94 : 93, 6);
  };

  P.ceilLamp = function (dead) {
    var m = C.newMesh();
    C.addBox(m, 0, -0.12, 0, 0.05, 0.12, 0.05, '#2a2620');              // stem
    C.addCyl(m, 0, -0.26, 0, 0.17, 0.13, dead ? '#26241f' : '#4a4437', 8, { noBottom: false });
    if (!dead) C.addBox(m, 0, -0.315, 0, 0.19, 0.05, 0.19, '#e8c477', { flat: true }); // glow globe
    return fin(m, dead ? 10 : 12, dead ? 96 : 95, 5);
  };

  P.cat = function () {
    var m = C.newMesh();
    m.vp = []; m.pivots = [];
    function part(pid, pivot, fn) {
      var v0 = m.v.length;
      fn();
      for (var i = v0; i < m.v.length; i++) m.vp[i] = pid;
      m.pivots[pid] = pivot;
    }
    var fur = '#17171a', furD = '#101013';
    part(0, [0, 0, 0], function () {
      C.addBox(m, 0, 0.17, 0.02, 0.16, 0.17, 0.42, fur);              // trunk
      C.addBox(m, 0, 0.16, -0.17, 0.18, 0.19, 0.14, furD);            // haunches
      C.addBox(m, 0, 0.26, 0.24, 0.13, 0.12, 0.13, fur);              // head
      C.addBox(m, -0.045, 0.375, 0.22, 0.035, 0.05, 0.02, furD);      // ear L
      C.addBox(m, 0.045, 0.375, 0.22, 0.035, 0.05, 0.02, furD);       // ear R
      C.addQuadZ(m, -0.052, 0.29, -0.018, 0.315, 0.307, '#7ddc8a', true);  // eye L
      C.addQuadZ(m, 0.018, 0.29, 0.052, 0.315, 0.307, '#7ddc8a', true);   // eye R
    });
    part(1, [-0.055, 0.14, 0.15], function () { C.addBox(m, -0.055, 0.0, 0.15, 0.045, 0.14, 0.05, furD); });
    part(2, [0.055, 0.14, 0.15], function () { C.addBox(m, 0.055, 0.0, 0.15, 0.045, 0.14, 0.05, furD); });
    part(3, [-0.06, 0.14, -0.16], function () { C.addBox(m, -0.06, 0.0, -0.16, 0.05, 0.14, 0.055, furD); });
    part(4, [0.06, 0.14, -0.16], function () { C.addBox(m, 0.06, 0.0, -0.16, 0.05, 0.14, 0.055, furD); });
    part(5, [0, 0.24, -0.24], function () {
      C.addBox(m, 0, 0.235, -0.33, 0.035, 0.045, 0.2, fur);           // tail base
      C.addBox(m, 0, 0.27, -0.43, 0.03, 0.11, 0.035, furD);           // tail tip, hooked up
    });
    return fin(m, 14, 313, 5);
  };

  P.archway = function (bricked) {
    var m = C.newMesh();
    var W = 2.0, H = 2.35, stone = '#3f382f';
    C.addBox(m, -W / 2 - 0.08, 0, 0, 0.16, H + 0.1, 0.2, stone);
    C.addBox(m, W / 2 + 0.08, 0, 0, 0.16, H + 0.1, 0.2, stone);
    C.addBox(m, 0, H + 0.04, 0, W + 0.32, 0.13, 0.2, stone);
    if (bricked) {
      C.addQuadZ(m, -W / 2, 0.0, W / 2, H, 0.055, '#38302a', true);
      C.addQuadZ(m, -W / 2, 0.0, W / 2, H, -0.055, '#332c26', false);
      var r = C.rng(97);
      for (var row = 0; row * 0.235 < H - 0.12; row++) {
        var y = 0.03 + row * 0.235;
        var off = (row % 2) * 0.17;
        for (var x = -W / 2 + 0.02 + off - 0.17; x < W / 2 - 0.06; x += 0.345) {
          var bw = Math.min(0.32, W / 2 - 0.04 - x);
          if (bw < 0.08) continue;
          C.addBox(m, Math.max(-W / 2 + 0.18, x + bw / 2), y, 0, bw, 0.21, 0.11,
            C.mixHex('#5d3a2e', '#472e25', r()));
        }
      }
    }
    return fin(m, 5, bricked ? 99 : 98, 6);
  };

  // ---- ORANGE EMPIRE 1937 props (branch port, native re-forge) ----
  P.sedan = function (hue) { // 1937 sedan out of boxes; nose at +z like every prop front
    var m = C.newMesh();
    var body = hue || '#3a3a34', dark = '#14120f', chrome = '#9aa0a8', glass = '#1c2630';
    C.addBox(m, 0, 0.42, 0, 1.95, 0.16, 4.2, dark);                 // running boards + frame
    C.addBox(m, 0, 0.95, -0.25, 1.7, 0.78, 3.0, body);              // main body
    C.addBox(m, 0, 0.93, 1.75, 1.25, 0.62, 1.5, body);              // narrow hood, forward
    C.addBox(m, 0, 1.66, -0.35, 1.55, 0.72, 1.9, body);             // cab / roof
    C.addQuadZ(m, -0.62, 1.45, 0.62, 1.9, 0.62, glass, true);       // windshield
    C.addQuadX(m, -1.1, 1.45, 0.4, 1.9, -0.79, glass, true);        // side glass
    C.addQuadX(m, -1.1, 1.45, 0.4, 1.9, 0.79, glass, false);
    C.addBox(m, 0, 1.05, -1.85, 1.6, 0.6, 0.8, body);               // trunk slope mass
    C.addBox(m, 0, 0.93, 2.52, 1.0, 0.55, 0.1, chrome);             // grille
    C.addBox(m, 0, 0.5, 2.62, 1.9, 0.14, 0.1, chrome);              // bumpers
    C.addBox(m, 0, 0.5, -2.35, 1.9, 0.14, 0.1, chrome);
    for (var s = -1; s <= 1; s += 2) {                              // fenders + wheels + headlamps
      C.addBox(m, s * 0.86, 0.62, 1.55, 0.3, 0.5, 1.15, body);
      C.addBox(m, s * 0.86, 0.62, -1.45, 0.3, 0.5, 1.15, body);
      C.addBox(m, s * 0.86, 0.44, 1.55, 0.24, 0.62, 0.88, dark);
      C.addBox(m, s * 0.86, 0.44, -1.45, 0.24, 0.62, 0.88, dark);
      C.addBox(m, s * 0.62, 1.18, 2.45, 0.2, 0.2, 0.14, '#c8bf9a');
    }
    C.addBox(m, 0, 1.0, -2.32, 0.26, 0.86, 0.86, dark);             // spare on the back
    C.meshBounds(m);
    return m;
  };

  P.barricade37 = function (kind, broken) { // sawhorse barricade, plank spans x; faces +z driver
    var m = C.newMesh();
    var W = kind === 3 ? 4.6 : 7.2, H = kind === 3 ? 1.5 : 1.0;
    var py = kind === 3 ? 1.5 : 1.15;
    var base = kind === 1 ? '#d8d2c2' : kind === 2 ? '#cfc4a4' : '#7d6b50';
    if (!broken) {
      C.addBox(m, 0, py, 0, W, H, 0.1, base);
      if (kind === 1) { for (var st = 0; st < 5; st++) C.addQuadZ(m, -W/2 + 0.3 + st * 1.45, py - H/2 + 0.1, -W/2 + 0.85 + st * 1.45, py + H/2 - 0.1, 0.07, '#c8541e', true);
        C.addBox(m, 0, py + H/2 + 0.28, 0, 0.24, 0.24, 0.24, '#ff5520'); }   // the lantern
      if (kind === 2) { C.addBox(m, -4.4, 0.48, 0, 0.64, 0.95, 0.64, '#6a3c2a'); C.addBox(m, 4.4, 0.48, 0, 0.64, 0.95, 0.64, '#6a3c2a'); }
      if (kind === 3) { C.addQuadZ(m, -1.6, py - 0.35, 1.6, py + 0.42, 0.06, '#e8e2d2', true); }   // the hand-paint field
      for (var lg = -1; lg <= 1; lg += 2) { C.addBox(m, lg * (W/2 - 0.5), 0.8, 0.28, 0.12, 1.7, 0.12, '#6a5436'); C.addBox(m, lg * (W/2 - 0.5), 0.8, -0.28, 0.12, 1.7, 0.12, '#6a5436'); }
    } else {
      C.addBox(m, -W * 0.22, 0.09, 0.9, W * 0.55, 0.1, 0.34, base);   // planks thrown past, flat
      C.addBox(m, W * 0.18, 0.14, 1.9, W * 0.5, 0.1, 0.3, base);
      C.addBox(m, 0.4, 0.06, 2.8, 1.6, 0.1, 0.2, '#6a5436');
      if (kind === 2) { C.addBox(m, -4.6, 0.3, 1.2, 0.64, 0.6, 0.64, '#6a3c2a'); C.addBox(m, 4.7, 0.24, 0.8, 0.64, 0.48, 0.64, '#6a3c2a'); }
      if (kind === 1) C.addBox(m, -1.2, 0.1, 1.4, 0.24, 0.2, 0.24, '#7a2a12');   // the lantern, dark, on its side
    }
    C.meshBounds(m);
    return m;
  };

  P.shackDoor37 = function (open) { // the packing shack door, hinge on the left edge
    var m = C.newMesh();
    if (open) { C.addBox(m, 0.38, 1.08, 0.42, 0.07, 2.15, 1.05, '#3a2c1e'); }
    else { C.addBox(m, 0.52, 1.08, 0, 1.05, 2.15, 0.07, '#3a2c1e'); }
    C.meshBounds(m);
    return m;
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
