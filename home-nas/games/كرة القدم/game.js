// كرة القدم — مباراة من الأعلى: لاعبان (يدا تحكم) أو ضد الكمبيوتر بثلاث صعوبات
// كل فريق: لاعبان في الملعب (تتحكم بأحدهما) وحارس مرمى آلي.
// الفريق الأول (يمين): يد التحكم ١ أو الأسهم، Enter تسديد، Space أو / تمرير
// الفريق الثاني (يسار): يد التحكم ٢ أو WASD، F تسديد، G تمرير
// يد التحكم: ✕ تسديد · □ أو ○ تمرير (وبدون الكرة: تبديل اللاعب) · Options إيقاف مؤقت
(() => {
  "use strict";
  const GAME = "كرة القدم";
  const save = K.store("football", { mins: 2, gfx: 1, col: [0, 1], flag: [0, 0], wins: { a: 0, b: 0, d: 0 }, cpuWins: [0, 0, 0] });
  // مدة المباراة بالدقائق (يختارها الطفل من شاشة «الوقت»)
  const MINS = [1, 2, 3, 4, 5, 7, 10];
  const AR = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const minsName = (m) => (m === 1 ? "دقيقة واحدة" : m === 2 ? "دقيقتان" : m <= 10 ? `${AR(m)} دقائق` : `${AR(m)} دقيقة`);
  if (!MINS.includes(save.mins)) save.mins = 2;
  const COLORS = [
    { n: "الأزرق", c: "#2563eb", d: "#1e3a8a", t: "#fff" },
    { n: "الأحمر", c: "#dc2626", d: "#7f1d1d", t: "#fff" },
    { n: "الأصفر", c: "#facc15", d: "#a16207", t: "#422006" },
    { n: "البرتقالي", c: "#f97316", d: "#9a3412", t: "#fff" },
    { n: "البنفسجي", c: "#8b5cf6", d: "#4c1d95", t: "#fff" },
    { n: "الوردي", c: "#ec4899", d: "#9d174d", t: "#fff" },
    { n: "السماوي", c: "#06b6d4", d: "#155e75", t: "#fff" },
    { n: "الأبيض", c: "#f8fafc", d: "#64748b", t: "#1e293b" },
    { n: "الأسود", c: "#1f2937", d: "#030712", t: "#fff" },
  ];
  // أعلام اختيارية (من رموز الأعلام كما في لعبة «جغرافيا»)
  const FLAGS = [["", "بلا علم"], ["SA", "السعودية"], ["EG", "مصر"], ["MA", "المغرب"], ["DZ", "الجزائر"], ["TN", "تونس"], ["JO", "الأردن"], ["PS", "فلسطين"],
    ["IQ", "العراق"], ["SY", "سوريا"], ["LB", "لبنان"], ["AE", "الإمارات"], ["QA", "قطر"], ["KW", "الكويت"], ["OM", "عُمان"], ["BH", "البحرين"], ["YE", "اليمن"],
    ["LY", "ليبيا"], ["SD", "السودان"], ["TR", "تركيا"], ["FR", "فرنسا"], ["DE", "ألمانيا"], ["ES", "إسبانيا"], ["IT", "إيطاليا"], ["BR", "البرازيل"],
    ["AR", "الأرجنتين"], ["JP", "اليابان"], ["NG", "نيجيريا"], ["SN", "السنغال"], ["CA", "كندا"]];
  const flagEmo = (code) => (code ? String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) : "");
  const LEVELS = [
    { n: "سهل", emo: "🙂", spd: 0.7, react: 0.5, shootR: 250, err: 0.4, tackle: 0.5, gk: 0.4, stars: 2, bg: "linear-gradient(135deg,#22c55e,#15803d)" },
    { n: "متوسط", emo: "😎", spd: 0.86, react: 0.28, shootR: 320, err: 0.22, tackle: 1.1, gk: 0.6, stars: 3, bg: "linear-gradient(135deg,#f59e0b,#c2410c)" },
    { n: "صعب", emo: "🔥", spd: 0.98, react: 0.14, shootR: 380, err: 0.1, tackle: 2, gk: 0.78, stars: 4, bg: "linear-gradient(135deg,#ef4444,#7f1d1d)" },
  ];
  const team = (i) => { const c = COLORS[save.col[i]], f = FLAGS[save.flag[i]]; return { ...c, flag: flagEmo(f[0]), fname: f[0] ? f[1] : "" }; };
  const tname = (t) => t.fname || `الفريق ${t.n}`;

  function earn(amount, reason, el) {
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, game: GAME, reason }) })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.added && el) { el.innerHTML = `ربحت ⭐ ${d.added}`; el.hidden = false; } }).catch(() => {});
  }

  // ---------------------------------------------------------------- القائمة
  function homeScreen() {
    K.begin();
    const pads = K.pads().length;
    K.paint(`
      <div class="title"><span class="mascot emo">⚽</span><div><h1>كرة القدم</h1><div class="sub">سدّد في مرمى الخصم، وأكثر من يسجّل يفوز!</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#2563eb,#dc2626)" ${K.act("two", () => K.show(teamScreen, -1))}>
          <span class="big emo">👫</span><b>لاعبان</b><small>يدا تحكم أو لوحة مفاتيح</small></button>
        ${LEVELS.map((l, i) => `<button class="mode f" style="background:${l.bg}" ${K.act("cpu" + i, () => K.show(teamScreen, i))}>
          <span class="big emo">🤖</span><b>ضد الكمبيوتر</b><small>${l.emo} ${l.n}</small></button>`).join("")}
      </div>
      <div class="mini">
        <button class="btn f" ${K.act("dur", () => K.show(timeScreen))}>⏱️ الوقت: ${minsName(save.mins)}</button>
        <button class="btn f" ${K.act("gfx", () => { save.gfx = save.gfx ? 0 : 1; save.save(); K.render(); })}>${save.gfx ? "✨ الرسوم: الترا" : "🖼️ الرسوم: عادية"}</button>
        <span class="pill">🏆 فوزك على الكمبيوتر: ${save.cpuWins.reduce((a, b) => a + b, 0)}</span>
        <span class="pill">🎮 ${pads ? `${pads} يد تحكم متصلة` : "لا توجد يد تحكم"}</span>
      </div>
      <div class="help"><b>الأسهم</b> للتنقل · <b>Enter</b> أو <b>✕</b> للاختيار · <b>Backspace</b> أو <b>○</b> للرجوع</div>`, "two");
  }

  function teamScreen(lvl) {
    K.begin();
    const cpu = lvl >= 0;
    const card = (i) => {
      const t = team(i);
      const who = i === 0 ? (cpu ? "أنت · يد التحكم ١ أو الأسهم" : "اللاعب ١ · يد التحكم ١ أو الأسهم") : cpu ? `🤖 الكمبيوتر · ${LEVELS[lvl].n}` : "اللاعب ٢ · يد التحكم ٢ أو WASD";
      const cyc = (key, n) => () => {
        let v = save[key][i];
        do v = (v + 1) % n; while (key === "col" && v === save.col[1 - i]);
        save[key][i] = v; save.save(); K.render();
      };
      return `<div class="team" style="--c:${t.c};--d:${t.d};--t:${t.t}">
        <div class="kit"><span class="emo">${t.flag || "⚽"}</span></div>
        <h2>${tname(t)}</h2><small>${who}</small>
        <button class="btn f" ${K.act("c" + i, cyc("col", COLORS.length))}>🎨 اللون: ${t.n}</button>
        <button class="btn f" ${K.act("g" + i, cyc("flag", FLAGS.length))}>${t.flag ? `<span class="emo">${t.flag}</span>` : "🏳️"} العلم: ${FLAGS[save.flag[i]][1]}</button>
      </div>`;
    };
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="ttl">اختر لون فريقك</h2><button class="btn f" ${K.act("dur", () => K.show(timeScreen))}>⏱️ ${minsName(save.mins)}</button></div>
      <div class="teams">${card(0)}<div class="vs">ضد</div>${card(1)}</div>
      <button class="btn f go big" ${K.act("go", () => K.replace(matchScreen, lvl))}>⚽ ابدأ المباراة</button>
      <div class="help">✕ أو Enter: ${cpu ? "تسديد" : "تسديد (الثاني: F)"} · □ أو ○ أو Space: ${cpu ? "تمرير" : "تمرير (الثاني: G)"} · بدون الكرة: ✕ اندفاع، □ تبديل اللاعب</div>`, "go");
  }

  function timeScreen() {
    K.begin();
    const tip = (m) => (m === 1 ? "سريعة ⚡" : m <= 3 ? "عادية" : m <= 5 ? "طويلة" : "طويلة جداً 🏆");
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="ttl">⏱️ كم مدة المباراة؟</h2><span></span></div>
      <div class="times">${MINS.map((m) => `<button class="tm f${m === save.mins ? " on" : ""}" ${K.act("m" + m, () => { save.mins = m; save.save(); K.back(); })}>
        <b>${AR(m)}</b><span>${m === 1 ? "دقيقة" : m === 2 ? "دقيقتان" : "دقائق"}</span><small>${tip(m)}</small></button>`).join("")}</div>
      ${K.HELP}`, "m" + save.mins);
  }

  // ---------------------------------------------------------------- المباراة
  const FW = 1000, FH = 620, GH = 190, GD = 42, R_B = 8, R_P = 15;
  const MY0 = FH / 2 - GH / 2, MY1 = FH / 2 + GH / 2;

  function matchScreen(lvl) {
    K.begin();
    const cpu = lvl >= 0, L = cpu ? LEVELS[lvl] : null;
    const T = [team(0), team(1)];
    K.paint(`<canvas class="pitch"></canvas><div class="msg"></div>
      <div class="tc"><div class="joy"><i></i></div>
        <div class="tb"><button class="pause">⏸</button><button class="pass">تمرير</button><button class="shoot">⚽<small>تسديد</small></button></div></div>`);
    const cv = K.app.querySelector("canvas"), g0 = cv.getContext("2d"), msg = K.app.querySelector(".msg"), tc = K.app.querySelector(".tc");
    let g = g0, W = 0, H = 0, S = 1, OX = 0, OY = 0, ROT = false, HUD = 0, DPR = 1;
    const ULTRA = save.gfx === 1;
    const fit = () => {
      const dpr = (DPR = Math.min(2, devicePixelRatio || 1));
      W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g0.setTransform(dpr, 0, 0, dpr, 0, 0);
      ROT = H > W * 1.05;
      HUD = ROT ? Math.max(54, H * 0.07) : Math.max(48, H * 0.1);
      const bw = ROT ? FH : FW + GD * 2 + 20, bh = ROT ? FW + GD * 2 + 20 : FH + 20;
      const avH = H - HUD - (ROT && tcOn ? H * 0.26 : 0);
      S = Math.min(W / bw, avH / bh);
      OX = W / 2; OY = HUD + avH / 2;
      buildBg();
    };
    // تحويل من الملعب إلى الشاشة (على الهاتف العمودي يدور الملعب)
    const P2S = (x, y) => ROT ? [OX - (y - FH / 2) * S, OY + (x - FW / 2) * S] : [OX + (x - FW / 2) * S, OY + (y - FH / 2) * S];
    const dirS2W = (sx, sy) => ROT ? [sy, -sx] : [sx, sy];

    // اللاعبون: [0] حارس، [1] و [2] لاعبان. الفريق ٠ يدافع عن اليمين (x=FW) ويهاجم اليسار
    const goalX = (ti) => (ti === 0 ? FW : 0), atkX = (ti) => (ti === 0 ? 0 : FW), sgn = (ti) => (ti === 0 ? -1 : 1);
    const HOME = [[0, 0.5], [0.3, 0.32], [0.3, 0.68]];
    const mk = (ti, k) => ({ ti, k, gk: k === 0, x: 0, y: 0, vx: 0, vy: 0, fx: sgn(ti), fy: 0, run: 0, stun: 0, immune: 0, noPick: 0, dash: 0, dashCd: 0, hold: 0, jump: 0, think: 0, tx: 0, ty: 0 });
    const P = [[mk(0, 0), mk(0, 1), mk(0, 2)], [mk(1, 0), mk(1, 1), mk(1, 2)]];
    const ALL = [...P[0], ...P[1]];
    const ball = { x: FW / 2, y: FH / 2, z: 0, vz: 0, trail: [], vx: 0, vy: 0, owner: null, rot: 0, gkTried: false, lastTeam: -1, inNet: false, passTo: null };
    const human = [true, !cpu], ctrl = [1, 1], score = [0, 0];
    const gkSkill = [cpu ? 0.62 : 0.6, cpu ? L.gk : 0.6];
    let timeLeft = save.mins * 60, state = "kick", stateT = 0, scorer = null, raf = 0, last = performance.now(), paused = false, kickTeam = 0;

    function placeAll(kt) {
      for (let ti = 0; ti < 2; ti++) P[ti].forEach((p, k) => {
        const [hx, hy] = HOME[k];
        p.x = ti === 0 ? FW - (hx * FW + 28) : hx * FW + 28; p.y = hy * FH;
        if (k === 0) p.x = ti === 0 ? FW - 22 : 22;
        p.vx = p.vy = 0; p.fx = sgn(ti); p.fy = 0; p.stun = p.dash = p.hold = 0; p.immune = 0;
      });
      const kp = P[kt][1]; kp.x = FW / 2 - sgn(kt) * 20; kp.y = FH / 2;
      ball.x = FW / 2; ball.y = FH / 2; ball.vx = ball.vy = 0; ball.owner = null; ball.inNet = false; ball.passTo = null; ball.gkTried = false;
      ctrl[0] = ctrl[1] = 1;
    }

    // ---------------------------------------------------------------- الإدخال
    const keys = new Set(), edge = [{ shoot: false, pass: false }, { shoot: false, pass: false }];
    const padSt = [{}, {}], padDir = [[0, 0], [0, 0]];
    const touch = { on: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 };
    let tcOn = matchMedia("(pointer: coarse)").matches;
    tc.classList.toggle("on", tcOn);
    const P1SHOOT = ["enter"], P1PASS = [" ", "/", ".", "shift", "control"], P2SHOOT = ["f"], P2PASS = ["g", "e"];
    function togglePause() {
      if (state === "over") return;
      paused = !paused;
      msg.innerHTML = paused ? `<div class="box">⏸ توقف<small>✕ أو Enter: استمرار · ○ أو Backspace: الخروج</small></div>` : "";
    }
    K.mode = {
      key(e) {
        const k = (e.key || "").toLowerCase();
        if (paused) { if (k === "enter" || k === " ") togglePause(); else if (k === "backspace") K.back(); return true; }
        if (e.pad) return true;
        if (k === "backspace" || k === "p") { togglePause(); return true; }
        if (!e.repeat) {
          if (P1SHOOT.includes(k)) edge[0].shoot = true;
          if (P1PASS.includes(k)) edge[0].pass = true;
          if (P2SHOOT.includes(k)) edge[human[1] ? 1 : 0].shoot = true;
          if (P2PASS.includes(k)) edge[human[1] ? 1 : 0].pass = true;
        }
        keys.add(k); return true;
      },
      keyup(e) { keys.delete((e.key || "").toLowerCase()); },
      poll(pads) {
        padDir[0] = [0, 0]; padDir[1] = [0, 0];
        pads.slice(0, 2).forEach((pd, i) => {
          const ti = human[1] ? i : 0;
          const b = (n) => !!(pd.buttons[n] && pd.buttons[n].pressed), st = padSt[i];
          let ax = pd.axes[0] || 0, ay = pd.axes[1] || 0;
          if (Math.hypot(ax, ay) < 0.28) ax = ay = 0;
          if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
          if (ax || ay) padDir[ti] = [ax, ay];
          const pr = (n) => b(n) && !st[n];
          if (paused) { if (pr(0)) togglePause(); else if (pr(1)) K.back(); }
          else if (state === "over") {}
          else {
            if (pr(9) || pr(8)) togglePause();
            if (pr(0) || pr(7) || pr(5)) edge[ti].shoot = true;
            if (pr(2) || pr(1) || pr(3) || pr(6) || pr(4)) edge[ti].pass = true;
          }
          for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) st[n] = b(n);
        });
        return true;
      },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", fit); },
    };
    // اللمس والفأرة: عصا في اليسار وأزرار في اليمين
    const joy = tc.querySelector(".joy"), knob = joy.querySelector("i");
    const showTouch = () => { if (!tcOn) { tcOn = true; tc.classList.add("on"); fit(); } };
    cv.addEventListener("pointerdown", showTouch);
    joy.addEventListener("pointerdown", (e) => {
      e.preventDefault(); K.audioCtx(); try { joy.setPointerCapture(e.pointerId); } catch {}
      const r = joy.getBoundingClientRect(); touch.on = true; touch.id = e.pointerId; touch.cx = r.left + r.width / 2; touch.cy = r.top + r.height / 2; moveJoy(e);
    });
    const moveJoy = (e) => {
      if (!touch.on || e.pointerId !== touch.id) return;
      const r = joy.offsetWidth / 2; let dx = (e.clientX - touch.cx) / r, dy = (e.clientY - touch.cy) / r; const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      touch.dx = m < 0.2 ? 0 : dx; touch.dy = m < 0.2 ? 0 : dy; knob.style.transform = `translate(${dx * r * 0.6}px,${dy * r * 0.6}px)`;
    };
    const endJoy = (e) => { if (e.pointerId !== touch.id) return; touch.on = false; touch.dx = touch.dy = 0; knob.style.transform = ""; };
    joy.addEventListener("pointermove", moveJoy); joy.addEventListener("pointerup", endJoy); joy.addEventListener("pointercancel", endJoy);
    const tbtn = (sel, fn) => tc.querySelector(sel).addEventListener("pointerdown", (e) => { e.preventDefault(); K.audioCtx(); fn(); });
    tbtn(".shoot", () => { if (paused) togglePause(); else edge[0].shoot = true; });
    tbtn(".pass", () => { if (paused) togglePause(); else edge[0].pass = true; });
    tbtn(".pause", () => (state === "over" ? null : togglePause()));
    msg.addEventListener("click", (e) => { const b = e.target.closest("[data-a]"); if (!b) return; b.dataset.a === "again" ? K.replace(matchScreen, lvl) : b.dataset.a === "home" ? K.home() : togglePause(); });

    function humanDir(ti) {
      let sx = 0, sy = 0;
      if (ti === 0 || !human[1]) {
        if (keys.has("arrowleft")) sx -= 1; if (keys.has("arrowright")) sx += 1; if (keys.has("arrowup")) sy -= 1; if (keys.has("arrowdown")) sy += 1;
      }
      if (ti === 1 || !human[1]) {
        if (keys.has("a") || keys.has("q")) sx -= 1; if (keys.has("d")) sx += 1; if (keys.has("w") || keys.has("z")) sy -= 1; if (keys.has("s")) sy += 1;
      }
      if (!sx && !sy) [sx, sy] = padDir[ti];
      if (!sx && !sy && ti === 0) { sx = touch.dx; sy = touch.dy; }
      const m = Math.hypot(sx, sy); if (m > 1) { sx /= m; sy /= m; }
      return dirS2W(sx, sy);
    }

    // ---------------------------------------------------------------- الصوت
    const whistle = (n = 1) => { for (let i = 0; i < n; i++) { K.tone(2300, 0.22, "square", 0.04, i * 0.32); K.tone(2600, 0.22, "square", 0.03, i * 0.32 + 0.02); } };
    const kickSnd = (p = 1) => K.tone(140 + 60 * p, 0.09, "triangle", 0.22);
    function crowd() {
      const c = K.audioCtx(); if (!c) return;
      try {
        const n = c.sampleRate * 1.6, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / 4000) * (1 - i / n);
        const s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
        s.buffer = buf; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.6; gn.gain.value = 0.25;
        s.connect(f).connect(gn).connect(c.destination); s.start();
      } catch {}
    }

    // ---------------------------------------------------------------- اللعب
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function kick(p, dx, dy, speed) {
      const m = Math.hypot(dx, dy) || 1;
      ball.owner = null; ball.x = p.x + (dx / m) * (R_P + R_B + 2); ball.y = p.y + (dy / m) * (R_P + R_B + 2);
      ball.vx = (dx / m) * speed; ball.vy = (dy / m) * speed; ball.gkTried = false; ball.lastTeam = p.ti;
      p.noPick = 0.35; p.hold = 0;
      ball.vz = speed > 600 ? 170 : 70;
      kickSnd(speed / 700);
      if (ULTRA) burst(ball.x, ball.y, speed > 600 ? 9 : 5, "grass");
    }
    function shoot(p, err = 0) {
      const gx = atkX(p.ti), toward = (gx - p.x) * p.fx > 0;
      let dx = p.fx, dy = p.fy;
      if (toward || Math.abs(gx - p.x) < 380) { // مساعدة على التصويب نحو المرمى
        const opGk = P[1 - p.ti][0];
        let ty = p.y + (p.fy / (Math.abs(p.fx) + 0.25)) * Math.abs(gx - p.x) * 0.5;
        if (!p.fy) ty = opGk.y < FH / 2 ? MY1 - 28 : MY0 + 28;
        ty = clamp(ty, MY0 + 14, MY1 - 14) + (Math.random() * 2 - 1) * err * GH;
        dx = gx - p.x; dy = ty - p.y;
        const m = Math.hypot(dx, dy); dx = dx / m * 0.75 + p.fx * 0.25; dy = dy / m * 0.75 + p.fy * 0.25;
      }
      ball.passTo = null;
      kick(p, dx, dy, 760);
    }
    function pass(p) {
      const mates = P[p.ti].filter((q) => q !== p && !q.gk);
      if (!mates.length) return;
      const q = mates[0], lead = 0.35;
      kick(p, q.x + q.vx * lead - p.x, q.y + q.vy * lead - p.y, clamp(dist(p, q) * 1.6 + 220, 360, 640));
      ball.passTo = q;
      if (human[p.ti]) ctrl[p.ti] = q.k;
    }
    function giveTo(p) { ball.owner = p; p.immune = 0.7; ball.passTo = null; ball.lastTeam = p.ti; ball.gkTried = false; }

    function moveP(p, dx, dy, spd, dt) {
      const m = Math.hypot(dx, dy);
      let tvx = 0, tvy = 0;
      if (m > 0.05) { tvx = (dx / Math.max(1, m)) * spd; tvy = (dy / Math.max(1, m)) * spd; }
      const a = Math.min(1, dt * 9);
      p.vx += (tvx - p.vx) * a; p.vy += (tvy - p.vy) * a;
      if (m > 0.2) { const fm = Math.hypot(dx, dy); p.fx += (dx / fm - p.fx) * Math.min(1, dt * 14); p.fy += (dy / fm - p.fy) * Math.min(1, dt * 14); const n = Math.hypot(p.fx, p.fy) || 1; p.fx /= n; p.fy /= n; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.run += Math.hypot(p.vx, p.vy) * dt * 0.06;
      if (p.gk) { p.x = p.ti === 0 ? clamp(p.x, FW - 130, FW - 8) : clamp(p.x, 8, 130); p.y = clamp(p.y, MY0 - 50, MY1 + 50); }
      else { p.x = clamp(p.x, R_P, FW - R_P); p.y = clamp(p.y, R_P, FH - R_P); }
    }
    const goTo = (p, tx, ty, spd, dt) => { const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy); moveP(p, d > 6 ? dx / Math.max(d, 40) : 0, d > 6 ? dy / Math.max(d, 40) : 0, spd, dt); };

    function nearestOut(ti, pt) { let best = null, bd = 1e9; for (const p of P[ti]) if (!p.gk) { const d = dist(p, pt); if (d < bd) { bd = d; best = p; } } return best; }

    function updateGk(p, dt) {
      const sk = gkSkill[p.ti], gx = goalX(p.ti);
      if (ball.owner === p) {
        p.vx = p.vy = 0; p.fx = sgn(p.ti); p.fy = 0;
        p.hold += dt;
        if (p.hold > 0.9) {
          const q = nearestOut(p.ti, { x: FW / 2, y: FH / 2 });
          kick(p, q.x - p.x, q.y - p.y, 560); ball.passTo = q;
          if (human[p.ti]) ctrl[p.ti] = q.k;
        }
        return;
      }
      // يتبع الكرة على خط المرمى، ويخرج لالتقاطها إذا كانت بطيئة وقريبة
      const inBox = Math.abs(ball.x - gx) < 135 && ball.y > MY0 - 60 && ball.y < MY1 + 60;
      const bs = Math.hypot(ball.vx, ball.vy);
      let tx = gx + (p.ti === 0 ? -22 : 22), ty = FH / 2 + (ball.y - FH / 2) * 0.55;
      if (ball.vx * (gx - ball.x) > 0 && !ball.owner && bs > 200) { const t = Math.abs((gx - ball.x) / (ball.vx || 1)); ty = ball.y + ball.vy * t * (0.4 + sk * 0.5); }
      if (inBox && !ball.owner && bs < 260) { tx = ball.x; ty = ball.y; }
      ty = clamp(ty, MY0 + 6, MY1 - 6);
      goTo(p, tx, ty, 150 + sk * 120, dt);
    }

    function cpuThink(p, dt) {
      // لاعب الكمبيوتر النشط
      const ti = p.ti, gx = atkX(ti);
      if (ball.owner === p) {
        p.hold += dt;
        const opp = P[1 - ti].filter((q) => !q.gk).sort((a, b) => dist(a, p) - dist(b, p))[0];
        const dG = Math.hypot(gx - p.x, FH / 2 - p.y);
        if (p.think <= 0) { p.ty = clamp(FH / 2 + (Math.random() * 2 - 1) * 160, 80, FH - 80); p.think = 1.2; }
        p.think -= dt;
        let dx = gx - p.x, dy = p.ty - p.y;
        if (opp && dist(opp, p) < 90 && (opp.x - p.x) * sgn(ti) > 0) dy += (p.y > opp.y ? 1 : -1) * 160;
        const m = Math.hypot(dx, dy) || 1;
        moveP(p, dx / m, dy / m, 205 * L.spd * (p.stun > 0 ? 0.5 : 1), dt);
        if (dG < L.shootR && p.hold > 0.35) { if (Math.random() < dt * 3) shoot(p, L.err); }
        else if (opp && dist(opp, p) < 50 && p.hold > 0.5 && Math.random() < dt * 1.5) pass(p);
        return;
      }
      p.think -= dt;
      if (p.think <= 0) { p.think = L.react; p.tx = ball.x + ball.vx * 0.25; p.ty = ball.y + ball.vy * 0.25; }
      goTo(p, p.tx, p.ty, 225 * L.spd, dt);
    }

    function support(p, dt) {
      // لاعب بدون تحكم: يتقدم عند الهجوم ويتراجع عند الدفاع
      const ti = p.ti, own = ball.owner && ball.owner.ti === ti;
      const mate = P[ti].find((q) => q !== p && !q.gk);
      let tx, ty;
      if (ball.passTo === p) { tx = ball.x; ty = ball.y; }
      else if (own) { tx = ball.x + sgn(ti) * 180; ty = mate.y < FH / 2 ? FH * 0.72 : FH * 0.28; }
      else { const g = goalX(ti); tx = ball.x + (g - ball.x) * 0.45; ty = ball.y + (FH / 2 - ball.y) * 0.4 + (p.k === 1 ? -50 : 50); }
      tx = clamp(tx, 60, FW - 60);
      goTo(p, tx, ty, 190 * (human[ti] ? 1 : L.spd), dt);
    }

    function update(dt) {
      timeLeft -= dt;
      for (const p of ALL) { p.stun = Math.max(0, p.stun - dt); p.immune = Math.max(0, p.immune - dt); p.noPick = Math.max(0, p.noPick - dt); p.dash = Math.max(0, p.dash - dt); p.dashCd = Math.max(0, p.dashCd - dt); }
      for (let ti = 0; ti < 2; ti++) {
        // التحكم يتنقل تلقائياً إلى أقرب لاعب للكرة عند الدفاع
        if (human[ti] && !(ball.owner && ball.owner.ti === ti) && ball.passTo?.ti !== ti) {
          const c = P[ti][ctrl[ti]], o = P[ti][3 - ctrl[ti]];
          if (dist(o, ball) + 70 < dist(c, ball)) ctrl[ti] = o.k;
        }
        if (!human[ti]) ctrl[ti] = (ball.owner && ball.owner.ti === ti && !ball.owner.gk) ? ball.owner.k : ball.passTo?.ti === ti ? ball.passTo.k : nearestOut(ti, ball).k;
        P[ti].forEach((p) => {
          if (p.gk) return updateGk(p, dt);
          if (p.k !== ctrl[ti]) return support(p, dt);
          if (!human[ti]) return cpuThink(p, dt);
          const [dx, dy] = humanDir(ti), e = edge[ti];
          const own = ball.owner === p;
          let spd = (own ? 215 : 235) * (p.stun > 0 ? 0.5 : 1) * (p.dash > 0 ? 1.7 : 1);
          moveP(p, dx, dy, spd, dt);
          if (e.shoot) {
            if (own) shoot(p);
            else if (!ball.owner && dist(p, ball) < 40) { p.fx = ball.x - p.x; p.fy = ball.y - p.y; const m = Math.hypot(p.fx, p.fy) || 1; p.fx /= m; p.fy /= m; shoot(p); }
            else if (p.dashCd <= 0) { p.dash = 0.35; p.dashCd = 1; }
          }
          if (e.pass) {
            if (own) pass(p);
            else ctrl[ti] = 3 - ctrl[ti];
          }
        });
        edge[ti].shoot = edge[ti].pass = false;
      }
      // تصادم اللاعبين
      for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) {
        const a = ALL[i], b = ALL[j], d = dist(a, b);
        if (d > 0 && d < R_P * 2) { const o = (R_P * 2 - d) / 2, nx = (a.x - b.x) / d, ny = (a.y - b.y) / d; a.x += nx * o; a.y += ny * o; b.x -= nx * o; b.y -= ny * o; }
      }
      // المراوغة والاستخلاص
      const o = ball.owner;
      if (o) {
        if (!o.gk && o.immune <= 0) for (const q of P[1 - o.ti]) {
          if (q.gk || dist(q, o) > R_P * 2 + 8) continue;
          const isHuman = human[q.ti] && q.k === ctrl[q.ti];
          const rate = isHuman ? (q.dash > 0 ? 99 : 6) : human[q.ti] ? 1 : L.tackle;
          if (Math.random() < rate * dt) { giveTo(q); o.stun = 0.5; K.tone(330, 0.06, "triangle", 0.1); if (ULTRA) burst(o.x, o.y, 7, "dust"); break; }
        }
        const lead = R_P + R_B + 1;
        ball.x = o.x + o.fx * lead; ball.y = o.y + o.fy * lead; ball.vx = o.vx; ball.vy = o.vy;
        ball.rot += Math.hypot(o.vx, o.vy) * dt / 8; ball.z = 0; ball.vz = 0;
        ball.x = clamp(ball.x, R_B, FW - R_B); ball.y = clamp(ball.y, R_B, FH - R_B);
        if (o.gk) { ball.x = o.x + sgn(o.ti) * -(-R_P - 4); }
        return;
      }
      // الكرة الحرة
      const sub = 3;
      for (let s = 0; s < sub; s++) {
        const h = dt / sub;
        ball.x += ball.vx * h; ball.y += ball.vy * h;
        const inMouth = ball.y > MY0 + R_B && ball.y < MY1 - R_B;
        if (ball.inNet) { // داخل الشباك
          if (ball.x < -GD + R_B) { ball.x = -GD + R_B; ball.vx *= -0.2; }
          if (ball.x > FW + GD - R_B) { ball.x = FW + GD - R_B; ball.vx *= -0.2; }
          if (ball.y < MY0 + R_B) { ball.y = MY0 + R_B; ball.vy *= -0.3; }
          if (ball.y > MY1 - R_B) { ball.y = MY1 - R_B; ball.vy *= -0.3; }
        } else {
          if (ball.y < R_B) { ball.y = R_B; ball.vy = Math.abs(ball.vy) * 0.7; }
          if (ball.y > FH - R_B) { ball.y = FH - R_B; ball.vy = -Math.abs(ball.vy) * 0.7; }
          if (ball.x < R_B && !inMouth) { ball.x = R_B; ball.vx = Math.abs(ball.vx) * 0.7; }
          if (ball.x > FW - R_B && !inMouth) { ball.x = FW - R_B; ball.vx = -Math.abs(ball.vx) * 0.7; }
          if (ball.x < 0 && inMouth) { ball.inNet = true; goal(0); }
          else if (ball.x > FW && inMouth) { ball.inNet = true; goal(1); }
        }
      }
      const f = Math.exp(-1.15 * dt); ball.vx *= f; ball.vy *= f;
      ball.vz -= 900 * dt; ball.z += ball.vz * dt;
      if (ball.z < 0) { ball.z = 0; ball.vz = ball.vz < -60 ? -ball.vz * 0.45 : 0; }
      const bs = Math.hypot(ball.vx, ball.vy);
      ball.rot += bs * dt / 8;
      if (bs < 120 && ball.passTo && dist(ball.passTo, ball) > 200) ball.passTo = null;
      if (state !== "play") return;
      // الحارس يلتقط أو يصدّ
      for (let ti = 0; ti < 2; ti++) {
        const gk = P[ti][0];
        if (dist(gk, ball) < R_P + R_B + 10 && gk.noPick <= 0) {
          if (bs < 330) { giveTo(gk); gk.hold = 0; K.tone(500, 0.06, "sine", 0.1); return; }
          if (!ball.gkTried) {
            ball.gkTried = true;
            if (Math.random() < gkSkill[ti]) {
              if (Math.random() < 0.5) { giveTo(gk); gk.hold = 0; K.tone(500, 0.06, "sine", 0.1); return; }
              ball.vx = -ball.vx * 0.45; ball.vy = (ball.y < gk.y ? -1 : 1) * (180 + Math.random() * 160); gk.noPick = 0.4; kickSnd(0.5); return;
            }
          }
        }
      }
      // لاعب يستلم الكرة
      for (const p of ALL) {
        if (p.gk || p.noPick > 0) continue;
        if (dist(p, ball) < R_P + R_B + 4 && (bs < 560 || ball.passTo === p || ball.lastTeam !== p.ti)) {
          if (bs >= 560 && ball.lastTeam !== p.ti && Math.random() < 0.5) { ball.vx *= 0.4; ball.vy *= 0.4; p.noPick = 0.2; continue; }
          giveTo(p); p.immune = 0.4; p.hold = 0; p.think = 0;
          if (human[p.ti]) ctrl[p.ti] = p.k;
          return;
        }
      }
    }

    function goal(ti) {
      if (state !== "play") return;
      score[ti]++; state = "goal"; stateT = 0;
      scorer = ti;
      const t = T[ti];
      whistle(1); crowd(); K.sfx.win();
      K.confetti(40, (t.flag || "⚽") + "⚽🎉⭐✨");
      const who = cpu && ti === 1 ? "🤖 الكمبيوتر" : tname(t);
      msg.innerHTML = `<div class="goal" style="--c:${t.c};--d:${t.d}">⚽ هدف!<small>${t.flag ? `<span class="emo">${t.flag}</span> ` : ""}${who}</small></div>`;
      kickTeam = 1 - ti;
      shake = ULTRA ? 0.7 : 0; netHit = { t: 0, gx: ti === 0 ? 0 : FW, y: ball.y };
    }

    function over() {
      state = "over"; whistle(3);
      const w = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
      if (cpu) { if (w === 0) { save.cpuWins[lvl]++; } } else save.wins[w === 0 ? "a" : w === 1 ? "b" : "d"]++;
      save.save();
      const wt = w >= 0 ? T[w] : null;
      let head;
      if (w < 0) head = "🤝 تعادل!";
      else if (cpu && w === 1) head = "🤖 فاز الكمبيوتر — حاول مرة أخرى 💪";
      else head = `🏆 فاز ${cpu ? "فريقك" : tname(wt)}!`;
      const side = (i) => `<div class="sc" style="--c:${T[i].c};--d:${T[i].d};--t:${T[i].t}"><span class="kit"><span class="emo">${T[i].flag || "⚽"}</span></span><b>${cpu && i === 1 ? "🤖 الكمبيوتر" : tname(T[i])}</b></div>`;
      msg.innerHTML = `<div class="box end"><div class="h">${head}</div>
        <div class="board">${side(0)}<div class="num">${score[0]} - ${score[1]}</div>${side(1)}</div>
        <div class="earned" hidden></div>
        <div class="row"><button class="btn sel" data-a="again">🔁 مباراة جديدة</button><button class="btn" data-a="home">🏠 القائمة</button></div>
        <small>✕ أو Enter: مباراة جديدة · ○ أو Backspace: القائمة</small></div>`;
      if (w >= 0) K.confetti(60, (wt.flag || "⚽") + "🏆🎉⭐");
      const amt = cpu ? (w === 0 ? L.stars : w < 0 ? 1 : 1) : 1;
      earn(amt, cpu ? `مباراة ضد الكمبيوتر (${L.n}) ${score[0]}-${score[1]}` : `مباراة لشخصين ${score[0]}-${score[1]}`, msg.querySelector(".earned"));
      let sel = 0;
      const bs = msg.querySelectorAll(".row .btn");
      const pick = (i) => { sel = i; bs.forEach((b, j) => b.classList.toggle("sel", j === i)); };
      const go = () => (sel === 0 ? K.replace(matchScreen, lvl) : K.home());
      K.mode.key = (e) => {
        const k = e.key;
        if (k === "ArrowLeft" || k === "ArrowRight") { pick(1 - sel); K.sfx.tick(); }
        else if (k === "Enter" || k === " ") go();
        else if (k === "Backspace") K.home();
        return true;
      };
      const poll0 = K.mode.poll, st = { a: true, b: true, l: true };
      K.mode.poll = (pads) => {
        for (const pd of pads) {
          const b = (n) => !!(pd.buttons[n] && pd.buttons[n].pressed), ax = pd.axes[0] || 0;
          const lr = b(14) || b(15) || Math.abs(ax) > 0.6;
          if (b(0) && !st.a) go(); else if (b(1) && !st.b) K.home(); else if (lr && !st.l) pick(1 - sel);
          st.a = b(0); st.b = b(1); st.l = lr;
          break;
        }
        return true;
      };
      void poll0;
    }

    // ---------------------------------------------------------------- الرسم
    // «الترا»: ملعب مع جمهور وأضواء، عشب مقصوص، ظلال من الأضواء الأربعة، كرة تطير بظل، شباك تهتز، جزيئات، واهتزاز الشاشة عند الهدف
    const EMO = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    function poly(pts) { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P2S(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); }
    function line(pts) { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P2S(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); }
    function rectW(x0, y0, x1, y1) { poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); }
    function circW(x, y, r) { const [a, b] = P2S(x, y); g.beginPath(); g.arc(a, b, r * S, 0, Math.PI * 2); }
    function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const mix = (h, to, k) => { const a = hex(h), b = hex(to); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`; };
    const T2 = T.map((t) => ({ hi: mix(t.c, "#ffffff", 0.45), lo: mix(t.c, "#000000", 0.35) }));
    let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const SKIN = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac", "#a0662f"], HAIR = ["#1f1308", "#3b2314", "#6b4423", "#111", "#8a5a2b", "#2b1a0e"];
    const look = ALL.map((p, i) => ({ skin: SKIN[(i * 5 + 2) % SKIN.length], hair: HAIR[(i * 7 + 1) % HAIR.length], num: p.gk ? "1" : p.k === 1 ? "7" : "10" }));

    // خلفية ثابتة تُرسم مرة واحدة (نسختان للجمهور: جالس / يقفز)
    let bg = [], vig = null;
    function grassAndLines() {
      if (ULTRA) {
        rectW(-26, -26, FW + 26, FH + 26); g.fillStyle = "#3a9446"; g.fill();
        for (let i = 0; i < 12; i++) { rectW((FW / 12) * i, -26, (FW / 12) * (i + 1), FH + 26); g.fillStyle = i % 2 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.05)"; g.fill(); }
        for (let j = 0; j < 8; j++) if (j % 2) { rectW(-26, (FH / 8) * j, FW + 26, (FH / 8) * (j + 1)); g.fillStyle = "rgba(255,255,255,.035)"; g.fill(); }
        // ملمس العشب
        const [ax, ay] = P2S(-26, -26), [bx, by] = P2S(FW + 26, FH + 26);
        const x0 = Math.min(ax, bx), y0 = Math.min(ay, by), w = Math.abs(bx - ax), h = Math.abs(by - ay);
        seed = 7;
        for (let i = 0; i < (w * h) / 60; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(0,40,0,.10)" : "rgba(200,255,180,.07)"; g.fillRect(x0 + rnd() * w, y0 + rnd() * h, 1.4, 2.4); }
        // إضاءة: وسط مضيء وأطراف أغمق
        const [cx, cy] = P2S(FW / 2, FH / 2), R = Math.max(w, h) * 0.7;
        const gr = g.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
        gr.addColorStop(0, "rgba(255,255,220,.10)"); gr.addColorStop(1, "rgba(0,20,0,.32)");
        g.fillStyle = gr; g.fillRect(x0, y0, w, h);
      } else {
        for (let i = 0; i < 10; i++) { rectW((FW / 10) * i, 0, (FW / 10) * (i + 1), FH); g.fillStyle = i % 2 ? "#3fa34d" : "#4cb85a"; g.fill(); }
      }
      g.save();
      g.strokeStyle = "rgba(255,255,255,.92)"; g.lineWidth = Math.max(2, 3 * S); g.lineJoin = "round"; g.lineCap = "round";
      if (ULTRA) { g.shadowColor = "rgba(255,255,255,.45)"; g.shadowBlur = 4; }
      rectW(0, 0, FW, FH); g.stroke();
      line([[FW / 2, 0], [FW / 2, FH]]); g.stroke();
      circW(FW / 2, FH / 2, 80); g.stroke();
      circW(FW / 2, FH / 2, 4); g.fillStyle = "#fff"; g.fill();
      for (const gx of [0, FW]) {
        const s = gx ? -1 : 1;
        rectW(gx, FH / 2 - 160, gx + s * 150, FH / 2 + 160); g.stroke();
        rectW(gx, FH / 2 - 85, gx + s * 55, FH / 2 + 85); g.stroke();
        circW(gx + s * 105, FH / 2, 3.5); g.fill();
        // قوس منطقة الجزاء
        const arc = []; for (let a = -0.93; a <= 0.93; a += 0.05) arc.push([gx + s * (105 + Math.cos(a) * 75), FH / 2 + Math.sin(a) * 75]);
        line(arc.filter(([x]) => (x - gx) * s >= 150)); g.stroke();
      }
      for (const [x, y, a0] of [[0, 0, 0], [FW, 0, Math.PI / 2], [FW, FH, Math.PI], [0, FH, -Math.PI / 2]]) {
        const pts = []; for (let a = 0; a <= Math.PI / 2 + 0.01; a += 0.1) pts.push([x + Math.cos(a0 + a) * 14, y + Math.sin(a0 + a) * 14]);
        line(pts); g.stroke();
      }
      g.restore();
      if (!ULTRA) for (const gx of [0, FW]) drawNet(gx, 0);
    }
    function stands(jump) {
      g.fillStyle = "#1a1530"; g.fillRect(0, 0, W, H);
      const [ax, ay] = P2S(-GD - 34, -34), [bx, by] = P2S(FW + GD + 34, FH + 34);
      const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
      const cs = Math.max(7, 12 * S), pal = ["#f8fafc", "#facc15", "#94a3b8", "#fb7185", "#a78bfa", "#34d399", "#f97316"];
      seed = 99;
      for (let y = cs * 0.6; y < H + cs; y += cs * 0.95) for (let x = (Math.floor(y / cs) % 2) * cs * 0.5; x < W + cs; x += cs) {
        const r1 = rnd(), r2 = rnd(), r3 = rnd();
        if (x > x0 - cs * 0.6 && x < x1 + cs * 0.6 && y > y0 - cs * 0.6 && y < y1 + cs * 0.6) continue;
        if (r3 < 0.08) continue; // مقعد فارغ
        const side0 = ROT ? y > OY : x > OX, tc0 = T[side0 ? 0 : 1];
        const col = r1 < 0.6 ? tc0.c : pal[(r2 * pal.length) | 0];
        const up = jump && r2 < 0.6 ? cs * 0.3 : 0;
        g.fillStyle = col; g.beginPath(); g.arc(x, y + cs * 0.18 - up, cs * 0.42, 0, Math.PI * 2); g.fill();
        g.fillStyle = SKIN[(r1 * 97 | 0) % SKIN.length]; g.beginPath(); g.arc(x, y - cs * 0.22 - up, cs * 0.22, 0, Math.PI * 2); g.fill();
        if (jump && r2 < 0.15) { g.fillStyle = col; g.fillRect(x - cs * 0.5, y - cs * 0.9 - up, cs * 0.12, cs * 0.5); }
      }
      // ظلام خفيف بعيداً عن الملعب
      const gr = g.createRadialGradient(OX, OY, Math.max(x1 - x0, y1 - y0) * 0.45, OX, OY, Math.max(W, H) * 0.8);
      gr.addColorStop(0, "rgba(10,8,25,0)"); gr.addColorStop(1, "rgba(10,8,25,.55)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // المضمار حول الملعب ولوحات ملونة
      rectW(-GD - 34, -34, FW + GD + 34, FH + 34); g.fillStyle = "#256b34"; g.fill();
      const BC = ["#2563eb", "#f59e0b", "#dc2626", "#10b981", "#7c3aed", "#ec4899"];
      g.lineWidth = Math.max(4, 9 * S); g.lineCap = "butt";
      const edges = [[[-GD - 34, -34], [FW + GD + 34, -34]], [[FW + GD + 34, -34], [FW + GD + 34, FH + 34]], [[FW + GD + 34, FH + 34], [-GD - 34, FH + 34]], [[-GD - 34, FH + 34], [-GD - 34, -34]]];
      let bi = 0;
      for (const [[ax2, ay2], [bx2, by2]] of edges) {
        const len = Math.hypot(bx2 - ax2, by2 - ay2), n = Math.max(1, Math.round(len / 110));
        for (let i = 0; i < n; i++) {
          const p0 = [ax2 + ((bx2 - ax2) * i) / n, ay2 + ((by2 - ay2) * i) / n], p1 = [ax2 + ((bx2 - ax2) * (i + 1)) / n, ay2 + ((by2 - ay2) * (i + 1)) / n];
          g.strokeStyle = BC[bi++ % BC.length]; line([p0, p1]); g.stroke();
          const [mx, my] = P2S((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
          g.fillStyle = "#fff"; g.beginPath(); g.arc(mx, my, Math.max(2, 3 * S), 0, Math.PI * 2); g.fill();
        }
      }
    }
    function lights() {
      g.save(); g.globalCompositeOperation = "lighter";
      for (const [x, y] of [[-GD - 30, -30], [FW + GD + 30, -30], [-GD - 30, FH + 30], [FW + GD + 30, FH + 30]]) {
        const [a, b] = P2S(x, y), R = 330 * S, gr = g.createRadialGradient(a, b, 0, a, b, R);
        gr.addColorStop(0, "rgba(255,250,220,.22)"); gr.addColorStop(1, "rgba(255,250,220,0)");
        g.fillStyle = gr; g.fillRect(a - R, b - R, R * 2, R * 2);
        g.fillStyle = "rgba(255,255,240,.9)"; g.beginPath(); g.arc(a, b, Math.max(3, 6 * S), 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    function buildBg() {
      bg = [];
      const n = ULTRA ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const c = document.createElement("canvas"); c.width = W * DPR; c.height = H * DPR;
        g = c.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0);
        if (ULTRA) { stands(k === 1); grassAndLines(); lights(); }
        else { g.fillStyle = "#14532d"; g.fillRect(0, 0, W, H); rectW(-GD - 40, -40, FW + GD + 40, FH + 40); g.fillStyle = "#166534"; g.fill(); grassAndLines(); }
        bg.push(c);
      }
      vig = null;
      if (ULTRA) {
        vig = document.createElement("canvas"); vig.width = W * DPR; vig.height = H * DPR;
        g = vig.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0);
        const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62);
        gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.35)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      g = g0;
    }

    // المرمى والشباك (تهتز الشباك عند الهدف)
    let netHit = null, shake = 0;
    function drawNet(gx, now) {
      const s = gx ? -1 : 1;
      let A = 0, hy = FH / 2;
      if (netHit && netHit.gx === gx) { A = 16 * Math.exp(-netHit.t * 2.2) * Math.abs(Math.cos(netHit.t * 9)); hy = netHit.y; }
      const bulge = (y) => A * Math.exp(-(((y - hy) / 45) ** 2));
      const back = (y) => gx - s * (GD + bulge(y));
      rectW(gx, MY0, gx - s * GD, MY1); g.fillStyle = "rgba(255,255,255,.13)"; g.fill();
      g.save(); g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = Math.max(1, S * 0.9);
      for (let y = MY0; y <= MY1 + 0.1; y += 12) { line([[gx, y], [back(y), y]]); g.stroke(); }
      for (let f = 0; f <= 1.001; f += 0.25) { const pts = []; for (let y = MY0; y <= MY1 + 0.1; y += 8) pts.push([gx - s * (GD * f + bulge(y) * f), y]); line(pts); g.stroke(); }
      g.restore();
      // الإطار والقائمتان
      g.save(); g.lineCap = "round";
      if (ULTRA) { g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = Math.max(3, 7 * S); g.translate(3, 4); line([[gx, MY0], [gx, MY1]]); g.stroke(); g.translate(-3, -4); }
      g.strokeStyle = "#cbd5e1"; g.lineWidth = Math.max(2, 3 * S);
      line([[gx, MY0], [back(MY0), MY0]]); g.stroke(); line([[gx, MY1], [back(MY1), MY1]]); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = Math.max(3, 7 * S);
      line([[gx, MY0], [gx, MY1]]); g.stroke();
      for (const y of [MY0, MY1]) { circW(gx, y, 5); g.fillStyle = "#fff"; g.fill(); g.strokeStyle = "#94a3b8"; g.lineWidth = 1.5; g.stroke(); }
      g.restore();
    }

    // جزيئات: عشب عند الركل، غبار عند الاستخلاص، ألعاب نارية عند الهدف
    const parts = [];
    function burst(x, y, n, kind) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = (kind === "dust" ? 40 : 90) * (0.4 + Math.random());
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: kind === "dust" ? 0.6 : 0.45, max: kind === "dust" ? 0.6 : 0.45, kind, sz: kind === "dust" ? 6 : 2.4 });
      }
    }
    function fireworks() {
      const sx = W * (0.1 + Math.random() * 0.8), sy = HUD + (H - HUD) * (0.08 + Math.random() * 0.25), col = K.pick([T[scorer ?? 0].c, "#fde047", "#fff", T2[scorer ?? 0].hi]);
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, v = 120 + Math.random() * 60; parts.push({ sx, sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1, max: 1.1, kind: "fw", col, sz: 3 }); }
      K.tone(180 + Math.random() * 80, 0.25, "sawtooth", 0.03);
    }
    function drawParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i]; q.life -= dt;
        if (q.life <= 0) { parts.splice(i, 1); continue; }
        const k = q.life / q.max;
        if (q.kind === "fw") {
          q.sx += q.vx * dt; q.sy += q.vy * dt; q.vy += 90 * dt; q.vx *= 0.98; q.vy *= 0.98;
          g.globalAlpha = k; g.fillStyle = q.col; g.beginPath(); g.arc(q.sx, q.sy, q.sz * (0.6 + k), 0, Math.PI * 2); g.fill();
        } else {
          q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92;
          const [a, b] = P2S(q.x, q.y);
          g.globalAlpha = q.kind === "dust" ? k * 0.45 : k;
          g.fillStyle = q.kind === "dust" ? "#e7dcc0" : "#2f7d32";
          g.beginPath(); g.arc(a, b, (q.kind === "dust" ? q.sz * (1.6 - k) : q.sz) * S, 0, Math.PI * 2); g.fill();
        }
      }
      g.globalAlpha = 1;
    }

    function drawPlayer(p, now) {
      const t = T[p.ti], t2 = T2[p.ti], lk = look[ALL.indexOf(p)], [sx, sy] = P2S(p.x, p.y), r = R_P * S;
      const [fx, fy] = ROT ? [-p.fy, p.fx] : [p.fx, p.fy], ang = Math.atan2(fy, fx);
      const jump = state === "goal" && p.ti === scorer ? Math.abs(Math.sin(now / 130 + p.k)) * r * 0.9 : 0;
      const isCtrl = human[p.ti] && p.k === ctrl[p.ti] && !p.gk;
      // ظلال (ضوءان في الترا)
      g.fillStyle = ULTRA ? "rgba(0,0,0,.17)" : "rgba(0,0,0,.25)";
      g.beginPath(); g.ellipse(sx + 4, sy + 5, r * 1.05, r * 0.8, 0.5, 0, Math.PI * 2); g.fill();
      if (ULTRA) { g.beginPath(); g.ellipse(sx - 4, sy + 5, r * 1.05, r * 0.8, -0.5, 0, Math.PI * 2); g.fill(); }
      const y = sy - jump;
      if (isCtrl) {
        const pulse = 1 + Math.sin(now / 180) * 0.08;
        g.strokeStyle = t.c === "#f8fafc" ? "#1e293b" : "#fff"; g.lineWidth = Math.max(2, 3 * S);
        g.beginPath(); g.ellipse(sx, sy + 3, r * 1.6 * pulse, r * 1.35 * pulse, 0, 0, Math.PI * 2); g.stroke();
        if (ULTRA) { g.strokeStyle = t.c; g.globalAlpha = 0.5; g.lineWidth = Math.max(3, 5 * S); g.beginPath(); g.ellipse(sx, sy + 3, r * 1.85 * pulse, r * 1.55 * pulse, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
      }
      const moving = Math.hypot(p.vx, p.vy) > 20, sp = moving ? Math.sin(p.run * 3) : 0;
      g.save(); g.translate(sx, y); g.rotate(ang);
      // القدمان (حذاء)
      g.fillStyle = "#111827";
      for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.65 * sp * sd, r * 0.42 * sd, r * 0.38, r * 0.22, 0, 0, Math.PI * 2); g.fill(); }
      // الذراعان
      g.fillStyle = p.gk ? "#a3e635" : lk.skin;
      for (const sd of [-1, 1]) { g.beginPath(); g.arc(-r * 0.45 * sp * sd + (p.gk ? r * 0.25 : 0), r * 1.0 * sd, r * 0.26, 0, Math.PI * 2); g.fill(); }
      // الجسم: كتفان عريضان بتظليل
      let fill = t.c;
      if (ULTRA) { const gr = g.createRadialGradient(r * 0.25, -r * 0.35, r * 0.1, 0, 0, r * 1.1); gr.addColorStop(0, t2.hi); gr.addColorStop(0.55, t.c); gr.addColorStop(1, t2.lo); fill = gr; }
      g.fillStyle = t.d; g.beginPath(); g.ellipse(0, 0, r * 0.8, r * 1.12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = fill; g.beginPath(); g.ellipse(0, 0, r * 0.68, r * 0.98, 0, 0, Math.PI * 2); g.fill();
      if (p.gk) {
        g.save(); g.beginPath(); g.ellipse(0, 0, r * 0.68, r * 0.98, 0, 0, Math.PI * 2); g.clip();
        g.fillStyle = "rgba(255,255,255,.5)"; for (let i = -3; i <= 3; i++) g.fillRect(i * r * 0.42 - r * 0.1, -r * 1.2, r * 0.2, r * 2.4);
        g.restore();
      }
      // الرقم على الظهر
      g.save(); g.rotate(Math.PI / 2); g.fillStyle = t.t; g.globalAlpha = 0.85; g.font = `800 ${Math.max(7, r * 0.62)}px Baloo, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(lk.num, 0, r * 0.52); g.restore();
      // الرأس
      g.fillStyle = lk.hair; g.beginPath(); g.arc(-r * 0.08, 0, r * 0.47, 0, Math.PI * 2); g.fill();
      g.fillStyle = lk.skin; g.beginPath(); g.arc(r * 0.14, 0, r * 0.33, 0, Math.PI * 2); g.fill();
      if (ULTRA) { g.fillStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.arc(-r * 0.05, -r * 0.18, r * 0.16, 0, Math.PI * 2); g.fill(); }
      g.restore();
      if (isCtrl) {
        const ay = sy - r * 2.2 - jump - (ULTRA ? Math.abs(Math.sin(now / 250)) * r * 0.3 : 0);
        g.fillStyle = t.c; g.strokeStyle = "#fff"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(sx, ay + r * 0.6); g.lineTo(sx - r * 0.55, ay - r * 0.2); g.lineTo(sx + r * 0.55, ay - r * 0.2); g.closePath(); g.fill(); g.stroke();
        if (human[1]) { g.fillStyle = "#fff"; g.font = `800 ${Math.max(12, r * 0.95)}px Baloo, sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom"; g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 3;
          const lb = p.ti === 0 ? "١" : "٢"; g.strokeText(lb, sx, ay - r * 0.2); g.fillText(lb, sx, ay - r * 0.2); }
      }
    }

    function drawBall() {
      const [bx, by0] = P2S(ball.x, ball.y), z = ball.z * S, r = Math.max(4, R_B * S) * (1 + ball.z / 90), by = by0 - z;
      // أثر الكرة السريعة
      if (ULTRA) {
        const sp = Math.hypot(ball.vx, ball.vy);
        if (!ball.owner && sp > 380) ball.trail.push([ball.x, ball.y, ball.z]); else if (ball.trail.length) ball.trail.shift();
        if (ball.trail.length > 9) ball.trail.shift();
        ball.trail.forEach(([x, y, zz], i) => { const [a, b] = P2S(x, y); g.fillStyle = `rgba(255,255,255,${(0.28 * (i + 1)) / ball.trail.length})`; g.beginPath(); g.arc(a, b - zz * S, r * (0.45 + (0.5 * i) / ball.trail.length), 0, Math.PI * 2); g.fill(); });
      }
      g.fillStyle = `rgba(0,0,0,${0.3 - Math.min(0.15, ball.z / 200)})`; g.beginPath(); g.ellipse(bx + 2 + z * 0.4, by0 + 3 + z * 0.15, R_B * S, R_B * S * 0.75, 0, 0, Math.PI * 2); g.fill();
      if (ULTRA) { const gr = g.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.1, bx, by, r); gr.addColorStop(0, "#fff"); gr.addColorStop(0.7, "#eef2f7"); gr.addColorStop(1, "#9aa5b4"); g.fillStyle = gr; }
      else g.fillStyle = "#fff";
      g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.clip();
      g.fillStyle = "#1f2937";
      for (let i = 0; i < 5; i++) { const a = ball.rot + (i * Math.PI * 2) / 5; g.beginPath(); g.arc(bx + Math.cos(a) * r * 0.85, by + Math.sin(a) * r * 0.85, r * 0.3, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.arc(bx + Math.cos(ball.rot * 0.7) * r * 0.1, by + Math.sin(ball.rot * 0.7) * r * 0.1, r * 0.32, 0, Math.PI * 2); g.fill();
      g.restore();
      if (ULTRA) { g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.ellipse(bx - r * 0.35, by - r * 0.4, r * 0.28, r * 0.17, -0.6, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.stroke();
    }

    function drawHud() {
      const h = HUD, pad = 10, mid = W / 2;
      if (ULTRA) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(30,41,59,.95)"); gr.addColorStop(1, "rgba(2,6,23,.9)"); g.fillStyle = gr; }
      else g.fillStyle = "rgba(15,23,42,.82)";
      g.fillRect(0, 0, W, h);
      const fs = h * 0.42;
      const box = (i, x0, x1) => {
        const t = T[i];
        if (ULTRA) { const gr = g.createLinearGradient(0, pad, 0, h - pad); gr.addColorStop(0, T2[i].hi); gr.addColorStop(0.5, t.c); gr.addColorStop(1, T2[i].lo); g.fillStyle = gr; }
        else g.fillStyle = t.c;
        rr(x0, pad, x1 - x0, h - pad * 2, (h - pad * 2) / 2); g.fill();
        g.fillStyle = t.t; g.font = `800 ${fs * 0.8}px Baloo, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
        const nm = cpu && i === 1 ? "🤖 الكمبيوتر" : tname(t);
        g.fillText(nm, (x0 + x1) / 2 + (t.flag ? fs * 0.5 : 0), h / 2 + 2, x1 - x0 - fs * 1.6);
        if (t.flag) { g.font = `${fs}px ${EMO}`; g.fillText(t.flag, i === 0 ? x1 - fs * 0.9 : x0 + fs * 0.9, h / 2 + 1); }
      };
      const sw = Math.min(W * 0.3, 360), cw = Math.min(W * 0.34, 260);
      box(0, mid + cw / 2 + 6, Math.min(W - pad, mid + cw / 2 + 6 + sw));
      box(1, Math.max(pad, mid - cw / 2 - 6 - sw), mid - cw / 2 - 6);
      g.fillStyle = "#fff"; rr(mid - cw / 2, pad * 0.6, cw, h - pad * 1.2, 12); g.fill();
      g.fillStyle = "#0f172a"; g.font = `800 ${fs * 1.15}px Baloo, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.save(); g.direction = "ltr";
      g.fillText(`${score[1]}  -  ${score[0]}`, mid - cw * 0.12, h / 2 + 2);
      const tl = Math.max(0, Math.ceil(timeLeft)), mm = (tl / 60) | 0, ss = String(tl % 60).padStart(2, "0");
      g.fillStyle = tl <= 10 && state === "play" ? "#dc2626" : "#475569"; g.font = `800 ${fs * 0.8}px Baloo, sans-serif`;
      g.fillText(`${mm}:${ss}`, mid + cw * 0.3, h / 2 + 2);
      g.restore();
    }

    function frame(now) {
      const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
      if (!paused) {
        stateT += dt;
        if (state === "kick") {
          if (stateT > 1.1) { state = "play"; msg.innerHTML = ""; whistle(1); giveTo(P[kickTeam][1]); P[kickTeam][1].immune = 1; }
        } else if (state === "play") { update(dt); if (timeLeft <= 0 && state === "play") { timeLeft = 0; over(); } }
        else if (state === "goal") {
          update(dt * 0.4);
          if (ULTRA && stateT < 2.4 && Math.random() < dt * 5) fireworks();
          if (stateT > 2.8) { if (timeLeft <= 0) over(); else { msg.innerHTML = ""; netHit = null; startKick(); } }
        }
        if (netHit) netHit.t += dt;
        shake = Math.max(0, shake - dt);
      }
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const crowdUp = ULTRA && (state === "goal" || (state === "over" && score[0] !== score[1])) && Math.floor(now / 180) % 2;
      g.drawImage(bg[crowdUp ? 1 : 0] || bg[0], 0, 0, W, H);
      if (shake > 0) g.translate((Math.random() - 0.5) * shake * 14, (Math.random() - 0.5) * shake * 14);
      if (ULTRA) for (const gx of [0, FW]) drawNet(gx, now);
      const order = ALL.slice().sort((a, b) => P2S(a.x, a.y)[1] - P2S(b.x, b.y)[1]);
      let ballDrawn = false; const [, bsy] = P2S(ball.x, ball.y);
      for (const p of order) { if (!ballDrawn && P2S(p.x, p.y)[1] > bsy) { drawBall(); ballDrawn = true; } drawPlayer(p, now); }
      if (!ballDrawn) drawBall();
      if (ULTRA) drawParts(paused ? 0 : dt);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (vig) g.drawImage(vig, 0, 0, W, H);
      drawHud();
      raf = requestAnimationFrame(frame);
    }
    function startKick() {
      placeAll(kickTeam); state = "kick"; stateT = 0;
      msg.innerHTML = `<div class="ready">استعد! ⚽</div>`;
    }

    fit(); addEventListener("resize", fit);
    kickTeam = Math.random() < 0.5 ? 0 : 1;
    startKick();
    window.__fb = { P, ball, score, get state() { return state; }, set time(v) { timeLeft = v; }, goal };
    raf = requestAnimationFrame(frame);
  }

  K.start(homeScreen);
})();
