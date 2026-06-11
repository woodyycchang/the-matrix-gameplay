// ============ 12 edge — atmosphere, day/night, the ending ============
const EDGE = (() => {
  const refs = { scene: null, camera: null, amb: null, dir: null };
  const C = (h) => new THREE.Color(h);
  // palettes: [top, mid, horizon, sunGlow, glowAmt, dirCol, dirInt, ambCol, ambInt, fogCol, fogFar]
  const PAL = {
    day:  { top: C(0x4a76b8), mid: C(0xa6c4e6), hor: C(0xe9eef0), glow: C(0xfff3d0), glowAmt: 0.45, dirC: C(0xfff2dd), dirI: 1.05, ambC: C(0xbcc8d8), ambI: 0.62, fog: C(0xc9d4dc), fogFar: 950 },
    dusk: { top: C(0x1c2a52), mid: C(0x7a5a8a), hor: C(0xe8843c), glow: C(0xffc46a), glowAmt: 1.0,  dirC: C(0xffb070), dirI: 0.95, ambC: C(0x9a87a4), ambI: 0.58, fog: C(0x4a3a4e), fogFar: 760 },
    night:{ top: C(0x04060e), mid: C(0x0a101f), hor: C(0x131a26), glow: C(0x2a3a50), glowAmt: 0.14, dirC: C(0x6f86b8), dirI: 0.12, ambC: C(0x303c5a), ambI: 0.30, fog: C(0x0a0d16), fogFar: 480 },
  };
  const tmp = { a: new THREE.Color(), b: new THREE.Color(), c: new THREE.Color() };
  const FOGC = new THREE.Color(), SUNC = new THREE.Color();
  let lastNightOn = null, time = 0;

  function flick(t, seed) {
    const v = Math.sin(t * 11.3 + seed) * 0.6 + Math.sin(t * 29.7 + seed * 2.7) * 0.4;
    return v < -0.82 ? 0.25 : (0.86 + 0.14 * v);
  }

  function init(scene, camera, amb, dir) {
    refs.scene = scene; refs.camera = camera; refs.amb = amb; refs.dir = dir;
    if (!scene.fog) scene.fog = new THREE.Fog(0x2a2430, 60, 700);
  }

  // night factor 0..1 from minutes-of-day
  function nightF(m) {
    m = ((m % 1440) + 1440) % 1440;
    const eve = ss(1190, 1238, m);          // 19:50 -> 20:38
    const morn = 1 - ss(308, 382, m);       // 5:08 -> 6:22
    return Math.max(eve, m < 720 ? morn : 0);
  }
  // dusk warmth (golden hour), peaks ~19:30 and ~6:00
  function duskF(m) {
    m = ((m % 1440) + 1440) % 1440;
    const e = ss(1085, 1165, m) * (1 - ss(1185, 1240, m));
    const d = ss(300, 345, m) * (1 - ss(370, 420, m));
    return Math.max(e, d);
  }

  function mixPal(out, key, a, b, t) { out.copy(a[key]).lerp(b[key], t); return out; }

  function update(dt, t) {
    time = t;
    const P = G.player;
    const px = G.inside ? -16 : P.x, pz = G.inside ? 8 : P.z; // interior counts as town
    const d = Math.sqrt(px * px + pz * pz);
    G.edge = edgeFactorAt(px, pz);
    const m = G.dayMin;
    const night = nightF(m), dusk = duskF(m);
    const skyEdge = ss(770, 985, d);

    // ---- blend palettes: day->dusk by dusk, then ->night by night
    const L = MAT.lib;
    const blended = (out, key) => out.copy(PAL.day[key]).lerp(PAL.dusk[key], dusk).lerp(PAL.night[key], night);
    if (L.skyU) {
      blended(L.skyU.uTop.value, 'top');
      blended(L.skyU.uMid.value, 'mid');
      blended(L.skyU.uHor.value, 'hor');
      blended(L.skyU.uSunGlow.value, 'glow');
      L.skyU.uGlowAmt.value = lerp(lerp(PAL.day.glowAmt, PAL.dusk.glowAmt, dusk), PAL.night.glowAmt, night);
      L.skyU.uEdge.value = skyEdge;
      // sun path: rise 6:00 (east, +x) set 20:00 (west, -x)
      const sa = clamp((m - 360) / 840, -0.2, 1.2) * Math.PI;
      L.skyU.uSunPos.value.set(Math.cos(sa), Math.max(Math.sin(sa), -0.08), 0.22).normalize();
    }

    // ---- lights
    const dirC = blended(tmp.a, 'dirC'), dirI = lerp(lerp(PAL.day.dirI, PAL.dusk.dirI, dusk), PAL.night.dirI, night);
    const ambC = blended(tmp.b, 'ambC'), ambI = lerp(lerp(PAL.day.ambI, PAL.dusk.ambI, dusk), PAL.night.ambI, night);
    if (refs.dir) {
      refs.dir.color.copy(dirC).lerp(tmp.c.setHex(0x76e0a0), G.edge * 0.45);
      refs.dir.intensity = dirI * (1 - 0.55 * G.edge) * (G.inside ? 0.25 : 1);
      const sp = L.skyU ? L.skyU.uSunPos.value : { x: 0.4, y: 0.8, z: 0.3 };
      const sy = night > 0.6 ? 0.78 : Math.max(sp.y, 0.10);
      const sx = night > 0.6 ? -0.35 : sp.x;
      refs.dir.position.set(px + sx * 160, sy * 160, pz + 0.25 * 160);
      if (refs.dir.target) { refs.dir.target.position.set(px, 0, pz); refs.dir.target.updateMatrixWorld(); }
    }
    if (refs.amb) {
      if (G.inside) { refs.amb.color.copy(ambC).lerp(tmp.c.setHex(0x6b4d33), 0.75); refs.amb.intensity = Math.max(ambI, 0.46); }
      else { refs.amb.color.copy(ambC); refs.amb.intensity = ambI; }
    }

    // ---- fog (Lambert scene fog + shader fog uniforms stay in sync)
    const fogC = blended(FOGC, 'fog'); fogC.lerp(tmp.c.setHex(0x020503), G.edge * 0.75);
    const fogFar = lerp(lerp(PAL.day.fogFar, PAL.dusk.fogFar, dusk), PAL.night.fogFar, night);
    if (refs.scene && refs.scene.fog) { refs.scene.fog.color.copy(fogC); refs.scene.fog.near = 55; refs.scene.fog.far = fogFar; }
    const sunColScaled = SUNC.copy(dirC).multiplyScalar(dirI * 1.7);
    for (const u of [L.groundU, L.eastRoadU]) {
      if (!u) continue;
      u.uFogColor.value.copy(fogC); u.uFogNear.value = 55; u.uFogFar.value = fogFar;
      u.uSunCol.value.copy(sunColScaled);
      u.uAmb.value.copy(ambC).multiplyScalar(ambI * 1.55);
      if (u.uSunDir && L.skyU) u.uSunDir.value.copy(L.skyU.uSunPos.value).normalize();
      if (u.uSunDir) u.uSunDir.value.y = Math.max(u.uSunDir.value.y, 0.22);
    }
    if (L.groundU) L.groundU.uTime.value = t;
    if (L.wallU) { L.wallU.uTime.value = t; L.wallU.uPlayerD.value = d; }

    // ---- night switches (textures, lamps, neon, windows)
    const nightOn = night > 0.5;
    if (nightOn !== lastNightOn) {
      lastNightOn = nightOn;
      for (const s of (G.nightSwapList || [])) {
        if (s.colorOnly) s.mat.color.setHex(nightOn ? s.nightColor : s.dayColor);
        else { s.mat.map = nightOn ? s.night : s.day; s.mat.needsUpdate = true; }
      }
      for (const lh of (G.lampHeads || [])) {
        if (lh.headMat.emissive) lh.headMat.emissive.setHex(nightOn ? 0xffd9a0 : 0x000000);
        lh.headMat.color.setHex(nightOn ? 0xffe9c0 : 0x39414c);
      }
      dlog('night:' + nightOn);
    }
    for (const lh of (G.lampHeads || [])) lh.pool.opacity = lerp(lh.pool.opacity, nightOn ? 0.8 : 0, dt * 2);
    for (const nm of (G.neonMats || [])) {
      const f = nm.seed != null ? flick(t, nm.seed) : 1;
      nm.mat.opacity = lerp(nm.mat.opacity, night * (nm.base || 1) * f, dt * 6);
    }
    for (const nl of (G.nightLights || [])) {
      const f = nl.flicker ? flick(t, nl.max * 13.7) : 1;
      nl.light.intensity = night * nl.max * f;
    }
    if (G.starsMat) G.starsMat.opacity = night * (1 - skyEdge * 0.6) * 0.9;
    if (G.moonMat) G.moonMat.opacity = night * (1 - skyEdge) * 0.95;

    // ---- film grain / vignette driven by edge
    UI.setGrade(G.edge, night);

    // ---- ending state machines
    if (G.state === 'ENDING') stepEnding(dt);
  }

  // =========================== THE BOUNDARY ===========================
  const E = { t: 0, lineIdx: -1, car: false, v0: 0, camFrom: null, done: false };
  const LINES = [
    'The road doesn\u2019t end. It just stops being a road.',
    'No crash. No cliff. The engine isn\u2019t killed \u2014 it\u2019s dismissed.',
    'The groves give up their oranges, then their leaves, then the pretense.',
    'Lines. Green lines on nothing, holding the shape of a valley out of habit.',
    'Gus is back there polishing the same glass. Mrs. Pell is gathering the same oranges.',
    'Somewhere a needle skips. Bar seven. Forever.',
    'Nine hundred sixty-five. Whitmore counted it too.',
  ];
  const LINE_T0 = 2.6, LINE_DUR = 4.4;

  function startEnding() {
    if (FLAGS.boundaryReached) return;
    FLAGS.boundaryReached = true;
    G.state = 'ENDING';
    E.t = 0; E.lineIdx = -1; E.done = false;
    E.car = G.inCar; E.v0 = G.car ? G.car.v : 0;
    G.endingSlow = 1;
    E.camFrom = { pos: refs.camera.position.clone(), quat: refs.camera.quaternion.clone() };
    if (AUDIO.endingBegin) AUDIO.endingBegin();
    UI.letterbox(true);
    QUEST.checkObjectives();
    dlog('ending:start');
  }

  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m4 = new THREE.Matrix4();
  function stepEnding(dt) {
    E.t += dt;
    G.endingSlow = Math.max(0, 1 - E.t / 2.4);
    // car coasts to a stop, world refuses it
    if (E.car && G.car) {
      G.car.v = E.v0 * G.endingSlow;
      const fwd = { x: Math.sin(G.car.th), z: Math.cos(G.car.th) };
      G.car.x += fwd.x * G.car.v * dt; G.car.z += fwd.z * G.car.v * dt;
      G.car.pose();
      if (AUDIO.setEngine) AUDIO.setEngine(G.endingSlow * 0.4, Math.abs(G.car.v));
    }
    // cinematic camera: pull back and face the wall
    const base = E.car && G.car ? _v1.set(G.car.x, terrainH(G.car.x, G.car.z) + 1.4, G.car.z) : _v1.set(G.player.x, terrainH(G.player.x, G.player.z) + CFG.EYE, G.player.z);
    const od = Math.max(1e-4, Math.sqrt(base.x * base.x + base.z * base.z));
    const ox = base.x / od, oz = base.z / od;
    const k = ss(0, 7, E.t);
    const rise = 2.6 + E.t * 0.22;
    _v2.set(base.x - ox * (7 + E.t * 0.25), base.y + rise * k, base.z - oz * (7 + E.t * 0.25));
    refs.camera.position.lerpVectors(E.camFrom.pos, _v2, k);
    const wallPt = { x: ox * CFG.D_WALL, y: 26 + 14 * k, z: oz * CFG.D_WALL };
    _m4.lookAt(refs.camera.position, _v2.set(wallPt.x, wallPt.y, wallPt.z), _v1.set(0, 1, 0));
    _q.setFromRotationMatrix(_m4);
    refs.camera.quaternion.copy(E.camFrom.quat).slerp(_q, k);
    // typed monologue
    const idx = Math.floor((E.t - LINE_T0) / LINE_DUR);
    if (idx >= 0 && idx < LINES.length && idx !== E.lineIdx) {
      E.lineIdx = idx; UI.endingLine(LINES[idx]);
    }
    if (idx >= LINES.length && !E.done) {
      E.done = true;
      UI.endingLine('');
      setTimeoutish(() => showTerminal(), 1.4);
    }
  }
  // tiny scheduler that works headless (driven by update)
  const timers = [];
  function setTimeoutish(fn, sec) { timers.push({ fn, at: E.t + sec }); }
  function pumpTimers() { for (let i = timers.length - 1; i >= 0; i--) { if (E.t >= timers[i].at) { const f = timers[i].fn; timers.splice(i, 1); f(); } } }

  const TERMINAL_TEXT = [
    'MERIDIAN CIVIC SYSTEMS',
    'UNIT 03 \u2014 \u201cANGEL CITY\u201d',
    '',
    'CYCLE 14,022 \u00b7 STATUS: NOMINAL',
    'SUBJECT V-1937-0042 (VOSS, H.) AT WORLD BOUNDARY',
    'CONTINUITY BREACH: NONE \u00b7 MEMORY POLICY: RETAIN',
    '',
    'SELECT:',
  ].join('\n');

  function showTerminal() {
    G.state = 'TERMINAL';
    UI.showTerminal(TERMINAL_TEXT, ['RETURN TO LOOP', 'END SESSION']);
    dlog('terminal:show');
  }

  function choose(which) {
    if (G.state !== 'TERMINAL') return;
    if (which === 'loop' || which === 0) {
      UI.hideTerminal();
      UI.fade(() => {
        FLAGS.returned = true;
        G.dayMin = CFG.START_MIN; G.gameMin = CFG.START_MIN;
        const P = G.player; P.x = -4; P.z = -3.4; P.yaw = Math.PI / 2; P.pitch = 0;
        G.inCar = false; G.inside = null;
        if (G.car) {
          G.car.v = 0; G.car.x = 10; G.car.z = -4.2; G.car.th = Math.PI / 2;
          G.car.setLights(false); G.car.pose();
        }
        G.endingSlow = 1; G.camSnap = true;
        UI.letterbox(false); UI.endingLine('');
        G.state = 'PLAY';
        QUEST.checkObjectives();
        UI.toast('7:24 PM. Friday, June 11th, 1937.');
        if (AUDIO.loopReturn) AUDIO.loopReturn();
        dlog('ending:loop');
      });
    } else {
      G.state = 'CREDITS';
      UI.showCredits();
      dlog('ending:end');
    }
  }

  function postUpdate() { if (G.state === 'ENDING') pumpTimers(); }

  return { init, update, postUpdate, startEnding, choose, nightF, duskF, LINES, TERMINAL_TEXT };
})();
