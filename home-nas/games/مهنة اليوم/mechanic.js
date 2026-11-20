// مهنة اليوم — الميكانيكي 🧑‍🔧: سيارات تصل بأعطال. يسمع الشكوى ويختار القطعة المعطلة، ثم يقرأ مقياساً
// (ضغط الإطار، الزيت، البطارية، الحرارة) ويحسب ما يلزم، وفي المستويات العليا يكتب الفاتورة (قطع + ساعات عمل).
(() => {
  "use strict";
  const CARS = ["🚗", "🚙", "🛻", "🚐", "🚕", "🏎️", "🚓", "🚑"];
  const COL = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#64748b"];
  const PROB = [
    { k: "tire", say: "السيارة تميل إلى جهة، والإطار يبدو منخفضاً", part: "🛞 الإطار", price: 15, hrs: 1 },
    { k: "battery", say: "السيارة لا تشتغل، والأضواء ضعيفة جداً", part: "🔋 البطارية", price: 40, hrs: 1 },
    { k: "oil", say: "ضوء الزيت 🛢️ يضيء في لوحة السيارة", part: "🛢️ زيت المحرك", price: 10, hrs: 1 },
    { k: "hot", say: "مؤشر الحرارة مرتفع، والبخار يخرج من المقدمة", part: "💧 ماء التبريد", price: 8, hrs: 2 },
    { k: "brake", say: "أسمع صفيراً قوياً عندما أضغط الفرامل", part: "🛑 الفرامل", price: 30, hrs: 2 },
    { k: "light", say: "الضوء الأمامي لا يعمل في الليل", part: "💡 المصباح", price: 5, hrs: 1 },
    { k: "wiper", say: "المساحات لا تمسح الزجاج جيداً في المطر", part: "🌧️ المساحات", price: 6, hrs: 1 },
  ];
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return { L, total: Jobs.TEST ? 2 : 16 + 2 * L, probs: [4, 5, 7, 7][L], bill: L >= 1, rate: [0, 10, 12, 15][L], two: L >= 3 };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت ميكانيكي في الورشة 🧑‍🔧. السيارات تصل واحدة بعد واحدة، وأصحابها ينتظرون.</p>
      <ul>
        <li>اسمع شكوى صاحب السيارة واختر <b>القطعة المعطلة</b>.</li>
        <li>اقرأ <b>المقياس</b> واحسب ما يلزم (ضغط الهواء، الزيت، الشحن…).</li>
        ${v.bill ? `<li>🧾 اكتب <b>الفاتورة</b>: ثمن القطعة + ساعات العمل × ${v.rate}.</li>` : ""}
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.total} سيارة</b>.</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const R = api.run || { total: v.total, done: 0, ok: 0, coins: 0, steps: 0, good: 0 };
    let car = null, queue = [];

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">🚗</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">💰</span> <b id="hco"></b></span>
      </div>
      <div class="garage">
        <div class="bay" id="bay"></div>
        <div class="queue" id="queue"></div>
      </div>`);
    const $ = (s) => K.app.querySelector(s);
    const pauseIt = () => Jobs.pause(api, R, `أصلحت ${R.done} من ${R.total} سيارة`);
    K.mode = Jobs.domMode(pauseIt);
    $("#hp").addEventListener("click", pauseIt);
    const hud = () => { $("#hdn").textContent = `${R.done} / ${R.total}`; $("#hco").textContent = R.coins; };
    const probs = PROB.slice(0, v.probs);
    const newCar = () => ({ e: K.pick(CARS), c: K.pick(COL), p: K.pick(probs) });

    function draw() {
      Jobs.fill($("#bay"), car ? `<div class="lift"><span class="emo carx" style="filter:drop-shadow(0 0 0 ${car.c})">${car.e}</span></div>
        <div class="talk"><span class="emo">🧑</span> «${car.p.say}»</div>
        <button class="btn f go" ${K.act("fix", diagnose)}>🔧 ابدأ الإصلاح</button>` : `<div class="sub">لا سيارة في الورشة…</div>`);
      $("#queue").innerHTML = `<small>ينتظرون:</small>` + queue.map((q) => `<span class="emo">${q.e}</span>`).join("");
    }
    function nextCar() {
      if (R.done >= R.total) return finish();
      while (queue.length < Math.min(3, R.total - R.done)) queue.push(newCar());
      car = queue.shift();
      K.tone(200, 0.3, "sawtooth", 0.04); K.tone(260, 0.3, "sawtooth", 0.04, 0.2);
      draw(); hud();
    }
    const mark = (right, okMsg, badMsg) => {
      R.steps++;
      if (right) { R.good++; car.score++; K.sfx.ok(); Jobs.toast(okMsg, "good", 1800); }
      else { K.sfx.bad(); Jobs.toast(badMsg, "bad", 3200); }
    };
    function diagnose() {
      car.score = 0; car.n = 0;
      const opts = K.shuffle([car.p, ...K.shuffle(PROB.filter((x) => x !== car.p)).slice(0, 2)]);
      Jobs.overlay(`<h2>🔍 «${car.p.say}»</h2><div class="sub">ما القطعة التي تحتاج إصلاحاً؟</div>`,
        opts.map((o) => ({ label: o.part, cls: "opt txt", fn: () => { car.n++; mark(o === car.p, "تشخيص صحيح! 🔍", `العطل في ${car.p.part}`); K.later(measure, 900); } })),
        { cls: "wide", btnCls: "opts", back: () => {} });
    }
    // مقياس لكل عطل
    function measure() {
      const k = car.p.k;
      let html, ans, opts;
      if (k === "tire") {
        const need = K.pick([30, 32, 35]), now = need - (4 + Math.floor(Math.random() * 12));
        html = `${gauge(now, 0, 50, "PSI")}<div><h2>🛞 ضغط الإطار الآن</h2><div class="sub">المطلوب <b>${need}</b>. كم نضيف من الهواء؟</div></div>`;
        ans = need - now; opts = Jobs.numOptions(ans, 3, [1, 2, 4]);
      } else if (k === "battery") {
        const volt = K.pick([11.2, 11.5, 11.8, 12.6, 12.7]);
        html = `${gauge(volt, 10, 14, "V")}<div><h2>🔋 جهد البطارية</h2><div class="sub">البطارية السليمة تقرأ <b>12.4 فولت أو أكثر</b>. ماذا نفعل؟</div></div>`;
        ans = volt >= 12.4 ? "✅ البطارية سليمة (المشكلة في الأسلاك)" : "🔁 نغيّر البطارية"; opts = K.shuffle(["✅ البطارية سليمة (المشكلة في الأسلاك)", "🔁 نغيّر البطارية"]);
      } else if (k === "oil") {
        const marks = 2 + Math.floor(Math.random() * 3), have = Math.floor(Math.random() * marks);
        html = `${dipstick(have, marks + have)}<div><h2>🛢️ عصا قياس الزيت</h2><div class="sub">الزيت عند العلامة <b>${have}</b>، والممتلئ عند العلامة <b>${marks + have}</b>. كل علامة = <b>نصف لتر</b>. كم لتراً نضيف؟</div></div>`;
        ans = marks / 2; opts = Jobs.numOptions(ans, 3, [0.5, 1]).map((x) => x);
      } else if (k === "hot") {
        const t = K.pick([105, 110, 115, 120]);
        html = `${gauge(t, 50, 130, "°C")}<div><h2>🌡️ حرارة المحرك</h2><div class="sub">الطبيعي حوالي <b>90°</b>. كم درجة فوق الطبيعي؟</div></div>`;
        ans = t - 90; opts = Jobs.numOptions(ans, 3, [5, 10]);
      } else if (k === "brake") {
        const mm = K.pick([1, 2, 3, 6, 8]);
        html = `<div class="pad-thick"><span>${"▮".repeat(mm)}</span><small>${mm} مم</small></div><div><h2>🛑 سماكة وسادة الفرامل</h2><div class="sub">إذا كانت <b>أقل من 3 مم</b> نغيّرها. ماذا نفعل؟</div></div>`;
        ans = mm < 3 ? "🔁 نغيّر الفرامل" : "✅ الفرامل جيدة (ننظفها فقط)"; opts = K.shuffle(["🔁 نغيّر الفرامل", "✅ الفرامل جيدة (ننظفها فقط)"]);
      } else {
        const n = 2 + Math.floor(Math.random() * 3), each = car.p.price;
        html = `<div class="pad-thick"><span class="emo">${car.p.part.split(" ")[0].repeat(n)}</span></div><div><h2>${car.p.part}</h2><div class="sub">نحتاج <b>${n}</b> قطع، وثمن القطعة <b>${each}</b>. كم الثمن كله؟</div></div>`;
        ans = n * each; opts = Jobs.numOptions(ans, 3, [each, 2, 5]);
      }
      car.n++;
      Jobs.overlay(`<div class="exam">${html}</div>`, opts.map((o) => ({ label: typeof o === "number" ? `<span class="num">${o}</span>` : o, cls: typeof o === "number" ? "opt" : "opt txt", fn: () => {
        mark(o === ans, "قراءة صحيحة! 🔧", `الجواب الصحيح: ${ans}`); K.later(v.bill ? bill : done, 900);
      } })), { cls: "wide", btnCls: "opts", back: () => {} });
    }
    function bill() {
      const hrs = car.p.hrs + (v.two ? 1 : 0), ans = car.p.price + hrs * v.rate;
      car.n++;
      Jobs.overlay(`<h2>🧾 الفاتورة</h2><div class="sub">ثمن القطعة <b>${car.p.price}</b> + العمل <b>${hrs} ${hrs === 1 ? "ساعة" : hrs === 2 ? "ساعتان" : "ساعات"}</b> × <b>${v.rate}</b> لكل ساعة = ؟</div>`,
        Jobs.numOptions(ans, 3, [v.rate, 5, 10]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => {
          mark(n === ans, `صحيح! ${car.p.price} + ${hrs} × ${v.rate} = ${ans}`, `الفاتورة: ${car.p.price} + ${hrs * v.rate} = ${ans}`);
          R.coins += ans; K.later(done, 900);
        } })), { cls: "wide", btnCls: "opts", back: () => {} });
    }
    function done() {
      R.done++;
      if (!v.bill) R.coins += car.p.price;
      if (car.score === car.n) { R.ok++; K.confetti(8, "🔧✨⭐"); }
      Jobs.toast(`${car.e} انطلقت السيارة! شكراً 👋`, "good", 1500);
      api.keep(R); car = null; draw(); hud();
      K.later(nextCar, 1200);
    }
    function finish() {
      const s = Jobs.grade(R.ok, R.total);
      api.finish({ s, score: R.ok, total: R.total,
        msg: s === 3 ? "ميكانيكي محترف! 🧑‍🔧🏆" : s === 2 ? "ورشة ناجحة! 👏" : "أنهيت الوردية! 💪",
        extra: `<div class="won"><span class="emo">✅</span> خطوات صحيحة: ${R.good} من ${R.steps} &nbsp; <span class="emo">💰</span> ${R.coins}</div>` });
    }
    // مقياس بعقرب (SVG)
    function gauge(val, lo, hi, unit) {
      const a = (-120 + ((val - lo) / (hi - lo)) * 240) * (Math.PI / 180);
      let t = "";
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const x = lo + ((hi - lo) * i) / steps, b = (-120 + (i / steps) * 240) * (Math.PI / 180);
        t += `<line x1="${Math.sin(b) * 78}" y1="${-Math.cos(b) * 78}" x2="${Math.sin(b) * 92}" y2="${-Math.cos(b) * 92}" stroke="#1e3a8a" stroke-width="3"/>`;
        t += `<text x="${Math.sin(b) * 62}" y="${-Math.cos(b) * 62 + 6}" text-anchor="middle" font-size="15" font-weight="800" fill="#1e3a8a">${+x.toFixed(1)}</text>`;
      }
      return `<svg class="gauge" viewBox="-100 -100 200 160"><path d="M ${Math.sin(-2.094) * 95} ${-Math.cos(-2.094) * 95} A 95 95 0 1 1 ${Math.sin(2.094) * 95} ${-Math.cos(2.094) * 95}" fill="#fff" stroke="#1e3a8a" stroke-width="4"/>${t}
        <line x1="0" y1="0" x2="${Math.sin(a) * 74}" y2="${-Math.cos(a) * 74}" stroke="#ef4444" stroke-width="5" stroke-linecap="round"/><circle r="8" fill="#1e3a8a"/>
        <text y="40" text-anchor="middle" font-size="20" font-weight="800" fill="#be185d">${val} ${unit}</text></svg>`;
    }
    function dipstick(have, full) {
      const H = 24;
      let m = "";
      for (let i = 0; i <= full; i++) m += `<line x1="20" x2="60" y1="${250 - i * H}" y2="${250 - i * H}" stroke="#1e3a8a" stroke-width="2"/><text x="66" y="${256 - i * H}" font-size="16" font-weight="800" fill="#1e3a8a">${i}</text>`;
      return `<svg class="thermo" viewBox="0 0 100 270"><rect x="30" y="${250 - full * H - 10}" width="20" height="${full * H + 20}" rx="8" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <rect x="32" y="${250 - have * H}" width="16" height="${have * H + 8}" fill="#a16207"/>${m}</svg>`;
    }

    K.mode.stop = () => Jobs.closeOverlay();
    if (Jobs.TEST) window.__mech = { get car() { return car; }, R };
    nextCar();
  }

  Jobs.register("mechanic", { how, start });
})();
