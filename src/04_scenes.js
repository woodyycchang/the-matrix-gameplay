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

  C.makeScene = function (name) {
    switch (name) {
      case 'weapons': return sceneWeapons();
      case 'dojo': return sceneDojo();
      case 'rooftop': return sceneRoof();
      case 'city': return sceneCity();
      case 'neon': return sceneNeon();
      case 'hallway': return sceneHallway();
      default: return sceneVoid();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
