// الأفعى — أفعى لطيفة تأكل الفواكه فتطول. وضعان (بلا جدران / بجدران) ومراحل بعقبات، و3 سرعات.
// التحكم: الأسهم أو العصا أو أزرار الاتجاه. ✕ أو Enter للإيقاف المؤقت، ○ أو Backspace للإيقاف ثم الرجوع.
// البنية تدعم أكثر من أفعى (S.snakes) لإضافة وضع لاعبَين لاحقاً.
(() => {
  "use strict";
  const COLS = 24, ROWS = 14;
  const LEVELS = window.LEVELS;
  const GAME = "الأفعى";
  const SPEEDS = [
    { e: "🐢", t: "بطيء", tick: 230 },
    { e: "🐇", t: "عادي", tick: 150 },
    { e: "🚀", t: "سريع", tick: 95 },
  ];
  const SKINS = [
    { e: "🌈", t: "قوس قزح", col: (i) => `hsl(${(i * 24) % 360} 85% 55%)`, head: "#22c55e" },
    { e: "🟢", t: "أخضر", col: (i) => (i % 2 ? "#4ade80" : "#22c55e"), head: "#16a34a" },
    { e: "🔵", t: "أزرق", col: (i) => (i % 2 ? "#60a5fa" : "#3b82f6"), head: "#2563eb" },
    { e: "🟣", t: "بنفسجي", col: (i) => (i % 2 ? "#e879f9" : "#c026d3"), head: "#a21caf" },
  ];
  const FRUITS = ["🍎", "🍌", "🍇", "🍓", "🍉", "🍒", "🍑", "🍐"];
  const rr = (b, x, y, w, h, r) => { b.beginPath(); b.moveTo(x + r, y); b.arcTo(x + w, y, x + w, y + h, r); b.arcTo(x + w, y + h, x, y + h, r); b.arcTo(x, y + h, x, y, r); b.arcTo(x, y, x + w, y, r); b.closePath(); };
  const EMO = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  const save = K.store("snake", { speed: 0, skin: 0, best: { wrap: 0, walls: 0 }, lv: {} });
  if (!save.best) save.best = { wrap: 0, walls: 0 };
  if (!save.lv) save.lv = {};

  // نجوم الطفل من السيرفر (تُتجاهل الأخطاء خارج التلفاز)
  function earn(amount, reason, cb) {
    try {
      fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, game: GAME, reason }) })
        .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.added) cb(d.added); }).catch(() => {});
    } catch {}
  }

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    const lvDone = Object.keys(save.lv).length;
    const card = (k, bg, e, t, s, best, fn) => `<button class="mode f" style="background:${bg}" ${K.act(k, fn)}><span class="big emo">${e}</span><b>${t}</b><small>${s}</small>${best}</button>`;
    const sp = SPEEDS.map((s, i) => `<button class="btn f ${save.speed === i ? "on" : ""}" ${K.act("sp" + i, () => { save.speed = i; save.save(); K.sfx.pop(); K.top().focus = "sp" + i; K.render(); })}><span class="emo">${s.e}</span> ${s.t}</button>`).join("");
    const sk = SKINS.map((s, i) => `<button class="btn f ${save.skin === i ? "on" : ""}" ${K.act("sk" + i, () => { save.skin = i; save.save(); K.sfx.pop(); K.top().focus = "sk" + i; K.render(); })}><span class="emo">${s.e}</span></button>`).join("");
    K.paint(`<div class="title"><span class="mascot emo">🐍</span><div><h1 class="logo">الأفعى</h1><div class="sub">كُل الفواكه وكبِّر أفعاك! 🍎🍌🍇🍓</div></div></div>
      <div class="modes">
        ${card("wrap", "linear-gradient(135deg,#34d399,#0ea5e9)", "🌀", "بلا جدران", "تخرج من جهة وتدخل من الأخرى", `<span class="best">🏆 ${save.best.wrap}</span>`, () => K.show(play, { mode: "wrap" }))}
        ${card("walls", "linear-gradient(135deg,#fb923c,#e11d48)", "🧱", "بجدران", "انتبه من الحائط!", `<span class="best">🏆 ${save.best.walls}</span>`, () => K.show(play, { mode: "walls" }))}
        ${card("lv", "linear-gradient(135deg,#a78bfa,#6366f1)", "🏰", "المراحل", "عقبات وتحديات", `<span class="best">✅ ${lvDone} / ${LEVELS.length}</span>`, () => K.show(levels))}
      </div>
      <div class="mini"><span class="lbl">السرعة:</span>${sp}<span class="sep"></span><span class="lbl">اللون:</span>${sk}</div>
      ${K.HELP}`, "wrap");
  }

  function levels() {
    K.begin();
    const open = (i) => i === 0 || save.lv[i - 1];
    K.paint(`<div class="top">${K.backBtn()}<h2>🏰 المراحل</h2><span class="pill"><span class="emo">${SPEEDS[save.speed].e}</span> ${SPEEDS[save.speed].t}</span></div>
      <div class="levels">${LEVELS.map((L, i) => {
        const ok = open(i), d = save.lv[i];
        return `<button class="lvl f ${d ? "done" : ok ? "" : "lock"}" ${K.act("l" + i, () => { if (ok) K.show(play, { mode: "lv", lv: i }); else K.sfx.bad(); })}>
          <span class="n">${i + 1}</span><span class="emo" style="font-size:6vh">${ok ? L.e : "🔒"}</span><b>${L.name}</b>
          <small>${d ? `✅ 🏆 ${d.best}` : ok ? `🍎 × ${L.goal}${L.walls ? " · 🧱" : ""}` : "أنهِ المرحلة السابقة"}</small></button>`;
      }).join("")}</div>
      ${K.HELP}`, "l" + Math.min(LEVELS.length - 1, Object.keys(save.lv).length));
  }

  // ---------------------------------------------------------------- اللعب
  // opt = { mode: "wrap" | "walls" | "lv", lv }
  function play(opt) {
    K.begin();
    const L = opt.mode === "lv" ? LEVELS[opt.lv] : null;
    const walls = L ? L.walls : opt.mode === "walls";
    const bestKey = L ? null : opt.mode;
    const best0 = L ? (save.lv[opt.lv] ? save.lv[opt.lv].best : 0) : save.best[bestKey];
    const tick = SPEEDS[save.speed].tick;
    const skin = SKINS[save.skin];

    // العقبات وموضع البداية
    const block = new Uint8Array(COLS * ROWS);
    let start = { x: 4, y: 7 };
    if (L) L.map.forEach((row, y) => [...row].forEach((c, x) => { if (c === "#") block[y * COLS + x] = 1; if (c === "H") start = { x, y }; }));

    const mkSnake = (sx, sy, dir) => ({ body: [{ x: sx, y: sy }, { x: sx - dir.x, y: sy - dir.y }, { x: sx - 2 * dir.x, y: sy - 2 * dir.y }].map(wrapPos), dir, queue: [], grow: 0, alive: true, skin, score: 0 });
    const S = { snakes: [mkSnake(start.x, start.y, { x: 1, y: 0 })], fruit: null, gold: null, eaten: 0, state: "ready", acc: 0, pops: [], t: 0, flash: 0 };
    const P = S.snakes[0];
    placeFruit();

    K.paint(`<div class="hud">${K.backBtn("→ القائمة")}
        <span class="pill">🍎 النقاط: <b id="sc">0</b></span>
        <span class="pill gold">🏆 الأفضل: <b>${best0}</b></span>
        ${L ? `<span class="pill">${L.e} المرحلة ${opt.lv + 1}: <b id="gl">0 / ${L.goal}</b></span>` : `<span class="pill">${walls ? "🧱 بجدران" : "🌀 بلا جدران"}</span>`}
        <span class="pill"><span class="emo">${SPEEDS[save.speed].e}</span></span></div>
      <div class="board"><canvas id="cv"></canvas><div class="over" id="ov"></div></div>`);
    const cv = document.getElementById("cv"), g = cv.getContext("2d"), ov = document.getElementById("ov"), sc = document.getElementById("sc"), gl = document.getElementById("gl");
    let C = 40, bg = null, sprites = {}, raf = 0, last = performance.now();

    function fit() {
      const hud = K.app.querySelector(".hud").getBoundingClientRect();
      const aw = innerWidth * 0.92, ah = innerHeight - hud.bottom - innerHeight * 0.05;
      C = Math.max(10, Math.floor(Math.min(aw / COLS, ah / ROWS)));
      cv.width = C * COLS; cv.height = C * ROWS;
      bg = drawBoard(); sprites = {};
    }
    function drawBoard() {
      const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height;
      const b = c.getContext("2d");
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { b.fillStyle = (x + y) % 2 ? "#a3e635" : "#bef264"; b.fillRect(x * C, y * C, C, C); }
      // العقبات: صخور مستديرة
      for (let i = 0; i < block.length; i++) if (block[i]) {
        const x = (i % COLS) * C, y = ((i / COLS) | 0) * C;
        b.fillStyle = "#78716c"; rr(b, x + C * 0.06, y + C * 0.06, C * 0.88, C * 0.88, C * 0.25); b.fill();
        b.fillStyle = "#a8a29e"; rr(b, x + C * 0.16, y + C * 0.12, C * 0.6, C * 0.4, C * 0.18); b.fill();
      }
      // الإطار: حائط من الطوب أو خط متقطع للعبور
      if (walls) { b.strokeStyle = "#b45309"; b.lineWidth = C * 0.3; b.strokeRect(C * 0.15, C * 0.15, c.width - C * 0.3, c.height - C * 0.3); }
      else { b.strokeStyle = "rgba(255,255,255,.85)"; b.lineWidth = C * 0.12; b.setLineDash([C * 0.4, C * 0.3]); b.strokeRect(C * 0.06, C * 0.06, c.width - C * 0.12, c.height - C * 0.12); }
      return c;
    }
    function sprite(e, goldTint) {
      const k = e + (goldTint ? "g" : "");
      if (sprites[k]) return sprites[k];
      const s = document.createElement("canvas"); s.width = s.height = Math.ceil(C * 1.2);
      const b = s.getContext("2d");
      b.font = `${Math.round(C * 0.85)}px ${EMO}`; b.textAlign = "center"; b.textBaseline = "middle";
      b.fillText(e, s.width / 2, s.height / 2 + C * 0.05);
      if (goldTint) { b.globalCompositeOperation = "source-atop"; b.fillStyle = "rgba(250,204,21,.6)"; b.fillRect(0, 0, s.width, s.height); }
      return (sprites[k] = s);
    }

    function wrapPos(p) { return { x: (p.x + COLS) % COLS, y: (p.y + ROWS) % ROWS }; }
    function occupied(x, y) {
      if (block[y * COLS + x]) return true;
      return S.snakes.some((s) => s.body.some((b) => b.x === x && b.y === y));
    }
    function freeCell(avoid) {
      const free = [];
      const h = P.body[0];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (walls && (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) && Math.random() < 0.6) continue; // أقل على الحواف
        if (occupied(x, y) || (avoid && avoid.x === x && avoid.y === y)) continue;
        if (Math.abs(x - h.x) + Math.abs(y - h.y) < 3) continue;
        free.push({ x, y });
      }
      return free.length ? K.pick(free) : null;
    }
    function placeFruit() { const c = freeCell(S.gold); S.fruit = c && { ...c, e: K.pick(FRUITS) }; }
    function maybeGold() {
      if (S.gold || Math.random() > 0.18) return;
      const c = freeCell(S.fruit);
      if (c) S.gold = { ...c, life: Math.round(7000 / tick) };
    }

    // ---------------------------------------------------------------- الأزرار
    const DIR = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
    function steer(s, d) {
      const lastD = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
      if (d.x === lastD.x && d.y === lastD.y) return;
      if (d.x === -lastD.x && d.y === -lastD.y) {
        if (S.state === "ready") { s.body.reverse(); s.dir = { x: s.body[0].x - s.body[1].x, y: s.body[0].y - s.body[1].y }; if (Math.abs(s.dir.x) > 1 || Math.abs(s.dir.y) > 1) s.dir = d; }
        return;
      }
      if (s.queue.length < 3) s.queue.push(d);
    }
    function setState(st) {
      S.state = st;
      if (st === "ready") ov.innerHTML = `<div class="box"><b>🐍 جاهز؟</b><small>اضغط سهماً لتبدأ</small></div>`;
      else if (st === "pause") ov.innerHTML = `<div class="box"><b>⏸️ استراحة</b><small>✕ أو Enter للمتابعة · ○ أو Backspace للقائمة</small></div>`;
      else ov.innerHTML = "";
      ov.classList.toggle("hide", !ov.innerHTML);
    }
    K.mode = {
      key(e) {
        if (S.state === "over") return true;
        if (DIR[e.key]) {
          if (S.state === "pause") return true;
          steer(P, DIR[e.key]);
          if (S.state === "ready") { setState("run"); last = performance.now(); S.acc = 0; }
          return true;
        }
        if (e.key === "Enter" || e.key === " ") {
          if (S.state === "run") { setState("pause"); K.tone(440, 0.1, "triangle", 0.1); }
          else if (S.state === "pause") { setState("run"); last = performance.now(); }
          return true;
        }
        if (e.key === "Backspace") {
          if (S.state === "run") setState("pause");
          else K.back();
          return true;
        }
        return false;
      },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", fit); document.removeEventListener("visibilitychange", vis); },
    };
    const vis = () => { if (document.hidden && S.state === "run") setState("pause"); };
    document.addEventListener("visibilitychange", vis);
    K.app.querySelector('[data-k="back"]').classList.remove("sel");

    // ---------------------------------------------------------------- خطوة واحدة
    function step() {
      for (const s of S.snakes) {
        if (!s.alive) continue;
        if (s.queue.length) s.dir = s.queue.shift();
        const h = s.body[0];
        let n = { x: h.x + s.dir.x, y: h.y + s.dir.y };
        if (!walls) n = wrapPos(n);
        else if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS) { crash(s); return; }
        if (block[n.y * COLS + n.x]) { crash(s); return; }
        const willGrow = s.grow > 0 || (S.fruit && n.x === S.fruit.x && n.y === S.fruit.y) || (S.gold && n.x === S.gold.x && n.y === S.gold.y);
        const bodyCheck = willGrow ? s.body : s.body.slice(0, -1);
        if (bodyCheck.some((b) => b.x === n.x && b.y === n.y)) { crash(s); return; }
        s.body.unshift(n);
        if (s.grow > 0) s.grow--;
        else if (!willGrow) s.body.pop();
        if (S.fruit && n.x === S.fruit.x && n.y === S.fruit.y) eat(s, 1, S.fruit);
        if (S.gold && n.x === S.gold.x && n.y === S.gold.y) eat(s, 5, S.gold);
      }
      if (S.gold && --S.gold.life <= 0) S.gold = null;
    }
    function eat(s, pts, f) {
      s.score += pts;
      sc.textContent = s.score;
      S.pops.push({ x: f.x, y: f.y, t: 0, txt: "+" + pts, gold: pts > 1 });
      if (pts > 1) { S.gold = null; s.grow += 1; K.sfx.ok(); K.confetti(8, "🌟✨⭐"); }
      else {
        S.eaten++;
        K.tone(520 + Math.min(S.eaten, 30) * 18, 0.09, "triangle", 0.13); K.tone(780 + Math.min(S.eaten, 30) * 18, 0.08, "sine", 0.08, 0.06);
        placeFruit(); maybeGold();
        if (gl) gl.textContent = `${Math.min(S.eaten, L.goal)} / ${L.goal}`;
        if (L && S.eaten >= L.goal) { win(); return; }
        if (!S.fruit) { win(); return; } // امتلأ اللوح!
      }
      if (!L && s.score > best0 && s.score - pts <= best0 && best0 > 0) { K.sfx.win(); K.confetti(14, "🏆⭐🎉"); }
    }
    function crash(s) {
      s.alive = false; S.state = "over"; S.flash = 1;
      [400, 320, 240].forEach((f, i) => K.tone(f, 0.18, "triangle", 0.12, i * 0.13));
      K.later(() => K.replace(result, { opt, score: s.score, best0, won: false, len: s.body.length }), 1300);
    }
    function win() {
      S.state = "over";
      K.later(() => K.replace(result, { opt, score: P.score, best0, won: true, len: P.body.length }), 700);
    }

    // ---------------------------------------------------------------- الرسم
    function drawSnake(s) {
      const b = s.body, r = C * 0.42;
      const cx = (p) => p.x * C + C / 2, cy = (p) => p.y * C + C / 2;
      const dead = !s.alive && Math.floor(S.t / 120) % 2;
      g.lineCap = "round"; g.lineWidth = C * 0.78;
      for (let i = b.length - 1; i > 0; i--) {
        const a = b[i], c = b[i - 1];
        g.strokeStyle = dead ? "#fca5a5" : s.skin.col(i);
        if (Math.abs(a.x - c.x) + Math.abs(a.y - c.y) === 1) { g.beginPath(); g.moveTo(cx(a), cy(a)); g.lineTo(cx(c), cy(c)); g.stroke(); }
        else { g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(cx(a), cy(a), r * 0.95, 0, 7); g.fill(); }
      }
      // طرف الذيل أصغر
      const tl = b[b.length - 1];
      g.fillStyle = dead ? "#fca5a5" : s.skin.col(b.length - 1); g.beginPath(); g.arc(cx(tl), cy(tl), r * 0.8, 0, 7); g.fill();
      // الرأس
      const h = b[0], d = s.dir, hx = cx(h), hy = cy(h);
      g.fillStyle = dead ? "#f87171" : s.skin.head; g.beginPath(); g.arc(hx, hy, C * 0.5, 0, 7); g.fill();
      const px = -d.y, py = d.x; // عمودي على الاتجاه
      // اللسان كل فترة
      if (s.alive && Math.floor(S.t / 600) % 3 === 0) {
        g.strokeStyle = "#e11d48"; g.lineWidth = C * 0.08; g.beginPath();
        const tx = hx + d.x * C * 0.48, ty = hy + d.y * C * 0.48, ex = hx + d.x * C * 0.78, ey = hy + d.y * C * 0.78;
        g.moveTo(tx, ty); g.lineTo(ex, ey); g.lineTo(ex + (d.x + px) * C * 0.1, ey + (d.y + py) * C * 0.1);
        g.moveTo(ex, ey); g.lineTo(ex + (d.x - px) * C * 0.1, ey + (d.y - py) * C * 0.1); g.stroke();
      }
      for (const sgn of [-1, 1]) {
        const ex = hx + d.x * C * 0.12 + px * sgn * C * 0.22, ey = hy + d.y * C * 0.12 + py * sgn * C * 0.22;
        g.fillStyle = "#fff"; g.beginPath(); g.arc(ex, ey, C * 0.15, 0, 7); g.fill();
        g.fillStyle = "#111827";
        if (dead) { g.font = `bold ${Math.round(C * 0.28)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("×", ex, ey); }
        else { g.beginPath(); g.arc(ex + d.x * C * 0.05, ey + d.y * C * 0.05, C * 0.075, 0, 7); g.fill(); }
      }
      // خدود وردية
      g.fillStyle = "rgba(244,114,182,.55)";
      for (const sgn of [-1, 1]) { g.beginPath(); g.arc(hx - d.x * C * 0.12 + px * sgn * C * 0.33, hy - d.y * C * 0.12 + py * sgn * C * 0.33, C * 0.08, 0, 7); g.fill(); }
    }
    function draw() {
      g.drawImage(bg, 0, 0);
      const bob = Math.sin(S.t / 260) * C * 0.05;
      if (S.fruit) { const sp = sprite(S.fruit.e); g.drawImage(sp, S.fruit.x * C + C / 2 - sp.width / 2, S.fruit.y * C + C / 2 - sp.height / 2 + bob); }
      if (S.gold && (S.gold.life > 12 || Math.floor(S.t / 150) % 2)) {
        const sp = sprite("🍎", true), x = S.gold.x * C + C / 2, y = S.gold.y * C + C / 2;
        g.fillStyle = "rgba(253,224,71,.55)"; g.beginPath(); g.arc(x, y, C * (0.55 + Math.sin(S.t / 140) * 0.08), 0, 7); g.fill();
        g.drawImage(sp, x - sp.width / 2, y - sp.height / 2 - bob);
      }
      S.snakes.forEach(drawSnake);
      g.textAlign = "center"; g.textBaseline = "middle";
      for (const p of S.pops) {
        g.globalAlpha = Math.max(0, 1 - p.t / 700);
        g.font = `800 ${Math.round(C * (p.gold ? 0.8 : 0.6))}px Baloo, sans-serif`;
        g.lineWidth = C * 0.12; g.strokeStyle = "#fff"; g.fillStyle = p.gold ? "#ca8a04" : "#be185d";
        const y = p.y * C + C / 2 - p.t / 700 * C;
        g.strokeText(p.txt, p.x * C + C / 2, y); g.fillText(p.txt, p.x * C + C / 2, y);
      }
      g.globalAlpha = 1;
    }
    function frame(ts) {
      const dt = Math.min(100, ts - last); last = ts;
      S.t += dt;
      if (S.state === "run") {
        S.acc += dt;
        while (S.acc >= tick && S.state === "run") { S.acc -= tick; step(); }
      }
      S.pops.forEach((p) => (p.t += dt)); S.pops = S.pops.filter((p) => p.t < 700);
      draw();
      raf = requestAnimationFrame(frame);
    }
    fit(); addEventListener("resize", fit);
    setState("ready");
    raf = requestAnimationFrame(frame);
    window.__snake = S; // للتجربة
  }

  // ---------------------------------------------------------------- النتيجة
  function result(r) {
    K.begin();
    const { opt, score, best0, won } = r;
    const L = opt.mode === "lv" ? LEVELS[opt.lv] : null;
    let record = score > best0, msg, focus = "again", next = "";
    if (L) {
      const prev = save.lv[opt.lv];
      if (won) {
        save.lv[opt.lv] = { best: Math.max(score, prev ? prev.best : 0) };
        if (!prev) earn(2, `أنهى المرحلة ${opt.lv + 1}`, showStar);
        else if (record) earn(1, `رقم جديد في المرحلة ${opt.lv + 1}`, showStar);
        msg = "🎉 أحسنت! أنهيت المرحلة";
        if (opt.lv + 1 < LEVELS.length) { next = `<button class="btn f go" ${K.act("next", () => K.replace(play, { mode: "lv", lv: opt.lv + 1 }))}>المرحلة ${opt.lv + 2} ←</button>`; focus = "next"; }
        else msg = "🏆 أنهيت كل المراحل! أنت بطل";
      } else { msg = "أوه! اصطدمت الأفعى 🐍"; record = false; }
    } else {
      if (record) { save.best[opt.mode] = score; if (score >= 5) earn(1, `رقم جديد: ${score} نقطة`, showStar); }
      msg = record && best0 > 0 ? "🏆 رقم قياسي جديد!" : score >= 10 ? "رائع! 🌟" : "أحسنت! 👏";
    }
    save.save();
    const best = L ? (save.lv[opt.lv] ? save.lv[opt.lv].best : 0) : save.best[opt.mode];
    K.paint(`<div class="top">${K.backBtn()}<span></span><span class="pill">${L ? `${L.e} المرحلة ${opt.lv + 1}` : opt.mode === "walls" ? "🧱 بجدران" : "🌀 بلا جدران"}</span></div>
      <h1>${msg}</h1>
      <div class="score"><div><b>${score}</b><span>🍎 نقاطك</span></div><div><b>${best}</b><span>🏆 أفضل نتيجة</span></div><div><b>${r.len}</b><span>🐍 طول الأفعى</span></div></div>
      <div class="rec" id="rec">${record && (!L || won) ? "⭐ تجاوزت أفضل نتيجة لك!" : ""}</div>
      <div class="nav">
        ${next}
        <button class="btn f ${next ? "" : "go"}" ${K.act("again", () => K.replace(play, opt))}><span class="emo">🔁</span> مرة أخرى</button>
        ${L ? `<button class="btn f" ${K.act("lvls", K.back)}><span class="emo">🏰</span> المراحل</button>` : ""}
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>${K.HELP}`, focus);
    if (won || record) { K.sfx.win(); K.confetti(won ? 40 : 24, "🍎🍌🍇🍓⭐🎉"); }
  }
  function showStar(n) {
    const el = document.getElementById("rec");
    if (el) el.innerHTML = `⭐ ربحت ${n} ${n === 1 ? "نجمة" : n === 2 ? "نجمتين" : "نجوم"}!`;
  }

  K.start(home);
})();
