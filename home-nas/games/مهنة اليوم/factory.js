// مهنة اليوم — عامل المصنع 🏭: سير متحرك عليه منتجات. يفحص العامل كل قطعة أمامه: السليمة إلى صندوقها
// والمعيبة إلى ❌. الصندوق الممتلئ يُغلق، ومع الصناديق أسئلة ضرب. وقواعد السلامة: الملابس، وإيقاف الآلة قبل إصلاحها.
(() => {
  "use strict";
  const PRODUCTS = [{ e: "🧸", n: "دب" }, { e: "🚗", n: "سيارة" }, { e: "⚽", n: "كرة" }, { e: "🪀", n: "يويو" }];
  const DEFECTS = [
    { k: "broken", n: "مكسور" },  // شارة 💥
    { k: "faded", n: "باهت" },    // لون باهت
    { k: "small", n: "صغير" },    // حجم أصغر
  ];
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, len: Jobs.TEST ? 25 : 600,            // طول الوردية بالثواني (10 دقائق)
      types: [1, 2, 3, 3][L], defects: [1, 2, 3, 3][L], bad: [0.25, 0.25, 0.3, 0.3][L],
      cross: [9, 8, 7, 6][L], gap: [2.6, 2.3, 2, 1.8][L], cap: [6, 6, 8, 10][L], jam: L >= 1 ? 75 : 0,
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت عامل في مصنع الألعاب 🏭. المنتجات تمر أمامك على السير المتحرك.</p>
      <ul>
        <li>انظر إلى القطعة داخل <b>منطقة الفحص</b> 🔍.</li>
        <li>السليمة ← اضغط <b>صندوقها</b> 📦. المعيبة (${DEFECTS.slice(0, v.defects).map((d) => d.n).join("، ")}) ← اضغط <b>❌</b>.</li>
        <li>كل صندوق فيه ${v.cap} قطع، ويُغلق وحده عندما يمتلئ.</li>
        <li>⛑️ السلامة أولاً${v.jam ? "، وإذا علقت الآلة: أوقفها قبل إصلاحها" : ""}.</li>
      </ul>
      <p class="goal">الوردية: <b>10 دقائق</b>${v.types > 1 ? `، و${v.types} أنواع من المنتجات` : ""}.</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const R = api.run || { total: 0, ok: 0, t: 0, sealed: 0, safe: false, boxes: {}, done: 0 };
    R.total = R.total || 0;
    const types = PRODUCTS.slice(0, v.types);
    let items = [], nextIn = 0.5, jamIn = v.jam || 1e9, idn = 0;

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">⏱</span> <b id="hti"></b></span>
        <span class="pill"><span class="emo">📦</span> صناديق: <b id="hbx"></b></span>
        <span class="pill"><span class="emo">✅</span> <b id="hok"></b></span>
      </div>
      <div class="factory">
        <div class="belt" id="belt"><div class="zone">🔍</div></div>
        <div class="acts">${types.map((p, k) => `<button class="btn f box" ${K.act("b" + k, () => act(p.e))}><span class="emo">📦${p.e}</span><u><i id="bf${k}"></i></u></button>`).join("")}
          <button class="btn f reject" ${K.act("x", () => act(null))}><span class="emo">❌</span> معيب</button></div>
        <div class="legend">${DEFECTS.slice(0, v.defects).map((d) => `<span>${sample(d.k)} ${d.n}</span>`).join("")}<span>${sample("")} سليم</span></div>
      </div>`, "b0");
    const $ = (s) => K.app.querySelector(s);
    const belt = $("#belt");
    const pauseIt = () => Jobs.pause(api, R, `صناديق مغلقة: ${R.sealed}`);
    K.mode = Jobs.domMode(pauseIt);
    $("#hp").addEventListener("click", pauseIt);
    function sample(k) { return `<span class="emo it ${k}">${types[0].e}${k === "broken" ? "<b>💥</b>" : ""}</span>`; }
    const hud = () => {
      const left = Math.max(0, v.len - R.t);
      $("#hti").textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
      $("#hbx").textContent = R.sealed; $("#hok").textContent = `${R.ok} / ${R.total}`;
      types.forEach((p, k) => { const f = $("#bf" + k); if (f) f.style.width = ((R.boxes[p.e] || 0) / v.cap) * 100 + "%"; });
    };

    function spawn() {
      const p = K.pick(types), bad = Math.random() < v.bad ? K.pick(DEFECTS.slice(0, v.defects)).k : "";
      const el = document.createElement("span");
      el.className = "emo it " + bad;
      el.innerHTML = p.e + (bad === "broken" ? "<b>💥</b>" : "");
      belt.appendChild(el);
      items.push({ id: idn++, e: p.e, bad, x: -6, el });
    }
    const inZone = () => items.find((i) => !i.done && i.x >= 40 && i.x <= 60);
    function act(box) {
      const it = inZone();
      if (!it) return Jobs.toast("لا قطعة في منطقة الفحص 🔍", "", 900);
      it.done = true; R.total++;
      let good;
      if (box === null) good = !!it.bad;
      else good = !it.bad && box === it.e;
      it.el.classList.add(box === null ? "gone-x" : "gone-box");
      if (good) {
        R.ok++; K.tone(box === null ? 300 : 700, 0.08);
        if (box) {
          R.boxes[box] = (R.boxes[box] || 0) + 1;
          if (R.boxes[box] >= v.cap) seal(box);
        }
      } else {
        K.sfx.bad();
        Jobs.toast(it.bad && box ? `هذه القطعة معيبة (${DEFECTS.find((d) => d.k === it.bad).n})! ضعها في ❌` : box === null ? "هذه القطعة سليمة! ضعها في صندوقها" : "صندوق خطأ! انظر إلى نوع القطعة", "bad", 1800);
      }
      hud();
    }
    function seal(box) {
      R.boxes[box] = 0; R.sealed++;
      K.tone(523, 0.1); K.tone(659, 0.1, "sine", 0.15, 0.1); K.tone(784, 0.15, "sine", 0.15, 0.2);
      Jobs.toast(`📦 أُغلق صندوق ${box}!`, "good", 1300);
      api.keep(R);
      if (R.sealed % 3 === 0) {
        const n = R.sealed, ans = n * v.cap;
        R.total++;
        Jobs.overlay(`<h2>📋 تقرير الإنتاج</h2><div class="sub">أغلقت <b>${n}</b> صناديق، وفي كل صندوق <b>${v.cap}</b> قطع. كم قطعة صنعنا؟</div>`,
          Jobs.numOptions(ans, 3, [v.cap, 2, 10]).map((x) => ({ label: `<span class="num">${x}</span>`, cls: "opt", fn: () => {
            if (x === ans) { R.ok++; K.sfx.ok(); Jobs.toast(`صحيح! ${n} × ${v.cap} = ${ans}`, "good"); } else { K.sfx.bad(); Jobs.toast(`${n} × ${v.cap} = ${ans}`, "bad", 2600); }
            hud();
          } })), { cls: "wide", btnCls: "opts", back: () => {} });
      }
    }
    function safety() {
      R.total++;
      Jobs.overlay(`<h2>⛑️ قبل دخول المصنع</h2><div class="sub">ماذا تلبس للعمل قرب الآلات؟</div>`, K.shuffle([
        { label: "⛑️ خوذة + 🦺 سترة عاكسة + 🧤 قفازات + 🥾 حذاء أمان", cls: "opt txt", fn: () => { R.ok++; R.safe = true; K.sfx.ok(); Jobs.toast("أحسنت! السلامة أولاً ⛑️", "good"); hud(); } },
        { label: "🩴 شبشب + 🧢 قبعة", cls: "opt txt", fn: () => { R.safe = true; K.sfx.bad(); Jobs.toast("خطر! في المصنع نلبس الخوذة والسترة والقفازات وحذاء الأمان", "bad", 3500); hud(); } },
        { label: "👔 ملابس العيد + 💍 خاتم", cls: "opt txt", fn: () => { R.safe = true; K.sfx.bad(); Jobs.toast("الملابس الواسعة والخواتم قد تعلق في الآلات! نلبس ملابس السلامة", "bad", 3500); hud(); } },
      ]), { cls: "wide", btnCls: "opts col" });
    }
    function jam() {
      R.total++;
      K.tone(200, 0.4, "sawtooth", 0.08);
      Jobs.overlay(`<h2>⚠️ الآلة علقت!</h2><div class="sub">قطعة عالقة في السير. ماذا تفعل أولاً؟</div>`, K.shuffle([
        { label: "🛑 أضغط زر الإيقاف الأحمر، ثم أخرج القطعة", cls: "opt txt", fn: () => { R.ok++; K.sfx.ok(); Jobs.toast("صحيح! لا نلمس آلة تعمل أبداً 🛑", "good", 2400); hud(); } },
        { label: "✋ أدخل يدي بسرعة والآلة تعمل", cls: "opt txt", fn: () => { K.sfx.bad(); Jobs.toast("خطر جداً! نوقف الآلة أولاً دائماً 🛑", "bad", 3200); hud(); } },
        { label: "🦶 أركل الآلة حتى تتحرك", cls: "opt txt", fn: () => { K.sfx.bad(); Jobs.toast("هذا يكسر الآلة ويؤذيك. نوقفها أولاً 🛑", "bad", 3200); hud(); } },
      ]), { cls: "wide", btnCls: "opts col" });
    }
    function finish() {
      const s = Jobs.grade(R.ok, Math.max(1, R.total));
      api.finish({ s, score: R.ok, total: R.total,
        msg: s === 3 ? "عامل دقيق ومحترف! 🏭🏆" : s === 2 ? "إنتاج جيد! 👏" : "انتهت الوردية! 💪",
        extra: `<div class="won"><span class="emo">📦</span> صناديق مغلقة: ${R.sealed}</div>` });
    }

    let ended = false;
    const stop = Jobs.loop((dt) => {
      if (Jobs.ov || ended) return;
      R.t += dt;
      const speed = 112 / (v.cross * (1 - Math.min(0.25, R.t / v.len * 0.25)));   // يسرع قليلاً مع الوقت
      for (const it of items) {
        it.x += speed * dt;
        it.el.style.left = it.x + "%";
        if (!it.done && it.x > 62) {
          it.done = true; R.total++;
          if (it.bad) { K.sfx.bad(); Jobs.toast("فاتتك قطعة معيبة! ⚠️", "bad", 1400); }
          else { K.tone(200, 0.1); Jobs.toast("فاتتك قطعة سليمة 🙁", "bad", 1200); }
          it.el.classList.add("missed"); hud();
        }
      }
      items = items.filter((it) => { if (it.x > 106) { it.el.remove(); return false; } return true; });
      if ((nextIn -= dt) <= 0) { spawn(); nextIn = v.gap * (0.8 + Math.random() * 0.5); }
      if ((jamIn -= dt) <= 0) { jamIn = v.jam * (0.8 + Math.random() * 0.5); jam(); }
      const z = inZone();
      for (const it of items) it.el.classList.toggle("now", it === z);
      if (Math.floor(R.t) !== Math.floor(R.t - dt)) { hud(); if (Math.floor(R.t) % 15 === 0) api.keep(R); }
      if (R.t >= v.len) { ended = true; api.keep(R); K.later(finish, 600); }
    });
    K.mode.stop = () => { stop(); Jobs.closeOverlay(); };
    if (Jobs.TEST) window.__fac = { get items() { return items; }, R, inZone };
    hud();
    if (!R.safe) K.later(safety, 300);
  }

  Jobs.register("factory", { how, start, label: (r) => `${Math.floor(r.t / 60)} من 10 دقائق` });
})();
