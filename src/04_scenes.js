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
          var rw = C.rng(((uu*73+yy*131+fixed*17)|0)>>>0);
          var j = 0.9 + rw() * 0.22;
          var cc2 = rw() < 0.06 ? C.mixHex(C.scaleHex(base, j), '#8a6a3a', 0.55) : C.scaleHex(base, j);   // sparse lit-window warmth
          if (kind==='x') C.addQuadX(m,uu+0.05,yy+0.05,u2-0.05,y2-0.05,fixed+off,cc2,flip);
          else C.addQuadZ(m,uu+0.05,yy+0.05,u2-0.05,y2-0.05,fixed+off,cc2,flip); } }
    }
    function wallX(x,z0,z1,y0,y1,cc){ col(x-0.18,y0,z0,x+0.18,y1,z1); panels('x',z0,z1,y0,y1,x,(cc||ST), x<0); }
    function wallZ(z,x0,x1,y0,y1,cc){ col(x0,y0,z-0.18,x1,y1,z+0.18); panels('z',x0,x1,y0,y1,z,(cc||ST), z>0); }
    function stripY(x0,z0,x1,z1,y,ccc){ C.addQuadY(m,x0,z0,x1,z1,y,ccc); }
    function quad4(p0,p1,p2,p3,cc){ var b=m.v.length; m.v.push(p0,p1,p2,p3); C.addFace(m,[b,b+1,b+2,b+3],cc); }
    function ceilQ(x0,z0,x1,z1,y,cc){ quad4([x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],cc); }   // DOWN-facing
    function stair(x0,x1,z0,dz,steps,yA,yB){
      var rise=(yB-yA)/steps;
      for(var i=0;i<steps;i++){ var zz=z0+dz*i*0.55, yy=yA+rise*(i+1);
        col(x0,yy-0.26,Math.min(zz,zz+dz*0.55),x1,yy,Math.max(zz,zz+dz*0.55));
        C.addBox(m,(x0+x1)/2,yy-0.13,zz+dz*0.275,(x1-x0),0.26,0.55,SD,{noBottom:true}); }
    }
    // ---------------- DOCKING BAY (spawn) - warm rust identity, per the branch ----------------
    var RW='#4a3e33';   // steel-under-worklight, baked (their M.steel x 0xffcf9a cones)
    floor(-8,18,8,32,0,'#3c3a3a');
    wallZ(32,-8,8,0,5.5,RW); wallX(-8,18,32,0,5.5,RW); wallX(8,18,32,0,5.5,RW);
    wallZ(18,-8,-2,0,5.5,RW); wallZ(18,2,8,0,5.5,RW); wallZ(18,-2,2,3.1,5.5,RW);   // doorway to corridor
    for (var dz2=18; dz2<32; dz2+=2.0){ for (var dx2=-8; dx2<8; dx2+=2.0){
      var dg = C.rng(((dx2*61+dz2*97)|0)>>>0);
      C.addQuadY(m,dx2+0.05,dz2+0.05,Math.min(8,dx2+1.95),Math.min(32,dz2+1.95),0.007,C.scaleHex('#3e3c3c',0.86+dg()*0.24));
      if (dg() < 0.34) C.addQuadY(m,dx2+0.5+dg()*0.6,dz2+0.4+dg()*0.7,dx2+1.5+dg()*0.4,dz2+1.4+dg()*0.4,0.009,'#2c2a29'); } }
    for (var hz2=0; hz2<8; hz2++){ var hx=-5+hz2*1.25;
      C.addQuadY(m,hx,30.3,hx+0.62,31.7,0.011,'#b07a34'); C.addQuadY(m,hx+0.62,30.3,hx+1.25,31.7,0.011,'#1a1b20'); }
    for (var hz3=0; hz3<6; hz3++){ var hzz=22+hz3*0.9;
      C.addQuadY(m,-7,hzz,-2.2,hzz+0.45,0.011,'#b07a34'); C.addQuadY(m,-7,hzz+0.45,-2.2,hzz+0.9,0.011,'#1a1b20'); }
    var skf = inst(P.shuttle(), [-4.4, 0, 26.2], 0, { label: 'skiff', kind: 'shuttle' });
    s.insts.push(skf); col(-7.3,0,24.9,-1.6,2.4,27.5);
    C.addQuadY(m,-6.2,25.2,-4.8,26.2,0.010,'#141312'); C.addQuadY(m,-3.8,26.6,-2.6,27.4,0.010,'#161514');
    C.addBox(m,-7.7,0.32,24.4,1.3,0.5,0.5,'#26242a',{noBottom:true});
    C.addBox(m,-7.9,0.22,22.6,0.18,0.18,3.4,'#33302c',{noBottom:true});
    C.addBox(m,-7.94,1.6,20.9,0.3,3.2,0.18,'#33302c',{noBottom:true});
    var CRT=[[6.2,0.5,29.5,1.5,1.0,1.5,0],[7.1,0.55,27.6,1.3,1.1,1.2,1],[5.4,1.45,29.2,1.0,0.8,1.0,0],[6.8,0.45,20.8,1.4,0.9,1.6,1],[-6.6,0.5,30.6,1.6,1.0,1.3,0]];
    for (var ci=0; ci<CRT.length; ci++){ var cb=CRT[ci];
      C.addBox(m,cb[0],cb[1],cb[2],cb[3],cb[4],cb[5], cb[6]? '#8a6228':'#26242a',{noBottom:true});
      col(cb[0]-cb[3]/2,0,cb[2]-cb[5]/2,cb[0]+cb[3]/2,cb[1]+cb[4]/2,cb[2]+cb[5]/2);
      if (cb[6]){ C.addQuadZ(m,cb[0]-cb[3]/2+0.05,cb[1]-0.2,cb[0]+cb[3]/2-0.05,cb[1],cb[2]-cb[5]/2-0.012,'#1a1b20',false); } }
    C.addBox(m,-7.4,2.55,23.4,0.4,5.1,0.4,TR,{noBottom:true}); C.addBox(m,7.4,2.55,23.4,0.4,5.1,0.4,TR,{noBottom:true});
    C.addBox(m,0,5.15,23.4,15.2,0.36,0.5,TR,{noBottom:true});
    C.addBox(m,1.6,4.35,23.4,0.07,1.3,0.07,TR,{noBottom:true}); C.addBox(m,1.6,3.6,23.4,0.4,0.3,0.4,'#26242a',{noBottom:true});
    for (var cz2=18.4; cz2<31.6; cz2+=2.2){ for (var cx2=-7.6; cx2<7.6; cx2+=2.4){
      ceilQ(cx2,cz2,Math.min(7.6,cx2+2.3),Math.min(31.6,cz2+2.1),5.46,C.scaleHex('#191a1e',0.9+C.rng(((cx2*31+cz2*67)|0)>>>0)()*0.2)); } }
    ceilQ(-6.5,21.9,6.5,22.3,5.43,'#ffb85e'); ceilQ(-6.5,28.9,6.5,29.3,5.43,'#ffb85e'); ceilQ(-6.5,25.3,6.5,25.55,5.43,'#7bd8e8');
    for (var ph=0; ph<2; ph++){ var pz=22.5+ph*5.5;
      C.addQuadX(m,pz,1.5,pz+1.1,2.5,7.79,'#04060c',true);
      C.addQuadX(m,pz-0.08,1.42,pz+1.18,1.5,7.78,'#141c2c',true); C.addQuadX(m,pz-0.08,2.5,pz+1.18,2.58,7.78,'#141c2c',true);
      C.addQuadX(m,pz+0.3,1.9,pz+0.36,1.96,7.795,'#cfe0ff',true); C.addQuadX(m,pz+0.7,2.2,pz+0.75,2.25,7.795,'#9fb8e8',true); }
    C.addQuadZ(m,-3,0.6,3,3.4,31.8,'#20242c',false);
    C.addQuadZ(m,-0.06,0.4,0.06,3.2,31.78,AM,false);
    C.addBox(m,0,3.85,31.7,0.7,0.35,0.2,'#26242a',{noBottom:true}); C.addQuadZ(m,-0.25,3.75,0.25,3.98,31.58,'#ffd9a0',false);
    C.addQuadZ(m,-4.6,1.5,-3.5,2.2,31.79,'#0e3f52',false); C.addQuadZ(m,3.6,1.4,4.5,2.05,31.79,'#0e3f52',false);
    C.addQuadZ(m,-2.16,0.05,-2.02,2.75,17.9,'#dfe8ea',false); C.addQuadZ(m,2.02,0.05,2.16,2.75,17.9,'#dfe8ea',false);
    C.addBox(m,3.2,0.5,26.9,1.0,1.0,0.55,'#26242a',{noBottom:true}); col(2.7,0,26.6,3.7,1.0,27.2);
    C.addQuadZ(m,2.78,1.05,3.62,1.62,26.6,'#123c4e',false);
    // ---------------- corridor A ----------------
    floor(-2,13,2,18,0,'#243447');
    wallX(-2,13,18,0,3.1); wallX(2,13,18,0,3.1);
    for (var rb=0; rb<3; rb++){ C.addBox(m,0,3.02,14+rb*1.6,3.9,0.14,0.18,TR,{noBottom:true}); }
    C.addQuadZ(m,-1.9,2.55,1.9,3.0,13.2,'#bcd6de',false);   // end-of-corridor light panel
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
    // PASS-2: the bridge reads cyan-luminous like theirs - a glowing ceiling field
    for (var bz=-30; bz<-18; bz+=2.0){ for (var bx2=-9; bx2<9; bx2+=2.25){
      var bj = C.rng(((bx2*37+bz*53)|0)>>>0)();
      ceilQ(bx2+0.08,bz+0.08,Math.min(9,bx2+2.17),Math.min(-18,bz+1.92),3.96,C.mixHex('#123c4e','#2c7a94',bj)); } }
    ceilQ(-8.6,-29.4,8.6,-29.0,3.94,'#8fe0f2'); ceilQ(-8.6,-19.0,8.6,-18.6,3.94,'#8fe0f2');
    for (var bm=-6; bm<=6; bm+=3){ C.addQuadZ(m,bm-0.06,2.2,bm+0.06,3.7,-29.81,'#0d2c3a',false); }
    C.addQuadZ(m,-7,2.2,7,2.72,-29.83,'#1a5468',false);
    for (var hr=0; hr<8; hr++){ var ha=hr*Math.PI/4, hb=(hr+1)*Math.PI/4;
      quad4([Math.cos(ha)*2.2,0.02,-25+Math.sin(ha)*2.2],[Math.cos(hb)*2.2,0.02,-25+Math.sin(hb)*2.2],
            [Math.cos(hb)*2.5,0.02,-25+Math.sin(hb)*2.5],[Math.cos(ha)*2.5,0.02,-25+Math.sin(ha)*2.5],'#2c8ba6'); }
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
    var POOL=[[3.6,'#b06426'],[5.4,'#5c3418'],[7.4,'#2e2014']];
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
    // the LUMINOUS central column (their glowing pillar with halo rings)
    for (var lp2=0; lp2<4; lp2++){ var lpa=lp2*Math.PI/2;
      quad4([Math.cos(lpa)*0.34,0.05,Math.sin(lpa)*0.34],[Math.cos(lpa+1.5708)*0.34,0.05,Math.sin(lpa+1.5708)*0.34],
            [Math.cos(lpa+1.5708)*0.34,10.6,Math.sin(lpa+1.5708)*0.34],[Math.cos(lpa)*0.34,10.6,Math.sin(lpa)*0.34],'#cfeef8'); }
    for (var hr2=0; hr2<3; hr2++){ var hy=2.4+hr2*2.6, hrr=0.9+hr2*0.18;
      for (var hk=0; hk<8; hk++){ var h1=hk*Math.PI/4, h2b=(hk+1)*Math.PI/4;
        quad4([Math.cos(h1)*hrr,hy,Math.sin(h1)*hrr],[Math.cos(h2b)*hrr,hy,Math.sin(h2b)*hrr],
              [Math.cos(h2b)*(hrr+0.14),hy,Math.sin(h2b)*(hrr+0.14)],[Math.cos(h1)*(hrr+0.14),hy,Math.sin(h1)*(hrr+0.14)],'#9fe6f4');
        quad4([Math.cos(h1)*(hrr+0.14),hy+0.001,Math.sin(h1)*(hrr+0.14)],[Math.cos(h2b)*(hrr+0.14),hy+0.001,Math.sin(h2b)*(hrr+0.14)],
              [Math.cos(h2b)*hrr,hy+0.001,Math.sin(h2b)*hrr],[Math.cos(h1)*hrr,hy+0.001,Math.sin(h1)*hrr],'#9fe6f4'); } }
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
    C.addQuadY(m,4.3,3.55,5.7,4.45,13.38,'#155a72'); C.addQuadY(m,4.42,3.95,5.58,4.05,13.385,'#7deeff');
    for (var dg=0; dg<8; dg++){ var ga2=dg*Math.PI/4, gb2=(dg+1)*Math.PI/4;
      quad4([Math.cos(ga2)*12.1,12.62,Math.sin(ga2)*12.1],[Math.cos(gb2)*12.1,12.62,Math.sin(gb2)*12.1],
            [Math.cos(gb2)*12.3,12.62,Math.sin(gb2)*12.3],[Math.cos(ga2)*12.3,12.62,Math.sin(ga2)*12.3],'#2a6a80'); }
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

  function sceneEpang() {
    // EPANG PALACE - condensed native staging of Du Mu's rhapsody (branch port).
    var s = {
      name: 'epang palace', sky: 'epang', fog: { near: 12, far: 88, col: '#2a2430' },
      groundY: -0.7, ambience: 'wind', colliders: [], insts: [],
      spawn: { pos: [0, 0.02, 44], yaw: 0 },
      label: 'EPANG PALACE'
    };
    var VER='#7a1e16', VERD='#4a120e', OCH='#7a6448', OCHD='#5e4c36', STONE='#b8ac96', TILE='#22262c', GOLD='#c9a24a', INKF='#3a3026', WAT='#3f545c', BED='#2c3438';
    var m = C.newMesh();
    function col(x0,y0,z0,x1,y1,z1){ s.colliders.push(box([x0,y0,z0],[x1,y1,z1])); }
    function floor(x0,z0,x1,z1,top,cc){ col(x0,top-0.5,z0,x1,top,z1); C.addQuadY(m,x0,z0,x1,z1,top+0.004,cc||OCH,'floor'); }
    function quad4(p0,p1,p2,p3,cc){ var b=m.v.length; m.v.push(p0,p1,p2,p3); C.addFace(m,[b,b+1,b+2,b+3],cc); }
    function ceilQ(x0,z0,x1,z1,y,cc){ quad4([x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],cc); }
    function wallX(x,z0,z1,y0,y1,cc){ col(x-0.16,y0,z0,x+0.16,y1,z1); C.addQuadX(m,z0,y0,z1,y1,x,(cc||VER), x<0); }
    function wallZ(z,x0,x1,y0,y1,cc){ col(x0,y0,z-0.16,x1,y1,z+0.16); C.addQuadZ(m,x0,y0,x1,y1,z,(cc||VER), z>0); }
    function column(x,z,h,r){ // vermilion lacquer column, octagon
      for (var i=0;i<8;i++){ var a0=i*Math.PI/4, a1=(i+1)*Math.PI/4;
        quad4([x+Math.cos(a0)*r,0.9,z+Math.sin(a0)*r],[x+Math.cos(a0)*r,h,z+Math.sin(a0)*r],[x+Math.cos(a1)*r,h,z+Math.sin(a1)*r],[x+Math.cos(a1)*r,0.9,z+Math.sin(a1)*r],VER); }
      C.addBox(m,x,0.78,z,r*2.5,0.24,r*2.5,VERD,{noBottom:true}); col(x-r,0.9,z-r,x+r,h,z+r); }
    function roofSlope(x0,z0,x1,z1,yLow,yHigh,alongX,cc){ // simple hip slope quad
      if (alongX) { quad4([x0,yLow,z0],[x0,yHigh,(z0+z1)/2],[x1,yHigh,(z0+z1)/2],[x1,yLow,z0],cc); quad4([x1,yLow,z1],[x1,yHigh,(z0+z1)/2],[x0,yHigh,(z0+z1)/2],[x0,yLow,z1],cc); }
      else { quad4([x0,yLow,z0],[(x0+x1)/2,yHigh,z0],[(x0+x1)/2,yHigh,z1],[x0,yLow,z1],cc); quad4([x1,yLow,z1],[(x0+x1)/2,yHigh,z1],[(x0+x1)/2,yHigh,z0],[x1,yLow,z0],cc); }
    }
    // ---------------- courtyard ground + perimeter red walls ----------------
    floor(-16,17.5,16,38,0,OCH);
    for (var ct=0; ct<40; ct++){ var cg=C.rng((ct*131)>>>0);
      C.addQuadY(m,-15+cg()*29,18+cg()*18,-15+cg()*29+1.6,18+cg()*18+1.6,0.006+ct*0.00004,C.scaleHex(OCH,0.86+cg()*0.26)); }   // epsilon ladder kills coplanar shimmer
    wallX(-16,17.5,38,0,3.5); wallX(16,17.5,38,0,3.5);
    C.addQuadX(m,17.5,3.4,38,3.62,-16.02,STONE,true); C.addQuadX(m,17.5,3.4,38,3.62,16.02,STONE,false);   // white coping
    // ---------------- GATE (spawn, dawn hero) ----------------
    floor(-16,38,16,48,0,OCHD);
    C.addBox(m,-6.8,4.0,40.5,4.2,8.0,3.0,VER,{noBottom:true}); col(-8.9,0,39,-4.7,8,42);
    C.addBox(m,6.8,4.0,40.5,4.2,8.0,3.0,VER,{noBottom:true}); col(4.7,0,39,8.9,8,42);
    C.addBox(m,0,8.5,40.5,18.4,1.1,3.6,TILE,{noBottom:true});
    roofSlope(-9.6,38.7,9.6,42.3,9.05,10.1,false,TILE);
    C.addQuadZ(m,-9.4,8.98,9.4,9.12,38.85,GOLD,false);
    wallZ(40.5,-4.7,-2.4,0,8); wallZ(40.5,2.4,4.7,0,8);   // gate cheeks; passage open x[-2.4,2.4]
    for (var gs=0; gs<9; gs++){ C.addQuadZ(m,-1.9+ (gs%3)*1.3, 1.0+((gs/3)|0)*1.3, -1.6+(gs%3)*1.3, 1.3+((gs/3)|0)*1.3, 40.34, GOLD, false); }
    // ---------------- RIVER A (east-west, between courtyard and hall) ----------------
    floor(-16,12,16,17.5,-0.7,BED);
    C.addQuadY(m,-16,12.1,16,17.4,-0.12,WAT);   // water surface (visual)
    // ghat steps down, east side
    floor(6,16.1,10,17.5,-0.23,STONE); floor(6,15.1,10,16.1,-0.46,STONE);
    // DRAGON BRIDGE: arched crossing, center
    floor(-2.6,11.6,2.6,12.9,0.35,STONE); floor(-2.6,12.9,2.6,14.6,0.85,STONE); floor(-2.6,14.6,2.6,15.9,1.12,STONE);
    floor(-2.6,15.9,2.6,16.6,0.85,STONE); floor(-2.6,16.6,2.6,17.6,0.35,STONE);
    floor(-2.6,10.6,2.6,11.6,0.0,STONE); floor(-2.6,17.6,2.6,18.2,0.0,STONE);
    C.addBox(m,-2.75,0.9,14.6,0.3,1.6,6.4,STONE,{noBottom:true}); C.addBox(m,2.75,0.9,14.6,0.3,1.6,6.4,STONE,{noBottom:true});
    var drg = inst(P.dragonHead(), [0, 1.28, 11.2], 0, { label: 'dragon', kind: 'dragon' });
    s.insts.push(drg);
    // winding waterside covered corridor, west (廊腰縵回)
    floor(-13.4,11.4,-8.6,18.4,0.22,'#8a7a60');
    for (var lz=12.2; lz<18; lz+=2.6){ column(-12.9,lz,3.4,0.22); column(-9.1,lz,3.4,0.22); }
    roofSlope(-13.6,11.2,-8.4,18.6,3.35,4.15,false,TILE);
    // ---------------- FRONT HALL 前殿 (raised white platform + vermilion columns + hip roof) ----------------
    floor(-14,-6,14,11.9,0.9,INKF);
    floor(-14,11.9,14,12.6,0.6,STONE); floor(-14,12.6,14,13.3,0.3,STONE);   // front steps
    C.addQuadX(m,-6,0,12,0.9,-14.02,STONE,true); C.addQuadX(m,-6,0,12,0.9,14.02,STONE,false);
    C.addQuadZ(m,-14,0,14,0.9,11.94,STONE,false);
    for (var cx3=-10; cx3<=10; cx3+=5){ column(cx3, 9.4, 5.4, 0.45); column(cx3, 0.2, 5.4, 0.45); }
    wallZ(-6,-14,14,0.9,5.4,VER);
    for (var ds2=0; ds2<12; ds2++){ C.addQuadZ(m,-5.4+(ds2%4)*3.0, 1.6+((ds2/4)|0)*1.3, -5.0+(ds2%4)*3.0, 2.0+((ds2/4)|0)*1.3, -5.84, GOLD, false); }
    roofSlope(-15.2,-7.2,15.2,13.6,5.4,7.7,false,TILE);
    C.addQuadZ(m,-15.0,5.34,15.0,5.5,13.5,GOLD,false);   // gilded eave line
    // flanks: SONG TERRACE (west, open) & DANCE HALL (east)
    floor(-26,-2,-16.5,10,0.6,STONE);
    C.addBox(m,-26.1,1.15,4,0.24,1.1,12.2,STONE,{noBottom:true});
    for (var lt=0; lt<3; lt++){ var li=inst(P.lantern(true), [-24.5+lt*3.4, 0.6, 9.2], 0, { label:'lantern', kind:'lantern' }); li.state='lit'; s.insts.push(li); }
    floor(16.5,-2,26,10,0.28,INKF);
    for (var dc=0; dc<2; dc++){ column(18.6+dc*5.4, 0.2, 4.2, 0.34); column(18.6+dc*5.4, 7.8, 4.2, 0.34); }
    roofSlope(16.2,-2.4,26.4,10.4,4.2,5.6,false,TILE);
    // ---------------- RIVER B (north-south, east side) + slab bridge ----------------
    floor(27.2,-8,32.8,20,-0.7,BED);
    C.addQuadY(m,27.3,-7.9,32.7,19.9,-0.12,WAT);
    floor(27.0,6.4,33.0,9.0,0.05,STONE);   // slab bridge
    // ---------------- SKYWAY 複道行空 (y=5 covered, crosses river B) ----------------
    var st9=0;
    for (st9=0; st9<17; st9++){ var sy=0.28*(st9+1), sz=12.4-st9*0.62;
      col(16.9,sy-0.26,sz-0.62,19.1,sy,sz); C.addBox(m,18,sy-0.13,sz-0.31,2.2,0.26,0.62,STONE,{noBottom:true}); }
    floor(16.9,-1.4,19.1,2.2,4.76,'#8a7a60');   // stair landing
    floor(16.9,-1.4,42,1.0,5.0,'#8a7a60');       // skyway deck to treasury
    C.addBox(m,29.5,5.55,-0.2,25.0,1.1,0.22,VER,{noBottom:true}); C.addBox(m,29.5,5.55,1.9,25.0,1.1,0.22,VER,{noBottom:true});
    col(17,5.0,-1.6,42,6.1,-1.35); col(17,5.0,1.95,42,6.1,2.2);
    roofSlope(16.7,-1.6,42.2,2.4,6.7,7.4,false,TILE);
    for (var sc2=19; sc2<41; sc2+=4.2){ column(sc2,-1.15,6.7,0.2); column(sc2,1.95,6.7,0.2); }
    // ---------------- TREASURY 鼎鐺玉石 (east of river B) ----------------
    floor(34,-4,46,12,0,'#2c2620');
    wallX(46,-4,12,0,4.6,'#5e1a12'); wallZ(-4,34,46,0,4.6,'#5e1a12'); wallZ(12,34,46,0,4.6,'#5e1a12');
    wallX(34,-4,2,0,4.6,'#5e1a12'); wallX(34,5,12,0,4.6,'#5e1a12');   // west door gap z[2,5] ground
    floor(40,3,44,7,0.0,'#2c2620');
    roofSlope(33.7,-4.3,46.3,12.3,4.6,6.3,false,TILE);
    // skyway upper door into treasury + interior stair down
    wallX(42,-1.6,1.0,6.2,7.2,'#5e1a12');
    for (var ts=0; ts<15; ts++){ var ty=4.76-0.30*ts, tz=1.4+ts*0.55;
      col(42.2,ty-0.26,tz-0.55,44.2,ty,tz); C.addBox(m,43.2,ty-0.13,tz-0.275,2.0,0.26,0.55,'#8a7a60',{noBottom:true}); }
    for (var dg2=0; dg2<3; dg2++){ var di=inst(P.ding(), [37.5+dg2*3.2, 0, 8.4-dg2*2.6], 0.4*dg2, { label:'ding', kind:'ding' }); s.insts.push(di); col(36.6+dg2*3.2,0,7.5-dg2*2.6,38.4+dg2*3.2,1.6,9.3-dg2*2.6); }
    C.addQuadY(m,36,4.4,44,10.8,0.012,'#4a2410');   // ember pool wash
    for (var el2=0; el2<3; el2++){ var le=inst(P.lantern(true), [35.5+el2*4.2, 0, 0.0], 0, { label:'lantern', kind:'lantern' }); le.state='lit'; s.insts.push(le); }
    C.meshBounds(m); C.anchorize(m, 0.05, 71, 8);
    s.insts.unshift(inst(m, [0,0,0], 0, { label: 'palace', kind: 'static' }));
    // ---------------- regions: the rhapsody speaks on first entry ----------------
    s.regions = [
      { x0:-16, x1:16, z0:38, z1:48, y0:-1, y1:9, cn:'\u5bae\u9580', q:'\u300c\u516d\u738b\u7562\uff0c\u56db\u6d77\u4e00\uff1b\u8700\u5c71\u5140\uff0c\u963f\u623f\u51fa\u3002\u300d', said:false },
      { x0:-14, x1:14, z0:-6, z1:12, y0:0, y1:6, cn:'\u524d\u6bbf', q:'\u300c\u8986\u58d3\u4e09\u767e\u9918\u91cc\uff0c\u9694\u96e2\u5929\u65e5\u3002\u300d', said:false },
      { x0:16, x1:43, z0:-1.6, z1:2.4, y0:4.4, y1:8, cn:'\u8907\u9053\u884c\u7a7a', q:'\u300c\u8907\u9053\u884c\u7a7a\uff0c\u4e0d\u9701\u4f55\u8679\uff1f\u300d', said:false },
      { x0:-26, x1:-16.5, z0:-2, z1:10, y0:0, y1:4, cn:'\u6b4c\u81fa', q:'\u300c\u6b4c\u81fa\u6696\u97ff\uff0c\u6625\u5149\u878d\u878d\u3002\u300d', said:false },
      { x0:16.5, x1:26, z0:-2, z1:10, y0:0, y1:4, cn:'\u821e\u6bbf', q:'\u300c\u821e\u6bbf\u51b7\u8896\uff0c\u98a8\u96e8\u6dd2\u6dd2\u3002\u300d', said:false },
      { x0:-13.4, x1:-8.6, z0:11.4, z1:18.4, y0:0, y1:4, cn:'\u5eca\u8170\u7e35\u56de', q:'\u300c\u5eca\u8170\u7e35\u56de\uff0c\u7c37\u7259\u9ad8\u5544\u3002\u300d', said:false },
      { x0:-2.6, x1:2.6, z0:11.6, z1:17.6, y0:0.2, y1:3, cn:'\u9577\u6a4b\u81e5\u6ce2', q:'\u300c\u9577\u6a4b\u81e5\u6ce2\uff0c\u672a\u96f2\u4f55\u9f8d\uff1f\u300d', said:false },
      { x0:34, x1:46, z0:-4, z1:12, y0:-0.2, y1:4, cn:'\u9f0e\u9435\u7389\u77f3', q:'\u300c\u9f0e\u9435\u7389\u77f3\uff0c\u91d1\u584a\u73e0\u792b\u3002\u300d', said:false }
    ];
    s._splash = { a:false, b:false };
    s.update = function (game) {
      var p = game.player.pos;
      for (var ri=0; ri<s.regions.length; ri++){ var rg=s.regions[ri];
        if (!rg.said && p[0]>rg.x0 && p[0]<rg.x1 && p[2]>rg.z0 && p[2]<rg.z1 && p[1]>rg.y0 && p[1]<rg.y1){
          rg.said=true; game.say(rg.cn+' \u2014 '+rg.q, 0.35); } }
      if (!s._splash.a && p[1] < -0.3 && p[2] > 12 && p[2] < 17.6 && p[0] > -16 && p[0] < 12){ s._splash.a=true; game.emit('splash'); }
      if (!s._splash.b && p[1] < -0.3 && p[0] > 27 && p[0] < 33){ s._splash.b=true; game.emit('splash'); }
    };
    return s;
  }

  // ============ ORANGE EMPIRE 1937 (branch port, native re-forge) ============
  // Angel City at dusk; six seams; a road east that ends in green wire at 965.
  // Distances are the branch's, 1:1. Colors are its rendered pixels, decay-baked.
  var EMP = C.EMP = { X0: 160, CH: 32, N: 28, AHEAD: 6, BEHIND: 3,
    DESAT0: 460, DESAT1: 660, DARK0: 600, DARK1: 830, GRID0: 615, GRID1: 800,
    TREEWIRE: 665, BOUNDARY: 965, WALL: 1000, BREAK_V: 5.5, START_MIN: 1164 };
  function empSS(a, b, x) { var t = C.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function empDecay(d) { return (1 - 0.38 * empSS(EMP.DESAT0, EMP.DESAT1, d)) * (1 - 0.92 * empSS(EMP.DARK0, EMP.DARK1, d)); }
  function empNightF(mm) { mm = ((mm % 1440) + 1440) % 1440;
    var eve = empSS(1190, 1238, mm), morn = 1 - empSS(308, 382, mm);
    return Math.max(eve, mm < 720 ? morn : 0); }
  function empDuskF(mm) { mm = ((mm % 1440) + 1440) % 1440;
    var e = empSS(1085, 1165, mm) * (1 - empSS(1185, 1240, mm));
    var dd = empSS(300, 345, mm) * (1 - empSS(370, 420, mm));
    return Math.max(e, dd); }
  C.empNightF = empNightF; C.empDuskF = empDuskF;

  function empChunkMesh(ci) {
    var m = C.newMesh();
    var ccols = [];
    var x0 = EMP.X0 + ci * EMP.CH, x1 = x0 + EMP.CH, xm = (x0 + x1) / 2;
    var dm = Math.abs(xm), sc0 = empDecay(dm);
    var g = empSS(EMP.GRID0, EMP.GRID1, dm);
    C.addQuadY(m, x0, -6.5, x1, 6.5, 0.006, C.scaleHex('#3a3a36', sc0), 'floor');
    for (var dx0 = x0; dx0 < x1; dx0 += 8) C.addQuadY(m, dx0 + 2, -0.14, dx0 + 5.2, 0.14, 0.012, C.scaleHex('#b8a86a', sc0));
    var shoulder = C.mixHex(C.scaleHex('#5c5240', sc0), '#02120a', g * 0.85);
    C.addQuadY(m, x0, -60, x1, -6.5, 0.002, shoulder, 'floor');
    C.addQuadY(m, x0, 6.5, x1, 60, 0.002, shoulder, 'floor');
    if (g > 0.03) {
      var gl = C.mixHex('#0a2a16', '#26d468', g);
      for (var gz = -48; gz <= 48; gz += 12) C.addQuadY(m, x0, gz - 0.06, x1, gz + 0.06, 0.02, gl);
      for (var gx = x0; gx <= x1; gx += 8) C.addQuadY(m, gx - 0.06, -54, gx + 0.06, 54, 0.02, gl);
    }
    if (x0 >= 168 && x0 <= 470) {
      for (var px2 = x0 + 7; px2 < Math.min(x1, 470); px2 += 26) {
        C.addBox(m, px2, 0.3, -15.5, 0.42, 0.6, 0.42, '#1f1c18', { noBottom: true });
        C.addBox(m, px2, 0.3, 15.5, 0.42, 0.6, 0.42, '#1f1c18', { noBottom: true });
        C.addQuadY(m, px2 - 0.1, -15.6, px2 + 0.1, -15.4, 0.62, '#b45a18');
        C.addQuadY(m, px2 - 0.1, 15.4, px2 + 0.1, 15.6, 0.62, '#b45a18');
      }
    }
    function wireTree(x, z, sscale, fade) {
      var wc = C.mixHex('#0c3a1e', '#2aff70', fade);
      var h = 1.5 * sscale, cy = 2.4 * sscale, cr = 1.45 * sscale;
      C.addQuadZ(m, x - 0.05, 0, x + 0.05, h, z, wc, true); C.addQuadZ(m, x - 0.05, 0, x + 0.05, h, z, wc, false);
      var b0 = m.v.length;
      m.v.push([x, cy + cr, z], [x + cr, cy, z], [x, cy - cr * 0.7, z], [x - cr, cy, z]);
      C.addFace(m, [b0, b0 + 1, b0 + 2, b0 + 3], wc); C.addFace(m, [b0 + 3, b0 + 2, b0 + 1, b0], wc);
      var b1 = m.v.length;
      m.v.push([x, cy + cr, z], [x, cy, z + cr], [x, cy - cr * 0.7, z], [x, cy, z - cr]);
      C.addFace(m, [b1, b1 + 1, b1 + 2, b1 + 3], wc); C.addFace(m, [b1 + 3, b1 + 2, b1 + 1, b1], wc);
    }
    function solidTree(x, z, sscale, dd, rj) {
      var k2 = empDecay(dd) * (0.85 + rj * 0.3);
      var trunk = C.scaleHex('#6b5236', k2), can = C.scaleHex('#44602c', k2);
      C.addBox(m, x, 0.75 * sscale, z, 0.3 * sscale, 1.5 * sscale, 0.3 * sscale, trunk, { noBottom: true });
      var cy = 2.35 * sscale, ch = 1.05 * sscale, cw = 1.5 * sscale;
      C.addQuadZ(m, x - cw, cy - ch, x + cw, cy + ch, z, can, true); C.addQuadZ(m, x - cw, cy - ch, x + cw, cy + ch, z, can, false);
      C.addQuadX(m, z - cw, cy - ch, z + cw, cy + ch, x, can, true); C.addQuadX(m, z - cw, cy - ch, z + cw, cy + ch, x, can, false);
    }
    var gx0 = Math.ceil(x0 / 13) * 13;
    for (var tx = gx0; tx < x1; tx += 13) {
      for (var tz = -46; tz <= 46; tz += 13) {
        var rg2 = C.rng(((ci * 131 + tx * 7 + tz * 13) ^ 0x1937) >>> 0);
        var jx = tx + (rg2() - 0.5) * 3.2, jz = tz + (rg2() - 0.5) * 3.2;
        if (Math.abs(jz) < 13.5) continue;
        if ((jx - 335) * (jx - 335) + (jz - 26) * (jz - 26) < 196) continue;
        if ((jx - 240) * (jx - 240) + (jz + 42) * (jz + 42) < 121) continue;
        if ((jx - 760) * (jx - 760) + (jz + 4.6) * (jz + 4.6) < 81) continue;
        var dd2 = Math.sqrt(jx * jx + jz * jz);
        if (dd2 < 165 || dd2 > 832) continue;
        var keep = 1 - empSS(480, 810, dd2) * 0.88;
        if (rg2() > keep) continue;
        var sscale = 0.85 + rg2() * 0.4;
        if (dd2 > EMP.TREEWIRE) wireTree(jx, jz, sscale, 0.45 + 0.55 * (1 - empSS(EMP.TREEWIRE, 832, dd2)));
        else { solidTree(jx, jz, sscale, dd2, rg2()); ccols.push({ min: [jx - 0.5, 0, jz - 0.5], max: [jx + 0.5, 2.6, jz + 0.5] }); }
      }
    }
    C.meshBounds(m); C.anchorize(m, 0.05, 90 + ci, 6);
    m._ccols = ccols;
    return m;
  }

  function sceneEmpire() {
    var s = {
      name: 'angel city 1937', sky: 'empire', fog: { near: 55, far: 200, col: '#4a3a4e' },
      groundY: 0, ambience: 'empire', colliders: [], insts: [],
      spawn: { pos: [-4, 0.02, -3.4], yaw: Math.PI / 2 },
      label: 'ANGEL CITY 1937', barricades: [], chunks: {}
    };
    var m = C.newMesh(), mg = C.newMesh();
    function col(x0, y0, z0, x1, y1, z1) { s.colliders.push(box([x0, y0, z0], [x1, y1, z1])); }
    function quad4(p0, p1, p2, p3, cc) { var b = m.v.length; m.v.push(p0, p1, p2, p3); C.addFace(m, [b, b + 1, b + 2, b + 3], cc); }
    function ceilQ(x0, z0, x1, z1, y, cc) { quad4([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], cc); }
    // ---------------- ground (kind ground: never culled, never staggered) ----------------
    C.addQuadY(mg, -420, -320, 1060, 360, -0.02, '#4c4436', 'floor');
    C.addQuadY(mg, -170, -62, 162, 120, 0.002, '#5a5440', 'floor');
    C.addQuadY(mg, -150, -6, 160, 6, 0.006, '#3a3a36', 'floor');
    for (var dsx = -146; dsx < 156; dsx += 8) C.addQuadY(mg, dsx, -0.14, dsx + 3.2, 0.14, 0.012, '#b8a86a');
    C.addQuadY(mg, -150, -9.4, 160, -6, 0.008, '#8a8474', 'floor');
    C.addQuadY(mg, -150, 6, 160, 9.4, 0.008, '#8a8474', 'floor');
    // ---------------- buildings (identity by measured color; words arrive by wire) ----------------
    function building(x, side, w, h, d, base, opts) {
      opts = opts || {};
      var z = side * (9.6 + d / 2), frontZ = z - side * (d / 2);
      C.addBox(m, x, h / 2, z, w, h, d, C.scaleHex(base, 0.78), { noBottom: true });
      C.addBox(m, x, h + 0.32, z, w + 0.3, 0.64, d + 0.3, opts.trim || '#6e5a40', { noBottom: true });
      var fz = frontZ - side * 0.03, flip = side > 0;
      C.addQuadZ(m, x - w / 2, 0, x + w / 2, h, fz, base, flip);
      var floors = opts.floors || Math.max(1, Math.round(h / 4.6)), cols2 = opts.cols || Math.max(2, Math.round(w / 5));
      var rgw = C.rng((Math.abs(x) * 31 + w * 7) >>> 0);
      for (var fr = 0; fr < floors; fr++) {
        for (var cw2 = 0; cw2 < cols2; cw2++) {
          var wx = x - w / 2 + (cw2 + 0.5) * (w / cols2), wy = 1.4 + fr * (h - 1.8) / floors;
          var lit = rgw() < (opts.litChance != null ? opts.litChance : 0.55);
          C.addQuadZ(m, wx - 0.55, wy, wx + 0.55, wy + 1.15, fz - side * 0.015, lit ? '#e8c27a' : '#252e38', flip);
        }
      }
      if (opts.sign) {
        var sy = opts.signY || (h - 1.3), sw = Math.min(w * 0.82, 9);
        C.addQuadZ(m, x - sw / 2, sy - 0.7, x + sw / 2, sy + 0.7, fz - side * 0.02, opts.sign, flip);
        if (opts.glow) {
          C.addQuadZ(m, x - sw / 2 + 0.3, sy - 0.28, x + sw / 2 - 0.3, sy + 0.28, fz - side * 0.035, opts.glow, flip);
        }
      }
      if (opts.awning) C.addBox(m, x, 2.9, frontZ - side * 0.5, w * 0.8, 0.12, 1.1, opts.awning, { noBottom: true });
      col(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2);
      return frontZ;
    }
    // north side (side -1, fronts face +z)
    building(-82, -1, 16, 6.5, 13, '#c9b896', { floors: 1, cols: 3, sign: '#1c1a17' });
    building(-70, -1, 9, 11.5, 13, '#8a5a44', { floors: 3, cols: 2 });
    building(-40, -1, 18, 9.5, 14, '#96604a', { floors: 2, cols: 4, awning: '#7a3a2e', sign: '#15211c', glow: '#6edcaa' });
    building(-22, -1, 14, 8.5, 14, '#ddd2b4', { floors: 2, cols: 3, awning: '#3c5a44', sign: '#1c1a17' });
    var rialtoF = building(-2, -1, 20, 14, 16, '#c49a84', { floors: 3, cols: 4, litChance: 0.35, sign: '#e8d9a8', glow: '#ffd478', signY: 5.6 });
    C.addQuadZ(m, -3.05, 6.2, -0.95, 14.6, rialtoF + 0.05, '#5a1c1c', true);
    for (var bl = 0; bl < 6; bl++) C.addQuadZ(m, -2.6, 13.6 - bl * 1.28, -1.4, 14.3 - bl * 1.28, rialtoF + 0.08, '#ffd9a0', true);
    building(20, -1, 14, 7.5, 13, '#9aa382', { floors: 1, cols: 3, sign: '#101a26', glow: '#86b4ff' });
    building(44, -1, 20, 10.5, 14, '#cfc4a4', { trim: '#4a4234', floors: 2, cols: 5, litChance: 0.25, sign: '#1c1a17' });
    building(80, -1, 22, 6, 14, '#b8ad94', { floors: 1, cols: 4, sign: '#1c1a17' });
    // south side (side +1, fronts face -z)
    building(-84, 1, 12, 7, 13, '#ddd2b4', { floors: 1, cols: 3, sign: '#1c1a17' });
    building(-70, 1, 12, 8.5, 13, '#8a5a44', { floors: 2, cols: 3, sign: '#1c1a17' });
    building(4, 1, 10, 7, 13, '#c9b896', { floors: 1, cols: 2, sign: '#1c1a17' });
    for (var bp = 0; bp < 3; bp++) C.addBox(m, 9.6, 2.15 + bp * 0.36, 9.35, 0.3, 0.3, 0.3, bp % 2 ? '#b03030' : '#3050a0', { noBottom: true });
    building(30, 1, 22, 13.5, 15, '#bcae8e', { trim: '#5a4c38', floors: 3, cols: 5, litChance: 0.6, sign: '#221012', glow: '#ff7060' });
    building(56, 1, 16, 6.5, 13, '#9aa382', { floors: 1, cols: 3, awning: '#7a5a2e', sign: '#1c1a17' });
    building(80, 1, 18, 7, 13, '#ddd2b4', { floors: 1, cols: 4, sign: '#1c1a17' });
    // ---------------- THE BLUE PACIFIC: hollow, walk in ----------------
    var BPB = '#39506a', BPT = '#1f2c3a';
    (function () {
      var x = -16, w = 18, h = 9, d = 14, z0 = 9.6, z1 = 23.6;
      C.addQuadZ(m, x - w / 2, 2.6, x + w / 2, h, z0 - 0.03, BPB, false);
      C.addQuadZ(m, x - w / 2, 0, -17.2, 2.6, z0 - 0.03, BPB, false);
      C.addQuadZ(m, -14.8, 0, x + w / 2, 2.6, z0 - 0.03, BPB, false);
      col(x - w / 2, 0, z0 - 0.2, -17.2, h, z0 + 0.2); col(-14.8, 0, z0 - 0.2, x + w / 2, h, z0 + 0.2);
      col(x - w / 2, 2.6, z0 - 0.2, x + w / 2, h, z0 + 0.2);
      C.addQuadZ(m, x - w / 2, 0, x + w / 2, h, z1 + 0.03, C.scaleHex(BPB, 0.8), true);
      col(x - w / 2, 0, z1 - 0.2, x + w / 2, h, z1 + 0.2);
      C.addQuadX(m, z0, 0, z1, h, x - w / 2 - 0.03, C.scaleHex(BPB, 0.72), true);
      C.addQuadX(m, z0, 0, z1, h, x + w / 2 + 0.03, C.scaleHex(BPB, 0.72), false);
      col(x - w / 2 - 0.2, 0, z0, x - w / 2 + 0.2, h, z1); col(x + w / 2 - 0.2, 0, z0, x + w / 2 + 0.2, h, z1);
      ceilQ(x - w / 2, z0, x + w / 2, z1, h + 0.02, BPT);
      C.addBox(m, x, h + 0.32, (z0 + z1) / 2, w + 0.3, 0.64, d + 0.3, BPT, { noBottom: true });
      C.addQuadZ(m, x - 4.5, 6.3, x + 4.5, 7.7, z0 - 0.06, '#0c1622', false);
      C.addQuadZ(m, x - 4.1, 6.55, x + 4.1, 7.45, z0 - 0.09, '#5ac8ff', false);
      C.addQuadZ(m, -22.4, 2.9, -21.4, 3.5, z0 - 0.06, '#0c1622', false);
      C.addQuadZ(m, -22.25, 3.32, -21.55, 3.44, z0 - 0.09, '#7fe7ff', false);
      C.addQuadZ(m, -21.98, 2.98, -21.82, 3.34, z0 - 0.09, '#7fe7ff', false);
      // interior: wood floor, wainscot, the bar
      C.addQuadY(m, x - w / 2, z0, x + w / 2, z1, 0.02, '#5a4632', 'floor');
      var iw = function (zq, flip2) {
        C.addQuadZ(m, x - w / 2, 0, x + w / 2, 1.15, zq, '#4a3a2a', flip2);
        C.addQuadZ(m, x - w / 2, 1.15, x + w / 2, 3.4, zq, '#39525a', flip2);
      };
      iw(z0 + 0.03, true); iw(z1 - 0.03, false);
      C.addQuadX(m, z0, 0, z1, 1.15, x - w / 2 + 0.03, '#4a3a2a', false); C.addQuadX(m, z0, 1.15, z1, 3.4, x - w / 2 + 0.03, '#39525a', false);
      C.addQuadX(m, z0, 0, z1, 1.15, x + w / 2 - 0.03, '#4a3a2a', true); C.addQuadX(m, z0, 1.15, z1, 3.4, x + w / 2 - 0.03, '#39525a', true);
      ceilQ(x + w / 2, z1, x - w / 2, z0, 3.4, '#453e34');
      C.addBox(m, -16.5, 0.55, 19.5, 13, 1.1, 0.85, '#4a3424', { noBottom: true });
      C.addBox(m, -16.5, 1.14, 19.5, 13.2, 0.07, 1.05, '#6e5034', { noBottom: true });
      col(-23.1, 0, 19.05, -9.9, 1.15, 19.95);
      C.addBox(m, -16.5, 1.75, 22.9, 13, 2.1, 0.14, '#2c2018', { noBottom: true });
      C.addQuadZ(m, -20.3, 1.6, -12.7, 2.7, 22.8, '#6a7a82', false);
      var rgb2 = C.rng(1937);
      var bcols = ['#7a4a2a', '#3a6a4a', '#6a3040', '#9a7a30', '#405a78', '#6e6e58'];
      for (var bt = 0; bt < 16; bt++) {
        var bx2 = -22.6 + (bt % 8) * 1.6 + rgb2() * 0.3, by2 = 1.35 + ((bt / 8) | 0) * 0.62;
        C.addBox(m, bx2, by2 + 0.17, 22.6, 0.12, 0.34, 0.12, bcols[bt % 6], { noBottom: true });
      }
      C.addBox(m, -22.9, 1.55, 22.62, 8.2, 0.05, 0.34, '#3a2c1e', { noBottom: true });
      for (var st2 = 0; st2 < 5; st2++) {
        var sx2 = -21 + st2 * 2.2;
        C.addBox(m, sx2, 0.38, 17.9, 0.14, 0.76, 0.14, '#2c2620', { noBottom: true });
        C.addBox(m, sx2, 0.79, 17.9, 0.52, 0.09, 0.52, '#6a2c2c', { noBottom: true });
        col(sx2 - 0.28, 0, 17.62, sx2 + 0.28, 0.85, 18.18);
      }
      for (var bo = 0; bo < 3; bo++) {
        var bz2 = 11.6 + bo * 3.0;
        C.addBox(m, -23.6, 0.42, bz2, 1.3, 0.84, 1.0, '#4a2a2a', { noBottom: true });
        C.addBox(m, -23.9, 0.9, bz2 + 0.62, 1.3, 0.9, 0.14, '#4a2a2a', { noBottom: true });
        col(-24.3, 0, bz2 - 0.6, -22.9, 1.0, bz2 + 0.7);
      }
      C.addBox(m, -8.6, 0.85, 22.2, 0.9, 1.7, 0.7, '#3a2c1e', { noBottom: true });
      C.addQuadX(m, 21.9, 1.6, 22.5, 2.2, -9.06, '#b8a06a', true);
      col(-9.1, 0, 21.8, -8.1, 1.7, 22.6);
      C.addBox(m, -10.4, 1.31, 19.4, 0.66, 0.34, 0.3, '#2c241c', { noBottom: true });
      C.addQuadZ(m, -10.6, 1.28, -10.2, 1.44, 19.24, '#e8a83c', false);
      C.addBox(m, -15.6, 1.25, 19.35, 0.09, 0.16, 0.09, '#c9862e', { noBottom: true });
    })();
    // ---------------- street furniture ----------------
    function lamp(x, z) {
      C.addBox(m, x, 2.3, z, 0.18, 4.6, 0.18, '#2c2c30', { noBottom: true });
      var ax = z > 0 ? -0.42 : 0.42;
      C.addBox(m, x + ax, 4.5, z, 0.84, 0.1, 0.1, '#2c2c30', { noBottom: true });
      C.addBox(m, x + ax * 2, 4.42, z, 0.34, 0.3, 0.34, '#c9a05a', { noBottom: true });
      col(x - 0.2, 0, z - 0.2, x + 0.2, 4.4, z + 0.2);
    }
    for (var lx0 = 0; lx0 < 6; lx0++) { var LXA = [-90, -50, -14, 24, 64, 100][lx0]; lamp(LXA, -6.4); lamp(LXA + 18, 6.4); }
    function palm(x, z, sc2) {
      sc2 = sc2 || 1; var rgp = C.rng((x * 13 + z * 7) >>> 0), h2 = (5.5 + rgp() * 2.5) * sc2;
      C.addBox(m, x, h2 / 2, z, 0.34 * sc2, h2, 0.34 * sc2, '#6a5638', { noBottom: true });
      for (var fi = 0; fi < 6; fi++) {
        var fa = fi / 6 * Math.PI * 2 + rgp() * 0.5, fx = Math.cos(fa), fz = Math.sin(fa);
        var p0 = [x + fx * 0.3, h2 + 0.1, z + fz * 0.3], p1 = [x + fx * 2.5 * sc2, h2 - 0.75 * sc2, z + fz * 2.5 * sc2];
        var sdx = -fz * 0.24, sdz = fx * 0.24;
        quad4([p0[0] - sdx, p0[1], p0[2] - sdz], [p0[0] + sdx, p0[1], p0[2] + sdz], [p1[0] + sdx, p1[1], p1[2] + sdz], [p1[0] - sdx, p1[1], p1[2] - sdz], '#3c5230');
        quad4([p1[0] - sdx, p1[1], p1[2] - sdz], [p1[0] + sdx, p1[1], p1[2] + sdz], [p0[0] + sdx, p0[1], p0[2] + sdz], [p0[0] - sdx, p0[1], p0[2] - sdz], '#31452a');
      }
      col(x - 0.3, 0, z - 0.3, x + 0.3, h2, z + 0.3);
    }
    for (var pxi = 0; pxi < 4; pxi++) { var PXA = [-96, -36, 36, 96][pxi]; palm(PXA, -8.9); palm(PXA + 14, 8.9); }
    var prevP = null;
    for (var pp = -140; pp <= 150; pp += 29) {
      C.addBox(m, pp, 3.7, -9.2, 0.24, 7.4, 0.24, '#4a3e30', { noBottom: true });
      C.addBox(m, pp, 6.7, -9.2, 2.0, 0.1, 0.1, '#4a3e30', { noBottom: true });
      col(pp - 0.2, 0, -9.4, pp + 0.2, 7.2, -9.0);
      if (prevP != null) { C.addBox(m, (prevP + pp) / 2, 6.42, -9.2, pp - prevP, 0.05, 0.04, '#1c1a18', { noBottom: true }); C.addBox(m, (prevP + pp) / 2, 6.1, -9.2, pp - prevP, 0.05, 0.04, '#1c1a18', { noBottom: true }); }
      prevP = pp;
    }
    C.addBox(m, -33, 1.15, 7.6, 2.4, 2.3, 1.4, '#28342a', { noBottom: true });
    C.addBox(m, -33, 2.42, 7.6, 2.8, 0.1, 1.9, '#3a2c1e', { noBottom: true });
    C.addBox(m, -33.5, 1.42, 8.15, 0.8, 0.18, 0.6, '#d8d2c2', { noBottom: true });
    C.addBox(m, -32.55, 1.42, 8.15, 0.8, 0.18, 0.6, '#cfc8b6', { noBottom: true });
    col(-34.3, 0, 6.8, -31.7, 2.3, 8.4);
    for (var bxi = 0; bxi < 2; bxi++) {
      var BXA = [-26, 40][bxi], BZA = [-7.4, 7.4][bxi];
      C.addBox(m, BXA, 0.55, BZA, 1.9, 0.1, 0.5, '#6a5436', { noBottom: true });
      C.addBox(m, BXA, 0.3, BZA + (BZA > 0 ? 0.24 : -0.24), 1.9, 0.5, 0.08, '#6a5436', { noBottom: true });
      col(BXA - 0.95, 0, BZA - 0.3, BXA + 0.95, 0.6, BZA + 0.3);
    }
    C.addBox(m, -44, 0.41, 6.8, 0.4, 0.7, 0.4, '#a03020', { noBottom: true }); col(-44.25, 0, 6.55, -43.75, 0.7, 7.05);
    // billboard at the east edge
    C.addQuadX(m, -30, 2.3, -14, 7.3, 131.9, '#e8d9b0', true);
    C.addQuadX(m, -30, 6.9, -14, 7.3, 131.85, '#d4641e', true);
    C.addQuadX(m, -30, 2.3, -14, 2.7, 131.85, '#d4641e', true);
    C.addQuadX(m, -28, 4.4, -16, 5.6, 131.85, '#b8541a', true);
    for (var lg2 = 0; lg2 < 3; lg2++) C.addBox(m, 132, 1.2, -28 + lg2 * 6, 0.22, 2.4, 0.22, '#4a3e30', { noBottom: true });
    col(131.4, 0, -30.5, 132.6, 7.3, -13.5);
    // bungalow hints on the residential stub
    for (var bg2 = 0; bg2 < 4; bg2++) {
      var hx = -58 + bg2 * 30, hz = 47, rgh = C.rng((hx * 5) >>> 0);
      var hb = ['#cfc0a4', '#9aa382', '#b8988a', '#c9b896'][bg2];
      C.addBox(m, hx, 1.6, hz, 8, 3.2, 6.5, hb, { noBottom: true });
      quad4([hx - 4.4, 3.2, hz - 3.6], [hx, 5.0, hz - 3.6], [hx, 5.0, hz + 3.6], [hx - 4.4, 3.2, hz + 3.6], '#5a3c30');
      quad4([hx + 4.4, 3.2, hz + 3.6], [hx, 5.0, hz + 3.6], [hx, 5.0, hz - 3.6], [hx + 4.4, 3.2, hz - 3.6], '#5a3c30');
      C.addQuadZ(m, hx - 2.2, 1.35, hx - 1.1, 2.55, hz - 3.28, rgh() < 0.7 ? '#ffd98a' : '#121826', true);
      C.addQuadZ(m, hx + 1.1, 1.35, hx + 2.2, 2.55, hz - 3.28, rgh() < 0.7 ? '#ffd98a' : '#121826', true);
      C.addBox(m, hx + 2.4, 4.0, hz + 1.2, 0.5, 1.8, 0.5, '#7a4a3a', { noBottom: true });
      col(hx - 4, 0, hz - 3.25, hx + 4, 3.2, hz + 3.25);
    }
    C.addBox(m, 0, 0.4, 43.4, 176, 0.8, 0.08, '#d8d4c8', { noBottom: true });
    // windmill
    for (var wl = 0; wl < 4; wl++) { var WDX = wl % 2 ? 0.9 : -0.9, WDZ = wl < 2 ? -0.9 : 0.9;
      C.addBox(m, 240 + WDX, 4.7, -42 + WDZ, 0.14, 9.5, 0.14, '#4a3e30', { noBottom: true }); }
    C.addBox(m, 240, 9.6, -42, 0.6, 0.5, 0.8, '#3a3c40', { noBottom: true });
    for (var fb = 0; fb < 8; fb++) { var fba = fb / 8 * Math.PI * 2;
      var f0 = [240 + Math.cos(fba) * 0.35, 9.6 + Math.sin(fba) * 0.35, -42.55], f1 = [240 + Math.cos(fba) * 1.5, 9.6 + Math.sin(fba) * 1.5, -42.55];
      var fdx = -Math.sin(fba) * 0.18, fdy = Math.cos(fba) * 0.18;
      quad4([f0[0] - fdx, f0[1] - fdy, f0[2]], [f0[0] + fdx, f0[1] + fdy, f0[2]], [f1[0] + fdx, f1[1] + fdy, f1[2]], [f1[0] - fdx, f1[1] - fdy, f1[2]], '#c8c4b8');
    }
    C.addBox(m, 242.8, 0.8, -41.6, 2.8, 1.6, 2.8, '#6a5436', { noBottom: true });
    col(238.8, 0, -43.2, 241.2, 9.5, -40.8); col(241.4, 0, -43.0, 244.2, 1.6, -40.2);
    // ---------------- Whitmore's packing shack (335, 26) ----------------
    (function () {
      var X = 335, Z = 26, W = 5.4, D = 4.4, H = 2.7, WD = '#6a5a40';
      C.addBox(m, X, H / 2, Z + D / 2, W, H, 0.18, WD, { noBottom: true }); col(X - W / 2, 0, Z + D / 2 - 0.15, X + W / 2, H, Z + D / 2 + 0.15);
      C.addBox(m, X - W / 2, H / 2, Z, 0.18, H, D, WD, { noBottom: true }); col(X - W / 2 - 0.15, 0, Z - D / 2, X - W / 2 + 0.15, H, Z + D / 2);
      C.addBox(m, X + W / 2, H / 2, Z, 0.18, H, D, WD, { noBottom: true }); col(X + W / 2 - 0.15, 0, Z - D / 2, X + W / 2 + 0.15, H, Z + D / 2);
      C.addBox(m, X - W / 4 - 0.28, H / 2, Z - D / 2, W / 2 - 0.55, H, 0.18, WD, { noBottom: true }); col(X - W / 2, 0, Z - D / 2 - 0.15, X - 0.55, H, Z - D / 2 + 0.15);
      C.addBox(m, X + W / 4 + 0.28, H / 2, Z - D / 2, W / 2 - 0.55, H, 0.18, WD, { noBottom: true }); col(X + 0.55, 0, Z - D / 2 - 0.15, X + W / 2, H, Z - D / 2 + 0.15);
      C.addBox(m, X, H - 0.25, Z - D / 2, 1.3, 0.5, 0.18, WD, { noBottom: true });
      C.addBox(m, X, H + 0.22, Z, W + 0.7, 0.14, D + 0.9, '#3c342a', { noBottom: true });
      C.addQuadY(m, X - W / 2 + 0.05, Z - D / 2 + 0.05, X + W / 2 - 0.05, Z + D / 2 - 0.05, 0.06, '#5c4a34', 'floor');
      C.addBox(m, X - W / 2 + 1.1, 0.3, Z + D / 2 - 0.65, 1.9, 0.4, 0.85, '#5a6248', { noBottom: true }); col(X - W / 2 + 0.15, 0, Z + D / 2 - 1.1, X - W / 2 + 2.05, 0.5, Z + D / 2 - 0.2);
      C.addBox(m, X + W / 2 - 0.7, 0.55, Z + D / 2 - 0.7, 0.62, 0.9, 0.62, '#2c2c30', { noBottom: true });
      C.addBox(m, X + W / 2 - 0.7, 2.0, Z + D / 2 - 0.7, 0.16, 2.2, 0.16, '#2c2c30', { noBottom: true });
      C.addBox(m, X + W / 2 - 0.9, 0.78, Z - D / 2 + 0.85, 1.2, 0.08, 0.8, '#3a2c1e', { noBottom: true }); col(X + W / 2 - 1.5, 0, Z - D / 2 + 0.45, X + W / 2 - 0.3, 0.85, Z - D / 2 + 1.25);
      C.addBox(m, X + W / 2 - 0.9, 0.85, Z - D / 2 + 0.85, 0.42, 0.06, 0.3, '#4a3a2c', { noBottom: true });
      C.addBox(m, X - W / 2 + 1.15, 0.14, Z + D / 2 - 1.35, 0.95, 0.07, 0.24, '#8a7456', { noBottom: true });
      C.addQuadZ(m, X - 1.7, H + 0.05, X + 1.7, H + 0.68, Z - D / 2 - 0.12, '#6a5a40', true);
      var CR = '#a08858';
      C.addBox(m, X - 3.4, 0.45, Z - 1.2, 0.9, 0.9, 0.9, CR, { noBottom: true });
      C.addBox(m, X - 3.4, 1.35, Z - 1.2, 0.9, 0.9, 0.9, CR, { noBottom: true });
      C.addBox(m, X - 2.4, 0.45, Z - 1.6, 0.9, 0.9, 0.9, CR, { noBottom: true });
      C.addBox(m, X + 3.5, 0.45, Z + 0.4, 0.9, 0.9, 0.9, CR, { noBottom: true });
      col(X - 4.1, 0, Z - 2.2, X - 2.1, 1.8, Z - 0.6); col(X + 2.95, 0, Z - 0.15, X + 4.05, 0.95, Z + 0.95);
      C.addQuadY(mg, X - 2.5, 3, X + 0.5, Z - D / 2, 0.014, '#7a6646', 'floor');
    })();
    // dead truck at 760: the last real object, half-claimed
    (function () {
      var X = 760, Z = -4.6, DK = '#2e2a26', WIRE = '#2aff70';
      C.addBox(m, X + 1.2, 1.35, Z, 1.9, 1.5, 1.8, DK, { noBottom: true });
      C.addBox(m, X + 2.75, 1.0, Z, 1.4, 0.85, 1.5, DK, { noBottom: true });
      C.addBox(m, X - 1.3, 0.95, Z, 2.9, 0.7, 1.9, DK, { noBottom: true });
      for (var wj = 0; wj < 4; wj++) { var WWX = [2.7, 2.7, -0.6, -2.2][wj], WWZ = wj % 2 ? -0.95 : 0.95;
        C.addBox(m, X + WWX, 0.42, Z + WWZ, 0.6, 0.84, 0.3, '#141210', { noBottom: true }); }
      C.addBox(m, X + 1.2, 2.13, Z, 1.94, 0.06, 1.84, WIRE, { noBottom: true });
      C.addBox(m, X - 1.3, 1.33, Z, 2.94, 0.06, 1.94, WIRE, { noBottom: true });
      C.addBox(m, X + 2.75, 1.46, Z, 1.44, 0.06, 1.54, WIRE, { noBottom: true });
      col(X - 2.9, 0, Z - 1.7, X + 3.6, 2.1, Z + 1.7);
    })();
    // road signs (the words arrive on approach)
    function roadSign(x, z, sm) {
      var sw2 = sm ? 1.1 : 1.5;
      C.addBox(m, x, 0.95, z, 0.13, 1.9, 0.13, '#4a3e30', { noBottom: true });
      C.addQuadX(m, z - sw2, 1.55, z + sw2, 2.45, x - 0.09, '#d8d2c2', true);
      C.addQuadX(m, z + sw2, 1.55, z - sw2, 2.45, x + 0.09, '#d8d2c2', false);
      col(x - 0.15, 0, z - 0.15, x + 0.15, 1.9, z + 0.15);
    }
    roadSign(288, -8.4, false); roadSign(512, 8.4, true);
    // ---------------- the boundary wall at 1000 ----------------
    for (var sg2 = 0; sg2 < 15; sg2++) {
      var a0 = -0.5 + sg2 / 15, a1 = -0.5 + (sg2 + 1) / 15;
      var q0 = [Math.cos(a0) * EMP.WALL, 0, Math.sin(a0) * EMP.WALL], q1 = [Math.cos(a1) * EMP.WALL, 0, Math.sin(a1) * EMP.WALL];
      quad4([q0[0], 0, q0[2]], [q0[0], 60, q0[2]], [q1[0], 60, q1[2]], [q1[0], 0, q1[2]], '#03120a');
      quad4([q0[0], 0, q0[2]], [q0[0], 60, q0[2]], [q0[0] * 1.0005, 60, q0[2] * 1.0005], [q0[0] * 1.0005, 0, q0[2] * 1.0005], '#1e9a52');
      for (var hb2 = 0; hb2 < 4; hb2++) { var hy2 = [3, 10, 22, 40][hb2];
        quad4([q0[0], hy2, q0[2]], [q0[0], hy2 + 0.7, q0[2]], [q1[0], hy2 + 0.7, q1[2]], [q1[0], hy2, q1[2]], '#17703c'); }
      quad4([q0[0], 0, q0[2]], [q0[0], 1.2, q0[2]], [q1[0], 1.2, q1[2]], [q1[0], 0, q1[2]], '#2aff70');
      var mnx = Math.min(q0[0], q1[0]) - 2, mxx = Math.max(q0[0], q1[0]) + 2;
      var mnz = Math.min(q0[2], q1[2]) - 2, mxz = Math.max(q0[2], q1[2]) + 2;
      col(mnx, 0, mnz, mxx, 60, mxz);
    }
    C.meshBounds(m); C.anchorize(m, 0.05, 81, 8);
    C.meshBounds(mg);
    s.insts.unshift(inst(m, [0, 0, 0], 0, { label: 'angel city', kind: 'static' }));
    s.insts.unshift(inst(mg, [0, 0, 0], 0, { label: 'the valley', kind: 'ground' }));
    // ---------------- moving parts: the sedan, the barricades, the townsfolk ----------------
    var sed = inst(P.sedan('#3a3e36'), [10, 0, -4.2], Math.PI / 2, { kind: 'sedan', label: '1937 sedan' });
    sed._col = box([8.9, 0, -5.3], [11.1, 1.6, -3.1]); s.colliders.push(sed._col);
    s.insts.push(sed); s.sedan = sed;
    var BARR = [[300, 1], [520, 2], [700, 3]];
    for (var bri = 0; bri < 3; bri++) {
      var BW = BARR[bri][1] === 3 ? 4.6 : 7.2;
      var bit = inst(P.barricade37(BARR[bri][1], false), [BARR[bri][0], 0, 0], Math.PI / 2, { kind: 'barricade', label: 'road closed' });
      var bcol = box([BARR[bri][0] - 0.35, 0, -BW / 2], [BARR[bri][0] + 0.35, 2.0, BW / 2]);
      s.colliders.push(bcol); s.insts.push(bit);
      s.barricades.push({ it: bit, col: bcol, kind: BARR[bri][1], broken: false, fly: null });
    }
    var doorIt = inst(P.shackDoor37(false), [334.45, 0, 23.8], 0, { kind: 'door', label: 'shack door' });
    s.insts.push(doorIt); s.shackDoor = doorIt;
    var gus = inst(P.human({ tier: 'custom', suit: '#2c3038', skin: '#b8a68e', hair: '#3a3630', shirt: '#e8e4d8', seed: 411 }), [-16, 0, 21.0], Math.PI, { kind: 'ped', label: 'the bartender' });
    gus.pose = [0, 0, 0, 0, 0, 0]; s.insts.push(gus);
    var pell = inst(P.human({ tier: 'custom', suit: '#7a5a4a', skin: '#c0a890', hair: '#4a4038', shirt: '#e0d6c0', seed: 512 }), [-30, 0, 7.0], Math.PI / 2, { kind: 'ped', label: 'a woman with oranges' });
    pell.pose = [0, 0, 0, 0, 0, 0]; s.insts.push(pell);
    var twinA = inst(P.human({ tier: 'custom', suit: '#565a60', skin: '#b8a890', hair: '#2c2c2e', shirt: '#dddbd4', seed: 777 }), [-95, 0, -7.0], Math.PI / 2, { kind: 'ped', label: 'a man in grey' });
    var twinB = inst(P.human({ tier: 'custom', suit: '#565a60', skin: '#b8a890', hair: '#2c2c2e', shirt: '#dddbd4', seed: 777 }), [95, 0, -7.0], -Math.PI / 2, { kind: 'ped', label: 'a man in grey' });
    twinA.pose = [0, 0, 0, 0, 0, 0]; twinB.pose = [0, 0, 0, 0, 0, 0];
    s.insts.push(twinA); s.insts.push(twinB);
    var orMesh = C.newMesh(); C.addBox(orMesh, 0, 0.09, 0, 0.18, 0.18, 0.18, '#d07818', { noBottom: true }); C.meshBounds(orMesh);
    var oranges = [];
    for (var og = 0; og < 3; og++) { var oi = inst(orMesh, [-999, 0, -999], 0, { kind: 'prop', label: 'oranges' }); oranges.push(oi); s.insts.push(oi); }
    // ---------------- regions: the town speaks on approach ----------------
    s.regions = [
      { x0: -30, x1: 12, z0: -8, z1: 8, head: 'ANGEL CITY', q: 'Evening. Find a drink \u2014 The Blue Pacific is open on Main.', said: false },
      { x0: -20, x1: -12, z0: 6.4, z1: 9.6, head: 'THE BLUE PACIFIC', q: 'COCKTAILS. MUSIC NIGHTLY. The door gives at a touch.', said: false },
      { x0: -9, x1: 5, z0: -9.6, z1: -6.4, head: 'THE RIALTO', q: 'SHADOWS OVER SUNSET. PLUS NEWSREEL. 25 CENTS.', said: false },
      { x0: 24, x1: 36, z0: 6.4, z1: 9.6, head: 'HOTEL MERIDIAN', q: 'STEAM HEAT. WEEKLY RATES.', said: false },
      { x0: 50, x1: 62, z0: 6.4, z1: 9.6, head: 'ANGEL CITY PRODUCE', q: 'ORANGES, 10 CENTS THE DOZEN.', said: false },
      { x0: 118, x1: 146, z0: -34, z1: -10, head: 'BILLBOARD', q: 'THE ORANGE EMPIRE. CALIFORNIA\u2019S GOLD \u00b7 SUNSHINE IN EVERY CRATE. VALENCIA GROVES NOW BEARING \u2014 EAST GROVE ROAD.', said: false },
      { x0: 278, x1: 298, z0: -13, z1: 13, head: 'ROAD SIGN', q: 'EAST GROVE ROAD. NO COUNTY SERVICE BEYOND THIS POINT.', said: false },
      { x0: 502, x1: 522, z0: -13, z1: 13, head: 'ROAD SIGN', q: 'PRIVATE GROVES. NO TRESPASSING.', said: false },
      { x0: 327, x1: 343, z0: 17, z1: 23.5, head: 'WHITMORE CITRUS CO.', q: 'PACKING. EST. 1921.', said: false },
      { x0: 748, x1: 774, z0: -16, z1: 6, head: 'EAST GROVE ROAD', q: 'The last real thing on the road. Half of it already remembers being lines.', said: false }
    ];
    // ---------------- the director ----------------
    var NOTE = ['If you found this, you noticed. Most don\u2019t.',
      'Watch Mrs. Pell at a quarter past. Any hour. Every hour.',
      'Charlie\u2019s paper is always fresh. It is always Friday.',
      'The record at the Pacific stumbles on bar seven. Count.',
      'I measured the rest of it. It isn\u2019t miles \u2014 it\u2019s a number: nine sixty-five.',
      'The groves get thin where the world runs out of ideas.',
      'Drive east. Past every sign. Don\u2019t stop.',
      '\u2014 J.W., June 11'];
    var ENDLINES = ['The road doesn\u2019t end. It just stops being a road.',
      'No crash. No cliff. The engine isn\u2019t killed \u2014 it\u2019s dismissed.',
      'The groves give up their oranges, then their leaves, then the pretense.',
      'Lines. Green lines on nothing, holding the shape of a valley out of habit.',
      'Gus is back there polishing the same glass. Mrs. Pell is gathering the same oranges.',
      'Somewhere a needle skips. Bar seven. Forever.',
      'Nine hundred sixty-five. Whitmore counted it too.'];
    var TERMINAL = ['MERIDIAN CIVIC SYSTEMS', 'UNIT 03 \u2014 \u201cANGEL CITY\u201d', 'CYCLE 14,022 \u00b7 STATUS: NOMINAL',
      'SUBJECT V-1937-0042 (VOSS, H.) AT WORLD BOUNDARY', 'CONTINUITY BREACH: NONE \u00b7 MEMORY POLICY: RETAIN'];
    s.NOTE = NOTE; s.ENDLINES = ENDLINES; s.TERMINAL = TERMINAL;
    s._f = { inBar: false, barT: 0, gusArc: 0, matchbook: false, skip: false, usual: false,
      paper1: false, paper2: false, paperAway: false, radioT: 0, radioDone: false,
      pellW: 0, pellHour: -1, pellStop: 0, pellToast: false, clockwork: false,
      twinsArmed: false, twinsDone: false, shack: false, note: false, knocked: 0, mirror: false,
      end: false, await: false, loop: false, epi: false, epiSaid: false };
    s._timers = []; s._beeps = []; s._crk = 0; s._crkN = 0;
    function at(game, dtAt, fn) { s._timers.push({ at: (game.time || 0) + dtAt, fn: fn }); }
    s.breakBarricade = function (game, b, dx2, dz2, v) {
      b.broken = true;
      var bci = s.colliders.indexOf(b.col); if (bci >= 0) s.colliders.splice(bci, 1);
      b.it.mesh = P.barricade37(b.kind, true);
      b.it.glyphEpoch = (b.it.glyphEpoch | 0) + 1; b.it.reResolve = 1; b.it.loadT = 0; b.it.loadDir = 1;
      b.fly = { vx: dx2 * v * 0.3, vz: dz2 * v * 0.3, t: 0.9 };
      s._f.knocked++;
      game.emit('thud'); game.shake = Math.max(game.shake || 0, 0.35);
      game.say(b.kind === 3 ? 'The sign splinters. Hand-paint and all.' : 'The barricade goes over.', 0.25);
      if (b.kind === 1) game.say('ROAD CLOSED \u2014 The sawhorse went over easy. Nothing behind it but more road. Why close a road to nowhere?', 2.2);
      if (b.kind === 3) game.say('TURN BACK \u2014 Hand-painted, the paint still tacky after who knows how long. Somebody wanted this to look desperate.', 2.2);
    };
    function seam(game, head, text) { game.emit('sting'); game.say('NOTICED \u2014 ' + head + '. ' + text, 0.3); }
    function doLoop(game) {
      s._f.await = false; s._f.loop = true;
      s._dismiss = false;
      if (game.car) game.dismountCar();
      s._c0 = game.time;
      var p2 = game.player; p2.pos = [-4, 0.02, -3.4]; p2.vel = [0, 0, 0]; p2.yaw = Math.PI / 2; p2.pitch = 0;
      if (sed._col) { var sci = s.colliders.indexOf(sed._col); if (sci >= 0) s.colliders.splice(sci, 1); }
      sed.pos = [10, 0, -4.2]; sed.yaw = Math.PI / 2;
      sed._col = box([8.9, 0, -5.3], [11.1, 1.6, -3.1]); s.colliders.push(sed._col);
      game.emit('rise');
      game.say('7:24 PM. Friday, June 11th, 1937.', 1.1);
    }
    s.onWord = function (game, raw) {
      if (!s._f.await) return false;
      var lw = String(raw).toLowerCase();
      if (/\b(return|loop|again|stay)\b/.test(lw)) { doLoop(game); return true; }
      if (/\b(end|wake|exit|leave|session)\b/.test(lw)) { s._f.await = false; game.transition('void', 'Session ended. Back to the white.'); return true; }
      game.say('The terminal is patient. RETURN, or END.', 0.2);
      return true;
    };
    s.update = function (game) {
      var p = game.player.pos, t = game.time || 0, F = s._f;
      var dtv = Math.min(0.06, t - (s._tT === undefined ? t : s._tT)); s._tT = t;
      if (s._c0 === undefined) s._c0 = t;
      var dayMin = EMP.START_MIN + (t - s._c0) * 0.5;
      s.skyT = dayMin;
      var dEdge = Math.sqrt(p[0] * p[0] + p[2] * p[2]);
      var nf = empNightF(dayMin), df = empDuskF(dayMin), ef = empSS(EMP.DESAT0, EMP.DARK1, dEdge);
      var fogC = C.mixHex(C.mixHex('#c9d4dc', '#4a3a4e', df), '#0a0d16', nf);
      s.fog.col = C.mixHex(fogC, '#020503', ef * 0.75);
      s.fog.far = (240 - 40 * df - 50 * nf) * (1 - 0.3 * ef);
      s.fog.near = 40;
      // timers
      for (var tiq = s._timers.length - 1; tiq >= 0; tiq--) { if (t >= s._timers[tiq].at) { var fnq = s._timers[tiq].fn; s._timers.splice(tiq, 1); fnq(); } }
      while (s._beeps.length && t >= s._beeps[0]) { s._beeps.shift(); game.emit('chirp'); }
      // regions (once each)
      for (var ri = 0; ri < s.regions.length; ri++) { var rg = s.regions[ri];
        if (!rg.said && p[0] > rg.x0 && p[0] < rg.x1 && p[2] > rg.z0 && p[2] < rg.z1) { rg.said = true; game.say(rg.head + ' \u2014 ' + rg.q, 0.35); } }
      // chunk streaming along the east road
      var cur = Math.max(0, Math.min(EMP.N - 1, Math.floor((p[0] - EMP.X0) / EMP.CH)));
      var lo = Math.max(0, cur - EMP.BEHIND), hi = Math.min(EMP.N - 1, cur + EMP.AHEAD);
      for (var ci2 = lo; ci2 <= hi; ci2++) {
        if (!s.chunks[ci2]) {
          var cmesh = empChunkMesh(ci2);
          var cit = inst(cmesh, [0, 0, 0], 0, { shadow: false, kind: 'world', label: 'east grove road' });
          cit.loadT = 1; cit.loadDir = 0; cit._ccols = cmesh._ccols;
          for (var cc2 = 0; cc2 < cit._ccols.length; cc2++) s.colliders.push(cit._ccols[cc2]);
          s.chunks[ci2] = cit; s.insts.push(cit);
        }
      }
      for (var key2 in s.chunks) { var kk = +key2;
        if (kk < lo || kk > hi) { var ci3 = s.chunks[kk]; var ix2 = s.insts.indexOf(ci3); if (ix2 >= 0) s.insts.splice(ix2, 1);
          if (ci3._ccols) { for (var cc3 = 0; cc3 < ci3._ccols.length; cc3++) { var cix = s.colliders.indexOf(ci3._ccols[cc3]); if (cix >= 0) s.colliders.splice(cix, 1); } }
          delete s.chunks[kk]; } }
      // barricade toss
      for (var bf = 0; bf < s.barricades.length; bf++) { var bb2 = s.barricades[bf];
        if (bb2.fly) { bb2.fly.t -= dtv; bb2.it.pos[0] += bb2.fly.vx * dtv; bb2.it.pos[2] += bb2.fly.vz * dtv; bb2.it.yaw += dtv * 2.6;
          if (bb2.fly.t <= 0) bb2.fly = null; } }
      // the bar: Gus, the record, the radio
      var inBar = p[0] > -25 && p[0] < -7 && p[2] > 9.6 && p[2] < 23.6;
      if (inBar && !F.inBar) {
        F.inBar = true;
        if (F.loop && !F.epiSaid) { F.epiSaid = true; F.epi = true;
          game.say('GUS \u2014 The clock behind him says 7:24. It has said 7:24 before. So. How green was it?', 1.4);
          at(game, 6.0, function () { game.say('GUS \u2014 There are worse loops, Mr. Voss.', 0); });
        } else if (!F.usual) { F.usual = true;
          game.say('GUS \u2014 First one\u2019s on the house. It always is.', 1.4);
          at(game, 5.0, function () { seam(game, 'THE USUAL', 'You never told Gus your drink. The rye was poured before your hat was off. He knew. He always knows.'); });
        }
      }
      if (!inBar) F.inBar = false;
      if (inBar) {
        F.barT += dtv;
        s._crk -= dtv;
        if (s._crk <= 0) { s._crkN = (s._crkN + 1) % 7; s._crk = s._crkN === 6 ? 0.55 : 2.1; game.emit('crackle'); }
        if (F.barT > 22 && F.gusArc === 0) { F.gusArc = 1;
          game.say('GUS \u2014 Things that happen the same way twice. Then a third time. Then every time.', 0.5);
          at(game, 5.2, function () { game.say('GUS \u2014 There was a grove man drank here. Jacob Whitmore. Smart. Started writing things down. Times. Faces. Filled half a ledger with quarter-pasts.', 0); });
          at(game, 11.4, function () { game.say('GUS \u2014 Then one evening his stool\u2019s empty. They say he drove east. They say a lot of things, in the same words, in the same order.', 0); });
          at(game, 17.6, function () { F.matchbook = true; game.say('He slides something across the bar. A matchbook, soft at the corners. WHITMORE CITRUS CO. \u2014 EAST GROVE ROAD.', 0); game.emit('sting'); });
          at(game, 23.0, function () { game.say('GUS \u2014 I never went. Got as far as the first sign, once. My legs just walked me home. Maybe you\u2019re built different, Mr. Voss.', 0); });
        }
        if (F.barT >= 64 && !F.skip) { F.skip = true;
          seam(game, 'THE SKIP', 'Bar seven, the record stumbles \u2014 the same stumble, every time around. Nobody else hears it. Or they\u2019ve stopped hearing it.');
        }
        var rdx = p[0] + 10.4, rdz = p[2] - 19.4;
        if (!F.radioDone && rdx * rdx + rdz * rdz < 3.4) {
          F.radioT += dtv;
          if (F.radioT >= 6) { F.radioDone = true;
            var b0 = t + 0.4, seq = [9, 6, 5], acc = 0;
            for (var dg3 = 0; dg3 < 3; dg3++) { for (var bp2 = 0; bp2 < seq[dg3]; bp2++) { s._beeps.push(b0 + acc); acc += 0.26; } acc += 1.1; }
            at(game, 0.4 + acc + 0.5, function () { seam(game, 'NINE, SIX, FIVE', 'A voice of beeps between stations: nine, six, five. Not a frequency. A distance.'); });
          }
        }
      }
      // the newsstand, twice
      var npx = p[0] + 33, npz = p[2] - 8.6, nd2 = npx * npx + npz * npz;
      if (!F.paper1) { if (nd2 < 5.5) { F.paper1 = true;
        game.say('THE EXAMINER \u2014 Friday, June 11th, 1937. Grove futures up. A heat spell that never arrives.', 0.35); } }
      else if (!F.paperAway) { if (nd2 > 60) F.paperAway = true; }
      else if (!F.paper2 && nd2 < 5.5) { F.paper2 = true;
        seam(game, 'EVERGREEN', 'The Examiner is fresh every morning, Charlie swears. It is the same paper. Friday, June 11th, 1937. Every column. Every smudge.'); }
      // Mrs. Pell: clockwork at a quarter past
      var hourKey = Math.floor(dayMin / 60), minOf = dayMin - hourKey * 60;
      if (F.pellStop > 0) {
        F.pellStop -= dtv;
        pell.pose[1] = 0; pell.pose[2] = 0; pell.pose[3] = 0; pell.pose[4] = 0;
      } else {
        pell._ph = (pell._ph || 0) + dtv * 3.9;
        pell._dir = pell._dir === undefined ? 1 : pell._dir;
        pell.pos[0] += pell._dir * 1.15 * dtv;
        if (pell.pos[0] > 56) pell._dir = -1; if (pell.pos[0] < -44) pell._dir = 1;
        pell.yaw = pell._dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        var sph = Math.sin(pell._ph);
        pell.pose[1] = sph * 0.5; pell.pose[2] = -sph * 0.5; pell.pose[3] = -sph * 0.38; pell.pose[4] = sph * 0.38;
        pell.pos[1] = Math.abs(Math.cos(pell._ph)) * 0.035;
      }
      if (minOf >= 15 && minOf < 16 && F.pellHour !== hourKey) {
        F.pellHour = hourKey; F.pellStop = 4.2;
        for (var og2 = 0; og2 < 3; og2++) { var oo = oranges[og2];
          oo.pos = [pell.pos[0] - 0.5 + og2 * 0.42, 0, pell.pos[2] + 0.55 + (og2 % 2) * 0.3]; oo.loadT = 0; oo.loadDir = 1; }
        var pdx = p[0] - pell.pos[0], pdz = p[2] - pell.pos[2];
        if (pdx * pdx + pdz * pdz < 196) {
          F.pellW++;
          if (!F.pellToast) { F.pellToast = true; game.say('A woman drops her oranges at the corner.', 0.4); }
          if (F.pellW >= 2 && !F.clockwork) { F.clockwork = true;
            seam(game, 'CLOCKWORK', 'Mrs. Pell drops her oranges at a quarter past. Every hour. Same oranges. Same words. Same spill.'); }
        }
      }
      // the twins
      if (!F.twinsArmed && t - s._c0 > 25 && Math.abs(p[2]) < 10 && p[0] > -70 && p[0] < 70) F.twinsArmed = true;
      if (F.twinsArmed && !F.twinsDone) {
        twinA._ph = (twinA._ph || 0) + dtv * 4.4; twinB._ph = (twinB._ph || 0) + dtv * 4.4;
        twinA.pos[0] += 1.3 * dtv; twinB.pos[0] -= 1.3 * dtv;
        var tphA = Math.sin(twinA._ph);
        twinA.pose[1] = tphA * 0.5; twinA.pose[2] = -tphA * 0.5; twinA.pose[3] = -tphA * 0.38; twinA.pose[4] = tphA * 0.38;
        twinB.pose[1] = tphA * 0.5; twinB.pose[2] = -tphA * 0.5; twinB.pose[3] = -tphA * 0.38; twinB.pose[4] = tphA * 0.38;
        var tdx = twinA.pos[0] - twinB.pos[0];
        var pdx2 = p[0] - twinA.pos[0], pdz2 = p[2] - twinA.pos[2];
        if (Math.abs(tdx) < 1.2 && pdx2 * pdx2 + pdz2 * pdz2 < 900 && !F.mirror) { F.mirror = true;
          seam(game, 'THE MIRROR', 'Two men in grey pass each other on Main. Same suit. Same face. Same nod. Neither breaks stride.'); }
        if (twinA.pos[0] > 78) { F.twinsDone = true; twinA.loadDir = -1; twinB.loadDir = -1; }
      }
      // the shack: the door, then the floor
      var sdx2 = p[0] - 335, sdz2 = p[2] - 23.8;
      if (!F.shack && sdx2 * sdx2 + sdz2 * sdz2 < 4.8) { F.shack = true;
        game.emit('creak');
        doorIt.mesh = P.shackDoor37(true); doorIt.state = 'open';
        doorIt.glyphEpoch = (doorIt.glyphEpoch | 0) + 1; doorIt.reResolve = 1; doorIt.loadT = 0; doorIt.loadDir = 1;
        game.say('The door gives. Dust, and a cot nobody folded.', 0.4);
      }
      var bdx = p[0] - 333.75, bdz = p[2] - 25.75;
      if (F.shack && !F.note && bdx * bdx + bdz * bdz < 2.0) { F.note = true;
        game.emit('sting');
        game.say('Under the loose board, a note in pencil:', 0.3);
        for (var nl = 0; nl < NOTE.length; nl++) game.say(NOTE[nl], 1.6 + nl * 2.5);
      }
      // the boundary at nine sixty-five
      if (!F.end && dEdge >= EMP.BOUNDARY) { F.end = true;
        s._dismiss = true;
        game.emit('powerdown');
        for (var el = 0; el < ENDLINES.length; el++) { (function (ln, ii) { at(game, 2.6 + ii * 4.4, function () { game.say(ln, 0); }); })(ENDLINES[el], el); }
        var tBase = 2.6 + ENDLINES.length * 4.4 + 1.4;
        for (var tl = 0; tl < TERMINAL.length; tl++) { (function (ln, ii) { at(game, tBase + ii * 1.6, function () { game.say(ln, 0); }); })(TERMINAL[tl], tl); }
        at(game, tBase + TERMINAL.length * 1.6 + 0.8, function () { F.await = true; game.say('SELECT \u2014 say RETURN to loop. Say END to wake.', 0); });
      }
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
      case 'epang': return sceneEpang();
      case 'empire': return sceneEmpire();
      default: return sceneVoid();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
