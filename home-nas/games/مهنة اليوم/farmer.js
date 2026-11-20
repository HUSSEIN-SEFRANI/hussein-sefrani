// مهنة اليوم — المزارع 🧑‍🌾: موسم من عدة أيام. يزرع الطفل البذور ويسقيها كل يوم ويحصد ثم يبيع في السوق
// ويحسب ثمن ما باعه. النبتة التي لا تُسقى يومين تذبل، والغربان تأكل الزرع إن لم يُبعدها.
(() => {
  "use strict";
  // d: أيام النمو، c: ثمن البذرة، p: سعر البيع
  const SEEDS = [
    { e: "🥕", n: "جزر", d: 2, c: 2, p: 5 }, { e: "🍅", n: "طماطم", d: 3, c: 3, p: 8 }, { e: "🌽", n: "ذرة", d: 4, c: 4, p: 11 },
    { e: "🍓", n: "فراولة", d: 3, c: 5, p: 12 }, { e: "🥔", n: "بطاطا", d: 3, c: 3, p: 8 }, { e: "🍉", n: "بطيخ", d: 5, c: 6, p: 18 },
  ];
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, days: Jobs.TEST ? 3 : 30, dayLen: Jobs.TEST ? 4 : 18, plots: 12, seeds: [3, 4, 5, 6][L],
      crows: L >= 1, crowEvery: [0, 14, 10, 8][L], target: [250, 320, 400, 480][L], can: 6, rain: 0.15,
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت مزارع 🧑‍🌾 والموسم ${v.days} يوماً. ازرع واسقِ واحصد وبِع!</p>
      <ul>
        <li>اضغط على أرض فارغة لتزرع بذرة 🌱 (لها ثمن).</li>
        <li>💧 <b>اسقِ كل نبتة مرة كل يوم</b>. إذا عطشت يومين تذبل 🥀. املأ السطل من البئر 🪣.</li>
        <li>عندما يظهر المحصول احصده 🧺، ثم بِعه في <b>السوق</b> 🏪 واحسب الثمن.</li>
        ${v.crows ? `<li>🐦 أبعد الغربان بسرعة قبل أن تأكل الزرع!</li>` : ""}
      </ul>
      <p class="goal">هدف الموسم: <b>${v.target} 💰</b>.</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const seeds = SEEDS.slice(0, v.seeds);
    const R = api.run || { day: 1, coins: 20, ok: 0, total: 0, can: v.can, plots: Array.from({ length: v.plots }, () => null), basket: {}, lost: 0, earned: 0 };
    let t = 0, crowIn = v.crowEvery || 999, rain = false;

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill" id="hday"></span>
        <span class="pill"><span class="emo">💰</span> <b id="hco"></b> / ${v.target}</span>
        <span class="pill fuel"><span class="emo">☀️</span> <i><u id="hti"></u></i></span>
      </div>
      <div class="farm">
        <div class="field" id="field"></div>
        <div class="side">
          <button class="btn f tool" ${K.act("well", well)}><span class="emo">🪣</span> البئر <small id="hcan"></small></button>
          <button class="btn f tool" ${K.act("market", market)}><span class="emo">🏪</span> السوق</button>
          <div class="basket" id="basket"></div>
        </div>
      </div>`, "p0");
    const $ = (s) => K.app.querySelector(s);
    const pauseIt = () => Jobs.pause(api, R, `اليوم ${R.day} من ${v.days}`);
    K.mode = Jobs.domMode(pauseIt);
    $("#hp").addEventListener("click", pauseIt);
    const seedOf = (e) => SEEDS.find((s) => s.e === e);

    function hud() {
      $("#hday").innerHTML = `<span class="emo">${rain ? "🌧️" : "📅"}</span> اليوم ${R.day} / ${v.days}`;
      $("#hco").textContent = R.coins;
      $("#hcan").textContent = `💧 ${R.can}/${v.can}`;
      const b = Object.entries(R.basket).filter(([, n]) => n);
      $("#basket").innerHTML = `<small>🧺 السلة</small>` + (b.length ? b.map(([e, n]) => `<span><span class="emo">${e}</span>×${n}</span>`).join("") : `<i>فارغة</i>`);
    }
    function plotHTML(p, i) {
      let icon = "", cls = "";
      if (!p) { icon = ""; cls = "empty"; }
      else if (p.dead) { icon = "🥀"; cls = "dead"; }
      else if (p.g >= seedOf(p.e).d) { icon = p.e; cls = "ready"; }
      else { icon = p.g === 0 ? "🌱" : "🌿"; cls = p.w ? "wet" : p.dry ? "dry" : ""; }
      return `<button class="plot f ${cls}" ${K.act("p" + i, () => tap(i))}><span class="emo">${icon}</span>
        ${p && !p.dead && p.g < seedOf(p.e).d ? `<small>${p.e} ${p.g}/${seedOf(p.e).d}</small>` : ""}${p && p.crow ? `<span class="emo crow">🐦</span>` : ""}</button>`;
    }
    const draw = () => { Jobs.fill($("#field"), R.plots.map(plotHTML).join("")); hud(); };

    function tap(i) {
      const p = R.plots[i];
      if (p && p.crow) { p.crow = 0; K.tone(1200, 0.08); Jobs.toast("🐦 طار الغراب!", "good", 1000); return draw(); }
      if (!p) return plant(i);
      if (p.dead) { R.plots[i] = null; K.sfx.tick(); return draw(); }
      if (p.g >= seedOf(p.e).d) {
        R.basket[p.e] = (R.basket[p.e] || 0) + 1; R.plots[i] = null;
        K.sfx.ok(); return draw();
      }
      if (p.w) return Jobs.toast("سقيتها اليوم ✓", "", 900);
      if (R.can <= 0) { K.sfx.bad(); return Jobs.toast("السطل فارغ! املأه من البئر 🪣", "bad", 1800); }
      R.can--; p.w = true; p.dry = 0;
      K.tone(520, 0.08, "sine", 0.1); K.tone(640, 0.08, "sine", 0.1, 0.06);
      draw();
    }
    function plant(i) {
      Jobs.overlay(`<h2>🌱 ماذا تزرع؟</h2><div class="sub">معك ${R.coins} 💰</div>`,
        seeds.map((s) => ({ label: `<span class="emo">${s.e}</span> ${s.n}<br><small>البذرة ${s.c}💰 · ${s.d} أيام · تُباع ${s.p}💰</small>`, cls: "opt seed", fn: () => {
          if (R.coins < s.c) { K.sfx.bad(); return Jobs.toast("لا يكفي المال لهذه البذرة", "bad", 1500); }
          R.coins -= s.c; R.plots[i] = { e: s.e, g: 0, w: false, dry: 0 };
          K.sfx.tick(); draw();
        } })).concat([{ label: "رجوع" }]), { btnCls: "seeds", back: () => {} });
    }
    function well() {
      if (R.can >= v.can) return Jobs.toast("السطل ممتلئ 💧", "", 900);
      R.can = v.can; K.tone(300, 0.3, "sine", 0.12); hud();
    }
    // السوق: سؤال لكل نوع في السلة (العدد × السعر)
    function market() {
      const items = Object.entries(R.basket).filter(([, n]) => n);
      if (!items.length) return Jobs.toast("السلة فارغة. احصد أولاً 🧺", "", 1500);
      const [e, n] = items[0], s = seedOf(e), ans = n * s.p;
      R.total++;
      Jobs.overlay(`<h2>🏪 السوق</h2><div class="sub">تبيع <b>${n}</b> <span class="emo">${e}</span> ${s.n}، وسعر الواحدة <b>${s.p}</b> 💰. كم تربح؟</div>`,
        Jobs.numOptions(ans, 3, [s.p, n, 2, 5]).map((x) => ({ label: `<span class="num">${x}</span>`, cls: "opt", fn: () => {
          R.basket[e] = 0;
          if (x === ans) { R.ok++; R.coins += ans; R.earned += ans; K.sfx.ok(); K.confetti(8, "💰🌾✨"); Jobs.toast(`صحيح! ${n} × ${s.p} = ${ans} 💰`, "good"); }
          else { const got = Math.round(ans * 0.8); R.coins += got; R.earned += got; K.sfx.bad(); Jobs.toast(`الصحيح ${ans}. التاجر أعطاك ${got} فقط 😕`, "bad", 3000); }
          hud(); api.keep(R);
          if (Object.values(R.basket).some((k) => k)) K.later(market, 900);
        } })), { cls: "wide", btnCls: "opts" });
    }
    function endDay() {
      t = 0;
      for (const p of R.plots) {
        if (!p || p.dead) continue;
        if (p.g >= seedOf(p.e).d) continue;
        if (p.w) { p.g++; p.dry = 0; }
        else if (++p.dry >= 2) { p.dead = true; R.lost++; }
        p.w = false;
      }
      R.day++;
      if (R.day > v.days) return finish();
      rain = Math.random() < v.rain;
      if (rain) { R.plots.forEach((p) => { if (p && !p.dead) p.w = true; }); Jobs.toast("🌧️ يوم ممطر! المطر سقى كل الزرع", "good", 2200); }
      else Jobs.toast(`☀️ صباح اليوم ${R.day}`, "", 1200);
      // لا يعلق الطفل بلا مال
      if (R.coins < 2 && !R.plots.some((p) => p && !p.dead) && !Object.values(R.basket).some((k) => k)) { R.coins += 10; Jobs.toast("👵 الجارة أعطتك 10 💰 لتشتري بذوراً", "good", 2500); }
      api.keep(R); draw();
    }
    function finish() {
      const reach = R.coins >= v.target;
      const s = Math.min(Jobs.grade(R.ok, Math.max(1, R.total)), reach ? 3 : R.coins >= v.target * 0.6 ? 2 : 1);
      api.finish({ s, score: R.ok, total: R.total,
        msg: reach ? "مزارع ناجح! 🧑‍🌾🏆" : s === 2 ? "موسم جيد! 👏" : "انتهى الموسم! 💪",
        extra: `<div class="won"><span class="emo">💰</span> ${R.coins} من ${v.target} &nbsp; <span class="emo">🥀</span> ذبل: ${R.lost}</div>` });
    }

    const stop = Jobs.loop((dt) => {
      if (Jobs.ov) return;
      t += dt;
      $("#hti").style.width = Math.max(0, 100 - (t / v.dayLen) * 100) + "%";
      if (v.crows && (crowIn -= dt) <= 0) {
        crowIn = v.crowEvery * (0.6 + Math.random() * 0.8);
        const can = R.plots.map((p, i) => (p && !p.dead && !p.crow ? i : -1)).filter((i) => i >= 0);
        if (can.length) { R.plots[K.pick(can)].crow = 0.001; K.tone(500, 0.1, "sawtooth", 0.05); K.tone(450, 0.1, "sawtooth", 0.05, 0.12); draw(); }
      }
      for (const [i, p] of R.plots.entries()) if (p && p.crow) {
        p.crow += dt;
        if (p.crow > 6) { R.plots[i] = null; R.lost++; K.sfx.bad(); Jobs.toast("🐦 أكل الغراب الزرع!", "bad", 1800); draw(); }
      }
      if (t >= v.dayLen) endDay();
    });
    K.mode.stop = () => { stop(); Jobs.closeOverlay(); };
    if (Jobs.TEST) window.__farm = R;
    draw();
  }

  Jobs.register("farmer", { how, start });
})();
