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

  // الآيات الطويلة: نعرض جزءاً منها مع «…» حتى تتسع الشاشة (النص نفسه لا يتغير)
  const LONG = 95;
  const nWords = (w, lim, fromEnd) => { let k = 0, l = 0; const g = (i) => w[fromEnd ? w.length - 1 - i : i];
    while (k < w.length && (k < 3 || l + bare(g(k)).length <= lim)) { l += bare(g(k)).length + 1; k++; } return k; };
  const headOf = (a, lim = 55) => { const w = a.split(" "), k = nWords(w, lim); return k >= w.length ? a : w.slice(0, k).join(" ") + " …"; };
  const tailOf = (a, lim = 80) => { const w = a.split(" "), k = nWords(w, lim, true); return k >= w.length ? a : "… " + w.slice(w.length - k).join(" "); };
  // بدايات آيات مختلفة بحيث لا يتشابه خياران
  function heads(texts, lim = 60) {
    const W = texts.map((t) => t.split(" "));
    const k = texts.map((t, i) => (bare(t).length <= LONG ? W[i].length : nWords(W[i], lim)));
    for (let g = 0; g < 80; g++) {
      const sh = W.map((w, i) => bare(w.slice(0, k[i]).join(" ")));
      let dup = false;
      for (let a = 0; a < sh.length; a++) for (let b = a + 1; b < sh.length; b++)
        if (texts[a] !== texts[b] && (sh[a] === sh[b] || (k[a] < W[a].length && sh[b].startsWith(sh[a])) || (k[b] < W[b].length && sh[a].startsWith(sh[b])))) { dup = true; k[a]++; k[b]++; }
      if (!dup) break;
    }
    return W.map((w, i) => (k[i] >= w.length ? texts[i] : w.slice(0, k[i]).join(" ") + " …"));
  }

  // ---------------------------------------------------------------- الأجزاء
  // جزء عمّ يبدأ بسورة النبأ (٧٨)، وجزء تبارك بسورة الملك (٦٧)، وجزء قد سمع بسورة المجادلة (٥٨)
  const JUZ = [
    { n: 30, name: "جزء عمّ", icon: "🌙", bg: "linear-gradient(135deg,#10b981,#0f766e)", has: (x) => x >= 78 },
    { n: 29, name: "جزء تبارك", icon: "⭐", bg: "linear-gradient(135deg,#06b6d4,#2563eb)", has: (x) => x >= 67 && x <= 77 },
    { n: 28, name: "جزء قد سمع", icon: "🌟", bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)", has: (x) => x >= 58 && x <= 66 },
  ];
  const juzOf = (s) => JUZ.find((j) => j.has(s.n));
  const inJuz = (j) => S.map((s, i) => i).filter((i) => j.has(S[i].n));
  const FATIHA = S.findIndex((s) => s.n === 1);

  function homeScreen() {
    K.begin();
    const done = S.filter(memorized).length;
    const card = (key, bg, icon, title, desc, prog, fn) => `
      <button class="mode juz f" style="background:${bg}" ${K.act(key, fn)}>
        <span class="big emo">${icon}</span><b>${title}</b><small>${desc}</small><span class="prog">${prog}</span>
      </button>`;
    const f = S[FATIHA];
    K.paint(`
      <div class="top"><span></span>
        <div class="title"><span class="mascot emo">📖</span><h1>حفظ القرآن</h1></div>
        <span class="pill">🌟 ${ar(done)} / ${ar(S.length)}</span></div>
      <div class="sub">اختر ما تريد أن تحفظ</div>
      <div class="modes">
        ${card("f", "linear-gradient(135deg,#f59e0b,#ea580c)", "📖", "سورة الفاتحة", `${ar(f.ayat.length)} آيات`, memorized(f) ? "🌟 حفظتها" : K.starsHtml(Math.min(stars(f, "order"), stars(f, "fill"))), () => K.show(surahScreen, FATIHA))}
        ${JUZ.map((j) => { const ix = inJuz(j); const d = ix.filter((i) => memorized(S[i])).length;
          return card("j" + j.n, j.bg, j.icon, j.name, `الجزء ${ar(j.n)}<br>${ar(ix.length)} سورة`, `🌟 ${ar(d)} / ${ar(ix.length)}`, () => K.show(juzScreen, j.n)); }).join("")}
      </div>
      ${K.HELP}`, "j30");
  }

  function juzScreen(jn) {
    K.begin();
    const j = JUZ.find((x) => x.n === jn), ix = inJuz(j);
    const done = ix.filter((i) => memorized(S[i])).length;
    const tiles = ix.map((i) => { const s = S[i]; return `
      <button class="tile surah f${memorized(s) ? " done" : ""}" ${K.act("s" + i, () => K.show(surahScreen, i))}>
        <b class="qr">${s.name}</b><small>${ar(s.ayat.length)} ${ayatWord(s.ayat.length)}</small>
        <span class="st">${memorized(s) ? "🌟 حفظتها" : K.starsHtml(Math.min(stars(s, "order"), stars(s, "fill")))}</span>
      </button>`; }).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${j.name} <small class="jn">(الجزء ${ar(j.n)})</small></h2><span class="pill">🌟 ${ar(done)} / ${ar(ix.length)}</span></div>
      <div class="grid" style="--cols:${Math.min(10, ix.length > 12 ? 10 : 6)}">${tiles}</div>
      ${K.HELP}`, "s" + ix[0]);
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
    const fs = len > 330 ? 3.6 : len > 220 ? 4.2 : len > 150 ? 4.8 : len > 120 ? 5.2 : len > 70 ? 6.2 : len > 35 ? 7.5 : 9;
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="qr">سورة ${s.name}</h2><span class="pill">الآية ${ar(i + 1)} / ${ar(n)}</span></div>
      <div class="mushaf">
        ${i === 0 && s.n !== 1 ? `<div class="basmala qr">${BASMALA}</div>` : ""}
        <div class="ayah qr" style="font-size:${fs}vh">${s.ayat[i]} ${num(i + 1)}</div>
        ${i < n - 1 ? `<div class="nexthint qr">${len > 220 ? headOf(s.ayat[i + 1], 30) : bare(s.ayat[i + 1]).length > LONG ? headOf(s.ayat[i + 1]) : s.ayat[i + 1]} ${num(i + 2)}</div>` : `<div class="nexthint">✨ نهاية السورة ✨</div>`}
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

  // السورة كاملة: السور الطويلة تُقسَّم إلى صفحات
  const PAGE_LETTERS = 520;
  function pagesOf(s) {
    const len = s.ayat.map((a) => bare(a).length + 4), total = len.reduce((a, b) => a + b, 0);
    const target = total / Math.ceil(total / PAGE_LETTERS); // صفحات متساوية تقريباً
    const pages = [[]]; let sum = 0;
    len.forEach((l, i) => {
      if (sum + l / 2 > target && pages[pages.length - 1].length) { pages.push([]); sum = 0; }
      pages[pages.length - 1].push(i); sum += l;
    });
    return pages;
  }
  function fullScreen(si, p = 0) {
    K.begin();
    const s = S[si], pages = pagesOf(s), pg = pages[p], many = pages.length > 1;
    const letters = pg.reduce((a, i) => a + bare(s.ayat[i]).length + 4, 0) + (p === 0 ? 40 : 0);
    const fs = Math.max(3.4, Math.min(6.5, Math.sqrt((many ? 6500 : 8500) / letters)));
    const go = (d) => { K.top().args = [si, p + d]; K.render(); };
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="qr">سورة ${s.name}</h2><span class="pill">${many ? `صفحة ${ar(p + 1)} / ${ar(pages.length)}` : `${ar(s.ayat.length)} ${ayatWord(s.ayat.length)}`}</span></div>
      <div class="mushaf full qr${many ? " paged" : ""}" style="font-size:${fs}vh">
        ${p === 0 && s.n !== 1 ? `<div class="basmala">${BASMALA}</div>` : ""}
        <p>${pg.map((i) => `${s.ayat[i]} ${num(i + 1)}`).join(" ")}</p>
      </div>
      ${many ? `<div class="nav">
        ${p > 0 ? `<button class="btn f" ${K.act("prev", () => go(-1))}>→ السابقة</button>` : ""}
        ${p < pages.length - 1 ? `<button class="btn f go" ${K.act("next", () => go(1))}>التالية ←</button>` : ""}
      </div>` : ""}`, many ? (p < pages.length - 1 ? "next" : "prev") : "back");
  }

  // ---------------------------------------------------------------- رتّب الآيات
  function orderQuiz(si) {
    const s = S[si], n = s.ayat.length;
    return {
      title: `سورة ${s.name}`,
      optsCls: "wide qr",
      make() {
        // السور الطويلة: ١٥ سؤالاً من مواضع مختلفة بالترتيب
        let idx = s.ayat.map((_, i) => i);
        if (n > 15) idx = K.shuffle(idx).slice(0, 15).sort((a, b) => a - b);
        return idx.map((i) => {
          const pool = s.ayat.map((x, j) => j).filter((j) => j !== i);
          const opts = K.options(i, pool, Math.min(4, n), (x, y) => s.ayat[x] === s.ayat[y]);
          const ctx = i === 0
            ? `<div class="q">ما أول آية في سورة <span class="qr">${s.name}</span>؟</div>`
            : `<div class="q">ما الآية ${ar(i + 1)} بعد:</div>
               <div class="ctx qr">${i >= 2 && bare(s.ayat[i - 1]).length < 60 ? `<span class="dim">${tailOf(s.ayat[i - 2], 40)} ${num(i - 1)}</span> ` : ""}${tailOf(s.ayat[i - 1])} ${num(i)}</div>`;
          return {
            prompt: `<div class="col">${i === 0 && s.n !== 1 ? `<div class="basmala qr sm">${BASMALA}</div>` : ""}${ctx}</div>`,
            opts: heads(opts.map((j) => s.ayat[j])),
            answer: opts.indexOf(i),
            optsCls: (() => { const m = Math.max(...heads(opts.map((j) => s.ayat[j])).map((t) => bare(t).length)); return "wide qr" + (m <= 34 ? " two" : m > 70 ? " long" : ""); })(),
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
          const opts = K.options(w[h], allWords, 4, (a, b) => bare(a) === bare(b));
          // في الآية الطويلة نعرض الكلمات القريبة من الكلمة الناقصة فقط
          let a0 = 0, a1 = w.length;
          if (bare(s.ayat[i]).length > 110) { a0 = Math.max(0, h - 9); a1 = Math.min(w.length, h + 4); }
          const shown = (a0 > 0 ? "… " : "") + w.slice(a0, a1).map((x, jj) => (jj + a0 === h ? `<span class="hole">؟</span>` : x)).join(" ") + (a1 < w.length ? " …" : "");
          return {
            prompt: `<div class="col">${i === 0 && s.n !== 1 ? `<div class="basmala qr sm">${BASMALA}</div>` : ""}<div class="ayah qr fillq">${shown} ${num(i + 1)}</div></div>`,
            opts, answer: opts.indexOf(w[h]),
            reveal(app) { const e = app.querySelector(".hole"); if (e) { e.textContent = w[h]; e.classList.add("got"); } },
            sayOk: () => K.play([audioFile(s, i)]),
          };
        });
      },
      done(score, st) { return record(s, "fill", st); },
      next: si < S.length - 1 && juzOf(S[si + 1]) === juzOf(s) && s.n !== 1 ? { label: `سورة ${S[si + 1].name}`, fn: () => K.replace(surahScreen, si + 1) } : null,
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
