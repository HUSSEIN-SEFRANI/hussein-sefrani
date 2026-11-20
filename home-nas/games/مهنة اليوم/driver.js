// مهنة اليوم — السائق 🚕: ركاب ينتظرون، إشارات مرور، وقود، وحساب الباقي من الأجرة. (المدينة في city.js)
(() => {
  "use strict";
  const WHO = ["🧑", "👩", "👨", "👵", "👴", "🧕", "👦", "👧", "🧔", "👨‍💼", "👩‍🎓", "👨‍🦳", "👩‍🦱", "🧑‍🦯"];
  const SAY = ["خذني إلى", "أريد الذهاب إلى", "من فضلك إلى", "أوصلني إلى", "عندي موعد في"];

  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L,
      total: Jobs.TEST ? 3 : 18 + 2 * L,       // عدد الركاب في الوردية (~10–15 دقيقة)
      speed: 2.6, lights: 3 + 2 * L, cars: 2 + L,
      fuel: 0.35 + 0.1 * L,                     // استهلاك لكل مربع
      tip: 45 - 5 * L,                          // ثوانٍ للإكرامية
      hint: [0, 12, 20, 30][L],                 // بعد كم ثانية تظهر علامة المكان المطلوب
      rate: L >= 2 ? 2 : 1,                     // الأجرة لكل مربع
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت سائق سيارة أجرة 🚕 في المدينة. اذهب إلى الراكب 🧍، ثم أوصله إلى المكان الذي يطلبه.</p>
      <ul>
        <li><b>الأسهم</b> (اضغط باستمرار) للقيادة.</li>
        <li>عند الوصول: الراكب يدفع، و<b>أنت تحسب الباقي</b> 💰.</li>
        <li>🚦 قف عند الإشارة الحمراء، وانتبه للسيارات.</li>
        <li>⛽ إذا قلّ الوقود اذهب إلى محطة الوقود.</li>
        <li>⏱ أوصل الراكب بسرعة لتأخذ إكرامية.</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.total} راكباً</b>${v.L ? " — المدينة أصعب من الوردية الماضية!" : ""}</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const run = api.run || { total: v.total, done: 0, coins: 0, fines: 0, ok: 0, fuel: 100, layout: Jobs.newLayout() };
    let pass = null, waitNext = 0, hint = false;

    const E = Jobs.city(api, {
      run, v, home: "gas", body: "#facc15", kind: "taxi", fuel: true,
      pills: `<span class="pill"><span class="emo">🧍</span> <b id="htr"></b></span>
        <span class="pill"><span class="emo">💰</span> <b id="hco"></b></span>
        <span class="pill" id="hti"></span>`,
      hud(E) {
        E.$("#htr").textContent = `${run.done} / ${run.total}`;
        E.$("#hco").textContent = run.coins;
        const ti = E.$("#hti");
        if (pass && pass.stage === "ride") {
          const left = Math.max(0, Math.ceil(v.tip - pass.t));
          ti.innerHTML = left ? `<span class="emo">⏱</span> ${left}` : `<span class="emo">🐢</span>`;
          ti.style.visibility = "";
        } else ti.style.visibility = "hidden";
      },
      msg(E) {
        if (!pass) return `<span class="emo">🚕</span> انتظر… راكب جديد قادم`;
        const p = E.place(pass.stage === "wait" ? pass.from : pass.to);
        if (pass.stage === "wait") return `<span class="emo">🧍</span> راكب ينتظرك عند <b>${p.n}</b> <span class="emo">${p.e}</span>`;
        return `<span class="emo">${pass.who}</span> «${pass.say} <b>${p.n}</b>» <span class="emo">${p.e}</span>${hint && v.hint ? ` <small>💡 انظر إلى العلامة</small>` : ""}`;
      },
      arrive(E, b) {
        if (!pass) return;
        if (pass.stage === "wait" && b === pass.from) { pass.stage = "ride"; pass.t = 0; hint = v.hint === 0; K.sfx.ok(); E.msg(); }
        else if (pass.stage === "ride" && b === pass.to) deliver();
      },
      update(E, dt) {
        if (pass) {
          pass.t += dt;
          if (pass.stage === "ride" && !hint && pass.t >= v.hint) { hint = true; E.msg(); }
          if (pass.stage === "ride" && Math.ceil(v.tip - pass.t) !== Math.ceil(v.tip - pass.t + dt)) E.hud();
        } else if (waitNext > 0 && (waitNext -= dt) <= 0) spawn();
      },
      draw(E) {
        if (!pass) return;
        if (pass.stage === "wait") {
          E.ring(pass.from, "#facc15");
          const d = E.door(pass.from), bob = Math.sin(E.T * 5) * 0.06;
          E.emoji(pass.who, d.x + 0.5, d.y + 0.45 + bob, 0.8);
          E.emoji("✋", d.x + 0.95, d.y + 0.05 + bob, 0.45);
        } else if (hint) {
          E.ring(pass.to, "#22c55e");
          const d = E.door(pass.to);
          E.emoji("🏁", d.x + 0.5, d.y + 0.45, 0.7);
        }
      },
      drawTop(E) { if (pass && pass.stage === "ride") E.emoji(pass.who, E.car.x + 0.5, E.car.y - 0.15, 0.5); },
      pauseText: () => `أوصلت ${run.done} من ${run.total} راكباً`,
    });

    function spawn() {
      const ok = K.range(0, 15).filter((b) => b !== E.find("gas"));
      let from, to, g = 0;
      do {
        from = K.pick(ok); to = K.pick(ok);
        if (to !== from && Jobs.doorDist(from, to) >= 6 && !E.at(from)) break;
      } while (++g < 40);
      pass = { from, to, who: K.pick(WHO), say: K.pick(SAY), stage: "wait", t: 0 };
      hint = false;
      E.msg(); E.hud();
    }
    function deliver() {
      const fare = 5 + Jobs.doorDist(pass.from, pass.to) * v.rate;
      const tip = pass.t <= v.tip ? (v.L >= 2 ? 10 : 5) : 0;
      const steps = v.L >= 2 && Math.random() < 0.4 ? [50, 100] : [10, 20, 50];
      let paid = steps.map((s) => Math.ceil(fare / s) * s).find((p) => p > fare) || fare + 10;
      const change = paid - fare, who = pass.who, P = E.place(pass.to);
      E.stopCar();
      K.sfx.tick();
      Jobs.overlay(`
        <div class="pay"><span class="emo big">${who}</span><div>
          <div>وصلنا إلى <b>${P.n}</b> ${P.e} — شكراً!</div>
          <div class="fare">الأجرة: <b>${fare}</b> 💰 &nbsp; أعطاك: <b>${paid}</b> 💵</div>
          ${tip ? `<div class="tipline">⏱ وصلت بسرعة! إكرامية +${tip}</div>` : ""}
        </div></div>
        <h2>كم الباقي الذي تعطيه للراكب؟</h2>`,
        Jobs.numOptions(change, 3, v.L ? [1, 2, 5, 10] : [1, 5, 10]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => paidBack(n === change, change, fare, tip) })),
        { cls: "wide", btnCls: "opts" });
    }
    function paidBack(right, change, fare, tip) {
      if (right) {
        run.ok++; run.coins += fare + tip;
        K.sfx.ok(); K.confetti(8, "💰✨⭐");
        Jobs.toast(`صحيح! الباقي ${change} 👏 ربحت ${fare + tip} 💰`, "good");
      } else {
        run.coins += fare;
        K.sfx.bad();
        Jobs.toast(`الباقي الصحيح ${change} — الراكب لم يعطك إكرامية 🙁`, "bad", 3500);
      }
      run.done++;
      pass = null;
      E.keep(); E.hud();
      if (run.done >= run.total) return K.later(finish, 1600);
      waitNext = 1.6;
      E.msg();
    }
    function finish() {
      const s = run.fines === 0 && run.ok >= run.total * 0.85 ? 3 : run.ok >= run.total * 0.6 && run.fines <= 3 ? 2 : 1;
      api.finish({
        s, score: run.ok, total: run.total,
        msg: s === 3 ? "سائق محترف! 🏆" : s === 2 ? "سائق ماهر! 👏" : "أنهيت الوردية! 💪",
        extra: `<div class="won"><span class="emo">💰</span> ربحت ${run.coins} &nbsp; <span class="emo">🚦</span> مخالفات: ${run.fines}</div>`,
      });
    }

    if (Jobs.TEST) window.__drv = { taxi: E.car, run, door: E.door, get pass() { return pass; } };
    E.hud();
    if (run.done === 0 && !api.run) { E.say(`<span class="emo">🚕</span> صباح الخير أيها السائق! استعد…`); waitNext = 1.5; }
    else spawn();
  }

  Jobs.register("driver", { how, start });
})();
