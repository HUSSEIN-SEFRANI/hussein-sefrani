// «اكتشف بلجيكا»: مغامرة قفز في ست مدن بلجيكية، مع 15 شخصية لكل منها قوة.
// الأزرار بالموقع (البند 52): السفلي (0) قفز/موافق، الأيمن (1) استراحة/رجوع، الأيسر (2) والعلوي (3) القوة،
// الأسهم والعصا اليسرى للمشي. لوحة المفاتيح: الأسهم، ↑ أو المسافة أو Enter للقفز، X للقوة، Backspace للاستراحة.
(() => {
  "use strict";
  const { CH, CD, CITIES } = window.BEL;
  const save = K.store("belgium", { unlocked: 1, best: 0, char: 0, wins: 0 });
  const cv = document.createElement("canvas"); cv.id = "cv"; document.body.insertBefore(cv, K.app);
  const cx = cv.getContext("2d");
  const T = 40, ROWS = 13, VH = 520, OY = 20, FONT = '"Baloo", "Noto Sans Arabic", Tahoma, sans-serif';
  let VW = 960, sc = 1, frame = 0, cam = 0;
  const HELP = `<div class="help"><b>الأسهم</b> للتنقل · <b>Enter</b> أو <b>الزر السفلي</b> للاختيار · <b>Backspace</b> أو <b>الزر الأيمن</b> للرجوع</div>`;

  // ---------------------------------------------------------------- رسم الشخصية (للعبة وللبطاقات)
  function drawHero(g, x, y, c, o) {
    const h = c.legs ? 46 : c.big ? 40 : 36, lg = c.legs || 10, hr = c.big ? 13 : 8, tt = h - lg - 15;
    g.save(); g.translate(x, y); g.scale(o.face || 1, 1); if (o.alpha) g.globalAlpha = o.alpha;
    const s = o.on ? Math.sin((o.anim || 0) * 0.12) * 5 : 3;
    if (c.cape) { g.fillStyle = c.cape; g.beginPath(); g.moveTo(-6, tt + 2); g.lineTo(-20, tt + 16 + (o.on ? 0 : -6)); g.lineTo(-4, tt + 17); g.fill(); }
    g.fillStyle = c.pants; g.fillRect(-8 + s * 0.6, h - lg, 6, lg); g.fillRect(2 - s * 0.6, h - lg, 6, lg);
    g.fillStyle = "#1b1b1b"; g.fillRect(-9 + s * 0.6, h - 3, 8, 3); g.fillRect(1 - s * 0.6, h - 3, 8, 3);
    g.fillStyle = c.body; g.beginPath(); if (g.roundRect) g.roundRect(-11, tt, 22, 16, 5); else g.rect(-11, tt, 22, 16); g.fill();
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(-11, tt + 12, 22, 3);
    g.fillStyle = c.skin; g.fillRect(4 - s * 0.4, tt + 4, 5, 9);
    if (c.item === "sword") { g.fillStyle = "#6b4a2a"; g.fillRect(6, tt + 8, 6, 3); g.fillStyle = "#e8eef3"; g.fillRect(12, tt - 10, 4, 22); g.fillStyle = "#FDDA24"; g.fillRect(9, tt + 6, 10, 3); }
    if (c.item === "hammer") { g.fillStyle = "#6b4a2a"; g.fillRect(8, tt - 6, 3, 18); g.fillStyle = "#777"; g.fillRect(3, tt - 12, 14, 8); }
    const hy = tt - hr + 3;
    g.fillStyle = c.skin; g.beginPath(); g.arc(0, hy, hr, 0, 7); g.fill();
    g.fillStyle = "#141414"; g.beginPath(); g.arc(hr * 0.45, hy - 1, c.big ? 2.4 : 1.6, 0, 7); g.fill(); g.fillRect(hr * 0.2, hy + hr * 0.45, hr * 0.45, 1.5);
    g.fillStyle = c.hc;
    if (c.hat === "beret") { g.beginPath(); g.ellipse(-1, hy - hr + 2, hr + 3, 4, -0.15, 0, 7); g.fill(); g.fillRect(-1, hy - hr - 4, 2, 3); }
    else if (c.hat === "cap") { g.beginPath(); g.arc(0, hy - 2, hr, Math.PI, 0); g.fill(); g.fillRect(0, hy - 3, hr + 6, 3); }
    else if (c.hat === "helmet") { g.beginPath(); g.arc(0, hy, hr + 1.5, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.fillRect(-hr - 1, hy - 1, 4, hr * 0.7); }
    else if (c.hat === "hood") { g.beginPath(); g.arc(0, hy, hr + 2.5, Math.PI * 0.6, Math.PI * 2.1); g.lineWidth = 4; g.strokeStyle = c.hc; g.stroke(); }
    else if (c.hat === "band") { g.fillRect(-hr, hy - hr * 0.55, hr * 2, 3); g.fillRect(-hr - 5, hy - hr * 0.55, 5, 2); }
    else if (c.hat === "top") { g.fillRect(-hr, hy - hr + 1, hr * 2, 2); g.fillRect(-hr * 0.7, hy - hr - 10, hr * 1.4, 12); }
    else if (c.hat === "spike") { g.beginPath(); g.moveTo(-hr, hy - 2); for (let k = 0; k < 4; k++) { g.lineTo(-hr + k * hr * 0.6 + hr * 0.3, hy - hr - 7); g.lineTo(-hr + (k + 1) * hr * 0.55, hy - hr + 1); } g.fill(); }
    else { g.beginPath(); g.arc(0, hy - 2, hr, Math.PI * 1.05, Math.PI * 1.95); g.fill(); }
    g.restore();
  }
  // صورة الشخصية داخل بطاقة HTML
  function portrait(i, cls) {
    const id = "p" + Math.random().toString(36).slice(2, 8);
    K.later(() => { const c = document.getElementById(id); if (!c) return; const g = c.getContext("2d"); g.scale(2.6, 2.6); drawHero(g, 24.6, CH[i].big ? 14 : CH[i].legs ? 8 : 16, CH[i], { face: 1, on: 1 }); }, 0);
    return `<canvas id="${id}" class="${cls || ""}" width="128" height="150"></canvas>`;
  }

  // ---------------------------------------------------------------- الشاشة الأولى
  function home() {
    K.begin(); K.onFocus = null;
    const c = CH[save.char], open = Math.min(save.unlocked, CITIES.length);
    K.paint(`<div class="top"><span></span><span class="pill"><span class="emo">🏆</span> أفضل نتيجة: ${save.best}</span></div>
      <div class="hero">${portrait(save.char, "heroP")}<div><h1 class="logo">اكتشف بلجيكا</h1><div class="sub">مغامرة قفز من مدينة إلى مدينة</div><div class="flag"><i></i><i></i><i></i></div></div></div>
      <div class="modes">
        <button class="mode f" style="background:#e11d48" ${K.act("play", () => K.show(chars))}><span class="big emo">🏃</span><b>العب</b><small>اختر بطلك ثم المدينة</small></button>
        <button class="mode f" style="background:#1f2937" ${K.act("map", () => K.show(cities))}><span class="big emo">🗺️</span><b>المدن</b><small>${open} من ${CITIES.length} مفتوحة</small></button>
      </div>
      <div class="sub small">بطلك الآن: <b>${c.n}</b> · قوته: ${c.pl}</div>${HELP}`, "play");
  }

  // ---------------------------------------------------------------- اختيار الشخصية
  function chars() {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">اختر بطلك</h2><span class="pill">15 بطلاً</span></div>
      <div class="chgrid">${CH.map((c, i) => `<button class="ch f ${i === save.char ? "on" : ""}" data-i="${i}" ${K.act("c" + i, () => { save.char = i; save.save(); K.sfx.ok(); K.show(cities); })}>
        ${portrait(i)}<b>${c.n}</b><small>${c.pl}</small></button>`).join("")}</div>
      <div class="desc" id="desc"></div>${HELP}`, "c" + save.char);
    K.onFocus = (el) => { const i = +el.dataset.i, d = document.getElementById("desc"); if (d && el.dataset.i !== undefined) d.textContent = `${CH[i].n}: ${CH[i].d}`; };
    if (K.current()) K.onFocus(K.current());
  }

  // ---------------------------------------------------------------- اختيار المدينة
  function cities() {
    K.begin(); K.onFocus = null;
    const last = Math.min(save.unlocked, CITIES.length) - 1;
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">إلى أين؟</h2><span class="pill">${CH[save.char].n} · ${CH[save.char].pl}</span></div>
      <div class="cgrid">${CITIES.map((c, i) => {
        const open = i < save.unlocked;
        return `<button class="city f ${open ? "" : "no"}" ${K.act("m" + i, () => { if (open) K.show(play, { city: i }); else { K.sfx.bad(); K.tts("أكمل المدينة التي قبلها أولاً"); } })}>
          <span class="emo big">${open ? c.e : "🔒"}</span><b>${i + 1}. ${c.n}</b><small>${open ? (i + 1 < save.unlocked ? "✔ أكملتها" : "جاهزة") : "مغلقة"}</small></button>`;
      }).join("")}</div>${HELP}`, "m" + last);
  }

  // ---------------------------------------------------------------- بناء المرحلة
  function rng(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // طرقات على ارتفاعات مختلفة: يمشي الطفل ويقفز من طريق إلى طريق ويصعد (الصعود مربعان على الأكثر)
  function build(i) {
    const C = CITIES[i], r = rng(i * 97 + 13), W = 160 + i * 14;
    const g = Array.from({ length: ROWS }, () => Array(W + 60).fill("."));
    const G = (a, b, top) => { for (let x = a; x <= b; x++) for (let y = top; y < ROWS; y++) g[y][x] = "#"; };
    const P = (x, y, s) => { if (y < 0 || y >= ROWS) return; [...s].forEach((c, k) => { if (c !== " ") g[y][x + k] = c; }); };
    G(0, 13, 11); P(5, 10, "WWW"); P(9, 7, "i");
    let x = 14, top = 11;
    while (x < W) {
      const len = 10 + Math.floor(r() * 6);   // الصناديق في أول الطريق، وآخره فارغ للركض قبل القفز
      const nt = Math.max(7, Math.min(11, top + [-2, -1, 0, 0, 1, 2, -1][Math.floor(r() * 7)]));
      let gap = r() < C.gap + 0.3 ? (i > 3 && r() < 0.3 ? 3 : 2) : 0;
      if (nt < top && gap > 2) gap = 2;   // صعود مع فجوة: الفجوة قصيرة
      x += gap; G(x, x + len - 1, nt); top = nt;
      const o = nt - 11, m = x + 2, f = Math.floor(r() * 6); let stair = false;
      if (f === 0) { P(m, 7 + o, "BiB"); P(m, 6 + o, "W W"); }
      else if (f === 1) { P(m, 8 + o, "BBBB"); P(m, 7 + o, "WCW"); P(m + 1, 4 + o, "i"); }
      else if (f === 2) { P(m, 10 + o, "WWW"); P(m + 4, 7 + o, "i"); }
      else if (f === 3) { stair = true; for (let k = 0; k < 3; k++) for (let h = 0; h <= k; h++) P(x + len - 3 + k, 10 + o - h, "#"); P(m, 10 + o, "WW"); P(x + len - 1, 7 + o, "C"); }
      else if (f === 4) { P(m, 7 + o, "iBi"); P(m + 1, 3 + o, "C"); }
      else { P(m, 9 + o, "BB"); P(m + 3, 6 + o, "BBB"); P(m + 4, 5 + o, "C"); P(m + 1, 8 + o, "W"); }
      if (!stair && r() < C.sp) P(x + len - 5, 10 + o, "S");   // بعيداً عن حافة الطريق
      if (r() < C.pg) P(x + Math.floor(len / 2), Math.max(1, 4 + o + Math.floor(r() * 2)), "P");
      x += len;
    }
    x += 2;
    const end = x + 24; G(x, end, 11);
    for (let k = 0; k < 4; k++) for (let h = 0; h <= k; h++) g[10 - h][x + 3 + k] = "#";
    const L = { g: g.map((row) => row.slice(0, end + 1)), w: end + 1, flag: x + 14, en: [] };
    for (let rr = 0; rr < ROWS; rr++) for (let c = 0; c < L.w; c++) {
      const t = L.g[rr][c];
      if (t === "S") { L.en.push({ k: "s", x: c * T + 5, y: rr * T + 10, w: 30, h: 30, vx: -1.1, vy: 0, alive: 1, fz: 0 }); L.g[rr][c] = "."; }
      if (t === "P") { L.en.push({ k: "p", bx: c * T, by: rr * T, x: c * T, y: rr * T, w: 32, h: 22, t: r() * 300, alive: 1, fz: 0, dir: -1 }); L.g[rr][c] = "."; }
    }
    return L;
  }

  // ---------------------------------------------------------------- اللعب
  function play(cfg) {
    K.begin(); K.onFocus = null;
    const ch = CH[save.char];
    const MAXL = ch.big ? 6 : 5;   // لعبة للأطفال: خمسة قلوب في كل مدينة
    let li = cfg.city, lv = null, p = null, score = 0, lvScore = 0, lives = MAXL, waf = 0, cd = 0;
    let shots = [], pops = [], parts = [], flash = 0, shake = 0, banner = 0, paused = false, ovOpen = false, ovBack = null, ovHold = false, ovT = 0, raf = 0, acc = 0, lastT = 0;
    const keys = { l: 0, r: 0, j: 0 }, padIn = { l: 0, r: 0, j: 0 };
    let prev = { j: 0, pw: 0, bk: 0 }, jp = 0, pp = 0;
    document.body.classList.add("playing");
    K.paint(`<div id="ovl" class="ovl"></div>`);
    const ovl = document.getElementById("ovl");

    const add = (n) => { score += ch.p === "luck" ? n * 2 : n; };
    const shown = (n) => "+" + (ch.p === "luck" ? n * 2 : n);
    const pop = (x, y, t, c) => pops.push({ x, y, t, c: c || "#fff", life: 50 });
    const newPlayer = () => { const h = ch.legs ? 46 : ch.big ? 40 : 36; return { x: 2 * T, y: 11 * T - h, w: 28, h, vx: 0, vy: 0, on: 0, face: 1, air: 1, inv: 0, anim: 0, swing: 0, shield: 0, ghost: 0, pound: 0, safe: { x: 2 * T, y: 11 * T - h } }; };
    const clearInput = () => { keys.l = keys.r = keys.j = 0; padIn.l = padIn.r = padIn.j = 0; prev = { j: 1, pw: 1, bk: 1 }; jp = pp = 0; };
    const keepBest = () => { if (score > save.best) { save.best = score; save.save(); } };

    function startLevel(i) {
      li = i; lv = build(i); p = newPlayer(); lives = MAXL;   // كل مدينة تبدأ بقلوب كاملة
      cam = 0; cd = 0; shots = []; pops = []; parts = []; lvScore = score; banner = 200;
      K.tts(`مرحباً بك في ${CITIES[i].n}`);
    }

    // ---------------- النوافذ فوق اللعبة (معلومة، سؤال، استراحة…)
    function overlay(html, def, back) {
      K.begin();
      ovl.innerHTML = `<div class="pcard">${typeof html === "function" ? html() : html}</div>`;
      ovl.classList.add("on"); ovOpen = true; ovBack = back || null; ovHold = true; ovT = performance.now(); clearInput();
      K.focus(ovl.querySelector(`[data-k="${def}"]`) || ovl.querySelector(".f"));
    }
    function closeOv() { ovl.classList.remove("on"); ovl.innerHTML = ""; ovOpen = false; ovBack = null; paused = false; clearInput(); lastT = 0; acc = 0; K.stopSound(); }
    function pauseMenu() {
      paused = true;
      overlay(() => `<h1>استراحة ⏸️</h1><div class="sub">${CITIES[li].n} · ${score} نقطة</div><div class="nav">
        <button class="btn f go" ${K.act("resume", closeOv)}>▶️ متابعة</button>
        <button class="btn f" ${K.act("restart", () => { score = lvScore; lives = MAXL; closeOv(); startLevel(li); })}>🔁 من البداية</button>
        <button class="btn f" ${K.act("quit", () => { keepBest(); K.back(); })}>🏠 خروج</button></div>`, "resume", closeOv);
    }
    // صندوق النجمة: قلب إن نقص، وإلا شوكولاتة ونقاط
    function bonusBox(h) {
      add(50); K.sfx.pop();
      if (lives < MAXL) { lives++; pop(h.c * T, h.r * T - 14, "♥ +1", "#EF3340"); }
      else pop(h.c * T, h.r * T - 14, shown(50), "#FDDA24");
      for (let k = 0; k < 8; k++) parts.push({ x: h.c * T + 20, y: h.r * T, vx: Math.random() * 6 - 3, vy: -Math.random() * 6 - 2, life: 35, c: k % 2 ? "#FDDA24" : "#EF3340" });
    }
    // نهاية المدينة: احتفال ثم المدينة التالية (بلا أسئلة)
    function cityDone() {
      const C = CITIES[li], lastCity = li === CITIES.length - 1;
      add(200); K.sfx.win(); K.confetti(24, "⭐🎉🧇🍫");
      if (li + 2 > save.unlocked) save.unlocked = Math.min(CITIES.length, li + 2);
      keepBest(); save.save();
      const next = () => { closeOv(); if (lastCity) { save.wins = (save.wins || 0) + 1; save.save(); K.replace(final, { score, waf, ch: save.char }); } else startLevel(li + 1); };
      overlay(() => `<h1>وصلت إلى نهاية ${C.n}! 🚩</h1><div class="fact">${C.e} ⭐ ${score} نقطة · 🧇 ${waf}</div>
        <div class="nav"><button class="btn f go" ${K.act("next", next)}>${lastCity ? "النهاية 🏆" : "إلى " + CITIES[li + 1].n + " " + CITIES[li + 1].e + " ←"}</button>
        <button class="btn f" ${K.act("quit", () => K.back())}>🏠 القائمة</button></div>`, "next", () => {});
      K.tts(lastCity ? "أحسنت! وصلت إلى النهاية" : `أحسنت! هيا إلى ${CITIES[li + 1].n}`);
    }
    function gameOver() {
      keepBest(); K.sfx.bad();
      overlay(() => `<h1>انتهت المحاولة 💪</h1><div class="fact">لا بأس، ${CITIES[li].n} ما زالت تنتظرك.</div><div class="nav">
        <button class="btn f go" ${K.act("again", () => { score = lvScore; lives = MAXL; closeOv(); startLevel(li); })}>🔁 أعد المدينة</button>
        <button class="btn f" ${K.act("quit", () => K.back())}>🏠 القائمة</button></div>`, "again", () => {});
    }

    // ---------------- الفيزياء
    const tile = (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= lv.w ? "." : lv.g[r][c]);
    const solid = (c, r) => { const t = tile(c, r); return t === "#" || t === "B" || t === "i" || t === "u"; };
    function move(b) {
      let wall = 0, head = null; b.on = 0; b.x += b.vx;
      const r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - 1) / T);
      if (b.vx > 0) { const c = Math.floor((b.x + b.w) / T); for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = c * T - b.w - 0.01; wall = 1; break; } }
      else if (b.vx < 0) { const c = Math.floor(b.x / T); for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = (c + 1) * T; wall = 1; break; } }
      b.y += b.vy;
      const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 1) / T);
      if (b.vy > 0) { const r = Math.floor((b.y + b.h) / T); for (let c = c0; c <= c1; c++) if (solid(c, r)) { b.y = r * T - b.h; b.vy = 0; b.on = 1; break; } }
      else if (b.vy < 0) {
        const r = Math.floor(b.y / T), mc = Math.floor((b.x + b.w / 2) / T);
        for (const c of solid(mc, r) ? [mc] : [c0, c1]) if (solid(c, r)) { b.y = (r + 1) * T; b.vy = 0; head = { c, r }; break; }
      }
      return { wall, head };
    }
    const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    function kill(e, n) {
      e.alive = 0; add(n || 50); pop(e.x, e.y, shown(n || 50), "#FDDA24"); K.tone(880, 0.08, "square", 0.05);
      for (let k = 0; k < 8; k++) parts.push({ x: e.x + 15, y: e.y + 12, vx: Math.random() * 6 - 3, vy: -Math.random() * 5, life: 30, c: e.k === "s" ? "#5aa832" : "#8d96a3" });
    }
    function breakB(c, r) { lv.g[r][c] = "."; add(20); K.tone(180, 0.1, "square", 0.05); for (let k = 0; k < 6; k++) parts.push({ x: c * T + 20, y: r * T + 20, vx: Math.random() * 6 - 3, vy: -Math.random() * 6 - 2, life: 40, c: "#c4622d" }); }
    function bump(h) {
      const t = tile(h.c, h.r);
      if (t === "i") { lv.g[h.r][h.c] = "u"; bonusBox(h); }
      else if (t === "B") { if (ch.p === "head") breakB(h.c, h.r); else { pop(h.c * T + 4, h.r * T - 6, "طق", "#fff"); K.tone(240, 0.05, "triangle", 0.06); } }
    }
    function hurt() {
      if (p.inv > 0 || p.shield > 0) return;
      lives--; p.inv = 100; p.vy = -7; shake = 10; K.sfx.bad();
      if (lives <= 0) gameOver();
    }
    function usePower() {
      const k = ch.p;
      if (cd > 0 && k !== "hammer") return;
      if (k === "fire" && shots.length < 3) { shots.push({ t: "fire", x: p.x + 14 + p.face * 14, y: p.y + 14, vx: p.face * 7, vy: 2, life: 110 }); cd = CD.fire; K.tone(320, 0.12, "sawtooth", 0.05); }
      else if (k === "ice" && shots.length < 2) { shots.push({ t: "ice", x: p.x + 14 + p.face * 14, y: p.y + 14, vx: p.face * 8, vy: 0, life: 70 }); cd = CD.ice; K.tone(1200, 0.1, "sine", 0.08); }
      else if (k === "sword") { p.swing = 14; cd = CD.sword; K.tone(600, 0.08, "triangle", 0.08); }
      else if (k === "shield") { p.shield = 180; cd = CD.shield; K.tone(500, 0.3, "sine", 0.08); }
      else if (k === "ghost") { p.ghost = 150; cd = CD.ghost; K.tone(300, 0.4, "sine", 0.06); }
      else if (k === "thunder") { lv.en.forEach((e) => { if (e.alive && e.x > cam - 20 && e.x < cam + VW) kill(e, 80); }); flash = 18; shake = 12; cd = CD.thunder; K.tone(90, 0.5, "sawtooth", 0.08); }
      else if (k === "hammer" && !p.on && !p.pound) { p.pound = 1; p.vy = 15; }
    }
    function update() {
      frame++; if (banner > 0) banner--;
      const P = p, L = keys.l || padIn.l, R = keys.r || padIn.r, J = keys.j || padIn.j;
      const max = ch.p === "speed" ? 6.8 : 4.6, ac = P.on ? 0.7 : 0.45;
      if (L && !R) { P.vx = Math.max(P.vx - ac, -max); P.face = -1; }
      else if (R && !L) { P.vx = Math.min(P.vx + ac, max); P.face = 1; }
      else { P.vx *= P.on ? 0.72 : 0.95; if (Math.abs(P.vx) < 0.1) P.vx = 0; }
      if (jp) {
        if (P.on) { P.vy = ch.p === "legs" ? -16.5 : -13.2; K.tone(520, 0.08, "square", 0.03); }
        else if (ch.p === "double" && P.air > 0) { P.vy = -12; P.air--; K.tone(700, 0.08, "square", 0.03); for (let k = 0; k < 6; k++) parts.push({ x: P.x + 14, y: P.y + P.h, vx: Math.random() * 4 - 2, vy: Math.random() * 2, life: 20, c: "#fff" }); }
      }
      if (!J && P.vy < -5 && !P.pound) P.vy = -5;
      P.vy = Math.min(P.vy + 0.6, 15);
      if (ch.p === "glide" && J && !P.on && P.vy > 1.6) P.vy = 1.6;
      if (pp) usePower();
      jp = pp = 0;
      const res = move(P); if (P.x < 0) P.x = 0;
      if (P.on) {
        P.air = 1;
        if (P.pound) {
          P.pound = 0; shake = 10; K.tone(120, 0.25, "square", 0.08);
          lv.en.forEach((e) => { if (e.alive && Math.abs(e.x - P.x) < 140 && Math.abs(e.y - P.y) < 80) kill(e, 60); });
          for (let k = 0; k < 14; k++) parts.push({ x: P.x + 14, y: P.y + P.h, vx: Math.random() * 10 - 5, vy: -Math.random() * 4, life: 30, c: "#d8c9a8" });
        }
        const c0 = Math.floor(P.x / T), c1 = Math.floor((P.x + P.w) / T), r = Math.floor((P.y + P.h + 2) / T);
        if ([-2, -1, 0, 1, 2, 3, 4].every((d) => solid(c0 + d, r))) P.safe = { x: P.x, y: P.y };   // نقطة العودة بعد السقوط: ليست على الحافة
      }
      if (res.head) bump(res.head);
      if (ovOpen) return;
      P.anim += Math.abs(P.vx);
      if (P.inv > 0) P.inv--; if (P.shield > 0) P.shield--; if (P.ghost > 0) P.ghost--; if (P.swing > 0) P.swing--; if (cd > 0) cd--;
      // الجمع (المغناطيس يجمع من بعيد)
      const Rg = ch.p === "magnet" ? 3 : 0;
      for (let r = Math.floor(P.y / T) - Rg; r <= Math.floor((P.y + P.h) / T) + Rg; r++)
        for (let c = Math.floor(P.x / T) - Rg; c <= Math.floor((P.x + P.w) / T) + Rg; c++) {
          const t = tile(c, r);
          if (t === "W") { lv.g[r][c] = "."; waf++; add(10); pop(c * T + 4, r * T, shown(10)); K.sfx.pop(); }
          else if (t === "C") { lv.g[r][c] = "."; add(30); pop(c * T + 4, r * T, shown(30), "#FDDA24"); K.sfx.pop(); }
        }
      if (P.swing > 0) {
        const sb = { x: P.face > 0 ? P.x + P.w : P.x - 40, y: P.y, w: 40, h: P.h };
        lv.en.forEach((e) => { if (e.alive && hit(sb, e)) kill(e); });
        for (let r = Math.floor(sb.y / T); r <= Math.floor((sb.y + sb.h) / T); r++) for (let c = Math.floor(sb.x / T); c <= Math.floor((sb.x + sb.w) / T); c++) if (tile(c, r) === "B") breakB(c, r);
      }
      shots.forEach((s) => {
        s.life--; if (s.t === "fire") s.vy += 0.5; s.x += s.vx; s.y += s.vy;
        if (s.t === "fire") { const rb = Math.floor((s.y + 7) / T); if (s.vy > 0 && solid(Math.floor(s.x / T), rb)) { s.y = rb * T - 7; s.vy = -6; } }
        if (solid(Math.floor(s.x / T), Math.floor(s.y / T)) || s.y > VH) s.life = 0;
        lv.en.forEach((e) => {
          if (e.alive && s.life > 0 && hit({ x: s.x - 7, y: s.y - 7, w: 14, h: 14 }, e)) {
            if (s.t === "fire") kill(e); else { e.fz = 320; pop(e.x, e.y, "تجمّد!", "#bfefff"); }
            s.life = 0;
          }
        });
      });
      shots = shots.filter((s) => s.life > 0);
      const sp = ch.p === "time" ? 0.5 : 1;
      for (const e of lv.en) {
        if (!e.alive || e.x > cam + VW + 120) continue;
        if (e.fz > 0) e.fz--;
        else if (e.k === "s") { e.vy = Math.min(e.vy + 0.6, 14); const v = e.vx; e.vx = v * sp; const r = move(e); e.vx = r.wall ? -v : v; if (e.y > VH + 40) e.alive = 0; }
        else { e.t += sp; const nx = e.bx + Math.sin(e.t * 0.02) * 90; e.dir = nx > e.x ? 1 : -1; e.x = nx; e.y = e.by + Math.sin(e.t * 0.06) * 18; }
        if (e.alive && hit(P, e)) {
          if (e.fz > 0) { kill(e, 70); continue; }
          if (P.ghost > 0) continue;
          if (P.vy > 0 && P.y + P.h - e.y < 20) { kill(e); P.vy = J ? -12 : -8; continue; }
          if (P.shield > 0 || P.pound) { kill(e); continue; }
          hurt(); if (ovOpen) return;
        }
      }
      if (P.y > VH + 60) {
        lives--; shake = 8; K.sfx.bad();
        if (lives <= 0) { gameOver(); return; }
        Object.assign(P, { x: P.safe.x, y: P.safe.y - 4, vx: 0, vy: 0, inv: 100, pound: 0 });
      }
      if (P.x > lv.flag * T) { cityDone(); return; }
      cam = Math.max(0, Math.min(P.x - VW * 0.4, lv.w * T - VW));
    }

    // ---------------- التحكم
    const KM = { ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r", ArrowUp: "j", w: "j", W: "j", " ": "j", Enter: "j" };
    const PW = { x: 1, X: 1, z: 1, Z: 1, k: 1, K: 1 };
    const blur = () => clearInput();
    window.addEventListener("blur", blur);
    K.mode = {
      key(e) {
        if (ovOpen) {
          // زر القفز المضغوط لحظة فتح النافذة لا يغلقها: نتجاهل التكرار وأول 350 ms
          if (e.repeat || performance.now() - ovT < 350) return true;
          if (e.key === "Backspace") { if (ovBack) ovBack(); return true; }
          return false;
        }
        if (e.pad) return true;
        if (e.key === "Backspace") { pauseMenu(); return true; }
        const k = KM[e.key];
        if (k) { if (k === "j" && !e.repeat && !keys.j) jp = 1; keys[k] = 1; }
        if ((PW[e.key] || (e.key === "ArrowDown" && ch.p === "hammer")) && !e.repeat) pp = 1;
        return true;
      },
      keyup(e) { const k = KM[e.key]; if (k) keys[k] = 0; },
      poll(list) {
        if (ovOpen) {
          // القوائم فوق اللعبة: التنقل والموافقة والرجوع من kit، بعد أن تُترك الأزرار المضغوطة لحظة فتحها
          if (ovHold) { if (list.some((gp) => [0, 1, 2, 3, 9].some((n) => gp.buttons[n] && gp.buttons[n].pressed))) return true; ovHold = false; }
          return false;
        }
        let l = 0, r = 0, j = 0, pw = 0, bk = 0;
        for (const gp of list) {
          const b = (n) => !!(gp.buttons[n] && gp.buttons[n].pressed), ax = gp.axes[0] || 0;
          if (b(14) || ax < -0.4) l = 1;
          if (b(15) || ax > 0.4) r = 1;
          if (b(0)) j = 1;                 // السفلي: قفز
          if (b(2) || b(3)) pw = 1;        // الأيسر أو العلوي: القوة
          if (b(1) || b(9)) bk = 1;        // الأيمن (أو Start): استراحة
        }
        padIn.l = l; padIn.r = r; padIn.j = j;
        if (j && !prev.j) jp = 1;
        if (pw && !prev.pw) pp = 1;
        const pauseNow = bk && !prev.bk;
        prev = { j, pw, bk };
        if (pauseNow) pauseMenu();
        return true;
      },
      stop() { cancelAnimationFrame(raf); document.body.classList.remove("playing"); window.removeEventListener("blur", blur); removeEventListener("resize", fit); K.stopSound(); window.__bel = null; },
    };

    // ---------------- الرسم
    const circ = (x, y, r) => { cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill(); };
    const hash = (k) => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    function rep(off, per, fn) { const s = -(((off % per) + per) % per); for (let x = s - per; x < VW + per; x += per) fn(x, Math.round((x + off) / per)); }
    function house(x, b, w, h, col, st) {
      cx.fillStyle = col; cx.fillRect(x, b - h, w, h);
      if (st === "step") { for (let i = 1; i <= 4; i++) cx.fillRect(x + (i * w) / 10, b - h - i * 11, w - (i * w) / 5, 12); }
      else if (st === "gold") { cx.beginPath(); cx.moveTo(x, b - h); cx.lineTo(x + w / 2, b - h - 46); cx.lineTo(x + w, b - h); cx.fill(); cx.fillStyle = "#e8c25a"; cx.fillRect(x, b - h - 3, w, 4); circ(x + w / 2, b - h - 48, 4); cx.fillRect(x + w / 2 - 1, b - h - 44, 2, 40); }
      else { cx.beginPath(); cx.moveTo(x - 3, b - h); cx.lineTo(x + w / 2, b - h - 30); cx.lineTo(x + w + 3, b - h); cx.fill(); }
      cx.fillStyle = "rgba(255,244,205,.85)";
      for (let y = b - h + 14; y < b - 24; y += 28) for (let j = 0; j < 3; j++) cx.fillRect(x + 10 + (j * (w - 20)) / 3, y, (w - 20) / 3 - 8, 16);
      cx.fillStyle = "rgba(0,0,0,.25)"; cx.fillRect(x + w / 2 - 7, b - 22, 14, 22);
    }
    const houses = (off, b, st, cols) => rep(off, 88, (x, k) => house(x + 5, b, 78, 92 + hash(k) * 70, cols[Math.floor(hash(k + 9) * cols.length)], st));
    function water() {
      const gr = cx.createLinearGradient(0, 440, 0, VH); gr.addColorStop(0, "#4f8fb8"); gr.addColorStop(1, "#1d4c6e");
      cx.fillStyle = gr; cx.fillRect(0, 440, VW, VH - 440);
      cx.fillStyle = "rgba(255,255,255,.35)";
      rep(cam * 0.9, 70, (x, k) => cx.fillRect(x + hash(k) * 30, 452 + ((k * 7) % 5) * 12 + Math.sin(frame * 0.05 + k) * 2, 26, 2));
    }
    function atom(x, b, s) {
      const cy = b - 175 * s, Q = [[0, -95], [-62, -45], [62, -45], [0, -28], [0, 0], [-62, 45], [62, 45], [0, 28], [0, 95]].map(([a, c]) => [x + a * s, cy + c * s]);
      cx.strokeStyle = "#a8b4c0"; cx.lineWidth = 6 * s;
      [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [4, 5], [4, 6], [4, 7], [5, 8], [6, 8], [7, 8], [1, 5], [2, 6], [0, 4], [4, 8]].forEach(([a, c]) => { cx.beginPath(); cx.moveTo(...Q[a]); cx.lineTo(...Q[c]); cx.stroke(); });
      cx.beginPath(); cx.moveTo(...Q[8]); cx.lineTo(x - 45 * s, b); cx.moveTo(...Q[8]); cx.lineTo(x + 45 * s, b); cx.stroke();
      Q.forEach(([a, c]) => { const g = cx.createRadialGradient(a - 5 * s, c - 6 * s, 2, a, c, 17 * s); g.addColorStop(0, "#fff"); g.addColorStop(1, "#7f8d9b"); cx.fillStyle = g; circ(a, c, 16 * s); });
    }
    function tower(x, b, w, h, col, top) {
      cx.fillStyle = col; cx.fillRect(x - w / 2, b - h, w, h); cx.fillRect(x - w * 0.35, b - h - 70, w * 0.7, 72);
      cx.beginPath(); cx.moveTo(x - w * 0.38, b - h - 70); cx.lineTo(x, b - h - 70 - top); cx.lineTo(x + w * 0.38, b - h - 70); cx.fill();
      cx.fillStyle = "rgba(0,0,0,.3)"; for (let y = b - h + 20; y < b - 30; y += 50) cx.fillRect(x - 6, y, 12, 30);
      cx.fillStyle = "#f3e6c4"; circ(x, b - h - 35, 10);
    }
    function castle(x, b) {
      cx.fillStyle = "#7d7f80"; cx.fillRect(x, b - 110, 260, 110); cx.fillRect(x + 85, b - 185, 90, 80);
      for (let k = 0; k < 13; k++) cx.fillRect(x + k * 20, b - 124, 12, 16);
      for (let k = 0; k < 5; k++) cx.fillRect(x + 85 + k * 19, b - 199, 12, 16);
      [[x - 10, b - 150], [x + 250, b - 150]].forEach(([tx, ty]) => { cx.fillRect(tx, ty, 26, 150); cx.beginPath(); cx.moveTo(tx - 4, ty); cx.lineTo(tx + 13, ty - 30); cx.lineTo(tx + 30, ty); cx.fill(); });
      cx.fillStyle = "rgba(0,0,0,.35)"; cx.fillRect(x + 115, b - 60, 30, 60);
    }
    function spire(x, b) {
      cx.fillStyle = "#b8ad97"; cx.fillRect(x - 35, b - 200, 70, 200); cx.fillRect(x - 26, b - 270, 52, 72); cx.fillRect(x - 18, b - 320, 36, 52);
      cx.beginPath(); cx.moveTo(x - 14, b - 320); cx.lineTo(x, b - 400); cx.lineTo(x + 14, b - 320); cx.fill();
      cx.fillStyle = "rgba(0,0,0,.25)"; for (let y = b - 190; y < b - 20; y += 46) cx.fillRect(x - 5, y, 10, 32);
    }
    function crane(x, b) { cx.strokeStyle = "#d8432f"; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(x, b); cx.lineTo(x, b - 170); cx.lineTo(x + 120, b - 170); cx.moveTo(x - 30, b - 170); cx.lineTo(x, b - 200); cx.lineTo(x + 120, b - 170); cx.moveTo(x + 90, b - 170); cx.lineTo(x + 90, b - 110); cx.stroke(); }
    function cliff(x, b) {
      cx.fillStyle = "#9a978f"; cx.beginPath(); cx.moveTo(x, b); cx.lineTo(x + 20, b - 230); cx.lineTo(x + 60, b - 260); cx.lineTo(x + 340, b - 260); cx.lineTo(x + 380, b - 200); cx.lineTo(x + 400, b); cx.fill();
      cx.fillStyle = "#6e6b64"; cx.fillRect(x + 70, b - 300, 250, 42); for (let k = 0; k < 13; k++) cx.fillRect(x + 70 + k * 20, b - 312, 12, 14); cx.fillRect(x + 150, b - 340, 60, 42);
      cx.strokeStyle = "rgba(0,0,0,.15)"; cx.lineWidth = 3; for (let k = 0; k < 6; k++) { cx.beginPath(); cx.moveTo(x + 40 + k * 60, b - 240); cx.lineTo(x + 30 + k * 62, b - 20); cx.stroke(); }
    }
    function onion(x, b) {
      cx.fillStyle = "#e6dccb"; cx.fillRect(x - 30, b - 180, 60, 180);
      cx.fillStyle = "#3b3a3f"; cx.beginPath(); cx.ellipse(x, b - 212, 34, 38, 0, 0, 7); cx.fill();
      cx.beginPath(); cx.moveTo(x - 12, b - 244); cx.lineTo(x, b - 290); cx.lineTo(x + 12, b - 244); cx.fill();
      cx.fillStyle = "rgba(0,0,0,.3)"; cx.fillRect(x - 7, b - 150, 14, 40);
    }
    function sax(x, b, col) {
      cx.strokeStyle = col; cx.lineWidth = 12; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(x, b - 130); cx.lineTo(x, b - 40); cx.quadraticCurveTo(x, b - 10, x + 28, b - 20); cx.lineTo(x + 34, b - 50); cx.stroke();
      cx.fillStyle = col; cx.beginPath(); cx.ellipse(x + 36, b - 56, 14, 8, -0.3, 0, 7); cx.fill();
      cx.lineWidth = 4; cx.beginPath(); cx.moveTo(x, b - 130); cx.lineTo(x - 14, b - 142); cx.stroke(); cx.lineCap = "butt";
      cx.fillStyle = "#f5f0e0"; for (let k = 0; k < 4; k++) circ(x + 6, b - 110 + k * 18, 3);
    }
    function hills(off, b, col, amp) { cx.fillStyle = col; cx.beginPath(); cx.moveTo(0, VH); for (let x = 0; x <= VW + 20; x += 20) cx.lineTo(x, b - amp - Math.sin((x + off) * 0.006) * amp - Math.sin((x + off) * 0.017) * amp * 0.4); cx.lineTo(VW + 20, VH); cx.fill(); }
    function clouds() { cx.fillStyle = "rgba(255,255,255,.85)"; rep(cam * 0.08 + frame * 0.15, 430, (x, k) => { const y = 60 + hash(k) * 70; circ(x + 60, y, 22); circ(x + 92, y - 10, 30); circ(x + 126, y, 22); cx.fillRect(x + 60, y, 66, 22); }); }
    function background() {
      const C = CITIES[li], g = cx.createLinearGradient(0, -OY, 0, VH); g.addColorStop(0, C.sky[0]); g.addColorStop(1, C.sky[1]);
      cx.fillStyle = g; cx.fillRect(0, -OY, VW, VH + OY);
      if (C.bg === "din" || C.bg === "lie") hills(cam * 0.1, 330, "#9cc79a", 40);
      clouds();
      const f = cam * 0.2, m = cam * 0.5;
      if (C.bg === "bxl") { rep(f, 760, (x) => atom(x + 300, 440, 1.05)); houses(m, 440, "gold", ["#b9874b", "#8c5a3c", "#c9a46a", "#6e4a35", "#a0613f"]); }
      else if (C.bg === "bru") { rep(f, 820, (x) => tower(x + 260, 440, 70, 230, "#8a6a4a", 40)); houses(m, 440, "step", ["#9c3b2a", "#b5523b", "#c27a4a", "#7d2e22", "#d8b07a"]); }
      else if (C.bg === "gnt") { rep(f, 900, (x) => castle(x + 200, 440)); houses(m, 440, "step", ["#d9c38f", "#a8573c", "#e2d2b0", "#7a8c6e", "#c46a3a"]); }
      else if (C.bg === "ant") {
        rep(f, 780, (x) => spire(x + 380, 440));
        rep(m, 520, (x, k) => { crane(x + 40, 440); const cols = ["#d8432f", "#2c6fb5", "#e0a52a", "#3c8a4e"]; for (let j = 0; j < 4; j++) for (let h = 0; h < 1 + ((k + j) % 3 + 3) % 3; h++) { cx.fillStyle = cols[(((k + j + h) % 4) + 4) % 4]; cx.fillRect(x + 200 + j * 62, 440 - (h + 1) * 30, 58, 28); } });
      }
      else if (C.bg === "lie") {
        rep(f, 900, (x) => { cx.strokeStyle = "#fff"; cx.lineWidth = 7; for (let k = 0; k < 5; k++) { cx.beginPath(); cx.ellipse(x + 300, 440, 200 - k * 18, 150 - k * 22, 0, Math.PI, 0); cx.stroke(); } });
        rep(m, 600, (x) => { cx.fillStyle = "#b9b2a5"; cx.beginPath(); cx.moveTo(x + 60, 440); for (let s = 0; s < 14; s++) { cx.lineTo(x + 60 + s * 12, 440 - s * 14); cx.lineTo(x + 72 + s * 12, 440 - s * 14); } cx.lineTo(x + 240, 440); cx.fill(); house(x + 260, 440, 80, 130, "#9a4a34", "tri"); house(x + 350, 440, 80, 110, "#c9b28a", "tri"); });
      }
      else if (C.bg === "din") {
        rep(f, 840, (x) => cliff(x + 250, 440));
        const SC = ["#EF3340", "#FDDA24", "#2c6fb5", "#3c8a4e"];
        rep(m, 640, (x, k) => { onion(x + 120, 440); house(x + 190, 440, 76, 110, "#d9cdb6", "tri"); house(x + 272, 440, 76, 130, "#c9b39a", "tri"); sax(x + 400, 440, SC[(k % 4 + 4) % 4]); sax(x + 470, 440, SC[((k + 1) % 4 + 4) % 4]); });
      }
      if (C.water) water(); else { cx.fillStyle = "#4a4d55"; cx.fillRect(0, 440, VW, VH - 440); }
    }
    function drawTiles() {
      const C = CITIES[li], c0 = Math.floor(cam / T), c1 = c0 + Math.ceil(VW / T) + 1;
      cx.textAlign = "center";
      for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
        const t = tile(c, r); if (t === ".") continue;
        const x = c * T - cam, y = r * T;
        if (t === "#") {
          cx.fillStyle = C.gr[1]; cx.fillRect(x, y, T, T); cx.fillStyle = C.gr[2];
          const o = (r % 2) * 20; cx.fillRect(x, y + 19, T, 2); cx.fillRect(x + o, y, 2, 19); cx.fillRect(x + ((o + 20) % 40), y + 21, 2, 19);
          if (!solid(c, r - 1)) { cx.fillStyle = C.gr[0]; cx.fillRect(x, y, T, 11); if (c % 2 === 0) { cx.fillStyle = "#f4f4f4"; cx.fillRect(x + 8, y + 4, 22, 3); } }
        } else if (t === "B") {
          cx.fillStyle = "#c4622d"; cx.fillRect(x, y, T, T); cx.fillStyle = "#8e3f1a"; cx.fillRect(x, y + 19, T, 2); cx.fillRect(x + 19, y, 2, 19); cx.fillRect(x + 8, y + 21, 2, 19); cx.fillRect(x + 30, y + 21, 2, 19);
          cx.strokeStyle = "#6a2c10"; cx.lineWidth = 2; cx.strokeRect(x + 1, y + 1, T - 2, T - 2);
        } else if (t === "i") {
          const bo = Math.sin(frame * 0.1 + c) * 1.5;
          cx.fillStyle = "#FDDA24"; cx.fillRect(x + 1, y + 1, T - 2, T - 2); cx.strokeStyle = "#141414"; cx.lineWidth = 3; cx.strokeRect(x + 2, y + 2, T - 4, T - 4);
          cx.fillStyle = "#EF3340"; cx.beginPath();
          for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? 5 : 12; cx.lineTo(x + 20 + Math.cos(a) * rr, y + 21 + bo + Math.sin(a) * rr); }
          cx.fill();
          cx.fillStyle = "#141414"; cx.fillRect(x + 4, y + 4, 4, 4); cx.fillRect(x + T - 8, y + 4, 4, 4);
        } else if (t === "u") {
          cx.fillStyle = "#8a6a3a"; cx.fillRect(x + 1, y + 1, T - 2, T - 2); cx.strokeStyle = "#5a4220"; cx.lineWidth = 3; cx.strokeRect(x + 2, y + 2, T - 4, T - 4);
        } else if (t === "W") {
          const b = Math.sin(frame * 0.08 + c) * 3;
          cx.fillStyle = "#b9772a"; cx.fillRect(x + 7, y + 9 + b, 26, 24); cx.fillStyle = "#e7a84e"; cx.fillRect(x + 8, y + 8 + b, 24, 22);
          cx.fillStyle = "#b9772a"; for (let k = 1; k < 4; k++) { cx.fillRect(x + 8 + k * 6, y + 8 + b, 2, 22); cx.fillRect(x + 8, y + 8 + b + k * 5.5, 24, 2); }
          cx.fillStyle = "#fff"; cx.fillRect(x + 10, y + 10 + b, 5, 2);
        } else if (t === "C") {
          const b = Math.sin(frame * 0.08 + c) * 3;
          cx.fillStyle = "#4a2818"; cx.fillRect(x + 10, y + 6 + b, 20, 28); cx.fillStyle = "#6b3b24"; for (let k = 0; k < 3; k++) cx.fillRect(x + 12, y + 8 + b + k * 9, 16, 7);
          cx.fillStyle = "#d9d9d9"; cx.beginPath(); cx.moveTo(x + 10, y + 22 + b); cx.lineTo(x + 30, y + 14 + b); cx.lineTo(x + 30, y + 34 + b); cx.lineTo(x + 10, y + 34 + b); cx.fill();
          cx.fillStyle = "#EF3340"; cx.fillRect(x + 10, y + 26 + b, 20, 5);
        }
      }
      const fx = lv.flag * T - cam + 20;
      if (fx > -80 && fx < VW + 80) {
        cx.fillStyle = "#e9e9e9"; cx.fillRect(fx - 3, 120, 6, 320); cx.fillStyle = "#FDDA24"; circ(fx, 118, 8);
        const wv = Math.sin(frame * 0.1) * 4;
        [["#141414", 0], ["#FDDA24", 1], ["#EF3340", 2]].forEach(([c, k]) => { cx.fillStyle = c; cx.beginPath(); cx.moveTo(fx + 3 + k * 24, 130 + wv * (k / 2)); cx.lineTo(fx + 27 + k * 24, 130 + wv * ((k + 1) / 2)); cx.lineTo(fx + 27 + k * 24, 194 + wv * ((k + 1) / 2)); cx.lineTo(fx + 3 + k * 24, 194 + wv * (k / 2)); cx.fill(); });
      }
    }
    function drawEnemy(e) {
      const x = e.x - cam, y = e.y; if (x < -60 || x > VW + 60) return;
      if (e.k === "s") {
        const m = x + 15, n = y + 15, w = Math.sin(frame * 0.25 + e.x) * 2;
        cx.fillStyle = "#2f6b1a"; cx.fillRect(m - 10 + w, n + 12, 7, 4); cx.fillRect(m + 3 - w, n + 12, 7, 4);
        cx.fillStyle = "#4f9a2f"; circ(m, n, 15); cx.fillStyle = "#7cc744"; circ(m - 3, n - 3, 10);
        cx.strokeStyle = "#2f6b1a"; cx.lineWidth = 2; cx.beginPath(); cx.arc(m - 12, n + 4, 14, -1.1, 0.6); cx.stroke(); cx.beginPath(); cx.arc(m + 12, n + 4, 14, 2.5, 4.2); cx.stroke();
        const d = e.vx > 0 ? 1.5 : -1.5; cx.fillStyle = "#fff"; circ(m - 5, n - 2, 4); circ(m + 5, n - 2, 4);
        cx.fillStyle = "#141414"; circ(m - 5 + d, n - 1, 2); circ(m + 5 + d, n - 1, 2); cx.fillRect(m - 9, n - 8, 6, 2); cx.fillRect(m + 3, n - 8, 6, 2);
      } else {
        const d = e.dir, m = x + 16, n = y + 12, fl = Math.sin(frame * 0.4) * 6;
        cx.fillStyle = "#8d96a3"; cx.beginPath(); cx.ellipse(m, n, 14, 9, 0, 0, 7); cx.fill(); cx.fillStyle = "#6b7685"; circ(m + d * 12, n - 6, 6);
        cx.fillStyle = "#5aa38a"; cx.fillRect(m + d * 8 - 2, n - 3, 5, 4);
        cx.fillStyle = "#e38b2a"; cx.beginPath(); cx.moveTo(m + d * 17, n - 7); cx.lineTo(m + d * 23, n - 5); cx.lineTo(m + d * 17, n - 3); cx.fill();
        cx.fillStyle = "#141414"; circ(m + d * 14, n - 8, 1.5);
        cx.fillStyle = "#737d8b"; cx.beginPath(); cx.moveTo(m - 8, n - 3); cx.lineTo(m - d * 2, n - 16 - fl); cx.lineTo(m + 6, n - 3); cx.fill();
      }
      if (e.fz > 0) { cx.fillStyle = "rgba(170,225,255,.6)"; cx.fillRect(x - 3, y - 3, e.w + 6, e.h + 6); cx.strokeStyle = "#fff"; cx.lineWidth = 2; cx.strokeRect(x - 3, y - 3, e.w + 6, e.h + 6); }
    }
    function hud() {
      cx.setTransform(sc, 0, 0, sc, 0, 0);
      cx.fillStyle = "rgba(20,20,20,.72)"; cx.fillRect(0, 0, VW, 56);
      cx.fillStyle = "#141414"; cx.fillRect(0, 56, VW / 3, 5); cx.fillStyle = "#FDDA24"; cx.fillRect(VW / 3, 56, VW / 3, 5); cx.fillStyle = "#EF3340"; cx.fillRect((VW * 2) / 3, 56, VW / 3, 5);
      cx.direction = "rtl"; cx.textAlign = "right"; cx.textBaseline = "middle";
      cx.font = `800 30px ${FONT}`; cx.fillStyle = "#FDDA24"; cx.fillText(`${CITIES[li].e} ${CITIES[li].n}`, VW - 16, 30);
      cx.font = `800 26px ${FONT}`; cx.fillStyle = "#fff";
      cx.fillText(`النقاط ${score}`, VW - 230, 30);
      cx.fillText(`🧇 ${waf}`, VW - 420, 30);
      cx.fillStyle = "#EF3340"; cx.fillText("♥".repeat(Math.max(0, lives)), VW - 530, 30);
      cx.textAlign = "left"; cx.direction = "ltr";
      drawHero(cx, 30, 6, ch, { face: 1, on: 1 });
      cx.direction = "rtl"; cx.textAlign = "left"; cx.fillStyle = "#fff"; cx.font = `800 22px ${FONT}`;
      cx.fillText(ch.pl, 60, 22);
      const m = CD[ch.p], f = m ? 1 - cd / m : 1;
      cx.fillStyle = "#444"; cx.fillRect(60, 38, 140, 10); cx.fillStyle = f >= 1 ? "#4ade80" : "#FDDA24"; cx.fillRect(60, 38, 140 * f, 10);
      cx.direction = "ltr";
      if (banner > 0) {
        const a = Math.min(1, banner / 30);
        cx.globalAlpha = a; cx.textAlign = "center"; cx.direction = "rtl";
        cx.fillStyle = "rgba(255,255,255,.9)"; cx.fillRect(VW / 2 - 260, 150, 520, 120);
        cx.fillStyle = "#EF3340"; cx.fillRect(VW / 2 - 260, 150, 520, 8);
        cx.fillStyle = "#141414"; cx.font = `800 46px ${FONT}`; cx.fillText(`${CITIES[li].e} ${CITIES[li].n}`, VW / 2, 200);
        cx.font = `700 22px ${FONT}`; cx.fillText(`المدينة ${li + 1} من ${CITIES.length} · اقفز من طريق إلى طريق واصعد`, VW / 2, 245);
        cx.globalAlpha = 1; cx.direction = "ltr";
      }
      cx.textBaseline = "alphabetic";
    }
    function draw() {
      cx.setTransform(sc, 0, 0, sc, 0, 0);
      cx.save();
      if (shake > 0) { cx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.85; if (shake < 0.5) shake = 0; }
      cx.translate(0, OY);
      background(); drawTiles();
      lv.en.forEach((e) => { if (e.alive) drawEnemy(e); });
      shots.forEach((s) => { const x = s.x - cam; if (s.t === "fire") { cx.fillStyle = "#ff7a1a"; circ(x, s.y, 8); cx.fillStyle = "#FDDA24"; circ(x, s.y, 4); } else { cx.fillStyle = "#bfefff"; circ(x, s.y, 8); cx.fillStyle = "#fff"; circ(x - 2, s.y - 2, 3); } });
      const P = p, hx = P.x + P.w / 2 - cam;
      if (!(P.inv > 0 && Math.floor(P.inv / 5) % 2)) drawHero(cx, hx, P.y, ch, { face: P.face, anim: P.anim, on: P.on, alpha: P.ghost > 0 ? 0.45 : 1 });
      if (P.shield > 0) { cx.strokeStyle = "rgba(120,200,255,.9)"; cx.lineWidth = 3; cx.fillStyle = "rgba(120,200,255,.18)"; cx.beginPath(); cx.arc(hx, P.y + P.h / 2, 32, 0, 7); cx.fill(); cx.stroke(); }
      if (P.swing > 0) { cx.strokeStyle = "rgba(255,255,255,.9)"; cx.lineWidth = 5; cx.beginPath(); const a = P.face > 0 ? 0 : Math.PI; cx.arc(hx, P.y + P.h / 2, 38, a - 1.2 + (14 - P.swing) * 0.12 * P.face, a + 0.4 * P.face); cx.stroke(); }
      if (!ovOpen) parts.forEach((q) => { q.x += q.vx; q.y += q.vy; q.vy += 0.3; q.life--; });
      parts.forEach((q) => { cx.fillStyle = q.c; cx.fillRect(q.x - cam, q.y, 5, 5); });
      parts = parts.filter((q) => q.life > 0);
      cx.textAlign = "center"; cx.font = `800 22px ${FONT}`;
      pops.forEach((q) => { if (!ovOpen) { q.y -= 0.8; q.life--; } cx.lineWidth = 4; cx.strokeStyle = "#141414"; cx.strokeText(q.t, q.x + 16 - cam, q.y); cx.fillStyle = q.c; cx.fillText(q.t, q.x + 16 - cam, q.y); });
      pops = pops.filter((q) => q.life > 0);
      cx.restore();
      if (flash > 0) { cx.fillStyle = `rgba(255,250,200,${flash / 24})`; cx.fillRect(0, 0, VW, 540); flash--; }
      hud();
    }
    function fit() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
      sc = cv.height / 540; VW = cv.width / sc;
    }
    fit(); addEventListener("resize", fit);
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (!ovOpen) {
        acc += lastT ? Math.min(100, t - lastT) : 16.7; lastT = t;
        while (acc >= 1000 / 60 && !ovOpen) { update(); acc -= 1000 / 60; }
      }
      draw();
    }
    // للتجربة الآلية
    window.__bel = {
      get st() { return { li, score, lives, waf, x: p.x, y: p.y, on: p.on, flag: lv.flag * T, ov: ovOpen, ovText: ovOpen ? ovl.textContent.trim().slice(0, 80) : "", enemies: lv.en.filter((e) => e.alive).length, cd }; },
      warp(x) { p.x = x; p.y = 0; p.vy = 0; },
      level: () => lv,
    };
    startLevel(li);
    raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- النهاية
  function final(r) {
    K.begin(); K.onFocus = null;
    const newBest = r.score >= save.best;
    if (r.score > save.best) { save.best = r.score; save.save(); }
    K.paint(`<div class="top">${K.backBtn()}<span></span><span class="pill"><span class="emo">🏆</span> ${save.best}</span></div>
      <h1>اكتشفت بلجيكا كلها! 🎉</h1>
      <div class="hero">${portrait(r.ch, "heroP")}<div class="won"><span class="emo">⭐</span> ${r.score} نقطة · <span class="emo">🧇</span> ${r.waf}</div></div>
      <div class="sub">${newBest ? "نتيجة جديدة هي الأفضل! 🏆" : "زرت المدن الست كلها"}</div>
      <div class="nav">
        <button class="btn f go" ${K.act("again", () => K.replace(chars))}><span class="emo">🔁</span> بطل آخر</button>
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>${HELP}`, "again");
    K.sfx.win(); K.confetti(40, "⭐🎉🧇🍫");
    K.tts("أحسنت! اكتشفت بلجيكا كلها");
  }

  window.__belDbg = { save, play: (c) => K.show(play, { city: c || 0 }) };
  K.start(home);
})();
