// ============ 09 player & input ============
const PLAYER = (() => {
  const keys = {};
  const pressed = {};
  let mouseDX = 0, mouseDY = 0;
  const virtual = { f: 0, b: 0, l: 0, r: 0, run: 0, lookX: 0, lookY: 0 };
  let canvasEl = null;

  function onKey(e, down) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (down && !keys[k]) pressed[k] = true;
    keys[k] = down;
    if (down && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  }

  function init(canvas) {
    canvasEl = canvas;
    if (ENV.headless) return;
    WIN.addEventListener('keydown', e => onKey(e, true));
    WIN.addEventListener('keyup', e => onKey(e, false));
    DOC.addEventListener('mousemove', e => {
      if (DOC.pointerLockElement === canvasEl) { mouseDX += e.movementX || 0; mouseDY += e.movementY || 0; }
    });
    canvas.addEventListener('click', () => {
      if (G.state === 'PLAY' && DOC.pointerLockElement !== canvasEl && !G.isTouch) {
        canvas.requestPointerLock && canvas.requestPointerLock();
      }
    });
  }

  function key(k) { return !!keys[k] || (G.debugKeys && G.debugKeys[k]); }
  function justPressed(k) { const v = pressed[k] || (G.debugPressed && G.debugPressed[k]); if (G.debugPressed) G.debugPressed[k] = false; return !!v; }

  function moveInput() {
    return {
      f: (key('w') || key('ArrowUp') ? 1 : 0) + virtual.f,
      b: (key('s') || key('ArrowDown') ? 1 : 0) + virtual.b,
      l: (key('a') || key('ArrowLeft') ? 1 : 0) + virtual.l,
      r: (key('d') || key('ArrowRight') ? 1 : 0) + virtual.r,
      run: key('Shift') || virtual.run,
    };
  }

  function findInteract() {
    let best = null, bestD = 1e9;
    for (const it of G.interactables) {
      if ((it.inside || null) !== G.inside) continue;
      if (it.hidden && !it.revealed) continue;
      const d2 = dist2(G.player.x, G.player.z, it.x, it.z);
      if (d2 < it.r * it.r && d2 < bestD) { best = it; bestD = d2; }
    }
    // car entry as pseudo-interactable
    if (!G.inside && !G.inCar && G.car) {
      const d2 = dist2(G.player.x, G.player.z, G.car.x, G.car.z);
      if (d2 < 3.4 * 3.4 && d2 < bestD) best = { id: 'car', label: 'Get in the car', onUse: () => enterCar() };
    }
    return best;
  }

  function enterCar() {
    G.inCar = true;
    G.nearInteract = null;
    if (isNight()) G.car.setLights(true);
    AUDIO.engineStart();
    UI.toast('W to drive · S brake/reverse · A/D steer · E to step out · R radio');
    dlog('entered car');
  }
  function exitCar() {
    G.inCar = false;
    const lx = Math.cos(G.car.th), lz = -Math.sin(G.car.th);
    let px = G.car.x + lx * 2.0, pz = G.car.z + lz * 2.0;
    [px, pz] = collideCircle(G.colliders, px, pz, CFG.BODY_R);
    G.player.x = px; G.player.z = pz;
    G.player.yaw = G.car.th;
    AUDIO.setEngine(0, 0);
    dlog('exited car');
  }

  function isNight() {
    const m = G.dayMin;
    return m >= 19 * 60 + 52 || m < 5 * 60 + 40;
  }

  function update(dt, cam) {
    // consume mouse look
    if (G.state === 'PLAY' && !G.inCar) {
      const sx = mouseDX + virtual.lookX, sy = mouseDY + virtual.lookY;
      G.player.yaw -= sx * 0.0023;
      G.player.pitch = clamp(G.player.pitch - sy * 0.0023, -1.45, 1.45);
    }
    mouseDX = 0; mouseDY = 0; virtual.lookX = 0; virtual.lookY = 0;

    if (G.state === 'PLAY') {
      const inp = moveInput();
      if (G.inCar) {
        VEH.updateCar(dt, { f: inp.f > 0, b: inp.b > 0, l: inp.l > 0, r: inp.r > 0 });
        G.player.x = G.car.x; G.player.z = G.car.z;   // world systems track the driver
        if (justPressed('e')) exitCar();
        if (justPressed('f')) G.car.setLights(!G.car.lights);
        if (justPressed('r')) AUDIO.radioCycle();
      } else {
        const fx = Math.sin(G.player.yaw), fz = Math.cos(G.player.yaw);
        const rx = -Math.cos(G.player.yaw), rz = Math.sin(G.player.yaw);
        let mx = fx * (inp.f - inp.b) + rx * (inp.r - inp.l);
        let mz = fz * (inp.f - inp.b) + rz * (inp.r - inp.l);
        const len = Math.hypot(mx, mz);
        if (len > 0.001) {
          const sp = (inp.run ? CFG.RUN : CFG.WALK) * dt / len;
          let px = G.player.x + mx * sp, pz = G.player.z + mz * sp;
          const set = G.inside ? G.barColliders : G.colliders;
          [px, pz] = collideCircle(set, px, pz, CFG.BODY_R);
          G.player.x = px; G.player.z = pz;
          G.bobT = (G.bobT || 0) + dt * (inp.run ? 11 : 7.5);
          AUDIO.step(dt, inp.run);
        }
        const it = findInteract();
        G.nearInteract = it;
        if (justPressed('e') && it) it.onUse();
      }
      if (justPressed('j')) UI.openJournal();
    }
    if (justPressed('m')) { G.muted = !G.muted; AUDIO.setMuted(G.muted); UI.toast(G.muted ? 'Sound off' : 'Sound on'); }
    if (justPressed('Escape')) UI.escape();

    updateCamera(dt, cam);
    // clear edge-pressed
    for (const k in pressed) pressed[k] = false;
  }

  const camTmp = new THREE.Vector3();
  function updateCamera(dt, cam) {
    if (!cam) return;
    if (G.inCar) {
      const c = G.car;
      const fx = Math.sin(c.th), fz = Math.cos(c.th);
      const ty = terrainH(c.x, c.z);
      camTmp.set(c.x - fx * 7.6, ty + 3.2, c.z - fz * 7.6);
      const k = 1 - Math.exp(-dt * 5.5);
      if (G.camSnap) { cam.position.copy(camTmp); G.camSnap = false; }
      else cam.position.lerp(camTmp, k);
      // keep chase cam above terrain
      const minY = terrainH(cam.position.x, cam.position.z) + 1.2;
      if (cam.position.y < minY) cam.position.y = minY;
      cam.lookAt(c.x + fx * 4.5, ty + 1.25, c.z + fz * 4.5);
    } else {
      const p = G.player;
      const baseY = G.inside ? 0 : terrainH(p.x, p.z);
      const bob = Math.sin(G.bobT || 0) * 0.035;
      cam.position.set(p.x, baseY + CFG.EYE + bob, p.z);
      cam.rotation.order = 'YXZ';
      cam.rotation.y = p.yaw + Math.PI;
      cam.rotation.x = p.pitch;
      cam.rotation.z = 0;
    }
  }

  return { init, update, enterCar, exitCar, isNight, virtual, justPressed, key };
})();
