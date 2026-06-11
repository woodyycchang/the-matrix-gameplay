/* ============================================================
   桃花源記  ·  ENGINE  (part 1: scene, materials, audio, input)
   Three.js r128, fully procedural — no external assets.
   ============================================================ */
const G = {
  THREE:null, scene:null, cam:null, renderer:null, clock:null,
  boat:null, fisher:null, oar:null,
  water:null, riverPath:[], riverLen:0,
  trees:[], petals:[], petalGeo:null,
  village:null, villagers:[], livestock:[],
  marks:[], markMeshes:[],
  colliders:[],            // {x,z,r} soft cylinders for the valley
  interactables:[],        // {pos,r,label,labelEn,kind,id,done}
  phase:"boot",
  t:0, dt:0,
  yaw:0, pitch:0,          // free-look offset
  input:{f:0,t:0},         // forward / turn  (-1..1)
  keys:{},
  camMode:"boat",          // boat | walk | fixed
  walkPos:null, walkYaw:0,
  ready:false, paused:true,
  audio:null, muted:false,
  api:{}                   // exposed to story layer
};

/* ---------------- procedural canvas textures ---------------- */
function makeCanvas(s){const c=document.createElement("canvas");c.width=c.height=s;return c;}

function texWater(){
  const s=256,c=makeCanvas(s),x=c.getContext("2d");
  const g=x.createLinearGradient(0,0,0,s);
  g.addColorStop(0,"#3f5a52");g.addColorStop(1,"#28403a");
  x.fillStyle=g;x.fillRect(0,0,s,s);
  for(let i=0;i<900;i++){x.globalAlpha=Math.random()*0.06;x.fillStyle=Math.random()<.5?"#9fd0c4":"#16241f";
    x.fillRect(Math.random()*s,Math.random()*s,Math.random()*3+1,1);}
  x.globalAlpha=1;return texFrom(c,4,1);
}
function texBark(){
  const s=128,c=makeCanvas(s),x=c.getContext("2d");
  x.fillStyle="#5a463a";x.fillRect(0,0,s,s);
  for(let i=0;i<140;i++){x.strokeStyle=`rgba(${30+Math.random()*30},${22+Math.random()*22},${16+Math.random()*16},${.4+Math.random()*.4})`;
    x.lineWidth=Math.random()*2+0.5;x.beginPath();const xx=Math.random()*s;x.moveTo(xx,0);
    x.bezierCurveTo(xx+Math.random()*10-5,s*.3,xx+Math.random()*12-6,s*.7,xx+Math.random()*10-5,s);x.stroke();}
  return texFrom(c,1,3);
}
function texGround(top,spd){
  const s=256,c=makeCanvas(s),x=c.getContext("2d");
  x.fillStyle=top;x.fillRect(0,0,s,s);
  for(let i=0;i<2600;i++){x.globalAlpha=Math.random()*0.5;x.fillStyle=Math.random()<.5?spd:"#000";
    x.fillRect(Math.random()*s,Math.random()*s,Math.random()*2+1,Math.random()*2+1);}
  // faint petal flecks
  x.globalAlpha=.5;x.fillStyle="#e89fb0";
  for(let i=0;i<60;i++)x.fillRect(Math.random()*s,Math.random()*s,2,2);
  x.globalAlpha=1;return texFrom(c,10,10);
}
function texRock(){
  const s=256,c=makeCanvas(s),x=c.getContext("2d");
  x.fillStyle="#6d6a63";x.fillRect(0,0,s,s);
  for(let i=0;i<1400;i++){x.globalAlpha=Math.random()*.4;x.fillStyle=Math.random()<.5?"#4a4842":"#8b877e";
    x.fillRect(Math.random()*s,Math.random()*s,Math.random()*4+1,Math.random()*4+1);}
  for(let i=0;i<26;i++){x.globalAlpha=.3;x.strokeStyle="#3a3833";x.lineWidth=Math.random()*2+1;
    x.beginPath();x.moveTo(Math.random()*s,Math.random()*s);x.lineTo(Math.random()*s,Math.random()*s);x.stroke();}
  x.globalAlpha=1;return texFrom(c,3,3);
}
function texPetalSprite(){
  const s=64,c=makeCanvas(s),x=c.getContext("2d");
  x.translate(s/2,s/2);
  const grd=x.createRadialGradient(0,-6,1,0,0,18);
  grd.addColorStop(0,"#fff0f4");grd.addColorStop(.6,"#f3aabb");grd.addColorStop(1,"rgba(230,150,170,0)");
  x.fillStyle=grd;
  x.beginPath();
  // simple petal: two arcs
  x.moveTo(0,16);x.quadraticCurveTo(15,2,0,-16);x.quadraticCurveTo(-15,2,0,16);x.fill();
  return texFrom(c,1,1);
}
function texFrom(c,rx,ry){
  const T=new G.THREE.CanvasTexture(c);
  T.wrapS=T.wrapT=G.THREE.RepeatWrapping;T.repeat.set(rx,ry);
  T.anisotropy=4;return T;
}

