// ============ 15 main — boot, loop, debug API ============
const GAME = (() => {
  let renderer = null, scene = null, camera = null, amb = null, dir = null;
  let lastT = 0, absT = 0, booted = false;

  // Merge static single-material Lambert meshes into one mesh per
  // (material, shadow flags, district) bucket. Cuts town draw calls ~2-3x.
  // Anything that moves, swaps visibility, or tumbles registers itself in
  // G.dynamicRoots (or is reachable from known refs) and is left alone.
  function mergeStatic(scene) {
    scene.updateMatrixWorld(true);
    const excl = new Set();
    const addRoot = (o) => { if (o) o.traverse ? o.traverse(x => excl.add(x)) : excl.add(o); };
    for (const o of G.dynamicRoots) addRoot(o);
    for (const b of G.barricades) addRoot(b.grp);
    for (const n of (NPCS.list || [])) addRoot(n.p && n.p.grp);
    addRoot(G.gusGrp); addRoot(G.ryeGlass); addRoot(G.shackDoor); addRoot(G.shackBoard);

    const buckets = new Map(), kill = [];
    scene.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || excl.has(o)) return;
      const m = o.material;
      if (!m || Array.isArray(m) || !m.isMeshLambertMaterial || m.transparent) return;
      const g = o.geometry;
      if (!g || !g.attributes.position || !g.attributes.normal) return;
      const district = Math.abs(o.getWorldPosition(V3).x) > 2000 ? 'in' : 'out';
      const key = m.uuid + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + district;
      let b = buckets.get(key);
      if (!b) { b = { mat: m, cast: o.castShadow, recv: o.receiveShadow, items: [] }; buckets.set(key, b); }
      b.items.push(o);
    });

    for (const b of buckets.values()) {
      if (b.items.length < 2) continue;
      let nv = 0, ni = 0;
      for (const o of b.items) { nv += o.geometry.attributes.position.count; ni += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
      const hasUv = b.items.every(o => o.geometry.attributes.uv);
      const uv = hasUv ? new Float32Array(nv * 2) : null;
      const idx = new Uint32Array(ni);
      let vo = 0, io = 0;
      const nm = new THREE.Matrix3();
      for (const o of b.items) {
        const g = o.geometry, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
        nm.getNormalMatrix(o.matrixWorld);
        for (let i = 0; i < p.count; i++) {
          V3.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(o.matrixWorld);
          pos[(vo + i) * 3] = V3.x; pos[(vo + i) * 3 + 1] = V3.y; pos[(vo + i) * 3 + 2] = V3.z;
          V3.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(nm).normalize();
          nor[(vo + i) * 3] = V3.x; nor[(vo + i) * 3 + 1] = V3.y; nor[(vo + i) * 3 + 2] = V3.z;
          if (uv) { uv[(vo + i) * 2] = u.getX(i); uv[(vo + i) * 2 + 1] = u.getY(i); }
        }
        if (g.index) { const ix = g.index; for (let i = 0; i < ix.count; i++) idx[io + i] = ix.getX(i) + vo; io += ix.count; }
        else { for (let i = 0; i < p.count; i++) idx[io + i] = i + vo; io += p.count; }
        vo += p.count;
        kill.push(o);
      }
      const mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (uv) mg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      mg.setIndex(new THREE.BufferAttribute(idx, 1));
      const mm = new THREE.Mesh(mg, b.mat);
      mm.castShadow = b.cast; mm.receiveShadow = b.recv;
      scene.add(mm);
    }
    for (const o of kill) { if (o.parent) o.parent.remove(o); }
    dlog('mergeStatic: ' + kill.length + ' meshes -> ' + buckets.size + ' buckets');
  }
  const V3 = new THREE.Vector3();

  function boot(opts) {
    if (booted) return api();
    booted = true;
    opts = opts || {};
    const W = opts.width || (ENV.headless ? 1280 : WIN.innerWidth);
    const H = opts.height || (ENV.headless ? 720 : WIN.innerHeight);

    scene = new THREE.Scene(); G.scene = scene;
    scene.fog = new THREE.Fog(0x2a2430, 55, 700);
    camera = new THREE.PerspectiveCamera(66, W / H, 0.12, 3000); G.camera = camera;

    if (!ENV.headless) {
      const canvas = DOC.createElement('canvas');
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(WIN.devicePixelRatio || 1, 2));
      G.renderer = renderer;
      UI.init(opts.container || DOC.body, canvas);
      WIN.addEventListener('resize', () => {
        camera.aspect = WIN.innerWidth / WIN.innerHeight; camera.updateProjectionMatrix();
        renderer.setSize(WIN.innerWidth, WIN.innerHeight);
      });
      PLAYER.init(canvas);
    } else if (opts.renderer) {
      renderer = opts.renderer; G.renderer = renderer;
      PLAYER.init(null);
    } else {
      PLAYER.init(null);
    }
    if (renderer) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // lights
    amb = new THREE.AmbientLight(0x8a7a9a, 0.4); scene.add(amb);
    dir = new THREE.DirectionalLight(0xffb070, 0.8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    const sc = dir.shadow.camera;
    sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 12; sc.far = 420;
    dir.shadow.bias = -0.0006;
    scene.add(dir); scene.add(dir.target);
    G.amb = amb; G.dir = dir;

    // world
    MAT.init();
    TOWN.build(scene);
    GROVES.build(scene);
    VEH.build(scene);
    NPCS.build(scene);
    INTERIOR.build(scene);
    mergeStatic(scene);
    EDGE.init(scene, camera, amb, dir);
    EDGE.update(0.016, 0); // settle atmosphere before first frame

    dlog('boot ok');
    if (!ENV.headless) {
      lastT = ENV.now();
      const frame = () => {
        const now = ENV.now();
        const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
        step(dt);
        WIN.requestAnimationFrame(frame);
      };
      WIN.requestAnimationFrame(frame);
    }
    return api();
  }

  function step(dt) {
    absT += dt;
    const st = G.state;
    // time flows only while playing
    if (st === 'PLAY') {
      G.gameMin += dt * 60 * CFG.MIN_PER_SEC / 60; // dt sec * 0.5 min/sec
      G.gameMin = G.gameMin; G.dayMin = ((G.gameMin % 1440) + 1440) % 1440;
    }
    if (st !== 'ENDING' && st !== 'TERMINAL' && st !== 'CREDITS') PLAYER.update(dt, camera);
    if (st === 'PLAY' || st === 'DIALOG') NPCS.update(dt);
    if (st === 'PLAY') VEH.updateTraffic(dt);
    QUEST.update(dt);
    EDGE.update(dt, absT);
    EDGE.postUpdate();
    for (let i = 0; i < G.anim.length; i++) G.anim[i].update(dt, absT);
    AUDIO.update(dt, absT);
    UI.update(dt);
    if (renderer) renderer.render(scene, camera);
  }

  // ---------------- debug API (drives the game headless or from console) ----------------
  function findInteractDebug() {
    let best = null, bestD = 1e9;
    for (const it of G.interactables) {
      if ((it.inside || null) !== G.inside) continue;
      if (it.hidden && !it.revealed) continue;
      const d2 = dist2(G.player.x, G.player.z, it.x, it.z);
      if (d2 < it.r * it.r && d2 < bestD) { best = it; bestD = d2; }
    }
    if (!G.inside && !G.inCar && G.car) {
      const d2 = dist2(G.player.x, G.player.z, G.car.x, G.car.z);
      if (d2 < 3.4 * 3.4 && d2 < bestD) best = { id: 'car', label: 'Get in the car', onUse: () => PLAYER.enterCar() };
    }
    return best;
  }
  const debug = {
    state: () => G.state,
    flags: () => FLAGS,
    player: () => ({ x: G.player.x, z: G.player.z, yaw: G.player.yaw, inCar: G.inCar, inside: G.inside }),
    car: () => G.car ? { x: G.car.x, z: G.car.z, th: G.car.th, v: G.car.v } : null,
    seams: () => G.seams.map(s => s.id),
    journalList: () => G.journal.map(j => j.title),
    objective: () => G.objective,
    log: () => G.debugLog.slice(-40),
    toasts: () => UI.rec.toasts.slice(-10),
    dialog: () => UI.rec.dialog,
    setPlayerPos(x, z, yaw) { G.player.x = x; G.player.z = z; if (yaw != null) G.player.yaw = yaw; G.camSnap = true; },
    setCarPos(x, z, th) { if (!G.car) return; G.car.x = x; G.car.z = z; if (th != null) G.car.th = th; G.car.pose(); G.camSnap = true; },
    press(k) { G.debugPressed = G.debugPressed || {}; G.debugPressed[k] = true; },
    hold(k, v) { G.debugKeys = G.debugKeys || {}; G.debugKeys[k] = !!v; },
    interactNearest() { const it = findInteractDebug(); if (it) { it.onUse(); return it.id; } return null; },
    nearest() { const it = findInteractDebug(); return it ? it.id : null; },
    choose(i) { DIALOGUE.choose(i); },
    advance() { DIALOGUE.advance(); },
    startDialog(id) { DIALOGUE.start(id); },
    begin() { UI.start(); },
    enterCarNow() { if (!G.inCar) PLAYER.enterCar(); },
    exitCarNow() { if (G.inCar) PLAYER.exitCar(); },
    radio() { AUDIO.radioCycle(); },
    forceTime(min) { G.gameMin = min; G.dayMin = ((min % 1440) + 1440) % 1440; },
    advanceGameMinutes(mins, fps) {
      // simulate real frames so schedules/physics stay honest
      const dt = 1 / (fps || 30);
      const frames = Math.ceil((mins / CFG.MIN_PER_SEC) / dt);
      for (let i = 0; i < frames; i++) step(dt);
      return frames;
    },
    stepFrames(n, dt) { for (let i = 0; i < n; i++) step(dt || 1 / 30); },
    terminal(which) { EDGE.choose(which); },
    drawCalls() { return renderer ? renderer.info.render.calls : -1; },
    triangles() { return renderer ? renderer.info.render.triangles : -1; },
    edge: () => G.edge,
    uiRec: () => UI.rec,
  };

  function api() { return { boot, step, debug }; }
  return { boot, step, debug };
})();
