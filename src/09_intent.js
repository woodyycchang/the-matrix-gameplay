/* THE CONSTRUCT — 09_intent.js — neural intent fallback (open-source embeddings)
   Maps free-form requests onto the DESIGNATED WORDS when the regex parser shrugs.
   Pure logic here (cosine + anchors + pluggable embed). The browser lazily loads an
   open-source sentence-embedding model (MiniLM via transformers.js) and plugs it in;
   headless tests plug a mock. Regex always wins first — this only handles 'unknown'. */
(function (G) {
  'use strict';
  var C = G.C;

  // The designated vocabulary: each intent = the exact word the parser already knows,
  // plus anchor phrasings that describe what a person might actually say.
  var INTENTS = [
    { word: 'weapons', anchors: ['guns and rifles', 'an armory full of weapons', 'something to shoot with', 'firearms racks'] },
    { word: 'dojo', anchors: ['a place to train and fight', 'martial arts sparring room', 'practice kung fu', 'a fighting dojo'] },
    { word: 'rooftop', anchors: ['jump between rooftops', 'a leap across buildings', 'the jump program', 'high ledges to leap'] },
    { word: 'city', anchors: ['a crowded street with people', 'pedestrians at lunch hour', 'busy downtown crowd', 'a plaza full of walkers'] },
    { word: 'neon', anchors: ['ride a motorcycle down a neon street', 'cyberpunk highway at night', 'an endless glowing road to speed on', 'night ride through neon city'] },
    { word: 'clear', anchors: ['remove everything', 'empty the room', 'reset the world', 'wipe it all away'] },
    { word: 'code', anchors: ['see the world as code', 'matrix vision of falling glyphs', 'show me the digital rain', 'reveal the simulation'] },
    { word: 'motorcycle', anchors: ['a bike to ride', 'give me a motorcycle', 'two wheels to drive fast', 'a motorbike'] },
    { word: 'katana', anchors: ['a sword', 'a sharp blade to swing', 'give me a katana', 'something to slash with'] },
    { word: 'chair', anchors: ['something to sit on', 'a seat', 'a place to rest'] },
    { word: 'table', anchors: ['a table to put things on', 'a desk surface'] },
    { word: 'tv', anchors: ['a screen to watch', 'a television', 'a monitor'] },
    { word: 'lamp', anchors: ['a light to see by', 'a lamp', 'some lighting'] },
    { word: 'tree', anchors: ['a tree', 'some greenery', 'a plant'] },
    { word: 'car', anchors: ['a car', 'an automobile', 'a parked vehicle'] },
    { word: 'mirror', anchors: ['a mirror to look into', 'see my reflection'] },
    { word: 'dummy', anchors: ['a training dummy to hit', 'a practice target for strikes'] },
    { word: 'booth', anchors: ['a phone booth', 'a telephone to answer', 'a payphone'] }
  ];

  var embedFn = null;       // async (text) -> Float32Array, plugged at runtime
  var anchorVecs = null;    // [{word, vec}]
  var THRESH = 0.42;        // below this similarity, stay 'unknown' (don't guess wildly)

  function dot(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  function norm(a) { return Math.sqrt(dot(a, a)) || 1; }
  function cosine(a, b) { return dot(a, b) / (norm(a) * norm(b)); }

  var I = C.intent = {
    ready: function () { return !!(embedFn && anchorVecs); },
    intents: INTENTS,
    _cosine: cosine,
    threshold: THRESH,

    // plug an embedder (real model in browser, mock in tests), then index the anchors.
    // A SYNC embedder (returns a vector directly) indexes immediately and unlocks the
    // *Sync methods below; an async one (returns a Promise) indexes via the chain.
    configure: function (embed) {
      embedFn = embed;
      anchorVecs = null;
      var probe = embedFn('probe');
      if (probe && typeof probe.then === 'function') {
        var seq = probe.then(function () { return []; });
        INTENTS.forEach(function (it) {
          it.anchors.forEach(function (a) {
            seq = seq.then(function (acc) {
              return Promise.resolve(embedFn(a)).then(function (v) { acc.push({ word: it.word, vec: v }); return acc; });
            });
          });
        });
        return seq.then(function (acc) { anchorVecs = acc; return true; });
      }
      var acc = [];
      INTENTS.forEach(function (it) { it.anchors.forEach(function (a) { acc.push({ word: it.word, vec: embedFn(a) }); }); });
      anchorVecs = acc;
      return Promise.resolve(true);
    },

    // sync mirrors (valid only with a sync embedder; used by the headless tests)
    classifySync: function (text) {
      if (!I.ready()) return null;
      var v = embedFn(String(text || ''));
      var best = null, bestS = -1;
      for (var i = 0; i < anchorVecs.length; i++) {
        var s = cosine(v, anchorVecs[i].vec);
        if (s > bestS) { bestS = s; best = anchorVecs[i].word; }
      }
      return bestS >= THRESH ? { word: best, score: bestS } : null;
    },
    routeSync: function (text) {
      var p = C.parse(text);
      if (p.type !== 'unknown' || !I.ready()) return { action: p, via: 'regex' };
      var hit = I.classifySync(text);
      if (!hit) return { action: p, via: 'regex' };
      return { action: C.parse(hit.word), via: 'neural', word: hit.word, score: hit.score };
    },

    // classify free text -> { word, score } or null when not confident
    classify: function (text) {
      if (!I.ready()) return Promise.resolve(null);
      return Promise.resolve(embedFn(String(text || ''))).then(function (v) {
        var best = null, bestS = -1;
        for (var i = 0; i < anchorVecs.length; i++) {
          var s = cosine(v, anchorVecs[i].vec);
          if (s > bestS) { bestS = s; best = anchorVecs[i].word; }
        }
        return bestS >= THRESH ? { word: best, score: bestS } : null;
      });
    },

    // the routing rule, pure and testable:
    // regex parser first; only an 'unknown' consults the neural layer.
    route: function (text) {
      var p = C.parse(text);
      if (p.type !== 'unknown' || !I.ready()) return Promise.resolve({ action: p, via: 'regex' });
      return I.classify(text).then(function (hit) {
        if (!hit) return { action: p, via: 'regex' };
        var p2 = C.parse(hit.word);
        p2 && (p2._neural = { from: text, score: hit.score });
        return { action: p2, via: 'neural', word: hit.word, score: hit.score };
      });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
