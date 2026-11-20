// مهنة اليوم — بائع الحلوى 🍬: زبائن يطلبون قطعاً أو حلوى بالوزن (الميزان)، والرفوف تنفد فيملؤها من المخزن،
// ثم الحساب: المجموع، والعروض (3 بسعر 2)، والباقي.
(() => {
  "use strict";
  const ITEMS = [
    { e: "🍫", n: "شوكولاتة", p: 3 }, { e: "🍭", n: "مصاصة", p: 1 }, { e: "🧁", n: "كب كيك", p: 4 }, { e: "🍩", n: "دونات", p: 3 },
    { e: "🍪", n: "بسكويت", p: 2 }, { e: "🍦", n: "بوظة", p: 5 }, { e: "🥮", n: "معمول", p: 4 }, { e: "🍰", n: "كعكة", p: 6 },
  ];
  const LOOSE = { e: "🍬", n: "ملبّس بالوزن", per: 2 };   // السعر لكل 100 غرام
  const WHO = ["👦", "👧", "🧒", "👩", "👨", "👵", "👴", "🧕", "🧔", "👨‍👧", "👩‍👦"];
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, total: Jobs.TEST ? 2 : 18 + 2 * L, items: [5, 6, 7, 8][L], size: [[1, 2], [2, 3], [2, 4], [3, 5]][L],
      loose: L >= 1, step: L >= 2 ? 50 : 100, change: L >= 1, offer: L >= 2, stock: 8, patience: [80, 70, 62, 55][L],
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت صاحب محل حلويات 🍬. الأطفال والكبار يحبون محلك!</p>
      <ul>
        <li>اقرأ طلب الزبون، وضع الحلوى في <b>الكيس</b> 🛍️ من الرفوف.</li>
        ${v.loose ? `<li>⚖️ الملبّس يُباع <b>بالوزن</b>: كل ضغطة ${v.step} غرام. انظر إلى الميزان!</li>` : ""}
        <li>اضغط <b>«سلّم الكيس»</b>، ثم احسب <b>الحساب</b> 🧾${v.change ? " و<b>الباقي</b>" : ""}.</li>
        ${v.offer ? `<li>🏷️ انتبه لعرض اليوم!</li>` : ""}
        <li>📦 إذا فرغ رف املأه من <b>المخزن</b>.</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.total} زبوناً</b>.</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const items = ITEMS.slice(0, v.items);
    const R = api.run || { total: v.total, done: 0, ok: 0, coins: 0, lost: 0 };
    const stock = Object.fromEntries(items.map((i) => [i.e, v.stock]));
    const offer = v.offer ? K.pick(items.filter((i) => i.p >= 2)) : null;   // كل 3 بسعر 2
    let cust = null, line = [], bag = {}, grams = 0, comes = R.done, nextIn = 1;

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">🧑‍🤝‍🧑</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">💰</span> <b id="hco"></b></span>
        ${offer ? `<span class="pill offer">🏷️ عرض: ${offer.e} كل 3 بسعر 2</span>` : ""}
      </div>
      <div class="shop">
        <div class="counter" id="cust"></div>
        <div class="kbox"><div class="menu" id="shelf"></div>
          <div class="bagrow"><div id="bag"></div>
            <button class="btn f" ${K.act("bin", () => { bag = {}; grams = 0; drawBag(); K.sfx.tick(); })}><span class="emo">🗑</span></button>
            <button class="btn f go" ${K.act("give", give)}>🛍️ سلّم الكيس</button>
            <button class="btn f" ${K.act("store", restock)}><span class="emo">📦</span> المخزن</button></div></div>
      </div>`, "i0");
    const $ = (s) => K.app.querySelector(s);
    const pauseIt = () => Jobs.pause(api, R, `بعت لـ ${R.done} من ${R.total} زبوناً`);
    K.mode = Jobs.domMode(pauseIt);
    $("#hp").addEventListener("click", pauseIt);
    const hud = () => { $("#hdn").textContent = `${R.done} / ${R.total}`; $("#hco").textContent = R.coins; };

    function drawShelf() {
      Jobs.fill($("#shelf"), items.map((it, k) => `<button class="mi f ${stock[it.e] ? "" : "out"}" ${K.act("i" + k, () => add(it))}><span class="emo">${it.e}</span><small>${it.n}</small><i>${it.p}💰 · ${stock[it.e]}</i></button>`).join("") +
        (v.loose ? `<button class="mi f loose" ${K.act("w", addW)}><span class="emo">⚖️${LOOSE.e}</span><small>+${v.step} غ</small><i>${LOOSE.per}💰/100غ</i></button>` : ""));
    }
    function drawBag() {
      const parts = Object.entries(bag).filter(([, n]) => n).map(([e, n]) => `<span><b>${n}×</b><span class="emo">${e}</span></span>`);
      if (grams) parts.push(`<span class="scale">⚖️ <b>${grams}</b> غ <span class="emo">🍬</span></span>`);
      $("#bag").innerHTML = parts.length ? parts.join("") : `<small>الكيس فارغ 🛍️</small>`;
    }
    function drawCust() {
      $("#cust").innerHTML = cust ? `<span class="emo who">${cust.who}</span>
        <div class="bubble">${cust.say}</div><div class="pat"><u id="cpat"></u></div>
        <div class="line">${line.map((c) => `<span class="emo">${c.who}</span>`).join("")}</div>` : `<div class="sub">لا زبائن الآن… 🍭</div>`;
      tick();
    }
    function tick() {
      const u = $("#cpat"); if (!cust || !u) return;
      const f = Math.max(0, 1 - cust.t / cust.max);
      u.style.width = f * 100 + "%"; u.style.background = f > 0.5 ? "#22c55e" : f > 0.25 ? "#f59e0b" : "#ef4444";
    }
    function add(it) {
      if (!stock[it.e]) { K.sfx.bad(); return Jobs.toast(`نفد ${it.n}! املأ الرف من المخزن 📦`, "bad", 1800); }
      stock[it.e]--; bag[it.e] = (bag[it.e] || 0) + 1; K.sfx.tick(); drawBag(); drawShelf();
    }
    function addW() { grams += v.step; K.tone(500 + grams / 4, 0.06); drawBag(); }
    function restock() {
      items.forEach((i) => (stock[i.e] = v.stock));
      K.tone(300, 0.2, "triangle"); Jobs.toast("📦 امتلأت الرفوف", "", 1200);
      if (cust) cust.t += 4;   // يأخذ وقتاً
      drawShelf();
    }
    function newCust() {
      const n = v.size[0] + Math.floor(Math.random() * (v.size[1] - v.size[0] + 1));
      const want = {};
      for (let k = 0; k < n; k++) { const it = K.pick(items); want[it.e] = (want[it.e] || 0) + 1; }
      if (offer && Math.random() < 0.5) want[offer.e] = 3;
      const g = v.loose && Math.random() < 0.45 ? K.pick(v.step === 50 ? [150, 250, 300, 350, 400] : [100, 200, 300, 400, 500]) : 0;
      const say = Object.entries(want).map(([e, n]) => `${n} ${e}`).join(" و ") + (g ? ` و${g} غرام من ${LOOSE.e}` : "");
      return { who: K.pick(WHO), want, g, say: `«أريد ${say} من فضلك»`, t: 0, max: v.patience + n * 5 };
    }
    function give() {
      if (!cust) return;
      const want = cust.want;
      const same = Object.keys({ ...want, ...bag }).every((e) => (want[e] || 0) === (bag[e] || 0)) && grams === cust.g;
      if (!same) {
        const miss = Object.entries(want).filter(([e, n]) => (bag[e] || 0) !== n).map(([e, n]) => `${e} ${bag[e] || 0}/${n}`);
        if (grams !== cust.g) miss.push(`⚖️ ${grams}/${cust.g} غ`);
        K.sfx.bad(); return Jobs.toast(`الكيس غير مطابق: ${miss.join(" · ")}`, "bad", 2600);
      }
      // الحساب
      const lines = Object.entries(want).map(([e, n]) => { const it = items.find((i) => i.e === e); const pay = offer && e === offer.e ? (n - Math.floor(n / 3)) * it.p : n * it.p; return { e, n, p: it.p, pay }; });
      const wPay = (cust.g / 100) * LOOSE.per;
      const total = lines.reduce((a, l) => a + l.pay, 0) + wPay;
      const txt = lines.map((l) => `${l.n} × ${l.e} (${l.p})${offer && l.e === offer.e && l.n >= 3 ? " 🏷️" : ""}`).concat(cust.g ? [`${cust.g} غ ${LOOSE.e} (${LOOSE.per} لكل 100 غ)`] : []).join(" + ");
      const who = cust.who;
      bag = {}; grams = 0; drawBag();
      Jobs.overlay(`<div class="pay"><span class="emo big">${who}</span><div><div>🧾 كم الحساب؟</div><div class="fare">${txt}</div></div></div>`,
        Jobs.numOptions(total, 3, [1, 2, 3, 4]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => paid(n === total, total) })),
        { cls: "wide", btnCls: "opts", back: () => {} });
    }
    function paid(right, total) {
      const first = right;
      if (!right) { K.sfx.bad(); Jobs.toast(`الحساب الصحيح ${total}`, "bad", 2600); }
      else K.sfx.ok();
      if (v.change) {
        const gave = [5, 10, 20, 50, 100].find((x) => x > total) || total + 10, ch = gave - total;
        return K.later(() => Jobs.overlay(`<h2>💵 أعطاك ${gave}، والحساب ${total}</h2><div class="sub">كم الباقي؟</div>`,
          Jobs.numOptions(ch, 3, [1, 2, 5]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => {
            if (n !== ch) { K.sfx.bad(); Jobs.toast(`الباقي الصحيح ${ch}`, "bad", 2400); } else K.sfx.ok();
            served(first && n === ch, total);
          } })), { cls: "wide", btnCls: "opts", back: () => {} }), 500);
      }
      served(first, total);
    }
    function served(ok, total) {
      R.done++; R.coins += total;
      if (ok) { R.ok++; K.confetti(8, "🍬🍭💰"); Jobs.toast("شكراً! محلك رائع 🍭", "good", 1500); }
      cust = line.shift() || null;
      after();
    }
    function after() {
      api.keep(R); hud(); drawCust();
      if (R.done >= R.total) K.later(finish, 1500);
    }
    function finish() {
      const s = Jobs.grade(R.ok, R.total, R.lost);
      api.finish({ s, score: R.ok, total: R.total,
        msg: s === 3 ? "بائع ماهر وسريع! 🍬🏆" : s === 2 ? "محل ناجح! 👏" : "أنهيت يومك! 💪",
        extra: `<div class="won"><span class="emo">💰</span> المبيعات ${R.coins} &nbsp; <span class="emo">😠</span> غادروا: ${R.lost}</div>` });
    }

    const stop = Jobs.loop((dt) => {
      if (Jobs.ov) return;
      if (cust) {
        cust.t += dt;
        if (cust.t >= cust.max) {
          R.done++; R.lost++; K.sfx.bad(); Jobs.toast(`${cust.who} ملّ الانتظار وخرج 😠`, "bad", 2000);
          bag = {}; grams = 0; drawBag();
          cust = line.shift() || null; after();
        }
      }
      for (const c of line) c.t += dt * 0.3;
      if (comes < R.total && line.length < 2 && (nextIn -= dt) <= 0) {
        const c = newCust(); comes++;
        if (!cust) cust = c; else line.push(c);
        K.tone(988, 0.08); K.tone(1319, 0.12, "sine", 0.12, 0.08);
        drawCust(); nextIn = 8 + Math.random() * 8;
      }
      tick();
    });
    K.mode.stop = () => { stop(); Jobs.closeOverlay(); };
    if (Jobs.TEST) window.__candy = { get cust() { return cust; }, items, R, stock };
    drawShelf(); drawBag(); drawCust(); hud();
  }

  Jobs.register("candy", { how, start });
})();
