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
