// مهنة اليوم — القائمة الرئيسية وصفحة كل مهنة. كل مهنة في ملفها (driver.js …) وتسجل نفسها في Jobs.play.
(() => {
  "use strict";
  const GAME = "مهنة اليوم";
  const S = Jobs.save;

  function homeScreen() {
    K.begin();
    const f = Jobs.featured();
    const fresh = Jobs.today() === Jobs.list.indexOf(f);
    const card = (j) => {
      const open = Jobs.isOpen(j), ready = !!Jobs.play[j.id];
      const done = Jobs.shift(j.id);
      const sub = !open ? `🔒 تُفتح بعد ${dayWord(Jobs.daysLeft(j))}` : !ready ? "قريباً…" : !Jobs.hasCert(j.id) ? "🎓 تحتاج شهادة" : done ? `أنهيت ${done} ${done === 1 ? "وردية" : "ورديات"}` : "جديدة!";
      return `<button class="mode f job ${open ? "" : "locked"}" style="background:${j.color}" ${K.act(j.id, () => open && K.show(jobScreen, j.id))}>
        <span class="big emo">${open ? j.who : "🔒"}</span><span class="txt2"><b>${j.name}</b><small>${sub}</small></span>${open && Jobs.needsCert(j.id) && Jobs.hasCert(j.id) ? `<span class="emo capb">🎓</span>` : ""}</button>`;
    };
    K.paint(`
      <div class="title"><span class="mascot emo">${f.who}</span><div><h1>${GAME}</h1><div class="sub">جرّب مهنة جديدة كل يوم!</div></div></div>
      <button class="today f" style="--c:${f.color}" ${K.act("today", () => K.show(jobScreen, f.id))}>
        <span class="emo">${f.emo}</span><div><small>${fresh ? "✨ مهنة جديدة اليوم" : "⭐ مهنة اليوم"}</small><b>${f.name}</b><i>${f.goal}</i></div><span class="go">ابدأ ←</span></button>
      <div class="modes jobs">${Jobs.list.map(card).join("")}</div>
      ${K.HELP}`, "today");
  }
  const dayWord = (n) => (n <= 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوماً`);

  // صفحة المهنة: الملابس والأدوات وطريقة العمل، ثم بدء الوردية أو متابعتها
  function jobScreen(id) {
    K.begin();
    const j = Jobs.byId(id), P = Jobs.play[id];
    if (!P) {
      K.paint(`<div class="top">${K.backBtn()}<span class="pill">${j.name}</span></div>
        <div class="intro"><span class="who emo">${j.who}</span><div class="note">مهنة <b>${j.name}</b> قيد التجهيز… ستكون جاهزة قريباً إن شاء الله 🛠️</div></div>${K.HELP}`);
      return;
    }
    const run = S.runs[id];
    const n = Jobs.shift(id);
    const cert = Jobs.hasCert(id);
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill">${cert ? `الوردية ${n + 1}` : "🎓 تحتاج شهادة"}</span></div>
      <div class="intro">
        <div class="dress" style="--c:${j.color}"><span class="who emo">${j.who}</span><div class="tools emo">${j.tools}</div></div>
        <div class="note how"><h2>${j.emo} ${j.name}</h2>${P.how(n)}</div>
      </div>
      ${Jobs.pathHTML(id)}
      <div class="nav">
        ${!cert ? `<button class="btn f go" ${K.act("exam", () => K.show(Jobs.examScreen, id, () => jobScreen(id)))}>📝 امتحان الشهادة 🎓</button><small class="why">هذه مهنة تحتاج دراسة: انجح في الامتحان لتعمل فيها</small>` : ""}
        ${cert && run ? `<button class="btn f go" ${K.act("cont", () => K.show(playScreen, id, false))}>▶ تابع الوردية (${P.label ? P.label(run) : `${run.done} من ${run.total}`})</button>` : ""}
        ${cert ? `<button class="btn f ${run ? "" : "go"}" ${K.act("new", () => K.show(playScreen, id, true))}>${run ? "🔁 وردية جديدة" : "▶ ابدأ الوردية"}</button>` : ""}
      </div>
      ${K.HELP}`, !cert ? "exam" : run ? "cont" : "new");
  }

  function playScreen(id, fresh) {
    K.begin();
    if (fresh) { delete S.runs[id]; S.save(); }
    Jobs.play[id].start({
      shift: Jobs.shift(id),
      run: S.runs[id] || null,
      keep(run) { S.runs[id] = run; S.save(); },             // حفظ التقدم في منتصف الوردية
      exit() { K.back(); },
      finish(r) {                                              // r = { s, score, total, msg, extra }
        delete S.runs[id];
        S.shifts[id] = Jobs.shift(id) + 1;
        S.save();
        K.replace(K.resultScreen, { ...r, title: `${Jobs.byId(id).name} — الوردية ${S.shifts[id]}`, again: null });
      },
    });
  }

  K.start(homeScreen);
})();
