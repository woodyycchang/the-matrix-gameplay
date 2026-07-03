'use strict';
// the-matrix-gameplay — node/parser.js
// Operator grammar. Scene names come from the construct/ registry: adding a
// scene file with aliases wires it in here with no parser edits.

function buildParser(registry) {
  const aliases = new Map();
  for (const id of Object.keys(registry)) {
    const s = registry[id];
    const names = s.aliases && s.aliases.length ? s.aliases : [id];
    for (const a of names) aliases.set(String(a).toLowerCase(), id);
  }

  function sceneFor(phrase) {
    const p = phrase.trim();
    const bare = p.replace(/^the\s+/, '');
    for (const cand of [p, bare, 'the ' + bare]) {
      if (aliases.has(cand)) return aliases.get(cand);
    }
    return null;
  }

  function parse(input) {
    const t = String(input || '').trim().toLowerCase();
    if (!t) return { type: 'noop' };
    let m;

    if ((m = t.match(/^operator[,:]?\s*(.+)$/))) {
      const p = m[1].trim();
      if (/^(exit|jack out|get me out|door|phone)\b/.test(p)) return { type: 'exit' };
      let mm;
      if ((mm = p.match(/^(?:load|take me to|i need|get me)\s+(.+)$/))) {
        const scene = sceneFor(mm[1]);
        if (scene) return { type: 'load-scene', scene };
        return { type: 'materialize', item: mm[1].trim() };
      }
      const scene = sceneFor(p);
      if (scene) return { type: 'load-scene', scene };
      return { type: 'materialize', item: p };
    }

    if ((m = t.match(/^(east|west|north|south)(?:\s+(\d+))?$/))) {
      return { type: 'move', dir: m[1], n: m[2] ? parseInt(m[2], 10) : 1 };
    }
    if ((m = t.match(/^drop\s+(.+)$/))) return { type: 'drop', item: m[1] };
    if (t === 'look') return { type: 'look' };
    if (t === 'read' || t === 'read wall') return { type: 'read' };
    if (t === 'board' || t === 'board train' || t === 'board the train') return { type: 'board' };
    if ((m = t.match(/^wait(?:\s+(\d+))?$/))) return { type: 'wait', n: m[1] ? parseInt(m[1], 10) : 1 };
    return { type: 'unknown', raw: t };
  }

  return { parse, aliases };
}

module.exports = { buildParser };
