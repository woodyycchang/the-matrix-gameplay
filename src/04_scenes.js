/* THE CONSTRUCT — 04_scenes.js — scene programs (pure) */
(function (G) {
  'use strict';
  var C = G.C, P = C.props;

  C.WHITE = '#fbfbf9';

  function inst(mesh, pos, yaw, opts) {
    var o = opts || {};
    return {
      mesh: mesh, pos: pos, yaw: yaw || 0, scale: o.scale || 1,
      loadT: o.loadT == null ? 1 : o.loadT, loadDir: 0, delay: o.delay || 0,
      slideFrom: o.slideFrom || null, label: o.label || '', kind: o.kind || 'prop',
      pose: o.pose || null, shadow: o.shadow !== false, id: (C._iid = (C._iid || 0) + 1)
    };
  }
  C.inst = inst;

  function groundInst(size, y, col) {
    var m = C.newMesh();
    C.addQuadY(m, -size, -size, size, size, y, col, 'ground');
    C.meshBounds(m); m.an = [];
    var g = inst(m, [0, 0, 0], 0, { shadow: false, kind: 'ground', label: 'floor' });
    return g;
  }

  function box(min, max) { return { min: min, max: max }; }

  // ---------------- VOID ----------------
  function sceneVoid() {
    return {
      name: 'construct', sky: 'white', fog: { near: 10, far: 52, col: C.WHITE },
      groundY: 0, ambience: 'void', colliders: [],
      insts: [groundInst(220, 0, C.WHITE)],
      spawn: { pos: [0, 0, 0], yaw: 0 },
      update: function () {}
    };
  }

  // ---------------- WEAPONS ----------------
  function sceneWeapons() {
    var s = sceneVoid();
    s.name = 'armory'; s.ambience = 'void';
    var perSide = 7, z0 = 3.4, dz = 3.15;
    for (var i = 0; i < perSide; i++) {
      var z = z0 + i * dz, d = 0.12 + i * 0.07;
      var L = inst(P.rack(100 + i), [-3.4, 0, z], Math.PI / 2,
        { slideFrom: [-46, 0, z], delay: d, label: 'rack', kind: 'rack' });
      var R = inst(P.rack(200 + i), [3.4, 0, z], -Math.PI / 2,
        { slideFrom: [46, 0, z], delay: d + 0.05, label: 'rack', kind: 'rack' });
      s.insts.push(L, R);
      s.colliders.push(box([-3.75, 0, z - 1.35], [-3.05, 2.2, z + 1.35]));
      s.colliders.push(box([3.05, 0, z - 1.35], [3.75, 2.2, z + 1.35]));
    }
    var tz = z0 + perSide * dz + 0.8;
    var t = inst(P.table(), [0, 0, tz], 0, { delay: 0.9, label: 'table' });
    s.insts.push(t);
    s.colliders.push(box([-0.75, 0, tz - 0.45], [0.75, 0.82, tz + 0.45]));
    var pg = P.pistol();
    s.insts.push(inst(pg, [-0.3, 0.75, tz], 0.4, { delay: 1.1, label: 'pistol', kind: 'gun', gun: 'pistol', shadow: false }));
    s.insts.push(inst(P.pistol(), [0.3, 0.75, tz], -0.5, { delay: 1.2, label: 'pistol', kind: 'gun', gun: 'pistol', shadow: false }));
    s.spawn = { pos: [0, 0, -1.5], yaw: Math.PI };
    return s;
  }

  // ---------------- DOJO ----------------
  function sceneDojo() {
    var W = 13, D = 9, H = 3.3;
    var s = {
      name: 'dojo', sky: 'dojo', fog: { near: 14, far: 40, col: '#d8cfbb' },
      groundY: 0, ambience: 'dojo', colliders: [], insts: [], spawn: { pos: [0, 0, 2.8], yaw: Math.PI },
      update: function () {}
    };
    var m = C.newMesh();
    // plank floor
    var plank = 0.62;
    for (var x = -W / 2; x < W / 2; x += plank) {
      var tone = ((Math.round(x / plank) % 2) === 0) ? '#a8814f' : '#9c7546';
      C.addQuadY(m, x, -D / 2, Math.min(x + plank - 0.02, W / 2), D / 2, 0.001, tone, 'floor');
    }
    // walls: shoji panels between dark posts
    function wallZ(z, facePos) {
      for (var i = 0; i <= 6; i++) C.addBox(m, -W / 2 + i * (W / 6), 0, z, 0.16, H, 0.16, '#4a3826');
      C.addQuadZ(m, -W / 2, 0.55, W / 2, H - 0.25, z + (facePos ? 0.081 : -0.081), '#efe9da', facePos);
      C.addQuadZ(m, -W / 2, 0, W / 2, 0.55, z + (facePos ? 0.081 : -0.081), '#5c4128', facePos);
      C.addBox(m, 0, H - 0.25, z, W, 0.25, 0.3, '#4a3826');
    }
    function wallX(x, facePos) {
      for (var i = 0; i <= 4; i++) C.addBox(m, x, 0, -D / 2 + i * (D / 4), 0.16, H, 0.16, '#4a3826');
      C.addQuadX(m, -D / 2, 0.55, D / 2, H - 0.25, x + (facePos ? 0.081 : -0.081), '#efe9da', facePos);
      C.addQuadX(m, -D / 2, 0, D / 2, 0.55, x + (facePos ? 0.081 : -0.081), '#5c4128', facePos);
      C.addBox(m, x, H - 0.25, 0, 0.3, 0.25, D, '#4a3826');
    }
    wallZ(-D / 2, true); wallZ(D / 2, false); wallX(-W / 2, true); wallX(W / 2, false);
    // ceiling beams
    for (var bz = -D / 2 + 1.5; bz < D / 2; bz += 2.0) C.addBox(m, 0, H - 0.05, bz, W, 0.18, 0.22, '#3c2d1e');
    // sparring mats
    C.addQuadY(m, -2.4, -2.0, 2.4, 2.0, 0.02, '#7d8488', 'floor');
    C.addQuadY(m, -2.2, -1.8, 2.2, 1.8, 0.025, '#8c9296', 'floor');
    C.anchorize(m, 1.05, 71, 16); C.meshBounds(m);
    s.insts.push(inst(m, [0, 0, 0], 0, { shadow: false, kind: 'room', label: 'dojo' }));
    s.insts.push(inst(P.dummy(), [-4.6, 0, -2.4], 0.6, { label: 'dummy', kind: 'dummy' }));
    s.insts.push(inst(P.bench(), [4.9, 0, -3.4], Math.PI / 2, { label: 'bench' }));
    var t = 0.45;
    s.colliders.push(box([-W / 2 - 1, 0, -D / 2 - t], [W / 2 + 1, H, -D / 2 + t]));
    s.colliders.push(box([-W / 2 - 1, 0, D / 2 - t], [W / 2 + 1, H, D / 2 + t]));
    s.colliders.push(box([-W / 2 - t, 0, -D / 2 - 1], [-W / 2 + t, H, D / 2 + 1]));
    s.colliders.push(box([W / 2 - t, 0, -D / 2 - 1], [W / 2 + t, H, D / 2 + 1]));
    s.colliders.push(box([-4.95, 0, -2.75], [-4.25, 1.7, -2.05])); // dummy
    s.dummyPos = [-4.6, 0, -2.4];
    return s;
  }

  // ---------------- ROOFTOP (jump program) ----------------
  C.ROOF = {
    y: 40, gap: 7.6,
    aMin: [-27, 0, -9], aMax: [-4, 40, 9],
    bMin: [3.6, 0, -9], bMax: [25, 40, 9],
    edgeX: -4, landX: 3.6, beacon: [8.5, 40, 0],
    spawn: [-24.5, 40, 0]
  };
  function sceneRoof() {
    var R = C.ROOF;
    var s = {
      name: 'jump program', sky: 'city', fog: { near: 45, far: 170, col: '#c4ccd2' },
      groundY: 0, ambience: 'wind', colliders: [], insts: [],
      spawn: { pos: [R.spawn[0], R.y, R.spawn[2]], yaw: Math.PI / 2 },
      update: function () {}
    };
    var m = C.newMesh();
    function tower(min, max, col) {
      C.addBox(m, (min[0] + max[0]) / 2, 0, (min[2] + max[2]) / 2, max[0] - min[0], max[1], max[2] - min[2], col, { noBottom: true });
    }
    tower(R.aMin, R.aMax, '#8d9298');
    tower(R.bMin, R.bMax, '#83898f');
    // gravel roof caps
    C.addQuadY(m, R.aMin[0] + 0.1, R.aMin[2] + 0.1, R.aMax[0] - 0.1, R.aMax[2] - 0.1, R.y + 0.02, '#a9adb1', 'floor');
    C.addQuadY(m, R.bMin[0] + 0.1, R.bMin[2] + 0.1, R.bMax[0] - 0.1, R.bMax[2] - 0.1, R.y + 0.02, '#a2a6aa', 'floor');
    // side parapets (not on the jump edges)
    function parapet(x0, x1, z) { C.addBox(m, (x0 + x1) / 2, R.y, z, x1 - x0, 0.55, 0.35, '#7c8187'); }
    parapet(R.aMin[0], R.aMax[0], R.aMin[2] + 0.4); parapet(R.aMin[0], R.aMax[0], R.aMax[2] - 0.4);
    parapet(R.bMin[0], R.bMax[0], R.bMin[2] + 0.4); parapet(R.bMin[0], R.bMax[0], R.bMax[2] - 0.4);
    parapet(R.bMax[0] - 0.55, R.bMax[0], 0); // far end cap (short)
    // rooftop clutter
    C.addBox(m, -22, R.y, -5.5, 2.4, 1.5, 2.0, '#6f747a');
    C.addBox(m, -22, R.y + 1.5, -5.5, 1.2, 0.5, 1.2, '#62666c');
    C.addBox(m, 16, R.y, 5.2, 2.0, 1.2, 1.8, '#6f747a');
    C.addBox(m, -10, R.y, 6.2, 1.0, 2.6, 1.0, '#5d6167'); // vent stack
    // canyon facade bands: window strips on the two gap walls (fall-speed cues)
    for (var fy = 3; fy < R.y - 2; fy += 3) {
      var bandCol = ((fy / 3) % 2 === 0) ? '#5b646d' : '#525a62';
      C.addQuadX(m, R.aMin[2] + 0.3, fy, R.aMax[2] - 0.3, fy + 1.5, R.aMax[0] + 0.02, bandCol, true);
      C.addQuadX(m, R.bMin[2] + 0.3, fy, R.bMax[2] - 0.3, fy + 1.5, R.bMin[0] - 0.02, bandCol, false);
    }
    // the street at the bottom of the canyon
    C.addQuadY(m, R.aMax[0] - 0.4, -34, R.bMin[0] + 0.4, 34, 0.012, '#43474b', 'floor');
    for (var dz2 = -32; dz2 < 32; dz2 += 4) {
      C.addQuadY(m, -0.36, dz2, -0.04, dz2 + 1.7, 0.02, '#9ba1a5', 'floor');
    }
    C.addQuadY(m, R.aMax[0] - 1.5, -34, R.aMax[0] - 0.4, 34, 0.016, '#7f848a', 'floor'); // sidewalks
    C.addQuadY(m, R.bMin[0] + 0.4, -34, R.bMin[0] + 1.5, 34, 0.016, '#7f848a', 'floor');
    // street + skyline silhouettes
    var r = C.rng(909);
    for (var i = 0; i < 26; i++) {
      var a = (i / 26) * C.TAU + r() * 0.18;
      var rad = 70 + r() * 80;
      var bw = 10 + r() * 16, bh = 18 + r() * 95;
      var bx = Math.cos(a) * rad, bz = Math.sin(a) * rad;
      C.addBox(m, bx, 0, bz, bw, bh, bw * (0.8 + r() * 0.5), C.mixHex('#5e666e', '#9aa4ac', r() * 0.8), { noBottom: true });
    }
    C.anchorize(m, 0.06, 72, 10); C.meshBounds(m);
    s.insts.push(inst(m, [0, 0, 0], 0, { shadow: false, kind: 'world', label: 'city' }));
    s.insts.push(groundInst(260, 0, '#74797f'));
    s.insts.push(inst(P.beacon(), [R.beacon[0], R.y + 0.02, R.beacon[2]], 0, { label: 'land here', kind: 'beacon', shadow: false }));
    s.colliders.push(box(R.aMin, R.aMax), box(R.bMin, R.bMax));
    s.colliders.push(box([-22 - 1.2, R.y, -5.5 - 1.0], [-22 + 1.2, R.y + 1.5, -5.5 + 1.0]));
    s.colliders.push(box([R.aMin[0], R.y, R.aMin[2]], [R.aMax[0], R.y + 0.55, R.aMin[2] + 0.6]));
    s.colliders.push(box([R.aMin[0], R.y, R.aMax[2] - 0.6], [R.aMax[0], R.y + 0.55, R.aMax[2]]));
    s.colliders.push(box([R.bMin[0], R.y, R.bMin[2]], [R.bMax[0], R.y + 0.55, R.bMin[2] + 0.6]));
    s.colliders.push(box([R.bMin[0], R.y, R.bMax[2] - 0.6], [R.bMax[0], R.y + 0.55, R.bMax[2]]));
    return s;
  }

  // ---------------- CITY (lunch hour) ----------------
  function sceneCity() {
    var s = {
      name: 'lunch hour', sky: 'day', fog: { near: 30, far: 95, col: '#cfd4d6' },
      groundY: 0, ambience: 'crowd', colliders: [], insts: [],
      spawn: { pos: [-14, 0, 0.4], yaw: Math.PI / 2 },
      crowd: [], update: null
    };
    var m = C.newMesh();
    C.addQuadY(m, -60, -20, 60, 20, 0.001, '#b9bcbe', 'floor');         // plaza
    C.addQuadY(m, -60, -7.2, 60, 7.2, 0.004, '#c6c9cb', 'floor');       // walkway
    for (var sx = -56; sx < 60; sx += 4) {                               // paving seams
      C.addQuadY(m, sx, -7.2, sx + 0.06, 7.2, 0.006, '#aeb1b3', 'floor');
    }
    var r = C.rng(515);
    for (var i = 0; i < 9; i++) {                                        // building rows
      var bw = 9 + r() * 5, bh = 9 + r() * 14;
      var bx = -44 + i * 11;
      C.addBox(m, bx, 0, -14.5, bw, bh, 9, C.mixHex('#8c9094', '#b3a999', r()), { noBottom: true });
      C.addBox(m, bx, 0, -9.6, bw, 3.4, 0.9, '#6f7478', { noBottom: true }); // storefront band
      var bw2 = 9 + r() * 5, bh2 = 9 + r() * 14;
      C.addBox(m, bx + 4, 0, 14.5, bw2, bh2, 9, C.mixHex('#8c9094', '#a9a294', r()), { noBottom: true });
      C.addBox(m, bx + 4, 0, 9.6, bw2, 3.4, 0.9, '#6f7478', { noBottom: true });
    }
    C.anchorize(m, 0.045, 73, 8); C.meshBounds(m);
    s.insts.push(inst(m, [0, 0, 0], 0, { shadow: false, kind: 'world', label: 'street' }));
    var props = [
      inst(P.fountain(), [12, 0, 0], 0, { label: 'fountain' }),
      inst(P.lamppost(), [-8, 0, -6.6], 0, { label: 'lamp' }),
      inst(P.lamppost(), [4, 0, 6.6], Math.PI, { label: 'lamp' }),
      inst(P.lamppost(), [22, 0, -6.6], 0, { label: 'lamp' }),
      inst(P.bench(), [-2, 0, -6.4], 0, { label: 'bench' }),
      inst(P.bench(), [18, 0, 6.4], Math.PI, { label: 'bench' }),
      inst(P.tree(61), [-20, 0, -6.6], 0, { label: 'tree' }),
      inst(P.tree(62), [28, 0, 6.6], 0, { label: 'tree' }),
      inst(P.car('#4d5a64'), [-30, 0, 10.5], 0.06, { label: 'car' }),
      inst(P.car('#6a5f55'), [34, 0, -10.8], Math.PI - 0.05, { label: 'car' })
    ];
    for (var p = 0; p < props.length; p++) s.insts.push(props[p]);
    s.colliders.push(box([9.6, 0, -2.4], [14.4, 1.1, 2.4]));            // fountain
    s.colliders.push(box([-60, 0, -20.5], [60, 12, -9.4]));             // building rows
    s.colliders.push(box([-60, 0, 9.4], [60, 12, 20.5]));
    return s;
  }

  C.makeScene = function (name) {
    switch (name) {
      case 'weapons': return sceneWeapons();
      case 'dojo': return sceneDojo();
      case 'rooftop': return sceneRoof();
      case 'city': return sceneCity();
      default: return sceneVoid();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
