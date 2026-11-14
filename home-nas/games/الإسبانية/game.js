// Aprende español — تعلّم كلمات إسبانية بالصور: استمع واختر، اقرأ واختر، ما اسمها؟، el أم la؟، اختبر نفسك.
// الصوت (اختياري): ملف لكل كلمة داخل مجلد sounds باسم الكلمة (بدون el/la وبدون ¿ ¡ ? !)، مثل sounds/perro.mp3
// وإن لم يوجد يُستعمل صوت إسباني من النظام إن توفر، وإلا تُكتب الكلمة.
(() => {
  "use strict";
  const GAME = "الإسبانية";
  const save = K.store("es", { stars: {}, known: {}, earned: {} });
  const ARTS = { el: "مذكر", la: "مؤنث" };
  const ODD = { "el agua": "كلمة مؤنثة، لكن نقول el agua لأنها تبدأ بـ a مشددة" };

  // ---------------------------------------------------------------- الكلمات
  const CATS = window.ES_CATS.map((c) => ({
    ...c,
    words: c.words.map(([de, ar, pr, key]) => {
      const m = de.match(/^(el|la) (.+)$/);
      const art = m ? m[1] : null, noun = m ? m[2] : de;
      const w = { de, ar, pr, art, noun, key, cat: c.id, odd: ODD[de] };
      if (c.id === "numeros") w.n = c.words.findIndex((x) => x[0] === de) + 1;
      return w;
    }),
  }));
  CATS.forEach((c) => c.words.forEach((w) => (w.pool = c.words)));
  const ALL = CATS.flatMap((c) => c.words);
  const NOUNS = ALL.filter((w) => w.art && !w.odd);

  const art = (w) => window.ES_ART(w);
  const iconArt = (c) => (c.icon[0] === "#" ? window.ES_ART({ n: +c.icon.slice(1) }) : window.ES_ART({ key: c.icon }));
  const deHtml = (w) => (w.art ? `<span class="a ${w.art}">${w.art}</span> ${w.noun}` : w.noun);
  const flag = `<svg class="flag" viewBox="0 0 30 20"><rect width="30" height="20" rx="2.5" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/><g transform="translate(8.5 10)"><rect x="-2.6" y="-3" width="5.2" height="6" rx="1.6" fill="#c60b1e" stroke="#a16207" stroke-width=".5"/><rect x="-3" y="-4.4" width="6" height="1.4" rx=".5" fill="#a16207"/><rect x="-4.4" y="-2.6" width="1" height="5.4" fill="#e5e7eb"/><rect x="3.4" y="-2.6" width="1" height="5.4" fill="#e5e7eb"/></g></svg>`;

  // ---------------------------------------------------------------- النطق
  const fname = (w) => w.noun.replace(/[¿?¡!.…]/g, "").trim();
  const speak = (w, onFail) => {
    const f = "sounds/" + encodeURIComponent(fname(w));
    K.play([f + ".mp3", f + ".m4a", f + ".ogg"], w.de.replace("…", "").trim(), "es", null, onFail);
  };

  // ---------------------------------------------------------------- السيرفر
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const report = (w, ok) => { try { post("/api/tv/learn/result", { game: GAME, topic: w.de, ok }).catch(() => {}); } catch {} };
  const today = () => new Date().toISOString().slice(0, 10);
  function earn(key, s, title) {
    const amount = s === 3 ? 2 : s === 2 ? 1 : 0;
    if (!amount || save.earned[key] === today()) return;
    save.earned[key] = today(); save.save();
    try {
      post("/api/tv/stars/earn", { amount, game: GAME, reason: title })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { const el = document.getElementById("earned"); if (d && d.added && el) { el.innerHTML = `<span class="emo">⭐</span> +${d.added} في رصيدك`; el.hidden = false; } })
        .catch(() => {});
    } catch {}
  }
  const knownCount = () => ALL.filter((w) => save.known[w.de]).length;

  // ---------------------------------------------------------------- الشاشات
  const MODES = [
    { id: "hoer", title: "استمع واختر", de: "Escucha", icon: "👂" },
    { id: "lies", title: "اقرأ واختر", de: "Lee", icon: "👀" },
    { id: "name", title: "ما اسمها؟", de: "¿Cómo se llama?", icon: "💬" },
  ];
  const catStars = (c) => MODES.reduce((a, m) => a + (save.stars[`${c.id}:${m.id}`] || 0), 0);

  K.onFocus = (el) => { if (el.closest(".scroll")) el.scrollIntoView({ block: "nearest", inline: "nearest" }); };

  function homeScreen() {
    K.begin();
    const cards = CATS.map((c, i) => `<button class="mode f cat" style="background:${c.bg}" ${K.act("c" + i, () => K.show(catScreen, i))}>
        <span class="ic">${iconArt(c)}</span><b>${c.name}</b><small dir="ltr">${c.es}</small><span class="st">⭐ ${catStars(c)} / 9</span></button>`).join("");
    const extra = `
      <button class="mode f cat" style="background:linear-gradient(135deg,#facc15,#f97316)" ${K.act("test", () => K.show(quizScreen, testQuiz()))}>
        <span class="big emo">🏆</span><b>اختبر نفسك</b><small dir="ltr">¡Ponte a prueba!</small><span class="st">${K.starsHtml(save.stars.test || 0)}</span></button>
      <button class="mode f cat" style="background:linear-gradient(135deg,#2563eb,#dc2626 55%,#16a34a)" ${K.act("art", () => K.show(quizScreen, artQuiz(NOUNS, "art")))}>
        <span class="big ddd"><i class="el">el</i><i class="la">la</i></span><b>مذكر أم مؤنث؟</b><small dir="ltr">el · la</small><span class="st">${K.starsHtml(save.stars.art || 0)}</span></button>`;
    K.paint(`
      <div class="title">${flag}<div><h1 dir="ltr">Aprende español</h1><div class="sub">نتعلّم الإسبانية بالصور · عرفتَ ${knownCount()} من ${ALL.length} كلمة</div></div></div>
      <div class="modes home">${cards}${extra}</div>
      ${K.HELP}`, "c0");
  }

  function catScreen(ci) {
    K.begin();
    const c = CATS[ci];
    const hasArt = c.words.some((w) => w.art && !w.odd);
    const learn = `<button class="mode f" style="background:${c.bg}" ${K.act("learn", () => K.show(cardScreen, ci, 0))}>
        <span class="big emo">📖</span><b>تعلّم</b><small dir="ltr">Aprende</small><span class="st">${c.words.length} كلمة</span></button>`;
    const cards = MODES.map((m) => `
      <button class="mode f" style="background:${c.bg}" ${K.act(m.id, () => K.show(quizScreen, quiz(ci, m)))}>
        <span class="big emo">${m.icon}</span><b>${m.title}</b><small dir="ltr">${m.de}</small><span class="st">${K.starsHtml(save.stars[`${c.id}:${m.id}`] || 0)}</span></button>`).join("");
    const artCard = hasArt ? `<button class="mode f" style="background:${c.bg}" ${K.act("artq", () => K.show(quizScreen, artQuiz(c.words.filter((w) => w.art && !w.odd), c.id + ":art", c.name)))}>
        <span class="big ddd"><i class="el">el</i><i class="la">la</i></span><b>مذكر أم مؤنث؟</b><small dir="ltr">el · la</small><span class="st">${K.starsHtml(save.stars[c.id + ":art"] || 0)}</span></button>` : "";
    const words = c.words.map((w, i) => `<button class="tile f word${save.known[w.de] ? " known" : ""}" ${K.act("w" + i, () => K.show(cardScreen, ci, i))}>${art(w)}<b dir="ltr">${deHtml(w)}</b><small>${w.ar}</small></button>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2><span class="hic">${iconArt(c)}</span> ${c.name} · <span dir="ltr">${c.es}</span></h2>
        ${hasArt ? `<span class="legend"><i class="a el">el</i> مذكر <i class="a la">la</i> مؤنث</span>` : "<span></span>"}</div>
      <div class="modes sm">${learn}${cards}${artCard}</div>
      <div class="scroll"><div class="words">${words}</div></div>`, "learn");
  }

  // بطاقة تعلّم كلمة: الرسم + الكلمة + النطق + المعنى
  function cardScreen(ci, i) {
    K.begin();
    const c = CATS[ci], w = c.words[i], n = c.words.length;
    const go = (j) => { K.top().args = [ci, (j + n) % n]; K.top().focus = K.current() && K.current().dataset.k; K.render(); };
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${c.name}</h2><span class="pill">${i + 1} / ${n}</span></div>
      <div class="card">
        <div class="cpic">${art(w)}</div>
        <div class="cinfo">
          <div class="wbig" dir="ltr">${deHtml(w)}</div>
          <div class="pr">🗣️ ${w.pr}</div>
          <div class="meaning">${w.ar}</div>
          ${w.art ? `<div class="gender ${w.odd ? "odd" : w.art}">${w.odd ? "⚠️ " + w.odd : w.art + " = " + ARTS[w.art]}</div>` : ""}
          <div class="wtxt nosound" hidden>لا يوجد صوت إسباني على هذا الجهاز</div>
        </div>
      </div>
      <div class="nav">
        <button class="btn f" ${K.act("prev", () => go(i - 1))}>→ السابق</button>
        <button class="btn f go" ${K.act("say", () => speak(w, noSound))}><span class="emo">🔊</span> استمع</button>
        <button class="btn f" ${K.act("next", () => go(i + 1))}>التالي ←</button>
      </div>
      ${K.HELP}`, "say");
    const noSound = () => { const e = K.app.querySelector(".nosound"); if (e) e.hidden = false; };
    speak(w, noSound);
  }

  // ---------------------------------------------------------------- الأسئلة
  // كل سؤال: { w, prompt, opts:[html], answer, optsCls, say? }
  function makeQ(w, mode) {
    const same = (a, b) => a.de === b.de;
    const meaning = `<div class="meaning" hidden><b dir="ltr">${deHtml(w)}</b> = ${w.ar}<div class="pr">🗣️ ${w.pr}</div></div>`;
    if (mode === "art") {
      const opts = ["el", "la"];
      return { w, answer: opts.indexOf(w.art), optsCls: "txt arts", opts: opts.map((a) => `<span class="a ${a}" dir="ltr">${a}</span>`),
        prompt: `<div class="pic">${art(w)}</div><div class="col"><div class="wbig" dir="ltr">… ${w.noun}</div><div class="q">${w.ar}</div>${meaning}</div>` };
    }
    const n = mode === "name" ? 3 : 4;
    const opts = K.options(w, w.pool, n, same);
    const base = { w, answer: opts.indexOf(w), optsCls: mode === "name" ? "txt de" : "pics",
      opts: opts.map((o) => (mode === "name" ? `<span dir="ltr">${deHtml(o)}</span>` : art(o))) };
    if (mode === "hoer")
      return { ...base, prompt: `<div class="col"><span class="emo ear">🔊</span><div class="wtxt" dir="ltr" hidden>${deHtml(w)}</div>${meaning}</div>`,
        say: () => speak(w, () => { const e = K.app.querySelector(".wtxt"); if (e) e.hidden = false; }) };
    if (mode === "lies") return { ...base, prompt: `<div class="col"><div class="wbig" dir="ltr">${deHtml(w)}</div>${meaning}</div>` };
    return { ...base, prompt: `<div class="pic">${art(w)}</div><div class="col">${meaning}</div>` };
  }

  function quiz(ci, m) {
    const c = CATS[ci];
    return { title: `${c.name} · ${m.title}`, key: `${c.id}:${m.id}`, make: () => K.shuffle(c.words).slice(0, 8).map((w) => makeQ(w, m.id)) };
  }
  function artQuiz(words, key, name) {
    return { title: (name ? name + " · " : "") + "el · la", key, make: () => K.shuffle(words).slice(0, 10).map((w) => makeQ(w, "art")) };
  }
  function testQuiz() {
    return { title: "اختبر نفسك", key: "test", make: () => K.shuffle(ALL).slice(0, 12).map((w) => makeQ(w, K.pick(w.art && !w.odd ? ["hoer", "lies", "name", "art"] : ["hoer", "lies", "name"]))) };
  }

  const GOOD = ["¡Muy bien! 👏", "¡Genial! 🌟", "¡Bravo! 🎉", "¡Excelente! 🏆", "¡Correcto! ✅", "¡Súper! 💪"];
  function quizScreen(o) {
    const qs = o.make();
    let q = 0, score = 0;
    const results = [];
    ask();
    function ask() {
      K.begin();
      const Q = qs[q];
      let wrong = false, locked = false, first = true;
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "") : k === q ? "now" : ""}"></i>`).join("");
      const choose = (j, el) => {
        if (locked || el.dataset.dead) return;
        const ok = j === Q.answer;
        if (first) { first = false; report(Q.w, ok); if (ok) { save.known[Q.w.de] = (save.known[Q.w.de] || 0) + 1; save.save(); } }
        const cheer = K.app.querySelector(".cheer");
        if (ok) {
          locked = true;
          el.classList.add("ok");
          if (!wrong) score++;
          results[q] = !wrong;
          K.sfx.ok(); K.confetti(10);
          cheer.textContent = K.pick(GOOD);
          K.app.querySelectorAll(".meaning, .wtxt").forEach((e) => (e.hidden = false));
          K.later(() => speak(Q.w), 350);
          K.later(() => { q++; if (q < qs.length) { K.top().focus = null; ask(); } else finish(); }, 2300);
        } else {
          wrong = true;
          el.classList.add("bad"); el.dataset.dead = "1";
          K.sfx.bad();
          cheer.textContent = "حاول مرة أخرى 💪";
        }
      };
      K.paint(`
        <div class="top">${K.backBtn()}<div class="dots">${dots}</div>
          <button class="btn f" ${K.act("say", () => (Q.say ? Q.say() : speak(Q.w)))}><span class="emo">🔊</span></button>
          <span class="pill">${q + 1} / ${qs.length}</span></div>
        <div class="prompt">${Q.prompt}</div>
        <div class="opts ${Q.optsCls}">${Q.opts.map((h, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(j, el))}>${h}</button>`).join("")}</div>
        <div class="cheer" dir="ltr"></div>
        ${K.HELP}`, "o0");
      if (Q.say) Q.say();
    }
    function finish() {
      const s = K.starsFor(score, qs.length);
      save.stars[o.key] = Math.max(save.stars[o.key] || 0, s); save.save();
      K.replace(K.resultScreen, { s, score, total: qs.length, title: o.title, extra: `<div class="won" id="earned" hidden></div>`, again: () => K.replace(quizScreen, o) });
      earn(o.key, s, o.title);
    }
  }

  K.start(homeScreen);
})();
