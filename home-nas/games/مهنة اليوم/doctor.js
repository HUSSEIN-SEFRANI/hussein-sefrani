// مهنة اليوم — الطبيب 👨‍⚕️: غرفة انتظار، والحالات الطارئة أولاً. لكل مريض: قياس (قراءة ميزان الحرارة أو عدّ النبض)،
// ثم العلاج المناسب (إسعافات أولية ونصائح صحية عامة)، وفي المستويات العليا حساب جرعة الدواء حسب الوزن.
(() => {
  "use strict";
  const WHO = ["👦", "👧", "🧒", "👩", "👨", "👵", "👴", "🧕", "🧔", "👱‍♀️", "👨‍🦱", "👩‍🦳"];
  // say: ما يقوله المريض، fever: [أدنى، أعلى] للحرارة، ok: العلاج الصحيح، bad: خطأ، why: الشرح
  const CASES = [
    { e: "🤧", say: "أعطس كثيراً وأنفي يسيل", fever: [37.5, 38.5], ok: "🍵 راحة وسوائل دافئة", bad: ["🦴 جبيرة", "🏃 تمارين قوية"], why: "الرشح يتحسن بالراحة والسوائل." },
    { e: "🩸", say: "جرحت يدي وأنا ألعب", fever: [36.5, 37], ok: "🩹 تنظيف الجرح ولاصق طبي", bad: ["🧃 كأس عصير فقط", "👁️ قطرة عين"], why: "ننظف الجرح من الأوساخ ثم نغطيه." },
    { e: "🦶", say: "التوت قدمي في الملعب", fever: [36.5, 37], ok: "🧊 ثلج ملفوف بقماش ورفع القدم وراحة", bad: ["🏃 أكمل الجري عليها", "🍬 حلوى"], why: "الثلج والراحة يخففان التورّم." },
    { e: "🚲", say: "سقطت عن الدراجة ولا أستطيع تحريك يدي", fever: [36.5, 37], ok: "🦴 صورة أشعة وجبيرة", bad: ["🩹 لاصق صغير فقط", "💪 تمارين لليد"], why: "قد يكون كسراً: نصوّره ونثبّته." },
    { e: "🍲", say: "لمست قدراً ساخناً", fever: [36.5, 37], ok: "🚰 ماء بارد جارٍ لعشر دقائق", bad: ["🧈 زبدة على الحرق", "🪥 معجون أسنان"], why: "الماء البارد يبرّد الحرق. لا نضع عليه زبدة ولا معجوناً." },
    { e: "☀️", say: "لعبت تحت الشمس طويلاً ورأسي يدور", fever: [37.8, 39], ok: "🌳 ظل وماء وتبريد الجسم", bad: ["☕ مشروب ساخن", "🏃 أكمل اللعب"], why: "ضربة الشمس تحتاج ظلاً وماءً وتبريداً." },
    { e: "🦷", say: "ضرسي يؤلمني منذ يومين", fever: [36.5, 37.3], ok: "🦷 تحويل إلى طبيب الأسنان", bad: ["🦴 جبيرة", "👂 قطرة أذن"], why: "ألم الأسنان يعالجه طبيب الأسنان." },
    { e: "🐱", say: "تحمرّ عيناي وأعطس عندما ألمس القطط", fever: [36.5, 37], ok: "🚫 الابتعاد عن المسبب ودواء حساسية يصفه الطبيب", bad: ["🐈 العب مع قطط أكثر", "🦴 جبيرة"], why: "هذه حساسية: نبتعد عن سببها." },
    { e: "🍭", say: "أكلت حلوى كثيرة وبطني يؤلمني", fever: [36.5, 37.2], ok: "💧 ماء وراحة وأكل خفيف", bad: ["🍫 حلوى أكثر", "🏋️ رفع أثقال"], why: "المعدة تحتاج راحة وطعاماً خفيفاً." },
    { e: "🥵", say: "حرارتي مرتفعة وأشعر بالتعب", fever: [38.5, 40], ok: "💊 خافض حرارة يصفه الطبيب وسوائل وراحة", bad: ["🧥 ألبسه ملابس ثقيلة جداً", "🏃 تمارين"], why: "الحمّى تحتاج سوائل وراحة ودواء يصفه الطبيب." },
    { e: "👁️", say: "دخل غبار في عيني", fever: [36.5, 37], ok: "🚿 غسل العين بماء نظيف", bad: ["✋ فرك العين بقوة", "🩹 لاصق على العين"], why: "الفرك يجرح العين، والماء النظيف يُخرج الغبار." },
    { e: "🐝", say: "لسعتني نحلة في يدي", fever: [36.5, 37.2], ok: "🧊 إخراج الإبرة بلطف ثم كمادة باردة", bad: ["🔥 تدفئة المكان", "🍯 عسل على اللسعة"], why: "نخرج الإبرة ونبرّد المكان." },
  ];
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, total: Jobs.TEST ? 2 : 20 + 2 * L,
      patience: [110, 95, 85, 75][L], every: [16, 13, 11, 10][L], room: 4,
      pulse: L >= 1, dose: L >= 2, er: L ? 0.18 : 0.1, half: L >= 1,
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت طبيب في العيادة 👨‍⚕️. المرضى ينتظرون في غرفة الانتظار.</p>
      <ul>
        <li>🚑 <b>الحالة الطارئة أولاً</b> دائماً!</li>
        <li>افحص المريض: اقرأ <b>ميزان الحرارة</b> 🌡️${v.pulse ? ` أو <b>عُدّ النبض</b> 💓` : ""}.</li>
        <li>استمع إلى المريض واختر <b>العلاج المناسب</b>.</li>
        ${v.dose ? `<li>💊 احسب <b>جرعة الدواء</b> حسب وزن المريض.</li>` : ""}
        <li>لا تجعل المرضى ينتظرون طويلاً ⏳.</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.total} مريضاً</b>. <small>(معلومات إسعافات أولية عامة، والطبيب الحقيقي هو من يصف الدواء)</small></p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const R = api.run || { total: v.total, done: 0, ok: 0, steps: 0, good: 0, lost: 0 };
    let room = [], comes = R.done, nextIn = 1;

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">🧑‍🤝‍🧑</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">💚</span> <b id="hok"></b></span>
      </div>
      <div class="clinic"><div class="doc"><span class="emo">👨‍⚕️</span><small>اختر مريضاً</small></div><div class="room" id="room"></div></div>`);
    const $ = (s) => K.app.querySelector(s);
    const pauseIt = () => Jobs.pause(api, R, `عالجت ${R.done} من ${R.total} مريضاً`);
    K.mode = Jobs.domMode(pauseIt);
    $("#hp").addEventListener("click", pauseIt);
    const hud = () => { $("#hdn").textContent = `${R.done} / ${R.total}`; $("#hok").textContent = R.ok; };

    function draw() {
      Jobs.fill($("#room"), room.length ? room.map((p, i) => `<button class="pat-card f ${p.er ? "er" : ""}" ${K.act("p" + p.id, () => see(p))}>
        ${p.er ? `<span class="emo siren">🚑</span>` : ""}<span class="emo who">${p.who}</span><span class="emo sym">${p.c.e}</span>
        <div class="pat"><u id="pp${p.id}"></u></div></button>`).join("") : `<div class="sub">غرفة الانتظار فارغة… ☕</div>`);
      tick();
    }
    function tick() {
      for (const p of room) {
        const u = $("#pp" + p.id); if (!u) continue;
        const f = Math.max(0, 1 - p.t / p.max);
        u.style.width = f * 100 + "%"; u.style.background = f > 0.5 ? "#22c55e" : f > 0.25 ? "#f59e0b" : "#ef4444";
      }
    }
    let pid = 0;
    function arrive() {
      if (room.length >= v.room || comes >= R.total) return;
      const c = K.pick(CASES), er = Math.random() < v.er && !room.some((p) => p.er);
      room.push({ id: pid++, who: K.pick(WHO), c, er, t: 0, max: er ? v.patience * 0.55 : v.patience });
      comes++;
      if (er) [0, 0.25, 0.5].forEach((w) => K.tone(900, 0.15, "square", 0.04, w));
      else K.tone(988, 0.08);
      draw();
    }

    // الفحص: سلسلة خطوات (نافذة بعد نافذة)
    function see(p) {
      const er = room.find((x) => x.er);
      if (er && er !== p) { R.steps++; K.sfx.bad(); Jobs.toast("🚑 الحالة الطارئة أولاً!", "bad", 2200); return; }
      room = room.filter((x) => x !== p); draw();
      p.score = 0; p.n = 0;
      const steps = [];
      steps.push(v.pulse && Math.random() < 0.4 ? pulseStep : thermoStep);
      steps.push(treatStep);
      if (v.dose && Math.random() < 0.6) steps.push(doseStep);
      const next = () => (steps.length ? steps.shift()(p, next) : done(p));
      next();
    }
    const mark = (p, right, okMsg, badMsg) => {
      p.n++; R.steps++;
      if (right) { p.score++; R.good++; K.sfx.ok(); Jobs.toast(okMsg, "good", 1800); }
      else { K.sfx.bad(); Jobs.toast(badMsg, "bad", 3200); }
    };
    function thermoStep(p, next) {
      const [a, b] = p.c.fever, st = v.half ? 0.5 : 0.5;
      const temp = Math.round((a + Math.random() * (b - a)) / st) * st;
      const opts = K.shuffle([...new Set([temp, temp + 0.5, temp - 0.5, temp + 1].map((x) => +x.toFixed(1)))]).slice(0, 3);
      if (!opts.includes(temp)) opts[0] = temp;
      const fever = temp >= 38;
      Jobs.overlay(`<div class="exam"><div>${thermo(temp)}</div><div><h2>🌡️ ${p.who} «${p.c.say}»</h2><div class="sub">كم تقرأ في ميزان الحرارة؟</div></div></div>`,
        K.shuffle(opts).map((x) => ({ label: `<span class="num">${x}°</span>`, cls: "opt", fn: () => {
          mark(p, x === temp, `صحيح: ${temp}° ${fever ? "— عنده حمّى 🥵" : "— حرارة طبيعية 👍"}`, `القراءة ${temp}° ${fever ? "(حمّى)" : "(طبيعية)"}`); K.later(next, 900);
        } })), { cls: "wide", btnCls: "opts" });
    }
    function pulseStep(p, next) {
      const b15 = 17 + Math.floor(Math.random() * 10), ans = b15 * 4;
      Jobs.overlay(`<h2>💓 عددت نبض ${p.who} لمدة 15 ثانية: <b>${b15}</b> نبضة</h2><div class="sub">كم نبضة في الدقيقة الكاملة (60 ثانية)؟</div>`,
        Jobs.numOptions(ans, 3, [4, 8, 15, 20]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => {
          mark(p, n === ans, `صحيح! ${b15} × 4 = ${ans} 💓`, `الدقيقة = 4 × 15 ثانية، إذن ${b15} × 4 = ${ans}`); K.later(next, 900);
        } })), { cls: "wide", btnCls: "opts" });
    }
    function treatStep(p, next) {
      const c = p.c;
      Jobs.overlay(`<h2><span class="emo">${p.who}${c.e}</span> «${c.say}»</h2><div class="sub">ما العلاج المناسب؟</div>`,
        K.shuffle([c.ok, ...c.bad]).map((o) => ({ label: o, cls: "opt txt", fn: () => {
          mark(p, o === c.ok, `👍 ${c.why}`, `الصحيح: ${c.ok} — ${c.why}`); K.later(next, 1200);
        } })), { cls: "wide", btnCls: "opts col" });
    }
    function doseStep(p, next) {
      const per = K.pick([2, 5]), kg = K.pick([10, 20, 30, 40]), ans = (per * kg) / 10;
      Jobs.overlay(`<h2>💊 الدواء: <b>${per} مل</b> لكل <b>10 كغ</b> من الوزن</h2><div class="sub">وزن ${p.who} <b>${kg} كغ</b>. كم مل يأخذ؟</div>`,
        Jobs.numOptions(ans, 3, [1, 2, 5, per]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => {
          mark(p, n === ans, `صحيح! ${kg} ÷ 10 × ${per} = ${ans} مل`, `الجرعة: ${kg} ÷ 10 = ${kg / 10}، و${kg / 10} × ${per} = ${ans} مل`); K.later(next, 900);
        } })), { cls: "wide", btnCls: "opts" });
    }
    function done(p) {
      R.done++;
      if (p.score === p.n) { R.ok++; K.confetti(8, "💚✨🩺"); }
      Jobs.toast(`${p.who} شكراً يا دكتور! 💚`, "good", 1600);
      after();
    }
    function after() {
      api.keep(R); hud();
      if (R.done >= R.total) K.later(finish, 1600);
    }
    function finish() {
      const s = Jobs.grade(R.ok, R.total, R.lost);
      api.finish({ s, score: R.ok, total: R.total,
        msg: s === 3 ? "طبيب ماهر! 👨‍⚕️🏆" : s === 2 ? "عيادة ناجحة! 👏" : "أنهيت المناوبة! 💪",
        extra: `<div class="won"><span class="emo">✅</span> خطوات صحيحة: ${R.good} من ${R.steps} &nbsp; <span class="emo">⏳</span> غادروا: ${R.lost}</div>` });
    }
    // ميزان حرارة (SVG): من 35 إلى 42
    function thermo(t) {
      const y = (x) => 260 - (x - 35) * 32;
      let ticks = "";
      for (let x = 35; x <= 42; x += 0.5) {
        const big = x % 1 === 0;
        ticks += `<line x1="${big ? 56 : 62}" x2="74" y1="${y(x)}" y2="${y(x)}" stroke="#1e3a8a" stroke-width="${big ? 3 : 1.5}"/>`;
        if (big) ticks += `<text x="50" y="${y(x) + 6}" text-anchor="end" font-size="18" font-weight="800" fill="#1e3a8a">${x}</text>`;
      }
      return `<svg class="thermo" viewBox="0 0 120 330"><rect x="74" y="20" width="26" height="260" rx="13" fill="#f1f5f9" stroke="#94a3b8" stroke-width="3"/>
        <rect x="80" y="${y(t)}" width="14" height="${290 - y(t)}" fill="#ef4444"/><circle cx="87" cy="296" r="22" fill="#ef4444" stroke="#94a3b8" stroke-width="3"/>
        <line x1="70" x2="104" y1="${y(t)}" y2="${y(t)}" stroke="#be185d" stroke-width="2"/>${ticks}</svg>`;
    }

    const stop = Jobs.loop((dt) => {
      if (Jobs.ov) return;
      for (const p of room) {
        p.t += dt;
        if (p.t >= p.max) {
          room = room.filter((x) => x !== p);
          R.done++; R.lost++;
          K.sfx.bad(); Jobs.toast(`${p.who} تعب من الانتظار وذهب 😞`, "bad", 2400);
          draw(); after();
        }
      }
      if ((nextIn -= dt) <= 0) { arrive(); nextIn = v.every * (0.6 + Math.random() * 0.8); }
      tick();
    });
    K.mode.stop = () => { stop(); Jobs.closeOverlay(); };
    if (Jobs.TEST) window.__doc = { get room() { return room; }, R };
    draw(); hud();
  }

  Jobs.register("doctor", { how, start });
})();
