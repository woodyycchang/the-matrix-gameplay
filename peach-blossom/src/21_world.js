/* ============================================================
   桃花源記  ·  ENGINE  (part 2: world geometry)
   ============================================================ */
const T = () => G.THREE;

/* ---- helpers ---- */
function mat(color,opts={}){return new (T().MeshStandardMaterial)(Object.assign({color,roughness:0.92,metalness:0.0},opts));}
function rand(a,b){return a+Math.random()*(b-a);}
function group(parent){const g=new (T().Group)();(parent||G.scene).add(g);return g;}

/* ---------- the river path (a gentle S, heading -Z = upstream) ---------- */
function buildRiverPath(){
  // Control points from start (z=0) upstream to the source (z=-360).
  // x meanders; this single source of truth drives water, banks, boat autopilot.
  const pts=[];
  const seg=[
    [0,0],[6,-30],[-4,-62],[8,-96],[-6,-130],   // ordinary stream
    [3,-165],[-2,-200],[5,-238],[-3,-275],       // peach grove begins ~ -150
    [1,-308],[0,-336],[0,-360]                   // narrows to the source
  ];
  for(const[x,z]of seg)pts.push(new (T().Vector3)(x,0,z));
  G.curve=new (T().CatmullRomCurve3)(pts,false,"catmullrom",0.5);
  G.riverLen=G.curve.getLength();
  // sample for quick lookups
  G.sampleN=400; G.samples=[];
  for(let i=0;i<=G.sampleN;i++){G.samples.push(G.curve.getPointAt(i/G.sampleN));}
  G.GROVE_START_U=0.40;   // u along curve where pure peach grove begins
  G.SOURCE_U=0.965;       // where the mountain/opening is
}
function curveAt(u){return G.curve.getPointAt(Math.max(0,Math.min(1,u)));}
function curveTangent(u){return G.curve.getTangentAt(Math.max(0,Math.min(1,u)));}

/* ---------- water ribbon following the path ---------- */
function buildWater(){
  const N=G.sampleN, width=11, half=width/2;
  const pos=[],uv=[],idx=[];
  for(let i=0;i<=N;i++){
    const u=i/N,p=curveAt(u),tg=curveTangent(u);
    const nx=-tg.z,nz=tg.x; const L=Math.hypot(nx,nz)||1;
    // widen the channel inside the canyon a touch
    const w=half*(u<0.40?1.0:(u<0.95?0.92:0.5));
    pos.push(p.x+nx/L*w,0,p.z+nz/L*w);
    pos.push(p.x-nx/L*w,0,p.z-nz/L*w);
    uv.push(0,u*40);uv.push(1,u*40);
  }
  for(let i=0;i<N;i++){const a=i*2,b=i*2+1,c=i*2+2,d=i*2+3;idx.push(a,b,c, b,d,c);}
  const g=new (T().BufferGeometry)();
  g.setAttribute("position",new (T().Float32BufferAttribute)(pos,3));
  g.setAttribute("uv",new (T().Float32BufferAttribute)(uv,2));
  g.setIndex(idx); g.computeVertexNormals();
  G.waterBase=Float32Array.from(pos);
  const m=new (T().MeshStandardMaterial)({map:texWater(),transparent:true,opacity:0.9,
    roughness:0.32,metalness:0.18,color:0xbfe0d6});
  const mesh=new (T().Mesh)(g,m); mesh.receiveShadow=true; mesh.position.y=0.02;
  G.scene.add(mesh); G.water=mesh;
}

