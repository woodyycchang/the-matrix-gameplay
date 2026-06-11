/* ============================================================
   桃花源記  ·  STORY  (phases, movement, camera, dialogue, UI, loop)
   Ties the data + world + village modules into a playable whole.
   ============================================================ */

/* ---- small DOM + math helpers ---- */
function byId(id){return document.getElementById(id);}
function V3(x,y,z){return new (T().Vector3)(x,y,z);}
function clamp01(v){return v<0?0:v>1?1:v;}
function dist2(ax,az,bx,bz){const dx=ax-bx,dz=az-bz;return Math.sqrt(dx*dx+dz*dz);}
function easeIO(k){return k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;}

/* ---- story state ---- */
const ST = {
  visited:{}, day:0, firstFeastDone:false, leaveReady:false,
  travel:+1,            // +1 rowing upstream (in), -1 rowing downstream (out)
  boatV:0, latOff:0, rowPh:0,
  lastMarkU:99, lostArrived:false,
  promptAction:null,
  capUntil:0, capPersist:false, capSeen:{},
  started:false
};
G.story = ST;
G.cine = {active:false,t:0,dur:1,from:null,to:null,onDone:null};

/* ============================================================
   PASSAGE + WALKER  (built once, on top of the world modules)
   ============================================================ */
function buildPassage(){
  // a short rough crevice between the cliff opening and the valley (初極狹)
  const op=G.openingPos, VC=G.villageCenter;
  const rockMat=new (T().MeshStandardMaterial)({map:texRock(),color:0x6a665d,roughness:1,flatShading:true});
  const gate=V3(op.x, 0, op.z-12); G.gate=gate;
  // two flanking walls running from the cliff toward the gate
  for(const s of [1,-1]){
    const wall=new (T().Mesh)(new (T().BoxGeometry)(1.6,9,13),rockMat);
    wall.position.set(op.x + s*2.2, 4.2, op.z-6);
    wall.rotation.y=s*0.06; wall.castShadow=wall.receiveShadow=true;
    G.scene.add(wall);
  }
  // soft collider at the cliff base so walkers can't clip into the mountain
  G.colliders.push({x:op.x, z:op.z, r:7});
}

function buildWalker(){
  const g=new (T().Group)();
  const skin=new (T().MeshStandardMaterial)({color:0xc98f63,roughness:0.8});
  const robe=new (T().MeshStandardMaterial)({color:0x6b7b6a,roughness:0.95});
  const body=new (T().Mesh)(new (T().CylinderGeometry)(0.2,0.32,0.82,8),robe);body.position.y=0.42;body.castShadow=true;g.add(body);
  const head=new (T().Mesh)(new (T().SphereGeometry)(0.15,10,8),skin);head.position.y=0.98;head.castShadow=true;g.add(head);
  const hat=new (T().Mesh)(new (T().ConeGeometry)(0.32,0.2,12),new (T().MeshStandardMaterial)({color:0xc9a86a,roughness:1}));
  hat.position.y=1.08;g.add(hat);
  const legM=robe;
  const lL=new (T().Mesh)(new (T().CylinderGeometry)(0.06,0.06,0.42,6),legM);lL.position.set(0.09,0.2,0);g.add(lL);
  const lR=new (T().Mesh)(new (T().CylinderGeometry)(0.06,0.06,0.42,6),legM);lR.position.set(-0.09,0.2,0);g.add(lR);
  g.userData={legL:lL,legR:lR,body};
  g.visible=false; G.scene.add(g); G.walker=g;
}

/* nudge the startled villager to greet the player right at the gate */
function relocateFirstVillager(){
  const op=G.openingPos;
  const fx=op.x-1, fz=op.z-22;
  for(const v of G.villagers){ if(v.userData.kind==="first"){ v.position.set(fx,0,fz); v.__home=V3(fx,0,fz);} }
  for(const it of G.interactables){ if(it.kind==="first"){ it.pos.set(fx,0,fz); } }
  // a red "!" that appears when you first come near him (大驚)
  const ex=new (T().Group)();
  const stalk=new (T().Mesh)(new (T().BoxGeometry)(0.07,0.34,0.07),new (T().MeshBasicMaterial)({color:0xb03a2e}));
  stalk.position.y=0.22;ex.add(stalk);
  const dot=new (T().Mesh)(new (T().BoxGeometry)(0.09,0.09,0.09),new (T().MeshBasicMaterial)({color:0xb03a2e}));
  dot.position.y=-0.04;ex.add(dot);
  ex.position.set(fx,1.7,fz);ex.visible=false;G.scene.add(ex);G.exclMark=ex;
}

/* ============================================================
   CAMERA
   ============================================================ */
