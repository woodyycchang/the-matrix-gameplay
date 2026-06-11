// test/logic.js — pure-logic tests, no GL required
const { makeGame, ok, eq, near, finish } = require('./harness');

const { OE, d } = makeGame({ gl: false });
const { G, CFG, FLAGS, util } = OE;

console.log('\n[clock + util]');
eq(util.fmtClock(0), '12:00 AM', 'midnight format');
eq(util.fmtClock(1164), '7:24 PM', 'start time 19:24 formats');
eq(util.fmtClock(720), '12:00 PM', 'noon format');
eq(util.fmtClock(754), '12:34 PM', 'pm minutes pad');
near(util.ss(460, 830, 460), 0, 1e-9, 'smoothstep low edge');
near(util.ss(460, 830, 830), 1, 1e-9, 'smoothstep high edge');
near(util.edgeFactorAt(0, 0), 0, 1e-9, 'edge factor at origin');
ok(util.edgeFactorAt(900, 0) > 0.99, 'edge factor ~1 near wall');

console.log('\n[terrain + rng determinism]');
eq(util.terrainH(123.4, -56.7), util.terrainH(123.4, -56.7), 'terrainH deterministic');
ok(Math.abs(util.terrainH(700, 30)) < 30, 'terrain height bounded in groves');
const r1 = util.mulberry32(19370611), r2 = util.mulberry32(19370611);
eq(r1(), r2(), 'seeded rng reproducible');

console.log('\n[boot state]');
eq(G.state, 'TITLE', 'boots to title');
eq(G.dayMin, CFG.START_MIN, 'clock starts at 19:24');
near(G.player.x, -4, 1e-6, 'player spawn x');
near(G.player.z, -3.4, 1e-6, 'player spawn z');
ok(G.colliders.boxes.length > 20, 'world colliders registered: ' + G.colliders.boxes.length);
ok(G.interactables.length >= 8, 'interactables registered: ' + G.interactables.length);
ok(G.barricades && G.barricades.length === 3, 'three barricades on east road');

console.log('\n[time flows only in PLAY]');
d.begin();
eq(G.state, 'PLAY', 'begin -> PLAY');
const t0 = G.gameMin;
d.stepFrames(60, 1 / 30);                     // 2 real seconds
near(G.gameMin - t0, 1, 0.02, '2s real = 1 game minute');
G.state = 'PAUSE';
const t1 = G.gameMin;
d.stepFrames(30, 1 / 30);
eq(G.gameMin, t1, 'clock frozen in pause');
G.state = 'PLAY';

console.log('\n[npc schedule determinism: Pell repeats daily]');
const pellN = OE.NPCS.list.find(n => n.id === 'pell');
ok(!!pellN, 'pell exists');
d.forceTime(CFG.START_MIN + 10); d.stepFrames(2, 1 / 30);
const pA = { x: pellN.p.grp.position.x, z: pellN.p.grp.position.z };
d.forceTime(CFG.START_MIN + 10 + 1440); d.stepFrames(2, 1 / 30);
const pB = { x: pellN.p.grp.position.x, z: pellN.p.grp.position.z };
near(pA.x, pB.x, 0.6, 'pell x repeats after 24h');
near(pA.z, pB.z, 0.6, 'pell z repeats after 24h');
d.forceTime(CFG.START_MIN);

console.log('\n[walking collision: no tunnelling into bar wall]');
d.setPlayerPos(-16, 7.0, 0);                  // forward = (sin yaw, cos yaw); yaw 0 walks +z toward facade at z=9.6
d.hold('w', true);
d.stepFrames(90, 1 / 30);                     // 3 s at 2.3 m/s would be ~7 m unobstructed
d.hold('w', false);
ok(G.player.z < 9.3, 'blocked by bar wall (z=' + G.player.z.toFixed(2) + ')');

console.log('\n[bar door + interior]');
d.setPlayerPos(-16, 8.2, 0);
const n1 = d.nearest();
ok(n1 === 'barDoor', 'nearest is bar door, got ' + n1);
d.interactNearest();
eq(d.player().inside, 'bar', 'entered bar');
eq(FLAGS.enteredBarOnce, true, 'enteredBarOnce set');
eq(d.objective(), 1, 'objective -> 1');

console.log('\n[gus dialogue: THE_USUAL]');
d.setPlayerPos(OE.INTERIOR.CX, OE.INTERIOR.CZ - 2.0, 0);
const n2 = d.nearest();
ok(n2 === 'gus', 'gus in range, got ' + n2);
d.interactNearest();
eq(G.state, 'DIALOG', 'dialog opened');
ok(d.dialog() && d.dialog().speaker === 'GUS', 'speaker is GUS');
let guard = 0;
while (G.state === 'DIALOG' && guard++ < 60) {
  const dlg = d.dialog();
  if (dlg && dlg.choices && dlg.choices.length) d.choose(0); else d.advance();
  d.stepFrames(2, 1 / 30);
}
eq(G.state, 'PLAY', 'dialog ended back to PLAY (guard=' + guard + ')');
eq(FLAGS.metGus, true, 'metGus set');
ok(d.seams().includes('THE_USUAL'), 'THE_USUAL noticed');
eq(d.objective(), 2, 'objective -> 2');

console.log('\n[SKIP: 64 s of bar music]');
for (let i = 0; i < 66 * 30; i++) OE.step(1 / 30);
ok(d.seams().includes('SKIP'), 'SKIP noticed after a minute inside');

console.log('\n[exit bar]');
d.setPlayerPos(OE.INTERIOR.CX, OE.INTERIOR.CZ + 4.4, 0);
const n3 = d.nearest();
ok(n3 === 'barExit', 'exit in range, got ' + n3);
d.interactNearest();
eq(d.player().inside, null, 'back on the street');
near(G.player.x, -16, 0.01, 'exit position x');

console.log('\n[EVERGREEN: paper twice]');
d.setPlayerPos(-33, 8.6, 0);
d.interactNearest();
eq(FLAGS.paperRead, true, 'paperRead after first read');
OE.UI.closePanel();
d.interactNearest();
OE.UI.closePanel();
ok(d.seams().includes('EVERGREEN'), 'EVERGREEN noticed on second read');

console.log('\n[car + barricade]');
d.setPlayerPos(10, -1.5, Math.PI / 2);
d.enterCarNow();
eq(d.player().inCar, true, 'in car');
d.setCarPos(280, 0, Math.PI / 2);
d.hold('w', true);
let frames = 0;
while (FLAGS.knockedBarricade < 1 && frames++ < 60 * 20) OE.step(1 / 30);
ok(FLAGS.knockedBarricade >= 1, 'barricade #1 broken (frames=' + frames + ')');
d.stepFrames(45, 1 / 30);                     // coast through
d.hold('w', false);
ok(G.car.x > 300, 'car passed x=300, at x=' + G.car.x.toFixed(1));

console.log('\n[gates + journal]');
ok(d.seams().length >= 3, 'have >=3 seams: ' + d.seams().join(','));
eq(d.objective(), 3, 'objective -> 3 (return to Gus)');
ok(G.journal.length >= 4, 'journal entries: ' + G.journal.length);

finish('logic');
