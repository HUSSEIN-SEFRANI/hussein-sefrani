// تعلم الفيزياء — درس تعليمي (نجمة عند إنهاء كل درس). خمسة مستويات من البسيط إلى الأصعب:
// 1 الجاذبية، 2 المادة وحالاتها (أول الكيمياء)، 3 المغناطيس والكهرباء، 4 القوى والحركة، 5 الطاقة والفضاء.
// كل درس = تجربتان يلعبها الطفل بيده (مختبر) + ستة أسئلة مع شرح «لماذا؟». و«المختبر الحر» للعب بالتجارب بلا درس.
// الأزرار بالموقع (البند 52): السفلي موافق، الأيمن رجوع، الأيسر 💡 مساعدة، العلوي 🔊 اسمع. الأسهم للتوجيه.
(() => {
  "use strict";
  // window.physLab: حالة التجربة الحالية (للتجربة الآلية فقط)
  const GAME = "تعلم الفيزياء";
  const D = window.PHYS;
  const save = K.store("phys", { best: {}, done: {}, lv: 0, used: {}, labs: 0 });

  const LEVELS = [
    { n: "الجاذبية", sub: "لماذا تسقط الأشياء؟", e: "🍎", bg: "linear-gradient(135deg,#4ade80,#16a34a)" },
    { n: "المادة", sub: "صلب وسائل وغاز", e: "🧊", bg: "linear-gradient(135deg,#38bdf8,#2563eb)" },
    { n: "المغناطيس والكهرباء", sub: "يجذب؟ يضيء؟", e: "🧲", bg: "linear-gradient(135deg,#fbbf24,#f97316)" },
    { n: "القوى والحركة", sub: "الدفع والاحتكاك والتوازن", e: "⚖️", bg: "linear-gradient(135deg,#f472b6,#db2777)" },
    { n: "الطاقة والفضاء", sub: "الضوء والقمر والصواريخ", e: "🚀", bg: "linear-gradient(135deg,#a78bfa,#6d28d9)" },
  ];
  // التجارب: تجربتان في كل مستوى، وكلها في «المختبر الحر»
  const LAB = {
    apple: { id: "catch", v: "apple", n: "التقط التفاح", e: "🍎" },
    mix: { id: "catch", v: "mix", n: "ثقيل وخفيف", e: "🍉" },
    gas: { id: "heat", v: "gas", n: "اغلِ الماء", e: "💨" },
    solid: { id: "heat", v: "solid", n: "جمّد الماء", e: "🧊" },
    liquid: { id: "heat", v: "liquid", n: "أذب الجليد", e: "💧" },
    magnet: { id: "magnet", n: "المغناطيس", e: "🧲" },
    on: { id: "circuit", v: "on", n: "أضئ المصباح", e: "💡" },
    off: { id: "circuit", v: "off", n: "ابحث عن العازل", e: "🔌" },
    push: { id: "push", n: "ادفع الصندوق", e: "📦" },
    seesaw: { id: "seesaw", n: "لوح التوازن", e: "⚖️" },
    earth: { id: "launch", v: "earth", n: "المدفع على الأرض", e: "🎯" },
    moon: { id: "launch", v: "moon", n: "المدفع على القمر", e: "🌙" },
  };
  const LEVEL_LABS = [
    () => [LAB.apple, LAB.mix],
    () => K.shuffle([LAB.gas, LAB.solid, LAB.liquid]).slice(0, 2),
    () => [LAB.magnet, K.pick([LAB.on, LAB.off])],
    () => [LAB.push, LAB.seesaw],
    () => [LAB.earth, LAB.moon],
  ];

  const say = (t, rate = 0.85) => { if (t) K.tts(t, "ar", rate); };
  const report = (topic, ok) => {
    if (!K.gameInfo()) return;
    fetch("/api/tv/learn/result", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: GAME, topic: String(topic).slice(0, 80), ok }) }).catch(() => {});
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HELP = `<div class="help"><b>الأسهم</b> للتنقل · <b>الزر السفلي</b> أو <b>Enter</b>: موافق · <b>الزر الأيمن</b> أو <b>Backspace</b>: رجوع · <b>الأيسر</b>: 💡 مساعدة · <b>العلوي</b>: 🔊 اسمع · <b>PS</b> للخروج</div>`;

  // لا يتكرر السؤال حتى تنتهي أسئلة المستوى
  function take(list, key, n) {
    let used = save.used[key] || [];
    let left = list.filter((x) => !used.includes(x.q));
    if (left.length < n) { used = []; left = list.slice(); }
    const out = K.shuffle(left).slice(0, n);
    save.used[key] = used.concat(out.map((x) => x.q)).slice(-60);
    return out;
  }

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    K.paint(`<div class="title"><span class="mascot emo">🔬</span><div><h1>تعلّم الفيزياء</h1><div class="sub">جرّب بيدك، واكتشف كيف يعمل العالم!</div></div></div>
      <div class="modes lv">${LEVELS.map((L, i) => `<button class="mode f" style="background:${L.bg}" ${K.act("l" + i, () => { save.lv = i; save.save(); K.show(lesson, i); })}>
        <span class="big emo">${L.e}</span><b>${i + 1}. ${L.n}</b><small>${L.sub}</small>
        <span class="best">${save.best[i] ? K.starsHtml(save.best[i]) : "ابدأ!"}</span></button>`).join("")}</div>
      <div class="row2"><button class="btn f" ${K.act("lab", () => K.show(freeLab))}><span class="emo">🧪</span> المختبر الحر</button></div>
      ${HELP}`, "l" + (save.lv || 0));
  }

  function freeLab() {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl">🧪 المختبر الحر</h2><span></span></div>
      <div class="labs">${Object.entries(LAB).map(([k, x]) => `<button class="labt f" ${K.act("x-" + k, () => K.show(lesson, -1, x))}><span class="emo">${x.e}</span><b>${x.n}</b></button>`).join("")}</div>
      <p class="tip">جرّب ما تشاء! المختبر للعب فقط، والنجمة تأتي عند إنهاء درس من المستويات.</p>${HELP}`, "x-apple");
  }

  // ---------------------------------------------------------------- الدرس
  // lv = -1 مع spec: تجربة واحدة من المختبر الحر (بلا نجمة)
  function lesson(lv, spec) {
    const L = lv >= 0 ? LEVELS[lv] : { n: "المختبر الحر", e: "🧪" };
    let steps;
    if (spec) steps = [{ t: "lab", lab: spec }];
    else {
      const labs = LEVEL_LABS[lv](), qs = take(D.levels[lv], "l" + lv, 6).map((q) => ({ t: "q", q }));
      steps = [{ t: "lab", lab: labs[0] }, ...qs.slice(0, 3), { t: "lab", lab: labs[1] }, ...qs.slice(3)];
    }
    save.save();
    const S = { i: 0, score: 0, res: [], kb: {}, pad: {} };
    const DIR = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    S.held = (d) => !!(S.kb[d] || S.pad[d]);
    const held = { h: false, s: false };
    K.mode = {
      key(e) {
        if (DIR[e.key] && !e.pad) S.kb[DIR[e.key]] = true;
        if (S.skip && (e.key === "Enter" || e.key === " ")) { S.skip(); return true; }
        if (!e.pad && (e.code === "KeyH" || e.key === "?" || e.key === "؟")) { S.help && S.help(); return true; }
        if (!e.pad && e.code === "KeyS") { S.listen && S.listen(); return true; }
        return S.key ? S.key(e) : false;
      },
      keyup(e) { if (DIR[e.key]) S.kb[DIR[e.key]] = false; },
      poll(pads) {
        const on = (i) => pads.some((g) => g.buttons[i] && g.buttons[i].pressed);
        const ax = (k) => pads.reduce((m, g) => (Math.abs(g.axes[k] || 0) > Math.abs(m) ? g.axes[k] || 0 : m), 0);
        const x = ax(0), y = ax(1);
        S.pad = { left: on(14) || x < -0.5, right: on(15) || x > 0.5, up: on(12) || y < -0.5, down: on(13) || y > 0.5 };
        const h = on(2), s = on(3);
        if (h && !held.h && S.help) S.help();
        if (s && !held.s && S.listen) S.listen();
        held.h = h; held.s = s;
        return false;
      },
      stop() { if (S.stop) S.stop(); S.stop = null; },
    };

    function next() {
      if (S.stop) S.stop();
      S.stop = S.key = S.help = S.listen = S.skip = null;
      if (S.i >= steps.length) return finish();
      K.top().focus = null;
      const st = steps[S.i];
      if (st.t === "q") question(st.q);
      else LABS[st.lab.id](st.lab);
    }
    function dots() {
      return steps.length < 2 ? "<span></span>" : `<div class="dots">${steps.map((s, k) => `<i class="${k < S.i ? (S.res[k] ? "ok" : "") : k === S.i ? "now" : ""} ${s.t === "lab" ? "lab" : ""}"></i>`).join("")}</div>`;
    }
    function top(title) {
      return `<div class="top">${K.backBtn()}<span class="pill">${L.e} ${L.n}</span>${dots()}
        <button class="btn f" ${K.act("say", () => S.listen && S.listen())}><span class="emo">🔊</span> اسمع</button></div>
        <h2 class="ask">${title}</h2>`;
    }
    const cheer = (h) => { const c = K.app.querySelector(".cheer"); if (c) c.innerHTML = h; };
    // نهاية خطوة: الشرح يبقى قليلاً، والزر السفلي (Enter) يتابع فوراً
    function done(ok, topic, why) {
      S.res[S.i] = ok;
      if (ok) S.score++;
      report(topic, ok);
      if (why) { say(why); cheer(`${ok ? K.pick(["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "عالِم صغير! 🔬"]) : "أكملتها! 💪"}<div class="why">💡 ${K.esc(why)}</div><div class="cont">اضغط موافق للمتابعة ←</div>`); }
      S.help = null;
      const go = () => { S.skip = null; clearTimeout(t); S.i++; next(); };
      const t = K.later(go, why ? Math.max(5000, why.length * 110) : 1500);
      K.later(() => { if (S.res[S.i] === ok) S.skip = go; }, 400);   // لا يتخطى الشرح بضغطة الإجابة نفسها
    }
    function finish() {
      K.mode = null;
      if (spec) {
        save.labs = (save.labs || 0) + 1; save.save();
        K.resultScreen({ s: S.score ? 3 : 2, msg: S.score ? "أحسنت يا عالِم! 🔬" : "تجربة رائعة! 🔬", learn: false, title: spec.n,
          again: () => K.replace(lesson, -1, spec) });
        return;
      }
      const s = K.starsFor(S.score, steps.length);
      save.best[lv] = Math.max(save.best[lv] || 0, s);
      save.done[lv] = (save.done[lv] || 0) + 1;
      save.save();
      K.resultScreen({
        s, score: S.score, total: steps.length, title: `${GAME} — المستوى ${lv + 1}: ${L.n}`,
        again: () => K.replace(lesson, lv),
        next: lv < LEVELS.length - 1 ? { label: `المستوى ${lv + 2}`, fn: () => { save.lv = lv + 1; save.save(); K.replace(lesson, lv + 1); } } : null,
      });
    }

    // ---------------------------------------------------------- سؤال مع صورة واختيارات
    function question(q) {
      K.begin();
      const opts = K.shuffle(q.o.map((o, j) => ({ o, ok: j === 0 })));
      const st = { wrong: false, locked: false };
      K.paint(`${top("سؤال")}
        <div class="qcard"><span class="emo qe">${q.e}</span><b class="qt">${K.esc(q.q)}</b></div>
        <div class="opts ph ${opts.length > 3 ? "four" : ""}">${opts.map((x, j) => `<button class="opt f" ${K.act("o" + j, (el) => pick(x, el))}><span class="emo">${x.o[0]}</span><span>${K.esc(x.o[1])}</span></button>`).join("")}</div>
        <div class="cheer"></div>`, "o0");
      S.listen = () => say(q.q + " … " + opts.map((x) => x.o[1]).join("، أو "));
      S.help = () => {   // يشطب خياراً خاطئاً
        const els = [...K.app.querySelectorAll(".opt")].filter((e, j) => !opts[j].ok && !e.dataset.dead);
        if (els.length < 1 || K.app.querySelectorAll(".opt:not(.dead)").length <= 2) return;
        const e = K.pick(els); e.dataset.dead = "1"; e.classList.add("dead"); st.wrong = true;
        cheer("💡 حذفنا خياراً خاطئاً");
      };
      S.listen();
      function pick(x, el) {
        if (st.locked || el.dataset.dead) return;
        if (x.ok) {
          st.locked = true; el.classList.add("ok"); K.sfx.ok(); K.confetti(8);
          done(!st.wrong, q.q, q.why);
        } else {
          st.wrong = true; el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad();
          cheer("حاول مرة أخرى 💪");
        }
      }
    }

    // ---------------------------------------------------------- أدوات المختبر
    // extra: دالة ترجع أزراراً تحت التجربة (تُستدعى بعد K.begin حتى لا تضيع أفعالها)
    function labScreen(spec, title, ctl, extra = null, short = false) {
      K.begin();
      K.paint(`${top(`${spec.e} ${title}`)}
        <canvas class="lab ${short ? "short" : ""}" width="1000" height="400"></canvas>
        ${extra ? extra() : ""}<div class="ctl">${ctl}</div><div class="cheer"></div>`, extra ? "o0" : "say");
      const cv = K.app.querySelector("canvas.lab");
      const c = cv.getContext("2d");
      S.listen = () => say(title);
      say(title);
      return c;
    }
    // حلقة رسم تتوقف مع الخطوة أو الشاشة
    function loop(fn) {
      let alive = true, t0 = performance.now();
      const f = (t) => { if (!alive) return; const dt = Math.min(0.05, Math.max(0, (t - t0) / 1000)); t0 = t; fn(dt, t / 1000); requestAnimationFrame(f); };
      requestAnimationFrame(f);
      S.stop = () => { alive = false; };
    }
    const EMOF = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    const emo = (c, e, x, y, s = 48) => { c.font = `${s}px ${EMOF}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(e, x, y); };
    const txt = (c, t, x, y, s = 26, col = "#1e3a8a", al = "center") => {
      c.font = `800 ${s}px Baloo, "Noto Sans Arabic", Tahoma, sans-serif`; c.textAlign = al; c.textBaseline = "middle"; c.direction = "rtl";
      const light = /^#(fff|fde68a)/i.test(col);   // نص فاتح على خلفية داكنة (القمر): إطار داكن
      c.lineWidth = 6; c.strokeStyle = light ? "rgba(15,23,42,.9)" : "rgba(255,255,255,.85)"; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y);
    };
    const rrect = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    // للتجارب التي تتحكم فيها الأسهم مباشرة: الأسهم وموافق تبقى في التجربة
    const labKeys = (onEnter, onDir) => (e) => {
      if (e.key === "Enter" || e.key === " ") { onEnter && onEnter(); return true; }
      if (e.key && e.key.startsWith("Arrow")) { if (onDir) onDir(e.key.slice(5).toLowerCase(), e); return true; }
      return false;
    };

    const LABS = {
      // ====================================================== 1. التقط ما يسقط (الجاذبية)
      catch(spec) {
        const mix = spec.v === "mix";
        const title = mix ? "التقط ما يسقط: الثقيل والخفيف!" : "حرّك السلة والتقط 5 تفاحات";
        const c = labScreen(spec, title, "◀ ▶ الأسهم: حرّك السلة 🧺 · لاحظ النقاط: المسافة بينها تكبر لأن السرعة تزداد");
        const G = 520, NEED = 5, OBJ = mix ? ["🍉", "🪨", "🍎", "⚽", "🪶", "🎳"] : ["🍎"];
        const st = (window.physLab = { bx: 500, items: [], caught: 0, missed: 0, spawned: 0, wait: 0.5, over: false, pops: [] });
        S.key = labKeys(null, () => {});
        S.help = () => cheer("💡 انظر أين تبدأ التفاحة، وحرّك السلة تحتها قبل أن تصل");
        const status = () => cheer(`التقطتَ ${st.caught} من ${NEED}${st.missed ? ` · سقط ${st.missed}` : ""}`);
        status();
        loop((dt, t) => {
          if (!st.over) {
            const d = (S.held("right") ? 1 : 0) - (S.held("left") ? 1 : 0);
            st.bx = clamp(st.bx + d * 720 * dt, 60, 940);
            st.wait -= dt;
            if (st.wait <= 0 && st.items.length < 2 && st.spawned < 16) {
              const e = K.pick(OBJ);
              st.items.push({ x: 90 + Math.random() * 820, y: 40, vy: 0, e, feather: e === "🪶", trail: [], tt: 0, ph: Math.random() * 6 });
              st.spawned++; st.wait = mix ? 1.1 : 1.5;
            }
            for (const it of st.items) {
              it.vy = it.feather ? Math.min(it.vy + G * dt, 70) : it.vy + G * dt;
              if (it.feather) it.x += Math.sin(t * 2 + it.ph) * 50 * dt;
              it.y += it.vy * dt;
              it.tt += dt; if (it.tt >= 0.1) { it.tt = 0; it.trail.push([it.x, it.y]); }
              if (it.y >= 312 && it.y <= 352 && Math.abs(it.x - st.bx) < 64) { it.gone = true; st.caught++; K.sfx.pop(); st.pops.push({ x: it.x, y: 300, t: 0.8 }); status(); }
              else if (it.y > 392) { it.gone = true; st.missed++; K.sfx.bad(); status(); }
            }
            st.items = st.items.filter((x) => !x.gone);
            if (st.caught >= NEED || (st.spawned >= 16 && !st.items.length)) {
              st.over = true;
              const ok = st.caught >= NEED && st.missed <= 3;
              K.sfx.win(); K.confetti(ok ? 16 : 6);
              done(ok, spec.n, mix ? "بلا هواء يسقط الثقيل والخفيف بنفس السرعة، لهذا سقطت البطيخة والكرة معاً. الريشة وحدها أبطأ لأن الهواء يدفعها."
                : "التفاحة تسرع وهي تسقط: لاحظ أن النقاط تتباعد أكثر فأكثر. هذه هي الجاذبية!");
            }
          }
          // الرسم
          c.clearRect(0, 0, 1000, 400);
          c.fillStyle = "#65a30d"; c.fillRect(0, 0, 1000, 22);
          for (let x = 30; x < 1000; x += 110) emo(c, "🌿", x, 18, 40);
          c.fillStyle = "#4ade80"; c.fillRect(0, 368, 1000, 32);
          txt(c, "⬇ الجاذبية", 960, 200, 24, "#be185d", "right");
          for (const it of st.items) {
            c.fillStyle = "rgba(249,115,22,.75)";
            for (const [x, y] of it.trail) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
            emo(c, it.e, it.x, it.y, 52);
          }
          emo(c, "🧺", st.bx, 336, 78);
          for (const p of st.pops) { p.t -= dt; p.y -= 40 * dt; txt(c, "+1", p.x, p.y, 30, "#16a34a"); }
          st.pops = st.pops.filter((p) => p.t > 0);
        });
      },

      // ====================================================== 2. الحرارة وحالات المادة
      heat(spec) {
        const T_ = { gas: ["اجعل الماء يغلي ويصير بخاراً", 20], solid: ["اجعل الماء جليداً", 20], liquid: ["اجعل الجليد يذوب ويصير ماءً", -20] }[spec.v];
        const c = labScreen(spec, T_[0], "◀ ▶ الأسهم: 🔥 سخّن أو ❄️ برّد · الزر السفلي (Enter): تأكّد");
        const state = (T) => (T <= 0 ? "solid" : T >= 100 ? "gas" : "liquid");
        const NAME = { solid: "🧊 صلب (جليد)", liquid: "💧 سائل (ماء)", gas: "💨 غاز (بخار)" };
        const WHY = {
          gas: "عند 100 درجة يغلي الماء: تتحرك حبيباته بسرعة كبيرة وتطير متباعدة، فيصير بخاراً (غاز).",
          solid: "تحت الصفر تبطئ الحبيبات وتتراصّ في صفوف مرتبة، فيصير الماء جليداً (صلب).",
          liquid: "فوق الصفر تتحرك حبيبات الجليد وتنزلق فوق بعضها، فيذوب ويصير ماءً (سائل).",
        };
        const X0 = 340, X1 = 660, Y0 = 50, Y1 = 352, N = 36;
        const st = { T: T_[1], wrong: 0, over: false };
        const lat = (i) => [500 - 4 * 34 + (i % 9) * 34, Y1 - 20 - Math.floor(i / 9) * 34];
        const P = K.range(0, N).map((i) => { const [lx, ly] = lat(i); return st.T <= 0 ? { x: lx, y: ly, vx: 0, vy: 0 } : { x: X0 + 20 + Math.random() * 280, y: Y1 - 20 - Math.random() * 120, vx: (Math.random() - 0.5) * 120, vy: 0 }; });
        const status = () => cheer(`الحرارة: <b dir="ltr">${st.T}°</b> ← ${NAME[state(st.T)]}`);
        status();
        S.key = labKeys(check, (d) => {
          if (st.over) return;
          st.T = clamp(st.T + (d === "right" || d === "up" ? 10 : -10), -30, 130);
          K.sfx.tick(); status();
        });
        S.help = () => cheer(spec.v === "gas" ? "💡 ارفع الحرارة إلى 100 درجة أو أكثر 🔥" : spec.v === "solid" ? "💡 اخفض الحرارة إلى صفر أو أقل ❄️" : "💡 ارفع الحرارة فوق الصفر، لكن أقل من 100");
        function check() {
          if (st.over) return;
          if (state(st.T) === spec.v) {
            st.over = true; K.sfx.ok(); K.confetti(12);
            done(st.wrong === 0, spec.n, WHY[spec.v]);
          } else {
            st.wrong++; K.sfx.bad();
            const up = spec.v === "gas" || (spec.v === "liquid" && st.T <= 0);
            cheer(`ليس بعد: الماء الآن ${NAME[state(st.T)]} · ${up ? "سخّن أكثر 🔥 (السهم ▶)" : "برّد أكثر ❄️ (السهم ◀)"}`);
          }
        }
        loop((dt, t) => {
          const s = state(st.T), sp = 1 + (st.T + 30) / 60;
          P.forEach((p, i) => {
            if (s === "solid") {
              const [lx, ly] = lat(i), j = 1 + (st.T + 30) / 12;
              p.x += (lx - p.x) * Math.min(1, dt * 5) + (Math.random() - 0.5) * j;
              p.y += (ly - p.y) * Math.min(1, dt * 5) + (Math.random() - 0.5) * j;
              p.vx = p.vy = 0;
            } else if (s === "liquid") {
              p.vx += (Math.random() - 0.5) * 900 * dt * sp; p.vy += 600 * dt + (Math.random() - 0.5) * 500 * dt;
              p.vx *= 0.97; p.vy *= 0.97;
              p.x += p.vx * dt; p.y += p.vy * dt;
              if (p.x < X0 + 12) { p.x = X0 + 12; p.vx = Math.abs(p.vx); } if (p.x > X1 - 12) { p.x = X1 - 12; p.vx = -Math.abs(p.vx); }
              if (p.y > Y1 - 12) { p.y = Y1 - 12; p.vy = -Math.abs(p.vy) * 0.4; }
              if (p.y < Y1 - 150) p.vy += 900 * dt;
            } else {
              const v = Math.hypot(p.vx, p.vy) || 1, want = 200 + st.T * 1.5;
              if (v < 10) { p.vx = (Math.random() - 0.5) * want; p.vy = -want; }
              p.vx *= 1 + (want / v - 1) * Math.min(1, dt * 3); p.vy *= 1 + (want / v - 1) * Math.min(1, dt * 3);
              p.x += p.vx * dt; p.y += p.vy * dt;
              if (p.x < X0 + 12) { p.x = X0 + 12; p.vx = Math.abs(p.vx); } if (p.x > X1 - 12) { p.x = X1 - 12; p.vx = -Math.abs(p.vx); }
              if (p.y < Y0 + 12) { p.y = Y0 + 12; p.vy = Math.abs(p.vy); } if (p.y > Y1 - 12) { p.y = Y1 - 12; p.vy = -Math.abs(p.vy); }
            }
          });
          c.clearRect(0, 0, 1000, 400);
          // الإناء
          c.fillStyle = "rgba(255,255,255,.55)"; rrect(c, X0, Y0, X1 - X0, Y1 - Y0, 18); c.fill();
          c.lineWidth = 6; c.strokeStyle = "#64748b"; c.stroke();
          const col = s === "solid" ? "#93c5fd" : s === "liquid" ? "#2563eb" : "#94a3b8";
          for (const p of P) { c.beginPath(); c.arc(p.x, p.y, 13, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = "#1e3a8a"; c.stroke(); }
          // اللهب أو الثلج تحت الإناء
          if (st.T >= 40) for (let k = 0; k < Math.min(5, 1 + ((st.T - 40) / 22) | 0); k++) emo(c, "🔥", 420 + k * 40, 380 + Math.sin(t * 9 + k) * 3, 34);
          if (st.T < 0) for (let k = 0; k < Math.min(5, 1 + (-st.T / 8) | 0); k++) emo(c, "❄️", 420 + k * 40, 380, 30);
          // ميزان الحرارة
          c.fillStyle = "#fff"; rrect(c, 150, 60, 40, 280, 20); c.fill(); c.strokeStyle = "#64748b"; c.lineWidth = 4; c.stroke();
          const h = 260 * (st.T + 30) / 160;
          c.fillStyle = "#ef4444"; rrect(c, 158, 330 - h, 24, h + 2, 12); c.fill();
          c.beginPath(); c.arc(170, 350, 28, 0, 7); c.fill();
          [[0, "0°"], [100, "100°"]].forEach(([v, l]) => { const y = 330 - 260 * (v + 30) / 160; c.fillStyle = "#1e3a8a"; c.fillRect(196, y - 2, 18, 4); txt(c, l, 252, y, 22); });
          txt(c, `${st.T}°`, 170, 26, 32, "#b91c1c");
          txt(c, NAME[s], 830, 200, 36, "#1e3a8a");
        });
      },

      // ====================================================== 3أ. المغناطيس
      magnet(spec) {
        const c = labScreen(spec, "حرّك المغناطيس واجمع كل الأشياء الحديدية", "الأسهم: حرّك المغناطيس 🧲 فوق الأشياء · ماذا ينجذب؟ وماذا لا ينجذب؟");
        const IRON = [["📎", "مشبك"], ["🔩", "برغي"], ["🧷", "دبوس"], ["⚙️", "ترس"], ["🪝", "خطاف"]];
        const OTHER = [["🪵", "خشب"], ["🧸", "دمية"], ["🍌", "موزة"], ["🎈", "بالون"], ["🥤", "كوب بلاستيك"], ["🧻", "ورق"], ["🍪", "بسكويت"]];
        const items = K.shuffle([...K.shuffle(IRON).slice(0, 4).map((x) => ({ e: x[0], n: x[1], iron: true })), ...K.shuffle(OTHER).slice(0, 4).map((x) => ({ e: x[0], n: x[1], iron: false }))]);
        items.forEach((it, i) => { it.x = 110 + i * 112; it.y = 340; it.hx = it.x; });
        const st = (window.physLab = { mx: 500, my: 110, got: 0, over: false, glow: 0, notes: [], items });
        S.key = labKeys(null, () => {});
        S.help = () => { st.glow = 4; cheer("💡 الأشياء المضيئة من حديد: اقترب منها بالمغناطيس"); };
        const status = () => cheer(`جمعتَ ${st.got} من 4 أشياء حديدية`);
        status();
        loop((dt, t) => {
          const dx = (S.held("right") ? 1 : 0) - (S.held("left") ? 1 : 0), dy = (S.held("down") ? 1 : 0) - (S.held("up") ? 1 : 0);
          st.mx = clamp(st.mx + dx * 460 * dt, 50, 950); st.my = clamp(st.my + dy * 460 * dt, 50, 300);
          st.glow = Math.max(0, st.glow - dt);
          for (const it of items) {
            const d = Math.hypot(it.x - st.mx, it.y - st.my);
            if (it.iron && !it.stuck) {
              if (d < 150 || it.fly) {
                it.fly = true;
                const k = Math.min(1, dt * 7);
                it.x += (st.mx - it.x) * k; it.y += (st.my + 40 - it.y) * k;
                if (Math.hypot(it.x - st.mx, it.y - st.my - 40) < 14) { it.stuck = true; it.slot = st.got++; K.sfx.pop(); status(); }
              }
            } else if (!it.iron && d < 120 && !it.told) { it.told = true; st.notes.push({ x: it.x, y: it.y - 50, t: 2.2, s: `${it.n}: لا ينجذب` }); K.sfx.tick(); }
            if (it.stuck) { const off = (it.slot - 1.5) * 34; it.x = st.mx + off; it.y = st.my + 44 + Math.abs(off) * 0.2; }
            if (!it.iron) it.x = it.hx + (it.told && d < 120 ? Math.sin(t * 20) * 2 : 0);
          }
          if (!st.over && st.got >= 4) { st.over = true; K.sfx.win(); K.confetti(14); done(true, spec.n, "المغناطيس يجذب الحديد فقط. الخشب والبلاستيك والورق والطعام لا تنجذب إليه."); }
          c.clearRect(0, 0, 1000, 400);
          c.fillStyle = "#d6a76c"; c.fillRect(0, 368, 1000, 32);
          for (const it of items) {
            if (it.iron && !it.stuck && st.glow > 0) { c.beginPath(); c.arc(it.x, it.y, 34, 0, 7); c.fillStyle = "rgba(250,204,21,.6)"; c.fill(); }
            if (!it.stuck) emo(c, it.e, it.x, it.y, 52);
          }
          c.strokeStyle = "rgba(220,38,38,.25)"; c.lineWidth = 3;
          for (let r = 60; r <= 150; r += 45) { c.beginPath(); c.arc(st.mx, st.my, r + Math.sin(t * 3) * 4, 0, 7); c.stroke(); }
          emo(c, "🧲", st.mx, st.my, 76);
          for (const it of items) if (it.stuck) emo(c, it.e, it.x, it.y, 40);
          for (const n of st.notes) { n.t -= dt; n.y -= 12 * dt; txt(c, n.s, n.x, n.y, 22, "#991b1b"); }
          st.notes = st.notes.filter((n) => n.t > 0);
        });
      },

      // ====================================================== 3ب. الدائرة الكهربائية
      circuit(spec) {
        const on = spec.v === "on";
        const COND = [["🥄", "ملعقة معدن"], ["🔑", "مفتاح معدني"], ["📎", "مشبك معدني"], ["🪙", "قطعة نقود"]];
        const INS = [["🪵", "عود خشب"], ["🧸", "دمية قماش"], ["🥤", "كوب بلاستيك"], ["🎈", "بالون"], ["🧦", "جورب"], ["🧻", "ورقة"]];
        const opts = K.shuffle(on ? [{ o: K.pick(COND), c: true }, ...K.shuffle(INS).slice(0, 3).map((o) => ({ o, c: false }))]
          : [{ o: K.pick(INS), c: false }, ...K.shuffle(COND).slice(0, 3).map((o) => ({ o, c: true }))]);
        const title = on ? "ضع في الفراغ شيئاً يُضيء المصباح" : "أي شيء لا يُضيء المصباح؟ (عازل)";
        const c = labScreen(spec, title, "الأسهم: اختر · الزر السفلي (Enter): ضعه في الفراغ",
          () => `<div class="opts ph four slim">${opts.map((x, j) => `<button class="opt f" ${K.act("o" + j, (el) => put(x, el))}><span class="emo">${x.o[0]}</span><span>${x.o[1]}</span></button>`).join("")}</div>`, true);
        const st = { obj: null, lit: false, over: false, wrong: 0, ph: 0 };
        S.help = () => {
          const els = [...K.app.querySelectorAll(".opt")].filter((e, j) => opts[j].c !== on && !e.dataset.dead);
          if (els.length > 1) { const e = K.pick(els); e.dataset.dead = "1"; e.classList.add("dead"); st.wrong++; cheer("💡 حذفنا خياراً خاطئاً"); }
        };
        function put(x, el) {
          if (st.over || el.dataset.dead) return;
          st.obj = x.o[0]; st.lit = x.c;
          if (x.c === on) {
            st.over = true; el.classList.add("ok"); K.sfx.ok(); K.confetti(10);
            done(st.wrong === 0, spec.n, on ? `${x.o[1]} من معدن، والمعادن توصل الكهرباء: اكتملت الدائرة فأضاء المصباح!`
              : `${x.o[1]} عازل لا يوصل الكهرباء، فبقي المصباح مطفأً. نصنع من العوازل أغطية الأسلاك لتحمينا.`);
          } else {
            st.wrong++; el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad();
            cheer(`${x.o[1]} ${x.c ? "يوصل الكهرباء فأضاء المصباح 💡" : "لا يوصل الكهرباء ❌"} · حاول مرة أخرى`);
          }
        }
        // مسار السلك: مستطيل، والفراغ في الأسفل بين 440 و560
        const path = [[250, 80], [750, 80], [750, 320], [250, 320]];
        const per = 2 * 500 + 2 * 240;
        const at = (u) => {
          u = ((u % per) + per) % per;
          if (u < 500) return [250 + u, 80]; u -= 500;
          if (u < 240) return [750, 80 + u]; u -= 240;
          if (u < 500) return [750 - u, 320]; u -= 500;
          return [250, 320 - u];
        };
        loop((dt, t) => {
          st.ph += dt * 160;
          c.clearRect(0, 0, 1000, 400);
          c.lineWidth = 10; c.strokeStyle = "#b45309"; c.lineCap = "round";
          c.beginPath(); c.moveTo(440, 320); c.lineTo(250, 320); c.lineTo(250, 80); c.lineTo(750, 80); c.lineTo(750, 320); c.lineTo(560, 320); c.stroke();
          // البطارية
          c.fillStyle = "#1f2937"; rrect(c, 210, 150, 80, 110, 12); c.fill();
          c.fillStyle = "#f59e0b"; rrect(c, 210, 150, 80, 40, 12); c.fill();
          c.fillStyle = "#6b7280"; c.fillRect(235, 136, 30, 16);
          txt(c, "+", 250, 172, 30, "#1f2937"); txt(c, "−", 250, 232, 30, "#fff");
          // المصباح
          if (st.lit) { const g = c.createRadialGradient(500, 80, 10, 500, 80, 140); g.addColorStop(0, "rgba(253,224,71,.95)"); g.addColorStop(1, "rgba(253,224,71,0)"); c.fillStyle = g; c.beginPath(); c.arc(500, 80, 140, 0, 7); c.fill(); }
          c.beginPath(); c.arc(500, 74, 40, 0, 7); c.fillStyle = st.lit ? "#fde047" : "#e5e7eb"; c.fill(); c.lineWidth = 4; c.strokeStyle = "#64748b"; c.stroke();
          c.fillStyle = "#64748b"; c.fillRect(480, 108, 40, 22);
          // الفراغ والشيء الموضوع فيه
          c.fillStyle = "#fde68a"; c.beginPath(); c.arc(440, 320, 9, 0, 7); c.arc(560, 320, 9, 0, 7); c.fill();
          if (st.obj) emo(c, st.obj, 500, 320, 72); else txt(c, "؟", 500, 320, 54, "#be185d");
          // الإلكترونات تتحرك عندما يضيء
          if (st.lit) { c.fillStyle = "#2563eb"; for (let k = 0; k < 16; k++) { const [x, y] = at(st.ph + k * (per / 16)); if (!(y === 320 && x > 440 && x < 560)) { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); } } }
          txt(c, st.lit ? "⚡ الدائرة مغلقة" : st.obj ? "✋ الدائرة مفتوحة" : "", 870, 200, 26, st.lit ? "#15803d" : "#991b1b");
        });
      },

      // ====================================================== 4أ. ادفع الصندوق (القوة والاحتكاك)
      push(spec) {
        const SURF = K.pick([
          { n: "الجليد", e: "⛸️", s: 10, a: 170, col: "#bae6fd", lo: 3, hi: 8, why: "على الجليد الاحتكاك قليل جداً، فدفعة صغيرة تكفي ليتزلّج الصندوق بعيداً." },
          { n: "أرضية الخشب", e: "🪵", s: 6, a: 280, col: "#d6a76c", lo: 4, hi: 9, why: "على الخشب الاحتكاك متوسط: نحتاج دفعة أقوى من الجليد." },
          { n: "العشب", e: "🌱", s: 4, a: 420, col: "#86efac", lo: 5, hi: 9, why: "العشب يحتك بالصندوق كثيراً فيوقفه بسرعة، لهذا نحتاج دفعة قوية." },
        ]);
        const X0 = 90, pStar = SURF.lo + ((Math.random() * (SURF.hi - SURF.lo + 1)) | 0);
        const zone = [X0 + SURF.s * (pStar - 0.45) ** 2, X0 + SURF.s * (pStar + 0.45) ** 2];
        const c = labScreen(spec, `ادفع الصندوق ليقف عند العلم 🚩 (على ${SURF.n})`, "◀ ▶ الأسهم: قوة الدفع · الزر السفلي (Enter): ادفع!");
        const st = (window.physLab = { p: 5, x: X0, v: 0, run: false, over: false, wrong: 0, helped: false, ghost: null, ans: pStar });
        const status = () => cheer(`قوة الدفع: <b>${st.p}</b> من 10`);
        status();
        S.key = labKeys(go, (d) => { if (st.run || st.over) return; st.p = clamp(st.p + (d === "right" || d === "up" ? 1 : -1), 1, 10); K.sfx.tick(); status(); });
        S.help = () => { st.helped = true; cheer(`💡 جرّب قوة بين ${Math.max(1, pStar - 1)} و${Math.min(10, pStar + 1)}`); };
        function go() {
          if (st.run || st.over) return;
          st.x = X0; st.v = Math.sqrt(2 * SURF.a * SURF.s * st.p * st.p); st.run = true; K.sfx.pop();
        }
        function stopped() {
          st.run = false;
          if (st.x >= zone[0] - 6 && st.x <= zone[1] + 6) {
            st.over = true; K.sfx.win(); K.confetti(14);
            done(st.wrong <= 1 && !st.helped, spec.n, SURF.why);
          } else {
            st.wrong++; K.sfx.bad();
            cheer(st.x < zone[0] ? "وقف قبل العلم: ادفع أقوى قليلاً 💪 (السهم ▶)" : "تجاوز العلم: ادفع أخف قليلاً 🤏 (السهم ◀)");
            st.ghost = st.x;
            if (st.wrong >= 4 && !st.helped) S.help();
            K.later(() => { if (!st.over) { st.x = X0; status(); } }, 1400);
          }
        }
        loop((dt) => {
          if (st.run) { st.x += st.v * dt; st.v -= SURF.a * dt; if (st.v <= 0) stopped(); }
          c.clearRect(0, 0, 1000, 400);
          c.fillStyle = SURF.col; c.fillRect(0, 300, 1000, 100);
          for (let x = 40; x < 1000; x += 120) emo(c, SURF.e, x, 352, 30);
          c.fillStyle = "rgba(34,197,94,.35)"; c.fillRect(zone[0] - 35, 200, zone[1] - zone[0] + 70, 100);
          emo(c, "🚩", (zone[0] + zone[1]) / 2, 170, 56);
          if (st.ghost != null && !st.run) { c.globalAlpha = 0.3; emo(c, "📦", st.ghost, 262, 72); c.globalAlpha = 1; }
          emo(c, "📦", st.x, 262, 72);
          if (!st.run && st.x === X0) emo(c, "🫷", X0 - 62, 262, 52);
          // مقياس القوة
          for (let k = 0; k < 10; k++) { c.fillStyle = k < st.p ? (k < 4 ? "#22c55e" : k < 7 ? "#f59e0b" : "#ef4444") : "rgba(255,255,255,.7)"; rrect(c, 40 + k * 34, 40, 28, 40, 6); c.fill(); }
          txt(c, `القوة ${st.p}`, 430, 60, 28, "#1e3a8a", "left");
          txt(c, `الاحتكاك على ${SURF.n}: ${SURF.s >= 10 ? "قليل" : SURF.s <= 4 ? "كبير" : "متوسط"}`, 960, 60, 26, "#7c2d12", "right");
        });
      },

      // ====================================================== 4ب. لوح التوازن (العتلة)
      seesaw(spec) {
        const PAIRS = [];
        for (let wL = 1; wL <= 4; wL++) for (let dL = 1; dL <= 4; dL++) for (let wR = 1; wR <= 4; wR++) for (let dR = 1; dR <= 4; dR++)
          if (wL * dL === wR * dR && wL !== wR) PAIRS.push([wL, dL, wR, dR]);
        const [wL, dL, wR, dR] = K.pick(PAIRS);
        const c = labScreen(spec, "حرّك ثقلك الأزرق حتى يتوازن اللوح", "◀ ▶ الأسهم: حرّك الثقل الأزرق · الزر السفلي (Enter): اترك اللوح");
        const st = { d: dR === 1 ? 4 : 1, rel: false, ang: 0, target: 0, over: false, wrong: 0, helped: false, t: 0 };
        S.key = labKeys(release, (d) => { if (st.rel || st.over) return; st.d = clamp(st.d + (d === "right" || d === "up" ? 1 : -1), 1, 4); K.sfx.tick(); });
        S.help = () => { st.helped = true; cheer(`💡 اليسار: ${wL} كغ × ${dL} = ${wL * dL} · ابحث عن مكان يكون فيه ${wR} × البُعد = ${wL * dL}`); };
        cheer(`الثقل الأيسر ${wL} كغ، وثقلك الأزرق ${wR} كغ`);
        function release() {
          if (st.rel || st.over) return;
          st.rel = true; st.t = 0;
          const tq = wR * st.d - wL * dL;
          st.target = tq === 0 ? 0 : Math.sign(tq) * 0.24;
          K.sfx.pop();
        }
        loop((dt, t) => {
          if (st.rel) {
            st.ang += (st.target - st.ang) * Math.min(1, dt * 3.5); st.t += dt;
            if (st.t > 1.5 && !st.over) {
              if (st.target === 0) { st.over = true; K.sfx.win(); K.confetti(14); done(st.wrong <= 1 && !st.helped, spec.n, `توازن! الثقل × البُعد متساوٍ في الجهتين: ${wL} × ${dL} = ${wR} × ${st.d}. لهذا يجلس الثقيل قريباً من الوسط.`); }
              else {
                st.wrong++; K.sfx.bad();
                cheer(st.target > 0 ? "جهتك أثقل: قرّب الثقل الأزرق من الوسط ◀" : "الجهة الأخرى أثقل: أبعِد الثقل الأزرق عن الوسط ▶");
                if (st.wrong >= 4 && !st.helped) S.help();
                st.rel = false; st.target = 0;
              }
            }
          } else st.ang += (0 - st.ang) * Math.min(1, dt * 5);
          c.clearRect(0, 0, 1000, 400);
          c.fillStyle = "#86efac"; c.fillRect(0, 372, 1000, 28);
          // الدعامة
          c.fillStyle = "#78350f"; c.beginPath(); c.moveTo(500, 262); c.lineTo(450, 372); c.lineTo(550, 372); c.closePath(); c.fill();
          if (!st.rel && !st.over) { c.fillStyle = "#a8a29e"; c.fillRect(80, 282, 40, 90); c.fillRect(880, 282, 40, 90); }
          c.save(); c.translate(500, 262); c.rotate(st.ang);
          c.fillStyle = "#b45309"; rrect(c, -440, -10, 880, 20, 8); c.fill();
          for (let k = 1; k <= 4; k++) for (const sg of [-1, 1]) { c.fillStyle = "#fde68a"; c.fillRect(sg * k * 100 - 2, -10, 4, 20); txt(c, String(k), sg * k * 100, 26, 20, "#78350f"); }
          const block = (x, w, col) => { for (let k = 0; k < w; k++) { c.fillStyle = col; rrect(c, x - 26, -12 - (k + 1) * 34, 52, 32, 6); c.fill(); } txt(c, `${w} كغ`, x, -12 - w * 34 - 24, 24, col === "#f97316" ? "#9a3412" : "#1e40af"); };
          block(-dL * 100, wL, "#f97316");
          block(st.d * 100, wR, "#3b82f6");
          c.restore();
          txt(c, "الأرقام = البُعد عن الوسط", 500, 24, 22, "#78350f");
          if (!st.rel && !st.over) emo(c, "◀ ▶", 500 + st.d * 100, 120 - wR * 10, 26);
          void t;
        });
      },

      // ====================================================== 5. المدفع (القوس والجاذبية، على الأرض وعلى القمر)
      launch(spec) {
        const moon = spec.v === "moon";
        const W = moon ? { g: 66.7, n: "القمر", sky: "#0f172a", ground: "#9ca3af", speed: 1.4 } : { g: 400, n: "الأرض", sky: "#bae6fd", ground: "#4ade80", speed: 1 };
        const K60 = 60, CX = 90, GY = 350;
        // مكان السقوط الحقيقي من فوهة المدفع
        const muzzle = (a) => { const r = a * Math.PI / 180; return [CX + Math.cos(r) * 50, GY - 12 - Math.sin(r) * 50]; };
        const landX = (p, a) => {
          const r = a * Math.PI / 180, v = K60 * p, [x0, y0] = muzzle(a), h = GY - y0, vy = v * Math.sin(r);
          return x0 + v * Math.cos(r) * (vy + Math.sqrt(vy * vy + 2 * W.g * h)) / W.g;
        };
        let tx = 700;
        for (let n = 0; n < 200; n++) {
          tx = 430 + Math.random() * 490;
          let ok = false;
          for (let p = 1; p <= 10 && !ok; p++) for (let a = 20; a <= 70; a += 5) if (Math.abs(landX(p, a) - tx) < 24) { ok = true; break; }
          if (ok) break;
        }
        const c = labScreen(spec, `أصب الهدف 🎯 على ${W.n}`, "▲ ▼ الزاوية · ◀ ▶ القوة · الزر السفلي (Enter): أطلق!");
        const st = (window.physLab = { a: 45, p: moon ? 2 : 5, ball: null, trail: [], old: [], shots: 0, over: false, helped: false, tt: 0, sol: null });
        for (let p = 1; p <= 10 && !st.sol; p++) for (let a = 20; a <= 70; a += 5) if (Math.abs(landX(p, a) - tx) < 24) { st.sol = { p, a }; break; }
        const stars = K.range(0, 40).map(() => [Math.random() * 1000, Math.random() * 300]);
        S.key = labKeys(fire, (d) => {
          if (st.ball || st.over) return;
          if (d === "up" || d === "down") st.a = clamp(st.a + (d === "up" ? 5 : -5), 20, 70);
          else st.p = clamp(st.p + (d === "right" ? 1 : -1), 1, 10);
          K.sfx.tick();
        });
        S.help = () => { st.helped = true; cheer("💡 الخط المنقّط يبيّن أين ستطير الكرة"); };
        function fire() {
          if (st.ball || st.over) return;
          const v = K60 * st.p, r = st.a * Math.PI / 180;
          const [x0, y0] = muzzle(st.a);
          st.ball = { x: x0, y: y0, vx: v * Math.cos(r), vy: -v * Math.sin(r) };
          st.trail = []; st.shots++; K.sfx.pop();
        }
        loop((dt0) => {
          const dt = dt0 * W.speed;
          if (st.ball) {
            const b = st.ball;
            b.vy += W.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
            st.tt += dt; if (st.tt > 0.04 * W.speed * (moon ? 2 : 1)) { st.tt = 0; st.trail.push([b.x, b.y]); }
            if (b.y >= GY || b.x > 1020) {
              const hit = Math.abs(b.x - tx) < 42 && b.y >= GY;
              st.old = st.trail; st.ball = null;
              if (hit) {
                st.over = true; K.sfx.win(); K.confetti(18);
                done(st.shots <= 3 && !st.helped, spec.n, moon ? "على القمر الجاذبية أضعف بست مرات: دفعة صغيرة تُطير الكرة بعيداً، وتبقى في الهواء وقتاً أطول!"
                  : "أصبت! الجاذبية تشدّ الكرة إلى الأسفل وهي تطير، فتصنع قوساً. الزاوية والقوة تغيّران مكان سقوطها.");
              } else {
                K.sfx.bad();
                cheer(b.x < tx ? "سقطت قبل الهدف: زد القوة أو غيّر الزاوية" : "طارت أبعد من الهدف: خفّف القوة أو غيّر الزاوية");
                if (st.shots >= 6 && !st.helped) S.help();
              }
            }
          }
          c.fillStyle = W.sky; c.fillRect(0, 0, 1000, 400);
          if (moon) { c.fillStyle = "#fff"; for (const [x, y] of stars) c.fillRect(x, y, 3, 3); emo(c, "🌍", 760, 80, 60); }
          c.fillStyle = W.ground; c.fillRect(0, GY, 1000, 50);
          if (moon) { c.fillStyle = "#6b7280"; [[300, 370], [620, 380], [850, 366]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 30, 7, 0, 0, 7); c.fill(); }); }
          emo(c, "🎯", tx, GY - 26, 58);
          // التوقع (المساعدة)
          if (st.helped && !st.ball) {
            const v = K60 * st.p, r = st.a * Math.PI / 180;
            c.fillStyle = moon ? "rgba(255,255,255,.7)" : "rgba(30,58,138,.55)";
            for (let k = 1; k < 60; k++) { const tt = k * (moon ? 0.12 : 0.05); const [x0, y0] = muzzle(st.a), x = x0 + v * Math.cos(r) * tt, y = y0 - v * Math.sin(r) * tt + W.g * tt * tt / 2; if (y > GY || x > 1000) break; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
          }
          c.fillStyle = moon ? "rgba(255,255,255,.35)" : "rgba(30,58,138,.25)";
          for (const [x, y] of st.old) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
          c.fillStyle = "#f97316";
          for (const [x, y] of st.trail) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
          // المدفع
          c.save(); c.translate(CX, GY - 12); c.rotate(-st.a * Math.PI / 180);
          c.fillStyle = "#334155"; rrect(c, 0, -13, 58, 26, 8); c.fill(); c.restore();
          c.fillStyle = "#475569"; c.beginPath(); c.arc(CX, GY - 10, 24, Math.PI, 0); c.fill();
          if (st.ball) { c.fillStyle = "#111827"; c.beginPath(); c.arc(st.ball.x, st.ball.y, 11, 0, 7); c.fill(); }
          const hud = moon ? "#fff" : "#1e3a8a";
          txt(c, `الزاوية: ${st.a} درجة`, 40, 34, 28, hud, "left");
          txt(c, `القوة ${st.p}`, 40, 72, 28, hud, "left");
          for (let k = 0; k < 10; k++) { c.fillStyle = k < st.p ? "#f59e0b" : "rgba(255,255,255,.5)"; c.fillRect(200 + k * 22, 60, 18, 24); }
          txt(c, `الجاذبية على ${W.n}: ${moon ? "ضعيفة" : "عادية"}`, 960, 34, 24, moon ? "#fde68a" : "#7c2d12", "right");
          txt(c, `الرمية ${st.shots}`, 960, 72, 24, hud, "right");
        });
      },
    };
    next();
  }

  K.start(home);
})();
