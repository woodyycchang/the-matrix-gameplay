# CYBERPUNK-MOTORCYCLE branch -> main NEON: port report
(branch = THREE.js, no merge base: a DESIGN/PARAMETER port, re-forged natively)

## 1. RIDE PHYSICS (endorsed; equations captured from p4_actors:262-345)
- thrust: accel 26 (x1.9 boost), nonlinear falloff x max(0.12, 1.04 - v/vmax)
- brake 52, coast 6, over-vmax decay -24/s; vmax 64, boost 92
- turbo: 3.0 s tank, refill 0.28/s, gate = shift+throttle+v>4
- steering: SPEED-COUPLED  yaw -= steer * 1.85 * dt * (0.5 + 0.5*min(v/26,1))
- the ARCADE CLAMP: yaw in [-1.15, +1.15]  ("you ride DOWN the street") -
  the single biggest reason the branch feels right and main feels odd
- lean: damped spring -> target = -steer * 0.42 * min(v/30,1), snap-in 8, return 4
- crashHit(s): 0.45 s cooldown, speed *= 0.35, shake, sparks, 'CLIPPED' popup
- main today: MAX 22 / STEER 2.0 constant-rate, no clamp, no lean spring -> the odd

## 2. MOUNT: mountBike(on) = rider visible / player hidden. Mechanism ~= ours (E).
   The seated rider avatar (cyan visor man) is explicitly NOT ported (user ruling).

## 3. TRAFFIC (p3_world:290-, p6 updateTraffic)
- 6 lanes |x| in {14,24,34}, left flows +z, right flows -z; speeds rr(13,26)
- ring-recycle anchored to player z: ahead +260 -> respawn behind; behind -460 -> ahead
- solid vs bike: |dz|<3.1 & |dx|<1.9 -> push-out + crashHit(0.85)

## 4. WORLD / INFINITE
- branch: roadHalf 48 boulevard, sidewalks, facade neon signs (plum 0x2b0b3c family),
  500 air motes, monorail pylons; street FINITE (boss at -2962)
- main neon: infinite chunk manager EXISTS (window spawn/recycle) but canyon half~5
- port: widen to walls |x|~17, lanes |x| in {4.5, 8, 11.5} (our scale), keep chunks

## CAMPAIGN (tree ROOT/NEON-RIDE, enforced)
N1 ride-feel transplant (constants+clamp+spring+crash core into C.BIKE/ride step)
N2 boulevard widening + facade signage palette (scene gen)
N3 native traffic: P.car prop, lanes both ways, ring recycle, solid crashHit,
   near-miss swish (throttled), CLIPPED center-flash via aim-style element
N4 infinite validation: simulated 5 km ride E2E - bounded insts, constant car
   count, no leak; feel checklist for the user's hands
