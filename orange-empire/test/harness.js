// test/harness.js — shared headless setup for logic tests, playthrough bot, and screenshots
const path = require('path');
const fs = require('fs');
const THREE = require('three');
const { createCanvas } = require('canvas');
const { PNG } = require('pngjs');

const factory = require(path.join(__dirname, '..', 'dist', 'bundle.js'));

function makeGame(opts) {
  opts = opts || {};
  const W = opts.width || 960, H = opts.height || 540;
  let renderer = null, gl = null, fake = null;

  if (opts.gl) {
    gl = require('gl')(W, H, { preserveDrawingBuffer: true, antialias: true });
    fake = {
      width: W, height: H, clientWidth: W, clientHeight: H, style: {},
      addEventListener() {}, removeEventListener() {},
      getContext: () => gl,
    };
    gl.canvas = fake;
    renderer = new THREE.WebGLRenderer({ canvas: fake, context: gl, antialias: true });
    renderer.setSize(W, H);
  }

  const OE = factory(THREE, /*DOC*/ null, /*WIN*/ null, {
    headless: true,
    makeCanvas: (w, h) => createCanvas(w, h),
  });
  OE.boot({ renderer, width: W, height: H });

  function snap(file) {
    if (!renderer) throw new Error('snap() needs gl mode');
    renderer.render(OE.G.scene, OE.G.camera);
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const png = new PNG({ width: W, height: H });
    for (let y = 0; y < H; y++) {           // flip vertically
      const src = (H - 1 - y) * W * 4, dst = y * W * 4;
      png.data.set(px.subarray(src, src + W * 4), dst);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(png));
    return file;
  }

  return { OE, renderer, gl, W, H, snap, d: OE.debug };
}

// tiny assert helpers
let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  ok  ' + msg); }
  else { failed++; console.log('  FAIL ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + ' (got ' + JSON.stringify(a) + ')'); }
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, msg + ' (got ' + a + ', want ' + b + '±' + tol + ')'); }
function finish(name) {
  console.log('\n' + name + ': ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

module.exports = { makeGame, ok, eq, near, finish, THREE };
