// الرياضيات بالأشياء — العدّ والجمع والطرح والمقارنة بالصور
(() => {
  "use strict";
  const save = K.store("math", { stars: {}, level: 0 });
  const THINGS = ["🍎", "🍌", "🐟", "🚗", "⭐", "🎈", "🐥", "🍓", "⚽", "🌸", "🐞", "🍪", "🦋", "🧁", "🚀", "🐢"];
  const LEVELS = [{ name: "سهل", max: 5, icon: "🐣" }, { name: "متوسط", max: 10, icon: "🐥" }];
  const arD = (n) => Number(n).toLocaleString("ar-EG");
  const numHtml = (n) => `<span class="n"><b>${n}</b><small>${arD(n)}</small></span>`;
  const group = (e, n, crossed = 0) => `<div class="grp" style="--w:${Math.min(5, Math.max(1, Math.ceil(Math.sqrt(n * 1.6))))}">${
    Array.from({ length: n }, (_, i) => `<span class="emo${i >= n - crossed ? " gone" : ""}">${e}</span>`).join("")}</div>`;
  const numOpts = (right, max) => K.options(right, K.range(0, max + 1), 3);

  const MODES = [
    { id: "count", title: "عُدّ", icon: "🔢", desc: "كم عددها؟", bg: "linear-gradient(135deg,#f97316,#ef4444)" },
    { id: "add", title: "اجمع", icon: "➕", desc: "كم صار عندنا؟", bg: "linear-gradient(135deg,#22c55e,#15803d)" },
    { id: "sub", title: "اطرح", icon: "➖", desc: "كم بقي؟", bg: "linear-gradient(135deg,#06b6d4,#2563eb)" },
    { id: "more", title: "أيهما أكثر؟", icon: "⚖️", desc: "قارن بين المجموعتين", bg: "linear-gradient(135deg,#a855f7,#ec4899)" },
  ];

  function q(mode, max) {
    const e = K.pick(THINGS);
    if (mode === "count") {
      const n = 1 + ((Math.random() * max) | 0);
      const o = numOpts(n, max);
      return { prompt: `<div class="col">${group(e, n)}<div class="q">كم عددها؟</div></div>`, opts: o.map(numHtml), answer: o.indexOf(n) };
    }
    if (mode === "add") {
      const a = 1 + ((Math.random() * (max - 1)) | 0), b = 1 + ((Math.random() * (max - a)) | 0);
      const o = numOpts(a + b, max);
      return { prompt: `<div class="eq" dir="ltr">${group(e, a)}<span class="sign">+</span>${group(e, b)}<span class="sign">=</span><span class="hole">?</span></div>`,
        opts: o.map(numHtml), answer: o.indexOf(a + b), reveal: revealHole(a + b) };
    }
    if (mode === "sub") {
      const a = 2 + ((Math.random() * (max - 1)) | 0), b = 1 + ((Math.random() * (a - 1)) | 0);
      const o = numOpts(a - b, max);
      return { prompt: `<div class="eq" dir="ltr">${group(e, a, b)}<span class="sign">${a} − ${b} =</span><span class="hole">?</span></div>`,
        opts: o.map(numHtml), answer: o.indexOf(a - b), reveal: revealHole(a - b) };
    }
    // أيهما أكثر
    let a = 1 + ((Math.random() * max) | 0), b = 1 + ((Math.random() * max) | 0);
    while (a === b) b = 1 + ((Math.random() * max) | 0);
    const e2 = K.pick(THINGS.filter((x) => x !== e));
    return { prompt: `<div class="q big">أيُّ مجموعة فيها أكثر؟</div>`, optsCls: "groups", opts: [group(e, a), group(e2, b)], answer: a > b ? 0 : 1 };
  }
  const revealHole = (n) => (app) => { const h = app.querySelector(".hole"); if (h) { h.textContent = n; h.classList.add("got"); } };

  function homeScreen() {
    K.begin();
    const lv = LEVELS[save.level];
    const cards = MODES.map((m) => {
      const st = save.stars[`${m.id}:${save.level}`] || 0;
      return `<button class="mode f" style="background:${m.bg}" ${K.act(m.id, () => K.show(K.quizScreen, quiz(m)))}>
        <span class="big emo">${m.icon}</span><b>${m.title}</b><small>${m.desc}</small><span class="st">${K.starsHtml(st)}</span></button>`;
    }).join("");
    K.paint(`
      <div class="title"><span class="mascot emo">🧮</span><div><h1>الرياضيات بالأشياء</h1><div class="sub">نعدّ ونجمع ونلعب!</div></div></div>
      <div class="modes">${cards}</div>
      <div class="mini">
        <button class="btn f" ${K.act("lvl", () => { save.level = (save.level + 1) % LEVELS.length; save.save(); K.render(); })}>
          <span class="emo">${lv.icon}</span> المستوى: ${lv.name} (حتى ${lv.max})</button>
      </div>
      ${K.HELP}`, "count");
  }

  function quiz(m) {
    const lvl = save.level, max = LEVELS[lvl].max;
    return {
      title: `${m.title} · ${LEVELS[lvl].name}`,
      make: () => Array.from({ length: 8 }, () => q(m.id, max)),
      done(score, s) {
        const k = `${m.id}:${lvl}`;
        save.stars[k] = Math.max(save.stars[k] || 0, s);
        if (s === 3 && lvl < LEVELS.length - 1 && save.level === lvl) { save.level = lvl + 1; save.save(); return `<div class="won"><span class="emo">🎉</span><div><b>انتقلت إلى المستوى ${LEVELS[lvl + 1].name}!</b></div></div>`; }
        save.save();
        return "";
      },
    };
  }

  K.start(homeScreen);
})();