/* ---------- terrain: canyon walls + banks following the river ---------- */
function buildTerrain(){
  const N=G.sampleN;
  const grpL=group(),grpR=group();
  const groundMat=texGround("#4f6a3c","#33502a"); // grassy green
  const rockMat=new (T().MeshStandardMaterial)({map:texRock(),roughness:1.0,color:0x8a857b});
  // build two long bank strips + rising cliffs
  const bankPos=[],bankUv=[],bankIdx=[];
  const innerHalf=5.6, bankW=26;
  for(let side=0;side<2;side++){
    const s=side===0?1:-1, base=bankPos.length/3;
    for(let i=0;i<=N;i++){
      const u=i/N,p=curveAt(u),tg=curveTangent(u);
      let nx=-tg.z,nz=tg.x;const L=Math.hypot(nx,nz)||1;nx/=L;nz/=L;
      const wIn=innerHalf*(u<0.40?1.0:(u<0.95?0.92:0.55));
      // bank edge
      bankPos.push(p.x+s*nx*wIn,0.0,p.z+s*nz*wIn); bankUv.push(0,u*30);
      // outer, raised — higher in the canyon section to read as cliffs
      const rise=u<0.38?1.2:(u<0.93?ramp(u,0.38,0.6)*9+2:14);
      bankPos.push(p.x+s*nx*(wIn+bankW),rise,p.z+s*nz*(wIn+bankW)); bankUv.push(1,u*30);
    }
    for(let i=0;i<N;i++){const a=base+i*2,b=base+i*2+1,c=base+i*2+2,d=base+i*2+3;
      if(s>0)bankIdx.push(a,b,c, b,d,c); else bankIdx.push(a,c,b, b,c,d);}
  }
  const bg=new (T().BufferGeometry)();
  bg.setAttribute("position",new (T().Float32BufferAttribute)(bankPos,3));
  bg.setAttribute("uv",new (T().Float32BufferAttribute)(bankUv,2));
  bg.setIndex(bankIdx); bg.computeVertexNormals();
  const bank=new (T().Mesh)(bg,groundMat); bank.receiveShadow=true; G.scene.add(bank);

  // tall rock backdrop walls further out (so canyon feels enclosed in grove section)
  for(let side=0;side<2;side++){
    const s=side===0?1:-1;
    const wp=[],wi=[],wu=[];
    for(let i=0;i<=N;i++){
      const u=i/N,p=curveAt(u),tg=curveTangent(u);
      let nx=-tg.z,nz=tg.x;const L=Math.hypot(nx,nz)||1;nx/=L;nz/=L;
      const off=innerHalf+bankW+rand(-1,1);
      const h=u<0.36?2:(u<0.94?ramp(u,0.36,0.55)*26+4:40);
      wp.push(p.x+s*nx*off,0,p.z+s*nz*off);wu.push(0,u*20);
      wp.push(p.x+s*nx*(off+6),h,p.z+s*nz*(off+6));wu.push(1,u*20);
    }
    for(let i=0;i<N;i++){const a=i*2,b=i*2+1,c=i*2+2,d=i*2+3;
      if(s>0)wp&&wi.push(a,b,c,b,d,c);else wi.push(a,c,b,b,c,d);}
    const wg=new (T().BufferGeometry)();
    wg.setAttribute("position",new (T().Float32BufferAttribute)(wp,3));
    wg.setAttribute("uv",new (T().Float32BufferAttribute)(wu,2));
    wg.setIndex(wi);wg.computeVertexNormals();
    const wall=new (T().Mesh)(wg,rockMat);wall.receiveShadow=true;G.scene.add(wall);
  }
}
function ramp(u,a,b){return Math.max(0,Math.min(1,(u-a)/(b-a)));}

