// مسابقة العائلة — مسابقة أسئلة على التلفاز لـ 1 إلى 4 لاعبين.
// وضعان: كل لاعب بيد تحكم (أول ضغطة ✕ من كل يد تسجّله)، أو بالدور على ريموت واحد.
// ثلاث جولات: سؤال للجميع، جولة الصورة (تنكشف تدريجياً)، جولة السرعة (صح أم خطأ).
(() => {
  "use strict";
  const GAME = "مسابقة العائلة";
  const save = K.store("family-quiz", { level: "k", cats: ["din", "geo", "sci", "ani", "lng", "gen"], seen: {}, games: 0 });
  const QB = window.QB, PICS = window.PICS;

  const CATS = [
    { id: "din", name: "الدين", icon: "🕌", c: "#0f766e" },
    { id: "geo", name: "جغرافيا", icon: "🌍", c: "#2563eb" },
    { id: "sci", name: "علوم", icon: "🔬", c: "#7c3aed" },
    { id: "ani", name: "حيوانات", icon: "🐾", c: "#ea580c" },
    { id: "lng", name: "لغات", icon: "🔤", c: "#db2777" },
    { id: "gen", name: "معلومات عامة", icon: "💡", c: "#ca8a04" },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));
  const LV = {
    s: { name: "صغار", icon: "🧸", sub: "حتى 6 سنوات", time: 20 },
    k: { name: "أطفال", icon: "🎒", sub: "7 – 11 سنة", time: 15 },
    b: { name: "كبار", icon: "🎓", sub: "12 سنة فأكثر", time: 12 },
  };
  const PL = [
    { name: "النجمة", c: "#ef4444", d: "#991b1b", sym: "star" },
    { name: "الهلال", c: "#3b82f6", d: "#1e3a8a", sym: "moon" },
    { name: "القلب", c: "#22c55e", d: "#166534", sym: "heart" },
    { name: "الزهرة", c: "#f59e0b", d: "#92400e", sym: "flower" },
  ];

  // ------------------------------------------------------------ رسوم SVG
  const starPts = (cx, cy, R, r, n = 5, rot = -90) => {
    const p = [];
    for (let i = 0; i < n * 2; i++) {
      const a = ((rot + (i * 180) / n) * Math.PI) / 180, rr = i % 2 ? r : R;
      p.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  };
  const SYM = {
    star: (c) => `<svg viewBox="0 0 100 100"><polygon points="${starPts(50, 54, 46, 20)}" fill="${c}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>`,
    moon: (c) => `<svg viewBox="0 0 100 100"><path d="M64 6A46 46 0 1 0 64 94A58 58 0 0 1 64 6Z" fill="${c}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>`,
    heart: (c) => `<svg viewBox="0 0 100 100"><path d="M50 90C20 68 6 52 6 33C6 19 17 9 30 9C40 9 46 15 50 23C54 15 60 9 70 9C83 9 94 19 94 33C94 52 80 68 50 90Z" fill="${c}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>`,
    flower: (c) => `<svg viewBox="0 0 100 100">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${50 + 26 * Math.cos(((a - 90) * Math.PI) / 180)}" cy="${50 + 26 * Math.sin(((a - 90) * Math.PI) / 180)}" r="20" fill="${c}" stroke="#fff" stroke-width="5"/>`).join("")}<circle cx="50" cy="50" r="16" fill="#fff7cc" stroke="#fff" stroke-width="4"/></svg>`,
  };
  const sym = (p) => SYM[p.sym](p.c);

  // تميمة اللعبة: فانوس مبتسم (رسم أصلي)
  const LANTERN = `<svg class="lantern" viewBox="0 0 120 170" aria-hidden="true">
    <path d="M60 4v14" stroke="#fde68a" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="6" r="6" fill="#fde68a"/>
    <path d="M36 30h48l-6-12H42z" fill="#f59e0b"/><rect x="30" y="30" width="60" height="10" rx="4" fill="#d97706"/>
    <path d="M28 40h64c6 26 6 62 0 88H28c-6-26-6-62 0-88z" fill="#fbbf24"/>
    <path d="M38 46h44c4 22 4 54 0 76H38c-4-22-4-54 0-76z" fill="#fff7cc"/>
    <path d="M60 52c-14 14-14 28 0 34 14-6 14-20 0-34z" fill="#fb923c" opacity=".55"/>
    <circle cx="49" cy="94" r="5" fill="#1e1b4b"/><circle cx="71" cy="94" r="5" fill="#1e1b4b"/>
    <circle cx="51" cy="92" r="1.6" fill="#fff"/><circle cx="73" cy="92" r="1.6" fill="#fff"/>
    <path d="M50 106q10 9 20 0" stroke="#1e1b4b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="42" cy="104" r="4" fill="#fb7185" opacity=".6"/><circle cx="78" cy="104" r="4" fill="#fb7185" opacity=".6"/>
    <rect x="30" y="128" width="60" height="10" rx="4" fill="#d97706"/><path d="M40 138h40l-8 14H48z" fill="#f59e0b"/>
    <path d="M28 40c-6 26-6 62 0 88M92 40c6 26 6 62 0 88" stroke="#d97706" stroke-width="3" fill="none"/></svg>`;

  const TROPHY = `<svg class="trophy" viewBox="0 0 120 130" aria-hidden="true">
    <path d="M30 14h60v26c0 22-14 38-30 38S30 62 30 40z" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>
    <path d="M30 22H12c0 22 10 32 22 34M90 22h18c0 22-10 32-22 34" stroke="#ca8a04" stroke-width="6" fill="none"/>
    <rect x="52" y="76" width="16" height="20" fill="#eab308"/><rect x="34" y="96" width="52" height="12" rx="3" fill="#ca8a04"/>
    <rect x="26" y="108" width="68" height="14" rx="4" fill="#92400e"/>
    <polygon points="${starPts(60, 40, 15, 6.5)}" fill="#fff"/></svg>`;

  const FL = (body) => `<svg class="flag" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet"><rect width="300" height="200" fill="#fff"/>${body}<rect width="300" height="200" fill="none" stroke="rgba(0,0,0,.15)" stroke-width="3"/></svg>`;
  const H3 = (a, b, c) => `<rect width="300" height="67" fill="${a}"/><rect y="67" width="300" height="66" fill="${b}"/><rect y="133" width="300" height="67" fill="${c}"/>`;
  const V3 = (a, b, c) => `<rect width="100" height="200" fill="${a}"/><rect x="100" width="100" height="200" fill="${b}"/><rect x="200" width="100" height="200" fill="${c}"/>`;
  let mk = 0;
  const crescent = (cx, cy, R, dx, r, fill) => { const id = "m" + ++mk; return `<mask id="${id}"><rect width="300" height="200" fill="#fff"/><circle cx="${cx + dx}" cy="${cy}" r="${r}" fill="#000"/></mask><circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}" mask="url(#${id})"/>`; };
  const star = (cx, cy, R, fill, rot = -90, n = 5, k = 0.4) => `<polygon points="${starPts(cx, cy, R, R * k, n, rot)}" fill="${fill}"/>`;
  const FLAGS = {
    jp: () => FL(`<circle cx="150" cy="100" r="60" fill="#bc002d"/>`),
    fr: () => FL(V3("#0055a4", "#fff", "#ef4135")),
    it: () => FL(V3("#009246", "#fff", "#ce2b37")),
    be: () => FL(V3("#000", "#fdda24", "#ef3340")),
    de: () => FL(H3("#000", "#dd0000", "#ffce00")),
    ye: () => FL(H3("#ce1126", "#fff", "#000")),
    id: () => FL(`<rect width="300" height="100" fill="#ce1126"/>`),
    ng: () => FL(V3("#008751", "#fff", "#008751")),
    ma: () => FL(`<rect width="300" height="200" fill="#c1272d"/><polygon points="${(() => { const p = []; for (let i = 0; i < 5; i++) { const a = ((-90 + i * 144) * Math.PI) / 180; p.push((150 + 52 * Math.cos(a)).toFixed(1) + "," + (102 + 52 * Math.sin(a)).toFixed(1)); } return p.join(" "); })()}" fill="none" stroke="#006233" stroke-width="9" stroke-linejoin="miter"/>`),
    ps: () => FL(H3("#000", "#fff", "#007a3d") + `<polygon points="0,0 110,100 0,200" fill="#ce1126"/>`),
    jo: () => FL(H3("#000", "#fff", "#007a3d") + `<polygon points="0,0 150,100 0,200" fill="#ce1126"/>` + star(50, 100, 18, "#fff", -90, 7, 0.45)),
    sd: () => FL(H3("#d21034", "#fff", "#000") + `<polygon points="0,0 110,100 0,200" fill="#007229"/>`),
    kw: () => FL(H3("#007a3d", "#fff", "#ce1126") + `<polygon points="0,0 75,67 75,133 0,200" fill="#000"/>`),
    ae: () => FL(H3("#00732f", "#fff", "#000") + `<rect width="75" height="200" fill="#ff0000"/>`),
    tr: () => FL(`<rect width="300" height="200" fill="#e30a17"/>` + crescent(110, 100, 50, 13, 40, "#fff") + star(170, 100, 22, "#fff", 180)),
    tn: () => FL(`<rect width="300" height="200" fill="#e70013"/><circle cx="150" cy="100" r="50" fill="#fff"/>` + crescent(143, 100, 38, 9, 31, "#e70013") + star(160, 100, 20, "#e70013", 180)),
    dz: () => FL(`<rect width="150" height="200" fill="#006233"/>` + crescent(150, 100, 52, 13, 42, "#d21034") + star(170, 100, 22, "#d21034", 180)),
    ly: () => FL(`<rect width="300" height="50" fill="#e70013"/><rect y="50" width="300" height="100" fill="#000"/><rect y="150" width="300" height="50" fill="#239e46"/>` + crescent(142, 100, 30, 8, 24, "#fff") + star(162, 100, 13, "#fff", 180)),
    mr: () => FL(`<rect width="300" height="200" fill="#00a95c"/><rect width="300" height="28" fill="#d01c1f"/><rect y="172" width="300" height="28" fill="#d01c1f"/>` + crescent(150, 95, 50, 0, 46, "#ffd700").replace(/cx="150" cy="95" r="46"/, 'cx="150" cy="83" r="46"') + star(150, 78, 18, "#ffd700")),
    bd: () => FL(`<rect width="300" height="200" fill="#006a4e"/><circle cx="135" cy="100" r="60" fill="#f42a41"/>`),
    se: () => FL(`<rect width="300" height="200" fill="#006aa7"/><rect x="94" width="37" height="200" fill="#fecc00"/><rect y="81" width="300" height="38" fill="#fecc00"/>`),
    qa: () => { let d = "M0 0H80"; const n = 9, h = 200 / n; for (let i = 0; i < n; i++) d += `L110 ${(i + 0.5) * h}L80 ${(i + 1) * h}`; return FL(`<rect width="300" height="200" fill="#8a1538"/><path d="${d}L0 200Z" fill="#fff"/>`); },
  };
  const SHAPES = {
    circle: `<circle cx="100" cy="100" r="80" fill="#ef4444"/>`,
    square: `<rect x="25" y="25" width="150" height="150" rx="6" fill="#3b82f6"/>`,
    triangle: `<polygon points="100,18 186,172 14,172" fill="#22c55e"/>`,
    star: `<polygon points="${starPts(100, 106, 90, 38)}" fill="#facc15"/>`,
    heart: `<path d="M100 180C40 136 12 104 12 66C12 38 34 18 60 18C80 18 92 30 100 46C108 30 120 18 140 18C166 18 188 38 188 66C188 104 160 136 100 180Z" fill="#ec4899"/>`,
    rect: `<rect x="8" y="50" width="184" height="100" rx="6" fill="#a855f7"/>`,
    hexagon: `<polygon points="${[0, 60, 120, 180, 240, 300].map((a) => (100 + 85 * Math.cos((a * Math.PI) / 180)).toFixed(1) + "," + (100 + 85 * Math.sin((a * Math.PI) / 180)).toFixed(1)).join(" ")}" fill="#f97316"/>`,
  };
  const picHtml = (it) => {
    if (it.f) return FLAGS[it.f]();
    if (it.sh) return `<svg class="shape" viewBox="0 0 200 200">${SHAPES[it.sh]}</svg>`;
    if (it.co) return `<svg class="shape" viewBox="0 0 200 200"><path d="M100 14c50 0 86 30 86 82s-40 90-90 90S14 150 14 100 50 14 100 14z" fill="${it.co}"/><ellipse cx="70" cy="62" rx="22" ry="12" fill="#fff" opacity=".35"/></svg>`;
    if (it.n) return `<div class="count">${K.shuffle(K.range(0, it.n)).map(() => `<span class="emo">${it.e}</span>`).join("")}</div>`;
    return `<span class="emo big">${it.p}</span>`;
  };
  const picQ = (it) => it.q || (it.f ? "علمُ أيِّ بلد هذا؟" : it.sh ? "ما اسم هذا الشكل؟" : it.co ? "ما هذا اللون؟" : it.c === "ani" ? "ما هذا الحيوان؟" : "ما هذا؟");

  // ------------------------------------------------------------ أصوات إضافية (Web Audio)
  const S = {
    jingle() { [392, 523, 659, 587, 784].forEach((f, i) => K.tone(f, 0.22, "triangle", 0.11, i * 0.13)); },
    join(i) { const b = [523, 587, 659, 784][i] || 523; K.tone(b, 0.12, "triangle", 0.14); K.tone(b * 1.5, 0.18, "triangle", 0.12, 0.09); },
    lock(i) { K.tone([700, 780, 860, 940][i] || 700, 0.07, "triangle", 0.1); },
    tick() { K.tone(980, 0.05, "square", 0.04); },
    timeup() { K.tone(330, 0.18, "sawtooth", 0.06); K.tone(262, 0.3, "sawtooth", 0.06, 0.16); },
    fanfare() { [[523, 0], [659, 0.16], [784, 0.32], [1047, 0.5], [784, 0.74], [1047, 0.9]].forEach(([f, t]) => { K.tone(f, 0.3, "triangle", 0.12, t); K.tone(f / 2, 0.3, "sine", 0.08, t); }); },
  };

  // ------------------------------------------------------------ يد التحكم: أحداث لكل يد على حدة
  const PS = {};
  function padEvents(pads, ts) {
    const ev = [];
    for (const g of pads) {
      const s = PS[g.index] || (PS[g.index] = { dir: null, next: 0, btn: [] });
      const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      const dir = b(12) || ay < -0.6 ? "Up" : b(13) || ay > 0.6 ? "Down" : b(14) || ax < -0.6 ? "Left" : b(15) || ax > 0.6 ? "Right" : null;
      if (dir && (dir !== s.dir || ts > s.next)) { ev.push({ id: "p" + g.index, key: "Arrow" + dir, first: dir !== s.dir }); s.next = ts + (dir !== s.dir ? 400 : 170); }
      s.dir = dir;
      for (const [i, k] of [[0, "Enter"], [1, "Backspace"], [9, "Start"]]) { const p = b(i); if (p && !s.btn[i]) ev.push({ id: "p" + g.index, key: k, first: true }); s.btn[i] = p; }
    }
    return ev;
  }
  const DIRMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  const navKey = (key) => {
    if (DIRMAP[key]) K.move(DIRMAP[key]);
    else if (key === "Enter" || key === "Start") K.press();
    else if (key === "Backspace") K.back();
  };
  // في شاشات القوائم: كل الأيادي تتنقل
  const menuMode = () => { K.mode = { poll(pads, ts) { padEvents(pads, ts).forEach((e) => navKey(e.key)); return true; } }; };

  // ------------------------------------------------------------ النجوم
  function earn(amount, reason) {
    return fetch("/api/tv/stars/earn", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, game: GAME, reason }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => (d && d.added > 0 ? d.added : 0)).catch(() => 0);
  }

  // ------------------------------------------------------------ اختيار الأسئلة (الجديدة أولاً)
  const seenN = (id) => save.seen[id] || 0;
  const markSeen = (id) => { save.seen[id] = seenN(id) + 1; };
  function pickFresh(list, n) {
    return K.shuffle(list).sort((a, b) => seenN(a.id) - seenN(b.id)).slice(0, n);
  }
  function qPool(level, cats) {
    const out = [];
    for (const c of cats) (QB[c][level] || []).forEach((s, i) => { const [q, a, ...w] = s.split("|"); out.push({ id: c + level + i, cat: c, q, a, w }); });
    return out;
  }
  function picPool(level, cats) {
    const all = PICS.map((p, i) => ({ ...p, id: "pic" + i })).filter((p) => p.l.includes(level));
    const f = all.filter((p) => cats.includes(p.c));
    return f.length >= 6 ? f : all;
  }
  function picAnswers(it) {
    if (it.n) { const w = K.shuffle([it.n - 2, it.n - 1, it.n + 1, it.n + 2].filter((x) => x > 0)).slice(0, 3); return { a: String(it.n), w: w.map(String) }; }
    return { a: it.a, w: it.w };
  }

  // ------------------------------------------------------------ الشاشة الأولى
  function home() {
    K.begin();
    K.paint(`
      <div class="hero">${LANTERN}<div><h1>مسابقة العائلة</h1><div class="sub">أسئلة ممتعة نلعبها معاً — من لاعب واحد إلى أربعة</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(160deg,#22c55e,#15803d)" ${K.act("pads", () => K.show(joinScreen))}><span class="big emo">🎮</span><b>لكل لاعب يد تحكم</b><small>حتى 4 أيادٍ</small></button>
        <button class="mode f" style="background:linear-gradient(160deg,#3b82f6,#1d4ed8)" ${K.act("turn", () => K.show(countScreen))}><span class="big emo">📺</span><b>بالدور</b><small>ريموت واحد أو لمس</small></button>
        <button class="mode f" style="background:linear-gradient(160deg,#a855f7,#6d28d9)" ${K.act("how", () => K.show(howScreen))}><span class="big emo">❓</span><b>كيف نلعب؟</b><small>3 جولات</small></button>
      </div>
      ${save.games ? `<div class="sub small">لعبتم ${save.games} ${save.games === 1 ? "مسابقة" : "مسابقات"} حتى الآن 🌟</div>` : ""}
      ${K.HELP}`, "pads");
    menuMode();
  }

  function howScreen() {
    K.begin();
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill">كيف نلعب؟</span><span></span></div>
      <div class="how">
        <div class="hw"><span class="emo">1️⃣</span><b>سؤال للجميع</b><p>كل الأجوبة حول السؤال: ▲ ▶ ▼ ◀. اضغط السهم نحو الجواب. أول جواب صحيح يأخذ نقاطاً أكثر!</p></div>
        <div class="hw"><span class="emo">2️⃣</span><b>جولة الصورة</b><p>صورة مغطاة تنكشف قطعةً قطعة. كلما عرفتها أبكر ربحت نقاطاً أكثر.</p></div>
        <div class="hw"><span class="emo">3️⃣</span><b>جولة السرعة</b><p>صح ▶ أم خطأ ◀؟ أجب عن أكبر عدد قبل انتهاء الوقت.</p></div>
      </div>
      <div class="sub">بالدور: كل لاعب يجيب في دوره ويختار بالأسهم ثم ✕ · ○ أثناء اللعب = استراحة</div>
      ${K.HELP}`);
    menuMode();
  }

  // تسجيل اللاعبين بالأيادي
  function joinScreen() {
    K.begin();
    const players = [];
    const draw = () => {
      K.paint(`
        <div class="top">${K.backBtn()}<span class="pill">🎮 اضغط ✕ على يدك لتنضم</span><span></span></div>
        <div class="slots">${PL.map((p, i) => {
          const pl = players[i];
          return `<div class="slot ${pl ? "on" : ""}" style="--c:${p.c};--d:${p.d}">
            <div class="sym">${pl ? sym(p) : `<span class="q">?</span>`}</div>
            <b>${pl ? p.name : "مكان فارغ"}</b><small>${pl ? (pl.id === "kb" ? "⌨️ لوحة المفاتيح / اللمس" : "🎮 يد " + (+pl.id.slice(1) + 1)) : "اضغط ✕"}</small></div>`;
        }).join("")}</div>
        <div class="nav">
          ${players.some((p) => p.id === "kb") || players.length >= 4 ? "" : `<button class="btn f" ${K.act("kb", () => join("kb"))}>✋ انضم من هنا</button>`}
          ${players.length ? `<button class="btn f go" ${K.act("go", start)}>ابدأ ←</button>` : ""}
        </div>
        <div class="sub small">${players.length ? `اللاعب الأول (${PL[0].name}) يضغط ✕ مرة أخرى للبدء` : `${K.pads().length ? K.pads().length + " يد تحكم متصلة" : "لا توجد يد تحكم متصلة — صل اليد ثم اضغط ✕"}`}</div>
        <div class="help"><b>✕</b> انضمام · <b>○</b> رجوع · أو <b>Enter</b> على لوحة المفاتيح</div>`, players.length ? "go" : "kb");
    };
    const join = (id) => {
      const i = players.findIndex((p) => p.id === id);
      if (i === 0) return start();
      if (i > 0 || players.length >= 4) return;
      players.push({ id });
      S.join(players.length - 1); K.confetti(6, "✨⭐");
      draw();
    };
    const start = () => { if (players.length) K.show(setupScreen, { mode: "pads", ids: players.map((p) => p.id) }); };
    draw();
    K.mode = {
      key(e) {
        if (e.key === "Enter" || e.key === " ") { const el = K.current(); if (el && el.dataset.k === "go" && players.length && !players.some((p) => p.id === "kb")) start(); else join("kb"); return true; }
        if (e.key === "Backspace") { K.back(); return true; }
        return false;
      },
      poll(pads, ts) {
        for (const e of padEvents(pads, ts)) {
          if (e.key === "Enter") join(e.id);
          else if (e.key === "Start") start();
          else if (e.key === "Backspace") K.back();
        }
        return true;
      },
    };
  }

  // عدد اللاعبين بالدور
  function countScreen() {
    K.begin();
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill">📺 كم لاعباً سيلعب بالدور؟</span><span></span></div>
      <div class="modes sm">${[1, 2, 3, 4].map((n) => `
        <button class="mode f cnt" ${K.act("n" + n, () => K.show(setupScreen, { mode: "turn", ids: K.range(0, n).map((i) => "t" + i) }))}>
          <span class="syms">${PL.slice(0, n).map((p) => `<i>${sym(p)}</i>`).join("")}</span><b>${n === 1 ? "لاعب واحد" : n === 2 ? "لاعبان" : n + " لاعبين"}</b></button>`).join("")}</div>
      ${K.HELP}`, "n2");
    menuMode();
  }

  // المستوى والفئات
  function setupScreen(cfg) {
    K.begin();
    const sel = new Set(save.cats.filter((c) => CAT[c]));
    if (!sel.size) CATS.forEach((c) => sel.add(c.id));
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill">اختاروا المستوى والفئات</span><span class="pls">${cfg.ids.map((_, i) => `<i>${sym(PL[i])}</i>`).join("")}</span></div>
      <div class="levels">${Object.entries(LV).map(([k, l]) => `
        <button class="lvl f ${save.level === k ? "on" : ""}" data-l="${k}" ${K.act("l" + k, (el) => { save.level = k; save.save(); app.querySelectorAll(".lvl").forEach((x) => x.classList.toggle("on", x === el)); K.sfx.pop(); })}>
          <span class="emo">${l.icon}</span><b>${l.name}</b><small>${l.sub}</small></button>`).join("")}</div>
      <div class="cats">${CATS.map((c) => `
        <button class="cat f ${sel.has(c.id) ? "on" : ""}" style="--c:${c.c}" ${K.act("c" + c.id, (el) => {
          if (sel.has(c.id)) { if (sel.size > 1) sel.delete(c.id); } else sel.add(c.id);
          el.classList.toggle("on", sel.has(c.id)); save.cats = [...sel]; save.save(); K.sfx.pop();
        })}><span class="emo">${c.icon}</span><b>${c.name}</b><i class="ck">✓</i></button>`).join("")}</div>
      <div class="nav"><button class="btn f go big" ${K.act("go", () => K.show(gameScreen, { ...cfg, level: save.level, cats: [...sel] }))}>▶ ابدؤوا المسابقة</button></div>
      ${K.HELP}`, "go");
    const app = K.app;
    menuMode();
  }

  // ------------------------------------------------------------ اللعبة
  function gameScreen(cfg) {
    const pads = cfg.mode === "pads";
    const P = cfg.ids.map((id, i) => ({ id, i, ...PL[i], score: 0, right: 0, ans: null, at: 0 }));
    const N = P.length;
    const lv = LV[cfg.level];
    const pool = qPool(cfg.level, cfg.cats);
    const nQ = pads ? 8 : N === 4 ? 8 : 6;
    const nPic = pads ? 5 : N === 3 ? 6 : 4;
    const qs = pickFresh(pool, nQ);
    const pics = pickFresh(picPool(cfg.level, cfg.cats), nPic);
    const used = new Set(qs.map((q) => q.id));
    const tfPool = K.shuffle(pool.filter((q) => !used.has(q.id))).concat(K.shuffle(pool));
    let tfi = 0;
    [...qs, ...pics].forEach((q) => markSeen(q.id)); save.save();

    const app = K.app;
    let phase = "", paused = false, clock = null, waits = [], raf = 0, last = performance.now();
    let round = 0, qi = 0, turn = 0, Q = null, qStart = 0, now = 0;

    // الوقت (يتوقف أثناء الاستراحة)
    function loop(ts) {
      const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
      if (!paused) {
        now += dt;
        if (clock) {
          const before = Math.ceil(clock.left);
          clock.left -= dt;
          const after = Math.ceil(clock.left);
          if (after !== before && after <= 5 && after > 0) S.tick();
          drawClock();
          if (clock.onTick) clock.onTick(clock);
          if (clock.left <= 0) { const c = clock; clock = null; c.onEnd(); }
        }
        for (const w of waits.slice()) { w.t -= dt; if (w.t <= 0) { waits.splice(waits.indexOf(w), 1); w.fn(); } }
      }
      raf = requestAnimationFrame(loop);
    }
    const after = (sec, fn) => waits.push({ t: sec, fn });
    const setClock = (sec, onEnd, onTick) => { clock = { left: sec, total: sec, onEnd, onTick }; drawClock(); };
    function drawClock() {
      const bar = app.querySelector(".tbar i"), num = app.querySelector(".tbar b");
      if (!bar) return;
      const f = clock ? Math.max(0, clock.left / clock.total) : 0;
      bar.style.width = f * 100 + "%";
      bar.classList.toggle("low", !!clock && clock.left <= 5);
      if (num) num.textContent = clock ? Math.max(0, Math.ceil(clock.left)) : "";
    }

    // لوحة النقاط في الأعلى
    const hud = (label) => `
      <div class="hud">
        <span class="pill rl">${label}</span>
        <div class="chips">${P.map((p) => `<div class="chip ${!pads && phase !== "board" && p.i === turn ? "cur" : ""}" id="chip${p.i}" style="--c:${p.c};--d:${p.d}"><span class="sym">${sym(p)}</span><b>${p.name}</b><span class="sc">${p.score}</span><span class="lock">✓</span></div>`).join("")}</div>
      </div>`;
    const setScore = (p, add) => {
      p.score += add;
      const ch = app.querySelector("#chip" + p.i);
      if (!ch) return;
      ch.querySelector(".sc").textContent = p.score;
      if (add > 0) { const f = document.createElement("i"); f.className = "plus"; f.textContent = "+" + add; ch.appendChild(f); setTimeout(() => f.remove(), 1500); }
    };
    const markLocked = (p, on) => { const ch = app.querySelector("#chip" + p.i); if (ch) ch.classList.toggle("done", on); };
    const roundName = ["سؤال للجميع", "جولة الصورة", "جولة السرعة"];
    const rLabel = () => `الجولة ${round + 1}: ${roundName[round]}`;

    // ---------------- مقدمة الجولة
    function intro(r) {
      round = r; phase = "intro"; clock = null; waits = [];
      const info = [
        { icon: "❓", t: "سؤال للجميع", d: pads ? "الأجوبة حول السؤال. اضغطوا السهم نحو الجواب الصحيح. أسرع جواب صحيح يأخذ ١٥٠ نقطة، وكل جواب صحيح ١٠٠." : "كل لاعب يجيب في دوره. أجب بسرعة لتربح نقاطاً إضافية!", c: "#f59e0b" },
        { icon: "🖼️", t: "جولة الصورة", d: "صورة مغطاة تنكشف شيئاً فشيئاً. من يعرفها أبكر يربح نقاطاً أكثر!", c: "#22c55e" },
        { icon: "⚡", t: "جولة السرعة", d: pads ? "صح ▶ أم خطأ ◀ ؟ أجيبوا عن أكبر عدد ممكن في " + SPEED_T + " ثانية!" : "صح ▶ أم خطأ ◀ ؟ لكل لاعب " + SPEED_TURN + " ثانية ليجيب عن أكبر عدد ممكن.", c: "#ec4899" },
      ][r];
      K.begin();
      K.paint(`${hud("الجولة " + (r + 1) + " من 3")}
        <div class="intro" style="--c:${info.c}"><div class="rn">الجولة ${["الأولى", "الثانية", "الثالثة"][r]}</div><span class="emo ic">${info.icon}</span><h1>${info.t}</h1><p>${info.d}</p></div>
        <div class="nav"><button class="btn f go" ${K.act("go", next)}>هيا! ✕</button></div>
        <div class="help"><b>✕</b> أو <b>Enter</b> للبدء · <b>○</b> استراحة</div>`, "go");
      S.jingle();
      qi = 0; turn = 0;
      function next() { if (phase !== "intro") return; phase = ""; r === 2 ? speedStart() : ask(); }
      after(6, next);
    }

    // ---------------- سؤال (الجولة 1 والصورة)
    const ARW = ["▲", "▶", "▼", "◀"];
    const KEYDIR = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
    function ask() {
      const pic = round === 1;
      const list = pic ? pics : qs;
      if (qi >= list.length) return board();
      const src = list[qi];
      const { a, w } = pic ? picAnswers(src) : src;
      const opts = K.shuffle([a, ...w.slice(0, 3)]);
      Q = { src, pic, opts, right: opts.indexOf(a), done: false, tiles: 12, cover: K.shuffle(K.range(0, 12)) };
      P.forEach((p) => { p.ans = null; p.at = 0; });
      phase = "q"; qStart = now; waits = [];
      const total = list.length;
      const cat = pic ? null : CAT[src.cat];
      const who = P[turn];
      K.begin();
      K.paint(`${hud(rLabel() + " · " + (qi + 1) + "/" + total)}
        <div class="tbar"><i></i><b></b></div>
        <div class="cross ${pads ? "padmode" : ""}">
          <div class="qcard">
            ${!pads ? `<div class="turn" style="--c:${who.c}"><i>${sym(who)}</i> دور ${who.name}</div>` : ""}
            ${cat ? `<span class="tag" style="--c:${cat.c}">${cat.icon} ${cat.name}</span>` : ""}
            ${pic ? `<div class="picq">${K.esc(picQ(src))}</div><div class="pic">${picHtml(src)}<div class="cover">${K.range(0, 12).map((i) => `<i id="cv${i}" style="--h:${(i * 37) % 360}"></i>`).join("")}</div></div>` : `<div class="qt ${src.q.length > 60 ? "long" : ""}">${K.esc(src.q)}</div>`}
          </div>
          ${opts.map((o, i) => `<button class="ans f a${i} ${o.length > 16 ? "long" : ""}" ${K.act("o" + i, () => tap(i))}><span class="arw">${ARW[i]}</span><span class="t">${K.esc(o)}</span><span class="marks"></span></button>`).join("")}
        </div>
        <div class="help">${pads ? "كل لاعب يضغط <b>السهم</b> نحو جوابه · <b>○</b> استراحة" : "<b>الأسهم</b> ثم <b>✕</b> للاختيار · <b>○</b> استراحة"}</div>`, "o0");
      if (cfg.level === "s" && !pic) K.tts(src.q, "ar", 0.9);
      if (pic) { uncover(2); }
      const T = pic ? lv.time + 6 : lv.time;
      setClock(T, () => reveal(true), pic ? (c) => { const shouldHide = Math.ceil(10 * Math.max(0, (c.left - T * 0.25) / (T * 0.75))); if (Q.tiles > shouldHide) uncover(Q.tiles - shouldHide); } : null);
    }
    function uncover(n) {
      for (let k = 0; k < n && Q.tiles > 0; k++) {
        const id = Q.cover[12 - Q.tiles]; Q.tiles--;
        const el = app.querySelector("#cv" + id); if (el) el.classList.add("off");
      }
    }
    function tap(i) {
      if (phase !== "q") return;
      if (pads) { const p = P.find((x) => x.id === "kb"); if (p) answer(p, i); }
      else answer(P[turn], i);
    }
    function answer(p, i) {
      if (phase !== "q" || !p || p.ans !== null || i >= Q.opts.length) return;
      p.ans = i; p.at = now - qStart; p.tiles = Q.tiles;
      if (pads) {
        S.lock(p.i); markLocked(p, true);
        if (P.every((x) => x.ans !== null)) after(0.35, () => reveal(false));
      } else reveal(false);
    }
    function reveal(timeout) {
      if (phase !== "q") return;
      phase = "reveal"; clock = null; drawClock();
      if (Q.pic) uncover(12);
      const btns = app.querySelectorAll(".ans");
      btns.forEach((b) => b.classList.remove("sel"));
      btns[Q.right].classList.add("ok");
      const players = pads ? P : [P[turn]];
      const correct = players.filter((p) => p.ans === Q.right).sort((a, b) => a.at - b.at);
      players.forEach((p) => {
        if (p.ans === null) return;
        if (p.ans !== Q.right) btns[p.ans].classList.add("bad");
        btns[p.ans].querySelector(".marks").insertAdjacentHTML("beforeend", `<i style="--c:${p.c}">${sym(p)}</i>`);
      });
      const T = clock ? clock.total : Q.pic ? lv.time + 6 : lv.time;
      correct.forEach((p, k) => {
        let pts;
        if (Q.pic) pts = 50 + Math.round((p.tiles / 12) * 100 / 10) * 10 + (pads && k === 0 && N > 1 ? 50 : 0);
        else if (pads) pts = k === 0 && N > 1 ? 150 : 100;
        else pts = 100 + Math.max(0, Math.round((1 - p.at / T) * 5)) * 10;
        p.right++;
        setScore(p, pts);
      });
      const qc = app.querySelector(".qcard");
      let msg;
      if (correct.length) { K.sfx.ok(); K.confetti(10); msg = correct.length === 1 || !pads ? `${K.pick(["أحسنت", "رائع", "ممتاز", "بطل"])} يا ${correct[0].name}! ${pads && N > 1 ? "⚡ الأسرع" : ""}` : `أحسنتم! ${correct[0].name} كان الأسرع ⚡`; }
      else { (timeout ? S.timeup : K.sfx.bad)(); msg = timeout && players.every((p) => p.ans === null) ? "انتهى الوقت ⏰" : "الجواب الصحيح باللون الأخضر"; }
      qc.insertAdjacentHTML("beforeend", `<div class="verdict ${correct.length ? "good" : ""}">${msg}</div>`);
      P.forEach((p) => markLocked(p, false));
      const go = () => { if (phase !== "reveal") return; phase = ""; qi++; if (!pads) turn = (turn + 1) % N; ask(); };
      Q.go = go; Q.revealAt = now;
      after(3.2, go);
    }

    // ---------------- جولة السرعة
    const SPEED_T = 40, SPEED_TURN = 25;
    let TF = null;
    function nextTF() {
      const q = tfPool[tfi++ % tfPool.length];
      const truth = Math.random() < 0.5;
      return { q, shown: truth ? q.a : K.pick(q.w), truth, done: false };
    }
    function speedStart() {
      if (pads) { speedPaint(); setClock(SPEED_T, speedEnd); tfAsk(); }
      else speedReady();
    }
    function speedReady() {
      phase = "ready"; clock = null; waits = [];
      const who = P[turn];
      K.begin();
      K.paint(`${hud(rLabel())}
        <div class="intro" style="--c:${who.c}"><div class="bigsym">${sym(who)}</div><h1>استعد يا ${who.name}!</h1><p>${SPEED_TURN} ثانية: صح ▶ أم خطأ ◀</p></div>
        <div class="nav"><button class="btn f go" ${K.act("go", go)}>أنا جاهز ✕</button></div>
        <div class="help"><b>✕</b> للبدء · <b>○</b> استراحة</div>`, "go");
      S.join(who.i);
      function go() { if (phase !== "ready") return; speedPaint(); setClock(SPEED_TURN, speedEnd); tfAsk(); }
      Q = { go };
    }
    function speedPaint() {
      phase = "speed";
      K.begin();
      K.paint(`${hud(rLabel())}
        <div class="tbar"><i></i><b></b></div>
        <div class="speed">
          <div class="qcard tf">
            ${!pads ? `<div class="turn" style="--c:${P[turn].c}"><i>${sym(P[turn])}</i> دور ${P[turn].name}</div>` : ""}
            <div class="qt"></div><div class="shown"></div><div class="verdict"></div>
          </div>
          <div class="tfrow">
            <button class="tfb yes f" ${K.act("yes", () => tfTap(true))}><span class="emo">✔️</span> صح <span class="arw">▶</span></button>
            <button class="tfb no f" ${K.act("no", () => tfTap(false))}><span class="arw">◀</span> خطأ <span class="emo">✖️</span></button>
          </div>
        </div>
        <div class="help">${pads ? "كل لاعب: <b>▶</b> صح · <b>◀</b> خطأ" : "<b>▶</b> صح · <b>◀</b> خطأ (أو المس الزر)"} · <b>○</b> استراحة</div>`, "yes");
      app.querySelectorAll(".tfb").forEach((b) => b.classList.remove("sel"));
    }
    function tfAsk() {
      if (phase !== "speed") return;
      TF = nextTF();
      TF.start = now;
      P.forEach((p) => { p.ans = null; p.at = 0; markLocked(p, false); });
      const qc = app.querySelector(".qcard.tf");
      qc.classList.remove("good", "bad");
      qc.querySelector(".qt").textContent = TF.q.q;
      qc.querySelector(".shown").textContent = "الجواب: " + TF.shown;
      qc.querySelector(".verdict").textContent = "";
      app.querySelectorAll(".tfb").forEach((b) => b.classList.remove("ok", "bad"));
      if (pads) { TF.wait = { t: 7, fn: () => tfReveal() }; waits.push(TF.wait); }
    }
    function tfTap(v) {
      if (phase !== "speed") return;
      if (pads) { const p = P.find((x) => x.id === "kb"); if (p) tfAnswer(p, v); } else tfAnswer(P[turn], v);
    }
    function tfAnswer(p, v) {
      if (phase !== "speed" || !TF || TF.done || !p || p.ans !== null) return;
      p.ans = v; p.at = now - TF.start;
      if (pads) { S.lock(p.i); markLocked(p, true); if (P.every((x) => x.ans !== null)) tfReveal(); }
      else tfReveal();
    }
    function tfReveal() {
      if (!TF || TF.done) return;
      TF.done = true;
      if (TF.wait) { const k = waits.indexOf(TF.wait); if (k >= 0) waits.splice(k, 1); }
      const ok = (pads ? P : [P[turn]]).filter((p) => p.ans === TF.truth).sort((a, b) => a.at - b.at);
      ok.forEach((p, k) => { p.right++; setScore(p, pads && k === 0 && N > 1 ? 50 : 30); });
      app.querySelector(TF.truth ? ".tfb.yes" : ".tfb.no").classList.add("ok");
      const qc = app.querySelector(".qcard.tf");
      qc.classList.add(ok.length ? "good" : "bad");
      qc.querySelector(".verdict").textContent = TF.truth ? "✔ صح" : "✖ خطأ — الصحيح: " + TF.q.a;
      ok.length ? K.tone(880, 0.1, "triangle", 0.12) : K.tone(220, 0.15, "square", 0.05);
      after(TF.truth ? 0.8 : 1.4, tfAsk);
    }
    function speedEnd() {
      if (phase !== "speed") return;
      phase = "";
      S.timeup(); waits = [];
      if (!pads && turn < N - 1) { turn++; after(1, speedReady); }
      else after(1, board);
    }

    // ---------------- لوحة النقاط بعد كل جولة
    function board() {
      phase = "board"; clock = null; waits = [];
      if (round === 2) return final();
      const max = Math.max(1, ...P.map((p) => p.score));
      const order = P.slice().sort((a, b) => b.score - a.score);
      K.begin();
      K.paint(`${hud("بعد " + ["الجولة الأولى", "الجولة الثانية"][round])}
        <h2 class="bt">لوحة النقاط</h2>
        <div class="bars">${order.map((p, k) => `<div class="bar" style="--c:${p.c};--d:${p.d}"><span class="sym">${sym(p)}</span><b>${p.name}</b><div class="track"><i style="width:${(p.score / max) * 100}%"></i></div><span class="sc">${p.score}</span>${k === 0 && p.score > 0 && N > 1 ? `<span class="emo crown">👑</span>` : ""}</div>`).join("")}</div>
        <div class="nav"><button class="btn f go" ${K.act("go", () => intro(round + 1))}>الجولة التالية ←</button></div>
        <div class="help"><b>✕</b> للمتابعة · <b>○</b> استراحة</div>`, "go");
      K.sfx.win();
      Q = { go: () => intro(round + 1) };
    }

    // ---------------- النهاية والاحتفال
    function final() {
      phase = "final"; clock = null; waits = [];
      const order = P.slice().sort((a, b) => b.score - a.score);
      const top = order[0].score;
      const winners = order.filter((p) => p.score === top && top > 0);
      save.games++; save.save();
      const podium = order.map((p, k) => {
        const place = order.findIndex((x) => x.score === p.score);
        return `<div class="pod p${place + 1}" style="--c:${p.c};--d:${p.d}">
          <div class="pz">${sym(p)}</div><b>${p.name}</b><span class="sc">${p.score}</span>
          <div class="block"><span>${place === 0 && top > 0 ? "🏆" : ["🥇", "🥈", "🥉", "🎖️"][place]}</span></div></div>`;
      });
      const title = N === 1 ? (P[0].right >= 10 ? "رائع! أنت بطل المسابقة" : "أحسنت! أنهيت المسابقة") : winners.length > 1 ? "تعادل! كلكم أبطال" : `الفائز: ${winners[0] ? winners[0].name : ""}`;
      K.begin();
      K.paint(`
        <div class="finale">${TROPHY}<h1>${title}</h1></div>
        <div class="podium">${N === 1 ? podium[0] : [podium[1], podium[0], podium[2], podium[3]].filter(Boolean).join("")}</div>
        <div class="sub earned"></div>
        <div class="nav">
          <button class="btn f go" ${K.act("again", () => K.replace(gameScreen, cfg))}><span class="emo">🔁</span> مسابقة جديدة</button>
          <button class="btn f" ${K.act("set", K.back)}><span class="emo">⚙️</span> تغيير الفئات</button>
          <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
        </div>
        ${K.HELP}`, "again");
      S.fanfare();
      K.confetti(50, "⭐🎉✨🌟🎈🏆");
      after(1.6, () => K.confetti(36, "⭐✨🌟"));
      // نجوم باعتدال: نجمة لكل من شارك ونجمة للفائز (حتى 5)
      const amount = Math.min(5, N + (top > 0 ? 1 : 0));
      earn(amount, N === 1 ? "أنهى مسابقة العائلة" : `مسابقة عائلية (${N} لاعبين) — فاز ${winners.map((w) => w.name).join(" و") || "الجميع"}`).then((added) => {
        const el = app.querySelector(".earned");
        if (added && el && phase === "final") { el.innerHTML = `<span class="won"><span class="emo">⭐</span> +${added} ${added === 1 ? "نجمة" : "نجوم"} لرصيدكم</span>`; K.sfx.ok(); }
      });
    }

    // ---------------- الاستراحة
    let pauseSel = 0, pauseEl = null;
    function togglePause() {
      if (phase === "final") return K.back();
      if (paused) return resume();
      paused = true; pauseSel = 0; K.stopSound();
      pauseEl = document.createElement("div");
      pauseEl.className = "pause";
      pauseEl.innerHTML = `<div class="pbox"><span class="emo">☕</span><h2>استراحة</h2><button class="pbtn">▶ متابعة</button><button class="pbtn">✖ إنهاء المسابقة</button></div>`;
      document.body.appendChild(pauseEl);
      const bs = pauseEl.querySelectorAll(".pbtn");
      bs[0].onclick = resume; bs[1].onclick = quit;
      drawPause();
    }
    const drawPause = () => pauseEl && pauseEl.querySelectorAll(".pbtn").forEach((b, i) => b.classList.toggle("on", i === pauseSel));
    function resume() { paused = false; if (pauseEl) pauseEl.remove(); pauseEl = null; last = performance.now(); }
    function quit() { resume(); K.back(); }
    function pauseKey(key) {
      if (DIRMAP[key]) { pauseSel = 1 - pauseSel; drawPause(); K.sfx.tick(); }
      else if (key === "Enter" || key === "Start" || key === " ") (pauseSel ? quit : resume)();
    }

    // ---------------- التحكم
    function handle(id, key, first = true) {
      K.audioCtx();
      if (key === "Backspace") { togglePause(); return true; }
      if (paused) { pauseKey(key); return true; }
      const isEnter = key === "Enter" || key === " " || key === "Start";
      switch (phase) {
        case "intro": case "ready":
          if (isEnter) { const el = app.querySelector('[data-k="go"]'); if (el) el.click(); }
          return true;
        case "board":
          if (isEnter) Q.go();
          return true;
        case "q":
          if (pads) {
            if (KEYDIR[key] != null && first) answer(P.find((p) => p.id === id), KEYDIR[key]);
            return true;
          }
          if (id === "kb") return false; // الريموت: تنقل عادي ثم ✕
          navKey(key); return true;
        case "reveal":
          if (isEnter && now - Q.revealAt > 0.8) Q.go();
          return true;
        case "speed":
          if ((key === "ArrowRight" || key === "ArrowLeft") && first) {
            const v = key === "ArrowRight";
            if (pads) tfAnswer(P.find((p) => p.id === id), v); else tfAnswer(P[turn], v);
          }
          return true;
        case "final":
          if (id === "kb") return false;
          navKey(key); return true;
      }
      return true;
    }
    K.mode = {
      key(e) { if (e.repeat && phase !== "final" && !(phase === "q" && !pads)) return true; return handle("kb", e.key); },
      poll(pads2, ts) { for (const e of padEvents(pads2, ts)) handle(e.id, e.key, e.first); return true; },
      stop() { cancelAnimationFrame(raf); if (pauseEl) pauseEl.remove(); paused = false; },
    };
    raf = requestAnimationFrame(loop);
    intro(0);
  }

  K.start(home);
})();
