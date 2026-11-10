// سارة والتفكير — اختاري الترجمة الفرنسية الصحيحة أو الجواب الصحيح. 5 مستويات، 10 أسئلة في كل مستوى.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const LEVELS = window.LEVELS;
  const PER_LEVEL = 10;
  const STORE = "sara-thinking";

  // ------------------------------------------------------------ الحفظ
  let save = { unlocked: 1, best: {} };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch (e) { /* */ }
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) { /* */ } };

  // ------------------------------------------------------------ الصوت
  let ac = null;
  function tone(f, d, when = 0, type = "triangle", v = 0.15) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* */ }
  }
  const sfx = {
    move: () => tone(660, 0.06, 0, "triangle", 0.07),
    ok: () => { tone(784, 0.15); tone(988, 0.15, 0.1); tone(1319, 0.25, 0.2); },
    bad: () => { tone(330, 0.25, 0, "sine", 0.18); tone(247, 0.35, 0.18, "sine", 0.18); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, i * 0.14)),
  };
  // نطق الجمل الفرنسية إن كان في الجهاز صوت فرنسي
  let frVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    frVoice = speechSynthesis.getVoices().find((v) => /^fr/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!frVoice) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = frVoice; u.lang = frVoice.lang; u.rate = 0.85;
      speechSynthesis.speak(u);
    } catch (e) { /* */ }
  }

  // ------------------------------------------------------------ الشاشات
  let screen = "start", sel = 0;
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === id));
    screen = id;
  }
  const starsText = (n) => "★".repeat(n) + "☆".repeat(3 - n);

  function drawLevels() {
    $("levels").innerHTML = LEVELS.map((l, i) => {
      const locked = i + 1 > save.unlocked;
      const best = save.best[i] || 0;
      return `<button class="lv ${locked ? "locked" : ""} ${i === sel ? "sel" : ""}" data-i="${i}">${locked ? "🔒" : i + 1}<small>${locked ? "" : starsText(best)}</small></button>`;
    }).join("");
    $("levels").querySelectorAll(".lv").forEach((b) => {
      b.onclick = () => { sel = +b.dataset.i; drawLevels(); startLevel(sel); };
      b.onmouseenter = () => { sel = +b.dataset.i; drawLevels(); };
    });
  }

  // ------------------------------------------------------------ اللعب
  let level = 0, queue = [], qi = 0, score = 0, answers = [], locked = false;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function startLevel(i) {
    if (i + 1 > save.unlocked) { sfx.bad(); return; }
    level = i; qi = 0; score = 0;
    queue = shuffle(LEVELS[i].items).slice(0, PER_LEVEL);
    show("quiz");
    ask();
  }

  function ask() {
    const q = queue[qi];
    locked = false;
    $("lvl").textContent = `المستوى ${level + 1}: ${LEVELS[level].name}`;
    $("score").textContent = `⭐ ${score}`;
    $("bar").style.width = `${(qi / queue.length) * 100}%`;
    $("kind").textContent = q.t === "tr" ? "اختاري الترجمة الفرنسية الصحيحة" : "سؤال ذكاء: اختاري الجواب الصحيح";
    $("qar").textContent = q.ar;
    $("qfr").textContent = q.fr || "";
    $("fb").textContent = "";
    answers = shuffle(q.options.map((o, k) => ({ fr: Array.isArray(o) ? o[0] : o, ar: Array.isArray(o) ? o[1] : "", ok: k === 0 })));
    $("answers").innerHTML = answers.map((a, k) => `<button class="ans" data-k="${k}">${esc(a.fr)}${a.ar ? `<small>${esc(a.ar)}</small>` : ""}</button>`).join("");
    $("answers").querySelectorAll(".ans").forEach((b) => {
      b.onclick = () => { sel = +b.dataset.k; choose(); };
      b.onmouseenter = () => focusAns(+b.dataset.k);
    });
    sel = 0; focusAns(0, true);
    if (q.fr) setTimeout(() => say(q.fr), 300);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function focusAns(k, silent) {
    sel = k;
    $("answers").querySelectorAll(".ans").forEach((b, i) => b.classList.toggle("sel", i === k));
    if (!silent) { sfx.move(); say(answers[k].fr); }
  }

  function choose() {
    if (locked) return;
    locked = true;
    const btns = $("answers").querySelectorAll(".ans");
    const a = answers[sel];
    if (a.ok) {
      score++;
      btns[sel].classList.add("ok");
      $("fb").textContent = ["أحسنتِ يا سارة! Bravo !", "رائع! Super !", "ممتاز! Excellent !", "شاطرة! Très bien !"][Math.floor(Math.random() * 4)];
      sfx.ok(); confetti(24);
      say(a.fr);
    } else {
      btns[sel].classList.add("bad");
      btns[answers.findIndex((x) => x.ok)].classList.add("ok");
      $("fb").textContent = "لا بأس! الجواب الصحيح باللون الأخضر";
      sfx.bad();
      setTimeout(() => say(answers.find((x) => x.ok).fr), 500);
    }
    $("score").textContent = `⭐ ${score}`;
    setTimeout(next, a.ok ? 1700 : 2800);
  }

  function next() {
    qi++;
    if (qi < queue.length) { ask(); return; }
    finish();
  }

  let doneSel = 0, doneBtns = [];
  function finish() {
    $("bar").style.width = "100%";
    const stars = score >= 9 ? 3 : score >= 7 ? 2 : score >= 5 ? 1 : 0;
    save.best[level] = Math.max(save.best[level] || 0, stars);
    const passed = score >= 5;
    if (passed && level + 2 > save.unlocked && level + 1 < LEVELS.length) save.unlocked = level + 2;
    persist();
    $("stars").innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? "" : "off"}" style="animation-delay:${i * 0.2}s">⭐</span>`).join("");
    $("dt").textContent = stars === 3 ? "بطلة التفكير!" : passed ? "أحسنتِ يا سارة!" : "محاولة جميلة!";
    $("ds").textContent = `${score} من ${queue.length} إجابات صحيحة` + (passed && level + 1 < LEVELS.length ? " — فُتح المستوى التالي 🎉" : !passed ? " — تحتاجين 5 لفتح المستوى التالي" : " — أنهيتِ كل المستويات! 🏆");
    doneBtns = [];
    if (passed && level + 1 < LEVELS.length) doneBtns.push(["المستوى التالي ←", () => startLevel(level + 1)]);
    doneBtns.push(["إعادة المستوى", () => startLevel(level)], ["القائمة", () => { show("start"); sel = level; drawLevels(); }]);
    doneSel = 0;
    drawDone();
    show("done");
    if (passed) { sfx.win(); confetti(80); } else sfx.ok();
  }
  function drawDone() {
    $("next").innerHTML = doneBtns.map(([t], i) => `<button class="lv ${i === doneSel ? "sel" : ""}" style="width:auto;padding:0 4vh;font-size:4vh;height:11vh" data-i="${i}">${t}</button>`).join("");
    $("next").querySelectorAll(".lv").forEach((b) => { b.onclick = () => doneBtns[+b.dataset.i][1](); });
  }

  function confetti(n) {
    const box = $("confetti");
    const cols = ["#a855f7", "#ec4899", "#facc15", "#22c55e", "#3b82f6", "#f97316"];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = cols[i % cols.length];
      c.style.animationDuration = `${1.8 + Math.random() * 1.8}s`;
      c.style.animationDelay = `${Math.random() * 0.4}s`;
      box.appendChild(c);
      setTimeout(() => c.remove(), 4500);
    }
  }

  // ------------------------------------------------------------ التحكم (Esc محجوز لواجهة التلفاز)
  addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "Escape") return;
    if (k.startsWith("Arrow") || k === "Enter" || k === " ") e.preventDefault();
    if (screen === "start") {
      const n = LEVELS.length;
      if (k === "ArrowLeft") { sel = (sel + 1) % n; sfx.move(); drawLevels(); }
      else if (k === "ArrowRight") { sel = (sel - 1 + n) % n; sfx.move(); drawLevels(); }
      else if (k === "Enter" || k === " ") startLevel(sel);
    } else if (screen === "quiz") {
      if (locked) return;
      // الشبكة من اليمين إلى اليسار: 0 1 / 2 3
      if (k === "ArrowLeft" && sel % 2 === 0) focusAns(sel + 1);
      else if (k === "ArrowRight" && sel % 2 === 1) focusAns(sel - 1);
      else if (k === "ArrowDown" && sel < 2) focusAns(sel + 2);
      else if (k === "ArrowUp" && sel >= 2) focusAns(sel - 2);
      else if (k === "Enter" || k === " ") choose();
    } else if (screen === "done") {
      if (k === "ArrowLeft") { doneSel = Math.min(doneBtns.length - 1, doneSel + 1); sfx.move(); drawDone(); }
      else if (k === "ArrowRight") { doneSel = Math.max(0, doneSel - 1); sfx.move(); drawDone(); }
      else if (k === "Enter" || k === " ") doneBtns[doneSel][1]();
    }
  });

  // يد التحكم
  let prev = [];
  (function poll() {
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
    if (gp) {
      const map = { 0: "Enter", 12: "ArrowUp", 13: "ArrowDown", 14: "ArrowLeft", 15: "ArrowRight" };
      for (const [i, key] of Object.entries(map)) {
        const p = gp.buttons[i] && gp.buttons[i].pressed;
        if (p && !prev[i]) dispatchEvent(new KeyboardEvent("keydown", { key }));
        prev[i] = p;
      }
    }
    requestAnimationFrame(poll);
  })();

  sel = Math.min(save.unlocked, LEVELS.length) - 1;
  drawLevels();
})();
