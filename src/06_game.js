/* THE CONSTRUCT — 06_game.js — state, physics, parser, fx (pure) */
(function (G) {
  'use strict';
  var C = G.C, P = C.props;

  // -------- operator script (all original) --------
  var L = C.LINES = {
    boot1: 'Construct online. White, empty, obedient.',
    boot2: 'Ask for what you need. Voice or text, whichever you prefer.',
    weapons: 'Armory request received. Mind the racks.',
    dojo: 'Sparring program loaded. The dummy forgives. Eventually.',
    rooftop: 'Jump program. You cannot be hurt here. run, jump, fly.',
    city: 'Crowd simulation, lunch hour. Eyes forward.',
    hallway: 'Loading a corridor. Third floor of nowhere. Watch the doorway.',
    erebus: 'Docking at Erebus station. Three decks. Mind the reactor deck.',
    epang: 'Loading the palace. Twelve courts by the rhapsody. Mind the two rivers.',
    clear: 'Wiping the room.',
    codeOn: 'Dropping the render layer. This is what it really looks like.',
    codeOff: 'Restoring the skin.',
    fall1: 'Breathe. you are fine. The street is code; nothing here can hurt you.',
    fall2: 'All good. Reset when ready. the jump will still be there.',
    reload: 'Reloading the jump.',
    roofHint: 'Long run-up, big jump. The landing is guaranteed. enjoy the air.',
    again: 'Again.',
    success: 'Clean landing. Don\u2019t tell your knees the floor isn\u2019t real.',
    successFirst: 'First try. That is not supposed to happen.',
    gun: 'Sidearm loaded. Handle with intent.',
    booth: 'There\u2019s the exit. Pick up when you\u2019re ready.',
    hangup: 'Hanging up. Back to white.',
    lesson: 'You looked. Everyone does.',
    mirror: 'Mirrors are expensive. Enjoy the budget version.',
    bike: 'Two wheels. The walls have opinions. respect them.',
    katana: 'A blade. Quiet and honest.',
    neon: 'A mile of wet light and a bike at the line. Twist the throttle.',
    empire: 'Angel City, June 1937, 7:24 in the evening. The road east is closed. That is the point.',
    sedan: 'Four doors, June plates. She starts on the first crank.',
    help: 'Try: weapons \u00b7 dojo \u00b7 rooftop \u00b7 a hallway \u00b7 erebus station \u00b7 the palace \u00b7 angel city 1937 \u00b7 city street \u00b7 "a red chair" \u00b7 clear. Press C for code vision.'
  };

  // -------- parser --------
  var NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1, couple: 2, few: 3, pair: 2, some: 3 };
  var PROPS = {
    chair: 'chair', chairs: 'chair', armchair: 'chair', seat: 'chair',
    table: 'table', tables: 'table', desk: 'table',
    tv: 'tv', television: 'tv', screen: 'tv', monitor: 'tv',
    lamp: 'lamp', lamps: 'lamp',
    tree: 'tree', trees: 'tree', plant: 'tree',
    car: 'car', cars: 'car',
    crate: 'crate', crates: 'crate', box: 'crate', boxes: 'crate',
    phone: 'booth', telephone: 'booth', booth: 'booth', exit: 'booth',
    dummy: 'dummy',
    mirror: 'mirror', mirrors: 'mirror',
    bench: 'bench', benches: 'bench',
    lamppost: 'lamppost', streetlight: 'lamppost',
    fountain: 'fountain',
    motorcycle: 'bike', motorbike: 'bike', motorcycles: 'bike', motor: 'bike', bike: 'bike', bikes: 'bike',
    katana: 'katana', sword: 'katana', swords: 'katana', blade: 'katana',
    pedestal: 'pedestal'
  };
  var SCENEKEYS = [
    [/\b(clear|dismiss|empty|reset|nothing|wipe)\b/, 'clear'],
    [/\b(gun|guns|weapon|weapons|armory|arsenal|rifle|rifles|pistols)\b/, 'weapons'],
    [/\b(hallway|corridor|dejavu|deja|vu|doors)\b/, 'hallway'],
    [/\b(erebus|station|tower)\b/, 'erebus'],
    [/\b(epang|palace)\b/, 'epang'],
    [/\b(orange empire|empire|1937|angel city|citrus|nostalgia|nostalgic)\b/, 'empire'],
    [/\b(dojo|spar|sparring|kung|fight|fighting|train)\b/, 'dojo'],
    [/\b(jump|roof|rooftop|rooftops|ledge|leap)\b/, 'rooftop'],
    [/\b(neon|cyber|cyberpunk|highway|ride|riding|moto|motorway|nightrun|mile)\b/, 'neon'],
    [/\b(city|crowd|crowded|lunch|downtown|people|pedestrians)\b/, 'city']
  ];
  C.parse = function (text) {
    var s = String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return { type: 'none' };
    if (/\bhelp\b/.test(s)) return { type: 'help' };
    if (/\b(code|vision|digital|glyphs?)\b/.test(s) && !/\bdress\b/.test(s)) return { type: 'code' };
    for (var i = 0; i < SCENEKEYS.length; i++) {
      if (SCENEKEYS[i][0].test(s)) {
        var sc = SCENEKEYS[i][1];
        return sc === 'clear' ? { type: 'clear' } : { type: 'scene', scene: sc };
      }
    }
    var toks = s.split(' '), props = [], pending = 1, found = false, lastK = -9;
    for (var k = 0; k < toks.length; k++) {
      var tk = toks[k];
      if (NUM[tk] != null) { pending = NUM[tk]; continue; }
      if (/^\d+$/.test(tk)) { pending = Math.min(12, parseInt(tk, 10) || 1); continue; }
      if (PROPS[tk]) {
        // "phone booth", "tv screen": adjacent tokens naming the same thing are one noun
        if (k === lastK + 1 && props.length && props[props.length - 1].kind === PROPS[tk]) { lastK = k; continue; }
        props.push({ kind: PROPS[tk], n: Math.min(12, pending) }); pending = 1; found = true; lastK = k;
      }
    }
    if (found) return { type: 'props', props: props };
    // unknown: pick the longest contentful token as the label
    var stop = { the: 1, give: 1, me: 1, i: 1, want: 1, need: 1, please: 1, load: 1, make: 1, get: 1, us: 1, my: 1, and: 1, with: 1, of: 1, in: 1, on: 1, big: 1, red: 1, blue: 1, green: 1, small: 1 };
    var best = '';
    for (var k2 = 0; k2 < toks.length; k2++) if (!stop[toks[k2]] && toks[k2].length > best.length) best = toks[k2];
    return { type: 'unknown', word: best || s.slice(0, 12) };
  };

  // -------- helpers --------
  function yawToward(from, to) { return Math.atan2(to[0] - from[0], -(to[2] - from[2])); }
  function fwdOf(yaw, pitch) {
    var cp = Math.cos(pitch || 0);
    return [Math.sin(yaw) * cp, Math.sin(pitch || 0), -Math.cos(yaw) * cp];
  }
  C.yawToward = yawToward; C.fwdOf = fwdOf;

  function rayBox(o, d, b, tmax) {
    var t0 = 0, t1 = tmax;
    for (var a = 0; a < 3; a++) {
      var inv = 1 / (d[a] || 1e-9);
      var ta = (b.min[a] - o[a]) * inv, tb = (b.max[a] - o[a]) * inv;
      if (ta > tb) { var tmp = ta; ta = tb; tb = tmp; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return -1;
    }
    return t0 > 0.01 ? t0 : -1;
  }

  // -------- Game --------
  function Game() {
    this.time = 0;
    this.mode = 'normal';
    this.scene = C.makeScene('void');
    this.sceneName = 'construct';
    this.player = { pos: [0, 0, 0], vel: [0, 0, 0], yaw: 0, pitch: 0, grounded: true, coyote: 0, phase: 0, lastGroundX: 0, lastGroundY: 0 };
    this.cam = { pos: [0, 1.62, 0], yaw: 0, pitch: 0, roll: 0 };
    this.state = 'play'; // play | down | rising | frozen
    this.flags = { firstFallDone: false, lessonDone: false, attempts: 0, successDone: false, hinted: false };
    this.fx = { flash: 0, flashCol: '#ffffff', vig: 0, vigCol: '#7a1010', cracks: null, crackA: 0, slowmo: 1, slowTarget: 1, bars: 0, stamp: null, stampA: 0, bursts: [], heart: 0, painLinger: 0, camDip: 0, codeFlash: 0 };
    this.held = null;
    this.bike = null;
    this.msgs = [];
    this.events = [];
    this.trans = null;
    this.aim = null;
    this.crowd = null;
    this.crowdMax = 40;
    this._burstSeed = 1;
    this._downT = 0; this._riseT = 0; this._postRise = -1;
    this._fallFromRoof = false;
    this._airFromA = false;
    this._redTimer = 9; this._dwell = 0; this._frozenT = 0;
    this._boothRing = false;
    this.say(L.boot1, 0.6);
    this.say(L.boot2, 2.4);
  }
  C.Game = Game;

  Game.prototype.emit = function (name, v) { this.events.push({ name: name, v: v, t: this.time }); if (this.events.length > 64) this.events.shift(); };
  Game.prototype.drain = function () { var e = this.events; this.events = []; return e; };
  Game.prototype.say = function (text, delay) {
    this.msgs.push({ text: text, at: this.time + (delay || 0), said: false });
  };

  Game.prototype.toggleCode = function () {
    this.mode = this.mode === 'code' ? 'normal' : 'code';
    this.fx.codeFlash = 1;
    this.emit(this.mode === 'code' ? 'codeOn' : 'codeOff');
    this.say(this.mode === 'code' ? L.codeOn : L.codeOff);
  };

  // ----- requests -----
  Game.prototype.request = function (text) {
    // scene-local console hook: an armed scene may claim the raw word (the empire terminal)
    if (this.scene && this.scene.onWord && this.scene.onWord(this, String(text || ''))) return { type: 'sceneword' };
    var a = C.parse(text);
    if (a.type === 'none') return a;
    if (a.type === 'help') { this.say(L.help); return a; }
    if (a.type === 'code') { this.toggleCode(); return a; }
    if (a.type === 'clear') { this.transition('void', L.clear); return a; }
    if (a.type === 'scene') {
      var line = { weapons: L.weapons, dojo: L.dojo, rooftop: L.rooftop, city: L.city, hallway: L.hallway, erebus: L.erebus, epang: L.epang, empire: L.empire }[a.scene];
      this.transition(a.scene, line);
      return a;
    }
    if (a.type === 'props') { this.spawnProps(a.props); return a; }
    if (a.type === 'unknown') {
      this.say(L.unknownFor ? L.unknownFor(a.word) : ('No template for \u201c' + a.word + '\u201d. Compiling a placeholder.'));
      this.spawnProps([{ kind: 'pedestal', n: 1, label: a.word }]);
      return a;
    }
    return a;
  };

  Game.prototype.transition = function (name, line) {
    var self = this;
    // begin dismissal of current props
    for (var i = 0; i < this.scene.insts.length; i++) {
      var it = this.scene.insts[i];
      if (it.kind !== 'ground') { it.loadDir = -1; }
    }
    this.trans = { name: name, t: 0, line: line };
    this.emit('whoosh');
  };

  Game.prototype._swapScene = function (name) {
    var sc = C.makeScene(name === 'void' ? 'void' : name);
    this.scene = sc;
    this.sceneName = sc.name;
    var p = this.player;
    p.pos = sc.spawn.pos.slice(); p.vel = [0, 0, 0];
    p.yaw = sc.spawn.yaw; p.pitch = 0; p.grounded = true; p.coyote = 0;
    this.held = null;
    this.bike = null;
    this.car = null;
    this.state = 'play';
    this._fallFromRoof = false; this._airFromA = false;
    this.flags.successDone = false;
    this.fx.slowmo = 1; this.fx.slowTarget = 1; this.fx.vig = 0; this.fx.crackA = 0;
    this._boothRing = false;
    // stagger materialization
    for (var i = 0; i < sc.insts.length; i++) {
      var it = sc.insts[i];
      if (it.kind === 'ground') continue;
      it.loadT = 0; it.loadDir = 1;
      it._delay = it.delay + (it.slideFrom ? 0 : i * 0.03);
    }
    if (name === 'city') this.initCrowd(sc);
    if (name === 'rooftop' && this.flags.firstFallDone && !this.flags.hinted) {
      this.flags.hinted = true; this.say(L.roofHint, 1.2);
    }
    this.emit('scene', name);
    this.emit('ambience', sc.ambience);
  };

  Game.prototype.spawnProps = function (list) {
    var p = this.player, fw = fwdOf(p.yaw, 0);
    var total = 0; for (var i = 0; i < list.length; i++) total += list[i].n;
    var idx = 0;
    for (var i2 = 0; i2 < list.length; i2++) {
      var item = list[i2];
      for (var n = 0; n < item.n; n++) {
        var spread = total > 1 ? (idx / Math.max(1, total - 1) - 0.5) * Math.min(2.2, 0.5 * total) : 0;
        var dist = 2.6 + (total > 4 ? (idx % 2) * 1.4 : 0);
        var right = [fw[2] !== 0 || fw[0] !== 0 ? Math.cos(p.yaw) : 1, 0, Math.sin(p.yaw)];
        var pos = [p.pos[0] + fw[0] * dist + right[0] * spread,
                   this.scene.groundY,
                   p.pos[2] + fw[2] * dist + right[2] * spread];
        this.addProp(item.kind, pos, Math.atan2(p.pos[0] - pos[0], p.pos[2] - pos[2]), item.label, idx * 0.14);
        idx++;
      }
    }
    this.emit('materialize');
  };

  Game.prototype.addProp = function (kind, pos, yaw, label, delay) {
    // nudge sideways if the spot is already occupied (stacked requests)
    var insts0 = this.scene.insts, ry = yaw + Math.PI / 2, rx = Math.sin(ry), rz = -Math.cos(ry);
    var offs = [[0, 0], [1.4, 0], [-1.4, 0], [0, 1.5], [2.6, 0], [-2.6, 0]];
    for (var oi = 0; oi < offs.length; oi++) {
      var cx2 = pos[0] + rx * offs[oi][0] - Math.sin(yaw) * offs[oi][1];
      var cz2 = pos[2] + rz * offs[oi][0] + Math.cos(yaw) * offs[oi][1];
      var clear = true;
      for (var ci2 = 0; ci2 < insts0.length; ci2++) {
        var ex2 = insts0[ci2];
        if (ex2.kind === 'ground' || ex2.kind === 'world' || ex2.loadT <= 0) continue;
        var ddx2 = ex2.pos[0] - cx2, ddz2 = ex2.pos[2] - cz2;
        if (ddx2 * ddx2 + ddz2 * ddz2 < 0.9) { clear = false; break; }
      }
      if (clear) { pos = [cx2, pos[1], cz2]; break; }
    }
    var mesh, lbl = label || kind, k = 'prop';
    switch (kind) {
      case 'chair': mesh = P.chair(); break;
      case 'table': mesh = P.table(); break;
      case 'tv': mesh = P.tv(); break;
      case 'lamp': mesh = P.lamp(); break;
      case 'tree': mesh = P.tree(50 + ((this._burstSeed++) % 7)); break;
      case 'car': mesh = P.car('#5a6a72'); break;
      case 'crate': mesh = P.crate(); break;
      case 'booth': mesh = P.booth(); k = 'booth'; lbl = 'exit'; break;
      case 'dummy': mesh = P.dummy(); k = 'dummy'; break;
      case 'mirror': mesh = P.mirror(); this.say(L.mirror); break;
      case 'bike': mesh = P.bike(); k = 'bike'; lbl = 'motorcycle'; this.say(L.bike, 0.6); break;
      case 'katana': mesh = P.katanaStand(); k = 'katana'; lbl = 'katana'; this.say(L.katana, 0.6); break;
      case 'bench': mesh = P.bench(); break;
      case 'lamppost': mesh = P.lamppost(); break;
      case 'fountain': mesh = P.fountain(); break;
      default: mesh = P.pedestal(); k = 'pedestal'; break;
    }
    var it = C.inst(mesh, pos, yaw, { label: lbl, kind: k });
    it.loadT = 0; it.loadDir = 1; it._delay = delay || 0;
    this.scene.insts.push(it);
    var b = mesh.bounds;
    if (kind === 'booth' || kind === 'crate' || kind === 'table' || kind === 'car' || kind === 'fountain' || kind === 'dummy' || kind === 'pedestal' || kind === 'tv' || kind === 'bike') {
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var hw = Math.max(Math.abs(b.max[0]), Math.abs(b.min[0])), hd = Math.max(Math.abs(b.max[2]), Math.abs(b.min[2]));
      var r = kind === 'booth' ? 0.52 : (kind === 'bike' ? 0.55 : Math.max(hw, hd) * 0.8);
      var col = { min: [pos[0] - r, pos[1], pos[2] - r], max: [pos[0] + r, pos[1] + b.max[1], pos[2] + r] };
      if (kind === 'booth') { col.max[1] = pos[1] + 2.3; it._col = col; }
      if (kind === 'bike') { col.max[1] = pos[1] + 1.1; it._col = col; }
      this.scene.colliders.push(col);
    }
    if (kind === 'booth') { this._boothRing = true; this.emit('ring'); this.say(L.booth, 0.9); }
    if (kind === 'dummy') this.scene.dummyPos = pos.slice();
    return it;
  };

  // ----- crowd -----
  Game.prototype.initCrowd = function (sc) {
    var r = C.rng(2024), peds = [];
    var lanes = [-5.4, -3.6, -1.8, 1.8, 3.6, 5.4];
    for (var i = 0; i < this.crowdMax; i++) {
      var grey = 0.28 + r() * 0.4;
      var gs = C.rgb2hex(grey * 255, grey * 255, grey * 258 > 255 ? 255 : grey * 258);
      var sk = r();
      // render-tier mix: most pedestrians are low/mid budget, a few are full detail.
      // in a simulated world, background extras don't get rendered at full fidelity.
      var roll = r(), tier = roll < 0.45 ? 'terminal' : (roll < 0.8 ? 'retail' : 'custom');
      var mesh = P.human({ tier: tier, suit: gs, skin: C.rgb2hex(170 + sk * 44, 162 + sk * 40, 152 + sk * 36), hair: r() < 0.5 ? '#2c2c2e' : '#55504a', shirt: r() < 0.4 ? '#dddbd4' : null, seed: 300 + i });
      var dir = r() < 0.5 ? 1 : -1;
      var it = C.inst(mesh, [-44 + r() * 88, 0, lanes[(i % lanes.length)] + (r() - 0.5) * 0.7], dir > 0 ? Math.PI / 2 : -Math.PI / 2, { kind: 'ped', label: 'pedestrian' });
      it.pose = [0, 0, 0, 0, 0, 0];
      sc.insts.push(it);
      peds.push({ it: it, dir: dir, speed: 1.15 + r() * 0.55, ph: r() * 6.28 });
    }
    this.crowd = { peds: peds, red: null, agent: null };
    var self = this;
    sc.update = function (game, dt) {
      if (sc._streamCity) sc._streamCity(game);   // stream the infinite boulevard
      self.updateCrowd(dt);
    };
  };

  Game.prototype.updateCrowd = function (dt) {
    var cw = this.crowd; if (!cw) return;
    if (this.state === 'frozen') return;
    var p = this.player.pos;
    for (var i = 0; i < cw.peds.length; i++) {
      var pd = cw.peds[i], it = pd.it;
      if (it.loadT < 1) continue;
      it.pos[0] += pd.dir * pd.speed * dt;
      pd.ph += pd.speed * dt * 3.4;
      var dx = it.pos[0] - p[0], dz = it.pos[2] - p[2];
      var d2 = dx * dx + dz * dz;
      if (d2 < 2.1 && d2 > 0.0001) {
        it.pos[2] += (dz >= 0 ? 1 : -1) * dt * 1.6;
      }
      if (it.pos[0] > p[0] + 48) { it.pos[0] -= 96; }
      if (it.pos[0] < p[0] - 48) { it.pos[0] += 96; }
      var s = Math.sin(pd.ph);
      it.pose[1] = s * 0.5; it.pose[2] = -s * 0.5;
      it.pose[3] = -s * 0.38; it.pose[4] = s * 0.38;
      it.pos[1] = Math.abs(Math.cos(pd.ph)) * 0.035;
    }
    // red dress walker
    if (!this.flags.lessonDone) {
      if (!cw.red) {
        this._redTimer -= dt;
        if (this._redTimer <= 0) this.spawnRed();
      } else {
        var rd = cw.red, rit = rd.it;
        rit.pos[0] += rd.dir * 1.12 * dt;
        rd.ph += 3.4 * dt;
        var s2 = Math.sin(rd.ph);
        rit.pose[1] = s2 * 0.42; rit.pose[2] = -s2 * 0.42;
        rit.pose[3] = -s2 * 0.3; rit.pose[4] = s2 * 0.3;
        rit.pos[1] = Math.abs(Math.cos(rd.ph)) * 0.03;
        var bx = rit.pos[0] - p[0];
        if ((rd.dir > 0 && bx > 16) || (rd.dir < 0 && bx < -16)) { this.removeRed(); this._redTimer = 16; }
        // gaze dwell
        var fw = fwdOf(this.player.yaw, this.player.pitch);
        var to = [rit.pos[0] - this.cam.pos[0], rit.pos[1] + 1.2 - this.cam.pos[1], rit.pos[2] - this.cam.pos[2]];
        var dist = C.len(to);
        if (dist < 25) {
          var ang = Math.acos(C.clamp(C.dot(C.norm(to), fw), -1, 1));
          if (ang < 0.085) this._dwell += dt; else this._dwell = Math.max(0, this._dwell - dt * 1.5);
          if (this._dwell > 1.15) this.freezeLesson();
        }
      }
    }
  };

  Game.prototype.spawnRed = function () {
    var p = this.player, fw = fwdOf(p.yaw, 0);
    var sgn = fw[0] >= 0 ? 1 : -1;
    var mesh = P.redDress();
    var it = C.inst(mesh, [p.pos[0] + sgn * 20, 0, C.clamp(p.pos[2] + 1.2, -5.4, 5.4)], sgn > 0 ? -Math.PI / 2 : Math.PI / 2, { kind: 'red', label: 'her' });
    it.pose = [0, 0, 0, 0, 0, 0];
    it.loadT = 1;
    this.scene.insts.push(it);
    this.crowd.red = { it: it, dir: -sgn, ph: 0 };
  };
  Game.prototype.removeRed = function () {
    var cw = this.crowd; if (!cw || !cw.red) return;
    var idx = this.scene.insts.indexOf(cw.red.it);
    if (idx >= 0) this.scene.insts.splice(idx, 1);
    cw.red = null; this._dwell = 0;
  };

  Game.prototype.freezeLesson = function () {
    this.state = 'frozen'; this._frozenT = 0;
    this.fx.stamp = 'TRAINING PROGRAM \u2014 PAUSED'; this.fx.stampA = 1;
    this.emit('freeze');
    // nearest pedestrian turns
    var cw = this.crowd, p = this.player.pos, best = null, bd = 1e9;
    for (var i = 0; i < cw.peds.length; i++) {
      var it = cw.peds[i].it;
      var dx = it.pos[0] - p[0], dz = it.pos[2] - p[2], d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = cw.peds[i]; }
    }
    if (best) {
      best.it.mesh = P.agent();
      best.it._wv = null;
      best.it.pose = [0, 0, 0, 0, 0, 0];
      best.it.yaw = Math.atan2(p[0] - best.it.pos[0], p[2] - best.it.pos[2]);
      best.it.label = 'agent';
      cw.agent = best;
    }
  };
  Game.prototype.resumeLesson = function () {
    this.state = 'play';
    this.flags.lessonDone = true;
    this.fx.stampA = 0; this.fx.stamp = null;
    this.removeRed();
    this.emit('resume');
    this.say(L.lesson, 0.4);
  };

  // ----- rooftop fall / hurt -----
  Game.prototype.genCracks = function () {
    var r = C.rng(77 + this.flags.attempts), segs = [];
    for (var i = 0; i < 9; i++) {
      var a = (i / 9) * C.TAU + (r() - 0.5) * 0.5;
      var x = 0, y = 0, len = 0.1 + r() * 0.1;
      for (var s = 0; s < 4; s++) {
        var a2 = a + (r() - 0.5) * 0.7;
        var nx = x + Math.cos(a2) * len, ny = y + Math.sin(a2) * len;
        segs.push([x, y, nx, ny]);
        x = nx; y = ny; len *= 1.35;
      }
    }
    return segs;
  };

  Game.prototype.impactStreet = function () {
    this._fallFromRoof = false;
    this.fx.slowTarget = 1; this.fx.slowmo = 1;
    if (!this.flags.firstFallDone) {
      this.flags.firstFallDone = true;
      this.state = 'down'; this._downT = 0; this._postRise = -1;
      this.fx.cracks = this.genCracks(); this.fx.crackA = 1;
      this.fx.vig = 1; this.fx.heart = 0;
      this.emit('impactBig');
      this.say(L.fall1, 1.4);
      this.say(L.fall2, 4.2);
    } else {
      this.emit('impactSmall');
      this.fx.flash = 1; this.fx.flashCol = '#ffffff';
      this.fx.vig = 0.45;
      this.say(L.again, 0.3);
      this.respawnRoof();
    }
  };

  Game.prototype.respawnRoof = function () {
    var R = C.ROOF, p = this.player;
    p.pos = R.spawn.slice(); p.vel = [0, 0, 0];
    p.yaw = Math.PI / 2; p.pitch = 0; p.grounded = true;
    this.state = 'play';
    this._airFromA = false;
    this.flags.successDone = false;
  };

  // ----- interaction -----
  Game.prototype.updateAim = function () {
    if (this.bike) { this.aim = null; return; }
    var eye = this.cam.pos, fw = fwdOf(this.player.yaw, this.player.pitch);
    this.aim = null;
    var insts = this.scene.insts, best = null, bd = 1e9;
    for (var i = 0; i < insts.length; i++) {
      var it = insts[i];
      if (it.loadT < 0.9) continue;
      if (it.kind !== 'gun' && it.kind !== 'dummy' && it.kind !== 'booth' && it.kind !== 'bike' && it.kind !== 'sedan' && it.kind !== 'katana') continue;
      var cy = it.kind === 'gun' ? 0.05 : (it.kind === 'katana' ? 0.35 : (it.kind === 'bike' ? 0.6 : (it.kind === 'sedan' ? 1.0 : 1.1)));
      var to = [it.pos[0] - eye[0], it.pos[1] + cy - eye[1], it.pos[2] - eye[2]];
      var d = C.len(to);
      var maxd = it.kind === 'dummy' ? 2.1 : (it.kind === 'booth' ? 2.4 : (it.kind === 'bike' ? 3.0 : (it.kind === 'sedan' ? 3.4 : (it.kind === 'katana' ? 2.4 : 2.8))));
      if (d > maxd) continue;
      var ang = Math.acos(C.clamp(C.dot(C.norm(to), fw), -1, 1));
      if (ang > 0.5) continue;
      if (d < bd) { bd = d; best = it; }
    }
    this.aim = best;
  };

  Game.prototype.doAction = function () {
    if (this.bike) { this.dismountBike(); return; }
    if (this.car) { this.dismountCar(); return; }
    var it = this.aim;
    if (!it) return;
    if (it.kind === 'gun') {
      it.loadDir = -1;
      this.held = { mesh: P.heldGun(), kick: 0, bob: 0, kind: it.gun || 'pistol' };
      this.emit('pickup');
      this.say(L.gun);
    } else if (it.kind === 'booth') {
      this.enterBooth();
    } else if (it.kind === 'bike') {
      this.mountBike(it);
    } else if (it.kind === 'sedan') {
      this.mountCar(it);
    } else if (it.kind === 'katana') {
      it.loadDir = -1;
      if (it._col) { var ci = this.scene.colliders.indexOf(it._col); if (ci >= 0) this.scene.colliders.splice(ci, 1); it._col = null; }
      this.held = { mesh: P.heldKatana(), kick: 0, bob: 0, kind: 'katana' };
      this.emit('pickupBlade');
    }
  };

  Game.prototype.enterBooth = function () {
    this._boothRing = false;
    this.emit('ringStop'); this.emit('exitFlash');
    this.fx.flash = 1; this.fx.flashCol = '#ffffff';
    this.transition('void', L.hangup);
  };

  Game.prototype.doFire = function () {
    var t = this.time;
    if (this.bike) return; // hands on the bars
    if (this.held && this.held.kind === 'katana') { this.doSlash(); return; }
    if (this.held) {
      this.held.kick = 1;
      this.emit('shot');
      var eye = this.cam.pos, fw = fwdOf(this.player.yaw, this.player.pitch);
      var hit = null, bt = 60;
      var cols = this.scene.colliders;
      for (var i = 0; i < cols.length; i++) {
        var th = rayBox(eye, fw, cols[i], bt);
        if (th > 0 && th < bt) { bt = th; hit = th; }
      }
      // ground plane
      if (fw[1] < -0.001) {
        var tg = (this.scene.groundY - eye[1]) / fw[1];
        if (tg > 0.01 && tg < bt) { bt = tg; hit = tg; }
      }
      if (hit != null) this.burst([eye[0] + fw[0] * bt, eye[1] + fw[1] * bt, eye[2] + fw[2] * bt], 14);
    } else if (this.aim && this.aim.kind === 'dummy') {
      this.emit('punch');
      var it = this.aim;
      it._wob = 1; it._baseYaw = it._baseYaw == null ? it.yaw : it._baseYaw;
      this.burst([it.pos[0], it.pos[1] + 1.25, it.pos[2]], 7);
    } else {
      this.emit('swish');
    }
  };

  Game.prototype.burst = function (p, n) {
    var r = C.rng(this._burstSeed++ * 97 + 3);
    var parts = [];
    for (var i = 0; i < n; i++) {
      var a = r() * C.TAU, e = (r() - 0.3) * 2.4, sp = 1.2 + r() * 2.4;
      parts.push({ x: p[0], y: p[1], z: p[2], vx: Math.cos(a) * sp * Math.cos(e), vy: Math.sin(e) * sp + 0.8, vz: Math.sin(a) * sp * Math.cos(e), s: (r() * 1e9) | 0 });
    }
    this.fx.bursts.push({ p: parts, t0: this.time, life: 0.65 });
    if (this.fx.bursts.length > 10) this.fx.bursts.shift();
  };

  // ----- physics -----
  var GRAV = 18, WALK = 4.2, SPRINT = 8.0, R = 0.35, H = 1.7, EYE = 1.62;
  C.PHYS = { GRAV: GRAV, WALK: WALK, SPRINT: SPRINT, JUMP0: 5.0, JUMPK: 0.55, COYOTE: 0.12 };
  // Bike feel ported from the author's STREET PROTOCOL CFG, rescaled for the Construct's tighter world.
  // (Street ran a 3 km street at 64 m/s; here the envelope is smaller but keeps the same character:
  //  heavy roll-on, real steering, a turbo that clearly bites, walls you can clip.)
  C.BIKE = { MAX: 22, BOOST: 34, ACCEL: 12, BRAKE: 26, COAST: 3.2, PHI_MAX: 0.42, ROLL_RATE: 2.2, G: 9.81, VMIN_TURN: 5, LEAN_VGATE: 8, CS_T: 0.12, CS_A: 0.05, EYE: 1.34,
             TURBO_MAX: 3.0, TURBO_REGEN: 0.28, TURBO_GATE: 4, TURBO_GAIN: 1.9, OVER_FALL: 24 };

  Game.prototype.mountBike = function (it) {
    this.bike = { it: it, speed: 0, lean: 0, turbo: C.BIKE.TURBO_MAX, boosting: false, dist: 0 };
    it.loadDir = 0;
    if (it._col) { var ci = this.scene.colliders.indexOf(it._col); if (ci >= 0) this.scene.colliders.splice(ci, 1); it._col = null; }
    this.held = null;
    var p = this.player;
    p.pos = it.pos.slice(); p.vel = [0, 0, 0]; p.grounded = true;
    p.yaw = it.yaw; // bike nose is +z at yaw=0, same as player forward
    this.emit('mount');
    this.say(L.bike, 0.2);
  };
  Game.prototype.dismountBike = function () {
    if (!this.bike) return;
    var bk = this.bike, p = this.player;
    var it = bk.it;
    it.pos = [p.pos[0], this.scene.groundY, p.pos[2]];
    it.yaw = p.yaw; it._baseYaw = null; it._wob = 0;
    // step the rider off to the left of the bike
    var lx = Math.cos(p.yaw), lz = Math.sin(p.yaw);
    p.pos = [p.pos[0] - lx * 0.9, this.scene.groundY, p.pos[2] - lz * 0.9];
    p.vel = [0, 0, 0];
    // re-arm the bike collider so it's solid again once parked
    var r = 0.55, col = { min: [it.pos[0] - r, it.pos[1], it.pos[2] - r], max: [it.pos[0] + r, it.pos[1] + 1.1, it.pos[2] + r] };
    it._col = col; this.scene.colliders.push(col);
    this.bike = null;
    this.emit('dismount');
  };

  Game.prototype.moveBike = function (input, dt) {
    var p = this.player, sc = this.scene, cols = sc.colliders, B = C.BIKE, bk = this.bike;
    var self = this;
    function crashHit(strength) {                    // shared unit (branch-ported)
      bk.crashCd = 0.45;
      bk.speed *= 0.35;
      self.shake = Math.max(self.shake || 0, strength);
      self.emit('impactSmall');
    }
    // look (pitch only via mouse; yaw is driven by steering for the body, but let mouse nudge view)
    p.pitch = C.clamp(p.pitch + (input.dpitch || 0), -1.0, 1.0);
    var wantTurbo = !!input.sprint;
    var throttle = (input.fwd || 0);
    var steerIn = (input.strafe || 0) + (input.dyaw || 0) * 26; // mouse contributes to steering
    // turbo is a finite boost (nitrous): needs charge AND speed past a gate; drains while held, regens when off
    var thr = throttle > 0.01;
    bk.boosting = wantTurbo && bk.turbo > 0.05 && thr && bk.speed > B.TURBO_GATE;
    if (bk.boosting) { bk.turbo = Math.max(0, bk.turbo - dt); }
    else { bk.turbo = Math.min(B.TURBO_MAX, bk.turbo + dt * B.TURBO_REGEN); }
    // steering scales down with speed (twitchy when slow, stable when fast), turbo widens line
    // BRANCH FEEL (ported): steering authority GROWS with speed - you carve
    // at pace and can barely wrench it at a standstill.
    // INPUT PIPELINE (industry-standard, scale-calibrated): ease the steer
    // state in (9/s) and let it release crisper (12/s); rate halved for our
    // 3.4 m lanes vs the branch's 10 m. Hands off -> gentle self-straighten.
    var sTgt = C.clamp(steerIn, -1.4, 1.4);
    bk.sSm = (bk.sSm || 0) + (sTgt - (bk.sSm || 0)) * Math.min(1, (Math.abs(sTgt) > Math.abs(bk.sSm || 0) ? 9 : 12) * dt);
    // REAL MOTORCYCLE PHYSICS (balanced-turn law, production form):
    // input sets a TARGET LEAN; roll approaches it at a limited roll rate
    // (the gyro smoothing); the LEAN then makes the turn:
    //   yawRate = g * tan(lean) / v    [Bosch: tan(lean) = v*yawRate/g]
    // Same lean, more speed = WIDER arc - lean deeper or slow down, like a
    // real bike. Walking pace gates the lean itself; a 0.12 s countersteer
    // flick seasons the entry.
    var leanTgt = C.clamp(bk.sSm, -1, 1) * B.PHI_MAX * Math.min(1, bk.speed / B.LEAN_VGATE);
    var dphi = C.clamp(leanTgt - bk.lean, -B.ROLL_RATE * dt, B.ROLL_RATE * dt);
    if ((bk._csDir || 0) === 0 && Math.abs(bk.sSm) > 0.35 && Math.abs(bk.lean) < 0.04 && bk.speed > 6) {
      bk._csDir = bk.sSm > 0 ? 1 : -1; bk._csT = B.CS_T;   // the entry flick begins
    }
    bk.lean += dphi;
    if (Math.abs(bk.sSm) < 0.1 && Math.abs(bk.lean) < 0.02) bk._csDir = 0;
    var yawRate = B.G * Math.tan(bk.lean) / Math.max(bk.speed, B.VMIN_TURN);
    if ((bk._csT || 0) > 0) { bk._csT -= dt; p.yaw += -(bk._csDir || 0) * (B.CS_A / B.CS_T) * dt; }
    p.yaw += yawRate * dt;
    if (sc.infinite) {
      p.yaw = C.clamp(p.yaw, -0.17, 0.17);   // LEAN-CARVE: ~20\u00b0 max nose angle - a held turn banks and arcs, never pivots sideways
      if (Math.abs(steerIn) < 0.04 || bk.speed < 1.2) p.yaw += -p.yaw * Math.min(1, 1.2 * dt);   // hands off OR stopped: square up to the axis
    }

    // longitudinal — roll-on with diminishing accel near vmax; turbo lifts the cap and boosts accel
    var maxv = bk.boosting ? B.BOOST : B.MAX;
    if (thr) {
      var accel = (bk.boosting ? B.ACCEL * B.TURBO_GAIN : B.ACCEL) * throttle;
      bk.speed += accel * dt * Math.max(0.12, 1.04 - bk.speed / maxv);
    } else if (throttle < -0.01) {
      bk.speed += B.BRAKE * throttle * dt; // brake/reverse
    } else {
      bk.speed -= Math.sign(bk.speed) * Math.min(Math.abs(bk.speed), B.COAST * dt);
    }
    // when not boosting but still over the normal cap, ease back down (don't hard-clamp)
    if (!bk.boosting && bk.speed > B.MAX) bk.speed = Math.max(B.MAX, bk.speed - B.OVER_FALL * dt);
    bk.speed = C.clamp(bk.speed, -B.MAX * 0.3, B.BOOST);
    // integrate along facing (nose +z at yaw 0)
    var dirx = Math.sin(p.yaw), dirz = -Math.cos(p.yaw);
    var step = bk.speed * dt;
    // substep to avoid tunnelling at high speed (|step| can exceed collider half-widths)
    var subs = Math.max(1, Math.ceil(Math.abs(step) / 0.4));
    var ds = step / subs;
    function blocked(nx, nz) {
      for (var i = 0; i < cols.length; i++) {
        var b = cols[i];
        if (b.max[1] <= p.pos[1] + 0.2) continue;
        if (b.min[1] >= p.pos[1] + 1.0) continue;
        if (nx > b.min[0] - 0.5 && nx < b.max[0] + 0.5 && nz > b.min[2] - 0.5 && nz < b.max[2] + 0.5) return b;
      }
      return null;
    }
    var hitWall = false;
    for (var sgi = 0; sgi < subs; sgi++) {
      var nx = p.pos[0] + dirx * ds, nz = p.pos[2] + dirz * ds;
      if (blocked(nx, p.pos[2])) { hitWall = true; }
      else p.pos[0] = nx;
      if (blocked(p.pos[0], nz)) { hitWall = true; }
      else p.pos[2] = nz;
    }
    bk.crashCd = Math.max(0, (bk.crashCd || 0) - dt);
    if (hitWall) {
      if (bk.crashCd <= 0) crashHit(0.5);
      else bk.speed *= 0.985;                // grinding inside cooldown only scrubs
      // throttle the scrape sound: at most one every 0.15s, so grinding the wall
      // can't stack dozens of hisses into a roar
      if (this.time - (bk._lastScrape || -1) > 0.15) { this.emit('scrape'); bk._lastScrape = this.time; }
    }
    // traffic is solid; a clip is a clip (branch-ported)
    var tf = sc.traffic;
    if (tf) {
      bk._nmCd = Math.max(0, (bk._nmCd || 0) - dt);
      for (var ti = 0; ti < tf.length; ti++) {
        var tv = tf[ti];
        var dxv = p.pos[0] - tv.it.pos[0], dzv = p.pos[2] - tv.it.pos[2];
        var adx = Math.abs(dxv), adz = Math.abs(dzv);
        if (adz < 2.5 && adx < 1.55) {
          p.pos[0] = tv.it.pos[0] + (dxv >= 0 ? 1 : -1) * 1.75;
          if (bk.crashCd <= 0) crashHit(0.85);
        } else if (adz < 3.0 && adx < 2.6 && bk._nmCd <= 0 && Math.abs(-bk.speed - tv.dir * tv.speed) > 9) {
          bk._nmCd = 0.6;                    // near miss: fast air, one throttled whoosh
          this.emit('swish');
        }
      }
    }
    p.pos[1] = sc.groundY;
    bk.dist += Math.abs(bk.speed) * dt;   // odometer — visible proof the road never ends
    p.vel = [dirx * bk.speed, 0, dirz * bk.speed];
    // sync the bike instance: push it forward so the rider sits on the seat and the
    // tank + bars + headlamp fill the lower view (otherwise the bike renders under the camera and the frame looks empty)
    var it = bk.it;
    var fx0 = Math.sin(p.yaw) * 0.55, fz0 = -Math.cos(p.yaw) * 0.55;
    it.pos = [p.pos[0] + fx0, sc.groundY, p.pos[2] + fz0];
    it.yaw = p.yaw;
    it._wob = 0;
    bk.it._lean = bk.lean;
    this.emit('engine', { speed: Math.abs(bk.speed), throttle: Math.max(0, throttle),
                          speedFrac: C.clamp(Math.abs(bk.speed) / B.BOOST, 0, 1),
                          turbo: bk.turbo / B.TURBO_MAX, boosting: bk.boosting });
    // footstep phase off; engine carries the motion
    p.phase = 0; p.grounded = true; p.coyote = C.PHYS.COYOTE;
  };

  // 1937 sedan physics, ported verbatim from the ORANGE EMPIRE branch CFG:
  // no lean; steering authority scales with speed (clamp(v/9)) and relaxes
  // toward the top end (1 - 0.45*ss(11,26,|v|)). Barricades break past 5.5 m/s.
  C.CAR = { VMAX: 26, VREV: -6.5, ACC: 9.5, BRAKE: 16, DRAG: 0.35, ROLL: 0.9, STEER: 2.0, EYE: 1.5, BREAK_V: 5.5 };

  Game.prototype.mountCar = function (it) {
    this.car = { it: it, speed: 0, dist: 0, crashCd: 0, sSm: 0 };
    it.loadDir = 0;
    if (it._col) { var ci = this.scene.colliders.indexOf(it._col); if (ci >= 0) this.scene.colliders.splice(ci, 1); it._col = null; }
    this.held = null;
    var p = this.player;
    p.pos = it.pos.slice(); p.vel = [0, 0, 0]; p.grounded = true;
    p.yaw = it.yaw;
    this.emit('mount');
    this.say(L.sedan, 0.2);
  };
  Game.prototype.dismountCar = function () {
    if (!this.car) return;
    var ck = this.car, p = this.player, it = ck.it;
    it.pos = [p.pos[0], this.scene.groundY, p.pos[2]];
    it.yaw = p.yaw;
    var lx = Math.cos(p.yaw), lz = Math.sin(p.yaw);
    p.pos = [p.pos[0] - lx * 1.5, this.scene.groundY, p.pos[2] - lz * 1.5];
    p.vel = [0, 0, 0];
    var col = { min: [it.pos[0] - 1.1, it.pos[1], it.pos[2] - 1.1], max: [it.pos[0] + 1.1, it.pos[1] + 1.6, it.pos[2] + 1.1] };
    it._col = col; this.scene.colliders.push(col);
    this.car = null;
    this.emit('dismount');
  };

  Game.prototype.moveCar = function (input, dt) {
    var p = this.player, sc = this.scene, cols = sc.colliders, K = C.CAR, ck = this.car;
    var self = this;
    function ss(a, b, x) { var u = C.clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }
    p.pitch = C.clamp(p.pitch + (input.dpitch || 0), -1.0, 1.0);
    var throttle = (input.fwd || 0);
    if (sc._dismiss) throttle = 0;   // the engine isn't killed - it's dismissed
    var steerIn = (input.strafe || 0) + (input.dyaw || 0) * 26;
    var sTgt = C.clamp(steerIn, -1.4, 1.4);
    ck.sSm = (ck.sSm || 0) + (sTgt - (ck.sSm || 0)) * Math.min(1, (Math.abs(sTgt) > Math.abs(ck.sSm || 0) ? 9 : 12) * dt);
    // longitudinal: their exact envelope
    if (throttle > 0.01) ck.speed += K.ACC * throttle * dt;
    else if (throttle < -0.01) {
      if (ck.speed > 0.4) ck.speed += K.BRAKE * throttle * dt;      // brake
      else ck.speed += K.ACC * 0.55 * throttle * dt;                 // reverse crawl
    } else {
      var r = K.ROLL * dt;
      if (Math.abs(ck.speed) <= r) ck.speed = 0; else ck.speed -= Math.sign(ck.speed) * r;
    }
    ck.speed -= ck.speed * K.DRAG * dt;
    if (sc._dismiss) ck.speed -= ck.speed * Math.min(1, 1.6 * dt);   // coast to nothing over ~2.4 s
    ck.speed = C.clamp(ck.speed, K.VREV, K.VMAX);
    // their steering law: authority grows with speed, relaxes near the top
    var turn = K.STEER * C.clamp(ck.speed / 9, -1, 1) * (1 - 0.45 * ss(11, 26, Math.abs(ck.speed)));
    p.yaw += C.clamp(ck.sSm, -1, 1) * turn * dt;
    var dirx = Math.sin(p.yaw), dirz = -Math.cos(p.yaw);
    // barricades break at speed (scene-owned; collider dies with them)
    if (sc.barricades) {
      for (var bi = 0; bi < sc.barricades.length; bi++) {
        var b = sc.barricades[bi];
        if (b.broken) continue;
        for (var oi = 0; oi < 2; oi++) {
          var off = oi === 0 ? 1.9 : 0.4;
          var bx = p.pos[0] + dirx * off, bz = p.pos[2] + dirz * off;
          if (bx > b.col.min[0] - 0.95 && bx < b.col.max[0] + 0.95 && bz > b.col.min[2] - 0.95 && bz < b.col.max[2] + 0.95) {
            if (Math.abs(ck.speed) > K.BREAK_V && sc.breakBarricade) { sc.breakBarricade(self, b, dirx, dirz, Math.abs(ck.speed)); ck.speed *= 0.82; }
            break;
          }
        }
      }
    }
    var step = ck.speed * dt;
    var subs = Math.max(1, Math.ceil(Math.abs(step) / 0.4));
    var ds = step / subs;
    function blocked(nx, nz) {
      for (var i = 0; i < cols.length; i++) {
        var bb = cols[i];
        if (bb.max[1] <= p.pos[1] + 0.2) continue;
        if (bb.min[1] >= p.pos[1] + 1.6) continue;
        if (nx > bb.min[0] - 0.8 && nx < bb.max[0] + 0.8 && nz > bb.min[2] - 0.8 && nz < bb.max[2] + 0.8) return bb;
      }
      return null;
    }
    var hitWall = false;
    for (var sgi = 0; sgi < subs; sgi++) {
      var nx = p.pos[0] + dirx * ds, nz = p.pos[2] + dirz * ds;
      if (blocked(nx, p.pos[2])) { hitWall = true; }
      else p.pos[0] = nx;
      if (blocked(p.pos[0], nz)) { hitWall = true; }
      else p.pos[2] = nz;
    }
    ck.crashCd = Math.max(0, (ck.crashCd || 0) - dt);
    if (hitWall) {
      if (ck.crashCd <= 0) { ck.crashCd = 0.45; ck.speed *= 0.22; self.shake = Math.max(self.shake || 0, 0.4); this.emit('thud'); }
      else ck.speed *= 0.985;
    }
    p.pos[1] = sc.groundY;
    ck.dist += Math.abs(ck.speed) * dt;
    p.vel = [dirx * ck.speed, 0, dirz * ck.speed];
    var it = ck.it;
    var fx0 = Math.sin(p.yaw) * 1.1, fz0 = -Math.cos(p.yaw) * 1.1;
    it.pos = [p.pos[0] + fx0, sc.groundY, p.pos[2] + fz0];
    it.yaw = p.yaw;
    this.emit('engine', { speed: Math.abs(ck.speed), throttle: Math.max(0, throttle),
                          speedFrac: C.clamp(Math.abs(ck.speed) / K.VMAX, 0, 1), turbo: 0, boosting: false });
    p.phase = 0; p.grounded = true; p.coyote = C.PHYS.COYOTE;
  };

  Game.prototype.doSlash = function () {
    if (!this.held) return;
    this.held.kick = 1;
    this.emit('slash');
    var B = C.BIKE; // reuse no constants; slash spec below ported from STREET PROTOCOL
    var range = 3.5, arc = 1.35; // slashRange / slashArc (radians half-angle)
    var eye = this.cam.pos, fw = fwdOf(this.player.yaw, this.player.pitch);
    var insts = this.scene.insts, struck = false;
    for (var i = 0; i < insts.length; i++) {
      var it = insts[i];
      if (it.loadT < 0.5) continue;
      if (it.kind !== 'dummy' && it.kind !== 'ped' && it.kind !== 'red') continue;
      var to = [it.pos[0] - eye[0], (it.pos[1] + 1.1) - eye[1], it.pos[2] - eye[2]];
      var d = C.len(to);
      if (d > range) continue;
      var ang = Math.acos(C.clamp(C.dot(C.norm(to), fw), -1, 1));
      if (ang > arc) continue;
      if (it.kind === 'dummy') { it._wob = 1; it._baseYaw = it._baseYaw == null ? it.yaw : it._baseYaw; }
      this.burst([it.pos[0], it.pos[1] + 1.2, it.pos[2]], 9);
      struck = true;
    }
    if (!struck) this.emit('swishBlade');
  };

  Game.prototype.movePlayer = function (input, dt) {
    if (this.bike) { this.moveBike(input, dt); return; }
    if (this.car) { this.moveCar(input, dt); return; }
    var p = this.player, sc = this.scene, cols = sc.colliders;
    // look
    p.yaw += input.dyaw || 0;
    p.pitch = C.clamp(p.pitch + (input.dpitch || 0), -1.45, 1.45);
    // wish dir
    var f = input.fwd || 0, s = input.strafe || 0;
    var mag = Math.hypot(f, s); if (mag > 1) { f /= mag; s /= mag; }
    var sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    var wx = sy * f + cy * s, wz = -cy * f + sy * s;
    var max = input.sprint ? SPRINT : WALK;
    var accel = p.grounded ? 26 : 7;
    var tvx = wx * max, tvz = wz * max;
    if (mag > 0.01) {
      p.vel[0] += (tvx - p.vel[0]) * Math.min(1, accel * dt);
      p.vel[2] += (tvz - p.vel[2]) * Math.min(1, accel * dt);
    } else if (p.grounded) {
      var fr = Math.max(0, 1 - 10 * dt);
      p.vel[0] *= fr; p.vel[2] *= fr;
    }
    var hs = Math.hypot(p.vel[0], p.vel[2]);
    // jump
    if (input.jumpEdge && (p.grounded || p.coyote > 0)) {
      p.vel[1] = C.PHYS.JUMP0 + C.PHYS.JUMPK * hs;
      p.grounded = false; p.coyote = 0;
      this.emit('jump');
      if (sc.name === 'jump program' && p.lastGroundY >= C.ROOF.y - 0.5 && p.pos[0] <= C.ROOF.edgeX + 0.6 && p.pos[0] > C.ROOF.aMin[0]) {
        this._airFromA = true;
        this.flags.attempts++;
      }
    }
    p.vel[1] -= GRAV * dt;
    if (p.vel[1] < -28) p.vel[1] = -28;

    // lateral with AABB blocking
    function blocked(nx, nz) {
      for (var i = 0; i < cols.length; i++) {
        var b = cols[i];
        if (b.max[1] <= p.pos[1] + 0.32) continue;       // low enough to step/stand on
        if (b.min[1] >= p.pos[1] + H) continue;          // above head
        if (nx > b.min[0] - R && nx < b.max[0] + R && nz > b.min[2] - R && nz < b.max[2] + R) return b;
      }
      return null;
    }
    var nx = p.pos[0] + p.vel[0] * dt;
    var hitb = blocked(nx, p.pos[2]);
    if (hitb) { nx = p.vel[0] > 0 ? hitb.min[0] - R - 0.001 : hitb.max[0] + R + 0.001; if (blocked(nx, p.pos[2])) nx = p.pos[0]; p.vel[0] = 0; }
    p.pos[0] = nx;
    var nz = p.pos[2] + p.vel[2] * dt;
    var hitb2 = blocked(p.pos[0], nz);
    if (hitb2) { nz = p.vel[2] > 0 ? hitb2.min[2] - R - 0.001 : hitb2.max[2] + R + 0.001; if (blocked(p.pos[0], nz)) nz = p.pos[2]; p.vel[2] = 0; }
    p.pos[2] = nz;

    // vertical: supports
    var ny = p.pos[1] + p.vel[1] * dt;
    var sup = sc.groundY;
    var rr = 0.2;
    for (var i2 = 0; i2 < cols.length; i2++) {
      var b2 = cols[i2];
      if (p.pos[0] > b2.min[0] - rr && p.pos[0] < b2.max[0] + rr && p.pos[2] > b2.min[2] - rr && p.pos[2] < b2.max[2] + rr) {
        var top = b2.max[1];
        if (top <= p.pos[1] + 0.32 && top > sup) sup = top;
        // ceiling bump
        if (p.vel[1] > 0 && p.pos[1] + H <= b2.min[1] && ny + H > b2.min[1]) { ny = b2.min[1] - H; p.vel[1] = 0; }
      }
    }
    var wasGrounded = p.grounded;
    if (p.vel[1] <= 0 && ny <= sup) {
      ny = sup; p.vel[1] = 0;
      if (!wasGrounded) this.onLand(sup, hs);
      p.grounded = true; p.coyote = C.PHYS.COYOTE;
      p.lastGroundX = p.pos[0]; p.lastGroundY = sup;
    } else {
      p.grounded = false;
      p.coyote = Math.max(0, p.coyote - dt);
    }
    p.pos[1] = ny;

    // footsteps
    if (p.grounded && hs > 0.6) {
      p.phase += hs * dt * 2.0;
      if (p.phase > Math.PI) { p.phase -= Math.PI; this.emit('step', sc.ambience); }
    } else if (hs <= 0.6) { p.phase = 0; }

    // rooftop fall logic
    if (sc.name === 'jump program') {
      if (!p.grounded && p.vel[1] < 0 && p.pos[1] < C.ROOF.y - 5 && p.lastGroundY >= C.ROOF.y - 0.5) {
        if (!this._fallFromRoof) { this._fallFromRoof = true; this.emit('falling'); }
      }
      if (this._fallFromRoof && p.pos[1] < 26 && !this.flags.firstFallDone) {
        this.fx.slowTarget = 0.35;
      }
    }
  };

  Game.prototype.onLand = function (sup, hs) {
    this.fx.camDip = Math.min(0.16, 0.05 + Math.abs(this.player.vel[1]) * 0.004);
    this.emit('land');
    var sc = this.scene, p = this.player;
    if (sc.name === 'jump program') {
      if (this._fallFromRoof && sup <= 0.5) { this.impactStreet(); return; }
      this._fallFromRoof = false; this.fx.slowTarget = 1;
      if (this._airFromA && sup >= C.ROOF.y - 0.5 && p.pos[0] >= C.ROOF.landX - 0.1 && !this.flags.successDone) {
        this.flags.successDone = true; this._airFromA = false;
        this.fx.flash = 0.6; this.fx.flashCol = '#dfffe9';
        this.emit('success');
        this.say(this.flags.attempts <= 1 && !this.flags.firstFallDone ? L.successFirst : L.success, 0.5);
      }
    }
  };

  // ----- per-frame update -----
  Game.prototype.update = function (input, dtReal) {
    dtReal = Math.min(dtReal, 0.05);
    this.time += dtReal;
    var fx = this.fx;
    fx.slowmo += (fx.slowTarget - fx.slowmo) * Math.min(1, 6 * dtReal);
    var dt = dtReal * fx.slowmo;

    // instance load timers
    var insts = this.scene.insts;
    for (var i = insts.length - 1; i >= 0; i--) {
      var it = insts[i];
      if (it.loadDir > 0) {
        if (it._delay > 0) { it._delay -= dtReal; }
        else {
          it.loadT += dtReal / (it.slideFrom ? 1.05 : 0.9);
          if (it.loadT >= 1) { it.loadT = 1; it.loadDir = 0; }
        }
      } else if (it.loadDir < 0) {
        it.loadT -= dtReal / 0.5;
        if (it.loadT <= 0) insts.splice(i, 1);
      }
      if (it._wob != null && it._wob > 0.01) {
        it._wob *= Math.max(0, 1 - 4.5 * dtReal);
        it.yaw = it._baseYaw + Math.sin(this.time * 24) * 0.16 * it._wob;
      }
    }

    // transition staging
    if (this.trans) {
      this.trans.t += dtReal;
      if (this.trans.t >= 0.38) {
        var tr = this.trans; this.trans = null;
        this.fx.flash = Math.max(this.fx.flash, 0.85); this.fx.flashCol = '#ffffff';
        this._swapScene(tr.name);
        if (tr.line) this.say(tr.line, 0.3);
      }
    }

    // states
    if (this.state === 'frozen') {
      this._frozenT += dtReal;
      if (this._frozenT > 0.55 && input.any) this.resumeLesson();
    } else if (this.state === 'down') {
      this._downT += dtReal;
      fx.heart += dtReal;
      if (fx.heart > 1.05) { fx.heart = 0; this.emit('heart'); fx.vig = Math.min(1, fx.vig + 0.25); }
      if (this._downT > 2.6) { this.state = 'rising'; this._riseT = 0; this.emit('rise'); }
    } else if (this.state === 'rising') {
      this._riseT += dtReal;
      if (this._riseT > 1.9) {
        this.state = 'play';
        fx.painLinger = 45;
        this._postRise = 0;
        this.say(L.reload, 0.4);
      }
    } else {
      if (this._postRise >= 0) {
        this._postRise += dtReal;
        if (this._postRise > 1.4) {
          this._postRise = -1;
          fx.flash = 1; fx.flashCol = '#ffffff';
          this.respawnRoof();
        }
      }
      this.movePlayer(input, dt);
      this.updateAim();
      if (input.actionEdge) this.doAction();
      if (input.fireEdge) this.doFire();
      // booth proximity auto-exit
      if (this._boothRing) {
        for (var bi = 0; bi < insts.length; bi++) {
          var b = insts[bi];
          if (b.kind === 'booth' && b.loadT >= 1) {
            var ddx = this.player.pos[0] - b.pos[0], ddz = this.player.pos[2] - b.pos[2];
            if (ddx * ddx + ddz * ddz < 1.0) { this.enterBooth(); break; }
          }
        }
      }
      if (this.scene.update) this.scene.update(this, dt);
    }

    // fx decay
    fx.flash = Math.max(0, fx.flash - dtReal * 2.2);
    fx.codeFlash = Math.max(0, fx.codeFlash - dtReal * 2.6);
    fx.camDip = Math.max(0, fx.camDip - dtReal * 0.5);
    if (this.state !== 'down') fx.vig = Math.max(this.state === 'rising' ? 0.45 : (fx.painLinger > 0 ? 0.1 * Math.min(1, fx.painLinger / 20) : 0), fx.vig - dtReal * 0.5);
    if (this.state !== 'down' && this.state !== 'rising') fx.crackA = Math.max(0, fx.crackA - dtReal * 0.4);
    fx.stampA = this.state === 'frozen' ? Math.min(1, fx.stampA + dtReal * 3) : Math.max(0, fx.stampA - dtReal * 3);
    fx.bars += ((fx.slowmo < 0.95 ? 1 : 0) - fx.bars) * Math.min(1, 5 * dtReal);
    if (fx.painLinger > 0) {
      fx.painLinger -= dtReal;
      fx.heart += dtReal;
      var beat = 1.0 + (1 - Math.min(1, fx.painLinger / 45)) * 0.8;
      if (fx.heart > beat) { fx.heart = 0; if (fx.painLinger > 12) this.emit('heartSoft'); }
    }
    for (var bi2 = fx.bursts.length - 1; bi2 >= 0; bi2--) {
      if (this.time - fx.bursts[bi2].t0 > fx.bursts[bi2].life) fx.bursts.splice(bi2, 1);
    }

    // camera
    this.updateCam(dtReal, dt);

    // held gun
    if (this.held) {
      var hsp = Math.hypot(this.player.vel[0], this.player.vel[2]);
      this.held.bob += dt * (2 + hsp * 1.4);
      this.held.kick = Math.max(0, this.held.kick - dtReal * 7);
    }

    // queued operator messages
    for (var mi = 0; mi < this.msgs.length; mi++) {
      var msg = this.msgs[mi];
      if (!msg.said && this.time >= msg.at) { msg.said = true; this.emit('say', msg.text); }
    }
    if (this.msgs.length > 30) this.msgs.splice(0, this.msgs.length - 30);
  };

  Game.prototype.updateCam = function (dtReal, dt) {
    var p = this.player, cam = this.cam, fx = this.fx;
    var hs = Math.hypot(p.vel[0], p.vel[2]);
    var bob = p.grounded ? Math.sin(p.phase * 2) * 0.028 * Math.min(1, hs / SPRINT) : 0;
    var eyeT, rollT, pitchAdd = 0;
    if (this.state === 'down') {
      eyeT = 0.34; rollT = 1.25; pitchAdd = -0.1 + Math.sin(this.time * 2.2) * 0.02;
    } else if (this.state === 'rising') {
      var k = C.easeInOut(this._riseT / 1.9);
      eyeT = C.lerp(0.34, EYE, k); rollT = C.lerp(1.25, 0, k) + Math.sin(this._riseT * 9) * 0.05 * (1 - k);
    } else {
      eyeT = EYE; rollT = 0;
      if (this.bike) { eyeT = C.BIKE.EYE; rollT = -this.bike.lean * 0.55; }   // display = physical roll * 0.55 (~13 deg at full lean)   // the bank is VISIBLE: ~23\u00b0 at full lean
      if (this.shake > 0) { this.shake = Math.max(0, this.shake - 2.4 * dt); rollT += (Math.random() - 0.5) * this.shake * 0.22; eyeT += (Math.random() - 0.5) * this.shake * 0.08; }
      if (fx.painLinger > 0) rollT += Math.sin(this.time * 1.4) * 0.018 * Math.min(1, fx.painLinger / 30);
    }
    cam.pos[0] = p.pos[0];
    cam.pos[1] = p.pos[1] + eyeT + bob - fx.camDip;
    cam.pos[2] = p.pos[2];
    cam.yaw = p.yaw; cam.pitch = p.pitch + pitchAdd;
    cam.roll += (rollT - cam.roll) * Math.min(1, 6 * dtReal);
  };

  // ----- overlay fx ops -----
  Game.prototype.fxOps = function (ops, w, h, t, proj, toCam) {
    var fx = this.fx, mode = this.mode;
    // glyph bursts (world-anchored)
    for (var i = 0; i < fx.bursts.length; i++) {
      var b = fx.bursts[i], age = this.time - b.t0, k = age / b.life;
      for (var j = 0; j < b.p.length; j++) {
        var pt = b.p[j];
        var x = pt.x + pt.vx * age, y = pt.y + pt.vy * age - 2.2 * age * age, z = pt.z + pt.vz * age;
        var cpt = toCam([x, y, z], {});
        if (cpt.d < C.ZN) continue;
        var pr = proj(cpt);
        ops.push({ t: 'g', x: pr.x, y: pr.y, s: C.clamp(120 / cpt.d, 7, 18), ch: C.glyphFor(pt.s, t * 2), c: mode === 'code' ? '#9affc0' : '#2f9e57', a: (1 - k) * 0.95, d: 0 });
      }
    }
    if (fx.bars > 0.02) ops.push({ t: 'bars', a: fx.bars * 0.9 });
    if (fx.crackA > 0.02 && fx.cracks) ops.push({ t: 'crack', segs: fx.cracks, a: fx.crackA });
    if (fx.vig > 0.02) ops.push({ t: 'vig', a: fx.vig, c: fx.vigCol });
    if (fx.codeFlash > 0.02) ops.push({ t: 'flash', a: fx.codeFlash * 0.5, c: mode === 'code' ? '#46ff7a' : '#ffffff' });
    if (fx.flash > 0.02) ops.push({ t: 'flash', a: Math.min(1, fx.flash), c: fx.flashCol });
    if (fx.stampA > 0.02 && fx.stamp) ops.push({ t: 'stamp', str: fx.stamp, a: fx.stampA });
    if (this.state === 'play' || this.state === 'frozen') ops.push({ t: 'dot' });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