function chase(target, headAng, dist, height, lookH, lookAhead, dt){
  const yaw=headAng + G.yaw;
  const fx=Math.sin(yaw), fz=Math.cos(yaw);
  const ty=(target.y||0);
  const want=V3(target.x - fx*dist, ty + height + G.pitch*6, target.z - fz*dist);
  const a=Math.min(1, dt*6.5);
  G.cam.position.lerp(want, a);
  G.cam.lookAt(target.x + fx*lookAhead, ty + lookH, target.z + fz*lookAhead);
}
function camStep(dt){
  if(G.cine.active) return;            // cinematic drives the camera
  if(G.camMode==="boat" && G.boat){
    const dir=ST.travel>0?1:0;
    const tg=curveTangent(G.boatU);
    const head=Math.atan2(tg.x,tg.z)+(ST.travel<0?Math.PI:0);
    chase(G.boat.position, head, 9.5, 4.4, 1.1, 7, dt);
  } else if(G.camMode==="walk" && G.walker){
    chase(G.walker.position, G.walkYaw, 6.6, 3.7, 1.35, 3.2, dt);
  }
}

function startCine(fromP,fromL,toP,toL,dur,onDone){
  G.cine={active:true,t:0,dur,from:{p:fromP.clone(),l:fromL.clone()},to:{p:toP.clone(),l:toL.clone()},onDone:onDone||null};
  G.camMode="cine";
}
function cineStep(dt){
  const c=G.cine; c.t+=dt; const k=clamp01(c.t/c.dur), e=easeIO(k);
  G.cam.position.copy(c.from.p.clone().lerp(c.to.p,e));
  const l=c.from.l.clone().lerp(c.to.l,e); G.cam.lookAt(l.x,l.y,l.z);
  if(k>=1){ c.active=false; if(c.onDone)c.onDone(); }
}

/* ============================================================
   FADE / VIGNETTE / CAPTIONS / OBJECTIVE / DAY / PROMPT
   ============================================================ */
function fade(to,ms){ const f=byId("fade"); f.style.transition=`opacity ${ms||600}ms ease`; f.style.opacity=to; }
function vignette(on){ byId("vignette").style.opacity=on?1:0; }

function showCap(key,opts){
  opts=opts||{}; const d=DATA.caps[key]; if(!d)return;
  const cap=byId("cap");
  cap.querySelector(".cn").textContent=d[0];
  cap.querySelector(".en").textContent=d[1];
  cap.classList.toggle("big",!!opts.big);
  cap.classList.add("show");
  ST.capPersist=!!opts.persist;
  ST.capUntil=G.t+(opts.dur||4.2);
}
function capOnce(key,opts){ if(ST.capSeen[key])return; ST.capSeen[key]=true; showCap(key,opts); }
function capStep(){
  if(ST.capPersist)return;
  if(byId("cap").classList.contains("show") && G.t>ST.capUntil){ byId("cap").classList.remove("show"); }
}
function setObjective(objKey){
  const d=DATA.obj[objKey]; if(!d)return;
  const o=byId("obj"); o.querySelector(".cn").textContent=d[0]; o.querySelector(".en").textContent=d[1];
}
function updateDay(){
  const el=byId("day"); el.textContent=`第 ${cnNum(ST.day)} 日　DAY ${ST.day}`; el.classList.add("show");
}
function cnNum(n){return ["零","一","二","三","四","五","六","七","八","九","十"][n]||(""+n);}
function showPrompt(txt){ byId("ptext").textContent=" "+txt; byId("prompt").classList.add("show"); }
function hidePrompt(){ byId("prompt").classList.remove("show"); }
function showMarkHint(){ const el=byId("markhint"); el.textContent=`誌之　${ST.markCount()}／8`; el.classList.add("show"); }
function hideMarkHint(){ byId("markhint").classList.remove("show"); }
ST.markCount=()=>G.marks.length;

/* ============================================================
   DIALOGUE
   ============================================================ */
const DLG = { active:false, node:null, nodeId:null, line:0, full:null, shown:0, typing:false, onClose:null, onCloseSaved:null };
const CPS = 46; // characters per second

