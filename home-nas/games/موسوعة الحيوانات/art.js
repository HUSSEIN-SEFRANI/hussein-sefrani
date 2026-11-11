// رسومات SVG للحيوانات التي ليس لها رمز تعبيري مناسب (تعمل بدون إنترنت)
(() => {
  "use strict";
  const S = (inner, vb = "0 0 200 200") => `<svg class="art" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  const SIDE = "6 44 194 120"; // الرسومات الجانبية: نقرّب الصورة
  let uid = 0;

  // ---------------------------------------------------------------- ضفادع (من الأمام)
  function frog(o) {
    const { body, dark, belly, iris, pupil = "round", feet = body, spots = [], spot = dark, bumps = false } = o;
    const eye = (x) => {
      const p = pupil === "round" ? `<circle cx="${x}" cy="60" r="7" fill="#111"/>`
        : pupil === "v" ? `<ellipse cx="${x}" cy="60" rx="3.5" ry="11" fill="#111"/>`
        : pupil === "h" ? `<ellipse cx="${x}" cy="60" rx="11" ry="4" fill="#111"/>` : "";
      return `<circle cx="${x}" cy="60" r="23" fill="${body}" stroke="${dark}" stroke-width="4"/><circle cx="${x}" cy="60" r="15.5" fill="${iris}"/>${p}<circle cx="${x - 5}" cy="54" r="4" fill="#fff" opacity=".9"/>`;
    };
    const dots = spots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${spot}"/>`).join("");
    const bump = bumps ? [[60, 92], [80, 80], [124, 82], [144, 94], [52, 128], [148, 130], [70, 150], [132, 152], [100, 76], [40, 112], [162, 112]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${dark}" opacity=".45"/>`).join("") : "";
    const foot = (x, y) => `<g fill="${feet}" stroke="${dark}" stroke-width="3"><circle cx="${x - 11}" cy="${y}" r="6"/><circle cx="${x}" cy="${y + 3}" r="6"/><circle cx="${x + 11}" cy="${y}" r="6"/></g>`;
    return S(`
      <ellipse cx="46" cy="160" rx="36" ry="19" fill="${body}" stroke="${dark}" stroke-width="4"/>
      <ellipse cx="154" cy="160" rx="36" ry="19" fill="${body}" stroke="${dark}" stroke-width="4"/>
      ${foot(22, 176)}${foot(178, 176)}
      <ellipse cx="100" cy="132" rx="62" ry="48" fill="${body}" stroke="${dark}" stroke-width="4"/>
      <ellipse cx="100" cy="146" rx="40" ry="30" fill="${belly}"/>
      <path d="M72 138 Q 66 162 62 176 M128 138 Q 134 162 138 176" stroke="${body}" stroke-width="15" stroke-linecap="round" fill="none"/>
      ${foot(62, 180)}${foot(138, 180)}
      <ellipse cx="100" cy="94" rx="68" ry="42" fill="${body}" stroke="${dark}" stroke-width="4"/>
      ${dots}${bump}
      ${eye(62)}${eye(138)}
      <path d="M58 106 Q 100 130 142 106" stroke="${dark}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="92" cy="88" r="2.5" fill="${dark}"/><circle cx="108" cy="88" r="2.5" fill="${dark}"/>`);
  }

  // ---------------------------------------------------------------- سمندلات (من الجانب): سلسلة دوائر على خط منحنٍ
  function chain(o) {
    const { body, dark, belly, flat = 1, head = 20, mid = 21, len = 1 } = o;
    const pts = [];
    for (let x = 34; x <= 194; x += 3) {
      const t = (x - 34) / 160;
      let r = t < 0.12 ? head : t < 0.2 ? head - 3 : t < 0.55 ? mid : mid * Math.max(0.08, 1 - (t - 0.55) / 0.47);
      const y = 104 + Math.sin(t * Math.PI * 1.6 + 0.3) * 7 * len;
      pts.push([x, y, Math.max(2, r)]);
    }
    const el = (p, extra) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${p[2] * 1.05}" ry="${p[2] * flat}" ${extra}/>`;
    const outline = pts.map((p) => el(p, `fill="${dark}" stroke="${dark}" stroke-width="8"`)).join("");
    const fill = pts.map((p) => el(p, `fill="${body}"`)).join("");
    const bel = belly ? `<path d="M48 ${116} Q 100 ${104 + 21 * flat + 4} 150 ${112}" stroke="${belly}" stroke-width="${7 * flat}" fill="none" stroke-linecap="round" opacity=".95"/>` : "";
    return { pts, svg: `<g>${outline}</g><g>${fill}</g>${bel}` };
  }
  function legs(c, dark, x1 = 68, x2 = 128) {
    const leg = (x, back) => `<path d="M${x} 112 q ${back ? 10 : -6} 18 ${back ? 2 : -12} 30" stroke="${c}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <g fill="${c}" stroke="${dark}" stroke-width="2"><circle cx="${x + (back ? 2 : -12) - 7}" cy="146" r="4"/><circle cx="${x + (back ? 2 : -12)}" cy="148" r="4"/><circle cx="${x + (back ? 2 : -12) + 7}" cy="146" r="4"/></g>`;
    return `<g opacity=".55">${leg(x1 + 10, false)}${leg(x2 + 10, true)}</g>${leg(x1, false)}${leg(x2, true)}`;
  }
  const faceSide = (dark, eye = "#111", y = 96) => `<circle cx="40" cy="${y}" r="6" fill="${eye}"/><circle cx="38" cy="${y - 2}" r="2" fill="#fff"/>
    <path d="M18 ${y + 10} Q 30 ${y + 16} 46 ${y + 12}" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

  function salamander() {
    const c = chain({ body: "#1c1917", dark: "#0c0a09" });
    const spots = [[44, 92, 6], [60, 98, 7], [84, 92, 8], [104, 112, 7], [118, 94, 8], [140, 108, 6], [156, 98, 5], [172, 104, 4], [70, 114, 5]]
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.3}" ry="${r}" fill="#facc15"/>`).join("");
    return S(`${legs("#1c1917", "#0c0a09")}${c.svg}${spots}${faceSide("#facc15", "#111", 95)}`, SIDE);
  }
  function newt() {
    const c = chain({ body: "#57534e", dark: "#292524", belly: "#f97316", mid: 17, head: 16 });
    // عُرف متعرّج فوق الظهر يتبع شكل الجسم
    const top = c.pts.filter((p) => p[0] >= 60 && p[0] <= 186);
    let crest = `M${top[0][0]} ${top[0][1] - top[0][2] + 4}`;
    top.forEach((p, i) => { if (i % 3 === 0) crest += ` L${p[0]} ${p[1] - p[2] - (i % 6 ? 3 : 13 - i / 8)}`; });
    const last = top[top.length - 1];
    crest += ` L${last[0]} ${last[1] - last[2] + 3} Z`;
    const dots = [[70, 96], [90, 100], [112, 98], [132, 102], [150, 100], [96, 112], [120, 113]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#1c1917"/>`).join("");
    return S(`<path d="${crest}" fill="#44403c" stroke="#292524" stroke-width="3" stroke-linejoin="round"/>${legs("#57534e", "#292524")}${c.svg}${dots}${faceSide("#292524", "#facc15", 97)}`, SIDE);
  }
  function giant() {
    const c = chain({ body: "#78716c", dark: "#44403c", flat: 0.72, head: 23, mid: 24, len: 0.5 });
    const blot = [[56, 100], [76, 108], [98, 98], [118, 106], [138, 100], [160, 104], [88, 112], [130, 110]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4" fill="#44403c" opacity=".55"/>`).join("");
    const wr = `<path d="M50 118 q 6 -4 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0" stroke="#57534e" stroke-width="3" fill="none"/>`;
    return S(`${legs("#78716c", "#44403c", 66, 132)}${c.svg}${blot}${wr}<circle cx="36" cy="98" r="3.4" fill="#111"/><path d="M14 108 Q 30 114 50 108" stroke="#44403c" stroke-width="3" fill="none"/>`, SIDE);
  }
  function axolotl() {
    const c = chain({ body: "#f9a8d4", dark: "#db2777", mid: 17, head: 23 });
    const g = (x, y, a) => {
      const r = (d) => (d * Math.PI) / 180, ex = x + Math.cos(r(a)) * 30, ey = y + Math.sin(r(a)) * 30;
      let s = `<path d="M${x} ${y} L${ex} ${ey}" stroke="#be185d" stroke-width="5" stroke-linecap="round"/>`;
      for (let k = 1; k <= 4; k++) {
        const px = x + ((ex - x) * k) / 4.4, py = y + ((ey - y) * k) / 4.4;
        s += `<circle cx="${px + Math.cos(r(a + 90)) * 5}" cy="${py + Math.sin(r(a + 90)) * 5}" r="4" fill="#ec4899"/><circle cx="${px - Math.cos(r(a + 90)) * 5}" cy="${py - Math.sin(r(a + 90)) * 5}" r="4" fill="#ec4899"/>`;
      }
      return s;
    };
    const fin = `<path d="M96 84 Q 150 70 196 102 Q 150 96 100 92 Z" fill="#fbcfe8" opacity=".9"/><path d="M110 122 Q 160 128 196 104 Q 160 118 112 116 Z" fill="#fbcfe8" opacity=".9"/>`;
    return S(`${fin}${legs("#f9a8d4", "#db2777")}${c.svg}${g(56, 88, -120)}${g(60, 90, -90)}${g(64, 94, -60)}
      <circle cx="38" cy="96" r="5" fill="#111"/><circle cx="36.5" cy="94.5" r="1.8" fill="#fff"/>
      <path d="M16 106 Q 34 120 52 108" stroke="#be185d" stroke-width="3.5" fill="none" stroke-linecap="round"/>`, "6 30 194 134");
  }
  function caecilian() {
    const d = "M30 70 C 70 20, 110 60, 100 100 C 90 140, 130 180, 175 140";
    return S(`<path d="${d}" stroke="#334155" stroke-width="34" fill="none" stroke-linecap="round"/>
      <path d="${d}" stroke="#64748b" stroke-width="27" fill="none" stroke-linecap="round"/>
      <path d="${d}" stroke="#475569" stroke-width="27" fill="none" stroke-dasharray="3 11" stroke-dashoffset="-14"/>
      <circle cx="28" cy="64" r="3.2" fill="#0f172a"/><circle cx="22" cy="74" r="1.6" fill="#0f172a"/>`);
  }

  // ---------------------------------------------------------------- البحر
  function clown() {
    const id = "cf" + ++uid;
    const body = "M28 100 C 38 52, 118 48, 150 86 L 186 58 Q 174 100 186 142 L 150 114 C 118 152, 38 148, 28 100 Z";
    const band = (x) => `<path d="M${x} 30 q -16 70 0 140" stroke="#111" stroke-width="26" fill="none"/><path d="M${x} 30 q -16 70 0 140" stroke="#fff" stroke-width="17" fill="none"/>`;
    return S(`<defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
      <path d="M66 62 C 80 26, 122 30, 132 70 Z" fill="#f97316" stroke="#111" stroke-width="4"/>
      <path d="M82 138 C 92 168, 118 162, 122 132 Z" fill="#f97316" stroke="#111" stroke-width="4"/>
      <path d="${body}" fill="#fb7c1a"/>
      <g clip-path="url(#${id})">${band(62)}${band(110)}${band(168)}</g>
      <path d="${body}" fill="none" stroke="#111" stroke-width="5"/>
      <ellipse cx="80" cy="110" rx="13" ry="7" fill="#fdba74" stroke="#111" stroke-width="3" transform="rotate(28 80 110)"/>
      <circle cx="44" cy="92" r="8.5" fill="#fff"/><circle cx="42" cy="92" r="5" fill="#111"/>
      <path d="M30 108 Q 36 112 42 109" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  }
  function star() {
    let d = "";
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5, b = a + Math.PI / 5;
      d += `${i ? "L" : "M"}${(100 + 78 * Math.cos(a)).toFixed(1)},${(104 + 78 * Math.sin(a)).toFixed(1)} L${(100 + 30 * Math.cos(b)).toFixed(1)},${(104 + 30 * Math.sin(b)).toFixed(1)} `;
    }
    let dots = "";
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      for (const k of [26, 42, 58]) dots += `<circle cx="${(100 + k * Math.cos(a)).toFixed(1)}" cy="${(104 + k * Math.sin(a)).toFixed(1)}" r="${k === 58 ? 3.5 : 4.5}" fill="#fed7aa"/>`;
    }
    return S(`<path d="${d}Z" fill="#c2410c" stroke="#c2410c" stroke-width="26" stroke-linejoin="round"/>
      <path d="${d}Z" fill="#f97316" stroke="#f97316" stroke-width="16" stroke-linejoin="round"/>${dots}<circle cx="100" cy="104" r="9" fill="#fdba74"/>`);
  }
  function jelly() {
    let frill = "M36 104";
    for (let x = 36; x < 164; x += 16) frill += ` Q ${x + 8} 118 ${x + 16} 104`;
    const t = (x, w) => `<path d="M${x} 108 q ${w} 20 0 40 t 0 40" stroke="#e879f9" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>`;
    return S(`${t(58, 10)}${t(82, -12)}${t(106, 12)}${t(130, -10)}${t(150, 9)}
      <path d="M36 104 Q 36 30 100 28 Q 164 30 164 104 Z" fill="#f0abfc" stroke="#c026d3" stroke-width="4" opacity=".92"/>
      <path d="${frill}" fill="#f5d0fe" stroke="#c026d3" stroke-width="4"/>
      <ellipse cx="78" cy="56" rx="16" ry="9" fill="#fff" opacity=".55"/>
      <circle cx="84" cy="76" r="5" fill="#701a75"/><circle cx="116" cy="76" r="5" fill="#701a75"/>
      <path d="M90 88 Q 100 96 110 88" stroke="#701a75" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
  }

  window.ART = {
    frog: () => frog({ body: "#65a30d", dark: "#365314", belly: "#ecfccb", iris: "#facc15", spots: [[70, 120, 6], [132, 124, 7], [100, 160, 5], [56, 150, 5]], spot: "#3f6212" }),
    toad: () => frog({ body: "#a16207", dark: "#713f12", belly: "#fef3c7", iris: "#f59e0b", pupil: "h", bumps: true }),
    treefrog: () => frog({ body: "#4ade80", dark: "#166534", belly: "#fefce8", iris: "#ef4444", pupil: "v", feet: "#fb923c" }),
    dartfrog: () => frog({ body: "#2563eb", dark: "#172554", belly: "#1d4ed8", iris: "#0f172a", pupil: "none", spot: "#0f172a",
      spots: [[64, 96, 7], [90, 78, 6], [118, 82, 8], [140, 100, 6], [80, 112, 5], [124, 114, 6], [60, 136, 8], [140, 140, 7], [98, 168, 6], [44, 158, 6], [158, 160, 6]] }),
    salamander, newt, giant, axolotl, caecilian, clown, star, jelly,
  };
})();
