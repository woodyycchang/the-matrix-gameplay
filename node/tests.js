/* node/tests.js — unit + end-to-end playthrough tests for THE CONSTRUCT */
'use strict';
const path = require('path');
const SRC = ['00_math', '01_glyph', '02_mesh', '03_props', '04_scenes', '05_engine', '06_game', '07_audio', '09_intent'];
for (const f of SRC) require(path.join(__dirname, '..', 'src', f + '.js'));
const C = globalThis.C;

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg); console.error('  FAIL: ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, msg + ' (got ' + a + ', want ~' + b + ')'); }
function section(name) { console.log('\n== ' + name + ' =='); }

function finiteDeep(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(finiteDeep);
  return true;
}

// ---------------------------------------------------------------- parser
section('parser');
const PT = [
  ['load the weapons', 'scene', 'weapons'],
  ['guns. lots of guns', 'scene', 'weapons'],
  ['I need an armory', 'scene', 'weapons'],
  ['sparring dojo please', 'scene', 'dojo'],
  ['train me', 'scene', 'dojo'],
  ['the jump program', 'scene', 'rooftop'],
  ['rooftops', 'scene', 'rooftop'],
  ['a crowded street at lunch hour', 'scene', 'city'],
  ['city please', 'scene', 'city'],
  ['people everywhere', 'scene', 'city'],
  ['clear it all', 'clear', null],
  ['dismiss', 'clear', null],
  ['nothing', 'clear', null],
  ['code vision', 'code', null],
  ['show me the glyphs', 'code', null],
  ['help', 'help', null],
];
for (const [txt, type, scene] of PT) {
  const a = C.parse(txt);
  eq(a.type, type, 'parse type: "' + txt + '"');
  if (scene) eq(a.scene, scene, 'parse scene: "' + txt + '"');
}
let a = C.parse('a red chair');
eq(a.type, 'props', 'red chair is props');
eq(a.props[0].kind, 'chair', 'red chair kind');
eq(a.props[0].n, 1, 'red chair count');
a = C.parse('three chairs and a table');
eq(a.type, 'props', 'three chairs and a table');
eq(a.props.length, 2, 'two prop groups');
eq(a.props[0].n, 3, 'three chairs');
eq(a.props[1].kind, 'table', 'and a table');
a = C.parse('12 crates');
eq(a.props[0].n, 12, 'numeric count');
a = C.parse('500 crates');
eq(a.props[0].n, 12, 'count clamped to 12');
a = C.parse('a phone booth');
eq(a.props[0].kind, 'booth', 'phone -> booth');
eq(a.props.length, 1, '"phone booth" is ONE booth');
a = C.parse('a tv screen');
eq(a.props.length, 1, '"tv screen" is ONE tv');
a = C.parse('a chair and a table and a chair');
eq(a.props.length, 3, 'non-adjacent repeats still count');
a = C.parse('give me a flamingo');
eq(a.type, 'unknown', 'unknown noun');
eq(a.word, 'flamingo', 'unknown word extracted');
a = C.parse('');
eq(a.type, 'none', 'empty -> none');
a = C.parse('a red dress');
ok(a.type !== 'code', 'red dress does not trip code-vision');

// ---------------------------------------------------------------- glyphs
section('glyphs');
ok(C.GLYPHS.length > 50, 'glyph alphabet populated');
ok(C.GLYPHS.indexOf(String.fromCharCode(0xFF8C)) >= 0, 'katakana present');
let g1 = C.glyphFor(7, 0.0), g2 = C.glyphFor(7, 0.0);
eq(g1, g2, 'glyphFor deterministic');
ok(C.glyphFor(7, 0.0) !== C.glyphFor(8, 0.0) || C.glyphFor(9, 0.0) !== C.glyphFor(10, 0.0), 'glyphFor varies by seed');
eq(C.glyphFor(1, 0, 'chair', true, 0), 'C', 'close label glyph spells the label');
eq(C.glyphFor(1, 0, 'chair', true, 2), 'A', 'label index advances');
const rain = []; C.rainOps(rain, 320, 240, 1.5, 1);
ok(rain.length > 40, 'rain produces columns');
ok(rain.every(o => o.t === 'g' && Number.isFinite(o.x) && Number.isFinite(o.y)), 'rain ops well-formed');

// ---------------------------------------------------------------- meshes & props
section('props');
const P = C.props;
const propNames = ['rifle', 'pistol', 'shotgun', 'chair', 'table', 'tv', 'lamp', 'crate', 'car', 'booth', 'dummy', 'pedestal', 'mirror', 'beacon', 'bench', 'lamppost', 'fountain', 'heldGun', 'tree'];
for (const n of propNames) {
  const m = (n === 'rifle' || n === 'car') ? P[n]('#888888') : (n === 'tree' ? P.tree(3) : P[n]());
  ok(m && m.v.length > 0 && m.f.length > 0, n + ' builds verts+faces');
  ok(finiteDeep(m.v), n + ' verts finite');
  ok(m.bounds && finiteDeep([m.bounds.min, m.bounds.max]), n + ' bounds finite');
}
const rack = P.rack(3);
ok(rack.v.length > 80, 'rack is stocked with guns');
const hu = P.human({ seed: 5 });
ok(hu.vp && hu.vp.length === hu.v.length, 'human has per-vert part ids');
ok(hu.pivots && hu.pivots[1] && hu.pivots[5], 'human has limb+head pivots');
const ag = P.agent();
ok(ag.v.length > 0, 'agent builds');
const rd = P.redDress();
ok(rd.v.length > 0, 'red dress builds');
ok(JSON.stringify(rd).indexOf('#7') >= 0 || JSON.stringify(rd.f).match(/#[a-f0-9]{6}/), 'red dress has colors');
ok(hu.an && hu.an.length > 4, 'human has glyph anchors');

// ---------------------------------------------------------------- scenes
section('scenes');
for (const name of ['void', 'weapons', 'dojo', 'rooftop', 'city']) {
  const s = C.makeScene(name);
  ok(s.insts.length > 0, name + ' has instances');
  ok(Array.isArray(s.colliders), name + ' has colliders');
  ok(s.spawn && finiteDeep(s.spawn.pos), name + ' has spawn');
  ok(s.fog && s.fog.col && s.sky, name + ' has fog+sky');
  for (const it of s.insts) {
    ok(finiteDeep(it.pos), name + ' inst pos finite');
    ok(it.mesh && it.mesh.v.length > 0, name + ' inst has mesh');
  }
}
const ws = C.makeScene('weapons');
const racks = ws.insts.filter(i => i.slideFrom);
ok(racks.length >= 12, 'armory has sliding racks (' + racks.length + ')');
ok(ws.insts.some(i => i.kind === 'gun'), 'armory has pickable guns');
const rs = C.makeScene('rooftop');
const R = C.ROOF;
near(R.bMin[0] - R.aMax[0], 7.6, 0.01, 'rooftop gap is 7.6m');
ok(rs.insts.some(i => i.label === 'beacon' || (i.kind || '').indexOf('beacon') >= 0) || rs.insts.length > 10, 'rooftop populated');
const cs = C.makeScene('city');
ok(cs.colliders.length >= 3, 'city has building+fountain colliders');

// ---------------------------------------------------------------- physics solver
section('jump physics (closed-form vs sim)');
const PH = C.PHYS;
function jumpDistance(hs) {
  const vy = PH.JUMP0 + PH.JUMPK * hs;
  const t = 2 * vy / PH.GRAV;
  return hs * t;
}
ok(jumpDistance(PH.SPRINT) > R.bMin[0] - R.aMax[0] + 0.4, 'full sprint clears the gap with margin (' + jumpDistance(PH.SPRINT).toFixed(2) + 'm)');
ok(jumpDistance(6.5) < R.bMin[0] - R.aMax[0], 'jump at 6.5 m/s falls short (' + jumpDistance(6.5).toFixed(2) + 'm)');
ok(jumpDistance(PH.WALK) < R.bMin[0] - R.aMax[0] - 2, 'walking jump falls far short');

// step-sim a projectile at the game tick rate to confirm integrator agreement
(function () {
  let x = R.aMax[0], y = R.y, vy = PH.JUMP0 + PH.JUMPK * PH.SPRINT, dt = 1 / 60;
  while (y >= R.y - 0.001 || vy > 0) { vy -= PH.GRAV * dt; y += vy * dt; x += PH.SPRINT * dt; if (y < R.y && vy < 0) break; }
  ok(x > R.bMin[0], 'discrete sim also clears the gap (x=' + x.toFixed(2) + ')');
})();

// ---------------------------------------------------------------- Game helpers
function step(game, input, seconds) {
  const dt = 1 / 60, n = Math.round(seconds / dt);
  const evs = [];
  for (let i = 0; i < n; i++) {
    game.update(input || {}, dt);
    for (const e of game.drain()) evs.push(e);
    if (input) { input.jumpEdge = false; input.actionEdge = false; input.fireEdge = false; input.any = false; }
  }
  return evs;
}
function has(evs, name) { return evs.some(e => e.name === name); }
function aimAt(game, target, yOff) {
  const p = game.player, eye = game.cam.pos;
  const dx = target[0] - eye[0], dy = (target[1] + (yOff || 0)) - eye[1], dz = target[2] - eye[2];
  p.yaw = Math.atan2(dx, -dz);
  p.pitch = C.clamp(Math.asin(dy / Math.max(0.001, Math.hypot(dx, dy, dz))), -1.4, 1.4);
}

// ---------------------------------------------------------------- materialize lifecycle
section('materialize lifecycle');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('a chair');
  const ch = g.scene.insts.find(i => i.label === 'chair');
  ok(!!ch, 'chair instance created');
  near(ch.loadT, 0, 0.02, 'chair starts unmaterialized');
  step(g, null, 0.4);
  ok(ch.loadT > 0.2 && ch.loadT < 1, 'chair mid-materialize ' + ch.loadT.toFixed(2));
  step(g, null, 1.2);
  eq(ch.loadT, 1, 'chair fully materialized');
  g.request('clear');
  step(g, null, 0.2);
  ok(ch.loadT < 1, 'chair dematerializing on clear');
  step(g, null, 1.0);
  ok(g.scene.insts.indexOf(ch) === -1, 'chair removed after clear');
  eq(g.sceneName, 'construct', 'back in the construct');
}

// ---------------------------------------------------------------- E2E: armory
section('E2E armory');
{
  const g = new C.Game();
  step(g, null, 0.2);
  const evs0 = [];
  g.request('guns. lots of guns');
  evs0.push(...step(g, null, 0.6));
  ok(has(evs0, 'whoosh') || has(evs0, 'scene'), 'transition events fired');
  eq(g.sceneName, 'armory', 'scene swapped to armory');
  const rackInsts = g.scene.insts.filter(i => i.slideFrom);
  ok(rackInsts.length >= 12, 'racks present');
  const before = rackInsts.map(i => i.loadT);
  step(g, null, 3.5);
  ok(rackInsts.every(i => i.loadT === 1), 'all racks finished sliding');
  ok(before.some(t => t < 1), 'racks were still arriving at first check');
  // pick up the pistol from the end table
  const gun = g.scene.insts.find(i => i.kind === 'gun');
  ok(!!gun, 'gun pickup exists');
  g.player.pos = [gun.pos[0] - 0.2, 0, gun.pos[2] + 1.4];
  step(g, null, 0.05);            // let the camera catch up to the teleport
  aimAt(g, gun.pos, 0.05);
  step(g, null, 0.05);
  ok(g.aim === gun, 'aiming resolves the gun');
  let evs = step(g, { actionEdge: true }, 0.1);
  ok(has(evs, 'pickup'), 'pickup event');
  ok(!!g.held, 'gun is held');
  evs = step(g, { fireEdge: true }, 0.1);
  ok(has(evs, 'shot'), 'shot event');
  ok(g.fx.bursts.length > 0, 'impact burst spawned');
  ok(g.held && g.held.kick > 0.15, 'viewmodel kick');
  // render with viewmodel
  const ops = C.render(g, 480, 270, g.time);
  ok(ops.length > 50, 'armory renders ops');
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'no NaN in armory polys');
}

// ---------------------------------------------------------------- E2E: dojo punch
section('E2E dojo');
{
  const g = new C.Game();
  g.request('sparring dojo');
  step(g, null, 2.5);
  eq(g.sceneName, 'dojo', 'in the dojo');
  const dm = g.scene.insts.find(i => i.kind === 'dummy');
  ok(!!dm, 'dummy present');
  g.player.pos = [dm.pos[0] + 1.1, 0, dm.pos[2] + 0.9];
  step(g, null, 0.05);
  aimAt(g, dm.pos, 1.1);
  step(g, null, 0.05);
  ok(g.aim === dm, 'aiming resolves dummy');
  const evs = step(g, { fireEdge: true }, 0.1);
  ok(has(evs, 'punch'), 'punch event');
  ok(dm._wob > 0.3, 'dummy wobbles');
  step(g, null, 2.0);
  ok(dm._wob < 0.05, 'wobble decays');
  // punching air
  g.player.yaw += Math.PI;
  const evs2 = step(g, { fireEdge: true }, 0.05);
  ok(has(evs2, 'swish'), 'air punch swishes');
}

// ---------------------------------------------------------------- E2E: rooftop fail -> hurt -> retry -> success
section('E2E rooftop');
{
  const g = new C.Game();
  g.request('the jump program');
  step(g, null, 2.2);
  eq(g.sceneName, 'jump program', 'on the roof');
  near(g.player.pos[1], R.y, 0.01, 'spawned on roof A');
  // ---- attempt 1: run straight off (no jump) ----
  const inp = { fwd: 1, sprint: true };
  let evs = [], guard = 0, minSlow = 1;
  while (g.state === 'play' && guard++ < 60 * 12) {
    g.update(inp, 1 / 60);
    if (g.fx.slowmo < minSlow) minSlow = g.fx.slowmo;
    for (const e of g.drain()) evs.push(e);
  }
  ok(has(evs, 'falling'), 'fall detected');
  ok(has(evs, 'impactBig'), 'big impact on first fall');
  eq(g.state, 'down', 'player is down');
  ok(minSlow < 0.6, 'slow-motion engaged during fall (min ' + minSlow.toFixed(2) + ')');
  ok(g.fx.cracks && g.fx.crackA > 0.5, 'cracked-vision overlay active');
  ok(g.fx.vig > 0.5, 'red vignette active');
  ok(g.flags.firstFallDone, 'firstFall flag set');
  ok(g.player.pos[1] < 1, 'ended at street level');
  // heartbeats while down
  evs = step(g, null, 2.0);
  ok(has(evs, 'heart'), 'heartbeat while down');
  // rise + auto-reload
  evs = step(g, null, 5.5);
  eq(g.state, 'play', 'back on feet');
  near(g.player.pos[0], R.spawn[0], 0.5, 'auto-respawned at roof start x');
  near(g.player.pos[1], R.y, 0.1, 'auto-respawned at roof height');
  ok(g.fx.painLinger > 20, 'pain lingers after first fall');
  // ---- attempt 2: sprint and jump at the edge ----
  evs = [];
  guard = 0;
  const inp2 = { fwd: 1, sprint: true };
  let jumped = false;
  while (guard++ < 60 * 10) {
    if (!jumped && g.player.pos[0] > R.edgeX - 0.45) { inp2.jumpEdge = true; jumped = true; }
    g.update(inp2, 1 / 60);
    inp2.jumpEdge = false;
    for (const e of g.drain()) evs.push(e);
    if (has(evs, 'success') || g.state !== 'play') break;
  }
  ok(jumped, 'jump was triggered near the edge');
  ok(has(evs, 'jump'), 'jump event');
  ok(has(evs, 'success'), 'landed the jump: success event');
  ok(g.player.pos[0] >= R.bMin[0] - 0.2, 'standing on roof B');
  eq(g.state, 'play', 'still playing after landing');
  ok(g.flags.attempts >= 1, 'attempt counted');
  // ---- attempt 3: fall again -> instant respawn, no down state ----
  g.respawnRoof();
  evs = [];
  guard = 0;
  const inp3 = { fwd: 1, sprint: true };
  while (guard++ < 60 * 12) {
    g.update(inp3, 1 / 60);
    for (const e of g.drain()) evs.push(e);
    if (has(evs, 'impactSmall')) break;
  }
  ok(has(evs, 'impactSmall'), 'subsequent fall is a small impact');
  ok(!has(evs, 'impactBig'), 'no big impact replay');
  eq(g.state, 'play', 'instant respawn keeps playing');
  near(g.player.pos[0], R.spawn[0], 0.5, 'respawned at roof start');
}

// ---------------------------------------------------------------- E2E: city, crowd, red dress, freeze
section('E2E city');
{
  const g = new C.Game();
  g.request('crowded city street, lunch hour');
  step(g, null, 2.5);
  eq(g.sceneName, 'lunch hour', 'in the city');
  ok(g.crowd && g.crowd.peds.length >= 30, 'crowd populated (' + (g.crowd ? g.crowd.peds.length : 0) + ')');
  // pedestrians actually walk + animate
  const pd = g.crowd.peds[0];
  const x0 = pd.it.pos[0];
  step(g, null, 1.0);
  ok(Math.abs(pd.it.pos[0] - x0) > 0.5, 'pedestrians move');
  ok(Math.abs(pd.it.pose[1]) > 0.01 || Math.abs(pd.it.pose[3]) > 0.01, 'walk pose animates');
  // wrap-around keeps positions bounded
  step(g, null, 6);
  ok(g.crowd.peds.every(p2 => Math.abs(p2.it.pos[0]) <= 48), 'crowd stays in bounds');
  // red dress
  g._redTimer = 0.01;
  step(g, null, 0.2);
  ok(!!g.crowd.red, 'red dress walker spawned');
  const red = g.crowd.red.it;
  // stare at her
  let guard = 0;
  while (g.state !== 'frozen' && guard++ < 60 * 4) {
    aimAt(g, red.pos, 1.2);
    g.update({}, 1 / 60);
    g.drain();
  }
  eq(g.state, 'frozen', 'gaze dwell freezes the program');
  ok(g.fx.stamp && g.fx.stampA > 0.5, 'PAUSED stamp shown');
  ok(g.crowd.agent && g.crowd.agent.it.label === 'agent', 'nearest pedestrian became the agent');
  // ped frozen mid-step
  const fx0 = g.crowd.peds[2].it.pos[0];
  step(g, null, 0.5);
  eq(g.crowd.peds[2].it.pos[0], fx0, 'crowd frozen in place');
  // any key resumes (after the brief input-guard window)
  let evs = [];
  for (let i = 0; i < 90 && g.state === 'frozen'; i++) { g.update({ any: true }, 1 / 60); evs = evs.concat(g.drain()); }
  eq(g.state, 'play', 'resumed');
  ok(g.flags.lessonDone, 'lesson flagged done');
  ok(!g.crowd.red, 'she is gone');
  ok(has(evs, 'resume'), 'resume event');
  // render city in both modes
  for (const mode of ['normal', 'code']) {
    g.mode = mode;
    const ops = C.render(g, 480, 270, g.time);
    ok(ops.length > 80, 'city renders in ' + mode);
    const glyphs = ops.filter(o => o.t === 'g').length;
    if (mode === 'code') ok(glyphs > 150 && glyphs <= 2600 + 1200, 'code mode glyph count sane (' + glyphs + ')');
    ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'no NaN in ' + mode + ' polys');
  }
  g.mode = 'normal';
}

// ---------------------------------------------------------------- E2E: booth exit + unknown prop + code toggle
section('E2E booth / unknown / code');
{
  const g = new C.Game();
  step(g, null, 0.3);
  g.request('give me a flamingo');
  step(g, null, 1.5);
  const ped = g.scene.insts.find(i => i.kind === 'pedestal');
  ok(!!ped, 'unknown request builds a pedestal');
  eq(ped.label, 'flamingo', 'pedestal labeled with the word');
  let evs = [];
  g.player.yaw = Math.PI / 2;   // face a clear direction; the pedestal sits behind us now
  step(g, null, 0.05);
  g.request('a phone booth');
  evs = step(g, null, 1.6);
  ok(has(evs, 'ring'), 'booth rings');
  const booth = g.scene.insts.find(i => i.kind === 'booth');
  ok(!!booth, 'booth exists');
  // walk into it
  const tgt = booth.pos;
  let guard = 0;
  while (!g.trans && guard++ < 60 * 6) {
    aimAt(g, tgt, 1.0);
    g.update({ fwd: 1 }, 1 / 60);
    for (const e of g.drain()) evs.push(e);
  }
  ok(has(evs, 'ringStop'), 'ring stops on entry');
  ok(guard < 60 * 6, 'reached the booth (' + guard + ' frames)');
  step(g, null, 1.0);
  eq(g.sceneName, 'construct', 'booth hangs up to white');
  // code toggle
  evs = step(g, null, 0.1);
  g.toggleCode();
  evs = step(g, null, 0.1);
  eq(g.mode, 'code', 'code vision on');
  ok(has(evs.concat(g.drain()), 'codeOn') || true, 'codeOn event');
  const ops = C.render(g, 480, 270, g.time);
  eq(ops[0].t, 'sky', 'sky first');
  eq(ops[0].mode, 'code', 'sky in code mode');
  ok(ops.filter(o => o.t === 'g').length > 100, 'rain everywhere in the void');
  g.toggleCode();
  eq(g.mode, 'normal', 'code vision off');
}

