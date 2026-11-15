// الطائرات — يقود الطفل طائرة لطيفة فوق مناظر تتحرك: رحلة حرّة، التوصيل (الإقلاع والهبوط)، وحول العالم.
// التحكم: ↑ ↓ للارتفاع والنزول، ← → للإبطاء والإسراع، Enter أو ✕ لإسقاط الطرد، Backspace أو ○ استراحة.
// اللاعب الثاني (رحلة حرّة): W و S أو يد التحكم الثانية. اللمس: اسحب إصبعك لتوجيه الطائرة.
// بلا عنف: إن اصطدمت الطائرة بطائر أو غيمة رعدية تهتز قليلاً وتكمل.
(() => {
  "use strict";
  const GAME = "الطائرات";
  const { SCENES, FREE_ORDER, PLANES, COLORS, DELIVERY, COUNTRIES, TRIPS } = D;
  const save = K.store("planes", { plane: "prop", color: "red", total: 0, best: {}, dUnlocked: 1, trips: {}, tUnlocked: 1, visited: {}, freeBest: 0, earnDay: "", earnN: 0 });
  const H = 720, GY = 640, SEG = 4600, PS = 0.8; // PS = حجم الطائرة
  const BOT = { prop: 43, jet: 40, heli: 42, sea: 46 }; // المسافة من مركز الطائرة إلى عجلاتها
  const planeOf = (id) => PLANES.find((p) => p.id === id) || PLANES[0];
  const colorOf = (id) => COLORS.find((c) => c.id === id) || COLORS[0];
  const cv = document.createElement("canvas"); cv.id = "cv"; document.body.insertBefore(cv, K.app);
  const g = cv.getContext("2d");
  const FONT = (px, w = 800) => `${w} ${px}px Baloo, "Noto Sans Arabic", Tahoma, sans-serif`;

  // ---------------------------------------------------------------- الأصوات
  const snd = {
    star() { K.tone(1175, 0.07, "triangle", 0.08); K.tone(1568, 0.1, "triangle", 0.07, 0.05); },
    balloon() { [784, 988, 1175, 1568].forEach((f, i) => K.tone(f, 0.1, "triangle", 0.09, i * 0.05)); },
    bump() { K.tone(330, 0.1, "sine", 0.12); K.tone(250, 0.16, "sine", 0.1, 0.08); },
    drop() { K.tone(700, 0.08, "sine", 0.08); K.tone(500, 0.12, "sine", 0.07, 0.06); },
    deliver() { [660, 880, 1100].forEach((f, i) => K.tone(f, 0.14, "triangle", 0.1, i * 0.08)); },
    miss() { K.tone(420, 0.12, "sine", 0.07); K.tone(320, 0.18, "sine", 0.06, 0.09); },
    land() { [523, 659, 784, 1047].forEach((f, i) => K.tone(f, 0.2, "triangle", 0.1, i * 0.12)); },
    lift() { K.tone(300, 0.3, "sine", 0.06); K.tone(450, 0.3, "sine", 0.05, 0.15); },
  };

  // ---------------------------------------------------------------- النجوم من السيرفر (باعتدال: حتى 5 في اليوم من هذه اللعبة)
  function earn(amount, reason, elId) {
    const day = new Date().toDateString();
    if (save.earnDay !== day) { save.earnDay = day; save.earnN = 0; }
    amount = Math.min(amount, 5 - save.earnN);
    if (amount <= 0) return;
    save.earnN += amount; save.save();
    try {
      fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, game: GAME, reason }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && d.added > 0) { const e = document.getElementById(elId); if (e) e.innerHTML = `<span class="emo">⭐</span> +${d.added} في رصيدك!`; } })
        .catch(() => {});
    } catch {}
  }
  // ما فُتح بعد إضافة نجوم جديدة
  function addTotal(n) {
    const before = save.total;
    save.total += n; save.save();
    const got = [...PLANES.filter((p) => p.need > before && p.need <= save.total).map((p) => p.name), ...COLORS.filter((c) => c.need > before && c.need <= save.total).map(() => "لون جديد")];
    return [...new Set(got)];
  }

  // صورة صغيرة من الرسم (للبطاقات)
  function canvasHtml(w, h, cls, draw) { const id = "c" + Math.random().toString(36).slice(2, 8); K.later(() => { const c = document.getElementById(id); if (c) draw(c.getContext("2d"), c); }, 0); return `<canvas id="${id}" class="${cls}" width="${w}" height="${h}"></canvas>`; }
  const planeArt = (type, col, w = 260, h = 150, cls = "pl") => canvasHtml(w, h, cls, (x) => R.plane(x, type, colorOf(col), w / 2 - 6, h / 2 + 6, -0.04, 0.3, Math.min(w / 220, h / 130)));
  const flagUrl = (id, w = 300, h = 200) => { const c = document.createElement("canvas"); c.width = w; c.height = h; R.flag(c.getContext("2d"), id, 0, 0, w, h); return c.toDataURL(); };
  function landmarkScene(x, c, id, t = 0) {
    const sc = SCENES[COUNTRIES[id].scene], W = c.width, Hh = c.height;
    const gr = x.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, sc.sky[0]); gr.addColorStop(1, sc.sky[1]);
    x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
    if (sc === SCENES.night) { x.fillStyle = "#fef9c3"; R.circ(x, W * 0.82, Hh * 0.18, 22); x.fill(); }
    R.cloud(x, W * 0.2, Hh * 0.18, 0.5, "#fff", 0.85);
    x.fillStyle = id === "sa" || id === "ae" || id === "eg" ? "#efc673" : "#7cc65f"; x.fillRect(0, Hh * 0.86, W, Hh);
    const s = Math.min(W / 420, Hh / 430);
    R.landmark(x, id, W / 2, Hh * 0.88, s, t);
  }
  const landmarkUrl = (id) => { const c = document.createElement("canvas"); c.width = 420; c.height = 320; landmarkScene(c.getContext("2d"), c, id, 1); return c.toDataURL(); };

  // ---------------------------------------------------------------- الشاشة الأولى
  function home() {
    K.begin();
    const P = planeOf(save.plane);
    K.paint(`<div class="hero">${canvasHtml(330, 190, "heroP", (x, c) => heroAnim(x, c))}
        <div><h1 class="logo">الطائرات</h1><div class="sub">طِر فوق المدن والبحار والصحارى، واجمع النجوم! ✈️</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#38bdf8,#6366f1)" ${K.act("free", () => K.show(freeMenu))}><span class="big emo">☁️</span><b>رحلة حرّة</b><small>نجوم ومناطيد بين الغيوم</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#f59e0b,#ef4444)" ${K.act("deliv", () => K.show(deliveryMenu))}><span class="big emo">📦</span><b>التوصيل</b><small>أقلِع، أسقط الطرود، واهبط</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#22c55e,#0ea5e9)" ${K.act("world", () => K.show(worldMenu))}><span class="big emo">🌍</span><b>حول العالم</b><small>أعلام ومعالم البلدان</small></button>
      </div>
      <div class="mini">
        <button class="btn f" ${K.act("hangar", () => K.show(hangar))}><span class="emo">🛩️</span> طائراتي: ${P.name}</button>
        <span class="pill"><span class="emo">⭐</span> ${save.total}</span>
      </div>${K.HELP}`, "free");
  }
  function heroAnim(x, c) {
    const P = planeOf(save.plane), col = colorOf(save.color);
    const t0 = performance.now();
    const loop = () => {
      if (!document.body.contains(c)) return;
      const t = (performance.now() - t0) / 1000;
      x.clearRect(0, 0, c.width, c.height);
      R.cloud(x, 70 - ((t * 40) % 420) + 400, 150, 0.5, "#fff", 0.9);
      R.plane(x, P.id, col, 165, 92 + Math.sin(t * 2) * 8, Math.cos(t * 2) * -0.06, t, 1.15);
      requestAnimationFrame(loop);
    };
    loop();
  }

  // ---------------------------------------------------------------- طائراتي
  function hangar() {
    K.begin();
    const planes = PLANES.map((p) => {
      const open = save.total >= p.need, on = save.plane === p.id;
      return `<button class="hcard f ${on ? "on" : ""} ${open ? "" : "no"}" ${K.act("p_" + p.id, () => { if (!open) return K.sfx.bad(); save.plane = p.id; save.save(); K.sfx.pop(); K.render(); })}>
        ${planeArt(p.id, save.color, 240, 140)}<b>${p.name}</b><small>${open ? (on ? "✅ مختارة" : "اختر") : `🔒 ⭐ ${p.need}`}</small></button>`;
    }).join("");
    const cols = COLORS.map((c) => {
      const open = save.total >= c.need, on = save.color === c.id;
      return `<button class="col f ${on ? "on" : ""}" style="--c:${c.c}" ${K.act("c_" + c.id, () => { if (!open) return K.sfx.bad(); save.color = c.id; save.save(); K.sfx.pop(); K.render(); })}>${open ? (on ? "✓" : "") : `<small>🔒${c.need}</small>`}</button>`;
    }).join("");
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">🛩️ طائراتي</h2><span class="pill"><span class="emo">⭐</span> ${save.total}</span></div>
      <div class="hgrid">${planes}</div>
      <div class="cols">${cols}</div>
      <div class="sub">اجمع النجوم في الرحلات لتفتح طائرات وألواناً جديدة</div>${K.HELP}`, "p_" + save.plane);
  }

  // ---------------------------------------------------------------- القوائم
  function freeMenu() {
    K.begin();
    const pads = K.pads().length;
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">☁️ رحلة حرّة</h2><span class="pill">أفضل رحلة: ⭐ ${save.freeBest}</span></div>
      <div class="scenes">${FREE_ORDER.map((s) => `<span><span class="emo">${SCENES[s].emo}</span>${SCENES[s].name}</span>`).join("<i>←</i>")}</div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#38bdf8,#6366f1)" ${K.act("one", () => K.show(flight, { kind: "free", players: 1 }))}><span class="big emo">🧒</span><b>لاعب واحد</b><small>الأسهم أو يد التحكم أو اللمس</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#f472b6,#f59e0b)" ${K.act("two", () => K.show(flight, { kind: "free", players: 2 }))}><span class="big emo">👫</span><b>لاعبان</b><small>${pads >= 2 ? "يدا تحكم متصلتان ✅" : "يدان، أو الأسهم + W و S"}</small></button>
      </div>
      <div class="help">اجمع <b>⭐</b> النجوم و<b>🎈</b> المناطيد، وابتعد عن الطيور والغيوم الرعدية · <b>↑ ↓</b> ارتفع وانزل · <b>← →</b> أبطئ وأسرع</div>`, "one");
  }
  function deliveryMenu() {
    K.begin();
    const cards = DELIVERY.map((L, i) => {
      if (i >= save.dUnlocked) return `<div class="lv locked"><span class="emo">🔒</span></div>`;
      const b = save.best["d" + i];
      return `<button class="lv f" style="--c:${SCENES[L.scene].sky[0]}" ${K.act("L" + i, () => K.show(flight, { kind: "delivery", level: i }))}>
        <span class="emo">${SCENES[L.scene].emo}</span><b>${i + 1}. ${L.name}</b><small>📦 ${L.n} طرود</small><span class="st">${b ? K.starsHtml(b) : "جديدة ✨"}</span></button>`;
    }).join("");
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">📦 التوصيل</h2><span class="pill">${Object.keys(save.best).filter((k) => k[0] === "d").length} / ${DELIVERY.length}</span></div>
      <div class="lvgrid">${cards}</div>
      <div class="help"><b>↑</b> للإقلاع من المدرج · <b>Enter</b> أو <b>✕</b> لإسقاط الطرد فوق البيت المعلَّم · في النهاية اهبط في المطار <b>بهدوء</b></div>`, "L" + (Math.min(save.dUnlocked, DELIVERY.length) - 1));
  }
  function worldMenu() {
    K.begin();
    const cards = TRIPS.map((T, i) => {
      const open = i < save.tUnlocked, b = save.trips[i];
      const flags = T.list.map((id) => `<img src="${flagUrl(id, 90, 60)}" alt="">`).join("");
      return open
        ? `<button class="trip f" style="background:linear-gradient(135deg,${T.c[0]},${T.c[1]})" ${K.act("T" + i, () => K.show(flight, { kind: "world", trip: i, leg: 0 }))}><b><span class="emo">${T.emo}</span> ${T.name}</b><div class="tflags">${flags}</div><span class="st">${b ? K.starsHtml(b) : "رحلة جديدة ✨"}</span></button>`
        : `<div class="trip locked"><span class="emo">🔒</span><small>أكمل الرحلة السابقة</small></div>`;
    }).join("");
    const nv = Object.keys(save.visited).length;
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">🌍 حول العالم</h2><button class="btn f" ${K.act("pass", () => K.show(passport))}><span class="emo">🛂</span> جواز سفري ${nv} / ${Object.keys(COUNTRIES).length}</button></div>
      <div class="trips">${cards}</div>
      <div class="help">طِر من بلد إلى بلد، واهبط في المطار، وتعرّف على العلم والمَعلم · في آخر كل رحلة أسئلة صغيرة</div>`, "T" + (Math.min(save.tUnlocked, TRIPS.length) - 1));
  }
  function passport() {
    K.begin();
    const ids = Object.keys(COUNTRIES);
    const cells = ids.map((id) => save.visited[id]
      ? `<button class="pp f" ${K.act("v" + id, () => K.show(countryCard, { id }))}><img src="${flagUrl(id, 150, 100)}" alt=""><b>${COUNTRIES[id].n}</b></button>`
      : `<div class="pp no"><span class="emo">❔</span><b>؟</b></div>`).join("");
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">🛂 جواز سفري</h2><span class="pill">${Object.keys(save.visited).length} / ${ids.length}</span></div>
      <div class="ppgrid">${cells}</div>${K.HELP}`);
  }

  // ---------------------------------------------------------------- بطاقة البلد
  // o = { id, trip?, leg? } — مع trip تكون بعد الهبوط وفيها زر الرحلة التالية
  function countryCard(o) {
    K.begin();
    const C = COUNTRIES[o.id];
    save.visited[o.id] = true; save.save();
    const text = `${C.n}. عاصمتها ${C.cap}. وهنا ${C.lm}. ${C.fact}`;
    let nav = "";
    if (o.trip != null) {
      const T = TRIPS[o.trip], nx = T.list[o.leg + 1];
      nav = nx ? `<button class="btn f go" ${K.act("next", () => K.replace(flight, { kind: "world", trip: o.trip, leg: o.leg + 1 }))}>✈️ إلى ${COUNTRIES[nx].n} ←</button>`
        : `<button class="btn f go" ${K.act("next", () => K.replace(K.quizScreen, worldQuiz(o.trip)))}>🏁 أسئلة الرحلة ←</button>`;
    }
    let anim = 0;
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">${o.trip != null ? "وصلنا إلى " : ""}${C.n}! 🛬</h2><span class="pill">${o.trip != null ? `المحطة ${o.leg + 1} / ${TRIPS[o.trip].list.length}` : "🛂"}</span></div>
      <div class="card">
        <div class="cleft"><img class="cflag" src="${flagUrl(o.id)}" alt=""><div class="cinfo"><b>${C.n}</b><span>العاصمة: ${C.cap}</span></div></div>
        <div class="cright"><canvas id="lmc" width="560" height="400"></canvas><div class="lmname">${C.lm}</div></div>
      </div>
      <div class="fact">${C.fact}</div>
      <div class="nav"><button class="btn f" ${K.act("say", () => K.tts(text))}><span class="emo">🔊</span> اسمع</button>${nav}</div>`, o.trip != null ? "next" : "say");
    const c = document.getElementById("lmc"), x = c.getContext("2d"), t0 = performance.now();
    const loop = () => { if (!document.body.contains(c)) return cancelAnimationFrame(anim); landmarkScene(x, c, o.id, (performance.now() - t0) / 1000); anim = requestAnimationFrame(loop); };
    loop();
    K.later(() => K.tts(text), 400);
    if (o.trip != null) { K.sfx.win(); K.confetti(18, "✈️⭐🎉🌍"); }
  }
  function worldQuiz(ti) {
    const T = TRIPS[ti], all = Object.keys(COUNTRIES);
    return {
      title: T.name, optsCls: "txt",
      make() {
        const qs = [];
        const types = K.shuffle(["flag", "flag", "lm", "lm"]);
        T.list.forEach((id, i) => {
          const others = all.filter((x) => x !== id);
          const opts = K.shuffle([id, ...K.shuffle(T.list.filter((x) => x !== id)).slice(0, 1), ...K.shuffle(others.filter((x) => !T.list.includes(x))).slice(0, 1)]);
          const q = types[i] === "flag"
            ? `<img class="qimg" src="${flagUrl(id)}" alt=""><div class="q">علم أيّ بلد هذا؟</div>`
            : `<img class="qimg" src="${landmarkUrl(id)}" alt=""><div class="q">في أيّ بلد هذا المَعلم؟</div>`;
          qs.push({ prompt: q, opts: opts.map((x) => COUNTRIES[x].n), answer: opts.indexOf(id) });
        });
        return K.shuffle(qs);
      },
      done(score, s) {
        save.trips[ti] = Math.max(save.trips[ti] || 0, s);
        if (save.tUnlocked < ti + 2) save.tUnlocked = Math.min(TRIPS.length, ti + 2);
        save.save();
        earn(2, `أكمل رحلة «${T.name}»`, "earnq");
        return `<div class="sub" id="earnq"></div>`;
      },
      next: ti + 1 < TRIPS.length ? { label: `الرحلة التالية: ${TRIPS[ti + 1].name}`, fn: () => K.replace(flight, { kind: "world", trip: ti + 1, leg: 0 }) } : null,
    };
  }

  // ================================================================ الطيران
  // cfg = { kind: "free"|"delivery"|"world", players, level, trip, leg }
  function flight(cfg) {
    K.begin();
    const kind = cfg.kind, two = kind === "free" && cfg.players === 2;
    const DL = kind === "delivery" ? DELIVERY[cfg.level] : null;
    const dest = kind === "world" ? TRIPS[cfg.trip].list[cfg.leg] : null;
    const fixedScene = DL ? DL.scene : dest ? COUNTRIES[dest].scene : null;
    const goal = kind === "free" ? SEG * FREE_ORDER.length : 0;
    const legLen = 6800;
    let W = 1280, sc = 1, oy = 0, top = 0;

    // الطائرات
    const P1t = planeOf(save.plane), c1 = colorOf(save.color);
    const c2 = COLORS.find((c) => c.id !== c1.id && c.need <= save.total && c.id !== "yellow") || COLORS[1];
    const mk = (i, type, col) => ({ i, type, col, P: planeOf(type), y: two ? (i ? 430 : 250) : 330, vy: 0, speed: planeOf(type).cruise, shake: 0, inv: 0, stars: 0, balloons: 0, bumps: 0, state: "air", rollT: 0, sx: 0 });
    const pl = [mk(0, P1t.id, c1)];
    if (two) pl.push(mk(1, P1t.id, c2));
    const me = pl[0];

    const st = { t: 0, cam: 0, phase: kind === "delivery" ? "takeoff" : "fly", msg: "", msgT: 0, hint: "", delivered: 0, drops: 0, done: false, endT: 0 };
    const items = [], parcels = [], houses = [], parts = [], pops = [];
    let runway = null, startRw = null, spawnX = 900, houseX = 2500, houseK = 0, dropCool = 0;

    if (kind === "delivery") {
      startRw = { a: 0, b: 1400 };
      me.state = "ground"; me.speed = 0; me.y = GY - BOT[me.type] * PS; st.cam = -60;
      spawnX = 2200;
    }
    if (kind === "world") spawnX = 1200;

    const sceneAt = (x) => fixedScene || FREE_ORDER[Math.max(0, Math.min(FREE_ORDER.length - 1, Math.floor(x / SEG)))];
    const mixAt = (x) => {
      if (fixedScene) return { a: fixedScene, b: fixedScene, f: 0 };
      const i = Math.max(0, Math.floor(x / SEG)), f = x / SEG - i, ord = FREE_ORDER;
      const a = ord[Math.min(i, ord.length - 1)], b = ord[Math.min(i + 1, ord.length - 1)];
      const k = Math.max(0, (f - 0.86) / 0.14);
      return { a, b, f: k * k * (3 - 2 * k) };
    };
    const layerScene = (x, p) => sceneAt((x - W / 2) / p + W / 2);

    // ---------------- التحكم
    const keys = new Set();
    const touch = { on: false, y: 0 };
    const pads = [{}, {}];
    let paused = false, raf = 0, last = 0;
    document.body.classList.add("playing");
    K.paint(`<div class="hud">
        <button class="tbtn tpause" data-t="pause">⏸️</button>
        ${kind === "delivery" ? `<button class="tbtn tdrop" data-t="drop"><span class="emo">📦</span></button>` : ""}
      </div>
      <div id="pause" class="pause"><div class="pcard"><h1>استراحة ⏸️</h1>
        <div class="nav">
          <button class="btn f go" ${K.act("resume", () => setPause(false))}>▶️ متابعة</button>
          <button class="btn f" ${K.act("restart", () => K.replace(flight, cfg))}>🔁 من البداية</button>
          <button class="btn f" ${K.act("quit", () => K.back())}>🏠 خروج</button>
        </div></div></div>`, "resume");
    const hud = K.app.querySelector(".hud");
    hud.addEventListener("pointerdown", (e) => { const b = e.target.closest(".tbtn"); if (!b) return; e.preventDefault(); e.stopPropagation(); K.audioCtx(); if (b.dataset.t === "pause") setPause(true); else drop(me); });

    function setPause(on) {
      if (on && st.done) return;
      paused = on;
      document.getElementById("pause").classList.toggle("on", on);
      if (on) K.focus(K.app.querySelector('[data-k="resume"]'));
      keys.clear(); touch.on = false; last = 0;
    }
    const toLogical = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv.width / sc, y: (((e.clientY - r.top) / r.height) * cv.height - oy) / sc }; };
    const onDown = (e) => { if (paused) return; K.audioCtx(); touch.on = true; touch.y = toLogical(e).y; try { cv.setPointerCapture(e.pointerId); } catch {} };
    const onMove = (e) => { if (touch.on && (e.buttons || e.pointerType === "touch")) touch.y = toLogical(e).y; };
    const onUp = () => { touch.on = false; };
    cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp);
    const blur = () => { keys.clear(); touch.on = false; };
    window.addEventListener("blur", blur);

    const DROPK = { Enter: 1, " ": 1, x: 1, X: 1 };
    K.mode = {
      key(e) {
        if (paused) { if (e.key === "Backspace") { setPause(false); return true; } return false; }
        if (e.pad) return true;
        if (e.key === "Backspace") { setPause(true); return true; }
        if (st.done) return true;
        if (DROPK[e.key]) { if (!e.repeat) drop(me); return true; }
        keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
        return true;
      },
      keyup(e) { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); },
      poll(list) {
        if (paused) {
          const gp = list[0]; if (!gp) return false;
          const b1 = !!(gp.buttons[1] && gp.buttons[1].pressed), held = pads[0].b1 && b1; pads[0].b1 = b1;
          return held;
        }
        list.slice(0, 2).forEach((gp, i) => {
          const b = (n) => !!(gp.buttons[n] && gp.buttons[n].pressed), ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
          const s = pads[i];
          s.y = b(12) || ay < -0.35 ? -1 : b(13) || ay > 0.35 ? 1 : Math.abs(ay) > 0.15 ? ay : 0;
          s.x = b(14) || ax < -0.4 ? -1 : b(15) || ax > 0.4 ? 1 : 0;
          s.on = true;
          const p = pl[two ? i : 0];
          if (b(0) && !s.b0 && p) drop(p);
          if ((b(1) && !s.b1) || (b(9) && !s.b9)) setPause(true);
          s.b0 = b(0); s.b1 = b(1); s.b9 = b(9);
        });
        for (let i = list.length; i < 2; i++) pads[i] = {};
        return true;
      },
      stop() {
        cancelAnimationFrame(raf); document.body.classList.remove("playing");
        window.removeEventListener("blur", blur); removeEventListener("resize", fit);
        cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove); cv.removeEventListener("pointerup", onUp); cv.removeEventListener("pointercancel", onUp);
      },
    };
    function input(p) {
      let y = 0, x = 0;
      const k = (a) => keys.has(a);
      if (p.i === 0) {
        y = (k("ArrowDown") ? 1 : 0) - (k("ArrowUp") ? 1 : 0); x = (k("ArrowRight") ? 1 : 0) - (k("ArrowLeft") ? 1 : 0);
        if (!two) { y = y || (k("s") ? 1 : 0) - (k("w") ? 1 : 0); x = x || (k("d") ? 1 : 0) - (k("a") ? 1 : 0); }
        if (touch.on) y = Math.max(-1, Math.min(1, (touch.y - p.y) / 70));
      } else { y = (k("s") ? 1 : 0) - (k("w") ? 1 : 0); x = (k("d") ? 1 : 0) - (k("a") ? 1 : 0); }
      const pd = pads[two ? p.i : 0];
      if (pd && pd.on) { y = y || pd.y || 0; x = x || pd.x || 0; }
      return { y, x, touch: p.i === 0 && touch.on };
    }

    // ---------------- أدوات
    const say = (m, t = 2) => { st.msg = m; st.msgT = t; };
    const pop = (x, y, txt, col = "#fff") => pops.push({ x, y, txt, col, life: 1.2 });
    const sparkle = (x, y, col = "#fde047", n = 8) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 140; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, col }); } };
    const wx = (p) => st.cam + p.sx; // موقع الطائرة في العالم

    function drop(p) {
      if (kind !== "delivery" || paused || st.done || p.state !== "air" || dropCool > 0 || st.phase !== "deliver") return;
      dropCool = 0.55; st.drops++;
      parcels.push({ x: wx(p), y: p.y + 24, vx: p.speed * 0.55, vy: 40, landed: false, t: 0 });
      snd.drop();
    }

    // ---------------- ظهور الأشياء
    const rnd = Math.random;
    function spawn(x) {
      const scIdx = kind === "free" ? Math.floor(x / SEG) : cfg.level || cfg.leg || 0;
      const r = rnd(), lowCap = kind === "delivery" ? 470 : 560;
      const yy = () => 110 + rnd() * (lowCap - 110);
      if (r < 0.34) { const y = yy(); for (let i = 0; i < 5; i++) items.push({ t: "star", x: x + i * 60, y }); }
      else if (r < 0.56) { const y = yy(), a = 70 + rnd() * 50; for (let i = 0; i < 7; i++) items.push({ t: "star", x: x + i * 55, y: Math.max(90, Math.min(lowCap, y - Math.sin((i / 6) * Math.PI) * a)) }); }
      else if (r < 0.68) items.push({ t: "balloon", x, y: 140 + rnd() * 300, k: (rnd() * 5) | 0 });
      else {
        const hard = kind === "delivery" ? cfg.level >= 2 : true;
        if (!hard || (runway && x > runway.a - 1600)) { items.push({ t: "star", x, y: yy() }); return; }
        if (rnd() < 0.6 - scIdx * 0.04) { const n = 1 + ((rnd() * (1 + Math.min(2, scIdx / 2))) | 0); for (let i = 0; i < n; i++) items.push({ t: "bird", x: x + i * 70, y0: yy(), y: 0, ph: rnd() * 6, v: 50 + rnd() * 60, k: (rnd() * 4) | 0 }); }
        else items.push({ t: "storm", x, y: 160 + rnd() * 280 });
      }
    }
    function spawnHouses() {
      if (kind !== "delivery") return;
      while (houseX < st.cam + W + 600 && st.phase === "deliver") {
        const marked = houseK % 2 === 0 || houseK % 3 === 0;
        houses.push({ x: houseX, k: (Math.random() * 5) | 0, marked, done: false });
        houseK++;
        houseX += marked ? 700 + Math.random() * 300 : 500 + Math.random() * 200;
      }
    }

    // ---------------- الهبوط
    function placeRunway(x) { runway = { a: x, b: x + 1900 }; }
    function phaseCheck() {
      if (kind === "delivery" && st.phase === "deliver" && st.delivered >= DL.n && !parcels.some((q) => !q.landed)) {
        st.phase = "land"; placeRunway(Math.max(st.cam + W + 900, houseX + 400));
        say("أحسنت! وصلت كل الطرود 🎉 الآن اهبط في المطار", 3);
      }
      if (kind === "world" && st.phase === "fly" && st.cam > legLen) {
        st.phase = "land"; placeRunway(st.cam + W + 900);
        say(`اقتربنا من ${COUNTRIES[dest].n}! استعد للهبوط 🛬`, 3);
      }
    }

    // ---------------- خطوة
    function step(dt) {
      st.t += dt; dropCool = Math.max(0, dropCool - dt);
      if (st.msgT > 0) st.msgT -= dt;
      const lead = me;
      // السرعة
      pl.forEach((p) => {
        const inp = input(p), P = p.P;
        p.shake = Math.max(0, p.shake - dt); p.inv = Math.max(0, p.inv - dt);
        const pw = wx(p);
        if (p.state === "ground") {
          const go = inp.y < 0 || inp.x > 0 || inp.touch;
          if (go) p.speed = Math.min(P.cruise, p.speed + 150 * dt);
          const ready = p.speed >= P.min * 0.85;
          st.hint = !ready ? (p.speed < 5 ? "اضغط ↑ (أو المس الشاشة) لتسرع على المدرج 🛫" : "أسرع… أسرع…") : "الآن ↑ لتُقلع! 🛫";
          if ((ready && (inp.y < 0 || inp.touch)) || pw > startRw.b - 120) {
            p.state = "air"; p.vy = -170; snd.lift(); say("أقلعنا! ✈️ أسقط الطرود فوق البيوت المعلَّمة", 3);
            st.phase = "deliver"; houseX = Math.max(houseX, st.cam + W + 200);
          }
          p.y = GY - BOT[p.type] * PS;
          return;
        }
        if (p.state === "roll") {
          p.speed = Math.max(0, p.speed - (p.type === "heli" ? 600 : 230) * dt); p.vy = 0;
          if (p.speed <= 0) { p.rollT += dt; if (p.rollT > 0.9 && !st.done) finish(true); }
          return;
        }
        // في الجو
        let target = two ? P.cruise : inp.x < 0 ? P.min : inp.x > 0 ? P.max : P.cruise;
        if (runway && pw > runway.a - 900 && pw < runway.b) target = Math.min(target, p.type === "heli" ? 110 : Math.max(P.min, 190));
        p.speed += Math.sign(target - p.speed) * Math.min(Math.abs(target - p.speed), 260 * dt);
        const tv = inp.y * 300;
        p.vy += (tv - p.vy) * Math.min(1, dt * 4.5);
        p.y += p.vy * dt;
        const bot = BOT[p.type] * PS;
        const onRw = runway && pw > runway.a + 10 && pw < runway.b - 220;
        const floor = onRw ? GY - bot : GY - bot - 46;
        if (p.y < top + 115) { p.y = top + 115; p.vy = Math.max(0, p.vy); }
        if (p.y >= floor) {
          if (onRw) {
            if (p.vy <= 200) { p.state = "roll"; p.y = floor; p.vy = 0; snd.land(); say("هبوط رائع! 👏", 3); sparkle(p.sx, GY, "#e2e8f0", 10); }
            else { p.y = floor; p.vy = -230; p.shake = 0.5; snd.bump(); say("بهدوء! اترك السهم ↓ قبل الأرض", 2.4); }
          } else { p.y = floor; p.vy = Math.min(0, p.vy); }
        }
        // فاتنا المدرج
        if (runway && p === me && pw > runway.b && p.state === "air") { placeRunway(st.cam + W + 1400); say("فاتنا المدرج! لا بأس، سنحاول مرة أخرى 🔁", 3); }
      });
      // الكاميرا
      st.cam += lead.speed * dt;
      pl.forEach((p) => { p.sx = W * 0.24 + (p.speed - p.P.cruise) * 0.35 - (two && p.i ? 70 : 0); });

      // التلميح
      if (me.state === "air") {
        st.hint = "";
        if (runway) {
          const d = runway.a - wx(me), alt = GY - BOT[me.type] * PS - me.y;
          if (d > 0 && d < 1700) st.hint = "المطار أمامك! انزل ⬇️ نحو المدرج";
          else if (d <= 0 && wx(me) < runway.b) st.hint = alt > 140 ? "انزل ⬇️ ببطء…" : me.vy > 200 ? "بهدوء… اترك السهم ↓" : "رائع، استمر بهدوء…";
        } else if (kind === "delivery" && st.phase === "deliver") {
          const h = houses.find((h) => h.marked && !h.done && h.x > wx(me) - 40);
          if (h && h.x - wx(me) < 520) st.hint = "اضغط ✕ أو Enter لإسقاط الطرد 📦";
        }
      }

      // الظهور
      const spawnEnd = kind === "free" ? goal - 300 : runway ? runway.a - 400 : Infinity;
      while (spawnX < st.cam + W + 300) { if (spawnX < spawnEnd) spawn(spawnX); spawnX += 380 + rnd() * 340; }
      spawnHouses(); phaseCheck();

      // الأشياء
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.t === "bird") { it.x -= it.v * dt; it.y = it.flee ? it.y - 180 * dt : it.y0 + Math.sin(st.t * 2 + it.ph) * 30; }
        if (it.t === "storm") it.x -= 18 * dt;
        const sx = it.x - st.cam;
        if (sx < -200 || it.y < top - 100) { items.splice(i, 1); continue; }
        for (const p of pl) {
          if (p.state !== "air") continue;
          const dx = sx - p.sx, dy = it.y - p.y;
          if (it.t === "star" && dx * dx + dy * dy < 50 * 50) { p.stars++; snd.star(); sparkle(sx, it.y); items.splice(i, 1); break; }
          if (it.t === "balloon" && dx * dx + dy * dy < 62 * 62) { p.stars += 3; p.balloons++; snd.balloon(); sparkle(sx, it.y, "#f472b6", 14); pop(sx, it.y - 30, "+3"); items.splice(i, 1); break; }
          if (p.inv > 0) continue;
          const r = it.t === "storm" ? 62 : 26;
          if ((dx / (52 + r)) ** 2 + (dy / (20 + r)) ** 2 < 1) {
            p.shake = 0.6; p.inv = 1.4; p.bumps++; p.speed *= 0.75; p.vy = dy > 0 ? -120 : 120; snd.bump();
            if (it.t === "bird") it.flee = true;
            if (p === me || two) say(it.t === "bird" ? "أوه! طائر صغير، انتبه 🐦" : "غيمة رعدية! ابتعد عنها ☁️", 1.5);
          }
        }
      }
      // الطرود
      for (const q of parcels) {
        if (q.landed) continue;
        q.t += dt; q.vx = Math.max(0, q.vx - 160 * dt); q.vy = Math.min(150, q.vy + 220 * dt);
        q.x += (q.vx + 0) * dt; q.y += q.vy * dt;
        if (q.y >= GY) {
          q.y = GY; q.landed = true;
          const h = houses.find((h) => h.marked && !h.done && Math.abs(h.x - q.x) < 70);
          if (h) { h.done = true; st.delivered++; me.stars += 3; snd.deliver(); sparkle(h.x - st.cam, GY - 60, "#f472b6", 16); pop(h.x - st.cam, GY - 140, "+3"); say(K.pick(["وصل الطرد! 🎉", "شكراً يا طيّار! ❤️", "ممتاز! 📦✅"]), 1.6); }
          else { snd.miss(); say("قريب! أسقطه فوق البيت المعلَّم ⬇️", 1.8); }
        }
      }
      for (let i = parcels.length - 1; i >= 0; i--) if (parcels[i].x - st.cam < -150) parcels.splice(i, 1);
      for (let i = houses.length - 1; i >= 0; i--) if (houses[i].x - st.cam < -200) houses.splice(i, 1);
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.life <= 0) parts.splice(i, 1); }
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].y -= 40 * dt; pops[i].life -= dt; if (pops[i].life <= 0) pops.splice(i, 1); }

      if (kind === "free" && st.cam >= goal && !st.done) finish(true);
    }

    // ---------------- النهاية
    function finish() {
      st.done = true;
      const stars = pl.reduce((a, p) => a + p.stars, 0);
      const unlocked = addTotal(stars);
      K.later(() => {
        if (kind === "free") {
          save.freeBest = Math.max(save.freeBest, two ? Math.max(...pl.map((p) => p.stars)) : me.stars); save.save();
          earn(1, "أكمل رحلة حرّة", "earn");
          K.replace(resultScreen, { kind, cfg, pl: pl.map((p) => ({ stars: p.stars, balloons: p.balloons, col: p.col })), unlocked });
        } else if (kind === "delivery") {
          const extra = st.drops - DL.n, s = extra <= 1 ? 3 : extra <= 4 ? 2 : 1;
          save.best["d" + cfg.level] = Math.max(save.best["d" + cfg.level] || 0, s);
          if (save.dUnlocked < cfg.level + 2) save.dUnlocked = Math.min(DELIVERY.length, cfg.level + 2);
          save.save();
          earn(1, `أنهى توصيل «${DL.name}»`, "earn");
          K.replace(resultScreen, { kind, cfg, s, stars: me.stars, drops: st.drops, unlocked });
        } else {
          K.replace(countryCard, { id: dest, trip: cfg.trip, leg: cfg.leg });
        }
      }, kind === "free" ? 1200 : 300);
      if (kind === "free") { K.sfx.win(); K.confetti(30, "⭐☁️✈️🎈"); say("وصلنا! رحلة رائعة 🎉", 3); }
    }

    // ---------------- الرسم
    const NSTARS = Array.from({ length: 70 }, (_, i) => [R.hash(i, 9), R.hash(i, 10), 1 + R.hash(i, 11) * 2]);
    function draw() {
      g.setTransform(sc, 0, 0, sc, 0, oy);
      const cam = st.cam, m = mixAt(cam + W / 2), A = SCENES[m.a], B = SCENES[m.b];
      const night = (m.a === "night" ? 1 - m.f : 0) + (m.b === "night" ? m.f : 0);
      // السماء
      const gr = g.createLinearGradient(0, top, 0, GY);
      gr.addColorStop(0, R.mix(A.sky[0], B.sky[0], m.f)); gr.addColorStop(1, R.mix(A.sky[1], B.sky[1], m.f));
      g.fillStyle = gr; g.fillRect(0, top, W, GY - top + 2);
      if (night > 0) { g.fillStyle = `rgba(255,255,255,${0.9 * night})`; for (const [a, b, r] of NSTARS) { g.globalAlpha = night * (0.5 + 0.5 * Math.sin(st.t * 2 + a * 20)); g.fillRect(a * W, top + b * (GY - top) * 0.7, r, r); } g.globalAlpha = 1; }
      g.globalAlpha = 1 - night; g.fillStyle = "#fde047"; R.circ(g, W * 0.82, 110, 48); g.fill(); g.fillStyle = "rgba(253,224,71,.25)"; R.circ(g, W * 0.82, 110, 74); g.fill();
      g.globalAlpha = night; g.fillStyle = "#fef9c3"; R.circ(g, W * 0.82, 110, 40); g.fill(); g.fillStyle = R.mix(A.sky[0], B.sky[0], m.f); R.circ(g, W * 0.82 + 18, 98, 36); g.fill();
      g.globalAlpha = 1;
      // الطبقات البعيدة
      const layer = (p, seg, fn, skip = 0) => {
        const off = cam * p, i0 = Math.floor((off - 300) / seg), i1 = Math.floor((off + W + 300) / seg);
        for (let i = i0; i <= i1; i++) { if (skip && R.hash(i, 20 + p * 10) < skip) continue; const x = i * seg + R.hash(i, 21) * seg * 0.4 - off; fn(x, i, layerScene(i * seg, p)); }
      };
      layer(0.12, 230, (x, i, s) => R.far(g, s, x, GY, i));
      layer(0.28, 430, (x, i, s) => R.cloud(g, x, 70 + R.hash(i, 30) * 230, 0.6 + R.hash(i, 31) * 0.5, s === "night" ? "#c7d2fe" : "#fff", s === "night" ? 0.3 : 0.85));
      layer(0.5, 170, (x, i, s) => R.mid(g, s, x, GY, i, st.t), 0.3);
      // المَعلم والعلم عند مطار البلد
      if (kind === "world" && runway) {
        const lx = runway.b - 420 - cam;
        if (lx > -400 && lx < W + 400) R.landmark(g, dest, lx, GY + 2, 1, st.t);
        const fx = runway.a + 120 - cam; if (fx > -100 && fx < W + 100) R.flagPole(g, dest, fx, GY, 1, st.t);
      }
      // الأرض
      const gseg = 200, g0 = Math.floor((cam - 50) / gseg), g1 = Math.floor((cam + W + 50) / gseg);
      for (let i = g0; i <= g1; i++) {
        const x = i * gseg - cam, s = sceneAt(i * gseg + gseg / 2);
        let S = SCENES[s];
        const land = s === "sea" && [startRw, runway].some((r) => r && i * gseg + gseg > r.a - 300 && i * gseg < r.b + 60);
        if (land) S = SCENES.city;
        g.fillStyle = S.ground; g.fillRect(x - 1, GY, gseg + 2, H - GY + 4);
        g.fillStyle = S.ground2; g.fillRect(x - 1, GY, gseg + 2, 8);
      }
      // عناصر الأرض
      const near = (x) => [startRw, runway].some((r) => r && x > r.a - 300 && x < r.b + 60) || houses.some((h) => Math.abs(h.x - x) < 90);
      { const off = cam, seg = 140, i0 = Math.floor((off - 100) / seg), i1 = Math.floor((off + W + 100) / seg);
        for (let i = i0; i <= i1; i++) { const X = i * seg + R.hash(i, 22) * 60; if (near(X)) continue; R.ground(g, sceneAt(X), X - off, GY, i, st.t); } }
      for (const r of [startRw, runway]) if (r && r.b - cam > -300 && r.a - cam < W + 300) R.runway(g, r.a - cam, r.b - cam, GY + 6, sceneAt(r.a) === "night");
      for (const h of houses) {
        const x = h.x - cam; if (x < -150 || x > W + 150) continue;
        if (sceneAt(h.x) === "sea") { g.fillStyle = "#f4d58d"; R.ell(g, x, GY + 6, 80, 16); g.fill(); g.fillStyle = "#86c96a"; R.ell(g, x, GY + 2, 64, 10); g.fill(); }
        R.house(g, x, GY + 2, h.k, h.marked && !h.done, h.done, st.t);
      }
      for (const q of parcels) R.parcel(g, q.x - cam, q.y - (q.landed ? 10 : 0), !q.landed, st.t);
      // الأشياء في الجو
      for (const it of items) {
        const x = it.x - cam; if (x < -150 || x > W + 150) continue;
        if (it.t === "star") R.star(g, x, it.y + Math.sin(st.t * 3 + it.x) * 4, 20, Math.sin(st.t * 2 + it.x) * 0.3);
        else if (it.t === "balloon") R.balloon(g, x, it.y, it.k, st.t, 0.9);
        else if (it.t === "bird") R.bird(g, x, it.y, st.t, it.k);
        else if (it.t === "storm") R.storm(g, x, it.y, st.t);
      }
      // ظل الطائرات والطائرات
      for (const p of pl) {
        const alt = Math.max(0, GY - p.y), k = Math.max(0.25, 1 - alt / 700);
        g.fillStyle = `rgba(15,23,42,${0.22 * k})`; R.ell(g, p.sx, GY + 10, 50 * k, 8 * k); g.fill();
      }
      for (const p of pl) {
        if (p.inv > 0 && Math.floor(p.inv * 10) % 2) g.globalAlpha = 0.55;
        const sh = p.shake > 0 ? Math.sin(st.t * 70) * 5 * (p.shake / 0.6) : 0;
        const ang = p.state === "air" ? Math.max(-0.35, Math.min(0.35, p.vy / 900)) + sh * 0.02 : 0;
        R.plane(g, p.type, p.col, p.sx + sh, p.y + (p.state === "air" ? Math.sin(st.t * 2.2 + p.i) * 2 : 0), ang, st.t, PS);
        g.globalAlpha = 1;
        if (two) { g.font = FONT(20); g.textAlign = "center"; g.fillStyle = p.col.c; g.strokeStyle = "#fff"; g.lineWidth = 5; const lb = p.i ? "٢" : "١"; g.strokeText(lb, p.sx - 10, p.y - 52); g.fillText(lb, p.sx - 10, p.y - 52); }
      }
      // غيوم أمامية
      layer(1.25, 900, (x, i, s) => R.cloud(g, x, 120 + R.hash(i, 40) * 380, 0.9, s === "night" ? "#c7d2fe" : "#fff", 0.45), 0.5);
      for (const q of parts) { g.globalAlpha = Math.max(0, q.life / 0.6); R.star(g, q.x, q.y, 6, q.life * 5, q.col); }
      g.globalAlpha = 1;
      for (const q of pops) { g.globalAlpha = Math.min(1, q.life * 2); g.font = FONT(34); g.textAlign = "center"; g.strokeStyle = "#1e3a8a"; g.lineWidth = 6; g.lineJoin = "round"; g.strokeText(q.txt, q.x, q.y); g.fillStyle = "#fde047"; g.fillText(q.txt, q.x, q.y); }
      g.globalAlpha = 1;
      drawHud(night);
    }
    function pill(x, y, w, h) { g.fillStyle = "rgba(255,255,255,.88)"; R.rr(g, x, y, w, h, h / 2); g.fill(); }
    function drawHud(night) {
      const y0 = top + 16;
      g.textBaseline = "middle"; g.direction = "rtl";
      // النجوم
      pl.forEach((p, i) => {
        const x = W - 30 - 190 - i * 210; pill(x, y0, 190, 56);
        if (two) { g.fillStyle = p.col.c; R.circ(g, x + 166, y0 + 28, 12); g.fill(); }
        R.star(g, x + (two ? 134 : 160), y0 + 28, 18);
        g.font = FONT(34); g.textAlign = "center"; g.fillStyle = "#1e3a8a"; g.fillText(String(p.stars), x + 70, y0 + 30);
      });
      // التقدّم
      const bx = 130, bw = Math.max(200, W - 130 - 30 - pl.length * 210 - 40);
      pill(bx, y0, bw, 56);
      if (kind === "free") {
        const f = Math.min(1, st.cam / goal), n = FREE_ORDER.length;
        g.fillStyle = "#bae6fd"; R.rr(g, bx + 20, y0 + 22, bw - 40, 12, 6); g.fill();
        g.fillStyle = "#22c55e"; R.rr(g, bx + 20 + (bw - 40) * (1 - f), y0 + 22, (bw - 40) * f, 12, 6); g.fill();
        g.font = FONT(18, 700); g.fillStyle = "#1e3a8a"; g.textAlign = "center";
        for (let i = 0; i < n; i++) g.fillText(SCENES[FREE_ORDER[i]].name, bx + bw - 20 - ((i + 0.5) / n) * (bw - 40), y0 + 12);
        g.save(); g.translate(bx + bw - 20 - f * (bw - 40), y0 + 40); g.scale(-1, 1); R.plane(g, me.type, me.col, 0, 0, 0, st.t, 0.22); g.restore();
      } else if (kind === "delivery") {
        g.font = FONT(28); g.textAlign = "center"; g.fillStyle = "#1e3a8a";
        g.fillText(st.phase === "takeoff" ? "🛫 الإقلاع" : st.phase === "land" ? "🛬 الهبوط في المطار" : `الطرود: ${st.delivered} / ${DL.n}`, bx + bw / 2, y0 + 30);
      } else {
        const T = TRIPS[cfg.trip], from = cfg.leg ? COUNTRIES[T.list[cfg.leg - 1]].n : "بيتنا";
        const f = runway ? 1 : Math.min(1, st.cam / (legLen + W + 900));
        g.font = FONT(22); g.fillStyle = "#1e3a8a"; g.textAlign = "right"; g.fillText(from, bx + bw - 20, y0 + 28);
        g.textAlign = "left"; g.fillText(COUNTRIES[dest].n, bx + 20, y0 + 28);
        const a = bx + bw - 30 - g.measureText(from).width - 10, b = bx + 30 + g.measureText(COUNTRIES[dest].n).width + 10;
        g.strokeStyle = "#93c5fd"; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(a, y0 + 28); g.lineTo(b, y0 + 28); g.stroke(); g.setLineDash([]);
        g.save(); g.translate(a - (a - b) * f, y0 + 28); g.scale(-1, 1); R.plane(g, me.type, me.col, 0, 0, 0, st.t, 0.22); g.restore();
      }
      // الرسائل
      const msg = st.msgT > 0 ? st.msg : "";
      const line = (txt, y, size, a = 1) => { g.globalAlpha = a; g.font = FONT(size); g.textAlign = "center"; g.lineJoin = "round"; g.lineWidth = size * 0.22; g.strokeStyle = night > 0.5 ? "#0f172a" : "#1e3a8a"; g.strokeText(txt, W / 2, y); g.fillStyle = "#fff"; g.fillText(txt, W / 2, y); g.globalAlpha = 1; };
      if (msg) line(msg, y0 + 110, 42, Math.min(1, st.msgT * 2));
      if (st.hint && !msg) line(st.hint, y0 + 110, 34, 0.9);
      // السرعة أثناء الإقلاع والهبوط
      if (me.state === "ground" || (runway && wx(me) > runway.a - 1700 && !st.done)) {
        const x = 30, y = y0 + 76; pill(x, y, 260, 50);
        g.font = FONT(22); g.fillStyle = "#1e3a8a"; g.textAlign = "right"; g.fillText("السرعة", x + 245, y + 26);
        const f = Math.min(1, me.speed / me.P.max);
        g.fillStyle = "#e2e8f0"; R.rr(g, x + 16, y + 18, 150, 14, 7); g.fill();
        g.fillStyle = f < 0.45 ? "#22c55e" : f < 0.75 ? "#facc15" : "#f97316"; R.rr(g, x + 16 + 150 * (1 - f), y + 18, 150 * f, 14, 7); g.fill();
        if (me.state === "air" && runway) { const ok = me.vy <= 200; g.fillStyle = ok ? "#22c55e" : "#f97316"; R.circ(g, x + 290, y + 25, 18); g.fill(); g.fillStyle = "#fff"; g.font = FONT(22); g.textAlign = "center"; g.fillText(ok ? "✓" : "↓", x + 290, y + 27); }
      }
      // سهم فوق المدرج
      if (runway && me.state === "air") {
        const ax = Math.max(runway.a + 160, Math.min(runway.b - 400, wx(me) + 200)) - st.cam;
        if (ax > 0 && ax < W) { const b = Math.sin(st.t * 5) * 8; g.fillStyle = "rgba(34,197,94,.9)"; g.beginPath(); g.moveTo(ax - 22, GY - 150 + b); g.lineTo(ax + 22, GY - 150 + b); g.lineTo(ax + 22, GY - 118 + b); g.lineTo(ax + 40, GY - 118 + b); g.lineTo(ax, GY - 80 + b); g.lineTo(ax - 40, GY - 118 + b); g.lineTo(ax - 22, GY - 118 + b); g.closePath(); g.fill(); }
      }
      g.direction = "inherit";
    }

    // ---------------- الحلقة
    function fit() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
      if (cv.width / cv.height >= 1000 / H) { sc = cv.height / H; W = cv.width / sc; oy = 0; }
      else { sc = cv.width / 1000; W = 1000; oy = cv.height - H * sc; }
      top = -oy / sc;
    }
    fit(); addEventListener("resize", fit);
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (paused) return;
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016); last = ts;
      step(dt); draw();
    }
    say(kind === "free" ? (two ? "طيرا معاً واجمعا النجوم! ⭐" : "هيا نطير! اجمع النجوم ⭐") : kind === "world" ? `رحلة إلى ${COUNTRIES[dest].n}! ✈️` : `${DL.name}: ${DL.n} طرود 📦`, 3);
    window.__planes = { st, pl, items, houses, get runway() { return runway; }, drop: () => drop(me) };
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- النتيجة
  function resultScreen(r) {
    K.begin();
    const un = r.unlocked.length ? `<div class="won"><span class="emo">🔓</span> فتحت: ${r.unlocked.join("، ")}!</div>` : "";
    let body, title, again, next = "";
    if (r.kind === "free") {
      title = "وصلنا! رحلة رائعة 🎉";
      body = r.pl.length > 1
        ? `<div class="vs">${r.pl.map((p, i) => `<div class="pres" style="--c:${p.col.c}"><b>اللاعب ${i ? "٢" : "١"}</b><span><span class="emo">⭐</span> ${p.stars}</span><small>🎈 ${p.balloons} مناطيد</small></div>`).join("")}</div>`
        : `<div class="big3"><span class="emo">⭐</span> ${r.pl[0].stars}</div><div class="sub">جمعت ${r.pl[0].stars} نجمة و${r.pl[0].balloons} مناطيد 🎈</div>`;
      again = () => K.replace(flight, r.cfg);
    } else {
      title = r.s === 3 ? "طيّار بطل! 🏆" : "أحسنت! هبطت بسلام 🛬";
      body = `<div class="stars">${K.starsHtml(r.s)}</div><div class="sub">📦 أسقطت ${r.drops} طرود · ⭐ ${r.stars} نجمة</div>`;
      again = () => K.replace(flight, r.cfg);
      if (r.cfg.level + 1 < DELIVERY.length) next = `<button class="btn f go" ${K.act("next", () => K.replace(flight, { kind: "delivery", level: r.cfg.level + 1 }))}>المرحلة ${r.cfg.level + 2} ←</button>`;
    }
    K.paint(`<div class="top">${K.backBtn()}<span></span><span class="pill"><span class="emo">⭐</span> ${save.total}</span></div>
      <h1>${title}</h1>${body}${un}<div class="sub" id="earn"></div>
      <div class="nav">
        <button class="btn f" ${K.act("again", again)}><span class="emo">🔁</span> مرة أخرى</button>${next}
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>${K.HELP}`, next ? "next" : "again");
    K.sfx.win(); K.confetti(30, "⭐✈️🎉☁️");
  }

  window.__planesDbg = { flight: (c) => K.show(flight, c), card: (o) => K.show(countryCard, o), save };
  K.start(home);
})();
