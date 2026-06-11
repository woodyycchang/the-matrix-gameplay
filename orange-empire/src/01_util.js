// ============ 01 util ============
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
G.rng = mulberry32(19370611);
const R = () => G.rng();
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
function angLerp(a, b, t) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + d * t; }
function dist2(x1, z1, x2, z2) { const dx = x1 - x2, dz = z1 - z2; return dx * dx + dz * dz; }
function fmtClock(min) {
  let m = ((min % 1440) + 1440) % 1440; let h = Math.floor(m / 60), mm = Math.floor(m % 60);
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12; if (h === 0) h = 12;
  return h + ':' + String(mm).padStart(2, '0') + ' ' + ap;
}
// Terrain height — MUST match GLSL terrainH exactly (see 03_materials).
function terrainH(x, z) {
  const d = Math.sqrt(x * x + z * z);
  const rise = ss(CFG.D_RISE0, CFG.D_RISE1, d);
  if (rise <= 0) return 0;
  let h = Math.sin(x * 0.013 + 2.0) * Math.cos(z * 0.011 - 1.0) * 16.0
        + Math.sin(x * 0.043 + z * 0.017) * 3.5
        + Math.sin(z * 0.051 - x * 0.012) * 3.5
        + rise * 9.0;
  h *= rise;
  const roadInf = ss(0, 40, x) * (1 - ss(840, 900, x)) * (1 - ss(12, 34, Math.abs(z)));
  h *= (1 - roadInf);
  return h;
}
function edgeFactorAt(x, z) { return ss(CFG.D_DESAT0, CFG.D_DARK1, Math.sqrt(x * x + z * z)); }
// Collision helpers ---------------------------------------------------------
function addBox(set, cx, cz, hw, hd) { set.boxes.push({ x: cx, z: cz, hw, hd }); }
function addCircle(set, cx, cz, r) { const c = { x: cx, z: cz, r }; set.circles.push(c); return c; }
// Push a circle (px,pz,r) out of colliders; returns corrected [x,z,hit]
function collideCircle(set, px, pz, r) {
  let hit = false;
  for (let i = 0; i < set.boxes.length; i++) {
    const b = set.boxes[i];
    if (b.dead) continue;
    const dx = px - b.x, dz = pz - b.z;
    const ox = (b.hw + r) - Math.abs(dx), oz = (b.hd + r) - Math.abs(dz);
    if (ox > 0 && oz > 0) {
      hit = true;
      if (ox < oz) px = b.x + Math.sign(dx || 1) * (b.hw + r);
      else pz = b.z + Math.sign(dz || 1) * (b.hd + r);
    }
  }
  for (let i = 0; i < set.circles.length; i++) {
    const c = set.circles[i];
    if (c.dead) continue;
    const dx = px - c.x, dz = pz - c.z, rr = c.r + r;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-9) {
      hit = true; const d = Math.sqrt(d2);
      px = c.x + dx / d * rr; pz = c.z + dz / d * rr;
    }
  }
  return [px, pz, hit];
}
