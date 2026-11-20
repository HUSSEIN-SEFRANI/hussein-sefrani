// لعبة المزارع — لكل لاعب أرض من مربعات: يزرع الذرة ثم البرسيم وغيرهما، ويسقي ويحصد، ويبيع في السوق،
// ويشتري أرضاً أكبر وحيوانات (البقرة تأكل البرسيم وتعطي الحليب، والخروف يعطي الصوف) وزينة.
// التحكم: الأسهم للتنقل · Enter/✕ للعمل على المربع · Backspace/○ للرجوع. اللمس والفأرة: المس المربع.
// الوقت حقيقي: المحاصيل تنمو والحيوانات تنتج حتى لو أُغلقت اللعبة.
(() => {
  "use strict";
  const D = window.FD, L = window.FL, t = L.t, nm = L.n;
  const N = D.COLS * D.ROWS;
  const save = K.store("farmgame", { lang: "", farms: [], cur: 0, lastCrop: "corn" });
  if (save.lang) L.set(save.lang);
  const LITE = (() => {
    try { if (parent !== window && parent.document.documentElement.classList.contains("lite")) return true; } catch {}
    return (navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2;
  })();
  if (LITE) document.body.classList.add("lite");
  const fx = document.getElementById("fx"), toastEl = document.getElementById("toast");

  const byId = {};
  for (const [k, list] of [["c", D.CROPS], ["a", D.ANIMALS], ["p", D.PRODUCTS], ["d", D.DECOR]]) for (const x of list) byId[x.id] = Object.assign({ kind: k }, x);
  const emo = (id) => (byId[id] ? byId[id].e : "");
  const E = (s) => `<span class="emo">${s}</span>`;
  const F = () => save.farms[save.cur];
  const owned = (f = F()) => f.tiles.filter((x) => x.o).length;
  const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const backBtn = () => `<button class="btn f" ${K.act("back", K.back)}>${t("back")}</button>`;
  const begin = () => { K.begin(); K.onFocus = null; };

  // ---------------------------------------------------------------- أصوات وتنبيهات
  const snd = {
    plant() { K.tone(420, 0.08, "triangle", 0.12); K.tone(560, 0.1, "triangle", 0.1, 0.07); },
    water() { [900, 760, 640, 820].forEach((f, i) => K.tone(f, 0.06, "sine", 0.06, i * 0.05)); },
    harvest() { K.sfx.pop(); K.tone(990, 0.12, "sine", 0.1, 0.08); },
    coin() { [1046, 1318, 1568].forEach((f, i) => K.tone(f, 0.1, "square", 0.04, i * 0.06)); },
    moo() { K.tone(150, 0.45, "sawtooth", 0.05); K.tone(120, 0.3, "sawtooth", 0.04, 0.35); },
    no() { K.sfx.bad(); },
  };
  let toastT = 0;
  function toast(msg, ms = 2600) {
    toastEl.innerHTML = msg; toastEl.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("on"), ms);
  }
  function floatAt(el, txt) {
    if (!el) return;
    const r = el.getBoundingClientRect(), d = document.createElement("div");
    d.className = "float emo"; d.textContent = txt;
    d.style.left = r.left + r.width / 2 + "px"; d.style.top = r.top + r.height * 0.2 + "px";
    fx.appendChild(d); setTimeout(() => d.remove(), 1300);
  }

  // ---------------------------------------------------------------- المزرعة
  function newFarm(av, col) {
    const tiles = Array.from({ length: N }, () => ({ o: 0 }));
    for (const [c, r] of D.START_PLOTS) tiles[r * D.COLS + c].o = 1;
    return { av, col, coins: D.START_COINS, tiles, inv: {}, h: 0, seen: {}, made: Date.now() };
  }
  const cropOpen = (c, f = F()) => (c.afterHarvest ? f.h > 0 : owned(f) >= c.need);
  // حالة المربع: lock | soil | dry | grow | ripe | hungry | make | prod | deco
  function state(x, now) {
    if (!x.o) return "lock";
    if (x.k === "c") { if (!x.w) return "dry"; return (now - x.w) / 1000 >= byId[x.id].t ? "ripe" : "grow"; }
    if (x.k === "a") { if (!x.f) return "hungry"; return (now - x.f) / 1000 >= byId[x.id].t ? "prod" : "make"; }
    if (x.k === "d") return "deco";
    return "soil";
  }
  const left = (x, now) => byId[x.id].t - (now - (x.k === "c" ? x.w : x.f)) / 1000;
  const frac = (x, now) => Math.min(1, 1 - left(x, now) / byId[x.id].t);
  function tileView(x, now) {
    const s = state(x, now), it = byId[x.id];
    let h = "";
    if (s === "lock") h = `<i class="lk emo">🔒</i>`;
    else if (s === "dry") h = `<i class="pl up s0 emo">🌱</i><i class="bub up emo">💧</i>`;
    else if (s === "grow") {
      const p = frac(x, now);
      h = p < 0.4 ? `<i class="pl up s1 emo">🌱</i>` : p < 0.75 ? `<i class="pl up s2 emo">🌿</i>` : `<i class="pl up s3 emo">${it.e}</i>`;
      h += `<i class="bar"><b style="width:${Math.round(p * 100)}%"></b></i>`;
    } else if (s === "ripe") h = `<i class="pl up s4 emo">${it.e}</i><i class="spark up emo">✨</i>`;
    else if (s === "hungry") h = `<i class="an up emo">${it.e}</i><i class="bub up emo">${emo(it.feed)}</i>`;
    else if (s === "make") h = `<i class="an up emo">${it.e}</i><i class="bar"><b style="width:${Math.round(frac(x, now) * 100)}%"></b></i>`;
    else if (s === "prod") h = `<i class="an up emo">${it.e}</i><i class="bub up emo">${emo(it.gives)}</i>`;
    else if (s === "deco") h = `<i class="dc up emo">${it.e}</i>`;
    const cls = s === "lock" ? "lock" : x.k === "a" ? "pen " + s : x.k === "d" ? "grass" : "soil " + s + (x.w ? " wet" : "");
    return { cls, h };
  }
  function hintFor(i) {
    const f = F(), x = f.tiles[i], now = Date.now(), s = state(x, now), it = byId[x.id], n = it && E(it.e) + " " + nm(it.id);
    switch (s) {
      case "lock": return t("hLock", D.landPrice(owned()));
      case "soil": return t("hEmpty");
      case "dry": return t("hDry", n);
      case "grow": return t("hGrow", n, mmss(left(x, now)));
      case "ripe": return t("hReady", n);
      case "hungry": return t("hHungry", n, E(emo(it.feed)) + " " + nm(it.feed), f.inv[it.feed] || 0);
      case "make": return t("hMaking", n, E(emo(it.gives)), mmss(left(x, now)));
      case "prod": return t("hProd", n, E(emo(it.gives)) + " " + nm(it.gives));
      case "deco": return n;
    }
    return "";
  }

  let placing = null; // { obj, refund, from }
  function setHint(el) {
    const h = document.getElementById("hint");
    if (!h || !el) return;
    let s = "";
    const k = el.dataset.k || "";
    if (k[0] === "t") s = hintFor(+k.slice(1));
    else if (k === "market") s = t("hMarket");
    else if (k === "shop") s = t("hShop");
    else s = t("help");
    if (placing) s = t("hPlace", E(emo(placing.obj.id)) + " " + nm(placing.obj.id));
    h.innerHTML = s;
  }
  function topBar() {
    const f = F();
    return `<div class="top fbar">${backBtn()}
      <span class="pill who" style="--c:${D.COLORS[f.col]}">${E(f.av)} ${E("🪙")} <b id="coins">${f.coins}</b></span>
      <span class="pill">${E("🟫")} <b id="plots">${owned()}</b> / ${N}</span>
      <span class="sp"></span>
      <button class="btn f" ${K.act("market", () => K.show(marketScreen))}>${E("🏪")} ${t("market")}</button>
      <button class="btn f go" ${K.act("shop", () => K.show(shopScreen))}>${E("🛒")} ${t("shop")}</button></div>`;
  }
  function farmScreen() {
    begin();
    const f = F(), now = Date.now();
    gift();
    const tiles = f.tiles.map((x, i) => { const v = tileView(x, now); return `<button class="plot f ${v.cls}" ${K.act("t" + i, (el) => tap(i, el))}>${v.h}</button>`; }).join("");
    K.onFocus = setHint;
    const first = f.tiles.findIndex((x) => x.o && !x.k);
    K.paint(`${topBar()}
      <div class="stage"><div class="field" style="--cols:${D.COLS};--rows:${D.ROWS}">${tiles}</div></div>
      <div class="hint" id="hint"></div>`, "t" + (first >= 0 ? first : D.START_PLOTS[4][1] * D.COLS + D.START_PLOTS[4][0]));
    setHint(K.current());
    if (!f.h && !f.tiles.some((x) => x.k)) toast(t("start"), 4500);
    K.every(refresh, 1000);
    K.mode = {
      key(e) {
        if (placing && e.key === "Backspace") { cancelPlace(); return true; }
        return false;
      },
    };
  }
  function refresh() {
    const f = F(), now = Date.now();
    const els = K.app.querySelectorAll(".plot");
    f.tiles.forEach((x, i) => {
      const el = els[i]; if (!el) return;
      const v = tileView(x, now), cls = "plot f " + v.cls + (el.classList.contains("sel") ? " sel" : "");
      if (el.className !== cls) el.className = cls;
      if (el._h !== v.h) { el.innerHTML = v.h; el._h = v.h; }
    });
    const c = document.getElementById("coins"); if (c) c.textContent = f.coins;
    const p = document.getElementById("plots"); if (p) p.textContent = owned();
    setHint(K.current());
  }
  // إن لم يبق للطفل نقود ولا محصول ولا شيء يُباع: هدية صغيرة حتى لا تتوقف اللعبة
  function gift() {
    const f = F(), cheap = D.CROPS[0].buy;
    if (f.coins >= cheap) return;
    if (f.tiles.some((x) => x.k === "c" || x.k === "a")) return;
    if (Object.keys(f.inv).some((k) => f.inv[k] > 0)) return;
    const g = cheap * 3 - f.coins; f.coins += g; save.save();
    K.later(() => toast(t("gift", g)), 400);
  }

  function tap(i, el) {
    const f = F(), x = f.tiles[i], now = Date.now(), s = state(x, now), it = byId[x.id];
    if (placing) {
      if (s !== "soil") { snd.no(); toast(t("busy")); return; }
      const o = placing.obj;
      if (placing.from != null) f.tiles[placing.from] = { o: 1 };
      f.tiles[i] = Object.assign({ o: 1 }, o);
      placing = null; save.save();
      if (o.k === "a") snd.moo(); else K.sfx.pop();
      floatAt(el, "✨"); toast(t("placed"), 1500); refresh();
      return;
    }
    switch (s) {
      case "lock": {
        const price = D.landPrice(owned());
        if (f.coins < price) { snd.no(); toast(t("noMoney")); return; }
        K.show(confirmScreen, {
          big: "🟫", text: t("buyLandQ", price), yes: t("buy"),
          ok: () => {
            if (F().coins < price) return K.back();
            const before = owned();
            f.coins -= price; x.o = 1; save.save();
            K.back(); snd.coin(); K.confetti(LITE ? 8 : 18, "🟫✨🎉");
            toast(t("landOk")); unlockNews(before);
          },
        });
        return;
      }
      case "soil": K.show(plantScreen, i); return;
      case "dry": x.w = now; save.save(); snd.water(); floatAt(el, "💧"); toast(t("watered"), 1200); refresh(); return;
      case "grow": K.sfx.tick(); toast(t("hGrow", E(it.e) + " " + nm(it.id), mmss(left(x, now))), 1800); return;
      case "ripe": {
        f.tiles[i] = { o: 1 }; f.inv[x.id] = (f.inv[x.id] || 0) + 1;
        const firstH = !f.h; f.h++; save.save();
        snd.harvest(); floatAt(el, "+1 " + it.e); refresh();
        if (firstH) { toast(t("firstH"), 5000); K.confetti(LITE ? 10 : 24, "🌽☘️✨🎉"); }
        return;
      }
      case "hungry": {
        if (!(f.inv[it.feed] > 0)) { snd.no(); toast(t("noFeed", E(emo(it.feed)) + " " + nm(it.feed))); return; }
        f.inv[it.feed]--; x.f = now; save.save();
        if (x.id === "cow") snd.moo(); else K.sfx.pop();
        floatAt(el, "😋"); toast(t("fed"), 1200); refresh();
        return;
      }
      case "prod": {
        f.inv[it.gives] = (f.inv[it.gives] || 0) + 1; x.f = 0; save.save();
        snd.harvest(); floatAt(el, "+1 " + emo(it.gives)); refresh();
        return;
      }
      case "make": case "deco": K.show(itemScreen, i); return;
    }
  }
  // رسالة عند فتح محصول أو حيوان جديد بعد شراء أرض
  function unlockNews(before) {
    const now = owned(), news = [...D.CROPS, ...D.ANIMALS].filter((c) => c.need > before && c.need <= now);
    if (!news.length) return;
    const animals = news.some((c) => byId[c.id].kind === "a") && !D.ANIMALS.some((a) => a.need <= before);
    K.later(() => toast(animals ? t("animalsOpen") : t("unlocked", news.map((c) => E(c.e) + " " + nm(c.id)).join("، ")), 3500), 900);
  }
  function cancelPlace() {
    if (placing && placing.refund) { F().coins += placing.refund; save.save(); }
    placing = null; K.sfx.tick(); refresh();
  }

  // ---------------------------------------------------------------- الشاشات
  function card(key, o) {
    return `<button class="card f ${o.off ? "off" : ""}" ${K.act(key, o.fn)}>
      <span class="big emo">${o.e}</span><b>${o.name}</b>${o.lines.map((l) => `<small>${l}</small>`).join("")}</button>`;
  }
  function plantScreen(i) {
    begin();
    const f = F();
    const cards = D.CROPS.map((c) => {
      const open = cropOpen(c);
      return card("c-" + c.id, {
        e: c.e, name: nm(c.id), off: !open || f.coins < c.buy,
        lines: open ? [`${E("🪙")} ${c.buy} → ${E("🪙")} ${c.sell}`, `⏱ ${mmss(c.t)}`] : [c.afterHarvest ? t("lockHarvest") : t("lockPlots", c.need)],
        fn: () => {
          if (!open) { snd.no(); toast(c.afterHarvest ? t("lockHarvest") : t("lockPlots", c.need)); return; }
          if (f.coins < c.buy) { snd.no(); toast(t("noMoney")); return; }
          f.coins -= c.buy; f.tiles[i] = { o: 1, k: "c", id: c.id, w: 0 }; save.lastCrop = c.id; save.save();
          snd.plant(); K.back();
        },
      });
    }).join("");
    K.paint(`<div class="top">${backBtn()}<h2>${t("plantQ")}</h2><span class="pill">${E("🪙")} ${f.coins}</span></div>
      <div class="cards">${cards}</div><div class="help">${t("help")}</div>`, "c-" + (save.lastCrop || "corn"));
  }
  function marketScreen() {
    begin();
    const f = F();
    const items = [...D.CROPS, ...D.PRODUCTS].filter((c) => f.inv[c.id] > 0);
    const total = items.reduce((s, c) => s + c.sell * f.inv[c.id], 0);
    const sell = (list) => {
      let got = 0;
      for (const c of list) { got += c.sell * (f.inv[c.id] || 0); f.inv[c.id] = 0; }
      if (!got) return;
      f.coins += got; save.save(); snd.coin(); K.confetti(LITE ? 6 : 14, "🪙✨");
      toast(`+${got} ${E("🪙")}`, 1600); K.render();
    };
    const cards = items.map((c) => card("s-" + c.id, {
      e: c.e, name: `${nm(c.id)} × ${f.inv[c.id]}`,
      lines: [`${E("🪙")} ${c.sell} × ${f.inv[c.id]} = ${c.sell * f.inv[c.id]}`],
      fn: () => sell([c]),
    })).join("");
    K.paint(`<div class="top">${backBtn()}<h2>${E("🏪")} ${t("market")}</h2><span class="pill">${E("🪙")} ${f.coins}</span></div>
      ${items.length ? `<div class="cards">${cards}</div>
        <div class="nav"><button class="btn f go" ${K.act("all", () => sell(items))}>${E("💰")} ${t("sellAll")} (+${total} ${E("🪙")})</button></div>`
        : `<div class="note">${t("empty")}</div>`}
      <div class="help">${t("help")}</div>`, items.length ? "s-" + items[0].id : "back");
  }
  function shopScreen() {
    begin();
    const f = F(), have = owned();
    const buy = (it, price) => {
      if (f.coins < price) { snd.no(); toast(t("noMoney")); return; }
      if (placing) cancelPlace();
      f.coins -= price; save.save();
      placing = { obj: it.kind === "a" ? { k: "a", id: it.id, f: 0 } : { k: "d", id: it.id }, refund: price };
      snd.coin(); K.back();
    };
    const an = D.ANIMALS.map((a) => {
      const open = have >= a.need;
      return card("a-" + a.id, {
        e: a.e, name: nm(a.id), off: !open || f.coins < a.buy,
        lines: open ? [`${E("🪙")} ${a.buy}`, `${t("eats", E(emo(a.feed)))} · ${t("gives", E(emo(a.gives)))}`] : [t("lockPlots", a.need)],
        fn: () => { if (!open) { snd.no(); toast(t("lockPlots", a.need)); return; } buy(byId[a.id], a.buy); },
      });
    }).join("");
    const dc = D.DECOR.map((d) => card("d-" + d.id, {
      e: d.e, name: nm(d.id), off: f.coins < d.buy, lines: [`${E("🪙")} ${d.buy}`], fn: () => buy(byId[d.id], d.buy),
    })).join("");
    K.paint(`<div class="top">${backBtn()}<h2>${E("🛒")} ${t("shop")}</h2><span class="pill">${E("🪙")} ${f.coins}</span></div>
      <div class="scroll"><h3>${t("animals")}</h3><div class="cards">${an}</div>
      <h3>${t("decor")}</h3><div class="cards sm">${dc}</div></div>
      <div class="help">${t("help")}</div>`, "a-" + D.ANIMALS[0].id);
    K.onFocus = (el) => { try { el.scrollIntoView({ block: "nearest" }); } catch {} };
  }
  // حيوان يعمل أو زينة: نقل أو بيع بنصف السعر
  function itemScreen(i) {
    begin();
    const f = F(), x = f.tiles[i], it = byId[x.id], now = Date.now(), back = Math.floor(it.buy / 2);
    const st = x.k === "a" ? (state(x, now) === "make" ? t("hMaking", "", E(emo(it.gives)), mmss(left(x, now))).replace(/^\s*—\s*/, "") : "") : "";
    K.paint(`<div class="top">${backBtn()}<span></span><span class="pill">${E("🪙")} ${f.coins}</span></div>
      <div class="big1 emo">${it.e}</div><h2>${nm(it.id)}</h2><div class="sub">${st}</div>
      <div class="nav">
        <button class="btn f go" ${K.act("move", () => { placing = { obj: { k: x.k, id: x.id, f: x.f }, from: i }; K.back(); })}>${E("✋")} ${t("move")}</button>
        <button class="btn f" ${K.act("sell", () => K.replace(confirmScreen, { big: it.e, text: t("sellFor", back) + (L.lang === "ar" ? "؟" : "?"), yes: t("yes"),
          ok: () => { f.tiles[i] = { o: 1 }; f.coins += back; save.save(); snd.coin(); K.back(); } }))}>${E("🪙")} ${t("sellFor", back)}</button>
      </div><div class="help">${t("help")}</div>`, "move");
  }
  function confirmScreen(o) {
    begin();
    K.paint(`<div class="top">${backBtn()}<span></span><span></span></div>
      <div class="big1 emo">${o.big}</div><h2 class="q">${o.text}</h2>
      <div class="nav"><button class="btn f go" ${K.act("yes", o.ok)}>${o.yes || t("yes")}</button>
      <button class="btn f" ${K.act("no", K.back)}>${t("no")}</button></div><div class="help">${t("help")}</div>`, "no");
  }

  // ---------------------------------------------------------------- البداية
  function homeScreen() {
    begin();
    if (placing) cancelPlace();
    const farms = save.farms.map((f, k) => `<div class="fcol">
        <button class="mode f farm" style="--c:${D.COLORS[f.col]}" ${K.act("farm" + k, () => { save.cur = k; save.save(); K.show(farmScreen); })}>
          <span class="big emo">${f.av}</span><b>${E("🪙")} ${f.coins}</b><small>${E("🟫")} ${owned(f)} / ${N}</small></button>
        <button class="btn f mini-del" ${K.act("del" + k, () => K.show(confirmScreen, { big: "🗑️", text: t("delQ"), yes: t("del"),
          ok: () => { save.farms.splice(k, 1); save.save(); K.back(); } }))}>${E("🗑️")} ${t("del")}</button></div>`).join("");
    const add = save.farms.length < 4 ? `<div class="fcol"><button class="mode f add" ${K.act("new", () => K.show(newScreen))}>
        <span class="big emo">➕</span><b>${t("newFarm")}</b></button></div>` : "";
    K.paint(`
      <div class="title"><span class="mascot emo">🚜</span><div><h1>${t("title")}</h1><div class="sub">${t("tag")}</div></div></div>
      <div class="farms">${farms}${add}</div>
      <div class="mini"><button class="btn f" ${K.act("lang", () => {
        const l = L.list[(L.list.indexOf(L.lang) + 1) % L.list.length]; save.lang = l; save.save(); L.set(l); K.render(); })}>${E("🌐")} ${L.S[L.lang].lang}</button></div>
      <div class="credit">${t("by")}</div>
      <div class="help">${t("help")}</div>`, save.farms.length ? "farm" + Math.min(save.cur, save.farms.length - 1) : "new");
  }
  function newScreen() {
    begin();
    const avs = D.AVATARS.map((a, k) => `<button class="mode f av" style="--c:${D.COLORS[k % D.COLORS.length]}" ${K.act("av" + k, () => {
      save.farms.push(newFarm(a, k % D.COLORS.length)); save.cur = save.farms.length - 1; save.save();
      K.replace(farmScreen); })}><span class="big emo">${a}</span></button>`).join("");
    K.paint(`<div class="top">${backBtn()}<h2>${t("choose")}</h2><span></span></div>
      <div class="avs">${avs}</div><div class="help">${t("help")}</div>`, "av0");
  }

  K.start(homeScreen);
})();
