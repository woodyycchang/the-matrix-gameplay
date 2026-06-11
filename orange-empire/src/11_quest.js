// ============ 11 quest — seams, objectives, doors, notes ============
const QUEST = (() => {
  const OBJ = [
    'Evening. Find a drink — The Blue Pacific is open on Main.',
    'Talk to the bartender.',
    'Something is off about this town. Catch it twice more.',
    'Ask Gus about the things you have seen.',
    'Find the Whitmore packing shack on the east grove road.',
    'Drive east. Past every sign. Don\u2019t stop.',
    'Ask Gus how green it was.',
    'Friday, June 11th, 1937. It will be Friday again tomorrow.',
  ];

  const NOTE_TEXT = [
    'If you found this, you noticed. Most don\u2019t.',
    '',
    'Watch Mrs. Pell at a quarter past. Any hour. Every hour.',
    'Charlie\u2019s paper is always fresh. It is always Friday.',
    'The record at the Pacific stumbles on bar seven. Count.',
    '',
    'I measured the rest of it. It isn\u2019t miles \u2014 it\u2019s a number:',
    'nine sixty-five.',
    '',
    'The groves get thin where the world runs out of ideas.',
    'Drive east. Past every sign. Don\u2019t stop.',
    '',
    '\u2014 J.W., June 11',
  ].join('\n');

  function hasSeam(id) { return G.seams.some(s => s.id === id); }

  function addSeam(id, title, text) {
    if (hasSeam(id)) return false;
    G.seams.push({ id, title, text, at: fmtClock(G.dayMin) });
    G.journal.push({ kind: 'seam', title, text, at: fmtClock(G.dayMin) });
    UI.toast('NOTICED \u2014 ' + title, 'seam');
    if (AUDIO.sting) AUDIO.sting();
    dlog('seam:' + id);
    checkObjectives();
    return true;
  }

  function note(title, text) {
    G.journal.push({ kind: 'note', title, text, at: fmtClock(G.dayMin) });
  }

  function checkObjectives() {
    let o = 0;
    if (FLAGS.enteredBarOnce) o = 1;
    if (FLAGS.metGus) o = 2;
    if (FLAGS.metGus && G.seams.length >= 3) o = 3;
    if (FLAGS.gusStage >= 2) o = 4;
    if (FLAGS.noteRead) o = 5;
    if (FLAGS.boundaryReached) o = 6;
    if (FLAGS.epilogueDone) o = 7;
    if (o !== G.objective) {
      G.objective = o;
      UI.toast(OBJ[o], 'obj');
      dlog('objective:' + o);
    }
  }

  // ---- seam helpers wired from dialogue/world --------------------------------
  function seamUsual() {
    addSeam('THE_USUAL', 'The Usual',
      'You never told Gus your drink. The rye was poured before your hat was off. He knew. He always knows.');
  }
  function seamPaper() {
    addSeam('EVERGREEN', 'Evergreen',
      'Charlie swears the Examiner is fresh every morning. It is the same paper. Friday, June 11th, 1937. Every column. Every smudge.');
  }

  // ---- newsstand -------------------------------------------------------------
  function readPaper() {
    UI.showPaper();
    if (!FLAGS.paperRead) {
      FLAGS.paperRead = true;
      note('The Examiner', 'Friday, June 11th, 1937. Grove futures up. A heat spell that never arrives.');
      dlog('paper:first');
    } else {
      seamPaper();
    }
  }

  // ---- bar door --------------------------------------------------------------
  function enterBar() {
    if (G.inside === 'bar') return;
    UI.fade(() => {
      G.inside = 'bar';
      const P = G.player; P.x = INTERIOR.CX; P.z = INTERIOR.CZ + 3.6; P.yaw = Math.PI; P.pitch = 0;
      if (!FLAGS.enteredBarOnce) { FLAGS.enteredBarOnce = true; checkObjectives(); }
      dlog('enterBar');
    });
  }
  function exitBar() {
    if (G.inside !== 'bar') return;
    UI.fade(() => {
      G.inside = null;
      const P = G.player; P.x = -16; P.z = 8.2; P.yaw = Math.PI; P.pitch = 0;
      dlog('exitBar');
    });
  }

  // ---- shack -----------------------------------------------------------------
  function openShack() {
    if (!FLAGS.visitedShack) {
      FLAGS.visitedShack = true;
      note('The packing shack', 'WHITMORE CITRUS CO. The door was never locked. Dust holds the shape of a man\u2019s mornings.');
      const it = G.interactables.find(i => i.id === 'floorboard');
      if (it) it.revealed = true;
      if (G.shackDoor && !G.shackDoor.userData.opening) {
        G.shackDoor.userData.opening = true;
        let t = 0; const d0 = G.shackDoor.rotation.y, d1 = d0 - 1.25;
        G.anim.push({ update(dt) { t = Math.min(1, t + dt * 1.3); G.shackDoor.rotation.y = lerp(d0, d1, ss(0, 1, t)); } });
      }
      UI.toast('The door gives. Dust, and a cot nobody folded.');
      if (AUDIO.creak) AUDIO.creak();
      dlog('shack:open');
    } else {
      UI.toast('Inside: a ledger, a cold stove, one loose board by the cot.');
    }
  }

  function pryBoard() {
    UI.showNote(NOTE_TEXT);
    if (!FLAGS.noteRead) {
      FLAGS.noteRead = true;
      note('Found under the floor', 'A note in pencil, signed J.W. \u201cIt isn\u2019t miles \u2014 it\u2019s a number: nine sixty-five.\u201d');
      checkObjectives();
      dlog('note:read');
    }
  }

  // ---- barricades ------------------------------------------------------------
  function onBarricade(n) {
    if (n === 1) note('Road closed', 'The sawhorse went over easy. Nothing behind it but more road. Why close a road to nowhere?');
    if (n === 3) note('Turn back', 'Hand-painted, the paint still tacky after who knows how long. Somebody wanted this to look desperate.');
    dlog('barricade:' + n);
  }

  // ---- per-frame -------------------------------------------------------------
  function update(dt) {
    // phonograph seam: time spent inside the bar with the record turning
    if (G.inside === 'bar' && (G.state === 'PLAY' || G.state === 'DIALOG')) {
      FLAGS.barMusicTime += dt;
      if (FLAGS.barMusicTime >= 64 && !hasSeam('SKIP')) {
        addSeam('SKIP', 'The Skip',
          'Bar seven, the record stumbles \u2014 the same stumble, every time around. Nobody else hears it. Or they\u2019ve stopped hearing it.');
      }
    }
    // world boundary
    if (G.state === 'PLAY' && !FLAGS.boundaryReached && !G.inside) {
      const P = G.player;
      const d = Math.sqrt(P.x * P.x + P.z * P.z);
      if (d >= CFG.D_BOUNDARY) EDGE.startEnding();
    }
  }

  return { OBJ, addSeam, hasSeam, note, checkObjectives, seamUsual, seamPaper, readPaper, enterBar, exitBar, openShack, pryBoard, onBarricade, update };
})();
