# Visual pass log — Mobil Ave 3D staging

Protocol: no 3D build existed in this repo (the game is ASCII draw-lists), so
Pass 0 constructs the 3D staging as the baseline and is scored 100 by fiat.
No headless browser exists in this environment, so "screenshots" are renders
of the SAME world spec (web/world.js) through tools/preview3d.js, a
zero-dependency software rasterizer. Every pass was rendered side-by-side
against the previous pass and kept only on an obvious win.

Reproduce any comparison:
  node tools/preview3d.js --shot vista --pass 2 --passB 1 --out /tmp/cmp.png
Shots: vista · sign · train · arrive · seam

## Pass 0 — baseline staging (score 100)
Literal ring (R = 45.8 m, 48 tiles x 6 m), platform [6,42), track trench,
sign wall, tunnel wall, ceiling, dot-matrix MOBIL, box train on the shared
timetable, three flat utility lights. Faithful and bare.

## Pass 1 — geometry & detail (kept; ~108)
+ pillars w/ bases and capitals every 4 tiles
+ benches x4, tactile platform-edge strip, cables, sign backing plate
+ rails + third rail (gloss), 288 sleepers
+ hash-driven grime tint on all vertex colors
Rejected: none. Compare: obvious — the hall reads as a built place.

## Pass 2 — light & materials (kept; ~118, the big jump)
+ 9 sodium lamps with emissive fixtures; the one over the doors flickers
+ green sign wash light; 2-3 cold service lights on the bare stretch
+ ambient 0.35 -> 0.10; fog exp2 0.020 -> 0.030, near-black teal
+ gloss on rails, tiles, pillars; train window band goes hot
Compare: night-and-day; the mood arrives with the light.

## Pass 3 — atmosphere & life (kept; ~124)
+ drifting dust in the lamp pools (shared makeDust/dustPos)
+ two moths worrying the bad fixture; glyph wisps rising off the sign wall
+ posters between pillars, bench stains, drip streaks, gloss puddles
+ train dressing: window mullions, roof vents, lit doorway spill
Compare: subtler in the vista, decisive in train/arrive/seam shots.

## Fix log along the way
- preview harness: guarded dereference after existence assert (clean reds)
- app: train material restore on code-vision toggle-off
- app: two-sided train collision + wall-press shove on the bare stretch
  (the 3D train SWEEPS the seam during approach — territory the 2D train
  never enters — so the platform-shove invariant needed a second branch)

## Honest limits
- Preview parity covers geometry, palette, lights, fog, life positions.
  Browser-only sugar (real glyph textures, additive dust, spotlight beam,
  audio) is not in the preview renders.
- The browser layer is syntax-checked headlessly; the world logic itself
  runs in node on every preview render.
