/* node/raster.js — draw-list -> RGBA buffer (mirrors the browser painter) */
'use strict';
const C = globalThis.C;

function Frame(w, h) {
  this.w = w; this.h = h;
  this.buf = Buffer.alloc(w * h * 4);
}
Frame.prototype.clear = function (hex) {
  const [r, g, b] = C.hex2rgb(hex);
  for (let i = 0; i < this.buf.length; i += 4) {
    this.buf[i] = r; this.buf[i + 1] = g; this.buf[i + 2] = b; this.buf[i + 3] = 255;
  }
};
Frame.prototype.px = function (x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
  const i = (y * this.w + x) * 4, ia = 1 - a;
  this.buf[i] = r * a + this.buf[i] * ia;
  this.buf[i + 1] = g * a + this.buf[i + 1] * ia;
  this.buf[i + 2] = b * a + this.buf[i + 2] * ia;
  this.buf[i + 3] = 255;
};
Frame.prototype.rect = function (x0, y0, x1, y1, hex, a) {
  const [r, g, b] = C.hex2rgb(hex);
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(this.w, Math.ceil(x1)); y1 = Math.min(this.h, Math.ceil(y1));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) this.px(x, y, r, g, b, a);
};
Frame.prototype.poly = function (pts, hex, a) {
  const [r, g, b] = C.hex2rgb(hex);
  let minY = 1e9, maxY = -1e9;
  for (let i = 1; i < pts.length; i += 2) { if (pts[i] < minY) minY = pts[i]; if (pts[i] > maxY) maxY = pts[i]; }
  minY = Math.max(0, Math.floor(minY)); maxY = Math.min(this.h - 1, Math.ceil(maxY));
  const n = pts.length / 2;
  for (let y = minY; y <= maxY; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < n; i++) {
      const x0 = pts[i * 2], y0 = pts[i * 2 + 1];
      const j = (i + 1) % n;
      const x1 = pts[j * 2], y1 = pts[j * 2 + 1];
      if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) {
        xs.push(x0 + (yc - y0) / (y1 - y0) * (x1 - x0));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(this.w - 1, Math.round(xs[k + 1]));
      for (let x = xa; x <= xb; x++) this.px(x, y, r, g, b, a);
    }
  }
};
Frame.prototype.line = function (x0, y0, x1, y1, hex, a, wpx) {
  const [r, g, b] = C.hex2rgb(hex);
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const hw = Math.max(0, ((wpx || 1) - 1) / 2);
  for (let s = 0; s <= steps; s++) {
    const x = x0 + (x1 - x0) * s / steps, y = y0 + (y1 - y0) * s / steps;
    for (let dy = -hw; dy <= hw; dy++) for (let dx = -hw; dx <= hw; dx++) {
      this.px(Math.round(x + dx), Math.round(y + dy), r, g, b, a);
    }
  }
};
// glyph: small block + notch keyed to the char so density/texture reads in stills
Frame.prototype.glyph = function (x, y, s, ch, hex, a) {
  const [r, g, b] = C.hex2rgb(hex);
  const w = Math.max(1, s * 0.55), h = Math.max(2, s * 0.85);
  const cc = ch.charCodeAt(0);
  for (let yy = -h / 2; yy < h / 2; yy++) for (let xx = -w / 2; xx < w / 2; xx++) {
    const inner = Math.abs(xx) < w / 2 - 1 && Math.abs(yy) < h / 2 - 1;
    const notch = ((cc + (yy | 0)) % 3 === 0) && inner;
    if (inner && !notch && s > 9) continue; // hollow-ish for big glyphs
    this.px(Math.round(x + xx), Math.round(y + yy), r, g, b, a * (inner ? 0.9 : 1));
  }
};
Frame.prototype.text = function (x, y, s, str, hex, a) {
  const cw = s * 0.66;
  let sx = x - (str.length * cw) / 2;
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== ' ') this.glyph(sx + cw / 2, y, s, str[i], hex, a);
    sx += cw;
  }
};
Frame.prototype.vgrad = function (stops) { // [[t,hex],...] t ascending 0..1
  for (let y = 0; y < this.h; y++) {
    const t = y / (this.h - 1);
    let aIdx = 0;
    while (aIdx < stops.length - 2 && t > stops[aIdx + 1][0]) aIdx++;
    const [t0, c0] = stops[aIdx], [t1, c1] = stops[aIdx + 1];
    const k = C.clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1);
    const col = C.hex2rgb(C.mixHex(c0, c1, k));
    for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4;
      this.buf[i] = col[0]; this.buf[i + 1] = col[1]; this.buf[i + 2] = col[2]; this.buf[i + 3] = 255;
    }
  }
};

