# MOBIL AVE -> main keyword theme #14: port design (E0 survey)
Source: claude/mobil-ave-3d. A 2D tile game (cylinder topology x~x+48) + a 3D ring staging
(web/world.js pure spec, R=45.84) + its own honest camera (tools/preview3d.js). 1172 asserts.

## Measured constants (theirs -> ours, 1:1)
- LOOP: 48 tiles x 6.0 m = 288 m; R = 288/2pi = 45.8366. Platform tiles [6,42); MOBIL sign
  22..26; door tiles 22..26. Cross-section: wall z-6.8, platform z-6.8..-1.4, track -1.4..2.6,
  DROP 1.1, CEIL 5.2. Our mapping: flat-Y annulus, rad(z) = R - z (outer sign wall R+6.8,
  inner tunnel wall R-2.6). The cylinder identification becomes a literal circle.
- TRAIN (period 40 s): arrive 24, doorsOpen 27, doorsClose 33, depart 35; span tiles 14..34.
- LIGHTS (their Pass-2): 9 sodium lamps tiles 7..39 step 4 (warm 1,0.66,0.28 i15 r16; the one
  at 27 flickers - above the doors, of course), green sign wash (0.5,1,0.65 i9 r13), 3 white
  utility tiles 12/24/36 (i10 r22), cold service pair on the bare stretch (0.5,0.62,0.7 i6 r12);
  ambient 0.10; fog exp2 0.030 color (0.012,0.02,0.02).
- PAL: tileWall .42/.46/.44, platform .38/.37/.34, edgeStrip .62/.55/.22, trackBed .16/.15/.14,
  rail .55/.56/.58, tunnelW .20/.21/.22, ceil .24/.25/.26, pillar .34/.36/.35, bench .25/.20/.14,
  signGlow .62/1/.72, trainBody .30/.33/.36, window 1/.92/.62. Glyph seed 0x4C1B06D0.
- Pillars every 4 tiles w/ base+capital; benches x4; tactile edge strip; rails + third rail;
  dot-matrix MOBIL on the wall.

## The soul (verbatim artifacts to carry)
- enterText: 'A tiled platform under sodium light...' full line.
- THE RULE: nothing the operator asks for compiles here. Requests sketch a pedestal that
  UNRAVELS ('A pedestal sketches itself in green wireframe beside you - and unravels before
  it can hold anything. The station refuses the request.'); exits get 'Static on the line.
  No door compiles, no ring, no way up. Whatever runs this station is not your operator.'
- The sign: 'Chipped tiles on the wall spell M-O-B-I-L. Shuffled, the same five letters spell
  LIMBO. Someone named this place honestly.'
- Train lines: pulls-in / scramble-by-containment / doors rattle open / doors seal /
  pulls-out-and-the-sound-folds-away / no-train / doors-shut - all verbatim.
- Boarding is the ONLY way out -> transition to the void.

## Condensed native scope (sceneMobil)
Word chain #14: mobil|mobil ave|limbo|subway|underground ('station' stays EREBUS's - courted).
Ring geometry 1:1 on the arc; the seam is not a place. scene.onWord intercepts EVERYTHING
(the empire hook, inverted): exits refused, requests unravel (a pedestal inst materializes to
~55% then reverses, emit 'unravel'). Train = one curved mesh rotated about the ring center
(it.yaw IS motion along the loop); arc colliders spliced on arrive/depart; door panels mutate;
walk through the open doors -> void. Scramble-by-containment if caught on the rails. Baked
lighting reuses the erebus decay-2 law with their rig verbatim. Ambience 'mobil' = tunnel
drone + drip scheduler; emits rumble/brakes/doors/unravel/drip. Two end-stairs (0.28 risers)
let a dropped walker regain the platform - engine-native mercy, logged as a delta.

## Courts (planned)
parser rows (+ 'station'->erebus, 'orange chair' untouched); ring census (9 pillars, 4 benches,
5 letter groups, sign wash); THE LOOP: tangent-steered walk >2 full circumferences, position
periodic, zero NaN; operator-fail x2 (request + clear) with unravel inst lifecycle + verbatim
lines, scene UNCHANGED; timetable x2 periods (arrive/doors/seal/depart lines in order);
scramble; boarding -> void + line; doors-shut denial line; determinism; perf; audio events.

## VISUAL LOOP LOG (side-by-side vs branch preview shots, keep-only-if-better)
(passes appended)

### Pass 0 - windings (superseded; the geometry lesson)
First shots: 36-50 polys, lum 3. Ring floors' cross product faced DOWN, walls faced away -
everything backface-culled. aq rewound to up-facing, rq flipped, train flanks/doors turned
outward. And the branch targets turned out BRIGHT (their station is white tile under strong
light - the film's look), not the moody-dark my priors assumed: the instrument corrected me.

### Pass 1 - KEPT (visible, dark)
polys 240-304, lum 49-56. World stands; brightness 2.5x short of their pixels.

### Pass 2 - KEPT (+ audio court appeased)
Ambient 0.52->1.05; the new rumble/drip emits had blown the 15x dynamic-range court (16.7x) -
rumble trimmed, drip raised. 936 green again. lum 90-98.

### Pass 3 - KEPT (convergence)
Ambient 1.45, fog 14/110. FINAL vs branch shots: vista lum 123 == 123 EXACT; sign 130 vs 158;
train 130 vs 172 (hot window band present, green sign wash present, grime variance richer than
theirs: colors 35-38 vs 11-17). Close-up walls read ~18% darker than their direct-lit tile -
logged as the renderer delta.

### Courts: +35, total 971 green
Two design bugs the courts caught before any player could:
- chord-AABB bloat: 18 m train collider chunks ballooned across the platform in diagonal
  sectors (axis-aligned boxes on an arc) - ghost walls. Per-tile 6 m segments fixed it.
- the doorway: the train body's own colliders blocked the open doors. The body now leaves
  tiles 22-26 to the door panels; open doors are truly open.

### Honest remaining deltas
- Close-up brightness (-18%); their preview's per-pixel lighting vs our per-face bake.
- Their Pass-3 life (dust motes, moths at the bad fixture, posters) is not ported - the
  flickering fixture over the doors IS (baked at 0.45 intensity, dark tube geometry).
- Boarding is walk-through-the-open-doors (region), not a key press; matches our booth idiom.


## COVENANT AMENDED BY THE OWNER (2026-07-06)
Report from live play: the station locked ALL requests (as designed) and the log went
neon-green in five scenes. Two rulings:
1. TRANSFERS ALWAYS ROUTE. C.parse now runs before any scene word-claim; scene/clear
   requests bypass onWord. Mobil keeps its soul: props still sketch-and-unravel, the
   door-words still get Static verbatim - but asking for a SCENE compiles a way out,
   with a one-line exit flavor per visit ('Static on the line clears, just once...').
2. THE GREEN LOG IS DECLARED, NEVER INFERRED. body.dark was keyed to /NEON/i on the
   scene name; whatever edge made it stick in hallway/erebus/epang/mobil/peach, the
   name-regex is retired. Scenes declare uiDark; census court: only 'neon mile' does.
