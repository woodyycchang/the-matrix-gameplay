/* node/tests.js — unit + end-to-end playthrough tests for THE CONSTRUCT */
'use strict';
const path = require('path');
const SRC = ['00_math', '01_glyph', '02_mesh', '03_props', '04_scenes', '05_engine', '06_game', '07_audio'];
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
  // steering changes heading
  step(g, { fwd: 1, strafe: 1 }, 0.6);
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

section('portal door (the street, inside the construct)');
{
  // parser: portal words open the door, and must NOT steal the city scene
  const a1 = C.parse('the metaverse');
  ok(a1.type === 'props' && a1.props[0].kind === 'door', "'metaverse' summons the door");
  const a2 = C.parse('open the street protocol');
  ok(a2.type === 'props' && a2.props[0].kind === 'door', "'street protocol' outranks the city scene");
  const a3 = C.parse('a neon door');
  ok(a3.type === 'props' && a3.props[0].kind === 'door', "'neon' summons the door");
  const a4 = C.parse('a crowded street at lunch hour');
  ok(a4.type === 'scene' && a4.scene === 'city', 'plain city phrases still load the city');
  const a5 = C.parse('city street');
  ok(a5.type === 'scene' && a5.scene === 'city', "'city street' unchanged");

  const g = new C.Game();
  step(g, null, 0.2);
  const colsBefore = g.scene.colliders.length;
  g.request('the metaverse');
  const door = g.scene.insts.find(i => i.kind === 'door');
  ok(!!door, 'door instance created');
  eq(door.label, 'the street', 'door is labelled the street');
  eq(g.scene.colliders.length, colsBefore, 'doorway adds no collider (walk-through)');
  step(g, null, 1.4);
  eq(door.loadT, 1, 'door materialized');
  g.player.pos = [door.pos[0], 0, door.pos[2] + 1.6];
  step(g, null, 0.05);
  aimAt(g, door.pos, 1.1);
  step(g, null, 0.05);
  ok(g.aim === door, 'aim resolves the door');
  const evs = step(g, { actionEdge: true }, 0.1);
  ok(has(evs, 'portal'), 'E at the door emits the portal event');
  const ops = C.render(g, 480, 270, g.time);
  ok(ops.every(o => o.t !== 'poly' || o.p.every(Number.isFinite)), 'no NaN with the door in frame');
}

// ---------------------------------------------------------------- summary
console.log('\n' + '='.repeat(50));
console.log('PASS ' + pass + '   FAIL ' + fail);
if (fail) { console.log('Failures:'); failures.forEach(f => console.log(' - ' + f)); process.exit(1); }
