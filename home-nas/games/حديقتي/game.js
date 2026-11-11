// حديقتي — صور ومعلومات عن أزهار الحديقة: متى نزرعها، متى تزهر، طولها، والعناية بها.
// صور حقيقية (اختياري): ضع صورة في مجلد «صور» داخل مجلد اللعبة باسم الزهرة، مثل: صور/التوليب.jpg
(() => {
  "use strict";
  const FL = window.FLOWERS, ART = window.FLOWER_ART, TYPES = window.TYPES, LIGHT = window.LIGHT;
  const save = K.store("garden", { mine: {}, seen: {}, best: 0 });
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const MONTHS_SY = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const SEASONS = [["الشتاء", "❄️", [12, 1, 2]], ["الربيع", "🌱", [3, 4, 5]], ["الصيف", "☀️", [6, 7, 8]], ["الخريف", "🍂", [9, 10, 11]]];
  let photos = {};

  const norm = (s) => String(s).replace(/\.[a-z0-9]+$/i, "").replace(/\(.*?\)/g, "").replace(/[ً-ْٰـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .split(/[\s_-]+/).map((w) => w.replace(/^ال/, "")).filter(Boolean).join(" ");
  const short = (f) => f.n.replace(/\s*\(.*\)/, "");
  const pic = (f, cls = "") => {
    const ph = photos[norm(f.n)] || photos[norm(f.n.replace(/.*\((.*)\).*/, "$1"))];
    return ph ? `<img class="photo ${cls}" src="${ph}" alt="">` : `<span class="pic ${cls}">${ART[f.a]()}</span>`;
  };
  // شريط الأشهر: 🌱 وقت الزراعة و 🌸 وقت الإزهار
  const strip = (f) => `<div class="strip">${MONTHS.map((m, i) => {
    const p = f.pm.includes(i + 1), b = f.bm.includes(i + 1);
    return `<div class="mo${p ? " p" : ""}${b ? " b" : ""}${new Date().getMonth() === i ? " now" : ""}"><i>${p ? "🌱" : ""}${b ? "🌸" : ""}</i><small>${m}</small></div>`;
  }).join("")}</div>`;

  // ---------------------------------------------------------------- القائمة
  function home() {
    K.begin();
    const mine = FL.filter((f) => save.mine[f.n]).length, m = new Date().getMonth();
    K.paint(`<div class="title"><span class="mascot emo">🌷</span><div><h1>حديقتي</h1><div class="sub">أزهار نزرعها في الحديقة: متى نزرعها، وكيف نعتني بها</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#f472b6,#db2777)" ${K.act("all", () => K.show(gridScreen, "all"))}><span class="big emo">🌸</span><b>كل الأزهار</b><small>${FL.length} زهرة</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#4ade80,#15803d)" ${K.act("cal", () => K.show(calScreen, m))}><span class="big emo">🗓️</span><b>ماذا نزرع الآن؟</b><small>${MONTHS[m]}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#fb923c,#ea580c)" ${K.act("mine", () => K.show(gridScreen, "mine"))}><span class="big emo">💚</span><b>أزهاري</b><small>${mine ? mine + " زهرة" : "اختر أزهارك"}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#a78bfa,#6d28d9)" ${K.act("quiz", () => K.show(K.quizScreen, quiz()))}><span class="big emo">🧠</span><b>اختبر نفسك</b><small>${save.best ? `أفضل نتيجة: ${save.best} / 10` : "10 أسئلة"}</small></button>
      </div>${K.HELP}`, "all");
  }

  // ---------------------------------------------------------------- شبكة الأزهار
  function gridScreen(which, list) {
    K.begin();
    list = list || (which === "mine" ? FL.filter((f) => save.mine[f.n]) : FL);
    const title = which === "mine" ? "💚 أزهاري" : "🌸 كل الأزهار";
    const body = list.length ? `<div class="fgrid">${list.map((f, i) => `<button class="ftile f${save.mine[f.n] ? " mine" : ""}" ${K.act("f" + i, () => K.show(flowerScreen, list, i))}>${pic(f, "sm")}<b>${short(f)}</b></button>`).join("")}</div>`
      : `<div class="note">لم تختر أزهاراً بعد. افتح أي زهرة واضغط <b>«💚 أضفها إلى حديقتي»</b>.</div>`;
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct">${title}</h2><span class="pill">${list.length}</span></div>${body}`, "f0");
  }

  // ---------------------------------------------------------------- صفحة الزهرة
  function flowerScreen(list, i) {
    K.begin();
    const f = list[i];
    save.seen[f.n] = 1; save.save();
    const [tn, td] = TYPES[f.t], [li, ln] = LIGHT[f.light];
    const row = (icon, label, text, cls = "") => `<div class="row ${cls}"><span class="ri emo">${icon}</span><div><b>${label}</b><p>${text}</p></div></div>`;
    const go = (d) => () => K.replace(flowerScreen, list, (i + d + list.length) % list.length);
    const toggle = () => { if (save.mine[f.n]) delete save.mine[f.n]; else { save.mine[f.n] = 1; K.sfx.ok(); K.confetti(12, "🌸🌷🌼💚"); } save.save(); K.top().focus = "mine"; K.render(); };
    K.paint(`<div class="top">${K.backBtn()}<span class="pill">${li} ${ln}</span><span class="pill">${i + 1} / ${list.length}</span></div>
      <div class="page">
        <div class="hero">${pic(f, "lg")}<h2>${f.n}</h2><div class="fr" dir="ltr">${f.fr}</div><div class="type"><b>${tn}</b> — ${td}</div></div>
        <div class="info">
          <div class="pair">${row("🌱", "متى نزرعها؟", f.plant)}${row("🌸", "متى تزهر؟", f.bloom)}</div>
          ${strip(f)}
          <div class="pair">${row("📏", "طولها", f.height)}${row("💧", "السقي", f.water)}</div>
          ${row("✂️", "العناية بها", f.care)}
          ${row("🎨", "أنواعها وألوانها", f.kinds)}
          ${row("💡", "هل تعلم؟", f.fact, "fact")}
        </div>
      </div>
      <div class="nav"><button class="btn f" ${K.act("prev", go(-1))}>→ السابق</button>
        <button class="btn f ${save.mine[f.n] ? "on" : ""}" ${K.act("mine", toggle)}>${save.mine[f.n] ? "💚 في حديقتي" : "🤍 أضفها إلى حديقتي"}</button>
        <button class="btn f go" ${K.act("next", go(1))}>التالي ←</button></div>`, "next");
  }

  // ---------------------------------------------------------------- التقويم
  function calScreen(m) {
    K.begin();
    const plant = FL.filter((f) => f.pm.includes(m + 1)), bloom = FL.filter((f) => f.bm.includes(m + 1));
    const months = MONTHS.map((n, k) => `<button class="mbtn f${k === m ? " cur" : ""}${k === new Date().getMonth() ? " today" : ""}" ${K.act("m" + k, () => { K.top().args = [k]; K.top().focus = "m" + k; K.render(); })}>
      <b>${n}</b><small>${MONTHS_SY[k]}</small></button>`).join("");
    const chips = (list, key) => (list.length ? list.map((f, i) => `<button class="chip f" ${K.act(key + i, () => K.show(flowerScreen, list, i))}>${pic(f, "xs")}<span>${short(f)}</span></button>`).join("")
      : `<span class="none">لا شيء في هذا الشهر</span>`);
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct">🗓️ تقويم الحديقة</h2><span></span></div>
      <div class="months">${months}</div>
      <div class="cal">
        <div class="col"><h3>🌱 نزرع في ${MONTHS[m]}</h3><div class="chips">${chips(plant, "p")}</div></div>
        <div class="col"><h3>🌸 تزهر في ${MONTHS[m]}</h3><div class="chips">${chips(bloom, "b")}</div></div>
      </div>`, "m" + m);
  }

  // ---------------------------------------------------------------- اختبر نفسك
  const seasonOf = (months) => SEASONS.find((s) => months.every((x) => s[2].includes(x)));
  function quiz() {
    return {
      title: "اختبر نفسك",
      make() {
        const qs = [], used = new Set(), kinds = ["name", "plant", "type", "bloom"];
        for (let n = 0; qs.length < 10 && n < 300; n++) {
          const t = kinds[qs.length % kinds.length], f = K.pick(FL);
          if (used.has(f.n + t)) continue;
          let q = null;
          if (t === "name") {
            const o = K.options(f, FL, 3, (a, b) => a.n === b.n);
            q = { prompt: `${pic(f, "q")}<div class="q">ما اسم هذه الزهرة؟</div>`, opts: o.map(short), answer: o.indexOf(f) };
          } else if (t === "plant" || t === "bloom") {
            const s = seasonOf(t === "plant" ? f.pm : f.bm);
            if (s) {
              const o = K.options(s, SEASONS, 3, (a, b) => a[0] === b[0]);
              q = { prompt: `${pic(f, "q")}<div class="q">${t === "plant" ? `في أي فصل نزرع ${short(f)}؟` : `في أي فصل يزهر ${short(f)}؟`}</div>`,
                opts: o.map((x) => `<span class="emo">${x[1]}</span> ${x[0]}`), answer: o.indexOf(s) };
            }
          } else if (t === "type") {
            const keys = Object.keys(TYPES), o = K.options(f.t, keys, 3);
            q = { prompt: `${pic(f, "q")}<div class="q">${short(f)}: ما نوعها؟</div>`, opts: o.map((k) => TYPES[k][0]), answer: o.indexOf(f.t) };
          }
          if (q) { q.optsCls = "txt"; used.add(f.n + t); qs.push(q); }
        }
        return qs;
      },
      done(score) { if (score > (save.best || 0)) { save.best = score; save.save(); } },
    };
  }

  K.listImages("صور").then((list) => {
    for (const im of list) photos[norm(im.name)] = im.url;
    if (list.length && K.top()) K.render();
  });
  K.start(home);
})();
