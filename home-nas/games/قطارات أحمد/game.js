// قطارات أحمد — أحمد سائق القطار. ثلاثة أقسام: قُد القطار، ابنِ السكة، التوصيل + قاطراتي (تُفتح بالنجوم).
// بلا اصطدامات: إن أخطأ الطفل يتوقف القطار بلطف ويحاول مجدداً. اللغات: العربية، English، Türkçe.
(() => {
  "use strict";
  const GAME = "قطارات أحمد";
  const save = K.store("ahmad-trains", { lang: "ar", stars: 0, loco: "steam", color: "red", bbest: {}, bun: 1, dround: 0, earned: {}, trips: 0 });
  I.set(save.lang);
  const t = I.t;
  const cv = document.createElement("canvas");
  cv.id = "cv"; cv.width = 960; cv.height = 540;
  document.body.insertBefore(cv, K.app);
  const ctx = cv.getContext("2d");
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sm = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let q = Math.imul(seed ^ (seed >>> 15), 1 | seed); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; }
  const say = (s) => K.tts(String(s).replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s!?.,،']/gu, " "), I.lang, 0.9);
  const HELP = (k = "help") => `<div class="help">${t(k)}</div>`;
  const backBtn = () => `<button class="btn f" ${K.act("back", K.back)}>${t("back")}</button>`;

  function earn(key, reason, amount = 1, perDay = 1) {
    const day = new Date().toDateString(), e = save.earned[key], n = e && e.d === day ? e.n : 0;
    if (n >= perDay) return;
    save.earned[key] = { d: day, n: n + 1 }; save.save();
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, game: GAME, reason }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.added) { const el = document.getElementById("earn"); if (el) el.textContent = t("earned", d.added); } })
      .catch(() => {});
  }

  // ---------------------------------------------------------------- الأصوات
  const snd = {
    whistle(type) {
      if (type === "steam") { K.tone(587, 0.55, "triangle", 0.09); K.tone(740, 0.55, "triangle", 0.07); K.tone(587, 0.35, "triangle", 0.08, 0.62); K.tone(740, 0.35, "triangle", 0.06, 0.62); }
      else if (type === "fast") { [880, 1109, 1319].forEach((f, i) => K.tone(f, 0.3, "sine", 0.09, i * 0.14)); }
      else if (type === "electric") { K.tone(523, 0.5, "square", 0.035); K.tone(659, 0.5, "square", 0.03); }
      else { K.tone(220, 0.7, "sawtooth", 0.035); K.tone(277, 0.7, "sawtooth", 0.03); }
    },
    bell() { [1319, 1047, 1319, 1047].forEach((f, i) => K.tone(f, 0.25, "sine", 0.08, i * 0.22)); },
    click() { K.tone(300, 0.05, "square", 0.04); K.tone(450, 0.05, "square", 0.03, 0.05); },
    chug(v) { K.tone(70 + v * 0.2, 0.06, "triangle", 0.05); },
    star() { K.tone(1175, 0.08, "triangle", 0.09); K.tone(1568, 0.14, "triangle", 0.08, 0.07); },
    couple() { K.tone(160, 0.08, "square", 0.06); K.tone(240, 0.1, "square", 0.05, 0.09); },
    soft() { K.tone(330, 0.2, "sine", 0.08); K.tone(262, 0.3, "sine", 0.07, 0.15); },
  };

  // ---------------------------------------------------------------- الشاشة الأولى
  function home() {
    K.begin();
    const nb = Object.keys(save.bbest).length;
    K.paint(`<div class="hero"><canvas id="heroC" width="560" height="190"></canvas>
        <div><h1 class="logo">${t("title")}</h1><div class="sub">${t("hello")}</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#22c55e,#0ea5e9)" ${K.act("drive", () => K.show(drive))}><span class="big emo">🚂</span><b>${t("drive")}</b><small>${t("driveSub")}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#f59e0b,#ef4444)" ${K.act("build", () => K.show(buildMap))}><span class="big emo">🛤️</span><b>${t("build")}</b><small>${t("buildSub", nb, LV.length)}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)" ${K.act("deliver", () => K.show(deliver))}><span class="big emo">📦</span><b>${t("deliver")}</b><small>${t("deliverSub")}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#0ea5e9,#6366f1)" ${K.act("garage", () => K.show(garage))}><span class="big emo">🚉</span><b>${t("garage")}</b><small>${t("garageSub", save.stars)}</small></button>
      </div>
      <div class="mini">${I.list.map((l) => `<button class="btn f ${l === I.lang ? "go" : ""}" ${K.act("L" + l, () => { save.lang = l; save.save(); I.set(l); K.render(); })}>🌐 ${I.S[l].lang}</button>`).join("")}</div>
      ${HELP()}`, "drive");
    D.thumb(document.getElementById("heroC"), save.loco, save.color, 2);
  }

  // ---------------------------------------------------------------- قاطراتي
  function garage() {
    K.begin();
    const lc = D.LOCOS.map((l) => {
      const ok = save.stars >= l.cost, on = save.loco === l.id;
      return `<button class="gcard f ${ok ? "" : "no"} ${on ? "on" : ""}" ${K.act("l" + l.id, () => { if (!ok) return K.sfx.bad(); save.loco = l.id; save.save(); snd.whistle(l.id); K.render(); })}>
        <canvas data-l="${l.id}" width="300" height="130"></canvas><b>${I.loco(l.id)}</b><small>${on ? t("chosen") : ok ? "" : t("unlockAt", l.cost)}</small></button>`;
    }).join("");
    const cc = D.COLORS.map((c) => {
      const ok = save.stars >= c.cost, on = save.color === c.id;
      return `<button class="swatch f ${ok ? "" : "no"} ${on ? "on" : ""}" style="--c:${D.COL[c.id]}" ${K.act("c" + c.id, () => { if (!ok) return K.sfx.bad(); save.color = c.id; save.save(); K.sfx.pop(); K.render(); })}>${on ? "✓" : ok ? "" : `<small>🔒${c.cost}</small>`}</button>`;
    }).join("");
    K.paint(`<div class="top">${backBtn()}<h2 class="ttl">🚉 ${t("garage")}</h2><span class="pill">⭐ ${save.stars}</span></div>
      <div class="glabel">${t("locos")}</div><div class="gcards">${lc}</div>
      <div class="glabel">${t("colors")}</div><div class="swatches">${cc}</div>${HELP()}`, "l" + save.loco);
    K.app.querySelectorAll("canvas[data-l]").forEach((c) => D.thumb(c, c.dataset.l, save.color, 1));
  }

  // ================================================================ محرك السكة (للقيادة والتوصيل)
  const SPD = [0, 55, 105, 160, 215, 270], ACC = 85, BR = 170, TY = 400;
  const SEGLEN = { start: 700, easy: 1150, hill: 1600, curve: 1150, bridge: 950, tunnel: 1200, junction: 1750, signal: 1000, station: 1150, end: 1800, dstation: 1400, plain: 600 };
  const LIMIT = { curve: 2, easy: 3 };
  const NEED = { hill: 4 };

  function makeCourse(types, opt = {}) {
    let x = 0;
    const segs = types.map((ty, i) => {
      const o = typeof ty === "string" ? { type: ty } : ty;
      const s = Object.assign({ i, x0: x, len: SEGLEN[o.type] }, o);
      x += s.len;
      if (s.type === "junction") { s.xj = s.x0 + 520; s.xm = s.x0 + s.len - 100; }
      if (s.type === "signal") { s.sig = s.x0 + 640; s.state = "red"; }
      if (s.type === "station" || s.type === "dstation") { s.mark = s.x0 + s.len - 130; s.wait = Array.from({ length: 3 }, (_, k) => ({ x: s.x0 + 250 + k * 170, c: K.pick(Object.keys(D.COL)) })); s.items = []; }
      return s;
    });
    return { segs, end: x };
  }
  function segAt(W, x) { const ss = W.segs; for (let i = ss.length - 1; i >= 0; i--) if (x >= ss[i].x0) return ss[i]; return ss[0]; }
  function elev(W, x) {
    const s = segAt(W, x);
    if (s.type !== "hill") return 0;
    const u = (x - s.x0) / s.len;
    return -150 * (sm((u - 0.06) / 0.36) - sm((u - 0.58) / 0.36));
  }
  function depth(W, x, ch) {
    const s = segAt(W, x);
    if (s.type === "curve") { const w = clamp(((x - s.x0) / s.len - 0.08) / 0.84); return 95 * Math.sin(Math.PI * w) ** 2; }
    if (s.type === "junction") {
      const k = sm((x - s.xj) / 320) * (1 - sm((x - (s.xm - 320)) / 320));
      const c = ch === "up" || ch === "down" ? ch : W.choices[s.i] || W.sw;
      return k * (c === "up" ? -125 : 65);
    }
    return 0;
  }
  const yAt = (W, x, ch) => TY + elev(W, x) + depth(W, x, ch);
  const trainLen = (W) => D.LEN.loco + (W.cars.length - 1) * (D.LEN.car + 12);
  function carOffsets(W) {
    const o = [0];
    for (let i = 1; i < W.cars.length; i++) o.push(o[i - 1] + (i === 1 ? D.LEN.loco / 2 : D.LEN.car / 2) + 12 + D.LEN.car / 2);
    return o;
  }
  function newWorld(course, cars, opt = {}) {
    return Object.assign({ segs: course.segs, end: course.end, s: 300, v: 0, lvl: 0, sw: "up", choices: {}, cars, z: 1, camX: 0, night: 0, nightT: 0, t: 0, dist: 0,
      parts: [], stopAt: null, msg: null, fade: 0, AY: TY, chugD: 0, smokeT: 0, pops: [] }, opt);
  }
  function msg(W, text, speak = true) { W.msg = { text, t: 3 }; if (speak) say(text); }
  function camUpdate(W, dt, snap) {
    const zt = clamp(840 / (trainLen(W) + 420), 0.52, 1);
    W.z = snap ? zt : W.z + (zt - W.z) * Math.min(1, dt * 1.4);
    const vw = 960 / W.z, cx = W.s - 0.64 * vw + 60;
    W.camX = snap ? cx : W.camX + (cx - W.camX) * Math.min(1, dt * 4);
  }
  function physics(W, dt, target) {
    const front = W.s + 75;
    if (W.stopAt != null) {
      const cap = Math.sqrt(2 * BR * Math.max(0, W.stopAt - front));
      target = Math.min(target, cap);
      if (W.v > cap) W.v = cap;
    }
    const d = target - W.v;
    W.v += clamp(d, -BR * dt, ACC * dt);
    if (W.v < 0.5 && target < 0.5) W.v = 0;
    W.s += W.v * dt; W.dist += W.v * dt;
    W.chugD += W.v * dt;
    if (W.chugD > 70) { W.chugD = 0; snd.chug(W.v); }
    // دخان القاطرة البخارية
    W.smokeT -= dt * (0.4 + W.v / 120);
    if (W.cars[0].loco === "steam" && W.smokeT < 0) { W.smokeT = 0.25; W.parts.push({ k: "smoke", x: W.s + 47, y: yAt(W, W.s) - 108, vx: -W.v * 0.3 - 10, vy: -30, r: 8, a: 0.7 }); }
    for (const p of W.parts) {
      if (p.k === "smoke") { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 16; p.a -= dt * 0.35; }
      else if (p.k === "walk") { p.u = Math.min(1, p.u + dt / p.dur); }
    }
    W.parts = W.parts.filter((p) => (p.k === "smoke" ? p.a > 0 : p.u < 1));
    W.pops = W.pops.filter((p) => (p.t -= dt) > 0);
    for (const c of W.cars) if (c.enter > 0) c.enter = Math.max(0, c.enter - dt * 0.8);
    W.night += (W.nightT - W.night) * Math.min(1, dt * 0.6);
    if (W.msg && (W.msg.t -= dt) <= 0) W.msg = null;
  }

  // ---------------------------------------------------------------- الرسم
  const LAMPS = { steam: [76, -60], electric: [74, -34], fast: [84, -30], freight: [72, -40] };
  function skyCol(n) {
    const day = ["#5fa8f5", "#dbeafe"], sun = ["#f472b6", "#fde68a"], ngt = ["#0b1335", "#1e3a8a"];
    return n < 0.5 ? [D.mix(day[0], sun[0], n * 2), D.mix(day[1], sun[1], n * 2)] : [D.mix(sun[0], ngt[0], (n - 0.5) * 2), D.mix(sun[1], ngt[1], (n - 0.5) * 2)];
  }
  const STARS = Array.from({ length: 60 }, (_, i) => [(i * 157) % 960, (i * 71) % 260, 1 + (i % 3) * 0.6]);
  function hillsLayer(c, W, k, base, amp, period, col, n) {
    const off = (W.camX * k) % period;
    c.fillStyle = col; c.beginPath(); c.moveTo(0, 540);
    for (let x = -period; x <= 960 + period; x += 20) {
      const wx = x + off, ph = (wx / period) * Math.PI * 2;
      c.lineTo(x, base - amp * (0.55 + 0.3 * Math.sin(ph) + 0.15 * Math.sin(ph * 2.3 + 1)));
    }
    c.lineTo(960, 540); c.fill();
  }
  function trackLine(c, W, xa, xb, ch, dark) {
    const pts = [];
    for (let x = xa; x <= xb; x += 14) pts.push([x, yAt(W, x, ch)]);
    if (pts.length < 2) return;
    c.lineJoin = "round"; c.lineCap = "round";
    c.strokeStyle = D.mix("#a8a29e", "#292524", dark); c.lineWidth = 16; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y + 9) : c.moveTo(x, y + 9))); c.stroke();
    c.fillStyle = D.mix("#7c2d12", "#1c1917", dark);
    for (let x = Math.ceil(xa / 26) * 26; x <= xb; x += 26) { const y = yAt(W, x, ch); c.fillRect(x - 4, y + 1, 8, 11); }
    c.strokeStyle = D.mix("#475569", "#0f172a", dark); c.lineWidth = 5; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y + 1) : c.moveTo(x, y + 1))); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1.5; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y - 1) : c.moveTo(x, y - 1))); c.stroke();
  }
  function post(c, x, y, h) { c.fillStyle = "#64748b"; c.fillRect(x - 3, y - h, 6, h); }
  function sign(c, x, y, emoji, bg, shape) {
    post(c, x, y, 120);
    c.fillStyle = bg; c.strokeStyle = "#fff"; c.lineWidth = 5; c.beginPath();
    if (shape === "diamond") { c.moveTo(x, y - 180); c.lineTo(x + 34, y - 146); c.lineTo(x, y - 112); c.lineTo(x - 34, y - 146); c.closePath(); }
    else c.arc(x, y - 146, 32, 0, 7);
    c.fill(); c.stroke();
    c.font = "34px 'Noto Color Emoji',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(emoji, x, y - 144);
  }
  function house(c, x, y, col, lights, s = 1) {
    c.fillStyle = col; c.fillRect(x - 34 * s, y - 56 * s, 68 * s, 56 * s);
    c.fillStyle = "#b91c1c"; c.beginPath(); c.moveTo(x - 42 * s, y - 54 * s); c.lineTo(x, y - 88 * s); c.lineTo(x + 42 * s, y - 54 * s); c.fill();
    c.fillStyle = "#92400e"; c.fillRect(x - 8 * s, y - 28 * s, 16 * s, 28 * s);
    c.fillStyle = "#bfdbfe"; c.fillRect(x - 26 * s, y - 44 * s, 13 * s, 13 * s); c.fillRect(x + 13 * s, y - 44 * s, 13 * s, 13 * s);
    lights.push({ x: x - 19 * s, y: y - 38 * s, r: 20 }, { x: x + 19 * s, y: y - 38 * s, r: 20 });
  }
  function tree(c, x, y, s = 1, n = 0) {
    c.fillStyle = "#92400e"; c.fillRect(x - 5 * s, y - 30 * s, 10 * s, 30 * s);
    c.fillStyle = D.mix("#16a34a", "#052e16", n); c.beginPath(); c.arc(x, y - 44 * s, 24 * s, 0, 7); c.fill();
    c.fillStyle = D.mix("#22c55e", "#14532d", n); c.beginPath(); c.arc(x - 8 * s, y - 52 * s, 11 * s, 0, 7); c.fill();
  }
  function mountainPath(c, s) {
    const a = s.x0 + 40, b = s.x0 + s.len - 40, mid = (a + b) / 2;
    c.beginPath(); c.moveTo(a, TY + 14);
    c.bezierCurveTo(a + 120, TY - 120, mid - 260, TY - 300, mid - 60, TY - 320);
    c.lineTo(mid + 40, TY - 290); c.lineTo(mid + 110, TY - 330);
    c.bezierCurveTo(b - 200, TY - 260, b - 120, TY - 100, b, TY + 14); c.closePath();
  }

  function render(W) {
    const c = ctx, n = W.night, z = W.z, AY = W.AY;
    const [s1, s2] = skyCol(n);
    let g = c.createLinearGradient(0, 0, 0, 540); g.addColorStop(0, s1); g.addColorStop(0.6, s2); c.fillStyle = g; c.fillRect(0, 0, 960, 540);
    if (n > 0.5) { c.fillStyle = `rgba(255,255,255,${(n - 0.5) * 1.8})`; STARS.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }); }
    const yH = AY - 140 * z;
    if (n < 0.75) { c.fillStyle = D.mix("#fde047", "#fb923c", clamp(n * 2)); c.beginPath(); c.arc(820, 70 + n * 260, 40, 0, 7); c.fill(); }
    if (n > 0.4) { c.fillStyle = `rgba(254,249,195,${clamp((n - 0.4) * 2)})`; c.beginPath(); c.arc(150, 80, 30, 0, 7); c.fill(); c.fillStyle = s1; c.beginPath(); c.arc(164, 72, 26, 0, 7); c.fill(); }
    hillsLayer(c, W, 0.08, yH + 4, 150 * z + 40, 520, D.mix("#93c5fd", "#1e293b", n), n);
    hillsLayer(c, W, 0.25, yH + 6, 70 * z + 20, 380, D.mix("#4ade80", "#14532d", n), n);

    c.save(); c.translate(0, AY); c.scale(z, z); c.translate(-W.camX, -TY);
    const xa = W.camX - 60, xb = W.camX + 960 / z + 60;
    const lights = [];
    c.fillStyle = D.mix("#86efac", "#14532d", n); c.fillRect(xa, 258, xb - xa, 1400);
    c.fillStyle = D.mix("#4ade80", "#166534", n); c.fillRect(xa, 258, xb - xa, 8);
    const vis = W.segs.filter((s) => s.x0 < xb + 300 && s.x0 + s.len > xa - 300);
    const inTun = (() => { const s = segAt(W, W.s); return s.type === "tunnel" && W.s > s.x0 + 120 && W.s < s.x0 + s.len - 120 ? 1 : 0; })();

    // خلفية كل مقطع
    for (const s of vis) {
      const e = s.x0 + s.len;
      if (s.type === "easy" || s.type === "start" || s.type === "end" || s.type === "plain") {
        for (let k = 0; k < s.len / 260; k++) {
          const x = s.x0 + 120 + k * 260 + ((s.i * 53 + k * 97) % 70);
          if ((s.i + k) % 3 === 0 && s.type !== "plain") house(c, x, TY - 40, ["#fde68a", "#fbcfe8", "#bae6fd", "#ddd6fe"][(s.i + k) % 4], lights, 0.9);
          else tree(c, x, TY - 34, 1, n);
          c.font = "22px 'Noto Color Emoji',sans-serif"; c.textAlign = "center"; c.fillText(["🌼", "🌷", "🌻"][(k + s.i) % 3], x + 60, TY + 70);
        }
        if (s.type === "easy") sign(c, s.x0 + 30, TY - 30, "🐢", "#16a34a");
      } else if (s.type === "hill") {
        c.fillStyle = D.mix("#65a30d", "#1a2e05", n); c.beginPath(); c.moveTo(s.x0, TY + 20);
        for (let x = s.x0; x <= e; x += 20) c.lineTo(x, yAt(W, x) + 12);
        c.lineTo(e, TY + 20); c.fill();
        c.fillStyle = D.mix("#4d7c0f", "#1a2e05", n); c.beginPath(); c.moveTo(s.x0, 1400);
        for (let x = s.x0; x <= e; x += 20) c.lineTo(x, yAt(W, x) + 24); c.lineTo(e, 1400); c.fill();
        for (let k = 1; k < 6; k++) { const x = s.x0 + k * s.len / 6; tree(c, x + 30, yAt(W, x + 30) - 8, 0.8, n); }
        sign(c, s.x0 + 30, TY - 30, "⛰️", "#ea580c");
      } else if (s.type === "tunnel") {
        c.fillStyle = D.mix("#78716c", "#1c1917", n); mountainPath(c, s); c.fill();
        c.fillStyle = "#0f0f14"; c.fillRect(s.x0 + 150, TY - 150, s.len - 300, 166);
        for (let x = s.x0 + 220; x < e - 180; x += 160) { c.fillStyle = "#fbbf24"; c.beginPath(); c.arc(x, TY - 130, 5, 0, 7); c.fill(); lights.push({ x, y: TY - 130, r: 40, a: 1 }); }
      } else if (s.type === "bridge") {
        const rx = s.x0 + s.len / 2;
        c.fillStyle = D.mix("#38bdf8", "#1e3a8a", n); c.beginPath(); c.moveTo(rx - 70, 258); c.lineTo(rx + 70, 258); c.lineTo(rx + 330, 1400); c.lineTo(rx - 330, 1400); c.fill();
        c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 3;
        for (let k = 0; k < 6; k++) { const yy = 290 + k * 50, ww = 60 + k * 30, ph = (W.t * 30 + k * 40) % 60; c.beginPath(); c.moveTo(rx - ww + ph, yy); c.lineTo(rx - ww + ph + 30, yy); c.stroke(); }
        sign(c, s.x0 + 30, TY - 30, "🌉", "#0284c7");
      } else if (s.type === "curve") {
        sign(c, s.x0 + 20, TY - 30, "↪️", "#facc15", "diamond");
        for (let k = 0; k < 5; k++) { const x = s.x0 + 260 + k * 150, y = yAt(W, x); c.fillStyle = "#f8fafc"; c.fillRect(x - 3, y - 60, 6, 44); c.fillStyle = "#ef4444"; c.fillRect(x - 3, y - 60, 6, 12); }
        tree(c, s.x0 + s.len / 2, TY - 40, 1.1, n);
      } else if (s.type === "signal") {
        tree(c, s.x0 + 200, TY - 36, 1, n); tree(c, s.x0 + 820, TY - 36, 0.9, n);
        const x = s.sig, y = TY - 14;
        post(c, x, y, 150); c.fillStyle = "#1f2937"; c.beginPath(); c.roundRect(x - 20, y - 220, 40, 80, 10); c.fill();
        const red = s.state === "red";
        c.fillStyle = red ? "#ef4444" : "#3f1d1d"; c.beginPath(); c.arc(x, y - 200, 13, 0, 7); c.fill();
        c.fillStyle = red ? "#14301f" : "#22c55e"; c.beginPath(); c.arc(x, y - 160, 13, 0, 7); c.fill();
        lights.push({ x, y: red ? y - 200 : y - 160, r: 50, a: 1, col: red ? "255,80,80" : "80,255,120" });
        c.strokeStyle = "#fff"; c.lineWidth = 4; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(x - 60, TY + 14); c.lineTo(x - 60, TY - 6); c.stroke(); c.setLineDash([]);
      } else if (s.type === "junction") {
        const bx = s.xj - 380;
        post(c, bx, TY - 14, 140);
        c.fillStyle = "#1d4ed8"; c.strokeStyle = "#fff"; c.lineWidth = 5; c.beginPath(); c.roundRect(bx - 50, TY - 250, 100, 100, 14); c.fill(); c.stroke();
        c.fillStyle = "#fff"; c.save(); c.translate(bx, TY - 200); if (s.dir === "down") c.scale(1, -1);
        c.beginPath(); c.moveTo(0, -38); c.lineTo(30, -6); c.lineTo(12, -6); c.lineTo(12, 36); c.lineTo(-12, 36); c.lineTo(-12, -6); c.lineTo(-30, -6); c.closePath(); c.fill(); c.restore();
        lights.push({ x: bx, y: TY - 200, r: 70, a: 0.6, col: "120,170,255" });
        // الحاجز على الطريق المغلق
        const wrong = s.dir === "up" ? "down" : "up", gx = s.xj + 700, gy = yAt(W, gx, wrong);
        for (let k = 0; k < 2; k++) { post(c, gx + 30 - k * 60, gy - 2, 60); }
        c.save(); c.translate(gx, gy - 52);
        for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? "#fff" : "#ef4444"; c.fillRect(-60 + k * 20, -10, 20, 20); }
        c.restore();
        lights.push({ x: gx, y: gy - 52, r: 40, a: 0.6, col: "255,90,90" });
        tree(c, s.xj + 300, TY - 160, 0.8, n); tree(c, s.xj + 900, TY - 165, 0.8, n);
      } else if (s.type === "station" || s.type === "dstation") {
        const pc = D.COL[s.color] || "#ef4444", p0 = s.x0 + 120, p1 = s.x0 + s.len - 40;
        c.fillStyle = D.mix("#e7e5e4", "#57534e", n); c.fillRect(p0, TY - 34, p1 - p0, 26);
        c.fillStyle = D.mix("#facc15", "#713f12", n); c.fillRect(p0, TY - 36, p1 - p0, 5);
        const bx = s.x0 + s.len * 0.42;
        c.fillStyle = D.mix("#fef3c7", "#44403c", n); c.fillRect(bx - 130, TY - 170, 260, 136);
        c.fillStyle = pc; c.beginPath(); c.moveTo(bx - 160, TY - 166); c.lineTo(bx, TY - 240); c.lineTo(bx + 160, TY - 166); c.fill();
        c.fillStyle = pc; c.fillRect(bx - 70, TY - 158, 140, 34);
        c.font = "26px 'Noto Color Emoji',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("🚉", bx, TY - 140);
        c.fillStyle = "#92400e"; c.fillRect(bx - 20, TY - 100, 40, 66);
        [-90, 60].forEach((dx) => { c.fillStyle = "#bfdbfe"; c.fillRect(bx + dx, TY - 110, 30, 30); lights.push({ x: bx + dx + 15, y: TY - 95, r: 30 }); });
        for (let x = p0 + 60; x < p1; x += 300) { post(c, x, TY - 34, 120); c.fillStyle = "#fde68a"; c.beginPath(); c.arc(x, TY - 158, 9, 0, 7); c.fill(); lights.push({ x, y: TY - 158, r: 70, a: 0.9 }); }
        // الركاب المنتظرون والحمولات المسلّمة
        if (!s.done && s.type === "station") s.wait.forEach((p, k) => D.person(c, p.x, TY - 34, p.c, 1.2 + (k % 2) * 0.1));
        s.items.forEach((it, k) => { const x = bx + 160 + (k % 5) * 40, y = TY - 34; it.k === "b" ? D.box(c, x, y, it.c, 1) : D.person(c, x, y, it.c, 1.1); });
        // علامة التوقف
        const m = s.mark + 30;
        post(c, m, TY - 10, 110);
        c.fillStyle = "#dc2626"; c.strokeStyle = "#fff"; c.lineWidth = 4; c.beginPath();
        for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k * Math.PI) / 4; c.lineTo(m + Math.cos(a) * 30, TY - 140 + Math.sin(a) * 30); }
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#fff"; c.fillRect(m - 16, TY - 144, 32, 8);
      }
    }

    // السكك (البعيدة أولاً)
    const dk = n * 0.6;
    trackLine(c, W, xa, xb, "up", dk);
    trackLine(c, W, xa, xb, "down", dk);
    // ممر الجسر
    for (const s of vis) if (s.type === "bridge") {
      const a = s.x0 + 140, b = s.x0 + s.len - 140;
      c.fillStyle = D.mix("#b45309", "#451a03", n); c.fillRect(a, TY + 14, b - a, 16);
      c.strokeStyle = D.mix("#78350f", "#1c0a02", n); c.lineWidth = 10;
      for (let x = a + 60; x < b; x += 170) { c.beginPath(); c.moveTo(x, TY + 30); c.lineTo(x, 640); c.stroke(); }
      c.lineWidth = 6; c.beginPath(); for (let x = a; x <= b; x += 85) { c.lineTo(x, TY - 40 + ((x - a) / 85) % 2 * 40); } c.stroke();
      c.beginPath(); c.moveTo(a, TY - 40); c.lineTo(b, TY - 40); c.stroke();
    }
    // التحويلة: سهم صغير يبيّن الاتجاه المختار
    for (const s of vis) if (s.type === "junction" && W.choices[s.i] == null && W.showSwitch) {
      const x = s.xj + 40, y = TY + 40, up = W.sw === "up";
      c.fillStyle = "#facc15"; c.strokeStyle = "#1f2937"; c.lineWidth = 3; c.beginPath(); c.arc(x, y + 20, 26, 0, 7); c.fill(); c.stroke();
      c.fillStyle = "#1f2937"; c.save(); c.translate(x, y + 20); if (!up) c.scale(1, -1);
      c.beginPath(); c.moveTo(0, -18); c.lineTo(14, 0); c.lineTo(5, 0); c.lineTo(5, 16); c.lineTo(-5, 16); c.lineTo(-5, 0); c.lineTo(-14, 0); c.closePath(); c.fill(); c.restore();
    }

    // القطار
    const off = carOffsets(W);
    for (let i = W.cars.length - 1; i >= 0; i--) {
      const car = W.cars[i], x = W.s - off[i] - (car.enter || 0) * 260;
      if (x < xa - 200 || x > xb + 200) continue;
      const y = yAt(W, x), a = Math.atan2(yAt(W, x + 40) - yAt(W, x - 40), 80);
      c.save(); c.translate(x, y); c.rotate(a);
      if (car.enter) c.globalAlpha = 1 - car.enter;
      if (i === 0) D.loco(c, car.loco, car.col, W.dist, null);
      else D.car(c, car.col, W.dist, null, car.load, car.num);
      c.restore();
      // أماكن الإضاءة (نوافذ)
      if (n > 0.3 || inTun) { const lx = i === 0 ? -20 : 0; lights.push({ x: x + lx * Math.cos(a), y: y - 60, r: 55, a: 0.7 }); }
    }
    for (const p of W.parts) {
      if (p.k === "smoke") { c.fillStyle = `rgba(241,245,249,${clamp(p.a)})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
      else if (p.k === "walk") { const u = sm(p.u), x = p.x0 + (p.x1 - p.x0) * u, y = TY - 34 + (p.y1 - (TY - 34)) * u - Math.sin(u * Math.PI) * 30; p.b ? D.box(c, x, y, p.c, 1) : D.person(c, x, y, p.c, 1.1); }
    }
    // واجهة الجبل فوق النفق
    for (const s of vis) if (s.type === "tunnel") {
      const inside = segAt(W, W.s) === s && W.s > s.x0 + 60 && W.s - trainLen(W) < s.x0 + s.len - 60;
      c.globalAlpha = inside ? 0.28 : 1;
      c.fillStyle = D.mix("#a8a29e", "#292524", n); mountainPath(c, s); c.fill();
      c.globalAlpha = 1;
      [s.x0 + 150, s.x0 + s.len - 150].forEach((px) => {
        c.fillStyle = "#57534e"; c.beginPath(); c.arc(px, TY - 70, 92, Math.PI, 0); c.lineTo(px + 92, TY + 14); c.lineTo(px + 66, TY + 14); c.lineTo(px + 66, TY - 70); c.arc(px, TY - 70, 66, 0, Math.PI, true); c.lineTo(px - 66, TY + 14); c.lineTo(px - 92, TY + 14); c.closePath(); c.fill();
      });
    }
    for (const p of W.pops) { c.font = "bold 44px sans-serif"; c.textAlign = "center"; c.fillStyle = "#facc15"; c.strokeStyle = "#7c2d12"; c.lineWidth = 6; const y = p.y - (1.5 - p.t) * 60; c.strokeText(p.txt, p.x, y); c.fillText(p.txt, p.x, y); }
    c.restore();

    // الليل والنفق
    const dark = clamp(n * 0.55 + inTun * 0.5, 0, 0.8);
    if (dark > 0.01) {
      c.fillStyle = `rgba(6,10,30,${dark})`; c.fillRect(0, 0, 960, 540);
      c.save(); c.translate(0, AY); c.scale(z, z); c.translate(-W.camX, -TY);
      c.globalCompositeOperation = "lighter";
      for (const L of lights) {
        const a = (L.a ?? 0.8) * clamp(dark * 1.6);
        const gr = c.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
        gr.addColorStop(0, `rgba(${L.col || "255,210,120"},${a})`); gr.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = gr; c.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      }
      // مصباح القاطرة الأمامي
      const lp = LAMPS[W.cars[0].loco], lx = W.s + lp[0], ly = yAt(W, W.s) + lp[1];
      const gr = c.createLinearGradient(lx, 0, lx + 420, 0);
      gr.addColorStop(0, `rgba(255,240,180,${0.55 * clamp(dark * 1.6)})`); gr.addColorStop(1, "rgba(255,240,180,0)");
      c.fillStyle = gr; c.beginPath(); c.moveTo(lx, ly - 6); c.lineTo(lx + 420, ly - 90); c.lineTo(lx + 420, ly + 70); c.lineTo(lx, ly + 6); c.fill();
      c.restore();
      c.globalCompositeOperation = "source-over";
    }
    if (W.fade > 0) { c.fillStyle = `rgba(255,255,255,${W.fade})`; c.fillRect(0, 0, 960, 540); }
    if (W.msg) {
      c.font = "bold 34px Baloo, 'Noto Sans Arabic', Tahoma, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.direction = I.lang === "ar" ? "rtl" : "ltr";
      const w = c.measureText(W.msg.text).width + 60, a = clamp(W.msg.t * 3);
      c.globalAlpha = a; c.fillStyle = "rgba(255,255,255,.94)"; c.beginPath(); c.roundRect(480 - w / 2, 70, w, 62, 31); c.fill();
      c.fillStyle = "#1e3a8a"; c.fillText(W.msg.text, 480, 102); c.globalAlpha = 1; c.direction = "inherit";
    }
  }

  // عدّاد السرعة: 5 درجات، والمنطقة المطلوبة باللون الأخضر
  function gauge(W, want) {
    const c = ctx, x0 = 24, y0 = 470;
    c.save(); c.translate(14, 520); c.scale(0.72, 0.72); c.translate(-14, -520);
    c.fillStyle = "rgba(255,255,255,.92)"; c.beginPath(); c.roundRect(x0 - 10, y0 - 120, 196, 136, 18); c.fill();
    for (let k = 1; k <= 5; k++) {
      const h = 18 + k * 18, x = x0 + (k - 1) * 36;
      const okz = want && k >= want[0] && k <= want[1];
      c.fillStyle = k <= W.lvl ? (want && !okz ? "#f97316" : "#22c55e") : "#e2e8f0";
      c.beginPath(); c.roundRect(x, y0 - h, 28, h, 6); c.fill();
      if (okz) { c.strokeStyle = "#16a34a"; c.lineWidth = 3; c.stroke(); }
    }
    c.font = "26px 'Noto Color Emoji',sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("🐢", x0, y0 - 104); c.textAlign = "right"; c.fillText("🐇", x0 + 176, y0 - 104);
    c.restore();
  }

  // ---------------------------------------------------------------- قُد القطار
  function driveCourse(seed) {
    const r = rng(seed), mix = (a) => a.map((x) => [r(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
    const dir = () => ({ type: "junction", dir: r() < 0.5 ? "up" : "down" });
    const groups = [["easy", "hill"], ["curve", "signal"], [dir(), "bridge"], ["tunnel", "curve", dir()], ["hill", "easy", "signal"]];
    const cols = mix(["red", "blue", "green", "yellow", "orange", "purple"]);
    const list = ["start"];
    groups.forEach((gp, i) => { list.push(...mix(gp)); list.push({ type: "station", color: cols[i] }); });
    list.push("end");
    return makeCourse(list);
  }

  function drive() {
    const W = newWorld(driveCourse(save.trips * 7 + 13), [{ loco: save.loco, col: save.color }, { col: D.WAGON[0] }], { showSwitch: true });
    const NST = W.segs.filter((s) => s.type === "station").length;
    const st = { stars: 0, arrived: 0, state: "run", dwell: 0, wrongT: 0, over: 0, hintT: 0, paused: false, done: false };
    let raf = 0, last = 0;
    document.body.classList.add("playing");
    camUpdate(W, 0, true);

    const B = (k, emo, label, fn, cls = "") => `<button class="cb f ${cls}" ${K.act(k, fn)}><span class="emo">${emo}</span><small>${label}</small></button>`;
    K.paint(`<div class="hud">
        <div class="htop"><button class="btn f" ${K.act("pz", () => setPause(true))}>⏸️</button>
          <span class="pill" id="hS">⭐ 0</span><span class="pill" id="hC">🚃 1</span><span class="pill" id="hT">🚉 0 / ${NST}</span></div>
        <div class="hbot">
          ${B("slow", "🐢", t("slower"), () => setLvl(W.lvl - 1))}${B("stop", "✋", t("stop"), () => setLvl(0))}${B("fast", "🐇", t("faster"), () => setLvl(W.lvl + 1), "go")}
          ${B("up", "⬆️", t("up"), () => setSw("up"))}${B("down", "⬇️", t("down"), () => setSw("down"))}
          ${B("wh", "📯", t("whistle"), whistle)}${B("dn", "🌙", t("daynight"), () => { W.nightT = W.nightT > 0.5 ? 0 : 1; })}
        </div></div>
      <div id="pause" class="pause"><div class="pcard"><h1>${t("pause")}</h1><div class="nav">
        <button class="btn f go" ${K.act("resume", () => setPause(false))}>${t("resume")}</button>
        <button class="btn f" ${K.act("restart", () => K.replace(drive))}>${t("restart")}</button>
        <button class="btn f" ${K.act("menu", K.home)}>${t("menu")}</button></div></div></div>`, "fast");
    K.later(() => msg(W, t("start")), 600);

    function setLvl(l) {
      if (st.paused) return;
      const nl = clamp(l, 0, 5);
      if (st.state !== "run" && nl > 0) return;
      if (nl !== W.lvl) K.tone(400 + nl * 80, 0.05, "sine", 0.06);
      W.lvl = nl;
    }
    function setSw(d) { if (W.sw !== d) { W.sw = d; snd.click(); } }
    function whistle() { snd.whistle(W.cars[0].loco); }
    function setPause(on) {
      st.paused = on; last = 0;
      document.getElementById("pause").classList.toggle("on", on);
      K.app.querySelector(".hud").style.visibility = on ? "hidden" : "";
      if (on) K.focus(K.app.querySelector('[data-k="resume"]'));
    }
    const pad = { prev: [] };
    K.mode = {
      key(e) {
        if (st.paused) { if (e.key === "Backspace") { setPause(false); return true; } return false; }
        if (e.key === "Backspace") { setPause(true); return true; }
        if (e.repeat && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return true;
        if (e.key === "ArrowRight") setLvl(W.lvl + 1);
        else if (e.key === "ArrowLeft") setLvl(W.lvl - 1);
        else if (e.key === "ArrowUp") setSw("up");
        else if (e.key === "ArrowDown") setSw("down");
        else if (e.key === "Enter" || e.key === " ") whistle();
        else if (e.key === "s" || e.key === "S") setLvl(0);
        else if (e.key === "n" || e.key === "N") W.nightT = W.nightT > 0.5 ? 0 : 1;
        else return false;
        return true;
      },
      poll(pads) {
        if (!pads.length) return false;
        const g = pads[0], b = (i) => !!(g.buttons[i] && g.buttons[i].pressed), was = (i) => b(i) && !pad.prev[i];
        if (st.paused) { const held = pad.prev[1] && b(1); pad.prev = g.buttons.map((x) => x.pressed); return held; }
        if (was(1) || was(9)) setPause(true);
        if (was(15) || was(7) || was(5)) setLvl(W.lvl + 1);
        if (was(14) || was(6) || was(4)) setLvl(W.lvl - 1);
        if (was(12)) setSw("up");
        if (was(13)) setSw("down");
        if (was(0)) whistle();
        if (was(2)) setLvl(0);
        if (was(3)) W.nightT = W.nightT > 0.5 ? 0 : 1;
        const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        if (ax > 0.6 && !pad.ax) setLvl(W.lvl + 1);
        if (ax < -0.6 && !pad.ax) setLvl(W.lvl - 1);
        pad.ax = Math.abs(ax) > 0.6;
        if (ay < -0.6) setSw("up"); if (ay > 0.6) setSw("down");
        pad.prev = g.buttons.map((x) => x.pressed);
        return true;
      },
      stop() { cancelAnimationFrame(raf); document.body.classList.remove("playing"); },
    };

    function award(s, txt) {
      st.stars++; snd.star();
      W.pops.push({ txt: "+⭐", x: W.s + 40, y: yAt(W, W.s) - 150, t: 1.5 });
      if (txt) msg(W, txt);
    }
    function hud() {
      const a = document.getElementById("hS"); if (!a) return;
      a.textContent = "⭐ " + st.stars;
      document.getElementById("hC").textContent = "🚃 " + (W.cars.length - 1);
      document.getElementById("hT").textContent = `🚉 ${st.arrived} / ${NST}`;
    }

    function step(dt) {
      W.t += dt;
      const front = W.s + 75, seg = segAt(W, W.s);
      let target = SPD[W.lvl], want = null;
      // التنبيه عند الاقتراب من كل مقطع
      for (const s of W.segs) {
        if (!s.told && st.state === "run" && front > s.x0 - 260 && front < s.x0 + s.len) {
          s.told = true;
          const m = { hill: t("hill"), curve: t("curve"), easy: t("easy"), tunnel: t("tunnel"), bridge: t("bridge"), signal: t("red"), station: t("station"),
            junction: s.dir === "up" ? t("arrowUp") : t("arrowDown") }[s.type];
          if (m) msg(W, m);
        }
      }
      const zs = segAt(W, front);
      // المنعطف والطريق الهادئ: خفّف السرعة
      if (LIMIT[zs.type] && front > zs.x0 + 60 && front < zs.x0 + zs.len - 80) {
        want = [1, LIMIT[zs.type]];
        if (W.lvl > LIMIT[zs.type]) { st.over += dt; if (st.over > 1.1) { W.lvl = LIMIT[zs.type]; zs.miss = true; st.over = 0; msg(W, t("tooFast")); snd.soft(); } }
        else st.over = 0;
      }
      // الجبل: زِد السرعة
      const sl = (elev(W, W.s - 20) - elev(W, W.s + 20)) / 40;
      if (zs.type === "hill" && front < zs.x0 + zs.len * 0.5) want = [4, 5];
      if (sl > 0.1) {
        if (W.lvl < NEED.hill) { target = Math.min(target, 26); if (W.lvl > 0 && (st.hintT -= dt) < 0) { st.hintT = 4; msg(W, t("hill")); seg.miss = true; } }
        else target *= 0.82;
      } else if (sl < -0.1) target *= 1.12;
      // الإشارة الحمراء
      for (const s of W.segs) if (s.type === "signal" && s.state === "red") {
        const stopX = s.sig - 60, dist = stopX - front;
        if (dist > -5 && dist < 700) {
          want = dist > 320 ? [1, 2] : [0, 0];
          if (dist < (W.v * W.v) / (2 * BR) + 25) { if (W.stopAt == null) { W.stopAt = stopX; if (W.lvl > 0) { s.miss = true; } } }
          if (W.v < 1 && dist < 700) { s.waitT = (s.waitT || 0) + dt; if (s.waitT > 1.4) { s.state = "green"; W.stopAt = null; msg(W, t("green")); K.tone(880, 0.15, "sine", 0.08); K.tone(1175, 0.2, "sine", 0.08, 0.12); } }
        }
      }
      // المفترق: غيّر المسار مثل السهم
      for (const s of W.segs) if (s.type === "junction") {
        if (W.choices[s.i] == null && front >= s.xj) { W.choices[s.i] = W.sw; snd.click(); }
        if (W.choices[s.i] != null && W.choices[s.i] !== s.dir && !s.blocked) {
          const gx = s.xj + 700 - 70;
          W.stopAt = gx;
          if (W.v < 1 && front > gx - 15) { s.blocked = true; s.miss = true; msg(W, t("closed")); snd.soft(); K.later(() => resetTo(s), 2600); }
        }
        if (W.choices[s.i] === s.dir && !s.ok && front > s.xj + 420) { s.ok = true; if (!s.miss) award(s, t("well")); }
      }
      // المحطة
      for (const s of W.segs) if (s.type === "station" && !s.done) {
        if (front > s.x0 - 100 && front < s.x0 + s.len + 200) want = [0, 3];
        if (front > s.mark + 6 && W.stopAt == null) { W.stopAt = Math.max(s.mark + 80, front + (W.v * W.v) / (2 * BR) + 4); s.miss = true; }
        if (W.v < 0.5 && front > s.mark - 280 && front < s.mark + 300 && (W.lvl === 0 || W.stopAt != null)) arrive(s);
        else if (W.v < 0.5 && W.lvl === 0 && front > s.x0 && front < s.mark - 280 && !s.hinted) { s.hinted = true; msg(W, t("stopHere")); }
      }
      // تقييم المقاطع المنتهية
      for (const s of W.segs) if (!s.scored && (LIMIT[s.type] || s.type === "hill" || s.type === "signal") && W.s - 75 > s.x0 + s.len) {
        s.scored = true; if (!s.miss) award(s, s.type === "hill" ? t("hillOk") : t("well"));
      }
      if (st.state === "dwell") { target = 0; st.dwell -= dt; if (st.dwell <= 0) { st.state = "run"; msg(W, t("start")); } }
      if (!st.done && front > W.end - 1200) finish();
      physics(W, dt, target);
      camUpdate(W, dt);
      W.want = want;
    }
    function arrive(s) {
      s.done = true; W.stopAt = null; W.lvl = 0; st.state = "dwell"; st.dwell = 4.2; st.arrived++;
      snd.bell();
      // الركاب يصعدون
      const off = carOffsets(W);
      s.wait.forEach((p, k) => W.parts.push({ k: "walk", x0: p.x, x1: W.s - off[1 + (k % (W.cars.length - 1))], y1: TY - 30, c: p.c, u: 0, dur: 1.2 + k * 0.3 }));
      award(s);
      K.later(() => {
        W.cars.push({ col: D.WAGON[(W.cars.length - 1) % D.WAGON.length], enter: 1 });
        snd.couple();
        msg(W, t("longer", W.cars.length - 1));
      }, 1300);
      if (st.arrived === 2) W.nightT = 0.5;
      if (st.arrived === 3) W.nightT = 1;
      hud();
    }
    function resetTo(s) {
      W.fade = 0.01;
      const go = () => {
        if (W.fade < 1 && !s.reset) { W.fade = Math.min(1, W.fade + 0.08); if (W.fade >= 1) { s.reset = true; W.s = s.xj - 640; W.v = 0; W.lvl = 0; W.stopAt = null; delete W.choices[s.i]; s.blocked = false; camUpdate(W, 0, true); } return K.later(go, 30); }
        W.fade = Math.max(0, W.fade - 0.08); if (W.fade > 0) K.later(go, 30); else { s.reset = false; msg(W, t("arrow")); }
      };
      go();
    }
    function finish() {
      st.done = true;
      K.later(() => {
        save.stars += st.stars; save.trips++; save.save();
        earn("drive", "أنهى رحلة قطار", 1, 3);
        K.replace(endScreen, { title: t("tripDone"), sum: t("sum", st.stars, W.cars.length - 1, st.arrived), again: () => K.replace(drive), cars: W.cars.length - 1, s: st.stars >= 10 ? 3 : st.stars >= 6 ? 2 : 1 });
      }, 1500);
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      if (!st.paused) for (let k = 0; k < (st.ff || 1); k++) step(dt);
      render(W); gauge(W, W.want); hud();
    }
    window.__drive = { W, st, setLvl, setSw };
    raf = requestAnimationFrame(frame);
  }

  function endScreen(r) {
    K.begin();
    K.paint(`<div class="top">${backBtn()}<span></span><span class="pill">⭐ ${save.stars}</span></div>
      <h1>${r.title}</h1>
      ${r.cars ? `<canvas id="endC" class="endc" width="900" height="170"></canvas>` : ""}
      <div class="stars">${K.starsHtml(r.s)}</div>
      <div class="sub">${r.sum} <span id="earn"></span></div>
      <div class="nav">
        <button class="btn f go" ${K.act("again", r.again)}>${t("again")}</button>
        ${r.next ? `<button class="btn f" ${K.act("next", r.next)}>${t("next")}</button>` : ""}
        <button class="btn f" ${K.act("home", K.home)}>${t("menu")}</button>
      </div>`, r.next ? "next" : "again");
    if (r.cars) D.thumb(document.getElementById("endC"), save.loco, save.color, Math.min(8, r.cars), r.load);
    K.sfx.win(); K.confetti(40, "⭐🎉🚂🚃✨");
    say(r.title);
  }

  // ================================================================ ابنِ السكة
  const LV = [
    [".....", ">...E", "....."],
    ["TTTE.", ">....", "TT..."],
    [">..T.", "TT.T.", "TTE.."],
    [">...T", ".TT..", "T...E"],
    ["..~..", ">.~.E", "..~.."],
    ["......", ">..T..", "......", ".T..RE"],
    ["...~..", ">..~TE", "..R~..", "...~.."],
    ["RT...R", "RT.T.H", ">..T.E", "T...T."],
    ["..~..R.", "..~....", "..~.HH.", ">.~T.E."],
    [">.~T.TT", "..~....", "..~T...", ".T~.R.E"],
    [">.T.R.T", "...RT..", "R..R..E", ".T.....", "....T.."],
    ["...~...", "...~HR.", ">..~T..", ".T.~H.T", "..T~.E."],
    ["H...~.R", "R..R~..", "...T~T.", ">...~RE", "H..H~.."],
    ["..T.~..R", "H...~R.T", ">...~T.T", ".H.T~..E", "..R.~..."],
    ["..~.H~.E", ".H~..~.T", ">.~T.~..", "H.~T.~..", "T.~..~R."],
    [">...~..R", "....~.H.", ".TTR~HE.", "....~..T", "...H~T.."],
    ["...~HTT.", ">..~.H..", "...~HH.E", ".TR~R..R", "...~...."],
    ["H.TR~...", ".HR.~.R.", "....~.H.", "R...~.RE", ">.T.~TR."],
    ["R.~.R.TE", ">.~.T...", "..~T.T..", "T.~.R...", ".H~...TT"],
    ["T...~T..", "T.R.~...", "..HR~.T.", "H.H.~R..", ">.TR~.ET"],
  ];
  const DX = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }, OPP = { N: "S", S: "N", E: "W", W: "E" };
  const STC = ["red", "blue", "green", "yellow", "orange", "purple", "pink"];

  function buildMap() {
    K.begin();
    const cells = LV.map((_, i) => {
      if (i >= save.bun) return `<div class="lv locked"><span class="emo">🔒</span></div>`;
      const b = save.bbest[i];
      return `<button class="lv f" ${K.act("L" + i, () => K.show(build, i))}><b>${i + 1}</b><span class="st">${b == null ? "✨" : K.starsHtml(b)}</span></button>`;
    }).join("");
    K.paint(`<div class="top">${backBtn()}<h2 class="ttl">🛤️ ${t("build")}</h2><span class="pill">⭐ ${Object.values(save.bbest).reduce((a, b) => a + b, 0)} / ${LV.length * 3}</span></div>
      <div class="lvgrid">${cells}</div>${HELP()}`, "L" + (Math.min(save.bun, LV.length) - 1));
  }

  function build(li) {
    K.begin();
    const rows = LV[li], H = rows.length, Wd = rows[0].length, color = STC[li % STC.length];
    const P = rows.map((r) => [...r].map(() => null));
    let start = null;
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (">v<^".includes(ch)) start = { x, y, d: { ">": "E", "<": "W", "^": "N", v: "S" }[ch] }; }));
    let tries = 0, running = false, cyc = null;
    const cell = (x, y) => (x < 0 || y < 0 || x >= Wd || y >= H ? "#" : rows[y][x]);
    const conn = (x, y) => { const p = P[y] && P[y][x]; return p ? D.PIECES[p] : ""; };

    const cs = `min(${(60 / H).toFixed(2)}vh, ${(86 / Wd).toFixed(2)}vw)`;
    let g = "";
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const ch = rows[y][x];
      if (ch === "." || ch === "~") g += `<button class="cell f" ${K.act(`c${x}_${y}`, () => tap(x, y))} data-x="${x}" data-y="${y}">${D.tileSvg(ch, null)}</button>`;
      else g += `<div class="cell fixed">${D.tileSvg(ch === "E" ? "E" : ">v<^".includes(ch) ? "S" : ch, null, { color: D.COL[color], exit: start && start.x === x && start.y === y ? start.d : null })}</div>`;
    }
    K.paint(`<div class="top">${backBtn()}<h2 class="ttl">🛤️ ${t("level", li + 1)}</h2><span class="pill" id="tries">${t("tries", 0)}</span></div>
      <div class="bwrap"><div class="bgrid" id="bg" style="--cols:${Wd};--cs:${cs}">${g}</div><canvas id="tt" class="tt"></canvas></div>
      <div class="cheer" id="bmsg">${t("buildTip")}</div>
      <div class="nav"><button class="btn f" ${K.act("erase", erase)}>${t("erase")}</button><button class="btn f go" ${K.act("run", run)}>${t("go")}</button></div>`, `c${Math.min(Wd - 1, start.x + 1)}_${start.y}`);
    say(t("buildTip"));
    const tt = document.getElementById("tt"), tc = tt.getContext("2d");
    function sizeCanvas() { const r = document.getElementById("bg").getBoundingClientRect(); tt.width = r.width * 2; tt.height = r.height * 2; tt.style.width = r.width + "px"; tt.style.height = r.height + "px"; return r.width / Wd; }

    function offers(x, y, side) { // هل تعرض الخلية المجاورة وصلة نحو هذه الخلية؟
      const ch = cell(x, y);
      if (ch === "E") return true;
      if (start && start.x === x && start.y === y) return start.d === side;
      return conn(x, y).includes(side);
    }
    function rank(x, y) {
      const list = rows[y][x] === "~" ? ["BH", "BV"] : ["H", "V", "NE", "ES", "SW", "WN"];
      const score = (p) => [...D.PIECES[p]].reduce((a, sd) => a + (offers(x + DX[sd][0], y + DX[sd][1], OPP[sd]) ? 1 : 0), 0);
      return list.map((p, i) => [p, score(p) * 10 - i]).sort((a, b) => b[1] - a[1]).map((q) => q[0]);
    }
    function paintCell(x, y) {
      const el = K.app.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
      if (el) el.innerHTML = D.tileSvg(rows[y][x], P[y][x]);
    }
    function tap(x, y) {
      if (running) return;
      if (!cyc || cyc.x !== x || cyc.y !== y) { cyc = { x, y, list: [...rank(x, y), null], i: 0 }; if (P[y][x] === cyc.list[0]) cyc.i = 1; }
      else cyc.i = (cyc.i + 1) % cyc.list.length;
      P[y][x] = cyc.list[cyc.i];
      paintCell(x, y); K.sfx.pop();
      if (rows[y][x] === "~" && cyc.i === 0) setMsg(t("bridgeOnly"));
    }
    function erase() { if (running) return; for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) if (P[y][x]) { P[y][x] = null; paintCell(x, y); } cyc = null; K.sfx.tick(); }
    function setMsg(s, speak) { const m = document.getElementById("bmsg"); if (m) m.textContent = s; if (speak) say(s); }

    // تتبع المسار من نقطة البداية
    function trace() {
      const pts = [], C = (x, y) => [x + 0.5, y + 0.5], side = (x, y, d) => [x + 0.5 + DX[d][0] * 0.5, y + 0.5 + DX[d][1] * 0.5];
      let x = start.x, y = start.y, d = start.d;
      pts.push(C(x, y), side(x, y, d));
      for (let k = 0; k < 80; k++) {
        const nx = x + DX[d][0], ny = y + DX[d][1], ent = OPP[d], ch = cell(nx, ny);
        if (ch === "E") { pts.push(C(nx, ny)); return { pts, ok: true }; }
        const c2 = conn(nx, ny);
        if (!c2.includes(ent)) return { pts, ok: false, bad: [nx, ny] };
        const ex = c2.replace(ent, "");
        const a = side(nx, ny, ent), b = side(nx, ny, ex);
        if (ex === d) { pts.push(b); }
        else { // ربع دائرة حول الزاوية
          const cx = nx + 0.5 + (DX[ent][0] + DX[ex][0]) * 0.5, cy = ny + 0.5 + (DX[ent][1] + DX[ex][1]) * 0.5;
          const a0 = Math.atan2(a[1] - cy, a[0] - cx), a1 = Math.atan2(b[1] - cy, b[0] - cx);
          let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
          for (let q = 1; q <= 8; q++) { const an = a0 + (da * q) / 8; pts.push([cx + Math.cos(an) * 0.5, cy + Math.sin(an) * 0.5]); }
        }
        x = nx; y = ny; d = ex;
      }
      return { pts, ok: false };
    }
    function run() {
      if (running) return;
      running = true; tries++;
      document.getElementById("tries").textContent = t("tries", tries);
      const cw = sizeCanvas(), tr = trace(), pts = tr.pts;
      const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const total = L[L.length - 1];
      const at = (s) => { s = clamp(s, 0, total); let i = 1; while (i < L.length - 1 && L[i] < s) i++; const u = (s - L[i - 1]) / (L[i] - L[i - 1] || 1); const p = pts[i - 1], q = pts[i]; return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, Math.atan2(q[1] - p[1], q[0] - p[0])]; };
      let s = 0, lastT = 0, chug = 0;
      snd.whistle(save.loco);
      const draw = () => {
        tc.clearRect(0, 0, tt.width, tt.height);
        tc.save(); tc.scale(2, 2);
        for (let i = 2; i >= 0; i--) {
          const p = at(s - i * 0.62); if (s - i * 0.62 < 0) continue;
          tc.save(); tc.translate(p[0] * cw, p[1] * cw); tc.rotate(p[2]); tc.scale(cw / 100, cw / 100);
          const col = D.COL[save.color]; tc.fillStyle = i === 0 ? col : D.WAGON[(i - 1) % 8];
          tc.beginPath(); tc.roundRect(-28, -20, 56, 40, 8); tc.fill();
          if (i === 0) { tc.fillStyle = D.shade(col, -0.35); tc.beginPath(); tc.roundRect(-28, -20, 20, 40, 6); tc.fill(); tc.fillStyle = "#1f2937"; tc.beginPath(); tc.arc(14, 0, 8, 0, 7); tc.fill(); tc.fillStyle = "#fde68a"; tc.beginPath(); tc.arc(28, 0, 5, 0, 7); tc.fill(); }
          else { tc.fillStyle = "rgba(255,255,255,.55)"; tc.fillRect(-20, -12, 40, 24); }
          tc.restore();
        }
        if (tr.bad && s >= total - 0.01) {
          const [bx, by] = tr.bad, pulse = 0.5 + 0.5 * Math.sin(performance.now() / 150);
          tc.strokeStyle = `rgba(239,68,68,${0.5 + pulse * 0.5})`; tc.lineWidth = 6; tc.setLineDash([10, 8]);
          tc.strokeRect(bx * cw + 4, by * cw + 4, cw - 8, cw - 8); tc.setLineDash([]);
          tc.font = `${cw * 0.5}px 'Noto Color Emoji',sans-serif`; tc.textAlign = "center"; tc.textBaseline = "middle"; tc.fillText("🔧", bx * cw + cw / 2, by * cw + cw / 2);
        }
        tc.restore();
      };
      const anim = (ts) => {
        if (!document.body.contains(tt)) return;
        const dt = lastT ? Math.min(0.05, (ts - lastT) / 1000) : 0; lastT = ts;
        const sp = 1.6 * (s > total - 0.6 ? clamp((total - s) / 0.6, 0.25, 1) : 1);
        s = Math.min(total, s + sp * dt);
        chug += sp * dt; if (chug > 0.5) { chug = 0; snd.chug(60); }
        draw();
        if (s < total) return requestAnimationFrame(anim);
        if (tr.ok) return win();
        setMsg(t("missing"), true); snd.soft();
        let k = 0; const hold = () => { if (!document.body.contains(tt)) return; draw(); if (++k < 110) requestAnimationFrame(hold); else { tc.clearRect(0, 0, tt.width, tt.height); running = false; setMsg(t("buildTip")); } };
        requestAnimationFrame(hold);
      };
      requestAnimationFrame(anim);
    }
    function win() {
      snd.bell(); K.confetti(30); setMsg(t("arrived"), true);
      const s = tries <= 1 ? 3 : tries <= 3 ? 2 : 1, prev = save.bbest[li] || 0;
      if (s > prev) { save.stars += s - prev; save.bbest[li] = s; }
      if (save.bun < li + 2) save.bun = Math.min(LV.length, li + 2);
      save.save();
      earn("build" + li, `أنهى لغز السكة ${li + 1}`, 1, 1);
      K.later(() => K.replace(endScreen, { title: t("arrived"), sum: t("level", li + 1) + " · " + t("tries", tries), s, again: () => K.replace(build, li), next: li + 1 < LV.length ? () => K.replace(build, li + 1) : null }), 1600);
    }
    window.__build = { P, rows, tap, run, trace };
  }

  // ================================================================ التوصيل
  function deliver() {
    const r = save.dround, rnd = rng(r * 31 + 7 + Date.now() % 997);
    const nc = r < 2 ? 2 : r < 5 ? 3 : 4, n = Math.min(6, 3 + Math.floor(r / 2));
    const colors = K.shuffle(["red", "blue", "green", "yellow"]).slice(0, nc);
    const loads = colors.map((c) => ({ k: rnd() < 0.5 ? "p" : "b", c }));
    while (loads.length < n) loads.push({ k: rnd() < 0.5 ? "p" : "b", c: colors[Math.floor(rnd() * nc)] });
    const cars = [{ loco: save.loco, col: save.color }, ...K.shuffle(loads).map((l) => ({ col: "#e2e8f0", load: Object.assign({}, l) }))];
    const list = ["plain"];
    colors.forEach((c) => { list.push("plain"); list.push({ type: "dstation", color: c }); });
    list.push("end");
    const W = newWorld(makeCourse(list), cars, { AY: 300, lvl: 0 });
    camUpdate(W, 0, true);
    const st = { ff: 1, phase: "count0", si: 0, mistakes: 0, cur: null };
    let raf = 0, last = 0;
    document.body.classList.add("playing");
    K.paint(`<div class="hud"><div class="htop">${backBtn()}<span class="pill">${t("round", r + 1)}</span><span></span></div></div><div class="dpanel" id="dp"></div>`, "back");
    K.mode = { stop() { cancelAnimationFrame(raf); document.body.classList.remove("playing"); } };

    function panel(html, def) {
      const dp = document.getElementById("dp"); if (!dp) return;
      dp.innerHTML = html; K.focus(dp.querySelector(def ? `[data-k="${def}"]` : ".f") || dp.querySelector(".f"));
    }
    const numOpts = (right, max) => K.shuffle([...new Set([right, ...K.shuffle(K.range(1, Math.max(right + 2, max + 1)).filter((x) => x !== right)).slice(0, 2)])]);
    function ask(q, right, max, onOk) {
      say(q);
      const opts = numOpts(right, max);
      panel(`<div class="dq">${q}</div><div class="dopts">${opts.map((v) => `<button class="opt f" ${K.act("n" + v, (el) => {
        if (v === right) { el.classList.add("ok"); K.sfx.ok(); say(t("yes")); K.later(onOk, 900); }
        else { el.classList.add("bad"); st.mistakes++; K.sfx.bad(); say(t("tryAgain")); }
      })}>${v}</button>`).join("")}</div>`);
    }
    function countStart() { ask(t("howMany"), W.cars.length - 1, 6, depart); }
    function depart() { panel(""); st.phase = "drive"; W.lvl = 3; snd.whistle(save.loco); }
    function atStation(s) {
      st.phase = "pick"; st.cur = s; snd.bell();
      const name = I.col(s.color);
      say(t("pick", name));
      const off = carOffsets(W);
      const cards = W.cars.slice(1).map((c, i) => `<button class="wcard f" ${K.act("w" + i, (el) => pickCar(i, el))}><canvas data-w="${i}" width="200" height="120"></canvas></button>`).join("");
      panel(`<div class="dq"><span class="dot" style="background:${D.COL[s.color]}"></span> ${t("pick", name)}</div><div class="wcards">${cards}</div>`);
      drawCards();
      st.need = W.cars.slice(1).filter((c) => c.load && c.load.c === s.color).length; st.got = 0;
    }
    function drawCards() {
      K.app.querySelectorAll("canvas[data-w]").forEach((cvs) => {
        const c = cvs.getContext("2d"), car = W.cars[1 + +cvs.dataset.w];
        c.clearRect(0, 0, cvs.width, cvs.height); c.save(); c.translate(100, 112); c.scale(1.4, 1.4); D.car(c, car.col, 0, null, car.load, 1 + +cvs.dataset.w); c.restore();
      });
    }
    function pickCar(i, el) {
      if (st.phase !== "pick") return;
      const car = W.cars[1 + i], s = st.cur;
      if (!car.load) return;
      if (car.load.c === s.color) {
        const off = carOffsets(W), x = W.s - off[1 + i];
        W.parts.push({ k: "walk", x0: x, x1: s.x0 + s.len * 0.42 + 160 + (s.items.length % 5) * 40, y1: TY - 34, c: car.load.c, b: car.load.k === "b", u: 0, dur: 0.9 });
        const it = car.load; car.load = null; K.later(() => s.items.push(it), 900);
        el.classList.add("ok"); K.sfx.ok(); st.got++;
        drawCards();
        if (st.got >= st.need) { st.phase = "count"; K.later(() => ask(t("count"), st.need, Math.max(3, st.need), leave), 1000); }
      } else {
        el.classList.add("bad"); K.later(() => el.classList.remove("bad"), 500); st.mistakes++; K.sfx.bad();
        say(t("notThis", I.col(car.load.c), I.col(s.color)));
      }
    }
    function leave() {
      st.cur.done = true; st.si++;
      if (st.si >= colors.length) {
        panel(`<div class="dq">${t("allDone")}</div>`); say(t("allDone"));
        W.lvl = 3; st.phase = "end";
        K.later(() => {
          const s = st.mistakes === 0 ? 3 : st.mistakes <= 2 ? 2 : 1;
          save.stars += s; save.dround++; save.save();
          earn("deliver", "أنهى جولة توصيل", 1, 3);
          K.replace(endScreen, { title: t("allDone"), sum: t("round", r + 1) + " · ⭐ " + s, s, again: () => K.replace(deliver) });
        }, 2600);
      } else depart();
    }
    function step(dt) {
      W.t += dt;
      const front = W.s + 75;
      if (st.phase === "drive") {
        const s = W.segs.find((q) => q.type === "dstation" && !q.done);
        if (s && front > s.x0 - 300) W.stopAt = s.mark;
        if (s && W.stopAt != null && W.v < 0.5 && front > s.mark - 6) { W.stopAt = null; W.lvl = 0; atStation(s); }
      }
      physics(W, dt, SPD[W.lvl]);
      camUpdate(W, dt);
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      for (let k = 0; k < st.ff; k++) step(dt); render(W);
    }
    // التحميل في البداية: الحمولات تصعد واحدة واحدة ثم سؤال العدّ
    const keep = W.cars.slice(1).map((c) => c.load);
    W.cars.slice(1).forEach((c) => (c.load = null));
    keep.forEach((l, i) => K.later(() => { W.cars[1 + i].load = l; K.tone(500 + i * 90, 0.1, "triangle", 0.1); }, 500 + i * 450));
    K.later(countStart, 700 + keep.length * 450);
    window.__dlv = { W, st, colors };
    raf = requestAnimationFrame(frame);
  }

  K.start(home);
})();
