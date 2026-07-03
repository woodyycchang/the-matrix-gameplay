'use strict';
/* the-matrix-gameplay — web/world.js
   One description of the 3D staging of Mobil Ave, consumed by BOTH:
     - web/mobil-ave-3d.html  (Three.js, in the browser)
     - tools/preview3d.js     (zero-dep software rasterizer, for screenshots)
   Pure data + pure functions. No THREE here. No DOM here.
   The station is a literal ring: world x ~ x + 48 tiles, so the floor is the
   inside of a cylinder of radius R. Walk forward forever; the floor curves up
   ahead and behind and brings you back.
   Pass gates: build(spec, pass) with pass = 0..3.
     0 baseline staging  1 geometry & detail  2 light & materials  3 atmosphere & life
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WORLD = factory();
}(typeof self !== 'undefined' ? self : this, function () {

const SPEC = {
  TILES: 48, TILE: 6.0,               // 288 m loop
  PLAT0: 6, PLAT1: 42,                // platform tiles [6,42)
  SIGN0: 22, SIGN: 'MOBIL',           // letters on tiles 22..26
  DOOR0: 22, DOOR1: 26,               // boardable tiles
  TRAIN: { period: 40, arrive: 24, doorsOpen: 27, doorsClose: 33, depart: 35, x0: 14, x1: 34 },
  TICK: 1.0,                          // seconds per game tick
  SEED: 0x4C1B06D0,                   // same glyph field as the 2D game
  // cross-section, meters. h: up from platform floor. z: lateral (axis).
  WALL_Z: -6.8, PLAT_Z0: -6.8, PLAT_Z1: -1.4,
  TRACK_Z0: -1.4, TRACK_Z1: 2.6, DROP: 1.1, CEIL: 5.2,
};
SPEC.CIRC = SPEC.TILES * SPEC.TILE;
SPEC.R = SPEC.CIRC / (2 * Math.PI);

/* ---------- the same glyph field as node/engine.js ---------- */
function hash2(seed, x, y) {
  let h = (seed ^ Math.imul(x | 0, 0x9E3779B1) ^ Math.imul(y | 0, 0x85EBCA77)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D);
  h = Math.imul(h ^ (h >>> 12), 0x297A2D39);
  h ^= h >>> 15;
  return h >>> 0;
}
const GLYPHS = ('ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ' + '012345789Z:=*+-<>').split('');
function glyphAt(cx, y) { return GLYPHS[hash2(SPEC.SEED >>> 0, cx, y) % GLYPHS.length]; }

/* ---------- ring frame ---------- */
function frame(s) {
  const a = s / SPEC.R, sa = Math.sin(a), ca = Math.cos(a);
  return {
    o: [SPEC.R * sa, -SPEC.R * ca, 0],   // floor point at arc s
    up: [-sa, ca, 0],
    fwd: [ca, sa, 0],
    lat: [0, 0, 1],
  };
}
function point(s, h, z) {
  const f = frame(s);
  return [f.o[0] + f.up[0] * h, f.o[1] + f.up[1] * h + 0 * z, f.o[2] + z];
}
function canonS(s) { const c = SPEC.CIRC; return ((s % c) + c) % c; }

/* ---------- helpers ---------- */
function h01(seed, a, b) { return hash2(seed >>> 0, a | 0, b | 0) / 4294967296; }

function makeBag() {
  const tris = [];   // {p:[9], c:[9], e:[9], gloss}
  const lights = []; // {pos, color[3], intensity, range, flicker?}
  const points = []; // {pos, color[3], size, kind}
  return { tris, lights, points };
}

