// ============ 06 vehicles ============
const VEH = (() => {
  const M = MAT.lib;
  let scene;
  const traffic = [];

  // a period car out of boxes; model faces +x
  function makeCar(bodyHex, kind) {
    const g = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color: bodyHex });
    const dark = new THREE.MeshLambertMaterial({ color: 0x14120f });
    const chrome = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x1c2630 });
    const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    const isTruck = kind === 'truck';
    // running boards + frame
    mesh(new THREE.BoxGeometry(4.2, 0.16, 1.95), dark, 0, 0.42, 0);
    // main body
    mesh(new THREE.BoxGeometry(isTruck ? 1.9 : 3.0, 0.78, 1.7), body, isTruck ? 0.65 : -0.25, 0.95, 0);
    // hood (narrower, forward)
    mesh(new THREE.BoxGeometry(1.5, 0.62, 1.25), body, 1.75, 0.93, 0);
    // cab / roof
    const cab = mesh(new THREE.BoxGeometry(isTruck ? 1.25 : 1.9, 0.72, 1.55), body, isTruck ? 0.75 : -0.35, 1.66, 0);
    // windows: front + sides
    mesh(new THREE.PlaneGeometry(1.35, 0.5), glass, (isTruck ? 0.75 : -0.35) + (isTruck ? 0.64 : 0.96), 1.7, 0).rotation.y = Math.PI / 2;
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.PlaneGeometry(isTruck ? 0.9 : 1.5, 0.46), glass, isTruck ? 0.75 : -0.35, 1.68, s * 0.79);
      w.rotation.y = s > 0 ? 0 : Math.PI;
    }
    if (isTruck) mesh(new THREE.BoxGeometry(2.2, 0.55, 1.8), new THREE.MeshLambertMaterial({ color: 0x6a5a40 }), -1.35, 1.0, 0);
    else mesh(new THREE.BoxGeometry(0.8, 0.6, 1.6), body, -1.85, 1.05, 0); // trunk slope
    // grille + bumpers
    mesh(new THREE.BoxGeometry(0.1, 0.55, 1.0), chrome, 2.52, 0.93, 0);
    mesh(new THREE.BoxGeometry(0.1, 0.14, 1.9), chrome, 2.62, 0.5, 0);
    mesh(new THREE.BoxGeometry(0.1, 0.14, 1.9), chrome, isTruck ? -2.55 : -2.35, 0.5, 0);
    // fenders (half cylinders over wheels)
    const fg = new THREE.CylinderGeometry(0.55, 0.55, 0.34, 10, 1, false, 0, Math.PI);
    for (const [fx, fz] of [[1.55, 0.85], [1.55, -0.85], [-1.45, 0.85], [-1.45, -0.85]]) {
      const f = new THREE.Mesh(fg, body);
      f.rotation.z = Math.PI / 2; f.rotation.y = Math.PI / 2;
      f.position.set(fx, 0.62, fz); f.castShadow = true; g.add(f);
    }
    // wheels
    const wg = new THREE.CylinderGeometry(0.44, 0.44, 0.28, 12);
    const hub = new THREE.CylinderGeometry(0.16, 0.16, 0.3, 8);
    for (const [wx, wz] of [[1.55, 0.86], [1.55, -0.86], [-1.45, 0.86], [-1.45, -0.86]]) {
      const w = new THREE.Mesh(wg, dark); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.44, wz); g.add(w);
      const h = new THREE.Mesh(hub, chrome); h.rotation.x = Math.PI / 2; h.position.set(wx, 0.44, wz); g.add(h);
    }
    // spare on back
    if (!isTruck) { const sp = new THREE.Mesh(wg, dark); sp.rotation.y = Math.PI / 2; sp.position.set(-2.32, 1.0, 0); sp.scale.set(1, 1, 0.6); g.add(sp); }
    // headlight lenses
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x4a4636 });
    const lenses = [];
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lensMat);
      l.position.set(2.45, 1.18, s * 0.62); g.add(l); lenses.push(l);
    }
    return { grp: g, lensMat };
  }

  // ---------------- player car ----------------
  function buildPlayerCar() {
    const c = makeCar(0x7a2e22, 'sedan'); // oxblood red sedan
    const grp = c.grp;
    grp.rotation.order = 'YZX';
    G.dynamicRoots.push(grp);
    scene.add(grp);
    // headlight rig
    const spots = [];
    for (const s of [-1, 1]) {
      const sp = new THREE.SpotLight(0xffe9b0, 0, 60, 0.42, 0.55, 1.2);
      sp.position.set(2.45, 1.18, s * 0.62);
      const tgt = new THREE.Object3D(); tgt.position.set(14, 0.4, s * 1.4);
      grp.add(tgt); sp.target = tgt; grp.add(sp);
      spots.push(sp);
    }
    const beams = [];
    for (const s of [-1, 1]) {
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('beam', 'rgba(255,233,176,0.55)'), transparent: true, opacity: 0, depthWrite: false }));
      b.scale.set(2.4, 1.6, 1); b.position.set(3.4, 1.0, s * 0.62);
      grp.add(b); beams.push(b);
    }
    G.car = {
      x: 10, z: -4.2, th: Math.PI / 2, v: 0, grp,
      lights: false, lensMat: c.lensMat, spots, beams,
      setLights(on) {
        this.lights = on;
        this.lensMat.color.setHex(on ? 0xfff0c0 : 0x4a4636);
        for (const s of spots) s.intensity = on ? 1.7 : 0;
        for (const b of beams) b.material.opacity = on ? 0.5 : 0;
      },
      pose() {
        const t = this;
        const hF = terrainH(t.x + Math.sin(t.th) * 1.6, t.z + Math.cos(t.th) * 1.6);
        const hB = terrainH(t.x - Math.sin(t.th) * 1.6, t.z - Math.cos(t.th) * 1.6);
        const rx = Math.cos(t.th), rz = -Math.sin(t.th);
        const hL = terrainH(t.x - rx * 0.9, t.z - rz * 0.9);
        const hR = terrainH(t.x + rx * 0.9, t.z + rz * 0.9);
        grp.position.set(t.x, (hF + hB) / 2, t.z);
        grp.rotation.y = t.th - Math.PI / 2;
        grp.rotation.z = Math.atan2(hF - hB, 3.2);
        grp.rotation.x = Math.atan2(hL - hR, 1.8);
      },
    };
    G.car.pose();
  }

  function breakBarricade(b, dirx, dirz, v) {
    b.broken = true; b.boxRef.dead = true;
    if (b.drumRefs) for (const dr of b.drumRefs) dr.dead = true;
    FLAGS.knockedBarricade++;
    UI.toast(b.kind === 3 ? 'The sign splinters. Hand-paint and all.' : 'The barricade goes over.');
    AUDIO.thud();
    dlog('barricade broken x=' + b.x);
    const grp = b.grp, vel = { x: dirx * v * 0.35, y: 3.2 + Math.min(v * 0.12, 2.5), z: dirz * v * 0.35 };
    let life = 0;
    G.anim.push({
      update(dt) {
        if (life > 2.2) return;
        life += dt;
        vel.y -= 9.8 * dt;
        grp.position.x += vel.x * dt; grp.position.y += vel.y * dt; grp.position.z += vel.z * dt;
        grp.rotation.x += dt * 4.2; grp.rotation.z += dt * 1.8;
        if (grp.position.y < 0.18 && vel.y < 0) { vel.y *= -0.3; vel.x *= 0.6; vel.z *= 0.6; grp.position.y = 0.18; if (Math.abs(vel.y) < 0.6) life = 99; }
      }
    });
    QUEST.onBarricade();
  }

  function updateCar(dt, inp) {
    const c = G.car;
    const acc = inp.f ? CFG.CAR_ACC : 0;
    if (inp.b) {
      if (c.v > 0.4) c.v -= CFG.CAR_BRAKE * dt;
      else c.v -= CFG.CAR_ACC * 0.55 * dt;
    }
    c.v += acc * dt;
    c.v -= c.v * CFG.CAR_DRAG * dt;
    if (!inp.f && !inp.b) {
      const r = CFG.CAR_ROLL * dt;
      if (Math.abs(c.v) <= r) c.v = 0; else c.v -= Math.sign(c.v) * r;
    }
    c.v = clamp(c.v, CFG.CAR_VREV, CFG.CAR_VMAX * (G.endingSlow ? G.endingSlow : 1));
    const steer = (inp.l ? 1 : 0) - (inp.r ? 1 : 0);
    const turn = CFG.CAR_STEER * clamp(c.v / 9, -1, 1) * (1 - 0.45 * ss(11, 26, Math.abs(c.v)));
    c.th += steer * turn * dt;
    c.x += Math.sin(c.th) * c.v * dt;
    c.z += Math.cos(c.th) * c.v * dt;

    // barricade impacts first
    const fx = Math.sin(c.th), fz = Math.cos(c.th);
    for (const b of G.barricades) {
      if (b.broken) continue;
      for (const off of [1.9, 0.4]) {
        const px = c.x + fx * off, pz = c.z + fz * off;
        const ox = (b.boxRef.hw + 0.95) - Math.abs(px - b.boxRef.x);
        const oz = (b.boxRef.hd + 0.95) - Math.abs(pz - b.boxRef.z);
        if (ox > 0 && oz > 0) {
          if (Math.abs(c.v) > 5.5) { breakBarricade(b, fx, fz, Math.abs(c.v)); c.v *= 0.82; }
          break;
        }
      }
    }
    // body collision: 3 circles
    let hitAny = false;
    for (const off of [-1.5, 0.2, 1.8]) {
      let px = c.x + fx * off, pz = c.z + fz * off;
      const [nx, nz, hit] = collideCircle(G.colliders, px, pz, 0.92);
      if (hit) { c.x += nx - px; c.z += nz - pz; hitAny = true; }
    }
    if (hitAny) { c.v *= 0.22; AUDIO.thud(0.4); }
    c.pose();
    AUDIO.setEngine(Math.abs(c.v) / CFG.CAR_VMAX, inp.f ? 1 : 0);
  }

  // ---------------- parked + traffic ----------------
  function parked(x, z, th, hex) {
    const c = makeCar(hex, 'sedan');
    c.grp.position.set(x, 0, z); c.grp.rotation.y = th - Math.PI / 2;
    scene.add(c.grp);
    addBox(G.colliders, x, z, Math.abs(Math.sin(th)) > 0.5 ? 2.3 : 1.0, Math.abs(Math.sin(th)) > 0.5 ? 1.0 : 2.3);
  }

  function trafficCar(hex, kind, path, speed, phase) {
    const c = makeCar(hex, kind);
    scene.add(c.grp);
    traffic.push({ grp: c.grp, path, speed, s: phase || 0 });
    G.dynamicRoots.push(c.grp);
  }
  // path: loop along Main x in [-150,266], lanes z=±3
  function mainLoopPos(s) {
    const A = 416, r = 3, H = Math.PI * r; // straight 416 each way
    const L = 2 * A + 2 * H;
    s = ((s % L) + L) % L;
    if (s < A) return { x: -150 + s, z: 3, th: Math.PI / 2 };
    s -= A;
    if (s < H) { const a = s / r; return { x: 266 + Math.sin(a) * r, z: 3 - (1 - Math.cos(a)) * r, th: Math.PI / 2 - a }; }
    s -= H;
    if (s < A) return { x: 266 - s, z: -3, th: -Math.PI / 2 };
    s -= A;
    const a = s / r; return { x: -150 - Math.sin(a) * r, z: -3 + (1 - Math.cos(a)) * r, th: -Math.PI / 2 - a };
  }
  function palmLoopPos(s) {
    const A = 230, r = 2.6, H = Math.PI * r, L = 2 * A + 2 * H;
    s = ((s % L) + L) % L;
    if (s < A) return { x: -115 + s, z: CFG.PALM_Z + 2.5, th: Math.PI / 2 };
    s -= A;
    if (s < H) { const a = s / r; return { x: 115 + Math.sin(a) * r, z: CFG.PALM_Z + 2.5 - (1 - Math.cos(a)) * r, th: Math.PI / 2 - a }; }
    s -= H;
    if (s < A) return { x: 115 - s, z: CFG.PALM_Z - 2.5, th: -Math.PI / 2 };
    s -= A;
    const a = s / r; return { x: -115 - Math.sin(a) * r, z: CFG.PALM_Z - 2.5 + (1 - Math.cos(a)) * r, th: -Math.PI / 2 - a };
  }

  function updateTraffic(dt) {
    for (const t of traffic) {
      // polite 1937 drivers: ease off near the player
      const p = t.path(t.s);
      const ahead = t.path(t.s + 7);
      const px = G.inCar ? G.car.x : G.player.x, pz = G.inCar ? G.car.z : G.player.z;
      const near = dist2(ahead.x, ahead.z, px, pz) < 36 || dist2(p.x, p.z, px, pz) < 25;
      t.s += (near ? t.speed * 0.12 : t.speed) * dt;
      const q = t.path(t.s);
      t.grp.position.set(q.x, 0, q.z);
      t.grp.rotation.y = q.th - Math.PI / 2;
    }
  }

  function build(sc) {
    scene = sc;
    buildPlayerCar();
    parked(-36, 4.6, Math.PI / 2, 0x35414e);
    parked(-58, -4.6, -Math.PI / 2, 0x4a4438);
    parked(72, 4.6, Math.PI / 2, 0x24332a);
    parked(96, -4.6, -Math.PI / 2, 0x3c3030);
    trafficCar(0x2e4a6e, 'sedan', mainLoopPos, 9, 120);   // the blue coupe
    trafficCar(0x5a4a32, 'truck', palmLoopPos, 6.5, 40);
    trafficCar(0x383d33, 'sedan', mainLoopPos, 8.2, 560);
  }

  return { build, updateCar, updateTraffic, makeCar };
})();
