const THREE=require('three');const createGL=require('gl');const {createCanvas}=require('canvas');
const W=320,H=180;const ctx=createGL(W,H,{preserveDrawingBuffer:true,antialias:true});
const fake={width:W,height:H,style:{},addEventListener(){},removeEventListener(){},getContext:()=>ctx};
ctx.canvas=fake;const r=new THREE.WebGLRenderer({canvas:fake,context:ctx});r.setSize(W,H,false);r.shadowMap.enabled=true;
const s=new THREE.Scene();s.background=new THREE.Color(0x101820);
const cam=new THREE.PerspectiveCamera(60,W/H,0.1,100);cam.position.set(2,2,3);cam.lookAt(0,0,0);
const c=createCanvas(64,64);const g=c.getContext('2d');g.fillStyle='#cc9922';g.fillRect(0,0,64,64);g.fillStyle='#fff';g.fillRect(8,8,20,20);
const id=g.getImageData(0,0,64,64);const tex=new THREE.DataTexture(new Uint8Array(id.data),64,64,THREE.RGBAFormat);tex.needsUpdate=true;
const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({map:tex}));m.castShadow=true;s.add(m);
const fl=new THREE.Mesh(new THREE.PlaneGeometry(8,8).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x335533}));fl.position.y=-0.5;fl.receiveShadow=true;s.add(fl);
s.add(new THREE.AmbientLight(0x404060));const d=new THREE.DirectionalLight(0xffffff,1);d.position.set(3,5,2);d.castShadow=true;s.add(d);
r.render(s,cam);
const px=new Uint8Array(W*H*4);ctx.readPixels(0,0,W,H,ctx.RGBA,ctx.UNSIGNED_BYTE,px);
const {PNG}=require('pngjs');const png=new PNG({width:W,height:H});
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=((H-1-y)*W+x)*4,di=(y*W+x)*4;for(let k=0;k<4;k++)png.data[di+k]=px[si+k];}
require('fs').writeFileSync('shots/_smoke.png',PNG.sync.write(png));console.log('SMOKE OK calls=',r.info.render.calls);
