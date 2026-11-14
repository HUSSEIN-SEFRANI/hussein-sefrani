// قطارات أحمد — الرسوم (Canvas و SVG من صنع اللعبة، بلا وجوه على القطارات)
(() => {
  "use strict";
  const D = (window.D = {});
  D.COL = { red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#facc15", orange: "#f97316", purple: "#a855f7", pink: "#ec4899", silver: "#94a3b8" };
  D.LOCOS = [{ id: "steam", cost: 0 }, { id: "electric", cost: 8 }, { id: "fast", cost: 20 }, { id: "freight", cost: 35 }];
  D.COLORS = [{ id: "red", cost: 0 }, { id: "blue", cost: 0 }, { id: "green", cost: 0 }, { id: "yellow", cost: 4 }, { id: "orange", cost: 12 }, { id: "purple", cost: 18 }, { id: "pink", cost: 26 }, { id: "silver", cost: 40 }];
  D.LEN = { loco: 150, car: 116 };

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  D.shade = (h, f) => { const c = hex(h).map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  D.mix = (a, b, t) => { const x = hex(a), y = hex(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };

  function wheel(c, x, y, r, a, col = "#334155") {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = "#cbd5e1"; c.beginPath(); c.arc(x, y, r * 0.62, 0, 7); c.fill();
    c.strokeStyle = col; c.lineWidth = Math.max(1.5, r * 0.18);
    for (let k = 0; k < 3; k++) { const q = a + (k * Math.PI) / 3; c.beginPath(); c.moveTo(x - Math.cos(q) * r * 0.6, y - Math.sin(q) * r * 0.6); c.lineTo(x + Math.cos(q) * r * 0.6, y + Math.sin(q) * r * 0.6); c.stroke(); }
    c.fillStyle = "#475569"; c.beginPath(); c.arc(x, y, r * 0.2, 0, 7); c.fill();
  }

  // القاطرة: المركز السفلي على السكة (0,0)، والوجهة نحو +x. dist للمسافة (لتدوير العجلات)، lights[] تُجمع فيها أماكن الإضاءة
  D.loco = (c, type, colId, dist, lights) => {
    const col = D.COL[colId] || colId, dk = D.shade(col, -0.35), lt = D.shade(col, 0.35);
    const win = "#bfdbfe";
    if (type === "steam") {
      c.fillStyle = "#1f2937"; c.fillRect(-72, -26, 146, 12);
      // الكابينة
      c.fillStyle = col; rr(c, -72, -92, 52, 70, 4); c.fill();
      c.fillStyle = dk; rr(c, -79, -101, 66, 11, 4); c.fill();
      c.fillStyle = win; rr(c, -62, -82, 30, 24, 4); c.fill();
      lights && lights.push({ x: -47, y: -70, r: 28 });
      // المرجل
      c.fillStyle = col; rr(c, -24, -72, 90, 48, 22); c.fill();
      c.fillStyle = lt; c.fillRect(-20, -66, 80, 7);
      c.fillStyle = dk; [-2, 24, 48].forEach((x) => c.fillRect(x, -72, 5, 48));
      c.fillStyle = "#334155"; c.beginPath(); c.arc(66, -48, 22, -Math.PI / 2, Math.PI / 2); c.fill();
      // المدخنة والقبة
      c.fillStyle = "#1f2937"; c.fillRect(40, -100, 15, 30); c.fillRect(36, -106, 23, 8);
      c.fillStyle = "#fbbf24"; c.beginPath(); c.arc(10, -72, 11, Math.PI, 0); c.fill();
      // المصباح
      c.fillStyle = "#fde68a"; c.beginPath(); c.arc(76, -60, 7, 0, 7); c.fill();
      c.fillStyle = "#1f2937"; c.beginPath(); c.moveTo(66, -22); c.lineTo(88, -6); c.lineTo(66, -6); c.fill();
      const a = dist / 17;
      [-46, -10, 26].forEach((x) => wheel(c, x, -17, 17, a, "#b91c1c"));
      wheel(c, 56, -10, 10, dist / 10);
      c.strokeStyle = "#e5e7eb"; c.lineWidth = 4; c.beginPath();
      c.moveTo(-46 + Math.cos(a) * 9, -17 + Math.sin(a) * 9); c.lineTo(26 + Math.cos(a) * 9, -17 + Math.sin(a) * 9); c.stroke();
      return { lamp: [76, -60] };
    }
    if (type === "electric") {
      c.strokeStyle = "#334155"; c.lineWidth = 3; c.beginPath();
      c.moveTo(-20, -94); c.lineTo(0, -122); c.lineTo(-24, -134); c.moveTo(-40, -134); c.lineTo(10, -134); c.stroke();
      c.fillStyle = "#1f2937"; c.fillRect(-74, -28, 148, 10);
      c.fillStyle = col; c.beginPath(); c.moveTo(-74, -94); c.lineTo(56, -94); c.quadraticCurveTo(78, -92, 78, -60); c.lineTo(78, -24); c.lineTo(-74, -24); c.closePath(); c.fill();
      c.fillStyle = "#e5e7eb"; c.fillRect(-74, -46, 152, 7);
      c.fillStyle = win; rr(c, 44, -86, 28, 26, 4); c.fill();
      [-62, -30, 2].forEach((x) => { rr(c, x, -84, 24, 22, 3); c.fill(); lights && lights.push({ x: x + 12, y: -73, r: 22 }); });
      c.fillStyle = dk; c.fillRect(-74, -98, 130, 5);
      c.fillStyle = "#fde68a"; c.beginPath(); c.arc(74, -34, 6, 0, 7); c.fill();
      [-52, -28, 28, 52].forEach((x) => wheel(c, x, -12, 11, dist / 11));
      return { lamp: [74, -34] };
    }
    if (type === "fast") {
      c.fillStyle = "#1f2937"; c.fillRect(-74, -24, 140, 8);
      c.fillStyle = "#f8fafc"; c.beginPath(); c.moveTo(-74, -86); c.lineTo(10, -86); c.bezierCurveTo(60, -86, 86, -50, 90, -22); c.lineTo(-74, -22); c.closePath(); c.fill();
      c.fillStyle = col; c.beginPath(); c.moveTo(-74, -48); c.lineTo(64, -48); c.quadraticCurveTo(84, -40, 90, -22); c.lineTo(-74, -22); c.closePath(); c.fill();
      c.fillStyle = "#1e293b"; c.beginPath(); c.moveTo(18, -80); c.bezierCurveTo(44, -80, 60, -68, 66, -60); c.lineTo(18, -60); c.closePath(); c.fill();
      c.fillStyle = win; [-64, -38, -12].forEach((x) => { rr(c, x, -78, 20, 16, 3); c.fill(); lights && lights.push({ x: x + 10, y: -70, r: 20 }); });
      c.fillStyle = dk; c.fillRect(-74, -56, 140, 4);
      c.fillStyle = "#fde68a"; c.beginPath(); c.arc(84, -30, 5, 0, 7); c.fill();
      [-54, -32, 26, 48].forEach((x) => wheel(c, x, -10, 9, dist / 9));
      return { lamp: [84, -30] };
    }
    // freight: قاطرة ديزل طويلة للبضائع
    c.fillStyle = "#1f2937"; c.fillRect(-76, -30, 152, 12);
    c.fillStyle = col; rr(c, -72, -72, 104, 44, 5); c.fill();
    c.fillStyle = dk; for (let x = -64; x < 26; x += 12) c.fillRect(x, -66, 6, 30);
    c.fillStyle = col; rr(c, 30, -98, 44, 70, 5); c.fill();
    c.fillStyle = dk; c.fillRect(26, -104, 52, 8);
    c.fillStyle = win; rr(c, 40, -90, 26, 22, 3); c.fill(); lights && lights.push({ x: 53, y: -79, r: 24 });
    c.fillStyle = "#facc15"; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-76 + k * 10, -30); c.lineTo(-70 + k * 10, -30); c.lineTo(-60 + k * 10, -18); c.lineTo(-66 + k * 10, -18); c.fill(); }
    c.fillStyle = "#1f2937"; c.fillRect(-40, -80, 12, 9);
    c.fillStyle = "#fde68a"; c.beginPath(); c.arc(72, -40, 6, 0, 7); c.fill();
    [-56, -36, 34, 54].forEach((x) => wheel(c, x, -12, 11, dist / 11));
    return { lamp: [72, -40] };
  };

  // الأشخاص والصناديق (حمولات ملونة)
  D.person = (c, x, y, col, s = 1) => {
    c.fillStyle = D.COL[col] || col; rr(c, x - 7 * s, y - 20 * s, 14 * s, 20 * s, 5 * s); c.fill();
    c.fillStyle = "#fcd9b6"; c.beginPath(); c.arc(x, y - 27 * s, 7 * s, 0, 7); c.fill();
    c.fillStyle = "#3f2a1d"; c.beginPath(); c.arc(x, y - 29 * s, 7 * s, Math.PI, 0); c.fill();
  };
  D.box = (c, x, y, col, s = 1) => {
    const k = D.COL[col] || col;
    c.fillStyle = k; c.fillRect(x - 15 * s, y - 28 * s, 30 * s, 28 * s);
    c.strokeStyle = D.shade(k, -0.35); c.lineWidth = 3 * s; c.strokeRect(x - 15 * s, y - 28 * s, 30 * s, 28 * s);
    c.beginPath(); c.moveTo(x - 15 * s, y - 14 * s); c.lineTo(x + 15 * s, y - 14 * s); c.moveTo(x, y - 28 * s); c.lineTo(x, y); c.stroke();
  };

  // العربة: kind = coach | cargo، والحمولة load = {k:'p'|'b', c:لون} أو لا شيء
  D.car = (c, colId, dist, lights, load, num) => {
    const col = D.COL[colId] || colId, dk = D.shade(col, -0.35);
    c.fillStyle = "#1f2937"; c.fillRect(-60, -26, 120, 8); c.fillRect(-68, -24, 10, 4); c.fillRect(58, -24, 10, 4);
    if (load && load.k === "b") {
      c.fillStyle = col; rr(c, -58, -48, 116, 24, 4); c.fill();
      c.fillStyle = dk; for (let x = -50; x < 56; x += 18) c.fillRect(x, -48, 4, 24);
      D.box(c, -22, -48, load.c, 1.15); D.box(c, 18, -48, load.c, 1.15);
    } else {
      c.fillStyle = col; rr(c, -58, -80, 116, 56, 7); c.fill();
      c.fillStyle = dk; rr(c, -62, -88, 124, 10, 5); c.fill();
      c.fillStyle = "#f8fafc"; c.fillRect(-58, -36, 116, 5);
      [-46, -18, 10, 38].forEach((x, i) => {
        c.fillStyle = "#bfdbfe"; rr(c, x - 4, -72, 22, 22, 4); c.fill();
        lights && lights.push({ x: x + 7, y: -61, r: 20 });
        if (load && load.k === "p" && i < 3) { c.save(); c.beginPath(); c.rect(x - 4, -72, 22, 22); c.clip(); D.person(c, x + 7, -46, load.c, 0.9); c.restore(); }
      });
      if (load && load.k === "p") { c.fillStyle = D.COL[load.c]; c.beginPath(); c.arc(0, -98, 9, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 3; c.stroke(); }
    }
    if (num) { c.fillStyle = "#fff"; c.beginPath(); c.arc(0, -36, 13, 0, 7); c.fill(); c.fillStyle = "#1e3a8a"; c.font = "bold 18px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(num, 0, -35); }
    [-42, -24, 24, 42].forEach((x) => wheel(c, x, -12, 10, dist / 10));
  };

  // صورة صغيرة للقاطرة على لوحة (للقوائم)
  D.thumb = (cv, type, col, n = 1, load) => {
    const c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height);
    const total = D.LEN.loco + n * (D.LEN.car + 12), s = Math.min(cv.width / (total + 30), cv.height / 150);
    c.save(); c.translate(cv.width / 2 + (total / 2 - D.LEN.loco / 2) * s, cv.height - 18 * s); c.scale(s, s);
    c.fillStyle = "#78716c"; c.fillRect(-total - 20, -4, total + 120, 6);
    for (let i = 0; i < n; i++) { c.save(); c.translate(-(D.LEN.loco / 2 + 12 + D.LEN.car / 2) - i * (D.LEN.car + 12), 0); D.car(c, load ? "#e2e8f0" : D.WAGON[i % D.WAGON.length], 0, null, load); c.restore(); }
    D.loco(c, type, col, 0, null);
    c.restore();
  };
  D.WAGON = ["#f59e0b", "#0ea5e9", "#10b981", "#f43f5e", "#8b5cf6", "#eab308", "#14b8a6", "#fb7185"];

  // ---------------------------------------------------------------- قطع «ابنِ السكة» (SVG من فوق)
  const SIDES = { N: [50, 0], E: [100, 50], S: [50, 100], W: [0, 50] };
  D.PIECES = { H: "EW", V: "NS", NE: "NE", ES: "ES", SW: "SW", WN: "WN", BH: "EW", BV: "NS" };
  function railPath(conn) {
    const [a, b] = [conn[0], conn[1]];
    if ((a === "E" && b === "W") || (a === "W" && b === "E")) return { kind: "s", d: "M0 50 L100 50" };
    if ((a === "N" && b === "S") || (a === "S" && b === "N")) return { kind: "s", d: "M50 0 L50 100" };
    const corner = { NE: [100, 0], ES: [100, 100], SW: [0, 100], WN: [0, 0] }[conn];
    return { kind: "c", corner };
  }
  D.pieceSvg = (piece, opts = {}) => {
    const conn = D.PIECES[piece], bridge = piece[0] === "B";
    let s = "";
    const rp = railPath(conn);
    if (bridge) s += `<rect x="${conn === "EW" ? 0 : 22}" y="${conn === "EW" ? 22 : 0}" width="${conn === "EW" ? 100 : 56}" height="${conn === "EW" ? 56 : 100}" fill="#a16207"/>` +
      (conn === "EW" ? `<rect x="0" y="20" width="100" height="6" fill="#713f12"/><rect x="0" y="74" width="100" height="6" fill="#713f12"/>` : `<rect x="20" y="0" width="6" height="100" fill="#713f12"/><rect x="74" y="0" width="6" height="100" fill="#713f12"/>`);
    const tie = opts.fixed ? "#57534e" : "#92400e", rail = opts.fixed ? "#334155" : "#64748b";
    if (rp.kind === "s") {
      const hz = conn === "EW";
      for (let i = 0; i < 5; i++) { const p = 10 + i * 20; s += hz ? `<rect x="${p - 4}" y="30" width="8" height="40" rx="2" fill="${tie}"/>` : `<rect x="30" y="${p - 4}" width="40" height="8" rx="2" fill="${tie}"/>`; }
      s += hz ? `<path d="M0 38 H100 M0 62 H100" stroke="${rail}" stroke-width="5"/>` : `<path d="M38 0 V100 M62 0 V100" stroke="${rail}" stroke-width="5"/>`;
    } else {
      const [cx, cy] = rp.corner;
      for (let i = 0; i < 5; i++) {
        const t = ((i + 0.5) / 5) * (Math.PI / 2);
        const sx = cx === 0 ? 1 : -1, sy = cy === 0 ? 1 : -1;
        const x1 = cx + sx * Math.cos(t) * 30, y1 = cy + sy * Math.sin(t) * 30, x2 = cx + sx * Math.cos(t) * 70, y2 = cy + sy * Math.sin(t) * 70;
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${tie}" stroke-width="8" stroke-linecap="round"/>`;
      }
      const arc = (r) => { const sx = cx === 0 ? 1 : -1, sy = cy === 0 ? 1 : -1; const p1 = [cx + sx * r, cy], p2 = [cx, cy + sy * r]; return `M${p1[0]} ${p1[1]} A${r} ${r} 0 0 ${sx * sy > 0 ? 1 : 0} ${p2[0]} ${p2[1]}`; };
      s += `<path d="${arc(38)} ${arc(62)}" stroke="${rail}" stroke-width="5" fill="none"/>`;
    }
    if (opts.fixed) s += `<circle cx="12" cy="12" r="5" fill="#334155"/><circle cx="88" cy="88" r="5" fill="#334155"/>`;
    return s;
  };
  D.tileSvg = (cell, piece, opts = {}) => {
    let bg = cell === "~" ? `<rect width="100" height="100" fill="#38bdf8"/><path d="M10 30 q10 -8 20 0 t20 0 M50 70 q10 -8 20 0 t20 0" stroke="#e0f2fe" stroke-width="4" fill="none"/>` : `<rect width="100" height="100" fill="#86efac"/><circle cx="20" cy="80" r="3" fill="#4ade80"/><circle cx="78" cy="22" r="3" fill="#4ade80"/>`;
    let fg = "";
    if (cell === "T") fg = `<rect x="44" y="55" width="12" height="30" fill="#92400e"/><circle cx="50" cy="42" r="28" fill="#16a34a"/><circle cx="40" cy="36" r="10" fill="#22c55e"/>`;
    else if (cell === "H") fg = `<rect x="22" y="44" width="56" height="42" fill="#fde68a"/><path d="M14 46 L50 16 L86 46 Z" fill="#dc2626"/><rect x="44" y="62" width="14" height="24" fill="#92400e"/><rect x="28" y="54" width="12" height="12" fill="#bfdbfe"/>`;
    else if (cell === "R") fg = `<path d="M18 80 Q20 40 46 34 Q74 30 84 60 Q88 82 70 84 Z" fill="#a8a29e"/><path d="M36 52 Q48 44 60 50" stroke="#78716c" stroke-width="4" fill="none"/>`;
    else if (cell === "E") fg = `<rect x="8" y="8" width="84" height="26" rx="6" fill="${opts.color || "#ef4444"}"/><rect x="12" y="34" width="76" height="16" fill="#e7e5e4"/><text x="50" y="27" font-size="18" text-anchor="middle" fill="#fff">🚉</text>` + (opts.exit ? D.pieceSvg(opts.exit === "N" || opts.exit === "S" ? "V" : "H", { fixed: true }) : "") + `<rect x="34" y="40" width="32" height="20" rx="4" fill="#facc15" stroke="#a16207" stroke-width="3"/>`;
    else if (cell === "S") fg = `<rect x="6" y="6" width="88" height="88" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="4"/>` + D.pieceSvg(opts.exit === "N" || opts.exit === "S" ? "V" : "H", { fixed: true });
    if (piece) fg += D.pieceSvg(piece, opts);
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${bg}${fg}</svg>`;
  };

  // قطار من فوق (لِـ «ابنِ السكة»): يتجه نحو +x
  D.topTrain = (c, colId, n) => {
    const col = D.COL[colId] || colId;
    for (let i = n; i >= 0; i--) {
      const x = -i * 44;
      c.fillStyle = "rgba(0,0,0,.2)"; rr(c, x - 18, -13, 40, 30, 6); c.fill();
      c.fillStyle = i === 0 ? col : D.WAGON[(i - 1) % D.WAGON.length]; rr(c, x - 20, -15, 40, 30, 6); c.fill();
      if (i === 0) { c.fillStyle = D.shade(col, -0.35); rr(c, x - 20, -15, 14, 30, 4); c.fill(); c.fillStyle = "#1f2937"; c.beginPath(); c.arc(x + 10, 0, 6, 0, 7); c.fill(); }
      else { c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(x - 14, -9, 28, 18); }
    }
  };
})();
