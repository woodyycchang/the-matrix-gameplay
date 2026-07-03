'use strict';
// construct/void.js — the white loading space. Flat plane, requests compile.

const W = 41, H = 7;

module.exports = {
  id: 'void',
  name: 'The Loading Space',
  aliases: ['void', 'construct', 'the construct', 'loading space', 'white room'],
  width: W,
  height: H,
  seed: 0x00C0DE,
  spawn: { x: 20, y: 3 },
  enterText: 'White in every direction, floor indistinguishable from sky. The loading space idles, ready to compile whatever is asked of it.',
  tileAt(x, y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return null;
    return { glyph: '·', walk: true };
  },
};
