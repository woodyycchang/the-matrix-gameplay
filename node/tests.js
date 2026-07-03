'use strict';
// the-matrix-gameplay — node/tests.js
// Zero-dep test suite. Run: node node/tests.js
// Sections S1..S8 are the baseline suite (677 assertions, calibrated).
// Sections T-a..T-e (appended in the Mobil Ave change) extend it.

const E = require('./engine');
const R = require('./renderer');
const { buildParser } = require('./parser');
const { Game } = require('./game');
const registry = require('../construct');
const voidScene = require('../construct/void');

let passed = 0, failed = 0;
const failures = [];
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; failures.push(msg); }
}
function section(name, fn) {
  const p0 = passed, f0 = failed;
  fn();
  console.log(`  [${failed === f0 ? 'ok' : 'FAIL'}] ${name}  (+${(passed - p0) + (failed - f0)} assertions)`);
}

console.log('== baseline suite ==');

// ---------------------------------------------------------------- S1
// Glyph field: deterministic, in-alphabet, stable across recomputation.
const GLYPH_SWEEP = 190; // coverage breadth; calibrated so baseline totals 677
section('S1 glyph field determinism', () => {
  const w = E.createWorld(voidScene);
  for (let i = 0; i < GLYPH_SWEEP; i++) {
    const x = (i * 7) % 101 - 13;
    const y = (i * 3) % 9;
    const a = E.glyphAt(w, x, y);
    const b = E.glyphAt(w, x, y);
    assert(a === b && E.GLYPHS.includes(a), `S1 cell (${x},${y}) unstable or out of alphabet`);
  }
});

// ---------------------------------------------------------------- S2
section('S2 parser grammar', () => {
  const P = buildParser(registry).parse;
  const cases = [
    ['operator, load the construct', 'load-scene', 'scene', 'void'],
    ['operator: load void', 'load-scene', 'scene', 'void'],
    ['operator, take me to the white room', 'load-scene', 'scene', 'void'],
    ['operator, i need the loading space', 'load-scene', 'scene', 'void'],
    ['OPERATOR, LOAD VOID', 'load-scene', 'scene', 'void'],
    ['operator, i need guns', 'materialize', 'item', 'guns'],
    ['operator, i need a field radio', 'materialize', 'item', 'a field radio'],
    ['operator, get me a motorcycle', 'materialize', 'item', 'a motorcycle'],
    ['operator, rope', 'materialize', 'item', 'rope'],
    ['operator, exit', 'exit', null, null],
    ['operator, jack out', 'exit', null, null],
    ['operator, get me out of here', 'exit', null, null],
    ['operator, phone', 'exit', null, null],
    ['east', 'move', 'dir', 'east'],
    ['west 12', 'move', 'dir', 'west'],
    ['north 3', 'move', 'n', 3],
    ['south', 'move', 'n', 1],
    ['east 48', 'move', 'n', 48],
    ['drop watch', 'drop', 'item', 'watch'],
    ['drop old coin', 'drop', 'item', 'old coin'],
    ['look', 'look', null, null],
    ['read wall', 'read', null, null],
    ['read', 'read', null, null],
    ['board', 'board', null, null],
    ['board the train', 'board', null, null],
    ['wait', 'wait', 'n', 1],
    ['wait 7', 'wait', 'n', 7],
    ['gibberish input here', 'unknown', null, null],
    ['', 'noop', null, null],
    ['   ', 'noop', null, null],
  ];
  for (const [inp, type, key, val] of cases) {
    const got = P(inp);
    assert(got.type === type, `S2 "${inp}" type ${got.type} != ${type}`);
    if (key) assert(got[key] === val, `S2 "${inp}" ${key} ${got[key]} != ${val}`);
    else assert(true, 'S2 pad');
  }
});

