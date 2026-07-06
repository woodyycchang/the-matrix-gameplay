const fs=require('fs');
let PNGMOD; try { PNGMOD = require('pngjs'); } catch(e1) { try { PNGMOD = require('/home/claude/rigb/node_modules/pngjs'); } catch(e2) { PNGMOD = require(__dirname + '/../node_modules/pngjs'); } }
const {PNG} = PNGMOD;   // P9: no single container path may be load-bearing
for (const f of ['00_math','01_glyph','02_mesh','03_props','04_scenes','05_engine','06_game','07_audio']) require(__dirname+'/../src/'+f+'.js');
const C=globalThis.C;
const g=new C.Game(); g.update({},0.2); g.request('erebus');
for(let i=0;i<50;i++) g.update({},1/30);
const W=960,H=540;
function hex2(c){const m=/^#?([0-9a-f]{6})/i.exec(c||'#000000');const v=parseInt(m?m[1]:'000000',16);return [v>>16,(v>>8)&255,v&255];}
function paint(pose,out,sceneWord){
  if(sceneWord && (!g.scene || g.scene.name.indexOf(sceneWord)<0)){ g.request(sceneWord); for(let i=0;i<90;i++) g.update({},1/30); }   // full materialize settle
  g.player.pos=[pose[0],pose[1],pose[2]]; g.player.yaw=pose[3]; g.player.pitch=pose[4]; g.player.vel=[0,0,0];
  if(pose[5]!==undefined) g.time=pose[5];
  if(pose[6]!==undefined && g.scene && g.scene.sky==='mobil'){ g.scene._t0 = g.time - pose[6]; for(let i=0;i<10;i++) g.update({},1/30); }
  if(pose[6]!==undefined && g.scene && g.scene.sky==='empire'){ g.scene._c0 = g.time - 2*(pose[6]-1164);
    for(let i=0;i<100;i++) g.update({},1/30); }   // the night swap re-materializes the town; wait for it
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
  } else if (sop && sop.mode==='empire'){
    const mm=((sop.time||0)%1440+1440)%1440;
    const ssf=(a,b,x)=>{const t2=Math.max(0,Math.min(1,(x-a)/(b-a)));return t2*t2*(3-2*t2);};
    const eve=ssf(1190,1238,mm), morn=1-ssf(308,382,mm);
    const nf=Math.max(eve, mm<720?morn:0);
    const de=ssf(1085,1165,mm)*(1-ssf(1185,1240,mm)), dm=ssf(300,345,mm)*(1-ssf(370,420,mm));
    const df=Math.max(de,dm);
    const bl=(a,b,c)=>mix(mix(a,b,df),c,nf);
    const top=bl([74,118,184],[28,42,82],[4,6,14]);
    const mid=bl([166,196,230],[122,90,138],[10,16,31]);
    const horC=bl([233,238,240],[232,132,60],[19,26,38]);
    const fogc=hex2(sop.fogCol||'#4a3a4e');
    for(let y=0;y<H;y++){
      let c;
      if(y<hor){const u=y/Math.max(1,hor); c = u<0.5 ? mix(top,mid,u/0.5) : mix(mid,horC,(u-0.5)/0.5);
        if(df>0.1 && y>hor-H*0.22){const wt=df*0.55*(1-(hor-y)/(H*0.22)); c=mix(c,[255,196,106],Math.max(0,wt));}}
      else c=fogc;
      for(let x=0;x<W;x++)put(x,y,c);
    }
    if(nf>0.08){
      for(let si=0;si<80;si++){let h1=Math.sin(si*12.9898)*43758.5453;h1-=Math.floor(h1);let h2=Math.sin(si*78.233)*12543.21;h2-=Math.floor(h2);
        let sd=h1*Math.PI*2-g.player.yaw;while(sd>Math.PI)sd-=Math.PI*2;while(sd<-Math.PI)sd+=Math.PI*2;
        if(Math.abs(sd)<1.3)put(W*0.5+sd/1.3*W*0.62,h2*hor*0.85,[207,216,255],nf*0.6);}
      let mdx=((2.6-g.player.yaw)%(Math.PI*2));if(mdx>Math.PI)mdx-=Math.PI*2;if(mdx<-Math.PI)mdx+=Math.PI*2;
      if(Math.abs(mdx)<1.4){const mxp=W*0.5+mdx/1.25*W*0.62,myp=hor*0.22,MR=9;
        for(let dy=-MR;dy<=MR;dy++)for(let dx=-MR;dx<=MR;dx++)if(dx*dx+dy*dy<=MR*MR)put(mxp+dx,myp+dy,[220,228,255],nf*0.9);}
    }
    const sa=Math.max(-0.2,Math.min(1.2,(mm-360)/840))*Math.PI;
    const sunEl=Math.sin(sa), sunAz=Math.cos(sa)>0?1.5708:-1.5708;
    let sdx=((sunAz-g.player.yaw)%(Math.PI*2));if(sdx>Math.PI)sdx-=Math.PI*2;if(sdx<-Math.PI)sdx+=Math.PI*2;
    if(sunEl>-0.05&&nf<0.85&&Math.abs(sdx)<1.5){const sx=W*0.5+sdx/1.25*W*0.62,sy=hor-sunEl*H*0.75,SR=df>0.35?19:12;
      const scc=df>0.35?[255,164,90]:[255,242,221];
      for(let dy=-SR;dy<=SR;dy++)for(let dx=-SR;dx<=SR;dx++)if(dx*dx+dy*dy<=SR*SR)put(sx+dx,sy+dy,scc,0.9);}
  } else if (sop && sop.mode==='erebus'){
    for(let i=0;i<W*H;i++){png.data[i*4]=bgD[0];png.data[i*4+1]=bgD[1];png.data[i*4+2]=bgD[2];png.data[i*4+3]=255;}
    const wrap=(x)=>{while(x>Math.PI)x-=Math.PI*2;while(x<-Math.PI)x+=Math.PI*2;return x;};
    for(let si=0;si<110;si++){let h1=Math.sin(si*12.9898)*43758.5453;h1-=Math.floor(h1);let h2=Math.sin(si*78.233)*12543.21;h2-=Math.floor(h2);
      let sd=wrap(h1*Math.PI*2-g.player.yaw);
      if(Math.abs(sd)<1.25)put(W*0.5+sd/1.25*W*0.62,h2*H*0.9,[220,230,255],0.5);}
    const sunAz=(sop.time||0)*(Math.PI*2/240), sunEl=Math.sin(sunAz)*0.45+0.12;
    const GAZ=2.4, GEL=0.18;
    const ddv=Math.hypot(wrap(sunAz-GAZ),sunEl-GEL);
    const vis=Math.max(0,Math.min(1,(ddv-0.18)/(0.55-0.18)));
    const sdx=wrap(sunAz-g.player.yaw);
    const flood=Math.max(0,1-Math.abs(sunEl-0.18)/0.32)*vis;
    if(flood>0.02){
      const f0=Math.max(0,hor-H*0.55), f1=Math.min(H,hor+H*0.1);
      for(let y=0;y<H;y++){const u=Math.max(0,Math.min(1,(y-f0)/Math.max(1,f1-f0)));
        const a1=u<0.7? (u/0.7)*0.40*flood : 0.40*flood + (u-0.7)/0.3*(0.29-0.40)*flood;
        const cB=u<0.7? [70,150,180] : mix([70,150,180],[255,190,120],(u-0.7)/0.3);
        if(a1>0.004)for(let x=0;x<W;x++)put(x,y,cB,a1);} }
    if(Math.abs(sdx)<1.55){
      const sx=W*0.5+sdx/1.25*W*0.62, sy=hor-sunEl*H*0.9;
      const R2=90;
      for(let dy=-R2;dy<=R2;dy++)for(let dx=-R2;dx<=R2;dx++){const rr2=Math.sqrt(dx*dx+dy*dy);if(rr2>R2)continue;
        const a2=rr2<2?0.85*vis+0.05:(rr2<R2*0.25? (0.85*vis)*(1-rr2/(R2*0.25))+0.35*vis*(rr2/(R2*0.25)) : 0.35*vis*(1-(rr2-R2*0.25)/(R2*0.75)));
        if(a2>0.01)put(sx+dx,sy+dy,rr2<R2*0.25?[255,236,200]:[255,180,110],a2);}
      const SR=13+6*vis;
      for(let dy=-SR;dy<=SR;dy++)for(let dx=-SR;dx<=SR;dx++)if(dx*dx+dy*dy<=SR*SR)put(sx+dx,sy+dy,[255,246,224],0.55+0.45*vis);}
    const gdx=wrap(GAZ-g.player.yaw);
    if(Math.abs(gdx)<1.75){const gx=W*0.5+gdx/1.25*W*0.62, gy=hor-GEL*H*0.9, gr=120;
      for(let dy=-gr;dy<=gr;dy++)for(let dx=-gr;dx<=gr;dx++){const rr3=Math.sqrt(dx*dx+dy*dy);if(rr3>gr)continue;
        const t4=rr3/gr; const cG=t4<0.7?mix([34,48,74],[16,26,44],t4/0.7):mix([16,26,44],[6,11,22],(t4-0.7)/0.3);
        put(gx+dx,gy+dy,cG,1);}}
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
paint([-4,12.62,9.5, 0.13, 0.42, 5], '/tmp/shot_dome'+SUF+'.png', 'erebus');
paint([40,1.62,3.4, -Math.PI/2-0.2, -0.07, undefined, 1170], '/tmp/shot_empire_dusk'+SUF+'.png', 'empire');
paint([281,1.35,-1.5, Math.PI/2+0.05, 0.02, undefined, 1172], '/tmp/shot_empire_sign'+SUF+'.png', 'empire');
paint([21,7.48,0.2, Math.PI/2, 0.02, 120], '/tmp/shot_epang_skyway'+SUF+'.png', 'epang');
paint([40.5,1.62,6.8, -2.0, 0.06, 204], '/tmp/shot_epang_treasury'+SUF+'.png', 'epang');
paint([-19.5,1.62,4.2, -Math.PI/2, 0.04, 30], '/tmp/shot_epang_getai'+SUF+'.png', 'epang');
paint([40,1.62,3.4, -Math.PI/2-0.2, -0.07, undefined, 1258], '/tmp/shot_empire_night'+SUF+'.png', 'empire');
paint([742,1.5,3.0, Math.PI/2-0.12, -0.16, undefined, 1256], '/tmp/shot_empire_wire'+SUF+'.png', 'empire');
paint([21.69,1.62,43.98, 4.254, 0.02, undefined, 10], '/tmp/shot_mobil_vista'+SUF+'.png', 'mobil ave');
paint([5.31,1.62,50.56, 7.749, 0.10, undefined, 10], '/tmp/shot_mobil_sign'+SUF+'.png', 'mobil ave');
paint([18.69,1.62,45.12, 4.320, 0.02, undefined, 29], '/tmp/shot_mobil_train'+SUF+'.png', 'mobil ave');
