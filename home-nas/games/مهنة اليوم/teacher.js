// مهنة اليوم — المعلم 👩‍🏫: يوم دراسي من عدة حصص. في أول كل حصة يعدّ الطلاب (الحضور والغياب)،
// ثم تأتي الطلبات معاً: يد مرفوعة بسؤال، طالب مشاغب، واجب للتصحيح، طالب مريض. وإن تُركت يرتفع مقياس الضجيج.
(() => {
  "use strict";
  const KIDS = ["👦", "👧", "🧒", "👦🏻", "👧🏻", "👦🏽", "👧🏽", "👦🏾", "👧🏾", "🧑", "👱", "👱‍♀️", "🧕", "👩‍🦱", "👨‍🦱"];
  const SUBJ = [
    { n: "الرياضيات", e: "🧮", k: "math" }, { n: "العلوم", e: "🔬", k: "sci" }, { n: "اللغة العربية", e: "📖", k: "ar" },
    { n: "الجغرافيا", e: "🌍", k: "geo" }, { n: "الرياضيات", e: "📐", k: "math" }, { n: "العلوم", e: "🧪", k: "sci" },
  ];
  // [السؤال، الجواب الصحيح، خطأ، خطأ]
  const BANK = {
    sci: [
      ["ما الكوكب الذي نعيش عليه؟", "الأرض", "المريخ", "زحل"], ["كم عدد أرجل العنكبوت؟", "8", "6", "10"],
      ["ماذا تحتاج النبتة لتصنع غذاءها؟", "ضوء الشمس", "الظلام", "الملح"], ["الماء يغلي عند…", "100 درجة", "50 درجة", "10 درجات"],
      ["الماء يتجمّد عند…", "0 درجة", "100 درجة", "30 درجة"], ["أكبر كوكب في المجموعة الشمسية؟", "المشتري", "الأرض", "عطارد"],
      ["أي عضو يضخ الدم؟", "القلب", "الرئة", "المعدة"], ["نتنفس بواسطة…", "الرئتين", "الكبد", "الكلى"],
      ["الحوت من…", "الثدييات", "الأسماك", "الزواحف"], ["الغاز الذي نتنفسه لنعيش؟", "الأكسجين", "ثاني أكسيد الكربون", "الهيليوم"],
      ["كم عظمة تقريباً في جسم الإنسان البالغ؟", "206", "50", "1000"], ["القمر يدور حول…", "الأرض", "الشمس مباشرة", "المريخ"],
      ["حالات المادة: صلب وسائل و…", "غاز", "خشب", "ضوء"], ["المغناطيس يجذب…", "الحديد", "الخشب", "البلاستيك"],
      ["كم يوماً في السنة الكبيسة؟", "366", "365", "360"], ["الضفدع يبدأ حياته…", "شرغوفاً في الماء", "طائراً", "بيضة في عش"],
    ],
    geo: [
      ["أكبر قارة في العالم؟", "آسيا", "أفريقيا", "أوروبا"], ["أطول نهر في العالم العربي؟", "النيل", "الفرات", "الأردن"],
      ["أكبر محيط؟", "الهادئ", "الأطلسي", "الهندي"], ["عاصمة مصر؟", "القاهرة", "الإسكندرية", "أسوان"],
      ["عاصمة السعودية؟", "الرياض", "جدة", "مكة"], ["أكبر صحراء حارة في العالم؟", "الكبرى", "الربع الخالي", "صحراء سيناء"],
      ["عاصمة المغرب؟", "الرباط", "الدار البيضاء", "مراكش"], ["كم عدد القارات؟", "7", "5", "9"],
      ["عاصمة الأردن؟", "عمّان", "إربد", "العقبة"], ["الشمس تشرق من جهة…", "الشرق", "الغرب", "الشمال"],
      ["عاصمة العراق؟", "بغداد", "البصرة", "الموصل"], ["على أي قارة تقع تونس؟", "أفريقيا", "آسيا", "أوروبا"],
      ["أعلى جبل في العالم؟", "إيفرست", "الألب", "طوبقال"], ["عاصمة تركيا؟", "أنقرة", "إسطنبول", "إزمير"],
      ["البحر بين أوروبا وأفريقيا؟", "المتوسط", "الأحمر", "قزوين"], ["عاصمة الإمارات؟", "أبوظبي", "دبي", "الشارقة"],
    ],
    ar: [
      ["جمع «كتاب»؟", "كُتُب", "كتابات", "كاتب"], ["عكس «طويل»؟", "قصير", "عريض", "كبير"], ["مفرد «أقلام»؟", "قلم", "قلمان", "أقلم"],
      ["عكس «سريع»؟", "بطيء", "قوي", "خفيف"], ["كم حرفاً في الأبجدية العربية؟", "28", "26", "30"], ["مثنّى «ولد»؟", "ولدان", "أولاد", "وليد"],
      ["الفعل في «كتبَ الطالبُ الدرسَ»؟", "كتب", "الطالب", "الدرس"], ["الفاعل في «لعبَ أحمدُ الكرةَ»؟", "أحمد", "لعب", "الكرة"],
      ["مرادف «سعيد»؟", "فرحان", "حزين", "غاضب"], ["عكس «نهار»؟", "ليل", "صباح", "ظهر"], ["جمع «شجرة»؟", "أشجار", "شجرتان", "شجيرة"],
      ["أي كلمة اسم؟", "مدرسة", "ذهبَ", "في"], ["أي كلمة حرف جر؟", "على", "قلم", "جلسَ"], ["مرادف «شجاع»؟", "مقدام", "جبان", "كسول"],
      ["عكس «قريب»؟", "بعيد", "جار", "صغير"], ["جمع «بيت»؟", "بيوت", "بيتان", "بايت"],
    ],
  };
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, periods: Jobs.TEST ? 1 : 5, len: Jobs.TEST ? 25 : 105,   // ثوانٍ لكل حصة
      every: [9, 7.5, 6.5, 5.5][L], life: [16, 14, 12, 11][L],    // كل كم ثانية طلب جديد، وكم يبقى قبل أن يزعج
      seats: 20, absent: [[1, 4], [2, 5], [2, 6], [3, 7]][L],
    };
  };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  // سؤال حساب حسب المستوى: [النص، الجواب]
  function mathQ(L) {
    const t = rnd(0, L);
    if (t === 0) { const a = rnd(12, 89), b = rnd(5, 59); return Math.random() < 0.5 ? [`${a} + ${b} = ؟`, a + b] : [`${a + b} − ${b} = ؟`, a]; }
    if (t === 1) { const a = rnd(3, 12), b = rnd(3, 12); return Math.random() < 0.5 ? [`${a} × ${b} = ؟`, a * b] : [`${a * b} ÷ ${a} = ؟`, b]; }
    if (t === 2) { const k = K.pick([2, 3, 4]), n = rnd(3, 20) * k; return [`${k === 2 ? "نصف" : k === 3 ? "ثلث" : "ربع"} العدد ${n} = ؟`, n / k]; }
    const p = K.pick([10, 20, 25, 50]), n = K.pick([40, 60, 80, 120, 200]);
    return Math.random() < 0.5 ? [`${p}% من ${n} = ؟`, (p * n) / 100] : (() => { const x = rnd(3, 30), b = rnd(2, 20); return [`س + ${b} = ${x + b}، س = ؟`, x]; })();
  }

  Jobs.BANK = BANK; Jobs.mathQ = mathQ;   // يستعملهما امتحان الشهادة (study.js)

  function how(shift) {
    const v = level(shift);
    return `<p>أنت معلم الصف اليوم 👩‍🏫. التدريس ليس سهلاً: الطلبات تأتي كلها معاً!</p>
      <ul>
        <li>في أول كل حصة: <b>عُدّ الطلاب</b> وسجّل الحضور 📋.</li>
        <li>✋ يد مرفوعة: أجب عن سؤال الطالب.</li>
        <li>🗣️ طالب مشاغب: اذهب إليه وهدّئه.</li>
        <li>📝 واجب: صحّحه (صحيح أم خطأ؟).</li>
        <li>🤒 طالب مريض: أرسله إلى ممرضة المدرسة.</li>
        <li>إذا تركت الطلبات طويلاً يرتفع <b>مقياس الضجيج</b> 📢… ويدخل المدير!</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.periods} حصص</b>.</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const R = api.run || { period: 0, total: 0, ok: 0, bad: 0, director: 0, done: 0 };
    R.total = R.total || 0;
    let desks = [], noise = 0, t = 0, nextEv = 3, phase = "roll", subj = null;

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill" id="hpd"></span>
        <span class="pill"><span class="emo">✅</span> <b id="hok"></b></span>
        <span class="pill noise"><span class="emo">📢</span> <i><u id="hno"></u></i></span>
      </div>
      <div class="classroom">
        <div class="blackboard"><span id="bb"></span><i><u id="hti"></u></i></div>
        <div class="desks" id="desks"></div>
      </div>`);
    const $ = (s) => K.app.querySelector(s);
    const pauseIt = () => Jobs.pause(api, R, `الحصة ${R.period + 1} من ${v.periods}`);
    K.mode = Jobs.domMode(pauseIt);
    $("#hp").addEventListener("click", pauseIt);

    const hud = () => {
      $("#hpd").innerHTML = `<span class="emo">🔔</span> الحصة ${Math.min(R.period + 1, v.periods)} / ${v.periods}`;
      $("#hok").textContent = `${R.ok} / ${R.total}`;
      const n = $("#hno"); n.style.width = noise + "%"; n.style.background = noise < 50 ? "#22c55e" : noise < 80 ? "#f59e0b" : "#ef4444";
      $("#hti").style.width = phase === "class" ? Math.max(0, 100 - (t / v.len) * 100) + "%" : "100%";
    };
    const BADGE = { hand: "✋", noisy: "🗣️", hw: "📝", sick: "🤒" };
    function drawDesks() {
      Jobs.fill($("#desks"), desks.map((d, i) => d.kid
        ? `<button class="desk f ${d.ev ? "ev " + d.ev.k : ""}" ${K.act("d" + i, () => tap(i))}><span class="emo kid">${d.ev && d.ev.k === "sick" ? "🤒" : d.kid}</span>${d.ev ? `<span class="emo badge">${BADGE[d.ev.k]}</span>` : ""}</button>`
        : `<div class="desk empty"></div>`).join(""));
    }
    function newPeriod() {
      subj = SUBJ[R.period % SUBJ.length];
      const absent = rnd(v.absent[0], v.absent[1]);
      const empty = new Set(K.shuffle(K.range(0, v.seats)).slice(0, absent));
      desks = K.range(0, v.seats).map((i) => ({ kid: empty.has(i) ? null : K.pick(KIDS), ev: null }));
      noise = 10; t = 0; nextEv = 4; phase = "roll";
      $("#bb").innerHTML = `<span class="emo">${subj.e}</span> حصة ${subj.n}`;
      drawDesks(); hud();
      K.tone(880, 0.3); K.tone(660, 0.4, "sine", 0.15, 0.3);   // الجرس
      K.later(rollCall, 1200);
    }
    // الحضور: كم حاضراً؟ (أو كم غائباً في المستويات الأعلى)
    function rollCall() {
      const present = desks.filter((d) => d.kid).length, absent = v.seats - present;
      const askAbsent = v.L >= 1 && Math.random() < 0.5;
      const ans = askAbsent ? absent : present;
      R.total++;
      Jobs.overlay(`<h2>📋 الحضور</h2><div class="sub">${askAbsent ? `في الصف ${v.seats} مقعداً. عُدّ الحاضرين: <b>كم طالباً غائباً اليوم؟</b>` : `عُدّ الطلاب في الصف: <b>كم طالباً حاضراً؟</b>`}</div>`,
        Jobs.numOptions(ans, 3, [1, 2]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => {
          if (n === ans) { R.ok++; K.sfx.ok(); Jobs.toast("صحيح! سجّلت الحضور 📋", "good"); }
          else { R.bad++; K.sfx.bad(); Jobs.toast(`الجواب ${ans} — عُدّ مرة أخرى بهدوء`, "bad", 2600); }
          phase = "class"; hud();
        } })), { cls: "wide low", btnCls: "opts" });
    }
    function spawnEvent() {
      const free = desks.map((d, i) => (d.kid && !d.ev ? i : -1)).filter((i) => i >= 0);
      if (!free.length) return;
      const i = K.pick(free);
      const k = K.pick(["hand", "hand", "hand", "noisy", "noisy", "hw", "hw", v.L ? "sick" : "hand"]);
      desks[i].ev = { k, t: 0 };
      if (k === "noisy") K.tone(300, 0.2, "sawtooth", 0.05);
      else K.tone(700, 0.08);
      drawDesks();
    }
    function resolve(i, good, msg) {
      desks[i].ev = null;
      R.total++;
      if (good) { R.ok++; noise = Math.max(0, noise - 12); K.sfx.ok(); if (msg) Jobs.toast(msg, "good", 1800); }
      else { R.bad++; noise = Math.min(100, noise + 10); K.sfx.bad(); if (msg) Jobs.toast(msg, "bad", 2800); }
      drawDesks(); hud();
    }
    function tap(i) {
      const d = desks[i], ev = d.ev;
      if (!ev) return Jobs.toast(`${d.kid} يعمل بهدوء 👍`, "", 1000);
      if (ev.k === "noisy") return resolve(i, true, "🤫 هدأ الطالب");
      if (ev.k === "sick") {
        return Jobs.overlay(`<h2>🤒 الطالب يقول: «رأسي يؤلمني»</h2><div class="sub">ماذا تفعل؟</div>`, K.shuffle([
          { label: "🏥 أرسله إلى ممرضة المدرسة", fn: () => { d.kid = null; resolve(i, true, "أحسنت! الصحة أولاً 💚"); } },
          { label: "📚 أكمل الدرس وتجاهله", fn: () => resolve(i, false, "الطالب المريض يحتاج إلى مساعدة 🤒") },
          { label: "📝 أعطه واجباً إضافياً", fn: () => resolve(i, false, "الطالب المريض يحتاج إلى مساعدة 🤒") },
        ]), { back: () => {} });
      }
      if (ev.k === "hw") {
        const [q, a] = mathQ(v.L);
        const right = Math.random() < 0.5, shown = right ? a : a + K.pick([-10, -2, -1, 1, 2, 10]);
        return Jobs.overlay(`<h2>📝 صحّح الواجب</h2><div class="hwq">${q.replace("؟", `<b>${shown}</b>`)}</div>`, [
          { label: "✔️ صحيح", cls: "go", fn: () => resolve(i, right, right ? "تصحيح دقيق ✔️" : `خطأ! الجواب الصحيح ${a}`) },
          { label: "❌ خطأ", fn: () => resolve(i, !right, !right ? `أحسنت! الصحيح ${a} ✔️` : "الواجب كان صحيحاً!") },
        ], { back: () => {} });
      }
      // يد مرفوعة: سؤال من مادة الحصة
      let q, opts, ans;
      if (subj.k === "math") { const [tq, a] = mathQ(v.L); q = tq; ans = String(a); opts = Jobs.numOptions(a, 3, [1, 2, 5, 10]).map(String); }
      else { const b = K.pick(BANK[subj.k]); q = b[0]; ans = b[1]; opts = K.shuffle(b.slice(1)); }
      Jobs.overlay(`<h2>✋ ${d.kid} يسأل:</h2><div class="hwq">${q}</div>`,
        opts.map((o) => ({ label: o, cls: "opt txt", fn: () => resolve(i, o === ans, o === ans ? "إجابة صحيحة! فهم الطالب 💡" : `الجواب الصحيح: ${ans}`) })),
        { cls: "wide", btnCls: "opts", back: () => {} });
    }
    function endPeriod() {
      phase = "break";
      desks.forEach((d) => { if (d.ev) { d.ev = null; R.total++; R.bad++; } });
      R.period++;
      api.keep(R);
      K.tone(880, 0.3); K.tone(660, 0.4, "sine", 0.15, 0.3);
      if (R.period >= v.periods) return K.later(finish, 800);
      Jobs.overlay(`<h2>🔔 انتهت الحصة!</h2><div class="sub">استراحة قصيرة… الإجابات الصحيحة حتى الآن: ${R.ok} من ${R.total}</div>`,
        [{ label: "▶ الحصة التالية", cls: "go", fn: newPeriod }]);
    }
    function finish() {
      const s = Jobs.grade(R.ok, R.total, R.director);
      api.finish({ s, score: R.ok, total: R.total,
        msg: s === 3 ? "معلم رائع! 👩‍🏫🏆" : s === 2 ? "يوم دراسي ناجح! 👏" : "أنهيت يومك! 💪",
        extra: `<div class="won"><span class="emo">😠</span> زيارات المدير: ${R.director}</div>` });
    }

    const stop = Jobs.loop((dt) => {
      if (Jobs.ov || phase !== "class") return;
      t += dt;
      let open = 0;
      for (const d of desks) if (d.ev) { d.ev.t += dt; open++; if (d.ev.t > v.life) noise += dt * (d.ev.k === "noisy" ? 4 : 2); }
      noise += dt * open * 0.4;
      if (noise >= 100) {
        R.director++; R.bad++; R.total++; noise = 40;
        K.sfx.bad();
        Jobs.toast("😠 المدير دخل الصف بسبب الضجيج!", "bad", 3000);
      }
      if ((nextEv -= dt) <= 0) { spawnEvent(); nextEv = v.every * (0.7 + Math.random() * 0.6); }
      if (t >= v.len) endPeriod();
      hud();
    });
    K.mode.stop = () => { stop(); Jobs.closeOverlay(); };
    if (Jobs.TEST) window.__teach = { get desks() { return desks; }, R, set t(x) { t = x; } };
    newPeriod();
  }

  Jobs.register("teacher", { how, start, label: (r) => `الحصة ${r.period + 1}` });
})();