function startDialogue(id,onClose){
  const node=DATA.dlg[id]; if(!node)return;
  DLG.active=true; DLG.node=node; DLG.nodeId=id; DLG.onClose=onClose||null; DLG.onCloseSaved=DLG.onClose;
  byId("dchoices").innerHTML=""; byId("dlg").classList.add("show");
  setLine(0);
}
function setLine(idx){
  const node=DLG.node; DLG.line=idx;
  const ln=node.lines[idx]; DLG.full=ln; DLG.shown=0; DLG.typing=true;
  byId("dspeaker").textContent=node.s||"";
  byId("dtext").textContent="";
  byId("den").textContent=ln[1]||"";
  byId("dmore").style.display="none";
  byId("dchoices").innerHTML="";
}
function renderTyping(){ byId("dtext").textContent=DLG.full[0].slice(0,Math.floor(DLG.shown)); }
function lineComplete(){
  DLG.typing=false; DLG.shown=DLG.full[0].length; renderTyping();
  const node=DLG.node; if(!node)return;
  const last = DLG.line>=node.lines.length-1;
  if(last && node.choices){ renderChoices(node.choices); byId("dmore").style.display="none"; }
  else { byId("dmore").style.display="block"; }
}
function renderChoices(choices){
  const box=byId("dchoices"); box.innerHTML="";
  choices.forEach((c,i)=>{
    const b=document.createElement("button");
    b.innerHTML=`<span>${i+1}.　${c.t}</span><small>${c.en||""}</small>`;
    b.onclick=()=>chooseDialogue(i);
    box.appendChild(b);
  });
}
function chooseDialogue(i){
  const node=DLG.node; if(!node||!node.choices||!node.choices[i])return;
  if(DLG.line<node.lines.length-1||DLG.typing)return;   // choices not active yet
  const go=node.choices[i].go; byId("dchoices").innerHTML="";
  if(go && DATA.dlg[go]){ DLG.node=DATA.dlg[go]; DLG.nodeId=go; setLine(0); }
}
function finishNode(){
  const node=DLG.node;                 // choices already handled in lineComplete
  closeDialogue();
  if(node.next){ startDialogue(node.next, DLG.onCloseSaved); }
  else { if(node.action) doAction(node.action); if(DLG.onCloseSaved) DLG.onCloseSaved(); }
}
function closeDialogue(){
  DLG.active=false; DLG.node=null; DLG.typing=false;
  byId("dlg").classList.remove("show"); byId("dchoices").innerHTML="";
}
function advanceDialogue(){
  if(!DLG.active)return;
  if(DLG.typing){ lineComplete(); return; }
  const node=DLG.node; if(!node)return;
  if(node.choices && DLG.line>=node.lines.length-1){ return; }   // waiting on a choice
  if(DLG.line < node.lines.length-1){ setLine(DLG.line+1); }
  else finishNode();
}
function dialogueStep(dt){
  if(!DLG.active||!DLG.typing)return;
  DLG.shown+=dt*CPS;
  if(DLG.shown>=DLG.full[0].length){ lineComplete(); } else renderTyping();
}
function doAction(a){
  if(a==="first_feast"){ recordVisit("first"); }
  else if(a==="elder_done"){ recordVisit("elder"); }
  else if(a==="begin_marking"){ leaveVillage(); }
  else if(a==="set_out_again"){ startLost(); }
}

/* ============================================================
   PHASE MACHINE
   ============================================================ */
const OBJ_FOR={stream:"stream",grove:"grove",source:"source",squeeze:"squeeze",reveal:"village",
  village:"village",leave:"leave",marking:"leave",report:"report",lost:"lost"};

function setPhase(p){
  G.phase=p;
  const ok=OBJ_FOR[p]; if(ok) setObjective(ok);
}

function startGame(){
  ST.started=true;
  byId("title").classList.add("hidden");
  byId("scroll").classList.add("hidden"); byId("help").classList.add("hidden");
  G.paused=false;
  // boat at the very start, rowing upstream
  G.camMode="boat"; ST.travel=+1; G.boatU=0; ST.boatV=0; ST.latOff=0;
  G.boat.position.copy(curveAt(0)); G.fisher.visible=true;
  setPhase("stream");
  G.audio.start(); G.audio.setMood("calm");
  fade(0,900);
  capOnce("stream",{dur:5});
}

function enterGrove(){
  if(G.phase!=="stream")return;
  setPhase("grove");
  G.petalMesh.visible=true;
  G.audio.setMood("warm");
  capOnce("grove",{dur:4.5});
  setTimeout(()=>{ if(G.phase==="grove") showCap("grove2",{dur:4.5}); },4800);
}
function enterSource(){
  if(G.phase==="source")return;
  setPhase("source");
  G.audio.setMood("calm");
  capOnce("source",{dur:4.2});
  setTimeout(()=>{ if(G.phase==="source") showCap("opening",{dur:5}); },4400);
}

/* leaving the boat at the cliff mouth → the squeeze → the reveal */
function leaveBoat(){
  if(G.phase!=="source")return;
  G.audio.sting("enter");
  hidePrompt(); ST.promptAction=null;
  G.paused=true;                       // freeze sim during the transit
  fade(1,650);
  setTimeout(()=>{
    // black moment in the crevice
    vignette(true);
    showCap("squeeze",{dur:3.2,persist:true});
    // prep the valley behind the curtain
    G.village.visible=true;
    G.gate; const op=G.openingPos;
    G.walkPos=G.gate.clone(); G.walkYaw=Math.PI;   // facing into the valley (-Z)
    G.walker.visible=true; G.walker.position.copy(G.walkPos); G.walker.rotation.y=G.walkYaw;
    G.petalMesh.visible=false;
    setTimeout(doReveal,2200);
  },700);
}
function doReveal(){
  // emerge from the crevice: camera lifts from the gate out over the valley
  const op=G.openingPos;
  const fromP=V3(op.x, 1.6, op.z-2), fromL=V3(G.gate.x, 1.2, G.gate.z-4);
  // target = the walk chase pose
  const fx=Math.sin(G.walkYaw), fz=Math.cos(G.walkYaw);
  const toP=V3(G.walkPos.x - fx*6.6, 3.7, G.walkPos.z - fz*6.6);
  const toL=V3(G.walkPos.x + fx*3.2, 1.35, G.walkPos.z + fz*3.2);
  ST.capPersist=false; byId("cap").classList.remove("show");
  G.audio.sting("reveal"); G.audio.setMood("warm");
  fade(0,1100); vignette(false);
  showCap("reveal",{big:true,dur:3.6});
  G.paused=false;
  startCine(fromP,fromL,toP,toL,3.6,()=>{
    G.camMode="walk";
    setPhase("village");
    ST.day=1; updateDay();
    setTimeout(()=>{ if(G.phase==="village") showCap("village",{dur:4.2}); },300);
  });
}

