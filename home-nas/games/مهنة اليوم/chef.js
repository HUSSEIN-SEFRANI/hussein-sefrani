// مهنة اليوم — الطباخ 🍳: زبائن بطلبات، مواقد تطبخ (وتحرق إن تأخرت)، صينية، وحساب الفاتورة.
(() => {
  "use strict";
  // c: ثواني الطبخ (0 = جاهز فوراً)، p: السعر
  const MENU = [
    { e: "🍔", n: "برغر", c: 4, p: 8 }, { e: "🍟", n: "بطاطس", c: 3, p: 4 }, { e: "🥤", n: "عصير", c: 0, p: 3 },
    { e: "🥗", n: "سلطة", c: 0, p: 5 }, { e: "🍦", n: "بوظة", c: 0, p: 4 }, { e: "🍕", n: "بيتزا", c: 6, p: 10 },
    { e: "🍩", n: "دونات", c: 0, p: 3 }, { e: "🍳", n: "بيض", c: 3, p: 5 }, { e: "🥪", n: "شطيرة", c: 0, p: 6 },
    { e: "🌭", n: "نقانق", c: 3, p: 6 }, { e: "🍰", n: "كعكة", c: 0, p: 7 }, { e: "🥞", n: "فطائر", c: 5, p: 9 },
  ];
  const WHO = ["🧑", "👩", "👨", "👵", "👴", "🧕", "👦", "👧", "🧔", "👨‍💼", "👩‍🎓", "👷", "🧑‍🎨", "👩‍🔬"];
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, total: Jobs.TEST ? 2 : 20 + 2 * L,
      items: 5 + 2 * L + (L === 3 ? 1 : 0),     // عدد أصناف القائمة
      size: [[1, 2], [2, 3], [2, 4], [3, 5]][L], // عدد قطع الطلب
      patience: [75, 65, 58, 52][L],
      seats: L ? 3 : 2, stoves: 3, burn: [10, 8, 7, 6][L],
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت طباخ في مطعم مزدحم 🍽️. كل زبون معه طلب، وصبره ينفد!</p>
      <ul>
        <li>اختر الأصناف من <b>المطبخ</b>. الأصناف التي عليها 🔥 تُطبخ على الموقد.</li>
        <li>عندما يصير الموقد <b>أخضر</b> اضغطه لتضع الطعام في الصينية… وإن تأخرت يحترق!</li>
        <li>اضغط على <b>الزبون</b> لتقدّم له الصينية، ثم احسب <b>الفاتورة</b> 🧾.</li>
        <li>🗑 يفرغ الصينية إن أخطأت.</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.total} زبوناً</b>، والقائمة فيها ${v.items} أصناف.</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const menu = MENU.slice(0, v.items);
    const run = api.run || { total: v.total, done: 0, served: 0, ok: 0, coins: 0, lost: 0 };
    const seats = K.range(0, v.seats).map(() => null);   // { who, order:{e:n}, t, max }
    const stoves = K.range(0, v.stoves).map(() => null); // { e, t, c }
    let tray = [], nextIn = 1.5, comes = run.done;

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">🧑‍🤝‍🧑</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">💰</span> <b id="hco"></b></span>
      </div>
      <div class="seats" id="seats"></div>
      <div class="kitchen">
        <div class="kbox"><h3>المطبخ</h3><div class="menu">${menu.map((m, i) =>
          `<button class="mi f" ${K.act("m" + i, () => take(m))}><span class="emo">${m.e}</span><small>${m.n}${m.c ? " 🔥" : ""}</small><i>${m.p}💰</i></button>`).join("")}</div></div>
        <div class="kbox"><h3>المواقد</h3><div class="stoves" id="stoves"></div>
          <h3>الصينية</h3><div class="tray"><div id="tray"></div><button class="btn f" ${K.act("bin", () => { tray = []; drawTray(); K.sfx.tick(); })}><span class="emo">🗑</span></button></div></div>
      </div>`, "m0");
    const $ = (s) => K.app.querySelector(s);
    K.mode = Jobs.domMode(() => Jobs.pause(api, run, `قدّمت ${run.served} من ${run.total} زبوناً`));
    $("#hp").addEventListener("click", () => Jobs.pause(api, run, `قدّمت ${run.served} من ${run.total} زبوناً`));

    const hud = () => { $("#hdn").textContent = `${run.done} / ${run.total}`; $("#hco").textContent = run.coins; };
    const count = (arr) => arr.reduce((o, e) => ((o[e] = (o[e] || 0) + 1), o), {});
    const orderHTML = (o) => Object.entries(o).map(([e, n]) => `<span>${n > 1 ? `<b>${n}×</b>` : ""}<span class="emo">${e}</span></span>`).join("");

    function drawSeats() {
      Jobs.fill($("#seats"), seats.map((s, i) => s
        ? `<button class="seat f" ${K.act("s" + i, () => serve(i))}><span class="who emo">${s.who}</span><div class="ticket">${orderHTML(s.order)}</div><div class="pat"><u id="pt${i}"></u></div></button>`
        : `<div class="seat empty"><span class="emo">🪑</span></div>`).join(""));
      tick();
    }
    function drawStoves() {
      Jobs.fill($("#stoves"), stoves.map((s, i) =>
        `<button class="stove f ${s ? "on" : ""}" id="st${i}" ${K.act("t" + i, () => pickStove(i))}><span class="emo">${s ? s.e : "⚫"}</span><u><i id="sp${i}"></i></u></button>`).join(""));
      tick();
    }
    function drawTray() {
      $("#tray").innerHTML = tray.length ? tray.map((e) => `<span class="emo">${e}</span>`).join("") : `<small>فارغة</small>`;
    }
    // تحديث الأشرطة كل إطار بلا إعادة رسم
    function tick() {
      seats.forEach((s, i) => {
        const u = $("#pt" + i); if (!s || !u) return;
        const f = Math.max(0, 1 - s.t / s.max);
        u.style.width = f * 100 + "%"; u.style.background = f > 0.5 ? "#22c55e" : f > 0.25 ? "#f59e0b" : "#ef4444";
      });
      stoves.forEach((s, i) => {
        const b = $("#st" + i), p = $("#sp" + i); if (!b) return;
        if (!s) { b.className = "stove f" + (b.classList.contains("sel") ? " sel" : ""); return; }
        const ready = s.t >= s.c, burnt = s.t >= s.c + v.burn;
        b.classList.toggle("ready", ready && !burnt); b.classList.toggle("burnt", burnt);
        p.style.width = Math.min(100, (s.t / s.c) * 100) + "%";
        if (burnt && s.e !== "🔥") { s.e = "🔥"; b.querySelector(".emo").textContent = "🔥"; K.sfx.bad(); }
      });
    }

    function take(m) {
      if (m.c) {
        const i = stoves.indexOf(null);
        if (i < 0) return Jobs.toast("المواقد كلها مشغولة 🔥", "bad", 1500);
        stoves[i] = { e: m.e, t: 0, c: m.c, src: m.e };
        K.tone(220, 0.15, "triangle", 0.1);
        drawStoves();
      } else addTray(m.e);
    }
    function addTray(e) {
      if (tray.length >= 7) return Jobs.toast("الصينية ممتلئة", "bad", 1500);
      tray.push(e); K.sfx.tick(); drawTray();
    }
    function pickStove(i) {
      const s = stoves[i];
      if (!s) return;
      if (s.t >= s.c + v.burn) { stoves[i] = null; drawStoves(); Jobs.toast("احترق الطعام! 🔥 رميته", "bad", 1500); return; }
      if (s.t < s.c) return Jobs.toast("لم ينضج بعد… انتظر ⏳", "", 1200);
      if (tray.length >= 7) return Jobs.toast("الصينية ممتلئة", "bad", 1500);
      stoves[i] = null; tray.push(s.src); K.sfx.ok(); drawStoves(); drawTray();
    }
    function serve(i) {
      const s = seats[i];
      if (!s) return;
      const have = count(tray), need = s.order;
      const same = Object.keys(need).length === Object.keys(have).length && Object.entries(need).every(([e, n]) => have[e] === n);
      if (!same) {
        const miss = Object.entries(need).filter(([e, n]) => (have[e] || 0) < n).map(([e, n]) => `${n - (have[e] || 0)}×${e}`).join(" ");
        const extra = Object.entries(have).filter(([e, n]) => n > (need[e] || 0)).map(([e]) => e).join(" ");
        K.sfx.bad();
        return Jobs.toast(miss ? `ينقص: ${miss}` : `زيادة في الصينية: ${extra}`, "bad", 2200);
      }
      // الفاتورة
      const bill = Object.entries(need).reduce((a, [e, n]) => a + n * menu.find((m) => m.e === e).p, 0);
      const tip = s.t < s.max * 0.5 ? (v.L >= 2 ? 5 : 3) : 0;
      const lines = Object.entries(need).map(([e, n]) => `${n} × ${e} (${menu.find((m) => m.e === e).p})`).join(" + ");
      tray = []; drawTray();
      const who = s.who;
      seats[i] = null; drawSeats();
      Jobs.overlay(`<div class="pay"><span class="emo big">${who}</span><div><div>شكراً! كم الحساب؟ 🧾</div><div class="fare">${lines}</div></div></div>`,
        Jobs.numOptions(bill, 3, [1, 2, 3, 5, 8]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => paid(n === bill, bill, tip) })),
        { cls: "wide", btnCls: "opts" });
    }
    function paid(right, bill, tip) {
      run.served++; run.done++;
      if (right) { run.ok++; run.coins += bill + tip; K.sfx.ok(); K.confetti(8, "💰✨🍽️"); Jobs.toast(`صحيح! ${bill} 💰${tip ? ` + إكرامية ${tip}` : ""}`, "good"); }
      else { run.coins += bill; K.sfx.bad(); Jobs.toast(`الحساب الصحيح ${bill} 🧾`, "bad", 3000); }
      after();
    }
    function after() {
      api.keep(run); hud();
      if (run.done >= run.total) K.later(finish, 1500);
    }
    function finish() {
      const s = Jobs.grade(run.ok, run.total, run.lost);
      api.finish({ s, score: run.ok, total: run.total,
        msg: s === 3 ? "طباخ ماهر! 👨‍🍳🏆" : s === 2 ? "مطبخ ناجح! 👏" : "أنهيت الوردية! 💪",
        extra: `<div class="won"><span class="emo">💰</span> ربحت ${run.coins} &nbsp; <span class="emo">😠</span> زبائن غادروا: ${run.lost}</div>` });
    }
    function arrive() {
      const i = seats.indexOf(null);
      if (i < 0 || comes >= run.total) return;
      const n = v.size[0] + Math.floor(Math.random() * (v.size[1] - v.size[0] + 1));
      const items = K.range(0, n).map(() => K.pick(menu).e);
      seats[i] = { who: K.pick(WHO), order: count(items), t: 0, max: v.patience + n * 6 };
      comes++;
      K.tone(988, 0.08); K.tone(1319, 0.12, "sine", 0.12, 0.08);   // جرس الباب
      drawSeats();
    }

    const stop = Jobs.loop((dt) => {
      if (Jobs.ov) return;
      for (const s of stoves) if (s) s.t += dt;
      seats.forEach((s, i) => {
        if (!s) return;
        s.t += dt;
        if (s.t >= s.max) {
          seats[i] = null; run.lost++; run.done++;
          K.sfx.bad(); Jobs.toast(`${s.who} غادر غاضباً 😠 تأخر الطلب`, "bad", 2200);
          drawSeats(); after();
        }
      });
      if (seats.includes(null) && comes < run.total && (nextIn -= dt) <= 0) { arrive(); nextIn = 3 + Math.random() * 4; }
      tick();
    });
    const m = K.mode; m.stop = () => { stop(); Jobs.closeOverlay(); };
    if (Jobs.TEST) window.__chef = { seats, stoves, get tray() { return tray; }, run, menu };
    drawSeats(); drawStoves(); drawTray(); hud();
  }

  Jobs.register("chef", { how, start });
})();