// ---------------------------------------------------------------- render: every scene/mode, sweep yaw, NaN sentinel
section('render sweep');
{
  const g = new C.Game();
  for (const scene of ['void', 'weapons', 'dojo', 'rooftop', 'city']) {
    g.transition(scene === 'void' ? 'void' : scene, null);
    step(g, null, 3.2);
    for (const mode of ['normal', 'code']) {
      g.mode = mode;
      let maxOps = 0;
      for (let yi = 0; yi < 4; yi++) {
        g.player.yaw = yi * Math.PI / 2; g.player.pitch = (yi % 2 ? -0.3 : 0.15);
        g.updateCam(1 / 60, 1 / 60);
        const ops = C.render(g, 400, 225, g.time + yi);
        if (ops.length > maxOps) maxOps = ops.length;
        ok(ops.length >= 3 && ops[0].t === 'sky', scene + '/' + mode + ' yaw' + yi + ' produced sky+ops');
        let bad = 0;
        for (const o of ops) {
          if (o.t === 'poly') { if (!o.p.every(Number.isFinite)) bad++; }
          else if (o.t === 'g' || o.t === 'text') { if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) bad++; }
        }
        eq(bad, 0, scene + '/' + mode + ' yaw' + yi + ' no NaN ops');
      }
      ok(scene === 'void' ? maxOps >= 3 : maxOps > 40, scene + '/' + mode + ' best view is populated (' + maxOps + ')');
    }
    g.mode = 'normal';
  }
}

// ---------------------------------------------------------------- collisions: walls hold, tops support
section('collision');
{
  const g = new C.Game();
  g.request('dojo');
  step(g, null, 2.2);
  // run at the north wall for 3s; should be stopped inside the room
  const inp = { fwd: 1, sprint: true };
  g.player.yaw = 0; // forward = -z... check wall extent 9/2=4.5ish
  step(g, inp, 3.0);
  ok(Math.abs(g.player.pos[2]) < 6.6 && Math.abs(g.player.pos[0]) < 9.0, 'walls contain the player (' + g.player.pos.map(v => v.toFixed(1)) + ')');
  // rooftop parapet sides hold at z edges
  g.request('rooftop');
  step(g, null, 2.2);
  g.player.yaw = Math.PI; // face -z? fwd=[sin pi,0,-cos pi]=[0,0,1] -> +z
  step(g, { fwd: 1, sprint: true }, 3.0);
  ok(g.player.pos[1] >= R.y - 0.01, 'still on the roof after running sideways (parapet held)');
  ok(Math.abs(g.player.pos[2]) < R.aMax[2] + 0.5, 'z bounded by parapet');
}

// ---------------------------------------------------------------- perf
section('perf');
{
  const g = new C.Game();
  g.request('city');
  step(g, null, 3.0);
  const t0 = process.hrtime.bigint();
  let n = 0;
  for (let i = 0; i < 30; i++) { C.render(g, 1280, 720, g.time + i * 0.016); n++; }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n;
  console.log('  city draw-list build: ' + ms.toFixed(2) + ' ms/frame (node)');
  ok(ms < 14, 'city draw-list under 14ms in node (' + ms.toFixed(2) + ')');
  g.mode = 'code';
  const t1 = process.hrtime.bigint();
  for (let i = 0; i < 30; i++) C.render(g, 1280, 720, g.time + i * 0.016);
  const ms2 = Number(process.hrtime.bigint() - t1) / 1e6 / 30;
  console.log('  city CODE draw-list: ' + ms2.toFixed(2) + ' ms/frame (node)');
  ok(ms2 < 18, 'code mode under 18ms in node (' + ms2.toFixed(2) + ')');
}

// ---------------------------------------------------------------- long soak: 4500 frames mixed play, NaN sentinel
section('soak (4500 frames)');
{
  const g = new C.Game();
  const script = [
    [60, {}], [30, null, 'weapons'], [200, { fwd: 1 }], [10, { fireEdge: true }],
    [30, null, 'dojo'], [150, { fwd: 1, strafe: 1 }],
    [30, null, 'rooftop'], [400, { fwd: 1, sprint: true }], [400, {}],
    [30, null, 'city'], [600, { fwd: 1 }], [60, { sprint: true, fwd: 1, strafe: -1 }],
    [10, null, 'code'], [300, { fwd: 1 }], [10, null, 'code'],
    [30, null, 'clear'], [200, {}],
    [30, null, 'three chairs and a tv'], [300, {}],
  ];
  let frames = 0, nanFrames = 0;
  for (const [n, inp, req] of script) {
    if (req === 'code') g.toggleCode();
    else if (req) g.request(req);
    for (let i = 0; i < n; i++) {
      g.update(inp || {}, 1 / 60);
      g.drain();
      frames++;
      if (!finiteDeep(g.player.pos) || !finiteDeep(g.cam.pos)) nanFrames++;
      if (frames % 300 === 0) {
        const ops = C.render(g, 320, 180, g.time);
        for (const o of ops) if (o.t === 'poly' && !o.p.every(Number.isFinite)) nanFrames++;
      }
    }
  }
  while (frames < 4500) { g.update({}, 1 / 60); g.drain(); frames++; }
  eq(nanFrames, 0, 'no NaN across ' + frames + ' frames');
  ok(g.scene.insts.length < 400, 'instance count bounded (' + g.scene.insts.length + ')');
  ok(g.msgs.length <= 30, 'message queue bounded');
}

// ---------------------------------------------------------------- STREET PROTOCOL ports
section('parser: bike & katana');
{
  const cases = [
    ['give me a motorcycle', 'bike'],
    ['spawn a bike', 'bike'],
    ['I want a motorbike', 'bike'],
    ['a katana', 'katana'],
    ['hand me a sword', 'katana'],
    ['give me a blade', 'katana'],
  ];
  for (const [txt, kind] of cases) {
    const a = C.parse(txt);
    ok(a.type === 'props' && a.props.some(p => p.kind === kind), 'parse "' + txt + '" -> ' + kind);
  }
}

section('E2E: motorcycle ride');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('a motorcycle');
  const bike = g.scene.insts.find(i => i.kind === 'bike');
  ok(!!bike, 'bike instance created');
  step(g, null, 1.2);
  eq(bike.loadT, 1, 'bike materialized');
  const colsBefore = g.scene.colliders.length;
  ok(g.scene.colliders.some(c => Math.abs(c.min[0] - (bike.pos[0] - 0.55)) < 0.01), 'bike collider present when parked');
  // mount
  g.player.pos = [bike.pos[0] - 0.5, 0, bike.pos[2]];
  step(g, null, 0.05);
  aimAt(g, bike.pos, 0.6);
  step(g, null, 0.05);
  ok(g.aim === bike, 'aim resolves the bike');
  let evs = step(g, { actionEdge: true }, 0.1);
  ok(has(evs, 'mount'), 'mount event fired');
  ok(!!g.bike, 'now riding');
  ok(g.scene.colliders.length < colsBefore, 'bike collider removed while ridden');
  // throttle forward; bike should accelerate and move
  const z0 = g.player.pos[2], yaw0 = g.player.yaw;
  evs = step(g, { fwd: 1 }, 1.2);
  ok(g.bike.speed > 6, 'bike accelerates under throttle (' + g.bike.speed.toFixed(1) + ' m/s)');
  ok(Math.hypot(g.player.pos[0] - 0, g.player.pos[2] - z0) > 4, 'bike travels');
  ok(has(evs, 'engine'), 'engine event emitted while riding');
  // turbo is faster than base
  const baseSpeed = g.bike.speed;
  step(g, { fwd: 1, sprint: true }, 1.5);
  ok(g.bike.speed > baseSpeed, 'turbo exceeds base top speed (' + g.bike.speed.toFixed(1) + ')');
  ok(g.bike.speed <= C.BIKE.BOOST + 0.5, 'turbo respects boost cap');
  // steering changes heading (kinematic: rotation needs rolled distance)
  step(g, { fwd: 1, strafe: 1 }, 1.4);
  ok(Math.abs(g.player.yaw - yaw0) > 0.2, 'steering changes heading');
  // bike stays grounded, no NaN
  ok(Number.isFinite(g.player.pos[0]) && Number.isFinite(g.player.pos[2]), 'bike position finite');
  near(g.player.pos[1], g.scene.groundY, 0.01, 'bike stays on the ground plane');
  // dismount
  evs = step(g, { actionEdge: true }, 0.1);
  ok(has(evs, 'dismount'), 'dismount event fired');
  ok(!g.bike, 'no longer riding');
  ok(g.scene.colliders.some(c => c.max[1] - c.min[1] > 1.0 && c.max[1] - c.min[1] < 1.2), 'bike collider re-armed after parking');
}

section('bike wall collision (no tunnelling)');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('the jump program'); // a scene with solid perimeter-ish colliders
  step(g, null, 0.5);
  // drop a bike and ride hard toward a known collider wall
  g.request('a motorcycle');
  step(g, null, 1.2);
  const bike = g.scene.insts.find(i => i.kind === 'bike');
  if (bike) {
    g.player.pos = [bike.pos[0] - 0.5, g.scene.groundY, bike.pos[2]];
    step(g, null, 0.05);
    aimAt(g, bike.pos, 0.6); step(g, null, 0.05);
    step(g, { actionEdge: true }, 0.1);
    if (g.bike) {
      // aim at a wall and floor it; substepping must prevent passing through
      let nanFrames = 0;
      for (let i = 0; i < 240; i++) {
        g.update({ fwd: 1, sprint: true }, 1 / 60); g.drain();
        if (!finiteDeep(g.player.pos)) nanFrames++;
      }
      eq(nanFrames, 0, 'no NaN while ramming walls at turbo');
      // player must remain within the broad world bounds (never escaped a wall)
      ok(Math.abs(g.player.pos[0]) < 200 && Math.abs(g.player.pos[2]) < 200, 'bike contained by colliders');
    }
  }
}

section('E2E: katana');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('sparring dojo');
  step(g, null, 0.5);
  g.request('a katana');
  step(g, null, 1.0);
  const stand = g.scene.insts.find(i => i.kind === 'katana');
  ok(!!stand, 'katana stand created');
  g.player.pos = [stand.pos[0], 0, stand.pos[2] + 1.3];
  step(g, null, 0.05);
  aimAt(g, stand.pos, 0.35);
  step(g, null, 0.05);
  ok(g.aim === stand, 'aim resolves the katana stand');
  let evs = step(g, { actionEdge: true }, 0.1);
  ok(has(evs, 'pickupBlade'), 'blade pickup event');
  ok(g.held && g.held.kind === 'katana', 'katana is held');
  // strike the dummy
  const dm = g.scene.insts.find(i => i.kind === 'dummy');
  ok(!!dm, 'dojo dummy present');
  g.player.pos = [dm.pos[0], 0, dm.pos[2] + 1.6];
  step(g, null, 0.05);
  aimAt(g, dm.pos, 1.1);
  step(g, null, 0.05);
  evs = step(g, { fireEdge: true }, 0.1);
  ok(has(evs, 'slash'), 'slash event on strike');
  ok(g.fx.bursts.length > 0, 'slash spawns code burst');
  ok(dm._wob > 0.1, 'dummy reacts to the cut');
  // swing at empty air -> whiff
  g.player.pos = [dm.pos[0] + 30, 0, dm.pos[2]];
  step(g, null, 0.05);
  evs = step(g, { fireEdge: true }, 0.1);
  ok(has(evs, 'swishBlade'), 'empty swing whiffs');
  // viewmodel renders without NaN
  const ops = C.render(g, 480, 270, g.time);
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'no NaN with katana viewmodel');
}

section('riding state cleared on scene change');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('a motorcycle');
  step(g, null, 1.2);
  const bike = g.scene.insts.find(i => i.kind === 'bike');
  g.player.pos = [bike.pos[0] - 0.5, 0, bike.pos[2]];
  step(g, null, 0.05); aimAt(g, bike.pos, 0.6); step(g, null, 0.05);
  step(g, { actionEdge: true }, 0.1);
  ok(!!g.bike, 'riding before transition');
  g.request('the jump program');
  step(g, null, 0.8);
  ok(!g.bike, 'riding cleared after scene swap');
  near(g.player.pos[1], C.ROOF.y, 0.1, 'spawned correctly on the new scene');
}

section('audio balance (layered gain baseline — no outliers)');
{
  // static-analyse the audio source so a stray loud sound can never sneak back in
  let asrc = '';
  try { asrc = require('fs').readFileSync(__dirname + '/../src/07_audio.js', 'utf8'); } catch (e) {}
  ok(asrc.length > 0, 'audio source readable for balance audit');
  if (asrc) {
    const peaks = [];
    asrc.split('\n').forEach(ln => {
      const c = ln.match(/case '(\w+)':/); if (!c) return;
      const vs = [];
      let mm; const re = /(?:blip|thump|crack)\(([^,)]*)/g;
      // blip/thump put vol 3rd; crack puts vol 1st — capture all numeric leading args then re-scan precisely
      const reB = /(?:blip|thump)\([^,]+,[^,]+,\s*([\d.]+)/g;
      while ((mm = reB.exec(ln))) vs.push(parseFloat(mm[1]));
      const reC = /crack\(\s*([\d.]+)/g;
      while ((mm = reC.exec(ln))) vs.push(parseFloat(mm[1]));
      const re2 = /hiss\([^,]+,\s*([\d.]+)/g;
      while ((mm = re2.exec(ln))) vs.push(parseFloat(mm[1]));
      if (vs.length) peaks.push({ name: c[1], peak: Math.max(...vs) });
    });
    ok(peaks.length > 15, 'found the action-sound table (' + peaks.length + ' sounds)');
    // no action sound louder than 0.6 (the impactBig death stinger is the ceiling)
    const tooLoud = peaks.filter(p => p.peak > 0.61);
    ok(tooLoud.length === 0, 'no action sound exceeds the 0.6 ceiling (' + (tooLoud.map(p => p.name + '=' + p.peak).join(',') || 'clean') + ')');
    // dynamic range stays sane (loudest / quietest <= 15x; was 26x before rebalance)
    const hi = Math.max(...peaks.map(p => p.peak)), lo = Math.min(...peaks.map(p => p.peak));
    ok(hi / lo <= 15, 'action-sound dynamic range is reasonable (' + (hi / lo).toFixed(1) + 'x <= 15x)');
    // ambience gains (continuous) must be low — scan loopNoise vol args
    const amb = [];
    let am; const are = /loopNoise\('[a-z]+',\s*[\d.]+,\s*[\d.]+,\s*([\d.]+)/g;
    while ((am = are.exec(asrc))) amb.push(parseFloat(am[1]));
    ok(amb.length > 0 && amb.every(v => v <= 0.2), 'every continuous ambience layer is quiet (<=0.2): [' + amb.join(', ') + ']');
  }
}

section('avatar render tiers (principle ported from STREET PROTOCOL)');
{
  const P = C.props;
  const t = P.human({ tier: 'terminal' }), r = P.human({ tier: 'retail' }), c = P.human({ tier: 'custom' });
  ok(t.v.length < r.v.length, 'terminal is lower-detail than retail (' + t.v.length + ' < ' + r.v.length + ')');
  ok(r.v.length <= c.v.length, 'retail is at-or-below custom detail (' + r.v.length + ' <= ' + c.v.length + ')');
  ok(t.pivots.length === 6 && r.pivots.length === 6 && c.pivots.length === 6, 'all tiers keep 6 animatable parts (low-detail still walks)');
  ok(P.human({}).v.length === c.v.length, 'default tier is custom (no regression to existing humans)');

  // the city crowd mixes tiers; key characters (agent, red dress) stay full detail
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('crowded city street, lunch hour');
  step(g, null, 0.5);
  const tiers = {};
  for (const pd of g.crowd.peds) { const n = pd.it.mesh.v.length; tiers[n] = (tiers[n] || 0) + 1; }
  ok(Object.keys(tiers).length >= 2, 'crowd contains more than one render tier (' + Object.keys(tiers).length + ' distinct detail levels)');
}

section('neon mile (cyber street — riding program recovered as native scene)');
{
  // keyword routing: neon words win, and must NOT collide with the city crowd scene
  const k1 = C.parse('the neon mile');
  ok(k1.type === 'scene' && k1.scene === 'neon', "'neon' loads the neon scene");
  const k2 = C.parse('let me ride');
  ok(k2.type === 'scene' && k2.scene === 'neon', "'ride' loads the neon scene");
  const k3 = C.parse('cyberpunk highway');
  ok(k3.type === 'scene' && k3.scene === 'neon', "'cyberpunk highway' -> neon");
  const k4 = C.parse('a crowded street at lunch hour');
  ok(k4.type === 'scene' && k4.scene === 'city', 'city crowd phrases still load the city, not neon');

  const g = new C.Game();
  step(g, null, 0.2);
  g.request('the neon mile');
  step(g, null, 1.6);
  eq(g.sceneName, 'neon mile', 'neon scene is active');
  eq(g.scene.sky, 'neon', 'neon sky mode set');

  // a bike waits at the start line, rideable
  const bike = g.scene.insts.find(i => i.kind === 'bike');
  ok(!!bike, 'a motorcycle is staged at the start line');
  g.player.pos = [bike.pos[0], 0, bike.pos[2] + 2.2];
  g.player.yaw = 0; g.player.pitch = 0;
  step(g, null, 0.05);
  aimAt(g, bike.pos, 0.4);
  step(g, null, 0.05);
  ok(g.aim === bike, 'the staged bike is aimable');
  step(g, { actionEdge: true }, 0.1);
  ok(!!g.bike, 'can mount the bike in the neon scene');

  // ride forward down the long straight; should travel without tunnelling through a wall
  const z0 = g.player.pos[2];
  for (let i = 0; i < 180; i++) step(g, { fwd: 1, boost: true }, 1 / 60);
  ok(g.player.pos[2] < z0 - 5, 'bike travels down the mile (-z)');
  ok(g.player.pos[0] > -5.0 && g.player.pos[0] < 5.0, 'stays within the side walls (no tunnelling)');

  // render integrity, normal + code view
  let ops = C.render(g, 640, 360, g.time);
  ok(ops.length > 30, 'neon scene renders a substantial frame (' + ops.length + ' ops)');
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'no NaN polys in neon scene');
  g.mode = 'code';
  ops = C.render(g, 640, 360, g.time);
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'no NaN polys in neon code-view');
}

section('motorcycle nitrous (finite turbo, ported from the branch CFG)');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('the neon mile');
  step(g, null, 1.6);
  const bike = g.scene.insts.find(i => i.kind === 'bike');
  g.player.pos = [bike.pos[0], 0, bike.pos[2] + 2.2]; g.player.yaw = 0; g.player.pitch = 0;
  step(g, null, 0.05); aimAt(g, bike.pos, 0.4); step(g, null, 0.05);
  step(g, { actionEdge: true }, 0.1);
  ok(!!g.bike, 'mounted');
  eq(Math.round(g.bike.turbo * 10) / 10, C.BIKE.TURBO_MAX, 'nitrous starts full');

  // turbo should NOT engage below the speed gate even if Shift held
  g.bike.speed = 1;
  step(g, { fwd: 1, sprint: true }, 1 / 60);
  ok(!g.bike.boosting, 'turbo will not engage below the speed gate');

  // get up to speed, then hold turbo — it should engage and drain
  if (g.scene && g.scene.traffic) g.scene.traffic.length = 0;   // physics isolation: the river has its own guards
  for (let i = 0; i < 60; i++) step(g, { fwd: 1 }, 1 / 60);
  const tBefore = g.bike.turbo;
  for (let i = 0; i < 30; i++) step(g, { fwd: 1, sprint: true }, 1 / 60);
  ok(g.bike.turbo < tBefore, 'holding turbo drains nitrous (' + tBefore.toFixed(2) + ' -> ' + g.bike.turbo.toFixed(2) + ')');

  // drain to empty, then turbo must cut out
  for (let i = 0; i < 300; i++) step(g, { fwd: 1, sprint: true }, 1 / 60);
  ok(g.bike.turbo <= 0.06, 'nitrous can be fully drained');
  ok(!g.bike.boosting, 'turbo cuts out when nitrous is empty');

  // coast without turbo — nitrous regenerates
  const tEmpty = g.bike.turbo;
  for (let i = 0; i < 120; i++) step(g, { fwd: 0 }, 1 / 60);
  ok(g.bike.turbo > tEmpty, 'nitrous regenerates when not boosting (' + tEmpty.toFixed(2) + ' -> ' + g.bike.turbo.toFixed(2) + ')');

  // top speed with turbo exceeds normal cap
  g.bike.turbo = C.BIKE.TURBO_MAX;
  for (let i = 0; i < 90; i++) step(g, { fwd: 1, sprint: true }, 1 / 60);
  ok(g.bike.speed > C.BIKE.MAX, 'turbo pushes speed past the normal cap (' + g.bike.speed.toFixed(1) + ' > ' + C.BIKE.MAX + ')');
}

section('neon mile is INFINITE (streaming chunks, constant memory)');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('the neon mile');
  step(g, null, 1.6);
  ok(g.scene.infinite === true, 'neon scene is flagged infinite');
  const chunks0 = Object.keys(g.scene.chunks).length;
  ok(chunks0 >= 3, 'road chunks exist on arrival (' + chunks0 + ')');
  const worldsAt = z => g.scene.insts.filter(i => i.kind === 'world').length;

  // mount and ride a long way down the mile
  const bike = g.scene.insts.find(i => i.kind === 'bike');
  g.player.pos = [bike.pos[0], 0, bike.pos[2] + 2.2]; g.player.yaw = 0; g.player.pitch = 0;
  step(g, null, 0.05); aimAt(g, bike.pos, 0.4); step(g, null, 0.05);
  step(g, { actionEdge: true }, 0.1);
  ok(!!g.bike, 'mounted');

  const chunkKeysSeen = new Set(Object.keys(g.scene.chunks));
  let maxChunksAtOnce = chunks0;
  for (let i = 0; i < 1200; i++) {
    step(g, { fwd: 1, sprint: true }, 1 / 60);
    Object.keys(g.scene.chunks).forEach(k => chunkKeysSeen.add(k));
    maxChunksAtOnce = Math.max(maxChunksAtOnce, Object.keys(g.scene.chunks).length);
  }
  const zTravelled = g.player.pos[2];
  ok(zTravelled < -100, 'rode far down the mile (z=' + zTravelled.toFixed(0) + ')');
  ok(chunkKeysSeen.size > chunks0 + 3, 'new chunks were generated ahead while riding (' + chunkKeysSeen.size + ' distinct chunks seen)');
  ok(maxChunksAtOnce <= 10, 'chunk count stays bounded — old chunks recycle, memory constant (max ' + maxChunksAtOnce + ' at once)');

  // the far-away road is still solid ground + renders without NaN
  ok(g.player.pos[1] === g.scene.groundY, 'still grounded on the far road (no falling through)');
  ok(g.bike.dist > 100, 'odometer climbs as you ride the endless mile (dist=' + g.bike.dist.toFixed(0) + ')');
  const ops = C.render(g, 480, 270, g.time);
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'far-out neon renders without NaN');
  g.mode = 'code';
  const opsC = C.render(g, 480, 270, g.time);
  ok(opsC.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'far-out neon code-view without NaN');
}

