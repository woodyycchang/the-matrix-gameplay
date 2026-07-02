# EREBUS STATION — 建置與驗證紀錄

單一 `erebus-station.html`,Three.js r128 走 cdnjs UMD,零外部資產。所有貼圖用 DataTexture 程序生成(無 2D canvas,headless 可跑),幾何全程序化。瀏覽器直接打開即玩。

## 操作

WASD 移動、滑鼠視角、Shift 跑步、Space 跳。點擊登艦後鎖定指標,Esc 暫停(SIGNAL LOST)。

## 世界

三層甲板、九個具名區域,全部步行可達:

| 層 | 區域 |
|---|---|
| 主甲板 y=0 | DOCKING BAY(出生點)、CENTRAL ROTUNDA、HYDROPONICS BAY、MED BAY、COMMAND BRIDGE、CREW QUARTERS |
| 露台 y=4.6 | DATA ARCHIVE(經圓廳東側高架廊) |
| 穹頂 y=12.6 | OBSERVATION DOME(圓廳兩段懸浮梯) |
| 反應爐層 y=−7 | REACTOR CORE + 盡頭維修凹室 |

日夜循環:太陽繞軌 240 秒,「夜」是氣態巨行星的掩蝕(角距 0.18–0.55 rad 之間平滑過渡)。HUD 右上 Ext. Light 條即時顯示。艦橋觀景窗白晝側會投入光柱。

鬼事件(導演系統,各觸發一次):醫療艙櫃門自行擺開;首次踏入反應爐觸發全區斷電 → 紅色緊急燈 → 半功率恢復,配 WebAudio 斷電/耳語/警報;凹室盡頭人影淡入,靠近即散。四則船員日誌靠近終端自動顯示(打字機效果)。音訊全程序合成:雙鋸齒低頻嗡鳴、通風嘶聲、隨機金屬敲擊、腳步、跳躍落地。

## 驗證矩陣(jsdom + 遊戲本體物理,16/16 通過)

| # | 檢查 | 結果 |
|---|---|---|
| 1 | 開機、hooks 掛載 | PASS |
| 2 | 零 console 錯誤(headless 無 WebGL 警告除外) | PASS |
| 3 | ≥6 具名區域 | PASS(9) |
| 4 | 9 區名稱唯一 | PASS |
| 5 | 各區參考點分類正確 | PASS |
| 6 | 每區 2.5m 落下著地(不穿地板) | PASS |
| 7 | 8 方向×9 區衝撞 4 秒不穿牆、不出船殼、不嵌入(72 回合) | PASS |
| 8 | 3.4m 低天花板跳躍不穿頂 | PASS(頭頂最高 2.771) |
| 9 | BFS 步行圖自出生點覆蓋 9 區 | PASS(8527 節點) |
| 10 | 連續實走巡迴 9 區(真物理、非傳送) | PASS(8952 步,75 秒模擬) |
| 11 | 每區 HUD 標籤觸發 | PASS |
| 12 | 掩蝕夜(vis=0)與白晝(vis=1)成立 | PASS |
| 13 | 反應爐斷電序列首次進入觸發 | PASS(phase=4) |
| 14 | 凹室人影事件武裝 | PASS |
| 15 | 4 則日誌就位 | PASS |
| 16 | 20k 物理步 <2.5s | PASS(約 100ms,~19 萬步/秒) |

截圖:headless-gl + xvfb 渲 12 個機位(1280×720),逐張人工檢視兩輪。

## 測試抓到的三個真 bug

1. 艦橋門檻卡死:指揮台階 0.4m 貼齊門面,step-up 舊寫法固定 0.12 遞增最多試到 0.36,搆不到 0.40。改為直接取擋路 collider 頂面當抬升候選,精確落腳。
2. 圓廳角柱吃掉動線:4.5m² 角柱(跨 8.5–13)擋住上行梯末段、露台轉角與檔案庫門口,BFS 與實走同時失敗。改 1.6m² 貼角壁柱,環廊淨空。
3. jsdom 與 headless-gl 跨 realm:jsdom 內建立的 TypedArray 過不了 node 端 headless-gl 的參數檢查,texture/buffer 上傳全部無效,畫面只剩清色。截圖 harness 改為 node realm 直跑遊戲腳本(最小 DOM stub)。

另修:可站性探針的淨空檢查改由膝高(地面 +0.45)起算,消除相鄰梯階毫米級薄邊誤判。

## 視覺 /loop

Pass 1:曝光 1.15→1.24、半球光提升;圓廳加牆面資料螢幕、上緣環燈、露台底光、地面雙環紋;碼頭牆肋、管線、氣閘螢幕;反應爐核心槽 2.6、頂環、冷卻渠 2.4、東牆管線與接線盒、蒸汽加濃;醫療降白光補青色;艦橋雙天花燈條;水耕生長燈與水槽提亮;穹頂地緣燈;檔案庫天花燈條;凹室背光與人影加寬。
Pass 2:圓廳中段牆帶 + 細青線;艦橋光柱 0.10→0.15。
每輪後全套 16 項回歸,均綠。

## 重跑方式

```
npm i three@0.128.0 jsdom pngjs
node test.mjs                 # 16 項驗證
xvfb-run -a node shot.mjs     # 需 headless-gl(gl 套件)+ xvfb
```