/* ---------------- audio: procedural guzheng-ish ambience ---------------- */
function Audio(){
  let ctx=null,master=null,pad=null,running=false,scaleT=null,waterNode=null;
  const penta=[0,2,4,7,9]; // pentatonic
  function init(){
    if(ctx)return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain();master.gain.value=0.0;master.connect(ctx.destination);
    // soft water noise bed
    const buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.4;
    waterNode=ctx.createBufferSource();waterNode.buffer=buf;waterNode.loop=true;
    const lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=420;
    const wg=ctx.createGain();wg.gain.value=0.06;
    waterNode.connect(lp);lp.connect(wg);wg.connect(master);waterNode.start();
  }
  function pluck(freq,when,dur,gain){
    const o=ctx.createOscillator(),g=ctx.createGain(),o2=ctx.createOscillator();
    o.type="triangle";o2.type="sine";o.frequency.value=freq;o2.frequency.value=freq*2.001;
    const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=2200;
    g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(gain,when+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,when+dur);
    o.connect(f);o2.connect(f);f.connect(g);g.connect(master);
    o.start(when);o2.start(when);o.stop(when+dur);o2.stop(when+dur);
  }
  let mood="calm";
  function schedule(){
    if(!running)return;
    const base=mood==="tense"?146.83:(mood==="warm"?196:174.61); // D3 / G3 / F3
    const now=ctx.currentTime;
    const n=2+(Math.random()*2|0);
    for(let i=0;i<n;i++){
      const deg=penta[(Math.random()*penta.length)|0];
      const oct=Math.random()<0.35?2:1;
      const f=base*Math.pow(2,deg/12)*oct;
      pluck(f,now+i*0.34+Math.random()*0.1,1.6+Math.random()*1.2,0.10);
    }
    const gap=mood==="tense"?1300:2400;
    scaleT=setTimeout(schedule,gap+Math.random()*1200);
  }
  return {
    start(){ if(G.muted)return; init(); if(ctx.state==="suspended")ctx.resume();
      running=true; master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.9,ctx.currentTime+2.5); schedule(); },
    setMood(m){mood=m;},
    sting(kind){ if(!ctx||G.muted)return; const now=ctx.currentTime;
      if(kind==="reveal"){[0,4,7,12].forEach((d,i)=>pluck(196*Math.pow(2,d/12),now+i*0.12,2.4,0.14));}
      else if(kind==="lost"){[0,-1,-3].forEach((d,i)=>pluck(146.83*Math.pow(2,d/12),now+i*0.5,3.2,0.13));}
      else if(kind==="mark"){pluck(523.25,now,0.5,0.09);}
      else if(kind==="enter"){pluck(261.63,now,1.4,0.12);}
    },
    mute(m){G.muted=m; if(master)master.gain.linearRampToValueAtTime(m?0:0.9,(ctx?ctx.currentTime:0)+0.3);
      if(m&&scaleT){clearTimeout(scaleT);} else if(!m&&running){schedule();} },
    resumeCtx(){ if(ctx&&ctx.state==="suspended")ctx.resume(); }
  };
}

