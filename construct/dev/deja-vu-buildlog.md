# build log — the déjà vu program（黑貓走廊）

格式：Contemplator。死枝標 ✗（設計期淘汰）或 ✗✗（實跑炸掉）。核心結論各給兩條獨立證據。結尾附 T1–Tn。

---

## 0. 先讀原著，再定 litmus

電影裡 Neo 在旅館走廊看見黑貓經過門口，幾秒後同一隻貓用同一個走法再過一次。Trinity 說 déjà vu 是 Matrix 的 glitch，發生在「他們改了什麼東西」的時候。改的東西是實體的：窗戶被磚封死、退路被切斷。

所以這場戲的 litmus 不是「貓走兩次」。是三件事綁在一起：

1. 第二次必須是**重播錄音**，不是第二段長得像的動畫。
2. 兩次之間，走廊裡**恰好一件**東西真的換了狀態，而且是執行期從 scene graph 挑的。
3. 玩家按 C 能**驗證**：變掉的那件東西，它的 code 真的重排了。

假版本在 1 會用「同參數重跑一次模擬」，在 2 會寫死改哪個，在 3 會閃一下白光就當交代。三個都能用斷言抓。

## 1. repo 現況比我想的舊一格

Hmm。prompt 說 construct/，clone 下來 main 上 THE CONSTRUCT 還住在 repo 根目錄。上次整理倉庫的成果是打包成 bundle 交付的，沒推上 GitHub。

兩條路。直接在根目錄做，之後套 bundle 會把我的新檔留在原地、其他東西搬走，樹會裂開。✗ 不行。

在自己的分支上先重演那次搬遷（純 git mv），再疊功能。之後不管是 merge 我的分支還是套他的 bundle，rename 會收斂。搬完先跑一次套件：**681 全綠**（對，不是 677——main 在那之後又長了四條）。這是分支的第一個 commit。

## 2. replay 的骨架：為什麼一定要「錄」

引擎的更新是變動 dt 進來（瀏覽器端有 1/60 accumulator，但 slowmo 會縮放 dt，測試端也可能餵任意 dt）。「同 seed 重跑」在這種地方保證漂。✗ 淘汰，不寫。

定案：走廊場景自帶固定 60Hz tick accumulator。貓的整段行走是 `C.catPose(p)`——tick 序號的純函數，九個數字：位置三個、朝向、四條腿、尾巴。pass 1 每 tick 算一次、套到 instance、**推進 rec 陣列**；pass 2 每 tick 從 `rec[p]` 取出來套，一行模擬都不跑。錄音本身就是重播。

貓用人偶同一套 vp/pivots 骨架：0 身體頭、1–4 對角步態的腿、5 尾巴（pid 5 繞 Y 轉，正好是甩尾）。貓貼北牆走（z = −1.08），從壁爐凸牆後面進、另一側凸牆後面出，中途正面切過那扇亮著暖光的門洞。近看 code vision 時，貓身上的 glyph 拼的是 C-A-T——這是引擎本來就有的 label 機制，白撿。

## 3. glitch：一件事，執行期挑

三個候選掛在 scene graph 上，各帶 `mut` 描述子：半開的門→磚封、走廊窗→加鐵條、天花板燈→死燈。glitch 那一 tick 用 `C.rng((game.time*997|0) ^ 0x2a17)` 挑一個——time 取決於你什麼時候開口要走廊，所以是真的執行期；腳本固定時它又是決定性的，測試才站得住。

mutation 做五件事：換 mesh、翻 state、bump `glyphEpoch`、點燃 `reResolve`、歸零 loadT 讓它用引擎自己的 materialize 重新長出來。引擎端 glyph seed 混入 epoch：`an.s ^ (epoch * 2654435761)`，reResolve > 0 期間時間桶加速 22 倍——字元先狂轉再落定。draw list 形狀不變，只是 glyph op 多帶一個 `id`，測試才能認親。

## 4. 紅燈一：近看什麼都沒變

✗✗ 測試「epoch 翻轉會換字」在 window 上直接 FAIL。查引擎：7 公尺內 code vision 不用 seed，改拼物件的 label。epoch 對近距離完全無效。

