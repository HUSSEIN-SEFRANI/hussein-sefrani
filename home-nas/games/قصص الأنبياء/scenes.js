// قصص الأنبياء — رسوم المناظر (SVG). مناظر طبيعية وأشياء فقط: لا أشخاص ولا وجوه ولا هيئات.
// SCENE("day desert palm well") => <svg>…</svg>
(() => {
  "use strict";
  let uid = 0;
  const star = (x, y, r, c = "#fde68a") => {
    let d = "";
    for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; d += (i ? "L" : "M") + (x + rr * Math.cos(a)).toFixed(1) + " " + (y + rr * Math.sin(a)).toFixed(1); }
    return `<path d="${d}Z" fill="${c}"/>`;
  };
  const palm = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-6 0 C-2 -60 8 -110 0 -170 L10 -170 C18 -110 8 -60 8 0Z" fill="#92400e"/>
    <path d="M-4 -40h12M-3 -80h12M-1 -120h11" stroke="#78350f" stroke-width="3"/>
    <g fill="#16a34a"><path d="M5 -170 C-40 -200 -80 -180 -95 -150 C-60 -175 -30 -175 5 -165Z"/><path d="M5 -170 C50 -200 90 -180 105 -150 C70 -175 40 -175 5 -165Z"/>
    <path d="M5 -170 C-30 -215 -60 -225 -75 -215 C-40 -205 -15 -190 5 -168Z" fill="#22c55e"/><path d="M5 -170 C40 -215 70 -225 85 -215 C50 -205 25 -190 5 -168Z" fill="#22c55e"/>
    <path d="M5 -172 C0 -210 10 -235 20 -240 C12 -215 12 -195 8 -170Z" fill="#15803d"/></g></g>`;
  const tree = (x, y, s = 1, fruit) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-9" y="-70" width="18" height="70" rx="5" fill="#92400e"/>
    <circle cx="0" cy="-105" r="55" fill="#22c55e"/><circle cx="-35" cy="-80" r="35" fill="#16a34a"/><circle cx="35" cy="-82" r="35" fill="#16a34a"/><circle cx="10" cy="-130" r="30" fill="#4ade80"/>
    ${fruit ? [[-20, -110], [22, -95], [-40, -75], [35, -125], [5, -70], [-5, -140]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="8" fill="#ef4444"/>`).join("") : ""}</g>`;
  const house = (x, y, w, h, c) => `<g><rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${c}" rx="3"/><rect x="${x + w * 0.35}" y="${y - h * 0.5}" width="${w * 0.3}" height="${h * 0.5}" fill="#78350f" rx="${w * 0.15}"/>
    <rect x="${x + w * 0.12}" y="${y - h * 0.8}" width="${w * 0.15}" height="${w * 0.15}" fill="#fef3c7"/></g>`;
  const flower = (x, y, c) => `<g><path d="M${x} ${y}v-18" stroke="#15803d" stroke-width="3"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${x + 6 * Math.cos(a * Math.PI / 180)}" cy="${y - 20 + 6 * Math.sin(a * Math.PI / 180)}" r="5" fill="${c}"/>`).join("")}<circle cx="${x}" cy="${y - 20}" r="4" fill="#fde047"/></g>`;
  const bird = (x, y, s = 1) => `<path d="M${x - 14 * s} ${y} q${7 * s} ${-9 * s} ${14 * s} 0 q${7 * s} ${-9 * s} ${14 * s} 0" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>`;
  const ant = (x, y) => `<g fill="#3f2a1d"><ellipse cx="${x}" cy="${y}" rx="6" ry="5"/><ellipse cx="${x + 10}" cy="${y - 1}" rx="5" ry="4"/><circle cx="${x + 18}" cy="${y - 3}" r="4"/>
    <path d="M${x} ${y}l-5 8M${x + 5} ${y}l0 9M${x + 10} ${y}l4 8M${x + 20} ${y - 6}l5 -7" stroke="#3f2a1d" stroke-width="1.6"/></g>`;
  const waves = (y, c, a = 14) => { let d = `M0 ${y}`; for (let x = 0; x <= 800; x += 50) d += ` q25 ${-a} 50 0`; return `<path d="${d} V450 H0Z" fill="${c}"/>`; };

  const MOON = (g) => `<mask id="${g}m"><rect width="800" height="450" fill="#fff"/><circle cx="690" cy="70" r="40" fill="#000"/></mask><circle cx="665" cy="85" r="45" fill="#fef9c3" mask="url(#${g}m)"/><circle cx="665" cy="85" r="60" fill="#fef9c3" opacity=".12"/>`;
  // طبقات: 0 سماء، 1 بعيد، 2 أرض، 3 قريب
  const P = {
    day: [0, (g) => `<rect width="800" height="450" fill="url(#${g}d)"/>`],
    dawn: [0, (g) => `<rect width="800" height="450" fill="url(#${g}w)"/>`],
    dusk: [0, (g) => `<rect width="800" height="450" fill="url(#${g}k)"/>`],
    night: [0, (g) => `<rect width="800" height="450" fill="url(#${g}n)"/>`],
    storm: [0, (g) => `<rect width="800" height="450" fill="url(#${g}s)"/>`],
    paradise: [0, (g) => `<rect width="800" height="450" fill="url(#${g}p)"/>`],
    deep: [0, (g) => `<rect width="800" height="450" fill="url(#${g}u)"/><g fill="#38bdf8" opacity=".15"><path d="M100 0l60 450h-40z"/><path d="M400 0l50 450h-30z"/><path d="M650 0l40 450h-25z"/></g>
      <path d="M0 420 q100 -30 200 0 t200 0 t200 0 t200 0 V450H0Z" fill="#78716c"/><g fill="#16a34a"><path d="M80 430 q-15 -50 5 -90 q-5 45 8 90z"/><path d="M700 430 q15 -60 -5 -100 q15 50 2 100z"/></g>`],
    sun: [1, () => `<circle cx="660" cy="85" r="48" fill="#fde047"/><circle cx="660" cy="85" r="64" fill="#fde047" opacity=".25"/>`],
    moon: [1, (g) => MOON(g)],
    stars: [1, () => [[80, 60, 9], [200, 110, 6], [320, 45, 8], [450, 90, 5], [540, 40, 7], [140, 170, 5], [380, 150, 6], [760, 170, 6], [600, 160, 5], [260, 200, 4]].map((a) => star(...a)).join("")],
    dream: [1, (g) => MOON(g) + `<circle cx="130" cy="90" r="40" fill="#fde047"/><circle cx="130" cy="90" r="54" fill="#fde047" opacity=".25"/>`
      + [...Array(11)].map((_, i) => star(250 + (i % 6) * 60 + (i >= 6 ? 30 : 0), i >= 6 ? 160 : 90 + (i % 2) * 20, 13, "#fef08a")).join("")],
    clouds: [1, () => `<g fill="#fff" opacity=".9"><ellipse cx="160" cy="80" rx="70" ry="24"/><ellipse cx="190" cy="65" rx="40" ry="28"/><ellipse cx="520" cy="120" rx="80" ry="22"/><ellipse cx="545" cy="104" rx="42" ry="26"/></g>`],
    rain: [1, () => `<g fill="#475569"><ellipse cx="150" cy="60" rx="140" ry="45"/><ellipse cx="420" cy="50" rx="170" ry="50"/><ellipse cx="680" cy="65" rx="150" ry="45"/></g>
      <g stroke="#bfdbfe" stroke-width="3" opacity=".8">${[...Array(40)].map((_, i) => { const x = (i * 97) % 800, y = 100 + ((i * 53) % 260); return `<path d="M${x} ${y}l-10 26"/>`; }).join("")}</g>`],
    rainbow: [1, () => `<g fill="none" stroke-width="12" opacity=".75">${["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"].map((c, i) => `<path d="M120 300 A260 230 0 0 1 640 300" stroke="${c}" transform="translate(${i * 12} ${i * 12}) scale(${1 - i * 0.03})"/>`).join("")}</g>`],
    light: [1, () => `<g fill="#fef9c3" opacity=".35"><path d="M400 0 L300 330 L500 330Z"/><path d="M400 0 L200 330 L260 330Z"/><path d="M400 0 L540 330 L600 330Z"/></g><circle cx="400" cy="20" r="40" fill="#fef9c3" opacity=".8"/>`],
    hills: [1, () => `<path d="M0 300 Q150 200 320 290 T640 280 T800 260 V320H0Z" fill="#4ade80"/><path d="M0 310 Q200 250 420 305 T800 290 V330H0Z" fill="#22c55e"/>`],
    mountains: [1, () => `<path d="M-20 310 L130 140 L260 310Z" fill="#a16207"/><path d="M180 310 L360 110 L540 310Z" fill="#92400e"/><path d="M470 310 L640 160 L820 310Z" fill="#a16207"/>
      <path d="M360 110 L330 145 L360 135 L390 145Z" fill="#fef3c7" opacity=".6"/>`],
    mountain: [1, () => `<path d="M140 320 L400 90 L660 320Z" fill="#78716c"/><path d="M400 90 L360 135 L400 120 L440 135Z" fill="#e7e5e4"/>`],
    grass: [2, () => `<path d="M0 300 Q200 280 400 300 T800 295 V450H0Z" fill="#65a30d"/><path d="M0 340 Q250 320 500 345 T800 335 V450H0Z" fill="#4d7c0f"/>`],
    desert: [2, () => `<path d="M0 305 Q180 270 380 300 T800 290 V450H0Z" fill="#fcd34d"/><path d="M0 350 Q220 320 470 355 T800 340 V450H0Z" fill="#f59e0b"/>`],
    sea: [2, () => waves(290, "#0ea5e9", 10) + waves(330, "#0284c7", 14) + waves(390, "#075985", 16)],
    beach: [2, () => waves(300, "#0ea5e9", 8) + `<path d="M260 450 Q380 320 800 330 V450Z" fill="#fde68a"/>`],
    river: [2, () => `<path d="M0 360 Q200 330 400 370 T800 350 V410 Q600 420 400 425 T0 420Z" fill="#38bdf8"/><path d="M60 385 h60 M300 395 h80 M600 380 h50" stroke="#e0f2fe" stroke-width="3"/>`],
    stream: [2, () => `<path d="M800 380 Q600 350 480 400 T200 430 L0 440 V450 H800Z" fill="#38bdf8"/><path d="M620 395 h50 M350 420 h60" stroke="#e0f2fe" stroke-width="3"/>`],
    split: [0, (g) => `<rect width="800" height="450" fill="url(#${g}d)"/><circle cx="660" cy="80" r="45" fill="#fde047"/>
      <path d="M0 200 Q120 180 300 210 L330 450 H0Z" fill="#0284c7"/><path d="M800 200 Q680 180 500 210 L470 450 H800Z" fill="#0284c7"/>
      <path d="M0 260 Q150 240 305 260 L330 450 H0Z" fill="#075985"/><path d="M800 260 Q650 240 495 260 L470 450 H800Z" fill="#075985"/>
      <path d="M300 210 L330 450 H470 L500 210 Q400 230 300 210Z" fill="#fcd34d"/><path d="M360 450 L385 230 M440 450 L415 230" stroke="#f59e0b" stroke-width="4" stroke-dasharray="8 10"/>
      <g fill="#e0f2fe" opacity=".7"><path d="M300 210 q-12 30 4 60 q-10 -35 -4 -60z"/><path d="M500 210 q12 30 -4 60 q10 -35 4 -60z"/></g>`],
    tree: [3, () => tree(170, 330, 1.1)],
    fruit: [3, () => tree(600, 330, 1.2, true)],
    trees: [3, () => tree(90, 320, 0.8) + tree(720, 320, 0.9)],
    palm: [3, () => palm(110, 340, 0.9) + palm(700, 335, 0.8)],
    flowers: [3, () => [[60, "#f472b6"], [130, "#fde047"], [260, "#f87171"], [420, "#c084fc"], [520, "#fb923c"], [640, "#f472b6"], [740, "#fde047"]].map(([x, c], i) => flower(x, 400 + (i % 2) * 25, c)).join("")],
    birds: [3, () => bird(250, 120) + bird(300, 150, 0.8) + bird(330, 100, 0.7) + bird(480, 90) + bird(520, 130, 0.8)],
    houses: [3, () => house(420, 320, 90, 70, "#e7c9a0") + house(520, 320, 70, 95, "#d6b48a") + house(600, 320, 100, 60, "#e7c9a0")],
    ark: [3, () => `<g transform="translate(400 300)"><path d="M-230 0 L230 0 L180 70 L-180 70Z" fill="#92400e"/><path d="M-230 0 L230 0 L215 20 L-215 20Z" fill="#b45309"/>
      <rect x="-130" y="-70" width="260" height="70" fill="#a16207"/><path d="M-150 -70 L0 -120 L150 -70Z" fill="#78350f"/><g fill="#fde68a"><rect x="-100" y="-50" width="30" height="25"/><rect x="-15" y="-50" width="30" height="25"/><rect x="70" y="-50" width="30" height="25"/></g>
      <path d="M-170 35 h340" stroke="#78350f" stroke-width="4"/></g>`],
    ship: [3, () => `<g transform="translate(400 300)"><path d="M-130 0 L130 0 L100 45 L-100 45Z" fill="#92400e"/><rect x="-4" y="-150" width="8" height="150" fill="#78350f"/>
      <path d="M8 -140 Q90 -90 8 -20Z" fill="#f8fafc"/><path d="M-8 -130 Q-70 -85 -8 -30Z" fill="#e2e8f0"/></g>`],
    whale: [3, () => `<g transform="translate(400 260)"><path d="M-220 0 C-200 -110 120 -120 200 -20 C230 10 220 60 170 70 C60 100 -150 90 -220 0Z" fill="#1e40af"/>
      <path d="M-210 20 C-120 75 80 85 180 55 C120 95 -120 95 -210 20Z" fill="#93c5fd"/><path d="M195 -20 C250 -80 300 -60 290 -40 C270 -30 250 -5 210 10Z" fill="#1e3a8a"/><path d="M200 20 C260 60 300 50 295 30 C270 25 245 15 210 5Z" fill="#1e3a8a"/>
      <circle cx="-140" cy="-25" r="9" fill="#0f172a"/><circle cx="-137" cy="-28" r="3" fill="#fff"/><path d="M-215 10 Q-180 25 -140 20" stroke="#0f172a" stroke-width="4" fill="none"/></g>`],
    bubbles: [3, () => [[230, 160, 10], [250, 120, 7], [215, 90, 12], [245, 55, 6], [560, 140, 8], [580, 100, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#bae6fd" stroke-width="2.5"/>`).join("")],
    gourd: [3, () => `<g transform="translate(560 360)"><path d="M-120 0 Q0 -140 120 0" fill="none" stroke="#65a30d" stroke-width="6"/>${[[-90, -45], [-45, -95], [10, -110], [65, -85], [100, -35]].map(([x, y], i) => `<path d="M${x} ${y} c-30 -10 -30 -50 0 -55 c30 5 30 45 0 55z" fill="${i % 2 ? "#16a34a" : "#22c55e"}" transform="rotate(${-40 + i * 20} ${x} ${y})"/>`).join("")}
      <ellipse cx="-30" cy="-20" rx="22" ry="14" fill="#fbbf24"/><ellipse cx="50" cy="-30" rx="18" ry="12" fill="#f59e0b"/></g>`],
    well: [3, () => `<g transform="translate(400 380)"><ellipse cx="0" cy="-60" rx="90" ry="22" fill="#1c1917"/><path d="M-90 -60 V0 Q0 25 90 0 V-60 Q0 -35 -90 -60Z" fill="#a8a29e"/>
      <path d="M-90 -40 Q0 -15 90 -40 M-90 -20 Q0 5 90 -20 M-45 -50 v20 M30 -48 v22 M-15 -25 v20 M55 -20 v18" stroke="#78716c" stroke-width="3" fill="none"/>
      <path d="M-75 -60 V-160 M75 -60 V-160 M-85 -160 H85" stroke="#78350f" stroke-width="10" stroke-linecap="round"/><path d="M0 -160 V-95" stroke="#d6d3d1" stroke-width="3"/><rect x="-14" y="-98" width="28" height="22" fill="#92400e" rx="3"/></g>`],
    camels: [3, () => [0, 130].map((d) => `<g transform="translate(${560 + d} 320) scale(${d ? 0.8 : 1})" fill="#b45309"><ellipse cx="0" cy="-45" rx="45" ry="22"/><ellipse cx="-5" cy="-65" rx="25" ry="18"/>
      <path d="M38 -50 Q60 -60 62 -95 L75 -95 Q78 -55 45 -35Z"/><ellipse cx="76" cy="-98" rx="13" ry="8"/><path d="M-30 -30 V0 M-15 -28 V0 M20 -28 V0 M33 -30 V0" stroke="#b45309" stroke-width="7"/></g>`).join("")],
    wheat: [3, () => [...Array(9)].map((_, i) => { const x = 60 + i * 85; return `<g><path d="M${x} 430 Q${x - 5} 380 ${x + 5} 320" stroke="#ca8a04" stroke-width="4" fill="none"/>${[0, 1, 2, 3].map((k) => `<ellipse cx="${x + 5 + (k % 2 ? 7 : -7)}" cy="${330 + k * 13}" rx="6" ry="11" fill="#eab308" transform="rotate(${k % 2 ? 25 : -25} ${x + 5} ${330 + k * 13})"/>`).join("")}</g>`; }).join("")],
    basket: [3, () => `<g transform="translate(380 380)"><path d="M-70 -30 H70 L60 10 H-60Z" fill="#a16207"/><path d="M-70 -30 H70" stroke="#78350f" stroke-width="6"/><path d="M-50 -25 L-45 5 M-15 -25 L-12 8 M20 -25 L18 8 M52 -25 L45 5" stroke="#78350f" stroke-width="3"/>
      <path d="M-90 15 q20 -10 40 0 t40 0 t40 0 t40 0" stroke="#e0f2fe" stroke-width="3" fill="none"/></g>`],
    kaaba: [3, () => `<g transform="translate(400 345)"><path d="M-80 0 V-130 L0 -150 L80 -130 V0Z" fill="#111827"/><path d="M0 -150 V0" stroke="#000" stroke-width="2"/><path d="M-80 -100 L0 -118 L80 -100 V-88 L0 -106 L-80 -88Z" fill="#facc15"/>
      <rect x="25" y="-70" width="28" height="45" fill="#ca8a04" rx="3"/></g><ellipse cx="400" cy="355" rx="190" ry="22" fill="#f1f5f9" opacity=".8"/>`],
    spring: [3, () => `<g transform="translate(400 390)"><ellipse cx="0" cy="0" rx="120" ry="28" fill="#38bdf8"/><ellipse cx="0" cy="-3" rx="80" ry="15" fill="#7dd3fc"/>${[-1, 0, 1].map((k) => `<path d="M${k * 22} -10 q${k * 10} -45 ${k * 22} -70" stroke="#bae6fd" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("")}
      ${[[-140, 5], [130, 0], [-100, 25], [105, 25]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="30" ry="18" fill="#a8a29e"/>`).join("")}</g>`],
    sheep: [3, () => `<g transform="translate(560 395)"><g fill="#f8fafc">${[[-30, -40], [0, -48], [30, -40], [-15, -25], [15, -25], [40, -22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24"/>`).join("")}</g>
      <ellipse cx="-58" cy="-45" rx="18" ry="14" fill="#44403c"/><circle cx="-63" cy="-48" r="3" fill="#fff"/><path d="M-20 -15 V15 M0 -15 V15 M20 -15 V15 M38 -15 V15" stroke="#44403c" stroke-width="7"/></g>`],
    rocks: [3, () => [[200, 400, 50, 30], [280, 410, 35, 22], [520, 405, 55, 32], [600, 415, 30, 18], [400, 420, 40, 20]].map(([x, y, a, b]) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="#a8a29e"/><ellipse cx="${x - a * 0.3}" cy="${y - b * 0.3}" rx="${a * 0.4}" ry="${b * 0.3}" fill="#d6d3d1"/>`).join("")],
    fire: [3, () => `<g transform="translate(400 400)"><ellipse cx="0" cy="10" rx="220" ry="25" fill="#7c2d12"/>${[-150, -90, -30, 30, 90, 150].map((x, i) => `<path d="M${x - 45} 10 C${x - 50} -60 ${x - 10} -90 ${x} -${170 + (i % 2) * 50} C${x + 10} -90 ${x + 50} -60 ${x + 45} 10Z" fill="#f97316"/><path d="M${x - 25} 10 C${x - 25} -40 ${x - 5} -60 ${x} -${100 + (i % 2) * 30} C${x + 5} -60 ${x + 25} -40 ${x + 25} 10Z" fill="#fde047"/>`).join("")}</g>`],
    coolfire: [3, () => `<g transform="translate(400 400)"><ellipse cx="0" cy="10" rx="220" ry="25" fill="#a3e635"/>${[-150, -90, -30, 30, 90, 150].map((x, i) => `<path d="M${x - 30} 10 C${x - 35} -40 ${x - 8} -60 ${x} -${110 + (i % 2) * 30} C${x + 8} -60 ${x + 35} -40 ${x + 30} 10Z" fill="#bae6fd" opacity=".75"/>`).join("")}
      ${[-180, -120, -60, 0, 60, 120, 180].map((x, i) => flower(x, 15, ["#f472b6", "#fde047", "#c084fc"][i % 3])).join("")}</g>`],
    armor: [3, () => `<g transform="translate(400 300)"><path d="M-70 -110 L-30 -125 Q0 -105 30 -125 L70 -110 L90 -50 L65 -40 L60 60 H-60 L-65 -40 L-90 -50Z" fill="#94a3b8"/>
      <g fill="none" stroke="#475569" stroke-width="2.5">${[...Array(7)].map((_, r) => [...Array(7)].map((_, c) => `<circle cx="${-48 + c * 16 + (r % 2) * 8}" cy="${-80 + r * 20}" r="7"/>`).join("")).join("")}</g></g>
      <g transform="translate(620 380)"><rect x="-60" y="-20" width="120" height="30" fill="#57534e" rx="4"/><rect x="-10" y="-60" width="20" height="40" fill="#78716c"/><rect x="-40" y="-75" width="80" height="18" fill="#44403c" rx="4"/></g>
      <g transform="translate(170 400)" fill="#f97316"><path d="M-40 0 C-40 -50 -10 -60 0 -90 C10 -60 40 -50 40 0Z"/><path d="M-20 0 C-20 -30 -5 -35 0 -55 C5 -35 20 -30 20 0Z" fill="#fde047"/></g>`],
    ants: [3, () => `<path d="M100 395 Q140 360 180 395Z" fill="#a16207"/><path d="M620 400 Q670 350 720 400Z" fill="#a16207"/><ellipse cx="670" cy="395" rx="10" ry="6" fill="#422006"/>`
      + [...Array(9)].map((_, i) => ant(200 + i * 48, 400 + (i % 2) * 8)).join("")],
    lamp: [3, () => `<g transform="translate(230 360)"><path d="M-60 0 Q0 30 60 0 L40 -15 Q0 -5 -40 -15Z" fill="#ca8a04"/><path d="M60 0 Q85 -5 95 -25" stroke="#ca8a04" stroke-width="8" fill="none"/>
      <path d="M-55 -5 Q-90 -30 -70 -55" stroke="#a16207" stroke-width="7" fill="none"/><path d="M95 -25 C80 -60 100 -80 105 -95 C115 -75 125 -55 100 -25Z" fill="#fde047"/><circle cx="102" cy="-50" r="45" fill="#fef9c3" opacity=".25"/></g>`],
    dates: [3, () => [[95, 190], [115, 205], [690, 200], [705, 215], [300, 260], [450, 300], [560, 240], [240, 330]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="11" fill="#b45309"/>`).join("")],
    mosque: [3, () => `<g transform="translate(400 330)"><rect x="-150" y="-80" width="300" height="80" fill="#d6b48a"/><rect x="-160" y="-92" width="320" height="16" fill="#92400e"/>
      ${[-120, -60, 0, 60, 120].map((x) => `<rect x="${x - 6}" y="-76" width="12" height="76" fill="#78350f"/>`).join("")}<rect x="-25" y="-60" width="50" height="60" fill="#78350f" rx="25"/></g>`],
    cave: [3, () => `<path d="M380 250 Q420 215 460 250 Q470 290 420 295 Q370 290 380 250Z" fill="#1c1917"/><path d="M388 255 Q420 230 452 255" stroke="#57534e" stroke-width="5" fill="none"/>`],
  };

  window.SCENE = (spec, cls = "") => {
    const g = "g" + uid++;
    const toks = spec.split(/\s+/).filter((t) => P[t]);
    const body = toks.map((t) => P[t]).sort((a, b) => a[0] - b[0]).map((p) => p[1](g)).join("");
    const lg = (id, a, b, c) => `<linearGradient id="${g}${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
    return `<svg class="scn ${cls}" viewBox="0 0 800 450" preserveAspectRatio="xMid${cls.includes("low") ? "YMax" : "YMid"} slice" aria-hidden="true"><defs>
      ${lg("d", "#38bdf8", "#7dd3fc", "#e0f2fe")}${lg("w", "#fb923c", "#fcd34d", "#fef3c7")}${lg("k", "#7c3aed", "#f472b6", "#fdba74")}
      ${lg("n", "#020617", "#1e1b4b", "#312e81")}${lg("s", "#334155", "#64748b", "#94a3b8")}${lg("p", "#a7f3d0", "#fbcfe8", "#fef9c3")}${lg("u", "#0c4a6e", "#075985", "#0e7490")}
    </defs>${body}</svg>`;
  };
})();
