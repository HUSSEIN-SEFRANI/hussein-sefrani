// Lyssna och välj — تعلّم كلمات سويدية بالصور (على نمط «الفرنسية»)
// الصوت (اختياري): ملف mp3 لكل كلمة داخل مجلد sounds باسم الكلمة السويدية، مثل: sounds/katt.mp3
// وإن لم يوجد يُستعمل صوت سويدي من النظام إن توفر، وإلا تُكتب الكلمة.
(() => {
  "use strict";
  const GAME = "السويدية";
  const save = K.store("sv", { stars: {}, known: {}, test: 0 });
  const CATS = window.CATS.map((c) => ({ ...c, words: c.words.map(([w, a, ar, pr, art]) => ({ w, a, ar, pr, art, cid: c.id })) }));
  const ALL = CATS.flatMap((c) => c.words);
  const MODES = [
    { id: "lyssna", title: "استمع واختر", sv: "Lyssna", icon: "🔊" },
    { id: "las", title: "اقرأ واختر", sv: "Läs", icon: "👀" },
    { id: "namn", title: "ما اسمها؟", sv: "Vad heter den?", icon: "💬" },
    { id: "enett", title: '<span dir="ltr">en / ett</span> ؟', sv: "En eller ett?", icon: "🤔" },
  ];
  const modesOf = (c) => MODES.filter((m) => m.id !== "enett" || c.words.some((w) => w.a));
  const full = (w) => (w.a ? w.a + " " : "") + w.w;
  const svHtml = (w) => `<span dir="ltr" class="sv">${w.a ? `<i class="${w.a}">${w.a}</i> ` : ""}${K.esc(w.w)}</span>`;
  const pic = (w) => ART(w.art);
  const fname = (w) => w.w.toLowerCase().replace(/[!?.,…]/g, "").trim();
  const speak = (w, onFail) => K.play(["sounds/" + encodeURIComponent(fname(w)) + ".mp3", "sounds/" + encodeURIComponent(fname(w)) + ".m4a"], full(w), "sv", null, onFail);
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const learn = (w, ok) => { try { post("/api/tv/learn/result", { game: GAME, topic: full(w).slice(0, 80), ok }); } catch {} };
  const known = (c) => c.words.filter((w) => save.known[c.id + ":" + w.w]).length;
  const catStars = (c) => modesOf(c).reduce((a, m) => a + (save.stars[`${c.id}:${m.id}`] || 0), 0);

  // ---------------------------------------------------------------- الشاشة الرئيسية
  function homeScreen() {
    K.begin();
    const cards = CATS.map((c, i) => `<button class="mode f" style="background:${c.bg}" ${K.act("c" + i, () => K.show(catScreen, i))}>
        <span class="ico">${ART(c.icon)}</span><b>${c.name}</b><small dir="ltr">${c.sv}</small>
        <span class="st">⭐ ${catStars(c)}/${modesOf(c).length * 3} · 📖 ${known(c)}/${c.words.length}</span></button>`).join("") +
      `<button class="mode f test" ${K.act("test", () => K.show(quizScreen, testQuiz()))}>
        <span class="big emo">🏆</span><b>اختبر نفسك</b><small dir="ltr">Testa dig själv!</small><span class="st">${K.starsHtml(save.test || 0)}</span></button>`;
    const total = CATS.reduce((a, c) => a + known(c), 0);
    K.paint(`
      <div class="title"><span class="flag">${FLAG}</span><div><h1 dir="ltr">Lyssna och välj</h1><div class="sub">نتعلّم السويدية بالصور · تعلّمت ${total} من ${ALL.length} كلمة</div></div></div>
      <div class="modes sm3">${cards}</div>
      ${K.HELP}`, "c0");
  }
  const FLAG = `<svg viewBox="0 0 16 10" class="flagsvg"><rect width="16" height="10" rx="1" fill="#006aa7"/><rect x="5" width="2" height="10" fill="#fecc00"/><rect y="4" width="16" height="2" fill="#fecc00"/></svg>`;

  // ---------------------------------------------------------------- الفئة
  function catScreen(ci) {
    K.begin();
    const c = CATS[ci];
    const cards = modesOf(c).map((m) => `
      <button class="mode f" style="background:${c.bg}" ${K.act(m.id, () => K.show(quizScreen, catQuiz(ci, m)))}>
        <span class="big emo">${m.icon}</span><b>${m.title}</b><small dir="ltr">${m.sv}</small><span class="st">${K.starsHtml(save.stars[`${c.id}:${m.id}`] || 0)}</span></button>`).join("");
    const words = c.words.map((w, i) => `<button class="tile f word${save.known[c.id + ":" + w.w] ? " known" : ""}" ${K.act("w" + i, () => K.show(wordScreen, ci, i))}>
        ${pic(w)}${svHtml(w)}<small class="pr">${w.pr}</small><small>${w.ar}</small></button>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2><span class="hico">${ART(c.icon)}</span> ${c.name} · <span dir="ltr">${c.sv}</span></h2><span class="pill">📖 ${known(c)}/${c.words.length}</span></div>
      <div class="modes sm">${cards}</div>
      <div class="words">${words}</div>`, modesOf(c)[0].id);
  }
  // يبقي العنصر المختار ظاهراً داخل قائمة الكلمات
  let kbd = false;
  document.addEventListener("keydown", () => (kbd = true), true);
  document.addEventListener("pointermove", () => (kbd = false), true);
  K.onFocus = (el) => { if (kbd && el.closest(".words")) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); };

  // ---------------------------------------------------------------- بطاقة الكلمة
  function wordScreen(ci, i) {
    K.begin();
    const c = CATS[ci], w = c.words[i], n = c.words.length;
    const go = (d) => { K.top().args = [ci, (i + d + n) % n]; K.top().focus = d > 0 ? "next" : "prev"; K.render(); };
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${c.name}</h2><span class="pill">${i + 1} / ${n}</span></div>
      <div class="card">
        <button class="btn f navb" ${K.act("prev", () => go(-1))}>→</button>
        <div class="cbig">${pic(w)}</div>
        <div class="cinfo">${svHtml(w)}<div class="pr big">${w.pr}</div><div class="meaning">${w.ar}</div>
          ${w.a ? `<div class="gen">كلمة <b class="${w.a}" dir="ltr">${w.a}</b></div>` : ""}
          <button class="btn f go" ${K.act("say", () => speak(w, () => {}))}><span class="emo">🔊</span> استمع</button></div>
        <button class="btn f navb" ${K.act("next", () => go(1))}>←</button>
      </div>
      ${K.HELP}`, "say");
    speak(w, () => {});
  }

  // ---------------------------------------------------------------- الأسئلة
  function makeQ(w, pool, mode) {
    const opts = K.options(w, pool, mode === "namn" ? 3 : 4, (a, b) => a.w === b.w || a.art === b.art);
    const meaning = `<div class="reveal" hidden>${svHtml(w)} <span class="pr">${w.pr}</span> = <b class="meaning">${w.ar}</b></div>`;
    const reveal = (app) => app.querySelectorAll(".reveal, .wtxt").forEach((e) => (e.hidden = false));
    const base = { w, reveal, sayOk: () => speak(w, () => {}), answer: opts.indexOf(w), opts: opts.map((o) => (mode === "namn" ? `<span class="tx">${svHtml(o)}<small class="pr">${o.pr}</small></span>` : pic(o))) };
    if (mode === "lyssna")
      return { ...base, prompt: `<div class="col"><span class="emo ear">🔊</span><div class="wtxt" hidden>${svHtml(w)}<div class="pr">${w.pr}</div></div>${meaning}</div>`,
        say: () => speak(w, () => { const e = K.app.querySelector(".wtxt"); if (e) e.hidden = false; }) };
    if (mode === "las") return { ...base, prompt: `<div class="col"><div class="wbig">${svHtml(w)}</div><div class="pr big">${w.pr}</div>${meaning}</div>` };
    if (mode === "enett") {
      const o2 = ["en", "ett"];
      return { ...base, optsCls: "txt gen2", opts: o2.map((a) => `<b class="${a}" dir="ltr">${a}</b>`), answer: o2.indexOf(w.a),
        prompt: `<div class="pic sm">${pic(w)}</div><div class="col"><div class="wbig" dir="ltr"><span class="blank">___</span> ${K.esc(w.w)}</div><div class="meaning">${w.ar}</div>${meaning}</div>` };
    }
    return { ...base, optsCls: "txt", prompt: `<div class="col"><div class="pic">${pic(w)}</div>${meaning}</div>` };
  }
  function catQuiz(ci, m) {
    const c = CATS[ci];
    const pool = m.id === "enett" ? c.words.filter((w) => w.a) : c.words;
    return { title: `${c.name} · ${m.title}`, optsCls: "pics", stars: 1,
      make() {
        let ws = K.shuffle(pool).slice(0, 8);
        if (m.id === "enett") { // توازن بين en و ett
          const ett = K.shuffle(pool.filter((w) => w.a === "ett")).slice(0, 4);
          ws = K.shuffle(ett.concat(K.shuffle(pool.filter((w) => w.a === "en")).slice(0, 8 - ett.length)));
        }
        return ws.map((w) => makeQ(w, c.words, m.id));
      },
      done(s) { const k = `${c.id}:${m.id}`; save.stars[k] = Math.max(save.stars[k] || 0, s); save.save(); } };
  }
  function testQuiz() {
    const voice = !!K.voice("sv");
    return { title: "اختبر نفسك", optsCls: "pics", stars: 2,
      make: () => K.shuffle(ALL).slice(0, 12).map((w) => {
        const c = CATS.find((x) => x.id === w.cid);
        const ms = ["las", "namn"].concat(voice ? ["lyssna"] : [], w.a ? ["enett"] : []);
        return makeQ(w, c.words, K.pick(ms));
      }),
      done(s) { save.test = Math.max(save.test || 0, s); save.save(); } };
  }

  const GOOD = ["Bra! 👏", "Jättebra! 🌟", "Toppen! 🎉", "Super! 🏆", "Snyggt! 💪", "Rätt! ✅"];
  function quizScreen(o) {
    const qs = o.make();
    let q = 0, score = 0;
    const results = [];
    ask();
    function ask() {
      K.begin();
      const Q = qs[q];
      let wrong = false, locked = false;
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "") : k === q ? "now" : ""}"></i>`).join("");
      const choose = (j, el) => {
        if (locked || el.dataset.dead) return;
        const cheer = K.app.querySelector(".cheer");
        if (j === Q.answer) {
          locked = true;
          el.classList.add("ok");
          if (!wrong) { score++; save.known[Q.w.cid + ":" + Q.w.w] = 1; save.save(); }
          results[q] = !wrong;
          if (!wrong) learn(Q.w, true);
          K.sfx.ok(); K.confetti(10);
          cheer.textContent = K.pick(GOOD);
          Q.reveal(K.app);
          Q.sayOk();
          K.later(() => { q++; if (q < qs.length) { K.top().focus = null; ask(); } else finish(); }, 2200);
        } else {
          if (!wrong) learn(Q.w, false);
          wrong = true;
          el.classList.add("bad"); el.dataset.dead = "1";
          K.sfx.bad();
          cheer.textContent = "Försök igen! حاول مرة أخرى 💪";
        }
      };
      K.paint(`
        <div class="top">${K.backBtn()}<div class="dots">${dots}</div>
          ${Q.say ? `<button class="btn f" ${K.act("say", () => Q.say())}><span class="emo">🔊</span></button>` : ""}
          <span class="pill">${q + 1} / ${qs.length}</span></div>
        <div class="prompt">${Q.prompt}</div>
        <div class="opts ${Q.optsCls || o.optsCls || ""}">${Q.opts.map((h, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(j, el))}>${h}</button>`).join("")}</div>
        <div class="cheer"></div>
        ${K.HELP}`, "o0");
      if (Q.say) Q.say();
    }
    function finish() {
      const s = K.starsFor(score, qs.length);
      o.done(s);
      K.replace(K.resultScreen, { s, score, total: qs.length, extra: `<div class="earned"></div>`, again: () => K.replace(quizScreen, o), title: o.title });
      // نجوم باعتدال: فقط عند نتيجة جيدة
      if (s >= 2) post("/api/tv/stars/earn", { amount: Math.min(4, s + o.stars - 1), game: GAME, reason: o.title.replace(/<[^>]+>/g, "") }).then((d) => {
        const el = K.app.querySelector(".earned");
        if (d && d.added && el) el.innerHTML = `<span dir="ltr">+${d.added} ⭐</span> أضيفت إلى رصيدك`;
      });
    }
  }

  K.start(homeScreen);
})();
