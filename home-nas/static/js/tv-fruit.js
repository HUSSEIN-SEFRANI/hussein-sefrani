// HOME ANAB — ثيمات الفاكهة للتلفاز: الدالية في أعلى الشاشة، والشخصية في شاشة الأطفال
let uid = 0;
const nid = (p) => `${p}${++uid}`;

export const THEMES = {
  grape: { name: "العنب", emoji: "🍇", shades: ["#e9d5ff", "#a855f7", "#581c87"], glow: "rgba(168,85,247,.42)", accent: "#a855f7", leaf: "vine" },
  apple: { name: "التفاح", emoji: "🍎", shades: ["#fecaca", "#ef4444", "#991b1b"], glow: "rgba(239,68,68,.38)", accent: "#ef4444", leaf: "oval" },
  orange: { name: "البرتقال", emoji: "🍊", shades: ["#fed7aa", "#f97316", "#c2410c"], glow: "rgba(249,115,22,.38)", accent: "#f97316", leaf: "oval" },
  strawberry: { name: "الفراولة", emoji: "🍓", shades: ["#fecdd3", "#e11d48", "#9f1239"], glow: "rgba(225,29,72,.38)", accent: "#e11d48", leaf: "oval" },
  lemon: { name: "الليمون", emoji: "🍋", shades: ["#fef9c3", "#facc15", "#ca8a04"], glow: "rgba(250,204,21,.35)", accent: "#eab308", leaf: "oval" },
  watermelon: { name: "البطيخ", emoji: "🍉", shades: ["#fecdd3", "#f43f5e", "#be123c"], glow: "rgba(34,197,94,.38)", accent: "#22c55e", leaf: "oval" },
};
export const themeOf = (k) => THEMES[k] || THEMES.grape;

// ---------------------------------------------------------------- أشكال
function vineLeaf(scale) {
  const lobes = [[-112, .62], [-56, .86], [0, 1], [56, .86], [112, .62]], R = 26 * scale;
  const P = (ang, k) => { const a = (ang - 90) * Math.PI / 180; return `${(k * R * Math.cos(a)).toFixed(1)} ${(k * R * Math.sin(a)).toFixed(1)}`; };
  let d = "M0 0";
  lobes.forEach(([a, k], i) => {
    const prev = i ? (lobes[i - 1][0] + a) / 2 : a - 28;
    d += ` Q ${P(prev, i ? .45 : .2)} ${P(prev, i ? .52 : .28)} Q ${P(a - 14, k * .95)} ${P(a, k)}`;
  });
  d += ` Q ${P(140, .3)} 0 0 Z`;
  const veins = lobes.map(([a, k]) => `M0 0 L ${P(a, k * .8)}`).join(" ");
  return `<path d="${d}" fill="url(#LEAF)" stroke="#166534" stroke-width="1.4" stroke-linejoin="round"/><path d="${veins}" stroke="#166534" stroke-width="1.2" fill="none" opacity=".7"/>`;
}
function ovalLeaf(scale) {
  const s = scale;
  return `<path d="M0 0 C ${10 * s} ${-16 * s} ${36 * s} ${-16 * s} ${48 * s} 0 C ${36 * s} ${16 * s} ${10 * s} ${16 * s} 0 0 Z" fill="url(#LEAF)" stroke="#166534" stroke-width="1.3"/>
    <path d="M0 0 L ${44 * s} 0" stroke="#166534" stroke-width="1.2" opacity=".7"/>`;
}
const leaf = (t, scale) => (t.leaf === "vine" ? vineLeaf(scale) : ovalLeaf(scale * 0.9));

