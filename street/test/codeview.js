'use strict';
/* test/codeview.js — Matrix code-view toggle (headless logic) */
// self-contained loader (the original stubs.js is kept byte-pristine and boots the ORIGINAL build)
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
function boot(opts){
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const dom = new JSDOM(html.replace(/<script src="https:[^"]*"><\/script>/, ''), { pretendToBeVisual:true, runScripts:'outside-only', url:'https://localhost/' });
  const window = dom.window, document = window.document;
  const fake2d = () => new Proxy({ canvas:{} }, { get(t,p){ if(typeof p!=='string')return undefined; if(p==='canvas')return t.canvas; if(p==='measureText')return ()=>({width:10}); if(p==='createLinearGradient'||p==='createRadialGradient'||p==='createPattern')return ()=>({addColorStop(){}}); if(p==='getImageData')return (x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}); return ()=>{}; }, set(){return true;}, has(){return true;} });
  window.HTMLCanvasElement.prototype.getContext = function(type){ return type==='2d' ? fake2d() : null; };
  const THREE = require('three');
  class FakeRenderer { constructor(){ this.domElement=document.createElement('canvas'); this.shadowMap={enabled:false,type:0}; this.outputEncoding=3000; } setPixelRatio(){} setSize(){} setClearColor(){} render(){} dispose(){} }
  THREE.WebGLRenderer = FakeRenderer; window.THREE = THREE; window.__HEADLESS__ = true;
  const m = html.match(/<script id="game">([\s\S]*?)<\/script>/);
  if (opts && typeof opts.preBoot==='function') opts.preBoot(window);
  const run = new Function('window','document','navigator','performance','requestAnimationFrame', m[1]);
  run(window, document, window.navigator, (typeof performance!=='undefined'?performance:{now:()=>Date.now()}), ()=>{});
  if(!window.GAME) throw new Error('window.GAME was not exposed');
  return { GAME: window.GAME, window, document };
}
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.error('  FAIL ' + m); } }

const { GAME, window } = boot({ preBoot(w) { w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} })); } });

console.log('== matrix code view ==');
ok(!!window.CodeView, 'CodeView API exposed');
ok(typeof window.CodeView.toggle === 'function', 'toggle is callable');
ok(window.CodeView.isOn() === false, 'starts in normal (neon) view');

// toggle ON
const on = window.CodeView.toggle();
ok(on === true, 'toggle returns true (code view on)');
ok(window.CodeView.isOn() === true, 'isOn reflects code view');
ok(GAME.state.codeView === true, 'state.codeView synced on');

// tick must be safe to call repeatedly while on (no rain object headless, must not throw)
let threw = false;
try { for (let i = 0; i < 120; i++) window.CodeView.tick(1 / 60); } catch (e) { threw = true; console.error(e.message); }
ok(!threw, 'tick is safe across 120 frames while on');

// toggle OFF
const off = window.CodeView.toggle();
ok(off === false, 'toggle returns false (back to neon)');
ok(window.CodeView.isOn() === false, 'isOn back to normal');
ok(GAME.state.codeView === false, 'state.codeView synced off');

// gameplay still advances after toggling both ways (no side effects on the sim)
let frames = 0, ranok = true;
try { for (let i = 0; i < 300; i++) { if (GAME.step) GAME.step(1 / 60); frames++; } } catch (e) { ranok = false; console.error(e.message); }
ok(ranok && frames === 300, 'sim runs 300 frames after toggling (no gameplay side effects)');

// rapid toggling doesn't corrupt state
threw = false;
try { for (let i = 0; i < 20; i++) window.CodeView.toggle(); } catch (e) { threw = true; }
ok(!threw, 'rapid toggling is stable');
ok(window.CodeView.isOn() === false, 'even number of toggles ends in normal view');

// ---- material-level proof that the world actually re-skins (headless, via _sample) ----
console.log('\n== code view actually re-skins the world ==');
for (let i = 0; i < 60; i++) if (GAME.step) GAME.step(1 / 60); // let world meshes exist
const neon = window.CodeView._sample();
ok(neon && neon.total > 50, 'world has many materials (' + (neon ? neon.total : 0) + ')');
ok(neon.greenish < neon.total * 0.2, 'neon view is mostly NOT green (' + neon.greenish + '/' + neon.total + ')');

window.CodeView.toggle(); // ON
const code = window.CodeView._sample();
ok(code.greenish >= code.total * 0.9, 'code view turns ~all materials green (' + code.greenish + '/' + code.total + ')');
ok(code.fogHex !== neon.fogHex, 'fog changes in code view (' + (neon.fogHex && neon.fogHex.toString(16)) + ' -> ' + (code.fogHex && code.fogHex.toString(16)) + ')');

window.CodeView.toggle(); // OFF
const back = window.CodeView._sample();
ok(back.greenish === neon.greenish, 'restore returns greenish count to original');
ok(JSON.stringify(back.sample) === JSON.stringify(neon.sample), 'material colors restored exactly (reversible)');

console.log('\nPASS ' + pass + '  FAIL ' + fail);
if (fail) process.exit(1);
