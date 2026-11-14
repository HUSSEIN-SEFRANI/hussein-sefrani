// لعبة عمر — لعبة منصات وقفز: عمر يجري ويقفز، يقذف المخلوقات بما يحمله، ويجمع النجوم والمكعبات،
// وفي نهاية كل مرحلة تتجمّع المكعبات لتصنع هدية (سيارة، طائرة، لعبة...).
// التحكم: ← → للجري، ↑ (أو ✕) للقفز (الضغط الطويل = قفزة أعلى)، Enter (أو □) للقذف، Backspace (أو ○) استراحة.
(() => {
  "use strict";
  const { T, VW, VH, WORLDS, GIFTS } = D;
  const ROWS = 12, NLV = 12, NCUBE = 6, GAME = "لعبة عمر";
  const save = K.store("omar", { unlocked: 1, best: {}, gifts: {}, earned: {} });
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  const worldOf = (li) => WORLDS[li >> 1];
  const totalBest = () => Object.values(save.best).reduce((a, b) => a + b, 0);

  // ---------------------------------------------------------------- بناء المراحل (ثابتة لكل رقم)
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function buildLevel(li) {
    const w = worldOf(li), d = li / (NLV - 1), rnd = rng(7331 + li * 977);
    const R = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const cols = [], items = [], ents = [], decor = [], cubeSpots = [];
    let h = 3;
    const X = () => cols.length;
    const col = (hh) => { const c = new Uint8Array(ROWS); for (let r = ROWS - hh; r < ROWS; r++) c[r] = 1; cols.push(c); return c; };
    const up = (k, hh = h) => ROWS - hh - k; // صف الخلية التي فوق الأرض بـ k
    const item = (t, cx, row) => items.push({ t, x: cx * T + T / 2, y: row * T + T / 2 });
    const flat = (n, stars = false, dec = true) => {
      const x0 = X();
      for (let i = 0; i < n; i++) {
        col(h);
        if (stars) item("s", x0 + i, up(1));
        else if (dec && rnd() < 0.22) decor.push({ e: D.pick(w.decor, rnd), x: (x0 + i) * T + T / 2, y: up(0) * T });
      }
      return x0;
    };
    const empty = (n) => { for (let i = 0; i < n; i++) cols.push(new Uint8Array(ROWS)); };
    const walker = (cx, speed) => ents.push({ t: "walk", x: cx * T, y: up(0) * T, dir: rnd() < 0.5 ? -1 : 1, sp: speed, w: 34, h: 28 });
    const spd = () => 40 + d * 45 + rnd() * 15;

    const F = {
      flat() { flat(R(3, 5), rnd() < 0.5); },
      gap() {
        flat(2);
        const n = R(2, d > 0.3 ? 3 : 2), gx = X();
        empty(n);
        for (let i = -1; i <= n; i++) item("s", gx + i, up(i >= 0 && i < n ? 3 : 2));
        flat(2);
      },
      step() { let dh = R(1, 2) * (rnd() < 0.5 ? 1 : -1); if (h + dh > 5 || h + dh < 2) dh = -dh; h += dh; flat(R(3, 5), rnd() < 0.4); },
      slope() {
        const k = R(2, 3);
        if (h + k <= 6 && (h <= 3 || rnd() < 0.5)) {
          for (let i = 0; i < k; i++) { const c = col(h + i); c[ROWS - (h + i) - 1] = 4; item("s", X() - 1, ROWS - (h + i) - 2); }
          h += k;
        } else if (h - k >= 2) {
          for (let i = 0; i < k; i++) { const c = col(h - 1 - i); c[ROWS - (h - 1 - i) - 1] = 5; item("s", X() - 1, ROWS - (h - i) - 2); }
          h -= k;
        }
        flat(R(2, 4));
      },
      enemy() { const n = R(7, 9), x0 = flat(n); walker(x0 + n / 2, spd()); },
      enemy2() { const n = R(10, 12), x0 = flat(n); walker(x0 + 3, spd()); walker(x0 + n - 3, spd()); },
      flyer() {
        const n = R(7, 9), x0 = flat(n, true);
        ents.push({ t: "fly", x0: (x0 + n / 2) * T, y0: up(2.6) * T, ph: rnd() * 6, w: 30, h: 24, x: 0, y: 0, dir: 1 });
      },
      plat() {
        const n = 8, x0 = flat(n), L = R(3, 4), row = up(3);
        for (let i = 0; i < L; i++) { cols[x0 + 2 + i][row] = 3; item("s", x0 + 2 + i, row - 1); }
        if (row - 3 >= 1 && rnd() < 0.5) { for (let i = 0; i < 2; i++) cols[x0 + 5 + i][row - 3] = 3; cubeSpots.push([x0 + 5.5, row - 4]); }
      },
      wall() {
        flat(3); const x0 = X(), k = R(1, 2), wd = R(1, 2);
        for (let i = 0; i < wd; i++) { const c = col(h); for (let j = 1; j <= k; j++) c[up(j)] = 2; }
        item("s", x0, up(k + 1));
        flat(3);
      },
      blocks() {
        const x0 = flat(7), row = up(3);
        for (let i = 0; i < 3; i++) { cols[x0 + 2 + i][row] = 2; item("s", x0 + 2 + i, row - 1); }
        if (rnd() < 0.5) cubeSpots.push([x0 + 3, row - 2]);
      },
      stones() {
        flat(2); const n = R(2, 3), base = up(0);
        for (let k = 0; k < n; k++) {
          empty(2);
          const r = base - (k % 2);
          for (let i = 0; i < 2; i++) { const c = new Uint8Array(ROWS); c[r] = 3; cols.push(c); item("s", X() - 1, r - 1); }
        }
        empty(2); flat(3);
      },
      mover() {
        flat(2); const gx = X(), n = R(6, 8);
        empty(n);
        ents.push({ t: "mov", a: gx * T, b: (gx + n - 3) * T, x: gx * T, y: up(0) * T, w: 3 * T, sp: 70 + d * 30, dir: 1, dx: 0 });
        for (let i = 1; i < n - 1; i++) item("s", gx + i, up(2));
        flat(3);
      },
    };
    const REW = {
      spring() {
        if (h > 4) { h = 4; }
        const x0 = flat(8), row = up(5);
        ents.push({ t: "spring", x: (x0 + 2) * T + T / 2, y: up(0) * T, sq: 0 });
        for (let i = 1; i < 5; i++) cols[x0 + i][row] = 3;
        for (let k = 2; k <= 4; k++) item("s", x0 + 2, up(k));
        cubeSpots.unshift([x0 + 3, row - 1]);
      },
      stairs() {
        if (h > 4) { h = 4; }
        const x0 = flat(10);
        [[1, 2], [4, 4], [7, 6]].forEach(([dx, k]) => { for (let i = 0; i < 2; i++) cols[x0 + dx + i][up(k)] = 3; item("s", x0 + dx, up(k + 1)); });
        cubeSpots.unshift([x0 + 8, up(7)]);
      },
      arc() {
        flat(3); const gx = X(); empty(3);
        cubeSpots.unshift([gx + 1.5, up(4)]);
        for (const i of [0, 2]) item("s", gx + i, up(3));
        flat(3);
      },
    };
    const W = {
      flat: 2, gap: 2 + d * 2, step: 1.5, slope: 1.6, enemy: 2.4 + d, enemy2: d >= 0.3 ? 1 + d * 2 : 0, flyer: 0.8 + d * 2,
      plat: 1.5, wall: 1, blocks: 1, stones: d >= 0.15 ? 1 + d : 0, mover: d >= 0.25 ? 1.2 + d : 0,
    };
    if (w.bg === "mountains") { W.slope += 1.5; W.mover += 1; }
    if (w.bg === "sea") W.gap += 1;
    if (w.bg === "snow") W.slope += 1;
    const pickF = (last) => { let s = 0; for (const k in W) if (k !== last) s += W[k]; let r = rnd() * s; for (const k in W) { if (k === last) continue; if ((r -= W[k]) <= 0) return k; } return "flat"; };

    const nF = 12 + Math.round(li * 1.4);
    const rewAt = [Math.round(nF * 0.22), Math.round(nF * 0.5), Math.round(nF * 0.8)], cpAt = Math.round(nF * 0.5) + 1;
    const rews = ["spring", "stairs", "arc"].sort(() => rnd() - 0.5);
    let cp = null, last = "";
    flat(6, false, false);
    flat(2, true);
    for (let i = 0; i < nF; i++) {
      if (rewAt.includes(i)) REW[rews[rewAt.indexOf(i)]]();
      else { last = pickF(last); F[last](); }
      if (i === cpAt) { const x0 = flat(4, false, false); cp = { x: (x0 + 1) * T + T / 2, y: up(0) * T, on: false }; }
      if (i === Math.round(nF * 0.65) || (li > 5 && i === Math.round(nF * 0.3))) { const x0 = flat(3, false, false); item("H", x0 + 1, up(1)); }
    }
    const x0 = flat(12, false, false);
    const door = { x: (x0 + 7) * T, y: up(0) * T };
    for (let i = 0; i < 3; i++) col(ROWS);
    // المكعبات: أماكن المكافآت أولاً ثم أماكن أخرى
    const spots = cubeSpots.slice(0, NCUBE);
    const stars = items.filter((it) => it.t === "s");
    while (spots.length < NCUBE && stars.length) {
      const it = stars.splice(Math.floor(rnd() * stars.length), 1)[0];
      it.t = "q"; spots.push(null);
    }
    spots.forEach((s) => { if (s) item("q", s[0] - 0.5, s[1]); });
    let ci = 0; items.forEach((it) => { if (it.t === "q") it.c = ci++ % D.CUBE_COLS.length; });

    const Wd = cols.length, grid = new Uint8Array(Wd * ROWS);
    cols.forEach((c, x) => { for (let r = 0; r < ROWS; r++) grid[r * Wd + x] = c[r]; });
    return { li, w, W: Wd, grid, items, ents, decor, cp, door, start: { x: 2 * T, y: (ROWS - 3) * T } };
  }
  D.pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

  // ---------------------------------------------------------------- الشاشة الأولى
  function home() {
    K.begin();
    const nxt = Math.min(save.unlocked, NLV) - 1, ng = Object.keys(save.gifts).length;
    K.paint(`<div class="hero"><canvas id="omarC" width="260" height="300"></canvas>
        <div><h1 class="logo">لعبة عمر</h1><div class="sub">اجرِ واقفز واجمع المكعبات لتصنع هدية! 🎁</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#22c55e,#0ea5e9)" ${K.act("play", () => K.show(play, nxt))}><span class="big emo">▶️</span><b>العب</b><small>المرحلة ${nxt + 1} · ${worldOf(nxt).name}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#f59e0b,#ef4444)" ${K.act("map", () => K.show(mapScreen))}><span class="big emo">🗺️</span><b>المراحل</b><small>⭐ ${totalBest()} من ${NLV * 3}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)" ${K.act("gifts", () => K.show(giftsScreen))}><span class="big emo">🎁</span><b>هداياي</b><small>${ng} من ${NLV}</small></button>
      </div>
      <div class="help"><b>← →</b> للجري · <b>↑</b> أو <b>✕</b> للقفز · <b>Enter</b> أو <b>□</b> للقذف · <b>Backspace</b> أو <b>○</b> استراحة</div>`, "play");
    const c = document.getElementById("omarC"), x = c.getContext("2d");
    x.fillStyle = "rgba(0,0,0,.12)"; x.beginPath(); x.ellipse(130, 282, 70, 12, 0, 0, 7); x.fill();
    x.save(); x.scale(4, 4); D.drawOmar(x, 32, 70, 1, 0, "idle", worldOf(nxt).hold); x.restore();
  }

  // ---------------------------------------------------------------- خريطة المراحل
  function mapScreen() {
    K.begin();
    const cards = WORLDS.map((w, wi) => {
      const lv = [0, 1].map((k) => {
        const li = wi * 2 + k;
        if (li >= save.unlocked) return `<div class="lv locked"><span class="emo">🔒</span></div>`;
        const b = save.best[li];
        return `<button class="lv f" ${K.act("L" + li, () => K.show(play, li))}><b>${li + 1}</b><span class="st">${b == null ? "جديدة ✨" : K.starsHtml(b)}</span></button>`;
      }).join("");
      return `<div class="world" style="--c1:${w.cards[0]};--c2:${w.cards[1]}"><div class="wname"><span class="emo">${w.emo}</span> ${w.name}</div><div class="lvls">${lv}</div></div>`;
    }).join("");
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">🗺️ المراحل</h2><span class="pill">⭐ ${totalBest()} / ${NLV * 3}</span></div>
      <div class="worlds">${cards}</div>${K.HELP}`, "L" + (Math.min(save.unlocked, NLV) - 1));
  }

  // ---------------------------------------------------------------- هداياي
  function giftsScreen() {
    K.begin();
    const cells = GIFTS.map((g, i) => {
      const got = save.gifts[i];
      return `<button class="gift f ${got ? "" : "no"}" ${K.act("g" + i, () => got && K.show(giftView, i))}>${got ? `<canvas data-g="${i}" width="160" height="110"></canvas><b>${g.name}</b>` : `<span class="emo">❔</span><b>المرحلة ${i + 1}</b>`}</button>`;
    }).join("");
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">🎁 هداياي</h2><span class="pill">${Object.keys(save.gifts).length} / ${NLV}</span></div>
      <div class="gifts">${cells}</div>${K.HELP}`, "g0");
    K.app.querySelectorAll("canvas[data-g]").forEach((c) => { const g = GIFTS[+c.dataset.g]; D.drawGift(c.getContext("2d"), g, 80, 55, Math.min(12, 150 / g.art[0].length, 100 / g.art.length), 1); });
  }
  function giftView(i) {
    K.begin();
    const g = GIFTS[i];
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">${g.name}</h2><span></span></div>
      <canvas id="gv" width="720" height="420" class="giftbig"></canvas>${K.HELP}`, "back");
    animGift(document.getElementById("gv"), g, i);
  }
  function animGift(c, g, seed) {
    const x = c.getContext("2d"), t0 = performance.now(), sz = Math.min(44, 640 / g.art[0].length, 380 / g.art.length);
    const go = (ts) => {
      if (!document.body.contains(c)) return;
      const p = Math.min(1.2, (ts - t0) / 1400);
      x.clearRect(0, 0, c.width, c.height);
      D.drawGift(x, g, c.width / 2, c.height / 2 + Math.sin(ts / 400) * 6 * (p >= 1 ? 1 : 0), sz, p, seed);
      requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }

  // ---------------------------------------------------------------- اللعب
  const P = { w: 26, h: 56, MAXV: 250, ACC: 1500, AIR: 1000, FRIC: 1700, JUMP: 760, GH: 1600, GF: 2800, SPRING: 960, STEP: 20 };
  let L = null; // للاختبار

  function play(li) {
    const lv = buildLevel(li), w = lv.w, tiles = D.makeTiles(w), bg = D.makeBg(w);
    L = lv;
    const Wd = lv.W, grid = lv.grid, WPX = Wd * T;
    const tile = (c, r) => (c < 0 || c >= Wd ? 1 : r < 0 || r >= ROWS ? 0 : grid[r * Wd + c]);
    const solid = (c, r) => { const v = tile(c, r); return v === 1 || v === 2; };
    // صورة كل بلاطة (علوية أو داخلية) محسوبة مرة واحدة
    const spr = new Array(Wd * ROWS);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < Wd; c++) {
      const v = grid[r * Wd + c];
      spr[r * Wd + c] = v === 1 ? (r > 0 && tile(c, r - 1) !== 0 && tile(c, r - 1) !== 3 ? tiles.inner : tiles.top) : v === 2 ? tiles.brick : v === 3 ? tiles.plat : v === 4 ? tiles.up : v === 5 ? tiles.down : null;
    }
    const nStars = lv.items.filter((i) => i.t === "s").length;
    const p = { w: P.w, h: P.h, x: lv.start.x, y: lv.start.y - P.h, vx: 0, vy: 0, dir: 1, ground: false, coyote: 0, jumpBuf: 0, springing: false, ph: 0, inv: 0, mover: null, throwT: 9, cool: 0 };
    const st = { hearts: 3, stars: 0, cubes: 0, t: 0, state: "play", sT: 0, banner: 2.6, msg: "", msgT: 0, cp: null };
    const shots = [], parts = [], pops = [];
    const keys = { L: false, R: false, J: false };
    let cam = 0, raf = 0, last = 0, paused = false;
    const snow = w.bg === "snow" ? Array.from({ length: 40 }, (_, i) => ({ x: (i * 97) % VW, y: (i * 53) % VH, s: 1 + (i % 3) })) : null;

    document.body.classList.add("playing");
    K.paint(`<div id="pause" class="pause"><div class="pcard"><h1>استراحة ⏸️</h1>
      <div class="nav">
        <button class="btn f go" ${K.act("resume", () => setPause(false))}>▶️ متابعة</button>
        <button class="btn f" ${K.act("restart", () => K.replace(play, li))}>🔁 من البداية</button>
        <button class="btn f" ${K.act("map", () => K.replace(mapScreen))}>🗺️ المراحل</button>
      </div></div></div>`, "resume");

    function setPause(on) {
      if (on && st.state !== "play") return;
      paused = on;
      document.getElementById("pause").classList.toggle("on", on);
      if (on) K.focus(K.app.querySelector('[data-k="resume"]'));
      keys.L = keys.R = keys.J = false;
      last = 0;
    }

    const JUMPK = { ArrowUp: 1, " ": 1, w: 1, W: 1 }, THROWK = { Enter: 1, ArrowDown: 1, x: 1, X: 1, f: 1, F: 1 };
    const pad = { prev: [], ctl: null, j: false, t: false };
    const pressJump = () => { p.jumpBuf = 0.15; };
    K.mode = {
      key(e) {
        if (paused) { if (e.key === "Backspace") { setPause(false); return true; } return false; }
        if (e.key === "Backspace") { setPause(true); return true; }
        if (e.pad) return true;
        if (e.key === "ArrowLeft") keys.L = true;
        else if (e.key === "ArrowRight") keys.R = true;
        else if (JUMPK[e.key]) { if (!keys.J && !e.repeat) pressJump(); keys.J = true; }
        else if (THROWK[e.key]) { if (!e.repeat) throwIt(); }
        else return false;
        return true;
      },
      keyup(e) {
        if (e.key === "ArrowLeft") keys.L = false;
        else if (e.key === "ArrowRight") keys.R = false;
        else if (JUMPK[e.key]) keys.J = false;
      },
      poll(pads) {
        if (!pads.length) { pad.prev = []; pad.ctl = null; return false; }
        const g = pads[0], b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
        if (paused) { pad.ctl = null; pad.j = b(0) || b(12); pad.t = b(2); const held = pad.prev[1] && b(1); pad.prev = g.buttons.map((x) => x.pressed); return held; }
        if ((b(1) && !pad.prev[1]) || (b(9) && !pad.prev[9])) setPause(true);
        const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        const j = b(0) || b(12) || ay < -0.75, t = b(2) || b(3) || b(5) || b(7);
        if (j && !pad.j) pressJump();
        if (t && !pad.t) throwIt();
        pad.j = j; pad.t = t;
        pad.ctl = { L: b(14) || ax < -0.35, R: b(15) || ax > 0.35, J: j };
        pad.prev = g.buttons.map((x) => x.pressed);
        return true;
      },
      stop() { cancelAnimationFrame(raf); document.body.classList.remove("playing"); window.removeEventListener("blur", blur); },
    };
    const blur = () => { keys.L = keys.R = keys.J = false; };
    window.addEventListener("blur", blur);

    // ---------------- الأصوات
    const snd = {
      jump() { K.tone(392, 0.09, "square", 0.05); K.tone(587, 0.12, "square", 0.04, 0.06); },
      star() { K.tone(1175, 0.07, "triangle", 0.09); K.tone(1568, 0.12, "triangle", 0.08, 0.06); },
      cube() { [660, 880, 1100, 1320].forEach((f, i) => K.tone(f, 0.12, "triangle", 0.1, i * 0.06)); },
      throw() { K.tone(300, 0.08, "triangle", 0.1); K.tone(500, 0.08, "triangle", 0.06, 0.04); },
      pop() { K.tone(880, 0.06, "square", 0.05); K.tone(1320, 0.1, "triangle", 0.08, 0.05); },
      boing() { K.tone(220, 0.08, "sine", 0.15); K.tone(440, 0.12, "sine", 0.12, 0.06); K.tone(660, 0.16, "sine", 0.1, 0.12); },
      hurt() { K.tone(330, 0.12, "sawtooth", 0.05); K.tone(220, 0.2, "sawtooth", 0.05, 0.1); },
      flag() { [523, 659, 784].forEach((f, i) => K.tone(f, 0.18, "triangle", 0.1, i * 0.1)); },
      heart() { K.tone(784, 0.1, "sine", 0.12); K.tone(1047, 0.18, "sine", 0.12, 0.08); },
    };
    const say = (m, t = 1.4) => { st.msg = m; st.msgT = t; };
    const burst = (x, y, col, n = 10, sp = 220) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random(); parts.push({ x, y, vx: Math.cos(a) * sp * (0.5 + Math.random() * 0.5), vy: Math.sin(a) * sp * (0.5 + Math.random() * 0.5) - 60, life: 0.6, col }); } };

    // ---------------- القذف
    function throwIt() {
      if (paused || st.state !== "play" || p.cool > 0 || shots.length >= 3) return;
      p.cool = 0.32; p.throwT = 0;
      shots.push({ x: p.x + p.w / 2 + p.dir * 16, y: p.y + 18, vx: p.dir * 560 + p.vx * 0.4, vy: -260, b: 0, life: 1.6, rot: 0 });
      snd.throw();
    }
    function fling(e, dir) {
      e.dead = true; e.fly = { vx: dir * 260, vy: -520, rot: 0 };
      burst(e.x, e.y - 15, "#fde047", 10);
      pops.push({ x: e.x, y: e.y - 40, t: 0.8 });
      snd.pop();
    }

    // ---------------- الحركة والتصادم
    function hurt(fromX) {
      if (p.inv > 0 || st.state !== "play") return;
      st.hearts--; snd.hurt();
      p.inv = 1.6; p.vy = -420; p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 230;
      if (st.hearts <= 0) fail();
    }
    function respawn() {
      const c = st.cp || lv.start;
      p.x = c.x - p.w / 2; p.y = c.y - P.h - 2; p.vx = p.vy = 0; p.inv = 1.4; p.mover = null; p.springing = false;
      cam = Math.max(0, Math.min(WPX - VW, p.x - 380));
    }
    function fail() { st.state = "fail"; st.sT = 0; }

    function stepPlayer(dt) {
      const pc = pad.ctl || {};
      const left = keys.L || pc.L, right = keys.R || pc.R, held = keys.J || pc.J;
      const ice = w.ice ? 0.45 : 1;
      const want = (right ? 1 : 0) - (left ? 1 : 0);
      if (want) {
        const acc = (p.ground ? P.ACC * ice : P.AIR) * dt;
        if (p.vx * want < P.MAXV) p.vx = Math.min(P.MAXV, Math.max(-P.MAXV, p.vx + want * acc * (p.vx * want < 0 ? 1.8 : 1)));
        p.dir = want;
      } else if (p.ground) {
        const f = P.FRIC * ice * dt;
        p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
      }
      p.coyote = p.ground ? 0.1 : p.coyote - dt;
      p.jumpBuf -= dt;
      if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -P.JUMP; p.ground = false; p.coyote = 0; p.jumpBuf = 0; p.mover = null; snd.jump(); }
      const g = p.vy < 0 && (held || p.springing) ? P.GH : P.GF;
      p.vy = Math.min(900, p.vy + g * dt);
      if (p.vy >= 0) p.springing = false;

      // تحمله المنصة المتحركة
      if (p.mover) p.x += p.mover.dx;
      const wasGround = p.ground;
      // أفقياً
      p.x += p.vx * dt;
      if (p.x < 0) { p.x = 0; p.vx = 0; }
      const top = p.y, bot = p.y + p.h;
      if (p.vx !== 0 || p.mover) {
        const goingR = p.vx > 0 || (p.vx === 0 && p.mover && p.mover.dx > 0);
        const cx = Math.floor((goingR ? p.x + p.w - 0.01 : p.x) / T);
        for (let r = Math.floor(top / T); r <= Math.floor((bot - 0.01) / T); r++) {
          if (!solid(cx, r)) continue;
          const tTop = r * T;
          if (wasGround && bot - tTop <= P.STEP && !solid(cx, r - 1) && !solid(cx, r - 2)) { p.y = tTop - p.h; continue; }
          if (goingR) p.x = cx * T - p.w; else p.x = (cx + 1) * T;
          p.vx = 0; break;
        }
      }
      // عمودياً
      const prevBot = p.y + p.h;
      p.y += p.vy * dt;
      p.ground = false; p.mover = null;
      const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.01) / T);
      if (p.vy > 0) {
        const b = p.y + p.h, r = Math.floor(b / T);
        let land = null;
        for (let c = c0; c <= c1; c++) {
          const v = tile(c, r);
          if (v === 1 || v === 2 || (v === 3 && prevBot <= r * T + 1)) land = r * T;
        }
        // المنحدرات (تحت منتصف القدمين)
        const mx = p.x + p.w / 2, mc = Math.floor(mx / T);
        for (let rr = r - 1; rr <= r + 1; rr++) {
          const v = tile(mc, rr);
          if (v !== 4 && v !== 5) continue;
          const lx = mx - mc * T, fy = v === 4 ? rr * T + T - lx : rr * T + lx;
          if (b >= fy - (wasGround ? 22 : 0) && prevBot <= fy + 16) land = land == null ? fy : Math.min(land, fy);
        }
        if (land != null) { p.y = land - p.h; p.vy = 0; p.ground = true; }
      } else if (p.vy < 0) {
        const r = Math.floor(p.y / T);
        for (let c = c0; c <= c1; c++) if (solid(c, r)) { p.y = (r + 1) * T; p.vy = 0; break; }
      }
      // عند الوقوف على المنحدر بلا سرعة عمودية
      if (p.vy === 0 && !p.ground) {
        const mx = p.x + p.w / 2, mc = Math.floor(mx / T), b = p.y + p.h;
        for (let rr = Math.floor(b / T) - 1; rr <= Math.floor(b / T) + 1; rr++) {
          const v = tile(mc, rr); if (v !== 4 && v !== 5) continue;
          const lx = mx - mc * T, fy = v === 4 ? rr * T + T - lx : rr * T + lx;
          if (Math.abs(b - fy) < 22) { p.y = fy - p.h; p.ground = true; }
        }
      }
      // المنصات المتحركة والنوابض
      for (const e of lv.ents) {
        if (e.t === "mov" && p.vy >= 0) {
          const b = p.y + p.h;
          if (prevBot <= e.y + 2 + Math.abs(e.dx) && b >= e.y && p.x + p.w > e.x + 4 && p.x < e.x + e.w - 4) { p.y = e.y - p.h; p.vy = 0; p.ground = true; p.mover = e; }
        } else if (e.t === "spring" && p.vy > 0) {
          const topY = e.y - 18, b = p.y + p.h;
          if (prevBot <= topY + 8 && b >= topY && Math.abs(p.x + p.w / 2 - e.x) < 24) { p.y = topY - p.h; p.vy = -P.SPRING; p.springing = true; p.ground = false; e.sq = 1; snd.boing(); }
        }
      }
      if (p.ground) p.ph += Math.abs(p.vx) * dt * 0.045;
      if (p.y > VH + 80) {
        st.hearts--; snd.hurt();
        if (st.hearts <= 0) fail(); else { respawn(); say("أوه! انتبه للحفرة 🙂"); }
      }
    }

    function step(dt) {
      st.t += dt;
      if (st.banner > 0) st.banner -= dt;
      if (st.msgT > 0) st.msgT -= dt;
      p.cool -= dt; p.throwT += dt;
      if (p.inv > 0) p.inv -= dt;
      for (const e of lv.ents) {
        if (e.t === "mov") { const nx = e.x + e.dir * e.sp * dt; if (nx < e.a || nx > e.b) e.dir *= -1; const cx = Math.max(e.a, Math.min(e.b, nx)); e.dx = cx - e.x; e.x = cx; }
        else if (e.t === "spring") e.sq = Math.max(0, e.sq - dt * 4);
      }
      if (st.state === "play") stepPlayer(dt);
      else if (st.state === "win") {
        st.sT += dt;
        p.x += (lv.door.x - p.w / 2 - p.x) * Math.min(1, dt * 6); p.vx = 0;
        if (st.sT > 1.3) { finish(); return; }
      } else if (st.state === "fail") {
        st.sT += dt;
        if (st.sT > 2.2) { st.hearts = 3; st.state = "play"; respawn(); }
      }
      // المخلوقات
      const near = (x) => x > cam - 300 && x < cam + VW + 300;
      for (const e of lv.ents) {
        if (e.fly) { e.fly.vy += 1500 * dt; e.x += e.fly.vx * dt; e.y += e.fly.vy * dt; e.fly.rot += dt * 10; continue; }
        if (e.dead) continue;
        if (e.t === "walk") {
          if (!near(e.x)) continue;
          e.x += e.dir * e.sp * dt;
          const fc = Math.floor((e.x + e.dir * (e.w / 2 + 2)) / T), fr = Math.floor(e.y / T);
          const g = tile(fc, fr);
          if (solid(fc, fr - 1) || !(g === 1 || g === 2)) e.dir *= -1;
        } else if (e.t === "fly") {
          const ox = e.x;
          e.x = e.x0 + Math.sin(st.t * 0.9 + e.ph) * T * 1.6; e.y = e.y0 + Math.sin(st.t * 2.4 + e.ph) * T * 0.7 + 12;
          e.dir = e.x >= ox ? 1 : -1;
        } else continue;
        // عمر والمخلوق
        if (st.state !== "play") continue;
        const ex0 = e.x - e.w / 2, ey0 = e.y - e.h;
        if (p.x + p.w > ex0 + 3 && p.x < ex0 + e.w - 3 && p.y + p.h > ey0 + 3 && p.y < e.y - 2) {
          if (p.vy > 60 && p.y + p.h - p.vy * dt <= ey0 + 14) {
            e.dead = true; burst(e.x, e.y - e.h / 2, "#fff", 12); pops.push({ x: e.x, y: e.y - 40, t: 0.8 }); snd.pop();
            p.vy = -(keys.J || (pad.ctl && pad.ctl.J) ? 700 : 480); p.springing = true;
          } else hurt(e.x);
        }
      }
      // ما قذفه عمر
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.vy += 1400 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vx * dt * 0.05; s.life -= dt;
        const c = Math.floor(s.x / T), r = Math.floor((s.y + 6) / T), v = tile(c, r);
        let gone = s.life <= 0 || s.y > VH + 40 || s.x < cam - 50 || s.x > cam + VW + 50;
        if (v === 1 || v === 2 || v === 4 || v === 5 || (v === 3 && s.vy > 0)) {
          if (solid(c, Math.floor(s.y / T)) && s.vy < 400) gone = true;
          else if (s.b++ < 2 && s.vy > 0) { s.y = r * T - 6; s.vy = -s.vy * 0.55; } else gone = true;
        }
        for (const e of lv.ents) {
          if (gone) break;
          if ((e.t !== "walk" && e.t !== "fly") || e.dead) continue;
          if (Math.abs(s.x - e.x) < e.w / 2 + 6 && s.y > e.y - e.h - 6 && s.y < e.y + 6) { fling(e, Math.sign(s.vx) || 1); gone = true; }
        }
        if (gone) { burst(s.x, s.y, w.hold.c1, 5, 120); shots.splice(i, 1); }
      }
      // الجمع
      if (st.state === "play") for (const it of lv.items) {
        if (it.got) continue;
        if (Math.abs(p.x + p.w / 2 - it.x) < 26 && it.y > p.y - 14 && it.y < p.y + p.h + 14) {
          it.got = true;
          if (it.t === "s") { st.stars++; snd.star(); burst(it.x, it.y, "#facc15", 6, 140); }
          else if (it.t === "q") { st.cubes++; snd.cube(); burst(it.x, it.y, D.CUBE_COLS[it.c], 14); say(`مكعب ${st.cubes} من ${NCUBE} 🎁`); }
          else if (it.t === "H") { if (st.hearts < 3) st.hearts++; snd.heart(); burst(it.x, it.y, "#f43f5e", 10); }
        }
      }
      // نقطة التفتيش والباب
      if (lv.cp && !lv.cp.on && p.x > lv.cp.x - 20) { lv.cp.on = true; st.cp = lv.cp; snd.flag(); say("نقطة تفتيش! 🚩"); }
      if (st.state === "play" && Math.abs(p.x + p.w / 2 - lv.door.x) < 18 && p.y + p.h > lv.door.y - 60) { st.state = "win"; st.sT = 0; K.sfx.win(); }
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.vy += 600 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if ((q.life -= dt) <= 0) parts.splice(i, 1); }
      for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].t -= dt) <= 0) pops.splice(i, 1);
      // الكاميرا
      const tgt = Math.max(0, Math.min(WPX - VW, p.x - 380));
      cam += (tgt - cam) * Math.min(1, dt * 7);
    }

    // ---------------- الرسم
    function layer(img, f, y) {
      const o = -((cam * f) % VW);
      ctx.drawImage(img, o, y); ctx.drawImage(img, o + VW, y);
    }
    function render() {
      const cx = Math.round(cam);
      ctx.drawImage(bg.sky, 0, 0);
      layer(bg.far, 0.15, VH - 320);
      layer(bg.near, 0.4, VH - 260);
      if (snow) { ctx.fillStyle = "rgba(255,255,255,.9)"; for (const s of snow) { const y = (s.y + st.t * 30 * s.s) % VH, x = (s.x - cam * 0.3 + Math.sin(st.t + s.y) * 10) % VW; ctx.fillRect(x < 0 ? x + VW : x, y, s.s + 1, s.s + 1); } }
      ctx.save(); ctx.translate(-cx, 0);
      for (const dcr of lv.decor) if (dcr.x > cx - 40 && dcr.x < cx + VW + 40) { const im = D.emo(dcr.e, 30); ctx.drawImage(im, dcr.x - im.width / 2, dcr.y - im.height + 6); }
      const c0 = Math.max(0, Math.floor(cx / T)), c1 = Math.min(Wd - 1, c0 + Math.ceil(VW / T) + 1);
      for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) { const s = spr[r * Wd + c]; if (s) ctx.drawImage(s, c * T, r * T); }
      if (lv.cp) D.drawFlag(ctx, lv.cp.x, lv.cp.y, lv.cp.on, st.t, w.cards[0]);
      D.drawDoor(ctx, lv.door.x, lv.door.y, st.t, w.plat);
      for (const it of lv.items) {
        if (it.got || it.x < cx - 40 || it.x > cx + VW + 40) continue;
        const bob = Math.sin(st.t * 3 + it.x * 0.05) * 3;
        if (it.t === "s") { const sc = 0.75 + Math.abs(Math.sin(st.t * 2 + it.x)) * 0.1; ctx.drawImage(D.star, it.x - 15 * sc * 1.33, it.y - 15 * sc * 1.33 + bob, 40 * sc, 40 * sc); }
        else if (it.t === "q") { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(it.x, it.y + bob, 24 + Math.sin(st.t * 5) * 2, 0, 7); ctx.fill(); ctx.drawImage(D.cube[it.c], it.x - 18, it.y - 20 + bob); }
        else if (it.t === "H") ctx.drawImage(D.heart, it.x - 18, it.y - 20 + bob, 36, 36);
      }
      for (const e of lv.ents) {
        if (e.t === "mov") { ctx.drawImage(tiles.plat, e.x, e.y); ctx.drawImage(tiles.plat, e.x + T, e.y); ctx.drawImage(tiles.plat, e.x + 2 * T, e.y); continue; }
        if (e.t === "spring") { D.drawSpring(ctx, e.x, e.y, e.sq); continue; }
        if (e.x < cx - 60 || e.x > cx + VW + 60 || (e.dead && !e.fly) || e.y > VH + 60) continue;
        ctx.save();
        if (e.fly) { ctx.translate(e.x, e.y - 15); ctx.rotate(e.fly.rot); ctx.translate(-e.x, -e.y + 15); }
        if (e.t === "walk") D.walkers[w.walker](ctx, e.x, e.y, e.dir, st.t + e.x * 0.01);
        else D.flyers[w.flyer](ctx, e.x, e.y - 12, e.dir, st.t, w.bg === "castle", w.bg === "snow" ? "#60a5fa" : "#f97316");
        ctx.restore();
      }
      for (const s of shots) D.drawHeld(ctx, s.x, s.y, w.hold, 8, s.rot);
      // عمر
      if (!(p.inv > 0 && Math.floor(p.inv * 10) % 2) && st.state !== "fail") {
        const pose = p.throwT < 0.2 ? "throw" : !p.ground ? "air" : Math.abs(p.vx) > 20 ? "run" : "idle";
        ctx.save();
        if (st.state === "win") { const k = Math.max(0, 1 - st.sT / 1.2); ctx.globalAlpha = k; }
        D.drawOmar(ctx, p.x + p.w / 2, p.y + p.h, p.dir, p.ph, pose, p.cool > 0 ? null : w.hold, p.throwT);
        ctx.restore();
      }
      for (const q of parts) { ctx.globalAlpha = Math.max(0, q.life / 0.6); ctx.fillStyle = q.col; ctx.fillRect(q.x - 3, q.y - 3, 6, 6); }
      ctx.globalAlpha = 1;
      ctx.font = "bold 26px Baloo, Tahoma, sans-serif"; ctx.textAlign = "center";
      for (const q of pops) { ctx.globalAlpha = Math.min(1, q.t * 2); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 5; const y = q.y - (0.8 - q.t) * 40; ctx.strokeText("بوب!", q.x, y); ctx.fillText("بوب!", q.x, y); }
      ctx.globalAlpha = 1;
      ctx.restore();
      hud();
    }
    function pill(x, y, wd) { ctx.fillStyle = "rgba(255,255,255,.82)"; D.rr(ctx, x, y, wd, 44, 22); ctx.fill(); }
    function hud() {
      pill(14, 12, 150);
      for (let i = 0; i < 3; i++) ctx.drawImage(i < st.hearts ? D.heart : D.heartOff, 24 + i * 44, 14, 40, 40);
      pill(VW - 292, 12, 278);
      ctx.drawImage(D.star, VW - 284, 14, 38, 38);
      ctx.font = "bold 28px Baloo, Tahoma, sans-serif"; ctx.fillStyle = "#1e3a8a"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(String(st.stars), VW - 242, 35);
      for (let i = 0; i < NCUBE; i++) { ctx.globalAlpha = i < st.cubes ? 1 : 0.25; ctx.drawImage(D.cube[i % D.CUBE_COLS.length], VW - 190 + i * 29, 16, 32, 32); }
      ctx.globalAlpha = 1;
      const txt = (s, y, size, a = 1) => { ctx.globalAlpha = a; ctx.font = `bold ${size}px Baloo, Tahoma, sans-serif`; ctx.textAlign = "center"; ctx.lineWidth = size / 5; ctx.strokeStyle = "#1e3a8a"; ctx.fillStyle = "#fff"; ctx.strokeText(s, VW / 2, y); ctx.fillText(s, VW / 2, y); ctx.globalAlpha = 1; };
      if (st.banner > 0) txt(`المرحلة ${li + 1} · ${w.name}`, 130, 54, Math.min(1, st.banner));
      if (st.msgT > 0 && st.state === "play") txt(st.msg, 100, 34, Math.min(1, st.msgT * 2));
      if (st.state === "fail") { ctx.fillStyle = "rgba(30,58,138,.35)"; ctx.fillRect(0, 0, VW, VH); txt("لا بأس! لنحاول مرة أخرى 💪", VH / 2, 52); }
      if (st.state === "win") txt("وصلت! أحسنت يا عمر 🎉", VH / 2 - 60, 56);
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (paused) return;
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
      last = ts;
      const n = dt > 0.021 ? 2 : 1;
      for (let i = 0; i < n; i++) { step(dt / n); if (st.state === "done") return; }
      render();
    }
    function finish() {
      st.state = "done";
      const s = st.cubes >= NCUBE ? 3 : st.cubes >= 4 ? 2 : 1;
      save.best[li] = Math.max(save.best[li] || 0, s);
      save.gifts[li] = true;
      if (save.unlocked < li + 2) save.unlocked = Math.min(NLV, li + 2);
      save.save();
      earn(li);
      K.replace(winScreen, { li, s, stars: st.stars, nStars, cubes: st.cubes });
    }
    // للاختبار
    window.__omar = { p, st, lv, keys, tp(x, y) { p.x = x; p.y = (y == null ? 0 : y); p.vx = p.vy = 0; cam = Math.max(0, Math.min(WPX - VW, p.x - 380)); }, throwIt };
    respawn(); st.cp = null;
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- نهاية المرحلة: الهدية تتكوّن من المكعبات
  function winScreen(r) {
    K.begin();
    const g = GIFTS[r.li], nxt = r.li + 1 < NLV;
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">🎁 صنعت ${g.name}!</h2><span class="pill">المرحلة ${r.li + 1}</span></div>
      <canvas id="gv" width="720" height="330" class="giftwin"></canvas>
      <div class="stars sm">${K.starsHtml(r.s)}</div>
      <div class="sub">⭐ ${r.stars} من ${r.nStars} نجمة · 🧊 ${r.cubes} من ${NCUBE} مكعبات <span id="earn"></span></div>
      <div class="nav">
        <button class="btn f" ${K.act("again", () => K.replace(play, r.li))}><span class="emo">🔁</span> مرة أخرى</button>
        ${nxt ? `<button class="btn f go" ${K.act("next", () => K.replace(play, r.li + 1))}>المرحلة ${r.li + 2} ←</button>` : ""}
        <button class="btn f" ${K.act("map", () => K.replace(mapScreen))}><span class="emo">🗺️</span> المراحل</button>
      </div>`, nxt ? "next" : "map");
    animGift(document.getElementById("gv"), g, r.li);
    K.later(() => K.confetti(40, "⭐🎉✨🎁🧊"), 1200);
    K.later(() => K.sfx.win(), 1200);
  }

  function earn(li) {
    const day = new Date().toDateString();
    if (save.earned[li] === day) return;
    save.earned[li] = day; save.save();
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1, game: GAME, reason: `أنهى المرحلة ${li + 1} (${worldOf(li).name})` }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.added) { const e = document.getElementById("earn"); if (e) e.textContent = ` · +${d.added} ⭐ في رصيدك!`; } })
      .catch(() => {});
  }

  window.__omarDbg = { buildLevel, play: (li) => K.show(play, li), get L() { return L; } };
  K.start(home);
})();