/* ---- village visit bookkeeping ---- */
function recordVisit(kind){
  const fresh=!ST.visited[kind];
  ST.visited[kind]=true;
  ST.day=Math.max(1,Object.keys(ST.visited).length);
  updateDay();
  if(!ST.firstFeastDone){ ST.firstFeastDone=true; setObjective("feast"); }
  const ready = ST.visited.first && ST.visited.elder && Object.keys(ST.visited).length>=4;
  if(ready && !ST.leaveReady){
    ST.leaveReady=true; setObjective("leave");
    showCap("warned",{dur:5.5});
    G.audio.sting("enter");
  }
  return fresh;
}

/* ---- leaving the village: farewell → board → mark the way ---- */
function leaveVillage(){
  fade(1,650);
  setTimeout(()=>{
    G.walker.visible=false; G.village.visible=false;
    // boat back at the landing, now pointed downstream
    ST.travel=-1; G.boatU=G.landingU; ST.boatV=0; ST.latOff=0;
    G.boat.position.copy(curveAt(G.landingU)); G.fisher.visible=true;
    // the opening light fades behind you
    G.camMode="boat"; setPhase("marking");
    G.petalMesh.visible=true; G.audio.setMood("calm");
    ST.lastMarkU=99;
    showMarkHint();
    showCap("marking",{dur:5});
    fade(0,900);
  },680);
}

function canMark(){
  // allow a fresh mark only after moving a little down the river
  return Math.abs(G.boatU-ST.lastMarkU)>0.022 || ST.lastMarkU>1;
}
function placeMark(){
  if(G.phase!=="marking")return;
  const p=curveAt(G.boatU), tg=curveTangent(G.boatU);
  let nx=-tg.z,nz=tg.x; const L=Math.hypot(nx,nz)||1; nx/=L; nz/=L;
  const side=(G.marks.length%2===0)?1:-1;
  const w=5.0;
  dropMark(V3(p.x+nx*w*side, 0, p.z+nz*w*side));
  G.audio.sting("mark");
  ST.lastMarkU=G.boatU;
  showMarkHint();
}

/* ---- reaching the prefect, then the doomed return ---- */
function reachReport(){
  if(G.phase!=="marking")return;
  hidePrompt(); ST.promptAction=null; hideMarkHint();
  fade(0.45,700);
  G.paused=true;
  setTimeout(()=>{
    setPhase("report"); showCap("report",{dur:4,persist:true});
    startDialogue("prefect", ()=>{});
  },720);
}
function startLost(){
  // 尋向所誌，遂迷，不復得路 — the marks are gone, the way cannot be found
  byId("cap").classList.remove("show"); ST.capPersist=false;
  vanishMarks();
  G.petalMesh.visible=false;
  // the faint light at the cliff mouth is simply not there anymore
  if(G.openingGlow) G.openingGlow.material.opacity=0;
  if(G.openingLight) G.openingLight.intensity=0;
  // a deeper haze over everything
  G.scene.fog.density=0.030;
  G.scene.background=new (T().Color)(0x8a958d);
  // seal the mouth with rock so it reads as ordinary cliff
  if(!G.sealRock){
    const op=G.openingPos;
    const r=new (T().Mesh)(new (T().BoxGeometry)(3.2,4.2,2.4),
      new (T().MeshStandardMaterial)({map:texRock(),color:0x6f6b62,roughness:1,flatShading:true}));
    r.position.set(op.x+0.4,2.0,op.z-1.2); r.castShadow=true; G.scene.add(r); G.sealRock=r;
  } else G.sealRock.visible=true;

  G.audio.setMood("tense"); G.audio.sting("lost");
  // back on the water, rowing up to look — but it will lead nowhere
  fade(1,700);
  setTimeout(()=>{
    ST.travel=+1; G.boatU=0.10; ST.boatV=0; ST.latOff=0; ST.lostArrived=false;
    G.boat.position.copy(curveAt(0.10)); G.camMode="boat";
    setPhase("lost"); showCap("lost",{dur:5});
    G.paused=false;            // back in control: row up to search (the way is gone)
    fade(0,1000);
  },720);
}
function triggerEpilogue(){
  fade(0.0,400);
  fillEpilogue();
  byId("epi").classList.remove("hidden");
  G.audio.sting("lost");
  G.paused=true;
}

/* ============================================================
   PER-PHASE WATCHERS + INTERACTION SCAN
   ============================================================ */
