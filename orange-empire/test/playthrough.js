// test/playthrough.js — drives the whole game through the debug API like a player would
const { makeGame, ok, eq, near, finish } = require('./harness');

const { OE, d } = makeGame({ gl: false });
const { G, CFG, FLAGS } = OE;

function stepSec(s, fps) { d.stepFrames(Math.ceil(s * (fps || 30)), 1 / (fps || 30)); }
function runDialog(label) {
  let guard = 0;
  while (G.state === 'DIALOG' && guard++ < 80) {
    const dlg = d.dialog();
    if (dlg && dlg.choices && dlg.choices.length) d.choose(0); else d.advance();
    d.stepFrames(2, 1 / 30);
  }
  ok(G.state !== 'DIALOG', label + ' dialog completed (guard=' + guard + ')');
}

console.log('\n[act 1: find a drink]');
d.begin();
eq(G.state, 'PLAY', 'game started');
d.setPlayerPos(-16, 8.2, 0);
eq(d.nearest(), 'barDoor', 'at the bar door');
d.interactNearest();
eq(d.player().inside, 'bar', 'inside the Blue Pacific');
d.setPlayerPos(OE.INTERIOR.CX, OE.INTERIOR.CZ - 2.0, 0);
d.interactNearest();
runDialog('gus stage1');
ok(d.seams().includes('THE_USUAL'), 'seam 1: THE_USUAL');

console.log('\n[act 1b: the skip]');
stepSec(66);
ok(d.seams().includes('SKIP'), 'seam 2: SKIP');
d.setPlayerPos(OE.INTERIOR.CX, OE.INTERIOR.CZ + 4.4, 0);
d.interactNearest();
eq(d.player().inside, null, 'back outside');

console.log('\n[act 1c: clockwork — witness Mrs. Pell twice]');
// Pell drops the oranges at :14–:18 each hour near (-56, 8.3). Stand close, twice, an hour apart.
d.setPlayerPos(-52, 6.0, -Math.PI / 2);
const startW = FLAGS.pellWitness;
const h0 = Math.floor(G.dayMin / 60);
d.forceTime(h0 * 60 + 13);                 // just before the drop
stepSec(8 / CFG.MIN_PER_SEC);              // 8 game-minutes => through :14–:18 window (16 real s)
ok(FLAGS.pellWitness >= startW + 1, 'witnessed drop #1 (count=' + FLAGS.pellWitness + ')');
d.forceTime((h0 + 1) * 60 + 13);
stepSec(8 / CFG.MIN_PER_SEC);
ok(FLAGS.pellWitness >= startW + 2, 'witnessed drop #2 (count=' + FLAGS.pellWitness + ')');
ok(d.seams().includes('CLOCKWORK'), 'seam 3: CLOCKWORK');
eq(d.objective(), 3, 'objective -> 3 (something to ask Gus)');

console.log('\n[act 2: the matchbook]');
d.setPlayerPos(-16, 8.2, 0);
d.interactNearest();                        // re-enter bar
d.setPlayerPos(OE.INTERIOR.CX, OE.INTERIOR.CZ - 2.0, 0);
d.interactNearest();
runDialog('gus stage2');
eq(FLAGS.hasMatchbook, true, 'matchbook received');
ok(FLAGS.gusStage >= 2, 'gus stage advanced: ' + FLAGS.gusStage);
eq(d.objective(), 4, 'objective -> 4 (the address on the matchbook)');
d.setPlayerPos(OE.INTERIOR.CX, OE.INTERIOR.CZ + 4.4, 0);
d.interactNearest();

console.log('\n[act 3: drive east]');
d.setPlayerPos(10, -1.5, Math.PI / 2);
d.interactNearest();                        // car pseudo-interactable
eq(d.player().inCar, true, 'behind the wheel');
d.setCarPos(180, 0, Math.PI / 2);
d.hold('w', true);
let f = 0;
while (FLAGS.knockedBarricade < 1 && f++ < 60 * 40) OE.step(1 / 30);
ok(FLAGS.knockedBarricade >= 1, 'through ROAD CLOSED (x=' + G.car.x.toFixed(0) + ')');
// park near the shack turnoff
while (G.car.x < 330 && f++ < 60 * 60) OE.step(1 / 30);
d.hold('w', false);
stepSec(2);
d.exitCarNow();
eq(d.player().inCar, false, 'parked by the turnoff');

console.log('\n[act 3b: the shack]');
d.setPlayerPos(335, 24.2, 0);
eq(d.nearest(), 'shackDoor', 'at the shack door');
d.interactNearest();
eq(FLAGS.visitedShack, true, 'shack opened');
stepSec(1.2);                               // door swing anim
d.setPlayerPos(333.45, 26.6, 0);
const nb = d.nearest();
eq(nb, 'floorboard', 'loose floorboard revealed, got ' + nb);
d.interactNearest();
eq(G.state, 'NOTE', 'reading the note');
ok(OE.UI.rec.note && OE.UI.rec.note.indexOf('nine sixty-five') >= 0, 'note mentions nine sixty-five');
eq(FLAGS.noteRead, true, 'noteRead set');
OE.UI.closePanel();
eq(G.state, 'PLAY', 'note closed');
eq(d.objective(), 5, 'objective -> 5 (drive past the last sign)');