function pushTri(bag, A, B, C, col, emi, gloss, tint) {
  const c = [], e = [];
  for (let i = 0; i < 3; i++) {
    const t = tint ? tint[i] : 1;
    c.push(col[0] * t, col[1] * t, col[2] * t);
    e.push(emi ? emi[0] : 0, emi ? emi[1] : 0, emi ? emi[2] : 0);
  }
  bag.tris.push({ p: [...A, ...B, ...C], c, e, gloss: gloss || 0 });
}
function pushQuad(bag, A, B, C, D, col, emi, gloss, tintABCD) {
  const t = tintABCD || [1, 1, 1, 1];
  pushTri(bag, A, B, C, col, emi, gloss, [t[0], t[1], t[2]]);
  pushTri(bag, A, C, D, col, emi, gloss, [t[0], t[2], t[3]]);
}
// box aligned to the ring frame at arc-center s
function pushBox(bag, s, h, z, ds, dh, dz, col, emi, gloss) {
  const f = frame(s);
  const ax = f.fwd, ay = f.up, az = f.lat;
  const cx = f.o[0] + ay[0] * h, cy = f.o[1] + ay[1] * h, cz = f.o[2] + z;
  const P = [];
  for (let i = 0; i < 8; i++) {
    const sx = (i & 1 ? 1 : -1) * ds / 2, sy = (i & 2 ? 1 : -1) * dh / 2, sz = (i & 4 ? 1 : -1) * dz / 2;
    P.push([cx + ax[0] * sx + ay[0] * sy + az[0] * sz,
            cy + ax[1] * sx + ay[1] * sy + az[1] * sz,
            cz + ax[2] * sx + ay[2] * sy + az[2] * sz]);
  }
  const F = [[0,1,3,2],[5,4,6,7],[4,0,2,6],[1,5,7,3],[2,3,7,6],[4,5,1,0]];
  for (const q of F) pushQuad(bag, P[q[0]], P[q[1]], P[q[2]], P[q[3]], col, emi, gloss);
}

/* ---------- palette ---------- */
const PAL = {
  tileWall:  [0.42, 0.46, 0.44],
  tileWallB: [0.30, 0.34, 0.33],
  platform:  [0.38, 0.37, 0.34],
  edgeStrip: [0.62, 0.55, 0.22],
  trackBed:  [0.16, 0.15, 0.14],
  sleeper:   [0.10, 0.09, 0.085],
  rail:      [0.55, 0.56, 0.58],
  tunnelW:   [0.20, 0.21, 0.22],
  ceil:      [0.24, 0.25, 0.26],
  pillar:    [0.34, 0.36, 0.35],
  bench:     [0.25, 0.20, 0.14],
  signGlow:  [0.62, 1.0, 0.72],
  lampWarm:  [1.0, 0.66, 0.28],
  cable:     [0.12, 0.12, 0.13],
  trainBody: [0.30, 0.33, 0.36],
  trainRoof: [0.22, 0.24, 0.26],
  window:    [1.0, 0.92, 0.62],
  headlight: [1.0, 0.95, 0.8],
};

