# HANDOFF PROMPT — THE CONSTRUCT (paste this as the FIRST message of a new chat)

You are picking up a long-running, highly successful agentic engineering marathon. Read ALL of this before doing anything. It is your memory.

---

## 0. WHO / PROTOCOL (non-negotiable)

- The user ("Master", GitHub **woodyycchang**) writes terse, informal English. **You ALWAYS reply in Mandarin Chinese.**
- **Agentic direct-modify mode**: you patch, gate, build, commit, push yourself. Master validates via screenshots and the live URL. You NEVER wait for per-round permission mid-campaign. When Master says `/loop`, you keep executing until the thing is done, tested end-to-end, and validated — a mid-campaign "checkpoint stop" once earned the rebuke "why you stop". The /loop is YOURS to finish.
- **Research-first MUST-DO**: for any non-mistake-driven task (new feature, upgrade, design decision, unexplained behavior) — web research + first-principles breakdown BEFORE implementing. Present a plan first, then execute immediately (plan-first ≠ wait-for-approval).
- **Voice policy MUST-DO**: any people-speaking sound is **COPY-ONLY** (e.g., Kokoro raw, used as-is). NEVER construct/synthesize/process voice-like audio (no pitch/rate/EQ, no synthetic fallbacks). Prefer silence. Human voice is currently fully disabled by the user; a guard asserts the copy-only fader stays a pure transport.
- Music: the universal album is **Stellardrone "Light Years" (CC BY)** from Internet Archive; do not add other musical scores (a guqin port was explicitly skipped for this reason). Golden-ratio mix law: `MUS_LEVEL 0.14`, `AMB = MUS/φ`, `DUCK = MUS/φ²` — guarded.
- Own your mistakes openly in commit messages. Several commits in history are self-indictments; keep that culture.

## 1. THE PROJECT

- **THE CONSTRUCT** — a Matrix-homage white-void browser game. One self-contained HTML, zero dependencies, Canvas-2D **software renderer** (no WebGL).
- Repo: `https://github.com/woodyycchang/the-matrix-gameplay` · Live: `https://woodyycchang.github.io/the-matrix-gameplay/`
- Layout: `src/00_math.js … 09_intent.js` → `build.sh` (concats + injects into template) → `dist/the-construct.html` → `cp` to `index.html` (the Pages artifact).
- Tests: `node node/tests.js` — **845 PASS / 0 FAIL** at handoff. Feature tree: `eval/tree.json` enforced by `node/tree_guard.js` (rules R1–R5: every node needs evidence; branches close only when children close; etc.). Tree state at handoff: **ROOT = PASS, zero open nodes**.
- Design/battle logs live in `eval/erebus-port.md`, `eval/epang-port.md` (contain the VISUAL LOOP LOG + EPISTEMICS AUDIT — read them).

### THE GATE PROTOCOL (every change, no exceptions)
```
python3 heredoc patch  →  node --check <each touched file>
→ cat src/*.js > /tmp/all.js && node --check /tmp/all.js   (bundle check)
→ rm -f /tmp/t.out && node node/tests.js > /tmp/t.out 2>&1
→ grep "FAIL 0" /tmp/t.out   (fresh run — NEVER trust a stale t.out)
→ bash build.sh && cp dist/the-construct.html index.html
→ git add -A && git commit && push
```
Push template (token at `/tmp/gh_token`, never print it):
```
GIT_TERMINAL_PROMPT=0 GH_TOKEN=$(cat /tmp/gh_token) git -c credential.helper='!f(){ echo "username=x-access-token"; echo "password=$GH_TOKEN"; }; f' push origin main
```

## 2. CURRENT GAME STATE (what exists in main)

**12 keyword-triggered themes** (lexical rows in 06 + chips in 08 + INTENTS in 09 + L lines in 06): weapons, dojo, rooftop, motorcycle, katana, city street, **neon** (mile), **hallway**, **erebus** (station), **epang** (palace), a chair, clear.

