/* ============================================================
   桃花源記  ·  DATA
   Source text verified against Wikisource / 陶淵明集.
   All dialogue is original game writing in the spirit of the text,
   written plainly (Traditional Chinese) with literal English glosses.
   ============================================================ */
const DATA = {};

/* The full received text of 桃花源記, broken into the canonical sentences. */
DATA.original = [
  ["晉太元中，武陵人捕魚為業。", "In the Taiyuan years of Jin, a man of Wuling made his living by fishing."],
  ["緣溪行，忘路之遠近。", "He rowed along a stream, losing track of how far he had gone."],
  ["忽逢桃花林，夾岸數百步，中無雜樹，", "Suddenly he came upon a forest of peach blossoms, lining both banks for several hundred paces, with no other kind of tree among them."],
  ["芳草鮮美，落英繽紛。", "The fragrant grasses were fresh and bright; falling petals drifted everywhere."],
  ["漁人甚異之，復前行，欲窮其林。", "The fisherman, taken with the strangeness of it, rowed on, wishing to reach the end of the grove."],
  ["林盡水源，便得一山。", "The grove ended at the stream's source, and there he found a mountain."],
  ["山有小口，髣髴若有光。", "In the mountain was a small opening, and from it seemed to come a faint light."],
  ["便舍船，從口入。", "So he left his boat and went in through the opening."],
  ["初極狹，纔通人。", "At first it was very narrow, barely wide enough for a person."],
  ["復行數十步，豁然開朗。", "After a few dozen more paces it opened out, broad and bright."],
  ["土地平曠，屋舍儼然，", "The land lay flat and open; houses stood in neat order."],
  ["有良田美池桑竹之屬。", "There were fine fields, beautiful ponds, mulberry and bamboo and the like."],
  ["阡陌交通，雞犬相聞。", "Paths crossed in every direction; the sounds of chickens and dogs answered one another."],
  ["其中往來種作，男女衣著，悉如外人。", "People came and went, tilling and planting; the dress of the men and women was just like that of folk outside."],
  ["黃髮垂髫，並怡然自樂。", "The white-haired elderly and the children with loose hanging hair were all content and happy."],
  ["見漁人，乃大驚，問所從來。", "Seeing the fisherman, they were greatly startled, and asked where he had come from."],
  ["具答之。便要還家，設酒殺雞作食。", "He answered each question. They invited him home, set out wine, killed a chicken, and made a meal."],
  ["村中聞有此人，咸來問訊。", "Hearing such a man was in the village, everyone came to ask after him."],
  ["自云先世避秦時亂，", "They told how their ancestors, fleeing the chaos of the Qin,"],
  ["率妻子邑人來此絕境，不復出焉，", "had led their wives, children, and townsfolk to this cut-off place, and never left again,"],
  ["遂與外人間隔。", "and so were sundered from the world outside."],
  ["問今是何世，乃不知有漢，無論魏晉。", "They asked what age it now was — they did not even know there had been a Han, let alone the Wei or the Jin."],
  ["此人一一為具言所聞，皆嘆惋。", "The fisherman told them, point by point, all that he had heard; and at each thing they sighed and grieved."],
  ["餘人各復延至其家，皆出酒食。", "The others each in turn invited him to their homes, and all brought out wine and food."],
  ["停數日，辭去。", "He stayed several days, then took his leave."],
  ["此中人語云：「不足為外人道也。」", "The people of the place said to him: \u201cIt is not worth speaking of to those outside.\u201d"],
  ["既出，得其船，便扶向路，處處誌之。", "Having come out, he found his boat, followed the way he had come, and marked it everywhere."],
  ["及郡下，詣太守，說如此。", "Reaching the commandery, he called on the prefect and told it just as it was."],
  ["太守即遣人隨其往，尋向所誌，遂迷，不復得路。", "The prefect at once sent men to go back with him. They looked for the marks he had made — but lost their way, and never found the road again."],
  ["南陽劉子驥，高尚士也，聞之，欣然規往，", "Liu Ziji of Nanyang, a gentleman of high ideals, heard of it and gladly planned to go,"],
  ["未果，尋病終。後遂無問津者。", "but it came to nothing; soon he fell ill and died. And after that, no one ever asked the way again."]
];

