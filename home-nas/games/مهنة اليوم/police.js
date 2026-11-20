// مهنة اليوم — المحقق 🕵️: في كل قضية مشتبه بهم، والأدلة تأتي واحداً واحداً (آثار، شهود، أعذار).
// يستبعد الطفل من لا تنطبق عليه الأدلة حتى يبقى واحد (تفكير منطقي). الشخصيات خيالية.
(() => {
  "use strict";
  const NAMES = ["سامي", "ليلى", "كريم", "هدى", "مازن", "نور", "رامي", "سلمى", "باسل", "دانة", "فارس", "ريم", "وليد", "جنى"];
  const FACES = ["🧑", "👩", "👨", "🧔", "👱", "👩‍🦱", "👨‍🦱", "🧕", "👴", "👵"];
  const COLORS = [["أحمر", "#ef4444"], ["أزرق", "#3b82f6"], ["أخضر", "#22c55e"], ["أصفر", "#eab308"]];
  const CASES = [
    ["🎂", "اختفت الكعكة من المخبز!"], ["🖼️", "سُرقت لوحة من المتحف!"], ["⚽", "اختفت كأس الملعب!"], ["📚", "ضاع كتاب نادر من المكتبة!"],
    ["💎", "اختفى خاتم من الفندق!"], ["🚲", "أُخذت دراجة من أمام المدرسة!"], ["🍪", "فُرغ صندوق البسكويت في المطعم!"], ["🔑", "ضاعت مفاتيح البنك!"],
    ["🦜", "هرب الببغاء من الحديقة… من فتح القفص؟"], ["📦", "فُتح طرد في مكتب البريد!"],
  ];
  const PLACES = ["المسجد", "السوق", "الحديقة", "المكتبة", "الملعب", "المستشفى"];
  // الصفات: [مفتاح، اسم القيمة الإيجابية، النفي، الرمز]
  const ATTR = [
    ["hat", "يلبس قبعة", "لا يلبس قبعة", "🎩"],
    ["glasses", "يلبس نظارة", "لا يلبس نظارة", "👓"],
    ["bag", "يحمل حقيبة", "لا يحمل حقيبة", "🎒"],
    ["tall", "طويل", "ليس طويلاً", "📏"],
  ];
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return { L, cases: Jobs.TEST ? 1 : 8 + L, n: [4, 5, 6, 6][L], alibi: L >= 1, neg: L >= 1, color: L >= 2 };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت محقق ذكي 🕵️. حدثت مشكلة في المدينة، وأمامك ${v.n} مشتبه بهم.</p>
      <ul>
        <li>اضغط <b>«🔎 دليل جديد»</b> لتحصل على الأدلة واحداً واحداً.</li>
        <li>اضغط على أي شخص لا ينطبق عليه دليل واختر <b>«❌ استبعد»</b>.</li>
        <li>عندما يبقى شخص واحد: اضغط عليه واختر <b>«👉 هو الفاعل»</b>.</li>
        <li>فكّر جيداً: الاتهام الخاطئ يُحسب عليك!</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.cases} قضايا</b>${v.alibi ? "، وفيها شهود وأعذار" : ""}.</p>`;
  }

  // يصنع قضية: مشتبه بهم بصفات عشوائية، وأدلة تنطبق على الفاعل وحده في النهاية
  function makeCase(v) {
    for (let tries = 0; tries < 60; tries++) {
      const names = K.shuffle(NAMES).slice(0, v.n), faces = K.shuffle(FACES);
      const sus = names.map((n, i) => ({ n, f: faces[i % faces.length], hat: Math.random() < 0.5, glasses: Math.random() < 0.5, bag: Math.random() < 0.5, tall: Math.random() < 0.5,
        color: K.pick(v.color ? COLORS : COLORS.slice(0, 2)), at: K.pick(PLACES) }));
      const culprit = Math.floor(Math.random() * v.n), c = sus[culprit];
      // كل الأدلة الممكنة الصحيحة عن الفاعل
      const pool = [];
      for (const [k, yes, no] of ATTR) pool.push(c[k] ? { t: `الشاهد يقول: الفاعل <b>${yes}</b>`, f: (s) => s[k] } : v.neg ? { t: `الفاعل <b>${no}</b>`, f: (s) => !s[k] } : null);
      pool.push({ t: `وُجد خيط من قميص <b>${c.color[0]}</b> في المكان`, f: (s) => s.color === c.color });
      if (v.alibi) sus.forEach((s, i) => { if (i !== culprit) pool.push({ t: `<b>${s.n}</b> كان في ${s.at} وقت الحادثة (رآه كثيرون)`, f: (x) => x !== s, alibi: true }); });
      const clues = [];
      let left = sus.slice();
      for (const cl of K.shuffle(pool.filter(Boolean))) {
        const nl = left.filter(cl.f);
        if (nl.length < left.length) { clues.push(cl); left = nl; }
        if (left.length === 1) break;
      }
      if (left.length === 1 && clues.length >= 2 && clues.length <= 6) return { sus, culprit, clues };
    }
    return makeCase({ ...v, n: v.n - 1 });
  }

  function start(api) {
    const v = level(api.shift);
    const R = api.run || { total: v.cases, done: 0, ok: 0, wrong: 0 };
    let C = null, shown = 0, out = new Set(), tried = false;

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">📁</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">✅</span> <b id="hok"></b></span>
      </div>
      <div class="case" id="case"></div>
      <div class="suspects" id="sus"></div>
      <div class="clues"><div id="clues"></div><button class="btn f go" ${K.act("clue", clue)} id="cb">🔎 دليل جديد</button></div>`, "clue");
    const $ = (s) => K.app.querySelector(s);
    const pauseIt = () => Jobs.pause(api, R, `القضية ${R.done + 1} من ${R.total}`);
    K.mode = Jobs.domMode(pauseIt);
    $("#hp").addEventListener("click", pauseIt);
    const hud = () => { $("#hdn").textContent = `${R.done} / ${R.total}`; $("#hok").textContent = R.ok; };

    function newCase() {
      const cs = CASES[(R.done + Math.floor(Math.random() * CASES.length)) % CASES.length];
      C = makeCase(v); C.title = cs; shown = 0; out = new Set(); tried = false;
      $("#case").innerHTML = `<span class="emo">${cs[0]}</span> القضية ${R.done + 1}: ${cs[1]}`;
      drawSus(); drawClues(); hud();
      K.tone(330, 0.2, "triangle"); K.tone(392, 0.3, "triangle", 0.15, 0.2);
    }
    function drawSus() {
      Jobs.fill($("#sus"), C.sus.map((s, i) => `<button class="sus f ${out.has(i) ? "out" : ""}" ${K.act("s" + i, () => pick(i))}>
        <div class="face" style="--shirt:${s.color[1]}"><span class="emo">${s.f}</span>${s.hat ? `<span class="emo acc hat">🎩</span>` : ""}${s.glasses ? `<span class="emo acc gl">👓</span>` : ""}</div>
        <b>${s.n}</b><small>${s.tall ? "📏 طويل" : "قصير"}${s.bag ? " · 🎒" : ""}</small>${out.has(i) ? `<span class="emo x">❌</span>` : ""}</button>`).join(""));
    }
    function drawClues() {
      $("#clues").innerHTML = C.clues.slice(0, shown).map((c, i) => `<div class="clue"><span class="emo">${c.alibi ? "🗣️" : i % 2 ? "👣" : "🔎"}</span> ${c.t}</div>`).join("") ||
        `<div class="clue dim">لا أدلة بعد… ابدأ التحقيق 🔎</div>`;
      const b = $("#cb");
      b.style.visibility = shown < C.clues.length ? "" : "hidden";
      if (shown >= C.clues.length && K.current() === b) K.focus($(".sus.f:not(.out)") || $(".sus.f"));
    }
    function clue() {
      if (shown >= C.clues.length) return;
      shown++; K.sfx.tick(); drawClues();
      if (shown >= C.clues.length) Jobs.toast("هذه كل الأدلة. من الفاعل؟ 🤔", "", 2000);
    }
    function pick(i) {
      const s = C.sus[i];
      Jobs.overlay(`<div class="pay"><span class="emo big">${s.f}</span><div><h2>${s.n}</h2><div class="sub">ماذا تقرر؟</div></div></div>`, [
        out.has(i) ? { label: "↩ أرجِعه إلى القائمة", fn: () => { out.delete(i); drawSus(); } } : { label: "❌ استبعد", fn: () => { out.add(i); K.sfx.tick(); drawSus(); } },
        { label: "👉 هو الفاعل!", cls: "go", fn: () => accuse(i) },
        { label: "رجوع" },
      ], { back: () => {} });
    }
    function accuse(i) {
      if (i === C.culprit) {
        R.done++; if (!tried) R.ok++;
        K.sfx.ok(); K.confetti(14, "🔎⭐✨");
        Jobs.overlay(`<h2>🎉 أحسنت أيها المحقق!</h2><div class="sub">الفاعل هو <b>${C.sus[i].n}</b>. الأدلة كلها تنطبق عليه وحده.</div>`,
          [{ label: R.done >= R.total ? "🏁 النتيجة" : "📁 القضية التالية", cls: "go", fn: () => (R.done >= R.total ? finish() : newCase()) }]);
        api.keep(R); hud();
      } else {
        tried = true; R.wrong++; out.add(i);
        K.sfx.bad();
        const bad = C.clues.slice(0, C.clues.length).find((c) => !c.f(C.sus[i]));
        Jobs.toast(shown < C.clues.length ? `ليس ${C.sus[i].n}! اجمع أدلة أكثر 🔎` : `ليس ${C.sus[i].n}: ${bad ? bad.t.replace(/<[^>]+>/g, "") : ""}`, "bad", 3500);
        drawSus();
      }
    }
    function finish() {
      const s = Jobs.grade(R.ok, R.total);
      api.finish({ s, score: R.ok, total: R.total,
        msg: s === 3 ? "محقق عبقري! 🕵️🏆" : s === 2 ? "محقق ذكي! 👏" : "أنهيت التحقيقات! 💪",
        extra: `<div class="won"><span class="emo">❌</span> اتهامات خاطئة: ${R.wrong}</div>` });
    }
    K.mode.stop = () => Jobs.closeOverlay();
    if (Jobs.TEST) window.__pol = { get C() { return C; }, R };
    newCase();
  }

  Jobs.register("police", { how, start });
})();
