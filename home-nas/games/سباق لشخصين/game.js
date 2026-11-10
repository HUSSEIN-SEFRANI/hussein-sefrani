// سباق لشخصين — شاشة مقسومة: اللاعب الأزرق (يمين) واللاعب البرتقالي (يسار)، أو ضد الكمبيوتر
// اللاعب الأزرق: يد التحكم الأولى أو الأسهم ← →   |   اللاعب البرتقالي: يد التحكم الثانية أو A/Q و D
// اجمع النجوم ⭐ للسرعة، وتجنّب الأقماع 🔶. أول من يصل خط النهاية يفوز.
(() => {
  "use strict";
  const save = K.store("race2", { len: 0, wins: { blue: 0, orange: 0 } });
  const LENS = [{ name: "قصير", d: 3200 }, { name: "طويل", d: 6000 }];
  const PL = [
    { id: "blue", name: "الأزرق", color: "#2563eb", dark: "#1e3a8a", emo: "🔵" },
    { id: "orange", name: "البرتقالي", color: "#f97316", dark: "#9a3412", emo: "🟠" },
  ];

  function homeScreen() {
    K.begin();
    const pads = K.pads().length;
    K.paint(`
      <div class="title"><span class="mascot emo">🏎️</span><div><h1>سباق لشخصين</h1><div class="sub">اجمع النجوم ⭐ وتجنّب الأقماع، وأول من يصل يفوز!</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#2563eb,#f97316)" ${K.act("two", () => K.show(raceScreen, false))}>
          <span class="big emo">👫</span><b>لاعبان</b><small>يدا تحكم، أو لوحة مفاتيح</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#2563eb,#64748b)" ${K.act("cpu", () => K.show(raceScreen, true))}>
          <span class="big emo">🤖</span><b>ضد الكمبيوتر</b><small>لاعب واحد</small></button>
      </div>
      <div class="mini">
        <button class="btn f" ${K.act("len", () => { save.len = (save.len + 1) % LENS.length; save.save(); K.render(); })}>🏁 المسافة: ${LENS[save.len].name}</button>
        <span class="pill">🔵 ${save.wins.blue} : ${save.wins.orange} 🟠</span>
        <span class="pill">🎮 ${pads ? `${pads} يد تحكم متصلة` : "لا توجد يد تحكم"}</span>
      </div>
      <div class="help">🔵 الأزرق: يد التحكم ١ أو الأسهم ← → · 🟠 البرتقالي: يد التحكم ٢ أو <b>A</b>/<b>Q</b> و <b>D</b> · <b>Backspace</b> أو <b>○</b> للخروج</div>`, "two");
  }

  function raceScreen(cpu) {
    K.begin();
    K.paint(`<canvas class="race"></canvas><div class="msg"></div>`);
    const cv = K.app.querySelector("canvas"), g = cv.getContext("2d"), msg = K.app.querySelector(".msg");
    const L = LENS[save.len].d;
    const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
    fit(); addEventListener("resize", fit);
    // الطريق: أقماع ونجوم في نفس الأماكن للاعبين
    const objs = [];
    for (let d = 400; d < L - 150; d += 110 + Math.random() * 120) {
      const lane = K.pick([-0.62, 0, 0.62]);
      objs.push({ d, x: lane, t: Math.random() < 0.3 ? "star" : "cone" });
      if (Math.random() < 0.25) objs.push({ d, x: K.pick([-0.62, 0, 0.62].filter((l) => l !== lane)), t: "cone" });
    }
    const bushes = K.range(0, 40).map((i) => ({ d: i * 160 + Math.random() * 100, side: i % 2 ? 1 : -1, e: K.pick(["🌳", "🌲", "🌷", "🏠", "🌻"]) }));
    const P = PL.map((p, i) => ({ ...p, x: 0, v: 0, dist: 0, boost: 0, crash: 0, stars: 0, hit: new Set(), input: 0, ai: cpu && i === 1 }));
    const keys = new Set();
    let state = "count", t0 = performance.now(), last = t0, raf = 0, winner = null;
    K.mode = {
      key(e) {
        if (e.pad) { if (e.key === "Backspace") K.back(); return true; }
        if (e.key === "Backspace") { K.back(); return true; }
        keys.add(e.key.toLowerCase()); return true;
      },
      keyup(e) { keys.delete(e.key.toLowerCase()); },
      poll(pads) {
        pads.forEach((pd, i) => {
          if (i > 1) return;
          const b = (n) => !!(pd.buttons[n] && pd.buttons[n].pressed);
          const ax = pd.axes[0] || 0;
          P[i].pad = b(14) || ax < -0.35 ? -1 : b(15) || ax > 0.35 ? 1 : 0;
          if (b(1) && !P[i].pb) K.back();
          else if (b(0) && !P[i].pa && state === "over") K.replace(raceScreen, cpu);
          P[i].pa = b(0); P[i].pb = b(1);
        });
        return true;
      },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", fit); },
    };

    function inputFor(p, i) {
      if (p.ai) return aiInput(p);
      const kb = i === 0 ? (keys.has("arrowleft") ? -1 : keys.has("arrowright") ? 1 : 0)
                         : (keys.has("a") || keys.has("q") ? -1 : keys.has("d") ? 1 : 0);
      return kb || p.pad || 0;
    }
    function aiInput(p) {
      const ahead = objs.filter((o) => o.d > p.dist && o.d < p.dist + 260 && !p.hit.has(o));
      const cone = ahead.find((o) => o.t === "cone" && Math.abs(o.x - p.x) < 0.4);
      const star = ahead.find((o) => o.t === "star");
      let target = p.x;
      if (cone) { const lanes = [-0.62, 0, 0.62].filter((l) => !ahead.some((o) => o.t === "cone" && Math.abs(o.x - l) < 0.3 && o.d < cone.d + 60)); target = lanes.sort((a, b) => Math.abs(a - p.x) - Math.abs(b - p.x))[0] ?? p.x; }
      else if (star && Math.random() < 0.9) target = star.x;
      if (Math.random() < 0.08) return 0; // ليس مثالياً
      return Math.abs(target - p.x) < 0.06 ? 0 : target > p.x ? 1 : -1;
    }

    function update(dt) {
      P.forEach((p, i) => {
        p.input = inputFor(p, i);
        const max = (p.boost > 0 ? 1.55 : 1) * (p.ai ? 0.96 : 1);
        if (p.crash > 0) { p.crash -= dt; p.v = Math.min(p.v, 0.35); }
        else p.v += (max - p.v) * Math.min(1, dt * 0.9);
        p.boost = Math.max(0, p.boost - dt);
        p.x = Math.max(-0.88, Math.min(0.88, p.x + p.input * 1.7 * dt));
        p.dist += p.v * dt * 170;
        for (const o of objs) {
          if (p.hit.has(o) || Math.abs(o.d - p.dist) > 22 || Math.abs(o.x - p.x) > 0.3) continue;
          p.hit.add(o);
          if (o.t === "star") { p.stars++; p.boost = 2; if (!p.ai || !cpu) K.sfx.ok(); }
          else { p.crash = 0.8; K.sfx.bad(); }
        }
        if (p.dist >= L && !winner) { winner = p; }
      });
      if (winner) over();
    }

    function over() {
      state = "over";
      save.wins[winner.id]++; save.save();
      K.sfx.win(); K.confetti(50, winner.id === "blue" ? "🔵⭐🏆🎉" : "🟠⭐🏆🎉");
      msg.innerHTML = `<div class="win" style="--c:${winner.color}">🏆 فاز ${winner.ai ? "الكمبيوتر 🤖" : `اللاعب ${winner.name}`}!
        <small>✕ أو Enter: سباق جديد · ○ أو Backspace: القائمة</small></div>`;
      K.mode.key = (e) => { if (e.key === "Enter" || e.key === " ") K.replace(raceScreen, cpu); else if (e.key === "Backspace") K.back(); return true; };
    }

    // ---------------------------------------------------------------- الرسم
    const EMO = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    function drawCar(x, y, w, h, color, dark, wob) {
      g.save(); g.translate(x, y); g.rotate(wob);
      g.fillStyle = "#111827";
      [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.3], [0.55, 0.3]].forEach(([a, b]) => g.fillRect(a * w - w * 0.1, b * h - h * 0.11, w * 0.2, h * 0.22));
      g.fillStyle = color; rr(-w / 2, -h / 2, w, h, w * 0.3); g.fill();
      g.fillStyle = "#bfdbfe"; rr(-w * 0.33, -h * 0.28, w * 0.66, h * 0.2, w * 0.1); g.fill();
      g.fillStyle = dark; rr(-w * 0.3, -h * 0.02, w * 0.6, h * 0.3, w * 0.1); g.fill();
      g.fillStyle = "#fde047"; g.fillRect(-w * 0.38, -h * 0.5, w * 0.16, h * 0.06); g.fillRect(w * 0.22, -h * 0.5, w * 0.16, h * 0.06);
      g.restore();
    }
    function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function drawHalf(p, x0, W, H) {
      g.save(); g.beginPath(); g.rect(x0, 0, W, H); g.clip();
      const roadW = W * 0.62, rx = x0 + (W - roadW) / 2, carY = H * 0.78, sc = (H * 0.8) / 520;
      const yOf = (d) => carY - (d - p.dist) * sc;
      g.fillStyle = "#4ade80"; g.fillRect(x0, 0, W, H);
      g.font = `${H * 0.07}px ${EMO}`; g.textAlign = "center"; g.textBaseline = "middle";
      for (const b of bushes) { const y = yOf(b.d % (L + 400)); if (y > -50 && y < H + 50) g.fillText(b.e, b.side < 0 ? x0 + (W - roadW) / 4 : x0 + W - (W - roadW) / 4, y); }
      g.fillStyle = "#475569"; g.fillRect(rx, 0, roadW, H);
      const stripe = 40, off = (p.dist * sc) % (stripe * 2);
      for (let y = -stripe * 2 + off; y < H; y += stripe * 2) {
        g.fillStyle = "#ef4444"; g.fillRect(rx - 10, y, 10, stripe); g.fillRect(rx + roadW, y, 10, stripe);
        g.fillStyle = "#fff"; g.fillRect(rx - 10, y + stripe, 10, stripe); g.fillRect(rx + roadW, y + stripe, 10, stripe);
        g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(rx + roadW / 3 - 3, y, 6, stripe); g.fillRect(rx + (2 * roadW) / 3 - 3, y, 6, stripe);
      }
      const fy = yOf(L);
      if (fy > -40 && fy < H) for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? "#111" : "#fff"; g.fillRect(rx + (i * roadW) / 16, fy + j * 14, roadW / 16, 14); }
      const lx = (x) => rx + roadW / 2 + x * (roadW / 2) * 0.95;
      for (const o of objs) {
        const y = yOf(o.d);
        if (y < -60 || y > H + 60 || p.hit.has(o)) continue;
        if (o.t === "star") { g.font = `${roadW * 0.14}px ${EMO}`; g.fillText("⭐", lx(o.x), y); }
        else { const s = roadW * 0.07; g.fillStyle = "#f97316"; g.beginPath(); g.moveTo(lx(o.x), y - s * 1.2); g.lineTo(lx(o.x) + s, y + s); g.lineTo(lx(o.x) - s, y + s); g.closePath(); g.fill(); g.fillStyle = "#fff"; g.fillRect(lx(o.x) - s * 0.55, y - s * 0.05, s * 1.1, s * 0.3); }
      }
      // الخصم إن كان قريباً
      const other = P.find((q) => q !== p), oy = yOf(other.dist);
      if (oy > -80 && oy < H + 80) { g.globalAlpha = 0.45; drawCar(lx(other.x), oy, roadW * 0.17, roadW * 0.28, other.color, other.dark, 0); g.globalAlpha = 1; }
      const wob = p.crash > 0 ? Math.sin(performance.now() / 40) * 0.25 : p.input * 0.12;
      if (p.boost > 0) { g.font = `${roadW * 0.12}px ${EMO}`; g.fillText("🔥", lx(p.x), carY + roadW * 0.2); }
      drawCar(lx(p.x), carY, roadW * 0.17, roadW * 0.28, p.color, p.dark, wob);
      // معلومات
      g.fillStyle = "rgba(255,255,255,.88)"; rr(x0 + 16, 14, W - 32, 46, 23); g.fill();
      g.fillStyle = p.color; rr(x0 + 22, 20, (W - 44) * Math.min(1, p.dist / L), 34, 17); g.fill();
      g.fillStyle = "#0f172a"; g.font = `800 ${26}px Baloo, sans-serif`; g.textAlign = "center";
      g.fillText(`${p.ai ? "🤖 الكمبيوتر" : `${p.emo} ${p.name}`}  ·  ⭐ ${p.stars}`, x0 + W / 2, 38);
      g.restore();
    }
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const W = cv.width, H = cv.height;
      if (state === "count") {
        const n = 3 - Math.floor((now - t0) / 900);
        msg.innerHTML = `<div class="count">${n > 0 ? n : "انطلق! 🏁"}</div>`;
        if (n <= 0 && now - t0 > 3400) { state = "run"; msg.innerHTML = ""; }
      } else if (state === "run") update(dt);
      g.clearRect(0, 0, W, H);
      drawHalf(P[0], W / 2, W / 2, H); // يمين: الأزرق
      drawHalf(P[1], 0, W / 2, H);     // يسار: البرتقالي
      g.fillStyle = "#fff"; g.fillRect(W / 2 - 3, 0, 6, H);
      raf = requestAnimationFrame(frame);
    }
    let lastN = 4;
    const beep = setInterval(() => { const n = 3 - Math.floor((performance.now() - t0) / 900); if (n !== lastN && n >= 0) { lastN = n; n > 0 ? K.sfx.tick() : K.sfx.ok(); } if (n < 0) clearInterval(beep); }, 50);
    raf = requestAnimationFrame(frame);
  }

  K.start(homeScreen);
})();