// ثمرة واحدة؛ (0,0) نقطة التعليق، والثمرة تتدلّى إلى الأسفل. s = الحجم
function fruit(key, s, G) {
  const g = (i) => `url(#${G}${i % 3})`;
  if (key === "grape") {
    const rows = [4, 5, 4, 3, 2, 1], r = 10 * s;
    let out = "", i = 0;
    rows.forEach((n, row) => {
      for (let k = 0; k < n; k++) {
        const x = (k - (n - 1) / 2) * r * 1.85, y = r + row * r * 1.55;
        out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${g(i * 7)}"/><ellipse cx="${(x - r * .3).toFixed(1)}" cy="${(y - r * .35).toFixed(1)}" rx="${r * .26}" ry="${r * .19}" fill="#fff" opacity=".55"/>`;
        i++;
      }
    });
    return out;
  }
  if (key === "apple" || key === "orange") {
    const r = 24 * s;
    return `<circle cx="0" cy="${r + 4 * s}" r="${r}" fill="${g(0)}"/>
      ${key === "apple" ? `<path d="M${-r * .35} ${5 * s} Q 0 ${12 * s} ${r * .35} ${5 * s}" stroke="${"#7f1d1d"}" stroke-width="${2 * s}" fill="none" opacity=".35"/>` :
        Array.from({ length: 6 }, (_, k) => `<circle cx="${(Math.cos(k) * r * .55).toFixed(1)}" cy="${(r + 4 * s + Math.sin(k * 1.7) * r * .5).toFixed(1)}" r="${s}" fill="#9a3412" opacity=".35"/>`).join("")}
      <ellipse cx="${-r * .35}" cy="${r * .7}" rx="${r * .28}" ry="${r * .18}" fill="#fff" opacity=".55"/>`;
  }
  if (key === "lemon") {
    const rx = 21 * s, ry = 27 * s;
    return `<path d="M0 ${2 * s} C ${rx} ${6 * s} ${rx} ${2 * ry} 0 ${2 * ry + 6 * s} C ${-rx} ${2 * ry} ${-rx} ${6 * s} 0 ${2 * s} Z" fill="${g(0)}"/>
      <ellipse cx="${-rx * .35}" cy="${ry * .7}" rx="${rx * .25}" ry="${ry * .2}" fill="#fff" opacity=".55"/>`;
  }
  if (key === "strawberry") {
    const w = 26 * s, h = 52 * s;
    const seeds = [[-.4, .35], [0, .3], [.4, .35], [-.25, .55], [.2, .55], [0, .75], [-.5, .5], [.5, .5]]
      .map(([a, b]) => `<ellipse cx="${(a * w).toFixed(1)}" cy="${(b * h + 6 * s).toFixed(1)}" rx="${1.6 * s}" ry="${2.4 * s}" fill="#fde68a"/>`).join("");
    return `<path d="M0 ${6 * s} C ${w * 1.1} ${4 * s} ${w * .9} ${h * .6} 0 ${h} C ${-w * .9} ${h * .6} ${-w * 1.1} ${4 * s} 0 ${6 * s} Z" fill="${g(0)}"/>${seeds}
      <path d="M0 ${4 * s} L ${-12 * s} ${12 * s} L ${-5 * s} ${9 * s} L 0 ${15 * s} L ${5 * s} ${9 * s} L ${12 * s} ${12 * s} Z" fill="#16a34a"/>`;
  }
  // البطيخ: شريحة
  const r = 30 * s;
  const seeds = [-.5, -.2, .15, .45].map((a, k) => `<ellipse cx="${(a * r).toFixed(1)}" cy="${(r * (.35 + (k % 2) * .2)).toFixed(1)}" rx="${1.8 * s}" ry="${3 * s}" fill="#111827"/>`).join("");
  return `<path d="M${-r} ${4 * s} A ${r} ${r} 0 0 0 ${r} ${4 * s} Z" fill="#15803d"/><path d="M${-r + 5 * s} ${4 * s} A ${r - 5 * s} ${r - 5 * s} 0 0 0 ${r - 5 * s} ${4 * s} Z" fill="#bbf7d0"/>
    <path d="M${-r + 8 * s} ${4 * s} A ${r - 8 * s} ${r - 8 * s} 0 0 0 ${r - 8 * s} ${4 * s} Z" fill="${g(0)}"/>${seeds}`;
}

function defs(t, G) {
  const [a, b, c] = t.shades;
  const shades = [[a, b, c], [a, b, c].map((x, i) => (i === 1 ? x : x)), [a, b, c]];
  return `<defs>${shades.map((s, i) => `<radialGradient id="${G}${i}" cx="${30 + i * 5}%" cy="28%" r="78%"><stop offset="0" stop-color="${s[0]}"/><stop offset="${.5 + i * .06}" stop-color="${s[1]}"/><stop offset="1" stop-color="${s[2]}"/></radialGradient>`).join("")}
    <linearGradient id="LEAF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#15803d"/></linearGradient>
    <linearGradient id="BR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a16207"/><stop offset="1" stop-color="#57300d"/></linearGradient></defs>`;
}

// ---------------------------------------------------------------- الدالية: غصن في أعلى الشاشة (1280×200)، الثمار في الوسط فقط
export function vine(key = "grape", { hang = [430, 560, 705, 845] } = {}) {
  const t = themeOf(key), G = nid("fr");
  const y = (x) => 16 + 9 * Math.sin(x / 120) + 5 * Math.sin(x / 47);
  let pts = "";
  for (let x = -20; x <= 1300; x += 20) pts += `${pts ? " L" : "M"} ${x} ${y(x).toFixed(1)}`;
  const branch = `<path d="${pts}" stroke="url(#BR)" stroke-width="11" fill="none" stroke-linecap="round"/><path d="${pts}" stroke="#ca8a04" stroke-width="2" fill="none" opacity=".35" transform="translate(0 -2)"/>`;
  let leaves = "";
  for (let x = 30, i = 0; x < 1280; x += 70, i++) {
    const up = i % 2 === 0, sc = .85 + ((i * 37) % 10) / 25, rot = up ? 200 + ((i * 23) % 40) : -20 + ((i * 31) % 40);
    leaves += `<g transform="translate(${x} ${y(x).toFixed(1)}) rotate(${rot})">${leaf(t, sc)}</g>`;
  }
  const tendrils = [120, 340, 980, 1180].map((x) => `<path d="M${x} ${y(x).toFixed(1)} c 8 14 -6 26 6 34 c 10 6 14 -6 6 -8" stroke="#16a34a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join("");
  const fruits = hang.map((x, i) => {
    const s = i % 2 ? .82 : 1.05, len = 14 + (i % 2) * 10;
    return `<g class="sway" style="transform-origin:${x}px ${y(x).toFixed(0)}px;animation-delay:${-i * 1.3}s">
      <path d="M${x} ${y(x).toFixed(1)} q 4 ${len / 2} 0 ${len}" stroke="#78350f" stroke-width="3" fill="none"/>
      <g transform="translate(${x} ${(y(x) + len).toFixed(1)})">${fruit(key, s, G)}</g></g>`;
  }).join("");
  return `<svg class="vine" viewBox="0 0 1280 200" width="1280" height="200" aria-hidden="true">${defs(t, G)}${branch}${tendrils}${fruits}${leaves}</svg>`;
}

