// لعبة المنزل — ابنِ بيتك ورتّب غرفك وحديقتك، واجمع من الغابة الخشب والحجارة والطعام والكنوز، واصنع أثاثك.
// التحكم: الأسهم للمشي · Enter/✕ للتفاعل مع ما أمامك (أو فتح القائمة) · Backspace/○ القائمة أو الرجوع.
// يد التحكم: □ الحقيبة · △ الصنع · Options القائمة. اللمس/الفأرة: المس مكاناً لتمشي إليه.
(() => {
  "use strict";
  const GAME = "لعبة المنزل", TS = 48, W = 60, H = 44;
  const { ITEMS, RECIPES, TABS, OBJ, TOYS, CROPS, ANIMALS, WALLC } = D;
  const A = ART;
  const HX = 18, HY = 16; // وسط البيت الأول
  const DX = [0, 0, -1, 1], DY = [1, -1, 0, 0];
  const save = K.store("homegame", { char: null, world: null, inv: {}, time: 420, day: 1, energy: 100, food: 80, p: null, wall: 0, made: {}, earned: {}, tip: 0 });
  const LITE = (() => {
    try { if (parent !== window && parent.document.documentElement.classList.contains("lite")) return true; } catch {}
    return (navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2;
  })();
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  const $ = (s) => K.app.querySelector(s);
  const girl = () => !save.char || save.char.g !== "b";
  const gw = (f, m) => (girl() ? f : m);
  const rnd = Math.random, ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DEF_CHAR = { g: "g", hair: 1, hc: 1, skin: 1, top: 0, oc: 0, acc: 1 };

  // ---------------------------------------------------------------- العالم
  let G, O, AN, seed;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const I = (x, y) => y * W + x;
  function rng(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function gen(sd) {
    const r = rng(sd), R = (a, b) => a + Math.floor(r() * (b - a + 1));
    G = new Uint8Array(W * H); O = new Array(W * H).fill(null); AN = [];
    const set = (x, y, o) => { if (inb(x, y)) O[I(x, y)] = o; };
    const forest = (x, y) => x >= 40 || y < 7;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (forest(x, y)) G[I(x, y)] = 1;
    // البحيرة
    for (let y = 26; y < 41; y++) for (let x = 2; x < 18; x++) {
      const d = ((x - 9) / 6.2) ** 2 + ((y - 33) / 4.8) ** 2;
      if (d < 1) G[I(x, y)] = 3; else if (d < 1.55) G[I(x, y)] = 2;
    }
    // الحقل
    for (let y = 31; y <= 38; y += 2) for (let x = 27; x <= 36; x++) G[I(x, y)] = 9;
    // الممرات
    for (let y = 20; y <= 25; y++) G[I(HX, y)] = 4;
    for (let x = 11; x <= 41; x++) G[I(x, 25)] = 4;
    for (let y = 25; y <= 29; y++) G[I(32, y)] = 4;
    for (let y = 25; y <= 27; y++) G[I(11, y)] = 4;
    // البيت الأول
    for (let y = 12; y <= 19; y++) for (let x = 14; x <= 22; x++) {
      const edge = x === 14 || x === 22 || y === 12 || y === 19;
      if (edge) set(x, y, { t: "wall" }); else G[I(x, y)] = 6;
    }
    set(HX, 19, { t: "door" }); set(16, 12, { t: "window" }); set(20, 12, { t: "window" }); set(14, 15, { t: "window" }); set(22, 16, { t: "window" });
    set(15, 13, { t: "bed" }); set(18, 15, { t: "rug" }); set(21, 13, { t: "pot" });
    // حدود العالم: أشجار كبيرة
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) set(x, y, { t: "bigtree" });
    const free = (x, y) => inb(x, y) && !O[I(x, y)] && (G[I(x, y)] === 0 || G[I(x, y)] === 1);
    const nearHome = (x, y) => Math.abs(x - HX) < 9 && Math.abs(y - HY) < 9;
    // الغابة
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (!free(x, y) || nearHome(x, y)) continue;
      const v = r();
      if (forest(x, y)) {
        if (v < 0.24) set(x, y, { t: "tree" });
        else if (v < 0.27) set(x, y, { t: "appletree", r: 1 });
        else if (v < 0.30) set(x, y, { t: "bush", r: 1 });
        else if (v < 0.335) set(x, y, { t: "rock" });
        else if (v < 0.35) set(x, y, { t: "cotton", r: 1 });
        else if (v < 0.37) set(x, y, { t: "wflower", v: R(0, 3) });
      } else if (G[I(x, y)] === 0) {
        if (v < 0.03) set(x, y, { t: "tree" });
        else if (v < 0.07) set(x, y, { t: "wflower", v: R(0, 3) });
        else if (v < 0.075) set(x, y, { t: "rock" });
        else if (v < 0.08 && x > 24) set(x, y, { t: "bush", r: 1 });
      }
    }
    // الحقل
    for (let y = 31; y <= 38; y += 2) for (let x = 27; x <= 36; x++) if (r() < 0.55) set(x, y, { t: "crop", v: R(0, 9) < 1 ? 3 : R(0, 2), r: 1 });
    // أشياء ثابتة لبداية جيدة
    [[44, 20], [46, 30], [50, 12], [54, 36]].forEach(([x, y]) => clearSet(x, y, { t: "goldrock" }));
    [[55, 22]].forEach(([x, y]) => clearSet(x, y, { t: "crystal" }));
    [[26, 22], [28, 21], [36, 18], [8, 21]].forEach(([x, y]) => clearSet(x, y, { t: "cotton", r: 1 }));
    [[24, 21], [30, 19], [12, 23]].forEach(([x, y]) => clearSet(x, y, { t: "appletree", r: 1 }));
    // الحديقة
    [[16, 21], [20, 21], [15, 22], [21, 22]].forEach(([x, y], k) => set(x, y, { t: "flower", v: k % 4 }));
    // أشياء مبعثرة
    for (let k = 0; k < 6; k++) spawnToy(r);
    // الحيوانات
    AN.push(mkAnimal("cat", 20, 23, true));
    AN.push(mkAnimal("rabbit", 30, 22, false)); AN.push(mkAnimal("chick", 34, 29, false));
    AN.push(mkAnimal("duck", 9, 33, false)); AN.push(mkAnimal("sheep", 26, 9, false));
    AN.forEach((a) => { const i = I(a.x, a.y); if (O[i] && OBJ[O[i].t].solid) O[i] = null; });
  }
  function clearSet(x, y, o) { if (inb(x, y)) O[I(x, y)] = o; }
  function mkAnimal(k, x, y, home) { return { k, x, y, px: x, py: y, fx: x, fy: y, mt: 1, home, hx: home ? HX + 1 : x, hy: home ? HY + 7 : y, tm: 1 + rnd() * 2, face: 1, hearts: 0 }; }
  function freeSpot(test, tries = 200, r = rnd) {
    for (let n = 0; n < tries; n++) {
      const x = 3 + Math.floor(r() * (W - 6)), y = 3 + Math.floor(r() * (H - 6));
      const i = I(x, y);
      if (O[i] || !(G[i] === 0 || G[i] === 1) || (P && P.x === x && P.y === y) || animalAt(x, y)) continue;
      if (test(x, y)) return [x, y];
    }
    return null;
  }
  function spawnToy(r = rnd) {
    const s = freeSpot((x, y) => Math.abs(x - HX) + Math.abs(y - HY) > 12, 200, r);
    if (s) O[I(s[0], s[1])] = { t: TOYS[Math.floor(r() * TOYS.length)], w: 1 };
  }

  function packWorld() {
    let g = ""; for (let i = 0; i < G.length; i++) g += String.fromCharCode(48 + G[i]);
    const o = []; for (let i = 0; i < O.length; i++) if (O[i] && O[i].t !== "bigtree") o.push([i, O[i]]);
    return { seed, g, o, an: AN.map((a) => ({ k: a.k, x: a.x, y: a.y, home: a.home, hx: a.hx, hy: a.hy })) };
  }
  function loadWorld(w) {
    seed = w.seed; G = new Uint8Array(W * H); O = new Array(W * H).fill(null);
    for (let i = 0; i < G.length; i++) G[i] = (w.g.charCodeAt(i) - 48) || 0;
    w.o.forEach(([i, o]) => (O[i] = o));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) O[I(x, y)] = { t: "bigtree" };
    AN = w.an.map((a) => Object.assign(mkAnimal(a.k, a.x, a.y, a.home), { hx: a.hx, hy: a.hy }));
  }
  function persist() {
    if (!G) return;
    save.world = packWorld();
    if (P) save.p = { x: P.x, y: P.y, dir: P.dir };
    save.save();
  }
  function newWorld() {
    seed = (Math.random() * 1e9) | 0; P = null; gen(seed);
    Object.assign(save, { inv: { wood: 3, stone: 2, apple: 2 }, time: 420, day: 1, energy: 100, food: 80, p: { x: HX, y: 20, dir: 0 }, wall: 0, made: {}, tip: 0 });
    persist();
  }
  function ensureWorld() { if (G) return; if (save.world && save.world.g) { try { loadWorld(save.world); return; } catch {} } newWorld(); }

  // ---------------------------------------------------------------- الحقيبة
  const inv = (k) => save.inv[k] || 0;
  const add = (k, n = 1) => { save.inv[k] = inv(k) + n; if (save.inv[k] <= 0) delete save.inv[k]; };
  const has = (need) => Object.entries(need).every(([k, n]) => inv(k) >= n);

  // ---------------------------------------------------------------- الأيقونات (من الرسوم نفسها)
  const ICON = {};
  function icon(id) {
    const key = id + (id === "wall" ? save.wall : "");
    if (ICON[key]) return ICON[key];
    const S = 96, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d");
    const it = ITEMS[id];
    if (A.item[id]) { g.scale(2, 2); A.item[id](g, WALLC[save.wall][1]); }
    else {
      const t = document.createElement("canvas"); t.width = 48; t.height = 96; const tg = t.getContext("2d"); tg.translate(0, 48);
      const o = { t: it.o, v: it.v, r: 1, on: true };
      A.obj[it.o](tg, o, 3, 3, WALLC[save.wall][1], 0);
      let b = [48, 96, 0, 0];
      try {
        const d = tg.getImageData(0, 0, 48, 96).data;
        for (let y = 0; y < 96; y++) for (let x = 0; x < 48; x++) if (d[(y * 48 + x) * 4 + 3] > 40) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
      } catch { b = [0, 0, 47, 95]; }
      const bw = b[2] - b[0] + 1, bh = b[3] - b[1] + 1, s = Math.min((S - 12) / bw, (S - 12) / bh, 2.4);
      g.drawImage(t, b[0], b[1], bw, bh, (S - bw * s) / 2, (S - bh * s) / 2, bw * s, bh * s);
    }
    return (ICON[key] = c.toDataURL());
  }
  const img = (id, cls = "") => `<img class="ic ${cls}" src="${icon(id)}" alt="">`;

  // ---------------------------------------------------------------- الرسم: ذاكرة الصور
  let SR = 1, Z = 1;
  const SPR = new Map(), GSP = new Map();
  function sprite(key, draw) {
    let s = SPR.get(key);
    if (!s) {
      s = document.createElement("canvas"); s.width = Math.ceil(TS * SR); s.height = Math.ceil(TS * 2 * SR);
      const c = s.getContext("2d"); c.scale(SR, SR); c.translate(0, TS); draw(c); SPR.set(key, s);
    }
    return s;
  }
  function gsprite(key, draw) {
    let s = GSP.get(key);
    if (!s) { s = document.createElement("canvas"); s.width = s.height = Math.ceil(TS * SR); const c = s.getContext("2d"); c.scale(SR, SR); draw(c); GSP.set(key, s); }
    return s;
  }
  const isWallish = (x, y) => inb(x, y) && O[I(x, y)] && OBJ[O[I(x, y)].t].wall;
  function objSprite(o, x, y) {
    const t = o.t, d = OBJ[t];
    if (d.wall) {
      const below = isWallish(x, y + 1) ? 1 : 0, wc = WALLC[save.wall][1];
      return sprite(`${t}:${save.wall}:${below}`, (c) => A.obj[t](c, o, x, y, wc, below));
    }
    let v = "";
    if (t === "tree" || t === "rock" || t === "bigtree" || t === "goldrock" || t === "wflower") v = ((A.hash(x, y) * 3) | 0) + ":" + (o.v || 0);
    if (t === "appletree" || t === "bush" || t === "cotton") v = o.r ? 1 : 0;
    if (t === "crop") v = (o.r ? 1 : 0) + ":" + o.v;
    if (t === "flower") v = o.v;
    if (t === "tv") v = o.on ? 1 : 0;
    if (t === "asapling") v = "a";
    const hx = (A.hash(x, y) * 3) | 0, hy = 1;
    return sprite(`${t}:${v}`, (c) => A.obj[t](c, o, t === "tree" || t === "rock" || t === "bigtree" || t === "goldrock" || t === "wflower" ? hx : 3, hy, WALLC[save.wall][1], 0));
  }
  // تنويع الأشجار: نستعمل x=hx و y=1 داخل الرسم
  function gMask(x, y, g) {
    let m = 0;
    const same = (a, b) => !inb(a, b) || G[I(a, b)] === g || (g === 4 && G[I(a, b)] === 5);
    if (same(x, y - 1)) m |= 1; if (same(x + 1, y)) m |= 2; if (same(x, y + 1)) m |= 4; if (same(x - 1, y)) m |= 8;
    return m;
  }
  function groundSprite(x, y, frame) {
    const g = G[I(x, y)];
    if (g === 3 || g === 4) { const m = gMask(x, y, g), v = ((A.hash(x, y) * 3) | 0); return gsprite(`${g}:${m}:${v}:${g === 3 ? frame : 0}`, (c) => A.ground(c, g, v, v + 1, m, frame)); }
    const v = g <= 2 ? ((A.hash(x, y) * 4) | 0) : 0;
    return gsprite(`${g}:${v}`, (c) => A.ground(c, g, v * 5 + 1, v * 3 + 2, 0, 0));
  }

  // ---------------------------------------------------------------- اللاعب والحالة
  let P = null, held = [], padDir = null, path = null, pendingAct = null;
  let ov = null, ovGuard = false, placing = null, sleeping = 0, sleepNight = false, running = false;
  let raf = 0, lastT = 0, acc30 = 0, T = 0, hudT = 0, saveT = 0, warnT = 0, nightWarned = -1, music = null;
  const parts = [], floats = [], shake = new Map();
  const speed = () => (save.energy <= 15 || save.food <= 12 ? 2.3 : 4.6);
  const front = () => [P.x + DX[P.dir], P.y + DY[P.dir]];
  function animalAt(x, y) { if (!AN) return null; for (const a of AN) if (a.x === x && a.y === y) return a; return null; }
  function passable(x, y, who) {
    if (!inb(x, y)) return false;
    const i = I(x, y), g = G[i];
    if (g === 3 && !(who && who.k === "duck")) return false;
    const o = O[i];
    if (o && OBJ[o.t].solid) return false;
    if (who !== P && P && P.x === x && P.y === y) return false;
    const a = animalAt(x, y); if (a && a !== who) return false;
    return true;
  }

  // ---------------------------------------------------------------- الأصوات
  const snd = {
    chop() { K.tone(180, 0.08, "triangle", 0.18); K.tone(120, 0.1, "sine", 0.12, 0.03); },
    mine() { K.tone(600, 0.05, "square", 0.05); K.tone(420, 0.08, "triangle", 0.1, 0.03); },
    pick() { K.tone(880, 0.07, "triangle", 0.12); K.tone(1175, 0.09, "triangle", 0.1, 0.06); },
    gem() { [1047, 1319, 1568, 2093].forEach((f, i) => K.tone(f, 0.14, "triangle", 0.09, i * 0.07)); },
    eat() { K.tone(300, 0.05, "square", 0.04); K.tone(360, 0.05, "square", 0.04, 0.09); K.tone(320, 0.05, "square", 0.04, 0.18); },
    place() { K.tone(520, 0.06, "sine", 0.15); K.tone(780, 0.1, "sine", 0.12, 0.05); },
    pet() { K.tone(988, 0.1, "sine", 0.1); K.tone(1319, 0.16, "sine", 0.1, 0.08); },
    no() { K.tone(240, 0.12, "sine", 0.1); },
    sleep() { [659, 523, 587, 440, 523].forEach((f, i) => K.tone(f, 0.45, "sine", 0.08, i * 0.4)); },
  };
  function playTune(o) {
    stopTune();
    const N = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
    let k = 0; music = { o, id: setInterval(() => { K.tone(N[k % N.length], 0.3, "triangle", 0.06); if (k % 2 === 0) K.tone(N[k % N.length] / 2, 0.4, "sine", 0.05); k++; }, 320) };
  }
  function stopTune() { if (music) { clearInterval(music.id); if (music.o) music.o.on = false; music = null; } }

  // ---------------------------------------------------------------- رسائل
  let toastT = 0;
  function toast(html, ms = 2600) {
    const t = $("#toast"); if (!t) return;
    t.innerHTML = html; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms);
  }
  function floatGain(x, y, id, n) { floats.push({ x: x * TS + TS / 2, y: y * TS, id, n, t: 0, im: null }); }
  function burst(x, y, col, n = 8, kind = 0) {
    if (LITE) n = Math.ceil(n / 2);
    for (let k = 0; k < n; k++) parts.push({ x: x * TS + TS / 2, y: y * TS + TS / 2, vx: (rnd() - 0.5) * 140, vy: -40 - rnd() * 110, t: 0, life: 0.6 + rnd() * 0.4, col, kind });
  }
  function hearts(x, y) { for (let k = 0; k < (LITE ? 2 : 4); k++) parts.push({ x: x * TS + TS / 2 + (rnd() - 0.5) * 20, y: y * TS, vx: (rnd() - 0.5) * 30, vy: -50 - rnd() * 30, t: 0, life: 1.2, col: "#f472b6", kind: 1, g: 0 }); }

  // ---------------------------------------------------------------- النجوم
  function earn(n, reason) {
    const day = new Date().toDateString();
    if (save.earned.d !== day) save.earned = { d: day, n: 0 };
    if (save.earned.n >= 8) return;
    n = Math.min(n, 8 - save.earned.n); save.earned.n += n; save.save();
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: n, game: GAME, reason }) })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.added) K.later(() => toast(`+${d.added} ⭐ في رصيدك!`), 1400); }).catch(() => {});
  }

  // ---------------------------------------------------------------- التفاعل
  function act() {
    if (placing) return place(...front());
    const [fx, fy] = front();
    const a = animalAt(fx, fy);
    if (a) return pet(a);
    if (!inb(fx, fy)) return openMenu();
    const i = I(fx, fy), o = O[i];
    if (!o) { if (G[i] === 3) { toast("ماء البحيرة صافٍ 💧"); burst(fx, fy, "#bae6fd", 6); K.tone(700, 0.1, "sine", 0.08); return; } return openMenu(); }
    const d = OBJ[o.t];
    const tired = () => { if (save.energy <= 3) { toast(gw("أنا متعبة جداً 😴 حان وقت النوم", "أنا متعب جداً 😴 حان وقت النوم")); return true; } return false; };
    switch (d.k) {
      case "chop": {
        if (tired()) return;
        o.h = (o.h || 0) + 1; shake.set(i, 0.25); snd.chop(); burst(fx, fy, "#5cc46f", 6); save.energy = Math.max(0, save.energy - 1);
        if (o.h >= 3) {
          O[i] = { t: "stump", g: 0 }; add("wood", 2); floatGain(fx, fy, "wood", 2); burst(fx, fy, "#c98f55", 8);
          if (rnd() < 0.35) { add("sapling"); K.later(() => floatGain(fx, fy, "sapling", 1), 300); }
        }
        break;
      }
      case "big": toast("هذه شجرة كبيرة جداً 🌲 لا نقطعها"); break;
      case "stump": toast("ستنمو الشجرة من جديد بعد يومين 🌱"); break;
      case "grow": toast("الشتلة تكبر… ستصير شجرة غداً 🌱"); break;
      case "apple": case "bush": case "cotton": {
        if (!o.r) { toast(o.t === "cotton" ? "سينمو القطن من جديد غداً ☁️" : "ستنضج الثمار من جديد غداً 🌙"); return; }
        o.r = 0; snd.pick(); shake.set(i, 0.2);
        const [id, n] = o.t === "apple" ? ["apple", ri(1, 2)] : o.t === "bush" ? ["berry", ri(2, 3)] : ["cotton", ri(1, 2)];
        add(id, n); floatGain(fx, fy, id, n);
        if (o.t === "apple" && rnd() < 0.2) { add("asapling"); K.later(() => floatGain(fx, fy, "asapling", 1), 300); }
        break;
      }
      case "crop": {
        if (!o.r) { toast("النبتة صغيرة، ستنضج غداً 🌱"); return; }
        o.r = 0; snd.pick();
        const id = CROPS[o.v][0], n = o.v === 3 || o.v === 2 ? 1 : ri(1, 2);
        add(id, n); floatGain(fx, fy, id, n); burst(fx, fy, "#a97848", 5);
        break;
      }
      case "mine": {
        if (tired()) return;
        o.h = (o.h || 0) + 1; shake.set(i, 0.2); snd.mine(); burst(fx, fy, "#cbd5e1", 5); save.energy = Math.max(0, save.energy - 1);
        if (o.h >= d.hits) {
          O[i] = null; const got = [];
          if (o.t === "rock") { got.push(["stone", ri(1, 2)]); if (rnd() < 0.12) got.push(["gold", 1]); if (rnd() < 0.06) got.push(["ruby", 1]); }
          if (o.t === "goldrock") { got.push(["gold", ri(1, 2)], ["stone", 1]); if (rnd() < 0.25) got.push(["ruby", 1]); }
          if (o.t === "crystal") { got.push(["diamond", 1]); if (rnd() < 0.4) got.push(["ruby", 1]); }
          got.forEach(([id, n], k) => { add(id, n); K.later(() => floatGain(fx, fy, id, n), k * 350); });
          if (got.some(([id]) => id === "gold" || id === "diamond" || id === "ruby")) {
            snd.gem(); burst(fx, fy, "#fde047", 12);
            const best = got.find(([id]) => id === "diamond") || got.find(([id]) => id === "ruby") || got.find(([id]) => id === "gold");
            toast(`واو! ${img(best[0], "sm")} ${ITEMS[best[0]].n}! ✨`);
          }
        }
        break;
      }
      case "wild": O[i] = null; add("fl" + (o.v || 0)); snd.pick(); floatGain(fx, fy, "fl" + (o.v || 0), 1); break;
      case "egg": O[i] = null; add("egg"); snd.pick(); floatGain(fx, fy, "egg", 1); break;
      case "wool": O[i] = null; add("cotton", 2); snd.pick(); floatGain(fx, fy, "cotton", 2); break;
      case "furn":
        if (o.w) { O[i] = null; add(o.t); snd.pick(); floatGain(fx, fy, o.t, 1); toast(`وجدتَ ${ITEMS[o.t].n}! ضعه في البيت 🏠`.replace("وجدتَ", gw("وجدتِ", "وجدتَ"))); break; }
        objMenu(fx, fy, o); return;
    }
    persist();
  }

  function pet(a) {
    const def = ANIMALS[a.k];
    snd.pet(); hearts(a.x, a.y); a.tm = 2.5;
    if (a.home) { toast(`${def.n} ${a.k === "cat" || a.k === "chick" || a.k === "duck" ? "سعيدة" : "سعيد"} 💕`); return; }
    if (def.food && inv(def.food) > 0) {
      add(def.food, -1); a.home = true;
      const s = homeSpot(); a.hx = s[0]; a.hy = s[1];
      hearts(a.x, a.y); K.later(() => hearts(a.x, a.y), 300);
      toast(`${img(def.food, "sm")} صار ${def.n} صديقك! سيعيش في حديقتك 🏡`, 3600);
      earn(2, "صار " + def.n + " صديقاً");
      persist();
    } else toast(`${def.n} يحب ${img(def.food, "sm")} ${ITEMS[def.food].n} — أحضره له ليصير صديقك`, 3400);
  }
  function homeSpot() { const pts = [[HX - 5, HY + 7], [HX + 6, HY + 7], [HX - 7, HY + 4], [HX + 8, HY + 3], [HX + 2, HY + 8]]; return pts[AN.filter((a) => a.home).length % pts.length]; }

  // استعمال الأثاث
  function useObj(x, y, o) {
    const u = OBJ[o.t].use;
    if (u === "sleep") return goSleep();
    if (u === "toggle") { o.on = o.on === false; toast(o.on ? "💡 أضاء!" : "أُطفئ"); snd.place(); }
    if (u === "tv") { o.on = !o.on; toast(o.on ? "📺 حان وقت الرسوم المتحركة!" : "أُطفئ التلفاز"); snd.place(); }
    if (u === "music") { if (o.on) { stopTune(); toast("توقفت الموسيقى"); } else { o.on = true; playTune(o); toast("🎵 موسيقى جميلة!"); } }
    if (u === "fridge") {
      if (o.d === save.day) toast("الثلاجة فارغة… ستمتلئ غداً ❄️");
      else { o.d = save.day; const f = K.pick(["apple", "corn", "straw", "egg", "carrot"]); add(f); floatGain(x, y, f, 1); toast(`${img(f, "sm")} وجدتَ في الثلاجة ${ITEMS[f].n}!`.replace("وجدتَ", gw("وجدتِ", "وجدتَ"))); snd.pick(); }
    }
    if (u === "sit") { if (o.d === save.day * 100 + ((save.time / 60) | 0)) { toast("استراحة لطيفة ☺️"); } else { o.d = save.day * 100 + ((save.time / 60) | 0); save.energy = Math.min(100, save.energy + 10); save.time += 20; toast("استراحة قصيرة… ⚡ +10"); } hearts(x, y); }
    if (u === "read") { toast("📖 قصة جميلة عن قطة تحب النجوم…"); hearts(x, y); }
    if (u === "play") { toast("🎈 ما أجمل اللعب!"); hearts(x, y); burst(x, y, "#fbbf24", 8); snd.pet(); }
    if (u === "hug") { toast("🤗 حضن دافئ!"); hearts(x, y); snd.pet(); }
    if (u === "fish") { toast("🐠 الأسماك تسبح سعيدة"); burst(x, y, "#bae6fd", 6); }
    if (u === "splash") { toast("💦 ماء النافورة بارد"); burst(x, y, "#bae6fd", 10); }
    if (u === "dress") { closeOv(); persist(); K.show(charScreen, true); return; }
    persist();
  }

  // ---------------------------------------------------------------- النوم والوقت
  const hour = () => (save.time / 60) % 24;
  const isNight = () => hour() >= 19 || hour() < 5;
  function goSleep() {
    closeOv();
    if (isNight()) { sleepNight = true; sleeping = 3.2; snd.sleep(); toast(gw("💤 تصبحين على خير…", "💤 تصبح على خير…"), 3000); }
    else if (save.energy >= 85) { toast(gw("لستُ متعبة الآن ☀️ لنلعب قليلاً!", "لستُ متعباً الآن ☀️ لنلعب قليلاً!")); }
    else { sleepNight = false; sleeping = 2; snd.sleep(); toast("😴 قيلولة قصيرة…", 2000); }
  }
  function wake() {
    if (sleepNight) {
      const d0 = Math.floor(save.time / 1440);
      save.time = (hour() >= 19 ? d0 + 1 : d0) * 1440 + 7 * 60; save.day = Math.floor(save.time / 1440) + 1; save.energy = 100; save.food = Math.max(25, save.food - 15);
      morning();
      toast(`☀️ صباح الخير! اليوم ${save.day}`, 3000);
      if (save.earned.sleep !== save.day) { save.earned.sleep = save.day; earn(1, "نام في سريره"); }
    } else { save.time += 120; save.energy = Math.min(100, save.energy + 35); toast("⚡ ارتحتُ قليلاً!"); }
    persist();
  }
  // كل صباح: تنمو الثمار، وتظهر صخور وأشياء جديدة
  function morning() {
    for (let i = 0; i < O.length; i++) {
      const o = O[i]; if (!o) continue;
      if (o.t === "stump") { o.g = (o.g || 0) + 1; if (o.g >= 2) O[i] = { t: "tree" }; }
      else if (o.t === "sapling") O[i] = { t: "tree" };
      else if (o.t === "asapling") O[i] = { t: "appletree", r: 1 };
      else if (o.t === "appletree" || o.t === "bush" || o.t === "crop" || o.t === "cotton") o.r = 1;
      else if (o.t === "tree") o.h = 0;
    }
    const count = (f) => O.reduce((n, o) => n + (o && f(o) ? 1 : 0), 0);
    const forest = (x, y) => x >= 40 || y < 7;
    let n = 4; while (n-- > 0 && count((o) => o.t === "rock") < 24) { const s = freeSpot(forest); if (s) O[I(...s)] = { t: "rock" }; }
    if (count((o) => o.t === "goldrock") < 3) { const s = freeSpot(forest); if (s) O[I(...s)] = { t: "goldrock" }; }
    if (count((o) => o.t === "crystal") < 1 || rnd() < 0.3) { const s = freeSpot((x) => x >= 48); if (s) O[I(...s)] = { t: "crystal" }; }
    if (count((o) => o.w) < 5) { spawnToy(); spawnToy(); }
    n = 6; while (n-- > 0 && count((o) => o.t === "wflower") < 40) { const s = freeSpot(() => true); if (s) O[I(...s)] = { t: "wflower", v: ri(0, 3) }; }
    AN.forEach((a) => {
      if (!a.home || (a.k !== "chick" && a.k !== "sheep")) return;
      for (let d = 0; d < 4; d++) { const x = a.x + DX[d], y = a.y + DY[d]; if (inb(x, y) && !O[I(x, y)] && G[I(x, y)] !== 3 && !(P.x === x && P.y === y)) { O[I(x, y)] = { t: a.k === "chick" ? "egg" : "wool" }; break; } }
    });
    nightWarned = -1;
  }

  // ---------------------------------------------------------------- الوضع: وضع الأشياء
  function startPlace(id, moved) {
    closeOv(); placing = { id, moved: moved || null };
    hud(true);
  }
  function stopPlace() {
    if (placing && placing.moved) add(placing.id);
    placing = null; hud(true); persist();
  }
  function canPlace(id, x, y) {
    if (!inb(x, y) || (P.x === x && P.y === y)) return false;
    const it = ITEMS[id], i = I(x, y), o = O[i];
    if (G[i] === 3) return false;
    if (it.g != null) return !(o && OBJ[o.t].wall) && G[i] !== it.g;
    if (o || animalAt(x, y)) return false;
    return true;
  }
  function place(x, y) {
    const id = placing.id, it = ITEMS[id];
    if (!canPlace(id, x, y)) { snd.no(); toast("لا يمكن الوضع هنا ✋"); return; }
    if (!placing.moved && inv(id) <= 0) { stopPlace(); return; }
    const i = I(x, y);
    if (it.g != null) G[i] = it.g;
    else O[i] = placing.moved || { t: it.o, v: it.v };
    if (!placing.moved && O[i] && OBJ[O[i].t].light) O[i].on = OBJ[O[i].t].use !== "tv";
    snd.place(); burst(x, y, "#fde68a", 6);
    if (placing.moved) placing = null;
    else { add(id, -1); if (inv(id) <= 0) placing = null; }
    if (!save.tip) save.tip = 1;
    hud(true); persist();
  }

  // ---------------------------------------------------------------- القوائم (فوق اللعب)
  let ovStack = [];
  function showOv(kind, html, focusKey) {
    ov = kind; K.begin(); const t = $("#toast"); if (t && kind !== "bag") t.classList.remove("on");
    const el = $("#ov"); el.innerHTML = html(); el.classList.add("on");
    const f = (focusKey && el.querySelector(`.f[data-k="${focusKey}"]`)) || el.querySelector(".f");
    K.focus(f); held = []; path = null;
  }
  function closeOv() { ov = null; ovStack = []; const el = $("#ov"); if (el) { el.classList.remove("on"); el.innerHTML = ""; } K.begin(); hud(true); }
  function ovBack() { const prev = ovStack.pop(); if (prev) prev(); else closeOv(); }
  const sub = (fn) => () => { ovStack.push(openMenu); fn(); };

  function openMenu() {
    persist();
    const [fx, fy] = front(), fg = inb(fx, fy) ? G[I(fx, fy)] : 0;
    const ctxBtn = (fg >= 5 && fg <= 8) || fg === 4 ? `<button class="mtile f" ${K.act("rmfloor", () => removeFloor(fx, fy))}><span class="emo">🧹</span><b>إزالة الأرضية</b></button>` : "";
    showOv("menu", () => `<div class="panel menu">
      <div class="ptop"><h2>🏠 ${GAME}</h2>${stats()}</div>
      <div class="mgrid">
        <button class="mtile f" style="--c:#f59e0b" ${K.act("bag", sub(() => openBag()))}><span class="emo">🎒</span><b>الحقيبة</b></button>
        <button class="mtile f" style="--c:#22c55e" ${K.act("craft", sub(() => openCraft("work")))}><span class="emo">🔨</span><b>الصنع</b></button>
        <button class="mtile f" style="--c:#ec4899" ${K.act("paint", sub(openPaint))}><span class="emo">🎨</span><b>ألوان البيت</b></button>
        <button class="mtile f" style="--c:#8b5cf6" ${K.act("me", () => { closeOv(); K.show(charScreen, true); })}><span class="emo">👧</span><b>شخصيتي</b></button>
        <button class="mtile f" style="--c:#0ea5e9" ${K.act("help", sub(openHelp))}><span class="emo">❓</span><b>كيف ألعب؟</b></button>
        ${ctxBtn}
        <button class="mtile f" style="--c:#64748b" ${K.act("exit", () => { closeOv(); persist(); K.home(); })}><span class="emo">🚪</span><b>الخروج</b></button>
        <button class="mtile f go" ${K.act("resume", closeOv)}><span class="emo">▶️</span><b>متابعة</b></button>
      </div></div>`, "resume");
  }
  function removeFloor(x, y) {
    const g = G[I(x, y)], back = { 4: null, 5: "path", 6: "floor_wood", 7: "floor_tile", 8: "floor_carpet" }[g];
    G[I(x, y)] = y < 7 || x >= 40 ? 1 : 0; if (back) add(back);
    closeOv(); snd.place(); persist();
  }
  function stats() {
    const h = Math.floor(hour()), m = Math.floor(save.time % 60);
    return `<div class="stats"><span class="pill">${isNight() ? "🌙" : "☀️"} ${h}:${String(m).padStart(2, "0")} · اليوم ${save.day}</span>
      <span class="pill bar"><i class="emo">⚡</i><span><b style="width:${save.energy}%;background:#facc15"></b></span></span>
      <span class="pill bar"><i class="emo">🍎</i><span><b style="width:${save.food}%;background:#f87171"></b></span></span></div>`;
  }

  const BAGTABS = [["all", "الكل"], ["food", "🍎 الطعام"], ["mat", "🪵 المواد"], ["furn", "🛋️ البيت"], ["build", "🧱 البناء"], ["garden", "🌷 الحديقة"]];
  function openBag(tab = "all", focus) {
    const list = Object.keys(ITEMS).filter((k) => inv(k) > 0 && (tab === "all" || ITEMS[k].c === tab));
    const pressItem = (k) => {
      const it = ITEMS[k];
      if (it.c === "food") {
        if (save.food >= 100) { toast(gw("لستُ جائعة الآن 😊", "لستُ جائعاً الآن 😊")); return; }
        add(k, -1); save.food = Math.min(100, save.food + it.food); save.energy = Math.min(100, save.energy + 4); snd.eat();
        toast(`${img(k, "sm")} لذيذ! 😋`); persist();
        openBag(tab, inv(k) > 0 ? "i" + k : null); return;
      }
      if (it.c === "mat") { toast(`${img(k, "sm")} ${it.n}: نصنع به أشياء في 🔨 الصنع`); return; }
      ovStack = []; startPlace(k);
    };
    showOv("bag", () => `<div class="panel">
      <div class="ptop"><h2>🎒 الحقيبة</h2>${stats()}</div>
      <div class="tabs">${BAGTABS.map(([k, n]) => `<button class="tab f ${k === tab ? "on" : ""}" ${K.act("t" + k, () => openBag(k))}>${n}</button>`).join("")}</div>
      ${list.length ? `<div class="igrid">${list.map((k) => `<button class="itile f" ${K.act("i" + k, () => pressItem(k))}>${img(k)}<b>${ITEMS[k].n}</b><span class="cnt">${inv(k)}</span>${ITEMS[k].c === "food" ? '<span class="hint">كُل</span>' : ITEMS[k].c !== "mat" ? '<span class="hint">ضَع</span>' : ""}</button>`).join("")}</div>`
        : `<div class="empty">الحقيبة فارغة هنا… اخرج إلى الغابة واجمع الأشياء 🌳</div>`}
      </div>`, focus || (list.length ? "i" + list[0] : "t" + tab));
  }

  function openCraft(tab = "work", focus) {
    const list = RECIPES[tab];
    const doCraft = (id, need, n) => {
      if (!has(need)) {
        snd.no();
        const miss = Object.entries(need).filter(([k, v]) => inv(k) < v).map(([k, v]) => `${img(k, "sm")} ${v - inv(k)}`).join(" ");
        toast(`ينقصنا: ${miss}`); return;
      }
      Object.entries(need).forEach(([k, v]) => add(k, -v)); add(id, n || 1);
      K.sfx.ok(); K.confetti(10, "✨⭐🌟");
      if (!save.made[id]) { save.made[id] = 1; earn(1, "صنع " + ITEMS[id].n); }
      persist();
      showOv("made", () => `<div class="panel small"><div class="made">${img(id, "big")}<h2>${ITEMS[id].n} جديد${n > 1 ? ` ×${n}` : ""}! ✨</h2><div class="sub">صار في الحقيبة</div>
        <div class="nav"><button class="btn f go" ${K.act("put", () => { ovStack = []; startPlace(id); })}>ضعه الآن</button>
        <button class="btn f" ${K.act("more", () => openCraft(tab, "r" + id))}>متابعة الصنع</button></div></div></div>`, "put");
    };
    showOv("craft", () => `<div class="panel">
      <div class="ptop"><h2>🔨 الصنع</h2><span class="sub">ماذا أحتاج؟ وماذا عندي؟</span></div>
      <div class="tabs">${Object.entries(TABS).map(([k, n]) => `<button class="tab f ${k === tab ? "on" : ""}" ${K.act("t" + k, () => openCraft(k))}>${n}</button>`).join("")}</div>
      <div class="rgrid">${list.map(([id, need, n]) => {
        const ok = has(need);
        return `<button class="rcard f ${ok ? "ok" : "no"}" ${K.act("r" + id, () => doCraft(id, need, n))}>${img(id)}<b>${ITEMS[id].n}${n > 1 ? ` <small>×${n}</small>` : ""}</b>
          <span class="needs">${Object.entries(need).map(([k, v]) => `<span class="need ${inv(k) >= v ? "y" : "n"}">${img(k, "sm")}<i>×${v}</i><small>${inv(k) >= v ? "✓" : `(${inv(k)})`}</small></span>`).join("")}</span></button>`;
      }).join("")}</div></div>`, focus || "r" + list[0][0]);
  }

  function openPaint() {
    showOv("paint", () => `<div class="panel small">
      <div class="ptop"><h2>🎨 لون جدران البيت</h2></div>
      <div class="swatches">${WALLC.map(([n, c], k) => `<button class="sw f ${k === save.wall ? "on" : ""}" style="--c:${c}" ${K.act("c" + k, () => { save.wall = k; SPR.clear(); persist(); snd.place(); K.confetti(8, "🎨✨"); openPaint(); })}><i></i><b>${n}</b></button>`).join("")}</div>
      <div class="sub">اختر لوناً فتتلوّن كل الجدران</div></div>`, "c" + save.wall);
  }

  function openHelp() {
    showOv("help", () => `<div class="panel small help2">
      <h2>كيف ألعب؟</h2>
      <ul>
        <li><b>الأسهم</b>: المشي. اضغط السهم مرة لتلتفت.</li>
        <li><b>Enter / ✕</b>: افعل شيئاً بما أمامك: اقطع الشجرة 🌳، اكسر الصخرة 🪨، اقطف الثمار 🍎، التقط الأشياء، ربّت على الحيوان 🐰</li>
        <li><b>Backspace / ○</b>: القائمة · <b>□</b> الحقيبة · <b>△</b> الصنع</li>
        <li>من الخشب والحجر والقطن <b>تصنع الأثاث</b>، ومن الذهب والألماس والياقوت <b>الأجهزة</b> 💎</li>
        <li>اختر من الحقيبة شيئاً ثم <b>ضعه</b> أمامك. اضغط على الأثاث لتحرّكه.</li>
        <li>في الليل 🌙 نم في السرير، وإذا جعت كُل من الحقيبة 🍎</li>
        <li>أطعم الحيوانات ما تحب فتعيش في حديقتك 🏡</li>
      </ul>
      <button class="btn f go" ${K.act("ok", ovBack)}>فهمت 👍</button></div>`, "ok");
  }

  function objMenu(x, y, o) {
    const d = OBJ[o.t], it = ITEMS[o.t === "flower" ? "fl" + (o.v || 0) : o.t];
    const USE = { sleep: "😴 نوم", toggle: o.on === false ? "💡 تشغيل" : "💡 إطفاء", tv: o.on ? "📺 إطفاء" : "📺 تشغيل", music: o.on ? "🎵 إيقاف" : "🎵 تشغيل",
      fridge: "❄️ افتح", sit: "🪑 اجلس", read: "📖 اقرأ", play: "🎈 العب", hug: "🤗 احضن", fish: "🐠 انظر", splash: "💦 المس الماء", dress: "👗 شخصيتي" };
    const id = o.t === "flower" ? "fl" + (o.v || 0) : o.t;
    showOv("obj", () => `<div class="panel small">
      <div class="made">${img(id, "big")}<h2>${it ? it.n : d.n}</h2></div>
      <div class="nav col">
        ${d.use ? `<button class="btn f go" ${K.act("use", () => useObj(x, y, o))}>${USE[d.use]}</button>` : ""}
        <button class="btn f" ${K.act("move", () => { O[I(x, y)] = null; if (music && music.o === o) stopTune(); startPlace(id, o); })}>✋ حرّكه</button>
        <button class="btn f" ${K.act("bag", () => { O[I(x, y)] = null; if (music && music.o === o) stopTune(); add(id); closeOv(); snd.pick(); floatGain(x, y, id, 1); persist(); })}>🎒 إلى الحقيبة</button>
        <button class="btn f" ${K.act("x", closeOv)}>إلغاء</button>
      </div></div>`, d.use ? "use" : "move");
  }

  // ---------------------------------------------------------------- واجهة اللعب
  let hudKey = "";
  function hint() {
    if (placing) {
      const it = ITEMS[placing.id], n = placing.moved ? "" : ` (${inv(placing.id)})`;
      return `<b>${it.n}${n}</b> · <b>✕</b> ضع هنا · <b>○</b> انتهيت`;
    }
    const [fx, fy] = front();
    const a = animalAt(fx, fy);
    if (a) return `<b>✕</b> ${a.home ? "ربّت على" : "سلّم على"} ${ANIMALS[a.k].n}`;
    if (!inb(fx, fy)) return "";
    const o = O[I(fx, fy)];
    if (!o) return G[I(fx, fy)] === 3 ? "الماء 💧" : `<b>✕</b> أو <b>○</b> القائمة`;
    const WD = { chop: "قطع الشجرة 🪓", apple: o.r ? "قطف التفاح" : "شجرة تفاح", bush: o.r ? "قطف التوت" : "شجيرة توت", cotton: o.r ? "قطف القطن" : "نبتة قطن", crop: o.r ? "قطف " + CROPS[o.v][1] : "نبتة صغيرة",
      mine: "كسر " + OBJ[o.t].n, wild: "قطف الزهرة", egg: "التقاط البيضة", wool: "التقاط الصوف", big: "شجرة كبيرة", stump: "جذع شجرة", grow: "شتلة صغيرة" };
    const k = OBJ[o.t].k;
    if (k === "furn") return o.w ? `<b>✕</b> التقط ${ITEMS[o.t].n} ✨` : `<b>✕</b> ${(ITEMS[o.t] || ITEMS["fl" + (o.v || 0)] || OBJ[o.t]).n}`;
    return (k === "big" || k === "stump" || k === "grow" || (!o.r && (k === "apple" || k === "bush" || k === "cotton" || k === "crop")) ? "" : "<b>✕</b> ") + WD[k];
  }
  function hud(force) {
    const key = [hint(), Math.floor(save.time / 10), Math.round(save.energy / 4), Math.round(save.food / 4), placing ? placing.id + inv(placing.id) : ""].join("|");
    if (!force && key === hudKey) return;
    hudKey = key;
    const h = Math.floor(hour()), m = Math.floor(save.time % 60 / 10) * 10;
    const top = $("#htop"); if (!top) return;
    top.innerHTML = `<span class="pill">${isNight() ? "🌙" : "☀️"} ${h}:${String(m).padStart(2, "0")}</span>
      <span class="pill bar ${save.energy <= 20 ? "low" : ""}"><i class="emo">⚡</i><span><b style="width:${save.energy}%;background:#facc15"></b></span></span>
      <span class="pill bar ${save.food <= 20 ? "low" : ""}"><i class="emo">🍎</i><span><b style="width:${save.food}%;background:#f87171"></b></span></span>`;
    $("#hint").innerHTML = hint();
    $("#hint").style.visibility = $("#hint").innerHTML ? "visible" : "hidden";
    document.body.classList.toggle("placing", !!placing);
  }

  function play() {
    ensureWorld();
    if (!save.char) { K.replace(charScreen, false); return; }
    const sp = save.p || { x: HX, y: 20, dir: 0 };
    P = { x: sp.x, y: sp.y, dir: sp.dir || 0, fx: sp.x, fy: sp.y, t: 1, ph: 0, turn: 0, moving() { return this.t < 1; } };
    if (!passable(P.x, P.y, P) && O[I(P.x, P.y)]) { const s = freeSpot((x, y) => Math.abs(x - HX) < 6 && y > 19); if (s) { P.x = P.fx = s[0]; P.y = P.fy = s[1]; } }
    held = []; path = null; placing = null; ov = null; sleeping = 0;
    document.body.classList.add("playing");
    K.paint(`<div id="hud"><div id="htop"></div>
        <button id="hbag" class="hb" aria-label="القائمة"><span class="emo">🎒</span></button>
        <button id="hact" class="hb act" aria-label="افعل"><span class="emo">✋</span></button>
        <button id="hok" class="hb ok"><span class="emo">✔️</span></button><button id="hno" class="hb no"><span class="emo">✖️</span></button>
        <div id="hint"></div><div id="toast"></div></div><div id="ov" class="ov"></div>`);
    const tap = (id, fn) => { const b = $(id); b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); K.audioCtx(); if (!ov && !sleeping) fn(); }); };
    tap("#hbag", () => (placing ? stopPlace() : openMenu())); tap("#hact", act); tap("#hok", act); tap("#hno", stopPlace);
    resize(); hud(true);
    if (!save.tip) K.later(() => toast(gw("مرحباً! اخرجي إلى الغابة 🌳 واجمعي الخشب والحجارة، ثم اصنعي أثاث بيتك 🔨", "مرحباً! اخرج إلى الغابة 🌳 واجمع الخشب والحجارة، ثم اصنع أثاث بيتك 🔨"), 5000), 600);

    const KEYDIR = { ArrowDown: 0, ArrowUp: 1, ArrowLeft: 2, ArrowRight: 3 };
    const pad = { prev: [], dir: null };
    K.mode = {
      key(e) {
        if (ov) { if (e.key === "Backspace") { ovBack(); return true; } return false; }
        if (sleeping) return true;
        const d = KEYDIR[e.key];
        if (d != null) { if (e.pad) return true; if (!held.includes(d)) { held.push(d); pressDir(d); } path = null; return true; }
        if (e.pad) return true;
        if (e.key === "Enter" || e.key === " ") { if (!e.repeat) act(); return true; }
        if (e.key === "Backspace") { if (placing) stopPlace(); else openMenu(); return true; }
        if (e.key === "b" || e.key === "i") { ovStack = [openMenu]; openBag(); return true; }
        if (e.key === "c") { ovStack = [openMenu]; openCraft(); return true; }
        return false;
      },
      keyup(e) { const d = KEYDIR[e.key]; if (d != null) held = held.filter((x) => x !== d); },
      poll(pads) {
        if (!pads.length) { pad.prev = []; padDir = null; return false; }
        const g = pads[0], b = (i) => !!(g.buttons[i] && g.buttons[i].pressed), prev = pad.prev;
        const edge = (i) => b(i) && !prev[i];
        pad.prev = g.buttons.map((x) => x.pressed);
        if (ov) { padDir = null; if (ovGuard) { if (b(0) || b(1) || b(2) || b(3) || b(9)) return true; ovGuard = false; } return false; }
        if (sleeping) return true;
        const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        const d = b(13) || ay > 0.5 ? 0 : b(12) || ay < -0.5 ? 1 : b(14) || ax < -0.5 ? 2 : b(15) || ax > 0.5 ? 3 : null;
        if (d != null && d !== padDir) { pressDir(d); path = null; }
        padDir = d;
        const opened = () => { ovGuard = true; };
        if (edge(0)) { act(); if (ov) opened(); }
        else if (edge(1) || edge(9)) { if (placing) stopPlace(); else { openMenu(); opened(); } }
        else if (edge(2)) { ovStack = [openMenu]; openBag(); opened(); }
        else if (edge(3)) { ovStack = [openMenu]; openCraft(); opened(); }
        return true;
      },
      stop() {
        running = false; cancelAnimationFrame(raf); persist(); stopTune();
        document.body.classList.remove("playing", "placing");
        window.removeEventListener("resize", resize); window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", vis);
        cv.removeEventListener("pointerdown", onTap);
      },
    };
    const blur = () => { held = []; };
    const vis = () => { if (document.hidden) persist(); };
    window.addEventListener("resize", resize); window.addEventListener("blur", blur); document.addEventListener("visibilitychange", vis);
    cv.addEventListener("pointerdown", onTap);
    running = true; lastT = 0; raf = requestAnimationFrame(loop);
  }
  function pressDir(d) { if (!P.moving() && P.dir !== d) { P.dir = d; P.turn = 0.13; hud(); } }
  window.addEventListener("pagehide", () => persist());

  // ---------------------------------------------------------------- اللمس: المس مكاناً لتمشي إليه
  function onTap(e) {
    K.audioCtx();
    if (ov || sleeping) return;
    const r = cv.getBoundingClientRect(), dpr = cv.width / r.width;
    const wx = ((e.clientX - r.left) * dpr) / Z + cam.x, wy = ((e.clientY - r.top) * dpr) / Z + cam.y;
    const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    if (!inb(tx, ty)) return;
    if (placing) {
      const adj = Math.abs(tx - P.x) + Math.abs(ty - P.y) === 1;
      if (adj && canPlace(placing.id, tx, ty)) { const d = faceTo(tx, ty); if (d != null) P.dir = d; place(tx, ty); }
      else walkTo(tx, ty, false);
      return;
    }
    if (tx === P.x && ty === P.y) return;
    const target = animalAt(tx, ty) || O[I(tx, ty)];
    if (Math.abs(tx - P.x) + Math.abs(ty - P.y) === 1) { P.dir = faceTo(tx, ty); if (target || G[I(tx, ty)] === 3) { act(); return; } }
    walkTo(tx, ty, !!target);
  }
  function faceTo(tx, ty) { for (let d = 0; d < 4; d++) if (P.x + DX[d] === tx && P.y + DY[d] === ty) return d; return null; }
  function walkTo(tx, ty, interact) {
    // بحث بالعرض عن أقصر طريق (إلى المكان نفسه أو إلى جانبه إن كان مشغولاً)
    const goal = (x, y) => (interact || !passable(tx, ty, P) ? Math.abs(x - tx) + Math.abs(y - ty) === 1 : x === tx && y === ty);
    const prev = new Int32Array(W * H).fill(-1), q = [I(P.x, P.y)]; prev[q[0]] = q[0];
    let end = -1;
    for (let h = 0; h < q.length && q.length < 3000; h++) {
      const c = q[h], x = c % W, y = (c / W) | 0;
      if (goal(x, y)) { end = c; break; }
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (!inb(nx, ny)) continue; const n = I(nx, ny); if (prev[n] >= 0 || !passable(nx, ny, P)) continue; prev[n] = c; q.push(n); }
    }
    if (end < 0) { snd.no(); return; }
    const steps = []; for (let c = end; c !== prev[c]; c = prev[c]) { const p = prev[c]; const dx = (c % W) - (p % W), dy = ((c / W) | 0) - ((p / W) | 0); steps.unshift(dx === 1 ? 3 : dx === -1 ? 2 : dy === 1 ? 0 : 1); }
    path = steps; pendingAct = interact ? [tx, ty] : null;
    if (!steps.length && pendingAct) { P.dir = faceTo(tx, ty); act(); pendingAct = null; path = null; }
  }

  // ---------------------------------------------------------------- الحلقة
  const cam = { x: 0, y: 0 };
  function resize() {
    const w = innerWidth, h = innerHeight, dpr = LITE ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    Z = Math.min(w, h) * dpr / (TS * (w > h ? 11 : 8.5));
    const nsr = Math.max(1, Math.round(Z * 4) / 4);
    if (nsr !== SR) { SR = nsr; SPR.clear(); GSP.clear(); }
    ctx.imageSmoothingEnabled = true;
  }
  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!lastT) lastT = now;
    let dt = (now - lastT) / 1000;
    if (LITE) { acc30 += dt; if (acc30 < 1 / 30) { lastT = now; return; } dt = acc30; acc30 = 0; }
    lastT = now; dt = Math.min(dt, 0.1); T += dt;
    update(dt); render();
  }
  function update(dt) {
    // الوقت: يتوقف أثناء القوائم
    if (!ov) {
      const rate = sleeping ? 0 : isNight() ? 4.5 : 2.5; // دقائق اللعب في كل ثانية
      const before = hour();
      save.time += rate * dt; save.day = Math.floor(save.time / 1440) + 1;
      const night = hour() >= 22 || hour() < 5;
      save.energy = Math.max(0, save.energy - dt * rate / 60 * (night ? 9 : 3));
      save.food = Math.max(0, save.food - dt * rate / 60 * 5.5);
      if (before < 20 && hour() >= 20 && nightWarned !== save.day) { nightWarned = save.day; toast(gw("🌙 حلّ الليل… حان وقت النوم في سريرك", "🌙 حلّ الليل… حان وقت النوم في سريرك"), 3500); }
      warnT -= dt;
      if (warnT <= 0 && !sleeping) {
        if (save.food <= 15) { toast(gw("😟 أنا جائعة… 🍎 كُلي شيئاً من الحقيبة", "😟 أنا جائع… 🍎 كُل شيئاً من الحقيبة"), 3200); warnT = 25; }
        else if (save.energy <= 15) { toast(gw("😴 أنا متعبة… حان وقت النوم في السرير", "😴 أنا متعب… حان وقت النوم في السرير"), 3200); warnT = 25; }
        else warnT = 3;
      }
    }
    if (sleeping) { sleeping -= dt; if (sleeping <= 0) { sleeping = 0; wake(); } }
    // المشي
    if (P.t < 1) {
      P.t = Math.min(1, P.t + dt * speed()); P.ph += dt * speed() * Math.PI;
      if (P.t >= 1) { hud(); if (path && !path.length) { path = null; if (pendingAct) { const d = faceTo(...pendingAct); if (d != null) P.dir = d; pendingAct = null; act(); } } }
    }
    if (P.t >= 1 && !ov && !sleeping) {
      let d = padDir != null ? padDir : held.length ? held[held.length - 1] : null, fromPath = false;
      if (d == null && path && path.length) { d = path[0]; fromPath = true; }
      if (P.turn > 0) P.turn -= dt;
      if (d != null && P.turn <= 0) {
        if (P.dir !== d && !fromPath) { P.dir = d; P.turn = 0.13; hud(); }
        else {
          P.dir = d;
          const nx = P.x + DX[d], ny = P.y + DY[d];
          if (passable(nx, ny, P)) { P.fx = P.x; P.fy = P.y; P.x = nx; P.y = ny; P.t = 0; if (fromPath) path.shift(); }
          else { if (fromPath) { path = null; pendingAct = null; } hud(); }
        }
      } else if (d == null) P.ph = 0;
    }
    // الحيوانات
    for (const a of AN) {
      if (a.mt < 1) { a.mt = Math.min(1, a.mt + dt * 2.2); continue; }
      a.tm -= dt; if (a.tm > 0) continue;
      a.tm = 1.2 + rnd() * 3;
      const dist = Math.abs(a.x - a.hx) + Math.abs(a.y - a.hy), lim = a.home ? 4 : 5;
      let dirs = [0, 1, 2, 3].sort(() => rnd() - 0.5);
      if (dist > lim) { a.tm = 0.35; dirs.sort((p, q) => (Math.abs(a.x + DX[p] - a.hx) + Math.abs(a.y + DY[p] - a.hy)) - (Math.abs(a.x + DX[q] - a.hx) + Math.abs(a.y + DY[q] - a.hy))); }
      for (const d of dirs.slice(0, dist > lim ? 3 : 1)) {
        const nx = a.x + DX[d], ny = a.y + DY[d];
        if (!passable(nx, ny, a)) continue;
        if (a.k === "duck" && !a.home && G[I(nx, ny)] !== 3 && G[I(nx, ny)] !== 2) continue;
        if (Math.abs(nx - a.hx) + Math.abs(ny - a.hy) > lim && dist <= lim) continue;
        a.fx = a.x; a.fy = a.y; a.x = nx; a.y = ny; a.mt = 0; if (DX[d]) a.face = DX[d];
        break;
      }
    }
    for (const [k, v] of shake) { if (v - dt <= 0) shake.delete(k); else shake.set(k, v - dt); }
    for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind !== 1) p.vy += 300 * dt; if (p.t > p.life) parts.splice(k, 1); }
    for (let k = floats.length - 1; k >= 0; k--) { floats[k].t += dt; if (floats[k].t > 1.3) floats.splice(k, 1); }
    hudT -= dt; if (hudT <= 0) { hudT = 0.3; hud(); }
    saveT -= dt; if (saveT <= 0) { saveT = 15; persist(); }
  }

  function darkness() {
    const h = hour();
    if (h < 5) return 0.58; if (h < 7) return 0.58 * (7 - h) / 2;
    if (h < 18) return 0; if (h < 20.5) return 0.58 * (h - 18) / 2.5; return 0.58;
  }
  let shade = null;
  function render() {
    const cw = cv.width, ch = cv.height, vw = cw / Z, vh = ch / Z;
    const rx = (P.fx + (P.x - P.fx) * P.t), ry = (P.fy + (P.y - P.fy) * P.t);
    cam.x = clamp(rx * TS + TS / 2 - vw / 2, 0, W * TS - vw); cam.y = clamp(ry * TS + TS / 2 - vh / 2, 0, H * TS - vh);
    cam.x = Math.round(cam.x * Z) / Z; cam.y = Math.round(cam.y * Z) / Z;
    const x0 = Math.max(0, Math.floor(cam.x / TS) - 1), x1 = Math.min(W - 1, Math.ceil((cam.x + vw) / TS) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / TS) - 1), y1 = Math.min(H - 1, Math.ceil((cam.y + vh) / TS) + 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const SX = (x) => Math.round((x * TS - cam.x) * Z), SY = (y) => Math.round((y * TS - cam.y) * Z);
    const frame = ((T * 1.2) | 0) % 2;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const sx = SX(x), sy = SY(y);
      ctx.drawImage(groundSprite(x, y, frame), sx, sy, SX(x + 1) - sx, SY(y + 1) - sy);
    }
    ctx.setTransform(Z, 0, 0, Z, -cam.x * Z, -cam.y * Z);
    // الأشياء المسطحة
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const o = O[I(x, y)]; if (o && OBJ[o.t].flat) ctx.drawImage(objSprite(o, x, y), x * TS, y * TS - TS, TS, TS * 2); }
    // الأشياء والشخصيات مرتبة حسب العمق
    const list = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const o = O[I(x, y)]; if (o && !OBJ[o.t].flat) list.push([y + 1, 0, x, y, o]); }
    for (const a of AN) { const ax = a.fx + (a.x - a.fx) * a.mt, ay = a.fy + (a.y - a.fy) * a.mt; if (ax >= x0 - 1 && ax <= x1 + 1 && ay >= y0 - 1 && ay <= y1 + 1) list.push([ay + 1.02, 1, ax, ay, a]); }
    list.push([ry + 1.03, 2, rx, ry, P]);
    list.sort((p, q) => p[0] - q[0]);
    for (const [, kind, x, y, e] of list) {
      if (kind === 0) {
        const s = shake.get(I(x, y)), off = s ? Math.sin(s * 60) * 2.5 : 0;
        ctx.drawImage(objSprite(e, x, y), x * TS + off, y * TS - TS, TS, TS * 2);
        const dy = A.dyn[e.t]; if (dy && !(LITE && e.t === "fountain")) dy(ctx, x * TS, y * TS, T, e);
        if (e.w && !LITE) { const tw = (Math.sin(T * 4 + x) + 1) / 2; ctx.globalAlpha = tw; A.ci(ctx, x * TS + 40, y * TS + 6, 2.5, "#fff"); A.ci(ctx, x * TS + 8, y * TS + 14, 1.6, "#fde68a"); ctx.globalAlpha = 1; }
      } else if (kind === 1) {
        const hop = e.mt < 1 ? Math.sin(e.mt * Math.PI) * 4 : 0, swim = G[I(e.x, e.y)] === 3 && e.k === "duck";
        A.animal(ctx, e.k, x * TS + TS / 2, y * TS + TS - 6 + (swim ? 4 : 0), e.face, hop, swim);
      } else {
        A.char(ctx, x * TS + TS / 2, y * TS + TS - 4, P.dir, P.t < 1 ? P.ph : 0, save.char, 1, D);
      }
    }
    // مكان الوضع
    if (placing && !ov) {
      const [fx, fy] = front(), ok = canPlace(placing.id, fx, fy), it = ITEMS[placing.id];
      ctx.globalAlpha = 0.6;
      if (it.g != null) { if (inb(fx, fy)) ctx.drawImage(gsprite(`${it.g}:0`, (c) => A.ground(c, it.g, 1, 2, 0, 0)), fx * TS, fy * TS, TS, TS); }
      else { const o = placing.moved || { t: it.o, v: it.v, r: 1 }; ctx.drawImage(objSprite(o, fx, fy), fx * TS, fy * TS - TS, TS, TS * 2); }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3; ctx.strokeStyle = ok ? "#22c55e" : "#ef4444"; ctx.setLineDash([7, 5]); A.rr(ctx, fx * TS + 2, fy * TS + 2, TS - 4, TS - 4, 8); ctx.stroke(); ctx.setLineDash([]);
    }
    // جزيئات
    for (const p of parts) {
      const a = 1 - p.t / p.life; ctx.globalAlpha = Math.max(0, a);
      if (p.kind === 1) A.heart(ctx, p.x, p.y, 5); else A.ci(ctx, p.x, p.y, 3, p.col);
    }
    ctx.globalAlpha = 1;
    for (const f of floats) {
      if (!f.im) { f.im = new Image(); f.im.src = icon(f.id); }
      const a = f.t < 1 ? 1 : 1 - (f.t - 1) / 0.3, y = f.y - 10 - f.t * 30;
      ctx.globalAlpha = Math.max(0, a);
      if (f.im.complete) ctx.drawImage(f.im, f.x - 18, y - 18, 30, 30);
      ctx.font = "bold 18px sans-serif"; ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.fillStyle = "#15803d"; ctx.textAlign = "left";
      ctx.strokeText("+" + f.n, f.x + 12, y + 4); ctx.fillText("+" + f.n, f.x + 12, y + 4);
      ctx.globalAlpha = 1;
    }
    // الليل
    const dk = darkness();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (dk > 0.01) {
      const q = LITE ? 8 : 4, sw = Math.ceil(cw / q), sh = Math.ceil(ch / q);
      if (!shade || shade.width !== sw || shade.height !== sh) { shade = document.createElement("canvas"); shade.width = sw; shade.height = sh; }
      const s = shade.getContext("2d"), k = Z / q;
      s.globalCompositeOperation = "source-over"; s.clearRect(0, 0, sw, sh);
      s.fillStyle = `rgba(22,26,74,${dk})`; s.fillRect(0, 0, sw, sh);
      s.globalCompositeOperation = "destination-out";
      const glow = (wx, wy, r, a) => {
        const x = (wx - cam.x) * k, y = (wy - cam.y) * k, R = r * TS * k;
        if (x < -R || y < -R || x > sw + R || y > sh + R) return;
        const g = s.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
        s.fillStyle = g; s.fillRect(x - R, y - R, R * 2, R * 2);
      };
      glow(rx * TS + TS / 2, ry * TS, 1.8, 0.75);
      for (let y = y0 - 3; y <= y1 + 3; y++) for (let x = x0 - 3; x <= x1 + 3; x++) {
        if (!inb(x, y)) continue; const o = O[I(x, y)]; if (!o) continue;
        const L = OBJ[o.t].light; if (!L || o.on === false || (o.t === "tv" && !o.on)) continue;
        glow(x * TS + TS / 2, y * TS, 3.4 * L, 0.95);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(shade, 0, 0, sw * q, sh * q);
      if (!LITE) {
        ctx.globalCompositeOperation = "lighter";
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const o = O[I(x, y)]; if (!o || !OBJ[o.t].light || o.on === false || (o.t === "tv" && !o.on)) continue;
          const px = (x * TS + TS / 2 - cam.x) * Z, py = (y * TS - cam.y) * Z, R = TS * 1.6 * Z;
          const g = ctx.createRadialGradient(px, py, 0, px, py, R); g.addColorStop(0, `rgba(255,190,90,${0.25 * dk})`); g.addColorStop(1, "rgba(255,190,90,0)");
          ctx.fillStyle = g; ctx.fillRect(px - R, py - R, R * 2, R * 2);
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    if (sleeping) {
      const tot = sleepNight ? 3.2 : 2, p = 1 - sleeping / tot, a = p < 0.3 ? p / 0.3 : p > 0.75 ? (1 - p) / 0.25 : 1;
      ctx.fillStyle = `rgba(15,18,50,${a * 0.92})`; ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = a; ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(ch / 9)}px sans-serif`; ctx.textAlign = "center";
      ctx.fillText("Z z z", cw / 2 + Math.sin(T * 2) * 10, ch / 2 - Math.sin(T * 1.5) * 8); ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- الشاشة الأولى
  function drawHero(c, ch) {
    const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
    g.save(); g.scale(c.width / 300, c.width / 300);
    // بيت صغير
    g.save(); g.translate(150, 60);
    const wc = WALLC[save.wall][1];
    A.fr(g, -70, 40, 140, 100, 12, wc); A.poly(g, [[-86, 46], [0, -14], [86, 46]], A.mix(wc, -0.35)); A.poly(g, [[-74, 42], [0, -4], [74, 42]], A.mix(wc, -0.2));
    A.fr(g, -18, 84, 36, 56, 10, "#b97a45"); A.ci(g, 10, 114, 2.5, "#fde68a");
    [[-50, 70], [28, 70]].forEach(([x, y]) => { A.fr(g, x, y, 24, 24, 5, "#fff"); A.fr(g, x + 3, y + 3, 18, 18, 3, "#bfe8fb"); });
    A.fr(g, 38, -4, 16, 30, 3, "#e08b78");
    g.restore();
    A.obj.tree(g, { t: "tree" }, 0, 1); g.save(); g.translate(250, 104); A.obj.appletree(g, { r: 1 }, 1, 1); g.restore();
    g.save(); g.translate(14, 110); A.obj.flower(g, { v: 0 }); g.translate(26, 6); A.obj.flower(g, { v: 1 }); g.restore();
    A.animal(g, "cat", 230, 212, -1, 0, false);
    A.char(g, 150, 214, 0, 0, ch || DEF_CHAR, 1.9, D);
    g.restore();
  }
  function home() {
    K.begin();
    const has = save.world && save.world.g;
    K.paint(`<div class="hero2"><canvas id="heroC" width="420" height="320"></canvas>
      <div><h1 class="logo">لعبة المنزل</h1><div class="sub">ابنِ بيتك 🏠 · اجمع من الغابة 🌳 · اصنع أثاثك 🔨 · ربِّ الحيوانات 🐰</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#22c55e,#0ea5e9)" ${K.act("play", () => K.show(play))}><span class="big emo">▶️</span><b>${has ? "تابع اللعب" : "ابدأ اللعب"}</b><small>${has ? `اليوم ${save.day}` : "بيت جديد"}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)" ${K.act("me", () => K.show(charScreen, false))}><span class="big emo">👧</span><b>شخصيتي</b><small>الشعر والملابس</small></button>
        ${has ? `<button class="mode f" style="background:linear-gradient(135deg,#f59e0b,#ef4444)" ${K.act("new", () => K.show(confirmNew))}><span class="big emo">🌱</span><b>عالم جديد</b><small>نبدأ من جديد</small></button>` : ""}
      </div>${K.HELP}`, "play");
    drawHero($("#heroC"), save.char);
  }
  function confirmNew() {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<span></span><span></span></div>
      <h1>عالم جديد؟</h1><div class="sub">سيُمسح البيت والأغراض، ونبدأ من جديد 🌱</div>
      <div class="nav"><button class="btn f" ${K.act("no", K.back)}>لا، ارجع</button>
      <button class="btn f go" ${K.act("yes", () => { G = null; newWorld(); K.home(); })}>نعم، عالم جديد</button></div>${K.HELP}`, "no");
  }

  // ---------------------------------------------------------------- اختيار الشخصية
  function charScreen(fromGame) {
    K.begin();
    const ch = Object.assign({}, charScreen.tmp || save.char || DEF_CHAR); charScreen.tmp = null;
    const opt = (row, k, inner, on) => `<button class="opt2 f ${on ? "on" : ""}" data-row="${row}" data-v="${k}" ${K.act(row + k, () => pick(row, k))}>${inner}</button>`;
    const mini = (row, k) => `<canvas class="mini" data-row="${row}" data-v="${k}" width="72" height="72"></canvas>`;
    const sw = (col) => `<i class="dot" style="background:${col}"></i>`;
    const rows = [
      ["g", "أنا", [["g", "👧 بنت"], ["b", "👦 ولد"]].map(([k, n]) => opt("g", k, `<b>${n}</b>`, ch.g === k)).join("")],
      ["hair", "الشعر", D.HAIRS.map((n, k) => opt("hair", k, mini("hair", k), ch.hair === k)).join("")],
      ["hc", ch.hair === 7 ? "لون الحجاب" : "لون الشعر", (ch.hair === 7 ? D.SCARF : D.HAIR).map((c, k) => opt("hc", k, sw(c), ch.hc === k)).join("")],
      ["skin", "البشرة", D.SKIN.map((c, k) => opt("skin", k, sw(c), ch.skin === k)).join("")],
      ["top", "الملابس", D.TOPS.map((n, k) => opt("top", k, mini("top", k), ch.top === k)).join("")],
      ["oc", "اللون", D.OUT.map((c, k) => opt("oc", k, sw(c), ch.oc === k)).join("")],
      ["acc", "زينة", D.ACCS.map((n, k) => opt("acc", k, mini("acc", k), ch.acc === k)).join("")],
    ];
    const done = () => {
      save.char = ch; save.save();
      if (fromGame) K.back(); else K.replace(play);
    };
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">👧 شخصيتي</h2><button class="btn f go" ${K.act("done", done)}>✔ جاهز</button></div>
      <div class="cwrap"><canvas id="cprev" width="300" height="360"></canvas>
      <div class="crows">${rows.map(([k, n, h]) => `<div class="crow"><span class="cl">${n}</span><div class="copts">${h}</div></div>`).join("")}</div></div>`, fromGame ? "done" : "hair" + ch.hair);
    let dirT = 0;
    function draw() {
      const c = $("#cprev"); if (!c) return; const g = c.getContext("2d"); g.clearRect(0, 0, 300, 360);
      A.el(g, 150, 330, 90, 20, "rgba(255,255,255,.5)");
      A.char(g, 150, 332, [0, 3, 1, 2][dirT % 4], 0, ch, 4.4, D);
      K.app.querySelectorAll("canvas.mini").forEach((m) => {
        const r = m.dataset.row, v = +m.dataset.v, cc = Object.assign({}, ch, { [r]: v }), mg = m.getContext("2d");
        mg.clearRect(0, 0, 72, 72);
        if (r === "top") A.char(mg, 36, 70, 0, 0, cc, 1.05, D); else A.char(mg, 36, 122, 0, 0, cc, 1.75, D);
      });
    }
    function pick(row, v) {
      const prevHair = ch.hair;
      ch[row] = v; K.sfx.pop();
      if (row === "g" && !save.char) { Object.assign(ch, v === "b" ? { hair: 5, top: 1, acc: 0, oc: 2 } : { hair: 1, top: 0, acc: 1, oc: 0 }); }
      if (row === "hair" && (prevHair === 7) !== (v === 7)) ch.hc = v === 7 ? 0 : 1;
      if ((row === "hair" && (prevHair === 7) !== (v === 7)) || row === "g") { charScreen.tmp = ch; K.top().focus = row + v; K.render(); return; }
      K.app.querySelectorAll(`.opt2[data-row="${row}"]`).forEach((b) => b.classList.toggle("on", b.dataset.v == String(v)));
      draw();
    }
    draw();
    K.every(() => { dirT++; draw(); }, 1600);
  }

  K.onFocus = (el) => { try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch {} };
  window.__home = { get P() { return P; }, get O() { return O; }, get G() { return G; }, save, I, act, openMenu, openBag, openCraft, morning, setTime: (h) => { save.time = (save.day - 1) * 1440 + h * 60; } };
  K.start(home);
})();
