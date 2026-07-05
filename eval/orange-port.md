# ORANGE EMPIRE 1937 -> main keyword theme: port design (E0 survey)
Source: orange-empire-1937 branch, Three.js r128 single file (16 modules, 3934 lines), seed 19370611.
A Thirteenth Floor homage: nostalgic citrus town, six seams, a road east that ends in green wire.

## Measured constants (theirs -> ours, distances kept 1:1)
- CFG: MAIN road hw6 | crosses +-60 | EAST road x160..858 | player EYE1.62 WALK2.3 RUN4.8
- CAR: VMAX26 VREV-6.5 ACC9.5 BRAKE16 DRAG.35 ROLL.9 STEER2.0; turn = STEER*clamp(v/9,-1,1)*(1-0.45*ss(11,26,|v|));
  barricade breaks when |v|>5.5 (v*=0.82), else body hit v*=0.22 + thud.
- DECAY RINGS: DESAT 460->660, DARK 600->830, GRID 615->800, TREEWIRE 665, BOUNDARY 965, WALL 1000.
- TIME: 1 game-min = 2 s, start 19:24 (7:24 PM Friday June 11 1937). nightF: 19:50->20:38; duskF peak ~19:30.
- SKY PAL day/dusk/night: top #4a76b8/#1c2a52/#04060e, hor #e9eef0/#e8843c/#131a26, fog #c9d4dc/#4a3a4e/#0a0d16,
  fogFar 950/760/480. Edge: fog -> #020503 by edge*0.75; light greens toward #76e0a0. Wire green #2aff70.
- Barricades on east road: x300 kind1 ROAD CLOSED (+flicker lantern), x520 kind2 NO THRU TRAFFIC (+drums),
  x700 kind3 TURN BACK (hand-painted). Road signs x288, x512. Shack (335,26) WHITMORE CITRUS CO.
  Dead truck x760 (last real object, wire-edged). Smudge pots x175..470 z+-15.5. Windmill (240,-42).
- Main St: GILROY HARDWARE -82 | apts -70 | PERLMAN'S -40 (green neon) | BAUM & SONS -22 | RIALTO -2
  (marquee + vertical blade, amber-on-maroon) | MOON CAFE 20 (blue neon) | CITRUS BELT SAVINGS 44 |
  EASTSIDE GARAGE 80 || POSTAL TELEGRAPH -84 | ROSSI TAILOR -70 | THE BLUE PACIFIC -16 (cyan neon,
  flicker, martini sign) | ORPHEUM BARBER 4 | HOTEL MERIDIAN 30 (red neon; the quiet seam) |
  ANGEL CITY PRODUCE 56 | OK LUNCH ROOM 80. Newsstand -33. Billboard x132.

## Rendered-pixel anchors (branch shots, /36 clusters, receipts)
- 01_main_dusk: lum63; black 30% + #48486c 13% (violet sky) + #fcb46c 10% (amber horizon)
- 07_main_neon_night: lum16; black 92% + #b49048 neon islands
- 06_thinning / 04_road_closed / 05_shack: #6c4890 dusk-violet 20-29% + olive ground #484824
- 10_wire_groves: black 94% + green #006c24 wires | 11_boundary_wall: black 80% + green ramp 12%

## The soul (verbatim artifacts to carry)
- SEAMS x6: THE USUAL / SKIP (bar seven, 64 s) / EVERGREEN (paper twice) / CLOCKWORK (Mrs. Pell,
  quarter past) / MIRROR (the twins) / NINE_SIX_FIVE (radio beeps, 6 s).
- The J.W. note under the floorboard (full text). Gus arc: Jacob Whitmore ledger -> matchbook ->
  "Maybe you're built different, Mr. Voss." Epilogue: "So. How green was it?" / "There are worse loops."
- THE ENDING at d>=965: 7 typed lines ("The road doesn't end. It just stops being a road." ...
  "Nine hundred sixty-five. Whitmore counted it too."), then MERIDIAN CIVIC SYSTEMS terminal,
  RETURN TO LOOP (reset to 7:24, memory retained) or END SESSION.

## Condensed native scope (sceneEmpire)
Word chain: orange empire|empire|1937|angel|citrus|nostalgi* -> 'empire' (bare 'orange' NOT hijacked:
scene keys run before props; 'orange chair' must stay a prop). Full six-piece.
World, 1:1 distances: Main St town (14 buildings as color-identity facades + neon glow quads; no
canvas text in this renderer -- signs speak through the operator on approach), Blue Pacific INTERIOR
(counter, bottles, stools, booths, Gus at the bar, phonograph, radio), lamps/palms/poles+wires/
newsstand/benches/billboard, EAST ROAD as STREAMED CHUNKS (neon-mile pattern, finite 0..N; per-chunk
deterministic trees with decay baked per band; smudge pots; grid-zone ground; wire trees past 665),
barricades x300/520/700 breakable by the car, shack + floorboard note, dead truck (wire-edged),
windmill, BOUNDARY WALL arc at 1000 (green grid on black). Sky 'empire': their 3-palette day cycle
driven by dayMin(t)=1164+t*0.5 min, sun on their path, stars+moon at night. Fog live-blends with
day phase and edge factor (erebus fog-edit idiom).
CAR: 1937 sedan prop (P.sedan), mount/drive/dismount parallel to the bike (C.CAR = their CFG verbatim;
no lean -- their steering law). Ending: car is dismissed (throttle ignored, coast to 0 over 2.4 s),
7 LINES roll on the operator, then the terminal typewrites; the console becomes the terminal:
say RETURN -> loop reset (time to 7:24, positions reset, seams RETAINED, Gus epilogue armed);
say END -> transition to the white void (END SESSION = waking in the Construct).
NPCs: Mrs. Pell walks Main, drops her oranges at a quarter past (witness twice = CLOCKWORK);
the twins cross once (MIRROR); Gus stands his post (P.human, static pose).

