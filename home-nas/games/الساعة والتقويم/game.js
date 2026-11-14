// الساعة والتقويم — قراءة ساعة العقارب (من الساعات الكاملة حتى الدقائق)، وضبط العقارب، والساعة الرقمية،
// وصباحاً ومساءً، وأوقات الصلوات الخمس، ثم أيام الأسبوع والأشهر الميلادية والهجرية والفصول الأربعة.
// كل مستوى 10 أسئلة، و«اختبر نفسك» 12 سؤالاً من كل القسم. التقدّم محفوظ لكل طفل (K.store).
(() => {
  "use strict";
  const GAME = "الساعة والتقويم";
  const save = K.store("clockcal", { stars: {}, earned: {} });
  const R = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);
  const M = (t) => `<bdi dir="ltr">${t}</bdi>`;
  let uid = 0;

  // ---------------------------------------------------------------- الواجهات (تُتجاهل أخطاؤها)
  const post = (url, body) => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const learn = (topic, ok) => { try { post("/api/tv/learn/result", { game: GAME, topic: String(topic).slice(0, 80), ok: !!ok }).catch(() => {}); } catch {} };
  const earn = (amount, reason) => { try { return post("/api/tv/stars/earn", { amount, game: GAME, reason }).then((r) => (r.ok ? r.json() : null)).then((d) => (d && d.added > 0 ? d.added : 0)).catch(() => 0); } catch { return Promise.resolve(0); } };

  // ---------------------------------------------------------------- الوقت
  // t = دقائق منذ الساعة 12:00 (0..719)
  const norm = (t) => ((t % 720) + 720) % 720;
  const H = (t) => Math.floor(norm(t) / 60) || 12;
  const MN = (t) => norm(t) % 60;
  const dig = (t) => `${H(t)}:${String(MN(t)).padStart(2, "0")}`;
  const HOURS = ["", "الواحدة", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة", "الحادية عشرة", "الثانية عشرة"];
  const nextH = (t) => H(t + 60);
  function words(t) {
    const h = H(t), m = MN(t), n = HOURS[nextH(t)];
    const W = { 0: `${HOURS[h]} تماماً`, 5: `${HOURS[h]} وخمس دقائق`, 10: `${HOURS[h]} وعشر دقائق`, 15: `${HOURS[h]} والربع`, 20: `${HOURS[h]} والثلث`,
      25: `${HOURS[h]} والنصف إلا خمساً`, 30: `${HOURS[h]} والنصف`, 35: `${HOURS[h]} والنصف وخمس`, 40: `${n} إلا ثلثاً`, 45: `${n} إلا ربعاً`, 50: `${n} إلا عشر دقائق`, 55: `${n} إلا خمس دقائق` };
    if (W[m] != null) return W[m];
    const d = m === 1 ? "دقيقة واحدة" : m === 2 ? "دقيقتان" : m <= 10 ? `${m} دقائق` : `${m} دقيقة`;
    return `${HOURS[h]} و${d}`;
  }
  const say = (t) => "الساعة " + words(t);

  // ---------------------------------------------------------------- رسم الساعة
  // o: { mins: أرقام الدقائق على الإطار، deco: أجراس وأرجل، cls, id }
  function clockSvg(t, o = {}) {
    const ma = t * 6, ha = t * 0.5, g = "cg" + ++uid;
    let s = `<svg class="clock ${o.cls || ""}" viewBox="-110 -118 220 236" ${o.id ? `id="${o.id}"` : ""}>
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>`;
    if (o.deco) s += `<g class="deco"><path d="M-62 -84 a30 30 0 0 1 36 -22 z" fill="#f59e0b"/><path d="M62 -84 a30 30 0 0 0 -36 -22 z" fill="#f59e0b"/>
      <rect x="-6" y="-112" width="12" height="14" rx="4" fill="#6366f1"/><path d="M-58 86 l-14 26 h16 l10 -20z M58 86 l14 26 h-16 l-10 -20z" fill="#6366f1"/></g>`;
    s += `<circle r="100" fill="url(#${g})"/><circle r="86" fill="#fffbeb"/>`;
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0, a = (i * 6 * Math.PI) / 180, r1 = big ? 76 : 80, r2 = 85;
      s += `<line x1="${(Math.sin(a) * r1).toFixed(1)}" y1="${(-Math.cos(a) * r1).toFixed(1)}" x2="${(Math.sin(a) * r2).toFixed(1)}" y2="${(-Math.cos(a) * r2).toFixed(1)}" class="${big ? "tk5" : "tk"}"/>`;
    }
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      s += `<text x="${(Math.sin(a) * 62).toFixed(1)}" y="${(-Math.cos(a) * 62 + 8).toFixed(1)}" class="num${i % 3 ? "" : " q"}">${i}</text>`;
      if (o.mins) s += `<text x="${(Math.sin(a) * 93).toFixed(1)}" y="${(-Math.cos(a) * 93 + 3.5).toFixed(1)}" class="mn">${i === 12 ? "00" : i * 5}</text>`;
    }
    s += `<g class="hh" style="transform:rotate(${ha}deg)"><line y1="10" y2="-44" /><circle cy="-44" r="0"/></g>
      <g class="mh" style="transform:rotate(${ma}deg)"><line y1="14" y2="-72"/></g><circle r="7" class="pin"/><circle r="2.5" fill="#fff"/></svg>`;
    return s;
  }
  function setHands(svg, t) {
    svg.querySelector(".hh").style.transform = `rotate(${t * 0.5}deg)`;
    svg.querySelector(".mh").style.transform = `rotate(${t * 6}deg)`;
  }
  const lcd = (t, ap) => `<span class="lcd" dir="ltr">${dig(t)}${ap ? `<small>${ap}</small>` : ""}</span>`;

  // ---------------------------------------------------------------- السماء والمسجد
  const SKY = {
    dawn: ["#1e3a8a", "#f9a8d4"], morning: ["#7dd3fc", "#fef3c7"], noon: ["#0ea5e9", "#bae6fd"],
    afternoon: ["#60a5fa", "#fde68a"], sunset: ["#7c3aed", "#fb923c"], night: ["#020617", "#312e81"],
  };
  function skySvg(kind) {
    const g = "sk" + ++uid, [a, b] = SKY[kind], dark = kind === "night" || kind === "dawn";
    let s = `<svg class="sky" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect width="200" height="120" fill="url(#${g})"/>`;
    if (dark) s += [[20, 14], [48, 30], [80, 10], [120, 24], [160, 12], [180, 36], [100, 40]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.2 : 1.8}" fill="#fff" opacity="${kind === "dawn" ? 0.6 : 0.95}" class="tw" style="animation-delay:${i * 0.3}s"/>`).join("");
    const sun = { morning: [40, 66, 14], noon: [100, 22, 15], afternoon: [152, 46, 14], sunset: [168, 90, 16] }[kind];
    if (sun) s += `<circle cx="${sun[0]}" cy="${sun[1]}" r="${sun[2] + 8}" fill="#fde047" opacity=".3"/><circle cx="${sun[0]}" cy="${sun[1]}" r="${sun[2]}" fill="${kind === "sunset" ? "#f97316" : "#facc15"}"/>`;
    if (kind === "dawn") s += `<ellipse cx="60" cy="100" rx="70" ry="14" fill="#fda4af" opacity=".7"/>`;
    if (kind === "night") s += `<path d="M150 14 a14 14 0 1 0 0 28 a11 11 0 1 1 0 -28z" fill="#fde68a"/>`;
    if (kind !== "night" && kind !== "dawn") s += `<g fill="#fff" opacity=".85"><ellipse cx="70" cy="30" rx="14" ry="5"/><ellipse cx="78" cy="26" rx="8" ry="5"/></g>`;
    const hill = dark ? "#14532d" : kind === "sunset" ? "#166534" : "#4ade80", m = dark ? "#0f172a" : kind === "sunset" ? "#3b0764" : "#0f766e";
    s += `<path d="M0 100 Q50 84 100 98 T200 94 V120 H0z" fill="${hill}"/>
      <g fill="${m}"><rect x="112" y="84" width="40" height="22"/><path d="M114 85 a18 18 0 0 1 36 0z"/><rect x="130" y="62" width="2.5" height="6"/><rect x="156" y="62" width="6" height="44"/><path d="M155 63 l4 -9 l4 9z"/>
      ${dark ? `<rect x="127" y="92" width="10" height="14" rx="5" fill="#fde68a"/>` : ""}</g>`;
    return s + "</svg>";
  }

  // ---------------------------------------------------------------- الفصول
  const SEASONS = [
    { n: "الربيع", e: "🌸", months: ["مارس", "أبريل", "مايو"], desc: "تتفتح الأزهار ويعتدل الجو", items: ["🌷", "🐝", "🦋"] },
    { n: "الصيف", e: "☀️", months: ["يونيو", "يوليو", "أغسطس"], desc: "الجو حار والنهار طويل", items: ["🏖️", "🍉", "🩱"] },
    { n: "الخريف", e: "🍂", months: ["سبتمبر", "أكتوبر", "نوفمبر"], desc: "تتساقط أوراق الشجر ويبدأ البرد", items: ["🍁", "🍄", "🌰"] },
    { n: "الشتاء", e: "❄️", months: ["ديسمبر", "يناير", "فبراير"], desc: "الجو بارد ويكثر المطر والثلج", items: ["⛄", "🧣", "🧤"] },
  ];
  function seasonSvg(i) {
    const bg = ["#bae6fd", "#7dd3fc", "#fde68a", "#cbd5e1"][i], ground = ["#86efac", "#4ade80", "#d9a35f", "#f8fafc"][i];
    let s = `<svg class="season s${i}" viewBox="0 0 200 140"><rect width="200" height="140" fill="${bg}"/>`;
    if (i === 1) s += `<circle cx="160" cy="28" r="22" fill="#fde047" opacity=".35"/><circle cx="160" cy="28" r="15" fill="#facc15"/>`;
    if (i === 0) s += `<circle cx="165" cy="26" r="11" fill="#fde047"/>`;
    if (i === 3) s += `<g fill="#94a3b8"><ellipse cx="60" cy="24" rx="28" ry="10"/><ellipse cx="140" cy="20" rx="30" ry="11"/></g>`;
    s += `<path d="M0 112 Q100 100 200 112 V140 H0z" fill="${ground}"/><path d="M96 112 v-46 M100 112 v-46" stroke="#92400e" stroke-width="7"/>`;
    if (i === 3) s += `<g stroke="#78350f" stroke-width="4" stroke-linecap="round" fill="none"><path d="M98 76 l-24 -22 M98 70 l22 -24 M98 84 l28 -10 M86 64 l-6 -16 M112 56 l12 -6"/></g>`;
    else {
      const crown = ["#4ade80", "#15803d", "#ea580c", ""][i];
      s += `<g fill="${crown}"><circle cx="98" cy="52" r="30"/><circle cx="74" cy="64" r="20"/><circle cx="122" cy="64" r="20"/></g>`;
      if (i === 2) s += `<g fill="#dc2626"><circle cx="86" cy="44" r="8"/><circle cx="112" cy="58" r="9"/><circle cx="76" cy="66" r="7"/></g>`;
    }
    if (i === 0) s += [[80, 40], [104, 34], [116, 56], [88, 62], [70, 58], [126, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#f9a8d4"/><circle cx="${x}" cy="${y}" r="2" fill="#fde047"/>`).join("")
      + [[30, 120, "#f472b6"], [50, 126, "#facc15"], [160, 122, "#a78bfa"], [178, 128, "#f472b6"]].map(([x, y, c]) => `<path d="M${x} ${y} v10" stroke="#16a34a" stroke-width="2"/><circle cx="${x}" cy="${y}" r="4.5" fill="${c}"/>`).join("");
    if (i === 1) s += `<path d="M0 126 Q50 120 100 126 T200 124 V140 H0z" fill="#38bdf8"/>`;
    if (i === 2) s += [[50, 30], [150, 50], [130, 20], [40, 80], [170, 86]].map(([x, y], k) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="${k % 2 ? "#f59e0b" : "#b91c1c"}" class="fall" style="animation-delay:${k * 0.7}s"/>`).join("");
    if (i === 3) s += [[30, 20], [60, 50], [150, 40], [180, 70], [120, 80], [20, 90], [90, 30]].map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff" class="fall" style="animation-delay:${k * 0.5}s"/>`).join("")
      + `<g><circle cx="160" cy="114" r="12" fill="#fff"/><circle cx="160" cy="96" r="8" fill="#fff"/><circle cx="157" cy="94" r="1.3"/><circle cx="163" cy="94" r="1.3"/><path d="M160 97 l6 2 l-6 1z" fill="#f97316"/></g>`;
    return s + "</svg>";
  }

  // ---------------------------------------------------------------- البيانات
  const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const GM = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const HM = ["محرّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوّال", "ذو القعدة", "ذو الحجة"];
  const HM_ICON = { 0: "⭐", 8: "🌙", 9: "🎉", 11: "🕋" };
  const PRAYERS = [
    { n: "الفجر", sky: "dawn", t: 5 * 60, ap: "صباحاً", desc: "قبل شروق الشمس", rak: 2 },
    { n: "الظهر", sky: "noon", t: 12 * 60 + 30, ap: "ظهراً", desc: "حين تكون الشمس في وسط السماء", rak: 4 },
    { n: "العصر", sky: "afternoon", t: 3 * 60 + 30, ap: "عصراً", desc: "بعد الظهر حين تميل الشمس", rak: 4 },
    { n: "المغرب", sky: "sunset", t: 6 * 60, ap: "مساءً", desc: "عند غروب الشمس", rak: 3 },
    { n: "العشاء", sky: "night", t: 8 * 60, ap: "ليلاً", desc: "في الليل بعد أن يظلم الجو", rak: 4 },
  ];
  const ACTS = [
    { t: 6 * 60, pm: false, e: "⏰", x: "نستيقظ من النوم" }, { t: 7 * 60, pm: false, e: "🥣", x: "نتناول الفطور" },
    { t: 7 * 60 + 30, pm: false, e: "🏫", x: "نذهب إلى المدرسة" }, { t: 10 * 60, pm: false, e: "🍎", x: "استراحة المدرسة" },
    { t: 5 * 60, pm: false, e: "🕌", x: "نصلي الفجر" }, { t: 9 * 60, pm: false, e: "📚", x: "الدرس الأول" },
    { t: 60, pm: true, e: "🍲", x: "نتناول الغداء" }, { t: 4 * 60, pm: true, e: "⚽", x: "نلعب في الحديقة" },
    { t: 3 * 60, pm: true, e: "🏠", x: "نعود من المدرسة" }, { t: 7 * 60, pm: true, e: "🍽️", x: "نتناول العشاء" },
    { t: 8 * 60 + 30, pm: true, e: "📖", x: "نقرأ قصة قبل النوم" }, { t: 9 * 60, pm: true, e: "🛏️", x: "ننام" },
  ];

  // ---------------------------------------------------------------- مولّدات الأسئلة
  // سؤال اختيار: { text, vis, opts:[html], ans, topic, sayQ, hint, optCls }
  // سؤال ضبط:   { set: true, target, step, start, text, topic, sayQ }
  const pickT = (step) => R(0, 720 / step - 1) * step;
  function choiceOf(right, wrongs, label) {
    const seen = new Set([norm(right)]), list = [right];
    for (const w of K.shuffle(wrongs)) { const n = norm(w); if (!seen.has(n) && list.length < 3) { seen.add(n); list.push(w); } }
    while (list.length < 3) { const w = right + R(1, 11) * 60; if (!seen.has(norm(w))) { seen.add(norm(w)); list.push(w); } }
    const opts = K.shuffle(list);
    return { opts: opts.map(label), ans: opts.indexOf(right) };
  }
  // أخطاء شائعة لوقت t
  function wrongsFor(t) {
    const h = H(t) % 12, m = MN(t), base = t - m, out = [t + 60, t - 60];
    if (m % 5 === 0 && m) out.push(base + m / 5);                 // قراءة رقم العقرب الطويل كدقائق
    out.push((m / 5 | 0) * 60 + h * 5);                             // تبديل العقربين
    if (m) out.push(base + (60 - m), t + 30, base + ((m + 5) % 60), base + ((m + 55) % 60)); else out.push(t + 30, t + 120);
    return out;
  }
  const timeOpt = (wordsToo) => (t) => `<span class="to">${lcd(t)}${wordsToo ? `<small>${words(t)}</small>` : ""}</span>`;

  function readQ(step, wordsToo) {
    let t = pickT(step);
    if (step === 30 && Math.random() < 0.65) t = pickT(60) + 30;
    if (step === 15 && Math.random() < 0.7) t = pickT(60) + K.pick([15, 45]);
    if (step === 5 && Math.random() < 0.8) t = pickT(60) + K.pick([5, 10, 20, 25, 35, 40, 50, 55]);
    if (step === 1 && Math.random() < 0.85) t = pickT(60) + K.pick(K.range(1, 60).filter((x) => x % 5));
    const fs = step >= 15 ? step : 1, c = choiceOf(t, wrongsFor(t).filter((w) => MN(w) % fs === 0), timeOpt(wordsToo));
    const m = MN(t);
    const hint = m === 0 ? "عقرب الدقائق الطويل عند 12، فالوقت ساعة كاملة. انظر إلى العقرب القصير 👀"
      : m === 30 ? "العقرب الطويل عند 6 = نصف ساعة. العقرب القصير بين رقمين: نقرأ الأصغر"
      : m === 15 ? "العقرب الطويل عند 3 = ربع ساعة 🍕" : m === 45 ? "العقرب الطويل عند 9 = إلا ربعاً، والعقرب القصير قريب من الساعة التالية"
      : "عُدّ الدقائق بخمسات: كل رقم على الساعة = 5 دقائق ✋";
    return { text: "كم الساعة؟", vis: clockSvg(t, { deco: true, mins: step < 15 }), ...c, topic: dig(t), sayQ: "كم الساعة؟", sayOk: say(t), hint, optCls: "tm" };
  }
  function setQ(step, show) {
    let target = pickT(step), start;
    if (step === 5 && Math.random() < 0.7) target = pickT(60) + K.pick([5, 10, 20, 25, 35, 40, 50, 55]);
    do start = pickT(Math.max(step, 5)); while (norm(start) === norm(target));
    show = show || (Math.random() < 0.5 ? "dig" : "words");
    if (step === 1) show = "dig";
    const txt = show === "dig" ? `اضبط الساعة على ${M(dig(target))}` : `اضبط الساعة على ${words(target)}`;
    return { set: true, target, step, start, text: txt, topic: dig(target), sayQ: say(target) };
  }
  function digToAnalog(step) {
    const t = step === 5 ? pickT(60) + K.pick([0, 5, 15, 20, 30, 40, 45, 50]) : pickT(step);
    const showWords = Math.random() < 0.4;
    const c = choiceOf(t, wrongsFor(t), (x) => `<span class="mini">${clockSvg(x)}</span>`);
    return { text: "أي ساعة تُظهر هذا الوقت؟", vis: showWords ? `<div class="bigw">${words(t)}</div>` : `<div class="lcdbox">${lcd(t)}</div>`, ...c, topic: dig(t), sayQ: say(t) + "، أي ساعة تظهر هذا الوقت؟", sayOk: say(t), optCls: "clk",
      hint: "انظر أولاً إلى العقرب الطويل (الدقائق) ثم إلى القصير (الساعات)" };
  }
  function analogToDig(step) {
    const q = readQ(step, false);
    q.text = "ما الوقت على الساعة الرقمية؟";
    return q;
  }
  function apQ() {
    const r = Math.random(), A = K.pick(ACTS), apw = A.pm ? "مساءً" : "صباحاً";
    if (r < 0.5) {
      const c = [`<span class="ap">☀️ صباحاً</span>`, `<span class="ap">🌙 مساءً</span>`];
      return { text: `${A.x} الساعة ${M(dig(A.t))}… صباحاً أم مساءً؟`, vis: `<div class="act"><span class="emo">${A.e}</span>${clockSvg(A.t)}</div>`, opts: c, ans: A.pm ? 1 : 0,
        topic: `${dig(A.t)} ${apw}`, sayQ: `${A.x} الساعة ${words(A.t)}، صباحاً أم مساءً؟`, optCls: "txt", hint: "صباحاً: من منتصف الليل حتى الظهر. مساءً: من الظهر حتى منتصف الليل" };
    }
    if (r < 0.8) {
      const others = K.shuffle(ACTS.filter((x) => x.pm !== A.pm || Math.abs(x.t - A.t) > 120)).slice(0, 2), list = K.shuffle([A, ...others]);
      return { text: `الساعة ${M(dig(A.t))} ${apw}. ماذا نفعل؟`, vis: `<div class="lcdbox">${lcd(A.t, A.pm ? "م" : "ص")}</div>`, opts: list.map((x) => `<span class="ac"><span class="emo">${x.e}</span>${x.x}</span>`), ans: list.indexOf(A),
        topic: `${dig(A.t)} ${apw}`, sayQ: `الساعة ${words(A.t)} ${apw}، ماذا نفعل؟`, optCls: "txt wide3" };
    }
    const h = R(1, 11) + 12, t = (h - 12) * 60, list = K.shuffle([[t, "مساءً"], [t, "صباحاً"], [norm(t + 120), "مساءً"]]);
    return { text: `الساعة ${M(h + ":00")} تعني…`, vis: `<div class="lcdbox">${`<span class="lcd" dir="ltr">${h}:00</span>`}</div>`, opts: list.map(([x, a]) => `<span class="ap">${M(dig(x))} ${a}</span>`), ans: list.findIndex(([x, a]) => x === t && a === "مساءً"),
      topic: `${h}:00`, sayQ: `الساعة ${h}، تعني؟`, optCls: "txt", hint: `بعد الظهر نطرح 12: ${M(`${h} − 12 = ${h - 12}`)}` };
  }
  function prayerQ() {
    const i = R(0, 4), P = PRAYERS[i], r = Math.random();
    const names = (right) => { const l = K.options(right, PRAYERS, 3); return { opts: l.map((x) => `<span class="pn">🕌 ${x.n}</span>`), ans: l.indexOf(right) }; };
    if (r < 0.3) return { text: "أي صلاة في هذا الوقت؟", vis: `<div class="skyb">${skySvg(P.sky)}</div>`, ...names(P), topic: P.n, sayQ: "أي صلاة في هذا الوقت؟", optCls: "txt", hint: P.desc, sayOk: "صلاة " + P.n + "، " + P.desc };
    if (r < 0.5) { const l = K.options(P, PRAYERS, 3);
      return { text: `متى نصلي ${P.n}؟`, vis: `<div class="bigw">🕌 صلاة ${P.n}</div>`, opts: l.map((x) => `<span class="skyo">${skySvg(x.sky)}</span>`), ans: l.indexOf(P), topic: P.n, sayQ: `متى نصلي ${P.n}؟`, optCls: "skies", hint: P.desc }; }
    if (r < 0.65) return { text: `الساعة ${M(dig(P.t))} ${P.ap}، ${P.desc}. أي صلاة؟`, vis: `<div class="act">${clockSvg(P.t)}</div>`, ...names(P), topic: P.n, sayQ: `${P.desc}، أي صلاة؟`, optCls: "txt" };
    if (r < 0.85) { const j = R(0, 3), A = PRAYERS[j], B = PRAYERS[j + 1];
      return { text: `أي صلاة تأتي بعد ${A.n}؟`, vis: prayerRow(j), ...names(B), topic: `بعد ${A.n}`, sayQ: `أي صلاة تأتي بعد ${A.n}؟`, optCls: "txt", hint: "الترتيب: الفجر، الظهر، العصر، المغرب، العشاء" }; }
    if (Math.random() < 0.5) { const l = K.shuffle([2, 3, 4]);
      return { text: `كم ركعة في صلاة ${P.n}؟`, vis: `<div class="skyb">${skySvg(P.sky)}</div>`, opts: l.map((x) => `<span class="big">${x}</span>`), ans: l.indexOf(P.rak), topic: `ركعات ${P.n}`, sayQ: `كم ركعة في صلاة ${P.n}؟`, hint: "الفجر 2، الظهر 4، العصر 4، المغرب 3، العشاء 4" }; }
    const l = K.shuffle([3, 5, 7]);
    return { text: "كم صلاة نصلي في اليوم؟", vis: `<div class="bigw">🕌 🕌 🕌 🕌 🕌</div>`, opts: l.map((x) => `<span class="big">${x}</span>`), ans: l.indexOf(5), topic: "عدد الصلوات", sayQ: "كم صلاة نصلي في اليوم؟" };
  }
  const prayerRow = (j) => `<div class="seq">${PRAYERS.map((p, k) => `<span class="chip${k === j ? " on" : ""}">${k === j + 1 ? "؟" : p.n}</span>`).join("")}</div>`;

  // التقويم: تسلسل دائري مع خانة ناقصة
  const seqVis = (list, start, len, miss) => `<div class="seq">${K.range(0, len).map((k) => { const x = list[(start + k) % list.length]; return `<span class="chip${k === miss ? " q" : ""}">${k === miss ? "؟" : x}</span>`; }).join("")}</div>`;
  function cycleQ(list, kind, topicOf = (x) => x) {
    const n = list.length, i = R(0, n - 1), r = Math.random(), opt = (x) => `<span class="w">${x}</span>`;
    const make = (right, text, vis, sayQ) => { const l = K.options(right, list, 3); return { text, vis, opts: l.map(opt), ans: l.indexOf(right), topic: topicOf(right), sayQ, optCls: "txt" }; };
    if (r < 0.35) return make(list[(i + 1) % n], `ماذا يأتي بعد ${list[i]}؟`, seqVis(list, i, 2, 1), `ماذا يأتي بعد ${list[i]}؟`);
    if (r < 0.65) return make(list[(i + n - 1) % n], `ماذا يأتي قبل ${list[i]}؟`, seqVis(list, i + n - 1, 2, 0), `ماذا يأتي قبل ${list[i]}؟`);
    const miss = R(1, 2), start = i;
    return make(list[(start + miss) % n], "ما الناقص؟", seqVis(list, start, 4, miss), "ما الناقص؟");
  }
  function daysQ() {
    const r = Math.random();
    if (r < 0.7) return cycleQ(DAYS, "day");
    if (r < 0.8) { const l = K.shuffle([5, 7, 10]); return { text: "كم يوماً في الأسبوع؟", vis: `<div class="seq">${DAYS.map((d) => `<span class="chip">${d}</span>`).join("")}</div>`, opts: l.map((x) => `<span class="big">${x}</span>`), ans: l.indexOf(7), topic: "عدد أيام الأسبوع", sayQ: "كم يوماً في الأسبوع؟" }; }
    if (r < 0.9) { const l = K.options("الجمعة", DAYS, 3); return { text: "في أي يوم نصلي صلاة الجمعة في المسجد؟", vis: `<div class="skyb">${skySvg("noon")}</div>`, opts: l.map((x) => `<span class="w">${x}</span>`), ans: l.indexOf("الجمعة"), topic: "الجمعة", sayQ: "في أي يوم نصلي صلاة الجمعة؟", optCls: "txt" }; }
    const i = R(0, 6), right = DAYS[(i + 2) % 7], l = K.options(right, DAYS, 3);
    return { text: `إذا كان اليوم ${DAYS[i]}، فما اليوم بعد غدٍ؟`, vis: seqVis(DAYS, i, 3, 2), opts: l.map((x) => `<span class="w">${x}</span>`), ans: l.indexOf(right), topic: `بعد غد ${DAYS[i]}`, sayQ: `إذا كان اليوم ${DAYS[i]}، فما اليوم بعد غد؟`, optCls: "txt" };
  }
  function monthNumQ(list, label) {
    const i = R(0, 11);
    if (Math.random() < 0.5) { const l = K.options(list[i], list, 3); return { text: `ما الشهر رقم ${i + 1} في السنة ${label}؟`, vis: `<div class="bigw big2">${i + 1}</div>`, opts: l.map((x) => `<span class="w">${x}</span>`), ans: l.indexOf(list[i]), topic: list[i], sayQ: `ما الشهر رقم ${i + 1}؟`, optCls: "txt" }; }
    const l = K.options(i + 1, K.range(1, 13), 3);
    return { text: `${list[i]} هو الشهر رقم…`, vis: `<div class="bigw">📅 ${list[i]}</div>`, opts: l.map((x) => `<span class="big">${x}</span>`), ans: l.indexOf(i + 1), topic: list[i], sayQ: `${list[i]} هو الشهر رقم كم؟` };
  }
  function gmQ() {
    const r = Math.random();
    if (r < 0.55) return cycleQ(GM, "gm");
    if (r < 0.9) return monthNumQ(GM, "الميلادية");
    const l = K.shuffle([7, 10, 12]); return { text: "كم شهراً في السنة؟", vis: `<div class="bigw">📅</div>`, opts: l.map((x) => `<span class="big">${x}</span>`), ans: l.indexOf(12), topic: "عدد الأشهر", sayQ: "كم شهراً في السنة؟" };
  }
  const HFACTS = [
    [8, "في أي شهر نصوم؟", "🌙"], [9, "في أول أي شهر يكون عيد الفطر؟", "🎉"], [11, "في أي شهر يكون الحج وعيد الأضحى؟", "🕋"],
    [0, "ما أول شهر في السنة الهجرية؟", "⭐"], [11, "ما آخر شهر في السنة الهجرية؟", "🏁"],
  ];
  function hmQ() {
    const r = Math.random();
    if (r < 0.45) return cycleQ(HM, "hm");
    if (r < 0.75) { const [i, q, e] = K.pick(HFACTS), l = K.options(HM[i], HM, 3); return { text: q, vis: `<div class="bigw big2"><span class="emo">${e}</span></div>`, opts: l.map((x) => `<span class="w">${x}</span>`), ans: l.indexOf(HM[i]), topic: HM[i], sayQ: q, optCls: "txt" }; }
    if (r < 0.9) return monthNumQ(HM, "الهجرية");
    const i = R(0, 11), right = HM[i], l = K.shuffle([right, ...K.shuffle(GM).slice(0, 2)]);
    return { text: "أي هذه الأشهر شهر هجري؟", vis: `<div class="bigw">🌙</div>`, opts: l.map((x) => `<span class="w">${x}</span>`), ans: l.indexOf(right), topic: right, sayQ: "أي هذه الأشهر شهر هجري؟", optCls: "txt", hint: "الأشهر الهجرية تتبع القمر، مثل رجب وشعبان ورمضان" };
  }
  function seasonQ() {
    const i = R(0, 3), S = SEASONS[i], r = Math.random(), names = (right) => { const l = K.options(right, SEASONS, 3); return { opts: l.map((x) => `<span class="w"><span class="emo">${x.e}</span> ${x.n}</span>`), ans: l.indexOf(right) }; };
    if (r < 0.3) return { text: "أي فصل هذا؟", vis: `<div class="sbox">${seasonSvg(i)}</div>`, ...names(S), topic: S.n, sayQ: "أي فصل هذا؟", optCls: "txt", hint: S.desc, sayOk: S.n + "، " + S.desc };
    if (r < 0.45) { const l = K.options(S, SEASONS, 3); return { text: `أين ${S.n}؟`, vis: `<div class="bigw">${S.n}</div>`, opts: l.map((x) => `<span class="skyo">${seasonSvg(SEASONS.indexOf(x))}</span>`), ans: l.indexOf(S), topic: S.n, sayQ: `أين ${S.n}؟`, optCls: "skies", hint: S.desc }; }
    if (r < 0.65) { const m = K.pick(S.months); return { text: `في أي فصل يكون شهر ${m}؟`, vis: `<div class="bigw">📅 ${m}</div>`, ...names(S), topic: m, sayQ: `في أي فصل يكون شهر ${m}؟`, optCls: "txt", hint: `${S.n}: ${S.months.join("، ")}` }; }
    if (r < 0.82) return { text: "في أي فصل نرى هذه الأشياء؟", vis: `<div class="bigw items"><span class="emo">${S.items.join(" ")}</span></div>`, ...names(S), topic: S.n, sayQ: "في أي فصل نرى هذه الأشياء؟", optCls: "txt", hint: S.desc };
    if (r < 0.95) { const right = SEASONS[(i + 1) % 4]; return { text: `أي فصل يأتي بعد ${S.n}؟`, vis: `<div class="seq">${SEASONS.map((x, k) => `<span class="chip${k === i ? " on" : ""}">${k === (i + 1) % 4 ? "؟" : x.e + " " + x.n}</span>`).join("")}</div>`, ...names(right), topic: `بعد ${S.n}`, sayQ: `أي فصل يأتي بعد ${S.n}؟`, optCls: "txt" }; }
    const l = K.shuffle([2, 4, 6]); return { text: "كم فصلاً في السنة؟", vis: `<div class="bigw items"><span class="emo">🌸 ☀️ 🍂 ❄️</span></div>`, opts: l.map((x) => `<span class="big">${x}</span>`), ans: l.indexOf(4), topic: "عدد الفصول", sayQ: "كم فصلاً في السنة؟" };
  }

  // ---------------------------------------------------------------- المستويات
  const mix = (gens, n = 10) => () => K.range(0, n).map((k) => gens[k % gens.length]());
  const WORLDS = [
    { name: "قراءة الساعة", icon: "🕐", bg: "linear-gradient(135deg,#2dd4bf,#0d9488)", levels: [
      { id: "play", t: "العب بالساعة", icon: "🕹️", screen: () => explore() },
      { id: "h", t: "الساعات الكاملة", gen: () => mixLevel(60, true) },
      { id: "half", t: "النصف", gen: () => mixLevel(30, true) },
      { id: "q", t: "الربع", gen: () => mixLevel(15, true) },
      { id: "m5", t: "كل 5 دقائق", gen: () => mixLevel(5, true) },
      { id: "m1", t: "الدقائق", gen: () => mixLevel(1, false) },
    ] },
    { name: "وقتي ويومي", icon: "⌚", bg: "linear-gradient(135deg,#818cf8,#4f46e5)", levels: [
      { id: "set", t: "حرّك العقارب", icon: "👆", gen: () => K.range(0, 10).map((k) => setQ([60, 60, 30, 30, 15, 15, 5, 5, 5, 1][k])) },
      { id: "dig", t: "رقمي وعقارب", icon: "📟", gen: mix([() => digToAnalog(5), () => analogToDig(5), () => digToAnalog(15), () => analogToDig(30)]) },
      { id: "ap", t: "صباحاً ومساءً", icon: "🌗", gen: mix([apQ]) },
      { id: "pray", t: "أوقات الصلاة", icon: "🕌", intro: () => prayerLearn(), gen: mix([prayerQ]) },
      { id: "tclock", t: "اختبر نفسك", icon: "🏆", test: true, gen: mix([() => readQ(15, true), () => readQ(5, false), () => setQ(5), () => digToAnalog(5), apQ, prayerQ, () => readQ(1, false), () => setQ(15), () => analogToDig(5), prayerQ, apQ, () => readQ(30, true)], 12) },
    ] },
    { name: "التقويم", icon: "📅", bg: "linear-gradient(135deg,#fb923c,#e11d48)", levels: [
      { id: "cal", t: "تعلّم التقويم", icon: "📖", screen: () => calLearn(0) },
      { id: "days", t: "أيام الأسبوع", icon: "7", intro: () => calLearn(0, "days"), gen: mix([daysQ]) },
      { id: "gm", t: "الأشهر الميلادية", icon: "12", intro: () => calLearn(1, "gm"), gen: mix([gmQ]) },
      { id: "hm", t: "الأشهر الهجرية", icon: "🌙", intro: () => calLearn(2, "hm"), gen: mix([hmQ]) },
      { id: "seasons", t: "الفصول الأربعة", icon: "🍂", intro: () => calLearn(3, "seasons"), gen: mix([seasonQ]) },
      { id: "tcal", t: "اختبر نفسك", icon: "🏆", test: true, gen: mix([daysQ, gmQ, hmQ, seasonQ], 12) },
    ] },
  ];
  function mixLevel(step, wordsToo) {
    const out = [];
    for (let k = 0; k < 10; k++) out.push(k === 3 || k === 6 || k === 9 ? setQ(step) : readQ(step, wordsToo));
    return out;
  }
  const LEVELS = WORLDS.flatMap((w) => w.levels.map((L) => ((L.world = w), L)));
  const starsOf = (id) => save.stars[id] || 0;

  // ---------------------------------------------------------------- القائمة
  function mapScreen() {
    K.begin();
    let first = null;
    const total = LEVELS.filter((L) => L.gen).reduce((s, L) => s + starsOf(L.id), 0), max = LEVELS.filter((L) => L.gen).length * 3;
    const rows = WORLDS.map((w) => `<div class="world"><div class="wname" style="background:${w.bg}"><span class="emo">${w.icon}</span><b>${w.name}</b></div>
      <div class="lvls">${w.levels.map((L, k) => {
        const st = starsOf(L.id);
        if (L.gen && !st && !first) first = "l" + L.id;
        const ic = L.icon || k;
        return `<button class="lv f${st ? " done" : ""}${L.test ? " test" : ""}${L.screen ? " free" : ""}" style="--bg:${w.bg}" ${K.act("l" + L.id, () => open(L))}>
          <b class="${/^\d+$/.test(ic) ? "" : "emo"}">${ic}</b><small>${L.t}</small><span class="st">${L.gen ? K.starsHtml(st) : "✨"}</span></button>`;
      }).join("")}</div></div>`).join("");
    K.paint(`<div class="top"><span class="pill">⭐ ${total} / ${max}</span><h2 class="ttl"><span class="emo">🕰️</span> الساعة والتقويم <span class="emo">📅</span></h2><span class="pill">🦉</span></div>
      <div class="map">${rows}</div>${K.HELP}`, first || "lplay");
  }
  function open(L) {
    if (L.screen) return K.show(L.screen);
    if (L.intro && !save.seen?.[L.id]) { save.seen = save.seen || {}; save.seen[L.id] = 1; save.save(); return K.show(introThen, L); }
    K.show(play, L);
  }
  function introThen(L) { L.intro(); }

  // ---------------------------------------------------------------- اللعب
  const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "بطل! 🏆", "شاطر! 💪", "صحيح! ✅"];
  function play(L) {
    const qs = L.gen();
    let q = 0, score = 0;
    const results = [];
    ask();
    function ask() {
      K.begin();
      const Q = qs[q];
      let tries = 0, locked = false, reported = false;
      const report = (ok) => { if (!reported) { reported = true; learn(Q.topic, ok); } };
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "no") : k === q ? "now" : ""}"></i>`).join("");
      const top = `<div class="top">${K.backBtn()}<div class="dots">${dots}</div><button class="btn f" ${K.act("say", () => speak(Q.sayQ))}><span class="emo">🔊</span></button><span class="pill">${q + 1} / ${qs.length}</span></div>`;
      const good = () => {
        locked = true; report(tries === 0);
        if (!tries) score++;
        results[q] = !tries;
        K.sfx.ok(); K.confetti(10);
        $(".cheer").textContent = K.pick(GOOD);
        if (Q.sayOk) K.later(() => speak(Q.sayOk), 500);
        K.later(next, tries ? 2600 : 1800);
      };
      const bad = () => {
        tries++; report(false); K.sfx.bad();
        $(".cheer").textContent = tries === 1 ? "حاول مرة أخرى 💪" : "انظر إلى المساعدة 👆";
        if (Q.hint) { const hb = $(".hint"); hb.innerHTML = `<span class="emo">💡</span> ${Q.hint}`; hb.hidden = false; }
      };
      if (Q.set) return askSet(Q, top, good, bad, () => locked);
      K.paint(`${top}<div class="qtext">${Q.text}</div>
        <div class="playrow"><div class="card">${Q.vis}</div>
        <div class="opts ${Q.optCls || ""}">${Q.opts.map((h, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(j, el))}>${h}</button>`).join("")}</div></div>
        <div class="hint" hidden></div><div class="cheer"></div>`, "o0");
      speak(Q.sayQ);
      function choose(j, el) {
        if (locked || el.dataset.dead) return;
        if (j === Q.ans) { el.classList.add("ok"); good(); }
        else { el.classList.add("bad"); el.dataset.dead = "1"; bad(); }
      }
    }
    function next() {
      q++;
      if (q < qs.length) { K.top().focus = null; return ask(); }
      finish();
    }
    function finish() {
      const s = K.starsFor(score, qs.length), old = starsOf(L.id);
      if (s > old) { save.stars[L.id] = s; save.save(); }
      // النجوم الحقيقية باعتدال: الفرق عن أفضل نتيجة سابقة، و«اختبر نفسك» مرة في اليوم
      let gain = Math.max(0, s - old);
      if (L.test && s >= 2) { const day = new Date().toDateString(); if (save.earned[L.id] !== day) { save.earned[L.id] = day; save.save(); gain = Math.max(gain, s); } }
      const nx = LEVELS[LEVELS.indexOf(L) + 1];
      K.replace(K.resultScreen, { s, score, total: qs.length, title: L.t, again: () => K.replace(play, L),
        next: nx && nx.world === L.world ? { label: nx.t, fn: () => (nx.gen ? K.replace(play, nx) : K.replace(nx.screen)) } : null });
      if (gain) earn(gain, `${L.t}: ${score} من ${qs.length}`).then((n) => {
        if (!n) return;
        const nav = K.app.querySelector(".nav");
        if (nav) nav.insertAdjacentHTML("beforebegin", `<div class="won"><b>+${n}</b> <span class="emo">⭐</span> في رصيدك</div>`);
      });
    }
  }
  const $ = (s) => K.app.querySelector(s);
  const speak = (txt) => { if (txt) K.tts(txt.replace(/<[^>]+>/g, "")); };

  // ضبط العقارب: أزرار، أو سحب العقرب باللمس والفأرة
  function askSet(Q, top, good, bad, isLocked) {
    let t = Q.start;
    const hourOnly = Q.step >= 60, mstep = Math.min(Q.step, 30) === 30 ? 30 : Q.step >= 15 ? 15 : Q.step;
    K.paint(`${top}<div class="qtext">${Q.text}</div>
      <div class="playrow"><div class="card setc">${clockSvg(t, { deco: true, mins: Q.step < 15, id: "sc", cls: "drag" })}<div class="lcdbox reveal" hidden></div></div>
      <div class="ctrl">${ctrlHtml(hourOnly, mstep, (d) => move(d))}
        <button class="btn f go chk" ${K.act("chk", check)}>✔ تحقّق</button></div></div>
      <div class="hint" hidden></div><div class="cheer"></div>`, hourOnly ? "hp" : "mp");
    speak(Q.sayQ);
    const svg = $("#sc");
    function move(d) { if (isLocked()) return; t += d; setHands(svg, t); K.sfx.tick(); }
    function check() {
      if (isLocked()) return;
      const r = $(".reveal");
      r.innerHTML = lcd(t); r.hidden = false;
      if (norm(t) === norm(Q.target)) { r.classList.add("ok"); good(); return; }
      r.classList.remove("ok"); bad();
      const tm = MN(Q.target);
      $(".hint").innerHTML = `<span class="emo">💡</span> العقرب الطويل عند ${tm === 0 ? 12 : tm % 5 ? `${tm} دقيقة` : tm / 5}، والقصير ${tm >= 30 ? "بين " + H(Q.target) + " و " + nextH(Q.target) : "عند " + H(Q.target)}`;
      $(".hint").hidden = false;
      if ($(".cheer").textContent.includes("المساعدة")) { K.later(() => { t = t + ((norm(Q.target) - norm(t) + 720) % 720); setHands(svg, t); }, 600); }
    }
    dragClock(svg, () => t, (v) => { if (!isLocked()) { t = v; setHands(svg, t); } }, hourOnly, Q.step);
  }
  function ctrlHtml(hourOnly, mstep, mv) {
    return `<div class="cg"><span>الساعة<i class="dot o"></i></span><button class="btn f" ${K.act("hp", () => mv(60))}>+ 1</button><button class="btn f" ${K.act("hm", () => mv(-60))}>− 1</button></div>
      ${hourOnly ? "" : `<div class="cg"><span>الدقائق<i class="dot b"></i></span><button class="btn f" ${K.act("mp", () => mv(mstep))}>+ ${mstep}</button><button class="btn f" ${K.act("mm", () => mv(-mstep))}>− ${mstep}</button></div>`}`;
  }
  function dragClock(svg, get, set, hourOnly, step) {
    let on = false;
    const ang = (e) => { const r = svg.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height * (118 / 236)); return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360; };
    const upd = (e) => {
      const a = ang(e), t = get();
      if (hourOnly) { const h = Math.round(a / 30) % 12; let d = h * 60 - (norm(t) - MN(t)); d = ((d % 720) + 1080) % 720 - 360; set(t + d); return; }
      const st = Math.max(1, Math.min(step, 5)), m = (Math.round(a / 6 / st) * st) % 60;
      let d = m - MN(t); if (d > 30) d -= 60; if (d < -30) d += 60;
      if (d) set(t + d);
    };
    svg.addEventListener("pointerdown", (e) => { on = true; svg.setPointerCapture(e.pointerId); svg.classList.add("dragging"); upd(e); e.preventDefault(); });
    svg.addEventListener("pointermove", (e) => { if (on) upd(e); });
    const end = () => { on = false; svg.classList.remove("dragging"); };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  }

  // ---------------------------------------------------------------- العب بالساعة (بلا أسئلة)
  function explore() {
    K.begin();
    const now = new Date();
    let t = K.top().t ?? ((now.getHours() % 12) * 60 + now.getMinutes());
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl"><span class="emo">🕹️</span> العب بالساعة</h2><button class="btn f" ${K.act("say", () => speak(say(t)))}><span class="emo">🔊</span></button></div>
      <div class="playrow"><div class="card setc">${clockSvg(t, { deco: true, mins: true, id: "sc", cls: "drag" })}</div>
      <div class="ctrl"><div class="readout"><div class="js-l"></div><div class="js-w"></div></div>${ctrlHtml(false, 5, (d) => mv(d))}
      <div class="cg"><button class="btn f" ${K.act("m1p", () => mv(1))}>+ 1 دقيقة</button><button class="btn f" ${K.act("now", () => { const n = new Date(); mv(((n.getHours() % 12) * 60 + n.getMinutes()) - norm(t)); })}>🕰️ الآن</button></div></div></div>
      <div class="hint">حرّك العقرب الطويل بإصبعك أو بالأزرار، وانظر كيف يتحرك القصير معه 👆</div>`, "mp");
    const svg = $("#sc");
    const draw = () => { $(".js-l").innerHTML = lcd(t); $(".js-w").textContent = words(t); K.top().t = t; };
    function mv(d) { t += d; setHands(svg, t); draw(); K.sfx.tick(); }
    draw();
    dragClock(svg, () => t, (v) => { t = v; setHands(svg, t); draw(); }, false, 1);
  }

  // ---------------------------------------------------------------- تعلّم أوقات الصلاة
  function prayerLearn() {
    K.begin();
    const L = LEVELS.find((x) => x.id === "pray");
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ttl"><span class="emo">🕌</span> الصلوات الخمس</h2><span class="pill">${K.starsHtml(starsOf("pray"))}</span></div>
      <div class="cards5">${PRAYERS.map((p, i) => `<button class="pcard f" data-say="صلاة ${p.n}، ${p.desc}، ${p.rak === 2 ? "ركعتان" : p.rak + " ركعات"}" ${K.act("p" + i, (el) => speak(el.dataset.say))}>
        ${skySvg(p.sky)}<b>${p.n}</b><span class="pt">${lcd(p.t)} <i>${p.ap}</i></span><small>${p.desc}</small><span class="rk">${p.rak === 2 ? "ركعتان" : p.rak + " ركعات"}</span></button>`).join("")}</div>
      <div class="sub note2">🌍 الأوقات هنا مثال، وتتغير كل يوم حسب الفصل والمدينة. اسأل بابا أو ماما عن أوقات اليوم.</div>
      <div class="nav"><button class="btn f go" ${K.act("go", () => K.replace(play, L))}>ابدأ الأسئلة ←</button></div>`, "p0");
  }

  // ---------------------------------------------------------------- تعلّم التقويم
  const TABS = ["أيام الأسبوع", "الأشهر الميلادية", "الأشهر الهجرية", "الفصول"];
  const TAB_LV = ["days", "gm", "hm", "seasons"];
  function calLearn(tab) {
    K.begin();
    tab = K.top().tab ?? tab;
    const sw = (k) => { K.top().tab = k; K.top().focus = "t" + k; K.render(); };
    let body = "";
    if (tab === 0) body = `<div class="row7">${DAYS.map((d, i) => `<button class="dcard f${i === 5 ? " fri" : ""}" data-say="${d}" ${K.act("d" + i, (el) => speak(el.dataset.say))}><i>${i + 1}</i><b>${d}</b>${i === 5 ? "<small>🕌 صلاة الجمعة</small>" : ""}</button>`).join("")}</div>
      <div class="sub">في الأسبوع 7 أيام، وبعد السبت يعود الأحد من جديد 🔁</div>`;
    if (tab === 1) body = `<div class="grid12">${GM.map((m, i) => `<button class="mcard f" style="--c:${["#38bdf8", "#4ade80", "#fbbf24", "#fb923c"][[3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][i]]}" data-say="${m}، الشهر رقم ${i + 1}" ${K.act("m" + i, (el) => speak(el.dataset.say))}><i>${i + 1}</i><b>${m}</b></button>`).join("")}</div>
      <div class="sub">السنة الميلادية 12 شهراً، تبدأ بيناير وتنتهي بديسمبر</div>`;
    if (tab === 2) body = `<div class="grid12">${HM.map((m, i) => `<button class="mcard f hj" data-say="${m}" ${K.act("m" + i, (el) => speak(el.dataset.say))}><i>${i + 1}</i><b>${m}</b>${HM_ICON[i] ? `<span class="emo">${HM_ICON[i]}</span>` : ""}</button>`).join("")}</div>
      <div class="sub">🌙 الأشهر الهجرية تتبع القمر: ⭐ محرّم أولها · 🌙 رمضان شهر الصيام · 🎉 عيد الفطر أول شوّال · 🕋 الحج وعيد الأضحى في ذي الحجة</div>`;
    if (tab === 3) body = `<div class="row4">${SEASONS.map((s, i) => `<button class="scard f" data-say="${s.n}، ${s.desc}" ${K.act("s" + i, (el) => speak(el.dataset.say))}>${seasonSvg(i)}<b>${s.e} ${s.n}</b><small>${s.desc}</small><i>${s.months.join(" · ")}</i></button>`).join("")}</div>
      <div class="sub">الربيع ← الصيف ← الخريف ← الشتاء، ثم يعود الربيع 🔁</div>`;
    const L = LEVELS.find((x) => x.id === TAB_LV[tab]);
    K.paint(`<div class="top">${K.backBtn()}<div class="tabs">${TABS.map((n, k) => `<button class="btn f tab${k === tab ? " on" : ""}" ${K.act("t" + k, () => sw(k))}>${n}</button>`).join("")}</div></div>
      <div class="learn">${body}</div>
      <div class="nav"><button class="btn f go" ${K.act("go", () => K.replace(play, L))}>أسئلة ${TABS[tab]} ←</button></div>`, "t" + tab);
  }

  K.onFocus = (el) => { if (el.dataset.say) speak(el.dataset.say); };
  K.start(mapScreen);
})();
