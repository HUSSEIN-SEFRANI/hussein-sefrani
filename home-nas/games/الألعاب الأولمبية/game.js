// الألعاب الأولمبية — خمس مسابقات ضد ثلاثة أبطال آليين من بلدان العالم، وجدول ميداليات
//   🏃 سباق ١٠٠ متر    : اضغط الزر السفلي (أو Enter) بسرعة لتجري
//   🦘 الوثب الطويل     : اضغط بسرعة لتجري، ثم مرة واحدة لتختار زاوية القفز (٣ محاولات)
//   🏊 السباحة ٥٠ متراً : اضغط حين يكون المؤشر في الأخضر (الإيقاع لا السرعة)
//   🏹 الرماية بالقوس   : وجّه بالأسهم أو العصا اليسرى (والريح تدفعك)، واضغط لترمي (٦ أسهم)
//   🏋️ رفع الأثقال      : اضغط بسرعة لترفع، ثم وازن بالأسهم ← → ثلاث ثوانٍ
// الأزرار بالموقع (البند 52): السفلي = الفعل، الأيمن = رجوع، الأسهم/العصا اليسرى = التوجيه. زر PS للتلفاز.
(() => {
  "use strict";
  const save = K.store("olympics", { lvl: 0, flag: 0, medals: { g: 0, s: 0, b: 0 }, best: {}, cups: 0 });
  const AR = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const fmt = (n, dec) => AR(Number(n).toFixed(dec)).replace(".", "٫");
  const rand = (a, b) => a + Math.random() * (b - a);
  const EMO = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  const FONT = '"Baloo","Noto Sans Arabic",Tahoma,sans-serif';
  const HELP = `<div class="help"><b>الأسهم</b> للتنقل · <b>الزر السفلي</b> أو <b>Enter</b> للاختيار · <b>الزر الأيمن</b> أو <b>Backspace</b> للرجوع</div>`;

  const FLAGS = [["SA", "السعودية"], ["EG", "مصر"], ["MA", "المغرب"], ["DZ", "الجزائر"], ["TN", "تونس"], ["JO", "الأردن"], ["PS", "فلسطين"],
    ["IQ", "العراق"], ["SY", "سوريا"], ["LB", "لبنان"], ["AE", "الإمارات"], ["QA", "قطر"], ["KW", "الكويت"], ["OM", "عُمان"], ["BH", "البحرين"],
    ["YE", "اليمن"], ["LY", "ليبيا"], ["SD", "السودان"], ["BE", "بلجيكا"], ["FR", "فرنسا"], ["DE", "ألمانيا"], ["ES", "إسبانيا"], ["IT", "إيطاليا"],
    ["GB", "بريطانيا"], ["TR", "تركيا"], ["US", "أمريكا"], ["CA", "كندا"], ["BR", "البرازيل"], ["JM", "جامايكا"], ["KE", "كينيا"], ["NG", "نيجيريا"],
    ["CN", "الصين"], ["JP", "اليابان"], ["KR", "كوريا"], ["AU", "أستراليا"], ["IN", "الهند"]];
  if (!FLAGS[save.flag]) save.flag = 0;
  const flagEmo = (code) => String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  const LEVELS = [{ n: "سهل", emo: "🙂" }, { n: "متوسط", emo: "😎" }, { n: "أبطال", emo: "🔥" }];
  if (!LEVELS[save.lvl]) save.lvl = 0;
  const MED = ["🥇", "🥈", "🥉"];
  const MEDN = ["ذهبية", "فضية", "برونزية"];

  // المسابقات. cpu: مجال نتائج الأبطال الآليين لكل صعوبة. low: الأقل أفضل (الوقت).
  const EV = {
    sprint: { id: "sprint", name: "سباق ١٠٠ متر", emo: "🏃", sub: "اضغط بسرعة!", bg: "linear-gradient(135deg,#f97316,#c2410c)",
      low: true, dec: 2, unit: "ث", cpu: [[15.5, 19], [12, 14], [10.2, 11.4]], play: sprint },
    long: { id: "long", name: "الوثب الطويل", emo: "🦘", sub: "اجرِ ثم اقفز", bg: "linear-gradient(135deg,#eab308,#a16207)",
      dec: 2, unit: "م", cpu: [[3.8, 5.2], [5.6, 6.8], [7.1, 8.2]], play: longJump },
    swim: { id: "swim", name: "السباحة ٥٠ متراً", emo: "🏊", sub: "اضغط مع الإيقاع", bg: "linear-gradient(135deg,#0ea5e9,#1d4ed8)",
      low: true, dec: 2, unit: "ث", cpu: [[40, 48], [30, 35], [24, 27]], play: swim },
    archery: { id: "archery", name: "الرماية بالقوس", emo: "🏹", sub: "صوّب على الأصفر", bg: "linear-gradient(135deg,#22c55e,#15803d)",
      step: 1, unit: "نقطة", cpu: [[28, 38], [40, 48], [49, 55]], play: archery },
    weights: { id: "weights", name: "رفع الأثقال", emo: "🏋️", sub: "ارفع ثم وازن", bg: "linear-gradient(135deg,#a855f7,#6d28d9)",
      step: 20, unit: "كغ", cpu: [[60, 100], [120, 160], [160, 200]], play: weights },
  };
  const EVLIST = [EV.sprint, EV.long, EV.swim, EV.archery, EV.weights];
  const fmtVal = (ev, v) => `${ev.dec ? fmt(v, ev.dec) : AR(v)} ${ev.unit}`;
  const cpuVal = (ev) => { const [a, b] = ev.cpu[save.lvl], v = rand(a, b); return ev.step ? Math.round(v / ev.step) * ev.step : +v.toFixed(ev.dec); };
  const me = () => ({ code: FLAGS[save.flag][0], name: FLAGS[save.flag][1], me: true });
  const rivals = () => K.shuffle(FLAGS.map((_, i) => i).filter((i) => i !== save.flag)).slice(0, 3).map((i) => ({ code: FLAGS[i][0], name: FLAGS[i][1] }));
  const newTour = () => ({ i: 0, rivals: rivals(), res: [], tab: {} });

  // ---------------------------------------------------------------- رسم مشترك
  function emo(g, e, x, y, size, flip) {
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.font = `${size}px ${EMO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(e, 0, 0); g.restore();
  }
  function txt(g, s, x, y, size, color = "#fff", align = "center", stroke = "#1e3a8a") {
    g.save(); g.direction = "rtl"; g.font = `800 ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = "middle";
    if (stroke) { g.lineWidth = size / 5; g.strokeStyle = stroke; g.lineJoin = "round"; g.strokeText(s, x, y); }
    g.fillStyle = color; g.fillText(s, x, y); g.restore();
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function panel(g, x, y, w, h) { g.fillStyle = "rgba(255,255,255,.92)"; rr(g, x, y, w, h, 22); g.fill(); }
  const CROWD = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#f8fafc", "#14b8a6"];
  function stands(g, bottom, t, cheer) {
    const sky = g.createLinearGradient(0, 0, 0, bottom); sky.addColorStop(0, "#38bdf8"); sky.addColorStop(1, "#bae6fd");
    g.fillStyle = sky; g.fillRect(0, 0, 1280, bottom);
    g.fillStyle = "#475569"; g.fillRect(0, bottom - 190, 1280, 190);
    for (let r = 0; r < 6; r++) for (let i = 0; i < 62; i++) {
      const h = (i * 37 + r * 91) % CROWD.length, j = cheer ? Math.max(0, Math.sin(t * 9 + i * 1.7 + r)) * 7 : Math.sin(t * 2 + i + r) * 1.5;
      g.fillStyle = CROWD[h]; g.beginPath(); g.arc(i * 21 + (r % 2) * 10, bottom - 172 + r * 28 - j, 9, 0, 7); g.fill();
    }
    g.fillStyle = "#1e3a8a"; g.fillRect(0, bottom - 22, 1280, 22);
  }
  function bar(g, x, y, w, h, frac, color) {
    g.fillStyle = "rgba(30,58,138,.18)"; rr(g, x, y, w, h, h / 2); g.fill();
    if (frac > 0.01) { g.fillStyle = color; rr(g, x + w * (1 - Math.min(1, frac)), y, w * Math.min(1, frac), h, h / 2); g.fill(); }
  }

  // ---------------------------------------------------------------- ساحة المسابقة (لوحة رسم + أزرار)
  // o = { count, hint, init(S), ok(S), update(S, dt), draw(S, g), done(val) }
  function arena(o) {
    K.begin();
    K.paint(`<canvas class="ar"></canvas><div class="banner"></div>
      <div class="hint">${o.hint} · <b>الزر الأيمن</b> أو <b>Backspace</b>: خروج</div>`);
    const cv = K.app.querySelector("canvas"), g = cv.getContext("2d"), banner = K.app.querySelector(".banner");
    const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
    fit(); addEventListener("resize", fit);
    const keys = new Set();
    const S = { t: 0, phase: o.count ? "count" : "go", cd: 3.999, pad: { x: 0, y: 0 } };
    S.dx = () => ((keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0)) || S.pad.x;
    S.dy = () => ((keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0)) || S.pad.y;
    let bt = 0;
    S.say = (html, sec = 1.2) => { banner.innerHTML = html ? `<span>${html}</span>` : ""; bt = sec; };
    S.end = (val, wait = 1.4) => { if (S.phase === "end") return; S.phase = "end"; K.later(() => o.done(val), wait * 1000); };
    let raf = 0, last = performance.now(), lastN = 4;
    K.mode = {
      key(e) {
        if (e.key === "Backspace") { K.back(); return true; }
        if (e.key === "Enter" || e.key === " ") { if (!e.repeat && S.phase === "go" && o.ok) o.ok(S); return true; }
        if (e.key && e.key.startsWith("Arrow")) { if (!e.pad) keys.add(e.key); return true; }
        return false;
      },
      keyup(e) { keys.delete(e.key); },
      // التوجيه المستمر من الأسهم والعصا اليسرى في كل الأيادي؛ «موافق» و«رجوع» يرسلهما kit.js (مع إعداد التلفاز)
      poll(pads) {
        let x = 0, y = 0;
        for (const p of pads) {
          const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed), ax = p.axes[0] || 0, ay = p.axes[1] || 0;
          const px = b(15) ? 1 : b(14) ? -1 : Math.abs(ax) > 0.25 ? ax : 0, py = b(13) ? 1 : b(12) ? -1 : Math.abs(ay) > 0.25 ? ay : 0;
          if (Math.abs(px) > Math.abs(x)) x = px;
          if (Math.abs(py) > Math.abs(y)) y = py;
        }
        S.pad = { x, y };
        return false;
      },
      stop() { cancelAnimationFrame(raf); removeEventListener("resize", fit); },
    };
    const loop = (ts) => {
      const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts;
      S.t += dt;
      if (S.phase === "count") {
        S.cd -= dt;
        const n = Math.ceil(S.cd);
        if (n !== lastN) { lastN = n; if (n > 0) { S.say(AR(n), 2); K.tone(520, 0.15, "square", 0.1); } }
        if (S.cd <= 0) { S.phase = "go"; S.say("انطلق!", 0.8); K.tone(880, 0.35, "square", 0.12); }
      } else o.update(S, dt);
      if (bt > 0) { bt -= dt; if (bt <= 0) banner.innerHTML = ""; }
      g.setTransform(cv.width / 1280, 0, 0, cv.height / 720, 0, 0);
      o.draw(S, g);
      raf = requestAnimationFrame(loop);
    };
    o.init(S);
    raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- نهاية المسابقة والمراكز
  function finishEvent(ev, val, riv, cpuVals, tour) {
    const all = [{ ...me(), val }, ...riv.map((r, i) => ({ ...r, val: cpuVals[i] }))];
    all.sort((a, b) => (ev.low ? a.val - b.val : b.val - a.val) || (a.me ? -1 : b.me ? 1 : 0));
    const place = all.findIndex((x) => x.me) + 1, medal = place <= 3 ? place : 0;
    const old = save.best[ev.id], rec = val > 0 && (old == null || (ev.low ? val < old : val > old));
    if (rec) save.best[ev.id] = val;
    if (medal) save.medals["gsb"[medal - 1]]++;
    save.save();
    if (tour) {
      tour.res.push({ ev: ev.id, val, place, medal });
      all.forEach((x, i) => { const t = (tour.tab[x.code] = tour.tab[x.code] || { code: x.code, name: x.name, me: !!x.me, g: 0, s: 0, b: 0 }); if (i < 3) t["gsb"[i]]++; });
    }
    K.replace(podiumScreen, { ev, all, place, medal, val, rec, tour });
  }

  function podiumScreen(r) {
    K.begin();
    const { ev, all, medal, tour } = r;
    const col = (i) => { const x = all[i]; return `<div class="pod p${i + 1}${x.me ? " me" : ""}">
      <span class="emo fl">${flagEmo(x.code)}</span><b>${x.me ? "أنت" : x.name}</b><small>${fmtVal(ev, x.val)}</small>
      <div class="blk"><span class="emo">${MED[i]}</span></div></div>`; };
    const four = all[3];
    const title = medal ? `ميدالية ${MEDN[medal - 1]}!` : "المركز الرابع";
    let next = "";
    if (tour && tour.i < EVLIST.length - 1) {
      const n = EVLIST[tour.i + 1];
      next = `<button class="btn f go" ${K.act("next", () => { tour.i++; K.replace(n.play, tour); })}><span class="emo">${n.emo}</span> التالي: ${n.name} ←</button>`;
    } else if (tour) next = `<button class="btn f go" ${K.act("next", () => K.replace(ceremonyScreen, tour))}><span class="emo">🏆</span> حفل الختام ←</button>`;
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill"><span class="emo">${ev.emo}</span> ${ev.name}${tour ? ` · ${AR(tour.i + 1)} من ${AR(EVLIST.length)}` : ""}</span></div>
      <h1>${medal ? `<span class="emo">${MED[medal - 1]}</span> ` : ""}${title}</h1>
      <div class="sub">نتيجتك: ${fmtVal(ev, r.val)}${r.rec ? " · <span class=\"recd\">🎉 رقمك القياسي الجديد!</span>" : ""}</div>
      <div class="podium">${col(1)}${col(0)}${col(2)}</div>
      <div class="fourth${four.me ? " me" : ""}">٤. <span class="emo">${flagEmo(four.code)}</span> ${four.me ? "أنت" : four.name} — ${fmtVal(ev, four.val)}</div>
      <div class="nav">
        ${next || `<button class="btn f go" ${K.act("again", () => K.replace(ev.play, null))}><span class="emo">🔁</span> مرة أخرى</button>`}
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>
      ${HELP}`, tour || medal ? "next" : "again");
    if (!K.app.querySelector('[data-k="next"]')) K.focus(K.app.querySelector('[data-k="again"]'));
    if (medal) { K.sfx.win(); K.confetti(medal === 1 ? 50 : 26, medal === 1 ? "🥇⭐🎉✨" : medal === 2 ? "🥈⭐🎉" : "🥉⭐🎈"); }
    K.later(() => K.tts(medal ? `ميدالية ${MEDN[medal - 1]}` : "حاول مرة أخرى"), 400);
  }

  function ceremonyScreen(tour) {
    K.begin();
    const rows = Object.values(tour.tab).sort((a, b) => b.g - a.g || b.s - a.s || b.b - a.b || (a.me ? -1 : b.me ? 1 : 0));
    const champ = rows[0].me;
    if (!tour.saved) { tour.saved = true; if (champ) { save.cups++; save.save(); } }
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill"><span class="emo">🏆</span> حفل الختام · جدول الميداليات</span></div>
      <h1>${champ ? "أنت بطل الألعاب! <span class=\"emo\">🏆</span>" : "انتهت البطولة! <span class=\"emo\">👏</span>"}</h1>
      <table class="medt">
        <tr><th></th><th>البلد</th><th><span class="emo">🥇</span></th><th><span class="emo">🥈</span></th><th><span class="emo">🥉</span></th></tr>
        ${rows.map((x, i) => `<tr class="${x.me ? "me" : ""}"><td>${AR(i + 1)}</td><td><span class="emo">${flagEmo(x.code)}</span> ${x.me ? `أنت (${x.name})` : x.name}</td>
          <td>${AR(x.g)}</td><td>${AR(x.s)}</td><td>${AR(x.b)}</td></tr>`).join("")}
      </table>
      <div class="nav">
        <button class="btn f go" ${K.act("again", () => K.replace(tourIntro, newTour()))}><span class="emo">🔁</span> بطولة جديدة</button>
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القائمة</button>
      </div>
      ${HELP}`, "again");
    if (champ) { K.sfx.win(); K.confetti(60, "🏆🥇⭐🎉✨"); }
    K.later(() => K.tts(champ ? "أنت بطل الألعاب الأولمبية" : "انتهت البطولة"), 400);
  }

  // ---------------------------------------------------------------- 🏃 سباق ١٠٠ متر
  function sprint(tour) {
    const ev = EV.sprint, riv = tour ? tour.rivals : rivals(), cv = riv.map(() => cpuVal(ev));
    const X0 = 1150, X1 = 130, lx = (d) => X0 - (d / 100) * (X0 - X1), LANE = [367, 462, 557, 652];
    arena({
      count: true,
      hint: "اضغط <b>الزر السفلي</b> أو <b>Enter</b> بسرعة كبيرة لتجري",
      init(S) { S.me = { d: 0, v: 0, fin: 0 }; S.cpu = riv.map((r, i) => ({ ...r, T: cv[i], vmax: 100 / (cv[i] - 0.9), d: 0, fin: 0 })); S.time = 0; S.after = 0; },
      ok(S) { if (!S.me.fin) S.me.v = Math.min(11.2, S.me.v + 1.5); },
      update(S, dt) {
        S.time += dt;
        const m = S.me;
        if (!m.fin) {
          m.v *= Math.exp(-1.2 * dt); m.d += m.v * dt;
          if (m.d >= 100 || S.time >= 60) { m.d = Math.min(100, m.d); m.fin = +Math.min(S.time, 60).toFixed(2); K.sfx.ok(); S.say(`⏱️ ${fmt(m.fin, 2)} ث`, 2.5); }
        }
        for (const c of S.cpu) if (!c.fin) { c.d = c.vmax * (S.time - 0.9 * (1 - Math.exp(-S.time / 0.9))); if (c.d >= 100) { c.d = 100; c.fin = S.time; } }
        if (m.fin) { S.after += dt; if (S.after > 1.5 || S.cpu.every((c) => c.fin)) S.end(m.fin, 1); }
      },
      draw(S, g) {
        stands(g, 320, S.t, S.me.fin);
        g.fillStyle = "#c2410c"; g.fillRect(0, 320, 1280, 400);
        g.fillStyle = "#fff"; for (let i = 0; i <= 4; i++) g.fillRect(0, 320 + i * 95, 1280, 4);
        for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? "#111" : "#fff"; g.fillRect(X1 - 10 + j * 10, 322 + i * 23.75, 10, 23.75); }
        g.fillStyle = "#fff"; g.fillRect(X0 + 8, 320, 6, 380);
        for (let m = 10; m < 100; m += 10) { const x = lx(m); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x - 1, 320, 2, 380); txt(g, AR(m), x, 706, 18, "#fff", "center", null); }
        const runner = (d, y, code, mine, v) => {
          const x = lx(d), bob = Math.abs(Math.sin(d * 1.6)) * (v > 0.3 ? 10 : 0);
          emo(g, flagEmo(code), 1225, y, 46);
          emo(g, "🏃", x, y - 18 - bob, 82);
          if (mine) { txt(g, "أنت", x, y - 82 - bob, 26, "#fde047"); }
        };
        S.cpu.forEach((c, i) => runner(c.d, LANE[i], c.code, false, c.fin ? 0 : 1));
        g.fillStyle = "rgba(253,224,71,.22)"; g.fillRect(0, 605, 1280, 95);
        runner(S.me.d, LANE[3], FLAGS[save.flag][0], true, S.me.v);
        panel(g, 20, 20, 360, 96);
        txt(g, `⏱️ ${fmt(S.me.fin || S.time, 2)} ث`, 360, 48, 34, "#1e3a8a", "right", null);
        bar(g, 40, 82, 320, 20, S.me.v / 11.2, S.me.v > 9 ? "#22c55e" : S.me.v > 5 ? "#f59e0b" : "#ef4444");
        txt(g, "سباق ١٠٠ متر", 1260, 50, 38, "#fff", "right");
      },
      done(val) { finishEvent(ev, val, riv, cv, tour); },
    });
  }

  // ---------------------------------------------------------------- 🏊 السباحة ٥٠ متراً
  function swim(tour) {
    const ev = EV.swim, riv = tour ? tour.rivals : rivals(), cv = riv.map(() => cpuVal(ev));
    const X0 = 1150, X1 = 120, lx = (d) => X0 - (d / 50) * (X0 - X1), LANE = [318, 418, 518, 630], PER = 1.3;
    arena({
      count: true,
      hint: "اضغط <b>الزر السفلي</b> أو <b>Enter</b> حين يكون المؤشر في <b>الأخضر</b> (لا تضغط بسرعة!)",
      init(S) { S.me = { d: 0, v: 0, fin: 0 }; S.cpu = riv.map((r, i) => ({ ...r, vmax: 50 / (cv[i] - 1.2), d: 0, fin: 0 })); S.time = 0; S.after = 0; S.cool = 0; S.fb = null; },
      ok(S) {
        if (S.me.fin || S.cool > 0) return;
        S.cool = 0.3;
        const a = Math.abs(Math.sin((S.time * 2 * Math.PI) / PER));
        if (a < 0.3) { S.me.v += 1.3; S.fb = { s: "ممتاز!", c: "#22c55e", t: 0.7 }; K.tone(880, 0.08, "sine", 0.1); }
        else if (a < 0.6) { S.me.v += 0.7; S.fb = { s: "جيد", c: "#f59e0b", t: 0.7 }; K.tone(620, 0.08, "sine", 0.08); }
        else { S.me.v += 0.1; S.fb = { s: "انتظر الأخضر", c: "#ef4444", t: 0.7 }; K.tone(200, 0.12, "sawtooth", 0.06); }
      },
      update(S, dt) {
        S.time += dt; S.cool -= dt; if (S.fb) S.fb.t -= dt;
        const m = S.me;
        if (!m.fin) {
          m.v *= Math.exp(-0.9 * dt); m.d += Math.max(m.v, 0.7) * dt;
          if (m.d >= 50 || S.time >= 90) { m.d = Math.min(50, m.d); m.fin = +Math.min(S.time, 90).toFixed(2); K.sfx.ok(); S.say(`⏱️ ${fmt(m.fin, 2)} ث`, 2.5); }
        }
        for (const c of S.cpu) if (!c.fin) { c.d = c.vmax * (S.time - 1.2 * (1 - Math.exp(-S.time / 1.2))); if (c.d >= 50) { c.d = 50; c.fin = S.time; } }
        if (m.fin) { S.after += dt; if (S.after > 1.5 || S.cpu.every((c) => c.fin)) S.end(m.fin, 1); }
      },
      draw(S, g) {
        stands(g, 260, S.t, S.me.fin);
        g.fillStyle = "#e2e8f0"; g.fillRect(0, 260, 1280, 14);
        const water = g.createLinearGradient(0, 274, 0, 720); water.addColorStop(0, "#38bdf8"); water.addColorStop(1, "#0369a1");
        g.fillStyle = water; g.fillRect(0, 274, 1280, 446);
        g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 3;
        for (let y = 300; y < 720; y += 34) { g.beginPath(); for (let x = 0; x <= 1280; x += 20) g.lineTo(x, y + Math.sin(x / 60 + S.t * 2 + y) * 4); g.stroke(); }
        for (let i = 1; i < 4; i++) { const y = 274 + i * 106; for (let x = 0; x < 1280; x += 22) { g.fillStyle = (x / 22) % 2 ? "#ef4444" : "#fff"; g.beginPath(); g.arc(x + 11, y, 7, 0, 7); g.fill(); } }
        g.fillStyle = "#fff"; g.fillRect(X1 - 14, 274, 8, 446); g.fillRect(X0 + 40, 274, 8, 446);
        g.fillStyle = "rgba(253,224,71,.18)"; g.fillRect(0, 592, 1280, 128);
        const sw = (d, y, code, mine) => {
          const x = lx(d);
          emo(g, flagEmo(code), 1225, y, 42);
          emo(g, "🏊", x, y + Math.sin(S.t * 6 + y) * 3, 76);
          if (mine) txt(g, "أنت", x, y - 52, 26, "#fde047");
        };
        S.cpu.forEach((c, i) => sw(c.d, LANE[i], c.code, false));
        sw(S.me.d, LANE[3], FLAGS[save.flag][0], true);
        // مؤشر الإيقاع
        panel(g, 340, 18, 600, 110);
        const W = 520, x0 = 380, cx = x0 + W / 2;
        g.fillStyle = "#fecaca"; rr(g, x0, 40, W, 34, 17); g.fill();
        g.fillStyle = "#fde68a"; g.fillRect(cx - W * 0.3, 40, W * 0.6, 34);
        g.fillStyle = "#86efac"; g.fillRect(cx - W * 0.15, 40, W * 0.3, 34);
        const mk = cx + Math.sin((S.time * 2 * Math.PI) / PER) * (W / 2 - 6);
        g.fillStyle = "#1e3a8a"; g.beginPath(); g.moveTo(mk, 80); g.lineTo(mk - 14, 104); g.lineTo(mk + 14, 104); g.closePath(); g.fill(); g.fillRect(mk - 3, 34, 6, 46);
        if (S.fb && S.fb.t > 0) txt(g, S.fb.s, cx, 112, 24, S.fb.c, "center", "#fff");
        panel(g, 20, 18, 290, 70);
        txt(g, `⏱️ ${fmt(S.me.fin || S.time, 2)} ث`, 290, 53, 32, "#1e3a8a", "right", null);
        txt(g, "السباحة ٥٠ متراً", 1260, 50, 34, "#fff", "right");
      },
      done(val) { finishEvent(ev, val, riv, cv, tour); },
    });
  }

  // ---------------------------------------------------------------- 🦘 الوثب الطويل
  function longJump(tour) {
    const ev = EV.long, riv = tour ? tour.rivals : rivals(), cv = riv.map(() => cpuVal(ev));
    const BOARD = 520, PX = 40, GY = 560, rx = (d) => 1220 - (d / 30) * (1220 - BOARD);
    const reset = (S) => { S.ph = "run"; S.d = 0; S.v = 0; S.pt = 0; S.ang = 5; };
    const lock = (S) => {
      const th = (S.ang * Math.PI) / 180;
      S.th = th; S.dist = +Math.max(0.5, (0.7225 * S.tv * S.tv * Math.sin(2 * th)) / 9.81).toFixed(2);
      S.dur = 0.7 + S.dist * 0.06; S.ph = "fly"; S.pt = 0;
      K.tone(500, 0.2, "triangle", 0.1);
      if (Math.abs(S.ang - 45) < 7) S.say("زاوية ممتازة! 👌", 0.9);
    };
    arena({
      hint: "اضغط <b>الزر السفلي</b> أو <b>Enter</b> بسرعة لتجري، وعند اللوح اضغط مرة واحدة والسهم في <b>الأخضر</b>",
      init(S) { S.att = 0; S.marks = []; S.best = 0; reset(S); S.say("الوثب الطويل: ٣ محاولات", 1.6); },
      ok(S) {
        if (S.ph === "run") S.v = Math.min(11, S.v + 1.5);
        else if (S.ph === "angle" && S.pt > 0.3) lock(S);
      },
      update(S, dt) {
        S.pt += dt;
        if (S.ph === "run") {
          if (S.t < 1.2) return;   // وقت لقراءة العنوان
          S.v *= Math.exp(-1.2 * dt); S.d += Math.max(S.v, 1.5) * dt;
          if (S.d >= 30) { S.d = 30; S.tv = Math.max(S.v, 1.5); S.ph = "angle"; S.pt = 0; K.tone(700, 0.12, "square", 0.08); }
        } else if (S.ph === "angle") {
          S.ang = 45 - 40 * Math.cos((2 * Math.PI * S.pt) / 1.6);
          if (S.pt > 2.6) lock(S);
        } else if (S.ph === "fly") {
          if (S.pt >= S.dur) { S.ph = "land"; S.pt = 0; S.marks.push(S.dist); S.best = Math.max(S.best, S.dist); K.sfx.ok(); S.say(`📏 ${fmt(S.dist, 2)} م`, 1.6); }
        } else if (S.ph === "land" && S.pt > 1.8 && S.phase !== "end") {
          S.att++;
          if (S.att >= 3) S.end(S.best, 0.2);
          else { reset(S); S.say(`المحاولة ${AR(S.att + 1)} من ٣`, 1.2); S.t = 0; }
        }
      },
      draw(S, g) {
        stands(g, GY - 40, S.t, S.ph === "land" && S.dist >= Math.max(...cv));
        g.fillStyle = "#16a34a"; g.fillRect(0, GY - 40, 1280, 760 - GY);
        g.fillStyle = "#b45309"; g.fillRect(BOARD, GY - 8, 1280 - BOARD, 26);
        g.fillStyle = "#fde68a"; g.fillRect(100, GY - 6, BOARD - 100, 40);
        g.fillStyle = "#fff"; g.fillRect(BOARD - 4, GY - 10, 14, 30);
        for (let m = 1; m <= 10; m++) { const x = BOARD - m * PX; g.fillStyle = "rgba(120,53,15,.45)"; g.fillRect(x - 1, GY + 22, 2, 14); txt(g, AR(m), x, GY + 52, 20, "#fff", "center", "#14532d"); }
        riv.forEach((r, i) => { const x = BOARD - cv[i] * PX; g.fillStyle = "#334155"; g.fillRect(x - 1, GY - 50, 3, 52); emo(g, flagEmo(r.code), x - 14, GY - 46, 26); });
        S.marks.forEach((d) => { g.fillStyle = "#1e3a8a"; g.beginPath(); g.arc(BOARD - d * PX, GY + 8, 7, 0, 7); g.fill(); });
        let x, y, e = "🏃";
        if (S.ph === "run") { x = rx(S.d); y = GY - 44 - Math.abs(Math.sin(S.d * 1.3)) * (S.t > 1.2 ? 10 : 0); }
        else if (S.ph === "angle") { x = BOARD + 10; y = GY - 44; }
        else {
          const p = S.ph === "fly" ? Math.min(1, S.pt / S.dur) : 1, H = Math.min(420, (S.dist * Math.tan(S.th) * PX) / 4);
          x = BOARD - p * S.dist * PX; y = GY - 44 - 4 * H * p * (1 - p); e = S.ph === "land" ? "🙌" : "🤸";
        }
        emo(g, e, x, y, 84);
        if (S.ph === "angle") {
          const cx = BOARD + 10, cy = GY - 60, R = 140;
          g.lineWidth = 26; g.lineCap = "butt";
          g.strokeStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.arc(cx, cy, R, Math.PI, Math.PI * 1.5); g.stroke();
          g.strokeStyle = "#22c55e"; g.beginPath(); g.arc(cx, cy, R, Math.PI + (38 * Math.PI) / 180, Math.PI + (52 * Math.PI) / 180); g.stroke();
          const a = (S.ang * Math.PI) / 180;
          g.strokeStyle = "#dc2626"; g.lineWidth = 8; g.lineCap = "round";
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - Math.cos(a) * (R + 26), cy - Math.sin(a) * (R + 26)); g.stroke();
          txt(g, "اضغط الآن!", cx - 70, cy - R - 50, 34, "#fde047");
        }
        panel(g, 20, 20, 420, 96);
        txt(g, `المحاولة ${AR(Math.min(3, S.att + 1))} من ٣ · أفضل: ${fmt(S.best, 2)} م`, 420, 50, 26, "#1e3a8a", "right", null);
        bar(g, 40, 82, 380, 20, S.ph === "run" ? S.v / 11 : (S.tv || 0) / 11, "#22c55e");
        txt(g, "الوثب الطويل", 1260, 50, 38, "#fff", "right");
      },
      done(val) { finishEvent(ev, val, riv, cv, tour); },
    });
  }

  // ---------------------------------------------------------------- 🏹 الرماية بالقوس
  function archery(tour) {
    const ev = EV.archery, riv = tour ? tour.rivals : rivals(), cv = riv.map(() => cpuVal(ev));
    const CX = 640, CY = 372, RING = 22, N = 6;
    const RC = ["#fde047", "#fde047", "#ef4444", "#ef4444", "#3b82f6", "#3b82f6", "#1f2937", "#1f2937", "#f8fafc", "#f8fafc"];
    const next = (S) => { S.ph = "aim"; S.pt = 0; S.ax = rand(-170, 170); S.ay = rand(-130, 130); S.cx = S.ax; S.cy = S.ay; S.wind = rand(-1, 1) * [18, 32, 46][save.lvl]; };
    arena({
      hint: "وجّه بـ<b>الأسهم</b> أو <b>العصا اليسرى</b> (والريح تدفعك)، واضغط <b>الزر السفلي</b> أو <b>Enter</b> لترمي",
      init(S) { S.n = 0; S.total = 0; S.hits = []; next(S); S.say("الرماية بالقوس: ٦ أسهم", 1.6); },
      ok(S) { if (S.ph === "aim" && S.pt > 0.4) { S.ph = "fly"; S.pt = 0; S.shot = { x: S.cx, y: S.cy }; K.tone(320, 0.1, "triangle", 0.12); } },
      update(S, dt) {
        S.pt += dt;
        if (S.ph === "aim") {
          S.ax = Math.max(-520, Math.min(520, S.ax + (S.dx() * 260 + S.wind) * dt));
          S.ay = Math.max(-320, Math.min(320, S.ay + S.dy() * 260 * dt));
          const A = [12, 20, 28][save.lvl], t = S.t;
          S.cx = S.ax + A * (Math.sin(t * 1.7) + 0.6 * Math.sin(t * 2.9 + 1));
          S.cy = S.ay + A * (Math.cos(t * 1.3) + 0.6 * Math.sin(t * 3.7 + 2));
        } else if (S.ph === "fly" && S.pt > 0.45) {
          const r = Math.hypot(S.shot.x, S.shot.y), sc = r < RING * 10 ? 10 - Math.floor(r / RING) : 0;
          S.hits.push({ ...S.shot, sc }); S.total += sc; S.ph = "hit"; S.pt = 0;
          S.say(sc ? `+${AR(sc)}` : "خارج الهدف", 1);
          if (sc >= 9) { K.sfx.ok(); K.confetti(8, "🎯⭐✨"); } else K.tone(sc ? 440 : 180, 0.15, "triangle", 0.1);
        } else if (S.ph === "hit" && S.pt > 1.1 && S.phase !== "end") {
          S.n++;
          if (S.n >= N) S.end(S.total, 0.4); else next(S);
        }
      },
      draw(S, g) {
        const sky = g.createLinearGradient(0, 0, 0, 520); sky.addColorStop(0, "#38bdf8"); sky.addColorStop(1, "#bae6fd");
        g.fillStyle = sky; g.fillRect(0, 0, 1280, 520);
        g.fillStyle = "#4ade80"; g.fillRect(0, 520, 1280, 200);
        emo(g, "🌳", 110, 470, 120); emo(g, "🌳", 1170, 480, 110);
        g.fillStyle = "#92400e"; g.fillRect(CX - 140, CY + 150, 18, 220); g.fillRect(CX + 122, CY + 150, 18, 220);
        for (let i = 9; i >= 0; i--) { g.fillStyle = RC[9 - i]; g.beginPath(); g.arc(CX, CY, RING * (i + 1), 0, 7); g.fill(); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1.5; g.stroke(); }
        g.fillStyle = "#1e3a8a"; g.beginPath(); g.arc(CX, CY, 3, 0, 7); g.fill();
        for (const h of S.hits) {
          g.fillStyle = "#111827"; g.beginPath(); g.arc(CX + h.x, CY + h.y, 7, 0, 7); g.fill();
          g.strokeStyle = "#dc2626"; g.lineWidth = 4; g.beginPath(); g.moveTo(CX + h.x, CY + h.y); g.lineTo(CX + h.x + 16, CY + h.y + 16); g.stroke();
        }
        if (S.ph === "fly") {
          const p = Math.min(1, S.pt / 0.45), sx = CX + S.shot.x, sy = CY + S.shot.y;
          const x = 640 + (sx - 640) * p, y = 760 + (sy - 760) * p;
          g.fillStyle = "#111827"; g.beginPath(); g.arc(x, y, 30 - 22 * p, 0, 7); g.fill();
        }
        if (S.ph === "aim") {
          const x = CX + S.cx, y = CY + S.cy;
          g.strokeStyle = "#dc2626"; g.lineWidth = 5;
          g.beginPath(); g.arc(x, y, 26, 0, 7); g.stroke();
          g.beginPath(); g.moveTo(x - 42, y); g.lineTo(x - 10, y); g.moveTo(x + 10, y); g.lineTo(x + 42, y); g.moveTo(x, y - 42); g.lineTo(x, y - 10); g.moveTo(x, y + 10); g.lineTo(x, y + 42); g.stroke();
        }
        panel(g, 20, 20, 330, 120);
        txt(g, `السهم ${AR(Math.min(N, S.n + 1))} من ${AR(N)}`, 330, 50, 28, "#1e3a8a", "right", null);
        txt(g, `النقاط: ${AR(S.total)}`, 330, 92, 32, "#be185d", "right", null);
        const w = S.wind, ws = Math.abs(w) < 8 ? "هادئة" : Math.abs(w) < 26 ? "خفيفة" : "قوية";
        panel(g, 930, 20, 330, 70);
        txt(g, `💨 الريح ${ws} ${w > 8 ? "→" : w < -8 ? "←" : ""}`, 1240, 55, 28, "#1e3a8a", "right", null);
      },
      done(val) { finishEvent(ev, val, riv, cv, tour); },
    });
  }

  // ---------------------------------------------------------------- 🏋️ رفع الأثقال
  const WTS = [40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260];
  function weights(tour) {
    const ev = EV.weights, riv = tour ? tour.rivals : rivals(), cv = riv.map(() => cpuVal(ev));
    const LIFT = 7, HOLD = 3;
    const reset = (S) => { S.ph = "lift"; S.p = 0; S.pt = 0; S.b = 0; S.drift = 0; S.tgt = 0; S.dt2 = 0; };
    const fail = (S) => { S.ph = "fail"; S.pt = 0; S.lives--; K.sfx.bad(); S.say(S.lives > 0 ? "سقط الثقل! 💥 حاول مرة أخرى" : "سقط الثقل! 💥", 1.6); };
    arena({
      hint: "اضغط <b>الزر السفلي</b> أو <b>Enter</b> بسرعة لترفع، ثم أبقِ المؤشر في الأخضر بـ<b>الأسهم</b> ← → (محاولتان)",
      init(S) { S.k = 0; S.best = 0; S.lives = 2; reset(S); S.say(`رفع الأثقال: ${AR(WTS[0])} كغ`, 1.6); S.wait = 1.4; },
      ok(S) { if (S.ph === "lift" && S.wait <= 0) S.p = Math.min(100, S.p + 900 / WTS[S.k]); },
      update(S, dt) {
        const W = WTS[S.k];
        if (S.wait > 0) { S.wait -= dt; return; }
        S.pt += dt;
        if (S.ph === "lift") {
          if (S.p < 100) S.p = Math.max(0, S.p - 28 * dt);
          if (S.p >= 100) { S.ph = "hold"; S.pt = 0; K.tone(800, 0.15, "square", 0.08); S.say("وازن! ⚖️", 0.9); }
          else if (S.pt >= LIFT) fail(S);
        } else if (S.ph === "hold") {
          S.dt2 -= dt; if (S.dt2 <= 0) { S.dt2 = 0.5; S.tgt = rand(-1, 1); }
          S.drift += (S.tgt - S.drift) * Math.min(1, dt * 3);
          S.b += (S.drift * (0.15 + W / 220) + S.b * 0.5 + S.dx() * 1.6) * dt;
          if (Math.abs(S.b) >= 1) fail(S);
          else if (S.pt >= HOLD) { S.ph = "ok"; S.pt = 0; S.best = W; K.sfx.ok(); K.confetti(10, "💪⭐✨"); S.say(`نجح الرفع! ${AR(W)} كغ ✅`, 1.4); }
        } else if (S.ph === "ok" && S.pt > 1.5 && S.phase !== "end") {
          if (S.k >= WTS.length - 1) S.end(S.best, 0.2);
          else { S.k++; reset(S); S.say(`الوزن التالي: ${AR(WTS[S.k])} كغ`, 1.3); S.wait = 1.2; }
        } else if (S.ph === "fail" && S.pt > 1.6 && S.phase !== "end") {
          if (S.lives > 0) { reset(S); S.say(`${AR(W)} كغ · محاولة أخيرة`, 1.3); S.wait = 1.2; } else S.end(S.best, 0.2);
        }
      },
      draw(S, g) {
        const wall = g.createLinearGradient(0, 0, 0, 600); wall.addColorStop(0, "#1e293b"); wall.addColorStop(1, "#475569");
        g.fillStyle = wall; g.fillRect(0, 0, 1280, 600);
        g.fillStyle = "rgba(253,224,71,.12)"; g.beginPath(); g.moveTo(560, 0); g.lineTo(720, 0); g.lineTo(900, 600); g.lineTo(380, 600); g.closePath(); g.fill();
        g.fillStyle = "#a16207"; g.fillRect(260, 600, 760, 30); g.fillStyle = "#713f12"; g.fillRect(0, 630, 1280, 90);
        const W = WTS[S.k], x = 640;
        const frac = S.ph === "lift" ? S.p / 100 : S.ph === "fail" ? Math.max(0, 1 - S.pt * 2) : 1;
        const by = 520 - frac * 230, tilt = S.ph === "hold" ? S.b * 0.3 : S.ph === "fail" ? (S.b >= 0 ? 0.35 : -0.35) * Math.min(1, S.pt * 2) : 0;
        // اللاعب
        g.strokeStyle = "#f5c49c"; g.lineWidth = 18; g.lineCap = "round";
        g.beginPath(); g.moveTo(x - 30, 600); g.lineTo(x - 22, 520); g.moveTo(x + 30, 600); g.lineTo(x + 22, 520); g.stroke();
        g.fillStyle = "#2563eb"; rr(g, x - 42, 430, 84, 105, 24); g.fill();
        g.beginPath(); g.moveTo(x - 36, 450); g.lineTo(x - 112, by); g.moveTo(x + 36, 450); g.lineTo(x + 112, by); g.stroke();
        emo(g, S.ph === "fail" ? "😵" : S.ph === "ok" ? "😄" : "😤", x, 392, 78);
        // الثقل
        g.save(); g.translate(x, by); g.rotate(tilt);
        g.fillStyle = "#cbd5e1"; g.fillRect(-300, -6, 600, 12);
        const plates = Math.max(1, Math.round(W / 40)), PC = ["#dc2626", "#2563eb", "#facc15", "#16a34a"];
        for (let i = 0; i < plates; i++) for (const s of [-1, 1]) { g.fillStyle = PC[i % 4]; rr(g, s * (190 + i * 20) - 9, -55 + i * 3, 18, 110 - i * 6, 5); g.fill(); }
        g.restore();
        txt(g, `${AR(W)} كغ`, x, 690, 40, "#fde047", "center", "#422006");
        // قوة الرفع
        panel(g, 1080, 150, 150, 440);
        g.fillStyle = "rgba(30,58,138,.18)"; rr(g, 1130, 175, 50, 360, 25); g.fill();
        const ph = (S.ph === "lift" ? S.p : 100) / 100 * 360;
        g.fillStyle = S.p > 70 || S.ph !== "lift" ? "#22c55e" : "#f59e0b"; rr(g, 1130, 535 - ph, 50, ph, 25); g.fill();
        txt(g, "القوة", 1155, 565, 24, "#1e3a8a", "center", null);
        if (S.ph === "lift") txt(g, `⏱️ ${AR(Math.max(0, Math.ceil(LIFT - S.pt)))}`, 1155, 125, 34, "#fff");
        // التوازن
        if (S.ph === "hold" || S.ph === "fail") {
          panel(g, 340, 120, 600, 90);
          g.fillStyle = "#fecaca"; rr(g, 370, 150, 540, 34, 17); g.fill();
          g.fillStyle = "#86efac"; g.fillRect(640 - 120, 150, 240, 34);
          const nx = 640 + Math.max(-1, Math.min(1, S.b)) * 262;
          g.fillStyle = "#1e3a8a"; g.fillRect(nx - 5, 138, 10, 58);
          if (S.ph === "hold") txt(g, `⚖️ ${AR(Math.max(0, Math.ceil(HOLD - S.pt)))}`, 640, 226, 28, "#fff");
        }
        panel(g, 20, 20, 360, 70);
        txt(g, `أفضل رفع: ${AR(S.best)} كغ  ${"❤️".repeat(Math.max(0, S.lives))}`, 360, 55, 30, "#1e3a8a", "right", null);
        txt(g, "رفع الأثقال", 1260, 50, 38, "#fff", "right");
      },
      done(val) { finishEvent(ev, val, riv, cv, tour); },
    });
  }

  // ---------------------------------------------------------------- ❓ أي رياضة هذه؟
  const SPORTS = [["🏊", "السباحة"], ["🚴", "ركوب الدراجات"], ["🤸", "الجمباز"], ["🏋️", "رفع الأثقال"], ["🏹", "الرماية بالقوس"], ["🤺", "المبارزة"],
    ["🥊", "الملاكمة"], ["⚽", "كرة القدم"], ["🏀", "كرة السلة"], ["🏐", "الكرة الطائرة"], ["🎾", "التنس"], ["🏓", "تنس الطاولة"], ["🏇", "الفروسية"],
    ["🚣", "التجديف"], ["🤾", "كرة اليد"], ["🥋", "الجودو"], ["🏑", "الهوكي"], ["⛷️", "التزلج على الثلج"], ["🤼", "المصارعة"], ["🛹", "التزلج على اللوح"],
    ["🏄", "ركوب الأمواج"], ["🧗", "التسلق"], ["🏌️", "الغولف"], ["🏸", "الريشة الطائرة"], ["🏃", "الجري"]];
  function quiz() {
    K.quizScreen({
      title: "أي رياضة هذه؟",
      optsCls: "txt",
      help: HELP,
      make: () => {
        const names = SPORTS.map((s) => s[1]);
        const qs = K.shuffle(SPORTS).slice(0, 7).map(([e, n]) => {
          const opts = K.options(n, names, 3);
          return { prompt: `<span class="pic emo">${e}</span><span class="q">أي رياضة هذه؟</span>`, opts, answer: opts.indexOf(n), say: () => K.tts("أي رياضة هذه؟"), sayOk: () => K.tts(n) };
        });
        const k = (Math.random() * 3) | 0, mo = K.shuffle([0, 1, 2]);
        qs.splice((Math.random() * qs.length) | 0, 0, {
          prompt: `<span class="pic emo">🏆</span><span class="q">ما ميدالية المركز ${["الأول", "الثاني", "الثالث"][k]}؟</span>`,
          opts: mo.map((i) => `<span class="emo medo">${MED[i]}</span> ${MEDN[i]}`), answer: mo.indexOf(k),
          say: () => K.tts(`ما ميدالية المركز ${["الأول", "الثاني", "الثالث"][k]}؟`), sayOk: () => K.tts(`الميدالية ال${MEDN[k]}`),
        });
        return qs;
      },
    });
  }

  // ---------------------------------------------------------------- القوائم
  function tourIntro(tour) {
    K.begin();
    const m = me();
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill"><span class="emo">🏆</span> البطولة · الأبطال: ${LEVELS[save.lvl].n}</span></div>
      <h1>البطولة الأولمبية</h1>
      <div class="sub">خمس مسابقات، والبلد صاحب أكثر الذهب يفوز بالبطولة</div>
      <div class="vs">
        <div class="cty me"><span class="emo">${flagEmo(m.code)}</span><b>أنت</b><small>${m.name}</small></div>
        ${tour.rivals.map((r) => `<div class="cty"><span class="emo">${flagEmo(r.code)}</span><b>${r.name}</b><small>🤖 بطل آلي</small></div>`).join("")}
      </div>
      <div class="evrow">${EVLIST.map((e, i) => `<span><span class="emo">${e.emo}</span> ${AR(i + 1)}. ${e.name}</span>`).join("")}</div>
      <div class="nav">
        <button class="btn f go" ${K.act("go", () => K.replace(EVLIST[0].play, tour))}><span class="emo">🏁</span> ابدأ البطولة ←</button>
      </div>
      ${HELP}`, "go");
  }

  function flagScreen() {
    K.begin();
    K.paint(`
      <div class="top">${K.backBtn()}<h2>اختر بلدك</h2><span class="pill"><span class="emo">${flagEmo(FLAGS[save.flag][0])}</span> ${FLAGS[save.flag][1]}</span></div>
      <div class="flags">${FLAGS.map(([c, n], i) => `<button class="fla f${i === save.flag ? " on" : ""}" ${K.act("f" + i, () => { save.flag = i; save.save(); K.back(); })}>
        <span class="emo">${flagEmo(c)}</span><small>${n}</small></button>`).join("")}</div>
      ${HELP}`, "f" + save.flag);
  }

  function recordsScreen() {
    K.begin();
    const m = save.medals;
    K.paint(`
      <div class="top">${K.backBtn()}<h2>ميدالياتي وأرقامي</h2><span class="pill"><span class="emo">🏆</span> البطولات: ${AR(save.cups)}</span></div>
      <div class="won"><span class="emo">🥇</span>${AR(m.g)} <span class="emo">🥈</span>${AR(m.s)} <span class="emo">🥉</span>${AR(m.b)}</div>
      <table class="medt rec">
        ${EVLIST.map((e) => `<tr><td><span class="emo">${e.emo}</span> ${e.name}</td><td>${save.best[e.id] != null ? fmtVal(e, save.best[e.id]) : "—"}</td></tr>`).join("")}
      </table>
      ${HELP}`, "back");
  }

  function homeScreen() {
    K.begin();
    const f = FLAGS[save.flag], L = LEVELS[save.lvl], m = save.medals;
    K.paint(`
      <div class="title"><span class="mascot emo">🏅</span><div><h1>الألعاب الأولمبية</h1><div class="sub">خمس مسابقات ضد أبطال العالم: اربح الذهب لبلدك!</div></div></div>
      <div class="evs">
        <button class="ev f" style="background:linear-gradient(135deg,#f59e0b,#be185d)" ${K.act("tour", () => K.show(tourIntro, newTour()))}>
          <span class="emo">🏆</span><b>البطولة</b><small>المسابقات الخمس</small></button>
        ${EVLIST.map((e) => `<button class="ev f" style="background:${e.bg}" ${K.act(e.id, () => K.show(e.play, null))}>
          <span class="emo">${e.emo}</span><b>${e.name}</b><small>${e.sub}</small></button>`).join("")}
        <button class="ev f" style="background:linear-gradient(135deg,#ec4899,#9d174d)" ${K.act("quiz", () => K.show(quiz))}>
          <span class="emo">❓</span><b>أي رياضة هذه؟</b><small>أسئلة بالصور</small></button>
        <button class="ev f" style="background:linear-gradient(135deg,#64748b,#334155)" ${K.act("rec", () => K.show(recordsScreen))}>
          <span class="emo">🏅</span><b>ميدالياتي</b><small><span class="emo">🥇</span>${AR(m.g)} <span class="emo">🥈</span>${AR(m.s)} <span class="emo">🥉</span>${AR(m.b)}</small></button>
      </div>
      <div class="mini">
        <button class="btn f" ${K.act("flag", () => K.show(flagScreen))}><span class="emo">${flagEmo(f[0])}</span> بلدك: ${f[1]}</button>
        <button class="btn f" ${K.act("lvl", () => { save.lvl = (save.lvl + 1) % LEVELS.length; save.save(); K.render(); })}>الأبطال: <span class="emo">${L.emo}</span> ${L.n}</button>
      </div>
      ${HELP}`, "tour");
  }

  K.start(homeScreen);
})();
