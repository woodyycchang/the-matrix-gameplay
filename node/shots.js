/* node/shots.js — render signature moments to PNGs for visual review */
'use strict';
const fs = require('fs');
const path = require('path');
for (const f of ['00_math', '01_glyph', '02_mesh', '03_props', '04_scenes', '05_engine', '06_game', '07_audio'])
  require(path.join(__dirname, '..', 'src', f + '.js'));
const C = globalThis.C;
const { Frame, paint } = require('./raster');
const { encodePNG } = require('./png');

const W = 960, H = 540;
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });

function step(g, inp, seconds) {
  const n = Math.round(seconds * 60);
  for (let i = 0; i < n; i++) {
    g.update(inp || {}, 1 / 60); g.drain();
    if (inp) { inp.actionEdge = false; inp.fireEdge = false; inp.jumpEdge = false; }
  }
}
function shoot(g, name, t) {
  g.updateCam(1 / 60, 1 / 60);
  const ops = C.render(g, W, H, t == null ? g.time : t);
  const fr = new Frame(W, H);
  fr.clear('#ff00ff'); // sentinel: any magenta left means the sky op failed
  paint(fr, ops, g.mode);
  fs.writeFileSync(path.join(OUT, name + '.png'), encodePNG(fr.buf, W, H));
  console.log('wrote', name + '.png', '(' + ops.length + ' ops)');
}
function look(g, yaw, pitch) { g.player.yaw = yaw; g.player.pitch = pitch || 0; }
function at(g, x, y, z) { g.player.pos = [x, y, z]; step(g, null, 0.03); }

// ---- 01 void with requested furniture ----
{
  const g = new C.Game();
  step(g, null, 0.3);
  g.request('a chair');
  step(g, null, 0.4); g.request('a table'); step(g, null, 0.3); g.request('a tv');
  step(g, null, 2.6);
  at(g, 0.4, 0, 1.6); look(g, 0.06, -0.04);
  shoot(g, '01_void_props', 5.0);
  // ---- 02 same view, code vision ----
  g.mode = 'code';
  shoot(g, '02_void_code', 5.2);
  g.mode = 'normal';
  // ---- 03 mid-materialize: ask for crates, catch them half-formed ----
  g.request('three crates');
  step(g, null, 0.52);
  shoot(g, '03_materialize_mid', g.time);
}

// ---- 04/05 armory: racks mid-slide, then settled aisle ----
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('guns. lots of guns');
  step(g, null, 1.30); // racks streaking in, inside the frustum now
  look(g, Math.PI, 0.02);
  shoot(g, '04_armory_sliding', g.time);
  step(g, null, 3.0);
  at(g, 0, 0, 0.4); look(g, Math.PI, 0.03);
  shoot(g, '05_armory_aisle', g.time);
  // ---- 06 at the pistol table, aiming ----
  const gun = g.scene.insts.find(i => i.kind === 'gun');
  at(g, gun.pos[0] - 0.15, 0, gun.pos[2] - 1.5);
  const dx = gun.pos[0] - g.cam.pos[0], dy = gun.pos[1] + 0.05 - g.cam.pos[1], dz = gun.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(dx, -dz);
  g.player.pitch = Math.asin(dy / Math.hypot(dx, dy, dz));
  step(g, null, 0.05);
  shoot(g, '06_armory_pistols', g.time);
  // ---- 07 held gun + muzzle burst, code armory ----
  step(g, { actionEdge: true }, 0.06);
  g.player.pitch = 0.0; g.player.yaw = Math.PI;
  step(g, { fireEdge: true }, 0.07);
  shoot(g, '07_armory_fire', g.time);
  g.mode = 'code';
  at(g, 0, 0, 0.4); look(g, Math.PI, 0.03);
  shoot(g, '08_armory_code', g.time);
}

// ---- 09/10 dojo ----
{
  const g = new C.Game();
  g.request('sparring dojo');
  step(g, null, 2.8);
  at(g, 1.6, 0, 0.6);
  const dm = g.scene.dummyPos;
  g.player.yaw = Math.atan2(dm[0] - 1.6, -(dm[2] - 0.6));
  g.player.pitch = -0.03;
  step(g, null, 0.05);
  shoot(g, '09_dojo', g.time);
  g.mode = 'code';
  shoot(g, '10_dojo_code', g.time);
}