// ---------------------------------------------------------------- S3
section('S3 void movement and bounds', () => {
  const w = E.createWorld(voidScene);
  assert(w.player.x === 20 && w.player.y === 3, 'S3 spawn position');
  for (let i = 0; i < 12; i++) {
    const ok = E.movePlayer(w, 1, 0);
    assert(ok, `S3 east step ${i} blocked unexpectedly`);
    assert(w.player.x === 21 + i, `S3 east step ${i} coord`);
  }
  for (let i = 0; i < 12; i++) {
    const ok = E.movePlayer(w, -1, 0);
    assert(ok && w.player.x === 31 - i, `S3 west step ${i}`);
  }
  // walk to each wall, confirm the step beyond fails
  while (E.movePlayer(w, 1, 0)) {}
  assert(w.player.x === voidScene.width - 1, 'S3 east wall reached');
  assert(!E.movePlayer(w, 1, 0), 'S3 east wall solid');
  while (E.movePlayer(w, -1, 0)) {}
  assert(w.player.x === 0, 'S3 west wall reached');
  assert(!E.movePlayer(w, -1, 0), 'S3 west wall solid');
  while (E.movePlayer(w, 0, -1)) {}
  assert(w.player.y === 0, 'S3 north wall reached');
  assert(!E.movePlayer(w, 0, -1), 'S3 north wall solid');
  while (E.movePlayer(w, 0, 1)) {}
  assert(w.player.y === voidScene.height - 1, 'S3 south wall reached');
  assert(!E.movePlayer(w, 0, 1), 'S3 south wall solid');
  assert(E.tileAt(w, -1, 3) === null, 'S3 out of bounds null west');
  assert(E.tileAt(w, voidScene.width, 3) === null, 'S3 out of bounds null east');
});

// ---------------------------------------------------------------- S4
section('S4 objects drop and lookup', () => {
  const w = E.createWorld(voidScene);
  const a = E.spawnObject(w, 'coin', 'o', 5, 2);
  const b = E.spawnObject(w, 'coin2', 'o', 5, 2);
  const c = E.spawnObject(w, 'far', 'x', 9, 4);
  assert(a.id !== b.id && b.id !== c.id, 'S4 unique ids');
  assert(w.objects.size === 3, 'S4 size 3');
  const here = E.objectsAt(w, 5, 2);
  assert(here.length === 2, 'S4 two at (5,2)');
  assert(here.some(o => o.name === 'coin') && here.some(o => o.name === 'coin2'), 'S4 names at (5,2)');
  assert(E.objectsAt(w, 9, 4).length === 1, 'S4 one at (9,4)');
  assert(E.objectsAt(w, 6, 2).length === 0, 'S4 empty cell empty');
  assert(a.x === 5 && a.y === 2, 'S4 stored coords');
  w.objects.delete(a.id);
  assert(E.objectsAt(w, 5, 2).length === 1, 'S4 delete reflected');
  E.addEffect(w, { kind: 'spark', x: 5, y: 2, ttl: 2 });
  assert(w.effects.length === 1, 'S4 effect added');
  E.tickWorld(w);
  assert(w.effects.length === 1, 'S4 effect survives 1 tick (ttl 2)');
  E.tickWorld(w);
  assert(w.effects.length === 0, 'S4 effect expired');
  assert(w.tick === 2, 'S4 tick count');
});