// ---------------------------------------------------------------- شخصية الأطفال: ثمرة بوجه مبتسم
export function mascot(key = "grape", size = 150) {
  const t = themeOf(key), G = nid("fm");
  const body = key === "grape" ? fruit("grape", 1.55, G) : fruit(key, key === "strawberry" ? 2.6 : key === "watermelon" ? 2.4 : 2.7, G);
  const cy = key === "grape" ? 58 : key === "watermelon" ? 36 : 66;
  return `<svg width="${size}" height="${size}" viewBox="-80 -30 160 170" aria-hidden="true">${defs(t, G)}
    <path d="M0 -18 q 6 -8 0 -16" stroke="#78350f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g transform="translate(-14 -24) rotate(-25)">${leaf(t, 1.1)}</g>
    <g transform="translate(0 -12)">${body}</g>
    <g transform="translate(0 ${cy})"><ellipse cx="-17" cy="0" rx="9" ry="11" fill="#fff"/><ellipse cx="17" cy="0" rx="9" ry="11" fill="#fff"/>
      <circle cx="-15" cy="2" r="5" fill="#1f2937"/><circle cx="19" cy="2" r="5" fill="#1f2937"/><circle cx="-13" cy="0" r="1.8" fill="#fff"/><circle cx="21" cy="0" r="1.8" fill="#fff"/>
      <path d="M-14 18 Q 0 30 14 18" stroke="#1f2937" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="-28" cy="14" r="6" fill="#fda4af" opacity=".8"/><circle cx="28" cy="14" r="6" fill="#fda4af" opacity=".8"/></g></svg>`;
}

export const LOGO = (h = 44) => `<img src="/static/img/logo-dark.svg" alt="HOME ANAB" style="height:${h}px;display:block">`;
export const GRAPE = (h = 50) => `<img src="/static/img/grape.svg" alt="" style="height:${h}px;display:block">`;