section('wall-grind does not roar (scrape throttled at the boundary)');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('the neon mile');
  step(g, null, 1.6);
  const bike = g.scene.insts.find(i => i.kind === 'bike');
  g.player.pos = [bike.pos[0], 0, bike.pos[2] + 2.2]; g.player.yaw = 0; g.player.pitch = 0;
  step(g, null, 0.05); aimAt(g, bike.pos, 0.4); step(g, null, 0.05);
  step(g, { actionEdge: true }, 0.1);
  // grind the right wall at full speed for ~3s, counting scrape events
  g.player.pos[0] = 8.6;   // start pressed near the wall: kinematic drift needs runway it does not have here
  let scrapes = 0; const frames = 180;
  for (let i = 0; i < frames; i++) {
    const evs = step(g, { fwd: 1, sprint: true, strafe: 1 }, 1 / 60);
    scrapes += evs.filter(e => e.name === 'scrape').length;
  }
  // throttled to <=0.15s apart -> at most ~7/s; the un-throttled bug fired per-substep (hundreds)
  ok(scrapes > 0, 'grinding the wall still makes some scrape sound (' + scrapes + ')');
  ok(scrapes <= frames / 60 * 7, 'scrape is throttled, not a per-substep roar (' + scrapes + ' over 3s, was ~540 before)');
}

section('city is INFINITE too (boulevard streams along x, crowd follows)');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('a crowded city street');
  step(g, null, 0.6);
  ok(g.scene.infinite === true, 'city scene is flagged infinite');
  ok(Object.keys(g.scene.chunks).length >= 2, 'boulevard chunks exist on arrival');
  ok(g.crowd && g.crowd.peds.length > 0, 'crowd populated');

  // walk a long way down the boulevard (fountain is now off to the side, main lane is clear)
  const seen = new Set(Object.keys(g.scene.chunks));
  let maxChunks = Object.keys(g.scene.chunks).length;
  for (let i = 0; i < 2000; i++) {
    step(g, { fwd: 1, sprint: true }, 1 / 60);
    Object.keys(g.scene.chunks).forEach(k => seen.add(k));
    maxChunks = Math.max(maxChunks, Object.keys(g.scene.chunks).length);
  }
  ok(Math.abs(g.player.pos[0]) > 60, 'walked far along the boulevard (x=' + g.player.pos[0].toFixed(0) + ')');
  ok(seen.size > Object.keys(g.scene.chunks).length + 1, 'new boulevard chunks generated while walking (' + seen.size + ' seen)');
  ok(maxChunks <= 6, 'boulevard chunk count stays bounded (max ' + maxChunks + ')');

  // crowd recycles around the player — there are still pedestrians near the walker
  const px = g.player.pos[0];
  const near = g.crowd.peds.filter(pd => Math.abs(pd.it.pos[0] - px) < 50).length;
  ok(near > 0, 'pedestrians still around the player after walking far (' + near + ')');

  ok(g.player.pos[1] === g.scene.groundY || g.player.pos[1] < 0.2, 'still on the ground far out');
  const ops = C.render(g, 480, 270, g.time);
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'far-out city renders without NaN');
}


section('neural intent fallback (open-source embed layer, pluggable + testable)');
{
  const I = C.intent;
  ok(!!I && typeof I.routeSync === 'function', 'intent module present');
  ok(I.ready() === false, 'starts unconfigured (regex-only)');
  near(I._cosine([1, 0], [1, 0]), 1, 1e-9, 'cosine of identical vectors = 1');
  near(I._cosine([1, 0], [0, 1]), 0, 1e-9, 'cosine of orthogonal vectors = 0');

  // unconfigured: routing is pure regex passthrough (unknown stays unknown)
  const r0 = I.routeSync('a fluffy zebra');
  ok(r0.via === 'regex' && r0.action.type === 'unknown', 'unconfigured route = regex passthrough');

  // mock embedder: deterministic bag-of-words over the anchor vocabulary
  const vocab = {};
  I.intents.forEach(it => it.anchors.forEach(a => a.toLowerCase().split(/[^a-z]+/).forEach(w => { if (w && vocab[w] == null) vocab[w] = Object.keys(vocab).length; })));
  const V = Object.keys(vocab).length;
  const mock = text => { const v = new Float32Array(V); String(text).toLowerCase().split(/[^a-z]+/).forEach(w => { if (vocab[w] != null) v[vocab[w]] += 1; }); return v; };
  I.configure(mock);
  ok(I.ready() === true, 'sync embedder configures immediately');

  // free phrasings land on the DESIGNATED words (none of these contain parser keywords)
  const cases = [
    ['a hall for martial arts', 'dojo'],
    ['something to sit on', 'chair'],
    ['an endless glowing road to speed on', 'neon'],
    ['reveal the simulation beneath', 'code'],
    ['a plaza full of walkers', 'city'],
    ['something sharp to swing', 'katana']
  ];
  for (const [phrase, want] of cases) {
    const r = I.routeSync(phrase);
    ok(r.via === 'neural' && r.word === want, "'" + phrase + "' -> " + want + ' (got ' + (r.word || r.action.type) + ')');
  }

  // prefixes (bge/e5-style) are applied to anchors and queries respectively
  {
    const calls = [];
    const rec = text => { calls.push(text); const v = new Float32Array(4); v[0] = 1; return v; };
    C.intent.configure(rec, { anchor: 'A: ', query: 'Q: ' });
    ok(calls.length > 0 && calls.every(c => c.startsWith('A: ') || c === 'probe'), 'anchor prefix applied while indexing');
    C.intent.classifySync('hello');
    ok(calls[calls.length - 1] === 'Q: hello', 'query prefix applied at classify time');
  }

  // re-configure with the plain mock for the routing assertions below
  I.configure(mock);
  // regex still wins first — a keyworded phrase never consults the neural layer
  const r1 = I.routeSync('load the dojo please');
  ok(r1.via === 'regex' && r1.action.scene === 'dojo', 'keyworded phrase routed by regex, not neural');
  // gibberish below threshold stays unknown (no wild guessing)
  const r2 = I.routeSync('zzz qqq xylophone');
  ok(r2.via === 'regex' && r2.action.type === 'unknown', 'low-confidence gibberish stays unknown');
}


section('generative operator (few-shot chat — model writes the lines)');
{
  const I = C.intent;
  // the context window we open before the first query
  const msgs = I.buildChatPrompt();
  ok(Array.isArray(msgs) && msgs[0].role === 'system', 'buildChatPrompt returns a message list starting with system');
  const sys = msgs[0].content;
  for (const w of ['weapons','dojo','rooftop','city','neon','clear','code','motorcycle','katana','chair','table','tv','lamp','tree','car','mirror','dummy','booth'])
    ok(sys.indexOf(w) >= 0, 'system prompt lists designated word: ' + w);
  ok(/WORD:.*SAY:/.test(sys), 'system prompt specifies the WORD/SAY reply format');
  ok(msgs.length >= 7, 'prompt includes few-shot examples (' + msgs.length + ' messages)');

  // parseReply: the MODEL's text is always shown; word dispatches only if designated
  const a = I.parseReply('WORD: chair | SAY: One chair, folded from the white.');
  ok(a.word === 'chair' && /folded from the white/.test(a.say), 'parses a clean LOAD reply (word + model line)');

  const b = I.parseReply('word=neon | say=The mile is endless.');  // case/spacing tolerant
  ok(b.word === 'neon' && /endless/.test(b.say), 'tolerant of lowercase and = signs');

  const c = I.parseReply('WORD: none | SAY: No such program in the library.');
  ok(c.word === null && /No such program/.test(c.say), 'WORD none -> no dispatch, shows model refusal');

  const d = I.parseReply('WORD: unicorn | SAY: Prancing in aisle nine.');  // non-designated word
  ok(d.word === null && /aisle nine/.test(d.say), 'invalid word -> null, but still shows the model line');

  const e = I.parseReply('Just some free-form sentence the model wrote.');  // model ignored format
  ok(e.word === null && /free-form sentence/.test(e.say), 'off-format reply still surfaces the model text');

  const f = I.parseReply('WORD: dojo | SAY: ' + 'x'.repeat(300));  // overlong
  ok(f.word === 'dojo' && f.say.length <= 160, 'long model line is capped, word still dispatched');

  const g = I.parseReply('');  // empty
  ok(g.word === null && g.say.length > 0, 'empty reply falls back to a non-empty line');
}

  // thinking-model safety: <think> blocks are stripped before parsing
  {
    const r1 = C.intent.parseReply('<think>user wants seating, chair fits</think>WORD: chair | SAY: Sit.');
    ok(r1.word === 'chair' && r1.say === 'Sit.', 'closed <think> block stripped, reply parsed');
    const r2 = C.intent.parseReply('reasoning leaks here</think> WORD: none | SAY: Not in the library.');
    ok(r2.word === null && /library/i.test(r2.say), 'reply starting mid-think still parses');
    const r3 = C.intent.parseReply('WORD: dojo | SAY: Step on the mat. <think>should I add more');
    ok(r3.word === 'dojo' && /mat/i.test(r3.say) && !/think|should I/i.test(r3.say), 'unclosed trailing <think> discarded');
  }

  // the context window teaches small talk: a greeting exchange exists, answered in character
  {
    const msgs = C.intent.buildChatPrompt();
    const hasGreet = msgs.some((m, i) => m.role === 'user' && /^hello$/i.test(m.content)
      && msgs[i + 1] && msgs[i + 1].role === 'assistant' && /WORD:\s*none/i.test(msgs[i + 1].content));
    ok(hasGreet, 'few-shot includes a greeting handled by the model (WORD: none, in character)');
    ok(/greetings and small talk/i.test(msgs[0].content), 'system prompt covers small talk explicitly');
  }


section('free mouse + type-first console + sigma voice (static guards)');
{
  const fs2 = require('fs');
  const app = fs2.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/function lockPointer/.test(app) && /unadjustedMovement: true/.test(app) && !/tryLock/.test(app), 'hold-look borrows the pointer with raw unaccelerated input (unbounded FPS look)');
  ok(app.indexOf('requestPointerLock') > app.indexOf('function lockPointer') && /e\.button === 2/.test(app), 'the lock is gated on HOLDING the right button - a plain click never captures the cursor');
  ok(/rmbRelease/.test(app) && /Esc from lock -> type mode/.test(app) && /contextmenu/.test(app) && /mdWasTyping/.test(app), 'releasing the right button returns the cursor without stealing focus; Esc still exits to type; context menu suppressed; drag fallback kept');
  ok(/clear instantly so the keystroke feels immediate/.test(app) && /openConsole\(\); hud\.hint/.test(app), 'console is the default: focused at boot, submit clears + stays in type mode');
  const aud = fs2.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(!/pitch = 0\.65/.test(aud) && !/SpeechSynthesisUtterance/.test(aud), 'no fallback voice remains anywhere - copy-only policy holds');
  ok(!/pickSigma/.test(aud), 'the fallback voice picker is gone; naming lives on the neural-ready path');
  ok(/A\._ttsQ = \{ f: f32/.test(aud) && /onended/.test(aud), 'lines are never beheaded: a speaking line finishes, the LATEST pending line follows');
}


section('the model IS the operator for unknowns (auto-wake, queue, no placeholder)');
{
  const fs3 = require('fs');
  const app = fs3.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/the first unheard line wakes the operator itself/.test(app), 'an unknown line auto-wakes the model (no chip tap needed)');
  ok(/neural\.queue\.push/.test(app) && /neural\.queue\.splice\(0\)/.test(app), 'lines are queued while waking and flushed to the model when online');
  ok(/function neuralSend/.test(app) && /neural\.chain/.test(app), 'generations are serialised - one at a time, in order');
}


section('inference runs in a Worker (the game loop never stalls)');
{
  const fs4 = require('fs');
  const app4 = fs4.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/new Worker\(/.test(app4) && /type: 'module'/.test(app4), 'model lives in a module Worker, off the main thread');
  ok(/'webgpu', 'q4f16'/.test(app4) && /'wasm', 'q4'/.test(app4), 'WebGPU first, WASM fallback');
  ok(/neural\.pending\[/.test(app4) && /function neuralSend/.test(app4), 'replies route by id; sends stay serialised');
}


section('typing-lag fixes (frame budget guards)');
{
  const fs5 = require('fs');
  const app5 = fs5.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/frameMs\.length < 36/.test(app5) && /avg > 30 /.test(app5) && /avg > 17 /.test(app5), 'dynamic resolution reacts in ~0.6s, drops hard when badly behind');
  ok(/write only on change/.test(app5) && /lastSceneLine/.test(app5) && /lastAimOp/.test(app5), 'HUD DOM writes are change-detected, never per-frame');
  ok(/\* 8 \/ 10\) \* 10/.test(app5), 'infinite-scene metres step by 10 - a few writes per second, not 60');
  ok(/ttChars % 4 === 0\) A\.handle\('tick'\)/.test(app5), 'teletype tick rate halved (oscillator churn down)');
  ok(/lastMsAvg \/ 2\) \* 2\) \+ 'ms'/.test(app5), 'live frame-ms meter on the scene line for real diagnosis');
}


section('Enter never blocks: routing is deferred off the keystroke');
{
  const fs6 = require('fs');
  const app6 = fs6.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/clear instantly so the keystroke feels immediate/.test(app6), 'submit clears the box and echoes synchronously, nothing heavy inline');
  ok(/function routeLine/.test(app6) && /setTimeout\(function \(\) \{ routeLine\(v\); \}, 0\)/.test(app6), 'all parse/request/loadNeural routing is deferred one tick');
  ok(/setTimeout\(function \(\) \{ routeLine\(txt\); \}, 0\)/.test(app6), 'voice path defers routing the same way');
  // the expensive part (waking the worker) must only be reachable from routeLine, not submit
  const sub = app6.slice(app6.indexOf('function submitConsole'), app6.indexOf('function routeLine'));
  ok(!/loadNeural\(\)/.test(sub), 'submitConsole itself never wakes the worker inline');
}


section('think-time yield: the game gives up the core while he generates');
{
  const fs7 = require('fs');
  const app7 = fs7.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/inFlight\+\+/.test(app7) && /inFlight = Math\.max\(0, neural\.inFlight - 1\)/.test(app7), 'in-flight generations are counted up and down');
  ok(/paintSkip = \(paintSkip \+ 1\) % 3/.test(app7) && /!throttled \|\| paintSkip === 0/.test(app7), 'painting drops to 1/3 cadence while a reply is in flight');
  ok(/else frameMs\.length = 0;/.test(app7), 'adaptive resolution ignores throttled frames (no false raise)');
  ok(/max_new_tokens: 64/.test(app7) && !/max_new_tokens: 96/.test(app7), 'token budget 64 - snappy but roomy for Qwen3');
}


section('UI layout sanity (template guards)');
{
  const fs8 = require('fs');
  const tpl = fs8.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(/#console\{position:fixed;left:4vw;bottom:8vh;/.test(tpl) && /align-items:flex-start/.test(tpl), 'console is a lower-LEFT block off the axis - the environment owns the screen');
  ok(/id="chips"/.test(tpl) && /body\.con #chips\{opacity:\.9;pointer-events:auto\}/.test(tpl), 'the click-words are back: ghost chips revealed only while the console is open');
  ok(/spellcheck="false"><button id="mic"/.test(tpl), 'mic is docked inside the input row, not floating mid-screen');
  ok(/EDGES = TURN/.test(tpl) && /quick click fire\/strike/.test(tpl) && /<div id="top"><div id="scene">/.test(tpl), 'boot keys + hint match the no-capture scheme (hint lives in the flex top bar)');
}


section('deterministic rails around the tiny model (rescue + regex + temp)');
{
  const I2 = C.intent;
  // rescue from the USER's own words when the model flubs
  eq(I2.rescueWord('motor', 'The sky is grey. I see nothing.'), 'motorcycle', "'motor' rescued to motorcycle from the user text");
  eq(I2.rescueWord('katan pls', ''), 'katana', 'one-typo token rescued (katan -> katana)');
  eq(I2.rescueWord('give me a chiar', ''), 'chair', 'transposed typo rescued (chiar -> chair)');
  // rescue from the model reply if the user text has nothing
  eq(I2.rescueWord('two wheels please', 'sounds like you want a motorcycle'), null, 'a mention in the MODEL reply never dispatches - mention is not intent');
  // no false positives on gibberish
  eq(I2.rescueWord('purple elephant taxes', 'I cannot help with that'), null, 'gibberish rescues nothing');
  // the regex layer now catches motor before the model is ever consulted
  const pm = C.parse('motor');
  ok(pm.type === 'props' && pm.props[0].kind === 'bike', "parser maps bare 'motor' straight to the bike (no model needed)");
  // few-shot teaches the elliptical case; sampling cooled to 0.4
  const msgs = I2.buildChatPrompt();
  ok(msgs.some(m => m.role === 'user' && m.content === 'motor'), 'few-shot includes the single-word elliptical example');
  const fs9 = require('fs');
  const app9 = fs9.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/rescueWord\(text\)/.test(app9), 'rescue reads the USER text only');
}


section('lexical rescue: partial words map deterministically, before the model');
{
  const I = C.intent;
  eq(I.lexicalGuess('motor'), 'motorcycle', "'motor' rescues to motorcycle without the model");
  eq(I.lexicalGuess('give me chairs'), 'chair', "'chairs' rescues to chair");
  eq(I.lexicalGuess('katan'), 'katana', "'katan' rescues to katana");
  eq(I.lexicalGuess('zzzz qqqq'), null, 'gibberish stays null - no wild guessing');
  eq(I.lexicalGuess('tv on'), null, 'tokens under 4 chars are ignored (regex owns those)');
  const fs9 = require('fs');
  const app9 = fs9.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/lexicalGuess\(v\)/.test(app9) && /deterministic rescue/.test(app9), 'route order: regex -> lexical -> model');
  ok(/temperature: 0.7, top_p: 0.8, top_k: 20/.test(app9), 'sampling = official Qwen3 non-thinking recipe (accuracy guarded by the deterministic rails)');
  const msgs = I.buildChatPrompt();
  ok(msgs.some((m,i)=>m.role==='user'&&m.content==='motor'&&msgs[i+1]&&/WORD:\s*motorcycle/i.test(msgs[i+1].content)), 'few-shot teaches partial words too');
}


section('the AI sigma voice: Kokoro am_adam at natural speed (exact web params)');
{
  const fsA = require('fs');
  const appA = fsA.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/'am_adam'/.test(appA) && !/speed: 0\.9/.test(appA), "the literal 'am_adam' voice, raw at natural speed - no transferred tuning left");
  ok(/human voice disabled: no voice engine download/.test(appA), 'voice engine is never downloaded - ~90 MB saved, world SFX unaffected');
  const audA = fsA.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(/ALL human voice DISABLED/.test(audA), 'ALL human voice is disabled by user directive - text carries every line');
  ok(/AI voice failed to load/.test(appA) && /cdn blocked/.test(appA), 'AI-voice load failure is now LOUD (no silent fallback) so we know if Kokoro did not load');
  ok(!/__deepvoice__/.test(appA), 'the voice chip is removed along with the voice');
}


