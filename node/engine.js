'use strict';
// the-matrix-gameplay — node/engine.js
// Rules: zero dependencies. World state, movement, objects, effects, glyph field.
// Space is scene-owned: a scene may define canon(x) and images(cx,x0,x1) to shape
// its own coordinate identifications. The engine never assumes a flat plane.

function hash2(seed, x, y) {
  let h = (seed ^ Math.imul(x | 0, 0x9E3779B1) ^ Math.imul(y | 0, 0x85EBCA77)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D);
  h = Math.imul(h ^ (h >>> 12), 0x297A2D39);
  h ^= h >>> 15;
  return h >>> 0;
}

const GLYPHS = ('ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ' + '012345789Z:=*+-<>').split('');

function canonX(scene, x) { return scene.canon ? scene.canon(x) : x; }

function createWorld(scene) {
  return {
    scene,
    tick: 0,
    player: { x: scene.spawn.x, y: scene.spawn.y },
    objects: new Map(),
    effects: [],
    nextId: 1,
    log: [],
  };
}

function say(world, line) { world.log.push(line); }

function tileAt(world, x, y) { return world.scene.tileAt(canonX(world.scene, x), y); }

function walkable(world, x, y) {
  const t = tileAt(world, x, y);
  if (!t || !t.walk) return false;
  if (world.scene.blocked && world.scene.blocked(world, canonX(world.scene, x), y)) return false;
  return true;
}

// Tickless. The game loop owns time; the engine only owns space.
function movePlayer(world, dx, dy) {
  const nx = world.player.x + dx, ny = world.player.y + dy;
  if (walkable(world, nx, ny)) { world.player.x = nx; world.player.y = ny; return true; }
  return false;
}

function spawnObject(world, name, glyph, x, y) {
  const id = world.nextId++;
  const o = { id, name, glyph, x: canonX(world.scene, x), y };
  world.objects.set(id, o);
  return o;
}

function objectsAt(world, x, y) {
  const cx = canonX(world.scene, x);
  const res = [];
  for (const o of world.objects.values()) if (o.x === cx && o.y === y) res.push(o);
  return res;
}

function addEffect(world, e) { world.effects.push(Object.assign({ ttl: 1 }, e)); }

// Code-vision field: a pure function of the CANONICAL cell. Whatever the scene
// identifies, the field identifies — continuity across any join is structural.
function glyphAt(world, x, y) {
  const cx = canonX(world.scene, x);
  const h = hash2(world.scene.seed >>> 0, cx, y);
  return GLYPHS[h % GLYPHS.length];
}

function tickWorld(world, n) {
  const steps = n == null ? 1 : n;
  for (let i = 0; i < steps; i++) {
    world.tick++;
    if (world.scene.onTick) world.scene.onTick(world);
    world.effects = world.effects.filter(e => (--e.ttl) > 0);
  }
}

module.exports = {
  hash2, GLYPHS, canonX, createWorld, say, tileAt, walkable,
  movePlayer, spawnObject, objectsAt, addEffect, glyphAt, tickWorld,
};
