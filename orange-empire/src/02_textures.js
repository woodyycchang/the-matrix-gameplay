// ============ 02 textures ============
const T = (() => {
  const cache = {};
  function canvasFor(w, h) {
    if (ENV.headless) return ENV.makeCanvas(w, h);
    const c = DOC.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function isPOT(n) { return (n & (n - 1)) === 0; }
  function toTexture(cv) {
    const pot = isPOT(cv.width) && isPOT(cv.height);
    if (ENV.headless) {
      const g = cv.getContext('2d'); const id = g.getImageData(0, 0, cv.width, cv.height);
      const data = new Uint8Array(id.data.length);
      const W = cv.width, H = cv.height;
      for (let y = 0; y < H; y++) data.set(id.data.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
      t.needsUpdate = true; t.flipY = false;
      t.magFilter = THREE.LinearFilter;
      t.minFilter = pot ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
      t.generateMipmaps = pot;
      return t;
    }
    const t = new THREE.CanvasTexture(cv);
    t.minFilter = pot ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.generateMipmaps = pot;
    return t;
  }
  function make(key, w, h, fn, wrap) {
    if (cache[key]) return cache[key];
    const cv = canvasFor(w, h); fn(cv.getContext('2d'), w, h);
    const t = toTexture(cv);
    if (wrap !== false) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    cache[key] = t; return t;
  }
  function speckle(g, w, h, n, colors, smin, smax, rnd) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[(rnd() * colors.length) | 0];
      const s = smin + rnd() * (smax - smin);
      g.fillRect(rnd() * w, rnd() * h, s, s);
    }
  }
  // ---- ground / paving ----
  const asphalt = () => make('asphalt', 256, 256, (g, w, h) => {
    const r = mulberry32(11); g.fillStyle = '#33312f'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 2400, ['#3a3835', '#2c2a28', '#3f3c38', '#282624'], 1, 3, r);
    g.strokeStyle = 'rgba(20,18,16,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < 7; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - .5) * 60; y += (r() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
  });
  const sidewalk = () => make('sidewalk', 256, 256, (g, w, h) => {
    const r = mulberry32(22); g.fillStyle = '#8d8576'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 1800, ['#968e7e', '#857d6e', '#9c9484', '#7d7567'], 1, 2.5, r);
    g.strokeStyle = 'rgba(70,64,55,0.7)'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); }
  });
  const grass = () => make('grass', 256, 256, (g, w, h) => {
    const r = mulberry32(33); g.fillStyle = '#5d6e38'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 3200, ['#67793f', '#536331', '#71823f', '#4c5c2e', '#7a8847'], 1, 3, r);
    speckle(g, w, h, 250, ['#8a7a4a', '#6e6038'], 1, 2, r);
  });
  const groveSoil = () => make('groveSoil', 256, 256, (g, w, h) => {
    const r = mulberry32(44); g.fillStyle = '#6b5a3c'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 2600, ['#75male', '#5d4c30', '#7a6845', '#645236', '#71603f'].map(c => c === '#75male' ? '#756343' : c), 1, 3, r);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(70,90,45,0.35)'; g.fillRect(0, i * 64 + 18, w, 22); }
    g.fillStyle = 'rgba(40,32,20,0.3)'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 64, w, 5);
  });
  // ---- building materials ----
  const brick = () => make('brick', 256, 256, (g, w, h) => {
    const r = mulberry32(55); g.fillStyle = '#7a4434'; g.fillRect(0, 0, w, h);
    const bh = 16, bw = 42;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w; x += bw) {
        const t = ['#82493a', '#6e3c2d', '#8a5040', '#75412f'][(r() * 4) | 0];
        g.fillStyle = t; g.fillRect(x + off + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
    g.fillStyle = 'rgba(214,200,180,0.28)'; for (let y = 0; y < h; y += bh) g.fillRect(0, y, w, 1.6);
  });
  const stucco = (key, base, fleck) => make(key, 128, 128, (g, w, h) => {
    const r = mulberry32(66 + key.length); g.fillStyle = base; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 900, fleck, 1, 2, r);
  });
  const wood = () => make('wood', 256, 256, (g, w, h) => {
    const r = mulberry32(77); g.fillStyle = '#7d6b50'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 18) {
      g.fillStyle = ['#84725a', '#76654a', '#8a7860'][(r() * 3) | 0]; g.fillRect(0, y, w, 16);
      g.fillStyle = 'rgba(40,32,22,0.5)'; g.fillRect(0, y + 16, w, 2);
    }
  });
  const roof = () => make('roof', 128, 128, (g, w, h) => {
    const r = mulberry32(88); g.fillStyle = '#4a4642'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 700, ['#534f4a', '#403c38', '#5a5650'], 1, 3, r);
  });
  // ---- facades: wall + windows + parapet, day & night variants ----
  function facade(key, opts) {
    const o = Object.assign({ w: 512, h: 512, base: '#b8a888', trim: '#6e5a40', floors: 2, cols: 4, brickMode: false, awning: null, lit: false, litChance: 0.75, ww: 0.46, wh: 0.5 }, opts);
    return make(key + (o.lit ? '_N' : '_D'), o.w, o.h, (g, w, h) => {
      const r = mulberry32(99 + key.length * 7);
      if (o.brickMode) {
        g.fillStyle = '#7a4434'; g.fillRect(0, 0, w, h);
        const bh = h / 30, bw = w / 9;
        for (let y = 0; y < h; y += bh) { const off = ((y / bh) | 0) % 2 ? bw / 2 : 0; for (let x = -bw; x < w; x += bw) { g.fillStyle = ['#82493a', '#6e3c2d', '#8a5040'][(r() * 3) | 0]; g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2); } }
      } else {
        g.fillStyle = o.base; g.fillRect(0, 0, w, h);
        speckle(g, w, h, 1500, [o.base, shade(o.base, -12), shade(o.base, 10)], 1, 3, r);
      }
      // parapet & base band
      g.fillStyle = o.trim; g.fillRect(0, 0, w, h * 0.045); g.fillRect(0, h * 0.93, w, h * 0.07);
      const rows = o.floors, cols = o.cols;
      const cw = w / cols, ch = (h * 0.86) / rows;
      for (let fy = 0; fy < rows; fy++) for (let fx = 0; fx < cols; fx++) {
        const cx = fx * cw + cw / 2, cy = h * 0.06 + fy * ch + ch / 2;
        const winw = cw * o.ww, winh = ch * o.wh;
        g.fillStyle = o.trim; g.fillRect(cx - winw / 2 - 4, cy - winh / 2 - 4, winw + 8, winh + 8);
        const isLit = o.lit && r() < o.litChance;
        if (isLit) {
          const gr = g.createLinearGradient(0, cy - winh / 2, 0, cy + winh / 2);
          gr.addColorStop(0, '#ffd98a'); gr.addColorStop(1, '#c98c3a'); g.fillStyle = gr;
        } else { g.fillStyle = o.lit ? '#10131c' : '#2c3744'; }
        g.fillRect(cx - winw / 2, cy - winh / 2, winw, winh);
        g.strokeStyle = o.lit && isLit ? 'rgba(120,80,30,0.8)' : 'rgba(180,190,205,0.35)';
        g.lineWidth = 2; g.beginPath();
        g.moveTo(cx, cy - winh / 2); g.lineTo(cx, cy + winh / 2);
        g.moveTo(cx - winw / 2, cy); g.lineTo(cx + winw / 2, cy); g.stroke();
        if (!o.lit && !isLit) { g.fillStyle = 'rgba(255,235,200,0.16)'; g.beginPath(); g.moveTo(cx - winw / 2, cy + winh / 2); g.lineTo(cx - winw / 6, cy - winh / 2); g.lineTo(cx + winw / 8, cy - winh / 2); g.lineTo(cx - winw / 4, cy + winh / 2); g.fill(); }
      }
      if (o.awning) { g.fillStyle = o.awning; for (let fx = 0; fx < cols; fx++) g.fillRect(fx * cw + cw * 0.08, h * 0.60, cw * 0.84, h * 0.05); }
    }, true);
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = ((n >> 16) & 255) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
  // ---- text signs ----
  function sign(key, text, opts) {
    const o = Object.assign({ w: 512, h: 128, bg: '#1c1a17', fg: '#e8dcc2', font: 'bold 64px Georgia, "Times New Roman", serif', border: '#8a7a58', sub: null, glow: null }, opts);
    return make('sign_' + key, o.w, o.h, (g, w, h) => {
      g.fillStyle = o.bg; g.fillRect(0, 0, w, h);
      if (o.border) { g.strokeStyle = o.border; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 26; }
      g.fillStyle = o.fg; g.font = o.font;
      // shrink to fit: long names like THE BLUE PACIFIC must not clip
      const maxW = w - 44;
      let fs = parseInt(o.font.match(/(\d+)px/)[1], 10);
      while (g.measureText(text).width > maxW && fs > 14) { fs -= 2; g.font = o.font.replace(/\d+px/, fs + 'px'); }
      g.fillText(text, w / 2, o.sub ? h * 0.38 : h / 2);
      if (o.sub) { g.shadowBlur = o.glow ? 14 : 0; g.font = o.font.replace(/\d+px/, (m) => (parseInt(m) * 0.42 | 0) + 'px'); g.fillText(o.sub, w / 2, h * 0.74); }
      g.shadowBlur = 0;
    }, false);
  }
  // ---- canopy ----
  const canopy = () => make('canopy', 128, 128, (g, w, h) => {
    const r = mulberry32(111); g.fillStyle = '#39511f'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 1100, ['#42602a', '#314a1b', '#4c6c30', '#2a4015'], 2, 5, r);
    for (let i = 0; i < 26; i++) { g.fillStyle = '#e08a1e'; g.beginPath(); g.arc(r() * w, r() * h, 3.2 + r() * 2.4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,210,120,0.65)'; g.beginPath(); g.arc(0, 0, 0, 0, 0); g.fill(); }
  });
  // ---- sprites ----
  const glow = (key, color, inner) => make('glow_' + key, 128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, inner || color); gr.addColorStop(0.35, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, false);
  const disc = () => make('disc', 32, 32, (g, w, h) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 13, 0, TAU); g.fill(); }, false);
  function bubble(key, lines) {
    return make('bub_' + key, 512, 160, (g, w, h) => {
      g.fillStyle = 'rgba(20,18,16,0.88)'; roundRect(g, 8, 8, w - 16, h - 40, 16); g.fill();
      g.beginPath(); g.moveTo(w / 2 - 14, h - 32); g.lineTo(w / 2 + 14, h - 32); g.lineTo(w / 2, h - 6); g.fill();
      g.fillStyle = '#efe6cf'; g.font = 'italic 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      lines.forEach((ln, i) => g.fillText(ln, w / 2, 40 + i * 38));
    }, false);
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const newspaper = () => make('paper', 256, 320, (g, w, h) => {
    g.fillStyle = '#ddd2b4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#211d18'; g.textAlign = 'center'; g.font = 'bold 30px Georgia, serif';
    g.fillText('THE EXAMINER', w / 2, 34);
    g.font = '13px Georgia, serif'; g.fillText('FRIDAY, JUNE 11, 1937  ·  FIVE CENTS', w / 2, 56);
    g.fillRect(10, 64, w - 20, 2);
    g.font = 'bold 21px Georgia, serif'; g.fillText('HEAT TO BREAK BY', w / 2, 92); g.fillText('SUNDAY, BUREAU SAYS', w / 2, 116);
    g.textAlign = 'left'; g.fillStyle = '#3a352c';
    for (let i = 0; i < 10; i++) { g.fillRect(14, 134 + i * 11, (i % 3 === 2 ? 0.6 : 0.95) * (w - 28), 5); }
    g.fillStyle = '#211d18'; g.font = 'bold 13px Georgia, serif';
    g.fillText('COUNTY EXTENDS EAST GROVE', 14, 262); g.fillText('ROAD CLOSURE "INDEFINITELY"', 14, 280);
    g.fillStyle = '#3a352c'; for (let i = 0; i < 3; i++) g.fillRect(14, 290 + i * 10, w - 28, 4);
  }, false);
  return { make, facade, sign, asphalt, sidewalk, grass, groveSoil, brick, stucco, wood, roof, canopy, glow, disc, bubble, newspaper, shade };
})();
