/* ============================================================
   桃花源記  ·  ENGINE  (part 3: the hidden village 豁然開朗)
   The valley sits beyond the opening, centred at VC.
   ============================================================ */

function buildVillage(){
  const VC=new (T().Vector3)(G.openingPos.x, 0, G.openingPos.z-44); // valley centre, past the mountain
  G.villageCenter=VC;
  const V=group(null); G.village=V; V.position.set(0,0,0);

  // ---- valley floor: flat, open (土地平曠) ----
  const floor=new (T().Mesh)(new (T().CircleGeometry)(58,48),texGround("#5c7a40","#3c5a2c"));
  floor.rotation.x=-Math.PI/2; floor.position.set(VC.x,0.01,VC.z); floor.receiveShadow=true; V.add(floor);

  // ---- ring of hills enclosing the valley (so it feels sealed) ----
  const hillMat=new (T().MeshStandardMaterial)({map:texRock(),color:0x6f7560,roughness:1,flatShading:true});
  for(let i=0;i<26;i++){
    const a=i/26*Math.PI*2, rr=56+rand(-3,4);
    const h=rand(16,30);
    const hill=new (T().Mesh)(new (T().ConeGeometry)(rand(12,20),h,6),hillMat);
    hill.position.set(VC.x+Math.cos(a)*rr, h/2-3, VC.z+Math.sin(a)*rr);
    hill.rotation.y=rand(0,6.28); hill.castShadow=true; V.add(hill);
    G.colliders.push({x:VC.x+Math.cos(a)*rr,z:VC.z+Math.sin(a)*rr,r:13});
  }
  // forested backdrop band of peach + green inside the rim
  for(let i=0;i<70;i++){
    const a=rand(0,6.28),rr=rand(40,52);
    const tr=Math.random()<0.5?makePeachTree(true):makeOrdinaryTree();
    tr.position.set(VC.x+Math.cos(a)*rr,0,VC.z+Math.sin(a)*rr);
    tr.scale.setScalar(rand(0.8,1.2));V.add(tr);
  }

  // ---- the pond (美池) ----
  const pondC=new (T().Vector3)(VC.x+14,0,VC.z+10);
  const pond=new (T().Mesh)(new (T().CircleGeometry)(7,32),
    new (T().MeshStandardMaterial)({color:0x4f7d77,roughness:0.3,metalness:0.2,transparent:true,opacity:0.92}));
  pond.rotation.x=-Math.PI/2;pond.position.set(pondC.x,0.05,pondC.z);V.add(pond);
  // reeds
  for(let i=0;i<24;i++){const a=rand(0,6.28),r=rand(7,8.2);
    const reed=new (T().Mesh)(new (T().CylinderGeometry)(0.02,0.03,rand(0.6,1.3),4),mat(0x6f8a4a));
    reed.position.set(pondC.x+Math.cos(a)*r,reed.geometry.parameters.height/2,pondC.z+Math.sin(a)*r);V.add(reed);}
  G.colliders.push({x:pondC.x,z:pondC.z,r:7.6});

  // ---- fields (良田): low striped rows ----
  function field(cx,cz,w,d,rot){
    const fg=group(V);fg.position.set(cx,0,cz);fg.rotation.y=rot;
    const soil=new (T().Mesh)(new (T().PlaneGeometry)(w,d),mat(0x6b5538,{roughness:1}));
    soil.rotation.x=-Math.PI/2;soil.position.y=0.02;fg.add(soil);
    const rows=Math.floor(w/0.7);
    for(let i=0;i<rows;i++){const x=-w/2+0.4+i*0.7;
      const crop=new (T().Mesh)(new (T().BoxGeometry)(0.18,0.4,d-0.6),mat(rand()<0.5?0x7c9a4a:0x90a64f,{roughness:1}));
      crop.position.set(x,0.22,0);fg.add(crop);}
    G.colliders.push({x:cx,z:cz,r:Math.max(w,d)/2*0.7});
  }
  field(VC.x-16,VC.z+12,14,10,0.1);
  field(VC.x-13,VC.z-14,12,9,-0.3);
  field(VC.x+18,VC.z-12,11,9,0.4);

  // ---- houses (屋舍儼然): neat rows of thatched cottages ----
  function house(cx,cz,rot){
    const hg=group(V);hg.position.set(cx,0,cz);hg.rotation.y=rot;
    const w=rand(3.4,4.4),d=rand(3,3.8),wh=rand(1.9,2.3);
    const wallMat=new (T().MeshStandardMaterial)({color:0xcdbb95,roughness:1});
    const body=new (T().Mesh)(new (T().BoxGeometry)(w,wh,d),wallMat);body.position.y=wh/2;body.castShadow=body.receiveShadow=true;hg.add(body);
    // dark timber frame accents
    const beamMat=new (T().MeshStandardMaterial)({color:0x4a3a2c,roughness:1});
    const beam=new (T().Mesh)(new (T().BoxGeometry)(w+0.1,0.15,d+0.1),beamMat);beam.position.y=wh;hg.add(beam);
    // thatched hip roof (two stacked pyramids)
    const roofMat=new (T().MeshStandardMaterial)({color:0x6e5a3a,roughness:1,flatShading:true});
    const roof=new (T().Mesh)(new (T().ConeGeometry)(Math.hypot(w,d)/1.7,1.5,4),roofMat);
    roof.position.y=wh+0.75;roof.rotation.y=Math.PI/4;roof.castShadow=true;hg.add(roof);
    // door
    const door=new (T().Mesh)(new (T().PlaneGeometry)(0.8,1.3),beamMat);
    door.position.set(0,0.65,d/2+0.01);hg.add(door);
    G.colliders.push({x:cx,z:cz,r:Math.max(w,d)/2+0.3});
    return hg;
  }
  const houseSpots=[
    [VC.x-6,VC.z-4,0.0],[VC.x-1,VC.z-6,0.2],[VC.x+5,VC.z-3,-0.2],
    [VC.x-7,VC.z+6,0.1],[VC.x+2,VC.z+8,-0.15],[VC.x+9,VC.z+4,0.3],
    [VC.x-2,VC.z+2,0.0]
  ];
  G.houseSpots=houseSpots.map(h=>({x:h[0],z:h[2]!==undefined?h[1]:h[1]}));
  houseSpots.forEach(h=>house(h[0],h[1],h[2]));

  // ---- mulberry & bamboo (桑竹) ----
  for(let i=0;i<10;i++){ // mulberry: short, broad, dark green
    const a=rand(0,6.28),r=rand(20,34);
    const mg=group(V);mg.position.set(VC.x+Math.cos(a)*r,0,VC.z+Math.sin(a)*r);
    const tr=new (T().Mesh)(new (T().CylinderGeometry)(0.16,0.24,1.6,6),mat(0x5a4636));tr.position.y=0.8;tr.castShadow=true;mg.add(tr);
    for(let j=0;j<4;j++){const m=new (T().Mesh)(new (T().IcosahedronGeometry)(rand(0.8,1.2),1),mat([0x2f4a26,0x3a5a2e][j%2],{flatShading:true}));
      m.position.set(rand(-0.6,0.6),1.6+rand(0,0.6),rand(-0.6,0.6));m.castShadow=true;mg.add(m);}
  }
  for(let c=0;c<8;c++){ // bamboo clumps
    const a=rand(0,6.28),r=rand(18,36),cx=VC.x+Math.cos(a)*r,cz=VC.z+Math.sin(a)*r;
    const bg=group(V);bg.position.set(cx,0,cz);
    for(let i=0;i<rand(5,9);i++){const h=rand(3,5.5);
      const cane=new (T().Mesh)(new (T().CylinderGeometry)(0.06,0.08,h,6),mat(0x6f8f3e));
      cane.position.set(rand(-0.7,0.7),h/2,rand(-0.7,0.7));cane.castShadow=true;bg.add(cane);
      const leaf=new (T().Mesh)(new (T().IcosahedronGeometry)(rand(0.5,0.8),0),mat(0x5c8636,{flatShading:true}));
      leaf.position.set(cane.position.x,h*0.9,cane.position.z);bg.add(leaf);}
  }

  // ---- crisscross paths (阡陌交通) ----
  const pathMat=new (T().MeshStandardMaterial)({color:0xb6a378,roughness:1});
  function path(x1,z1,x2,z2,w){
    const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);
    const p=new (T().Mesh)(new (T().PlaneGeometry)(w,len),pathMat);
    p.rotation.x=-Math.PI/2;p.rotation.z=-Math.atan2(dz,dx)+Math.PI/2;
    p.position.set((x1+x2)/2,0.03,(z1+z2)/2);V.add(p);
  }
  path(VC.x-24,VC.z,VC.x+24,VC.z,1.6);
  path(VC.x,VC.z-22,VC.x,VC.z+22,1.6);
  path(VC.x-18,VC.z-12,VC.x+18,VC.z+12,1.1);
  // path from the opening into the village
  path(G.openingPos.x,G.openingPos.z-10,VC.x,VC.z-8,1.8);

  // ---- villagers ----
  function villager(cx,cz,robeCol,scale,kind,id,labelCn,labelEn){
    const vg=group(V);vg.position.set(cx,0,cz);vg.scale.setScalar(scale||1);
    const robe=new (T().MeshStandardMaterial)({color:robeCol,roughness:0.95});
    const skin=new (T().MeshStandardMaterial)({color:0xceac86,roughness:0.85});
    const body=new (T().Mesh)(new (T().CylinderGeometry)(0.2,0.32,0.85,8),robe);body.position.y=0.42;body.castShadow=true;vg.add(body);
    const head=new (T().Mesh)(new (T().SphereGeometry)(0.15,10,8),skin);head.position.y=0.98;head.castShadow=true;vg.add(head);
    // hair bun
    const bun=new (T().Mesh)(new (T().SphereGeometry)(0.08,8,6),new (T().MeshStandardMaterial)({color:0x222018,roughness:1}));
    bun.position.set(0,1.1,-0.02);vg.add(bun);
    vg.userData={kind,id,base:body.position.y,head};
    G.villagers.push(vg);
    if(labelCn){
      G.interactables.push({pos:new (T().Vector3)(cx,0,cz),r:2.6,label:labelCn,labelEn:labelEn,kind,id,done:false,mesh:vg});
    }
    return vg;
  }
  // first villager (the startled one) — set near the path from the opening, alone
  G.firstVillagerSpot=new (T().Vector3)(VC.x-2,0,VC.z-14);
  villager(VC.x-2,VC.z-14,0x7a5848,1.05,"first","startled_1","與此人攀談","Speak to the startled man");
  // elder — central, by the largest house
  villager(VC.x-2,VC.z+2.6,0x4a5560,1.1,"elder","elder_1","拜見長者","Greet the village elder");
  // farmer — at the near edge of a field (clear of the field's collider)
  villager(VC.x-10,VC.z+10,0x6b6e4a,1.0,"farmer","farmer_1","與耕者說話","Talk with the farmer");
  // weaver — by a house
  villager(VC.x+5.5,VC.z+5,0x8a6a72,1.0,"weaver","weaver_1","向織婦問好","Greet the weaver");
  // child — running about
  const child=villager(VC.x+3,VC.z-3,0x9a7a4a,0.7,"child","child_1","逗弄小兒","Speak with the child");
  G.childRef=child;
  // a few silent extras for life
  for(let i=0;i<5;i++){const a=rand(0,6.28),r=rand(6,16);
    villager(VC.x+Math.cos(a)*r,VC.z+Math.sin(a)*r,[0x66614f,0x755f50,0x556070][i%3],rand(0.95,1.1),"extra",null,null,null);}

  // ---- livestock: chickens & dogs (雞犬相聞) ----
  for(let i=0;i<10;i++){chicken(VC.x+rand(-18,18),VC.z+rand(-16,16));}
  for(let i=0;i<3;i++){dog(VC.x+rand(-14,14),VC.z+rand(-12,12));}

  // hide the whole valley until reveal
  V.visible=false;
}

