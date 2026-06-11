/* THE CONSTRUCT — 02_mesh.js — geometry builders (pure) */
(function (G) {
  'use strict';
  var C = G.C;

  // Mesh: { v:[[x,y,z]..], f:[{i:[..], c:'#hex', n:[nx,ny,nz], tag?}], an:[{p:[x,y,z], s:seed, fi:faceIdx}] }
  C.newMesh = function () { return { v: [], f: [], an: [] }; };

  function faceNormal(m, idx) {
    var a = m.v[idx[0]], b = m.v[idx[1]], c = m.v[idx[2]];
    return C.norm(C.cross(C.sub(b, a), C.sub(c, a)));
  }

  C.addFace = function (m, idx, col, tag) {
    var f = { i: idx, c: col, n: faceNormal(m, idx) };
    if (tag) f.tag = tag;
    m.f.push(f);
    return f;
  };

  // Axis-aligned box: cx,cz center; y0 bottom. Per-face shading baked (top brightest).
  C.addBox = function (m, cx, y0, cz, w, h, d, col, opts) {
    opts = opts || {};
    var x0 = cx - w / 2, x1 = cx + w / 2, y1 = y0 + h, z0 = cz - d / 2, z1 = cz + d / 2;
    var b = m.v.length;
    m.v.push([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
             [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    var top = opts.flat ? col : C.scaleHex(col, 1.0);
    var sideA = opts.flat ? col : C.scaleHex(col, 0.86);
    var sideB = opts.flat ? col : C.scaleHex(col, 0.74);
    var bot = C.scaleHex(col, 0.6);
    // verified outward windings
    C.addFace(m, [b + 4, b + 5, b + 6, b + 7], sideA, opts.tagZ);          // +z
    C.addFace(m, [b + 1, b + 0, b + 3, b + 2], sideA, opts.tagNZ);         // -z
    C.addFace(m, [b + 5, b + 1, b + 2, b + 6], sideB, opts.tagX);          // +x
    C.addFace(m, [b + 0, b + 4, b + 7, b + 3], sideB, opts.tagNX);         // -x
    C.addFace(m, [b + 3, b + 7, b + 6, b + 2], top, opts.tagTop);          // +y
    if (!opts.noBottom) C.addFace(m, [b + 0, b + 1, b + 5, b + 4], bot);   // -y
    return m;
  };

  // Octagonal "cylinder" (n-gon prism), vertical, base at y0.
  C.addCyl = function (m, cx, y0, cz, r, h, col, n, opts) {
    n = n || 8; opts = opts || {};
    var b = m.v.length, i;
    for (i = 0; i < n; i++) {
      var a = (i / n) * C.TAU;
      m.v.push([cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r]);
    }
    for (i = 0; i < n; i++) {
      var a2 = (i / n) * C.TAU;
      m.v.push([cx + Math.cos(a2) * r, y0 + h, cz + Math.sin(a2) * r]);
    }
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      // outward side quad: bottom_i, bottom_j, top_j, top_i  (CCW from outside)
      var shade = 0.72 + 0.26 * Math.abs(Math.cos((i / n) * C.TAU + 0.6));
      C.addFace(m, [b + j, b + i, b + n + i, b + n + j], opts.flat ? col : C.scaleHex(col, shade));
    }
    // top cap (fan as one n-gon, CCW seen from above)
    var topIdx = [];
    for (i = n - 1; i >= 0; i--) topIdx.push(b + n + i);
    C.addFace(m, topIdx, opts.flat ? col : C.scaleHex(col, 1.0), opts.tagTop);
    if (!opts.noBottom) {
      var botIdx = [];
      for (i = 0; i < n; i++) botIdx.push(b + i);
      C.addFace(m, botIdx, C.scaleHex(col, 0.55));
    }
    return m;
  };

  // Cone (for trees/lamps): apex up.
  C.addCone = function (m, cx, y0, cz, r, h, col, n) {
    n = n || 8;
    var b = m.v.length, i;
    for (i = 0; i < n; i++) {
      var a = (i / n) * C.TAU;
      m.v.push([cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r]);
    }
    var apex = m.v.length; m.v.push([cx, y0 + h, cz]);
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var shade = 0.72 + 0.26 * Math.abs(Math.cos((i / n) * C.TAU + 0.6));
      C.addFace(m, [b + j, b + i, apex], C.scaleHex(col, shade));
    }
    var botIdx = [];
    for (i = 0; i < n; i++) botIdx.push(b + i);
    C.addFace(m, botIdx, C.scaleHex(col, 0.55));
    return m;
  };

  // Flat horizontal quad (ground patches, mats). y up; CCW seen from above.
  C.addQuadY = function (m, x0, z0, x1, z1, y, col, tag) {
    var b = m.v.length;
    m.v.push([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]);
    return C.addFace(m, [b, b + 1, b + 2, b + 3], col, tag);
  };

  // Vertical quad facing +z or given normal sign on an axis.
  C.addQuadZ = function (m, x0, y0, x1, y1, z, col, facePos, tag) {
    var b = m.v.length;
    m.v.push([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]);
    var idx = facePos ? [b, b + 1, b + 2, b + 3] : [b + 1, b, b + 3, b + 2];
    return C.addFace(m, idx, col, tag);
  };
  C.addQuadX = function (m, z0, y0, z1, y1, x, col, facePos, tag) {
    var b = m.v.length;
    m.v.push([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]);
    var idx = facePos ? [b + 1, b, b + 3, b + 2] : [b, b + 1, b + 2, b + 3];
    return C.addFace(m, idx, col, tag);
  };

  // Generate code-vision anchors across face surfaces, ~density per square unit.
  C.anchorize = function (m, density, seed, maxPer) {
    var r = C.rng(seed || 7);
    m.an = [];
    for (var fi = 0; fi < m.f.length; fi++) {
      var f = m.f[fi], idx = f.i;
      // triangulate fan, area-weighted samples
      var a = m.v[idx[0]];
      for (var k = 1; k < idx.length - 1; k++) {
        var b = m.v[idx[k]], c = m.v[idx[k + 1]];
        var ab = C.sub(b, a), ac = C.sub(c, a);
        var area = C.len(C.cross(ab, ac)) * 0.5;
        var n = Math.min(maxPer || 26, Math.max(1, Math.round(area * density)));
        for (var s = 0; s < n; s++) {
          var u = r(), v = r();
          if (u + v > 1) { u = 1 - u; v = 1 - v; }
          m.an.push({
            p: [a[0] + ab[0] * u + ac[0] * v, a[1] + ab[1] * u + ac[1] * v, a[2] + ab[2] * u + ac[2] * v],
            s: (r() * 1e9) | 0, fi: fi
          });
        }
      }
    }
    return m;
  };

  // Compute bounds {min,max} for blob shadows / culling.
  C.meshBounds = function (m) {
    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (var i = 0; i < m.v.length; i++) {
      var p = m.v[i];
      for (var k = 0; k < 3; k++) { if (p[k] < mn[k]) mn[k] = p[k]; if (p[k] > mx[k]) mx[k] = p[k]; }
    }
    m.bounds = { min: mn, max: mx };
    m.radius = Math.max(C.len(mn), C.len(mx));
    return m;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