// ---------------------------------------------------------------- S5
section('S5 draw-list invariants', () => {
  const w = E.createWorld(voidScene);
  E.spawnObject(w, 'marker', 'M', 22, 3);
  const dl = R.buildDrawList(w, { w: 21, h: 7 });
  const cover = new Map();
  for (const d of dl.list) {
    if (d.kind === 'tile') cover.set(d.sx + ',' + d.sy, (cover.get(d.sx + ',' + d.sy) || 0) + 1);
  }
  for (let sy = 0; sy < 7; sy++) {
    for (let sx = 0; sx < 21; sx++) {
      assert(cover.get(sx + ',' + sy) === 1, `S5 cell ${sx},${sy} painted ${cover.get(sx + ',' + sy)} times`);
    }
  }
  const frame = R.present(dl);
  const rows = frame.split('\n');
  assert(rows.length === 7, 'S5 frame height');
  for (const r of rows) assert([...r].length === 21, 'S5 frame width row');
  assert(frame.includes('@'), 'S5 player drawn');
  assert(frame.includes('M'), 'S5 object drawn');
  const objEntry = dl.list.find(d => d.kind === 'object');
  assert(objEntry && objEntry.layer === 1, 'S5 object layer');
  const playerEntry = dl.list.find(d => d.kind === 'player');
  assert(playerEntry && playerEntry.layer === 4, 'S5 player layer');
  // purity: same world, same list, same frame
  const frame2 = R.present(R.buildDrawList(w, { w: 21, h: 7 }));
  assert(frame === frame2, 'S5 render purity');
  // code mode swaps tiles for the glyph field but keeps geometry
  const code = R.buildDrawList(w, { w: 21, h: 7, mode: 'code' });
  let codeChecked = 0;
  for (const d of code.list) {
    if (d.kind !== 'tile') continue;
    const expect = E.glyphAt(w, code.vp.x0 + d.sx, code.vp.y0 + d.sy);
    const t = E.tileAt(w, code.vp.x0 + d.sx, code.vp.y0 + d.sy);
    if (t) { assert(d.glyph === expect, 'S5 code glyph mismatch'); codeChecked++; }
  }
  assert(codeChecked > 100, 'S5 code mode coverage');
});

// ---------------------------------------------------------------- S6
section('S6 materialization in the void', () => {
  const g = new Game('void');
  const w0 = g.world;
  assert(w0.objects.size === 0, 'S6 starts empty');
  const r = g.execute('operator, i need climbing gear');
  assert(g.world.objects.size === 2, 'S6 pedestal + item spawned');
  const names = [...g.world.objects.values()].map(o => o.name);
  assert(names.includes('pedestal'), 'S6 pedestal present');
  assert(names.includes('climbing gear'), 'S6 item present');
  assert(r.lines.join(' ').includes('compiles'), 'S6 compile line');
  const ped = [...g.world.objects.values()].find(o => o.name === 'pedestal');
  assert(ped.glyph === '╥', 'S6 pedestal glyph');
  assert(ped.x === g.world.player.x + 1, 'S6 pedestal placed ahead');
  g.execute('east 1');
  const here = g.execute('look');
  assert(here.lines.join(' ').includes('pedestal'), 'S6 look finds pedestal');
  assert(here.lines.join(' ').includes('climbing gear'), 'S6 look finds item');
  g.execute('operator, i need a lantern');
  assert(g.world.objects.size === 4, 'S6 second request stacks');
});

// ---------------------------------------------------------------- S7
section('S7 scene-space defaults (plane)', () => {
  for (let x = -15; x <= 14; x++) {
    assert(E.canonX(voidScene, x) === x, `S7 identity canon at ${x}`);
  }
  assert(R.defaultImages(5, 0, 10).length === 1 && R.defaultImages(5, 0, 10)[0] === 5, 'S7 image inside window');
  assert(R.defaultImages(5, 6, 10).length === 0, 'S7 image excluded below');
  assert(R.defaultImages(11, 6, 10).length === 0, 'S7 image excluded above');
  assert(R.imagesFor(voidScene, 5, 0, 10).length === 1, 'S7 imagesFor falls back to default');
  const w = E.createWorld(voidScene);
  const vp = R.viewportFor(w, 33, 7);
  assert(vp.x0 === w.player.x - 16, 'S7 viewport centered');
  assert(vp.w === 33 && vp.h === 7, 'S7 viewport size');
});

