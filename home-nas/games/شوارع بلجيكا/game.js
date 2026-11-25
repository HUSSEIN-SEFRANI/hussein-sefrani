// شوارع بلجيكا — يقود الطفل مركبته في شوارع موسكرون وعلى طرق بلجيكا، ويبحث عن أقصر طريق إلى الهدف.
// قبل كل مرحلة تظهر الخريطة كاملة من فوق، ثم القيادة ثلاثية الأبعاد (drive3d.js)، وقبل كل تقاطع لوحة بأسماء الشوارع أو المدن والمسافة.
// على الطريق نجوم ⭐ للجمع، ورادارات 📸 تُنقص النجوم عند تجاوز السرعة، والاصطدام بسيارة يُنقص نجمة.
// الأزرار بالموقع (البند 52): الأسهم/العصا اليسرى = التوجيه (← → المقود، ↑ بنزين، ↓ فرامل ورجوع)، السفلي (0) = بنزين (وموافق)،
// الأيسر (2) = فرامل، العلوي (3) = الخريطة الكبيرة، الأيمن (1) = استراحة. لوحة المفاتيح: الأسهم، Enter بنزين، B فرامل، M الخريطة، Backspace استراحة.
(() => {
  "use strict";
  const { CITY, REGION, STAGES, VEHICLES, BRANDS } = D;
  const save = K.store("belgium-streets", { veh: "", brand: "mercedes", unlocked: 1, best: {}, total: 0 });
  const W = 1280, H = 720;
  const FONT = (px, w = 800) => `${w} ${px}px Baloo, "Noto Sans Arabic", Tahoma, sans-serif`;
  const cv = document.createElement("canvas"); cv.id = "cv"; document.body.insertBefore(cv, K.app);
  const g = cv.getContext("2d");
  let VS = 1, VX = 0, VY = 0; // تحويل 1280×720 إلى الشاشة
  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    VS = Math.min(cv.width / W, cv.height / H); VX = (cv.width - W * VS) / 2; VY = (cv.height - H * VS) / 2;
  }
  fit(); addEventListener("resize", fit);
  const vehOf = (id) => VEHICLES.find((v) => v.id === id) || VEHICLES[0];
  const brandOf = (id) => BRANDS.find((b) => b.id === id) || BRANDS[0];

  // ---------------------------------------------------------------- أدوات
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function rr(x, px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }
  function text(x, s, px, py, size, col = "#fff", stroke = "#0f172a", sw = 0, align = "center") {
    x.font = FONT(size); x.textAlign = align; x.textBaseline = "middle";
    if (sw) { x.lineWidth = sw; x.strokeStyle = stroke; x.lineJoin = "round"; x.strokeText(s, px, py); }
    x.fillStyle = col; x.fillText(s, px, py);
  }
  const emo = (x, e, px, py, size) => { x.font = `${size}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#000"; x.fillText(e, px, py); };
  const fmtKm = (map, px) => { const km = px * map.kmPerPx; return km < 1 ? `${Math.round(km * 100) * 10} متر` : `${km < 10 ? km.toFixed(1) : Math.round(km)} كم`; };

  // ---------------------------------------------------------------- الأصوات
  const snd = {
    star() { K.tone(1175, 0.07, "triangle", 0.08); K.tone(1568, 0.1, "triangle", 0.07, 0.05); },
    bump() { K.tone(160, 0.25, "square", 0.06); K.tone(110, 0.3, "sawtooth", 0.04, 0.05); },
    flash() { K.tone(1800, 0.06, "square", 0.05); K.tone(1800, 0.06, "square", 0.05, 0.12); },
    turn() { K.tone(620, 0.05, "sine", 0.05); },
    no() { K.tone(240, 0.15, "square", 0.04); },
    beep(f = 660) { K.tone(f, 0.18, "square", 0.05); },
    arrive() { [523, 659, 784, 1047, 1319].forEach((f, i) => K.tone(f, 0.22, "triangle", 0.11, i * 0.11)); },
  };

  // ---------------------------------------------------------------- بناء خريطة المرحلة
  function hav(a, b) { // كم
    const R = 6371, t = Math.PI / 180, dl = (b[1] - a[1]) * t, dp = (b[0] - a[0]) * t;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function finish(map) {
    map.adj = {};
    for (const k in map.nodes) map.adj[k] = [];
    map.edges.forEach((e, i) => {
      const A = map.nodes[e.a], B = map.nodes[e.b];
      e.i = i; e.len = Math.hypot(B.x - A.x, B.y - A.y);
      map.adj[e.a].push(e); map.adj[e.b].push(e);
    });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k in map.nodes) { const n = map.nodes[k]; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const m = map.kind === "city" ? 200 : 260;
    map.b = { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };
    return map;
  }
  const other = (e, n) => (e.a === n ? e.b : e.a);
  const canGo = (e, from) => !e.works && (!e.oneway || e.oneway === from);
  function shortest(map, s, t) {
    const d = {}, prev = {}, done = new Set();
    for (const k in map.nodes) d[k] = Infinity;
    d[s] = 0;
    for (;;) {
      let u = null;
      for (const k in d) if (!done.has(k) && (u === null || d[k] < d[u])) u = k;
      if (u === null || d[u] === Infinity) break;
      if (u === t) break;
      done.add(u);
      for (const e of map.adj[u]) {
        if (!canGo(e, u)) continue;
        const v = other(e, u), nd = d[u] + e.len;
        if (nd < d[v]) { d[v] = nd; prev[v] = u; }
      }
    }
    const path = [];
    if (d[t] < Infinity) { for (let u = t; u; u = prev[u]) path.unshift(u); }
    return { len: d[t], path };
  }

  function buildCity(st) {
    const map = { kind: "city", title: CITY.name, nodes: {}, edges: [], kmPerPx: 0.12 / CITY.grid.G, pxk: 2.8, lights: CITY.lights.slice(), places: CITY.places, grid: CITY.grid };
    for (const k in CITY.nodes) map.nodes[k] = { ...CITY.nodes[k] };
    map.edges = CITY.edges.map((e) => ({ ...e, type: "c", limit: e.zone || CITY.limit }));
    finish(map);
    // البيوت (مرة واحدة)
    const { G, COLS, ROWS } = CITY.grid, r = rng(7), houses = [];
    const PAL = ["#f87171", "#fb923c", "#a16207", "#b45309", "#ef4444", "#78716c", "#92400e", "#be123c"];
    const diag = map.edges.filter((e) => e.name === "جادة الملك");
    const segD = (px, py, e) => { const A = map.nodes[e.a], B = map.nodes[e.b], dx = B.x - A.x, dy = B.y - A.y, t = clamp(((px - A.x) * dx + (py - A.y) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(A.x + dx * t - px, A.y + dy * t - py); };
    const placeAt = (cx, cy) => CITY.places.find((p) => cx === p.cell[0] && cy >= p.cell[1] && cy < p.cell[1] + (p.h || 1));
    for (let cy = 0; cy < ROWS - 1; cy++) for (let cx = 0; cx < COLS - 1; cx++) {
      if (placeAt(cx, cy)) continue;
      const x0 = cx * G + 44, y0 = cy * G + 44, s = G - 88;
      for (let side = 0; side < 4; side++) {
        let p = 0;
        while (p < s - 30) {
          const w = 38 + r() * 22, d = 46 + r() * 10, ww = Math.min(w, s - p);
          let hx, hy, hw, hh;
          if (side === 0) { hx = x0 + p; hy = y0; hw = ww; hh = d; }
          else if (side === 1) { hx = x0 + p; hy = y0 + s - d; hw = ww; hh = d; }
          else if (side === 2) { hx = x0; hy = y0 + p; hw = d; hh = ww; }
          else { hx = x0 + s - d; hy = y0 + p; hw = d; hh = ww; }
          p += ww + 2;
          if ((side >= 2) && (hy < y0 + 50 || hy + hh > y0 + s - 50)) continue;
          if (diag.some((e) => segD(hx + hw / 2, hy + hh / 2, e) < 70)) continue;
          houses.push({ x: hx, y: hy, w: hw, h: hh, c: PAL[(r() * PAL.length) | 0], v: side < 2 });
        }
      }
      // أشجار داخل البلوك
      for (let i = 0; i < 3; i++) {
        const tx = x0 + 70 + r() * (s - 140), ty = y0 + 70 + r() * (s - 140);
        if (!diag.some((e) => segD(tx, ty, e) < 60)) houses.push({ tree: true, x: tx, y: ty, s: 16 + r() * 10 });
      }
    }
    map.houses = houses;
    // أشجار حول المدينة
    map.trees = [];
    for (let i = 0; i < 140; i++) {
      const tx = map.b.x0 - 300 + r() * (map.b.x1 - map.b.x0 + 600), ty = map.b.y0 - 300 + r() * (map.b.y1 - map.b.y0 + 600);
      if (tx > -60 && tx < (COLS - 1) * G + 60 && ty > -60 && ty < (ROWS - 1) * G + 60) continue;
      map.trees.push({ x: tx, y: ty, s: 18 + r() * 14 });
    }
    map.start = st.from; map.goal = st.to;
    map.nodes[st.from].label = st.fromName; map.nodes[st.to].label = st.toName;
    map.nodes[st.from].emo = st.fromEmo; map.nodes[st.to].emo = st.toEmo;
    map.wide = { x0: map.b.x0 - 300, y0: map.b.y0 - 300, x1: map.b.x1 + 300, y1: map.b.y1 + 300 };
    return map;
  }

  function buildRegion(st) {
    const T = REGION.towns, a = T[st.from], b = T[st.to];
    const la0 = Math.min(a[1], b[1]), la1 = Math.max(a[1], b[1]), lo0 = Math.min(a[2], b[2]), lo1 = Math.max(a[2], b[2]);
    const mla = Math.max(0.09, (la1 - la0) * 0.35), mlo = Math.max(0.14, (lo1 - lo0) * 0.35);
    const inBox = (t) => t[1] >= la0 - mla && t[1] <= la1 + mla && t[2] >= lo0 - mlo && t[2] <= lo1 + mlo;
    const ids = Object.keys(T).filter((k) => inBox(T[k]));
    const km = hav([a[1], a[2]], [b[1], b[2]]);
    const S = clamp(5000 / km, 45, 340); // بكسل لكل كم
    const cos = Math.cos(50.8 * Math.PI / 180), LO = lo0 - mlo, LA = la1 + mla;
    const proj = (lat, lon) => ({ x: (lon - LO) * 111.32 * cos * S, y: (LA - lat) * 110.57 * S });
    const map = { kind: "region", title: st.title, nodes: {}, edges: [], kmPerPx: 1.2 / S, pxk: 2.5, lights: [], S, proj, LO, LA };
    for (const k of ids) { const t = T[k], p = proj(t[1], t[2]); map.nodes[k] = { x: p.x, y: p.y, name: t[0], size: t[3], emo: t[4] || "" }; }
    const works = new Set((st.works || []).map((w) => w.slice().sort().join("|")));
    for (const r of REGION.roads) {
      if (!map.nodes[r[0]] || !map.nodes[r[1]]) continue;
      if (map.edges.some((e) => (e.a === r[0] && e.b === r[1]) || (e.a === r[1] && e.b === r[0]))) continue;
      map.edges.push({ a: r[0], b: r[1], name: r[2], type: r[3], limit: REGION.limits[r[3]], works: works.has([r[0], r[1]].sort().join("|")) });
    }
    finish(map);
    // نصف الطرق تقريباً فيها رادار (تحديد ثابت لكل مرحلة)
    const rr2 = rng(st.id * 97);
    map.edges.forEach((e) => { if (!e.works && e.len > 500 && rr2() < 0.45) e.radar = 0.35 + rr2() * 0.3; });
    // بيوت كل مدينة وحقول الريف
    const r = rng(st.id * 31 + 5);
    map.towns = [];
    for (const k in map.nodes) {
      const n = map.nodes[k], R0 = [0, 46, 80, 120][n.size], hs = [];
      for (let i = 0; i < n.size * 14; i++) { const an = r() * 6.283, d = R0 * Math.sqrt(r()); hs.push({ x: n.x + Math.cos(an) * d, y: n.y + Math.sin(an) * d, w: 12 + r() * 12, h: 10 + r() * 10, c: ["#f87171", "#fb923c", "#b45309", "#ef4444", "#a8a29e"][(r() * 5) | 0] }); }
      map.towns.push({ n, R: R0, hs });
    }
    map.wide = { x0: map.b.x0 - 600, y0: map.b.y0 - 600, x1: map.b.x1 + 600, y1: map.b.y1 + 600 };
    map.fields = [];
    for (let i = 0; i < 260; i++) map.fields.push({ x: map.wide.x0 + r() * (map.wide.x1 - map.wide.x0), y: map.wide.y0 + r() * (map.wide.y1 - map.wide.y0), w: 120 + r() * 260, h: 90 + r() * 200, c: ["#a3d977", "#c5e384", "#86c56b", "#d9e8a0", "#7fbf5f"][(r() * 5) | 0] });
    map.trees = [];
    for (let i = 0; i < 220; i++) map.trees.push({ x: map.wide.x0 + r() * (map.wide.x1 - map.wide.x0), y: map.wide.y0 + r() * (map.wide.y1 - map.wide.y0), s: 14 + r() * 10 });
    const P = (arr) => arr.map((q) => proj(q[0], q[1]));
    map.shp = { coast: P(REGION.shapes.coast), france: P(REGION.shapes.france), holland: P(REGION.shapes.holland), rivers: REGION.shapes.rivers.map(P), labels: REGION.shapes.labels.map((l) => ({ t: l[0], ...proj(l[1], l[2]) })) };
    map.start = st.from; map.goal = st.to;
    return map;
  }
  const build = (st) => (st.city ? buildCity(st) : buildRegion(st));

  // ---------------------------------------------------------------- رسم المركبات (من فوق، الوجه نحو +x)
  function drawVehicle(x, vid, brand, px, py, ang, sc = 1, t = 0, shadow = true) {
    x.save(); x.translate(px, py); x.rotate(ang); x.scale(sc, sc);
    const sh = (w, h) => { if (!shadow) return; x.fillStyle = "rgba(0,0,0,.25)"; rr(x, -w / 2 + 4, -h / 2 + 5, w, h, 9); x.fill(); };
    if (vid === "plane") {
      if (shadow) { x.save(); x.translate(18, 26); x.fillStyle = "rgba(0,0,0,.18)"; planeShape(x); x.fill(); x.restore(); }
      x.fillStyle = "#f8fafc"; planeShape(x); x.fill(); x.lineWidth = 2; x.strokeStyle = "#334155"; x.stroke();
      x.fillStyle = "#ef4444"; rr(x, -46, -4, 16, 8, 3); x.fill();
      x.fillStyle = "#38bdf8"; rr(x, 30, -5, 10, 10, 4); x.fill();
      x.fillStyle = "#1d4ed8"; x.fillRect(-20, -38, 6, 76);
      x.restore(); return;
    }
    if (vid === "moto") {
      sh(46, 16);
      x.fillStyle = "#111827"; rr(x, -24, -4, 12, 8, 4); x.fill(); rr(x, 12, -4, 12, 8, 4); x.fill();
      x.fillStyle = "#ea580c"; rr(x, -14, -7, 30, 14, 7); x.fill();
      x.fillStyle = "#94a3b8"; x.fillRect(12, -12, 3, 24);
      x.fillStyle = "#facc15"; x.beginPath(); x.arc(-4, 0, 7, 0, 6.283); x.fill(); // خوذة
      x.fillStyle = "#fef08a"; x.fillRect(22, -2, 4, 4);
      x.restore(); return;
    }
    let w = 62, h = 30, body = "#ef4444", roof = null, shape = "sedan";
    if (vid === "car") { const b = brandOf(brand); body = b.color; shape = b.shape; }
    if (vid === "npc") { body = brand; shape = "sedan"; }
    if (vid === "police") { body = "#f8fafc"; shape = "sedan"; }
    if (vid === "ambulance") { body = "#facc15"; shape = "van"; w = 70; h = 32; }
    if (shape === "suv") { w = 64; h = 32; } if (shape === "sport") { w = 64; h = 28; } if (shape === "hatch") { w = 54; h = 30; } if (shape === "wagon") { w = 68; h = 30; }
    sh(w, h);
    x.fillStyle = "#111827"; [[-w / 2 + 8, -h / 2 - 2], [w / 2 - 20, -h / 2 - 2], [-w / 2 + 8, h / 2 - 4], [w / 2 - 20, h / 2 - 4]].forEach(([a, b2]) => { rr(x, a, b2, 12, 6, 2); x.fill(); });
    x.fillStyle = body; rr(x, -w / 2, -h / 2, w, h, shape === "sport" ? 13 : 9); x.fill();
    x.lineWidth = 1.5; x.strokeStyle = "rgba(0,0,0,.35)"; x.stroke();
    if (vid === "ambulance") { // مربعات خضراء وصفراء
      x.fillStyle = "#16a34a"; for (let i = 0; i < 6; i++) { x.fillRect(-w / 2 + 4 + i * 10, (i % 2 ? -h / 2 : h / 2 - 5), 10, 5); }
      x.fillStyle = "#fff"; rr(x, -w / 2 + 6, -h / 2 + 6, w - 24, h - 12, 4); x.fill();
      x.fillStyle = "#16a34a"; x.fillRect(-12, -2.5, 16, 5); x.fillRect(-6.5, -8, 5, 16);
    }
    if (vid === "police") { x.fillStyle = "#1d4ed8"; x.fillRect(-w / 2, -h / 2 + 2, w, 5); x.fillRect(-w / 2, h / 2 - 7, w, 5); }
    // الزجاج والسقف
    const rl = shape === "van" ? -w / 2 + 6 : -w / 2 + 14, rw = shape === "van" ? w - 22 : shape === "hatch" ? w - 26 : w - 30;
    if (vid !== "ambulance") {
      x.fillStyle = "#0f172a"; rr(x, rl, -h / 2 + 4, rw, h - 8, 6); x.fill();
      x.fillStyle = vid === "police" ? "#f8fafc" : shade(body); rr(x, rl + 6, -h / 2 + 6, rw - 14, h - 12, 4); x.fill();
      if (shape === "sport") { x.fillStyle = "#0f172a"; x.fillRect(-w / 2 + 2, -h / 2 + 3, 5, h - 6); }
    } else { x.fillStyle = "#0f172a"; rr(x, w / 2 - 16, -h / 2 + 4, 8, h - 8, 3); x.fill(); }
    // المصابيح
    x.fillStyle = "#fef9c3"; x.fillRect(w / 2 - 4, -h / 2 + 3, 4, 6); x.fillRect(w / 2 - 4, h / 2 - 9, 4, 6);
    x.fillStyle = "#b91c1c"; x.fillRect(-w / 2, -h / 2 + 3, 3, 6); x.fillRect(-w / 2, h / 2 - 9, 3, 6);
    if (vid === "police" || vid === "ambulance") { // أضواء الطوارئ
      const on = Math.floor(t * 6) % 2;
      x.fillStyle = on ? "#ef4444" : "#3b82f6"; rr(x, 2, -h / 2 + 3, 7, h / 2 - 3, 2); x.fill();
      x.fillStyle = on ? "#3b82f6" : "#ef4444"; rr(x, 2, 0, 7, h / 2 - 3, 2); x.fill();
      if (shadow) { x.globalAlpha = 0.25; x.fillStyle = on ? "#ef4444" : "#3b82f6"; x.beginPath(); x.arc(5, 0, 34, 0, 6.283); x.fill(); x.globalAlpha = 1; }
    }
    x.restore();
  }
  function shade(c) { // لون أغمق قليلاً للسقف
    const m = /^#(..)(..)(..)$/.exec(c); if (!m) return c;
    return "#" + [m[1], m[2], m[3]].map((h) => Math.round(parseInt(h, 16) * 0.8).toString(16).padStart(2, "0")).join("");
  }
  function planeShape(x) {
    x.beginPath(); x.moveTo(44, 0); x.quadraticCurveTo(40, -7, 30, -7); x.lineTo(6, -7); x.lineTo(-10, -44); x.lineTo(-22, -44); x.lineTo(-10, -7); x.lineTo(-34, -7);
    x.lineTo(-44, -20); x.lineTo(-50, -20); x.lineTo(-46, 0); x.lineTo(-50, 20); x.lineTo(-44, 20); x.lineTo(-34, 7); x.lineTo(-10, 7); x.lineTo(-22, 44); x.lineTo(-10, 44); x.lineTo(6, 7); x.lineTo(30, 7); x.quadraticCurveTo(40, 7, 44, 0); x.closePath();
  }

  // ---------------------------------------------------------------- رسم العالم
  // cam = {x, y, z}: مركز الكاميرا في العالم والتكبير. o = {labels, signs, t}
  function drawWorld(x, map, cam, o = {}) {
    const z = cam.z, vw = W / z, vh = H / z, vx0 = cam.x - vw / 2, vy0 = cam.y - vh / 2, vx1 = vx0 + vw, vy1 = vy0 + vh;
    const vis = (px, py, m = 80) => px > vx0 - m && px < vx1 + m && py > vy0 - m && py < vy1 + m;
    x.save(); x.translate(W / 2, H / 2); x.scale(z, z); x.translate(-cam.x, -cam.y);
    const city = map.kind === "city";
    x.fillStyle = city ? "#8fce6f" : "#9bd27a"; x.fillRect(vx0, vy0, vw, vh);
    if (city) {
      const { G, COLS, ROWS } = map.grid;
      x.fillStyle = "#e7dcc8"; x.fillRect(-60, -60, (COLS - 1) * G + 120, (ROWS - 1) * G + 120);
      // الأماكن
      for (const p of map.places) {
        const px = p.cell[0] * G + 34, py = p.cell[1] * G + 34, s = G - 68, hh = (p.h || 1) * G - 68;
        if (!vis(px + s / 2, py + hh / 2, s + hh)) continue;
        drawPlace(x, p, px, py, s, hh, o.t || 0);
      }
      for (const h of map.houses) {
        if (h.tree) { if (vis(h.x, h.y)) tree(x, h.x, h.y, h.s); continue; }
        if (!vis(h.x + h.w / 2, h.y + h.h / 2)) continue;
        x.fillStyle = h.c; x.fillRect(h.x, h.y, h.w, h.h);
        x.fillStyle = "rgba(0,0,0,.18)"; if (h.v) x.fillRect(h.x, h.y + h.h / 2, h.w, h.h / 2); else x.fillRect(h.x + h.w / 2, h.y, h.w / 2, h.h);
        x.strokeStyle = "rgba(0,0,0,.25)"; x.lineWidth = 1.5; x.strokeRect(h.x, h.y, h.w, h.h);
      }
    } else {
      for (const f of map.fields) if (f.x < vx1 && f.x + f.w > vx0 && f.y < vy1 && f.y + f.h > vy0) { x.fillStyle = f.c; x.fillRect(f.x, f.y, f.w, f.h); }
      const s = map.shp;
      // البحر
      x.fillStyle = "#38bdf8"; x.beginPath(); x.moveTo(s.coast[0].x, map.wide.y0 - 4000); s.coast.forEach((q) => x.lineTo(q.x, q.y)); x.lineTo(map.wide.x0 - 4000, s.coast[s.coast.length - 1].y); x.lineTo(map.wide.x0 - 4000, map.wide.y0 - 4000); x.closePath(); x.fill();
      x.strokeStyle = "#fde68a"; x.lineWidth = 16; x.beginPath(); s.coast.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y))); x.stroke();
      x.strokeStyle = "#3b82f6"; x.lineWidth = 9; x.lineCap = "round"; x.lineJoin = "round";
      for (const rv of s.rivers) { x.beginPath(); rv.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y))); x.stroke(); }
      x.setLineDash([22, 16]); x.strokeStyle = "#7c3aed"; x.lineWidth = 5;
      for (const bd of [s.france, s.holland]) { x.beginPath(); bd.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y))); x.stroke(); }
      x.setLineDash([]);
      for (const l of s.labels) if (vis(l.x, l.y, 300)) text(x, l.t, l.x, l.y, 40 / Math.max(z, 0.35), "#fff", "#5b21b6", 8 / Math.max(z, 0.35));
      for (const tw of map.towns) {
        if (!vis(tw.n.x, tw.n.y, tw.R + 60)) continue;
        x.fillStyle = "#efe4cf"; x.beginPath(); x.arc(tw.n.x, tw.n.y, tw.R + 16, 0, 6.283); x.fill();
        for (const h of tw.hs) { x.fillStyle = h.c; x.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h); }
      }
    }
    for (const t of map.trees) if (vis(t.x, t.y)) tree(x, t.x, t.y, t.s);
    // الطرق: الحواف ثم الأرضية ثم الخطوط
    const RW = city ? { c: [62, 54] } : { h: [40, 32], n: [30, 24], l: [22, 16] };
    const COL = city ? { c: ["#cbd5e1", "#4b5563"] } : { h: ["#1e3a8a", "#6b7280"], n: ["#334155", "#8b8f97"], l: ["#57534e", "#a8a29e"] };
    const evis = (e) => { const A = map.nodes[e.a], B = map.nodes[e.b]; return !(Math.max(A.x, B.x) < vx0 - 60 || Math.min(A.x, B.x) > vx1 + 60 || Math.max(A.y, B.y) < vy0 - 60 || Math.min(A.y, B.y) > vy1 + 60); };
    const es = map.edges.filter(evis);
    x.lineCap = "round";
    for (const pass of [0, 1]) for (const e of es) {
      const A = map.nodes[e.a], B = map.nodes[e.b];
      x.strokeStyle = COL[e.type][pass]; x.lineWidth = RW[e.type][pass];
      x.beginPath(); x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); x.stroke();
    }
    for (const e of es) {
      const A = map.nodes[e.a], B = map.nodes[e.b], dx = (B.x - A.x) / e.len, dy = (B.y - A.y) / e.len, an = Math.atan2(dy, dx);
      if (!e.oneway) {
        x.strokeStyle = e.type === "h" ? "#fde047" : "#fff"; x.lineWidth = e.type === "l" ? 2 : 3; x.setLineDash([18, 18]);
        x.beginPath(); x.moveTo(A.x + dx * 36, A.y + dy * 36); x.lineTo(B.x - dx * 36, B.y - dy * 36); x.stroke(); x.setLineDash([]);
      } else {
        const fwd = e.oneway === e.a ? 1 : -1;
        for (let f = 0.25; f < 0.9; f += 0.25) { x.save(); x.translate(A.x + dx * e.len * f, A.y + dy * e.len * f); x.rotate(an + (fwd < 0 ? Math.PI : 0)); x.fillStyle = "#fff"; x.beginPath(); x.moveTo(14, 0); x.lineTo(-6, -10); x.lineTo(-6, 10); x.closePath(); x.fill(); x.fillRect(-20, -3, 16, 6); x.restore(); }
      }
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      if (e.works) {
        x.save(); x.translate(mx, my); x.rotate(an + Math.PI / 2);
        for (let i = -2; i <= 2; i++) { x.fillStyle = i % 2 ? "#f97316" : "#fff"; x.fillRect(i * 12 - 6, -6, 12, 12); }
        x.restore(); emo(x, "🚧", mx + dy * 46, my - dx * 46, 40);
      }
      if (e.zone) { x.save(); x.translate(A.x + dx * e.len * 0.3, A.y + dy * e.len * 0.3); x.rotate(Math.abs(an) > Math.PI / 2 ? an + Math.PI : an); text(x, String(e.zone), 0, 0, 26, "#fff", "#dc2626", 5); x.restore(); }
      if (e.radar != null) {
        const rx = A.x + dx * e.len * e.radar - dy * (RW[e.type][0] / 2 + 22), ry = A.y + dy * e.len * e.radar + dx * (RW[e.type][0] / 2 + 22);
        if (vis(rx, ry)) { x.fillStyle = "#475569"; rr(x, rx - 14, ry - 14, 28, 28, 6); x.fill(); emo(x, "📷", rx, ry, 20); }
      }
      if (e.stars) for (const s of e.stars) {
        if (s.got) continue;
        const sx = A.x + dx * e.len * s.f, sy = A.y + dy * e.len * s.f;
        if (vis(sx, sy)) emo(x, "⭐", sx, sy, 28 + Math.sin((o.t || 0) * 5 + s.f * 9) * 3);
      }
    }
    // التقاطعات والإشارات الضوئية
    for (const k of map.lights) {
      const n = map.nodes[k]; if (!vis(n.x, n.y)) continue;
      const green = lightGreen(map, k, o.t || 0);
      x.fillStyle = "#1f2937"; rr(x, n.x + 34, n.y - 50, 20, 40, 6); x.fill();
      x.fillStyle = green ? "#3f3f46" : "#ef4444"; x.beginPath(); x.arc(n.x + 44, n.y - 40, 7, 0, 6.283); x.fill();
      x.fillStyle = green ? "#22c55e" : "#3f3f46"; x.beginPath(); x.arc(n.x + 44, n.y - 21, 7, 0, 6.283); x.fill();
    }
    if (o.labels !== false) labels(x, map, es, z, vis);
    // البداية والهدف
    for (const [k, col] of [[map.start, "#16a34a"], [map.goal, "#dc2626"]]) {
      const n = map.nodes[k]; if (!vis(n.x, n.y, 200)) continue;
      const big = 1 / Math.max(z, 0.3);
      if (k === map.goal) { x.strokeStyle = col; x.lineWidth = 6 * big; x.beginPath(); x.arc(n.x, n.y, (40 + Math.sin((o.t || 0) * 4) * 6) * Math.min(big, 2.5), 0, 6.283); x.stroke(); }
      x.save(); x.translate(n.x, n.y); x.scale(Math.min(big, 3), Math.min(big, 3));
      x.fillStyle = col; x.fillRect(-2, -78, 5, 60);
      x.beginPath(); x.moveTo(3, -78); x.lineTo(40, -66); x.lineTo(3, -54); x.closePath(); x.fill();
      emo(x, n.emo || (k === map.goal ? "🏁" : "🚩"), 0, -100, 40);
      x.restore();
    }
    x.restore();
  }
  function labels(x, map, es, z, vis) {
    const k = 1 / Math.max(z, 0.3);
    if (map.kind === "city") {
      const seen = new Set();
      for (const e of es) {
        const A = map.nodes[e.a], B = map.nodes[e.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        if (!vis(mx, my) || e.works) continue;
        const key = e.name + Math.round((A.y + B.y) / 2 / 200) + Math.round((A.x + B.x) / 2 / 900);
        if (z < 0.6 && seen.has(key)) continue; seen.add(key);
        let an = Math.atan2(B.y - A.y, B.x - A.x); if (an > Math.PI / 2) an -= Math.PI; if (an < -Math.PI / 2) an += Math.PI;
        x.save(); x.translate(mx, my); x.rotate(an); text(x, e.name, 0, 0, Math.min(17 * k, 34), "#fff", "#111827", Math.min(4 * k, 8)); x.restore();
      }
      for (const p of map.places) {
        const { G } = map.grid, px = p.cell[0] * G + G / 2, py = p.cell[1] * G + (p.h || 1) * G / 2;
        if (vis(px, py)) text(x, p.name, px, py + 60, Math.min(22 * k, 44), "#fff", "#1e3a8a", Math.min(6 * k, 12));
      }
    } else {
      for (const e of es) {
        if (e.type === "l") continue;
        const A = map.nodes[e.a], B = map.nodes[e.b], mx = A.x + (B.x - A.x) * 0.42, my = A.y + (B.y - A.y) * 0.42;
        if (!vis(mx, my)) continue;
        const s = Math.min(k, 3.2);
        x.save(); x.translate(mx, my); x.scale(s, s);
        x.fillStyle = e.type === "h" ? (e.name[0] === "E" ? "#16a34a" : "#1d4ed8") : "#fff"; rr(x, -26, -14, 52, 28, 6); x.fill();
        x.lineWidth = 2; x.strokeStyle = e.type === "h" ? "#fff" : "#111827"; x.stroke();
        text(x, e.name, 0, 1, 18, e.type === "h" ? "#fff" : "#111827");
        x.restore();
      }
      for (const kk in map.nodes) {
        const n = map.nodes[kk]; if (!vis(n.x, n.y, 300)) continue;
        const s = Math.min(k, 3.2) * (n.size === 3 ? 1.25 : n.size === 2 ? 1.05 : 0.85);
        if (z < 0.35 && n.size === 1 && kk !== map.start && kk !== map.goal) continue;
        x.save(); x.translate(n.x, n.y + 26 + 10 * s); x.scale(s, s);
        text(x, (n.emo ? n.emo + " " : "") + n.name, 0, 0, 30, "#fff", "#0f172a", 7);
        x.restore();
      }
    }
  }
  function tree(x, px, py, s) { x.fillStyle = "rgba(0,0,0,.15)"; x.beginPath(); x.arc(px + 4, py + 5, s, 0, 6.283); x.fill(); x.fillStyle = "#15803d"; x.beginPath(); x.arc(px, py, s, 0, 6.283); x.fill(); x.fillStyle = "#22c55e"; x.beginPath(); x.arc(px - s * 0.3, py - s * 0.3, s * 0.55, 0, 6.283); x.fill(); }
  function drawPlace(x, p, px, py, s, hh, t) {
    if (p.kind === "park") {
      x.fillStyle = "#4ade80"; rr(x, px, py, s, hh, 20); x.fill();
      x.strokeStyle = "#fde68a"; x.lineWidth = 14; x.beginPath(); x.moveTo(px + 20, py + hh * 0.7); x.quadraticCurveTo(px + s / 2, py + hh * 0.3, px + s - 20, py + hh * 0.6); x.stroke();
      x.fillStyle = "#38bdf8"; x.beginPath(); x.ellipse(px + s * 0.5, py + hh * 0.45, 50, 32, 0, 0, 6.283); x.fill();
      for (let i = 0; i < 12; i++) tree(x, px + 30 + ((i * 53) % (s - 60)), py + 30 + ((i * 97) % (hh - 60)), 18);
      emo(x, "🌳", px + s * 0.25, py + hh * 0.25, 50); emo(x, "🛝", px + s * 0.72, py + hh * 0.8, 44);
      return;
    }
    x.fillStyle = "#d1d5db"; rr(x, px, py, s, hh, 16); x.fill();
    if (p.kind === "burger") {
      x.fillStyle = "#9ca3af"; for (let i = 0; i < 5; i++) x.fillRect(px + 20 + i * 44, py + hh - 70, 3, 50);
      x.fillStyle = "#b91c1c"; rr(x, px + s * 0.42, py + 20, s * 0.52, hh * 0.5, 12); x.fill();
      x.fillStyle = "#facc15"; rr(x, px + s * 0.42, py + 20, s * 0.52, 22, 8); x.fill();
      emo(x, "🍔", px + s * 0.68, py + 20 + hh * 0.27, 70); emo(x, "🍟", px + s * 0.18, py + 60, 40);
    } else if (p.kind === "church") {
      x.fillStyle = "#e7e5e4"; rr(x, px + 10, py + 10, s - 20, hh - 20, 12); x.fill();
      x.fillStyle = "#78716c"; rr(x, px + s * 0.3, py + 40, s * 0.4, hh * 0.55, 6); x.fill();
      emo(x, "⛪", px + s / 2, py + hh * 0.42, 74); emo(x, "⛲", px + s * 0.2, py + hh * 0.78, 36);
    } else if (p.kind === "station") {
      x.fillStyle = "#57534e"; for (let i = 0; i < 2; i++) x.fillRect(px, py + 30 + i * 26, s, 6);
      x.fillStyle = "#a16207"; rr(x, px + 30, py + 90, s - 60, hh - 120, 10); x.fill();
      emo(x, "🚉", px + s / 2, py + hh * 0.62, 64);
    } else if (p.kind === "stadium") {
      x.fillStyle = "#16a34a"; rr(x, px + 20, py + 20, s - 40, hh - 40, 14); x.fill();
      x.strokeStyle = "#fff"; x.lineWidth = 3; x.strokeRect(px + 34, py + 34, s - 68, hh - 68); x.beginPath(); x.moveTo(px + s / 2, py + 34); x.lineTo(px + s / 2, py + hh - 34); x.stroke();
      x.beginPath(); x.arc(px + s / 2, py + hh / 2, 26, 0, 6.283); x.stroke(); emo(x, "⚽", px + s / 2, py + hh / 2, 30);
    } else if (p.kind === "school") {
      x.fillStyle = "#fb923c"; rr(x, px + 20, py + 20, s - 40, hh * 0.45, 10); x.fill();
      x.fillStyle = "#fde68a"; rr(x, px + 20, py + hh * 0.6, s - 40, hh * 0.3, 10); x.fill();
      emo(x, "🏫", px + s / 2, py + hh * 0.3, 62); emo(x, "🧒", px + s * 0.3, py + hh * 0.75, 30); emo(x, "👧", px + s * 0.6, py + hh * 0.75, 30);
    } else if (p.kind === "pool") {
      x.fillStyle = "#0ea5e9"; rr(x, px + 30, py + 30, s - 60, hh - 60, 16); x.fill();
      x.strokeStyle = "#e0f2fe"; x.lineWidth = 3; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(px + 30, py + 30 + i * (hh - 60) / 4); x.lineTo(px + s - 30, py + 30 + i * (hh - 60) / 4); x.stroke(); }
      emo(x, "🏊", px + s / 2, py + hh / 2, 50);
    } else if (p.kind === "shop") {
      x.fillStyle = "#60a5fa"; rr(x, px + 20, py + 20, s - 40, hh * 0.5, 10); x.fill();
      emo(x, "🛒", px + s / 2, py + hh * 0.3, 60);
      x.fillStyle = "#9ca3af"; for (let i = 0; i < 5; i++) x.fillRect(px + 30 + i * 40, py + hh - 80, 3, 50);
    }
  }
  function lightGreen(map, k, t) { const i = map.lights.indexOf(k); return ((t + i * 2.3) % 8) < 4.5; }

  // ---------------------------------------------------------------- الشاشات (HTML)
  K.start(home);
  function home() {
    K.begin();
    const veh = save.veh ? vehOf(save.veh) : null;
    K.paint(`
      <div class="hero"><div class="flag"><i></i><i></i><i></i></div>
        <div><h1 class="ttl">شوارع بلجيكا</h1><div class="sub big">ابحث عن أقصر طريق، واحترم السرعة!</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:#16a34a" ${K.act("play", () => K.show(save.veh ? stagesScreen : vehicleScreen))}><span class="big">🗺️</span><b>العب</b><small>${save.unlocked > 1 ? `المرحلة ${Math.min(save.unlocked, STAGES.length)}` : "المرحلة الأولى"}</small></button>
        <button class="mode f" style="background:#2563eb" ${K.act("veh", () => K.show(vehicleScreen))}><span class="big">${veh ? veh.emo : "🚗"}</span><b>اختر مركبتك</b><small>${veh ? (veh.id === "car" ? brandOf(save.brand).name : veh.name) : "سيارة، طيارة…"}</small></button>
        <button class="mode f" style="background:#f59e0b" ${K.act("how", () => K.show(howScreen))}><span class="big">🎮</span><b>كيف ألعب؟</b><small>الأزرار والقواعد</small></button>
      </div>
      <div class="pill gold">⭐ ${save.total} نجمة جمعتها</div>
      ${K.HELP}`, "play");
    K.tts("شوارع بلجيكا");
  }
  function vehicleScreen() {
    K.begin();
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="ttl">اختر مركبتك</h2><span></span></div>
      <div class="vgrid">${VEHICLES.map((v) => `<button class="vcard f ${save.veh === v.id ? "on" : ""}" ${K.act("v" + v.id, () => pickVeh(v))}>
        ${art(v.id, v.id === "car" ? save.brand : "", 230, 150)}<b>${v.name}</b><small>${v.fly ? "تطير فوق كل شيء" : `حتى ${v.max} كم/س`}</small></button>`).join("")}</div>
      ${K.HELP}`, "v" + (save.veh || "car"));
    K.onFocus = (el) => { const v = VEHICLES.find((q) => "v" + q.id === el.dataset.k); if (v) K.tts(v.name); };
  }
  function pickVeh(v) {
    K.onFocus = null; save.veh = v.id; save.save(); K.sfx.ok();
    if (v.id === "car") K.replace(brandScreen); else K.replace(stagesScreen);
  }
  function brandScreen() {
    K.begin();
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="ttl">اختر السيارة</h2><span></span></div>
      <div class="bgrid">${BRANDS.map((b) => `<button class="bcard f ${save.brand === b.id ? "on" : ""}" ${K.act("b" + b.id, () => { save.brand = b.id; save.save(); K.sfx.ok(); K.onFocus = null; K.replace(stagesScreen); })}>
        ${art("car", b.id, 190, 110)}<b>${b.name}</b></button>`).join("")}</div>
      <div class="sub">الأسماء فقط للعب، والسيارات مرسومة بلا شعارات</div>
      ${K.HELP}`, "b" + save.brand);
    K.onFocus = (el) => { const b = BRANDS.find((q) => "b" + q.id === el.dataset.k); if (b) K.tts(b.name); };
  }
  function art(vid, brand, w, h) {
    const id = "a" + Math.random().toString(36).slice(2, 8);
    K.later(() => {
      const c = document.getElementById(id); if (!c) return;
      const x = c.getContext("2d");
      x.fillStyle = "#64748b"; rr(x, 0, h * 0.2, w, h * 0.6, 14); x.fill();
      x.strokeStyle = "#fff"; x.setLineDash([16, 12]); x.lineWidth = 3; x.beginPath(); x.moveTo(8, h / 2); x.lineTo(w - 8, h / 2); x.stroke(); x.setLineDash([]);
      if (vid === "plane") { x.fillStyle = "#7dd3fc"; rr(x, 0, 0, w, h, 14); x.fill(); }
      drawVehicle(x, vid, brand, w / 2, h / 2, Math.PI, Math.min(w / 90, h / 50) * (vid === "plane" ? 0.55 : 1), 0.3);
    }, 0);
    return `<canvas id="${id}" class="art" width="${w}" height="${h}"></canvas>`;
  }
  function stagesScreen() {
    K.begin(); K.onFocus = null;
    const v = vehOf(save.veh);
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="ttl">المراحل</h2><button class="btn f" ${K.act("veh", () => K.show(vehicleScreen))}>${v.emo} ${v.id === "car" ? brandOf(save.brand).name : v.name}</button></div>
      <div class="sgrid">${STAGES.map((s) => {
        const lock = s.id > save.unlocked, b = save.best[s.id];
        const from = s.city ? s.fromName : REGION.towns[s.from][0], to = s.city ? s.toName : REGION.towns[s.to][0];
        const fe = s.city ? s.fromEmo : REGION.towns[s.from][4] || "🏘️", te = s.city ? s.toEmo : REGION.towns[s.to][4] || "🏙️";
        return `<button class="scard f ${lock ? "locked" : ""}" style="--c:${s.color}" ${K.act("s" + s.id, () => (lock ? (K.sfx.bad(), K.tts("أكمل المرحلة السابقة أولاً")) : K.show(playScreen, s)))}>
          <span class="num">${s.id}</span><span class="emo">${lock ? "🔒" : fe + " ➜ " + te}</span><b>${from}</b><small>إلى ${to}</small>
          <span class="st">${b ? K.starsHtml(b.r) + ` <i>⭐${b.s}</i>` : ""}</span></button>`;
      }).join("")}</div>
      ${K.HELP}`, "s" + Math.min(save.unlocked, STAGES.length));
  }
  function howScreen() {
    K.begin();
    K.paint(`
      <div class="top">${K.backBtn()}<h2 class="ttl">كيف ألعب؟</h2><span></span></div>
      <div class="note how">
        <div>🗺️ انظر إلى الخريطة أولاً وابحث عن <b>أقصر طريق</b> من البداية 🚩 إلى الهدف 🏁.</div>
        <div>⬅️➡️ <b>الأسهم أو العصا اليسرى</b>: المقود. ⬆️ بنزين، ⬇️ فرامل ثم رجوع للخلف.</div>
        <div>${dia(0)} <b>الزر السفلي</b> (أو Enter): بنزين. ${dia(2)} <b>الزر الأيسر</b> (أو B): فرامل ورجوع.</div>
        <div>${dia(3)} <b>الزر العلوي</b> (أو M): الخريطة الكبيرة. قبل كل تقاطع تظهر لوحة بأسماء الطرق والمسافة.</div>
        <div>${dia(1)} <b>الزر الأيمن</b> (أو Backspace): استراحة.</div>
        <div>⭐ اجمع النجوم. 📷 الرادار يأخذ نجمتين إن تجاوزت السرعة. 💥 الاصطدام بسيارة يأخذ نجمة.</div>
        <div>🚦 تجاوز الإشارة الحمراء أو ⛔ السير عكس <b>الاتجاه الواحد</b> (الأسهم البيضاء) يأخذ نجمة. 🚧 الطريق المغلق لا يُعبر.</div>
      </div>
      ${K.HELP}`);
  }
  // الأزرار الأربعة اليمنى كمعيّن، والمقصود مضيء (البند 52)
  function dia(pos) {
    const P = [[12, 22], [22, 12], [2, 12], [12, 2]];
    return `<svg class="dia" viewBox="0 0 30 30">${P.map(([cx, cy], i) => `<circle cx="${cx + 3}" cy="${cy + 3}" r="5" fill="${i === pos ? "#f59e0b" : "#cbd5e1"}" stroke="#1e3a8a" stroke-width="1.2"/>`).join("")}</svg>`;
  }

  // ---------------------------------------------------------------- اللعب
  // القيادة حرّة: المقود يميناً ويساراً، بنزين وفرامل ورجوع. السيارة تبقى داخل الشوارع (الرصيف يوقفها).
  // ثلاثي الأبعاد إن توفر WebGL، وإلا من فوق (2D).
  function playScreen(st) {
    K.begin(); K.onFocus = null;
    const map = build(st), veh = vehOf(save.veh || "car"), fly = !!veh.fly;
    const best = fly ? { len: dist(map.nodes[map.start], map.nodes[map.goal]), path: [map.start, map.goal] } : shortest(map, map.start, map.goal);
    const fromName = st.city ? st.fromName : map.nodes[map.start].name, toName = st.city ? st.toName : map.nodes[map.goal].name;
    const r = rng(st.id * 13 + (fly ? 3 : 0));
    const city = map.kind === "city";
    const HALF = city ? { c: 27 } : { h: 32, n: 25, l: 20 };   // نصف عرض الطريق (كما في drive3d.js)
    const halfOf = (e) => HALF[e.type] + (city ? 4 : 8);
    // النجوم على الطرق (أو في السماء للطيارة)
    const birds = [], skyStars = [];
    if (!fly) map.edges.forEach((e) => { if (e.works) return; const n = Math.max(0, Math.round(e.len / 380) - (r() < 0.4 ? 1 : 0)); e.stars = []; for (let i = 0; i < n; i++) e.stars.push({ f: (i + 0.5 + (r() - 0.5) * 0.3) / n }); });
    else {
      const A = map.nodes[map.start], B = map.nodes[map.goal], L = dist(A, B);
      for (let d = 260; d < L - 120; d += 220) { const f = d / L, o = (r() - 0.5) * 360; skyStars.push({ x: A.x + (B.x - A.x) * f - (B.y - A.y) / L * o, y: A.y + (B.y - A.y) * f + (B.x - A.x) / L * o }); }
      for (let i = 0; i < Math.max(6, L / 500); i++) { const f = 0.15 + r() * 0.75; birds.push({ x: A.x + (B.x - A.x) * f + (r() - 0.5) * 500, y: A.y + (B.y - A.y) * f + (r() - 0.5) * 500, a: r() * 6.28, s: 50 + r() * 40 }); }
    }
    // سيارات أخرى تسير على الطرق
    const NCOL = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#14b8a6", "#f97316", "#64748b", "#ec4899", "#0ea5e9"];
    const npcs = [];
    if (!fly) {
      const okE = map.edges.filter((e) => !e.works && e.len > 200);
      const S0 = map.nodes[map.start];
      for (let i = 0; i < (city ? 12 : 16) && okE.length; i++) {
        const e = okE[(r() * okE.length) | 0], from = canGo(e, e.a) ? e.a : e.b;
        const n = { e, from, to: other(e, from), t: e.len * (0.2 + r() * 0.6), c: NCOL[i % NCOL.length], stop: 0 };
        const p = npcPos(n); if (Math.hypot(p.x - S0.x, p.y - S0.y) < 450) continue;
        npcs.push(n);
      }
    }
    function lane(e) { return e.oneway ? 0 : city ? 13 : e.type === "h" ? 16 : e.type === "n" ? 12 : 10; }
    function npcPos(n) { const A = map.nodes[n.from], B = map.nodes[n.to], f = n.t / n.e.len, dx = (B.x - A.x) / n.e.len, dy = (B.y - A.y) / n.e.len, L = lane(n.e); return { x: A.x + (B.x - A.x) * f - dy * L, y: A.y + (B.y - A.y) * f + dx * L, a: Math.atan2(dy, dx) }; }

    // اللاعب
    const S = map.nodes[map.start], G0 = map.nodes[map.goal];
    const P = { x: S.x, y: S.y, a: 0, v: 0, steer: 0, alt: fly ? 250 : 0, roll: 0, trail: [{ x: S.x, y: S.y }], drove: 0 };
    { // يبدأ على أطول طريق من نقطة البداية نحو الهدف تقريباً (بلا كشف أقصر طريق)
      const ex = map.adj[map.start].filter((e) => canGo(e, map.start));
      let bestE = null, bs = -2;
      for (const e of ex) { const O = map.nodes[other(e, map.start)], d = ((O.x - S.x) * (G0.x - S.x) + (O.y - S.y) * (G0.y - S.y)) / (e.len * dist(S, G0)); if (d > bs) { bs = d; bestE = e; } }
      P.a = fly || !bestE ? Math.atan2(G0.y - S.y, G0.x - S.x) : Math.atan2(map.nodes[other(bestE, map.start)].y - S.y, map.nodes[other(bestE, map.start)].x - S.x);
      if (!fly && bestE) { const dx = Math.cos(P.a), dy = Math.sin(P.a), L = lane(bestE); P.x += dx * 30 - dy * L; P.y += dy * 30 + dx * L; }
    }
    P.camA = P.a;
    const st8 = { phase: "map", t: 0, stars: 0, lost: 0, radars: 0, hits: 0, wrong: 0, reds: 0, cool: 0, msg: null, msgT: 0, count: 0, bigMap: false, paused: false, end: false, over: 0 };
    const camMap = fitCam(map.b);
    let cam = { ...camMap };
    const mini = makeMini();
    const d3 = window.D3 && D3.available() ? D3.build(map, { veh: veh.id, fly, brandColor: brandOf(save.brand).color, brandShape: brandOf(save.brand).shape, npcs, skyStars, birds }) : null;
    const radars = map.edges.filter((e) => e.radar != null).map((e) => { const A = map.nodes[e.a], B = map.nodes[e.b]; return { e, x: A.x + (B.x - A.x) * e.radar, y: A.y + (B.y - A.y) * e.radar, armed: true }; });
    const lightState = {};

    function fitCam(b) { const w = b.x1 - b.x0, h = b.y1 - b.y0; return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: Math.min((W - 80) / w, (H - 190) / h) }; }
    function makeMini() {
      const b = map.b, w = b.x1 - b.x0, h = b.y1 - b.y0, s = Math.min(300 / w, 200 / h);
      const c = document.createElement("canvas"); c.width = Math.ceil(w * s) + 16; c.height = Math.ceil(h * s) + 16;
      const x = c.getContext("2d");
      x.fillStyle = "rgba(255,255,255,.92)"; rr(x, 0, 0, c.width, c.height, 12); x.fill();
      x.translate(8, 8); x.scale(s, s); x.translate(-b.x0, -b.y0);
      x.lineCap = "round";
      for (const e of map.edges) { const A = map.nodes[e.a], B = map.nodes[e.b]; x.strokeStyle = e.works ? "#f97316" : e.type === "h" ? "#1d4ed8" : "#64748b"; x.lineWidth = (e.type === "h" ? 5 : 3) / s; x.beginPath(); x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); x.stroke(); }
      for (const [k, col] of [[map.start, "#16a34a"], [map.goal, "#dc2626"]]) { const n = map.nodes[k]; x.fillStyle = col; x.beginPath(); x.arc(n.x, n.y, 7 / s, 0, 6.283); x.fill(); }
      return { c, s, b };
    }
    const say = (m, color = "#1e3a8a") => { st8.msg = m; st8.msgT = 2.4; st8.msgC = color; };
    // أقرب طريق إلى نقطة
    function near(x, y) {
      let bestN = null;
      for (const e of map.edges) {
        const A = map.nodes[e.a], B = map.nodes[e.b], dx = B.x - A.x, dy = B.y - A.y;
        const t = clamp(((x - A.x) * dx + (y - A.y) * dy) / (e.len * e.len), 0, 1), px = A.x + dx * t, py = A.y + dy * t, d = Math.hypot(x - px, y - py);
        const over = d - halfOf(e);
        if (!bestN || over < bestN.over) bestN = { e, t: t * e.len, d, px, py, over };
      }
      return bestN;
    }

    // ---------------- الإدخال
    const keys = new Set();
    const pad = { b: [], x: 0, y: 0 };
    let gas = false, brake = false, steerIn = 0;
    function ok() { if (st8.phase === "map") begin(); }
    function begin() { st8.phase = "count"; st8.count = 3.2; K.stopSound(); }

    // ---------------- التحديث
    let last = performance.now(), raf = 0, running = true;
    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!st8.paused) update(dt);
      render();
      raf = requestAnimationFrame(loop);
    }
    function update(dt) {
      st8.t += dt;
      if (st8.msgT > 0) st8.msgT -= dt;
      if (st8.cool > 0) st8.cool -= dt;
      for (const n of npcs) npcStep(n, dt);
      if (st8.phase === "map") return;
      if (st8.phase === "count") {
        const before = Math.ceil(st8.count); st8.count -= dt;
        const after = Math.ceil(st8.count);
        if (after !== before) { if (after > 0) snd.beep(520); else { snd.beep(990); K.tts("انطلق"); } }
        if (st8.count <= 0) st8.phase = "drive";
        camFollow(dt); return;
      }
      if (st8.phase !== "drive") { camFollow(dt); return; }
      // المقود: لوحة المفاتيح أو العصا (تدريجي) أو الأسهم
      const kSteer = (keys.has("ArrowLeft") ? -1 : 0) + (keys.has("ArrowRight") ? 1 : 0);
      const want = kSteer || pad.x;
      P.steer += (want - P.steer) * Math.min(1, dt * 10);
      // السرعة
      const g2 = gas || keys.has("ArrowUp") || pad.y < -0.6, b2 = brake || keys.has("ArrowDown") || pad.y > 0.6;
      const acc = (fly ? 70 : veh.id === "moto" ? 60 : 48) * (1 - Math.max(0, P.v) / veh.max * 0.55);
      if (g2) P.v += (P.v < 0 ? 140 : acc) * dt;
      else if (b2) P.v -= (P.v > 0 ? 130 : 22) * dt;
      else P.v -= Math.sign(P.v) * Math.min(Math.abs(P.v), 16 * dt);
      P.v = clamp(P.v, fly ? 0 : -25, veh.max);
      const prev = { x: P.x, y: P.y };
      if (fly) flyUpdate(dt); else roadUpdate(dt);
      P.drove += Math.hypot(P.x - prev.x, P.y - prev.y);
      P.camA = turnTo(P.camA, P.v < -1 ? P.camA : P.a, dt * 3.5);
      const lp = P.trail[P.trail.length - 1];
      if (Math.hypot(P.x - lp.x, P.y - lp.y) > 30) P.trail.push({ x: P.x, y: P.y });
      camFollow(dt);
      if (dist(P, G0) < (fly ? 80 : 60)) arrive();
    }
    function camFollow(dt) { // للعرض من فوق (بلا WebGL)
      const z = (fly ? 0.78 : 1.0) - Math.min(0.22, Math.abs(P.v) / 700);
      const lead = Math.min(140, P.v * 0.9);
      const tx = P.x + Math.cos(P.a) * lead, ty = P.y + Math.sin(P.a) * lead;
      const f = 1 - Math.pow(0.004, dt);
      cam = { x: cam.x + (tx - cam.x) * f, y: cam.y + (ty - cam.y) * f, z: cam.z + (z - cam.z) * f };
    }
    function roadUpdate(dt) {
      const sp = Math.abs(P.v);
      const turn = P.steer * 1.9 * clamp(sp / 35, 0, 1) * (1 - Math.min(0.45, sp / 330)) * Math.sign(P.v || 1);
      P.a += turn * dt;
      P.roll = P.steer * clamp(sp / 80, 0, 1) * 0.4;
      P.x += Math.cos(P.a) * P.v * map.pxk * dt; P.y += Math.sin(P.a) * P.v * map.pxk * dt;
      // داخل الطريق: الرصيف يمنع الخروج
      let n = near(P.x, P.y);
      const lim = n.e.limit;
      st8.edge = n.e;
      if (n.over > -8) {
        const k = (halfOf(n.e) - 8) / (n.d || 1);
        P.x = n.px + (P.x - n.px) * k; P.y = n.py + (P.y - n.py) * k;
        if (sp > 25) { P.v *= Math.pow(0.25, dt); if (st8.t - (st8.curbT || 0) > 2.5) { st8.curbT = st8.t; snd.no(); say("⚠️ انتبه للرصيف!", "#c2410c"); } }
      }
      // طريق مغلق
      if (n.e.works && Math.abs(n.t - n.e.len / 2) < 30) {
        const A = map.nodes[n.e.a], B = map.nodes[n.e.b], s = n.t < n.e.len / 2 ? -1 : 1, f = (n.e.len / 2 + s * 30) / n.e.len;
        const dxn = (B.x - A.x) / n.e.len, dyn = (B.y - A.y) / n.e.len, off = (P.x - n.px) * -dyn + (P.y - n.py) * dxn;
        P.x = A.x + (B.x - A.x) * f - dyn * off; P.y = A.y + (B.y - A.y) * f + dxn * off;
        if (sp > 3) { P.v = 0; snd.no(); say("🚧 الطريق مغلق! ابحث عن طريق آخر", "#c2410c"); }
      }
      // اتجاه واحد: ممنوع عكسه
      if (n.e.oneway && sp > 6 && n.t > 50 && n.t < n.e.len - 50) {
        const A = map.nodes[n.e.oneway], B = map.nodes[other(n.e, n.e.oneway)];
        const dot = (Math.cos(P.a) * (B.x - A.x) + Math.sin(P.a) * (B.y - A.y)) / n.e.len * Math.sign(P.v);
        if (dot < -0.5 && st8.t - (st8.wrongT || -9) > 5) { st8.wrongT = st8.t; st8.wrong++; lose(1); snd.no(); say("⛔ اتجاه ممنوع! هذا الشارع باتجاه واحد: نقصت نجمة", "#dc2626"); }
      }
      // الإشارة الحمراء
      for (const k of map.lights) {
        const N = map.nodes[k], d = Math.hypot(P.x - N.x, P.y - N.y), inside = d < 40, was = lightState[k];
        if (inside && !was && sp > 8 && !lightGreen(map, k, st8.t)) { st8.reds++; lose(1); snd.flash(); say("🚦 تجاوزت الإشارة الحمراء! نقصت نجمة", "#dc2626"); }
        lightState[k] = inside;
      }
      // الرادار
      for (const rd of radars) {
        const d = Math.hypot(P.x - rd.x, P.y - rd.y);
        if (rd.armed && d < 50) {
          rd.armed = false;
          if (sp > rd.e.limit + 4) { st8.radars++; lose(2); snd.flash(); st8.flashT = 0.35; say(`📸 رادار! سرعتك ${Math.round(sp)} والحد ${rd.e.limit}: نقصت نجمتان`, "#dc2626"); }
          else say("📷 رادار: سرعتك جيدة 👍", "#15803d");
        } else if (d > 140) rd.armed = true;
      }
      // النجوم
      for (const e of map.edges) if (e.stars) for (const s of e.stars) {
        if (s.got) continue;
        const A = map.nodes[e.a], B = map.nodes[e.b];
        if (Math.hypot(A.x + (B.x - A.x) * s.f - P.x, A.y + (B.y - A.y) * s.f - P.y) < 34) { s.got = true; st8.stars++; snd.star(); }
      }
      // السيارات الأخرى
      for (const c of npcs) {
        const q = npcPos(c), d = Math.hypot(q.x - P.x, q.y - P.y);
        if (d < 46) {
          const ux = (P.x - q.x) / (d || 1), uy = (P.y - q.y) / (d || 1);
          P.x = q.x + ux * 46; P.y = q.y + uy * 46;
          if (st8.cool <= 0 && sp > 15) hit();
          P.v *= 0.3;
        }
      }
      // تنبيه السرعة الزائدة
      if (P.v > lim + 8) { st8.over += dt; if (st8.over > 1.2) { st8.over = -2.5; snd.beep(880); say(`🐢 خفّف السرعة! الحد ${lim}`, "#c2410c"); } }
      else st8.over = Math.min(st8.over, 0);
    }
    function turnTo(a, b, k) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + clamp(d, -k, k); }
    function flyUpdate(dt) {
      P.a += P.steer * 1.5 * dt;
      P.roll += (P.steer * 0.5 - P.roll) * Math.min(1, dt * 4);
      const sp = P.v * 1.6;
      P.x = clamp(P.x + Math.cos(P.a) * sp * dt, map.b.x0, map.b.x1); P.y = clamp(P.y + Math.sin(P.a) * sp * dt, map.b.y0, map.b.y1);
      for (const s of skyStars) if (!s.got && Math.hypot(s.x - P.x, s.y - P.y) < 50) { s.got = true; st8.stars++; snd.star(); }
      for (const b of birds) if (Math.hypot(b.x - P.x, b.y - P.y) < 44 && st8.cool <= 0) hit("🐦 اصطدمت بطائر! نقصت نجمة");
    }
    function npcStep(n, dt) {
      if (fly) return;
      let v = n.e.limit * 0.98 * map.pxk;
      const q = npcPos(n), hx = Math.cos(q.a), hy = Math.sin(q.a), dx = P.x - q.x, dy = P.y - q.y, ahead = dx * hx + dy * hy, side = Math.abs(dx * -hy + dy * hx);
      if (ahead > 40 && ahead < 200 && side < 34) v = 0; // اللاعب أمامها: تنتظر
      for (const o of npcs) if (o !== n && o.e === n.e && o.from === n.from && o.t > n.t && o.t - n.t < 80) v = 0;
      n.t += v * dt;
      if (n.t >= n.e.len) {
        const node = n.to;
        if (map.lights.includes(node) && !lightGreen(map, node, st8.t)) { n.t = n.e.len; return; }
        const ex = map.adj[node].filter((e) => canGo(e, node) && e !== n.e);
        const e = ex.length ? ex[(Math.random() * ex.length) | 0] : n.e;
        n.e = e; n.from = e === n.e && !ex.length ? node : node; n.to = other(e, node); n.t = 0;
      }
    }
    function lose(k) { const l = Math.min(st8.stars, k); st8.stars -= l; st8.lost += l; }
    function hit(m) {
      st8.hits++; st8.cool = 1.6; lose(1); snd.bump(); st8.shake = 0.4;
      say(m || "💥 انتبه! اصطدمت بسيارة: نقصت نجمة", "#dc2626");
    }
    function arrive() {
      if (st8.end) return;
      st8.end = true; st8.phase = "done"; P.v = 0; snd.arrive(); K.confetti(30, "⭐🎉🏁✨");
      K.tts(`وصلت إلى ${toName}!`);
      P.trail.push({ x: G0.x, y: G0.y });
      setTimeout(() => { if (running) K.replace(resultScreen, { st, map, best, P, st8, fly, fromName, toName }); }, 1800);
    }

    // ---------------- الرسم
    function render() {
      const full = st8.phase === "map" || st8.bigMap;
      const use3d = d3 && !full;
      if (d3) d3.show(use3d);
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (use3d) {
        g.clearRect(0, 0, cv.width, cv.height);
        d3.render({ x: P.x, y: P.y, a: P.a, camA: P.camA, v: Math.abs(P.v), alt: P.alt, roll: P.roll, t: st8.t, npcs: npcs.map(npcPos), lightGreen: (k) => lightGreen(map, k, st8.t) });
        g.setTransform(VS, 0, 0, VS, VX, VY);
      } else {
        g.fillStyle = "#0f172a"; g.fillRect(0, 0, cv.width, cv.height);
        g.setTransform(VS, 0, 0, VS, VX, VY);
        g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
        let c = full ? camMap : cam;
        if (st8.shake > 0 && !full) c = { ...c, x: c.x + (Math.random() - 0.5) * 14, y: c.y + (Math.random() - 0.5) * 14 };
        drawWorld(g, map, c, { t: st8.t });
        g.save(); g.translate(W / 2, H / 2); g.scale(c.z, c.z); g.translate(-c.x, -c.y);
        if (full && P.trail.length > 1) { g.strokeStyle = "rgba(37,99,235,.8)"; g.lineWidth = 10 / c.z; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); P.trail.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.lineTo(P.x, P.y); g.stroke(); }
        for (const s of skyStars) if (!s.got) emo(g, "⭐", s.x, s.y, 34);
        for (const n of npcs) { const p = npcPos(n); drawVehicle(g, "npc", n.c, p.x, p.y, p.a, 0.8, st8.t); }
        const vs = full ? Math.max(1, 0.9 / c.z) : 1;
        drawVehicle(g, veh.id, save.brand, P.x, P.y, P.a, vs * (fly ? 0.9 : veh.id === "moto" ? 1.1 : 1), st8.t);
        for (const b of birds) emo(g, "🐦", b.x, b.y, 34);
        g.restore();
        g.restore();
      }
      if (st8.shake > 0) st8.shake -= 1 / 60;
      for (const b of birds) { b.a += 0.01; b.x += Math.cos(b.a) * b.s / 60; b.y += Math.sin(b.a * 0.7) * b.s / 60; }
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
      if (st8.flashT > 0) { st8.flashT -= 1 / 60; g.fillStyle = `rgba(255,255,255,${st8.flashT * 2})`; g.fillRect(0, 0, W, H); }
      hud(full);
      g.restore();
    }
    // لوحة التقاطع القادم: الطرق الخارجة منه بالنسبة لاتجاه السيارة، مع أسمائها والمسافة
    function junction() {
      const e = st8.edge; if (!e || fly) return null;
      const hx = Math.cos(P.a), hy = Math.sin(P.a);
      let node = null, dmin = 1e9;
      for (const k of [e.a, e.b]) { const N = map.nodes[k], dx = N.x - P.x, dy = N.y - P.y, d = Math.hypot(dx, dy); if ((dx * hx + dy * hy) / (d || 1) > 0.3 && d < dmin) { dmin = d; node = k; } }
      if (!node || dmin > 330 || node === map.goal) return null;
      const N = map.nodes[node], out = [];
      for (const q of map.adj[node]) {
        if (q === e) continue;
        const O = map.nodes[other(q, node)], ang = Math.atan2(O.y - N.y, O.x - N.x);
        let rel = ang - P.a; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI;
        out.push({ rel, q, ok: canGo(q, node), label: city ? q.name : `${O.name} ${fmtKm(map, q.len)}` });
      }
      out.sort((a, b) => a.rel - b.rel);
      return { node, d: dmin, out };
    }
    function hud(full) {
      g.fillStyle = "rgba(15,23,42,.72)"; rr(g, 330, 10, 620, 60, 30); g.fill();
      text(g, `${fromName} ⬅ ${toName}`, 640, 41, 30, "#fff");
      g.fillStyle = "rgba(255,255,255,.95)"; rr(g, W - 190, 10, 175, 60, 30); g.fill();
      text(g, `⭐ ${st8.stars}`, W - 102, 42, 36, "#b45309");
      if (st8.phase === "map") {
        g.fillStyle = "rgba(255,255,255,.95)"; rr(g, 140, H - 150, W - 280, 130, 30); g.fill();
        text(g, `🔎 ابحث عن أقصر طريق إلى ${toName}`, W / 2, H - 112, 38, "#1e3a8a");
        text(g, fly ? "الطيارة تطير فوق كل شيء: أقصر طريق هو الخط المستقيم ✈️" : "🚧 طريق مغلق  ·  ➡ اتجاه واحد  ·  📷 رادار  ·  🚦 إشارة", W / 2, H - 70, 26, "#475569");
        const pulse = 1 + Math.sin(st8.t * 5) * 0.04;
        g.save(); g.translate(W / 2, H - 28); g.scale(pulse, pulse); g.fillStyle = "#16a34a"; rr(g, -190, -22, 380, 44, 22); g.fill();
        text(g, "اضغط الزر السفلي أو Enter للانطلاق", 0, 1, 24, "#fff"); g.restore();
        return;
      }
      if (st8.phase === "count") {
        const n = Math.ceil(st8.count);
        g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, 0, W, H);
        g.fillStyle = "#1f2937"; rr(g, W / 2 - 60, H / 2 - 150, 120, 300, 30); g.fill();
        [["#ef4444", 3], ["#f59e0b", 2], ["#22c55e", 1]].forEach(([c, k], i) => { g.fillStyle = n === k || (k === 1 && n <= 0) ? c : "#374151"; g.beginPath(); g.arc(W / 2, H / 2 - 95 + i * 95, 38, 0, 6.283); g.fill(); });
        text(g, n > 0 ? String(n) : "انطلق!", W / 2 + 200, H / 2, 110, "#fff", "#1e3a8a", 14);
        text(g, fly ? "↑ أو الزر السفلي: أسرع · ⬅ ➡ للتوجيه" : "↑ أو الزر السفلي: بنزين · ⬅ ➡ المقود · ↓ أو الزر الأيسر: فرامل", W / 2, H - 50, 28, "#fff", "#0f172a", 7);
        return;
      }
      if (!full) {
        const m = mini; g.drawImage(m.c, 14, 14);
        g.save(); g.translate(22, 22); g.scale(m.s, m.s); g.translate(-m.b.x0, -m.b.y0);
        g.strokeStyle = "rgba(37,99,235,.9)"; g.lineWidth = 4 / m.s; g.lineCap = "round"; g.beginPath(); P.trail.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.lineTo(P.x, P.y); g.stroke();
        g.translate(P.x, P.y); g.rotate(P.a); g.fillStyle = "#f59e0b"; g.strokeStyle = "#fff"; g.lineWidth = 2.5 / m.s;
        g.beginPath(); g.moveTo(12 / m.s, 0); g.lineTo(-8 / m.s, -8 / m.s); g.lineTo(-8 / m.s, 8 / m.s); g.closePath(); g.fill(); g.stroke();
        g.restore();
      } else {
        g.fillStyle = "rgba(15,23,42,.72)"; rr(g, 20, H - 70, 420, 50, 25); g.fill();
        text(g, "🗺️ الخريطة الكبيرة (الزر العلوي أو M)", 230, H - 44, 22, "#fff");
      }
      // عدّاد السرعة
      const lim = fly ? 0 : st8.edge ? st8.edge.limit : 0, sp = Math.abs(P.v), over = lim && sp > lim + 4;
      g.fillStyle = "rgba(15,23,42,.8)"; g.beginPath(); g.arc(W - 110, H - 105, 88, 0, 6.283); g.fill();
      g.strokeStyle = over ? "#ef4444" : "#22c55e"; g.lineWidth = 12; g.beginPath(); g.arc(W - 110, H - 105, 76, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, sp / veh.max)); g.stroke();
      text(g, String(Math.round(sp)), W - 110, H - 115, 56, over ? "#fca5a5" : "#fff");
      text(g, P.v < -1 ? "رجوع" : "كم/س", W - 110, H - 68, 22, "#cbd5e1");
      if (lim) { g.fillStyle = "#fff"; g.beginPath(); g.arc(W - 230, H - 60, 42, 0, 6.283); g.fill(); g.strokeStyle = "#dc2626"; g.lineWidth = 9; g.stroke(); text(g, String(lim), W - 230, H - 58, 32, "#111827"); }
      g.fillStyle = "rgba(255,255,255,.95)"; rr(g, W - 190, 78, 175, 46, 23); g.fill();
      text(g, "🛣️ " + fmtKm(map, P.drove), W - 102, 102, 24, "#1e3a8a");
      // لوحة التقاطع
      const J = !full && st8.phase === "drive" ? junction() : null;
      if (J && J.out.length) {
        const n = J.out.length, tw = 230, x0 = W / 2 - (n * tw + (n - 1) * 10) / 2;
        g.fillStyle = "rgba(15,23,42,.55)"; rr(g, x0 - 14, H - 128, n * tw + (n - 1) * 10 + 28, 112, 22); g.fill();
        text(g, `تقاطع بعد ${fmtKm(map, J.d)}`, W / 2, H - 140, 22, "#fff", "#0f172a", 6);
        J.out.forEach((o, i) => {
          const x = x0 + i * (tw + 10);
          const col = !o.ok ? "#94a3b8" : city ? "#ffffff" : o.q.type === "h" ? (o.q.name[0] === "E" ? "#16a34a" : "#1d4ed8") : "#ffffff";
          const dark = col === "#16a34a" || col === "#1d4ed8";
          g.fillStyle = col; rr(g, x, H - 118, tw, 92, 16); g.fill(); g.lineWidth = 3; g.strokeStyle = "#0f172a"; g.stroke();
          g.save(); g.translate(x + tw / 2, H - 88); g.rotate(o.rel); g.fillStyle = dark ? "#fff" : "#0f172a";
          g.beginPath(); g.moveTo(0, -20); g.lineTo(14, -4); g.lineTo(5, -4); g.lineTo(5, 18); g.lineTo(-5, 18); g.lineTo(-5, -4); g.lineTo(-14, -4); g.closePath(); g.fill(); g.restore();
          let lab = (o.ok ? "" : "🚫 ") + o.label; g.font = FONT(20); while (g.measureText(lab).width > tw - 14 && lab.length > 4) lab = lab.slice(0, -2) + "…";
          text(g, lab, x + tw / 2, H - 46, 20, dark ? "#fff" : "#0f172a");
        });
      } else if (st8.phase === "drive" && Math.abs(P.v) < 2 && !gas && st8.t > 1) {
        g.fillStyle = "rgba(255,255,255,.9)"; rr(g, W / 2 - 290, H - 86, 580, 54, 27); g.fill();
        g.save(); g.translate(W / 2 - 250, H - 59); diaC(0); g.restore();
        text(g, "الزر السفلي أو ↑ أو Enter: بنزين", W / 2 + 20, H - 58, 26, "#1e3a8a");
      }
      if (st8.msgT > 0 && st8.msg) {
        g.globalAlpha = Math.min(1, st8.msgT * 2);
        g.font = FONT(30); const tw = g.measureText(st8.msg).width + 60;
        g.fillStyle = "rgba(255,255,255,.96)"; rr(g, W / 2 - tw / 2, 84, tw, 56, 28); g.fill();
        text(g, st8.msg, W / 2, 113, 30, st8.msgC); g.globalAlpha = 1;
      }
    }
    function diaC(pos) { [[0, 12], [12, 0], [-12, 0], [0, -12]].forEach(([a, b], i) => { g.fillStyle = i === pos ? "#f59e0b" : "#cbd5e1"; g.beginPath(); g.arc(a, b, 6, 0, 6.283); g.fill(); g.strokeStyle = "#1e3a8a"; g.lineWidth = 1.5; g.stroke(); }); }

    // ---------------- الاستراحة
    function setPause(on) {
      st8.paused = on;
      if (on) {
        K.begin(); keys.clear(); gas = brake = false;
        K.app.innerHTML = `<section class="screen"><div class="pause"><h1>⏸️ استراحة</h1>
          <button class="btn f go" data-k="cont">▶ أكمل</button>
          <button class="btn f" data-k="re">🔁 ابدأ المرحلة من جديد</button>
          <button class="btn f" data-k="menu">🗺️ المراحل</button></div></section>`;
        K.act("cont", () => setPause(false)); K.act("re", () => K.replace(playScreen, st)); K.act("menu", () => K.back());
        K.focus(K.app.querySelector('[data-k="cont"]'));
        pad.b1hold = true;
      } else { K.app.innerHTML = ""; last = performance.now(); pad.skip = true; }
    }

    // ---------------- ربط الإدخال
    const DRIVEK = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    K.mode = {
      key(e) {
        if (st8.paused) { if (e.key === "Backspace") { setPause(false); return true; } return false; }
        if (e.pad) return true;
        if (e.key === "Backspace") { if (st8.phase === "map") { K.back(); return true; } setPause(true); return true; }
        if (DRIVEK.has(e.key)) { keys.add(e.key); if (e.key === "ArrowUp" && !e.repeat) ok(); return true; }
        if (e.key === "Enter" || e.key === " ") { keys.add(e.key); if (!e.repeat) ok(); gas = true; return true; }
        if (e.key === "b" || e.key === "B" || e.key === "Shift") { keys.add(e.key); brake = true; return true; }
        if (e.key === "m" || e.key === "M" || e.key === "Tab") { if (!e.repeat && st8.phase === "drive") st8.bigMap = !st8.bigMap; return true; }
        return true;
      },
      keyup(e) {
        keys.delete(e.key);
        if (e.key === "Enter" || e.key === " ") gas = false;
        if (e.key === "b" || e.key === "B" || e.key === "Shift") brake = false;
      },
      poll(list) {
        const gp = list[0];
        if (st8.paused) {
          if (!gp) return false;
          const b1 = !!(gp.buttons[1] && gp.buttons[1].pressed);
          if (pad.b1hold) { if (!b1) pad.b1hold = false; return true; }
          return false;
        }
        if (!list.length) { pad.x = 0; pad.y = 0; return true; }
        let ax = 0, ay = 0; const btn = [];
        for (const p of list) {
          const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
          for (let i = 0; i < 16; i++) btn[i] = btn[i] || b(i);
          if (Math.abs(p.axes[0] || 0) > Math.abs(ax)) ax = p.axes[0] || 0;
          if (Math.abs(p.axes[1] || 0) > Math.abs(ay)) ay = p.axes[1] || 0;
        }
        // المقود تدريجي بالعصا، وكامل بالأسهم
        pad.x = btn[14] ? -1 : btn[15] ? 1 : Math.abs(ax) > 0.12 ? ax : 0;
        pad.y = btn[12] ? -1 : btn[13] ? 1 : ay;
        if (pad.skip) { pad.skip = false; pad.b = btn.slice(); return true; }
        const edge = (i) => btn[i] && !pad.b[i];
        if (edge(0) || edge(12)) ok();
        if (edge(1)) { if (st8.phase === "map") pad.backArm = true; else setPause(true); }
        if (pad.backArm && !btn[1]) { pad.backArm = false; K.back(); return true; }
        if (edge(3) && st8.phase === "drive") st8.bigMap = !st8.bigMap;
        gas = btn[0] || keys.has("Enter") || keys.has(" ");
        brake = btn[2] || keys.has("b") || keys.has("B");
        pad.b = btn.slice();
        return true;
      },
      stop() { running = false; cancelAnimationFrame(raf); document.body.classList.remove("playing"); if (d3) d3.dispose(); },
    };
    document.body.classList.add("playing");
    K.app.innerHTML = "";
    window.__belgium.cur = { P, map, best, st8, npcs, d3: !!d3 };
    raf = requestAnimationFrame(loop);
    K.tts(`ابحث عن أقصر طريق من ${fromName} إلى ${toName}`);
  }

  // ---------------------------------------------------------------- النتيجة
  function resultScreen(R) {
    K.begin();
    const { st, map, best, P, st8, fly, toName } = R;
    const ratio = P.drove / best.len;
    const r = ratio <= 1.04 ? 3 : ratio <= 1.3 ? 2 : 1;
    if (!R.saved) {
      R.saved = true;
      const b = save.best[st.id] || { r: 0, s: 0 };
      save.best[st.id] = { r: Math.max(b.r, r), s: Math.max(b.s, st8.stars) };
      save.total += st8.stars;
      if (save.unlocked <= st.id) save.unlocked = st.id + 1;
      save.save();
    }
    const msg = r === 3 ? "ممتاز! وجدت أقصر طريق 🏆" : r === 2 ? "أحسنت! طريقك قريب من الأقصر 👏" : "وصلت! لكن يوجد طريق أقصر 💪";
    const nxt = STAGES.find((s) => s.id === st.id + 1);
    const id = "rm" + Math.random().toString(36).slice(2, 7);
    K.paint(`
      <div class="top">${K.backBtn("→ المراحل")}<h2 class="ttl small">وصلت إلى ${K.esc(toName)}!</h2><span class="pill">المرحلة ${st.id}</span></div>
      <div class="res">
        <canvas id="${id}" class="rmap" width="760" height="430"></canvas>
        <div class="rinfo">
          <div class="rmsg">${msg}</div>
          <div class="stars">${K.starsHtml(r)}</div>
          <div class="row"><i class="dot me"></i> طريقك: <b>${fmtKm(map, P.drove)}</b></div>
          <div class="row"><i class="dot best"></i> ${fly ? "الخط المستقيم" : "أقصر طريق"}: <b>${fmtKm(map, best.len)}</b></div>
          <div class="row">⭐ نجوم جمعتها: <b>${st8.stars}</b></div>
          ${st8.radars ? `<div class="row bad">📸 رادار: ${st8.radars} ${st8.radars > 1 ? "مرات" : "مرة"}</div>` : ""}
          ${st8.hits ? `<div class="row bad">💥 اصطدام: ${st8.hits}</div>` : ""}
        </div>
      </div>
      <div class="nav">
        <button class="btn f" ${K.act("again", () => K.replace(playScreen, st))}><span class="emo">🔁</span> مرة أخرى</button>
        ${nxt ? `<button class="btn f go" ${K.act("next", () => K.replace(playScreen, nxt))}>المرحلة ${nxt.id} ←</button>` : `<button class="btn f go" ${K.act("next", () => K.home())}>🎉 أنهيت كل المراحل!</button>`}
        <button class="btn f" ${K.act("home", K.back)}><span class="emo">🗺️</span> المراحل</button>
      </div>
      ${K.HELP}`, r >= 2 ? "next" : "again");
    swallow();
    K.sfx.win(); K.confetti(r * 14);
    K.tts(r === 3 ? "ممتاز! وجدت أقصر طريق" : r === 2 ? "أحسنت! طريقك قريب من الأقصر" : "وصلت! لكن يوجد طريق أقصر");
    K.later(() => {
      const c = document.getElementById(id); if (!c) return;
      const x = c.getContext("2d"), b = map.b, s = Math.min(c.width / (b.x1 - b.x0), c.height / (b.y1 - b.y0));
      x.save(); x.scale(c.width / W, c.height / H);
      const cam = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: s * W / c.width };
      drawWorld(x, map, cam, { t: 0, labels: true });
      x.translate(W / 2, H / 2); x.scale(cam.z, cam.z); x.translate(-cam.x, -cam.y);
      x.lineCap = "round"; x.lineJoin = "round";
      x.strokeStyle = "rgba(22,163,74,.9)"; x.lineWidth = 16 / cam.z; x.setLineDash([30 / cam.z, 20 / cam.z]);
      x.beginPath(); best.path.forEach((k, i) => { const n = map.nodes[k]; i ? x.lineTo(n.x, n.y) : x.moveTo(n.x, n.y); }); x.stroke(); x.setLineDash([]);
      x.strokeStyle = "rgba(37,99,235,.85)"; x.lineWidth = 9 / cam.z;
      x.beginPath(); P.trail.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y))); x.stroke();
      x.restore();
    }, 0);
  }

  // بعد الوصول قد يبقى زر البنزين مضغوطاً: لا يُعدّ ضغطة على أزرار الشاشة حتى يُرفع
  function swallow() {
    const t0 = performance.now();
    K.mode = {
      key(e) { return !!e.repeat && performance.now() - t0 < 3000; },
      poll(list) {
        const any = list.some((p) => [0, 1, 2, 3].some((i) => p.buttons[i] && p.buttons[i].pressed));
        if (!any) { K.mode = null; return false; }
        return true;
      },
    };
  }

  // للاختبار الآلي
  window.__belgium = { build, shortest, STAGES, save };
})();