function chicken(x,z){
  const g=group(G.village);g.position.set(x,0,z);
  const bodyCol=Math.random()<0.5?0xe8e2d4:0xc98f63;
  const body=new (T().Mesh)(new (T().SphereGeometry)(0.14,8,6),mat(bodyCol));body.position.y=0.16;body.scale.z=1.3;body.castShadow=true;g.add(body);
  const head=new (T().Mesh)(new (T().SphereGeometry)(0.07,6,5),mat(bodyCol));head.position.set(0,0.3,0.12);g.add(head);
  const comb=new (T().Mesh)(new (T().SphereGeometry)(0.03,5,4),mat(0xb03a2e));comb.position.set(0,0.37,0.12);g.add(comb);
  g.userData={kind:"chicken",t:rand(0,6.28),hx:x,hz:z,head};
  G.livestock.push(g);
}
function dog(x,z){
  const g=group(G.village);g.position.set(x,0,z);
  const col=0x8a6a48;
  const Cap=T().CapsuleGeometry;
  const bodyGeo = Cap ? new Cap(0.12,0.4,4,8) : new (T().CylinderGeometry)(0.12,0.12,0.5,8);
  const body=new (T().Mesh)(bodyGeo,mat(col));
  body.rotation.z=Math.PI/2;body.position.y=0.28;body.castShadow=true;g.add(body);
  const head=new (T().Mesh)(new (T().SphereGeometry)(0.12,8,6),mat(col));head.position.set(0,0.36,0.28);g.add(head);
  const tail=new (T().Mesh)(new (T().CylinderGeometry)(0.02,0.04,0.3,5),mat(col));tail.position.set(0,0.34,-0.3);tail.rotation.x=-0.6;g.add(tail);
  for(const lx of[-0.08,0.08])for(const lz of[0.18,-0.18]){
    const leg=new (T().Mesh)(new (T().CylinderGeometry)(0.03,0.03,0.28,5),mat(col));leg.position.set(lx,0.14,lz);g.add(leg);}
  g.userData={kind:"dog",t:rand(0,6.28),hx:x,hz:z,tail,head};
  G.livestock.push(g);
}

