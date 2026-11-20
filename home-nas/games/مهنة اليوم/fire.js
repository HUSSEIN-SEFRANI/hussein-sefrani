// مهنة اليوم — الإطفائي 🚒: حرائق في مباني المدينة تكبر مع الوقت. اذهب بسيارة الإطفاء، واختر الطريقة الصحيحة
// لإطفاء كل نوع (سلامة)، واحسب عدد المحتجزين، واملأ خزان الماء من مركز الإطفاء.
(() => {
  "use strict";
  // أنواع الحرائق: الطريقة الصحيحة أولاً ثم الخاطئة، والشرح
  const TYPES = [
    { s: "أوراق وخشب تحترق في", e: "📦", ok: "💧 الماء", bad: ["🌀 مروحة كبيرة", "🛢️ البنزين"], why: "الماء يبرّد الخشب والورق فتنطفئ النار." },
    { s: "زيت يحترق في مطبخ", e: "🍳", ok: "🧶 بطانية الحريق (تغطية)", bad: ["💧 الماء", "🌀 مروحة كبيرة"], why: "الماء على الزيت المشتعل ينثره ويكبّر النار! نغطيه لنمنع الهواء." },
    { s: "أسلاك كهرباء تحترق في", e: "🔌", ok: "⚡ افصل الكهرباء ثم طفاية CO₂", bad: ["💧 الماء فوراً", "🧻 مناديل مبللة"], why: "الماء يوصل الكهرباء وهذا خطر. نفصل الكهرباء أولاً." },
    { s: "بنزين يحترق قرب", e: "⛽", ok: "🧯 طفاية الرغوة أو البودرة", bad: ["💧 الماء", "🌀 مروحة كبيرة"], why: "البنزين يطفو فوق الماء ويبقى مشتعلاً. الرغوة تغطيه." },
    { s: "قماش وستائر تحترق في", e: "🪟", ok: "💧 الماء", bad: ["🛢️ الزيت", "🌀 مروحة كبيرة"], why: "الماء يطفئ القماش والستائر." },
  ];
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, total: Jobs.TEST ? 2 : 14 + 2 * L, speed: 2.8, lights: 3 + 2 * L, cars: 2 + L, fuel: 0,
      burn: [80, 70, 60, 52][L],    // ثوانٍ حتى يحترق المبنى كله
      max: L === 0 ? 1 : L < 3 ? 2 : 3, // حرائق في وقت واحد
      water: [25, 30, 35, 40][L],   // الماء لكل حريق
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت إطفائي شجاع 🧑‍🚒. عندما يشتعل حريق في المدينة اذهب بسرعة بسيارة الإطفاء 🚒.</p>
      <ul>
        <li><b>الأسهم</b> للقيادة، و<b>Enter</b> لصفارة الإنذار. سيارة الإطفاء يُسمح لها بعبور الإشارة الحمراء.</li>
        <li>عند الحريق: <b>اختر الطريقة الصحيحة</b> للإطفاء. ليست كل نار تُطفأ بالماء!</li>
        <li>احسب عدد الناس المحتجزين لتنقذهم كلهم 🧍.</li>
        <li>💧 إذا قلّ الماء ارجع إلى <b>مركز الإطفاء</b> لتملأ الخزان.</li>
        <li>🔥 النار تكبر مع الوقت… أسرع!</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.total} حريقاً</b>${v.max > 1 ? `، وقد يشتعل ${v.max} في وقت واحد` : ""}.</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const run = api.run || { total: v.total, done: 0, ok: 0, fines: 0, coins: 0, lost: 0, water: 100, layout: Jobs.newLayout() };
    let fires = [], spawned = run.done, nextIn = 2;

    const E = Jobs.city(api, {
      run, v, home: "fire", body: "#dc2626", kind: "fire", fuel: false, siren: () => fires.length > 0,
      pills: `<span class="pill"><span class="emo">🔥</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">🧍</span> <b id="hsv"></b></span>
        <span class="pill fuel"><span class="emo">💧</span> <i><u id="hwa"></u></i></span>`,
      hud(E) {
        E.$("#hdn").textContent = `${run.done} / ${run.total}`;
        E.$("#hsv").textContent = run.coins;
        const w = E.$("#hwa"); w.style.width = run.water + "%"; w.style.background = run.water < v.water ? "#ef4444" : "#3b82f6";
      },
      msg(E) {
        if (!fires.length) return `<span class="emo">🚒</span> المدينة آمنة… انتظر النداء التالي 📻`;
        return fires.map((f) => `<span class="emo">🔥</span> حريق في <b>${E.place(f.b).n}</b> <span class="emo">${E.place(f.b).e}</span>`).join(" &nbsp;·&nbsp; ") +
          (run.water < v.water ? ` <small style="color:#dc2626">💧 الماء لا يكفي!</small>` : "");
      },
      arrive(E, b) {
        if (b === E.homeB && run.water < 100) { run.water = 100; K.tone(500, 0.3, "sine", 0.1); Jobs.toast("💧 ملأت خزان الماء"); E.msg(); }
        const f = fires.find((x) => x.b === b);
        if (f) fight(f);
      },
      update(E, dt) {
        for (const f of fires) {
          f.t += dt;
          if (f.t >= v.burn) {
            fires = fires.filter((x) => x !== f);
            run.done++; run.lost++;
            K.sfx.bad(); Jobs.toast(`💨 تأخرت! احترق جزء كبير من ${E.place(f.b).n}`, "bad", 3000);
            after();
          }
        }
        if (spawned < run.total && fires.length < v.max && (nextIn -= dt) <= 0) { spawn(); nextIn = 6 + Math.random() * 8; }
      },
      draw(E) {
        for (const f of fires) {
          const k = f.t / v.burn, p = E.blockXY(f.b);
          E.ring(f.b, "#ef4444");
          const n = Jobs.LITE ? 1 : 1 + Math.floor(k * 3);
          for (let i = 0; i < n; i++) E.emoji("🔥", p.x + 0.6 + i * 0.9, p.y + 0.9 + Math.sin(E.T * 8 + i) * 0.05, 0.7 + k * 0.6);
          if (!Jobs.LITE) E.emoji("💨", p.x + 1.5 + Math.sin(E.T) * 0.3, p.y + 0.2 - (E.T * 0.5 % 0.5), 0.6);
        }
      },
      pauseText: () => `أطفأت ${run.ok} من ${run.total} حريقاً`,
    });

    function spawn() {
      const ok = K.range(0, 15).filter((b) => b !== E.homeB && !fires.some((f) => f.b === b) && Jobs.doorDist(b, E.homeB) >= 4);
      const b = K.pick(ok), type = K.pick(TYPES);
      const floors = 2 + Math.floor(Math.random() * (2 + v.L)), per = 1 + Math.floor(Math.random() * 3);
      fires.push({ b, t: 0, type, floors, per, out: Math.floor(Math.random() * floors * per * 0.5) });
      spawned++;
      [0, 0.3, 0.6].forEach((w) => K.tone(950, 0.18, "square", 0.04, w));
      Jobs.toast(`📻 نداء! حريق في ${E.place(b).n}`, "bad", 2500);
      E.msg();
    }
    function fight(f) {
      E.stopCar();
      if (run.water < v.water) { K.sfx.bad(); Jobs.toast("💧 الماء لا يكفي! املأ الخزان من مركز الإطفاء", "bad", 2800); return; }
      const T = f.type, P = E.place(f.b);
      const opts = K.shuffle([T.ok, ...T.bad]);
      Jobs.overlay(`<h2><span class="emo">${T.e}🔥</span> ${T.s} ${P.n}</h2><div class="sub">كيف تطفئ هذا الحريق؟</div>`,
        opts.map((o) => ({ label: o, cls: "opt txt", fn: () => (o === T.ok ? put(f, true) : wrong(f)) })),
        { cls: "wide", btnCls: "opts col", back: () => {} });
    }
    function wrong(f) {
      run.water = Math.max(0, run.water - 10); f.t = Math.min(v.burn - 5, f.t + 8); f.miss = true;
      K.sfx.bad();
      Jobs.toast(`⚠️ النار كبرت! ${f.type.why}`, "bad", 4200);
      E.hud();
      K.later(() => fight(f), 600);
    }
    function put(f) {
      run.water -= v.water;
      K.confetti(10, "💧💦✨");
      Jobs.toast(`💦 انطفأت النار! ${f.type.why}`, "good", 3200);
      E.hud();
      // الإنقاذ: كم شخصاً بقي في الداخل؟
      const inside = f.floors * f.per - f.out;
      const q = v.L === 0
        ? { t: `في المبنى ${f.floors} طوابق، وفي كل طابق ${f.per === 1 ? "شخص واحد" : `${f.per} أشخاص`}. كم شخصاً ننقذ؟`, a: f.floors * f.per }
        : { t: `في المبنى ${f.floors} طوابق، وفي كل طابق ${f.per} ${f.per > 2 ? "أشخاص" : "شخص"}. خرج ${f.out} وحدهم. كم شخصاً بقي في الداخل؟`, a: inside };
      K.later(() => Jobs.overlay(`<h2>🪜 الإنقاذ</h2><div class="sub">${q.t}</div>`,
        Jobs.numOptions(q.a, 3, [1, 2, 3]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => saved(f, n === q.a, q.a) })),
        { cls: "wide", btnCls: "opts" }), 700);
    }
    function saved(f, right, n) {
      fires = fires.filter((x) => x !== f);
      run.done++;
      run.coins += n;
      if (right && !f.miss) run.ok++;
      if (right) { K.sfx.ok(); Jobs.toast(`🧍 أنقذت ${n} ${n > 2 && n < 11 ? "أشخاص" : "شخصاً"}! بطل 🦸`, "good"); }
      else { K.sfx.bad(); Jobs.toast(`كان في الداخل ${n} — عددنا مرة أخرى وأنقذناهم كلهم 🧍`, "bad", 3200); }
      after();
    }
    function after() {
      E.keep(); E.hud(); E.msg();
      if (run.done >= run.total) K.later(finish, 1500);
    }
    function finish() {
      const s = Jobs.grade(run.ok, run.total, run.lost);
      api.finish({ s, score: run.ok, total: run.total,
        msg: s === 3 ? "إطفائي بطل! 🧑‍🚒🏆" : s === 2 ? "مدينة آمنة! 👏" : "أنهيت الوردية! 💪",
        extra: `<div class="won"><span class="emo">🧍</span> أنقذت ${run.coins} &nbsp; <span class="emo">💨</span> مبانٍ تضررت: ${run.lost}</div>` });
    }

    if (Jobs.TEST) window.__fire = { E, get fires() { return fires; }, run };
    E.hud(); E.msg();
  }

  Jobs.register("fire", { how, start });
})();