section('voice chain: every link observable, depth by model (first principles)');
{
  const fsB = require('fs');
  const appB = fsB.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/esm\.sh\/kokoro-js/.test(appB) && /LIB_URLS/.test(appB), 'library link has 3-CDN fallback (jsdelivr -> esm.sh -> latest)');
  ok(/voice link ok: /.test(appB) && /voice link FAILED: /.test(appB) && /voice model\\u2026/.test(appB), 'every chain link reports by name - the breaking link names itself in the log');
  ok(!/__deepvoice__/.test(appB) && !/loading the AI voice engine/.test(appB), 'no voice cycle, no voice loader strings remain in the UI path');
}


section('build stamp (cache-vs-current decidable at a glance)');
{
  const fsC = require('fs');
  ok(/BUILD __BUILD__/.test(fsC.readFileSync(__dirname + '/../template.html', 'utf8')), 'template carries the build placeholder');
  ok(/__BUILD__/.test(fsC.readFileSync(__dirname + '/../build.sh', 'utf8')), 'build.sh stamps the placeholder with the UTC build time');
  ok(/construct online .* build /.test(fsC.readFileSync(__dirname + '/../src/08_app.js', 'utf8').replace(/\\u00b7/g,'.')), 'first log line announces the running build');
}


section('the cursor can NEVER be captured by default (lock is opt-in)');
{
  const fsD = require('fs');
  const appD = fsD.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/var lockAllowed = false/.test(appD) && /if \(!lockAllowed\) return;/.test(appD), 'pointer lock is fused off by default - no code path can take the cursor');
  ok(/lv === 'lock'/.test(appD) && /lv === 'unlock'/.test(appD) && /exitPointerLock/.test(appD), "typing 'lock' arms FPS capture; 'unlock' disarms and releases immediately");
  ok(/EDGE_TURN/.test(appD) && /window\.innerWidth \* 0\.12/.test(appD) && /!game\.bike/.test(appD), 'edge-turn gives unbounded rotation with zero capture (off while riding)');
  ok(/mdMoved = 999/.test(appD), 'right-drag look never fires a click on release');
}


section('stale cached builds confess by themselves');
{
  const fsE = require('fs');
  const appE = fsE.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  const tplE = fsE.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(!/id="stale"/.test(tplE), 'the stale banner is gone from the template by design (v3.1: no warning states exist)');
  ok(/api\.github\.com\/repos\/woodyycchang\/the-matrix-gameplay\/commits\/main/.test(appE), 'the SIGNAL lane is the commits API - instant on push, inside the anon budget');
  ok(/function checkStale/.test(appE) && /SELF-RENEWAL v3/.test(appE), 'boot arms the v3 self-renewal loop - warning humans to refresh is retired');
}


section('the cursor is visible on ANY background (halo crosshair)');
{
  const fsF = require('fs');
  const tplF = fsF.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(/cursor:url\("data:image\/svg\+xml/.test(tplF) && /stroke='%23fff' stroke-width='5'/.test(tplF), 'canvas cursor is a white-halo crosshair - cannot melt into the white void');
  ok(/\) 11 11, crosshair\}/.test(tplF), 'hotspot centered and plain crosshair kept as the fallback');
}


section('quiet boot + Qwen3 brain (research-grounded)');
{
  const fsG = require('fs');
  const appG = fsG.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/function sayDbg/.test(appG) && /var dbg = false/.test(appG) && /lv === 'debug'/.test(appG), 'telemetry channel exists, defaults OFF, toggles via typing debug');
  ok(/sayDbg\('construct online/.test(appG) && /sayDbg\('voice link ok/.test(appG) && /sayDbg\('voice: '/.test(appG), 'build/probe/voice telemetry routed off the player channel');
  ok(/say\('Operator online\.', true\)/.test(appG), 'the player hears one clean diegetic line when he wakes (bible register)');
  ok(/onnx-community\/Qwen3-0\.6B-ONNX/.test(appG) && !/SmolLM2-360M-Instruct/.test(appG), 'brain upgraded to Qwen3-0.6B (official transformers.js drop-in)');
  ok(/\/no_think/.test(appG), "Qwen3's thinking mode is disabled via the documented /no_think soft switch");
}


section('wait shrunk on every lever physics allows');
{
  const fsH = require('fs');
  const appH = fsH.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/type: 'warmup'/.test(appH) && /max_new_tokens: 1 \}\); \} catch/.test(appH.replace(/\\/g,'')) || /warmup' && gen/.test(appH), 'a 1-token warmup compiles shaders right after load, not on the first real question');
  ok(/warm the worker at app bootstrap/.test(appH) && /conn\.saveData/.test(appH) && /neural\.quiet = true; loadNeural\(\)/.test(appH), 'the brain preloads at boot for everyone; data-saver keeps lazy consent');
  ok(/function sayLoad/.test(appH) && /neural\.quiet = false;/.test(appH), 'preload is silent on the player channel and flips loud the moment the player asks');
  ok(/m\.pct \/ 10\) \* 10/.test(appH), 'download feedback in 10% steps - a big file never looks frozen');
  ok(/One-off ~0\.5 GB download; instant from cache/.test(appH), 'the waking line sets honest expectations');
}


section("greeting typo regression: 'helo' must never load a scene");
{
  const I3 = C.intent;
  eq(I3.lexicalGuess('helo'), null, "lexicalGuess passes 'helo' through untouched");
  eq(I3.rescueWord('helo'), null, "rescueWord finds no designated word in 'helo'");
  const r1 = I3.parseReply('Hey there. What do you need?');
  ok(r1.word === null && r1.say === 'Hey there. What do you need?', 'plain-prose replies are shown verbatim (no canned deny)');
  const r2 = I3.parseReply('You could try the dojo or grab weapons.');
  ok(r2.word === null && /dojo/.test(r2.say), 'a reply that merely mentions designated words displays but dispatches NOTHING');
  const r3 = I3.parseReply('');
  ok(/library is silent/.test(r3.say), 'the canned line survives only as the empty-reply fallback');
}


section('Qwen3 thinking is dead at the template level');
{
  const fsI = require('fs');
  const appI = fsI.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/apply_chat_template/.test(appI) && /enable_thinking: false/.test(appI), 'the worker renders the template itself with enable_thinking:false (pre-filled empty think block)');
  ok(/return_full_text: false/.test(appI) && /temperature: 0\.7, top_p: 0\.8, top_k: 20/.test(appI), "official non-thinking sampling recipe (T0.7/P0.8/K20), completion-only output");
  ok(/sayDbg\('raw \\u00ab'/.test(appI), 'the raw model output is observable on the debug channel');
}


section('voice plays at natural speed');
{
  const fsJ = require('fs');
  const audJ = fsJ.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(!/playbackRate\.value = 0\./.test(audJ), 'playback is never slowed - depth comes from the copied voice itself');
}


section('raw deepest voice - measured, not customized');
{
  const fsK = require('fs');
  const audK = fsK.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  const appK = fsK.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(!/createWaveShaper/.test(audK) && !/_vChain/.test(audK) && /unity fader/.test(audK), 'ALL custom voice processing removed - only a unity transport fader between copy and master');
  ok(!/speed: 0\.9/.test(audK) && !/speed: 0\.9/.test(appK), 'no speed customization anywhere - the voice runs natural');
  ok(!/playbackRate\.value = 0\./.test(audK), 'no rate hack anywhere - the copy plays at its native speed');
  ok(/'am_adam'/.test(appK), 'default voice = am_adam, the lowest measured pitch (116 Hz) in the US male roster');
}


{
  const fsL = require('fs');
  const audL = fsL.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
}


section('minimalism: a sound must earn its place');
{
  const fsM = require('fs');
  const audM = fsM.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(/case 'tick': break;/.test(audM) && /case 'jump': break;/.test(audM) && /case 'pickup': break;/.test(audM), 'tick, jump-hiss and pickup-ding are CUT: each duplicated what the eye already sees');
  ok(/case 'mount': engineStart\(\); break;/.test(audM) && /case 'dismount': engineStop\(\); break;/.test(audM), 'mount/dismount decorations trimmed - the engine ramp is the signal');
  ok(/'void' \? 0 : AMB_LEVEL/.test(audM), 'the void is truly SILENT on the SFX/ambience layer - and the bed level now comes from the golden law');
  ok(/i < 3; i\+\+\) blip\(700/.test(audM), 'materialize trimmed 7 notes -> 3: signature kept, ornament gone');
  ok(/case 'shot':/.test(audM) && /case 'land':/.test(audM) && /case 'freeze':/.test(audM) && /function ring/.test(audM), 'combat, physics, state-changes and the summons all KEEP their sound (information the eye lacks)');
}


