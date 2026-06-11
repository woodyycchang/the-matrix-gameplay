// ============ 14 ui — HUD, overlays, title, terminal. Headless-safe. ============
const UI = (() => {
  const rec = { toasts: [], dialog: null, note: null, paper: false, journalOpen: false,
    terminal: null, credits: false, letterbox: false, endingLine: '', faded: 0, started: false, paused: false };
  let D = null; // dom refs, null when headless
  const tw = { el: null, full: '', n: 0, cps: 42, done: true, onDone: null };
  const tw2 = { el: null, full: '', n: 0, cps: 34, done: true }; // ending line
  let toastN = 0, hintT = 0;

  const CSS = `
  #oe{position:fixed;inset:0;overflow:hidden;background:#000;font-family:Georgia,'Times New Roman',serif;-webkit-user-select:none;user-select:none}
  #oe canvas{display:block;width:100%;height:100%}
  .oe-layer{position:absolute;inset:0;pointer-events:none}
  /* grade */
  #oe-vig{background:radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 46%, rgba(0,0,0,.62) 100%);opacity:.3}
  #oe-tint{background:radial-gradient(ellipse at 50% 50%, rgba(20,80,40,0) 30%, rgba(10,60,30,.5) 100%);opacity:0;mix-blend-mode:screen}
  #oe-grain{opacity:.07;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");animation:oeGrain .42s steps(3) infinite}
  @keyframes oeGrain{0%{transform:translate(0,0)}33%{transform:translate(-38px,22px)}66%{transform:translate(24px,-30px)}100%{transform:translate(0,0)}}
  /* HUD */
  .oe-hud{position:absolute;color:#efe6d2;text-shadow:0 1px 3px rgba(0,0,0,.9);letter-spacing:.14em;font-size:13px}
  #oe-clock{top:16px;left:18px;font-variant:small-caps}
  #oe-clock b{font-size:17px;letter-spacing:.18em}
  #oe-obj{top:16px;right:18px;max-width:300px;text-align:right;font-style:italic;font-size:13px;color:#e8d9b8;opacity:.95}
  #oe-obj:before{content:'\u2014 ';opacity:.6}
  #oe-prompt{left:50%;bottom:13%;transform:translateX(-50%);font-size:15px;letter-spacing:.1em;background:rgba(8,8,10,.55);padding:7px 16px;border:1px solid rgba(239,230,210,.35);border-radius:2px;display:none}
  #oe-prompt b{color:#ffd98a;font-family:'Courier New',monospace}
  #oe-hint{left:18px;bottom:16px;font-size:11.5px;line-height:1.75;color:#cfc4ab;opacity:.85;transition:opacity 1.4s}
  #oe-hint b{color:#ffd98a;font-family:'Courier New',monospace;font-size:11px}
  #oe-toasts{top:60px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px}
  .oe-toast{background:rgba(10,9,8,.78);border:1px solid rgba(239,230,210,.3);color:#efe6d2;padding:8px 18px;font-size:13.5px;letter-spacing:.08em;border-radius:2px;opacity:0;transition:opacity .5s, transform .5s;transform:translateY(-6px);max-width:72vw;text-align:center}
  .oe-toast.on{opacity:1;transform:none}
  .oe-toast.seam{border-color:#69d68a;color:#bdf2c9;box-shadow:0 0 18px rgba(60,200,110,.15) inset}
  .oe-toast.obj{font-style:italic}
  /* dialog */
  #oe-dlg{position:absolute;left:50%;bottom:36px;transform:translateX(-50%);width:min(680px,86vw);background:rgba(12,11,10,.88);border:1px solid rgba(239,230,210,.4);border-radius:3px;padding:14px 20px 12px;color:#efe6d2;display:none;pointer-events:auto;box-shadow:0 8px 40px rgba(0,0,0,.6)}
  #oe-dlg .sp{font-variant:small-caps;letter-spacing:.22em;color:#ffd98a;font-size:13px;margin-bottom:6px}
  #oe-dlg .tx{font-size:16.5px;line-height:1.55;min-height:52px;white-space:pre-wrap}
  #oe-dlg .ch{margin-top:10px;display:none}
  #oe-dlg .ch div{padding:5px 8px;cursor:pointer;font-size:14.5px;color:#dccfae;border-left:2px solid transparent}
  #oe-dlg .ch div:hover{color:#fff;border-left-color:#ffd98a;background:rgba(255,217,138,.07)}
  #oe-dlg .ch b{font-family:'Courier New',monospace;color:#ffd98a;margin-right:8px}
  #oe-dlg .adv{position:absolute;right:14px;bottom:8px;font-size:11px;color:#9b8f76;letter-spacing:.12em;display:none}
  /* panels (journal/note/paper) */
  .oe-panel{position:absolute;inset:0;display:none;align-items:center;justify-content:center;pointer-events:auto;background:rgba(0,0,0,.55)}
  .oe-paperbody{background:#e9dcc0;color:#2a2118;box-shadow:0 14px 60px rgba(0,0,0,.7), inset 0 0 80px rgba(120,90,40,.25);padding:30px 36px;max-width:min(620px,88vw);max-height:80vh;overflow:auto;border-radius:2px}
  .oe-paperbody h3{margin:0 0 4px;font-variant:small-caps;letter-spacing:.2em;font-weight:600}
  .oe-paperbody .when{font-size:11px;color:#7a6a4a;letter-spacing:.1em;margin-bottom:8px}
  .oe-close{position:absolute;top:18px;right:24px;color:#efe6d2;font-size:13px;letter-spacing:.15em;cursor:pointer;border:1px solid rgba(239,230,210,.4);padding:6px 12px;background:rgba(10,9,8,.6)}
  #oe-journal .seamItem{border-left:3px solid #5cae74;padding:6px 10px;margin:10px 0;background:rgba(92,174,116,.07)}
  #oe-journal .noteItem{border-left:3px solid #b09a6a;padding:6px 10px;margin:10px 0}
  #oe-journal .t{font-weight:700}
  #oe-journal .at{font-size:11px;color:#7a6a4a}
  #oe-note pre{font-family:Georgia,serif;font-size:16px;line-height:1.7;white-space:pre-wrap;margin:0;color:#33291c}
  #oe-note .oe-paperbody{background:#efe7cf;transform:rotate(-.7deg)}
  /* newspaper */
  #oe-news .oe-paperbody{max-width:min(760px,92vw);font-family:'Times New Roman',serif}
  #oe-news h1{font-family:'Old English Text MT','Times New Roman',serif;text-align:center;margin:0;font-size:44px;letter-spacing:.04em}
  #oe-news .rule{border-top:2px solid #2a2118;border-bottom:1px solid #2a2118;height:3px;margin:6px 0}
  #oe-news .dateline{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.12em;padding:3px 2px}
  #oe-news .heads{font-size:21px;font-weight:700;text-align:center;margin:10px 0 2px;letter-spacing:.02em}
  #oe-news .sub{font-size:13px;text-align:center;font-style:italic;margin-bottom:10px}
  #oe-news .cols{column-count:3;column-gap:16px;column-rule:1px solid #b8a888;font-size:11.5px;line-height:1.5;text-align:justify}
  #oe-news .cols h4{margin:6px 0 3px;font-size:13px}
  /* title */
  #oe-title{position:absolute;inset:0;background:#050505;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;z-index:30}
  #oe-title .mer{font-family:'Courier New',monospace;color:#3f7f57;font-size:12px;letter-spacing:.38em;margin-bottom:34px;animation:oeFlick 3.2s infinite}
  @keyframes oeFlick{0%,100%{opacity:.75}6%{opacity:.2}8%{opacity:.8}52%{opacity:.65}54%{opacity:.25}56%{opacity:.8}}
  #oe-title h1{color:#e8843c;font-size:clamp(40px,7.5vw,84px);margin:0;font-weight:600;letter-spacing:.06em;text-shadow:0 0 38px rgba(232,132,60,.35), 0 3px 0 #5a2c10}
  #oe-title .sub{color:#cdbfa3;letter-spacing:.5em;font-variant:small-caps;margin:12px 0 40px;font-size:15px}
  #oe-begin{font-family:Georgia,serif;font-size:17px;letter-spacing:.3em;padding:13px 46px;background:transparent;color:#efe6d2;border:1px solid #8f8268;cursor:pointer}
  #oe-begin:hover{background:#efe6d2;color:#171310}
  #oe-title .keys{margin-top:42px;color:#857a62;font-size:12px;line-height:2;letter-spacing:.1em;text-align:center}
  #oe-title .keys b{font-family:'Courier New',monospace;color:#bfb398}
  /* pause */
  #oe-pause{background:rgba(5,5,6,.82)}
  #oe-pause .oe-paperbody{background:#171410;color:#efe6d2;text-align:center;min-width:260px}
  #oe-pause button{display:block;width:100%;margin:8px 0;padding:10px;background:transparent;border:1px solid #6e6350;color:#efe6d2;font-family:Georgia,serif;letter-spacing:.2em;font-size:13px;cursor:pointer}
  #oe-pause button:hover{background:#efe6d2;color:#171310}
  /* letterbox + ending */
  .oe-bar{position:absolute;left:0;right:0;height:11.5vh;background:#000;transition:transform 2.4s cubic-bezier(.4,0,.2,1);z-index:18}
  #oe-barT{top:0;transform:translateY(-100%)}#oe-barB{bottom:0;transform:translateY(100%)}
  #oe.lb #oe-barT{transform:none}#oe.lb #oe-barB{transform:none}
  #oe-eline{position:absolute;left:50%;bottom:14.5vh;transform:translateX(-50%);width:min(760px,88vw);text-align:center;color:#e9dcc0;font-size:19px;font-style:italic;letter-spacing:.04em;text-shadow:0 2px 8px #000;z-index:19;min-height:30px}
  /* terminal */
  #oe-term{background:rgba(0,0,0,.86);z-index:25}
  #oe-term .crt{position:relative;background:#020703;border:1px solid #1d4d2c;box-shadow:0 0 0 6px #0a0f0a, 0 0 60px rgba(40,220,110,.18), inset 0 0 50px rgba(30,180,90,.12);padding:30px 38px;font-family:'Courier New',monospace;color:#5cf08a;font-size:14.5px;line-height:1.8;letter-spacing:.06em;max-width:min(560px,90vw)}
  #oe-term .crt:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px);pointer-events:none;animation:oeScan 7s linear infinite}
  @keyframes oeScan{0%{background-position:0 0}100%{background-position:0 60px}}
  #oe-term pre{margin:0;white-space:pre-wrap;font-family:inherit}
  #oe-term .opt{margin-top:14px;padding:7px 10px;border:1px solid transparent;cursor:pointer}
  #oe-term .opt:hover{border-color:#5cf08a;background:rgba(92,240,138,.08)}
  #oe-term .cur{display:inline-block;width:9px;height:16px;background:#5cf08a;vertical-align:-2px;animation:oeCur 1s steps(1) infinite}
  @keyframes oeCur{50%{opacity:0}}
  /* credits */
  #oe-cred{background:#000;z-index:28;flex-direction:column;text-align:center;color:#cdbfa3}
  #oe-cred .flash{position:absolute;inset:0;background:#fff;opacity:0}
  #oe-cred h2{color:#e8843c;font-size:38px;letter-spacing:.08em;margin:18px 0 6px}
  #oe-cred .ln{font-size:14px;letter-spacing:.18em;margin:7px 0;opacity:0;transition:opacity 1.6s}
  #oe-cred button{margin-top:36px;font-family:Georgia,serif;font-size:14px;letter-spacing:.28em;padding:11px 36px;background:transparent;color:#efe6d2;border:1px solid #8f8268;cursor:pointer;opacity:0;transition:opacity 1.6s}
  #oe-cred button:hover{background:#efe6d2;color:#171310}
  #oe-fade{background:#000;opacity:0;transition:opacity .22s;z-index:40}
  /* touch */
  .oe-tc{position:absolute;border:1.5px solid rgba(239,230,210,.4);border-radius:50%;pointer-events:auto;touch-action:none}
  #oe-stick{left:26px;bottom:90px;width:118px;height:118px}
  #oe-stickNub{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:rgba(239,230,210,.25)}
  .oe-tbtn{position:absolute;right:24px;width:58px;height:58px;border-radius:50%;background:rgba(10,9,8,.5);border:1.5px solid rgba(239,230,210,.45);color:#efe6d2;font-family:'Courier New',monospace;font-size:17px;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none}
  #oe-look{position:absolute;left:40%;right:0;top:0;bottom:0;pointer-events:auto;touch-action:none}
  `;

  function el(tag, id, parent, html) {
    const e = DOC.createElement(tag);
    if (id) { if (id.startsWith('.')) e.className = id.slice(1); else e.id = id; }
    if (html != null) e.innerHTML = html;
    (parent || D.root).appendChild(e); return e;
  }

  function init(container, canvas) {
    if (ENV.headless) return;
    const style = DOC.createElement('style'); style.textContent = CSS; DOC.head.appendChild(style);
    D = { root: null };
    D.root = DOC.createElement('div'); D.root.id = 'oe'; container.appendChild(D.root);
    D.root.appendChild(canvas);
    D.vig = el('div', 'oe-vig', D.root); D.vig.className = 'oe-layer';
    D.tint = el('div', 'oe-tint', D.root); D.tint.className = 'oe-layer';
    D.grain = el('div', 'oe-grain', D.root); D.grain.className = 'oe-layer';
    // HUD
    D.clock = el('div', 'oe-clock', D.root); D.clock.className += ' oe-hud';
    D.obj = el('div', 'oe-obj', D.root); D.obj.className += ' oe-hud';
    D.prompt = el('div', 'oe-prompt', D.root); D.prompt.className += ' oe-hud';
    D.toasts = el('div', 'oe-toasts', D.root); D.toasts.className += ' oe-hud';
    D.hint = el('div', 'oe-hint', D.root, '<b>W A S D</b> walk &nbsp;<b>SHIFT</b> run &nbsp;<b>MOUSE</b> look &nbsp;<b>E</b> use / car &nbsp;<b>F</b> lights &nbsp;<b>R</b> radio &nbsp;<b>J</b> journal &nbsp;<b>M</b> sound &nbsp;<b>ESC</b> menu');
    D.hint.className += ' oe-hud';
    // dialog
    D.dlg = el('div', 'oe-dlg', D.root);
    D.dlgSp = el('div', '.sp', D.dlg); D.dlgTx = el('div', '.tx', D.dlg);
    D.dlgCh = el('div', '.ch', D.dlg); D.dlgAdv = el('div', '.adv', D.dlg, '\u25b8 SPACE');
    // journal / note / paper
    D.journal = el('div', 'oe-journal', D.root); D.journal.className = 'oe-panel';
    D.journalBody = el('div', '.oe-paperbody', D.journal);
    D.note = el('div', 'oe-note', D.root); D.note.className = 'oe-panel';
    D.noteBody = el('div', '.oe-paperbody', D.note);
    D.news = el('div', 'oe-news', D.root); D.news.className = 'oe-panel';
    D.newsBody = el('div', '.oe-paperbody', D.news, newspaperHTML());
    for (const [panel, closer] of [[D.journal, closeJournal], [D.note, closePanel], [D.news, closePanel]]) {
      const c = el('div', '.oe-close', panel, 'CLOSE \u2014 E'); c.addEventListener('click', closer);
      panel.addEventListener('click', (e) => { if (e.target === panel) closer(); });
    }
    // letterbox + ending line
    D.barT = el('div', 'oe-barT', D.root); D.barT.className += ' oe-bar';
    D.barB = el('div', 'oe-barB', D.root); D.barB.className += ' oe-bar';
    D.eline = el('div', 'oe-eline', D.root);
    // terminal
    D.term = el('div', 'oe-term', D.root); D.term.className = 'oe-panel';
    D.crt = el('div', '.crt', D.term);
    D.termPre = el('pre', null, D.crt); D.termOpts = el('div', null, D.crt);
    // pause
    D.pause = el('div', 'oe-pause', D.root); D.pause.className = 'oe-panel';
    const pb = el('div', '.oe-paperbody', D.pause, '<h3 style="letter-spacing:.3em">PAUSED</h3>');
    D.btnResume = el('button', null, pb, 'RESUME'); D.btnResume.onclick = () => escape();
    D.btnMute = el('button', null, pb, 'SOUND: ON'); D.btnMute.onclick = () => { AUDIO.setMuted(!G.muted); D.btnMute.textContent = 'SOUND: ' + (G.muted ? 'OFF' : 'ON'); };
    D.btnQual = el('button', null, pb, 'QUALITY: HIGH'); D.btnQual.onclick = () => { G.quality = G.quality === 'high' ? 'low' : 'high'; D.btnQual.textContent = 'QUALITY: ' + G.quality.toUpperCase(); applyQuality(); };
    D.btnRestart = el('button', null, pb, 'RESTART DAY'); D.btnRestart.onclick = () => WIN.location.reload();
    // credits
    D.cred = el('div', 'oe-cred', D.root); D.cred.className = 'oe-panel';
    D.credFlash = el('div', '.flash', D.cred);
    const cw = el('div', null, D.cred);
    D.credLines = [];
    el('div', '.ln', cw, 'SESSION ENDED').style.cssText = 'font-family:Courier New,monospace;color:#5cf08a';
    D.credLines.push(cw.lastChild);
    el('h2', null, cw, 'THE ORANGE EMPIRE');
    for (const s of ['LOS ANGELES, 1937 \u2014 AS REMEMBERED BY UNIT 03', 'EVERY BUILDING, TREE, FACE AND SONG: PROCEDURAL', 'FOR JACOB WHITMORE, WHO COUNTED']) {
      D.credLines.push(el('div', '.ln', cw, s));
    }
    D.credBtn = el('button', null, cw, 'PLAY AGAIN'); D.credBtn.onclick = () => WIN.location.reload();
    // fade
    D.fade = el('div', 'oe-fade', D.root); D.fade.className += ' oe-layer';
    // title
    D.title = el('div', 'oe-title', D.root);
    el('div', '.mer', D.title, 'MERIDIAN CIVIC SYSTEMS \u00b7 UNIT 03');
    el('h1', null, D.title, 'THE ORANGE EMPIRE');
    el('div', '.sub', D.title, 'Los Angeles \u00b7 1937');
    D.begin = el('button', 'oe-begin', D.title, 'BEGIN');
    el('div', '.keys', D.title, '<b>W A S D</b> walk &nbsp;\u00b7&nbsp; <b>MOUSE</b> look &nbsp;\u00b7&nbsp; <b>E</b> talk, doors, the car<br><b>F</b> headlights &nbsp;\u00b7&nbsp; <b>R</b> radio &nbsp;\u00b7&nbsp; <b>J</b> journal &nbsp;\u00b7&nbsp; <b>ESC</b> menu<br><br><span style="color:#6e6350">It is Friday evening, June 11th. You are new in town. Find a drink.</span>');
    D.begin.onclick = start;
    // keyboard router
    WIN.addEventListener('keydown', onKeyDown);
    // touch
    if ('ontouchstart' in WIN || (WIN.navigator && WIN.navigator.maxTouchPoints > 0)) buildTouch();
  }

  function applyQuality() {
    if (G.renderer) {
      G.renderer.setPixelRatio(G.quality === 'high' ? Math.min(WIN.devicePixelRatio || 1, 2) : 1);
      G.renderer.shadowMap.enabled = G.quality === 'high';
      G.scene && G.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    }
  }

  function newspaperHTML() {
    const filler = (n) => {
      const S = ['Grove futures rose a quarter-cent on talk of a heat spell that, growers admit, has been "due any day now" for as long as anyone keeps books.',
        'City engineers again postponed the survey of the eastern county road, citing equipment that has not arrived and, in the words of one official, "may never have been ordered."',
        'The Rialto holds SHADOWS OVER SUNSET for a fourth consecutive week. Attendance figures were described as identical to the third.',
        'Police report no crimes. Asked to elaborate, the desk sergeant said there was "nothing to elaborate." ',
        'A Mrs. E. Pell of Palm Avenue wrote to remind residents that oranges bruise. The editors thank her for her continued correspondence on this subject.',
        'Tide tables, train schedules and the phase of the moon appear on page 8, where they have not changed.'];
      let out = '';
      for (let i = 0; i < n; i++) out += '<p>' + S[i % S.length] + '</p>';
      return out;
    };
    return `<h1>The Examiner</h1>
      <div class="rule"></div>
      <div class="dateline"><span>VOL. LXXXIV \u2014 No. 162</span><span>LOS ANGELES, FRIDAY MORNING, JUNE 11, 1937</span><span>FIVE CENTS</span></div>
      <div class="rule"></div>
      <div class="heads">ORANGE EMPIRE STANDS PROSPEROUS; NO END IN SIGHT</div>
      <div class="sub">Valley Described as "Complete" by Men Who Ought to Know &mdash; East Road Closure Extended Indefinitely</div>
      <div class="cols">
        <h4>GROVES AT CAPACITY</h4>${filler(2)}
        <h4>EAST ROAD STAYS SHUT</h4>${filler(2)}
        <h4>WEATHER: FAIR, CONTINUED FAIR</h4>${filler(2)}
      </div>`;
  }

  // ---------------- typewriter ----------------
  function type(state, elx, text, cps, onDone) {
    state.el = elx; state.full = text || ''; state.n = 0; state.cps = cps || 42; state.done = !state.full; state.onDone = onDone || null;
    if (elx) elx.textContent = '';
    if (state.done && onDone) onDone();
  }
  function pump(state, dt) {
    if (state.done || !state.el) return;
    state.n += state.cps * dt;
    const k = Math.min(state.full.length, Math.floor(state.n));
    state.el.textContent = state.full.slice(0, k);
    if (k >= state.full.length) { state.done = true; if (state.onDone) state.onDone(); }
  }
  function fastForward(state) { if (!state.done && state.el) { state.el.textContent = state.full; state.done = true; if (state.onDone) state.onDone(); } }

  // ---------------- dialog ----------------
  function showDialog(speaker, text, choices, advanceable) {
    rec.dialog = { speaker, text, choices, advanceable };
    if (!D) return;
    D.dlg.style.display = 'block';
    D.dlgSp.textContent = speaker || '';
    D.dlgCh.style.display = 'none'; D.dlgAdv.style.display = 'none';
    D.dlgCh.innerHTML = '';
    type(tw, D.dlgTx, text, 46, () => {
      if (choices && choices.length) {
        D.dlgCh.innerHTML = '';
        choices.forEach((c, i) => {
          const row = el('div', null, D.dlgCh, '<b>' + (i + 1) + '</b>' + c);
          row.onclick = () => DIALOGUE.choose(i);
        });
        D.dlgCh.style.display = 'block';
      } else if (advanceable) D.dlgAdv.style.display = 'block';
    });
  }
  function hideDialog() { rec.dialog = null; if (D) D.dlg.style.display = 'none'; }

  // ---------------- toasts ----------------
  function toast(msg, kind) {
    rec.toasts.push(msg); if (rec.toasts.length > 30) rec.toasts.shift();
    if (!D) return;
    const t = el('div', '.oe-toast' + (kind ? ' ' + kind : ''), D.toasts, msg);
    t.className = 'oe-toast' + (kind ? ' ' + kind : '');
    (WIN && WIN.requestAnimationFrame ? WIN.requestAnimationFrame.bind(WIN) : (f) => setTimeout(f, 16))(() => t.classList.add('on'));
    const life = kind === 'seam' ? 5600 : 4200;
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 600); }, life);
    while (D.toasts.children.length > 3) D.toasts.firstChild.remove();
  }

  // ---------------- panels ----------------
  function openJournal() {
    if (G.state !== 'PLAY') return;
    rec.journalOpen = true; G.prevState = G.state; G.state = 'JOURNAL';
    if (!D) return;
    let h = '<h3>HENRY VOSS \u2014 NOTES</h3><div class="when">Friday, June 11th, 1937</div>';
    if (!G.journal.length) h += '<p style="font-style:italic;color:#7a6a4a">Nothing yet. Keep your eyes open.</p>';
    for (let i = G.journal.length - 1; i >= 0; i--) {
      const j = G.journal[i];
      h += `<div class="${j.kind === 'seam' ? 'seamItem' : 'noteItem'}"><div class="t">${j.title} <span class="at">\u00b7 ${j.at}</span></div><div>${j.text}</div></div>`;
    }
    D.journalBody.innerHTML = h;
    D.journal.style.display = 'flex';
    if (DOC.exitPointerLock) DOC.exitPointerLock();
  }
  function closeJournal() { rec.journalOpen = false; if (D) D.journal.style.display = 'none'; if (G.state === 'JOURNAL') G.state = 'PLAY'; }
  function showNote(text) {
    rec.note = text; G.prevState = G.state; G.state = 'NOTE';
    if (!D) return;
    D.noteBody.innerHTML = '<h3>PENCIL, FADED</h3><div class="when">found under the floorboards</div>';
    const pre = el('pre', null, D.noteBody); pre.textContent = text;
    D.note.style.display = 'flex';
    if (DOC.exitPointerLock) DOC.exitPointerLock();
  }
  function showPaper() {
    rec.paper = true; G.prevState = G.state; G.state = 'NOTE';
    if (!D) return;
    D.news.style.display = 'flex';
    if (DOC.exitPointerLock) DOC.exitPointerLock();
  }
  function closePanel() {
    rec.note = null; rec.paper = false;
    if (D) { D.note.style.display = 'none'; D.news.style.display = 'none'; }
    if (G.state === 'NOTE') G.state = 'PLAY';
  }

  // ---------------- letterbox / ending ----------------
  function letterbox(on) { rec.letterbox = on; if (D) D.root.classList.toggle('lb', on); }
  function endingLine(text) {
    rec.endingLine = text;
    if (!D) return;
    if (!text) { D.eline.textContent = ''; tw2.done = true; return; }
    type(tw2, D.eline, text, 30);
  }

  // ---------------- terminal ----------------
  function showTerminal(text, options) {
    rec.terminal = { text, options };
    if (!D) return;
    D.term.style.display = 'flex';
    D.termOpts.innerHTML = '';
    type(tw, D.termPre, text, 120, () => {
      options.forEach((o, i) => {
        const r = el('div', '.opt', D.termOpts, '[' + (i + 1) + '] ' + o);
        r.onclick = () => EDGE.choose(i === 0 ? 'loop' : 'end');
      });
      el('div', null, D.termOpts, '<span class="cur"></span>');
    });
  }
  function hideTerminal() { rec.terminal = null; if (D) D.term.style.display = 'none'; }

  // ---------------- credits ----------------
  function showCredits() {
    rec.credits = true;
    if (!D) return;
    hideTerminal(); letterbox(false); endingLine('');
    D.cred.style.display = 'flex';
    D.credFlash.style.transition = 'opacity .12s'; D.credFlash.style.opacity = '1';
    setTimeout(() => { D.credFlash.style.transition = 'opacity 1.8s'; D.credFlash.style.opacity = '0'; }, 160);
    const items = [...D.cred.querySelectorAll('.ln'), D.cred.querySelector('h2'), D.credBtn];
    const seq = [D.credLines[0], D.cred.querySelector('h2'), ...D.credLines.slice(1), D.credBtn];
    seq.forEach((n, i) => { if (!n) return; n.style.opacity = '0'; n.style.transition = 'opacity 1.6s'; setTimeout(() => { n.style.opacity = '1'; }, 900 + i * 1100); });
  }

  // ---------------- fade ----------------
  function fade(cb) {
    rec.faded++;
    if (!D) { cb && cb(); return; }
    D.fade.style.opacity = '1';
    setTimeout(() => { cb && cb(); setTimeout(() => { D.fade.style.opacity = '0'; }, 60); }, 230);
  }

  // ---------------- title / pause ----------------
  function start() {
    if (FLAGS.started) return;
    FLAGS.started = true; rec.started = true;
    AUDIO.unlock();
    if (D) { D.title.style.transition = 'opacity 1.1s'; D.title.style.opacity = '0'; setTimeout(() => D.title.remove(), 1200); }
    G.state = 'PLAY';
    toast(QUEST.OBJ[0], 'obj');
    hintT = 12;
    dlog('start');
  }
  function escape() {
    if (G.state === 'PLAY') {
      G.state = 'PAUSE'; rec.paused = true;
      if (D) { D.pause.style.display = 'flex'; if (DOC.exitPointerLock) DOC.exitPointerLock(); }
    } else if (G.state === 'PAUSE') {
      G.state = 'PLAY'; rec.paused = false;
      if (D) D.pause.style.display = 'none';
    }
  }

  // ---------------- keyboard routing ----------------
  function onKeyDown(e) {
    const k = e.key;
    if (G.state === 'TITLE' && (k === 'Enter' || k === ' ')) { start(); return; }
    if (G.state === 'DIALOG') {
      if (!tw.done && (k === ' ' || k === 'Enter' || k === 'e' || k === 'E')) { fastForward(tw); e.preventDefault(); return; }
      if (rec.dialog && rec.dialog.choices) {
        const i = parseInt(k, 10) - 1;
        if (i >= 0 && i < rec.dialog.choices.length) { DIALOGUE.choose(i); e.preventDefault(); }
      } else if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') { DIALOGUE.advance(); e.preventDefault(); }
      return;
    }
    if (G.state === 'NOTE' && (k === 'e' || k === 'E' || k === 'Escape' || k === 'Enter' || k === ' ')) { closePanel(); e.preventDefault(); return; }
    if (G.state === 'JOURNAL' && (k === 'j' || k === 'J' || k === 'Escape' || k === 'e' || k === 'E')) { closeJournal(); e.preventDefault(); return; }
    if (G.state === 'PAUSE' && k === 'Escape') { escape(); return; }
    if (G.state === 'TERMINAL' && (k === '1' || k === '2')) { EDGE.choose(k === '1' ? 'loop' : 'end'); return; }
    if (G.state === 'CREDITS' && k === 'Enter') { WIN.location.reload(); }
  }

  // ---------------- touch ----------------
  function buildTouch() {
    G.isTouch = true;
    const stick = el('div', 'oe-stick', D.root); stick.className += ' oe-tc';
    const nub = el('div', 'oe-stickNub', stick);
    let sid = null, sx = 0, sy = 0;
    stick.addEventListener('pointerdown', e => { sid = e.pointerId; sx = e.clientX; sy = e.clientY; stick.setPointerCapture(sid); });
    stick.addEventListener('pointermove', e => {
      if (e.pointerId !== sid) return;
      const dx = clamp((e.clientX - sx) / 44, -1, 1), dy = clamp((e.clientY - sy) / 44, -1, 1);
      nub.style.transform = `translate(${dx * 32}px,${dy * 32}px)`;
      PLAYER.virtual.f = Math.max(0, -dy); PLAYER.virtual.b = Math.max(0, dy);
      PLAYER.virtual.l = Math.max(0, -dx); PLAYER.virtual.r = Math.max(0, dx);
      PLAYER.virtual.run = Math.abs(dy) > 0.85 ? 1 : 0;
    });
    const sEnd = e => { if (e.pointerId !== sid) return; sid = null; nub.style.transform = ''; PLAYER.virtual.f = PLAYER.virtual.b = PLAYER.virtual.l = PLAYER.virtual.r = PLAYER.virtual.run = 0; };
    stick.addEventListener('pointerup', sEnd); stick.addEventListener('pointercancel', sEnd);
    const look = el('div', 'oe-look', D.root);
    let lid = null, lx = 0, ly = 0;
    look.addEventListener('pointerdown', e => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; });
    look.addEventListener('pointermove', e => { if (e.pointerId !== lid) return; PLAYER.virtual.lookX += (e.clientX - lx) * 2.4; PLAYER.virtual.lookY += (e.clientY - ly) * 2.4; lx = e.clientX; ly = e.clientY; });
    const lEnd = e => { if (e.pointerId === lid) lid = null; };
    look.addEventListener('pointerup', lEnd); look.addEventListener('pointercancel', lEnd);
    const mkBtn = (label, bottom, key) => {
      const b = el('div', null, D.root, label); b.className = 'oe-tbtn'; b.style.bottom = bottom + 'px';
      b.addEventListener('pointerdown', ev => { ev.preventDefault(); G.debugPressed = G.debugPressed || {}; G.debugPressed[key] = true; });
      return b;
    };
    mkBtn('E', 96, 'e'); mkBtn('J', 166, 'j'); mkBtn('R', 236, 'r'); mkBtn('F', 306, 'f');
  }

  // ---------------- per-frame ----------------
  function update(dt) {
    pump(tw, dt); pump(tw2, dt);
    if (!D) return;
    D.clock.innerHTML = '<b>' + fmtClock(G.dayMin) + '</b><br>FRIDAY \u00b7 JUNE 11 \u00b7 1937';
    D.obj.textContent = QUEST.OBJ[G.objective] || '';
    const it = G.nearInteract;
    if (it && G.state === 'PLAY') { D.prompt.style.display = 'block'; D.prompt.innerHTML = '<b>E</b> \u2014 ' + it.label; }
    else D.prompt.style.display = 'none';
    if (hintT > 0) { hintT -= dt; if (hintT <= 0) D.hint.style.opacity = '0'; }
    const hudOn = G.state === 'PLAY' || G.state === 'DIALOG';
    D.clock.style.opacity = D.obj.style.opacity = hudOn && !rec.letterbox ? '1' : '0';
  }
  function setGrade(edge, night) {
    if (!D) return;
    D.grain.style.opacity = (0.06 + edge * 0.3).toFixed(3);
    D.vig.style.opacity = (0.28 + edge * 0.42 + night * 0.12).toFixed(3);
    D.tint.style.opacity = Math.max(0, (edge - 0.5) * 1.1).toFixed(3);
  }

  return { init, update, showDialog, hideDialog, toast, openJournal, closeJournal, showNote, showPaper, closePanel,
    letterbox, endingLine, showTerminal, hideTerminal, showCredits, fade, start, escape, setGrade, rec, applyQuality };
})();