/* ---------- trees: ordinary mixed before grove, PURE peach inside (中無雜樹) ---------- */
function makePeachTree(bloom){
  const g=group(null);
  const h=rand(2.6,4.2);
  const trunk=new (T().Mesh)(new (T().CylinderGeometry)(0.12,0.22,h,6),
    new (T().MeshStandardMaterial)({map:texBark(),roughness:1,color:0x7a5f4c}));
  trunk.position.y=h/2;trunk.castShadow=true;g.add(trunk);
  // a few boughs
  const boughMat=new (T().MeshStandardMaterial)({color:0x6b5240,roughness:1});
  for(let i=0;i<3;i++){const b=new (T().Mesh)(new (T().CylinderGeometry)(0.05,0.1,rand(1,1.7),5),boughMat);
    const a=rand(0,6.28);b.position.set(Math.cos(a)*0.5,h*0.7+rand(0,0.5),Math.sin(a)*0.5);
    b.rotation.set(rand(-0.6,0.6),a,rand(0.6,1.1));b.castShadow=true;g.add(b);}
  // blossom canopy: clustered spheres, soft pink
  const canopy=group(g);
  const pinks=[0xf6c3d0,0xf2a8bd,0xf7d4de,0xefb6c8];
  const nC=bloom?7:5;
  for(let i=0;i<nC;i++){
    const r=rand(0.6,1.15);
    const m=new (T().Mesh)(new (T().IcosahedronGeometry)(r,1),
      new (T().MeshStandardMaterial)({color:pinks[i%pinks.length],roughness:0.95,flatShading:true}));
    m.position.set(rand(-1,1),h*0.78+rand(-0.2,0.9),rand(-1,1));
    m.scale.y=0.82;m.castShadow=true;canopy.add(m);
  }
  g.userData.canopy=canopy;
  return g;
}
function makeOrdinaryTree(){
  // willow/pine-ish greens — deliberately NOT peach, only outside the grove
  const g=group(null);const h=rand(3,5.5);
  const kind=Math.random();
  const trunk=new (T().Mesh)(new (T().CylinderGeometry)(0.14,0.3,h,6),
    new (T().MeshStandardMaterial)({map:texBark(),roughness:1,color:0x5b4a3a}));
  trunk.position.y=h/2;trunk.castShadow=true;g.add(trunk);
  const greens=[0x3f5e36,0x4a6b3c,0x33502c,0x556f3e];
  if(kind<0.5){ // rounded broadleaf
    for(let i=0;i<5;i++){const r=rand(0.8,1.5);
      const m=new (T().Mesh)(new (T().IcosahedronGeometry)(r,1),
        new (T().MeshStandardMaterial)({color:greens[i%greens.length],roughness:1,flatShading:true}));
      m.position.set(rand(-1.1,1.1),h*0.8+rand(-0.3,1),rand(-1.1,1.1));m.castShadow=true;g.add(m);}
  }else{ // conifer cones
    for(let i=0;i<3;i++){const m=new (T().Mesh)(new (T().ConeGeometry)(rand(1,1.6)-i*0.25,rand(1.6,2.2),7),
      new (T().MeshStandardMaterial)({color:greens[(i+1)%greens.length],roughness:1,flatShading:true}));
      m.position.y=h*0.6+i*1.1;m.castShadow=true;g.add(m);}
  }
  return g;
}
function plantTrees(){
  const N=600;
  for(let i=0;i<N;i++){
    const u=Math.random();
    const p=curveAt(u),tg=curveTangent(u);
    let nx=-tg.z,nz=tg.x;const L=Math.hypot(nx,nz)||1;nx/=L;nz/=L;
    const side=Math.random()<0.5?1:-1;
    const off=rand(6.5,26)*side;
    const x=p.x+nx*off, z=p.z+nz*off;
    // skip where the valley will be
    if(u>0.95) continue;
    let tree;
    if(u>=G.GROVE_START_U){ tree=makePeachTree(true); }      // 中無雜樹 — only peach
    else { tree = Math.random()<0.78 ? makeOrdinaryTree() : makePeachTree(false); } // a few stray peaches downstream
    tree.position.set(x,0,z);
    tree.rotation.y=rand(0,6.28);
    const s=rand(0.85,1.25);tree.scale.setScalar(s);
    tree.userData.u=u;
    G.scene.add(tree);G.trees.push(tree);
  }
  // a dense double row right at the grove mouth so the transition reads instantly
  for(let i=0;i<60;i++){
    const u=G.GROVE_START_U+ (i/60)*0.5;
    const p=curveAt(u),tg=curveTangent(u);let nx=-tg.z,nz=tg.x;const L=Math.hypot(nx,nz)||1;nx/=L;nz/=L;
    for(const side of [1,-1]){
      const off=rand(6.2,9)*side;
      const tr=makePeachTree(true);tr.position.set(p.x+nx*off,0,p.z+nz*off);
      tr.rotation.y=rand(0,6.28);tr.scale.setScalar(rand(0.9,1.2));G.scene.add(tr);G.trees.push(tr);
    }
  }
}

