// مهنة اليوم — المهندس 👷‍♀️: مشروع مبنى من الأرض إلى السطح. كل خطوة حساب هندسي (مساحة، محيط، مقياس رسم،
// مواد، أعمدة، درج، سقف)، وكل جواب صحيح يرفع المبنى طابقاً.
(() => {
  "use strict";
  const r = (a, b) => Jobs.rnd(a, b);
  const num = (ans, unit, html, why, spread = [1, 2, 4, 10]) => ({ html, ans, unit, why, opts: Jobs.numOptions(ans, 3, spread) });
  const STEPS = [
    (L) => { const a = r(8, 15 + 5 * L), b = r(6, 12 + 4 * L); return num(a * b, "م²", `<h3>📐 الأرض</h3>${rect(a, b)}<p>قطعة الأرض <b>${a} م × ${b} م</b>. ما مساحتها؟</p>`, `المساحة = الطول × العرض = ${a * b} م²`); },
    (L) => { const a = r(8, 20), b = r(6, 14); return num(2 * (a + b), "م", `<h3>🚧 السياج</h3>${rect(a, b)}<p>نضع سياجاً حول الأرض. كم متراً نحتاج؟</p>`, `المحيط = 2 × (${a} + ${b}) = ${2 * (a + b)} م`); },
    (L) => { const s = K.pick([2, 5]), c = r(3, 9); return num(c * s, "م", `<h3>📏 المخطط</h3><p>مقياس الرسم: <b>1 سم = ${s} م</b>.<br>طول الغرفة في المخطط <b>${c} سم</b>. ما طولها الحقيقي؟</p>`, `${c} × ${s} = ${c * s} م`); },
    (L) => { const rows = r(8, 14), per = r(10, 20); return num(rows * per, "طوبة", `<h3>🧱 الجدار</h3><p>الجدار <b>${rows}</b> صفاً، وفي كل صف <b>${per}</b> طوبة. كم طوبة نحتاج؟</p>`, `${rows} × ${per} = ${rows * per}`, [per, 10, 20]); },
    (L) => { const per = K.pick([3, 4, 5]), n = r(4, 10); return num(n, "أكياس", `<h3>🪣 الإسمنت</h3><p>كل كيس إسمنت يكفي <b>${per} م²</b>. مساحة الأرضية <b>${per * n} م²</b>. كم كيساً نحتاج؟</p>`, `${per * n} ÷ ${per} = ${n}`); },
    (L) => { const t = K.pick([4, 5, 6]), w = r(13, 30); const ans = Math.ceil(w / t); return num(ans, "أعمدة", `<h3>🏛️ الأعمدة</h3><p>كل عمود يحمل <b>${t} طن</b>. الطابق يزن <b>${w} طن</b>. كم عموداً نحتاج <b>على الأقل</b>؟</p>`, `${w} ÷ ${t} ≈ ${(w / t).toFixed(1)}، فنحتاج ${ans} (نقرّب للأعلى حتى لا يسقط!)`, [1, 2]); },
    (L) => { const h = K.pick([300, 320, 360]), s = K.pick([15, 16, 18, 20].filter((x) => h % x === 0)); return num(h / s, "درجة", `<h3>🪜 الدرج</h3><p>ارتفاع الطابق <b>${h / 100} م</b> (${h} سم)، وارتفاع الدرجة <b>${s} سم</b>. كم درجة؟</p>`, `${h} ÷ ${s} = ${h / s}`); },
    (L) => { const a = r(30, 70), b = r(30, 70); return num(180 - a - b, "°", `<h3>🔺 السقف</h3>${tri(a, b)}<p>سقف مثلث فيه زاويتان <b>${a}°</b> و<b>${b}°</b>. كم الزاوية الثالثة؟</p>`, `مجموع زوايا المثلث 180°: 180 − ${a} − ${b} = ${180 - a - b}°`, [5, 10, 20]); },
    (L) => { const a = r(3, 6), b = r(3, 6), p = K.pick([5, 8, 10]); return num(a * b * p, "💰", `<h3>🟫 البلاط</h3><p>غرفة <b>${a} م × ${b} م</b>، وسعر المتر المربع من البلاط <b>${p}</b>. كم الثمن؟</p>`, `${a} × ${b} = ${a * b} م²، و${a * b} × ${p} = ${a * b * p}`, [p, 10, 5]); },
    (L) => { const a = r(2, 6), b = r(2, 5), c = r(1, 3); return num(a * b * c, "م³", `<h3>🏗️ الأساس</h3><p>حفرة الأساس <b>${a} م × ${b} م</b> وعمقها <b>${c} م</b>. كم متراً مكعباً من الخرسانة؟</p>`, `الحجم = ${a} × ${b} × ${c} = ${a * b * c} م³`); },
    (L) => { const total = r(20, 40) * 10, done = r(5, 15) * 10; return num(total - done, "م", `<h3>🛣️ الطريق</h3><p>طول الطريق إلى المبنى <b>${total} م</b>، رصفنا منه <b>${done} م</b>. كم بقي؟</p>`, `${total} − ${done} = ${total - done}`, [10, 20, 5]); },
    (L) => { const w = r(4, 9) * 10, n = K.pick([2, 4, 5]); return num(w / n, "م", `<h3>🌉 الجسر</h3><p>جسر طوله <b>${w} م</b> نقسمه إلى <b>${n}</b> أجزاء متساوية. كم طول الجزء؟</p>`, `${w} ÷ ${n} = ${w / n}`); },
  ];
  function rect(a, b) { const W = 140, H = Math.max(50, Math.min(110, (b / a) * 140)); return `<svg class="plan" viewBox="-30 -20 ${W + 60} ${H + 50}"><rect width="${W}" height="${H}" fill="#e0f2fe" stroke="#0369a1" stroke-width="3"/><text x="${W / 2}" y="-5" text-anchor="middle" font-size="16" font-weight="800" fill="#0369a1">${a} م</text><text x="-8" y="${H / 2}" text-anchor="end" font-size="16" font-weight="800" fill="#0369a1">${b} م</text></svg>`; }
  function tri(a, b) { return `<svg class="plan" viewBox="0 0 200 110"><polygon points="10,100 190,100 100,15" fill="#fecaca" stroke="#b91c1c" stroke-width="3"/><text x="30" y="95" font-size="15" font-weight="800" fill="#1e3a8a">${a}°</text><text x="150" y="95" font-size="15" font-weight="800" fill="#1e3a8a">${b}°</text><text x="92" y="45" font-size="18" font-weight="800" fill="#be185d">؟</text></svg>`; }

  function how() {
    return `<p>أنت مهندسة مدنية 👷‍♀️. مهمتك اليوم: تصميم مبنى وبناؤه بأمان.</p>
      <ul><li>كل خطوة في المشروع <b>حساب هندسي</b>: المساحة، والسياج، والمخطط، والطوب، والأعمدة، والدرج، والسقف…</li>
      <li>كل جواب صحيح يرفع المبنى 🏗️. والمهندس يقرّب الأعمدة للأعلى دائماً حتى يكون المبنى آمناً!</li></ul>
      <p class="goal">مهمة اليوم: <b>مبنى كامل</b> (حوالي 20 خطوة).</p>`;
  }
  function start(api) {
    Jobs.stages(api, {
      icon: "🏗️", label: "خطوات المشروع", confetti: "🧱✨⭐",
      total: (L) => 18 + 2 * L,
      make: (L, i) => STEPS[i % STEPS.length](L),
      art: (R, total) => { const f = Math.round((R.done / total) * 8);
        return `<div class="bld"><span class="emo crane">🏗️</span><div class="floors">${f >= 8 ? `<div class="roof"></div>` : ""}${K.range(0, Math.min(f, 7)).map(() => `<div class="fl"><i></i><i></i><i></i></div>`).join("")}</div><div class="ground"></div><small>${R.done} من ${total}</small></div>`; },
      msg: ["مهندسة عبقرية! 🏗️🏆", "مبنى متين! 👏", "اكتمل المبنى! 💪"],
    });
  }
  Jobs.register("engineer", { how, start, label: (r) => `${r.done} من ${r.total}` });
})();
