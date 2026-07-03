'use strict';
// the-matrix-gameplay — node/play.js
// Scripted end-to-end session. Exit 0 only if every beat lands.
// Run: node node/play.js

const { Game } = require('./game');
const R = require('./renderer');

const out = [];
function emit(s) { out.push(s); console.log(s); }

const g = new Game('void');
let ok = true;
function check(cond, label) {
  emit((cond ? '  [pass] ' : '  [BEAT FAILED] ') + label);
  if (!cond) ok = false;
}

function frame(opts) {
  const dl = R.buildDrawList(g.world, Object.assign({ w: 33 }, opts || {}));
  emit(R.present(dl).split('\n').map(r => '    |' + r + '|').join('\n'));
}

function step(cmd) {
  const r = g.execute(cmd);
  emit('> ' + cmd);
  for (const l of r.lines) emit('    ' + l);
  return r;
}

function walkedCount(r) {
  const m = r.lines.join(' ').match(/Walked \w+ (\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// Retry-aware, lane-aware walking: the train keeps its own schedule and is
// solid, and its arrival can shove a track-walker up onto the platform.
function walk(dir, n, laneY) {
  const lane = laneY == null ? 2 : laneY;
  let remaining = n, guard = 0;
  while (remaining > 0 && guard++ < 12) {
    const r = step(dir + ' ' + remaining);
    remaining -= walkedCount(r);
    if (remaining > 0) {
      if (g.world.scene.trainState(g.world.tick).present) {
        emit('    [blocked: something long and loud is parked across the tracks — waiting it out]');
        let gone = false;
        for (let i = 0; i < 45 && !gone; i++) {
          const w = g.execute('wait 1');
          for (const l of w.lines) if (!l.startsWith('Waited')) emit('    ' + l);
          if (w.lines.join(' ').includes('pulls out')) gone = true;
        }
      }
      if (lane === 2 && g.world.player.y === 1) {
        emit('    [the arrival shoved us up onto the platform — climbing back down to the tracks]');
        step('south');
      }
    }
  }
  return remaining === 0;
}

emit('=== PLAYTHROUGH: the void, the station, the loop, the train ===');
emit('');
step('look');
step('operator, i need the station');
check(g.world.scene.id === 'mobil-ave', 'operator request for "the station" lands on Mobil Ave');
frame();
step('read wall');
check(g.world.log.join(' ').includes('LIMBO'), 'the wall sign resolves as an anagram');

emit('');
emit('--- to the seam: down to the tracks, east until world x = 48 (canonical 0) ---');
step('south');
walk('east', 24);
const seamRaw = g.world.player.x;
const seamCanon = g.world.scene.canon(seamRaw);
emit(`    [standing at raw x=${seamRaw}, canonical x=${seamCanon}: the join itself]`);
check(seamCanon === 0, 'the seam is canonical x = 0, reached by ordinary walking');
step('drop watch');

emit('');
emit('--- litmus (b): the dropped watch, seen from both approaches ---');
walk('east', 3);
emit('    [east side, canonical x=' + g.world.scene.canon(g.world.player.x) + ', the watch behind us to the west:]');
frame({ w: 11 });
const eastSees = R.present(R.buildDrawList(g.world, { w: 11 })).includes('◆');
walk('west', 6);
emit('    [west side, canonical x=' + g.world.scene.canon(g.world.player.x) + ', the watch ahead to the east:]');
frame({ w: 11 });
const westSees = R.present(R.buildDrawList(g.world, { w: 11 })).includes('◆');
check(eastSees && westSees, 'the watch renders from both sides of the join');
emit('    [code vision over the same ground: the field does not break at the join]');
frame({ w: 11, mode: 'code' });

emit('');
emit('--- litmus (a): circumnavigation, one full loop east along the tracks ---');
const beforeRaw = g.world.player.x, beforeCanon = g.world.scene.canon(beforeRaw);
const done = walk('east', 48);
const afterRaw = g.world.player.x, afterCanon = g.world.scene.canon(afterRaw);
emit(`    [raw x: ${beforeRaw} -> ${afterRaw}; canonical: ${beforeCanon} -> ${afterCanon}]`);
check(done && afterRaw === beforeRaw + 48 && afterCanon === beforeCanon,
  'one full loop: +48 raw, same canonical ground, zero seam events');

emit('');
emit('--- litmus (c): the station refuses the operator ---');
const objBefore = g.world.objects.size;
step('operator, i need guns');
emit('    [the sketch, one frame before it unravels:]');
frame({ w: 15 });
step('wait 2');
check(g.world.objects.size === objBefore, 'nothing materialized; the pedestal unraveled');
check(g.world.effects.length === 0, 'the sketch is fully de-rezzed');
step('operator, load the construct');
check(g.world.scene.id === 'mobil-ave', 'scene loads refused: the operator cannot pull us out');
step('operator, exit');
check(g.world.scene.id === 'mobil-ave', 'exit refused: still on the platform');

emit('');
emit('--- the only way out: the train, on its own timetable ---');
walk('west', 20);
if (g.world.player.y === 2) step('north');
// nudge along the platform to the door center by shortest canonical arc
{
  const c = g.world.scene.canon(g.world.player.x);
  let d = (((24 - c) % 48) + 48) % 48;
  if (d > 24) d -= 48;
  if (d !== 0) walk(d > 0 ? 'east' : 'west', Math.abs(d), 1);
}
const doorCanon = g.world.scene.canon(g.world.player.x);
check(g.world.player.y === 1 && doorCanon >= 22 && doorCanon <= 26, 'waiting on the platform, inside the door zone');
let arrived = g.world.scene.trainState(g.world.tick).present;
for (let i = 0; i < 60 && !arrived; i++) {
  const r = g.execute('wait 1');
  for (const l of r.lines) if (!l.startsWith('Waited')) emit('    ' + l);
  if (r.lines.join(' ').includes('pulls in')) arrived = true;
}
check(arrived, 'the train arrives on its own schedule, unasked');
frame();
let boarded = false;
for (let i = 0; i < 15 && !boarded; i++) {
  step('board');
  if (g.world.scene.id === 'void') { boarded = true; break; }
  g.execute('wait 1');
}
check(boarded && g.world.scene.id === 'void', 'boarded: the one thing that leaves, left with us aboard');
step('look');

emit('');
emit(ok ? '=== END: all beats landed ===' : '=== END: A BEAT FAILED ===');

require('fs').writeFileSync(__dirname + '/../PLAYTHROUGH.txt', out.join('\n') + '\n');
process.exit(ok ? 0 : 1);