## Audio law compliance (checked against the constitution)
- NO jazz port, NO phonograph melody (music law: Stellardrone only; the guqin precedent).
  The SKIP seam carries on a non-musical needle-crackle loop (tick groups; the 7th stumbles).
- NO voice synthesis (their numbers station is already BEEPS -- ports clean as 'chirp' patterns).
- New emits: thud (barricade), sting (seam notice, a dull double thump -- not a chime),
  crackle (needle). Ambience 'empire' = warm night-air bed + faint insect band.

## Courts (self-built; branch suites are jsdom/xvfb, not portable)
enter/word (and 'orange chair' stays a prop); town census; car mount/accel/steer-arc/reverse;
slow hit blocks vs fast hit breaks (collider dies, note fires); chunk streaming bounded both ways;
all six seams fire under scripted time/motion; floorboard note verbatim-equal; ending at 965:
7 lines verbatim in order, terminal text verbatim, RETURN resets clock+pos and retains seams,
END lands in void; epilogue line on re-entry; sky op 'empire'; fog live-edit sane; NaN soak;
near+far render nonzero; perf budget; audio event set; determinism twin-run.

## Honest deltas (renderer-native, logged up front)
- No canvas-text signage: building identity carried by measured color + neon glow quads; the words
  arrive by operator typewriter on approach (the epang-region idiom).
- No terrain rise at 575..855 (flat + fog + sky carry the far field); no headlight cones;
  no film grain; car engine reuses the bike synth (RPM-scaled by the same emit).
- Barricade tumble is a mutation + short scene-side toss, not a 2.2 s physics body.

## VISUAL LOOP LOG (side-by-side, keep-only-if-better)
(passes appended below as they land)

### Pass 1 - superseded (baseline shots)
- First light: dusk {lum79, colors47, violet 54%} vs theirs {lum63, violet 25%, amber 10%} -
  a violet flood; night {lum41} vs {lum16} - masses too bright; wire close {lum12 vs 11}.
- Diagnosis receipts: no lighting rig in this renderer, so day-albedo + short fog = wrong dusk.

### Pass 2 - KEPT (albedo learns the hour)
- Town albedo dusk-BAKED (warm-shift 10% + 0.60), vivid faces exempt (sat>0.5 & max>140:
  neon bands, lit windows, wire green); amber horizon wash at dusk in both painters;
  wire pose recomposed into the 665..832 band. Wire verdict lands: blk 61%==61%.

### Pass 3 - one verdict INVALIDATED, one change KEPT
- Night becomes a SECOND MESH (shared verts, colors remapped x0.34 + night-blue; faces
  inside The Blue Pacific exempt - the windows glow) swapped by the mutation trick at
  nightF 0.5. Wire rows widen to +-72 past x608.
- SHUTTER AUDIT: the night frame (175 polys vs 527) was shot mid-materialize after the
  swap - the matching histogram was an artifact of a half-loaded town. Verdict struck;
  the settle-brace lesson, relearned on a new instrument path.

### Pass 4 - KEPT (the fog was the violet)
- selfshot settles 100 steps after turning the day knob (pose[6] = dayMin). Fog distances
  restored toward theirs (near 64/24, far 360/130 dusk/night; theirs 760/480): the 40/200
  fog had been painting 34% violet onto everything at 100 m. Dusk violet 62% -> 12%.
- Night, honestly shot this time: {lum15, blk 88%} vs {lum16, blk 92%}; the neon gold
  survives the night fog at exactly their #b49048. Wire green 4% vs 3%.

### Pass 5 - KEPT (the ground learns the hour too)
- The bake had skipped the ground mesh: #6c6c6c 10% was raw sidewalk. Both meshes now
  share the knife. FINAL: dusk {lum65, dark-mass 70%, violet 12%} vs {lum63, dark 40%+,
  violet 25%}; night matched; wire {grn 3% == 3%, blk 80 vs 94}.

### Honest remaining deltas (final)
- Dusk true-black floor: our darkest fog-lit face is #242424, theirs bottoms at #000000
  (they have shadow; we have albedo). Character verdict: matched; floor verdict: lighter.
- Wire frame carries a 17% night-sky band (#000024 family, same as their 2% cluster) -
  composition, not palette. Day phase (a 20-real-minute wait away) wears the dusk bake:
  a moody overcast noon, logged as renderer-native.
- Browser-side validations selfshot cannot reach: the neon flicker feel, the amber wash
  in the live canvas painter, engine audio under way. Queued for Master's eyes.
