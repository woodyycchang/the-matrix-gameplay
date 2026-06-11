/* harness.js — end-to-end scripted playthrough of the Peach Blossom Spring game.
   Drives the sim deterministically via __test.step (RAF is throttled in headless),
   uses real sleeps only to let setTimeout transition chains fire, asserts a long
   list of checkpoints, and writes per-phase screenshots to shots/.
*/
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { PNG } = require("pngjs");

// count warm bright pixels (the 0xffe6a8 glow) in a box around an NDC point of a screenshot
function warmPixelsAt(file, nx, ny) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const cx = Math.round((nx + 1) / 2 * png.width);
  const cy = Math.round((1 - (ny + 1) / 2) * png.height);
  let warm = 0;
  for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
    const i = (y * png.width + x) * 4;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    if (r > 200 && g > 170 && r > b + 30) warm++;
  }
  return warm;
}

const HTML = fs.readFileSync(path.join(__dirname, "../dist/index.test.html"), "utf8");
const SHOTS = path.join(__dirname, "../shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(label, cond, extra) {
  results.push({ label, ok: !!cond, extra: extra || "" });
  const tag = cond ? "PASS" : "FAIL";
  console.log(`[${tag}] ${label}${extra ? "  (" + extra + ")" : ""}`);
}

(async () => {
  const browser = await puppeteer.launch({
    args: [...chromium.args, "--use-gl=angle", "--use-angle=swiftshader",
           "--enable-webgl", "--no-sandbox", "--disable-dev-shm-usage",
           "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows",
           "--disable-renderer-backgrounding"],
    executablePath: await chromium.executablePath(),
    headless: "shell",
    protocolTimeout: 120000,
    defaultViewport: { width: 1024, height: 640, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.setContent(HTML, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__test && window.__test.state().phase !== "boot",
    { timeout: 30000, polling: 200 });
  await sleep(400);

  // ---- in-page driver (uses only __test hooks) ----
  await page.evaluate(() => {
    const T = window.__test;
    const B = 12; // frames per batch (no render) before re-checking state
    window.__drive = {
      st() { return T.state(); },
      rowToPhase(target, maxF) {
        T.hold("w", true); let n = 0, s = T.state();
        while (s.phase !== target && n < maxF) { T.frames(1 / 60, B); n += B; s = T.state(); }
        T.release(); return { s, n };
      },
      rowToU(thr, maxF) {
        T.hold("w", true); let n = 0, s = T.state();
        while (s.boatU < thr && n < maxF) { T.frames(1 / 60, B); n += B; s = T.state(); }
        T.release(); return { s, n };
      },
      rowUntilLostArrived(maxF) {
        T.hold("w", true); let n = 0, s = T.state();
        while (!s.lostArrived && n < maxF) { T.frames(1 / 60, B); n += B; s = T.state(); }
        T.release(); return { s, n };
      },
      stepN(n) { T.frames(1 / 60, n); return T.state(); },
      grove() { return T.groveAudit(); },
      cam(k) { T.setCamForShot(k); },        // this one renders (for screenshots)
      press(id) { T.press(id); },
      key(k) { T.key(k); },
      walkTo(k) { return T.walkTo(k); },
      toGate() { T.toGate(); },
      setU(u) { T.setU(u); },
      finishDlg(m) { return T.finishDialogue(m); },
      motion(n) { return T.motionAudit(n); },
      glow() { return T.glowOnScreen(); },
    };
  });

  const D = {
    st: () => page.evaluate(() => window.__drive.st()),
    rowToPhase: (t, m) => page.evaluate((t, m) => window.__drive.rowToPhase(t, m), t, m),
    rowToU: (u, m) => page.evaluate((u, m) => window.__drive.rowToU(u, m), u, m),
    rowUntilLost: (m) => page.evaluate((m) => window.__drive.rowUntilLostArrived(m), m),
    stepN: (n) => page.evaluate((n) => window.__drive.stepN(n), n),
    grove: () => page.evaluate(() => window.__drive.grove()),
    cam: (k) => page.evaluate((k) => window.__drive.cam(k), k),
    press: (id) => page.evaluate((id) => window.__drive.press(id), id),
    key: (k) => page.evaluate((k) => window.__drive.key(k), k),
    walkTo: (k) => page.evaluate((k) => window.__drive.walkTo(k), k),
    toGate: () => page.evaluate(() => window.__drive.toGate()),
    setU: (u) => page.evaluate((u) => window.__drive.setU(u), u),
    finishDlg: (m) => page.evaluate((m) => window.__drive.finishDlg(m), m),
    motion: (n) => page.evaluate((n) => window.__drive.motion(n), n),
    glow: () => page.evaluate(() => window.__drive.glow()),
  };

  // poll state until predicate true (keeps the event loop active → timers fire reliably)
  async function waitUntil(pred, timeoutMs, label) {
    const t0 = Date.now();
    while (Date.now() - t0 < (timeoutMs || 6000)) {
      const st = await D.st();
      if (pred(st)) return st;
      await sleep(120);
    }
    return await D.st(); // last state (caller asserts)
  }

  let shotN = 0;
  async function shot(name, camKind) {
    if (camKind) await D.cam(camKind);
    const file = path.join(SHOTS, String(shotN++).padStart(2, "0") + "_" + name + ".png");
    await page.screenshot({ path: file });
    return file;
  }

  // ===== 1. TITLE =====
  let s = await D.st();
  check("boots to title phase", s.phase === "title", s.phase);
  check("title is paused", s.paused === true);
  check("5 interactable villagers present", s.interactables.length === 5, s.interactables.length + "");
  check("epilogue hidden at title", s.epiOpen === false);
  await shot("title");

  // ===== 2. START → STREAM =====
  await D.press("bStart");
  s = await D.st();
  check("bStart enters stream phase", s.phase === "stream", s.phase);
  check("unpaused after start", s.paused === false);
  check("boat heading upstream (travel +1)", s.travel === 1, s.travel + "");
  let m = await D.motion(90);
  check("boat moves when rowing (upstream)", m.moved > 0.3, "moved=" + m.moved);
  check("bow leads the way upstream (facing = velocity)", m.facingDotVel > 0.5, "dot=" + m.facingDotVel);
  check("camera follows from behind upstream", m.camDotVel > 0.5 && m.camSeesIt > 0.5,
    `camDotVel=${m.camDotVel} sees=${m.camSeesIt}`);
  await D.stepN(30);
  await shot("stream", "boat");

  // ===== 3. GROVE (中無雜樹) =====
  let r = await D.rowToPhase("grove", 1500);
  check("rows into grove phase", r.s.phase === "grove", "frames " + r.n);
  check("petals fall in the grove", r.s.petals === true);
  const ga = await D.grove();
  check("grove is pure peach (中無雜樹): 0 non-peach inside", ga.bad === 0, `inGrove=${ga.inGrove} bad=${ga.bad}`);
  check("grove actually has trees", ga.inGrove > 50, ga.inGrove + "");
  await D.stepN(20);
  await shot("grove", "boat");

  // ===== 4. SOURCE (山有小口．．髣髴若有光) =====
  r = await D.rowToPhase("source", 1800);
  check("reaches the stream's source", r.s.phase === "source", "frames " + r.n);
  // ramp the glow by rowing right up to the cliff mouth
  r = await D.rowToU(0.945, 800);
  s = await D.st();
  check("boat clamps at the landing (≤ landingU)", s.boatU <= 0.96, s.boatU + "");
  check("cliff-mouth light glows as you near it", s.glow > 0.4, "glow=" + s.glow);
  await D.stepN(5);
  s = await D.st();
  check("prompt to leave the boat appears", /棄舟/.test(s.prompt || ""), s.prompt || "(none)");
  const gl = await D.glow();
  check("the faint light is visible ahead (髣髴若有光)",
    gl.inFront && Math.abs(gl.x) <= 1 && Math.abs(gl.y) <= 1, JSON.stringify(gl));
  const srcShot = await shot("source", "boat");
  const gl2 = await D.glow();   // re-project with the exact camera the shot used
  const warm = warmPixelsAt(srcShot, gl2.x, gl2.y);
  check("the light truly glows through the crack (warm pixels on screen)", warm > 10, "warmPixels=" + warm);

  // ===== 5. SQUEEZE → REVEAL (豁然開朗) =====
  await D.key("e");                 // leaveBoat: paused, fade, timer chain → doReveal
  await waitUntil((x) => x.villageVisible && x.walkerVisible, 4000); // 700ms timer
  s = await D.st();
  check("village becomes visible behind the cliff", s.villageVisible === true);
  check("walker (fisher on foot) spawns", s.walkerVisible === true);
  await waitUntil((x) => x.camMode === "cine" || x.phase === "village", 6000); // doReveal (2.9s)
  // drive the reveal cine to completion
  await D.stepN(260);
  s = await D.st();
  check("reveal cine resolves into walk mode", s.camMode === "walk", s.camMode);
  check("enters the village phase", s.phase === "village", s.phase);
  check("day counter starts at 1", s.day === 1, s.day + "");
  await shot("reveal", "walk");
  m = await D.motion(90);
  check("walker moves when walking", m.moved > 0.5, "moved=" + m.moved);
  check("walker faces the way he walks", m.facingDotVel > 0.5, "dot=" + m.facingDotVel);
  check("walk camera follows from behind", m.camDotVel > 0.5 && m.camSeesIt > 0.5,
    `camDotVel=${m.camDotVel} sees=${m.camSeesIt}`);

  // ===== 6. VILLAGE — talk to every villager =====
  const order = ["first", "elder", "farmer", "weaver", "child"];
  let prevVisited = 0;
  for (const kind of order) {
    const found = await D.walkTo(kind);
    check("can reach villager: " + kind, found === true);
    await D.stepN(6);                         // interactScan sets the prompt
    s = await D.st();
    check("prompt offered for " + kind, !!s.prompt, s.prompt || "(none)");
    await D.key("e");                         // open that villager's dialogue
    s = await D.st();
    check("dialogue opens for " + kind, s.dlg === true, "node " + s.dlgNode);
    const closed = await D.finishDlg(120);    // fast-forward, auto-pick first choices
    check("dialogue completes for " + kind, closed === true);
    await D.stepN(4);
    s = await D.st();
    check("visit recorded for " + kind + " (day advanced)", s.visited.includes(kind) && s.day > prevVisited,
      "visited=[" + s.visited.join(",") + "] day=" + s.day);
    prevVisited = s.day;
    if (kind === "first") {
      check("first feast switches objective (firstFeastDone)", s.visited.includes("first"));
      await shot("village_first", "walk");
    }
    if (kind === "weaver") {
      check("warned & ready to leave after 4 households", s.leaveReady === true,
        "leaveReady=" + s.leaveReady + " visited=" + s.visited.length);
    }
  }
  s = await D.st();
  check("all five villagers visited", s.visited.length === 5, s.visited.join(","));
  check("several days of feasting (day ≥ 4)", s.day >= 4, "day=" + s.day);
  check("leaveReady set", s.leaveReady === true);

  // ===== 7. FAREWELL → MARKING (處處誌之) =====
  await D.toGate();
  await D.stepN(6);
  s = await D.st();
  check("farewell prompt at the gate", /辭去/.test(s.prompt || ""), s.prompt || "(none)");
  await D.key("e");                 // farewell dialogue
  s = await D.st();
  check("farewell dialogue opens", s.dlg === true, "node " + s.dlgNode);
  await D.finishDlg(60);            // → begin_marking → leaveVillage (timer)
  await waitUntil((x) => x.phase === "marking", 4000);
  s = await D.st();
  check("boards the boat and enters marking phase", s.phase === "marking", s.phase);
  check("boat now heads downstream (travel -1)", s.travel === -1, s.travel + "");
  check("petals drift again on the way out", s.petals === true);
  check("village hidden once you leave", s.villageVisible === false);
  m = await D.motion(90);
  check("boat moves when rowing out (downstream)", m.moved > 0.3, "moved=" + m.moved);
  check("bow leads the way downstream", m.facingDotVel > 0.5, "dot=" + m.facingDotVel);
  check("camera follows from behind downstream", m.camDotVel > 0.5 && m.camSeesIt > 0.5,
    `camDotVel=${m.camDotVel} sees=${m.camSeesIt}`);
  await D.stepN(20);
  await shot("marking", "boat");

  // place marks down the river
  let markState = null;
  for (let i = 0; i < 9; i++) {
    await D.setU(0.90 - i * 0.095);
    await D.stepN(5);
    s = await D.st();
    if (/誌之/.test(s.prompt || "")) { await D.key("e"); }
    markState = await D.st();
  }
  check("at least 8 marks placed along the route", markState.marks >= 8, "marks=" + markState.marks);

  // ===== 8. REPORT (詣太守，說如此) =====
  await D.setU(0.04);
  await D.stepN(6);
  s = await D.st();
  check("prompt to report to the prefect", /稟報/.test(s.prompt || ""), s.prompt || "(none)");
  await D.key("e");                 // reachReport (timer) → prefect dialogue
  await waitUntil((x) => x.phase === "report" && x.dlg, 4000);
  s = await D.st();
  check("enters report phase", s.phase === "report", s.phase);
  check("prefect dialogue opens", s.dlg === true, "node " + s.dlgNode);
  await shot("report", "boat");

  // ===== 9. LOST (尋向所誌，遂迷，不復得路) =====
  await D.finishDlg(60);            // → set_out_again → startLost (timer)
  await waitUntil((x) => x.phase === "lost", 4000);
  s = await D.st();
  check("enters the lost phase", s.phase === "lost", s.phase);
  check("every mark has vanished (marks = 0)", s.marks === 0, "marks=" + s.marks);
  check("cliff-mouth light is gone (glow = 0)", s.glow === 0, "glow=" + s.glow);
  check("petals no longer fall", s.petals === false);
  m = await D.motion(90);
  check("searching upstream: motion still coherent", m.facingDotVel > 0.5 && m.camDotVel > 0.5,
    `facing=${m.facingDotVel} cam=${m.camDotVel}`);
  await D.stepN(10);
  await shot("lost", "boat");

  // row up to where the opening was — it leads nowhere
  r = await D.rowUntilLost(1500);
  check("rows back upstream searching", r.s.lostArrived === true, "frames " + r.n);
  await waitUntil((x) => x.epiOpen, 6000); // triggerEpilogue timer (2.6s after lostArrived)
  s = await D.st();
  check("epilogue appears (後遂無問津者)", s.epiOpen === true);
  check("sim paused at the epilogue", s.paused === true);
  await shot("epilogue");

  // ===== no script errors the whole way =====
  check("no uncaught page errors during playthrough", pageErrors.length === 0,
    pageErrors.slice(0, 3).join(" | "));

  await browser.close();

  // ---- summary ----
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n=================================================");
  console.log(`CHECKPOINTS: ${passed}/${results.length} passed`);
  if (failed.length) {
    console.log("FAILED:");
    failed.forEach((f) => console.log("   ✗ " + f.label + (f.extra ? "  (" + f.extra + ")" : "")));
  } else {
    console.log("ALL CHECKPOINTS PASSED ✓");
  }
  console.log("=================================================");
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("HARNESS FAIL:", e); process.exit(2); });
