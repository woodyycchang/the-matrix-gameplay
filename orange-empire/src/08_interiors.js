// ============ 08 interiors: The Blue Pacific ============
const INTERIOR = (() => {
  const M = MAT.lib;
  const CX = 4000, CZ = 0;
  let scene;

  function build(sc) {
    scene = sc;
    const g = new THREE.Group();
    const wallLow = new THREE.MeshLambertMaterial({ map: T.wood() });
    const wallHigh = new THREE.MeshLambertMaterial({ color: 0x39525a });
    const floorM = new THREE.MeshLambertMaterial({ map: T.wood().clone() });
    floorM.map.needsUpdate = true; floorM.map.wrapS = floorM.map.wrapT = THREE.RepeatWrapping; floorM.map.repeat.set(5, 4);
    const mk = (geo2, mat, x, y, z, ry) => { const m = new THREE.Mesh(geo2, mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.receiveShadow = true; g.add(m); return m; };

    // void skirt + floor + ceiling
    mk(new THREE.BoxGeometry(40, 0.2, 40), new THREE.MeshBasicMaterial({ color: 0x05060a }), 0, -0.2, 0);
    const floor = mk(new THREE.BoxGeometry(14, 0.12, 10), floorM, 0, 0.06, 0);
    mk(new THREE.BoxGeometry(14, 0.15, 10), new THREE.MeshLambertMaterial({ color: 0x453e34 }), 0, 3.32, 0);
    // walls: lower wainscot + upper paint; door gap on south wall
    function wallPair(w, x, z, ry) {
      const lo = mk(new THREE.BoxGeometry(w, 1.15, 0.16), wallLow, x, 0.65, z, ry);
      const hi = mk(new THREE.BoxGeometry(w, 2.15, 0.16), wallHigh, x, 2.28, z, ry);
      lo.castShadow = hi.castShadow = false;
    }
    wallPair(14, 0, -5, 0);                       // north
    wallPair(10, -7, 0, Math.PI / 2);             // west
    wallPair(10, 7, 0, Math.PI / 2);              // east
    wallPair(5.8, -4.1, 5, 0);                    // south-left
    wallPair(5.8, 4.1, 5, 0);                     // south-right
    mk(new THREE.BoxGeometry(2.4, 0.7, 0.16), wallHigh, 0, 2.98, 5);
    // door (closed, you interact to leave)
    mk(new THREE.BoxGeometry(1.5, 2.5, 0.1), M.woodDark, 0, 1.3, 5.02);

    // ---- the bar ----
    const counter = mk(new THREE.BoxGeometry(9.5, 1.1, 0.85), new THREE.MeshLambertMaterial({ color: 0x4a3424 }), -0.5, 0.55, -2.9);
    counter.castShadow = true;
    mk(new THREE.BoxGeometry(9.7, 0.07, 1.05), new THREE.MeshLambertMaterial({ color: 0x6e5034 }), -0.5, 1.13, -2.9);
    // brass rail
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 9.3, 6), new THREE.MeshLambertMaterial({ color: 0xa8853a }));
    rail.rotation.z = Math.PI / 2; rail.position.set(-0.5, 0.24, -2.38); g.add(rail);
    // back bar: shelf + mirror + bottles
    mk(new THREE.BoxGeometry(9.5, 2.1, 0.14), new THREE.MeshLambertMaterial({ color: 0x2c2018 }), -0.5, 1.75, -4.86);
    const mirror = mk(new THREE.PlaneGeometry(7.6, 1.3), new THREE.MeshLambertMaterial({ color: 0x6a7a82, emissive: 0x222d33 }), -0.5, 2.0, -4.78);
    for (const sy of [1.32, 1.92, 2.5]) mk(new THREE.BoxGeometry(8.6, 0.05, 0.32), M.woodDark, -0.5, sy, -4.66);
    // bottles (instanced)
    {
      const N = 42;
      const bg = new THREE.CylinderGeometry(0.045, 0.05, 0.32, 7);
      bg.translate(0, 0.16, 0);
      const cols = [0x7a4a2a, 0x3a6a4a, 0x6a3040, 0x9a7a30, 0x405a78, 0x6e6e58];
      const inst = new THREE.InstancedMesh(bg, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
      const dummy = new THREE.Object3D(); const col = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const row = i % 3, k = (i / 3) | 0;
        dummy.position.set(-4.2 + k * 0.56 + (R() - 0.5) * 0.1, [1.36, 1.96, 2.54][row], -4.62);
        dummy.rotation.y = R() * TAU; dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        col.setHex(cols[(R() * cols.length) | 0]); inst.setColorAt(i, col);
      }
      inst.instanceMatrix.needsUpdate = true;
      g.add(inst);
    }
    // stools
    for (const sx of [-3.6, -1.8, 0, 1.8, 3.4]) {
      const seat = mk(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 10), new THREE.MeshLambertMaterial({ color: 0x6a2c2c }), sx, 0.74, -1.9);
      seat.castShadow = true;
      mk(new THREE.CylinderGeometry(0.05, 0.07, 0.72, 6), M.iron, sx, 0.36, -1.9);
      addCircle(G.barColliders, CX + sx, CZ - 1.9, 0.3);
    }
    // booths along the west wall
    for (const bz of [-2.2, 0.6, 3.2]) {
      mk(new THREE.BoxGeometry(1.4, 0.1, 1.0), M.woodDark, -5.6, 0.74, bz).castShadow = true;
      mk(new THREE.BoxGeometry(0.16, 0.74, 0.16), M.woodDark, -5.6, 0.37, bz);
      for (const dz of [-0.85, 0.85]) {
        mk(new THREE.BoxGeometry(1.5, 0.45, 0.5), new THREE.MeshLambertMaterial({ color: 0x4a2a2a }), -5.9, 0.43, bz + dz);
        mk(new THREE.BoxGeometry(1.5, 0.9, 0.14), new THREE.MeshLambertMaterial({ color: 0x4a2a2a }), -5.9, 0.85, bz + dz + Math.sign(dz) * 0.26);
      }
      addBox(G.barColliders, CX - 5.7, CZ + bz, 1.0, 1.3);
    }
    // ocean painting + small Pacific neon inside
    const art = T.make('wave_art', 256, 160, (gx, w, h) => {
      gx.fillStyle = '#1c3344'; gx.fillRect(0, 0, w, h);
      gx.fillStyle = '#2c4f66';
      for (let i = 0; i < 5; i++) { gx.beginPath(); gx.moveTo(0, 60 + i * 20); for (let x = 0; x <= w; x += 8) gx.lineTo(x, 60 + i * 20 + Math.sin(x * 0.06 + i) * 7); gx.lineTo(w, h); gx.lineTo(0, h); gx.fill(); }
      gx.fillStyle = '#e8dcc2'; gx.beginPath(); gx.arc(200, 36, 14, 0, TAU); gx.fill();
      gx.strokeStyle = '#8a6a3a'; gx.lineWidth = 10; gx.strokeRect(5, 5, w - 10, h - 10);
    }, false);
    mk(new THREE.PlaneGeometry(1.7, 1.06), new THREE.MeshLambertMaterial({ map: art }), 6.9, 2.1, -1.4, -Math.PI / 2);

    // ---- phonograph on a side table, east wall ----
    const ph = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), new THREE.MeshLambertMaterial({ color: 0x3c2a1c })); cab.position.y = 0.95; ph.add(cab);
    const legG = new THREE.BoxGeometry(0.06, 0.7, 0.06);
    for (const [lx, lz] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) { const l = new THREE.Mesh(legG, M.woodDark); l.position.set(lx, 0.35, lz); ph.add(l); }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.015, 18), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    disc.position.set(0, 1.21, 0); ph.add(disc);
    const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), new THREE.MeshLambertMaterial({ color: 0xb8862a }));
    lbl.position.set(0, 1.215, 0); ph.add(lbl);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.62, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0x8a6a3a, side: THREE.DoubleSide }));
    horn.rotation.z = 1.9; horn.rotation.y = 0.4; horn.position.set(-0.18, 1.6, 0); ph.add(horn);
    ph.position.set(5.9, 0, 1.5);
    g.add(ph);
    addBox(G.barColliders, CX + 5.9, CZ + 1.5, 0.5, 0.5);
    G.dynamicRoots.push(disc);
    G.anim.push({ update(dt) { if (G.inside === 'bar') disc.rotation.y += dt * 4.6; } });

    // ---- hanging lights ----
    for (const lx of [-3.2, 0.6, 4.2]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), M.black);
      cord.position.set(lx, 2.95, -1.2); g.add(cord);
      const shadeM = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x2a4a3a, side: THREE.DoubleSide }));
      shadeM.position.set(lx, 2.55, -1.2); g.add(shadeM);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
      bulb.position.set(lx, 2.46, -1.2); g.add(bulb);
    }
    const pl1 = new THREE.PointLight(0xffc878, 1.35, 15, 1.5); pl1.position.set(-2, 2.5, -1.2); g.add(pl1);
    const pl2 = new THREE.PointLight(0xffb868, 1.1, 14, 1.5); pl2.position.set(3.6, 2.5, 0.4); g.add(pl2);
    const pl3 = new THREE.PointLight(0x88aaff, 0.25, 9, 1.8); pl3.position.set(-5.5, 2.2, 1.5); g.add(pl3);

    // candles on booth tables
    for (const bz of [-2.2, 0.6, 3.2]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.1, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
      c.position.set(-5.6, 0.84, bz); g.add(c);
    }

    g.position.set(CX, 0, CZ);
    scene.add(g);

    // room colliders (world space)
    addBox(G.barColliders, CX, CZ - 5, 7, 0.2);
    addBox(G.barColliders, CX - 7, CZ, 0.2, 5);
    addBox(G.barColliders, CX + 7, CZ, 0.2, 5);
    addBox(G.barColliders, CX - 4.1, CZ + 5, 2.9, 0.2);
    addBox(G.barColliders, CX + 4.1, CZ + 5, 2.9, 0.2);
    addBox(G.barColliders, CX - 0.5, CZ - 2.9, 4.85, 0.55);

    // ---- Gus ----
    const gus = NPCS.makePerson({ coat: 0xd8d2c2, pants: 0x2e2c28, hat: null, skin: 0xb98a62 });
    // apron + bow tie
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.4), new THREE.MeshLambertMaterial({ color: 0x2a2622 }));
    apron.position.set(0.15, 1.2, 0); gus.grp.add(apron);
    gus.grp.position.set(CX - 1.2, 0, CZ - 3.9);
    gus.grp.rotation.y = -Math.PI / 2; // face +z, into the room
    scene.add(gus.grp);
    G.gusGrp = gus.grp;
    let gt = 0;
    G.anim.push({
      update(dt) {
        if (G.inside !== 'bar') return;
        gt += dt;
        gus.armR.rotation.z = Math.sin(gt * 1.4) * 0.18 - 0.25;
        gus.armL.rotation.z = -0.1;
        if (G.state === 'DIALOG' && G.dialogNPC === 'gus') {
          gus.grp.rotation.y = Math.atan2(G.player.x - gus.grp.position.x, G.player.z - gus.grp.position.z) - Math.PI / 2;
        }
      }
    });

    // patrons
    function seatAt(p, x, z, ry) {
      p.grp.position.set(x, 0.32, z); p.grp.rotation.y = ry;
      p.legL.rotation.z = Math.PI / 2 - 0.3; p.legR.rotation.z = Math.PI / 2 - 0.34;
      p.legL.position.y = 0.6; p.legR.position.y = 0.6;
      scene.add(p.grp);
      return p;
    }
    const p1 = seatAt(NPCS.makePerson({ coat: 0x3a4452, hat: 'fedora' }), CX - 3.6, CZ - 1.55, Math.PI / 2);
    const p2 = seatAt(NPCS.makePerson({ coat: 0x5a4436, hat: null }), CX - 5.0, CZ - 1.5, -Math.PI / 2 - 0.4);
    const p3 = seatAt(NPCS.makePerson({ coat: 0x6a3a4a, hat: 'cloche', hatCol: 0x3a2230, skirt: true, skin: 0xd2a07a }), CX - 5.0, CZ + 0.0, -Math.PI / 2 + 0.4);
    let pt = 0;
    G.dynamicRoots.push(p1.grp, p2.grp, p3.grp);
    G.anim.push({
      update(dt) {
        if (G.inside !== 'bar') return;
        pt += dt;
        p1.grp.position.y = 0.32 + Math.sin(pt * 1.1) * 0.012;
        p2.armR.rotation.z = Math.sin(pt * 0.7) * 0.2 - 0.3;
        p3.grp.rotation.y = -Math.PI / 2 + 0.4 + Math.sin(pt * 0.5) * 0.06;
      }
    });

    // the rye that's already poured
    const rye = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 8), new THREE.MeshLambertMaterial({ color: 0xc9a85a, emissive: 0x3a2c10 }));
    glass.position.y = 1.22; rye.add(glass);
    rye.position.set(CX + 0.6, 0, CZ - 2.65);
    rye.visible = false;
    scene.add(rye);
    G.ryeGlass = rye;

    // interactables (active only inside)
    G.interactables.push({ id: 'gus', x: CX - 1.2, z: CZ - 2.4, r: 2.3, label: 'Talk to Gus', inside: 'bar', onUse: () => { G.dialogNPC = 'gus'; DIALOGUE.start('gus'); } });
    G.interactables.push({ id: 'phono', x: CX + 5.9, z: CZ + 1.5, r: 1.8, label: 'Look at the phonograph', inside: 'bar', onUse: () => DIALOGUE.start('phono') });
    G.interactables.push({ id: 'barExit', x: CX, z: CZ + 4.8, r: 2.0, label: 'Step out onto Main', inside: 'bar', onUse: () => QUEST.exitBar() });
  }

  return { build, CX, CZ };
})();
