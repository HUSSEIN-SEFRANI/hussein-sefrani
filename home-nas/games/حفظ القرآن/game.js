// حفظ القرآن — قصار السور للأطفال: اقرأ واستمع، رتّب الآيات، أكمل الآية
// صوت القارئ (اختياري): ملفات mp3 لكل آية داخل مجلد audio بأسماء مثل 114001.mp3 (رقم السورة ثم رقم الآية، 3 خانات لكل منهما)
(() => {
  "use strict";
  const S = window.SURAHS, BASMALA = window.BASMALA;
  const save = K.store("quran", { stars: {}, seen: {} });
  const ar = (n) => Number(n).toLocaleString("ar-EG");
  const pad3 = (n) => String(n).padStart(3, "0");
  const audioFile = (s, i) => `audio/${pad3(s.n)}${pad3(i + 1)}.mp3`;
  const bare = (w) => w.normalize("NFC").replace(/\p{M}/gu, "").replace(/ٱ/g, "ا").replace(/ـ/g, "");
  const ayatWord = (n) => (n === 1 ? "آية" : n === 2 ? "آيتان" : n <= 10 ? "آيات" : "آية");
  const stars = (s, m) => save.stars[`${s.n}:${m}`] || 0;
  const memorized = (s) => stars(s, "order") === 3 && stars(s, "fill") === 3;
  const num = (i) => `<span class="num">${ar(i)}</span>`;
  const STAR_FX = "⭐🌟✨";

  // ---------------------------------------------------------------- القائمة: السور
  function homeScreen() {
    K.begin();
    const done = S.filter(memorized).length;
    const tiles = S.map((s, i) => `
      <button class="tile surah f${memorized(s) ? " done" : ""}" ${K.act("s" + i, () => K.show(surahScreen, i))}>
        <b class="qr">${s.name}</b><small>${ar(s.ayat.length)} ${ayatWord(s.ayat.length)}</small>
        <span class="st">${memorized(s) ? "🌟 حفظتها" : K.starsHtml(Math.min(stars(s, "order"), stars(s, "fill")))}</span>
      </button>`).join("");
    K.paint(`
      <div class="top"><span></span>
        <div class="title"><span class="mascot emo">📖</span><h1>حفظ القرآن</h1></div>
        <span class="pill">🌟 ${ar(done)} / ${ar(S.length)}</span></div>
      <div class="grid" style="--cols:8">${tiles}</div>
      ${K.HELP}`, "s0");
  }

  // ---------------------------------------------------------------- السورة
  function surahScreen(si) {
    K.begin();
    const s = S[si];
    const card = (k, icon, title, desc, fn, st) => `
      <button class="mode f" style="background:${k}" ${K.act(title, fn)}>
        <span class="big emo">${icon}</span><b>${title}</b><small>${desc}</small>${st !== undefined ? `<span class="st">${K.starsHtml(st)}</span>` : ""}
      </button>`;
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="qr">سورة ${s.name}</h2><span class="pill">${ar(s.ayat.length)} ${ayatWord(s.ayat.length)}</span></div>
      ${memorized(s) ? `<div class="sub">🌟 ما شاء الله! لقد حفظت هذه السورة</div>` : `<div class="sub">اقرأ واستمع أولاً، ثم العب حتى تحفظها</div>`}
      <div class="modes">
        ${card("linear-gradient(135deg,#10b981,#0f766e)", "📖", "اقرأ واستمع", "آية بعد آية", () => K.show(readScreen, si, 0))}
        ${card("linear-gradient(135deg,#06b6d4,#2563eb)", "🧩", "رتّب الآيات", "ما الآية التالية؟", () => K.show(K.quizScreen, orderQuiz(si)), stars(s, "order"))}
        ${card("linear-gradient(135deg,#f59e0b,#ea580c)", "✍️", "أكمل الآية", "اختر الكلمة الناقصة", () => K.show(K.quizScreen, fillQuiz(si)), stars(s, "fill"))}
        ${card("linear-gradient(135deg,#8b5cf6,#6d28d9)", "📜", "السورة كاملة", "اقرأها كلها", () => K.show(fullScreen, si))}
      </div>
      ${K.HELP}`, "اقرأ واستمع");
  }

  // ---------------------------------------------------------------- اقرأ واستمع
  let repeat = 1, cont = false; // تكرار الآية، وتشغيل متواصل
  function readScreen(si, i) {
    K.begin();
    const s = S[si], n = s.ayat.length;
    save.seen[s.n] = 1; save.save();
    let left = repeat;
    const go = (d) => { const j = i + d; if (j < 0 || j >= n) return; K.top().args = [si, j]; K.render(); };
    const playNow = () => {
      left = repeat;
      const once = () => K.play([audioFile(s, i)], null, "ar", () => {
        if (--left > 0) K.later(once, 700);
        else if (cont && i < n - 1) K.later(() => go(1), 900);
      }, () => { const h = K.app.querySelector(".nohint"); if (h) h.hidden = false; });
      once();
    };
    const len = bare(s.ayat[i]).length;
    const fs = len > 120 ? 5 : len > 70 ? 6.2 : len > 35 ? 7.5 : 9;
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="qr">سورة ${s.name}</h2><span class="pill">الآية ${ar(i + 1)} / ${ar(n)}</span></div>
      <div class="mushaf">
        ${i === 0 && s.n !== 1 ? `<div class="basmala qr">${BASMALA}</div>` : ""}
        <div class="ayah qr" style="font-size:${fs}vh">${s.ayat[i]} ${num(i + 1)}</div>
        ${i < n - 1 ? `<div class="nexthint qr">${s.ayat[i + 1]} ${num(i + 2)}</div>` : `<div class="nexthint">✨ نهاية السورة ✨</div>`}
      </div>
      <div class="nav">
        <button class="btn f" ${K.act("prev", () => go(-1))}>→ السابقة</button>
        <button class="btn f go" ${K.act("play", playNow)}><span class="emo">🔊</span> استمع</button>
        <button class="btn f" ${K.act("rep", () => { repeat = repeat === 1 ? 3 : repeat === 3 ? 5 : 1; K.render(); })}><span class="emo">🔁</span> كرّر ×${ar(repeat)}</button>
        <button class="btn f" ${K.act("cont", () => { cont = !cont; K.render(); })}>${cont ? "⏸️ متواصل" : "▶️ متواصل"}</button>
        ${i < n - 1 ? `<button class="btn f" ${K.act("next", () => go(1))}>التالية ←</button>`
                    : `<button class="btn f go" ${K.act("quiz", () => K.replace(K.quizScreen, orderQuiz(si)))}>🧩 العب الآن</button>`}
      </div>
      <div class="help nohint" hidden>لسماع القارئ: ضع ملفات الآيات في مجلد <b>audio</b> داخل اللعبة، مثل <b dir="ltr">${pad3(s.n)}${pad3(i + 1)}.mp3</b></div>
      ${K.HELP}`, "next");
    if (cont) playNow();
  }

  function fullScreen(si) {
    K.begin();
    const s = S[si];
    const letters = s.ayat.reduce((a, x) => a + bare(x).length + 4, 0);
    const fs = Math.max(2.8, Math.min(6.5, Math.sqrt(8500 / letters)));
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="qr">سورة ${s.name}</h2><span class="pill">${ar(s.ayat.length)} ${ayatWord(s.ayat.length)}</span></div>
      <div class="mushaf full qr" style="font-size:${fs}vh">
        ${s.n !== 1 ? `<div class="basmala">${BASMALA}</div>` : ""}
        <p>${s.ayat.map((a, i) => `${a} ${num(i + 1)}`).join(" ")}</p>
      </div>`, "back");
  }

  // ---------------------------------------------------------------- رتّب الآيات
  function orderQuiz(si) {
    const s = S[si], n = s.ayat.length;
    return {
      title: `سورة ${s.name}`,
      optsCls: "wide qr",
      make() {
        return s.ayat.map((a, i) => {
          const pool = s.ayat.map((x, j) => j).filter((j) => j !== i);
          const opts = K.options(i, pool, Math.min(3, n), (x, y) => s.ayat[x] === s.ayat[y]);
          const ctx = i === 0
            ? `<div class="q">ما أول آية في سورة <span class="qr">${s.name}</span>؟</div>`
            : `<div class="q">ما الآية ${ar(i + 1)} بعد:</div>
               <div class="ctx qr">${i >= 2 ? `<span class="dim">${s.ayat[i - 2]} ${num(i - 1)}</span> ` : ""}${s.ayat[i - 1]} ${num(i)}</div>`;
          return {
            prompt: `<div class="col">${i === 0 && s.n !== 1 ? `<div class="basmala qr sm">${BASMALA}</div>` : ""}${ctx}</div>`,
            opts: opts.map((j) => s.ayat[j]),
            answer: opts.indexOf(i),
            optsCls: "wide qr" + (Math.max(...opts.map((j) => bare(s.ayat[j]).length)) > 70 ? " long" : ""),
            sayOk: () => K.play([audioFile(s, i)]),
          };
        });
      },
      done(score, st) { return record(s, "order", st); },
      next: { label: "أكمل الآية", fn: () => K.replace(K.quizScreen, fillQuiz(si)) },
    };
  }

  // ---------------------------------------------------------------- أكمل الآية
  function fillQuiz(si) {
    const s = S[si];
    const allWords = [...new Set(s.ayat.flatMap((a) => a.split(" ")))];
    return {
      title: `سورة ${s.name}`,
      optsCls: "txt qr",
      make() {
        let idx = s.ayat.map((_, i) => i);
        while (idx.length < 4) idx = idx.concat(s.ayat.map((_, i) => i));
        idx = idx.slice(0, Math.max(4, Math.min(10, s.ayat.length)));
        if (s.ayat.length > 10) idx = K.shuffle(s.ayat.map((_, i) => i)).slice(0, 10).sort((a, b) => a - b);
        return idx.map((i, k) => {
          const w = s.ayat[i].split(" ");
          // الكلمة الأخيرة غالباً، وأحياناً كلمة من الوسط
          const cand = w.map((x, j) => j).filter((j) => bare(w[j]).length >= 2);
          const h = (k % 2 === 1 || w.length < 3) ? w.length - 1 : K.pick(cand);
          const opts = K.options(w[h], allWords, 3, (a, b) => bare(a) === bare(b));
          const shown = w.map((x, j) => (j === h ? `<span class="hole">؟</span>` : x)).join(" ");
          return {
            prompt: `<div class="col">${i === 0 && s.n !== 1 ? `<div class="basmala qr sm">${BASMALA}</div>` : ""}<div class="ayah qr fillq">${shown} ${num(i + 1)}</div></div>`,
            opts, answer: opts.indexOf(w[h]),
            reveal(app) { const e = app.querySelector(".hole"); if (e) { e.textContent = w[h]; e.classList.add("got"); } },
            sayOk: () => K.play([audioFile(s, i)]),
          };
        });
      },
      done(score, st) { return record(s, "fill", st); },
      next: si < S.length - 1 ? { label: `سورة ${S[si + 1].name}`, fn: () => K.replace(surahScreen, si + 1) } : null,
    };
  }

  function record(s, mode, st) {
    const key = `${s.n}:${mode}`;
    const was = memorized(s);
    save.stars[key] = Math.max(save.stars[key] || 0, st);
    save.save();
    if (!was && memorized(s)) { K.later(() => K.confetti(60, STAR_FX), 400); return `<div class="won"><span class="emo">🌟</span><div><b>ما شاء الله!</b><br>حفظت سورة <span class="qr">${s.name}</span></div></div>`; }
    return "";
  }

  K.start(homeScreen);
})();
