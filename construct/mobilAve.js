'use strict';
// construct/mobilAve.js — Mobil Ave, a between-place.
//
// Topology: a cylinder. World x-coordinates are equivalence classes under
// x ~ x + W. canon() names the class; images() lists every raw copy of a
// canonical cell inside a window. There is no seam handler because the seam
// is not a place — it is an artifact of naming. Walk far enough along the
// tracks in either direction and you arrive at the platform's other end.
//
// The one rule that matters: nothing the operator asks for compiles here.
// Requests sketch a pedestal that unravels. The only thing that leaves this
// station is the train, and the train keeps its own schedule.

const W = 48;                    // circumference of the loop, in tiles
const H = 4;                     // y: 0 wall • 1 platform • 2 tracks • 3 tunnel wall
const PLAT0 = 6, PLAT1 = 42;     // platform occupies canonical x in [6,42) on y=1
const SIGN0 = 22;                // 'MOBIL' painted on the wall at x 22..26, y=0
const SIGN = 'MOBIL';
const TRAIN = {
  period: 40,                    // ticks per full cycle
  arrive: 24, depart: 35,        // present while tick % period in [24,35)
  doorsOpen: 27, doorsClose: 33, // doors while in [27,33)
  x0: 14, x1: 34,                // car span on the tracks (interior: never crosses the seam)
  door0: 22, door1: 26,          // boardable cells, from the platform edge
};

function canon(x) { return ((x % W) + W) % W; }

// All raw copies of canonical cx inside [x0, x1).
function images(cx, x0, x1) {
  const out = [];
  let wx = cx + Math.floor((x0 - cx) / W) * W;
  if (wx < x0) wx += W;
  for (; wx < x1; wx += W) out.push(wx);
  return out;
}

function trainState(tick) {
  const t = ((tick % TRAIN.period) + TRAIN.period) % TRAIN.period;
  return {
    t,
    present: t >= TRAIN.arrive && t < TRAIN.depart,
    doors: t >= TRAIN.doorsOpen && t < TRAIN.doorsClose,
  };
}

const scene = {
  id: 'mobil-ave',
  name: 'Mobil Ave',
  aliases: ['mobil ave', 'the station', 'station', 'mobil avenue', 'mobil-ave'],
  width: W,
  height: H,
  seed: 0x4C1B06D0,
  spawn: { x: 24, y: 1 },
  topology: 'cylinderX',
  canon,
  images,
  trainState,
  TRAIN, PLAT0, PLAT1, SIGN0, SIGN,
  enterText: 'A tiled platform under sodium light. The tracks run out of sight both ways — and, if you follow them far enough, back. Somewhere down the line, a train keeps its own timetable.',

  tileAt(cx, y) {
    if (y < 0 || y >= H) return null;
    if (y === 0) {
      const i = cx - SIGN0;
      if (i >= 0 && i < SIGN.length) return { glyph: SIGN[i], walk: false, sign: true };
      return { glyph: '▒', walk: false };
    }
    if (y === 1) {
      return (cx >= PLAT0 && cx < PLAT1)
        ? { glyph: '░', walk: true }
        : { glyph: ' ', walk: false }; // past the platform ends: sheer drop to track level
    }
    if (y === 2) return { glyph: '=', walk: true }; // the tracks: walkable the whole way round
    return { glyph: '▓', walk: false };
  },

  // The train is solid while present.
  blocked(world, cx, y) {
    const ts = trainState(world.tick);
    return ts.present && y === 2 && cx >= TRAIN.x0 && cx < TRAIN.x1;
  },

  onTick(world) {
    const prev = trainState(world.tick - 1);
    const now = trainState(world.tick);
    if (!prev.present && now.present) {
      const cx = canon(world.player.x);
      if (world.player.y === 2 && cx >= TRAIN.x0 && cx < TRAIN.x1) {
        // Safe by containment: [x0,x1) sits inside the platform span.
        world.player.y = 1;
        world.log.push('Headlights bloom in the tunnel — you scramble up onto the platform as the train slams past and brakes.');
      } else {
        world.log.push('A train pulls in, brakes shrieking against the loop. It waits.');
      }
    }
    if (!prev.doors && now.doors) world.log.push('The doors rattle open.');
    if (prev.doors && !now.doors) world.log.push('The doors seal.');
    if (prev.present && !now.present) world.log.push('The train pulls out and the sound folds away around the curve. The platform is yours again.');
  },

  // The whole point of the place: operator requests do not compile here.
  onOperatorRequest(world, intent) {
    const E = require('../node/engine');
    if (intent.type === 'exit') {
      world.log.push('Static on the line. No door compiles, no ring, no way up. Whatever runs this station is not your operator.');
      return { refused: true };
    }
    // materialize and load-scene alike: a pedestal sketches itself, then unravels.
    const px = canon(world.player.x + 1);
    E.addEffect(world, { kind: 'derez-pedestal', glyph: '╥', x: px, y: world.player.y, ttl: 2 });
    world.log.push('A pedestal sketches itself in green wireframe beside you — and unravels before it can hold anything. The station refuses the request.');
    return { refused: true };
  },

  readWall(world) {
    const cx = canon(world.player.x);
    if (world.player.y <= 1 && cx >= SIGN0 - 1 && cx <= SIGN0 + SIGN.length) {
      return 'Chipped tiles on the wall spell M-O-B-I-L. Shuffled, the same five letters spell LIMBO. Someone named this place honestly.';
    }
    return 'Grimy tile and old paint. Nothing written here.';
  },

  tryBoard(world) {
    const ts = trainState(world.tick);
    const cx = canon(world.player.x);
    if (ts.present && ts.doors && world.player.y === 1 && cx >= TRAIN.door0 && cx <= TRAIN.door1) {
      world.log.push('You step through the doors as they begin to close behind you.');
      return true;
    }
    if (!ts.present) world.log.push('No train. The rails wait, humming with nothing.');
    else if (!ts.doors) world.log.push('The train is here, but its doors are shut tight.');
    else world.log.push('The doors are open, but not in front of you — move along the platform to reach them.');
    return false;
  },

  // Train drawn from the draw list like everything else, layer 3.
  extraDraw(world, vp, list, imagesForFn) {
    const ts = trainState(world.tick);
    if (!ts.present) return;
    for (let cx = TRAIN.x0; cx < TRAIN.x1; cx++) {
      const isDoor = ts.doors && cx >= TRAIN.door0 && cx <= TRAIN.door1;
      for (const wx of imagesForFn(scene, cx, vp.x0, vp.x0 + vp.w)) {
        const sy = 2 - vp.y0;
        if (sy < 0 || sy >= vp.h) continue;
        list.push({ layer: 3, kind: 'train', sx: wx - vp.x0, sy, wx: cx, wy: 2, glyph: isDoor ? '▯' : '▉' });
      }
    }
  },
};

module.exports = scene;
