// رسومات SVG للأزهار (تعمل بدون إنترنت). كل رسم: زهرة وساق وأوراق في مربع 200×220.
(() => {
  "use strict";
  const S = (inner) => `<svg class="art" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  const G = "#22a447", GD = "#14532d";
  const f1 = (n) => n.toFixed(1);
  const stem = (d, w = 6, c = G) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const leaf = (x, y, ang, len = 52, w = 16, c = G) => `<g transform="translate(${x} ${y}) rotate(${ang})"><path d="M0 0 Q ${len / 2} ${-w} ${len} 0 Q ${len / 2} ${w} 0 0Z" fill="${c}" stroke="${GD}" stroke-width="2"/><path d="M4 0 L${len - 6} 0" stroke="${GD}" stroke-width="1.5" opacity=".6"/></g>`;
  const strap = (x, y, ang, len, w = 9, c = G) => `<g transform="translate(${x} ${y}) rotate(${ang})"><path d="M0 ${-w / 2} Q ${len * 0.6} ${-w} ${len} 0 Q ${len * 0.6} ${w} 0 ${w / 2}Z" fill="${c}" stroke="${GD}" stroke-width="1.6"/></g>`;
  // حلقة بتلات بيضاوية حول مركز
  const ring = (cx, cy, n, dist, rx, ry, fill, stroke, rot = 0, sw = 2) => Array.from({ length: n }, (_, i) =>
    `<ellipse cx="${cx}" cy="${f1(cy - dist)}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" transform="rotate(${f1(rot + (i * 360) / n)} ${cx} ${cy})"/>`).join("");
  // حلقة بتلات مدببة
  const pring = (cx, cy, n, len, w, fill, stroke, rot = 0, start = 0, sw = 2) => Array.from({ length: n }, (_, i) =>
    `<path d="M${cx} ${cy - start} Q ${cx - w} ${f1(cy - start - len * 0.5)} ${cx} ${cy - start - len} Q ${cx + w} ${f1(cy - start - len * 0.5)} ${cx} ${cy - start}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" transform="rotate(${f1(rot + (i * 360) / n)} ${cx} ${cy})"/>`).join("");
  // دائرة مسنّنة (حواف مهدّبة)
  const frilly = (cx, cy, r, n, depth, fill, stroke) => {
    let d = "";
    for (let i = 0; i <= n * 2; i++) {
      const a = (i * Math.PI) / n, rr = i % 2 ? r - depth : r;
      d += `${i ? "L" : "M"}${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))} `;
    }
    return `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
  };
  const dotsSpiral = (cx, cy, R, n, c, r = 1.8) => {
    let s = "";
    for (let i = 1; i <= n; i++) { const rr = R * Math.sqrt(i / n), a = i * 2.39996; s += `<circle cx="${f1(cx + rr * Math.cos(a))}" cy="${f1(cy + rr * Math.sin(a))}" r="${r}" fill="${c}"/>`; }
    return s;
  };
  const straight = (top = 112) => stem(`M100 216 C 98 180, 102 150, 100 ${top}`);

  const ART = {
    rose: () => S(`${stem("M100 216 C 104 176, 96 146, 100 116")}${leaf(100, 176, 205, 48, 15)}${leaf(100, 152, -25, 46, 14)}
      <path d="M78 112 Q 100 98 122 112 Q 112 126 100 122 Q 88 126 78 112Z" fill="${G}" stroke="${GD}" stroke-width="2"/>
      ${ring(100, 80, 5, 22, 27, 24, "#f43f5e", "#9f1239", 18, 2.5)}
      <circle cx="100" cy="80" r="27" fill="#e11d48" stroke="#9f1239" stroke-width="3"/>
      <path d="M96 80 a 5 5 0 1 1 8 3 a 11 11 0 1 1 -18 -8 a 17 17 0 1 1 28 14" stroke="#881337" stroke-width="3.2" fill="none" stroke-linecap="round"/>`),
    tulip: () => S(`${straight(110)}${strap(98, 214, -100, 96, 20)}${strap(102, 210, -78, 90, 18)}
      <path d="M68 58 Q 58 108 100 120 Q 88 80 84 40 Q 72 44 68 58Z" fill="#ef4444" stroke="#991b1b" stroke-width="2.5"/>
      <path d="M132 58 Q 142 108 100 120 Q 112 80 116 40 Q 128 44 132 58Z" fill="#ef4444" stroke="#991b1b" stroke-width="2.5"/>
      <path d="M100 36 Q 76 66 86 116 Q 100 122 114 116 Q 124 66 100 36Z" fill="#f87171" stroke="#991b1b" stroke-width="2.5"/>
      <path d="M100 50 Q 94 80 98 110" stroke="#fecaca" stroke-width="3" fill="none" opacity=".7"/>`),
    sunflower: () => S(`${stem("M100 216 C 98 180, 104 150, 100 120", 9)}${leaf(100, 178, 200, 58, 22)}${leaf(100, 152, -20, 56, 21)}
      ${pring(100, 76, 22, 50, 9, "#fbbf24", "#b45309", 8, 16)}${pring(100, 76, 22, 46, 9, "#facc15", "#ca8a04", 0, 16)}
      <circle cx="100" cy="76" r="27" fill="#78350f" stroke="#451a03" stroke-width="3"/>${dotsSpiral(100, 76, 24, 70, "#451a03", 1.7)}`),
    daisy: () => S(`${straight(112)}${leaf(100, 180, 205, 44, 12)}${leaf(100, 160, -25, 42, 11)}
      ${ring(100, 80, 16, 30, 7, 22, "#ffffff", "#a1a1aa", 0, 1.6)}<circle cx="100" cy="80" r="15" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>${dotsSpiral(100, 80, 12, 24, "#ca8a04", 1.2)}`),
    cosmos: () => S(`${stem("M100 216 C 96 176, 106 146, 100 112", 4)}${stem("M100 170 Q 80 160 70 140", 3)}${stem("M100 150 Q 124 140 132 124", 3)}
      ${ring(100, 80, 8, 26, 13, 25, "#f472b6", "#be185d", 22, 1.8)}<circle cx="100" cy="80" r="11" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>${dotsSpiral(100, 80, 9, 14, "#a16207", 1)}`),
    jasmine: () => {
      const star = (x, y, s) => `${ring(x, y, 5, 12 * s, 6 * s, 12 * s, "#fff", "#d4d4d8", 0, 1.4)}<circle cx="${x}" cy="${y}" r="${3.5 * s}" fill="#fde68a"/>`;
      return S(`${stem("M30 216 C 60 170, 150 170, 150 120 C 150 80, 80 90, 70 50", 4)}
        ${leaf(60, 186, -60, 30, 9)}${leaf(120, 168, 20, 30, 9)}${leaf(150, 130, 160, 30, 9)}${leaf(120, 92, 200, 28, 8)}${leaf(80, 76, -30, 28, 8)}
        ${star(70, 50, 1.6)}${star(132, 92, 1.4)}${star(150, 150, 1.3)}${star(96, 112, 1.1)}
        <ellipse cx="54" cy="40" rx="5" ry="10" fill="#fce7f3" stroke="#d4d4d8" transform="rotate(-30 54 40)"/><ellipse cx="160" cy="104" rx="4" ry="9" fill="#fce7f3" stroke="#d4d4d8" transform="rotate(30 160 104)"/>`);
    },
    lavender: () => {
      const spike = (x0, y0, x1, y1) => {
        let s = stem(`M${x0} ${y0} L${x1} ${y1}`, 3, "#65a30d");
        for (let k = 0; k < 9; k++) {
          const t = k / 9, x = x1 + (x0 - x1) * t * 0.45, y = y1 + (y0 - y1) * t * 0.45, r = 4 + t * 3;
          s += `<ellipse cx="${f1(x - r * 0.7)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * 0.8)}" fill="#8b5cf6"/><ellipse cx="${f1(x + r * 0.7)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * 0.8)}" fill="#a78bfa"/>`;
        }
        return s;
      };
      return S(`${spike(100, 210, 100, 30)}${spike(96, 210, 56, 48)}${spike(104, 210, 146, 46)}${spike(98, 210, 76, 38)}${spike(102, 210, 126, 36)}
        ${strap(100, 212, -150, 50, 7, "#84a98c")}${strap(100, 212, -30, 50, 7, "#84a98c")}${strap(100, 212, -120, 46, 6, "#84a98c")}${strap(100, 212, -60, 46, 6, "#84a98c")}`);
    },
    lily: () => {
      let spots = "";
      for (let i = 0; i < 6; i++) for (const d of [14, 22]) { const a = ((i * 60 + 4) * Math.PI) / 180; spots += `<circle cx="${f1(100 + d * Math.sin(a))}" cy="${f1(82 - d * Math.cos(a))}" r="1.8" fill="#7c2d12"/>`; }
      let st = "";
      for (let i = 0; i < 6; i++) { const a = ((i * 60 + 30) * Math.PI) / 180, x = 100 + 30 * Math.sin(a), y = 82 - 30 * Math.cos(a); st += `<line x1="100" y1="82" x2="${f1(x)}" y2="${f1(y)}" stroke="#bef264" stroke-width="2"/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="4" ry="2.4" fill="#7c2d12"/>`; }
      return S(`${straight(118)}${strap(100, 190, 200, 44, 8)}${strap(100, 170, -20, 44, 8)}${strap(100, 150, 205, 40, 7)}
        ${pring(100, 82, 6, 60, 17, "#fb923c", "#c2410c", 30)}${pring(100, 82, 6, 50, 14, "#fdba74", "#ea580c", 0)}${spots}${st}`);
    },
    daffodil: () => S(`${straight(112)}${strap(98, 214, -98, 100, 12)}${strap(102, 214, -80, 96, 12)}
      ${ring(100, 80, 6, 28, 15, 30, "#fde047", "#ca8a04", 0)}
      ${frilly(100, 80, 21, 14, 3, "#f59e0b", "#b45309")}<circle cx="100" cy="80" r="12" fill="#d97706" stroke="#b45309" stroke-width="2"/><circle cx="100" cy="80" r="4" fill="#fef3c7"/>`),
    hyacinth: () => {
      let fl = "";
      const rows = [[32, 2], [44, 3], [56, 4], [68, 4], [80, 5], [92, 5], [104, 5], [116, 4], [128, 3]];
      rows.forEach(([y, n], ri) => {
        const w = n * 16;
        for (let k = 0; k < n; k++) {
          const x = 100 - w / 2 + 8 + k * 16 + (ri % 2 ? 4 : -4);
          fl += `${pring(x, y, 6, 9, 4, ri % 2 ? "#818cf8" : "#6366f1", "#4338ca", k * 15, 2, 1)}<circle cx="${x}" cy="${y}" r="2" fill="#e0e7ff"/>`;
        }
      });
      return S(`${stem("M100 216 L100 30", 8)}${strap(98, 214, -110, 86, 14)}${strap(102, 214, -70, 86, 14)}${strap(100, 214, -92, 70, 12)}${fl}`);
    },
    carnation: () => S(`${stem("M100 216 C 98 180, 102 150, 100 112", 4, "#5b8c6e")}${strap(100, 180, 205, 46, 6, "#5b8c6e")}${strap(100, 160, -25, 46, 6, "#5b8c6e")}
      <path d="M90 116 L94 96 L106 96 L110 116 Z" fill="#5b8c6e" stroke="${GD}" stroke-width="2"/>
      ${frilly(100, 74, 42, 22, 7, "#ec4899", "#9d174d")}${frilly(100, 72, 30, 18, 6, "#f472b6", "#be185d")}${frilly(100, 70, 18, 12, 5, "#f9a8d4", "#db2777")}`),
    pansy: () => S(`${straight(118)}${leaf(100, 186, 200, 40, 16)}${leaf(100, 170, -20, 40, 16)}
      <circle cx="80" cy="60" r="28" fill="#7c3aed" stroke="#4c1d95" stroke-width="2.5"/><circle cx="120" cy="60" r="28" fill="#7c3aed" stroke="#4c1d95" stroke-width="2.5"/>
      <circle cx="70" cy="92" r="25" fill="#facc15" stroke="#a16207" stroke-width="2.5"/><circle cx="130" cy="92" r="25" fill="#facc15" stroke="#a16207" stroke-width="2.5"/>
      <circle cx="100" cy="110" r="29" fill="#facc15" stroke="#a16207" stroke-width="2.5"/>
      <ellipse cx="100" cy="100" rx="22" ry="17" fill="#3b0764"/><ellipse cx="76" cy="90" rx="10" ry="8" fill="#3b0764"/><ellipse cx="124" cy="90" rx="10" ry="8" fill="#3b0764"/>
      <circle cx="100" cy="88" r="5" fill="#fde047" stroke="#fff" stroke-width="1.5"/>`),
    dahlia: () => S(`${stem("M100 216 C 98 180, 102 150, 100 120", 7)}${leaf(100, 180, 205, 50, 16)}${leaf(100, 160, -25, 48, 15)}
      ${pring(100, 78, 16, 56, 12, "#db2777", "#9d174d", 0, 4)}${pring(100, 78, 14, 42, 11, "#ec4899", "#be185d", 12, 3)}${pring(100, 78, 12, 27, 9, "#f9a8d4", "#db2777", 4, 2)}
      <circle cx="100" cy="78" r="7" fill="#fde047" stroke="#ca8a04" stroke-width="1.5"/>`),
    marigold: () => {
      const fern = (x, y, ang) => { let s = `<g transform="translate(${x} ${y}) rotate(${ang})">${stem("M0 0 L46 0", 3)}`; for (let k = 8; k < 46; k += 8) s += `<ellipse cx="${k}" cy="-6" rx="4" ry="7" fill="${G}" transform="rotate(-30 ${k} -6)"/><ellipse cx="${k}" cy="6" rx="4" ry="7" fill="${G}" transform="rotate(30 ${k} 6)"/>`; return s + "</g>"; };
      return S(`${straight(116)}${fern(100, 180, 200)}${fern(100, 160, -20)}
        ${ring(100, 80, 12, 30, 15, 15, "#ea580c", "#9a3412", 0)}${ring(100, 80, 10, 19, 14, 14, "#f97316", "#c2410c", 15)}${ring(100, 80, 7, 9, 12, 12, "#fb923c", "#c2410c", 5)}
        <circle cx="100" cy="80" r="8" fill="#fdba74" stroke="#c2410c" stroke-width="1.5"/>`);
    },
    petunia: () => {
      let veins = "";
      for (let i = 0; i < 5; i++) { const a = ((i * 72 - 90) * Math.PI) / 180; veins += `<line x1="100" y1="80" x2="${f1(100 + 36 * Math.cos(a))}" y2="${f1(80 + 36 * Math.sin(a))}" stroke="#701a75" stroke-width="2.5" opacity=".75"/>`; }
      return S(`${straight(114)}${leaf(100, 180, 200, 40, 16)}${leaf(100, 160, -20, 40, 16)}${leaf(100, 140, 215, 34, 13)}
        ${ring(100, 80, 5, 22, 25, 25, "#c026d3", "#86198f", 36)}<circle cx="100" cy="80" r="26" fill="#c026d3"/>${veins}
        <circle cx="100" cy="80" r="9" fill="#fde68a" stroke="#701a75" stroke-width="2"/>`);
    },
    geranium: () => {
      let fl = "";
      const pos = [[100, 44], [78, 52], [122, 52], [64, 72], [136, 72], [88, 70], [112, 70], [100, 58], [76, 92], [124, 92], [100, 84], [92, 100], [110, 102]];
      for (const [x, y] of pos) fl += `${ring(x, y, 5, 7, 6, 7.5, "#ef4444", "#b91c1c", 0, 1.4)}<circle cx="${x}" cy="${y}" r="2.4" fill="#fecaca"/>`;
      const rl = (x, y) => `<circle cx="${x}" cy="${y}" r="24" fill="#4ade80" stroke="${GD}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="13" fill="none" stroke="#166534" stroke-width="5" opacity=".45"/>`;
      return S(`${stem("M100 216 C 100 170, 100 140, 100 104", 6)}${rl(62, 176)}${rl(140, 168)}${rl(96, 190)}${fl}`);
    },
    hydrangea: () => {
      let fl = "";
      const cols = ["#60a5fa", "#818cf8", "#a5b4fc", "#93c5fd"];
      let k = 0;
      for (let r = 0; r <= 48; r += 14) {
        const n = r ? Math.round((2 * Math.PI * r) / 16) : 1;
        for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI + r, x = 100 + r * Math.cos(a), y = 76 + r * Math.sin(a) * 0.9; fl += ring(f1(x), f1(y), 4, 6, 5.5, 7, cols[k++ % 4], "#3730a3", i * 20, 1.2); }
      }
      return S(`${stem("M100 216 C 100 180, 100 150, 100 120", 7)}${leaf(100, 176, 200, 60, 24)}${leaf(100, 160, -20, 58, 23)}${fl}`);
    },
    anemone: () => S(`${stem("M100 216 C 98 180, 102 150, 100 112", 5)}
      ${pring(100, 114, 7, 24, 7, G, GD, 180, 0, 1.5)}
      ${ring(100, 80, 6, 28, 22, 28, "#dc2626", "#991b1b", 0)}<circle cx="100" cy="80" r="17" fill="#fff"/><circle cx="100" cy="80" r="12" fill="#111827"/>
      ${ring(100, 80, 14, 16, 1.8, 1.8, "#111827", "#111827", 0, 1)}`),
    iris: () => S(`${stem("M100 216 L100 104", 6)}${strap(98, 214, -105, 120, 12)}${strap(102, 214, -75, 116, 12)}
      <path d="M100 96 Q 56 92 46 130 Q 70 128 100 104Z" fill="#7c3aed" stroke="#4c1d95" stroke-width="2.5"/>
      <path d="M100 96 Q 144 92 154 130 Q 130 128 100 104Z" fill="#7c3aed" stroke="#4c1d95" stroke-width="2.5"/>
      <path d="M100 98 Q 80 120 100 150 Q 120 120 100 98Z" fill="#6d28d9" stroke="#4c1d95" stroke-width="2.5"/>
      <path d="M100 104 L100 136" stroke="#facc15" stroke-width="5" stroke-linecap="round"/><path d="M80 106 L62 118 M120 106 L138 118" stroke="#facc15" stroke-width="4" stroke-linecap="round"/>
      <path d="M100 92 Q 72 60 86 28 Q 100 40 100 92Z" fill="#a78bfa" stroke="#5b21b6" stroke-width="2.5"/>
      <path d="M100 92 Q 128 60 114 28 Q 100 40 100 92Z" fill="#c4b5fd" stroke="#5b21b6" stroke-width="2.5"/>`),
    peony: () => S(`${stem("M100 216 C 98 180, 102 150, 100 120", 6)}${leaf(100, 176, 200, 50, 18)}${leaf(100, 156, -20, 48, 17)}${leaf(100, 140, 215, 40, 14)}
      ${ring(100, 80, 8, 30, 26, 24, "#f9a8d4", "#db2777", 0)}${ring(100, 80, 7, 18, 22, 20, "#fbcfe8", "#ec4899", 20)}${ring(100, 80, 5, 8, 16, 15, "#fce7f3", "#f472b6", 10)}
      <circle cx="100" cy="80" r="8" fill="#fdf2f8" stroke="#f472b6" stroke-width="1.5"/>`),
    snowdrop: () => {
      const bell = (x, y, s) => `<ellipse cx="${x}" cy="${y - 8 * s}" rx="${5 * s}" ry="${6 * s}" fill="#65a30d"/>
        <ellipse cx="${x - 9 * s}" cy="${y + 16 * s}" rx="${9 * s}" ry="${24 * s}" fill="#fff" stroke="#a1a1aa" stroke-width="1.6" transform="rotate(16 ${x} ${y})"/>
        <ellipse cx="${x + 9 * s}" cy="${y + 16 * s}" rx="${9 * s}" ry="${24 * s}" fill="#fff" stroke="#a1a1aa" stroke-width="1.6" transform="rotate(-16 ${x} ${y})"/>
        <ellipse cx="${x}" cy="${y + 20 * s}" rx="${9 * s}" ry="${24 * s}" fill="#fff" stroke="#a1a1aa" stroke-width="1.6"/>
        <path d="M${x - 4 * s} ${y + 38 * s} q ${4 * s} ${4 * s} ${8 * s} 0" stroke="#16a34a" stroke-width="${2.4 * s}" fill="none"/>`;
      return S(`${stem("M90 216 C 90 120, 104 56, 130 52", 4)}${stem("M96 216 C 96 160, 70 120, 58 120", 3.5)}
        ${strap(92, 216, -95, 90, 9, "#4d7c0f")}${strap(96, 216, -80, 80, 9, "#4d7c0f")}${bell(132, 62, 1.25)}${bell(56, 126, 0.9)}`);
    },
    crocus: () => {
      const cup = (x, y, s, c1, c2) => `${stem(`M${x} 216 L${x} ${y + 40 * s}`, 5 * s, "#f5f5f4")}
        <ellipse cx="${x - 13 * s}" cy="${y}" rx="${12 * s}" ry="${30 * s}" fill="${c2}" stroke="#4c1d95" stroke-width="2" transform="rotate(-12 ${x} ${y + 30 * s})"/>
        <ellipse cx="${x + 13 * s}" cy="${y}" rx="${12 * s}" ry="${30 * s}" fill="${c2}" stroke="#4c1d95" stroke-width="2" transform="rotate(12 ${x} ${y + 30 * s})"/>
        <path d="M${x} ${y - 32 * s} l ${-4 * s} ${-10 * s} M${x} ${y - 32 * s} l ${4 * s} ${-10 * s} M${x} ${y - 32 * s} l 0 ${-12 * s}" stroke="#f97316" stroke-width="${2.6 * s}" stroke-linecap="round"/>
        <ellipse cx="${x}" cy="${y + 2 * s}" rx="${13 * s}" ry="${32 * s}" fill="${c1}" stroke="#4c1d95" stroke-width="2"/>
        <path d="M${x} ${y - 22 * s} L${x} ${y + 26 * s}" stroke="#fff" stroke-width="${2 * s}" opacity=".6"/>`;
      let grass = "";
      for (const [x, a] of [[60, -100], [70, -80], [130, -100], [142, -78], [96, -94], [104, -86]]) grass += strap(x, 216, a, 70, 6, "#4d7c0f");
      return S(`${grass}${cup(64, 132, 1, "#8b5cf6", "#a78bfa")}${cup(138, 140, 0.9, "#facc15", "#fde047")}${cup(100, 102, 1.15, "#a855f7", "#c084fc")}`);
    },
    hibiscus: () => S(`${stem("M100 216 C 104 176, 96 150, 100 124", 7, "#166534")}${leaf(100, 178, 200, 54, 22, "#15803d")}${leaf(100, 158, -20, 52, 21, "#15803d")}
      ${ring(100, 82, 5, 30, 30, 34, "#f43f5e", "#9f1239", 0, 2.5)}
      <circle cx="100" cy="82" r="17" fill="#881337" opacity=".85"/>
      <path d="M100 82 L132 46" stroke="#fda4af" stroke-width="4" stroke-linecap="round"/>${ring(132, 46, 6, 5, 2.6, 2.6, "#facc15", "#ca8a04", 0, 1)}<circle cx="134" cy="44" r="3" fill="#dc2626"/>`),
    bougainvillea: () => {
      const cl = (x, y, s) => `${ring(x, y, 3, 12 * s, 13 * s, 15 * s, "#d946ef", "#a21caf", 0, 1.8)}<circle cx="${x}" cy="${y}" r="${4 * s}" fill="#fff"/>${ring(x, y, 3, 5 * s, 2 * s, 2 * s, "#fff", "#e5e7eb", 60, 1)}`;
      return S(`${stem("M100 216 C 90 170, 120 140, 100 100 C 84 70, 60 70, 40 60", 6, "#78350f")}${stem("M106 140 C 130 120, 150 110, 166 80", 5, "#78350f")}
        ${leaf(100, 180, 200, 34, 12)}${leaf(112, 150, -20, 32, 11)}${leaf(80, 76, 200, 30, 10)}${leaf(150, 104, -60, 30, 10)}
        ${cl(44, 54, 1.4)}${cl(96, 92, 1.5)}${cl(166, 70, 1.3)}${cl(130, 124, 1.1)}${cl(66, 120, 1)}`);
    },
  };
  window.FLOWER_ART = ART;
})();
