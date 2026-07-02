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

## 7. 無限走廊：跑不掉的那種

追加需求：走廊要無限。放進這場戲的位置只有一個——封印之後。那扇「永遠不開的雙門」在退路封磚的同一刻打開，門後是同一條走廊，一段接一段，沒有盡頭。你可以跑，電話永遠在背後一段有限的距離。這比單純的長走廊更貼題：déjà vu 吃掉了整條走廊。

做法不搞程序生成。三個共用同一份 mesh 的週期段（P = 7.2，地板、護牆、凸牆、假門、樑、燈各一組），玩家越過 wrap 線就平移一個週期。縫藏在背後：只有面向遠方（sin(yaw) < −0.35）才觸發 wrap，回頭看的人看不到跳接；倒退硬闖有 −HL − 2.75P 的保險線兜底。封印前雙門實心、collider 在位，既有 789 條斷言的地基一寸沒動。

✗✗ track 斷言拿 laps 累計值對 jumps 數——proof-1 那段衝刺先偷跑了一圈,差一。改記差值。
✗✗ wrap 位移斷言容差寫 1e-9——teleport 是精確的,但同一 tick 物理還會再走 0.13。容差放寬到一個 tick 的位移。
✗✗ 回程測試全速衝向出口——直接衝進 booth 把電話接了,整個場景傳送回 void,insts 剩 1,後半段斷言全滅。教訓很電影:出口就在路上,你不想接也會接。改成有界回程,跨過門線就停。
✗✗ 第一個 tracked tick 就 wrap——不連續點落在 track[0] 之前,帳面少一圈。track 先塞起點再開跑。

## 8. 門為你開

追加：走近門，門要自己開，然後一直循環。封印從「遠門瞬間打開」改成「遠門上膛」——你走到 2.6 公尺內，雙葉往前為你分開；離開 3.1 公尺，在你背後緩緩合上。循環區每個週期掛同一樘門，葉片是掛在 pid 5 鉸鏈上的活動實例，開闔有吱呀聲，關上時是實牆，開到一半就能擠過去——碰撞器在 0.5 rad 就先讓路，人到門邊時葉片還在擺，剛好。

✗✗ 第一版全門同步、釋放距離 3.9：帶內離最近門最遠只有 3.6，門一開永不關，形同虛設。改每門獨立、觸發 2.6 釋放 3.1，兩個都壓進半週期以下。
✗✗ 衰減殘影：剛穿過的門在 wrap 瞬間還在關（角度 1.6），wrap 之後它變成「前方」的門——前一秒前方是關的，後一秒是開的，縫露餡。修法把門的記憶跟人一起平移：wrap 時每扇週期門的角度往前搬一格，身後那扇帶著開度過縫，前方那扇讀 0。你的歷史被走廊一起搬走，這句話在這個 repo 裡是字面意義。
✗✗ 門葉會動、會擋、就是看不見——leafPair 造了實例，沒人推進 s.insts。冒煙全靠碰撞器矇混過關，測試數葉片（要 8 片，只有 2）才逮到。

## 核心結論，各證兩次

**C1 重播＝錄音。** 證一（狀態層）：pass 1 與 pass 2 各 420 tick 的九元組逐一全等，且 pass 2 套用的就是 rec 本體。證二（繪製層）：固定相機、固定 t，tick K 兩個 pass 的貓 poly op 序列化逐字相等。

**C2 恰一變化。** 證一（diff）：tick-matched 全場景序列化快照，兩個 pass 相差恰好 1 筆，id 等於 chosen。證二（普查）：其餘每個候選 state 原封不動，chosen 的 state 等於它的 alt。挑選池本身用 scene graph 掃描重建，跟 dv.cands 全等——「執行期從 scene graph 挑」不是嘴上說說。

**C3 glyph 重定序看得見。** 證一（機制）：epoch 單獨翻轉，同一組錨點座標不動、字元全換，翻回去字元復原。證二（實戰）：真 mutation 後 chosen 的字場改變、旁觀 fixture 的字場逐字不變；churn 開關在同一瞬間渲染出不同畫面，證明重定序是動畫不是靜態換圖。

**C4 退路真的沒了。** 證一：seal 前能走出拱門上樓梯間、再走回來（雙向通行實測）。證二：seal 後全速衝刺停在 x=9.03，門面在 9.5。

**C5 決定性。** 兩局相同腳本：rec 全等、挑中同一件。

**C7 門只認距離。** 證一：站在 −19.0，只有 −20.3 那扇開（角度 1.86、collider 讓位），下一扇 −13.1 紋絲不動；走到帶中間站定，四扇全關、四個 collider 全數歸位。證二：六秒九圈，每個接縫「前方門讀關」與「身後門帶開度過縫」各計九次，兩個計數都恰等於圈數。

**C6 走廊無限、但回程有限。** 證一：封印前同一段衝刺在遠門被擋（−9.4 停下），封印後原樣穿過——門是真的開了，不是換貼圖。證二：六秒衝刺繞了 7 圈，軌跡上每個不連續點恰等於一個週期（±一 tick 位移），最終位置仍落在 wrap 帶內——跑再久都在原地；反向走回門口用時有限，場景還是同一個場景。

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
- **T11 doors that open for you**：C7 兩證，外加一次開門恰一聲吱呀、雙葉鏡像、八片葉子都在場上。
- **T10 infinite hallway**：C6 兩證，外加三段共 mesh（重複是字面意義的重複）、facing gate 放行、硬 wrap 兜底、迴圈區雙模式渲染無 NaN、soak 加 500 幀繞圈。

**681 → 827，FAIL 0。** 七張 headless 截圖：貓過門洞、近看 CAT 字場、glitch 白熾 churn、第二遍（這局換掉的是燈——走廊暗了一格，你不確定，所以你按 C）、磚牆退路、那條沒有盡頭的走廊、以及一樘正在為你分開的門。
