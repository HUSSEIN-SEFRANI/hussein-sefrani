// الكيمياء — تطبيق تعليمي (نجمة عند إنهاء كل درس).
// ثلاثة أقسام: «الدروس» (معلومات مصوّرة ثم أسئلة مع شرح لكل جواب)، و«الجدول الدوري» (الـ118 عنصراً مع اسم كل
// عنصر واستعماله، وتحدّي «جد العنصر»)، و«المختبر» (ركّب الجزيء من ذرّاته حسب صيغته: H₂O، NaCl…).
// الأزرار بالموقع (البند 52): السفلي موافق، الأيمن رجوع، العلوي 🔊 اسمع، الأيسر فعل إضافي (مساعدة، أو حذف ذرّة).
(() => {
  "use strict";
  const GAME = "الكيمياء";
  const D = window.KIMIA;
  const save = K.store("kimia", { best: {}, lab: 0, find: 0 });
  const EL = Object.fromEntries(D.els.map((e) => [e.sym, e]));
  const sub = (f) => String(f).replace(/\d+/g, (d) => [...d].map((x) => "₀₁₂₃₄₅₆₇₈₉"[x]).join(""));
  const parse = (f) => { const o = {}; String(f).replace(/([A-Z][a-z]?)(\d*)/g, (_, e, n) => { o[e] = (o[e] || 0) + (+n || 1); }); return o; };
  const HELP = `<div class="help"><b>الأسهم</b> للتنقل · <b>Enter</b> أو الزر السفلي للاختيار · <b>Backspace</b> أو الزر الأيمن للرجوع · الزر العلوي 🔊 للسماع</div>`;

  // ---------------------------------------------------------------- الصوت والتقرير
  // الصوت العربي لا يقرأ الرموز اللاتينية والأرقام الصغيرة جيداً: تُحذف من النص المنطوق
  const clean = (t) => String(t).replace(/<[^>]+>/g, " ").replace(/[A-Za-z₀-₉+−]+/g, " ").replace(/[\u{1F000}-\u{1FAFF}☀-➿]/gu, " ").replace(/\s+/g, " ").trim();
  const say = (t) => { const c = clean(t); if (c) K.tts(c, "ar", 0.85); };
  const report = (topic, ok) => {
    if (!K.gameInfo()) return;
    fetch("/api/tv/learn/result", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: GAME, topic: String(topic).slice(0, 80), ok }) }).catch(() => {});
  };

  // ---------------------------------------------------------------- الزران الإضافيان في اليد
  // الأيسر (2) والعلوي (3): لكل شاشة فعلها في X.l وX.t (القوائم والموافق والرجوع في kit.js)
  const X = { l: null, t: null };
  const held = [false, false];
  (function loop() {
    const p = K.pads(), on = (i) => p.some((g) => g.buttons[i] && g.buttons[i].pressed);
    const a = on(2), b = on(3);
    if (a && !held[0] && X.l) X.l();
    if (b && !held[1] && X.t) X.t();
    held[0] = a; held[1] = b;
    requestAnimationFrame(loop);
  })();
  const scr = () => { K.begin(); K.onFocus = null; X.l = X.t = null; };

  // ---------------------------------------------------------------- رسوم
  const cell = (e, cls = "") => `<span class="cell c-${e.cat} ${cls}"><small>${e.z}</small><b>${e.sym}</b><i>${e.n}</i></span>`;
  const atomBall = (s, r, x, y) => {
    const e = EL[s], col = ATOM_COL[s] || "#cbd5e1", dark = ["H", "Cl", "S", "He"].includes(s);
    return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
      <circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 3}" fill="#fff" opacity=".45"/>
      <text x="${x}" y="${y + r * 0.32}" text-anchor="middle" font-size="${r * (s.length > 1 ? 0.78 : 0.95)}" font-weight="800" fill="${dark ? "#1e293b" : "#fff"}">${e ? s : ""}</text></g>`;
  };
  const ATOM_COL = { H: "#f8fafc", C: "#374151", N: "#2563eb", O: "#ef4444", Na: "#9333ea", Cl: "#4ade80", S: "#facc15", He: "#e0f2fe" };
  // رسم جزيء: ذرّة وسطى والبقية حولها، أو صف إن كانت كلها من نوع واحد
  function molSVG(f) {
    const o = parse(f), atoms = [];
    for (const k in o) for (let i = 0; i < o[k]; i++) atoms.push(k);
    const centre = ["C", "N", "O", "S", "Cl", "Na"].find((k) => o[k] === 1 && atoms.length > 2);
    let body = "";
    if (centre) {
      const rest = atoms.filter((a, i) => !(a === centre && i === atoms.indexOf(centre)));
      // CO₂ خطّي، والماء منحنٍ، وNH₃ وCH₄ حول الذرة الوسطى بالتساوي
      const n = rest.length, P = Math.PI;
      const angs = n === 2 ? (centre === "C" ? [0, P] : [P / 2 - 0.92, P / 2 + 0.92]) : rest.map((_, i) => P / 2 + (2 * P * i) / n + (n === 4 ? P / 4 : 0));
      const pts = rest.map((a, i) => [a, 150 + 70 * Math.cos(angs[i]), 100 + 62 * Math.sin(angs[i])]);
      body = pts.map(([, x, y]) => `<line x1="150" y1="100" x2="${x}" y2="${y}" stroke="#64748b" stroke-width="7"/>`).join("") +
        atomBall(centre, 36, 150, 100) + pts.map(([a, x, y]) => atomBall(a, a === "H" ? 24 : 32, x, y)).join("");
    } else {
      const n = atoms.length, step = Math.min(78, 240 / Math.max(1, n - 1)), x0 = 150 - (step * (n - 1)) / 2;
      body = (n > 1 ? `<line x1="${x0}" y1="100" x2="${x0 + step * (n - 1)}" y2="100" stroke="#64748b" stroke-width="7"/>` : "") +
        atoms.map((a, i) => atomBall(a, a === "H" ? 26 : 34, x0 + step * i, 100)).join("");
    }
    return `<svg class="mol" viewBox="0 0 300 200" aria-hidden="true">${body}</svg>`;
  }
  const VIS = {
    atom: () => `<svg class="atom" viewBox="0 0 300 260" aria-hidden="true">
      ${[0, 60, 120].map((r) => `<ellipse cx="150" cy="130" rx="120" ry="42" fill="none" stroke="#6366f1" stroke-width="4" transform="rotate(${r} 150 130)"/>`).join("")}
      ${[[132, 120, "#ef4444"], [160, 116, "#94a3b8"], [146, 142, "#94a3b8"], [168, 140, "#ef4444"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="15" fill="${c}" stroke="#fff" stroke-width="2"/>`).join("")}
      <text x="132" y="126" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">+</text><text x="168" y="146" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">+</text>
      ${[[270, 130], [90, 26], [90, 234]].map(([x, y], i) => `<g class="spin s${i}"><circle cx="${x}" cy="${y}" r="11" fill="#3b82f6" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">−</text></g>`).join("")}
      </svg><div class="legend"><span><i style="background:#ef4444"></i>بروتون +</span><span><i style="background:#94a3b8"></i>نيوترون</span><span><i style="background:#3b82f6"></i>إلكترون −</span></div>`,
    table: () => `<div class="ptmini">${D.els.filter((e) => e.r <= 7).map((e) => `<i class="c-${e.cat}" style="grid-column:${e.c};grid-row:${e.r}"></i>`).join("")}</div>
      <div class="legend"><span><i class="c-tr"></i>فلزات</span><span><i class="c-met"></i>أشباه فلزات</span><span><i class="c-non"></i>لافلزات</span><span><i class="c-nob"></i>غازات نبيلة</span></div>`,
    states: () => `<div class="states">${[["صلب", 16, 0, "🧊"], ["سائل", 12, 1, "💧"], ["غاز", 7, 2, "💨"]].map(([n, k, t, em]) =>
      `<div class="st"><div class="box b${t}">${Array.from({ length: k }, (_, i) => `<i style="--x:${t === 0 ? (i % 4) * 22 + 8 : t === 1 ? (i % 4) * 21 + 6 + ((i * 13) % 7) : ((i * 53) % 78) + 6}%;--y:${t === 0 ? 100 - (Math.floor(i / 4) + 1) * 22 : t === 1 ? 80 - Math.floor(i / 4) * 17 - ((i * 7) % 5) : ((i * 41) % 70) + 6}%"></i>`).join("")}</div><b><span class="emo">${em}</span> ${n}</b></div>`).join("")}</div>`,
    ph: () => `<div class="ph">${Array.from({ length: 15 }, (_, i) => `<span style="background:hsl(${i * 19},80%,${i === 7 ? 70 : 58}%)">${i}</span>`).join("")}</div>
      <div class="phl"><span>🍋 حمض</span><span>💧 متعادل</span><span>🧼 قاعدة</span></div>`,
  };
  const visual = (v, e) => {
    if (Array.isArray(v)) return `<div class="chips">${v.map((s) => cell(EL[s])).join("")}</div>`;
    if (typeof v === "string" && v.startsWith("mol:")) return molSVG(v.slice(4)) + `<div class="formula">${sub(v.slice(4))}</div>`;
    if (VIS[v]) return VIS[v]();
    return `<span class="emo huge">${e}</span>`;
  };

  // ---------------------------------------------------------------- القائمة
  function home() {
    scr();
    const n = D.lessons.length, done = D.lessons.filter((_, i) => save.best[i]).length;
    const card = (k, e, t, s, bg, fn) => `<button class="mode f" style="background:${bg}" ${K.act(k, fn)}><span class="big emo">${e}</span><b>${t}</b><small>${s}</small></button>`;
    K.paint(`<div class="title"><span class="mascot emo">🧪</span><div><h1>الكيمياء</h1><div class="sub">اكتشف الذرّات والعناصر والجدول الدوري</div></div></div>
      <div class="chips home">${["H", "He", "C", "N", "O", "Na", "Fe", "Au"].map((s) => cell(EL[s])).join("")}</div>
      <div class="modes">
        ${card("lessons", "📖", "الدروس", `${done} من ${n} دروس`, "linear-gradient(135deg,#34d399,#059669)", () => K.show(lessons))}
        ${card("table", "📋", "الجدول الدوري", "118 عنصراً، وتحدّي «جد العنصر»", "linear-gradient(135deg,#a78bfa,#6d28d9)", () => K.show(table, false))}
        ${card("lab", "⚗️", "المختبر", "ركّب الجزيئات من الذرّات", "linear-gradient(135deg,#fb923c,#dc2626)", () => K.show(lab))}
      </div>${HELP}`, "lessons");
  }

  function lessons() {
    scr();
    K.paint(`<div class="top">${K.backBtn()}<h2>📖 الدروس</h2><span class="pill">⭐ أنهِ الدرس لتربح نجمة</span></div>
      <div class="lessons">${D.lessons.map((L, i) => `<button class="lcard f" style="background:${L.bg}" ${K.act("l" + i, () => K.show(lesson, i, 0))}>
        <span class="num">${i + 1}</span><span class="emo">${L.e}</span><b>${L.n}</b><span class="st">${save.best[i] ? K.starsHtml(save.best[i]) : "&nbsp;"}</span></button>`).join("")}</div>${HELP}`, "l0");
  }

  // ---------------------------------------------------------------- الدرس: معلومات ثم أسئلة
  function lesson(i, s) {
    scr();
    const L = D.lessons[i], S = L.slides[s], last = s === L.slides.length - 1;
    const [e, h, t, v] = S;
    X.t = () => say(h + ". " + t);
    X.l = s > 0 ? () => K.replace(lesson, i, s - 1) : null;
    K.paint(`<div class="top">${K.backBtn()}<span class="pill">${L.e} الدرس ${i + 1}: ${L.n}</span>
        <div class="dots">${L.slides.map((_, k) => `<i class="${k < s ? "ok" : k === s ? "now" : ""}"></i>`).join("")}</div>
        <button class="btn f" ${K.act("say", X.t)}><span class="emo">🔊</span> اسمع</button></div>
      <div class="slide"><div class="vis">${visual(v, e)}</div>
        <div class="txt"><span class="tag">معلومة ${s + 1} من ${L.slides.length}</span><h2><span class="emo">${e}</span> ${h}</h2><p>${t}</p></div></div>
      <div class="nav">
        ${s > 0 ? `<button class="btn f" ${K.act("prev", X.l)}>→ السابق</button>` : ""}
        ${last ? `<button class="btn f go" ${K.act("next", () => K.replace(quiz, i))}>✏️ ابدأ الأسئلة</button>`
               : `<button class="btn f go" ${K.act("next", () => K.replace(lesson, i, s + 1))}>التالي ←</button>`}
      </div>${HELP}`, "next");
    say(h + ". " + t);
  }

  // أسئلة درس الرموز تُصنع من العناصر نفسها
  function genNames() {
    const pool = D.COMMON.map((s) => EL[s]), out = [];
    const used = K.shuffle(pool).slice(0, 7);
    used.forEach((e, k) => {
      const t = k % 3, others = (f) => K.shuffle(pool.filter((x) => x !== e).map(f)).filter((x, j, a) => a.indexOf(x) === j && x !== f(e)).slice(0, 3);
      const why = `${e.n} رمزه ${e.sym}، وعدده الذري ${e.z}.` + (e.use ? ` ${e.use[1]}.` : "");
      if (t === 0) out.push([`ما رمز عنصر ${e.n}؟`, [e.sym, ...others((x) => x.sym)], why, e.sym]);
      else if (t === 1) out.push([`ما اسم العنصر <b class="ltr">${e.sym}</b>؟`, [e.n, ...others((x) => x.n)], why, e.sym]);
      else if (e.use) out.push([`<span class="emo">${e.use[0]}</span> ${e.use[1]}. أيّ عنصر هذا؟`, [e.n, ...others((x) => x.n)], why, e.sym]);
      else out.push([`ما رمز عنصر ${e.n}؟`, [e.sym, ...others((x) => x.sym)], why, e.sym]);
    });
    return out;
  }

  function quiz(i) {
    const L = D.lessons[i];
    const qs = (L.gen ? genNames() : K.shuffle(L.qs).slice(0, 6)).map((q) => {
      const o = K.shuffle(q[1]);
      return { q: q[0], opts: o, ans: o.indexOf(q[1][0]), why: q[2] || "", topic: q[3] || clean(q[0]) };
    });
    const S = { i: 0, score: 0, res: [] };
    ask();
    function ask() {
      scr();
      if (K.top()) K.top().focus = null;
      const Q = qs[S.i];
      let wrong = false, locked = false;
      X.t = () => say(Q.q);
      X.l = () => {     // مساعدة: تشطب خياراً خاطئاً
        if (locked) return;
        const left = [...K.app.querySelectorAll(".opt")].filter((el, j) => j !== Q.ans && !el.dataset.dead);
        if (left.length > 1) { const el = K.pick(left); el.dataset.dead = "1"; el.classList.add("dead"); wrong = true; K.app.querySelector(".cheer").textContent = "💡 حذفنا جواباً خاطئاً"; }
      };
      K.paint(`<div class="top">${K.backBtn()}<span class="pill">${L.e} ${L.n}</span>
          <div class="dots">${qs.map((_, k) => `<i class="${k < S.i ? (S.res[k] ? "ok" : "") : k === S.i ? "now" : ""}"></i>`).join("")}</div>
          <button class="btn f" ${K.act("say", X.t)}><span class="emo">🔊</span> اسمع</button>
          <button class="btn f" ${K.act("help", X.l)}><span class="emo">💡</span> مساعدة</button></div>
        <div class="qbox"><span class="tag">سؤال ${S.i + 1} من ${qs.length}</span><div class="q">${Q.q}</div></div>
        <div class="opts qo ${Q.opts.length > 2 ? "" : "two"}">${Q.opts.map((o, j) => `<button class="opt f ${/^[A-Z][a-z]?$/.test(o) ? "ltr sym" : ""}" ${K.act("o" + j, (el) => choose(j, el))}>${o}</button>`).join("")}</div>
        <div class="cheer"></div><div class="after"></div>${HELP}`, "o0");
      say(Q.q);
      function choose(j, el) {
        if (locked || el.dataset.dead) return;
        const cheer = K.app.querySelector(".cheer");
        if (j !== Q.ans) {
          wrong = true; el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad();
          cheer.textContent = "حاول مرة أخرى 💪";
          return;
        }
        locked = true; el.classList.add("ok"); K.sfx.ok(); K.confetti(8);
        if (!wrong) S.score++;
        S.res[S.i] = !wrong;
        report(Q.topic, !wrong);
        cheer.textContent = wrong ? "صحيح ✅" : K.pick(["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "صحيح! ✅"]);
        const lastQ = S.i === qs.length - 1;
        K.app.querySelector(".after").innerHTML = `${Q.why ? `<div class="why"><span class="emo">💡</span> ${Q.why}</div>` : ""}
          <button class="btn f go" ${K.act("nx", () => { S.i++; if (S.i < qs.length) ask(); else finish(); })}>${lastQ ? "🏁 النتيجة" : "السؤال التالي ←"}</button>`;
        K.focus(K.app.querySelector('[data-k="nx"]'));
        if (Q.why) say(Q.why);
      }
    }
    function finish() {
      const s = K.starsFor(S.score, qs.length);
      save.best[i] = Math.max(save.best[i] || 0, s); save.save();
      K.replace(K.resultScreen, {
        s, score: S.score, total: qs.length, title: `الدرس ${i + 1}: ${L.n}`,
        again: () => K.replace(lesson, i, 0),
        next: i + 1 < D.lessons.length ? { label: "الدرس التالي", fn: () => K.replace(lesson, i + 1, 0) } : null,
      });
    }
  }

  // ---------------------------------------------------------------- الجدول الدوري
  function table(challenge) {
    scr();
    const C = challenge ? { list: K.shuffle(D.COMMON).slice(0, 8).map((s) => EL[s]), i: 0, score: 0, wrong: false, lock: false } : null;
    const info = (e) => {
      const box = K.app.querySelector(".info");
      if (!box) return;
      const where = e.g ? `الدورة ${e.p} · المجموعة ${e.g}` : `الدورة ${e.p} · ${D.CATS[e.cat][0]}`;
      box.innerHTML = `${cell(e, "big")}<div class="itxt"><b>${e.n}</b><span>العدد الذري ${e.z} · ${where}</span>
        <span class="cat"><i class="c-${e.cat}"></i>${D.CATS[e.cat][0]}: ${D.CATS[e.cat][1]}</span>
        ${e.use ? `<span class="use"><span class="emo">${e.use[0]}</span> ${e.use[1]}</span>` : ""}</div>`;
    };
    K.onFocus = (el) => { const k = el.dataset.k || ""; if (k[0] === "e") info(D.els[+k.slice(1) - 1]); };
    X.t = () => { const el = K.current(); if (C) say(`أين ${C.list[C.i].n}؟`); else if (el && el.dataset.k[0] === "e") speakEl(D.els[+el.dataset.k.slice(1) - 1]); };
    const speakEl = (e) => say(`${e.n}. العدد الذري ${e.z}. ${e.use ? e.use[1] : D.CATS[e.cat][1]}`);
    const target = () => (C ? `<span class="emo">🎯</span> أين <b>${C.list[C.i].n}</b>؟ <small>(${C.i + 1} من ${C.list.length})</small>` : "");
    K.paint(`<div class="top">${K.backBtn()}<h2>📋 الجدول الدوري</h2>
        ${C ? `<span class="pill goal">${target()}</span>` : `<button class="btn f go" ${K.act("find", () => K.show(table, true))}><span class="emo">🎯</span> تحدّي: جد العنصر</button>`}
        <button class="btn f" ${K.act("say", X.t)}><span class="emo">🔊</span></button></div>
      <div class="ptable">
        <div class="info"></div>
        ${D.els.map((e) => `<button class="el f c-${e.cat}" style="grid-column:${e.c};grid-row:${e.r}" ${K.act("e" + e.z, (b) => pick(e, b))}><small>${e.z}</small><b>${e.sym}</b></button>`).join("")}
        <span class="el ph c-lan" style="grid-column:3;grid-row:6">57-71</span><span class="el ph c-act" style="grid-column:3;grid-row:7">89-103</span>
      </div>
      <div class="legend wide">${Object.keys(D.CATS).map((k) => `<span><i class="c-${k}"></i>${D.CATS[k][0]}</span>`).join("")}</div>`, "e1");
    if (C) say(`أين ${C.list[0].n}؟`);
    function pick(e, b) {
      if (!C) { speakEl(e); return; }
      if (C.lock) return;
      const t = C.list[C.i], goal = K.app.querySelector(".goal");
      if (e === t) {
        C.lock = true; b.classList.add("hit"); K.sfx.ok(); K.confetti(10);
        if (!C.wrong) C.score++;
        report("جد " + t.sym, !C.wrong);
        say(`أحسنت! هذا ${t.n}`);
        K.later(() => {
          b.classList.remove("hit"); C.i++; C.wrong = false; C.lock = false;
          if (C.i >= C.list.length) return finishFind();
          goal.innerHTML = target(); say(`أين ${C.list[C.i].n}؟`);
        }, 1500);
      } else {
        K.sfx.bad(); b.classList.add("miss"); K.later(() => b.classList.remove("miss"), 500);
        const hint = t.g ? `في الدورة ${t.p} والمجموعة ${t.g}` : `في الصفّين السفليين`;
        if (C.wrong) goal.innerHTML = target() + ` <small class="hint">💡 ${hint}</small>`;
        C.wrong = true;
        say(`هذا ${e.n}. ابحث عن ${t.n}` + (goal.querySelector(".hint") ? "، " + hint : ""));
      }
    }
    function finishFind() {
      const s = K.starsFor(C.score, C.list.length);
      save.find = Math.max(save.find || 0, s); save.save();
      K.replace(K.resultScreen, { s, score: C.score, total: C.list.length, title: "تحدّي: جد العنصر", again: () => K.replace(table, true) });
    }
  }

  // ---------------------------------------------------------------- المختبر
  const PAL = ["H", "C", "N", "O", "Na", "Cl"];
  const words = (n) => (n === 1 ? "ذرّة" : n === 2 ? "ذرّتا" : `${n} ذرّات`);
  const recipe = (f) => Object.entries(parse(f)).map(([k, n]) => `${words(n)} ${EL[k].n}`).join(" و");
  function lab() {
    const k0 = save.lab || 0, N = 6, M = D.mols;
    const list = Array.from({ length: N }, (_, j) => M[(k0 + j) % M.length]);
    const S = { i: 0, score: 0, res: [], atoms: [], wrong: false, done: false, hint: false };
    draw("p0");
    function draw(def) {
      scr();
      const m = list[S.i], cnt = {};
      S.atoms.forEach((a) => (cnt[a] = (cnt[a] || 0) + 1));
      const live = Object.keys(cnt).length ? PAL.filter((a) => cnt[a]).map((a) => a + (cnt[a] > 1 ? cnt[a] : "")).join("") : "";
      X.t = () => say(S.done ? `${m[1]}. ${m[3]}` : `ركّب ${m[1]}: ${recipe(m[0])}`);
      X.l = S.done ? null : () => { S.atoms.pop(); draw(); };
      K.paint(`<div class="top">${K.backBtn()}<span class="pill">⚗️ المختبر</span>
          <div class="dots">${list.map((_, k) => `<i class="${k < S.i ? (S.res[k] ? "ok" : "") : k === S.i ? "now" : ""}"></i>`).join("")}</div>
          <button class="btn f" ${K.act("say", X.t)}><span class="emo">🔊</span> اسمع</button></div>
        <div class="bench">
          <div class="goalcard"><span class="tag">ركّب الجزيء</span><span class="emo gm">${m[2]}</span><b>${m[1]}</b><div class="formula">${sub(m[0])}</div>
            <small>${S.hint || S.done ? recipe(m[0]) : "اقرأ الصيغة: الرمز هو العنصر، والرقم الصغير عدد ذرّاته"}</small></div>
          <div class="flask ${S.done ? "made" : ""}">${S.done ? molSVG(m[0]) + `<div class="why"><span class="emo">💡</span> ${m[3]}</div>`
            : S.atoms.length ? `<svg viewBox="0 0 300 150" class="tray">${S.atoms.map((a, j) => atomBall(a, a === "H" ? 20 : 26, 150 + ((j % 8) - (Math.min(8, S.atoms.length - Math.floor(j / 8) * 8) - 1) / 2) * 36, (S.atoms.length > 8 ? 45 : 75) + Math.floor(j / 8) * 60)).join("")}</svg><div class="formula live">${sub(live)}</div>`
            : `<div class="empty"><span class="emo">🧫</span><br>الوعاء فارغ: اختر الذرّات من الأسفل</div>`}</div>
        </div>
        ${S.done ? `<div class="nav"><button class="btn f go" ${K.act("nx", nextMol)}>${S.i === N - 1 ? "🏁 النتيجة" : "الجزيء التالي ←"}</button></div>`
        : `<div class="pal">${PAL.map((a, j) => `<button class="atomb f" ${K.act("p" + j, () => { if (S.atoms.length < 12) { S.atoms.push(a); K.sfx.tick(); draw(); } })}>
            <svg viewBox="0 0 80 80">${atomBall(a, 34, 40, 40)}</svg><span>${EL[a].n}</span></button>`).join("")}
            <button class="btn f" ${K.act("del", () => { S.atoms.pop(); draw(); })}><span class="emo">⌫</span> احذف ذرّة</button>
            <button class="btn f" ${K.act("hint", () => { S.hint = true; S.wrong = true; draw(); })}><span class="emo">💡</span> مساعدة</button>
            <button class="btn f go" ${K.act("go", react)}><span class="emo">⚗️</span> ركّب</button></div>`}
        <div class="cheer"></div>${HELP}`, def || (S.done ? "nx" : undefined));
      if (def === "p0") X.t();
    }
    function react() {
      const cheer = K.app.querySelector(".cheer"), m = list[S.i];
      if (!S.atoms.length) { cheer.textContent = "اختر بعض الذرّات أولاً 🙂"; K.sfx.bad(); return; }
      const want = parse(m[0]), have = {};
      S.atoms.forEach((a) => (have[a] = (have[a] || 0) + 1));
      const keys = new Set([...Object.keys(want), ...Object.keys(have)]);
      if ([...keys].every((k) => want[k] === have[k])) {
        S.done = true; S.res[S.i] = !S.wrong; if (!S.wrong) S.score++;
        report(m[0], !S.wrong);
        K.sfx.ok(); K.confetti(16);
        K.top().focus = null; draw("nx");
        K.app.querySelector(".cheer").textContent = `أحسنت! صنعت ${m[1]} 🎉`;
        say(`أحسنت! صنعت ${m[1]}. ${m[3]}`);
        return;
      }
      S.wrong = true; K.sfx.bad();
      const extra = Object.keys(have).find((k) => !want[k]), miss = Object.keys(want).find((k) => !have[k]);
      const msg = extra ? `${EL[extra].n} ليس في ${m[1]}` : miss ? `ينقصك ${EL[miss].n}` : "العناصر صحيحة، لكن عدد الذرّات غير صحيح: انظر إلى الرقم الصغير";
      cheer.textContent = "🤔 " + msg;
      say(msg);
      K.app.querySelector(".flask").classList.add("shake");
    }
    function nextMol() {
      S.i++; S.atoms = []; S.wrong = false; S.done = false; S.hint = false;
      if (S.i < N) { K.top().focus = null; return draw("p0"); }
      save.lab = (k0 + 3) % M.length; save.save();   // الجولة التالية تبدأ أبعد قليلاً: جزيئات جديدة
      const s = K.starsFor(S.score, N);
      K.replace(K.resultScreen, { s, score: S.score, total: N, title: "المختبر: تركيب الجزيئات", again: () => K.replace(lab) });
    }
  }

  K.start(home);
})();
