/* THE CONSTRUCT — 01_glyph.js — code-vision glyph machinery (pure) */
(function (G) {
  'use strict';
  var C = G.C;

  // Half-width katakana + digits — the canonical "digital rain" register.
  var chars = '';
  for (var cc = 0xFF66; cc <= 0xFF9D; cc++) chars += String.fromCharCode(cc);
  chars += '0123456789:・"=*+<>';
  C.GLYPHS = chars;

  // Pick a glyph for an anchor: seed + time-bucket -> pseudo-random char.
  // If label given and the anchor is "close" (close=true), bias toward label chars
  // so objects become readable up close as the things they encode.
  C.glyphFor = function (seed, t, label, close, idx) {
    if (close && label && label.length) {
      // slow cycle through the label's own characters
      var li = (idx + (t * 1.5 | 0)) % label.length;
      return label[li].toUpperCase();
    }
    var bucket = (t * 9 | 0); // ~9 Hz flicker
    var h = (seed * 2654435761 + bucket * 40503) >>> 0;
    return C.GLYPHS[h % C.GLYPHS.length];
  };

  // Background rain: deterministic columns in screen space.
  // Returns ops appended to list: {t:'g', x,y,s,ch,c,a} far behind scene (depth handled by order).
  C.rainOps = function (out, w, h, t, intensity) {
    intensity = intensity == null ? 1 : intensity;
    var colW = 18, cols = Math.ceil(w / colW);
    for (var i = 0; i < cols; i++) {
      var r = C.rng(i * 7919 + 13)();
      var speed = 90 + r * 160;            // px/s
      var len = 9 + ((r * 17) | 0);        // trail glyphs
      var period = h + len * colW;
      var headY = ((t * speed + r * 4096) % period);
      for (var k = 0; k < len; k++) {
        var y = headY - k * 16;
        if (y < -20 || y > h + 20) continue;
        var fade = 1 - k / len;
        var seed = i * 131 + k * 17;
        var ch = C.glyphFor(seed, t * (0.6 + r), null, false, 0);
        var col = k === 0 ? '#cfffdf' : '#1d7a3f';
        out.push({ t: 'g', x: i * colW + 4, y: y, s: 13, ch: ch, c: col, a: (k === 0 ? 0.85 : 0.5 * fade) * intensity });
      }
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