function phaseWatch(dt){
  if(G.camMode==="boat"){
    if(ST.travel>0){
      if(G.phase==="stream" && G.boatU>=G.GROVE_START_U) enterGrove();
      if((G.phase==="stream"||G.phase==="grove") && G.boatU>=0.86) enterSource();
      if(G.phase==="source") G.boatU=Math.min(G.boatU,G.landingU);
      if(G.phase==="lost"){
        G.boatU=Math.min(G.boatU,0.93);
        if(G.boatU>=0.9 && !ST.lostArrived){
          ST.lostArrived=true;
          showCap("lost",{dur:4,persist:true});
          setTimeout(triggerEpilogue,2600);
        }
      }
    } else {
      G.boatU=Math.max(G.boatU,0.0);
    }
  }
  // ramp the cliff-mouth glow as you near the source (only before the loss)
  if(G.openingGlow && G.phase==="source"){
    const t=clamp01((G.boatU-0.7)/0.22);
    G.openingGlow.material.opacity=0.15+t*0.7;
    if(G.openingLight) G.openingLight.intensity=t*2.4;
  }
}

function nearestInteractable(){
  let best=null,bd=1e9;
  for(const it of G.interactables){
    const d=dist2(G.walkPos.x,G.walkPos.z,it.pos.x,it.pos.z);
    if(d<it.r && d<bd){ bd=d; best=it; }
  }
  return best;
}
function interactScan(){
  if(DLG.active||G.cine.active){ hidePrompt(); ST.promptAction=null; return; }
  let a=null;
  if(G.phase==="source"){
    if(G.boatU>=G.landingU-0.012) a={fn:leaveBoat,cn:"棄舟，從口入"};
  }else if(G.phase==="village"){
    if(ST.leaveReady && dist2(G.walkPos.x,G.walkPos.z,G.gate.x,G.gate.z)<3.4){
      a={fn:()=>startDialogue("farewell",()=>{}),cn:"辭去，循原路而出"};
    }else{
      const it=nearestInteractable();
      if(it) a={fn:()=>startDialogue(it.id,()=>recordVisit(it.kind)),cn:it.label};
    }
  }else if(G.phase==="marking"){
    if(G.marks.length>=8 && G.boatU<=0.07){ a={fn:reachReport,cn:"上岸，稟報太守"}; }
    else if(canMark()){ a={fn:placeMark,cn:"誌之（留下記號）"}; }
  }
  ST.promptAction=a;
  if(a) showPrompt(a.cn); else hidePrompt();

  // startled "!" over the first villager
  if(G.exclMark){
    const show = (G.phase==="village" && !ST.visited.first &&
      dist2(G.walkPos.x,G.walkPos.z,G.exclMark.position.x,G.exclMark.position.z)<7);
    G.exclMark.visible=show;
    if(show) G.exclMark.position.y=1.75+Math.sin(G.t*3)*0.06;
  }
}

/* ============================================================
   MOVEMENT
   ============================================================ */
function fwdInput(){ return (G.keys["w"]||G.keys["arrowup"]?1:0) - (G.keys["s"]||G.keys["arrowdown"]?1:0) + (G.input.f||0); }
function turnInput(){ return (G.keys["a"]||G.keys["arrowleft"]?1:0) - (G.keys["d"]||G.keys["arrowright"]?1:0) - (G.input.t||0); }

function boatStep(dt){
  const f=fwdInput();
  const target=f>0.05?1:(f<-0.05?-0.45:0);
  ST.boatV += (target-ST.boatV)*Math.min(1,dt*2.2);
  const uRate=ST.boatV*0.05;
  G.boatU=clamp01(G.boatU + ST.travel*uRate*dt);

  // steer → lateral offset within the channel
  const ti=turnInput();
  ST.latOff += ti*4.2*dt; ST.latOff*= (1-Math.min(1,dt*1.6));
  const lim = (G.boatU<0.40?3.4:(G.boatU<0.95?2.6:1.2));
  ST.latOff=Math.max(-lim,Math.min(lim,ST.latOff));

  const p=curveAt(G.boatU), tg=curveTangent(G.boatU);
  let nx=-tg.z,nz=tg.x; const L=Math.hypot(nx,nz)||1; nx/=L; nz/=L;
  const bob=Math.sin(G.t*1.25)*0.03;
  G.boat.position.set(p.x+nx*ST.latOff, bob, p.z+nz*ST.latOff);
  const head=Math.atan2(tg.x,tg.z)+(ST.travel<0?Math.PI:0);
  G.boat.rotation.y=head - ST.latOff*0.04*ST.travel;

  // rowing animation
  ST.rowPh += (0.6+Math.abs(ST.boatV))*dt*5;
  if(G.oar) G.oar.rotation.x=Math.sin(ST.rowPh)*0.45;
  if(G.fisher) G.fisher.rotation.x=Math.sin(ST.rowPh)*0.05;
}

