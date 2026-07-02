#!/bin/bash
set -e
cd "$(dirname "$0")"
OUT=dist/the-construct.html
mkdir -p dist
cat src/00_math.js src/01_glyph.js src/02_mesh.js src/03_props.js src/04_scenes.js src/05_engine.js src/06_game.js src/07_audio.js src/08_app.js src/09_intent.js > dist/_bundle.js
node --check dist/_bundle.js
python3 - "$OUT" <<'PY'
import sys
tpl = open('template.html').read()
js = open('dist/_bundle.js').read()
open(sys.argv[1],'w').write(tpl.replace('/*__INJECT__*/', js))
PY
echo "built $OUT ($(wc -c < $OUT) bytes)"
# stamp the build so cache-vs-current is decidable at a glance
STAMP=$(date -u +%m%d-%H%M)
sed -i "s/__BUILD__/$STAMP/g" dist/the-construct.html
