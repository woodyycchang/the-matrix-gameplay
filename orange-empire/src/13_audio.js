// ============ 13 audio — all sound synthesized, nothing sampled ============
const AUDIO = (() => {
  const A = { ctx: null, on: false, master: null, noiseBuf: null,
    bar: null, radio: null, amb: null, eng: null,
    station: 0, stations: ['OFF', 'KGFJ \u2014 SWING', 'STATIC', '??? \u2014 1490kc'],
    numbersHeld: 0, duck: 1 };
  const headless = ENV.headless;
  const mf = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function unlock() {
    if (headless || A.on) return;
    try {
      const AC = WIN.AudioContext || WIN.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      const c = A.ctx;
      A.master = c.createGain(); A.master.gain.value = G.muted ? 0 : 0.8; A.master.connect(c.destination);
      // shared noise buffer
      const len = c.sampleRate * 2; const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noiseBuf = buf;
      buildAmbience(); buildEngine(); buildBarJazz(); buildRadio();
      A.on = true;
      dlog('audio:on');
    } catch (e) { dlog('audio:fail'); }
  }
  function setMuted(m) { G.muted = m; if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.8, A.ctx.currentTime, 0.05); }

  function noiseSrc(out, { f0 = 1000, q = 1, type = 'bandpass', gain = 1, dur = 0.1, when = 0, a = 0.006 } = {}) {
    const c = A.ctx, t = c.currentTime + when;
    const src = c.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f0; fl.Q.value = q;
    const atk = Math.min(a, dur * 0.35);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + atk);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(fl).connect(g).connect(out); src.start(t); src.stop(t + dur + 0.05);
  }
  function blip(out, { f = 440, type = 'sine', gain = 0.2, a = 0.005, dur = 0.12, when = 0, glide = 0 } = {}) {
    const c = A.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + glide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------------- generative swing combo ----------------
  // F blues, 8 bars, 152 bpm. Bar 7 (index 6) carries the skip.
  function makeJazz(out, { transpose = 0, level = 1 } = {}) {
    const c = A.ctx;
    const bus = c.createGain(); bus.gain.value = level;
    const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200;
    bus.connect(tone).connect(out);
    const BEAT = 60 / 152, BAR = BEAT * 4, LOOP = BAR * 8;
    const CH = [ // [bass roots per beat (midi)], [comp chord midi notes]
      { b: [41, 45, 48, 47], ch: [57, 60, 63] },  // F7
      { b: [41, 43, 45, 46], ch: [57, 60, 63] },  // F7 walk up
      { b: [46, 50, 53, 51], ch: [58, 62, 65] },  // Bb7
      { b: [41, 45, 48, 45], ch: [57, 60, 63] },  // F7
      { b: [48, 52, 55, 53], ch: [58, 60, 64] },  // C7
      { b: [46, 50, 53, 50], ch: [58, 62, 65] },  // Bb7
      { b: [41, 45, 46, 47], ch: [57, 60, 63] },  // F7  <- the skip lives here
      { b: [48, 47, 45, 43], ch: [58, 60, 64] },  // C7 turnaround
    ];
    const RIFF = [ // [barIdx, beat, midi, dur]
      [0, 0, 72, 0.7], [0, 1.66, 74, 0.3], [0, 2, 76, 1.4],
      [1, 2, 77, 0.5], [1, 2.66, 76, 0.3], [1, 3, 72, 0.8],
      [2, 0, 74, 0.7], [2, 1.66, 72, 0.3], [2, 2, 70, 1.2],
      [4, 0, 79, 0.6], [4, 1, 77, 0.4], [4, 1.66, 76, 0.3], [4, 2, 72, 1.3],
      [6, 0, 72, 0.45], [6, 0.66, 72, 0.18], [6, 1.06, 72, 0.18], // <- stutter: same note thrice, late
      [6, 2.2, 70, 0.9],
      [7, 0, 69, 0.6], [7, 2, 67, 1.2],
    ];
    const st = { next: 0, t0: 0, running: false };
    function scheduleBar(barIdx, when) {
      const ch = CH[barIdx % 8];
      // walking bass: quarter notes
      for (let b = 0; b < 4; b++) {
        blip(bus, { f: mf(ch.b[b] + transpose), type: 'triangle', gain: 0.16, dur: BEAT * 0.92, when: when + b * BEAT - c.currentTime });
      }
      // ride: swing pattern 1, 2, 2&, 3, 4, 4&
      for (const [bt, gn] of [[0, 0.05], [1, 0.06], [1.66, 0.035], [2, 0.05], [3, 0.06], [3.66, 0.035]]) {
        noiseSrc(bus, { f0: 6200, q: 1.4, gain: gn, dur: 0.09, when: when + bt * BEAT - c.currentTime });
      }
      // comp stabs on 1& and 3 (Charleston-ish)
      for (const bt of [0.66, 2]) {
        for (const n of ch.ch) blip(bus, { f: mf(n + transpose), type: 'square', gain: 0.028, dur: 0.16, when: when + bt * BEAT - c.currentTime, a: 0.002 });
      }
      // skip artifacts on bar 7: a pop, and the ride drops a stitch
      if (barIdx % 8 === 6) {
        noiseSrc(bus, { f0: 2400, q: 0.6, gain: 0.10, dur: 0.03, when: when + 0.62 * BEAT - c.currentTime });
        noiseSrc(bus, { f0: 2400, q: 0.6, gain: 0.08, dur: 0.03, when: when + 1.02 * BEAT - c.currentTime });
      }
      // lead riff (muted-horn-ish: saw through bandpass via per-note filter)
      for (const [bi, bt, n, dr] of RIFF) {
        if (bi !== barIdx % 8) continue;
        const t = when + bt * BEAT;
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mf(n + transpose);
        const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = mf(n + transpose) * 1.6; fl.Q.value = 2.2;
        const vib = c.createOscillator(); vib.frequency.value = 5.4; const vg = c.createGain(); vg.gain.value = 4.5;
        vib.connect(vg).connect(o.frequency);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.085, t + 0.03); g.gain.setTargetAtTime(0.0001, t + dr * BEAT * 0.8, 0.06);
        o.connect(fl).connect(g).connect(bus); o.start(t); vib.start(t); o.stop(t + dr * BEAT + 0.3); vib.stop(t + dr * BEAT + 0.3);
      }
    }
    return {
      bus,
      start() { if (st.running) return; st.running = true; st.t0 = c.currentTime + 0.06; st.next = 0; },
      stop() { st.running = false; },
      pump() { // schedule-ahead
        if (!st.running) return;
        const horizon = c.currentTime + 0.35;
        while (st.t0 + st.next * BAR < horizon) { scheduleBar(st.next % 8, st.t0 + st.next * BAR); st.next++; }
      },
      barPhase() { return st.running ? ((c.currentTime - st.t0) / BAR) % 8 : -1; },
    };
  }

  function buildBarJazz() {
    const c = A.ctx;
    const g = c.createGain(); g.gain.value = 0;
    const muffle = c.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 16000;
    g.connect(muffle).connect(A.master);
    A.bar = { gain: g, muffle, jazz: makeJazz(g, { level: 1 }) };
    A.bar.jazz.start();
  }

  // ---------------- radio ----------------
  function buildRadio() {
    const c = A.ctx;
    const g = c.createGain(); g.gain.value = 0;
    const speaker = c.createBiquadFilter(); speaker.type = 'bandpass'; speaker.frequency.value = 1200; speaker.Q.value = 0.55;
    g.connect(speaker).connect(A.master);
    // static bed
    const st = c.createBufferSource(); st.buffer = A.noiseBuf; st.loop = true;
    const stf = c.createBiquadFilter(); stf.type = 'bandpass'; stf.frequency.value = 1400; stf.Q.value = 0.4;
    const stg = c.createGain(); stg.gain.value = 0;
    st.connect(stf).connect(stg).connect(g); st.start();
    // numbers carrier
    const hum = c.createOscillator(); hum.type = 'sine'; hum.frequency.value = 92;
    const humg = c.createGain(); humg.gain.value = 0; hum.connect(humg).connect(g); hum.start();
    A.radio = { gain: g, staticG: stg, humG: humg, jazz: makeJazz(g, { transpose: 2, level: 0.8 }), beepNext: 0 };
  }
  function radioCycle() {
    if (!A.on) { unlock(); }
    A.station = (A.station + 1) % 4;
    A.numbersHeld = 0;
    UI.toast('RADIO \u2014 ' + A.stations[A.station]);
    if (A.on) {
      if (A.station === 1) A.radio.jazz.start(); else A.radio.jazz.stop();
      if (A.station === 3) A.radio.beepNext = A.ctx.currentTime + 0.6;
    }
    dlog('radio:' + A.station);
  }
  function pumpNumbers() {
    const c = A.ctx;
    if (A.station !== 3) return;
    if (c.currentTime < A.radio.beepNext) return;
    let t = 0;
    for (const grp of [9, 6, 5]) {
      for (let i = 0; i < grp; i++) { blip(A.radio.gain, { f: 1010, gain: 0.12, dur: 0.10, when: t }); t += 0.24; }
      t += 0.85;
    }
    blip(A.radio.gain, { f: 505, gain: 0.05, dur: 0.5, when: t }); // tired sign-off tone
    A.radio.beepNext = c.currentTime + t + 2.4;
  }

  // ---------------- ambience: crickets, wind, void drone ----------------
  function buildAmbience() {
    const c = A.ctx;
    const wind = c.createBufferSource(); wind.buffer = A.noiseBuf; wind.loop = true; wind.playbackRate.value = 0.4;
    const wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 320;
    const wg = c.createGain(); wg.gain.value = 0;
    wind.connect(wf).connect(wg).connect(A.master); wind.start();
    const drone = c.createOscillator(); drone.type = 'sine'; drone.frequency.value = 46;
    const d2 = c.createOscillator(); d2.type = 'sine'; d2.frequency.value = 46 * 1.5 + 0.7;
    const dg = c.createGain(); dg.gain.value = 0;
    drone.connect(dg); d2.connect(dg); dg.connect(A.master); drone.start(); d2.start();
    A.amb = { windG: wg, droneG: dg, cricketAt: 0 };
  }
  function pumpCrickets(night, t) {
    if (night < 0.5 || G.inside || G.edge > 0.75) return;
    if (t < A.amb.cricketAt) return;
    A.amb.cricketAt = t + 0.32 + Math.random() * 0.5;
    const n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) blip(A.master, { f: 4300 + Math.random() * 500, gain: 0.012, dur: 0.04, when: i * 0.062 });
  }

  // ---------------- engine ----------------
  function buildEngine() {
    const c = A.ctx;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 25;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420; fl.Q.value = 1.4;
    const g = c.createGain(); g.gain.value = 0;
    o.connect(fl); o2.connect(fl); fl.connect(g).connect(A.master);
    o.start(); o2.start();
    A.eng = { o, o2, g, fl, on: false };
  }
  function engineStart() {
    if (!A.on) return; A.eng.on = true;
    const c = A.ctx, t = c.currentTime;
    A.eng.g.gain.cancelScheduledValues(t);
    A.eng.g.gain.setValueAtTime(0, t); A.eng.g.gain.linearRampToValueAtTime(0.12, t + 0.5);
    noiseSrc(A.master, { f0: 220, q: 0.8, gain: 0.2, dur: 0.45, type: 'lowpass' }); // starter cough
  }
  function engineStop() { if (!A.on) return; A.eng.on = false; A.eng.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.2); }
  function setEngine(throttle, speed) {
    if (!A.on || !A.eng.on) return;
    const f = 46 + Math.abs(speed) * 5.2 + throttle * 16;
    A.eng.o.frequency.setTargetAtTime(f, A.ctx.currentTime, 0.08);
    A.eng.o2.frequency.setTargetAtTime(f / 2, A.ctx.currentTime, 0.08);
    A.eng.g.gain.setTargetAtTime((0.07 + throttle * 0.07 + Math.min(Math.abs(speed), 20) * 0.002) * A.duck, A.ctx.currentTime, 0.1);
  }

  // ---------------- one-shots ----------------
  function thud() { if (!A.on) return; noiseSrc(A.master, { f0: 130, q: 0.7, type: 'lowpass', gain: 0.5, dur: 0.28, a: 0.004 }); blip(A.master, { f: 70, gain: 0.25, dur: 0.22, glide: -40 }); }

  // ---------------- footsteps ----------------
  // One soft heel thump + a short scuff per stride, alternating slightly
  // left/right. step(dt, run) is called every frame the player is moving;
  // the stride phase decides when a foot actually lands.
  const stepS = { ph: 0.92, lastMove: -10, foot: 1 };
  function footVoice(when, run) {
    stepS.foot = -stepS.foot;
    if (!A.on) return;
    const c = A.ctx;
    const v = 0.9 + Math.random() * 0.2;          // tiny human variation
    const k = run ? 1.3 : 1;
    let out = A.master;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = stepS.foot * 0.14;
      p.connect(A.master); out = p;
    }
    if (G.inside) {                                // wood floor: knock + dry tick
      blip(out, { f: 132 * v, type: 'sine', gain: 0.07 * k, a: 0.004, dur: 0.085, when });
      noiseSrc(out, { f0: 740 * v, q: 1.1, gain: 0.016 * k, dur: 0.045, a: 0.004, when });
    } else {                                       // street: low thump + grit
      blip(out, { f: 90 * v, type: 'sine', gain: 0.06 * k, a: 0.005, dur: 0.1, when });
      noiseSrc(out, { f0: 350 * v, q: 0.7, gain: 0.024 * k, dur: 0.07, a: 0.008, when });
    }
  }
  function step(dt, run) {
    const now = A.absT || 0;
    // if movement just resumed after a pause, land the first step quickly
    if (now - stepS.lastMove > 0.3) stepS.ph = 0.92;
    stepS.lastMove = now;
    stepS.ph += dt * (run ? 3.1 : 2.05);           // strides per second
    if (stepS.ph >= 1) {
      stepS.ph -= 1;
      A.stepCount = (A.stepCount || 0) + 1;        // counted even when muted (tests)
      footVoice(0, run);
    }
  }
  A.footVoice = footVoice; A.stepS = stepS;
  function creak() { if (!A.on) return; blip(A.master, { f: 220, type: 'sawtooth', gain: 0.05, dur: 0.6, glide: 90 }); }
  function sting() { if (!A.on) return; blip(A.master, { f: 392, gain: 0.06, dur: 1.1, a: 0.4 }); blip(A.master, { f: 587.3, gain: 0.045, dur: 1.3, a: 0.55, when: 0.12 }); }
  function endingBegin() {
    if (!A.on) return; const t = A.ctx.currentTime;
    A.bar.gain.gain.setTargetAtTime(0, t, 0.8);
    A.radio.gain.gain.setTargetAtTime(0, t, 0.8);
    A.amb.droneG.gain.setTargetAtTime(0.10, t, 2.2);
    A.amb.windG.gain.setTargetAtTime(0.12, t, 2.2);
    A.duck = 0;
  }
  function loopReturn() { if (!A.on) return; A.duck = 1; A.amb.droneG.gain.setTargetAtTime(0, A.ctx.currentTime, 1.0); engineStop(); }

  // ---------------- per-frame ----------------
  function update(dt, t) {
    A.absT = (A.absT || 0) + dt;   // wall clock for stride gaps; runs even muted/headless
    if (!A.on) return;
    const night = EDGE.nightF(G.dayMin);
    A.bar.jazz.pump(); A.radio.jazz.pump(); pumpNumbers(); pumpCrickets(night, t);
    // bar music: full inside, leaks faintly near the door outside
    let bg = 0, ff = 16000;
    if (G.inside === 'bar') { bg = 0.9; ff = 16000; }
    else {
      const dd = Math.sqrt(dist2(G.player.x, G.player.z, -16, 9.6));
      bg = 0.18 * (1 - ss(3, 14, dd)); ff = 900;
    }
    if (G.state === 'ENDING' || G.state === 'TERMINAL' || G.state === 'CREDITS') bg = 0;
    A.bar.gain.gain.setTargetAtTime(bg, A.ctx.currentTime, 0.25);
    A.bar.muffle.frequency.setTargetAtTime(ff, A.ctx.currentTime, 0.25);
    // radio audible only in car
    const rOn = G.inCar && A.station > 0 && G.state !== 'TERMINAL' && G.state !== 'CREDITS';
    A.radio.gain.gain.setTargetAtTime(rOn ? 0.5 * (G.endingSlow == null ? 1 : (G.state === 'ENDING' ? G.endingSlow : 1)) : 0, A.ctx.currentTime, 0.2);
    A.radio.staticG.gain.setTargetAtTime(rOn && A.station === 2 ? 0.16 : (rOn && A.station === 3 ? 0.03 : 0), A.ctx.currentTime, 0.2);
    A.radio.humG.gain.setTargetAtTime(rOn && A.station === 3 ? 0.05 : 0, A.ctx.currentTime, 0.2);
    // numbers seam: six seconds of listening
    if (rOn && A.station === 3 && G.state === 'PLAY') {
      A.numbersHeld += dt;
      if (A.numbersHeld > 6 && !FLAGS.radioNumbers) {
        FLAGS.radioNumbers = true;
        QUEST.addSeam('NINE_SIX_FIVE', 'Nine, Six, Five',
          'A voice of beeps between stations: nine, six, five. Not a frequency. A distance.');
      }
    }
    // wind grows with the edge
    if (G.state !== 'ENDING') A.amb.windG.gain.setTargetAtTime(0.02 + G.edge * 0.09, A.ctx.currentTime, 0.5);
  }

  return { unlock, setMuted, radioCycle, engineStart, engineStop, setEngine, thud, step, creak, sting, endingBegin, loopReturn, update,
    get station() { return A.station; }, _A: A };
})();
