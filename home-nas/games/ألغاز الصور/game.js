// ألغاز الصور — رتّب قطع الصورة: صور الطفل من مكتبته على السيرفر، أو صور في مجلد photos داخل اللعبة، أو رسومات جاهزة
// اللعب: اختر قطعة (Enter) ثم اختر قطعة أخرى لتبديل مكانهما.
(() => {
  "use strict";
  const save = K.store("puzzle", { size: 0, best: {} });
  const SIZES = [{ n: 2, name: "سهل جداً", icon: "🐣" }, { n: 3, name: "سهل", icon: "🐥" }, { n: 4, name: "صعب", icon: "🦅" }];
  const SCENES = [
    { bg: ["#38bdf8", "#bbf7d0"], main: "🦁", deco: "🌳🌳☀️🦋" }, { bg: ["#0ea5e9", "#1e3a8a"], main: "🐬", deco: "🐠🐟🫧🐚" },
    { bg: ["#fde68a", "#f97316"], main: "🚒", deco: "🚗🚌🚦🏠" }, { bg: ["#c4b5fd", "#f9a8d4"], main: "🦄", deco: "🌈⭐☁️🌸" },
    { bg: ["#1e1b4b", "#4c1d95"], main: "🚀", deco: "🌙⭐🪐✨" }, { bg: ["#86efac", "#15803d"], main: "🐘", deco: "🌴🦒🐒☀️" },
    { bg: ["#fecaca", "#fb7185"], main: "🍰", deco: "🍓🍭🧁🎈" }, { bg: ["#a5f3fc", "#0891b2"], main: "🐧", deco: "❄️⛄🐻‍❄️🏔️" },
  ];
  let pics = null; // [{ url (مربع), key }]

  function drawScene(s) {
    const c = document.createElement("canvas"); c.width = c.height = 720;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 720); gr.addColorStop(0, s.bg[0]); gr.addColorStop(1, s.bg[1]);
    g.fillStyle = gr; g.fillRect(0, 0, 720, 720);
    g.textAlign = "center"; g.textBaseline = "middle";
    const F = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    const d = [...s.deco];
    [[120, 120], [600, 130], [130, 610], [600, 600]].forEach(([x, y], i) => { g.font = `130px ${F}`; g.fillText(d[i % d.length], x, y); });
    g.font = `360px ${F}`; g.fillText(s.main, 360, 380);
    return c.toDataURL("image/jpeg", 0.9);
  }

  async function loadPics() {
    const out = SCENES.map((s, i) => ({ url: drawScene(s), key: "scene" + i }));
    const urls = [...(await K.listImages("photos")).map((x) => x.url), ...(await K.myPhotos("view"))].slice(0, 16);
    const mine = [];
    for (const u of urls) { const d = await K.squareImage(u, 720); if (d) mine.push({ url: d, key: u, mine: true }); }
    return [...mine, ...out];
  }

  async function homeScreen() {
    K.begin();
    if (!pics) { K.paint(`<h1>ألغاز الصور</h1><div class="sub">نجهّز الصور…</div>`); pics = await loadPics(); K.begin(); }
    const sz = SIZES[save.size];
    const tiles = pics.map((p, i) => `<button class="pic f" style="background-image:url(${p.url})" ${K.act("p" + i, () => K.show(puzzleScreen, i))}>
      ${save.best[p.key + ":" + sz.n] ? `<span class="done">✅</span>` : ""}</button>`).join("");
    K.paint(`
      <div class="top"><span></span><div class="title"><span class="mascot emo">🧩</span><h1>ألغاز الصور</h1></div>
        <button class="btn f" ${K.act("size", () => { save.size = (save.size + 1) % SIZES.length; save.save(); K.render(); })}><span class="emo">${sz.icon}</span> ${sz.name} (${sz.n}×${sz.n})</button></div>
      <div class="sub">اختر صورة</div>
      <div class="pics">${tiles}</div>
      ${K.HELP}`, "p0");
  }

  function puzzleScreen(pi) {
    K.begin();
    const p = pics[pi], n = SIZES[save.size].n, N = n * n;
    let order;
    do { order = K.shuffle(K.range(0, N)); } while (order.every((v, i) => v === i));
    let picked = null, moves = 0;
    const pos = (v) => `${(v % n) * (100 / (n - 1))}% ${Math.floor(v / n) * (100 / (n - 1))}%`;
    const cells = order.map((v, i) => `<button class="piece f" data-i="${i}" style="background-image:url(${p.url});background-size:${n * 100}% ${n * 100}%;background-position:${pos(v)}"
      ${K.act("c" + i, (el) => tap(+el.dataset.i))}></button>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill moves">🔄 0</span></div>
      <div class="play">
        <div class="board" dir="ltr" style="grid-template-columns:repeat(${n},1fr)">${cells}</div>
        <div class="side"><img src="${p.url}" alt=""><div class="hint">رتّب القطع لتصبح مثل هذه الصورة</div></div>
      </div>`, "c0");
    const el = (i) => K.app.querySelector(`.piece[data-i="${i}"]`);
    const paintCell = (i) => { el(i).style.backgroundPosition = pos(order[i]); el(i).classList.toggle("right", order[i] === i); };
    order.forEach((_, i) => paintCell(i));
    function tap(i) {
      if (picked === null) { picked = i; el(i).classList.add("picked"); K.sfx.pop(); return; }
      el(picked).classList.remove("picked");
      if (picked !== i) {
        [order[picked], order[i]] = [order[i], order[picked]];
        paintCell(picked); paintCell(i); moves++;
        K.app.querySelector(".moves").textContent = "🔄 " + moves;
        K.sfx.tick();
        if (order[i] === i || order[picked] === i) K.sfx.ok();
      }
      picked = null;
      if (order.every((v, k) => v === k)) K.later(win, 500);
    }
    function win() {
      const s = moves <= N ? 3 : moves <= N * 1.6 ? 2 : 1;
      const k = p.key + ":" + n;
      save.best[k] = Math.max(save.best[k] || 0, s); save.save();
      K.app.querySelector(".board").classList.add("solved");
      K.later(() => K.replace(K.resultScreen, { s, msg: "أحسنت! اكتملت الصورة 🎉", extra: `<div class="sub">عدد الحركات: ${moves}</div>`,
        again: () => K.replace(puzzleScreen, pi), next: pi < pics.length - 1 ? { label: "الصورة التالية", fn: () => K.replace(puzzleScreen, pi + 1) } : null }), 1200);
    }
  }

  K.start(homeScreen);
})();
