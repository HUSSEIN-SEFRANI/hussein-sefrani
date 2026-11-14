// جدول الضرب — تعلّم الجداول من 1 إلى 10 (و11، 12 مستوى متقدماً) بمصفوفة أشياء تُظهر معنى الضرب،
// تدريب ذكي بالتكرار المتباعد يعيد ما يخطئ فيه الطفل أكثر، تحدّي سرعة 60 ثانية، لوحة تقدّم ملونة، والقسمة كعكس الضرب.
(() => {
  "use strict";
  const GAME = "جدول الضرب";
  // f: حالة كل حقيقة (مفتاحها «أصغر×أكبر»): b صندوق 0..5، d موعد المراجعة، n محاولات، c صحيح، w خطأ
  const save = K.store("mult", { f: {}, dv: {}, tb: {}, best: 0, adv: false });
  const MIN = 60e3, DAY = 864e5;
  const INT = [0, 10 * MIN, DAY, 3 * DAY, 7 * DAY, 16 * DAY];
  const now = () => Date.now();
  const key = (a, b) => Math.min(a, b) + "×" + Math.max(a, b);
  const isAdv = (a, b) => a > 10 || b > 10;
  const ALL = [];
  for (let a = 1; a <= 12; a++) for (let b = a; b <= 12; b++) ALL.push({ a, b, k: key(a, b) });
  const CORE = ALL.filter((f) => !isAdv(f.a, f.b));
  const ADV = ALL.filter((f) => isAdv(f.a, f.b));
  const S = (k) => save.f[k];
  const status = (k) => { const s = S(k); return !s || !s.n ? 0 : s.b >= 3 ? 2 : 1; };
  const R = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);
  const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "بطل! 🏆", "شاطر! 💪", "صحيح! ✅"];

  // ---------------------------------------------------------------- السيرفر (نتجاهل الأخطاء)
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const learnResult = (topic, ok) => { try { post("/api/tv/learn/result", { game: GAME, topic, ok }).catch(() => {}); } catch {} };
  const earn = (amount, reason) => {
    if (!amount) return;
    try {
      post("/api/tv/stars/earn", { amount, game: GAME, reason }).then((r) => (r.ok ? r.json() : null)).then((d) => {
        if (!d || !d.added) return;
        const st = K.app.querySelector(".stars");
        if (st) st.insertAdjacentHTML("afterend", `<div class="won"><span class="emo">⭐</span> +${d.added} في رصيدك</div>`);
      }).catch(() => {});
    } catch {}
  };

  // ---------------------------------------------------------------- التكرار المتباعد
  function record(k, ok) {
    const s = save.f[k] || (save.f[k] = { b: 0, d: 0, n: 0, c: 0, w: 0 });
    s.n++;
    if (ok) { s.c++; if (s.b === 0 || now() >= s.d) { s.b = Math.min(5, s.b + 1); s.d = now() + INT[s.b]; } }
    else { s.w++; s.b = 0; s.d = now(); }
    save.save();
  }
  // كلما زادت أخطاء الطفل في حقيقة صارت أصعب فتأتي أولاً
  const hard = (k) => { const s = S(k); return s ? (s.w * 2 + 1) / (s.c + 1) - s.b * 0.3 : 0; };
  const TR = { 1: 0, 2: 1, 10: 2, 5: 3, 3: 4, 4: 5, 9: 6, 6: 7, 7: 8, 8: 9, 11: 10, 12: 11 };
  const rankNew = (f) => Math.min(save.tb[f.a] ? -20 : TR[f.a], save.tb[f.b] ? -20 : TR[f.b]) * 200 + f.a * f.b;
  const pool = () => (save.adv ? ALL : CORE);
  function smartSet(n = 12) {
    const t = now(), P = pool();
    const seen = P.filter((f) => S(f.k) && S(f.k).n);
    const due = seen.filter((f) => S(f.k).d <= t).sort((x, y) => hard(y.k) - hard(x.k));
    const fresh = P.filter((f) => !S(f.k) || !S(f.k).n).sort((x, y) => rankNew(x) - rankNew(y));
    const later = seen.filter((f) => S(f.k).d > t).sort((x, y) => hard(y.k) - hard(x.k) || S(x.k).b - S(y.k).b);
    const out = due.slice(0, n - Math.min(2, fresh.length));
    out.push(...fresh.slice(0, Math.min(5, n - out.length)));
    for (const f of later) { if (out.length >= n) break; out.push(f); }
    for (const f of due.slice(out.length)) { if (out.length >= n) break; if (!out.includes(f)) out.push(f); }
    return K.shuffle(out).map(mItem);
  }
  const mItem = (f) => { const sw = Math.random() < 0.5; return { a: f.a, b: f.b, k: f.k, x: sw ? f.b : f.a, y: sw ? f.a : f.b }; };

  // ---------------------------------------------------------------- الرسوم (من صنعنا)
  document.body.insertAdjacentHTML("beforeend", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <symbol id="s0" viewBox="0 0 20 20"><path d="M10 6c-2-2-7-1.5-7 4.5 0 4 3 8 5 8 1 0 1.3-.6 2-.6s1 .6 2 .6c2 0 5-4 5-8 0-6-5-6.5-7-4.5z" fill="#ef4444"/><path d="M10 6c0-2 .5-3.5 1.5-4.5" stroke="#78350f" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M11 4c2-2.5 5-2 5.5-1.5-1 2-3.5 2.8-5.5 1.5z" fill="#22c55e"/><ellipse cx="6.5" cy="10" rx="1.2" ry="2.2" fill="#fff" opacity=".45"/></symbol>
    <symbol id="s1" viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 15l-5.2 2.7 1-5.9L1.5 7.7l5.9-.8z" fill="#facc15" stroke="#f59e0b" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8" cy="9" r=".9" fill="#78350f"/><circle cx="12" cy="9" r=".9" fill="#78350f"/><path d="M8.4 11.3q1.6 1.3 3.2 0" stroke="#78350f" stroke-width=".8" fill="none" stroke-linecap="round"/></symbol>
    <symbol id="s2" viewBox="0 0 20 20"><g fill="#f472b6"><circle cx="10" cy="4.5" r="3.6"/><circle cx="15.3" cy="8.4" r="3.6"/><circle cx="13.3" cy="14.6" r="3.6"/><circle cx="6.7" cy="14.6" r="3.6"/><circle cx="4.7" cy="8.4" r="3.6"/></g><circle cx="10" cy="10" r="3.4" fill="#fde047"/></symbol>
    <symbol id="s3" viewBox="0 0 20 20"><path d="M14.5 10L19 5.5v9z" fill="#f97316"/><ellipse cx="9" cy="10" rx="7.5" ry="5.5" fill="#38bdf8"/><path d="M6 6q2 4 0 8" stroke="#0ea5e9" stroke-width="1.2" fill="none"/><circle cx="4.3" cy="9" r="1.3" fill="#fff"/><circle cx="4.1" cy="9" r=".7" fill="#0f172a"/></symbol>
    <symbol id="s4" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#a78bfa"/><circle cx="10" cy="10" r="8" fill="none" stroke="#7c3aed" stroke-width="1.4"/><circle cx="7" cy="7" r="2.4" fill="#fff" opacity=".55"/></symbol>
  </defs></svg>`);
  const symFor = (n) => "s" + (n % 5);
  // مصفوفة: rows صفوف، في كل صف cols أشياء. sums: عدد الصفوف التي يظهر مجموعها التراكمي
  function arr(cols, rows, o = {}) {
    const U = 22, G = 3, SW = o.sumsW ?? 34, W = cols * U + SW, H = rows * U;
    let h = "";
    for (let r = 0; r < rows; r++) {
      const y = r * U, cls = r === o.newRow ? "row new" : "row";
      h += `<g class="${cls}" style="--d:${r === o.newRow ? 0 : 0}s"><rect x="0" y="${y + 0.5}" width="${cols * U}" height="${U - 1}" rx="5" class="band b${r % 2}"/>`;
      for (let c = 0; c < cols; c++) h += `<use href="#${o.sym || "s4"}" x="${c * U + G / 2}" y="${y + G / 2}" width="${U - G}" height="${U - G}"/>`;
      h += `<text x="${cols * U + SW / 2 + 2}" y="${y + U / 2 + 5}" class="sm${r < (o.sums || 0) ? "" : " hide"}${r === rows - 1 ? " last" : ""}">${(r + 1) * cols}</text></g>`;
    }
    return `<svg class="arr" viewBox="0 0 ${W} ${H}" style="--rows:${rows}" dir="ltr">${h}</svg>`;
  }
  const grpTxt = (k) => (k === 1 ? "مجموعة واحدة" : k === 2 ? "مجموعتان" : k <= 10 ? `${k} مجموعات` : `${k} مجموعة`);
  const MASCOT = `<svg class="mascot" viewBox="0 0 120 130" aria-hidden="true">
    <line x1="60" y1="22" x2="60" y2="8" stroke="#475569" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="8" r="7" fill="#f472b6"/>
    <rect x="18" y="22" width="84" height="64" rx="22" fill="#60a5fa" stroke="#1e3a8a" stroke-width="4"/>
    <circle cx="44" cy="50" r="12" fill="#fff"/><circle cx="76" cy="50" r="12" fill="#fff"/><circle cx="46" cy="52" r="6" fill="#1e3a8a"/><circle cx="78" cy="52" r="6" fill="#1e3a8a"/>
    <circle cx="48" cy="49" r="2" fill="#fff"/><circle cx="80" cy="49" r="2" fill="#fff"/>
    <path d="M46 70q14 10 28 0" stroke="#1e3a8a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="30" cy="66" r="5" fill="#fda4af"/><circle cx="90" cy="66" r="5" fill="#fda4af"/>
    <rect x="34" y="88" width="52" height="38" rx="12" fill="#facc15" stroke="#1e3a8a" stroke-width="4"/>
    <path d="M51 98l18 18M69 98l-18 18" stroke="#be185d" stroke-width="6" stroke-linecap="round"/></svg>`;

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin(); K.onFocus = null;
    const m = CORE.filter((f) => status(f.k) === 2).length, l = CORE.filter((f) => status(f.k) === 1).length;
    const card = (k, bg, icon, t, s, fn, tag) => `<button class="mode f" style="background:${bg}" ${K.act(k, fn)}>${tag ? `<i class="tag">${tag}</i>` : ""}<span class="big emo">${icon}</span><b>${t}</b><small>${s}</small></button>`;
    K.paint(`<div class="title">${MASCOT}<div><h1>جدول الضرب</h1>
        <div class="sub">أتقنت <b>${m}</b> من ${CORE.length} · تتعلّم ${l}${save.best ? ` · ⏱️ أفضل سرعة ${save.best}` : ""}</div></div></div>
      <div class="modes">
        ${card("learn", "linear-gradient(135deg,#a78bfa,#7c3aed)", "📖", "تعلّم", "الجداول 1 إلى 12", () => K.show(tables))}
        ${card("smart", "linear-gradient(135deg,#4ade80,#16a34a)", "🧠", "تدريب ذكي", "يعيد ما تخطئ فيه", () => K.show(quiz, { title: "تدريب ذكي", items: smartSet(), adaptive: true, done: smartDone }))}
        ${card("speed", "linear-gradient(135deg,#fb923c,#ea580c)", "⏱️", "تحدّي السرعة", "60 ثانية", () => K.show(speed))}
        ${card("board", "linear-gradient(135deg,#38bdf8,#0369a1)", "🟩", "لوحة التقدّم", "كل الحقائق", () => K.show(board))}
        ${card("div", "linear-gradient(135deg,#f472b6,#be185d)", "➗", "القسمة", "عكس الضرب", () => K.show(quiz, { title: "القسمة", items: divSet(), adaptive: true, done: divDone }), "مستوى إضافي")}
      </div>${K.HELP}`, "learn");
  }

  // ---------------------------------------------------------------- تعلّم: اختيار الجدول
  const tFacts = (n) => K.range(1, n > 10 ? 13 : 11).map((k) => key(n, k));
  function tables() {
    K.begin(); K.onFocus = null;
    const tiles = K.range(1, 13).map((n) => {
      const fs = tFacts(n), m = fs.filter((k) => status(k) === 2).length, l = fs.filter((k) => status(k) === 1).length;
      return `<button class="tb f${n > 10 ? " adv" : ""}${save.tb[n] ? " did" : ""}" ${K.act("t" + n, () => K.show(learn, n))}>
        ${n > 10 ? `<i class="tag">متقدم</i>` : ""}${save.tb[n] ? `<i class="ck">✔</i>` : ""}
        <svg viewBox="0 0 40 40" class="tic"><use href="#${symFor(n)}" width="40" height="40"/></svg>
        <b dir="ltr">× ${n}</b><small>جدول ${n}</small>
        <span class="bar"><i class="m" style="width:${(m / fs.length) * 100}%"></i><i class="l" style="width:${(l / fs.length) * 100}%"></i></span></button>`;
    }).join("");
    const first = K.range(1, 13).find((n) => !save.tb[n]) || 1;
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl"><span class="emo">📖</span> اختر جدولاً</h2><span class="pill">${Object.keys(save.tb).length} / 12 ✔</span></div>
      <div class="tbs">${tiles}</div>${K.HELP}`, "t" + first);
  }

  // ---------------------------------------------------------------- تعلّم: الجدول يمتلئ خطوة خطوة
  function learn(n) {
    const KM = n > 10 ? 12 : 10;
    let k = 1, score = 0;
    step();
    function step() {
      K.begin(); K.onFocus = null;
      const ans = n * k;
      let tries = 0, done = false;
      const opts = K.shuffle([ans, ...K.shuffle(distract(ans, n, k)).slice(0, 2)]);
      const list = K.range(1, KM + 1).map((i) => `<li class="${i < k ? "done" : i === k ? "now" : ""}" dir="ltr"><span>${n} × ${i} =</span> <b>${i < k ? n * i : i === k ? "?" : ""}</b></li>`).join("");
      const add = k <= 6 ? Array(k).fill(n).join(" + ") : "";
      K.paint(`<div class="top">${K.backBtn()}<span class="pill">📖 جدول ${n}</span>
          ${K.voice("ar") ? `<button class="btn f" ${K.act("say", () => K.tts(`${n} ضرب ${k}`))}><span class="emo">🔊</span></button>` : ""}
          <span class="pill">${k} / ${KM}</span></div>
        <div class="lrow"><div class="card lcard">
            <div class="cap">${grpTxt(k)}، في كل مجموعة <b>${n}</b></div>
            <div class="vis" style="--h:${Math.min(38, k * 7)}vh">${arr(n, k, { sym: symFor(n), sums: k - 1, newRow: k - 1 })}</div>
            <div class="eqn" dir="ltr">${n} × ${k} = <span class="hole">?</span></div>
            <div class="hint" hidden></div>
            <div class="opts o3">${opts.map((v, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(v, el))}>${v}</button>`).join("")}</div>
          </div>
          <ol class="tlist">${list}</ol></div>
        <div class="cheer"></div>`, "o0");
      const C = K.app.querySelector(".lcard");
      function choose(v, el) {
        if (done || el.dataset.dead) return;
        const cheer = K.app.querySelector(".cheer");
        if (!tries) { learnResult(`${n}×${k}`, v === ans); record(key(n, k), v === ans); }
        if (v === ans) {
          done = true; if (!tries) score++;
          el.classList.add("ok"); K.sfx.ok(); K.confetti(8);
          cheer.textContent = K.pick(GOOD);
          const h = C.querySelector(".hole"); h.textContent = ans; h.classList.add("got");
          C.querySelectorAll(".sm").forEach((t) => t.classList.remove("hide"));
          const li = K.app.querySelector(".tlist .now");
          li.querySelector("b").textContent = ans; li.classList.add("fill");
          K.later(() => { k++; if (k <= KM) { K.top().focus = null; step(); } else finish(); }, tries ? 2200 : 1400);
          return;
        }
        tries++; el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad();
        C.querySelectorAll(".sm").forEach((t) => t.classList.remove("hide"));
        const hb = C.querySelector(".hint");
        hb.innerHTML = `<span class="emo">💡</span> ${add ? `<bdi dir="ltr">${add}</bdi>` : `أضف ${n} إلى <bdi>${n * (k - 1)}</bdi>`}`; hb.hidden = false;
        cheer.textContent = "عُدّ الصفوف 👆";
      }
    }
    function finish() {
      const first = !save.tb[n];
      save.tb[n] = 1; if (n > 10) save.adv = true; save.save();
      const s = K.starsFor(score, KM);
      const full = `<div class="full" dir="ltr">${K.range(1, KM + 1).map((i) => `<span>${n} × ${i} = <b>${n * i}</b></span>`).join("")}</div>`;
      K.replace(K.resultScreen, { s, score, total: KM, title: "جدول " + n, extra: full, again: () => K.replace(learn, n),
        next: { label: "تدرّب على جدول " + n, fn: () => K.replace(quiz, { title: "جدول " + n, items: K.shuffle(K.range(1, KM + 1)).slice(0, 10).map((i) => mItem({ a: Math.min(n, i), b: Math.max(n, i), k: key(n, i) })), adaptive: true, done: tableDone(n) }) } });
      earn(first ? 3 : 1, "أكمل جدول " + n);
    }
  }

  // ---------------------------------------------------------------- خيارات قريبة من الجواب
  function distract(ans, x, y) {
    const near = [x * (y + 1), x * (y - 1), (x + 1) * y, (x - 1) * y].filter((v) => v > 0 && v !== ans);
    const more = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, x + y].filter((v) => v > 0 && v !== ans);
    const out = [];
    for (const v of [...K.shuffle(near).slice(0, 2), ...K.shuffle(more), ...near]) if (!out.includes(v)) out.push(v);
    return out.slice(0, 3);
  }
  function divDistract(ans, d) {
    const out = [];
    for (const v of K.shuffle([ans + 1, ans - 1, ans + 2, ans - 2, d, ans + 3, ans * 2])) if (v > 0 && v !== ans && !out.includes(v)) out.push(v);
    return out.slice(0, 3);
  }

  // ---------------------------------------------------------------- سؤال بعد سؤال (تدريب، جدول، قسمة)
  // cfg = { title, items:[{x,y,k}|{div:true,p,d,ans,k}], adaptive, done(score,total,wrong[]) -> {extra, stars} }
  function quiz(cfg) {
    const items = cfg.items.slice();
    let q = 0, score = 0;
    const results = [], wrong = [], again = {};
    if (!items.length) return K.replace(home);
    ask();
    function ask() {
      K.begin(); K.onFocus = null;
      const it = items[q], dv = !!it.div;
      const ans = dv ? it.ans : it.x * it.y, topic = dv ? `${it.p}÷${it.d}` : `${it.x}×${it.y}`;
      const opts = K.shuffle([ans, ...(dv ? divDistract(ans, it.d) : distract(ans, it.x, it.y))]);
      let tries = 0, done = false;
      const dots = items.map((_, j) => `<i class="${j < q ? (results[j] ? "ok" : "no") : j === q ? "now" : ""}"></i>`).join("");
      const eq = dv ? `${it.p} ÷ ${it.d} = <span class="hole">?</span>` : `${it.x} × ${it.y} = <span class="hole">?</span>`;
      const fam = dv ? `<div class="fam" dir="ltr"><span class="emo">🔁</span> ${it.d} × <b class="fq">?</b> = ${it.p}</div>` : "";
      K.paint(`<div class="top">${K.backBtn()}<div class="dots">${dots}</div><span class="pill">${cfg.title}</span></div>
        <div class="qrow"><div class="card qcard"><div class="eqn huge" dir="ltr">${eq}</div>${fam}
            <div class="vis" hidden></div><div class="hint" hidden></div></div>
          <div class="opts o4">${opts.map((v, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(v, el))}>${v}</button>`).join("")}</div></div>
        <div class="cheer"></div>`, "o0");
      const C = K.app.querySelector(".qcard");
      function showVis(full) {
        const v = C.querySelector(".vis"), rows = dv ? it.d : it.y, cols = dv ? it.ans : it.x;
        v.style.setProperty("--h", Math.min(34, rows * 6) + "vh");
        v.innerHTML = arr(cols, rows, { sym: symFor(cols + rows), sums: full ? rows : 0, sumsW: full ? 40 : 4 });
        v.hidden = false;
      }
      function choose(v, el) {
        if (done || el.dataset.dead) return;
        const cheer = K.app.querySelector(".cheer");
        if (!tries) {
          learnResult(topic, v === ans);
          if (dv) { const s = save.dv[it.k] || (save.dv[it.k] = { n: 0, w: 0 }); s.n++; if (v !== ans) s.w++; save.save(); }
          else record(it.k, v === ans);
        }
        if (v === ans) {
          done = true; el.classList.add("ok");
          results[q] = !tries; if (!tries) score++;
          K.sfx.ok(); K.confetti(8); cheer.textContent = K.pick(GOOD);
          const h = C.querySelector(".hole"); h.textContent = ans; h.classList.add("got");
          if (dv) { const f = C.querySelector(".fq"); f.textContent = ans; f.classList.add("got"); }
          if (tries) showVis(true);
          K.later(next, tries ? 2600 : 1300);
          return;
        }
        if (!tries) {
          wrong.push(topic);
          // يعود السؤال الخاطئ بعد ثلاثة أسئلة (مرة واحدة)
          if (cfg.adaptive && !again[topic]) { again[topic] = 1; items.splice(Math.min(items.length, q + 4), 0, { ...it }); }
        }
        tries++; el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad();
        showVis(tries > 1);
        const hb = C.querySelector(".hint");
        hb.innerHTML = `<span class="emo">💡</span> ` + (dv
          ? `نوزّع ${it.p} على ${grpTxt(it.d).replace("مجموعة واحدة", "مجموعة")}: كم في كل مجموعة؟`
          : `${grpTxt(it.y)}، في كل مجموعة ${it.x}${tries > 1 ? " — عُدّ بالمجاميع" : ""}`);
        hb.hidden = false;
        cheer.textContent = tries === 1 ? "حاول مرة أخرى 💪" : "انظر إلى الصورة 👆";
      }
    }
    function next() {
      q++;
      if (q < items.length) { K.top().focus = null; ask(); return; }
      const total = cfg.items.length, sc = Math.min(score, total);
      const r = cfg.done ? cfg.done(sc, total, wrong) : {};
      const s = K.starsFor(sc, total);
      K.replace(K.resultScreen, { s, score: sc, total, title: cfg.title, extra: r.extra || "",
        again: r.again || (() => K.replace(quiz, { ...cfg, items: cfg.items })), next: r.next });
      earn(s, r.reason || cfg.title);
    }
  }
  const needHtml = (wrong) => {
    const w = [...new Set(wrong)].slice(0, 6);
    return w.length ? `<div class="need">تحتاج تدريباً: ${w.map((t) => `<bdi dir="ltr">${t}</bdi>`).join(" · ")}</div>` : "";
  };
  function smartDone(score, total, wrong) {
    const m = pool().filter((f) => status(f.k) === 2).length;
    return { extra: `<div class="sub">أتقنت حتى الآن ${m} من ${pool().length}</div>${needHtml(wrong)}`,
      again: () => K.replace(quiz, { title: "تدريب ذكي", items: smartSet(), adaptive: true, done: smartDone }), reason: "تدريب ذكي" };
  }
  const tableDone = (n) => (score, total, wrong) => ({ extra: needHtml(wrong), reason: "تدرّب على جدول " + n,
    next: n < 12 ? { label: "جدول " + (n + 1), fn: () => K.replace(learn, n + 1) } : null });

  // ---------------------------------------------------------------- القسمة
  function divSet(n = 10) {
    const out = [], seen = new Set();
    const add = (d, a) => { const k = d * a + "÷" + d; if (!seen.has(k)) { seen.add(k); out.push({ div: true, p: d * a, d, ans: a, k }); } };
    // ما أخطأ فيه من قبل أولاً
    Object.entries(save.dv).filter(([, s]) => s.w).sort((x, y) => y[1].w / y[1].n - x[1].w / x[1].n).slice(0, 3)
      .forEach(([k]) => { const [p, d] = k.split("÷").map(Number); add(d, p / d); });
    // ثم من حقائق الضرب التي يعرفها، وإلا عشوائياً
    const known = K.shuffle(CORE.filter((f) => status(f.k) && f.a > 1));
    for (const f of known) { if (out.length >= n / 2 + 1) break; Math.random() < 0.5 ? add(f.a, f.b) : add(f.b, f.a); }
    for (let t = 0; out.length < n && t < 300; t++) add(R(2, 10), R(1, 10));
    return K.shuffle(out);
  }
  function divDone(score, total, wrong) {
    return { extra: needHtml(wrong), reason: "القسمة", again: () => K.replace(quiz, { title: "القسمة", items: divSet(), adaptive: true, done: divDone }) };
  }

  // ---------------------------------------------------------------- تحدّي السرعة
  function speed() {
    K.begin(); K.onFocus = null;
    const P = pool().filter((f) => f.a > 1);
    let left = 60, score = 0, over = false, Q = null, lock = false;
    K.paint(`<div class="top">${K.backBtn()}<span class="pill big">⏱️ <b class="js-t">60</b></span><span class="pill big">✅ <b class="js-s">0</b></span></div>
      <div class="qrow"><div class="card qcard"><div class="story">أجب عن أكبر عدد في دقيقة!</div><div class="eqn huge" dir="ltr"><span class="js-q"></span> = <span class="hole">?</span></div><div class="hint" hidden></div></div>
        <div class="opts o4">${[0, 1, 2, 3].map((j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(j, el))}></button>`).join("")}</div></div><div class="cheer"></div>`, "o0");
    const $ = (s) => K.app.querySelector(s), btns = [...K.app.querySelectorAll(".o4 .opt")];
    let opts = [];
    function newQ() {
      let f; do { f = mItem(K.pick(P)); } while (Q && f.k === Q.k && P.length > 1);
      Q = f; Q.ans = f.x * f.y;
      opts = K.shuffle([Q.ans, ...distract(Q.ans, f.x, f.y)]);
      $(".js-q").textContent = `${f.x} × ${f.y}`; $(".hole").textContent = "?";
      btns.forEach((b, j) => { b.textContent = opts[j]; b.className = "opt f" + (b === K.current() ? " sel" : ""); });
      lock = false;
    }
    newQ();
    function choose(j, el) {
      if (over || lock) return;
      const ok = opts[j] === Q.ans;
      learnResult(`${Q.x}×${Q.y}`, ok); record(Q.k, ok);
      const hb = $(".hint");
      if (ok) { score++; $(".js-s").textContent = score; K.sfx.ok(); hb.hidden = true; newQ(); return; }
      lock = true; K.sfx.bad(); el.classList.add("bad");
      btns[opts.indexOf(Q.ans)].classList.add("ok");
      hb.innerHTML = `<bdi dir="ltr">${Q.x} × ${Q.y} = <b>${Q.ans}</b></bdi>`; hb.hidden = false;
      K.later(newQ, 900);
    }
    K.every(() => {
      if (over) return;
      left--; $(".js-t").textContent = left;
      if (left <= 10) $(".js-t").parentNode.classList.add("warn");
      if (left <= 0) end();
    }, 1000);
    function end() {
      over = true;
      const s = score >= 20 ? 3 : score >= 12 ? 2 : 1, rec = score > (save.best || 0);
      save.best = Math.max(save.best || 0, score); save.save();
      K.replace(K.resultScreen, { s, title: "تحدّي السرعة", msg: rec && score ? "رقم قياسي جديد! 🏆" : undefined,
        extra: `<div class="sub">${score} إجابة صحيحة في دقيقة · أفضل نتيجة: ${save.best}</div>`, again: () => K.replace(speed) });
      if (score >= 5) earn(s, "تحدّي السرعة: " + score);
    }
  }

  // ---------------------------------------------------------------- لوحة التقدّم
  function board() {
    K.begin();
    const cnt = (L, s) => L.filter((f) => status(f.k) === s).length;
    let cells = `<span class="hd"></span>` + K.range(1, 13).map((c) => `<span class="hd${c > 10 ? " a" : ""}">${c}</span>`).join("");
    for (let r = 1; r <= 12; r++) {
      cells += `<span class="hd${r > 10 ? " a" : ""}">${r}</span>`;
      for (let c = 1; c <= 12; c++) {
        const k = key(r, c), s = S(k), cls = ["c", "s" + status(k), isAdv(r, c) ? "adv" : "", s && s.w > s.c ? "hard" : ""].join(" ");
        cells += `<button class="${cls} f" data-r="${r}" data-c="${c}" ${K.act(`c${r}-${c}`, () => { K.sfx.pop(); K.tts(`${r} ضرب ${c} يساوي ${r * c}`); })}>${r * c}</button>`;
      }
    }
    K.onFocus = (el) => {
      if (!el.dataset.r) return;
      const r = +el.dataset.r, c = +el.dataset.c, k = key(r, c), s = S(k), st = status(k);
      const side = K.app.querySelector(".side");
      if (!side) return;
      side.innerHTML = `<div class="eqn" dir="ltr">${r} × ${c} = <b>${r * c}</b></div>
        <span class="chip s${st}">${["لم يبدأ", "يتعلّمها", "أتقنها"][st]}${isAdv(r, c) ? " · متقدم" : ""}</span>
        <div class="vis" style="--h:${Math.min(30, c * 3.2 + 4)}vh">${arr(r, c, { sym: symFor(r + c), sums: 0, sumsW: 2 })}</div>
        <div class="stat">${s && s.n ? `صحيح ${s.c} من ${s.n}` : "لم تُسأل بعد"}</div>`;
    };
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl"><span class="emo">🟩</span> لوحة التقدّم</h2>
        <div class="legend"><span class="chip s2">أتقنها ${cnt(CORE, 2)}</span><span class="chip s1">يتعلّمها ${cnt(CORE, 1)}</span><span class="chip s0">لم يبدأ ${cnt(CORE, 0)}</span>
        <span class="chip adv">متقدم ${cnt(ADV, 2)} / ${ADV.length}</span></div></div>
      <div class="brow"><div class="grid12" dir="ltr">${cells}</div><div class="card side"></div></div>${K.HELP}`, "c1-1");
  }

  K.start(home);
})();
