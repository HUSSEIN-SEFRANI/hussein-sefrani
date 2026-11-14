// Luister en kies — تعلّم الهولندية بالصور (على نمط «الفرنسية»)
// الصوت (اختياري): ملف لكل كلمة في مجلد sounds باسم الكلمة بدون de/het، مثل sounds/kat.mp3 (انظر sounds/اقرأني.txt)
// وإن لم يوجد يُستعمل صوت هولندي من النظام (nl) إن توفر، وإلا تُكتب الكلمة.
(() => {
  "use strict";
  const GAME = "الهولندية";
  const save = K.store("nl", { stars: {}, seen: {}, test: 0 });

  // ---------------------------------------------------------------- البيانات
  const CATS = NL_CATS.map((c) => ({ ...c, words: c.words.map(([art, nl, ar, pr, g]) => ({ art, nl, ar, pr, g, cat: c.id, key: NL_KEY(nl), full: (art ? art + " " : "") + nl })) }));
  const ALL = CATS.flatMap((c) => c.words);
  const MODES = [
    { id: "luister", title: "استمع واختر", nl: "Luister", icon: "👂" },
    { id: "lees", title: "اقرأ واختر", nl: "Lees", icon: "👀" },
    { id: "naam", title: "ما اسمها؟", nl: "Hoe heet het?", icon: "💬" },
  ];
  const same = (a, b) => a.nl === b.nl || (!!a.g && a.g === b.g);
  const pic = (w) => `<span class="pic-svg">${NL_ART(w.key)}</span>`;
  const artBadge = (w) => (w.art ? `<span class="a ${w.art}">${w.art}</span> ` : "");
  const wordHtml = (w) => `<span dir="ltr" class="nlw">${artBadge(w)}${K.esc(w.nl)}</span>`;
  const pron = (w) => `<span class="pr">${K.esc(w.pr)}</span>`;

  // ---------------------------------------------------------------- الصوت
  const files = (w) => { const f = "sounds/" + encodeURIComponent(w.key); return [f + ".mp3", f + ".m4a"]; };
  const speak = (w, onFail) => K.play(files(w), w.full.replace("…", ""), "nl", null, onFail);

  // ---------------------------------------------------------------- واجهات السيرفر (تُتجاهل أخطاؤها)
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const learn = (topic, ok) => { try { post("/api/tv/learn/result", { game: GAME, topic, ok }).catch(() => {}); } catch {} };
  const earn = (amount, reason) => {
    if (amount <= 0) return;
    try {
      post("/api/tv/stars/earn", { amount, game: GAME, reason }).then((r) => (r.ok ? r.json() : null)).then((d) => {
        const el = document.getElementById("earned");
        if (d && d.added > 0 && el) { el.innerHTML = `<span class="emo">⭐</span> ربحت ${d.added} ${d.added === 1 ? "نجمة" : "نجوم"}`; el.hidden = false; }
      }).catch(() => {});
    } catch {}
  };
  // أول إجابة في كل سؤال تُرسل لتقرير الأهل (صحيحة أو خاطئة)
  const ok0 = K.sfx.ok, bad0 = K.sfx.bad;
  const report = (ok) => { const p = K.app.querySelector("[data-topic]"); if (p && !p.dataset.sent) { p.dataset.sent = "1"; learn(p.dataset.topic, ok); } };
  K.sfx.ok = () => { report(true); ok0(); };
  K.sfx.bad = () => { report(false); bad0(); };

  const catStars = (c) => MODES.reduce((a, m) => a + (save.stars[`${c.id}:${m.id}`] || 0), 0);
  const seenCount = (c) => c.words.filter((w) => save.seen[w.nl]).length;

  // ---------------------------------------------------------------- الشاشة الرئيسية
  function homeScreen() {
    K.begin();
    const total = CATS.reduce((a, c) => a + catStars(c), 0);
    const cards = CATS.map((c, i) => `
      <button class="mode f cat" style="background:${c.bg}" ${K.act("c" + i, () => K.show(catScreen, i))}>
        <span class="ico">${NL_ART(c.icon)}</span><b>${c.name}</b><small dir="ltr">${c.nl}</small><span class="st">⭐ ${catStars(c)} / 9</span></button>`).join("");
    const test = `<button class="mode f cat test" ${K.act("test", () => K.show(K.quizScreen, testQuiz()))}>
        <span class="big emo">🏆</span><b>اختبر نفسك</b><small dir="ltr">Test jezelf</small><span class="st">${K.starsHtml(save.test || 0)}</span></button>`;
    K.paint(`
      <div class="title"><span class="mascot">${NL_ART_MASCOT()}</span><div><h1 dir="ltr">Luister en kies</h1><div class="sub">نتعلّم الهولندية بالصور · ⭐ ${total} / ${CATS.length * 9}</div></div></div>
      <div class="modes home">${cards}${test}</div>
      ${K.HELP}`, "c0");
  }

  // ---------------------------------------------------------------- شاشة الفئة
  function catScreen(ci) {
    K.begin();
    const c = CATS[ci];
    const learnCard = `<button class="mode f" style="background:${c.bg}" ${K.act("leer", () => K.show(learnScreen, ci, 0))}>
        <span class="big emo">📖</span><b>تعلّم الكلمات</b><small dir="ltr">Leer</small><span class="st">👀 ${seenCount(c)} / ${c.words.length}</span></button>`;
    const cards = MODES.map((m) => `
      <button class="mode f" style="background:${c.bg}" ${K.act(m.id, () => K.show(K.quizScreen, quiz(ci, m)))}>
        <span class="big emo">${m.icon}</span><b>${m.title}</b><small dir="ltr">${m.nl}</small><span class="st">${K.starsHtml(save.stars[`${c.id}:${m.id}`] || 0)}</span></button>`).join("");
    const words = c.words.map((w, i) => `<button class="tile f word${save.seen[w.nl] ? " seen" : ""}" ${K.act("w" + i, () => K.show(learnScreen, ci, i))}>${pic(w)}<b dir="ltr">${K.esc(w.nl)}</b></button>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${c.name} · <span dir="ltr">${c.nl}</span></h2><span class="pill legend"><span class="a de">de</span> <span class="a het">het</span></span></div>
      <div class="modes sm">${learnCard}${cards}</div>
      <div class="words">${words}</div>`, "leer");
  }

  // ---------------------------------------------------------------- تعلّم الكلمات (بطاقة كبيرة)
  function learnScreen(ci, i) {
    K.begin();
    const c = CATS[ci], w = c.words[i], n = c.words.length;
    if (!save.seen[w.nl]) { save.seen[w.nl] = 1; save.save(); }
    const go = (j) => { K.top().args = [ci, (j + n) % n]; K.render(); };
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${c.name}</h2><span class="pill">${i + 1} / ${n}</span></div>
      <div class="card">
        <div class="cpic">${pic(w)}</div>
        <div class="cinfo">
          <div class="cw">${wordHtml(w)}</div>
          <div class="cpr">🗣️ ${pron(w)}</div>
          <div class="car">${K.esc(w.ar)}</div>
        </div>
      </div>
      <div class="nav">
        <button class="btn f" ${K.act("prev", () => go(i - 1))}>→ السابق</button>
        <button class="btn f say" ${K.act("say", () => speak(w, noVoice))}><span class="emo">🔊</span> اسمع</button>
        <button class="btn f go" ${K.act("next", () => go(i + 1))}>التالي ←</button>
      </div>
      <div class="novoice" hidden>لا يوجد صوت هولندي على هذا الجهاز — اقرأ الكلمة مع النطق المكتوب 🙂</div>
      ${K.HELP}`, "next");
    speak(w, noVoice);
  }
  function noVoice() { const e = K.app.querySelector(".novoice"); if (e) e.hidden = false; }

  // ---------------------------------------------------------------- الأسئلة
  function question(w, pool, mode) {
    const n = mode === "naam" ? 3 : 4;
    const opts = K.options(w, pool, n, same);
    const base = { opts: opts.map((o) => (mode === "naam" ? wordHtml(o) : pic(o))), answer: opts.indexOf(w), sayOk: () => speak(w), optsCls: mode === "naam" ? "txt nlo" : "pics" };
    const meaning = `<div class="meaning" hidden>${wordHtml(w)} = ${K.esc(w.ar)}</div>`;
    const reveal = (app) => app.querySelectorAll(".meaning, .wtxt").forEach((e) => (e.hidden = false));
    const t = `data-topic="${K.esc(w.full)}"`;
    if (mode === "luister")
      return { ...base, reveal, prompt: `<div class="col" ${t}><span class="emo ear">🔊</span><div class="wtxt" hidden>${wordHtml(w)}<div>${pron(w)}</div></div>${meaning}</div>`,
        say: () => speak(w, () => { const e = K.app.querySelector(".wtxt"); if (e) e.hidden = false; }) };
    if (mode === "lees") return { ...base, reveal, prompt: `<div class="col" ${t}><div class="wbig">${wordHtml(w)}</div><div>${pron(w)}</div>${meaning}</div>` };
    return { ...base, reveal, prompt: `<div class="col" ${t}><div class="qpic">${pic(w)}</div>${meaning}</div>` };
  }

  function quiz(ci, m) {
    const c = CATS[ci];
    return {
      title: `${c.name} · ${m.title}`,
      make: () => K.shuffle(c.words).slice(0, 8).map((w) => question(w, c.words, m.id)),
      done(score, s) {
        const k = `${c.id}:${m.id}`;
        save.stars[k] = Math.max(save.stars[k] || 0, s); save.save();
        earn(s - 1, `${c.name}: ${m.title}`);
        return `<div class="won" id="earned" hidden></div>`;
      },
    };
  }

  function testQuiz() {
    return {
      title: "اختبر نفسك",
      make: () => K.shuffle(ALL).slice(0, 12).map((w) => question(w, CATS.find((c) => c.id === w.cat).words, K.pick(MODES).id)),
      done(score, s) {
        save.test = Math.max(save.test || 0, s); save.save();
        earn(s, "اختبر نفسك");
        return `<div class="won" id="earned" hidden></div>`;
      },
    };
  }

  K.start(homeScreen);
})();
