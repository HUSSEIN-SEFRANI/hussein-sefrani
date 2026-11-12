// الكلمة المفقودة — يظهر تلميح وصورة، ومربعات فارغة بعدد أحرف الكلمة، ولوحة حروف.
// الحرف الصحيح يجلس في كل مواضعه، والخاطئ يُسقط بتلة من الزهرة (6 بتلات = 6 أخطاء).
// الكلمات في words.js. التقدّم (الكلمات المستعملة وعدد المحلولة) محفوظ لكل طفل.
(() => {
  "use strict";
  const GAME = "الكلمة المفقودة";
  const CATS = window.CATS;
  const WORDS = window.WORDS.map(([c, e, ar, fr, ha, hf], id) => ({ id, c, e, ar, fr, ha, hf }));
  const MAX = 6;
  const save = K.store("kalima", { used: {}, solved: { ar: 0, fr: 0 }, lang: "ar", lv: 0 });

  const KEYS = {
    ar: "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ة ى".split(" "),
    fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  };
  const ALIF = { "أ": "ا", "إ": "ا", "آ": "ا" };
  // الحرف الأساسي في لوحة المفاتيح: ا يكشف أ إ آ، وE يكشف É È Ê، وC يكشف Ç…
  const base = (lang, ch) => (lang === "ar" ? ALIF[ch] || ch : ch.normalize("NFD")[0].toUpperCase());
  const letters = (lang, w) => Array.from(lang === "fr" ? w.normalize("NFC").toUpperCase() : w);
  const LEVELS = [
    { n: "سهل", sub: "3–4 أحرف", min: 3, max: 4, e: "🐣", bg: "linear-gradient(135deg,#4ade80,#16a34a)" },
    { n: "متوسط", sub: "5–6 أحرف", min: 5, max: 6, e: "🐥", bg: "linear-gradient(135deg,#fbbf24,#f97316)" },
    { n: "صعب", sub: "7 أحرف أو أكثر", min: 7, max: 99, e: "🦅", bg: "linear-gradient(135deg,#f472b6,#9333ea)" },
  ];
  const pool = (lang, lv) => WORDS.filter((w) => w[lang] && (() => { const n = letters(lang, w[lang]).length; return n >= LEVELS[lv].min && n <= LEVELS[lv].max; })());

  // لا تتكرر الكلمة حتى تنتهي كلمات المستوى
  function pickWord(lang, lv) {
    const all = pool(lang, lv), k = lang + lv;
    let used = save.used[k] || [];
    let left = all.filter((w) => !used.includes(w.id));
    if (!left.length) { const lastId = used[used.length - 1]; used = []; left = all.filter((w) => w.id !== lastId); }
    const w = K.pick(left);
    used.push(w.id); save.used[k] = used; save.save();
    return w;
  }

  function earnStars(amount, reason) {
    return fetch("/api/tv/stars/earn", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, game: GAME, reason }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => (d && d.added > 0 ? d.added : 0)).catch(() => 0);
  }

  // قراءة عدة جمل بلغات مختلفة متتالية (إن توفّر صوت لكل لغة)
  function say(parts) {
    try { speechSynthesis.cancel(); } catch { return false; }
    let ok = false;
    for (const [t, l] of parts) {
      const v = t && K.voice(l);
      if (!v) continue;
      try { const u = new SpeechSynthesisUtterance(t); u.voice = v; u.lang = v.lang; u.rate = 0.85; speechSynthesis.speak(u); ok = true; } catch {}
    }
    return ok;
  }
  const hasVoice = () => !!(K.voice("ar") || K.voice("fr"));

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    const card = (lang, big, name, bg) => `<button class="mode f" style="background:${bg}" ${K.act(lang, () => { save.lang = lang; save.save(); K.show(levels, lang); })}>
        <span class="big abc" dir="${lang === "ar" ? "rtl" : "ltr"}">${big}</span><b>${name}</b><small>${save.solved[lang] ? `حللت ${save.solved[lang]} كلمة ⭐` : "ابدأ الآن!"}</small></button>`;
    K.paint(`<div class="title"><span class="mascot emo">🔎</span><div><h1>الكلمة المفقودة</h1><div class="sub">خمّن الكلمة حرفاً حرفاً!</div></div></div>
      <div class="demo">${["ق", "", "ة"].map((c) => `<span class="box ${c ? "on" : ""}">${c}</span>`).join("")}<span class="emo">🐱</span></div>
      <div class="modes">
        ${card("ar", "أ ب ت", "بالعربية", "linear-gradient(135deg,#34d399,#0ea5e9)")}
        ${card("fr", "A B C", "Français", "linear-gradient(135deg,#60a5fa,#a855f7)")}
      </div>${K.HELP}`, save.lang);
  }

  function levels(lang) {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">اختر المستوى</h2><span class="pill">${lang === "ar" ? "العربية" : "Français"}</span></div>
      <div class="modes lv">${LEVELS.map((L, i) => `<button class="mode f" style="background:${L.bg}" ${K.act("l" + i, () => { save.lv = i; save.save(); K.show(play, lang, i); })}>
        <span class="big emo">${L.e}</span><b>${L.n}</b><small>${L.sub}</small>
        <span class="mini-boxes">${"<i></i>".repeat(Math.min(L.min, 7))}</span><small>${pool(lang, i).length} كلمة</small></button>`).join("")}</div>
      ${K.HELP}`, "l" + (save.lv || 0));
  }

  // ---------------------------------------------------------------- الزهرة (6 بتلات)
  function flower() {
    const petals = K.range(0, MAX).map((i) => `<g class="pw" data-p="${i}"><ellipse cx="100" cy="48" rx="19" ry="33" transform="rotate(${i * 60} 100 90)" fill="${["#f472b6", "#fb7185", "#f9a8d4"][i % 3]}" stroke="#db2777" stroke-width="3"/></g>`).join("");
    return `<svg viewBox="0 0 200 270" class="flw">
      <path d="M100 120 C 96 170, 104 200, 100 228" stroke="#16a34a" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M100 185 C 70 165, 55 175, 48 190 C 70 198, 88 195, 100 185 Z" fill="#4ade80" stroke="#15803d" stroke-width="3"/>
      <path d="M100 170 C 130 150, 148 158, 154 172 C 132 182, 114 180, 100 170 Z" fill="#4ade80" stroke="#15803d" stroke-width="3"/>
      ${petals}
      <circle cx="100" cy="90" r="25" fill="#fde047" stroke="#ca8a04" stroke-width="3"/>
      <circle cx="91" cy="85" r="3.5" fill="#713f12"/><circle cx="109" cy="85" r="3.5" fill="#713f12"/>
      <path class="mouth" d="M89 96 Q100 106 111 96" stroke="#713f12" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M62 228 L138 228 L128 266 L72 266 Z" fill="#f97316" stroke="#c2410c" stroke-width="3"/>
      <rect x="56" y="220" width="88" height="14" rx="6" fill="#fb923c" stroke="#c2410c" stroke-width="3"/>
    </svg>`;
  }

  // ---------------------------------------------------------------- اللعب
  function play(lang, lv) {
    K.begin();
    const w = pickWord(lang, lv), word = w[lang], L = letters(lang, word), B = L.map((c) => base(lang, c));
    const other = lang === "ar" ? "fr" : "ar";
    const hint = lang === "ar" ? w.ha : w.hf, hint2 = lang === "ar" ? w.hf : w.ha;
    const S = { tried: new Set(), bad: 0, done: false };
    const dir = lang === "ar" ? "rtl" : "ltr";
    const catName = lang === "ar" ? CATS[w.c][0] : `${CATS[w.c][1]} · ${CATS[w.c][0]}`;
    const keys = KEYS[lang];
    K.word = B; // للتجربة الآلية فقط

    K.paint(`<div class="top">${K.backBtn()}
        <span class="pill">${K.esc(catName)}</span>
        <span class="pill cnt">⭐ ${save.solved[lang]}</span>
        <button class="btn f" ${K.act("hint", useHint)}><span class="emo">💡</span> تلميح</button>
        ${hasVoice() ? `<button class="btn f" ${K.act("say", () => say([[hint, lang]]))}><span class="emo">🔊</span></button>` : ""}
      </div>
      <div class="stage">
        <div class="fbox">${flower()}<div class="left emo">${"🌸".repeat(MAX)}</div></div>
        <div class="clue"><span class="emo pic">${w.e}</span><div class="ct"><b dir="${dir}">${K.esc(hint)}</b>${hint2 ? `<small dir="${lang === "ar" ? "ltr" : "rtl"}">${K.esc(hint2)}</small>` : ""}</div></div>
      </div>
      <div class="boxes ${L.length > 8 ? "long" : ""}" dir="${dir}">${L.map(() => `<span class="box"></span>`).join("")}</div>
      <div class="zone">
        <div class="keys ${lang}" dir="${dir}">${keys.map((k, i) => `<button class="key f" ${K.act("k" + i, (el) => guess(k, el))}>${k}</button>`).join("")}</div>
      </div>
      <div class="cheer"></div>`, "k0");
    say([[hint, lang]]);

    const $ = (s) => K.app.querySelector(s);
    const boxes = [...K.app.querySelectorAll(".box")];
    const keyEl = (k) => K.app.querySelector(`[data-k="k${keys.indexOf(k)}"]`);

    function fill(b) {
      B.forEach((x, i) => { if (x === b) { boxes[i].textContent = L[i]; boxes[i].classList.add("on"); } });
    }
    function loseOne() {
      S.bad++;
      const p = $(`.pw[data-p="${S.bad - 1}"]`);
      if (p) p.classList.add("gone");
      $(".left").textContent = "🌸".repeat(MAX - S.bad) || "🌱";
      if (S.bad >= MAX - 2) $(".mouth").setAttribute("d", "M89 99 L111 99");
    }
    function guess(k, el) {
      if (S.done || S.tried.has(k)) return;
      S.tried.add(k);
      if (B.includes(k)) {
        el.classList.add("ok"); fill(k); K.sfx.pop();
        $(".cheer").textContent = K.pick(["أحسنت! 👏", "صحيح! ✅", "رائع! 🌟", "ممتاز! 🎉"]);
        if (boxes.every((b) => b.classList.contains("on"))) win();
      } else {
        el.classList.add("bad"); K.sfx.bad(); loseOne();
        $(".cheer").textContent = S.bad >= MAX ? "" : `ليس في الكلمة، حاول حرفاً آخر 💪`;
        if (S.bad >= MAX) lose();
      }
    }
    function useHint() {
      if (S.done) return;
      const missing = [...new Set(B.filter((b, i) => !boxes[i].classList.contains("on")))];
      if (S.bad >= MAX - 1 || missing.length < 2) { K.sfx.bad(); $(".cheer").textContent = "لا يوجد تلميح الآن، أنت تستطيع! 💪"; return; }
      const b = K.pick(missing);
      S.tried.add(b);
      const el = keyEl(b);
      if (el) el.classList.add("ok");
      fill(b); loseOne(); K.sfx.pop();
      $(".cheer").textContent = "💡 كشفنا لك حرفاً (بتلة واحدة)";
    }
    function win() {
      S.done = true;
      save.solved[lang]++; save.save(); $(".cnt").textContent = "⭐ " + save.solved[lang];
      K.sfx.win(); K.confetti(30);
      $(".fbox").classList.add("happy");
      $(".cheer").textContent = "أحسنت! وجدت الكلمة 🎉";
      earnStars(1, `حلّ كلمة: ${word}`).then((n) => { S.stars = n; const s = $(".won-st"); if (n && s) s.textContent = `+${n} ⭐`; });
      K.later(() => end(true), 900);
    }
    function lose() {
      S.done = true;
      boxes.forEach((b, i) => { if (!b.classList.contains("on")) { b.textContent = L[i]; b.classList.add("miss"); } });
      $(".cheer").textContent = "لا بأس! هذه هي الكلمة، والزهرة ستنمو من جديد 🌱";
      K.later(() => end(false), 1400);
    }
    function end(ok) {
      const ar = w.ar, fr = w.fr;
      const pair = [ar && `<b dir="rtl">${K.esc(ar)}</b>`, fr && `<b dir="ltr" lang="fr">${K.esc(fr)}</b>`].filter(Boolean).join(`<span class="eq">=</span>`);
      const sayIt = () => say([[ar, "ar"], [fr, "fr"]].filter((x) => x[0]));
      $(".zone").innerHTML = `<div class="end ${ok ? "ok" : ""}">
          <span class="emo big">${w.e}</span>
          <div class="pair">${pair}</div>
          ${ok ? `<span class="won-st">${S.stars ? `+${S.stars} ⭐` : ""}</span>` : ""}
          <div class="nav">
            <button class="btn f go" ${K.act("next", () => { K.top().focus = null; K.replace(play, lang, lv); })}>كلمة جديدة ←</button>
            ${hasVoice() ? `<button class="btn f" ${K.act("say2", sayIt)}><span class="emo">🔊</span></button>` : ""}
            <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
          </div></div>`;
      K.focus($('[data-k="next"]'));
      sayIt();
    }
  }

  K.start(home);
})();