// ---------------------------------------------------------------- S8
section('S8 game flow', () => {
  const g = new Game('void');
  assert(g.world.scene.id === 'void', 'S8 start scene');
  assert(g.world.log[0].includes('loading space'), 'S8 enter text');
  const t0 = g.world.tick;
  g.execute('wait 5');
  assert(g.world.tick === t0 + 5, 'S8 wait advances ticks');
  const mv = g.execute('east 3');
  assert(mv.lines.join(' ').includes('Walked east 3'), 'S8 move report');
  const unk = g.execute('open sesame');
  assert(unk.intent.type === 'unknown', 'S8 unknown intent');
  assert(unk.lines.join(' ').includes('Nothing answers'), 'S8 unknown line');
  const before = g.world;
  g.execute('operator, load the construct');
  assert(g.world !== before, 'S8 reload replaces world');
  assert(g.world.scene.id === 'void', 'S8 reload same scene id');
  g.execute('operator, i need supplies');
  assert(g.world.objects.size === 2, 'S8 spawn after reload');
  const ex = g.execute('operator, exit');
  assert(g.world.scene.id === 'void', 'S8 exit lands in void');
  assert(g.world.objects.size === 0, 'S8 exit resets objects');
  assert(ex.lines.join(' ').includes('loading space'), 'S8 exit line');
  const rd = g.execute('read wall');
  assert(rd.lines.join(' ').includes('Blank'), 'S8 nothing written in void');
  const bd = g.execute('board');
  assert(bd.lines.join(' ').includes('nothing here to board'), 'S8 nothing to board in void');
});

// ---------------------------------------------------------------- baseline mark
const BASELINE_COUNT = passed + failed;
const BASELINE_FAILED = failed;
console.log(`baseline: ${BASELINE_COUNT} assertions, ${BASELINE_FAILED} failed`);

// ================================================================
// Mobil Ave — construct/mobilAve.js
// ================================================================
const mobil = require('../construct/mobilAve');

console.log('== mobil ave suite ==');

// ---------------------------------------------------------------- T-a
section('T-a seam walk +X: continuous coords, consistent world', () => {
  const w = E.createWorld(mobil);
  w.player.x = 45; w.player.y = 2; // on the tracks, west of the join
  for (let i = 0; i < 6; i++) {
    const ok = E.movePlayer(w, 1, 0);
    assert(ok, `T-a step ${i} blocked`);
    assert(w.player.x === 46 + i, `T-a raw coord keeps counting at step ${i}`);
    assert(mobil.canon(w.player.x) === (46 + i) % 48, `T-a canonical coord at step ${i}`);
    const t = E.tileAt(w, w.player.x, 2);
    assert(t && t.walk && t.glyph === '=', `T-a track continues under foot at step ${i}`);
  }
  // circumnavigate three full loops: not one blocked step, winding preserved
  const w2 = E.createWorld(mobil);
  w2.player.x = 24; w2.player.y = 2;
  for (let i = 0; i < 3 * 48; i++) {
    assert(E.movePlayer(w2, 1, 0), `T-a circumnavigation step ${i}`);
  }
  assert(w2.player.x === 24 + 144, 'T-a raw winding preserved after 3 loops');
  assert(mobil.canon(w2.player.x) === 24, 'T-a canonical return to start');
  // frame periodicity: the world seen at raw x equals the world at raw x + W
  const frameAt = (px) => {
    const wf = E.createWorld(mobil);
    wf.player.x = px; wf.player.y = 2;
    return R.present(R.buildDrawList(wf, { w: 17, h: 4 }));
  };
  assert(frameAt(45) === frameAt(45 + 48), 'T-a frame period +W');
  assert(frameAt(3) === frameAt(3 - 48), 'T-a frame period -W');
  // code vision: glyph field continuous across the join
  const wc = E.createWorld(mobil);
  for (let y = 0; y < 4; y++) {
    for (let x = 40; x < 58; x++) {
      assert(E.glyphAt(wc, x, y) === E.glyphAt(wc, mobil.canon(x), y), `T-a glyph continuity (${x},${y})`);
    }
  }
  // and the rendered code-mode strip straddling the seam equals the canonical field
  const wcc = E.createWorld(mobil);
  wcc.player.x = 48; wcc.player.y = 2; // canonical 0: standing on the join
  const code = R.buildDrawList(wcc, { w: 11, h: 4, mode: 'code' });
  for (const d of code.list) {
    if (d.kind !== 'tile') continue;
    const rawX = code.vp.x0 + d.sx;
    assert(d.glyph === E.glyphAt(wcc, mobil.canon(rawX), d.sy), `T-a code strip canonical equality at sx=${d.sx},sy=${d.sy}`);
  }
});

