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
  // ---- the cat is a pure function of the tick (ported) ----
  C.catPose = function (p) {
    var u = p / (HALL.N - 1);
    var ph = p * 0.145, s = Math.sin(ph);
    return [
      HALL.CAT_X0 + (HALL.CAT_X1 - HALL.CAT_X0) * u,   // x
      Math.abs(Math.cos(ph)) * 0.018,                   // y bob
      HALL.CAT_Z,                                       // z, hugging the north wall
      Math.PI / 2,                                      // yaw: nose toward +x
      s * 0.6, -s * 0.6, -s * 0.6, s * 0.6,             // diagonal leg pairs
      Math.sin(ph * 0.42) * 0.4                         // tail swish
    ];
  };

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
      groundY: 0, ambience: 'dojo', colliders: [], insts: [], spawn: { pos: [0, 0, 3.2], yaw: 0 },   // entry side, dead square down the long axis (fwd = (sin,-cos): yaw 0 faces -z)
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

  // ---------------- CITY (lunch hour — INFINITE boulevard) ----------------
  // Same first-principles result as neon: the street is a block pattern repeated along
  // x, so it streams. Chunks of boulevard spawn around the walker; crowd recycles around
  // the player. The plaza and storefronts continue forever.
  var CITY_CHUNK = 88;
  var CITY_AHEAD = 2, CITY_BEHIND = 2;
  function cityChunkMesh(ci) {
    var m = C.newMesh();
    var x0 = ci * CITY_CHUNK, x1 = x0 + CITY_CHUNK;
    C.addQuadY(m, x0, -20, x1, 20, 0.001, '#b9bcbe', 'floor');         // plaza
    C.addQuadY(m, x0, -7.2, x1, 7.2, 0.004, '#c6c9cb', 'floor');       // walkway
    for (var sx = x0; sx < x1; sx += 4) C.addQuadY(m, sx, -7.2, sx + 0.06, 7.2, 0.006, '#aeb1b3', 'floor');
    var r = C.rng(515 + ci * 13);
    for (var i = 0; i < 8; i++) {
      var bx = x0 + i * 11;
      var bw = 9 + r() * 5, bh = 9 + r() * 14;
      C.addBox(m, bx, 0, -14.5, bw, bh, 9, C.mixHex('#8c9094', '#b3a999', r()), { noBottom: true });
      C.addBox(m, bx, 0, -9.6, bw, 3.4, 0.9, '#6f7478', { noBottom: true });
      var bw2 = 9 + r() * 5, bh2 = 9 + r() * 14;
      C.addBox(m, bx + 4, 0, 14.5, bw2, bh2, 9, C.mixHex('#8c9094', '#a9a294', r()), { noBottom: true });
      C.addBox(m, bx + 4, 0, 9.6, bw2, 3.4, 0.9, '#6f7478', { noBottom: true });
    }
    C.anchorize(m, 0.045, 73, 8); C.meshBounds(m);
    return m;
  }
  function sceneCity() {
    var s = {
      name: 'lunch hour', sky: 'day', fog: { near: 30, far: 95, col: '#cfd4d6' },
      groundY: 0, ambience: 'crowd', colliders: [], insts: [],
      spawn: { pos: [0, 0, 0.4], yaw: Math.PI / 2 },
      crowd: [], update: null, infinite: true, chunks: {}
    };
    // persistent building-row walls along both sides (span far in x)
    s.colliders.push(box([-1e6, 0, -20.5], [1e6, 12, -9.4]));
    s.colliders.push(box([-1e6, 0, 9.4], [1e6, 12, 20.5]));
    // a couple of landmarks near the origin so the start isn't bare
    s.insts.push(inst(P.fountain(), [12, 0, -6], 0, { label: 'fountain' }));
    s.insts.push(inst(P.bench(), [-2, 0, -6.4], 0, { label: 'bench' }));
    s.insts.push(inst(P.tree(61), [-20, 0, 6.6], 0, { label: 'tree' }));
    s.colliders.push(box([9.6, 0, -8.4], [14.4, 1.1, -3.6]));            // fountain (off to the side)
    s._cityChunkAt = cityChunkMesh;
    s._streamCity = function (game) {
      var px = game.player.pos[0];
      var cur = Math.round(px / CITY_CHUNK);
      var lo = cur - CITY_BEHIND, hi = cur + CITY_AHEAD;
      for (var ci = lo; ci <= hi; ci++) {
        if (!s.chunks[ci]) {
          var it = inst(cityChunkMesh(ci), [0, 0, 0], 0, { shadow: false, kind: 'world', label: 'street' });
          it.loadT = 1; it.loadDir = 0;
          s.chunks[ci] = it; s.insts.push(it);
        }
      }
      for (var key in s.chunks) {
        var k = +key;
        if (k < lo || k > hi) {
          var idx = s.insts.indexOf(s.chunks[k]);
          if (idx >= 0) s.insts.splice(idx, 1);
          delete s.chunks[k];
        }
      }
    };
    s._streamCity({ player: { pos: s.spawn.pos } });   // seed first chunks
    return s;
  }

  // ---------------- NEON (the cyber street — an INFINITE riding program) ----------------
  // Evaluated by first principles: the mile is a pattern repeated along -z, so it can
  // stream forever. Chunks of street spawn ahead of the rider and recycle behind; the
  // ground and side-walls follow the player. Memory stays constant, the road never ends.
  var NEON_CHUNK = 95;        // length of one street segment
  var NEON_AHEAD = 4;         // chunks kept in front
  var NEON_BEHIND = 2;        // chunks kept behind
  function neonChunkMesh(ci) {
    var m = C.newMesh();
    var z0 = -ci * NEON_CHUNK, z1 = z0 - NEON_CHUNK;
    var r = C.rng(820 + ci * 7), hues = ['#19e3ff', '#ff2bd6', '#ffd166', '#9fffe0', '#b9a8ff'];
    // road + sidewalks for this segment
    C.addQuadY(m, -10.2, z1, 10.2, z0, 0.001, '#07070e', 'floor');
    C.addQuadY(m, -12.6, z1, -10.2, z0, 0.004, '#0c0c16', 'floor');
    C.addQuadY(m, 10.2, z1, 12.6, z0, 0.004, '#0c0c16', 'floor');
    // curb neon strips
    C.addQuadY(m, -10.3, z1, -10.0, z0, 0.02, '#ff2bd6', 'floor');
    C.addQuadY(m, 10.0, z1, 10.3, z0, 0.02, '#ff2bd6', 'floor');
    C.addQuadY(m, -3.3, z1, -3.05, z0, 0.02, '#19e3ff', 'floor');
    C.addQuadY(m, -6.95, z1, -6.7, z0, 0.02, '#19e3ff', 'floor');
    C.addQuadY(m, 3.05, z1, 3.3, z0, 0.02, '#19e3ff', 'floor');
    C.addQuadY(m, 6.7, z1, 6.95, z0, 0.02, '#19e3ff', 'floor');
    // centreline dashes
    for (var cz = z0 - 4; cz > z1; cz -= 9) C.addQuadY(m, -0.28, cz, 0.28, cz + 4.4, 0.02, '#ff2bd6', 'floor');
    // towers along this segment, both rows
    for (var i = 0; i < 10; i++) {
      var z = z0 - 4 - i * 9.5;
      var htL = 14 + r() * 26;
      C.addBox(m, -15.5 - r() * 2, 0, z, 4 + r() * 2.5, htL, 6 + r() * 3, '#0a0a14', { noBottom: true });
      C.addQuadX(m, z - htL * 0.46, 1, z + htL * 0.46, htL * 0.92, -12.6, hues[(i + ci) % 5], true);
      C.addQuadX(m, z - 1.0, 0, z + 1.0, 2.4, -12.55, '#2b0b3c', true);
      C.addQuadX(m, z - 1.9, 5.6, z + 1.9, 7.4, -12.55, (r() < 0.2 ? '#f5f7ff' : hues[(i * 3 + ci) % 5]), true);
      var htR = 14 + r() * 26;
      C.addBox(m, 15.5 + r() * 2, 0, z + 4, 4 + r() * 2.5, htR, 6 + r() * 3, '#0a0a14', { noBottom: true });
      C.addQuadX(m, z + 4 - htR * 0.46, 1, z + 4 + htR * 0.46, htR * 0.92, 12.6, hues[(i + ci + 2) % 5], false);
      C.addQuadX(m, z + 3.0, 0, z + 5.0, 2.4, 12.55, '#2b0b3c', false);
      C.addQuadX(m, z + 2.1, 5.6, z + 5.9, 7.4, 12.55, (r() < 0.2 ? '#f5f7ff' : hues[(i * 3 + ci + 2) % 5]), false);
    }
    C.anchorize(m, 0.05, 73, 8); C.meshBounds(m);
    return m;
  }
  function sceneNeon() {
    var s = {
      name: 'neon mile', sky: 'neon', fog: { near: 26, far: 150, col: '#0c0a18' },
      groundY: 0, ambience: 'neon', colliders: [],
      insts: [], spawn: { pos: [0, 0, 6], yaw: 0 }, infinite: true, chunks: {}
    };
    // persistent side-walls + a bike at the line
    s.colliders.push(box([-16.5, 0, -1e6], [-9.9, 14, 1e6]));
    s.colliders.push(box([9.9, 0, -1e6], [16.5, 14, 1e6]));
    s.insts.push(inst(P.lamppost(), [-12.9, 0, -6], 0, { label: 'lamp' }));
    s.insts.push(inst(P.bike(), [1.4, 0, 0], 0, { kind: 'bike', label: 'motorcycle' }));
    // TRAFFIC (branch-ported): six lanes, both flows, ring-recycled around the rider
    s.traffic = [];
    var LANES = [-8.4, -5.0, -1.6, 1.6, 5.0, 8.4], carHues = ['#19e3ff', '#ff2bd6', '#ffd166', '#9fffe0', '#b9a8ff'];
    for (var tvi = 0; tvi < 14; tvi++) {
      var lane = LANES[tvi % 6];
      var tdir = lane < 0 ? 1 : -1;                    // left flows toward you, right flows with you
      var itc = inst(P.car(carHues[tvi % 5]), [lane, 0, -20 - tvi * 34], tdir > 0 ? Math.PI : 0, { kind: 'car', label: 'traffic' });
      s.insts.push(itc);
      s.traffic.push({ it: itc, dir: tdir, speed: 6 + ((tvi * 37) % 50) / 10 });
    }
    // chunk manager: keep a window of segments around the rider's z
    s.update = function (game) {
      var pz = game.player.pos[2];
      // move + ring-recycle the river around the rider
      var tnow = game.time || 0, dtv = Math.min(0.05, tnow - (s._tT === undefined ? tnow : s._tT)); s._tT = tnow;
      for (var tri = 0; tri < s.traffic.length; tri++) {
        var trv = s.traffic[tri];
        trv.it.pos[2] += trv.dir * trv.speed * dtv;
        if (trv.it.pos[2] > pz + 60) trv.it.pos[2] = pz - 150 - (tri % 5) * 9;
        if (trv.it.pos[2] < pz - 170) trv.it.pos[2] = pz + 45 + (tri % 4) * 8;
      }
      var cur = Math.max(0, Math.round(-pz / NEON_CHUNK));
      var lo = Math.max(0, cur - NEON_BEHIND), hi = cur + NEON_AHEAD;
      // spawn missing chunks in range
      for (var ci = lo; ci <= hi; ci++) {
        if (!s.chunks[ci]) {
          var it = inst(neonChunkMesh(ci), [0, 0, 0], 0, { shadow: false, kind: 'world', label: 'the mile' });
          it.loadT = 1; it.loadDir = 0;
          s.chunks[ci] = it; s.insts.push(it);
        }
      }
      // recycle chunks outside the window
      for (var key in s.chunks) {
        var k = +key;
        if (k < lo || k > hi) {
          var inst2 = s.chunks[k];
          var idx = s.insts.indexOf(inst2);
          if (idx >= 0) s.insts.splice(idx, 1);
          delete s.chunks[k];
        }
      }
    };
    // seed the first window immediately so the road exists on the first frame
    s.update({ player: { pos: s.spawn.pos } });
    return s;
  }


  // ---- hallway shared constants (ported) ----
  var HALL = C.HALL = {
    HL: 9.5, HW: 1.25, H: 2.7,
    TICK: 1 / 60, SETTLE: 150, N: 420, GLITCH: 52, GLITCH_AT: 20, SEAL_AT: 30, SEGP: 7.2,
    CAT_X0: -3.72, CAT_X1: 3.72, CAT_Z: -1.08
  };

  function applyCat(it, st) {
    it.pos[0] = st[0]; it.pos[1] = st[1]; it.pos[2] = st[2];
    it.yaw = st[3];
    it.pose[1] = st[4]; it.pose[2] = st[5]; it.pose[3] = st[6]; it.pose[4] = st[7]; it.pose[5] = st[8];
  }

  function mutateFixture(it) {
    it.mesh = it.mut.make();
    it.state = it.mut.alt;
    if (it.mut.label) it.label = it.mut.label;
    it._wv = null;
    it.glyphEpoch = (it.glyphEpoch | 0) + 1;
    it.reResolve = 1;
    it.loadT = 0; it.loadDir = 1; it._delay = 0.1;
  }

  function sceneHallway() {
    var HL = HALL.HL, HW = HALL.HW, H = HALL.H;
    var s = {
      name: 'hallway', sky: 'hall', fog: { near: 8, far: 34, col: '#14100d' },
      groundY: 0, ambience: 'hall', colliders: [], insts: [],
      spawn: { pos: [8.2, 0, 0], yaw: -Math.PI / 2 },
      update: null
    };
    var m = C.newMesh();
    function ceilQuad(x0, z0, x1, z1, y, col) {
      var b = m.v.length;
      m.v.push([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]);
      return C.addFace(m, [b, b + 1, b + 2, b + 3], col);
    }
    // floor: old planks + a runner
    for (var px = -HL; px < HL + 2.1; px += 0.55) {
      var tone = ((Math.round(px / 0.55) % 2) === 0) ? '#3b2f22' : '#342a1e';
      if (px >= HL) tone = ((Math.round(px / 0.55) % 2) === 0) ? '#4a4a46' : '#444440';
      C.addQuadY(m, px, -HW, Math.min(px + 0.53, HL + 2.1), HW, 0.001, tone, 'floor');
    }
    C.addQuadY(m, -HL + 0.3, -0.52, HL - 0.3, 0.52, 0.006, '#571f1f', 'floor');   // runner
    C.addQuadY(m, -HL + 0.3, -0.52, HL - 0.3, -0.46, 0.008, '#7a5a2b', 'floor');
    C.addQuadY(m, -HL + 0.3, 0.46, HL - 0.3, 0.52, 0.008, '#7a5a2b', 'floor');
    // walls: wainscot below, plaster field above; the north wall skips the lit alcove
    var WAIN = '#403428', FIELD = '#6a6156', SKIRT = '#241d16', RAIL = '#4a3e31';
    function wallN(x0, x1) {   // faces +z
      C.addQuadZ(m, x0, 0, x1, 0.14, -HW + 0.02, SKIRT, true);
      C.addQuadZ(m, x0, 0.14, x1, 0.95, -HW + 0.02, WAIN, true);
      C.addQuadZ(m, x0, 0.95, x1, H, -HW + 0.02, FIELD, true);
      C.addQuadZ(m, x0, 2.22, x1, 2.28, -HW + 0.025, RAIL, true);
    }
    function wallS(x0, x1) {   // faces -z
      C.addQuadZ(m, x0, 0, x1, 0.14, HW - 0.02, SKIRT, false);
      C.addQuadZ(m, x0, 0.14, x1, 0.95, HW - 0.02, WAIN, false);
      C.addQuadZ(m, x0, 0.95, x1, H, HW - 0.02, FIELD, false);
      C.addQuadZ(m, x0, 2.22, x1, 2.28, HW - 0.025, RAIL, false);
    }
    wallN(-HL, 0.55); wallN(1.45, HL);
    wallS(-HL, HL);
    // chimney breasts give the corridor rhythm and hide the cat's entry and exit
    [-3.8, 3.8].forEach(function (bx) {
      C.addBox(m, bx, 0, -HW + 0.12, 0.7, H, 0.24, FIELD, { noBottom: true });
      C.addBox(m, bx, 0, HW - 0.12, 0.7, H, 0.24, FIELD, { noBottom: true });
    });
    // decorative closed doors (painted shut, part of the wall)
    [[-6.6, -1], [-4.9, 1], [6.4, 1], [-7.6, 1]].forEach(function (dd) {
      var dx = dd[0], side = dd[1];
      var zq = side < 0 ? -HW + 0.03 : HW - 0.03;
      C.addQuadZ(m, dx - 0.45, 0.02, dx + 0.45, 2.02, zq, '#241c15', side < 0);
      C.addQuadZ(m, dx - 0.52, 2.02, dx + 0.52, 2.12, zq, '#2c221a', side < 0);
    });
    // the lit alcove the cat crosses: recess, warm back wall, light spilling out
    C.addQuadX(m, -HW - 0.86, 0, -HW, 2.06, 0.56, '#4a3c2c', false);
    C.addQuadX(m, -HW - 0.86, 0, -HW, 2.06, 1.44, '#4a3c2c', true);
    C.addQuadZ(m, 0.56, 0, 1.44, 2.06, -HW - 0.84, '#8a7452', true);
    C.addQuadZ(m, 0.60, 0.15, 1.40, 1.85, -HW - 0.835, '#c9a765', true);
    C.addQuadY(m, 0.55, -HW - 0.84, 1.45, -HW, 0.004, '#6e5636', 'floor');
    ceilQuad(0.55, -HW - 0.84, 1.45, -HW, 2.06, '#5a4830');
    C.addQuadY(m, 0.45, -HW, 1.55, -HW + 0.85, 0.01, '#caa25f', 'floor');   // spill, bright
    C.addQuadY(m, 0.35, -HW + 0.85, 1.65, -HW + 1.7, 0.012, '#8a6b3f', 'floor'); // spill, dim
    C.addBox(m, 0.52, 0, -HW + 0.02, 0.08, 2.1, 0.1, '#2c221a');   // alcove jambs
    C.addBox(m, 1.48, 0, -HW + 0.02, 0.08, 2.1, 0.1, '#2c221a');
    C.addBox(m, 1.0, 2.06, -HW + 0.02, 1.06, 0.09, 0.1, '#2c221a');
    // far end: a double door that never opens (until it does) — a swappable fixture, not room geometry
    // ceiling with beams
    ceilQuad(-HL, -HW, HL + 2.1, HW, H, '#4c4238');
    for (var bz = -HL + 1.4; bz < HL; bz += 2.4) C.addBox(m, bz, H - 0.1, 0, 0.2, 0.1, 2 * HW, '#2e2620');
    // the landing beyond the archway (the way you came in)
    C.addQuadZ(m, HL, 0, HL + 2.1, H, -HW + 0.02, '#565048', true);
    C.addQuadZ(m, HL, 0, HL + 2.1, H, HW - 0.02, '#565048', false);
    C.addQuadX(m, -HW, 0, HW, H, HL + 2.08, '#7e8a86', false);
    C.addQuadX(m, -0.6, 0.1, 0.6, 2.0, HL + 2.06, '#9fb0aa', false);   // stairwell glow
    C.addQuadY(m, HL + 0.1, -0.8, HL + 1.9, 0.8, 0.01, '#5f6a66', 'floor');
    C.anchorize(m, 0.9, 74, 12); C.meshBounds(m);
    s.insts.push(inst(m, [0, 0, 0], 0, { shadow: false, kind: 'room', label: 'hallway' }));

    function mkFarEnd() {
      var fm = C.newMesh();
      // full-height wall around a 1.7 m doorway; the leaves are separate hinged instances
      C.addQuadX(fm, -HW, 0, -0.85, H, 0.02, '#544a3e', true);
      C.addQuadX(fm, 0.85, 0, HW, H, 0.02, '#544a3e', true);
      C.addQuadX(fm, -0.85, 2.05, 0.85, H, 0.02, '#544a3e', true);
      C.addBox(fm, -0.89, 0, 0, 0.1, 2.1, 0.14, '#2c221a');
      C.addBox(fm, 0.89, 0, 0, 0.1, 2.1, 0.14, '#2c221a');
      C.addBox(fm, 0, 2.05, 0, 1.88, 0.09, 0.14, '#2c221a');
      C.addQuadX(fm, -0.83, 0.02, 0.83, 2.04, -0.09, '#0a0806', true);   // the dark past the frame
      C.anchorize(fm, 0.8, 57, 8); C.meshBounds(fm);
      return fm;
    }
    function leafPair(x, delay) {
      var L2 = inst(C.props.doorLeaf(false), [x, 0, -0.85], 0, { label: 'door', kind: 'leaf', shadow: false });
      var R2 = inst(C.props.doorLeaf(true), [x, 0, 0.85], 0, { label: 'door', kind: 'leaf', shadow: false });
      L2.pose = [0, 0, 0, 0, 0, 0]; R2.pose = [0, 0, 0, 0, 0, 0];
      if (delay != null) { L2.loadT = 0; L2.loadDir = 1; L2._delay = delay; R2.loadT = 0; R2.loadDir = 1; R2._delay = delay; }
      return [L2, R2];
    }
    var SEGP = HALL.SEGP;
    function mkSegMesh() {
      var sm = C.newMesh();
      var hp = SEGP / 2;
      for (var sx = -hp; sx < hp; sx += 0.55) {
        var tn = ((Math.round(sx / 0.55) % 2) === 0) ? '#3b2f22' : '#342a1e';
        C.addQuadY(sm, sx, -HW, Math.min(sx + 0.53, hp), HW, 0.001, tn, 'floor');
      }
      C.addQuadY(sm, -hp, -0.52, hp, 0.52, 0.006, '#571f1f', 'floor');
      C.addQuadY(sm, -hp, -0.52, hp, -0.46, 0.008, '#7a5a2b', 'floor');
      C.addQuadY(sm, -hp, 0.46, hp, 0.52, 0.008, '#7a5a2b', 'floor');
      function wseg(z, front) {
        C.addQuadZ(sm, -hp, 0, hp, 0.14, z, SKIRT, front);
        C.addQuadZ(sm, -hp, 0.14, hp, 0.95, z, WAIN, front);
        C.addQuadZ(sm, -hp, 0.95, hp, H, z, FIELD, front);
        C.addQuadZ(sm, -hp, 2.22, hp, 2.28, z + (front ? 0.005 : -0.005), RAIL, front);
      }
      wseg(-HW + 0.02, true); wseg(HW - 0.02, false);
      C.addBox(sm, 0, 0, -HW + 0.12, 0.7, H, 0.24, FIELD, { noBottom: true });
      C.addBox(sm, 0, 0, HW - 0.12, 0.7, H, 0.24, FIELD, { noBottom: true });
      [[-1.9, -1], [1.9, 1]].forEach(function (dd) {
        var zq = dd[1] < 0 ? -HW + 0.03 : HW - 0.03;
        C.addQuadZ(sm, dd[0] - 0.45, 0.02, dd[0] + 0.45, 2.02, zq, '#241c15', dd[1] < 0);
        C.addQuadZ(sm, dd[0] - 0.52, 2.02, dd[0] + 0.52, 2.12, zq, '#2c221a', dd[1] < 0);
      });
      C.addBox(sm, 0, 0, -0.89, 0.14, 2.1, 0.1, '#2c221a');   // doorframe: jambs + lintel + header
      C.addBox(sm, 0, 0, 0.89, 0.14, 2.1, 0.1, '#2c221a');
      C.addBox(sm, 0, 2.05, 0, 0.14, 0.09, 1.88, '#2c221a');
      C.addQuadX(sm, -HW, 2.14, HW, H, 0.03, '#544a3e', true);
      C.addQuadX(sm, -HW, 2.14, HW, H, -0.03, '#544a3e', false);
      var cb = sm.v.length;
      sm.v.push([-hp, H, -HW], [hp, H, -HW], [hp, H, HW], [-hp, H, HW]);
      C.addFace(sm, [cb, cb + 1, cb + 2, cb + 3], '#4c4238');
      for (var bxx = -2.4; bxx <= 2.4; bxx += 2.4) C.addBox(sm, bxx, H - 0.1, 0, 0.2, 0.1, 2 * HW, '#2e2620');
      C.anchorize(sm, 0.5, 91, 6); C.meshBounds(sm);
      return sm;
    }

    // fixtures: candidates carry a `mut` descriptor; the glitch picks ONE at runtime
    var P2 = C.props;
    var doorB = inst(P2.hallDoor(false), [-2.5, 0, HW], Math.PI, { label: 'door', kind: 'fixture' });
    doorB.state = 'open'; doorB.mut = { alt: 'bricked', label: 'brick', make: function () { return P2.hallDoor(true); } };
    var winI = inst(P2.hallWindow(false), [5.5, 0, -HW], 0, { label: 'window', kind: 'fixture' });
    winI.state = 'clear'; winI.mut = { alt: 'barred', label: 'bars', make: function () { return P2.hallWindow(true); } };
    var lampI = inst(P2.ceilLamp(false), [0, H, 0], 0, { label: 'lamp', kind: 'fixture', shadow: false });
    lampI.state = 'lit'; lampI.mut = { alt: 'dead', label: 'dead', make: function () { return P2.ceilLamp(true); } };
    var lampA = inst(P2.ceilLamp(false), [-5.6, H, 0], 0, { label: 'lamp', kind: 'fixture', shadow: false });
    lampA.state = 'lit';
    var lampB = inst(P2.ceilLamp(false), [5.6, H, 0], 0, { label: 'lamp', kind: 'fixture', shadow: false });
    lampB.state = 'lit';
    var way = inst(P2.archway(false), [HL, 0, 0], -Math.PI / 2, { label: 'the way back', kind: 'wayback' });
    way.state = 'open';
    var cat = inst(P2.cat(), [HALL.CAT_X0, 0, HALL.CAT_Z], Math.PI / 2, { label: 'cat', kind: 'cat', shadow: true });
    cat.pose = [0, 0, 0, 0, 0, 0];
    var farEnd = inst(mkFarEnd(), [-HL, 0, 0], 0, { label: 'far door', kind: 'farend' });
    farEnd.state = 'armed';
    var feLeaves = leafPair(-HL, null);
    s.insts.push(doorB, winI, lampI, lampA, lampB, way, cat, farEnd, feLeaves[0], feLeaves[1]);

    // colliders
    function box2(min, max) { return { min: min, max: max }; }
    s.colliders.push(box2([-HL, 0, HW - 0.15], [HL, H, HW + 0.6]));                 // south wall
    s.colliders.push(box2([-HL, 0, -HW - 0.6], [0.55, H, -HW + 0.15]));             // north, left of alcove
    s.colliders.push(box2([1.45, 0, -HW - 0.6], [HL, H, -HW + 0.15]));              // north, right of alcove
    s.colliders.push(box2([0.43, 0, -HW - 0.9], [0.57, H, -HW + 0.02]));            // alcove jamb walls
    s.colliders.push(box2([1.43, 0, -HW - 0.9], [1.57, H, -HW + 0.02]));
    s.colliders.push(box2([0.43, 0, -HW - 1.02], [1.57, H, -HW - 0.82]));           // alcove back
    [-3.8, 3.8].forEach(function (bx) {
      s.colliders.push(box2([bx - 0.35, 0, -HW], [bx + 0.35, H, -HW + 0.24]));
      s.colliders.push(box2([bx - 0.35, 0, HW - 0.24], [bx + 0.35, H, HW]));
    });
    s.colliders.push(box2([-2.95, 0, HW - 0.42], [-2.05, 1.9, HW]));                // the ajar leaf
    s.colliders.push(box2([-HL - 0.3, 0, -HW], [-HL + 0.12, H, -0.85]));            // far-door jambs
    s.colliders.push(box2([-HL - 0.3, 0, 0.85], [-HL + 0.12, H, HW]));
    s.colliders.push(box2([HL, 0, -HW - 0.6], [HL + 2.2, H, -HW + 0.12]));          // landing sides
    s.colliders.push(box2([HL, 0, HW - 0.12], [HL + 2.2, H, HW + 0.6]));
    s.colliders.push(box2([HL + 2.02, 0, -HW], [HL + 2.25, H, HW]));                // landing back

    // the corridor with no end is there from the first frame: doors that open for whoever
    // comes near, one per period, and a wrap that keeps the far stretch the far stretch
    var dvDoors = [];
    function hangDoor(dx, leaves) {
      if (s.insts.indexOf(leaves[0]) < 0) s.insts.push(leaves[0], leaves[1]);
      var dcol = box2([dx - 0.14, 0, -0.85], [dx + 0.14, 2.05, 0.85]);
      s.colliders.push(dcol);
      dvDoors.push({ x: dx, leaves: leaves, col: dcol, blocked: true, a: 0, tgt: 0 });
    }
    hangDoor(-HL, feLeaves);
    var segMesh = mkSegMesh();
    for (var sk = 0; sk < 3; sk++) {
      var scx = -HL - SEGP / 2 - sk * SEGP;
      var seg = inst(segMesh, [scx, 0, 0], 0, { shadow: false, kind: 'segment', label: 'corridor' });
      s.insts.push(seg);
      var sl = inst(C.props.ceilLamp(false), [scx, H, 0], 0, { label: 'lamp', kind: 'segment', shadow: false });
      sl.state = 'lit';
      s.insts.push(sl);
      s.colliders.push(box2([scx - 0.35, 0, -HW], [scx + 0.35, H, -HW + 0.24]));
      s.colliders.push(box2([scx - 0.35, 0, HW - 0.24], [scx + 0.35, H, HW]));
      hangDoor(scx, leafPair(scx, null));
    }
    s.colliders.push(box2([-HL - 3 * SEGP - 1, 0, HW - 0.15], [-HL, H, HW + 0.6]));
    s.colliders.push(box2([-HL - 3 * SEGP - 1, 0, -HW - 0.6], [-HL, H, -HW + 0.15]));
    s.colliders.push(box2([-HL - 3 * SEGP - 0.5, 0, -HW], [-HL - 3 * SEGP - 0.26, H, HW]));

    // ---- the déjà vu controller ----
    // Runs on its own fixed tick so the record is a per-tick array regardless of
    // how the host schedules dt. Phases: settle -> pass1 (record) -> glitch
    // (mutate ONE fixture) -> pass2 (replay the record) -> seal -> after.
    var dv = s.dv = {
      phase: 'settle', t: 0, p: 0, g: 0, acc: 0,
      rec: [], cat: cat, way: way,
      cands: [doorB, winI, lampI], chosen: null, sealed: false, tap: null,
      doors: dvDoors, doorA: 0,
      loop: { at: -HL - 2 * SEGP - 0.01, hard: -HL - 2.75 * SEGP, laps: 0 }
    };
    s.update = function (game, dt) {
      dv.acc += dt;
      while (dv.acc >= HALL.TICK - 1e-9) {
        dv.acc -= HALL.TICK;
        dvTick(game);
      }
    };
    function dvTick(game) {
      dv.t++;
      if (dv.phase === 'settle') {
        cat.loadT = 0; cat.loadDir = 0; cat._delay = 0;
        if (dv.t >= HALL.SETTLE) { dv.phase = 'pass1'; dv.p = 0; cat.loadT = 1; }
      } else if (dv.phase === 'pass1') {
        if (dv.p < HALL.N) {
          var st = C.catPose(dv.p);
          applyCat(cat, st);
          dv.rec.push(st);
          if (dv.tap) dv.tap('pass1', dv.p, cat);
          dv.p++;
        } else {
          dv.phase = 'glitch'; dv.g = 0; cat.loadT = 0;
        }
      } else if (dv.phase === 'glitch') {
        dv.g++;
        if (dv.g === HALL.GLITCH_AT) {
          var r = C.rng(((game.time * 997) | 0) ^ 0x2a17)();
          dv.chosen = dv.cands[Math.min(dv.cands.length - 1, (r * dv.cands.length) | 0)];
          mutateFixture(dv.chosen);
          game.fx.codeFlash = Math.max(game.fx.codeFlash, 0.55);
          game.emit('dejavu');
        }
        if (dv.g >= HALL.GLITCH) { dv.phase = 'pass2'; dv.p = 0; cat.loadT = 1; }
      } else if (dv.phase === 'pass2') {
        if (dv.p < HALL.N) {
          applyCat(cat, dv.rec[dv.p]);            // replay: the record IS the walk
          if (dv.tap) dv.tap('pass2', dv.p, cat);
          dv.p++;
        } else {
          dv.phase = 'seal'; dv.g = 0; cat.loadT = 0;
        }
      } else if (dv.phase === 'seal') {
        dv.g++;
        if (dv.g >= HALL.SEAL_AT) {
          way.mesh = C.props.archway(true);
          way.state = 'bricked'; way.label = 'wall'; way._wv = null;
          way.glyphEpoch = (way.glyphEpoch | 0) + 1; way.reResolve = 1;
          way.loadT = 0; way.loadDir = 1; way._delay = 0;
          s.colliders.push(box2([HL - 0.12, 0, -HW], [HL + 0.14, HALL.H, HW]));
          if (game.player.pos[0] > HL - 0.55) { game.player.pos[0] = HL - 0.6; game.player.vel[0] = 0; }
          dv.sealed = true;
          game.emit('seal');
          game.say(C.LINES.dejavu, 0.5);
          game.say(C.LINES.wayback, 3.0);
          dv.boothT = dv.t + 330;   // let “listen for it” land, then the phone rings
          // the far door's code re-seeds: in code vision it now spells where it leads
          farEnd.label = 'corridor';
          farEnd.glyphEpoch = (farEnd.glyphEpoch | 0) + 1; farEnd.reResolve = 1;
          dv.phase = 'after';
        }
      }
      if (dv.doors) {
        // each door minds its own distance: near it, it opens for you; leave it, it shuts behind you.
        // TRIG/RELEASE both sit under the half-period, so at the wrap line every door reads shut
        // from both sides — the seam stays invisible.
        var TRIG = 2.6, RELEASE = 3.1, LEAF_MAX = 1.86, LEAF_SPD = 3.4;
        var pxd = game.player.pos[0], maxA = 0;
        for (var dj = 0; dj < dv.doors.length; dj++) {
          var D = dv.doors[dj];
          var nd = Math.abs(pxd - D.x);
          var tgt = nd < TRIG ? LEAF_MAX : (nd > RELEASE ? 0 : D.tgt);
          if (tgt > 0 && D.tgt === 0) game.emit('creak');
          D.tgt = tgt;
          if (D.a < tgt) D.a = Math.min(tgt, D.a + LEAF_SPD * HALL.TICK);
          else if (D.a > tgt) D.a = Math.max(tgt, D.a - LEAF_SPD * HALL.TICK);
          D.leaves[0].pose[5] = D.a;
          D.leaves[1].pose[5] = -D.a;
          if (D.a > maxA) maxA = D.a;
          var passable = D.a > 0.5;
          if (passable && D.blocked) {
            var ci = s.colliders.indexOf(D.col);
            if (ci >= 0) s.colliders.splice(ci, 1);
            D.blocked = false;
          } else if (!passable && !D.blocked) {
            s.colliders.push(D.col);
            D.blocked = true;
          }
        }
        dv.doorA = maxA;
      }
      if (dv.phase === 'after') {
        if (dv.boothT && dv.t >= dv.boothT) {
          dv.boothT = 0;
          game.addProp('booth', [1.0, 0, -1.62], Math.PI, null, 0.3);
        }
      }
      {
        if (dv.loop) {
          var ppx = game.player.pos[0];
          var facingAway = Math.sin(game.player.yaw) < -0.35;   // wraps hide behind your back
          if ((ppx < dv.loop.at && facingAway) || ppx < dv.loop.hard) {
            game.player.pos[0] += SEGP;
            dv.loop.laps++;
            // the doors' memory travels with you: shift each periodic door's swing one period along,
            // so the one you just passed is still easing shut behind you and the one ahead reads shut
            var ring = dv.doors.filter(function (d) { return d.x < -HL; }).sort(function (a, b) { return b.x - a.x; });
            for (var ri = 0; ri < ring.length; ri++) {
              var src = ring[ri + 1];
              ring[ri].a = src ? src.a : 0;
              ring[ri].tgt = src ? src.tgt : 0;
            }
            if (dv.sealed && !dv.loopSaid) { dv.loopSaid = true; game.say(C.LINES.loop, 0.2); }
          }
        }
      }
    }
    return s;
  }

  function sceneErebus() {
    // EREBUS STATION - condensed native port of the branch's Three.js single-file.
    // Three decks on one groundY=-7 basement: every floor is a collider top,
    // stairs are 0.28 risers, the walker's support scan does the rest.
    var s = {
      name: 'erebus station', sky: 'erebus', fog: { near: 7, far: 58, col: '#070b16' },   // matches their FogExp2 .023 falloff at hall scale
      groundY: -7, ambience: 'station', colliders: [], insts: [],
      spawn: { pos: [0, 0.02, 27], yaw: 0 },
      label: 'EREBUS STATION'
    };
    var CY = '#7deeff', AM = '#ffc272', RD = '#ff5548', OR = '#ff8a34', ST = '#2e3a50', SD = '#20293a', TR = '#141c2c', FL = '#28404f';   // GRADED to their RENDERED pixels, not their albedo table
    var m = C.newMesh();
    function col(x0,y0,z0,x1,y1,z1){ s.colliders.push(box([x0,y0,z0],[x1,y1,z1])); }
    function floor(x0,z0,x1,z1,top,cc){ col(x0,top-0.5,z0,x1,top,z1); C.addQuadY(m,x0,z0,x1,z1,top+0.004,cc||FL,'floor'); }
    function panels(kind,u0,u1,y0,y1,fixed,base,flip){
      // seam back + jittered panel grid: the fake DataTexture
      var seam = C.scaleHex(base, 0.62);
      if (kind==='x') C.addQuadX(m,u0,y0,u1,y1,fixed,seam,flip); else C.addQuadZ(m,u0,y0,u1,y1,fixed,seam,flip);
      var pw=2.0, ph=1.45, off = kind==='x' ? (flip?0.014:-0.014) : (flip?-0.014:0.014);   // panels sit on the VISIBLE side of the seam-back
      for (var yy=y0; yy<y1-0.02; yy+=ph){ var y2=Math.min(y1,yy+ph);
        for (var uu=u0; uu<u1-0.02; uu+=pw){ var u2=Math.min(u1,uu+pw);
          var j = 0.9 + C.rng(((uu*73+yy*131+fixed*17)|0)>>>0)() * 0.22;
          var cc2 = C.scaleHex(base, j);
          if (kind==='x') C.addQuadX(m,uu+0.05,yy+0.05,u2-0.05,y2-0.05,fixed+off,cc2,flip);
          else C.addQuadZ(m,uu+0.05,yy+0.05,u2-0.05,y2-0.05,fixed+off,cc2,flip); } }
    }
    function wallX(x,z0,z1,y0,y1,cc){ col(x-0.18,y0,z0,x+0.18,y1,z1); panels('x',z0,z1,y0,y1,x,(cc||ST), x<0); }
    function wallZ(z,x0,x1,y0,y1,cc){ col(x0,y0,z-0.18,x1,y1,z+0.18); panels('z',x0,x1,y0,y1,z,(cc||ST), z>0); }
    function stripY(x0,z0,x1,z1,y,ccc){ C.addQuadY(m,x0,z0,x1,z1,y,ccc); }
    function quad4(p0,p1,p2,p3,cc){ var b=m.v.length; m.v.push(p0,p1,p2,p3); C.addFace(m,[b,b+1,b+2,b+3],cc); }
    function stair(x0,x1,z0,dz,steps,yA,yB){
      var rise=(yB-yA)/steps;
      for(var i=0;i<steps;i++){ var zz=z0+dz*i*0.55, yy=yA+rise*(i+1);
        col(x0,yy-0.26,Math.min(zz,zz+dz*0.55),x1,yy,Math.max(zz,zz+dz*0.55));
        C.addBox(m,(x0+x1)/2,yy-0.13,zz+dz*0.275,(x1-x0),0.26,0.55,SD,{noBottom:true}); }
    }
    // ---------------- DOCKING BAY (spawn) ----------------
    floor(-8,18,8,32,0,FL);
    wallZ(32,-8,8,0,5.5); wallX(-8,18,32,0,5.5); wallX(8,18,32,0,5.5);
    wallZ(18,-8,-2,0,5.5); wallZ(18,2,8,0,5.5); wallZ(18,-2,2,3.1,5.5);   // doorway to corridor
    stripY(-7.5,18.6,7.5,19.0,0.02,'#1c2836'); stripY(-7.5,31.0,7.5,31.4,0.02,'#1c2836');
    C.addQuadZ(m,-3,0.6,3,3.4,31.8,'#16304a',false);   // airlock plate
    stripY(-0.35,18.2,0.35,31.6,0.03,AM);              // guide line
    // ---------------- corridor A ----------------
    floor(-2,13,2,18,0,'#243447');
    wallX(-2,13,18,0,3.1); wallX(2,13,18,0,3.1);
    for (var rb=0; rb<3; rb++){ C.addBox(m,0,3.02,14+rb*1.6,3.9,0.14,0.18,TR,{noBottom:true}); }
    // ---------------- CENTRAL ROTUNDA ----------------
    floor(-13,-13,13,2,0); floor(-13,2,-9,10,0); floor(-5,2,13,10,0); floor(-13,10,13,13,0);   // SW stair hole x[-9,-5] z[2,10]
    // walls with 4 doorways (u -2..2, h 2.8): S+N real, E/W sealed-door bays
    wallZ(13,-13,-2,0,12); wallZ(13,2,13,0,12); wallZ(13,-2,2,2.8,12);
    wallZ(-13,-13,-2,0,12); wallZ(-13,2,13,0,12); wallZ(-13,-2,2,2.8,12);
    wallX(-13,-13,-2,0,12); wallX(-13,2,13,0,12); wallX(-13,-2,2,2.8,12);
    wallX(13,-13,-2,0,12); wallX(13,2,13,0,12); wallX(13,-2,2,2.8,12);
    // rotunda floor: 2.2 m tile grid with per-tile jitter (the fake floor texture)
    for (var tz=-13; tz<13; tz+=2.2){ for (var tx=-13; tx<13; tx+=2.2){
      if (tx>-9.2 && tx<-4.8 && tz>1.8 && tz<10.2) continue;   // stair hole
      var tj = 0.88 + C.rng(((tx*57+tz*91)|0)>>>0)() * 0.24;
      C.addQuadY(m,tx+0.06,tz+0.06,Math.min(13,tx+2.14),Math.min(13,tz+2.14),0.008,C.scaleHex(FL,tj)); } }
    // corner pilasters + cyan pin strips
    var PC=[[-12,-12],[12,-12],[-12,12],[12,12]];
    for (var pi=0; pi<4; pi++){ var px=PC[pi][0], pz=PC[pi][1];
      col(px-0.8,0,pz-0.8,px+0.8,12,pz+0.8); C.addBox(m,px,6,pz,1.6,12,1.6,ST,{noBottom:true});
      var off=(pz>0?-0.86:0.86); C.addQuadZ(m,px-0.05,0.4,px+0.05,11.4,pz+off,CY,pz<0); }
    // amber sconces + upper ring light + radial spokes
    C.addQuadZ(m,-0.5,6,0.5,7.4,-12.7,AM,false); C.addQuadZ(m,-0.5,6,0.5,7.4,12.7,AM,true);
    C.addQuadX(m,-0.5,6,0.5,7.4,-12.7,AM,false); C.addQuadX(m,-0.5,6,0.5,7.4,12.7,AM,true);
    stripY(-12.7,-12.82,12.7,-12.7,11.3,CY); stripY(-12.7,12.7,12.7,12.82,11.3,CY);
    for (var sk=0; sk<8; sk++){ var aa=sk*Math.PI/4+Math.PI/8;
      C.addBox(m,Math.cos(aa)*6.9,11.78,Math.sin(aa)*6.9,0.2,0.24,11.6,TR,{yaw:aa,noBottom:true}); }
    // ---------------- EAST vestibule -> CREW QUARTERS (S) + MED BAY (N) ----------------
    floor(13,-2,17,2,0,'#243447'); wallZ(-2,13,17,0,3.1); wallZ(2,13,17,0,3.1,undefined);
    floor(15,2,29,14,0,FL);
    wallX(15,4,14,0,3.2); wallX(29,2,14,0,3.2); wallZ(14,15,29,0,3.2); wallZ(2,17,29,0,3.2);
    wallX(15,2,4,2.6,3.2);   // quarters door head
    for (var qb=0; qb<5; qb++){ for (var qs=0; qs<2; qs++){ var bz2=4.5+qb*1.9, bx2=qs? 26.5:17.5;
      C.addBox(m,bx2,0.55,bz2,2.2,0.5,1.5,SD,{noBottom:true}); col(bx2-1.1,0,bz2-0.75,bx2+1.1,0.55,bz2+0.75);
      C.addBox(m,bx2+(qs?1.2:-1.2),1.5,bz2,0.08,1.9,1.5,'#0e131d',{noBottom:true}); } }
    C.addQuadX(m,6,1.5,8.4,2.4,28.97,'#16273c',false); C.addQuadX(m,10,1.5,12.4,2.4,28.97,'#16273c',false);
    floor(15,-14,29,-2,0,'#26364a');
    wallX(15,-14,-4,0,3.2); wallX(29,-14,-2,0,3.2); wallZ(-14,15,29,0,3.2); wallZ(-2,17,29,0,3.2);
    wallX(15,-4,-2,2.6,3.2);
    C.addBox(m,20,0.45,-6,2.4,0.5,1.1,'#cfe0e6',{noBottom:true}); col(18.8,0,-6.55,21.2,0.5,-5.45);
    C.addBox(m,24.5,0.45,-6,2.4,0.5,1.1,'#cfe0e6',{noBottom:true}); col(23.3,0,-6.55,25.7,0.5,-5.45);
    stripY(16,-13.4,28,-13.0,3.14,'#bfe9ff');
    s.cab = inst(P.cabDoor(false), [27.6, 1.35, -10.5], -Math.PI/2, { label: 'cabinet', kind: 'cab' });
    s.cab.state='shut'; s.insts.push(s.cab);
    C.addBox(m,27.9,1.35,-10.5,0.4,1.05,0.9,SD,{noBottom:true});
    // ---------------- WEST wing: HYDROPONICS ----------------
    floor(-29,-7,-15,7,0,FL);
    wallX(-15,-7,-2,0,6); wallX(-15,2,7,0,6); wallX(-15,-2,2,2.8,6);
    wallX(-29,-7,7,0,6); wallZ(-7,-29,-15,0,6); wallZ(7,-29,-15,0,6);
    for (var hp=0; hp<3; hp++){ var hz=-4.4+hp*4.4;
      C.addBox(m,-22,0.5,hz,10,0.5,1.3,'#2a3646',{noBottom:true}); col(-27,0,hz-0.65,-17,0.5,hz+0.65);
      stripY(-27,hz-0.6,-17,hz+0.6,3.9,'#59ff9c');
      for (var lf=0; lf<9; lf++){ var lx=-26.4+lf*1.05;
        quad4([lx,0.5,hz],[lx-0.18,1.05,hz-0.14],[lx+0.18,1.05,hz+0.14],[lx,0.5,hz],'#2e7a4a'); } }
    C.addBox(m,-27.2,1.0,0,1.4,2.0,5.4,'#1d4a66',{noBottom:true}); col(-27.9,0,-2.7,-26.5,2.0,2.7);
    // ---------------- BALCONY EAST: DATA ARCHIVE ----------------
    floor(13,-14,27,-4,4.6,'#203042');
    wallX(13,-14,-11,4.6,9.2); wallX(13,-8,-4,4.6,9.2); wallX(13,-11,-8,7.2,9.2);
    wallX(27,-14,-4,4.6,9.2); wallZ(-14,13,27,4.6,9.2); wallZ(-4,13,27,4.6,9.2);
    for (var ar=0; ar<2; ar++){ for (var ak=0; ak<5; ak++){ var ax=15.5+ak*2.3, az=ar? -11.5:-6.5;
      C.addBox(m,ax,5.8,az,1.5,2.4,0.95,SD,{noBottom:true}); col(ax-0.75,4.6,az-0.48,ax+0.75,7.0,az+0.48);
      C.addQuadZ(m,ax-0.6,5.0,ax+0.6,6.9,az+(ar?0.5:-0.5),(ak%2? CY:'#59ff9c'),ar===0); } }
    stripY(14,-13.6,26,-13.2,9.12,'#bcd6ff');
    // stairs DOWN (SW shaft) to reactor deck: two flights + landing
    stair(-9,-6.6,2.2,+1,13,0,-3.64);
    floor(-9,8.8,-5,10,-3.64,'#203042');
    stair(-7.4,-5,9.35,-1,12,-3.64,-7);
    wallX(-9,2,10,-7,0.2); wallX(-5,2,10,-7,-0.2); wallZ(10.35,-9,-5,-7,-0.55);
    // stairs UP (east): flight to the BALCONY RING at 4.6, then N flight to the dome deck 12.6
    stair(11,12.8,-6.2,+1,17,0,4.6);
    // balcony ring (their y=4.6): a 2.2-wide walk around the rotunda interior, inner rail
    floor(-13,-13,13,-10.8,4.6,'#223246'); floor(-13,10.8,13,13,4.6,'#223246');
    floor(-13,-10.8,-10.8,10.8,4.6,'#223246'); floor(10.8,-10.8,13,10.8,4.6,'#223246');
    col(-10.9,4.6,-10.9,10.9,5.7,-10.7); col(-10.9,4.6,10.7,10.9,5.7,10.9);
    col(-10.9,4.6,-10.9,-10.7,5.7,10.9); col(10.7,4.6,-10.9,10.9,5.7,10.9);
    stair(-12.8,-11,3.2,+1,29,4.6,12.6);   // west flight balcony -> dome deck
    // ---------------- dome deck y=12.6 + skeletal glass dome ----------------
    floor(-13,-13,13,2.9,12.6,'#2c3a4a'); floor(-13,13,13,13,12.6,'#2c3a4a');
    floor(-13,2.9,-12.9,13,12.6,'#2c3a4a'); floor(-9.4,2.9,13,13,12.6,'#2c3a4a');   // west strip open for stair arrival
    col(-9.5,12.6,2.9,-9.3,13.7,13); col(-13,12.6,2.7,-9.3,13.7,2.9);   // rails at stair hole
    C.addBox(m,-9.4,13.15,8,0.1,1.1,10,TR,{noBottom:true});
    for (var dr=0; dr<8; dr++){ var da=dr*Math.PI/4;
      var bx=Math.cos(da)*12.4, bz=Math.sin(da)*12.4, tx=Math.cos(da)*3.6, tz=Math.sin(da)*3.6;
      quad4([bx,12.6,bz],[tx,18.6,tz],[Math.cos(da+0.06)*3.6,18.6,Math.sin(da+0.06)*3.6],[Math.cos(da+0.06)*12.4,12.6,Math.sin(da+0.06)*12.4],'#26405c'); }
    col(-13,12.6,-13.4,13,14,-12.9); col(-13,12.6,12.9,13,14,13.4); col(-13.4,12.6,-13,-12.9,14,13); col(12.9,12.6,-13,13.4,14,13);   // rim rails
    // ---------------- north corridor + COMMAND BRIDGE ----------------
    floor(-2,-18,2,-13,0,'#243447'); wallX(-2,-18,-13,0,3.1); wallX(2,-18,-13,0,3.1);
    floor(-9,-30,9,-18,0,FL);
    wallX(-9,-30,-18,0,4); wallX(9,-30,-18,0,4); wallZ(-18,-9,-2,0,4); wallZ(-18,2,9,0,4); wallZ(-18,-2,2,3.1,4);
    wallZ(-30,-9,-5.2,0,4); wallZ(-30,-3.8,3.8,0,4); wallZ(-30,5.2,9,0,4);
    wallZ(-30,-5.2,-3.8,0,1.4); wallZ(-30,-5.2,-3.8,2.3,4); wallZ(-30,3.8,5.2,0,1.4); wallZ(-30,3.8,5.2,2.3,4);   // two viewport slits
    C.addBox(m,0,0.55,-25,5.6,1.1,1.6,SD,{noBottom:true}); col(-2.8,0,-25.8,2.8,1.1,-24.2);   // console dais
    C.addQuadY(m,-2.4,-25.7,2.4,-24.3,1.12,'#0e2f3f');
    s.shafts = [];
    var sh1 = inst(P.sunShaft(true), [-4.2, 0, -29.8], 0, { label: 'shaft', kind: 'shaft' }); sh1.state = 'on';
    var sh2 = inst(P.sunShaft(true), [4.2, 0, -29.8], Math.PI, { label: 'shaft', kind: 'shaft' }); sh2.state = 'on';
    s.insts.push(sh1, sh2); s.shafts.push(sh1, sh2);
    // bridge reads CYAN-LUMINOUS like theirs: wide holo band, console holo, ceiling glow rows
    C.addQuadZ(m,-7,2.7,7,3.7,-29.82,'#17607a',false);
    C.addQuadZ(m,-6.6,3.12,6.6,3.28,-29.80,'#7deeff',false);
    C.addQuadY(m,-1.6,-25.5,1.6,-24.5,1.16,'#2c8ba6');
    stripY(-6,-26.4,-1,-26.0,3.9,'#9fd8e8'); stripY(1,-26.4,6,-26.0,3.9,'#9fd8e8');
    stripY(-7.5,-19.6,7.5,-19.2,3.9,'#123646');
    // ---------------- REACTOR deck (y=-7) ----------------
    floor(-12,16,12,34,-7,'#1e2028');
    wallX(-12,16,34,-7,-0.4); wallX(12,16,34,-7,-0.4); wallZ(34,-12,6,-7,-0.4); wallZ(34,10,12,-7,-0.4); wallZ(16,-12,-9,-7,-0.4); wallZ(16,-5,12,-7,-0.4);
    stripY(-11,19.9,11,20.1,-6.96,AM); stripY(-11,28.9,11,29.1,-6.96,AM);
    stripY(-11,20.4,11,21.6,-7.42,CY); stripY(-11,27.4,11,28.6,-7.42,CY);   // coolant under-glow
    for (var gk=0; gk<12; gk++){ stripY(-11+gk*1.9,20.3,-10.4+gk*1.9,21.7,-6.98,'#0c1017'); stripY(-11+gk*1.9,27.3,-10.4+gk*1.9,28.7,-6.98,'#0c1017'); }
    // the core: octagon prism + orange glow slots + pedestal
    var CR=2.7, CX=0, CZ=25.0;
    for (var oc=0; oc<8; oc++){ var a0=oc*Math.PI/4, a1=(oc+1)*Math.PI/4;
      quad4([CX+Math.cos(a0)*CR,-6.9,CZ+Math.sin(a0)*CR],[CX+Math.cos(a0)*CR,-0.9,CZ+Math.sin(a0)*CR],[CX+Math.cos(a1)*CR,-0.9,CZ+Math.sin(a1)*CR],[CX+Math.cos(a1)*CR,-6.9,CZ+Math.sin(a1)*CR],SD); }
    col(CX-2.2,-7,CZ-2.2,CX+2.2,-0.8,CZ+2.2);
    C.addQuadZ(m,CX-0.5,-6.1,CX+0.5,-1.7,CZ-CR-0.03,OR,false); C.addQuadZ(m,CX-0.5,-6.1,CX+0.5,-1.7,CZ+CR+0.03,OR,true);
    C.addQuadX(m,CZ-0.5,-6.1,CZ+0.5,-1.7,CX-CR-0.03,OR,false); C.addQuadX(m,CZ-0.5,-6.1,CZ+0.5,-1.7,CX+CR+0.03,OR,true);
    C.addBox(m,CX,-6.75,CZ,7.0,0.5,7.0,TR,{noBottom:true});
    // the core spills light: concentric warm pools + white-hot slot cores
    var POOL=[[3.6,'#8a4b1e'],[5.4,'#4c2c16'],[7.4,'#2a1c12']];
    for (var pl=0; pl<3; pl++){ var pr=POOL[pl][0], pc=POOL[pl][1];
      for (var pk=0; pk<8; pk++){ var pa=pk*Math.PI/4, pb=(pk+1)*Math.PI/4;
        quad4([CX+Math.cos(pa)*pr,-6.985,CZ+Math.sin(pa)*pr],[CX+Math.cos(pb)*pr,-6.985,CZ+Math.sin(pb)*pr],
              [CX+Math.cos(pb)*(pr+1.4),-6.985,CZ+Math.sin(pb)*(pr+1.4)],[CX+Math.cos(pa)*(pr+1.4),-6.985,CZ+Math.sin(pa)*(pr+1.4)],pc); } }
    C.addQuadZ(m,CX-0.32,-5.6,CX+0.32,-2.2,CZ-CR-0.06,'#ffd9a0',false); C.addQuadZ(m,CX-0.32,-5.6,CX+0.32,-2.2,CZ+CR+0.06,'#ffd9a0',true);
    C.addQuadX(m,CZ-0.32,-5.6,CZ+0.32,-2.2,CX-CR-0.06,'#ffd9a0',false); C.addQuadX(m,CZ-0.32,-5.6,CZ+0.32,-2.2,CX+CR+0.06,'#ffd9a0',true);
    // emergency strips (director swaps their state)
    s.emg = [];
    var EPOS=[[-11.8,22],[-11.8,30],[11.8,26]];
    for (var ei=0; ei<3; ei++){ var it=inst(P.emgStrip('off'), [EPOS[ei][0],-5.4,EPOS[ei][1]], EPOS[ei][0]<0?Math.PI/2:-Math.PI/2, { label:'emg', kind:'emg' }); it.state='off'; s.insts.push(it); s.emg.push(it); }
    // the alcove + the figure
    floor(6,34,10,36.5,-7,'#181c26'); wallZ(36.5,6,10,-7,-3.4); wallX(6,34,36.5,-7,-3.4); wallX(10,34,36.5,-7,-3.4);
    C.addQuadZ(m,6.6,-6.6,9.4,-3.8,36.3,'#2a1f66',false);   // violet backlight
    var fig=inst(P.figure(), [8,-7,35.6], Math.PI, { label:'figure', kind:'figure' });
    fig.state='still'; s.figWait=fig; s.fig=null;
    // two crew-log terminals
    s.logs=[{x:3.2,z:27.4,head:'STATION LOG 01 // CMDR. E. ASHE',text:'DAY 212 - Resupply skiff away on schedule. Erebus holds 41 souls.\\nDr. Vann insists the survey array is reading a structured return from\\ninside the storm. Probably instrument nois…',shown:false},{x:1.8,z:-26.2,head:'STATION LOG 04 // FINAL ENTRY',text:'DAY 244 - If anyone reads this: do not answer it.\\nIt learned the crew from the archive and it wears them well.\\nIt is very patient and very polite and it is standing behi-\\n[ENTRY…',shown:false},{x:22,z:-12.6,head:'MEDICAL LOG 02 // DR. I. OKONKWO, CMO',text:'DAY 236 - Third crewman this week reporting the same dream. Identical detail, identical order: the corridor, the door, the light going out. Prescribing rest. Logging it as shared stress response.',shown:false},{x:20,z:-13.2,y:5.5,head:'ARCHIVE QUERY LOG 03 // ARCHIVIST R. TAN',text:'DAY 240 - Query anomaly. 3,118 files accessed between 03:00 and 03:04 station time. No crew awake. No process logged. The files were all personnel records. Every one of them was read.',shown:false}];
    C.addBox(m,3.2,1.05,27.9,0.7,1.3,0.16,'#0c1a28',{noBottom:true});
    C.addBox(m,1.8,1.05,-26.6,0.7,1.3,0.16,'#0c1a28',{noBottom:true});
    // ---------------- G5 dressing (per the branch's visual-loop ledger) ----------------
    // rotunda: four wall data screens
    C.addQuadZ(m,5.75,1.45,7.25,2.35,-12.79,'#0e3f52',false); C.addQuadZ(m,-7.25,1.45,-5.75,2.35,-12.79,'#0e3f52',false);
    C.addQuadX(m,5.75,1.45,7.25,2.35,-12.79,'#0e3f52',false); C.addQuadX(m,-7.25,1.45,-5.75,2.35,12.79,'#0e3f52',true);
    // rotunda: central light cone (four dark-cyan trapezoids, non-collide)
    for (var lc=0; lc<4; lc++){ var la=lc*Math.PI/2+Math.PI/4;
      quad4([Math.cos(la)*0.5,10.9,Math.sin(la)*0.5],[Math.cos(la+1.57)*0.5,10.9,Math.sin(la+1.57)*0.5],
            [Math.cos(la+1.57)*2.6,0.06,Math.sin(la+1.57)*2.6],[Math.cos(la)*2.6,0.06,Math.sin(la)*2.6],'#12303e'); }
    // rotunda: twin floor ring patterns (octagonal)
    for (var rg=0; rg<2; rg++){ var rr2=rg? 8.4:4.6;
      for (var ri=0; ri<8; ri++){ var ra=ri*Math.PI/4, rb=(ri+1)*Math.PI/4;
        quad4([Math.cos(ra)*rr2,0.012,Math.sin(ra)*rr2],[Math.cos(rb)*rr2,0.012,Math.sin(rb)*rr2],
              [Math.cos(rb)*(rr2+0.22),0.012,Math.sin(rb)*(rr2+0.22)],[Math.cos(ra)*(rr2+0.22),0.012,Math.sin(ra)*(rr2+0.22)],'#1e2c3c'); } }
    // rotunda: mid wall band + cyan hairline under the balcony
    C.addQuadZ(m,-12.6,3.6,12.6,3.85,-12.78,TR,false); C.addQuadZ(m,-12.6,3.6,12.6,3.85,12.78,true?TR:TR,true);
    C.addQuadX(m,-12.6,3.6,12.6,3.85,-12.78,TR,false); C.addQuadX(m,-12.6,3.6,12.6,3.85,12.78,TR,true);
    C.addQuadZ(m,-12.6,3.95,12.6,4.02,-12.77,CY,false); C.addQuadX(m,-12.6,3.95,12.6,4.02,12.77,CY,true);
    // dock: wall ribs + ceiling pipe runs + airlock screen
    for (var dk=0; dk<4; dk++){ var dz=20.5+dk*3.2;
      C.addBox(m,-7.82,2.6,dz,0.3,5.2,0.5,SD,{noBottom:true}); C.addBox(m,7.82,2.6,dz,0.3,5.2,0.5,SD,{noBottom:true}); }
    C.addBox(m,-2.4,5.28,25,0.22,0.22,12.6,TR,{noBottom:true}); C.addBox(m,2.4,5.28,25,0.22,0.22,12.6,TR,{noBottom:true});
    C.addQuadZ(m,-1.1,3.7,1.1,4.5,31.78,'#0e3f52',false);
    // reactor: core top ring + junction boxes + shaft-base red strip
    for (var tr2=0; tr2<8; tr2++){ var ta=tr2*Math.PI/4, tb=(tr2+1)*Math.PI/4;
      quad4([CX+Math.cos(ta)*2.85,-0.82,CZ+Math.sin(ta)*2.85],[CX+Math.cos(tb)*2.85,-0.82,CZ+Math.sin(tb)*2.85],
            [CX+Math.cos(tb)*3.1,-0.82,CZ+Math.sin(tb)*3.1],[CX+Math.cos(ta)*3.1,-0.82,CZ+Math.sin(ta)*3.1],TR); }
    for (var jb=0; jb<3; jb++){ var jz=19+jb*5;
      C.addBox(m,11.7,-5.6,jz,0.5,0.9,0.7,SD,{noBottom:true}); C.addQuadX(m,jz-0.25,-5.5,jz+0.25,-5.35,11.42,AM,false); }
    C.addQuadX(m,3.0,-4.9,9.0,-4.66,-8.8,RD,true);
    // dome deck: chart table + faint rim ring
    C.addBox(m,5,12.98,4,1.7,0.76,1.1,SD,{noBottom:true}); col(4.15,12.6,3.45,5.85,13.36,4.55);
    C.addQuadY(m,4.3,3.55,5.7,4.45,13.38,'#0e3f52');
    for (var dg=0; dg<8; dg++){ var ga2=dg*Math.PI/4, gb2=(dg+1)*Math.PI/4;
      quad4([Math.cos(ga2)*12.1,12.62,Math.sin(ga2)*12.1],[Math.cos(gb2)*12.1,12.62,Math.sin(gb2)*12.1],
            [Math.cos(gb2)*12.3,12.62,Math.sin(gb2)*12.3],[Math.cos(ga2)*12.3,12.62,Math.sin(ga2)*12.3],'#12303e'); }
    // bridge: twin ceiling light bars + side consoles
    stripY(-6,-27.6,-1,-27.2,3.92,'#bcd6ff'); stripY(1,-27.6,6,-27.2,3.92,'#bcd6ff');
    C.addBox(m,-6.4,0.5,-24.8,1.6,1.0,1.2,SD,{noBottom:true}); col(-7.2,0,-25.4,-5.6,1.0,-24.2);
    C.addBox(m,6.4,0.5,-24.8,1.6,1.0,1.2,SD,{noBottom:true}); col(5.6,0,-25.4,7.2,1.0,-24.2);
    C.addQuadY(m,-7.0,-25.2,-5.8,-24.4,1.02,'#0e2f3f'); C.addQuadY(m,5.8,-25.2,7.0,-24.4,1.02,'#0e2f3f');
    // med bay: IV stand
    C.addBox(m,17.2,1.05,-4.9,0.08,2.1,0.08,TR,{noBottom:true}); C.addBox(m,17.2,2.05,-4.62,0.08,0.06,0.5,TR,{noBottom:true});
    C.meshBounds(m); C.anchorize(m, 0.05, 61, 8);
    s.insts.unshift(inst(m, [0,0,0], 0, { label: 'station', kind: 'static' }));
    // ---------------- director (once-each ghost beats) ----------------
    s._dir = { black:false, phase:0, pt:0, fig:false, figIn:false, med:false, day:true, clankAt:8 };
    s.update = function (game) {
      var p = game.player.pos, d = s._dir, t = game.time || 0;
      var dtv = Math.min(0.06, t - (s._tT === undefined ? t : s._tT)); s._tT = t;
      // crew logs: proximity typewriter, once each
      for (var li=0; li<s.logs.length; li++){ var lg=s.logs[li];
        if (!lg.shown && Math.abs(p[0]-lg.x)<1.7 && Math.abs(p[2]-lg.z)<1.7 && Math.abs(p[1]-(lg.y||0))<2.2){ lg.shown=true; game.say(lg.head+' \u2014 '+lg.text, 0.4); } }
      // reactor first entry: blackout -> red -> half power
      if (!d.black && p[1] < -4 && p[2] > 15){ d.black=true; d.phase=1; d.pt=t; game.emit('powerdown'); swapEmg('dead'); game.fx.flash=0.5; game.fx.flashCol='#02030a'; }
      if (d.black && d.phase===1 && t-d.pt>0.9){ d.phase=2; game.emit('alarm'); swapEmg('red'); }
      if (d.black && d.phase===2 && t-d.pt>3.4){ d.phase=3; game.emit('whisper'); swapEmg('half'); }
      // med bay first entry: the cabinet door swings (ghost #1)
      if (!d.med && p[0] > 15 && p[0] < 29 && p[2] > -14 && p[2] < -2 && Math.abs(p[1]) < 1.5) {
        d.med = true; game.emit('creak');
        s.cab.state = 'open'; s.cab.mesh = P.cabDoor(true);
        s.cab.glyphEpoch = (s.cab.glyphEpoch | 0) + 1; s.cab.reResolve = 1; s.cab.loadT = 0;
      }
      // blackout dims the whole station's air; half power lifts it partly
      if (d.black && d.phase === 1) { s.fog.col = '#03040a'; s.fog.far = 26; }
      if (d.black && d.phase === 3 && s.fog.far < 48) { s.fog.col = '#060a13'; s.fog.far = 48; }
      // the bridge light columns follow the sun
      var dayNow = Math.sin(t * (Math.PI * 2 / 240)) * 0.45 + 0.12 > 0.1;
      if (dayNow !== d.day) { d.day = dayNow;
        for (var si2 = 0; si2 < s.shafts.length; si2++) { var sh3 = s.shafts[si2];
          sh3.state = dayNow ? 'on' : 'off'; sh3.mesh = P.sunShaft(dayNow); sh3.loadT = 0; } }
      // random metal knocks, somewhere in the hull
      if (t > d.clankAt) { d.clankAt = t + 6 + ((t * 977) % 8); game.emit('clank'); }
      // the figure fades IN when you commit to the alcove...
      if (s.figWait && !d.figIn && Math.hypot(p[0] - 8, p[2] - 35.6) < 8 && p[1] < -4) {
        d.figIn = true; s.figWait.loadT = 0; s.insts.push(s.figWait); s.fig = s.figWait; s.figWait = null;
      }
      // the figure dissolves on approach
      if (!d.fig && s.fig && Math.hypot(p[0]-8,p[2]-35.6)<2.3 && p[1]<-4){ d.fig=true; game.emit('whisper');
        s.fig.reResolve=1; s.fig.glyphEpoch=(s.fig.glyphEpoch|0)+1; s.fig._goneAt=t+0.55; }
      if (s.fig && s.fig._goneAt && t>s.fig._goneAt){ var ix=s.insts.indexOf(s.fig); if(ix>=0) s.insts.splice(ix,1); s.fig=null; }
      function swapEmg(st){ for (var k=0;k<s.emg.length;k++){ var e2=s.emg[k]; e2.state=st; e2.mesh=P.emgStrip(st); e2.glyphEpoch=(e2.glyphEpoch|0)+1; e2.reResolve=1; e2.loadT=0; } }
    };
    return s;
  }

  C.makeScene = function (name) {
    switch (name) {
      case 'weapons': return sceneWeapons();
      case 'dojo': return sceneDojo();
      case 'rooftop': return sceneRoof();
      case 'city': return sceneCity();
      case 'neon': return sceneNeon();
      case 'hallway': return sceneHallway();
      case 'erebus': return sceneErebus();
      default: return sceneVoid();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
