/* THE ORANGE EMPIRE — Los Angeles, 1937. A simulation in three seams.
   Single-file browser game. Three.js r128. All assets procedural. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory; }
  else { root.OrangeEmpire = factory(root.THREE, root.document, root.window); root.OrangeEmpire._auto = true; }
})(typeof self !== 'undefined' ? self : this, function (THREE, DOC, WIN, ENVOPT) {
'use strict';
const ENV = Object.assign({
  headless: typeof window === 'undefined',
  makeCanvas: null,            // headless: (w,h)=>node-canvas
  glContext: null,             // headless: webgl context
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
}, ENVOPT || {});

const CFG = {
  // ---- world geometry (meters) ----
  MAIN_Z: 0, ROAD_HW: 6, WALK_IN: 6, WALK_OUT: 9.4,
  CROSS_X: [-60, 60], CROSS_HW: 5,
  PALM_Z: 64, PALM_HW: 5,
  EAST_X0: 160, EAST_X1: 858,
  // ---- decay rings (distance from origin) ----
  D_DESAT0: 460, D_DESAT1: 660,
  D_DARK0: 600, D_DARK1: 830,
  D_GRID0: 615, D_GRID1: 800,
  D_RISE0: 575, D_RISE1: 855,
  D_TREEWIRE: 665,
  D_GROUND_END: 1130,
  D_BOUNDARY: 965, D_WALL: 1000,
  // ---- time ----
  MIN_PER_SEC: 0.5,            // 1 game-minute = 2 real seconds
  START_MIN: 19 * 60 + 24,     // 7:24 PM, Friday June 11 1937
  // ---- player ----
  EYE: 1.62, WALK: 2.3, RUN: 4.8, BODY_R: 0.35,
  // ---- car ----
  CAR_VMAX: 26, CAR_VREV: -6.5, CAR_ACC: 9.5, CAR_BRAKE: 16, CAR_DRAG: 0.35, CAR_ROLL: 0.9,
  CAR_STEER: 2.0, CAR_LEN: 4.4, CAR_W: 1.78,
};

const FLAGS = {
  started: false, metGus: false, gusStage: 0, hasMatchbook: false, noteRead: false,
  boundaryReached: false, returned: false, epilogueDone: false, enteredBarOnce: false,
  knockedBarricade: 0, visitedShack: false, drank: 0, radioNumbers: false,
  pellWitness: 0, barMusicTime: 0, charlieTalks: 0, twinsSeen: false, paperRead: false,
};

const G = {
  THREE, ENV, CFG, FLAGS,
  state: 'TITLE',              // TITLE | PLAY | DIALOG | NOTE | JOURNAL | ENDING | TERMINAL | EPILOGUE | PAUSE
  prevState: 'PLAY',
  gameMin: CFG.START_MIN,      // minutes since 00:00, never wraps for schedules (use mod)
  dayMin: CFG.START_MIN,
  inCar: false, inside: null,  // null | 'bar'
  player: { x: -4, z: -3.4, yaw: Math.PI / 2, pitch: 0, vy: 0 },
  quality: 'high',
  muted: false,
  seams: [], journal: [], objective: 0,
  anim: [],                    // {update(dt,t)} tickers
  barricades: [],
  neonMats: [], nightSwapList: [], lampHeads: [], nightLights: [],
  endingSlow: 1,
  camSnap: false,
  dialogNPC: null, dialogNode: null,
  nearInteract: null,
  debugKeys: {}, debugPressed: {},
  dynamicRoots: [],
  car: null, scene: null, camera: null, renderer: null, amb: null, dir: null,
  ryeGlass: null, gusGrp: null, shackDoor: null, shackBoard: null, starsMat: null, moonMat: null,
  colliders: { boxes: [], circles: [] },     // exterior
  barColliders: { boxes: [], circles: [] },  // interior
  interactables: [],
  toasts: [],
  rng: null,
  edge: 0,                     // 0..1 decay factor at player
  debugLog: [],
};
function dlog(s) { G.debugLog.push(s); if (G.debugLog.length > 400) G.debugLog.shift(); }
