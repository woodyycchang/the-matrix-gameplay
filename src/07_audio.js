/* THE CONSTRUCT — 07_audio.js — WebAudio synth + operator voice (browser); inert in Node */
(function (G) {
  'use strict';
  var C = G.C;
  var hasWindow = typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined' || (typeof window !== 'undefined' && typeof window.webkitAudioContext !== 'undefined');

  var A = C.audio = { muted: false, ready: false };

  if (!hasWindow) {
    A.init = function () {}; A.handle = function () {}; A.setAmbience = function () {};
    A.speak = function () {}; A.engine = function () {}; A.toggleMute = function () { A.muted = !A.muted; return A.muted; };
    return;
  }

  var ctx = null, master = null, ambGain = null, ambNodes = [], ringTimer = null;
  // engine drone path (ported from STREET PROTOCOL; gain curve retuned down so idle is quiet)
  var engOsc = null, engSub = null, engFilt = null, engGain = null, engOn = false;

  function noiseBuf(sec) {
    var b = ctx.createBuffer(1, Math.max(1, (sec * ctx.sampleRate) | 0), ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  var _noise = null;
  function noise() { return _noise || (_noise = noiseBuf(2)); }

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
      ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
      // engine drone: sawtooth + sub sine through a lowpass, idle silent until ridden
      engGain = ctx.createGain(); engGain.gain.value = 0;
      engFilt = ctx.createBiquadFilter(); engFilt.type = 'lowpass'; engFilt.frequency.value = 200;
      engOsc = ctx.createOscillator(); engOsc.type = 'sawtooth'; engOsc.frequency.value = 44;
      engSub = ctx.createOscillator(); engSub.type = 'sine'; engSub.frequency.value = 22;
      engOsc.connect(engFilt); engSub.connect(engFilt); engFilt.connect(engGain); engGain.connect(master);
      engOsc.start(); engSub.start();
      A.ready = true;
    } catch (e) { A.ready = false; }
  };
  A.toggleMute = function () {
    A.muted = !A.muted;
    if (master) master.gain.value = A.muted ? 0 : 0.6;
    try { musFadeStart(); } catch (e) {}   // the copied bed follows the mute too
    return A.muted;
  };

  // continuous engine voice. speed in m/s (0..~34), throttle 0..1.
  // Retuned quieter than the source: idle is barely there, peak gain capped well below the original.
  A.engine = function (speed, throttle) {
    if (!ctx || !engGain) return;
    var sp = Math.max(0, Math.min(34, speed || 0)), th = Math.max(0, Math.min(1, throttle || 0));
    var now = ctx.currentTime;
    engOsc.frequency.setTargetAtTime(40 + sp * 2.2, now, 0.06);
    engSub.frequency.setTargetAtTime(20 + sp * 1.1, now, 0.06);
    engFilt.frequency.setTargetAtTime(150 + sp * 24 + th * 180, now, 0.05);
    // idle ~0.0015, climbs with speed+throttle, hard cap 0.014 (source peaked at 0.022 and read as "too loud")
    var g = A.muted ? 0 : Math.min(0.018, 0.002 + sp * 0.00034 + th * 0.0038);
    engGain.gain.setTargetAtTime(g, now, 0.05);
  };
  function engineStart() { if (engGain && ctx) { engOn = true; engGain.gain.setTargetAtTime(A.muted ? 0 : 0.0015, ctx.currentTime, 0.08); } }
  function engineStop() { if (engGain && ctx) { engOn = false; engGain.gain.setTargetAtTime(0, ctx.currentTime, 0.18); } }

  // ---------- generative sci-fi bed (research-grounded) ----------
  // Detuned saw pad + sub + faint fifth through a lowpass; TWO unsynced
  // slow LFOs (0.07 Hz filter / 0.11 Hz detune drift) whose cycles never
  // align, so the bed evolves forever without repeating. No melody, no
  // rhythm - dark/space ambient by the book. The VOID stays SILENT.
  var gen = null, genSceneGain = 0;
  var MUS = {
    'void':   { g: 0,     root: 55, cut: 300 },
    'construct': { g: 0,  root: 55, cut: 300 },   // the void's real sceneName - SILENCE holds
    'neon':   { g: 0.05,  root: 55, cut: 430 },
    'city':   { g: 0.045, root: 49, cut: 320 },
    'dojo':   { g: 0.03,  root: 41, cut: 250 },
    'armory': { g: 0.03,  root: 41, cut: 240 },
    'rooftop':{ g: 0.04,  root: 65, cut: 380 }
  };
  function genInit() {
    if (gen || !ctx) return;
    var g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; lp.Q.value = 0.7; lp.connect(g);
    var o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
    var o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.7;   // beating detune
    var sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = 27.5;
    var fif = ctx.createOscillator(); fif.type = 'triangle'; fif.frequency.value = 82.4;
    var fg = ctx.createGain(); fg.gain.value = 0.22; fif.connect(fg); fg.connect(lp);
    o1.connect(lp); o2.connect(lp); sub.connect(lp);
    var l1 = ctx.createOscillator(); l1.frequency.value = 0.07;                         // unsynced LFO #1 -> filter
    var l1g = ctx.createGain(); l1g.gain.value = 90; l1.connect(l1g); l1g.connect(lp.frequency);
    var l2 = ctx.createOscillator(); l2.frequency.value = 0.11;                         // unsynced LFO #2 -> detune drift
    var l2g = ctx.createGain(); l2g.gain.value = 1.2; l2.connect(l2g); l2g.connect(o2.frequency);
    o1.start(); o2.start(); sub.start(); fif.start(); l1.start(); l2.start();
    gen = { g: g, lp: lp, o1: o1, o2: o2, sub: sub, fif: fif };
  }
  function genBed(name) {
    if (!ctx) return;
    genInit();
    var p = MUS[name] || { g: 0.035, root: 49, cut: 300 };
    genSceneGain = p.g;
    var t = ctx.currentTime;
    gen.o1.frequency.setTargetAtTime(p.root, t, 2.5);
    gen.o2.frequency.setTargetAtTime(p.root + 0.7, t, 2.5);
    gen.sub.frequency.setTargetAtTime(p.root / 2, t, 2.5);
    gen.fif.frequency.setTargetAtTime(p.root * 1.498, t, 2.5);
    gen.lp.frequency.setTargetAtTime(p.cut, t, 2.0);
    gen.g.gain.setTargetAtTime((musOn && !A.muted) ? p.g : 0, t, 2.2);   // slow swell, never a cut
  };
  function genBedStop() { if (gen && ctx) gen.g.gain.setTargetAtTime(0, ctx.currentTime, 0.8); }

  // ---------- COPIED sci-fi bed: Stellardrone, "Light Years" (CC BY) ----------
  // The user's ruling: immersion comes from a properly COPIED work. Streams
  // per-scene from the Internet Archive item (license on the item page:
  // Attribution 3.0). The generative engine above survives ONLY as an
  // automatic fallback when the stream cannot load. Credit shown on boot.
  // ---------- UNIVERSAL copied bed: Stellardrone, "Light Years" (CC BY) ----------
  // One continuous album playlist from the moment you hit ENTER, everywhere -
  // INCLUDING the void: the user's directive supersedes the scene-silence
  // ruling for MUSIC (SFX silence in the void is unchanged). Ten tracks in
  // sequence, wrapping - ~50 minutes before anything repeats. Stream errors
  // skip to the next track; three straight failures fall back to the
  // generative engine above. Attribution shown on the boot screen.
  var MUSBASE = 'https://archive.org/download/Stellardrone-LightYears/Stellardrone%20-%20Light%20Years%20-%20';
  var MUSLIST = ['01%20Red%20Giant.mp3','02%20Airglow.mp3','03%20Eternity.mp3','04%20Light%20Years.mp3','05%20In%20Time.mp3','06%20Cepheid.mp3','07%20Ultra%20Deep%20Field.mp3','08%20Nightscape.mp3','09%20Eternity%20%28Reprise%29.mp3','10%20A%20Moment%20Of%20Stillness.mp3'];
  var MUSVOL = 0.14;
  var musEl = null, musIdx = 0, musErr = 0, musWant = 0, musOn = true, musFadeT = null;
  function musTarget() { return (musOn && !A.muted) ? musWant : 0; }
  function musFadeStart() { if (!musFadeT) musFadeT = setInterval(function () {
    if (!musEl) { clearInterval(musFadeT); musFadeT = null; return; }
    var t = musTarget(), v = musEl.volume, d = t - v;
    if (Math.abs(d) < 0.004) { musEl.volume = t; clearInterval(musFadeT); musFadeT = null; return; }
    musEl.volume = v + d * 0.12;
  }, 60); }
  function musLoad() { if (!musEl) return; musEl.src = MUSBASE + MUSLIST[musIdx]; try { musEl.load(); } catch (e) {} }
  function musNext() { musIdx = (musIdx + 1) % MUSLIST.length; musLoad(); if (musEl) { try { musEl.play().catch(function () {}); } catch (e) {} } }
  function musMake() {
    musEl = new Audio(); musEl.preload = 'auto'; musEl.volume = 0; musEl.loop = false;
    musEl.addEventListener('ended', musNext);
    musEl.addEventListener('playing', function () { musErr = 0; genBedStop(); });   // stream landed: dissolve the overture
    musEl.addEventListener('error', function () {
      musErr++;
      if (musErr >= 3) { try { musEl.pause(); } catch (e) {} musEl = null; genBed('city'); return; }
      musNext();
    });
  }
  // AUTOPLAY AT LOAD, to the letter of the law: the moment the page loads we
  // buffer the first track AND attempt play(). Browsers reject audible
  // autoplay before any gesture (NotAllowedError - their policy, not ours);
  // where the browser permits it (it LEARNS per user per site - the Media
  // Engagement Index), music starts with ZERO interaction. Where it refuses,
  // the FIRST key, click or touch anywhere starts it instantly - and regular
  // play teaches Chrome to grant true autoplay here. Data-saver skips to ENTER.
  function musArm() {
    function once() {
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('keydown', once, true);
      document.removeEventListener('touchstart', once, true);
      musKick();
    }
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('keydown', once, true);
    document.addEventListener('touchstart', once, true);
  }
  function musKick() {
    if (!musEl) { musMake(); musLoad(); }
    musWant = MUSVOL;
    var p = null;
    try { p = musEl.play(); } catch (e) {}
    if (p && p.then) p.then(function () { musFadeStart(); }, function () { musArm(); });
    else musFadeStart();
  }
  try {
    var _mc = navigator.connection || {};
    if (!(_mc.saveData || /(^|-)2g/.test(String(_mc.effectiveType || '')))) musKick();
  } catch (e) {}
  A.music = function () {
    if (musEl && !musEl.paused) { musWant = MUSVOL; musFadeStart(); return; }   // already cruising: autoplay landed at load
    if (!musEl) { musMake(); musLoad(); }
    musWant = MUSVOL;
    genBed('city');   // INSTANT overture: zero-latency WebAudio covers any buffer gap, dissolving on 'playing'
    try { musEl.play().catch(function () {}); } catch (e) {}
    musFadeStart();
  };
  A.musicToggle = function () {
    musOn = !musOn;
    if (musEl) musFadeStart();
    if (gen && ctx) gen.g.gain.setTargetAtTime((musOn && !A.muted) ? genSceneGain : 0, ctx.currentTime, 1.2);
    return musOn;
  };

  function env(g, t0, a, peak, d, sustain) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t0 + a + d);
  }
  function blip(freq, dur, vol, type, when) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    env(g, t0, 0.004, vol, dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function hiss(dur, vol, f0, f1, q, when) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (when || 0);
    var s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    var g = ctx.createGain(); env(g, t0, 0.01, vol, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.1);
  }
  function thump(freq, dur, vol, when) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.4), t0 + dur);
    env(g, t0, 0.003, vol, dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
  }


  // a gunshot-style crack: near-instant wideband burst + quick body, much snappier than hiss
  function crack(vol, when) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (when || 0);
    var s = ctx.createBufferSource(); s.buffer = noise();
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 700;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);                       // no attack ramp — instant
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + 0.12);
  }

  function clearAmbience() {
    for (var i = 0; i < ambNodes.length; i++) { try { ambNodes[i].stop ? ambNodes[i].stop() : ambNodes[i].disconnect(); } catch (e) {} }
    ambNodes = [];
    if (ambGain) ambGain.gain.cancelScheduledValues(ctx ? ctx.currentTime : 0);
  }

  A.setAmbience = function (name) {
    if (!ctx) return;
    clearAmbience();
    var t0 = ctx.currentTime;
    ambGain.gain.setValueAtTime(ambGain.gain.value, t0);
    ambGain.gain.linearRampToValueAtTime(0.0001, t0 + 0.2);
    setTimeout(function () {
      if (!ctx) return;
      var t1 = ctx.currentTime;
      function loopNoise(filterType, freq, q, vol, lfoRate, lfoDepth) {
        var s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true;
        var f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
        var g = ctx.createGain(); g.gain.value = vol;
        if (lfoRate) {
          var lfo = ctx.createOscillator(), lg = ctx.createGain();
          lfo.frequency.value = lfoRate; lg.gain.value = lfoDepth;
          lfo.connect(lg); lg.connect(f.frequency); lfo.start(); ambNodes.push(lfo);
        }
        s.connect(f); f.connect(g); g.connect(ambGain);
        s.start(); ambNodes.push(s, g, f);
      }
      if (name === 'wind') { loopNoise('bandpass', 420, 0.6, 0.16, 0.17, 220); loopNoise('lowpass', 180, 0.5, 0.09, 0.31, 70); }
      else if (name === 'neon') { loopNoise('lowpass', 70, 0.6, 0.16, 0.13, 26); loopNoise('bandpass', 560, 3.5, 0.07, 0.21, 120); }
      else if (name === 'crowd') { loopNoise('lowpass', 320, 0.4, 0.14, 0.6, 60); loopNoise('bandpass', 900, 1.4, 0.05, 1.3, 240); }
      else if (name === 'dojo') { loopNoise('lowpass', 110, 0.5, 0.16); }
      else { loopNoise('lowpass', 90, 0.4, 0.08); } // void hum
      ambGain.gain.linearRampToValueAtTime(name === 'void' ? 0 : 0.22, t1 + 1.4);   // the Construct is SILENT - the film's void has no bed
    }, 220);
  };

  function ring() {
    if (!ctx) return;
    for (var i = 0; i < 2; i++) {
      blip(1180, 0.05, 0.10, 'square', i * 0.07);
      blip(880, 0.05, 0.10, 'square', i * 0.07 + 0.035);
    }
  }

  A.handle = function (name) {
    if (!ctx || A.muted) {
      if (name === 'ring' && !ctx) {} // ignore pre-init
      if (!ctx) return;
    }
    switch (name) {
      case 'whoosh': hiss(0.55, 0.34, 2200, 260, 1.1); break;
      case 'materialize': for (var i = 0; i < 3; i++) blip(700 + i * 180 + Math.random() * 90, 0.07, 0.12, 'triangle', i * 0.045); hiss(0.6, 0.18, 1400, 4200, 2); break;
      case 'scene': hiss(0.8, 0.35, 160, 1800, 1); break;
      case 'codeOn': hiss(0.45, 0.26, 300, 3200, 2); blip(180, 0.18, 0.12, 'sine'); blip(360, 0.22, 0.1, 'sine', 0.06); break;
      case 'codeOff': hiss(0.4, 0.24, 3200, 300, 2); blip(360, 0.16, 0.08, 'sine'); break;
      case 'jump': break;   // CUT: the jump is visible; LAND carries the physics
      case 'land': thump(150, 0.12, 0.22); break;
      case 'step':
        var f0 = 700 + Math.random() * 300;
        hiss(0.045, 0.16, f0, f0 * 0.6, 2.4); break;
      case 'falling': hiss(2.2, 0.4, 300, 1400, 0.8); break;
      case 'impactBig':
        thump(95, 0.5, 0.72); thump(52, 0.9, 0.56, 0.03);
        hiss(0.3, 0.4, 200, 80, 1);
        blip(3050, 2.8, 0.05, 'sine', 0.15); // tinnitus
        break;
      case 'impactSmall': thump(110, 0.25, 0.34); hiss(0.15, 0.22, 400, 150, 1); break;
      case 'heart': thump(64, 0.16, 0.34); thump(58, 0.13, 0.26, 0.18); break;
      case 'heartSoft': thump(64, 0.12, 0.16); thump(58, 0.1, 0.12, 0.16); break;
      case 'rise': hiss(1.2, 0.15, 120, 600, 0.8); break;
      case 'success': blip(523, 0.18, 0.12, 'triangle'); blip(784, 0.25, 0.12, 'triangle', 0.12); blip(1046, 0.4, 0.1, 'triangle', 0.24); break;
      case 'shot': crack(0.5); thump(120, 0.05, 0.4); hiss(0.18, 0.10, 500, 90, 1.2, 0.02); break;
      case 'pickup': break;   // CUT: the weapon visibly appears in hand; 'a ding every pickup undermines immersion'
      case 'pickupBlade': hiss(0.18, 0.22, 1800, 5200, 2.2); blip(1320, 0.06, 0.08, 'triangle', 0.04); break;
      case 'mount': engineStart(); break;    // engine ramp IS the signal - decorations trimmed
      case 'dismount': engineStop(); break;
      case 'scrape': hiss(0.13, 0.22, 1200, 500, 1.1); thump(90, 0.06, 0.12); break;
      case 'slash': hiss(0.14, 0.3, 1400, 500, 1.8); blip(300, 0.08, 0.08, 'sawtooth', 0.01); break;
      case 'swishBlade': hiss(0.18, 0.2, 1300, 420, 1.7); break;
      case 'punch': thump(140, 0.09, 0.34); hiss(0.08, 0.24, 900, 300, 1.5); blip(220, 0.12, 0.08, 'triangle', 0.02); break;
      case 'swish': hiss(0.16, 0.22, 1200, 400, 1.6); break;
      case 'freeze': thump(90, 0.16, 0.32); blip(140, 0.05, 0.06, 'sine'); if (ambGain) ambGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.1); break;
      case 'resume': hiss(0.3, 0.2, 200, 1500, 1); if (ambGain) ambGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.8); break;
      case 'ring': if (!ringTimer) { ring(); ringTimer = setInterval(ring, 2100); } break;
      case 'ringStop': if (ringTimer) { clearInterval(ringTimer); ringTimer = null; } break;
      case 'exitFlash': hiss(0.5, 0.4, 2000, 200, 1); break;
      case 'tick': break;   // CUT (minimalism): duplicates visible teletype; highest-frequency sound = noise floor
      case 'chirp': blip(1240, 0.05, 0.08, 'square'); break;
    }
  };

  // the operator speaks in the sigma register: deepest male voice on the device,
  // pitch dropped, pace unhurried. Voice inventory differs per OS/browser, so we
  // hunt a ranked preference list and fall back to any English voice + low pitch.
  // COPY-ONLY VOICE POLICY: the operator speaks with the copied Kokoro voice,
  // as-is, or not at all. No system-voice fallback, no constructed/processed
  // speech of any kind. Until the copy is ready, silence - text carries the line.
  A.ttsReady = false;
  A.playPCM = function (f32, sr) {
    if (!ctx) return;
    try {
      // COPY-ONLY playback TRANSPORT (not processing). Two rules:
      // 1) never behead a line mid-word: if a line is speaking, the NEW line
      //    waits in a depth-1 queue (older pending lines are replaced, so
      //    there is no backlog lag either); it plays the instant this one ends.
      // 2) forced interrupts never hard-cut: they ride a ~12 ms fader to zero
      //    first - preventing the click WE would otherwise create.
      if (A._ttsNode) { A._ttsQ = { f: f32, sr: sr }; return; }
      var buf = ctx.createBuffer(1, f32.length, sr);
      buf.copyToChannel(f32, 0);
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain(); g.gain.value = 1.0;   // unity fader - transport, not an effect
      src.connect(g); g.connect(master);
      src.onended = function () {
        A._ttsNode = null;
        var q = A._ttsQ; A._ttsQ = null;
        if (q) A.playPCM(q.f, q.sr);
      };
      src.start();
      A._ttsNode = { src: src, g: g };
    } catch (e) {}
  };
  A.stopVoice = function () {   // the ONLY sanctioned interrupt: fade 12 ms, then stop
    var n = A._ttsNode; if (!n || !ctx) return;
    try { n.g.gain.setTargetAtTime(0, ctx.currentTime, 0.004); n.src.stop(ctx.currentTime + 0.015); } catch (e) {}
    A._ttsNode = null; A._ttsQ = null;
  };
  A.speak = function () {
    // ALL human voice DISABLED by user directive. Every line is text; the world
    // (SFX, engine, ambience) still sounds. Transport code below is retained but
    // unreachable - re-enabling is one line in the neural-ready handler.
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
