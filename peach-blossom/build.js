/* build.js — concatenate src modules into standalone HTML.
   Produces two outputs:
     dist/index.html       (THREE via CDN; the shippable deliverable)
     dist/index.test.html  (THREE inlined from node_modules; for the headless harness)
*/
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "src");
const DIST = path.join(__dirname, "dist");
const THREE_MIN = path.join(__dirname, "node_modules/three/build/three.min.js");
const CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

function read(f) { return fs.readFileSync(path.join(SRC, f), "utf8"); }

const head   = read("00_head.html");
const body   = read("01_body.html");
const data   = read("10_data.js");
const engine = read("20_engine.js");
const world  = read("21_world.js");
const village = read("22_village.js");
const story  = read("30_story.js");

// All game logic in ONE classic <script> so top-level const/let bindings are shared.
const gameJS = [data, engine, world, village, story].join("\n\n");

function assemble(threeTag, extraHeadScript) {
  return [
    head,                                   // DOCTYPE, <head>…</head>, <body>
    body,                                   // DOM markup (no </body></html>)
    extraHeadScript || "",
    threeTag,                               // THREE (cdn or inlined)
    "<script>\n" + gameJS + "\n</script>",  // the game
    "</body></html>",
    ""
  ].join("\n");
}

// --- shippable: CDN three, autoboots in the user's browser ---
const shipped = assemble(`<script src="${CDN}"></script>`);

// --- test: inlined three so the sandboxed chromium (no CDN egress) can run it ---
const threeSrc = fs.readFileSync(THREE_MIN, "utf8");
const test = assemble("<script>\n" + threeSrc + "\n</script>");

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "index.html"), shipped);
fs.writeFileSync(path.join(DIST, "index.test.html"), test);

console.log("dist/index.html       ", shipped.length, "bytes");
console.log("dist/index.test.html  ", test.length, "bytes");
