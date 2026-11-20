// لعبة المزارع — رسم المزرعة بمنظور أيزومتري (مربعات معيّنة) على Canvas: رسوم أصلية بأشكال بسيطة وإيموجي.
// الأرض المحيطة (العشب والممر والأشجار والحظيرة والبركة والسياج) تُرسم مرة واحدة في خلفية مخبّأة،
// والمربعات وما عليها والمؤشر تُرسم في كل إطار.
window.FA = (() => {
  "use strict";
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  let W = 0, H = 0, dpr = 1, TW = 100, TH = 50, ox = 0, oy = 0, C = 10, R = 6, lite = false, bg = null;
  const M = 0.75; // عرض الممر حول الحقل (بالمربعات)

  const P = (x, y) => [ox + (x - y) * TW / 2, oy + (x + y) * TH / 2];
  function rng(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function poly(c, pts, fill, stroke, lw) {
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  const quad = (x0, y0, x1, y1) => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
  const up = (p, h) => [p[0], p[1] - h];

  // الإيموجي في Canvas مخبّأة حسب الحجم
  const EC = new Map();
  function emo(e, px) {
    px = Math.max(8, Math.round(px));
    const k = e + "|" + px;
    let c = EC.get(k);
    if (!c) {
      c = document.createElement("canvas"); c.width = Math.ceil(px * 1.3 * dpr); c.height = Math.ceil(px * 1.3 * dpr);
      const g = c.getContext("2d"); g.scale(dpr, dpr);
      g.font = `${px}px ${EMOJI_FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic";
      g.fillText(e, px * 0.65, px * 1.08);
      c._px = px; EC.set(k, c);
      if (EC.size > 400) EC.delete(EC.keys().next().value);
    }
    return c;
  }
  // يرسم الإيموجي وقاعدته عند (x, y)
  function drawEmo(c, e, x, y, px, alpha) {
    const im = emo(e, px), w = im.width / dpr, h = im.height / dpr;
    if (alpha != null) c.globalAlpha = alpha;
    c.drawImage(im, x - w / 2, y - h * 0.86, w, h);
    if (alpha != null) c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- المقاسات
  function layout(o) {
    C = o.C; R = o.R; lite = !!o.lite;
    W = innerWidth; H = innerHeight; dpr = lite ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const top = o.top || 0, bottom = o.bottom || 0, avail = H - top - bottom, span = C + R + 2 * M;
    TW = Math.min(W * 0.98 / (span / 2), avail / (span / 4 + 0.55));
    TH = TW / 2;
    ox = W / 2 - (C - R) * TW / 4;
    oy = top + 0.55 * TW + M * TH + (avail - TW * (span / 4 + 0.55)) / 2;
    EC.clear();
    buildBg();
  }

  // ---------------------------------------------------------------- الخلفية
  function tree(c, x, y, col, s, r) {
    const [px, py] = P(x, y), k = TW * s;
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(px, py, k * 0.5, k * 0.22, 0, 0, 7); c.fill();
    c.fillStyle = "#7c4a1e"; c.fillRect(px - k * 0.07, py - k * 0.55, k * 0.14, k * 0.55);
    const blobs = [[0, -0.95, 0.42], [-0.28, -0.72, 0.3], [0.3, -0.7, 0.3], [0, -1.25, 0.28]];
    for (const [bx, by, br] of blobs) {
      c.fillStyle = col[0]; c.beginPath(); c.arc(px + bx * k, py + by * k, br * k, 0, 7); c.fill();
    }
    c.fillStyle = col[1];
    for (const [bx, by, br] of blobs) { c.beginPath(); c.arc(px + bx * k - br * k * 0.25, py + by * k - br * k * 0.3, br * k * 0.45, 0, 7); c.fill(); }
    // ثمار صغيرة
    c.fillStyle = col[2];
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(px + (r() - 0.5) * k * 0.9, py - k * (0.65 + r() * 0.6), k * 0.05, 0, 7); c.fill(); }
  }
  const BARN = { front: "#dc2626", side: "#b91c1c", line: "#7f1d1d", door: "#fef3c7", cross: "#dc2626", gable: "#991b1b", roof: "#57534e", win: "#fde68a" };
  const HOUSE = { front: "#fef3c7", side: "#fde68a", line: "#a16207", door: "#92400e", cross: null, gable: "#c2410c", roof: "#ea580c", win: "#7dd3fc", chimney: true };
  function barn(c, x, y, w, d, h, K = BARN) {
    const T = (p) => up(p, TH * h * 2), rh = TH * (K.chimney ? 0.9 : 1.1);
    const A = P(x, y), B = P(x + w, y), Cc = P(x + w, y + d), Dd = P(x, y + d);
    c.fillStyle = "rgba(0,0,0,.2)"; poly(c, [P(x + 0.2, y + d + 0.25), P(x + w + 0.3, y + d + 0.25), P(x + w + 0.3, y + 0.2), Cc, Dd], "rgba(0,0,0,.18)");
    poly(c, [Dd, Cc, T(Cc), T(Dd)], K.front, K.line, 2);         // الواجهة
    poly(c, [Cc, B, T(B), T(Cc)], K.side, K.line, 2);           // الجانب
    // الباب
    const d0 = P(x + w * 0.35, y + d), d1 = P(x + w * 0.65, y + d), dh = TH * h * 1.3;
    poly(c, [d0, d1, up(d1, dh), up(d0, dh)], K.door, "#fff", 2);
    if (K.cross) {
      c.strokeStyle = K.cross; c.lineWidth = Math.max(2, TW * 0.03);
      c.beginPath(); c.moveTo(...d0); c.lineTo(...up(d1, dh)); c.moveTo(...d1); c.lineTo(...up(d0, dh)); c.stroke();
    } else {
      // نافذتان في الواجهة للبيت
      for (const u of [0.12, 0.72]) { const a = P(x + w * u, y + d), b = P(x + w * (u + 0.16), y + d); poly(c, [up(a, TH * h * 0.9), up(b, TH * h * 0.9), up(b, TH * h * 1.5), up(a, TH * h * 1.5)], K.win, "#fff", 2); }
    }
    // نافذة في الجانب
    const w0 = P(x + w, y + d * 0.35), w1 = P(x + w, y + d * 0.65);
    poly(c, [up(w0, TH * h * 1.1), up(w1, TH * h * 1.1), up(w1, TH * h * 1.6), up(w0, TH * h * 1.6)], K.win, "#fff", 2);
    // السقف
    const R1 = up(P(x, y + d / 2), TH * h * 2 + rh), R2 = up(P(x + w, y + d / 2), TH * h * 2 + rh);
    poly(c, [T(B), T(Cc), R2], K.gable, "#fff", 2);
    if (K.chimney) { const q = P(x + w * 0.25, y + d * 0.3), ch = TH * h * 2 + rh * 1.2; poly(c, [up(q, TH * h * 2), up([q[0] + TW * 0.12, q[1]], TH * h * 2), up([q[0] + TW * 0.12, q[1]], ch), up(q, ch)], "#9ca3af", "#6b7280", 2); }
    poly(c, [T(Dd), T(Cc), R2, R1], K.roof, "#fff", 2.5);
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const a = P(x + (w * i) / 6, y + d), b = P(x + (w * i) / 6, y + d / 2); c.beginPath(); c.moveTo(...up(a, TH * h * 2)); c.lineTo(...up(b, TH * h * 2 + rh)); c.stroke(); }
  }
  // الطاحونة: البرج في الخلفية، والأجنحة تدور في كل إطار
  let MILL = null;
  function millTower(c, x, y) {
    const [px, py] = P(x, y), w = TW * 0.42, h = TW * 1.25;
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(px, py, w * 0.9, w * 0.4, 0, 0, 7); c.fill();
    poly(c, [[px - w / 2, py], [px + w / 2, py], [px + w * 0.32, py - h], [px - w * 0.32, py - h]], "#f8fafc", "#cbd5e1", 2);
    poly(c, [[px, py], [px + w / 2, py], [px + w * 0.32, py - h], [px, py - h]], "#e2e8f0");
    for (const k of [0.35, 0.7]) { c.fillStyle = "#93c5fd"; c.fillRect(px - w * 0.08, py - h * k - w * 0.12, w * 0.16, w * 0.2); }
    c.fillStyle = "#92400e"; c.fillRect(px - w * 0.12, py - w * 0.36, w * 0.24, w * 0.36);
    poly(c, [[px - w * 0.42, py - h], [px + w * 0.42, py - h], [px, py - h - w * 0.75]], "#dc2626", "#fff", 2);
    MILL = [px, py - h - w * 0.05, TW * 0.75];
  }
  function millBlades(T) {
    if (!MILL) return;
    const [hx, hy, L] = MILL, a0 = T * (lite ? 0.6 : 1.1);
    ctx.save(); ctx.translate(hx, hy);
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.rotate(a0 + (k * Math.PI) / 2);
      ctx.fillStyle = "#a16207"; ctx.fillRect(-L * 0.025, 0, L * 0.05, L);
      ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fillRect(L * 0.03, L * 0.22, L * 0.2, L * 0.76);
      ctx.strokeStyle = "#d6d3d1"; ctx.lineWidth = 1;
      for (let j = 1; j < 5; j++) { ctx.beginPath(); ctx.moveTo(L * 0.03, L * (0.22 + j * 0.15)); ctx.lineTo(L * 0.23, L * (0.22 + j * 0.15)); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.arc(0, 0, L * 0.07, 0, 7); ctx.fill();
    ctx.restore();
  }
  function pond(c, x, y, rx, ry) {
    const [px, py] = P(x, y);
    c.fillStyle = "#a3a3a3"; c.beginPath(); c.ellipse(px, py, rx * TW * 0.55, ry * TH * 0.55 * 2, 0, 0, 7); c.fill();
    c.fillStyle = "#38bdf8"; c.beginPath(); c.ellipse(px, py, rx * TW * 0.5, ry * TH, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.ellipse(px - rx * TW * 0.15, py - ry * TH * 0.35, rx * TW * 0.18, ry * TH * 0.18, 0, 0, 7); c.fill();
  }
  function fence(c, x0, y0, x1, y1) {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 0.5)), ph = TH * 0.55;
    const pts = []; for (let i = 0; i <= n; i++) pts.push(P(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n));
    c.strokeStyle = "#fff"; c.lineWidth = Math.max(2, TW * 0.035); c.lineCap = "round";
    for (const hh of [0.45, 0.85]) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1] - ph * hh) : c.moveTo(p[0], p[1] - ph * hh))); c.stroke(); }
    c.strokeStyle = "#cbd5e1"; c.lineWidth = Math.max(1, TW * 0.012);
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1] - ph * 0.42) : c.moveTo(p[0], p[1] - ph * 0.42))); c.stroke();
    for (const p of pts) { c.fillStyle = "#fff"; c.fillRect(p[0] - TW * 0.025, p[1] - ph, TW * 0.05, ph); c.fillStyle = "#e2e8f0"; c.fillRect(p[0], p[1] - ph, TW * 0.025, ph); }
  }
  function buildBg() {
    bg = document.createElement("canvas"); bg.width = cv.width; bg.height = cv.height;
    const c = bg.getContext("2d"); c.scale(dpr, dpr);
    const r = rng(20261120);
    // العشب
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#86d14d"); g.addColorStop(1, "#5fb031");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < (lite ? 120 : 380); i++) {
      c.fillStyle = r() < 0.5 ? "rgba(255,255,255,.10)" : "rgba(0,80,0,.10)";
      c.beginPath(); c.ellipse(r() * W, r() * H, 3 + r() * 10, 2 + r() * 4, 0, 0, 7); c.fill();
    }
    // البركة على اليسار
    pond(c, 1.4, R + M + 1.7, 2.2, 1.4);
    // الممر الحجري حول الحقل
    poly(c, quad(-M, -M, C + M, R + M), "#e9c99b", "#c79f6a", 2);
    c.strokeStyle = "rgba(160,110,60,.45)"; c.lineWidth = 1;
    for (let t = -M; t <= C + M; t += 0.5) { c.beginPath(); c.moveTo(...P(t, -M)); c.lineTo(...P(t, 0)); c.moveTo(...P(t, R)); c.lineTo(...P(t, R + M)); c.stroke(); }
    for (let t = 0; t <= R; t += 0.5) { c.beginPath(); c.moveTo(...P(-M, t)); c.lineTo(...P(0, t)); c.moveTo(...P(C, t)); c.lineTo(...P(C + M, t)); c.stroke(); }
    // حافة الحقل السميكة
    const dz = TH * 0.28;
    poly(c, [P(C, 0), P(C, R), up(P(C, R), -dz), up(P(C, 0), -dz)], "#6b3f1d");
    poly(c, [P(0, R), P(C, R), up(P(C, R), -dz), up(P(0, R), -dz)], "#84512a");
    poly(c, quad(0, 0, C, R), "#4d7c0f");
    // الحظيرة والأشجار خلف الحقل
    const things = [];
    const bx = C - 3.2, by = -M - 2.4;
    things.push({ d: bx + by + 3.5, f: () => barn(c, bx, by, 2.4, 1.6, 0.85) });
    const COLS = [["#f59e0b", "#fcd34d", "#b45309"], ["#a855f7", "#d8b4fe", "#7e22ce"], ["#22c55e", "#86efac", "#ef4444"], ["#ec4899", "#f9a8d4", "#fff"], ["#84cc16", "#d9f99d", "#f97316"]];
    // بيتنا (يسار الحقل) والطاحونة (خلفه)
    const hx = -M - 2.7, hy = 1.9, mx = C + M + 1.7, my = R * 0.45;
    things.push({ d: hx + hy + 3, f: () => barn(c, hx, hy, 2, 1.6, 0.7, HOUSE) });
    const near = (x, y, ax, ay, w, d) => x > ax - 1.2 && x < ax + w + 0.8 && y > ay - 1.2 && y < ay + d + 0.8;
    const free = (x, y) => !near(x, y, bx, by, 2.4, 1.6) && !near(x, y, hx, hy, 2, 1.6) && !near(x, y, mx - 0.5, my - 0.5, 1, 1);
    for (let x = -M - 1.5; x < C + 2.5; x += 1.15 + r() * 0.5) { const y = -M - 1 - r() * 2.4; if (free(x, y)) things.push({ d: x + y, f: ((x, y, k) => () => tree(c, x, y, COLS[k], 0.62 + r() * 0.25, r))(x, y, (r() * 5) | 0) }); }
    for (let y = -M - 0.4; y < R + 1; y += 1.2 + r() * 0.5) { const x = -M - 1 - r() * 2.2; if (!free(x, y)) continue; things.push({ d: x + y, f: ((x, y, k) => () => tree(c, x, y, COLS[k], 0.6 + r() * 0.25, r))(x, y, (r() * 5) | 0) }); }
    things.sort((a, b) => a.d - b.d).forEach((o) => o.f());
    // السياج الأبيض أمام الحقل
    fence(c, C + M + 0.25, -M - 0.3, C + M + 0.25, R + M + 0.25);
    fence(c, -M - 0.3, R + M + 0.25, C + M + 0.25, R + M + 0.25);
    millTower(c, mx, my);
    // شجيرات وزهور في الأمام
    for (let i = 0; i < 9; i++) {
      const x = C + M + 0.9 + r() * 2.5, y = -M + r() * (R + 2 * M);
      if (Math.abs(x - mx) < 1 && Math.abs(y - my) < 1) continue;
      const [px, py] = P(x, y); c.fillStyle = "#16a34a"; c.beginPath(); c.arc(px, py - TH * 0.25, TW * 0.12, 0, 7); c.fill();
      c.fillStyle = ["#f472b6", "#facc15", "#fff"][i % 3]; c.beginPath(); c.arc(px + TW * 0.04, py - TH * 0.35, TW * 0.03, 0, 7); c.fill();
    }
  }

  // ---------------------------------------------------------------- المربعات
  const G = 0.045; // فراغ بين المربعات
  function soil(c, x, y, wet) {
    const dz = TH * 0.16, a = P(x + G, y + 1 - G), b = P(x + 1 - G, y + 1 - G), cc = P(x + 1 - G, y + G);
    poly(c, [a, b, up(b, -dz), up(a, -dz)], wet ? "#3f2410" : "#5b3517");
    poly(c, [b, cc, up(cc, -dz), up(b, -dz)], wet ? "#2f1a0b" : "#4a2a12");
    poly(c, quad(x + G, y + G, x + 1 - G, y + 1 - G), wet ? "#6b4020" : "#9a6233");
    c.lineCap = "round";
    for (const v of [0.25, 0.5, 0.75]) {
      c.strokeStyle = wet ? "#4a2a12" : "#6f4120"; c.lineWidth = Math.max(1.5, TH * 0.07);
      c.beginPath(); c.moveTo(...P(x + 0.12, y + v)); c.lineTo(...P(x + 0.88, y + v)); c.stroke();
      c.strokeStyle = wet ? "#7c4a24" : "#b57a45"; c.lineWidth = Math.max(1, TH * 0.035);
      c.beginPath(); c.moveTo(...P(x + 0.12, y + v - 0.07)); c.lineTo(...P(x + 0.88, y + v - 0.07)); c.stroke();
    }
  }
  function grassTile(c, x, y, col, edge) {
    poly(c, quad(x + G, y + G, x + 1 - G, y + 1 - G), col, edge, 1.5);
  }
  function sprout(c, px, py, s) {
    c.strokeStyle = "#15803d"; c.lineWidth = Math.max(1.5, s * 0.18);
    c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - s * 0.8); c.stroke();
    c.fillStyle = "#22c55e";
    c.beginPath(); c.ellipse(px - s * 0.32, py - s * 0.7, s * 0.36, s * 0.16, -0.5, 0, 7); c.fill();
    c.beginPath(); c.ellipse(px + s * 0.32, py - s * 0.85, s * 0.36, s * 0.16, 0.5, 0, 7); c.fill();
    c.fillStyle = "#4ade80"; c.beginPath(); c.ellipse(px, py - s * 1.05, s * 0.14, s * 0.26, 0, 0, 7); c.fill();
  }
  function pen(c, x, y) {
    const k = 0.1, ph = TH * 0.42, pts = [[x + k, y + k], [x + 1 - k, y + k], [x + 1 - k, y + 1 - k], [x + k, y + 1 - k], [x + k, y + k]].map(([a, b]) => P(a, b));
    c.strokeStyle = "#a16207"; c.lineWidth = Math.max(2, TW * 0.025);
    for (const hh of [0.45, 0.9]) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1] - ph * hh) : c.moveTo(p[0], p[1] - ph * hh))); c.stroke(); }
    c.fillStyle = "#854d0e"; for (const p of pts.slice(0, 4)) c.fillRect(p[0] - TW * 0.018, p[1] - ph, TW * 0.036, ph);
  }
  function bubble(c, px, py, e, T) {
    const b = lite ? 0 : Math.sin(T * 3) * TH * 0.08, rr = TW * 0.15;
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.arc(px + 2, py + b + 3, rr, 0, 7); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(px, py + b, rr, 0, 7); c.fill();
    c.beginPath(); c.moveTo(px - rr * 0.3, py + b + rr * 0.85); c.lineTo(px, py + b + rr * 1.45); c.lineTo(px + rr * 0.3, py + b + rr * 0.85); c.fill();
    drawEmo(c, e, px, py + b + rr * 0.55, rr * 1.15);
  }
  function bar(c, px, py, p) {
    const w = TW * 0.42, h = Math.max(4, TH * 0.1);
    c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(px - w / 2, py, w, h);
    c.fillStyle = "#facc15"; c.fillRect(px - w / 2 + 1, py + 1, (w - 2) * p, h - 2);
  }
  const SPOTS = [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
  const BIG = { house: 0.82, tractor: 0.72, hut: 0.75, fountain: 0.75, tree: 0.78, pine: 0.78 };

  // v(i) → { s: الحالة, it: العنصر, p: التقدّم 0..1, wet }
  function frame(o) {
    const { f, v, cur, T } = o;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(bg, 0, 0, W, H);
    const tops = [];
    for (let d = 0; d <= C + R - 2; d++) {
      for (let x = Math.max(0, d - R + 1); x <= Math.min(C - 1, d); x++) {
        const y = d - x, i = y * C + x, q = v(i), [cx, cy] = P(x + 0.5, y + 0.5);
        const s = q.s;
        if (s === "lock") {
          grassTile(ctx, x, y, "#6fbd3e", "rgba(255,255,255,.18)");
          drawEmo(ctx, "🔒", cx, cy + TH * 0.12, TW * 0.16, 0.35);
        } else if (q.it && (q.it.kind === "a" || q.it.kind === "d")) {
          grassTile(ctx, x, y, q.it.kind === "a" ? "#a3e07a" : "#93d667", "rgba(255,255,255,.35)");
        } else soil(ctx, x, y, q.wet);
        // ما على المربع
        if (s === "dry" || s === "grow") {
          const p = s === "dry" ? 0.05 : q.p;
          for (const [u, w] of SPOTS) {
            const [px, py] = P(x + u, y + w);
            if (p < 0.75) sprout(ctx, px, py, TW * (0.07 + 0.13 * p));
            else drawEmo(ctx, q.it.e, px, py, TW * 0.22);
          }
          if (s === "dry") tops.push(() => bubble(ctx, cx, cy - TW * 0.45, "💧", T + i));
          else bar(ctx, cx, cy + TH * 0.32, p);
        } else if (s === "ripe") {
          for (const [u, w] of SPOTS) {
            const [px, py] = P(x + u, y + w), b = lite ? 0 : Math.sin(T * 4 + u * 7 + w * 5) * TH * 0.04;
            drawEmo(ctx, q.it.e, px, py + b, TW * 0.3);
          }
          if (!lite) drawEmo(ctx, "✨", cx + TW * 0.2, cy - TW * 0.32, TW * 0.16, 0.5 + 0.5 * Math.sin(T * 5 + i));
        } else if (q.it && q.it.kind === "a") {
          pen(ctx, x, y);
          const g = lite ? 0 : Math.sin(T * 1.6 + i) * TW * 0.02;
          ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(cx, cy + TH * 0.12, TW * 0.2, TH * 0.16, 0, 0, 7); ctx.fill();
          drawEmo(ctx, q.it.e, cx + g, cy + TH * 0.18, TW * 0.5);
          if (s === "hungry") tops.push(() => bubble(ctx, cx, cy - TW * 0.55, q.feed, T + i));
          else if (s === "prod") tops.push(() => bubble(ctx, cx, cy - TW * 0.55, q.gives, T + i));
          else bar(ctx, cx, cy + TH * 0.38, q.p);
        } else if (q.it && q.it.kind === "d") {
          ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(cx, cy + TH * 0.12, TW * 0.24, TH * 0.18, 0, 0, 7); ctx.fill();
          drawEmo(ctx, q.it.e, cx, cy + TH * 0.2, TW * (BIG[q.it.id] || 0.6));
        }
        if (cur && cur.x === x && cur.y === y) tops.push(() => cursor(x, y, cur, T));
      }
    }
    millBlades(T);
    tops.forEach((fn) => fn());
  }
  function cursor(x, y, cur, T) {
    const a = cur.focus ? 0.75 + 0.25 * Math.sin(T * 6) : 0.4;
    const pts = quad(x + 0.02, y + 0.02, x + 0.98, y + 0.98);
    ctx.save();
    ctx.globalAlpha = a;
    poly(ctx, pts, cur.ok === false ? "rgba(239,68,68,.25)" : "rgba(255,255,255,.22)", cur.ok === false ? "#ef4444" : "#fff", Math.max(3, TW * 0.045));
    ctx.restore();
    const [cx, cy] = P(x + 0.5, y + 0.5);
    if (cur.ghost) drawEmo(ctx, cur.ghost, cx, cy + TH * 0.2, TW * 0.55, 0.65);
    if (cur.focus) {
      const b = Math.sin(T * 5) * TH * 0.12, ay = cy - TW * 0.78 + b, s = TW * 0.13;
      ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - s, ay - s); ctx.lineTo(cx + s, ay - s); ctx.lineTo(cx, ay + s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  // من نقطة على الشاشة إلى المربع
  function pick(px, py) {
    const a = (px - ox) / (TW / 2), b = (py - oy) / (TH / 2);
    const x = Math.floor((a + b) / 2), y = Math.floor((b - a) / 2);
    return x >= 0 && y >= 0 && x < C && y < R ? { x, y } : null;
  }
  const center = (x, y) => P(x + 0.5, y + 0.5);
  return { layout, frame, pick, center, size: () => TW };
})();