/* Captions shown on screen during each phase (classical line + gloss). */
DATA.caps = {
  stream:    ["緣溪行，忘路之遠近", "Rowing along the stream, he forgot how far he had come"],
  grove:     ["忽逢桃花林　夾岸數百步", "Suddenly, a forest of peach blossoms lining both banks"],
  grove2:    ["芳草鮮美　落英繽紛", "Fresh grasses, fragrant — and a confusion of falling petals"],
  source:    ["林盡水源，便得一山", "The grove ends at the water's source; a mountain appears"],
  opening:   ["山有小口，髣髴若有光", "A small opening in the hill — and from it, a faint light"],
  squeeze:   ["初極狹，纔通人", "At first so narrow it barely lets a person through"],
  reveal:    ["豁然開朗", "Then all at once — open, and bright"],
  village:   ["土地平曠，屋舍儼然", "Level open land; houses standing in good order"],
  warned:    ["不足為外人道也", "\u201cIt is not worth telling to those outside.\u201d"],
  marking:   ["既出　扶向路　處處誌之", "Going out, he follows the old way and marks it everywhere"],
  report:    ["及郡下，詣太守，說如此", "He reaches the commandery and tells the prefect all of it"],
  lost:      ["尋向所誌　遂迷　不復得路", "They seek the marks he left — and lose the way, for good"]
};

/* Objective-banner text per phase. */
DATA.obj = {
  stream:   ["沿溪而上，尋桃花林", "Row upstream. Find the peach grove."],
  grove:    ["穿過桃花林，尋水之源", "Pass through the blossoms to the stream's source."],
  source:   ["棄舟，尋山中小口", "Leave the boat. Find the small opening in the hill."],
  squeeze:  ["擠身入內", "Squeeze through."],
  village:  ["探訪村莊，與村人交談", "Explore the village. Speak with its people."],
  feast:    ["挨家挨戶，赴其酒食", "Be feasted, house by house."],
  leave:    ["辭去，沿路處處誌之", "Take your leave. Mark the way at every turn."],
  report:   ["回返，稟報太守", "Return and report to the prefect."],
  lost:     ["領太守之人，尋舊路", "Lead the prefect's men back along the marked road."]
};

/* ---- Dialogue trees ----
   Each node: speaker(cn), s(speaker label), lines:[[cn,en],...], then either
   choices:[{t,en,go}] or next:id or end:true / action:'...'                 */
