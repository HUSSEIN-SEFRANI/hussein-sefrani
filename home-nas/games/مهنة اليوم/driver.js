// مهنة اليوم — السائق 🚕: خريطة مدينة، ركاب ينتظرون، إشارات مرور، وقود، وحساب الباقي من الأجرة.
(() => {
  "use strict";
  const W = 21, H = 13;                       // الخريطة بالمربعات: شارع كل 4 مربعات، وبينها 15 مبنى (3×3)
  const road = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (x % 4 === 0 || y % 4 === 0);
  const cross = (x, y) => x % 4 === 0 && y % 4 === 0;
  const PLACES = [
    { n: "المستشفى", e: "🏥", c: "#f8fafc", r: "#ef4444" },
    { n: "المدرسة", e: "🏫", c: "#fde68a", r: "#d97706" },
    { n: "السوق", e: "🛒", c: "#bbf7d0", r: "#16a34a" },
    { n: "المسجد", e: "🕌", c: "#e0f2fe", r: "#0284c7" },
    { n: "البنك", e: "🏦", c: "#e5e7eb", r: "#475569" },
    { n: "المكتبة", e: "📚", c: "#fed7aa", r: "#c2410c" },
    { n: "المطعم", e: "🍕", c: "#fecaca", r: "#b91c1c" },
    { n: "الحديقة", e: "🌳", c: "#86efac", r: "#15803d", park: true },
    { n: "الملعب", e: "🏟️", c: "#a7f3d0", r: "#047857" },
    { n: "الفندق", e: "🏨", c: "#ddd6fe", r: "#6d28d9" },
    { n: "المتحف", e: "🏛️", c: "#f5f5f4", r: "#78716c" },
    { n: "محطة الوقود", e: "⛽", c: "#fef08a", r: "#ca8a04", gas: true },
    { n: "مركز الإطفاء", e: "🚒", c: "#fecdd3", r: "#be123c" },
    { n: "الصيدلية", e: "💊", c: "#cffafe", r: "#0e7490" },
    { n: "المخبز", e: "🥖", c: "#fef3c7", r: "#a16207" },
  ];
  const WHO = ["🧑", "👩", "👨", "👵", "👴", "🧕", "👦", "👧", "🧔", "👨‍💼", "👩‍🎓", "👨‍🦳", "👩‍🦱", "🧑‍🦯"];
  const SAY = ["خذني إلى", "أريد الذهاب إلى", "من فضلك إلى", "أوصلني إلى", "عندي موعد في"];
  const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: "down", down: "up", left: "right", right: "left" };
  const ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const CARS = ["#3b82f6", "#ef4444", "#10b981", "#a855f7", "#f97316", "#64748b", "#ec4899"];

  // الصعوبة حسب عدد الورديات المنتهية
  const level = (shift) => {
    const L = Math.min(shift, 3);
    return {
      L,
      total: Jobs.TEST ? 3 : 18 + 2 * L,       // عدد الركاب في الوردية (~10–15 دقيقة)
      speed: 2.6,                               // مربع/ثانية
      lights: 3 + 2 * L,
      cars: 2 + L,
      fuel: 0.35 + 0.1 * L,                     // استهلاك لكل مربع
      tip: 45 - 5 * L,                          // ثوانٍ للإكرامية
      hint: [0, 12, 20, 30][L],                 // بعد كم ثانية تظهر علامة المكان المطلوب
      rate: L >= 2 ? 2 : 1,                     // الأجرة لكل مربع
    };
  };

  function how(shift) {
    const v = level(shift);
    return `<p>أنت سائق سيارة أجرة 🚕 في المدينة. اذهب إلى الراكب 🧍، ثم أوصله إلى المكان الذي يطلبه.</p>
      <ul>
        <li><b>الأسهم</b> (اضغط باستمرار) للقيادة.</li>
        <li>عند الوصول: الراكب يدفع، و<b>أنت تحسب الباقي</b> 💰.</li>
        <li>🚦 قف عند الإشارة الحمراء، وانتبه للسيارات.</li>
        <li>⛽ إذا قلّ الوقود اذهب إلى محطة الوقود.</li>
        <li>⏱ أوصل الراكب بسرعة لتأخذ إكرامية.</li>
      </ul>
      <p class="goal">مهمة اليوم: <b>${v.total} راكباً</b>${v.L ? " — المدينة أصعب من الوردية الماضية!" : ""}</p>`;
  }

  function start(api) {
    const v = level(api.shift);
    const run = api.run || {
      total: v.total, done: 0, coins: 0, fines: 0, ok: 0, fuel: 100,
      layout: K.shuffle(K.range(0, PLACES.length)),
    };
    const place = (b) => PLACES[run.layout[b]];
    const door = (b) => ({ x: 4 * (b % 5) + 2, y: 4 * Math.floor(b / 5) + 4 });
    const gasB = run.layout.findIndex((i) => PLACES[i].gas);

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        <span class="pill"><span class="emo">🧍</span> <b id="htr"></b></span>
        <span class="pill"><span class="emo">💰</span> <b id="hco"></b></span>
        <span class="pill fuel"><span class="emo">⛽</span> <i><u id="hfu"></u></i></span>
        <span class="pill" id="hti"></span>
      </div>
      <div class="msg" id="msg"></div>
      <div class="board"><canvas id="cv"></canvas></div>`);
    const $ = (s) => K.app.querySelector(s);
    const cv = $("#cv"), cx = cv.getContext("2d"), board = $(".board");

    // ---------------------------------------------------------------- الحالة
    const taxi = { x: door(gasB).x, y: door(gasB).y, tx: 0, ty: 0, dir: "left", moving: false };
    let T = 0, bumpCd = 0, pass = null, waitNext = 0, hintShown = false, lastLight = null;
    const lights = K.shuffle(K.range(0, 24).map((i) => ({ x: 4 * (i % 6), y: 4 * Math.floor(i / 6) })).filter((p) => (p.x > 0 && p.x < 20) || (p.y > 0 && p.y < 12)))
      .slice(0, v.lights).map((p) => ({ ...p, off: Math.random() * 7 }));
    const lightAt = (x, y) => lights.find((l) => l.x === x && l.y === y);
    const red = (l) => (T + l.off) % 7 < 2.6;
    const roadTiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (road(x, y)) roadTiles.push({ x, y });
    const cars = K.range(0, v.cars).map((i) => {
      const t = K.pick(roadTiles.filter((p) => Math.abs(p.x - taxi.x) + Math.abs(p.y - taxi.y) > 6));
      return { x: t.x, y: t.y, tx: t.x, ty: t.y, dir: "left", moving: false, c: CARS[i % CARS.length], wait: 0 };
    });

    // ---------------------------------------------------------------- اللوحة العلوية
    const hud = () => {
      $("#htr").textContent = `${run.done} / ${run.total}`;
      $("#hco").textContent = run.coins;
      const f = $("#hfu");
      f.style.width = Math.max(0, run.fuel) + "%";
      f.className = run.fuel < 25 ? "low" : "";
      const ti = $("#hti");
      if (pass && pass.stage === "ride") {
        const left = Math.max(0, Math.ceil(v.tip - pass.t));
        ti.innerHTML = left ? `<span class="emo">⏱</span> ${left}` : `<span class="emo">🐢</span>`;
        ti.style.visibility = "";
      } else ti.style.visibility = "hidden";
    };
    const say = (html) => { $("#msg").innerHTML = html; };
    const missionText = () => {
      if (!pass) return say(`<span class="emo">🚕</span> انتظر… راكب جديد قادم`);
      const p = place(pass.stage === "wait" ? pass.from : pass.to);
      if (pass.stage === "wait") say(`<span class="emo">🧍</span> راكب ينتظرك عند <b>${p.n}</b> <span class="emo">${p.e}</span>`);
      else say(`<span class="emo">${pass.who}</span> «${pass.say} <b>${p.n}</b>» <span class="emo">${p.e}</span>${hintShown && v.hint ? ` <small>💡 انظر إلى العلامة</small>` : ""}`);
    };

    // ---------------------------------------------------------------- الركاب
    function spawn() {
      const ok = K.range(0, 15).filter((b) => b !== gasB);
      let from, to, g = 0;
      do {
        from = K.pick(ok); to = K.pick(ok);
        const a = door(from), b = door(to);
        if (to !== from && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) >= 6 && !(a.x === taxi.x && a.y === taxi.y)) break;
      } while (++g < 40);
      pass = { from, to, who: K.pick(WHO), say: K.pick(SAY), stage: "wait", t: 0 };
      hintShown = false;
      missionText(); hud();
    }
    function pickUp() {
      pass.stage = "ride"; pass.t = 0;
      hintShown = v.hint === 0;
      K.sfx.ok();
      missionText(); hud();
    }
    function deliver() {
      const a = door(pass.from), b = door(pass.to);
      const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      const fare = 5 + dist * v.rate;
      const fast = pass.t <= v.tip, tip = fast ? (v.L >= 2 ? 10 : 5) : 0;
      const steps = v.L >= 2 && Math.random() < 0.4 ? [50, 100] : [10, 20, 50];
      let paid = steps.map((s) => Math.ceil(fare / s) * s).find((p) => p > fare) || fare + 10;
      if (paid === fare) paid += 10;
      const change = paid - fare, who = pass.who, P = place(pass.to);
      ctl.clear();
      K.sfx.tick();
      Jobs.overlay(`
        <div class="pay"><span class="emo big">${who}</span><div>
          <div>وصلنا إلى <b>${P.n}</b> ${P.e} — شكراً!</div>
          <div class="fare">الأجرة: <b>${fare}</b> 💰 &nbsp; أعطاك: <b>${paid}</b> 💵</div>
          ${tip ? `<div class="tipline">⏱ وصلت بسرعة! إكرامية +${tip}</div>` : ""}
        </div></div>
        <h2>كم الباقي الذي تعطيه للراكب؟</h2>`,
        Jobs.numOptions(change, 3, v.L ? [1, 2, 5, 10] : [1, 5, 10]).map((n) => ({ label: `<span class="num">${n}</span>`, cls: "opt", fn: () => paidBack(n === change, change, fare, tip) })),
        { cls: "wide", btnCls: "opts" });
    }
    function paidBack(right, change, fare, tip) {
      if (right) {
        run.ok++; run.coins += fare + tip;
        K.sfx.ok(); K.confetti(8, "💰✨⭐");
        Jobs.toast(`صحيح! الباقي ${change} 👏 ربحت ${fare + tip} 💰`, "good");
      } else {
        run.coins += fare;
        K.sfx.bad();
        Jobs.toast(`الباقي الصحيح ${change} — الراكب لم يعطك إكرامية 🙁`, "bad", 3500);
      }
      run.done++;
      pass = null;
      api.keep(run);
      hud();
      if (run.done >= run.total) return K.later(finish, 1600);
      waitNext = 1.6;
      missionText();
    }
    function finish() {
      const s = run.fines === 0 && run.ok >= run.total * 0.85 ? 3 : run.ok >= run.total * 0.6 && run.fines <= 3 ? 2 : 1;
      api.finish({
        s, score: run.ok, total: run.total,
        msg: s === 3 ? "سائق محترف! 🏆" : s === 2 ? "سائق ماهر! 👏" : "أنهيت الوردية! 💪",
        extra: `<div class="won"><span class="emo">💰</span> ربحت ${run.coins} &nbsp; <span class="emo">🚦</span> مخالفات: ${run.fines}</div>`,
      });
    }

    // ---------------------------------------------------------------- القيادة
    const pause = () => {
      ctl.clear();
      Jobs.overlay(`<h2>⏸ استراحة</h2><div class="sub">أوصلت ${run.done} من ${run.total} راكباً</div>`, [
        { label: "▶ تابع", cls: "go" },
        { label: "🏠 احفظ واخرج", fn: () => { api.keep(run); api.exit(); } },
      ], { back: () => {} });
    };
    const honk = () => { K.tone(440, 0.12, "square", 0.08); K.tone(370, 0.16, "square", 0.08, 0.12); };
    const ctl = Jobs.controls({ onBack: pause, onOk: honk });
    K.mode = ctl.mode;
    K.mode.stop = () => { stopLoop(); removeEventListener("resize", resize); Jobs.closeOverlay(); };
    $("#hp").addEventListener("click", pause);
    if (matchMedia("(pointer: coarse)").matches || "ontouchstart" in window) ctl.dpad(K.app.querySelector(".screen"));

    function fine(text, n) {
      run.fines++; run.coins = Math.max(0, run.coins - n);
      K.sfx.bad();
      Jobs.toast(`${text} −${n} 💰`, "bad");
      hud();
    }
    function stepTaxi() {
      const want = ctl.dir();
      if (!want || bumpCd > 0) return;
      let d = null;
      for (const c of [want, taxi.dir]) { const [dx, dy] = VEC[c]; if (road(taxi.x + dx, taxi.y + dy)) { d = c; break; } }
      if (!d) return;
      const [dx, dy] = VEC[d];
      taxi.tx = taxi.x + dx; taxi.ty = taxi.y + dy; taxi.dir = d; taxi.moving = true;
      const l = lightAt(taxi.tx, taxi.ty);
      if (l && red(l) && lastLight !== l) { lastLight = l; fine("🚦 تجاوزت الإشارة الحمراء!", 10); }
      if (!l) lastLight = null;
      run.fuel -= v.fuel;
    }
    function arrive() {
      taxi.moving = false;
      const at = (b) => { const d = door(b); return d.x === taxi.x && d.y === taxi.y; };
      if (run.fuel <= 0) {
        run.fuel = 60; run.coins = Math.max(0, run.coins - 20); run.fines++;
        K.sfx.bad();
        Jobs.toast("🛻 نفد الوقود! جاءت سيارة المساعدة −20 💰", "bad", 3200);
      }
      if (at(gasB) && run.fuel < 90) {
        const cost = Math.ceil((100 - run.fuel) / 10);
        run.fuel = 100; run.coins = Math.max(0, run.coins - cost);
        K.tone(660, 0.1); K.tone(880, 0.15, "sine", 0.15, 0.1);
        Jobs.toast(`⛽ ملأت الخزان −${cost} 💰`);
      }
      if (pass && pass.stage === "wait" && at(pass.from)) pickUp();
      else if (pass && pass.stage === "ride" && at(pass.to)) deliver();
      hud();
    }
    const moveTo = (o, sp, dt) => {
      const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy), s = sp * dt;
      if (d <= s) { o.x = o.tx; o.y = o.ty; return true; }
      o.x += (dx / d) * s; o.y += (dy / d) * s;
      return false;
    };
    function updateCars(dt) {
      for (const c of cars) {
        if (c.moving) { if (moveTo(c, 2, dt)) c.moving = false; continue; }
        if (c.wait > 0) { c.wait -= dt; continue; }
        const opts = Object.keys(VEC).filter((d) => d !== OPP[c.dir] && road(c.x + VEC[d][0], c.y + VEC[d][1]));
        const d = opts.includes(c.dir) && !cross(c.x, c.y) ? c.dir : K.pick(opts.length ? opts : [OPP[c.dir]]);
        const nx = c.x + VEC[d][0], ny = c.y + VEC[d][1];
        const l = lightAt(nx, ny);
        if (l && red(l)) { c.wait = 0.3; continue; }
        const near = (x, y) => Math.abs(x - nx) < 0.9 && Math.abs(y - ny) < 0.9;
        if ((near(taxi.x, taxi.y) || near(taxi.tx, taxi.ty)) && taxi.dir !== OPP[d]) { c.wait = 0.4; continue; }
        c.dir = d; c.tx = nx; c.ty = ny; c.moving = true;
      }
    }
    function update(dt) {
      if (Jobs.ov) return;
      T += dt;
      if (bumpCd > 0) bumpCd -= dt;
      if (taxi.moving) { if (moveTo(taxi, v.speed, dt)) arrive(); }
      if (!taxi.moving && !Jobs.ov) stepTaxi();
      updateCars(dt);
      for (const c of cars) {
        if (bumpCd <= 0 && Math.hypot(c.x - taxi.x, c.y - taxi.y) < 0.55 && c.dir !== OPP[taxi.dir]) {
          bumpCd = 1.5; fine("💥 اصطدمت بسيارة! انتبه", 5);
        }
      }
      if (pass) {
        pass.t += dt;
        if (pass.stage === "ride" && !hintShown && pass.t >= v.hint) { hintShown = true; missionText(); }
        if (pass.stage === "ride" && Math.ceil(v.tip - pass.t) !== Math.ceil(v.tip - pass.t + dt)) hud();
      } else if (waitNext > 0 && (waitNext -= dt) <= 0) spawn();
    }

    // ---------------------------------------------------------------- الرسم
    let TS = 40, dpr = 1, bg = null;
    const EMO = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    function resize() {
      const bw = board.clientWidth, bh = board.clientHeight;
      TS = Math.max(16, Math.floor(Math.min(bw / W, bh / H)));
      dpr = Jobs.LITE ? 1 : Math.min(devicePixelRatio || 1, 1.5);
      cv.style.width = W * TS + "px"; cv.style.height = H * TS + "px";
      cv.width = Math.round(W * TS * dpr); cv.height = Math.round(H * TS * dpr);
      bg = drawCity();
    }
    function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
    function drawCity() {
      const b = document.createElement("canvas");
      b.width = cv.width; b.height = cv.height;
      const c = b.getContext("2d");
      c.scale(dpr, dpr);
      c.fillStyle = "#7cc26a"; c.fillRect(0, 0, W * TS, H * TS);
      c.fillStyle = "#475569";
      for (const p of roadTiles) c.fillRect(p.x * TS, p.y * TS, TS, TS);
      // خطوط الطريق
      c.strokeStyle = "#f8fafc"; c.lineWidth = Math.max(1, TS * 0.05); c.setLineDash([TS * 0.25, TS * 0.25]);
      for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) if (!cross(x, y)) { c.beginPath(); c.moveTo(x * TS, (y + 0.5) * TS); c.lineTo((x + 1) * TS, (y + 0.5) * TS); c.stroke(); }
      for (let x = 0; x < W; x += 4) for (let y = 0; y < H; y++) if (!cross(x, y)) { c.beginPath(); c.moveTo((x + 0.5) * TS, y * TS); c.lineTo((x + 0.5) * TS, (y + 1) * TS); c.stroke(); }
      c.setLineDash([]);
      // المباني
      c.textAlign = "center"; c.textBaseline = "middle"; c.direction = "rtl";
      for (let i = 0; i < 15; i++) {
        const P = place(i), bx = (4 * (i % 5) + 1) * TS, by = (4 * Math.floor(i / 5) + 1) * TS, s = 3 * TS;
        c.fillStyle = "#cbd5e1"; c.fillRect(bx, by, s, s);
        const m = TS * 0.16;
        rr(c, bx + m, by + m, s - 2 * m, s - 2 * m, TS * 0.2); c.fillStyle = P.c; c.fill();
        c.lineWidth = TS * 0.06; c.strokeStyle = P.r; c.stroke();
        if (!P.park) { c.fillStyle = P.r; c.fillRect(bx + m, by + m, s - 2 * m, TS * 0.3); }
        else if (!Jobs.LITE) { c.font = `${TS * 0.6}px ${EMO}`; for (const [a, q] of [[0.7, 0.9], [2.3, 0.9], [0.7, 2.0], [2.3, 2.0]]) c.fillText("🌲", bx + a * TS, by + q * TS); }
        c.font = `${TS * 1.15}px ${EMO}`; c.fillText(P.e, bx + s / 2, by + s * 0.47);
        c.font = `800 ${Math.max(10, TS * 0.36)}px Baloo, Tahoma, sans-serif`;
        c.lineWidth = TS * 0.12; c.strokeStyle = "#1e293b"; c.strokeText(P.n, bx + s / 2, by + s - TS * 0.42);
        c.fillStyle = "#fff"; c.fillText(P.n, bx + s / 2, by + s - TS * 0.42);
        // الباب
        c.fillStyle = "#92400e"; c.fillRect(bx + s / 2 - TS * 0.2, by + s - TS * 0.16, TS * 0.4, TS * 0.16);
      }
      return b;
    }
    function drawCar(x, y, dir, color, isTaxi) {
      const px = (x + 0.5) * TS, py = (y + 0.5) * TS, a = ANG[dir];
      cx.save(); cx.translate(px, py); cx.rotate(a);
      cx.translate(0, TS * 0.2);                                // يمين الطريق
      const L = TS * 0.74, Wd = TS * 0.44;
      if (!Jobs.LITE) { cx.fillStyle = "rgba(0,0,0,.25)"; rr(cx, -L / 2 + 2, -Wd / 2 + 3, L, Wd, TS * 0.12); cx.fill(); }
      rr(cx, -L / 2, -Wd / 2, L, Wd, TS * 0.12); cx.fillStyle = color; cx.fill();
      cx.fillStyle = "#1e293b"; cx.fillRect(L * 0.08, -Wd * 0.36, L * 0.2, Wd * 0.72);   // الزجاج الأمامي
      cx.fillStyle = "#334155"; cx.fillRect(-L * 0.36, -Wd * 0.32, L * 0.14, Wd * 0.64);
      cx.fillStyle = "#fef9c3"; cx.fillRect(L / 2 - TS * 0.06, -Wd / 2 + 2, TS * 0.06, TS * 0.08); cx.fillRect(L / 2 - TS * 0.06, Wd / 2 - 2 - TS * 0.08, TS * 0.06, TS * 0.08);
      if (isTaxi) { cx.fillStyle = "#111827"; cx.fillRect(-L * 0.12, -Wd * 0.22, L * 0.16, Wd * 0.44); cx.fillStyle = "#fde047"; cx.fillRect(-L * 0.1, -Wd * 0.16, L * 0.12, Wd * 0.32); }
      cx.restore();
    }
    function ring(b, col) {
      const d = door(b), k = 0.5 + 0.5 * Math.sin(T * 6);
      const bx = (4 * (b % 5) + 1) * TS, by = (4 * Math.floor(b / 5) + 1) * TS;
      cx.lineWidth = TS * 0.12; cx.strokeStyle = col; cx.globalAlpha = 0.5 + 0.5 * k;
      rr(cx, bx + TS * 0.05, by + TS * 0.05, 3 * TS - TS * 0.1, 3 * TS - TS * 0.1, TS * 0.25); cx.stroke();
      cx.beginPath(); cx.arc((d.x + 0.5) * TS, (d.y + 0.5) * TS, TS * (0.45 + 0.12 * k), 0, 7); cx.stroke();
      cx.globalAlpha = 1;
    }
    function render() {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.drawImage(bg, 0, 0, W * TS, H * TS);
      // الإشارات
      for (const l of lights) {
        const r = red(l), x = l.x * TS, y = l.y * TS;
        cx.fillStyle = r ? "rgba(239,68,68,.28)" : "rgba(34,197,94,.18)"; cx.fillRect(x, y, TS, TS);
        cx.fillStyle = "#111827"; rr(cx, x + TS * 0.62, y - TS * 0.05, TS * 0.36, TS * 0.36, TS * 0.08); cx.fill();
        cx.fillStyle = r ? "#ef4444" : "#22c55e"; cx.beginPath(); cx.arc(x + TS * 0.8, y + TS * 0.13, TS * 0.12, 0, 7); cx.fill();
      }
      cx.textAlign = "center"; cx.textBaseline = "middle";
      if (pass) {
        if (pass.stage === "wait") {
          ring(pass.from, "#facc15");
          const d = door(pass.from), bob = Math.sin(T * 5) * TS * 0.06;
          cx.font = `${TS * 0.8}px ${EMO}`; cx.fillText(pass.who, (d.x + 0.5) * TS, (d.y + 0.45) * TS + bob);
          cx.font = `${TS * 0.45}px ${EMO}`; cx.fillText("✋", (d.x + 0.95) * TS, (d.y + 0.05) * TS + bob);
        } else if (hintShown) {
          ring(pass.to, "#22c55e");
          const d = door(pass.to);
          cx.font = `${TS * 0.7}px ${EMO}`; cx.fillText("🏁", (d.x + 0.5) * TS, (d.y + 0.45) * TS);
        }
      }
      for (const c of cars) drawCar(c.x, c.y, c.dir, c.c, false);
      drawCar(taxi.x, taxi.y, taxi.dir, "#facc15", true);
      if (pass && pass.stage === "ride") { cx.font = `${TS * 0.5}px ${EMO}`; cx.fillText(pass.who, (taxi.x + 0.5) * TS, (taxi.y - 0.15) * TS); }
      if (bumpCd > 1) { cx.font = `${TS * 0.7}px ${EMO}`; cx.fillText("💥", (taxi.x + 0.5) * TS, (taxi.y + 0.5) * TS); }
    }

    if (Jobs.TEST) window.__drv = { taxi, run, door, get pass() { return pass; } };   // للتجربة الآلية
    addEventListener("resize", resize);
    resize();
    const stopLoop = Jobs.loop((dt) => { update(dt); render(); });
    hud();
    if (run.done === 0 && !api.run) {
      say(`<span class="emo">🚕</span> صباح الخير أيها السائق! استعد…`);
      waitNext = 1.5;
    } else spawn();
  }

  Jobs.register("driver", { how, start });
})();
