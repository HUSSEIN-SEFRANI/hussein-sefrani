// حبات الكرمة — قطع من حبات الفاكهة (2 إلى 5 حبات) تسقط في سلة الكرمة. املأ صفاً كاملاً فتُعصر الحبات وتمتلئ جرة العصير.
// وضعان: «العادي» (تنتهي اللعبة إذا امتلأت السلة) و«الهادئ» للصغار (قطع صغيرة، أبطأ، وبلا خسارة). 3 سرعات.
// التحكم: ← → للتحريك، ↑ أو Enter/✕ للتدوير، ↓ للإسراع، Backspace/○ للاستراحة. اللمس والفأرة: اسحب للتحريك، انقر للتدوير، اسحب للأسفل للإسقاط.
(() => {
  "use strict";
  const GAME = "حبات الكرمة";
  const COLS = 9, ROWS = 15, JAR = 10;
  const SPEEDS = [
    { e: "🐢", t: "بطيء", ms: 1000 },
    { e: "🐇", t: "عادي", ms: 650 },
    { e: "🚀", t: "سريع", ms: 400 },
  ];
  // الفواكه: لون أساسي، لون فاتح، لون غامق
  const FRUITS = {
    grape: { a: "#8b5cf6", l: "#c4b5fd", d: "#5b21b6" },
    green: { a: "#84cc16", l: "#d9f99d", d: "#4d7c0f" },
    cherry: { a: "#e11d48", l: "#fda4af", d: "#9f1239" },
    blue: { a: "#3b5bdb", l: "#a5b4fc", d: "#1e2a78" },
    kumquat: { a: "#f97316", l: "#fdba74", d: "#c2410c" },
    lemon: { a: "#facc15", l: "#fef08a", d: "#ca8a04" },
    rasp: { a: "#ec4899", l: "#fbcfe8", d: "#9d174d" },
  };
  // القطع: خلايا [x, y]، من حبتين إلى خمس
  const SHAPES = [
    { f: "cherry", c: [[0, 0], [1, 0]] }, //            كرزتان
    { f: "green", c: [[0, 0], [1, 0], [2, 0]] }, //    ثلاث حبات عنب أخضر
    { f: "blue", c: [[0, 0], [0, 1], [1, 1]] }, //     ركن التوت الأزرق
    { f: "grape", c: [[0, 0], [1, 0], [0, 1], [1, 1]] }, // عنقود صغير
    { f: "rasp", c: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]] }, // عنقود التوت
    { f: "kumquat", c: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]] }, // سلة البرتقال الصغير
    { f: "lemon", c: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] }, // زاوية الليمون
  ];
  const CALM_SET = [0, 1, 2, 3];
  const MODES = {
    normal: { e: "🧺", t: "اللعب العادي", s: "املأ الصفوف قبل أن تمتلئ السلة!" },
    calm: { e: "🐣", t: "الوضع الهادئ", s: "للصغار: قطع صغيرة وبلا خسارة" },
  };
  const save = K.store("grapes", { speed: 0, best: { normal: 0, calm: 0 } });
  if (!save.best) save.best = { normal: 0, calm: 0 };

  function earn(amount, reason, cb) {
    try {
      fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, game: GAME, reason }) })
        .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.added) cb(d.added); }).catch(() => {});
    } catch {}
  }

  // ---------------------------------------------------------------- رسم الحبات
  function berry(b, f, x, y, r, face) {
    const F = FRUITS[f];
    b.save(); b.translate(x, y);
    if (f === "lemon") b.scale(1.08, 0.92);
    const gr = b.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    gr.addColorStop(0, F.l); gr.addColorStop(0.45, F.a); gr.addColorStop(1, F.d);
    b.fillStyle = gr; b.beginPath(); b.arc(0, 0, r, 0, 7); b.fill();
    b.lineWidth = r * 0.07; b.strokeStyle = F.d; b.stroke();
    if (f === "rasp") { // حبيبات صغيرة
      b.fillStyle = "rgba(255,255,255,.35)";
      for (const [u, v] of [[-.45, -.1], [0, -.5], [.45, -.1], [-.25, .4], [.25, .4], [0, .05]]) { b.beginPath(); b.arc(u * r, v * r, r * 0.17, 0, 7); b.fill(); }
    }
    if (f === "kumquat") { // نقاط القشرة
      b.fillStyle = "rgba(194,65,12,.35)";
      for (let i = 0; i < 9; i++) { const a = i * 2.4, d = r * (0.3 + (i % 3) * 0.2); b.beginPath(); b.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.05, 0, 7); b.fill(); }
    }
    if (f === "lemon") { b.fillStyle = F.d; b.beginPath(); b.arc(r * 0.98, 0, r * 0.1, 0, 7); b.fill(); }
    if (f === "blue") { // تاج التوت
      b.strokeStyle = "#111a4d"; b.lineWidth = r * 0.08;
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.256; b.beginPath(); b.moveTo(Math.cos(a) * r * 0.12, -r * 0.62 + Math.sin(a) * r * 0.12); b.lineTo(Math.cos(a) * r * 0.26, -r * 0.62 + Math.sin(a) * r * 0.26); b.stroke(); }
    }
    if (f === "grape" || f === "green") { b.fillStyle = "rgba(255,255,255,.18)"; b.beginPath(); b.ellipse(r * 0.2, r * 0.25, r * 0.55, r * 0.4, 0.4, 0, 7); b.fill(); }
    if (f === "cherry") { b.strokeStyle = F.d; b.lineWidth = r * 0.08; b.beginPath(); b.arc(0, -r * 0.95, r * 0.25, 0.3, 2.8); b.stroke(); }
    // اللمعة
    b.fillStyle = "rgba(255,255,255,.75)"; b.beginPath(); b.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.13, -0.6, 0, 7); b.fill();
    // الوجه
    const ink = f === "blue" || f === "grape" ? "#1e1b4b" : "#3b1d0a";
    b.strokeStyle = ink; b.fillStyle = ink; b.lineWidth = r * 0.09; b.lineCap = "round";
    if (face === "awake") {
      for (const s of [-1, 1]) { b.beginPath(); b.arc(s * r * 0.3, -r * 0.02, r * 0.11, 0, 7); b.fill(); b.fillStyle = "#fff"; b.beginPath(); b.arc(s * r * 0.3 - r * 0.03, -r * 0.06, r * 0.04, 0, 7); b.fill(); b.fillStyle = ink; }
      b.beginPath(); b.arc(0, r * 0.18, r * 0.2, 0.25, Math.PI - 0.25); b.stroke();
      b.fillStyle = "rgba(255,170,190,.6)"; for (const s of [-1, 1]) { b.beginPath(); b.arc(s * r * 0.55, r * 0.22, r * 0.11, 0, 7); b.fill(); }
    } else if (face === "sleep") {
      for (const s of [-1, 1]) { b.beginPath(); b.arc(s * r * 0.3, -r * 0.05, r * 0.11, 0.2, Math.PI - 0.2); b.stroke(); }
      b.beginPath(); b.arc(0, r * 0.25, r * 0.08, 0, Math.PI); b.stroke();
    } else if (face === "squish") {
      for (const s of [-1, 1]) { b.beginPath(); b.moveTo(s * r * 0.42, -r * 0.15); b.lineTo(s * r * 0.2, -r * 0.02); b.lineTo(s * r * 0.42, r * 0.1); b.stroke(); }
      b.beginPath(); b.ellipse(0, r * 0.3, r * 0.12, r * 0.09, 0, 0, 7); b.fill();
    }
    b.restore();
  }
  function leaf(b, x, y, s, rot) {
    b.save(); b.translate(x, y); b.rotate(rot);
    b.fillStyle = "#65a30d"; b.strokeStyle = "#3f6212"; b.lineWidth = s * 0.08;
    b.beginPath(); b.moveTo(0, 0); b.quadraticCurveTo(s * 0.5, -s * 0.55, s, 0); b.quadraticCurveTo(s * 0.5, s * 0.55, 0, 0); b.fill(); b.stroke();
    b.beginPath(); b.moveTo(s * 0.1, 0); b.lineTo(s * 0.85, 0); b.stroke();
    b.restore();
  }
  function vineLeaf(b, x, y, s, rot) { // ورقة كرمة بخمسة فصوص
    b.save(); b.translate(x, y); b.rotate(rot);
    b.fillStyle = "#4d7c0f"; b.strokeStyle = "#365314"; b.lineWidth = s * 0.05;
    b.beginPath();
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, d = i % 2 ? s * 0.55 : s; b.lineTo(Math.cos(a) * d, Math.sin(a) * d + s * 0.2); }
    b.closePath(); b.fill(); b.stroke();
    b.strokeStyle = "#a3e635"; b.lineWidth = s * 0.06;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.256; b.beginPath(); b.moveTo(0, s * 0.2); b.lineTo(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.7 + s * 0.2); b.stroke(); }
    b.restore();
  }
  window.__berry = berry; window.__vineLeaf = vineLeaf;

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    const card = (k, bg) => {
      const M = MODES[k];
      return `<button class="mode f" style="background:${bg}" ${K.act(k, () => K.show(play, { mode: k }))}><span class="big emo">${M.e}</span><b>${M.t}</b><small>${M.s}</small><span class="best">🏆 ${save.best[k]}</span></button>`;
    };
    const sp = SPEEDS.map((s, i) => `<button class="btn f ${save.speed === i ? "on" : ""}" ${K.act("sp" + i, () => { save.speed = i; save.save(); K.sfx.pop(); K.top().focus = "sp" + i; K.render(); })}><span class="emo">${s.e}</span> ${s.t}</button>`).join("");
    K.paint(`<div class="title"><canvas class="mascot" id="masc" width="200" height="200"></canvas><div><h1 class="logo">حبات الكرمة</h1><div class="sub">رتّب الحبات في السلة واعصرها عصيراً لذيذاً!</div></div></div>
      <div class="modes">
        ${card("normal", "linear-gradient(135deg,#a855f7,#6d28d9)")}
        ${card("calm", "linear-gradient(135deg,#84cc16,#15803d)")}
      </div>
      <div class="mini"><span class="lbl">السرعة:</span>${sp}</div>
      <div class="help"><b>← →</b> تحريك · <b>↑</b> أو <b>✕</b> تدوير · <b>↓</b> إسراع · <b>○</b> استراحة</div>`, "normal");
    // التميمة: عنقود صغير مرسوم
    const m = document.getElementById("masc"), b = m.getContext("2d");
    b.strokeStyle = "#65a30d"; b.lineWidth = 6; b.beginPath(); b.moveTo(100, 40); b.quadraticCurveTo(110, 20, 130, 14); b.stroke();
    vineLeaf(b, 132, 34, 26, 0.5);
    [[70, 62], [100, 58], [130, 62], [85, 92], [115, 92], [100, 124], [70, 120], [130, 120], [100, 156]].forEach(([x, y], i) => berry(b, i % 4 === 3 ? "green" : "grape", x, y, 18, i === 4 ? "awake" : "sleep"));
  }

  // ---------------------------------------------------------------- اللعب
  function play(opt) {
    K.begin();
    const calm = opt.mode === "calm";
    const best0 = save.best[opt.mode];
    const baseMs = SPEEDS[save.speed].ms * (calm ? 1.35 : 1);
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const S = { score: 0, rows: 0, level: 1, pieces: 0, cur: null, next: null, bag: [], id: 0, state: "ready", acc: 0, lock: 0, lockMoves: 0,
      clearing: null, drops: [], pops: [], jar: [], t: 0, shake: 0, refills: 0 };
    window.__grapes = S; S.grid = grid;

    K.paint(`<div class="hud"><button class="btn f" ${K.act("pz", () => togglePause())}>⏸️</button>
        <span class="pill">🍇 النقاط: <b id="sc">0</b></span>
        <span class="pill">🧃 الصفوف: <b id="rw">0</b></span>
        <span class="pill gold">🏆 الأفضل: <b>${best0}</b></span>
        <span class="pill"><span class="emo">${calm ? "🐣" : SPEEDS[save.speed].e}</span>${calm ? " هادئ" : ` المستوى <b id="lv">1</b>`}</span></div>
      <div class="stage">
        <div class="side a">
          <div class="box"><small>القطعة التالية</small><canvas id="nx"></canvas></div>
          <div class="box"><small>جرة العصير</small><canvas id="jr"></canvas></div>
        </div>
        <div class="bw" id="bw"><div class="board"><canvas id="cv"></canvas><div class="over" id="ov"></div></div></div>
        <div class="side b">
          <div class="tpad" id="tp">
            <button class="tp" data-a="rot">⟳</button>
            <button class="tp" data-a="left">◀</button><button class="tp" data-a="down">▼</button><button class="tp" data-a="right">▶</button>
            <button class="tp wide" data-a="drop">⤓ إسقاط</button>
          </div>
          <div class="keys"><div><b>← →</b> تحريك</div><div><b>↑ ✕</b> تدوير</div><div><b>↓</b> إسراع</div><div><b>○</b> استراحة</div></div>
        </div>
      </div>`);
    K.app.querySelector('[data-k="pz"]').classList.remove("sel");
    const cv = document.getElementById("cv"), g = cv.getContext("2d"), ov = document.getElementById("ov");
    const nx = document.getElementById("nx"), ng = nx.getContext("2d"), jr = document.getElementById("jr"), jg = jr.getContext("2d");
    const sc = document.getElementById("sc"), rw = document.getElementById("rw"), lvEl = document.getElementById("lv");
    let C = 30, Fw = 20, Tp = 12, W = 0, H = 0, bg = null, sprites = {}, raf = 0, last = performance.now();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    // ------------------------------------------------ المقاسات والخلفية
    function fit() {
      const r = document.getElementById("bw").getBoundingClientRect();
      C = Math.max(12, Math.floor(Math.min(r.width / (COLS + 1.3), r.height / (ROWS + 1.1))));
      Fw = Math.round(C * 0.65); Tp = Math.round(C * 0.45);
      W = COLS * C + 2 * Fw; H = ROWS * C + Tp + Fw;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      bg = drawBasket(); sprites = {};
      const side = K.app.querySelector(".side.a").getBoundingClientRect();
      const portrait = innerHeight > innerWidth;
      const ns = portrait ? Math.min(side.height * 0.62, innerWidth * 0.26) : Math.min(side.width * 0.8, innerHeight * 0.2);
      nx.width = jr.width = ns * dpr; nx.height = ns * dpr; jr.height = ns * (portrait ? 1 : 1.25) * dpr;
      nx.style.width = jr.style.width = ns + "px"; nx.style.height = ns + "px"; jr.style.height = ns * (portrait ? 1 : 1.25) + "px";
      drawNext(); drawJar();
    }
    function drawBasket() {
      const c = document.createElement("canvas"); c.width = W * dpr; c.height = H * dpr;
      const b = c.getContext("2d"); b.scale(dpr, dpr);
      // الداخل: قماش كريمي مع ألواح خفيفة
      const ig = b.createLinearGradient(0, Tp, 0, H - Fw); ig.addColorStop(0, "#fff7ed"); ig.addColorStop(1, "#fde7c7");
      b.fillStyle = ig; b.fillRect(Fw, Tp, COLS * C, ROWS * C);
      b.strokeStyle = "rgba(180,120,60,.12)"; b.lineWidth = 1;
      for (let x = 1; x < COLS; x++) { b.beginPath(); b.moveTo(Fw + x * C, Tp); b.lineTo(Fw + x * C, Tp + ROWS * C); b.stroke(); }
      for (let y = 1; y < ROWS; y++) { b.setLineDash([2, 6]); b.beginPath(); b.moveTo(Fw, Tp + y * C); b.lineTo(Fw + COLS * C, Tp + y * C); b.stroke(); }
      b.setLineDash([]);
      // الإطار المنسوج (جانبان وقاع)
      const weave = (x0, y0, w, h, vertical) => {
        b.fillStyle = "#92400e"; b.fillRect(x0, y0, w, h);
        const step = C * 0.5, n = Math.ceil((vertical ? h : w) / step);
        for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
          b.fillStyle = (i + j) % 2 ? "#d97706" : "#b45309";
          const along = i * step, across = j * (vertical ? w : h) / 2, len = step * 0.9, th = (vertical ? w : h) / 2 * 0.86;
          b.beginPath();
          if (vertical) b.ellipse(x0 + across + w / 4, y0 + along + step / 2, th / 2, len / 2, 0, 0, 7);
          else b.ellipse(x0 + along + step / 2, y0 + across + h / 4, len / 2, th / 2, 0, 0, 7);
          b.fill();
        }
      };
      b.save(); b.beginPath(); b.rect(0, 0, W, H); b.clip();
      weave(0, Tp * 0.4, Fw, H - Tp * 0.4, true); weave(W - Fw, Tp * 0.4, Fw, H - Tp * 0.4, true); weave(0, H - Fw, W, Fw, false);
      b.restore();
      // الحافة العلوية: غصن الكرمة
      b.strokeStyle = "#78350f"; b.lineWidth = Tp * 0.7; b.lineCap = "round";
      b.beginPath(); b.moveTo(Tp * 0.4, Tp * 0.5);
      for (let x = 0; x <= W; x += C) b.quadraticCurveTo(x + C / 2, Tp * (x / C % 2 ? 0.2 : 0.8), x + C, Tp * 0.5);
      b.stroke();
      for (let i = 0; i < COLS + 1; i += 2) vineLeaf(b, Fw * 0.5 + i * C, Tp * 0.5, C * 0.32, i % 4 ? 0.6 : -0.5);
      b.strokeStyle = "#65a30d"; b.lineWidth = C * 0.05;
      for (let i = 1; i < COLS; i += 3) { b.beginPath(); b.arc(Fw + i * C, Tp * 0.9, C * 0.15, 0, 4.5); b.stroke(); } // محاليق
      return c;
    }
    function sprite(f, face) {
      const k = f + face;
      if (sprites[k]) return sprites[k];
      const s = document.createElement("canvas"); s.width = s.height = Math.ceil(C * dpr);
      const b = s.getContext("2d"); b.scale(dpr, dpr);
      berry(b, f, C / 2, C / 2, C * 0.41, face);
      return (sprites[k] = s);
    }

    // ------------------------------------------------ القطع
    function newPiece() {
      if (!S.bag.length) S.bag = K.shuffle(calm ? CALM_SET.concat(CALM_SET) : K.range(0, SHAPES.length));
      const s = S.bag.pop();
      return { s, f: SHAPES[s].f, c: SHAPES[s].c.map((p) => p.slice()), x: 0, y: 0, id: ++S.id };
    }
    const dims = (c) => [Math.max(...c.map((p) => p[0])) + 1, Math.max(...c.map((p) => p[1])) + 1];
    function fits(c, x, y) {
      for (const [u, v] of c) {
        const X = x + u, Y = y + v;
        if (X < 0 || X >= COLS || Y >= ROWS) return false;
        if (Y >= 0 && grid[Y][X]) return false;
      }
      return true;
    }
    function spawn() {
      S.cur = S.next || newPiece(); S.next = newPiece();
      const [w] = dims(S.cur.c);
      S.cur.x = Math.floor((COLS - w) / 2); S.cur.y = 0;
      S.lock = 0; S.lockMoves = 0; S.acc = 0;
      drawNext();
      if (!fits(S.cur.c, S.cur.x, S.cur.y)) {
        if (calm) refill();
        else gameOver();
      }
    }
    function move(dx, dy) {
      const P = S.cur;
      if (!P || !fits(P.c, P.x + dx, P.y + dy)) return false;
      P.x += dx; P.y += dy;
      if (S.lockMoves < 12 && !dy) { S.lock = 0; S.lockMoves++; }
      return true;
    }
    function rotate() {
      const P = S.cur; if (!P) return;
      if (P.s === 3) { K.tone(700, 0.05, "sine", 0.06); return; } // العنقود المربع لا يتغير
      const [w0, h0] = dims(P.c);
      let c = P.c.map(([x, y]) => [h0 - 1 - y, x]);
      const [w1, h1] = dims(c);
      const bx = P.x + Math.floor((w0 - w1) / 2), by = P.y + Math.floor((h0 - h1) / 2);
      for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]]) {
        if (fits(c, bx + kx, by + ky)) { P.c = c; P.x = bx + kx; P.y = by + ky; if (S.lockMoves < 12) { S.lock = 0; S.lockMoves++; } K.tone(820, 0.06, "triangle", 0.08); return; }
      }
      K.tone(240, 0.06, "square", 0.03);
    }
    function ghostY() { const P = S.cur; let y = P.y; while (fits(P.c, P.x, y + 1)) y++; return y; }
    function hardDrop() {
      if (!S.cur) return;
      const y = ghostY(), d = y - S.cur.y;
      S.cur.y = y; S.score += d; sc.textContent = S.score;
      S.shake = 1; place();
    }
    function place() {
      const P = S.cur;
      for (const [u, v] of P.c) { const Y = P.y + v; if (Y >= 0) grid[Y][P.x + u] = { f: P.f, id: P.id }; }
      S.cur = null; S.pieces++; S.score += 1; sc.textContent = S.score;
      K.tone(180, 0.1, "sine", 0.18); K.tone(320, 0.06, "triangle", 0.06, 0.03);
      const full = [];
      for (let y = 0; y < ROWS; y++) if (grid[y].every(Boolean)) full.push(y);
      if (full.length) {
        S.state = "clear"; S.clearing = { rows: full, t: 0 };
        full.forEach((y, i) => [0, 3, 6].forEach((x, j) => K.tone(500 + i * 120 + j * 90, 0.12, "sine", 0.1, j * 0.06 + i * 0.05)));
        for (const y of full) for (let x = 0; x < COLS; x++) {
          const col = FRUITS[grid[y][x].f].a;
          for (let k = 0; k < 3; k++) S.drops.push({ x: Fw + x * C + C / 2, y: Tp + y * C + C / 2, vx: (Math.random() - 0.5) * C * 0.15, vy: -Math.random() * C * 0.25, col, life: 900 });
        }
      } else spawn();
    }
    function finishClear() {
      const rows = S.clearing.rows; S.clearing = null;
      // لون العصير: الفاكهة الأكثر في الصف
      for (const y of rows) {
        const cnt = {}; grid[y].forEach((c) => (cnt[c.f] = (cnt[c.f] || 0) + 1));
        S.jar.push(FRUITS[Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]].a);
      }
      for (const y of rows) { grid.splice(y, 1); grid.unshift(Array(COLS).fill(null)); }
      const n = rows.length, pts = [0, 10, 30, 60, 100, 150][n] * (calm ? 1 : S.level);
      S.score += pts; S.rows += n;
      S.pops.push({ x: W / 2, y: Tp + rows[0] * C, t: 0, txt: n > 1 ? `+${pts} رائع!` : "+" + pts });
      if (S.jar.length >= JAR) {
        S.jar = []; S.score += 50;
        S.pops.push({ x: W / 2, y: H * 0.35, t: -300, txt: "🧃 امتلأت الجرة! +50", big: true });
        K.sfx.win(); K.confetti(18, "🍇🧃✨🍒🍋");
      } else if (n > 1) K.confetti(8 * n, "🍇✨🍒");
      if (!calm) {
        const lv = 1 + Math.floor(S.rows / 8);
        if (lv > S.level) { S.level = lv; lvEl.textContent = lv; S.pops.push({ x: W / 2, y: H * 0.5, t: -600, txt: `⬆️ المستوى ${lv}`, big: true }); K.sfx.ok(); }
      }
      if (S.score > best0 && best0 > 0 && !S.cheered) { S.cheered = true; K.confetti(14, "🏆⭐🎉"); }
      sc.textContent = S.score; rw.textContent = S.rows;
      drawJar();
      S.state = "run"; spawn();
    }
    function refill() { // الوضع الهادئ: نفرّغ السلة بلطف ونكمل
      S.refills++;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x]) {
        if (Math.random() < 0.5) S.drops.push({ x: Fw + x * C + C / 2, y: Tp + y * C + C / 2, vx: (Math.random() - 0.5) * C * 0.2, vy: -Math.random() * C * 0.3, col: FRUITS[grid[y][x].f].a, life: 900 });
        grid[y][x] = null;
      }
      S.pops.push({ x: W / 2, y: H * 0.45, t: -200, txt: "🧺 سلة جديدة!", big: true });
      [523, 659, 784].forEach((f, i) => K.tone(f, 0.18, "triangle", 0.1, i * 0.1));
      const [w] = dims(S.cur.c); S.cur.x = Math.floor((COLS - w) / 2); S.cur.y = 0;
    }
    function gameOver() {
      S.state = "over"; S.cur = null; S.shake = 1;
      [400, 330, 260, 200].forEach((f, i) => K.tone(f, 0.2, "triangle", 0.12, i * 0.14));
      ov.innerHTML = `<div class="box"><b>🧺 امتلأت السلة!</b></div>`; ov.classList.remove("hide");
      K.later(() => K.replace(result, { opt, score: S.score, rows: S.rows, best0 }), 1600);
    }
    function finish() { S.state = "over"; K.replace(result, { opt, score: S.score, rows: S.rows, best0 }); }

    // ------------------------------------------------ الحالة والأزرار
    function setState(st) {
      S.state = st;
      if (st === "ready") ov.innerHTML = `<div class="box"><b>🍇 جاهز؟</b><small>اضغط أي زر أو المس السلة لتبدأ</small></div>`;
      else if (st === "pause") ov.innerHTML = `<div class="box"><b>⏸️ استراحة</b><small>✕ أو Enter للمتابعة · ○ أو Backspace للإنهاء</small>
        <div class="obtn"><button class="btn go" data-o="go">▶ متابعة</button><button class="btn" data-o="end">🏁 إنهاء</button></div></div>`;
      else ov.innerHTML = "";
      ov.classList.toggle("hide", !ov.innerHTML);
    }
    ov.addEventListener("click", (e) => { if (S.state === "ready") { K.audioCtx(); showPad(); begin(); return; } const b = e.target.closest("[data-o]"); if (!b) return; if (b.dataset.o === "go") togglePause(); else finish(); });
    function begin() { setState("run"); last = performance.now(); spawn(); }
    function togglePause() {
      if (S.state === "run" || S.state === "clear") { S.wasClear = S.state === "clear"; setState("pause"); K.tone(440, 0.1, "triangle", 0.1); }
      else if (S.state === "pause") { setState(S.wasClear ? "clear" : "run"); last = performance.now(); }
      else if (S.state === "ready") begin();
    }
    function act(a) {
      if (S.state === "ready") { begin(); return; }
      if (S.state !== "run" || !S.cur) return;
      if (a === "left") { if (move(-1, 0)) K.tone(600, 0.03, "sine", 0.04); }
      else if (a === "right") { if (move(1, 0)) K.tone(600, 0.03, "sine", 0.04); }
      else if (a === "rot") rotate();
      else if (a === "down") { if (move(0, 1)) { S.acc = 0; S.score++; sc.textContent = S.score; } else S.lock = 1e9; }
      else if (a === "drop") hardDrop();
    }
    const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "rot", ArrowDown: "down", Enter: "rot", " ": "rot" };
    K.mode = {
      key(e) {
        if (S.state === "over") return true;
        if (e.key === "Backspace") { if (S.state === "pause") finish(); else if (S.state === "ready") K.back(); else togglePause(); return true; }
        if (S.state === "pause") { if (e.key === "Enter" || e.key === " ") togglePause(); return true; }
        if (KEYS[e.key]) { act(KEYS[e.key]); return true; }
        return false;
      },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", fit); document.removeEventListener("visibilitychange", vis); clearInterval(rep); },
    };
    const vis = () => { if (document.hidden && S.state === "run") togglePause(); };
    document.addEventListener("visibilitychange", vis);

    // أزرار اللمس: الضغط المستمر يكرر الحركة
    let rep = 0;
    const tp = document.getElementById("tp");
    tp.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".tp"); if (!b) return;
      e.preventDefault(); K.audioCtx();
      const a = b.dataset.a; act(a); b.classList.add("on");
      clearInterval(rep);
      if (a === "left" || a === "right" || a === "down") { let n = 0; rep = setInterval(() => { if (++n > 3) act(a); }, 60); }
    });
    const upAll = () => { clearInterval(rep); tp.querySelectorAll(".on").forEach((b) => b.classList.remove("on")); };
    tp.addEventListener("pointerup", upAll); tp.addEventListener("pointerleave", upAll); tp.addEventListener("pointercancel", upAll);
    // إظهار الأزرار عند استعمال اللمس أو الفأرة
    const showPad = () => K.app.querySelector(".stage") && K.app.querySelector(".stage").classList.add("touch");
    if (matchMedia("(pointer: coarse)").matches) showPad();
    K.app.addEventListener("pointermove", showPad, { once: true });

    // السحب على السلة: يمين/يسار للتحريك، أسفل للإسراع، سحب سريع للأسفل للإسقاط، نقرة للتدوير
    let drag = null;
    cv.addEventListener("pointerdown", (e) => {
      e.preventDefault(); K.audioCtx(); showPad();
      if (S.state === "ready") { begin(); return; }
      if (S.state === "pause") { togglePause(); return; }
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
      try { cv.setPointerCapture(e.pointerId); } catch {}
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag || S.state !== "run") return;
      while (e.clientX - drag.x > C * 0.9) { act("right"); drag.x += C * 0.9; drag.moved = true; }
      while (drag.x - e.clientX > C * 0.9) { act("left"); drag.x -= C * 0.9; drag.moved = true; }
      while (e.clientY - drag.y > C * 1.1) { act("down"); drag.y += C * 1.1; drag.moved = true; }
    });
    cv.addEventListener("pointerup", (e) => {
      if (!drag) return;
      const dt = performance.now() - drag.t, dy = e.clientY - drag.sy, dx = e.clientX - drag.sx;
      if (dy > C * 2.5 && dt < 260 && Math.abs(dx) < dy) act("drop");
      else if (!drag.moved && Math.abs(dx) < C * 0.5 && Math.abs(dy) < C * 0.5) act("rot");
      drag = null;
    });
    cv.addEventListener("pointercancel", () => (drag = null));

    // ------------------------------------------------ الرسم
    const cx = (x) => Fw + x * C, cy = (y) => Tp + y * C;
    function stems(cells, getId) { // سيقان خضراء تربط حبات القطعة الواحدة
      g.strokeStyle = "#4d7c0f"; g.lineWidth = Math.max(2, C * 0.14); g.lineCap = "round";
      g.beginPath();
      for (const [x, y, id] of cells) {
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          if (getId(x + dx, y + dy) === id) {
            const ax = cx(x) + C / 2, ay = cy(y) + C / 2, bx = cx(x + dx) + C / 2, by = cy(y + dy) + C / 2;
            g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2 + dy * C * 0.12, (ay + by) / 2 - dx * C * 0.12, bx, by);
          }
        }
      }
      g.stroke();
    }
    function leaves(cells) { // ورقة صغيرة فوق أعلى حبة في كل قطعة
      const top = {};
      for (const [x, y, id] of cells) if (!top[id] || y < top[id][1] || (y === top[id][1] && x < top[id][0])) top[id] = [x, y];
      for (const id in top) { const [x, y] = top[id]; leaf(g, cx(x) + C * 0.52, cy(y) + C * 0.1, C * 0.36, -0.7 + (id % 3) * 0.25); }
    }
    function draw() {
      g.save();
      if (S.shake > 0) g.translate(0, Math.sin(S.t / 25) * S.shake * C * 0.08);
      g.clearRect(-10, -10, W + 20, H + 20);
      g.drawImage(bg, 0, 0, W, H);
      g.save(); g.beginPath(); g.rect(Fw, Tp, COLS * C, ROWS * C); g.clip();
      // الحبات المستقرة
      const locked = [];
      const cl = S.clearing ? new Set(S.clearing.rows) : null;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] && !(cl && cl.has(y))) locked.push([x, y, grid[y][x].id]);
      const gid = (x, y) => (x < COLS && y < ROWS && grid[y][x] && !(cl && cl.has(y)) ? grid[y][x].id : -1);
      stems(locked, gid);
      for (const [x, y] of locked) g.drawImage(sprite(grid[y][x].f, "sleep"), cx(x), cy(y), C, C);
      leaves(locked);
      // صفوف تُعصر
      if (S.clearing) {
        const k = Math.min(1, S.clearing.t / 420);
        for (const y of S.clearing.rows) {
          g.fillStyle = `rgba(255,255,255,${0.6 * Math.sin(k * Math.PI)})`; g.fillRect(Fw, cy(y), COLS * C, C);
          for (let x = 0; x < COLS; x++) {
            const sp = sprite(grid[y][x].f, "squish"), w = C * (1 + k * 0.5), h = C * (1 - k * 0.85);
            g.globalAlpha = 1 - k * 0.6;
            g.drawImage(sp, cx(x) + C / 2 - w / 2, cy(y) + C - h - C * 0.05, w, h);
          }
          g.globalAlpha = 1;
        }
      }
      // القطعة النازلة وظلها
      const P = S.cur;
      if (P && (S.state === "run" || S.state === "pause")) {
        const gy = ghostY();
        if (gy > P.y) {
          g.strokeStyle = FRUITS[P.f].a; g.globalAlpha = 0.45; g.lineWidth = Math.max(2, C * 0.07); g.setLineDash([C * 0.12, C * 0.1]);
          for (const [u, v] of P.c) { g.beginPath(); g.arc(cx(P.x + u) + C / 2, cy(gy + v) + C / 2, C * 0.38, 0, 7); g.stroke(); }
          g.setLineDash([]); g.globalAlpha = 1;
        }
        const fall = Math.min(1, S.acc / curMs()) * (fits(P.c, P.x, P.y + 1) ? 1 : 0) * 0.25; // نزول ناعم
        g.save(); g.translate(0, fall * C);
        const cells = P.c.map(([u, v]) => [P.x + u, P.y + v, P.id]);
        const set = new Set(cells.map(([x, y]) => x + "," + y));
        stems(cells, (x, y) => (set.has(x + "," + y) ? P.id : -1));
        const bob = Math.sin(S.t / 200) * C * 0.03;
        for (const [x, y] of cells) g.drawImage(sprite(P.f, "awake"), cx(x), cy(y) + bob, C, C);
        leaves(cells);
        g.restore();
      }
      g.restore();
      // قطرات العصير
      for (const d of S.drops) { g.globalAlpha = Math.max(0, d.life / 900); g.fillStyle = d.col; g.beginPath(); g.arc(d.x, d.y, C * 0.12, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      g.textAlign = "center"; g.textBaseline = "middle";
      for (const p of S.pops) {
        if (p.t < 0) continue;
        g.globalAlpha = Math.max(0, 1 - p.t / 1100);
        g.font = `800 ${Math.round(C * (p.big ? 0.95 : 0.8))}px Baloo, sans-serif`;
        g.lineWidth = C * 0.16; g.strokeStyle = "#fff"; g.fillStyle = p.big ? "#7c3aed" : "#be185d";
        const y = p.y - (p.t / 1100) * C * 1.2;
        g.strokeText(p.txt, p.x, y); g.fillText(p.txt, p.x, y);
      }
      g.globalAlpha = 1;
      g.restore();
    }
    function drawNext() {
      if (!nx.width) return;
      const s = nx.width / dpr; ng.setTransform(dpr, 0, 0, dpr, 0, 0); ng.clearRect(0, 0, s, s);
      if (!S.next) { ng.font = `${s * 0.4}px sans-serif`; ng.textAlign = "center"; ng.textBaseline = "middle"; ng.fillStyle = "#a78bfa"; ng.fillText("؟", s / 2, s / 2); return; }
      const P = S.next, [w, h] = dims(P.c), c = Math.min(s / 3.4, s / (Math.max(w, h) + 0.6));
      const ox = (s - w * c) / 2, oy = (s - h * c) / 2;
      ng.strokeStyle = "#4d7c0f"; ng.lineWidth = c * 0.14; ng.lineCap = "round"; ng.beginPath();
      const has = (x, y) => P.c.some((p) => p[0] === x && p[1] === y);
      for (const [x, y] of P.c) for (const [dx, dy] of [[1, 0], [0, 1]]) if (has(x + dx, y + dy)) { ng.moveTo(ox + x * c + c / 2, oy + y * c + c / 2); ng.lineTo(ox + (x + dx) * c + c / 2, oy + (y + dy) * c + c / 2); }
      ng.stroke();
      for (const [x, y] of P.c) berry(ng, P.f, ox + x * c + c / 2, oy + y * c + c / 2, c * 0.41, "awake");
    }
    function drawJar() {
      if (!jr.width) return;
      const w = jr.width / dpr, h = jr.height / dpr; jg.setTransform(dpr, 0, 0, dpr, 0, 0); jg.clearRect(0, 0, w, h);
      const x0 = w * 0.18, x1 = w * 0.82, y0 = h * 0.2, y1 = h * 0.94, r = w * 0.12;
      const body = () => { jg.beginPath(); jg.moveTo(x0 + w * 0.08, y0); jg.lineTo(x1 - w * 0.08, y0); jg.quadraticCurveTo(x1, y0, x1, y0 + r * 1.5); jg.lineTo(x1, y1 - r); jg.quadraticCurveTo(x1, y1, x1 - r, y1); jg.lineTo(x0 + r, y1); jg.quadraticCurveTo(x0, y1, x0, y1 - r); jg.lineTo(x0, y0 + r * 1.5); jg.quadraticCurveTo(x0, y0, x0 + w * 0.08, y0); jg.closePath(); };
      jg.fillStyle = "rgba(255,255,255,.55)"; body(); jg.fill();
      jg.save(); body(); jg.clip();
      const lh = (y1 - y0) / JAR;
      S.jar.forEach((col, i) => { jg.fillStyle = col; jg.fillRect(x0, y1 - (i + 1) * lh - 0.5, x1 - x0, lh + 1); });
      if (S.jar.length) { jg.fillStyle = "rgba(255,255,255,.35)"; jg.beginPath(); jg.ellipse((x0 + x1) / 2, y1 - S.jar.length * lh, (x1 - x0) / 2, lh * 0.25, 0, 0, 7); jg.fill(); }
      jg.fillStyle = "rgba(255,255,255,.4)"; jg.fillRect(x0 + w * 0.06, y0 + h * 0.08, w * 0.06, (y1 - y0) * 0.7);
      jg.restore();
      jg.strokeStyle = "#7c3aed"; jg.lineWidth = w * 0.035; body(); jg.stroke();
      jg.fillStyle = "#a16207"; jg.fillRect(x0 + w * 0.04, h * 0.1, x1 - x0 - w * 0.08, h * 0.1); // الغطاء
      jg.fillStyle = "#4c1d95"; jg.font = `800 ${w * 0.16}px Baloo, sans-serif`; jg.textAlign = "center"; jg.textBaseline = "middle";
      jg.fillText(`${S.jar.length}/${JAR}`, w / 2, (y0 + y1) / 2 + h * 0.05);
    }
    const curMs = () => (calm ? baseMs : Math.max(110, baseMs * Math.pow(0.88, S.level - 1)));
    function frame(ts) {
      const dt = Math.min(100, ts - last); last = ts;
      S.t += dt;
      if (S.state === "run" && S.cur) {
        S.acc += dt;
        const ms = curMs();
        if (fits(S.cur.c, S.cur.x, S.cur.y + 1)) { S.lock = 0; while (S.acc >= ms && S.cur && fits(S.cur.c, S.cur.x, S.cur.y + 1)) { S.acc -= ms; S.cur.y++; } }
        else { S.acc = Math.min(S.acc, ms); S.lock += dt; if (S.lock >= Math.max(450, ms * 0.8)) place(); }
      } else if (S.state === "clear") {
        S.clearing.t += dt;
        if (S.clearing.t >= 460) finishClear();
      }
      if (S.shake > 0) S.shake = Math.max(0, S.shake - dt / 250);
      for (const d of S.drops) { d.x += d.vx * dt / 16; d.y += d.vy * dt / 16; d.vy += C * 0.012 * dt / 16; d.life -= dt; }
      S.drops = S.drops.filter((d) => d.life > 0);
      S.pops.forEach((p) => (p.t += dt)); S.pops = S.pops.filter((p) => p.t < 1100);
      draw();
      raf = requestAnimationFrame(frame);
    }
    S.next = newPiece();
    fit(); addEventListener("resize", fit);
    setState("ready");
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- النتيجة
  function result(r) {
    K.begin();
    const { opt, score, rows, best0 } = r;
    const calm = opt.mode === "calm";
    const record = score > best0;
    if (record) save.best[opt.mode] = score;
    save.save();
    let stars = calm ? (rows >= 25 ? 2 : rows >= 10 ? 1 : 0) : (rows >= 30 ? 3 : rows >= 15 ? 2 : rows >= 5 ? 1 : 0);
    if (!stars && record && best0 > 0 && score >= 50) stars = 1;
    if (stars) earn(stars, `${rows} صفاً من العصير`, showStar);
    const msg = record && best0 > 0 ? "🏆 رقم قياسي جديد!" : rows >= 10 ? "رائع! عصير كثير 🧃" : rows > 0 ? "أحسنت! 👏" : "لنحاول مرة أخرى 💪";
    K.paint(`<div class="top">${K.backBtn()}<span></span><span class="pill">${MODES[opt.mode].e} ${MODES[opt.mode].t}</span></div>
      <h1>${msg}</h1>
      <div class="score"><div><b>${score}</b><span>🍇 نقاطك</span></div><div><b>${rows}</b><span>🧃 صفوف معصورة</span></div><div><b>${save.best[opt.mode]}</b><span>🏆 أفضل نتيجة</span></div></div>
      <div class="rec" id="rec">${record && best0 > 0 ? "⭐ تجاوزت أفضل نتيجة لك!" : ""}</div>
      <div class="nav">
        <button class="btn f go" ${K.act("again", () => K.replace(play, opt))}><span class="emo">🔁</span> مرة أخرى</button>
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>${K.HELP}`, "again");
    if (record || rows >= 10) { K.sfx.win(); K.confetti(24, "🍇🍒🍋🧃⭐🎉"); }
  }
  function showStar(n) {
    const el = document.getElementById("rec");
    if (el) el.innerHTML = `⭐ ربحت ${n} ${n === 1 ? "نجمة" : n === 2 ? "نجمتين" : "نجوم"}!`;
  }

  K.start(home);
})();
