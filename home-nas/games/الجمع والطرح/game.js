// الجمع والطرح — من العدّ بالصور حتى الطرح بالاستلاف في المئات.
// 28 مستوى في 5 عوالم مرتبة من الأسهل إلى الأصعب، وأغلبها للطرح. كل مستوى 10 مسائل، ويُفتح التالي بعد إنهاء السابق.
// «الكبير والصغير»: طرف فيه جمع عددين وطرف فيه طرح عددين، والطفل يختار الأكبر أو الأصغر (حتى 10، حتى 20، برقمين، بثلاثة أرقام).
(() => {
  "use strict";
  const save = K.store("addsub", { stars: {}, best: 0 });
  const R = (a, b) => a + ((Math.random() * (b - a + 1)) | 0); // من a إلى b
  const THINGS = ["🍎", "🍓", "🐟", "🎈", "⭐", "🐥", "🌸", "🍪", "🦋", "🚗", "⚽", "🧁", "🍊", "🐞", "🍩", "🐢"];
  const FLY = ["🐦", "🦋", "🐝", "🎈"];
  const arD = (n) => Number(n).toLocaleString("ar-EG", { useGrouping: false });
  const numHtml = (n) => `<span class="n"><b>${n}</b><small>${arD(n)}</small></span>`;
  const MINUS = "−";
  const M = (t) => `<bdi dir="ltr">${t}</bdi>`; // معادلة داخل نص عربي: تبقى من اليسار إلى اليمين

  // ---------------------------------------------------------------- رسومات المسائل
  const size = (n) => (n <= 5 ? 8 : n <= 10 ? 6.2 : 4.6);
  const group = (e, n, crossed = 0, cls = "") => `<div class="grp ${cls}" style="--w:${Math.min(5, Math.max(1, Math.ceil(Math.sqrt(n * 1.6))))};--s:${size(n)}vh">${
    Array.from({ length: n }, (_, i) => `<span class="emo${i >= n - crossed ? " gone" : ""}">${e}</span>`).join("")}</div>`;

  // إطارات العشرة: n نقطة، آخر b بلون ثانٍ، وآخر x مشطوبة
  function frames(n, o = {}) {
    const cell = (i) => {
      if (i >= n) return "<i></i>";
      const c = ["on"];
      if (o.b && i >= n - o.b) c.push("b");
      if (o.x && i >= n - o.x) c.push("x");
      return `<i class="${c.join(" ")}"></i>`;
    };
    const fr = (k) => `<div class="tf">${K.range(k * 10, k * 10 + 10).map(cell).join("")}</div>`;
    return `<div class="tfs" dir="ltr">${fr(0)}${n > 10 || o.two ? fr(1) : ""}</div>`;
  }

  // خط الأعداد مع قفزات
  function nline(max, start, hops = 0, sign = -1, mark = null) {
    const W = 1000, P = 34, step = (W - 2 * P) / max, x = (v) => P + v * step;
    let s = `<svg class="nl" viewBox="0 0 ${W} 150" dir="ltr"><line x1="${P - 14}" y1="100" x2="${W - P + 14}" y2="100" class="ax"/>`;
    for (let v = 0; v <= max; v++) {
      s += `<line x1="${x(v)}" y1="88" x2="${x(v)}" y2="112" class="tk"/><text x="${x(v)}" y="142" class="${v === start ? "st" : v === mark ? "en" : ""}">${v}</text>`;
    }
    for (let k = 0; k < hops; k++) {
      const a = start + sign * k, b = a + sign, h = Math.min(60, 26 + step * 0.5);
      s += `<path d="M${x(a)} 86 Q ${(x(a) + x(b)) / 2} ${86 - h} ${x(b)} 86" class="hop" style="animation-delay:${k * 0.22}s"/>`;
    }
    s += `<circle cx="${x(start)}" cy="100" r="12" class="pt"/>`;
    if (mark != null) s += `<circle cx="${x(mark)}" cy="100" r="12" class="pt end"/>`;
    return s + "</svg>";
  }

  // مكعبات العشرات والآحاد
  function blocks(n, xt = 0, xo = 0) {
    const t = Math.floor(n / 10), o = n % 10;
    return `<div class="blk" dir="ltr">${K.range(0, t).map((k) => `<i class="rod${k >= t - xt ? " x" : ""}"></i>`).join("")}
      <span class="ones">${K.range(0, o).map((k) => `<i class="one${k >= o - xo ? " x" : ""}"></i>`).join("")}</span></div>`;
  }

  // الطرح أو الجمع بالأعمدة
  const PLACE = ["الآحاد", "العشرات", "المئات"], PLACE_H = ["آحاد", "عشرات", "مئات"];
  function column(a, b, op = MINUS) {
    const w = String(Math.max(a, b)).length;
    const cells = (n) => String(n).padStart(w, " ").split("").map((d) => `<span>${d.trim()}</span>`).join("");
    return `<div class="colw" dir="ltr" style="--w:${w}">
      <div class="row hd"><b></b>${PLACE_H.slice(0, w).reverse().map((p) => `<span>${p}</span>`).join("")}</div>
      <div class="row"><b></b>${cells(a)}</div><div class="row"><b class="op">${op}</b>${cells(b)}</div>
      <div class="bar"></div><div class="row res"><b></b>${'<span class="rd"></span>'.repeat(w)}</div></div>`;
  }
  const digits = (n, w) => String(n).padStart(w, "0").split("").reverse().map(Number); // الآحاد أولاً
  function colSteps(a, b, op = MINUS) {
    const w = String(a).length, da = digits(a, w), db = digits(b, w), out = [];
    let carry = 0;
    for (let i = 0; i < w; i++) {
      if (op === "+") {
        const s = da[i] + db[i] + carry;
        out.push(`${PLACE[i]}: ${M(`${da[i]} + ${db[i]}${carry ? " + 1" : ""} = ${s}`)}${s > 9 ? "، نكتب " + (s % 10) + " ونحمل 1" : ""}`);
        carry = s > 9 ? 1 : 0;
        continue;
      }
      const x = da[i] - carry, y = db[i];
      const pre = carry ? `(${da[i]} صارت ${x} بعد الاستلاف) ` : "";
      if (x < y) { out.push(`${PLACE[i]}: ${pre}${x} أصغر من ${y}، نستلف عشرة: ${M(`${x + 10} ${MINUS} ${y} = ${x + 10 - y}`)}`); carry = 1; }
      else { out.push(`${PLACE[i]}: ${pre}${M(`${x} ${MINUS} ${y} = ${x - y}`)}`); carry = 0; }
    }
    return out.reverse().join("<br>");
  }
  const needsBorrow = (a, b) => { const w = String(a).length, da = digits(a, w), db = digits(b, w); return da.some((d, i) => d < db[i]); };

  // ---------------------------------------------------------------- أنواع المسائل
  // كل مسألة: { text?, vis?, eq, ans, hint, after?(card), say? , opts? }
  const sub = (a, b) => ({ eq: `${a} ${MINUS} ${b} = ?`, ans: a - b, say: `${a} ناقص ${b}` });
  const add = (a, b) => ({ eq: `${a} + ${b} = ?`, ans: a + b, say: `${a} زائد ${b}` });

  function picAdd(max) {
    const a = R(1, max - 1), b = R(1, max - a), e = K.pick(THINGS);
    return { ...add(a, b), vis: `<div class="eqp" dir="ltr">${group(e, a)}<span class="sign">+</span>${group(e, b)}</div>`, hint: "عُدّ كل الصور معاً 👆" };
  }
  function picSub(max) {
    const a = R(2, max);
    let b = R(1, a);
    if (b === a && Math.random() < 0.7) b = a - 1;
    return { ...sub(a, b), vis: group(K.pick(THINGS), a, b), hint: "عُدّ الصور التي لم تُشطب ✋" };
  }
  function flySub(max) {
    const a = R(2, max), b = R(1, a - 1), e = K.pick(FLY);
    return { ...sub(a, b), text: "طار بعضها! كم بقي؟", vis: `<div class="tree">${group(e, a, 0, "flyg")}</div>`, hint: "عُدّ الباقية فقط 👀",
      show(card) { K.later(() => { [...card.querySelectorAll(".flyg .emo")].slice(a - b).forEach((el, i) => { el.style.animationDelay = i * 0.12 + "s"; el.classList.add("away"); }); }, 900); } };
  }
  function picTaken(max) {
    const a = R(3, max), b = R(1, a - 1), c = a - b, e = K.pick(THINGS);
    return { eq: `${a} ${MINUS} ? = ${c}`, ans: b, say: `${a} ناقص كم يساوي ${c}`,
      text: "كان عندنا… وبقي… كم أخذنا؟", vis: `<div class="two"><div><small>كان</small><div class="g1">${group(e, a)}</div></div><div><small>بقي</small>${group(e, c)}</div></div>`,
      hint: `كم صورة نشطب من ${a} حتى يبقى ${c}؟`, after(card) { card.querySelector(".g1").innerHTML = group(e, a, b); } };
  }
  function lineSub(max) {
    const a = R(3, max), b = R(1, a - 1);
    return { ...sub(a, b), vis: nline(max, a), hint: `ابدأ من ${a} وارجع ${b} قفزات ⬅️`,
      after(card) { card.querySelector(".vis").innerHTML = nline(max, a, b, -1, a - b); } };
  }
  function numMix(max, pSub) {
    if (Math.random() < pSub) {
      const a = R(2, max), b = R(1, a);
      return { ...sub(a, b), hint: `ابدأ من ${a} وعُدّ إلى الوراء ${b}`, after(card) { card.querySelector(".vis").innerHTML = nline(max, a, b, -1, a - b); }, vis: "" };
    }
    const a = R(1, max - 1), b = R(1, max - a);
    return { ...add(a, b), hint: `ابدأ من ${a} وعُدّ إلى الأمام ${b}`, after(card) { card.querySelector(".vis").innerHTML = nline(max, a, b, 1, a + b); }, vis: "" };
  }
  function frameAdd() {
    const a = R(3, 12), b = R(2, Math.min(9, 20 - a)), n = a + b;
    const fill = 10 - a;
    const hint = a < 10 && n > 10 ? `أكمل العشرة: ${M(`${a} + ${fill} = 10`)}، ثم ${M(`10 + ${b - fill} = ${n}`)}` : "عُدّ كل النقاط";
    return { ...add(a, b), vis: frames(n, { b, two: true }), hint };
  }
  function frameSub(cross) {
    let a, b;
    if (cross) { a = R(11, 18); b = R(a - 9, 9); }
    else { a = R(11, 20); b = R(1, Math.max(1, a - 10)); if (b > a - 10) b = a - 10 || 1; }
    const u = a - 10;
    const hint = cross ? `اطرح ${u} لتصل إلى 10، ثم اطرح ${b - u} الباقية: ${M(`10 ${MINUS} ${b - u} = ${10 - (b - u)}`)}`
      : `اطرح من الآحاد: ${M(`${u} ${MINUS} ${b} = ${u - b}`)}، والعشرة تبقى`;
    return { ...sub(a, b), vis: frames(a, { x: cross ? 0 : b, two: true }), hint, after: cross ? (card) => { card.querySelector(".vis").innerHTML = frames(a, { x: b, two: true }); } : null };
  }
  function missing(max) {
    const r = Math.random();
    if (r < 0.4) { const a = R(5, max), c = R(1, a - 2), b = a - c; return { eq: `${a} ${MINUS} ? = ${c}`, ans: b, hint: `فكّر: ${M(`${c} + ? = ${a}`)}`, say: `${a} ناقص كم يساوي ${c}` }; }
    if (r < 0.75) { const b = R(2, Math.floor(max / 2)), c = R(1, max - b); return { eq: `? ${MINUS} ${b} = ${c}`, ans: b + c, hint: `العدد المجهول = ${M(`${c} + ${b}`)}`, say: `كم ناقص ${b} يساوي ${c}` }; }
    const a = R(1, max - 3), c = R(a + 2, max); return { eq: `${a} + ? = ${c}`, ans: c - a, hint: `اطرح: ${M(`${c} ${MINUS} ${a}`)}`, say: `${a} زائد كم يساوي ${c}` };
  }

  // مسائل قصصية: الأسماء والأفعال حسب الجنس، والعدد دائماً بعد «عددها» ليبقى الكلام صحيحاً مع أي رقم
  const NAMES = [["عمر", "m"], ["آدم", "m"], ["علي", "m"], ["سامي", "m"], ["سلمى", "f"], ["ليلى", "f"], ["زينب", "f"], ["نور", "f"]];
  const STORIES = [
    { op: "-", t: (n, f, a, b) => `عند ${n} بالونات عددها ${a}، طار منها ${b}. كم بالوناً بقي ${f ? "معها" : "معه"}؟` },
    { op: "-", t: (n, f, a, b) => `على الشجرة عصافير عددها ${a}، طار منها ${b}. كم عصفوراً بقي على الشجرة؟` },
    { op: "-", t: (n, f, a, b) => `${f ? "قطفت" : "قطف"} ${n} تفاحات عددها ${a}، ${f ? "وأكلت" : "وأكل"} منها ${b}. كم تفاحةً بقيت؟` },
    { op: "-", t: (n, f, a, b) => `في الصف تلاميذ عددهم ${a}، خرج منهم ${b} إلى الحديقة. كم تلميذاً بقي في الصف؟` },
    { op: "-", t: (n, f, a, b) => `مع ${n} ${a} يورو، ${f ? "اشترت" : "اشترى"} قصة بـ ${b} يورو. كم يورو بقي ${f ? "معها" : "معه"}؟` },
    { op: "-", t: (n, f, a, b) => `في الصحن حبات فراولة عددها ${a}، أكلت العائلة منها ${b}. كم حبةً بقيت؟` },
    { op: "-", t: (n, f, a, b) => `في الموقف سيارات عددها ${a}، خرجت منها ${b}. كم سيارةً بقيت؟` },
    { op: "-", t: (n, f, a, b) => `لدى ${n} أقلام تلوين عددها ${a}، ${f ? "أعطت أخاها" : "أعطى أخاه"} منها ${b}. كم قلماً بقي ${f ? "معها" : "معه"}؟` },
    { op: "-", t: (n, f, a, b) => `في الحوض أسماك عددها ${a}، نقلنا منها ${b} إلى حوض آخر. كم سمكةً بقيت؟` },
    { op: "diff", t: (n, f, a, b) => `${f ? "قرأت" : "قرأ"} ${n} صفحات عددها ${a}، وقرأ أخوه${f ? "ا" : ""} صفحات عددها ${b}. كم صفحةً ${f ? "قرأت" : "قرأ"} أكثر منه؟` },
    { op: "need", t: (n, f, a, b) => `${f ? "تحتاج" : "يحتاج"} ${n} إلى ملصقات عددها ${a} ${f ? "لتكمل" : "ليكمل"} الألبوم، و${f ? "عندها" : "عنده"} منها ${b}. كم ملصقاً ${f ? "ينقصها" : "ينقصه"}؟` },
    { op: "+", t: (n, f, a, b) => `عند ${n} كرات عددها ${a}، ${f ? "وأهدتها" : "وأهدته"} جدّت${f ? "ها" : "ه"} كرات أخرى عددها ${b}. كم كرةً صار ${f ? "عندها" : "عنده"}؟` },
    { op: "+", t: (n, f, a, b) => `في الحديقة عصافير عددها ${a}، ثم جاءت عصافير أخرى عددها ${b}. كم عصفوراً صار في الحديقة؟` },
  ];
  function story(max) {
    const S = K.pick(STORIES), [n, g] = K.pick(NAMES), f = g === "f";
    let a, b, ans, eq;
    if (S.op === "+") { a = R(2, max - 2); b = R(1, max - a); ans = a + b; eq = `${a} + ${b}`; }
    else { a = R(max <= 20 ? 6 : 20, max); b = R(max <= 20 ? 2 : 5, a - 1); ans = a - b; eq = `${a} ${MINUS} ${b}`; }
    return { text: S.t(n, f, a, b), eq: "?", ans, hint: M(`${eq} = ?`), say: S.t(n, f, a, b), cls: "storyq" };
  }
  function tens() {
    if (Math.random() < 0.7) {
      const a = R(2, 9) * 10, b = R(1, a / 10 - 1) * 10;
      return { ...sub(a, b), vis: blocks(a, b / 10), hint: `عُدّ الأعمدة: ${M(`${a / 10} ${MINUS} ${b / 10} = ${a / 10 - b / 10}`)}، وكل عمود = 10` };
    }
    const a = R(1, 8) * 10, b = R(1, 9 - a / 10) * 10;
    return { ...add(a, b), vis: `<div class="eqp" dir="ltr">${blocks(a)}<span class="sign">+</span>${blocks(b)}</div>`, hint: `عُدّ الأعمدة: ${M(`${a / 10} + ${b / 10} = ${a / 10 + b / 10}`)}، وكل عمود = 10` };
  }
  function add100() {
    const ta = R(1, 7), ua = R(0, 8), tb = R(1, 8 - ta), ub = R(0, 9 - ua), a = ta * 10 + ua, b = tb * 10 + ub;
    return { ...add(a, b), vis: column(a, b, "+"), eq: null, hint: colSteps(a, b, "+") };
  }
  function sub100(borrow) {
    let a, b;
    do {
      const ta = R(2, 9), tb = R(1, ta - 1);
      const ua = borrow ? R(0, 8) : R(1, 9), ub = borrow ? R(ua + 1, 9) : R(0, ua);
      a = ta * 10 + ua; b = tb * 10 + ub;
    } while (a - b < 3);
    return { ...sub(a, b), vis: column(a, b), eq: null, hint: colSteps(a, b) };
  }
  function three() {
    if (Math.random() < 0.7) {
      const a = R(12, 40), b = R(2, Math.floor(a / 2)), c = R(1, a - b - 1);
      return { eq: `${a} ${MINUS} ${b} ${MINUS} ${c} = ?`, ans: a - b - c, hint: `أولاً: ${M(`${a} ${MINUS} ${b} = ${a - b}`)}، ثم اطرح ${c}`, say: `${a} ناقص ${b} ناقص ${c}` };
    }
    const a = R(5, 30), b = R(2, 20), c = R(1, a + b - 1);
    return { eq: `${a} + ${b} ${MINUS} ${c} = ?`, ans: a + b - c, hint: `أولاً: ${M(`${a} + ${b} = ${a + b}`)}، ثم اطرح ${c}`, say: `${a} زائد ${b} ناقص ${c}` };
  }
  function hundreds(borrow) {
    let a, b, n = 0;
    do {
      if (borrow) { a = R(2, 9) * 100 + R(1, 9) * 10 + R(0, 9); b = R(100, a - 20); }
      else {
        const h = R(2, 9), t = R(0, 9), u = R(0, 9);
        a = h * 100 + t * 10 + u; b = R(1, h - 1) * 100 + R(0, t) * 10 + R(0, u);
        if (Math.random() < 0.4) { a -= a % 10; b -= b % 10; }
      }
    } while (++n < 50 && (needsBorrow(a, b) !== borrow || a - b < 5));
    return { ...sub(a, b), vis: column(a, b), eq: null, hint: colSteps(a, b) };
  }

  // الكبير والصغير: جمع في طرف وطرح في الطرف الآخر، والقيمتان متقاربتان حتى يحتاج الطفل أن يحسب
  const CMP = {
    10: { a: [1, 9], s: [2, 10], c: [2, 10], d: [1, 9], gap: 3 },
    20: { a: [2, 18], s: [5, 20], c: [8, 20], d: [2, 12], gap: 4 },
    99: { a: [10, 89], s: [25, 99], c: [30, 99], d: [10, 79], gap: 12 },
    999: { a: [100, 899], s: [250, 999], c: [300, 999], d: [100, 799], gap: 60 },
  };
  function compare(tier) {
    const T = CMP[tier], cap = tier === 99 ? 99 : tier === 999 ? 999 : tier;
    let a, b, c, d, n = 0;
    for (;;) {
      const S = R(T.s[0], T.s[1]);
      a = R(T.a[0], Math.min(T.a[1], S - T.a[0])); b = S - a;
      if (b < T.a[0] || a < T.a[0]) { if (++n < 300) continue; }
      const D = Math.random() < 0.15 ? S : S + (Math.random() < 0.5 ? -1 : 1) * R(1, T.gap);
      const dHi = Math.min(T.d[1], cap - D);
      if (D >= 1 && dHi >= T.d[0]) { d = R(T.d[0], dHi); c = D + d; if (c >= T.c[0] && c <= T.c[1]) break; }
      if (++n > 300) { c = R(T.c[0], T.c[1]); d = R(1, c - 1); break; }
    }
    const S = a + b, D = c - d, sumLeft = Math.random() < 0.5, big = Math.random() < 0.55;
    const P = { eq: `${a} + ${b}`, v: S, say: `${a} زائد ${b}` }, Mn = { eq: `${c} ${MINUS} ${d}`, v: D, say: `${c} ناقص ${d}` };
    const [Lf, Rt] = sumLeft ? [P, Mn] : [Mn, P];
    const ans = Lf.v === Rt.v ? "=" : (Lf.v > Rt.v) === big ? "L" : "R";
    const word = big ? "أكبر" : "أصغر", rel = Lf.v === Rt.v ? "متساويان" : null;
    const hint = `${M(`${P.eq} = ${S}`)} و ${M(`${Mn.eq} = ${D}`)}<br>${rel ? "العددان متساويان ⚖️" : big ? `${Math.max(S, D)} أكبر من ${Math.min(S, D)}` : `${Math.min(S, D)} أصغر من ${Math.max(S, D)}`}`;
    return { cmp: true, L: Lf, R: Rt, big, ans, hint, key: `${Lf.eq}|${Rt.eq}|${big}`,
      text: `أيهما ${word}؟`, say: `أيهما ${word}: ${Lf.say}، أم ${Rt.say}؟` };
  }

  // ---------------------------------------------------------------- العوالم والمستويات
  const WORLDS = [
    { name: "حديقة الخمسة", icon: "🌱", bg: "linear-gradient(135deg,#4ade80,#16a34a)", levels: [
      { id: "p5a", t: "اجمع حتى 5", g: () => picAdd(5) },
      { id: "p5s", t: "اطرح حتى 5", g: () => picSub(5) },
      { id: "fly5", t: "طار وبقي", g: () => flySub(5) },
      { id: "mix5", t: "اجمع واطرح", g: () => (Math.random() < 0.6 ? picSub(5) : picAdd(5)) },
    ] },
    { name: "بحر العشرة", icon: "🐠", bg: "linear-gradient(135deg,#38bdf8,#2563eb)", levels: [
      { id: "p10a", t: "اجمع حتى 10", g: () => picAdd(10) },
      { id: "p10s", t: "اطرح حتى 10", g: () => picSub(10) },
      { id: "take10", t: "كم أخذنا؟", g: () => picTaken(10) },
      { id: "line10", t: "خط الأعداد", g: () => lineSub(10) },
      { id: "num10", t: "أرقام فقط", g: () => numMix(10, 0.7) },
      { id: "cmp10", t: "الكبير والصغير حتى 10", tag: "حتى 10", cmp: true, g: () => compare(10) },
    ] },
    { name: "صحراء العشرين", icon: "🐪", bg: "linear-gradient(135deg,#fbbf24,#ea580c)", levels: [
      { id: "f20a", t: "اجمع حتى 20", g: () => frameAdd() },
      { id: "f20s", t: "اطرح من العشرين", g: () => frameSub(false) },
      { id: "f20x", t: "اطرح عبر العشرة", g: () => frameSub(true), pad: true },
      { id: "cmp20", t: "الكبير والصغير حتى 20", tag: "حتى 20", cmp: true, g: () => compare(20) },
      { id: "miss20", t: "العدد الناقص", g: () => missing(20), pad: true },
      { id: "st20", t: "قصص حتى 20", g: () => story(20), pad: true },
    ] },
    { name: "جبال المئة", icon: "⛰️", bg: "linear-gradient(135deg,#a78bfa,#7c3aed)", levels: [
      { id: "tens", t: "العشرات", g: () => tens(), pad: true },
      { id: "a100", t: "اجمع حتى 100", g: () => add100(), pad: true },
      { id: "s100", t: "اطرح حتى 100", g: () => sub100(false), pad: true },
      { id: "b100", t: "الاستلاف", g: () => sub100(true), pad: true },
      { id: "cmp99", t: "الكبير والصغير برقمين", tag: "برقمين", cmp: true, g: () => compare(99) },
      { id: "st100", t: "قصص حتى 100", g: () => story(100), pad: true },
    ] },
    { name: "فضاء الأبطال", icon: "🚀", bg: "linear-gradient(135deg,#f472b6,#be123c)", levels: [
      { id: "three", t: "ثلاثة أعداد", g: () => three(), pad: true },
      { id: "miss100", t: "الناقص حتى 100", g: () => missing(100), pad: true },
      { id: "h", t: "المئات", g: () => hundreds(false), pad: true },
      { id: "hb", t: "استلاف المئات", g: () => hundreds(true), pad: true },
      { id: "cmp999", t: "الكبير والصغير بثلاثة أرقام", tag: "بثلاثة أرقام", cmp: true, g: () => compare(999) },
      { id: "speed", t: "تحدّي السرعة", speed: true, pad: true },
    ] },
  ];
  const LEVELS = WORLDS.flatMap((w, wi) => w.levels.map((l) => ({ ...l, wi })));
  // النجوم محفوظة باسم المستوى (لا برقمه) حتى لا يضيع التقدّم عند إضافة مستويات أو تغيير ترتيبها.
  // النسخة القديمة كانت تحفظها برقم المستوى بهذا الترتيب:
  const OLD = ["p5a", "p5s", "fly5", "mix5", "p10a", "p10s", "take10", "line10", "num10", "f20a", "f20s", "f20x", "miss20", "st20",
    "tens", "a100", "s100", "b100", "st100", "miss100", "three", "h", "hb", "speed"];
  if (!save.st) { save.st = {}; Object.keys(save.stars || {}).forEach((k) => { if (OLD[k]) save.st[OLD[k]] = save.stars[k]; }); save.save(); }
  const starsOf = (i) => save.st[LEVELS[i].id] || 0;
  const setStars = (i, s) => { save.st[LEVELS[i].id] = Math.max(starsOf(i), s); save.save(); };
  // يُفتح المستوى إذا أُنهي الذي قبله، أو إذا كان الطفل قد أنهاه من قبل (قبل إضافة مستويات جديدة بينهما)
  const isOpen = (i) => i === 0 || starsOf(i - 1) > 0 || starsOf(i) > 0;

  // ---------------------------------------------------------------- الخريطة
  function mapScreen() {
    K.begin();
    let i = 0, focus = null;
    const total = LEVELS.reduce((s, _, k) => s + starsOf(k), 0);
    const rows = WORLDS.map((w) => `<div class="world"><div class="wname" style="background:${w.bg}"><span class="emo">${w.icon}</span><b>${w.name}</b></div>
      <div class="lvls">${w.levels.map((L) => {
        const k = i++, st = starsOf(k), open = isOpen(k);
        if (open && !st && !focus) focus = "l" + k;
        return `<button class="lv f${open ? "" : " lock"}${st ? " done" : ""}${L.cmp ? " cmp" : ""}" style="--bg:${w.bg}" ${K.act("l" + k, () => (open ? K.show(play, k) : lockedMsg()))}>
          <b>${open ? (L.speed ? "⏱️" : L.cmp ? "⚖️" : k + 1) : "🔒"}</b><small>${L.cmp ? `الكبير والصغير<i>${L.tag}</i>` : L.t}</small><span class="st">${K.starsHtml(st)}</span></button>`;
      }).join("")}</div></div>`).join("");
    K.paint(`<div class="top"><span class="pill">⭐ ${total} / ${LEVELS.length * 3}</span><h2 class="ttl"><span class="emo">➖</span> الجمع والطرح <span class="emo">➕</span></h2>
      <span class="pill">${save.best ? `⏱️ ${save.best}` : "🦉"}</span></div><div class="map">${rows}</div>${K.HELP}`, focus || "l" + (LEVELS.length - 1));
  }
  function lockedMsg() { K.sfx.bad(); const c = K.current(); c.classList.add("shake"); K.later(() => c.classList.remove("shake"), 500); }

  // ---------------------------------------------------------------- اللعب
  const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "بطل! 🏆", "شاطر! 💪", "صحيح! ✅"];
  const KEYS = [7, 8, 9, 4, 5, 6, 1, 2, 3, "del", 0, "ok"];
  const padHtml = (press) => `<div class="pad" dir="ltr">${KEYS.map((k) => `<button class="key f ${typeof k === "string" ? k : ""}" ${K.act("k" + k, () => press(k))}>${k === "del" ? "⌫" : k === "ok" ? "✔" : k}</button>`).join("")}</div>`;
  const near = (ans, max) => K.range(Math.max(0, ans - 3), Math.min(max, ans + 3) + 1);

  function makeQs(L) {
    const out = [], seen = new Set();
    for (let n = 0; out.length < 10 && n < 200; n++) {
      const q = L.g(), key = q.key || q.eq + "|" + (q.text || "") + "|" + q.ans + "|" + (q.vis || "").length;
      if (seen.has(key) && n < 150) continue;
      seen.add(key); out.push(q);
    }
    return out;
  }

  function play(li) {
    const L = LEVELS[li];
    if (L.speed) return speed(li);
    const qs = makeQs(L), max = Math.max(...qs.map((q) => (typeof q.ans === "number" ? q.ans : 0)), 5);
    let q = 0, score = 0;
    const results = [];
    ask();

    function ask() {
      K.begin();
      const Q = qs[q];
      if (Q.cmp) return askCmp(Q);
      let tries = 0, done = false, typed = "";
      if (!Q.opts && !L.pad) Q.opts = K.options(Q.ans, near(Q.ans, Math.max(max, 5)), 3);
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "no") : k === q ? "now" : ""}"></i>`).join("");
      const eqHtml = Q.eq ? `<div class="eqn" dir="ltr">${Q.eq.replace("?", `<span class="hole">${L.pad ? "&nbsp;" : "?"}</span>`)}</div>` : "";
      const card = `<div class="card ${Q.cls || ""}">${Q.text ? `<div class="story">${Q.text}</div>` : ""}<div class="vis">${Q.vis || ""}</div>${eqHtml}<div class="hint" hidden></div></div>`;
      const input = L.pad ? padHtml(press) : `<div class="opts">${Q.opts.map((n, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(n, el))}>${numHtml(n)}</button>`).join("")}</div>`;
      K.paint(`<div class="top">${K.backBtn()}<div class="dots">${dots}</div>
          ${Q.say && K.voice("ar") ? `<button class="btn f" ${K.act("say", () => K.tts(Q.say))}><span class="emo">🔊</span></button>` : ""}
          <span class="pill">${li + 1}. ${L.t}</span></div>
        <div class="${L.pad ? "playrow" : "playcol"}">${card}${input}</div><div class="cheer"></div>`, L.pad ? "k1" : "o0");
      const C = K.app.querySelector(".card"), hole = () => C.querySelector(".res") || C.querySelector(".hole");
      const cells = C.querySelectorAll(".res .rd"), maxLen = cells.length || String(Q.ans).length + 1;
      const setAns = (t) => {
        if (!cells.length) { hole().textContent = t === "" ? "\u00a0" : t; return; }
        const v = String(t).padStart(cells.length, " ");
        cells.forEach((c, i) => { c.textContent = v[i].trim(); });
      };
      if (Q.show) Q.show(C);
      if (Q.say) K.later(() => K.tts(Q.say), 300);
      if (L.pad) {
        K.mode = {
          key(e) {
            if (/^[0-9]$/.test(e.key)) { press(+e.key); K.focus(K.app.querySelector('[data-k="kok"]')); return true; }
            if (e.key === "Backspace" && typed) { press("del"); return true; }
            return false;
          },
        };
      }

      function press(k) {
        if (done) return;
        if (k === "del") typed = typed.slice(0, -1);
        else if (k === "ok") { if (typed) check(+typed); return; }
        else if (typed.length < maxLen) typed = (typed === "0" ? "" : typed) + k;
        K.sfx.pop();
        setAns(typed);
      }
      function choose(n, el) {
        if (done || el.dataset.dead) return;
        if (n !== Q.ans) { el.classList.add("bad"); el.dataset.dead = "1"; }
        else el.classList.add("ok");
        check(n);
      }
      function check(n) {
        const cheer = K.app.querySelector(".cheer");
        if (n === Q.ans) {
          done = true;
          if (!tries) score++;
          results[q] = !tries;
          K.sfx.ok(); K.confetti(10);
          cheer.textContent = K.pick(GOOD);
          reveal(false);
          K.later(next, tries ? 2600 : 1600);
          return;
        }
        tries++;
        K.sfx.bad();
        const h = hole();
        h.classList.remove("shake"); void h.offsetWidth; h.classList.add("shake");
        typed = "";
        if (L.pad) setAns("");
        showHint();
        cheer.textContent = tries === 1 ? "حاول مرة أخرى 💪" : "انظر إلى المساعدة 👆";
        if (L.pad && tries >= 3) {
          done = true; results[q] = false;
          cheer.textContent = "لا بأس، هذا هو الجواب 💙";
          reveal(true);
          K.later(next, 4200);
        }
      }
      function showHint() {
        const hb = C.querySelector(".hint");
        hb.innerHTML = `<span class="emo">💡</span> ${Q.hint}`; hb.hidden = false;
        if (Q.after && !Q.afterDone) { Q.afterDone = true; Q.after(C); }
      }
      function reveal(failed) {
        const h = hole();
        setAns(Q.ans); h.classList.add("got");
        if (failed) showHint();
        if (Q.after && !Q.afterDone) { Q.afterDone = true; Q.after(C); }
      }
    }
    // سؤال «الكبير والصغير»: الطفل يختار الطرف الأكبر (أو الأصغر)، أو «متساويان»
    function askCmp(Q) {
      let tries = 0, done = false;
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "no") : k === q ? "now" : ""}"></i>`).join("");
      const side = (k, S) => `<button class="opt side f" ${K.act("c" + k, (el) => choose(k, el))}><span class="ex" dir="ltr">${S.eq}</span><span class="val">&nbsp;</span></button>`;
      K.paint(`<div class="top">${K.backBtn()}<div class="dots">${dots}</div>
          ${K.voice("ar") ? `<button class="btn f" ${K.act("say", () => K.tts(Q.say))}><span class="emo">🔊</span></button>` : ""}
          <span class="pill">${li + 1}. ${L.t}</span></div>
        <div class="playcol"><div class="card cmpq"><div class="story">أيهما <b class="${Q.big ? "big" : "small"}">${Q.big ? "أكبر" : "أصغر"}</b>؟ ${Q.big ? "🐘" : "🐭"}</div>
          <div class="cmprow" dir="ltr">${side("L", Q.L)}<span class="rel">?</span>${side("R", Q.R)}</div>
          <button class="opt eqb f" ${K.act("c=", (el) => choose("=", el))}>متساويان =</button>
          <div class="hint" hidden></div></div></div><div class="cheer"></div>`, "cL");
      const C = K.app.querySelector(".card");
      K.later(() => K.tts(Q.say), 300);
      function choose(k, el) {
        if (done || el.dataset.dead) return;
        const cheer = K.app.querySelector(".cheer");
        if (k === Q.ans) {
          done = true; el.classList.add("ok");
          if (!tries) score++;
          results[q] = !tries;
          K.sfx.ok(); K.confetti(10);
          cheer.textContent = K.pick(GOOD);
          reveal();
          K.later(next, tries ? 3000 : 2000);
          return;
        }
        tries++; el.classList.add("bad"); el.dataset.dead = "1";
        K.sfx.bad();
        const hb = C.querySelector(".hint");
        hb.innerHTML = `<span class="emo">💡</span> احسب كل طرف أولاً: ${Q.hint}`; hb.hidden = false;
        cheer.textContent = tries === 1 ? "حاول مرة أخرى 💪" : "انظر إلى المساعدة 👆";
      }
      function reveal() {
        const v = C.querySelectorAll(".val");
        v[0].textContent = Q.L.v; v[1].textContent = Q.R.v;
        const rel = C.querySelector(".rel");
        rel.textContent = Q.L.v > Q.R.v ? ">" : Q.L.v < Q.R.v ? "<" : "=";
        rel.classList.add("got");
      }
    }
    function next() {
      q++;
      if (q < qs.length) { K.top().focus = null; ask(); return; }
      const s = K.starsFor(score, qs.length);
      setStars(li, s);
      K.replace(K.resultScreen, { s, score, total: qs.length, title: L.t, again: () => K.replace(play, li),
        next: li + 1 < LEVELS.length ? { label: "المستوى التالي", fn: () => K.replace(play, li + 1) } : null });
    }
  }

  // تحدّي السرعة: أكبر عدد من مسائل الطرح حتى 20 في دقيقة واحدة
  function speed(li) {
    K.begin();
    let left = 60, score = 0, typed = "", over = false, Q = null;
    const newQ = () => { const a = R(5, 20), b = R(1, Math.min(a, 12)); Q = { a, b, ans: a - b }; };
    newQ();
    K.paint(`<div class="top">${K.backBtn()}<span class="pill big">⏱️ <b class="js-t">60</b></span><span class="pill big">✅ <b class="js-s">0</b></span></div>
      <div class="playrow"><div class="card"><div class="story">حُلّ أكبر عدد من المسائل في دقيقة!</div>
        <div class="eqn huge" dir="ltr"><span class="js-q"></span> = <span class="hole">&nbsp;</span></div><div class="hint" hidden></div></div>
        ${padHtml(press)}</div><div class="cheer"></div>`, "k1");
    const $ = (s) => K.app.querySelector(s);
    const draw = () => { $(".js-q").textContent = `${Q.a} ${MINUS} ${Q.b}`; $(".hole").textContent = typed || "\u00a0"; };
    draw();
    K.mode = { key(e) {
      if (/^[0-9]$/.test(e.key)) { press(+e.key); K.focus($('[data-k="kok"]')); return true; }
      if (e.key === "Backspace" && typed) { press("del"); return true; }
      return false;
    } };
    K.every(() => {
      if (over) return;
      left--; $(".js-t").textContent = left;
      if (left <= 10) $(".js-t").parentNode.classList.add("warn");
      if (left <= 0) end();
    }, 1000);
    function press(k) {
      if (over) return;
      if (k === "del") typed = typed.slice(0, -1);
      else if (k === "ok") {
        if (!typed) return;
        const hb = $(".hint");
        if (+typed === Q.ans) { score++; K.sfx.ok(); $(".js-s").textContent = score; hb.hidden = true; }
        else { K.sfx.bad(); hb.innerHTML = M(`${Q.a} ${MINUS} ${Q.b} = <b>${Q.ans}</b>`); hb.hidden = false; }
        typed = ""; newQ(); draw(); return;
      } else if (typed.length < 2) typed = (typed === "0" ? "" : typed) + k;
      K.sfx.pop(); draw();
    }
    function end() {
      over = true;
      const s = score >= 15 ? 3 : score >= 10 ? 2 : 1;
      const best = Math.max(save.best || 0, score);
      const isRecord = score > (save.best || 0);
      save.best = best; save.save(); setStars(li, s);
      K.replace(K.resultScreen, { s, title: "تحدّي السرعة", msg: isRecord && score ? "رقم قياسي جديد! 🏆" : undefined,
        extra: `<div class="sub">حللت ${score} مسألة صحيحة في دقيقة · أفضل نتيجة: ${best}</div>`, again: () => K.replace(speed, li) });
    }
  }

  K.start(mapScreen);
})();