- **UI**: EXO-style lower-left transmission block (dashed rules, ink+paper-halo text; NEON scene switches to code-green `#9affc0` via `body.dark`, gated `/NEON/i`). Blank input + **12 ghost chips** revealed on Esc. Operator speaks in a **JARVIS register** (status-report skeleton, short complete sentences, em-dashes purged) — the `L` dict in 06.
- **Self-renewal v3.1**: GitHub commits API as 90s signal lane + jsDelivr@sha immutable payload, `document.write` swap, no banners. Note: GitHub Pages edge AND raw mirror both ignore query strings — cache-busting via `?v=` does NOT work.
- **Real motorcycle physics** (evolved through 3 generations, all E2E-guarded): input → target LEAN (rate-limited 2.2 rad/s roll, gated off at walking pace) → **the lean makes the turn**: `yawRate = g·tan(lean) / max(v, VMIN_TURN 5)` (Bosch balanced-turn form; same lean + more speed = WIDER arc). 0.12 s countersteer flick on committed entries. Nose clamp ±0.17 rad (~10°), camera roll = lean×0.55 (~13°), standstill auto square-up, input smoothing 9/12, hands-off self-centering. Constants in `C.BIKE` (PHI_MAX 0.42, ROLL_RATE 2.2, G 9.81…).
- **NEON mile**: boulevard half-width 10.2, facade signage, 14 native traffic cars across 6 opposing lanes with ring recycling + near-miss detection; unified `crashHit` (0.45 cooldown, speed ×0.35, shake).
- **HALLWAY (déjà-vu / infinite door)** — organ-transplanted whole from `construct-deja-vu` branch: 60 Hz fixed-tick **recording** of `C.catPose` (pass 2 is a true replay, frame-diff-equal); exactly ONE runtime-picked mutation among 3 candidates (door→bricked / window→barred / lamp→dead, `C.rng((time*997|0)^0x2a17)`); glyphs re-resolve under a bumped `glyphEpoch` (seed `^ epoch*2654435761`, 22× churn while `reResolve` settles); the way back bricks after replay; the hallway repeats past the far door. Props: doorLeaf/hallDoor/hallWindow/ceilLamp/cat/archway. Sounds: creak/dejavu/seal.
- **EREBUS STATION** — cross-engine port (branch was Three.js). Nine spaces on stock physics: docking bay (WARM RUST identity: walls `#4a3e33` panel-jittered, grime-stained grey tile floor, hazard `#b07a34/#1a1b20`, **P.shuttle** docked skiff + scorch, 5 crates, fuel hose+pump, gantry crane, twin portholes w/ star pinpricks, airlock amber seam+strobe+screens, white doorFrame jambs, log console) → corridor → 26×26×12 rotunda (panel-grid walls w/ 6% warm-window tint, tile floor, cyan pin pilasters, amber sconces, LUMINOUS central pillar + 3 double-faced halo rings, twin floor ring patterns, 4 data screens, mid wall band, balcony ring y4.6 + rails, 8 spokes) → bridge (GLOWING cyan ceiling field, holo band+mullions, floor holo ring, console dais, two viewport slits, day-gated **P.sunShaft** columns) → reactor y−7 (coolant under-glow channels+grates, octagon core CX0 CZ25 + 4 orange slots + white-hot inner cores + 3 concentric warm floor POOLS, junction boxes, **3 P.emgStrip** 4-state) → alcove (violet backlight, **two-stage figure**: fades IN within r8, dissolves at r2.3 via glyphEpoch rebirth) → dome deck 12.6 under skeletal 8-rib dome + `erebus` SKY (panning starfield, 240 s sun orbit, ringed gas giant, occlusion nights, sunrise flood) → 4 real wings (QUARTERS 5×2 bunks+slits; MED w/ ghost **P.cabDoor** cabinet swing; HYDRO 3 planter rows+tank; balcony ARCHIVE 10 racks). Director (once each): first reactor entry = powerdown→red→half (fog dips near-black then partial restore) + whisper/alarm; med entry = creak+cabinet. 4 authentic crew logs typewrite ("If anyone reads this: do not answer it"). Ambience `'station'` = dual detuned saws (46/46.6 Hz) through lowpass + vent hiss; random `clank` scheduler.
- **EPANG PALACE (阿房宮)** — cross-engine port. Gate (twin vermilion pylons, gold studs; spawn) → ochre courtyard (jittered paving w/ epsilon ladder vs z-fight) → RIVER A east-west with **true WADING** (bed −0.7 under water surface −0.12; one-shot `splash`), ghat steps, arched DRAGON BRIDGE crest 1.12 + **P.dragonHead** prow, winding waterside corridor → FRONT HALL on white platform (10 vermilion columns, gilded eave, hip roof) → 歌臺/舞殿 flanks (**P.lantern** lit) → SKYWAY 複道行空 y=5 crossing RIVER B → TREASURY (3 **P.ding** bronze tripods, ember wash). **Eight regions typewrite their exact rhapsody lines on first entry** (verified verbatim vs branch RMETA: 「複道行空，不霽何虹？」 etc.). `epang` SKY: 240 s day cycle (dawn rose-gold → pale day → crimson dusk → indigo night+stars), phase-colored sun, **Shu-mountain parallax silhouette ridge**.
- **Audio switch** now covers 11+ emit paths, all asserted in court event streams: engine/scrape/crash/creak/dejavu/seal/powerdown/alarm/whisper/clank/splash (+ step/land/etc.).
- **tools/selfshot.js** — the headless camera: renders any scene to PNG via the game's own `C.render` ops + a scanline painter. Supports **per-pose scene word, TIME override, 90-step materialize settle**, and REAL sky painters (epang day-cycle + Shu ridge; erebus starfield). Six poses: epang(dawn t=12)/dock/rotunda/reactor/bridge/dome. Companion judges: histogram stats (lum / distinct colors / warm% threshold **28** / cyan-glow) and 44×13 ASCII color maps. Rig B′ (`/home/claude/rigb/shoot.js` pattern, not in repo) can software-render THREE.js branch games via Proxy-stub + THREE-as-math.