DATA.dlg = {

  /* The first villager — the man who is startled, then invites you home. */
  startled_1: {
    s:"村人　驚", lines:[
      ["（一人正引水灌田，忽見生人，桶墜於地。）", "(A man irrigating his field looks up, sees a stranger, and drops his pail.)"],
      ["你⋯⋯你從何而來？此處外人從不曾至。", "You... where have you come from? No outsider has ever reached this place."]
    ],
    choices:[
      {t:"我順著一條溪水上來，溪邊盡是桃花。", en:"I came up a stream — its banks all peach blossom.", go:"startled_2"},
      {t:"我是個漁人，迷了路，不意至此。", en:"I'm only a fisherman. I lost my way and came here by chance.", go:"startled_2b"}
    ]
  },
  startled_2: {
    s:"村人　驚", lines:[
      ["桃花⋯⋯那片桃花還在。先祖手植，已不知幾世了。", "The peach trees... so they still stand. Our ancestors planted them. How many lifetimes ago, none of us know."],
      ["你莫怕。隨我還家，且歇一歇。", "Don't be afraid. Come home with me and rest a while."]
    ],
    next:"startled_invite"
  },
  startled_2b: {
    s:"村人　驚", lines:[
      ["迷路而至⋯⋯也好，也好。能尋來此地的，必非惡人。", "Lost your way and arrived here... well. Whoever could find this place is no ill-meaning man."],
      ["隨我還家。設些酒食，與你壓驚。", "Come home with me. We'll set out wine and food to settle your nerves."]
    ],
    next:"startled_invite"
  },
  startled_invite: {
    s:"村人", lines:[
      ["（他喚來鄰人，殺雞、溫酒，引你入屋。）", "(He calls his neighbours, kills a chicken, warms the wine, and leads you inside.)"]
    ],
    action:"first_feast"
  },

  /* The elder — explains the founding, asks what age it is. The story's core. */
  elder_1: {
    s:"村中長者", lines:[
      ["後生，坐。先飲一杯。", "Sit, young man. Drink first."],
      ["我等先世，本是秦人。", "Our ancestors were people of the Qin."]
    ],
    next:"elder_2"
  },
  elder_2: {
    s:"村中長者", lines:[
      ["秦時苛政如虎，賦役無窮，殺伐不止。", "Under the Qin the laws were cruel as tigers — endless taxes, endless levies, killing without end."],
      ["先祖率妻子鄉鄰，避亂入此山中，自此不復出焉。", "So our forebears led their families and neighbours, fled the chaos into this mountain, and never went out again."]
    ],
    choices:[
      {t:"你們在此⋯⋯多少年了？", en:"And how long have you been here?", go:"elder_howlong"},
      {t:"如今是何朝何代，你們可知？", en:"Do you know what dynasty it now is?", go:"elder_whatage"}
    ]
  },
  elder_howlong: {
    s:"村中長者", lines:[
      ["數不清了。只記得春去秋來，桃花開了又謝。", "We've lost count. We mark only the springs and autumns, the peach trees blooming and falling."],
      ["你且說說，外頭如今是何世道？", "Tell us — what is the world like now, out there?"]
    ],
    next:"elder_whatage"
  },
  elder_whatage: {
    s:"村中長者", lines:[
      ["請問如今是何世？可還是大秦的天下？", "What age is it now, may I ask? Is it still the realm of the great Qin?"]
    ],
    choices:[
      {t:"秦早已亡了。後來有漢，國祚四百餘年。", en:"The Qin fell long ago. Then came the Han — four hundred years and more.", go:"elder_han"},
      {t:"秦之後是漢，漢之後又有魏、有晉。", en:"After Qin came Han; after Han, the Wei, and then the Jin.", go:"elder_han"}
    ]
  },
  elder_han: {
    s:"村中長者", lines:[
      ["漢？⋯⋯竟不知有漢。", "Han...? We never knew there had been a Han."],
      ["（眾人面面相覷，低聲驚問。）那魏、晉，又是什麼？", "(The others exchange looks, murmuring.) And this Wei, this Jin — what are they?"]
    ],
    choices:[
      {t:"漢亡之後，天下三分，是為魏、蜀、吳。後歸於晉。", en:"After Han fell, the realm split three ways — Wei, Shu, Wu. In time all passed to Jin.", go:"elder_sigh"},
      {t:"說來話長。改朝換代，已歷數百寒暑。", en:"It's a long tale. Dynasty has given way to dynasty over many hundred years.", go:"elder_sigh"}
    ]
  },
  elder_sigh: {
    s:"村中長者", lines:[
      ["（聽罷，滿座皆嘆惋。）", "(Hearing this, the whole gathering sighs and grieves.)"],
      ["外頭竟換了這許多人間。我等卻在此，渾然不知。", "So the world outside has turned over so many times — and here we sat, knowing none of it."],
      ["既來之，便多住幾日。家家都要請你嚐一杯的。", "Since you've come, stay a few days more. Every house will want you at its table."]
    ],
    action:"elder_done"
  },

  /* The farmer — colour, daily life, the no-tax wonder. */
  farmer_1: {
    s:"耕者", lines:[
      ["客人嚐嚐這新米。今年的稻子，沉甸甸的。", "Try this new rice, traveller. This year the ears hang heavy."]
    ],
    choices:[
      {t:"你們的田，賦稅重不重？", en:"Your fields — are the taxes heavy?", go:"farmer_tax"},
      {t:"這溪裡，可有魚？", en:"Are there fish in this stream?", go:"farmer_fish"}
    ]
  },
  farmer_tax: {
    s:"耕者", lines:[
      ["賦稅？那是什麼？我等耕食鑿飲，所種皆自取。", "Taxes? What are those? We till and eat, dig wells and drink; what we grow, we keep."],
      ["（你想起外頭的徭役賦斂，一時竟不知如何說起。）", "(You think of the levies and corvée outside, and find you cannot begin to explain.)"]
    ],
    end:true
  },
  farmer_fish: {
    s:"耕者", lines:[
      ["有的，肥得很。只是我等不善捕，多半養著看。", "Plenty, and fat ones. We're poor at catching them, so mostly we just let them be."],
      ["你既是漁人，改日教教孩子們罷。", "Since you're a fisherman, teach the children one day, won't you."]
    ],
    end:true
  },

  /* A child — wonder, innocence. */
  child_1: {
    s:"垂髫小兒", lines:[
      ["外面的人，外面也有桃花嗎？也有天嗎？", "Person from outside — are there peach trees outside too? Is there sky?"]
    ],
    choices:[
      {t:"有天，也有桃花。只是外頭，沒有這般安寧。", en:"There is sky, and peach trees too. Only outside, there isn't this peace.", go:"child_end"},
      {t:"外面很大很大，大得會叫人害怕。", en:"Outside is very, very big — big enough to frighten you.", go:"child_end"}
    ]
  },
  child_end: {
    s:"垂髫小兒", lines:[
      ["（小兒眨眨眼，似懂非懂，又跑開去追雞了。）", "(The child blinks, half-understanding, then runs off chasing a chicken.)"]
    ],
    end:true
  },

  /* The weaver woman — hospitality, the warning seed. */
  weaver_1: {
    s:"織婦", lines:[
      ["客人來得巧，飯剛熟。坐下，莫客氣。", "You've come at a good moment, traveller — the rice is just done. Sit, don't stand on courtesy."],
      ["我織我的布，你說你的話，都好。", "I'll weave my cloth, you tell your tales — both are fine."]
    ],
    choices:[
      {t:"叨擾了。你們待客，竟這般厚。", en:"I'm imposing. Yet you treat a guest so generously.", go:"weaver_warm"},
      {t:"我若回去，與人說起此地⋯⋯", en:"If I go back and tell people of this place...", go:"weaver_warn"}
    ]
  },
  weaver_warm: {
    s:"織婦", lines:[
      ["厚什麼。難得有生人來，是喜事。", "Generous, nothing. It's rare a stranger comes — it's a glad thing."]
    ],
    end:true
  },
  weaver_warn: {
    s:"織婦", lines:[
      ["（她停了梭，神色一沉。）", "(She stops the shuttle; her face turns grave.)"],
      ["這話，村裡長者要與你說的。此中事，不足為外人道也。", "The elder will speak to you of that. What happens here — it is not worth telling to those outside."]
    ],
    end:true
  },

  /* On leaving — the parting warning, then the marking instruction. */
  farewell: {
    s:"此中人", lines:[
      ["送你到水邊。船還在那兒。", "We'll see you to the water. Your boat is still there."],
      ["記著一句話：不足為外人道也。", "Remember one thing: it is not worth speaking of to those outside."]
    ],
    choices:[
      {t:"我記下了。多謝款待。", en:"I'll remember. Thank you for your kindness.", go:"farewell_go"},
      {t:"（默然不答，心中卻已另有打算。）", en:"(You say nothing — but already, you mean to do otherwise.)", go:"farewell_go"}
    ]
  },
  farewell_go: {
    s:"此中人", lines:[
      ["（他們立在桃花下，目送你登舟。）", "(They stand beneath the blossoms, watching you board.)"]
    ],
    action:"begin_marking"
  },

  /* At the prefect's seat. */
  prefect: {
    s:"太守", lines:[
      ["你是說，山中有一村，避秦至今，不知漢晉？", "You say there is a village in the hills — fled since the Qin, ignorant of Han and Jin?"],
      ["此事奇甚。來人！隨這漁人前往，循其所誌。", "A most strange matter. Guards! Go back with this fisherman, and follow the marks he left."]
    ],
    action:"set_out_again"
  }
};
