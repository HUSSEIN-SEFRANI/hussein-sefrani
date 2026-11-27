// مهنة اليوم — ساعي البريد 📮: في كل جولة يأخذ حقيبة رسائل وطرود من مكتب البريد، ويوزعها حسب أرقام المباني
// (يقرأ الخريطة ويخطط طريقه)، ويحسب أجرة الطرود بالوزن، ثم يرجع إلى المكتب قبل انتهاء الوقت.
(() => {
  "use strict";
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, rounds: Jobs.TEST ? 1 : 6 + L, bag: [3, 4, 4, 5][L], speed: 2.6, lights: 3 + 2 * L, cars: 2 + L, fuel: 0,
      time: [100, 95, 95, 90][L],     // ثوانٍ لكل جولة (للمكافأة)
      names: L < 2, rings: L === 0,   // في الورديات الأولى يُكتب اسم المبنى، وفي الأولى فقط يُعلَّم على الخريطة
      price: [[2, 3], [3, 5], [4, 7], [5, 9]][L],
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت ساعي البريد 📮. في كل جولة تأخذ حقيبة من <b>مكتب البريد</b> وتوزعها على المباني.</p>
      <ul>
        <li>كل مبنى له <b>رقم</b> 🔵 على الخريطة. اقرأ العنوان واذهب إلى المبنى الصحيح.</li>
        <li>خطط طريقك: وزّع بالترتيب الأقرب لتوفّر الوقت ⏱.</li>
        <li>📦 الطرد يُدفع حسب وزنه: احسب الأجرة.</li>
        <li>بعد توزيع الحقيبة ارجع إلى مكتب البريد 📮 لتأخذ الجولة التالية.</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.rounds} جولات</b>، في كل حقيبة ${v.bag} رسائل وطرود${v.names ? "" : "، والعناوين أرقام فقط!"}.</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const run = api.run || { total: v.rounds, done: 0, ok: 0, items: 0, fines: 0, coins: 0, fast: 0, layout: Jobs.newLayout() };
    let bag = [], t = 0, loaded = false;

    const E = Jobs.city(api, {
      run, v, home: "post", body: "#e11d48", kind: "mail", fuel: false, numbers: true,
      pills: `<span class="pill"><span class="emo">🎒</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">💰</span> <b id="hco"></b></span>
        <span class="pill" id="hti"></span>`,
      hud(E) {
        E.$("#hdn").textContent = `${run.done} / ${run.total}`;
        E.$("#hco").textContent = run.coins;
        const ti = E.$("#hti");
        if (loaded) { const left = Math.max(0, Math.ceil(v.time - t)); ti.innerHTML = left ? `<span class="emo">⏱</span> ${left}` : `<span class="emo">🐢</span>`; ti.style.visibility = ""; }
        else ti.style.visibility = "hidden";
      },
      msg(E) {
        if (!loaded) return `<span class="emo">📮</span> اذهب إلى <b>مكتب البريد</b> لتأخذ الحقيبة`;
        if (!bag.length) return `<span class="emo">✅</span> وزّعت كل شيء! ارجع إلى <b>مكتب البريد</b> 📮`;
        return bag.map((x) => `<span class="addr"><span class="emo">${x.k === "p" ? "📦" : "✉️"}</span> ${v.names ? `${x.b + 1} · ${E.place(x.b).n}` : `رقم <b>${x.b + 1}</b>`}</span>`).join("");
      },
      arrive(E, b) {
        if (b === E.homeB) return atPost();
        const x = bag.find((i) => i.b === b);
        if (x) drop(x);
      },
      update(E, dt) {
        if (!loaded) return;
        t += dt;
        if (Math.ceil(v.time - t) !== Math.ceil(v.time - t + dt)) E.hud();
      },
      draw(E) {
        for (const x of bag) {
          const d = E.door(x.b);
          if (v.rings) E.ring(x.b, "#3b82f6");
          E.emoji(x.k === "p" ? "📦" : "📬", d.x + 0.5, d.y + 0.45 + Math.sin(E.T * 4 + x.b) * 0.04, 0.55);
        }
        if (loaded && !bag.length) E.ring(E.homeB, "#e11d48");
      },
      pauseText: () => `الجولة ${Math.min(run.done + 1, run.total)} من ${run.total}`,
    });

    function atPost() {
      if (loaded && bag.length) return;
      if (loaded && !bag.length) {     // نهاية الجولة
        loaded = false;
        run.done++;
        const fast = t <= v.time;
        if (fast) { run.fast++; run.coins += 10; Jobs.toast("⏱ جولة سريعة! مكافأة +10 💰", "good"); }
        else Jobs.toast("🐢 تأخرت قليلاً في هذه الجولة", "bad", 2200);
        E.keep(); E.hud(); E.msg();
        if (run.done >= run.total) return K.later(finish, 1500);
      }
      // جولة جديدة: حقيبة بعناوين مختلفة
      const ok = K.shuffle(K.range(0, 15).filter((b) => b !== E.homeB)).slice(0, v.bag);
      bag = ok.map((b, i) => ({ b, k: i < 1 + Math.floor(v.bag / 3) ? "p" : "l" }));
      bag = K.shuffle(bag);
      E.stopCar();
      Jobs.overlay(`<h2>🎒 الجولة ${run.done + 1}</h2>
        <div class="sub">في حقيبتك:</div>
        <div class="baglist">${bag.map((x) => `<span><span class="emo">${x.k === "p" ? "📦" : "✉️"}</span> المبنى رقم <b>${x.b + 1}</b>${v.names ? ` (${E.place(x.b).n})` : ""}</span>`).join("")}</div>`,
        [{ label: "🚐 انطلق!", cls: "go", fn: () => { loaded = true; t = 0; E.msg(); E.hud(); } }]);
    }
    function drop(x) {
      if (x.k === "l") {
        bag = bag.filter((i) => i !== x);
        run.items++; run.ok++; run.coins += 2;
        K.sfx.ok(); Jobs.toast(`✉️ سلّمت الرسالة إلى المبنى ${x.b + 1}`, "good", 1500);
        E.msg(); E.hud();
        return;
      }
      E.stopCar();
      const w = 1 + Math.floor(Math.random() * (3 + v.L * 2)), pr = v.price[0] + Math.floor(Math.random() * (v.price[1] - v.price[0] + 1));
      const ans = w * pr;
      Jobs.overlay(`<h2>📦 طرد للمبنى ${x.b + 1}</h2><div class="sub">وزن الطرد <b>${w} كغ</b>، والأجرة <b>${pr}</b> 💰 لكل كيلوغرام. كم يدفع المستلم؟</div>`,
        Jobs.numOptions(ans, 3, [1, pr, w, 2]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => {
          bag = bag.filter((i) => i !== x);
          run.items++;
          if (n === ans) { run.ok++; run.coins += ans; K.sfx.ok(); Jobs.toast(`صحيح! ${w} × ${pr} = ${ans} 💰`, "good"); }
          else { K.sfx.bad(); Jobs.toast(`الصحيح: ${w} × ${pr} = ${ans}`, "bad", 3000); }
          E.keep(); E.msg(); E.hud();
        } })), { cls: "wide", btnCls: "opts" });
    }
    function finish() {
      const s = Jobs.grade(run.ok, run.items, run.fines > 3 ? 2 : 0);
      api.finish({ s, score: run.ok, total: run.items,
        msg: s === 3 ? "ساعي بريد ممتاز! 📮🏆" : s === 2 ? "وصلت الرسائل! 👏" : "أنهيت الوردية! 💪",
        extra: `<div class="won"><span class="emo">⏱</span> جولات سريعة: ${run.fast} من ${run.total} &nbsp; <span class="emo">💰</span> ${run.coins}</div>` });
    }

    if (Jobs.TEST) window.__mail = { E, get bag() { return bag; }, run };
    E.hud(); E.msg();
    K.later(atPost, 400);
  }

  Jobs.register("mail", { how, start });
})();
