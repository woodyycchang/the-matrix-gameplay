'use strict';
/* tools/preview3d.js — zero-dependency preview renderer for web/world.js.
   Why this exists: no headless browser is available in this environment, so
   "screenshot the file" is implemented honestly as a software render of the
   SAME world spec the browser page consumes. Gouraud shading, point lights,
   exp2 fog, z-buffer, PNG via built-in zlib.
   Usage:
     node tools/preview3d.js --shot vista --pass 1 --out /tmp/a.png
     node tools/preview3d.js --shot vista --pass 1 --passB 0 --out /tmp/cmp.png   (side-by-side: B left, A right)
*/
const zlib = require('zlib');
const fs = require('fs');
const W3 = require('../web/world.js');
const E = require('../node/engine.js');

/* ---- boot assert: the 3D glyph field IS the 2D glyph field ---- */
(function specCheck() {
  if (W3.GLYPHS.join('') !== E.GLYPHS.join('')) throw new Error('glyph alphabet drift');
  const fake = { scene: { seed: W3.SPEC.SEED, canon: x => ((x % 48) + 48) % 48 } };
  for (let i = 0; i < 60; i++) {
    const cx = (i * 7) % 48, y = i % 4;
    if (E.glyphAt(fake, cx, y) !== W3.glyphAt(cx, y)) throw new Error('glyph field drift at ' + cx + ',' + y);
  }
  const T = W3.SPEC.TRAIN;
  if (!(W3.SPEC.TILES === 48 && W3.SPEC.SIGN0 === 22 && T.arrive === 24 && T.doorsOpen === 27 && T.doorsClose === 33 && T.depart === 35 && T.x0 === 14 && T.x1 === 34)) {
    throw new Error('spec constants drift from the game');
  }
})();

/* ---------------- args ---------------- */
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTNAME = arg('shot') || 'vista';
const PASS = +(arg('pass') ?? 1);
const PASSB = arg('passB') != null ? +arg('passB') : null;
const OUT = arg('out') || '/tmp/preview.png';
const IW = +(arg('w') || 1100), IH = +(arg('h') || 620);

const T6 = W3.SPEC.TILE;
const SHOTS = {
  vista:  { s: 16.5 * T6, h: 1.65, z: -3.4, yaw: -0.22, pitch: 0.05, t: 10, fov: 72, note: 'platform, looking along the up-curving loop toward the sign' },
  sign:   { s: 24.6 * T6, h: 1.65, z: -3.0, yaw: -Math.PI / 2 + 0.18, pitch: 0.16, t: 10, fov: 66, note: 'the MOBIL wall' },
  train:  { s: 24.5 * T6, h: 1.65, z: -2.4, yaw: Math.PI / 2 - 0.25, pitch: 0.02, t: 28.5, fov: 74, note: 'train at rest, doors open' },
  arrive: { s: 6.8 * T6,  h: 1.65, z: -2.8, yaw: 0.30, pitch: 0.03, t: 21.6, fov: 72, note: 'headlights coming down the curve' },
  seam:   { s: -7.0 * T6, h: -W3.SPEC.DROP + 1.6, z: 0.6, yaw: 0.0, pitch: 0.04, t: 6, fov: 72, note: 'on the tracks, marker sits at world s=0: nothing special there, and that is the point' },
};
const SHOT = SHOTS[SHOTNAME]; if (!SHOT) { console.error('unknown shot', SHOTNAME); process.exit(2); }

/* ---------------- math ---------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

function camera(shot) {
  const f = W3.frame(shot.s);
  const eye = W3.point(shot.s, shot.h, shot.z);
  let d = f.fwd.slice();
  // yaw around local up
  const cy = Math.cos(shot.yaw), sy = Math.sin(shot.yaw);
  const right0 = norm(cross(f.fwd, f.up)); // +z side
  d = norm(add(mul(f.fwd, cy), mul(right0, sy)));
  // pitch around right
  const right = norm(cross(d, f.up));
  const cp = Math.cos(shot.pitch), sp = Math.sin(shot.pitch);
  d = norm(add(mul(d, cp), mul(f.up, sp)));
  const up = norm(cross(right, d));
  return { eye, R: right, U: up, D: d };
}

/* ---------------- scene gather + vertex shading ---------------- */
function shadeScene(pass, t) {
  const world = W3.build(W3.SPEC, pass);
  const tr = W3.trainTris(W3.SPEC, pass, t);
  const tris = world.tris.concat(tr.bag.tris);
  const lights = world.lights.concat(tr.bag.lights).map(L => ({
    ...L, intensity: L.flicker ? L.intensity * W3.flicker(t) : L.intensity,
  }));
  return { tris, lights, ambient: world.ambient, fog: world.fog };
}

