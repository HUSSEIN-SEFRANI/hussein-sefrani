// kit.js — أدوات مشتركة لألعاب الأطفال على تلفاز H.SEF (نسخة في كل مجلد لعبة، تعمل بدون إنترنت)
// التحكم: الأسهم للتنقل، Enter أو ✕ للاختيار، Backspace أو ○ للرجوع. Escape محجوز للتلفاز (الخروج من اللعبة).
(() => {
  "use strict";
  const K = (window.K = {});
  const app = (K.app = document.getElementById("app"));
  const fx = document.getElementById("fx");

  // ---------------------------------------------------------------- أدوات
  K.range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
  K.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  K.pick = (a) => a[(Math.random() * a.length) | 0];
  K.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  K.starsHtml = (n, max = 3) => "⭐".repeat(n) + `<span class="off">${"⭐".repeat(Math.max(0, max - n))}</span>`;
  K.starsFor = (score, total) => (score >= total * 0.85 ? 3 : score >= total * 0.6 ? 2 : 1);
  // أمثلة: K.options(صحيح, كل_الخيارات, 3) => [صحيح + خياران مختلفان] بترتيب عشوائي
  K.options = (right, pool, n, same = (a, b) => a === b) => K.shuffle([right, ...K.shuffle(pool.filter((x) => !same(x, right))).filter((x, i, arr) => arr.findIndex((y) => same(x, y)) === i).slice(0, n - 1)]);

  // ---------------------------------------------------------------- الحفظ (لكل طفل حسب مسار اللعبة)
  // إذا نُقلت اللعبة إلى مربع آخر (مثلاً من «الألعاب» إلى «التعليم») يتغير رقم المربع في العنوان:
  // نأخذ التقدّم المحفوظ تحت الرقم القديم حتى لا يضيع
  K.carry = (key) => {
    try {
      if (localStorage.getItem(key) !== null) return;
      const m = key.match(/^(.*:)\/tv\/game\/\d+\/(.+)$/);
      if (!m) return;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i), o = k && k.match(/^(.*:)\/tv\/game\/\d+\/(.+)$/);
        if (o && o[1] === m[1] && o[2] === m[2]) { localStorage.setItem(key, localStorage.getItem(k)); return; }
      }
    } catch {}
  };
  // البند 50: التقدّم يُحفظ في السيرفر لكل فرد (يدخل في النسخ الاحتياطي ولا يضيع مع إعادة التنصيب)،
  // ونسخة في المتصفح احتياطاً. المفتاح في السيرفر بلا رقم المربع: «الاسم:مسار التطبيق».
  K.saveKey = (name) => {
    let p = location.pathname;
    try { p = decodeURIComponent(p); } catch {}
    const m = p.match(/^\/tv\/game\/\d+\/(.*)$/);
    return m ? name + ":" + m[1].replace(/(\/index\.html)?\/?$/, "") : null;
  };
  K.store = (name, def) => {
    const key = name + ":" + location.pathname, skey = K.saveKey(name);
    K.carry(key);
    let local = null, remote;   // remote: undefined = السيرفر لا يحفظ (قديم أو خارج التلفاز)، null = لا شيء محفوظ بعد
    try { local = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
    if (skey) {
      try {
        const x = new XMLHttpRequest();
        x.open("GET", "/api/tv/save?key=" + encodeURIComponent(skey), false);   // مرة واحدة عند بدء اللعبة (السيرفر في البيت)
        x.send();
        if (x.status === 200) { const r = JSON.parse(x.responseText); remote = r.found ? r.value : null; }
      } catch {}
    }
    const data = def;
    try { Object.assign(data, remote || local || {}); } catch {}
    const push = () => {
      if (!skey || remote === undefined) return;
      try {
        const { save, ...rest } = data;
        const body = JSON.stringify({ key: skey, value: rest });
        fetch("/api/tv/save", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          keepalive: body.length < 60000, body }).catch(() => {});
      } catch {}
    };
    data.save = () => { try { const { save, ...rest } = data; localStorage.setItem(key, JSON.stringify(rest)); } catch {} push(); };
    if (remote === null && local) push();   // تقدّم قديم على التلفاز: يُنقل إلى السيرفر مرة واحدة
    return data;
  };

  // ---------------------------------------------------------------- الأصوات
  let ac = null;
  K.audioCtx = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch {} return ac; };
  K.tone = (f, d = 0.12, type = "sine", v = 0.15, when = 0) => {
    const c = K.audioCtx(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
    } catch {}
  };
  K.sfx = {
    ok() { K.tone(660, 0.12); K.tone(880, 0.12, "sine", 0.15, 0.1); K.tone(1320, 0.22, "sine", 0.12, 0.2); },
    bad() { K.tone(200, 0.28, "square", 0.05); },
    tick() { K.tone(520, 0.04, "sine", 0.035); },
    pop() { K.tone(760, 0.08, "triangle", 0.12); },
    win() { [523, 659, 784, 1047].forEach((f, i) => K.tone(f, 0.28, "triangle", 0.12, i * 0.15)); },
  };

  // النطق: ملف صوتي إن وُجد، وإلا صوت النظام للغة المطلوبة إن توفر
  let audio = null;
  const voices = () => { try { return speechSynthesis.getVoices(); } catch { return []; } };
  if ("speechSynthesis" in window) { voices(); speechSynthesis.onvoiceschanged = voices; }
  K.voice = (lang = "ar") => voices().find((v) => v.lang && v.lang.toLowerCase().startsWith(lang)) || null;
  K.tts = (text, lang = "ar", rate = 0.85) => {
    const v = K.voice(lang);
    if (!v || !text) return false;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = rate; speechSynthesis.speak(u); return true; } catch { return false; }
  };
  K.stopSound = () => { try { audio && audio.pause(); } catch {} try { speechSynthesis.cancel(); } catch {} };
  // files: قائمة ملفات بالترتيب (مثل ["sounds/ب.m4a","sounds/ب.mp3"])؛ onEnd يُستدعى عند انتهاء الملف (لا يُستدعى مع صوت النظام)
  K.play = (files, fallbackText, lang = "ar", onEnd, onFail) => {
    K.stopSound();
    let i = 0;
    const next = () => {
      if (i >= files.length) { if (!(fallbackText && K.tts(fallbackText, lang)) && onFail) onFail(); return; }
      const a = new Audio(files[i++]);
      let failed = false;
      const fail = () => { if (!failed) { failed = true; next(); } };
      audio = a; a.onerror = fail; if (onEnd) a.onended = onEnd;
      a.play().catch((e) => { if (e && e.name !== "NotAllowedError" && e.name !== "AbortError") fail(); });
    };
    next();
  };

  K.confetti = (n = 24, set = "⭐🎉✨🌟🎈") => {
    const arr = [...set];
    for (let i = 0; i < n; i++) {
      const e = document.createElement("i");
      e.className = "emo";
      e.textContent = arr[(Math.random() * arr.length) | 0];
      e.style.left = Math.random() * 100 + "vw";
      e.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      e.style.animationDelay = Math.random() * 0.4 + "s";
      fx.appendChild(e);
      setTimeout(() => e.remove(), 4200);
    }
  };

  // ---------------------------------------------------------------- الشاشات والتركيز
  const stack = [];
  let acts = {}, cur = null, timers = [];
  K.mode = null; // شاشة تتحكم بالأزرار بنفسها: { key(e)->bool, keyup(e), poll(pads, ts)->bool, stop() }
  K.later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  K.every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };
  const stopAll = () => {
    timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers = [];
    if (K.mode && K.mode.stop) K.mode.stop();
    K.mode = null;
    K.stopSound();
  };
  K.top = () => stack[stack.length - 1];
  K.render = () => { stopAll(); const t = K.top(); t.fn(...t.args); };
  K.show = (fn, ...args) => { stack.push({ fn, args }); K.render(); };
  K.replace = (fn, ...args) => { stack.pop(); K.show(fn, ...args); };
  K.back = () => { if (stack.length > 1) { stack.pop(); K.render(); } };
  K.home = () => { stack.length = 0; K.show(K.homeScreen); };
  K.start = (homeFn) => { K.homeScreen = homeFn; K.show(homeFn); };
  K.act = (k, fn) => { acts[k] = fn; return `data-k="${k}"`; };

  K.paint = (html, def) => {
    acts = acts || {};
    app.innerHTML = `<section class="screen">${html}</section>`;
    cur = null;
    const k = K.top() && K.top().focus || def;
    K.focus((k && app.querySelector(`.f[data-k="${k}"]`)) || app.querySelector(".f"));
  };
  K.begin = () => { acts = {}; }; // تُستدعى في بداية كل شاشة قبل K.act
  K.focus = (el) => {
    if (!el) return;
    if (cur) cur.classList.remove("sel");
    cur = el; el.classList.add("sel");
    if (K.top()) K.top().focus = el.dataset.k;
    if (K.onFocus) K.onFocus(el);
  };
  K.current = () => cur;
  K.move = (dir) => {
    const els = [...app.querySelectorAll(".f")].filter((e) => e.offsetParent !== null || e instanceof SVGElement);
    if (!cur || !app.contains(cur)) return K.focus(els[0]);
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
    if (best) { K.focus(best); K.sfx.tick(); }
  };
  K.press = () => { if (cur) fire(cur); };
  let last = { el: null, t: 0 };
  function fire(el) {
    const now = performance.now();
    if (last.el === el && now - last.t < 250) return;
    last = { el, t: now };
    K.focus(el);
    const fn = acts[el.dataset.k];
    if (fn) fn(el);
  }
  app.addEventListener("click", (e) => { const el = e.target.closest(".f"); if (el && acts[el.dataset.k]) fire(el); });
  app.addEventListener("mousemove", (e) => { const el = e.target.closest(".f"); if (el && el !== cur) K.focus(el); });

  const DIRS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
  document.addEventListener("keydown", (e) => {
    K.audioCtx();
    if (e.key === "Escape") return; // للتلفاز
    if (K.mode && K.mode.key && K.mode.key(e)) { e.preventDefault(); return; }
    if (DIRS[e.key]) K.move(DIRS[e.key]);
    else if (e.key === "Enter" || e.key === " ") K.press();
    else if (e.key === "Backspace") K.back();
    else return;
    e.preventDefault();
  });
  document.addEventListener("keyup", (e) => { if (K.mode && K.mode.keyup) K.mode.keyup(e); });

  // يد التحكم (بلايستيشن وغيرها)
  const pad = { dir: null, next: 0, a: false, b: false };
  // ترتيب الأيادي حسب أول ضغطة: يد موصولة لا يُضغط فيها شيء (مثل يد سلكية منسية) لا تأخذ مكان اللاعب الأول
  const padOrder = [];
  const padTouched = (g) => g.buttons.some((x) => x && x.pressed) || Math.abs(g.axes[0] || 0) > 0.5 || Math.abs(g.axes[1] || 0) > 0.5;
  // ترتيب أزرار اليد: يد معروفة (standard) كما هي، ويد عامة بلا ماركة حسب «إعداد يد جديدة» المحفوظ لاسمها
  const PAD_ORDER = ["a", "b", "x", "y", "l1", "r1", "l2", "r2", "select", "start", "ls", "rs", "up", "down", "left", "right", "home"];
  function padNorm(g, maps) {
    const m = maps && maps[g.id];
    if (!m) return g;
    const on = (c) => !!c && (c.t === "b" ? !!(g.buttons[c.i] && g.buttons[c.i].pressed) : (g.axes[c.i] || 0) * c.s > 0.6);
    const used = new Set(Object.values(m).filter((c) => c && c.t === "a").map((c) => c.i));
    const ax = (i) => (used.has(i) ? 0 : g.axes[i] || 0);
    const buttons = PAD_ORDER.map((k) => { const p = on(m[k]); return { pressed: p, value: p ? 1 : 0, touched: p }; });
    return { id: g.id, index: g.index, connected: g.connected, mapping: "standard", timestamp: g.timestamp, raw: g,
      vibrationActuator: g.vibrationActuator, buttons, axes: [ax(0), ax(1), ax(2), ax(3)] };
  }
  let padMaps = {};
  try { padMaps = JSON.parse(localStorage.getItem("hsef-padmaps") || "{}"); } catch {}
  // اللاعب 1 = اليد الأساسية في التلفاز (window.hsefPadOrder في الصفحة الأم)، فيبقى نفسه في كل الألعاب
  const tvOrder = () => { try { return window.parent !== window && typeof window.parent.hsefPadOrder === "function" ? window.parent.hsefPadOrder() : null; } catch { return null; } };
  // مستشعر الحركة ولوحة اللمس في يد PS4/PS5 يظهران في لينكس كـ«يد» ثانية تتحرك أرقامها وحدها: ليست لاعباً
  const NOT_PAD = /motion sensors|touchpad|accelerometer|gyro/i;
  K.pads = () => {
    const all = [];
    try { for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected && !NOT_PAD.test(g.id || "")) all.push(padNorm(g, padMaps)); } catch {}
    for (const g of all) if (!padOrder.includes(g.index) && padTouched(g)) padOrder.push(g.index);
    // اللاعبون = الأيادي التي ضُغط فيها شيء في هذه اللعبة فقط. ترتيب التلفاز (اليد الأساسية أولاً) يرتّبها فيما بينها،
    // فيد موضوعة جانباً (ولو كانت «الأساسية» في الشاشة الرئيسية) لا تأخذ مكان من يلعب فعلاً
    const tv = (tvOrder() || []).filter((i) => padOrder.includes(i));
    const ord = [...tv, ...padOrder].filter((i, k, x) => x.indexOf(i) === k);
    return ord.map((i) => all.find((g) => g.index === i)).filter(Boolean);
  };
  K.mainPad = () => K.pads()[0] || null;
  function poll(ts) {
    const pads = K.pads();
    if (!(K.mode && K.mode.poll && K.mode.poll(pads, ts)) && pads.length) {
      // القوائم تتحرك بأي يد يلعب بها أحد (لا اليد الأولى وحدها)
      const b = (i) => pads.some((g) => g.buttons[i] && g.buttons[i].pressed);
      const big = (k) => pads.reduce((m, g) => (Math.abs(g.axes[k] || 0) > Math.abs(m) ? g.axes[k] || 0 : m), 0);
      const ax = big(0), ay = big(1);
      const dir = b(12) || ay < -0.6 ? "up" : b(13) || ay > 0.6 ? "down" : b(14) || ax < -0.6 ? "left" : b(15) || ax > 0.6 ? "right" : null;
      if (dir && (dir !== pad.dir || ts > pad.next)) {
        if (!(K.mode && K.mode.key && K.mode.key({ key: "Arrow" + dir[0].toUpperCase() + dir.slice(1), pad: true }))) K.move(dir);
        pad.next = ts + (dir !== pad.dir ? 400 : 170);
      }
      pad.dir = dir;
      if (b(0) && !pad.a) { K.audioCtx(); if (!(K.mode && K.mode.key && K.mode.key({ key: "Enter", pad: true }))) K.press(); }
      if (b(1) && !pad.b) { if (!(K.mode && K.mode.key && K.mode.key({ key: "Backspace", pad: true }))) K.back(); }
      pad.a = b(0); pad.b = b(1);
    }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);

  K.HELP = `<div class="help"><b>الأسهم</b> للتنقل · <b>Enter</b> أو <b>✕</b> للاختيار · <b>Backspace</b> أو <b>○</b> للرجوع</div>`;
  K.backBtn = (label = "→ رجوع") => `<button class="btn f" ${K.act("back", K.back)}>${label}</button>`;

  // ---------------------------------------------------------------- صور من السيرفر
  // مكان اللعبة على التلفاز: /tv/game/<رقم المربع>/<المجلد>/index.html
  K.gameInfo = () => {
    const m = location.pathname.match(/^\/tv\/game\/(\d+)\/(.*)$/);
    if (!m) return null;
    const parts = m[2].split("/").map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
    parts.pop();
    return { tid: m[1], sub: parts.filter(Boolean).join("/") };
  };
  // صور مجلد داخل مجلد اللعبة (مثل family أو photos)
  K.listImages = async (folder) => {
    const g = K.gameInfo();
    if (!g) return [];
    const sub = g.sub ? g.sub + "/" + folder : folder;
    try {
      const r = await fetch(`/api/tv/tile/${g.tid}/list?sub=${encodeURIComponent(sub)}`, { credentials: "same-origin" });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.items || []).filter((x) => x.type === "image").map((x) => ({ name: x.name, url: folder + "/" + encodeURIComponent(x.name) }));
    } catch { return []; }
  };
  // صور الطفل من مكتبته على السيرفر (المفضلة أولاً)
  K.myPhotos = async (what = "view") => {
    try {
      const r = await fetch("/api/tv/wallpaper", { credentials: "same-origin" });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.ids || []).map((id) => `/api/tv/photo/${id}/${what}`);
    } catch { return []; }
  };
  K.loadImage = (url) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
  // قص الصورة مربعاً وإرجاعها كرابط بيانات
  K.squareImage = async (url, size = 720) => {
    const im = await K.loadImage(url);
    if (!im) return null;
    const c = document.createElement("canvas"); c.width = c.height = size;
    const s = Math.min(im.naturalWidth, im.naturalHeight);
    c.getContext("2d").drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, size, size);
    try { return c.toDataURL("image/jpeg", 0.9); } catch { return null; }
  };

  // ---------------------------------------------------------------- نجمة إنهاء الدرس
  // تُستدعى مرة واحدة عند نهاية الدرس أو الجولة. السيرفر يقرر: التطبيق التعليمي (في مجلد «التعليم») يأخذ
  // نجمة واحدة ضمن الحد اليومي، واللعبة لا تأخذ شيئاً. يرجع عدد ما أُضيف فعلاً (0 أو 1)، وأي خطأ يُتجاهل.
  K.lessonDone = (reason = "") => {
    if (!K.gameInfo()) return Promise.resolve(0);
    return fetch("/api/tv/stars/earn", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1, game: document.title || "تطبيق", reason: String(reason).replace(/<[^>]+>/g, "").slice(0, 80) }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => (d && d.added > 0 ? d.added : 0)).catch(() => 0);
  };
  // شارة «+1 ⭐ في رصيدك» داخل الشاشة الحالية (إن أُضيفت النجمة فعلاً)
  K.lessonBadge = (n, where = ".stars") => {
    if (!n) return;
    const el = app.querySelector(where);
    if (el) el.insertAdjacentHTML("afterend", `<div class="sub lesson-star">+${n} ⭐ في رصيدك</div>`);
  };

  // ---------------------------------------------------------------- محرك الأسئلة
  // o = { make: () => [{ prompt, opts:[html], answer, say?, sayOk?, reveal?(app) }], optsCls, title, done(score, stars, total) -> html? , next?: {label, fn} }
  const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "بطل! 🏆", "شاطر! 💪", "صحيح! ✅"];
  K.quizScreen = (o) => {
    const qs = o.make();
    let q = 0, score = 0;
    const results = [];
    ask();
    function ask() {
      K.begin();
      const Q = qs[q];
      let wrong = false, locked = false;
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "") : k === q ? "now" : ""}"></i>`).join("");
      const choose = (j, el) => {
        if (locked || el.dataset.dead) return;
        const cheer = app.querySelector(".cheer");
        if (j === Q.answer) {
          locked = true;
          el.classList.add("ok");
          if (!wrong) score++;
          results[q] = !wrong;
          K.sfx.ok(); K.confetti(10);
          cheer.textContent = K.pick(GOOD);
          if (Q.reveal) Q.reveal(app);
          if (Q.sayOk) Q.sayOk();
          K.later(() => { q++; if (q < qs.length) { K.top().focus = null; ask(); } else finish(); }, o.delay || 1700);
        } else {
          wrong = true;
          el.classList.add("bad"); el.dataset.dead = "1";
          K.sfx.bad();
          cheer.textContent = "حاول مرة أخرى 💪";
        }
      };
      K.paint(`
        <div class="top">${K.backBtn()}<div class="dots">${dots}</div>
          ${Q.say ? `<button class="btn f" ${K.act("say", () => Q.say())}><span class="emo">🔊</span></button>` : ""}
          <span class="pill">${q + 1} / ${qs.length}</span></div>
        <div class="prompt ${Q.pcls || ""}">${Q.prompt}</div>
        <div class="opts ${Q.optsCls || o.optsCls || ""}">${Q.opts.map((h, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(j, el))}>${h}</button>`).join("")}</div>
        <div class="cheer"></div>
        ${o.help ?? K.HELP}`, "o0");
      if (Q.say) Q.say();
    }
    function finish() {
      const s = K.starsFor(score, qs.length);
      const extra = o.done ? o.done(score, s, qs.length) || "" : "";
      K.replace(K.resultScreen, { s, score, total: qs.length, extra, again: () => K.replace(K.quizScreen, o), next: o.next, title: o.title });
    }
  };

  // r = { s, score, total, extra, again, next: {label, fn}, title, msg, learn? }
  K.resultScreen = (r) => {
    K.begin();
    const msg = r.msg || (r.s === 3 ? "ممتاز! أنت بطل 🏆" : r.s === 2 ? "أحسنت! 👏" : "جيد! لنحاول مرة أخرى 💪");
    K.paint(`
      <div class="top">${K.backBtn()}<span></span>${r.title ? `<span class="pill">${r.title}</span>` : "<span></span>"}</div>
      <h1>${msg}</h1>
      <div class="stars">${K.starsHtml(r.s)}</div>
      ${r.total ? `<div class="sub">أجبت ${r.score} من ${r.total} من أول محاولة</div>` : ""}
      ${r.extra || ""}
      <div class="nav">
        ${r.again ? `<button class="btn f" ${K.act("again", r.again)}><span class="emo">🔁</span> مرة أخرى</button>` : ""}
        ${r.next ? `<button class="btn f go" ${K.act("next", r.next.fn)}>${r.next.label} ←</button>` : ""}
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>
      ${K.HELP}`, r.next && r.s >= 2 ? "next" : "again");
    K.sfx.win(); K.confetti(r.s * 16);
    // نهاية درس: نجمة واحدة إن كان التطبيق تعليمياً (r.learn === false لإيقافها في شاشة نتيجة ليست نهاية درس)
    if (r.learn !== false && !r.earned) {   // مرة واحدة حتى لو أُعيد رسم الشاشة (رجوع إليها)
      r.earned = true;
      const shown = K.top();
      K.lessonDone(r.title || r.msg || "").then((n) => { if (K.top() === shown) K.lessonBadge(n); });
    }
  };
})();
