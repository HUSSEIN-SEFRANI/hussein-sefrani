// مهنة اليوم — طريق كل مهنة (كم سنة دراسة)، وامتحان الشهادة 🎓 للمهن التي تحتاج جامعة،
// ومحرك «المشروع» المشترك (أسئلة متتالية تبني شيئاً) للمهندس والعالِم والمبرمج.
(() => {
  "use strict";
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // school: سنوات المدرسة، more: [الاسم، السنوات]، exam: مواد امتحان الشهادة (للمهن الجامعية فقط)
  Jobs.STUDY = {
    driver: { more: [["🪪 رخصة القيادة (بعد 18 سنة)", 0.5]], note: "يحتاج انتباهاً ومعرفة بقوانين السير والحساب." },
    chef: { more: [["🍳 معهد الطبخ أو التدريب في مطعم", 2]], note: "الطبخ علم: الكميات والوقت والنظافة." },
    pilot: { more: [["✈️ أكاديمية الطيران", 3], ["🕒 ساعات طيران مع مدرب", 1]], exam: ["time", "math", "geo", "sci"], note: "يحتاج الرياضيات والفيزياء واللغة الإنجليزية." },
    teacher: { more: [["🎓 الجامعة (كلية التربية)", 4]], exam: ["math", "ar", "sci", "geo"], note: "ليعلّم غيره يجب أن يتعلم كثيراً." },
    fire: { more: [["🧯 أكاديمية الدفاع المدني", 1], ["💪 تدريب بدني", 0.5]], note: "يحتاج لياقة وشجاعة ومعرفة بالسلامة." },
    doctor: { more: [["🩺 كلية الطب", 6], ["🏥 التخصص في المستشفى", 4]], exam: ["body", "sci", "math"], note: "من أطول طرق الدراسة، ويحتاج معدلاً عالياً في المدرسة." },
    mail: { more: [["🪪 رخصة القيادة", 0.5]], note: "يحتاج قراءة الخرائط والعناوين والتنظيم." },
    police: { more: [["🎓 كلية الشرطة أو الحقوق", 4]], exam: ["logic", "ar", "geo"], note: "يحتاج التفكير المنطقي ومعرفة القانون." },
    mechanic: { more: [["🔧 معهد مهني", 2], ["🧑‍🔧 تدريب في ورشة", 1]], note: "يحتاج فهم الآلات والقياس والحساب." },
    farmer: { more: [["🌱 خبرة في المزرعة (أو كلية الزراعة للمزارع الحديث)", 0]], note: "يحتاج معرفة بالنبات والطقس والبيع." },
    candy: { more: [["🍬 معهد الحلويات أو التدريب في محل", 1]], note: "البائع الماهر سريع في الحساب." },
    factory: { more: [["⛑️ تدريب السلامة", 0.5], ["⚙️ معهد صناعي (للفنّي)", 2]], note: "يحتاج الدقة والانتباه وقواعد السلامة." },
    engineer: { more: [["🏗️ كلية الهندسة", 5]], exam: ["math", "geom", "sci"], note: "يحتاج الرياضيات والفيزياء بقوة." },
    scientist: { more: [["🎓 البكالوريوس", 4], ["📘 الماجستير", 2], ["🔬 الدكتوراه", 4]], exam: ["sci", "math", "logic"], note: "يدرس أكثر من 20 سنة ليكتشف أشياء جديدة!" },
    programmer: { more: [["💻 علوم الحاسوب", 4]], exam: ["logic", "code", "math"], note: "يحتاج الرياضيات والتفكير المنطقي والصبر." },
  };
  Jobs.needsCert = (id) => !!(Jobs.STUDY[id] && Jobs.STUDY[id].exam);
  Jobs.hasCert = (id) => !Jobs.needsCert(id) || !!Jobs.save.cert[id];

  // طريق المهنة: شريط السنوات
  Jobs.pathHTML = (id) => {
    const st = Jobs.STUDY[id]; if (!st) return "";
    const steps = [["🏫 المدرسة", 12], ...st.more];
    const total = steps.reduce((a, [, y]) => a + y, 0);
    const yrs = (y) => (y === 0.5 ? "نصف سنة" : y === 1 ? "سنة" : y === 2 ? "سنتان" : y < 11 ? `${y} سنوات` : `${y} سنة`);
    return `<div class="path"><b>🎓 طريق المهنة</b>
      <div class="steps">${steps.map(([n, y]) => `<span style="flex:${Math.max(y, 1.2)}"><i>${n}</i><small>${y ? yrs(y) : "خبرة"}</small></span>`).join("")}</div>
      <small>${st.exam ? `📚 مهنة جامعية: حوالي <b>${Math.round(total)} سنة</b> من الدراسة. ` : ""}${st.note} كل المهن مهمة ومحترمة 💚</small></div>`;
  };

  // ---------------------------------------------------------------- أسئلة الامتحان
  const BANK2 = {
    body: [
      ["كم مرة تقريباً ينبض القلب في الدقيقة عند الراحة؟", "60 إلى 100", "5 إلى 10", "500"], ["الدم يحمل الأكسجين بواسطة…", "خلايا الدم الحمراء", "الأظافر", "الشعر"],
      ["حرارة الجسم الطبيعية حوالي…", "37°", "30°", "42°"], ["أي عضو يفكر ويتحكم بالجسم؟", "الدماغ", "المعدة", "الكلية"],
      ["أي طعام يبني العضلات أكثر؟", "البروتين (لحم، بيض، عدس)", "السكر", "المشروبات الغازية"], ["لماذا نغسل اليدين؟", "لنزيل الجراثيم", "ليطول الشعر", "لنرى أفضل"],
      ["الهيكل العظمي يتكون من…", "العظام", "العضلات فقط", "الجلد"], ["الأسنان تحتاج تنظيفاً…", "مرتين في اليوم", "مرة في الشهر", "لا تحتاج"],
    ],
    logic: [
      () => { const a = rnd(2, 6), d = rnd(2, 7); return [`أكمل: ${a}، ${a + d}، ${a + 2 * d}، ${a + 3 * d}، ؟`, a + 4 * d]; },
      () => { const a = rnd(1, 4); return [`أكمل: ${a}، ${a * 2}، ${a * 4}، ${a * 8}، ؟`, a * 16]; },
      () => { const n = rnd(3, 6); return [`في السباق: سامي قبل ليلى، وليلى قبل كريم. من الأخير؟`, "كريم", ["سامي", "ليلى"], n]; },
      () => { const a = rnd(10, 30); return [`عمر أحمد ${a}، وأخته أصغر منه بـ 4 سنوات. كم عمرها بعد 3 سنوات؟`, a - 4 + 3]; },
      () => [`كل القطط حيوانات، و«مشمش» قطة. إذن مشمش…`, "حيوان", ["سمكة", "لا نعرف"]],
      () => { const b = rnd(3, 9); return [`في الصندوق ${b} كرات حمراء وضعفها زرقاء. كم كرة في الصندوق؟`, b * 3]; },
    ],
    geom: [
      () => { const a = rnd(3, 12), b = rnd(3, 12); return [`غرفة مستطيلة طولها ${a} م وعرضها ${b} م. ما مساحتها؟`, a * b, "م²"]; },
      () => { const a = rnd(3, 12), b = rnd(3, 12); return [`حديقة مستطيلة ${a} م × ${b} م. كم متراً من السياج حولها؟`, 2 * (a + b), "م"]; },
      () => { const a = rnd(2, 9); return [`مربع طول ضلعه ${a} م. ما مساحته؟`, a * a, "م²"]; },
      () => [`كم درجة في الزاوية القائمة؟`, 90, "°"],
      () => { const a = rnd(30, 80), b = rnd(30, 80); return [`مثلث فيه زاويتان ${a}° و${b}°. كم الزاوية الثالثة؟`, 180 - a - b, "°"]; },
    ],
    time: [
      () => { const h = rnd(6, 11), m = K.pick([0, 15, 30, 45]), d = K.pick([30, 45, 90, 135]); const t = h * 60 + m + d;
        return [`أقلعت الطائرة ${h}:${String(m).padStart(2, "0")} والرحلة ${d} دقيقة. متى تصل؟`, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`, [`${Math.floor(t / 60) + 1}:${String(t % 60).padStart(2, "0")}`, `${Math.floor((t - 30) / 60)}:${String((t - 30) % 60).padStart(2, "0")}`]]; },
      () => { const h = rnd(2, 5); return [`كم دقيقة في ${h} ساعات؟`, h * 60]; },
      () => [`الساعة 14:00 تعني…`, "الثانية ظهراً", ["الرابعة عصراً", "الثانية فجراً"]],
    ],
    code: [
      () => { const n = rnd(2, 6); return [`كرّر ${n} مرات: ارسم ⭐\nكم نجمة نرسم؟`, n]; },
      () => { const a = rnd(2, 9), b = rnd(2, 9); return [`س = ${a}\nس = س + ${b}\nما قيمة س؟`, a + b]; },
      () => { const t = rnd(20, 40); return [`الحرارة = ${t}\nإذا الحرارة > 30: اطبع «حار»\nوإلا: اطبع «لطيف»\nماذا يُطبع؟`, t > 30 ? "حار" : "لطيف", [t > 30 ? "لطيف" : "حار", "لا شيء"]]; },
      () => { const a = rnd(2, 4), b = rnd(2, 4); return [`كرّر ${a} مرات:\n   كرّر ${b} مرات: ارسم 🟦\nكم مربعاً؟`, a * b]; },
    ],
  };
  // سؤال من مادة: يرجع { q, ans, opts }
  Jobs.question = (subj, L = 2) => {
    if (subj === "math") { const [q, a] = Jobs.mathQ(L); return { q, ans: a, opts: Jobs.numOptions(a, 3, [1, 2, 5, 10]) }; }
    const bank = Jobs.BANK[subj] || BANK2[subj];
    const it = K.pick(bank);
    if (typeof it === "function") {
      const [q, a, x] = it();
      if (Array.isArray(x)) return { q, ans: a, opts: K.shuffle([a, ...x]) };
      return { q: q + (typeof x === "string" ? ` (${x})` : ""), ans: a, opts: typeof a === "number" ? Jobs.numOptions(a, 3, [1, 2, 4, 10]) : [a] };
    }
    return { q: it[0], ans: it[1], opts: K.shuffle(it.slice(1)) };
  };
  const qHTML = (q) => K.esc(q).replace(/\n/g, "<br>");

  // ---------------------------------------------------------------- امتحان الشهادة
  Jobs.examScreen = (id, done) => {
    const j = Jobs.byId(id), st = Jobs.STUDY[id], N = Jobs.TEST ? 2 : 8, PASS = Jobs.TEST ? 1 : 6;
    const qs = K.range(0, N).map((i) => Jobs.question(st.exam[i % st.exam.length]));
    let i = 0, right = 0, wrong = [];
    ask();
    function ask() {
      K.begin();
      const Q = qs[i], num = typeof Q.ans === "number";
      let locked = false;
      K.paint(`
        <div class="top">${K.backBtn()}<div class="dots">${qs.map((_, k) => `<i class="${k < i ? "ok" : k === i ? "now" : ""}"></i>`).join("")}</div><span class="pill">🎓 امتحان ${j.name}</span></div>
        <div class="prompt exam-q"><span class="emo pic">📝</span><div class="q">${qHTML(Q.q)}</div></div>
        <div class="opts ${num ? "" : "txt"}">${Q.opts.map((o, k) => `<button class="opt f" ${K.act("o" + k, (el) => {
          if (locked) return; locked = true;
          if (o === Q.ans) { right++; el.classList.add("ok"); K.sfx.ok(); }
          else { el.classList.add("bad"); K.sfx.bad(); wrong.push(Q); const r = [...K.app.querySelectorAll(".opt")].find((b) => b.textContent.trim() === String(Q.ans)); if (r) r.classList.add("ok"); }
          K.later(() => { i++; if (i < qs.length) { K.top().focus = null; ask(); } else end(); }, o === Q.ans ? 900 : 2200);
        })}>${K.esc(String(o))}</button>`).join("")}</div>
        <div class="cheer"></div>${K.HELP}`, "o0");
    }
    function end() {
      K.begin();
      const pass = right >= PASS;
      if (pass) { Jobs.save.cert[id] = 1; Jobs.save.save(); }
      K.paint(`
        <div class="top">${K.backBtn()}<span></span><span class="pill">🎓 ${j.name}</span></div>
        <h1>${pass ? "مبروك! نجحت 🎓" : "تحتاج دراسة أكثر 📚"}</h1>
        <div class="sub">أجبت ${right} من ${qs.length} (النجاح ${PASS})</div>
        ${pass ? `<div class="cert"><span class="emo">📜</span><div><b>شهادة ${j.name}</b><small>يُسمح لك الآن بالعمل ${j.who}</small></div></div>`
          : `<div class="note study"><b>راجع هذه الإجابات:</b>${wrong.map((q) => `<div>📌 ${qHTML(q.q)} ← <b>${K.esc(String(q.ans))}</b></div>`).join("")}</div>`}
        <div class="nav">
          ${pass ? `<button class="btn f go" ${K.act("go", () => K.back())}>▶ ابدأ العمل</button>` : `<button class="btn f go" ${K.act("again", () => K.replace(Jobs.examScreen, id, done))}>🔁 امتحان جديد</button>`}
          <button class="btn f" ${K.act("home", K.home)}>🏠 القائمة</button>
        </div>${K.HELP}`, pass ? "go" : "again");
      if (pass) { K.sfx.win(); K.confetti(30, "🎓📜⭐🎉"); }
    }
  };

  // ---------------------------------------------------------------- محرك المشروع (أسئلة تبني شيئاً)
  // cfg = { total(L), make(L, i, R) -> { html, ans, opts, why, txt? }, art(R, total) -> html, msg, label }
  Jobs.stages = (api, cfg) => {
    const L = Math.min(api.shift, 3), total = Jobs.TEST ? 2 : cfg.total(L);
    const R = api.run || { total, done: 0, ok: 0 };
    let Q = null, tries = 0;
    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">${cfg.icon}</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">✅</span> <b id="hok"></b></span>
      </div>
      <div class="proj"><div class="art" id="art"></div><div class="task"><div class="tq" id="tq"></div><div class="opts" id="to"></div><div class="cheer" id="tc"></div></div></div>`);
    const $ = (s) => K.app.querySelector(s);
    const pauseIt = () => Jobs.pause(api, R, `${cfg.label} ${R.done} من ${R.total}`);
    K.mode = Jobs.domMode(pauseIt);
    K.mode.stop = () => Jobs.closeOverlay();
    $("#hp").addEventListener("click", pauseIt);
    function next() {
      if (R.done >= R.total) return finish();
      Q = cfg.make(L, R.done, R); tries = 0;
      $("#hdn").textContent = `${R.done} / ${R.total}`; $("#hok").textContent = R.ok;
      $("#art").innerHTML = cfg.art(R, R.total);
      $("#tq").innerHTML = Q.html;
      $("#tc").textContent = "";
      const num = typeof Q.ans === "number";
      $("#to").className = "opts " + (num ? "" : "txt");
      K.top().focus = null;
      Jobs.fill($("#to"), Q.opts.map((o, k) => `<button class="opt f" ${K.act("o" + k, (el) => pick(o, el))}>${K.esc(String(o))}${Q.unit && num ? `<small>${Q.unit}</small>` : ""}</button>`).join(""));
      K.focus($("#to .f"));
    }
    function pick(o, el) {
      if (el.dataset.dead || !Q) return;
      if (o === Q.ans) {
        el.classList.add("ok");
        R.done++; if (!tries) R.ok++;
        K.sfx.ok(); K.confetti(6, cfg.confetti || "✨⭐");
        $("#tc").innerHTML = `${tries ? "👍" : K.pick(["أحسنت! 👏", "ممتاز! 🌟", "رائع! 🎉"])} ${Q.why || ""}`;
        api.keep(R);
        const q = Q; Q = null;
        $("#art").innerHTML = cfg.art(R, R.total);
        K.later(next, q.why ? 2200 : 1300);
      } else {
        tries++; el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad();
        $("#tc").textContent = Q.hint ? `💡 ${Q.hint}` : "حاول مرة أخرى 💪";
      }
    }
    function finish() {
      const s = Jobs.grade(R.ok, R.total);
      api.finish({ s, score: R.ok, total: R.total, msg: cfg.msg[3 - s] });
    }
    if (Jobs.TEST) window.__stage = { get Q() { return Q; }, R };
    next();
  };
  Jobs.rnd = rnd;
})();
