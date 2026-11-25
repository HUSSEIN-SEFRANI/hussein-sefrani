// أحكام التجويد — درس لكل باب (تعلّم الأحكام بأمثلة من القرآن ثم تدرّب)، و«التحدي الكبير» يجمع كل الأبواب
// الأزرار بالموقع (البند 52): السفلي اختيار، الأيمن رجوع، الأيسر «اسمع»، العلوي «تلميح/مثال آخر».
// لوحة المفاتيح: الأسهم وEnter وBackspace، و S للسماع، و H للتلميح.
(() => {
  "use strict";
  const CATS = window.TAJWEED, LET = window.TAJWEED_LETTERS, AY = window.AYAT;
  const save = K.store("tajweed", { best: {}, seen: {} });
  const ar = (n) => Number(n).toLocaleString("ar-EG");
  const HELP = `<div class="help">الأسهم للتنقل · <b>الزر السفلي</b> أو Enter للاختيار · <b>الأيمن</b> أو Backspace للرجوع · <b>الأيسر</b> (S) اسمع · <b>العلوي</b> (H) تلميح</div>`;
  const ruleOf = (id) => { for (const c of CATS) for (const r of c.rules) if (r.id === id) return { c, r }; return null; };

  // ---------------------------------------------------------------- الزران الإضافيان (الأيسر 2 والعلوي 3)
  function extras(map) {
    let was = null;   // زر ما زال مضغوطاً من الشاشة السابقة لا يُحسب ضغطة جديدة
    K.mode = {
      key(e) {
        if (e.pad) return false;
        const k = (e.key || "").toLowerCase();
        if ((k === "s" || k === "س") && map.left) { map.left(); return true; }
        if ((k === "h" || k === "ا") && map.top) { map.top(); return true; }
        return false;
      },
      poll(pads) {
        const b = (i) => pads.some((g) => g.buttons[i] && g.buttons[i].pressed);
        const l = b(2), t = b(3);
        if (!was) { was = { l, t }; return false; }
        if (l && !was.l && map.left) map.left();
        if (t && !was.t && map.top) map.top();
        was.l = l; was.t = t;
        return false;   // التوجيه والموافقة والرجوع يبقى لـ kit
      },
    };
  }
  // «مرة أخرى» في شاشة النتيجة تنادي K.quizScreen من جديد: نعيد الزرين الإضافيين معها
  const baseQuiz = K.quizScreen;
  K.quizScreen = (o) => { baseQuiz(o); if (o.extras) o.extras(); };

  // ---------------------------------------------------------------- عرض الآية مع تلوين الكلمات
  function ayahHtml(ex, color) {
    const [ref, a, b, c] = ex, A = AY[ref];
    const w = A.t.split(" ").map((x, i) => {
      if (i >= a && i <= b) return `<span class="hl" style="--c:${color || "#f59e0b"}">${x}</span>`;
      if (c !== undefined && i === c) return `<span class="hl2">${x}</span>`;
      return x;
    });
    return `<div class="ayah qr">${w.join(" ")}</div><div class="ref">سورة ${A.s} · الآية ${ar(ref.split(":")[1])}</div>`;
  }

  // ---------------------------------------------------------------- القائمة الرئيسية
  function home() {
    K.begin();
    const card = (c, i) => {
      const s = save.best[c.id] || 0;
      return `<button class="lesson f" style="background:${c.bg}" ${K.act("c" + i, () => K.show(lesson, c))}>
        <span class="ic qr">${c.icon}</span><b>${c.name}</b><span class="st">${K.starsHtml(s)}</span></button>`;
    };
    const all = save.best.all || 0;
    K.paint(`
      <div class="top"><span></span>
        <div class="title"><span class="mascot emo">📖</span><h1>أحكام التجويد</h1></div><span></span></div>
      <div class="sub">تعلّم الحكم، وانظر مثاله في القرآن، ثم تدرّب</div>
      <div class="lessons">${CATS.map(card).join("")}
        <button class="lesson f big" style="background:linear-gradient(135deg,#facc15,#d97706)" ${K.act("all", () => K.show(quiz, null))}>
          <span class="ic emo">🏆</span><b>التحدي الكبير</b><span class="st">${K.starsHtml(all)}</span></button>
      </div>
      ${HELP}`, "c0");
  }

  // ---------------------------------------------------------------- صفحة الباب: الأحكام
  function lesson(c) {
    K.begin();
    const say = () => K.tts(c.name + ". " + c.intro);
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="ltitle">${c.name}</h2>
        <button class="btn f" ${K.act("say", say)}><span class="emo">🔊</span> اسمع</button></div>
      <div class="intro">${c.intro}</div>
      <div class="rules n${c.rules.length}">${c.rules.map((r, i) => `
        <button class="rule f" style="--c:${r.color}" ${K.act("r" + i, () => K.show(ruleScreen, c, i, 0))}>
          <b>${r.name}</b><span class="lt">${r.letters}</span>${save.seen[r.id] ? `<i class="seen">✓</i>` : ""}</button>`).join("")}
      </div>
      <div class="nav"><button class="btn f go" ${K.act("quiz", () => K.show(quiz, c))}><span class="emo">📝</span> تدرّب على ${c.short}</button></div>
      ${HELP}`, "r0");
    extras({ left: say, top: () => K.show(quiz, c) });
  }

  // ---------------------------------------------------------------- صفحة الحكم: الشرح ومثال من القرآن
  function ruleScreen(c, i, e) {
    K.begin();
    const r = c.rules[i], ex = r.ex[e % r.ex.length];
    if (!save.seen[r.id]) { save.seen[r.id] = 1; save.save(); }
    const go = (j) => K.replace(ruleScreen, c, (j + c.rules.length) % c.rules.length, 0);
    const another = () => { K.top().args[2] = e + 1; K.top().focus = "more"; K.render(); };
    const say = () => K.tts(`${r.name}. ${r.how}`);
    const chips = r.letters.split(" ").map((x) => `<span class="chip qr">${x}</span>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill">${c.name}</span><span class="pill">${ar(i + 1)} / ${ar(c.rules.length)}</span></div>
      <h1 class="rname" style="color:${r.color}">${r.name}</h1>
      <div class="chips">${chips}</div>
      <div class="how">${r.how}</div>
      <div class="mushaf">${ayahHtml(ex, r.color)}<div class="exn">مثال ${ar(e % r.ex.length + 1)} من ${ar(r.ex.length)}</div></div>
      <div class="nav">
        <button class="btn f" ${K.act("prev", () => go(i - 1))}>→ السابق</button>
        <button class="btn f" ${K.act("say", say)}><span class="emo">🔊</span> اسمع</button>
        <button class="btn f" ${K.act("more", another)}><span class="emo">🔄</span> مثال آخر</button>
        <button class="btn f go" ${K.act("next", () => go(i + 1))}>التالي ←</button>
      </div>
      ${HELP}`, "next");
    extras({ left: say, top: another });
    say();
  }

  // ---------------------------------------------------------------- الأسئلة
  const ruleOpt = (r) => `<span class="rn">${r.name}</span><small class="rl">${r.letters}</small>`;
  // سؤال: الكلمة الملوّنة في الآية ← أي حكم؟
  function ayahQ(c, r, ex) {
    const opts = c.rules;
    return {
      prompt: `<div class="col"><div class="q">${c.q}</div>${ayahHtml(ex)}<div class="why"></div></div>`,
      opts: opts.map(ruleOpt), answer: opts.indexOf(r), topic: `${r.name} ${ex[0]}`,
      say: () => K.tts(c.q),
      reveal: (app) => {
        app.querySelectorAll(".prompt .hl").forEach((h) => h.style.setProperty("--c", r.color));
        const w = app.querySelector(".why"); if (w) { w.textContent = r.how; w.style.color = r.color; }
      },
    };
  }
  // سؤال: نْ + حرف ← أي حكم؟
  function letterQ(c) {
    const m = LET[c.id], rid = K.pick(Object.keys(m)), r = c.rules.find((x) => x.id === rid);
    const ch = K.pick([...m[rid]]);
    const show = c.id === "lam" ? `<span class="qr big">ٱلـ<b>${ch}</b></span>` : `<span class="qr big">${c.mark} + <b>${ch}</b></span>`;
    const q = c.id === "lam" ? `«ال» قبل حرف ${ch}: شمسية أم قمرية؟` : `${c.mark === "نْ" ? "نون ساكنة" : "ميم ساكنة"} بعدها حرف ${ch}: ما الحكم؟`;
    return {
      prompt: `<div class="col"><div class="q">${q}</div>${show}<div class="why"></div></div>`,
      opts: c.rules.map(ruleOpt), answer: c.rules.indexOf(r), topic: `${c.mark || ""} ${ch}`,
      say: () => K.tts(q),
      reveal: (app) => { const w = app.querySelector(".why"); w.textContent = `${r.name}: ${r.how}`; w.style.color = r.color; },
    };
  }
  // سؤال: الوصف ← اسم الحكم
  function defQ(c, r) {
    const q = "ما اسم هذا الحكم؟";
    return {
      prompt: `<div class="col"><div class="q">${q}</div><div class="def">${r.def}</div><div class="why"></div></div>`,
      opts: c.rules.map(ruleOpt), answer: c.rules.indexOf(r), topic: r.name,
      say: () => K.tts(r.def),
      reveal: (app) => { const w = app.querySelector(".why"); w.textContent = r.how; w.style.color = r.color; },
    };
  }
  // سؤال القلقلة: أي حرف من «قطب جد»؟
  function qalLetterQ() {
    const right = K.pick([..."قطبجد"]);
    const others = K.shuffle([..."سشصضعغفكلمنهويرزحخت"]).slice(0, 3);
    const opts = K.shuffle([right, ...others]);
    const q = "أي هذه الحروف من حروف القلقلة؟";
    return {
      prompt: `<div class="col"><div class="q">${q}</div><div class="def">تذكّر الكلمتين: قُطْبُ جَدٍ</div><div class="why"></div></div>`,
      opts: opts.map((x) => `<span class="qr letter">${x}</span>`), answer: opts.indexOf(right), topic: "حروف القلقلة " + right,
      say: () => K.tts(q),
      reveal: (app) => { app.querySelector(".why").textContent = "حروف القلقلة: ق ط ب ج د"; },
    };
  }

  function makeQuestions(c) {
    const list = [];
    const cats = c ? [c] : CATS;
    const ayahPool = [];
    for (const k of cats) for (const r of k.rules) for (const ex of r.ex) ayahPool.push(() => ayahQ(k, r, ex));
    if (c) {
      // درس واحد: 6 أمثلة من القرآن (من كل حكم مثال على الأقل)، ثم أسئلة الحروف والوصف
      const firsts = K.shuffle(c.rules).map((r) => () => ayahQ(c, r, K.pick(r.ex)));
      const used = new Set();
      const ay = [], want = LET[c.id] || c.id === "qal" ? 6 : 8;
      for (const f of [...firsts, ...K.shuffle(ayahPool)]) { if (ay.length >= want) break; const q = f(); if (used.has(q.topic)) continue; used.add(q.topic); ay.push(q); }
      list.push(...ay);
      if (LET[c.id]) list.push(letterQ(c), letterQ(c));
      else if (c.id === "qal") list.push(qalLetterQ(), qalLetterQ());
      for (const r of K.shuffle(c.rules).slice(0, 2)) list.push(defQ(c, r));
      return K.shuffle(list).slice(0, 10);
    }
    // التحدي الكبير: 12 سؤالاً من كل الأبواب
    const used = new Set();
    for (const f of K.shuffle(ayahPool)) { if (list.length >= 9) break; const q = f(); if (used.has(q.topic)) continue; used.add(q.topic); list.push(q); }
    const lc = K.shuffle(CATS.filter((k) => LET[k.id])).slice(0, 2);
    for (const k of lc) list.push(letterQ(k));
    const dk = K.pick(CATS); list.push(defQ(dk, K.pick(dk.rules)));
    return K.shuffle(list);
  }

  function learnResult(topic, ok) {
    if (!K.gameInfo()) return;
    fetch("/api/tv/learn/result", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: document.title, topic: String(topic).slice(0, 80), ok }) }).catch(() => {});
  }

  let lastSay = null;
  function quiz(c) {
    const id = c ? c.id : "all";
    const idx = c ? CATS.indexOf(c) : -1;
    const nextCat = c && CATS[idx + 1];
    const o = {
      title: c ? c.name : "التحدي الكبير",
      optsCls: "rules-opts",
      delay: 2800,
      help: HELP,
      make: () => makeQuestions(c).map((q) => {
        // نرسل نتيجة كل سؤال لتقرير الأهل (أول ضغطة فقط)
        let sent = false;
        const rv = q.reveal, sy = q.say;
        q.say = () => { lastSay = sy; sy(); };
        q.reveal = (app) => { if (!sent) { sent = true; learnResult(q.topic, !app.querySelector(".opt.bad")); } rv(app); };
        return q;
      }),
      done: (score, s) => {
        if (s > (save.best[id] || 0)) { save.best[id] = s; save.save(); }
        return "";
      },
      next: nextCat ? { label: "الدرس التالي: " + nextCat.short, fn: () => { K.home(); K.show(lesson, nextCat); } } : null,
      extras: () => extras({
        left: () => { if (lastSay) lastSay(); },
        top: () => { const p = K.app.querySelector(".opts"); if (p) { p.classList.toggle("showl"); K.sfx.tick(); } },
      }),
    };
    if (!o.next) delete o.next;
    K.quizScreen(o);
  }

  K.start(home);
})();
