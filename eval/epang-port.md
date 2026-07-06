# EPANG PALACE -> main keyword theme: port design (E0 survey)
Source: epang-palace-3d branch, Three.js single file (2116 lines), createGame(THREE,{headless}) with
deterministic rng, solids/floors/WATERS/regions/updaters/swayers/nightLights, day-night cycle, guqin score.

## Rendered-pixel anchors (dominant clusters, receipts)
- 01_gate_dawn: #aa8855 83% / #bb9966 / #998855 (ochre-gold stone+wood) + #4477aa (dawn sky)
- 04_hall_dusk: #661111 / #550000 / #440000 (deep vermillion lacquer) + #aa9988 pale stone
- 07_dragon_dusk: #445566 / #334466 dusk blue-grey stone bridge
- 05_treasury_night: #773311 / #884411 / #663311 bronze-ember on black

## Their systems worth porting
- regions[] with {cn,en,QUOTE from the rhapsody} -> entry typewriter (the soul)
- waters[] {x0,x1,z0,z1,surf} + wading -> our version: bed floor -0.7, translucent surface quad -0.12,
  'splash' emit on first entry per river
- day-night cycle -> new 'epang' sky painter mode (dawn rose-gold -> day pale -> dusk crimson ->
  night indigo + stars) + Shu-mountain silhouette ridgeline at the horizon (their 蜀山兀)
- lantern night lights; sway (skipped: static); mist/petals (skipped: renderer-native honesty)

## Condensed native scope (sceneEpang)
GATE(spawn, dawn hero) -> courtyard -> FRONT HALL 前殿 (vermilion columns, gold-stud doors)
-> flanks 歌臺 / 舞殿 -> SKYWAY 複道行空 at y~5 (covered elevated walk, multi-deck litmus)
-> TREASURY 鼎鐺玉石 (bronze ding vessels, ember light) ; TWO RIVERS 二川 with true wading,
crossed by DRAGON BRIDGE 長橋臥波 (arched, dragon-head prow prop) + winding corridor 廊腰縵回.
Props: P.dragonHead, P.lantern(2-state night), P.ding. Word chain: epang|palace -> chip #12.

## Courts (E5)
support probes: gate/courtyard/hall/skyway@5/treasury/bridge-crest/ghat step/river bed wading;
east-wall pierce; region quote says once each; splash once per river; sky op mode 'epang' with
finite yaw/time; near+far zero-NaN; word trigger via 'palace'.

### Pass 5 - KEPT (the instrument grows skies; the palace shoots its own dawn)
- tools/selfshot.js: full sky painters ported (epang 4-key day cycle + stars + sun + Shu ridge;
  erebus starfield), per-pose TIME override, and per-pose SCENE switching (the epang pose had been
  photographing the erebus station - caught by the corner-pixel probe #02030a + stray starfield).
- Receipts: epang dawn lum194 colors51 warm97%, top #ccaa88/#cc9977/#bb8866 - squarely in their
  #aa8855 gate_dawn family. All five erebus poses re-verified post scene-word fix.
- Scene fix: courtyard random tiles gain an epsilon ladder (coplanar shimmer killed).

### Pass 5 addendum - instrument self-audit
- False alarm caught: post scene-switch settle was 1 s while the materialize ramp needs ~3 s ->
  every erebus pose shot half-transparent (lum halved, warm vanished). Settle now 90 steps.
  Ad-hoc metric drift also noted (warm threshold 60 vs the Pass-4 baseline 28) - thresholds pinned.


## THE REBUILD REPORT CAMPAIGN (original developer's F1-F10 + E6 probes, 2026-07-05)
Layer 1: the ORIGINAL (Three.js r152) now lives at /epang-palace/ - subtree snapshot,
root untouched, playable on Pages. Layer 2, executed in order:

- F1 fog follows the sky: fog.col derives per frame from the sky painter's own horizon
  keys (one-scalar law 4.4). E6.1 proves lockstep at four times; the pinned '#2a2430' is gone.
- F2 treasury ember-on-black: albedo authored down (#141008 floor / #33100a walls), ember
  pool widened + deep heart, a tipped ding, a ding over a two-state fire, and QI ZHI LI YI -
  30 pearls + 6 gold blocks strewn out the west door and into River B. Receipt: night lum
  113 -> 60 (target <=70); E6.2 albedo audit 70%+ dark with ember faces.
- F3/F4/F5 MOTION (stateless, 4.5): 22 petals (day-only), 16 river mists (night+dawn),
  lantern sway, 5 swinging cold sleeves + cool wash + cold-blue flame (nuan xiang vs leng
  xiu), the MIRROR TOWER (8 bronze mirrors, sin^16 star-glints, two censers whose smoke
  shears as age^2 - yan xie wu heng). E6.4: half a second moves >=8 probes; petals obey day.
- F6 er chuan rong rong: barred water-gate pierces the west wall, the rouge film rides
  River A only, three oil-sheen swirls drift, the region speaks.
- F7 (reduced, honest): the deck ARCHES over River B (0.28 risers, peak 5.84) and the roof
  now rides at 8.15-8.85, ABOVE the hall ridge (7.7); eave lanterns sway, rafter teeth run
  the span. Full deck>=1.15x-ridge deferred (needs a switchback stair) - logged in HANDOFF.
- F8 feng fang shui wo: seven jittered mini-pavilions SE of the treasury, region speaks.
  The winding corridor already bridges River A; two piers now show the truth.
- F9 shu shan wu: the western ridge renders barren tan with stump teeth in the sky painter.
- F10 instruments: selfshot's pngjs require is a 3-way chain (P9); poses report polys.

## WHAT THE PROBES CAUGHT (real findings, all fixed)
1. The skyway stair was UNMOUNTABLE by real input - its foot hung over the river void.
   A base pier now rises from the dance-hall flank. (E6.3's no-teleport clause did this.)
2. A dance-hall column stood in the stair lane (x18.6) and stopped every climber at step 7.
3. The arch's first cut (0.42 risers) exceeded step-up; walkers slid out a 0.95 m rail gap
   and 'finished' the span on the ground. Risers 0.28; inner guard closes the gap.
4. The treasury door header (6.2) clipped every head - this door had never been walked,
   only teleported. Raised to 6.9 with a door bay.
5. Interior stair treads went dark wood (75 bright faces were drowning the ember read).
6. settle-brace, third billing: E6.1 first read fog mid-materialize whiteout.

## Honest residuals
- Treasury night pose composition: lum 60 (target met) but bronze dings + roof shadow take
  the top clusters at this camera angle; the ember family reads on floor/walls, not top-2.
- F7-full (whole deck above ridge) deferred; the arch + raised roof carry bu ji he hong.
- Guqin stays silent per the music law; the original at /epang-palace/ carries its own.
