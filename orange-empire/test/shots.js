// test/shots.js — render a tour of the world to PNGs for visual review
const path = require('path');
const { makeGame } = require('./harness');

const OUT = path.join(__dirname, '..', 'shots');
const { OE, d, snap } = makeGame({ gl: true, width: 960, height: 540 });
const { G } = OE;

function settle(sec) { d.stepFrames(Math.ceil((sec || 1.5) * 30), 1 / 30); }
function pose(x, z, yaw, pitch) { d.setPlayerPos(x, z, yaw); G.player.pitch = pitch || 0; }
function shot(name) { const f = snap(path.join(OUT, name + '.png')); console.log('  shot', f.split('/').pop()); }

d.begin();

// ---- dusk, 7:24 PM ----
d.forceTime(19 * 60 + 24);
pose(-46, 4.0, Math.PI / 2, 0.02);          // looking east down Main
settle(2); shot('01_main_dusk');

pose(-19.5, -2.0, 0.28, 0.06);              // facing the Blue Pacific facade
settle(1); shot('02_blue_pacific_dusk');

pose(-44, 56, Math.PI * 0.32, 0.03);        // Palm Ave bungalows
settle(1); shot('03_residential_dusk');

// grove road, first barricade
pose(284, 1.6, Math.PI / 2, 0.02);
settle(1); shot('04_road_closed');

// the shack
pose(330, 18.5, Math.PI * 0.22, 0.05);
settle(1); shot('05_shack');

// thinning groves at d~640
pose(636, 3.0, Math.PI / 2, 0.03);
settle(1); shot('06_thinning');

// ---- night, 9:40 PM ----
d.forceTime(21 * 60 + 40);
settle(3);                                   // let the night swap + lamps settle
pose(-46, 4.0, Math.PI / 2, 0.02);
settle(1.5); shot('07_main_neon_night');

pose(-22.0, -4.2, 0.31, 0.10);              // the Blue Pacific neon, lit
settle(1); shot('08_bluepac_neon');

pose(3.4, 10.5, Math.PI - 0.10, 0.18);      // the Rialto marquee + blade sign
settle(1); shot('08b_rialto');

// bar interior
OE.QUEST.enterBar();
settle(0.5);
pose(OE.INTERIOR.CX + 2.2, OE.INTERIOR.CZ + 3.2, -Math.PI * 0.78, 0.03);
settle(1); shot('09_bar_interior');
OE.QUEST.exitBar();
settle(0.5);

// wireframe trees at d~820
pose(816, 2.4, Math.PI / 2, 0.04);
settle(1.5); shot('10_wire_groves');

// THE HERO: facing the boundary wall from d~940
pose(938, 1.0, Math.PI / 2, 0.10);
settle(1.5); shot('11_boundary_wall');

// chase cam while driving east at d~760
d.setCarPos(756, 0, Math.PI / 2);
d.enterCarNow();
d.hold('w', true); d.stepFrames(40, 1 / 30); d.hold('w', false);
shot('12_chase_drive');
d.exitCarNow();

// looking back west from deep east — town glow on the horizon
pose(700, -2.0, -Math.PI / 2, 0.04);
settle(1); shot('13_lookback');

console.log('\ndraw calls:', d.drawCalls(), ' triangles:', d.triangles());
console.log('done');
process.exit(0);
