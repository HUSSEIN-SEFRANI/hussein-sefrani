// متاهة لشخصين — اجمع النجوم في المتاهة وتجنّب الغيوم المشاغبة (تعيدك إلى البداية فقط)
// الأزرق «توتو»: يد التحكم ١ أو الأسهم   |   البرتقالية «لولو»: يد التحكم ٢ أو W A S D
// أوضاع: تعاون، منافسة، ضد الكمبيوتر. ١٢ متاهة تزداد صعوبة. قوى: حذاء سرعة ودرع.
(() => {
  "use strict";
  const GAME = "متاهة لشخصين";
  const save = K.store("maze2", { max: 1, best: {}, wins: { blue: 0, orange: 0 } });
  const MODES = {
    coop: { name: "تعاون", emo: "🤝", two: true },
    vs: { name: "منافسة", emo: "🏆", two: true },
    cpu: { name: "ضد الكمبيوتر", emo: "🤖", two: true, ai: true },
  };
  const PL = [
    { id: "blue", name: "توتو", color: "#3b82f6", dark: "#1d4ed8", light: "#bfdbfe", emo: "🔵" },
    { id: "orange", name: "لولو", color: "#f97316", dark: "#c2410c", light: "#fed7aa", emo: "🟠" },
  ];
  // ألوان كل متاهة: أرض، جدار، حافة الجدار
  const THEMES = [
    ["#ecfccb", "#4ade80", "#15803d"], ["#fef9c3", "#fb923c", "#c2410c"], ["#e0f2fe", "#60a5fa", "#1d4ed8"],
    ["#fce7f3", "#f472b6", "#be185d"], ["#f3e8ff", "#a78bfa", "#6d28d9"], ["#ccfbf1", "#2dd4bf", "#0f766e"],
    ["#fef3c7", "#fbbf24", "#b45309"], ["#ffe4e6", "#fb7185", "#be123c"], ["#e0e7ff", "#818cf8", "#4338ca"],
    ["#dcfce7", "#22c55e", "#166534"], ["#fae8ff", "#e879f9", "#a21caf"], ["#e0f2fe", "#38bdf8", "#0369a1"],
  ];
  const LEVELS = K.range(1, 13).map((n) => {
    const k = (n - 1) / 11;
    return {
      n, cw: 6 + Math.round(k * 9), ch: 4 + Math.round(k * 4),
      monsters: Math.min(6, 1 + Math.floor(n / 2)),
      mspeed: 2.1 + k * 1.5, chase: 0.1 + k * 0.5, stars: 14 + n * 3, braid: 0.75 - k * 0.35,
    };
  });
  const MCOL = ["#f9a8d4", "#c4b5fd", "#86efac", "#fdba74", "#7dd3fc", "#fde68a"];
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: "down", down: "up", left: "right", right: "left" };
  const PSPEED = 4.3, BOOT = 6.6;

  // مولّد أرقام ثابت لكل متاهة (حتى تكون المتاهة نفسها كل مرة)
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  function makeMaze(L, portrait) {
    const R = rng(L.n * 7919 + (portrait ? 13 : 0));
    const cw = portrait ? L.ch : L.cw, ch = portrait ? L.cw : L.ch;
    const W = cw * 2 + 1, H = ch * 2 + 1;
    const g = K.range(0, H).map(() => Array(W).fill(1));
    const seen = new Set(), st = [[0, 0]];
    seen.add("0,0"); g[1][1] = 0;
    while (st.length) {
      const [x, y] = st[st.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [x + a, y + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < cw && b < ch && !seen.has(a + "," + b));
      if (!nb.length) { st.pop(); continue; }
      const [a, b] = nb[(R() * nb.length) | 0];
      g[y + b + 1][x + a + 1] = 0; g[b * 2 + 1][a * 2 + 1] = 0;
      seen.add(a + "," + b); st.push([a, b]);
    }
    // فتح طرق إضافية (حلقات) حتى يستطيع الطفل الهروب من الغيوم
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (g[y][x] !== 1) continue;
      const hz = x % 2 === 0 && y % 2 === 1 && !g[y][x - 1] && !g[y][x + 1];
      const vt = y % 2 === 0 && x % 2 === 1 && !g[y - 1][x] && !g[y + 1][x];
      if (!(hz || vt)) continue;
      const dead = (cx, cy) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => !g[cy + b][cx + a]).length === 1;
      const ends = hz ? dead(x - 1, y) || dead(x + 1, y) : dead(x, y - 1) || dead(x, y + 1);
      if (R() < (ends ? L.braid : L.braid * 0.18)) g[y][x] = 0;
    }
    // ساحة صغيرة في الوسط لبيت الغيوم
    const mx = (cw | 1) === cw ? cw : cw - 1, my = ch - (ch % 2 ? 0 : 1);
    const hx = Math.max(1, Math.min(W - 2, mx)), hy = Math.max(1, Math.min(H - 2, my));
    for (let y = hy - 1; y <= hy + 1; y++) for (let x = hx - 1; x <= hx + 1; x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y][x] = 0;
    return { g, W, H, R, home: [hx, hy] };
  }

  // ---------------------------------------------------------------- القائمة
  function homeScreen() {
    K.begin();
    const pads = K.pads().length;
    const card = (k, bg, sub) => `<button class="mode f" style="background:${bg}" ${K.act(k, () => K.show(levelsScreen, k))}>
      <span class="big emo">${MODES[k].emo}</span><b>${MODES[k].name}</b><small>${sub}</small></button>`;
    K.paint(`
      <div class="title"><canvas class="hero" width="220" height="160"></canvas><div><h1>${GAME}</h1><div class="sub">اجمع النجوم ⭐ وانتبه من الغيوم المشاغبة!</div></div></div>
      <div class="modes">
        ${card("coop", "linear-gradient(135deg,#3b82f6,#22c55e)", "نجمع النجوم معاً")}
        ${card("vs", "linear-gradient(135deg,#3b82f6,#f97316)", "من يجمع أكثر؟")}
        ${card("cpu", "linear-gradient(135deg,#f97316,#64748b)", "لاعب واحد")}
      </div>
      <div class="mini">
        <span class="pill">🔵 ${save.wins.blue} : ${save.wins.orange} 🟠</span>
        <span class="pill">🎮 ${pads ? `${pads} يد تحكم متصلة` : "لا توجد يد تحكم"}</span>
      </div>
      <div class="help">🔵 توتو: يد التحكم ١ أو الأسهم · 🟠 لولو: يد التحكم ٢ أو <b>W A S D</b> · 👆 اسحب على الشاشة · <b>Enter</b> أو <b>✕</b> للاختيار · <b>Backspace</b> أو <b>○</b> للرجوع</div>`, "coop");
    const c = K.app.querySelector(".hero"), x = c.getContext("2d");
    let raf = 0;
    const loop = (t) => { x.clearRect(0, 0, 220, 160); drawPlayer(x, 60, 92, 46, PL[0], "right", t, 1); drawPlayer(x, 160, 92, 46, PL[1], "left", t + 500, 1); drawStar(x, 110, 34, 18, t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    K.mode = { stop: () => cancelAnimationFrame(raf) };
  }

  function levelsScreen(mode) {
    K.begin();
    const tiles = LEVELS.map((L) => {
      const open = L.n <= save.max, b = save.best[mode + L.n] || 0;
      return `<button class="tile lv f ${open ? "" : "lock"}" style="--c:${THEMES[L.n - 1][1]}" ${K.act("l" + L.n, () => open ? K.show(playScreen, mode, L.n) : K.sfx.bad())}>
        <b>${open ? L.n : "🔒"}</b><span class="st">${open ? K.starsHtml(b) : ""}</span></button>`;
    }).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${MODES[mode].emo} ${MODES[mode].name}: اختر المتاهة</h2><span class="pill">${save.max} / 12</span></div>
      <div class="grid" style="--cols:6">${tiles}</div>
      <div class="sub legend">⭐ اجمع كل النجوم · 👟 حذاء السرعة · 🛡️ الدرع يحميك من الغيوم · ☁️ الغيمة تعيدك إلى البداية</div>
      ${K.HELP}`, "l" + Math.min(save.max, 12));
  }

  // ---------------------------------------------------------------- اللعب
  function playScreen(mode, lvl) {
    K.begin();
    const M = MODES[mode], L = LEVELS[lvl - 1], TH = THEMES[lvl - 1];
    K.paint(`<canvas class="maze"></canvas><div class="msg"></div>`);
    const cv = K.app.querySelector("canvas"), g = cv.getContext("2d"), msg = K.app.querySelector(".msg");
    let portrait = innerHeight > innerWidth * 1.1;
    let Z = makeMaze(L, portrait);
    let ts = 30, ox = 0, oy = 0, hud = 60, bg = null;
    const fit = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      hud = Math.max(44, Math.min(70, innerHeight * 0.09));
      ts = Math.floor(Math.min((innerWidth - 16) / Z.W, (innerHeight - hud - 12) / Z.H));
      ox = (innerWidth - ts * Z.W) / 2; oy = hud + (innerHeight - hud - ts * Z.H) / 2;
      bg = drawBg();
    };

    // نقاط البداية: توتو يمين أسفل، لولو يسار أسفل
    const starts = [[Z.W - 2, Z.H - 2], [1, Z.H - 2]];
    const P = PL.map((p, i) => ({ ...p, i, x: starts[i][0], y: starts[i][1], sx: starts[i][0], sy: starts[i][1], dir: null, want: null, t: 0, face: i ? "right" : "left",
      stars: 0, resets: 0, boot: 0, shield: 0, safe: 1.5, poof: 0, ai: M.ai && i === 1 }));
    // النجوم: على كل طريق ما عدا البداية وبيت الغيوم، ثم نختار العدد المطلوب
    const free = [];
    for (let y = 1; y < Z.H - 1; y++) for (let x = 1; x < Z.W - 1; x++) if (!Z.g[y][x] && !near(x, y, Z.home, 1) && !starts.some((s) => near(x, y, s, 1))) free.push([x, y]);
    const pool = free.slice().sort(() => Z.R() - 0.5);
    const stars = new Map();
    pool.slice(0, Math.min(L.stars, pool.length - 4)).forEach(([x, y]) => stars.set(x + "," + y, { x, y }));
    const total = stars.size;
    let power = null, powerNext = 4, powerType = 0;
    const mons = K.range(0, L.monsters).map((i) => ({ x: Z.home[0], y: Z.home[1], dir: null, t: 0, wait: 1.5 + i * 1.6, col: MCOL[i % MCOL.length], dizzy: 0, ph: i * 1.7 }));
    const pops = [];
    let state = "count", t0 = performance.now(), last = t0, raf = 0, paused = false, clock = 0;
    fit(); addEventListener("resize", onResize);
    function onResize() { const p = innerHeight > innerWidth * 1.1; if (p !== portrait && state === "count") { K.replace(playScreen, mode, lvl); return; } fit(); }

    function near(x, y, [a, b], r) { return Math.abs(x - a) <= r && Math.abs(y - b) <= r; }
    const open = (x, y) => y >= 0 && x >= 0 && y < Z.H && x < Z.W && !Z.g[y][x];
    const can = (e, d) => d && open(e.x + DIRS[d][0], e.y + DIRS[d][1]);
    const pos = (e) => (e.dir ? [e.x + DIRS[e.dir][0] * e.t, e.y + DIRS[e.dir][1] * e.t] : [e.x, e.y]);

    // ---------------------------------------------------------------- التحكم
    const KEYS = { ArrowUp: [0, "up"], ArrowDown: [0, "down"], ArrowLeft: [0, "left"], ArrowRight: [0, "right"],
      KeyW: [1, "up"], KeyS: [1, "down"], KeyA: [1, "left"], KeyD: [1, "right"] };
    const human = (i) => (P[i].ai || (i === 1 && !M.two) ? 0 : i);
    const steer = (i, d) => { const p = P[human(i)]; if (state === "run" && !paused) p.want = d; };
    K.mode = {
      key(e) {
        if (e.key === "Backspace") { K.back(); return true; }
        if (e.key === "Enter" || e.key === " ") { if (state === "run") togglePause(); return true; }
        const k = KEYS[e.code] || KEYS[e.key];
        if (k) steer(k[0], k[1]);
        return true;
      },
      poll(pads) {
        pads.forEach((pd, i) => {
          if (i > 1) return;
          const b = (n) => !!(pd.buttons[n] && pd.buttons[n].pressed);
          const ax = pd.axes[0] || 0, ay = pd.axes[1] || 0;
          const d = b(12) || ay < -0.5 ? "up" : b(13) || ay > 0.5 ? "down" : b(14) || ax < -0.5 ? "left" : b(15) || ax > 0.5 ? "right" : null;
          const pi = M.ai ? 0 : i;
          if (d) steer(pi, d);
          const pp = P[i];
          if (b(1) && !pp.pb) K.back();
          else if (b(0) && !pp.pa) { K.audioCtx(); if (state === "run") togglePause(); }
          pp.pa = b(0); pp.pb = b(1);
        });
        return true;
      },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", onResize); },
    };
    // اللمس والفأرة: اسحب أو المس جهة الحركة. لاعبان: النصف الأيمن لتوتو والأيسر للولو
    const touch = new Map();
    cv.addEventListener("pointerdown", (e) => { K.audioCtx(); touch.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener("pointermove", (e) => {
      const s = touch.get(e.pointerId); if (!s) return;
      const dx = e.clientX - s[0], dy = e.clientY - s[1];
      if (Math.hypot(dx, dy) > 24) { steer(who(s[0]), dirOf(dx, dy)); touch.set(e.pointerId, [e.clientX, e.clientY]); s.moved = 1; touch.get(e.pointerId).moved = 1; }
    });
    cv.addEventListener("pointerup", (e) => {
      const s = touch.get(e.pointerId); touch.delete(e.pointerId);
      if (!s || s.moved) return;
      if (paused) { togglePause(); return; }
      const i = who(e.clientX), p = P[human(i)], [px, py] = pos(p);
      steer(i, dirOf(e.clientX - (ox + (px + 0.5) * ts), e.clientY - (oy + (py + 0.5) * ts)));
    });
    const who = (x) => (M.two && !M.ai && x < innerWidth / 2 ? 1 : 0);
    const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");

    function togglePause() {
      paused = !paused;
      msg.innerHTML = paused ? `<div class="win" style="--c:#3b82f6">⏸️ استراحة<small>✕ أو Enter: نكمل · ○ أو Backspace: القائمة</small></div>` : "";
    }

    // ---------------------------------------------------------------- الحركة
    function step(e, speed, dt, choose) {
      let left = speed * dt;
      while (left > 0) {
        if (!e.dir) { const d = choose(e); if (!d || !can(e, d)) return; e.dir = d; e.t = 0; }
        if (e.want && e.want === OPP[e.dir]) { e.x += DIRS[e.dir][0]; e.y += DIRS[e.dir][1]; e.dir = OPP[e.dir]; e.t = 1 - e.t; e.want = null; }
        const need = 1 - e.t;
        if (left < need) { e.t += left; return; }
        left -= need; e.x += DIRS[e.dir][0]; e.y += DIRS[e.dir][1]; e.t = 0;
        arrive(e);
        const d = choose(e);
        e.dir = d && can(e, d) ? d : null;
        if (!e.dir) return;
      }
    }
    const playerChoose = (p) => {
      if (p.ai) p.want = aiDir(p);
      if (p.want && can(p, p.want)) { p.face = p.want; const d = p.want; if (!p.ai) p.want = d; return d; }
      return p.dir && can(p, p.dir) ? p.dir : null;
    };
    function arrive(e) {
      if (!("stars" in e)) return;
      const k = e.x + "," + e.y, s = stars.get(k);
      if (s) {
        stars.delete(k); e.stars++; K.sfx.pop(); pops.push({ x: e.x, y: e.y, t: 0, txt: "+1", c: e.color });
        if (!stars.size) K.later(finish, 500);
      }
      if (power && power.x === e.x && power.y === e.y) {
        if (power.type === "boot") e.boot = 7; else e.shield = 8;
        pops.push({ x: e.x, y: e.y, t: 0, txt: power.type === "boot" ? "سريع!" : "درع!", c: e.color });
        power = null; powerNext = 9; K.sfx.ok();
      }
    }

    // الكمبيوتر: يبحث عن أقرب نجمة ويبتعد عن الغيوم
    function bfs(from, goal, avoid) {
      const prev = new Map([[from.x + "," + from.y, null]]), q = [[from.x, from.y]];
      while (q.length) {
        const [x, y] = q.shift();
        if (goal(x, y) && (x !== from.x || y !== from.y)) {
          let k = x + "," + y, d = null;
          while (prev.get(k)) { const [px, py, dd] = prev.get(k); d = dd; k = px + "," + py; }
          return d;
        }
        for (const [d, [a, b]] of Object.entries(DIRS)) {
          const nx = x + a, ny = y + b, nk = nx + "," + ny;
          if (!open(nx, ny) || prev.has(nk) || avoid(nx, ny)) continue;
          prev.set(nk, [x, y, d]); q.push([nx, ny]);
        }
      }
      return null;
    }
    function aiDir(p) {
      if (Math.random() < 0.06 + (12 - lvl) * 0.01) return p.dir || K.pick(Object.keys(DIRS));
      const danger = (x, y) => p.shield <= 0 && mons.some((m) => { const [mx, my] = pos(m); return Math.abs(mx - x) + Math.abs(my - y) < 2.2; });
      const goal = (x, y) => stars.has(x + "," + y) || (power && power.x === x && power.y === y);
      return bfs(p, goal, danger) || bfs(p, (x, y) => !danger(x, y) && Math.abs(x - p.x) + Math.abs(y - p.y) > 3, () => false) || bfs(p, goal, () => false);
    }
    const monChoose = (m) => {
      const ds = Object.keys(DIRS).filter((d) => can(m, d) && d !== OPP[m.dir]);
      const opts = ds.length ? ds : Object.keys(DIRS).filter((d) => can(m, d));
      if (!opts.length) return null;
      if (m.dizzy <= 0 && Math.random() < L.chase) {
        const tg = P.filter((p) => p.poof <= 0).sort((a, b) => dist(m, a) - dist(m, b))[0];
        if (tg) return opts.sort((a, b) => dist2(m, a, tg) - dist2(m, b, tg))[0];
      }
      return K.pick(opts);
    };
    const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const dist2 = (m, d, p) => Math.abs(m.x + DIRS[d][0] - p.x) + Math.abs(m.y + DIRS[d][1] - p.y);

    function update(dt) {
      clock += dt;
      P.forEach((p) => {
        if (p.poof > 0) { p.poof -= dt; if (p.poof <= 0) { p.x = p.sx; p.y = p.sy; p.dir = null; p.want = null; p.t = 0; p.safe = 2; } return; }
        p.boot = Math.max(0, p.boot - dt); p.shield = Math.max(0, p.shield - dt); p.safe = Math.max(0, p.safe - dt);
        if (!M.two && p.i === 1) return;
        const sp = (p.boot > 0 ? BOOT : PSPEED) * (p.ai ? 0.82 + lvl * 0.012 : 1);
        if (!p.dir && p.want && can(p, p.want)) p.face = p.want;
        step(p, sp, dt, playerChoose);
      });
      mons.forEach((m) => {
        m.dizzy = Math.max(0, m.dizzy - dt);
        if (m.wait > 0) { m.wait -= dt; return; }
        step(m, L.mspeed * (m.dizzy > 0 ? 0.5 : 1), dt, monChoose);
        const [mx, my] = pos(m);
        P.forEach((p) => {
          if (p.poof > 0 || (!M.two && p.i === 1)) return;
          const [px, py] = pos(p);
          if (Math.hypot(px - mx, py - my) > 0.62) return;
          if (p.shield > 0 || p.safe > 0) {
            if (p.shield > 0 && m.dizzy <= 0) { m.dizzy = 2; m.want = null; if (m.dir) { m.x += DIRS[m.dir][0] * (m.t > 0.5 ? 1 : 0); m.y += DIRS[m.dir][1] * (m.t > 0.5 ? 1 : 0); m.t = m.t > 0.5 ? 1 - m.t : m.t; m.dir = OPP[m.dir]; } K.tone(880, 0.1, "triangle", 0.1); }
            return;
          }
          p.poof = 0.9; p.resets++; p.boot = 0;
          pops.push({ x: px, y: py, t: 0, txt: "إلى البداية 🏠", c: p.color });
          [440, 370, 330].forEach((f, k) => K.tone(f, 0.14, "triangle", 0.1, k * 0.09));
        });
      });
      powerNext -= dt;
      if (!power && powerNext <= 0 && lvl >= 2) {
        const c = free.filter(([x, y]) => !stars.has(x + "," + y) && !P.some((p) => near(x, y, [p.x, p.y], 3)));
        if (c.length) { const [x, y] = K.pick(c); power = { x, y, type: powerType++ % 2 ? "shield" : "boot", life: 14 }; }
      }
      if (power && (power.life -= dt) <= 0) { power = null; powerNext = 6; }
      if (lvl === 1 && !power && powerNext <= 0) { const c = free.filter(([x, y]) => !stars.has(x + "," + y)); if (c.length) { const [x, y] = K.pick(c); power = { x, y, type: "boot", life: 14 }; } }
      pops.forEach((o) => (o.t += dt));
      while (pops.length && pops[0].t > 1.2) pops.shift();
    }

    function finish() {
      if (state === "over") return;
      state = "over";
      const active = P.filter((p) => M.two || p.i === 0);
      const resets = active.reduce((a, p) => a + p.resets, 0);
      let winner = null;
      if (mode !== "coop") winner = P[0].stars > P[1].stars ? P[0] : P[1].stars > P[0].stars ? P[1] : null;
      if (winner) { save.wins[winner.id]++; }
      const good = mode === "coop" || mode === "vs" || winner === P[0];
      const rate = mode === "coop" ? (resets <= 1 ? 3 : resets <= 4 ? 2 : 1) : mode === "vs" ? 3 : winner === P[0] ? (P[0].resets <= 1 ? 3 : 2) : 1;
      save.best[mode + lvl] = Math.max(save.best[mode + lvl] || 0, rate);
      if (good && lvl === save.max && lvl < 12) save.max = lvl + 1;
      save.save();
      K.later(() => K.replace(endScreen, { mode, lvl, winner, rate, good, stars: P.map((p) => p.stars), resets, time: clock }), 700);
    }

    // ---------------------------------------------------------------- الرسم
    function drawBg() {
      const c = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1);
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.fillStyle = TH[0]; rr(x, ox - 6, oy - 6, ts * Z.W + 12, ts * Z.H + 12, ts * 0.5); x.fill();
      // نقاط زينة على الأرض
      x.fillStyle = TH[1] + "33";
      for (let y = 0; y < Z.H; y++) for (let X = 0; X < Z.W; X++) if (!Z.g[y][X] && (X * 7 + y * 3) % 5 === 0) { x.beginPath(); x.arc(ox + (X + 0.5) * ts, oy + (y + 0.5) * ts, ts * 0.06, 0, 7); x.fill(); }
      const wall = (col, inset, dy) => {
        x.fillStyle = col;
        const r = ts / 2 - inset;
        for (let y = 0; y < Z.H; y++) for (let X = 0; X < Z.W; X++) {
          if (!Z.g[y][X]) continue;
          const cx = ox + (X + 0.5) * ts, cy = oy + (y + 0.5) * ts + dy;
          x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
          if (X + 1 < Z.W && Z.g[y][X + 1]) x.fillRect(cx, cy - r, ts, r * 2);
          if (y + 1 < Z.H && Z.g[y + 1][X]) x.fillRect(cx - r, cy, r * 2, ts);
        }
      };
      wall(TH[2], ts * 0.08, ts * 0.08);
      wall(TH[1], ts * 0.1, 0);
      wall("rgba(255,255,255,.35)", ts * 0.3, -ts * 0.06);
      // بيوت البداية
      starts.forEach(([X, y], i) => { x.fillStyle = PL[i].light; rr(x, ox + X * ts + 2, oy + y * ts + 2, ts - 4, ts - 4, ts * 0.25); x.fill(); });
      return c;
    }
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (state === "count") {
        const n = 3 - Math.floor((now - t0) / 800);
        msg.innerHTML = `<div class="count">${n > 0 ? n : "هيّا! ⭐"}</div>`;
        if (now - t0 > 3000) { state = "run"; msg.innerHTML = ""; }
      } else if (state === "run" && !paused) update(dt);
      const W = innerWidth, H = innerHeight;
      g.clearRect(0, 0, W, H);
      if (bg) g.drawImage(bg, 0, 0, W, H);
      for (const s of stars.values()) drawStar(g, ox + (s.x + 0.5) * ts, oy + (s.y + 0.5) * ts, ts * 0.3, now + s.x * 90 + s.y * 50);
      if (power) {
        const px = ox + (power.x + 0.5) * ts, py = oy + (power.y + 0.5) * ts + Math.sin(now / 200) * ts * 0.06;
        g.globalAlpha = power.life < 3 ? 0.5 + 0.5 * Math.sin(now / 80) : 1;
        g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(px, py, ts * 0.44, 0, 7); g.fill();
        power.type === "boot" ? drawBoot(g, px, py, ts * 0.36) : drawShield(g, px, py, ts * 0.36);
        g.globalAlpha = 1;
      }
      mons.forEach((m) => { const [x, y] = pos(m); drawMonster(g, ox + (x + 0.5) * ts, oy + (y + 0.5) * ts, ts * 0.42, m, now); });
      P.forEach((p) => {
        if (!M.two && p.i === 1) return;
        const [x, y] = pos(p), cx = ox + (x + 0.5) * ts, cy = oy + (y + 0.5) * ts;
        if (p.poof > 0) { drawPoof(g, cx, cy, ts, 1 - p.poof / 0.9, p.color); return; }
        if (p.safe > 0 && Math.floor(now / 120) % 2) g.globalAlpha = 0.45;
        if (p.boot > 0) { g.fillStyle = p.light; for (let k = 1; k <= 3; k++) { const d = p.dir ? DIRS[p.dir] : [0, 0]; g.globalAlpha *= 0.7; g.beginPath(); g.arc(cx - d[0] * ts * 0.28 * k, cy - d[1] * ts * 0.28 * k, ts * (0.22 - k * 0.04), 0, 7); g.fill(); } g.globalAlpha = p.safe > 0 && Math.floor(now / 120) % 2 ? 0.45 : 1; }
        drawPlayer(g, cx, cy, ts * 0.42, p, p.face, now + p.i * 400, p.dir ? 1 : 0);
        if (p.shield > 0) { g.strokeStyle = p.shield < 2 && Math.floor(now / 100) % 2 ? "rgba(56,189,248,.3)" : "rgba(56,189,248,.85)"; g.lineWidth = ts * 0.07; g.beginPath(); g.arc(cx, cy, ts * 0.56, 0, 7); g.stroke(); g.fillStyle = "rgba(186,230,253,.25)"; g.fill(); }
        g.globalAlpha = 1;
      });
      pops.forEach((o) => {
        g.globalAlpha = Math.max(0, 1 - o.t / 1.2); g.fillStyle = o.c; g.strokeStyle = "#fff"; g.lineWidth = 4;
        g.font = `800 ${Math.max(14, ts * 0.42)}px Baloo, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
        const X = ox + (o.x + 0.5) * ts, Y = oy + (o.y + 0.2 - o.t * 0.8) * ts;
        g.direction = o.txt[0] === "+" ? "ltr" : "rtl";
        g.strokeText(o.txt, X, Y); g.fillText(o.txt, X, Y); g.globalAlpha = 1;
      });
      drawHud(W, now);
      raf = requestAnimationFrame(frame);
    }
    function drawHud(W, now) {
      const h = hud, pad = 10, small = W < 760;
      const bw = small ? (W - pad * 4) / 3 : Math.min(W * 0.3, 300), fs = Math.min(h * 0.42, bw / (small ? 6 : 10));
      g.textBaseline = "middle"; g.font = `800 ${fs}px Baloo, sans-serif`;
      const box = (x, w, col, txt) => { g.fillStyle = "rgba(255,255,255,.92)"; rr(g, x, pad * 0.6, w, h - pad * 1.4, (h - pad) / 2); g.fill(); g.fillStyle = col; g.textAlign = "center"; g.fillText(txt, x + w / 2, h / 2); };
      const name = (p) => (p.ai ? "🤖" + (small ? "" : " لولو") : p.emo + (small ? "" : " " + p.name));
      box(W - bw - pad, bw, PL[0].dark, `${name(P[0])}  ⭐ ${P[0].stars}`);
      box(pad, bw, PL[1].dark, `${name(P[1])}  ⭐ ${P[1].stars}`);
      const mid = mode === "coop" ? (small ? `🤝 ${total - stars.size}/${total}` : `معاً: ⭐ ${total - stars.size} / ${total}`) : small ? `باقي ${stars.size}` : `متاهة ${lvl} · باقي ⭐ ${stars.size}`;
      box((W - bw) / 2, bw, mode === "coop" ? "#a16207" : "#334155", mid);
      // مؤشرات القوى
      P.forEach((p, i) => {
        if (!M.two && i === 1) return;
        const x = small ? (i === 0 ? W - pad - bw / 2 + h * 0.4 : pad + bw / 2 - h * 0.4) : i === 0 ? W - bw - pad - h * 0.5 : pad + bw + h * 0.5;
        const y = small ? h * 1.25 : h / 2;
        let k = 0;
        if (p.boot > 0) drawBoot(g, x + (i ? 1 : -1) * k++ * h * 0.8, y, h * 0.3);
        if (p.shield > 0) drawShield(g, x + (i ? 1 : -1) * k++ * h * 0.8, y, h * 0.3);
      });
    }

    let lastN = 4;
    const beep = setInterval(() => { const n = 3 - Math.floor((performance.now() - t0) / 800); if (n !== lastN && n >= 0) { lastN = n; n > 0 ? K.sfx.tick() : K.sfx.ok(); } if (n < 0) clearInterval(beep); }, 50);
    K.later(() => clearInterval(beep), 4000);
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- نهاية المتاهة
  function endScreen(r) {
    K.begin();
    const M = MODES[r.mode];
    let title, sub;
    if (r.mode === "coop") { title = "أحسنتما! جمعتما كل النجوم 🎉"; sub = `🔵 ${r.stars[0]} + 🟠 ${r.stars[1]} = ⭐ ${r.stars[0] + r.stars[1]} · العودة إلى البداية: ${r.resets}`; }
    else if (!r.winner) { title = "تعادل! كلاكما بطل 🤝"; sub = `🔵 ${r.stars[0]} : ${r.stars[1]} 🟠`; }
    else { title = r.winner.i === 1 && M.ai ? "فاز الكمبيوتر 🤖 هذه المرة!" : `فاز ${r.winner.name} ${r.winner.emo}!`; sub = `🔵 ${r.stars[0]} : ${r.stars[1]} 🟠`; }
    const hasNext = r.lvl < 12 && r.lvl + 1 <= save.max;
    K.paint(`
      <div class="top">${K.backBtn()}<span></span><span class="pill">${M.emo} ${M.name} · متاهة ${r.lvl}</span></div>
      <h1 class="endh">${title}</h1>
      <div class="stars">${K.starsHtml(r.rate)}</div>
      <div class="sub">${sub} · ⏱️ ${Math.round(r.time)} ثانية</div>
      <div class="earned"></div>
      ${r.lvl === 12 && r.good ? `<div class="won"><span class="emo">🏆</span> أنهيتم كل المتاهات الاثنتي عشرة!</div>` : ""}
      <div class="nav">
        ${hasNext ? `<button class="btn f go" ${K.act("next", () => K.replace(playScreen, r.mode, r.lvl + 1))}>المتاهة ${r.lvl + 1} ←</button>` : ""}
        <button class="btn f" ${K.act("again", () => K.replace(playScreen, r.mode, r.lvl))}><span class="emo">🔁</span> مرة أخرى</button>
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>
      ${K.HELP}`, hasNext ? "next" : "again");
    K.sfx.win(); K.confetti(18 + r.rate * 10);
    if (r.good) earn(r.lvl >= 7 ? 2 : 1, `أنهى المتاهة ${r.lvl} (${M.name})`);
  }
  function earn(amount, reason) {
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, game: GAME, reason }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const el = K.app.querySelector(".earned"); if (d && d.added && el) el.innerHTML = `<span class="pill gain">+${d.added} ⭐ في رصيدك</span>`; })
      .catch(() => {});
  }

  // ---------------------------------------------------------------- رسوم الشخصيات (أصلية)
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  // توتو ولولو: كرتان طريّتان بأذنين صغيرتين وخدود وردية
  function drawPlayer(x, cx, cy, r, p, face, t, moving) {
    const d = DIRS[face] || [0, 0], b = moving ? Math.abs(Math.sin(t / 90)) * r * 0.12 : Math.sin(t / 400) * r * 0.05;
    x.save(); x.translate(cx, cy - b);
    x.fillStyle = "rgba(0,0,0,.12)"; x.beginPath(); x.ellipse(0, r * 0.95 + b, r * 0.75, r * 0.18, 0, 0, 7); x.fill();
    x.fillStyle = p.dark;
    [-1, 1].forEach((s) => { x.beginPath(); x.arc(s * r * 0.6, -r * 0.72, r * 0.3, 0, 7); x.fill(); });
    x.fillStyle = p.color; x.beginPath(); x.ellipse(0, 0, r, r * 0.92, 0, 0, 7); x.fill();
    x.fillStyle = p.light; [-1, 1].forEach((s) => { x.beginPath(); x.arc(s * r * 0.6, -r * 0.72, r * 0.15, 0, 7); x.fill(); });
    x.beginPath(); x.ellipse(0, r * 0.35, r * 0.55, r * 0.42, 0, 0, 7); x.fill();
    const ex = d[0] * r * 0.18, ey = d[1] * r * 0.14 - r * 0.15;
    x.fillStyle = "#fff"; [-1, 1].forEach((s) => { x.beginPath(); x.ellipse(s * r * 0.33 + ex, ey, r * 0.22, r * 0.26, 0, 0, 7); x.fill(); });
    x.fillStyle = "#1e293b"; [-1, 1].forEach((s) => { x.beginPath(); x.arc(s * r * 0.33 + ex * 1.5, ey + d[1] * r * 0.06, r * 0.13, 0, 7); x.fill(); });
    x.fillStyle = "#fff"; [-1, 1].forEach((s) => { x.beginPath(); x.arc(s * r * 0.33 + ex * 1.5 - r * 0.05, ey - r * 0.06, r * 0.05, 0, 7); x.fill(); });
    x.fillStyle = "rgba(244,114,182,.7)"; [-1, 1].forEach((s) => { x.beginPath(); x.ellipse(s * r * 0.62 + ex * 0.5, r * 0.18, r * 0.13, r * 0.08, 0, 0, 7); x.fill(); });
    x.strokeStyle = "#1e293b"; x.lineWidth = Math.max(1.5, r * 0.08); x.lineCap = "round";
    x.beginPath(); x.arc(ex * 0.8, r * 0.16, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
    x.restore();
  }
  // الغيوم المشاغبة: غيمة مبتسمة تتمايل
  function drawMonster(x, cx, cy, r, m, t) {
    const w = Math.sin(t / 180 + m.ph);
    x.save(); x.translate(cx, cy + w * r * 0.08);
    if (m.wait > 0) x.globalAlpha = 0.6;
    x.fillStyle = "rgba(0,0,0,.1)"; x.beginPath(); x.ellipse(0, r * 1.0, r * 0.7, r * 0.15, 0, 0, 7); x.fill();
    x.fillStyle = m.col;
    [[-0.5, 0.15, 0.5], [0.5, 0.15, 0.5], [0, -0.3, 0.6], [-0.45, -0.3, 0.38], [0.45, -0.3, 0.38], [0, 0.3, 0.55]].forEach(([a, b, s]) => { x.beginPath(); x.arc(a * r, b * r, s * r, 0, 7); x.fill(); });
    // أرجل صغيرة متمايلة
    [-0.45, 0, 0.45].forEach((a, k) => { x.beginPath(); x.arc(a * r, r * 0.75 + Math.sin(t / 120 + k) * r * 0.06, r * 0.18, 0, 7); x.fill(); });
    x.fillStyle = "rgba(255,255,255,.45)"; x.beginPath(); x.arc(-r * 0.25, -r * 0.55, r * 0.15, 0, 7); x.fill();
    const d = m.dir ? DIRS[m.dir] : [0, 0];
    if (m.dizzy > 0) {
      x.strokeStyle = "#475569"; x.lineWidth = r * 0.08;
      [-1, 1].forEach((s) => { x.beginPath(); x.arc(s * r * 0.3, -r * 0.08, r * 0.13, t / 100, t / 100 + 5); x.stroke(); });
      x.fillStyle = "#fde047"; for (let k = 0; k < 3; k++) { const a = t / 300 + k * 2.1; drawStarPath(x, Math.cos(a) * r * 0.7, -r * 0.9 + Math.sin(a) * r * 0.2, r * 0.16); x.fill(); }
    } else {
      x.fillStyle = "#fff"; [-1, 1].forEach((s) => { x.beginPath(); x.arc(s * r * 0.3 + d[0] * r * 0.08, -r * 0.08 + d[1] * r * 0.06, r * 0.2, 0, 7); x.fill(); });
      x.fillStyle = "#334155"; [-1, 1].forEach((s) => { x.beginPath(); x.arc(s * r * 0.3 + d[0] * r * 0.14, -r * 0.06 + d[1] * r * 0.1, r * 0.1, 0, 7); x.fill(); });
    }
    x.fillStyle = "#fb7185"; x.beginPath(); x.arc(0, r * 0.22, r * 0.14, 0, Math.PI); x.fill();
    x.fillStyle = "rgba(244,63,94,.35)"; [-1, 1].forEach((s) => { x.beginPath(); x.ellipse(s * r * 0.6, r * 0.12, r * 0.12, r * 0.07, 0, 0, 7); x.fill(); });
    x.restore();
  }
  function drawStarPath(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); }
  function drawStar(x, cx, cy, r, t) {
    const s = 1 + Math.sin(t / 260) * 0.08;
    x.save(); x.translate(cx, cy); x.scale(s, s);
    drawStarPath(x, 0, 0, r); x.fillStyle = "#facc15"; x.fill(); x.lineWidth = Math.max(1, r * 0.14); x.strokeStyle = "#ca8a04"; x.lineJoin = "round"; x.stroke();
    x.fillStyle = "rgba(255,255,255,.7)"; x.beginPath(); x.arc(-r * 0.2, -r * 0.2, r * 0.14, 0, 7); x.fill();
    x.restore();
  }
  function drawBoot(x, cx, cy, r) {
    x.save(); x.translate(cx, cy);
    x.fillStyle = "#ef4444"; x.beginPath(); x.moveTo(-r * 0.5, -r * 0.8); x.lineTo(r * 0.05, -r * 0.8); x.lineTo(r * 0.1, -r * 0.1); x.quadraticCurveTo(r * 0.9, -r * 0.05, r * 0.9, r * 0.4); x.lineTo(-r * 0.6, r * 0.4); x.closePath(); x.fill();
    x.fillStyle = "#fff"; rr(x, -r * 0.7, r * 0.35, r * 1.7, r * 0.3, r * 0.14); x.fill();
    x.strokeStyle = "#fff"; x.lineWidth = r * 0.12; x.beginPath(); x.moveTo(-r * 0.4, -r * 0.3); x.lineTo(0, -r * 0.3); x.moveTo(-r * 0.4, r * 0.0); x.lineTo(r * 0.05, 0); x.stroke();
    x.strokeStyle = "#38bdf8"; x.lineWidth = r * 0.1; x.lineCap = "round";
    [-0.5, 0, 0.3].forEach((y) => { x.beginPath(); x.moveTo(-r * 0.85, y * r); x.lineTo(-r * 1.25, y * r); x.stroke(); });
    x.restore();
  }
  function drawShield(x, cx, cy, r) {
    x.save(); x.translate(cx, cy);
    x.fillStyle = "#0ea5e9"; x.beginPath(); x.moveTo(0, -r); x.quadraticCurveTo(r * 0.55, -r * 0.75, r * 0.9, -r * 0.75); x.quadraticCurveTo(r * 0.95, r * 0.5, 0, r); x.quadraticCurveTo(-r * 0.95, r * 0.5, -r * 0.9, -r * 0.75); x.quadraticCurveTo(-r * 0.55, -r * 0.75, 0, -r); x.fill();
    x.fillStyle = "#bae6fd"; x.beginPath(); x.moveTo(0, -r * 0.7); x.quadraticCurveTo(r * 0.4, -r * 0.5, r * 0.65, -r * 0.52); x.quadraticCurveTo(r * 0.68, r * 0.35, 0, r * 0.7); x.quadraticCurveTo(-r * 0.68, r * 0.35, -r * 0.65, -r * 0.52); x.quadraticCurveTo(-r * 0.4, -r * 0.5, 0, -r * 0.7); x.fill();
    drawStarPath(x, 0, 0, r * 0.4); x.fillStyle = "#facc15"; x.fill();
    x.restore();
  }
  function drawPoof(x, cx, cy, ts, k, col) {
    x.save();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, d = ts * (0.15 + k * 0.6);
      x.globalAlpha = 1 - k; x.fillStyle = i % 2 ? "#fff" : col;
      x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, ts * 0.18 * (1 - k * 0.5), 0, 7); x.fill();
    }
    x.globalAlpha = 1 - k; x.fillStyle = "#fde047"; drawStarPath(x, cx, cy, ts * 0.3 * (1 - k)); x.fill();
    x.restore();
  }

  K.start(homeScreen);
})();
