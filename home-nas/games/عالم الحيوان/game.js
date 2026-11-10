// عالم الحيوان — موسوعة صغيرة وأسئلة: أين يعيش؟ ماذا يأكل؟ صغار الحيوانات، أصوات الحيوانات
// أصوات (اختياري): ملف mp3 لكل حيوان داخل مجلد sounds باسم الحيوان بالعربي، مثل: sounds/أسد.mp3
(() => {
  "use strict";
  const save = K.store("animals", { stars: {}, seen: {} });
  const HOMES = { farm: ["المزرعة", "🏡"], forest: ["الغابة", "🌳"], sea: ["البحر", "🌊"], desert: ["الصحراء", "🏜️"], ice: ["الجليد", "❄️"] };
  const FOODS = { meat: ["اللحم", "🍖"], plants: ["النبات", "🌿"], both: ["اللحم والنبات", "🍽️"] };
  const def = (n) => n.split(" ").map((w) => "ال" + w).join(" ");
  // e: الرسم، n: الاسم، fr: بالفرنسية، h: أين يعيش، f: ماذا يأكل، b: اسم صغيره، v: صوته، x: معلومة
  const A = [
    { e: "🦁", n: "أسد", fr: "le lion", h: "forest", f: "meat", b: "شبل", v: "يزأر", x: "يُلقَّب بملك الغابة، ويُسمَع زئيره من مسافة بعيدة." },
    { e: "🐘", n: "فيل", fr: "l'éléphant", h: "forest", f: "plants", x: "أكبر حيوان يعيش على اليابسة، ويشرب الماء بخرطومه." },
    { e: "🦒", n: "زرافة", fr: "la girafe", h: "forest", f: "plants", x: "أطول حيوان في العالم، وتأكل أوراق الأشجار العالية." },
    { e: "🐒", n: "قرد", fr: "le singe", h: "forest", f: "both", x: "يتسلّق الأشجار بمهارة ويحب الفواكه." },
    { e: "🐅", n: "نمر", fr: "le tigre", h: "forest", f: "meat", x: "جسمه مخطّط بخطوط سوداء، ويحب السباحة." },
    { e: "🦓", n: "حمار وحشي", fr: "le zèbre", h: "forest", f: "plants", x: "لكل حمار وحشي خطوط تختلف عن غيره." },
    { e: "🐻", n: "دب", fr: "l'ours", h: "forest", f: "both", x: "يحب العسل، وينام طويلاً في الشتاء." },
    { e: "🦊", n: "ثعلب", fr: "le renard", h: "forest", f: "both", x: "ذيله كثيف وأذناه حادّتان، وهو ذكي جداً." },
    { e: "🐺", n: "ذئب", fr: "le loup", h: "forest", f: "meat", v: "يعوي", x: "يعيش ويصطاد مع جماعته." },
    { e: "🦉", n: "بومة", fr: "le hibou", h: "forest", f: "meat", x: "تستيقظ في الليل، وتستطيع أن تدير رأسها كثيراً." },
    { e: "🐄", n: "بقرة", fr: "la vache", h: "farm", f: "plants", b: "عجل", v: "تخور", x: "تعطينا الحليب الذي نصنع منه الجبن واللبن." },
    { e: "🐑", n: "خروف", fr: "le mouton", h: "farm", f: "plants", b: "حمل", v: "يثغو", x: "يعطينا الصوف لنصنع منه الملابس الدافئة." },
    { e: "🐐", n: "ماعز", fr: "la chèvre", h: "farm", f: "plants", b: "جدي", x: "تتسلّق الصخور بمهارة كبيرة." },
    { e: "🐎", n: "حصان", fr: "le cheval", h: "farm", f: "plants", b: "مهر", v: "يصهل", x: "يركض بسرعة، ويستطيع أن ينام وهو واقف." },
    { e: "🐔", n: "دجاجة", fr: "la poule", h: "farm", f: "both", b: "كتكوت", x: "تبيض لنا البيض." },
    { e: "🐓", n: "ديك", fr: "le coq", h: "farm", f: "both", v: "يصيح", x: "يصيح في الصباح الباكر." },
    { e: "🦆", n: "بطة", fr: "le canard", h: "farm", f: "both", x: "تسبح في الماء، وريشها لا يبتلّ بسهولة." },
    { e: "🐇", n: "أرنب", fr: "le lapin", h: "farm", f: "plants", b: "خرنق", x: "أذناه طويلتان، ويقفز بسرعة كبيرة." },
    { e: "🐈", n: "قطة", fr: "le chat", h: "farm", f: "meat", b: "هريرة", v: "تموء", x: "تحب النظافة وتنظّف نفسها بلسانها." },
    { e: "🐕", n: "كلب", fr: "le chien", h: "farm", f: "both", b: "جرو", v: "ينبح", x: "صديق وفيّ، وحاسّة الشمّ عنده قوية جداً." },
    { e: "🐋", n: "حوت", fr: "la baleine", h: "sea", f: "meat", x: "أكبر حيوان في العالم، ويصعد إلى السطح ليتنفّس الهواء." },
    { e: "🐬", n: "دلفين", fr: "le dauphin", h: "sea", f: "meat", x: "ذكي جداً ويحب اللعب والقفز فوق الماء." },
    { e: "🐙", n: "أخطبوط", fr: "la pieuvre", h: "sea", f: "meat", x: "له ثماني أذرع، ويستطيع تغيير لونه." },
    { e: "🦈", n: "قرش", fr: "le requin", h: "sea", f: "meat", x: "أسنانه كثيرة، وإذا سقط سنٌّ نبت مكانه سنٌّ جديد." },
    { e: "🐠", n: "سمكة", fr: "le poisson", h: "sea", f: "both", x: "تتنفّس تحت الماء بالخياشيم." },
    { e: "🦀", n: "سرطان", fr: "le crabe", h: "sea", f: "both", x: "يمشي على جانبه، وله كمّاشتان قويتان." },
    { e: "🐫", n: "جمل", fr: "le chameau", h: "desert", f: "plants", b: "حُوار", x: "يستطيع أن يعيش أياماً طويلة بلا ماء في الصحراء." },
    { e: "🦂", n: "عقرب", fr: "le scorpion", h: "desert", f: "meat", x: "يحمل إبرة في ذيله، فابتعد عنه!" },
    { e: "🐧", n: "بطريق", fr: "le manchot", h: "ice", f: "meat", x: "طائر لا يطير، لكنه سبّاح ماهر." },
    { e: "🐻‍❄️", n: "دب قطبي", fr: "l'ours polaire", h: "ice", f: "meat", x: "فروه الأبيض السميك يحميه من البرد الشديد." },
    { e: "🦭", n: "فقمة", fr: "le phoque", h: "ice", f: "meat", x: "تسبح بسرعة وتستريح على الجليد." },
    { e: "🐸", n: "ضفدع", fr: "la grenouille", f: "meat", b: "شرغوف", v: "ينقّ", x: "يبدأ حياته شرغوفاً صغيراً يسبح في الماء." },
    { e: "🐝", n: "نحلة", fr: "l'abeille", v: "تطنّ", x: "تصنع لنا العسل من رحيق الأزهار." },
    { e: "🦋", n: "فراشة", fr: "le papillon", x: "كانت يرقة صغيرة، ثم صارت فراشة ملوّنة." },
    { e: "🐢", n: "سلحفاة", fr: "la tortue", x: "تحمل بيتها على ظهرها، وتمشي ببطء." },
    { e: "🐊", n: "تمساح", fr: "le crocodile", f: "meat", x: "يعيش في الأنهار، وله أسنان كثيرة حادّة." },
    { e: "🕊️", n: "حمامة", fr: "la colombe", f: "plants", v: "تهدل", x: "تعرف طريق العودة إلى بيتها من مكان بعيد." },
    { e: "🐦", n: "عصفور", fr: "l'oiseau", v: "يزقزق", x: "يبني عشّه فوق الأشجار." },
    { e: "🐍", n: "أفعى", fr: "le serpent", f: "meat", v: "تفحّ", x: "ليس لها أرجل، وتزحف على بطنها." },
  ];
  const ani = (a, cls = "") => `<span class="emo ${cls}">${a.e}</span>`;
  const sound = (a) => K.play([`sounds/${encodeURIComponent(a.n)}.mp3`], a.n, "ar");

  const MODES = [
    { id: "book", title: "الموسوعة", icon: "📚", desc: "تعرّف على الحيوانات", bg: "linear-gradient(135deg,#f97316,#ef4444)" },
    { id: "home", title: "أين يعيش؟", icon: "🏡", desc: "مزرعة، غابة، بحر…", bg: "linear-gradient(135deg,#22c55e,#15803d)" },
    { id: "food", title: "ماذا يأكل؟", icon: "🍖", desc: "لحم أم نبات؟", bg: "linear-gradient(135deg,#f59e0b,#b45309)" },
    { id: "baby", title: "صغار الحيوانات", icon: "🐣", desc: "ما اسم صغيره؟", bg: "linear-gradient(135deg,#06b6d4,#2563eb)" },
    { id: "voice", title: "أصوات الحيوانات", icon: "🗣️", desc: "القطة تموء…", bg: "linear-gradient(135deg,#a855f7,#ec4899)" },
    { id: "find", title: "أين الحيوان؟", icon: "🔍", desc: "اختر الصورة", bg: "linear-gradient(135deg,#10b981,#0e7490)" },
  ];

  function homeScreen() {
    K.begin();
    const cards = MODES.map((m) => `
      <button class="mode f" style="background:${m.bg}" ${K.act(m.id, () => (m.id === "book" ? K.show(bookScreen) : K.show(K.quizScreen, quiz(m))))}>
        <span class="big emo">${m.icon}</span><b>${m.title}</b><small>${m.desc}</small>
        ${m.id === "book" ? `<span class="st">📖 ${Object.keys(save.seen).length} / ${A.length}</span>` : `<span class="st">${K.starsHtml(save.stars[m.id] || 0)}</span>`}
      </button>`).join("");
    K.paint(`
      <div class="title"><span class="mascot emo">🦁</span><div><h1>عالم الحيوان</h1><div class="sub">هيا نتعرّف على أصدقائنا الحيوانات</div></div></div>
      <div class="modes sm3">${cards}</div>
      ${K.HELP}`, "book");
  }

  function bookScreen() {
    K.begin();
    const tiles = A.map((a, i) => `<button class="tile f an${save.seen[a.n] ? " seen" : ""}" ${K.act("a" + i, () => K.show(cardScreen, i))}>${ani(a)}<b>${a.n}</b></button>`).join("");
    K.paint(`<div class="top">${K.backBtn()}<h2>الموسوعة</h2><span class="pill">📖 ${Object.keys(save.seen).length} / ${A.length}</span></div>
      <div class="grid" style="--cols:10">${tiles}</div>`, "a0");
  }

  function cardScreen(i) {
    K.begin();
    const a = A[i];
    if (!save.seen[a.n]) { save.seen[a.n] = 1; save.save(); }
    const go = (d) => { K.top().args = [(i + d + A.length) % A.length]; K.top().focus = d > 0 ? "next" : "prev"; K.render(); };
    const facts = [
      a.h && `<span>${HOMES[a.h][1]} المكان: <b>${HOMES[a.h][0]}</b></span>`,
      a.f && `<span>${FOODS[a.f][1]} الطعام: <b>${FOODS[a.f][0]}</b></span>`,
      a.b && `<span>🐣 الصغير: <b>${a.b}</b></span>`,
      a.v && `<span>🗣️ ${def(a.n)} <b>${a.v}</b></span>`,
      `<span dir="ltr">🇫🇷 ${a.fr}</span>`,
    ].filter(Boolean).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill">${i + 1} / ${A.length}</span></div>
      <div class="acard">
        <div class="apic">${ani(a)}</div>
        <div class="ainfo"><h2>${a.n}</h2><p>${a.x}</p><div class="facts">${facts}</div></div>
      </div>
      <div class="nav">
        <button class="btn f" ${K.act("prev", () => go(-1))}>→ السابق</button>
        <button class="btn f" ${K.act("say", () => sound(a))}><span class="emo">🔊</span> استمع</button>
        <button class="btn f" ${K.act("next", () => go(1))}>التالي ←</button>
      </div>`, "next");
  }

  function quiz(m) {
    return {
      title: m.title,
      optsCls: m.id === "find" ? "" : "txt",
      make() {
        if (m.id === "find") return K.shuffle(A).slice(0, 8).map((a) => {
          const o = K.options(a, A, 4, (x, y) => x.n === y.n);
          return { prompt: `<div class="q big">أين <b>${def(a.n)}</b>؟</div>`,
            opts: o.map((x) => ani(x)), answer: o.indexOf(a), say: () => K.tts(a.n) };
        });
        const key = { home: "h", food: "f", baby: "b", voice: "v" }[m.id];
        const pool = A.filter((a) => a[key]);
        return K.shuffle(pool).slice(0, 8).map((a) => {
          if (m.id === "home" || m.id === "food") {
            const dict = m.id === "home" ? HOMES : FOODS;
            const keys = Object.keys(dict);
            const o = m.id === "home" ? K.options(a.h, keys, 3) : keys;
            return { prompt: `<div class="col">${ani(a, "pic")}<div class="q">${m.id === "home" ? `أين بيت ${def(a.n)}؟` : `ما طعام ${def(a.n)}؟`}</div></div>`,
              opts: o.map((k) => `<span class="emo">${dict[k][1]}</span> ${dict[k][0]}`), answer: o.indexOf(a[key]), sayOk: () => K.tts(a.x) };
          }
          const o = K.options(a[key], pool.map((x) => x[key]), 3);
          const q = m.id === "baby" ? `ما اسم صغير ${def(a.n)}؟` : `ماذا يفعل ${def(a.n)}؟`;
          return { prompt: `<div class="col">${ani(a, "pic")}<div class="q">${q}</div></div>`, opts: o, answer: o.indexOf(a[key]),
            sayOk: () => (m.id === "voice" ? sound(a) : K.tts(`صغير ${def(a.n)}: ${a.b}`)) };
        });
      },
      done(score, s) { save.stars[m.id] = Math.max(save.stars[m.id] || 0, s); save.save(); },
    };
  }

  K.start(homeScreen);
})();