function walkStep(dt){
  const turn=turnInput();
  G.walkYaw += turn*1.9*dt;
  const f=fwdInput();
  const sp=4.3;
  const nx=Math.sin(G.walkYaw), nz=Math.cos(G.walkYaw);
  let px=G.walkPos.x + nx*f*sp*dt;
  let pz=G.walkPos.z + nz*f*sp*dt;

  // collide with houses / pond / hills / fields / cliff
  for(let pass=0;pass<2;pass++){
    for(const c of G.colliders){
      const dx=px-c.x, dz=pz-c.z; const d=Math.hypot(dx,dz), rr=c.r+0.55;
      if(d<rr && d>0.0001){ px=c.x+dx/d*rr; pz=c.z+dz/d*rr; }
    }
  }
  // keep inside the valley bowl
  const VC=G.villageCenter; const dx=px-VC.x, dz=pz-VC.z; const rv=Math.hypot(dx,dz);
  if(rv>50){ px=VC.x+dx/rv*50; pz=VC.z+dz/rv*50; }

  G.walkPos.set(px,0,pz);
  G.walker.position.set(px,0.0,pz);
  G.walker.rotation.y=G.walkYaw;
  // walk bob + leg swing
  const moving=Math.abs(f)>0.05;
  const ph=G.t*9;
  if(G.walker.userData.body) G.walker.userData.body.position.y=0.42+(moving?Math.abs(Math.sin(ph))*0.03:0);
  if(G.walker.userData.legL){ const s=moving?Math.sin(ph)*0.4:0; G.walker.userData.legL.rotation.x=s; G.walker.userData.legR.rotation.x=-s; }
}

/* ============================================================
   AMBIENT (water flow)
   ============================================================ */
function waterFlow(dt){
  if(G.water&&G.water.material&&G.water.material.map){ G.water.material.map.offset.y -= dt*0.035; }
}

/* ============================================================
   INPUT HANDLER  (called by the engine on keydown + E button)
   ============================================================ */
function handleKeyPress(k){
  // sheets first
  if(!byId("scroll").classList.contains("hidden")){ if(k==="escape")byId("scroll").classList.add("hidden"); return; }
  if(!byId("help").classList.contains("hidden")){ if(k==="escape")byId("help").classList.add("hidden"); return; }
  if(!byId("title").classList.contains("hidden")){ if(k==="enter"||k===" ")byId("bStart").click(); return; }

  if(DLG.active){
    if(k===" "||k==="enter"){ advanceDialogue(); }
    else if(k==="1"||k==="2"||k==="3"){ chooseDialogue(parseInt(k,10)-1); }
    return;
  }
  if(k==="e"){ if(ST.promptAction&&ST.promptAction.fn) ST.promptAction.fn(); }
}

/* ============================================================
   MAIN LOOP
   ============================================================ */
function frame(dt){
  if(!G.paused){
    if(G.cine.active) cineStep(dt);
    else if(G.camMode==="boat") boatStep(dt);
    else if(G.camMode==="walk") walkStep(dt);
    phaseWatch(dt);
    interactScan();
  }
  dialogueStep(dt);
  waterFlow(dt);
  if(G.petalMesh && G.petalMesh.visible) updatePetals(dt);
  if(G.village && G.village.visible) updateLife(G.t,dt);
  camStep(dt);
  capStep();
}
function tick(){
  requestAnimationFrame(tick);
  let dt=G.clock.getDelta(); if(dt>0.05)dt=0.05;
  G.t+=dt; frame(dt);
  G.renderer.render(G.scene,G.cam);
}

/* ============================================================
   UI WIRING + TEXT FILL
   ============================================================ */
function fillScrollText(){
  const box=byId("scrollBody"); box.innerHTML="";
  DATA.original.forEach(s=>{
    const p=document.createElement("p");
    p.innerHTML=`${s[0]}<span class="en">${s[1]}</span>`;
    box.appendChild(p);
  });
}
function fillEpilogue(){
  const box=byId("epiBody"); if(box.dataset.done)return; box.dataset.done="1";
  const lines=[DATA.original[29],DATA.original[30]];
  box.innerHTML=lines.map(s=>`<p>${s[0]}<span class="en">${s[1]}</span></p>`).join("");
}
function openSheet(id){ byId(id).classList.remove("hidden"); }
function closeSheet(id){ byId(id).classList.add("hidden"); }

function bindUI(){
  byId("bStart").addEventListener("click",startGame);
  byId("bText0").addEventListener("click",()=>openSheet("scroll"));
  byId("bHelp0").addEventListener("click",()=>openSheet("help"));
  byId("bScroll").addEventListener("click",()=>openSheet("scroll"));
  byId("bHelp").addEventListener("click",()=>openSheet("help"));
  byId("bScrollClose").addEventListener("click",()=>closeSheet("scroll"));
  byId("bHelpClose").addEventListener("click",()=>closeSheet("help"));
  byId("bAgain").addEventListener("click",()=>location.reload());
  byId("bMute").addEventListener("click",()=>{
    G.muted=!G.muted; G.audio.mute(G.muted);
    byId("bMute").textContent=G.muted?"啞":"音";
    byId("bMute").style.opacity=G.muted?0.5:1;
  });
  // make dialogue advance on click/tap of the box
  byId("dlg").addEventListener("click",e=>{ if(e.target.closest("#dchoices"))return; advanceDialogue(); });
}

