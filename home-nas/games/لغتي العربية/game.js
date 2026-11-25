// لغتي العربية — درس تعليمي (نجمة عند إنهاء كل درس).
// الطفل يقطّع الكلمة إلى حروفها (ك م ب ي و ت ر)، ويركّب الحروف المتفرقة في كلمة (وبالعكس)،
// ويميّز التاء المربوطة من المفتوحة، وشكل الهمزة، والتنوين. خمسة مستويات، والأخير مع التشكيل.
// المساعدة: زر «💡 مساعدة» (أو الزر الأيسر في اليد): مرة يضيء الحرف المطلوب، ومرة ثانية يكتبه.
// «🔊 اسمع» (أو الزر العلوي): ينطق الكلمة بصوت السيرفر (espeak-ng) إن لم يكن في المتصفح صوت عربي.
(() => {
  "use strict";
  const GAME = "لغتي العربية";
  const D = window.LUGHATI;
  const save = K.store("lughati", { best: {}, done: {}, lv: 0, topic: "all" });
  const AUTHOR = "SEFRANI HUSSEIN";

  // ---------------------------------------------------------------- الحروف والتشكيل
  const MARKS = "ًٌٍَُِّْ";          // ً ٌ ٍ َ ُ ِ ّ ْ
  const isMark = (c) => MARKS.includes(c);
  const HAMZA = "أإآءؤئ";
  const BASIC = "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ة ى".split(" ");
  const ORDER = BASIC.concat([..."أإآءؤئ"]);
  const MARK_KEYS = ["َ", "ُ", "ِ", "ْ", "ّ", "ً", "ٌ", "ٍ"];
  const NAME = {
    "ا": "أَلِف", "ب": "بَاء", "ت": "تَاء", "ث": "ثَاء", "ج": "جِيم", "ح": "حَاء", "خ": "خَاء", "د": "دَال", "ذ": "ذَال",
    "ر": "رَاء", "ز": "زَاي", "س": "سِين", "ش": "شِين", "ص": "صَاد", "ض": "ضَاد", "ط": "طَاء", "ظ": "ظَاء", "ع": "عَيْن",
    "غ": "غَيْن", "ف": "فَاء", "ق": "قَاف", "ك": "كَاف", "ل": "لَام", "م": "مِيم", "ن": "نُون", "ه": "هَاء", "و": "وَاو",
    "ي": "يَاء", "ة": "تَاء مَرْبُوطَة", "ى": "أَلِف مَقْصُورَة", "أ": "هَمْزَة عَلَى أَلِف", "إ": "هَمْزَة تَحْتَ الأَلِف",
    "آ": "أَلِف مَمْدُودَة", "ء": "هَمْزَة", "ؤ": "هَمْزَة عَلَى وَاو", "ئ": "هَمْزَة عَلَى نَبْرَة",
    "َ": "فَتْحَة", "ُ": "ضَمَّة", "ِ": "كَسْرَة", "ْ": "سُكُون", "ّ": "شَدَّة",
    "ً": "تَنْوِين فَتْح", "ٌ": "تَنْوِين ضَمّ", "ٍ": "تَنْوِين كَسْر", " ": "مَسَافَة",
  };
  const strip = (s) => Array.from(s).filter((c) => !isMark(c)).join("");
  const show = (c) => (isMark(c) ? "◌" + c : c === " " ? "␣" : c);   // ◌َ للتشكيل وحده
  // الكلمة ← مجموعات: الحرف وعلامات تشكيله (بأي ترتيب)
  function groups(word, marks) {
    const out = [];
    for (const c of Array.from(word.normalize("NFC"))) {
      if (isMark(c)) { if (marks && out.length) out[out.length - 1].m.push(c); }
      else out.push({ b: c, m: [] });
    }
    return out;
  }
  // حروف متشابهة الشكل: للمشتّتات في «ركّب» ولوحة الحروف الصغيرة
  const LIKE = ["بتثني", "جحخ", "دذ", "رز", "سش", "صض", "طظ", "عغ", "فق", "هة", "اى"];
  const like = (c) => { const g = LIKE.find((x) => x.includes(c)); return g ? [...g].filter((x) => x !== c) : []; };

  // ---------------------------------------------------------------- المستويات
  const LEVELS = [
    { n: "مبتدئ", sub: "كلمات من حرفين أو ثلاثة", e: "🐣", bg: "linear-gradient(135deg,#4ade80,#16a34a)", min: 2, max: 3, keys: 8 },
    { n: "سهل", sub: "كلمات من أربعة أحرف", e: "🐥", bg: "linear-gradient(135deg,#38bdf8,#2563eb)", min: 4, max: 4, keys: 12 },
    { n: "متوسط", sub: "كلمات أطول ولوحة الحروف كاملة", e: "🦊", bg: "linear-gradient(135deg,#fbbf24,#f97316)", min: 5, max: 99, keys: 0 },
    { n: "صعب", sub: "جمل، والتاء، والهمزة، والتنوين", e: "🦅", bg: "linear-gradient(135deg,#f472b6,#db2777)", hard: true },
    { n: "محترف", sub: "مع التشكيل", e: "🏆", bg: "linear-gradient(135deg,#a78bfa,#6d28d9)", hard: true, marks: true },
  ];
  const hasHamza = (w) => [...HAMZA].some((h) => w.includes(h));
  function wordsFor(lv) {
    const L = LEVELS[lv];
    if (L.hard) return D.words.filter((w) => strip(w[0]).length >= 3);
    return D.words.filter((w) => !hasHamza(w[0]) && !w[0].includes(" ") && (() => { const n = groups(w[0]).length; return n >= L.min && n <= L.max; })());
  }
  // لا تتكرر الكلمة حتى تنتهي كلمات المستوى
  function take(list, key, n) {
    let used = (save.used && save.used[key]) || [];
    let left = list.filter((w) => !used.includes(w[0]));
    if (left.length < n) { used = []; left = list.slice(); }
    const out = K.shuffle(left).slice(0, n);
    save.used = save.used || {};
    save.used[key] = used.concat(out.map((w) => w[0])).slice(-200);
    return out;
  }

  // الصورة: رمز ملون، أو صورة حقيقية (كلماتي، ووجوه العائلة)
  const pic = (w) => (w[1] && /^(\/|[^\s]+\.(jpe?g|png|webp|gif)$|كلماتي\/)/i.test(w[1])
    ? `<img class="pic photo" src="${K.esc(w[1])}" alt="">` : `<span class="emo pic">${w[1] || "💬"}</span>`);

  // ---------------------------------------------------------------- المواضيع (البند 59)
  const TOPICS = [["all", "كل الكلمات", "📚"], ...Object.entries(D.topics).map(([k, t]) => [k, t.n, t.e]),
    ["people", "أسماء عائلتي", "🙂"], ["mine", "كلماتي", "🖼️"]];
  const topicName = (id) => (TOPICS.find((t) => t[0] === id) || TOPICS[0])[1];
  const okWord = (s) => /^[\u0621-\u064A\u064B-\u0652 ]+$/.test(s) && strip(s).replace(/ /g, "").length >= 2;
  async function topicWords(id) {
    if (D.topics[id]) return D.topics[id].words;
    if (id === "mine") {        // صور في مجلد «كلماتي» داخل مجلد اللعبة، واسم الصورة هو الكلمة
      const ims = await K.listImages("كلماتي");
      return ims.map((x) => [x.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(), x.url]).filter((w) => okWord(w[0]));
    }
    if (id === "people") {      // اسم الطفل، والأشخاص الذين سمّاهم الأهل في «الصور ← الأشخاص»
      const out = [];
      try { const r = await fetch("/api/tv/home", { credentials: "same-origin" }); if (r.ok) { const n = ((await r.json()).user || {}).name || ""; const f = n.trim().split(/\s+/)[0]; if (okWord(f)) out.push([f, "⭐"]); } } catch {}
      try { const r = await fetch("/api/tv/family/people?limit=30&faces=1", { credentials: "same-origin" });
        if (r.ok) for (const x of (await r.json()).people || []) if (okWord(x.name.trim()) && !out.some((w) => w[0] === x.name.trim())) out.push([x.name.trim(), `/api/tv/face/${x.faces[0]}`]); } catch {}
      return out;
    }
    return null;
  }
  function topics() {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">اختر الموضوع</h2><span></span></div>
      <div class="topics">${TOPICS.map(([id, n, e]) => `<button class="topic f ${id === save.topic ? "on" : ""}" ${K.act("t-" + id, () => { save.topic = id; save.save(); K.back(); })}>
        <span class="emo">${e}</span><b>${n}</b></button>`).join("")}</div>
      <p class="tip">«كلماتي»: ضع صوراً في المجلد «كلماتي» داخل مجلد اللعبة (في «التعليم»)، واسم كل صورة هو الكلمة، مثل «جدّو.jpg».
        «أسماء عائلتي»: اسم الطفل، والأشخاص الذين سمّيتموهم في تطبيق «الصور» ← «الأشخاص».</p>${K.HELP}`, "t-" + save.topic);
  }

  // ---------------------------------------------------------------- الصوت
  const say = (t, rate = 0.8) => { if (t) K.tts(t, "ar", rate); };
  const report = (topic, ok) => {
    if (!K.gameInfo()) return;
    fetch("/api/tv/learn/result", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: GAME, topic: String(topic).slice(0, 80), ok }) }).catch(() => {});
  };

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    K.paint(`<div class="title"><span class="mascot emo">📝</span><div><h1>لغتي العربية</h1><div class="sub">قطّع الكلمة إلى حروفها، وركّب الحروف في كلمة!</div></div></div>
      <div class="demo"><span class="emo">🚗</span><b>سيارة</b><span class="arr">←</span>${["س", "ي", "ا", "ر", "ة"].map((c) => `<span class="box on">${c}</span>`).join("")}</div>
      <div class="modes lv">${LEVELS.map((L, i) => `<button class="mode f" style="background:${L.bg}" ${K.act("l" + i, () => { save.lv = i; save.save(); K.show(lesson, i); })}>
        <span class="big emo">${L.e}</span><b>${i + 1}. ${L.n}</b><small>${L.sub}</small>
        <span class="best">${save.best[i] ? K.starsHtml(save.best[i]) : "ابدأ!"}</span></button>`).join("")}</div>
      <div class="row2"><button class="btn f topic-btn" ${K.act("topic", () => K.show(topics))}><span class="emo">${(TOPICS.find((t) => t[0] === save.topic) || TOPICS[0])[2]}</span> الموضوع: <b>${topicName(save.topic)}</b></button>
        <span class="author" dir="ltr">${AUTHOR}</span></div>
      ${K.HELP}`, "l" + (save.lv || 0));
  }

  // ---------------------------------------------------------------- الدرس: 10 أسئلة
  function makeLesson(lv, tw) {
    const L = LEVELS[lv], Q = [];
    if (tw) {                 // موضوع: قطّع وركّب بكلماته (التاء والهمزة والتنوين في «كل الكلمات» فقط)
      const ws = take(tw, "t-" + save.topic, Math.min(10, tw.length));
      while (ws.length < 10 && tw.length) ws.push(K.pick(tw));
      ws.forEach((w, i) => Q.push({ t: i % 5 === 3 || i % 5 === 1 ? "join" : "spell", w }));
      return K.shuffle(Q);
    }
    if (!L.hard) {
      const ws = take(wordsFor(lv), "w" + lv, 10);
      ws.forEach((w, i) => Q.push({ t: i % 5 === 3 || i % 5 === 1 ? "join" : "spell", w }));
      return K.shuffle(Q);
    }
    const ws = take(wordsFor(lv), "w" + lv, 4);
    ws.slice(0, 2).forEach((w) => Q.push({ t: "spell", w }));
    Q.push({ t: "spell", w: K.pick(D.sentences) });
    ws.slice(2, 4).forEach((w) => Q.push({ t: "join", w }));
    // سؤال بتاء مربوطة وآخر بتاء مفتوحة (أو هاء)، وهمزتان مختلفتان
    Q.push({ t: "ta", w: K.pick(D.ta.filter((x) => strip(x[0]).endsWith("ة"))) }, { t: "ta", w: K.pick(D.ta.filter((x) => !strip(x[0]).endsWith("ة"))) });
    const hz = K.shuffle(D.hamza);
    Q.push({ t: "hamza", w: hz[0] }, { t: "hamza", w: hz[1] });
    Q.push({ t: "tan", w: K.pick(D.tanween) });
    return K.shuffle(Q).slice(0, 10);
  }

  async function lesson(lv) {
    const L = LEVELS[lv];
    const topic = save.topic || "all";
    let tw = null;
    if (topic !== "all") {
      K.begin(); K.paint(`<div class="top">${K.backBtn()}<span></span></div><h2 class="ask">جارٍ التحضير…</h2>`);
      const shown = K.top();
      tw = await topicWords(topic);
      if (K.top() !== shown) return;
      if (!tw || tw.length < 3) {
        K.begin();
        K.paint(`<div class="top">${K.backBtn()}<span class="pill">${K.esc(topicName(topic))}</span><span></span></div>
          <h2 class="ask">لا توجد كلمات كافية في هذا الموضوع بعد 🙂</h2>
          <p class="tip">${topic === "mine" ? "ضعوا صوراً في المجلد «كلماتي» داخل مجلد اللعبة (في «التعليم»)، واسم كل صورة هو الكلمة بالعربية، مثل «جدّو.jpg» أو «مطبخنا.jpg»."
            : "سمّوا الأشخاص في تطبيق «الصور» ← «الأشخاص» على الهاتف أو الكمبيوتر، فتظهر أسماؤهم هنا مع صورهم."}</p>
          <div class="nav"><button class="btn f go" ${K.act("tp", () => K.replace(topics))}>اختر موضوعاً آخر</button></div>`, "tp");
        return;
      }
    }
    const S = { lv, qs: makeLesson(lv, tw), i: 0, score: 0, res: [] };
    save.save();
    // الأزرار الإضافية في اليد: الأيسر (2) مساعدة، والعلوي (3) اسمع
    const held = { h: false, s: false };
    K.mode = {
      key(e) { return S.key ? S.key(e) : false; },
      poll(pads) {
        const on = (i) => pads.some((g) => g.buttons[i] && g.buttons[i].pressed);
        const h = on(2), s = on(3);
        if (h && !held.h && S.help) S.help();
        if (s && !held.s && S.listen) S.listen();
        held.h = h; held.s = s;
        return false;
      },
    };
    next();

    function next() {
      if (S.i >= S.qs.length) return finish();
      K.top().focus = null;
      const q = S.qs[S.i];
      S.key = S.help = S.listen = null;
      ({ spell, join, ta: pick, hamza: pick, tan: pick })[q.t](q);
    }
    function dots() {
      return `<div class="dots">${S.qs.map((_, k) => `<i class="${k < S.i ? (S.res[k] ? "ok" : "") : k === S.i ? "now" : ""}"></i>`).join("")}</div>`;
    }
    function top(title) {
      return `<div class="top">${K.backBtn()}<span class="pill">${L.e} ${L.n}</span>${dots()}
        <button class="btn f" ${K.act("say", () => S.listen && S.listen())}><span class="emo">🔊</span> اسمع</button></div>
        <h2 class="ask">${title}</h2>`;
    }
    function done(ok, topic) {
      S.res[S.i] = ok;
      if (ok) S.score++;
      report(topic, ok);
      S.i++;
      K.later(next, ok ? 1300 : 2200);
    }
    function finish() {
      K.mode = null;
      const s = K.starsFor(S.score, S.qs.length);
      save.best[lv] = Math.max(save.best[lv] || 0, s);
      save.done[lv] = (save.done[lv] || 0) + 1;
      save.save();
      K.resultScreen({
        s, score: S.score, total: S.qs.length, title: `لغتي العربية — المستوى ${lv + 1}${topic !== "all" ? " · " + topicName(topic) : ""}`,
        again: () => K.replace(lesson, lv),
        next: lv < LEVELS.length - 1 ? { label: `المستوى ${lv + 2}`, fn: () => { save.lv = lv + 1; save.save(); K.replace(lesson, lv + 1); } } : null,
      });
    }

    // ---------------------------------------------------------- قطّع: الطفل يكتب حروف الكلمة واحداً واحداً
    function spell(q) {
      K.begin();
      const word = L.marks ? q.w[0] : strip(q.w[0]);
      const G = groups(word, !!L.marks);
      const sentence = word.includes(" ");
      // لوحة الحروف: صغيرة في المستويين 1 و2 (حروف الكلمة وحروف تشبهها)، وكاملة بعدهما
      let keys;
      const need = [...new Set(G.map((g) => g.b).filter((c) => c !== " "))];
      if (L.keys) {
        const extra = K.shuffle([...new Set(need.flatMap(like).concat(K.shuffle(BASIC)))].filter((c) => !need.includes(c)));
        const pickd = extra.slice(0, Math.max(3, L.keys - need.length));
        keys = ORDER.filter((c) => need.includes(c) || pickd.includes(c));
      } else {
        keys = BASIC.slice();
        if (L.hard || need.some((c) => HAMZA.includes(c))) keys.push(..."أإآءؤئ");
      }
      if (L.marks && G.some((g) => g.m.length)) keys.push(...MARK_KEYS);
      if (sentence) keys.push(" ");
      const st = { g: 0, m: [], miss: 0, slotMiss: 0, helped: 0, hintOn: false, done: false };
      K.paint(`${top(sentence ? "اكتب حرفاً حرفاً (مع المسافة)" : "اكتب حروف الكلمة")}
        <div class="stage">${pic(q.w)}<b class="word ${L.marks ? "marked" : ""}">${K.esc(word)}</b></div>
        <div class="boxes ${G.length > 9 ? "long" : ""} ${G.length > 13 ? "xlong" : ""}">${G.map((g) => `<span class="box ${g.b === " " ? "sp" : ""}"></span>`).join("")}</div>
        <div class="keys ${keys.length <= 12 ? "few" : ""}">${keys.map((k, i) => `<button class="key f ${isMark(k) ? "mk" : ""} ${k === " " ? "space" : ""}" data-c="${k}" ${K.act("k" + i, () => type(k))}>${show(k)}</button>`).join("")}
          <button class="key f tool" ${K.act("del", erase)}>⌫</button><button class="key f tool help" ${K.act("help", help)}>💡</button></div>
        <div class="cheer"></div>`, "k0");
      const $ = (s) => K.app.querySelector(s);
      const boxes = [...K.app.querySelectorAll(".box")];
      const keyEl = (c) => K.app.querySelector(`.key[data-c="${c}"]`);
      const want = () => { const g = G[st.g]; if (!g) return null; if (st.m.length === 0 && !st.started) return g.b; return g.m.find((m) => !st.m.includes(m)) || null; };
      S.listen = () => say(q.w[0]);
      S.help = help;
      S.key = (e) => {
        // «رجوع» (الزر الأيمن أو Backspace) يمسح آخر حرف؛ وإن لم يُكتب شيء يرجع إلى القائمة
        if (e.key === "Backspace") { if (st.g || st.started) { erase(); return true; } return false; }
        if (e.pad) return false;
        if (e.key === "?" || e.key === "؟") { help(); return true; }
        const c = e.key && e.key.length === 1 ? e.key : null;
        if (c && (BASIC.includes(c) || HAMZA.includes(c) || isMark(c) || (c === " " && sentence))) { type(c); return true; }
        return false;
      };
      say(q.w[0]);
      paintBoxes();

      function paintBoxes() {
        boxes.forEach((b, i) => {
          const g = G[i];
          if (i < st.g) { b.textContent = g.b === " " ? "" : g.b + g.m.join(""); b.className = "box on" + (g.b === " " ? " sp" : ""); }
          else if (i === st.g) { b.textContent = st.started ? g.b + st.m.join("") : ""; b.className = "box now" + (g.b === " " ? " sp" : ""); }
          else { b.textContent = ""; b.className = "box" + (g.b === " " ? " sp" : ""); }
        });
      }
      function glow() {
        K.app.querySelectorAll(".key.glow").forEach((k) => k.classList.remove("glow"));
        const w = want(), el = w != null && keyEl(w);
        if (el) { el.classList.add("glow"); K.focus(el); }
      }
      function step() {           // اكتمل الحرف الحالي (مع تشكيله)؟ ننتقل للتالي
        const g = G[st.g];
        if (st.started && g.m.every((m) => st.m.includes(m))) { st.g++; st.m = []; st.started = false; st.slotMiss = 0; st.hintOn = false; }
        paintBoxes();
        if (st.g >= G.length) win();
        else if (st.hintOn || st.slotMiss >= 2) glow();
      }
      function type(c) {
        if (st.done) return;
        const w = want();
        if (c === w) {
          if (!st.started) st.started = true; else st.m.push(c);
          K.sfx.pop();
          K.app.querySelectorAll(".key.glow").forEach((k) => k.classList.remove("glow"));
          if (lv < 2 && NAME[c]) say(NAME[c], 0.95);
          $(".cheer").textContent = "";
          step();
        } else {
          st.miss++; st.slotMiss++;
          K.sfx.bad();
          const el = keyEl(c); if (el) { el.classList.remove("bad"); void el.offsetWidth; el.classList.add("bad"); }
          const g = G[st.g];
          $(".cheer").textContent = !st.started && g && strip(c) && like(g.b).includes(c) ? "قريب! انظر إلى النقاط 👀" : isMark(w || "") ? "انتبه إلى التشكيل ✍️" : "حاول مرة أخرى 💪";
          if (st.slotMiss >= 2) glow();
        }
      }
      function erase() {
        if (st.done) return;
        if (st.m.length) st.m.pop();
        else if (st.started) st.started = false;
        else if (st.g > 0) { st.g--; st.m = G[st.g].m.slice(); st.started = true; if (st.m.length) st.m.pop(); else st.started = false; }
        paintBoxes();
      }
      function help() {
        if (st.done) return;
        const w = want();
        if (w == null) return;
        if (!st.hintOn) { st.hintOn = true; glow(); say(NAME[w] || w, 0.95); $(".cheer").textContent = `💡 ابحث عن: ${show(w)} (${strip(NAME[w] || w)})`; return; }
        st.helped++; type(w);
      }
      function win() {
        st.done = true;
        const ok = st.miss === 0 && st.helped === 0;
        K.sfx.win(); K.confetti(ok ? 18 : 8);
        $(".cheer").innerHTML = `${ok ? K.pick(["أحسنت! 👏", "ممتاز! 🌟", "بطل! 🏆"]) : "أكملتها! 💪"} <span class="spelled">${G.map((g) => (g.b === " " ? "·" : g.b + g.m.join(""))).join(" ")}</span>`;
        say(q.w[0]);
        done(ok, strip(q.w[0]));
      }
    }

    // ---------------------------------------------------------- ركّب: الحروف متفرقة، والطفل يختار الكلمة الموصولة
    function join(q) {
      const word = L.marks ? q.w[0] : strip(q.w[0]);
      const G = groups(word, !!L.marks);
      const make = (gs) => gs.map((g) => g.b + g.m.join("")).join("");
      const wrong = new Set();
      for (let t = 0; t < 60 && wrong.size < 3; t++) {
        const gs = G.map((g) => ({ b: g.b, m: g.m.slice() }));
        const r = Math.random(), i = (Math.random() * gs.length) | 0;
        if (r < 0.4 && gs.length > 2) { const j = Math.min(gs.length - 1, i + 1); if (i !== j) [gs[i], gs[j]] = [gs[j], gs[i]]; }
        else if (r < 0.8 && like(gs[i].b).length) gs[i].b = K.pick(like(gs[i].b));
        else if (L.marks && gs[i].m.length) gs[i].m = [K.pick(["َ", "ُ", "ِ"].filter((m) => !gs[i].m.includes(m)))];
        else continue;
        const w = make(gs);
        if (w !== word) wrong.add(w);
      }
      const opts = K.shuffle([word, ...wrong].slice(0, 4));
      choice(q, "ركّب الحروف: أي كلمة هي؟", `<div class="sep">${G.map((g) => `<span>${K.esc(g.b === " " ? "␣" : g.b + g.m.join(""))}</span>`).join("")}</div>`,
        opts, opts.indexOf(word), q.w[0], null);
    }

    // ---------------------------------------------------------- التاء، والهمزة، والتنوين
    function pick(q) {
      const word = L.marks ? q.w[0] : strip(q.w[0]);
      if (q.t === "ta") {
        const last = strip(word).slice(-1), stem = word.replace(/[ةته][ً-ْ]*$/, "");
        const opts = ["ة", "ت", "ه"];
        choice(q, "أي حرف في آخر الكلمة؟", `<b class="word">${K.esc(stem)}<span class="gap">؟</span></b>`, opts, opts.indexOf(last), q.w[0],
          last === "ة" ? "التاء المربوطة (ة) نلفظها هاءً إذا وقفنا عليها: مدرسه ← مدرسة" : last === "ت" ? "التاء المفتوحة (ت) تبقى تاءً إذا وقفنا عليها" : "هذه هاء أصلية: نلفظها هاءً دائماً");
      } else if (q.t === "hamza") {
        const plain = strip(word), pos = [...plain].findIndex((c) => HAMZA.includes(c)), h = plain[pos];
        const opts = K.shuffle(["أ", "إ", "ء", "ؤ", "ئ"].filter((x) => x !== h)).slice(0, 3).concat(h);
        const shown = K.shuffle(opts);
        choice(q, "اختر شكل الهمزة الصحيح", `<b class="word">${K.esc(plain.slice(0, pos))}<span class="gap">؟</span>${K.esc(plain.slice(pos + 1))}</b>`,
          shown, shown.indexOf(h), q.w[0], `الهمزة هنا: ${h} (${strip(NAME[h])})`);
      } else {
        const base = strip(word).replace(/[ً-ْ]+$/, "");
        const right = (L.marks ? q.w[0] : base) + "ٌ";
        const opts = K.shuffle([right, base + "ن", base + "ُن", base + "ُنْ"]);
        choice(q, "أي كتابة للتنوين صحيحة؟", `<div class="sub2">نقول «${K.esc(base)}ُن»، فكيف نكتبها؟</div>`, opts, opts.indexOf(right), right,
          "التنوين نسمعه نوناً، لكننا نكتبه علامة (ٌ ً ٍ) وليس حرف ن");
      }
    }

    // ---------------------------------------------------------- سؤال اختيار من متعدد
    function choice(q, title, middle, opts, answer, speak, why) {
      K.begin();
      const st = { wrong: false, locked: false };
      K.paint(`${top(title)}
        <div class="stage">${pic(q.w)}${middle}</div>
        <div class="opts ${opts.every((o) => strip(o).length <= 1) ? "small" : ""}">${opts.map((o, j) => `<button class="opt f" ${K.act("o" + j, (el) => pickOpt(j, el))}>${K.esc(o)}</button>`).join("")}</div>
        <div class="cheer"></div>`, "o0");
      S.listen = () => say(speak);
      S.help = () => {       // المساعدة: تشطب خياراً خاطئاً
        const els = [...K.app.querySelectorAll(".opt")].filter((e, j) => j !== answer && !e.dataset.dead);
        if (els.length > 1) { const e = K.pick(els); e.dataset.dead = "1"; e.classList.add("dead"); st.wrong = true; K.app.querySelector(".cheer").textContent = "💡 حذفنا خياراً خاطئاً"; }
      };
      S.key = (e) => (e.key === "Backspace" ? true : false);
      say(speak);
      function pickOpt(j, el) {
        if (st.locked || el.dataset.dead) return;
        const cheer = K.app.querySelector(".cheer");
        if (j === answer) {
          st.locked = true; el.classList.add("ok"); K.sfx.ok(); K.confetti(8);
          cheer.innerHTML = `${st.wrong ? "صحيح ✅" : K.pick(["أحسنت! 👏", "رائع! 🌟", "صحيح! ✅"])}${why ? `<div class="why">${K.esc(why)}</div>` : ""}`;
          say(speak);
          done(!st.wrong, strip(q.w[0]) + (q.t === "join" ? "" : " (" + q.t + ")"));
        } else {
          st.wrong = true; el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad();
          cheer.textContent = "حاول مرة أخرى 💪";
        }
      }
    }
  }

  K.start(home);
})();
