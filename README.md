# 阿房宮 · Epang Palace — a walkable 3D staging of 杜牧〈阿房宮賦〉

One self-contained `index.html` (Three.js from CDN, all geometry procedural, no build step).
Open the file in any modern browser → click 入宮 → WASD to walk, mouse to look,
Shift run, Space jump, T hastens the day-night cycle, M toggles the procedural guqin+wind score.

12 named areas from the rhapsody, all reachable on foot: 前殿, 複道行空 (a walkable
mid-air skyway), 鼎鐺玉石 treasury, 歌臺, 舞殿, 廊腰縵回 (a corridor that bridges a river),
妝鏡樓, 長橋臥波 dragon bridge, 蜂房水渦 pavilion quarter, 二川溶溶 two rivers with
water-gates, plus the bare Shu mountains on the horizon (蜀山兀).

Built and verified by Claude (Anthropic): a headless bot walks every area end-to-end,
collision/wading/ceiling assertions pass, and the screenshots in `screenshots/` are
real offscreen WebGL renders of this exact file.
