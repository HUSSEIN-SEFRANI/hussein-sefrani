// مهنة اليوم — محرك المدينة المشترك (السائق، الإطفائي، ساعي البريد):
// خريطة 21×13 مربعاً، شارع كل 4 مربعات، و15 مبنى (3×3) لكل مبنى باب على الشارع تحته.
(() => {
  "use strict";
  const W = 21, H = 13;
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
    { n: "محطة الوقود", e: "⛽", c: "#fef08a", r: "#ca8a04", id: "gas" },
    { n: "مركز الإطفاء", e: "🚒", c: "#fecdd3", r: "#be123c", id: "fire" },
    { n: "الصيدلية", e: "💊", c: "#cffafe", r: "#0e7490" },
    { n: "مكتب البريد", e: "📮", c: "#fee2e2", r: "#dc2626", id: "post" },
  ];
  const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: "down", down: "up", left: "right", right: "left" };
  const ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const CARS = ["#3b82f6", "#ef4444", "#10b981", "#a855f7", "#f97316", "#64748b", "#ec4899"];
  const EMO = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';

  Jobs.CITY = { PLACES, W, H };
  Jobs.newLayout = () => K.shuffle(K.range(0, PLACES.length));
  Jobs.doorDist = (a, b) => { const d = (i) => ({ x: 4 * (i % 5) + 2, y: 4 * Math.floor(i / 5) + 4 }); const p = d(a), q = d(b); return Math.abs(p.x - q.x) + Math.abs(p.y - q.y); };

  // cfg = { run, v:{speed,lights,cars,fuel}, home:"gas"|"fire"|"post", body:"#color", kind:"taxi"|"fire"|"mail",
  //         pills: html, hud(E), msg(E), targets(E)->[{b, col, emo, ring}], arrive(E,b), update(E,dt), draw(E,cx,TS), pauseText }
  Jobs.city = (api, cfg) => {
    const run = cfg.run, v = cfg.v;
    const place = (b) => PLACES[run.layout[b]];
    const door = (b) => ({ x: 4 * (b % 5) + 2, y: 4 * Math.floor(b / 5) + 4 });
    const find = (id) => run.layout.findIndex((i) => PLACES[i].id === id);
    const homeB = find(cfg.home);

    K.paint(`
      <div class="hud">
        <button class="hb" id="hp"><span class="emo">⏸</span></button>
        ${cfg.pills}
        ${cfg.fuel ? `<span class="pill fuel"><span class="emo">⛽</span> <i><u id="hfu"></u></i></span>` : ""}
      </div>
      <div class="msg" id="msg"></div>
      <div class="board"><canvas id="cv"></canvas></div>`);
    const $ = (s) => K.app.querySelector(s);
    const cv = $("#cv"), cx = cv.getContext("2d"), board = $(".board");

    const car = { x: door(homeB).x, y: door(homeB).y, tx: 0, ty: 0, dir: "left", moving: false };
    let bumpCd = 0, lastLight = null;
    const lights = K.shuffle(K.range(0, 24).map((i) => ({ x: 4 * (i % 6), y: 4 * Math.floor(i / 6) })).filter((p) => (p.x > 0 && p.x < 20) || (p.y > 0 && p.y < 12)))
      .slice(0, v.lights).map((p) => ({ ...p, off: Math.random() * 7 }));
    const lightAt = (x, y) => lights.find((l) => l.x === x && l.y === y);
    const red = (l) => (E.T + l.off) % 7 < 2.6;
    const roadTiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (road(x, y)) roadTiles.push({ x, y });
    const cars = K.range(0, v.cars).map((i) => {
      const t = K.pick(roadTiles.filter((p) => Math.abs(p.x - car.x) + Math.abs(p.y - car.y) > 6));
      return { x: t.x, y: t.y, tx: t.x, ty: t.y, dir: "left", moving: false, c: CARS[i % CARS.length], wait: 0 };
    });

    const E = {
      run, v, T: 0, car, place, door, find, homeB, $,
      at: (b) => { const d = door(b); return d.x === car.x && d.y === car.y && !car.moving; },
      say: (html) => { $("#msg").innerHTML = html; },
      hud() {
        if (cfg.fuel) { const f = $("#hfu"); f.style.width = Math.max(0, run.fuel) + "%"; f.className = run.fuel < 25 ? "low" : ""; }
        cfg.hud(E);
      },
      msg() { E.say(cfg.msg(E)); },
      fine(text, n) {
        run.fines++; run.coins = Math.max(0, run.coins - n);
        K.sfx.bad();
        Jobs.toast(`${text}${n ? ` −${n} 💰` : ""}`, "bad");
        E.hud();
      },
      stopCar() { ctl.clear(); },
      keep() { api.keep(run); },
    };

    // ---------------------------------------------------------------- التحكم
    const pause = () => {
      ctl.clear();
      Jobs.overlay(`<h2>⏸ استراحة</h2><div class="sub">${cfg.pauseText(E)}</div>`, [
        { label: "▶ تابع", cls: "go" },
        { label: "🏠 احفظ واخرج", fn: () => { api.keep(run); api.exit(); } },
      ], { back: () => {} });
    };
    const horn = () => cfg.kind === "fire"
      ? [0, 0.25, 0.5].forEach((w) => { K.tone(880, 0.2, "sawtooth", 0.05, w); K.tone(660, 0.2, "sawtooth", 0.05, w + 0.12); })
      : (K.tone(440, 0.12, "square", 0.08), K.tone(370, 0.16, "square", 0.08, 0.12));
    const ctl = Jobs.controls({ onBack: pause, onOk: horn });
    K.mode = ctl.mode;
    K.mode.stop = () => { stopLoop(); removeEventListener("resize", resize); Jobs.closeOverlay(); };
    $("#hp").addEventListener("click", pause);
    if (matchMedia("(pointer: coarse)").matches || "ontouchstart" in window) ctl.dpad(K.app.querySelector(".screen"));

    function step() {
      const want = ctl.dir();
      if (!want || bumpCd > 0) return;
      let d = null;
      for (const c of [want, car.dir]) { const [dx, dy] = VEC[c]; if (road(car.x + dx, car.y + dy)) { d = c; break; } }
      if (!d) return;
      const [dx, dy] = VEC[d];
      car.tx = car.x + dx; car.ty = car.y + dy; car.dir = d; car.moving = true;
      const l = lightAt(car.tx, car.ty);
      // سيارة الإطفاء في مهمة يُسمح لها بعبور الإشارة (بصفارة الإنذار)
      if (l && red(l) && lastLight !== l && !(cfg.siren && cfg.siren(E))) { lastLight = l; E.fine("🚦 تجاوزت الإشارة الحمراء!", 10); }
      if (!l) lastLight = null;
      if (cfg.fuel) run.fuel -= v.fuel;
    }
    function arrive() {
      car.moving = false;
      if (cfg.fuel) {
        if (run.fuel <= 0) {
          run.fuel = 60; run.coins = Math.max(0, run.coins - 20); run.fines++;
          K.sfx.bad();
          Jobs.toast("🛻 نفد الوقود! جاءت سيارة المساعدة −20 💰", "bad", 3200);
        }
        const gas = find("gas");
        if (E.at(gas) && run.fuel < 90) {
          const cost = Math.ceil((100 - run.fuel) / 10);
          run.fuel = 100; run.coins = Math.max(0, run.coins - cost);
          K.tone(660, 0.1); K.tone(880, 0.15, "sine", 0.15, 0.1);
          Jobs.toast(`⛽ ملأت الخزان −${cost} 💰`);
        }
      }
      for (let b = 0; b < 15; b++) if (E.at(b)) cfg.arrive(E, b);
      E.hud();
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
        if ((near(car.x, car.y) || near(car.tx, car.ty)) && car.dir !== OPP[d]) { c.wait = 0.4; continue; }
        c.dir = d; c.tx = nx; c.ty = ny; c.moving = true;
      }
    }
    function update(dt) {
      if (Jobs.ov) return;
      E.T += dt;
      if (bumpCd > 0) bumpCd -= dt;
      if (car.moving) { if (moveTo(car, v.speed, dt)) arrive(); }
      if (!car.moving && !Jobs.ov) step();
      updateCars(dt);
      for (const c of cars) {
        if (bumpCd <= 0 && Math.hypot(c.x - car.x, c.y - car.y) < 0.55 && c.dir !== OPP[car.dir]) {
          bumpCd = 1.5; E.fine("💥 اصطدمت بسيارة! انتبه", 5);
        }
      }
      cfg.update(E, dt);
    }

    // ---------------------------------------------------------------- الرسم
    let TS = 40, dpr = 1, bg = null;
    function resize() {
      const bw = board.clientWidth, bh = board.clientHeight;
      TS = Math.max(16, Math.floor(Math.min(bw / W, bh / H)));
      dpr = Jobs.LITE ? 1 : Math.min(devicePixelRatio || 1, 1.5);
      cv.style.width = W * TS + "px"; cv.style.height = H * TS + "px";
      cv.width = Math.round(W * TS * dpr); cv.height = Math.round(H * TS * dpr);
      bg = drawCity();
    }
    const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
    function drawCity() {
      const b = document.createElement("canvas");
      b.width = cv.width; b.height = cv.height;
      const c = b.getContext("2d");
      c.scale(dpr, dpr);
      c.fillStyle = "#7cc26a"; c.fillRect(0, 0, W * TS, H * TS);
      c.fillStyle = "#475569";
      for (const p of roadTiles) c.fillRect(p.x * TS, p.y * TS, TS, TS);
      c.strokeStyle = "#f8fafc"; c.lineWidth = Math.max(1, TS * 0.05); c.setLineDash([TS * 0.25, TS * 0.25]);
      for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) if (!cross(x, y)) { c.beginPath(); c.moveTo(x * TS, (y + 0.5) * TS); c.lineTo((x + 1) * TS, (y + 0.5) * TS); c.stroke(); }
      for (let x = 0; x < W; x += 4) for (let y = 0; y < H; y++) if (!cross(x, y)) { c.beginPath(); c.moveTo((x + 0.5) * TS, y * TS); c.lineTo((x + 0.5) * TS, (y + 1) * TS); c.stroke(); }
      c.setLineDash([]);
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
        if (cfg.numbers) {   // رقم المبنى (لساعي البريد)
          c.fillStyle = "#1e3a8a"; c.beginPath(); c.arc(bx + TS * 0.45, by + TS * 0.5, TS * 0.3, 0, 7); c.fill();
          c.fillStyle = "#fff"; c.font = `800 ${TS * 0.34}px Baloo, Tahoma, sans-serif`; c.fillText(String(i + 1), bx + TS * 0.45, by + TS * 0.53);
        }
        c.fillStyle = "#92400e"; c.fillRect(bx + s / 2 - TS * 0.2, by + s - TS * 0.16, TS * 0.4, TS * 0.16);
      }
      return b;
    }
    function drawCar(x, y, dir, color, kind) {
      const px = (x + 0.5) * TS, py = (y + 0.5) * TS;
      cx.save(); cx.translate(px, py); cx.rotate(ANG[dir]);
      cx.translate(0, TS * 0.2);
      const L = TS * (kind === "fire" ? 0.9 : 0.74), Wd = TS * 0.44;
      if (!Jobs.LITE) { cx.fillStyle = "rgba(0,0,0,.25)"; rr(cx, -L / 2 + 2, -Wd / 2 + 3, L, Wd, TS * 0.12); cx.fill(); }
      rr(cx, -L / 2, -Wd / 2, L, Wd, TS * 0.12); cx.fillStyle = color; cx.fill();
      cx.fillStyle = "#1e293b"; cx.fillRect(L * 0.18, -Wd * 0.36, L * 0.16, Wd * 0.72);
      cx.fillStyle = "#fef9c3"; cx.fillRect(L / 2 - TS * 0.06, -Wd / 2 + 2, TS * 0.06, TS * 0.08); cx.fillRect(L / 2 - TS * 0.06, Wd / 2 - 2 - TS * 0.08, TS * 0.06, TS * 0.08);
      if (kind === "taxi") { cx.fillStyle = "#334155"; cx.fillRect(-L * 0.36, -Wd * 0.32, L * 0.14, Wd * 0.64); cx.fillStyle = "#111827"; cx.fillRect(-L * 0.12, -Wd * 0.22, L * 0.16, Wd * 0.44); cx.fillStyle = "#fde047"; cx.fillRect(-L * 0.1, -Wd * 0.16, L * 0.12, Wd * 0.32); }
      else if (kind === "fire") {
        cx.fillStyle = "#e5e7eb"; for (let k = 0; k < 4; k++) cx.fillRect(-L * 0.42 + k * L * 0.13, -Wd * 0.08, L * 0.08, Wd * 0.16);   // السلّم
        cx.fillStyle = Math.sin(E.T * 14) > 0 ? "#60a5fa" : "#ef4444"; cx.fillRect(L * 0.06, -Wd * 0.3, L * 0.08, Wd * 0.6);
      } else if (kind === "mail") { cx.fillStyle = "#fff"; cx.fillRect(-L * 0.4, -Wd * 0.3, L * 0.5, Wd * 0.6); cx.fillStyle = "#dc2626"; cx.fillRect(-L * 0.4, -Wd * 0.05, L * 0.5, Wd * 0.1); }
      else { cx.fillStyle = "#334155"; cx.fillRect(-L * 0.36, -Wd * 0.32, L * 0.14, Wd * 0.64); }
      cx.restore();
    }
    E.ring = (b, col) => {
      const d = door(b), k = 0.5 + 0.5 * Math.sin(E.T * 6);
      const bx = (4 * (b % 5) + 1) * TS, by = (4 * Math.floor(b / 5) + 1) * TS;
      cx.lineWidth = TS * 0.12; cx.strokeStyle = col; cx.globalAlpha = 0.5 + 0.5 * k;
      rr(cx, bx + TS * 0.05, by + TS * 0.05, 3 * TS - TS * 0.1, 3 * TS - TS * 0.1, TS * 0.25); cx.stroke();
      cx.beginPath(); cx.arc((d.x + 0.5) * TS, (d.y + 0.5) * TS, TS * (0.45 + 0.12 * k), 0, 7); cx.stroke();
      cx.globalAlpha = 1;
    };
    E.emoji = (e, x, y, size) => { cx.font = `${TS * size}px ${EMO}`; cx.fillText(e, x * TS, y * TS); };
    E.blockXY = (b) => ({ x: 4 * (b % 5) + 1, y: 4 * Math.floor(b / 5) + 1 });
    function render() {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.drawImage(bg, 0, 0, W * TS, H * TS);
      for (const l of lights) {
        const r = red(l), x = l.x * TS, y = l.y * TS;
        cx.fillStyle = r ? "rgba(239,68,68,.28)" : "rgba(34,197,94,.18)"; cx.fillRect(x, y, TS, TS);
        cx.fillStyle = "#111827"; rr(cx, x + TS * 0.62, y - TS * 0.05, TS * 0.36, TS * 0.36, TS * 0.08); cx.fill();
        cx.fillStyle = r ? "#ef4444" : "#22c55e"; cx.beginPath(); cx.arc(x + TS * 0.8, y + TS * 0.13, TS * 0.12, 0, 7); cx.fill();
      }
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cfg.draw(E, cx, TS);
      for (const c of cars) drawCar(c.x, c.y, c.dir, c.c, "car");
      drawCar(car.x, car.y, car.dir, cfg.body, cfg.kind);
      if (cfg.drawTop) cfg.drawTop(E, cx, TS);
      if (bumpCd > 1) E.emoji("💥", car.x + 0.5, car.y + 0.5, 0.7);
    }

    if (Jobs.TEST) window.__city = E;   // للتجربة الآلية
    addEventListener("resize", resize);
    resize();
    const stopLoop = Jobs.loop((dt) => { update(dt); render(); });
    return E;
  };
})();
