/* THE CONSTRUCT — 08_app.js — browser shell (DOM only; never loaded in Node) */
(function (G) {
  'use strict';
  if (typeof document === 'undefined') return;
  var C = G.C, A = C.audio;

  var canvas, ctx, game, hud = {}, started = false;
  var W = 0, H = 0, scale = 1, dpr = 1;
  var paused = false;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- input state ----------
  var keys = {}, edges = {}, mouseDX = 0, mouseDY = 0, locked = false, dragging = false, lastMX = 0, lastMY = 0;
  var fireEdge = false, anyEdge = false;
  var touch = { active: false, mvId: -1, mvX: 0, mvY: 0, mvCX: 0, mvCY: 0, lkId: -1, lkX: 0, lkY: 0, fwd: 0, strafe: 0 };
  var SENS = 0.0023;

  function key(e, down) {
    var k = e.key.toLowerCase();
    if (down && !keys[k]) edges[k] = true;
    keys[k] = down;
    if (down) anyEdge = true;
    if (down && started) {
      if (k === 'enter' || k === 't') { e.preventDefault(); openConsole(); }
      if (k === 'c') game.toggleCode();
      if (k === 'm') { var m = A.toggleMute(); say('audio ' + (m ? 'muted' : 'on'), true); }
      if (k === 'h') game.request('help');
      if (k === 'v') startListen();
      if (k === 'escape') closeConsole();
    }
    if (!down && k === 'v') stopListen();
  }

  function onMouseMove(e) {
    if (!started) return;
    if (locked) { mouseDX += e.movementX || 0; mouseDY += e.movementY || 0; }
    else if (dragging) { mouseDX += e.clientX - lastMX; mouseDY += e.clientY - lastMY; lastMX = e.clientX; lastMY = e.clientY; }
  }
  function tryLock() {
    if (touch.active) return;
    if (canvas.requestPointerLock) {
      try { var p = canvas.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }
  }
  function onMouseDown(e) {
    if (!started) return;
    anyEdge = true;
    if (paused) { setPaused(false); if (!touch.active) tryLock(); return; }
    if (consoleOpen) return;
    if (!locked && !touch.active) {
      dragging = true; lastMX = e.clientX; lastMY = e.clientY;
      tryLock();
      if (!lockEverWorked) return; // first click just engages look
    }
    if (e.button === 0) fireEdge = true;
  }
  var lockEverWorked = false;
  function onLockChange() {
    locked = document.pointerLockElement === canvas;
    if (locked) lockEverWorked = true;
    hud.hint.style.opacity = (!locked && !touch.active && started) ? 1 : 0;
  }

  // ---------- touch ----------
  function bindTouch() {
    canvas.addEventListener('touchstart', function (e) {
      touch.active = true; anyEdge = true;
      document.body.classList.add('touch');
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.clientX < window.innerWidth * 0.45 && touch.mvId < 0) {
          touch.mvId = t.identifier; touch.mvX = t.clientX; touch.mvY = t.clientY; touch.mvCX = t.clientX; touch.mvCY = t.clientY;
        } else if (touch.lkId < 0) {
          touch.lkId = t.identifier; touch.lkX = t.clientX; touch.lkY = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === touch.mvId) { touch.mvCX = t.clientX; touch.mvCY = t.clientY; }
        else if (t.identifier === touch.lkId) {
          mouseDX += (t.clientX - touch.lkX) * 2.4; mouseDY += (t.clientY - touch.lkY) * 2.4;
          touch.lkX = t.clientX; touch.lkY = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    function endT(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === touch.mvId) { touch.mvId = -1; touch.fwd = 0; touch.strafe = 0; }
        if (t.identifier === touch.lkId) touch.lkId = -1;
      }
    }
    canvas.addEventListener('touchend', endT); canvas.addEventListener('touchcancel', endT);
  }

  // ---------- console UI ----------
  var consoleOpen = false, ttQueue = [], ttCur = null, ttChars = 0, ttTimer = 0;
  function say(text, system) {
    ttQueue.push({ text: text, system: !!system });
  }
  function tickTeletype(dt) {
    if (!ttCur) {
      ttCur = ttQueue.shift();
      if (!ttCur) return;
      var div = document.createElement('div');
      div.className = 'line' + (ttCur.system ? ' sys' : '');
      hud.log.appendChild(div);
      ttCur.el = div; ttChars = 0;
      while (hud.log.children.length > 4) hud.log.removeChild(hud.log.firstChild);
    }
    ttTimer += dt;
    var per = 1 / 42;
    while (ttTimer > per && ttCur) {
      ttTimer -= per; ttChars++;
      ttCur.el.textContent = (ttCur.system ? '' : 'operator: ') + ttCur.text.slice(0, ttChars);
      if (ttChars % 2 === 0) A.handle('tick');
      if (ttChars >= ttCur.text.length) {
        var el = ttCur.el;
        setTimeout(function () { el.classList.add('fade'); }, 6500);
        ttCur = null;
      }
    }
  }
  function openConsole() {
    consoleOpen = true;
    hud.inRow.classList.add('open');
    hud.input.value = '';
    hud.input.focus();
    if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) {}
  }
  function closeConsole() {
    consoleOpen = false;
    hud.inRow.classList.remove('open');
    hud.input.blur();
    if (started && !touch.active) tryLock();
  }
  function submitConsole() {
    var v = hud.input.value.trim();
    closeConsole();
    if (!v) return;
    say('you: ' + v, true);
    game.request(v);
  }

  // ---------- speech ----------
  var recog = null, listening = false;
  function speechAvailable() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
  function startListen() {
    if (listening || !speechAvailable()) return;
    try {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recog = new SR();
      recog.lang = 'en-US'; recog.interimResults = false; recog.maxAlternatives = 1;
      recog.onresult = function (ev) {
        var txt = ev.results[0][0].transcript;
        say('you (voice): ' + txt, true);
        game.request(txt);
      };
      recog.onend = function () { listening = false; hud.mic.classList.remove('live'); };
      recog.onerror = function () { listening = false; hud.mic.classList.remove('live'); say('mic unavailable here — type instead', true); };
      recog.start();
      listening = true;
      hud.mic.classList.add('live');
    } catch (e) { say('mic unavailable here — type instead', true); }
  }
  function stopListen() { if (recog && listening) try { recog.stop(); } catch (e) {} }

  // ---------- painter ----------
  var lastFont = '';
  function setFont(s, bold) {
    var f = (bold ? '600 ' : '') + s + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    if (f !== lastFont) { ctx.font = f; lastFont = f; }
  }
  function paint(ops) {
    var i, op;
    for (i = 0; i < ops.length; i++) {
      op = ops[i];
      switch (op.t) {
        case 'sky': {
          if (op.mode === 'code') { ctx.fillStyle = '#020803'; ctx.fillRect(0, 0, W, H); }
          else if (op.mode === 'white') { ctx.fillStyle = op.fogCol; ctx.fillRect(0, 0, W, H); }
          else {
            var hor = H * 0.5 + Math.tan(op.pitch) * (H * 0.62);
            var g = ctx.createLinearGradient(0, 0, 0, H);
            if (op.mode === 'neon') {
              g.addColorStop(0, '#04040a');
              g.addColorStop(Math.max(0.02, Math.min(0.98, hor / H)), '#0c0a18');
              g.addColorStop(1, op.fogCol);
            } else if (op.mode === 'city') {
              g.addColorStop(0, '#9fb2bf');
              g.addColorStop(Math.max(0.02, Math.min(0.98, hor / H)), '#cfd6da');
              g.addColorStop(1, op.fogCol);
            } else if (op.mode === 'day') {
              g.addColorStop(0, '#aebfc8');
              g.addColorStop(Math.max(0.02, Math.min(0.98, hor / H)), '#d6dadc');
              g.addColorStop(1, op.fogCol);
            } else { // dojo
              g.addColorStop(0, '#c9bda3');
              g.addColorStop(1, op.fogCol);
            }
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          }
          break;
        }
        case 'poly': {
          var p = op.p;
          ctx.globalAlpha = op.a == null ? 1 : op.a;
          ctx.fillStyle = op.c;
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          for (var k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'line': {
          ctx.globalAlpha = op.a; ctx.strokeStyle = op.c; ctx.lineWidth = op.wpx || 1;
          ctx.beginPath(); ctx.moveTo(op.x0, op.y0); ctx.lineTo(op.x1, op.y1); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'g': {
          ctx.globalAlpha = op.a;
          ctx.fillStyle = op.c;
          setFont(Math.round(op.s));
          ctx.fillText(op.ch, op.x, op.y);
          ctx.globalAlpha = 1;
          break;
        }
        case 'text': {
          ctx.globalAlpha = op.a; ctx.fillStyle = op.c; setFont(Math.round(op.s), true);
          ctx.fillText(op.str, op.x, op.y);
          ctx.globalAlpha = 1;
          break;
        }
        case 'vig': {
          var rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
          rg.addColorStop(0, 'rgba(0,0,0,0)');
          var c = C.hex2rgb(op.c);
          rg.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (op.a * 0.85).toFixed(3) + ')');
          ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
          break;
        }
        case 'flash': {
          ctx.globalAlpha = Math.min(reduceMotion ? 0.45 : 1, op.a);
          ctx.fillStyle = op.c; ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
          break;
        }
        case 'crack': {
          var s = Math.min(W, H) * 0.62, cx = W / 2, cy = H / 2;
          ctx.globalAlpha = op.a * 0.85;
          ctx.strokeStyle = '#101210'; ctx.lineWidth = 2;
          ctx.beginPath();
          for (var ci = 0; ci < op.segs.length; ci++) {
            var sg = op.segs[ci];
            ctx.moveTo(cx + sg[0] * s, cy + sg[1] * s);
            ctx.lineTo(cx + sg[2] * s, cy + sg[3] * s);
          }
          ctx.stroke();
          ctx.globalAlpha = op.a * 0.3; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'bars': {
          ctx.globalAlpha = op.a; ctx.fillStyle = '#000';
          var bh = H * 0.11;
          ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
          ctx.globalAlpha = 1;
          break;
        }
        case 'stamp': {
          ctx.globalAlpha = op.a;
          setFont(Math.round(Math.min(W, H) * 0.034), true);
          ctx.fillStyle = '#eafff2';
          ctx.fillText(op.str, W / 2, H * 0.18);
          ctx.strokeStyle = '#46ff7a'; ctx.lineWidth = 1;
          var tw = ctx.measureText(op.str).width;
          ctx.strokeRect(W / 2 - tw / 2 - 18, H * 0.18 - 26, tw + 36, 52);
          ctx.globalAlpha = 1;
          break;
        }
        case 'dot': {
          ctx.fillStyle = game.mode === 'code' ? '#bfffd6' : '#2a2a28';
          ctx.fillRect(W / 2 - 1.5, H / 2 - 1.5, 3, 3);
          break;
        }
      }
    }
    // riding instruments: speed bar + nitrous gauge, lower-right, only while mounted
    if (game.bike) drawRideHUD();
  }

  function drawRideHUD() {
    var bk = game.bike, B = C.BIKE;
    var spd = Math.abs(bk.speed), sf = Math.min(1, spd / B.BOOST), tf = bk.turbo / B.TURBO_MAX;
    var pad = Math.round(Math.min(W, H) * 0.03);
    var bw = Math.round(W * 0.2), bh = Math.round(H * 0.018);
    var x = W - pad - bw, y = H - pad - bh;
    var code = game.mode === 'code';
    // speed bar
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = code ? '#0a1f12' : '#1a1c22';
    ctx.fillRect(x, y, bw, bh);
    var sCol = bk.boosting ? '#ff2bd6' : (code ? '#46ff7a' : '#19e3ff');
    ctx.fillStyle = sCol; ctx.fillRect(x, y, bw * sf, bh);
    ctx.strokeStyle = code ? '#1f7d4a' : '#3a3d44'; ctx.lineWidth = 1; ctx.strokeRect(x, y, bw, bh);
    // nitrous gauge above it
    var y2 = y - bh - 5;
    ctx.fillStyle = code ? '#0a1f12' : '#1a1c22'; ctx.fillRect(x, y2, bw, bh);
    ctx.fillStyle = tf > 0.05 ? '#ffd166' : '#5a4a2a'; ctx.fillRect(x, y2, bw * tf, bh);
    ctx.strokeStyle = code ? '#1f7d4a' : '#3a3d44'; ctx.strokeRect(x, y2, bw, bh);
    // labels
    setFont(Math.round(Math.min(W, H) * 0.016), false);
    ctx.textAlign = 'right'; ctx.fillStyle = code ? '#7dffaf' : '#9aa0a8';
    ctx.fillText(Math.round(spd / B.BOOST * 180) + ' KM/H', x - 8, y + bh);
    ctx.fillText(bk.boosting ? 'TURBO' : 'NITRO', x - 8, y2 + bh);
    ctx.fillText('DIST ' + Math.round(bk.dist * 8) + ' m', x - 8, y2 - bh - 4);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }

  // ---------- HUD ----------
  function updateHUD() {
    hud.scene.textContent = 'THE CONSTRUCT \u2044 ' + game.sceneName + (game.mode === 'code' ? ' \u00b7 CODE' : '');
    var a = game.aim, label = '';
    if (game.bike) {
      // show the controls hint briefly after mounting, then let it fade so it
      // doesn't sit on screen the whole ride — once you've ridden a little, you know it
      if (game.bike.dist < 12) label = '[E] dismount \u00b7 W/S throttle \u00b7 Shift nitro';
      else label = '';
    } else if (a && game.state === 'play') {
      if (a.kind === 'gun') label = '[E] take ' + a.label;
      else if (a.kind === 'booth') label = '[E] answer';
      else if (a.kind === 'dummy') label = '[click] strike';
      else if (a.kind === 'bike') label = '[E] ride';
      else if (a.kind === 'katana') label = '[E] take katana';
    }
    if (hud.aim.textContent !== label) hud.aim.textContent = label;
    hud.aim.style.opacity = label ? 1 : 0;
  }

  // ---------- main loop ----------
  var acc = 0, lastT = 0, frameMs = [], renderScaleIdx = 0;
  var SCALES = [1, 0.85, 0.7, 0.55];
  function resize() {
    var cssW = window.innerWidth, cssH = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    scale = SCALES[renderScaleIdx];
    W = Math.max(320, Math.round(cssW * dpr * scale));
    H = Math.max(240, Math.round(cssH * dpr * scale));
    canvas.width = W; canvas.height = H;
    lastFont = '';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }
  function adapt(ms) {
    frameMs.push(ms);
    if (frameMs.length < 75) return;
    var sum = 0; for (var i = 0; i < frameMs.length; i++) sum += frameMs[i];
    var avg = sum / frameMs.length;
    frameMs.length = 0;
    if (avg > 23 && renderScaleIdx < SCALES.length - 1) {
      renderScaleIdx++; resize(); trimCrowd();
    } else if (avg < 12.5 && renderScaleIdx > 0) {
      renderScaleIdx--; resize();
    }
  }
  function trimCrowd() {
    var target = [40, 30, 20, 14][renderScaleIdx];
    game.crowdMax = target;
    var cw = game.crowd;
    if (cw && cw.peds.length > target) {
      while (cw.peds.length > target) {
        var pd = cw.peds.pop();
        var ix = game.scene.insts.indexOf(pd.it);
        if (ix >= 0) game.scene.insts.splice(ix, 1);
      }
    }
  }

  function buildInput() {
    var fwd = 0, strafe = 0;
    if (keys['w'] || keys['arrowup']) fwd += 1;
    if (keys['s'] || keys['arrowdown']) fwd -= 1;
    if (keys['a'] || keys['arrowleft']) strafe -= 1;
    if (keys['d'] || keys['arrowright']) strafe += 1;
    if (touch.mvId >= 0) {
      var dx = (touch.mvCX - touch.mvX) / 46, dy = (touch.mvCY - touch.mvY) / 46;
      strafe += C.clamp(dx, -1, 1); fwd += C.clamp(-dy, -1, 1);
    }
    var inp = {
      fwd: fwd, strafe: strafe,
      sprint: !!(keys['shift'] || touch.sprint),
      jumpEdge: !!edges[' '] || !!edges.spacebar || touch.jumpEdge,
      actionEdge: !!edges['e'] || touch.actEdge,
      fireEdge: fireEdge || touch.fireEdge,
      dyaw: mouseDX * SENS, dpitch: -mouseDY * SENS,
      any: anyEdge
    };
    if (consoleOpen) { inp.fwd = inp.strafe = 0; inp.jumpEdge = inp.actionEdge = inp.fireEdge = false; inp.dyaw = inp.dpitch = 0; }
    mouseDX = 0; mouseDY = 0; fireEdge = false; anyEdge = false;
    edges = {};
    touch.jumpEdge = touch.actEdge = touch.fireEdge = false;
    return inp;
  }

  function frame(t) {
    requestAnimationFrame(frame);
    if (!started) return;
    var t0 = performance.now();
    if (!lastT) lastT = t;
    var dt = Math.min(0.1, (t - lastT) / 1000);
    lastT = t;
    if (paused) {
      var opsP = C.render(game, W, H, game.time);
      paint(opsP);
      paintPauseOverlay();
      return;
    }
    acc += dt;
    var step = 1 / 60, n = 0;
    var inp = buildInput();
    while (acc >= step && n < 4) {
      game.update(inp, step);
      inp = { fwd: inp.fwd, strafe: inp.strafe, sprint: inp.sprint, dyaw: 0, dpitch: 0 };
      acc -= step; n++;
    }
    if (n === 4) acc = 0;
    // drain events
    var evs = game.drain();
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.name === 'say') { say(e.v); A.speak(e.v); }
      else if (e.name === 'ambience') A.setAmbience(e.v);
      else if (e.name === 'engine') A.engine(e.v.speed, e.v.throttle);
      else A.handle(e.name);
    }
    var ops = C.render(game, W, H, game.time);
    paint(ops);
    tickTeletype(dt);
    updateHUD();
    adapt(performance.now() - t0);
  }

  // ---------- pause + error overlay (ported hardening from STREET PROTOCOL) ----------
  function setPaused(v) {
    if (paused === v) return;
    paused = v;
    if (paused) {
      if (game && game.bike) A.engine(0, 0);
      A.handle('ringStop'); // freeze any ringing
      if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) {}
      if (window.speechSynthesis) try { window.speechSynthesis.pause(); } catch (e) {}
    } else {
      lastT = 0; acc = 0;
      if (window.speechSynthesis) try { window.speechSynthesis.resume(); } catch (e) {}
    }
  }
  function paintPauseOverlay() {
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#020803'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    setFont(Math.round(Math.min(W, H) * 0.04), true);
    ctx.fillStyle = '#46ff7a';
    ctx.fillText('PROGRAM PAUSED', W / 2, H / 2 - 8);
    setFont(Math.round(Math.min(W, H) * 0.018));
    ctx.fillStyle = '#2f9e57';
    ctx.fillText('click to resume', W / 2, H / 2 + Math.min(W, H) * 0.05);
  }
  function showError(msg) {
    try {
      var d = document.getElementById('errlay');
      if (!d) {
        d = document.createElement('div'); d.id = 'errlay';
        d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(2,8,3,.92);color:#9affc0;' +
          'font:13px/1.7 ui-monospace,Menlo,Consolas,monospace;display:flex;flex-direction:column;' +
          'align-items:center;justify-content:center;text-align:center;padding:24px;letter-spacing:.04em';
        document.body.appendChild(d);
      }
      d.innerHTML = '<div style="color:#46ff7a;letter-spacing:.3em;margin-bottom:14px">CONSTRUCT FAULT</div>' +
        '<div style="max-width:70ch;opacity:.85">' + String(msg).replace(/[<>&]/g, ' ') + '</div>' +
        '<div style="margin-top:18px;opacity:.5">reload the page to recompile</div>';
      d.style.display = 'flex';
    } catch (e) {}
  }

  // ---------- boot ----------
  function start() {
    if (started) return;
    started = true;
    hud.boot.classList.add('gone');
    setTimeout(function () { hud.boot.style.display = 'none'; }, 700);
    A.init();
    A.setAmbience('void');
    if (!touch.active) tryLock();
    if (window.speechSynthesis) try { window.speechSynthesis.getVoices(); } catch (e) {}
  }

  function chip(label, req) {
    var b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = label;
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      say('you: ' + (req || label), true);
      game.request(req || label);
      A.handle('chirp');
    });
    return b;
  }

  function init() {
    canvas = document.getElementById('c');
    ctx = canvas.getContext('2d');
    game = new C.Game();
    G.GAME = game;
    hud.boot = document.getElementById('boot');
    hud.scene = document.getElementById('scene');
    hud.aim = document.getElementById('aim');
    hud.log = document.getElementById('log');
    hud.inRow = document.getElementById('inrow');
    hud.input = document.getElementById('cmd');
    hud.chips = document.getElementById('chips');
    hud.hint = document.getElementById('lookhint');
    hud.mic = document.getElementById('mic');

    var defs = [['weapons', 'weapons'], ['dojo', 'dojo'], ['rooftop jump', 'rooftop'], ['motorcycle', 'motorcycle'], ['katana', 'katana'], ['city street', 'city street'], ['neon mile', 'neon'], ['a chair', 'a chair'], ['clear', 'clear']];
    for (var i = 0; i < defs.length; i++) hud.chips.appendChild(chip(defs[i][0], defs[i][1]));

    window.addEventListener('keydown', function (e) {
      if (consoleOpen) {
        if (e.key === 'Enter') { submitConsole(); e.preventDefault(); }
        else if (e.key === 'Escape') closeConsole();
        return;
      }
      if ([' ', 'arrowup', 'arrowdown'].indexOf(e.key.toLowerCase()) >= 0) e.preventDefault();
      key(e, true);
    });
    window.addEventListener('keyup', function (e) { if (!consoleOpen) key(e, false); });
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', function () { dragging = false; });
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('resize', resize);
    bindTouch();

    hud.mic.addEventListener('click', function () { if (!listening) startListen(); else stopListen(); });
    if (!speechAvailable()) hud.mic.style.display = 'none';
    document.getElementById('go').addEventListener('click', start);
    hud.boot.addEventListener('click', start);

    // touch buttons
    var tb = document.getElementById('tbtns');
    function tbtn(label, fn, hold) {
      var b = document.createElement('button'); b.className = 'tb'; b.textContent = label;
      b.addEventListener('touchstart', function (e) { e.preventDefault(); e.stopPropagation(); fn(true); }, { passive: false });
      if (hold) b.addEventListener('touchend', function (e) { e.preventDefault(); fn(false); });
      tb.appendChild(b);
    }
    tbtn('JUMP', function () { touch.jumpEdge = true; });
    tbtn('USE', function () { touch.actEdge = true; });
    tbtn('FIRE', function () { touch.fireEdge = true; });
    tbtn('RUN', function (d) { touch.sprint = d; }, true);
    tbtn('CODE', function () { game.toggleCode(); });
    tbtn('ASK', function () { openConsole(); });

    resize();
    // engineering hardening: auto-pause on blur/hidden, resume on click; surface runtime errors
    window.addEventListener('blur', function () { if (started) setPaused(true); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && started) setPaused(true); });
    window.addEventListener('error', function (ev) { showError(ev.message || 'unknown error'); });
    window.addEventListener('unhandledrejection', function (ev) { showError((ev.reason && ev.reason.message) || 'promise rejection'); });
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