/* ---------- the mountain face + the small glowing opening ---------- */
function buildOpening(){
  const u=G.SOURCE_U, p=curveAt(u), tg=curveTangent(u);
  // mountain wall blocking the end of the river
  const wall=new (T().Mesh)(new (T().BoxGeometry)(80,46,14),
    new (T().MeshStandardMaterial)({map:texRock(),roughness:1,color:0x736f66}));
  const ahead=curveAt(0.99);
  wall.position.set(ahead.x, 21, ahead.z-7);
  wall.castShadow=wall.receiveShadow=true;
  G.scene.add(wall); G.mountain=wall;

  // the opening: a dark recessed slot with a warm glow behind it
  // (the wall's boat-side face sits exactly at ahead.z, so these must sit proud of it)
  const slot=new (T().Mesh)(new (T().BoxGeometry)(2.0,3.2,2),
    new (T().MeshBasicMaterial)({color:0x0a0805}));
  slot.position.set(ahead.x+0.4, 1.7, ahead.z+0.1);
  G.scene.add(slot);
  const glow=new (T().Mesh)(new (T().PlaneGeometry)(1.7,2.9),
    new (T().MeshBasicMaterial)({color:0xffd27a,transparent:true,opacity:0.0,side:T().DoubleSide,fog:false,toneMapped:false}));
  glow.position.set(ahead.x+0.4,1.7,ahead.z+1.25);
  G.scene.add(glow); G.openingGlow=glow;
  const light=new (T().PointLight)(0xffd98a,0.0,18,2); light.position.copy(glow.position);
  G.scene.add(light); G.openingLight=light;
  G.openingPos=new (T().Vector3)(ahead.x+0.4,0,ahead.z+1.25);

  // landing spot just before the opening (where the boat is left)
  G.landingU=0.95;
  // interactable to leave the boat / enter
  G.api.openingInteract={pos:G.openingPos.clone(),r:5.5};
}

