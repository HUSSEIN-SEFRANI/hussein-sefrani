// رسوم «الطائرات» — كلها مرسومة على Canvas (بدون صور ولا إنترنت): الطائرات، المناظر، الأعلام، المعالم.
window.R = (() => {
  "use strict";
  const TAU = Math.PI * 2;
  const hash = (i, s = 0) => { let x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, f) => a + (b - a) * f;
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mix = (a, b, f) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], f))).join(",")})`; };

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); };
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); };
  const tri = (g, a, b, c, d, e, f) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); };

  // ---------------------------------------------------------------- الطيّار (طفل بنظارة طيران)
  function pilot(g, x, y, s) {
    g.fillStyle = "#f5c49a"; circ(g, x, y, 9 * s); g.fill();
    g.fillStyle = "#7c3aed"; g.beginPath(); g.arc(x, y - 1 * s, 9.5 * s, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    g.fillStyle = "#e0f2fe"; g.strokeStyle = "#475569"; g.lineWidth = 1.4 * s;
    circ(g, x + 2 * s, y - 5 * s, 3 * s); g.fill(); g.stroke(); circ(g, x + 8 * s, y - 5 * s, 3 * s); g.fill(); g.stroke();
    g.strokeStyle = "#7c2d12"; g.lineWidth = 1.5 * s; g.beginPath(); g.arc(x + 5 * s, y + 1 * s, 3.5 * s, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = "#fca5a5"; circ(g, x + 9 * s, y + 1.5 * s, 1.8 * s); g.fill();
  }

  // ---------------------------------------------------------------- الطائرات (تتجه نحو اليمين، المركز 0,0)
  function plane(g, type, C, x, y, ang = 0, t = 0, s = 1, opt = {}) {
    const c = C.c, d = C.d;
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
    g.lineJoin = "round";
    const out = "rgba(15,23,42,.55)";
    g.strokeStyle = out; g.lineWidth = 2.5;
    if (type === "heli") {
      // ذيل
      g.fillStyle = d; rr(g, -96, -8, 70, 11, 5); g.fill(); g.stroke();
      g.fillStyle = c; tri(g, -98, -6, -88, -32, -80, -6); g.fill(); g.stroke();
      const tr = Math.abs(Math.sin(t * 40)) * 14 + 3;
      g.fillStyle = "rgba(51,65,85,.6)"; ell(g, -90, -6, 3, tr); g.fill();
      // زلاجات
      g.strokeStyle = "#475569"; g.lineWidth = 4; g.lineCap = "round";
      g.beginPath(); g.moveTo(-26, 30); g.lineTo(-20, 40); g.moveTo(24, 30); g.lineTo(18, 40); g.moveTo(-42, 41); g.lineTo(40, 41); g.quadraticCurveTo(50, 41, 52, 34); g.stroke();
      g.strokeStyle = out; g.lineWidth = 2.5;
      // جسم
      g.fillStyle = c; ell(g, 2, 2, 46, 32); g.fill(); g.stroke();
      g.fillStyle = "rgba(255,255,255,.25)"; ell(g, -6, -12, 28, 9); g.fill();
      g.fillStyle = "#bae6fd"; g.beginPath(); g.moveTo(14, -26); g.quadraticCurveTo(50, -18, 47, 8); g.lineTo(12, 8); g.closePath(); g.fill(); g.stroke();
      pilot(g, 26, -2, 1);
      g.fillStyle = d; rr(g, -20, 10, 30, 8, 4); g.fill();
      // دوّار
      g.fillStyle = "#475569"; rr(g, -6, -40, 12, 12, 3); g.fill();
      const rl = 30 + Math.abs(Math.cos(t * 26)) * 62;
      g.fillStyle = "rgba(30,41,59,.55)"; ell(g, 0, -42, rl, 4); g.fill();
      g.fillStyle = "rgba(148,163,184,.25)"; ell(g, 0, -42, 92, 7); g.fill();
    } else if (type === "jet") {
      // جناح خلفي بعيد
      g.fillStyle = d; tri(g, -10, 4, -46, -22, -30, 4); g.fill();
      // ذيل
      g.fillStyle = d; g.beginPath(); g.moveTo(-70, -6); g.lineTo(-92, -46); g.lineTo(-74, -46); g.lineTo(-42, -8); g.closePath(); g.fill(); g.stroke();
      // جسم
      g.fillStyle = "#f8fafc"; g.beginPath(); g.moveTo(-96, -10); g.quadraticCurveTo(-60, -22, 40, -20); g.quadraticCurveTo(86, -18, 92, 4); g.quadraticCurveTo(86, 18, 40, 18); g.lineTo(-60, 14); g.quadraticCurveTo(-90, 8, -96, -10); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c; g.beginPath(); g.moveTo(-90, 4); g.lineTo(88, 6); g.quadraticCurveTo(82, 18, 40, 18); g.lineTo(-60, 14); g.closePath(); g.fill();
      g.fillStyle = "#1e3a8a"; g.beginPath(); g.moveTo(70, -14); g.quadraticCurveTo(86, -10, 89, -2); g.lineTo(72, -3); g.closePath(); g.fill();
      g.fillStyle = "#93c5fd"; for (let i = 0; i < 7; i++) { circ(g, -46 + i * 15, -6, 3.6); g.fill(); }
      g.fillStyle = "#f5c49a"; circ(g, 79, -6, 3.2); g.fill();
      // جناح ومحرك
      g.fillStyle = d; g.beginPath(); g.moveTo(14, 6); g.lineTo(-30, 40); g.lineTo(-14, 40); g.lineTo(34, 8); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#94a3b8"; rr(g, -14, 22, 30, 12, 6); g.fill(); g.stroke();
      g.fillStyle = "#334155"; ell(g, 16, 28, 3, 6); g.fill();
      g.fillStyle = d; tri(g, -76, 0, -96, 14, -70, 10); g.fill();
    } else {
      const seaP = type === "sea";
      // ذيل
      g.fillStyle = d; g.beginPath(); g.moveTo(-52, -6); g.quadraticCurveTo(-72, -44, -60, -46); g.quadraticCurveTo(-48, -44, -32, -10); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = d; ell(g, -54, 4, 18, 5); g.fill(); g.stroke();
      if (seaP) {
        g.strokeStyle = "#475569"; g.lineWidth = 4;
        g.beginPath(); g.moveTo(-14, 18); g.lineTo(-18, 36); g.moveTo(22, 18); g.lineTo(26, 36); g.stroke();
        g.strokeStyle = out; g.lineWidth = 2.5;
        g.fillStyle = "#f8fafc"; g.beginPath(); g.moveTo(-40, 34); g.lineTo(42, 34); g.quadraticCurveTo(60, 36, 54, 46); g.lineTo(-34, 46); g.quadraticCurveTo(-44, 42, -40, 34); g.fill(); g.stroke();
        g.fillStyle = d; rr(g, -36, 40, 84, 5, 2); g.fill();
      } else {
        g.strokeStyle = "#475569"; g.lineWidth = 4; g.beginPath(); g.moveTo(14, 16); g.lineTo(18, 34); g.stroke();
        g.fillStyle = "#1f2937"; circ(g, 18, 36, 7); g.fill(); g.fillStyle = "#cbd5e1"; circ(g, 18, 36, 3); g.fill();
        g.strokeStyle = out; g.lineWidth = 2.5;
      }
      // جسم ممتلئ لطيف
      g.fillStyle = c; g.beginPath(); g.moveTo(-62, -2); g.quadraticCurveTo(-30, -26, 24, -24); g.quadraticCurveTo(58, -22, 60, 0); g.quadraticCurveTo(58, 22, 22, 24); g.quadraticCurveTo(-30, 22, -62, 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "rgba(255,255,255,.3)"; ell(g, 6, -14, 34, 6); g.fill();
      g.fillStyle = "rgba(0,0,0,.08)"; ell(g, 4, 14, 44, 7); g.fill();
      // قمرة
      g.fillStyle = "#bae6fd"; g.beginPath(); g.moveTo(-6, -22); g.quadraticCurveTo(10, -46, 32, -22); g.closePath(); g.fill(); g.stroke();
      pilot(g, 12, -27, 0.85);
      // جناح
      g.fillStyle = d;
      if (seaP) { rr(g, -24, -30, 60, 9, 5); g.fill(); g.stroke(); }
      else { ell(g, 2, 6, 30, 9, -0.06); g.fill(); g.stroke(); }
      g.fillStyle = "#fde047"; circ(g, -24, 2, 4); g.fill();
      // أنف ومروحة
      g.fillStyle = "#e2e8f0"; g.beginPath(); g.moveTo(58, -9); g.quadraticCurveTo(74, 0, 58, 9); g.closePath(); g.fill(); g.stroke();
      const ph = Math.sin(t * 48);
      g.fillStyle = "rgba(51,65,85,.7)"; ell(g, 70, 0, 3, 8 + Math.abs(ph) * 22); g.fill();
      g.fillStyle = "rgba(148,163,184,.25)"; ell(g, 70, 0, 4, 30); g.fill();
    }
    g.restore();
  }

  // ---------------------------------------------------------------- غيوم وأشياء الطيران
  function cloud(g, x, y, s, col = "#fff", a = 1) {
    g.save(); g.globalAlpha *= a; g.fillStyle = col;
    g.beginPath();
    g.arc(x - 34 * s, y + 6 * s, 24 * s, 0, TAU); g.arc(x - 6 * s, y - 10 * s, 32 * s, 0, TAU); g.arc(x + 28 * s, y - 2 * s, 26 * s, 0, TAU); g.arc(x + 50 * s, y + 10 * s, 18 * s, 0, TAU);
    g.fill(); rr(g, x - 56 * s, y + 4 * s, 124 * s, 26 * s, 13 * s); g.fill();
    g.restore();
  }
  function star(g, x, y, r, rot = 0, col = "#facc15") {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.48 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
    g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = r * 0.14; g.strokeStyle = "#ea9a07"; g.lineJoin = "round"; g.stroke();
    g.fillStyle = "rgba(255,255,255,.6)"; ell(g, -r * 0.2, -r * 0.3, r * 0.16, r * 0.1, -0.5); g.fill();
    g.restore();
  }
  const BCOL = [["#ef4444", "#fde047"], ["#3b82f6", "#f8fafc"], ["#22c55e", "#fde047"], ["#a855f7", "#f9a8d4"], ["#f97316", "#fef3c7"]];
  function balloon(g, x, y, k, t, s = 1) {
    const [a, b] = BCOL[k % BCOL.length];
    g.save(); g.translate(x, y + Math.sin(t * 2 + k) * 6); g.scale(s, s);
    g.strokeStyle = "#78350f"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-14, 30); g.lineTo(-9, 52); g.moveTo(14, 30); g.lineTo(9, 52); g.stroke();
    g.fillStyle = "#a16207"; rr(g, -11, 50, 22, 14, 3); g.fill();
    g.save(); ell(g, 0, 0, 34, 38); g.clip();
    g.fillStyle = a; g.fillRect(-40, -40, 80, 80);
    g.fillStyle = b; for (let i = -2; i <= 2; i += 2) { ell(g, i * 11, 0, 6, 40); g.fill(); }
    g.restore();
    g.fillStyle = a; g.beginPath(); g.moveTo(-26, 24); g.quadraticCurveTo(0, 46, 26, 24); g.lineTo(14, 32); g.lineTo(-14, 32); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.35)"; ell(g, -14, -16, 7, 12, 0.4); g.fill();
    g.restore();
  }
  function bird(g, x, y, t, k = 0) {
    const cols = ["#fb923c", "#a78bfa", "#f472b6", "#38bdf8"];
    const c = cols[k % cols.length], f = Math.sin(t * 12 + k);
    g.save(); g.translate(x, y);
    g.fillStyle = c; g.strokeStyle = "rgba(15,23,42,.45)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(4, -2); g.quadraticCurveTo(14, -22 * f - 4, 26, -18 * f); g.quadraticCurveTo(18, 0, 4, 4); g.fill(); g.stroke();
    ell(g, 0, 0, 20, 15); g.fill(); g.stroke();
    g.fillStyle = "#fde68a"; tri(g, -18, -2, -30, 2, -18, 6); g.fill();
    g.fillStyle = "#fff"; circ(g, -9, -5, 5); g.fill(); g.fillStyle = "#0f172a"; circ(g, -10, -5, 2.6); g.fill();
    g.fillStyle = c; tri(g, 16, -4, 30, -10, 28, 4); g.fill();
    g.restore();
  }
  function storm(g, x, y, t) {
    g.save();
    cloud(g, x, y, 1.15, "#64748b");
    cloud(g, x + 4, y - 4, 0.95, "#94a3b8");
    // وجه نعسان
    g.strokeStyle = "#1e293b"; g.lineWidth = 3; g.lineCap = "round";
    g.beginPath(); g.arc(x - 16, y + 2, 5, 0.2, Math.PI - 0.2); g.moveTo(x + 24, y + 2); g.arc(x + 16, y + 2, 5, 0.2, Math.PI - 0.2); g.stroke();
    g.beginPath(); g.moveTo(x - 4, y + 16); g.quadraticCurveTo(x, y + 12, x + 6, y + 16); g.stroke();
    // مطر وبرق صغير
    g.strokeStyle = "rgba(59,130,246,.75)"; g.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) { const yy = ((t * 120 + i * 23) % 40); g.beginPath(); g.moveTo(x - 40 + i * 20, y + 32 + yy); g.lineTo(x - 43 + i * 20, y + 40 + yy); g.stroke(); }
    if (Math.sin(t * 3) > 0.6) { g.fillStyle = "#fde047"; g.beginPath(); g.moveTo(x + 2, y + 30); g.lineTo(x - 10, y + 54); g.lineTo(x, y + 52); g.lineTo(x - 6, y + 72); g.lineTo(x + 12, y + 46); g.lineTo(x + 2, y + 48); g.closePath(); g.fill(); }
    g.restore();
  }
  function parcel(g, x, y, chute, t) {
    g.save(); g.translate(x, y);
    if (chute) {
      g.rotate(Math.sin(t * 3) * 0.12);
      g.strokeStyle = "#475569"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-12, -6); g.lineTo(-26, -40); g.moveTo(12, -6); g.lineTo(26, -40); g.moveTo(0, -8); g.lineTo(0, -44); g.stroke();
      g.fillStyle = "#f43f5e"; g.beginPath(); g.moveTo(-32, -40); g.quadraticCurveTo(0, -84, 32, -40); g.closePath(); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.moveTo(-10, -42); g.quadraticCurveTo(0, -80, 10, -42); g.closePath(); g.fill();
    }
    g.fillStyle = "#c08a4a"; rr(g, -14, -10, 28, 22, 3); g.fill();
    g.strokeStyle = "#7c4a1c"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#facc15"; g.fillRect(-2.5, -10, 5, 22);
    g.restore();
  }
  function house(g, x, y, k, marked, happy, t) {
    const walls = ["#fde68a", "#fbcfe8", "#bfdbfe", "#bbf7d0", "#fed7aa"], roofs = ["#ef4444", "#8b5cf6", "#0ea5e9", "#f97316", "#16a34a"];
    g.save(); g.translate(x, y);
    g.fillStyle = walls[k % 5]; g.strokeStyle = "rgba(15,23,42,.4)"; g.lineWidth = 2;
    g.fillRect(-42, -58, 84, 58); g.strokeRect(-42, -58, 84, 58);
    g.fillStyle = roofs[k % 5]; tri(g, -52, -56, 0, -96, 52, -56); g.fill(); g.stroke();
    g.fillStyle = "#92400e"; rr(g, -10, -32, 20, 32, 4); g.fill();
    g.fillStyle = happy ? "#fde047" : "#7dd3fc"; g.fillRect(-34, -46, 16, 14); g.fillRect(18, -46, 16, 14);
    g.restore();
    if (marked) {
      const b = Math.sin(t * 5) * 6;
      g.save(); g.translate(x, y);
      g.strokeStyle = "rgba(244,63,94,.85)"; g.lineWidth = 5; g.setLineDash([12, 8]); g.lineDashOffset = -t * 30;
      ell(g, 0, 2, 66, 14); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#f43f5e"; g.strokeStyle = "#fff"; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-16, -150 + b); g.lineTo(16, -150 + b); g.lineTo(16, -128 + b); g.lineTo(30, -128 + b); g.lineTo(0, -104 + b); g.lineTo(-30, -128 + b); g.lineTo(-16, -128 + b); g.closePath(); g.stroke(); g.fill();
      g.restore();
    }
    if (happy) {
      g.save(); g.font = "bold 22px Baloo, Tahoma, sans-serif"; g.textAlign = "center"; g.fillStyle = "#be185d"; g.strokeStyle = "#fff"; g.lineWidth = 5;
      g.strokeText("شكراً! ❤", x, y - 108); g.fillText("شكراً! ❤", x, y - 108); g.restore();
    }
  }
  function runway(g, a, b, y, night) {
    g.save();
    // برج المراقبة ومبنى المطار
    const tx = a - 150;
    g.fillStyle = night ? "#475569" : "#e2e8f0"; g.strokeStyle = "rgba(15,23,42,.4)"; g.lineWidth = 2;
    g.fillRect(tx - 70, y - 70, 120, 70); g.strokeRect(tx - 70, y - 70, 120, 70);
    g.fillStyle = night ? "#fde68a" : "#7dd3fc"; for (let i = 0; i < 4; i++) g.fillRect(tx - 60 + i * 28, y - 56, 18, 18);
    g.fillStyle = night ? "#64748b" : "#cbd5e1"; g.fillRect(tx + 64, y - 150, 22, 150); g.strokeRect(tx + 64, y - 150, 22, 150);
    g.fillStyle = "#0ea5e9"; rr(g, tx + 50, y - 190, 50, 40, 8); g.fill(); g.stroke();
    g.fillStyle = night ? "#fde68a" : "#e0f2fe"; g.fillRect(tx + 56, y - 182, 38, 16);
    g.fillStyle = "#ef4444"; circ(g, tx + 75, y - 196, 5); g.fill();
    // كمّ الريح
    g.strokeStyle = "#64748b"; g.lineWidth = 3; g.beginPath(); g.moveTo(a + 40, y); g.lineTo(a + 40, y - 70); g.stroke();
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#fff" : "#f97316"; g.fillRect(a + 40 - (i + 1) * 12, y - 70, 12, 12 - i); }
    // المدرج
    g.fillStyle = "#475569"; g.fillRect(a, y - 6, b - a, 22);
    g.fillStyle = "#f8fafc"; for (let x = a + 60; x < b - 60; x += 70) g.fillRect(x, y + 3, 36, 4);
    for (let i = 0; i < 6; i++) { g.fillRect(a + 10, y - 3 + i * 3, 30, 1.6); }
    g.fillStyle = night ? "#fde047" : "#22c55e"; for (let x = a; x <= b; x += 50) { circ(g, x, y - 6, 3); g.fill(); }
    g.restore();
  }

  // ---------------------------------------------------------------- المناظر
  // كل طبقة تُرسم من عناصر ثابتة (حسب رقمها)، والمنظر يأتي من sceneAt.
  const PAL = ["#f87171", "#fbbf24", "#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#fb923c"];
  function far(g, sc, x, y, i) {
    const r1 = hash(i, 1), r2 = hash(i, 2);
    if (sc === "city" || sc === "night") {
      const w = 60 + r1 * 60, h = 110 + r2 * 170, n = sc === "night";
      g.fillStyle = n ? "#1e2758" : "#a7c7e7"; g.fillRect(x - w / 2, y - h, w, h);
      if (r1 > 0.6) { g.fillRect(x - 3, y - h - 30, 6, 30); }
      if (n) { g.fillStyle = "#fde68a"; for (let yy = y - h + 14; yy < y - 14; yy += 22) for (let xx = x - w / 2 + 10; xx < x + w / 2 - 10; xx += 18) if (hash(xx * 7 + yy, i) > 0.45) g.fillRect(xx, yy, 7, 9); }
    } else if (sc === "sea") {
      g.fillStyle = "#7fbfe0"; ell(g, x, y + 4, 90 + r1 * 80, 40 + r2 * 40); g.fill();
      if (r2 > 0.75) { g.fillStyle = "#f8fafc"; g.fillRect(x - 6, y - 70 - r2 * 30, 12, 70); g.fillStyle = "#ef4444"; g.fillRect(x - 6, y - 50 - r2 * 30, 12, 10); }
    } else if (sc === "desert") {
      g.fillStyle = "#f4cf90"; ell(g, x, y + 10, 140 + r1 * 80, 50 + r2 * 50); g.fill();
    } else if (sc === "mountains") {
      const h = 170 + r1 * 170, w = 150 + r2 * 120;
      g.fillStyle = "#8aa6cf"; tri(g, x - w, y, x, y - h, x + w, y); g.fill();
      g.fillStyle = "#f1f5f9"; g.beginPath(); g.moveTo(x - w * 0.28, y - h * 0.72); g.lineTo(x, y - h); g.lineTo(x + w * 0.28, y - h * 0.72); g.lineTo(x + w * 0.1, y - h * 0.78); g.lineTo(x - w * 0.05, y - h * 0.7); g.closePath(); g.fill();
    }
  }
  function mid(g, sc, x, y, i, t) {
    const r1 = hash(i, 3), r2 = hash(i, 4), r3 = hash(i, 5);
    if (sc === "city") {
      const w = 64 + r1 * 40, h = 80 + r2 * 140;
      g.fillStyle = PAL[(i * 3) % PAL.length]; g.fillRect(x - w / 2, y - h, w, h);
      g.fillStyle = "rgba(255,255,255,.75)"; for (let yy = y - h + 12; yy < y - 20; yy += 26) for (let xx = x - w / 2 + 10; xx < x + w / 2 - 12; xx += 20) g.fillRect(xx, yy, 10, 12);
      g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(x - w / 2, y - h, w, 6);
    } else if (sc === "night") {
      const w = 60 + r1 * 40, h = 70 + r2 * 120;
      g.fillStyle = "#2b3470"; g.fillRect(x - w / 2, y - h, w, h);
      g.fillStyle = "#fde047"; for (let yy = y - h + 12; yy < y - 20; yy += 24) for (let xx = x - w / 2 + 10; xx < x + w / 2 - 12; xx += 18) if (hash(xx + yy * 3, i) > 0.35) g.fillRect(xx, yy, 9, 11);
    } else if (sc === "sea") {
      if (r1 < 0.6) {
        g.save(); g.translate(x, y + Math.sin(t * 2 + i) * 3);
        g.fillStyle = PAL[i % PAL.length]; g.beginPath(); g.moveTo(-34, -6); g.lineTo(34, -6); g.lineTo(24, 8); g.lineTo(-24, 8); g.closePath(); g.fill();
        g.fillStyle = "#475569"; g.fillRect(-1.5, -60, 3, 54);
        g.fillStyle = "#fff"; tri(g, 2, -58, 2, -10, 30, -12); g.fill(); tri(g, -2, -50, -2, -12, -22, -12); g.fill();
        g.restore();
      }
    } else if (sc === "desert") {
      if (r1 < 0.5) palm(g, x, y, 0.9 + r2 * 0.4, t);
      else if (r1 < 0.8) { g.fillStyle = "#d9a066"; const w = 60 + r2 * 40, h = 40 + r3 * 30; g.fillRect(x - w / 2, y - h, w, h); g.fillStyle = "#b07a3e"; g.fillRect(x - 8, y - 22, 16, 22); g.fillStyle = "#7c4a1c"; g.fillRect(x - w / 2 + 8, y - h + 10, 10, 10); }
      else camel(g, x, y);
    } else if (sc === "mountains") {
      g.fillStyle = "#6fb85f"; ell(g, x, y + 10, 110 + r1 * 60, 50 + r2 * 40); g.fill();
      pine(g, x - 30, y - 10 - r2 * 20, 0.9); pine(g, x + 20, y - 4, 1.1);
    }
  }
  function ground(g, sc, x, y, i, t) {
    const r1 = hash(i, 6), r2 = hash(i, 7);
    if (sc === "city") { if (r1 < 0.5) tree(g, x, y + 4, 0.8 + r2 * 0.4); else if (r1 < 0.65) { g.fillStyle = "#475569"; g.fillRect(x - 2, y - 50, 4, 54); g.fillStyle = "#fde68a"; circ(g, x, y - 52, 6); g.fill(); } }
    else if (sc === "night") { if (r1 < 0.4) { g.fillStyle = "#94a3b8"; g.fillRect(x - 2, y - 50, 4, 54); g.fillStyle = "rgba(253,224,71,.35)"; circ(g, x, y - 52, 18); g.fill(); g.fillStyle = "#fde047"; circ(g, x, y - 52, 6); g.fill(); } else if (r1 < 0.7) { g.fillStyle = "#1d3a35"; circ(g, x, y - 20, 22); g.fill(); } }
    else if (sc === "sea") { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 3; g.beginPath(); const o = Math.sin(t * 2 + i) * 6; g.arc(x + o, y + 22, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); if (r1 < 0.12) { g.fillStyle = "#64748b"; ell(g, x, y + 6, 26, 12); g.fill(); } }
    else if (sc === "desert") { if (r1 < 0.35) { g.fillStyle = "#65a30d"; ell(g, x, y + 2, 14 + r2 * 10, 9); g.fill(); } else if (r1 < 0.45) { g.fillStyle = "#a8a29e"; ell(g, x, y + 4, 12, 7); g.fill(); } }
    else if (sc === "mountains") { if (r1 < 0.5) pine(g, x, y + 4, 0.7 + r2 * 0.4); else if (r1 < 0.7) { for (let k = 0; k < 3; k++) { g.fillStyle = PAL[(i + k) % PAL.length]; circ(g, x + k * 10, y + 8, 4); g.fill(); } } }
  }
  function tree(g, x, y, s) { g.fillStyle = "#92400e"; g.fillRect(x - 4 * s, y - 30 * s, 8 * s, 30 * s); g.fillStyle = "#22a34a"; circ(g, x, y - 42 * s, 22 * s); g.fill(); g.fillStyle = "#4ade80"; circ(g, x - 6 * s, y - 48 * s, 9 * s); g.fill(); }
  function pine(g, x, y, s) { g.fillStyle = "#78350f"; g.fillRect(x - 3 * s, y - 14 * s, 6 * s, 14 * s); g.fillStyle = "#15803d"; for (let k = 0; k < 3; k++) tri(g, x - (26 - k * 6) * s, y - (12 + k * 18) * s, x, y - (44 + k * 18) * s, x + (26 - k * 6) * s, y - (12 + k * 18) * s), g.fill(); }
  function palm(g, x, y, s, t) {
    g.strokeStyle = "#92400e"; g.lineWidth = 7 * s; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10 * s, y - 40 * s, x + 4 * s, y - 80 * s); g.stroke();
    g.fillStyle = "#16a34a"; const tx = x + 4 * s, ty = y - 80 * s;
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.62 + Math.sin(t * 1.5) * 0.04; g.save(); g.translate(tx, ty); g.rotate(a); ell(g, 22 * s, 0, 24 * s, 7 * s); g.fill(); g.restore(); }
    g.fillStyle = "#78350f"; circ(g, tx - 4 * s, ty + 6 * s, 4 * s); g.fill(); circ(g, tx + 4 * s, ty + 7 * s, 4 * s); g.fill();
  }
  function camel(g, x, y) {
    g.fillStyle = "#c08a4a"; g.strokeStyle = "#8a5a2b"; g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); for (const dx of [-18, -8, 12, 22]) { g.moveTo(x + dx, y - 26); g.lineTo(x + dx, y); } g.stroke();
    ell(g, x, y - 34, 30, 14); g.fill(); ell(g, x - 4, y - 46, 14, 12); g.fill();
    g.beginPath(); g.moveTo(x + 24, y - 36); g.quadraticCurveTo(x + 36, y - 50, x + 38, y - 64); g.lineWidth = 9; g.strokeStyle = "#c08a4a"; g.stroke();
    ell(g, x + 42, y - 64, 10, 6); g.fill(); g.fillStyle = "#1f2937"; circ(g, x + 44, y - 66, 1.6); g.fill();
  }

  // ---------------------------------------------------------------- الأعلام (w×h، الزاوية العليا x,y)
  function star5(g, x, y, r, rot = -Math.PI / 2, inner = 0.4) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5, q = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
  function flag(g, id, x, y, w, h) {
    g.save(); g.translate(x, y);
    rr(g, 0, 0, w, h, h * 0.04); g.clip();
    const H3 = (a, b, c) => { g.fillStyle = a; g.fillRect(0, 0, w, h / 3); g.fillStyle = b; g.fillRect(0, h / 3, w, h / 3 + 0.5); g.fillStyle = c; g.fillRect(0, (2 * h) / 3, w, h / 3 + 0.5); };
    const V3 = (a, b, c) => { g.fillStyle = a; g.fillRect(0, 0, w / 3, h); g.fillStyle = b; g.fillRect(w / 3, 0, w / 3 + 0.5, h); g.fillStyle = c; g.fillRect((2 * w) / 3, 0, w / 3 + 0.5, h); };
    switch (id) {
      case "sa":
        g.fillStyle = "#006c35"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#fff"; g.font = `bold ${h * 0.17}px Baloo, Tahoma, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText("لا إله إلا الله محمد رسول الله", w / 2, h * 0.38, w * 0.78);
        g.fillRect(w * 0.22, h * 0.66, w * 0.56, h * 0.035); g.fillRect(w * 0.7, h * 0.63, w * 0.025, h * 0.1);
        break;
      case "ae": H3("#00732f", "#fff", "#000"); g.fillStyle = "#ff0000"; g.fillRect(0, 0, w * 0.26, h); break;
      case "eg":
        H3("#ce1126", "#fff", "#000");
        g.fillStyle = "#c09300"; g.beginPath(); g.moveTo(w / 2, h * 0.38); g.lineTo(w * 0.56, h * 0.47); g.lineTo(w * 0.54, h * 0.62); g.lineTo(w * 0.46, h * 0.62); g.lineTo(w * 0.44, h * 0.47); g.closePath(); g.fill();
        ell(g, w * 0.43, h * 0.5, w * 0.04, h * 0.07, 0.5); g.fill(); ell(g, w * 0.57, h * 0.5, w * 0.04, h * 0.07, -0.5); g.fill();
        break;
      case "ma":
        g.fillStyle = "#c1272d"; g.fillRect(0, 0, w, h);
        g.strokeStyle = "#006233"; g.lineWidth = h * 0.045; g.lineJoin = "miter";
        { const r = h * 0.26, cx = w / 2, cy = h / 2; g.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.stroke(); }
        break;
      case "es":
        g.fillStyle = "#aa151b"; g.fillRect(0, 0, w, h); g.fillStyle = "#f1bf00"; g.fillRect(0, h / 4, w, h / 2);
        g.fillStyle = "#aa151b"; rr(g, w * 0.26, h * 0.36, w * 0.1, h * 0.28, w * 0.02); g.fill(); g.fillStyle = "#c8a600"; g.fillRect(w * 0.24, h * 0.33, w * 0.14, h * 0.04);
        break;
      case "fr": V3("#002395", "#fff", "#ed2939"); break;
      case "it": V3("#009246", "#fff", "#ce2b37"); break;
      case "nl": H3("#ae1c28", "#fff", "#21468b"); break;
      case "de": H3("#000", "#dd0000", "#ffce00"); break;
      case "gb": {
        g.fillStyle = "#012169"; g.fillRect(0, 0, w, h);
        g.lineCap = "butt"; g.strokeStyle = "#fff"; g.lineWidth = h * 0.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
        g.strokeStyle = "#c8102e"; g.lineWidth = h * 0.07; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
        g.fillStyle = "#fff"; g.fillRect(w / 2 - h * 0.17, 0, h * 0.34, h); g.fillRect(0, h / 2 - h * 0.17, w, h * 0.34);
        g.fillStyle = "#c8102e"; g.fillRect(w / 2 - h * 0.1, 0, h * 0.2, h); g.fillRect(0, h / 2 - h * 0.1, w, h * 0.2);
        break;
      }
      case "tr":
        g.fillStyle = "#e30a17"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#fff"; circ(g, w * 0.36, h / 2, h * 0.25); g.fill(); g.fillStyle = "#e30a17"; circ(g, w * 0.4, h / 2, h * 0.2); g.fill();
        g.fillStyle = "#fff"; star5(g, w * 0.53, h / 2, h * 0.12, Math.PI); g.fill();
        break;
      case "in": {
        H3("#ff9933", "#fff", "#138808");
        const r = h * 0.13; g.strokeStyle = "#000080"; g.lineWidth = h * 0.02; circ(g, w / 2, h / 2, r); g.stroke();
        g.beginPath(); for (let i = 0; i < 24; i++) { const a = (i * TAU) / 24; g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.lineWidth = h * 0.008; g.stroke();
        break;
      }
      case "cn":
        g.fillStyle = "#de2910"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffde00";
        star5(g, w * 0.17, h * 0.27, h * 0.15); g.fill();
        [[0.33, 0.1], [0.4, 0.2], [0.4, 0.35], [0.33, 0.45]].forEach(([a, b]) => { star5(g, w * a, h * b, h * 0.05, 0.3); g.fill(); });
        break;
      case "jp": g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#bc002d"; circ(g, w / 2, h / 2, h * 0.3); g.fill(); break;
      case "us":
        for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#fff" : "#b22234"; g.fillRect(0, (i * h) / 13, w, h / 13 + 0.5); }
        g.fillStyle = "#3c3b6e"; g.fillRect(0, 0, w * 0.4, (h * 7) / 13);
        g.fillStyle = "#fff"; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { star5(g, w * 0.04 + c * w * 0.063 + (r % 2) * w * 0.03, h * 0.06 + r * h * 0.1, h * 0.025); g.fill(); }
        break;
      case "br":
        g.fillStyle = "#009c3b"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#ffdf00"; g.beginPath(); g.moveTo(w * 0.08, h / 2); g.lineTo(w / 2, h * 0.1); g.lineTo(w * 0.92, h / 2); g.lineTo(w / 2, h * 0.9); g.closePath(); g.fill();
        g.fillStyle = "#002776"; circ(g, w / 2, h / 2, h * 0.22); g.fill();
        g.save(); circ(g, w / 2, h / 2, h * 0.22); g.clip(); g.strokeStyle = "#fff"; g.lineWidth = h * 0.04; g.beginPath(); g.arc(w * 0.42, h * 0.9, h * 0.5, -Math.PI * 0.62, -Math.PI * 0.2); g.stroke(); g.restore();
        break;
    }
    g.restore();
    g.save(); g.strokeStyle = "rgba(15,23,42,.25)"; g.lineWidth = Math.max(1, h * 0.02); rr(g, x, y, w, h, h * 0.04); g.stroke(); g.restore();
  }
  // علم صغير على سارية
  function flagPole(g, id, x, y, s, t) {
    g.fillStyle = "#64748b"; g.fillRect(x - 2 * s, y - 120 * s, 4 * s, 120 * s);
    g.save(); g.translate(x + 2 * s, y - 118 * s); g.transform(1, Math.sin(t * 3) * 0.04, 0, 1, 0, 0); flag(g, id, 0, 0, 66 * s, 44 * s); g.restore();
  }

  // ---------------------------------------------------------------- المعالم (القاعدة عند x,y، العرض ~260 والارتفاع ~260)
  function landmark(g, id, x, y, s = 1, t = 0) {
    g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = "round";
    const O = "rgba(15,23,42,.35)"; g.strokeStyle = O; g.lineWidth = 2;
    switch (id) {
      case "sa": {
        g.fillStyle = "#f8fafc"; g.fillRect(-130, -60, 260, 60); g.strokeRect(-130, -60, 260, 60);
        g.fillStyle = "#cbd5e1"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-112 + i * 28, -14, 9, Math.PI, 0); g.lineTo(-103 + i * 28, 0); g.lineTo(-121 + i * 28, 0); g.fill(); }
        for (const mx of [-120, 120]) { g.fillStyle = "#f1f5f9"; g.fillRect(mx - 8, -210, 16, 150); g.strokeRect(mx - 8, -210, 16, 150); g.fillStyle = "#e2e8f0"; g.fillRect(mx - 12, -160, 24, 8); g.fillStyle = "#facc15"; tri(g, mx - 8, -210, mx, -240, mx + 8, -210); g.fill(); }
        g.fillStyle = "#111827"; g.fillRect(-46, -112, 92, 104);
        g.fillStyle = "#d4a017"; g.fillRect(-46, -92, 92, 10); g.fillRect(14, -60, 18, 46);
        g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(-46, -112, 30, 104);
        break;
      }
      case "ae": {
        g.fillStyle = "#cbd5e1"; const L = [[60, 0], [48, 70], [38, 140], [28, 200], [18, 250], [10, 290]];
        L.forEach(([w, h], i) => { const n = L[i + 1]; const top = n ? n[1] : 330; g.fillStyle = i % 2 ? "#e2e8f0" : "#cbd5e1"; g.beginPath(); g.moveTo(-w, -h); g.lineTo(-w * 0.8, -top); g.lineTo(w * 0.8, -top); g.lineTo(w, -h); g.closePath(); g.fill(); g.stroke(); });
        g.strokeStyle = "#94a3b8"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -330); g.lineTo(0, -390); g.stroke();
        g.fillStyle = "#7dd3fc"; for (let k = 0; k < 14; k++) g.fillRect(-4, -20 - k * 22, 8, 10);
        break;
      }
      case "eg": {
        const P = (cx, w, h, c1, c2) => { g.fillStyle = c1; tri(g, cx - w, 0, cx, -h, cx + w, 0); g.fill(); g.fillStyle = c2; tri(g, cx, -h, cx + w, 0, cx + w * 0.25, 0); g.fill(); g.strokeStyle = O; tri(g, cx - w, 0, cx, -h, cx + w, 0); g.stroke(); };
        P(90, 80, 110, "#e8b866", "#c99446"); P(-70, 110, 170, "#f0c274", "#d19f50"); P(40, 120, 200, "#f4c97c", "#d6a354");
        g.strokeStyle = "rgba(146,64,14,.25)"; g.lineWidth = 1.5; for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(40 - 120 + k * 15, -k * 25); g.lineTo(40 + 120 - k * 15, -k * 25); g.stroke(); }
        break;
      }
      case "ma": {
        g.fillStyle = "#d8a273"; g.fillRect(-36, -250, 72, 250); g.strokeRect(-36, -250, 72, 250);
        g.fillStyle = "#b9805a"; g.fillRect(-36, -250, 72, 14);
        g.fillStyle = "#c48a5e"; g.fillRect(-18, -296, 36, 46); g.strokeRect(-18, -296, 36, 46);
        g.fillStyle = "#16a34a"; for (let k = 0; k < 3; k++) { circ(g, 0, -306 - k * 12, 7 - k * 1.5); g.fill(); }
        g.fillStyle = "#7c4a2a"; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(0, -200 + k * 46, 10, Math.PI, 0); g.lineTo(10, -186 + k * 46); g.lineTo(-10, -186 + k * 46); g.fill(); }
        g.fillStyle = "#15803d"; for (let i = -3; i <= 3; i++) g.fillRect(-36 + (i + 3) * 10.5, -240, 6, 6);
        palm(g, -90, 0, 1.1, t); palm(g, 100, 0, 0.9, t);
        break;
      }
      case "es": {
        g.fillStyle = "#c2603d"; g.fillRect(-140, -90, 280, 90); g.strokeRect(-140, -90, 280, 90);
        for (const tx of [-130, -40, 70]) { g.fillStyle = "#b45534"; g.fillRect(tx, -150, 60, 150); g.strokeRect(tx, -150, 60, 150); for (let k = 0; k < 4; k++) g.fillRect(tx + k * 16, -160, 10, 10); }
        g.fillStyle = "#fde68a"; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(-110 + i * 36, -36, 11, Math.PI, 0); g.lineTo(-99 + i * 36, -14); g.lineTo(-121 + i * 36, -14); g.fill(); }
        g.fillStyle = "#38bdf8"; g.fillRect(-140, -6, 280, 6);
        break;
      }
      case "fr": {
        g.strokeStyle = "#8b5e34"; g.lineWidth = 6; g.lineCap = "round";
        g.beginPath(); g.moveTo(-90, 0); g.quadraticCurveTo(-30, -120, -10, -300); g.moveTo(90, 0); g.quadraticCurveTo(30, -120, 10, -300); g.stroke();
        g.lineWidth = 3; g.beginPath();
        for (let k = 1; k < 12; k++) { const yy = -k * 25, w = 90 * Math.pow(1 - k / 12.5, 1.6) + 8; g.moveTo(-w, yy); g.lineTo(w, yy - 25); g.moveTo(w, yy); g.lineTo(-w, yy - 25); }
        g.stroke();
        g.fillStyle = "#8b5e34"; g.fillRect(-66, -82, 132, 10); g.fillRect(-36, -170, 72, 8);
        g.beginPath(); g.moveTo(-50, 0); g.quadraticCurveTo(0, -70, 50, 0); g.lineWidth = 6; g.strokeStyle = "#8b5e34"; g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(0, -300); g.lineTo(0, -340); g.stroke();
        break;
      }
      case "gb": {
        g.fillStyle = "#d6b779"; g.fillRect(-34, -260, 68, 260); g.strokeRect(-34, -260, 68, 260);
        g.fillStyle = "#c19c58"; for (let k = 0; k < 8; k++) g.fillRect(-34, -24 - k * 28, 68, 4);
        g.fillStyle = "#b4914e"; g.fillRect(-40, -300, 80, 50); g.strokeRect(-40, -300, 80, 50);
        g.fillStyle = "#fff"; circ(g, 0, -275, 20); g.fill(); g.stroke();
        g.strokeStyle = "#111"; g.lineWidth = 2.5; g.beginPath(); const a = t * 0.5; g.moveTo(0, -275); g.lineTo(Math.sin(a) * 14, -275 - Math.cos(a) * 14); g.moveTo(0, -275); g.lineTo(9, -275); g.stroke();
        g.fillStyle = "#475569"; tri(g, -40, -300, 0, -380, 40, -300); g.fill();
        g.strokeStyle = O; g.lineWidth = 2; tri(g, -40, -300, 0, -380, 40, -300); g.stroke();
        break;
      }
      case "nl": {
        const mill = (mx, sc, ph) => {
          g.save(); g.translate(mx, 0); g.scale(sc, sc);
          g.fillStyle = "#a16207"; g.beginPath(); g.moveTo(-40, 0); g.lineTo(-26, -150); g.lineTo(26, -150); g.lineTo(40, 0); g.closePath(); g.fill(); g.strokeStyle = O; g.stroke();
          g.fillStyle = "#7f1d1d"; tri(g, -32, -148, 0, -186, 32, -148); g.fill();
          g.fillStyle = "#fef3c7"; rr(g, -10, -36, 20, 36, 8); g.fill();
          g.save(); g.translate(0, -150); g.rotate(t * 0.8 + ph);
          for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillStyle = "#f8fafc"; g.fillRect(4, -3, 110, 6); g.fillStyle = "rgba(248,250,252,.85)"; g.fillRect(30, 4, 80, 18); g.strokeStyle = "#78350f"; g.strokeRect(30, 4, 80, 18); }
          g.fillStyle = "#334155"; circ(g, 0, 0, 7); g.fill(); g.restore();
          g.restore();
        };
        mill(-80, 0.7, 1); mill(60, 1, 0);
        g.fillStyle = "#ef4444"; for (let i = 0; i < 12; i++) { circ(g, -140 + i * 24, -4, 5); g.fill(); } g.fillStyle = "#facc15"; for (let i = 0; i < 12; i++) { circ(g, -128 + i * 24, -8, 5); g.fill(); }
        break;
      }
      case "de": {
        g.fillStyle = "#e7d7b0"; g.fillRect(-140, -150, 280, 24); g.strokeRect(-140, -150, 280, 24); g.fillRect(-150, -126, 300, 12);
        for (let i = 0; i < 6; i++) { g.fillStyle = "#e7d7b0"; g.fillRect(-136 + i * 52, -114, 16, 114); g.strokeRect(-136 + i * 52, -114, 16, 114); }
        g.fillStyle = "#d8c596"; g.fillRect(-50, -180, 100, 30); g.strokeRect(-50, -180, 100, 30);
        g.fillStyle = "#4d7c6b"; g.beginPath(); g.moveTo(-34, -180); g.lineTo(-24, -210); g.lineTo(-6, -214); g.lineTo(0, -236); g.lineTo(8, -214); g.lineTo(26, -210); g.lineTo(34, -180); g.closePath(); g.fill();
        break;
      }
      case "it": {
        g.save(); g.rotate(0.09);
        g.fillStyle = "#f8fafc"; rr(g, -40, -260, 80, 260, 8); g.fill(); g.stroke();
        g.fillStyle = "#cbd5e1"; for (let k = 0; k < 7; k++) { g.fillRect(-40, -34 - k * 34, 80, 5); for (let c = 0; c < 5; c++) { g.beginPath(); g.arc(-28 + c * 14, -16 - k * 34, 4, Math.PI, 0); g.lineTo(-24 + c * 14, -8 - k * 34); g.lineTo(-32 + c * 14, -8 - k * 34); g.fill(); } }
        g.fillStyle = "#e2e8f0"; rr(g, -28, -294, 56, 36, 6); g.fill(); g.stroke();
        g.restore();
        break;
      }
      case "tr": {
        g.fillStyle = "#cbd5e1"; g.fillRect(-120, -70, 240, 70); g.strokeRect(-120, -70, 240, 70);
        g.fillStyle = "#94a3b8"; g.beginPath(); g.arc(0, -70, 70, Math.PI, 0); g.fill(); g.stroke();
        for (const dx of [-82, 82]) { g.beginPath(); g.arc(dx, -70, 34, Math.PI, 0); g.fill(); g.stroke(); }
        g.fillStyle = "#facc15"; g.fillRect(-2, -158, 4, 18);
        for (const mx of [-150, -120, 120, 150]) { g.fillStyle = "#e2e8f0"; g.fillRect(mx - 6, -230, 12, 230); g.strokeRect(mx - 6, -230, 12, 230); g.fillStyle = "#64748b"; tri(g, mx - 6, -230, mx, -270, mx + 6, -230); g.fill(); g.fillStyle = "#cbd5e1"; g.fillRect(mx - 9, -170, 18, 6); g.fillRect(mx - 9, -120, 18, 6); }
        g.fillStyle = "#1e40af"; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(-98 + i * 28, -26, 8, Math.PI, 0); g.lineTo(-90 + i * 28, -10); g.lineTo(-106 + i * 28, -10); g.fill(); }
        break;
      }
      case "in": {
        g.fillStyle = "#f8fafc"; g.fillRect(-110, -110, 220, 110); g.strokeRect(-110, -110, 220, 110);
        g.fillStyle = "#e2e8f0"; g.beginPath(); g.moveTo(0, -250); g.quadraticCurveTo(70, -200, 50, -120); g.lineTo(-50, -120); g.quadraticCurveTo(-70, -200, 0, -250); g.fill(); g.stroke();
        g.fillStyle = "#f8fafc"; g.fillRect(-56, -124, 112, 16);
        g.fillStyle = "#d4a017"; g.fillRect(-1.5, -272, 3, 24);
        for (const dx of [-70, 70]) { g.fillStyle = "#f1f5f9"; g.beginPath(); g.arc(dx, -110, 20, Math.PI, 0); g.fill(); g.stroke(); }
        for (const mx of [-150, 150]) { g.fillStyle = "#f8fafc"; g.fillRect(mx - 8, -200, 16, 200); g.strokeRect(mx - 8, -200, 16, 200); g.beginPath(); g.arc(mx, -200, 12, Math.PI, 0); g.fill(); g.stroke(); }
        g.fillStyle = "#cbd5e1"; g.beginPath(); g.arc(0, -40, 22, Math.PI, 0); g.lineTo(22, 0); g.lineTo(-22, 0); g.fill();
        g.fillStyle = "#7dd3fc"; g.fillRect(-150, -4, 300, 4);
        break;
      }
      case "cn": {
        g.fillStyle = "#7cb25a"; g.beginPath(); g.moveTo(-170, 0); g.quadraticCurveTo(-110, -150, -40, -90); g.quadraticCurveTo(20, -40, 80, -150); g.quadraticCurveTo(130, -200, 170, -100); g.lineTo(170, 0); g.fill();
        g.strokeStyle = "#a8896b"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(-160, -20); g.quadraticCurveTo(-110, -150, -40, -96); g.quadraticCurveTo(20, -46, 80, -156); g.quadraticCurveTo(128, -206, 166, -110); g.stroke();
        g.strokeStyle = "#8a6d52"; g.lineWidth = 4; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(-160, -29); g.quadraticCurveTo(-110, -159, -40, -105); g.quadraticCurveTo(20, -55, 80, -165); g.quadraticCurveTo(128, -215, 166, -119); g.stroke(); g.setLineDash([]);
        for (const [tx, ty] of [[-100, -128], [76, -170]]) { g.fillStyle = "#a8896b"; g.fillRect(tx - 18, ty - 30, 36, 34); g.strokeStyle = O; g.lineWidth = 2; g.strokeRect(tx - 18, ty - 30, 36, 34); g.fillStyle = "#7c2d12"; tri(g, tx - 24, ty - 30, tx, ty - 50, tx + 24, ty - 30); g.fill(); }
        break;
      }
      case "jp": {
        g.fillStyle = "#6b7fb4"; tri(g, -180, 0, 0, -230, 180, 0); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.moveTo(-58, -156); g.lineTo(0, -230); g.lineTo(58, -156); g.lineTo(34, -168); g.lineTo(14, -150); g.lineTo(-8, -170); g.lineTo(-30, -152); g.closePath(); g.fill();
        g.fillStyle = "#ef4444"; circ(g, 120, -200, 26); g.fill();
        // معبد صغير
        g.save(); g.translate(-110, 0);
        for (let k = 0; k < 3; k++) { g.fillStyle = "#b91c1c"; g.fillRect(-18 + k * 3, -30 - k * 30, 36 - k * 6, 26); g.fillStyle = "#1f2937"; g.beginPath(); g.moveTo(-30 + k * 4, -30 - k * 30); g.quadraticCurveTo(0, -40 - k * 30, 30 - k * 4, -30 - k * 30); g.lineTo(22 - k * 4, -36 - k * 30); g.lineTo(-22 + k * 4, -36 - k * 30); g.fill(); }
        g.restore();
        g.fillStyle = "#f9a8d4"; for (let i = 0; i < 6; i++) { circ(g, 60 + i * 18, -10 - (i % 2) * 8, 12); g.fill(); }
        break;
      }
      case "us": {
        g.fillStyle = "#a8a29e"; g.fillRect(-46, -90, 92, 90); g.strokeRect(-46, -90, 92, 90); g.fillStyle = "#d6d3d1"; g.fillRect(-56, -100, 112, 14);
        g.fillStyle = "#5eb8a0"; g.beginPath(); g.moveTo(-26, -100); g.quadraticCurveTo(-30, -180, -14, -220); g.lineTo(16, -220); g.quadraticCurveTo(30, -170, 26, -100); g.closePath(); g.fill(); g.stroke();
        circ(g, 0, -236, 16); g.fill(); g.stroke();
        for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.32; tri(g, Math.cos(a - 0.08) * 16, -236 + Math.sin(a - 0.08) * 16, Math.cos(a) * 32, -236 + Math.sin(a) * 32, Math.cos(a + 0.08) * 16, -236 + Math.sin(a + 0.08) * 16); g.fill(); }
        g.strokeStyle = "#5eb8a0"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.moveTo(14, -200); g.lineTo(30, -280); g.stroke();
        g.fillStyle = "#d4a017"; tri(g, 20, -284, 30, -300, 40, -284); g.fill(); g.fillStyle = "#f97316"; ell(g, 30, -306, 9, 14 + Math.sin(t * 8) * 2); g.fill(); g.fillStyle = "#fde047"; ell(g, 30, -302, 5, 8); g.fill();
        g.fillStyle = "#4a9c85"; rr(g, -34, -190, 18, 30, 4); g.fill();
        break;
      }
      case "br": {
        g.fillStyle = "#5b8c51"; g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(20, -240, 90, -240); g.quadraticCurveTo(150, -230, 160, 0); g.fill();
        g.fillStyle = "#6fa363"; g.beginPath(); g.moveTo(-170, 0); g.quadraticCurveTo(-150, -110, -90, -110); g.quadraticCurveTo(-40, -100, -30, 0); g.fill();
        g.strokeStyle = "#334155"; g.lineWidth = 2; g.beginPath(); g.moveTo(-90, -110); g.lineTo(90, -240); g.stroke();
        const k = (Math.sin(t * 0.4) + 1) / 2, cx = lerp(-90, 90, k), cy = lerp(-110, -240, k);
        g.fillStyle = "#ef4444"; rr(g, cx - 12, cy + 4, 24, 16, 4); g.fill(); g.fillStyle = "#bae6fd"; g.fillRect(cx - 8, cy + 7, 16, 6);
        g.fillStyle = "#38bdf8"; g.fillRect(-180, -6, 360, 6);
        palm(g, -130, 0, 0.8, t); palm(g, 150, 0, 0.7, t);
        break;
      }
    }
    g.restore();
  }

  return { hash, lerp, mix, rr, ell, circ, tri, plane, cloud, star, balloon, bird, storm, parcel, house, runway, far, mid, ground, flag, flagPole, landmark, tree, pine, palm };
})();