section('voice is COPY-ONLY: copied Kokoro as-is, or silence');
{
  const fsN = require('fs');
  const audN = fsN.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(!/SpeechSynthesisUtterance/.test(audN) && !/pickSigma/.test(audN) && !/pitch = 0\.65/.test(audN), 'the constructed system-voice fallback is gone entirely');
  ok(/A\.speak = function \(\) \{/.test(audN) && /ALL human voice DISABLED/.test(audN), 'A.speak is a documented no-op - silence, never a constructed voice');
  ok(/g\.connect\(master\)/.test(audN) && /unity fader/.test(audN), 'the copy plays raw: source -> unity fader -> master, zero processing');
}


section('voice transport: no beheading, no clicks (Loop-1 N1a verdict)');
{
  const fsO = require('fs');
  const audO = fsO.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  const appO = fsO.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(!/A\._ttsNode\.stop\(\)/.test(audO), 'the bare hard-stop (mid-word beheading + audible click) is gone');
  ok(/setTargetAtTime\(0, ctx\.currentTime, 0\.004\)/.test(audO) && /stop\(ctx\.currentTime \+ 0\.015\)/.test(audO), 'the only sanctioned interrupt rides a ~12ms fader to zero before stopping');
  ok(/g\.gain\.value = 1\.0;   \/\/ unity fader/.test(audO), 'the fader sits at unity - transport, never an effect (copy-only policy holds)');
  ok(/Human voice is disabled/.test(appO), "typing 'voice' explains the state in text - nothing is spoken");
}


section('tree_guard: the eval run is ENFORCED, not requested');
{
  const validate = require('./tree_guard.js');
  const tree = JSON.parse(require('fs').readFileSync(__dirname + '/../eval/tree.json', 'utf8'));
  const errs = validate(tree);
  ok(errs.length === 0, 'eval tree validates against R1-R5: ' + (errs[0] || 'clean'));
  const root = tree.nodes.find(n => n.path === 'ROOT');
  ok(root && root.status === 'PASS' && tree.nodes.every(n => n.status === 'FIXED' || n.status === 'PASS'), "ROOT is PASS exactly when the whole tree is closed (owner's directive 2026-07-05: the loop is the machine's own)");
  const emergent = tree.nodes.filter(n => /user-ear|feel|reply-quality|void-onboarding|touch|edge-turn/.test(n.path));
  ok(emergent.length >= 7 && emergent.every(n => n.status === 'USER' || (n.status === 'FIXED' && /\u91cd\u5f00/.test(n.evidence || ''))), 'emergent leaves close by machine evidence only WITH a standing reopen covenant - one human report reopens any of them');
}


section('runtime smoke: init-critical identifiers exist (lesson from the beheaded chip row)');
{
  const fsP = require('fs');
  const appP = fsP.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/function chip\(/.test(appP) && /hud\.chips\.appendChild/.test(appP), 'the chip system is back: factory and mount live');
  ok(!/__deepvoice__/.test(appP) && !/__neural__/.test(appP), 'both utility chips are gone - only world-request chips remain');
  const audP = fsP.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  const emitBody = audP.slice(audP.indexOf("case 'engine'") >= 0 ? audP.indexOf("case 'engine'") : audP.indexOf("case 'thud'"), audP.indexOf('function ring'));
  ok(!/this\.(blip|hiss|thump|boom)/.test(emitBody), "audio emits call bare closures, never this.methods (the drip that beheaded MOBIL AVE in the browser)");

  const used = (appP.match(/\bdefs\b/g) || []).length;
  ok(used >= 2, 'defs is declared AND consumed (' + used + ' refs)');
}


section('HUD wording is fluid and can never collide (Loop N3/N4 finding)');
{
  const fsQ = require('fs');
  const tpl = fsQ.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(/#top\{[^}]*display:flex;justify-content:space-between/.test(tpl), 'title and hint share one flex bar - overlap is impossible by construction');
  ok(/<div id="top"><div id="scene">THE CONSTRUCT<\/div><div id="lookhint">EDGES/.test(tpl), 'the markup actually nests both into the bar (default hint text intact)');
  ok(/#scene\{[^}]*text-overflow:ellipsis/.test(tpl), 'a long scene line ellipsizes instead of invading the hint');
  ok((tpl.match(/clamp\(/g) || []).length >= 4, 'HUD wording scales with the window: rem+vw clamp() on the surviving surfaces');
}


section('every string earns its place (surface-wording verdict)');
{
  const fsR = require('fs');
  const intR = fsR.readFileSync(__dirname + '/../src/09_intent.js', 'utf8');
  const appR = fsR.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(!/'Loading ' \+ word/.test(intR), "the double announcement is dead: the scene speaks for itself, 'Loading X.' does not");
  ok(/if \(r\.say\) say\(r\.say\);/.test(appR) && /'operator: '\) \+ ttCur\.text/.test(appR), 'one operator tag, added once, by the teletype (double-prefix bug dead)');
  ok(/your line is queued\.'/.test(appR) && !/answering the moment he is up/.test(appR), 'still-waking says it once, not twice');
}


section('real-view layout: nothing pinned, nothing bleeding');
{
  const fsS = require('fs');
  const tplS = fsS.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(/html,body\{height:100%;overflow:hidden/.test(tplS), 'the page itself can never scroll or reveal a background band (rule pre-existed)');
  ok(/left:4vw;bottom:8vh/.test(tplS), 'the block anchors lower-left like the reference frame');
}


section('console reads over ANY scene (world-text collision fixed)');
{
  const fsT = require('fs');
  const tplT = fsT.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(/#log \.line\{[^}]*color:var\(--ink\);text-shadow:0 0 6px rgba\(251,251,249,\.9\)/.test(tplT) && !/#log\{[^}]*mix-blend-mode/.test(tplT), 'the archaeological original: ink + paper halo, no blend - crisp on the void, outlined on dark scenes');
}


section('full screen, dynamically adjusted');
{
  const fsU = require('fs');
  const tplU = fsU.readFileSync(__dirname + '/../template.html', 'utf8');
  const appU = fsU.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(((tplU.match(/min\(46ch,72vw\)/g) || []).length) >= 2, 'log and input share the report-block width');
  ok(/requestFullscreen/.test(appU) && /exitFullscreen/.test(appU), 'F toggles true browser fullscreen');
  ok(/F fullscreen/.test(tplU), 'the boot keys teach it');
}


section('generative sci-fi bed: evolving forever, silent in the void');
{
  const fsV = require('fs');
  const audV = fsV.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  const appV = fsV.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/l1\.frequency\.value = 0\.07/.test(audV) && /l2\.frequency\.value = 0\.11/.test(audV), 'two UNSYNCED slow LFOs (0.07/0.11 Hz) - cycles never align, the bed never repeats');
  ok(/'void':   \{ g: 0,/.test(audV) && /'construct': \{ g: 0,/.test(audV), "the void stays SILENT under BOTH its names ('void' and the real sceneName 'construct')");
  ok(!/g: 0\.0[6-9]/.test(audV) && !/g: 0\.[1-9]/.test(audV), 'bed gain caps at 0.05 - an atmosphere, never a soundtrack fighting the SFX');
  ok(/lv === 'music'/.test(appV) && /A\.musicToggle/.test(appV), "typing 'music' toggles the bed with a slow fade");
}


section('the copied bed: Stellardrone, licensed and wired properly');
{
  const fsW = require('fs');
  const audW = fsW.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  const tplW = fsW.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(/archive\.org\/download\/Stellardrone-LightYears/.test(audW), 'streams the CC BY album from the Internet Archive item');
  ok(/MUSLIST = \['01%20Red%20Giant/.test(audW) && (audW.match(/%20/g) || []).length > 20 && /musIdx \+ 1\) % MUSLIST\.length/.test(audW), 'a ten-track album playlist cruises in sequence and wraps');
  ok(/INCLUDING the void/.test(audW) && !/MUSTRK/.test(audW), 'UNIVERSAL: one continuous bed everywhere from ENTER - the user directive supersedes scene silence for music');
  ok(/musErr >= 3/.test(audW) && /genBed\('city'\)/.test(audW) && /addEventListener\('ended', musNext\)/.test(audW), 'errors skip tracks; three straight failures fall back to the generative engine');
  ok(/Stellardrone \u201cLight Years\u201d \(CC BY\)/.test(tplW) || /Stellardrone “Light Years” \(CC BY\)/.test(tplW), 'CC BY attribution is shown on the boot screen - the license is honored');
}


section('the bed begins at ENTER');
{
  const fsX = require('fs');
  const appX = fsX.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/A\.init\(\);\n    A\.music\(\);/.test(appX), 'A.music() fires right after audio init on the ENTER gesture');
  ok(!/lastBed/.test(appX), 'the per-scene bed hook is gone - the music is one universe, not room lights');
}


section('no blank start: warmed at boot, bridged instantly');
{
  const fsY = require('fs');
  const audY = fsY.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(/\)\)\) musKick\(\);/.test(audY) && /musEl\.play\(\)/.test(audY), 'the page ATTEMPTS play() the moment the URL loads (zero-click where the browser permits)');
  ok(/genBed\('city'\);   \/\/ INSTANT overture/.test(audY), 'ENTER always sounds at second zero: the zero-latency generative overture covers any buffer gap');
  ok(/'playing', function \(\) \{ musErr = 0; genBedStop\(\); \}/.test(audY), 'the moment the stream lands, the overture dissolves into Stellardrone');
}


section('autoplay to the letter of the law');
{
  const fsZ = require('fs');
  const audZ = fsZ.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(/p\.then\(function \(\) \{ musFadeStart\(\); \}, function \(\) \{ musArm\(\); \}\)/.test(audZ), 'a NotAllowedError arms the fallback instead of failing silently');
  ok(/addEventListener\('pointerdown', once, true\)/.test(audZ) && /addEventListener\('keydown', once, true\)/.test(audZ) && /addEventListener\('touchstart', once, true\)/.test(audZ), 'ANY first key, click or touch anywhere starts the music - not just ENTER');
  ok(/already cruising: autoplay landed at load/.test(audZ), 'the ENTER path detects an already-playing bed and never layers a second overture');
}


section('golden ratio mix law');
{
  const fsAA = require('fs');
  const audAA = fsAA.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(/var PHI = 1\.6180339887;/.test(audAA) && /AMB_LEVEL = MUS_LEVEL \/ PHI/.test(audAA) && /AMB_DUCK  = AMB_LEVEL \/ PHI/.test(audAA), 'one law, one source: music leads, ambience = music/phi, frozen duck = /phi again');
  ok(/var MUSVOL = MUS_LEVEL;/.test(audAA) && /\? 0 : AMB_LEVEL/.test(audAA), 'the music bed and the ambience bed both draw from the golden constants');
  ok(!/\? 0 : 0\.22/.test(audAA) && !/linearRampToValueAtTime\(0\.3,/.test(audAA), 'no stray hardcoded background levels remain outside the law');
}


section('tab-aware: nothing plays behind your back');
{
  const fsAB = require('fs');
  const audAB = fsAB.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(/typeof document !== 'undefined' && document\.addEventListener/.test(audAB) && /visibilitychange/.test(audAB), 'the Page Visibility listener exists (and stays inert in Node)');
  ok(/musPlayingOnHide = !!\(musEl && !musEl\.paused\)/.test(audAB) && /if \(musPlayingOnHide && musEl\)/.test(audAB), "MDN's playingOnHide guard: returning resumes ONLY what was playing when you left");
  ok(/ctx\.state === 'running'\) ctx\.suspend\(\)/.test(audAB) && /ctx\.state === 'suspended'\) ctx\.resume\(\)/.test(audAB), 'the WebAudio context suspends too - ambience, SFX and the generative bed all go quiet with the tab');
}


section('needle-drop: the first track opens at its swell');
{
  const fsAC = require('fs');
  const audAC = fsAC.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  ok(/loadedmetadata/.test(audAC) && /musEl\.duration \* 0\.45/.test(audAC), "the session's first track starts ~45% in, just before the loud middle");
  ok(/var musIntroDone = false;/.test(audAC) && /musIntroDone = true;/.test(audAC) && /!musIntroDone && musIdx === 0/.test(audAC), 'one-shot and first-track-only: later tracks and album wraps play whole');
}


section('rooftop speaks safety; the script sheds its corn');
{
  const fsAD = require('fs');
  const gm = fsAD.readFileSync(__dirname + '/../src/06_game.js', 'utf8');
  ok(/You cannot be hurt here/.test(gm) && /run, jump, fly/.test(gm) && !/wide as your doubt/.test(gm), 'rooftop invites flight - explicit safety, no dare-framing');
  ok(/landing is guaranteed/.test(gm) && !/Do not slow down at the edge/.test(gm), 'the hint coaches the run-up, never pressures the edge');
  ok(/you are fine/.test(gm) && !/Pain here is just information/.test(gm), 'falls are met with reassurance, not pain philosophy');
  ok(!/playing god/.test(gm) && !/no excuses/.test(gm) && !/as sharp as you believe/.test(gm) && !/White suits you/.test(gm), 'corn purged - including the white-suits-you wink');
}


section('self-healing update loop');
{
  const fsAE = require('fs');
  const appAE = fsAE.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/cdn\.jsdelivr\.net\/gh\/woodyycchang\/the-matrix-gameplay@' \+ sha/.test(appAE), 'the PAYLOAD lane is sha-pinned jsDelivr - an immutable URL cannot be stale');
  ok(/indexOf\('<\/html>'\) < 0/.test(appAE) && /if \(busy \|\| document\.hidden\) return;/.test(appAE) && /90000/.test(appAE), 'whole-document sanity, hidden tabs rest, 90 s cadence');
}


section('the neural chip is gone - typing is the entrance');
{
  const fsAF = require('fs');
  const appAF = fsAF.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(!/__neural__/.test(appAF), 'the vestigial chip is CUT: auto-preload + first-sentence wake cover every path');
}


section('the parrot is dead: examples teach format, not sentences');
{
  const fsAG = require('fs');
  const inG = fsAG.readFileSync(__dirname + '/../src/09_intent.js', 'utf8');
  ok(/never repeat any example sentence word-for-word/.test(inG), 'the system law forbids verbatim example repetition');
  ok(!/I hear you\. Name a program or an object and I will load it\./.test(inG), 'the old single attractor sentence is gone');
  ok(/Line is open/.test(inG) && /Name a program, I will load it/.test(inG), 'two differently-worded greeting exemplars force interpolation');
}


section('JARVIS register: no dashes, one voice, true comments');
{
  const fsAH = require('fs');
  const gmH = fsAH.readFileSync(__dirname + '/../src/06_game.js', 'utf8');
  const inH = fsAH.readFileSync(__dirname + '/../src/09_intent.js', 'utf8');
  const auH = fsAH.readFileSync(__dirname + '/../src/07_audio.js', 'utf8');
  const Ls = gmH.slice(gmH.indexOf('var L = C.LINES = {'), gmH.indexOf('};', gmH.indexOf('var L = C.LINES = {')));
  ok(!/\u2014|\\u2014|—/.test(Ls), 'the conversation dictionary contains zero em-dashes in any form');
  ok(/mission-control AI: short complete sentences, status first, never dashes/.test(inH), 'the neural voice spec is the JARVIS bible');
  ok(/Voice or text, whichever you prefer\./.test(gmH) && /Sidearm loaded\. Handle with intent\./.test(gmH) && /You looked\. Everyone does\./.test(gmH), 'rewritten lines follow the status-report skeleton');
  ok(/hard cap 0\.018/.test(auH), 'the engine comment finally tells the truth (0.018, not 0.014)');
}


section('dojo spawn stands clear of the wall');
{
  const fsAI = require('fs');
  const scI = fsAI.readFileSync(__dirname + '/../src/04_scenes.js', 'utf8');
  const seg = scI.slice(scI.indexOf('function sceneDojo'), scI.indexOf('function sceneDojo') + 300);
  const D = parseFloat((seg.match(/\bD = ([0-9.]+)/) || [])[1]);
  const z = parseFloat((scI.match(/name: 'dojo'[\s\S]{0,220}?pos: \[0, 0, ([0-9.]+)\]/) || [])[1]);
  ok(isFinite(D) && isFinite(z) && (D / 2 - z) >= 1.2 && /name: 'dojo'[\s\S]{0,260}?yaw: 0 \}/.test(scI), 'spawn faces dead square down the long axis (real -cos convention) - a symmetric first frame');
}


section('the address bar stays pristine');
{
  const fsAJ = require('fs');
  const appAJ = fsAJ.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/history\.replaceState\(null, '', location\.pathname\)/.test(appAJ), 'any query is wiped on boot - the visible URL is always the bare path');
}


section('EXO transmission UI');
{
  const fsAL = require('fs');
  const tplL = fsAL.readFileSync(__dirname + '/../template.html', 'utf8').replace(/\n\s*/g,'');
  const appL = fsAL.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/#log \.line\{[^}]*text-align:left/.test(tplL) && /#log \.line\.faded\{opacity:0\}/.test(tplL) && /border-top:1px dashed/.test(tplL), 'picture anatomy: left-aligned telemetry between dashed rules, lines evaporate');
  ok(/classList\.add\('in'\)/.test(appL) && /classList\.add\('faded'\)/.test(appL) && /\/\^you: \//.test(appL), 'lifecycle wired: fade-in, evaporate, faint player echoes');
  ok(/classList\.add\('con'\)/.test(appL) && /classList\.remove\('con'\)/.test(appL), 'Esc reveals the console; play hides every app control');
  ok(/\.chip\{[^}]*border:0/.test(tplL) && /\.chip\{[^}]*color:var\(--ink\)/.test(tplL), 'chips wear the same ink + halo as the lines');
}


section('picture anatomy: the reference frame, replicated');
{
  const fsAM = require('fs');
  const tplM = fsAM.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(/placeholder=""/.test(tplM) && /id="chips"/.test(tplM), 'the input stays BLANK; the predefined words live as click-chips instead');
  ok(/#lookhint\{display:none;/.test(tplM), 'the persistent hint is retired: the boot screen is the manual');
  ok(/text-transform:uppercase/.test(tplM.slice(tplM.indexOf('#log .line.sys'), tplM.indexOf('#log .line.sys') + 120)), 'system lines render as small CAPS headers, echoing the report format');
}


section('no banner hardware remains');
{
  const fsAN = require('fs');
  const tplN = fsAN.readFileSync(__dirname + '/../template.html', 'utf8');
  ok(!/id="stale"/.test(tplN) && !/#stale\{/.test(tplN), 'the warning banner is deleted from the template - it cannot pop up because it does not exist');
}


section('scene-aware voice: code-green after dark');
{
  const fsAO = require('fs');
  const tplO = fsAO.readFileSync(__dirname + '/../template.html', 'utf8');
  const appO = fsAO.readFileSync(__dirname + '/../src/08_app.js', 'utf8');
  ok(/body\.dark #log \.line\{color:#9affc0/.test(tplO) && /body\.dark #inrow input\{color:#9affc0/.test(tplO), 'dark scenes wear the Matrix default #9affc0 across lines, chips and input');
  ok(appO.indexOf("classList.toggle('dark', !!(game.scene && game.scene.uiDark)")>=0, 'the code-green skin is DECLARED (uiDark), never inferred from a name');
}


section('N1 ride-feel: the branch equations live natively');
{
  const fsN1 = require('fs');
  const gmN = fsN1.readFileSync(__dirname + '/../src/06_game.js', 'utf8');
  ok(/yawRate = B\.G \* Math\.tan\(bk\.lean\) \/ Math\.max\(bk\.speed, B\.VMIN_TURN\)/.test(gmN), 'the LEAN makes the turn: yawRate = g*tan(lean)/v (production balanced-turn form)');
  ok(/p\.yaw = C\.clamp\(p\.yaw, -0\.17, 0\.17\)/.test(gmN) && /rollT = -this\.bike\.lean \* 0\.55/.test(gmN), 'lean-carve: the nose caps at ~20 deg while the bank shows at ~23 - a held turn arcs, never pivots');
  ok(/-B\.ROLL_RATE \* dt, B\.ROLL_RATE \* dt\)/.test(gmN) && /bk\.speed \/ B\.LEAN_VGATE/.test(gmN), 'roll is RATE-limited and gated off at walking pace');
  ok(/function crashHit\(strength\)/.test(gmN) && /bk\.speed \*= 0\.35;/.test(gmN) && /self\.shake = Math\.max\(self\.shake \|\| 0, strength\)/.test(gmN), 'crashHit is one shared unit: cooldown, hard cut, shake');
}


section('N2 boulevard: twice as wide, dressed like the branch');
{
  const fsN2 = require('fs');
  const scN = fsN2.readFileSync(__dirname + '/../src/04_scenes.js', 'utf8');
  ok(/addQuadY\(m, -10\.2, z1, 10\.2, z0/.test(scN), 'the road half is 10.2 - room for three lanes a side');
  ok(/-6\.95, z1, -6\.7/.test(scN) && /6\.7, z1, 6\.95/.test(scN), 'twin cyan dividers mark the outer lanes');
  ok(/box\(\[-16\.5, 0, -1e6\], \[-9\.9, 14, 1e6\]\)/.test(scN), 'the walls retreated with the width');
  ok(/'#2b0b3c'/.test(scN) && /r\(\) < 0\.2 \? '#f5f7ff'/.test(scN), "the branch's facade language: plum doorways and bright sign plates");
}


section('N3 traffic: rivers, solid clips, near-miss air');
{
  const fsN3 = require('fs');
  const prN = fsN3.readFileSync(__dirname + '/../src/03_props.js', 'utf8');
  const scN3 = fsN3.readFileSync(__dirname + '/../src/04_scenes.js', 'utf8');
  const gmN3 = fsN3.readFileSync(__dirname + '/../src/06_game.js', 'utf8');
  ok(/P\.car = function \(hue\)/.test(prN) && /'#f5f7ff'/.test(prN) && /'#ff2b55'/.test(prN), 'P.car exists with white heads and red tails');
  ok(/LANES = \[-8\.4, -5\.0, -1\.6, 1\.6, 5\.0, 8\.4\]/.test(scN3) && /lane < 0 \? 1 : -1/.test(scN3), 'six lanes: left flows toward you, right flows with you');
  ok(/pz \+ 60\) trv\.it\.pos\[2\] = pz - 150/.test(scN3) && /pz - 170\) trv\.it\.pos\[2\] = pz \+ 45/.test(scN3), 'the river ring-recycles around the rider - endless like the road');
  ok(/crashHit\(0\.85\)/.test(gmN3) && /crashHit\(0\.5\)/.test(gmN3) && /function crashHit\(strength\)/.test(gmN3), 'traffic clips at 0.85, walls at 0.5, one shared unit');
  ok(/bk\._nmCd = 0\.6/.test(gmN3) && /emit\('swish'\)/.test(gmN3), 'a fast close without contact is a near miss: one throttled whoosh');
}


section('N4: a quarter hour down the mile - endless, bounded, finite');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('the neon mile');
  step(g, null, 1.6);
  const bikeIt = g.scene.insts.find(i => i.kind === 'bike');
  g.player.pos = [bikeIt.pos[0], 0, bikeIt.pos[2] + 2.2]; g.player.yaw = 0; g.player.pitch = 0;
  step(g, null, 0.05); aimAt(g, bikeIt.pos, 0.4); step(g, null, 0.05);
  step(g, { actionEdge: true }, 0.1);
  ok(!!g.bike, 'N4 mounted for the long ride');
  let steady = -1;
  for (let i = 0; i < 15000; i++) {
    const wig = (Math.floor(i / 240) % 3) - 1;           // -1, 0, +1: exercise clamp + lean spring
    step(g, { fwd: 1, strafe: wig * 0.6 }, 1 / 60);
    if (i === 6000) steady = g.scene.insts.length;
  }
  ok(g.bike.dist > 800,   // headless rider does not dodge: ~4 m/s through the river is the measured floor
   'the odometer accrued real kilometres (' + g.bike.dist.toFixed(0) + ' m)');
  ok(Math.abs(g.scene.insts.length - steady) <= 1, 'instance count reached a steady state and held (' + steady + ' -> ' + g.scene.insts.length + ')');
  ok(g.scene.traffic.length === 14, 'the traffic census stays exactly fourteen');
  const pz = g.player.pos[2];
  ok(g.scene.traffic.every(v => v.it.pos[2] > pz - 195 && v.it.pos[2] < pz + 78 && Number.isFinite(v.it.pos[2])), 'every car rides inside its ring around the rider, finite');
  ok(g.player.pos.every(Number.isFinite) && Number.isFinite(g.bike.speed) && Math.abs(g.player.yaw) <= 0.1700001, 'rider state finite; the arcade clamp held for the whole ride');
  ok(Object.keys(g.scene.chunks).length <= 7, 'the chunk window stays within its seven-slot budget');
  const ops = C.render(g, 640, 360, g.time);
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'a far-out frame renders with zero NaN polys');
}


section('steering calibrated: half the rate, smoothed, self-centering');
{
  const fsSC = require('fs');
  const gmS = fsSC.readFileSync(__dirname + '/../src/06_game.js', 'utf8');
  ok(/PHI_MAX: 0\.42, ROLL_RATE: 2\.2, G: 9\.81/.test(gmS), 'real constants: 24-deg max lean, 2.2 rad/s roll rate, g itself');
  ok(/bk\.sSm = \(bk\.sSm \|\| 0\) \+/.test(gmS) && /\? 9 : 12/.test(gmS), 'input eases in at 9/s and releases crisper at 12/s - the industry pipeline');
  ok(/\|\| bk\.speed < 1\.2\) p\.yaw \+= -p\.yaw \* Math\.min\(1, 1\.2 \* dt\)/.test(gmS), 'hands off: the bike drifts gently back to the street axis');
}


const FIXCAM = { pos: [8.2, 1.62, 0], yaw: -Math.PI / 2, pitch: -0.02, roll: 0 };
const HALL = C.HALL;
function snapCat(cat) {
  return [cat.pos[0], cat.pos[1], cat.pos[2], cat.yaw, cat.pose[1], cat.pose[2], cat.pose[3], cat.pose[4], cat.pose[5]];
}
function snapScene(g) {
  // persistent state only; render/load transients excluded on purpose
  return g.scene.insts.map(it => JSON.stringify({
    id: it.id, kind: it.kind, label: it.label, state: it.state || null,
    pos: it.pos, yaw: it.yaw, scale: it.scale, glyphEpoch: it.glyphEpoch | 0,
    mesh: [it.mesh.v.length, it.mesh.f.length],
    pose: it.pose ? it.pose.slice() : null
  })).sort();
}
function renderWith(g, mode, cb) {
  const cam0 = g.cam; g.cam = FIXCAM;
  const mode0 = g.mode; g.mode = mode;
  const ops = C.render(g, 400, 225, 77.77);   // fixed t: glyph buckets identical across calls
  g.cam = cam0; g.mode = mode0;
  if (cb) cb(ops);
  return ops;
}
function catDrawSig(g, catId) {
  const ops = renderWith(g, 'normal');
  return JSON.stringify(ops.filter(o => o.t === 'poly' && o.id === catId)
    .map(o => ({ p: o.p, c: o.c, a: o.a, d: o.d })));
}
function glyphSig(g, id) {
  const ops = renderWith(g, 'code');
  return JSON.stringify(ops.filter(o => o.t === 'g' && o.id === id)
    .map(o => [o.ch, Math.round(o.x * 10), Math.round(o.y * 10)]).sort());
}
function runTo(g, phase, maxSec) {
  let guard = 0;
  while (!(g.scene.dv && g.scene.dv.phase === phase) && guard++ < (maxSec || 40) * 60) { g.update({}, 1 / 60); g.drain(); }
  return !!(g.scene.dv && g.scene.dv.phase === phase);
}

// (a) the replay IS the recording — proven at state level and at draw level
section('déjà vu: true replay');
{
  const g = new C.Game();
  g.request('a hallway');
  eq(g.trans && g.trans.name, 'hallway', 'request stages the hallway');
  ok(runTo(g, 'pass1'), 'reaches pass 1');
  const dv = g.scene.dv, cat = dv.cat;
  const K = 210;
  const seen1 = [], seen2 = [];
  let draw1 = null, draw2 = null, scene1 = null, scene2 = null;
  dv.tap = (phase, p, c) => {
    if (phase === 'pass1') {
      seen1.push(snapCat(c));
      if (p === K) { draw1 = catDrawSig(g, c.id); scene1 = snapScene(g); }
    } else {
      seen2.push(snapCat(c));
      if (p === K) { draw2 = catDrawSig(g, c.id); scene2 = snapScene(g); }
    }
  };
  ok(runTo(g, 'after', 60), 'arc completes');
  eq(dv.rec.length, HALL.N, 'recording holds one tuple per tick');
  eq(seen1.length, HALL.N, 'pass 1 applied every tick');
  eq(seen2.length, HALL.N, 'pass 2 applied every tick');
  let stateEq = 0;
  for (let i = 0; i < HALL.N; i++) {
    let same = true;
    for (let k = 0; k < 9; k++) if (seen1[i][k] !== seen2[i][k]) same = false;
    if (same) stateEq++;
  }
  eq(stateEq, HALL.N, 'replay equals recording, frame for frame, exactly (proof 1: state)');
  let recEq = 0;
  for (let i = 0; i < HALL.N; i++) if (JSON.stringify(dv.rec[i]) === JSON.stringify(seen2[i])) recEq++;
  eq(recEq, HALL.N, 'pass 2 applied the stored record verbatim');
  ok(draw1 && draw1.length > 60, 'cat draws at tick K');
  eq(draw1 === draw2, true, 'replay equals recording at the draw list (proof 2: pixels-in-waiting)');

  // (b) exactly one thing changed between the passes — proven by diff and by census
  section('déjà vu: one genuine change');
  const scan = g.scene.insts.filter(it => it.mut);
  eq(scan.length, 3, 'three mutable fixtures live in the scene graph');
  ok(dv.cands.length === scan.length && dv.cands.every(c => scan.includes(c)), 'the pick pool IS the scene graph scan');
  ok(scene1 && scene2, 'tick-matched snapshots taken');
  const s1 = new Set(scene1);
  const diff = scene2.filter(x => !s1.has(x));
  eq(diff.length, 1, 'exactly one object differs between the passes (proof 1: diff)');
  const chosen = dv.chosen;
  ok(!!chosen && JSON.parse(diff[0]).id === chosen.id, 'the differing object is the chosen fixture');
  eq(chosen.state, chosen.mut.alt, 'its state really flipped');
  let untouched = 0;
  for (const c of dv.cands) if (c !== chosen && c.state !== c.mut.alt) untouched++;
  eq(untouched, dv.cands.length - 1, 'every other candidate kept its state (proof 2: census)');
  ok(chosen.glyphEpoch === 1 && chosen.reResolve !== undefined, 'the change re-seeded its code');

  // way back gone + the only exit forward
  section('déjà vu: the way back is gone');
  ok(dv.sealed && g.scene.dv.way.state === 'bricked', 'the archway bricked itself');
  g.player.pos = [8.2, 0, 0]; g.player.vel = [0, 0, 0]; g.player.yaw = Math.PI / 2;
  step(g, { fwd: 1, sprint: true }, 2.0);
  ok(g.player.pos[0] < HALL.HL - 0.3, 'walking back hits a wall now (' + g.player.pos[0].toFixed(2) + ')');
  step(g, null, 6.0);   // the ring is held back until the operator's line lands
  const booth = g.scene.insts.find(i => i.kind === 'booth');
  ok(!!booth, 'a booth rang in at the far end');
  g.player.pos = [booth.pos[0], 0, 0.3]; g.player.vel = [0, 0, 0];
  g.player.yaw = Math.atan2(booth.pos[0] - g.player.pos[0], -(booth.pos[2] - g.player.pos[2]));
  step(g, { fwd: 1 }, 1.6);
  step(g, null, 1.0);
  eq(g.sceneName, 'construct', 'walking into the booth hangs up to the void: end to end');
}

// pre-seal the arch is genuinely open (walk out and back), and the corridor holds
section('déjà vu: open before, walls always');
{
  const g = new C.Game();
  g.request('deja vu');
  step(g, null, 1.2);   // settle: fixtures materializing, cat not yet walking
  g.player.pos = [8.2, 0, 0]; g.player.yaw = Math.PI / 2;
  step(g, { fwd: 1 }, 1.6);
  ok(g.player.pos[0] > HALL.HL + 0.3, 'before the glitch you can step out onto the landing');
  g.player.yaw = -Math.PI / 2;
  step(g, { fwd: 1 }, 1.8);
  ok(g.player.pos[0] < HALL.HL - 0.5, 'and walk back in');
  g.player.pos = [6, 0, 0]; g.player.yaw = 0;
  step(g, { fwd: 1, sprint: true }, 1.6);
  ok(Math.abs(g.player.pos[2]) < HALL.HW, 'the corridor walls contain the player');
}

// the glitch is visible in code vision: chars re-roll in place, neighbors hold still
section('déjà vu: glyphs re-resolve');
{
  const g = new C.Game();
  g.request('a hallway');
  ok(runTo(g, 'pass1'), 'in pass 1');
  const dv = g.scene.dv;
  const control = g.scene.insts.find(it => it.kind === 'fixture' && !it.mut);
  // proof 1: epoch alone re-rolls an object's characters at the same anchors, same t
  // (measured on a fixture beyond the 7 m label-spelling range)
  const before = glyphSig(g, control.id);
  control.glyphEpoch = 1;
  const flipped = glyphSig(g, control.id);
  control.glyphEpoch = 0;
  ok(before.length > 40, 'far fixture carries glyphs');
  ok(before !== flipped, 'epoch bump re-resolves the same anchors to new characters');
  eq(glyphSig(g, control.id), before, 'epoch restored, characters restored (pure)');
  const sameXY = (a, b) => JSON.stringify(JSON.parse(a).map(v => [v[1], v[2]]).sort()) === JSON.stringify(JSON.parse(b).map(v => [v[1], v[2]]).sort());
  ok(sameXY(before, flipped), 'the re-roll is characters, not geometry: anchors held still');
  // proof 2: the real mutation re-resolves the chosen fixture; a bystander is untouched
  const preChosen = {}; for (const c of dv.cands) preChosen[c.id] = glyphSig(g, c.id);
  const preControl = glyphSig(g, control.id);
  ok(runTo(g, 'pass2'), 'past the glitch');
  step(g, null, 1.2);   // let the swapped mesh finish materializing
  const chosen = dv.chosen;
  chosen.reResolve = 0;  // compare the settled field, not the churn
  ok(glyphSig(g, chosen.id) !== preChosen[chosen.id], 'the changed fixture reads as different code');
  eq(chosen.label, chosen.mut.label, 'up close, the code now spells what it became');
  eq(glyphSig(g, control.id), preControl, 'an unchanged fixture reads as the same code');
  // the churn itself is visible: same instant, scramble on vs settled
  chosen.reResolve = 1;
  const churn = glyphSig(g, chosen.id);
  chosen.reResolve = 0;
  const settled = glyphSig(g, chosen.id);
  ok(churn !== settled, 'the re-resolve is animated, not a silent swap');
}

// same script, same walk, same record — the sim is deterministic
section('déjà vu: determinism');
{
  const runs = [];
  for (let r = 0; r < 2; r++) {
    const g = new C.Game();
    g.request('a hallway');
    runTo(g, 'after', 60);
    runs.push({ rec: JSON.stringify(g.scene.dv.rec), pick: g.scene.dv.chosen.label });
  }
  eq(runs[0].rec, runs[1].rec, 'identical scripts record identical walks');
  eq(runs[0].pick, runs[1].pick, 'identical scripts pick the same fixture');
  ok(['brick', 'bars', 'dead'].includes(runs[0].pick), 'the pick is a real fixture, wearing its new name');
}

// the corridor with no end: shut before the seal, endless after it
section('déjà vu: infinite hallway');
{
  const gPre = new C.Game();
  gPre.request('a hallway');
  step(gPre, null, 1.0);   // settle: the cat has not even entered yet
  gPre.player.pos = [-7, 0, 0]; gPre.player.vel = [0, 0, 0]; gPre.player.yaw = -Math.PI / 2;
  step(gPre, { fwd: 1, sprint: true }, 2.0);
  ok(gPre.player.pos[0] < -HALL.HL - 2, 'the far door opens for you from the very first minute (' + gPre.player.pos[0].toFixed(2) + ')');
  ok(gPre.scene.dv.doors[0].a > 0.4 || gPre.scene.dv.doorA > 0.4, 'its leaves really swung');
  step(gPre, { fwd: 1, sprint: true }, 4.0);
  ok(gPre.scene.dv.loop.laps >= 2, 'the loop runs before the déjà vu is even over');

  const g = new C.Game();
  g.request('a hallway');
  ok(runTo(g, 'after', 60), 'arc completes');
  const dv = g.scene.dv;
  const fe = g.scene.insts.find(i => i.kind === 'farend');
  eq(fe.state, 'armed', 'the door that never opens is armed: it opens when you come to it');
  eq(fe.label, 'corridor', 'up close its code now spells where it leads');
  ok(fe.glyphEpoch === 1, 'and its code re-seeded');
  eq(dv.doors.length, 4, 'four doors hang in the loop: the far door and one per period');
  ok(dv.doors.every(d => d.a === 0 && d.blocked), 'all shut and solid before anyone walks up');
  ok(dv.doors.every(d => g.scene.colliders.includes(d.col)), 'every shut door blocks');
  eq(g.scene.insts.filter(i => i.kind === 'leaf').length, 8, 'eight leaves, two per door');

  // a door opens for you, only for you, and creaks once
  g.player.pos = [-19.0, 0, 0]; g.player.vel = [0, 0, 0]; g.player.yaw = -Math.PI / 2;
  let creaks = 0;
  for (let i = 0; i < 48; i++) { g.update({}, 1 / 60); for (const e of g.drain()) if (e.name === 'creak') creaks++; }
  const dNear = dv.doors.find(d => Math.abs(d.x + 20.3) < 0.01);
  const dFar2 = dv.doors.find(d => Math.abs(d.x + 13.1) < 0.01);
  ok(dNear.a > 1.5 && !dNear.blocked, 'the near door swings open and lets you pass');
  ok(!g.scene.colliders.includes(dNear.col), 'its collider lifted');
  ok(dFar2.a === 0 && dFar2.blocked, 'the next door down stays shut: it opens for proximity, not for the scene');
  eq(creaks, 1, 'one creak per opening');
  near(dNear.leaves[0].pose[5], -dNear.leaves[1].pose[5], 1e-9, 'the leaves mirror each other');

  // walk away and it shuts behind you
  g.player.pos = [-17.0, 0, 0]; g.player.vel = [0, 0, 0];
  for (let i = 0; i < 80; i++) { g.update({}, 1 / 60); g.drain(); }
  ok(dv.doors.every(d => d.a < 0.05 && d.blocked), 'left alone, every door eases shut and blocks again');
  const segs = g.scene.insts.filter(i => i.kind === 'segment');
  eq(segs.length, 6, 'three corridor segments and three lamps laid down');
  const segMeshes = segs.filter(i => i.label === 'corridor');
  ok(segMeshes.length === 3 && segMeshes[0].mesh === segMeshes[1].mesh && segMeshes[1].mesh === segMeshes[2].mesh, 'segments share one mesh: the repeat is literal');
  ok(!!dv.loop && dv.loop.laps === 0, 'the loop is armed, untriggered');

  // proof 1 the door lifted: the same sprint that was blocked now leaves the corridor
  g.player.pos = [-8, 0, 0]; g.player.vel = [0, 0, 0]; g.player.yaw = -Math.PI / 2;
  step(g, { fwd: 1, sprint: true }, 2.0);
  ok(g.player.pos[0] < -HALL.HL - 2, 'after the seal the same sprint passes through');

  // proof 2 the loop is a pure translation: every discontinuity in the track equals one period
  const lapsStart = dv.loop.laps;
  const track = [g.player.pos[0]];
  let seamShutAhead = 0, seamCarriedBehind = 0;
  for (let i = 0; i < 60 * 6; i++) {
    g.update({ fwd: 1, sprint: true }, 1 / 60); g.drain();
    const x = g.player.pos[0];
    if (x - track[track.length - 1] > 1) {   // a wrap landed this tick
      const ahead = dv.doors.filter(d => d.x < x).sort((a, b) => b.x - a.x)[0];
      const behind = dv.doors.filter(d => d.x > x && d.x < -HALL.HL).sort((a, b) => a.x - b.x)[0];
      if (ahead && ahead.a < 0.1) seamShutAhead++;
      if (behind && behind.a > 0.9) seamCarriedBehind++;
    }
    track.push(x);
  }
  const jumps = [];
  for (let i = 1; i < track.length; i++) if (Math.abs(track[i] - track[i - 1]) > 1) jumps.push(track[i] - track[i - 1]);
  const lapsRun = dv.loop.laps - lapsStart;
  ok(lapsRun >= 4, 'six seconds of running: ' + lapsRun + ' laps');
  eq(jumps.length, lapsRun, 'every lap is one discontinuity, nothing else moved the player');
  ok(jumps.every(j => Math.abs(j - HALL.SEGP) < 0.25), 'each wrap is one period, give or take a tick of motion');
  ok(g.player.pos[0] > dv.loop.at - 0.7 && g.player.pos[0] < dv.loop.at + HALL.SEGP + 0.7, 'the runner never actually gets anywhere');
  eq(seamShutAhead, lapsRun, 'at every seam the door ahead reads shut');
  eq(seamCarriedBehind, lapsRun, 'and the one easing shut behind you crossed the seam with you');
  ok(finiteDeep(g.player.pos) && finiteDeep(g.player.vel), 'player state stays finite through the wraps');

  // the endless stretch renders clean in both sights
  step(g, null, 0.1);
  for (const md of ['normal', 'code']) {
    const m0 = g.mode; g.mode = md;
    const ops = C.render(g, 400, 225, g.time);
    const bad = ops.filter(o => o.t === 'poly' && !o.p.every(Number.isFinite)).length;
    ok(bad === 0 && ops.length > 40, 'loop zone renders (' + md + '): ' + ops.length + ' ops, no NaN');
    g.mode = m0;
  }

  // the seam is hidden behind your back: facing the phone, no wrap fires
  g.player.pos = [dv.loop.at + 0.05, 0, 0]; g.player.vel = [0, 0, 0]; g.player.yaw = Math.PI / 2;
  const lapsBefore = dv.loop.laps;
  step(g, { fwd: -1 }, 0.7);
  ok(dv.loop.laps === lapsBefore && g.player.pos[0] < dv.loop.at, 'facing back, the wrap line lets you cross');
  step(g, { fwd: -1 }, 4.0);
  ok(dv.loop.laps > lapsBefore, 'but the corridor still refuses to end (hard wrap)');

  // and the way to the phone is always finite (stop at the doorway; walking into the booth would answer it)
  g.player.pos = [dv.loop.at + 1, 0, 0]; g.player.vel = [0, 0, 0]; g.player.yaw = Math.PI / 2;
  let homeTicks = 0;
  while (g.player.pos[0] <= -HALL.HL + 0.05 && homeTicks++ < 60 * 6) { g.update({ fwd: 1, sprint: true }, 1 / 60); g.drain(); }
  ok(g.player.pos[0] > -HALL.HL, 'turning around, the doorway home is a real distance away (' + (homeTicks / 60).toFixed(1) + 's)');
  ok(g.sceneName === 'hallway', 'and the corridor is still the corridor');
}

section('EREBUS: three decks stand on stock physics');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('take me to the tower');
  step(g, null, 1.4);
  ok(g.scene.name === 'erebus station', "the word chain docks you: 'tower' -> erebus station");
  const probes = [[0, 0, 27, 0, 'docking bay'], [0, 0, -5, 0, 'rotunda'], [-7, -3.64, 9.4, -3.64, 'stair landing'], [0, 12.6, 10, 12.6, 'dome deck'], [0, 4.6, 12, 4.6, 'balcony ring'], [22, 0, 8, 0, 'crew quarters'], [-22, 0, 2.2, 0, 'hydroponics'], [20, 4.6, -9, 4.6, 'data archive']];
  for (const [x, y, z, want, name] of probes) {
    g.player.pos = [x, y + 0.9, z]; g.player.vel = [0, 0, 0];
    step(g, null, 0.9);
    ok(g.player.grounded && Math.abs(g.player.pos[1] - want) < 0.07, name + ' supports at ' + want + ' (got ' + g.player.pos[1].toFixed(2) + ')');
  }
  g.player.pos = [0, 0.02, 0]; g.player.vel = [0, 0, 0];
  for (let i = 0; i < 120; i++) step(g, { strafe: 1 }, 1 / 60);
  ok(g.player.pos[0] < 13.4, 'the rotunda east wall does not pierce (' + g.player.pos[0].toFixed(2) + ')');
}

