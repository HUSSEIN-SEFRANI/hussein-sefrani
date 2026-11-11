// RAHAF 67 — قصة مضحكة نصنعها معاً: نبدأ بجملة، ويختار الطفل من 4 خيارات مضحكة، حتى تكتمل قصة قصيرة.
// القطع والخيارات في stories.js. القصص المكتملة تُحفظ في «قصصي» (آخر 30 قصة لكل طفل).
(() => {
  "use strict";
  const HEROES = window.HEROES, STEPS = window.STEPS;
  const save = K.store("rahaf67", { stories: [] });
  const TOTAL = STEPS.length + 1; // اختيار البطل + خطوات القصة
  const pick = (v, g) => (Array.isArray(v) ? v[g === "f" ? 1 : 0] : v || "");
  const fmtDay = (ts) => { try { return new Date(ts).toLocaleDateString("ar-SY-u-nu-latn", { day: "numeric", month: "long" }); } catch { return ""; } };

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    const n = save.stories.length;
    K.paint(`<div class="title"><span class="mascot emo">🤪</span><div><h1 class="logo" dir="ltr">RAHAF 67</h1><div class="sub">لنصنع قصة مضحكة معاً!</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#f472b6,#a855f7)" ${K.act("new", () => K.show(play))}><span class="big emo">✨</span><b>قصة جديدة</b><small>اختر وأضحك</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#38bdf8,#6366f1)" ${K.act("mine", () => K.show(shelf))}><span class="big emo">📚</span><b>قصصي</b><small>${n ? `${n} قصة` : "لا توجد قصص بعد"}</small></button>
      </div>${K.HELP}`, "new");
  }

  // ---------------------------------------------------------------- صنع القصة
  function play() {
    // لكل خطوة بداية جملة عشوائية من ps، فيتغيّر السرد في كل قصة
    const S = { hero: null, parts: [], step: 0, ps: STEPS.map((st) => (st.ps ? K.shuffle(st.ps)[0] : st.p)) };
    ask();

    function options() {
      if (S.step === 0) {
        const rahaf = HEROES.filter((h) => h.always), others = K.shuffle(HEROES.filter((h) => !h.always)).slice(0, 4 - rahaf.length);
        return K.shuffle([...rahaf, ...others]).map((h) => ({ text: h.t, e: h.e, hero: h }));
      }
      return K.shuffle(STEPS[S.step - 1].o).slice(0, 4).map((o) => ({ text: pick(o.t, S.hero.g), e: o.e, six7: o.six7 }));
    }
    function storyHtml(pending) {
      const done = S.parts.map((p, i) => `<span class="${i === S.parts.length - 1 ? "new" : ""}">${K.esc(p)}</span>`).join("");
      return `${done}${pending}`;
    }
    function ask() {
      K.begin();
      const opts = options();
      const prefix = S.step === 0 ? "كان يا ما كان، كان هناك " : " " + pick(S.ps[S.step - 1], S.hero.g);
      const dots = Array.from({ length: TOTAL }, (_, k) => `<i class="${k < S.step ? "ok" : k === S.step ? "now" : ""}"></i>`).join("");
      K.paint(`<div class="top">${K.backBtn()}<div class="dots">${dots}</div><span class="pill" dir="ltr">RAHAF 67</span></div>
        <div class="page"><div class="txt">${storyHtml(`<span class="pend">${K.esc(prefix)}<b class="hole">…</b></span>`)}</div></div>
        <div class="choices">${opts.map((o, j) => `<button class="ch f" ${K.act("c" + j, (el) => choose(o, el))}><span class="emo">${o.e}</span><span class="t">${K.esc(o.text)}</span></button>`).join("")}</div>`, "c0");
      const page = K.app.querySelector(".page");
      page.scrollTop = page.scrollHeight;
    }
    let busy = false;
    function choose(o, el) {
      if (busy) return;
      busy = true;
      el.classList.add("picked");
      K.sfx.pop();
      if (S.step === 0) {
        S.hero = o.hero;
        S.parts.push(`كان يا ما كان، ${S.hero.g === "f" ? "كانت" : "كان"} هناك ${o.text}`);
      } else {
        const st = STEPS[S.step - 1];
        S.parts.push(` ${pick(S.ps[S.step - 1], S.hero.g)}${o.text}${st.end}`);
      }
      if (o.six7) six7();
      S.step++;
      K.later(() => { busy = false; K.top().focus = null; if (S.step < TOTAL) ask(); else finish(); }, o.six7 ? 1600 : 650);
    }
    function finish() {
      const text = S.parts.join("").trim();
      const story = { title: `قصة ${S.hero.short}`, e: S.hero.e, text, ts: Date.now() };
      save.stories.unshift(story);
      save.stories = save.stories.slice(0, 30);
      save.save();
      K.replace(readScreen, story, true);
    }
  }

  // «سكس سفن» 🤪
  function six7() {
    const fx = document.createElement("div");
    fx.className = "six7";
    fx.innerHTML = `<span>6</span><span>7</span>`;
    document.body.appendChild(fx);
    [523, 392, 523, 659].forEach((f, i) => K.tone(f, 0.18, "square", 0.08, i * 0.16));
    setTimeout(() => fx.remove(), 1600);
  }

  // ---------------------------------------------------------------- قراءة القصة
  function readScreen(story, fresh) {
    K.begin();
    const say = K.voice("ar") ? `<button class="btn f" ${K.act("say", () => K.tts(story.text, "ar", 0.85))}><span class="emo">🔊</span> اقرأها لي</button>` : "";
    K.paint(`<div class="top">${K.backBtn()}<span></span><span class="pill">${fmtDay(story.ts)}</span></div>
      <h2 class="stitle"><span class="emo">${story.e}</span> ${K.esc(story.title)}</h2>
      <div class="page book"><div class="txt">${K.esc(story.text)}</div><div class="end">— النهاية —</div></div>
      <div class="nav">${say}
        <button class="btn f go" ${K.act("again", () => K.replace(play))}>✨ قصة جديدة</button>
        <button class="btn f" ${K.act("shelf", () => K.replace(shelf))}>📚 قصصي</button>
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span></button></div>`, fresh ? "again" : "shelf");
    if (fresh) { K.sfx.win(); K.confetti(40, "😂🤪⭐🎉✨"); }
  }

  // ---------------------------------------------------------------- قصصي
  function shelf() {
    K.begin();
    const list = save.stories;
    const body = list.length
      ? `<div class="shelf">${list.map((s, i) => `<button class="sb f" ${K.act("s" + i, () => K.show(readScreen, s, false))}><span class="emo">${s.e}</span><b>${K.esc(s.title)}</b>
          <small>${K.esc(s.text.slice(0, 70))}…</small><i>${fmtDay(s.ts)}</i></button>`).join("")}</div>`
      : `<div class="note">لا توجد قصص بعد. اضغط «قصة جديدة» واصنع أول قصة مضحكة! 🤪</div>
         <div class="nav"><button class="btn f go" ${K.act("new", () => K.replace(play))}>✨ قصة جديدة</button></div>`;
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">📚 قصصي</h2><span class="pill">${list.length}</span></div>${body}`, list.length ? "s0" : "new");
  }

  // القائمة تتمرّر مع التركيز
  K.onFocus = (el) => { if (el.closest(".shelf")) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  K.start(home);
})();
