// Dinle ve seç — تعلّم كلمات تركية بالصور
// الصوت (اختياري): ملف mp3 لكل كلمة داخل مجلد sounds باسم الكلمة التركية، مثل: sounds/kedi.mp3 و sounds/on bir.mp3
// وإن لم يوجد يُستعمل صوت تركي من النظام إن توفر، وإلا تُكتب الكلمة.
(() => {
  "use strict";
  const GAME = "التركية";
  // الحروف التركية: i ↔ İ و ı ↔ I (لا نعتمد على دعم المتصفح للغة tr)
  const up = (s) => { try { const u = s.toLocaleUpperCase("tr"); if (u.includes("İ") || !s.includes("i")) return u; } catch {} return s.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase(); };
  const low = (s) => s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();

  const CATS = window.TR_CATS.map((c) => ({ ...c, words: c.words.map(([tr, ar, pr, g, color], i) => ({ tr, ar, pr, g, color, key: low(tr), n: c.id === "sayilar" ? i + 1 : 0, cat: c.id })) }));
  const ALL = CATS.flatMap((c) => c.words);
  const ART = window.TR_ART || {};
  const same = (a, b) => a.tr === b.tr || (!!a.g && a.g === b.g);

  // ---------------------------------------------------------------- الحفظ لكل طفل
  const save = K.store("tr", { kids: {} });
  let me = "guest";
  const prog = () => (save.kids[me] = save.kids[me] || { stars: {}, best: 0, learned: {} });
  fetch("/api/tv/stars", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (d && d.me != null) { me = "u" + d.me; if (K.top() && K.top().fn === homeScreen) K.render(); }
  }).catch(() => {});

  const post = (url, body) => { try { return fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => (r.ok ? r.json() : null)).catch(() => null); } catch { return Promise.resolve(null); } };
  const learn = (w, ok) => { post("/api/tv/learn/result", { game: GAME, topic: w.tr, ok }); if (ok) { prog().learned[w.tr] = 1; save.save(); } };
  const earn = (amount, reason) => {
    if (amount < 1) return;
    post("/api/tv/stars/earn", { amount, game: GAME, reason }).then((d) => {
      const el = document.getElementById("earned");
      if (d && d.added && el) { el.textContent = `+${d.added} ⭐ في رصيدك`; el.hidden = false; K.sfx.pop(); }
    });
  };

  // ---------------------------------------------------------------- الرسم والنطق
  const digits = (n) => `<span class="digit">${n}</span>`;
  const dotsFor = (n) => `<span class="cnt">${"●".repeat(Math.min(n, 10))}${n > 10 ? "<br>" + "●".repeat(n - 10) : ""}</span>`;
  const pic = (w, big) => {
    if (w.color) return `<span class="dot${big ? " big" : ""}" style="background:${w.color}"></span>`;
    if (w.n) return `<span class="num">${digits(w.n)}${big ? dotsFor(w.n) : ""}</span>`;
    return ART[w.key] || `<b dir="ltr">${w.tr}</b>`;
  };
  const iconOf = (c) => (c.icon.startsWith("c:") ? `<span class="dot" style="background:${c.icon.slice(2)}"></span>` : c.icon.startsWith("n:") ? digits(c.icon.slice(2)) : ART[c.icon]);
  const fname = (w) => w.key.replace(/[?…!.,]/g, "").trim();
  const files = (w) => ["mp3", "m4a", "ogg"].map((x) => "sounds/" + encodeURIComponent(fname(w)) + "." + x);
  const speak = (w, onFail) => K.play(files(w), w.tr.replace("…", ""), "tr", null, onFail);
  const wordHtml = (w, cls = "wtxt") => `<div class="${cls}" dir="ltr">${w.tr}</div><div class="pr">${w.pr}</div>`;

  // ---------------------------------------------------------------- الشاشات
  const MODES = [
    { id: "dinle", title: "استمع واختر", tr: "Dinle", icon: "👂" },
    { id: "oku", title: "اقرأ واختر", tr: "Oku", icon: "👀" },
    { id: "ad", title: "ما اسمها؟", tr: "Bu ne?", icon: "💬" },
  ];
  const catStars = (c) => MODES.reduce((a, m) => a + (prog().stars[`${c.id}:${m.id}`] || 0), 0);

  function homeScreen() {
    K.begin();
    const P = prog();
    const cards = CATS.map((c, i) => `<button class="mode f" style="background:${c.bg}" ${K.act("c" + i, () => K.show(catScreen, i))}>
        <span class="ico">${iconOf(c)}</span><b>${c.name}</b><small dir="ltr">${c.tr}</small><span class="st">⭐ ${catStars(c)} / 9</span></button>`).join("");
    const learned = Object.keys(P.learned).length;
    K.paint(`
      <div class="title"><span class="flag">${flag()}</span><div><h1 dir="ltr">Dinle ve seç</h1><div class="sub">نتعلّم التركية بالصور · تعلّمت ${learned} من ${ALL.length} كلمة</div></div></div>
      <div class="modes sm4">${cards}
        <button class="mode f test" ${K.act("test", () => K.show(K.quizScreen, testQuiz()))}><span class="big emo">🏆</span><b>اختبر نفسك</b><small dir="ltr">Kendini dene</small><span class="st">أفضل: ${P.best} / 12</span></button>
      </div>
      <div class="help">پ = p · ڤ = v · گ = g &nbsp;|&nbsp; <b>الأسهم</b> للتنقل · <b>Enter</b> أو <b>✕</b> للاختيار · <b>Backspace</b> أو <b>○</b> للرجوع</div>`, "c0");
  }
  const flag = () => `<svg viewBox="0 0 60 40" class="art"><rect width="60" height="40" rx="4" fill="#e30a17"/><circle cx="23" cy="20" r="10" fill="#fff"/><circle cx="25.5" cy="20" r="8" fill="#e30a17"/><path d="M36 20 L45.5 16.9 L39.6 25 L39.6 15 L45.5 23.1Z" fill="#fff"/></svg>`;

  function catScreen(ci) {
    K.begin();
    const c = CATS[ci];
    const cards = MODES.map((m) => `
      <button class="mode f" style="background:${c.bg}" ${K.act(m.id, () => K.show(K.quizScreen, quiz(ci, m)))}>
        <span class="big emo">${m.icon}</span><b>${m.title}</b><small dir="ltr">${m.tr}</small><span class="st">${K.starsHtml(prog().stars[`${c.id}:${m.id}`] || 0)}</span></button>`).join("");
    const words = c.words.map((w, i) => `<button class="tile f word${prog().learned[w.tr] ? " got" : ""}" ${K.act("w" + i, () => K.show(wordScreen, ci, i))}>${pic(w)}<b dir="ltr">${w.tr}</b><i class="tp">${w.pr}</i><small>${w.ar}</small></button>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2><span class="ico sm">${iconOf(c)}</span> ${c.name} · <span dir="ltr">${c.tr}</span></h2><span></span></div>
      <div class="modes three">${cards}</div>
      <div class="words">${words}</div>`, "dinle");
  }

  // بطاقة الكلمة: الرسم، الكلمة، بالحروف الكبيرة، النطق والمعنى
  function wordScreen(ci, wi) {
    K.begin();
    const c = CATS[ci], w = c.words[wi], n = c.words.length;
    const go = (d) => K.replace(wordScreen, ci, (wi + d + n) % n);
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${c.name} · <bdi dir="ltr">${wi + 1} / ${n}</bdi></h2><span></span></div>
      <div class="card">
        <button class="btn f nav" ${K.act("prev", () => go(-1))}>→</button>
        <div class="pic big">${pic(w, true)}</div>
        <div class="col">${wordHtml(w, "wbig")}<div class="caps" dir="ltr">${up(w.tr)}</div><div class="meaning">${w.ar}</div>
          <button class="btn f" ${K.act("say", () => speak(w, () => {}))}><span class="emo">🔊</span> استمع</button></div>
        <button class="btn f nav" ${K.act("next", () => go(1))}>←</button>
      </div>
      ${K.HELP}`, "say");
    speak(w, () => {});
  }

  function question(w, mode, pool) {
    const nOpts = mode === "ad" ? 3 : 4;
    const opts = K.options(w, pool.length >= nOpts ? pool : ALL, nOpts, same);
    const base = {
      opts: opts.map((o) => (mode === "ad" ? `<span dir="ltr">${o.tr}</span>` : pic(o))),
      optsCls: mode === "ad" ? "txt tr" : "pics",
      answer: opts.indexOf(w), sayOk: () => speak(w),
    };
    const meaning = `<div class="meaning" hidden><b dir="ltr">${w.tr}</b> <span class="pr">(${w.pr})</span> = ${w.ar}</div>`;
    const reveal = (app) => { app.querySelectorAll(".meaning, .wtxt, .pr").forEach((e) => (e.hidden = false)); learn(w, !app.querySelector(".opt.bad")); };
    if (mode === "dinle")
      return { ...base, reveal, prompt: `<div class="col"><span class="emo ear">🔊</span><div class="wtxt" dir="ltr" hidden>${w.tr}</div><div class="pr" hidden>${w.pr}</div>${meaning}</div>`,
        say: () => speak(w, () => { K.app.querySelectorAll(".prompt .wtxt, .prompt > .col > .pr").forEach((e) => (e.hidden = false)); }) };
    if (mode === "oku") return { ...base, reveal, prompt: `<div class="col">${wordHtml(w, "wbig")}${meaning}</div>` };
    return { ...base, reveal, prompt: `<div class="col"><div class="pic">${pic(w, true)}</div>${meaning}</div>` };
  }

  function quiz(ci, m) {
    const c = CATS[ci];
    return {
      title: `${c.name} · ${m.title}`,
      make: () => K.shuffle(c.words).slice(0, 8).map((w) => question(w, m.id, c.words)),
      done(score, s) {
        const k = `${c.id}:${m.id}`, P = prog();
        P.stars[k] = Math.max(P.stars[k] || 0, s); save.save();
        earn(s === 3 ? 2 : s === 2 ? 1 : 0, `${c.name} · ${m.title}`);
        return `<div class="earned" id="earned" hidden></div>`;
      },
    };
  }

  function testQuiz() {
    return {
      title: "اختبر نفسك",
      make: () => K.shuffle(ALL).slice(0, 12).map((w, i) => question(w, MODES[i % 3].id, CATS.find((c) => c.id === w.cat).words)),
      done(score, s) {
        const P = prog();
        P.best = Math.max(P.best || 0, score); save.save();
        earn(s === 3 ? 3 : s === 2 ? 2 : 1, `اختبر نفسك: ${score} من 12`);
        return `<div class="earned" id="earned" hidden></div>`;
      },
    };
  }

  K.onFocus = (el) => { if (el.closest(".words")) try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch {} };
  K.start(homeScreen);
})();