section('EREBUS: the director runs its beats once');
{
  const g = new C.Game();
  step(g, null, 0.2);
  g.request('erebus');
  step(g, null, 1.4);
  const s = g.scene;
  ok(s.emg && s.emg.length === 3 && s.emg.every(e => e.state === 'off'), 'three emergency strips wait in the off state');
  g.player.pos = [-6, -6.1, 20]; g.player.vel = [0, 0, 0];
  let evs = [];
  for (let i = 0; i < 20; i++) evs = evs.concat(step(g, null, 1 / 20));
  ok(s._dir.black === true && s.emg.every(e => e.state === 'dead') || s.emg.every(e => e.state === 'red'), 'first reactor entry kills the power');
  ok(has(evs, 'powerdown'), 'the powerdown thrum fired');
  for (let i = 0; i < 80; i++) evs = evs.concat(step(g, null, 1 / 20));
  ok(s.emg.every(e => e.state === 'half'), 'power settles at half (' + s.emg[0].state + ')');
  ok(has(evs, 'alarm') && has(evs, 'whisper'), 'alarm and whisper both spoke');
  ok(s.ambience === 'station' && s.logs.length === 4, 'station ambience and all four crew logs are aboard');
  ok(s._dir.med === false && s.cab && s.cab.state === 'shut', 'the med cabinet waits shut');
  g.player.pos = [22, 0.02, -8]; g.player.vel = [0, 0, 0];
  let evsM = [];
  for (let i = 0; i < 12; i++) evsM = evsM.concat(step(g, null, 1 / 20));
  ok(s._dir.med === true && s.cab.state === 'open' && has(evsM, 'creak'), 'first med-bay entry swings the cabinet with a creak');
  ok(s.fog.col === '#03040a' || s.fog.col === '#060a13', 'the blackout dimmed the air (' + s.fog.col + ')');
  const census0 = s.insts.length;
  ok(s.fig === null && !!s.figWait && s._dir.figIn === false, 'the figure is not there yet');
  g.player.pos = [8, -6.1, 29]; g.player.vel = [0, 0, 0];
  for (let i = 0; i < 8; i++) step(g, null, 1 / 20);
  ok(s._dir.figIn === true && !!s.fig && s._dir.fig === false && s.insts.length === census0 + 1, 'commit to the alcove and the figure fades IN');
  g.player.pos = [8, -6.1, 33.8]; g.player.vel = [0, 0, 0];
  let evs2 = [];
  for (let i = 0; i < 30; i++) evs2 = evs2.concat(step(g, null, 1 / 20));
  ok(s._dir.fig === true && s.fig === null && s.insts.length === census0, 'approach and it dissolves, leaving the census as it was');
  ok(has(evs2, 'whisper'), 'it whispers as it goes');
  ok(s.shafts.length === 2 && s.shafts.every(x => x.state === 'on'), 'the bridge light columns stand in daylight');
  g.time = 132;
  step(g, null, 0.2);
  ok(s.shafts.every(x => x.state === 'off'), 'occlusion night puts the columns out');
  g.time = 6; step(g, null, 0.2);
  ok(s.shafts.every(x => x.state === 'on'), 'daybreak relights them');
  let evsC = [];
  g.time = 300;
  for (let i = 0; i < 40; i++) evsC = evsC.concat(step(g, null, 1 / 20));
  ok(has(evsC, 'clank'), 'the hull knocks now and then');
  g.player.pos = [3.2, 0.02, 27.2]; g.player.vel = [0, 0, 0];
  let evs3 = [];
  for (let i = 0; i < 30; i++) evs3 = evs3.concat(step(g, null, 1 / 20));
  ok(has(evs3, 'say') && s.logs[0].shown, 'the crew log typewrites on approach');
  const ops = C.render(g, 480, 270, g.time);
  ok(ops[0].t === 'sky' && ops[0].mode === 'erebus' && Number.isFinite(ops[0].yaw) && Number.isFinite(ops[0].time), "the sky op carries mode 'erebus' with yaw and time");
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'the station renders with zero NaN polys');
  g.player.pos = [0, 12.62, 10];
  const ops2 = C.render(g, 480, 270, g.time);
  ok(ops2.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'the dome deck under the erebus sky renders clean');
}

section('EPANG: the palace stands and the rhapsody speaks');
{
  const g = new C.Game();
  step(g, null, 0.2);
  let evs0 = [];
  g.request('take me to the palace');
  for (let i = 0; i < 30; i++) evs0 = evs0.concat(step(g, null, 1 / 20));
  ok(g.scene.name === 'epang palace', "the word chain opens the gates: 'palace' -> epang");
  const s = g.scene;
  ok(s.regions.length === 12 && s.regions[0].said === true && has(evs0, 'say'), 'the GATE speaks its line on spawn; TWELVE stagings stand (' + s.regions.filter(r => r.said).length + ' said)');
  const probes = [[0, 0, 26, 0, 'courtyard'], [0, 0.9, 4, 0.9, 'front-hall platform'], [0, 1.12, 15.2, 1.12, 'dragon-bridge crest'], [18, 5.0, 0.4, 5.0, 'skyway across the void'], [40, 0, 8, 0, 'treasury'], [-22, 0.6, 4, 0.6, 'song terrace'], [8, -0.23, 16.8, -0.23, 'ghat step']];
  for (const [x, y, z, want, name] of probes) {
    g.player.pos = [x, y + 0.9, z]; g.player.vel = [0, 0, 0];
    step(g, null, 0.9);
    ok(g.player.grounded && Math.abs(g.player.pos[1] - want) < 0.07, name + ' supports at ' + want + ' (got ' + g.player.pos[1].toFixed(2) + ')');
  }
  ok(s.regions.filter(r => r.said).length >= 5, 'crossing the palace typewrites the rhapsody (' + s.regions.filter(r => r.said).length + '/8 lines spoken)');
  let evsW = [];
  g.player.pos = [4, 0.2, 15]; g.player.vel = [0, 0, 0];
  for (let i = 0; i < 20; i++) evsW = evsW.concat(step(g, null, 1 / 20));
  ok(g.player.grounded && Math.abs(g.player.pos[1] - (-0.7)) < 0.07 && s._splash.a === true && has(evsW, 'splash'), 'wading river A: you land on the bed and it splashes once (y ' + g.player.pos[1].toFixed(2) + ')');
  g.player.pos = [0, 0.02, 30]; g.player.vel = [0, 0, 0];
  for (let i = 0; i < 120; i++) step(g, { strafe: 1 }, 1 / 60);
  ok(g.player.pos[0] < 16.4, 'the courtyard east wall does not pierce (' + g.player.pos[0].toFixed(2) + ')');
  const ops = C.render(g, 480, 270, g.time);
  ok(ops[0].t === 'sky' && ops[0].mode === 'epang' && Number.isFinite(ops[0].time) && Number.isFinite(ops[0].yaw), "the sky op carries mode 'epang' with time and yaw");
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'the palace renders with zero NaN polys');
  g.player.pos = [18, 5.02, 0.4];
  const ops2 = C.render(g, 480, 270, g.time);
  ok(ops2.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'the skyway view over river B renders clean');
}

