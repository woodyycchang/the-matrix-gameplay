// ============ 10 dialogue ============
const DIALOGUE = (() => {
  const TREES = {};

  // ---------------- GUS ----------------
  TREES.gus = {
    entry() {
      const F = FLAGS;
      if (F.returned && F.epilogueDone) return 'ep_after';
      if (F.returned) return 'epa';
      if (F.gusStage >= 2 && F.noteRead) return 'g3a';
      if (F.gusStage >= 2) return 'g2r';
      if (F.metGus && G.seams.length >= 2) return 'g2a';
      if (F.metGus) return 's1r';
      return 's1_pour';
    },
    nodes: {
      s1_pour: {
        sp: 'GUS', onEnter() { FLAGS.metGus = true; FLAGS.drank++; if (G.ryeGlass) G.ryeGlass.visible = true; QUEST.checkObjectives(); },
        text: "Evenin', Mr. Voss. *He slides a rye across the bar before you've said a word.* Your usual.",
        ch: [{ t: 'How do you know my name?', n: 's1_name' }, { t: '...Thanks.', n: 's1_thanks' }],
      },
      s1_name: {
        sp: 'GUS', text: "Same way I know the rye. *He shrugs, easy as tide.* You've been coming here longer than you think, friend.",
        ch: [{ t: "That's not an answer.", n: 's1_no' }, { t: "I'll take the rye.", n: 's1_thanks' }],
      },
      s1_no: {
        sp: 'GUS', text: "No. It isn't. *He polishes a glass that was already clean.* First one's on the house. It always is.",
        end: true, after() { QUEST.seamUsual(); },
      },
      s1_thanks: {
        sp: 'GUS', text: "*He nods, precise as a metronome.* First one's on the house. It always is.",
        end: true, after() { QUEST.seamUsual(); },
      },
      s1r: {
        sp: 'GUS',
        text() {
          const F = FLAGS;
          F._gusSmall = (F._gusSmall || 0) + 1;
          const pool = [];
          if (F.knockedBarricade > 0 && !F._gA) { F._gA = 1; return "Heard the county's lumber out east took a knock last night. *He doesn't look up from the glass.* Mind the splinters, Mr. Voss."; }
          if (F.paperRead && !F._gB) { F._gB = 1; return "Paper's the same every day, you ask me. 'Course — nobody asks me."; }
          if (F.radioNumbers && !F._gC) { F._gC = 1; return "Folks say there's a voice in the static, past the music. Numbers. *Beat.* I say a man hears what he listens for."; }
          if (F.pellWitness >= 1 && !F._gD) { F._gD = 1; return "Mrs. Pell come by the corner? Quarter past, regular as a tide table. You could set a watch by that woman. Somebody might have."; }
          pool.push("Slow night. Every night's a slow night — identical twin of the last one.");
          pool.push("Anything else, Mr. Voss? The bottle isn't going anywhere. *Pause.* Nothing here is.");
          return pool[F._gusSmall % pool.length];
        },
        ch: [{ t: 'Another rye.', n: 's1r_pour' }, { t: 'Just passing through.', n: null }],
      },
      s1r_pour: { sp: 'GUS', onEnter() { FLAGS.drank++; }, text: "*It's poured before you finish asking.*", end: true },

      g2a: {
        sp: 'GUS', text: "*He sets the bottle down, slow.* You counting too, huh.",
        ch: [{ t: 'Counting what?', n: 'g2b' }, { t: 'The oranges. The paper. The record.', n: 'g2b' }],
      },
      g2b: { sp: 'GUS', text: "Things that happen the same way twice. Then a third time. Then every time.", n: 'g2c' },
      g2c: { sp: 'GUS', text: "There was a grove man drank here. Jacob Whitmore. Smart — started writing things down. Times. Faces. Filled half a ledger with quarter-pasts.", n: 'g2d' },
      g2d: {
        sp: 'GUS', text: "Then one evening his stool's empty. They say he drove east. *He wipes the bar.* They say a lot of things, in the same words, in the same order.",
        ch: [{ t: 'Where east?', n: 'g2e' }, { t: 'What do you think happened?', n: 'g2think' }],
      },
      g2think: { sp: 'GUS', text: "I think the road's closed for a reason. And I think the reason isn't road work.", n: 'g2e' },
      g2e: {
        sp: 'GUS', onEnter() { FLAGS.hasMatchbook = true; FLAGS.gusStage = 2; UI.toast('Matchbook — WHITMORE CITRUS CO., EAST GROVE RD.'); QUEST.note('A matchbook from Gus. Whitmore Citrus Co., East Grove Road.'); QUEST.checkObjectives(); dlog('matchbook'); },
        text: "*He slides something across the bar. A matchbook, soft at the corners. WHITMORE CITRUS CO. — EAST GROVE ROAD.* His packing shack. Still standing, last anybody cared to look.",
        n: 'g2f',
      },
      g2f: {
        sp: 'GUS', text: "I never went. Got as far as the first sign, once. My legs just... walked me home. *He shrugs like it costs him something.* Maybe you're built different, Mr. Voss.",
        end: true,
      },
      g2r: {
        sp: 'GUS', text: "Shack's off East Grove Road, south side, past the closure. Under your own power, mind — I'm not driving you.",
        ch: [{ t: 'Another rye.', n: 's1r_pour' }, { t: 'Later, Gus.', n: null }],
      },
      g3a: {
        sp: 'GUS', text: "*He reads your face like a racing form.* So. You found his handwriting.",
        ch: [{ t: 'He says to drive east. Past everything.', n: 'g3b' }, { t: 'Did you ever read it?', n: 'g3b2' }],
      },
      g3b: { sp: 'GUS', text: "Don't tell me the words. *Quiet, but fast.* If I hear the words, my legs start walking.", n: 'g3c' },
      g3b2: { sp: 'GUS', text: "No. And don't fix that for me. *He says it gently.* A man keeps one door shut so the rest of the house stands.", n: 'g3c' },
      g3c: {
        sp: 'GUS', onEnter() { FLAGS.drank++; },
        text: "If you go — go at night. The dark out there is honest, at least. *He fills your glass without being asked. Of course he does.*",
        end: true,
      },
      epa: {
        sp: 'GUS', text: "*Gus looks at you a long moment. The clock behind him says 7:24. It has said 7:24 before.* So. How green was it?",
        ch: [{ t: 'You knew.', n: 'ep_knew' }, { t: 'Like lines drawn on nothing.', n: 'ep_lines' }, { t: 'Why did I come back?', n: 'ep_why' }],
      },
      ep_knew: { sp: 'GUS', text: "Knowing's a strong word. I pour what a man drinks before he orders it. You learn not to dig at the why of a thing like that.", n: 'epz' },
      ep_lines: { sp: 'GUS', text: "*He nods, slow — the way a man nods at weather from a country he was born in and left.*", n: 'epz' },
      ep_why: { sp: 'GUS', text: "Because it's 7:24 on a Friday evening in Los Angeles, and the rye is poured. *Beat.* There are worse loops, Mr. Voss.", n: 'epz' },
      epz: {
        sp: 'GUS', onEnter() { FLAGS.epilogueDone = true; QUEST.note('Gus, after. "There are worse loops."'); QUEST.checkObjectives(); },
        text: "Same pour as always. *He sets it down. Somewhere outside, a woman is gathering up her oranges.* Same as always.",
        end: true,
      },
      ep_after: { sp: 'GUS', text: "Evenin', Mr. Voss. *The rye is already there. It always was.*", ch: [{ t: 'Evening, Gus.', n: null }] },
    },
  };

  // ---------------- CHARLIE ----------------
  TREES.charlie = {
    entry() { return FLAGS.charlieTalks === 0 ? 'c1' : 'c2'; },
    nodes: {
      c1: {
        sp: 'CHARLIE', onEnter() { FLAGS.charlieTalks++; },
        text: "Examiner! Getcha Examiner! *He grins.* That's mostly habit, mister. You're the only soul on the block.",
        ch: [{ t: "What's the news?", n: 'c1b' }, { t: 'Quiet night?', n: 'c1b' }],
      },
      c1b: {
        sp: 'CHARLIE', text: "Heat to break by Sunday, bureau says. Been saying. And the county's keeping East Grove Road shut — 'indefinitely,' which is county for 'forever.'",
        end: true,
      },
      c2: {
        sp: 'CHARLIE', onEnter() { FLAGS.charlieTalks++; },
        text: "Fresh paper every morning, regular as sunrise.",
        ch: [{ t: "It's the same paper as before.", n: 'c2b' }, { t: 'Thanks, Charlie.', n: null }],
      },
      c2b: {
        sp: 'CHARLIE',
        text: "*He looks at the stack. Looks at you.* It's Friday's paper. It's Friday. *Something behind his eyes asks you, politely, not to push.*",
        end: true, after() { if (FLAGS.paperRead) QUEST.seamPaper(); },
      },
    },
  };

  // ---------------- minor characters ----------------
  TREES.pell = {
    entry() { const p = ((G.gameMin % 60) + 60) % 60; return (p >= 14 && p < 18.4) ? 'p_drop' : 'p_idle'; },
    nodes: {
      p_drop: { sp: 'MRS. PELL', text: "Oh — my oranges — *she's already saying it as she bends, the words worn smooth as river stones* — butterfingers, every time, I swear.", end: true },
      p_idle: { sp: 'MRS. PELL', text: "Lovely evening. *She smiles at a fixed point just past your shoulder.* They're all lovely evenings, aren't they.", end: true },
    },
  };
  TREES.twin = {
    entry() { return 't1'; },
    nodes: { t1: { sp: 'MAN IN GREY', text: "*He touches his hat brim.* Evening. *Down the block, at the same moment, a man touches his hat brim.*", end: true } },
  };
  TREES.cop = {
    entry() { return FLAGS.knockedBarricade > 0 ? 'k1' : 'c1'; },
    nodes: {
      c1: { sp: 'OFFICER', text: "Evenin'. Stay clear of East Grove past the signs — road's out. *A pause, one beat too long.* That's what I'm given to say, anyhow.", end: true },
      k1: { sp: 'OFFICER', text: "Some fool put a car through the county's barricade out east. *He looks at your fender. He looks at you. He decides, visibly, not to know.* Evenin'.", end: true },
    },
  };
  TREES.couple = {
    entry() { return 'c1'; },
    nodes: { c1: { sp: 'THE COUPLE', text: "*They're laughing at something neither of them said.* 'Lovely evening,' she says. He nods: 'They're all lovely.'", end: true } },
  };
  TREES.grocer = {
    entry() { return 'g1'; },
    nodes: { g1: { sp: 'GROCER', text: "Oranges, ten cents the dozen! Best Valencias east of... *he gestures east, then slowly lowers his arm* ...east of here.", end: true } },
  };
  TREES.porch = {
    entry() { return 'p1'; },
    nodes: { p1: { sp: null, text: "\"Evenin',\" says the man. The rocking chair keeps its own time. Exactly its own time.", end: true } },
  };
  TREES.phono = {
    entry() { return G.seams.find(s => s.id === 'SKIP') ? 'ph2' : 'ph1'; },
    nodes: {
      ph1: { sp: null, text: "The record turns. Bar seven comes around — the needle stutters, three even ticks, then carries on like nothing happened. You wait. It comes around again. Exactly.", end: true },
      ph2: { sp: null, text: "Bar seven. Stutter, stutter, stutter, on. You've stopped flinching at it. That worries you more than the skip ever did.", end: true },
    },
  };

  // ---------------- engine ----------------
  let tree = null, node = null;
  function start(id) {
    tree = TREES[id];
    if (!tree) return;
    G.state = 'DIALOG';
    goto(tree.entry());
    dlog('dialog ' + id);
  }
  function goto(id) {
    if (!id) return end();
    node = tree.nodes[id];
    if (!node) return end();
    G.dialogNode = node; G.dialogNodeId = id;
    if (node.onEnter) node.onEnter();
    const txt = typeof node.text === 'function' ? node.text() : node.text;
    G.dialogText = txt;
    UI.showDialog(node.sp, txt, node.ch ? node.ch.map(c => c.t) : null, !node.ch);
  }
  function choose(i) {
    if (G.state !== 'DIALOG' || !node || !node.ch) return;
    const c = node.ch[i];
    if (!c) return;
    if (c.a) c.a();
    if (c.n) goto(c.n); else endWith(node);
  }
  function advance() {
    if (G.state !== 'DIALOG' || !node || node.ch) return;
    if (node.n) goto(node.n); else endWith(node);
  }
  function endWith(n) { const after = n && n.after; end(); if (after) after(); }
  function end() {
    G.state = 'PLAY';
    G.dialogNode = null; G.dialogNPC = null;
    UI.hideDialog();
  }

  return { start, choose, advance, end, TREES };
})();
