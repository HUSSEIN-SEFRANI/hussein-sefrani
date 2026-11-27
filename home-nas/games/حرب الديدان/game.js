// حرب الديدان — فريقان من الديدان على أرض تتهدّم، يتبادلان الأدوار في الرمي
// كل دور: امشِ وصوّب، افتح قائمة الأسلحة واختر، ثم ارمِ. البازوكا تتأثر بالريح، والقنبلة تنفجر بعد 3 ثوانٍ.
// صناديق تنزل بالمظلة: أسلحة خاصة (تصيب غالباً) أو إسعاف. بعد عدد من الأدوار يرتفع الماء.
// لوحة المفاتيح/الريموت: الأسهم للمشي والتصويب · Enter ضغطة قصيرة = قائمة الأسلحة، مطوّلاً = شحن ورمي · Space للرمي
//   Shift للقفز · Tab للقائمة · P للاستراحة · Backspace للرجوع
// يد التحكم (بالموقع): السفلي ✕ = قائمة الأسلحة (واختيار فيها) · الأيسر □ أو R1/R2 = رمي (مطوّلاً للشحن)
//   العلوي △ = قفز · الأيمن ○ = إغلاق القائمة/رجوع · L1 = السلاح التالي · Start = استراحة
// لاعبان: يد لكل فريق، أو يد واحدة تنتقل بالدور. ضد الكمبيوتر: 3 مستويات.
(() => {
  "use strict";
  const GAME = "حرب الديدان";
  const save = K.store("worms", { wins: [0, 0], cpu: { easy: 0, mid: 0, hard: 0 }, set: {} });
  save.set = Object.assign({ n: 3, time: 30, cr: 1, talk: 1, wx: 0 }, save.set || {});
  const TM = [
    { name: "الأحمر", color: "#ef4444", dark: "#991b1b", light: "#fecaca", emo: "🔴" },
    { name: "الأزرق", color: "#3b82f6", dark: "#1e40af", light: "#bfdbfe", emo: "🔵" },
  ];
  // أسماء الشخصيات: كل مباراة تأخذ منها عشوائياً حسب عدد الديدان
  const NAMES = ["دبس فرنجي", "أكا", "اياد", "عبد الهادي", "رهف", "سارة", "حمدان", "فوزي", "ابو نجيب", "ابو صبري",
    "بتول", "حنين", "لحمة بكرز", "لبنيه", "ششبرك", "ملوخية"];
  const LV = {
    easy: { name: "سهل", emo: "🐣", aj: 9, pj: 0.09, sg: false, wait: 90 },
    mid: { name: "متوسط", emo: "🦊", aj: 4, pj: 0.045, sg: true, wait: 70 },
    hard: { name: "صعب", emo: "🦁", aj: 1.5, pj: 0.015, sg: true, wait: 50 },
  };
  // fire: hold = شحن بالضغط المطوّل · tap = ضغطة واحدة · sp: سلاح خاص من الصناديق
  const WP = [
    { k: "bz", e: "🚀", name: "بازوكا", r: 42, d: 50, fire: "hold" },
    { k: "gr", e: "💣", name: "قنبلة", r: 46, d: 55, fire: "hold" },
    { k: "sg", e: "🔫", name: "خرطوش", r: 17, d: 25, fire: "tap" },
    { k: "dy", e: "🧨", name: "ديناميت", r: 58, d: 65, fire: "tap" },
    { k: "wb", e: "🎈", name: "بالون ماء", fire: "hold" },
    { k: "boom", e: "🪃", name: "بوميرانغ", d: 20, fire: "hold" },
    { k: "hj", e: "🦘", name: "قفزة عالية", fire: "hold", tool: 1 },
    { k: "para", e: "🪂", name: "مظلة", fire: "tap", tool: 1 },
    // أسلحة خاصة: تنزل في صناديق بالمظلة، ومن يلمس الصندوق يأخذ واحداً منها
    { k: "sl", e: "🩴", name: "شحاطة", r: 18, d: 30, sp: "home" },
    { k: "st", e: "🪨", name: "حجرة", r: 24, d: 40, sp: "home" },
    { k: "rc", e: "📺", name: "ريموت كنترول", r: 20, d: 30, sp: "home" },
    { k: "ph", e: "📱", name: "ضربة الهاتف", r: 22, d: 35, sp: "home" },
    { k: "car", e: "🚗", name: "ضربة السيارة", r: 48, d: 60, sp: "car" },
    { k: "bt", e: "🥾", name: "البوط", r: 38, d: 50, sp: "sky" },
    { k: "ck", e: "🐔", name: "دجاجة مجنونة", r: 40, d: 45, sp: "car" },
    { k: "bee", e: "🐝", name: "خلية نحل", d: 8, sp: "bee" },
    { k: "wm", e: "🍉", name: "بطيخة", r: 30, d: 30, sp: "throw", fire: "hold" },
    { k: "ff", e: "🧆", name: "صحن فلافل", r: 22, d: 15, sp: "throw", fire: "hold" },
    { k: "pan", e: "🍳", name: "ضربة المقلاة", r: 0, d: 25, sp: "melee", fire: "tap" },
    { k: "brl", e: "🛢️", name: "برميل زيت", r: 46, d: 45, sp: "place", fire: "tap" },
    { k: "met", e: "☄️", name: "مطر نيازك", r: 26, d: 22, sp: "rain", fire: "tap" },
    { k: "tp", e: "🌀", name: "بوابة انتقال", sp: "point", fire: "tap", tool: 1 },
    { k: "wall", e: "🧱", name: "جدار", sp: "point", fire: "tap", tool: 1 },
  ];
  const BASIC = 8, SPECIAL = K.range(8, WP.length);
  const WI = (k) => WP.findIndex((q) => q.k === k);
  // النيازك نادرة في الصناديق
  const crateWeapon = () => K.pick(SPECIAL.flatMap((i) => (WP[i].k === "met" ? [i] : [i, i, i])));
  const SEED = { r: 16, d: 14 };
  // كلام مضحك عند الإصابة
  const OUCH = ["آخ!", "يا ويلي!", "بدي ماما!", "ليش هيك؟!", "مش عدل!", "شو عملتلك؟", "رح أشتكي عليك!", "وجعتني!", "يا لطيف!",
    "زعلت منك", "الله يسامحك", "انتبه شوي!", "مش مضحك!", "رح أرجعلك!", "شفت نجوم!", "مين هاد؟!", "خلص بكفي!", "يا عيب الشوم!"];
  const OUCH_K = { sl: "مثل أمي بالضبط!", bt: "البوط لا يا ابني!", car: "مين أعطاك رخصة؟!", ph: "ألو؟ مين معي؟", rc: "غيّر القناة!",
    st: "راسي يا راسي!", pan: "طبخوني!", wm: "بطيخ على راسي!", ck: "كاك كاك؟!", fall: "آخ رجلي!", dy: "طار شعري!",
    bee: "آي آي آي!", boom: "رجعتلك!", boomself: "ضربت حالي!", ff: "سخنة سخنة!", fb: "فلافل بالوجه!", brl: "برميل؟ جد؟!", met: "السما عم تشتي حجار!" };
  const WXT = ["", "", "❄️ ثلج: الأرض زلقة", "🌪️ عاصفة: ريح قوية", "🌙 ليل"];
  const WIN_SAY = ["فزنا!", "يا سلام!", "هيييه!", "أبطال!", "مين قدنا؟", "رقصني يا جدع!"];
  const HATS = ["fez", "cap", "crown", "flower", "party", "chef", "none", "glasses"];
  // سماء أعلى، سماء أسفل، تلال بعيدة، عشب فاتح، عشب، تراب
  const THEMES = [
    ["#60a5fa", "#e0f2fe", "#bfdbfe", [150, 222, 96], [86, 170, 60], [156, 100, 62]],
    ["#fb923c", "#fef3c7", "#fed7aa", [250, 204, 21], [202, 138, 4], [146, 64, 14]],
    ["#818cf8", "#eef2ff", "#c7d2fe", [241, 245, 249], [203, 213, 225], [100, 116, 139]],
    ["#2dd4bf", "#ecfeff", "#a7f3d0", [74, 222, 128], [22, 163, 74], [120, 113, 108]],
  ];
  const W = 1280, H = 720, WATER0 = 668, G = 0.25, D2R = Math.PI / 180, SZ = 1.45, HOLD = 18;
  const FONT = "Baloo, 'Noto Sans Arabic', Tahoma, sans-serif";
  const EFONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------------------------------------------------------------- القائمة
  function homeScreen() {
    K.begin();
    const pads = K.pads().length;
    K.paint(`
      <div class="title"><canvas class="hero" width="360" height="180"></canvas><div><h1>${GAME}</h1><div class="sub">صوّب على ديدان الفريق الآخر وانتبه للريح! 💥</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#ef4444,#64748b)" ${K.act("cpu", () => K.show(levelScreen))}>
          <span class="big emo">🤖</span><b>ضد الكمبيوتر</b><small>لاعب واحد · ٣ مستويات</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#ef4444,#3b82f6)" ${K.act("two", () => K.show(setupScreen, "two", null))}>
          <span class="big emo">👫</span><b>لاعبان</b><small>بالدور · يد لكل لاعب أو يد واحدة</small></button>
      </div>
      <div class="mini">
        <span class="pill">🔴 ${save.wins[0]} : ${save.wins[1]} 🔵</span>
        <span class="pill">🎮 ${pads ? `${pads} يد تحكم متصلة` : "لا توجد يد تحكم"}</span>
      </div>
      <div class="help">🎮 الزر السفلي ✕ = قائمة الأسلحة · الأيسر □ مطوّلاً = رمي · العلوي △ = قفز · الأيمن ○ = رجوع ·
        ⌨️ الأسهم للمشي والتصويب · <b>Enter</b> ضغطة = الأسلحة، مطوّلاً = رمي · <b>Shift</b> قفز</div>`, "cpu");
    const c = K.app.querySelector(".hero"), x = c.getContext("2d");
    let raf = 0;
    const hy = (i) => 150 - Math.sin(i / 57) * 14;
    const a = { t: 0, x: 80, face: 1, hp: 100, name: "", look: { hat: "fez", must: true, seed: 0.3 } };
    const b = { t: 1, x: 280, face: -1, aim: 20, hp: 100, name: "", look: { hat: "party", must: false, tooth: true, seed: 0.7 } };
    const loop = (t) => {
      x.clearRect(0, 0, 360, 180);
      x.fillStyle = "#9c643e"; x.beginPath(); x.moveTo(0, 180);
      for (let i = 0; i <= 360; i += 6) x.lineTo(i, hy(i)); x.lineTo(360, 180); x.fill();
      x.strokeStyle = "#56aa3c"; x.lineWidth = 10; x.beginPath(); for (let i = 0; i <= 360; i += 6) x.lineTo(i, hy(i) + 3); x.stroke();
      a.y = hy(80); a.aim = 30 + Math.sin(t / 600) * 15; b.y = hy(280);
      drawWorm(x, a, { t, label: false }); drawWorm(x, b, { t: t + 900, label: false });
      const k = (t / 1400) % 1, bx = 100 + k * 160, by = 110 - Math.sin(k * Math.PI) * 80;
      x.save(); x.translate(bx, by); x.rotate(t / 90); drawSlipper(x); x.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    K.mode = { stop: () => cancelAnimationFrame(raf) };
  }

  function levelScreen() {
    K.begin();
    const card = (k, bg) => `<button class="mode f" style="background:${bg}" ${K.act(k, () => K.show(setupScreen, "cpu", k))}>
      <span class="big emo">${LV[k].emo}</span><b>${LV[k].name}</b><small>فزت ${save.cpu[k]} مرة</small></button>`;
    K.paint(`
      <div class="top">${K.backBtn()}<h2>🤖 ضد الكمبيوتر: اختر المستوى</h2><span></span></div>
      <div class="modes">
        ${card("easy", "linear-gradient(135deg,#22c55e,#84cc16)")}
        ${card("mid", "linear-gradient(135deg,#f59e0b,#f97316)")}
        ${card("hard", "linear-gradient(135deg,#ef4444,#a855f7)")}
      </div>
      <div class="legend">🚀 بازوكا · 💣 قنبلة · 🔫 خرطوش · 🧨 ديناميت · 🎈 بالون ماء · 🪃 بوميرانغ · 🦘 قفزة · 🪂 مظلة · 🌊 الماء يرتفع آخر المباراة<br>
        📦 صناديق من السماء: ❤️ إسعاف أو سلاح خاص: 🩴 🪨 📺 📱 🚗 🥾 🐔 🐝 🍉 🧆 🍳 🛢️ ☄️ 🌀 🧱</div>
      ${K.HELP}`, "easy");
  }

  // ---------------------------------------------------------------- إعداد المباراة
  function setupScreen(mode, lvl) {
    K.begin();
    const s = save.set;
    const set = (k, v, key) => () => { s[k] = v; save.save(); K.sfx.pop(); K.replace(setupScreen, mode, lvl); K.focus(K.app.querySelector(`.f[data-k="${key}"]`)); };
    const row = (title, k, vals, label) => `<div class="setrow"><b>${title}</b><div class="opts">${vals.map((v) =>
      `<button class="btn f opt${s[k] === v ? " on" : ""}" ${K.act(k + v, set(k, v, k + v))}>${label(v)}</button>`).join("")}</div></div>`;
    K.paint(`
      <div class="top">${K.backBtn()}<h2>⚙️ إعداد المباراة ${mode === "cpu" ? `· 🤖 ${LV[lvl].emo} ${LV[lvl].name}` : "· 👫 لاعبان"}</h2><span></span></div>
      <div class="setup">
        ${row("🐛 عدد الديدان لكل فريق", "n", [2, 3, 4, 5], (v) => v)}
        ${row("⏱️ وقت الدور", "time", [20, 30, 45, 60], (v) => v + " ث")}
        ${row("📦 الصناديق", "cr", [0, 1, 2], (v) => ["قليلة", "عادية", "كثيرة"][v])}
        ${row("🌦️ الطقس", "wx", [0, 1, 2, 3, 4], (v) => ["عشوائي", "عادي", "❄️ ثلج", "🌪️ عاصفة", "🌙 ليل"][v])}
        ${row("🗣️ كلام الديدان بالصوت", "talk", [1, 0], (v) => (v ? "نعم" : "لا"))}
      </div>
      <div class="nav"><button class="btn f go" ${K.act("go", () => K.show(playScreen, mode, lvl))}><span class="emo">▶️</span> ابدأ المباراة</button></div>
      ${K.HELP}`, "go");
  }

  // ---------------------------------------------------------------- اللعب
  function playScreen(mode, lvl) {
    K.begin();
    const CPU = mode === "cpu", L = CPU ? LV[lvl] : null;
    const N = clamp(save.set.n | 0 || 3, 2, 5), TURN = (save.set.time || 30) * 60, CRP = [0.3, 0.5, 0.8][save.set.cr] ?? 0.5;
    const SD = 8 + 4 * N; // بعد هذا العدد من الأدوار يبدأ الماء بالارتفاع
    const WXN = save.set.wx || 1 + ((Math.random() * 4) | 0), SNOW = WXN === 2, STORM = WXN === 3, NIGHT = WXN === 4, WMAX = 0.06 * (STORM ? 2.2 : 1);
    const STARS = K.range(0, 70).map((i) => [(i * 173) % W, (i * 97) % 380, (i % 3) + 1]);
    K.paint(`<canvas class="war"></canvas><div class="msg"></div>
      <div class="tpad"><button data-c="l">◀</button><button data-c="r">▶</button><button data-c="u">▲</button><button data-c="d">▼</button><button data-c="j">⤴</button><button data-c="m">🎒</button><button class="fire" data-c="f">💥</button></div>`);
    const cv = K.app.querySelector("canvas"), g = cv.getContext("2d"), msg = K.app.querySelector(".msg"), tpad = K.app.querySelector(".tpad");
    let sc = 1, ox = 0, oy = 0, dpr = 1;
    const fit = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      sc = Math.min(innerWidth / W, innerHeight / H);
      ox = (innerWidth - W * sc) / 2; oy = (innerHeight - H * sc) / 2;
    };
    fit();
    const tc = document.createElement("canvas"); tc.width = W; tc.height = H; const tx = tc.getContext("2d");
    const solid = new Uint8Array(W * H);
    let TH, far, worms = [], projs = [], parts = [], texts = [], clouds = [], bubbles = [], tracer = null, swing = null;
    let crates = [], ammo = [{}, {}], tgt = 0, prevA = 0, hopUsed = false, menu = null;
    let cursor = null, wallV = true, shooter = null, firstDrown = "", slow = 0, focus = null, camX = W / 2, camY = H / 2, camZ = 1, lastTalk = 0;
    let WATER = WATER0, waterTo = WATER0, turnNo = 0;
    let state = "aim", cur = Math.random() < 0.5 ? 0 : 1, idx = [-1, -1], weap = [0, 0], wind = 0, timer = 0, power = 0, charging = false, needRel = false;
    let st = 0, frame = 0, shake = 0, ai = null, paused = false, banner = 0, bannerTxt = "", endT = 0, winner = -1, raf = 0, acc = 0, last = performance.now(), gone = false;
    let enterAt = -1, enterUsed = false;
    const S = (x, y) => { x |= 0; y |= 0; return x < 0 || x >= W || y < 0 || y >= H ? 0 : solid[y * W + x]; };
    const human = (t) => !(CPU && t === 1);
    const team = (t) => worms.filter((w) => w.t === t);
    const curW = () => team(cur)[idx[cur]];

    // ------------------------------------------------ الأرض
    function gen() {
      TH = SNOW ? THEMES[2] : THEMES[(Math.random() * THEMES.length) | 0];
      if (NIGHT) TH = ["#0b1026", "#1e293b", "#334155", ...TH.slice(3)];
      solid.fill(0);
      const p = [rnd(0, 7), rnd(0, 7), rnd(0, 7)];
      for (let x = 0; x < W; x++) {
        let h = 440 + 80 * Math.sin(x / 180 + p[0]) + 45 * Math.sin(x / 67 + p[1]) + 16 * Math.sin(x / 24 + p[2]);
        const e = Math.min(x, W - x); if (e < 100) h += (100 - e) * 2.8;
        for (let y = Math.max(170, h | 0); y < H; y++) solid[y * W + x] = 1;
      }
      if (Math.random() < 0.6) { const cx = rnd(420, 860), cy = rnd(200, 260), rw = rnd(70, 110);
        for (let y = cy - 18; y < cy + 30; y++) for (let x = (cx - rw) | 0; x < cx + rw; x++) if (((x - cx) / rw) ** 2 + ((y - cy) / (y < cy ? 18 : 30)) ** 2 < 1) solid[(y | 0) * W + x] = 1; }
      const img = tx.createImageData(W, H), d = img.data, [gl, gr, so] = TH.slice(3);
      for (let x = 0; x < W; x++) { let run = 0;
        for (let y = 0; y < H; y++) { const i = y * W + x; if (!solid[i]) { run = 0; continue; } const dp = run++, o = i * 4; let c;
          if (dp < 3) c = gl; else if (dp < 11) c = gr; else if (dp < 14) c = [gr[0] * 0.6, gr[1] * 0.6, gr[2] * 0.6];
          else { const s = 0.84 + 0.09 * Math.sin(y / 6 + Math.sin(x / 40) * 3) + Math.random() * 0.07 - dp * 0.0004; c = (x * 7 + y * 13) % 89 === 0 ? [120 * s, 120 * s, 120 * s] : [so[0] * s, so[1] * s, so[2] * s]; }
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; } }
      tx.clearRect(0, 0, W, H); tx.putImageData(img, 0, 0);
      const ph = rnd(0, 9);
      far = K.range(0, 65).map((i) => 420 + 40 * Math.sin(i / 4 + ph) + 18 * Math.sin(i / 1.4 + ph));
      clouds = K.range(0, 6).map(() => ({ x: rnd(0, W), y: rnd(70, 230), s: rnd(0.7, 1.4) }));
    }
    function carve(cx, cy, r) {
      for (let y = Math.max(0, (cy - r) | 0); y <= Math.min(H - 1, cy + r); y++) for (let x = Math.max(0, (cx - r) | 0); x <= Math.min(W - 1, cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) solid[y * W + x] = 0;
      tx.globalCompositeOperation = "source-atop"; tx.strokeStyle = "#3b2416"; tx.lineWidth = 7; tx.beginPath(); tx.arc(cx, cy, r + 2, 0, 7); tx.stroke();
      tx.globalCompositeOperation = "destination-out"; tx.beginPath(); tx.arc(cx, cy, r, 0, 7); tx.fill(); tx.globalCompositeOperation = "source-over";
    }
    const topY = (x) => { for (let y = 0; y < H; y++) if (S(x, y)) return y; return H; };
    function spawn() {
      worms = []; const used = [], names = K.shuffle(NAMES), gap = N > 3 ? 70 : 90;
      for (let i = 0; i < N; i++) for (const t of [0, 1]) { let x, k = 0;
        do { x = rnd(80, W - 80); k++; } while (k < 500 && (used.some((u) => Math.abs(u - x) < gap) || topY(x) > WATER - 30 || topY(x) < 120));
        used.push(x);
        const name = names[i * 2 + t], abu = name.startsWith("ابو");
        const look = { hat: abu ? "fez" : K.pick(HATS), must: abu || Math.random() < 0.2, tooth: Math.random() < 0.5, seed: Math.random() };
        worms.push({ t, name, look, x, y: topY(x) - 1, vx: 0, vy: 0, hp: 100, dead: false, drown: false, ground: true, face: x < W / 2 ? 1 : -1, aim: 25, wt: 0, ouch: 0 }); }
    }

    // ------------------------------------------------ الأدوار
    function nextTurn(first) {
      menu = null;
      const alive = [0, 1].map((t) => team(t).some((w) => !w.dead));
      if (!alive[0] || !alive[1]) {
        state = "end"; endT = 0; winner = alive[0] ? 0 : alive[1] ? 1 : -1;
        const c = winner < 0 ? "#334155" : TM[winner].color;
        const title = winner < 0 ? "تعادل!" : CPU ? (winner === 0 ? "فزت! 🏆" : "فاز الكمبيوتر 🤖") : `فاز ${TM[winner].name} ${TM[winner].emo}`;
        msg.innerHTML = `<div class="win up" style="--c:${c}">${title}<small>${winner < 0 ? "لم ينجُ أحد" : "الديدان الفائزة ترقص 💃🕺"}</small></div>`;
        if (winner >= 0) team(winner).filter((w) => !w.dead).forEach((w, i) => setTimeout(() => say(w, K.pick(WIN_SAY), 140), i * 900));
        K.sfx.win();
        return;
      }
      if (!first) { cur = 1 - cur; turnNo++; }
      cursor = null; worms.forEach((o) => (o.chute = false));
      const tm = team(cur); do { idx[cur] = (idx[cur] + 1) % N; } while (tm[idx[cur]].dead);
      wind = rnd(-1, 1) * WMAX; timer = TURN; power = 0; charging = false; needRel = true; state = "aim"; hopUsed = false;
      banner = first && WXT[WXN] ? 140 : 80; bannerTxt = first ? WXT[WXN] : "";
      ai = human(cur) ? null : { t: L.wait + 30, plan: null };
      if (!has(cur, weap[cur])) weap[cur] = 0;
      prevA = 0; const T = targets(), cw = curW();
      tgt = T.length ? T.indexOf(T.reduce((a, o) => (Math.abs(o.x - cw.x) < Math.abs(a.x - cw.x) ? o : a), T[0])) : 0;
      if (crates.length < (CRP > 0.6 ? 4 : 3) && (first || Math.random() < CRP)) dropCrate();
      if (turnNo >= SD) {
        waterTo = Math.max(360, waterTo - 16);
        if (turnNo === SD) { bannerTxt = "🌊 الماء يرتفع!"; noise(1.2, 0.25); }
      }
      tpad.style.setProperty("--c", TM[cur].color);
    }
    function say(w, s, t = 110) {
      if (w.drown) return;
      bubbles = bubbles.filter((b) => b.w !== w); bubbles.push({ w, s, t });
      const now = Date.now();
      if (save.set.talk && now - lastTalk > 1300) { lastTalk = now; try { K.tts(s.replace(/[^\u0600-\u06FF\s!؟?،]/g, "").trim()); } catch {} }
    }
    function finalBlow(w) {
      if (team(w.t).some((o) => !o.dead) || slow) return;
      slow = 110; focus = { x: w.x, y: w.y };
      texts.push({ x: w.x, y: w.y - 110, t: 120, s: "🎬 الضربة القاضية!", c: "#fde047" });
    }
    function hurt(w, d, k) {
      if (w.dead || d <= 0) return;
      w.hp = Math.max(0, w.hp - d); w.ouch = 50;
      if (shooter) { if (w.t !== shooter.t) shooter.dmg = (shooter.dmg || 0) + d; else shooter.self = (shooter.self || 0) + d; }
      texts.push({ x: w.x, y: w.y - 50, t: 70, s: "-" + d, c: TM[w.t].color });
      if (!w.hp) { w.dead = true; texts.push({ x: w.x, y: w.y - 74, t: 90, s: "وداعاً " + w.name, c: "#fff" }); bubbles = bubbles.filter((b) => b.w !== w); finalBlow(w); }
      else say(w, OUCH_K[k] && Math.random() < 0.7 ? OUCH_K[k] : K.pick(OUCH));
    }
    function explode(x, y, r, dm, k) {
      carve(x, y, r); shake = Math.min(14, r / 3);
      noise(0.5, r > 30 ? 0.5 : 0.3); K.tone(r > 30 ? 70 : 110, 0.35, "sawtooth", 0.07);
      impactSfx(k);
      for (const w of worms) { if (w.drown) continue;
        const dx = w.x - x, dy = w.y - 10 - y, d = Math.hypot(dx, dy), R = r + 10;
        if (d < R) { const f = 1 - d / R; hurt(w, Math.round(dm * f), k); const a = Math.atan2(dy, dx || 0.01);
          w.vx = Math.cos(a) * f * 6; w.vy = Math.sin(a) * f * 6 - 2.5; w.ground = false; } }
      const col = k === "wm" || k === "seed" ? ["#ef4444", "#16a34a"] : ["#6b4228", "#ffb03b"];
      for (let i = 0; i < 28; i++) { const a = rnd(0, 7), v = rnd(1, 6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, l: rnd(30, 60), c: i % 3 ? col[0] : col[1], r: rnd(1.5, 4.5), g: 1 }); }
      parts.push({ x, y, vx: 0, vy: 0, l: 14, c: "#fff6c0", r: r * 1.3, g: 0, flash: 1 });
    }
    function splash(x) {
      noise(0.4, 0.2);
      for (let i = 0; i < 12; i++) parts.push({ x, y: WATER, vx: rnd(-2, 2), vy: rnd(-5, -2), l: 40, c: "#dbeafe", r: 3, g: 1 });
    }
    function wphys(w) {
      if (w.drown) return;
      if (w.ouch > 0) w.ouch--;
      if (w.ground) { if (S(w.x, w.y + 1)) { if (SNOW && Math.abs(w.vx) > 0.15) slide(w); if (w.y > WATER + 8) drown(w); return; } w.ground = false; }
      w.vy = Math.min(12, w.vy + G);
      if (w.chute) { if (w.vy > 1.4) w.vy = 1.4; w.vx = clamp(w.vx + wind * 0.8, -2.5, 2.5); w.nofall = true; }
      const n = Math.ceil(Math.max(Math.abs(w.vx), Math.abs(w.vy))) || 1;
      for (let i = 0; i < n; i++) {
        const nx = w.x + w.vx / n;
        if (S(nx, w.y - 12) || S(nx, w.y - 4)) w.vx *= -0.35; else w.x = clamp(nx, 8, W - 8);
        const ny = w.y + w.vy / n;
        if (w.vy < 0 && S(w.x, ny - 20)) w.vy = 0;
        else if (w.vy > 0 && S(w.x, ny)) {
          if (w.vy > 7 && !w.nofall && state !== "end") hurt(w, Math.round((w.vy - 7) * 7), "fall");
          w.vy = 0; w.vx = SNOW && Math.abs(w.vx) > 0.6 ? w.vx * 0.7 : 0; w.ground = true; w.nofall = false; w.y = Math.floor(ny) - 1; let k = 0; while (S(w.x, w.y) && k++ < 14) w.y--; break;
        } else w.y = ny;
      }
      if (w.y > WATER + 8) drown(w);
    }
    function drown(w) {
      w.drown = true; splash(w.x); K.tone(500, 0.4, "sine", 0.1); K.tone(250, 0.5, "sine", 0.1, 0.2);
      bubbles = bubbles.filter((b) => b.w !== w);
      if (!w.dead) { w.hp = 0; w.dead = true; texts.push({ x: w.x, y: WATER - 40, t: 90, s: "بلُب بلُب… غرق " + w.name + "!", c: "#fff" }); if (!firstDrown) firstDrown = w.name; finalBlow(w); }
    }
    function slide(w) {   // الثلج: الدودة تتزحلق
      const nx = clamp(w.x + w.vx, 8, W - 8); let moved = false;
      for (let up = 0; up <= 3 && !moved; up++) if (!S(nx, w.y - up) && !S(nx, w.y - up - 14)) { w.x = nx; w.y -= up; moved = true; }
      if (!moved) { w.vx = 0; return; }
      let k = 0; while (!S(w.x, w.y + 1) && k++ < 4) w.y++;
      if (!S(w.x, w.y + 1)) w.ground = false;
      w.vx *= 0.94;
    }
    function walk(w, d) {
      if (SNOW && w.ground) w.vx = d * 1.1;
      w.face = d; if (!w.ground || ++w.wt % 2) return;
      const nx = w.x + d; if (nx < 8 || nx > W - 8) return;
      for (let up = 0; up <= 6; up++) if (!S(nx, w.y - up) && !S(nx, w.y - up - 16)) {
        w.x = nx; w.y -= up; let k = 0; while (!S(w.x, w.y + 1) && k++ < 6) w.y++;
        if (!S(w.x, w.y + 1)) w.ground = false;
        if (w.wt % 16 === 0) K.tone(180 + Math.random() * 40, 0.03, "triangle", 0.03);
        return; }
    }
    function jump() {
      const w = curW();
      if (state === "aim" && human(cur) && !menu && WP[weap[cur]].k === "wall") { wallV = !wallV; K.sfx.tick(); return; }
      if (!(state === "aim" || state === "fly") || !human(cur) || paused || menu || !w || !w.ground || w.dead) return;
      w.vy = -4.4; w.vx = w.face * 2.3; w.ground = false; K.tone(420, 0.06, "triangle", 0.08); K.tone(640, 0.08, "triangle", 0.08, 0.05);
    }
    function switchW(k) {
      if (state !== "aim" || !human(cur) || paused || charging) return;
      if (k !== undefined) { if (!has(cur, k)) { K.sfx.bad(); return; } weap[cur] = k; }
      else { let i = weap[cur]; do { i = (i + 1) % WP.length; } while (!has(cur, i)); weap[cur] = i; }
      cursor = null; K.tone(700, 0.06, "triangle", 0.1);
    }
    const mkP = (w, k, face, aim, pw) => { const a = aim * D2R, ax = Math.cos(a) * face, ay = -Math.sin(a);
      return { k, x: w.x + ax * 14, y: w.y - 11 + ay * 14, vx: ax * pw * 13, vy: ay * pw * 13, t: 0, own: w, rot: 0 }; };
    const hitW = (p) => worms.some((w) => !w.dead && (w !== p.own || p.t > 10) && (p.x - w.x) ** 2 + (p.y - w.y + 10) ** 2 < 144);
    const BOUNCE = { gr: 180, dy: 240 };
    function pstep(p) {
      p.t++; p.vy += G; if (p.k === "bz" || p.k === "wb") p.vx += wind; p.rot += p.vx * 0.05;
      for (let i = 0; i < 4; i++) { const px = p.x, py = p.y; p.x += p.vx / 4; p.y += p.vy / 4;
        if (p.x < -80 || p.x > W + 80 || p.y > WATER) return "gone";
        if (!BOUNCE[p.k]) { if (S(p.x, p.y) || hitW(p)) return "boom"; }
        else if (S(p.x, p.y)) { p.x = px; p.y = py; const hx = S(px + p.vx / 4, py), hy = S(px, py + p.vy / 4);
          if (Math.abs(p.vy) > 1.5 && p.sim !== 1) K.tone(p.k === "dy" ? 160 : 240, 0.05, "triangle", 0.05);
          if (hx) p.vx *= -0.5; if (hy) p.vy *= -0.45; if (!hx && !hy) { p.vx *= -0.5; p.vy *= -0.45; } p.vx *= p.k === "dy" ? 0.6 : 0.85; break; } }
      return BOUNCE[p.k] && p.t >= BOUNCE[p.k] ? "boom" : null;
    }
    function ray(w, face, aim) { const a = aim * D2R, ax = Math.cos(a) * face, ay = -Math.sin(a); let x = w.x, y = w.y - 11;
      for (let i = 0; i < 560; i++) { x += ax; y += ay; if (x < 0 || x > W || y < 0 || y > H) break;
        if (i > 12 && (S(x, y) || worms.some((o) => !o.dead && o !== w && (x - o.x) ** 2 + (y - o.y + 10) ** 2 < 100))) return { x, y, hit: 1 }; }
      return { x, y, hit: 0 }; }
    function fire() {
      const w = curW(), i = weap[cur], q = WP[i], k = q.k; charging = false; shooter = w;
      if (targeted(q) || q.sp === "rain") { fireSpecial(w, i, curTarget()); return; }
      if (k === "para") {
        w.chute = true; weap[cur] = 0; power = 0; needRel = true;
        texts.push({ x: w.x, y: w.y - 90, t: 80, s: "🪂 المظلة جاهزة، اقفز!", c: "#fff" }); K.tone(600, 0.1, "sine", 0.1); K.tone(900, 0.12, "sine", 0.1, 0.1);
        return;
      }
      if (q.sp === "point") {
        const ok = k === "tp" ? tpOk() : wallOk(w);
        if (!ok) { K.sfx.bad(); texts.push({ x: cursor.x, y: cursor.y - 30, t: 50, s: "لا يمكن هنا", c: "#fca5a5" }); needRel = true; return; }
        ammo[cur][i]--; needRel = true; power = 0;
        if (k === "tp") {
          for (let j = 0; j < 20; j++) { const a = rnd(0, 7); parts.push({ x: w.x, y: w.y - 10, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, l: 30, c: "#c084fc", r: 3, g: 0 }); }
          w.x = cursor.x; w.y = cursor.y; w.vx = 0; w.vy = 0; w.ground = false; w.nofall = true;
          for (let j = 0; j < 20; j++) { const a = rnd(0, 7); parts.push({ x: w.x, y: w.y - 10, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, l: 30, c: "#a855f7", r: 3, g: 0 }); }
          for (let j = 0; j < 6; j++) K.tone(300 + j * 180, 0.08, "sine", 0.08, j * 0.05);
          state = "hop"; st = 0;
        } else { buildWall(cursor.x, cursor.y); K.tone(160, 0.12, "square", 0.1); K.tone(200, 0.12, "square", 0.1, 0.15); }
        cursor = null; if (!has(cur, i)) weap[cur] = 0;
        return;
      }
      if (q.sp) ammo[cur][i]--;
      if (k === "sg") { const r = ray(w, w.face, w.aim); tracer = { x1: w.x, y1: w.y - 11, x2: r.x, y2: r.y, t: 14 };
        K.tone(180, 0.12, "square", 0.09); noise(0.15, 0.35); K.tone(160, 0.12, "square", 0.08, 0.25); noise(0.1, 0.2);
        if (r.hit) explode(r.x, r.y, WP[2].r, WP[2].d, "sg"); toSettle(); }
      else if (k === "hj") {
        const a = w.aim * D2R, pw = Math.max(0.3, power);
        w.vx = Math.cos(a) * w.face * pw * 8; w.vy = -Math.abs(Math.sin(a)) * pw * 9 - 2; w.ground = false; w.nofall = true; hopUsed = true;
        K.tone(250, 0.1, "sine", 0.12); K.tone(500, 0.12, "sine", 0.12, 0.08); K.tone(1000, 0.15, "sine", 0.1, 0.16);
        if (!has(cur, weap[cur])) weap[cur] = 0;
        state = "hop"; st = 0;
      } else if (k === "pan") {
        swing = { x: w.x, y: w.y - 12, f: w.face, t: 16 };
        const v = worms.find((o) => !o.dead && o !== w && (o.x - w.x) * w.face > -4 && (o.x - w.x) * w.face < 40 && Math.abs(o.y - w.y) < 26);
        if (v) { const a = Math.max(20, w.aim) * D2R;
          hurt(v, WP[i].d, "pan"); v.vx = Math.cos(a) * w.face * 9; v.vy = -Math.sin(a) * 9 - 2; v.ground = false; shake = 6;
          K.tone(1300, 0.5, "triangle", 0.16); K.tone(1950, 0.4, "sine", 0.09); K.tone(660, 0.6, "sine", 0.06, 0.05); }
        else { noise(0.15, 0.15); texts.push({ x: w.x, y: w.y - 74, t: 60, s: "ما في حدا!", c: "#fff" }); }
        toSettle();
      } else if (k === "brl") {
        projs.push({ k, x: w.x + w.face * 16, y: w.y - 1, vx: w.face * 2.2, vy: 0, t: 0, own: w, rot: 0, still: 0 });
        K.tone(120, 0.2, "triangle", 0.1); state = "fly";
      } else if (k === "boom") {
        const a = w.aim * D2R, ax = Math.cos(a) * w.face, ay = -Math.sin(a), pw = Math.max(0.3, power);
        projs.push({ k, x: w.x + ax * 14, y: w.y - 11 + ay * 14, vx: ax * pw * 11, vy: ay * pw * 11, ax0: ax, ay0: ay, t: 0, own: w, rot: 0, hits: new Set() });
        K.tone(400, 0.15, "triangle", 0.08); state = "fly";
      } else if (k === "dy") {
        projs.push({ k, x: w.x + w.face * 10, y: w.y - 8, vx: w.face * 1.4, vy: -1.5, t: 0, own: w, rot: 0 });
        K.tone(900, 0.05, "square", 0.05); state = "fly";
      } else {
        projs.push(mkP(w, k, w.face, w.aim, Math.max(0.12, power))); state = "fly";
        if (k === "bz") { noise(0.35, 0.3); K.tone(220, 0.25, "sawtooth", 0.05); }
        else if (k === "wm" || k === "ff") { K.tone(300, 0.1, "sine", 0.1); K.tone(200, 0.1, "sine", 0.1, 0.08); }
        else if (k === "wb") { K.tone(700, 0.1, "sine", 0.08); K.tone(500, 0.1, "sine", 0.08, 0.06); }
        else K.tone(500, 0.08, "triangle", 0.08);
      }
      power = 0;
    }
    function toSettle() { state = "settle"; st = 0; charging = false; power = 0; }
    const tpOk = () => cursor && cursor.y < WATER - 20 && !S(cursor.x, cursor.y) && !S(cursor.x, cursor.y - 8) && !S(cursor.x, cursor.y - 18);
    const wallRect = (x, y) => (wallV ? [x - 7, y - 30, 14, 60] : [x - 36, y - 7, 72, 14]);
    function wallOk(w) {
      if (!cursor) return false;
      const [x, y, rw, rh] = wallRect(cursor.x, cursor.y);
      if (x < 0 || y < 0 || x + rw > W || y + rh > WATER || Math.hypot(cursor.x - w.x, cursor.y - w.y) > 300) return false;
      return !worms.some((o) => !o.drown && o.x + 9 > x && o.x - 9 < x + rw && o.y > y && o.y - 24 < y + rh);
    }
    function buildWall(cx, cy) {
      const [x, y, rw, rh] = wallRect(cx, cy).map(Math.round);
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) solid[j * W + i] = 1;
      tx.fillStyle = "#b45309"; tx.fillRect(x, y, rw, rh);
      tx.strokeStyle = "#7c2d12"; tx.lineWidth = 1.5;
      for (let j = y; j < y + rh; j += 7) for (let i = x + ((((j - y) / 7) | 0) % 2) * 6; i < x + rw; i += 12) tx.strokeRect(i, j, Math.min(12, x + rw - i), Math.min(7, y + rh - j));
      for (let j = 0; j < 14; j++) parts.push({ x: cx + rnd(-20, 20), y: cy + rnd(-20, 20), vx: rnd(-1, 1), vy: rnd(-2, 0), l: 25, c: "#d6d3d1", r: 3, g: 1 });
    }
    function soak(x, y) {
      noise(0.35, 0.4); K.tone(260, 0.18, "sine", 0.12);
      for (let i = 0; i < 26; i++) { const a = rnd(0, 7), v = rnd(1, 6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, l: rnd(25, 45), c: i % 2 ? "#60a5fa" : "#dbeafe", r: rnd(2, 4), g: 1 }); }
      for (const w of worms) { if (w.drown || w.dead) continue;
        const dx = w.x - x, dy = w.y - 10 - y, d = Math.hypot(dx, dy);
        if (d < 75) { const f = 1 - d / 80, a = Math.atan2(dy, dx || 0.01); w.vx = Math.cos(a) * f * 9; w.vy = Math.sin(a) * f * 9 - 3.5; w.ground = false;
          say(w, K.pick(["مبلول!", "مين رشّني؟", "برد برد!", "تحممت!"])); } }
    }

    // ------------------------------------------------ الأصوات الخاصة
    function impactSfx(k) {
      if (k === "sl") { noise(0.1, 0.7); K.tone(950, 0.05, "square", 0.12); }
      else if (k === "st") { K.tone(85, 0.25, "sine", 0.3); noise(0.25, 0.4); }
      else if (k === "rc") { K.tone(1500, 0.05, "square", 0.08); K.tone(60, 0.35, "sawtooth", 0.08, 0.05); }
      else if (k === "ph") { K.tone(1760, 0.08, "sine", 0.12); K.tone(1320, 0.12, "sine", 0.12, 0.1); }
      else if (k === "car") { K.tone(420, 0.15, "square", 0.08); K.tone(320, 0.25, "square", 0.08, 0.15); }
      else if (k === "bt") { K.tone(55, 0.35, "square", 0.14); noise(0.3, 0.6); }
      else if (k === "ck") { K.tone(800, 0.06, "square", 0.08); K.tone(1100, 0.12, "square", 0.08, 0.08); K.tone(600, 0.1, "square", 0.08, 0.22); }
      else if (k === "wm") { noise(0.3, 0.55); K.tone(140, 0.18, "triangle", 0.12); }
      else if (k === "ff" || k === "fb") { noise(0.15, 0.3); K.tone(700, 0.05, "square", 0.05); }
      else if (k === "brl") { K.tone(50, 0.5, "sawtooth", 0.12); noise(0.6, 0.6); }
      else if (k === "met") { K.tone(90, 0.3, "sawtooth", 0.08); }
    }
    function flySfx(p) {
      if (p.k === "ph" && p.t % 12 === 0) K.tone((p.t / 12) % 2 ? 1400 : 1750, 0.08, "sine", 0.05);
      else if (p.k === "rc" && p.t % 15 === 0) K.tone(1200 + (p.t % 30) * 10, 0.04, "square", 0.04);
      else if (p.k === "car" && p.t % 10 === 0) K.tone(70 + (p.t % 20), 0.1, "sawtooth", 0.035);
      else if (p.k === "ck" && p.t % 24 === 0) { K.tone(750, 0.05, "square", 0.06); K.tone(950, 0.06, "square", 0.06, 0.07); }
      else if (p.k === "sl" && p.t % 9 === 0) K.tone(500 + Math.random() * 200, 0.03, "triangle", 0.03);
      else if (p.k === "dy" && p.t % 6 === 0) noise(0.05, 0.08);
      else if (p.k === "bee" && p.lead && p.t > 0 && p.t % 6 === 0) K.tone(210 + (p.t % 12) * 4, 0.07, "sawtooth", 0.025);
      else if (p.k === "boom" && p.t % 10 === 0) K.tone(300 + Math.hypot(p.vx, p.vy) * 40, 0.06, "triangle", 0.04);
    }

    // ------------------------------------------------ الصناديق والأسلحة الخاصة
    const has = (t, i) => (WP[i].k === "hj" ? !hopUsed : i < BASIC || (ammo[t][i] || 0) > 0);
    const CUST = new Set(["boom", "brl", "met"]);
    const targets = () => worms.filter((o) => !o.dead && o.t !== cur).sort((a, b) => a.x - b.x);
    const curTarget = () => { const T = targets(); return T.length ? T[((tgt % T.length) + T.length) % T.length] : null; };
    const targeted = (q) => ["home", "car", "sky", "bee"].includes(q.sp);
    function dropCrate() {
      let x, k = 0;
      do { x = rnd(100, W - 100); k++; } while (k < 200 && topY(x) > WATER - 30);
      crates.push({ x, y: -30, land: false, sw: rnd(0, 7), med: Math.random() < 0.3 });
      texts.push({ x, y: 150, t: 90, s: "صندوق!", c: "#fde047" });
    }
    function updCrates() {
      crates = crates.filter((c) => {
        c.sw += 0.05;
        if (c.land) { if (!S(c.x, c.y + 1)) c.land = false; }
        else { c.y += 1.4; if (S(c.x, c.y + 1)) { c.land = true; let k = 0; while (S(c.x, c.y) && k++ < 20) c.y--; } }
        if (c.y > WATER) { splash(c.x); return false; }
        const w = worms.find((o) => !o.dead && Math.abs(o.x - c.x) < 24 && Math.abs(o.y - 10 - (c.y - 11)) < 28);
        if (w) {
          if (c.med) { w.hp = Math.min(150, w.hp + 25); texts.push({ x: c.x, y: c.y - 40, t: 100, s: "+25 ❤️", c: "#4ade80" }); say(w, K.pick(["شكراً يا دكتور!", "صحتي رجعت!", "أحسن من الأول!"]));
            K.tone(523, 0.12, "sine", 0.12); K.tone(784, 0.12, "sine", 0.12, 0.1); K.tone(1047, 0.2, "sine", 0.12, 0.2); }
          else { const i = crateWeapon(); ammo[w.t][i] = (ammo[w.t][i] || 0) + 1; w.crates = (w.crates || 0) + 1;
            texts.push({ x: c.x, y: c.y - 40, t: 100, s: "+ " + WP[i].e + " " + WP[i].name, c: TM[w.t].light }); K.sfx.ok(); }
          return false;
        }
        return true;
      });
    }
    function fireSpecial(w, i, T) {
      const q = WP[i];
      shooter = w;
      if (q.sp === "rain") {
        ammo[cur][i]--; charging = false; power = 0;
        for (let j = 0; j < 9; j++) projs.push({ k: "met", x: rnd(60, W - 60), y: -30, vx: rnd(-1.5, 1.5) + wind * 20, vy: rnd(3, 5), t: -j * 16, own: w, rot: 0 });
        texts.push({ x: w.x, y: w.y - 80, t: 70, s: "☄️ مطر نيازك!", c: "#fde047" }); K.tone(200, 0.6, "sawtooth", 0.05);
        state = "fly"; return;
      }
      if (!T) return;
      const f = T.x > w.x ? 1 : -1;
      ammo[cur][i]--; charging = false; power = 0; w.face = f;
      if (q.sp === "bee") {
        for (let j = 0; j < 5; j++) projs.push({ k: "bee", x: w.x + f * 8, y: w.y - 20, vx: f * 2 + rnd(-1, 1), vy: -3 + rnd(-1, 1), t: -j * 10, own: w, tg: T, ph: rnd(0, 7), lead: j === 0 });
        texts.push({ x: w.x, y: w.y - 80, t: 60, s: "🐝 خلية نحل!", c: "#fde047" });
        state = "fly"; return;
      }
      if (q.sp === "home") projs.push({ k: q.k, x: w.x + f * 10, y: w.y - 16, vx: f * 4, vy: -8, t: 0, own: w, tg: T, rot: 0, lx: T.x, ly: T.y - 10 });
      else if (q.sp === "car") projs.push({ k: q.k, x: w.x + f * 18, y: w.y, vy: 0, t: 0, own: w, tg: T, face: f, gr: true });
      else { projs.push({ k: "bt", x: T.x, y: -80, vx: 0, vy: 2, t: 0, own: w, tg: T });
        for (let j = 0; j < 9; j++) K.tone(1500 - j * 120, 0.12, "sine", 0.05, j * 0.11); }
      texts.push({ x: w.x, y: w.y - 80, t: 60, s: q.name + "!", c: "#fde047" });
      if (q.k === "car") { K.tone(400, 0.18, "square", 0.08); K.tone(500, 0.22, "square", 0.08, 0.22); }
      else if (q.k === "ck") { K.tone(700, 0.08, "square", 0.08); K.tone(1000, 0.15, "square", 0.08, 0.1); }
      else if (q.sp === "home") { noise(0.12, 0.15); K.tone(600, 0.1, "triangle", 0.08); }
      state = "fly";
    }
    function gy(x, y) { for (let d = -10; d <= 14; d++) if (S(x, y + d)) return y + d; return y + 14; }
    function sstep(p) {
      p.t++;
      const T = p.tg;
      if (p.k === "met") {
        if (p.t < 0) return null;
        if (p.t === 1) for (let j = 0; j < 5; j++) K.tone(1300 - j * 160, 0.1, "sine", 0.03, j * 0.08);
        p.vy += 0.12; p.x += p.vx; p.y += p.vy; p.rot += 0.2;
        if (frame % 2) parts.push({ x: p.x, y: p.y, vx: rnd(-0.5, 0.5), vy: -0.5, l: 18, c: Math.random() < 0.5 ? "#f97316" : "#fde047", r: 3, g: 0 });
        if (p.y > WATER) return "gone";
        if (p.y > 0 && (S(p.x, p.y) || hitW(p))) return "boom";
        return null;
      }
      if (p.k === "bee") {
        if (p.t < 0) return null;
        if (T.dead || T.drown) { p.vy -= 0.15; p.x += p.vx; p.y += p.vy; return p.y < -40 ? "gone" : null; }
        const tx2 = T.x + Math.sin(p.t / 7 + p.ph) * 10, ty2 = T.y - 12 + Math.cos(p.t / 5 + p.ph) * 8;
        const dx = tx2 - p.x, dy = ty2 - p.y, d = Math.hypot(dx, dy) || 1;
        p.vx += ((dx / d) * 5.5 - p.vx) * 0.1; p.vy += ((dy / d) * 5.5 - p.vy) * 0.1;
        p.x += p.vx + Math.sin(p.t / 3 + p.ph) * 1.2; p.y += p.vy + Math.cos(p.t / 4 + p.ph) * 1.2;
        if (d < 12 && p.t > 20) return "sting";
        return p.t > 420 ? "gone" : null;
      }
      if (p.k === "boom") {
        p.rot += 0.5; p.vx -= p.ax0 * 0.2; p.vy -= p.ay0 * 0.2; p.vy += 0.02;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -40 || p.x > W + 40 || p.y > WATER || p.t > 240) return "gone";
        if (S(p.x, p.y)) { for (let j = 0; j < 8; j++) parts.push({ x: p.x, y: p.y, vx: rnd(-2, 2), vy: rnd(-3, 0), l: 25, c: "#6b4228", r: 2, g: 1 }); K.tone(140, 0.08, "triangle", 0.1); return "gone"; }
        for (const o of worms) if (!o.dead && !p.hits.has(o) && (o !== p.own || p.t > 25) && (p.x - o.x) ** 2 + (p.y - o.y + 10) ** 2 < 196) {
          p.hits.add(o); hurt(o, 20, o === p.own ? "boomself" : "boom"); o.vx = Math.sign(p.vx || 1) * 3; o.vy = -3; o.ground = false;
          K.tone(500, 0.06, "square", 0.1); noise(0.1, 0.3); }
        return null;
      }
      if (p.k === "brl") {
        p.vy += G; p.rot += p.vx / 8;
        const nx = p.x + p.vx;
        let moved = false;
        for (let up = 0; up <= 3 && !moved; up++) if (!S(nx, p.y - up) && !S(nx, p.y - up - 10)) { p.x = nx; p.y -= up; moved = true; }
        if (!moved) { if (Math.abs(p.vx) > 1.2) return "boom"; p.vx *= -0.3; }
        if (S(p.x, p.y + 1) && p.vy >= 0) { if (p.vy > 7) return "boom"; p.vy = 0; p.vx = (p.vx + (gy(p.x + 6, p.y) - gy(p.x - 6, p.y)) * 0.012) * 0.995; }
        else { p.y += p.vy; let k = 0; while (S(p.x, p.y) && k++ < 20) { p.y--; if (p.vy > 7) return "boom"; p.vy = 0; } }
        if (p.y > WATER || p.x < 0 || p.x > W) return "gone";
        if (p.t % 12 === 0 && Math.abs(p.vx) > 0.4) K.tone(90 + Math.abs(p.vx) * 30, 0.08, "triangle", 0.05);
        if (worms.some((o) => !o.dead && (o !== p.own || p.t > 40) && Math.abs(o.x - p.x) < 16 && Math.abs(o.y - 8 - p.y) < 20)) return "boom";
        p.still = Math.abs(p.vx) < 0.15 ? p.still + 1 : 0;
        return p.still > 90 || p.t > 600 ? "boom" : null;
      }
      if (p.k === "car" || p.k === "ck") {
        const f = p.face, sp = p.k === "ck" ? 2.6 : 3.2, nx = p.x + f * sp;
        let moved = false;
        for (let up = 0; up <= 8 && !moved; up++) if (!S(nx, p.y - up) && !S(nx, p.y - up - 12)) { p.x = nx; p.y -= up; moved = true; }
        if ((!moved || (p.k === "ck" && p.t % 22 === 0)) && p.gr) { p.vy = p.k === "ck" ? -4.5 : -5.5; p.gr = false; }
        if (S(p.x, p.y + 1) && p.vy >= 0) { p.gr = true; p.vy = 0; } else p.gr = false;
        if (!p.gr) { p.vy = Math.min(10, p.vy + G); p.y += p.vy; let k = 0; while (S(p.x, p.y) && k++ < 20) { p.y--; p.vy = 0; } }
        if (p.y > WATER || p.x < 0 || p.x > W) return "gone";
        if (frame % 3 === 0) parts.push({ x: p.x - f * 16, y: p.y - 4, vx: -f * 0.5, vy: -0.4, l: 22, c: p.k === "ck" ? "rgba(255,255,255,.8)" : "rgba(120,120,120,.5)", r: p.k === "ck" ? 2 : 3, g: 0 });
        if (worms.some((o) => !o.dead && o.t !== p.own.t && Math.abs(o.x - p.x) < 20 && Math.abs(o.y - p.y) < 28)) return "boom";
        if ((f > 0 && p.x >= T.x) || (f < 0 && p.x <= T.x) || p.t > 480) return "boom";
        return null;
      }
      if (p.k === "bt") {
        const tx = T.dead ? p.x : T.x;
        p.x += (tx - p.x) * 0.06; p.vy = Math.min(14, p.vy + 0.35); p.y += p.vy;
        if (p.y > WATER) return "gone";
        if (p.y > 0 && (S(p.x, p.y + 6) || worms.some((o) => !o.dead && Math.abs(o.x - p.x) < 22 && Math.abs(o.y - 10 - p.y) < 20))) return "boom";
        return null;
      }
      // رمي موجَّه: يطير عالياً ثم ينقضّ على الهدف (يمرّ فوق الجبال)
      p.rot += 0.35;
      if (!T.dead && !T.drown) { p.lx = T.x; p.ly = T.y - 10; }
      if (p.t < 16) p.vy += G;
      else {
        const dx = p.lx - p.x, hy = Math.abs(dx) > 120 ? p.ly - 110 : p.ly, dy = hy - p.y, d = Math.hypot(dx, dy) || 1, sp = 9;
        p.vx += ((dx / d) * sp - p.vx) * 0.12; p.vy += ((dy / d) * sp - p.vy) * 0.12;
      }
      p.x += p.vx; p.y += p.vy;
      if (p.y > WATER) return "gone";
      if (Math.hypot(p.lx - p.x, p.ly - p.y) < 14 || p.t > 400) return "boom";
      if (p.t > 16 && worms.some((o) => !o.dead && o.t !== p.own.t && (p.x - o.x) ** 2 + (p.y - o.y + 10) ** 2 < 196)) return "boom";
      return null;
    }

    // ------------------------------------------------ الكمبيوتر
    function score(w, x, y, k) { let s = 0, m = 1e9; const R = WP[k].r + 10;
      for (const o of worms) { if (o.dead) continue; const d = Math.hypot(o.x - x, o.y - 10 - y);
        if (o.t !== w.t) m = Math.min(m, d);
        if (d < R) { const dm = WP[k].d * (1 - d / R); s += o.t === w.t ? -dm * 1.6 : dm + (dm >= o.hp ? 40 : 0); } }
      return s - m * 0.05; }
    function plan(w) {
      const mi = WI("met");
      if ((ammo[w.t][mi] || 0) > 0 && Math.random() < 0.5) return { sp: true, k: mi, target: null };
      const si = ["bt", "car", "ck", "bee", "st", "ph", "sl", "rc"].map(WI).find((i) => (ammo[w.t][i] || 0) > 0);
      if (si !== undefined && Math.random() < 0.85) {
        const T = targets().filter((o) => !o.drown);
        if (T.length) return { sp: true, k: si, target: T.reduce((a, o) => (o.hp < a.hp ? o : a), T[0]) };
      }
      let best = { sc: -1e9, k: 0, face: w.face, aim: 30, pw: 0.6 };
      for (const k of [0, 1]) for (const f of [-1, 1]) for (let a = -20; a <= 85; a += 5) for (let pw = 0.3; pw <= 1.001; pw += 0.05) {
        const p = mkP(w, WP[k].k, f, a, pw); p.sim = 1; let r = null; for (let i = 0; i < 500 && !r; i++) r = pstep(p);
        if (r !== "boom") continue; const s = score(w, p.x, p.y, k) - (k === 1 ? 3 : 0);
        if (s > best.sc) best = { sc: s, k, face: f, aim: a, pw }; }
      if (L.sg) for (const o of worms) { if (o.dead || o.t === w.t) continue;
        const f = o.x > w.x ? 1 : -1, a = Math.atan2(-(o.y - w.y), Math.abs(o.x - w.x)) / D2R;
        if (Math.abs(a) > 85 || Math.hypot(o.x - w.x, o.y - w.y) > 450) continue;
        const r = ray(w, f, a);
        if (r.hit && Math.hypot(r.x - o.x, r.y - o.y + 10) < 12) { const s = 22 + (o.hp <= 25 ? 40 : 0); if (s > best.sc) best = { sc: s, k: 2, face: f, aim: a, pw: 1 }; } }
      if (best.k !== 2) { best.aim += rnd(-L.aj, L.aj); best.pw = clamp(best.pw + rnd(-L.pj, L.pj), 0.15, 1); }
      return best;
    }

    // ------------------------------------------------ قائمة الأسلحة
    const MC = 5, CW = 190, CH = 86, GAPM = 10, MX = (W - (MC * CW + (MC - 1) * GAPM)) / 2, MY = 150, ROWS = Math.ceil(WP.length / MC);
    const cardXY = (i) => { const col = i % MC, row = (i / MC) | 0; return [MX + (MC - 1 - col) * (CW + GAPM), MY + row * (CH + GAPM)]; };
    function openMenu() {
      if (state !== "aim" || !human(cur) || paused || charging || menu) return;
      menu = { sel: weap[cur] }; K.sfx.pop();
    }
    function menuMove(dx, dy) {
      if (!menu) return;
      let s = menu.sel;
      if (dx) s = s + (dx > 0 ? -1 : 1);   // اليمين في الشاشة = العنصر السابق (ترتيب من اليمين)
      if (dy) s = s + dy * MC;
      if (s >= 0 && s < WP.length) { menu.sel = s; K.sfx.tick(); }
    }
    function menuPick(i = menu.sel) {
      if (!menu) return;
      if (!has(cur, i)) { K.sfx.bad(); return; }
      weap[cur] = i; menu = null; needRel = true; cursor = null; enterAt = -1; K.tone(700, 0.06, "triangle", 0.1); K.tone(1050, 0.08, "triangle", 0.1, 0.06);
    }

    // ------------------------------------------------ التحكم
    const keys = new Set(), touch = {}, padSt = [null, null], padPrev = [[], []], padDir = [[0, 0], [0, 0]];
    function ctl() {
      const c = { m: 0, a: 0, f: false };
      if (keys.has("ArrowLeft")) c.m--; if (keys.has("ArrowRight")) c.m++;
      if (keys.has("ArrowUp")) c.a++; if (keys.has("ArrowDown")) c.a--;
      if (keys.has("Space")) c.f = true;
      if (enterAt >= 0 && keys.has("Enter") && frame - enterAt >= HOLD) { c.f = true; enterUsed = true; }
      for (const p of padSt) if (p && p.t === cur) { c.m += p.m; c.a += p.a; c.f = c.f || p.f; }
      c.m += (touch.r ? 1 : 0) - (touch.l ? 1 : 0); c.a += (touch.u ? 1 : 0) - (touch.d ? 1 : 0); c.f = c.f || !!touch.f;
      c.m = clamp(c.m, -1, 1); c.a = clamp(c.a, -1, 1);
      return c;
    }
    const clearKeys = () => { keys.clear(); enterAt = -1; };
    K.mode = {
      key(e) {
        let code = e.code || e.key;
        if (code === "NumpadEnter") code = "Enter";
        if (menu) {
          if (e.key === "Backspace" || code === "Escape" || code === "Tab") { menu = null; K.sfx.pop(); return true; }
          if (code === "ArrowLeft") menuMove(-1, 0); else if (code === "ArrowRight") menuMove(1, 0);
          else if (code === "ArrowUp") menuMove(0, -1); else if (code === "ArrowDown") menuMove(0, 1);
          else if (!e.repeat && (code === "Enter" || code === "Space")) menuPick();
          else { const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) menuPick(n - 1); }
          return true;
        }
        if (e.key === "Backspace") { K.back(); return true; }
        if (code === "KeyP" || e.key === "MediaPlayPause") { togglePause(); return true; }
        if (!e.repeat) {
          if (paused && (code === "Enter" || code === "Space")) { togglePause(); return true; }
          if (code === "Enter") { enterAt = frame; enterUsed = false; }
          if (code === "Tab" || code === "KeyQ" || code === "KeyM") openMenu();
          if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyJ") jump();
          const n = parseInt(e.key, 10); if (n >= 1 && n <= 5) switchW(n - 1);
        }
        keys.add(code);
        return true;
      },
      keyup(e) {
        let code = e.code || e.key; if (code === "NumpadEnter") code = "Enter";
        if (code === "Enter" && enterAt >= 0) { if (!enterUsed && frame - enterAt < HOLD) openMenu(); enterAt = -1; }
        keys.delete(code);
      },
      poll(pads) {
        pads.slice(0, 2).forEach((pd, j) => {
          if (gone) return;
          const t = CPU ? 0 : pads.length >= 2 ? j : cur;
          const b = (n) => !!(pd.buttons[n] && pd.buttons[n].pressed), pv = padPrev[j], edge = (n) => b(n) && !pv[n];
          const ax = pd.axes[0] || 0, ay = pd.axes[1] || 0, ry = pd.axes[3] || 0;
          const dx = b(14) || ax < -0.5 ? -1 : b(15) || ax > 0.5 ? 1 : 0, dy = b(12) || ay < -0.5 ? -1 : b(13) || ay > 0.5 ? 1 : 0;
          const pdv = padDir[j], dEdge = [dx && dx !== pdv[0] ? dx : 0, dy && dy !== pdv[1] ? dy : 0]; padDir[j] = [dx, dy];
          padSt[j] = { t, m: dx, a: dy ? -dy : ry < -0.5 ? 1 : ry > 0.5 ? -1 : 0, f: b(2) || b(5) || b(7) };
          if (menu && t === cur) {
            if (dEdge[0] || dEdge[1]) menuMove(dEdge[0], dEdge[1]);
            if (edge(0)) menuPick();
            if (edge(1)) { menu = null; K.sfx.pop(); }
            padSt[j].f = false;
          } else {
            if (edge(1)) { gone = true; K.back(); return; }
            if (edge(0) || edge(2)) K.audioCtx();
            if (edge(9)) togglePause();
            else if (paused && (edge(0) || edge(2))) togglePause();
            else if (t === cur) { if (edge(0)) openMenu(); if (edge(4)) switchW(); if (edge(3)) jump(); }
          }
          pd.buttons.forEach((_, n) => (pv[n] = b(n)));
        });
        for (let j = pads.length; j < 2; j++) padSt[j] = null;
        return true;
      },
      stop() { gone = true; cancelAnimationFrame(raf); removeEventListener("resize", fit); removeEventListener("blur", clearKeys); },
    };
    addEventListener("resize", fit); addEventListener("blur", clearKeys);
    const showPad = () => tpad.classList.add("on");
    if (matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) showPad();
    cv.addEventListener("pointerdown", (e) => {
      K.audioCtx(); showPad(); e.preventDefault();
      if (paused) { togglePause(); return; }
      if (menu) {
        const wx = (e.clientX - ox) / sc, wy = (e.clientY - oy) / sc;
        const i = WP.findIndex((_, i) => { const [x, y] = cardXY(i); return wx >= x && wx <= x + CW && wy >= y && wy <= y + CH; });
        if (i >= 0) menuPick(i); else menu = null;
      }
    });
    tpad.querySelectorAll("button").forEach((bt) => {
      const c = bt.dataset.c;
      const on = (e) => { e.preventDefault(); K.audioCtx(); bt.setPointerCapture && bt.setPointerCapture(e.pointerId); bt.classList.add("dn");
        if (menu) { if (c === "l") menuMove(-1, 0); else if (c === "r") menuMove(1, 0); else if (c === "u") menuMove(0, -1); else if (c === "d") menuMove(0, 1);
          else if (c === "f") menuPick(); else menu = null; return; }
        if (c === "j") jump(); else if (c === "m") openMenu(); else touch[c] = true; };
      const off = () => { bt.classList.remove("dn"); touch[c] = false; };
      bt.addEventListener("pointerdown", on);
      bt.addEventListener("pointerup", off); bt.addEventListener("pointercancel", off); bt.addEventListener("lostpointercapture", off);
      bt.addEventListener("contextmenu", (e) => e.preventDefault());
    });
    function togglePause() {
      if (state === "end") return;
      paused = !paused; needRel = true; menu = null;
      msg.innerHTML = paused ? `<div class="win" style="--c:#1e3a8a">⏸️ استراحة<small>اضغط Enter أو ✕ أو المس الشاشة للمتابعة</small></div>` : "";
    }

    // ------------------------------------------------ الحلقة
    function humanInput(w) {
      const c = ctl(), q = WP[weap[cur]];
      if (needRel) { if (!c.f) needRel = false; c.f = false; }
      if (state === "fly") { if (c.m) walk(w, c.m); return; }   // وقت للهروب بعد الرمي
      if (q.sp === "point") {
        if (!cursor) cursor = { x: w.x, y: w.y - 70 };
        cursor.x = clamp(cursor.x + c.m * 5, 10, W - 10); cursor.y = clamp(cursor.y - c.a * 5, 30, WATER - 10);
        if (c.f) { needRel = true; fire(); }
        return;
      }
      if (targeted(q)) {
        if (c.a && c.a !== prevA) { tgt -= c.a; K.sfx.tick(); }
        prevA = c.a;
        if (c.m) walk(w, c.m);
        if (c.f) { needRel = true; fire(); }
        return;
      }
      if (c.m && !charging) walk(w, c.m);
      if (c.a) w.aim = clamp(w.aim + c.a * 1.2, -85, 85);
      if (c.f) {
        if (q.fire === "tap") { needRel = true; fire(); }
        else { charging = true; power += 1 / 75; if (frame % 6 === 0) K.tone(300 + power * 500, 0.05, "sine", 0.04); if (power >= 1) { power = 1; fire(); needRel = true; } }
      } else if (charging) fire();
    }
    function update() {
      frame++;
      for (const c of clouds) { c.x += wind * 30 + 0.05; if (c.x > W + 140) c.x = -140; if (c.x < -140) c.x = W + 140; }
      parts = parts.filter((p) => { p.x += p.vx; p.y += p.vy; if (p.g) p.vy += G * 0.8; return --p.l > 0; });
      texts = texts.filter((t) => { t.y -= 0.5; return --t.t > 0; });
      bubbles = bubbles.filter((b) => --b.t > 0 && !b.w.drown);
      if (tracer && --tracer.t <= 0) tracer = null;
      if (swing && --swing.t <= 0) swing = null;
      if (shake > 0) shake *= 0.85;
      if (banner > 0) banner--;
      if (Math.abs(WATER - waterTo) > 0.1) WATER += (waterTo - WATER) * 0.02;
      if (slow > 0) slow--;
      const tz = slow > 0 && focus ? 1.7 : 1, tcx = slow > 0 && focus ? clamp(focus.x, W / 2 / tz, W - W / 2 / tz) : W / 2, tcy = slow > 0 && focus ? clamp(focus.y - 20, H / 2 / tz, H - H / 2 / tz) : H / 2;
      camZ += (tz - camZ) * 0.08; camX += (tcx - camX) * 0.08; camY += (tcy - camY) * 0.08;
      worms.forEach(wphys);
      updCrates();
      if (state === "end") {
        endT++;
        if (winner >= 0) for (const w of team(winner)) if (!w.dead && w.ground && Math.random() < 0.05) { w.vy = -rnd(3.5, 5.5); w.vx = rnd(-0.6, 0.6); w.ground = false; w.face = -w.face; w.dance = 30; }
        if (frame % 3 === 0) parts.push({ x: rnd(0, W), y: -10, vx: rnd(-1, 1), vy: rnd(1.5, 3), l: 260, c: `hsl(${rnd(0, 360) | 0},90%,60%)`, r: rnd(3, 5), g: 0 });
        if (endT === 330) {
          const best = worms.reduce((a, o) => ((o.dmg || 0) > (a.dmg || 0) ? o : a), worms[0]);
          const king = worms.reduce((a, o) => ((o.crates || 0) > (a.crates || 0) ? o : a), worms[0]);
          const oops = worms.reduce((a, o) => ((o.self || 0) > (a.self || 0) ? o : a), worms[0]);
          const titles = [];
          if (best.dmg) titles.push(`🎯 أفضل رامٍ: ${best.name} (${best.dmg} ضرر)`);
          if (king.crates) titles.push(`📦 ملك الصناديق: ${king.name} (${king.crates})`);
          if (firstDrown) titles.push(`🌊 أول من غرق: ${firstDrown} 😅`);
          if (oops.self >= 15) titles.push(`🤦 ضرب فريقه: ${oops.name}`);
          K.replace(endScreen, { mode, lvl, w: winner, titles });
        }
        return;
      }
      const w = curW();
      if (state === "aim") {
        if (w.dead) { toSettle(); return; }
        if (menu) return;   // الوقت يتوقف والقائمة مفتوحة
        if (--timer <= 0) { say(w, "انتهى وقتي!"); toSettle(); return; }
        if (timer <= 300 && timer % 60 === 0) K.sfx.tick();
        if (human(cur)) humanInput(w);
        else if (ai) {
          if (!ai.plan && ai.t <= L.wait) ai.plan = plan(w);
          if (ai.plan && ai.plan.sp) { weap[cur] = ai.plan.k; if (ai.plan.target) tgt = targets().indexOf(ai.plan.target);
            if (ai.t > 0) ai.t--; else fireSpecial(w, ai.plan.k, ai.plan.target); return; }
          if (ai.t > 0) { ai.t--; if (ai.plan) { w.face = ai.plan.face; weap[cur] = ai.plan.k; w.aim += (ai.plan.aim - w.aim) * 0.07; } }
          else { const P = ai.plan; w.aim = P.aim; if (P.k === 2) fire(); else { charging = true; power += 1 / 75; if (power >= P.pw) { power = P.pw; fire(); } } }
        }
      } else if (state === "hop") {
        if (w.dead || w.drown) { toSettle(); return; }
        if (--timer <= 0) { toSettle(); return; }
        if (w.ground && ++st > 8) { state = "aim"; needRel = true; }
      } else if (state === "fly") {
        if (human(cur) && !w.dead) humanInput(w);
        const add = [];
        projs = projs.filter((p) => {
          const r = p.tg || CUST.has(p.k) ? sstep(p) : pstep(p);
          flySfx(p);
          if (p.k === "bz" && frame % 2) parts.push({ x: p.x, y: p.y, vx: rnd(-0.3, 0.3), vy: -0.3, l: 28, c: "rgba(240,240,240,.6)", r: 3.5, g: 0 });
          if (p.k === "dy" && frame % 2) parts.push({ x: p.x + 4, y: p.y - 12, vx: rnd(-1, 1), vy: rnd(-1.5, -0.3), l: 10, c: "#fde047", r: 1.6, g: 0 });
          if (r === "sting") { const T = p.tg; hurt(T, WP[WI("bee")].d, "bee"); T.vx = Math.sign(p.vx || 1) * 1.5; T.vy = -1.5; T.ground = false; K.tone(1800, 0.06, "sawtooth", 0.05); return false; }
          if (r === "boom") {
            if (p.k === "seed" || p.k === "fb") explode(p.x, p.y, p.k === "fb" ? 14 : SEED.r, p.k === "fb" ? 10 : SEED.d, p.k);
            else if (p.k === "wb") soak(p.x, p.y);
            else { const q = WP.find((o) => o.k === p.k); explode(p.x, p.k === "car" || p.k === "ck" ? p.y - 8 : p.y, q.r, q.d, p.k); }
            if (p.k === "ff") for (let i = 0; i < 6; i++) add.push({ k: "fb", x: p.x, y: p.y - 6, vx: rnd(-3, 3), vy: rnd(-8, -5), t: 0, own: p.own, rot: rnd(0, 7) });
            if (p.k === "wm") for (let i = 0; i < 5; i++) add.push({ k: "seed", x: p.x, y: p.y - 6, vx: rnd(-3.5, 3.5), vy: rnd(-7, -4), t: 0, own: p.own, rot: rnd(0, 7) });
            return false;
          }
          if (r === "gone") { if (p.y >= WATER) splash(p.x); return false; }
          return true;
        });
        projs.push(...add);
        if (!projs.length) toSettle();
      } else if (state === "settle") {
        st++;
        if ((st > 50 && worms.every((w) => w.ground || w.drown)) || st > 400) nextTurn();
      }
    }
    function loop(ts) {
      acc += Math.min(100, ts - last); last = ts;
      const dt = 1000 / 60 / (slow > 0 ? 0.3 : 1);
      if (!paused) while (acc >= dt) { update(); acc -= dt; if (gone) return; }
      else acc = 0;
      draw(ts);
      raf = requestAnimationFrame(loop);
    }

    // ------------------------------------------------ الرسم
    function layoutLabels() {
      g.font = `800 17px ${FONT}`;
      const placed = [];
      const ws = worms.filter((w) => !w.drown && !w.dead).sort((a, b) => b.y - a.y);
      for (const w of ws) {
        const tw = g.measureText(w.name + " " + w.hp).width + 16; let y = w.y - 80;
        for (let k = 0; k < 8; k++) {
          const hit = placed.find((r) => Math.abs(r.x - w.x) < (r.w + tw) / 2 + 4 && Math.abs(r.y - y) < 25);
          if (!hit) break; y = hit.y - 26;
        }
        placed.push({ x: w.x, y, w: tw }); w.ly = y;
      }
    }
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = TH[0]; g.fillRect(0, 0, innerWidth, innerHeight);
      const sx = shake > 0.5 ? rnd(-shake, shake) : 0, sy = shake > 0.5 ? rnd(-shake, shake) : 0;
      const z = camZ, zs = dpr * sc * z;
      g.setTransform(zs, 0, 0, zs, dpr * (ox + sc * (W / 2 - camX * z) + sx * sc), dpr * (oy + sc * (H / 2 - camY * z) + sy * sc));
      const L0 = -ox / sc - 20, R0 = W + ox / sc + 20, T0 = -oy / sc - 20, B0 = H + oy / sc + 20;
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, TH[0]); sky.addColorStop(1, TH[1]);
      g.fillStyle = sky; g.fillRect(L0, T0, R0 - L0, B0 - T0);
      if (NIGHT) {
        for (const [x, y, r] of STARS) { g.globalAlpha = 0.5 + 0.5 * Math.sin(frame / 20 + x); g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.fill(); }
        g.globalAlpha = 1; g.fillStyle = "#f8fafc"; g.beginPath(); g.arc(W * 0.8, 110, 40, 0, 7); g.fill();
        g.fillStyle = TH[0]; g.beginPath(); g.arc(W * 0.8 + 16, 100, 36, 0, 7); g.fill();
      } else {
        g.fillStyle = "#fde047"; g.beginPath(); g.arc(W * 0.8, 120, 46, 0, 7); g.fill();
        g.fillStyle = "rgba(253,224,71,.3)"; g.beginPath(); g.arc(W * 0.8, 120, 64 + Math.sin(frame / 30) * 4, 0, 7); g.fill();
      }
      g.fillStyle = STORM ? "rgba(100,116,139,.9)" : NIGHT ? "rgba(148,163,184,.35)" : "rgba(255,255,255,.9)";
      for (const c of clouds) for (const [dx, dy, r] of [[0, 0, 24], [24, 4, 18], [-24, 5, 17], [10, -11, 17]]) { g.beginPath(); g.arc(c.x + dx * c.s, c.y + dy * c.s, r * c.s, 0, 7); g.fill(); }
      g.fillStyle = TH[2]; g.beginPath(); g.moveTo(L0, H); far.forEach((y, i) => g.lineTo((i * W) / 64, y)); g.lineTo(R0, H); g.fill();
      g.drawImage(tc, 0, 0);
      if (NIGHT) { g.fillStyle = "rgba(15,23,60,.22)"; g.fillRect(L0, T0, R0 - L0, B0 - T0); }
      crates.forEach((c) => drawCrate(g, c));
      layoutLabels();
      const cw = state === "aim" || state === "hop" || state === "fly" ? curW() : null;
      worms.forEach((w) => { if (w !== cw) drawWorm(g, w, { t: frame * 16, ly: w.ly }); });
      if (cw) { drawWorm(g, cw, { t: frame * 16, act: state === "aim", ly: cw.ly }); if (state === "aim" && !menu) aimUI(cw); }
      for (const p of projs) { g.save(); g.translate(p.x, p.y); drawProj(g, p, frame); g.restore(); }
      if (tracer) { g.strokeStyle = `rgba(255,240,170,${tracer.t / 14})`; g.lineWidth = 3; g.beginPath(); g.moveTo(tracer.x1, tracer.y1); g.lineTo(tracer.x2, tracer.y2); g.stroke(); }
      if (swing) { g.save(); g.translate(swing.x + swing.f * 10, swing.y); g.scale(swing.f, 1); g.rotate(-1.2 + (1 - swing.t / 16) * 2.2); g.translate(14, 0); drawPan(g); g.restore(); }
      for (const p of parts) { g.globalAlpha = p.flash ? (p.l / 14) * 0.8 : Math.min(1, p.l / 20); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      for (const [c, o, s] of [["rgba(56,140,200,.75)", 0, 20], ["rgba(29,95,150,.92)", 12, 26]]) {
        g.fillStyle = c; g.beginPath(); g.moveTo(L0, B0);
        for (let x = L0; x <= R0 + 20; x += 20) g.lineTo(x, WATER + o + Math.sin(x / 40 + frame / s) * 4);
        g.lineTo(R0, B0); g.fill(); }
      if (STORM) { g.strokeStyle = "rgba(191,219,254,.55)"; g.lineWidth = 1.5; g.beginPath();
        for (let i = 0; i < 90; i++) { const x = (((i * 137 + frame * (6 + wind * 80)) % (W + 200)) + W + 200) % (W + 200) - 100, y = (i * 89 + frame * 14) % H; g.moveTo(x, y); g.lineTo(x + wind * 160 + 2, y + 16); }
        g.stroke(); }
      if (SNOW) { g.fillStyle = "rgba(255,255,255,.85)";
        for (let i = 0; i < 70; i++) { const x = ((((i * 173 + frame * (0.5 + wind * 25) + Math.sin(frame / 40 + i) * 20) % W) + W) % W), y = (i * 97 + frame * 1.1) % H; g.beginPath(); g.arc(x, y, 1.5 + (i % 3) * 0.6, 0, 7); g.fill(); } }
      for (const b of bubbles) drawBubble(b);
      for (const t of texts) { g.globalAlpha = Math.min(1, t.t / 20); label(t.s, t.x, t.y, 22, t.c); }
      g.globalAlpha = 1;
      g.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
      hud();
      if (slow > 0) label("🎬 حركة بطيئة", W / 2, H - 50, 28, "#fde047");
      if (menu) drawMenu();
    }
    function label(s, x, y, size, col) {
      g.font = `800 ${size}px ${FONT}`; g.textAlign = "center"; g.lineJoin = "round"; g.direction = "rtl";
      g.lineWidth = size / 4; g.strokeStyle = "rgba(15,23,42,.7)"; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
    }
    function drawBubble(b) {
      const w = b.w; if (w.drown) return;
      g.font = `800 19px ${FONT}`; g.direction = "rtl"; g.textAlign = "center";
      const tw = g.measureText(b.s).width + 22, x = clamp(w.x, tw / 2 + 6, W - tw / 2 - 6), y = (w.ly ?? w.y - 80) - 40;
      g.globalAlpha = Math.min(1, b.t / 15);
      g.fillStyle = "#fff"; g.strokeStyle = "#0f172a"; g.lineWidth = 2.5;
      rr(g, x - tw / 2, y - 18, tw, 32, 14); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(w.x - 7, y + 13); g.lineTo(w.x + 1, y + 25); g.lineTo(w.x + 7, y + 13); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(w.x - 7, y + 14); g.lineTo(w.x + 1, y + 25); g.lineTo(w.x + 7, y + 14); g.stroke();
      g.fillStyle = "#0f172a"; g.fillText(b.s, x, y + 5);
      g.globalAlpha = 1;
    }
    function aimUI(w) {
      const q = WP[weap[cur]], ax = Math.cos(w.aim * D2R) * w.face, ay = -Math.sin(w.aim * D2R), cy = w.y - 11;
      const ty = (w.ly ?? w.y - 80) - 18 + Math.sin(frame / 8) * 4;
      g.fillStyle = "#fde047"; g.strokeStyle = "#92400e"; g.lineWidth = 2; g.beginPath(); g.moveTo(w.x - 9, ty - 12); g.lineTo(w.x + 9, ty - 12); g.lineTo(w.x, ty); g.closePath(); g.fill(); g.stroke();
      if (q.sp === "point" && cursor) {
        const ok = q.k === "tp" ? tpOk() : wallOk(w), col = ok ? "#4ade80" : "#f87171";
        g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([6, 5]);
        if (q.k === "wall") { const [x, y, rw, rh] = wallRect(cursor.x, cursor.y); g.fillStyle = ok ? "rgba(180,83,9,.5)" : "rgba(248,113,113,.35)"; g.fillRect(x, y, rw, rh); g.strokeRect(x, y, rw, rh); }
        else { g.beginPath(); g.ellipse(cursor.x, cursor.y - 12, 12, 16, 0, 0, 7); g.stroke(); }
        g.setLineDash([]); g.beginPath(); g.moveTo(cursor.x - 16, cursor.y); g.lineTo(cursor.x + 16, cursor.y); g.moveTo(cursor.x, cursor.y - 16); g.lineTo(cursor.x, cursor.y + 16); g.stroke();
        label(q.k === "wall" ? "الأسهم للمكان · القفز يدوّر الجدار" : "الأسهم لاختيار المكان", cursor.x, cursor.y + 42, 15, "#fff");
        return;
      }
      if (q.k === "para") { label(w.chute ? "🪂 المظلة جاهزة" : "اضغط للرمي ← تتجهز المظلة", w.x, w.y + 30, 15, "#fff"); return; }
      if (targeted(q)) {
        const T = curTarget(); if (!T) return;
        const r = 26 + Math.sin(frame / 6) * 3, tyy = T.y - 12;
        g.strokeStyle = "#ef4444"; g.lineWidth = 4; g.beginPath(); g.arc(T.x, tyy, r, 0, 7);
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(T.x + a * (r - 8), tyy + b * (r - 8)); g.lineTo(T.x + a * (r + 10), tyy + b * (r + 10)); }
        g.stroke();
        if (human(cur)) label("▲▼ اختر الهدف", T.x, tyy + r + 30, 16, "#fff");
        return;
      }
      const qx = w.x + ax * 58, qy = cy + ay * 58;
      g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.arc(qx, qy, 8, 0, 7); g.moveTo(qx - 13, qy); g.lineTo(qx + 13, qy); g.moveTo(qx, qy - 13); g.lineTo(qx, qy + 13); g.stroke();
      if (power > 0) { g.lineCap = "round"; g.lineWidth = 8; g.strokeStyle = `hsl(${55 - 55 * power},100%,52%)`;
        g.beginPath(); g.moveTo(w.x + ax * 16, cy + ay * 16); g.lineTo(w.x + ax * (16 + power * 70), cy + ay * (16 + power * 70)); g.stroke(); g.lineCap = "butt"; }
    }
    function hud() {
      g.direction = "rtl";
      [0, 1].forEach((t) => {
        const hp = team(t).reduce((a, w) => a + w.hp, 0), max = N * 100, x = t === 0 ? W - 290 : 20, on = t === cur && state !== "end";
        g.fillStyle = on ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.75)"; rr(g, x, 16, 270, 64, 18); g.fill();
        if (on) { g.strokeStyle = TM[t].color; g.lineWidth = 4; g.stroke(); }
        g.font = `800 24px ${FONT}`; g.textAlign = "right"; g.fillStyle = TM[t].dark;
        g.fillText(CPU && t === 1 ? "الكمبيوتر 🤖" : "الفريق " + TM[t].name, x + 254, 44);
        g.fillStyle = "#e2e8f0"; rr(g, x + 16, 54, 238, 14, 7); g.fill();
        const f = Math.min(1, hp / max);
        if (f > 0) { g.fillStyle = TM[t].color; rr(g, x + 16 + 238 * (1 - f), 54, 238 * f, 14, 7); g.fill(); }
      });
      const cx = W / 2;
      g.fillStyle = "rgba(255,255,255,.9)"; rr(g, cx - 160, 12, 320, 100, 22); g.fill();
      const sec = state === "aim" || state === "hop" ? Math.ceil(timer / 60) : "";
      g.fillStyle = sec !== "" && sec <= 5 ? "#dc2626" : "#1e3a8a"; g.font = `800 40px ${FONT}`; g.textAlign = "center";
      g.fillText(sec === "" ? "…" : String(sec), cx + 110, 62);
      const wq = WP[weap[cur]], wn = wq.name + (wq.sp ? " ×" + (ammo[cur][weap[cur]] || 0) : "");
      g.font = `30px ${EFONT}`; g.fillText(wq.e, cx + 45, 56);
      g.font = `800 ${wn.length > 9 ? 17 : 21}px ${FONT}`; g.fillStyle = wq.sp ? "#be185d" : "#1e3a8a"; g.fillText(wn, cx - 55, 50);
      g.fillStyle = "#e2e8f0"; rr(g, cx - 140, 74, 180, 16, 8); g.fill();
      const wl = Math.min(1, Math.abs(wind) / WMAX) * 88;
      g.fillStyle = "#0ea5e9"; rr(g, wind >= 0 ? cx - 50 : cx - 50 - wl, 74, wl, 16, 8); g.fill();
      g.fillStyle = "#1e3a8a"; g.fillRect(cx - 51, 70, 2, 24);
      g.font = `700 15px ${FONT}`; g.fillText("الريح", cx - 50, 106);
      const left = SD - turnNo;
      g.font = `800 15px ${FONT}`; g.fillStyle = left <= 0 ? "#0369a1" : "#475569";
      g.fillText(left <= 0 ? "🌊 الماء يرتفع" : left <= 6 ? `🌊 بعد ${left}` : "", cx + 100, 100);
      // تلميح التحكم
      if (state === "aim" && human(cur) && !menu) {
        const pads = padSt.some(Boolean);
        label(pads ? "✕ الأسلحة · □ مطوّلاً رمي · △ قفز" : "Enter: الأسلحة · Enter مطوّلاً أو Space: رمي · Shift: قفز", cx, H - 16, 17, "#fff");
      }
      if (banner > 0 && state === "aim") {
        const w = curW(); g.globalAlpha = Math.min(1, banner / 20);
        g.fillStyle = "rgba(255,255,255,.95)"; rr(g, cx - 230, 300, 460, bannerTxt ? 130 : 90, 30); g.fill();
        g.strokeStyle = TM[cur].color; g.lineWidth = 6; g.stroke();
        g.fillStyle = TM[cur].dark; g.font = `800 44px ${FONT}`; g.fillText(`دور ${w.name}`, cx, 360);
        if (bannerTxt) { g.fillStyle = "#0369a1"; g.font = `800 30px ${FONT}`; g.fillText(bannerTxt, cx, 405); }
        g.globalAlpha = 1;
      }
    }
    function drawMenu() {
      g.fillStyle = "rgba(15,23,42,.8)"; g.fillRect(-500, -500, W + 1000, H + 1000);
      g.direction = "rtl"; g.textAlign = "center";
      label("🎒 اختر السلاح", W / 2, 132, 32, "#fde047");
      WP.forEach((q, i) => {
        const [x, y] = cardXY(i), ok = has(cur, i), sel = i === menu.sel;
        g.save(); if (sel) { g.translate(x + CW / 2, y + CH / 2); g.scale(1.06, 1.06); g.translate(-x - CW / 2, -y - CH / 2); }
        g.fillStyle = ok ? (q.sp ? "#fdf2f8" : "#fff") : "#64748b"; rr(g, x, y, CW, CH, 20); g.fill();
        if (sel) { g.strokeStyle = "#fde047"; g.lineWidth = 7; g.stroke(); }
        g.globalAlpha = ok ? 1 : 0.4;
        g.font = `34px ${EFONT}`; g.fillText(q.e, x + CW / 2, y + 42);
        g.font = `800 ${q.name.length > 9 ? 16 : 19}px ${FONT}`; g.fillStyle = "#1e3a8a"; g.fillText(q.name, x + CW / 2, y + 74);
        const n = q.k === "hj" ? (hopUsed ? "تم" : "1") : q.sp ? "×" + (ammo[cur][i] || 0) : "∞";
        g.fillStyle = q.sp ? "#be185d" : "#64748b"; g.font = `800 17px ${FONT}`; g.textAlign = "right"; g.fillText(n, x + CW - 10, y + 20); g.textAlign = "center";
        g.globalAlpha = 1; g.restore();
      });
      const q = WP[menu.sel];
      const tip = { bz: "تميل مع الريح", gr: "ترتدّ وتنفجر بعد 3 ثوانٍ", sg: "طلقة مستقيمة", dy: "ضعه واهرب! ينفجر بعد 4 ثوانٍ", hj: "قفزة كبيرة بلا ضرر، ثم تكمل دورك",
        sl: "تطير وتنقضّ على الهدف", st: "تطير وتنقضّ على الهدف", rc: "يطير وينقضّ على الهدف", ph: "يرنّ وينقضّ على الهدف", car: "تسير إلى الهدف وتنفجر",
        bt: "يسقط من السماء على الهدف", ck: "تقفز وتركض نحو الهدف", wm: "تنفجر وترمي بذورها المتفجرة", pan: "ضربة قريبة تطيّر الدودة بعيداً",
        wb: "لا يجرح، لكنه يدفع بقوة (إلى الماء؟)", boom: "يذهب ويرجع، وقد يصيبك أنت!", para: "تنزل ببطء بلا ضرر السقوط", bee: "نحلات تلاحق الهدف وتلسعه",
        ff: "تتطاير منه حبات فلافل ساخنة", brl: "يتدحرج مع المنحدر وينفجر عند أول اصطدام", met: "نيازك تسقط على الخريطة كلها!",
        tp: "اختر مكاناً وانتقل إليه، ثم أكمل دورك", wall: "ابنِ جداراً تحتمي خلفه (القفز يدوّره)" }[q.k];
      label(`${q.e} ${q.name}: ${tip}${has(cur, menu.sel) ? "" : " (غير متوفر — اجمع الصناديق 📦)"}`, W / 2, MY + ROWS * (CH + GAPM) + 22, 20, "#fff");
      label("الأسهم للتنقل · ✕ أو Enter للاختيار · ○ أو Backspace للإغلاق", W / 2, MY + ROWS * (CH + GAPM) + 50, 16, "#cbd5e1");
    }

    gen(); spawn(); nextTurn(true);
    K.dbg = () => ({ worms, state, cur, weap, explode, nextTurn, plan, curW, crates, ammo, dropCrate, switchW, curTarget, menu, openMenu, WATER, setTurn: (n) => (turnNo = n), say, get cursor() { return cursor; }, setCursor: (x, y) => (cursor = { x, y }), WXN, get slow() { return slow; } });
    raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- نهاية المباراة
  function endScreen(r) {
    K.begin();
    const CPU = r.mode === "cpu", humanWon = r.w >= 0 && (!CPU || r.w === 0);
    if (r.w >= 0 && !r.saved) { r.saved = true; if (CPU) { if (r.w === 0) save.cpu[r.lvl]++; } else save.wins[r.w]++; save.save(); }
    const title = r.w < 0 ? "تعادل! 🤝" : CPU ? (r.w === 0 ? "فزت على الكمبيوتر! 🏆" : "فاز الكمبيوتر 🤖 هذه المرة!") : `فاز الفريق ${TM[r.w].name} ${TM[r.w].emo}! 🏆`;
    K.paint(`
      <div class="top">${K.backBtn()}<span></span><span class="pill">${CPU ? `🤖 ${LV[r.lvl].emo} ${LV[r.lvl].name}` : "👫 لاعبان"}</span></div>
      <h1 class="endh">${title}</h1>
      <div class="score">${CPU ? `🏆 ${save.cpu[r.lvl]}` : `🔵 ${save.wins[1]} : ${save.wins[0]} 🔴`}</div>
      <div class="sub">${humanWon ? "أحسنت التصويب! 🎯" : "حاول مرة أخرى، ستفوز في المرة القادمة 💪"}</div>
      <div class="titles">${(r.titles || []).map((t) => `<span class="pill">${t}</span>`).join("")}</div>
      <div class="earned"></div>
      <div class="nav">
        <button class="btn f go" ${K.act("again", () => K.replace(playScreen, r.mode, r.lvl))}><span class="emo">🔁</span> مباراة جديدة</button>
        <button class="btn f" ${K.act("set", () => K.replace(setupScreen, r.mode, r.lvl))}><span class="emo">⚙️</span> الإعدادات</button>
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>
      ${K.HELP}`, "again");
    K.confetti(humanWon ? 40 : 12);
    if (!r.earned) { r.earned = true;
      if (CPU && r.w === 0) earn(r.lvl === "hard" ? 2 : 1, `فاز على الكمبيوتر (${LV[r.lvl].name})`);
      else if (!CPU) earn(1, "أنهى مباراة لشخصين"); }
  }
  function earn(amount, reason) {
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, game: GAME, reason }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const el = K.app.querySelector(".earned"); if (d && d.added && el) el.innerHTML = `<span class="pill gain">+${d.added} ⭐ في رصيدك</span>`; })
      .catch(() => {});
  }

  // ---------------------------------------------------------------- أصوات
  function noise(d, v) {
    const c = K.audioCtx(); if (!c) return;
    try {
      const n = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, n, c.sampleRate), a = buf.getChannelData(0);
      for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
      s.buffer = buf; f.type = "lowpass"; f.frequency.value = 700; gn.gain.value = v;
      s.connect(f).connect(gn).connect(c.destination); s.start();
    } catch {}
  }

  // ---------------------------------------------------------------- الرسوم (أصلية)
  function rr(x, X, Y, w, h, r) { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function drawCrate(x, c) {
    x.save(); x.translate(c.x, c.y);
    if (!c.land) {
      x.rotate(Math.sin(c.sw) * 0.12);
      x.strokeStyle = "rgba(60,40,20,.7)"; x.lineWidth = 1.5; x.beginPath();
      for (const s of [-1, 1]) { x.moveTo(s * 10, -20); x.lineTo(s * 26, -52); } x.stroke();
      const cl = c.med ? ["#ef4444", "#fff"] : ["#f472b6", "#fff"];
      [0, 1, 2, 3].forEach((i) => { x.fillStyle = cl[i % 2]; x.beginPath(); x.moveTo(0, -52); x.arc(0, -52, 30, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 1) * Math.PI) / 4); x.closePath(); x.fill(); });
    }
    if (c.med) {
      x.fillStyle = "#fff"; x.strokeStyle = "#991b1b"; x.lineWidth = 2.5; rr(x, -12, -24, 24, 24, 4); x.fill(); x.stroke();
      x.fillStyle = "#ef4444"; x.fillRect(-3.5, -20, 7, 16); x.fillRect(-8, -15.5, 16, 7);
    } else {
      x.fillStyle = "#c08a4a"; x.strokeStyle = "#7c4a1e"; x.lineWidth = 2.5; rr(x, -12, -24, 24, 24, 4); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(-12, -24); x.lineTo(12, 0); x.moveTo(12, -24); x.lineTo(-12, 0); x.stroke();
      x.font = `800 18px ${FONT}`; x.textAlign = "center"; x.fillStyle = "#fde047"; x.strokeStyle = "#7c4a1e"; x.lineWidth = 4; x.strokeText("?", 0, -6); x.fillText("?", 0, -6);
    }
    x.restore();
  }
  function drawSlipper(x) {
    x.fillStyle = "#38bdf8"; x.strokeStyle = "#0c4a6e"; x.lineWidth = 1.5;
    x.beginPath(); x.ellipse(0, 0, 14, 6, 0, 0, 7); x.fill(); x.stroke();
    x.strokeStyle = "#f472b6"; x.lineWidth = 3; x.beginPath(); x.moveTo(-4, -5); x.lineTo(4, 0); x.lineTo(-4, 5); x.stroke();
  }
  function drawPan(x) {
    x.fillStyle = "#57534e"; x.fillRect(0, -2.5, 22, 5);
    x.fillStyle = "#1f2937"; x.strokeStyle = "#9ca3af"; x.lineWidth = 2; x.beginPath(); x.arc(32, 0, 12, 0, 7); x.fill(); x.stroke();
    x.fillStyle = "#fde047"; x.beginPath(); x.arc(32, 0, 5, 0, 7); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(32, 0, 9, 0.5, 2.2); x.lineTo(32, 0); x.fill();
  }
  function drawProj(x, p, fr) {
    switch (p.k) {
      case "bz": x.rotate(Math.atan2(p.vy, p.vx)); x.fillStyle = "#2f5d2a"; rr(x, -10, -4, 20, 8, 4); x.fill(); x.fillStyle = "#ff7a45"; x.beginPath(); x.moveTo(10, -4); x.lineTo(15, 0); x.lineTo(10, 4); x.fill(); return;
      case "gr": case "dy": {
        const left = Math.ceil(((p.k === "dy" ? 240 : 180) - p.t) / 60);
        if (p.k === "gr") { x.fillStyle = "#2f5d2a"; x.beginPath(); x.arc(0, 0, 7, 0, 7); x.fill(); x.fillStyle = "rgba(255,255,255,.6)"; x.beginPath(); x.arc(-2, -2, 2.2, 0, 7); x.fill(); }
        else { x.save(); x.rotate(p.rot * 0.3); x.fillStyle = "#dc2626"; rr(x, -5, -12, 10, 20, 3); x.fill(); x.fillStyle = "#fef3c7"; x.fillRect(-5, -6, 10, 4);
          x.strokeStyle = "#78350f"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -12); x.quadraticCurveTo(4, -16, 3, -19); x.stroke(); x.restore(); }
        x.font = `800 18px ${FONT}`; x.textAlign = "center"; x.lineWidth = 4; x.strokeStyle = "rgba(15,23,42,.7)"; x.strokeText(String(left), 0, -20); x.fillStyle = "#fff"; x.fillText(String(left), 0, -20);
        return; }
      case "wm": x.rotate(p.rot); x.fillStyle = "#15803d"; x.beginPath(); x.ellipse(0, 0, 13, 10, 0, 0, 7); x.fill();
        x.strokeStyle = "#86efac"; x.lineWidth = 2; for (const o of [-6, 0, 6]) { x.beginPath(); x.ellipse(o, 0, 2, 9, 0, 0, 7); x.stroke(); } return;
      case "seed": x.rotate(p.rot); x.fillStyle = "#111827"; x.beginPath(); x.ellipse(0, 0, 3, 5, 0, 0, 7); x.fill(); return;
      case "wb": x.fillStyle = "#3b82f6"; x.beginPath(); x.ellipse(0, 0, 9, 11, 0, 0, 7); x.fill(); x.fillStyle = "rgba(255,255,255,.5)"; x.beginPath(); x.arc(-3, -4, 2.5, 0, 7); x.fill();
        x.fillStyle = "#1d4ed8"; x.beginPath(); x.moveTo(-2, 11); x.lineTo(2, 11); x.lineTo(0, 14); x.fill(); return;
      case "boom": x.rotate(p.rot); x.strokeStyle = "#92400e"; x.lineWidth = 5; x.lineCap = "round"; x.beginPath(); x.moveTo(-12, 6); x.lineTo(0, -4); x.lineTo(12, 6); x.stroke();
        x.strokeStyle = "#fbbf24"; x.lineWidth = 2; x.stroke(); x.lineCap = "butt"; return;
      case "ff": x.fillStyle = "#fff"; x.strokeStyle = "#94a3b8"; x.lineWidth = 1.5; x.beginPath(); x.ellipse(0, 3, 15, 5, 0, 0, 7); x.fill(); x.stroke();
        for (const [a, b] of [[-6, -1], [0, -3], [6, -1], [-3, -6], [3, -6]]) { x.fillStyle = "#92400e"; x.beginPath(); x.arc(a, b, 3.4, 0, 7); x.fill(); } return;
      case "fb": x.rotate(p.rot); x.fillStyle = "#92400e"; x.beginPath(); x.arc(0, 0, 4.5, 0, 7); x.fill(); x.fillStyle = "#65a30d"; x.beginPath(); x.arc(1, -1, 1.2, 0, 7); x.arc(-2, 1, 1, 0, 7); x.fill(); return;
      case "brl": x.rotate(p.rot); x.fillStyle = "#1e3a8a"; x.strokeStyle = "#0f172a"; x.lineWidth = 1.5; x.beginPath(); x.arc(0, -9, 10, 0, 7); x.fill(); x.stroke();
        x.strokeStyle = "#fbbf24"; x.lineWidth = 2; x.beginPath(); x.arc(0, -9, 6, 0, 7); x.stroke(); x.fillStyle = "#fbbf24"; x.fillRect(-1.5, -16, 3, 14); return;
      case "met": if (p.t < 0) return; x.fillStyle = "#7c2d12"; x.beginPath(); x.arc(0, 0, 8, 0, 7); x.fill(); x.fillStyle = "#f97316"; x.beginPath(); x.arc(-2, -2, 4, 0, 7); x.fill(); return;
      case "bee": if (p.t < 0) return; x.scale(p.vx < 0 ? -1 : 1, 1);
        x.fillStyle = "rgba(255,255,255,.75)"; x.beginPath(); x.ellipse(-1, -6, 4, 2.5, Math.sin(fr) * 0.8, 0, 7); x.fill();
        x.fillStyle = "#facc15"; x.beginPath(); x.ellipse(0, 0, 6, 4, 0, 0, 7); x.fill();
        x.fillStyle = "#111"; x.fillRect(-2, -4, 1.6, 8); x.fillRect(1.5, -4, 1.6, 8); x.beginPath(); x.arc(5, -1, 1, 0, 7); x.fill(); return;
      case "car":
        x.scale(p.face, 1); x.fillStyle = "#ef4444"; x.strokeStyle = "#7f1d1d"; x.lineWidth = 2;
        rr(x, -18, -16, 36, 11, 4); x.fill(); x.stroke(); rr(x, -9, -25, 18, 10, 4); x.fill(); x.stroke();
        x.fillStyle = "#bae6fd"; rr(x, -6, -23, 12, 6, 2); x.fill(); x.fillStyle = "#fde047"; x.fillRect(15, -13, 3, 4);
        for (const wx of [-10, 10]) { x.fillStyle = "#1f2937"; x.beginPath(); x.arc(wx, -4, 5, 0, 7); x.fill(); x.fillStyle = "#9ca3af"; x.beginPath(); x.arc(wx, -4, 2, 0, 7); x.fill(); }
        return;
      case "ck": {
        x.scale(-p.face, 1); const k = Math.sin(fr / 2) * 3;
        x.strokeStyle = "#f59e0b"; x.lineWidth = 2; x.beginPath(); x.moveTo(-3, -6); x.lineTo(-3 + k, 0); x.moveTo(3, -6); x.lineTo(3 - k, 0); x.stroke();
        x.fillStyle = "#fff"; x.strokeStyle = "#94a3b8"; x.lineWidth = 1.5; x.beginPath(); x.ellipse(0, -13, 11, 8, 0, 0, 7); x.fill(); x.stroke();
        x.beginPath(); x.arc(-9, -22, 6, 0, 7); x.fill(); x.stroke();
        x.fillStyle = "#ef4444"; x.beginPath(); x.arc(-10, -28, 3, 0, 7); x.arc(-7, -29, 2.5, 0, 7); x.fill();
        x.fillStyle = "#f59e0b"; x.beginPath(); x.moveTo(-15, -23); x.lineTo(-20, -21); x.lineTo(-15, -19); x.fill();
        x.fillStyle = "#111"; x.beginPath(); x.arc(-11, -23, 1.4, 0, 7); x.fill();
        x.fillStyle = "#f1f5f9"; x.beginPath(); x.ellipse(4, -15, 6, 3.5, Math.sin(fr / 3) * 0.6, 0, 7); x.fill(); x.stroke();
        return; }
      case "bt":
        x.scale(1.5, 1.5); x.translate(0, -6);
        x.fillStyle = "#92400e"; x.strokeStyle = "#451a03"; x.lineWidth = 1.6;
        rr(x, -9, -30, 16, 26, 4); x.fill(); x.stroke(); rr(x, -9, -10, 28, 12, 5); x.fill(); x.stroke();
        x.fillStyle = "#1c1917"; x.fillRect(-9, 0, 28, 3);
        x.strokeStyle = "#fde68a"; x.lineWidth = 1.2; x.beginPath(); for (let i = 0; i < 3; i++) { x.moveTo(-6, -24 + i * 6); x.lineTo(4, -22 + i * 6); } x.stroke();
        return;
    }
    x.rotate(p.rot);
    if (p.k === "sl") drawSlipper(x);
    else if (p.k === "st") {
      x.fillStyle = "#9ca3af"; x.strokeStyle = "#374151"; x.lineWidth = 2; x.beginPath();
      [10, 8, 11, 9, 10, 7, 9, 8].forEach((r, i) => { const a = (i * Math.PI) / 4; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); });
      x.closePath(); x.fill(); x.stroke(); x.fillStyle = "rgba(255,255,255,.4)"; x.beginPath(); x.arc(-3, -3, 2.5, 0, 7); x.fill();
    } else if (p.k === "rc") {
      x.fillStyle = "#1f2937"; rr(x, -6, -13, 12, 26, 4); x.fill();
      [["#ef4444", -8], ["#22c55e", -2], ["#3b82f6", 4], ["#fde047", 9]].forEach(([c, y]) => { x.fillStyle = c; x.beginPath(); x.arc(0, y, 2, 0, 7); x.fill(); });
    } else {
      x.fillStyle = "#111827"; rr(x, -7, -13, 14, 26, 3); x.fill();
      x.fillStyle = (fr >> 3) % 2 ? "#7dd3fc" : "#a7f3d0"; rr(x, -5, -10, 10, 17, 2); x.fill();
      x.fillStyle = "#6b7280"; x.beginPath(); x.arc(0, 10, 1.5, 0, 7); x.fill();
    }
  }
  function drawHat(x, hat, hx, hy, col) {
    if (hat === "fez") { x.fillStyle = "#b91c1c"; x.beginPath(); x.moveTo(hx - 5, hy - 6); x.lineTo(hx - 4, hy - 13); x.lineTo(hx + 4, hy - 13); x.lineTo(hx + 5, hy - 6); x.closePath(); x.fill();
      x.strokeStyle = "#111"; x.lineWidth = 1; x.beginPath(); x.moveTo(hx, hy - 13); x.quadraticCurveTo(hx + 6, hy - 13, hx + 6, hy - 7); x.stroke(); }
    else if (hat === "cap") { x.fillStyle = col; x.beginPath(); x.arc(hx, hy - 6, 6.2, Math.PI, 0); x.fill(); x.fillRect(hx, hy - 7, 9, 2.4); }
    else if (hat === "crown") { x.fillStyle = "#facc15"; x.strokeStyle = "#a16207"; x.lineWidth = 0.8; x.beginPath(); x.moveTo(hx - 5, hy - 6); x.lineTo(hx - 5, hy - 12); x.lineTo(hx - 2.5, hy - 9);
      x.lineTo(hx, hy - 13); x.lineTo(hx + 2.5, hy - 9); x.lineTo(hx + 5, hy - 12); x.lineTo(hx + 5, hy - 6); x.closePath(); x.fill(); x.stroke(); }
    else if (hat === "flower") { for (let i = 0; i < 5; i++) { const a = (i * 2 * Math.PI) / 5; x.fillStyle = "#f9a8d4"; x.beginPath(); x.arc(hx + 3 + Math.cos(a) * 2.6, hy - 8 + Math.sin(a) * 2.6, 1.9, 0, 7); x.fill(); }
      x.fillStyle = "#facc15"; x.beginPath(); x.arc(hx + 3, hy - 8, 1.6, 0, 7); x.fill(); }
    else if (hat === "party") { x.fillStyle = "#a855f7"; x.beginPath(); x.moveTo(hx - 4.5, hy - 6); x.lineTo(hx + 1, hy - 18); x.lineTo(hx + 5, hy - 6); x.closePath(); x.fill();
      x.fillStyle = "#fde047"; x.beginPath(); x.arc(hx + 1, hy - 18, 1.8, 0, 7); x.fill(); x.fillStyle = "#fff"; x.fillRect(hx - 2, hy - 11, 4, 1.2); }
    else if (hat === "chef") { x.fillStyle = "#fff"; x.strokeStyle = "#cbd5e1"; x.lineWidth = 0.8; x.fillRect(hx - 4.5, hy - 9, 9, 3.5);
      x.beginPath(); x.arc(hx - 2.5, hy - 11, 3.2, 0, 7); x.arc(hx + 2.5, hy - 11, 3.2, 0, 7); x.arc(hx, hy - 13, 3.2, 0, 7); x.fill(); }
  }
  function drawWorm(x, w, o) {
    if (w.drown) return;
    if (w.dead) {
      x.fillStyle = "#d4d4d8"; x.strokeStyle = "#52525b"; x.lineWidth = 2; rr(x, w.x - 9, w.y - 24, 18, 24, 8); x.fill(); x.stroke();
      x.fillStyle = "#52525b"; x.fillRect(w.x - 1.5, w.y - 20, 3, 12); x.fillRect(w.x - 5, w.y - 17, 10, 3); return;
    }
    const f = w.face, t = o.t || 0, lk = w.look || {}, col = TM[w.t], seed = (lk.seed || 0) * 1000;
    const bob = o.act ? Math.sin(t / 110) * 0.8 : Math.sin((t + seed) / 260) * 0.5;
    const sq = w.ground ? 1 + Math.sin(((w.wt || 0) * Math.PI) / 8) * 0.06 : 0.92;
    x.save(); x.translate(w.x, w.y); x.scale(SZ, SZ);
    if (w.dance > 0) { w.dance--; x.rotate(Math.sin(w.dance / 3) * 0.25); }
    if (w.chute && !w.ground) {
      x.strokeStyle = "rgba(51,65,85,.7)"; x.lineWidth = 0.7; x.beginPath(); x.moveTo(-4, -18); x.lineTo(-14, -40); x.moveTo(4, -18); x.lineTo(14, -40); x.stroke();
      ["#ef4444", "#fff", "#3b82f6", "#fff"].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, -40); x.arc(0, -40, 17, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 1) * Math.PI) / 4); x.closePath(); x.fill(); });
    } else { x.fillStyle = "rgba(0,0,0,.18)"; x.beginPath(); x.ellipse(0, 0, 9, 2, 0, 0, 7); x.fill(); }
    // الجسم: ذيل ملتف + بطن بخطوط
    x.fillStyle = "#f9a8c1"; x.strokeStyle = "#9d3b5c"; x.lineWidth = 1.3;
    x.beginPath(); x.ellipse(-f * 9, -3, 4 * sq, 3, 0, 0, 7); x.fill(); x.stroke();
    x.beginPath(); x.ellipse(-f * 3.5, -4.5, 8 * sq, 5, 0, 0, 7); x.fill(); x.stroke();
    x.strokeStyle = "rgba(157,59,92,.45)"; x.lineWidth = 1;
    for (const k of [-6, -3, 0]) { x.beginPath(); x.moveTo(-f * 3.5 + f * k, -8.5); x.quadraticCurveTo(-f * 3.5 + f * (k + 1), -4.5, -f * 3.5 + f * k, -0.8); x.stroke(); }
    const hx = f * 2, hy = -13 + bob;
    x.fillStyle = "#f9a8c1"; x.strokeStyle = "#9d3b5c"; x.lineWidth = 1.3;
    x.beginPath(); x.ellipse(hx, hy, 6.8, 8.6, 0, 0, 7); x.fill(); x.stroke();
    // وشاح بلون الفريق
    x.strokeStyle = col.color; x.lineWidth = 3.2; x.beginPath(); x.moveTo(hx - 6.2, hy + 5.5); x.quadraticCurveTo(hx, hy + 8, hx + 6.2, hy + 5.5); x.stroke();
    x.lineWidth = 2.4; x.beginPath(); x.moveTo(hx - f * 5, hy + 6); x.lineTo(hx - f * 11, hy + 9 + Math.sin(t / 80) * 1.8); x.stroke();
    // الخدود
    x.fillStyle = "rgba(244,63,94,.35)"; x.beginPath(); x.arc(hx + f * 4.5, hy + 2.5, 1.8, 0, 7); x.arc(hx - f * 3.2, hy + 2.5, 1.6, 0, 7); x.fill();
    // العيون الجاحظة
    const aim = w.aim ?? 0, ax = Math.cos(aim * D2R) * f, ay = -Math.sin(aim * D2R);
    const jig = Math.sin((t + seed) / 70) * 0.5, blink = ((t / 16 + seed) | 0) % 170 < 5, ouch = w.ouch > 0;
    if (lk.hat === "glasses") {
      x.fillStyle = "#0f172a"; rr(x, hx - 6.5 + f * 1.2, hy - 5.5, 6, 4.5, 1.5); x.fill(); rr(x, hx + 0.5 + f * 1.2, hy - 5.5, 6, 4.5, 1.5); x.fill();
      x.fillStyle = "rgba(255,255,255,.5)"; x.fillRect(hx - 5 + f * 1.2, hy - 4.8, 1.5, 1.2); x.fillRect(hx + 2 + f * 1.2, hy - 4.8, 1.5, 1.2);
    } else for (const e of [-2.9, 2.9]) {
      const ex = hx + e + f * 1.2, ey = hy - 3.5 + (e * f > 0 ? -0.6 : 0.4), r = e * f > 0 ? 3.6 : 3.1;
      x.fillStyle = "#fff"; x.strokeStyle = "#334155"; x.lineWidth = 0.9; x.beginPath(); x.arc(ex, ey, r, 0, 7); x.fill(); x.stroke();
      if (ouch) { x.strokeStyle = "#111"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(ex - 1.6, ey - 1.6); x.lineTo(ex + 1.6, ey + 1.6); x.moveTo(ex + 1.6, ey - 1.6); x.lineTo(ex - 1.6, ey + 1.6); x.stroke(); }
      else if (blink) { x.fillStyle = "#f9a8c1"; x.beginPath(); x.arc(ex, ey, r + 0.2, Math.PI, 0); x.fill(); x.strokeStyle = "#9d3b5c"; x.beginPath(); x.moveTo(ex - r, ey); x.lineTo(ex + r, ey); x.stroke(); }
      else { x.fillStyle = "#111"; x.beginPath(); x.arc(ex + ax * 1.4 + jig, ey + ay * 1.4 + Math.abs(jig) * 0.6, 1.5, 0, 7); x.fill();
        x.fillStyle = "#fff"; x.beginPath(); x.arc(ex + ax * 1.4 + jig - 0.5, ey + ay * 1.4 - 0.6, 0.5, 0, 7); x.fill(); }
    }
    // الفم
    if (ouch) { x.fillStyle = "#7f1d1d"; x.beginPath(); x.ellipse(hx + f * 2.5, hy + 3.5, 1.8, 2.3, 0, 0, 7); x.fill(); }
    else { x.strokeStyle = "#7f1d1d"; x.lineWidth = 1.1; x.beginPath(); x.arc(hx + f * 2.2, hy + 1.6, 2.6, 0.25, Math.PI - 0.25); x.stroke();
      if (lk.tooth) { x.fillStyle = "#fff"; x.strokeStyle = "#94a3b8"; x.lineWidth = 0.5; x.fillRect(hx + f * 2.2 - 0.9, hy + 3.9, 1.8, 2); x.strokeRect(hx + f * 2.2 - 0.9, hy + 3.9, 1.8, 2); } }
    if (lk.must) { x.fillStyle = "#3f2a1d"; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(hx + f * 2.2 + s * 2.3, hy + 1.2, 2.6, 1.1, s * 0.35, 0, 7); x.fill(); } }
    if (lk.hat && lk.hat !== "glasses" && lk.hat !== "none") drawHat(x, lk.hat, hx, hy - 2, col.color);
    x.restore();
    if (o.label !== false) {
      x.font = `800 17px ${FONT}`; x.textAlign = "center"; x.direction = "rtl";
      const s = w.name + " " + w.hp, tw = x.measureText(s).width + 16, ly = o.ly ?? w.y - 80;
      if (ly < w.y - 84) { x.strokeStyle = "rgba(15,23,42,.45)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(w.x, ly + 20); x.lineTo(w.x, w.y - 58); x.stroke(); }
      x.fillStyle = "rgba(15,23,42,.72)"; rr(x, w.x - tw / 2, ly, tw, 23, 9); x.fill();
      x.fillStyle = col.light; x.fillText(s, w.x, ly + 17);
    }
  }

  K.start(homeScreen);
})();
