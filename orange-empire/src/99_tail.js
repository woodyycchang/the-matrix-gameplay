// ============ 99 tail — public API + autoboot ============
return {
  G, CFG, FLAGS, T, M: MAT, TOWN, GROVES, VEH, NPCS, INTERIOR,
  PLAYER, DIALOGUE, QUEST, EDGE, AUDIO, UI,
  boot: GAME.boot, step: GAME.step, debug: GAME.debug,
  util: { terrainH, fmtClock, ss, lerp, clamp, edgeFactorAt, mulberry32 },
};
});

/* ---- browser autoboot ---- */
(function () {
  if (typeof window === 'undefined') return;
  var OE = window.OrangeEmpire;
  if (!OE || !OE._auto) return;
  function go() { try { OE.boot({}); } catch (e) { console.error('[OrangeEmpire] boot failed:', e); } }
  if (document.readyState === 'complete' || document.readyState === 'interactive') go();
  else document.addEventListener('DOMContentLoaded', go);
})();