/* ---------- 5x7 dot font for the sign ---------- */
const FONT = {
  M: ['10001','11011','10101','10001','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
};

/* ---------- time functions shared by both renderers ---------- */
function trainPose(timeSec) {
  const T = SPEC.TRAIN, tick = timeSec / SPEC.TICK;
  const t = ((tick % T.period) + T.period) % T.period;
  const stopS = ((T.x0 + T.x1) / 2) * SPEC.TILE;         // car-span center at rest
  const APPROACH = 110, LEAVE = 110;
  let present = false, s = stopS, doors = 0, moving = 0, arriving = false, leaving = false;
  if (t >= T.arrive - 4 && t < T.arrive) {               // decelerating in
    const u = (t - (T.arrive - 4)) / 4, e = 1 - Math.pow(1 - u, 3);
    present = true; arriving = true; s = stopS - APPROACH * (1 - e); moving = 1 - u;
  } else if (t >= T.arrive && t < T.depart) {            // at rest
    present = true;
    if (t >= T.doorsOpen && t < T.doorsClose) doors = Math.min(1, (t - T.doorsOpen) / 0.8);
    else if (t >= T.doorsClose) doors = Math.max(0, 1 - (t - T.doorsClose) / 0.8);
  } else if (t >= T.depart && t < T.depart + 4) {        // accelerating out
    const u = (t - T.depart) / 4, e = u * u * u;
    present = true; leaving = true; s = stopS + LEAVE * e; moving = u;
  }
  return { present, s, doors, moving, arriving, leaving, tickPhase: t };
}
function flicker(timeSec) { // one bad fluorescent: mostly on, occasional stutter
  const t = timeSec;
  const a = Math.sin(t * 31.7) * Math.sin(t * 7.3) * Math.sin(t * 1.9);
  return a > 0.86 ? 0.15 : (a > 0.78 ? 0.55 : 1.0);
}

/* ---------- the world ---------- */
function build(spec, pass) {
  const S = spec || SPEC, bag = makeBag();
  const SEGS = S.TILES * 2, ds = S.CIRC / SEGS;

  for (let i = 0; i < SEGS; i++) {
    const s0 = i * ds, s1 = s0 + ds, tile = Math.floor((i / 2));
    const onPlat = tile >= S.PLAT0 && tile < S.PLAT1;
    const grime = pass >= 1 ? 0.78 + 0.22 * h01(7, i, 0) : 1;

    // platform floor (or pit floor continuing where no platform)
    if (onPlat) {
      pushQuad(bag,
        point(s0, 0, S.PLAT_Z0), point(s1, 0, S.PLAT_Z0),
        point(s1, 0, S.PLAT_Z1), point(s0, 0, S.PLAT_Z1),
        PAL.platform, null, pass >= 2 ? 0.18 : 0,
        [grime, grime, 0.9 * grime, 0.9 * grime]);
      // platform edge face down to track bed
      pushQuad(bag,
        point(s0, 0, S.PLAT_Z1), point(s1, 0, S.PLAT_Z1),
        point(s1, -S.DROP, S.TRACK_Z0), point(s0, -S.DROP, S.TRACK_Z0),
        PAL.tileWallB, null, 0, [grime, grime, grime, grime]);
      if (pass >= 1) { // tactile warning strip
        pushQuad(bag,
          point(s0, 0.012, S.PLAT_Z1 + 0.55), point(s1, 0.012, S.PLAT_Z1 + 0.55),
          point(s1, 0.012, S.PLAT_Z1), point(s0, 0.012, S.PLAT_Z1),
          PAL.edgeStrip, null, 0.1, [grime, grime, grime, grime]);
      }
    } else { // no platform here: wall comes down to the pit
      pushQuad(bag,
        point(s0, 3.0, S.PLAT_Z1), point(s1, 3.0, S.PLAT_Z1),
        point(s1, -S.DROP, S.TRACK_Z0), point(s0, -S.DROP, S.TRACK_Z0),
        PAL.tunnelW, null, 0, [grime, grime, grime, grime]);
    }

    // track bed
    pushQuad(bag,
      point(s0, -S.DROP, S.TRACK_Z0), point(s1, -S.DROP, S.TRACK_Z0),
      point(s1, -S.DROP, S.TRACK_Z1), point(s0, -S.DROP, S.TRACK_Z1),
      PAL.trackBed, null, 0, [grime, grime, grime, grime]);

    // sign wall (platform side), full height
    if (onPlat) {
      const g2 = pass >= 1 ? 0.7 + 0.3 * h01(11, i, 1) : 1;
      pushQuad(bag,
        point(s0, 0, S.WALL_Z), point(s1, 0, S.WALL_Z),
        point(s1, S.CEIL, S.WALL_Z), point(s0, S.CEIL, S.WALL_Z),
        PAL.tileWall, null, pass >= 2 ? 0.12 : 0, [g2, g2, 0.85 * g2, 0.85 * g2]);
    }
    // tunnel wall (track side)
    pushQuad(bag,
      point(s0, -S.DROP, S.TRACK_Z1), point(s1, -S.DROP, S.TRACK_Z1),
      point(s1, S.CEIL, S.TRACK_Z1), point(s0, S.CEIL, S.TRACK_Z1),
      PAL.tunnelW, null, 0, [grime, grime, grime, grime]);
    // ceiling
    pushQuad(bag,
      point(s0, S.CEIL, S.WALL_Z), point(s1, S.CEIL, S.WALL_Z),
      point(s1, S.CEIL, S.TRACK_Z1), point(s0, S.CEIL, S.TRACK_Z1),
      PAL.ceil, null, 0, [grime, grime, grime, grime]);

    // pass 1: sleepers under the rails
    if (pass >= 1 && (i % 1 === 0)) {
      for (let k = 0; k < 3; k++) {
        const ss = s0 + (k + 0.5) * ds / 3;
        pushBox(bag, ss, -S.DROP + 0.05, 0.6, 0.5, 0.1, 2.6, PAL.sleeper, null, 0);
      }
    }
  }

  // pass 1: rails (long gloss strips), third rail
  if (pass >= 1) {
    const railSegs = S.TILES * 4, rds = S.CIRC / railSegs;
    for (let i = 0; i < railSegs; i++) {
      const s0 = i * rds, s1 = s0 + rds;
      for (const rz of [-0.15, 1.35]) {
        pushQuad(bag,
          point(s0, -S.DROP + 0.16, rz - 0.06), point(s1, -S.DROP + 0.16, rz - 0.06),
          point(s1, -S.DROP + 0.16, rz + 0.06), point(s0, -S.DROP + 0.16, rz + 0.06),
          PAL.rail, null, 0.85);
      }
      pushQuad(bag, // third rail, nearer tunnel wall
        point(s0, -S.DROP + 0.30, 2.1), point(s1, -S.DROP + 0.30, 2.1),
        point(s1, -S.DROP + 0.30, 2.22), point(s0, -S.DROP + 0.30, 2.22),
        [0.35, 0.33, 0.3], null, 0.5);
    }
    // cables along the tunnel wall
    for (let i = 0; i < railSegs; i++) {
      const s0 = i * rds, s1 = s0 + rds;
      for (const ch of [3.6, 3.95]) {
        pushQuad(bag,
          point(s0, ch, S.TRACK_Z1 - 0.06), point(s1, ch, S.TRACK_Z1 - 0.06),
          point(s1, ch + 0.09, S.TRACK_Z1 - 0.06), point(s0, ch + 0.09, S.TRACK_Z1 - 0.06),
          PAL.cable, null, 0.3);
      }
    }
  }

  // pass 1: pillars with base + capital, benches
  if (pass >= 1) {
    for (let tile = 8; tile < S.PLAT1; tile += 4) {
      const s = (tile + 0.5) * S.TILE, z = -4.1;
      const sides = 8, r = 0.36;
      for (let k = 0; k < sides; k++) {
        const a0 = (k / sides) * Math.PI * 2, a1 = ((k + 1) / sides) * Math.PI * 2;
        const f = frame(s);
        const c = [f.o[0], f.o[1], f.o[2] + z];
        const off = (ang, hh) => [
          c[0] + f.fwd[0] * Math.cos(ang) * r + f.up[0] * hh,
          c[1] + f.fwd[1] * Math.cos(ang) * r + f.up[1] * hh,
          c[2] + Math.sin(ang) * r];
        pushQuad(bag, off(a0, 0.25), off(a1, 0.25), off(a1, S.CEIL), off(a0, S.CEIL),
          PAL.pillar, null, pass >= 2 ? 0.15 : 0);
      }
      pushBox(bag, s, 0.125, z, 1.1, 0.25, 1.1, PAL.tileWallB, null, 0);       // base
      pushBox(bag, s, S.CEIL - 0.14, z, 1.2, 0.28, 1.2, PAL.tileWallB, null, 0); // capital
    }
    for (const tile of [12, 20, 28, 36]) {
      const s = (tile + 0.5) * S.TILE, z = -5.9;
      pushBox(bag, s, 0.46, z, 2.6, 0.10, 0.55, PAL.bench, null, 0.12);   // seat
      pushBox(bag, s, 0.95, z - 0.32, 2.6, 0.75, 0.08, PAL.bench, null, 0.12); // back
      for (const dsn of [-1.1, 1.1]) pushBox(bag, s + dsn, 0.21, z, 0.12, 0.42, 0.5, [0.1,0.1,0.11], null, 0.3);
    }
  }

  // the MOBIL sign: dot-matrix letters, emissive
  {
    const letterW = 2.0, letterH = 2.8, dot = 0.30, baseH = 2.2;
    const word = S.SIGN;
    for (let li = 0; li < word.length; li++) {
      const tile = S.SIGN0 + li, sC = (tile + 0.5) * S.TILE;
      const bmp = FONT[word[li]];
      const glow = pass >= 2 ? PAL.signGlow : [0.5, 0.8, 0.6];
      if (pass >= 1) pushBox(bag, sC, baseH + letterH / 2, S.WALL_Z + 0.10, letterW + 0.5, letterH + 0.5, 0.12, [0.06,0.07,0.065], null, 0.2); // backing plate
      for (let r = 0; r < 7; r++) for (let c2 = 0; c2 < 5; c2++) {
        if (bmp[r][c2] === '1') {
          const sx = sC - letterW / 2 + (c2 + 0.5) * (letterW / 5);
          const hy = baseH + letterH - (r + 0.5) * (letterH / 7);
          pushBox(bag, sx, hy, S.WALL_Z + 0.20, dot, dot, 0.14, [0.05,0.1,0.07], glow, 0);
        }
      }
    }
  }

  // pass 3: posters between pillars, stains, puddles
  if (pass >= 3) {
    const posters = [ {tile: 10, hue: [0.55, 0.42, 0.30]}, {tile: 18, hue: [0.30, 0.42, 0.52]}, {tile: 34, hue: [0.46, 0.34, 0.5]} ];
    for (const P of posters) {
      const s = (P.tile + 0.5) * S.TILE, w2 = 1.5, h0 = 1.15, h1 = 3.15, zW = S.WALL_Z + 0.06;
      pushQuad(bag, point(s - w2, h0, zW), point(s + w2, h0, zW), point(s + w2, h1, zW), point(s - w2, h1, zW), [0.07,0.07,0.075], null, 0.05); // frame mat
      const cols = 5, rows = 4;
      for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) {
        const u0 = -w2 + 0.12 + c2 * (2 * (w2 - 0.12) / cols), u1 = u0 + 2 * (w2 - 0.12) / cols - 0.05;
        const v0 = h0 + 0.12 + r * ((h1 - h0 - 0.55) / rows), v1 = v0 + (h1 - h0 - 0.55) / rows - 0.05;
        const k = h01(31, P.tile * 16 + c2, r);
        const col = [P.hue[0] * (0.5 + k * 0.8), P.hue[1] * (0.5 + (1 - k) * 0.8), P.hue[2] * (0.55 + k * 0.6)];
        pushQuad(bag, point(s + u0, v0, zW + 0.012), point(s + u1, v0, zW + 0.012), point(s + u1, v1, zW + 0.012), point(s + u0, v1, zW + 0.012), col, null, 0.08);
      }
      pushQuad(bag, point(s - w2 + 0.12, h1 - 0.4, zW + 0.012), point(s + w2 - 0.12, h1 - 0.4, zW + 0.012), point(s + w2 - 0.12, h1 - 0.12, zW + 0.012), point(s - w2 + 0.12, h1 - 0.12, zW + 0.012), [0.85,0.83,0.7], null, 0.05); // blank title bar
    }
    // stains under benches, drip streaks on tunnel wall
    for (const tile of [12, 20, 28, 36]) {
      const s = (tile + 0.5) * S.TILE;
      pushQuad(bag, point(s - 1.5, 0.006, -6.3), point(s + 1.5, 0.006, -6.3), point(s + 1.2, 0.006, -5.2), point(s - 1.2, 0.006, -5.2), [0.16,0.155,0.14], null, 0.3);
    }
    for (let k = 0; k < 14; k++) {
      const s = h01(41, k, 0) * S.CIRC, w3 = 0.25 + h01(41, k, 1) * 0.5, top = S.CEIL - 0.2, bot = top - 1.2 - h01(41, k, 2) * 2.2;
      pushQuad(bag, point(s - w3, bot, S.TRACK_Z1 - 0.02), point(s + w3, bot, S.TRACK_Z1 - 0.02), point(s + w3, top, S.TRACK_Z1 - 0.02), point(s - w3, top, S.TRACK_Z1 - 0.02), [0.12,0.13,0.135], null, 0.02);
    }
    // puddles: dark gloss patches
    for (let k = 0; k < 8; k++) {
      const s = h01(53, k, 0) * S.CIRC, onP = h01(53, k, 1) > 0.5;
      const hb = onP ? 0.004 : -S.DROP + 0.02, z0 = onP ? (-5.8 + h01(53, k, 2) * 3.6) : (0.2 + h01(53, k, 2) * 1.6);
      const w4 = 0.5 + h01(53, k, 3) * 0.9, d4 = 0.35 + h01(53, k, 4) * 0.6;
      if (onP) { const tl = s / S.TILE; if (tl < S.PLAT0 + 0.5 || tl > S.PLAT1 - 0.5) continue; }
      pushQuad(bag, point(s - w4, hb, z0 - d4), point(s + w4, hb, z0 - d4), point(s + w4 * 0.7, hb, z0 + d4), point(s - w4 * 0.7, hb, z0 + d4), [0.03,0.045,0.05], null, 0.95);
    }
  }

  /* ----- lights ----- */
  const amb = pass >= 2 ? 0.10 : 0.35;
  bag.ambient = [amb, amb * 1.05, amb * 1.05];
  bag.fog = pass >= 2 ? { color: [0.012, 0.02, 0.02], density: 0.030 }
                      : { color: [0.05, 0.055, 0.055], density: 0.020 };
  if (pass >= 2) {
    for (let tile = 7; tile < S.PLAT1; tile += 4) {
      const s = (tile + 0.5) * S.TILE;
      const fl = (tile === 27); // the bad one, above the doors — of course
      bag.lights.push({ pos: point(s, S.CEIL - 0.5, -3.6), color: PAL.lampWarm, intensity: 15, range: 16, flicker: fl });
      pushBox(bag, s, S.CEIL - 0.18, -3.6, 1.7, 0.16, 0.4, [0.05,0.05,0.05], fl ? null : [0.9,0.62,0.3], 0); // fixture tube
    }
    // sign wash
    bag.lights.push({ pos: point((S.SIGN0 + 2.5) * S.TILE, 3.4, S.WALL_Z + 2.2), color: [0.5, 1.0, 0.65], intensity: 9, range: 13 });
    // sparse cold service lights over the bare stretch (tiles 42..6)
    for (const tile of [44, 0, 4]) {
      bag.lights.push({ pos: point((tile + 0.5) * S.TILE, S.CEIL - 0.6, 1.8), color: [0.5, 0.62, 0.7], intensity: 6, range: 12 });
      pushBox(bag, (tile + 0.5) * S.TILE, S.CEIL - 0.2, 1.8, 0.5, 0.14, 0.3, [0.04,0.04,0.045], [0.4,0.5,0.55], 0);
    }
  } else {
    // pass 0/1: three plain utility lights so the baseline is visible at all
    for (const tile of [12, 24, 36]) bag.lights.push({ pos: point((tile + 0.5) * S.TILE, S.CEIL - 0.6, -2.5), color: [1, 1, 1], intensity: 10, range: 22 });
  }

  return bag;
}

