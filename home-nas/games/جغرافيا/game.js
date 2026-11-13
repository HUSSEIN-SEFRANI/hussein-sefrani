// جغرافيا — أعلام الدول: اضغط على العلم لتعرف اسم الدولة وعاصمتها ولغتها وعدد سكانها وعملتها، ثم «اختبر نفسك».
(() => {
  "use strict";
  const ALL = window.COUNTRIES.slice().sort((a, b) => a.n.localeCompare(b.n, "ar")), CONT = window.CONTINENTS;
  const save = K.store("geo", { seen: {}, best: 0, mapBest: {} });
  const flag = (code) => String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  const fmtPop = (m) => {
    if (m >= 1000) return `نحو ${(m / 1000).toLocaleString("ar-SY-u-nu-latn", { maximumFractionDigits: 2 })} مليار نسمة`;
    if (m >= 1) return `نحو ${m.toLocaleString("ar-SY-u-nu-latn", { maximumFractionDigits: 1 })} مليون نسمة`;
    if (m >= 0.001) return `نحو ${Math.round(m * 1000).toLocaleString("ar-SY-u-nu-latn")} ألف نسمة`;
    return `نحو ${Math.round(m * 1e6)} نسمة فقط`;
  };
  const GROUPS = [
    { id: "arab", name: "الدول العربية", icon: "🕌", bg: "linear-gradient(135deg,#22c55e,#15803d)", list: ALL.filter((c) => c.arab) },
    ...Object.entries(CONT).map(([id, [name, icon]], k) => ({ id, name, icon, list: ALL.filter((c) => c.c === id),
      bg: ["linear-gradient(135deg,#f59e0b,#b45309)", "linear-gradient(135deg,#f43f5e,#be123c)", "linear-gradient(135deg,#3b82f6,#1d4ed8)",
        "linear-gradient(135deg,#a855f7,#7e22ce)", "linear-gradient(135deg,#14b8a6,#0f766e)", "linear-gradient(135deg,#06b6d4,#0e7490)"][k] })),
    { id: "all", name: "كل الدول", icon: "🗺️", bg: "linear-gradient(135deg,#64748b,#334155)", list: ALL },
  ];
  // إبقاء العنصر المختار ظاهراً في القوائم الطويلة
  K.onFocus = (el) => {
    const sc = el.closest(".scroll"); if (sc) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (el.dataset.code && K.onCard) K.onCard(el.dataset.code);
  };
  const BY = Object.fromEntries(ALL.map((c) => [c.code, c]));

  function home() {
    K.begin();
    const seen = Object.keys(save.seen).length;
    K.paint(`<div class="title"><span class="mascot emo">🌍</span><div><h1>جغرافيا</h1><div class="sub">اضغط على علم لتعرف الدولة · شاهدت ${seen} من ${ALL.length} دولة</div></div></div>
      <div class="groups g5">${GROUPS.map((g) => `<button class="grpb f" style="background:${g.bg}" ${K.act(g.id, () => K.show(flagsScreen, g.id))}>
          <span class="emo">${g.icon}</span><b>${g.name}</b><small>${g.list.length} دولة</small></button>`).join("")}
        <button class="grpb f" style="background:linear-gradient(135deg,#facc15,#ca8a04)" ${K.act("quiz", () => K.show(K.quizScreen, quiz()))}>
          <span class="emo">🧠</span><b>اختبر نفسك</b><small>${save.best ? `أفضل نتيجة: ${save.best} / 10` : "الأعلام والعواصم"}</small></button>
        <button class="grpb f" style="background:linear-gradient(135deg,#0ea5e9,#0369a1)" ${K.act("map", () => K.show(mapMenu))}>
          <span class="emo">🗺️</span><b>أين الدولة؟</b><small>على الخريطة</small></button></div>
      ${K.HELP}`, "arab");
  }

  function flagsScreen(gid) {
    K.begin();
    const g = GROUPS.find((x) => x.id === gid);
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">${g.icon}</span> ${g.name}</h2><span class="pill">${g.list.length}</span></div>
      <div class="scroll"><div class="flags">${g.list.map((c, i) => `<button class="fl f${save.seen[c.code] ? " seen" : ""}" ${K.act("c" + i, () => K.show(countryScreen, gid, i))}>
        <span class="emo">${flag(c.code)}</span><b>${c.n}</b></button>`).join("")}</div></div>`, "c0");
  }

  function countryScreen(gid, i) {
    K.begin();
    const g = GROUPS.find((x) => x.id === gid), c = g.list[i];
    save.seen[c.code] = 1; save.save();
    const row = (icon, label, text) => `<div class="row"><span class="ri emo">${icon}</span><div><b>${label}</b><p>${text}</p></div></div>`;
    const go = (d) => () => K.replace(countryScreen, gid, (i + d + g.list.length) % g.list.length);
    K.paint(`<div class="top">${K.backBtn()}<span class="pill"><span class="emo">${g.icon}</span> ${g.name}</span><span class="pill">${i + 1} / ${g.list.length}</span></div>
      <div class="page">
        <div class="hero"><span class="bigflag emo">${flag(c.code)}</span><h2>${c.n}</h2></div>
        <div class="info">
          ${row("🏛️", "العاصمة", c.cap)}
          ${row("🗣️", c.lang.includes(" و") || c.lang.includes("،") ? "اللغات الرسمية" : "اللغة الرسمية", c.lang)}
          ${row("👨‍👩‍👧", "عدد السكان", fmtPop(c.pop))}
          ${row(CONT[c.c][1], "القارة", CONT[c.c][0] + (c.arab ? " · من الدول العربية" : ""))}
          ${row("💰", "العملة", c.cur)}
        </div>
      </div>
      <div class="nav"><button class="btn f" ${K.act("prev", go(-1))}>→ السابق</button><button class="btn f" ${K.act("onmap", () => K.show(mapView, c.code))}><span class="emo">🗺️</span> على الخريطة</button><button class="btn f go" ${K.act("next", go(1))}>التالي ←</button></div>`, "next");
  }

  // ---------------------------------------------------------------- اختبر نفسك
  function quiz() {
    return {
      title: "اختبر نفسك",
      make() {
        const qs = [], used = new Set();
        // نبدأ بالدول المعروفة أكثر: العربية ثم من شاهدها الطفل ثم الكبيرة
        const known = ALL.filter((c) => c.arab || save.seen[c.code] || c.pop > 30);
        const plan = K.shuffle(["flag", "flag", "flag", "flag", "cap", "cap", "cap", "pick", "pick", "pick"]);
        for (const t of plan) {
          let c, n = 0;
          do c = K.pick(known); while (used.has(c.code) && ++n < 80);
          used.add(c.code);
          const near = ALL.filter((x) => x.c === c.c || (c.arab && x.arab));
          if (t === "flag") {
            const o = K.options(c, near, 3, (a, b) => a.code === b.code);
            qs.push({ prompt: `<span class="qflag emo">${flag(c.code)}</span><div class="q">علم أي دولة هذا؟</div>`, opts: o.map((x) => x.n), answer: o.indexOf(c), optsCls: "txt" });
          } else if (t === "cap") {
            const o = K.options(c, near, 3, (a, b) => a.cap === b.cap);
            qs.push({ prompt: `<span class="qflag sm emo">${flag(c.code)}</span><div class="q">ما عاصمة ${c.n}؟</div>`, opts: o.map((x) => x.cap.replace(/\s*\(.*\)/, "")), answer: o.indexOf(c), optsCls: "txt" });
          } else {
            const o = K.options(c, near, 3, (a, b) => a.code === b.code);
            qs.push({ prompt: `<div class="q big">أين علم ${c.n}؟</div>`, opts: o.map((x) => `<span class="emo">${flag(x.code)}</span>`), answer: o.indexOf(c), optsCls: "flagopts" });
          }
        }
        return qs;
      },
      done(score) { if (score > (save.best || 0)) { save.best = score; save.save(); } },
    };
  }

  // ---------------------------------------------------------------- الخريطة
  const M = window.MAP, NS = "http://www.w3.org/2000/svg";
  let svg = null, vb = [0, 0, M.W, M.H], flyId = 0;
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  // الخريطة تُبنى مرة واحدة ثم تُنقل بين الشاشات
  function mapEl() {
    if (!svg) {
      svg = mk("svg", { class: "wmap", viewBox: vb.join(" "), preserveAspectRatio: "xMidYMid meet" });
      mk("rect", { x: -M.W, y: -M.H, width: M.W * 3, height: M.H * 3, class: "sea" }, svg);
      mk("path", { d: M.land, class: "land other" }, svg);
      for (const [code, c] of Object.entries(M.c)) mk("path", { d: c.d, class: "land", id: "m-" + code }, svg);
      mk("g", { class: "marks" }, svg);
    }
    svg.querySelectorAll(".tgt,.wrong").forEach((e) => e.classList.remove("tgt", "wrong"));
    svg.querySelector(".marks").innerHTML = "";
    return svg;
  }
  // إطار يعرض الدولة مع ما حولها، بنفس نسبة صندوق الخريطة
  function viewFor(code, box) {
    const [x, y, w, h] = M.c[code].b, asp = box.width / box.height || 1.5;
    const pad = (v) => v + Math.max(v * 0.4, 150); // هامش يُظهر الدول المجاورة
    let vw = Math.max(pad(w), pad(h) * asp, 300), vh = vw / asp;
    if (vw > M.W) { vw = M.W; vh = vw / asp; }
    const cx = Math.min(Math.max(x + w / 2, vw / 2), M.W - vw / 2), cy = Math.min(Math.max(y + h / 2, vh / 2 - 40), M.H - vh / 2 + 40);
    return [cx - vw / 2, cy - vh / 2, vw, vh];
  }
  function fly(to, ms = 900) {
    const from = vb.slice(), id = ++flyId, t0 = performance.now();
    const step = (t) => {
      if (id !== flyId) return;
      const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      vb = from.map((v, i) => v + (to[i] - v) * e);
      svg.setAttribute("viewBox", vb.join(" "));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const center = (code) => { const [x, y, w, h] = M.c[code].b; return [x + w / 2, y + h / 2]; };
  const tiny = (code, view) => M.c[code].s || Math.max(M.c[code].b[2], M.c[code].b[3]) < view[2] * 0.08;
  // دائرة حول الدول الصغيرة حتى يراها الطفل
  function ring(code, view, cls = "") {
    const [cx, cy] = center(code), r = Math.max(view[2] * 0.035, M.c[code].b[2] * 0.7);
    if (tiny(code, view)) mk("circle", { cx, cy, r, class: "ring " + cls }, svg.querySelector(".marks"));
  }
  function label(code, view, cls = "") {
    const [cx, cy] = center(code), fs = view[2] * 0.045, ty = tiny(code, view) ? cy - view[2] * 0.05 : cy;
    const t = mk("text", { x: cx, y: ty, "font-size": fs, class: "lbl " + cls, "text-anchor": "middle", "dominant-baseline": "middle" }, svg.querySelector(".marks"));
    t.textContent = BY[code].n;
  }
  function show(code, box, label_) {
    const s = mapEl(), v = viewFor(code, box);
    s.getElementById("m-" + code).classList.add("tgt");
    ring(code, v);
    if (label_) label(code, v);
    fly(v);
  }

  // بطاقة معلومات صغيرة للدولة
  const card = (c) => `<div class="mc-h"><span class="emo">${flag(c.code)}</span><b>${c.n}</b></div>
    <div class="mc-r"><span class="emo">🏛️</span> العاصمة: <b>${c.cap}</b></div>
    <div class="mc-r"><span class="emo">👨‍👩‍👧</span> السكان: <b>${fmtPop(c.pop)}</b></div>
    <div class="mc-r"><span class="emo">💰</span> العملة: <b>${c.cur}</b></div>`;

  function mapView(code) {
    K.begin();
    const c = BY[code];
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">${flag(code)}</span> ${c.n}</h2><span class="pill"><span class="emo">${CONT[c.c][1]}</span> ${CONT[c.c][0]}</span></div>
      <div class="mapbox big"></div>`, "back");
    const box = app.querySelector(".mapbox");
    box.appendChild(mapEl());
    show(code, box.getBoundingClientRect(), true);
  }

  function mapMenu() {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct"><span class="emo">🗺️</span> أين الدولة؟</h2><span></span></div>
      <div class="sub">اختر منطقة، ثم سمِّ الدولة الملوّنة بالأحمر على الخريطة</div>
      <div class="groups">${GROUPS.map((g) => `<button class="grpb f" style="background:${g.bg}" ${K.act(g.id, () => K.show(mapQuiz, g.id))}>
          <span class="emo">${g.icon}</span><b>${g.name}</b><small>${save.mapBest[g.id] ? `أفضل نتيجة: ${save.mapBest[g.id]} / 10` : "10 أسئلة"}</small></button>`).join("")}</div>
      ${K.HELP}`, "arab");
  }

  const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "بطل! 🏆", "شاطر! 💪"];
  function mapQuiz(gid) {
    const g = GROUPS.find((x) => x.id === gid);
    const pool = gid === "all" ? ALL.filter((c) => c.arab || save.seen[c.code] || c.pop > 30) : g.list;
    const qs = K.shuffle(pool).slice(0, 10).map((c) => {
      const near = gid === "arab" ? g.list : ALL.filter((x) => x.c === c.c);
      return { c, opts: K.options(c, near, 4, (a, b) => a.code === b.code) };
    });
    let q = 0, score = 0;
    const results = [];
    ask();
    function ask() {
      K.begin();
      const { c, opts } = qs[q];
      let wrong = false, locked = false;
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "") : k === q ? "now" : ""}"></i>`).join("");
      const choose = (x, el) => {
        if (locked || el.dataset.dead) return;
        const cheer = app.querySelector(".cheer");
        if (x === c) {
          locked = true; el.classList.add("ok");
          if (!wrong) score++;
          results[q] = !wrong;
          K.sfx.ok(); K.confetti(10);
          cheer.textContent = K.pick(GOOD);
          label(c.code, vb.length ? viewFor(c.code, box.getBoundingClientRect()) : vb);
          K.later(() => { q++; if (q < qs.length) { K.top().focus = null; ask(); } else finish(); }, 2400);
        } else {
          wrong = true; el.classList.add("bad"); el.dataset.dead = "1";
          K.sfx.bad();
          cheer.textContent = `هذه ليست ${x.n}، حاول مرة أخرى 💪`;
        }
      };
      K.paint(`<div class="top">${K.backBtn()}<div class="dots">${dots}</div><span class="pill">${q + 1} / ${qs.length}</span></div>
        <div class="mq">
          <div class="side">
            <div class="mq-q">ما اسم الدولة <span class="red">الحمراء</span>؟</div>
            <div class="mopts">${opts.map((x, j) => `<button class="mo f" data-code="${x.code}" ${K.act("o" + j, (el) => choose(x, el))}><span class="emo">${flag(x.code)}</span>${x.n}</button>`).join("")}</div>
            <div class="mcard"></div>
            <div class="cheer"></div>
          </div>
          <div class="mapbox"></div>
        </div>`, "o0");
      const box = app.querySelector(".mapbox");
      box.appendChild(mapEl());
      show(c.code, box.getBoundingClientRect());
    }
    function finish() {
      if (score > (save.mapBest[gid] || 0)) { save.mapBest[gid] = score; save.save(); }
      const s = K.starsFor(score, qs.length);
      K.replace(K.resultScreen, { s, score, total: qs.length, again: () => K.replace(mapQuiz, gid), title: "أين الدولة؟ · " + g.name });
    }
  }
  // تحديث بطاقة المعلومات عند التنقل بين الأسماء
  K.mapView = mapView; // للتجربة
  K.onCard = (code) => { const el = app.querySelector(".mcard"); if (el && BY[code]) el.innerHTML = card(BY[code]); };
  K.start(home);
})();