// ---- 11..14 rooftop ----
{
  const g = new C.Game();
  g.request('the jump program');
  step(g, null, 2.6);
  look(g, Math.PI / 2, -0.06);
  shoot(g, '11_roof_start', g.time);
  // sprint to near the edge
  at(g, C.ROOF.edgeX - 2.4, C.ROOF.y, 0); look(g, Math.PI / 2, -0.18);
  shoot(g, '12_roof_edge', g.time);
  // mid-air over the gap
  g.player.pos = [(C.ROOF.aMax[0] + C.ROOF.bMin[0]) / 2, C.ROOF.y + 2.1, 0];
  g.player.vel = [8, 1.5, 0]; g.player.grounded = false;
  g.update({ fwd: 1, sprint: true }, 1 / 60); g.drain();
  look(g, Math.PI / 2, -0.12);
  shoot(g, '13_roof_midair', g.time);
  // first-fall slow-mo: drop in the canyon
  g.player.pos = [-0.2, 13, 0]; g.player.vel = [1.2, -16, 0]; g.player.grounded = false;
  g.player.lastGroundY = C.ROOF.y; g._fallFromRoof = true;
  for (let i = 0; i < 16; i++) { g.update({}, 1 / 60); g.drain(); }
  look(g, Math.PI / 2, -1.22);
  shoot(g, '14_roof_falling_slowmo', g.time);
  // impact: down state w/ cracks + vignette
  let guard = 0;
  while (g.state !== 'down' && guard++ < 600) { g.update({}, 1 / 60); g.drain(); }
  step(g, null, 0.6);
  shoot(g, '15_impact_down', g.time);
}

// ---- 16..19 city ----
{
  const g = new C.Game();
  g.request('crowded street, lunch hour');
  step(g, null, 3.0);
  at(g, -14, 0, 0.4); look(g, Math.PI / 2, 0.01);
  shoot(g, '16_city_crowd', g.time);
  // red dress approaching
  g._redTimer = 0.01; step(g, null, 0.12);
  const red = g.crowd.red.it;
  // place her photogenic: 9m ahead
  red.pos[0] = g.player.pos[0] + 9; red.pos[2] = g.player.pos[2] + 0.6;
  const dx = red.pos[0] - g.cam.pos[0], dz = red.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(dx, -dz); g.player.pitch = 0.0;
  step(g, null, 0.06);
  shoot(g, '17_city_red', g.time);
  // stare until frozen
  let guard = 0;
  while (g.state !== 'frozen' && guard++ < 360) {
    const ddx = red.pos[0] - g.cam.pos[0], ddy = red.pos[1] + 1.2 - g.cam.pos[1], ddz = red.pos[2] - g.cam.pos[2];
    g.player.yaw = Math.atan2(ddx, -ddz);
    g.player.pitch = Math.asin(ddy / Math.hypot(ddx, ddy, ddz));
    g.update({}, 1 / 60); g.drain();
  }
  step(g, null, 0.4);
  // face the agent
  const ag = g.crowd.agent.it;
  const adx = ag.pos[0] - g.cam.pos[0], adz = ag.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(adx, -adz); g.player.pitch = 0.0;
  g.updateCam(1 / 60, 1 / 60);
  shoot(g, '18_city_frozen_agent', g.time);
  // resume + code vision
  for (let i = 0; i < 90 && g.state === 'frozen'; i++) { g.update({ any: true }, 1 / 60); g.drain(); }
  g.mode = 'code';
  look(g, Math.PI / 2, 0.02);
  shoot(g, '19_city_code', g.time);
}

// ---- 20 booth + 21 pedestal ----
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('a phone booth');
  step(g, null, 2.2);
  const b = g.scene.insts.find(i => i.kind === 'booth');
  at(g, b.pos[0] - 0.4, 0, b.pos[2] + 3.4);
  const dx = b.pos[0] - g.cam.pos[0], dz = b.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(dx, -dz); g.player.pitch = 0.04;
  step(g, null, 0.04);
  shoot(g, '20_booth_exit', g.time);
  g.player.yaw += 2.4; step(g, null, 0.03);
  g.request('give me a flamingo');
  step(g, null, 2.2);
  const ped = g.scene.insts.filter(i => i.kind === 'pedestal').pop();
  at(g, ped.pos[0] + Math.sin(g.player.yaw) * -2.4, 0, ped.pos[2] + Math.cos(g.player.yaw) * 2.4);
  const px = ped.pos[0] - g.cam.pos[0], pz = ped.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(px, -pz); g.player.pitch = 0.0;
  step(g, null, 0.04);
  shoot(g, '21_pedestal_unknown', g.time);
}

