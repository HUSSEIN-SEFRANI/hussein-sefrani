// الإخوة + — لعبة تعاونية لأخوين: الكبير قوي (يحمل أخاه ويرميه، ويدفع الصناديق، ويمشي في الماء، ويضغط الأزرار الثقيلة)،
// والصغير خفيف (يقفز أعلى، ويمر من الأنفاق الصغيرة). 20 مرحلة، وإذا خسر أحدهما رجعا معاً إلى آخر علم 🚩.
// التحكم: كل لاعب بيد تحكم (✕ أو ⬆️ قفز · □ △ ○ حمل/عتلة · Options استراحة). بلا يد: الأسهم + Enter (والريموت)، و W A S D + F.
// اللمس/الفأرة: أزرار على الشاشة لكل لاعب.
// مفتاح الخريطة (levels.js): # أرض · - منصة تُعبر من تحت · ^ أشواك · ~ ماء عميق · X صندوق · F علم حفظ · J نابض
//   1 الكبير · 2 الصغير · E باب النهاية (للاثنين) · * الكأس (لواحد) · الألوان: أحمر/أزرق/أخضر/أصفر
//   a b c d زر · e f g h زر ثقيل · l m n o عتلة · A B C D باب · P Q R S جسر
(() => {
  "use strict";
  const GAME = "الإخوة +", W = 32, H = 18, N = LEVELS.length;
  const save = K.store("brothers", { max: 1, done: {}, names: [null, null], big: 0, cp: null });
  const LITE = (() => {
    try { if (parent !== window && parent.document.documentElement.classList.contains("lite")) return true; } catch {}
    return (navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2;
  })();
  const FONT = getComputedStyle(document.body).fontFamily || "sans-serif";
  const COL = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"], COLD = ["#991b1b", "#1e40af", "#166534", "#a16207"];
  const ROLE = {
    big: { w: 0.8, h: 1.75, speed: 5, jump: 11.3, shirt: "#2563eb", pants: "#1e3a8a", name: "الأخ الكبير", emo: "🟦" },
    small: { w: 0.66, h: 0.9, speed: 5.5, jump: 14, shirt: "#f97316", pants: "#7c2d12", name: "الأخ الصغير", emo: "🟧" },
  };
  // من يساعد في المراحل التي فيها مساعد طوال الوقت (لرسالة النهاية)
  const HELPER = { 8: "big", 9: "small", 10: "big", 14: "small", 17: "big", 18: "small", 19: "big" };
  const GRAV = 40, MAXF = 22, EPS = 1e-4, STEP = 1 / 60;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const snd = {
    jump: () => K.tone(520, 0.08, "triangle", 0.07),
    land: () => K.tone(180, 0.05, "sine", 0.05),
    pick: () => { K.tone(600, 0.07, "triangle", 0.1); K.tone(900, 0.08, "triangle", 0.08, 0.06); },
    toss: () => { K.tone(400, 0.15, "sawtooth", 0.04); K.tone(800, 0.12, "triangle", 0.06, 0.05); },
    click: () => K.tone(1100, 0.04, "square", 0.04),
    door: () => { K.tone(330, 0.1, "triangle", 0.07); K.tone(440, 0.12, "triangle", 0.07, 0.08); },
    boing: () => { K.tone(300, 0.08, "sine", 0.12); K.tone(700, 0.18, "sine", 0.1, 0.05); },
    heavy: () => K.tone(140, 0.12, "square", 0.04),
    flag: () => K.sfx.ok(),
    hurt: () => { K.tone(330, 0.12, "square", 0.05); K.tone(220, 0.25, "square", 0.05, 0.1); },
    heart: () => K.tone(880, 0.1, "sine", 0.08),
  };

  // ---------------------------------------------------------------- أسماء العائلة (من التلفاز)
  let FAMILY = [], CURRENT = null, famP = null;
  function loadFamily() {
    if (famP) return famP;
    famP = fetch("/api/tv/profiles", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !Array.isArray(d.profiles)) return;
        FAMILY = d.profiles.map((p) => String(p.name || "").trim()).filter(Boolean).filter((n, i, a) => a.indexOf(n) === i);
        const me = d.profiles.find((p) => p.id === d.current);
        CURRENT = me ? String(me.name || "").trim() : null;
      })
      .catch(() => {});
    return famP;
  }
  const nameList = () => (FAMILY.length ? FAMILY : ["اللاعب ١", "اللاعب ٢"]);
  function defaultNames() {
    const L = nameList(), n = save.names.slice();
    if (!n[0] || !L.includes(n[0])) n[0] = CURRENT && L.includes(CURRENT) ? CURRENT : L[0];
    if (!n[1] || !L.includes(n[1]) || (n[1] === n[0] && L.length > 1)) n[1] = L.find((x) => x !== n[0]) || L[0];
    return n;
  }

  // ---------------------------------------------------------------- الإدخال: لكل لاعب جهازه
  const KB = {
    ArrowLeft: [0, "left"], ArrowRight: [0, "right"], ArrowUp: [0, "jump"], ArrowDown: [0, "down"], Enter: [0, "act"], NumpadEnter: [0, "act"],
    KeyA: [1, "left"], KeyD: [1, "right"], KeyW: [1, "jump"], Space: [1, "jump"], " ": [1, "jump"], KeyS: [1, "down"], KeyF: [1, "act"], KeyE: [1, "act"], KeyQ: [1, "act"],
  };
  const held = [{}, {}], edge = [{}, {}], tHeld = [{}, {}], tEdge = [{}, {}], padPrev = {};
  // ريموت التلفاز (HDMI-CEC) يرسل كل ضغطة «ضغطاً ورفعاً» في اللحظة نفسها، وإذا بقي الزر مضغوطاً يكررها.
  // فالضغطة القصيرة جداً تُعدّ مستمرة قليلاً (tapUntil) حتى يمشي الأخ بالريموت.
  const lastDown = [{}, {}], tapUntil = [{}, {}], TAP_HOLD = 130;
  function kbKey(e, down) {
    const m = KB[e.code] || KB[e.key];
    if (!m) return false;
    const [s, a] = m, now = performance.now();
    if (down) { if (!held[s][a]) edge[s][a] = true; held[s][a] = true; lastDown[s][a] = now; }
    else { held[s][a] = false; if (now - (lastDown[s][a] || 0) < 45) tapUntil[s][a] = now + TAP_HOLD; }
    return true;
  }
  const kbHeld = (s, a, now) => !!held[s][a] || now < (tapUntil[s][a] || 0);
  addEventListener("blur", () => { for (const h of [...held, ...tHeld]) for (const k in h) h[k] = false; });
  function readPad(g) {
    const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
    // ✕ أو ⬆️ قفز · □ △ ○ حمل/عتلة · Options استراحة
    return { left: b(14) || ax < -0.4, right: b(15) || ax > 0.4, up: b(12) || ay < -0.7, down: b(13) || ay > 0.7,
      jump: b(0) || b(12), act: b(1) || b(2) || b(3) || b(4) || b(5), pause: b(9) || b(8), a: b(0), x: b(2) || b(3), back: b(1) };
  }
  const devName = (d) => (d === "pad0" ? "🎮 يد التحكم ١" : d === "pad1" ? "🎮 يد التحكم ٢" : d === "kb0" ? "⌨️ الأسهم + Enter" : d === "kb01" ? "⌨️ الأسهم + Enter أو WASD + F" : "⌨️ W A S D + F");
  // يرجع لكل لاعب: الأزرار المضغوطة الآن (left/right/down…) و e = ما ضُغط للتو
  function inputs() {
    const pads = K.pads(), out = [], free = [];
    for (let p = 0; p < 2; p++) {
      const g = pads[p];
      if (g) {
        const s = readPad(g), pv = padPrev[g.index] || {}, e = {};
        padPrev[g.index] = s;
        for (const k in s) e[k] = s[k] && !pv[k];
        e.ok = e.a || e.x;
        out[p] = { ...s, e, dev: "pad" + p };
      } else free.push(p);
    }
    const sets = free.length === 1 ? [[0, 1]] : [[0], [1]], now = performance.now();
    free.forEach((p, i) => {
      const ss = sets[i], s = {}, e = {};
      for (const k of ss) {
        for (const a of ["left", "right", "down", "jump", "act"]) s[a] = s[a] || kbHeld(k, a, now);
        for (const a in edge[k]) if (edge[k][a]) e[a] = true;
      }
      s.up = s.jump; e.up = e.jump; e.ok = e.act;
      out[p] = { ...s, e, dev: ss.length === 2 ? "kb01" : "kb" + ss[0] };
    });
    for (let p = 0; p < 2; p++) {   // أزرار اللمس
      const h = tHeld[p], te = tEdge[p], o = out[p];
      for (const a of ["left", "right", "down", "jump", "act"]) o[a] = o[a] || !!h[a];
      for (const a in te) if (te[a]) { o.e[a] = true; if (a === "jump" || a === "act") o.e.ok = true; }
      tEdge[p] = {};
    }
    edge[0] = {}; edge[1] = {};
    return out;
  }
  const clearInput = () => { edge[0] = {}; edge[1] = {}; for (const h of [...held, ...tapUntil]) for (const k in h) delete h[k]; };

  // ---------------------------------------------------------------- رسم الأخوين
  function drawKid(g, cx, foot, s, role, face, ph, pose) {
    const big = role === "big", R = ROLE[role];
    const h = R.h * s, hr = (big ? 0.29 : 0.27) * s, headY = foot - h + hr + 0.02 * s;
    const legH = big ? 0.5 * s : 0.2 * s, torsoTop = headY + hr * 0.8, torsoBot = foot - legH, tw = R.w * s * 0.86;
    g.save(); g.translate(cx, 0); if (face < 0) g.scale(-1, 1);
    const sw = pose === "air" ? 0.5 : Math.sin(ph) * 0.55;
    g.lineCap = "round";
    // الساقان
    g.strokeStyle = R.pants; g.lineWidth = (big ? 0.17 : 0.15) * s;
    for (const k of [-1, 1]) {
      const a = pose === "air" ? k * 0.35 : sw * k;
      g.beginPath(); g.moveTo(k * tw * 0.2, torsoBot - 0.03 * s); g.lineTo(k * tw * 0.2 + Math.sin(a) * legH, torsoBot + Math.cos(a) * legH - 0.06 * s); g.stroke();
    }
    // الحذاء
    g.fillStyle = "#334155";
    for (const k of [-1, 1]) { const a = pose === "air" ? k * 0.35 : sw * k; g.beginPath(); g.ellipse(k * tw * 0.2 + Math.sin(a) * legH + 0.04 * s, torsoBot + Math.cos(a) * legH - 0.04 * s, 0.1 * s, 0.06 * s, 0, 0, 7); g.fill(); }
    // الذراعان
    g.strokeStyle = "#f2c79b"; g.lineWidth = (big ? 0.13 : 0.11) * s;
    const ay = torsoTop + 0.08 * s, al = (big ? 0.5 : 0.3) * s;
    for (const k of [-1, 1]) {
      g.beginPath(); g.moveTo(k * tw * 0.45, ay);
      if (pose === "lift") g.lineTo(k * tw * 0.4, ay - al);
      else { const a = -sw * k * 0.8; g.lineTo(k * tw * 0.5 + Math.sin(a) * al, ay + Math.cos(a) * al); }
      g.stroke();
    }
    // القميص
    g.fillStyle = R.shirt; rr(g, -tw / 2, torsoTop, tw, Math.max(0.1 * s, torsoBot - torsoTop), 0.12 * s); g.fill();
    g.fillStyle = "rgba(255,255,255,.85)"; g.font = `800 ${Math.round((big ? 0.32 : 0.22) * s)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(big ? "+" : "★", 0, (torsoTop + torsoBot) / 2);
    // الرأس
    g.fillStyle = "#f2c79b"; g.beginPath(); g.arc(0, headY, hr, 0, 7); g.fill();
    if (big) {   // شعر
      g.fillStyle = "#3f2a1d"; g.beginPath(); g.arc(0, headY - hr * 0.15, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-hr * 0.2, headY - hr * 1.05); g.lineTo(hr * 0.15, headY - hr * 1.35); g.lineTo(hr * 0.35, headY - hr * 0.95); g.fill();
    } else {     // قبعة
      g.fillStyle = "#ea580c"; g.beginPath(); g.arc(0, headY - hr * 0.1, hr * 1.02, Math.PI, 0); g.closePath(); g.fill();
      g.fillRect(0, headY - hr * 0.2, hr * 1.35, hr * 0.22);
    }
    // العينان والابتسامة
    g.fillStyle = "#fff";
    for (const ex of [0.05, 0.5]) { g.beginPath(); g.arc(ex * hr, headY + 0.05 * hr, hr * 0.2, 0, 7); g.fill(); }
    g.fillStyle = "#1e293b";
    for (const ex of [0.1, 0.55]) { g.beginPath(); g.arc(ex * hr, headY + 0.08 * hr, hr * 0.1, 0, 7); g.fill(); }
    g.strokeStyle = "#9a3412"; g.lineWidth = 0.035 * s; g.beginPath(); g.arc(0.3 * hr, headY + 0.35 * hr, hr * 0.28, 0.2, Math.PI - 0.6); g.stroke();
    g.fillStyle = "rgba(244,114,182,.45)"; g.beginPath(); g.arc(0.75 * hr, headY + 0.35 * hr, hr * 0.14, 0, 7); g.fill();
    g.restore();
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function label(g, x, y, text, color, s) {
    g.font = `800 ${Math.round(0.36 * s)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.direction = "rtl";
    const w = g.measureText(text).width + 0.4 * s, h = 0.5 * s;
    g.fillStyle = color; rr(g, x - w / 2, y - h / 2, w, h, h / 2); g.fill();
    g.fillStyle = "#fff"; g.fillText(text, x, y + 0.02 * s);
  }
  function bubble(g, x, y, text, s) {
    g.font = `800 ${Math.round(0.4 * s)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.direction = "rtl";
    const w = g.measureText(text).width + 0.6 * s, h = 0.7 * s, bx = clamp(x - w / 2, 4, g.canvas.width - w - 4);
    g.fillStyle = "#fff"; g.strokeStyle = "#1e3a8a"; g.lineWidth = 0.05 * s;
    rr(g, bx, y - h, w, h, 0.25 * s); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - 0.15 * s, y - 0.02 * s); g.lineTo(x, y + 0.25 * s); g.lineTo(x + 0.15 * s, y - 0.02 * s); g.fill();
    g.fillStyle = "#1e3a8a"; g.fillText(text, bx + w / 2, y - h / 2 + 0.02 * s);
  }

  // ---------------------------------------------------------------- الشاشة الأولى
  function heroLoop(c) {
    const x = c.getContext("2d");
    let raf = 0;
    const loop = (t) => {
      x.clearRect(0, 0, c.width, c.height);
      const s = c.height / 2.6, ph = t / 140;
      x.fillStyle = "#65a30d"; x.fillRect(0, c.height - 10, c.width, 10);
      drawKid(x, c.width * 0.36, c.height - 10, s, "big", 1, ph, "walk");
      drawKid(x, c.width * 0.66, c.height - 10 - Math.abs(Math.sin(t / 300)) * s * 0.4, s, "small", -1, ph + 1, Math.sin(t / 300) > 0.2 ? "air" : "walk");
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }
  function homeScreen() {
    K.begin();
    loadFamily();
    const cont = save.cp && save.cp.n <= N ? save.cp.n : Math.min(save.max, N);
    const done = Object.keys(save.done).length;
    K.paint(`
      <div class="title"><canvas class="hero" width="300" height="220"></canvas><div><h1>${GAME}</h1><div class="sub">أخوان… وكل واحد يحتاج أخاه 💙</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#2563eb,#f97316)" ${K.act("play", () => K.show(pickScreen, cont))}>
          <span class="big emo">▶️</span><b>${done ? "نكمل" : "نبدأ"}</b><small>المرحلة ${cont}: ${K.esc(LEVELS[cont - 1].name)}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#0ea5e9,#22c55e)" ${K.act("levels", () => K.show(levelsScreen))}>
          <span class="big emo">🗺️</span><b>المراحل</b><small>${done} / ${N}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#a855f7,#ec4899)" ${K.act("how", () => K.show(howScreen))}>
          <span class="big emo">❓</span><b>كيف نلعب؟</b><small>الأزرار والأشياء</small></button>
      </div>
      <div class="help">لاعبان معاً: كل لاعب بيد تحكم · بلا يد: <b>الأسهم + Enter</b> و <b>W A S D + F</b> · <b>Backspace</b> أو <b>○</b> للرجوع</div>`, "play");
    const stop = heroLoop(K.app.querySelector(".hero"));
    K.mode = { stop };
  }

  function levelsScreen() {
    K.begin();
    const tiles = LEVELS.map((L, i) => {
      const n = i + 1, open = n <= save.max, ok = save.done[n];
      return `<button class="tile lv f ${open ? "" : "lock"} ${ok ? "ok" : ""}" ${K.act("l" + n, () => (open ? K.show(pickScreen, n) : K.sfx.bad()))}>
        <b>${open ? n : "🔒"}</b><small>${open ? K.esc(L.name) : ""}</small>${ok ? '<i class="emo">✅</i>' : ""}</button>`;
    }).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2>🗺️ المراحل</h2><span class="pill">${Object.keys(save.done).length} / ${N}</span></div>
      <div class="grid">${tiles}</div>
      ${K.HELP}`, "l" + Math.min(save.max, N));
  }

  function howScreen() {
    K.begin();
    const row = (e, t) => `<div class="hw"><span class="emo">${e}</span><span>${t}</span></div>`;
    K.paint(`
      <div class="top">${K.backBtn()}<h2>❓ كيف نلعب؟</h2><span></span></div>
      <div class="how">
        <div class="col">
          <h3>🟦 الأخ الكبير</h3>
          ${row("💪", "يحمل أخاه الصغير ويرميه، ويدفع الصناديق")}
          ${row("🌊", "يمشي في الماء العميق")}
          ${row("⚖️", "يضغط الأزرار الثقيلة")}
          <h3>🟧 الأخ الصغير</h3>
          ${row("🦘", "يقفز أعلى من أخيه")}
          ${row("🕳️", "يمرّ من الأنفاق الصغيرة")}
          ${row("🧗", "يصعد على كتف أخيه ليصل إلى الأماكن العالية")}
        </div>
        <div class="col">
          <h3>🎮 الأزرار</h3>
          ${row("✕", "قفز، أو ⬆️ (الكيبورد: ⬆️ · W)")}
          ${row("□", "حمل / رمي / عتلة، أو ○ △ (Enter · F)")}
          ${row("⬇️", "الكبير يُنزل أخاه بهدوء")}
          ${row("⏸️", "استراحة: Options (Backspace)")}
          <h3>🧩 في المراحل</h3>
          ${row("🔴", "الزر يفتح الباب بلونه ما دام أحد واقفاً عليه")}
          ${row("🕹️", "العتلة تفتح الباب وتبقيه مفتوحاً")}
          ${row("🚩", "العلم يحفظ إذا وصل إليه الأخوان معاً")}
          ${row("🚪", "باب النهاية يحتاج الأخوين معاً، و🏆 الكأس يكفيها واحد")}
        </div>
      </div>`, "back");
  }

  // ---------------------------------------------------------------- من يلعب؟ (قبل كل مرحلة)
  function pickScreen(n) {
    K.begin();
    loadFamily();
    const L = LEVELS[n - 1];
    let names = defaultNames(), big = save.big ? 1 : 0, ready = [false, false], raf = 0, starting = false, devs = ["", ""];
    K.paint(`
      <div class="top">${K.backBtn()}<h2>المرحلة ${n}: ${K.esc(L.name)}</h2><span class="pill">من يلعب؟</span></div>
      <div class="pick"><div class="pc" data-p="0"></div><div class="pc" data-p="1"></div></div>
      <div class="nav"><button class="btn f" ${K.act("swap", () => { swap(); })}>🔄 تبديل الأخوين</button>
        <button class="btn go f" ${K.act("go", () => go())}>▶ ابدأ</button></div>
      <div class="help">كل لاعب بجهازه: <b>⬅️ ➡️</b> اختر اسمك · <b>⬆️ ⬇️</b> بدّلا الأخوين · <b>✕</b> أو <b>Enter</b> أو <b>F</b> جاهز</div>`, "go");
    const cards = [...K.app.querySelectorAll(".pc")];
    const roleOf = (p) => (p === big ? "big" : "small");
    function draw() {
      cards.forEach((c, p) => {
        const r = roleOf(p), R = ROLE[r];
        c.className = "pc " + r + (ready[p] ? " ready" : "");
        c.innerHTML = `
          <div class="who">اللاعب ${p ? "٢" : "١"} · <span>${devs[p] ? devName(devs[p]) : ""}</span></div>
          <canvas width="200" height="210"></canvas>
          <div class="role">${R.emo} ${R.name}</div>
          <div class="nm"><button class="ar" data-pk="${p}:-1">◀</button><b>${K.esc(names[p])}</b><button class="ar" data-pk="${p}:1">▶</button></div>
          <button class="rd" data-pk="${p}:ok">${ready[p] ? (ready[1 - p] ? "✓ جاهز!" : "✓ جاهز! ننتظر أخاك…") : "اضغط ✕ / Enter عندما تكون جاهزاً"}</button>`;
        const cv = c.querySelector("canvas"), g = cv.getContext("2d");
        drawKid(g, 100, 200, 112, r, p ? -1 : 1, 0, "walk");
      });
    }
    function swap() { big = 1 - big; ready = [false, false]; snd.click(); draw(); }
    function step(p, d) { const Ls = nameList(); let i = Ls.indexOf(names[p]); i = (i + d + Ls.length) % Ls.length; names[p] = Ls[i]; ready[p] = false; K.sfx.tick(); draw(); }
    function toggle(p) {
      if (ready[p] && !ready[1 - p]) { go(); return; }   // ضغطة ثانية: نبدأ (لمن لا يجد أخوه جهازاً بعد)
      ready[p] = !ready[p]; ready[p] ? K.sfx.pop() : K.sfx.tick(); draw();
      if (ready[0] && ready[1]) K.later(go, 350);
    }
    function go() {
      if (starting) return; starting = true;
      save.names = names.slice(); save.big = big; save.save();
      K.replace(playScreen, n, { names: names.slice(), big });
    }
    K.app.querySelector(".pick").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pk]"); if (!b) return;
      const [p, a] = b.dataset.pk.split(":"); K.audioCtx();
      if (a === "ok") toggle(+p); else step(+p, +a);
    });
    loadFamily().then(() => { if (K.top() && K.top().fn === pickScreen) { names = defaultNames(); draw(); } });
    clearInput();
    const loop = () => {
      const I = inputs();
      let ch = false;
      I.forEach((x, p) => {
        if (x.dev !== devs[p]) { devs[p] = x.dev; ch = true; }
        if (x.e.left) step(p, -1); else if (x.e.right) step(p, 1);
        else if (x.e.up || x.e.down) swap();
        else if (x.e.ok) toggle(p);
        else if (x.e.pause || x.e.back) K.back();
      });
      if (ch) draw();
      raf = requestAnimationFrame(loop);
    };
    draw();
    raf = requestAnimationFrame(loop);
    K.mode = {
      key(e) {
        if (e.pad) return false;   // اليد الأساسية تصل أيضاً عبر poll
        if (e.key === "Backspace") { K.back(); return true; }
        if (e.repeat) return true;
        return kbKey(e, true);
      },
      keyup(e) { kbKey(e, false); },
      poll() { return true; },
      stop() { cancelAnimationFrame(raf); clearInput(); },
    };
  }

  // ---------------------------------------------------------------- اللعب
  function playScreen(n, who) {
    K.begin();
    const LV = LEVELS[n - 1];
    K.paint(`<canvas id="cv"></canvas>
      <div class="hud"><button class="hb" data-h="pause">⏸️</button><div class="lvl">المرحلة ${n} · ${K.esc(LV.name)}</div><div class="chips"></div><button class="hb" data-h="touch">🖐️</button></div>
      <div class="hint">${K.esc(LV.hint)}</div>
      <div class="tc"></div><div class="ov"></div>`);
    const cv = K.app.querySelector("#cv"), g = cv.getContext("2d"), ovEl = K.app.querySelector(".ov"), hintEl = K.app.querySelector(".hint");
    const names = who.names, bigP = who.big;
    const roleP = (r) => (r === "big" ? bigP : 1 - bigP);

    // العالم
    const S = new Uint8Array(W * H), G = [];
    const plates = [], levers = [], doors = [], bridges = [], flags = [], jpads = [], boxes = [], water = [];
    let exit = null, trophy = null;
    const starts = {};
    LV.map.forEach((row, y) => {
      G.push([...row]);
      [...row].forEach((ch, x) => {
        let k = ".";
        if (ch === "#") { S[y * W + x] = 1; k = "#"; }
        else if (ch === "-") { S[y * W + x] = 2; k = "-"; }
        else if (ch === "^" || ch === "~") { k = ch; if (ch === "~") water.push({ x, y }); }
        else if (ch === "1") starts.big = { x, y };
        else if (ch === "2") starts.small = { x, y };
        else if (ch === "X") boxes.push({ box: true, x: x + 0.02, y: y + 0.04, w: 0.96, h: 0.96, vx: 0, vy: 0, ground: null });
        else if (ch === "F") flags.push({ x, y, on: false });
        else if (ch === "J") jpads.push({ x, y, t: 0 });
        else if (ch === "E") exit = { x, y };
        else if (ch === "*") trophy = { x, y };
        else if ("abcd".includes(ch)) plates.push({ x, y, c: "abcd".indexOf(ch), heavy: false, on: false });
        else if ("efgh".includes(ch)) plates.push({ x, y, c: "efgh".indexOf(ch), heavy: true, on: false });
        else if ("lmno".includes(ch)) levers.push({ x, y, c: "lmno".indexOf(ch), on: false });
        else if ("ABCD".includes(ch)) doors.push({ x, y, c: "ABCD".indexOf(ch), solid: true, a: 1 });
        else if ("PQRS".includes(ch)) bridges.push({ x, y, c: "PQRS".indexOf(ch), solid: false, a: 0 });
        G[y][x] = k;
      });
    });
    const mk = (role) => ({ role, ...ROLE[role], x: 0, y: 0, vx: 0, vy: 0, face: 1, ground: null, coy: 0, jbuf: 0, ph: 0, carry: null, carried: false, thrown: false, inWater: false, jt: 0 });
    const BIG = mk("big"), SMALL = mk("small"), CH = [BIG, SMALL];
    const nameOf = (c) => names[roleP(c.role)];
    let active = [false, false, false, false];
    let state = "play", stT = 0, paused = false, T = 0, winner = null;
    let bubbles = [], parts = [], said = {}, cp = null;

    // الحفظ داخل المرحلة: مكان الأخوين والصناديق والعتلات
    function snap(fx) {
      const at = fx ? [[fx.x - 0.45, fx.y + 1 - BIG.h], [fx.x + 0.6, fx.y + 1 - SMALL.h]] : CH.map((c) => [c.x, c.y]);
      return { at, boxes: boxes.map((b) => [b.x, b.y]), levers: levers.map((l) => l.on), flags: flags.map((f) => f.on) };
    }
    function restore(s) {
      CH.forEach((c, i) => { c.x = s.at[i][0]; c.y = s.at[i][1]; c.vx = c.vy = 0; c.ground = null; c.carry = null; c.carried = false; c.thrown = false; c.jbuf = 0; });
      boxes.forEach((b, i) => { if (s.boxes[i]) { b.x = s.boxes[i][0]; b.y = s.boxes[i][1]; } b.vx = b.vy = 0; b.ground = null; });
      levers.forEach((l, i) => { l.on = !!s.levers[i]; });
      flags.forEach((f, i) => { f.on = !!(s.flags && s.flags[i]); });
      updateSwitches(true);
    }
    let start = null;

    // ---------------------------------------------------------------- التصادم
    const solidAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? 1 : S[ty * W + tx]);
    const ox_ = (ax, aw, b) => Math.min(ax + aw, b.x + b.w) - Math.max(ax, b.x);
    // صندوق التصادم: الكبير وهو يحمل أخاه أطول
    const top = (b) => (b.carry ? b.y - b.carry.h : b.y);
    const colHit = (col, y, h) => { for (let ty = Math.floor(y + EPS); ty <= Math.floor(y + h - EPS); ty++) if (solidAt(col, ty) === 1) return true; return false; };
    const rowHit = (row, x, w, oneway, prevBot) => {
      for (let tx = Math.floor(x + EPS); tx <= Math.floor(x + w - EPS); tx++) { const s = solidAt(tx, row); if (s === 1 || (oneway && s === 2 && prevBot <= row + 0.02)) return true; }
      return false;
    };
    const ridersOf = (base) => CH.filter((c) => c !== base && !c.carried && c.ground === base);
    function blockers(b) { return b.box ? [...boxes.filter((o) => o !== b), ...CH.filter((c) => !c.carried)] : boxes; }
    function moveX(b, dx, pusher) {
      if (!dx) return 0;
      const ty = top(b), th = b.y + b.h - ty;
      let nx = b.x + dx;
      if (dx > 0) { const col = Math.floor(nx + b.w - EPS); if (colHit(col, ty, th)) nx = col - b.w; }
      else { const col = Math.floor(nx + EPS); if (colHit(col, ty, th)) nx = col + 1; }
      for (const o of blockers(b)) {
        if (o === pusher || o === b) continue;
        const oy = Math.min(b.y + b.h, o.y + o.h) - Math.max(ty, top(o));
        if (oy <= 0.08 || ox_(nx, b.w, o) <= EPS) continue;
        if (!b.box && o.box) {
          if (b.role === "big") {
            const need = dx > 0 ? nx + b.w - o.x : nx - (o.x + o.w);
            moveX(o, need, b); b.push = 0.15;
          } else if (!said.heavyBox) say(b, "الصندوق ثقيل! 📦", "heavyBox");
        }
        if (ox_(nx, b.w, o) > EPS) nx = dx > 0 ? Math.min(nx, o.x - b.w) : Math.max(nx, o.x + o.w);
      }
      const moved = nx - b.x;
      b.x = nx;
      if (moved && b.box) for (const r of ridersOf(b)) moveX(r, moved);
      return moved;
    }
    function moveY(b, dy) {
      const ext = b.y - top(b), prevBot = b.y + b.h, prevTop = top(b);
      let ny = b.y + dy, land = null, bonk = false;
      if (dy > 0) {
        const row = Math.floor(ny + b.h - EPS);
        if (rowHit(row, b.x, b.w, true, prevBot)) { ny = row - b.h; land = "t"; }
        const on = b.box ? boxes : [...boxes, ...CH.filter((c) => c !== b && !c.carried && c.ground !== b && c.carry !== b)];
        for (const o of on) {
          if (o === b || ox_(b.x, b.w, o) <= 0.05) continue;
          const ot = top(o);
          if (prevBot <= ot + 0.02 && ny + b.h >= ot && ot - b.h <= ny + EPS) { ny = ot - b.h; land = o; }
        }
      } else if (dy < 0) {
        const nt = ny - ext, row = Math.floor(nt + EPS);
        if (rowHit(row, b.x, b.w, false)) { ny = row + 1 + ext; bonk = true; }
        if (!b.box) for (const o of boxes) if (ox_(b.x, b.w, o) > 0.05 && prevTop >= o.y + o.h - 0.02 && nt < o.y + o.h) { ny = o.y + o.h + ext; bonk = true; }
      }
      const moved = ny - b.y;
      b.y = ny;
      if (land) { if (!b.ground && b.vy > 6 && !b.box) snd.land(); b.vy = 0; }
      if (bonk) b.vy = 0;
      b.ground = land;
      return moved;
    }

    // ---------------------------------------------------------------- الأزرار والأبواب
    const overlapsTile = (b, tx, ty, m = 0.02) => b.x < tx + 1 - m && b.x + b.w > tx + m && top(b) < ty + 1 - m && b.y + b.h > ty + m;
    const bodies = () => [...CH, ...boxes];
    function updateSwitches(force) {
      const prev = active.slice();
      for (const p of plates) {
        const was = p.on;
        p.on = bodies().some((b) => (!b.carried) && (!p.heavy || b.box || b.role === "big") &&
          ox_(p.x + 0.1, 0.8, b) > 0.25 && b.y + b.h > p.y + 0.55 && b.y + b.h <= p.y + 1.05);
        if (p.on && !was && !force) snd.click();
        if (p.heavy && !p.on && !said["hv" + p.x] && !SMALL.carried && ox_(p.x + 0.1, 0.8, SMALL) > 0.25 && Math.abs(SMALL.y + SMALL.h - p.y - 1) < 0.05)
          say(SMALL, "ثقيل! أحتاج أخي الكبير 💪", "hv" + p.x), snd.heavy();
      }
      active = [0, 1, 2, 3].map((c) => plates.some((p) => p.c === c && p.on) || levers.some((l) => l.c === c && l.on));
      const occ = (tx, ty) => bodies().some((b) => overlapsTile(b, tx, ty));
      let opened = false;
      for (const d of doors) {
        let want = !active[d.c];
        if (want && !d.solid && occ(d.x, d.y)) want = false;
        if (d.solid && !want) opened = true;
        d.solid = want; S[d.y * W + d.x] = want ? 1 : 0;
      }
      for (const b of bridges) {
        let want = active[b.c];
        if (want && !b.solid && occ(b.x, b.y)) want = false;
        b.solid = want; S[b.y * W + b.x] = want ? 1 : 0;
      }
      if (!force && opened && active.some((a, i) => a && !prev[i])) snd.door();
    }
    function say(c, text, key) { if (key) said[key] = 1; bubbles = bubbles.filter((b) => b.c !== c); bubbles.push({ c, text, t: 3 }); }
    function puff(x, y, col, k = 8) { for (let i = 0; i < (LITE ? k / 2 : k); i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5, t: 0, life: 0.7 + Math.random() * 0.4, col }); }

    // ---------------------------------------------------------------- خطوة الفيزياء
    let I = [null, null];
    function control(c, inp, dt) {
      const R = c, e = inp.e;
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (c.carried) {   // الصغير على كتف أخيه
        if (e.jump) { const b = BIG; b.carry = null; c.carried = false; c.vy = -c.jump * 0.85; c.vx = dir * c.speed; snd.jump(); }
        else if (dir) c.face = dir;
        return;
      }
      if (c.ground) { c.coy = 0.09; c.thrown = false; } else c.coy -= dt;
      if (e.jump) c.jbuf = 0.13; else c.jbuf -= dt;
      const sp = R.speed * (c.inWater ? 0.6 : 1) * (c.push > 0 ? 0.6 : 1);
      // في الهواء يحتفظ الأخ باتجاهه إذا لم يُضغط شيء (الريموت لا يضغط سهمين معاً: قفز ثم سهم يكفي)
      if (!c.thrown && (c.ground || dir)) c.vx = dir * sp;
      // مساعدة على التوقف: يقف الأخ على الزر القريب، ويثبت في وسط ظهر أخيه
      if (!dir && !c.thrown && c.ground) {
        const cx = c.x + c.w / 2;
        let tgt = null;
        if (c.ground === BIG || c.ground === SMALL) tgt = c.ground.x + c.ground.w / 2;
        else {
          const pl = plates.find((q) => !q.on && (!q.heavy || c.role === "big") && Math.abs(q.x + 0.5 - cx) < 0.75 && Math.abs(c.y + c.h - q.y - 1) < 0.1);
          if (pl) tgt = pl.x + 0.5;
        }
        if (tgt !== null && Math.abs(tgt - cx) > 0.03) c.vx = clamp((tgt - cx) * 8, -2.5, 2.5);
      }
      else if (dir && Math.sign(dir) !== Math.sign(c.vx)) c.vx *= 0.9;
      if (dir) c.face = dir;
      if (c.jbuf > 0 && c.coy > 0) {
        const fromBro = c.ground === BIG || c.ground === SMALL;   // القفز من ظهر الأخ أعلى قليلاً
        c.vy = -R.jump * (c.inWater ? 0.92 : fromBro ? 1.08 : 1); c.jbuf = 0; c.coy = 0; c.ground = null; c.jt = 0.2; snd.jump();
      }
      if (e.act) action(c);
      if (e.down && c.carry) putDown();
    }
    function action(c) {
      const lv = levers.find((l) => overlapsTile(c, l.x, l.y, 0.1));
      if (lv) {
        lv.on = !lv.on; snd.click(); puff(lv.x + 0.5, lv.y + 0.5, COL[lv.c]);
        return;
      }
      if (c.role === "big") {
        if (c.carry) { throwSmall(); return; }
        const s = SMALL, dx = Math.abs(s.x + s.w / 2 - (c.x + c.w / 2)), dyFeet = Math.abs(s.y + s.h - (c.y + c.h));
        if (!s.carried && dx < 1.05 && (dyFeet < 1.0 || s.ground === c)) {
          // مكان فوق رأسه فارغ؟
          const ty = c.y - s.h;
          if (!rowHit(Math.floor(ty + EPS), c.x, c.w, false) && !colHit(Math.floor(c.x + EPS), ty, s.h) && !colHit(Math.floor(c.x + c.w - EPS), ty, s.h)) {
            c.carry = s; s.carried = true; s.ground = null; s.thrown = false; snd.pick();
          } else say(c, "لا مكان هنا! ⬆️", null);
        }
      } else {
        const b = BIG;
        if (Math.abs(c.x + c.w / 2 - (b.x + b.w / 2)) < 1.2 && Math.abs(c.y + c.h - (b.y + b.h)) < 2) {
          for (let i = 0; i < 3; i++) parts.push({ x: c.x + c.w / 2, y: c.y, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2, t: 0, life: 1.2, txt: "💙" });
          snd.heart();
        }
      }
    }
    function throwSmall() {
      const b = BIG, s = SMALL;
      b.carry = null; s.carried = false; s.thrown = true; s.vx = b.face * 8; s.vy = -15; s.face = b.face; s.ground = null;
      snd.toss(); puff(s.x + s.w / 2, s.y + s.h, "#e2e8f0", 6);
    }
    function putDown() {
      const b = BIG, s = SMALL, f = b.face;
      const nx = f > 0 ? b.x + b.w + 0.04 : b.x - s.w - 0.04, ny = b.y + b.h - s.h;
      const free = !colHit(Math.floor(nx + EPS), ny, s.h) && !colHit(Math.floor(nx + s.w - EPS), ny, s.h) && rowHit(Math.floor(b.y + b.h + 0.01), nx, s.w, true, ny + s.h);
      b.carry = null; s.carried = false; s.vx = 0; s.vy = 0;
      if (free) { s.x = nx; s.y = ny; }
      snd.pick();
    }
    function physics(dt) {
      // الماء: الكبير يمشي ببطء، والصغير يغرق
      for (const c of CH) {
        c.inWater = water.some((w) => overlapsTile(c, w.x, w.y, 0.15));
        if (c.push > 0) c.push -= dt;
      }
      CH.forEach((c, i) => control(c, I[roleP(c.role)], dt));
      for (const c of CH) {
        if (c.carried) continue;
        c.vy = Math.min(MAXF, c.vy + GRAV * dt);
        const before = c.x, m = moveX(c, c.vx * dt);
        if (c.thrown && Math.abs(m) < Math.abs(c.vx * dt) - EPS) c.vx = 0;
        if (m) for (const r of ridersOf(c)) moveX(r, c.x - before);
        if (c.vx && c.ground) c.ph += Math.abs(c.vx) * dt * 3.2;
      }
      for (const c of CH) {
        if (c.carried) continue;
        const riders = ridersOf(c), my = moveY(c, c.vy * dt);
        if (my < 0) for (const r of riders) {   // يقفز وأخوه على كتفه: يرفعه معه
          const rm = moveY(r, my);
          if (rm > my + EPS) { c.y = r.y + r.h; c.vy = 0; }
          r.ground = c;
        }
      }
      for (const b of boxes) { b.vy = Math.min(MAXF, b.vy + GRAV * dt); moveY(b, b.vy * dt); }
      if (BIG.carry) { const s = SMALL; s.x = BIG.x + (BIG.w - s.w) / 2; s.y = BIG.y - s.h; s.vx = s.vy = 0; s.face = BIG.face; }
      // النوابض
      for (const j of jpads) {
        j.t = Math.max(0, j.t - dt);
        for (const c of CH) if (!c.carried && c.ground && ox_(j.x + 0.1, 0.8, c) > 0.2 && Math.abs(c.y + c.h - j.y - 1) < 0.05) {
          c.vy = -21; c.ground = null; c.coy = 0; j.t = 0.25; snd.boing();
          if (c.carry) c.vy = -21;
        }
      }
      updateSwitches(false);
    }
    function hazards() {
      for (const c of CH) {
        const x0 = Math.floor(c.x + 0.1), x1 = Math.floor(c.x + c.w - 0.1), y0 = Math.floor(top(c) + 0.1), y1 = Math.floor(c.y + c.h - 0.05);
        for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
          const k = G[ty] && G[ty][tx];
          if (k === "^" && c.y + c.h > ty + 0.45) return die(c, "أشواك! 🌵");
          if (k === "~" && c.role === "small" && !c.carried && c.y + c.h > ty + 0.55) return die(c, "الماء عميق! 🌊");
        }
      }
      // ماء قريب من الصغير: تلميح مرة واحدة
      if (!said.water && water.length && !SMALL.carried && SMALL.ground && water.some((w) => Math.abs(w.x + 0.5 - (SMALL.x + SMALL.w / 2)) < 1.6 && Math.abs(w.y - SMALL.y) < 1.5))
        say(SMALL, "الماء عميق! احملني يا أخي 🌊", "water");
    }
    function die(c, why) {
      state = "dead"; stT = 0; snd.hurt();
      puff(c.x + c.w / 2, c.y + c.h / 2, "#fff", 14);
      say(c, why, null);
    }
    function checkpoints() {
      for (let i = 0; i < flags.length; i++) {
        const f = flags[i];
        if (f.on) continue;
        if (CH.every((c) => Math.abs(c.x + c.w / 2 - f.x - 0.5) < 2.6 && Math.abs(c.y + c.h - f.y - 1) < 2.6)) {
          flags.forEach((o, k) => { if (k <= i) o.on = true; });
          cp = snap(f); save.cp = { n, s: cp }; save.save();
          snd.flag(); puff(f.x + 0.5, f.y, "#22c55e", 14);
          say(BIG, "حفظنا! 🚩", null);
        } else if (!said["f" + i] && CH.some((c) => Math.abs(c.x + c.w / 2 - f.x - 0.5) < 1.2 && Math.abs(c.y + c.h - f.y - 1) < 1.5)) {
          const c = CH.find((c) => Math.abs(c.x + c.w / 2 - f.x - 0.5) < 1.2);
          say(c, "تعال يا أخي! نحفظ معاً 🚩", "f" + i);
        }
      }
    }
    function goals() {
      if (LV.end === "both" && exit) {
        const at = (c) => Math.abs(c.x + c.w / 2 - exit.x - 0.5) < 0.85 && c.y + c.h > exit.y + 0.4 && top(c) < exit.y + 1;
        exit.who = CH.map((c) => at(c) || (c.carried && at(BIG)));
        if (exit.who[0] && exit.who[1]) win(null);
        else if ((exit.who[0] || exit.who[1]) && !said.exit) say(CH[exit.who[0] ? 0 : 1], "ننتظر أخي! 🚪", "exit");
      } else if (trophy) {
        const c = CH.find((c) => overlapsTile(c, trophy.x, trophy.y, 0.15));
        if (c) win(c);
      }
    }
    function win(c) {
      state = "win"; stT = 0; winner = c;
      K.sfx.win(); K.confetti(LITE ? 14 : 30, "🎉✨💙🧡🏆");
      save.done[n] = 1; save.max = Math.min(N, Math.max(save.max, n + 1)); save.cp = null; save.save();
      K.later(showWin, 1300);
    }

    // ---------------------------------------------------------------- الشاشات فوق اللعب
    function showWin() {
      const hr = HELPER[n], helper = hr ? nameOf(hr === "big" ? BIG : SMALL) : null;
      let msg = `${K.esc(names[0])} و ${K.esc(names[1])}: أنتما فريق رائع! 💪`;
      if (winner) {
        const other = winner === BIG ? SMALL : BIG;
        msg = `🏆 وصل ${K.esc(nameOf(winner))} إلى الكأس!<br>وأحسنت يا ${K.esc(nameOf(other))}: تركتَ أخاك يكمل وساعدته 💙`;
      } else if (helper) msg = `أحسنت يا ${K.esc(helper)}: ساعدت أخاك طوال المرحلة 💙`;
      const last = n >= N;
      overlay(`<div class="card"><div class="emo big">${last ? "🏠🎉" : winner ? "🏆" : "🎉"}</div>
        <h2>${last ? "أنهيتما كل المراحل!" : "أحسنتما!"}</h2><p>${msg}</p>
        <div class="nav">${last ? "" : `<button class="btn go f" ${K.act("next", () => K.replace(pickScreen, n + 1))}>▶ المرحلة ${n + 1}</button>`}
        <button class="btn f" ${K.act("again", () => { save.cp = null; save.save(); K.replace(playScreen, n, who); })}>🔄 مرة أخرى</button>
        <button class="btn f" ${K.act("map", () => { K.home(); K.show(levelsScreen); })}>🗺️ المراحل</button></div></div>`, last ? "map" : "next");
    }
    function overlay(html, focus) {
      ovEl.innerHTML = html; ovEl.classList.add("on");
      K.focus(ovEl.querySelector(`.f[data-k="${focus}"]`) || ovEl.querySelector(".f"));
    }
    const closeOv = () => { ovEl.classList.remove("on"); ovEl.innerHTML = ""; };
    function pause() {
      if (state !== "play" || paused) return;
      paused = true; clearInput();
      overlay(`<div class="card"><div class="emo big">⏸️</div><h2>استراحة</h2><p>${K.esc(LV.hint)}</p>
        <div class="nav col"><button class="btn go f" ${K.act("resume", resume)}>▶ نكمل</button>
        ${cp ? `<button class="btn f" ${K.act("toflag", () => { resume(); restore(cp); })}>🚩 نرجع إلى العلم</button>` : ""}
        <button class="btn f" ${K.act("restart", () => { save.cp = null; save.save(); K.replace(playScreen, n, who); })}>🔄 نعيد المرحلة</button>
        <button class="btn f" ${K.act("quit", () => { K.home(); K.show(levelsScreen); })}>🗺️ المراحل</button></div></div>`, "resume");
    }
    function resume() { paused = false; closeOv(); clearInput(); inputs(); I = [null, null]; lastT = 0; }

    // ---------------------------------------------------------------- أزرار اللمس
    const tcEl = K.app.querySelector(".tc");
    let touchOn = false;
    try { touchOn = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window; } catch {}
    function buildTouch() {
      tcEl.innerHTML = touchOn ? [0, 1].map((p) => `<div class="pad p${p} ${p === bigP ? "big" : "small"}" data-p="${p}">
        <button data-a="left">◀</button><button data-a="right">▶</button><button data-a="jump">⤒</button><button data-a="act">✋</button><button data-a="down">⤓</button></div>`).join("") : "";
    }
    buildTouch();
    const tOn = (e, v) => {
      const b = e.target.closest("[data-a]"), pd = e.target.closest("[data-p]"); if (!b || !pd) return;
      const p = +pd.dataset.p, a = b.dataset.a;
      if (v && !tHeld[p][a]) tEdge[p][a] = true;
      tHeld[p][a] = v; b.classList.toggle("on", v); e.preventDefault(); K.audioCtx();
    };
    tcEl.addEventListener("pointerdown", (e) => { try { e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); } catch {} tOn(e, true); });
    tcEl.addEventListener("pointerup", (e) => tOn(e, false));
    tcEl.addEventListener("pointercancel", (e) => tOn(e, false));
    tcEl.addEventListener("pointerout", (e) => tOn(e, false));
    K.app.querySelector(".hud").addEventListener("click", (e) => {
      const b = e.target.closest("[data-h]"); if (!b) return;
      if (b.dataset.h === "pause") pause(); else { touchOn = !touchOn; buildTouch(); }
    });

    // ---------------------------------------------------------------- الرسم
    let ts = 40, ox = 0, oy = 0, dpr = 1, bg = null;
    function resize() {
      dpr = LITE ? 1 : Math.min(devicePixelRatio || 1, 1.5);
      const w = innerWidth, h = innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + "px"; cv.style.height = h + "px";
      ts = Math.floor(Math.min(cv.width / W, cv.height / H));
      ox = Math.floor((cv.width - ts * W) / 2); oy = Math.floor((cv.height - ts * H) / 2);
      bg = drawStatic();
    }
    function drawStatic() {
      const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height;
      const x = c.getContext("2d"), s = ts;
      const sky = x.createLinearGradient(0, 0, 0, c.height);
      sky.addColorStop(0, "#7dd3fc"); sky.addColorStop(0.7, "#e0f2fe"); sky.addColorStop(1, "#bbf7d0");
      x.fillStyle = sky; x.fillRect(0, 0, c.width, c.height);
      // تلال بعيدة
      x.fillStyle = "rgba(134,239,172,.55)";
      for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(ox + (i * 7 + 3) * s, oy + 16 * s, 5 * s, 4 * s, 0, Math.PI, 0); x.fill(); }
      const solidT = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H || G[ty][tx] === "#";
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        const k = G[ty][tx], px = ox + tx * s, py = oy + ty * s;
        if (k === "#") {
          const edge = tx === 0 || ty === 0 || tx === W - 1 || ty === H - 1;
          x.fillStyle = edge ? "#57534e" : (tx + ty) % 2 ? "#a16207" : "#a8650c"; x.fillRect(px, py, s + 1, s + 1);
          if (!edge) { x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(px + s * 0.2, py + s * 0.55, s * 0.15, s * 0.12); x.fillRect(px + s * 0.65, py + s * 0.3, s * 0.12, s * 0.1); }
          else { x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = 1; x.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1); }
          if (!solidT(tx, ty - 1) && ty > 0) { x.fillStyle = "#65a30d"; x.fillRect(px, py, s + 1, s * 0.22); x.fillStyle = "#84cc16"; x.fillRect(px, py, s + 1, s * 0.1); }
        } else if (k === "-") {
          x.fillStyle = "#b45309"; rr(x, px, py, s, s * 0.26, s * 0.08); x.fill();
          x.fillStyle = "#d97706"; x.fillRect(px + 2, py + 2, s - 4, s * 0.08);
        } else if (k === "^") {
          x.fillStyle = "#94a3b8";
          for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(px + i * s / 3, py + s); x.lineTo(px + (i + 0.5) * s / 3, py + s * 0.4); x.lineTo(px + (i + 1) * s / 3, py + s); x.fill(); }
          x.fillStyle = "#e2e8f0"; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(px + (i + 0.5) * s / 3, py + s * 0.4); x.lineTo(px + (i + 0.62) * s / 3, py + s * 0.65); x.lineTo(px + (i + 0.5) * s / 3, py + s * 0.65); x.fill(); }
        }
      }
      return c;
    }
    function draw() {
      const s = ts, x = g;
      x.drawImage(bg, 0, 0);
      const P = (v) => ox + v * s, Q = (v) => oy + v * s;
      // الماء
      for (const w of water) {
        const px = P(w.x), py = Q(w.y);
        x.fillStyle = "rgba(37,99,235,.55)"; x.fillRect(px, py + s * 0.15, s + 1, s * 0.85);
        if (!LITE) { x.fillStyle = "rgba(191,219,254,.8)"; x.fillRect(px, py + s * (0.12 + 0.05 * Math.sin(T * 3 + w.x)), s + 1, s * 0.08); }
      }
      // الجسور والأبواب
      for (const b of bridges) {
        b.a += ((b.solid ? 1 : 0) - b.a) * 0.25;
        const px = P(b.x), py = Q(b.y);
        if (b.a > 0.05) { x.globalAlpha = b.a; x.fillStyle = COL[b.c]; rr(x, px + 1, py, s - 2, s * 0.32, s * 0.08); x.fill(); x.fillStyle = COLD[b.c]; x.fillRect(px + s * 0.45, py + 2, s * 0.1, s * 0.28); x.globalAlpha = 1; }
        if (b.a < 0.95) { x.setLineDash([s * 0.12, s * 0.12]); x.strokeStyle = COL[b.c]; x.lineWidth = 2; x.strokeRect(px + 2, py + 2, s - 4, s * 0.28); x.setLineDash([]); }
      }
      for (const d of doors) {
        d.a += ((d.solid ? 1 : 0) - d.a) * 0.25;
        const px = P(d.x), py = Q(d.y);
        if (d.a > 0.05) {
          x.globalAlpha = d.a; x.fillStyle = COL[d.c]; x.fillRect(px + s * 0.12, py, s * 0.76, s + 1);
          x.fillStyle = COLD[d.c]; for (let i = 0; i < 3; i++) x.fillRect(px + s * (0.2 + i * 0.22), py, s * 0.08, s + 1);
          x.globalAlpha = 1;
        }
        if (d.a < 0.95) { x.setLineDash([s * 0.1, s * 0.12]); x.strokeStyle = COL[d.c]; x.lineWidth = 2; x.strokeRect(px + s * 0.15, py + 1, s * 0.7, s - 2); x.setLineDash([]); }
      }
      // الأزرار والعتلات
      for (const p of plates) {
        const px = P(p.x), py = Q(p.y), hh = (p.on ? 0.08 : 0.18) * s, ww = p.heavy ? 0.96 : 0.8;
        x.fillStyle = p.heavy ? "#475569" : "#64748b"; rr(x, px + s * (1 - ww) / 2 - 2, py + s - s * 0.1, s * ww + 4, s * 0.1, 3); x.fill();
        x.fillStyle = COL[p.c]; rr(x, px + s * (1 - ww) / 2, py + s - s * 0.1 - hh, s * ww, hh + 2, 4); x.fill();
        if (p.heavy) { x.fillStyle = "#1e293b"; for (const k of [0.3, 0.5, 0.7]) { x.beginPath(); x.arc(px + s * k, py + s - s * 0.1 - hh / 2, s * 0.045, 0, 7); x.fill(); } }
        if (p.on && !LITE) { x.fillStyle = COL[p.c] + "44"; x.beginPath(); x.ellipse(px + s / 2, py + s * 0.88, s * 0.6, s * 0.2, 0, 0, 7); x.fill(); }
      }
      for (const l of levers) {
        const px = P(l.x), py = Q(l.y), bx = px + s / 2, by = py + s * 0.88, a = l.on ? 0.6 : -0.6;
        x.strokeStyle = "#334155"; x.lineWidth = s * 0.09; x.lineCap = "round";
        x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.sin(a) * s * 0.55, by - Math.cos(a) * s * 0.55); x.stroke();
        x.fillStyle = COL[l.c]; x.beginPath(); x.arc(bx + Math.sin(a) * s * 0.55, by - Math.cos(a) * s * 0.55, s * 0.13, 0, 7); x.fill();
        x.fillStyle = "#64748b"; rr(x, px + s * 0.2, py + s * 0.8, s * 0.6, s * 0.2, 4); x.fill();
      }
      // النوابض
      for (const j of jpads) {
        const px = P(j.x), py = Q(j.y), sq = j.t > 0 ? 0.5 : 1;
        x.strokeStyle = "#16a34a"; x.lineWidth = s * 0.07;
        x.beginPath(); for (let i = 0; i <= 4; i++) x.lineTo(px + s * (i % 2 ? 0.75 : 0.25), py + s - i * s * 0.1 * sq); x.stroke();
        x.fillStyle = "#22c55e"; rr(x, px + s * 0.05, py + s - s * 0.5 * sq - s * 0.12, s * 0.9, s * 0.14, 4); x.fill();
      }
      // الأعلام
      for (const f of flags) {
        const px = P(f.x), py = Q(f.y);
        x.fillStyle = "#78716c"; x.fillRect(px + s * 0.3, py - s * 0.6, s * 0.08, s * 1.6);
        x.fillStyle = f.on ? "#22c55e" : "#ef4444";
        const wv = LITE ? 0 : Math.sin(T * 5) * s * 0.06;
        x.beginPath(); x.moveTo(px + s * 0.38, py - s * 0.6); x.lineTo(px + s * 0.95, py - s * 0.42 + wv); x.lineTo(px + s * 0.38, py - s * 0.2); x.fill();
      }
      // باب النهاية والكأس
      if (exit) {
        const px = P(exit.x), py = Q(exit.y - 1);
        x.fillStyle = "#7c2d12"; rr(x, px - s * 0.1, py - s * 0.1, s * 1.2, s * 2.1, s * 0.5); x.fill();
        x.fillStyle = "#c2410c"; rr(x, px + s * 0.05, py + s * 0.05, s * 0.9, s * 1.95, s * 0.42); x.fill();
        x.fillStyle = "#fde047"; x.beginPath(); x.arc(px + s * 0.75, py + s * 1.1, s * 0.07, 0, 7); x.fill();
        const w2 = exit.who || [false, false];
        [BIG, SMALL].forEach((c, i) => { x.fillStyle = w2[i] ? ROLE[c.role].shirt : "rgba(255,255,255,.5)"; x.beginPath(); x.arc(px + s * (0.3 + i * 0.4), py - s * 0.35, s * 0.13, 0, 7); x.fill(); });
      }
      if (trophy) {
        const px = P(trophy.x), py = Q(trophy.y) + (LITE ? 0 : Math.sin(T * 3) * s * 0.06);
        x.fillStyle = "#facc15"; x.beginPath(); x.moveTo(px + s * 0.2, py + s * 0.1); x.lineTo(px + s * 0.8, py + s * 0.1); x.lineTo(px + s * 0.65, py + s * 0.55); x.lineTo(px + s * 0.35, py + s * 0.55); x.closePath(); x.fill();
        x.strokeStyle = "#facc15"; x.lineWidth = s * 0.07; x.beginPath(); x.arc(px + s * 0.2, py + s * 0.25, s * 0.12, Math.PI * 0.5, Math.PI * 1.5); x.stroke(); x.beginPath(); x.arc(px + s * 0.8, py + s * 0.25, s * 0.12, -Math.PI * 0.5, Math.PI * 0.5); x.stroke();
        x.fillStyle = "#eab308"; x.fillRect(px + s * 0.45, py + s * 0.55, s * 0.1, s * 0.2); x.fillRect(px + s * 0.3, py + s * 0.75, s * 0.4, s * 0.12);
        if (!LITE) { x.fillStyle = "#fff"; x.globalAlpha = (Math.sin(T * 6) + 1) / 2; x.beginPath(); x.arc(px + s * 0.7, py + s * 0.15, s * 0.05, 0, 7); x.fill(); x.globalAlpha = 1; }
      }
      // الصناديق
      for (const b of boxes) {
        const px = P(b.x), py = Q(b.y), w = b.w * s, h = b.h * s;
        x.fillStyle = "#b45309"; rr(x, px, py, w, h, s * 0.08); x.fill();
        x.strokeStyle = "#78350f"; x.lineWidth = s * 0.07; x.strokeRect(px + s * 0.08, py + s * 0.08, w - s * 0.16, h - s * 0.16);
        x.beginPath(); x.moveTo(px + s * 0.1, py + s * 0.1); x.lineTo(px + w - s * 0.1, py + h - s * 0.1); x.stroke();
      }
      // الأخوان
      const fade = state === "dead" ? Math.min(1, stT / 0.5) : 0;
      for (const c of [BIG, SMALL]) {
        const pose = c.carried ? "walk" : BIG.carry && c === BIG ? "lift" : !c.ground ? "air" : "walk";
        drawKid(x, P(c.x + c.w / 2), Q(c.y + c.h), s, c.role, c.face, c.vx && c.ground ? c.ph : 0, pose);
      }
      if (BIG.carry) { label(x, P(BIG.x + BIG.w / 2), Q(SMALL.y - 0.95), nameOf(BIG), ROLE.big.shirt, s); label(x, P(SMALL.x + SMALL.w / 2), Q(SMALL.y - 0.4), nameOf(SMALL), ROLE.small.shirt, s); }
      else for (const c of [BIG, SMALL]) label(x, P(c.x + c.w / 2), Q(c.y - 0.4), nameOf(c), ROLE[c.role].shirt, s);
      // الجسيمات والفقاعات
      parts = parts.filter((p) => p.t < p.life);
      for (const p of parts) {
        x.globalAlpha = 1 - p.t / p.life;
        if (p.txt) { x.font = `${Math.round(s * 0.45)}px ${FONT}`; x.textAlign = "center"; x.fillText(p.txt, P(p.x), Q(p.y)); }
        else { x.fillStyle = p.col; x.beginPath(); x.arc(P(p.x), Q(p.y), s * 0.08, 0, 7); x.fill(); }
      }
      x.globalAlpha = 1;
      bubbles = bubbles.filter((b) => b.t > 0);
      for (const b of bubbles) bubble(x, P(b.c.x + b.c.w / 2), Q(top(b.c) - (b.c.carry || b.c.carried ? 1.3 : 0.75)), b.text, s);
      if (fade) { x.fillStyle = `rgba(255,255,255,${fade * 0.85})`; x.fillRect(0, 0, cv.width, cv.height); }
    }

    // ---------------------------------------------------------------- الحلقة
    let raf = 0, lastT = 0, acc = 0, frame = 0;
    function chips() {
      return [0, 1].map((p) => { const r = p === bigP ? "big" : "small"; return `<span class="chip ${r}">${ROLE[r].emo} ${K.esc(names[p])}</span>`; }).join("");
    }
    K.app.querySelector(".chips").innerHTML = chips();
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (!lastT) lastT = now;
      let dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      if (paused) return;
      T += dt; stT += dt;
      const inp = inputs();
      if (inp.some((i) => i.e.pause)) { pause(); return; }
      I = inp.map((x, p) => ({ ...x, e: { ...((I[p] && I[p].e) || {}), ...x.e } }));
      acc += dt;
      let k = 0;
      while (acc >= STEP && k < 6) {
        acc -= STEP; k++;
        if (state === "play") { physics(STEP); hazards(); if (state === "play") { checkpoints(); goals(); } }
        for (const c of I) c.e = {};   // الضغطات تُستعمل مرة واحدة
        for (const p of parts) { p.t += STEP; p.x += p.vx * STEP; p.y += p.vy * STEP; if (!p.txt) p.vy += 12 * STEP; }
        for (const b of bubbles) b.t -= STEP;
      }
      if (state === "dead" && stT > 1.0) { state = "play"; restore(cp || start); say(BIG, "نرجع معاً! 🚩", null); }
      frame++;
      if (LITE && frame % 2) return;
      draw();
    }
    BIG.x = starts.big.x + 0.1; BIG.y = starts.big.y + 1 - BIG.h;
    SMALL.x = starts.small.x + 0.17; SMALL.y = starts.small.y + 1 - SMALL.h;
    start = snap(null);
    if (save.cp && save.cp.n === n && save.cp.s) { try { cp = save.cp.s; restore(cp); } catch { cp = null; restore(start); } }
    else updateSwitches(true);
    resize();
    addEventListener("resize", resize);
    K.later(() => hintEl.classList.add("off"), 7000);
    clearInput();
    raf = requestAnimationFrame(loop);
    K.mode = {
      key(e) {
        if (paused || state === "win") {
          if (e.key === "Backspace" && paused) { resume(); return true; }
          return false;   // القائمة: الأسهم وEnter كالعادة
        }
        if (e.pad) return true;
        if (e.key === "Backspace") { pause(); return true; }
        if (e.repeat) return true;
        return kbKey(e, true) || true;
      },
      keyup(e) { kbKey(e, false); },
      poll() { return !(paused || state === "win"); },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", resize); clearInput(); },
    };
    window.__bro = { get s() { return { state, paused, BIG, SMALL, boxes, active, cp, plates, doors }; }, win: () => win(null), tp: (r, x, y) => { const c = r === "big" ? BIG : SMALL; c.x = x; c.y = y; c.vx = c.vy = 0; } };
  }

  window.__broGo = (n) => K.show(playScreen, n, { names: ["أحمد", "سامي"], big: 0 });   // للتجربة
  K.start(homeScreen);
})();
