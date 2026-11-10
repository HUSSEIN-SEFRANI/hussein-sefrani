// التلوين — اختر لوناً ثم اختر جزءاً من الرسمة لتلوينه (بالأسهم أو الفأرة)
(() => {
  "use strict";
  const save = K.store("color", { fills: {} });
  const R = (x, y, w, h, rx = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
  const C = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  const E = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  const P = (pts) => `<polygon points="${pts}"/>`;
  const D = (d) => `<path d="${d}"/>`;
  const L = (d) => ({ line: d }); // خطوط للزينة (لا تُلوَّن)
  const star = (cx, cy, r) => P(K.range(0, 10).map((i) => { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join(" "));
  const petals = K.range(0, 6).map((k) => C((200 + 42 * Math.cos((k * Math.PI) / 3)).toFixed(1), (110 + 42 * Math.sin((k * Math.PI) / 3)).toFixed(1), 25));

  const ART = [
    { id: "house", name: "البيت", icon: "🏠", parts: [R(0, 0, 400, 220), R(0, 220, 400, 80), C(340, 55, 30), E(90, 50, 42, 18), R(215, 70, 20, 45), R(90, 130, 160, 110), P("78,136 170,60 262,136"),
      R(150, 180, 40, 60, 4), R(105, 150, 35, 30), R(200, 150, 35, 30), R(300, 170, 16, 62), C(308, 148, 36), C(40, 245, 10), C(70, 255, 10)] },
    { id: "fish", name: "السمكة", icon: "🐟", parts: [R(0, 0, 400, 300), D("M0 255 Q100 232 200 255 T400 255 V300 H0Z"), P("92,150 38,108 38,192"), E(170, 150, 85, 55), P("148,100 190,68 212,104"),
      E(148, 150, 10, 48), E(192, 150, 10, 53), C(226, 135, 14), C(230, 135, 6), C(292, 92, 12), C(312, 62, 8), C(326, 36, 6),
      D("M330 255 Q314 212 336 178 Q352 212 342 255Z"), D("M362 255 Q350 222 366 200 Q380 226 372 255Z"), L("M226 168 Q240 175 250 166")] },
    { id: "car", name: "السيارة", icon: "🚗", parts: [R(0, 0, 400, 212), R(0, 212, 400, 88), C(60, 50, 28), E(250, 45, 46, 18), R(20, 254, 60, 8, 3), R(170, 254, 60, 8, 3), R(320, 254, 60, 8, 3),
      D("M110 140 L140 95 L262 95 L296 140 Z"), D("M50 202 L50 162 Q55 140 80 138 L330 138 Q350 140 352 165 L352 202 Z"), D("M128 136 L148 104 L196 104 L196 136 Z"), D("M206 136 L206 104 L256 104 L278 136 Z"),
      E(345, 165, 7, 10), C(115, 205, 30), C(290, 205, 30), C(115, 205, 12), C(290, 205, 12)] },
    { id: "flower", name: "الزهرة", icon: "🌸", parts: [R(0, 0, 400, 300), R(0, 252, 400, 48), C(350, 50, 26), R(196, 140, 8, 100), D("M200 205 Q170 178 148 198 Q174 220 200 205Z"), D("M200 188 Q230 162 252 182 Q226 204 200 188Z"),
      P("160,240 240,240 230,296 170,296"), ...petals, C(200, 110, 22), L("M60 252 l6 -14 l6 14 M90 252 l6 -12 l6 12 M300 252 l6 -14 l6 14")] },
    { id: "cat", name: "القطة", icon: "🐱", parts: [R(0, 0, 400, 300), P("118,112 135,28 192,80"), P("208,80 265,28 282,112"), E(200, 162, 112, 96), P("136,92 143,50 172,78"), P("228,78 257,50 264,92"),
      E(160, 140, 19, 25), E(240, 140, 19, 25), E(160, 146, 7, 14), E(240, 146, 7, 14), P("189,180 211,180 200,194"), C(146, 198, 16), C(254, 198, 16),
      L("M200 194 Q200 210 186 214 M200 194 Q200 210 214 214 M120 182 L60 172 M120 192 L58 196 M280 182 L340 172 M280 192 L342 196")] },
    { id: "rocket", name: "الصاروخ", icon: "🚀", parts: [R(0, 0, 400, 300), C(330, 232, 45), C(60, 60, 26), star(110, 200, 16), star(300, 70, 14), star(360, 140, 10), star(40, 150, 10),
      P("172,250 200,296 228,250"), P("160,200 124,252 166,246"), P("240,200 276,252 234,246"), D("M160 252 L160 122 Q200 40 240 122 L240 252 Z"),
      D("M170 102 Q200 42 230 102 Z"), C(200, 152, 22), C(200, 152, 12)] },
    { id: "butterfly", name: "الفراشة", icon: "🦋", parts: [R(0, 0, 400, 300), E(140, 112, 72, 56), E(260, 112, 72, 56), E(150, 205, 52, 42), E(250, 205, 52, 42),
      C(128, 105, 18), C(272, 105, 18), C(155, 208, 12), C(245, 208, 12), E(200, 160, 14, 82), C(200, 70, 17), L("M194 56 Q180 25 165 22 M206 56 Q220 25 235 22")] },
  ];
  const COLORS = ["#ef4444", "#f97316", "#facc15", "#a3e635", "#22c55e", "#38bdf8", "#2563eb", "#8b5cf6", "#f472b6", "#92400e", "#fcd9b6", "#9ca3af", "#111827", "#ffffff"];
  let color = COLORS[0];

  const svg = (a, interactive) => {
    const f = save.fills[a.id] || {};
    let i = 0;
    const body = a.parts.map((p) => {
      if (typeof p === "object") return `<path class="ln" d="${p.line}"/>`;
      const k = i++;
      return p.replace(/^<(\w+)/, (m, t) => `<${t} class="rg${interactive ? " f" : ""}" data-r="${k}" fill="${f[k] || "#ffffff"}"${interactive ? ` data-k="r${k}"` : ""}`);
    }).join("");
    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  };

  function homeScreen() {
    K.begin();
    const cards = ART.map((a, i) => `<button class="art f" ${K.act("a" + i, () => K.show(paintScreen, i))}>${svg(a, false)}<b><span class="emo">${a.icon}</span> ${a.name}</b></button>`).join("");
    K.paint(`
      <div class="title"><span class="mascot emo">🖍️</span><div><h1>التلوين</h1><div class="sub">اختر رسمة ولوّنها كما تحب</div></div></div>
      <div class="arts">${cards}</div>
      ${K.HELP}`, "a0");
  }

  function paintScreen(ai) {
    K.begin();
    const a = ART[ai];
    const sw = COLORS.map((c, i) => `<button class="sw f${c === color ? " on" : ""}" style="background:${c}" ${K.act("c" + i, (el) => pick(c, el))}></button>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2><span class="emo">${a.icon}</span> ${a.name}</h2>
        <button class="btn f" ${K.act("clear", () => { delete save.fills[a.id]; save.save(); K.render(); })}><span class="emo">🧽</span> امسح الكل</button></div>
      <div class="studio">
        <div class="canvas">${svg(a, true)}</div>
        <div class="palette"><div class="now" style="background:${color}"></div>${sw}</div>
      </div>`, "c0");
    a.parts.filter((p) => typeof p !== "object").forEach((_, k) => K.act("r" + k, fill));
    function pick(c, el) {
      color = c; K.sfx.pop();
      K.app.querySelectorAll(".sw.on").forEach((e) => e.classList.remove("on"));
      el.classList.add("on");
      K.app.querySelector(".now").style.background = c;
    }
    function fill(el) {
      el.setAttribute("fill", color);
      (save.fills[a.id] = save.fills[a.id] || {})[el.dataset.r] = color;
      save.save(); K.sfx.pop();
      el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 });
    }
  }

  K.start(homeScreen);
})();