/* ---------- petals drifting in the grove ---------- */
function buildPetals(){
  const N=260;
  const tex=G.petalTex;
  const mat=new (T().MeshBasicMaterial)({map:tex,transparent:true,side:T().DoubleSide,depthWrite:false});
  const mesh=new (T().InstancedMesh)(G.petalGeo,mat,N);
  mesh.instanceMatrix.setUsage(T().DynamicDrawUsage);
  const dummy=new (T().Object3D)();
  G.petalData=[];
  for(let i=0;i<N;i++){
    const u=rand(G.GROVE_START_U,0.97),p=curveAt(u);
    const px=p.x+rand(-14,14),pz=p.z+rand(-14,14),py=rand(0.5,8);
    G.petalData.push({x:px,y:py,z:pz,u, vx:rand(-0.3,0.3),vy:rand(-0.5,-1.1),vz:rand(-0.3,0.3),
      rot:rand(0,6.28),vr:rand(-1,1),sp:rand(0.7,1.3)});
    dummy.position.set(px,py,pz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.frustumCulled=false; mesh.visible=false;
  G.scene.add(mesh);G.petalMesh=mesh;G.petalDummy=dummy;
}
function updatePetals(dt){
  if(!G.petalMesh)return;
  const m=G.petalMesh,du=G.petalDummy;
  for(let i=0;i<G.petalData.length;i++){
    const d=G.petalData[i];
    d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.rot+=d.vr*dt;
    if(d.y<0.1){const p=curveAt(rand(G.GROVE_START_U,0.97));d.x=p.x+rand(-14,14);d.z=p.z+rand(-14,14);d.y=rand(6,9);}
    du.position.set(d.x,d.y,d.z);du.rotation.set(d.rot*0.5,d.rot,d.rot*0.3);du.scale.setScalar(d.sp);
    du.updateMatrix();m.setMatrixAt(i,du.matrix);
  }
  m.instanceMatrix.needsUpdate=true;
}

/* ---------- the boat and the fisherman ---------- */
function buildBoat(){
  const g=group(null);
  const woodD=new (T().MeshStandardMaterial)({map:texBark(),color:0x6b4f37,roughness:0.9});
  const woodL=new (T().MeshStandardMaterial)({color:0x8a6a48,roughness:0.85});
  // hull: a shallow sampan from a scaled box + tapered bow/stern
  const hull=new (T().Mesh)(new (T().BoxGeometry)(1.5,0.42,4.0),woodD);
  hull.position.y=0.21;hull.castShadow=true;g.add(hull);
  const floor=new (T().Mesh)(new (T().BoxGeometry)(1.3,0.06,3.7),woodL);floor.position.y=0.34;g.add(floor);
  for(const zz of [-2.0,2.0]){
    const cap=new (T().Mesh)(new (T().CylinderGeometry)(0.32,0.32,1.5,6,1,false,0,Math.PI),woodD);
    cap.rotation.z=Math.PI/2;cap.rotation.y=Math.PI/2;cap.position.set(0,0.21,zz);
    cap.scale.set(1,1,zz<0?1.1:1.4);cap.castShadow=true;g.add(cap);
  }
  // little canopy hoop at stern
  const hoopMat=new (T().MeshStandardMaterial)({color:0x4f6b3a,roughness:1});
  const hoop=new (T().Mesh)(new (T().TorusGeometry)(0.6,0.05,6,12,Math.PI),hoopMat);
  hoop.position.set(0,0.7,-1.2);hoop.rotation.x=Math.PI/2;hoop.rotation.z=Math.PI/2;g.add(hoop);

  // fisherman (low-poly, conical hat)
  const fisher=group(g);
  const skin=new (T().MeshStandardMaterial)({color:0xc98f63,roughness:0.8});
  const robe=new (T().MeshStandardMaterial)({color:0x6b7b6a,roughness:0.95});
  const body=new (T().Mesh)(new (T().CylinderGeometry)(0.22,0.34,0.8,8),robe);body.position.y=0.4;body.castShadow=true;fisher.add(body);
  const head=new (T().Mesh)(new (T().SphereGeometry)(0.16,10,8),skin);head.position.y=0.95;head.castShadow=true;fisher.add(head);
  const hat=new (T().Mesh)(new (T().ConeGeometry)(0.34,0.22,12),new (T().MeshStandardMaterial)({color:0xc9a86a,roughness:1}));
  hat.position.y=1.06;fisher.add(hat);
  // arms holding oar
  const armL=new (T().Mesh)(new (T().CylinderGeometry)(0.05,0.05,0.5,5),robe);armL.position.set(0.2,0.62,0.1);armL.rotation.z=0.7;fisher.add(armL);
  const armR=new (T().Mesh)(new (T().CylinderGeometry)(0.05,0.05,0.5,5),robe);armR.position.set(-0.2,0.62,0.1);armR.rotation.z=-0.7;fisher.add(armR);
  fisher.position.set(0,0.34,-0.4);
  G.fisher=fisher;

  // oar
  const oar=group(g);
  const shaft=new (T().Mesh)(new (T().CylinderGeometry)(0.035,0.035,2.4,6),woodL);
  shaft.rotation.z=Math.PI/2.4;oar.add(shaft);
  const blade=new (T().Mesh)(new (T().BoxGeometry)(0.5,0.04,0.18),woodD);blade.position.set(-1.05,-0.5,0);oar.add(blade);
  oar.position.set(0.5,0.55,-0.2);
  G.oar=oar;

  g.position.copy(curveAt(0.0));
  G.boat=g; G.boatU=0.0; G.boatSpeed=0; G.boatHeading=0;
  // orient down the path
  const tg=curveTangent(0.0); G.boat.rotation.y=Math.atan2(tg.x,tg.z);
  G.scene.add(g);
}

/* ---------- a visible route-mark (cut branch / cloth tie) the fisherman leaves ---------- */
function dropMark(pos){
  const g=group(null);
  // a stake with a strip of red cloth — unmistakable, story-accurate 處處誌之
  const stake=new (T().Mesh)(new (T().CylinderGeometry)(0.04,0.05,1.1,5),
    new (T().MeshStandardMaterial)({color:0x6b4f37,roughness:1}));
  stake.position.y=0.55;stake.castShadow=true;g.add(stake);
  const cloth=new (T().Mesh)(new (T().PlaneGeometry)(0.4,0.26),
    new (T().MeshStandardMaterial)({color:0xb03a2e,roughness:0.8,side:T().DoubleSide}));
  cloth.position.set(0.18,0.95,0);cloth.rotation.y=rand(-0.4,0.4);g.add(cloth);
  g.position.set(pos.x,0,pos.z);
  g.userData.cloth=cloth;
  G.scene.add(g);G.markMeshes.push(g);G.marks.push({x:pos.x,z:pos.z});
  return g;
}
function vanishMarks(){
  // the heart of the ending — every mark simply gone
  G.markMeshes.forEach(m=>{G.scene.remove(m);});
  G.markMeshes.length=0;
  G.marks.length=0;
}
