// لعبة المنزل — الرسوم: كل شيء مرسوم بـ Canvas بأسلوب ناعم مدوّر.
// الأشياء تُرسم في مربع 48×48 (الأصل أعلى يسار المربع) ويمكن أن ترتفع حتى 48 فوقه.
window.ART = (() => {
  "use strict";
  const A = {};
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- أدوات
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // mix(لون، مقدار): موجب = أفتح، سالب = أغمق
  const mix = (h, t) => { const c = hex(h).map((v) => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t))); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  A.mix = mix;
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const fr = (c, x, y, w, h, r, col) => { c.fillStyle = col; rr(c, x, y, w, h, r); c.fill(); };
  const ci = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  const el = (c, x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); };
  const poly = (c, pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
  const line = (c, pts, col, w = 2) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); };
  const shadow = (c, x, y, rx, ry = rx * 0.35) => el(c, x, y, rx, ry, "rgba(40,70,40,.2)");
  const outline = (c, w = 2, col = "rgba(60,40,30,.28)") => { c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  Object.assign(A, { rr, fr, ci, el, poly, line, shadow });
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  A.hash = hash;

  // ---------------------------------------------------------------- الأرض (مربع 48×48)
  const GR = ["#a3e27f", "#8fd16d"], FG = ["#86c968", "#76b95a"];
  function tufts(c, x, y, col, n, seed) {
    for (let i = 0; i < n; i++) {
      const px = 6 + hash(seed + i, x) * 36, py = 8 + hash(y, seed - i) * 34;
      line(c, [[px - 2.5, py], [px - 1, py - 4]], col, 1.6); line(c, [[px + 1.5, py], [px + 1, py - 5]], col, 1.6);
    }
  }
  // g: نوع الأرض، x,y للتنويع، m: أي الجيران من نفس النوع (1 شمال، 2 شرق، 4 جنوب، 8 غرب)، f: إطار الماء
  A.ground = (c, g, x, y, m, f) => {
    const v = hash(x, y);
    if (g === 0 || g === 1) {
      c.fillStyle = g ? FG[0] : GR[0]; c.fillRect(0, 0, 48, 48);
      tufts(c, x, y, g ? FG[1] : GR[1], 2 + ((v * 3) | 0), x * 7 + y);
      if (!g && v > 0.86) { ci(c, 12 + v * 20, 30, 2, "#fff"); ci(c, 12 + v * 20, 30, 0.9, "#facc15"); ci(c, 30 - v * 10, 14, 1.8, "#fbcfe8"); }
    } else if (g === 2) {
      c.fillStyle = "#f4e0a6"; c.fillRect(0, 0, 48, 48);
      for (let i = 0; i < 4; i++) ci(c, 6 + hash(x + i, y) * 36, 6 + hash(y + i, x) * 36, 1.3, "#e3c98a");
    } else if (g === 3) {
      c.fillStyle = "#f4e0a6"; c.fillRect(0, 0, 48, 48);
      const i = 7, L = m & 8 ? 0 : i, R = m & 2 ? 48 : 48 - i, T = m & 1 ? 0 : i, B = m & 4 ? 48 : 48 - i;
      fr(c, L, T, R - L, B - T, m === 15 ? 0 : 12, "#5cc5e6");
      // الزوايا الداخلية مربعة إذا كان الجاران موجودين
      c.fillStyle = "#5cc5e6";
      if ((m & 1) && (m & 8)) c.fillRect(0, 0, 14, 14); if ((m & 1) && (m & 2)) c.fillRect(34, 0, 14, 14);
      if ((m & 4) && (m & 8)) c.fillRect(0, 34, 14, 14); if ((m & 4) && (m & 2)) c.fillRect(34, 34, 14, 14);
      const o = f ? 10 : 0;
      for (let k = 0; k < 2; k++) {
        const wx = 8 + ((hash(x, y + k) * 22 + o) % 26), wy = 14 + k * 16 + hash(y, x + k) * 6;
        if (wx > L + 2 && wx + 10 < R - 2 && wy > T + 2 && wy < B - 2) line(c, [[wx, wy], [wx + 4, wy - 2], [wx + 8, wy]], "rgba(255,255,255,.65)", 1.8);
      }
    } else if (g === 4) {
      c.fillStyle = GR[0]; c.fillRect(0, 0, 48, 48);
      const i = 7, L = m & 8 ? 0 : i, R = m & 2 ? 48 : 48 - i, T = m & 1 ? 0 : i, B = m & 4 ? 48 : 48 - i;
      fr(c, L, T, R - L, B - T, 10, "#e6c48e");
      c.fillStyle = "#e6c48e";
      if (m & 1) c.fillRect(i, 0, 48 - 2 * i, 14); if (m & 4) c.fillRect(i, 34, 48 - 2 * i, 14);
      if (m & 8) c.fillRect(0, i, 14, 48 - 2 * i); if (m & 2) c.fillRect(34, i, 14, 48 - 2 * i);
      for (let k = 0; k < 3; k++) ci(c, 14 + hash(x + k, y) * 20, 14 + hash(y + k, x) * 20, 1.6, "#cfa86e");
    } else if (g === 5) {
      c.fillStyle = GR[0]; c.fillRect(0, 0, 48, 48);
      const st = [[4, 4, 19, 17], [25, 3, 19, 19], [3, 25, 21, 19], [27, 26, 17, 18]];
      st.forEach(([sx, sy, w, h], k) => { const d = (hash(x + k, y - k) - 0.5) * 3; fr(c, sx + d, sy + 1.5, w, h, 7, "#b9c2cc"); fr(c, sx + d, sy, w, h - 1.5, 7, "#dde3e9"); });
    } else if (g === 6) {
      c.fillStyle = "#e7b47a"; c.fillRect(0, 0, 48, 48);
      for (let k = 0; k < 4; k++) {
        c.fillStyle = k % 2 ? "#dfa86c" : "#e9b981"; c.fillRect(0, k * 12, 48, 12);
        c.fillStyle = "#c98f55"; c.fillRect(0, k * 12 + 11, 48, 1.2);
        const j = ((k * 17 + x * 11) % 40) + 4; c.fillRect(j, k * 12, 1.2, 11);
      }
    } else if (g === 7) {
      for (let k = 0; k < 4; k++) { const a = (k & 1) ^ (k >> 1); c.fillStyle = a ? "#dbe8f2" : "#f6f3ee"; c.fillRect((k & 1) * 24, (k >> 1) * 24, 24, 24); }
      c.fillStyle = "rgba(150,160,175,.45)"; c.fillRect(0, 23.4, 48, 1.2); c.fillRect(23.4, 0, 1.2, 48);
    } else if (g === 8) {
      c.fillStyle = "#f3bfd2"; c.fillRect(0, 0, 48, 48);
      for (let k = 0; k < 9; k++) ci(c, 8 + (k % 3) * 16, 8 + ((k / 3) | 0) * 16, 2, "#f9d9e5");
    } else if (g === 9) {
      c.fillStyle = "#c08d5d"; c.fillRect(0, 0, 48, 48);
      for (let k = 0; k < 3; k++) fr(c, 3, 5 + k * 15, 42, 8, 4, "#a97848");
    }
  };

  // ---------------------------------------------------------------- الأشجار والنباتات
  const LEAF = [["#5cc46f", "#82dc8c", "#45a65a"], ["#4fb98a", "#79d8a8", "#3c9a72"], ["#7cc650", "#a3e070", "#62a83c"]];
  function canopy(c, cx, cy, r, pal) {
    ci(c, cx, cy + 4, r, pal[2]);
    ci(c, cx - r * 0.55, cy + 2, r * 0.7, pal[0]); ci(c, cx + r * 0.55, cy + 2, r * 0.7, pal[0]); ci(c, cx, cy - r * 0.25, r * 0.85, pal[0]);
    ci(c, cx - r * 0.3, cy - r * 0.45, r * 0.35, pal[1]); ci(c, cx + r * 0.15, cy - r * 0.6, r * 0.2, pal[1]);
  }
  const trunk = (c) => { fr(c, 20, 18, 8, 26, 4, "#9a6537"); fr(c, 21.5, 20, 2.5, 20, 1.5, "#b67d4a"); };
  A.obj = {};
  const O = A.obj;
  O.tree = (c, o, x, y) => { shadow(c, 24, 43, 17); trunk(c); canopy(c, 24, 2, 21, LEAF[(hash(x, y) * 3) | 0]); };
  O.bigtree = (c, o, x, y) => {
    shadow(c, 24, 44, 19); fr(c, 20, 30, 8, 15, 3, "#8a5a32");
    const p = hash(x, y) > 0.5 ? ["#3f9f62", "#5cc07c", "#2f8450"] : ["#3a9a78", "#58bd98", "#2a7d60"];
    el(c, 24, 14, 20, 26, p[2]); el(c, 24, 8, 18, 26, p[0]); el(c, 17, 0, 6, 12, p[1], -0.3);
  };
  O.appletree = (c, o, x, y) => {
    shadow(c, 24, 43, 17); trunk(c); canopy(c, 24, 2, 21, ["#6cc35c", "#98de7e", "#529f45"]);
    if (o.r) [[13, 6], [31, 0], [22, 14], [35, 12], [17, -8]].forEach(([ax, ay]) => { ci(c, ax, ay, 4.2, "#ef4444"); ci(c, ax - 1.3, ay - 1.3, 1.3, "#fecaca"); line(c, [[ax, ay - 4], [ax + 1, ay - 6]], "#7c4a1e", 1.3); });
  };
  O.stump = (c) => { shadow(c, 24, 40, 13); el(c, 24, 36, 12, 7, "#9a6537"); fr(c, 12, 28, 24, 9, 0, "#9a6537"); el(c, 24, 28, 12, 6, "#e0b07a"); el(c, 24, 28, 7, 3.5, "#cf9a62"); el(c, 24, 28, 3, 1.5, "#e0b07a"); };
  O.sapling = (c, o) => {
    shadow(c, 24, 40, 9); el(c, 24, 39, 9, 4, "#a97848"); line(c, [[24, 39], [24, 22]], "#7c5a2e", 2.5);
    el(c, 18, 24, 7, 4, "#5cc46f", -0.5); el(c, 30, 20, 7, 4, "#82dc8c", 0.5); el(c, 24, 16, 4, 6, "#5cc46f");
    if (o && o.t === "asapling") ci(c, 30, 26, 2.6, "#ef4444");
  };
  O.asapling = O.sapling;
  O.bush = (c, o) => {
    shadow(c, 24, 42, 17); ci(c, 24, 30, 15, "#3f9a52"); ci(c, 14, 32, 10, "#4fb062"); ci(c, 34, 32, 10, "#4fb062"); ci(c, 24, 24, 11, "#5cc46f"); ci(c, 20, 20, 4, "#82dc8c");
    if (o.r) [[14, 30], [22, 34], [31, 27], [35, 35], [26, 22], [17, 23]].forEach(([bx, by]) => { ci(c, bx, by, 3.2, "#6d5bd0"); ci(c, bx - 1, by - 1, 1, "#c4b5fd"); });
  };
  O.crop = (c, o) => {
    el(c, 24, 38, 16, 7, "#a97848"); el(c, 24, 36, 14, 5, "#b98a58");
    if (!o.r) { line(c, [[24, 36], [24, 30]], "#4fb062", 2); el(c, 20, 30, 4, 2, "#5cc46f", -0.4); el(c, 28, 30, 4, 2, "#5cc46f", 0.4); return; }
    if (o.v === 0) { // جزر
      [[18, 0], [30, 0], [24, -4]].forEach(([cx, d]) => { poly(c, [[cx - 4, 34 + d], [cx + 4, 34 + d], [cx, 44 + d]], "#f97316"); el(c, cx - 3, 26 + d, 2, 6, "#4fb062", -0.3); el(c, cx + 3, 26 + d, 2, 6, "#5cc46f", 0.3); el(c, cx, 25 + d, 2, 7, "#45a65a"); });
    } else if (o.v === 1) { // فراولة
      ci(c, 24, 28, 9, "#4fb062"); ci(c, 17, 30, 6, "#5cc46f"); ci(c, 31, 30, 6, "#5cc46f");
      [[16, 36], [25, 37], [32, 33], [21, 30]].forEach(([sx, sy]) => { poly(c, [[sx - 4, sy - 3], [sx + 4, sy - 3], [sx, sy + 4]], "#ef4444"); ci(c, sx, sy - 2.5, 3.6, "#ef4444"); ci(c, sx - 1, sy - 1, 0.7, "#fde68a"); ci(c, sx + 1.5, sy + 0.5, 0.7, "#fde68a"); });
    } else if (o.v === 2) { // ذرة
      line(c, [[24, 37], [24, 0]], "#5cc46f", 4); el(c, 16, 16, 9, 2.5, "#4fb062", 0.6); el(c, 32, 22, 9, 2.5, "#4fb062", -0.6); el(c, 17, 30, 8, 2.5, "#5cc46f", 0.5);
      el(c, 29, 10, 4.5, 9, "#facc15", 0.2); el(c, 31, 12, 3, 8, "#86c968", 0.25); line(c, [[24, 0], [22, -6]], "#e8c25a", 1.5); line(c, [[24, 0], [27, -5]], "#e8c25a", 1.5);
    } else { // بطيخ
      line(c, [[10, 34], [18, 30], [26, 36]], "#4fb062", 2); el(c, 26, 32, 14, 10, "#2f9e4a"); for (let k = -2; k <= 2; k++) el(c, 26 + k * 5, 32, 1.3, 9, "#1f7a36"); ci(c, 20, 27, 3, "rgba(255,255,255,.3)");
    }
  };
  O.cotton = (c, o) => {
    shadow(c, 24, 42, 12); line(c, [[24, 42], [24, 16]], "#7c5a2e", 2.5); line(c, [[24, 30], [15, 22]], "#7c5a2e", 2); line(c, [[24, 26], [33, 18]], "#7c5a2e", 2);
    el(c, 17, 30, 5, 2.5, "#5cc46f", 0.5); el(c, 31, 32, 5, 2.5, "#5cc46f", -0.5);
    const p = o.r ? [[24, 14], [14, 20], [34, 16]] : [];
    p.forEach(([px, py]) => { ci(c, px - 3, py + 1, 4, "#fff"); ci(c, px + 3, py + 1, 4, "#fff"); ci(c, px, py - 2, 4.5, "#fff"); ci(c, px, py + 4, 2, "#8a6a3e"); });
    if (!o.r) [[24, 14], [14, 20], [34, 16]].forEach(([px, py]) => ci(c, px, py, 3, "#86c968"));
  };
  O.rock = (c, o, x, y) => {
    shadow(c, 24, 42, 17); const k = hash(x, y) * 4;
    el(c, 24, 32, 17, 12, "#8e98a6"); el(c, 23, 29, 16, 11, "#b5bec9"); el(c, 18 + k, 25, 7, 4, "#d2d9e1", -0.3);
    ci(c, 33, 33, 2, "#9aa4b1");
  };
  O.goldrock = (c, o, x, y) => {
    O.rock(c, o, x, y);
    [[16, 31], [28, 26], [33, 34], [22, 36]].forEach(([gx, gy]) => { poly(c, [[gx, gy - 4], [gx + 3, gy], [gx, gy + 3], [gx - 3, gy]], "#facc15"); ci(c, gx - 0.6, gy - 0.6, 0.9, "#fff7c2"); });
  };
  O.crystal = (c) => {
    shadow(c, 24, 42, 15); el(c, 24, 38, 15, 6, "#8e98a6");
    const g = (x, y, w, h, c1, c2) => { poly(c, [[x, y], [x + w / 2, y - h * 0.18], [x + w / 2, y + h * 0.82], [x, y + h], [x - w / 2, y + h * 0.82], [x - w / 2, y - h * 0.18]], c1); poly(c, [[x, y], [x + w / 2, y - h * 0.18], [x + w / 2, y + h * 0.82], [x, y + h]], c2); };
    g(16, 22, 9, 17, "#a5f3fc", "#67e8f9"); g(32, 20, 10, 19, "#c4b5fd", "#a78bfa"); g(24, 8, 12, 30, "#bae6fd", "#7dd3fc");
    ci(c, 21, 16, 1.6, "#fff"); ci(c, 30, 26, 1.2, "#fff");
  };
  const PET = [["#f9a8d4", "#ec4899"], ["#fde047", "#f59e0b"], ["#93c5fd", "#3b82f6"], ["#ffffff", "#fbbf24"]];
  function bloom(c, x, y, r, v) {
    const [p, m] = PET[v];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU - 1.57; ci(c, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.85, p); }
    ci(c, x, y, r * 0.6, v === 3 ? "#fbbf24" : "#fff7c2"); if (v !== 3) ci(c, x, y, r * 0.3, m);
  }
  A.bloom = bloom;
  O.wflower = (c, o, x, y) => {
    const v = o.v || 0;
    [[14, 30, 0], [32, 24, 1], [26, 38, 2]].forEach(([fx, fy, k]) => {
      if (k === 2 && hash(x, y) < 0.4) return;
      line(c, [[fx, fy], [fx, fy + 9]], "#4fb062", 1.8); el(c, fx + 3, fy + 7, 3, 1.5, "#5cc46f", 0.5);
      bloom(c, fx, fy, 3.3, (v + k) % 4);
    });
  };
  O.flower = (c, o) => {
    line(c, [[24, 22], [24, 40]], "#4fb062", 2.5); el(c, 18, 34, 6, 3, "#5cc46f", -0.5); el(c, 30, 32, 6, 3, "#5cc46f", 0.5);
    bloom(c, 24, 20, 5.2, o.v || 0);
  };
  O.egg = (c) => { el(c, 24, 38, 12, 5, "#e2b66a"); for (let k = 0; k < 6; k++) line(c, [[14 + k * 4, 34], [16 + k * 4, 41]], "#c99a4a", 1.2); el(c, 24, 32, 6, 8, "#fff8ec"); ci(c, 22, 29, 1.5, "#fff"); };
  O.wool = (c) => { shadow(c, 24, 42, 11); ci(c, 24, 33, 10, "#f8f5ef"); line(c, [[16, 30], [24, 27], [32, 32]], "#e2dccf", 1.5); line(c, [[15, 36], [24, 33], [33, 37]], "#e2dccf", 1.5); line(c, [[32, 38], [38, 42]], "#e2dccf", 1.5); };

  // ---------------------------------------------------------------- البناء
  // c: لون الجدار، below: يوجد جدار تحته (فيتصل السطح)
  O.wall = (c, o, x, y, wc, below, kind) => {
    const top = mix(wc, 0.35), face = wc, dark = mix(wc, -0.18);
    if (below) { fr(c, 0, -14, 48, 62, 0, top); c.fillStyle = mix(wc, 0.2); c.fillRect(0, -14, 48, 2); return; }
    fr(c, 0, -14, 48, 24, 5, top); fr(c, 0, 4, 48, 44, 3, face);
    c.fillStyle = dark; c.fillRect(0, 44, 48, 4);
    c.fillStyle = "rgba(0,0,0,.06)"; for (let k = 0; k < 3; k++) c.fillRect(0, 14 + k * 10, 48, 1.4);
    c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(2, -12, 44, 2);
    if (kind === "window") {
      fr(c, 9, 10, 30, 26, 5, "#ffffff"); fr(c, 12, 13, 24, 20, 3, "#bfe8fb");
      poly(c, [[14, 30], [24, 15], [28, 15], [18, 30]], "rgba(255,255,255,.55)");
      c.fillStyle = "#fff"; c.fillRect(23, 13, 2, 20); c.fillRect(12, 22, 24, 2);
      fr(c, 7, 34, 34, 4, 2, "#f1f5f9"); [[14, 33], [24, 32], [34, 33]].forEach(([fx, fy], k) => bloom(c, fx, fy, 2.4, k % 4));
    }
  };
  O.window = (c, o, x, y, wc, below) => O.wall(c, o, x, y, wc, below, below ? "" : "window");
  O.door = (c, o, x, y, wc) => {
    const top = mix(wc, 0.35);
    fr(c, 0, -14, 9, 62, 3, top); fr(c, 39, -14, 9, 62, 3, top); fr(c, 0, -14, 48, 12, 4, top);
    fr(c, 0, 4, 9, 44, 2, wc); fr(c, 39, 4, 9, 44, 2, wc);
    fr(c, 9, -2, 30, 4, 1, mix(wc, -0.2));
    // الباب مفتوح على الجانب
    poly(c, [[9, 2], [16, 6], [16, 46], [9, 48]], "#b97a45"); poly(c, [[10, 6], [15, 9], [15, 22], [10, 20]], "#d39a62"); ci(c, 14, 28, 1.3, "#fde68a");
  };
  O.fence = (c) => {
    shadow(c, 24, 44, 22, 3);
    fr(c, 0, 22, 48, 5, 2, "#e9e2d4"); fr(c, 0, 34, 48, 5, 2, "#e9e2d4");
    [6, 24, 42].forEach((px) => { fr(c, px - 4, 12, 8, 32, 3, "#fffaf0"); poly(c, [[px - 4, 15], [px, 9], [px + 4, 15]], "#fffaf0"); c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(px + 2, 14, 2, 30); });
  };

  // ---------------------------------------------------------------- الأثاث
  const WD = "#c88a52", WL = "#e4ab72", WK = "#9e6535";
  O.bed = (c) => {
    shadow(c, 24, 46, 22, 4);
    fr(c, 3, -8, 42, 54, 7, WD); fr(c, 3, -8, 42, 12, 6, WK); fr(c, 6, -6, 36, 4, 2, WL);
    fr(c, 6, 4, 36, 38, 5, "#fffaf3"); fr(c, 10, 6, 28, 10, 5, "#ffffff"); fr(c, 10, 14, 28, 2, 1, "#ece4d8");
    fr(c, 6, 20, 36, 24, 5, "#f472b6"); fr(c, 6, 20, 36, 5, 3, "#f9a8d4");
    [[14, 31], [24, 36], [34, 30]].forEach(([hx, hy]) => { ci(c, hx - 1.5, hy, 1.8, "#fbcfe8"); ci(c, hx + 1.5, hy, 1.8, "#fbcfe8"); poly(c, [[hx - 3.2, hy + 0.5], [hx + 3.2, hy + 0.5], [hx, hy + 3.6]], "#fbcfe8"); });
  };
  O.wardrobe = (c) => {
    shadow(c, 24, 46, 22, 4);
    fr(c, 4, -34, 40, 80, 5, WD); fr(c, 4, -34, 40, 8, 4, WL);
    fr(c, 7, -24, 16, 62, 3, WL); fr(c, 25, -24, 16, 62, 3, WL);
    fr(c, 9, -20, 12, 22, 2, "rgba(255,255,255,.25)"); fr(c, 27, -20, 12, 22, 2, "rgba(255,255,255,.25)");
    ci(c, 21, 8, 1.8, "#fde68a"); ci(c, 27, 8, 1.8, "#fde68a"); fr(c, 6, 40, 6, 6, 1, WK); fr(c, 36, 40, 6, 6, 1, WK);
  };
  O.table = (c) => {
    shadow(c, 24, 45, 20, 4);
    fr(c, 8, 22, 4, 22, 1, WK); fr(c, 36, 22, 4, 22, 1, WK);
    fr(c, 3, 6, 42, 20, 6, WD); fr(c, 3, 4, 42, 18, 6, WL);
    el(c, 24, 13, 6, 3, "#fff"); el(c, 24, 12, 4, 2, "#fca5a5");
  };
  O.chair = (c) => {
    shadow(c, 24, 45, 14, 3.5);
    fr(c, 12, 26, 3, 18, 1, WK); fr(c, 33, 26, 3, 18, 1, WK);
    fr(c, 12, -2, 24, 18, 5, WD); fr(c, 15, 1, 18, 4, 2, WL);
    fr(c, 10, 18, 28, 12, 4, WL); fr(c, 12, 19, 24, 6, 3, "#f9a8d4");
  };
  O.sofa = (c) => {
    shadow(c, 24, 46, 23, 4);
    const s = "#2dd4bf", d = "#14b8a6", l = "#5eead4";
    fr(c, 2, 4, 44, 22, 8, d); fr(c, 4, 6, 40, 16, 6, s);
    fr(c, 2, 20, 44, 22, 6, d); fr(c, 7, 20, 16, 14, 5, l); fr(c, 25, 20, 16, 14, 5, l);
    fr(c, 0, 14, 9, 28, 5, s); fr(c, 39, 14, 9, 28, 5, s);
    fr(c, 4, 40, 4, 6, 1, WK); fr(c, 40, 40, 4, 6, 1, WK);
  };
  O.rug = (c) => { el(c, 24, 26, 23, 17, "#c084fc"); el(c, 24, 26, 19, 13.5, "#f0abfc"); el(c, 24, 26, 13, 9, "#c084fc"); el(c, 24, 26, 7, 4.5, "#fde68a"); };
  O.bookshelf = (c) => {
    shadow(c, 24, 46, 22, 4);
    fr(c, 3, -26, 42, 72, 4, WD); fr(c, 6, -22, 36, 64, 2, WK);
    const cols = ["#f87171", "#60a5fa", "#fbbf24", "#34d399", "#a78bfa", "#f472b6"];
    [-21, -1, 19].forEach((sy, r) => {
      let bx = 7; for (let k = 0; k < 6; k++) { const w = 4 + ((k + r) % 3); const h = 14 + ((k * 3 + r) % 4); fr(c, bx, sy + 18 - h, w, h, 1, cols[(k + r * 2) % 6]); bx += w + 1; if (bx > 38) break; }
      c.fillStyle = WL; c.fillRect(6, sy + 18, 36, 3);
    });
  };
  O.toybox = (c) => {
    shadow(c, 24, 45, 20, 4);
    ci(c, 16, 14, 7, "#f87171"); ci(c, 15, 12, 2, "#fff"); fr(c, 26, 6, 10, 12, 3, "#60a5fa"); ci(c, 34, 12, 5, "#fbbf24");
    fr(c, 4, 14, 40, 30, 6, "#f59e0b"); fr(c, 4, 14, 40, 8, 5, "#fbbf24");
    ci(c, 24, 31, 6, "#fff7c2"); poly(c, [[24, 26], [25.6, 29.5], [29, 30], [26.4, 32.4], [27.2, 36], [24, 34], [20.8, 36], [21.6, 32.4], [19, 30], [22.4, 29.5]], "#f472b6");
  };
  O.pot = (c) => {
    shadow(c, 24, 45, 13, 3.5);
    el(c, 16, 10, 6, 12, "#4fb062", -0.4); el(c, 32, 10, 6, 12, "#4fb062", 0.4); el(c, 24, 4, 6, 14, "#5cc46f"); el(c, 22, 2, 2, 6, "#82dc8c");
    poly(c, [[12, 22], [36, 22], [32, 44], [16, 44]], "#e07a4f"); fr(c, 10, 20, 28, 7, 3, "#f0915f");
  };
  O.fireplace = (c) => {
    shadow(c, 24, 46, 23, 4);
    fr(c, 2, -18, 44, 64, 5, "#b9a99a"); fr(c, 0, -20, 48, 8, 3, "#d6c8bb");
    for (let r = 0; r < 6; r++) for (let k = 0; k < 4; k++) fr(c, 4 + k * 10 + (r % 2) * 5, -10 + r * 9, 8, 7, 2, r % 2 ? "#c7b8aa" : "#cdbfb2");
    fr(c, 10, 12, 28, 32, 12, "#3b2a24"); fr(c, 10, 30, 28, 14, 2, "#3b2a24");
    fr(c, 14, 38, 20, 5, 2, "#8a5a32");
  };
  O.bench = (c) => {
    shadow(c, 24, 45, 22, 4);
    fr(c, 6, 24, 4, 20, 1, "#6b7280"); fr(c, 38, 24, 4, 20, 1, "#6b7280");
    fr(c, 2, 2, 44, 6, 3, WD); fr(c, 2, 10, 44, 6, 3, WD); fr(c, 2, 20, 44, 7, 3, WL); fr(c, 2, 28, 44, 6, 3, WD);
  };
  O.lamp = (c) => {
    shadow(c, 24, 45, 14, 3.5);
    fr(c, 12, 24, 24, 20, 4, WD); fr(c, 12, 24, 24, 5, 3, WL);
    line(c, [[24, 24], [24, 8]], "#a16207", 2.5); el(c, 24, 22, 7, 2.5, "#a16207");
    poly(c, [[16, 8], [32, 8], [36, -6], [12, -6]], "#fde68a"); poly(c, [[16, 8], [24, 8], [24, -6], [12, -6]], "#fef3c7");
  };
  O.floorlamp = (c) => {
    shadow(c, 24, 45, 10, 3);
    el(c, 24, 43, 8, 3, "#475569"); line(c, [[24, 42], [24, -6]], "#64748b", 2.5);
    poly(c, [[14, -6], [34, -6], [38, -24], [10, -24]], "#fbcfe8"); poly(c, [[14, -6], [24, -6], [24, -24], [10, -24]], "#fde4f0");
  };
  O.glamp = (c) => {
    shadow(c, 24, 45, 9, 3); fr(c, 21, 6, 6, 38, 2, "#475569"); el(c, 24, 43, 8, 3, "#334155");
    fr(c, 14, -18, 20, 24, 5, "#334155"); fr(c, 17, -15, 14, 18, 3, "#fde68a"); poly(c, [[12, -18], [36, -18], [24, -28]], "#475569");
  };
  O.lights = (c) => {
    fr(c, 3, -18, 4, 62, 2, "#8a5a32"); fr(c, 41, -18, 4, 62, 2, "#8a5a32");
    c.strokeStyle = "#475569"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(5, -14); c.quadraticCurveTo(24, 12, 43, -14); c.stroke();
    c.beginPath(); c.moveTo(5, 4); c.quadraticCurveTo(24, 28, 43, 4); c.stroke();
    const cols = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#f472b6"];
    for (let k = 1; k < 8; k++) { const t = k / 8, bx = 5 + 38 * t, s = 4 * t * (1 - t); ci(c, bx, -14 + 26 * s * 2 + 2, 2.6, cols[k % 5]); ci(c, bx, 4 + 24 * s * 2 + 2, 2.6, cols[(k + 2) % 5]); }
  };
  O.radio = (c) => {
    shadow(c, 24, 45, 18, 3.5);
    fr(c, 8, 30, 32, 14, 3, WD); fr(c, 8, 30, 32, 4, 2, WL);
    fr(c, 8, 4, 32, 26, 7, "#f472b6"); fr(c, 8, 4, 32, 6, 5, "#f9a8d4");
    ci(c, 18, 19, 7, "#831843"); for (let k = 0; k < 3; k++) ci(c, 18, 19, 5.5 - k * 2, k % 2 ? "#9d174d" : "#be185d");
    fr(c, 29, 12, 8, 6, 2, "#fff7c2"); ci(c, 31, 24, 2, "#fde68a"); ci(c, 36, 24, 2, "#fde68a");
    line(c, [[30, 4], [36, -8]], "#64748b", 1.5); ci(c, 36, -8, 1.5, "#f87171");
  };
  O.tv = (c, o) => {
    shadow(c, 24, 46, 22, 4);
    fr(c, 4, 26, 40, 18, 4, WD); fr(c, 4, 26, 40, 5, 3, WL); fr(c, 8, 34, 14, 7, 2, WK); fr(c, 26, 34, 14, 7, 2, WK);
    fr(c, 20, 20, 8, 7, 1, "#334155");
    fr(c, 2, -14, 44, 36, 6, "#334155"); fr(c, 5, -11, 38, 28, 3, o && o.on ? "#7dd3fc" : "#1e293b");
    if (!(o && o.on)) poly(c, [[8, -8], [16, -8], [8, 4]], "rgba(255,255,255,.12)");
    ci(c, 41, 19, 1.2, o && o.on ? "#4ade80" : "#f87171");
  };
  O.fridge = (c) => {
    shadow(c, 24, 46, 19, 4);
    fr(c, 6, -34, 36, 80, 8, "#e2e8f0"); fr(c, 6, -34, 36, 76, 8, "#f8fafc");
    c.fillStyle = "#cbd5e1"; c.fillRect(6, -6, 36, 2);
    fr(c, 34, -26, 3, 14, 1.5, "#94a3b8"); fr(c, 34, 2, 3, 18, 1.5, "#94a3b8");
    ci(c, 14, -22, 3, "#f87171"); ci(c, 20, -18, 2.5, "#fbbf24"); fr(c, 12, 6, 8, 6, 1, "#93c5fd");
  };
  O.mirror = (c) => {
    shadow(c, 24, 46, 14, 3.5);
    line(c, [[16, 44], [20, 22]], WK, 3); line(c, [[32, 44], [28, 22]], WK, 3);
    el(c, 24, 0, 15, 22, "#e4ab72"); el(c, 24, 0, 12, 19, "#c7ecff"); poly(c, [[16, 6], [26, -16], [30, -14], [20, 10]], "rgba(255,255,255,.6)");
    ci(c, 24, -22, 3, "#f472b6");
  };
  O.aquarium = (c) => {
    shadow(c, 24, 46, 22, 4);
    fr(c, 4, 26, 40, 18, 3, WD); fr(c, 4, 26, 40, 4, 2, WL);
    fr(c, 2, -12, 44, 38, 5, "rgba(186,230,253,.9)"); fr(c, 4, -6, 40, 30, 3, "#5cc5e6"); fr(c, 4, 18, 40, 6, 2, "#f4e0a6");
    line(c, [[12, 22], [10, 8], [13, -2]], "#4fb062", 2.5); line(c, [[36, 22], [38, 10]], "#4fb062", 2.5);
    fr(c, 2, -12, 44, 4, 2, "#64748b");
  };
  O.fountain = (c) => {
    shadow(c, 24, 46, 23, 5);
    el(c, 24, 34, 23, 11, "#b5bec9"); el(c, 24, 32, 20, 8.5, "#5cc5e6"); el(c, 24, 32, 12, 4.5, "#8fdcf3");
    fr(c, 20, 4, 8, 28, 3, "#cdd5de"); el(c, 24, 6, 11, 4.5, "#b5bec9"); el(c, 24, 5, 8.5, 3, "#8fdcf3");
  };
  // ألعاب مبعثرة
  O.ball = (c) => {
    shadow(c, 24, 44, 11); ci(c, 24, 32, 11, "#ef4444");
    c.save(); c.beginPath(); c.arc(24, 32, 11, 0, TAU); c.clip(); c.fillStyle = "#fff"; c.fillRect(13, 28, 22, 8); c.fillStyle = "#3b82f6"; c.fillRect(13, 36, 22, 8); c.restore();
    ci(c, 20, 27, 2.6, "rgba(255,255,255,.7)");
  };
  O.teddy = (c) => {
    shadow(c, 24, 45, 14); const b = "#c08457", l = "#e2b48a";
    el(c, 24, 34, 12, 11, b); el(c, 24, 36, 7, 6, l); ci(c, 13, 40, 5, b); ci(c, 35, 40, 5, b); ci(c, 13, 28, 4.5, b); ci(c, 35, 28, 4.5, b);
    ci(c, 24, 16, 11, b); ci(c, 15, 8, 4.5, b); ci(c, 33, 8, 4.5, b); ci(c, 15, 8, 2.3, l); ci(c, 33, 8, 2.3, l);
    el(c, 24, 20, 5, 4, l); ci(c, 24, 18.5, 1.8, "#3b2a24"); ci(c, 20, 14, 1.5, "#3b2a24"); ci(c, 28, 14, 1.5, "#3b2a24");
    poly(c, [[19, 25], [24, 28], [29, 25], [29, 30], [24, 27.5], [19, 30]], "#f472b6");
  };
  O.books = (c) => {
    shadow(c, 24, 45, 17);
    fr(c, 8, 34, 32, 9, 2, "#60a5fa"); fr(c, 10, 35, 28, 2, 1, "#fff");
    fr(c, 11, 25, 28, 9, 2, "#f87171"); fr(c, 13, 26, 24, 2, 1, "#fff");
    fr(c, 9, 16, 30, 9, 2, "#34d399"); fr(c, 11, 17, 26, 2, 1, "#fff"); fr(c, 30, 14, 3, 6, 1, "#fbbf24");
  };
  O.toycar = (c) => {
    shadow(c, 24, 44, 18);
    fr(c, 6, 24, 36, 14, 6, "#ef4444"); fr(c, 14, 14, 20, 13, 6, "#f87171"); fr(c, 17, 17, 6, 7, 2, "#bfe8fb"); fr(c, 25, 17, 6, 7, 2, "#bfe8fb");
    ci(c, 14, 39, 5, "#334155"); ci(c, 34, 39, 5, "#334155"); ci(c, 14, 39, 2, "#cbd5e1"); ci(c, 34, 39, 2, "#cbd5e1"); ci(c, 40, 29, 2, "#fde68a");
  };
  O.cushion = (c) => {
    shadow(c, 24, 44, 17);
    fr(c, 7, 16, 34, 26, 9, "#a78bfa"); fr(c, 10, 18, 28, 8, 6, "#c4b5fd");
    ci(c, 24, 29, 4, "#fde68a"); [[7, 16], [41, 16], [7, 42], [41, 42]].forEach(([tx, ty]) => ci(c, tx, ty, 2.5, "#fbbf24"));
  };
  O.doll = (c) => {
    shadow(c, 24, 45, 11);
    poly(c, [[17, 26], [31, 26], [36, 43], [12, 43]], "#f472b6"); fr(c, 16, 22, 16, 8, 4, "#fbcfe8");
    ci(c, 24, 14, 9, "#fde3cc"); c.fillStyle = "#b8803f"; c.beginPath(); c.arc(24, 13, 10, Math.PI, 0); c.fill(); ci(c, 14, 18, 4, "#b8803f"); ci(c, 34, 18, 4, "#b8803f");
    ci(c, 21, 15, 1.3, "#3b2a24"); ci(c, 27, 15, 1.3, "#3b2a24"); ci(c, 19, 18, 1.6, "rgba(244,114,182,.5)"); ci(c, 29, 18, 1.6, "rgba(244,114,182,.5)");
  };
  O.vase = (c) => {
    shadow(c, 24, 45, 11);
    line(c, [[24, 26], [16, 6]], "#4fb062", 2); line(c, [[24, 26], [24, 2]], "#4fb062", 2); line(c, [[24, 26], [32, 8]], "#4fb062", 2);
    bloom(c, 16, 6, 4, 0); bloom(c, 24, 1, 4, 1); bloom(c, 32, 8, 4, 2);
    el(c, 24, 35, 10, 10, "#60a5fa"); fr(c, 19, 22, 10, 6, 2, "#93c5fd"); el(c, 21, 32, 2.5, 5, "rgba(255,255,255,.35)");
  };

  // ---------------------------------------------------------------- أشياء متحركة فوق الرسم المحفوظ
  A.dyn = {
    tv(c, x, y, t, o) {
      if (!o.on) return;
      const h = (t * 40) % 360;
      c.fillStyle = `hsl(${h},80%,72%)`; c.fillRect(x + 5, y - 11, 38, 14);
      c.fillStyle = "#86efac"; c.fillRect(x + 5, y + 3, 38, 14);
      const bx = x + 12 + ((t * 18) % 24);
      ci(c, bx, y + 2 - Math.abs(Math.sin(t * 5)) * 7, 4, "#fde047");
      ci(c, x + 34, y - 6, 3, "#fff");
    },
    fireplace(c, x, y, t, o) {
      if (o.on === false) return;
      for (let k = 0; k < 3; k++) {
        const f = Math.sin(t * 9 + k * 2) * 2;
        el(c, x + 18 + k * 6, y + 32 - k % 2 * 2, 4.5, 9 + f, k === 1 ? "#fb923c" : "#f97316");
        el(c, x + 18 + k * 6, y + 35, 2.5, 5 + f / 2, "#fde047");
      }
    },
    aquarium(c, x, y, t) {
      for (let k = 0; k < 2; k++) {
        const fx = x + 24 + Math.sin(t * (0.8 + k * 0.5) + k * 2) * 13, fy = y + 2 + k * 9, d = Math.cos(t * (0.8 + k * 0.5) + k * 2) > 0 ? 1 : -1;
        el(c, fx, fy, 5, 3.2, k ? "#fbbf24" : "#f97316"); poly(c, [[fx - 4 * d, fy], [fx - 8 * d, fy - 3], [fx - 8 * d, fy + 3]], k ? "#f59e0b" : "#ea580c"); ci(c, fx + 2.5 * d, fy - 0.8, 0.9, "#1e293b");
      }
      const by = y + 16 - ((t * 14) % 20); ci(c, x + 34, by, 1.5, "rgba(255,255,255,.8)");
    },
    fountain(c, x, y, t) {
      for (let k = 0; k < 3; k++) { const p = ((t * 1.4 + k / 3) % 1); ci(c, x + 24 + (k - 1) * p * 12, y + 2 - Math.sin(p * Math.PI) * 14 + p * 26, 2, "rgba(186,240,255,.95)"); }
    },
    radio(c, x, y, t, o) {
      if (!o.on) return;
      const p = (t * 0.8) % 1, a = 1 - p;
      c.fillStyle = `rgba(190,24,93,${a})`; c.font = "bold 13px sans-serif"; c.fillText("♪", x + 32 + p * 6, y - 6 - p * 18);
      c.fillStyle = `rgba(124,58,237,${1 - ((p + 0.5) % 1)})`; c.fillText("♫", x + 6 - ((p + 0.5) % 1) * 4, y - 2 - ((p + 0.5) % 1) * 18);
    },
  };

  // ---------------------------------------------------------------- أيقونات المواد والطعام (مربع 48)
  A.item = {
    wood(c) { [[10, 30], [26, 30], [18, 18]].forEach(([x, y]) => { fr(c, x - 2, y - 6, 18, 13, 6, "#a8693b"); el(c, x + 14, y + 0.5, 4.5, 6.5, "#e4b47e"); el(c, x + 14, y + 0.5, 2.2, 3.2, "#c98f55"); }); },
    stone(c) { el(c, 18, 32, 12, 9, "#8e98a6"); el(c, 17, 30, 11, 8, "#b5bec9"); el(c, 32, 26, 10, 8, "#9aa4b1"); el(c, 31, 24, 9, 7, "#cdd5de"); el(c, 28, 21, 3, 2, "#eef2f6"); },
    cotton(c) { poly(c, [[12, 30], [24, 44], [36, 30], [24, 36]], "#8a6a3e"); ci(c, 15, 25, 9, "#e7e2d8"); ci(c, 33, 25, 9, "#e7e2d8"); ci(c, 24, 15, 9.5, "#f1ede6"); ci(c, 24, 27, 10, "#faf8f3"); ci(c, 15, 24, 8, "#fff"); ci(c, 33, 24, 8, "#fff"); ci(c, 24, 14, 8, "#fff"); ci(c, 20, 12, 2.5, "#fff"); },
    gold(c) { poly(c, [[8, 34], [40, 34], [34, 18], [14, 18]], "#eab308"); poly(c, [[14, 18], [34, 18], [31, 22], [17, 22]], "#fde047"); poly(c, [[8, 34], [14, 18], [17, 22], [12, 34]], "#facc15"); ci(c, 20, 26, 1.6, "#fff7c2"); poly(c, [[37, 10], [38.5, 14], [42, 15], [38.5, 16], [37, 20], [35.5, 16], [32, 15], [35.5, 14]], "#fff"); },
    diamond(c) { poly(c, [[10, 18], [17, 10], [31, 10], [38, 18], [24, 40]], "#7dd3fc"); poly(c, [[10, 18], [38, 18], [24, 40]], "#38bdf8"); poly(c, [[17, 10], [24, 18], [31, 10]], "#e0f2fe"); poly(c, [[17, 18], [24, 18], [24, 40]], "#bae6fd"); },
    ruby(c) { el(c, 24, 26, 13, 14, "#e11d48"); poly(c, [[16, 20], [24, 13], [32, 20], [24, 27]], "#fb7185"); ci(c, 19, 19, 2, "#ffe4e6"); el(c, 28, 33, 4, 3, "#be123c"); },
    apple(c) { ci(c, 18, 28, 11, "#ef4444"); ci(c, 30, 28, 11, "#ef4444"); ci(c, 24, 32, 11, "#dc2626"); ci(c, 17, 24, 3, "#fecaca"); line(c, [[24, 18], [26, 10]], "#7c4a1e", 2.5); el(c, 31, 12, 6, 3, "#4fb062", -0.4); },
    berry(c) { [[16, 28], [28, 26], [22, 36], [34, 35], [22, 20]].forEach(([x, y]) => { ci(c, x, y, 6.5, "#6d5bd0"); ci(c, x - 2, y - 2, 1.8, "#c4b5fd"); }); el(c, 30, 14, 6, 3, "#4fb062", -0.6); },
    straw(c) { poly(c, [[10, 18], [38, 18], [24, 42]], "#ef4444"); ci(c, 17, 21, 7, "#ef4444"); ci(c, 31, 21, 7, "#ef4444"); for (let k = 0; k < 7; k++) ci(c, 15 + (k % 3) * 8 + (k > 5 ? 4 : 0), 22 + ((k / 3) | 0) * 7, 1, "#fde68a"); poly(c, [[14, 15], [24, 10], [34, 15], [24, 19]], "#4fb062"); },
    carrot(c) { poly(c, [[16, 16], [32, 16], [22, 44]], "#f97316"); line(c, [[19, 24], [24, 24]], "#ea580c", 1.5); line(c, [[21, 32], [25, 32]], "#ea580c", 1.5); el(c, 20, 10, 3, 7, "#4fb062", -0.4); el(c, 28, 10, 3, 7, "#5cc46f", 0.4); el(c, 24, 8, 2.5, 8, "#45a65a"); },
    corn(c) { el(c, 26, 24, 9, 17, "#facc15", 0.3); for (let k = 0; k < 5; k++) line(c, [[18 + k * 2, 14 + k * 1], [30 + k * 1, 38 - k * 2]], "#eab308", 1); el(c, 18, 30, 5, 14, "#86c968", 0.5); el(c, 32, 32, 4, 13, "#5cc46f", -0.2); },
    melon(c) { c.fillStyle = "#2f9e4a"; c.beginPath(); c.arc(24, 18, 20, 0.15, Math.PI - 0.15); c.fill(); c.fillStyle = "#f8fafc"; c.beginPath(); c.arc(24, 18, 17, 0.15, Math.PI - 0.15); c.fill(); c.fillStyle = "#f43f5e"; c.beginPath(); c.arc(24, 18, 15, 0.15, Math.PI - 0.15); c.fill(); [[16, 24], [24, 28], [32, 24], [20, 30], [28, 30]].forEach(([x, y]) => el(c, x, y, 1.2, 2, "#1f2937")); },
    egg(c) { el(c, 24, 26, 12, 15, "#fff8ec"); el(c, 24, 28, 12, 13, "#fdf1dc"); ci(c, 19, 20, 3, "#fff"); },
    wall(c, wc) { fr(c, 6, 10, 36, 14, 5, mix(wc, 0.35)); fr(c, 6, 20, 36, 20, 3, wc); c.fillStyle = mix(wc, -0.18); c.fillRect(6, 37, 36, 3); },
    floor_wood(c) { c.save(); rr(c, 6, 6, 36, 36, 8); c.clip(); c.translate(6, 6); c.scale(0.75, 0.75); A.ground(c, 6, 1, 1); c.restore(); },
    floor_tile(c) { c.save(); rr(c, 6, 6, 36, 36, 8); c.clip(); c.translate(6, 6); c.scale(0.75, 0.75); A.ground(c, 7, 1, 1); c.restore(); },
    floor_carpet(c) { c.save(); rr(c, 6, 6, 36, 36, 8); c.clip(); c.translate(6, 6); c.scale(0.75, 0.75); A.ground(c, 8, 1, 1); c.restore(); },
    path(c) { c.save(); rr(c, 6, 6, 36, 36, 8); c.clip(); c.translate(6, 6); c.scale(0.75, 0.75); A.ground(c, 5, 1, 1); c.restore(); },
  };

  // ---------------------------------------------------------------- الشخصية
  // (x,y) = موضع القدمين، dir: 0 أسفل، 1 أعلى، 2 يسار، 3 يمين، ph: طور المشي
  A.char = (c, x, y, dir, ph, ch, s = 1, D) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    const side = dir >= 2, back = dir === 1;
    if (dir === 2) c.scale(-1, 1);
    const hijab = ch.hair === 7;
    const HC = hijab ? D.SCARF[ch.hc] : D.HAIR[ch.hc], SK = D.SKIN[ch.skin], OC = D.OUT[ch.oc], OD = mix(OC, -0.2), OL = mix(OC, 0.3);
    const sw = Math.sin(ph), bob = ph ? Math.abs(sw) * 1.4 : 0;
    el(c, 0, -1, 12, 4, "rgba(40,60,40,.22)");
    // الساقان
    const pants = ch.top === 1, LG = pants ? "#4a5f9c" : SK, SH = "#5b4636";
    if (side) {
      fr(c, -4 + sw * 2.5, -14, 5, 13, 2.5, LG); fr(c, 0 - sw * 2.5, -14, 5, 13, 2.5, mix(pants ? "#4a5f9c" : SK, -0.08));
      fr(c, -5 + sw * 2.5, -4, 8, 4, 2, SH); fr(c, -1 - sw * 2.5, -4, 8, 4, 2, SH);
    } else {
      const a = Math.max(0, sw) * 2, b = Math.max(0, -sw) * 2;
      fr(c, -6, -14 - a, 5, 13, 2.5, LG); fr(c, 1, -14 - b, 5, 13, 2.5, LG);
      fr(c, -7, -4 - a, 7, 4, 2, SH); fr(c, 0, -4 - b, 7, 4, 2, SH);
    }
    c.translate(0, -bob);
    // الشعر الخلفي
    const hairBack = () => {
      if (hijab) { poly(c, [[-15, -42], [15, -42], [17, -27], [-17, -27]], HC); return; }
      if (ch.hair === 4) { if (back) fr(c, -15, -50, 30, 30, 10, HC); else if (side) fr(c, -15, -50, 18, 28, 9, HC); else { fr(c, -16, -48, 9, 24, 5, HC); fr(c, 7, -48, 9, 24, 5, HC); } }
      if (ch.hair === 1) { if (side) { el(c, -15, -40, 5, 10, HC, 0.3); ci(c, -12, -48, 3, "#f472b6"); } else if (back) { el(c, 0, -34, 5, 9, HC); ci(c, 0, -43, 3, "#f472b6"); } else el(c, 14, -50, 4, 6, HC, 0.4); }
      if (ch.hair === 2) { const p = side ? [[-12, -40]] : [[-15, -40], [15, -40]]; p.forEach(([px, py]) => { el(c, px, py, 4.5, 8, HC); ci(c, px, py - 6, 2.4, "#f472b6"); el(c, px, py + 7, 3, 4, HC); }); }
      if (ch.hair === 3) { ci(c, side ? -3 : 0, -60, 7.5, HC); ci(c, side ? -6 : -3, -62, 2.4, mix(HC, 0.25)); }
      if (ch.hair === 6) for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; ci(c, Math.cos(a) * 14, -46 + Math.sin(a) * 13, 6.5, HC); }
    };
    hairBack();
    // الجسم
    if (ch.top === 0) {
      poly(c, [[-8, -32], [8, -32], [13, -12], [-13, -12]], OC); fr(c, -13, -15, 26, 4, 2, OL); fr(c, -8, -33, 16, 7, 4, OC);
      if (!back) { ci(c, -2.5, -31, 2.2, "#fff"); ci(c, 2.5, -31, 2.2, "#fff"); }
    } else if (ch.top === 1) {
      fr(c, -9, -33, 18, 16, 6, OC); fr(c, -8, -19, 16, 7, 3, "#4a5f9c"); if (!back) fr(c, -1, -32, 2, 13, 1, OL);
    } else {
      fr(c, -8, -33, 16, 12, 6, "#fff7ed"); poly(c, [[-8, -23], [8, -23], [12, -11], [-12, -11]], OC); fr(c, -12, -14, 24, 3, 2, OD);
      if (!back) fr(c, -8, -24, 16, 3, 1, OD);
    }
    // الذراعان
    const arm = ch.top === 2 ? "#fff7ed" : OC;
    if (side) { fr(c, -2 - sw * 3, -31, 6, 12, 3, arm); ci(c, 1 - sw * 3.5, -18, 2.8, SK); }
    else { fr(c, -13, -31 + sw, 5, 12, 2.5, arm); fr(c, 8, -31 - sw, 5, 12, 2.5, arm); ci(c, -10.5, -18 + sw, 2.7, SK); ci(c, 10.5, -18 - sw, 2.7, SK); }
    // الرأس
    if (hijab) {
      ci(c, 0, -45, 16, HC);
      if (!back) { const fx = side ? 5 : 0; el(c, fx, -43, side ? 8.5 : 10.5, 10.5, SK); }
      else fr(c, -4, -36, 8, 10, 3, mix(HC, -0.1));
    } else {
      ci(c, 0, -45, 13.5, SK);
      const big = ch.hair === 5 ? 14 : ch.hair === 6 ? 15 : 14.8, hy = ch.hair === 5 ? -47.5 : -46;
      c.save(); c.beginPath(); c.arc(0, hy, big, 0, TAU); c.clip();
      c.fillStyle = HC; c.fillRect(-20, -70, 40, 50);
      if (!back) { c.fillStyle = SK; c.beginPath(); c.ellipse(side ? 4 : 0, ch.hair === 5 ? -42 : -41.5, side ? 10.5 : 12, ch.hair === 5 ? 10.5 : 9.8, 0, 0, TAU); c.fill(); }
      c.restore();
      if (ch.hair === 0 && !back) { fr(c, -15, -46, 6, 12, 3, HC); if (!side) fr(c, 9, -46, 6, 12, 3, HC); }
      if (ch.hair === 5) for (let k = -1; k <= 1; k++) poly(c, [[k * 6 - 3, -59], [k * 6 + 3, -59], [k * 6 + (side ? -2 : 0), -64]], HC);
      if (!back && !side && ch.hair !== 5) { c.fillStyle = HC; c.beginPath(); c.ellipse(-4, -51, 8, 4, 0.25, 0, TAU); c.fill(); }
    }
    // الوجه
    if (!back) {
      const ex = side ? [7] : [-5, 5];
      ex.forEach((exx) => { el(c, exx, -43, 2, 2.6, "#2b2023"); ci(c, exx + 0.7, -44, 0.8, "#fff"); });
      (side ? [8] : [-8, 8]).forEach((bx) => ci(c, bx, -38.5, 2.4, "rgba(244,114,182,.38)"));
      c.strokeStyle = "#8b3a3a"; c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath(); c.arc(side ? 9 : 0, -39.5, 2.4, 0.2, Math.PI - 0.2); c.stroke();
    }
    // الزينة
    const acc = ch.acc;
    if (acc === 1) { const bx = side ? -4 : 9, by = -57; poly(c, [[bx, by], [bx - 7, by - 4], [bx - 7, by + 4]], "#f43f5e"); poly(c, [[bx, by], [bx + 7, by - 4], [bx + 7, by + 4]], "#f43f5e"); ci(c, bx, by, 2.2, "#be123c"); }
    if (acc === 2) bloom(c, side ? -6 : -9, -55, 3, 1);
    if (acc === 3) { c.fillStyle = OC; c.beginPath(); c.arc(0, -50, 14.5, Math.PI, 0); c.fill(); if (!back) el(c, side ? 9 : 0, -50, side ? 12 : 15, 3.5, OD); ci(c, 0, -64, 2.4, OL); }
    if (acc === 4 && !back) { c.strokeStyle = "#334155"; c.lineWidth = 1.5; ex2(c, side); }
    if (acc === 5) poly(c, [[-8, -57], [-8, -64], [-4, -60], [0, -66], [4, -60], [8, -64], [8, -57]], "#facc15");
    c.restore();
  };
  function ex2(c, side) { (side ? [7] : [-5, 5]).forEach((x) => { c.beginPath(); c.arc(x, -43, 4.2, 0, TAU); c.stroke(); }); if (!side) { c.beginPath(); c.moveTo(-1, -43); c.lineTo(1, -43); c.stroke(); } }

  // ---------------------------------------------------------------- الحيوانات (تنظر إلى اليمين)
  A.animal = (c, k, x, y, face, hop, swim) => {
    c.save(); c.translate(x, y - hop); if (face < 0) c.scale(-1, 1);
    if (!swim) el(c, 0, hop - 1, 11, 3.5, "rgba(40,60,40,.2)");
    if (k === "cat") {
      c.strokeStyle = "#e08a3c"; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(-9, -10); c.quadraticCurveTo(-18, -14, -14, -24); c.stroke();
      el(c, -1, -9, 11, 7, "#f6a454"); for (let i = 0; i < 3; i++) fr(c, -7 + i * 4, -15, 2, 6, 1, "#e08a3c");
      fr(c, -8, -5, 4, 5, 2, "#f6a454"); fr(c, 4, -5, 4, 5, 2, "#f6a454");
      ci(c, 9, -17, 7.5, "#f6a454"); poly(c, [[3, -21], [5, -29], [9, -23]], "#f6a454"); poly(c, [[10, -23], [14, -29], [15, -20]], "#f6a454"); poly(c, [[11, -23], [13.5, -27], [14, -21]], "#fbcfe8");
      ci(c, 12, -18, 1.3, "#2b2023"); ci(c, 15.5, -15.5, 1.1, "#f472b6"); el(c, 8, -12, 3, 2, "#fde2c4");
    } else if (k === "rabbit") {
      ci(c, -10, -9, 4, "#fff"); el(c, -1, -9, 10, 8, "#f5f5f4"); el(c, -1, -8, 9, 7, "#fff");
      el(c, 6, -29, 2.6, 8, "#fff", 0.15); el(c, 10, -28, 2.6, 8, "#fff", 0.35); el(c, 6, -29, 1.2, 5.5, "#fbcfe8", 0.15); el(c, 10, -28, 1.2, 5.5, "#fbcfe8", 0.35);
      ci(c, 8, -17, 6.5, "#fff"); ci(c, 11, -18, 1.3, "#2b2023"); ci(c, 14, -15.5, 1.1, "#f472b6"); ci(c, 9, -14, 1.6, "rgba(244,114,182,.35)");
    } else if (k === "chick") {
      if (!swim) { line(c, [[-2, -4], [-3, 0]], "#f59e0b", 1.6); line(c, [[3, -4], [4, 0]], "#f59e0b", 1.6); }
      poly(c, [[-9, -12], [-16, -20], [-12, -9]], "#f5f5f4"); ci(c, -1, -11, 9, "#fff"); el(c, -3, -11, 5, 3.5, "#f1ece4", 0.3);
      ci(c, 6, -20, 5.5, "#fff"); ci(c, 5, -26, 2.2, "#ef4444"); ci(c, 8, -26, 2, "#ef4444"); poly(c, [[10, -21], [14, -19.5], [10, -18]], "#f59e0b"); el(c, 9.5, -16, 1.5, 2.2, "#ef4444"); ci(c, 8, -21, 1.1, "#2b2023");
    } else if (k === "duck") {
      el(c, -1, -8, 12, 7, "#fffdf5"); poly(c, [[-11, -9], [-16, -14], [-10, -5]], "#fffdf5"); el(c, -3, -9, 6, 3.5, "#f1ece4", 0.2);
      el(c, 6, -15, 3.5, 6, "#fffdf5"); ci(c, 8, -21, 5.5, "#fffdf5"); el(c, 14, -20, 4, 2, "#fb923c"); ci(c, 9, -22, 1.1, "#2b2023");
      if (swim) { c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.4; c.beginPath(); c.ellipse(0, -3, 15, 3, 0, 0, Math.PI); c.stroke(); }
    } else if (k === "sheep") {
      fr(c, -8, -7, 3, 7, 1.5, "#4b3f3a"); fr(c, 5, -7, 3, 7, 1.5, "#4b3f3a");
      [[-8, -13], [-2, -16], [4, -13], [-4, -9], [3, -9], [-9, -8]].forEach(([wx, wy]) => ci(c, wx, wy, 6, "#f8f5ef"));
      el(c, 11, -15, 5, 6, "#4b3f3a"); el(c, 8, -19, 3.5, 2, "#4b3f3a", -0.5); ci(c, 9, -20, 4, "#f8f5ef"); ci(c, 13, -16, 1.1, "#fff");
    }
    c.restore();
  };
  A.heart = (c, x, y, s, col = "#f472b6") => { ci(c, x - s * 0.5, y, s * 0.6, col); ci(c, x + s * 0.5, y, s * 0.6, col); poly(c, [[x - s * 1.08, y + s * 0.18], [x + s * 1.08, y + s * 0.18], [x, y + s * 1.3]], col); };

  return A;
})();
