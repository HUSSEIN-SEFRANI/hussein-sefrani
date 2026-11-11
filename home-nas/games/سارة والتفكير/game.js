// سارة والتفكير — اختاري الترجمة الفرنسية الصحيحة أو الجواب الصحيح. 5 مستويات، 10 أسئلة في كل جولة من بنك أكبر، والأسئلة الجديدة تظهر أولاً.
// أول خطأ في الجولة مسموح، وبعده كل خطأ يخصم نقطة. كل 5 إجابات صحيحة متتالية = نجمة لرصيد الطفل. ولكل جولة 3 وسائل مساعدة تُستعمل مرة واحدة.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const LEVELS = window.LEVELS;
  const PER_LEVEL = 10;
  const STORE = "sara-thinking";

  // ------------------------------------------------------------ الحفظ
  let save = { unlocked: 1, best: {}, seen: {}, pending: 0 };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch (e) { /* */ }
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) { /* */ } };

  // ------------------------------------------------------------ نجوم الحساب
  // كل 5 إجابات صحيحة متتالية = نجمة في رصيد الطفل على السيرفر.
  // إن لم يكن السيرفر يقبلها بعد (أو لا اتصال) تبقى محفوظة وتُرسل لاحقاً.
  const STREAK = 5;
  let sending = false;
  async function flushStars() {
    if (sending || !(save.pending > 0)) return;
    sending = true;
    try {
      const amount = save.pending;
      const r = await fetch("/api/tv/stars/earn", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, game: "سارة والتفكير", reason: `سارة والتفكير: ${amount * STREAK} إجابات صحيحة متتالية` }),
      });
      if (r.ok) { save.pending = Math.max(0, save.pending - amount); persist(); }
    } catch (e) { /* لاحقاً */ }
    sending = false;
  }
  flushStars();

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
  let level = 0, queue = [], qi = 0, score = 0, right = 0, wrong = 0, streak = 0, earned = 0, answers = [], locked = false;
  // وسائل المساعدة: مرة واحدة لكل جولة
  const LIFE = [["fifty", "✂️ حذف إجابتين"], ["skip", "⏭️ تخطّي السؤال"], ["hint", "💡 معلومة مساعدة"]];
  let helps = {}, zone = "ans", hsel = 0, gone = new Set();
  const qkey = (q) => q.ar + "|" + (Array.isArray(q.options[0]) ? q.options[0][0] : q.options[0]);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function startLevel(i) {
    if (i + 1 > save.unlocked) { sfx.bad(); return; }
    level = i; qi = 0; score = 0; right = 0; wrong = 0; streak = 0; earned = 0;
    helps = { fifty: true, skip: true, hint: true };
    // الأسئلة التي لم تظهر بعد أولاً؛ وحين تنتهي كلها تبدأ دورة جديدة
    const key = qkey;
    const seen = new Set((save.seen && save.seen[i]) || []);
    const items = LEVELS[i].items;
    const fresh = shuffle(items.filter((q) => !seen.has(key(q))));
    const old = shuffle(items.filter((q) => seen.has(key(q))));
    queue = fresh.concat(old).slice(0, PER_LEVEL);
    save.seen = save.seen || {};
    save.seen[i] = fresh.length >= PER_LEVEL ? [...seen, ...queue.map(key)] : queue.map(key);
    persist();
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
    gone = new Set(); zone = "ans";
    drawLife();
    sel = 0; focusAns(0, true);
    if (q.fr) setTimeout(() => say(q.fr), 300);
  }

  // ------------------------------------------------------------ وسائل المساعدة
  function drawLife() {
    $("life").innerHTML = LIFE.map(([id, t], i) => `<button class="life ${helps[id] ? "" : "used"} ${zone === "help" && i === hsel ? "sel" : ""}" data-i="${i}">${t}</button>`).join("");
    $("life").querySelectorAll(".life").forEach((b) => { b.onclick = () => { if (!locked) useLife(+b.dataset.i); }; });
  }
  function useLife(i) {
    const id = LIFE[i][0];
    if (!helps[id]) { sfx.bad(); return; }
    helps[id] = false;
    sfx.move();
    if (id === "fifty") {
      const bad = shuffle(answers.map((a, k) => k).filter((k) => !answers[k].ok)).slice(0, 2);
      bad.forEach((k) => { gone.add(k); $("answers").children[k].classList.add("gone"); });
      $("fb").innerHTML = `<span class="hint">✂️ حذفنا إجابتين خاطئتين</span>`;
    } else if (id === "skip") {
      // سؤال بديل من البنك لم يظهر في هذه الجولة، والأفضل أن يكون جديداً
      const inQ = new Set(queue.map(qkey));
      const seen = new Set(save.seen[level] || []);
      const pool = LEVELS[level].items.filter((q) => !inQ.has(qkey(q)));
      const fresh = pool.filter((q) => !seen.has(qkey(q)));
      const pick = shuffle(fresh.length ? fresh : pool)[0];
      if (pick) {
        queue[qi] = pick;
        save.seen[level] = [...(save.seen[level] || []), qkey(pick)];
        persist();
      }
      ask();
      $("fb").innerHTML = `<span class="hint">⏭️ هذا سؤال جديد</span>`;
      return;
    } else if (id === "hint") {
      $("fb").innerHTML = `<span class="hint">${esc(hintFor(queue[qi]))}</span>`;
    }
    zone = "ans";
    drawLife();
    focusAns(firstVisible(), true);
  }
  // تلميح تلقائي من الجواب الصحيح (أو q.hint إن كُتب للسؤال)
  function hintFor(q) {
    if (q.hint) return "💡 " + q.hint;
    const ok = answers.find((a) => a.ok), others = answers.filter((a) => !a.ok);
    const words = (t) => t.toLowerCase().replace(/[?!.,]/g, " ").split(/[\s']+/).filter(Boolean);
    const okWords = ok.fr.replace(/[?!.,]/g, " ").split(/[\s']+/).filter((w) => w.length > 2);
    if (okWords.length >= 3) {
      const used = new Set(others.flatMap((a) => words(a.fr)));
      const uniq = okWords.filter((w) => !used.has(w.toLowerCase())).sort((a, b) => b.length - a.length)[0];
      if (uniq) return `💡 في الجواب الصحيح كلمة «${uniq}»`;
    }
    const strip = (t) => t.replace(/^(le |la |les |l'|un |une |des |du |de l'|de )/i, "");
    const w = strip(ok.fr), ow = others.map((a) => strip(a.fr).toLowerCase());
    let n = 1;
    while (n < 4 && ow.some((o) => o.startsWith(w.slice(0, n).toLowerCase()))) n++;
    let t = `💡 الجواب يبدأ بـ «${w.slice(0, n)}»`;
    if (ok.ar) t += ` وبالعربية بحرف «${ok.ar.replace(/^ال/, "").charAt(0)}»`;
    return t;
  }
  const firstVisible = () => [0, 1, 2, 3].find((k) => !gone.has(k));
  function moveAns(k) {
    const row = sel >> 1, col = sel & 1;
    let t = -1;
    if (k === "ArrowLeft" && col === 0) t = sel + 1;
    else if (k === "ArrowRight" && col === 1) t = sel - 1;
    else if (k === "ArrowDown" && row === 0) t = gone.has(sel + 2) ? (gone.has(2 + (1 - col)) ? -2 : 2 + (1 - col)) : sel + 2;
    else if (k === "ArrowUp" && row === 1) t = gone.has(sel - 2) ? (gone.has(1 - col) ? -1 : 1 - col) : sel - 2;
    if ((k === "ArrowDown" && (row === 1 || t === -2))) { enterHelp(); return; }
    if (t >= 0 && !gone.has(t)) focusAns(t);
  }
  function enterHelp() {
    const avail = LIFE.map((l, i) => i).filter((i) => helps[LIFE[i][0]]);
    if (!avail.length) return;
    if (!helps[LIFE[hsel][0]]) hsel = avail[0];
    zone = "help"; sfx.move();
    $("answers").querySelectorAll(".ans").forEach((b) => b.classList.remove("sel"));
    drawLife();
  }
  function moveHelp(d) {
    for (let i = hsel + d; i >= 0 && i < LIFE.length; i += d) if (helps[LIFE[i][0]]) { hsel = i; sfx.move(); drawLife(); return; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function focusAns(k, silent) {
    sel = k; zone = "ans"; drawLife();
    $("answers").querySelectorAll(".ans").forEach((b, i) => b.classList.toggle("sel", i === k));
    if (!silent) { sfx.move(); say(answers[k].fr); }
  }

  function choose() {
    if (locked) return;
    locked = true;
    const btns = $("answers").querySelectorAll(".ans");
    const a = answers[sel];
    if (a.ok) {
      score++; right++; streak++;
      btns[sel].classList.add("ok");
      $("fb").textContent = ["أحسنتِ يا سارة! Bravo !", "رائع! Super !", "ممتاز! Excellent !", "شاطرة! Très bien !"][Math.floor(Math.random() * 4)];
      sfx.ok(); confetti(24);
      if (streak % STREAK === 0) {
        earned++; save.pending = (save.pending || 0) + 1; persist(); flushStars();
        $("fb").textContent = `🌟 ${STREAK} إجابات صحيحة متتالية! +1 نجمة في رصيدك`;
        setTimeout(() => { sfx.win(); confetti(70); }, 250);
      }
      say(a.fr);
    } else {
      btns[sel].classList.add("bad");
      btns[answers.findIndex((x) => x.ok)].classList.add("ok");
      wrong++; streak = 0;
      // أول خطأ في الجولة مسموح بلا خصم
      if (wrong === 1) $("fb").textContent = "لا بأس، هذا خطؤك المسموح! الصحيح باللون الأخضر";
      else { if (score > 0) score--; $("fb").textContent = "خُصمت نقطة! الجواب الصحيح باللون الأخضر"; }
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
    const stars = score >= 9 ? 3 : score >= 7 ? 2 : score >= 4 ? 1 : 0;
    save.best[level] = Math.max(save.best[level] || 0, stars);
    const passed = score >= 4;
    if (passed && level + 2 > save.unlocked && level + 1 < LEVELS.length) save.unlocked = level + 2;
    persist();
    $("stars").innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? "" : "off"}" style="animation-delay:${i * 0.2}s">⭐</span>`).join("");
    $("dt").textContent = stars === 3 ? "بطلة التفكير!" : passed ? "أحسنتِ يا سارة!" : "محاولة جميلة!";
    $("ds").textContent = `نقاطك ${score} من ${queue.length} (صحيحة ${right}، خاطئة ${wrong})` + (earned ? ` — ربحتِ ${earned} 🌟 لرصيدك` : "") + (passed && level + 1 < LEVELS.length ? " — فُتح المستوى التالي 🎉" : !passed ? " — تحتاجين 4 نقاط لفتح المستوى التالي" : " — أنهيتِ كل المستويات! 🏆");
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
      if (zone === "help") {
        // صف المساعدة من اليمين إلى اليسار
        if (k === "ArrowLeft") moveHelp(1);
        else if (k === "ArrowRight") moveHelp(-1);
        else if (k === "ArrowUp") { sfx.move(); focusAns([2, 3, 0, 1].find((x) => !gone.has(x)), true); }
        else if (k === "Enter" || k === " ") useLife(hsel);
        return;
      }
      // الشبكة من اليمين إلى اليسار: 0 1 / 2 3، وتحتها صف المساعدة
      if (k.startsWith("Arrow")) moveAns(k);
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