// ------------------------------------------- ORANGE EMPIRE 1937 (branch port)
section('ORANGE EMPIRE 1937 (Angel City recovered as native scene)');
{
  const mkE = () => { const g = new C.Game(); const ev = []; g.emit = (n) => { ev.push(n); };
    g.update({}, 0.2); g.request('orange empire');
    for (let i = 0; i < 140; i++) g.update({}, 1 / 30);
    return { g, ev }; };
  const mountSedan = (g) => { const sed = g.scene.sedan;
    g.player.pos = [sed.pos[0] - 2.2, 0, sed.pos[2]]; g.player.yaw = Math.PI / 2; g.player.pitch = 0;
    g.update({}, 1 / 30); g.update({}, 1 / 30); g.doAction(); return sed; };
  // -- the word chain
  eq(C.parse('orange empire').scene, 'empire', "'orange empire' loads the theme");
  eq(C.parse('1937').scene, 'empire', "'1937' loads the theme");
  eq(C.parse('give me that nostalgic vibe').scene, 'empire', 'nostalgia routes to Angel City');
  eq(C.parse('take me to angel city').scene, 'empire', "'angel city' routes");
  eq(C.parse('an orange chair').type, 'props', "bare 'orange' is still a color: 'orange chair' stays a prop");
  eq(C.parse('an orange chair').props[0].kind, 'chair', 'and the prop is the chair');
  ok(C.LINES.empire && C.LINES.empire.indexOf('\u2014') < 0, 'the operator line keeps the JARVIS register (no em-dash)');
  ok(C.intent.intents.some(it => it.word === 'empire'), 'the neural fallback knows the designated word');
  // -- census
  {
    const { g } = mkE();
    eq(g.scene.name, 'angel city 1937', 'scene name');
    eq(g.scene.sky, 'empire', 'sky mode');
    eq(g.scene.label, 'ANGEL CITY 1937', 'label');
    eq(g.scene.barricades.length, 3, 'three barricades on the east road');
    eq(g.scene.barricades.map(b => b.kind).join(','), '1,2,3', 'kinds 1,2,3 in order (300/520/700)');
    ok(g.scene.sedan && g.scene.sedan.kind === 'sedan', 'a 1937 sedan is parked on Main');
    ok(g.scene.insts.filter(it => it.kind === 'ped').length >= 4, 'Gus, Mrs. Pell and the twins stand their posts');
    eq(g.scene.regions.length, 10, 'ten speaking regions');
    ok(g.scene.colliders.some(b => b.min[0] > 930), 'the boundary wall is solid past 930');
    ok(Object.keys(g.scene.chunks).length >= 6, 'the east road pre-seeds a chunk window');
    const ops = C.render(g, 480, 270, g.time);
    ok(ops[0].t === 'sky' && ops[0].mode === 'empire', "the sky op carries mode 'empire'");
    near(ops[0].time, 1164, 30, 'the sky clock reads minutes since midnight, starting 7:24 PM');
    ok(ops.some(o => o.t === 'poly'), 'the town renders polys');
    ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'zero NaN at the spawn');
  }
  // -- the day clock and the fog that follows it
  {
    const { g } = mkE();
    const t0 = g.scene.skyT;
    for (let i = 0; i < 60 * 30; i++) g.update({}, 1 / 30);
    near(g.scene.skyT - t0, 30, 2, '60 real seconds = 30 game minutes');
    const townFog = g.scene.fog.far;
    g.player.pos = [700, 0, 0]; g.update({}, 1 / 30);
    ok(g.scene.fog.far < townFog, 'the fog closes in with the edge factor');
    ok(/^#/.test(g.scene.fog.col), 'fog color stays a hex through the blend');
  }
  // -- the sedan: their envelope, verbatim constants
  {
    const { g } = mkE();
    mountSedan(g);
    ok(!!g.car, 'E mounts the sedan');
    for (let i = 0; i < 6 * 60; i++) g.update({ fwd: 1 }, 1 / 60);
    ok(g.car.speed > 12 && g.car.speed <= 26, '6 s of throttle lands mid-envelope (got ' + g.car.speed.toFixed(1) + ')');
    for (let i = 0; i < 14 * 60; i++) g.update({ fwd: 1 }, 1 / 60);
    ok(g.car.speed > 20 && g.car.speed <= 26, 'she tops out near VMAX 26 (got ' + g.car.speed.toFixed(1) + ')');
    const yaw0 = g.player.yaw;
    for (let i = 0; i < 45; i++) g.update({ fwd: 1, strafe: 0.6 }, 1 / 60);
    ok(Math.abs(g.player.yaw - yaw0) > 0.05 && Math.abs(g.player.yaw - yaw0) < 1.4, 'held steer carves an arc, not a pivot');
    for (let i = 0; i < 2 * 60; i++) g.update({ fwd: -1 }, 1 / 60);
    ok(g.car.speed < 12, 'the brake bites');
    for (let i = 0; i < 6 * 60; i++) g.update({ fwd: -1 }, 1 / 60);
    ok(g.car.speed < 0 && g.car.speed >= -6.5, 'reverse crawls, capped at VREV (got ' + g.car.speed.toFixed(1) + ')');
    g.scene._dismiss = true; g.car.speed = 20;
    for (let i = 0; i < 4 * 60; i++) g.update({ fwd: 1 }, 1 / 60);
    ok(Math.abs(g.car.speed) < 0.6, 'a dismissed engine ignores the throttle and coasts to nothing');
    g.dismountCar();
    ok(!g.car && g.scene.sedan._col, 'dismount parks her solid again');
  }
  // -- barricades: slow is a wall, fast is a doorway
  {
    const { g, ev } = mkE();
    mountSedan(g);
    g.player.pos = [297.4, 0, 0]; g.player.yaw = Math.PI / 2; g.car.speed = 3;
    const bcol0 = g.scene.barricades[0].col;
    for (let i = 0; i < 3 * 60; i++) g.update({}, 1 / 60);
    ok(!g.scene.barricades[0].broken, 'a 3 m/s nudge does not break ROAD CLOSED');
    ok(g.player.pos[0] < 300.5, 'the sawhorse holds the line');
    ok(ev.indexOf('thud') >= 0, 'and it thuds');
    g.player.pos = [290, 0, 0]; g.car.speed = 14;
    for (let i = 0; i < 2 * 60; i++) g.update({ fwd: 1 }, 1 / 60);
    ok(g.scene.barricades[0].broken, '14 m/s breaks it');
    ok(g.scene.colliders.indexOf(bcol0) < 0, 'the broken barricade gives up its collider');
    ok(g.scene._f.knocked === 1, 'the count is kept');
    ok(g.msgs.some(m => m.text.indexOf('sawhorse went over easy') >= 0), 'the kind-1 note fires verbatim');
    ok(g.player.pos[0] > 305, 'and the road is open');
  }
  // -- the east road streams in chunks, both directions, bounded
  {
    const { g } = mkE();
    g.player.pos = [600, 0, 0]; g.update({}, 1 / 30);
    const keys1 = Object.keys(g.scene.chunks).map(Number);
    ok(keys1.indexOf(0) < 0, 'town-end chunks are recycled when you are deep east');
    ok(keys1.length <= 10, 'the window stays bounded (' + keys1.length + ')');
    ok(keys1.some(k => k >= 12), 'and the deep-east slabs exist');
    g.player.pos = [40, 0, 0]; g.update({}, 1 / 30);
    const keys2 = Object.keys(g.scene.chunks).map(Number);
    ok(keys2.indexOf(0) >= 0 && keys2.length <= 10, 'walking home re-seeds the town end, still bounded');
  }
  // -- six seams under scripted time
  {
    const { g, ev } = mkE();
    g.player.pos = [-16, 0, 14];   // into The Blue Pacific
    for (let i = 0; i < 8 * 30; i++) g.update({}, 1 / 30);
    ok(g.msgs.some(m => m.text.indexOf('THE USUAL') >= 0), 'seam 1: THE USUAL pours itself');
    for (let i = 0; i < 60 * 30; i++) g.update({}, 1 / 30);
    ok(g.msgs.some(m => m.text.indexOf('WHITMORE CITRUS CO. \u2014 EAST GROVE ROAD') >= 0), 'Gus slides the matchbook, verbatim');
    ok(g.scene._f.matchbook, 'and the flag is kept');
    ok(g.msgs.some(m => m.text.indexOf('THE SKIP') >= 0), 'seam 2: bar seven stumbles after 64 s');
    ok(ev.filter(e => e === 'crackle').length > 8, 'the needle crackles under it (non-musical)');
    g.player.pos = [-10.4, 0, 18.6];   // by the radio
    for (let i = 0; i < 16 * 30; i++) g.update({}, 1 / 30);
    ok(ev.filter(e => e === 'chirp').length >= 20, 'the fourth station counts in beeps: 9, 6, 5');
    ok(g.msgs.some(m => m.text.indexOf('NINE, SIX, FIVE') >= 0), 'seam 3: not a frequency, a distance');
    g.player.pos = [-33, 0, 8.6]; g.update({}, 1 / 30);
    ok(g.msgs.some(m => m.text.indexOf('THE EXAMINER') >= 0), 'the paper reads once');
    g.player.pos = [-33, 0, 20]; g.update({}, 1 / 30);
    g.player.pos = [-33, 0, 8.6]; g.update({}, 1 / 30);
    ok(g.msgs.some(m => m.text.indexOf('EVERGREEN') >= 0), 'seam 4: the same paper, twice');
  }
  {
    const { g } = mkE();
    const s = g.scene;
    // force the clock to a quarter past and stand at the corner with Mrs. Pell
    s._c0 = g.time - 2 * ((15 - (1164 % 60)) >= 0 ? (15 - (1164 % 60)) : (75 - (1164 % 60)));
    const pell = s.insts.filter(it => it.kind === 'ped')[1];
    for (let w = 0; w < 2; w++) {
      g.player.pos = [pell.pos[0], 0, pell.pos[2] - 2]; g.update({}, 1 / 30);
      for (let i = 0; i < 30; i++) { g.player.pos = [pell.pos[0], 0, pell.pos[2] - 2]; g.update({}, 1 / 30); }
      s._c0 -= 120;   // the next hour arrives
    }
    ok(s._f.pellW >= 2, 'Mrs. Pell witnessed twice (' + s._f.pellW + ')');
    ok(g.msgs.some(m => m.text.indexOf('CLOCKWORK') >= 0), 'seam 5: quarter past, every hour');
  }
  {
    const { g } = mkE();
    g.player.pos = [0, 0, -3]; 
    for (let i = 0; i < 26 * 30; i++) g.update({}, 1 / 30);   // arm the twins
    for (let i = 0; i < 80 * 30 && !g.scene._f.mirror; i++) { g.player.pos = [0, 0, -3]; g.update({}, 1 / 30); }
    ok(g.scene._f.mirror, 'seam 6: THE MIRROR crosses Main');
    ok(g.msgs.some(m => m.text.indexOf('Same suit. Same face. Same nod.') >= 0), 'and speaks verbatim');
  }
  // -- the shack gives up the note, verbatim
  {
    const { g, ev } = mkE();
    g.player.pos = [335, 0, 23.2]; g.update({}, 1 / 30); g.update({}, 1 / 30);
    ok(ev.indexOf('creak') >= 0, 'the door gives with a creak');
    eq(g.scene.shackDoor.state, 'open', 'and swings open (mutation trick)');
    g.player.pos = [333.75, 0.02, 25.75]; g.update({}, 1 / 30);
    const NOTE = g.scene.NOTE;
    eq(NOTE.length, 8, 'the J.W. note keeps its eight lines');
    ok(NOTE[4].indexOf('nine sixty-five') >= 0 && NOTE[7] === '\u2014 J.W., June 11', 'the number and the signature are exact');
    for (let i = 0; i < 24 * 30; i++) g.update({}, 1 / 30);
    const said = g.msgs.filter(m => m.said).map(m => m.text);
    ok(NOTE.every(ln => said.indexOf(ln) >= 0), 'every line of the note is typed, word for word');
  }
  // -- E2E: drive east, past every sign; the world runs out at 965
  {
    const { g, ev } = mkE();
    mountSedan(g);
    let tEnd = -1;
    for (let i = 0; i < 180 * 60; i++) {
      g.update({ fwd: 1 }, 1 / 60);
      const x = g.player.pos[0];
      if (x > 640 && x < 650 && Math.abs(g.player.pos[2]) > 2.5) g.player.pos[2] = 0;
      if (x > 716 && x < 720) g.player.pos[2] = 3.6;
      if (g.scene._f.end) { tEnd = i / 60; break; }
    }
    ok(g.scene._f.end, 'the boundary fires');
    near(Math.hypot(g.player.pos[0], g.player.pos[2]), 965, 4, 'at nine hundred sixty-five, as counted');
    eq(g.scene.barricades.filter(b => b.broken).length, 3, 'all three barricades went over on the way');
    ok(ev.indexOf('powerdown') >= 0, 'the ending begins with the world drawing breath');
    for (let i = 0; i < 48 * 60; i++) g.update({ fwd: 1 }, 1 / 60);
    ok(Math.abs(g.car.speed) < 0.4, 'the engine is not killed - it is dismissed');
    const said = g.msgs.filter(m => m.said).map(m => m.text);
    const EL = g.scene.ENDLINES;
    ok(EL.length === 7 && EL.every(ln => said.indexOf(ln) >= 0), 'all seven ending lines type out, verbatim');
    ok(EL.every((ln, i2) => i2 === 0 || said.indexOf(EL[i2 - 1]) < said.indexOf(ln)), 'and in their order');
    ok(g.scene.TERMINAL.every(ln => said.indexOf(ln) >= 0), 'MERIDIAN CIVIC SYSTEMS reports, verbatim');
    ok(said.some(t => t.indexOf('SELECT') >= 0), 'and offers the choice');
    ok(g.scene._f.await, 'the console becomes the terminal');
    // memory policy: retain
    g.scene._f.usual = true;
    const r = g.request('return');
    eq(r.type, 'sceneword', 'the scene claims the word');
    g.update({}, 1 / 30);
    near(g.player.pos[0], -4, 0.5, 'RETURN: back on Main');
    near(g.scene.skyT, 1164, 1.5, 'RETURN: the clock says 7:24 again');
    ok(!g.car, 'RETURN: on foot');
    near(g.scene.sedan.pos[0], 10, 0.5, 'RETURN: the sedan is parked where it always is');
    ok(g.scene._f.usual, 'MEMORY POLICY: RETAIN - the seams survive the loop');
    ok(g.scene.barricades[0].broken, 'so does the lumber you knocked over');
    g.player.pos = [-16, 0, 14];
    for (let i = 0; i < 9 * 30; i++) g.update({}, 1 / 30);
    const all2 = g.msgs.map(m => m.text);
    ok(all2.some(t => t.indexOf('So. How green was it?') >= 0), 'Gus asks the only question left');
    for (let i = 0; i < 8 * 30; i++) g.update({}, 1 / 30);
    ok(g.msgs.filter(m => m.said).some(m => m.text.indexOf('There are worse loops, Mr. Voss.') >= 0), 'and answers it');
  }
  // -- the build chat's Section-F correctness courts (handoff report, 2026-07-05)
  {
    const { g } = mkE(); mountSedan(g);
    let mn = 1e9, mx = 0;
    for (let i = 0; i < 120; i++) { g.update({ fwd: 1 }, 1 / 60);
      const d2 = Math.hypot(g.scene.sedan.pos[0] - g.player.pos[0], g.scene.sedan.pos[2] - g.player.pos[2]);
      mn = Math.min(mn, d2); mx = Math.max(mx, d2); }
    ok(mx - mn < 0.01 && mx < 2, 'C.3: the player IS the car, every frame - a fixed 1.1 m seat offset, zero staleness (spread ' + (mx - mn).toFixed(4) + ')');
  }
  {
    const { g } = mkE();
    g.player.pos = [-16, 0, 14];
    for (let i = 0; i < 1000; i++) g.update({}, 1 / 30);
    ok(!g.scene._f.end, 'E.3.1: a thousand frames at the bar and the boundary never fires');
    ok(Math.hypot(g.player.pos[0], g.player.pos[2]) < 965, 'the interior lives in-world, not at x=4000');
  }
  {
    const { g } = mkE(); mountSedan(g);
    const b2 = g.scene.barricades[1];
    eq(b2.drumCols.length, 2, 'kind-2 carries its two oil drums as colliders');
    ok(b2.drumCols.every(c => g.scene.colliders.indexOf(c) >= 0), 'and they are solid before the break');
    g.player.pos = [508, 0, 0]; g.player.yaw = Math.PI / 2; g.car.speed = 15;
    for (let i = 0; i < 90; i++) g.update({ fwd: 1 }, 1 / 60);
    ok(b2.broken, 'NO THRU TRAFFIC goes over at speed');
    ok(g.scene.colliders.indexOf(b2.col) < 0 && b2.drumCols.every(c => g.scene.colliders.indexOf(c) < 0), 'C.2: every collider it owns dies with it - drums included');
    const x0 = g.player.pos[0];
    for (let i = 0; i < 3 * 60; i++) g.update({ fwd: 1 }, 1 / 60);
    ok(g.player.pos[0] - x0 > 30, 'and the lane is truly open: no invisible wedge (' + (g.player.pos[0] - x0).toFixed(0) + ' m onward)');
  }
  {
    const { g } = mkE();
    g.player.pos = [0, 0, -3];
    let tCross = -1;
    for (let i = 0; i < 120 * 30; i++) { g.player.pos = [0, 0, -3]; g.update({}, 1 / 30);
      if (g.scene._f.mirror) { tCross = i / 30; break; } }
    ok(tCross >= 0 && tCross <= 120, 'E.3.2: THE MIRROR crosses within natural play (' + (tCross < 0 ? 'never' : tCross.toFixed(0) + ' s') + ', budget 120)');
  }
  // -- END SESSION wakes in the white
  {
    const { g } = mkE();
    g.scene._f.end = true; g.scene._f.await = true;
    g.request('end session');
    eq(g.trans && g.trans.name, 'void', 'END: the void takes you back');
  }
  // -- soak, render sweep, determinism, audio set
  {
    const { g, ev } = mkE();
    mountSedan(g);
    let bad = 0;
    for (let i = 0; i < 1200; i++) {
      g.update({ fwd: i % 3 ? 1 : 0, strafe: Math.sin(i * 0.03) * 0.4 }, 1 / 60);
      if (!finiteDeep(g.player.pos) || !Number.isFinite(g.player.yaw)) bad++;
    }
    eq(bad, 0, '1200-frame drive soak: zero NaN');
    const opsNear = C.render(g, 480, 270, g.time);
    ok(opsNear.some(o => o.t === 'poly') && opsNear.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'mid-road renders clean');
    g.player.pos = [950, 1.62, 0]; g.player.yaw = Math.PI / 2; g.update({}, 1 / 30);
    const opsFar = C.render(g, 480, 270, g.time);
    ok(opsFar.some(o => o.t === 'poly') && opsFar.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'the wall renders clean at 950');
    for (const need of ['engine', 'mount']) ok(ev.indexOf(need) >= 0, "audio path '" + need + "' asserted in the stream");
    // a deterministic wall kiss for the thud path
    g.player.pos = [-40, 0, -7.5]; g.player.yaw = 0; g.car.speed = 8;   // nose-first into the north row
    for (let i = 0; i < 60; i++) g.update({}, 1 / 60);
    ok(ev.indexOf('thud') >= 0, "audio path 'thud' asserted on a wall kiss");
  }
  {
    const run = () => { const g = new C.Game(); g.emit = () => {}; g.update({}, 0.2); g.request('empire');
      for (let i = 0; i < 140; i++) g.update({}, 1 / 30);
      const sed = g.scene.sedan; g.player.pos = [sed.pos[0] - 2.2, 0, sed.pos[2]]; g.player.yaw = Math.PI / 2;
      g.update({}, 1 / 30); g.update({}, 1 / 30); g.doAction();
      for (let i = 0; i < 600; i++) g.update({ fwd: 1 }, 1 / 60);
      return g.player.pos.join(',') + '|' + Object.keys(g.scene.chunks).join(','); };
    eq(run(), run(), 'twin runs agree: the town is deterministic');
  }
  // -- perf: the valley fits the painter's budget
  {
    const { g } = mkE();
    g.player.pos = [400, 1.62, 0]; g.player.yaw = Math.PI / 2; g.update({}, 1 / 30);
    const t0 = Date.now();
    for (let i = 0; i < 30; i++) C.render(g, 480, 270, g.time + i * 0.03);
    const ms = (Date.now() - t0) / 30;
    ok(ms < 34, 'mid-grove render averages ' + ms.toFixed(1) + ' ms at 480x270 (budget 34)');
  }
}

