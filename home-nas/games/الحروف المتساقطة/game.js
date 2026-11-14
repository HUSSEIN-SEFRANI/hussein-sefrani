// الحروف المتساقطة — تظهر صورة وكلمة، وتتساقط الحروف ببطء، والطفل يحرّك السلة ليلتقط حروف الكلمة بالترتيب.
// الحرف الخطأ يرتدّ فقط مع صوت لطيف. كل جولة 5 كلمات. الكلمات في words.js والرسوم في pics.js.
(() => {
  "use strict";
  const GAME = "الحروف المتساقطة";
  const WORDS = window.WORDS.map(([pic, ar, fr], id) => ({ id, pic, ar, fr }));
  const ROUND = 5;
  const save = K.store("huruf", { used: {}, best: {}, done: { ar: 0, fr: 0 }, lang: "ar", lv: 0 });

  const ABC = {
    ar: "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي".split(" "),
    fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  };
  const ALIF = ["ا", "أ", "إ", "آ"];
  const letters = (lang, w) => Array.from(lang === "fr" ? w.normalize("NFC").toUpperCase() : w);
  const LEVELS = {
    ar: [
      { n: "حرفان", min: 2, max: 2, e: "🐣", speed: 10 },
      { n: "ثلاثة أحرف", min: 3, max: 3, e: "🐥", speed: 11 },
      { n: "أربعة أحرف", min: 4, max: 5, e: "🦅", speed: 12 },
    ],
    fr: [
      { n: "Facile", sub: "3–4 lettres", min: 1, max: 4, e: "🐣", speed: 10 },
      { n: "Moyen", sub: "5 lettres", min: 5, max: 5, e: "🐥", speed: 11 },
      { n: "Difficile", sub: "6–7 lettres", min: 6, max: 7, e: "🦅", speed: 12 },
    ],
  };
  const BG = ["linear-gradient(135deg,#4ade80,#16a34a)", "linear-gradient(135deg,#fbbf24,#f97316)", "linear-gradient(135deg,#f472b6,#9333ea)"];
  const pool = (lang, lv) => WORDS.filter((w) => w[lang] && (() => { const n = letters(lang, w[lang]).length; const L = LEVELS[lang][lv]; return n >= L.min && n <= L.max; })());

  function pickWord(lang, lv) {
    const all = pool(lang, lv), k = lang + lv;
    let used = save.used[k] || [];
    let left = all.filter((w) => !used.includes(w.id));
    if (!left.length) { const lastId = used[used.length - 1]; used = []; left = all.filter((w) => w.id !== lastId); }
    const w = K.pick(left);
    used.push(w.id); save.used[k] = used; save.save();
    return w;
  }

  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const earnStars = (amount, reason) => post("/api/tv/stars/earn", { amount, game: GAME, reason }).then((r) => (r.ok ? r.json() : null)).then((d) => (d && d.added > 0 ? d.added : 0)).catch(() => 0);
  const learn = (topic, ok) => { try { post("/api/tv/learn/result", { game: GAME, topic, ok }).catch(() => {}); } catch {} };
  const say = (t, lang) => K.tts(t, lang, 0.8);

  // أصوات لطيفة
  const boing = () => { K.tone(420, 0.12, "sine", 0.07); K.tone(300, 0.18, "sine", 0.06, 0.09); };
  const catchOk = (i) => { K.tone(600 + i * 120, 0.1, "triangle", 0.12); K.tone(900 + i * 120, 0.14, "sine", 0.08, 0.07); };

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    const card = (lang, big, name, bg) => `<button class="mode f" style="background:${bg}" ${K.act(lang, () => { save.lang = lang; save.save(); K.show(levels, lang); })}>
        <span class="big abc" dir="${lang === "ar" ? "rtl" : "ltr"}">${big}</span><b>${name}</b><small>${save.done[lang] ? `التقطت ${save.done[lang]} كلمة ⭐` : "ابدأ الآن!"}</small></button>`;
    K.paint(`<div class="title"><div class="demo">${demoArt()}</div><div><h1>الحروف المتساقطة</h1><div class="sub">التقط حروف الكلمة بالسلة بالترتيب!</div></div></div>
      <div class="modes">
        ${card("ar", "أ ب ت", "بالعربية", "linear-gradient(135deg,#34d399,#0ea5e9)")}
        ${card("fr", "A B C", "Français", "linear-gradient(135deg,#60a5fa,#a855f7)")}
      </div>${K.HELP}`, save.lang);
  }
  function demoArt() {
    const b = (x, y, c, ch) => `<g transform="translate(${x} ${y})"><circle r="15" fill="${c}" stroke="#fff" stroke-width="3"/><text y="6" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">${ch}</text></g>`;
    return `<svg viewBox="0 0 120 120" class="demo-svg">${b(30, 22, "#f97316", "ق")}${b(84, 40, "#3b82f6", "ط")}${b(56, 62, "#22c55e", "ة")}${basketSvg(60, 104)}</svg>`;
  }
  function basketSvg(x, y) {
    return `<g transform="translate(${x - 30} ${y - 14})"><path d="M2 2 L58 2 L50 26 L10 26 Z" fill="#d97706" stroke="#78350f" stroke-width="2.5"/><path d="M6 10 L54 10 M8 18 L52 18" stroke="#92400e" stroke-width="2"/></g>`;
  }

  function levels(lang) {
    K.begin();
    const Ls = LEVELS[lang];
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">اختر المستوى</h2><span class="pill">${lang === "ar" ? "العربية" : "Français"}</span></div>
      <div class="modes lv">${Ls.map((L, i) => `<button class="mode f" style="background:${BG[i]}" ${K.act("l" + i, () => { save.lv = i; save.save(); K.show(play, lang, i); })}>
        <span class="big emo">${L.e}</span><b dir="auto">${L.n}</b>${L.sub ? `<small dir="ltr">${L.sub}</small>` : ""}
        <span class="mini-boxes">${"<i></i>".repeat(Math.min(L.max, 6))}</span>
        <small class="st">${K.starsHtml(save.best[lang + i] || 0)}</small><small>${pool(lang, i).length} كلمة</small></button>`).join("")}</div>
      <div class="sub tip">حرّك السلة بالأسهم ← → أو بإصبعك</div>
      ${K.HELP}`, "l" + (save.lv || 0));
  }

  // ---------------------------------------------------------------- اللعب
  function play(lang, lv, round) {
    round = round || { n: 0, wrong: 0, firstTry: 0, lv };
    K.begin();
    const L = LEVELS[lang][lv];
    const w = pickWord(lang, lv), word = w[lang], CH = letters(lang, word);
    const dir = lang === "ar" ? "rtl" : "ltr";
    const other = lang === "ar" ? w.fr : w.ar;
    const speed = L.speed + round.n * 0.6; // vh في الثانية، تزداد قليلاً مع كل كلمة
    K.word = CH; // للتجربة الآلية فقط

    const dots = K.range(0, ROUND).map((k) => `<i class="${k < round.n ? "ok" : k === round.n ? "now" : ""}"></i>`).join("");
    K.paint(`<canvas class="field"></canvas>
      <div class="top">${K.backBtn()}<div class="dots">${dots}</div>
        <button class="btn f" ${K.act("say", () => say(word, lang))}><span class="emo">🔊</span></button>
        <span class="pill" dir="ltr">${round.n + 1} / ${ROUND}</span></div>
      <div class="card">
        ${window.drawPic(w.pic)}
        <div class="cw">
          <div class="word" dir="${dir}" lang="${lang}">${K.esc(word)}</div>
          <div class="slots" dir="${dir}">${CH.map((c, i) => `<span class="slot${i === 0 ? " next" : ""}">${K.esc(c)}</span>`).join("")}</div>
        </div>
      </div>
      <div class="cheer"></div>`, "say");

    const $ = (s) => K.app.querySelector(s);
    const slots = [...K.app.querySelectorAll(".slot")];
    const cv = $(".field"), ctx = cv.getContext("2d");
    let W = 0, H = 0, vh = 1, dpr = 1, S = null;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight; vh = H / 100;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (S) S.top = cardBottom();
    }
    resize();
    addEventListener("resize", resize);

    S = { i: 0, wrong: 0, done: false, items: [], sparks: [], spawnT: 0.6, lastLane: -1, sinceNeed: 0, bx: W / 2, target: null, hold: 0, wob: 0, t0: performance.now() };
    const cardBottom = () => { const r = $(".card").getBoundingClientRect(); return r.bottom; };
    S.top = cardBottom();
    K.dbg = S; // للتجربة الآلية فقط
    const R = () => Math.min(5.6 * vh, W * 0.075);           // نصف قطر فقاعة الحرف
    const BW = () => Math.min(19 * vh, W * 0.3);              // عرض السلة
    const BY = () => H - 10 * vh;                             // أعلى السلة
    const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#ec4899", "#a855f7", "#eab308", "#06b6d4", "#ef4444"];
    const need = () => CH[S.i];
    const same = (a, b) => a === b;
    const looksLike = (a, b) => a === b || (lang === "ar" && ALIF.includes(a) && ALIF.includes(b)) || (lang === "fr" && a.normalize("NFD")[0] === b.normalize("NFD")[0]);

    function spawn() {
      const lanes = Math.max(4, Math.min(8, Math.floor(W / (R() * 3))));
      let lane;
      do lane = (Math.random() * lanes) | 0; while (lane === S.lastLane && lanes > 1);
      S.lastLane = lane;
      const onScreen = S.items.some((it) => it.st === "fall" && it.ch === need());
      const wantNeed = !onScreen && (S.sinceNeed >= 1 || Math.random() < 0.55);
      let ch;
      if (wantNeed) { ch = need(); S.sinceNeed = 0; }
      else {
        // أحياناً حرف آخر من الكلمة نفسها ليتعلّم الطفل الترتيب
        const rest = CH.filter((c, k) => k > S.i && !looksLike(c, need()));
        ch = rest.length && Math.random() < 0.3 ? K.pick(rest) : K.pick(ABC[lang].filter((c) => !looksLike(c, need())));
        S.sinceNeed++;
      }
      const lw = W / lanes;
      S.items.push({ ch, x: lw * (lane + 0.5), y: S.top, vx: 0, vy: speed * vh, st: "fall", a: 1, col: K.pick(COLORS), rot: 0, wob: Math.random() * 6 });
    }

    function hit(it) {
      if (it.ch === need() || (lang === "fr" && it.ch === need())) {
        it.st = "gone";
        const slot = slots[S.i];
        slot.classList.add("on"); slot.classList.remove("next");
        catchOk(S.i);
        burst(it.x, BY(), it.col);
        S.i++;
        S.spawnT = Math.min(S.spawnT, 0.35); S.sinceNeed = 9;
        if (S.i < CH.length) { slots[S.i].classList.add("next"); $(".cheer").textContent = K.pick(["أحسنت! 👏", "رائع! 🌟", "صحيح! ✅", "ممتاز! 🎉"]); }
        else win();
      } else {
        it.st = "bounce"; it.vy = -speed * vh * 2.2; it.vx = (Math.random() < 0.5 ? -1 : 1) * 12 * vh;
        S.wrong++; S.wob = 1; boing();
        $(".cheer").textContent = lang === "ar" ? `نبحث عن «${need()}» 🙂` : `Cherche « ${need()} » 🙂`;
      }
    }
    function burst(x, y, col) {
      for (let k = 0; k < 14; k++) { const a = Math.random() * Math.PI * 2, v = (8 + Math.random() * 18) * vh; S.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10 * vh, t: 0.8, col }); }
    }

    function win() {
      S.done = true;
      const ok = S.wrong === 0;
      learn(word, ok);
      round.n++; round.wrong += S.wrong; if (ok) round.firstTry++;
      save.done[lang]++; save.save();
      K.sfx.ok(); K.confetti(14);
      $(".card").classList.add("won");
      $(".cheer").innerHTML = `${ok ? "ممتاز! بدون أي خطأ 🏆" : "أحسنت! جمعت الكلمة 🎉"} ${other ? `<span class="tr" dir="auto">${K.esc(other)}</span>` : ""}`;
      say(word, lang);
      K.later(() => {
        if (round.n < ROUND) { K.top().focus = null; K.replace(play, lang, lv, round); }
        else finish();
      }, 2300);
    }
    function finish() {
      const s = K.starsFor(round.firstTry, ROUND);
      const k = lang + lv;
      if (s > (save.best[k] || 0)) { save.best[k] = s; save.save(); }
      const nextLv = lv + 1 < LEVELS[lang].length ? { label: "المستوى التالي", fn: () => { save.lv = lv + 1; save.save(); K.replace(play, lang, lv + 1); } } : null;
      K.replace(K.resultScreen, {
        s, title: L.n, msg: s === 3 ? "ممتاز! أنت بطل الحروف 🏆" : null,
        extra: `<div class="sub">${ROUND} كلمات · ${round.firstTry} بدون خطأ</div><div class="won-st"></div>`,
        again: () => K.replace(play, lang, lv), next: nextLv,
      });
      earnStars(s === 3 ? 2 : 1, `أنهى ${ROUND} كلمات (${L.n})`).then((n) => { const e = K.app.querySelector(".won-st"); if (n && e) e.textContent = `+${n} ⭐`; });
    }

    // ---------------------------------------------------------------- التحكم
    const keys = { left: false, right: false };
    const pad = { a: false, b: false };
    const setDir = (k, v) => { if (k === "ArrowLeft") keys.left = v; else if (k === "ArrowRight") keys.right = v; };
    const onDown = (e) => { S.target = e.clientX; e.preventDefault(); };
    const onMove = (e) => { if (e.buttons || e.pointerType === "touch" || e.pointerType === "mouse") S.target = e.clientX; };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    let raf = 0, last = performance.now();
    K.mode = {
      key(e) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { if (!e.pad) setDir(e.key, true); else { S.target = null; S.bx += (e.key === "ArrowLeft" ? -1 : 1) * 4 * vh; } return true; }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") return true;
        if (e.key === "Enter" || e.key === " ") { if (!e.pad && K.current() && K.current().dataset.k === "back") return false; say(word, lang); return true; }
        return false; // Backspace: رجوع
      },
      keyup(e) { setDir(e.key, false); },
      poll(pads) {
        if (!pads.length) return false;
        const g = pads[0], b = (i) => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[0] || 0;
        keys.padL = b(14) || ax < -0.4; keys.padR = b(15) || ax > 0.4;
        if (b(0) && !pad.a) { K.audioCtx(); say(word, lang); }
        if (b(1) && !pad.b) { pad.b = true; K.back(); return true; }
        pad.a = b(0); pad.b = b(1);
        return true;
      },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", resize); },
    };

    function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // السلة
      const bw = BW(), mv = 75 * vh * dt;
      const L1 = keys.left || keys.padL, R1 = keys.right || keys.padR;
      if (L1 || R1) { S.target = null; S.bx += (R1 ? 1 : 0) * mv - (L1 ? 1 : 0) * mv; }
      else if (S.target != null) { const d = S.target - S.bx; S.bx += Math.sign(d) * Math.min(Math.abs(d), 110 * vh * dt); }
      S.bx = Math.max(bw / 2, Math.min(W - bw / 2, S.bx));
      S.wob = Math.max(0, S.wob - dt * 2.5);
      // الحروف
      if (!S.done) {
        S.spawnT -= dt;
        const falling = S.items.filter((it) => it.st === "fall").length;
        if (S.spawnT <= 0 && falling < 5) { spawn(); S.spawnT = 14 / speed + Math.random() * 0.4; }
      }
      const r = R(), by = BY();
      for (const it of S.items) {
        if (it.st === "fall") {
          const py = it.y; it.y += it.vy * dt; it.wob += dt * 3;
          if (py + r * 0.4 < by && it.y + r * 0.4 >= by && Math.abs(it.x - S.bx) < bw / 2 + r * 0.2 && !S.done) hit(it);
          if (it.y > H + r) it.st = "gone";
        } else if (it.st === "bounce") {
          it.vy += 60 * vh * dt; it.y += it.vy * dt; it.x += it.vx * dt; it.rot += dt * 6; it.a -= dt * 0.9;
          if (it.a <= 0 || it.y > H + r) it.st = "gone";
        }
        if (S.done && it.st === "fall") { it.a -= dt * 2; if (it.a <= 0) it.st = "gone"; }
      }
      S.items = S.items.filter((it) => it.st !== "gone");
      for (const p of S.sparks) { p.vy += 40 * vh * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
      S.sparks = S.sparks.filter((p) => p.t > 0);
      draw();
      raf = requestAnimationFrame(step);
    }

    const FONT = getComputedStyle(document.body).fontFamily;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const r = R();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const it of S.items) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, it.a);
        ctx.translate(it.x + Math.sin(it.wob) * r * 0.12, it.y);
        ctx.rotate(it.rot);
        ctx.fillStyle = "rgba(30,58,138,.18)"; ctx.beginPath(); ctx.arc(r * 0.08, r * 0.14, r, 0, 7); ctx.fill();
        ctx.fillStyle = it.st === "bounce" ? "#94a3b8" : it.col; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
        ctx.lineWidth = r * 0.12; ctx.strokeStyle = "#fff"; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.14, -0.6, 0, 7); ctx.fill();
        ctx.font = `800 ${r * (lang === "ar" ? 1.15 : 1.1)}px ${FONT}`;
        ctx.lineWidth = r * 0.14; ctx.strokeStyle = "rgba(30,41,59,.55)"; ctx.lineJoin = "round";
        const ty = lang === "ar" ? r * 0.08 : r * 0.06;
        ctx.strokeText(it.ch, 0, ty); ctx.fillStyle = "#fff"; ctx.fillText(it.ch, 0, ty);
        ctx.restore();
      }
      for (const p of S.sparks) { ctx.globalAlpha = Math.max(0, p.t / 0.8); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 0.9 * vh, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      drawBasket();
    }
    function drawBasket() {
      const bw = BW(), bh = 8 * vh, x = S.bx, y = BY();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(S.wob * 14) * 0.08 * S.wob);
      // المقبض
      ctx.lineWidth = 1.1 * vh; ctx.strokeStyle = "#92400e"; ctx.lineCap = "round";
      ctx.beginPath(); ctx.ellipse(0, 0, bw * 0.38, bh * 0.9, 0, Math.PI, 0); ctx.stroke();
      // الجسم
      const top = bw / 2, bot = bw * 0.38;
      ctx.beginPath(); ctx.moveTo(-top, 0); ctx.lineTo(top, 0); ctx.lineTo(bot, bh); ctx.quadraticCurveTo(0, bh * 1.15, -bot, bh); ctx.closePath();
      ctx.fillStyle = "#f59e0b"; ctx.fill(); ctx.lineWidth = 0.5 * vh; ctx.strokeStyle = "#78350f"; ctx.stroke();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = "rgba(146,64,14,.7)"; ctx.lineWidth = 0.35 * vh;
      for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-top, (bh * k) / 3); ctx.lineTo(top, (bh * k) / 3); ctx.stroke(); }
      for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo((k * top) / 4.5, 0); ctx.lineTo((k * bot) / 4.5, bh); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-top - 0.6 * vh, -0.9 * vh, bw + 1.2 * vh, 1.8 * vh, 0.9 * vh) : ctx.rect(-top, -0.9 * vh, bw, 1.8 * vh); ctx.fill();
      // الحرف المطلوب على السلة
      if (!S.done && need()) {
        ctx.font = `800 ${3.6 * vh}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 0.6 * vh; ctx.strokeStyle = "#78350f"; ctx.strokeText(need(), 0, bh * 0.55);
        ctx.fillStyle = "#fff"; ctx.fillText(need(), 0, bh * 0.55);
      }
      ctx.restore();
    }

    raf = requestAnimationFrame(step);
    K.later(() => say(word, lang), 300);
  }

  K.start(home);
})();
