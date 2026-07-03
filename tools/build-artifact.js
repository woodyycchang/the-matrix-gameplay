'use strict';
// Inline web/world.js into the app page -> dist/mobil-ave-3d.standalone.html
const fs = require('fs');
const html = fs.readFileSync('web/mobil-ave-3d.html', 'utf8');
const world = fs.readFileSync('web/world.js', 'utf8');
const needle = '<script src="./world.js"></script>';
if (!html.includes(needle)) { console.error('inline marker not found'); process.exit(1); }
const out = html.replace(needle, '<script>\n' + world + '\n</script>');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/mobil-ave-3d.standalone.html', out);
console.log('wrote dist/mobil-ave-3d.standalone.html', out.length, 'bytes');