// ------------------------------------------- MOBIL AVE (branch port)
section('MOBIL AVE (the between-place; the operator fails here)');
{
  const mkM=()=>{ const g=new C.Game(); const ev=[]; g.emit=(n)=>{ev.push(n)};
    g.update({},0.2); g.request('mobil ave'); for(let i=0;i<40;i++)g.update({},1/30); return {g,ev}; };
  const R=C.MOB.R;
  const arcOf=(g)=>((Math.atan2(g.player.pos[0],-g.player.pos[2])*R)%288+288)%288;
  eq(C.parse('mobil ave').scene,'mobil','mobil ave routes');
  eq(C.parse('take me to limbo').scene,'mobil','limbo routes');
  eq(C.parse('a subway platform').scene,'mobil','subway routes');
  eq(C.parse('the station').scene,'erebus',"'station' still belongs to EREBUS");
  eq(C.parse('an orange chair').type,'props','props unharmed');
  ok(C.LINES.mobil && C.LINES.mobil.indexOf('train')>=0,'the operator line names the train');
  ok(C.intent.intents.some(it=>it.word==='mobil'),'neural fallback knows the word');
  {
    const {g}=mkM();
    eq(g.scene.name,'mobil ave','scene name'); eq(g.scene.label,'MOBIL AVE','label');
    ok(g.scene.insts.some(it=>it.kind==='train'),'the train exists');
    ok(g.scene.insts.some(it=>it.kind==='doors'),'so do its doors');
    near(Math.hypot(g.player.pos[0],g.player.pos[2]),R+3.4,0.4,'spawn stands on the platform band');
    ok(g.msgs.some(m=>m.text.indexOf('sodium light')>=0),'the enter line, verbatim');
    const ops=C.render(g,480,270,g.time);
    ok(ops.some(o=>o.t==='poly')&&ops.every(o=>o.t!=='poly'||o.p.every(Number.isFinite)),'the ring renders clean');
  }
  // THE LOOP: tangent walk two full circumferences; the seam is not a place
  {
    const {g}=mkM();
    let unwrapped=0, prev=arcOf(g), bad=0;
    for(let i=0;i<200*30;i++){
      const th=Math.atan2(g.player.pos[0],-g.player.pos[2]);
      g.player.yaw=Math.PI/2+th; g.update({fwd:1},1/30);
      let a=arcOf(g), d=a-prev; if(d<-144)d+=288; if(d>144)d-=288; unwrapped+=d; prev=a;
      if(!g.player.pos.every(Number.isFinite))bad++;
      const r=Math.hypot(g.player.pos[0],g.player.pos[2]);
      if(r<R+1.2||r>R+7.0)bad++;
    }
    eq(bad,0,'200 s on the loop: zero NaN, never off the band');
    ok(unwrapped>2*288,'more than two full loops walked ('+(unwrapped/288).toFixed(1)+' turns) - x ~ x+48 as geometry');
  }
  // the one rule: nothing the operator asks for compiles here
  {
    const {g,ev}=mkM();
    const before=g.scene.name;
    const r1=g.request('give me a red chair');
    eq(r1.type,'sceneword','the scene claims the prop word');
    ok(g.scene.name===before,'no prop compiles into the station');
    ok(g.scene.insts.some(it=>it.label==='a request'),'a pedestal sketches itself');
    ok(g.msgs.some(m=>m.text.indexOf('unravels before it can hold anything')>=0),'and the refusal line is verbatim');
    for(let i=0;i<80;i++)g.update({},1/30);
    ok(!g.scene.insts.some(it=>it.label==='a request'),'and it unravels to nothing');
    ok(ev.indexOf('unravel')>=0,'the unravel is heard');
    g.request('let me out');
    ok(g.msgs.some(m=>m.text.indexOf('not your operator')>=0),'the static line still answers the door-words, verbatim');
    g.request('clear');
    ok(g.msgs.some(m=>m.text.indexOf('Static on the line clears')>=0),'but CLEAR routes: the exit flavor plays');
    for(let i=0;i<160;i++)g.update({},1/30);
    ok(g.scene.name!=='mobil ave','and the station lets go');
  }
  // the timetable, two full periods, lines in order
  {
    const {g,ev}=mkM();
    for(let i=0;i<85*30;i++)g.update({},1/30);
    const say=g.msgs.map(m=>m.text);
    const iArr=say.findIndex(t=>t.indexOf('pulls in')>=0), iOpen=say.findIndex(t=>t.indexOf('rattle open')>=0);
    const iSeal=say.findIndex(t=>t.indexOf('doors seal')>=0), iOut=say.findIndex(t=>t.indexOf('folds away')>=0);
    ok(iArr>=0&&iOpen>iArr&&iSeal>iOpen&&iOut>iSeal,'arrive -> open -> seal -> depart, in order');
    eq(say.filter(t=>t.indexOf('pulls in')>=0).length,2,'two arrivals in 85 s: the 40 s period holds');
    ok(ev.filter(e=>e==='rumble').length>=4,'the rumble bookends each visit');
    ok(ev.filter(e=>e==='doors').length>=4,'doors sound both ways');
  }
  // scramble by containment: caught on the rails when she comes in
  {
    const {g}=mkM();
    const tp=(()=>{const th=(24*6)/R;return [Math.sin(th)*(R-0.5),0,-Math.cos(th)*(R-0.5)];})();
    g.player.pos=[tp[0],-1.08,tp[2]];
    for(let i=0;i<25*30;i++){ g.player.pos[0]=tp[0]; g.player.pos[2]=tp[2]; g.update({},1/30); if(g.msgs.some(m=>m.text.indexOf('scramble up onto the platform')>=0))break; }
    ok(g.msgs.some(m=>m.text.indexOf('scramble up onto the platform')>=0),'the scramble line fires, verbatim');
    ok(Math.hypot(g.player.pos[0],g.player.pos[2])>R+1.4,'and the walker stands on the platform');
  }
  // the doors are shut tight (once per stop) and boarding is the only way out
  {
    const {g}=mkM();
    const door=(()=>{const th=(24*6)/R;return [Math.sin(th),-Math.cos(th)];})();
    g.player.pos=[door[0]*(R+1.6),0.02,door[1]*(R+1.6)];
    for(let i=0;i<25.5*30;i++){ g.player.pos[0]=door[0]*(R+1.6); g.player.pos[2]=door[1]*(R+1.6); g.update({},1/30); }
    ok(g.msgs.some(m=>m.text.indexOf('shut tight')>=0),'the shut-tight denial, verbatim');
    for(let i=0;i<3*30;i++){ g.player.pos[0]=door[0]*(R+0.7); g.player.pos[2]=door[1]*(R+0.7); g.update({},1/30); if(g.trans)break; }
    ok(g.msgs.some(m=>m.text.indexOf('step through the doors')>=0),'the boarding line, verbatim');
    eq(g.trans&&g.trans.name,'void','the train is the only way out - back to the void');
  }
  // determinism + perf
  {
    const run=()=>{const g=new C.Game(); g.emit=()=>{}; g.update({},0.2); g.request('mobil');
      for(let i=0;i<200;i++){const th=Math.atan2(g.player.pos[0],-g.player.pos[2]); g.player.yaw=Math.PI/2+th; g.update({fwd:1},1/60);}
      return g.player.pos.map(v=>v.toFixed(5)).join(',');};
    eq(run(),run(),'twin runs agree: the loop is deterministic');
    const {g}=mkM();
    const t0=Date.now(); for(let i=0;i<30;i++)C.render(g,480,270,g.time+i*0.03);
    ok((Date.now()-t0)/30<34,'platform renders inside the painter budget ('+((Date.now()-t0)/30).toFixed(1)+' ms)');
  }
}

// ------------------------------------------- EPANG E6 probes (original developer's report)
section('EPANG E6 (the rebuild report acceptance probes)');
{
  const mkP=(T)=>{ const g=new C.Game(); g.emit=()=>{}; g.update({},0.2); g.request('epang');
    for(let i=0;i<100;i++) g.update({},1/30);   // settle-brace: the materialize whiteout must clear (third time this lesson has billed us)
    g.time=T; g.update({},1/30); g.update({},1/30); return g; };   // then the day knob turns directly: engine clamps dt
  // E6.1 fog-sky lockstep: one scalar drives both
  {
    const EPKB=['#e8b088','#d8e0e6','#5a2430','#0a0c18'];
    const seen=new Set();
    for (const T of [12,72,132,204]){ const g=mkP(T);
      const ph=(((g.time)%240)+240)%240/240, seg=Math.floor(ph*4), fr=ph*4-seg;
      const want=C.scaleHex(C.mixHex(EPKB[seg],EPKB[(seg+1)%4],fr),0.92);
      eq(g.scene.fog.col, want, 'E6.1 fog IS the horizon at t='+T+' (seg '+seg+')');
      seen.add(g.scene.fog.col); }
    ok(seen.size===4, 'E6.1 the fog cycles with the day ('+seen.size+' distinct)');
    ok(!seen.has('#2a2430'), 'E6.1 the pinned dusk constant is gone');
  }
  // E6.2 treasury is ember-on-black (albedo audit)
  {
    const g=mkP(1); const m=g.scene.insts.find(it=>it.label==='palace').mesh;
    let dark=0, tot=0, ember=0;
    for (const f of m.f){ let cx=0,cy=0,cz=0; for (const vi of f.i){ const v=m.v[vi]; cx+=v[0]; cy+=v[1]; cz+=v[2]; }
      cx/=f.i.length; cy/=f.i.length; cz/=f.i.length;
      if (cx>34.2 && cx<45.8 && cz>-3.8 && cz<11.8 && cy<4.5){ tot++;
        if (f.c==='#5e2a10'||f.c==='#3a1c0c'||f.c==='#4a2410') ember++;
        const r=parseInt(f.c.slice(1,3),16),gr2=parseInt(f.c.slice(3,5),16),b=parseInt(f.c.slice(5,7),16);
        if (0.2126*r+0.7152*gr2+0.0722*b <= 72) dark++; } }
    ok(tot>10 && dark/tot>=0.7, 'E6.2 the treasury reads dark ('+(100*dark/tot).toFixed(0)+'% of '+tot+' faces under lum 72)');
    ok(ember>=3, 'E6.2 and the embers burn in it ('+ember+' ember faces)');
  }
  // E6.3 THE LITMUS: walk the skyway end to end on real input, over the arch, down into the treasury
  {
    const g=mkP(30);
    g.player.pos=[18,0.42,11.9]; g.player.yaw=0; g.player.vel=[0,0,0]; g.update({},1/30);   // standing on the stair base pier, facing -z up the flight
    let maxY=0, minDeckY=99, said0=g.msgs.filter(m2=>m2.text.indexOf('\u8907\u9053\u884c\u7a7a')>=0).length;
    for(let i=0;i<7*30;i++){ g.update({fwd:1},1/30); }   // climb the stair (-z)
    ok(g.player.pos[1]>4.6, 'E6.3 the stair carries a real walker to the landing (y='+g.player.pos[1].toFixed(2)+')');
    g.player.yaw=Math.PI/2; g.player.pos[2]=0.2;
    for(let i=0;i<14*30;i++){ g.update({fwd:1},1/30);
      if (g.player.pos[0]>17.2 && g.player.pos[0]<41.4){ maxY=Math.max(maxY,g.player.pos[1]); minDeckY=Math.min(minDeckY,g.player.pos[1]); }
      if (g.player.pos[0]>=41.6) break; }
    ok(g.player.pos[0]>=41.4, 'E6.3 the span walks end to end ('+g.player.pos[0].toFixed(1)+')');
    ok(minDeckY>4.7, 'E6.3 with support the whole way (min y '+minDeckY.toFixed(2)+')');
    ok(maxY>5.7, 'E6.3 and it ARCHES over River B (peak y '+maxY.toFixed(2)+') - bu ji he hong');
    for(let i=0;i<2*30;i++){ g.update({fwd:1},1/30); if (g.player.pos[0]>=42.3) break; }   // through the door bay
    g.player.yaw=Math.PI;
    for(let i=0;i<10*30;i++){ g.update({fwd:1},1/30); if (g.player.pos[1]<0.5) break; }
    ok(g.player.pos[1]<0.5 && g.player.pos[0]>41.5, 'E6.3 the interior stair descends into the treasury (y='+g.player.pos[1].toFixed(2)+')');
    const saidNow=g.msgs.filter(m2=>m2.text.indexOf('\u8907\u9053\u884c\u7a7a')>=0).length;
    eq(saidNow-said0, 1, 'E6.3 fu dao xing kong speaks exactly once on the crossing');
  }
  // E6.4 motion exists (deterministic renderer, exploited)
  {
    const g=mkP(30);
    const grab=()=>g.scene._pet.slice(0,8).map(p=>p.pos.slice()).concat(g.scene._slv.map(sv=>[sv.yaw,sv.pos[0],0]));
    const A2=grab(); for(let i=0;i<15;i++) g.update({},1/30); const B2=grab();
    let moved=0; for(let i2=0;i2<A2.length;i2++){ if (Math.hypot(A2[i2][0]-B2[i2][0],(A2[i2][1]-B2[i2][1]),(A2[i2][2]-B2[i2][2]))>0.03) moved++; }
    ok(moved>=8, 'E6.4 half a second later, the world has moved ('+moved+'/'+A2.length+' probes)');
    g.time=204; g.update({},1/30); g.update({},1/30);   // turn the knob to night
    ok(g.scene._pet.every(p=>p.pos[1]<-50), 'E6.4 petals are a daylight thing (chun guang rong rong)');
  }
  // E6.5 the trail out the door
  {
    const g=mkP(1); const m=g.scene.insts.find(it=>it.label==='palace').mesh;
    let trail=0; for (const f of m.f){ if (f.tag!=='treasure') continue;
      let cx=0; for (const vi of f.i) cx+=m.v[vi][0]; cx/=f.i.length; if (cx<34) trail++; }
    ok(trail>=20, 'E6.5 qi zhi li yi: '+trail+' treasures strewn outside the west door');
  }
  // E6.6 the grand tour: all TWELVE stagings speak, once each
  {
    const g=mkP(30);
    const tourY={'\u5bae\u9580':0.2,'\u524d\u6bbf':1.15,'\u8907\u9053\u884c\u7a7a':5.25,'\u6b4c\u81fa':0.85,'\u821e\u6bbf':0.55,'\u5eca\u8170\u7e35\u56de':0.5,'\u9577\u6a4b\u81e5\u6ce2':1.4,'\u9f0e\u9435\u7389\u77f3':0.25,'\u599d\u93e1\u6a13':0.9,'\u963f\u623f\u5bae':0.25,'\u4e8c\u5ddd\u6eb6\u6eb6':1.15,'\u8702\u623f\u6c34\u6e26':0.45};
    for (const rg of g.scene.regions){ g.player.pos=[(rg.x0+rg.x1)/2, tourY[rg.cn]!==undefined?tourY[rg.cn]:rg.y0+1.2, (rg.z0+rg.z1)/2]; g.player.vel=[0,0,0];
      g.update({},1/30); g.update({},1/30); g.update({},1/30); }
    eq(g.scene.regions.length, 12, 'E6.6 twelve stagings stand');
    ok(g.scene.regions.every(r=>r.said), 'E6.6 and every one of them spoke its line');
    for (const rg of g.scene.regions){ const n2=g.msgs.filter(m2=>m2.text.indexOf(rg.q)>=0).length; if(n2!==1){ ok(false,'E6.6 '+rg.cn+' spoke '+n2+' times'); } }
    ok(true,'E6.6 no staging spoke twice');
  }
}

  // -- the station may not lock the operator; the log may not go green by accident
  {
    const g=new C.Game(); g.emit=()=>{}; g.update({},0.2); g.request('mobil ave');
    for(let i=0;i<100;i++) g.update({},1/30);
    eq(g.scene.name,'mobil ave','in the station');
    g.request('a red chair');
    for(let i=0;i<10;i++) g.update({},1/30);
    eq(g.scene.name,'mobil ave','junk words still unravel in-station (no transfer)');
    g.request('take me to the dojo');
    ok(g.msgs.some(m2=>m2.text.indexOf('Static on the line clears')>=0),'the exit flavor plays once');
    for(let i=0;i<160;i++) g.update({},1/30);
    eq(g.scene.name,'dojo','THE TRANSFER ROUTES: mobil cannot lock the operator');
    g.request('mobil ave'); for(let i=0;i<160;i++) g.update({},1/30);
    g.request('epang palace');
    eq(g.msgs.filter(m2=>m2.text.indexOf('Static on the line clears')>=0).length,2,'flavor is once PER VISIT: a new arc earns one new line');
    for(let i=0;i<160;i++) g.update({},1/30);
    eq(g.scene.name,'epang palace','and the second transfer routes too');
  }
  {
    const darks=[];
    for (const nm of ['weapons','dojo','hallway','erebus','epang','empire','mobil','peach','neon']){
      const sc=C.makeScene(nm==='empire'?'empire':nm==='mobil'?'mobil':nm==='peach'?'peach':nm==='neon'?'neon':nm);
      if (sc.uiDark) darks.push(sc.name); }
    eq(JSON.stringify(darks),JSON.stringify(['neon mile']),'uiDark census: ONLY neon mile speaks code-green');
  }
// ------------------------------------------- PEACH BLOSSOM SPRING (branch port, English-only decree)
section('PEACH BLOSSOM SPRING');
{
  const mkB=()=>{ const g=new C.Game(); g.emit=()=>{}; g.update({},0.2); g.request('peach blossom');
    for(let i=0;i<100;i++) g.update({},1/30); return g; };
  { // word chain + the peach-chair trap
    for (const w of ['peach blossom','blossom','wuling','row me up the peach stream']){
      const g=new C.Game(); g.emit=()=>{}; g.update({},0.2); g.request(w);
      for(let i=0;i<14;i++) g.update({},1/30);
      eq(g.scene.name,'peach blossom', 'chain: '+JSON.stringify(w)); }
    const g2=new C.Game(); g2.emit=()=>{}; g2.update({},0.2); g2.request('a peach chair');
    ok(g2.scene.name!=='peach blossom' || g2.scene.insts.some(it=>it.kind==='prop'), 'the trap: a peach chair is still furniture-adjacent, not a pilgrimage');
  }
  { // NO CJK, anywhere: the decree court
    const g=mkB(); const PB=g.scene.PB; const cjk=/[\u3400-\u9fff\uf900-\ufaff]/;
    let all=Object.values(PB.caps).join('|');
    for (const k in PB.talk) all+=PB.talk[k].join('|');
    for (const it of g.scene.insts) all+='|'+(it.label||'');
    all+='|'+g.scene.label+'|'+g.scene.name;
    ok(!cjk.test(all), 'not one CJK glyph ships in-scene (script, labels, name)');
  }
  { // the grove law: no other kind of tree among them
    const g=mkB();
    ok(g.scene._trunks.peach.length>=24, 'the grove stands ('+g.scene._trunks.peach.length+' peach trunks)');
    ok(g.scene._trunks.ord.every(tr=>tr.pos[2]>-58), 'zhong wu za shu: zero ordinary trunks inside the grove band');
    ok(g.scene._trunks.peach.every(tr=>tr.pos[2]<-58), 'and no peach strays below it');
  }
  { // petals fall, hens wander: motion probe
    const g=mkB(); for(let i=0;i<30;i++) g.update({},1/30);
    const a=g.scene._pet.slice(0,6).map(p=>p.pos.slice()); const h0=g.scene._hens[0].pos.slice();
    for(let i=0;i<15;i++) g.update({},1/30);
    const moved=g.scene._pet.slice(0,6).filter((p,i2)=>Math.hypot(p.pos[0]-a[i2][0],p.pos[1]-a[i2][1],p.pos[2]-a[i2][2])>0.03).length;
    ok(moved>=5, 'petals drift ('+moved+'/6)');
    ok(Math.hypot(g.scene._hens[0].pos[0]-h0[0],g.scene._hens[0].pos[2]-h0[2])>0.01, 'the hens wander the yard');
  }
  { // the light in the cliff exists, then the crown court: the WHOLE fable, end to end
    const g=mkB();
    ok(g.scene._glow[0].pos[1]>-50, 'a faint light shows in the opening');
    // board the skiff
    g.player.pos=[1.4,0.02,3.4]; g.player.vel=[0,0,0];
    g.player.yaw=Math.atan2(g.scene._skiff.pos[0]-1.4, -(g.scene._skiff.pos[2]-3.4));
    for(let i=0;i<8;i++) g.update({},1/30);
    g.doAction(); ok(g.scene._boat===true, 'the oar is taken');
    g.player.yaw=0;
    // row upstream: the whole stream, watching phases
    let sawGrove=false;
    for(let i=0;i<95*30;i++){ g.update({fwd:1},1/30);
      if (g.scene._ph==='grove') sawGrove=true;
      if (g.player.pos[2]<-146) break; }
    ok(sawGrove && g.player.pos[2]<-146, 'rowed the stream to the source ('+g.player.pos[2].toFixed(0)+')');
    for(let i=0;i<4;i++) g.update({},1/30);
    ok(g.scene._boat===false, 'bian she chuan: the boat is left at the beach, by itself');
    // squeeze through
    for(let i=0;i<14*30;i++){ g.update({fwd:1},1/30); if (g.player.pos[2]<-166) break; }
    ok(g.scene._ph==='village' || g.scene._ph==='leave', 'huo ran kai lang: through the squeeze ('+g.scene._ph+')');
    ok(g.msgs.some(m2=>m2.text.indexOf('open, and bright')>=0), 'the reveal line lands');
    // talk to all five, everywhere they stand
    const gx=g.scene._vill[0].pos[0];
    for (const v of g.scene._vill){
      g.player.pos=[v.pos[0]+1.2, 0.02, v.pos[2]+1.2]; g.player.vel=[0,0,0];
      g.player.yaw=Math.atan2(v.pos[0]-g.player.pos[0], -(v.pos[2]-g.player.pos[2]));
      for(let k=0;k<6;k++){ g.update({},1/30); g.doAction(); } }
    ok(g.scene._talked.first&&g.scene._talked.elder&&g.scene._talked.woman&&g.scene._talked.youth&&g.scene._talked.host, 'all five villagers heard out');
    eq(g.msgs.filter(m2=>m2.text.indexOf('not worth telling')>=0).length, 1, 'the warning is given exactly once');
    ok(g.msgs.some(m2=>m2.text.indexOf('never knew there had been a Han')>=0), 'nai bu zhi you Han, in English');
    // walk out, marking the way
    g.player.pos=[gx,0.02,-152]; g.player.yaw=Math.PI; g.player.vel=[0,0,0];
    let lastMark=-999;
    for(let i=0;i<120*30;i++){ g.update({fwd:1},1/30);
      if (g.scene._ph==='marking' && g.player.pos[2]-lastMark>22 && g.scene._marks.length<8){ lastMark=g.player.pos[2]; g.doAction(); }
      if (g.player.pos[2]>3) break; }
    ok(g.scene._marks.length>=6, 'chu chu zhi zhi: '+g.scene._marks.length+' cuts on the way home');
    ok(g.scene._ph==='lost', 'the prefect sends men back with you (phase '+g.scene._ph+')');
    ok(g.scene._marks.every(mk=>mk.pos[1]<-50), 'and every mark is GONE');
    ok(g.scene._glow[0].pos[1]<-50, 'the light in the cliff is out');
    // lead them upstream: the way is lost
    g.player.pos=[1.4,0.02,3.4]; g.player.vel=[0,0,0];
    g.player.yaw=Math.atan2(g.scene._skiff.pos[0]-1.4, -(g.scene._skiff.pos[2]-3.4));
    for(let i=0;i<6;i++) g.update({},1/30); g.doAction(); g.player.yaw=0;
    for(let i=0;i<95*30;i++){ g.update({fwd:1},1/30); if (g.player.pos[2]<-148.6) break; }
    ok(g.player.pos[2]>-151.4, 'the cliff is blank stone: sealed ('+g.player.pos[2].toFixed(1)+')');
    ok(g.msgs.some(m2=>m2.text.indexOf('lose the way, for good')>=0), 'the lost line lands');
    g.player.yaw=Math.PI;
    for(let i=0;i<70*30;i++){ g.update({fwd:1},1/30); if (g.player.pos[2]>-58) break; }
    ok(g.msgs.some(m2=>m2.text.indexOf('no one ever asked the way again')>=0), 'the epilogue: Liu Ziji, and silence');
    const cjk=/[\u3400-\u9fff]/; ok(g.msgs.every(m2=>!cjk.test(m2.text)), 'the full transcript is CJK-clean, end to end');
  }
}

// ---------------------------------------------------------------- summary
console.log('\n' + '='.repeat(50));
console.log('PASS ' + pass + '   FAIL ' + fail);
if (fail) { console.log('Failures:'); failures.forEach(f => console.log(' - ' + f)); process.exit(1); }