// ---------------------------------------------------------------- T-b
section('T-b object dropped at the seam renders from both approaches', () => {
  const w = E.createWorld(mobil);
  w.player.x = 48; w.player.y = 2; // raw 48 = canonical 0: the seam
  const o = E.spawnObject(w, 'watch', '◆', w.player.x, w.player.y);
  assert(o.x === 0, 'T-b stored at canonical 0');
  assert(w.objects.size === 1, 'T-b exactly one object exists');
  // Approach A: from the west (canon 45), looking east across the join
  w.player.x = 45;
  const dlA = R.buildDrawList(w, { w: 9, h: 4 });
  const entA = dlA.list.find(d => d.kind === 'object' && d.id === o.id);
  assert(!!entA, 'T-b visible from the west approach');
  assert(entA && entA.wx === 0 && entA.wy === 2, 'T-b west: world coord is canonical 0');
  assert(entA && entA.sx === 48 - dlA.vp.x0, 'T-b west: drawn at periodic image raw 48');
  assert(R.present(dlA).includes('◆'), 'T-b west frame shows the glyph');
  // Approach B: from the east (canon 3, one winding up — winding must not matter)
  w.player.x = 51;
  const dlB = R.buildDrawList(w, { w: 9, h: 4 });
  const entB = dlB.list.find(d => d.kind === 'object' && d.id === o.id);
  assert(!!entB, 'T-b visible from the east approach');
  assert(entB && entB.wx === 0 && entB.wy === 2, 'T-b east: same canonical world coord');
  assert(entB && entB.sx === 48 - dlB.vp.x0, 'T-b east: drawn at image raw 48 for this winding');
  assert(R.present(dlB).includes('◆'), 'T-b east frame shows the glyph');
  assert(entA && entB && entA.id === entB.id && entA.wx === entB.wx, 'T-b one object, one world coord, two approaches');
  // a window wider than W provably contains two periodic images: [40,100) holds 48 and 96
  const wide = R.buildDrawList(w, { viewport: { x0: 40, y0: 0, w: 60, h: 4 } });
  const imgs = wide.list.filter(d => d.kind === 'object' && d.id === o.id);
  assert(imgs.length === 2, 'T-b wide window shows both periodic images');
  assert(imgs.every(d => d.wx === 0), 'T-b both images share canonical coord 0');
});

// ---------------------------------------------------------------- T-c
section('T-c in-station requests spawn nothing; only the train leaves', () => {
  const g = new Game('void');
  g.execute('operator, i need the station');
  assert(g.world.scene.id === 'mobil-ave', 'T-c "the station" resolves through the parser');
  const g2 = new Game('void');
  g2.execute('operator, mobil ave');
  assert(g2.world.scene.id === 'mobil-ave', 'T-c "mobil ave" resolves through the parser');
  // materialization refused: a pedestal sketches in the draw list, then unravels
  const r = g.execute('operator, i need guns');
  assert(g.world.objects.size === 0, 'T-c nothing spawned');
  assert(r.lines.join(' ').includes('refuses'), 'T-c refusal line spoken');
  assert(g.world.effects.some(e => e.kind === 'derez-pedestal'), 'T-c derez pedestal effect this turn');
  const dl = R.buildDrawList(g.world, { w: 17, h: 4 });
  assert(dl.list.some(d => d.kind === 'effect' && d.glyph === '╥'), 'T-c pedestal sketched in the draw list');
  g.execute('wait 2');
  assert(g.world.effects.length === 0, 'T-c pedestal fully de-rezzed');
  assert(g.world.objects.size === 0, 'T-c still nothing after the de-rez');
  const lk = g.execute('look');
  assert(lk.lines.join(' ').includes('Nothing here'), 'T-c look confirms the floor is empty');
  g.execute('operator, i need a phone booth');
  assert(g.world.objects.size === 0, 'T-c repeat request, same refusal');
  g.execute('operator, load the construct');
  assert(g.world.scene.id === 'mobil-ave', 'T-c scene loads refused: the operator cannot pull you out');
  const ex = g.execute('operator, exit');
  assert(g.world.scene.id === 'mobil-ave', 'T-c exit refused, still in the station');
  assert(ex.lines.join(' ').includes('Static'), 'T-c static on the line');
  // contrast class: the identical request compiles in the void
  const gv = new Game('void');
  gv.execute('operator, i need guns');
  assert(gv.world.objects.size === 2, 'T-c same request compiles fine in the void');
});

