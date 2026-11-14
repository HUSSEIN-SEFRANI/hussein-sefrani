// draw.js — رسوم «لعبة عمر» كلها مرسومة بالـCanvas (عمر، المخلوقات، الأرض، الخلفيات، الهدايا)
(() => {
  "use strict";
  const T = 45, VW = 960, VH = 540;
  const D = (window.D = { T, VW, VH });
  const TAU = Math.PI * 2;
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  D.mk = mk;

  // ---------------------------------------------------------------- العوالم
  // hold: ما يحمله عمر ويقذفه في هذا العالم
  D.WORLDS = [
    { name: "الحديقة", emo: "🌷", sky: ["#60a5fa", "#e0f2fe"], top: "#4ade80", top2: "#bbf7d0", dirt: "#b45309", dirt2: "#92400e", brick: "#fb923c", plat: "#c2410c",
      bg: "hills", far: "#86efac", near: "#22c55e", walker: "hedgehog", flyer: "bee", decor: ["🌷", "🌼", "🌻"], hold: { name: "كرة", c1: "#ef4444", c2: "#fff" }, cards: ["#4ade80", "#16a34a"] },
    { name: "الشاطئ", emo: "🏖️", sky: ["#38bdf8", "#fef9c3"], top: "#fde68a", top2: "#fef3c7", dirt: "#f59e0b", dirt2: "#d97706", brick: "#38bdf8", plat: "#a16207",
      bg: "sea", far: "#0ea5e9", near: "#15803d", walker: "crab", flyer: "bird", decor: ["🐚", "🌴", "🦀"], hold: { name: "كرة شاطئ", c1: "#facc15", c2: "#3b82f6" }, cards: ["#38bdf8", "#f59e0b"] },
    { name: "الغابة", emo: "🌲", sky: ["#4ade80", "#ecfccb"], top: "#65a30d", top2: "#a3e635", dirt: "#78350f", dirt2: "#451a03", brick: "#a16207", plat: "#713f12",
      bg: "trees", far: "#16a34a", near: "#166534", walker: "beetle", flyer: "bee", decor: ["🌿", "🍀", "🍂"], hold: { name: "كوز صنوبر", c1: "#92400e", c2: "#fbbf24" }, cards: ["#22c55e", "#166534"] },
    { name: "الجبال", emo: "⛰️", sky: ["#818cf8", "#e0e7ff"], top: "#84cc16", top2: "#d9f99d", dirt: "#78716c", dirt2: "#57534e", brick: "#a8a29e", plat: "#57534e",
      bg: "mountains", far: "#a5b4fc", near: "#65a30d", walker: "hedgehog", flyer: "bird", decor: ["🌾", "🌼", "🌱"], hold: { name: "حجر صغير", c1: "#94a3b8", c2: "#e2e8f0" }, cards: ["#818cf8", "#57534e"] },
    { name: "الثلج", emo: "⛄", sky: ["#93c5fd", "#ffffff"], top: "#ffffff", top2: "#e0f2fe", dirt: "#7dd3fc", dirt2: "#38bdf8", brick: "#bae6fd", plat: "#0284c7",
      bg: "snow", far: "#e0f2fe", near: "#ffffff", walker: "snowball", flyer: "bird", decor: ["⛄", "❄️", "🌲"], hold: { name: "كرة ثلج", c1: "#ffffff", c2: "#bae6fd" }, ice: true, cards: ["#7dd3fc", "#2563eb"] },
    { name: "قلعة الحلوى", emo: "🍭", sky: ["#f472b6", "#fdf2f8"], top: "#f9a8d4", top2: "#fff1f2", dirt: "#92400e", dirt2: "#78350f", brick: "#f0abfc", plat: "#db2777",
      bg: "castle", far: "#f5d0fe", near: "#f472b6", walker: "jelly", flyer: "bee", decor: ["🍭", "🍬", "🧁"], hold: { name: "حلوى", c1: "#ec4899", c2: "#fde047" }, cards: ["#f472b6", "#a855f7"] },
  ];

  // ---------------------------------------------------------------- إيموجي مخزّنة كصور
  const emoCache = {};
  D.emo = (ch, px) => {
    const k = ch + px;
    if (emoCache[k]) return emoCache[k];
    const s = Math.ceil(px * 1.3), c = mk(s, s), x = c.getContext("2d");
    x.font = `${px}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(ch, s / 2, s / 2 + px * 0.06);
    return (emoCache[k] = c);
  };

  // ---------------------------------------------------------------- أشكال صغيرة
  const rr = (x, X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  D.rr = rr;
  const circ = (x, X, Y, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(X, Y, r, 0, TAU); x.fill(); };
  function starPath(x, cx, cy, R, r) {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
    x.closePath();
  }
  D.starPath = starPath;
  D.star = (() => {
    const c = mk(40, 40), x = c.getContext("2d");
    starPath(x, 20, 21, 17, 8); x.fillStyle = "#facc15"; x.fill(); x.lineWidth = 3; x.strokeStyle = "#ca8a04"; x.lineJoin = "round"; x.stroke();
    circ(x, 15, 17, 3, "rgba(255,255,255,.8)");
    return c;
  })();
  function heartPath(x, cx, cy, s) {
    x.beginPath(); x.moveTo(cx, cy + s * 0.9);
    x.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.45);
    x.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9); x.closePath();
  }
  D.heart = (() => { const c = mk(40, 40), x = c.getContext("2d"); heartPath(x, 20, 21, 15); x.fillStyle = "#f43f5e"; x.fill(); x.lineWidth = 3; x.strokeStyle = "#be123c"; x.stroke(); circ(x, 13, 14, 3, "rgba(255,255,255,.75)"); return c; })();
  D.heartOff = (() => { const c = mk(40, 40), x = c.getContext("2d"); heartPath(x, 20, 21, 15); x.fillStyle = "rgba(255,255,255,.35)"; x.fill(); x.lineWidth = 3; x.strokeStyle = "rgba(0,0,0,.25)"; x.stroke(); return c; })();
  // المكعب الملوّن (قطعة الهدية)
  D.CUBE_COLS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];
  D.cube = D.CUBE_COLS.map((col) => {
    const c = mk(36, 36), x = c.getContext("2d");
    x.fillStyle = col; rr(x, 3, 9, 24, 24, 4); x.fill();
    x.fillStyle = "rgba(255,255,255,.45)"; x.beginPath(); x.moveTo(3, 11); x.lineTo(11, 3); x.lineTo(33, 3); x.lineTo(27, 11); x.closePath(); x.fill();
    x.fillStyle = "rgba(0,0,0,.25)"; x.beginPath(); x.moveTo(27, 11); x.lineTo(33, 3); x.lineTo(33, 25); x.lineTo(27, 33); x.closePath(); x.fill();
    x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 2; rr(x, 3, 9, 24, 24, 4); x.stroke();
    circ(x, 10, 16, 2.5, "rgba(255,255,255,.8)");
    return c;
  });

  // ما يحمله عمر (كرة بلونين)
  D.drawHeld = (x, X, Y, h, r = 7, rot = 0) => {
    x.save(); x.translate(X, Y); x.rotate(rot);
    circ(x, 0, 0, r, h.c1);
    x.fillStyle = h.c2; x.beginPath(); x.arc(0, 0, r, -0.6, 0.6); x.lineTo(0, 0); x.fill();
    x.beginPath(); x.arc(0, 0, r, Math.PI - 0.6, Math.PI + 0.6); x.lineTo(0, 0); x.fill();
    x.lineWidth = 1.5; x.strokeStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke();
    x.restore();
  };

  // ---------------------------------------------------------------- عمر
  // الإحداثيات: (X, Y) منتصف القدمين. dir: 1 يمين، -1 يسار. ph: طور الجري. pose: "idle" | "run" | "air" | "throw"
  const SKIN = "#e9b383", SKIN2 = "#c98b5a", HAIR = "#2b1a12", SHIRT = "#0ea5e9", SHIRT2 = "#0369a1", SHORTS = "#1e3a8a", SHOE = "#ef4444";
  D.drawOmar = (x, X, Y, dir, ph, pose, held, throwT = 0) => {
    x.save(); x.translate(X, Y); x.scale(dir, 1);
    x.lineCap = "round";
    const run = pose === "run", air = pose === "air";
    const sw = air ? 0.65 : run ? Math.sin(ph) * 0.75 : 0;
    const bob = run ? -Math.abs(Math.sin(ph)) * 2 : 0;
    x.translate(0, bob);
    const leg = (a, back) => {
      const hx = back ? -3 : 3, hy = -19, L = 15;
      const ex = hx + Math.sin(a) * L, ey = hy + Math.cos(a) * L;
      x.strokeStyle = back ? SKIN2 : SKIN; x.lineWidth = 7; x.beginPath(); x.moveTo(hx, hy); x.lineTo(ex, ey); x.stroke();
      x.fillStyle = back ? "#b91c1c" : SHOE; x.beginPath(); x.ellipse(ex + 3, ey + 1, 6.5, 4, 0, 0, TAU); x.fill();
      x.fillStyle = "#fff"; x.fillRect(ex - 2, ey + 3, 9, 1.6);
    };
    const arm = (a, back) => {
      const sx = 0, sy = -33, L = 13;
      const ex = sx + Math.sin(a) * L, ey = sy + Math.cos(a) * L;
      x.strokeStyle = back ? SKIN2 : SKIN; x.lineWidth = 6; x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
      circ(x, sx, sy + 1, 4.5, back ? SHIRT2 : SHIRT);
      return [ex, ey];
    };
    // الذراع والساق الخلفيتان
    leg(air ? -0.5 : -sw, true);
    arm(air ? -0.6 : sw * 0.9, true);
    // الشورت والقميص
    x.fillStyle = SHORTS; rr(x, -9, -25, 18, 9, 3); x.fill();
    x.fillStyle = SHIRT; rr(x, -10, -39, 20, 17, 6); x.fill();
    x.fillStyle = SHIRT2; x.fillRect(-10, -25, 20, 2.5);
    x.save(); x.scale(dir, 1); x.fillStyle = "#fff"; x.font = "bold 12px Baloo, Tahoma, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("ع", 0, -31); x.restore();
    leg(air ? 0.9 : sw, false);
    // الذراع الأمامية تحمل الشيء
    let a = air ? -2.3 : -sw * 0.9 - 0.25;
    if (pose === "throw") a = -2.6 + Math.min(1, throwT * 6) * 3.4;
    else if (held) a = air ? 2.0 : 1.1 + Math.sin(ph) * 0.15 * (run ? 1 : 0);
    const [hx, hy] = arm(a, false);
    if (held && pose !== "throw") D.drawHeld(x, hx + 2, hy, held, 7);
    // الرأس
    x.save(); x.translate(1, -50);
    circ(x, -10, 1, 4, SKIN2); // الأذن
    circ(x, 0, 0, 13.5, SKIN);
    // الشعر
    x.fillStyle = HAIR;
    x.beginPath(); x.arc(0, -1, 14.2, Math.PI * 0.92, Math.PI * 2.05); x.lineTo(9, -5); x.quadraticCurveTo(0, -9, -12, 1); x.closePath(); x.fill();
    circ(x, 5, -13, 5, HAIR); circ(x, -4, -14, 5, HAIR); circ(x, -11, -8, 5, HAIR);
    // الوجه
    circ(x, 7, -1, 3.6, "#fff");
    circ(x, 8, -1, 2.3, "#1f2937");
    circ(x, 8.8, -1.9, 0.8, "#fff");
    x.strokeStyle = HAIR; x.lineWidth = 1.8; x.beginPath(); x.moveTo(4, -6.5); x.lineTo(10.5, -6); x.stroke();
    circ(x, 4, 5, 2.8, "rgba(244,114,182,.45)");
    x.strokeStyle = "#7c2d12"; x.lineWidth = 2; x.beginPath(); x.arc(8, 4, 4, 0.25, Math.PI * 0.85); x.stroke();
    x.restore();
    x.restore();
  };

  // ---------------------------------------------------------------- المخلوقات اللطيفة
  // (X, Y) منتصف القدمين. dir اتجاه المشي. t الزمن.
  const eye = (x, X, Y, r = 3.2) => { circ(x, X, Y, r, "#fff"); circ(x, X + r * 0.3, Y, r * 0.6, "#1f2937"); circ(x, X + r * 0.5, Y - r * 0.4, r * 0.25, "#fff"); };
  const smile = (x, X, Y, r, col = "#1f2937") => { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.arc(X, Y, r, 0.2, Math.PI - 0.2); x.stroke(); };
  D.walkers = {
    hedgehog(x, X, Y, dir, t) {
      x.save(); x.translate(X, Y); x.scale(dir, 1);
      const st = Math.sin(t * 12) * 3;
      circ(x, -8 + st, -3, 4, "#78350f"); circ(x, 8 - st, -3, 4, "#78350f");
      x.fillStyle = "#92400e"; x.beginPath();
      for (let i = 0; i <= 9; i++) { const a = Math.PI + (i / 9) * Math.PI, q = i % 2 ? 23 : 17; x.lineTo(Math.cos(a) * q - 3, -6 + Math.sin(a) * q * 0.95); }
      x.closePath(); x.fill();
      x.fillStyle = "#fcd9a8"; x.beginPath(); x.ellipse(9, -11, 11, 9, 0.2, 0, TAU); x.fill();
      circ(x, 19, -12, 3, "#1f2937");
      eye(x, 10, -15, 3); smile(x, 12, -10, 3);
      circ(x, 6, -8, 2.5, "rgba(244,114,182,.6)");
      x.restore();
    },
    crab(x, X, Y, dir, t) {
      x.save(); x.translate(X, Y);
      const st = Math.sin(t * 14) * 3, cl = Math.sin(t * 6) * 3;
      x.strokeStyle = "#b91c1c"; x.lineWidth = 3;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(s * 8, -8); x.lineTo(s * (14 + i * 3), -1 + (i % 2 ? st : -st) * 0.4); x.stroke(); }
      x.strokeStyle = "#dc2626"; x.lineWidth = 3.5;
      x.beginPath(); x.moveTo(-6, -18); x.lineTo(-7, -26); x.moveTo(6, -18); x.lineTo(7, -26); x.stroke();
      x.fillStyle = "#ef4444"; x.beginPath(); x.ellipse(0, -12, 17, 10, 0, 0, TAU); x.fill();
      for (const s of [-1, 1]) { circ(x, s * 21, -18 + cl * s, 6, "#ef4444"); x.fillStyle = "#fca5a5"; x.beginPath(); x.arc(s * 21, -18 + cl * s, 6, -0.4, 0.4); x.lineTo(s * 21, -18 + cl * s); x.fill(); }
      eye(x, -7, -27, 3.4); eye(x, 7, -27, 3.4); smile(x, 0, -11, 4);
      x.restore();
    },
    beetle(x, X, Y, dir, t) {
      x.save(); x.translate(X, Y); x.scale(dir, 1);
      const st = Math.sin(t * 14) * 2.5;
      x.strokeStyle = "#1e1b4b"; x.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * 8, -6); x.lineTo(i * 8 + (i % 2 ? st : -st), 0); x.stroke(); }
      circ(x, 15, -11, 8, "#312e81");
      eye(x, 17, -13, 3);
      x.fillStyle = "#6366f1"; x.beginPath(); x.arc(-2, -6, 17, Math.PI, TAU); x.closePath(); x.fill();
      x.strokeStyle = "#312e81"; x.lineWidth = 2; x.beginPath(); x.moveTo(-2, -23); x.lineTo(-2, -6); x.stroke();
      circ(x, -9, -13, 3, "#fde047"); circ(x, 5, -13, 3, "#fde047"); circ(x, -2, -18, 2.2, "#fde047");
      x.strokeStyle = "#312e81"; x.beginPath(); x.moveTo(19, -18); x.quadraticCurveTo(24, -26, 27, -24); x.stroke();
      x.restore();
    },
    snowball(x, X, Y, dir, t) {
      x.save(); x.translate(X, Y);
      const sq = 1 + Math.sin(t * 10) * 0.05;
      x.scale(1 / sq, sq);
      circ(x, 0, -16, 16, "#fff"); x.lineWidth = 2; x.strokeStyle = "#93c5fd"; x.beginPath(); x.arc(0, -16, 16, 0, TAU); x.stroke();
      x.fillStyle = "#2563eb"; x.beginPath(); x.arc(0, -25, 11, Math.PI, TAU); x.fill(); circ(x, 0, -37, 4, "#f472b6");
      x.fillStyle = "#1d4ed8"; x.fillRect(-12, -27, 24, 4);
      eye(x, -5 + dir * 2, -17, 3.2); eye(x, 5 + dir * 2, -17, 3.2);
      circ(x, -9, -11, 2.8, "rgba(244,114,182,.6)"); circ(x, 9, -11, 2.8, "rgba(244,114,182,.6)");
      circ(x, dir * 3, -11, 2.5, "#fb923c");
      x.restore();
    },
    jelly(x, X, Y, dir, t) {
      x.save(); x.translate(X, Y);
      const sq = 1 + Math.sin(t * 9) * 0.1;
      x.scale(1 / sq, sq);
      x.fillStyle = "#4ade80"; x.beginPath(); x.moveTo(-17, 0); x.quadraticCurveTo(-19, -30, 0, -30); x.quadraticCurveTo(19, -30, 17, 0); x.closePath(); x.fill();
      x.fillStyle = "rgba(255,255,255,.5)"; x.beginPath(); x.ellipse(-8, -21, 4, 6, 0.4, 0, TAU); x.fill();
      eye(x, -5 + dir * 2, -16, 3.2); eye(x, 6 + dir * 2, -16, 3.2); smile(x, dir * 2, -11, 4, "#166534");
      x.restore();
    },
  };
  D.flyers = {
    bee(x, X, Y, dir, t, pink) {
      x.save(); x.translate(X, Y); x.scale(dir, 1);
      const fl = Math.abs(Math.sin(t * 30));
      x.fillStyle = "rgba(255,255,255,.85)";
      x.beginPath(); x.ellipse(-3, -12, 6, 10 * fl + 2, -0.3, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(4, -12, 6, 9 * fl + 2, 0.3, 0, TAU); x.fill();
      x.fillStyle = pink ? "#f9a8d4" : "#facc15"; x.beginPath(); x.ellipse(0, 0, 14, 10, 0, 0, TAU); x.fill();
      x.fillStyle = pink ? "#a21caf" : "#1f2937"; x.fillRect(-6, -9.5, 4, 19); x.fillRect(1, -9.8, 4, 19.6);
      eye(x, 9, -2, 3); smile(x, 9, 2, 2.5);
      x.restore();
    },
    bird(x, X, Y, dir, t, _p, col = "#f97316") {
      x.save(); x.translate(X, Y); x.scale(dir, 1);
      const fl = Math.sin(t * 16);
      circ(x, 0, 0, 12, col);
      x.fillStyle = "#fed7aa"; x.beginPath(); x.ellipse(3, 4, 7, 5, 0, 0, TAU); x.fill();
      x.fillStyle = "#facc15"; x.beginPath(); x.moveTo(11, -3); x.lineTo(19, 0); x.lineTo(11, 3); x.fill();
      eye(x, 6, -4, 3);
      x.fillStyle = "#ea580c"; x.beginPath(); x.moveTo(-4, -2); x.lineTo(-14, -6 - fl * 12); x.lineTo(4, -4); x.fill();
      x.restore();
    },
  };

  // ---------------------------------------------------------------- الأشياء في المرحلة
  D.drawFlag = (x, X, Y, on, t, col) => {
    x.fillStyle = "#64748b"; x.fillRect(X - 2, Y - 95, 4, 95);
    circ(x, X, Y - 97, 5, on ? "#facc15" : "#cbd5e1");
    const w = Math.sin(t * 6) * 4;
    x.fillStyle = on ? col : "#cbd5e1";
    x.beginPath(); x.moveTo(X + 2, Y - 92); x.quadraticCurveTo(X + 20, Y - 88 + w, X + 38, Y - 80 + w); x.quadraticCurveTo(X + 20, Y - 72 - w, X + 2, Y - 66); x.closePath(); x.fill();
    if (on) { x.drawImage(D.star, X + 6, Y - 88, 18, 18); }
  };
  // باب النهاية: بيت صغير ملوّن
  D.drawDoor = (x, X, Y, t, col) => {
    x.fillStyle = "#fef3c7"; rr(x, X - 48, Y - 110, 96, 110, 6); x.fill();
    x.fillStyle = col; x.beginPath(); x.moveTo(X - 62, Y - 106); x.lineTo(X, Y - 160); x.lineTo(X + 62, Y - 106); x.closePath(); x.fill();
    x.fillStyle = "#7c2d12"; x.beginPath(); x.moveTo(X - 22, Y); x.lineTo(X - 22, Y - 58); x.arc(X, Y - 58, 22, Math.PI, TAU); x.lineTo(X + 22, Y); x.closePath(); x.fill();
    x.fillStyle = "#a16207"; x.fillRect(X - 17, Y - 56, 14, 52); x.fillRect(X + 3, Y - 56, 14, 52);
    circ(x, X + 12, Y - 30, 3, "#facc15");
    x.fillStyle = "#7dd3fc"; rr(x, X - 42, Y - 92, 16, 16, 3); x.fill(); rr(x, X + 26, Y - 92, 16, 16, 3); x.fill();
    const s = 26 + Math.sin(t * 4) * 3;
    x.drawImage(D.star, X - s / 2, Y - 150 - s / 2, s, s);
  };
  D.drawSpring = (x, X, Y, sq) => {
    const h = 16 - sq * 8;
    x.strokeStyle = "#64748b"; x.lineWidth = 3; x.beginPath();
    for (let i = 0; i <= 4; i++) x.lineTo(X + (i % 2 ? 10 : -10), Y - 3 - (i / 4) * h);
    x.stroke();
    x.fillStyle = "#475569"; rr(x, X - 15, Y - 5, 30, 5, 2); x.fill();
    x.fillStyle = "#22c55e"; rr(x, X - 18, Y - 9 - h, 36, 8, 4); x.fill();
    x.fillStyle = "#86efac"; x.fillRect(X - 13, Y - 8 - h, 26, 2);
  };

  // ---------------------------------------------------------------- البلاطات لكل عالم
  // الأنواع: 1 أرض، 2 مكعب صخري، 3 منصة (يُعبر من تحتها)، 4 منحدر صاعد /، 5 منحدر نازل \
  D.makeTiles = (w) => {
    const tc = (fn) => { const c = mk(T, T); fn(c.getContext("2d")); return c; };
    const dirt = (x) => { x.fillStyle = w.dirt; x.fillRect(0, 0, T, T); [[8, 10], [30, 22], [18, 36], [38, 6], [5, 30]].forEach(([a, b]) => circ(x, a, b, 3, w.dirt2)); };
    const grass = (x) => {
      x.fillStyle = w.top; x.fillRect(0, 0, T, 11);
      for (let i = 0; i < 5; i++) circ(x, i * 11 + 4, 11, 5, w.top);
      x.fillStyle = w.top2; x.fillRect(0, 0, T, 3);
    };
    const inner = tc(dirt);
    const top = tc((x) => { dirt(x); grass(x); });
    const brick = tc((x) => {
      x.fillStyle = "rgba(0,0,0,.25)"; rr(x, 1, 2, T - 2, T - 2, 8); x.fill();
      x.fillStyle = w.brick; rr(x, 1, 1, T - 2, T - 4, 8); x.fill();
      x.fillStyle = "rgba(255,255,255,.35)"; rr(x, 6, 5, T - 12, 9, 4); x.fill();
      x.strokeStyle = "rgba(0,0,0,.25)"; x.lineWidth = 2; rr(x, 1, 1, T - 2, T - 4, 8); x.stroke();
    });
    const plat = tc((x) => {
      x.fillStyle = "rgba(0,0,0,.2)"; rr(x, 0, 3, T, 14, 5); x.fill();
      x.fillStyle = w.plat; rr(x, 0, 0, T, 14, 5); x.fill();
      x.fillStyle = "rgba(255,255,255,.3)"; x.fillRect(4, 2, T - 8, 3);
      x.fillStyle = "rgba(0,0,0,.2)"; x.fillRect(T / 2 - 1, 0, 2, 14);
    });
    const slope = (up) => tc((x) => {
      x.save(); x.beginPath();
      if (up) { x.moveTo(0, T); x.lineTo(T, 0); x.lineTo(T, T); } else { x.moveTo(0, 0); x.lineTo(T, T); x.lineTo(0, T); }
      x.closePath(); x.clip(); dirt(x);
      x.strokeStyle = w.top; x.lineWidth = 22; x.beginPath();
      if (up) { x.moveTo(-3, T + 3); x.lineTo(T + 3, -3); } else { x.moveTo(-3, -3); x.lineTo(T + 3, T + 3); }
      x.stroke(); x.restore();
    });
    return { inner, top, brick, plat, up: slope(true), down: slope(false) };
  };

  // ---------------------------------------------------------------- الخلفيات (تتكرر كل 960 بكسل)
  D.makeBg = (w) => {
    const sky = mk(VW, VH), s = sky.getContext("2d");
    const g = s.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, w.sky[0]); g.addColorStop(1, w.sky[1]);
    s.fillStyle = g; s.fillRect(0, 0, VW, VH);
    if (w.bg !== "trees") { s.fillStyle = "rgba(253,224,71,.35)"; s.beginPath(); s.arc(820, 90, 62, 0, TAU); s.fill(); circ(s, 820, 90, 44, "#fde047"); }
    const far = mk(VW, 320), f = far.getContext("2d"), near = mk(VW, 260), n = near.getContext("2d");
    const wave = (x, H, base, amp, ks, col) => {
      x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
      for (let i = 0; i <= VW; i += 8) { let y = base; ks.forEach(([k, a, p]) => (y += Math.sin((i / VW) * TAU * k + p) * amp * a)); x.lineTo(i, y); }
      x.lineTo(VW, H); x.closePath(); x.fill();
    };
    const each = (xs, fn) => xs.forEach((X) => [X - VW, X, X + VW].forEach(fn));
    // غيوم بعيدة
    const cloud = (x, X, Y, k) => { x.fillStyle = "rgba(255,255,255,.85)"; x.beginPath(); x.ellipse(X, Y, 50 * k, 16 * k, 0, 0, TAU); x.ellipse(X - 18 * k, Y - 12 * k, 22 * k, 18 * k, 0, 0, TAU); x.ellipse(X + 16 * k, Y - 16 * k, 26 * k, 22 * k, 0, 0, TAU); x.fill(); };
    if (w.bg !== "trees") each([140, 480, 700], (X) => cloud(f, X, 40 + ((X * 7) % 60), 1));
    if (w.bg === "hills") {
      wave(f, 320, 170, 40, [[2, 1, 0], [3, 0.5, 1]], w.far);
      wave(n, 260, 120, 30, [[3, 1, 2], [5, 0.4, 0]], w.near);
      each([100, 420, 760], (X) => { n.fillStyle = "#7c2d12"; n.fillRect(X - 5, 70, 10, 50); circ(n, X, 62, 28, "#16a34a"); circ(n, X - 14, 74, 18, "#15803d"); circ(n, X + 15, 72, 18, "#15803d"); });
    } else if (w.bg === "sea") {
      f.fillStyle = "#0ea5e9"; f.fillRect(0, 190, VW, 130);
      f.fillStyle = "#38bdf8"; for (let i = 0; i < VW; i += 60) f.fillRect(i + ((i * 3) % 23), 210 + ((i * 7) % 80), 30, 3);
      wave(f, 320, 200, 6, [[8, 1, 0]], "#7dd3fc");
      f.fillStyle = "#0ea5e9"; f.fillRect(0, 214, VW, 106);
      wave(f, 200, 175, 14, [[1, 1, 0]], "#15803d");
      each([300], (X) => { f.fillStyle = "#fff"; f.beginPath(); f.moveTo(X, 205); f.lineTo(X + 18, 170); f.lineTo(X + 18, 205); f.fill(); f.fillStyle = "#f97316"; f.fillRect(X - 6, 205, 34, 6); });
      wave(n, 260, 200, 10, [[2, 1, 0]], "#fde68a");
      each([150, 640], (X) => {
        n.strokeStyle = "#92400e"; n.lineWidth = 9; n.beginPath(); n.moveTo(X, 210); n.quadraticCurveTo(X + 10, 140, X + 26, 90); n.stroke();
        n.fillStyle = "#16a34a"; for (let a = 0; a < 5; a++) { n.save(); n.translate(X + 26, 90); n.rotate(-2.6 + a * 1.1); n.beginPath(); n.ellipse(28, 0, 30, 8, 0, 0, TAU); n.fill(); n.restore(); }
      });
    } else if (w.bg === "trees") {
      for (let i = 0; i < 18; i++) circ(f, (i * 57) % VW, 120 + ((i * 37) % 50), 50 + ((i * 13) % 25), i % 2 ? "#15803d" : "#16a34a");
      f.fillStyle = "#15803d"; f.fillRect(0, 160, VW, 160);
      each([80, 330, 560, 820], (X) => { n.fillStyle = "#713f12"; n.fillRect(X - 9, 60, 18, 200); circ(n, X, 50, 44, "#166534"); circ(n, X - 28, 70, 28, "#14532d"); circ(n, X + 28, 66, 30, "#14532d"); });
      f.fillStyle = "rgba(254,240,138,.25)"; for (let i = 0; i < 6; i++) { f.beginPath(); f.moveTo(100 + i * 160, 0); f.lineTo(140 + i * 160, 0); f.lineTo(60 + i * 160, 320); f.lineTo(20 + i * 160, 320); f.fill(); }
    } else if (w.bg === "mountains" || w.bg === "snow") {
      const peak = (X, Y, wd, col, cap) => {
        f.fillStyle = col; f.beginPath(); f.moveTo(X - wd, 320); f.lineTo(X, Y); f.lineTo(X + wd, 320); f.fill();
        f.fillStyle = cap; f.beginPath(); f.moveTo(X - wd * 0.28, Y + (320 - Y) * 0.28); f.lineTo(X, Y); f.lineTo(X + wd * 0.28, Y + (320 - Y) * 0.28);
        f.lineTo(X + wd * 0.12, Y + (320 - Y) * 0.22); f.lineTo(X, Y + (320 - Y) * 0.3); f.lineTo(X - wd * 0.12, Y + (320 - Y) * 0.22); f.fill();
      };
      const c1 = w.bg === "snow" ? "#bfdbfe" : "#a5b4fc", c2 = w.bg === "snow" ? "#93c5fd" : "#818cf8";
      each([120, 520, 860], (X) => peak(X, 40, 210, c1, "#fff"));
      each([330, 700], (X) => peak(X, 100, 170, c2, "#fff"));
      if (w.bg === "snow") {
        wave(n, 260, 150, 20, [[3, 1, 0], [2, 0.5, 1]], "#f8fafc");
        each([90, 300, 520, 760], (X) => { for (let k = 0; k < 3; k++) { n.fillStyle = "#15803d"; n.beginPath(); n.moveTo(X - 30 + k * 6, 150 - k * 26); n.lineTo(X, 104 - k * 26); n.lineTo(X + 30 - k * 6, 150 - k * 26); n.fill(); n.fillStyle = "#fff"; n.beginPath(); n.moveTo(X - 10, 116 - k * 26); n.lineTo(X, 104 - k * 26); n.lineTo(X + 10, 116 - k * 26); n.fill(); } n.fillStyle = "#713f12"; n.fillRect(X - 4, 150, 8, 14); });
      } else {
        wave(n, 260, 140, 26, [[2, 1, 0.5], [4, 0.4, 0]], w.near);
      }
    } else if (w.bg === "castle") {
      wave(f, 320, 220, 20, [[2, 1, 0]], "#fbcfe8");
      const tower = (X, wd, ht, col, roof) => {
        f.fillStyle = col; f.fillRect(X - wd / 2, 320 - ht, wd, ht);
        f.fillStyle = roof; f.beginPath(); f.moveTo(X - wd / 2 - 8, 320 - ht); f.lineTo(X, 320 - ht - wd * 1.1); f.lineTo(X + wd / 2 + 8, 320 - ht); f.fill();
        f.fillStyle = "#fff"; for (let i = 0; i < wd; i += 14) f.beginPath(), f.arc(X - wd / 2 + i + 7, 320 - ht, 7, 0, Math.PI), f.fill();
        f.fillStyle = "#a855f7"; rr(f, X - 7, 320 - ht + 30, 14, 20, 7); f.fill();
      };
      each([480], (X) => { tower(X - 110, 60, 150, "#f5d0fe", "#e879f9"); tower(X + 110, 60, 150, "#f5d0fe", "#e879f9"); tower(X, 90, 210, "#fae8ff", "#f472b6"); f.fillStyle = "#fae8ff"; f.fillRect(X - 140, 220, 280, 100); });
      each([120, 820], (X) => tower(X, 50, 120, "#fce7f3", "#c084fc"));
      wave(n, 260, 170, 14, [[4, 1, 0]], "#f472b6");
      each([160, 420, 700], (X) => {
        n.fillStyle = "#fff"; n.fillRect(X - 3, 90, 6, 90);
        circ(n, X, 80, 26, ["#f472b6", "#a855f7", "#38bdf8"][((X / 160) | 0) % 3]);
        n.strokeStyle = "#fff"; n.lineWidth = 5; n.beginPath(); n.arc(X, 80, 14, 0, 5); n.stroke();
      });
    }
    return { sky, far, near };
  };

  // ---------------------------------------------------------------- الهدايا (تُبنى من مكعبات)
  // كل حرف لون؛ النقطة فراغ
  const PAL = { r: "#ef4444", b: "#3b82f6", y: "#facc15", g: "#22c55e", k: "#334155", w: "#f8fafc", o: "#f97316", p: "#ec4899", c: "#67e8f9", s: "#94a3b8", n: "#92400e", v: "#a855f7", l: "#bfdbfe" };
  D.PAL = PAL;
  D.GIFTS = [
    { name: "سيارة حمراء", art: ["...rrrr.....", "..rrccrr....", ".rrrccrrrr..", "rrrrrrrrrrry", "rrrrrrrrrrrr", ".kkk....kkk.", "..k......k.."] },
    { name: "طائرة", art: ["..........b.", ".........bb.", "bbbbbbbbbbbb", "wcwcwcbbbbbb", ".bbbbbbbbbb.", "...bbbb.....", "....bb......"] },
    { name: "قطار", art: ["k...........", "kk.yyyyy....", "ggggycccy...", "gggggggggggg", "gggggggggggg", ".kk..kk..kk."] },
    { name: "قارب", art: ["......w.....", ".....ww.....", "....www.....", "...wwww.....", "......k.....", "oooooooooooo", ".oooooooooo.", "..bbbbbbbb.."] },
    { name: "روبوت", art: ["....yy....", "...ssss...", "..sbssbs..", "..ssrrss..", ".kssssssk.", "k.svvvvs.k", "..ssssss..", "..ss..ss..", ".kkk..kkk."] },
    { name: "صاروخ", art: ["....rr....", "...rwwr...", "...wwww...", "...wccw...", "...wwww...", "..rwwwwr..", ".rrwwwwrr.", "....oo....", "....yy...."] },
    { name: "طائرة ورقية", art: ["....p.....", "...ppp....", "..ppypp...", ".pppyppp..", "..ppypp...", "...ppp....", "....p.....", ".....k....", "......kr..", ".......k.."] },
    { name: "دراجة", art: [".......kk..", "..rrrrrk...", "..r...r....", ".kkk.kkk...", "k...kk...k.", "k.r.k.k.r.k", "k...k.k...k", ".kkk...kkk."] },
    { name: "شاحنة", art: ["oooooooo....", "oooooooo.yy.", "oooooooo.ycy", "oooooooooyyy", "oooooooooyyy", ".kk....kk.k."] },
    { name: "دبدوب", art: [".nn....nn.", ".nnnnnnnn.", "..nwnnwn..", "..nnkknn..", "...nnnn...", ".nnnppnnn.", "n.nnnnnn.n", "..nn..nn.."] },
    { name: "مروحية", art: ["kkkkkkkkkkk.", ".....k......", "....vvvv....", "kkkvvvccv...", "..vvvvvvvv..", "....vvvv....", "...k....k...", "..kkkkkkkk.."] },
    { name: "تاج ذهبي", art: ["y...y...y...y", "yy.yyy.yyy.yy", "yyyyyyyyyyyyy", "yyryyybyyyryy", "yyyyyyyyyyyyy", ".yyyyyyyyyyy."] },
  ];
  // يرسم الهدية: كل مكعب يطير من مكانه العشوائي إلى مكانه (p من 0 إلى 1)
  D.drawGift = (x, gift, cx, cy, size, p, seed = 1) => {
    const art = gift.art, rows = art.length, cols = Math.max(...art.map((r) => r.length));
    const ox = cx - (cols * size) / 2, oy = cy - (rows * size) / 2;
    let k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ch = art[r][c];
      if (!ch || ch === ".") continue;
      k++;
      const rnd = Math.sin(k * 91.7 + seed * 13.1) * 43758.5, f = rnd - Math.floor(rnd);
      const delay = f * 0.5, q = Math.max(0, Math.min(1, (p - delay) / 0.5));
      const e = 1 - Math.pow(1 - q, 3);
      const sx = cx + Math.cos(f * TAU) * 500, sy = cy + Math.sin(f * TAU) * 300 - 100;
      const X = sx + (ox + c * size - sx) * e, Y = sy + (oy + r * size - sy) * e;
      if (q <= 0) continue;
      x.globalAlpha = Math.min(1, q * 3);
      x.fillStyle = PAL[ch] || "#999"; x.fillRect(X, Y, size - 1, size - 1);
      x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(X, Y, size - 1, size * 0.22);
      x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(X, Y + size * 0.78, size - 1, size * 0.22 - 1);
    }
    x.globalAlpha = 1;
  };
})();