console.log('\n[act 4: the boundary]');
d.setPlayerPos(332, 2, Math.PI / 2);
d.interactNearest();                        // back in car? player teleported near car path; use enterCarNow for robustness
if (!d.player().inCar) { d.setCarPos(332, 0, Math.PI / 2); d.enterCarNow(); }
eq(d.player().inCar, true, 'driving again');
d.hold('w', true);
f = 0;
while (G.state === 'PLAY' && f++ < 60 * 120) OE.step(1 / 30);
d.hold('w', false);
eq(G.state, 'ENDING', 'ending began at the boundary');
eq(FLAGS.boundaryReached, true, 'boundaryReached set');
ok(FLAGS.knockedBarricade >= 3, 'all three barricades broken: ' + FLAGS.knockedBarricade);
ok(OE.UI.rec.letterbox, 'letterbox on');

console.log('\n[act 4b: the terminal]');
let lastLine = '', linesSeen = 0, prevLine = '';
for (let i = 0; i < 46 * 30 && G.state !== 'TERMINAL'; i++) {
  OE.step(1 / 30);
  const ln = OE.UI.rec.endingLine;
  if (ln && ln !== prevLine) { linesSeen++; lastLine = ln; }
  prevLine = ln;
}
eq(G.state, 'TERMINAL', 'terminal reached');
ok(OE.UI.rec.terminal && OE.UI.rec.terminal.text.indexOf('MERIDIAN CIVIC SYSTEMS') >= 0, 'terminal header present');
ok(OE.UI.rec.terminal.options.length === 2, 'two options offered');
ok(linesSeen >= 7, 'monologue lines shown: ' + linesSeen);
ok(/Whitmore counted it too/.test(lastLine), 'final line landed: "' + lastLine + '"');

console.log('\n[act 5: return to loop]');
d.terminal('loop');
stepSec(1);
eq(G.state, 'PLAY', 'back in play');
eq(FLAGS.returned, true, 'returned flag set');
near(G.dayMin, CFG.START_MIN, 0.6, 'clock reset to 7:24 PM');
near(d.player().x, -4, 0.2, 'player back at spawn x');
near(d.player().z, -3.4, 0.2, 'player back at spawn z');
eq(d.player().inCar, false, 'on foot again');
const car = d.car();
near(car.x, 10, 0.2, 'car back at the curb');
ok(!OE.UI.rec.letterbox, 'letterbox off');

console.log('\n[act 5b: gus knows]');
d.setPlayerPos(-16, 8.2, 0);
d.interactNearest();
d.setPlayerPos(OE.INTERIOR.CX, OE.INTERIOR.CZ - 2.0, 0);
d.interactNearest();
runDialog('gus epilogue');
eq(FLAGS.epilogueDone, true, 'epilogue heard');
eq(d.objective(), 7, 'objective -> 7 (free roam)');

console.log('\n[journal coverage]');
const titles = d.journalList().join(' | ');
ok(G.journal.length >= 6, 'journal rich: ' + G.journal.length + ' entries');
ok(d.seams().length >= 3, 'seams logged: ' + d.seams().join(','));
console.log('  journal: ' + titles);

console.log('\n[fresh instance: END SESSION -> credits]');
const g2 = makeGame({ gl: false });
g2.d.begin();
g2.d.setPlayerPos(10, -1.5, Math.PI / 2);
g2.d.enterCarNow();
g2.d.setCarPos(940, 0, Math.PI / 2);
g2.d.hold('w', true);
let f2 = 0;
while (g2.OE.G.state === 'PLAY' && f2++ < 60 * 30) g2.OE.step(1 / 30);
g2.d.hold('w', false);
eq(g2.OE.G.state, 'ENDING', 'second run reaches ending');
for (let i = 0; i < 42 * 30 && g2.OE.G.state !== 'TERMINAL'; i++) g2.OE.step(1 / 30);
eq(g2.OE.G.state, 'TERMINAL', 'second run reaches terminal');
g2.d.terminal('end');
g2.d.stepFrames(30, 1 / 30);
eq(g2.OE.G.state, 'CREDITS', 'credits roll');
ok(g2.OE.UI.rec.credits, 'credits recorded');

console.log('\n[sequence break: drive east immediately on a fresh run]');
const g3 = makeGame({ gl: false });
g3.d.begin();
g3.d.setPlayerPos(10, -1.5, Math.PI / 2);
g3.d.enterCarNow();
g3.d.setCarPos(600, 0, Math.PI / 2);
g3.d.hold('w', true);
let f3 = 0;
while (g3.OE.G.state === 'PLAY' && f3++ < 60 * 60) g3.OE.step(1 / 30);
g3.d.hold('w', false);
eq(g3.OE.G.state, 'ENDING', 'ending fires with zero seams found');
ok(true, 'sequence breaking tolerated');

finish('playthrough');