function onResize(){
  const w=window.innerWidth,h=window.innerHeight;
  G.renderer.setSize(w,h,false);
  G.cam.aspect=w/h; G.cam.updateProjectionMatrix();
}

/* ============================================================
   BOOT
   ============================================================ */
function boot(){
  const THREE=window.THREE;
  if(!THREE){ byId("loading").textContent="THREE failed to load"; return; }
  const canvas=byId("c");
  initEngine(THREE,canvas,window.innerWidth,window.innerHeight);
  if(("ontouchstart" in window)|| (navigator.maxTouchPoints>0)) document.body.classList.add("touch");

  buildRiverPath();
  buildTerrain();
  buildWater();
  plantTrees();
  buildOpening();
  buildPetals();
  buildBoat();
  buildVillage();
  buildPassage();
  buildWalker();
  relocateFirstVillager();

  bindInput(canvas);
  bindUI();
  fillScrollText();

  // title decorative petals
  const pf=byId("petals");
  for(let i=0;i<12;i++){ const s=document.createElement("div"); s.className="petalfall"; s.textContent="❀";
    s.style.left=(Math.random()*100)+"%"; s.style.animationDuration=(7+Math.random()*8)+"s";
    s.style.animationDelay=(-Math.random()*10)+"s"; s.style.fontSize=(10+Math.random()*12)+"px"; pf.appendChild(s); }

  G.camMode="boat"; ST.travel=+1; G.boatU=0;
  // park the camera on the opening valley/river for the menu backdrop
  G.cam.position.set(8,5,12); G.cam.lookAt(0,1,-6);
  setPhase("title"); G.paused=true;

  window.addEventListener("resize",onResize); onResize();
  byId("loading").classList.add("hidden");
  fade(0,800);
  G.clock.start();
  tick();
  if(window.__ON_BOOT__) window.__ON_BOOT__();
}

/* ============================================================
   TEST HOOKS  (used by the headless harness; harmless in production)
   ============================================================ */