這不是測試選錯對象而已——是設計漏洞。「多疑的玩家走近驗證」是需求原文，而走近的人恰好什麼都看不到。

修法反而讓場景變好：**mutation 同時改名**。門變 `brick`，窗變 `bars`，燈變 `dead`，退路變 `wall`。churn 期間壓掉 label 拼字（用 seed 亂轉），reResolve 衰減完，字元落回來拼的是**它變成的東西**。近看，code 自己招供。遠看，seed 重排。兩個距離都封死了。

（連帶 ✗✗：determinism 斷言還在比舊名 door/window/lamp，被新名打臉一次。改比 brick/bars/dead。）

## 5. 紅燈二、三：小的，但都是真的

✗✗ `runTo` 在 transition 的 0.38 秒窗口裡讀 `scene.dv`——那時場景還是 void，沒有 dv，TypeError。while 條件改成「dv 存在且 phase 相符」才停。

✗✗ 節拍錯：booth 的「There's the exit」搶在「the way you came in is a wall now」前面講。operator 先解釋牆、說「listen for it」、然後電話才響，戲才對。booth 延後 330 tick 生成，transcript 重跑，順序落位。

## 6. 收尾與封路

pass 2 播完 30 tick，拱門換成磚牆、collider 落下、玩家若站在門線上被推回走廊內側。全弧約 24 秒：settle 2.5s → 走 7s → glitch 0.87s → 重播 7s → 封 → 電話。走進 booth 掛斷，回到白色 void——一條完整的路。

## 核心結論，各證兩次

**C1 重播＝錄音。** 證一（狀態層）：pass 1 與 pass 2 各 420 tick 的九元組逐一全等，且 pass 2 套用的就是 rec 本體。證二（繪製層）：固定相機、固定 t，tick K 兩個 pass 的貓 poly op 序列化逐字相等。

**C2 恰一變化。** 證一（diff）：tick-matched 全場景序列化快照，兩個 pass 相差恰好 1 筆，id 等於 chosen。證二（普查）：其餘每個候選 state 原封不動，chosen 的 state 等於它的 alt。挑選池本身用 scene graph 掃描重建，跟 dv.cands 全等——「執行期從 scene graph 挑」不是嘴上說說。

**C3 glyph 重定序看得見。** 證一（機制）：epoch 單獨翻轉，同一組錨點座標不動、字元全換，翻回去字元復原。證二（實戰）：真 mutation 後 chosen 的字場改變、旁觀 fixture 的字場逐字不變；churn 開關在同一瞬間渲染出不同畫面，證明重定序是動畫不是靜態換圖。

**C4 退路真的沒了。** 證一：seal 前能走出拱門上樓梯間、再走回來（雙向通行實測）。證二：seal 後全速衝刺停在 x=9.03，門面在 9.5。

**C5 決定性。** 兩局相同腳本：rec 全等、挑中同一件。

## T1–Tn

- **T1 parser**：'a hallway' / 'deja vu' / 'déjà vu' / 'corridor please' / 'that hallway again' 全部落到 hallway；chair、unknown 舊行為不動。
- **T2 fixtures**：貓與四對狀態 mesh 建得出、頂點有限、有 glyph 錨點；貓有腿有尾巴的 pivot；磚門和木門面數不同（換體，不是換漆）。
- **T3 true replay**：C1 兩證。
- **T4 one genuine change**：C2 兩證，含挑選池＝scene graph 掃描。
- **T5 glyphs re-resolve**：C3 兩證，外加錨點不動、近看拼新名、churn 可見。
- **T6 the way back**：C4 兩證，外加走廊牆體收得住衝刺。
- **T7 end to end**：封路後電話響、走進 booth、sceneName 回到 construct。
- **T8 NaN soak / sweep**：soak 腳本加走廊全弧（code 切換、行走、衝牆），render sweep 與 scene 形狀檢查納入 hallway，兩模式四方位無 NaN。
- **T9 determinism**：C5。

**681 → 789，FAIL 0。** 五張 headless 截圖：貓過門洞、近看 CAT 字場、glitch 白熾 churn、第二遍（這局換掉的是燈——走廊暗了一格，你不確定，所以你按 C）、磚牆退路。
