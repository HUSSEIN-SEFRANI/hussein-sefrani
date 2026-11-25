// العلوم الطبيعية — دروس مصوّرة (بطاقات بصوت) ثم اختبار قصير، وتجارب تفاعلية (البركان، بذرة العدس، الظل، والتصنيف).
// نجمة واحدة عند نهاية كل درس أو تجربة (K.resultScreen). المحتوى في data.js.
(() => {
  "use strict";
  const BR = window.SCIENCE, SORTS = window.SORTS;
  const save = K.store("science", { done: {}, exp: {} });
  const ALL = BR.flatMap((b) => b.lessons.map((l) => ({ ...l, b })));
  const emoCount = (s) => [...new Intl.Segmenter("ar", { granularity: "grapheme" }).segment(s)].filter((x) => /\p{Extended_Pictographic}/u.test(x.segment)).length;
  const learn = (topic, ok) => {
    if (!K.gameInfo()) return;
    fetch("/api/tv/learn/result", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: document.title, topic: String(topic).slice(0, 80), ok }) }).catch(() => {});
  };
  const best = (key, s) => { save.done[key] = Math.max(save.done[key] || 0, s); save.save(); };
  const doneOf = (lessons) => lessons.filter((l) => save.done[l.id]).length;
  // يرسم الشاشة نفسها من جديد: التركيز يبقى على الزر نفسه إن بقي، وإلا يذهب إلى def (و force يفرض def)
  const repaint = (html, def, force) => {
    const t = K.top();
    if (t && (force || (t.focus && !html.includes(`data-k="${t.focus}"`)))) t.focus = null;
    K.paint(html, def);
  };

  // ---------------------------------------------------------------- الشاشة الأولى
  const EXP = { id: "exp", n: "التجارب", e: "🧪", sub: "البركان والبذرة والظل والتصنيف", bg: "linear-gradient(135deg,#14b8a6,#0f766e)" };
  function home() {
    K.begin();
    const tot = ALL.length, d = doneOf(ALL);
    const card = (b, fn, info) => `<button class="mode f" style="background:${b.bg}" ${K.act(b.id, fn)}>
        <span class="big emo">${b.e}</span><b>${b.n}</b><small>${info}</small></button>`;
    K.paint(`<div class="title"><span class="mascot emo">🔬</span><div><h1>العلوم الطبيعية</h1>
        <div class="sub">نكتشف الطبيعة من حولنا · أنهيت ${d} من ${tot} درساً</div></div></div>
      <div class="modes g3">
        ${BR.map((b) => card(b, () => K.show(branchScreen, b.id), `${b.sub} · ${doneOf(b.lessons)}/${b.lessons.length}`)).join("")}
        ${card(EXP, () => K.show(expMenu), `${EXP.sub} · ${Object.keys(save.exp).length}/${SORTS.length + 3}`)}
      </div>
      <div class="mini"><button class="btn f go" ${K.act("mix", () => K.show(K.quizScreen, mixQuiz()))}><span class="emo">🧠</span> اختبر نفسك في كل العلوم</button></div>
      ${HELP}`, "bio");
  }
  const HELP = `<div class="help"><b>الأسهم</b> للتنقل · <b>Enter</b> أو <b>الزر السفلي</b> للاختيار · <b>Backspace</b> أو <b>الزر الأيمن</b> للرجوع · <b>PS</b> للخروج</div>`;

  // ---------------------------------------------------------------- الفرع: قائمة الدروس
  function branchScreen(bid) {
    K.begin();
    const b = BR.find((x) => x.id === bid);
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">${b.e}</span> ${b.n}</h2><span class="pill">${doneOf(b.lessons)} / ${b.lessons.length}</span></div>
      <div class="sub">${b.sub}</div>
      <div class="lessons">${b.lessons.map((l, i) => `<button class="les f${save.done[l.id] ? " done" : ""}" style="--c:${b.bg}" ${K.act("l" + i, () => K.show(cardScreen, bid, i, 0))}>
          <span class="emo">${l.e}</span><b>${l.n}</b><small>${save.done[l.id] ? K.starsHtml(save.done[l.id]) : `${l.c.length} بطاقات · ${l.q.length} أسئلة`}</small></button>`).join("")}</div>
      ${HELP}`, "l" + Math.max(0, b.lessons.findIndex((l) => !save.done[l.id])));
  }

  // ---------------------------------------------------------------- بطاقات الدرس (بصوت)
  function cardScreen(bid, li, ci) {
    K.begin();
    const b = BR.find((x) => x.id === bid), l = b.lessons[li], c = l.c[ci], last = ci === l.c.length - 1;
    const say = () => K.tts(c[1]);
    const go = (d) => () => { K.top().focus = null; K.replace(cardScreen, bid, li, ci + d); };
    const n = emoCount(c[0]);
    const dots = l.c.map((_, k) => `<i class="${k < ci ? "ok" : k === ci ? "now" : ""}"></i>`).join("");
    K.paint(`<div class="top">${K.backBtn()}<span class="pill"><span class="emo">${l.e}</span> ${l.n}</span><div class="dots">${dots}</div>
        <button class="btn f" ${K.act("say", say)}><span class="emo">🔊</span></button></div>
      <div class="card" style="--c:${b.bg}">
        <div class="art emo n${Math.min(n, 4)}">${c[0]}</div>
        <p>${K.esc(c[1])}</p>
      </div>
      <div class="nav">
        ${ci > 0 ? `<button class="btn f" ${K.act("prev", go(-1))}>→ السابق</button>` : ""}
        ${last ? `<button class="btn f go" ${K.act("quiz", () => K.replace(K.quizScreen, lessonQuiz(bid, li)))}><span class="emo">🧠</span> اختبر نفسك ←</button>`
               : `<button class="btn f go" ${K.act("next", go(1))}>التالي ←</button>`}
      </div>
      ${HELP}`, last ? "quiz" : "next");
    say();
  }

  // ---------------------------------------------------------------- الأسئلة
  // [السؤال، رسم، الصحيح، ...خطأ] ← سؤال لمحرك K.quizScreen
  function toQ(q, tag) {
    const [text, art, right, ...wrong] = q;
    const opts = K.shuffle([right, ...wrong]);
    const ans = opts.indexOf(right);
    return {
      prompt: `${art ? `<span class="pic emo">${art}</span>` : ""}<div class="q">${K.esc(text)}</div>`,
      opts: opts.map((o) => `<span>${K.esc(o)}</span>`), answer: ans, optsCls: opts.length > 3 ? "sci four" : "sci",
      say: () => K.tts(text), sayOk: () => { learn(tag + ": " + text, true); },
    };
  }
  function lessonQuiz(bid, li) {
    const b = BR.find((x) => x.id === bid), l = b.lessons[li], nx = b.lessons[li + 1];
    return {
      title: l.n, delay: 1500, help: HELP,
      make: () => K.shuffle(l.q).map((q) => toQ(q, l.n)),
      done: (score, s) => { best(l.id, s); return ""; },
      next: nx ? { label: `الدرس التالي: ${nx.n}`, fn: () => K.replace(cardScreen, bid, li + 1, 0) } : { label: "الدروس", fn: K.back },
    };
  }
  function mixQuiz() {
    return {
      title: "كل العلوم", delay: 1500, help: HELP,
      make: () => K.shuffle(ALL).slice(0, 10).map((l) => toQ(K.pick(l.q), l.n)),
    };
  }

  // ---------------------------------------------------------------- قائمة التجارب
  const LABS = [
    { id: "volcano", n: "البركان الفوّار", e: "🌋", sub: "خل + صودا الخبز", fn: () => K.show(volcano) },
    { id: "seed", n: "بذرة العدس", e: "🌱", sub: "نراقبها أسبوعاً", fn: () => K.show(seed) },
    { id: "shadow", n: "الضوء والظل", e: "🌳", sub: "حرّك الشمس", fn: () => K.show(shadow) },
    ...SORTS.map((s) => ({ id: s.id, n: s.n, e: s.e, sub: "صنّف الأشياء", fn: () => K.show(K.quizScreen, sortQuiz(s)) })),
  ];
  function expMenu() {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">🧪</span> التجارب</h2><span class="pill">${Object.keys(save.exp).length} / ${LABS.length}</span></div>
      <div class="sub">مختبر صغير على التلفاز · في البيت نجرّب دائماً مع شخص كبير</div>
      <div class="lessons labs">${LABS.map((x, i) => `<button class="les f${save.exp[x.id] ? " done" : ""}" style="--c:${EXP.bg}" ${K.act("x" + i, x.fn)}>
          <span class="emo">${x.e}</span><b>${x.n}</b><small>${save.exp[x.id] ? K.starsHtml(save.exp[x.id]) : x.sub}</small></button>`).join("")}</div>
      ${HELP}`, "x0");
  }
  const expDone = (id, mistakes, title, extra, fn) => {
    const s = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    save.exp[id] = Math.max(save.exp[id] || 0, s); save.save();
    K.replace(K.resultScreen, { s, title, extra, msg: s === 3 ? "عالِم صغير! 🔬" : null, again: () => K.replace(fn) });
  };

  // صنّف: كل شيء في صندوقه
  function sortQuiz(s) {
    return {
      title: s.n, delay: 2600, help: HELP,
      make: () => K.shuffle(s.items).slice(0, 8).map(([e, n, bin, why]) => ({
        prompt: `<div class="col"><span class="pic emo">${e}</span><div class="q">${K.esc(n)}</div></div><div class="q ask">${K.esc(s.q)}</div>`,
        opts: s.bins.map(([be, bt]) => `<span class="emo">${be}</span> ${bt}`), answer: bin, optsCls: "sci bins",
        say: () => K.tts(n + ". " + s.q),
        reveal: (app) => { const p = app.querySelector(".prompt .ask"); if (p) p.innerHTML = `<b>${s.bins[bin][1]}</b>: ${K.esc(why)}`; },
        sayOk: () => { K.tts(s.bins[bin][1] + ". " + why); learn(s.n + ": " + n, true); },
      })),
      done: (score, st) => { save.exp[s.id] = Math.max(save.exp[s.id] || 0, st); save.save(); return ""; },
    };
  }

  // ---------------------------------------------------------------- تجربة: البركان الفوّار
  function volcano() {
    const ING = [["💧", "ماء", "water"], ["🧂", "ملح", "salt"], ["🍶", "خل ملوّن بالأحمر", "vinegar"], ["🥄", "صودا الخبز", "soda"]];
    const st = { added: [], mistakes: 0, boom: false };
    const msgs = {
      water: "أضفنا ماء… لا شيء يحدث. جرّب مادة أخرى.",
      salt: "أضفنا ملحاً… ذاب قليلاً ولا شيء غير ذلك.",
      vinegar: "أضفنا الخل الأحمر. الخل حمض. ماذا نضيف معه؟",
      soda: "أضفنا صودا الخبز، وهي قاعدة. ماذا نضيف معها؟",
    };
    let msg = "نريد أن يثور البركان! اختر مادتين نضعهما في الكأس داخل البركان.";
    paint();
    K.tts(msg);
    function add(id) {
      if (st.boom) return;
      if (st.added.includes(id)) { msg = "أضفناها من قبل. جرّب مادة أخرى."; paint(id); K.tts(msg); return; }
      st.added.push(id);
      if (id === "water" || id === "salt") st.mistakes++;
      if (st.added.includes("vinegar") && st.added.includes("soda")) return erupt();
      msg = msgs[id];
      K.sfx.pop(); paint(id); K.tts(msg);
    }
    function erupt() {
      st.boom = true;
      msg = "فوووش! الخل مع صودا الخبز يصنعان غاز ثاني أكسيد الكربون، فتخرج فقاعات كثيرة من فوهة البركان.";
      paint("done");
      [0, 120, 260, 420, 600].forEach((t, i) => K.tone(180 + i * 90, 0.3, "triangle", 0.12, t / 1000));
      K.tts(msg);
      const fx = K.app.querySelector(".foam");
      for (let i = 0; i < 26; i++) K.later(() => {
        const b = document.createElement("i"); b.className = "bub emo"; b.textContent = "🫧";
        b.style.left = 40 + Math.random() * 20 + "%"; b.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
        fx && fx.appendChild(b); K.later(() => b.remove(), 3400);
      }, i * 140);
    }
    function paint(def) {
      K.begin();
      repaint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">🌋</span> البركان الفوّار</h2><span class="pill">${st.added.length} مواد</span></div>
        <div class="lab">
          <div class="volc${st.boom ? " boom" : ""}">
            <div class="foam"></div>
            <div class="cup">${st.added.map((a) => `<span class="emo">${ING.find((x) => x[2] === a)[0]}</span>`).join("")}</div>
            <div class="mount"></div>
          </div>
          <div class="side">
            <p class="msg">${K.esc(msg)}</p>
            ${st.boom ? `<button class="btn f go" ${K.act("done", () => expDone("volcano", st.mistakes, "البركان الفوّار",
                `<div class="sub">تفاعل الحمض (الخل) مع القاعدة (الصودا) تغيّر كيميائي: مادة جديدة هي غاز.</div>`, volcano))}>أنهيت التجربة ←</button>`
              : `<div class="ings">${ING.map(([e, n, id]) => `<button class="ing f${st.added.includes(id) ? " used" : ""}" ${K.act(id, () => add(id))}><span class="emo">${e}</span>${n}</button>`).join("")}</div>`}
          </div>
        </div>
        <div class="help">في البيت: هذه التجربة مع شخص كبير، وفوق صينية، ولا نتذوق شيئاً.</div>`, def || "water", def === "done");
    }
  }

  // ---------------------------------------------------------------- تجربة: بذرة العدس
  function seed() {
    const ART = ["🫘", "🫘", "🫘", "🌱", "🌱", "🌿", "🌿"];
    const st = { day: 1, stage: 0, mistakes: 0, dark: false, note: "" };
    const W = [
      ["💧", "أرطّب القطن بقليل من الماء", "ok"],
      ["🌊", "أغرق القطن بماء كثير", "drown"],
      ["🚫", "لا أفعل شيئاً اليوم", "dry"],
    ];
    const L = [["☀️", "أضعها قرب النافذة", "light"], ["🌑", "أضعها في الخزانة المظلمة", "dark"]];
    const STAGE_TXT = ["بذرة عدس جافة على قطن في صحن.", "انتفخت البذرة لأنها شربت الماء.", "خرج جذر صغير أبيض يتجه إلى الأسفل!", "ظهرت ساق خضراء صغيرة!",
      "ظهرت أول ورقتين!", "النبتة تكبر وأوراقها خضراء.", "نبتة عدس جميلة! يمكن زرعها في التربة الآن."];
    st.note = "سنراقب بذرة العدس كل يوم. البذرة تحتاج الماء والهواء والدفء لتنبت، ثم الضوء لتكبر.";
    paint(); K.tts(st.note);
    function choose(kind) {
      const lightDay = st.stage === 3;
      if (lightDay) {
        if (kind === "dark") { st.mistakes++; st.note = "بعد يومين في الظلام صارت الساق صفراء طويلة ضعيفة تبحث عن الضوء. النبات يحتاج الضوء ليصنع غذاءه."; st.dark = true; }
        else { st.dark = false; st.stage++; st.note = "في الضوء صارت الأوراق خضراء: النبتة تصنع غذاءها بضوء الشمس."; }
      } else if (kind === "ok") { st.stage++; st.note = STAGE_TXT[st.stage]; }
      else if (kind === "drown") { st.mistakes++; st.note = "الماء الكثير غطّى البذرة فلم يصلها الهواء، فلم تنمُ اليوم. قليل من الماء يكفي."; }
      else { st.mistakes++; st.note = "جفّ القطن، والبذرة لا تنمو بلا ماء."; }
      st.day++;
      if (st.stage >= ART.length - 1) { st.note = STAGE_TXT[ART.length - 1]; paint("done"); K.sfx.win(); K.tts(st.note); return; }
      kind === "ok" || kind === "light" ? K.sfx.ok() : K.sfx.bad();
      paint(); K.tts(st.note);
    }
    function paint(def) {
      K.begin();
      const fin = st.stage >= ART.length - 1, lightDay = st.stage === 3;
      const opts = lightDay ? L : W;
      repaint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">🌱</span> بذرة العدس</h2><span class="pill">اليوم ${Math.min(st.day, 99)}</span></div>
        <div class="lab">
          <div class="dish s${st.stage}${st.dark ? " pale" : ""}">
            <div class="plant emo">${ART[st.stage]}</div>${st.stage >= 2 ? `<div class="root"></div>` : ""}
            <div class="cotton"></div><div class="plate"></div>
          </div>
          <div class="side">
            <p class="msg">${K.esc(st.note)}</p>
            ${fin ? `<button class="btn f go" ${K.act("done", () => expDone("seed", st.mistakes, "بذرة العدس",
                `<div class="sub">البذرة تحتاج: الماء 💧 والهواء 🌬️ والدفء 🌡️، والنبتة تحتاج الضوء ☀️ أيضاً.</div>`, seed))}>أنهيت التجربة ←</button>`
              : `<div class="q2">${lightDay ? "ظهرت الساق. أين نضع الصحن؟" : "ماذا تفعل اليوم؟"}</div>
                 <div class="ings col1">${opts.map(([e, n, id]) => `<button class="ing f" ${K.act(id, () => choose(id))}><span class="emo">${e}</span>${n}</button>`).join("")}</div>`}
          </div>
        </div>
        ${HELP}`, def || opts[0][2], true); // يوم جديد = سؤال جديد، فالتركيز على أول خيار
    }
  }

  // ---------------------------------------------------------------- تجربة: الضوء والظل
  function shadow() {
    const TASKS = [
      { t: "الصباح: اجعل الشمس منخفضة في جهة اليسار، فيصير الظل طويلاً نحو اليمين.", ok: (a) => a <= 28, hint: "حرّك الشمس إلى اليسار وإلى الأسفل أكثر." },
      { t: "الظهر: اجعل الظل أقصر ما يمكن.", ok: (a) => a >= 78 && a <= 102, hint: "الظل يقصر حين تكون الشمس فوق الشجرة." },
      { t: "المساء: اجعل الظل طويلاً نحو اليسار.", ok: (a) => a >= 152, hint: "الظل في الجهة المعاكسة للشمس: ضع الشمس منخفضة جهة اليمين." },
    ];
    const st = { a: 90, k: 0, mistakes: 0, note: "" };
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">🌳</span> الضوء والظل</h2><span class="pill task">١ / ٣</span></div>
      <p class="msg wide"></p>
      <div class="sky2"><div class="sunm emo">☀️</div><div class="ground"></div><div class="shade"></div><div class="tree emo">🌳</div></div>
      <div class="nav ltr">
        <button class="btn f" ${K.act("l", () => move(-8))}>◀ الشمس</button>
        <button class="btn f go" ${K.act("check", check)}>✔ تحقق</button>
        <button class="btn f" ${K.act("r", () => move(8))}>الشمس ▶</button>
      </div>
      <div class="help"><b>الأسهم ◀ ▶</b> أو <b>العصا اليسرى</b> لتحريك الشمس · <b>Enter</b> أو <b>الزر السفلي</b> للتحقق · <b>الزر الأيمن</b> للرجوع</div>`, "check");
    const $ = (s) => K.app.querySelector(s);
    K.mode = {
      key(e) {
        if (e.key === "ArrowLeft") { move(-6); return true; }
        if (e.key === "ArrowRight") { move(6); return true; }
        if (e.key === "Enter" || e.key === " ") { check(); return true; }
        return false;
      },
    };
    task();
    function task() {
      st.note = TASKS[st.k].t; $(".msg").textContent = st.note; $(".task").textContent = `${"١٢٣"[st.k]} / ٣`; K.tts(st.note); draw();
    }
    function move(d) { st.a = Math.max(6, Math.min(174, st.a + d)); draw(); }
    function draw() {
      const r = (st.a * Math.PI) / 180, sun = $(".sunm"), sh = $(".shade");
      sun.style.left = 50 - Math.cos(r) * 42 + "%";
      sun.style.top = 78 - Math.sin(r) * 66 + "%";
      const elev = Math.min(st.a, 180 - st.a), len = Math.min(70, 16 / Math.tan((Math.max(elev, 4) * Math.PI) / 180)); // بوحدة vh
      sh.style.width = Math.max(3, len) + "vh";
      const right = st.a < 90;
      sh.style.left = right ? "50%" : `calc(50% - ${Math.max(3, len)}vh)`;
      sh.style.borderRadius = right ? "0 50% 50% 0" : "50% 0 0 50%";
      K.app.querySelector(".sky2").style.setProperty("--dim", (0.35 + Math.sin(r) * 0.65).toFixed(2));
    }
    function check() {
      const T = TASKS[st.k];
      if (T.ok(st.a)) {
        K.sfx.ok(); K.confetti(10); learn("الظل: " + T.t, true);
        st.k++;
        if (st.k >= TASKS.length) return K.later(() => expDone("shadow", st.mistakes, "الضوء والظل",
          `<div class="sub">الظل في الجهة المعاكسة للضوء، وطويل حين تكون الشمس منخفضة، وقصير عند الظهر.</div>`, shadow), 900);
        K.later(task, 1100);
      } else {
        st.mistakes++; K.sfx.bad(); learn("الظل: " + T.t, false);
        $(".msg").textContent = T.hint; K.tts(T.hint);
      }
    }
  }

  K.start(home);
})();
