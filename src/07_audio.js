/* THE CONSTRUCT — 07_audio.js — WebAudio synth + operator voice (browser); inert in Node */
(function (G) {
  'use strict';
  var C = G.C;
  var hasWindow = typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined' || (typeof window !== 'undefined' && typeof window.webkitAudioContext !== 'undefined');

  var A = C.audio = { muted: false, ready: false };

  if (!hasWindow) {
    A.init = function () {}; A.handle = function () {}; A.setAmbience = function () {};
    A.speak = function () {}; A.toggleMute = function () { A.muted = !A.muted; return A.muted; };
    return;
  }

  var ctx = null, master = null, ambGain = null, ambNodes = [], ringTimer = null;

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
      A.ready = true;
    } catch (e) { A.ready = false; }
  };
  A.toggleMute = function () {
    A.muted = !A.muted;
    if (master) master.gain.value = A.muted ? 0 : 0.6;
    if (A.muted && window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) {}
    return A.muted;
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
      if (name === 'wind') { loopNoise('bandpass', 420, 0.6, 0.5, 0.17, 220); loopNoise('lowpass', 180, 0.5, 0.25, 0.31, 70); }
      else if (name === 'crowd') { loopNoise('lowpass', 320, 0.4, 0.35, 0.6, 60); loopNoise('bandpass', 900, 1.4, 0.12, 1.3, 240); }
      else if (name === 'dojo') { loopNoise('lowpass', 110, 0.5, 0.16); }
      else { loopNoise('lowpass', 90, 0.4, 0.08); } // void hum
      ambGain.gain.linearRampToValueAtTime(name === 'void' ? 0.12 : 0.3, t1 + 1.4);
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
      case 'whoosh': hiss(0.55, 0.5, 220, 2400, 1.1); break;
      case 'materialize': for (var i = 0; i < 7; i++) blip(700 + i * 180 + Math.random() * 90, 0.07, 0.05, 'triangle', i * 0.045); hiss(0.6, 0.12, 1400, 4200, 2); break;
      case 'scene': hiss(0.8, 0.35, 160, 1800, 1); break;
      case 'codeOn': hiss(0.4, 0.3, 3000, 300, 2); blip(140, 0.3, 0.18, 'sine'); break;
      case 'codeOff': hiss(0.4, 0.3, 300, 3000, 2); break;
      case 'jump': hiss(0.18, 0.18, 500, 1400, 1); break;
      case 'land': thump(150, 0.12, 0.22); break;
      case 'step':
        var f0 = 700 + Math.random() * 300;
        hiss(0.045, 0.16, f0, f0 * 0.6, 2.4); break;
      case 'falling': hiss(2.2, 0.4, 300, 1400, 0.8); break;
      case 'impactBig':
        thump(95, 0.5, 0.9); thump(52, 0.9, 0.7, 0.03);
        hiss(0.3, 0.5, 200, 80, 1);
        blip(3050, 2.8, 0.05, 'sine', 0.15); // tinnitus
        break;
      case 'impactSmall': thump(110, 0.25, 0.5); hiss(0.15, 0.3, 400, 150, 1); break;
      case 'heart': thump(64, 0.16, 0.5); thump(58, 0.13, 0.38, 0.18); break;
      case 'heartSoft': thump(64, 0.12, 0.16); thump(58, 0.1, 0.12, 0.16); break;
      case 'rise': hiss(1.2, 0.15, 120, 600, 0.8); break;
      case 'success': blip(523, 0.18, 0.12, 'triangle'); blip(784, 0.25, 0.12, 'triangle', 0.12); blip(1046, 0.4, 0.1, 'triangle', 0.24); break;
      case 'shot': thump(180, 0.07, 0.7); hiss(0.12, 0.8, 2500, 300, 0.7); hiss(0.5, 0.2, 700, 120, 1, 0.02); break;
      case 'pickup': blip(660, 0.06, 0.12, 'square'); blip(990, 0.08, 0.1, 'square', 0.06); break;
      case 'punch': thump(140, 0.09, 0.5); hiss(0.08, 0.35, 900, 300, 1.5); blip(220, 0.12, 0.1, 'triangle', 0.02); break;
      case 'swish': hiss(0.16, 0.22, 1200, 400, 1.6); break;
      case 'freeze': thump(70, 0.4, 0.6); if (ambGain) ambGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12); break;
      case 'resume': hiss(0.3, 0.2, 200, 1500, 1); if (ambGain) ambGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.8); break;
      case 'ring': if (!ringTimer) { ring(); ringTimer = setInterval(ring, 2100); } break;
      case 'ringStop': if (ringTimer) { clearInterval(ringTimer); ringTimer = null; } break;
      case 'exitFlash': hiss(0.5, 0.4, 2000, 200, 1); break;
      case 'tick': blip(1900 + Math.random() * 400, 0.018, 0.03, 'square'); break;
      case 'chirp': blip(1240, 0.05, 0.08, 'square'); break;
    }
  };

  A.speak = function (text) {
    if (A.muted) return;
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      var u = new SpeechSynthesisUtterance(text.replace(/\u00b7/g, ','));
      u.rate = 1.0; u.pitch = 0.72; u.volume = 0.85;
      var vs = window.speechSynthesis.getVoices();
      for (var i = 0; i < vs.length; i++) {
        if (/en[-_]/i.test(vs[i].lang) && /male|David|Daniel|Alex|Google UK English Male/i.test(vs[i].name)) { u.voice = vs[i]; break; }
      }
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
