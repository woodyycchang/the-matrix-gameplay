const fs=require('fs');
const {PNG}=(function(){try{return require('pngjs')}catch(e){return require('/home/claude/rigb/node_modules/pngjs')}})();
for (const f of ['00_math','01_glyph','02_mesh','03_props','04_scenes','05_engine','06_game','07_audio']) require(__dirname+'/../src/'+f+'.js');
const C=globalThis.C;
const g=new C.Game(); g.update({},0.2); g.request('erebus');
for(let i=0;i<50;i++) g.update({},1/30);
const W=960,H=540;
function hex2(c){const m=/^#?([0-9a-f]{6})/i.exec(c||'#000000');const v=parseInt(m?m[1]:'000000',16);return [v>>16,(v>>8)&255,v&255];}
function paint(pose,out,sceneWord){
  if(sceneWord && (!g.scene || g.scene.name.indexOf(sceneWord)<0)){ g.request(sceneWord); for(let i=0;i<30;i++) g.update({},1/30); }
  g.player.pos=[pose[0],pose[1],pose[2]]; g.player.yaw=pose[3]; g.player.pitch=pose[4]; g.player.vel=[0,0,0];
  if(pose[5]!==undefined) g.time=pose[5];
  g.update({},1/60);
  const ops=C.render(g,W,H,g.time);
  const png=new PNG({width:W,height:H});
  // ---- sky painters (parity with 08_app): epang day-cycle + shu ridge; erebus space ----
  const skyOp = null;
  (function(){})();
  const sop = (function(){ const o=C.render(g,4,4,g.time); return o[0]&&o[0].t==='sky'?o[0]:null; })();
  function mix(c1,c2,t2){t2=Math.max(0,Math.min(1,t2));return [c1[0]+(c2[0]-c1[0])*t2,c1[1]+(c2[1]-c1[1])*t2,c1[2]+(c2[2]-c1[2])*t2];}
  function put(x,y,c,a){if(x<0||y<0||x>=W||y>=H)return;const o=((y|0)*W+(x|0))*4;a=a===undefined?1:a;png.data[o]=png.data[o]*(1-a)+c[0]*a;png.data[o+1]=png.data[o+1]*(1-a)+c[1]*a;png.data[o+2]=png.data[o+2]*(1-a)+c[2]*a;png.data[o+3]=255;}
  const bgD=hex2('#02030a');
  const hor=H*0.5+Math.tan(g.player.pitch)*(H*0.62);
  if (sop && sop.mode==='epang'){
    const ph=((sop.time||0)%240)/240, seg=Math.floor(ph*4), fr=ph*4-seg;
    const KT=[[201,138,90],[168,192,216],[176,84,58],[20,22,38]], KB=[[232,176,136],[216,224,230],[90,36,48],[10,12,24]];
    const top=mix(KT[seg],KT[(seg+1)%4],fr), bot=mix(KB[seg],KB[(seg+1)%4],fr);
    for(let y=0;y<H;y++){const c=y<hor?mix(top,bot,y/Math.max(1,hor)):bot;for(let x=0;x<W;x++)put(x,y,c);}
    const night=seg===3?(0.4+0.6*fr):(seg===2?fr*0.4:0);
    if(night>0.05)for(let si=0;si<70;si++){let h1=Math.sin(si*12.9898)*43758.5453;h1-=Math.floor(h1);let h2=Math.sin(si*78.233)*12543.21;h2-=Math.floor(h2);
      let sd=h1*Math.PI*2-g.player.yaw;while(sd>Math.PI)sd-=Math.PI*2;while(sd<-Math.PI)sd+=Math.PI*2;
      if(Math.abs(sd)<1.3)put(W*0.5+sd/1.3*W*0.62,h2*hor*0.85,[220,228,255],night*0.6);}
    let sdx=((1.9-g.player.yaw)%(Math.PI*2));if(sdx>Math.PI)sdx-=Math.PI*2;if(sdx<-Math.PI)sdx+=Math.PI*2;
    if(Math.abs(sdx)<1.5&&seg<3){const sx=W*0.5+sdx/1.25*W*0.62,sy=hor-Math.sin(ph*Math.PI)*H*0.7,R=seg===2?20:13;
      const sc=seg===0?[255,214,150]:seg===1?[255,246,224]:[255,120,70];
      for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++)if(dx*dx+dy*dy<=R*R)put(sx+dx,sy+dy,sc,0.9);}
    const mc=seg===3?[5,7,14]:(seg===2?[28,16,22]:[42,32,38]);
    for(let mx=0;mx<=W;mx++){const t3=mx/W*40;const mh=Math.sin(t3*1.7+0.6)*0.5+Math.sin(t3*0.53-g.player.yaw*2.2)*0.5;
      const ridge=hor-(12+mh*16)*(H/540);for(let y=ridge;y<hor;y++)put(mx,y,mc);}
  } else if (sop && sop.mode==='erebus'){
    for(let i=0;i<W*H;i++){png.data[i*4]=bgD[0];png.data[i*4+1]=bgD[1];png.data[i*4+2]=bgD[2];png.data[i*4+3]=255;}
    for(let si=0;si<110;si++){let h1=Math.sin(si*12.9898)*43758.5453;h1-=Math.floor(h1);let h2=Math.sin(si*78.233)*12543.21;h2-=Math.floor(h2);
      let sd=h1*Math.PI*2-g.player.yaw;while(sd>Math.PI)sd-=Math.PI*2;while(sd<-Math.PI)sd+=Math.PI*2;
      if(Math.abs(sd)<1.25)put(W*0.5+sd/1.25*W*0.62,h2*H*0.9,[220,230,255],0.5);}
  } else {
    for(let i=0;i<W*H;i++){png.data[i*4]=bgD[0];png.data[i*4+1]=bgD[1];png.data[i*4+2]=bgD[2];png.data[i*4+3]=255;}
  }
  function fill(pts,c,a){
    const col=hex2(c); let minY=1e9,maxY=-1e9;
    for(let i=1;i<pts.length;i+=2){minY=Math.min(minY,pts[i]);maxY=Math.max(maxY,pts[i]);}
    minY=Math.max(0,minY|0);maxY=Math.min(H-1,Math.ceil(maxY));
    for(let y=minY;y<=maxY;y++){
      const xs=[];
      for(let i=0,n=pts.length/2;i<n;i++){
        const x1=pts[i*2],y1=pts[i*2+1],x2=pts[((i+1)%n)*2],y2=pts[((i+1)%n)*2+1];
        if((y1<=y&&y2>y)||(y2<=y&&y1>y)) xs.push(x1+(y-y1)/(y2-y1)*(x2-x1));
      }
      xs.sort((a,b)=>a-b);
      for(let k=0;k+1<xs.length;k+=2){
        const x0=Math.max(0,xs[k]|0),x1=Math.min(W-1,Math.ceil(xs[k+1]));
        for(let x=x0;x<=x1;x++){const o=(y*W+x)*4;
          png.data[o]=png.data[o]*(1-a)+col[0]*a; png.data[o+1]=png.data[o+1]*(1-a)+col[1]*a; png.data[o+2]=png.data[o+2]*(1-a)+col[2]*a;}
      }
    }
  }
  for(const op of ops){ if(op.t==='poly'&&op.p&&op.p.length>=6) fill(op.p, op.c, op.a===undefined?1:Math.max(0,Math.min(1,op.a))); }
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log('wrote',out,'polys:',ops.filter(o=>o.t==='poly').length);
}
const SUF=process.argv[2]||'';
paint([0,0.02,45.5, 0, 0.02, 12], '/tmp/shot_epang'+SUF+'.png', 'epang');
paint([4,0.02,30, -0.35, 0.06], '/tmp/shot_dock'+SUF+'.png', 'erebus');
paint([0,0.02,10.5, 0, 0.10], '/tmp/shot_rotunda'+SUF+'.png', 'erebus');
paint([0,-6.9,32.5, 0, 0.05], '/tmp/shot_reactor'+SUF+'.png', 'erebus');
paint([0,0.02,-19.5, 0, 0.04], '/tmp/shot_bridge'+SUF+'.png', 'erebus');
paint([-4,12.62,9.5, 0.6, 0.30], '/tmp/shot_dome'+SUF+'.png', 'erebus');
