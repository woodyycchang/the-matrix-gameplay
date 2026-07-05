# EREBUS STATION -> main keyword theme: port design (E0 survey)
Source: erebus-station branch, Three.js r128 single file (1512 lines) + BUILD-LOG.

## Measured constants (theirs -> ours)
- CFG: bg#02030a fog#070b16 d.023 | eye1.62 walk3.6 run6.4 grav14.5 jump5.3 stepUp.46 | sunPeriod 240s
- COLR: steel#232a38 dark#161b26 trim#0d121c cyan#4de3ff amber#ffb057 red#ff4038 green#59ff9c orange#ff7a2a
- Rotunda 26x26xH12: SW stair hole(x-9..-5,z2..10), 4 doorways(+/-13, u-2..2, h2.8), slim 1.6^2 corner
  pilasters w/ cyan pin-strips, amber sconces, 8 radial ceiling spokes, centre light cone, ring light.
- Reactor y=-7: red-flicker lower corridor; hall floors with two coolant channels (cyan 2.4 under grates,
  amber tape edges), 4 vertical pipes; CORE = pedestal cyl r3.3 + core cyl r2.7 h6.2 + four orange
  glow slots (2.6) + translucent glow shell.
- Bridge z=30 wall, two glass viewport slits (u13.5-14.5 & 21.5-22.5, y1.5-2.4) + day-side sun shaft.
- Dome: glass hemisphere r13.5 @ y12.6, torus ribs + latitude rings; two floating stair flights from rotunda.
- LOGS format {x,y,z,head,text}; DIRECTOR {med, black+phase(0..4), fig} one-shot events; AUD.whisper.

## Condensed native scope (sceneErebus)
Rooms real: DOCKING BAY(spawn) -> corridor -> CENTRAL ROTUNDA -> north corridor -> COMMAND BRIDGE;
rotunda SW stairwell DOWN -> REACTOR (blackout beat once + alcove figure) ; rotunda flights UP -> DOME.
Sealed doors labeled: HYDROPONICS / MED BAY / CREW QUARTERS / DATA ARCHIVE.
Engine: new sky mode 'erebus' (starfield + sun disc orbiting sunPeriod-scaled + ringed gas giant;
night = occlusion pass). Props: P.figure (still silhouette, dissolves on approach), terminal plates.
Director (scene-local, once each): reactor first-entry blackout -> red strips -> half power (+ 'powerdown',
'whisper', 'alarm' sounds); figure fade/dissolve; two ported crew logs via operator typewriter.
Word chain: erebus|station|tower -> full six-piece (lexical, L line, title map, help, chip #11,
INTENT entry + exemplar).

## Courts (E4, self-built - branch has no node suite)
enter/word; rooms reachable (walk sim, no wall pierce, stairs up+down); dome/bridge/reactor census;
figure present then dissolved after approach; blackout director one-shot phases; sky op mode 'erebus';
near+far render zero-NaN; determinism under scripted time.


## VISUAL LOOP LOG (side-by-side, keep-only-if-better)

### Pass 1 - KEPT (commit this)
- Change set: station-wide panel-grid walls (seam-back 0.62x + 2.0x1.45 jittered panels, visible-side offset),
  rotunda 2.2 m floor tiles, reactor core spill (3 warm pool rings + white-hot slot cores),
  bridge holo band/console holo/ceiling rows, dome sunrise flood (browser sky painter).
- Verdict metrics (selfshot 960x540, /16 histogram):
  rotunda B0 {lum51, colors18} -> A1 {lum53, colors21, +#224455 panel highlights} = texture gained, no darkening.
  reactor (pose corrected to face the core) A1 {lum67, colors24, warm #442211 at 8%}.
  bridge ~unchanged at this pose -> carried to Pass 2 (needs their cyan-luminous ceiling).
- Bugs the loop caught: C.rng returns a GENERATOR (uncalled -> NaN -> 80% black frames);
  reactor selfshot pose faced a wall from 2.5 m (previous visual claim was confabulated).
- Tooling: view tool went down mid-loop -> ASCII color maps + histogram stats became the judge.

### Pass 2 - KEPT
- Bridge glowing ceiling FIELD (down-facing quads; first try was backface-culled: ceilings wind downward),
  two W-strips, band mullions, floor holo ring; dome rim/chart brightened; reactor pool +1 notch.
- bridge {lum38,colors10,cyan41%} -> {lum66,colors17,cyan73%}  = their cyan-dominant character achieved.
- Bug caught: addQuadY is up-facing only; ceilQ (reversed winding) added.

### Pass 3 - KEPT
- Rotunda luminous central pillar + three double-faced halo rings (their glowing column);
  6% of wall panels warm-tinted (lit-window feel from their texture variance).
- rotunda colors 24 -> 33 at lum 53->54.

### Honest remaining deltas (renderer-native)
- Dome sunrise flood lives in the browser canvas sky painter; headless selfshot cannot exercise it (code-reviewed, live-validated by hand).
- Panels are jittered flats, not procedural rivet textures; emissive bloom does not exist in this renderer.


## EPISTEMICS AUDIT (are the 'views' identical to the pixels?)
Answer: NO in one proven case; MIXED elsewhere; channel outage confirmed live.
- H1 empty->narrate: outage CONFIRMED live (calibration PNG -> bare placeholder, zero content);
  post-outage empties were reported honestly. Historic reactor case = H1 or H3.
- H2 wrong file: REFUTED (descriptions track their own files when channel worked).
- H3 low-info filling-in: CONFIRMED PRIMARY - flat 98%-one-color reactor frame produced a rich
  false description; structured frames produced accurate cores.
- H4 file changed between observations: REFUTED. H5 'pose was fine': REFUTED (uniform map).
- H6 crop/res loss: disfavored (full-frame features tracked). H7 memory-blend: CONFIRMED as the
  embellishment source (amber sconce / misplaced cyan strip claimed from expectation).
- H8 write race: refuted.
DOCTRINE: eyes propose, instruments judge; stats-first on every frame (colors<6 or top>70% = distrust);
bare placeholder = declared outage, ASCII map + histogram take the bench. Every visual verdict in this
log now carries numeric receipts.
