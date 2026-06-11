// test/dom.js — exercises the browser DOM code paths (UI.init + keyboard router)
// under jsdom, with rendering and audio stubbed out.
const { JSDOM } = require('jsdom');
const THREE = require('three');
const { createCanvas } = require('canvas');
const path = require('path');

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log('  ok  ' + m); } else { failed++; console.log('  FAIL ' + m); } };

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'https://example.org/' });
const { window } = dom;
const { document } = window;

const factory = require(path.join(__dirname, '..', 'dist', 'bundle.js'));
// headless:false forces the DOM branch in UI/PLAYER; canvas factory keeps textures working
const OE = factory(THREE, document, window, {
  headless: false,
  makeCanvas: (w, h) => createCanvas(w, h),
  now: () => Date.now(),
});
const { G, FLAGS, UI, PLAYER, DIALOGUE, QUEST, EDGE } = OE;

// textures: jsdom createElement('canvas') has no 2d context — route through node-canvas
// (T.canvasFor uses ENV.makeCanvas only when ENV.headless; patch document.createElement for canvas)
const origCreate = document.createElement.bind(document);
document.createElement = (tag) => {
  if (String(tag).toLowerCase() === 'canvas') return createCanvas(300, 150);
  return origCreate(tag);
};

console.log('\n[ui boots into the dom]');
const fakeCanvas = origCreate('canvas');           // a real jsdom node so appendChild works
fakeCanvas.requestPointerLock = () => {};
UI.init(document.body, fakeCanvas);
PLAYER.init(fakeCanvas);
ok(document.getElementById('oe'), '#oe root mounted');
ok(document.getElementById('oe-title'), 'title screen present');
ok(document.querySelector('#oe style, style'), 'stylesheet injected');
ok(document.getElementById('oe-clock') && document.getElementById('oe-obj'), 'HUD clock + objective present');

console.log('\n[title -> play via Enter]');
const kd = (key) => window.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const cam = new THREE.PerspectiveCamera(66, 16 / 9, 0.1, 100);
const tick = () => { PLAYER.update(1 / 30, cam); UI.update(0.05); };  // j/Escape live in the play loop
const shown = (id) => { const e = document.getElementById(id); return !!e && e.style.display !== 'none' && e.style.display !== ''; };
(async () => {
kd('Enter'); await sleep(320);
ok(FLAGS.started === true, 'Enter starts the game');
ok(G.state === 'PLAY', 'state PLAY after start');

console.log('\n[toast renders]');
UI.toast('Test toast');
UI.update(0.05);
ok(document.getElementById('oe-toasts').textContent.indexOf('Test toast') >= 0, 'toast text in DOM');

console.log('\n[dialog renders + advances by key]');
DIALOGUE.start('porch');
UI.update(0.05);
ok(G.state === 'DIALOG', 'dialog state');
const dlgBox = document.getElementById('oe-dlg');
ok(dlgBox && dlgBox.style.display === 'block', 'dialog box visible');
for (let i = 0; i < 4; i++) UI.update(0.5);                  // typewriter
let guard = 0;
while (G.state === 'DIALOG' && guard++ < 20) { kd(' '); await sleep(60); for (let i = 0; i < 4; i++) UI.update(0.4); }
ok(G.state === 'PLAY', 'dialog dismissed by space (guard=' + guard + ')');

console.log('\n[journal opens and closes]');
kd('j'); tick(); await sleep(320); UI.update(0.05);
ok(G.state === 'JOURNAL', 'journal opens with J');
ok(shown('oe-journal'), 'journal panel visible');
kd('j'); tick(); await sleep(320); UI.update(0.05);
ok(G.state === 'PLAY', 'journal closes');
ok(!shown('oe-journal'), 'journal panel hidden again');

console.log('\n[pause menu]');
kd('Escape'); tick(); await sleep(320); UI.update(0.05);
ok(G.state === 'PAUSE', 'escape pauses');
ok(shown('oe-pause'), 'pause menu visible');
kd('Escape'); tick(); await sleep(320); UI.update(0.05);
ok(G.state === 'PLAY', 'escape resumes');
ok(!shown('oe-pause'), 'pause menu hidden again');

console.log('\n[paper overlay]');
QUEST.readPaper(); await sleep(320); UI.update(0.05);
ok(G.state === 'NOTE', 'paper opens as note state');
ok(shown('oe-news'), 'newspaper visible');
kd('e'); await sleep(320); UI.update(0.05);
ok(G.state === 'PLAY', 'paper closes with E');

console.log('\n[letterbox + ending line + terminal + credits]');
UI.letterbox(true);
ok(document.getElementById('oe').classList.contains('lb'), 'letterbox class applied');
UI.endingLine('The road runs out where the counting starts.');
for (let i = 0; i < 8; i++) UI.update(0.4);
ok(document.getElementById('oe-eline').textContent.length > 10, 'ending line typed into DOM');
G.state = 'TERMINAL';
UI.showTerminal('MERIDIAN CIVIC SYSTEMS\nUNIT 03', ['RETURN TO LOOP', 'END SESSION']);
for (let i = 0; i < 30; i++) UI.update(0.3);
ok(shown('oe-term'), 'terminal visible');
ok(document.getElementById('oe-term').textContent.indexOf('MERIDIAN') >= 0, 'terminal text typed');
const opts = document.querySelectorAll('#oe-term .opt');
ok(opts.length === 2, 'two terminal options rendered');
UI.hideTerminal();
G.state = 'CREDITS';
UI.showCredits();
for (let i = 0; i < 10; i++) UI.update(0.5);
ok(shown('oe-cred'), 'credits visible');
ok(document.getElementById('oe-cred').textContent.indexOf('PLAY AGAIN') >= 0, 'play again offered');

console.log('\ndom: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
