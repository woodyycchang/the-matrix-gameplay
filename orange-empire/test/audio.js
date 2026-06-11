// test/audio.js — footstep verification
// Part 1: stride cadence (headless, counts emissions without an audio device)
// Part 2: real waveform render via OfflineAudioContext, checked for clicks,
//         clipping, and that steps are discrete events rather than a buzz.
const THREE = require('three');
const { createCanvas } = require('canvas');
const path = require('path');
const factory = require(path.join(__dirname, '..', 'dist', 'bundle.js'));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log('  ok  ' + m); } else { failed++; console.log('  FAIL ' + m); } };
const between = (x, lo, hi, m) => ok(x >= lo && x <= hi, m + ' (got ' + x + ', want ' + lo + '-' + hi + ')');

(async () => {
  console.log('\n[part 1: stride cadence, headless]');
  const OE = factory(THREE, null, null, { headless: true, makeCanvas: (w, h) => createCanvas(w, h) });
  OE.boot({});
  const d = OE.debug, G = OE.G, A = OE.AUDIO._A;
  d.begin();
  d.setPlayerPos(-40, -2, Math.PI / 2);          // clear stretch of Main St heading east

  A.stepCount = 0;
  d.hold('w', true); d.stepFrames(4 * 30, 1 / 30); d.hold('w', false);   // walk 4 s
  const walkSteps = A.stepCount;
  between(walkSteps, 7, 10, 'walking 4s lands ~8 steps');

  d.stepFrames(30, 1 / 30);                       // stand still 1 s
  const idleSteps = A.stepCount - walkSteps;
  ok(idleSteps === 0, 'standing still is silent');

  A.stepCount = 0;
  d.setPlayerPos(-40, -2, Math.PI / 2);
  d.hold('w', true); d.hold('Shift', true);
  d.stepFrames(4 * 30, 1 / 30);
  d.hold('w', false); d.hold('Shift', false);
  const runSteps = A.stepCount;
  between(runSteps, 11, 15, 'running 4s lands ~12 steps');

  // resume responsiveness: after a pause, the first step lands fast
  d.stepFrames(30, 1 / 30);
  A.stepCount = 0;
  d.hold('w', true); d.stepFrames(4, 1 / 30); d.hold('w', false);        // 0.13 s of movement
  ok(A.stepCount >= 1, 'first step lands within ~0.13s of moving again');

  console.log('\n[part 2: rendered waveform]');
  const { OfflineAudioContext } = require('node-web-audio-api');
  const SR = 44100, DUR = 3;
  const off = new OfflineAudioContext(2, SR * DUR, SR);
  function FakeAC() { return off; }
  const OE2 = factory(THREE, null, { AudioContext: FakeAC }, { headless: false, makeCanvas: (w, h) => createCanvas(w, h) });
  const A2 = OE2.AUDIO._A;
  OE2.AUDIO.unlock();
  ok(A2.on === true, 'audio graph builds on the offline context');
  // silence music/ambience buses so only footsteps are measured
  for (const k of ['bar', 'radio']) { try { A2[k].gain.gain.value = 0; } catch (e) {} }
  try { A2.amb.windG.gain.value = 0; A2.amb.droneG.gain.value = 0; } catch (e) {}

  const stepTimes = [0.4, 0.9, 1.4, 1.9, 2.4];
  OE2.G.inside = null;
  stepTimes.forEach((t, i) => A2.footVoice(t, i % 2 === 1));
  OE2.G.inside = 'bar';
  A2.footVoice(2.75, false);                       // one wood-floor step too

  const buf = await off.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);

  let peak = 0, maxJump = 0;
  for (let i = 0; i < L.length; i++) {
    const a = Math.abs(L[i]); if (a > peak) peak = a;
    if (i) { const j = Math.abs(L[i] - L[i - 1]); if (j > maxJump) maxJump = j; }
  }
  ok(peak > 0.01, 'footsteps are audible (peak=' + peak.toFixed(3) + ')');
  ok(peak < 0.5, 'no clipping risk (peak=' + peak.toFixed(3) + ')');
  ok(maxJump < 0.12, 'no click transients (max sample jump=' + maxJump.toFixed(4) + ')');

  const rms = (t0, t1) => {
    let s = 0, n = 0;
    for (let i = (t0 * SR) | 0; i < (t1 * SR) | 0; i++) { s += L[i] * L[i] + R[i] * R[i]; n += 2; }
    return Math.sqrt(s / n);
  };
  const on1 = rms(0.4, 0.52), gap1 = rms(0.6, 0.85), on2 = rms(1.4, 1.52), gap2 = rms(1.6, 1.85);
  ok(on1 > gap1 * 6 && on2 > gap2 * 6,
    'steps are discrete events, not a buzz (on/gap ratio ' + (on1 / Math.max(gap1, 1e-6)).toFixed(1) + 'x)');

  // stereo alternation: consecutive steps favor opposite ears
  const sideBias = (t) => {
    let l = 0, r = 0;
    for (let i = (t * SR) | 0; i < ((t + 0.1) * SR) | 0; i++) { l += L[i] * L[i]; r += R[i] * R[i]; }
    return r - l;
  };
  const b1 = sideBias(0.4), b2 = sideBias(0.9);
  ok(b1 * b2 < 0, 'footsteps alternate ears (bias ' + b1.toExponential(1) + ' vs ' + b2.toExponential(1) + ')');

  console.log('\naudio: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