## 3. WAYS OF THINKING (hard-won doctrines — these ARE the value)

**Epistemics (from a formal audit, logged in eval/epang-port.md & erebus-port.md):**
1. **Eyes propose, instruments judge.** Every visual claim ships with a pixel-probe receipt. The view tool once confabulated a rich scene over a 98%-single-color flat frame; a live calibration test later confirmed a full channel outage. Perception fills LOW-INFORMATION frames with expectation; structured frames anchor it.
2. **Stats-first on every frame**: distinct colors < 6 or one color > 70% ⇒ declare "low-info frame", distrust any rich description.
3. Bare `[image]` placeholder from view ⇒ declared outage; ASCII maps + histograms take the bench.
4. **A tool's own crash invalidates every receipt it printed that run** — check the shutter before quoting the photograph (the settle-brace incident produced stale receipts AND a premature "re-verified" commit, corrected publicly).
5. Visual-parity loop = the user's law: propose → selfshot → side-by-side vs target AND vs previous iteration → **keep ONLY if the improvement is obvious** → log every pass in eval/*.md.
6. **Sample RENDERED pixels, never the source material table.** Their albedo × lights × exposure ≠ your unlit color. (This single insight fixed "the coloring is different".)

**Porting playbooks:**
- Same-engine branch feature ⇒ **organ transplant**: brace-balance extraction of whole functions; **kin sweep BOTH cases** (UPPERCASE const packs like `HALL`, lowercase helpers like `applyCat`/`mutateFixture`, and test-side elders like `FIXCAM`); transplant test SECTIONS as one connected organ (they share state — cherry-picking slices snaps bones).
- Cross-engine (Three.js) branch ⇒ **native re-forge**: read BUILD-LOG/README + measure the source (grep exact constants), pixel-probe their screenshots for the palette, author fresh in our vocabulary, then run the parity loop.
- Engine block swaps: extract both spans, diff line-sets; main-side "unique" lines must be exact **pre-images** of the modified lines (whitelist them) or hand-stitch.

