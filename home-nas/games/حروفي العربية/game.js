// حروفي العربية — لعبة لتعلّم الحروف للأطفال (تعمل بدون إنترنت)
// التحكم: الأسهم للتنقل، Enter أو ✕ للاختيار، Backspace أو ○ للرجوع (Escape للخروج من اللعبة على التلفاز)
(() => {
  "use strict";
  const L = window.LETTERS, G = window.GROUPS;
  const app = document.getElementById("app"), fx = document.getElementById("fx");

  // ------------------------------------------------------------ الحفظ (لكل طفل حسب مسار اللعبة)
  const KEY = "hurufi:" + location.pathname;
  const save = (() => {
    const d = { stars: {}, seen: {}, stickers: [] };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { return d; }
  })();
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch {} };

  // ------------------------------------------------------------ أدوات
  const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const groupOf = (i) => G.findIndex((g) => i >= g.from && i < g.to);
  const grad = (gi) => { const [a, b] = G[gi].color.split(","); return `linear-gradient(135deg, ${a}, ${b})`; };
  const colorOf = (gi) => G[gi].color.split(",")[1];
  const starsHtml = (n) => "⭐".repeat(n) + `<span class="off">${"⭐".repeat(3 - n)}</span>`;
  const totalStars = (mode) => Object.entries(save.stars).filter(([k]) => !mode || k.startsWith(mode + ":")).reduce((s, [, v]) => s + v, 0);

  const MODES = [
    { id: "learn", title: "تعلّم الحروف", desc: "شاهد واستمع", icon: "📚", bg: "linear-gradient(135deg,#f97316,#ef4444)" },
    { id: "match", title: "طابِق الحرف", desc: "جِد الحرف نفسه", icon: "🔤", bg: "linear-gradient(135deg,#22c55e,#15803d)" },
    { id: "first", title: "بماذا تبدأ؟", desc: "أكمِل الكلمة", icon: "🧩", bg: "linear-gradient(135deg,#06b6d4,#2563eb)" },
    { id: "pic", title: "أين الصورة؟", desc: "صورة تبدأ بالحرف", icon: "🖼️", bg: "linear-gradient(135deg,#a855f7,#ec4899)" },
  ];
  const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "بطل! 🏆", "شاطر! 💪", "صحيح! ✅"];

  // ------------------------------------------------------------ الأصوات
  let ac = null;
  function tone(f, d = 0.12, type = "sine", v = 0.15, when = 0) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + when;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch {}
  }
  const sfx = {
    ok() { tone(660, 0.12); tone(880, 0.12, "sine", 0.15, 0.1); tone(1320, 0.22, "sine", 0.12, 0.2); },
    bad() { tone(200, 0.28, "square", 0.05); },
    tick() { tone(520, 0.04, "sine", 0.035); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, "triangle", 0.12, i * 0.15)); },
  };

  // نطق الحرف: ملف sounds/<الحرف>.m4a أو .mp3 إن وُجد، وإلا صوت عربي من النظام إن توفر
  let voice = null, audio = null;
  const pickVoice = () => { try { voice = speechSynthesis.getVoices().find((v) => /^ar/i.test(v.lang)) || null; } catch {} };
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function tts(text) {
    if (!voice || !text) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = voice; u.lang = voice.lang; u.rate = 0.85; speechSynthesis.speak(u); } catch {}
  }
  function say(letter, text) {
    try { audio && audio.pause(); } catch {}
    if (!letter) return tts(text);
    const exts = ["m4a", "mp3"];
    let i = 0;
    const next = () => {
      if (i >= exts.length) return tts(text);
      const a = new Audio(`sounds/${encodeURIComponent(letter)}.${exts[i++]}`);
      let failed = false;
      const fail = () => { if (!failed) { failed = true; next(); } };
      audio = a; a.onerror = fail;
      a.play().catch((e) => { if (e && e.name !== "NotAllowedError" && e.name !== "AbortError") fail(); });
    };
    next();
  }

  function confetti(n = 24, set = "⭐🎉✨🌟🎈") {
    const arr = [...set];
    for (let i = 0; i < n; i++) {
      const e = document.createElement("i");
      e.className = "emo";
      e.textContent = arr[Math.random() * arr.length | 0];
      e.style.left = Math.random() * 100 + "vw";
      e.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      e.style.animationDelay = Math.random() * 0.4 + "s";
      fx.appendChild(e);
      setTimeout(() => e.remove(), 4200);
    }
  }

  // ------------------------------------------------------------ الشاشات والتركيز
  const stack = [];
  let acts = {}, cur = null, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const stopTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const top = () => stack[stack.length - 1];
  function render() { stopTimers(); const t = top(); t.fn(...t.args); }
  function show(fn, ...args) { stack.push({ fn, args }); render(); }
  function replace(fn, ...args) { stack.pop(); show(fn, ...args); }
  function back() { if (stack.length > 1) { stack.pop(); render(); } }
  const act = (k, fn) => { acts[k] = fn; return `data-k="${k}"`; };

  function paint(html, def) {
    app.innerHTML = `<section class="screen">${html}</section>`;
    cur = null;
    const k = top().focus || def;
    focus((k && app.querySelector(`.f[data-k="${k}"]`)) || app.querySelector(".f"));
  }
  function focus(el) {
    if (!el) return;
    if (cur) cur.classList.remove("sel");
    cur = el; el.classList.add("sel");
    if (top()) top().focus = el.dataset.k;
  }
  function move(dir) {
    const els = [...app.querySelectorAll(".f")].filter((e) => e.offsetParent !== null);
    if (!cur || !app.contains(cur)) return focus(els[0]);
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bs = Infinity;
    for (const e of els) {
      if (e === cur) continue;
      const q = e.getBoundingClientRect(), x = q.left + q.width / 2 - cx, y = q.top + q.height / 2 - cy;
      const main = dir === "left" ? -x : dir === "right" ? x : dir === "up" ? -y : y;
      const side = dir === "left" || dir === "right" ? Math.abs(y) : Math.abs(x);
      if (main <= 4) continue;
      const s = main + side * 2.5;
      if (s < bs) { bs = s; best = e; }
    }
    if (best) { focus(best); sfx.tick(); }
  }

  let lastClick = { el: null, t: 0 };
  app.addEventListener("click", (e) => {
    const el = e.target.closest(".f");
    if (!el || !acts[el.dataset.k]) return;
    const now = performance.now();
    if (lastClick.el === el && now - lastClick.t < 250) return;
    lastClick = { el, t: now };
    focus(el);
    acts[el.dataset.k](el);
  });
  app.addEventListener("mousemove", (e) => { const el = e.target.closest(".f"); if (el && el !== cur) focus(el); });

  document.addEventListener("keydown", (e) => {
    const dirs = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    if (dirs[e.key]) move(dirs[e.key]);
    else if (e.key === "Enter" || e.key === " ") { if (cur) cur.click(); }
    else if (e.key === "Backspace") back();
    else return; // Escape يبقى للتلفاز (الخروج من اللعبة)
    e.preventDefault();
  });

  // يد التحكم (بلايستيشن وغيرها)
  const pad = { dir: null, next: 0, a: false, b: false };
  function poll(ts) {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let g = null;
    for (const x of gps) if (x && x.connected) { g = x; break; }
    if (g) {
      const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      const dir = b(12) || ay < -0.6 ? "up" : b(13) || ay > 0.6 ? "down" : b(14) || ax < -0.6 ? "left" : b(15) || ax > 0.6 ? "right" : null;
      if (dir && (dir !== pad.dir || ts > pad.next)) { move(dir); pad.next = ts + (dir !== pad.dir ? 400 : 170); }
      pad.dir = dir;
      if (b(0) && !pad.a && cur) cur.click();
      if (b(1) && !pad.b) back();
      pad.a = b(0); pad.b = b(1);
    }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);

  const HELP = `<div class="help"><b>الأسهم</b> للتنقل · <b>Enter</b> أو <b>✕</b> للاختيار · <b>Backspace</b> أو <b>○</b> للرجوع</div>`;
  const backBtn = () => `<button class="btn f" ${act("back", back)}>→ رجوع</button>`;

  // ------------------------------------------------------------ الرئيسية
  function homeScreen() {
    acts = {};
    const seen = Object.keys(save.seen).length;
    const cards = MODES.map((m, i) => `
      <button class="mode f" style="background:${m.bg};width:20vw;height:38vh" ${act("m" + i, () => (m.id === "learn" ? show(learnGrid) : show(groupScreen, i)))}>
        <span class="big emo">${m.icon}</span><b>${m.title}</b>
        <span>${m.id === "learn" ? `📚 ${seen} / 28` : `⭐ ${totalStars(m.id)} / 15`}</span>
      </button>`).join("");
    paint(`
      <div class="title"><span class="mascot emo">🦉</span><div><h1>حروفي العربية</h1><div class="sub">هيا نتعلّم الحروف ونلعب!</div></div></div>
      <div class="modes">${cards}</div>
      <div class="mini">
        <button class="btn f" ${act("stk", () => show(stickersScreen))}><span class="emo">🎖️</span> ملصقاتي (${save.stickers.length} / 28)</button>
        <span class="pill">⭐ ${totalStars()}</span>
      </div>
      ${HELP}`, "m0");
  }

  // ------------------------------------------------------------ تعلّم الحروف
  function learnGrid() {
    acts = {};
    const tiles = L.map((x, i) => `<button class="tile f${save.seen[x.l] ? " seen" : ""}" style="background:${grad(groupOf(i))}" ${act("t" + i, () => show(cardScreen, i))}>${x.l}</button>`).join("");
    paint(`
      <div class="top">${backBtn()}<h2>تعلّم الحروف</h2><span class="pill">📚 ${Object.keys(save.seen).length} / 28</span></div>
      <div class="grid">${tiles}</div>
      ${HELP}`, "t0");
  }

  function cardScreen(i) {
    acts = {};
    const x = L[i], c = colorOf(groupOf(i));
    const go = (d) => { top().args = [(i + d + L.length) % L.length]; top().focus = d > 0 ? "next" : "prev"; render(); };
    if (!save.seen[x.l]) { save.seen[x.l] = 1; store(); }
    paint(`
      <div class="top">${backBtn()}<span class="pill">${i + 1} / ${L.length}</span></div>
      <div class="card">
        <div class="letter" style="color:${c}">${x.l}</div>
        <div class="info">
          <div class="pic emo">${x.pic}</div>
          <div class="word"><span class="first" style="--c:${c}">${x.word[0]}</span>${x.word.slice(1)}</div>
          <div class="name">حرف ${x.name}</div>
        </div>
      </div>
      <div class="nav">
        <button class="btn f" ${act("prev", () => go(-1))}>→ السابق</button>
        <button class="btn f" ${act("say", () => say(x.l, `${x.name}. ${x.word}`))}><span class="emo">🔊</span> استمع</button>
        <button class="btn f" ${act("next", () => go(1))}>التالي ←</button>
      </div>`, "next");
    say(x.l, `${x.name}. ${x.word}`);
  }

  // ------------------------------------------------------------ اختيار المجموعة
  function groupScreen(mi) {
    acts = {};
    const m = MODES[mi];
    const cards = G.map((g, gi) => {
      const s = save.stars[`${m.id}:${gi}`] || 0;
      const letters = L.slice(g.from, g.to).map((x) => x.l).join(" ");
      return `<button class="mode f grp" style="background:${grad(gi)}" ${act("g" + gi, () => show(quizScreen, mi, gi))}>
        <b class="ltrs">${letters}</b><span class="st">${starsHtml(s)}</span></button>`;
    }).join("");
    const sa = save.stars[`${m.id}:all`] || 0;
    paint(`
      <div class="top">${backBtn()}<h2><span class="emo">${m.icon}</span> ${m.title}</h2><span class="pill">⭐ ${totalStars(m.id)}</span></div>
      <div class="sub">اختر مجموعة الحروف</div>
      <div class="modes">${cards}</div>
      <div class="mini"><button class="btn f" ${act("all", () => show(quizScreen, mi, -1))}>🌈 كل الحروف <span class="st">${starsHtml(sa)}</span></button></div>
      ${HELP}`, "g0");
  }

  // ------------------------------------------------------------ الأسئلة
  function quizScreen(mi, gi) {
    const m = MODES[mi];
    const pool = gi < 0 ? range(0, L.length) : range(G[gi].from, G[gi].to);
    const nOpt = gi === 0 || gi === 1 ? 3 : 4;
    let qs = shuffle(pool);
    while (qs.length < 8) qs.push(shuffle(pool).find((j) => j !== qs[qs.length - 1]));
    qs = qs.slice(0, 8);
    let q = 0, score = 0;
    const results = [];
    ask();

    function ask() {
      acts = {};
      const i = qs[q], x = L[i], c = colorOf(groupOf(i));
      const others = shuffle(pool.filter((j) => j !== i && L[j].l !== x.l)).slice(0, nOpt - 1);
      const opts = shuffle([i, ...others]);
      let wrong = false, locked = false;
      let prompt;
      if (m.id === "match") prompt = `<div class="letter" style="color:${c}">${x.l}</div><div class="q">أين هذا الحرف؟</div>`;
      else if (m.id === "first") prompt = `<div class="pic emo">${x.pic}</div><div class="word"><span class="hole">؟</span>${x.word.slice(1)}</div>`;
      else prompt = `<div class="letter" style="color:${c}">${x.l}</div><div class="q">أين الصورة التي تبدأ بحرف ${x.name}؟</div>`;
      const label = (j) => (m.id === "pic" ? `<span class="emo">${L[j].pic}</span>` : L[j].l);
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "") : k === q ? "now" : ""}"></i>`).join("");
      const choose = (j, el) => {
        if (locked || el.dataset.dead) return;
        const cheer = app.querySelector(".cheer");
        if (j === i) {
          locked = true;
          el.classList.add("ok");
          if (!wrong) score++;
          results[q] = !wrong;
          sfx.ok(); confetti(10);
          cheer.textContent = GOOD[Math.random() * GOOD.length | 0];
          if (m.id === "first") app.querySelector(".hole").outerHTML = `<span class="first" style="--c:${c}">${x.l}</span>`;
          say(x.l, `${x.name}. ${x.word}`);
          later(() => { q++; if (q < qs.length) { top().focus = null; ask(); } else finish(); }, 1700);
        } else {
          wrong = true;
          el.classList.add("bad"); el.dataset.dead = "1";
          sfx.bad();
          cheer.textContent = "حاول مرة أخرى 💪";
        }
      };
      paint(`
        <div class="top">${backBtn()}<div class="dots">${dots}</div><span class="pill">${q + 1} / ${qs.length}</span></div>
        <div class="prompt">${prompt}</div>
        <div class="opts">${opts.map((j, k) => `<button class="opt f${m.id === "pic" ? " pico" : ""}" ${act("o" + k, (el) => choose(j, el))}>${label(j)}</button>`).join("")}</div>
        <div class="cheer"></div>
        ${HELP}`, "o0");
      if (m.id === "first") tts(x.word); else say(x.l, x.name);
    }

    function finish() {
      const s = score >= 7 ? 3 : score >= 5 ? 2 : 1;
      const key = `${m.id}:${gi < 0 ? "all" : gi}`;
      save.stars[key] = Math.max(save.stars[key] || 0, s);
      let sticker = null;
      if (s >= 2) {
        const fresh = shuffle(pool).find((j) => !save.stickers.includes(L[j].l)) ?? shuffle(range(0, L.length)).find((j) => !save.stickers.includes(L[j].l));
        if (fresh !== undefined) { sticker = fresh; save.stickers.push(L[fresh].l); }
      }
      store();
      replace(resultScreen, mi, gi, score, s, sticker);
    }
  }

  function resultScreen(mi, gi, score, s, sticker) {
    acts = {};
    const nextG = gi >= 0 && gi < G.length - 1 ? gi + 1 : null;
    const msg = s === 3 ? "ممتاز! أنت بطل الحروف 🏆" : s === 2 ? "أحسنت! 👏" : "جيد! لنحاول مرة أخرى 💪";
    paint(`
      <div class="top">${backBtn()}<span></span><span class="pill">${MODES[mi].title}</span></div>
      <h1>${msg}</h1>
      <div class="stars">${starsHtml(s)}</div>
      <div class="sub">أجبت ${score} من 8 من أول محاولة</div>
      ${sticker !== null ? `<div class="won"><span class="emo">${L[sticker].pic}</span><div><b>ملصق جديد!</b><br>${L[sticker].word}</div></div>` : ""}
      <div class="nav">
        <button class="btn f" ${act("again", () => replace(quizScreen, mi, gi))}><span class="emo">🔁</span> مرة أخرى</button>
        ${nextG !== null ? `<button class="btn f" ${act("nextg", () => replace(quizScreen, mi, nextG))}>المجموعة التالية ←</button>` : ""}
        <button class="btn f" ${act("home", () => { stack.length = 0; show(homeScreen); })}><span class="emo">🏠</span> القائمة</button>
      </div>
      ${HELP}`, nextG !== null && s >= 2 ? "nextg" : "again");
    sfx.win(); confetti(s * 16);
  }

  // ------------------------------------------------------------ الملصقات
  function stickersScreen() {
    acts = {};
    const tiles = L.map((x, i) => {
      const has = save.stickers.includes(x.l);
      return `<button class="tile sticker f${has ? "" : " no"}" ${act("s" + i, () => has && say(x.l, `${x.name}. ${x.word}`))}>
        <span class="emo">${has ? x.pic : "❔"}</span><small>${x.l}</small></button>`;
    }).join("");
    paint(`
      <div class="top">${backBtn()}<h2><span class="emo">🎖️</span> ملصقاتي</h2><span class="pill">${save.stickers.length} / 28</span></div>
      <div class="grid">${tiles}</div>
      <div class="help">احصل على نجمتين أو ثلاث في الأسئلة لتربح ملصقاً جديداً</div>`, "back");
  }

  show(homeScreen);
})();
