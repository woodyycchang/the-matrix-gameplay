// ============ 04 world: town ============
const TOWN = (() => {
  const M = MAT.lib;
  let scene;
  const nightSwap = [];   // {mat, day, night}
  const neonMats = [];    // flicker targets {mat, base}
  const lampHeads = [];

  function plane(w, d, mat, x, y, z, repX, repY, rotY) {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    if (rotY) g.rotateY(rotY);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    if (repX && mat.map) { mat.map.repeat.set(repX, repY); }
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  function box(w, h, d, mat, x, y, z, cast) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (cast !== false) m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  // facade-front building. side: -1 building is north of Main (front faces +z), +1 south (front faces -z)
  function building(key, x, side, w, h, d, opts) {
    const o = Object.assign({ floors: Math.max(1, Math.round(h / 4.6)), cols: Math.max(2, Math.round(w / 5)), wallMat: M.stuccoTan, brickMode: false, base: '#c9b896', trim: '#6e5a40', awning: null, litChance: 0.75, sign: null, neon: null, parapet: true }, opts);
    const z = side * (9.6 + d / 2);
    const grp = new THREE.Group();
    const fd = T.facade(key, { base: o.base, trim: o.trim, floors: o.floors, cols: o.cols, brickMode: o.brickMode, awning: o.awning, lit: false, litChance: o.litChance });
    const fn = T.facade(key, { base: o.base, trim: o.trim, floors: o.floors, cols: o.cols, brickMode: o.brickMode, awning: o.awning, lit: true, litChance: o.litChance });
    const frontMat = new THREE.MeshLambertMaterial({ map: fd });
    nightSwap.push({ mat: frontMat, day: fd, night: fn });
    const sideMat = o.brickMode ? M.brick : o.wallMat;
    // box face order: +x,-x,+y,-y,+z,-z
    const mats = side < 0
      ? [sideMat, sideMat, M.roof, sideMat, frontMat, sideMat]
      : [sideMat, sideMat, M.roof, sideMat, sideMat, frontMat];
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    body.position.set(0, h / 2, 0);
    body.castShadow = true; body.receiveShadow = true;
    grp.add(body);
    if (o.parapet) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.7, d + 0.3), new THREE.MeshLambertMaterial({ color: o.trim }));
      p.position.set(0, h + 0.35, 0); grp.add(p);
    }
    grp.position.set(x, 0, z);
    scene.add(grp);
    addBox(G.colliders, x, z, w / 2, d / 2);
    const frontZ = z - side * (d / 2);
    if (o.sign) addSign(o.sign, x, frontZ - side * 0.12, side, w);
    if (o.neon) addNeon(o.neon, x, frontZ - side * 0.3, side);
    return { grp, x, z, w, h, d, side, frontZ };
  }

  function addSign(s, x, z, side, bw) {
    const tex = T.sign(s.key, s.text, { sub: s.sub, glow: s.glow, fg: s.fg || '#e8dcc2', bg: s.bg || '#1c1a17', font: s.font || 'bold 64px Georgia, "Times New Roman", serif', border: s.border });
    const w = s.w || Math.min(bw * 0.82, 9);
    const h = w * (s.ratio || 0.25);
    const mat = s.glow ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x + (s.dx || 0), s.y || 4.2, z);
    m.rotation.y = side < 0 ? 0 : Math.PI;
    scene.add(m);
    if (s.glow) neonMats.push({ mat, base: 1 });
    return m;
  }

  function addNeon(n, x, z, side) {
    // glow sprite + light
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(n.key, n.color, n.inner), color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    spr.scale.set(n.s || 7, (n.s || 7) * 0.6, 1);
    spr.position.set(x + (n.dx || 0), n.y || 4.6, z - side * 0.4);
    scene.add(spr);
    neonMats.push({ mat: spr.material, base: 0.55, sprite: true, seed: x });
    if (n.light) {
      const pl = new THREE.PointLight(n.lightColor || n.color, 0.0, 26, 2);
      pl.position.set(x + (n.dx || 0), (n.y || 4.6) - 0.4, z - side * 2.2);
      scene.add(pl);
      G.nightLights.push({ light: pl, max: n.intensity || 1.1, flicker: n.flicker });
    }
  }

  function lamp(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.6, 6), M.iron);
    pole.position.y = 2.3; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.07), M.iron);
    arm.position.set(z > 0 ? -0.42 : 0.42, 4.5, 0); g.add(arm);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x33301f });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), headMat);
    head.position.set(z > 0 ? -0.84 : 0.84, 4.42, 0); g.add(head);
    const pool = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('lamp', 'rgba(255,196,100,0.85)'), transparent: true, opacity: 0, depthWrite: false }));
    pool.scale.set(7, 7, 1); pool.position.set(z > 0 ? -0.84 : 0.84, 3.2, 0);
    g.add(pool);
    g.position.set(x, 0, z);
    scene.add(g);
    addCircle(G.colliders, x, z, 0.22);
    lampHeads.push({ headMat, pool: pool.material });
  }

  function palm(x, z, s) {
    s = s || 1;
    const h = (5.5 + R() * 2.5) * s;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.26 * s, h, 6), M.palmTrunk);
    trunk.position.set(x, h / 2, z); trunk.rotation.z = (R() - 0.5) * 0.08; trunk.castShadow = true;
    scene.add(trunk);
    for (let i = 0; i < 7; i++) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(2.6 * s, 0.05, 0.5 * s), M.palmFrond);
      const a = (i / 7) * TAU + R() * 0.5;
      fr.position.set(x + Math.cos(a) * 1.05 * s, h + 0.1, z + Math.sin(a) * 1.05 * s);
      fr.rotation.y = -a; fr.rotation.z = 0.42 + R() * 0.2;
      fr.castShadow = true;
      scene.add(fr);
    }
    addCircle(G.colliders, x, z, 0.3);
  }

  function phonePole(x, z) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 7.4, 6), M.pole);
    p.position.set(x, 3.7, z); p.castShadow = true; scene.add(p);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.1), M.pole);
    cross.position.set(x, 6.7, z); scene.add(cross);
    addCircle(G.colliders, x, z, 0.18);
    return { x, z };
  }
  function wireBetween(a, b, sag, pts) {
    pts = pts || 8;
    for (const dy of [0, -0.35]) {
      const arr = [];
      for (let i = 0; i <= pts; i++) {
        const t = i / pts;
        arr.push(new THREE.Vector3(
          lerp(a.x, b.x, t),
          6.7 + dy - Math.sin(t * Math.PI) * sag,
          lerp(a.z, b.z, t)
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(arr);
      scene.add(new THREE.Line(geo, M.wire));
    }
  }

  function bungalow(x, z, side, palette) {
    // side: front faces toward Palm Ave (z=64). side=-1 house south of ave (front +z), +1 north (front -z)
    const w = 7.5 + R() * 2, d = 6.5, h = 3.2;
    const wall = palette;
    const body = box(w, h, d, wall, x, h / 2, z);
    // gable roof: rotated box sunk into the top
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, w * 0.76, d + 0.9), M.roof);
    roof.rotation.z = Math.PI / 4;
    roof.position.set(x, h + 0.18, z);
    roof.scale.y = 0.5; roof.scale.x = 0.95;
    roof.castShadow = true;
    scene.add(roof);
    // porch
    const pz = z + side * (d / 2 + 1.0);
    const porch = box(w * 0.5, 0.25, 2.0, M.wood, x, 0.13, pz, false);
    const canopyM = box(w * 0.5, 0.12, 2.2, M.woodDark, x, 2.5, pz, false);
    for (const px of [x - w * 0.22, x + w * 0.22]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 6), M.white);
      post.position.set(px, 1.35, pz + side * 0.9); scene.add(post);
    }
    // door + windows (front face)
    const fz = z + side * (d / 2 + 0.02);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.0), M.woodDark);
    door.position.set(x, 1.0, fz); door.rotation.y = side < 0 ? Math.PI : 0;
    if (side > 0) door.rotation.y = 0; else door.rotation.y = 0;
    door.rotation.y = side > 0 ? Math.PI : 0;
    scene.add(door);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x2c3744 });
    nightSwap.push({ mat: winMat, dayColor: 0x2c3744, nightColor: R() < 0.7 ? 0xffd98a : 0x121826, colorOnly: true });
    for (const wx of [x - w * 0.28, x + w * 0.28]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.2), winMat);
      win.position.set(wx, 1.5, fz); win.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(win);
    }
    // chimney
    const ch = box(0.5, 1.8, 0.5, M.brick, x + w * 0.3, h + 1.2, z - side * 1.2);
    addBox(G.colliders, x, z, w / 2, d / 2);
    return { x, z: z - side * 1.2, chTop: h + 2.1 };
  }

  function chimneySmoke(x, y, z) {
    const puffs = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('smoke', 'rgba(170,165,160,0.28)', 'rgba(190,185,180,0.34)'), transparent: true, opacity: 0.16, depthWrite: false }));
      s.position.set(x, y + i * 0.8, z);
      s.scale.set(0.8, 0.8, 1);
      scene.add(s);
      puffs.push({ s, ph: i / 3 });
    }
    G.anim.push({
      update(dt, t) {
        for (const p of puffs) {
          const u = ((t * 0.12 + p.ph) % 1);
          p.s.position.set(x + Math.sin(t * 0.7 + p.ph * 9) * 0.3 + u * 0.8, y + u * 3.2, z);
          const sc = 0.5 + u * 1.1;
          p.s.scale.set(sc, sc, 1);
          p.s.material.opacity = 0.26 * (1 - u);
        }
      }
    });
  }

  function crosswalk(x, z, alongX) {
    for (let i = -2; i <= 2; i++) {
      const m = plane(alongX ? 0.6 : 3.4, alongX ? 3.4 : 0.6, new THREE.MeshLambertMaterial({ color: 0xb8b09a }), alongX ? x + i * 1.3 : x, 0.055, alongX ? z : z + i * 1.3);
      m.receiveShadow = true;
    }
  }

  function build(sc) {
    scene = sc;
    G.nightLights = G.nightLights || [];

    // ---------------- streets ----------------
    const asph = M.asphalt; asph.map.repeat.set(40, 4);
    // Main St: x -150..160 (regular), east road handled by shader strip
    const mainRoad = plane(310, 12, asph, 5, 0.045, 0, 0, 0); mainRoad.material = asph;
    // map repeat is per-material; we want per-mesh -> clone materials for differently sized planes
    function roadPlane(w, d, x, z, rep) {
      const m2 = M.asphalt.clone(); m2.map = T.asphalt().clone(); m2.map.needsUpdate = true;
      m2.map.wrapS = m2.map.wrapT = THREE.RepeatWrapping; m2.map.repeat.set(rep[0], rep[1]);
      return plane(w, d, m2, x, 0.045, z);
    }
    scene.remove(mainRoad);
    roadPlane(310, 12, 5, 0, [40, 1.6]);
    roadPlane(10, 80, -60, 32, [1.4, 10]);                 // cross west (Main->Palm)
    roadPlane(10, 80, 60, 32, [1.4, 10]);                  // cross east
    roadPlane(220, 10, 0, CFG.PALM_Z, [30, 1.4]);          // Palm Ave
    // east grove road (shader fade) x 150..860
    const eg = new THREE.PlaneGeometry(710, 11);
    eg.rotateX(-Math.PI / 2);
    const eastRoad = new THREE.Mesh(eg, M.eastRoad);
    eastRoad.position.set(505, 0.05, 0);
    eastRoad.frustumCulled = false;
    scene.add(eastRoad);

    // center dashes on Main (in town)
    const dashMat = new THREE.MeshLambertMaterial({ color: 0xb8a86a });
    for (let x = -146; x < 156; x += 8) plane(3.2, 0.22, dashMat, x, 0.052, 0);

    // ---------------- sidewalks ----------------
    function walkPlane(w, d, x, z, rep) {
      const m2 = M.sidewalk.clone(); m2.map = T.sidewalk().clone(); m2.map.needsUpdate = true;
      m2.map.wrapS = m2.map.wrapT = THREE.RepeatWrapping; m2.map.repeat.set(rep[0], rep[1]);
      const p = plane(w, d, m2, x, 0.06, z);
      return p;
    }
    walkPlane(310, 3.4, 5, -7.7, [52, 1]);   // north walk Main
    walkPlane(310, 3.4, 5, 7.7, [52, 1]);    // south walk Main
    walkPlane(3.4, 60, -66.7, 38, [1, 10]);
    walkPlane(3.4, 60, -53.3, 38, [1, 10]);
    walkPlane(3.4, 60, 53.3, 38, [1, 10]);
    walkPlane(3.4, 60, 66.7, 38, [1, 10]);
    walkPlane(220, 3.4, 0, CFG.PALM_Z - 6.7, [38, 1]);
    walkPlane(220, 3.4, 0, CFG.PALM_Z + 6.7, [38, 1]);

    crosswalk(-60, 0, false); crosswalk(60, 0, false);
    crosswalk(-46, 0, true); crosswalk(46, 0, true);

    // town grass under everything local (receives shadows; ground shader doesn't)
    const grassM = new THREE.MeshLambertMaterial({ map: T.grass().clone() });
    grassM.map.needsUpdate = true; grassM.map.wrapS = grassM.map.wrapT = THREE.RepeatWrapping; grassM.map.repeat.set(34, 26);
    plane(300, 190, grassM, 0, 0.012, 18);

    // ---------------- Main St buildings: NORTH side (front faces +z / south) ----------------
    building('hardware', -82, -1, 16, 6.5, 13, {
      base: '#c9b896', floors: 1, cols: 3,
      sign: { key: 'gilroy', text: 'GILROY HARDWARE', sub: 'TOOLS · PAINT · ROPE', y: 5.3, ratio: 0.22 }
    });
    building('apts', -70, -1, 9, 11.5, 13, { brickMode: true, floors: 3, cols: 2 });
    building('perlman', -40, -1, 18, 9.5, 14, {
      brickMode: true, floors: 2, cols: 4, awning: '#7a3a2e',
      sign: { key: 'perlman', text: "PERLMAN'S DRUG STORE", sub: 'SODA FOUNTAIN', y: 7.4, ratio: 0.2, glow: 'rgba(120,200,160,0.9)', fg: '#bff0d8', bg: '#15211c' },
      neon: { key: 'perl', color: 'rgba(110,220,170,0.5)', y: 7.4, s: 8 }
    });
    building('emporium', -22, -1, 14, 8.5, 14, {
      base: '#ddd2b4', floors: 2, cols: 3, awning: '#3c5a44',
      sign: { key: 'mercantile', text: 'BAUM & SONS', sub: 'DRY GOODS', y: 6.7, ratio: 0.22 }
    });
    // RIALTO theater
    const rial = building('rialto', -2, -1, 20, 14, 16, {
      base: '#c49a84', floors: 3, cols: 4, litChance: 0.35,
      sign: { key: 'rialtoMarq', text: 'SHADOWS OVER SUNSET', sub: 'PLUS NEWSREEL · 25¢', y: 5.6, ratio: 0.2, w: 13, glow: 'rgba(255,210,120,0.95)', fg: '#1c1208', bg: '#e8d9a8', border: '#8a6a2a' },
    });
    { // vertical blade sign RIALTO
      const tex = T.sign('rialtoBlade', 'RIALTO', { w: 128, h: 512, font: 'bold 76px Georgia, serif', fg: '#ffd9a0', bg: '#5a1c1c', glow: 'rgba(255,150,80,0.95)', border: '#caa56a' });
      // draw vertical: re-make with letters stacked
      const tex2 = T.make('sign_rialtoBladeV', 128, 512, (g, w, h) => {
        g.fillStyle = '#5a1c1c'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#caa56a'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
        g.fillStyle = '#ffd9a0'; g.font = 'bold 62px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.shadowColor = 'rgba(255,150,80,0.95)'; g.shadowBlur = 18;
        'RIALTO'.split('').forEach((c, i) => g.fillText(c, w / 2, 58 + i * 72));
        g.shadowBlur = 0;
      }, false);
      const bladeMat = new THREE.MeshBasicMaterial({ map: tex2, side: THREE.DoubleSide });
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 8.4), bladeMat);
      blade.position.set(-2, 10.4, rial.frontZ - 1.0);
      blade.rotation.y = Math.PI / 2;
      scene.add(blade);
      neonMats.push({ mat: bladeMat, base: 1 });
      addNeon({ key: 'rialto', color: 'rgba(255,160,90,0.55)', y: 9.6, s: 12, light: true, lightColor: 0xff9a50, intensity: 1.3 }, -2, rial.frontZ, -1);
    }
    building('moon', 20, -1, 14, 7.5, 13, {
      base: '#9aa382', floors: 1, cols: 3,
      sign: { key: 'moon', text: 'MOON CAFE', sub: 'OPEN LATE', y: 6.0, ratio: 0.24, glow: 'rgba(140,190,255,0.95)', fg: '#cfe4ff', bg: '#101a26' },
      neon: { key: 'moon', color: 'rgba(120,180,255,0.5)', y: 6.0, s: 9, light: true, lightColor: 0x86b4ff, intensity: 1.0 }
    });
    building('savings', 44, -1, 20, 10.5, 14, {
      base: '#cfc4a4', trim: '#4a4234', floors: 2, cols: 5, litChance: 0.25,
      sign: { key: 'savings', text: 'CITRUS BELT SAVINGS', sub: 'FOUNDED 1907', y: 8.4, ratio: 0.2 }
    });
    building('garage', 80, -1, 22, 6, 14, {
      base: '#b8ad94', floors: 1, cols: 4,
      sign: { key: 'garage', text: 'EASTSIDE GARAGE', sub: 'GAS · OIL · TIRES', y: 5.0, ratio: 0.22 }
    });

    // ---------------- Main St buildings: SOUTH side (front faces -z / north) ----------------
    building('westernu', -84, 1, 12, 7, 13, {
      base: '#ddd2b4', floors: 1, cols: 3,
      sign: { key: 'wires', text: 'POSTAL TELEGRAPH', y: 5.6, ratio: 0.22 }
    });
    building('tailor', -70, 1, 12, 8.5, 13, {
      brickMode: true, floors: 2, cols: 3,
      sign: { key: 'tailor', text: 'ROSSI TAILOR', y: 6.6, ratio: 0.24 }
    });
    // THE BLUE PACIFIC
    const blue = building('bluepac', -16, 1, 18, 9, 14, {
      base: '#39506a', trim: '#1f2c3a', floors: 2, cols: 4, litChance: 0.85,
      sign: { key: 'bluepac', text: 'THE BLUE PACIFIC', sub: 'COCKTAILS · MUSIC NIGHTLY', y: 7.0, ratio: 0.22, glow: 'rgba(90,200,255,0.95)', fg: '#bfeaff', bg: '#0c1622', border: '#3a6a8a' },
      neon: { key: 'blue', color: 'rgba(80,190,255,0.55)', y: 7.0, s: 12, light: true, lightColor: 0x5ac8ff, intensity: 1.5, flicker: true }
    });
    { // door + martini glass neon
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), M.woodDark);
      door.position.set(-16, 1.3, blue.frontZ - 0.06); door.rotation.y = Math.PI; scene.add(door);
      const gl2 = T.make('neon_martini', 128, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h); g.strokeStyle = '#7fe7ff'; g.lineWidth = 7; g.shadowColor = '#37c4ff'; g.shadowBlur = 16; g.lineCap = 'round';
        g.beginPath(); g.moveTo(26, 30); g.lineTo(102, 30); g.lineTo(64, 72); g.closePath(); g.stroke();
        g.beginPath(); g.moveTo(64, 72); g.lineTo(64, 102); g.moveTo(46, 104); g.lineTo(82, 104); g.stroke();
        g.beginPath(); g.fillStyle = '#aef'; g.arc(54, 38, 5, 0, TAU); g.fill();
      }, false);
      const mm = new THREE.MeshBasicMaterial({ map: gl2, transparent: true, side: THREE.DoubleSide });
      const mg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), mm);
      mg.position.set(-22.4, 3.6, blue.frontZ - 0.7); mg.rotation.y = Math.PI / 2;
      scene.add(mg); neonMats.push({ mat: mm, base: 1, seed: 7 });
      G.interactables.push({ id: 'barDoor', x: -16, z: blue.frontZ, r: 2.4, label: 'Enter The Blue Pacific', onUse: () => QUEST.enterBar() });
    }
    building('barber', 4, 1, 10, 7, 13, {
      base: '#c9b896', floors: 1, cols: 2,
      sign: { key: 'barber', text: 'ORPHEUM BARBER', sub: 'TWO CHAIRS', y: 5.6, ratio: 0.26 }
    });
    { // barber pole
      const tex = T.make('barberpole', 64, 128, (g, w, h) => {
        g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, w, h);
        for (let i = -2; i < 8; i++) { g.fillStyle = i % 2 ? '#b03030' : '#3050a0'; g.save(); g.translate(0, i * 22); g.rotate(-0.45); g.fillRect(-40, 0, 160, 10); g.restore(); }
      });
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 10), new THREE.MeshLambertMaterial({ map: tex }));
      p.position.set(9.6, 2.6, 9.4); scene.add(p);
      G.dynamicRoots.push(p);
      G.anim.push({ update(dt) { p.rotation.y += dt * 1.4; } });
    }
    // HOTEL MERIDIAN — quiet seam in plain sight
    building('meridian', 30, 1, 22, 13.5, 15, {
      base: '#bcae8e', trim: '#5a4c38', floors: 3, cols: 5, litChance: 0.6,
      sign: { key: 'meridian', text: 'HOTEL MERIDIAN', sub: 'STEAM HEAT · WEEKLY RATES', y: 11.0, ratio: 0.2, glow: 'rgba(255,120,120,0.9)', fg: '#ffd2c2', bg: '#221012' },
      neon: { key: 'meridian', color: 'rgba(255,110,110,0.45)', y: 11.0, s: 11, light: true, lightColor: 0xff7060, intensity: 0.9 }
    });
    building('grocer', 56, 1, 16, 6.5, 13, {
      base: '#9aa382', floors: 1, cols: 3, awning: '#7a5a2e',
      sign: { key: 'produce', text: 'ANGEL CITY PRODUCE', sub: 'ORANGES 10¢ DOZ', y: 5.2, ratio: 0.22 }
    });
    building('diner2', 80, 1, 18, 7, 13, {
      base: '#ddd2b4', floors: 1, cols: 4,
      sign: { key: 'lunch', text: 'OK LUNCH ROOM', y: 5.6, ratio: 0.2 }
    });

    // ---------------- newsstand kiosk ----------------
    {
      const x = -33, z = 7.6;
      box(2.4, 2.3, 1.4, M.trimGreen, x, 1.15, z);
      box(2.8, 0.1, 1.9, M.woodDark, x, 2.42, z);
      const paperMat = new THREE.MeshLambertMaterial({ map: T.newspaper() });
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.6), paperMat);
      stack.position.set(x - 0.5, 1.42, z + 0.55); stack.rotation.y = 0.2; scene.add(stack);
      const stack2 = stack.clone(); stack2.position.set(x + 0.45, 1.42, z + 0.55); stack2.rotation.y = -0.15; scene.add(stack2);
      const tex = T.sign('news', 'NEWS', { w: 256, h: 96, fg: '#e8dcc2', bg: '#28342a', font: 'bold 56px Georgia, serif' });
      const sgn = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.66), new THREE.MeshLambertMaterial({ map: tex }));
      sgn.position.set(x, 2.0, z - 0.72); sgn.rotation.y = Math.PI; scene.add(sgn);
      addBox(G.colliders, x, z, 1.3, 0.8);
      G.interactables.push({ id: 'paper', x: x, z: z + 1.0, r: 1.7, label: 'Read the Examiner', onUse: () => QUEST.readPaper() });
    }

    // ---------------- street furniture ----------------
    for (const x of [-90, -50, -14, 24, 64, 100]) { lamp(x, -6.4); lamp(x + 18, 6.4); }
    for (const x of [-96, -36, 36, 96]) { palm(x, -8.9); palm(x + 14, 8.9); }
    // phone poles north side with wires
    let prev = null;
    for (let x = -140; x <= 150; x += 29) {
      const p = phonePole(x, -9.2);
      if (prev) wireBetween(prev, p, 0.5);
      prev = p;
    }
    // hydrant
    {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), new THREE.MeshLambertMaterial({ color: 0xa03020 }));
      h.position.set(-44, 0.41, 6.8); scene.add(h); addCircle(G.colliders, -44, 6.8, 0.25);
    }
    // bench + fig
    for (const [bx, bz] of [[-26, -7.4], [40, 7.4]]) {
      const b = box(1.9, 0.1, 0.5, M.wood, bx, 0.55, bz, false);
      box(1.9, 0.5, 0.08, M.wood, bx, 0.3, bz + (bz > 0 ? 0.24 : -0.24), false);
      for (const lx of [bx - 0.8, bx + 0.8]) box(0.08, 0.55, 0.45, M.iron, lx, 0.28, bz, false);
    }

    // ---------------- billboard at the east edge of town ----------------
    {
      const x = 132, z = -22;
      const tex = T.make('billboard', 1024, 300, (g, w, h) => {
        g.fillStyle = '#e8d9b0'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#d4641e'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
        g.textAlign = 'center';
        g.fillStyle = '#b8541a'; g.font = 'bold 104px Georgia, serif';
        g.fillText('THE ORANGE EMPIRE', w / 2, 124);
        g.fillStyle = '#3c5a44'; g.font = 'italic 44px Georgia, serif';
        g.fillText("CALIFORNIA'S GOLD · SUNSHINE IN EVERY CRATE", w / 2, 196);
        g.font = '30px Georgia, serif'; g.fillStyle = '#6a5a3a';
        g.fillText('VALENCIA GROVES NOW BEARING — EAST GROVE ROAD', w / 2, 248);
        // little oranges
        for (let i = 0; i < 7; i++) { g.fillStyle = '#e08a1e'; g.beginPath(); g.arc(60 + i * 4, 0, 0, 0, 0); g.fill(); }
      }, false);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(17, 5), new THREE.MeshLambertMaterial({ map: tex }));
      panel.position.set(x, 4.8, z); panel.rotation.y = Math.PI * 0.62;
      scene.add(panel);
      for (const dx of [-6, 0, 6]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5, 6), M.pole);
        leg.position.set(x + dx * Math.cos(Math.PI * 0.12), 2.2, z + dx * Math.sin(Math.PI * 0.12));
        scene.add(leg);
      }
      addBox(G.colliders, x, z, 7, 1.2);
    }

    // ---------------- bungalow rows on Palm Ave ----------------
    const palettes = [M.stuccoCream, M.stuccoSage, M.stuccoRose, M.stuccoTan];
    let pi = 0;
    for (let x = -84; x <= 84; x += 21) {
      if (Math.abs(x) > 48 || true) {
        const b1 = bungalow(x + (R() - 0.5) * 2, 48, 1, palettes[pi++ % 4]);
        chimneySmoke(b1.x + 2.2, b1.chTop, b1.z);
      }
    }
    for (let x = -74; x <= 84; x += 23) {
      const b2 = bungalow(x + (R() - 0.5) * 2, 80, -1, palettes[pi++ % 4]);
      if (R() < 0.5) chimneySmoke(b2.x + 2.2, b2.chTop, b2.z);
    }
    for (let x = -88; x <= 88; x += 16) { palm(x, 57.2, 0.9); palm(x + 8, 70.8, 0.9); }

    // picket fences along Palm
    const fenceMat = M.white;
    for (let x = -90; x <= 90; x += 1.1) {
      if (Math.abs((x % 21) - 10.5) < 1.6) continue; // gaps at walks
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.04), fenceMat);
      pk.position.set(x, 0.4, 54.6); scene.add(pk);
    }

    G.neonMats = neonMats; G.nightSwapList = nightSwap; G.lampHeads = lampHeads;
  }

  return { build };
})();