function renderPass(pass, buf, x0, w, h) {
  const t = SHOT.t;
  const { tris, lights, ambient, fog } = shadeScene(pass, t);
  const cam = camera(SHOT);
  const fpx = (h / 2) / Math.tan((SHOT.fov * Math.PI / 180) / 2);
  const cx = w / 2, cyy = h / 2;
  const zbuf = new Float32Array(w * h).fill(Infinity);

  const NEAR = 0.12;
  const view = p => { const r = sub(p, cam.eye); return [dot(r, cam.R), dot(r, cam.U), dot(r, cam.D)]; };

  function shadeVert(P, N, base, emi, gloss) {
    let r = base[0] * ambient[0], g = base[1] * ambient[1], b = base[2] * ambient[2];
    for (const L of lights) {
      const toL = sub(L.pos, P), d2 = dot(toL, toL), d = Math.sqrt(d2);
      if (d > L.range * 2.2) continue;
      const l = mul(toL, 1 / d);
      const att = L.intensity / (1 + (d / (L.range * 0.45)) ** 2) * 0.08;
      const nd = Math.max(0, dot(N, l));
      r += base[0] * L.color[0] * nd * att;
      g += base[1] * L.color[1] * nd * att;
      b += base[2] * L.color[2] * nd * att;
      if (gloss > 0) {
        const v = norm(sub(cam.eye, P));
        const hv = norm(add(l, v));
        const sp = Math.pow(Math.max(0, dot(N, hv)), 34) * gloss * att * 1.6;
        r += L.color[0] * sp; g += L.color[1] * sp; b += L.color[2] * sp;
      }
    }
    r += emi[0]; g += emi[1]; b += emi[2];
    // fog by view distance
    const dv = Math.hypot(P[0] - cam.eye[0], P[1] - cam.eye[1], P[2] - cam.eye[2]);
    const f = Math.exp(-Math.pow(dv * fog.density, 2));
    return [fog.color[0] + (r - fog.color[0]) * f, fog.color[1] + (g - fog.color[1]) * f, fog.color[2] + (b - fog.color[2]) * f];
  }

  // marker for the seam shot: a small bright beacon at world s = 0
  if (SHOTNAME === 'seam') {
    const b = { tris: [] , lights: [], points: []};
    const m = W3.point(0, -W3.SPEC.DROP + 0.55, 0.6);
    const s0 = 0;
    const f = W3.frame(s0);
    const up = f.up, fw = f.fwd, la = f.lat, r = 0.45;
    const top = add(m, mul(up, r)), bot = sub(m, mul(up, r));
    const e1 = add(m, mul(fw, r)), e2 = sub(m, mul(fw, r)), e3 = add(m, mul(la, r)), e4 = sub(m, mul(la, r));
    const oct = [[top,e1,e3],[top,e3,e2],[top,e2,e4],[top,e4,e1],[bot,e3,e1],[bot,e2,e3],[bot,e4,e2],[bot,e1,e4]];
    for (const q of oct) tris.push({ p: [...q[0], ...q[1], ...q[2]], c: [0,0,0, 0,0,0, 0,0,0], e: [1,0.5,0.9, 1,0.5,0.9, 1,0.5,0.9], gloss: 0 });
  }

  if (pass >= 3) {
    const bb = (P, size, col) => {
      const r = mul(cam.R, size), u = mul(cam.U, size);
      const A = add(add(P, r), u), B = add(sub(P, r), u), C = sub(sub(P, r), u), D = sub(add(P, r), u);
      tris.push({ p: [...A, ...B, ...C], c: [0,0,0,0,0,0,0,0,0], e: [...col, ...col, ...col], gloss: 0 });
      tris.push({ p: [...A, ...C, ...D], c: [0,0,0,0,0,0,0,0,0], e: [...col, ...col, ...col], gloss: 0 });
    };
    for (const d of W3.makeDust(W3.SPEC)) { const p = W3.dustPos(d, t); bb(W3.point(p[0], p[1], p[2]), 0.03, [0.5, 0.42, 0.28]); }
    for (const m of W3.moths(t)) bb(W3.point(m.s, m.h, m.z), 0.075, [0.9, 0.8, 0.55]);
    for (const w2 of W3.wisps(t)) if (w2.alpha > 0.05) bb(W3.point(w2.s, w2.h, w2.z), 0.10, [0.25 * w2.alpha, 0.9 * w2.alpha, 0.4 * w2.alpha]);
  }

  for (const tri of tris) {
    const A = tri.p.slice(0, 3), B = tri.p.slice(3, 6), C = tri.p.slice(6, 9);
    let N = norm(cross(sub(B, A), sub(C, A)));
    if (dot(N, sub(cam.eye, A)) < 0) N = mul(N, -1);
    const cols = [
      shadeVert(A, N, tri.c.slice(0, 3), tri.e.slice(0, 3), tri.gloss),
      shadeVert(B, N, tri.c.slice(3, 6), tri.e.slice(3, 6), tri.gloss),
      shadeVert(C, N, tri.c.slice(6, 9), tri.e.slice(6, 9), tri.gloss),
    ];
    // view space, near clip
    let poly = [ { v: view(A), c: cols[0] }, { v: view(B), c: cols[1] }, { v: view(C), c: cols[2] } ];
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ain = a.v[2] > NEAR, bin = b.v[2] > NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        const tt = (NEAR - a.v[2]) / (b.v[2] - a.v[2]);
        out.push({ v: [a.v[0] + (b.v[0] - a.v[0]) * tt, a.v[1] + (b.v[1] - a.v[1]) * tt, NEAR],
                   c: [a.c[0] + (b.c[0] - a.c[0]) * tt, a.c[1] + (b.c[1] - a.c[1]) * tt, a.c[2] + (b.c[2] - a.c[2]) * tt] });
      }
    }
    if (out.length < 3) continue;
    for (let k = 1; k + 1 < out.length; k++) rasterTri(out[0], out[k], out[k + 1]);
  }

  function rasterTri(a, b, c) {
    const pr = q => ({ x: cx + fpx * q.v[0] / q.v[2], y: cyy - fpx * q.v[1] / q.v[2], iz: 1 / q.v[2],
                       r: q.c[0] / q.v[2], g: q.c[1] / q.v[2], bb: q.c[2] / q.v[2] });
    const P = [pr(a), pr(b), pr(c)];
    const minx = Math.max(0, Math.floor(Math.min(P[0].x, P[1].x, P[2].x)));
    const maxx = Math.min(w - 1, Math.ceil(Math.max(P[0].x, P[1].x, P[2].x)));
    const miny = Math.max(0, Math.floor(Math.min(P[0].y, P[1].y, P[2].y)));
    const maxy = Math.min(h - 1, Math.ceil(Math.max(P[0].y, P[1].y, P[2].y)));
    const area = (P[1].x - P[0].x) * (P[2].y - P[0].y) - (P[1].y - P[0].y) * (P[2].x - P[0].x);
    if (Math.abs(area) < 1e-9) return;
    const inv = 1 / area;
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((P[1].x - px) * (P[2].y - py) - (P[1].y - py) * (P[2].x - px)) * inv;
        const w1 = ((P[2].x - px) * (P[0].y - py) - (P[2].y - py) * (P[0].x - px)) * inv;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const iz = w0 * P[0].iz + w1 * P[1].iz + w2 * P[2].iz;
        const z = 1 / iz, idx = y * w + x;
        if (z >= zbuf[idx]) continue;
        zbuf[idx] = z;
        const r = (w0 * P[0].r + w1 * P[1].r + w2 * P[2].r) * z;
        const g = (w0 * P[0].g + w1 * P[1].g + w2 * P[2].g) * z;
        const bl = (w0 * P[0].bb + w1 * P[1].bb + w2 * P[2].bb) * z;
        const o = (y * IW + (x + x0)) * 3;
        buf[o] = tone(r); buf[o + 1] = tone(g); buf[o + 2] = tone(bl);
      }
    }
  }
}