window.__test = {
  boot,
  state(){ return {
    phase:G.phase, paused:G.paused, camMode:G.camMode, travel:ST.travel,
    boatU:+G.boatU.toFixed(4), day:ST.day, marks:G.marks.length,
    visited:Object.keys(ST.visited), leaveReady:ST.leaveReady,
    dlg:DLG.active, dlgNode:DLG.nodeId, cine:G.cine.active,
    villageVisible:!!(G.village&&G.village.visible),
    walkerVisible:!!(G.walker&&G.walker.visible),
    petals:!!(G.petalMesh&&G.petalMesh.visible),
    glow:G.openingGlow?+G.openingGlow.material.opacity.toFixed(3):null,
    lostArrived:ST.lostArrived,
    epiOpen:!byId("epi").classList.contains("hidden"),
    prompt: ST.promptAction?ST.promptAction.cn:null,
    walkPos: G.walkPos?[+G.walkPos.x.toFixed(1),+G.walkPos.z.toFixed(1)]:null,
    interactables: G.interactables.map(it=>({kind:it.kind,id:it.id,x:+it.pos.x.toFixed(1),z:+it.pos.z.toFixed(1)}))
  };},
  step(dt,n){ n=n||1; for(let i=0;i<n;i++){ G.t+=dt; frame(dt); } G.renderer.render(G.scene,G.cam); },
  frames(dt,n){ n=n||1; for(let i=0;i<n;i++){ G.t+=dt; frame(dt); } }, // advance logic, no render (fast)
  hold(k,v){ G.keys[k]=!!v; },
  release(){ G.keys={}; G.input.f=0; G.input.t=0; },
  key(k){ handleKeyPress(k); },
  press(id){ byId(id).click(); },
  setU(u){ G.boatU=clamp01(u); },
  teleport(x,z){ if(G.walkPos){ G.walkPos.set(x,0,z); if(G.walker)G.walker.position.set(x,0,z);} },
  walkTo(kind){ const it=G.interactables.find(i=>i.kind===kind); if(it&&G.walkPos){ G.walkPos.set(it.pos.x,0,it.pos.z+0.1); if(G.walker)G.walker.position.copy(G.walkPos);} return !!it; },
  toGate(){ if(G.walkPos){ G.walkPos.set(G.gate.x,0,G.gate.z); if(G.walker)G.walker.position.copy(G.walkPos);} },
  finishDialogue(maxSteps){ // advance & auto-pick first choice until closed
    maxSteps=maxSteps||60; let i=0;
    while(DLG.active && i++<maxSteps){
      if(DLG.node && DLG.node.choices && !DLG.typing && DLG.line>=DLG.node.lines.length-1){ chooseDialogue(0); }
      else advanceDialogue();
    }
    return !DLG.active;
  },
  groveAudit(){ // verify 中無雜樹: inside the grove band, every tree is a peach
    let bad=0,inGrove=0;
    for(const t of G.trees){
      const u=t.userData.u; if(u===undefined)continue;
      if(u>=G.GROVE_START_U && u<0.95){ inGrove++;
        // peach trees carry a userData.canopy; ordinary ones do not
        if(!t.userData.canopy) bad++;
      }
    }
    return {inGrove,bad};
  },
  motionAudit(n){ // hold W for n frames; measure facing/camera vs actual velocity
    n=n||90;
    const obj=(G.camMode==="walk")?G.walker:G.boat;
    const p0=obj.position.clone();
    G.keys["w"]=true;
    for(let i=0;i<n;i++){ G.t+=1/60; frame(1/60); }
    G.keys={};
    const p1=obj.position.clone();
    const v=p1.clone().sub(p0); v.y=0;
    const fwd=V3(0,0,1).applyQuaternion(obj.quaternion); fwd.y=0;   // model bow/front (local +Z)
    const cf=new (T().Vector3)(); G.cam.getWorldDirection(cf); cf.y=0;
    const co=p1.clone().sub(G.cam.position); co.y=0;
    const nz=(a)=>{ if(a.length()>1e-6) a.normalize(); return a; };
    nz(v); nz(fwd); nz(cf); nz(co);
    return { moved:+p1.distanceTo(p0).toFixed(2),
             facingDotVel:+fwd.dot(v).toFixed(3),   // >0: it faces the way it moves
             camDotVel:+cf.dot(v).toFixed(3),       // >0: it moves into the screen
             camSeesIt:+cf.dot(co).toFixed(3) };    // >0: it is in front of the camera
  },
  glowOnScreen(){ // is the cliff-mouth light actually in frame?
    const p=V3(G.openingPos.x, 1.7, G.openingPos.z);
    const cf=new (T().Vector3)(); G.cam.getWorldDirection(cf);
    const inFront=cf.dot(p.clone().sub(G.cam.position))>0;
    const ndc=p.clone().project(G.cam);
    return { inFront, x:+ndc.x.toFixed(2), y:+ndc.y.toFixed(2) };
  },
  glowState(){ // material + visibility chain of the glow plane
    const g=G.openingGlow; if(!g) return null;
    let vis=true,o=g; while(o){ if(!o.visible){vis=false;break;} o=o.parent; }
    return { opacity:+g.material.opacity.toFixed(2), transparent:g.material.transparent,
             ownVisible:g.visible, chainVisible:vis, inScene:!!g.parent,
             pos:[+g.position.x.toFixed(2),+g.position.y.toFixed(2),+g.position.z.toFixed(2)] };
  },
  lookAtOpening(d){ // park the camera d units straight off the glow and render
    d=d||6; const p=G.openingGlow.position;
    G.cam.position.set(p.x, p.y+0.3, p.z+d);
    G.cam.lookAt(p.x,p.y,p.z);
    G.renderer.render(G.scene,G.cam);
  },
  rayToOpening(){ // what sits between the camera and the glow? (first hits, nearest first)
    const o=G.cam.position.clone();
    const t=V3(G.openingPos.x,1.7,G.openingPos.z);
    const d=t.clone().sub(o); const dist=d.length(); d.normalize();
    const rc=new (T().Raycaster)(o,d,0.1,dist+6);
    const hits=rc.intersectObjects(G.scene.children,true).slice(0,8).map(h=>({
      d:+h.distance.toFixed(2),
      g:h.object.geometry?h.object.geometry.type:"?",
      col:(h.object.material&&h.object.material.color)?"#"+h.object.material.color.getHexString():"?",
      at:[+h.object.position.x.toFixed(1),+h.object.position.y.toFixed(1),+h.object.position.z.toFixed(1)]
    }));
    return {cam:[+o.x.toFixed(1),+o.y.toFixed(1),+o.z.toFixed(1)],
            glow:[+t.x.toFixed(2),+t.y.toFixed(2),+t.z.toFixed(2)],dist:+dist.toFixed(2),hits};
  },
  setCamForShot(kind){ // place camera nicely for screenshots of a given phase
    if(kind==="boat"){ const tg=curveTangent(G.boatU); const h=Math.atan2(tg.x,tg.z)+(ST.travel<0?Math.PI:0);
      const fx=Math.sin(h),fz=Math.cos(h); G.cam.position.set(G.boat.position.x-fx*9.5,4.4,G.boat.position.z-fz*9.5);
      G.cam.lookAt(G.boat.position.x+fx*7,1.1,G.boat.position.z+fz*7); }
    else if(kind==="walk" && G.walkPos){ const fx=Math.sin(G.walkYaw),fz=Math.cos(G.walkYaw);
      G.cam.position.set(G.walkPos.x-fx*6.6,3.7,G.walkPos.z-fz*6.6); G.cam.lookAt(G.walkPos.x+fx*3.2,1.35,G.walkPos.z+fz*3.2); }
    G.renderer.render(G.scene,G.cam);
  }
};

/* auto-boot in the browser (DOM is ready: script sits at end of body) */
if(!window.__NO_AUTOBOOT__){ if(document.readyState==="loading") window.addEventListener("DOMContentLoaded",boot); else boot(); }
