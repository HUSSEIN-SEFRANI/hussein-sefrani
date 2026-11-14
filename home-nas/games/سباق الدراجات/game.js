// سباق الدراجات — سباق شبه ثلاثي الأبعاد على Canvas (خفيف للأجهزة القديمة)
(() => {
  "use strict";
  const GAME = "سباق الدراجات";
  const S = K.store("bikes", { veh: "moto", color: 0, best: {}, wins: {} });
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const W = 960, H = 540;

  // ------------------------------------------------------------ البيانات
  const COLORS = [
    { c: "#ef4444", d: "#991b1b" }, { c: "#3b82f6", d: "#1e40af" }, { c: "#22c55e", d: "#166534" },
    { c: "#facc15", d: "#a16207" }, { c: "#a855f7", d: "#6b21a8" }, { c: "#ec4899", d: "#9d174d" }, { c: "#f97316", d: "#9a3412" },
  ];
  const VEH = {
    moto: { name: "دراجة نارية", emo: "🏍️", tip: "الأسرع، وتركل المنافسين 💨", max: 12000, accel: 3000, steer: 2.0, centri: 0.21, kmh: 160, jumpT: 0.55, jumpH: 0.07 },
    bike: { name: "دراجة هوائية", emo: "🚲", tip: "تقفز وتركل المنافسين 👟", max: 8600, accel: 3300, steer: 2.6, centri: 0.11, kmh: 45, jumpT: 0.95, jumpH: 0.17 },
  };
  const TRACKS = [
    { id: "city", name: "المدينة", emo: "🏙️", diff: "سهل", lvl: 1, curve: 2.6, hill: 900, len: 1100, gap: 34, rival: [0.70, 0.80], grip: 1, earn: 1,
      g: "linear-gradient(160deg,#60a5fa,#1d4ed8)",
      sky: ["#38bdf8", "#bae6fd"], grass: ["#4ade80", "#22c55e"], rumble: ["#e5e7eb", "#9ca3af"], road: ["#6b7280", "#64748b"], lane: "#fff", side: ["bld", "bld", "lamp", "tree"] },
    { id: "desert", name: "الصحراء", emo: "🏜️", diff: "متوسط", lvl: 2, curve: 3.4, hill: 2200, len: 1150, gap: 30, rival: [0.74, 0.84], grip: 1, earn: 1,
      g: "linear-gradient(160deg,#fbbf24,#c2410c)",
      sky: ["#fb923c", "#fde68a"], grass: ["#fcd34d", "#f6c453"], rumble: ["#ef4444", "#fff"], road: ["#a8a29e", "#9c958f"], lane: "#fff7ed", side: ["cactus", "palm", "rock", "cactus"] },
    { id: "forest", name: "الغابة", emo: "🌲", diff: "صعب", lvl: 3, curve: 4.4, hill: 1600, len: 1200, gap: 26, rival: [0.81, 0.9], grip: 1, earn: 2,
      g: "linear-gradient(160deg,#4ade80,#166534)",
      sky: ["#7dd3fc", "#d9f99d"], grass: ["#16a34a", "#15803d"], rumble: ["#facc15", "#78350f"], road: ["#92623a", "#875a35"], lane: "#fde68a", side: ["pine", "pine", "round", "mush"] },
    { id: "snow", name: "الثلج", emo: "❄️", diff: "صعب جداً", lvl: 4, curve: 4.6, hill: 2000, len: 1200, gap: 24, rival: [0.83, 0.93], grip: 1.3, earn: 2,
      g: "linear-gradient(160deg,#e0f2fe,#6366f1)",
      sky: ["#818cf8", "#e0f2fe"], grass: ["#f8fafc", "#e2e8f0"], rumble: ["#ef4444", "#fff"], road: ["#94a3b8", "#8b9bb0"], lane: "#fff", side: ["spine", "spine", "snowman", "igloo"] },
  ];
  const LAPS = 3, RIVALS = 5;

  // ------------------------------------------------------------ أدوات الرسم
  const mk = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); return c; };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); };
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const ell = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
  const tri = (g, a, b, c, d, e, f) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); };
  const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // الدراج من الخلف (نارية أو هوائية)، إطاران للدواسات
  function rider(vk, col, frame) {
    return mk(100, 170, (g) => {
      const skin = "#f2b48a";
      if (vk === "moto") {
        g.fillStyle = "#111827"; rr(g, 37, 116, 26, 54, 11);
        g.fillStyle = "#9ca3af"; rr(g, 15, 118, 13, 28, 6); rr(g, 72, 118, 13, 28, 6);
        g.fillStyle = col.d; g.beginPath(); g.moveTo(22, 96); g.lineTo(78, 96); g.lineTo(68, 130); g.lineTo(32, 130); g.closePath(); g.fill();
        g.fillStyle = "#fb7185"; rr(g, 38, 114, 24, 9, 4);
        g.fillStyle = "#fef08a"; circ(g, 33, 119, 3); circ(g, 67, 119, 3);
        g.strokeStyle = "#374151"; g.lineWidth = 5; g.beginPath(); g.moveTo(4, 72); g.lineTo(96, 72); g.stroke();
        g.fillStyle = "#374151"; ell(g, 6, 62, 6, 5); ell(g, 94, 62, 6, 5);
        g.fillStyle = "#1e3a8a"; rr(g, 18, 86, 17, 32, 8); rr(g, 65, 86, 17, 32, 8);
        g.fillStyle = "#111827"; rr(g, 17, 110, 19, 12, 5); rr(g, 64, 110, 19, 12, 5);
        g.fillStyle = col.c; rr(g, 23, 40, 54, 56, 17);
        g.fillStyle = "#fff"; rr(g, 46, 44, 8, 46, 4);
        g.fillStyle = col.c; rr(g, 7, 50, 19, 26, 9); rr(g, 74, 50, 19, 26, 9);
        g.fillStyle = "#111827"; ell(g, 13, 72, 8, 6); ell(g, 87, 72, 8, 6);
        g.fillStyle = col.d; circ(g, 50, 26, 21);
        g.fillStyle = col.c; circ(g, 50, 24, 19);
        g.fillStyle = "#fff"; rr(g, 46, 6, 8, 36, 4);
      } else {
        g.fillStyle = "#111827"; rr(g, 45, 108, 10, 62, 5);
        g.fillStyle = "#9ca3af"; rr(g, 38, 104, 24, 6, 3);
        g.fillStyle = "#f87171"; rr(g, 44, 110, 12, 6, 2);
        const up = frame ? 1 : 0;
        // الساقان: واحدة فوق والأخرى تحت
        g.fillStyle = "#1f2937"; rr(g, 27, 88, 17, 20, 7); rr(g, 56, 88, 17, 20, 7);
        g.fillStyle = skin; rr(g, 29, 104 - up * 10, 13, 30, 6); rr(g, 58, 104 - (1 - up) * 10, 13, 30, 6);
        g.fillStyle = "#fff"; rr(g, 27, 130 - up * 10, 17, 10, 4); rr(g, 56, 130 - (1 - up) * 10, 17, 10, 4);
        g.fillStyle = "#111827"; rr(g, 38, 92, 24, 10, 4);
        g.strokeStyle = "#475569"; g.lineWidth = 4; g.beginPath(); g.moveTo(14, 70); g.lineTo(86, 70); g.stroke();
        g.fillStyle = col.c; rr(g, 27, 42, 46, 52, 15);
        g.fillStyle = "#fff"; rr(g, 38, 56, 24, 18, 5);
        g.fillStyle = col.d; g.font = "bold 15px sans-serif"; g.textAlign = "center"; g.fillText("7", 50, 71);
        g.fillStyle = col.c; rr(g, 15, 50, 15, 14, 6); rr(g, 70, 50, 15, 14, 6);
        g.fillStyle = skin; rr(g, 14, 60, 12, 14, 5); rr(g, 74, 60, 12, 14, 5);
        g.fillStyle = skin; circ(g, 50, 33, 13);
        g.fillStyle = col.d; ell(g, 50, 24, 19, 14);
        g.fillStyle = col.c; ell(g, 50, 22, 17, 12);
        g.fillStyle = col.d; rr(g, 41, 12, 5, 16, 2); rr(g, 54, 12, 5, 16, 2);
      }
    });
  }

  const SPR = {};
  function buildSprites() {
    const sh = (g, w, h) => { g.fillStyle = "rgba(0,0,0,.18)"; ell(g, w / 2, h - 6, w * 0.42, 6); };
    SPR.bld = [["#f87171", "#fecaca"], ["#60a5fa", "#dbeafe"], ["#fbbf24", "#fef3c7"], ["#a78bfa", "#ede9fe"], ["#34d399", "#d1fae5"]].map(([c, wcol], i) => {
      const w = 150 + (i % 3) * 30, h = 260 + ((i * 70) % 160);
      return { img: mk(w, h, (g) => {
        g.fillStyle = c; rr(g, 0, 10, w, h - 10, 8);
        g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, 10, w, 14);
        g.fillStyle = wcol;
        for (let y = 36; y < h - 60; y += 44) for (let x = 16; x < w - 30; x += 40) rr(g, x, y, 24, 28, 4);
        g.fillStyle = "#7c2d12"; rr(g, w / 2 - 18, h - 52, 36, 52, 6);
      }), ww: w * 11 };
    });
    SPR.lamp = [{ img: mk(50, 230, (g) => { g.fillStyle = "#475569"; g.fillRect(22, 30, 7, 200); rr(g, 6, 18, 38, 12, 5); g.fillStyle = "#fef08a"; ell(g, 25, 34, 14, 6); }), ww: 380 }];
    SPR.tree = [{ img: mk(140, 190, (g, w, h) => { sh(g, w, h); g.fillStyle = "#92400e"; rr(g, 62, 110, 16, 76, 5); g.fillStyle = "#16a34a"; circ(g, 70, 70, 56); g.fillStyle = "#22c55e"; circ(g, 55, 55, 32); circ(g, 92, 72, 30); }), ww: 1300 }];
    SPR.round = SPR.tree;
    SPR.cactus = [{ img: mk(100, 160, (g, w, h) => { sh(g, w, h); g.fillStyle = "#16a34a"; rr(g, 38, 10, 26, 146, 13); rr(g, 10, 50, 20, 56, 10); rr(g, 16, 92, 30, 16, 8); rr(g, 72, 34, 20, 50, 10); rr(g, 56, 74, 30, 16, 8); g.fillStyle = "#f472b6"; circ(g, 51, 12, 7); }), ww: 800 }];
    SPR.palm = [{ img: mk(170, 250, (g, w, h) => { sh(g, w, h); g.fillStyle = "#a16207"; for (let i = 0; i < 9; i++) rr(g, 76 - i * 1.5, 70 + i * 20, 20, 22, 6); g.fillStyle = "#15803d";
      [[-1, 0.2], [1, 0.2], [-1, -0.4], [1, -0.4], [0, -1]].forEach(([s, t]) => { g.save(); g.translate(85, 70); g.rotate(s * 1.1 + t * 0.4); ell(g, 0, -40, 18, 46); g.restore(); });
      g.fillStyle = "#78350f"; circ(g, 78, 78, 9); circ(g, 94, 80, 9); }), ww: 1500 }];
    SPR.rock = [{ img: mk(140, 80, (g, w, h) => { sh(g, w, h); g.fillStyle = "#b45309"; g.beginPath(); g.moveTo(5, 76); g.lineTo(30, 20); g.lineTo(80, 6); g.lineTo(125, 30); g.lineTo(136, 76); g.closePath(); g.fill(); g.fillStyle = "#d97706"; tri(g, 30, 20, 80, 6, 60, 50); }), ww: 1100 }];
    SPR.pine = [{ img: mk(130, 250, (g, w, h) => { sh(g, w, h); g.fillStyle = "#78350f"; rr(g, 56, 200, 18, 46, 4); g.fillStyle = "#166534"; tri(g, 65, 4, 10, 120, 120, 120); tri(g, 65, 50, 2, 180, 128, 180); tri(g, 65, 100, 0, 215, 130, 215); g.fillStyle = "#15803d"; tri(g, 65, 4, 40, 70, 65, 70); }), ww: 1200 }];
    SPR.spine = [{ img: mk(130, 250, (g, w, h) => { sh(g, w, h); g.fillStyle = "#78350f"; rr(g, 56, 200, 18, 46, 4); g.fillStyle = "#166534"; tri(g, 65, 4, 10, 120, 120, 120); tri(g, 65, 50, 2, 180, 128, 180); tri(g, 65, 100, 0, 215, 130, 215); g.fillStyle = "#fff"; tri(g, 65, 4, 40, 50, 90, 50); tri(g, 65, 60, 30, 110, 100, 110); tri(g, 65, 110, 20, 170, 110, 170); }), ww: 1200 }];
    SPR.mush = [{ img: mk(100, 90, (g, w, h) => { sh(g, w, h); g.fillStyle = "#fef3c7"; rr(g, 38, 40, 24, 46, 8); g.fillStyle = "#ef4444"; g.beginPath(); g.ellipse(50, 42, 48, 34, 0, Math.PI, 0); g.fill(); g.fillStyle = "#fff"; circ(g, 30, 28, 7); circ(g, 58, 18, 8); circ(g, 74, 34, 6); }), ww: 600 }];
    SPR.snowman = [{ img: mk(100, 150, (g, w, h) => { sh(g, w, h); g.fillStyle = "#fff"; g.strokeStyle = "#cbd5e1"; g.lineWidth = 3; [[50, 112, 34], [50, 62, 25], [50, 26, 18]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); });
      g.fillStyle = "#111"; circ(g, 44, 22, 3); circ(g, 56, 22, 3); circ(g, 50, 56, 3); circ(g, 50, 70, 3); g.fillStyle = "#f97316"; tri(g, 50, 27, 50, 33, 66, 30); g.fillStyle = "#ef4444"; rr(g, 30, 40, 40, 8, 4); g.fillStyle = "#1e3a8a"; rr(g, 36, 0, 28, 12, 3); }), ww: 650 }];
    SPR.igloo = [{ img: mk(180, 110, (g, w, h) => { sh(g, w, h); g.fillStyle = "#f8fafc"; g.beginPath(); g.ellipse(90, 104, 84, 96, 0, Math.PI, 0); g.fill(); g.strokeStyle = "#bfdbfe"; g.lineWidth = 3; for (let y = 30; y < 104; y += 22) { g.beginPath(); g.moveTo(10, y); g.lineTo(170, y); g.stroke(); } g.fillStyle = "#1e3a8a"; g.beginPath(); g.ellipse(90, 106, 22, 34, 0, Math.PI, 0); g.fill(); }), ww: 1400 }];
    SPR.cone = { img: mk(60, 70, (g) => { g.fillStyle = "rgba(0,0,0,.2)"; ell(g, 30, 64, 28, 5); g.fillStyle = "#f97316"; tri(g, 30, 2, 8, 62, 52, 62); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(21, 30); g.lineTo(39, 30); g.lineTo(43, 42); g.lineTo(17, 42); g.fill(); g.fillStyle = "#c2410c"; rr(g, 2, 58, 56, 8, 3); }), ww: 280 };
    SPR.puddle = { img: mk(180, 50, (g) => { g.fillStyle = "#38bdf8"; ell(g, 90, 25, 88, 22); g.fillStyle = "#7dd3fc"; ell(g, 80, 21, 60, 12); g.fillStyle = "#e0f2fe"; ell(g, 60, 17, 18, 4); }), ww: 800 };
    SPR.ice = { img: mk(180, 50, (g) => { g.fillStyle = "#a5f3fc"; ell(g, 90, 25, 88, 22); g.fillStyle = "#ecfeff"; ell(g, 76, 20, 56, 11); }), ww: 800 };
    SPR.star = { img: mk(64, 64, (g) => { g.fillStyle = "#ca8a04"; star(g, 32, 33, 30, 13); g.fillStyle = "#fde047"; star(g, 32, 31, 26, 11); g.fillStyle = "#fff"; circ(g, 24, 22, 4); }), ww: 260 };
    SPR.ramp = { img: mk(180, 80, (g) => { g.fillStyle = "#a16207"; g.beginPath(); g.moveTo(0, 80); g.lineTo(20, 10); g.lineTo(160, 10); g.lineTo(180, 80); g.fill(); g.fillStyle = "#facc15"; g.beginPath(); g.moveTo(10, 76); g.lineTo(26, 16); g.lineTo(154, 16); g.lineTo(170, 76); g.fill(); g.fillStyle = "#ef4444"; [50, 90, 130].forEach((x) => tri(g, x, 26, x - 16, 56, x + 16, 56)); }), ww: 900 };
    SPR.arch = { img: mk(480, 240, (g) => { g.fillStyle = "#1e293b"; rr(g, 0, 20, 20, 220, 6); rr(g, 460, 20, 20, 220, 6); for (let i = 0; i < 24; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? "#111" : "#fff"; g.fillRect(10 + i * 19, 18 + j * 19, 19, 19); } g.fillStyle = "#ef4444"; rr(g, 0, 8, 480, 12, 4); rr(g, 0, 56, 480, 10, 4); }), ww: 2 * 2000 * 1.3 };
    SPR.shadow = mk(100, 24, (g) => { g.fillStyle = "rgba(0,0,0,.28)"; ell(g, 50, 12, 46, 9); });
  }
  function star(g, x, y, R, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }

  // خلفيات بعيدة تتحرك مع المنعطفات
  function buildBg(t) {
    const r = rnd(t.lvl * 77), BW = 1920;
    const far = mk(BW, 220, (g) => {
      g.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 7; i++) { const x = r() * BW, y = 30 + r() * 60; ell(g, x, y, 60, 18); ell(g, x + 40, y - 12, 34, 22); ell(g, x - 30, y - 6, 28, 16); }
      const peak = (col, n, hmin, hmax) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 220); for (let i = 0; i <= n; i++) { const x = (i / n) * BW, y = 220 - hmin - r() * (hmax - hmin); g.lineTo(x, i === 0 || i === n ? 220 - hmin : y); } g.lineTo(BW, 220); g.fill(); };
      if (t.id === "city") peak("#93c5fd", 12, 40, 110);
      if (t.id === "desert") { g.fillStyle = "#ea580c"; for (let i = 0; i < 6; i++) { const x = r() * BW, w = 120 + r() * 160, h = 50 + r() * 70; g.fillRect(x, 220 - h, w, h); rr(g, x - 12, 220 - h - 8, w + 24, 14, 4); } }
      if (t.id === "forest") peak("#4d7c8a", 9, 50, 140);
      if (t.id === "snow") { g.fillStyle = "#6366f1"; for (let i = 0; i < 8; i++) { const x = i * 250 + r() * 80, h = 100 + r() * 90; tri(g, x, 220 - h, x - 170, 220, x + 170, 220); g.fillStyle = "#fff"; tri(g, x, 220 - h, x - 45, 220 - h + 45, x + 45, 220 - h + 45); g.fillStyle = "#6366f1"; } }
    });
    const near = mk(BW, 140, (g) => {
      if (t.id === "city") { for (let x = 0; x < BW; x += 30 + r() * 30) { const w = 40 + r() * 70, h = 40 + r() * 100; g.fillStyle = ["#64748b", "#475569", "#94a3b8"][(r() * 3) | 0]; g.fillRect(x, 140 - h, w, h); g.fillStyle = "rgba(254,240,138,.7)"; for (let y = 140 - h + 8; y < 130; y += 16) for (let xx = x + 6; xx < x + w - 8; xx += 14) if (r() > 0.4) g.fillRect(xx, y, 6, 8); } }
      if (t.id === "desert") { g.fillStyle = "#fbbf24"; g.beginPath(); g.moveTo(0, 140); for (let x = 0; x <= BW; x += 40) g.lineTo(x, 100 + Math.sin(x / 160) * 22 + Math.sin(x / 57) * 8); g.lineTo(BW, 140); g.fill(); }
      if (t.id === "forest" || t.id === "snow") { g.fillStyle = t.id === "forest" ? "#14532d" : "#cbd5e1"; g.fillRect(0, 110, BW, 30); for (let x = 0; x < BW; x += 18 + r() * 14) { const h = 50 + r() * 70; tri(g, x, 140 - h, x - 22, 120, x + 22, 120); } if (t.id === "snow") { g.fillStyle = "#fff"; g.fillRect(0, 124, BW, 16); } }
    });
    return { far, near };
  }

  // ------------------------------------------------------------ الطريق
  const SEG = 200, RW = 2000, CAMH = 1000, DEPTH = 1 / Math.tan((50 * Math.PI) / 180), PZ = CAMH * DEPTH, DRAW = 110;
  let T, segs, N, L, bg, colsCache;

  function buildTrack(t) {
    const r = rnd(t.lvl * 1013 + 7);
    segs = [];
    let lastY = 0;
    const add = (curve, y) => { const i = segs.length; segs.push({ i, curve, p1: { y: lastY, z: i * SEG }, p2: { y, z: (i + 1) * SEG }, spr: [], cars: [], clip: 0 }); lastY = y; };
    const ease = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);
    const road = (enter, hold, leave, curve, dy) => {
      const y0 = lastY, y1 = y0 + dy, tot = enter + hold + leave;
      for (let n = 0; n < enter; n++) add(ease(0, curve, n / enter), ease(y0, y1, n / tot));
      for (let n = 0; n < hold; n++) add(curve, ease(y0, y1, (enter + n) / tot));
      for (let n = 0; n < leave; n++) add(ease(curve, 0, n / leave), ease(y0, y1, (enter + hold + n) / tot));
    };
    road(10, 40, 10, 0, 0);
    while (segs.length < t.len - 70) {
      const k = r(), side = r() < 0.5 ? -1 : 1, c = side * t.curve * (0.5 + r() * 0.5), hill = (r() - 0.5) * 2 * t.hill;
      const dy = Math.max(-2500, Math.min(2500, lastY + hill)) - lastY;
      if (k < 0.2) road(15, 25 + (r() * 30) | 0, 15, 0, dy);
      else if (k < 0.75) road(18, 20 + (r() * 35) | 0, 18, c, dy * 0.5);
      else { road(14, 18, 14, c, dy * 0.5); road(14, 18, 14, -c, 0); }
    }
    road(20, 30, 20, 0, -lastY);
    N = segs.length; L = N * SEG;
    // زخارف جانبية
    const sides = t.side;
    for (let i = 10; i < N; i += 3 + ((r() * 3) | 0)) {
      for (const s of [-1, 1]) if (r() < 0.75) {
        const kind = sides[(r() * sides.length) | 0], v = SPR[kind], sp = v[(r() * v.length) | 0];
        const off = s * (kind === "bld" ? 1.65 + r() * 0.3 : 1.6 + r() * 1.4);
        segs[i].spr.push({ img: sp.img, ww: sp.ww, x: off });
      }
    }
    segs[5].spr.push({ img: SPR.arch.img, ww: SPR.arch.ww, x: 0, deco: 1 });
    // عقبات ونجوم وقفزات
    const lanes = [-0.62, 0, 0.62];
    let i = 50;
    while (i < N - 25) {
      const k = r(), lane = lanes[(r() * 3) | 0], curvy = Math.abs(segs[i].curve) > 0.5;
      if (k < 0.38) { for (let j = 0; j < 5; j++) segs[i + j * 3].spr.push({ img: SPR.star.img, ww: SPR.star.ww, x: lane, hit: "star", float: 1 }); i += 15; }
      else if (k < 0.62) { const o = t.id === "snow" ? SPR.ice : SPR.puddle; segs[i].spr.push({ img: o.img, ww: o.ww, x: lane, hit: "puddle", flat: 1 }); }
      else if (k < 0.85) { segs[i].spr.push({ img: SPR.cone.img, ww: SPR.cone.ww, x: lane, hit: "cone" }); if (t.lvl >= 3 && r() < 0.5) segs[i].spr.push({ img: SPR.cone.img, ww: SPR.cone.ww, x: lanes[(lanes.indexOf(lane) + 1) % 3], hit: "cone" }); }
      else if (!curvy) { segs[i].spr.push({ img: SPR.ramp.img, ww: SPR.ramp.ww, x: lane, hit: "ramp", flat: 1 }); for (let j = 1; j <= 3; j++) segs[i + 4 + j * 2].spr.push({ img: SPR.star.img, ww: SPR.star.ww, x: lane, hit: "star", float: 3 }); }
      i += t.gap + ((r() * t.gap * 0.6) | 0);
    }
  }
  const segAt = (z) => segs[Math.floor(z / SEG) % N];
  const mod = (a, b) => ((a % b) + b) % b;
  const lerp = (a, b, p) => a + (b - a) * p;

  function project(p, cx, cy, cz) {
    const tz = p.z - cz;
    p.cz = tz;
    p.sc = DEPTH / tz;
    p.sx = Math.round(W / 2 + p.sc * (-cx) * W / 2);
    p.sy = Math.round(H / 2 - p.sc * (p.y - cy) * H / 2);
    p.sw = Math.round(p.sc * RW * W / 2);
  }
  function quad(x1, y1, w1, x2, y2, w2, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x1 + w1, y1); ctx.fill(); }
  function drawSeg(s) {
    const a = s.p1, b = s.p2, alt = Math.floor(s.i / 3) % 2;
    ctx.fillStyle = T.grass[alt]; ctx.fillRect(0, b.sy, W, a.sy - b.sy);
    quad(a.sx, a.sy, a.sw * 1.12, b.sx, b.sy, b.sw * 1.12, T.rumble[alt]);
    if (s.i === 4 || s.i === 5) {
      quad(a.sx, a.sy, a.sw, b.sx, b.sy, b.sw, "#fff");
      const n = 10;
      ctx.fillStyle = "#111";
      for (let k = 0; k < n; k++) if ((k + s.i) % 2) {
        const f1 = -1 + (2 * k) / n, f2 = f1 + 2 / n;
        ctx.beginPath(); ctx.moveTo(a.sx + a.sw * f1, a.sy); ctx.lineTo(b.sx + b.sw * f1, b.sy); ctx.lineTo(b.sx + b.sw * f2, b.sy); ctx.lineTo(a.sx + a.sw * f2, a.sy); ctx.fill();
      }
      return;
    }
    quad(a.sx, a.sy, a.sw, b.sx, b.sy, b.sw, T.road[alt]);
    if (alt) { const l1 = a.sw / 40, l2 = b.sw / 40; for (const f of [-1 / 3, 1 / 3]) quad(a.sx + a.sw * f, a.sy, l1, b.sx + b.sw * f, b.sy, l2, T.lane); }
  }
  function drawSprite(img, ww, sc, x, y, clip, anchor, lift) {
    const dw = ww * sc * W / 2, dh = (dw * img.height) / img.width;
    if (dw < 1 || dw > W * 3) return;
    const dx = anchor < 0 ? x - dw : anchor > 0 ? x : x - dw / 2;
    const dy = y - dh - (lift || 0) * dw;
    const cut = clip ? Math.max(0, dy + dh - clip) : 0;
    if (cut >= dh) return;
    ctx.drawImage(img, 0, 0, img.width, img.height - (img.height * cut) / dh, dx, dy, dw, dh - cut);
  }

  // ------------------------------------------------------------ رسم مشهد
  let R; // حالة السباق
  function render(st) {
    const P = st.P, base = segAt(P), bp = (P % SEG) / SEG;
    const pl = segAt(P + PZ), pp = ((P + PZ) % SEG) / SEG;
    const plY = lerp(pl.p1.y, pl.p2.y, pp);
    const g = ctx.createLinearGradient(0, 0, 0, H / 2);
    g.addColorStop(0, T.sky[0]); g.addColorStop(1, T.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = T.grass[1]; ctx.fillRect(0, H / 2, W, H / 2);
    const BW = 1920, o1 = mod(st.bg1, BW), o2 = mod(st.bg2, BW);
    ctx.drawImage(bg.far, -o1, H / 2 - 200); ctx.drawImage(bg.far, BW - o1, H / 2 - 200);
    ctx.drawImage(bg.near, -o2, H / 2 - 128); ctx.drawImage(bg.near, BW - o2, H / 2 - 128);

    let maxy = H, x = 0, dx = -(base.curve * bp);
    for (let n = 0; n < DRAW; n++) {
      const s = segs[(base.i + n) % N];
      const camZ = P - (s.i < base.i ? L : 0);
      project(s.p1, st.x * RW - x, plY + CAMH, camZ);
      project(s.p2, st.x * RW - x - dx, plY + CAMH, camZ);
      x += dx; dx += s.curve;
      s.clip = maxy;
      if (s.p1.cz <= DEPTH || s.p2.sy >= s.p1.sy || s.p2.sy >= maxy) continue;
      drawSeg(s);
      maxy = s.p2.sy;
    }
    for (let n = DRAW - 1; n > 0; n--) {
      const s = segs[(base.i + n) % N];
      if (s.p1.cz <= DEPTH) continue;
      const sc = s.p1.sc;
      for (const sp of s.spr) {
        if (sp.hit && sp.taken === st.lapN) continue;
        const sx = s.p1.sx + sc * sp.x * RW * W / 2;
        const bob = sp.float ? 0.25 + Math.sin(st.t * 5 + s.i) * 0.08 : 0;
        drawSprite(sp.img, sp.ww, sc, sx, s.p1.sy, s.clip, sp.deco ? 0 : sp.x < -1 ? -1 : sp.x > 1 ? 1 : 0, bob);
      }
      for (const c of s.cars) {
        const p = c.pct, csc = lerp(s.p1.sc, s.p2.sc, p);
        const cx = lerp(s.p1.sx, s.p2.sx, p) + csc * c.x * RW * W / 2, cy = lerp(s.p1.sy, s.p2.sy, p);
        drawSprite(SPR.shadow, 300, csc, cx, cy + csc * 40 * W / 2, s.clip, 0);
        const wx = c.wob > 0 ? Math.sin(st.t * 25) * csc * 50 * W / 2 : 0;
        drawSprite(c.img[c.fr], 240, csc, cx + wx, cy, s.clip, 0);
        if (c.wob > 0) for (let k = 0; k < 3; k++) { const a = st.t * 7 + k * 2.1; drawSprite(SPR.star.img, 80, csc, cx + Math.cos(a) * csc * 110 * W / 2, cy, s.clip, 0, 5.2 + Math.sin(a) * 0.4); }
      }
    }
    // اللاعب
    const pw = 240 / CAMH * W / 2, pimg = st.img[st.fr], ph = (pw * pimg.height) / pimg.width;
    const lift = st.air > 0 ? Math.sin((1 - st.air / st.airT) * Math.PI) * st.jumpH * H : 0;
    const by = H - 6 + (st.bump ? Math.sin(st.t * 60) * 2 : 0);
    ctx.drawImage(SPR.shadow, W / 2 - pw * 0.55, by - 14, pw * 1.1, 24);
    ctx.save();
    ctx.translate(W / 2, by - lift);
    ctx.rotate(st.lean + (st.wob > 0 ? Math.sin(st.t * 30) * 0.12 : 0) + (st.flip ? st.flip : 0));
    ctx.drawImage(pimg, -pw / 2, -ph, pw, ph);
    if (st.kick > 0) {
      const ext = Math.sin((1 - st.kick / 0.35) * Math.PI), th = pw * 0.14, lg = pw * (0.2 + 0.55 * ext);
      ctx.save(); ctx.translate(st.kickDir * pw * 0.12, -ph * 0.4); ctx.scale(st.kickDir, 1); ctx.rotate(-0.4 * ext);
      ctx.fillStyle = "#1f2937"; rr(ctx, -th * 0.3, -th * 0.65, th * 1.4, th * 1.3, th * 0.5);
      ctx.fillStyle = st.vk === "moto" ? "#1e3a8a" : "#f2b48a"; rr(ctx, th * 0.6, -th / 2, lg, th, th / 2);
      ctx.fillStyle = st.vk === "moto" ? "#111827" : "#fff"; rr(ctx, th * 0.4 + lg, -th * 0.75, th * 1.2, th * 1.5, th * 0.5);
      ctx.fillStyle = "#ef4444"; rr(ctx, th * 0.4 + lg, th * 0.35, th * 1.2, th * 0.4, th * 0.2);
      ctx.restore();
    }
    ctx.restore();
    if (st.splash > 0) {
      ctx.fillStyle = T.id === "snow" ? "#ecfeff" : "#7dd3fc";
      for (let k = 0; k < 8; k++) { const a = k * 0.8 + st.t * 3, rr2 = (0.4 - st.splash) * 260; circ(ctx, W / 2 + Math.cos(a) * rr2, H - 30 - Math.abs(Math.sin(a)) * rr2 * 0.6, 7); }
    }
  }

  // ------------------------------------------------------------ الصوت
  let eng = null;
  function engineOn(vk) {
    if (vk !== "moto") return;
    const c = K.audioCtx(); if (!c) return;
    try {
      const o = c.createOscillator(), f = c.createBiquadFilter(), gn = c.createGain();
      o.type = "sawtooth"; o.frequency.value = 50; f.type = "lowpass"; f.frequency.value = 500; gn.gain.value = 0;
      o.connect(f).connect(gn).connect(c.destination); o.start();
      eng = { o, gn };
    } catch {}
  }
  function engineSet(p, on) { if (!eng) return; try { eng.o.frequency.value = 45 + p * 120; eng.gn.gain.value = on ? 0.025 + p * 0.025 : 0; } catch {} }
  function engineOff() { if (!eng) return; try { eng.o.stop(); } catch {} eng = null; }
  const snd = {
    star() { K.tone(988, 0.07, "square", 0.05); K.tone(1319, 0.12, "square", 0.05, 0.06); },
    bump() { K.tone(150, 0.18, "sawtooth", 0.07); },
    splash() { K.tone(420, 0.12, "triangle", 0.1); K.tone(260, 0.2, "triangle", 0.08, 0.06); },
    jump() { [523, 659, 880].forEach((f, i) => K.tone(f, 0.1, "triangle", 0.1, i * 0.06)); },
    beep(hi) { K.tone(hi ? 880 : 440, hi ? 0.5 : 0.2, "square", 0.07); },
    kick() { K.tone(320, 0.08, "square", 0.08); K.tone(620, 0.16, "triangle", 0.1, 0.05); K.tone(900, 0.12, "sine", 0.07, 0.12); },
    whoosh() { K.tone(500, 0.08, "triangle", 0.05); K.tone(380, 0.1, "triangle", 0.04, 0.05); },
    bell() { K.tone(1568, 0.25, "sine", 0.1); K.tone(1568, 0.3, "sine", 0.1, 0.18); },
    lap() { [784, 988, 1175].forEach((f, i) => K.tone(f, 0.14, "triangle", 0.1, i * 0.09)); },
  };

  // ------------------------------------------------------------ الشاشات
  const colOf = () => COLORS[S.color] || COLORS[0];
  const fmt = (t) => { if (t == null) return "—"; const m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1); };

  // مشهد ثابت خلف القوائم
  function menuScene(t, vk) {
    T = t; buildTrack(t); bg = buildBg(t);
    if (!SPR.star) buildSprites();
    const st = { P: 40 * SEG, x: 0, bg1: 200, bg2: 300, lapN: -1, t: 0, img: [rider(vk, colOf(), 0), rider(vk, colOf(), 1)], fr: 0, lean: -0.08, air: 0, airT: 1, jumpH: 0, wob: 0, splash: 0, bump: 0 };
    segs.forEach((s) => (s.cars.length = 0));
    render(st);
    document.body.classList.add("menu");
  }

  function home() {
    K.begin();
    const c = colOf();
    menuScene(TRACKS[0], S.veh);
    const card = (k) => { const v = VEH[k]; return `<button class="veh f" style="--c:${c.c};--d:${c.d}" ${K.act("v" + k, () => { S.veh = k; S.save(); K.show(tracks); })}>
      <span class="big emo">${v.emo}</span><b>${v.name}</b><small>${v.tip}</small></button>`; };
    K.paint(`
      <h1 class="logo">سباق الدراجات <span class="emo">🏁</span></h1>
      <div class="tag">اختر دراجتك</div>
      <div class="vehs">${card("moto")}${card("bike")}</div>
      <div class="cols"><span>اللون:</span>${COLORS.map((x, i) => `<button class="col f ${i === S.color ? "on" : ""}" style="--c:${x.c}" ${K.act("c" + i, () => { S.color = i; S.save(); K.top().focus = "c" + i; K.render(); K.sfx.pop(); })}>${i === S.color ? "✓" : ""}</button>`).join("")}</div>
      ${K.HELP}`, "v" + S.veh);
  }

  function tracks() {
    K.begin();
    const v = VEH[S.veh];
    menuScene(TRACKS[1], S.veh);
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill"><span class="emo">${v.emo}</span> ${v.name}</span><span class="pill">اختر الطريق</span></div>
      <div class="tracks">${TRACKS.map((t) => {
        const b = (S.best[t.id] || {})[S.veh], w = (S.wins[t.id] || {})[S.veh];
        return `<button class="trk f" style="--g:${t.g}" ${K.act("t" + t.id, () => K.show(race, t))}>
          <span class="big emo">${t.emo}</span><b>${t.name}</b><span class="lv">${"●".repeat(t.lvl)} ${t.diff}</span>
          <small>${b ? `<span class="emo">${w ? "🥇" : "🏆"}</span> ${fmt(b)}` : "&nbsp;"}</small></button>`;
      }).join("")}</div>
      <div class="help"><b>✕</b> أو <b>↑</b> للتسارع · <b>□</b> أو <b>↓</b> للفرملة · <b>← →</b> للتوجيه · <b>○</b> للإيقاف${" · <b>△</b> أو <b>←←</b> للركلة"}</div>`, "tcity");
  }

  // ------------------------------------------------------------ السباق
  function race(t) {
    K.begin();
    document.body.classList.remove("menu");
    document.body.classList.add("racing");
    T = t; buildTrack(t); bg = buildBg(t);
    if (!SPR.star) buildSprites();
    const vk = S.veh, V = VEH[vk], col = colOf();
    const others = K.shuffle(COLORS.filter((x) => x !== col)).slice(0, RIVALS);
    const grid = [[-0.5, 1700], [0.5, 1350], [-0.5, 1000], [0.5, 650], [-0.5, 300]];
    const rr2 = rnd(Date.now() & 0xffff);
    const rivals = others.map((c, i) => ({ c, x: grid[i][0], lane: grid[i][0], d: grid[i][1], v: 0,
      skill: t.rival[0] + (t.rival[1] - t.rival[0]) * (i / (RIVALS - 1)) * (0.8 + rr2() * 0.4), img: [rider(vk, c, 0), rider(vk, c, 1)], fr: 0, done: null, tl: 2 + rr2() * 3 }));
    const st = R = { P: 0, d: 0, x: 0.5 * 0, v: 0, t: 0, time: 0, state: "count", cnt: 3.6, lapN: 0, bg1: 0, bg2: 0, img: [rider(vk, col, 0), rider(vk, col, 1)], fr: 0, frT: 0,
      lean: 0, air: 0, airT: V.jumpT, jumpH: V.jumpH, wob: 0, splash: 0, bump: 0, flip: 0, stars: 0, jumps: 0, place: RIVALS + 1, lastSeg: 0, endT: 0, kick: 0, kickDir: 1, kickCd: 0, kicks: 0 };
    st.x = 0; st.rivals = rivals; st.vk = vk;
    const keys = {};
    let paused = false, raf = 0, last = 0, hudN = 0;

    K.paint(`
      <div class="hud">
        <div class="p lap" id="hLap"></div><div class="p tm" id="hTm">0:00.0</div><div class="p pos" id="hPos"></div>
        <div class="p st"><span class="emo">⭐</span> <span id="hSt">0</span></div>
        <div class="p spd"><span id="hSp">0</span> <small>كم/س</small></div>
        <div class="bar" id="hBar">${rivals.map((r) => `<i style="background:${r.c.c}"></i>`).join("")}<i class="me" style="background:${col.c}"></i><span class="fl emo">🏁</span></div>
      </div>
      <div class="hint" id="hint"><span class="emo">👟</span> للركلة: اضغط <b>←←</b> أو <b>→→</b> بسرعة، أو <b>△</b></div>
      <div class="msg" id="msg"></div>
      <div class="pause" id="pause"><h1>استراحة <span class="emo">⏸️</span></h1>
        <div class="nav"><button class="btn f go" ${K.act("resume", () => setPause(false))}>▶ متابعة</button>
        <button class="btn f" ${K.act("again", () => K.replace(race, t))}><span class="emo">🔁</span> من جديد</button>
        <button class="btn f" ${K.act("quit", () => K.back())}><span class="emo">🚪</span> خروج</button></div></div>`);
    const $ = (id) => document.getElementById(id);
    const hud = { lap: $("hLap"), tm: $("hTm"), pos: $("hPos"), st: $("hSt"), sp: $("hSp"), dots: [...$("hBar").querySelectorAll("i")], msg: $("msg") };
    const cache = {};
    let hintEl = $("hint");
    const setT = (k, v) => { if (cache[k] !== v) { cache[k] = v; hud[k].textContent = v; } };
    let msgT = 0;
    const say = (txt, small) => { hud.msg.textContent = txt; hud.msg.className = "msg" + (small ? " sm" : ""); void hud.msg.offsetWidth; hud.msg.classList.add("show"); msgT = small ? 1.1 : 0.9; };

    function setPause(on) {
      paused = on;
      $("pause").classList.toggle("on", on);
      if (on) { K.focus(app().querySelector('[data-k="resume"]')); engineSet(0, false); }
      Object.keys(keys).forEach((k) => (keys[k] = false));
    }
    const app = () => K.app;

    const ACC = { ArrowUp: "acc", Enter: "acc", " ": "acc", ArrowDown: "brk", ArrowLeft: "left", ArrowRight: "right" };
    const pad = { prev: [] }, tap = { k: "", t: 0 };
    let kickReq = 0;
    // ركلة الدراجة الهوائية: تُبطئ المنافس القريب وتجعله يتمايل (بلا سقوط)
    function doKick(dir) {
      if (st.kickCd > 0 || st.state !== "race" || st.air > 0) return;
      let best = null, bd = 1e9;
      for (const r of rivals) {
        const rel = mod(r.d - st.d + L / 2, L) - L / 2, dx = r.x - st.x;
        if (rel < -200 || rel > 900 || Math.abs(dx) > 0.8) continue;
        if (Math.abs(dir) === 1 && Math.abs(dx) > 0.15 && Math.sign(dx) !== dir) continue;
        if (Math.abs(rel) < bd) { bd = Math.abs(rel); best = r; }
      }
      const kd = Math.abs(dir) === 1 ? dir : best ? Math.sign(best.x - st.x) || 1 : st.lean < 0 ? -1 : 1;
      st.kick = 0.35; st.kickDir = kd; st.kickCd = 0.8;
      if (!best) { snd.whoosh(); return; }
      best.v *= 0.55; best.wob = 1.2; best.lane = Math.max(-0.9, Math.min(0.9, best.x + kd * 0.3)); best.tl = 2.5;
      st.kicks++; snd.kick(); say("ركلة! 👟", true);
    }
    K.mode = {
      key(e) {
        if (paused) { if (e.key === "Backspace") { setPause(false); return true; } return false; }
        if (e.key === "Backspace") { if (st.state !== "done") setPause(true); return true; }
        if (!e.pad && (e.key === "k" || e.key === "K" || e.key === "Shift" || e.key === "Control")) { if (!e.repeat) kickReq = 0.001; return true; }
        if (ACC[e.key]) {
          if (!e.pad && !e.repeat && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
            const now = performance.now();
            if (tap.k === e.key && now - tap.t < 320) { kickReq = e.key === "ArrowLeft" ? -1 : 1; tap.t = 0; } else { tap.k = e.key; tap.t = now; }
          }
          if (!e.pad) keys[ACC[e.key]] = true; return true;
        }
        return false;
      },
      keyup(e) { if (ACC[e.key]) keys[ACC[e.key]] = false; },
      poll(pads) {
        if (!pads.length) { pad.prev = []; pad.ctl = null; return false; }
        const g = pads[0], b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
        if (paused) { pad.ctl = null; const held = pad.prev[1] && b(1); pad.prev = g.buttons.map((x) => x.pressed); return held; }
        if ((b(1) && !pad.prev[1]) || (b(9) && !pad.prev[9])) { if (st.state !== "done") setPause(true); }
        const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        { if (b(3) && !pad.prev[3]) kickReq = 0.001; if (b(4) && !pad.prev[4]) kickReq = -1; if (b(5) && !pad.prev[5]) kickReq = 1; }
        pad.ctl = { steer: Math.abs(ax) > 0.2 ? ax : b(14) ? -1 : b(15) ? 1 : 0, acc: b(0) || b(7) || b(12) || ay < -0.6, brk: b(2) || b(6) || b(13) || ay > 0.6 };
        pad.prev = g.buttons.map((x) => x.pressed);
        return true;
      },
      stop() { cancelAnimationFrame(raf); engineOff(); document.body.classList.remove("racing"); window.removeEventListener("blur", blur); },
    };
    const blur = () => Object.keys(keys).forEach((k) => (keys[k] = false));
    window.addEventListener("blur", blur);
    engineOn(vk);

    function update(dt) {
      st.t += dt;
      if (msgT > 0 && (msgT -= dt) <= 0) hud.msg.classList.remove("show");
      const pc = pad.ctl || {};
      if (st.kick > 0) st.kick -= dt;
      if (st.kickCd > 0) st.kickCd -= dt;
      if (kickReq) { doKick(kickReq); kickReq = 0; }
      if (hintEl && st.state === "race" && st.time > 7) { hintEl.remove(); hintEl = null; }
      let steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0) + (pc.steer || 0);
      steer = Math.max(-1, Math.min(1, steer));
      let acc = keys.acc || pc.acc, brk = keys.brk || pc.brk;
      if (st.state === "count") {
        const before = Math.ceil(st.cnt - 0.6);
        st.cnt -= dt;
        const now = Math.ceil(st.cnt - 0.6);
        if (now !== before || st.t === dt) { if (now > 0) { say(String(now)); snd.beep(false); } else { say("انطلق!"); snd.beep(true); if (vk === "bike") snd.bell(); st.state = "race"; } }
        steer = 0; acc = false; brk = false;
      } else if (st.state === "race") st.time += dt;
      if (st.state === "done") { acc = false; brk = false; steer = 0; st.endT += dt; if (st.endT > 2.4) return finish(); }

      const max = V.max, sp = st.v / max;
      const pl = segAt(st.P + PZ);
      const dxs = dt * V.steer * Math.min(1, sp * 1.6);
      st.x += steer * dxs * (st.air > 0 ? 0.6 : 1);
      st.x -= dxs * sp * pl.curve * V.centri * T.grip;
      st.lean += ((steer * 0.28 + pl.curve * sp * 0.02) - st.lean) * Math.min(1, dt * 8);

      if (acc) st.v += V.accel * dt;
      else if (brk) st.v -= max * 1.2 * dt;
      else st.v -= max * 0.22 * dt;
      const off = Math.abs(st.x) > 1.05 && st.air <= 0;
      st.bump = off;
      if (off && st.v > max * 0.35) st.v -= max * 0.9 * dt;
      st.v = Math.max(0, Math.min(st.v, max));
      st.x = Math.max(-1.45, Math.min(1.45, st.x));

      // تحرك اللاعب
      const step = st.v * dt;
      st.d += step; st.P = mod(st.d, L);
      st.frT += dt * (0.5 + sp * 6); if (st.frT > 1) { st.frT = 0; st.fr ^= 1; }
      if (vk === "moto") st.fr = 0;
      st.bg1 += pl.curve * sp * dt * 12; st.bg2 += pl.curve * sp * dt * 30;
      if (st.air > 0) { st.air -= dt; if (vk === "bike") st.flip = 0; if (st.air <= 0) { st.air = 0; K.tone(200, 0.08, "triangle", 0.08); } }
      if (st.wob > 0) st.wob -= dt;
      if (st.splash > 0) st.splash -= dt;

      // اللفات
      const lapN = Math.floor(st.d / L);
      if (lapN !== st.lapN && st.state === "race") {
        st.lapN = lapN;
        if (lapN >= LAPS) { st.state = "done"; st.place = 1 + rivals.filter((r) => r.done != null).length; say(st.place === 1 ? "🥇 الأول!" : "🏁 وصلت!", true); snd.lap(); }
        else { say(lapN === LAPS - 1 ? "آخر لفة!" : "اللفة " + (lapN + 1), true); snd.lap(); }
      }

      // الاصطدام بالأشياء على الطريق
      const segNow = Math.floor((st.P + PZ) / SEG) % N;
      let si = st.lastSeg, guard = 0;
      while (si !== segNow && guard++ < 8) {
        si = (si + 1) % N;
        for (const o of segs[si].spr) {
          if (!o.hit || o.taken === st.lapN) continue;
          const w = o.hit === "star" ? 0.24 : o.hit === "cone" ? 0.2 : 0.3;
          if (Math.abs(o.x - st.x) > w) continue;
          if (o.hit === "star") { if (st.air > 0 && !o.float) continue; o.taken = st.lapN; st.stars++; snd.star(); continue; }
          if (st.air > 0) continue;
          if (o.hit === "ramp") { st.air = st.airT = V.jumpT; st.jumps++; snd.jump(); if (vk === "bike") say("قفزة!", true); continue; }
          o.taken = st.lapN;
          if (o.hit === "cone") { st.v *= 0.6; st.wob = 0.6; snd.bump(); }
          if (o.hit === "puddle") { st.v *= 0.7; st.splash = 0.4; st.wob = 0.3; snd.splash(); }
        }
      }
      st.lastSeg = segNow;

      // المنافسون
      segs.forEach((s) => (s.cars.length = 0));
      let ahead = 0;
      for (const r of rivals) {
        const rs = segAt(mod(r.d + PZ, L));
        const gapD = r.d - st.d;
        let band = gapD > 4000 ? 0.95 : gapD < -2500 ? 1.08 : 1;
        if (r.done != null) band = 0.85;
        const target = st.state === "count" ? 0 : max * r.skill * band * (1 - Math.min(0.12, Math.abs(rs.curve) * 0.02));
        r.v += Math.sign(target - r.v) * Math.min(Math.abs(target - r.v), max * 0.3 * dt);
        r.d += r.v * dt;
        r.tl -= dt;
        if (r.tl < 0) { r.tl = 2 + Math.random() * 4; r.lane = [-0.6, 0, 0.6][(Math.random() * 3) | 0]; }
        if (r.wob > 0) r.wob -= dt;
        r.x += (r.lane - r.x) * Math.min(1, dt * (r.wob > 0 ? 1.5 : 0.8));
        r.frT = (r.frT || 0) + dt * (r.v / max) * 6; if (r.frT > 1) { r.frT = 0; r.fr = vk === "bike" ? r.fr ^ 1 : 0; }
        if (r.done == null && r.d >= LAPS * L) r.done = st.time;
        // تصادم لطيف: يبطئ فقط
        const rel = mod(r.d - st.d + L / 2, L) - L / 2;
        if (rel > 0 && rel < SEG * 1.3 && Math.abs(r.x - st.x) < 0.3 && st.v > r.v && st.air <= 0) {
          st.v = r.v * 0.92; st.x += st.x < r.x ? -0.06 : 0.06; if (!st.wob || st.wob <= 0) { snd.bump(); st.wob = 0.3; }
        }
        if (r.d > st.d) ahead++;
        const z = mod(r.d + PZ, L), s = segs[Math.floor(z / SEG) % N];
        const rp = mod(z - st.P, L);
        if (rp > PZ * 0.5 && rp < DRAW * SEG) s.cars.push({ x: r.x, pct: (z % SEG) / SEG, img: r.img, fr: r.fr, wob: r.wob || 0 });
      }
      if (st.state !== "done") st.place = ahead + 1;

      // الواجهة
      setT("lap", "اللفة " + Math.min(LAPS, st.lapN + 1) + "/" + LAPS);
      setT("tm", fmt(st.time));
      setT("pos", (st.place === 1 ? "🥇 " : "") + st.place + " / " + (RIVALS + 1));
      setT("st", String(st.stars));
      setT("sp", String(Math.round(sp * V.kmh)));
      if (++hudN % 6 === 0) {
        const tot = LAPS * L;
        rivals.forEach((r, i) => (hud.dots[i].style.right = Math.max(0, Math.min(100, (r.d / tot) * 100)) + "%"));
        hud.dots[RIVALS].style.right = Math.max(0, Math.min(100, (st.d / tot) * 100)) + "%";
      }
      engineSet(sp, true);
    }

    let ended = false;
    function finish() {
      if (ended) return; ended = true;
      ctx.fillStyle = "rgba(15,23,42,.45)"; ctx.fillRect(0, 0, W, H);
      const time = st.time, place = st.place;
      const b = (S.best[t.id] = S.best[t.id] || {});
      const isBest = b[vk] == null || time < b[vk];
      if (isBest) b[vk] = time;
      if (place === 1) { S.wins[t.id] = S.wins[t.id] || {}; S.wins[t.id][vk] = 1; }
      S.save();
      const medal = ["🥇", "🥈", "🥉"][place - 1] || "🏅";
      if (place === 1) earn(t);
      K.replace(K.resultScreen, {
        s: place === 1 ? 3 : place <= 3 ? 2 : 1,
        msg: `<span class="emo">${medal}</span> ` + (place === 1 ? "المركز الأول! بطل" : "المركز " + ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"][place]),
        title: `${t.name} · ${V.name}`,
        extra: `<div class="res"><div>الوقت<b>${fmt(time)}</b></div><div class="${isBest ? "new" : ""}">أفضل وقت${isBest ? " 🎉" : ""}<b>${fmt(b[vk])}</b></div><div>النجوم<b>⭐ ${st.stars}</b></div><div>الركلات<b>👟 ${st.kicks}</b></div></div><div class="earn" id="earn"></div>`,
        again: () => K.replace(race, t),
        next: { label: "طريق آخر", fn: () => K.back() },
      });
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
      last = ts;
      if (paused) return;
      update(dt);
      if (!ended) render(st);
    }
    raf = requestAnimationFrame(frame);
  }

  function earn(t) {
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: t.earn, game: GAME, reason: "المركز الأول في " + t.name }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.added) { const e = document.getElementById("earn"); if (e) e.textContent = "+" + d.added + " ⭐ في رصيدك!"; } })
      .catch(() => {});
  }

  buildSprites();
  K.start(home);
  window.__bikes = { get R() { return R; }, get segs() { return segs; } };
})();
