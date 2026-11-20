// مهنة اليوم — الطيار ✈️: يوم في المطار، ساعة تمشي، ولوحة رحلات. الصعود قبل الموعد، والإقلاع في الموعد بالضبط،
// ثم سؤال عن وقت الوصول (حساب الزمن). يتعلم قراءة الساعة وحساب المدة.
(() => {
  "use strict";
  const CITIES = [
    ["مكة", "🕋"], ["القاهرة", "🐫"], ["دبي", "🏙️"], ["إسطنبول", "🕌"], ["الرياض", "🌴"], ["عمّان", "🏛️"], ["بيروت", "🌲"],
    ["الدوحة", "⛵"], ["مسقط", "🏔️"], ["تونس", "🌊"], ["الرباط", "🌅"], ["الكويت", "🗼"], ["المدينة", "🕌"], ["الجزائر", "🏜️"],
    ["بغداد", "🌙"], ["دمشق", "🌹"], ["لندن", "💂"], ["باريس", "🗼"], ["طوكيو", "🗾"], ["كوالالمبور", "🌏"],
  ];
  const DAY0 = 6 * 60;           // اليوم يبدأ 06:00
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L, total: Jobs.TEST ? 2 : 16 + 2 * L,
      step: [30, 15, 5, 5][L],     // مواعيد الرحلات: كل نصف ساعة، ربع، 5 دقائق
      digital: L < 3,              // في الوردية الرابعة الساعة بالعقارب فقط
      win: [6, 5, 4, 3][L],        // دقائق مسموحة بعد الموعد
      gap: [45, 40, 35, 30][L],    // متوسط الدقائق بين الرحلات
      speed: 0.55,                 // ثانية حقيقية لكل دقيقة في اللعبة
      dur: [[60, 30], [45, 15], [35, 5], [35, 5]][L], // مدة الرحلة: [أقصى ساعات×60…, الخطوة]
    };
  };
  const hhmm = (m) => { m = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const durTxt = (m) => { const h = Math.floor(m / 60), r = m % 60; return [h ? (h === 1 ? "ساعة" : h === 2 ? "ساعتان" : `${h} ساعات`) : "", r ? `${r} دقيقة` : ""].filter(Boolean).join(" و"); };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت قائد طائرة ✈️، واليوم مزدحم بالرحلات. الطيار الماهر <b>لا يتأخر ولا يُقلع مبكراً</b>!</p>
      <ul>
        <li>الساعة تمشي 🕒. انظر إلى <b>لوحة الرحلات</b>.</li>
        <li>قبل الموعد بنصف ساعة: اضغط الرحلة ← <b>«صعود الركاب»</b> 🧳.</li>
        <li>عندما تصل الساعة إلى الموعد: اضغط <b>«أقلع»</b> 🛫 (لا قبله، ولا بعده بكثير).</li>
        <li>بعد الإقلاع: احسب <b>متى تصل</b> الطائرة.</li>
        <li>⏩ لتسريع الوقت عندما لا يوجد عمل.</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.total} رحلة</b>، مواعيدها ${v.step === 30 ? "بالساعة ونصف الساعة" : v.step === 15 ? "بالأرباع" : "بالدقائق"}${v.digital ? "" : "، والساعة بالعقارب فقط!"}</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const run = api.run || null;
    // الرحلات: { id, city, emo, dep (دقيقة), dur, state: wait|board|ready|gone|late }
    const R = run || (() => {
      const fl = [];
      let t = DAY0 + 40;
      const cities = K.shuffle(CITIES);
      for (let i = 0; i < v.total; i++) {
        t += Math.max(v.step, Math.round((v.gap * (0.6 + Math.random() * 0.8)) / v.step) * v.step);
        const dep = Math.ceil(t / v.step) * v.step;
        const dur = (1 + Math.floor(Math.random() * (v.dur[0] / v.dur[1] + 4))) * v.dur[1] + 30;
        fl.push({ id: i, city: cities[i % cities.length][0], emo: cities[i % cities.length][1], dep, dur, state: "wait" });
        t = dep;
      }
      return { total: v.total, done: 0, ok: 0, onTime: 0, coins: 0, now: DAY0, fl };
    })();
    let fast = false, sel = null;

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">🛫</span> <b id="hdn"></b></span>
        <span class="pill"><span class="emo">⏰</span> في الموعد: <b id="hok"></b></span>
      </div>
      <div class="airport">
        <div class="clockbox">
          <svg id="clk" viewBox="-110 -110 220 220"></svg>
          <div class="digi" id="digi"></div>
          <button class="btn f" ${K.act("ff", () => { fast = !fast; $("#ffb").classList.toggle("on", fast); })} id="ffb"><span class="emo">⏩</span> تسريع</button>
        </div>
        <div class="boardx"><h3>🛫 لوحة الرحلات</h3><div id="fl"></div></div>
      </div>`, "ff");
    const $ = (s) => K.app.querySelector(s);
    const pauseIt = () => Jobs.pause(api, R, `أقلعت ${R.done} من ${R.total} رحلة`);
    K.mode = Jobs.domMode(pauseIt);
    $("#hp").addEventListener("click", pauseIt);

    // الساعة بالعقارب (SVG)
    const clk = $("#clk");
    clk.innerHTML = `<circle r="104" fill="#fff" stroke="#1e3a8a" stroke-width="6"/>` +
      K.range(0, 60).map((i) => { const a = (i * Math.PI) / 30, l = i % 5 ? 94 : 84; return `<line x1="${Math.sin(a) * l}" y1="${-Math.cos(a) * l}" x2="${Math.sin(a) * 100}" y2="${-Math.cos(a) * 100}" stroke="#1e3a8a" stroke-width="${i % 5 ? 1.5 : 4}"/>`; }).join("") +
      K.range(1, 13).map((h) => { const a = (h * Math.PI) / 6; return `<text x="${Math.sin(a) * 70}" y="${-Math.cos(a) * 70 + 8}" text-anchor="middle" font-size="22" font-weight="800" fill="#1e3a8a">${h}</text>`; }).join("") +
      `<line id="hh" x1="0" y1="10" x2="0" y2="-52" stroke="#1e3a8a" stroke-width="9" stroke-linecap="round"/>
       <line id="mm" x1="0" y1="14" x2="0" y2="-82" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/><circle r="7" fill="#be185d"/>`;
    const drawClock = () => {
      const m = Math.floor(R.now);
      $("#hh").setAttribute("transform", `rotate(${((m / 60) % 12) * 30})`);
      $("#mm").setAttribute("transform", `rotate(${(m % 60) * 6})`);
      $("#digi").textContent = v.digital ? hhmm(m) : "🕒";
    };
    const hud = () => { $("#hdn").textContent = `${R.done} / ${R.total}`; $("#hok").textContent = R.onTime; };

    // اللوحة: الرحلات القادمة (5)
    const visible = () => R.fl.filter((f) => f.state === "wait" || f.state === "board" || f.state === "ready").slice(0, 5);
    const ST = { wait: "⌛ تنتظر", board: "🧳 الصعود…", ready: "✅ جاهزة" };
    function drawBoard() {
      Jobs.fill($("#fl"), visible().map((f) =>
        `<button class="flight f ${f.state}" ${K.act("f" + f.id, () => open(f))}><span class="emo">${f.emo}</span><b>${f.city}</b><span class="tm">${v.digital || f.state !== "wait" ? hhmm(f.dep) : clockIcon(f.dep)}</span><small>${ST[f.state]}</small></button>`).join("") || `<div class="sub">لا رحلات أخرى اليوم ✈️</div>`);
    }
    // في الوردية الرابعة يُكتب الموعد كلاماً: «الثالثة والربع»
    const WORD = ["الثانية عشرة", "الواحدة", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة", "الحادية عشرة"];
    const clockIcon = (m) => { const h = Math.floor(m / 60) % 12, r = m % 60;
      const tail = r === 0 ? "" : r === 15 ? " والربع" : r === 30 ? " والنصف" : r === 45 ? " إلا ربعاً" : ` و${r} دقيقة`;
      return (r === 45 ? WORD[(h + 1) % 12] : WORD[h]) + tail + (m < 720 ? " صباحاً" : " مساءً"); };

    function open(f) {
      const now = Math.floor(R.now), left = f.dep - now;
      const btns = [];
      if (f.state === "wait") btns.push({ label: "🧳 صعود الركاب", cls: "go", fn: () => board(f) });
      if (f.state === "board" || f.state === "ready") btns.push({ label: "🛫 أقلع!", cls: "go", fn: () => takeoff(f) });
      btns.push({ label: "↩ رجوع" });
      Jobs.overlay(`<h2><span class="emo">${f.emo}</span> رحلة إلى ${f.city}</h2>
        <div class="sub">موعد الإقلاع: <b>${v.digital ? hhmm(f.dep) : clockIcon(f.dep)}</b></div>
        ${f.state === "board" ? `<div class="sub">الركاب يصعدون… 🧳</div>` : ""}`, btns, { back: () => {} });
      sel = f;
    }
    function board(f) {
      const left = f.dep - Math.floor(R.now);
      if (left > 30) { K.sfx.bad(); return Jobs.toast(`مبكر! الصعود يبدأ قبل الموعد بنصف ساعة`, "bad", 2400); }
      f.state = "board"; f.bs = R.now; K.sfx.ok(); drawBoard();
    }
    function takeoff(f) {
      const now = Math.floor(R.now), d = now - f.dep;
      if (f.state === "board") { K.sfx.bad(); return Jobs.toast("الركاب لم يصعدوا كلهم بعد 🧳", "bad", 2000); }
      if (d < 0) { K.sfx.bad(); return Jobs.toast(`ما زال الوقت مبكراً! الموعد ${hhmm(f.dep)} والساعة ${hhmm(now)}`, "bad", 2800); }
      f.state = "gone";
      const ontime = d <= v.win;
      if (ontime) { R.onTime++; K.confetti(8, "✈️☁️⭐"); } else Jobs.toast(`أقلعت متأخراً ${d} دقيقة ⌛`, "bad", 2400);
      jet();
      drawBoard(); hud();
      K.later(() => arrival(f, ontime), 900);
    }
    // سؤال: متى نصل؟
    function arrival(f, ontime) {
      const ans = f.dep + f.dur;
      const opts = K.shuffle([...new Set([ans, ans + 60, ans - 30 > f.dep ? ans - 30 : ans + 30, ans + 15 * (Math.random() < 0.5 ? 1 : -1) * (v.step < 30 ? 1 : 2)])]).slice(0, 3);
      if (!opts.includes(ans)) opts[0] = ans;
      Jobs.overlay(`<h2>🛫 أقلعت إلى ${f.city} الساعة ${hhmm(f.dep)}</h2>
        <div class="sub">مدة الرحلة <b>${durTxt(f.dur)}</b>. متى نصل؟ 🛬</div>`,
        K.shuffle(opts).map((m) => ({ label: `<span class="num">${hhmm(m)}</span>`, cls: "opt", fn: () => answered(m === ans, ans, ontime) })),
        { cls: "wide", btnCls: "opts" });
    }
    function answered(right, ans, ontime) {
      R.done++;
      if (right && ontime) R.ok++;
      if (right) { K.sfx.ok(); Jobs.toast(`صحيح! نصل الساعة ${hhmm(ans)} 🛬`, "good"); }
      else { K.sfx.bad(); Jobs.toast(`الجواب: ${hhmm(ans)} 🛬`, "bad", 3000); }
      api.keep(R); hud(); drawBoard();
      if (R.done >= R.total) K.later(finish, 1500);
    }
    function finish() {
      const s = Jobs.grade(R.ok, R.total);
      api.finish({ s, score: R.ok, total: R.total,
        msg: s === 3 ? "طيار دقيق كالساعة! ✈️🏆" : s === 2 ? "رحلات ناجحة! 👏" : "أنهيت الوردية! 💪",
        extra: `<div class="won"><span class="emo">⏰</span> في الموعد: ${R.onTime} من ${R.total}</div>` });
    }
    const jet = () => { const ac = K.audioCtx(); if (!ac) return; for (let i = 0; i < 6; i++) K.tone(120 + i * 40, 0.25, "sawtooth", 0.03, i * 0.12); };

    let lastMin = -1;
    const stop = Jobs.loop((dt) => {
      if (Jobs.ov) return;
      R.now += (dt / v.speed) * (fast ? 6 : 1);
      const m = Math.floor(R.now);
      if (m === lastMin) return;
      lastMin = m;
      drawClock();
      let changed = false;
      for (const f of R.fl) {
        if (f.state === "board" && R.now - f.bs >= 10) { f.state = "ready"; changed = true; }   // الصعود يأخذ 10 دقائق
        if ((f.state === "wait" || f.state === "board" || f.state === "ready") && m - f.dep > v.win + 25) {
          f.state = "late"; R.done++; changed = true;
          K.sfx.bad(); Jobs.toast(`فاتت رحلة ${f.city}! الركاب غاضبون 😠`, "bad", 3000);
          api.keep(R); hud();
          if (R.done >= R.total) K.later(finish, 1500);
        }
        if (f.state === "wait" && f.dep - m === 30) { K.tone(784, 0.12); K.tone(988, 0.15, "sine", 0.12, 0.15); Jobs.toast(`🔔 بدأ الصعود لرحلة ${f.city}`, "", 2000); changed = true; }
        if ((f.state === "ready") && m === f.dep) { K.tone(1046, 0.2); Jobs.toast(`⏰ حان موعد رحلة ${f.city}!`, "good", 2000); }
      }
      // لا تسرّع فوق موعد قريب
      if (fast && R.fl.some((f) => f.state !== "gone" && f.state !== "late" && Math.abs(f.dep - 30 - m) <= 1 || (f.state === "ready" && f.dep - m <= 2 && f.dep - m >= -1))) { fast = false; $("#ffb").classList.remove("on"); }
      if (changed) drawBoard();
    });
    K.mode.stop = () => { stop(); Jobs.closeOverlay(); };
    if (Jobs.TEST) window.__pilot = R;
    drawClock(); drawBoard(); hud();
  }

  Jobs.register("pilot", { how, start });
})();