function paint(frame, ops, gameMode) {
  const W = frame.w, H = frame.h;
  for (const op of ops) {
    switch (op.t) {
      case 'sky': {
        if (op.mode === 'code') frame.clear('#020803');
        else if (op.mode === 'white') frame.clear(op.fogCol);
        else {
          const hor = C.clamp((H * 0.5 + Math.tan(op.pitch) * H * 0.62) / H, 0.02, 0.98);
          if (op.mode === 'neon') frame.vgrad([[0, '#04040a'], [hor, '#0c0a18'], [1, op.fogCol]]);
          else if (op.mode === 'city') frame.vgrad([[0, '#9fb2bf'], [hor, '#cfd6da'], [1, op.fogCol]]);
          else if (op.mode === 'day') frame.vgrad([[0, '#aebfc8'], [hor, '#d6dadc'], [1, op.fogCol]]);
          else if (op.mode === 'hall') frame.vgrad([[0, '#0f0c0a'], [1, op.fogCol]]);
          else frame.vgrad([[0, '#c9bda3'], [1, op.fogCol]]);
        }
        break;
      }
      case 'poly': frame.poly(op.p, op.c, op.a == null ? 1 : op.a); break;
      case 'line': frame.line(op.x0, op.y0, op.x1, op.y1, op.c, op.a, op.wpx); break;
      case 'g': frame.glyph(op.x, op.y, op.s, op.ch, op.c, op.a); break;
      case 'text': frame.text(op.x, op.y, op.s, op.str, op.c, op.a); break;
      case 'vig': {
        const [r, g, b] = C.hex2rgb(op.c);
        const cx = W / 2, cy = H / 2, r0 = Math.min(W, H) * 0.32, r1 = Math.max(W, H) * 0.72;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const d = Math.hypot(x - cx, y - cy);
          const k = C.clamp((d - r0) / (r1 - r0), 0, 1);
          if (k > 0) frame.px(x, y, r, g, b, k * op.a * 0.85);
        }
        break;
      }
      case 'flash': {
        const [r, g, b] = C.hex2rgb(op.c);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) frame.px(x, y, r, g, b, Math.min(1, op.a));
        break;
      }
      case 'crack': {
        const s = Math.min(W, H) * 0.62, cx = W / 2, cy = H / 2;
        for (const sg of op.segs) {
          frame.line(cx + sg[0] * s, cy + sg[1] * s, cx + sg[2] * s, cy + sg[3] * s, '#ffffff', op.a * 0.3, 4);
        }
        for (const sg of op.segs) {
          frame.line(cx + sg[0] * s, cy + sg[1] * s, cx + sg[2] * s, cy + sg[3] * s, '#101210', op.a * 0.85, 2);
        }
        break;
      }
      case 'bars': {
        const bh = H * 0.11;
        frame.rect(0, 0, W, bh, '#000000', op.a);
        frame.rect(0, H - bh, W, H, '#000000', op.a);
        break;
      }
      case 'stamp': {
        frame.text(W / 2, H * 0.18, Math.min(W, H) * 0.034, op.str, '#eafff2', op.a);
        const tw = op.str.length * Math.min(W, H) * 0.034 * 0.66;
        frame.line(W / 2 - tw / 2 - 18, H * 0.18 - 26, W / 2 + tw / 2 + 18, H * 0.18 - 26, '#46ff7a', op.a, 1);
        frame.line(W / 2 - tw / 2 - 18, H * 0.18 + 26, W / 2 + tw / 2 + 18, H * 0.18 + 26, '#46ff7a', op.a, 1);
        break;
      }
      case 'dot': {
        frame.rect(W / 2 - 1.5, H / 2 - 1.5, W / 2 + 1.5, H / 2 + 1.5, gameMode === 'code' ? '#bfffd6' : '#2a2a28', 1);
        break;
      }
    }
  }
  return frame;
}

module.exports = { Frame, paint };
