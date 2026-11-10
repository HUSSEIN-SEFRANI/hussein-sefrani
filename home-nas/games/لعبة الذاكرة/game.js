// لعبة الذاكرة — اقلب بطاقتين وابحث عن الأزواج المتشابهة (رسومات أو صور الطفل)
(() => {
  "use strict";
  const save = K.store("memory", { level: 0, stars: {} });
  const LEVELS = [{ pairs: 3, cols: 3, name: "سهل", icon: "🐣" }, { pairs: 6, cols: 4, name: "متوسط", icon: "🐥" }, { pairs: 8, cols: 4, name: "صعب", icon: "🦅" }];
  const SETS = [
    { id: "animals", name: "الحيوانات", icon: "🐶", bg: "linear-gradient(135deg,#f97316,#ef4444)", items: [..."🐶🐱🦁🐘🐵🐰🐻🐼🦊🐸🐧🦒"] },
    { id: "fruits", name: "الفواكه", icon: "🍓", bg: "linear-gradient(135deg,#22c55e,#15803d)", items: [..."🍎🍌🍇🍓🍉🍊🍒🍍🥝🍑🍐🥥"] },
    { id: "cars", name: "المركبات", icon: "🚗", bg: "linear-gradient(135deg,#06b6d4,#2563eb)", items: ["🚗", "🚕", "🚌", "🚒", "🚑", "🚓", "🚜", "🚀", "✈️", "🚂", "🚲", "⛵"] },
    { id: "photos", name: "صوري", icon: "📷", bg: "linear-gradient(135deg,#a855f7,#ec4899)", photos: true },
  ];
  let myPics = null;

  async function homeScreen() {
    K.begin();
    if (myPics === null) myPics = [...(await K.myPhotos("thumb")), ...(await K.listImages("photos")).map((x) => x.url)];
    K.begin();
    const lv = LEVELS[save.level];
    const sets = SETS.filter((s) => !s.photos || myPics.length >= 3);
    const cards = sets.map((s) => `
      <button class="mode f" style="background:${s.bg}" ${K.act(s.id, () => K.show(gameScreen, s.id))}>
        <span class="big emo">${s.icon}</span><b>${s.name}</b><span class="st">${K.starsHtml(save.stars[`${s.id}:${save.level}`] || 0)}</span></button>`).join("");
    K.paint(`
      <div class="title"><span class="mascot emo">🃏</span><div><h1>لعبة الذاكرة</h1><div class="sub">اقلب بطاقتين وابحث عن المتشابهتين</div></div></div>
      <div class="modes">${cards}</div>
      <div class="mini"><button class="btn f" ${K.act("lvl", () => { save.level = (save.level + 1) % LEVELS.length; save.save(); K.render(); })}>
        <span class="emo">${lv.icon}</span> المستوى: ${lv.name} (${lv.pairs * 2} بطاقات)</button></div>
      ${K.HELP}`, sets[0].id);
  }

  function gameScreen(setId) {
    K.begin();
    const set = SETS.find((s) => s.id === setId), lv = LEVELS[save.level];
    const pool = set.photos ? K.shuffle(myPics) : K.shuffle(set.items);
    const faces = pool.slice(0, Math.min(lv.pairs, pool.length));
    const deck = K.shuffle([...faces, ...faces].map((f, i) => ({ f, id: faces.indexOf(f) })));
    const face = (f) => (set.photos ? `<img src="${f}" alt="">` : `<span class="emo">${f}</span>`);
    let open = [], found = 0, moves = 0, busy = false;
    const cols = deck.length === 16 ? 8 : deck.length === 12 ? 6 : 3;
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill"><span class="emo">${set.icon}</span> ${set.name}</span><span class="pill moves">🔄 0</span></div>
      <div class="cards" style="grid-template-columns:repeat(${cols},auto)">
        ${deck.map((c, i) => `<button class="card f" ${K.act("k" + i, (el) => flip(i, el))}><div class="in"><div class="back">⭐</div><div class="front">${face(c.f)}</div></div></button>`).join("")}
      </div>
      <div class="cheer"></div>`, "k0");
    function flip(i, el) {
      if (busy || el.classList.contains("up")) return;
      el.classList.add("up"); K.sfx.pop();
      open.push(i);
      if (open.length < 2) return;
      moves++;
      K.app.querySelector(".moves").textContent = "🔄 " + moves;
      const [a, b] = open; open = [];
      const ea = K.app.querySelector(`[data-k="k${a}"]`), eb = K.app.querySelector(`[data-k="k${b}"]`);
      if (deck[a].id === deck[b].id) {
        found++; ea.classList.add("got"); eb.classList.add("got"); K.sfx.ok(); K.confetti(8);
        K.app.querySelector(".cheer").textContent = K.pick(["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉"]);
        if (found === faces.length) K.later(win, 900);
      } else {
        busy = true;
        K.later(() => { ea.classList.remove("up"); eb.classList.remove("up"); busy = false; }, 1000);
      }
    }
    function win() {
      const p = faces.length, s = moves <= p * 1.5 ? 3 : moves <= p * 2.2 ? 2 : 1;
      const k = `${set.id}:${save.level}`;
      save.stars[k] = Math.max(save.stars[k] || 0, s);
      let extra = `<div class="sub">وجدت كل الأزواج في ${moves} محاولة</div>`;
      if (s === 3 && save.level < LEVELS.length - 1) { save.level++; extra += `<div class="won"><span class="emo">🎉</span><b>انتقلت إلى المستوى ${LEVELS[save.level].name}!</b></div>`; }
      save.save();
      K.replace(K.resultScreen, { s, extra, again: () => K.replace(gameScreen, setId) });
    }
  }

  K.start(homeScreen);
})();