/* ---------------- renderer bootstrap ---------------- */
function initEngine(THREE,canvas,W,H){
  G.THREE=THREE;
  const r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance",preserveDrawingBuffer:true});
  r.setSize(W,H,false); r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  r.shadowMap.enabled=true; r.shadowMap.type=THREE.PCFSoftShadowMap;
  r.outputEncoding=THREE.sRGBEncoding; r.toneMapping=THREE.ACESFilmicToneMapping; r.toneMappingExposure=1.05;
  G.renderer=r;
  G.scene=new THREE.Scene();
  G.scene.background=new THREE.Color(0x9fb0a8);
  G.scene.fog=new THREE.FogExp2(0x9fb0a8,0.014);
  G.cam=new THREE.PerspectiveCamera(58,W/H,0.1,600);
  G.cam.position.set(0,3,8);
  G.clock=new THREE.Clock();

  // lighting: soft overcast + warm key
  const hemi=new THREE.HemisphereLight(0xdfe7e0,0x4a5247,0.85); G.scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1d8,1.15); sun.position.set(-40,70,30);
  sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  const d=120; sun.shadow.camera.left=-d;sun.shadow.camera.right=d;sun.shadow.camera.top=d;sun.shadow.camera.bottom=-d;
  sun.shadow.camera.far=300; sun.shadow.bias=-0.0004; G.sun=sun; G.scene.add(sun);
  G.hemi=hemi;

  G.audio=Audio();
  G.petalGeo=new THREE.PlaneGeometry(0.34,0.34);
  G.petalTex=texPetalSprite();

  return r;
}

/* ---------------- input ---------------- */
function bindInput(canvas){
  const onKey=(e,v)=>{
    const k=e.key.toLowerCase();
    if(["w","a","s","d"," ","arrowup","arrowdown","arrowleft","arrowright","1","2","3","e"].includes(k)){
      if(k===" "||k.startsWith("arrow"))e.preventDefault();
    }
    G.keys[k]=v;
    if(v&&!e.repeat) handleKeyPress(k);
  };
  window.addEventListener("keydown",e=>onKey(e,true),{passive:false});
  window.addEventListener("keyup",e=>onKey(e,false));

  // mouse / touch look (drag)
  let dragging=false,px=0,py=0;
  const start=(x,y)=>{dragging=true;px=x;py=y;};
  const move=(x,y)=>{ if(!dragging)return; const dx=x-px,dy=y-py;px=x;py=y;
    G.yaw  -= dx*0.0032; G.pitch -= dy*0.0026;
    G.pitch=Math.max(-0.5,Math.min(0.5,G.pitch));
    G.yaw=Math.max(-1.0,Math.min(1.0,G.yaw)); };
  const end=()=>{dragging=false;};
  canvas.addEventListener("mousedown",e=>start(e.clientX,e.clientY));
  window.addEventListener("mousemove",e=>move(e.clientX,e.clientY));
  window.addEventListener("mouseup",end);

  // touch joystick
  const stick=document.getElementById("stick"),knob=document.getElementById("knob");
  let sid=null,scx=0,scy=0;
  const sRect=()=>stick.getBoundingClientRect();
  stick.addEventListener("touchstart",e=>{e.preventDefault();const t=e.changedTouches[0];sid=t.identifier;
    const r=sRect();scx=r.left+r.width/2;scy=r.top+r.height/2;},{passive:false});
  stick.addEventListener("touchmove",e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier!==sid)continue;
    let dx=t.clientX-scx,dy=t.clientY-scy;const mag=Math.hypot(dx,dy),max=52;
    if(mag>max){dx*=max/mag;dy*=max/mag;}
    knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
    G.input.t=dx/max; G.input.f=-dy/max;}},{passive:false});
  const sEnd=e=>{for(const t of e.changedTouches){if(t.identifier===sid){sid=null;G.input.f=0;G.input.t=0;
    knob.style.transform="translate(-50%,-50%)";}}};
  stick.addEventListener("touchend",sEnd);stick.addEventListener("touchcancel",sEnd);

  // touch look on canvas
  let tlid=null;
  canvas.addEventListener("touchstart",e=>{const t=e.changedTouches[0];if(t.clientX>window.innerWidth*0.4){tlid=t.identifier;start(t.clientX,t.clientY);}},{passive:true});
  canvas.addEventListener("touchmove",e=>{for(const t of e.changedTouches){if(t.identifier===tlid)move(t.clientX,t.clientY);}},{passive:true});
  canvas.addEventListener("touchend",e=>{for(const t of e.changedTouches){if(t.identifier===tlid){tlid=null;end();}}},{passive:true});

  document.getElementById("btnE").addEventListener("click",()=>handleKeyPress("e"));
}