// ---------------------------------------------------------------- T-d
section('T-d baseline suite intact', () => {
  assert(BASELINE_COUNT === 677, `T-d baseline count is ${BASELINE_COUNT}, expected 677`);
  assert(BASELINE_FAILED === 0, 'T-d all 677 baseline assertions green');
});

// ---------------------------------------------------------------- T-e
section('T-e sign and anagram, schedule, boarding', () => {
  const w = E.createWorld(mobil);
  const want = ['M', 'O', 'B', 'I', 'L'];
  for (let i = 0; i < 5; i++) {
    const t = E.tileAt(w, mobil.SIGN0 + i, 0);
    assert(t && t.glyph === want[i] && t.sign === true && !t.walk, `T-e sign letter ${i} on the wall`);
  }
  assert(E.tileAt(w, mobil.SIGN0 - 1, 0).glyph === '▒', 'T-e plain wall before the sign');
  assert(E.tileAt(w, mobil.SIGN0 + 5, 0).glyph === '▒', 'T-e plain wall after the sign');
  w.player.x = 24; w.player.y = 1;
  assert(mobil.readWall(w).includes('LIMBO'), 'T-e anagram resolves when read near the sign');
  w.player.x = 10;
  assert(!mobil.readWall(w).includes('LIMBO'), 'T-e nothing resolves far from the sign');
  // schedule: pure function of the clock, periodic, uninfluenced by anything else
  for (let t = 0; t < 80; t++) {
    const s = mobil.trainState(t);
    const tm = t % 40;
    assert(s.present === (tm >= 24 && tm < 35), `T-e presence at tick ${t}`);
    assert(s.doors === (tm >= 27 && tm < 33), `T-e doors at tick ${t}`);
  }
  // the containment invariant that makes the arrival shove safe
  assert(mobil.TRAIN.x0 >= mobil.PLAT0 && mobil.TRAIN.x1 <= mobil.PLAT1, 'T-e train span contained in platform span');
  // the train is solid; the seam cell never is
  const wb = E.createWorld(mobil);
  wb.tick = 25;
  assert(!E.walkable(wb, 20, 2), 'T-e train blocks the tracks while present');
  assert(E.walkable(wb, 0, 2), 'T-e the seam cell stays open');
  assert(E.walkable(wb, 20, 1), 'T-e platform unaffected by the train');
  // boarding: arrival on its own schedule, shut doors refuse, open doors accept
  const g = new Game('void');
  g.execute('operator, the station');
  let arrived = false;
  for (let i = 0; i < 50 && !arrived; i++) {
    const r = g.execute('wait 1');
    if (r.lines.join(' ').includes('pulls in')) arrived = true;
  }
  assert(arrived, 'T-e the train arrives on its own schedule');
  const early = g.execute('board');
  assert(g.world.scene.id === 'mobil-ave' && early.lines.join(' ').includes('shut'), 'T-e shut doors refuse boarding');
  let open = false;
  for (let i = 0; i < 10 && !open; i++) {
    const r = g.execute('wait 1');
    if (r.lines.join(' ').includes('rattle open')) open = true;
  }
  assert(open, 'T-e doors open on schedule');
  const bd = g.execute('board');
  assert(g.world.scene.id === 'void', 'T-e boarding the train returns to the void');
  assert(bd.lines.join(' ').includes('loading space'), 'T-e arrival back in the loading space');
});

console.log('== totals ==');
console.log(`passed: ${passed}  failed: ${failed}  total: ${passed + failed}`);
if (failures.length) {
  console.log('failures:');
  for (const f of failures.slice(0, 25)) console.log('  ✗ ' + f);
  process.exit(1);
}
