const fs=require('fs');
const {PNG}=(function(){try{return require('pngjs')}catch(e){return require('/home/claude/rigb/node_modules/pngjs')}})();
for (const f of ['00_math','01_glyph','02_mesh','03_props','04_scenes','05_engine','06_game','07_audio']) require(__dirname+'/../src/'+f+'.js');
const C=globalThis.C;
const g=new C.Game(); g.update({},0.2); g.request('erebus');
for(let i=0;i<50;i++) g.update({},1/30);
const W=960,H=540;
function hex2(c){const m=/^#?([0-9a-f]{6})/i.exec(c||'#000000');const v=parseInt(m?m[1]:'000000',16);return [v>>16,(v>>8)&255,v&255];}
function paint(pose,out){
  g.player.pos=[pose[0],pose[1],pose[2]]; g.player.yaw=pose[3]; g.player.pitch=pose[4]; g.player.vel=[0,0,0];
  g.update({},1/60);
  const ops=C.render(g,W,H,g.time);
  const png=new PNG({width:W,height:H});
  const bg=hex2('#02030a');
  for(let i=0;i<W*H;i++){png.data[i*4]=bg[0];png.data[i*4+1]=bg[1];png.data[i*4+2]=bg[2];png.data[i*4+3]=255;}
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
paint([4,0.02,30, -0.35, 0.06], '/tmp/shot_dock'+SUF+'.png');
paint([0,0.02,10.5, 0, 0.10], '/tmp/shot_rotunda'+SUF+'.png');
paint([0,-6.9,32.5, 0, 0.05], '/tmp/shot_reactor'+SUF+'.png');
paint([0,0.02,-19.5, 0, 0.04], '/tmp/shot_bridge'+SUF+'.png');
paint([-4,12.62,9.5, 0.6, 0.30], '/tmp/shot_dome'+SUF+'.png');
