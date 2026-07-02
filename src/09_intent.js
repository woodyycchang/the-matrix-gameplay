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
  var PRE = { query: '', anchor: '' };   // optional model-specific prefixes (e.g. bge)
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
    configure: function (embed, prefixes) {
      embedFn = embed;
      PRE = { query: (prefixes && prefixes.query) || '', anchor: (prefixes && prefixes.anchor) || '' };
      anchorVecs = null;
      var probe = embedFn('probe');
      if (probe && typeof probe.then === 'function') {
        var seq = probe.then(function () { return []; });
        INTENTS.forEach(function (it) {
          it.anchors.forEach(function (a) {
            seq = seq.then(function (acc) {
              return Promise.resolve(embedFn(PRE.anchor + a)).then(function (v) { acc.push({ word: it.word, vec: v }); return acc; });
            });
          });
        });
        return seq.then(function (acc) { anchorVecs = acc; return true; });
      }
      var acc = [];
      INTENTS.forEach(function (it) { it.anchors.forEach(function (a) { acc.push({ word: it.word, vec: embedFn(PRE.anchor + a) }); }); });
      anchorVecs = acc;
      return Promise.resolve(true);
    },

    // sync mirrors (valid only with a sync embedder; used by the headless tests)
    classifySync: function (text) {
      if (!I.ready()) return null;
      var v = embedFn(PRE.query + String(text || ''));
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
      return Promise.resolve(embedFn(PRE.query + String(text || ''))).then(function (v) {
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

  // ============ generative layer (chat LLM) ============
  // The browser loads a small open-source instruct model; we open its context with a
  // few-shot prompt describing the game, then every user line is answered by the model.
  // Whatever the model SAYs is what we display — no templates. These two functions are
  // pure (string in/out) so the whole contract is testable headless.
  var DESIGNATED = {};
  INTENTS.forEach(function (it) { DESIGNATED[it.word] = true; });
  I.designatedList = INTENTS.map(function (it) { return it.word; });
  I.designated = DESIGNATED;

  I.buildChatPrompt = function () {
    var words = INTENTS.map(function (it) { return it.word; }).join(', ');
    var sys = 'You are the Operator of THE CONSTRUCT, a white loading-space. ' +
      'The ONLY designated programs and objects are: ' + words + '. ' +
      'For every user request reply with EXACTLY one line in this format: ' +
      'WORD: <one designated word, or none> | SAY: <one short line in your dry, calm operator voice>. ' +
      'If the request does not belong to the designated list, use WORD: none and refuse in your own words. ' +
      'Greetings and small talk also get WORD: none \u2014 answer them in character, briefly, and invite a request. ' +
      'Never invent a word outside the list. Never write anything except that one line. ' +
      'The example replies below show FORMAT and TONE only \u2014 never repeat any example sentence word-for-word; phrase every SAY fresh.';
    return [
      { role: 'system', content: sys },
      { role: 'user', content: 'something to sit on' },
      { role: 'assistant', content: 'WORD: chair | SAY: One chair, folded out of the white. Sit.' },
      { role: 'user', content: 'motor' },
      { role: 'assistant', content: 'WORD: motorcycle | SAY: Two wheels, compiling.' },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'WORD: none | SAY: Operator. Line is open \u2014 what do you need?' },
      { role: 'user', content: 'hey there' },
      { role: 'assistant', content: 'WORD: none | SAY: I hear you. Name a program, I will load it.' },
      { role: 'user', content: 'i want to learn how to fight' },
      { role: 'assistant', content: 'WORD: dojo | SAY: Then step onto the mat. Loading the dojo.' },
      { role: 'user', content: 'motor' },
      { role: 'assistant', content: 'WORD: motorcycle | SAY: Two wheels, compiled. Swing a leg over.' },
      { role: 'user', content: 'a fast ride through the night' },
      { role: 'assistant', content: 'WORD: neon | SAY: The neon mile is endless. Throttle up.' },
      { role: 'user', content: 'show me what this world really is' },
      { role: 'assistant', content: 'WORD: code | SAY: Look again. It was always rain.' },
      { role: 'user', content: 'a purple elephant that does my taxes' },
      { role: 'assistant', content: 'WORD: none | SAY: The library carries no such program. Ask for what exists.' },
      { role: 'user', content: 'wipe it all' },
      { role: 'assistant', content: 'WORD: clear | SAY: Back to white.' }
    ];
  };

  // parse the model's reply into { word: designated|null, say: string }.
  // Tolerant of case/spacing; hard-validates the word against the designated list;
  // if the model ignored the format, we still show ITS text (sanitized) as the say.

  // deterministic rescue: a tiny model sometimes flubs the WORD line. Scan text for a
  // designated word by exact / prefix (>=4 chars) / edit-distance-1 (>=5 chars) match.
  function editDist(a, b) {                   // full Levenshtein
    var la = a.length, lb = b.length, d = [];
    for (var i = 0; i <= la; i++) { d[i] = [i]; }
    for (var j = 0; j <= lb; j++) { d[0][j] = j; }
    for (i = 1; i <= la; i++) for (j = 1; j <= lb; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    }
    return d[la][lb];
  }
  function transposed(a, b) {                 // one adjacent swap apart? (chiar<->chair)
    if (a.length !== b.length) return false;
    var diff = [];
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) { diff.push(i); if (diff.length > 2) return false; }
    return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
  }
  function fuzzy(tk, w) {                      // typo-close for >=5-char tokens
    return editDist(tk, w) <= 1 || transposed(tk, w);
  }
  I.rescueWord = function (userText) {
    // USER text ONLY. The model's reply is deliberately not scanned: a designated
    // word appearing in HIS sentence ('try the dojo') is a mention, not an intent -
    // scanning it teleported players who merely said hello.
    var toks = String(userText || '').toLowerCase().split(/[^a-z]+/);
    for (var ti = 0; ti < toks.length; ti++) {
      var tk = toks[ti];
      if (tk.length < 3) continue;
      for (var wi = 0; wi < INTENTS.length; wi++) {
        var w = INTENTS[wi].word;
        if (tk === w) return w;
        if (tk.length >= 4 && w.indexOf(tk) === 0) return w;         // 'motor' -> motorcycle
        if (tk.length >= 5 && fuzzy(tk, w)) return w;                 // 'katan' / 'chiar'
      }
    }
    return null;
  };


  // Deterministic lexical rescue: partial words map to designated words without
  // waking the model. 'motor' is a prefix of 'motorcycle'; 'chairs' starts with
  // 'chair'. Classification wants determinism - generation can stay creative.

  // Levenshtein <= 1 (one insert/delete/substitution/transposition tolerance)
  function near1(a, b) {
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (la === lb) {                              // adjacent transposition (chiar <-> chair)
      var diff = [];
      for (var k = 0; k < la; k++) if (a[k] !== b[k]) diff.push(k);
      if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return true;
    }
    if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, edits = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    if (i < la || j < lb) edits++;
    return edits <= 1;
  }
  // (legacy two-source rescueWord removed - the model's reply is never a dispatch source)

  I.lexicalGuess = function (text) {
    var toks = String(text || '').toLowerCase().split(/[^a-z]+/).filter(function (t) { return t.length >= 4; });
    var best = null, bestLen = 0;
    for (var d = 0; d < I.designatedList.length; d++) {
      var w = I.designatedList[d];
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (w === t) return w;                                  // exact
        if ((w.indexOf(t) === 0 || t.indexOf(w) === 0) && t.length > bestLen) { best = w; bestLen = t.length; }
      }
    }
    return best;
  };

  I.parseReply = function (raw) {
    raw = String(raw == null ? '' : raw);
    raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, ' ');   // closed thinking blocks
    raw = raw.replace(/^[\s\S]*?<\/think>/i, ' ');            // reply that starts mid-think
    raw = raw.replace(/<think>[\s\S]*$/i, ' ');                // unclosed think eats the rest

    var text = String(raw == null ? '' : raw);
    var wm = text.match(/word\s*[:=]\s*([a-z]+)/i);
    var sm = text.match(/say\s*[:=]\s*([^\n]*)/i);
    var word = wm ? wm[1].toLowerCase() : null;
    if (!word || word === 'none' || !DESIGNATED[word]) word = null;
    var say = sm ? sm[1] : text;
    say = say.replace(/word\s*[:=][^|\n]*\|?/ig, '').replace(/\s+/g, ' ').trim();
    if (say.length > 160) say = say.slice(0, 157) + '...';
    if (!say) {
      // The model spoke plain prose (no SAY: field) - show HIS words, not a canned line.
      var plain = text.replace(/word\s*[:=]\s*[a-z]+/ig, ' ').replace(/\s+/g, ' ').trim();
      if (plain.length > 220) plain = plain.slice(0, 217) + '\u2026';
      // word-without-say: stay SILENT here - the scene announces itself ('Sparring program loaded.'),
      // and 'Loading dojo.' + that line was the same news twice.
      say = plain || (word ? '' : 'The library is silent on that one.');
    }
    return { word: word, say: say };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
