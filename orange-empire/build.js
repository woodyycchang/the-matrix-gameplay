// build.js — concat src modules in order, emit dist/bundle.js + dist/index.html
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
let bundle = files.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
fs.writeFileSync(path.join(DIST, 'bundle.js'), bundle);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>The Orange Empire — Los Angeles, 1937</title>
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #07090c; overflow: hidden; }
  body { overscroll-behavior: none; }
</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
${bundle}
<\/script>
</body>
</html>
`;
fs.writeFileSync(path.join(DIST, 'index.html'), html);
console.log('built', files.length, 'modules ->', (bundle.length / 1024).toFixed(1) + 'kb bundle,',
  (html.length / 1024).toFixed(1) + 'kb html');