function updateLife(t,dt){
  // chickens peck/wander, dogs wag and amble
  for(const a of G.livestock){
    const u=a.userData;u.t+=dt;
    if(u.kind==="chicken"){
      a.position.x=u.hx+Math.sin(u.t*0.6)*0.6;a.position.z=u.hz+Math.cos(u.t*0.5)*0.6;
      a.rotation.y=Math.sin(u.t*0.5)*1.2;
      if(u.head)u.head.position.y=0.3-Math.abs(Math.sin(u.t*3))*0.12; // pecking
    } else {
      a.position.x=u.hx+Math.sin(u.t*0.3)*1.4;a.position.z=u.hz+Math.cos(u.t*0.22)*1.4;
      a.rotation.y=u.t*0.3;
      if(u.tail)u.tail.rotation.z=Math.sin(u.t*6)*0.5;
    }
  }
  // villagers: gentle idle bob + face the player when near
  for(const v of G.villagers){
    const u=v.userData;
    v.children[0].position.y=u.base+Math.sin(t*1.5+v.position.x)*0.02;
    if(G.camMode==="walk"&&G.walkPos){
      const dx=G.walkPos.x-v.position.x,dz=G.walkPos.z-v.position.z;
      if(dx*dx+dz*dz<60){v.rotation.y=Math.atan2(dx,dz);}
    }
  }
}