// ---- 22-24 motorcycle: parked, riding POV, code vision ----
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('a motorcycle');
  step(g, null, 1.4);
  const bike = g.scene.insts.find(i => i.kind === 'bike');
  // parked, viewed from front-left
  at(g, bike.pos[0] - 2.2, 0, bike.pos[2] + 2.6);
  let dx = bike.pos[0] - g.cam.pos[0], dz = bike.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(dx, -dz); g.player.pitch = -0.08;
  step(g, null, 0.05);
  shoot(g, '22_bike_parked', g.time);
  // mount and ride forward, first-person
  g.player.pos = [bike.pos[0] - 0.5, 0, bike.pos[2]];
  step(g, null, 0.05);
  let mbx = bike.pos[0] - g.cam.pos[0], mby = bike.pos[1] + 0.6 - g.cam.pos[1], mbz = bike.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(mbx, -mbz); g.player.pitch = Math.asin(mby / Math.hypot(mbx, mby, mbz));
  step(g, null, 0.05);
  step(g, { actionEdge: true }, 0.1);
  step(g, { fwd: 1, sprint: true }, 1.8); // get some speed + lean
  step(g, { fwd: 1, strafe: 1 }, 0.4);
  g.player.pitch = -0.22; // look down a touch so the tank and bars frame the shot
  step(g, { fwd: 1 }, 0.04);
  shoot(g, '23_bike_riding', g.time);
  g.mode = 'code';
  shoot(g, '24_bike_code', g.time);
}

// ---- 25-26 katana: stand, then striking the dummy in hand ----
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('sparring dojo');
  step(g, null, 0.5);
  g.request('a katana');
  step(g, null, 1.2);
  const stand = g.scene.insts.find(i => i.kind === 'katana');
  at(g, stand.pos[0] - 0.9, 0, stand.pos[2] + 1.5);
  let dx = stand.pos[0] - g.cam.pos[0], dy = stand.pos[1] + 0.35 - g.cam.pos[1], dz = stand.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(dx, -dz); g.player.pitch = Math.asin(dy / Math.hypot(dx, dy, dz));
  step(g, null, 0.05);
  shoot(g, '25_katana_stand', g.time);
  // take it, strike the dummy
  g.player.pos = [stand.pos[0], 0, stand.pos[2] + 1.3];
  step(g, null, 0.05);
  dx = stand.pos[0] - g.cam.pos[0]; dy = stand.pos[1] + 0.35 - g.cam.pos[1]; dz = stand.pos[2] - g.cam.pos[2];
  g.player.yaw = Math.atan2(dx, -dz); g.player.pitch = Math.asin(dy / Math.hypot(dx, dy, dz));
  step(g, null, 0.05);
  step(g, { actionEdge: true }, 0.1);
  const dm = g.scene.dummyPos;
  g.player.pos = [dm[0], 0, dm[2] + 1.7];
  step(g, null, 0.05);
  g.player.yaw = Math.atan2(dm[0] - g.cam.pos[0], -(dm[2] - g.cam.pos[2])); g.player.pitch = 0.02;
  step(g, { fireEdge: true }, 0.08);
  shoot(g, '26_katana_strike', g.time);
}


// ---- 28 render-tier lineup: terminal | retail | custom side by side ----
{
  const g = new C.Game();
  step(g, null, 0.2);
  // hand-place three humans of different tiers in the void by pushing instances
  const P = C.props;
  function place(mesh, x, label) {
    const it = C.inst(mesh, [x, 0, -3.2], Math.PI, { kind: 'ped', label: label });
    it.pose = [0, 0.3, -0.3, -0.2, 0.2, 0]; it.loadT = 1; it.loadDir = 0;
    g.scene.insts.push(it);
  }
  place(P.human({ tier: 'terminal', suit: '#6a6f76' }), -1.6, 'terminal');
  place(P.human({ tier: 'retail',   suit: '#5a5c60' }),  0.0, 'retail');
  place(P.human({ tier: 'custom',   suit: '#4a4c50', shirt: '#dddbd4' }), 1.6, 'custom');
  at(g, 0, 1.0, 0.8); look(g, 0, -0.05);
  step(g, null, 0.05);
  shoot(g, '28_render_tiers', g.time);
  g.mode = 'code';
  shoot(g, '29_render_tiers_code', g.time);
}
console.log('done');
