'use strict';
// the-matrix-gameplay — node/game.js
// Glue: parse input -> intent -> world mutation. Scenes may veto operator
// intents through onOperatorRequest; that is the whole trick of Mobil Ave.

const E = require('./engine');
const { buildParser } = require('./parser');
const registry = require('../construct');

const DIRS = { east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] };

class Game {
  constructor(startScene) {
    this.registry = registry;
    this.parser = buildParser(registry);
    this.world = null;
    this.loadScene(startScene || 'void');
  }

  loadScene(id) {
    const scene = this.registry[id];
    if (!scene) throw new Error('unknown scene: ' + id);
    this.world = E.createWorld(scene);
    E.say(this.world, scene.enterText || ('Loaded: ' + scene.name));
    return this.world;
  }

  execute(input) {
    const w = this.world;
    const s = w.scene;
    const intent = this.parser.parse(input);
    const before = w.log.length;

    switch (intent.type) {
      case 'load-scene':
      case 'materialize':
      case 'exit': {
        if (s.onOperatorRequest) {
          const verdict = s.onOperatorRequest(w, intent);
          if (verdict && verdict.refused) { E.tickWorld(w); break; }
        }
        if (intent.type === 'load-scene') { this.loadScene(intent.scene); break; }
        if (intent.type === 'exit') {
          this.loadScene('void');
          E.say(this.world, 'The line picks up; the world drains to white. Back in the loading space.');
          break;
        }
        const px = w.player.x + 1, py = w.player.y;
        E.spawnObject(w, 'pedestal', '╥', px, py);
        E.spawnObject(w, intent.item, '†', px, py);
        E.say(w, 'The request compiles. A pedestal rises holding: ' + intent.item + '.');
        E.tickWorld(w);
        break;
      }
      case 'move': {
        const d = DIRS[intent.dir];
        let moved = 0;
        for (let i = 0; i < intent.n; i++) {
          if (!E.movePlayer(w, d[0], d[1])) break;
          moved++;
          E.tickWorld(w);
        }
        E.say(w, 'Walked ' + intent.dir + ' ' + moved + '.');
        break;
      }
      case 'drop': {
        const o = E.spawnObject(w, intent.item, '◆', w.player.x, w.player.y);
        E.say(w, 'Dropped ' + intent.item + ' at world (' + o.x + ',' + o.y + ').');
        E.tickWorld(w);
        break;
      }
      case 'look': {
        const os = E.objectsAt(w, w.player.x, w.player.y);
        E.say(w, os.length ? 'Here: ' + os.map(o => o.name).join(', ') + '.' : 'Nothing here.');
        break;
      }
      case 'read': {
        E.say(w, (s.readWall && s.readWall(w)) || 'Blank surfaces, nothing written.');
        break;
      }
      case 'board': {
        if (s.tryBoard && s.tryBoard(w)) {
          this.loadScene('void');
          E.say(this.world, 'Rails hum, then vanish. White floods in: the loading space again.');
        } else if (!s.tryBoard) {
          E.say(w, 'There is nothing here to board.');
        }
        break;
      }
      case 'wait': {
        E.tickWorld(w, intent.n);
        E.say(w, 'Waited ' + intent.n + '.');
        break;
      }
      default:
        E.say(w, 'Nothing answers.');
    }

    const lines = (this.world === w) ? this.world.log.slice(before) : this.world.log.slice(0);
    return { intent, lines };
  }
}

module.exports = { Game };
