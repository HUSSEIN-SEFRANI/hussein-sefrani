// لعبة الطبخ — تعليم: اتبع الوصفة خطوة خطوة، وحافظ على النظافة، وقدّم الطبق بطريقة مناسبة.
// بيتزا، وكيك، وأكلات سورية. لكل وصفة مستوى (1–3): وقت أقصر، وخيارات أكثر، وفرن أصعب، ومفاجآت نظافة.
// التحكم: الأسهم · Enter/✕ للاختيار والضغط · Backspace/○ استراحة أو رجوع. ويعمل باللمس والفأرة.
(() => {
  "use strict";
  const GAME = "لعبة الطبخ";
  const save = K.store("cooking", { done: {} });
  const LITE = (() => {
    try { if (parent !== window && parent.document.documentElement.classList.contains("lite")) return true; } catch {}
    return (navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2;
  })();
  if (LITE) document.body.classList.add("lite");
  const $ = (s) => K.app.querySelector(s);
  const E = (e) => `<span class="emo">${e}</span>`;

  // ---------------------------------------------------------------- الأصوات (بلا ملفات)
  const S = {
    noise(d = 0.15, f = 1200, v = 0.12, when = 0, type = "bandpass") {
      const c = K.audioCtx(); if (!c) return;
      try {
        const n = (c.sampleRate * d) | 0, b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
        for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
        s.buffer = b; fl.type = type; fl.frequency.value = f; g.gain.value = v;
        s.connect(fl).connect(g).connect(c.destination); s.start(c.currentTime + when);
      } catch {}
    },
    chop() { S.noise(0.05, 2600, 0.3); K.tone(150, 0.05, "square", 0.04); },
    knead() { S.noise(0.14, 380, 0.3, 0, "lowpass"); },
    stir() { S.noise(0.2, 900, 0.14); },
    water() { for (let i = 0; i < 4; i++) S.noise(0.08, 2500 + Math.random() * 2500, 0.09, i * 0.07); },
    sizzle() { S.noise(0.6, 5000, 0.05, 0, "highpass"); },
    ding() { K.tone(1568, 0.6, "sine", 0.12); K.tone(2093, 0.9, "sine", 0.08, 0.08); },
    bubble() { for (let i = 0; i < 3; i++) K.tone(420 + Math.random() * 600, 0.07, "sine", 0.07, i * 0.06); },
    drop() { K.tone(520, 0.08, "triangle", 0.12); K.tone(320, 0.1, "triangle", 0.1, 0.07); },
  };

  // ---------------------------------------------------------------- المكوّنات
  // [رمز، اسم، عدد القطع على الطبق، لون طبقة]
  const ING = {
    flour: ["🌾", "الطحين", 0, "#f6efdc"], water: ["💧", "الماء", 0], yeast: ["🫧", "الخميرة", 0], salt: ["🧂", "الملح", 0],
    oil: ["🫗", "زيت الزيتون", 0], sauce: ["🍅", "صلصة البندورة", 0, "#d9412b"],
    cheese: ["🧀", "الجبنة", 0, "radial-gradient(circle at 30% 30%, #ffe27a 0 18%, transparent 19%) 0 0/22% 22%, #f9cf45"],
    basil: ["🌿", "الريحان", 5], pepper: ["🫑", "الفليفلة", 5], mushroom: ["🍄", "الفطر", 4], olive: ["🫒", "الزيتون", 6],
    chicken: ["🍗", "الدجاج", 4], corn: ["🌽", "الذرة", 5],
    egg: ["🥚", "البيض", 0, "#f8d77a"], sugar: ["🍬", "السكر", 0], milk: ["🥛", "الحليب", 0, "#f7ecd2"], butter: ["🧈", "الزبدة", 0, "#f8e3a0"],
    cocoa: ["🍫", "الكاكاو", 0, "#6b3b22"], vanilla: ["🌼", "الفانيلا", 0], cream: ["🍦", "الكريمة", 0, "#fffaf0"],
    strawberry: ["🍓", "الفراولة", 6], sprinkles: ["🍭", "الحبيبات الملونة", 0, "radial-gradient(circle, #f472b6 0 9%, transparent 10%) 0 0/16% 16%, radial-gradient(circle, #38bdf8 0 9%, transparent 10%) 8% 8%/16% 16%, #fde7f0"],
    candles: ["🕯️", "الشموع", 5], cherry: ["🍒", "الكرز", 5], choco: ["🍫", "صوص الشوكولاتة", 0, "#4a2512"],
    parsley: ["🌿", "البقدونس", 0, "#3f9d3a"], tomato: ["🍅", "البندورة", 5], bulgur: ["🌾", "البرغل", 0], lemon: ["🍋", "الليمون", 0],
    lettuce: ["🥬", "ورق الخس", 4], chick: ["🫘", "الحمص الحب", 7], tahini: ["🫙", "الطحينة", 0, "#e6cf9c"], garlic: ["🧄", "الثوم", 0],
    eggplant: ["🍆", "الباذنجان", 5], rice: ["🍚", "الرز", 0, "#fbf7ec"], nuts: ["🥜", "الصنوبر واللوز", 7],
    onion: ["🧅", "البصل", 0], carrot: ["🥕", "الجزر", 0], potato: ["🥔", "البطاطا", 0], fish: ["🐟", "السمك", 0], honey: ["🍯", "العسل", 0],
    banana: ["🍌", "الموز", 0], apple: ["🍎", "التفاح", 0], cucumber: ["🥒", "الخيار", 0], grapes: ["🍇", "العنب", 0],
  };
  const ing = (id) => ({ id, emo: ING[id][0], name: ING[id][1], n: ING[id][2], fill: ING[id][3] });

  // ضغطات متكررة (اعجن، قطّع، اخلط…)
  const TAP = {
    knead: { say: "اعجن العجينة جيداً", emo: "👐", n: 6, snd: "knead", fill: "#f1d9a8", clear: true },
    roll: { say: "افرد العجينة بالشوبك", emo: "🫓", n: 4, snd: "knead", base: "pizza", fills: ["#f1d9a8"] },
    cutpizza: { say: "قطّع البيتزا إلى قطع", emo: "🔪", n: 4, snd: "chop", cut: true },
    whisk: { say: "اخفق الخليط حتى يصبح ناعماً", emo: "🥄", n: 7, snd: "stir", fill: "#f5e2b8", clear: true },
    pour: { say: "صبّ الخليط في القوالب", emo: "🫗", n: 3, snd: "drop", base: "cups" },
    pourpan: { say: "صبّ الخليط في قالب الكيك", emo: "🫗", n: 3, snd: "drop", base: "cake" },
    cool: { say: "اترك الكيك حتى يبرد قبل التزيين", emo: "🌬️", n: 3, snd: "stir" },
    mix: { say: "اخلط المكونات جيداً", emo: "🥄", n: 5, snd: "stir" },
    mash: { say: "اهرس الحمص حتى يصبح ناعماً", emo: "🥄", n: 7, snd: "knead", base: "bowl", fills: ["#e8d3a3"], clear: true },
    flip: { say: "اقلب القدر في صحن التقديم", emo: "🔄", n: 3, snd: "drop", base: "dome" },
    rub: { say: "افرك الخضار تحت الماء", emo: "🚰", n: 4, snd: "water" },
    scrub: { say: "افرك يديك بالماء والصابون جيداً", emo: "🧼", n: 5, snd: "bubble" },
    wipe: { say: "امسح الطاولة حتى تنظف", emo: "🧽", n: 3, snd: "water" },
    rinse: { say: "اغسل الملعقة بالماء والصابون", emo: "🧽", n: 3, snd: "water" },
  };
  const chop = (name) => ({ say: `قطّع ${name}`, emo: "🔪", n: 4, snd: "chop" });

  // أسئلة النظافة: الأولى صحيحة دائماً، ثم ضغطات بعدها (then)
  const BAD_HANDS = [["👕", "أمسحهما بملابسي"], ["➡️", "أكمل الطبخ فوراً"], ["👅", "ألعق أصابعي"]];
  const WASH = {
    egg: { q: "كسرتَ البيض النيء 🥚 ماذا تفعل بيديك الآن؟", opts: [["🧼", "أغسل يدي بالماء والصابون"], ...BAD_HANDS], then: "scrub", why: "البيض النيء قد يحمل جراثيم" },
    chicken: { q: "لمستَ الدجاج النيء 🍗 ماذا تفعل الآن؟", opts: [["🧼", "أغسل يدي بالماء والصابون"], ...BAD_HANDS], then: "scrub", why: "الدجاج النيء فيه جراثيم تمرض البطن" },
    veg: { q: "قبل أن نستعمل الخضار، ماذا نفعل؟", opts: [["🚰", "أغسلها بالماء"], ["🔪", "أقطّعها مباشرة"], ["🗑️", "أرميها"]], then: "rub", why: "على الخضار تراب وجراثيم" },
  };
  const EVENTS = [
    { q: "ذبابة تقترب من الطعام! 🪰", opts: [["🫙", "أغطّي الطعام"], ["🙈", "لا أفعل شيئاً"], ["🖐️", "أضربها فوق الطعام"]] },
    { q: "سقطت الملعقة على الأرض! 🥄", opts: [["🧽", "أغسلها قبل استعمالها"], ["🥄", "أستعملها كما هي"], ["👖", "أمسحها بملابسي"]], then: "rinse" },
    { q: "تريد أن تعطس! 🤧", opts: [["💪", "أعطس في كوعي بعيداً عن الطعام"], ["🍲", "أعطس فوق الطعام"], ["✋", "أعطس في يدي وأكمل"]] },
    { q: "انسكب الماء على الطاولة! 💦", opts: [["🧽", "أمسحه فوراً"], ["🙈", "أتركه"], ["👣", "أمشي فوقه"]], then: "wipe" },
    { q: "تريد أن تتذوّق الطعام 😋", opts: [["🥄", "بملعقة نظيفة"], ["☝️", "بإصبعي"], ["🔁", "بالملعقة نفسها كل مرة"]] },
    { q: "القطة قفزت إلى طاولة المطبخ! 🐈", opts: [["🏠", "أُنزلها وأنظّف الطاولة"], ["🍗", "أطعمها من الطبخة"], ["🤗", "أتركها تلعب"]], then: "wipe" },
  ];
  const PREP_GOOD = [["🧼", "اغسل يديك بالماء والصابون"], ["🥼", "البس المريلة"], ["🧑‍🍳", "غطِّ شعرك بقبعة الطبخ"], ["🧽", "نظّف طاولة المطبخ"]];
  const PREP_BAD = [["📱", "العب بالهاتف"], ["🐈", "احمل القطة"], ["🍭", "كُل الحلوى"], ["⚽", "العب بالكرة"]];

  // أدوات التقديم: الصحيح يأتي من الوصفة، والخطأ مضحك
  const PLATES = { board: ["🪵", "لوح التقديم الخشبي"], plate: ["🍽️", "صحن التقديم"], bowl: ["🥣", "صحن عميق"], stand: ["🎂", "صحن الكيك"] };
  const SILLY = [["🪣", "دلو"], ["👟", "حذاء"], ["🧺", "سلة الغسيل"], ["🧢", "قبعة"]];
  const SWEET_BAD = ["onion", "garlic", "fish", "pepper"], SALTY_BAD = ["sugar", "honey", "banana", "strawberry"];

  // ---------------------------------------------------------------- الوصفات
  const CATS = [
    { id: "pizza", name: "البيتزا", emo: "🍕", color: "#f97316" },
    { id: "cake", name: "الكيك", emo: "🎂", color: "#ec4899" },
    { id: "sham", name: "أكلات سورية", emo: "🥙", color: "#16a34a" },
  ];
  const RECIPES = [
    { id: "margherita", cat: "pizza", lv: 1, name: "بيتزا مارغريتا", emo: "🍕", base: "bowl", serve: ["board", "basil"],
      steps: [["get", "flour"], ["get", "water"], ["get", "yeast"], ["tap", "knead"], ["tap", "roll"], ["get", "sauce"], ["get", "cheese"],
        ["heat", "oven", "اخبز البيتزا في الفرن"], ["tap", "cutpizza"]] },
    { id: "vegpizza", cat: "pizza", lv: 2, name: "بيتزا الخضار", emo: "🍕", base: "bowl", serve: ["board", "basil"],
      steps: [["get", "flour"], ["get", "water"], ["get", "yeast"], ["get", "oil"], ["tap", "knead"], ["tap", "roll"], ["get", "sauce"], ["get", "cheese"],
        ["wash", "veg"], ["tap", chop("الفليفلة")], ["get", "pepper"], ["get", "mushroom"], ["get", "olive"], ["heat", "oven", "اخبز البيتزا في الفرن"], ["tap", "cutpizza"]] },
    { id: "chickpizza", cat: "pizza", lv: 3, name: "بيتزا الدجاج", emo: "🍕", base: "pan", serve: ["board", "olive"],
      steps: [["get", "chicken", "ضع الدجاج في المقلاة"], ["wash", "chicken"], ["heat", "stove", "اطبخ الدجاج جيداً حتى ينضج"], ["new", "bowl"],
        ["get", "flour"], ["get", "water"], ["get", "yeast"], ["get", "salt"], ["tap", "knead"], ["tap", "roll"], ["get", "sauce"], ["get", "cheese"],
        ["get", "chicken", "ضع الدجاج المطبوخ على البيتزا"], ["get", "corn"], ["heat", "oven", "اخبز البيتزا في الفرن"], ["tap", "cutpizza"]] },

    { id: "cupcake", cat: "cake", lv: 1, name: "كب كيك", emo: "🧁", base: "bowl", sweet: true, serve: ["plate", "strawberry"],
      steps: [["get", "egg"], ["wash", "egg"], ["get", "sugar"], ["get", "flour"], ["get", "milk"], ["tap", "whisk"], ["tap", "pour"],
        ["heat", "oven", "اخبز الكب كيك في الفرن"], ["get", "sprinkles", "زيّن بالحبيبات الملونة"]] },
    { id: "choccake", cat: "cake", lv: 2, name: "كيكة الشوكولاتة", emo: "🍰", base: "bowl", sweet: true, serve: ["stand", "cherry"],
      steps: [["get", "butter"], ["get", "sugar"], ["get", "egg"], ["wash", "egg"], ["get", "flour"], ["get", "cocoa"], ["get", "milk"], ["tap", "whisk"],
        ["tap", "pourpan"], ["heat", "oven", "اخبز الكيك في الفرن"], ["tap", "cool"], ["get", "choco", "اسكب صوص الشوكولاتة فوق الكيك"]] },
    { id: "birthday", cat: "cake", lv: 3, name: "كيكة عيد الميلاد", emo: "🎂", base: "bowl", sweet: true, serve: ["stand", "sprinkles"],
      steps: [["get", "butter"], ["get", "sugar"], ["get", "egg"], ["wash", "egg"], ["get", "vanilla"], ["get", "flour"], ["get", "milk"], ["tap", "whisk"],
        ["tap", "pourpan"], ["heat", "oven", "اخبز الكيك في الفرن"], ["tap", "cool"], ["get", "cream", "غطِّ الكيك بالكريمة"], ["get", "strawberry"], ["get", "candles"]] },

    { id: "tabbouleh", cat: "sham", lv: 1, name: "تبّولة", emo: "🥗", base: "bowl", serve: ["bowl", "lettuce"],
      steps: [["wash", "veg"], ["get", "parsley"], ["tap", chop("البقدونس ناعماً")], ["get", "tomato"], ["tap", chop("البندورة")],
        ["get", "bulgur"], ["get", "lemon"], ["get", "oil"], ["tap", "mix"]] },
    { id: "hummus", cat: "sham", lv: 2, name: "حمّص بطحينة", emo: "🫘", base: "pot", serve: ["plate", "oil"],
      steps: [["get", "chick"], ["get", "water"], ["heat", "stove", "اسلق الحمص حتى يطرى"], ["tap", "mash"], ["get", "tahini"], ["get", "lemon"],
        ["get", "garlic"], ["get", "salt"], ["tap", "mix"]] },
    { id: "maqluba", cat: "sham", lv: 3, name: "مقلوبة", emo: "🍆", base: "pan", serve: ["plate", "nuts"],
      steps: [["wash", "veg"], ["get", "eggplant"], ["tap", chop("الباذنجان")], ["heat", "stove", "اقلِ الباذنجان بالزيت"], ["get", "chicken"], ["wash", "chicken"],
        ["heat", "stove", "اطبخ الدجاج جيداً حتى ينضج"], ["new", "pot", true], ["get", "rice"], ["get", "water"], ["get", "salt"],
        ["heat", "stove", "اطبخ المقلوبة على نار هادئة"], ["tap", "flip"]] },
  ];
  // المستوى: ثوانٍ لكل خطوة، وعدد الخيارات، وعرض المنطقة الخضراء في الفرن، وسرعة المؤشر، ومفاجآت النظافة
  const LV = {
    1: { per: 18, opts: 3, zone: 0.3, speed: 0.4, ev: 0, prep: 2, tap: 0, showEmo: true },
    2: { per: 14, opts: 4, zone: 0.2, speed: 0.6, ev: 1, prep: 3, tap: 2, showEmo: false },
    3: { per: 11, opts: 5, zone: 0.14, speed: 0.8, ev: 2, prep: 4, tap: 3, showEmo: false },
  };
  const LVNAME = { 1: "سهل", 2: "متوسط", 3: "صعب" };
  const catRecipes = (c) => RECIPES.filter((r) => r.cat === c);
  const unlocked = (r) => { const l = catRecipes(r.cat), i = l.indexOf(r); return i === 0 || !!save.done[l[i - 1].id]; };
  const best = (r) => save.done[r.id] || 0;
  const say = (t) => K.tts(String(t).replace(/[^؀-ۿ\s0-9،.!؟]/g, " "));

  // ---------------------------------------------------------------- رسم الطبق (من الأعلى)
  const SPOTS = K.range(0, 24).map((k) => { const a = k * 2.399, r = 0.15 + 0.62 * Math.sqrt((k + 0.5) / 24); return [50 + Math.cos(a) * r * 50, 50 + Math.sin(a) * r * 50]; });
  function foodHTML(st, k0 = 0, step = 1) {
    const layers = st.fills.map((f, i) => `<b style="inset:${Math.min(i * 5, 15)}%;background:${f}"></b>`).join("");
    const items = st.items.filter((_, k) => k % step === k0).slice(0, 24)
      .map((e, k) => `<i style="left:${SPOTS[k][0]}%;top:${SPOTS[k][1]}%">${e}</i>`).join("");
    return `<div class="food${st.baked ? " baked" : ""}${st.cut ? " cut" : ""}">${layers}${items}</div>`;
  }
  function dishHTML(st) {
    if (st.base === "cups") return `<div class="vessel cups">${[0, 1, 2].map((k) => `<div class="cup">${foodHTML(st, k, 3)}</div>`).join("")}</div>`;
    return `<div class="vessel ${st.base}">${foodHTML(st)}</div>`;
  }

  // ---------------------------------------------------------------- الشاشات
  function homeScreen() {
    K.begin();
    K.paint(`
      <div class="title"><span class="mascot emo">🧑‍🍳</span><div><h1>${GAME}</h1><div class="sub">اطبخ خطوة خطوة، وحافظ على النظافة، وقدّم طبقك 🍽️</div></div></div>
      <div class="modes">
        ${CATS.map((c) => {
          const l = catRecipes(c.id), n = l.filter((r) => save.done[r.id]).length;
          return `<button class="mode f" style="background:${c.color}" ${K.act("c" + c.id, () => K.show(catScreen, c))}>
            <span class="big emo">${c.emo}</span><b>${c.name}</b><small>${n} / ${l.length} وصفات</small></button>`;
        }).join("")}
      </div>
      <div class="mini"><button class="btn f" ${K.act("rules", () => K.show(rulesScreen))}>${E("🧼")} قواعد النظافة في المطبخ</button></div>
      ${K.HELP}
      <div class="credit">تم إعداده بواسطة ( حسين سفراني )</div>`);
  }

  function catScreen(c) {
    K.begin();
    const l = catRecipes(c.id);
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${E(c.emo)} ${c.name}</h2><span></span></div>
      <div class="modes">
        ${l.map((r) => {
          const open = unlocked(r), b = best(r);
          return `<button class="mode f${open ? "" : " locked"}" style="background:${c.color}" ${K.act(r.id, () => {
            if (open) K.show(introScreen, r); else { K.sfx.bad(); say("أكمل الوصفة التي قبلها أولاً"); toast("🔒 أكمل الوصفة التي قبلها أولاً"); }
          })}>
            <span class="big emo">${open ? r.emo : "🔒"}</span><b>${r.name}</b>
            <small>مستوى ${r.lv} · ${LVNAME[r.lv]}</small><span class="st">${b ? K.starsHtml(b) : open ? "جديدة ✨" : ""}</span></button>`;
        }).join("")}
      </div>
      ${K.HELP}`);
  }

  function rulesScreen() {
    K.begin();
    const R = [["🧼", "اغسل يديك قبل الطبخ، وبعد لمس البيض أو الدجاج النيء"], ["🥼", "البس المريلة وغطِّ شعرك"], ["🚰", "اغسل الخضار بالماء قبل تقطيعها"],
      ["🧽", "نظّف الطاولة وامسح ما ينسكب فوراً"], ["🫙", "غطِّ الطعام حتى لا يقف عليه الذباب"], ["🍗", "اطبخ الدجاج جيداً حتى ينضج"],
      ["💪", "اعطس في كوعك بعيداً عن الطعام"], ["🥄", "تذوّق بملعقة نظيفة"]];
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${E("🧼")} قواعد النظافة</h2><span></span></div>
      <div class="rules">${R.map(([e, t], i) => `<button class="rule f" ${K.act("r" + i, () => say(t))}>${E(e)}<span>${t}</span></button>`).join("")}</div>
      ${K.HELP}`);
  }

  function introScreen(r) {
    K.begin();
    const L = LV[r.lv];
    const ids = [...new Set(r.steps.filter((s) => s[0] === "get").map((s) => s[1]).concat(r.serve[1]))];
    const secs = plan(r).filter((s) => s.t !== "show").length * L.per;
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${E(r.emo)} ${r.name}</h2><span class="pill">مستوى ${r.lv} · ${LVNAME[r.lv]}</span></div>
      <div class="sub">المكونات</div>
      <div class="chips">${ids.map((id) => `<span class="chip">${E(ING[id][0])}<small>${ING[id][1]}</small></span>`).join("")}</div>
      <div class="sub">⏱ الوقت: ${clock(secs)} · ${E("🧼")} انتبه للنظافة!</div>
      <div class="nav"><button class="btn f go" ${K.act("go", () => K.show(cookScreen, r))}>${E("🧑‍🍳")} ابدأ الطبخ</button></div>
      ${K.HELP}`, "go");
    say(`${r.name}. هيا نطبخ`);
  }

  const clock = (s) => { s = Math.max(0, Math.ceil(s)); return `${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`; };
  function toast(t) {
    const fx = document.getElementById("fx");
    const e = document.createElement("div"); e.className = "toast"; e.textContent = t; fx.appendChild(e);
    setTimeout(() => e.remove(), 2600);
  }

  // خطة الطبخ: الاستعداد، ثم خطوات الوصفة (مع مفاجآت النظافة)، ثم التقديم
  function plan(r) {
    const L = LV[r.lv], out = [{ t: "prep" }];
    for (const s of r.steps) {
      if (s[0] === "new") out.push({ t: "new", base: s[1], keep: s[2] });
      else if (s[0] === "get") out.push({ t: "get", ing: ing(s[1]), say: s[2] });
      else if (s[0] === "tap") out.push({ t: "tap", ...(typeof s[1] === "string" ? TAP[s[1]] : s[1]) });
      else if (s[0] === "heat") out.push({ t: "heat", tool: s[1], say: s[2] });
      else if (s[0] === "wash") out.push({ t: "ask", hyg: true, ...WASH[s[1]] });
    }
    const evs = K.shuffle(EVENTS).slice(0, L.ev);
    for (const ev of evs) {
      const i = 3 + ((Math.random() * (out.length - 4)) | 0);
      out.splice(i, 0, { t: "ask", hyg: true, event: true, ...ev });
    }
    out.push({ t: "serve" }, { t: "show" });
    return out;
  }

  // ---------------------------------------------------------------- الطبخ
  function cookScreen(r) {
    const L = LV[r.lv], steps = plan(r);
    const total = steps.filter((s) => s.t !== "new" && s.t !== "show").length;
    const st = { base: r.base, fills: [], items: [], baked: false, cut: false };
    let i = -1, done = 0, left = total * L.per, late = false, paused = false, clean = 100, mistakes = 0, plate = null;
    let draw = () => {}, gauge = null;

    K.mode = { key: (e) => { if (e.key !== "Backspace") return false; paused ? resume() : pause(); return true; } };
    K.every(() => {
      if (paused || i >= steps.length - 1) return;
      left -= 1;
      const c = $(".clock");
      if (c) { c.textContent = "⏱ " + clock(left); c.classList.toggle("hot", left <= 15); }
      if (left <= 0 && !late) { late = true; K.sfx.bad(); toast("⏰ انتهى الوقت! أكمل طبختك"); }
    }, 1000);

    function pause() {
      paused = true; stopGauge(); K.stopSound();
      K.begin();
      K.paint(`
        <h1>${E("⏸")} استراحة</h1><div class="sub">${r.name}</div>
        <div class="nav">
          <button class="btn f go" ${K.act("resume", resume)}>${E("▶️")} أكمل الطبخ</button>
          <button class="btn f" ${K.act("quit", () => K.back())}>${E("🚪")} اخرج من الوصفة</button>
        </div>${K.HELP}`, "resume");
    }
    function resume() { paused = false; draw(); }
    function stopGauge() { if (gauge) { clearInterval(gauge); gauge = null; } }

    // الأزرار تُبنى قبل frame، فـ K.begin() يكون في setDraw
    const setDraw = (fn) => { draw = () => { K.begin(); fn(); }; };
    function frame(task, acts, def) {
      const meter = `<span class="pill meter" title="النظافة">${E("🧼")}<i><b style="width:${clean}%;background:${clean >= 70 ? "#22c55e" : clean >= 40 ? "#f59e0b" : "#ef4444"}"></b></i></span>`;
      const dots = K.range(0, total).map((k) => `<i class="${k < done ? "ok" : k === done ? "now" : ""}"></i>`).join("");
      K.paint(`
        <div class="top"><button class="btn f" ${K.act("pause", pause)}>${E("⏸")}</button><div class="dots">${dots}</div>${meter}
          <span class="pill clock${left <= 15 ? " hot" : ""}">⏱ ${clock(left)}</span><span class="pill">${r.name}</span></div>
        <div class="kitchen"><div class="task">${task}</div><div class="counter">${dishHTML(st)}</div></div>
        <div class="acts">${acts}</div>
        <div class="cheer"></div>`, def);
    }
    const cheer = (t) => { const c = $(".cheer"); if (c) c.textContent = t; };
    const redish = (drop) => {
      const c = $(".counter"); if (!c) return;
      c.innerHTML = dishHTML(st) + (drop ? `<i class="drop emo">${drop}</i>` : "");
    };
    const wobble = () => { const v = $(".vessel"); if (v) { v.classList.remove("wob"); void v.offsetWidth; v.classList.add("wob"); } };
    const taskHTML = (emo, text) => `<div class="temo emo">${emo}</div><div class="ttext">${text}</div>
      <button class="btn f say" ${K.act("say", () => say(text))}>${E("🔊")}</button>`;
    const oops = (el, hyg) => {
      el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad(); mistakes++;
      if (hyg) { clean = Math.max(0, clean - 20); const b = $(".meter b"); if (b) { b.style.width = clean + "%"; b.style.background = clean >= 70 ? "#22c55e" : clean >= 40 ? "#f59e0b" : "#ef4444"; } }
    };
    const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "شاطر! 💪", "طاهٍ ماهر! 🧑‍🍳"];

    function next() {
      stopGauge();
      i++;
      const s = steps[i];
      if (s.t === "new") { if (!s.keep) st.items = []; st.base = s.base; st.fills = []; st.baked = false; return next(); }
      K.top().focus = null;
      ({ prep, get, tap, heat, ask, serve, show })[s.t](s);
    }
    const stepDone = (msg, after = 1000) => { done++; cheer(msg || K.pick(GOOD)); K.later(next, after); };

    // الاستعداد: اختر كل ما يفعله الطاهي النظيف
    function prep() {
      const opts = K.shuffle([...PREP_GOOD.slice(0, L.prep).map((o) => [...o, 1]), ...K.shuffle(PREP_BAD).slice(0, L.prep).map((o) => [...o, 0])]);
      const got = new Set();
      const text = "قبل الطبخ: اختر كل ما يفعله الطاهي النظيف";
      setDraw(() => frame(taskHTML("🧑‍🍳", text), `<div class="cards">${opts.map((o, k) => `<button class="card f${got.has(k) ? " ok" : ""}" ${K.act("p" + k, (el) => {
        if (got.has(k) || el.dataset.dead) return;
        if (o[2]) {
          got.add(k); el.classList.add("ok"); K.sfx.pop(); say(o[1]);
          if (got.size === L.prep) { K.sfx.ok(); stepDone("جاهز للطبخ! 🧑‍🍳"); }
        } else { oops(el, true); cheer("لا! هذا ليس من النظافة 🙅"); }
      })}>${E(o[0])}<small>${o[1]}</small></button>`).join("")}</div>`, "p0"));
      draw(); say(text);
    }

    // أحضر المكوّن الصحيح من الرف
    function get(s) {
      const g = s.ing, text = s.say || `أحضر ${g.name}`;
      const used = new Set(RECIPES.find((x) => x.id === r.id).steps.filter((x) => x[0] === "get").map((x) => ING[x[1]][0]));
      const pool = Object.keys(ING).filter((id) => !used.has(ING[id][0]) && id !== r.serve[1]);
      const opts = K.shuffle([g.id, ...K.shuffle(pool).slice(0, L.opts - 1)]);
      let lock = false;
      setDraw(() => frame(taskHTML(L.showEmo || s.say ? g.emo : "🧺", text),
        `<div class="cards">${opts.map((id, k) => `<button class="card f" ${K.act("g" + k, (el) => {
          if (lock || el.dataset.dead) return;
          if (id === g.id) {
            lock = true; el.classList.add("ok"); K.sfx.ok(); S.drop();
            if (g.fill) st.fills.push(g.fill);
            for (let q = 0; q < g.n; q++) st.items.push(g.emo);
            redish(g.emo); stepDone();
          } else { oops(el); cheer(`ليس هذا! ابحث عن ${g.name}`); }
        })}>${E(ING[id][0])}<small>${ING[id][1]}</small></button>`).join("")}</div>`, "g0"));
      draw(); say(text);
    }

    // اضغط عدة مرات (اعجن، قطّع، اخلط، افرك…)
    function tap(s) {
      const n = s.n + L.tap;
      let c = 0;
      const snd = () => (S[s.snd] || K.sfx.pop)();
      setDraw(() => frame(taskHTML(s.emo, s.say), `
        <button class="tapbtn f" ${K.act("tap", () => {
          if (c >= n) return;
          c++; snd(); wobble();
          const b = $(".bar b"); if (b) b.style.width = (c / n) * 100 + "%";
          const k = $(".tapbtn small"); if (k) k.textContent = c >= n ? "تم ✓" : `باقي ${n - c}`;
          if (c >= n) {
            if (s.clear) st.items = [];
            if (s.base) st.base = s.base;
            if (s.fills) st.fills = s.fills.slice();
            if (s.fill) st.fills = [s.fill];
            if (s.cut) st.cut = true;
            redish(); K.sfx.ok(); stepDone();
          }
        })}>${E(s.emo)}<b>اضغط!</b><small>${c >= n ? "تم ✓" : `باقي ${n - c}`}</small></button>
        <div class="bar"><b style="width:${(c / n) * 100}%"></b></div>`, "tap"));
      draw(); say(s.say);
    }

    // الفرن أو النار: أوقف المؤشر في المنطقة الخضراء
    function heat(s) {
      const oven = s.tool === "oven";
      const z0 = 0.4 + Math.random() * (0.5 - L.zone), z1 = z0 + L.zone;
      let p = 0, dir = 1, lock = false, last = performance.now();
      setDraw(() => {
        stopGauge();
        frame(taskHTML(oven ? "🔥" : "🍳", s.say), `
          <div class="gauge"><span class="lbl">نيء</span><div class="track"><b class="zone" style="right:${z0 * 100}%;width:${L.zone * 100}%"></b><i class="needle" style="right:${p * 100}%"></i></div><span class="lbl">محروق</span></div>
          <button class="btn f go stopbtn" ${K.act("stop", stop)}>${E(oven ? "🧤" : "🔥")} ${oven ? "أخرجه من الفرن الآن!" : "أطفئ النار الآن!"}</button>
          <div class="hint">اضغط عندما يصل المؤشر إلى الأخضر</div>`, "stop");
        const v = $(".vessel"); if (v) v.classList.add(oven ? "inoven" : "onfire");
        last = performance.now();
        gauge = K.every(() => {
          if (lock) return;
          const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
          p += dir * L.speed * dt;
          if (p >= 1) { p = 1; dir = -1; } else if (p <= 0) { p = 0; dir = 1; }
          const nd = $(".needle"); if (nd) nd.style.right = p * 100 + "%";
        }, LITE ? 60 : 33);
      });
      function stop() {
        if (lock) return;
        if (p >= z0 && p <= z1) {
          lock = true; stopGauge(); st.baked = true; S.ding(); K.sfx.ok();
          const v = $(".vessel"); if (v) v.classList.remove("inoven", "onfire");
          redish(); stepDone(oven ? "نضج تماماً! 😋" : "طُبخ جيداً! 😋");
        } else {
          mistakes++; K.sfx.bad(); if (!oven) S.sizzle();
          cheer(p < z0 ? "ما زال نيئاً! انتظر قليلاً ⏳" : "كاد يحترق! انتبه 🔥");
        }
      }
      draw(); say(s.say); if (!oven) S.sizzle();
    }

    // سؤال نظافة (وبعده ضغطات إن لزم)
    function ask(s) {
      const opts = K.shuffle(s.opts.slice(0, Math.min(s.opts.length, L.opts)).map((o, k) => [...o, k === 0]));
      let lock = false;
      setDraw(() => frame(taskHTML(s.event ? "⚠️" : "🧼", s.q), `<div class="cards wide">${opts.map((o, k) => `<button class="card f" ${K.act("a" + k, (el) => {
        if (lock || el.dataset.dead) return;
        if (o[2]) {
          lock = true; el.classList.add("ok"); K.sfx.ok(); say(o[1]);
          if (s.then) {
            // الضغطات بعدها جزء من الخطوة نفسها (تُحسب نقطة واحدة عند انتهائها)
            steps.splice(i + 1, 0, { t: "tap", ...TAP[s.then] });
            cheer("صحيح! 🧼"); K.later(next, 1100);
          } else stepDone("صحيح! نظافة ممتازة 🧼", 1300);
        } else { oops(el, true); cheer(s.why ? `لا! ${s.why}` : "لا! فكّر بالنظافة 🙅"); }
      })}>${E(o[0])}<small>${o[1]}</small></button>`).join("")}</div>`, "a0"));
      draw(); say(s.q);
    }

    // التقديم: اختر الصحن المناسب ثم الزينة
    function serve() {
      const [pid, gid] = r.serve;
      let phase = 0;
      const plates = K.shuffle([pid, ...K.shuffle(SILLY.map((_, k) => "s" + k)).slice(0, L.opts - 1)]);
      const pl = (id) => (PLATES[id] || SILLY[+id.slice(1)]);
      const gar = K.shuffle([gid, ...K.shuffle(r.sweet ? SWEET_BAD : SALTY_BAD).slice(0, L.opts - 1)]);
      setDraw(() => {
        if (phase === 0) {
          frame(taskHTML("🍽️", "قدّم الطبق: في أي شيء نضعه؟"), `<div class="cards">${plates.map((id, k) => `<button class="card f" ${K.act("s" + k, (el) => {
            if (phase || el.dataset.dead) return;
            if (id === pid) { phase = 1; plate = pid; el.classList.add("ok"); K.sfx.ok(); cheer("صحن مناسب! 🍽️"); K.later(() => { K.top().focus = null; draw(); say("زيّن الطبق"); }, 900); }
            else { oops(el); cheer("لا! هذا لا يناسب الطعام 😄"); }
          })}>${E(pl(id)[0])}<small>${pl(id)[1]}</small></button>`).join("")}</div>`, "s0");
        } else {
          frame(taskHTML("✨", "زيّن الطبق بما يناسبه"), `<div class="cards">${gar.map((id, k) => `<button class="card f" ${K.act("z" + k, (el) => {
            if (phase > 1 || el.dataset.dead) return;
            if (id === gid) {
              phase = 2; el.classList.add("ok"); K.sfx.ok(); S.drop();
              const g = ing(gid);
              if (g.fill && !g.n) st.fills.push(g.fill);
              for (let q = 0; q < Math.max(g.n, g.fill ? 0 : 5); q++) st.items.push(g.emo);
              redish(g.emo); stepDone("طبق جميل! ✨", 1100);
            } else { oops(el); cheer(r.sweet ? "لا نضع هذا على الحلوى 😄" : "لا يناسب هذا الطبق 😄"); }
          })}>${E(ING[id][0])}<small>${ING[id][1]}</small></button>`).join("")}</div>`, "z0");
        }
      });
      draw(); say("قدّم الطبق: في أي شيء نضعه؟");
    }

    // الطبق جاهز
    function show() {
      let s = 3;
      if (late) s--;
      if (clean < 70) s--;
      if (mistakes >= 5) s--;
      s = Math.max(1, s);
      save.done[r.id] = Math.max(best(r), s); save.save();
      const l = catRecipes(r.cat), nx = l[l.indexOf(r) + 1];
      const result = () => K.replace(K.resultScreen, {
        s, title: r.name,
        msg: s === 3 ? "طاهٍ محترف! 🧑‍🍳" : s === 2 ? "طبخة لذيذة! 👏" : "أحسنت! لنطبخها أفضل 💪",
        extra: `<div class="won">${E("🧼")} النظافة ${clean}% · ${E("⏱")} ${late ? "تأخرتَ قليلاً" : "في الوقت"} · ${E("❌")} أخطاء ${mistakes}</div>`,
        again: () => K.replace(cookScreen, r),
        next: nx ? { label: `${nx.emo} ${nx.name}`, fn: () => K.replace(introScreen, nx) } : null,
      });
      setDraw(() => {
        K.begin();
        K.paint(`
          <h1>بالهناء والشفاء! 😋</h1>
          <div class="served serve-${plate}">${dishHTML(st)}</div>
          <div class="sub">${r.emo} ${r.name} جاهزة</div>
          <div class="nav"><button class="btn f go" ${K.act("res", result)}>${E("⭐")} النتيجة</button></div>`, "res");
      });
      draw(); K.sfx.win(); K.confetti(LITE ? 10 : 28, "🍽️✨⭐" + r.emo);
      say("بالهناء والشفاء");
    }

    next();
  }

  K.start(homeScreen);
})();