function tone(v) { // gentle filmic-ish rolloff + gamma
  const x = Math.max(0, v);
  const m = x / (1 + x * 0.85);
  return Math.max(0, Math.min(255, Math.round(Math.pow(m, 1 / 2.2) * 255 * 1.35)));
}

/* ---------------- PNG ---------------- */
function crc32(buf) {
  let c, table = crc32.T;
  if (!table) { table = crc32.T = new Int32Array(256); for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c; } }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 255];
  return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(path, rgb, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path, png);
}

/* ---------------- run ---------------- */
const buf = Buffer.alloc(IW * IH * 3);
// fog color background
(function fill() { const c = [6, 8, 8]; for (let i = 0; i < IW * IH; i++) { buf[i * 3] = c[0]; buf[i * 3 + 1] = c[1]; buf[i * 3 + 2] = c[2]; } })();

if (PASSB != null) {
  const half = Math.floor((IW - 6) / 2);
  renderPass(PASSB, buf, 0, half, IH);
  renderPass(PASS, buf, half + 6, half, IH);
  for (let y = 0; y < IH; y++) for (let x = half; x < half + 6; x++) { const o = (y * IW + x) * 3; buf[o] = buf[o + 1] = buf[o + 2] = 0; }
  console.log(`compare "${SHOTNAME}": left=pass${PASSB} right=pass${PASS} (${SHOT.note})`);
} else {
  renderPass(PASS, buf, 0, IW, IH);
  console.log(`shot "${SHOTNAME}" pass${PASS}: ${SHOT.note}`);
}
writePNG(OUT, buf, IW, IH);
console.log('wrote', OUT, `${IW}x${IH}`, `tris(scene) ok, spec-check ok`);
