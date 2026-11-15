// الدبابات — دبابتان كرتونيتان على تلال متعرّجة ترمي إحداهما الأخرى بالقذائف
// الأزرق: يد التحكم ١ أو الأسهم + Enter (اضغط مطوّلاً للرمي) + Shift الأيمن للتبديل
// البرتقالي: يد التحكم ٢ أو W A S D + المسافة (اضغط مطوّلاً) + Q للتبديل
// أوضاع: ضد الكمبيوتر (سهل، متوسط، صعب) أو لاعبان. المباراة من أفضل ٣ جولات.
(() => {
  "use strict";
  const GAME = "الدبابات";
  const save = K.store("tanks", { wins: [0, 0], cpu: { easy: 0, mid: 0, hard: 0 } });
  const PL = [
    { name: "الأزرق", color: "#3b82f6", dark: "#1d4ed8", light: "#bfdbfe", emo: "🔵" },
    { name: "البرتقالي", color: "#f97316", dark: "#c2410c", light: "#fed7aa", emo: "🟠" },
  ];
  const LV = {
    easy: { name: "سهل", emo: "🐣", err: 0.16, angJit: 0.25, wait: [3.2, 4.8], homing: 0.25, crate: 0.35, dodge: 0 },
    mid: { name: "متوسط", emo: "🦊", err: 0.07, angJit: 0.2, wait: [2.2, 3.4], homing: 0.5, crate: 0.6, dodge: 0.3 },
    hard: { name: "صعب", emo: "🦁", err: 0.025, angJit: 0.15, wait: [1.4, 2.4], homing: 0.8, crate: 0.85, dodge: 0.7 },
  };
  // ألوان كل جولة: سماء أعلى، سماء أسفل، تلال بعيدة، عشب، تراب، نقاط التراب
  const THEMES = [
    ["#7dd3fc", "#e0f2fe", "#bbf7d0", "#65a30d", "#a16207", "#854d0e"],
    ["#fdba74", "#fef3c7", "#fde68a", "#eab308", "#d97706", "#b45309"],
    ["#a5b4fc", "#eef2ff", "#e0e7ff", "#f8fafc", "#94a3b8", "#64748b"],
    ["#f9a8d4", "#fdf2f8", "#fbcfe8", "#ec4899", "#a855f7", "#7e22ce"],
    ["#67e8f9", "#ecfeff", "#a7f3d0", "#16a34a", "#78716c", "#57534e"],
  ];
  const W = 1280, G = 420, TANKR = 36, MAXHP = 100;
  const WEAP = [{ name: "قذيفة", dmg: 20, r: 70 }, { name: "موجّهة", dmg: 30, r: 80 }];
  const CRATES = ["ammo", "homing", "med"];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------------------------------------------------------------- القائمة
  function homeScreen() {
    K.begin();
    const pads = K.pads().length;
    K.paint(`
      <div class="title"><canvas class="hero" width="360" height="180"></canvas><div><h1>${GAME}</h1><div class="sub">صوّب على الدبابة الأخرى واجمع الصناديق! 💥</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#3b82f6,#64748b)" ${K.act("cpu", () => K.show(levelScreen))}>
          <span class="big emo">🤖</span><b>ضد الكمبيوتر</b><small>لاعب واحد · ٣ مستويات</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#3b82f6,#f97316)" ${K.act("two", () => K.show(playScreen, "two", null))}>
          <span class="big emo">👫</span><b>لاعبان</b><small>كل لاعب بيده</small></button>
      </div>
      <div class="mini">
        <span class="pill">🔵 ${save.wins[0]} : ${save.wins[1]} 🟠</span>
        <span class="pill">🎮 ${pads ? `${pads} يد تحكم متصلة` : "لا توجد يد تحكم"}</span>
      </div>
      <div class="help">🔵 الأسهم + <b>Enter</b> مطوّلاً للرمي + <b>Shift</b> للتبديل · 🟠 <b>W A S D</b> + <b>المسافة</b> + <b>Q</b> · 🎮 ✕ مطوّلاً للرمي، □ للتبديل · <b>Backspace</b> أو <b>○</b> للرجوع</div>`, "cpu");
    const c = K.app.querySelector(".hero"), x = c.getContext("2d");
    let raf = 0;
    const loop = (t) => {
      x.clearRect(0, 0, 360, 180);
      x.fillStyle = "#65a30d"; x.beginPath(); x.moveTo(0, 180);
      for (let i = 0; i <= 360; i += 6) x.lineTo(i, 150 - Math.sin(i / 57) * 14); x.lineTo(360, 180); x.fill();
      const a = 0.55 + Math.sin(t / 600) * 0.2;
      drawTank(x, 80, 150 - Math.sin(80 / 57) * 14, 0.17, a, 1, PL[0], { t, s: 0.9 });
      drawTank(x, 280, 150 - Math.sin(280 / 57) * 14, 0.13, 0.7 - Math.sin(t / 700) * 0.2, -1, PL[1], { t: t + 900, s: 0.9 });
      const k = (t / 1400) % 1, bx = 120 + k * 120, by = 90 - Math.sin(k * Math.PI) * 60;
      x.fillStyle = "#1e293b"; x.beginPath(); x.arc(bx, by, 6, 0, 7); x.fill();
      x.fillStyle = "rgba(255,255,255,.6)"; x.beginPath(); x.arc(bx - 2, by - 2, 2, 0, 7); x.fill();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    K.mode = { stop: () => cancelAnimationFrame(raf) };
  }

  function levelScreen() {
    K.begin();
    const card = (k, bg) => `<button class="mode f" style="background:${bg}" ${K.act(k, () => K.show(playScreen, "cpu", k))}>
      <span class="big emo">${LV[k].emo}</span><b>${LV[k].name}</b><small>فزت ${save.cpu[k]} مرة</small></button>`;
    K.paint(`
      <div class="top">${K.backBtn()}<h2>🤖 ضد الكمبيوتر: اختر المستوى</h2><span></span></div>
      <div class="modes">
        ${card("easy", "linear-gradient(135deg,#22c55e,#84cc16)")}
        ${card("mid", "linear-gradient(135deg,#f59e0b,#f97316)")}
        ${card("hard", "linear-gradient(135deg,#ef4444,#a855f7)")}
      </div>
      <div class="legend">📦 ذخيرة · 🚀 قذيفة موجّهة تتبع الدبابة الأخرى · ❤️ صندوق القوة · من يفوز بجولتين يربح المباراة</div>
      ${K.HELP}`, "easy");
  }

  // ---------------------------------------------------------------- اللعب
  function playScreen(mode, lvl) {
    K.begin();
    const CPU = mode === "cpu", L = CPU ? LV[lvl] : null;
    K.paint(`<canvas class="war"></canvas><div class="msg"></div>
      ${[0, 1].map((i) => `<div class="tpad p${i + 1}" style="--c:${PL[i].color}" data-p="${i}">
        <button data-c="l">◀</button><button data-c="r">▶</button><button data-c="u">▲</button><button data-c="d">▼</button><button data-c="s">🔄</button><button class="fire" data-c="f">💥</button></div>`).join("")}`);
    const cv = K.app.querySelector("canvas"), g = cv.getContext("2d"), msg = K.app.querySelector(".msg");
    const tpads = [...K.app.querySelectorAll(".tpad")];
    let H = 720, sc = 1, ox = 0, oy = 0, dpr = 1;
    const fit = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      sc = Math.min(innerWidth / W, innerHeight / H);
      ox = (innerWidth - W * sc) / 2; oy = innerHeight > innerWidth ? Math.max(0, (innerHeight - H * sc) * 0.15) : (innerHeight - H * sc) / 2;
    };
    const wins = [0, 0];
    let round = 0, TH, ground, far, rocks, clouds, tanks, shots, crates, fx, state, stT, crateT, winner, raf = 0, last = performance.now(), paused = false, now = 0, lastN = -1;

    // ------------------------------------------------ الأرض
    function makeGround() {
      H = clamp(Math.round((W * innerHeight) / innerWidth), 640, 1100);
      fit();
      const N = W / 8 + 1, h = new Float32Array(N), base = H - 230;
      const waves = [[rnd(60, 95), rnd(800, 1300)], [rnd(20, 40), rnd(380, 560)], [rnd(5, 10), rnd(160, 240)]].map(([a, l]) => [a, l, rnd(0, 7)]);
      for (let i = 0; i < N; i++) { let y = base; for (const [a, l, p] of waves) y += a * Math.sin((i * 8 * 2 * Math.PI) / l + p); h[i] = y; }
      // قطعة منبسطة لتنطلق فيها الدبابة بسرعة
      const fs = (rnd(0.3, 0.6) * N) | 0, fl = (rnd(20, 32)) | 0, fy = h[fs];
      for (let i = fs; i < Math.min(N, fs + fl); i++) h[i] = fy;
      for (let pass = 0; pass < 40; pass++) for (let i = 0; i < N - 1; i++) {
        const d = h[i + 1] - h[i], m = 8 * 0.7;
        if (Math.abs(d) > m) { const e = (Math.abs(d) - m) / 2 * Math.sign(d); h[i] += e; h[i + 1] -= e; }
      }
      for (let i = 0; i < N; i++) h[i] = clamp(h[i], H - 420, H - 90);
      ground = h;
      far = K.range(0, 41).map((i) => H - 330 - Math.sin(i / 3 + rnd(0, 0.3)) * 40 - Math.sin(i / 1.3) * 15);
      rocks = K.range(0, 70).map(() => [rnd(0, W), rnd(20, 300), rnd(3, 7)]);
      clouds = K.range(0, 5).map(() => [rnd(0, W), rnd(60, H * 0.35), rnd(0.7, 1.3), rnd(6, 16)]);
    }
    const gy = (x) => { const f = clamp(x, 0, W) / 8, i = Math.min(ground.length - 2, f | 0), k = f - i; return ground[i] * (1 - k) + ground[i + 1] * k; };

    // ------------------------------------------------ الجولة
    function startRound() {
      round++;
      TH = THEMES[(round - 1 + Math.floor(Math.random() * THEMES.length)) % THEMES.length];
      makeGround();
      tanks = [0, 1].map((i) => {
        const x = i ? W * 0.12 : W * 0.88;
        return { i, p: PL[i], x, v: 0, mom: 0, tilt: 0, ang: 0.7, face: i ? 1 : -1, hp: MAXHP, ammo: [8, 1], sel: 0, charge: 0, charging: false, cool: 0, ko: false, koT: 0,
          ctl: { m: 0, a: 0, f: false }, hit: 0, wheel: 0, regen: 0, ai: CPU && i === 1 ? { ph: "wait", t: 1.2, tx: x } : null };
      });
      tanks.forEach((t) => { t.tilt = slope(t.x); });
      shots = []; crates = []; fx = []; crateT = rnd(3, 5); winner = null;
      state = "count"; stT = 0; lastN = -1;
    }
    const slope = (x) => Math.atan2(gy(x + 22) - gy(x - 22), 44);
    const pivot = (t) => { const c = Math.cos(t.tilt), s = Math.sin(t.tilt), y = gy(t.x); return [t.x + 40 * s, y - 40 * c]; };
    const tip = (t) => { const [px, py] = pivot(t); return [px + Math.cos(t.ang) * t.face * 46, py - Math.sin(t.ang) * 46]; };
    const center = (t) => [t.x, gy(t.x) - 24];

    // ------------------------------------------------ التحكم
    const keys = new Set(), touch = [{}, {}], padPrev = [[], []];
    const P1K = { m: [["ArrowLeft", -1], ["ArrowRight", 1]], a: [["ArrowUp", 1], ["ArrowDown", -1]], f: ["Enter", "NumpadEnter"], s: ["ShiftRight", "Slash", "Period", "Numpad0"] };
    const P2K = { m: [["KeyA", -1], ["KeyD", 1]], a: [["KeyW", 1], ["KeyS", -1]], f: ["Space", "KeyF"], s: ["KeyQ", "KeyE", "ShiftLeft", "Tab"] };
    const kmap = (i) => (CPU ? [P1K, P2K] : [[P1K], [P2K]][i]);
    const isHuman = (i) => !(CPU && i === 1);
    const switchW = (t) => {
      if (t.ko || state !== "run" || t.charging) return;
      const o = 1 - t.sel;
      if (t.ammo[o] > 0) { t.sel = o; K.tone(700, 0.06, "triangle", 0.1); } else K.sfx.bad();
    };
    K.mode = {
      key(e) {
        if (e.key === "Backspace") { K.back(); return true; }
        if (e.code === "KeyP") { togglePause(); return true; }
        if (!e.repeat) {
          for (let i = 0; i < 2; i++) if (isHuman(i)) for (const km of kmap(i)) if (km.s.includes(e.code)) switchW(tanks[i]);
          if (paused && ["Enter", "Space"].includes(e.code)) togglePause();
        }
        keys.add(e.code);
        return true;
      },
      keyup(e) { keys.delete(e.code); },
      poll(pads) {
        pads.slice(0, 2).forEach((pd, j) => {
          const i = CPU ? 0 : j, b = (n) => !!(pd.buttons[n] && pd.buttons[n].pressed), pv = padPrev[j], edge = (n) => b(n) && !pv[n];
          const ax = pd.axes[0] || 0, ay = pd.axes[1] || 0, ry = pd.axes[3] || 0;
          pd.st = { m: b(14) || ax < -0.4 ? -1 : b(15) || ax > 0.4 ? 1 : 0, a: b(12) || ay < -0.5 || ry < -0.5 ? 1 : b(13) || ay > 0.5 || ry > 0.5 ? -1 : 0, f: b(0) || b(7) };
          padState[j] = { i, ...pd.st };
          if (edge(1)) K.back();
          else {
            if (edge(0)) K.audioCtx();
            if (edge(2) || edge(3) || edge(4) || edge(5)) switchW(tanks[i]);
            if (edge(9)) togglePause();
            else if (paused && edge(0)) togglePause();
          }
          pd.buttons.forEach((_, n) => (pv[n] = b(n)));
        });
        for (let j = pads.length; j < 2; j++) padState[j] = null;
        return true;
      },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", fit); removeEventListener("blur", clearKeys); },
    };
    const padState = [null, null];
    const clearKeys = () => keys.clear();
    addEventListener("resize", fit); addEventListener("blur", clearKeys);
    function readCtl(i) {
      const c = { m: 0, a: 0, f: false };
      for (const km of kmap(i)) {
        for (const [k, v] of km.m) if (keys.has(k)) c.m += v;
        for (const [k, v] of km.a) if (keys.has(k)) c.a += v;
        if (km.f.some((k) => keys.has(k))) c.f = true;
      }
      for (const ps of padState) if (ps && ps.i === i) { c.m += ps.m; c.a += ps.a; c.f = c.f || ps.f; }
      const tc = touch[i];
      c.m += (tc.r ? 1 : 0) - (tc.l ? 1 : 0); c.a += (tc.u ? 1 : 0) - (tc.d ? 1 : 0); c.f = c.f || !!tc.f;
      c.m = clamp(c.m, -1, 1); c.a = clamp(c.a, -1, 1);
      return c;
    }
    // أزرار اللمس
    const showPads = () => tpads.forEach((el, i) => el.classList.toggle("on", isHuman(i)));
    if (matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) showPads();
    cv.addEventListener("pointerdown", (e) => { K.audioCtx(); showPads(); if (paused) togglePause(); e.preventDefault(); });
    tpads.forEach((el) => {
      const i = +el.dataset.p;
      el.querySelectorAll("button").forEach((bt) => {
        const c = bt.dataset.c;
        const on = (e) => { e.preventDefault(); K.audioCtx(); bt.setPointerCapture && bt.setPointerCapture(e.pointerId); bt.classList.add("dn"); if (c === "s") switchW(tanks[i]); else touch[i][c] = true; };
        const off = () => { bt.classList.remove("dn"); touch[i][c] = false; };
        bt.addEventListener("pointerdown", on);
        bt.addEventListener("pointerup", off); bt.addEventListener("pointercancel", off); bt.addEventListener("lostpointercapture", off);
        bt.addEventListener("contextmenu", (e) => e.preventDefault());
      });
    });
    function togglePause() {
      if (state !== "run") return;
      paused = !paused;
      msg.innerHTML = paused ? `<div class="win" style="--c:#1e3a8a">⏸️ استراحة<small>اضغط Enter أو ✕ أو المس الشاشة للمتابعة</small></div>` : "";
    }

    // ------------------------------------------------ الكمبيوتر
    function simulate(t, ang, pow, foe) {
      const [px, py] = pivot(t);
      let x = px + Math.cos(ang) * t.face * 46, y = py - Math.sin(ang) * 46;
      const sp = 260 + 640 * pow;
      let vx = Math.cos(ang) * t.face * sp, vy = -Math.sin(ang) * sp;
      const [fx0, fy0] = center(foe);
      for (let k = 0; k < 600; k++) {
        const dt = 1 / 60; vy += G * dt; x += vx * dt; y += vy * dt;
        if (Math.hypot(x - fx0, y - fy0) < TANKR) return 0;
        if (x < -40 || x > W + 40) return 9999;
        if (y >= gy(x)) return Math.abs(x - fx0);
      }
      return 9999;
    }
    function aiPlan(t, foe) {
      const ai = t.ai;
      if (t.ammo[1] > 0 && Math.random() < L.homing) t.sel = 1; else if (t.ammo[0] > 0) t.sel = 0; else t.sel = t.ammo[1] > 0 ? 1 : 0;
      let best = [9999, 0.7, 0.5];
      for (let n = 0; n < 6; n++) {
        const a = clamp(rnd(0.5, 1.2) + rnd(-L.angJit, L.angJit) * 0.3, 0.2, 1.4);
        for (let p = 0.1; p <= 1.0001; p += 0.02) { const d = simulate(t, a, p, foe); if (d < best[0]) best = [d, a, p]; }
        if (best[0] < 5) break;
      }
      ai.ang = best[1];
      ai.pow = clamp(best[2] + (Math.random() * 2 - 1) * L.err * (t.sel ? 0.5 : 1), 0.12, 1);
    }
    function aiThink(t, foe, dt) {
      const ai = t.ai, c = { m: 0, a: 0, f: false };
      ai.t -= dt;
      // تهرّب من قذيفة قادمة
      if (L.dodge && ai.ph !== "charge") {
        const inc = shots.find((s) => s.owner !== t.i && Math.abs(s.x - t.x) < 260);
        if (inc && (ai.dodgeSeen !== inc)) { ai.dodgeSeen = inc; if (Math.random() < L.dodge) { ai.ph = "move"; ai.tx = clamp(t.x + (inc.vx > 0 ? 1 : -1) * 140, 60, W - 60); ai.t = 1.2; } }
      }
      if (ai.ph === "wait") {
        if (ai.t <= 0) {
          ai.ph = "move"; ai.t = 2.4;
          const cr = crates.filter((k) => Math.abs(k.x - t.x) < 500).sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x))[0];
          const want = cr && (cr.type === "med" ? t.hp < 80 : true) && Math.random() < L.crate;
          ai.tx = want ? cr.x : clamp(t.x + rnd(-220, 220), W * 0.04, W * 0.55);
        }
      } else if (ai.ph === "move") {
        const d = ai.tx - t.x;
        if (Math.abs(d) < 12 || ai.t <= 0) { ai.ph = "aim"; aiPlan(t, foe); ai.t = 2.5; }
        else c.m = Math.sign(d);
      } else if (ai.ph === "aim") {
        const d = ai.ang - t.ang;
        if (Math.abs(d) < 0.03 || ai.t <= 0) { ai.ph = "charge"; ai.t = 2; }
        else c.a = Math.sign(d);
      } else if (ai.ph === "charge") {
        if (t.ammo[t.sel] <= 0 && t.ammo[1 - t.sel] <= 0) { ai.ph = "wait"; ai.t = 1; }
        else if (!t.charging || t.charge < ai.pow) c.f = true;
        else { ai.ph = "wait"; ai.t = rnd(...L.wait); }
      }
      return c;
    }

    // ------------------------------------------------ الحركة والرمي
    function updTank(t, dt) {
      const foe = tanks[1 - t.i];
      t.hit = Math.max(0, t.hit - dt);
      t.cool = Math.max(0, t.cool - dt);
      if (t.ko) { t.koT += dt; t.v *= 0.9; if (Math.random() < dt * 9) fx.push({ k: "smoke", x: t.x + rnd(-14, 14), y: gy(t.x) - 50, r: rnd(10, 18), life: 0, max: rnd(1.4, 2.2), vx: rnd(-8, 8) }); return; }
      const c = state === "run" ? (t.ai ? aiThink(t, foe, dt) : readCtl(t.i)) : { m: 0, a: 0, f: false };
      // الميل والسرعة: الصعود يبطئ، النزول يسرّع قليلاً، والأرض المنبسطة تزيد السرعة شيئاً فشيئاً
      if (c.m) {
        const up = -(gy(t.x + c.m * 14) - gy(t.x - c.m * 14)) / 28;
        if (Math.abs(up) < 0.12) t.mom = Math.min(1, t.mom + dt * 0.55); else t.mom = Math.max(0, t.mom - dt * (up > 0 ? 1.4 : 0.3));
        const f = up > 0 ? Math.max(0.3, 1 - up * 1.15) : Math.min(1.45, 1 - up * 0.6);
        const target = c.m * 90 * (1 + 0.9 * t.mom) * f;
        t.v += clamp(target - t.v, -320 * dt, 320 * dt);
      } else {
        t.mom = Math.max(0, t.mom - dt * 2);
        t.v += clamp(-t.v, -420 * dt, 420 * dt);
      }
      t.x += t.v * dt;
      if (t.x < 44 || t.x > W - 44) { t.x = clamp(t.x, 44, W - 44); t.v = 0; t.mom = 0; }
      const sep = t.x - foe.x;
      if (Math.abs(sep) < 84) { t.x = foe.x + Math.sign(sep || 1) * 84; t.v = 0; t.x = clamp(t.x, 44, W - 44); }
      t.wheel += t.v * dt / 7;
      t.tilt += (slope(t.x) - t.tilt) * Math.min(1, dt * 10);
      if (Math.abs(t.v) > 150 && Math.random() < dt * 20) fx.push({ k: "dust", x: t.x - Math.sign(t.v) * 40, y: gy(t.x) - 4, r: rnd(5, 9), life: 0, max: 0.6, vx: -Math.sign(t.v) * 30 });
      t.face = foe.x > t.x ? 1 : -1;
      t.ang = clamp(t.ang + c.a * dt * 1.1, 0.08, 1.48);
      // الرمي بالضغط المطوّل
      if (c.f && !t.charging && t.cool <= 0) {
        if (t.ammo[t.sel] <= 0 && t.ammo[1 - t.sel] > 0) t.sel = 1 - t.sel;
        if (t.ammo[t.sel] > 0) { t.charging = true; t.charge = 0; t.cw = t.sel; }
        else if (!t.noAmmoBeep) { K.sfx.bad(); t.noAmmoBeep = 1; }
      }
      if (!c.f) t.noAmmoBeep = 0;
      if (t.charging) {
        t.charge = Math.min(1, t.charge + dt / 1.25);
        if (Math.random() < dt * 8) K.tone(300 + t.charge * 500, 0.04, "sine", 0.03);
        if (!c.f) fire(t);
      }
      // ذخيرة احتياطية حتى لا تتوقف اللعبة
      if (t.ammo[0] === 0) { t.regen += dt; if (t.regen > 4) { t.regen = 0; t.ammo[0] = 1; pop(t.x, gy(t.x) - 90, "+1", "#334155"); } } else t.regen = 0;
      t.ctl = c;
    }
    function fire(t) {
      t.charging = false;
      const w = t.ammo[t.cw] > 0 ? t.cw : t.sel;
      if (t.ammo[w] <= 0) return;
      t.ammo[w]--; t.cool = 0.5;
      const [x, y] = tip(t), sp = 260 + 640 * Math.max(0.1, t.charge);
      shots.push({ x, y, vx: Math.cos(t.ang) * t.face * sp, vy: -Math.sin(t.ang) * sp, w, owner: t.i, age: 0, trail: [] });
      fx.push({ k: "flash", x, y, r: 16, life: 0, max: 0.25 });
      t.v -= t.face * 30;
      K.tone(160, 0.18, "square", 0.07); K.tone(90, 0.25, "sine", 0.18);
      if (w === 1) K.tone(900, 0.3, "triangle", 0.06, 0.05);
      if (w === 1 && t.ammo[1] === 0 && t.ammo[0] > 0) t.sel = 0;
      t.charge = 0;
    }
    function updShot(s, dt) {
      s.age += dt;
      const foe = tanks[1 - s.owner];
      if (s.w === 1 && s.age > 0.35 && !foe.ko) {
        const [fx0, fy0] = center(foe), want = Math.atan2(fy0 - s.y, fx0 - s.x), cur = Math.atan2(s.vy, s.vx);
        let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        const na = cur + clamp(d, -2.4 * dt, 2.4 * dt), sp = Math.hypot(s.vx, s.vy), ns = sp + (380 - sp) * Math.min(1, dt * 2);
        s.vx = Math.cos(na) * ns; s.vy = Math.sin(na) * ns + 40 * dt;
        if (Math.random() < dt * 30) fx.push({ k: "spark", x: s.x, y: s.y, r: rnd(3, 6), life: 0, max: 0.5, vx: rnd(-20, 20) });
      } else s.vy += G * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.trail.push([s.x, s.y]); if (s.trail.length > 14) s.trail.shift();
      for (const t of tanks) {
        if (t.ko || (t.i === s.owner && s.age < 0.4)) continue;
        const [cx, cy] = center(t);
        if (Math.hypot(s.x - cx, s.y - cy) < TANKR) return boom(s, s.x, s.y);
      }
      if (s.x < -60 || s.x > W + 60 || s.age > 8) return true;
      if (s.y >= gy(s.x)) return boom(s, s.x, gy(s.x));
      return false;
    }
    function boom(s, x, y) {
      const Wp = WEAP[s.w];
      fx.push({ k: "boom", x, y, r: Wp.r, life: 0, max: 0.55, col: PL[s.owner].color });
      for (let n = 0; n < 8; n++) fx.push({ k: "bit", x, y, vx: rnd(-160, 160), vy: rnd(-260, -80), r: rnd(3, 6), life: 0, max: 0.9, col: n % 2 ? "#fde047" : TH[4] });
      noise(0.35, 0.25);
      for (const t of tanks) {
        if (t.ko || t.i === s.owner) continue; // لا تؤذي الدبابة نفسها
        const [cx, cy] = center(t), d = Math.hypot(x - cx, y - cy);
        const dmg = d <= 40 ? Wp.dmg : Math.round(Wp.dmg * Math.max(0, 1 - (d - 40) / Wp.r));
        if (dmg <= 0) continue;
        t.hp = Math.max(0, t.hp - dmg); t.hit = 0.4; t.v += Math.sign(cx - x || 1) * 70;
        pop(cx, cy - 70, "-" + dmg, "#ef4444");
        K.tone(320, 0.12, "sawtooth", 0.05);
        if (t.hp <= 0) knockout(t);
      }
      return true;
    }
    function knockout(t) {
      t.ko = true; t.charging = false;
      const w = tanks[1 - t.i];
      winner = w; wins[w.i]++;
      state = "ko"; stT = 0;
      [523, 440, 349, 262].forEach((f, k) => K.tone(f, 0.2, "triangle", 0.1, k * 0.12));
      K.later(() => K.sfx.win(), 600);
      const done = wins[w.i] >= 2;
      const nm = CPU && w.i === 1 ? "🤖 الكمبيوتر" : `${w.p.emo} ${w.p.name}`;
      K.later(() => { msg.innerHTML = `<div class="win" style="--c:${w.p.color}">⭐ ${nm} ربح الجولة!<small>${done ? "وربح المباراة 🏆" : `النتيجة ${wins[0]} : ${wins[1]} · جولة جديدة بعد قليل…`}</small></div>`; }, 900);
      K.later(() => {
        msg.innerHTML = "";
        if (done) K.replace(endScreen, { mode, lvl, wins: wins.slice(), w: w.i });
        else startRound();
      }, 3800);
    }
    function updCrates(dt) {
      crateT -= dt;
      if (crateT <= 0 && crates.length < 2 && state === "run") {
        crateT = rnd(6, 9);
        const r = Math.random(), type = r < 0.45 ? "ammo" : r < 0.78 ? "med" : "homing";
        let x; for (let k = 0; k < 10; k++) { x = rnd(90, W - 90); if (tanks.every((t) => Math.abs(t.x - x) > 120)) break; }
        crates.push({ x, y: -30, type, landed: false, t: rnd(0, 6) });
      }
      crates = crates.filter((c) => {
        c.t += dt;
        const gyc = gy(c.x) - 20;
        if (!c.landed) { c.y += 85 * dt; if (c.y >= gyc) { c.y = gyc; c.landed = true; K.tone(220, 0.08, "triangle", 0.08); } }
        for (const t of tanks) {
          if (t.ko || Math.abs(t.x - c.x) > 52 || c.y < gy(c.x) - 90) continue;
          if (c.type === "ammo") { t.ammo[0] += 4; pop(c.x, c.y - 40, "+4 قذائف", "#334155"); }
          else if (c.type === "homing") { t.ammo[1] = Math.min(3, t.ammo[1] + 1); pop(c.x, c.y - 40, "+1 موجّهة", "#7c3aed"); }
          else { const a = Math.min(MAXHP - t.hp, 30); t.hp += a; pop(c.x, c.y - 40, a ? "+" + a + " قوة" : "قوة كاملة", "#16a34a"); }
          K.sfx.pop(); K.tone(990, 0.12, "sine", 0.1, 0.08);
          for (let n = 0; n < 6; n++) fx.push({ k: "spark", x: c.x + rnd(-20, 20), y: c.y + rnd(-20, 10), r: rnd(4, 7), life: 0, max: 0.7, vx: rnd(-30, 30) });
          return false;
        }
        return true;
      });
    }
    const pop = (x, y, text, col) => fx.push({ k: "pop", x, y, text, col, life: 0, max: 1.2 });

    // ------------------------------------------------ الحلقة
    function frame(ts) {
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      if (!paused) {
        now += dt; stT += dt;
        if (state === "count") {
          const n = 3 - Math.floor(stT / 0.75);
          if (n !== lastN) { lastN = n; if (n > 0) { K.sfx.tick(); msg.innerHTML = `<div class="count">${n}</div>`; } else { K.sfx.ok(); msg.innerHTML = `<div class="count">هيا!</div>`; } }
          if (stT > 3) { state = "run"; msg.innerHTML = ""; }
        }
        tanks.forEach((t) => updTank(t, dt));
        shots = shots.filter((s) => !updShot(s, dt));
        updCrates(dt);
        fx = fx.filter((f) => { f.life += dt; if (f.vx) f.x += f.vx * dt; if (f.vy !== undefined) { f.vy += G * dt; f.y += f.vy * dt; } if (f.k === "smoke" || f.k === "pop") f.y -= (f.k === "pop" ? 40 : 30) * dt; return f.life < f.max; });
        clouds.forEach((c) => { c[0] += c[3] * dt; if (c[0] > W + 120) c[0] = -120; });
      }
      draw(ts);
      raf = requestAnimationFrame(frame);
    }

    // ------------------------------------------------ الرسم
    function draw(ts) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = TH[0]; g.fillRect(0, 0, innerWidth, innerHeight);
      g.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, TH[0]); sky.addColorStop(1, TH[1]);
      g.fillStyle = sky; g.fillRect(-ox / sc - 2, 0, innerWidth / sc + 4, H);
      g.fillStyle = "#fde047"; g.beginPath(); g.arc(W * 0.5, H * 0.16 + 20, 46, 0, 7); g.fill();
      g.fillStyle = "rgba(253,224,71,.3)"; g.beginPath(); g.arc(W * 0.5, H * 0.16 + 20, 64 + Math.sin(ts / 500) * 4, 0, 7); g.fill();
      clouds.forEach(([x, y, s]) => cloud(x, y, s));
      g.fillStyle = TH[2]; g.beginPath(); g.moveTo(-ox / sc - 2, H);
      far.forEach((y, i) => g.lineTo((i * W) / 40, y)); g.lineTo(W + ox / sc + 2, H); g.fill();
      // الأرض
      g.beginPath(); g.moveTo(-ox / sc - 2, ground[0]);
      for (let i = 0; i < ground.length; i++) g.lineTo(i * 8, ground[i]);
      g.lineTo(W + ox / sc + 2, ground[ground.length - 1]); g.lineTo(W + ox / sc + 2, H + 2000); g.lineTo(-ox / sc - 2, H + 2000); g.closePath();
      g.fillStyle = TH[4]; g.fill();
      g.fillStyle = TH[5];
      rocks.forEach(([x, d, r]) => { const y = gy(x) + 24 + d; if (y < H + 1000) { g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, 0, 7); g.fill(); } });
      g.strokeStyle = TH[3]; g.lineWidth = 16; g.lineJoin = "round"; g.lineCap = "round";
      g.beginPath(); for (let i = 0; i < ground.length; i++) g.lineTo(i * 8, ground[i] + 6); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 3;
      g.beginPath(); for (let i = 0; i < ground.length; i++) g.lineTo(i * 8, ground[i] + 1); g.stroke();
      // الصناديق
      crates.forEach((c) => drawCrate(g, c.x, c.y, c.type, c.landed, c.t));
      // الدبابات
      tanks.forEach((t) => {
        drawTank(g, t.x, gy(t.x), t.tilt, t.ang, t.face, t.p, { t: ts + t.i * 700, wheel: t.wheel, hit: t.hit, ko: t.ko, happy: winner === t && state === "ko" });
        if (!t.ko && state !== "ko") aimGuide(t);
        tankBar(t);
        if (t.ko) dizzy(t.x, gy(t.x) - 86, ts);
      });
      // القذائف
      shots.forEach((s) => {
        g.strokeStyle = s.w ? "rgba(167,139,250,.5)" : "rgba(255,255,255,.6)"; g.lineWidth = s.w ? 6 : 4; g.lineCap = "round";
        g.beginPath(); s.trail.forEach(([x, y]) => g.lineTo(x, y)); g.stroke();
        if (s.w) drawRocket(g, s.x, s.y, Math.atan2(s.vy, s.vx), 1, ts);
        else { g.fillStyle = "#1e293b"; g.beginPath(); g.arc(s.x, s.y, 8, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.65)"; g.beginPath(); g.arc(s.x - 3, s.y - 3, 2.6, 0, 7); g.fill(); }
      });
      fx.forEach(drawFx);
      hud();
      // ما تحت العالم (في الهاتف العمودي)
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bot = oy + H * sc;
      if (bot < innerHeight) { g.fillStyle = TH[4]; g.fillRect(0, bot, innerWidth, innerHeight - bot); }
    }
    function cloud(x, y, s) {
      g.fillStyle = "rgba(255,255,255,.9)";
      [[0, 0, 30], [32, -10, 36], [66, 0, 28], [34, 10, 30]].forEach(([a, b, r]) => { g.beginPath(); g.arc(x + a * s, y + b * s, r * s, 0, 7); g.fill(); });
    }
    function aimGuide(t) {
      const [px, py] = pivot(t), dx = Math.cos(t.ang) * t.face, dy = -Math.sin(t.ang);
      g.fillStyle = "rgba(255,255,255,.85)";
      for (let k = 0; k < 5; k++) { const d = 58 + k * 15; g.beginPath(); g.arc(px + dx * d, py + dy * d, 3.5 - k * 0.4, 0, 7); g.fill(); }
      if (t.charging) {
        // قوس قوة الرمي
        const r = 62, a0 = Math.PI * 0.75, a1 = a0 + Math.PI * 1.5 * t.charge;
        g.lineCap = "round";
        g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 12; g.beginPath(); g.arc(px, py, r, a0, a0 + Math.PI * 1.5); g.stroke();
        g.strokeStyle = t.charge < 0.4 ? "#22c55e" : t.charge < 0.75 ? "#f59e0b" : "#ef4444"; g.lineWidth = 9; g.beginPath(); g.arc(px, py, r, a0, a1); g.stroke();
        g.fillStyle = "#fff"; g.font = "800 20px Baloo, Tahoma"; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 4; g.strokeStyle = "#1e3a8a"; g.strokeText(Math.round(t.charge * 100) + "%", px, py + r + 6); g.fillText(Math.round(t.charge * 100) + "%", px, py + r + 6);
      }
    }
    function tankBar(t) {
      const x = t.x, y = gy(t.x) - (t.charging ? 150 : 100), w = 76;
      rr(g, x - w / 2 - 3, y - 3, w + 6, 16, 8); g.fillStyle = "rgba(255,255,255,.85)"; g.fill();
      rr(g, x - w / 2, y, Math.max(4, (w * t.hp) / MAXHP), 10, 5); g.fillStyle = hpCol(t.hp); g.fill();
      g.font = "800 18px Baloo, Tahoma"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 4; g.strokeStyle = "#fff"; g.strokeText(t.hp, x, y - 14); g.fillStyle = "#1e293b"; g.fillText(t.hp, x, y - 14);
    }
    const hpCol = (h) => (h > 55 ? "#22c55e" : h > 25 ? "#f59e0b" : "#ef4444");
    function hud() {
      tanks.forEach((t) => {
        const w = 400, h = 100, x0 = t.i ? 12 : W - w - 12, y0 = 12;
        rr(g, x0, y0, w, h, 22); g.fillStyle = "rgba(255,255,255,.88)"; g.fill();
        g.lineWidth = 5; g.strokeStyle = t.p.color; g.stroke();
        g.textBaseline = "middle"; g.textAlign = "right"; g.font = "800 28px Baloo, Tahoma"; g.fillStyle = t.p.dark;
        g.fillText(CPU && t.i === 1 ? `الكمبيوتر (${L.name})` : t.p.name, x0 + w - 18, y0 + 30);
        g.fillStyle = t.p.color; g.beginPath(); g.arc(x0 + w - 18 - g.measureText(CPU && t.i === 1 ? `الكمبيوتر (${L.name})` : t.p.name).width - 18, y0 + 30, 9, 0, 7); g.fill();
        for (let k = 0; k < 2; k++) { starPath(g, x0 + 30 + k * 36, y0 + 30, 15); g.fillStyle = k < wins[t.i] ? "#facc15" : "rgba(148,163,184,.4)"; g.fill(); g.lineWidth = 2; g.strokeStyle = k < wins[t.i] ? "#ca8a04" : "rgba(100,116,139,.4)"; g.stroke(); }
        // شريط القوة ورقمها
        const bw = 190, bx = x0 + w - 18 - bw, by = y0 + 60;
        rr(g, bx, by, bw, 26, 13); g.fillStyle = "#e2e8f0"; g.fill();
        rr(g, bx, by, Math.max(14, (bw * t.hp) / MAXHP), 26, 13); g.fillStyle = hpCol(t.hp); g.fill();
        heart(g, bx + bw - 2, by + 13, 13);
        g.textAlign = "center"; g.font = "800 22px Baloo, Tahoma"; g.fillStyle = "#1e293b"; g.fillText(t.hp, bx + bw / 2, by + 14);
        // القذائف
        [0, 1].forEach((w2) => {
          const cx = x0 + 18 + w2 * 92, cy = by - 2, on = t.sel === w2;
          rr(g, cx, cy, 82, 32, 12); g.fillStyle = on ? t.p.light : "#f1f5f9"; g.fill();
          if (on) { g.lineWidth = 4; g.strokeStyle = t.p.color; g.stroke(); }
          if (w2) drawRocket(g, cx + 22, cy + 16, -0.6, 0.75, 0); else { g.fillStyle = "#1e293b"; g.beginPath(); g.arc(cx + 22, cy + 16, 8, 0, 7); g.fill(); }
          g.font = "800 22px Baloo, Tahoma"; g.fillStyle = t.ammo[w2] ? "#1e293b" : "#94a3b8"; g.direction = "ltr"; g.fillText("×" + t.ammo[w2], cx + 56, cy + 17); g.direction = "inherit";
        });
      });
      const txt = `الجولة ${round}`;
      g.font = "800 26px Baloo, Tahoma"; g.textAlign = "center";
      const tw = g.measureText(txt).width + 40;
      rr(g, W / 2 - tw / 2, 14, tw, 40, 20); g.fillStyle = "rgba(255,255,255,.88)"; g.fill();
      g.fillStyle = "#1e3a8a"; g.fillText(txt, W / 2, 35);
      g.font = "800 20px Baloo, Tahoma"; g.fillText(`${wins[1]}  :  ${wins[0]}`, W / 2, 72);
    }
    function dizzy(cx, cy, ts) {
      for (let k = 0; k < 3; k++) { const a = ts / 300 + k * 2.1; starPath(g, cx + Math.cos(a) * 34, cy + Math.sin(a) * 9, 10); g.fillStyle = "#fde047"; g.fill(); g.lineWidth = 2; g.strokeStyle = "#ca8a04"; g.stroke(); }
    }
    function drawFx(f) {
      const k = f.life / f.max;
      g.save();
      if (f.k === "boom") {
        g.globalAlpha = 1 - k;
        const r = f.r * (0.4 + k * 0.8);
        ["#fde047", "#fb923c", "#fff"].forEach((c, j) => { g.fillStyle = c; g.beginPath(); g.arc(f.x, f.y, r * (1 - j * 0.3), 0, 7); g.fill(); });
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle = i % 2 ? f.col : "#fff"; g.beginPath(); g.arc(f.x + Math.cos(a) * r * 1.1, f.y + Math.sin(a) * r * 0.9, r * 0.22, 0, 7); g.fill(); }
        starPath(g, f.x, f.y - 6, r * 0.45); g.fillStyle = "#facc15"; g.fill();
      } else if (f.k === "smoke") {
        g.globalAlpha = 0.6 * (1 - k); g.fillStyle = "#94a3b8"; g.beginPath(); g.arc(f.x, f.y, f.r * (1 + k * 1.5), 0, 7); g.fill();
      } else if (f.k === "dust") {
        g.globalAlpha = 0.5 * (1 - k); g.fillStyle = "#fef3c7"; g.beginPath(); g.arc(f.x, f.y, f.r * (1 + k), 0, 7); g.fill();
      } else if (f.k === "flash") {
        g.globalAlpha = 1 - k; g.fillStyle = "#fde047"; g.beginPath(); g.arc(f.x, f.y, f.r * (1 + k), 0, 7); g.fill();
      } else if (f.k === "bit") {
        g.globalAlpha = 1 - k; g.fillStyle = f.col; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 7); g.fill();
      } else if (f.k === "spark") {
        g.globalAlpha = 1 - k; starPath(g, f.x, f.y, f.r); g.fillStyle = "#fde047"; g.fill();
      } else if (f.k === "pop") {
        g.globalAlpha = Math.min(1, (1 - k) * 2); g.font = "800 30px Baloo, Tahoma"; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 6; g.strokeStyle = "#fff"; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y);
      }
      g.restore();
    }

    startRound();
    K.dbg = () => ({ tanks, wins, state, knockout });
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- نهاية المباراة
  function endScreen(r) {
    K.begin();
    const CPU = r.mode === "cpu", humanWon = !CPU || r.w === 0;
    if (CPU) { if (r.w === 0) save.cpu[r.lvl]++; } else save.wins[r.w]++;
    save.save();
    const title = CPU ? (r.w === 0 ? "فزت على الكمبيوتر! 🏆" : "فاز الكمبيوتر 🤖 هذه المرة!") : `فاز ${PL[r.w].name} ${PL[r.w].emo}! 🏆`;
    K.paint(`
      <div class="top">${K.backBtn()}<span></span><span class="pill">${CPU ? `🤖 ${LV[r.lvl].emo} ${LV[r.lvl].name}` : "👫 لاعبان"}</span></div>
      <h1 class="endh">${title}</h1>
      <div class="score">🟠 ${r.wins[1]} : ${r.wins[0]} 🔵</div>
      <div class="sub">${humanWon ? "أحسنت التصويب! 🎯" : "حاول مرة أخرى، ستفوز في المرة القادمة 💪"}</div>
      <div class="earned"></div>
      <div class="nav">
        <button class="btn f go" ${K.act("again", () => K.replace(playScreen, r.mode, r.lvl))}><span class="emo">🔁</span> مباراة جديدة</button>
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>
      ${K.HELP}`, "again");
    K.sfx.win(); K.confetti(humanWon ? 40 : 12);
    if (CPU && r.w === 0) earn(r.lvl === "hard" ? 2 : 1, `فاز على الكمبيوتر (${LV[r.lvl].name})`);
    else if (!CPU) earn(1, "أنهى مباراة لشخصين");
  }
  function earn(amount, reason) {
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, game: GAME, reason }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const el = K.app.querySelector(".earned"); if (d && d.added && el) el.innerHTML = `<span class="pill gain">+${d.added} ⭐ في رصيدك</span>`; })
      .catch(() => {});
  }

  // ---------------------------------------------------------------- أصوات
  function noise(d, v) {
    const c = K.audioCtx(); if (!c) return;
    try {
      const n = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, n, c.sampleRate), a = buf.getChannelData(0);
      for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
      s.buffer = buf; f.type = "lowpass"; f.frequency.value = 700; gn.gain.value = v;
      s.connect(f).connect(gn).connect(c.destination); s.start();
    } catch {}
  }

  // ---------------------------------------------------------------- الرسوم (أصلية)
  function rr(x, X, Y, w, h, r) { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function starPath(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); }
  function heart(x, cx, cy, r) {
    x.save(); x.translate(cx, cy); x.fillStyle = "#f43f5e";
    x.beginPath(); x.moveTo(0, r * 0.9); x.bezierCurveTo(-r * 1.3, 0, -r * 0.7, -r * 1.1, 0, -r * 0.35); x.bezierCurveTo(r * 0.7, -r * 1.1, r * 1.3, 0, 0, r * 0.9); x.fill();
    x.fillStyle = "rgba(255,255,255,.6)"; x.beginPath(); x.arc(-r * 0.4, -r * 0.35, r * 0.18, 0, 7); x.fill();
    x.restore();
  }
  // دبابة كرتونية لطيفة: جسم مدوّر وقبة بعينين وخدود، وعجلات تدور
  function drawTank(x, cx, gyv, tilt, ang, face, p, o) {
    const s = o.s || 1, t = o.t || 0;
    x.save(); x.translate(cx, gyv); x.rotate(tilt); x.scale(s, s);
    const bob = o.happy ? -Math.abs(Math.sin(t / 150)) * 10 : 0;
    x.translate(0, bob);
    x.fillStyle = "rgba(0,0,0,.15)"; x.beginPath(); x.ellipse(0, 2, 46, 6, 0, 0, 7); x.fill();
    // المدفع
    const la = Math.atan2(-Math.sin(ang), face * Math.cos(ang)) - tilt;
    x.save(); x.translate(0, -40); x.rotate(la);
    rr(x, 0, -5.5, 46, 11, 5); x.fillStyle = o.ko ? "#64748b" : p.dark; x.fill();
    rr(x, 38, -7.5, 10, 15, 4); x.fillStyle = "#334155"; x.fill();
    x.restore();
    // الجنزير
    rr(x, -44, -18, 88, 20, 10); x.fillStyle = "#334155"; x.fill();
    for (let k = 0; k < 5; k++) {
      const wx = -32 + k * 16;
      x.fillStyle = "#cbd5e1"; x.beginPath(); x.arc(wx, -8, 7, 0, 7); x.fill();
      x.strokeStyle = "#64748b"; x.lineWidth = 2; x.beginPath();
      const a = (o.wheel || 0) + k; x.moveTo(wx + Math.cos(a) * 6, -8 + Math.sin(a) * 6); x.lineTo(wx - Math.cos(a) * 6, -8 - Math.sin(a) * 6); x.stroke();
    }
    // الجسم
    const flash = o.hit > 0 && Math.floor(o.hit * 20) % 2 === 0;
    rr(x, -38, -36, 76, 22, 11); x.fillStyle = o.ko ? "#94a3b8" : flash ? "#fff" : p.color; x.fill();
    rr(x, -32, -33, 64, 6, 3); x.fillStyle = "rgba(255,255,255,.35)"; x.fill();
    // القبة
    x.fillStyle = o.ko ? "#94a3b8" : flash ? "#fff" : p.color; x.beginPath(); x.arc(0, -36, 22, Math.PI, 0); x.fill();
    x.fillStyle = "rgba(255,255,255,.3)"; x.beginPath(); x.arc(-8, -46, 6, 0, 7); x.fill();
    // راية صغيرة
    x.strokeStyle = "#475569"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-face * 16, -50); x.lineTo(-face * 22, -76); x.stroke();
    x.fillStyle = p.light; x.beginPath(); x.moveTo(-face * 22, -76); x.lineTo(-face * 22 - face * -16, -71 + Math.sin(t / 200) * 2); x.lineTo(-face * 21, -66); x.fill();
    // الوجه
    const ex = face * 5, blink = (t % 3200) < 140;
    if (o.ko) {
      x.strokeStyle = "#1e293b"; x.lineWidth = 2.5;
      [-1, 1].forEach((k) => { x.beginPath(); x.arc(k * 8 + ex, -42, 4.5, t / 120, t / 120 + 5); x.stroke(); });
      x.beginPath(); x.arc(ex, -28, 4, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    } else {
      [-1, 1].forEach((k) => {
        if (blink) { x.strokeStyle = "#1e293b"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(k * 8 + ex - 4, -42); x.lineTo(k * 8 + ex + 4, -42); x.stroke(); return; }
        x.fillStyle = "#fff"; x.beginPath(); x.ellipse(k * 8 + ex, -42, 5.5, 6.5, 0, 0, 7); x.fill();
        x.fillStyle = "#1e293b"; x.beginPath(); x.arc(k * 8 + ex * 1.4, -41, 3.2, 0, 7); x.fill();
        x.fillStyle = "#fff"; x.beginPath(); x.arc(k * 8 + ex * 1.4 - 1, -42.5, 1.1, 0, 7); x.fill();
      });
      x.fillStyle = "rgba(244,114,182,.75)"; [-1, 1].forEach((k) => { x.beginPath(); x.ellipse(k * 15 + ex * 0.6, -33, 3.6, 2.2, 0, 0, 7); x.fill(); });
      x.strokeStyle = "#1e293b"; x.lineWidth = 2.2; x.lineCap = "round"; x.beginPath(); x.arc(ex, -36, 4, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
    }
    x.restore();
  }
  function drawRocket(x, cx, cy, a, s, t) {
    x.save(); x.translate(cx, cy); x.rotate(a); x.scale(s, s);
    if (t) { x.fillStyle = "#fb923c"; x.beginPath(); x.moveTo(-12, -5); x.lineTo(-24 - Math.sin(t / 40) * 5, 0); x.lineTo(-12, 5); x.fill(); x.fillStyle = "#fde047"; x.beginPath(); x.moveTo(-12, -3); x.lineTo(-18, 0); x.lineTo(-12, 3); x.fill(); }
    x.fillStyle = "#a78bfa"; x.beginPath(); x.moveTo(-12, -7); x.lineTo(-17, -12); x.lineTo(-6, -6); x.moveTo(-12, 7); x.lineTo(-17, 12); x.lineTo(-6, 6); x.fill();
    rr(x, -13, -6, 22, 12, 6); x.fillStyle = "#f8fafc"; x.fill();
    x.fillStyle = "#ef4444"; x.beginPath(); x.moveTo(8, -6); x.quadraticCurveTo(18, 0, 8, 6); x.fill();
    x.fillStyle = "#38bdf8"; x.beginPath(); x.arc(-1, 0, 3, 0, 7); x.fill();
    x.restore();
  }
  function drawCrate(x, cx, cy, type, landed, t) {
    x.save(); x.translate(cx, cy);
    if (!landed) {
      x.rotate(Math.sin(t * 2) * 0.12);
      const pc = type === "med" ? "#f9a8d4" : type === "homing" ? "#c4b5fd" : "#fde68a";
      x.strokeStyle = "#64748b"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-16, -16); x.lineTo(-34, -56); x.moveTo(16, -16); x.lineTo(34, -56); x.stroke();
      x.fillStyle = pc; x.beginPath(); x.arc(0, -56, 38, Math.PI, 0); x.fill();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(0, -56, 38, Math.PI * 1.33, Math.PI * 1.66); x.lineTo(0, -56); x.fill();
    } else x.translate(0, Math.sin(t * 3) * 2);
    const bc = type === "med" ? "#fff1f2" : type === "homing" ? "#ede9fe" : "#d97706";
    rr(x, -20, -20, 40, 40, 6); x.fillStyle = bc; x.fill(); x.lineWidth = 3; x.strokeStyle = type === "ammo" ? "#92400e" : type === "med" ? "#fb7185" : "#8b5cf6"; x.stroke();
    if (type === "ammo") {
      x.strokeStyle = "#b45309"; x.lineWidth = 3; x.beginPath(); x.moveTo(-20, -20); x.lineTo(20, 20); x.stroke();
      x.fillStyle = "#1e293b"; [[-7, 4], [7, -4], [6, 9]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 5.5, 0, 7); x.fill(); });
    } else if (type === "med") heart(x, 0, 2, 13);
    else drawRocket(x, 0, 0, -0.7, 0.9, 0);
    x.restore();
  }

  K.start(homeScreen);
})();
