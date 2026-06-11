/* THE CONSTRUCT — 05_engine.js — software renderer -> draw list (pure) */
(function (G) {
  'use strict';
  var C = G.C;

  var LIGHT = C.norm([0.42, 0.84, 0.34]);

  function shade(hex, n) {
    var lam = 0.84 + 0.16 * Math.max(0, C.dot(n, LIGHT));
    return C.scaleHex(hex, lam);
  }

  // Build full frame draw list.
  // cam: {pos,yaw,pitch,roll}; mode: 'normal'|'code'
  C.render = function (game, w, h, t) {
    var ops = [];
    var scene = game.scene, cam = game.cam, mode = game.mode;
    var fog = scene.fog, fogCol = mode === 'code' ? '#020803' : fog.col;
    var f = (h / 2) / Math.tan((75 * Math.PI / 180) / 2);
    var cx = w / 2, cy = h / 2;
    var cyaw = Math.cos(-cam.yaw), syaw = Math.sin(-cam.yaw);
    var cpit = Math.cos(-cam.pitch), spit = Math.sin(-cam.pitch);
    var cr = Math.cos(cam.roll || 0), sr = Math.sin(cam.roll || 0);
    var ex = cam.pos[0], ey = cam.pos[1], ez = cam.pos[2];

    function toCam(p, out) {
      var tx = p[0] - ex, ty = p[1] - ey, tz = p[2] - ez;
      var x1 = tx * cyaw - tz * syaw, z1 = tx * syaw + tz * cyaw;
      var y2 = ty * cpit - z1 * spit, z2 = ty * spit + z1 * cpit;
      out.x = x1; out.y = y2; out.d = -z2;
      return out;
    }
    function proj(c) {
      var px = c.x * f / c.d, py = -c.y * f / c.d;
      return { x: cx + px * cr - py * sr, y: cy + px * sr + py * cr };
    }

    // sky
    ops.push({ t: 'sky', mode: mode === 'code' ? 'code' : scene.sky, w: w, h: h, pitch: cam.pitch, fogCol: fogCol });
    if (mode === 'code') C.rainOps(ops, w, h, t, 0.55);

    var sceneOps = [];
    var glyphBudget = 2600;

    var insts = scene.insts;
    for (var ii = 0; ii < insts.length; ii++) {
      var inst = insts[ii];
      var p01 = C.clamp(inst.loadT, 0, 1);
      if (p01 <= 0) continue;
      var sc = inst.scale;
      // slide-in interpolation
      var px0 = inst.pos[0], py0 = inst.pos[1], pz0 = inst.pos[2];
      if (inst.slideFrom && p01 < 1) {
        var sp = C.easeOutCubic(Math.min(1, p01 * 1.25));
        px0 = C.lerp(inst.slideFrom[0], inst.pos[0], sp);
        py0 = C.lerp(inst.slideFrom[1], inst.pos[1], sp);
        pz0 = C.lerp(inst.slideFrom[2], inst.pos[2], sp);
      }
      // instance-level cull
      var oc = toCam([px0, py0 + (inst.mesh.bounds ? inst.mesh.bounds.max[1] * sc * 0.5 : 0), pz0], {});
      var rad = (inst.mesh.radius || 1) * sc;
      if (oc.d + rad < C.ZN) continue;
      if (oc.d - rad > fog.far + 8 && inst.kind !== 'ground' && inst.kind !== 'world') continue;

      var m = inst.mesh;
      var ciy = Math.cos(inst.yaw), siy = Math.sin(inst.yaw);
      var pose = inst.pose, vp = m.vp;

      // transform verts -> world (cache array reused)
      var WV = inst._wv;
      if (!WV || WV.length !== m.v.length) { WV = inst._wv = new Array(m.v.length); for (var q = 0; q < WV.length; q++) WV[q] = [0, 0, 0]; }
      var glyphRise = 0;
      var matGlyphs = p01 < 1 || inst.loadDir === -1;
      var polyA = p01 >= 0.62 ? (p01 - 0.62) / 0.38 : 0;
      if (inst.slideFrom) polyA = Math.max(polyA, p01 >= 0.3 ? 1 : p01 / 0.3); // sliders arrive mostly solid
      if (matGlyphs && !inst.slideFrom) glyphRise = (1 - C.smooth(p01 / 0.8)) * 1.6;

      for (var vi = 0; vi < m.v.length; vi++) {
        var lv = m.v[vi], lx = lv[0], ly = lv[1], lz = lv[2];
        if (pose && vp) {
          var pid = vp[vi];
          if (pid >= 1 && pid <= 4 && pose[pid]) {
            var piv = m.pivots[pid], ang = pose[pid], ca = Math.cos(ang), sa = Math.sin(ang);
            var ry = ly - piv[1], rz = lz - piv[2];
            ly = piv[1] + ry * ca - rz * sa; lz = piv[2] + ry * sa + rz * ca;
          } else if (pid === 5 && pose[5]) {
            var pv = m.pivots[5], a5 = pose[5], c5 = Math.cos(a5), s5 = Math.sin(a5);
            var rx = lx - pv[0], rz5 = lz - pv[2];
            lx = pv[0] + rx * c5 + rz5 * s5; lz = pv[2] - rx * s5 + rz5 * c5;
          }
        }
        lx *= sc; ly *= sc; lz *= sc;
        var wx = lx * ciy + lz * siy, wz = -lx * siy + lz * ciy;
        var W0 = WV[vi];
        W0[0] = wx + px0; W0[1] = ly + py0; W0[2] = wz + pz0;
      }

      // blob shadow
      if (inst.shadow && mode !== 'code' && inst.mesh.bounds && polyA > 0.05) {
        var b = inst.mesh.bounds;
        var rx2 = (b.max[0] - b.min[0]) * sc * 0.5 + 0.12, rz2 = (b.max[2] - b.min[2]) * sc * 0.5 + 0.12;
        var shPts = [], ok = true, gy = scene.groundY + 0.012;
        for (var sa2 = 0; sa2 < 10; sa2++) {
          var aa = sa2 / 10 * C.TAU;
          var spc = toCam([px0 + Math.cos(aa) * rx2 * ciy + Math.sin(aa) * rz2 * siy,
                           gy,
                           pz0 - Math.cos(aa) * rx2 * siy + Math.sin(aa) * rz2 * ciy], {});
          if (spc.d < C.ZN) { ok = false; break; }
          shPts.push(spc);
        }
        if (ok && shPts.length > 2) {
          var flat2 = [], dmax2 = 0;
          for (var sp2 = 0; sp2 < shPts.length; sp2++) {
            var pr2 = proj(shPts[sp2]); flat2.push(pr2.x, pr2.y);
            if (shPts[sp2].d > dmax2) dmax2 = shPts[sp2].d;
          }
          sceneOps.push({ t: 'poly', p: flat2, c: '#3a3a38', a: 0.085 * polyA * (1 - C.clamp((dmax2 - fog.near) / (fog.far - fog.near), 0, 1)), d: dmax2 + 0.05 });
        }
      }

      // faces
      if (mode !== 'code' && polyA > 0.01) {
        for (var fi = 0; fi < m.f.length; fi++) {
          var face = m.f[fi], idx = face.i;
          var n = face.n;
          var nwx = n[0] * ciy + n[2] * siy, nwz = -n[0] * siy + n[2] * ciy, nwy = n[1];
          var v0 = WV[idx[0]];
          // backface: dot(normal, v0 - eye) >= 0 -> facing away
          if (nwx * (v0[0] - ex) + nwy * (v0[1] - ey) + nwz * (v0[2] - ez) >= 0) continue;
          var cpts = [], dmax = 0, anyIn = false;
          for (var k = 0; k < idx.length; k++) {
            var cpt = toCam(WV[idx[k]], {});
            cpts.push(cpt);
            if (cpt.d > dmax) dmax = cpt.d;
            if (cpt.d >= C.ZN) anyIn = true;
          }
          if (!anyIn) continue;
          if (dmax - fog.near > fog.far - fog.near && dmax > fog.far) {
            if (inst.kind !== 'ground') continue; // fully fogged
          }
          var poly = (cpts.length && (cpts[0].d < C.ZN || cpts[1].d < C.ZN || cpts[2].d < C.ZN || (cpts[3] && cpts[3].d < C.ZN))) ? C.clipNear(cpts) : cpts;
          if (poly.length < 3) continue;
          var flat = [], offL = false, offR = false, offT = false, offB = false;
          for (var k2 = 0; k2 < poly.length; k2++) {
            var pr = proj(poly[k2]); flat.push(pr.x, pr.y);
            offL = offL || pr.x < 0; offR = offR || pr.x > w; offT = offT || pr.y < 0; offB = offB || pr.y > h;
          }
          // crude screen reject: all points off one side
          var allL = true, allR = true, allT = true, allB = true;
          for (var k3 = 0; k3 < flat.length; k3 += 2) {
            if (flat[k3] >= 0) allL = false; if (flat[k3] <= w) allR = false;
            if (flat[k3 + 1] >= 0) allT = false; if (flat[k3 + 1] <= h) allB = false;
          }
          if (allL || allR || allT || allB) continue;
          var ft = C.clamp((dmax - fog.near) / (fog.far - fog.near), 0, 1);
          var col;
          if (face.tag === 'screen') col = '#0a120c';
          else if (face.tag === 'water') col = C.mixHex('#6e8d9a', '#8fb2bf', 0.5 + 0.5 * Math.sin(t * 1.7));
          else col = shade(face.c, [nwx, nwy, nwz]);
          if (ft > 0.001) col = C.mixHex(col, fogCol, Math.pow(ft, 1.15));
          var op = { t: 'poly', p: flat, c: col, a: polyA, d: dmax, id: inst.id };
          sceneOps.push(op);
          if (face.tag === 'screen' && poly.length === 4 && dmax < 22) screenGlyphs(sceneOps, flat, dmax, t, fi);
          if (face.tag === 'sign' && dmax < 26) signText(sceneOps, flat, dmax, 'PHONE');
        }
      }

      // glyph pass: code mode, or materialize phase
      var wantGlyphs = (mode === 'code') || (matGlyphs && polyA < 1 && !inst.slideFrom) || inst.kind === 'beacon';
      if (wantGlyphs && m.an && m.an.length && glyphBudget > 0) {
        var ga = mode === 'code' ? 1 : C.clamp(1 - polyA, 0, 1);
        if (inst.kind === 'beacon' && mode !== 'code') ga = 0.85;
        var label = inst.label;
        var lod = 1;
        if (oc.d > 16) lod = 2; if (oc.d > 30) lod = 3; if (oc.d > 48) lod = 5;
        var close = oc.d < 7;
        for (var ai = 0; ai < m.an.length; ai += lod) {
          if (glyphBudget-- <= 0) break;
          var an = m.an[ai], ap = an.p;
          var alx = ap[0] * sc, aly = ap[1] * sc, alz = ap[2] * sc;
          var awx = alx * ciy + alz * siy + px0;
          var awz = -alx * siy + alz * ciy + pz0;
          var awy = aly + py0 - glyphRise * ((an.s % 100) / 100 + 0.3);
          var ac = toCam([awx, awy, awz], {});
          if (ac.d < C.ZN || ac.d > fog.far) continue;
          var apr = proj(ac);
          if (apr.x < -20 || apr.x > w + 20 || apr.y < -20 || apr.y > h + 20) continue;
          var br = 1 - C.clamp((ac.d - 1.5) / (fog.far * 0.75), 0, 1);
          var isHead = close && ((an.s + ((t * 2) | 0)) % 7 === 0);
          var ch = C.glyphFor(an.s, t, label, close, ai);
          var gc = mode === 'code'
            ? (isHead ? '#d8ffe8' : C.mixHex('#0b4423', '#46ff7a', br))
            : '#2f9e57';
          var gs = C.clamp(170 / ac.d, 7, 24);
          sceneOps.push({ t: 'g', x: apr.x, y: apr.y, s: gs, ch: ch, c: gc, a: ga * (0.35 + 0.65 * br), d: ac.d });
        }
      }

      // pedestal label orbit
      if (inst.kind === 'pedestal' && inst.label && polyA > 0.3 && mode !== 'code') {
        var word = inst.label.toUpperCase();
        for (var li = 0; li < word.length; li++) {
          var aa2 = t * 0.9 + li / word.length * C.TAU;
          var lp = toCam([px0 + Math.cos(aa2) * 0.55, py0 + 1.45 + Math.sin(t * 2 + li) * 0.05, pz0 + Math.sin(aa2) * 0.55], {});
          if (lp.d < C.ZN) continue;
          var lpr = proj(lp);
          sceneOps.push({ t: 'g', x: lpr.x, y: lpr.y, s: C.clamp(120 / lp.d, 8, 20), ch: word[li], c: '#2f9e57', a: 0.9, d: lp.d });
        }
      }

      // slide streaks
      if (inst.slideFrom && p01 > 0.02 && p01 < 0.62) {
        var dirx = inst.pos[0] - inst.slideFrom[0];
        var sgn = dirx > 0 ? 1 : -1;
        for (var st = 0; st < 4; st++) {
          var sy0 = py0 + 0.3 + st * 0.5;
          var aH = toCam([px0 - sgn * 0.4, sy0, pz0], {}), bH = toCam([px0 - sgn * (3.2 + st), sy0, pz0], {});
          if (aH.d < C.ZN || bH.d < C.ZN) continue;
          var ap2 = proj(aH), bp2 = proj(bH);
          sceneOps.push({ t: 'line', x0: ap2.x, y0: ap2.y, x1: bp2.x, y1: bp2.y, c: '#9aa39d', a: 0.35 * (1 - p01 / 0.62), wpx: 2, d: aH.d });
        }
      }
    }

    function screenGlyphs(out, flat, d, t2, seed) {
      var cols2 = 5, rows = 4;
      for (var gy2 = 0; gy2 < rows; gy2++) {
        for (var gx = 0; gx < cols2; gx++) {
          var u = (gx + 0.5) / cols2, v = (gy2 + 0.5) / rows;
          var topx = C.lerp(flat[6], flat[4], u), topy = C.lerp(flat[7], flat[5], u);
          var botx = C.lerp(flat[0], flat[2], u), boty = C.lerp(flat[1], flat[3], u);
          var X = C.lerp(topx, botx, v), Y = C.lerp(topy, boty, v);
          out.push({ t: 'g', x: X, y: Y, s: Math.max(7, Math.abs(flat[5] - flat[1]) / (rows + 1)), ch: C.glyphFor(seed * 31 + gx * 7 + gy2 * 13, t2), c: '#3dff7c', a: 0.85, d: d - 0.01 });
        }
      }
    }
    function signText(out, flat, d, word) {
      var mx = 0, my = 0;
      for (var i2 = 0; i2 < flat.length; i2 += 2) { mx += flat[i2]; my += flat[i2 + 1]; }
      mx /= flat.length / 2; my /= flat.length / 2;
      out.push({ t: 'text', x: mx, y: my, s: C.clamp(90 / d, 7, 16), str: word, c: '#dfe8e4', a: 0.95, d: d - 0.01, align: 'center' });
    }

    sceneOps.sort(function (a, b) { return b.d - a.d || (a.id || 0) - (b.id || 0); });
    for (var so = 0; so < sceneOps.length; so++) ops.push(sceneOps[so]);

    // viewmodel
    if (game.held && mode !== 'code') {
      var vm = game.held.mesh, kick = game.held.kick || 0, bob = game.held.bob || 0;
      var off = [0.34, -0.34 + Math.sin(bob) * 0.012, -0.62 + kick * 0.1];
      var vops = [];
      for (var vfi = 0; vfi < vm.f.length; vfi++) {
        var vf = vm.f[vfi];
        if (vf.n[2] > 0.95) continue;
        var vpts = [], vdmax = 0;
        for (var vk = 0; vk < vf.i.length; vk++) {
          var lv2 = vm.v[vf.i[vk]];
          // gun local: +x forward -> rotate so it points -z (camera fwd)
          var VS = 0.82;
          var gx2 = lv2[0] * VS, gy3 = (lv2[1] - 0.42) * VS, gz2 = lv2[2] * VS;
          var cx3 = gz2 + off[0], cy3 = gy3 + off[1] + kick * 0.05, cz3 = -gx2 + off[2];
          var cpt2 = { x: cx3, y: cy3, d: -cz3 };
          if (cpt2.d < 0.05) cpt2.d = 0.05;
          vpts.push(cpt2); if (cpt2.d > vdmax) vdmax = cpt2.d;
        }
        var vflat = [];
        for (var vk2 = 0; vk2 < vpts.length; vk2++) { var vpr = proj(vpts[vk2]); vflat.push(vpr.x, vpr.y); }
        vops.push({ t: 'poly', p: vflat, c: shade(vf.c, vf.n), a: 1, d: vdmax });
      }
      vops.sort(function (a, b) { return b.d - a.d; });
      for (var vo = 0; vo < vops.length; vo++) ops.push(vops[vo]);
    }

    // game overlay fx ops (cracks, vignette, flashes, bars, stamps, bursts)
    if (game.fxOps) game.fxOps(ops, w, h, t, proj, toCam);
    return ops;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
