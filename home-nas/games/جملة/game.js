// جملة — جملة عربية مع شرح كلماتها ومعناها وقصتها، وجمل فرنسية مع ترجمتها العربية، واختبار.
(() => {
  "use strict";
  const ARC = window.AR_CATS, AR = window.AR, FRC = window.FR_CATS, FR = window.FR;
  const save = K.store("jumla", { readAr: {}, readFr: {}, dir: "fr", best: 0 });
  const frx = (s) => K.esc(s).replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");
  const hemis = (t) => t.split(" … ");

  function home() {
    K.begin();
    const ra = Object.keys(save.readAr).length, rf = Object.keys(save.readFr).length;
    K.paint(`<div class="title"><span class="mascot emo">📖</span><div><h1>جملة</h1><div class="sub">نقرأ جملة، ونفهم كلماتها ومعناها</div></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#f59e0b,#b45309)" ${K.act("ar", () => K.show(arCats))}><span class="big emo">📜</span><b>جملة عربية وشرحها</b><small>أمثال وشعر وحِكم · قرأت ${ra} من ${AR.length}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)" ${K.act("fr", () => K.show(frCats))}><span class="big emo">🇫🇷</span><b>فرنسي ← عربي</b><small>جمل من حياتنا · قرأت ${rf} من ${FR.length}</small></button>
        <button class="mode f" style="background:linear-gradient(135deg,#a78bfa,#6d28d9)" ${K.act("quiz", () => K.show(K.quizScreen, quiz()))}><span class="big emo">🧠</span><b>اختبر نفسك</b><small>${save.best ? `أفضل نتيجة: ${save.best} / 10` : "10 أسئلة"}</small></button>
      </div>${K.HELP}`, "ar");
  }

  // ---------------------------------------------------------------- العربية
  function arCats() {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct">📜 جملة عربية وشرحها</h2><span></span></div>
      <div class="modes sm wide">${ARC.map((c) => {
        const list = AR.filter((x) => x.c === c.id), n = list.filter((x) => save.readAr[x.t]).length;
        return `<button class="mode f" style="background:linear-gradient(135deg,#fbbf24,#d97706)" ${K.act(c.id, () => K.show(arList, c.id))}><span class="big emo">${c.icon}</span><b>${c.name}</b><small>${n} / ${list.length}</small></button>`;
      }).join("")}</div>${K.HELP}`, ARC[0].id);
  }
  function arList(cid) {
    K.begin();
    const c = ARC.find((x) => x.id === cid), list = AR.filter((x) => x.c === cid);
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct">${c.icon} ${c.name}</h2><span class="pill">${list.length}</span></div>
      <div class="slist">${list.map((x, i) => `<button class="sitem f${save.readAr[x.t] ? " read" : ""}" ${K.act("s" + i, () => K.show(arPage, cid, i))}>${hemis(x.t)[0]}${hemis(x.t)[1] ? " …" : ""}</button>`).join("")}</div>`, "s0");
  }
  function arPage(cid, i) {
    K.begin();
    const c = ARC.find((x) => x.id === cid), list = AR.filter((x) => x.c === cid), x = list[i];
    save.readAr[x.t] = 1; save.save();
    const h = hemis(x.t);
    const sent = h.length > 1 ? `<div class="bait"><span>${h[0]}</span><span>${h[1]}</span></div>` : `<div class="sent">${x.t}</div>`;
    const go = (d) => () => K.replace(arPage, cid, (i + d + list.length) % list.length);
    const say = K.voice("ar") ? `<button class="btn f" ${K.act("say", () => K.tts(x.t.replace(" … ", "، "), "ar", 0.8))}><span class="emo">🔊</span></button>` : "";
    K.paint(`<div class="top">${K.backBtn()}<span class="pill">${c.icon} ${c.name}</span>${say}<span class="pill">${i + 1} / ${list.length}</span></div>
      <div class="scard">${sent}<div class="who">— ${x.who}</div></div>
      <div class="expl">
        <div class="box words"><h3>📖 معاني الكلمات</h3>${x.w.map(([a, b]) => `<div class="wd"><b>${a}</b><span>${b}</span></div>`).join("")}</div>
        <div class="box mean"><h3>💡 المعنى</h3><p class="m">${x.m}</p>
          ${x.story ? `<h3>📜 قصة المثل</h3><p class="st">${x.story}</p>` : ""}${x.use ? `<h3>🗣️ متى نقولها؟</h3><p class="st">${x.use}</p>` : ""}</div>
      </div>
      <div class="nav"><button class="btn f" ${K.act("prev", go(-1))}>→ السابق</button><button class="btn f go" ${K.act("next", go(1))}>التالي ←</button></div>`, "next");
  }

  // ---------------------------------------------------------------- الفرنسية
  function frCats() {
    K.begin();
    K.paint(`<div class="top">${K.backBtn()}<h2 class="ct">🇫🇷 فرنسي ← عربي</h2><span></span></div>
      <div class="modes sm fr">${FRC.map((c) => {
        const list = FR.filter((x) => x.c === c.id), n = list.filter((x) => save.readFr[x.fr]).length;
        return `<button class="mode f" style="background:linear-gradient(135deg,#60a5fa,#2563eb)" ${K.act(c.id, () => K.show(frCard, c.id, 0, false))}><span class="big emo">${c.icon}</span><b>${c.name}</b><small>${n} / ${list.length}</small></button>`;
      }).join("")}</div>${K.HELP}`, FRC[0].id);
  }
  function frCard(cid, i, shown) {
    K.begin();
    const c = FRC.find((x) => x.id === cid), list = FR.filter((x) => x.c === cid), x = list[i];
    const arFirst = save.dir === "ar";
    if (shown) { save.readFr[x.fr] = 1; save.save(); }
    const go = (d) => () => K.replace(frCard, cid, (i + d + list.length) % list.length, false);
    const reveal = () => { K.top().args = [cid, i, true]; K.top().focus = "next"; K.render(); };
    const flip = () => { save.dir = arFirst ? "fr" : "ar"; save.save(); K.top().args = [cid, i, false]; K.top().focus = "flip"; K.render(); };
    const frHtml = `<div class="frs" dir="ltr" lang="fr">${frx(x.fr)}</div>`, arHtml = `<div class="ars">${x.ar}</div>`;
    const sayFr = K.voice("fr") ? `<button class="btn f" ${K.act("say", () => K.tts(x.fr, "fr", 0.8))}><span class="emo">🔊</span></button>` : "";
    const dots = list.map((_, k) => `<i class="${k === i ? "now" : save.readFr[list[k].fr] ? "ok" : ""}"></i>`).join("");
    K.paint(`<div class="top">${K.backBtn()}<div class="dots">${dots}</div>${sayFr}<span class="pill">${c.icon} ${c.name}</span></div>
      <div class="fcard">
        ${arFirst ? arHtml : frHtml}
        <div class="line"></div>
        ${shown ? `<div class="ans">${arFirst ? frHtml : arHtml}${x.note ? `<div class="note2">💬 ${frx(x.note)}</div>` : ""}</div>`
          : `<button class="btn f gold" ${K.act("show", reveal)}>👁️ ${arFirst ? "كيف نقولها بالفرنسية؟" : "ما معناها؟"}</button>`}
      </div>
      <div class="nav"><button class="btn f" ${K.act("prev", go(-1))}>→ السابق</button>
        <button class="btn f" ${K.act("flip", flip)}>🔁 ${arFirst ? "ابدأ بالفرنسية" : "ابدأ بالعربية"}</button>
        <button class="btn f go" ${K.act("next", go(1))}>التالي ←</button></div>${K.HELP}`, shown ? "next" : "show");
  }

  // ---------------------------------------------------------------- اختبر نفسك
  function quiz() {
    return {
      title: "اختبر نفسك",
      make() {
        const qs = [], used = new Set();
        const plan = K.shuffle(["fa", "fa", "fa", "fa", "af", "af", "af", "m", "m", "m"]);
        for (const t of plan) {
          let x, n = 0;
          if (t === "m") {
            do x = K.pick(AR.filter((a) => a.c === "story" || a.c === "prov")); while (used.has(x.t) && ++n < 50);
            used.add(x.t);
            const o = K.options(x, AR.filter((a) => a.c === "story" || a.c === "prov"), 3, (a, b) => a.m === b.m);
            qs.push({ prompt: `<div class="q qs">«${x.t}»<small>ما معنى هذا المثل؟</small></div>`, opts: o.map((a) => a.m), answer: o.indexOf(x), optsCls: "wide" });
          } else {
            do x = K.pick(FR); while (used.has(x.fr) && ++n < 50);
            used.add(x.fr);
            const pool = FR.filter((a) => a.c === x.c).concat(K.shuffle(FR).slice(0, 6));
            const o = K.options(x, pool, 3, (a, b) => a.ar === b.ar || a.fr === b.fr);
            if (t === "fa") qs.push({ prompt: `<div class="q qs"><span dir="ltr" lang="fr">${frx(x.fr)}</span><small>ما معنى هذه الجملة؟</small></div>`, opts: o.map((a) => a.ar), answer: o.indexOf(x), optsCls: "wide" });
            else qs.push({ prompt: `<div class="q qs">${x.ar}<small>كيف نقولها بالفرنسية؟</small></div>`, opts: o.map((a) => `<span dir="ltr" lang="fr">${frx(a.fr)}</span>`), answer: o.indexOf(x), optsCls: "wide" });
          }
        }
        return qs;
      },
      done(score) { if (score > (save.best || 0)) { save.best = score; save.save(); } },
    };
  }

  K.start(home);
})();