/* ---------- the train, rebuilt per frame from its pose ---------- */
function trainTris(spec, pass, timeSec) {
  const S = spec || SPEC, bag = makeBag();
  const pose = trainPose(timeSec);
  if (!pose.present) return { bag, pose };
  const spanTiles = S.TRAIN.x1 - S.TRAIN.x0;           // 20 tiles = 120 m
  const carsN = 10, carL = (spanTiles * S.TILE) / carsN, gap = 0.5;
  const zC = 0.6, bodyW = 2.8, bodyH = 2.9, floorH = -S.DROP + 0.45;
  for (let c = 0; c < carsN; c++) {
    const sC = pose.s - (spanTiles * S.TILE) / 2 + (c + 0.5) * carL;
    for (let half = 0; half < 2; half++) {              // 2 bent segments per car
      const sh = sC + (half ? carL / 4 : -carL / 4), L = carL / 2 - gap / 2;
      pushBox(bag, sh, floorH + bodyH / 2, zC, L, bodyH, bodyW, PAL.trainBody, null, pass >= 2 ? 0.35 : 0);
      pushBox(bag, sh, floorH + bodyH + 0.12, zC, L * 0.96, 0.24, bodyW * 0.9, PAL.trainRoof, null, 0.2);
      // window band, platform side (emissive when lit)
      pushQuad(bag,
        point(sh - L / 2 + 0.25, floorH + 1.5, zC - bodyW / 2 - 0.01),
        point(sh + L / 2 - 0.25, floorH + 1.5, zC - bodyW / 2 - 0.01),
        point(sh + L / 2 - 0.25, floorH + 2.4, zC - bodyW / 2 - 0.01),
        point(sh - L / 2 + 0.25, floorH + 2.4, zC - bodyW / 2 - 0.01),
        [0.08, 0.08, 0.06], pass >= 2 ? PAL.window : [0.6,0.55,0.4], 0.4);
    }
    if (pass >= 3) { // window mullions + roof vents
      for (let half = 0; half < 2; half++) {
        const sh = sC + (half ? carL / 4 : -carL / 4), L = carL / 2 - gap / 2;
        for (let m = 1; m < 4; m++) {
          const sm = sh - L / 2 + (m * L) / 4;
          pushBox(bag, sm, floorH + 1.95, zC - bodyW / 2 - 0.02, 0.09, 0.95, 0.05, [0.12,0.13,0.14], null, 0.2);
        }
        pushBox(bag, sh, floorH + bodyH + 0.32, zC, L * 0.4, 0.16, 1.1, [0.15,0.16,0.17], null, 0.1);
      }
    }
    // doors facing platform on cars whose center lies in the door zone
    const tileOfCar = sC / S.TILE;
    if (tileOfCar >= S.DOOR0 - 0.4 && tileOfCar <= S.DOOR1 + 0.4) {
      const slide = pose.doors * 0.95;
      for (const side of [-1, 1]) {
        pushBox(bag, sC + side * (0.55 + slide), floorH + 1.15, zC - bodyW / 2 - 0.06, 1.0, 2.3, 0.10, [0.18,0.2,0.22], null, 0.3);
      }
      if (pose.doors > 0.05) { // lit doorway
        pushQuad(bag,
          point(sC - 0.5 * pose.doors, floorH + 0.05, zC - bodyW / 2 - 0.02),
          point(sC + 0.5 * pose.doors, floorH + 0.05, zC - bodyW / 2 - 0.02),
          point(sC + 0.5 * pose.doors, floorH + 2.25, zC - bodyW / 2 - 0.02),
          point(sC - 0.5 * pose.doors, floorH + 2.25, zC - bodyW / 2 - 0.02),
          [0.1,0.1,0.08], [1.0, 0.9, 0.6], 0);
      }
    }
  }
  // head/tail lights + light sources
  const headS = pose.s + (pose.leaving ? 1 : -1) * (spanTiles * S.TILE) / 2;
  const front = pose.arriving || (!pose.leaving);
  const fS = pose.s - (spanTiles * S.TILE) / 2, bS = pose.s + (spanTiles * S.TILE) / 2;
  pushBox(bag, fS, floorH + 0.9, zC - 0.8, 0.1, 0.22, 0.22, [0.05,0.05,0.05], PAL.headlight, 0);
  pushBox(bag, fS, floorH + 0.9, zC + 0.8, 0.1, 0.22, 0.22, [0.05,0.05,0.05], PAL.headlight, 0);
  pushBox(bag, bS, floorH + 0.9, zC - 0.8, 0.1, 0.2, 0.2, [0.05,0.02,0.02], [1, 0.12, 0.1], 0);
  pushBox(bag, bS, floorH + 0.9, zC + 0.8, 0.1, 0.2, 0.2, [0.05,0.02,0.02], [1, 0.12, 0.1], 0);
  if (pass >= 2) {
    bag.lights.push({ pos: point(fS - 1.2, floorH + 1.0, zC), color: [1, 0.95, 0.8], intensity: pose.moving ? 22 : 8, range: 26 });
    bag.lights.push({ pos: point(pose.s, floorH + 2.0, zC), color: [1, 0.9, 0.6], intensity: 6, range: 14 });
  }
  return { bag, pose };
}

