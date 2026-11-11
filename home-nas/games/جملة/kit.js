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
  K.store = (name, def) => {
    const key = name + ":" + location.pathname;
    let data = def;
    try { data = Object.assign(def, JSON.parse(localStorage.getItem(key) || "{}")); } catch {}
    data.save = () => { try { const { save, ...rest } = data; localStorage.setItem(key, JSON.stringify(rest)); } catch {} };
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
  K.pads = () => { const out = []; try { for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected) out.push(g); } catch {} return out; };
  function poll(ts) {
    const pads = K.pads();
    if (!(K.mode && K.mode.poll && K.mode.poll(pads, ts)) && pads.length) {
      const g = pads[0];
      const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
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

  // r = { s, score, total, extra, again, next: {label, fn}, title, msg }
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
  };
})();
