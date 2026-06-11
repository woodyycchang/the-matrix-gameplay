// ============ 05 world: groves & the edge ============
const GROVES = (() => {
  const M = MAT.lib;
  let scene;

  function treeField() {
    // deterministic orchard grid with jitter; density thins toward the edge
    const near = [], far = [], wire = [];
    const step = 13;
    for (let gx = -840; gx <= 880; gx += step) {
      for (let gz = -840; gz <= 840; gz += step) {
        const x = gx + (R() - 0.5) * 3.2, z = gz + (R() - 0.5) * 3.2;
        const d = Math.sqrt(x * x + z * z);
        if (d < 165 || d > 832) continue;
        // exclusions: town rect, road corridors, shack clearing, windmill
        if (x > -160 && x < 160 && z > -50 && z < 118) continue;
        if (Math.abs(z) < 13.5 && x > 130) continue;                  // east grove road
        if (dist2(x, z, 335, 26) < 14 * 14) continue;                  // shack clearing
        if (dist2(x, z, 240, -42) < 11 * 11) continue;                 // windmill
        if (dist2(x, z, 760, -2) < 9 * 9) continue;                    // truck
        const keep = 1 - ss(480, 810, d) * 0.88;
        if (R() > keep) continue;
        const rec = { x, z, y: terrainH(x, z), d, s: 0.85 + R() * 0.4, rot: R() * TAU };
        if (d > CFG.D_TREEWIRE) wire.push(rec);
        else if (d < 300) near.push(rec);
        else far.push(rec);
        addCircle(G.colliders, x, z, 0.5);
      }
    }
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    function makeSet(recs, shadow) {
      if (!recs.length) return;
      const trunkG = new THREE.CylinderGeometry(0.14, 0.22, 1.5, 6);
      trunkG.translate(0, 0.75, 0);
      const canG = new THREE.IcosahedronGeometry(1.55, 1);
      canG.translate(0, 2.45, 0);
      const trunkI = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x6b5236 }), recs.length);
      const canI = new THREE.InstancedMesh(canG, new THREE.MeshLambertMaterial({ map: T.canopy() }), recs.length);
      trunkI.castShadow = shadow; canI.castShadow = shadow;
      recs.forEach((r, i) => {
        dummy.position.set(r.x, r.y, r.z);
        dummy.rotation.set(0, r.rot, (R() - 0.5) * 0.06);
        dummy.scale.set(r.s, r.s * (0.9 + R() * 0.25), r.s);
        dummy.updateMatrix();
        trunkI.setMatrixAt(i, dummy.matrix); canI.setMatrixAt(i, dummy.matrix);
        const des = ss(CFG.D_DESAT0, CFG.D_DESAT1, r.d);
        const drk = 1 - 0.92 * ss(CFG.D_DARK0, CFG.D_DARK1, r.d);
        const v = (1 - des) * 1 + des * 0.62;
        col.setRGB(v * drk, v * drk, v * drk);
        trunkI.setColorAt(i, col); canI.setColorAt(i, col);
      });
      trunkI.instanceMatrix.needsUpdate = true; canI.instanceMatrix.needsUpdate = true;
      if (trunkI.instanceColor) trunkI.instanceColor.needsUpdate = true;
      if (canI.instanceColor) canI.instanceColor.needsUpdate = true;
      scene.add(trunkI); scene.add(canI);
    }
    makeSet(near, true);
    makeSet(far, false);

    // wireframe trees — the grove forgetting how to be a grove
    if (wire.length) {
      const trunkG = new THREE.CylinderGeometry(0.14, 0.2, 1.5, 5, 1, true);
      trunkG.translate(0, 0.75, 0);
      const canG = new THREE.IcosahedronGeometry(1.5, 0);
      canG.translate(0, 2.4, 0);
      const wm1 = new THREE.MeshBasicMaterial({ color: 0x2aff70, wireframe: true, transparent: true, opacity: 0.85 });
      const wm2 = new THREE.MeshBasicMaterial({ color: 0x2aff70, wireframe: true, transparent: true, opacity: 0.85 });
      const trunkI = new THREE.InstancedMesh(trunkG, wm1, wire.length);
      const canI = new THREE.InstancedMesh(canG, wm2, wire.length);
      wire.forEach((r, i) => {
        dummy.position.set(r.x, r.y, r.z);
        dummy.rotation.set(0, r.rot, 0);
        dummy.scale.set(r.s, r.s, r.s);
        dummy.updateMatrix();
        trunkI.setMatrixAt(i, dummy.matrix); canI.setMatrixAt(i, dummy.matrix);
        const fade = 0.45 + 0.55 * (1 - ss(CFG.D_TREEWIRE, 832, r.d));
        col.setRGB(0.16 * fade + 0.05, 1.0 * fade, 0.44 * fade + 0.04);
        trunkI.setColorAt(i, col); canI.setColorAt(i, col);
      });
      trunkI.instanceMatrix.needsUpdate = true; canI.instanceMatrix.needsUpdate = true;
      scene.add(trunkI); scene.add(canI);
    }
    dlog('trees near=' + near.length + ' far=' + far.length + ' wire=' + wire.length);
  }

  // ---------- barricades ----------
  function barricadeTex(kind) {
    if (kind === 1) return T.make('barr1', 512, 128, (g, w, h) => {
      g.fillStyle = '#d8d2c2'; g.fillRect(0, 0, w, h);
      g.save();
      for (let i = -2; i < 9; i++) { g.fillStyle = i % 2 ? '#b8b09a' : '#c8541e'; g.save(); g.translate(i * 70, 0); g.transform(1, 0, -0.55, 1, 0, 0); g.fillRect(0, 0, 36, h); g.restore(); }
      g.restore();
      g.fillStyle = 'rgba(216,210,194,0.92)'; g.fillRect(40, 26, w - 80, h - 52);
      g.strokeStyle = '#1c1a17'; g.lineWidth = 4; g.strokeRect(40, 26, w - 80, h - 52);
      g.fillStyle = '#1c1a17'; g.font = 'bold 52px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('ROAD CLOSED', w / 2, h / 2 + 2);
    }, false);
    if (kind === 2) return T.make('barr2', 512, 128, (g, w, h) => {
      g.fillStyle = '#cfc4a4'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1c1a17'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#1c1a17'; g.textAlign = 'center';
      g.font = 'bold 44px Georgia, serif'; g.fillText('NO THRU TRAFFIC', w / 2, 56);
      g.font = '26px Georgia, serif'; g.fillText('BY ORDER · COUNTY OF LOS ANGELES', w / 2, 96);
    }, false);
    return T.make('barr3', 512, 160, (g, w, h) => {
      g.fillStyle = '#7d6b50'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 26) { g.fillStyle = 'rgba(40,32,22,0.4)'; g.fillRect(0, y + 24, w, 2); }
      g.fillStyle = '#e8e2d2'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 86px "Comic Sans MS", "Segoe Print", Georgia, serif';
      g.save(); g.translate(w / 2, h / 2); g.rotate(-0.03);
      g.fillText('TURN', 0, -34); g.fillText('BACK', 4, 44);
      g.restore();
      // drips
      g.fillRect(118, 96, 5, 26); g.fillRect(338, 100, 5, 34);
    }, false);
  }

  function barricade(x, kind) {
    const grp = new THREE.Group();
    const tex = barricadeTex(kind);
    const W = kind === 3 ? 4.6 : 7.2, H = kind === 3 ? 1.5 : 1.0;
    const plank = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    plank.position.y = kind === 3 ? 1.5 : 1.15;
    grp.add(plank);
    // legs (A-frames)
    for (const lx of [-W / 2 + 0.5, W / 2 - 0.5]) {
      for (const a of [0.42, -0.42]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.12), M.wood);
        leg.position.set(lx, 0.8, 0); leg.rotation.x = a;
        grp.add(leg);
      }
    }
    const drumRefs = [];
    if (kind === 2) { // oil drums
      for (const dx of [-4.4, 4.4]) {
        const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.95, 10), new THREE.MeshLambertMaterial({ color: 0x6a3c2a }));
        dr.position.set(dx, 0.48, 0); grp.add(dr);
        drumRefs.push(addCircle(G.colliders, x, dx, 0.4));
      }
    }
    if (kind === 1) { // lantern
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5520 }));
      lan.position.set(0, 1.78, 0); grp.add(lan);
      G.anim.push({ update(dt, t) { lan.material.color.setHSL(0.04, 1, 0.4 + 0.18 * Math.sin(t * 5.2)); } });
    }
    grp.position.set(x, 0, 0);
    grp.rotation.y = -Math.PI / 2;            // plank spans the road (world z), faces the approaching driver
    grp.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(grp);
    const boxRef = { x, z: 0, hw: 0.35, hd: W / 2, tag: 'barricade' };
    G.colliders.boxes.push(boxRef);
    G.barricades.push({ x, kind, grp, boxRef, drumRefs, broken: false, vel: 0 });
  }

  function roadSign(x, z, lines, small) {
    const tex = T.make('rs_' + x, 512, 192, (g, w, h) => {
      g.fillStyle = '#d8d2c2'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1c1a17'; g.lineWidth = 6; g.strokeRect(7, 7, w - 14, h - 14);
      g.fillStyle = '#1c1a17'; g.textAlign = 'center';
      g.font = 'bold 36px Georgia, serif';
      lines.forEach((ln, i) => g.fillText(ln, w / 2, 62 + i * 44));
    }, false);
    const s = small ? 2.2 : 3.0;
    const sgn = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.375), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    sgn.position.set(x, 1.9, z); sgn.rotation.y = -Math.PI / 2;
    scene.add(sgn);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.9, 6), M.pole);
    post.position.set(x, 0.95, z); scene.add(post);
    addCircle(G.colliders, x, z, 0.12);
  }

  // ---------- Whitmore's packing shack ----------
  function shack() {
    const X = 335, Z = 26;
    const g = new THREE.Group();
    const wall = M.wood;
    const W = 5.4, D = 4.4, H = 2.7;
    // walls with door gap on north (road-facing) side
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.18), wall); back.position.set(0, H / 2, D / 2); g.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, D), wall); left.position.set(-W / 2, H / 2, 0); g.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, D), wall); right.position.set(W / 2, H / 2, 0); g.add(right);
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.55, H, 0.18), wall); frontL.position.set(-W / 4 - 0.28, H / 2, -D / 2); g.add(frontL);
    const frontR = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.55, H, 0.18), wall); frontR.position.set(W / 4 + 0.28, H / 2, -D / 2); g.add(frontR);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.18), wall); lintel.position.set(0, H - 0.25, -D / 2); g.add(lintel);
    // door, ajar
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.15, 0.07), M.woodDark);
    door.geometry.translate(0.52, 0, 0);
    door.position.set(-0.55, 1.08, -D / 2); door.rotation.y = -0.5;
    g.add(door); G.shackDoor = door;
    // roof: slanted plane
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.14, D + 0.9), M.roof);
    roof.position.set(0, H + 0.22, 0); roof.rotation.x = -0.1; g.add(roof);
    // interior: floor planks, cot, stove, table, the loose board
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.1, D - 0.1), new THREE.MeshLambertMaterial({ map: T.wood() }));
    floor.position.set(0, 0.06, 0); g.add(floor);
    const cot = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 0.85), new THREE.MeshLambertMaterial({ color: 0x5a6248 }));
    cot.position.set(-W / 2 + 1.1, 0.3, D / 2 - 0.65); g.add(cot);
    const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.9, 8), M.iron);
    stove.position.set(W / 2 - 0.7, 0.55, D / 2 - 0.7); g.add(stove);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), M.iron);
    pipe.position.set(W / 2 - 0.7, 2.0, D / 2 - 0.7); g.add(pipe);
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.8), M.woodDark);
    table.position.set(W / 2 - 0.9, 0.78, -D / 2 + 0.85); g.add(table);
    for (const [lx, lz] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.76, 0.07), M.woodDark);
      leg.position.set(W / 2 - 0.9 + lx, 0.38, -D / 2 + 0.85 + lz); g.add(leg);
    }
    // dusty ledger on table
    const ledger = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.3), new THREE.MeshLambertMaterial({ color: 0x4a3a2c }));
    ledger.position.set(W / 2 - 0.9, 0.85, -D / 2 + 0.85); ledger.rotation.y = 0.3; g.add(ledger);
    // the loose floorboard near the cot
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.24), new THREE.MeshLambertMaterial({ color: 0x8a7456 }));
    board.position.set(-W / 2 + 1.15, 0.14, D / 2 - 1.35); board.rotation.y = 0.04; board.rotation.z = 0.05;
    g.add(board); G.shackBoard = board;
    g.position.set(X, 0, Z);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    // colliders: walls
    addBox(G.colliders, X, Z + D / 2, W / 2, 0.12);
    addBox(G.colliders, X - W / 2, Z, 0.12, D / 2);
    addBox(G.colliders, X + W / 2, Z, 0.12, D / 2);
    addBox(G.colliders, X - W / 4 - 0.28, Z - D / 2, W / 4 - 0.27, 0.12);
    addBox(G.colliders, X + W / 4 + 0.28, Z - D / 2, W / 4 - 0.27, 0.12);
    addBox(G.colliders, X + W / 2 - 0.9, Z - D / 2 + 0.85, 0.6, 0.4); // table
    addBox(G.colliders, X - W / 2 + 1.1, Z + D / 2 - 0.65, 0.95, 0.45); // cot
    // sign on the shack
    const stex = T.make('whitsign', 512, 110, (g2, w, h) => {
      g2.fillStyle = '#6a5a40'; g2.fillRect(0, 0, w, h);
      g2.fillStyle = '#d8ccae'; g2.font = 'bold 44px Georgia, serif'; g2.textAlign = 'center';
      g2.fillText('WHITMORE CITRUS CO.', w / 2, 56);
      g2.font = '24px Georgia, serif'; g2.fillText('PACKING · EST. 1921', w / 2, 90);
      g2.fillStyle = 'rgba(60,48,30,0.5)';
      for (let i = 0; i < 12; i++) g2.fillRect(R() * w, R() * h, 18, 4);
    }, false);
    const sgn = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.74), new THREE.MeshLambertMaterial({ map: stex }));
    sgn.position.set(X, H + 0.05, Z - D / 2 - 0.12); sgn.rotation.y = Math.PI;
    scene.add(sgn);
    // crates
    const ctex = T.make('crate', 128, 128, (g2, w, h) => {
      g2.fillStyle = '#a08858'; g2.fillRect(0, 0, w, h);
      g2.strokeStyle = '#6a5436'; g2.lineWidth = 8; g2.strokeRect(4, 4, w - 8, h - 8);
      g2.beginPath(); g2.moveTo(4, 4); g2.lineTo(w - 4, h - 4); g2.moveTo(w - 4, 4); g2.lineTo(4, h - 4); g2.stroke();
      g2.fillStyle = '#4a3a24'; g2.font = 'bold 17px Georgia, serif'; g2.textAlign = 'center';
      g2.fillText('WHITMORE', w / 2, 56); g2.fillText('VALENCIAS', w / 2, 78);
    });
    const cmat = new THREE.MeshLambertMaterial({ map: ctex });
    for (const [cx, cy, cz, ry] of [[X - 3.4, 0.45, Z - 1.2, 0.2], [X - 3.4, 1.35, Z - 1.2, -0.1], [X - 2.4, 0.45, Z - 1.6, 0.5], [X + 3.5, 0.45, Z + 0.4, -0.3]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), cmat);
      c.position.set(cx, cy, cz); c.rotation.y = ry; c.castShadow = true; scene.add(c);
    }
    addBox(G.colliders, X - 3.1, Z - 1.4, 1.0, 0.8);
    addBox(G.colliders, X + 3.5, Z + 0.4, 0.55, 0.55);
    // dirt path from road
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 21), new THREE.MeshLambertMaterial({ color: 0x7a6646 }));
    path.rotation.x = -Math.PI / 2; path.rotation.z = 0.12;
    path.position.set(X - 1, 0.03, Z / 2 + 1.5);
    scene.add(path);
    // interactables
    G.interactables.push({ id: 'shackDoor', x: X, z: Z - D / 2, r: 2.0, label: 'Open the door', onUse: () => QUEST.openShack() });
    G.interactables.push({ id: 'floorboard', x: X - W / 2 + 1.15, z: Z + D / 2 - 1.35, r: 1.3, label: 'Pry up the loose floorboard', onUse: () => QUEST.pryBoard(), hidden: true });
  }

  // ---------- abandoned truck at x=760 — the last real object ----------
  function deadTruck() {
    const X = 760, Z = -4.6;
    const g = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color: 0x2e2a26 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 1.8), body); cab.position.set(1.2, 1.35, 0); g.add(cab);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 1.5), body); hood.position.set(2.75, 1.0, 0); g.add(hood);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.7, 1.9), body); bed.position.set(-1.3, 0.95, 0); g.add(bed);
    for (const [wx, wz] of [[2.7, 0.95], [2.7, -0.95], [-0.6, 0.98], [-2.2, 0.98], [-0.6, -0.98], [-2.2, -0.98]]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), M.black);
      wh.rotation.x = Math.PI / 2; wh.position.set(wx, 0.42, wz); g.add(wh);
    }
    // green edge overlay — half-claimed by the wireframe
    g.traverse(o => {
      if (o.isMesh) {
        const eg = new THREE.EdgesGeometry(o.geometry);
        const ln = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x2aff70, transparent: true, opacity: 0.8 }));
        o.add(ln);
      }
    });
    g.position.set(X, terrainH(X, Z), Z);
    g.rotation.y = 0.45;
    scene.add(g);
    addBox(G.colliders, X, Z, 2.6, 1.6);
  }

  function windmill() {
    const X = 240, Z = -42;
    const g = new THREE.Group();
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 9.5, 0.12), M.pole);
      leg.position.set(dx * 0.9, 4.7, dz * 0.9); leg.rotation.z = -dx * 0.09; leg.rotation.x = dz * 0.09;
      g.add(leg);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), M.iron); head.position.set(0, 9.6, 0); g.add(head);
    const fan = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.4), M.white);
      const a = i / 10 * TAU;
      bl.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0);
      bl.rotation.z = a; bl.rotation.y = 0.4;
      fan.add(bl);
    }
    fan.position.set(0, 9.6, -0.55); g.add(fan);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 1.3), M.white); tail.position.set(0, 9.6, 0.9); g.add(tail);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.6, 12), M.wood); tank.position.set(2.8, 0.8, 0.4); g.add(tank);
    g.position.set(X, 0, Z);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    addBox(G.colliders, X, Z, 1.2, 1.2); addCircle(G.colliders, X + 2.8, Z + 0.4, 1.5);
    G.dynamicRoots.push(fan);
    G.anim.push({ update(dt) { fan.rotation.z += dt * 1.1; } });
  }

  function boundaryWall() {
    const geo = new THREE.CylinderGeometry(CFG.D_WALL, CFG.D_WALL, 220, 96, 1, true);
    const wall = new THREE.Mesh(geo, M.wall);
    wall.position.y = 80;
    wall.frustumCulled = false;
    scene.add(wall);
  }

  function sky() {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 18), M.sky);
    dome.frustumCulled = false;
    scene.add(dome);
    // stars
    const N = 850, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = R() * TAU, e = Math.asin(R() * 0.92 + 0.06);
      const r2 = 1390;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r2;
      pos[i * 3 + 1] = Math.sin(e) * r2;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r2;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sm = new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
    const stars = new THREE.Points(sg, sm);
    stars.frustumCulled = false;
    scene.add(stars);
    G.starsMat = sm;
    // moon
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('moon', 'rgba(220,228,255,0.9)', 'rgba(255,255,255,1)'), transparent: true, opacity: 0, depthWrite: false }));
    moon.scale.set(90, 90, 1);
    moon.position.set(-700, 760, -900);
    scene.add(moon);
    G.moonMat = moon.material;
  }

  function smudgePots() {
    const recs = [];
    for (let x = 175; x <= 470; x += 26) for (const z of [-15.5, 15.5]) recs.push({ x: x + (R() - 0.5) * 3, z });
    const geo = new THREE.CylinderGeometry(0.16, 0.22, 0.6, 7);
    geo.translate(0, 0.3, 0);
    const inst = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0x1f1c18 }), recs.length);
    const dummy = new THREE.Object3D();
    recs.forEach((r, i) => { dummy.position.set(r.x, 0, r.z); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); });
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // ---------- the ground itself ----------
  function terrain() {
    // one big displaced sheet; the vertex shader raises the far hills,
    // the fragment shader desaturates, darkens, and finally draws the grid
    const g = new THREE.PlaneGeometry(2320, 2320, 152, 152);
    g.rotateX(-Math.PI / 2);                      // bake into attributes: shader reads x,z
    const m = new THREE.Mesh(g, MAT.lib.ground);
    m.position.y = -0.06;                         // sit just under town paving
    m.frustumCulled = false;                      // verts displace beyond original bounds
    scene.add(m);
  }

  function build(sc) {
    scene = sc;
    G.barricades = [];
    terrain();
    treeField();
    barricade(300, 1);
    barricade(520, 2);
    barricade(700, 3);
    roadSign(288, -8.4, ['EAST GROVE ROAD', 'NO COUNTY SERVICE', 'BEYOND THIS POINT']);
    roadSign(512, 8.4, ['PRIVATE GROVES', 'NO TRESPASSING'], true);
    shack();
    deadTruck();
    windmill();
    boundaryWall();
    sky();
    smudgePots();
  }

  return { build };
})();
