// قصص الأنبياء — قصص قصيرة كما وردت في القرآن الكريم، مع آية وعبرة وأسئلة.
// «اقرأ لي» (اختياري): ضع ملفات صوت في مجلد audio، انظر audio/اقرأني.txt
(() => {
  "use strict";
  const GAME = "قصص الأنبياء";
  const ST = window.STORIES;
  const save = K.store("anbiya", { read: {}, best: {}, earned: {}, voice: true });
  const AUD = new Set(); // ملفات الصوت الموجودة في مجلد audio
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const today = () => new Date().toISOString().slice(0, 10);
  const nPages = (s) => s.pages.length + 2; // الصفحات + الآية + العبرة
  const audioFor = (si, pi) => ["mp3", "m4a", "ogg"].map((x) => `${si + 1}-${pi + 1}.${x}`).filter((f) => AUD.has(f)).map((f) => "audio/" + encodeURIComponent(f));
  const hasAudio = (si) => K.range(0, nPages(ST[si])).some((pi) => audioFor(si, pi).length);

  async function loadAudio() {
    const g = K.gameInfo();
    if (!g) return;
    try {
      const r = await fetch(`/api/tv/tile/${g.tid}/list?sub=${encodeURIComponent(g.sub ? g.sub + "/audio" : "audio")}`, { credentials: "same-origin" });
      if (!r.ok) return;
      ((await r.json()).items || []).forEach((x) => { if (/\.(mp3|m4a|ogg)$/i.test(x.name)) AUD.add(x.name); });
    } catch {}
  }

  // ---------------------------------------------------------------- القائمة
  function homeScreen() {
    K.begin();
    const cards = ST.map((s, i) => `
      <button class="card f" style="--c:${s.c}" ${K.act("s" + i, () => K.show(storyMenu, i))}>
        ${SCENE(s.icon, "low")}<b>${s.t}</b>
        ${save.best[i] ? `<small class="st">${K.starsHtml(save.best[i])}</small>` : save.read[i] ? `<small>✓ قرأتها</small>` : ""}</button>`).join("");
    K.paint(`
      <div class="title"><span class="mascot emo">📖</span><div><h1>قصص الأنبياء</h1><div class="sub">عليهم الصلاة والسلام · اختر قصة</div></div></div>
      <div class="cards">${cards}</div>
      ${AUD.size ? `<div class="mini"><button class="btn f" ${K.act("voice", () => { save.voice = !save.voice; save.save(); K.render(); })}>
        ${save.voice ? "🔊 اقرأ لي: نعم" : "🔇 اقرأ لي: لا"}</button></div>` : ""}
      ${K.HELP}`, "s0");
  }

  function storyMenu(si) {
    K.begin();
    const s = ST[si];
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${s.t}</h2><span class="pill">${si + 1} / ${ST.length}</span></div>
      <div class="hero" style="--c:${s.c}">${SCENE(s.icon)}</div>
      <div class="nav">
        <button class="btn f go" ${K.act("read", () => K.replace(pageScreen, si, 0))}><span class="emo">📖</span> اقرأ القصة</button>
        <button class="btn f" ${K.act("quiz", () => K.replace(quizScreen, si))}><span class="emo">❓</span> الأسئلة</button>
        ${save.best[si] ? `<span class="pill st">${K.starsHtml(save.best[si])}</span>` : ""}
      </div>
      ${K.HELP}`, "read");
  }

  // ---------------------------------------------------------------- القصة
  function pageScreen(si, pi) {
    K.begin();
    const s = ST[si], N = nPages(s), files = audioFor(si, pi), last = pi === N - 1;
    const go = (d) => {
      const j = pi + d;
      if (j < 0) return;
      if (j >= N) { save.read[si] = 1; save.save(); return K.replace(quizScreen, si); }
      K.top().args = [si, j]; K.top().focus = d > 0 ? "next" : "prev"; K.render();
    };
    let body;
    if (pi < s.pages.length) {
      const [txt, scn] = s.pages[pi];
      body = `<div class="page" style="--c:${s.c}">${SCENE(scn)}<p>${txt}</p></div>`;
    } else if (pi === s.pages.length) {
      body = `<div class="page aya" style="--c:${s.c}">${SCENE(s.icon, "dim")}
        <div class="ayabox"><div class="lbl">قال الله تعالى:</div><div class="q">﴿${s.aya[0]}﴾</div><div class="ref">${s.aya[1]}</div></div></div>`;
    } else {
      body = `<div class="page ibra" style="--c:${s.c}">${SCENE(s.icon, "dim")}
        <div class="ayabox"><div class="lbl"><span class="emo">💡</span> العبرة</div><p>${s.ibra}</p></div></div>`;
    }
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${s.t}</h2><span class="pill">${pi + 1} / ${N}</span></div>
      ${body}
      <div class="nav">
        <button class="btn f" ${K.act("prev", () => go(-1))}>→ السابقة</button>
        ${files.length ? `<button class="btn f" ${K.act("say", () => K.play(files))}><span class="emo">🔊</span> اقرأ لي</button>` : ""}
        <button class="btn f go" ${K.act("next", () => go(1))}>${last ? "الأسئلة ❓" : "التالية ←"}</button>
      </div>`, "next");
    if (files.length && save.voice) K.later(() => K.play(files, null, "ar", () => { if (!last) K.later(() => go(1), 1500); }), 600);
  }

  // ---------------------------------------------------------------- الأسئلة (كل إجابة تُرسل لتقرير الأهل)
  const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "بارك الله فيك! 🤲", "شاطر! 💪", "صحيح! ✅"];
  function quizScreen(si) {
    const s = ST[si];
    const qs = K.shuffle(s.qs).map(([q, ...o]) => { const opts = K.shuffle(o); return { q, opts, answer: opts.indexOf(o[0]) }; });
    let q = 0, score = 0;
    const res = [];
    ask();
    function ask() {
      K.begin();
      const Q = qs[q];
      let tried = false, locked = false;
      const dots = qs.map((_, k) => `<i class="${k < q ? (res[k] ? "ok" : "") : k === q ? "now" : ""}"></i>`).join("");
      const choose = (j, el) => {
        if (locked || el.dataset.dead) return;
        const ok = j === Q.answer, cheer = K.app.querySelector(".cheer");
        if (!tried) { tried = true; post("/api/tv/learn/result", { game: GAME, topic: (s.n + ": " + Q.q).slice(0, 80), ok }); }
        if (ok) {
          locked = true; el.classList.add("ok");
          res[q] = !K.app.querySelector(".opt.bad"); if (res[q]) score++;
          K.sfx.ok(); K.confetti(10); cheer.textContent = K.pick(GOOD);
          K.later(() => { q++; if (q < qs.length) { K.top().focus = null; ask(); } else finish(); }, 1600);
        } else {
          el.classList.add("bad"); el.dataset.dead = "1";
          K.sfx.bad(); cheer.textContent = "حاول مرة أخرى 💪";
        }
      };
      K.paint(`
        <div class="top">${K.backBtn()}<div class="dots">${dots}</div><span class="pill">${q + 1} / ${qs.length}</span></div>
        <div class="prompt"><div class="pic">${SCENE(s.icon)}</div><div class="q">${Q.q}</div></div>
        <div class="opts ans">${Q.opts.map((h, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(j, el))}>${h}</button>`).join("")}</div>
        <div class="cheer"></div>
        ${K.HELP}`, "o0");
    }
    function finish() {
      const st = K.starsFor(score, qs.length);
      if (st > (save.best[si] || 0)) save.best[si] = st;
      save.read[si] = 1; save.save();
      const once = save.earned[si] !== today() && score >= 3;
      K.replace(K.resultScreen, { s: st, score, total: qs.length, title: s.t,
        extra: `<div class="won" id="won" style="display:none"><span class="emo">⭐</span><b></b></div>`,
        again: () => K.replace(quizScreen, si),
        next: si < ST.length - 1 ? { label: "القصة التالية", fn: () => K.replace(storyMenu, si + 1) } : null });
      if (once) {
        save.earned[si] = today(); save.save();
        post("/api/tv/stars/earn", { amount: st, game: GAME, reason: "أسئلة " + s.t }).then((d) => {
          const w = document.getElementById("won");
          if (d && d.added && w) { w.style.display = ""; w.querySelector("b").textContent = `+${d.added}`; }
        });
      }
    }
  }

  loadAudio().finally(() => K.start(homeScreen));
})();
