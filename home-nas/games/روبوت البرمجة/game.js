// روبوت البرمجة — يرتّب الطفل أوامر في شريط، ثم يشاهد الروبوت ينفّذها خطوة خطوة ليصل إلى النجمة.
// 30 مرحلة في 3 عوالم: التسلسل، ثم التكرار، ثم الشروط. الرسوم كلها SVG مرسومة هنا (بدون إنترنت).
(() => {
  "use strict";
  const GAME = "روبوت البرمجة";
  const LV = window.LEVELS, WD = window.WORLDS, R = window.ROBO;
  const save = K.store("robo", { done: {}, prog: {}, fast: false });

  // ---------------------------------------------------------------- واجهات السيرفر (نتجاهل الأخطاء)
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const learn = (i, ok) => { try { post("/api/tv/learn/result", { game: GAME, topic: String(i + 1), ok }).catch(() => {}); } catch {} };
  const earn = (amount, reason) => { try { return post("/api/tv/stars/earn", { amount, game: GAME, reason }).then((r) => (r.ok ? r.json() : null)).then((d) => (d && d.added > 0 ? d.added : 0)).catch(() => 0); } catch { return Promise.resolve(0); } };

  // ---------------------------------------------------------------- الرسوم
  const svg = (vb, body, cls = "") => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
  const STAR_PTS = "50,6 61,38 95,38 67,58 78,92 50,72 22,92 33,58 5,38 39,38";
  const ART = {
    robot: () => svg("0 0 100 100", `
      <rect x="9" y="30" width="15" height="46" rx="7" fill="#334155"/><rect x="76" y="30" width="15" height="46" rx="7" fill="#334155"/>
      <path d="M12 38h9M12 48h9M12 58h9M12 68h9M79 38h9M79 48h9M79 58h9M79 68h9" stroke="#64748b" stroke-width="3"/>
      <rect x="19" y="20" width="62" height="66" rx="20" fill="#38bdf8" stroke="#075985" stroke-width="4"/>
      <rect x="28" y="27" width="44" height="24" rx="11" fill="#0f172a"/>
      <circle cx="40" cy="39" r="5.5" fill="#6ee7b7"/><circle cx="60" cy="39" r="5.5" fill="#6ee7b7"/>
      <rect x="34" y="60" width="32" height="16" rx="6" fill="#e0f2fe"/><circle cx="42" cy="68" r="3.5" fill="#f43f5e"/><circle cx="50" cy="68" r="3.5" fill="#fbbf24"/><circle cx="58" cy="68" r="3.5" fill="#22c55e"/>
      <path d="M50 20V9" stroke="#075985" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="8" r="6" fill="#f43f5e" stroke="#9f1239" stroke-width="2"/>`, "rb"),
    // الروبوت من الأمام (للقائمة)
    mascot: () => svg("0 0 120 130", `
      <path d="M60 22V8" stroke="#075985" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="8" r="7" fill="#f43f5e"/>
      <rect x="22" y="20" width="76" height="56" rx="20" fill="#38bdf8" stroke="#075985" stroke-width="5"/>
      <rect x="32" y="30" width="56" height="30" rx="13" fill="#0f172a"/>
      <circle cx="47" cy="45" r="7" fill="#6ee7b7"/><circle cx="73" cy="45" r="7" fill="#6ee7b7"/>
      <path d="M50 66q10 7 20 0" stroke="#075985" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="12" y="38" width="10" height="20" rx="5" fill="#0ea5e9"/><rect x="98" y="38" width="10" height="20" rx="5" fill="#0ea5e9"/>
      <rect x="32" y="80" width="56" height="34" rx="12" fill="#7dd3fc" stroke="#075985" stroke-width="5"/>
      <circle cx="48" cy="97" r="5" fill="#f43f5e"/><circle cx="60" cy="97" r="5" fill="#fbbf24"/><circle cx="72" cy="97" r="5" fill="#22c55e"/>
      <rect x="30" y="114" width="20" height="12" rx="5" fill="#334155"/><rect x="70" y="114" width="20" height="12" rx="5" fill="#334155"/>`, "mas"),
    star: (lock) => svg("0 0 100 100", `<polygon points="${STAR_PTS}" fill="${lock ? "#cbd5e1" : "#facc15"}" stroke="${lock ? "#94a3b8" : "#ca8a04"}" stroke-width="5" stroke-linejoin="round"/>
      ${lock ? `<rect x="40" y="46" width="20" height="16" rx="3" fill="#64748b"/><path d="M44 47v-5a6 6 0 0 1 12 0v5" stroke="#64748b" stroke-width="4" fill="none"/>` : `<circle cx="40" cy="48" r="4" fill="#854d0e"/><circle cx="60" cy="48" r="4" fill="#854d0e"/><path d="M42 60q8 6 16 0" stroke="#854d0e" stroke-width="4" fill="none" stroke-linecap="round"/>`}`, "star"),
    gem: () => svg("0 0 100 100", `<path d="M50 88 14 44l14-20h44l14 20z" fill="#e879f9" stroke="#86198f" stroke-width="5" stroke-linejoin="round"/>
      <path d="M14 44h72M38 24l12 64 12-64M28 24l10 20M72 24l-10 20" stroke="#86198f" stroke-width="3" fill="none"/><path d="M30 30l6 10" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`, "gem"),
    box: () => svg("0 0 100 100", `<rect x="14" y="18" width="72" height="68" rx="6" fill="#d97706" stroke="#78350f" stroke-width="5"/>
      <path d="M14 34h72M14 70h72M22 34l56 36" stroke="#78350f" stroke-width="5"/>`),
    water: () => svg("0 0 100 100", `<rect x="6" y="14" width="88" height="72" rx="28" fill="#3b82f6" stroke="#1d4ed8" stroke-width="4"/>
      <path d="M22 40q7-7 14 0t14 0 14 0 14 0M22 60q7-7 14 0t14 0 14 0 14 0" stroke="#bfdbfe" stroke-width="5" fill="none" stroke-linecap="round"/>`, "wat"),
    wall: [
      () => svg("0 0 100 100", `<rect x="43" y="62" width="14" height="28" rx="4" fill="#92400e"/><circle cx="50" cy="40" r="30" fill="#16a34a" stroke="#14532d" stroke-width="4"/>
        <circle cx="36" cy="32" r="9" fill="#4ade80"/><circle cx="60" cy="48" r="5" fill="#ef4444"/><circle cx="40" cy="54" r="4" fill="#ef4444"/>`),
      () => svg("0 0 100 100", `<rect x="8" y="10" width="84" height="80" rx="6" fill="#dc2626" stroke="#7f1d1d" stroke-width="5"/>
        <path d="M8 30h84M8 50h84M8 70h84M36 10v20M64 10v20M22 30v20M50 30v20M78 30v20M36 50v20M64 50v20M22 70v20M50 70v20M78 70v20" stroke="#fecaca" stroke-width="3"/>`),
      () => svg("0 0 100 100", `<path d="M10 80q-4-34 22-52 20-14 42-4 22 12 18 56z" fill="#78716c" stroke="#44403c" stroke-width="5" stroke-linejoin="round"/>
        <circle cx="40" cy="50" r="9" fill="#57534e"/><circle cx="66" cy="62" r="6" fill="#57534e"/><circle cx="62" cy="38" r="4" fill="#a8a29e"/>`),
    ],
  };
  const P = 'fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"';
  const CMD = {
    F: { n: "تقدّم", ic: `<path ${P} d="M20 35V7M9 18 20 7l11 11"/>` },
    R: { n: "يميناً", ic: `<path ${P} d="M12 34V21a11 11 0 0 1 11-11h8M25 4l6 6-6 6"/>` },
    L: { n: "يساراً", ic: `<path ${P} d="M28 34V21a11 11 0 0 0-11-11H9M15 4l-6 6 6 6"/>` },
    J: { n: "اقفز", ic: `<path ${P} d="M5 33Q20 -2 35 33M29 28l6 5 1-8"/><rect x="15" y="27" width="10" height="8" rx="1" fill="currentColor" opacity=".55"/>` },
    P: { n: "التقط", ic: `<path ${P} d="M20 36 8 22l5-8h14l5 8zM8 22h24"/><path ${P} d="M20 2v7M15 6l5 4 5-4"/>` },
    rep: { n: "كرّر", ic: `<path ${P} d="M31 15a12 12 0 1 0 2 11M31 5v10h-10"/>` },
    ifw: { n: "إذا حاجز", ic: `<rect ${P} x="5" y="15" width="22" height="19" rx="2"/><path ${P} d="M5 24.5h22M16 15v9.5M11 24.5V34M21 24.5V34"/><path ${P} d="M29 8a5 5 0 1 1 6 5v3M35 21v.5"/>` },
    ifg: { n: "إذا جوهرة", ic: `<path ${P} d="M15 36 4 22l5-8h12l5 8zM4 22h22"/><path ${P} d="M29 8a5 5 0 1 1 6 5v3M35 21v.5"/>` },
  };
  const icon = (t) => svg("0 0 40 40", CMD[t].ic, "ic");
  const LONG = { F: "تقدّم", R: "استدر يميناً", L: "استدر يساراً", J: "اقفز", P: "التقط", rep: "كرّر", ifw: "إذا وجدت حاجزاً", ifg: "إذا كنت على جوهرة" };

  // ---------------------------------------------------------------- رسائل لطيفة عند الخطأ
  const WHY = {
    empty: "ضع أوامر في الشريط أولاً، ثم اضغط «شغّل» ▶",
    bump: "أوه! حاجز أمام الروبوت 🌳. هل يحتاج أن يستدير؟",
    edge: "انتبه! الروبوت كاد يخرج من الأرض. جرّب أن تستدير.",
    water: "الروبوت لا يحب الماء 💧! جرّب أمر «اقفز».",
    box: "صندوق في الطريق 📦! يستطيع الروبوت أن يقفز فوقه.",
    high: "هذا الحاجز عالٍ جداً للقفز! جرّب طريقاً آخر.",
    land: "لا يستطيع الروبوت أن يهبط هناك. القفزة تأخذه مربعين.",
    nogem: "لا توجد جوهرة هنا 💎. التقط حين يقف الروبوت فوق الجوهرة.",
    short: "اقتربت! توقف الروبوت قبل النجمة. أضف أوامر أخرى.",
    gems: "اجمع كل الجواهر 💎 أولاً، ثم اذهب إلى النجمة.",
    forever: "الروبوت يدور بلا نهاية! 🔄 هل يتقدّم داخل «كرّر»؟",
  };

  // ---------------------------------------------------------------- مساعدات
  const worldOf = (i) => (i / 10) | 0;
  const doneIn = (w) => K.range(w * 10, w * 10 + 10).filter((i) => save.done[i]).length;
  const worldOpen = (w) => w === 0 || doneIn(w - 1) >= 5;
  const open = (i) => (i % 10 === 0 ? worldOpen(worldOf(i)) : !!save.done[i - 1] || !!save.done[i]);
  const starsOf = (lv, n) => (n <= lv.best ? 3 : n <= lv.best + 2 ? 2 : 1);
  const maxOf = (lv) => lv.max || Math.max(lv.best + 6, 10);
  const counts = (lv) => (lv.cmds.includes("ifw") ? [0, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const repLabel = (n) => (n === 0 ? "∞" : "×" + n);
  const match = (tk, j) => { // مكان نهاية الكتلة التي تبدأ عند j
    let d = 0;
    for (let k = j; k < tk.length; k++) { if (R.BLOCK[tk[k].t]) d++; else if (tk[k].t === "E" && --d === 0) return k; }
    return tk.length;
  };
  const opener = (tk, e) => { // بداية الكتلة التي تنتهي عند e
    let d = 0;
    for (let k = e; k >= 0; k--) { if (tk[k].t === "E") d++; else if (R.BLOCK[tk[k].t] && --d === 0) return k; }
    return -1;
  };

  // ---------------------------------------------------------------- القائمة الرئيسية
  function home() {
    K.begin();
    const total = Object.keys(save.done).length;
    const cards = WD.map((w, k) => {
      const ok = worldOpen(k), n = doneIn(k);
      return `<button class="mode f ${w.cls}${ok ? "" : " locked"}" ${K.act("w" + k, () => (ok ? K.show(worldScreen, k) : nope()))}>
        <span class="big emo">${ok ? w.emo : "🔒"}</span><b>${w.n}</b><small>${ok ? w.sub : "أنهِ 5 مراحل من العالم السابق"}</small>
        <span class="bar"><i style="width:${n * 10}%"></i></span><small>${n} / 10</small></button>`;
    }).join("");
    K.paint(`<div class="title">${ART.mascot()}<div><h1>روبوت البرمجة</h1><div class="sub">رتّب الأوامر وساعد الروبوت ليصل إلى النجمة ⭐</div></div></div>
      <div class="modes">${cards}</div>
      <div class="sub tot">${total ? `أنهيت ${total} من 30 مرحلة` : "ابدأ من «حديقة الروبوت» 🌳"}</div>${K.HELP}`, "w" + Math.min(2, Math.max(0, ...[0, 1, 2].filter(worldOpen))));
  }
  function nope() { K.sfx.bad(); const c = K.current(); if (c) { c.classList.remove("shk"); void c.offsetWidth; c.classList.add("shk"); } }

  // ---------------------------------------------------------------- مراحل العالم
  function worldScreen(w) {
    K.begin();
    const W = WD[w];
    let first = null;
    const tiles = K.range(w * 10, w * 10 + 10).map((i) => {
      const ok = open(i), s = save.done[i] || 0;
      if (ok && !s && first === null) first = i;
      return `<button class="lvl f${ok ? "" : " locked"}${s ? " done" : ""}" ${K.act("l" + i, () => (ok ? K.show(levelScreen, i) : nope()))}>
        <b>${ok ? i + 1 : "🔒"}</b><span class="st">${s ? K.starsHtml(s) : ok ? "<span class='new'>جديد</span>" : ""}</span></button>`;
    }).join("");
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct">${W.emo} ${W.n}</h2><span class="pill">${doneIn(w)} / 10</span></div>
      <div class="sub">${W.sub}</div><div class="lvls ${W.cls}">${tiles}</div>${K.HELP}`, "l" + (first ?? w * 10));
  }

  // ---------------------------------------------------------------- شاشة المرحلة
  let ed = null; // { i, tk, cur, fails, running, redraw }
  function levelScreen(i) {
    const lv = LV[i];
    if (!ed || ed.i !== i) {
      ed = { i, tk: (save.prog[i] || []).map((t) => Object.assign({}, t)), fails: 0, running: false, fresh: true };
      ed.cur = ed.tk.length;
    }
    draw();
    if (ed.fresh) { ed.fresh = false; K.later(() => K.tts(lv.tip), 500); }
  }

  function draw(focus) {
    const i = ed.i, lv = LV[i], w = worldOf(i), m = R.parseMap(lv);
    K.begin();
    if (focus) K.top().focus = focus;
    const n = R.size(ed.tk), max = maxOf(lv);
    const pal = lv.cmds.map((t) => `<button class="cmd f c-${t}" ${K.act("c_" + t, () => insert(t))}>${icon(t)}<span>${LONG[t]}</span></button>`).join("");
    // الخريطة
    let cells = "";
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
      const c = m.cells[y][x], pos = `style="left:${(x / m.W) * 100}%;top:${(y / m.H) * 100}%"`;
      cells += `<div class="cell ${(x + y) % 2 ? "o" : "e"}${c === "#" ? " wl" : ""}" ${pos}>${c === "#" ? ART.wall[w]() : c === "b" ? ART.box() : c === "~" ? ART.water() : ""}</div>`;
    }
    m.gems.forEach((g) => { const [x, y] = g.split(","); cells += `<div class="cell it" data-g="${g}" style="left:${(x / m.W) * 100}%;top:${(y / m.H) * 100}%">${ART.gem()}</div>`; });
    cells += `<div class="cell it goal${m.gems.length ? " lock" : ""}" style="left:${(m.star.x / m.W) * 100}%;top:${(m.star.y / m.H) * 100}%">${ART.star(m.gems.length > 0)}</div>`;
    cells += `<div class="robot" id="rob" style="left:${(m.start.x / m.W) * 100}%;top:${(m.start.y / m.H) * 100}%;width:${100 / m.W}%;height:${100 / m.H}%"><div class="rot" style="transform:rotate(${m.start.d * 90}deg)">${ART.robot()}</div></div>`;

    K.paint(`<div class="top">${K.backBtn()}
        <span class="pill lvp">${WD[w].emo} المرحلة ${i + 1}</span>
        <div class="tip"><button class="btn f say" ${K.act("say", () => K.tts(lv.tip))}><span class="emo">🔊</span></button><span>${lv.tip}</span></div>
        <button class="btn f" ${K.act("hint", showHint)}><span class="emo">💡</span></button></div>
      <div class="play ${WD[w].cls}">
        <div class="pal">${pal}</div>
        <div class="bwrap" id="bwrap"><div class="board" id="board" data-w="${m.W}" data-h="${m.H}">${cells}</div></div>
      </div>
      <div class="prog">
        <div class="strip" id="strip">${stripHtml()}</div>
        <div class="ctrl">
          <span class="cap${n >= max ? " full" : ""}">${n} / ${max}</span>
          <button class="btn f sm" ${K.act("del", del)} title="احذف"><span class="emo">⌫</span></button>
          <button class="btn f sm" ${K.act("clr", clear)} title="امسح الكل"><span class="emo">🗑️</span></button>
          <button class="btn f sm" ${K.act("spd", () => { save.fast = !save.fast; save.save(); draw("spd"); })} title="السرعة"><span class="emo">${save.fast ? "🐇" : "🐢"}</span></button>
          <button class="btn f go run" ${K.act("run", run)}>▶ شغّل</button>
        </div>
      </div>`, n ? "run" : "c_" + lv.cmds[0]);
    if (ed.drawn) K.app.firstElementChild.style.animation = "none";
    ed.drawn = true;
    layout();
    K.mode = {
      stop() { clearTimeout(runT); ed.running = false; },
      key(e) {
        if (ed.running) { if (e.key === "Enter" || e.key === " " || e.key === "Backspace") stop(); return true; }
        if (e.key === "Backspace" && ed.tk.length) { del(); return true; }
        return false;
      },
    };
  }

  function stripHtml() {
    const tk = ed.tk;
    let h = "";
    const caret = (k) => (k === ed.cur ? `<i class="caret"></i>` : "");
    tk.forEach((t, k) => {
      h += caret(k);
      if (t.t === "E") { h += `<button class="tk f end" data-ti="${k}" ${K.act("t" + k, () => tap(k))}>⟩</button></div>`; return; }
      const blk = R.BLOCK[t.t];
      if (blk) h += `<div class="blk b-${t.t}">`;
      h += `<button class="tk f c-${t.t}" data-ti="${k}" ${K.act("t" + k, () => tap(k))}>${icon(t.t)}<small>${t.t === "rep" ? `${CMD.rep.n} <b>${repLabel(t.n)}</b>` : CMD[t.t].n}</small></button>`;
    });
    h += caret(tk.length);
    // كتل غير مغلقة (لا يحدث عادة)
    const open = tk.filter((t) => R.BLOCK[t.t]).length - tk.filter((t) => t.t === "E").length;
    h += "</div>".repeat(Math.max(0, open));
    h += `<button class="tk f slot" ${K.act("tend", () => { ed.cur = ed.tk.length; draw("tend"); })}>${tk.length ? "＋" : "ضع الأوامر هنا"}</button>`;
    return h;
  }

  function changed(focus) { save.prog[ed.i] = ed.tk; save.save(); draw(focus); }
  function insert(t) {
    if (ed.running) return;
    const lv = LV[ed.i];
    if (R.size(ed.tk) >= maxOf(lv)) {
      K.sfx.bad();
      say(lv.max ? "الشريط ممتلئ! استعمل «كرّر» لتختصر الأوامر 🔁" : "الشريط ممتلئ! احذف بعض الأوامر.");
      return;
    }
    if (R.BLOCK[t]) {
      ed.tk.splice(ed.cur, 0, t === "rep" ? { t, n: counts(lv)[t === "rep" && lv.cmds.includes("ifw") ? 0 : 1] } : { t }, { t: "E" });
      ed.cur += 1;
    } else { ed.tk.splice(ed.cur, 0, { t }); ed.cur += 1; }
    K.sfx.pop();
    changed("c_" + t);
  }
  function tap(k) {
    if (ed.running) return;
    const t = ed.tk[k];
    if (t.t === "rep" && ed.cur === k + 1) {
      const c = counts(LV[ed.i]), j = c.indexOf(t.n);
      t.n = c[(j + 1) % c.length];
      K.sfx.tick();
      return changed("t" + k);
    }
    ed.cur = k + 1;
    K.sfx.tick();
    if (t.t === "rep") say("اضغط على «كرّر» مرة أخرى لتغيير العدد 🔢");
    draw("t" + k);
  }
  function del() {
    if (ed.running || !ed.tk.length) return;
    if (ed.cur === 0) ed.cur = ed.tk.length;
    const k = ed.cur - 1, t = ed.tk[k];
    if (t.t === "E") { const s = opener(ed.tk, k); ed.tk.splice(k, 1); if (s >= 0) ed.tk.splice(s, 1); ed.cur = k - (s >= 0 ? 1 : 0); }
    else if (R.BLOCK[t.t]) { const e = match(ed.tk, k); if (e < ed.tk.length) ed.tk.splice(e, 1); ed.tk.splice(k, 1); ed.cur = k; }
    else { ed.tk.splice(k, 1); ed.cur = k; }
    K.sfx.tick();
    changed("del");
  }
  function clear() {
    if (ed.running || !ed.tk.length) return;
    ed.tk = []; ed.cur = 0; K.sfx.tick(); changed("c_" + LV[ed.i].cmds[0]);
  }
  function showHint() { if (!ed.running) bubble("💡 " + LV[ed.i].hint, "hint"); }

  // فقاعة كلام فوق اللوحة
  function bubble(text, kind, focusBack) {
    const wrap = document.getElementById("bwrap");
    if (!wrap) return;
    const old = wrap.querySelector(".bubble"); if (old) old.remove();
    const back = focusBack || (K.current() && K.current().dataset.k) || "run";
    const b = document.createElement("div");
    b.className = "bubble " + (kind || "");
    b.innerHTML = `<div class="bm">${ART.mascot()}</div><p>${K.esc(text)}</p><button class="btn f go" ${K.act("okb", () => { b.remove(); if (kind === "fail") draw("run"); else { const el = K.app.querySelector(`.f[data-k="${back}"]`); if (el) K.focus(el); } })}>حسناً 👍</button>`;
    wrap.appendChild(b);
    K.focus(b.querySelector(".f"));
    K.tts(text.replace(/[^؀-ۿ\s]/g, " "));
  }
  let sayT = null;
  function say(text) {
    const s = document.getElementById("strip");
    if (!s) return;
    let e = document.querySelector(".toast");
    if (!e) { e = document.createElement("div"); e.className = "toast"; K.app.firstElementChild.appendChild(e); }
    e.textContent = text; e.classList.add("on");
    clearTimeout(sayT); sayT = setTimeout(() => e.classList.remove("on"), 2600);
  }

  // حجم اللوحة حسب المساحة المتاحة
  function layout() {
    const wrap = document.getElementById("bwrap"), bd = document.getElementById("board");
    if (!wrap || !bd) return;
    const W = +bd.dataset.w, H = +bd.dataset.h, r = wrap.getBoundingClientRect();
    const c = Math.floor(Math.min(r.width / W, r.height / H, window.innerHeight * 0.16));
    bd.style.width = c * W + "px"; bd.style.height = c * H + "px";
    bd.style.setProperty("--c", c + "px");
  }
  window.addEventListener("resize", layout);

  // ---------------------------------------------------------------- التشغيل
  let runT = null;
  function stop() { clearTimeout(runT); ed.running = false; draw("run"); }
  function run() {
    if (ed.running) return;
    const i = ed.i, lv = LV[i];
    const res = R.run(lv, ed.tk);
    if (res.why === "empty") { K.sfx.bad(); bubble(WHY.empty, "hint", "c_" + lv.cmds[0]); return; }
    learn(i, res.end === "win");
    ed.running = true;
    K.app.firstElementChild.classList.add("running");
    const old = document.querySelector(".bubble"); if (old) old.remove();
    const m = res.map, rob = document.getElementById("rob"), rot = rob.querySelector(".rot");
    let deg = m.start.d * 90, k = 0, prevEl = null;
    const sp = save.fast ? 0.5 : 1;
    const place = (s) => { rob.style.left = (s.x / m.W) * 100 + "%"; rob.style.top = (s.y / m.H) * 100 + "%"; };
    const light = (ti, cls) => {
      if (prevEl) prevEl.classList.remove("now", "yes", "no");
      prevEl = K.app.querySelector(`.tk[data-ti="${ti}"]`);
      if (prevEl) { prevEl.classList.add("now"); if (cls) prevEl.classList.add(cls); }
    };
    const next = () => {
      if (k >= res.steps.length) return finish();
      const s = res.steps[k++];
      light(s.i, s.k === "cond" ? (s.val ? "yes" : "no") : "");
      let d = 430;
      if (s.k === "move") { place(s); K.tone(440, 0.06, "triangle", 0.06); }
      else if (s.k === "jump") { place(s); rob.classList.remove("hop"); void rob.offsetWidth; rob.classList.add("hop"); K.tone(520, 0.1, "sine", 0.1); K.tone(780, 0.12, "sine", 0.08, 0.12); d = 560; }
      else if (s.k === "turn") { deg += s.turn * 90; rot.style.transform = `rotate(${deg}deg)`; K.tone(600, 0.05, "sine", 0.05); d = 360; }
      else if (s.k === "pick") {
        const g = K.app.querySelector(`[data-g="${s.got}"]`); if (g) g.classList.add("got");
        K.sfx.pop();
        if (!s.left) { const st = K.app.querySelector(".goal"); if (st) { st.classList.remove("lock"); st.innerHTML = ART.star(false); } }
      }
      else if (s.k === "loop" || s.k === "cond") { d = 260; K.tone(s.k === "cond" ? (s.val ? 880 : 330) : 700, 0.04, "sine", 0.04); }
      else if (s.k === "bump") { rob.dataset.dir = s.d; rob.classList.add("bump"); K.sfx.bad(); d = 650; }
      else if (s.k === "nogem") { rob.classList.add("bump"); K.sfx.bad(); d = 650; }
      runT = setTimeout(next, d * sp);
    };
    const finish = () => {
      ed.running = false;
      if (res.end === "win") {
        rob.classList.add("dance"); K.sfx.win(); K.confetti(20);
        runT = setTimeout(() => win(i), 1300);
      } else {
        ed.fails++;
        rob.classList.add("sad");
        let msg = WHY[res.why] || WHY.short;
        if (ed.fails >= 2) msg += "  💡 " + lv.hint;
        runT = setTimeout(() => { K.app.firstElementChild.classList.remove("running"); bubble(msg, "fail"); }, 350);
      }
    };
    runT = setTimeout(next, 250);
  }

  // ---------------------------------------------------------------- الفوز
  function win(i) {
    const lv = LV[i], n = R.size(ed.tk), s = starsOf(lv, n), had = save.done[i] || 0;
    if (s > had) save.done[i] = s;
    save.save();
    const amount = !had || (s === 3 && had < 3) ? 1 : 0; // نجمة لأول نجاح، ونجمة عند تحسين الحل إلى 3
    const msg = s === 3 ? "رائع! أقصر برنامج 🏆" : s === 2 ? "أحسنت! وصل الروبوت ⭐" : "وصل الروبوت! هل تستطيع حلاً أقصر؟";
    const nextI = i + 1 < LV.length && (worldOf(i + 1) === worldOf(i) || worldOpen(worldOf(i + 1))) ? i + 1 : null;
    ed.fails = 0;
    const extra = `<div class="sub">برنامجك: ${n} ${n > 10 ? "أمراً" : "أوامر"} · ${s === 3 ? "هذا أقصر حل!" : `أقصر حل: ${lv.best} ${lv.best > 10 ? "أمراً" : "أوامر"}`}</div><div class="won hide" id="earned"></div>`;
    K.replace(K.resultScreen, {
      s, msg, extra, title: `المرحلة ${i + 1}`,
      again: () => K.replace(levelScreen, i),
      next: nextI !== null ? { label: "المرحلة التالية", fn: () => { ed = null; K.replace(levelScreen, nextI); } } : { label: "العوالم", fn: () => { ed = null; K.home(); } },
    });
    if (amount) earn(amount, `أنهى المرحلة ${i + 1}`).then((a) => {
      const e = document.getElementById("earned");
      if (a && e) { e.innerHTML = `<span class="emo">⭐</span> ربحت ${a} ${a === 1 ? "نجمة" : a === 2 ? "نجمتين" : "نجوم"}`; e.classList.remove("hide"); }
    });
  }

  K.start(home);
})();
