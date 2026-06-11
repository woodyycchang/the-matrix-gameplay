// ============ 07 npcs ============
const NPCS = (() => {
  const M = MAT.lib;
  let scene;
  const list = [];

  const GEO = {};
  function geo(key, make) { return GEO[key] || (GEO[key] = make()); }

  // model faces +x
  function makePerson(o) {
    o = Object.assign({ coat: 0x4a4438, pants: 0x2e2c28, skin: 0xc9966e, hat: 'fedora', hatCol: 0x3a352c, skirt: false, scale: 1 }, o);
    const g = new THREE.Group();
    const coatM = new THREE.MeshLambertMaterial({ color: o.coat });
    const pantsM = new THREE.MeshLambertMaterial({ color: o.pants });
    const skinM = new THREE.MeshLambertMaterial({ color: o.skin });
    const hatM = new THREE.MeshLambertMaterial({ color: o.hatCol });
    const mk = (gm, mat, x, y, z) => { const m = new THREE.Mesh(gm, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    let legL, legR;
    if (o.skirt) {
      mk(geo('skirt', () => { const c = new THREE.CylinderGeometry(0.13, 0.3, 0.62, 8); c.translate(0, -0.31, 0); return c; }), coatM, 0, 1.12, 0);
      legL = mk(geo('legS', () => { const b = new THREE.BoxGeometry(0.11, 0.42, 0.11); b.translate(0, -0.21, 0); return b; }), pantsM, 0, 0.46, 0.08);
      legR = mk(GEO.legS, pantsM, 0, 0.46, -0.08);
    } else {
      legL = mk(geo('leg', () => { const b = new THREE.BoxGeometry(0.15, 0.8, 0.15); b.translate(0, -0.4, 0); return b; }), pantsM, 0, 0.84, 0.11);
      legR = mk(GEO.leg, pantsM, 0, 0.84, -0.11);
    }
    mk(geo('torso', () => new THREE.BoxGeometry(0.27, 0.58, 0.42)), coatM, 0, 1.34, 0);
    const armL = mk(geo('arm', () => { const b = new THREE.BoxGeometry(0.12, 0.58, 0.12); b.translate(0, -0.29, 0); return b; }), coatM, 0, 1.58, 0.28);
    const armR = mk(GEO.arm, coatM, 0, 1.58, -0.28);
    mk(geo('head', () => new THREE.BoxGeometry(0.22, 0.27, 0.21)), skinM, 0, 1.83, 0);
    if (o.hat === 'fedora') {
      mk(geo('brim', () => new THREE.CylinderGeometry(0.23, 0.23, 0.03, 10)), hatM, 0.01, 1.97, 0);
      mk(geo('crown', () => new THREE.CylinderGeometry(0.14, 0.16, 0.17, 8)), hatM, 0, 2.06, 0);
    } else if (o.hat === 'cloche') {
      mk(geo('cloche', () => new THREE.SphereGeometry(0.16, 8, 6, 0, TAU, 0, Math.PI * 0.62)), hatM, 0, 1.93, 0);
    } else if (o.hat === 'cap') {
      mk(geo('capb', () => new THREE.CylinderGeometry(0.17, 0.17, 0.08, 8)), hatM, 0, 1.99, 0);
      mk(geo('capp', () => new THREE.BoxGeometry(0.18, 0.02, 0.2)), hatM, 0.2, 1.97, 0);
    }
    g.scale.setScalar(o.scale);
    return { grp: g, legL, legR, armL, armR };
  }

  // schedule: keyframes [{t,x,z,dwell}] over period P (game minutes)
  function positionAt(kf, P, m) {
    m = ((m % P) + P) % P;
    let i = kf.length - 1;
    for (let k = 0; k < kf.length; k++) { if (kf[k].t <= m) i = k; else break; }
    const a = kf[i], b = kf[(i + 1) % kf.length];
    const depart = a.t + (a.dwell || 0);
    const arrive = (i + 1 < kf.length) ? b.t : P + kf[0].t;
    if (m <= depart || arrive <= depart) {
      return { x: a.x, z: a.z, th: Math.atan2(b.x - a.x, b.z - a.z), moving: false };
    }
    const u = clamp((m - depart) / (arrive - depart), 0, 1);
    return { x: lerp(a.x, b.x, u), z: lerp(a.z, b.z, u), th: Math.atan2(b.x - a.x, b.z - a.z), moving: u < 1 };
  }

  function addNPC(n) { list.push(n); scene.add(n.p.grp); return n; }

  function scheduled(id, person, kf, P, opts) {
    const n = Object.assign({ id, p: person, kf, P, phase: 0, dialogId: null }, opts || {});
    n.update = function (dt) {
      const pos = positionAt(this.kf, this.P, G.gameMin + (this.tOff || 0));
      const g = this.p.grp;
      g.position.set(pos.x, terrainH(pos.x, pos.z), pos.z);
      if (G.state === 'DIALOG' && G.dialogNPC === this.id) {
        g.rotation.y = Math.atan2(G.player.x - pos.x, G.player.z - pos.z) - Math.PI / 2;
      } else {
        g.rotation.y = pos.th - Math.PI / 2;
      }
      this.phase += (pos.moving ? dt * 6.4 : -this.phase * dt * 8);
      const s = Math.sin(this.phase) * (pos.moving ? 0.5 : 0);
      this.p.legL.rotation.z = s; this.p.legR.rotation.z = -s;
      this.p.armL.rotation.z = -s * 0.7; this.p.armR.rotation.z = s * 0.7;
      this.pos = pos;
      if (this.extra) this.extra(dt, pos);
    };
    return addNPC(n);
  }

  // NOTE: person model faces +x; rotation.y here uses atan2(dx,dz) which orients +z-facing models.
  // We compensate by building schedules' th the same way and rotating the group with an inner pivot.
  function build(sc) {
    scene = sc;

    // ---- Mrs. Pell: the clockwork spill ----
    const pellP = makePerson({ coat: 0x5a3a52, hat: 'cloche', hatCol: 0x2e2436, skirt: true });
    pellP.grp.rotation.order = 'YXZ';
    const pellKF = [
      { t: 0, x: -66.6, z: 40, dwell: 8 },
      { t: 12, x: -66.6, z: 8.3 },
      { t: 14, x: -56, z: 8.3, dwell: 6 },     // THE DROP happens here, :14–:18
      { t: 26, x: -34.5, z: 8.3, dwell: 6 },   // chats at the newsstand
      { t: 40, x: -66.6, z: 8.3 },
      { t: 46, x: -66.6, z: 40, dwell: 14 },
    ];
    const oranges = [];
    for (let i = 0; i < 3; i++) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.orange);
      o.visible = false; scene.add(o); oranges.push(o);
    }
    const bub = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.bubble('pell', ['Oh! Butterfingers —', 'every time, I swear.']), transparent: true, depthWrite: false }));
    bub.scale.set(3.4, 1.06, 1); bub.visible = false; scene.add(bub);
    const rests = [[-55.1, 7.3], [-56.9, 7.6], [-55.5, 9.2]];
    scheduled('pell', pellP, pellKF, 60, {
      dialogId: 'pell',
      extra(dt, pos) {
        const p = ((G.gameMin % 60) + 60) % 60;
        const drop = p >= 14 && p < 18.4;
        bub.visible = p >= 14.2 && p < 16.4 && G.state !== 'TITLE';
        bub.position.set(pos.x, 2.9, pos.z);
        // crouch while gathering
        const crouch = p >= 15.2 && p < 17.4 ? 0.8 : 1;
        this.p.grp.scale.y += (crouch - this.p.grp.scale.y) * Math.min(1, dt * 6);
        for (let i = 0; i < 3; i++) {
          const o = oranges[i];
          const gone = p > 16.2 + i * 0.5;
          o.visible = drop && p >= 14.05 && !gone;
          if (o.visible) {
            const u = clamp((p - 14.05) / 1.15, 0, 1);
            const rx = rests[i][0], rz = rests[i][1];
            o.position.set(lerp(pos.x, rx, u), Math.max(0.09, 1.05 * (1 - u) + Math.abs(Math.sin(u * 9)) * 0.22 * (1 - u)), lerp(pos.z, rz, u));
          }
        }
        // witnessing
        if (drop && G.state === 'PLAY') {
          const cyc = Math.floor(G.gameMin / 60);
          if (dist2(G.player.x, G.player.z, -56, 8.3) < 22 * 22 && this.lastCyc !== cyc) {
            this.lastCyc = cyc;
            FLAGS.pellWitness++;
            dlog('pell witnessed #' + FLAGS.pellWitness);
            if (FLAGS.pellWitness === 1) UI.toast('A woman drops her oranges at the corner.');
            if (FLAGS.pellWitness >= 2) QUEST.addSeam('CLOCKWORK', 'Clockwork', 'Mrs. Pell drops her oranges at a quarter past. Every hour. Same oranges. Same words. Same spill.');
          }
        }
      }
    });

    // ---- the twins ----
    const twinOpts = { coat: 0x55534e, pants: 0x3a3833, hat: 'fedora', hatCol: 0x2c2a26, skin: 0xbf8f68 };
    const twA = makePerson(twinOpts), twB = makePerson(twinOpts);
    const kfA = [{ t: 0, x: -82, z: -7.6 }, { t: 62, x: 82, z: -7.6, dwell: 3 }, { t: 127, x: -82, z: -7.6, dwell: 3 }];
    const kfB = [{ t: 0, x: 82, z: -7.6 }, { t: 62, x: -82, z: -7.6, dwell: 3 }, { t: 127, x: 82, z: -7.6, dwell: 3 }];
    const nA = scheduled('twinA', twA, kfA, 130, { dialogId: 'twin' });
    const nB = scheduled('twinB', twB, kfB, 130, {
      dialogId: 'twin',
      extra() {
        if (G.state !== 'PLAY' || FLAGS.twinsSeen) return;
        if (!nA.pos || !this.pos) return;
        if (Math.abs(nA.pos.x - this.pos.x) < 2.6) {
          const mx = (nA.pos.x + this.pos.x) / 2;
          if (dist2(G.player.x, G.player.z, mx, -7.6) < 24 * 24) {
            FLAGS.twinsSeen = true;
            QUEST.addSeam('MIRROR', 'The Mirror', 'Two men in grey pass each other on Main. Same suit. Same face. Same nod. Neither breaks stride.');
          }
        }
      }
    });

    // ---- the cop ----
    const cop = makePerson({ coat: 0x2c3a52, pants: 0x222c3e, hat: 'cap', hatCol: 0x1c2436 });
    scheduled('cop', cop, [
      { t: 0, x: 60, z: 8.6, dwell: 25 },
      { t: 50, x: -60, z: 8.6, dwell: 10 },
      { t: 110, x: 60, z: 8.6 },
    ], 120, { dialogId: 'cop' });

    // ---- evening couple on Palm ----
    const cplA = makePerson({ coat: 0x4a3a2c, hat: 'fedora' });
    const cplB = makePerson({ coat: 0x6e4a5a, hat: 'cloche', hatCol: 0x4a3040, skirt: true, skin: 0xd2a07a });
    const kfa = [{ t: 0, x: -80, z: 57.3, dwell: 6 }, { t: 34, x: 80, z: 57.3, dwell: 8 }, { t: 82, x: -80, z: 57.3 }];
    scheduled('coupleA', cplA, kfa, 90, { dialogId: 'couple' });
    scheduled('coupleB', cplB, kfa.map(k => ({ t: k.t, x: k.x, z: k.z + 0.9, dwell: k.dwell })), 90, { dialogId: 'couple', tOff: -0.7 });

    // ---- Charlie at the newsstand ----
    const ch = makePerson({ coat: 0x5a5236, hat: 'cap', hatCol: 0x3c3424, skin: 0x8a5e3c });
    ch.grp.position.set(-32.4, 0, 8.9);
    ch.grp.rotation.y = Math.PI / 2; // face the street (north)
    addNPC({
      id: 'charlie', p: ch, dialogId: 'charlie',
      update(dt) {
        this.t = (this.t || 0) + dt;
        ch.grp.position.y = Math.sin(this.t * 1.7) * 0.015;
        ch.armL.rotation.z = Math.sin(this.t * 0.9) * 0.06 - 0.1;
      },
      pos: { x: -32.4, z: 8.9 },
    });

    // ---- grocer sweeping ----
    const tom = makePerson({ coat: 0x6e6248, hat: null, skin: 0xc9966e });
    tom.grp.position.set(52, 0, 8.6); tom.grp.rotation.y = Math.PI / 2 + 0.25;
    const broom = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6), M.wood);
    stick.position.y = 0.7; stick.rotation.z = 0.4; broom.add(stick);
    const brush = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.1), new THREE.MeshLambertMaterial({ color: 0xa08858 }));
    brush.position.set(0.28, 0.08, 0); broom.add(brush);
    broom.position.set(0.35, 0, 0.1);
    tom.grp.add(broom);
    addNPC({
      id: 'grocer', p: tom, dialogId: 'grocer',
      update(dt) {
        this.t = (this.t || 0) + dt;
        const home = G.dayMin >= 21.5 * 60 || G.dayMin < 6 * 60;
        if (home) { tom.grp.visible = false; this.pos = null; return; }
        tom.grp.visible = true;
        broom.rotation.y = Math.sin(this.t * 2.2) * 0.35;
        tom.armR.rotation.z = Math.sin(this.t * 2.2) * 0.3 - 0.2;
        this.pos = { x: 52, z: 8.6 };
      },
    });

    // ---- porch sitters ----
    function seated(opts, x, z, ry) {
      const p = makePerson(opts);
      p.grp.position.set(x, 0.18, z); p.grp.rotation.y = ry;
      p.legL.rotation.z = Math.PI / 2 - 0.2; p.legR.rotation.z = Math.PI / 2 - 0.25;
      p.legL.position.y = 0.62; p.legR.position.y = 0.62;
      return p;
    }
    const s1 = seated({ coat: 0x4a5a44, hat: 'fedora' }, -43.5, 50.9, -Math.PI / 2);
    const s2 = seated({ coat: 0x6a4a3a, hat: null, skirt: true }, -42.3, 50.9, -Math.PI / 2 + 0.15);
    addNPC({
      id: 'porch1', p: s1, dialogId: 'porch',
      update(dt) { this.t = (this.t || 0) + dt; s1.grp.rotation.x = Math.sin(this.t * 1.3) * 0.05; },
      pos: { x: -43.5, z: 50.9 },
    });
    addNPC({ id: 'porch2', p: s2, dialogId: 'porch', update() { }, pos: { x: -42.3, z: 50.9 } });

    // interactables for talkable NPCs
    for (const n of list) {
      if (!n.dialogId) continue;
      G.interactables.push({
        id: 'npc_' + n.id, npc: n, r: 2.6,
        get x() { return n.pos ? n.pos.x : (n.p.grp.position.x); },
        get z() { return n.pos ? n.pos.z : (n.p.grp.position.z); },
        label: ({ pell: 'Talk to the woman', twinA: 'Talk to the man in grey', twinB: 'Talk to the man in grey', cop: 'Talk to the officer', coupleA: 'Talk to the couple', coupleB: 'Talk to the couple', charlie: 'Talk to Charlie', grocer: 'Talk to the grocer', porch1: 'Say good evening', porch2: 'Say good evening' })[n.id] || 'Talk',
        onUse: () => { G.dialogNPC = n.id; DIALOGUE.start(n.dialogId); },
      });
    }
  }

  function update(dt) { for (const n of list) n.update(dt); }

  return { build, update, makePerson, positionAt, list };
})();
