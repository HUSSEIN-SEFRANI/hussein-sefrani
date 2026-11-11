// جغرافيا — أعلام الدول: اضغط على العلم لتعرف اسم الدولة وعاصمتها ولغتها وعدد سكانها وعملتها، ثم «اختبر نفسك».
(() => {
  "use strict";
  const ALL = window.COUNTRIES.slice().sort((a, b) => a.n.localeCompare(b.n, "ar")), CONT = window.CONTINENTS;
  const save = K.store("geo", { seen: {}, best: 0 });
  const flag = (code) => String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  const fmtPop = (m) => {
    if (m >= 1000) return `نحو ${(m / 1000).toLocaleString("ar-SY-u-nu-latn", { maximumFractionDigits: 2 })} مليار نسمة`;
    if (m >= 1) return `نحو ${m.toLocaleString("ar-SY-u-nu-latn", { maximumFractionDigits: 1 })} مليون نسمة`;
    if (m >= 0.001) return `نحو ${Math.round(m * 1000).toLocaleString("ar-SY-u-nu-latn")} ألف نسمة`;
    return `نحو ${Math.round(m * 1e6)} نسمة فقط`;
  };
  const GROUPS = [
    { id: "arab", name: "الدول العربية", icon: "🕌", bg: "linear-gradient(135deg,#22c55e,#15803d)", list: ALL.filter((c) => c.arab) },
    ...Object.entries(CONT).map(([id, [name, icon]], k) => ({ id, name, icon, list: ALL.filter((c) => c.c === id),
      bg: ["linear-gradient(135deg,#f59e0b,#b45309)", "linear-gradient(135deg,#f43f5e,#be123c)", "linear-gradient(135deg,#3b82f6,#1d4ed8)",
        "linear-gradient(135deg,#a855f7,#7e22ce)", "linear-gradient(135deg,#14b8a6,#0f766e)", "linear-gradient(135deg,#06b6d4,#0e7490)"][k] })),
    { id: "all", name: "كل الدول", icon: "🗺️", bg: "linear-gradient(135deg,#64748b,#334155)", list: ALL },
  ];
  // إبقاء العنصر المختار ظاهراً في القوائم الطويلة
  K.onFocus = (el) => { const sc = el.closest(".scroll"); if (sc) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); };

  function home() {
    K.begin();
    const seen = Object.keys(save.seen).length;
    K.paint(`<div class="title"><span class="mascot emo">🌍</span><div><h1>جغرافيا</h1><div class="sub">اضغط على علم لتعرف الدولة · شاهدت ${seen} من ${ALL.length} دولة</div></div></div>
      <div class="groups">${GROUPS.map((g) => `<button class="grpb f" style="background:${g.bg}" ${K.act(g.id, () => K.show(flagsScreen, g.id))}>
          <span class="emo">${g.icon}</span><b>${g.name}</b><small>${g.list.length} دولة</small></button>`).join("")}
        <button class="grpb f" style="background:linear-gradient(135deg,#facc15,#ca8a04)" ${K.act("quiz", () => K.show(K.quizScreen, quiz()))}>
          <span class="emo">🧠</span><b>اختبر نفسك</b><small>${save.best ? `أفضل نتيجة: ${save.best} / 10` : "10 أسئلة"}</small></button></div>
      ${K.HELP}`, "arab");
  }

  function flagsScreen(gid) {
    K.begin();
    const g = GROUPS.find((x) => x.id === gid);
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">${g.icon}</span> ${g.name}</h2><span class="pill">${g.list.length}</span></div>
      <div class="scroll"><div class="flags">${g.list.map((c, i) => `<button class="fl f${save.seen[c.code] ? " seen" : ""}" ${K.act("c" + i, () => K.show(countryScreen, gid, i))}>
        <span class="emo">${flag(c.code)}</span><b>${c.n}</b></button>`).join("")}</div></div>`, "c0");
  }

  function countryScreen(gid, i) {
    K.begin();
    const g = GROUPS.find((x) => x.id === gid), c = g.list[i];
    save.seen[c.code] = 1; save.save();
    const row = (icon, label, text) => `<div class="row"><span class="ri emo">${icon}</span><div><b>${label}</b><p>${text}</p></div></div>`;
    const go = (d) => () => K.replace(countryScreen, gid, (i + d + g.list.length) % g.list.length);
    K.paint(`<div class="top">${K.backBtn()}<span class="pill"><span class="emo">${g.icon}</span> ${g.name}</span><span class="pill">${i + 1} / ${g.list.length}</span></div>
      <div class="page">
        <div class="hero"><span class="bigflag emo">${flag(c.code)}</span><h2>${c.n}</h2></div>
        <div class="info">
          ${row("🏛️", "العاصمة", c.cap)}
          ${row("🗣️", c.lang.includes(" و") || c.lang.includes("،") ? "اللغات الرسمية" : "اللغة الرسمية", c.lang)}
          ${row("👨‍👩‍👧", "عدد السكان", fmtPop(c.pop))}
          ${row(CONT[c.c][1], "القارة", CONT[c.c][0] + (c.arab ? " · من الدول العربية" : ""))}
          ${row("💰", "العملة", c.cur)}
        </div>
      </div>
      <div class="nav"><button class="btn f" ${K.act("prev", go(-1))}>→ السابق</button><button class="btn f go" ${K.act("next", go(1))}>التالي ←</button></div>`, "next");
  }

  // ---------------------------------------------------------------- اختبر نفسك
  function quiz() {
    return {
      title: "اختبر نفسك",
      make() {
        const qs = [], used = new Set();
        // نبدأ بالدول المعروفة أكثر: العربية ثم من شاهدها الطفل ثم الكبيرة
        const known = ALL.filter((c) => c.arab || save.seen[c.code] || c.pop > 30);
        const plan = K.shuffle(["flag", "flag", "flag", "flag", "cap", "cap", "cap", "pick", "pick", "pick"]);
        for (const t of plan) {
          let c, n = 0;
          do c = K.pick(known); while (used.has(c.code) && ++n < 80);
          used.add(c.code);
          const near = ALL.filter((x) => x.c === c.c || (c.arab && x.arab));
          if (t === "flag") {
            const o = K.options(c, near, 3, (a, b) => a.code === b.code);
            qs.push({ prompt: `<span class="qflag emo">${flag(c.code)}</span><div class="q">علم أي دولة هذا؟</div>`, opts: o.map((x) => x.n), answer: o.indexOf(c), optsCls: "txt" });
          } else if (t === "cap") {
            const o = K.options(c, near, 3, (a, b) => a.cap === b.cap);
            qs.push({ prompt: `<span class="qflag sm emo">${flag(c.code)}</span><div class="q">ما عاصمة ${c.n}؟</div>`, opts: o.map((x) => x.cap.replace(/\s*\(.*\)/, "")), answer: o.indexOf(c), optsCls: "txt" });
          } else {
            const o = K.options(c, near, 3, (a, b) => a.code === b.code);
            qs.push({ prompt: `<div class="q big">أين علم ${c.n}؟</div>`, opts: o.map((x) => `<span class="emo">${flag(x.code)}</span>`), answer: o.indexOf(c), optsCls: "flagopts" });
          }
        }
        return qs;
      },
      done(score) { if (score > (save.best || 0)) { save.best = score; save.save(); } },
    };
  }

  K.start(home);
})();