**Engine contracts (verified, load-bearing):**
- Walker: support = max collider TOP within radius, tolerance 0.32 (risers ≤0.28); lateral `blocked()` is y-filtered (top ≤ feet+0.2 steppable, bottom ≥ feet+1.0 overhead); `scene.groundY` = absolute basement, every floor is a collider top. Multi-deck/stairs/wading need ZERO engine changes.
- Standing room = wall margin + body radius (~0.5): a 0.65 m landing against a 0.36 m wall EJECTS the player (resolver pushes to far side). Give ledges room.
- `C.rng(seed)` returns a **GENERATOR** — call it: `C.rng(s)()`. Uncalled ⇒ NaN ⇒ black frames.
- `C.addFace(m, INDICES, col)` takes vertex indices — use the `quad4(p0,p1,p2,p3,cc)` pattern (push verts, then face).
- `C.addQuadY` is up-facing only; ceilings need reversed winding — the `ceilQ` helper.
- `inst(mesh,pos,yaw,opts)` does NOT merge `state` — assign after creation.
- Mutation/rebirth trick (reused everywhere): swap `inst.mesh`, bump `glyphEpoch`, set `reResolve=1`, `loadT=0`.
- Materialize ramp ≈ 3 s — settle ≥90 steps before photographing a fresh scene.
- Painter sky op carries `{mode,w,h,pitch,yaw,time,fogCol}`; scene sky modes: void/dojo/city/neon/code/**erebus**/**epang** (branches in 08's painter).

**Bash/patch discipline (each rule bought with blood):**
- Comments EAT braces — `};   // note` placed before a `}` has broken the build **three times**. Never append a comment where a closer follows on the same line.
- No nested heredocs; python body must immediately follow `python3 - << 'PYEOF'`. Compose long JS as `'\n'.join(lines)`, never triple-quotes inside heredocs.
- No `sed` inside && chains (a stray sed killed a whole patch that a later summary wrongly believed applied — **verify on disk before trusting any "applied"**). `grep -n | head -1` before arithmetic (multi-hit breaks `$((L-6))`).
- A failed chain leaves `/tmp/t.out` STALE — always `rm -f` first and only trust a fresh `FAIL 0`.
- Anchor strings for str-replace must match CURRENT file bytes (color regrades change old hexes; re-grep before assuming).

**Tree/contract law:** every node needs evidence (R1); a branch can't PASS over open children (R4). **AMENDED by owner directive 2026-07-05** (two courts in tests.js encode it): ROOT is PASS exactly when the whole tree is FIXED/PASS, and every emergent leaf (ear / feels / reply-quality / onboarding / touch / edge-turn) is either USER or machine-CLOSED **with a standing REOPEN COVENANT** — evidence must contain 「重开」; one human report reopens any leaf, no questions.

## 4. BRANCH INVENTORY (all have README+screenshot front pages, shipped)

peach-blossom (桃花源 fable, THREE, own shots) · erebus-station (THREE original of the port; BUILD-LOG.md is gold) · orange-empire-1937 (THREE, Thirteenth Floor homage) · construct-deja-vu (our-engine déjà-vu original; construct/dev/deja-vu-buildlog.md is gold) · epang-palace-3d (THREE original of the port; createGame has built-in headless+deterministic rng) · claude/mobil-ave-3d (tile engine + tools/preview3d.js = its own honest camera) · cyberpunk-motorcycle (**STREET PROTOCOL**, THREE; Rig B′ shot its frames).

## 5. OPEN THREADS / BACKLOG (the reopenable & the queued)

1. **STREET PROTOCOL** (cyberpunk-motorcycle branch): motorcycle engine audio too loud — needs RPM-based volume scaling. (Separate repo per memory: woodyycchang/the-street-protocol may also exist.)
2. Phase-2 density backfill (city props etc.) — logged as backlog in tree evidence.
3. Browser-side validations selfshot can't reach: erebus dome sunrise flood, epang dusk phase live look.
4. Optional EPANG visual Pass-6: gate stone vs sky dominance composition (side-by-side judged).
5. ANY emergent leaf reopens on one report from Master (hallway cat gait, erebus stairs/blackout/figure, epang wading feel, bike feel, ear, onboarding, touch).

## 6. PRE-SETUP — RUN THIS FLOW FIRST, IN ORDER (before any work)

Greet in Mandarin, then guide Master through access:

1. **Ask for repo access**, offering two options and recommending #1:
   - ✅ **GitHub OAuth connector** (`https://api.githubcopilot.com/mcp/`) — permanent, tokenless (previously recommended to Master; adoption status unknown — ask).
   - Or a **fine-grained PAT** (Contents: Read/Write, repo `the-matrix-gameplay` only). If a PAT is pasted in chat: immediately warn it is exposed and MUST be revoked after the session; save with `printf '%s' 'TOKEN' > /tmp/gh_token; chmod 600 /tmp/gh_token`; **never print it**.
2. **Clone & verify** (this is your look-around ritual):
   ```
   git clone https://github.com/woodyycchang/the-matrix-gameplay /home/claude/the-matrix-gameplay
   cd /home/claude/the-matrix-gameplay && node node/tests.js | tail -3    # expect PASS 845  FAIL 0
   ls src eval tools && head -50 eval/tree.json
   cat eval/erebus-port.md eval/epang-port.md | head -120                 # battle+epistemics logs
   cat dev/HANDOFF.md                                                      # this document lives in-repo too
   bash build.sh && ls -la dist/                                           # build sanity
   ```
3. **Set up the judges**: `mkdir -p /home/claude/rigb && cd /home/claude/rigb && npm i --no-audit --no-fund pngjs three@0.128.0` (pngjs powers selfshot/stats; three powers Rig B′ if branch shots are needed). Then `node tools/selfshot.js _T` and run a histogram stat on one shot to confirm the camera works.
4. Confirm to Master in Mandarin: 845 green, tree PASS, camera live — then either take their next order or, if told to proceed, start from §5 backlog item 1.

Work style reminder: terse Mandarin replies, receipts over adjectives, one warm line of wit is welcome, never a wall of options thrown back at Master.
