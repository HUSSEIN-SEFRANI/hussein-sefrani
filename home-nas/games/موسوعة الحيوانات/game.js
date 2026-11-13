// موسوعة الحيوانات — صورة ومعلومات بالعربية لكل حيوان: أين يعيش، ماذا يأكل، كيف يتكاثر… ثم «اختبر نفسك».
// صور حقيقية: في مجلد «صور» باسم الحيوان، ويمكن وضع أكثر من صورة بترقيمها: صور/القطة 1.jpg، صور/القطة 2.jpg…
(() => {
  "use strict";
  const CATS = window.ZOO_CATS, ALL = window.ZOO;
  const save = K.store("zoo", { seen: {}, best: 0 });
  const byCat = (c) => ALL.filter((a) => a.c === c);
  const catOf = (a) => CATS.find((c) => c.id === a.c);
  let photos = {};

  const norm = (s) => String(s).replace(/\.[a-z0-9]+$/i, "").replace(/[\s_-]*\(?[0-9٠-٩]+\)?$/, "").replace(/[ً-ْٰـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .split(/[\s_-]+/).map((w) => w.replace(/^ال/, "")).filter(Boolean).join(" ");
  const photosOf = (a) => photos[norm(a.n)] || [];
  const pic = (a, cls = "") => {
    const ph = photosOf(a);
    // في الاختبار صورة عشوائية من صور الحيوان، وفي غيره الصورة الأولى
    if (ph.length) return `<img class="photo ${cls}" src="${cls === "q" ? K.pick(ph) : ph[0]}" alt="">`;
    if (a.e.startsWith("svg:")) return `<span class="pic ${cls}">${window.ART[a.e.slice(4)]()}</span>`;
    return `<span class="pic emo ${cls}"${a.f ? ` style="filter:${a.f}"` : ""}>${a.e}</span>`;
  };
  const seenCount = (list = ALL) => list.filter((a) => save.seen[a.n]).length;

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    const cards = CATS.map((c) => {
      const list = byCat(c.id), n = seenCount(list);
      return `<button class="mode f" style="background:${c.bg}" ${K.act(c.id, () => K.show(catScreen, c.id))}>
        <span class="big emo">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small><span class="cnt">${n ? `👀 ${n} / ` : ""}${list.length}</span></button>`;
    }).join("");
    K.paint(`<div class="title"><span class="mascot emo">🦉</span><div><h1>موسوعة الحيوانات</h1>
        <div class="sub">اختر مجموعة واقرأ عن كل حيوان · قرأت عن ${seenCount()} من ${ALL.length}</div></div></div>
      <div class="modes cats">${cards}
        <button class="mode f quizc" style="background:linear-gradient(135deg,#c084fc,#7c3aed)" ${K.act("quiz", () => K.show(K.quizScreen, quiz()))}>
          <span class="big emo">🧠</span><b>اختبر نفسك</b><small>${save.best ? `أفضل نتيجة: ${save.best} / 10` : "10 أسئلة"}</small></button></div>
      ${K.HELP}`, CATS[0].id);
  }

  // ---------------------------------------------------------------- مجموعة
  function catScreen(cid) {
    K.begin();
    const c = CATS.find((x) => x.id === cid), list = byCat(cid);
    const tiles = list.map((a, i) => `<button class="atile f${save.seen[a.n] ? " seen" : ""}" ${K.act("a" + i, () => K.show(animalScreen, cid, i))}>
      ${pic(a, "sm")}<b>${a.n}</b></button>`).join("");
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">${c.icon}</span> ${c.name}</h2><span class="pill">👀 ${seenCount(list)} / ${list.length}</span></div>
      <div class="agrid">${tiles}</div>${K.HELP}`, "a0");
  }

  // ---------------------------------------------------------------- صفحة الحيوان
  const BIRTH_ICON = { lay: "🥚", birth: "🍼" };
  function animalScreen(cid, i) {
    K.begin();
    const list = byCat(cid), a = list[i], c = catOf(a);
    save.seen[a.n] = 1; save.save();
    const row = (icon, label, text, cls = "") => (text ? `<div class="row ${cls}"><span class="ri emo">${icon}</span><div><b>${label}</b><p>${text}</p></div></div>` : "");
    const rows = [
      row("📍", "أين يعيش؟", a.home),
      row("🍽️", "ماذا يأكل؟", a.food),
      row(BIRTH_ICON[a.b] || "🐣", "كيف يتكاثر؟", a.repro),
      `<div class="pair">${row("📏", "حجمه", a.size)}${row("⏳", "كم يعيش؟", a.life)}</div>`,
      a.baby ? row("👶", "اسم صغيره", a.baby, "short") : "",
      row("💡", "هل تعلم؟", a.fact, "fact"),
    ].join("");
    const len = [a.home, a.food, a.repro, a.size, a.life, a.fact].join("").length;
    const go = (d) => () => K.replace(animalScreen, cid, (i + d + list.length) % list.length);
    const say = K.voice("ar") ? `<button class="btn f" ${K.act("say", () => K.tts(`${a.n}. ${a.home} ${a.food} ${a.repro} ${a.fact}`))}><span class="emo">🔊</span></button>` : "";
    K.paint(`<div class="top">${K.backBtn()}<span class="pill"><span class="emo">${c.icon}</span> ${c.name}</span>${say}
        <span class="pill">${i + 1} / ${list.length}</span></div>
      <div class="page">
        <div class="hero" style="background:${c.bg}">${gallery(a)}<h2>${a.n}</h2><div class="fr" dir="ltr">${a.fr}</div></div>
        <div class="info ${len > 520 ? "dense" : ""}">${rows}</div>
      </div>
      <div class="nav"><button class="btn f" ${K.act("prev", go(-1))}>→ السابق</button><button class="btn f go" ${K.act("next", go(1))}>التالي ←</button></div>`, "next");
  }

  // معرض الصور: الضغط على الصورة يعرض الصورة التالية
  function gallery(a) {
    const ph = photosOf(a);
    if (ph.length < 2) return pic(a, "lg");
    let k = 0;
    const dots = () => ph.map((_, j) => `<i class="${j === k ? "on" : ""}"></i>`).join("");
    return `<button class="gal f" ${K.act("photo", () => {
      k = (k + 1) % ph.length;
      const b = document.querySelector(".gal");
      b.querySelector("img").src = ph[k];
      b.querySelector(".dots").innerHTML = dots();
      K.sfx.tick();
    })}>${pic(a, "lg")}<span class="dots">${dots()}</span><span class="more emo">📷</span></button>`;
  }

  // ---------------------------------------------------------------- اختبر نفسك
  function quiz() {
    const types = ["name", "cat", "birth", "baby"];
    return {
      title: "اختبر نفسك",
      make() {
        const qs = [], used = new Set();
        for (let n = 0; qs.length < 10 && n < 300; n++) {
          const t = types[qs.length % types.length], a = K.pick(ALL);
          if (used.has(a.n + t)) continue;
          let q = null;
          if (t === "name") {
            const opts = K.options(a, ALL.filter((x) => x.c === a.c || Math.random() < 0.3), 3, (x, y) => x.n === y.n);
            q = { prompt: `${pic(a, "q")}<div class="q">ما اسم ${a.c === "micro" ? "هذا الكائن" : "هذا الحيوان"}؟</div>`, opts: opts.map((x) => x.n), answer: opts.indexOf(a), optsCls: "txt" };
          } else if (t === "cat") {
            const opts = K.options(catOf(a), CATS, 3, (x, y) => x.id === y.id);
            q = { prompt: `${pic(a, "q")}<div class="q">${a.n}: من أي مجموعة؟</div>`, opts: opts.map((x) => `<span class="emo">${x.icon}</span> ${x.name}`), answer: opts.indexOf(catOf(a)), optsCls: "txt" };
          } else if (t === "birth" && (a.b === "lay" || a.b === "birth")) {
            q = { prompt: `${pic(a, "q")}<div class="q">${a.n}: يبيض أم يلد؟</div>`, opts: ['<span class="emo">🥚</span> يبيض', '<span class="emo">🍼</span> يلد'], answer: a.b === "lay" ? 0 : 1, optsCls: "txt" };
          } else if (t === "baby" && a.baby) {
            const babies = [...new Set(ALL.filter((x) => x.baby && x.baby !== a.baby).map((x) => x.baby))];
            const opts = K.options(a.baby, babies, 3);
            q = { prompt: `${pic(a, "q")}<div class="q">ما اسم صغير ${a.n}؟</div>`, opts, answer: opts.indexOf(a.baby), optsCls: "txt" };
          }
          if (q) { used.add(a.n + t); qs.push(q); }
        }
        return qs;
      },
      done(score) { if (score > (save.best || 0)) { save.best = score; save.save(); } },
    };
  }

  // صور حقيقية من مجلد «صور» إن وُجد
  K.listImages("صور").then((list) => {
    list.sort((x, y) => x.name.localeCompare(y.name, "ar", { numeric: true }));
    for (const im of list) (photos[norm(im.name)] ||= []).push(im.url);
    if (list.length && K.top()) K.render();
  });
  K.start(home);
})();
