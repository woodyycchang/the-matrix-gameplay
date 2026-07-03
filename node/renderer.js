'use strict';
// the-matrix-gameplay — node/renderer.js
// Rule: draw-list renderer ONLY. buildDrawList emits ops; present() consumes
// nothing but the list. No side channels.

const E = require('./engine');

function defaultImages(cx, x0, x1) { return (cx >= x0 && cx < x1) ? [cx] : []; }

function imagesFor(scene, cx, x0, x1) {
  return scene.images ? scene.images(cx, x0, x1) : defaultImages(cx, x0, x1);
}

function viewportFor(world, w, h) {
  const vw = w || 33;
  const vh = h || world.scene.height;
  return { x0: world.player.x - ((vw - 1) >> 1), y0: 0, w: vw, h: vh };
}

// opts: { viewport?, w?, h?, mode: 'scene' | 'code' }
function buildDrawList(world, opts) {
  const o = opts || {};
  const vp = o.viewport || viewportFor(world, o.w, o.h);
  const mode = o.mode || 'scene';
  const list = [];

  for (let sy = 0; sy < vp.h; sy++) {
    for (let sx = 0; sx < vp.w; sx++) {
      const wx = vp.x0 + sx, wy = vp.y0 + sy;
      const t = E.tileAt(world, wx, wy);
      const glyph = t ? (mode === 'code' ? E.glyphAt(world, wx, wy) : t.glyph) : ' ';
      list.push({ layer: 0, kind: 'tile', sx, sy, wx: E.canonX(world.scene, wx), wy, glyph });
    }
  }

  for (const obj of world.objects.values()) {
    for (const wx of imagesFor(world.scene, obj.x, vp.x0, vp.x0 + vp.w)) {
      const sy = obj.y - vp.y0;
      if (sy < 0 || sy >= vp.h) continue;
      list.push({ layer: 1, kind: 'object', id: obj.id, name: obj.name, sx: wx - vp.x0, sy, wx: obj.x, wy: obj.y, glyph: obj.glyph });
    }
  }

  for (const ef of world.effects) {
    for (const wx of imagesFor(world.scene, ef.x, vp.x0, vp.x0 + vp.w)) {
      const sy = ef.y - vp.y0;
      if (sy < 0 || sy >= vp.h) continue;
      list.push({ layer: 2, kind: 'effect', sx: wx - vp.x0, sy, wx: ef.x, wy: ef.y, glyph: ef.glyph || '▒', effect: ef.kind });
    }
  }

  if (world.scene.extraDraw) world.scene.extraDraw(world, vp, list, imagesFor);

  const psx = world.player.x - vp.x0, psy = world.player.y - vp.y0;
  if (psx >= 0 && psx < vp.w && psy >= 0 && psy < vp.h) {
    list.push({ layer: 4, kind: 'player', sx: psx, sy: psy, wx: E.canonX(world.scene, world.player.x), wy: world.player.y, glyph: '@' });
  }

  return { list, vp, mode };
}

// present() reads ONLY the draw list.
function present(dl) {
  const { list, vp } = dl;
  const grid = Array.from({ length: vp.h }, () => Array(vp.w).fill(' '));
  const sorted = list.slice().sort((a, b) => a.layer - b.layer);
  for (const d of sorted) {
    if (d.sx >= 0 && d.sx < vp.w && d.sy >= 0 && d.sy < vp.h) grid[d.sy][d.sx] = d.glyph;
  }
  return grid.map(r => r.join('')).join('\n');
}

module.exports = { buildDrawList, present, viewportFor, imagesFor, defaultImages };
