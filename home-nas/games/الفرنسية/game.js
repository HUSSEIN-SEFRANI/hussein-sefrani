// Écoute et choisis — تعلّم كلمات فرنسية بالصور
// الصوت (اختياري): ملف mp3 لكل كلمة داخل مجلد sons باسم الكلمة الفرنسية، مثل: sons/chat.mp3
// وإن لم يوجد يُستعمل صوت فرنسي من النظام إن توفر، وإلا تُكتب الكلمة.
(() => {
  "use strict";
  const save = K.store("fr", { stars: {} });
  const C = (fr, ar, e, color) => ({ fr, ar, e, color });
  const CATS = [
    { id: "animaux", name: "الحيوانات", fr: "Les animaux", icon: "🐶", bg: "linear-gradient(135deg,#f97316,#ef4444)", words: [
      C("le chat", "قطة", "🐈"), C("le chien", "كلب", "🐕"), C("la vache", "بقرة", "🐄"), C("le cheval", "حصان", "🐎"), C("le mouton", "خروف", "🐑"),
      C("le lapin", "أرنب", "🐇"), C("la poule", "دجاجة", "🐔"), C("le canard", "بطة", "🦆"), C("le poisson", "سمكة", "🐟"), C("l'oiseau", "عصفور", "🐦"),
      C("le lion", "أسد", "🦁"), C("l'éléphant", "فيل", "🐘"), C("le singe", "قرد", "🐒"), C("la girafe", "زرافة", "🦒"), C("l'ours", "دب", "🐻"), C("la souris", "فأر", "🐭")] },
    { id: "nourriture", name: "الطعام", fr: "La nourriture", icon: "🍎", bg: "linear-gradient(135deg,#22c55e,#15803d)", words: [
      C("la pomme", "تفاحة", "🍎"), C("la banane", "موزة", "🍌"), C("l'orange", "برتقالة", "🍊"), C("la fraise", "فراولة", "🍓"), C("le raisin", "عنب", "🍇"),
      C("la poire", "إجاصة", "🍐"), C("la cerise", "كرز", "🍒"), C("la pastèque", "بطيخ", "🍉"), C("le citron", "ليمون", "🍋"), C("le pain", "خبز", "🍞"),
      C("le lait", "حليب", "🥛"), C("le fromage", "جبن", "🧀"), C("l'œuf", "بيضة", "🥚"), C("le gâteau", "كعكة", "🍰"), C("la carotte", "جزرة", "🥕")] },
    { id: "couleurs", name: "الألوان", fr: "Les couleurs", icon: "🎨", bg: "linear-gradient(135deg,#06b6d4,#2563eb)", words: [
      C("rouge", "أحمر", null, "#ef4444"), C("bleu", "أزرق", null, "#2563eb"), C("vert", "أخضر", null, "#16a34a"), C("jaune", "أصفر", null, "#facc15"),
      C("orange", "برتقالي", null, "#f97316"), C("violet", "بنفسجي", null, "#8b5cf6"), C("rose", "وردي", null, "#f472b6"), C("noir", "أسود", null, "#111827"),
      C("blanc", "أبيض", null, "#ffffff"), C("marron", "بني", null, "#92400e"), C("gris", "رمادي", null, "#9ca3af")] },
    { id: "nombres", name: "الأرقام", fr: "Les nombres", icon: "🔢", bg: "linear-gradient(135deg,#a855f7,#ec4899)", words: [
      C("un", "واحد", "1"), C("deux", "اثنان", "2"), C("trois", "ثلاثة", "3"), C("quatre", "أربعة", "4"), C("cinq", "خمسة", "5"),
      C("six", "ستة", "6"), C("sept", "سبعة", "7"), C("huit", "ثمانية", "8"), C("neuf", "تسعة", "9"), C("dix", "عشرة", "10")] },
    { id: "corps", name: "الجسم", fr: "Le corps", icon: "✋", bg: "linear-gradient(135deg,#f59e0b,#b45309)", words: [
      C("la main", "يد", "✋"), C("le pied", "قدم", "🦶"), C("l'œil", "عين", "👁️"), C("l'oreille", "أذن", "👂"), C("le nez", "أنف", "👃"),
      C("la bouche", "فم", "👄"), C("la dent", "سن", "🦷"), C("le bras", "ذراع", "💪"), C("la jambe", "ساق", "🦵")] },
    { id: "maison", name: "حولنا", fr: "Autour de nous", icon: "🏠", bg: "linear-gradient(135deg,#10b981,#0e7490)", words: [
      C("la maison", "بيت", "🏠"), C("la voiture", "سيارة", "🚗"), C("le vélo", "دراجة", "🚲"), C("le ballon", "كرة", "⚽"), C("le livre", "كتاب", "📖"),
      C("la chaise", "كرسي", "🪑"), C("le lit", "سرير", "🛏️"), C("la porte", "باب", "🚪"), C("la clé", "مفتاح", "🔑"), C("le soleil", "شمس", "☀️"),
      C("la lune", "قمر", "🌙"), C("l'étoile", "نجمة", "⭐"), C("l'arbre", "شجرة", "🌳"), C("la fleur", "زهرة", "🌸"), C("le train", "قطار", "🚆")] },
  ];
  const MODES = [
    { id: "ecoute", title: "استمع واختر", fr: "Écoute", icon: "👂" },
    { id: "lis", title: "اقرأ واختر", fr: "Lis", icon: "👀" },
    { id: "nom", title: "ما اسمها؟", fr: "Comment ça s'appelle ?", icon: "💬" },
  ];
  const pic = (w, big) => (w.color ? `<span class="dot${big ? " big" : ""}" style="background:${w.color}"></span>` : /^\d+$/.test(w.e) ? `<span class="digit">${w.e}</span>` : `<span class="emo">${w.e}</span>`);
  const file = (w) => "sons/" + encodeURIComponent(w.fr.replace(/^(le |la |les |l')/, "")) + ".mp3";
  const speak = (w, onFail) => K.play([file(w)], w.fr, "fr", null, onFail);

  function homeScreen() {
    K.begin();
    const cards = CATS.map((c, i) => {
      const st = MODES.reduce((a, m) => a + (save.stars[`${c.id}:${m.id}`] || 0), 0);
      return `<button class="mode f" style="background:${c.bg}" ${K.act("c" + i, () => K.show(catScreen, i))}>
        <span class="big emo">${c.icon}</span><b>${c.name}</b><small dir="ltr">${c.fr}</small><span class="st">⭐ ${st} / 9</span></button>`;
    }).join("");
    K.paint(`
      <div class="title"><span class="mascot emo">🇫🇷</span><div><h1 dir="ltr">Écoute et choisis</h1><div class="sub">نتعلّم الفرنسية بالصور</div></div></div>
      <div class="modes sm3">${cards}</div>
      ${K.HELP}`, "c0");
  }

  function catScreen(ci) {
    K.begin();
    const c = CATS[ci];
    const cards = MODES.map((m) => `
      <button class="mode f" style="background:${c.bg}" ${K.act(m.id, () => K.show(K.quizScreen, quiz(ci, m)))}>
        <span class="big emo">${m.icon}</span><b>${m.title}</b><small dir="ltr">${m.fr}</small><span class="st">${K.starsHtml(save.stars[`${c.id}:${m.id}`] || 0)}</span></button>`).join("");
    const words = c.words.map((w, i) => `<button class="tile f word" ${K.act("w" + i, () => speak(w))}>${pic(w)}<b dir="ltr">${w.fr}</b><small>${w.ar}</small></button>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2><span class="emo">${c.icon}</span> ${c.name} · <span dir="ltr">${c.fr}</span></h2><span></span></div>
      <div class="modes">${cards}</div>
      <div class="words">${words}</div>`, "ecoute");
  }

  function quiz(ci, m) {
    const c = CATS[ci];
    return {
      title: `${c.name} · ${m.title}`,
      optsCls: m.id === "nom" ? "txt fr" : "pics",
      make() {
        return K.shuffle(c.words).slice(0, 8).map((w) => {
          const opts = K.options(w, c.words, m.id === "nom" ? 3 : 4, (a, b) => a.fr === b.fr);
          const base = { opts: opts.map((o) => (m.id === "nom" ? `<span dir="ltr">${o.fr}</span>` : pic(o))), answer: opts.indexOf(w), sayOk: () => speak(w) };
          const meaning = `<div class="meaning" hidden><b dir="ltr">${w.fr}</b> = ${w.ar}</div>`;
          const reveal = (app) => { app.querySelectorAll(".meaning, .wtxt").forEach((e) => (e.hidden = false)); };
          if (m.id === "ecoute")
            return { ...base, reveal, prompt: `<div class="col"><span class="emo ear">🔊</span><div class="wtxt" dir="ltr" hidden>${w.fr}</div>${meaning}</div>`,
              say: () => speak(w, () => { const e = K.app.querySelector(".wtxt"); if (e) e.hidden = false; }) };
          if (m.id === "lis") return { ...base, reveal, prompt: `<div class="col"><div class="wbig" dir="ltr">${w.fr}</div>${meaning}</div>` };
          return { ...base, reveal, prompt: `<div class="col"><div class="pic">${pic(w, true)}</div>${meaning}</div>` };
        });
      },
      done(score, s) { const k = `${c.id}:${m.id}`; save.stars[k] = Math.max(save.stars[k] || 0, s); save.save(); },
    };
  }

  K.start(homeScreen);
})();