/* ---------- pass 3 life: shared by both renderers ---------- */
function makeDust(spec) {
  const S = spec || SPEC, out = [];
  for (let tile = 7; tile < S.PLAT1; tile += 4) {
    for (let k = 0; k < 26; k++) {
      out.push({
        s: (tile + 0.5) * S.TILE + (h01(61, tile, k) - 0.5) * 4.5,
        h: 1.0 + h01(62, tile, k) * (S.CEIL - 1.6),
        z: -3.6 + (h01(63, tile, k) - 0.5) * 3.4,
        amp: 0.25 + h01(64, tile, k) * 0.45,
        sp: 0.15 + h01(65, tile, k) * 0.3,
        ph: h01(66, tile, k) * Math.PI * 2,
      });
    }
  }
  return out;
}
function dustPos(d, t) {
  return [d.s + Math.sin(t * d.sp + d.ph) * d.amp,
          d.h + Math.sin(t * d.sp * 0.7 + d.ph * 1.7) * d.amp * 0.6,
          d.z + Math.cos(t * d.sp * 0.9 + d.ph) * d.amp * 0.5];
}
function moths(t) { // two moths around the bad fluorescent at tile 27
  const sL = 27.5 * SPEC.TILE, out = [];
  for (let i = 0; i < 2; i++) {
    const w = 2.1 + i * 0.9, ph = i * 2.4;
    out.push({ s: sL + Math.sin(t * w + ph) * (0.5 + 0.2 * i),
               h: SPEC.CEIL - 0.75 + Math.sin(t * w * 1.7 + ph) * 0.28,
               z: -3.6 + Math.cos(t * w * 0.9 + ph) * (0.45 + 0.15 * i) });
  }
  return out;
}
function wisps(t) { // glyphs sweating off the sign wall, rising and fading
  const out = [];
  for (let i = 0; i < 7; i++) {
    const life = 7 + (i % 3), u = ((t * (0.9 + 0.13 * i) + i * 2.31) % life) / life;
    const cx = SPEC.SIGN0 + (i * 5) % 5; // canonical tiles 22..26
    out.push({
      s: (cx + 0.5) * SPEC.TILE + Math.sin(i * 9.1) * 2.0 + Math.sin(t * 0.4 + i) * 0.3,
      h: 0.8 + u * 3.6,
      z: SPEC.WALL_Z + 0.35 + u * 0.5,
      alpha: u < 0.15 ? u / 0.15 : (1 - u) * 1.1,
      glyph: glyphAt(cx, (i * 7 + Math.floor(t / life)) % 4),
    });
  }
  return out;
}

return { SPEC, PAL, build, trainTris, trainPose, flicker, frame, point, canonS, glyphAt, hash2, GLYPHS, makeDust, dustPos, moths, wisps };
}));
