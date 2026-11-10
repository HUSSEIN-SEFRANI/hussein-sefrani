// H.SEF TV — واجهة التلفاز. تعمل بالأسهم و«موافق» و«رجوع» (ريموت أو لوحة مفاتيح)، والفأرة أيضاً.
import * as A from "./tv-art.js";

const TV = window.__TV__ || {};
const stage = document.getElementById("stage");
let scale = 1;
let settings = { saver_min: 10, nosleep: true, words: ["ar", "fr", "en"], wallpaper: "animated" };
let me = null; // بيانات الرئيسية للمستخدم الحالي

// ============================================================== أدوات
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
const pad = (n) => String(n).padStart(2, "0");
const joinp = (a, b) => (a ? `${a}/${b}` : b);
const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");

async function api(url, opts = {}) {
  const o = { credentials: "same-origin", ...opts };
  if (o.json !== undefined) {
    o.method = o.method || "POST";
    o.headers = { "Content-Type": "application/json" };
    o.body = JSON.stringify(o.json);
    delete o.json;
  }
  const r = await fetch(url, o);
  let data = {};
  try { data = await r.json(); } catch { /* لا شيء */ }
  if (!r.ok) {
    const err = new Error(data.error || `خطأ ${r.status}`);
    err.status = r.status;
    if (r.status === 401 && !url.includes("/login")) setTimeout(() => whoScreen(), 0);
    throw err;
  }
  return data;
}

function toast(msg, ms = 3000) {
  const t = h(`<div class="toast">${esc(msg)}</div>`);
  stage.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function fit() {
  const m = Math.max(0, Math.min(8, +(settings && settings.margin) || 0)) / 100;
  const z = Math.max(70, Math.min(130, +(settings && settings.zoom) || 100)) / 100;
  scale = Math.min((innerWidth * (1 - 2 * m)) / 1280, (innerHeight * (1 - 2 * m)) / 720) * z;
  stage.style.transform = `translate(${(innerWidth - 1280 * scale) / 2}px, ${(innerHeight - 720 * scale) / 2}px) scale(${scale})`;
}
addEventListener("resize", fit);
fit();

// ============================================================== التاريخ والوقت
const fmtDate = new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtDM = new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long" });
let fmtHijri = null;
try { fmtHijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric" }); } catch { /* غير مدعوم */ }
const hhmm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const ageText = (n) => (n === 1 ? "سنة واحدة" : n === 2 ? "سنتان" : n <= 10 ? `${n} سنوات` : `${n} سنة`);
const daysText = (n) => (n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يوماً`);
const birthDM = (u) => fmtDM.format(new Date(2000, u.birth_month - 1, u.birth_day));

function tick() {
  const now = new Date();
  const t = hhmm(now), d = fmtDate.format(now), hj = fmtHijri ? fmtHijri.format(now) : "";
  stage.querySelectorAll(".js-tm").forEach((e) => { if (e.textContent !== t) e.textContent = t; });
  stage.querySelectorAll(".js-dt").forEach((e) => { if (e.textContent !== d) e.textContent = d; });
  stage.querySelectorAll(".js-hj").forEach((e) => { if (e.textContent !== hj) e.textContent = hj; });
  stage.querySelectorAll(".prayer").forEach(updatePrayer);
}
setInterval(tick, 1000);

// ============================================================== الشاشات والتركيز
const stack = [];
let cur = null;
const top = () => stack[stack.length - 1];

function mount(scr) {
  scr.el.classList.add("scr");
  stage.appendChild(scr.el);
  stack.push(scr);
  scr.onShow?.();
  focusInitial(scr);
  tick();
}
function push(scr) {
  const t = top();
  if (t) { t.el.hidden = true; t.onHide?.(); }
  mount(scr);
}
function pop() {
  const s = stack.pop();
  if (!s) return;
  s.destroy?.();
  s.el.remove();
  const t = top();
  if (t) {
    t.el.hidden = false;
    t.onShow?.();
    setFocus(t.focus && t.el.contains(t.focus) ? t.focus : focusables()[0]);
  }
}
function reset(scr) {
  while (stack.length) { const s = stack.pop(); s.destroy?.(); s.el.remove(); }
  cur = null;
  mount(scr);
}
function focusables() {
  const t = top();
  return t ? [...t.el.querySelectorAll(".f")].filter((e) => e.offsetParent !== null) : [];
}
function focusInitial(scr) {
  const el = scr.initial?.() || focusables()[0];
  setFocus(el || null);
}
function setFocus(el, scroll = true) {
  if (cur && cur !== el) cur.classList.remove("focus");
  cur = el;
  if (!el) return;
  const t = top();
  if (t) t.focus = el;
  el.classList.add("focus");
  if (scroll) ensureVisible(el);
  t?.onFocus?.(el);
}
function ensureVisible(el) {
  const sc = el.closest(".grid-wrap, .list");
  if (!sc) return;
  const r = el.getBoundingClientRect(), c = sc.getBoundingClientRect(), p = 34 * scale;
  if (r.top < c.top + p) sc.scrollBy({ top: (r.top - c.top - p) / scale, behavior: "smooth" });
  else if (r.bottom > c.bottom - p) sc.scrollBy({ top: (r.bottom - c.bottom + p) / scale, behavior: "smooth" });
}
function move(dir) {
  const list = focusables();
  if (!list.length) return;
  if (!cur || !list.includes(cur)) { setFocus(list[0]); return; }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    const main = { left: -dx, right: dx, up: -dy, down: dy }[dir];
    const off = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    if (main <= 4) continue;
    const score = main + off * 2.5;
    if (score < bs) { bs = score; best = el; }
  }
  if (best) setFocus(best);
}
function back() {
  const t = top();
  if (!t) return;
  if (t.back) t.back();
  else if (stack.length > 1) pop();
}

// ============================================================== مستوى الصوت (لكل الفيديو والصوت)
let vol = 0.8, muted = false;
try { const v = parseFloat(localStorage.getItem("tvvol")); if (v >= 0 && v <= 1) vol = v; } catch { /* */ }
const VOL_ICON = (m) => `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z" fill="#fff"/>${m ? '<path d="M17 9l5 6M22 9l-5 6"/>' : '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'}</svg>`;
function applyVol(m) { m.volume = vol; m.muted = muted; }
document.addEventListener("play", (e) => applyVol(e.target), true);
let volEl = null, volT = 0;
function showVol() {
  stage.querySelectorAll("video, audio").forEach(applyVol);
  try { localStorage.setItem("tvvol", vol); } catch { /* */ }
  if (!volEl) { volEl = h(`<div class="volosd"><div class="vi"></div><div class="vb"><i></i></div><div class="vp"></div></div>`); stage.appendChild(volEl); }
  volEl.querySelector(".vi").innerHTML = VOL_ICON(muted || vol === 0);
  volEl.querySelector(".vb i").style.height = `${muted ? 0 : Math.round(vol * 100)}%`;
  volEl.querySelector(".vp").textContent = muted ? "صامت" : `${Math.round(vol * 100)}%`;
  volEl.classList.add("show");
  clearTimeout(volT);
  volT = setTimeout(() => volEl.classList.remove("show"), 1800);
}
function volUp() { muted = false; vol = Math.min(1, Math.round((vol + 0.1) * 10) / 10); showVol(); }
function volDown() { vol = Math.max(0, Math.round((vol - 0.1) * 10) / 10); showVol(); }
function volMute() { muted = !muted; showVol(); }
const VOL_KEYS = { AudioVolumeUp: volUp, VolumeUp: volUp, "+": volUp, "=": volUp, AudioVolumeDown: volDown, VolumeDown: volDown, "-": volDown,
  AudioVolumeMute: volMute, VolumeMute: volMute, m: volMute, M: volMute };

const BACK_KEYS = new Set(["Escape", "Backspace", "BrowserBack", "GoBack"]);
document.addEventListener("keydown", (e) => {
  activity();
  if (saverEl) { hideSaver(); e.preventDefault(); return; }
  if (VOL_KEYS[e.key] && !e.target.closest?.("input")) { VOL_KEYS[e.key](); e.preventDefault(); return; }
  const t = top();
  if (t?.key && t.key(e) === true) { e.preventDefault(); return; }
  const k = e.key;
  if (k === "ArrowLeft") move("left");
  else if (k === "ArrowRight") move("right");
  else if (k === "ArrowUp") move("up");
  else if (k === "ArrowDown") move("down");
  else if (k === "Enter" || k === " ") cur?.click();
  else if (BACK_KEYS.has(k)) back();
  else return;
  e.preventDefault();
});
stage.addEventListener("mouseover", (e) => {
  const f = e.target.closest(".f");
  if (f && f !== cur && top()?.el.contains(f)) setFocus(f, false);
});
let mouseT = 0;
addEventListener("mousemove", () => {
  activity();
  if (saverEl) hideSaver();
  document.body.classList.remove("nomouse");
  clearTimeout(mouseT);
  mouseT = setTimeout(() => document.body.classList.add("nomouse"), 3000);
});
addEventListener("contextmenu", (e) => { e.preventDefault(); back(); });

// ============================================================== قطع مشتركة
function nightBg() {
  return `<div class="layer"><div class="blob drift1" style="width:620px;height:620px;background:#2563eb;opacity:.45;top:-220px;right:-140px"></div>
  <div class="blob drift2" style="width:560px;height:560px;background:#f97316;opacity:.35;bottom:-260px;left:-120px"></div>
  <div class="blob drift1" style="width:420px;height:420px;background:#14b8a6;opacity:.3;bottom:-120px;right:320px;animation-delay:-5s"></div>
  <div class="star" style="top:110px;left:210px;width:6px;height:6px;background:#fde68a"></div>
  <div class="star" style="top:180px;left:980px;width:5px;height:5px;background:#fff;animation-delay:1s"></div>
  <div class="star" style="top:70px;left:640px;width:4px;height:4px;background:#bae6fd;animation-delay:2s"></div></div>`;
}
function skyBg() {
  return `<div class="layer"><div class="sun" style="top:70px;left:180px;width:150px;height:150px;background:#fff3c4;box-shadow:0 0 90px 30px rgba(255,236,170,.65)"></div>
  <div class="cloud" style="top:120px;left:420px;width:260px;opacity:.85">${A.CLOUD}</div>
  <div class="cloud" style="top:60px;left:820px;width:180px;opacity:.7;animation-duration:34s">${A.CLOUD}</div>
  <svg style="position:absolute;bottom:0;left:0" width="1280" height="380" viewBox="0 0 1280 380" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 210 C160 140 300 170 460 120 C640 64 800 150 980 110 C1110 82 1200 120 1280 100 L1280 380 L0 380 Z" fill="#5b8bd6" opacity=".55"/>
    <path d="M0 260 C200 200 360 250 560 200 C760 152 900 240 1100 196 C1190 176 1240 190 1280 184 L1280 380 L0 380 Z" fill="#3a6bb8" opacity=".8"/>
    <path d="M0 310 C220 270 420 320 640 280 C860 240 1020 300 1280 270 L1280 380 L0 380 Z" fill="#1f4a8f"/></svg></div>`;
}
function kidsBg() {
  return `<div class="layer">
  <svg style="position:absolute;top:22px;left:36px" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><g class="sunray"><g stroke="#fbbf24" stroke-width="7" stroke-linecap="round"><path d="M60 4v14M60 102v14M4 60h14M102 60h14M20 20l10 10M90 90l10 10M20 100l10-10M90 30l10-10"/></g></g><circle cx="60" cy="60" r="28" fill="#fde047"/><circle cx="51" cy="57" r="3.5" fill="#92400e"/><circle cx="69" cy="57" r="3.5" fill="#92400e"/><path d="M50 68 Q60 77 70 68" stroke="#92400e" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>
  <div class="cloud" style="top:150px;left:480px;width:210px">${A.CLOUD}</div>
  <div class="cloud" style="top:110px;left:860px;width:150px;animation-duration:22s">${A.CLOUD}</div></div>`;
}
function brand(size = 54) {
  return `<div class="brand">${A.falcon(size)}<div><div class="t1">H.SEF</div><div class="t2">نظام النسخ الاحتياطي المنزلي المجاني</div></div></div>`;
}
function hints(list) {
  return `<div class="hints">${list.map(([k, t]) => `<span><b>${k}</b>${t}</span>`).join("")}</div>`;
}

function prayerCard(p, topPx) {
  if (!p) return "";
  if (!p.times) {
    return `<div class="card glass prayer" style="top:${topPx}px"><h3>مواقيت الصلاة</h3>
      <div class="cd">اختر مدينتك من لوحة تحكم السيرفر ← وضع التلفاز</div></div>`;
  }
  const rows = p.times.map((t) => `<div class="row" data-k="${t.key}" data-t="${t.time}" data-n="${esc(t.name)}"><span>${esc(t.name)}</span><span class="ltr">${t.time}</span></div>`).join("");
  return `<div class="card glass prayer" style="top:${topPx}px"><div class="hd"><h3>مواقيت الصلاة</h3><span class="city">${esc(p.city || "")}</span></div>
    <div class="grid">${rows}</div><div class="cd"></div></div>`;
}
function updatePrayer(card) {
  const rows = [...card.querySelectorAll(".row[data-t]")];
  if (!rows.length) return;
  const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  const mins = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const cand = rows.filter((r) => r.dataset.k !== "sunrise");
  let nx = cand.find((r) => mins(r.dataset.t) > nowM);
  let diff;
  if (nx) diff = mins(nx.dataset.t) - nowM;
  else { nx = cand[0]; diff = 24 * 60 - nowM + mins(nx.dataset.t); }
  rows.forEach((r) => r.classList.toggle("nx", r === nx));
  const hh = Math.floor(diff / 60), mm = diff % 60;
  const txt = `${nx.dataset.n} بعد ${hh ? `${hh} س و ` : ""}${mm} د`;
  const cd = card.querySelector(".cd");
  if (cd && cd.textContent !== txt) cd.textContent = txt;
}
function wordCard(w, topPx, kids = false) {
  if (!w) return "";
  const langs = settings.words || ["ar", "fr", "en"];
  const tr = [["fr", "FR"], ["en", "EN"]].filter(([k]) => langs.includes(k))
    .map(([k, l]) => (kids ? `<b>${esc(w[k])}</b>` : `<span><b>${esc(w[k])}</b><small>${l}</small></span>`)).join("");
  if (kids) {
    return `<div class="kcard" style="top:${topPx}px;left:40px">${A.wordArt(w.icon, 66)}<div><div class="lbl">كلمة اليوم</div>
      <div class="big">${esc(w.ar)}</div><div class="tr">${tr}</div></div></div>`;
  }
  return `<div class="card glass word" style="top:${topPx}px">${A.wordArt(w.icon, 76)}<div style="flex:1"><div class="lbl">كلمة اليوم</div>
    <div class="ar">${esc(w.ar)}</div><div class="tr">${tr}</div></div></div>`;
}

// صورة الشخص الحقيقية إن رُفعت، وإلا الرسم المختار
function face(p) {
  return p.photo_v ? `<img src="/api/users/${p.id}/photo?v=${p.photo_v}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : A.avatar(p.avatar);
}

// ============================================================== من يشاهد؟
async function whoScreen(boot = false) {
  let d;
  try { d = await api("/api/tv/profiles"); } catch (e) { toast(e.message); return; }
  settings = d.settings || settings;
  applyPrefs();
  if (boot && d.current && d.profiles.some((p) => p.id === d.current)) return homeScreen();
  me = null;
  const cards = d.profiles.map((p) => {
    let sub = "";
    if (p.role === "kid" || p.role === "little") {
      if (p.birthday_today) sub = `<span class="chip">عيد ميلاد سعيد!</span>`;
      else if (p.birth_month) sub = `${A.cake(20)} ${esc(birthDM(p))}`;
      else if (p.role === "little") sub = `<span class="chip">وضع الأطفال</span>`;
    } else if (p.has_pin) sub = `<span style="display:flex">${A.LOCK}</span>`;
    const age = (p.role === "kid" || p.role === "little") && p.age != null ? `<div class="sub">عمري ${ageText(p.age)}</div>` : "";
    return `<button class="pf f" data-id="${p.id}"><div class="ring">${face(p)}</div>
      <div class="nm baloo">${esc(p.name)}</div><div class="sub">${sub}</div>${age}</button>`;
  }).join("");
  const el = h(`<div class="who bg-night">${nightBg()}
    <div class="topbar">${brand()}<div style="text-align:left"><div class="baloo js-tm" style="font-weight:700;font-size:34px;line-height:1;direction:ltr"></div><div class="js-dt" style="font-size:14px;color:#bfd3f2"></div></div></div>
    <h1>من يشاهد الآن؟</h1>
    ${d.profiles.length ? `<div class="profiles">${cards}</div>` : `<div class="empty-who">لا توجد ملفات على التلفاز بعد.<br>من الكمبيوتر افتح لوحة التحكم ← <b>وضع التلفاز</b> واختر نوع كل مستخدم (بالغ أو طفل).</div>`}
    ${hints([["← →", "للتنقل"], ["موافق", "للدخول"]])}</div>`);
  const byId = Object.fromEntries(d.profiles.map((p) => [String(p.id), p]));
  el.querySelectorAll(".pf").forEach((b) => b.addEventListener("click", () => chooseProfile(byId[b.dataset.id])));
  reset({ el, back() {}, refresh: null });
}

async function chooseProfile(p) {
  if (p.has_pin) {
    pinScreen({ title: `أهلاً ${p.name}`, sub: "أدخل رمزك", avatar: p.avatar, face: face(p) }, async (pin) => {
      await api("/api/tv/login", { json: { id: p.id, pin } });
      await homeScreen();
    });
    return;
  }
  try {
    await api("/api/tv/login", { json: { id: p.id } });
    await homeScreen();
  } catch (e) { toast(e.message); }
}

// ============================================================== الرمز
function pinScreen(opt, submit) {
  let pin = "";
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key f" data-k="${n}">${n}</button>`).join("");
  const ava = opt.face ? `<div class="ava">${opt.face}</div>` : opt.avatar != null ? `<div class="ava">${A.avatar(opt.avatar)}</div>`
    : `<div class="ava" style="background:#facc15;display:flex;align-items:center;justify-content:center;color:#713f12">${A.LOCK.replace(/18/g, "96")}</div>`;
  const el = h(`<div class="bg-night">${nightBg()}
    <div class="pin-wrap"><div class="pin-who">${ava}<h2>${esc(opt.title)}</h2><p>${esc(opt.sub || "")}</p>
      <div class="dots"></div><div class="pin-err"></div></div>
      <div class="keypad">${keys}<button class="key f" data-k="del" aria-label="مسح">${A.BACKSP}</button><button class="key f" data-k="0">0</button>
      <button class="key ok f" data-k="ok" aria-label="دخول">${A.CHECK}</button></div></div>
    ${hints([["0-9", "الأرقام"], ["موافق", "اختيار"], ["رجوع", "إلغاء"]])}</div>`);
  const dots = el.querySelector(".dots"), err = el.querySelector(".pin-err");
  const draw = () => {
    const n = Math.max(4, pin.length);
    dots.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < pin.length ? "on" : ""}"></i>`).join("");
  };
  let busy = false;
  const go = async () => {
    if (busy || pin.length < 4) { if (pin.length < 4) err.textContent = "الرمز 4 أرقام على الأقل"; return; }
    busy = true;
    try { await submit(pin); } catch (e) {
      err.textContent = e.message;
      dots.classList.remove("bad"); void dots.offsetWidth; dots.classList.add("bad");
      pin = ""; draw();
    } finally { busy = false; }
  };
  const press = (k) => {
    err.textContent = "";
    if (k === "del") pin = pin.slice(0, -1);
    else if (k === "ok") return go();
    else if (pin.length < 8) pin += k;
    draw();
    if (pin.length === 8) go();
  };
  el.querySelectorAll(".key").forEach((b) => b.addEventListener("click", () => press(b.dataset.k)));
  draw();
  push({
    el,
    initial: () => el.querySelector('[data-k="5"]'),
    key(e) {
      if (/^[0-9]$/.test(e.key)) { press(e.key); setFocus(el.querySelector('[data-k="ok"]')); return true; }
      if (e.key === "Backspace" && pin) { press("del"); return true; }
      return false;
    },
  });
}

// ============================================================== الرئيسية
async function homeScreen() {
  let d;
  try { d = await api("/api/tv/home"); } catch (e) { if (e.status !== 401) toast(e.message); return; }
  me = d;
  settings = d.settings || settings;
  applyPrefs();
  reset(d.user.role === "adult" ? adultHome(d) : kidsHome(d));
}

function adultHome(d) {
  const u = d.user;
  const wp = settings.wallpaper;
  const bgCls = wp === "photos" ? "bg-photos" : wp === "dark" ? "bg-night" : "bg-sky";
  const bgHtml = wp === "photos" ? `<div class="layer photolayer"></div>` : wp === "dark" ? nightBg() : skyBg();
  const dock = d.tiles.length ? d.tiles.map((t) => `<button class="dk f" data-id="${t.id}"><div class="ic" style="background:${A.gradient(t.color)}">${A.icon(t.icon)}</div><span>${esc(t.title)}</span></button>`).join("")
    : `<div class="dock-empty">أضف مربعات لهذا الحساب من لوحة التحكم ← وضع التلفاز</div>`;
  const hasPrayer = d.prayer && settings.prayer;
  const el = h(`<div class="${bgCls}">${bgHtml}
    <div class="topbar"><div style="display:flex;align-items:center;gap:12px">${A.falcon(46)}
      <div class="user-pill glass"><div class="mini">${face(u)}</div><span style="font-weight:700;font-size:16px">${esc(u.name)}</span></div></div>
      <button class="pill glass f js-switch">تبديل المستخدم</button></div>
    <div class="clockbig"><div class="tm js-tm"></div><div class="dt js-dt"></div><div class="hj js-hj"></div></div>
    <div class="cards">${hasPrayer ? prayerCard(d.prayer, 112) : ""}${wordCard(d.word, hasPrayer ? 336 : 112)}</div>
    <nav class="dock glass">${dock}</nav></div>`);
  const tiles = Object.fromEntries(d.tiles.map((t) => [String(t.id), t]));
  el.querySelectorAll(".dk").forEach((b) => b.addEventListener("click", () => openTile(tiles[b.dataset.id])));
  el.querySelector(".js-switch").addEventListener("click", leave);
  const scr = {
    el,
    initial: () => el.querySelector(".dk"),
    back: () => setFocus(el.querySelector(".js-switch")),
    refresh(c) { d.prayer = c.prayer; d.word = c.word; el.querySelector(".cards").innerHTML = (hasPrayer ? prayerCard(c.prayer, 112) : "") + wordCard(c.word, hasPrayer ? 336 : 112); },
  };
  if (wp === "photos") photoWallpaper(el.querySelector(".photolayer"), scr);
  return scr;
}

async function photoWallpaper(layer, scr) {
  let ids = [];
  try { ids = (await api("/api/tv/wallpaper")).ids; } catch { return; }
  if (!ids.length) { layer.innerHTML = skyBg(); layer.parentElement.classList.add("bg-sky"); return; }
  let i = 0, timer = 0;
  const a = h(`<div class="ph"></div>`), b = h(`<div class="ph"></div>`);
  layer.append(a, b);
  let front = a;
  const show = () => {
    const next = front === a ? b : a;
    const img = new Image();
    img.onload = () => {
      next.style.backgroundImage = `url("${img.src}")`;
      next.classList.add("show");
      front.classList.remove("show");
      front = next;
    };
    img.src = `/api/tv/photo/${ids[i++ % ids.length]}/view`;
  };
  show();
  timer = setInterval(show, 20000);
  const prev = scr.destroy;
  scr.destroy = () => { clearInterval(timer); prev?.(); };
}

function kidsHome(d) {
  const u = d.user;
  const n = d.tiles.length;
  const perRow = n <= 4 ? Math.max(n, 1) : n <= 8 ? 4 : n <= 10 ? 5 : 6;
  const rows = Math.ceil(Math.max(n, 1) / perRow);
  const avail = 344;
  const rowH = Math.min(210, (avail - (rows - 1) * 14) / rows);
  const boxH = Math.round(rowH - 40);
  const boxW = Math.round(Math.min(250, (1200 - (perRow - 1) * 26) / perRow, boxH * 1.75));
  const tiles = n ? d.tiles.map((t) => `<button class="kt f" data-id="${t.id}"><div class="box" style="--w:${boxW}px;--h:${boxH}px;background:${A.gradient(t.color)}">${A.icon(t.icon)}</div>
      <div class="lb">${esc(t.title)}</div></button>`).join("")
    : `<div style="font-size:24px;font-weight:700;color:#1e3a8a;text-align:center">لا يوجد شيء هنا بعد.<br>اطلب من ماما أو بابا إضافة المربعات.</div>`;
  let bday = "";
  if (u.birthday_today) {
    bday = `<div class="kcard bday">${A.cake(64)}<div><div class="big">عيد ميلاد سعيد!</div><div class="info">صار عمري ${ageText(u.age)} 🎈</div></div></div>`;
  } else if (u.birth_month) {
    bday = `<div class="kcard bday">${A.cake(56)}<div><div class="lbl">عيد ميلادي</div><div class="big">${esc(birthDM(u))}</div>
      <div class="info">عمري ${ageText(u.age)} · باقي ${daysText(u.birthday_in)}</div></div></div>`;
  }
  const confetti = u.birthday_today ? `<div class="confetti">${Array.from({ length: 40 }, (_, i) =>
    `<i style="left:${(i * 37) % 100}%;background:${["#f43f5e", "#facc15", "#22c55e", "#3b82f6", "#a855f7"][i % 5]};animation-duration:${4 + (i % 5)}s;animation-delay:-${(i * 0.7) % 6}s"></i>`).join("")}</div>` : "";
  const greet = u.birthday_today ? `عيد ميلاد سعيد يا ${esc(u.name)}!` : `مرحباً يا ${esc(u.name)}!`;
  const exitTxt = d.parent_lock ? `${A.LOCK} للخروج: رمز ماما أو بابا` : "تبديل المستخدم";
  const el = h(`<div class="kids bg-kids">${kidsBg()}${confetti}
    <div class="mascot">${A.mascot(150)}</div>
    <div class="kgreet"><div class="h">${greet}</div><div class="s">ماذا نشاهد اليوم؟</div></div>
    <div class="kclock"><div class="tm js-tm"></div><div class="dt js-dt"></div></div>
    ${bday}<div class="kwords">${wordCard(d.word, 180, true)}</div>
    <div class="ktiles">${tiles}</div>
    <button class="kexit f">${exitTxt}</button>
    <div class="knote">${u.role === "little" ? "" : "فقط ما اختاره ماما وبابا"}</div></div>`);
  const byId = Object.fromEntries(d.tiles.map((t) => [String(t.id), t]));
  el.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => openTile(byId[b.dataset.id])));
  el.querySelector(".kexit").addEventListener("click", leave);
  return {
    el,
    initial: () => el.querySelector(".kt"),
    back() {},
    refresh(c) { d.word = c.word; el.querySelector(".kwords").innerHTML = wordCard(c.word, 180, true); },
  };
}

async function leave() {
  if (me?.parent_lock) {
    pinScreen({ title: "رمز ماما أو بابا", sub: `للخروج من حساب ${me.user.name}` }, async (pin) => {
      await api("/api/tv/leave", { json: { parent_pin: pin } });
      await whoScreen();
    });
    return;
  }
  try { await api("/api/tv/leave", { json: {} }); } catch (e) { toast(e.message); return; }
  whoScreen();
}

// ============================================================== تصفح المربعات
function openTile(t) {
  if (t.kind === "photos") photosScreen(t);
  else browseScreen(t, "");
}
const isKid = () => me && me.user.role !== "adult";
const fileUrl = (t, p) => `/api/tv/tile/${t.id}/file?p=${encodeURIComponent(p)}`;
const thumbUrl = (t, p) => `/api/tv/tile/${t.id}/thumb?p=${encodeURIComponent(p)}`;

function header(t, title, crumb, extra = "") {
  return `<div class="bhead"><button class="back f js-back">${A.CHEVRON}<span>${crumb ? "رجوع" : "الرئيسية"}</span></button>
    <div class="ti" style="background:${A.gradient(t.color)}">${A.icon(t.icon)}</div><h1>${esc(title)}</h1>
    ${crumb ? `<span class="crumb">${esc(crumb)}</span>` : ""}<div class="sp"></div>${extra}</div>`;
}
function folderLabel(t) {
  const who = me?.user?.name || "";
  return (t.path || "").replace(/^\/home\b/, who);
}

async function browseScreen(t, sub) {
  let d;
  try { d = await api(`/api/tv/tile/${t.id}/list?sub=${encodeURIComponent(sub)}`); } catch (e) { toast(e.message); return; }
  const items = d.items;
  const media = items.filter((x) => x.type === "video" || x.type === "audio");
  const extra = media.length > 1 ? `<button class="btn gold f js-all">${A.PLAY}تشغيل الكل</button>` : "";
  const kid = isKid();
  const grad = A.gradient(t.color);
  const cards = items.map((x, i) => {
    const p = joinp(sub, x.name);
    let th;
    if (x.type === "video" || x.type === "image") {
      th = `<img loading="lazy" src="${thumbUrl(t, p)}" alt="">${x.type === "video" ? `<span class="tag">${A.PLAY}</span>` : ""}`;
    } else if (x.type === "folder" || x.type === "game") {
      th = x.cover ? `<img loading="lazy" src="${fileUrl(t, x.self ? joinp(sub, x.cover) : joinp(p, x.cover))}" alt="">` : A.icon(x.type === "game" ? "games" : "folder");
    } else if (x.type === "pdf") {
      th = `<img loading="lazy" src="/api/tv/tile/${t.id}/page?p=${encodeURIComponent(p)}&n=1" alt="" style="object-fit:contain;background:#fff">`;
    } else th = A.icon("audio");
    const bg = x.type === "folder" || x.type === "game" || x.type === "audio" ? `style="background:${grad}"` : "";
    const nm = x.self ? "▶ العب" : x.type === "folder" || x.type === "game" ? x.name : x.name.replace(/\.[^.]+$/, "");
    return `<button class="it f" data-i="${i}"><div class="th" ${bg}>${th}</div><div class="nm">${esc(nm)}</div></button>`;
  }).join("");
  const emptyMsg = kid ? "لا يوجد شيء هنا بعد.<br>اطلب من ماما أو بابا أن يضعوا لك أشياء جميلة 🌟" : "هذا المجلد فارغ.<br>ضع الملفات فيه من الكمبيوتر أو الهاتف:";
  const el = h(`<div class="${kid ? "bg-kidsdark" : "bg-dark"}" style="--glow1:${t.color ? t.color.split(",")[0] + "55" : ""}">
    ${header(t, t.title, sub, extra)}
    ${items.length ? `<div class="grid-wrap ${kid ? "kidgrid" : ""}"><div class="grid" style="--cols:${kid ? 4 : 5}">${cards}</div></div>`
      : `<div class="empty">${A.icon(t.icon)}<div>${emptyMsg}</div><div class="path ltr">${esc(folderLabel(t) + (sub ? "/" + sub : ""))}</div></div>`}
    ${hints([["موافق", "تشغيل"], ["رجوع", sub ? "المجلد السابق" : "الرئيسية"]])}</div>`);
  el.querySelector(".js-back").addEventListener("click", pop);
  el.querySelector(".js-all")?.addEventListener("click", () => {
    const vids = media.filter((x) => x.type === "video");
    if (vids.length) videoScreen(t, vids.map((x) => joinp(sub, x.name)), 0);
    else audioScreen(t, media.map((x) => joinp(sub, x.name)), 0);
  });
  el.querySelectorAll(".it").forEach((b) => b.addEventListener("click", () => {
    const x = items[+b.dataset.i];
    const p = joinp(sub, x.name);
    if (x.type === "folder") browseScreen(t, p);
    else if (x.type === "game") gameScreen(t, x.self ? sub : joinp(p, x.entry || ""));
    else if (x.type === "pdf") bookScreen(t, p);
    else {
      const same = items.filter((y) => y.type === x.type);
      const idx = same.indexOf(x);
      const paths = same.map((y) => joinp(sub, y.name));
      if (x.type === "video") videoScreen(t, paths, idx);
      else if (x.type === "audio") audioScreen(t, paths, idx);
      else viewerScreen(paths.map((q) => ({ src: fileUrl(t, q), name: q.split("/").pop().replace(/\.[^.]+$/, "") })), idx);
    }
  }));
  push({ el, initial: () => el.querySelector(".it") || el.querySelector(".js-back") });
}

// ============================================================== الفيديو
function videoScreen(t, paths, idx) {
  const el = h(`<div class="player"><video autoplay playsinline></video>
    <div class="bigplay" hidden>${A.PAUSE}</div><div class="counter"></div>
    <div class="osd"><div class="tt"></div><div class="bar"><i></i></div><div class="row"><span class="ct">0:00</span><span class="du">0:00</span></div>
    <div class="keys"><span><b>موافق</b>إيقاف/تشغيل</span><span><b>← →</b>ترجيع/تقديم</span><span><b>↑ ↓</b>الصوت</span><span><b>M</b>كتم</span><span><b>⏮ ⏭</b>السابق/التالي</span><span><b>رجوع</b>خروج</span></div></div></div>`);
  const v = el.querySelector("video"), osd = el.querySelector(".osd"), bar = el.querySelector(".bar i");
  const big = el.querySelector(".bigplay"), counter = el.querySelector(".counter");
  const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}` : "0:00");
  let hideT = 0;
  const showOsd = () => {
    osd.classList.remove("hide"); counter.style.opacity = 1;
    clearTimeout(hideT);
    hideT = setTimeout(() => { if (!v.paused) { osd.classList.add("hide"); counter.style.opacity = 0; } }, 3500);
  };
  const load = (i) => {
    idx = i;
    v.src = fileUrl(t, paths[i]);
    v.play().catch(() => {});
    el.querySelector(".tt").textContent = paths[i].split("/").pop().replace(/\.[^.]+$/, "");
    counter.textContent = paths.length > 1 ? `${i + 1} / ${paths.length}` : "";
    showOsd();
  };
  const next = () => (idx + 1 < paths.length ? load(idx + 1) : pop());
  v.addEventListener("timeupdate", () => {
    bar.style.width = `${(v.currentTime / v.duration) * 100 || 0}%`;
    el.querySelector(".ct").textContent = fmt(v.currentTime);
    el.querySelector(".du").textContent = fmt(v.duration);
  });
  v.addEventListener("play", () => { big.hidden = true; showOsd(); });
  v.addEventListener("pause", () => { if (!v.ended) { big.hidden = false; showOsd(); } });
  v.addEventListener("ended", next);
  v.addEventListener("error", () => { toast("لا يمكن تشغيل هذا الملف على التلفاز"); setTimeout(next, 2500); });
  v.addEventListener("click", () => (v.paused ? v.play() : v.pause()));
  push({
    el,
    busy: () => !v.paused,
    destroy() { clearTimeout(hideT); v.pause(); v.removeAttribute("src"); v.load(); },
    key(e) {
      const k = e.key;
      if (k === "Enter" || k === " " || k === "MediaPlayPause") { v.paused ? v.play() : v.pause(); return true; }
      if (k === "ArrowRight" || k === "MediaFastForward") { v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); showOsd(); return true; }
      if (k === "ArrowLeft" || k === "MediaRewind") { v.currentTime = Math.max(0, v.currentTime - 10); showOsd(); return true; }
      if (k === "ArrowUp") { volUp(); return true; }
      if (k === "ArrowDown") { volDown(); return true; }
      if (k === "MediaTrackNext" || k === "PageDown") { if (idx + 1 < paths.length) load(idx + 1); else showOsd(); return true; }
      if (k === "MediaTrackPrevious" || k === "PageUp") { if (idx > 0) load(idx - 1); else { v.currentTime = 0; showOsd(); } return true; }
      return false;
    },
  });
  load(idx);
}

// ============================================================== الصوت (أناشيد، قرآن، موسيقى)
function audioScreen(t, paths, idx) {
  const names = paths.map((p) => p.split("/").pop().replace(/\.[^.]+$/, ""));
  const list = names.map((n, i) => `<button class="trk f" data-i="${i}"><span class="n">${i + 1}</span><span class="x">${esc(n)}</span></button>`).join("");
  const el = h(`<div class="bg-dark audio" style="--glow1:${(t.color || "#a855f7").split(",")[0]}66">
    ${header(t, t.title, "")}
    <div class="cover" style="background:${A.gradient(t.color)}">${A.icon(t.icon)}</div>
    <div class="now"><div class="tt"></div><div class="bar"><i></i></div>
      <div class="vbtns"><button class="btn f js-vd">${VOL_ICON(false).replace(/34/g, "24")} −</button><button class="btn f js-vm">${VOL_ICON(true).replace(/34/g, "24")}</button><button class="btn f js-vu">${VOL_ICON(false).replace(/34/g, "24")} +</button></div></div>
    <div class="list">${list}</div><audio autoplay></audio>
    ${hints([["موافق", "تشغيل"], ["+ −", "الصوت"], ["M", "كتم"], ["رجوع", "خروج"]])}</div>`);
  const au = el.querySelector("audio"), bar = el.querySelector(".now .bar i"), cover = el.querySelector(".cover");
  const load = (i) => {
    idx = i;
    au.src = fileUrl(t, paths[i]);
    au.play().catch(() => {});
    el.querySelector(".now .tt").textContent = names[i];
    el.querySelectorAll(".trk").forEach((b) => b.classList.toggle("cur", +b.dataset.i === i));
  };
  au.addEventListener("timeupdate", () => { bar.style.width = `${(au.currentTime / au.duration) * 100 || 0}%`; });
  au.addEventListener("play", () => cover.classList.add("playing"));
  au.addEventListener("pause", () => cover.classList.remove("playing"));
  au.addEventListener("ended", () => { if (idx + 1 < paths.length) load(idx + 1); });
  au.addEventListener("error", () => { toast("لا يمكن تشغيل هذا الملف"); if (idx + 1 < paths.length) setTimeout(() => load(idx + 1), 1500); });
  el.querySelector(".js-back").addEventListener("click", pop);
  el.querySelector(".js-vd").addEventListener("click", volDown);
  el.querySelector(".js-vu").addEventListener("click", volUp);
  el.querySelector(".js-vm").addEventListener("click", volMute);
  el.querySelectorAll(".trk").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.i;
    if (i === idx) (au.paused ? au.play() : au.pause()); else load(i);
  }));
  push({
    el,
    initial: () => el.querySelector(`.trk[data-i="${idx}"]`),
    busy: () => !au.paused,
    destroy() { au.pause(); au.removeAttribute("src"); au.load(); },
    key(e) {
      if (e.key === " " || e.key === "MediaPlayPause") { au.paused ? au.play() : au.pause(); return true; }
      if (e.key === "MediaTrackNext" && idx + 1 < paths.length) { load(idx + 1); return true; }
      if (e.key === "MediaTrackPrevious" && idx > 0) { load(idx - 1); return true; }
      return false;
    },
  });
  load(idx);
}

// ============================================================== عارض الصور وعرض الشرائح
function viewerScreen(items, idx, slideshow = false) {
  const el = h(`<div class="player"><div class="pimg"></div><div class="pimg"></div><video playsinline style="display:none"></video>
    <div class="counter"></div>
    <div class="osd hide"><div class="tt"></div><div class="keys"><span><b>← →</b>التالي/السابق</span><span><b>موافق</b>عرض شرائح</span><span><b>رجوع</b>خروج</span></div></div></div>`);
  const [l1, l2] = el.querySelectorAll(".pimg");
  const v = el.querySelector("video"), counter = el.querySelector(".counter"), osd = el.querySelector(".osd");
  let front = l1, timer = 0, hideT = 0, playing = slideshow;
  const showOsd = (ms = 3000) => { osd.classList.remove("hide"); counter.style.opacity = 1; clearTimeout(hideT); hideT = setTimeout(() => { osd.classList.add("hide"); if (playing) counter.style.opacity = 0; }, ms); };
  const schedule = () => { clearTimeout(timer); if (playing && !items[idx].video) timer = setTimeout(() => go(1), 6500); };
  const show = (i) => {
    idx = (i + items.length) % items.length;
    const it = items[idx];
    counter.textContent = `${idx + 1} / ${items.length}`;
    el.querySelector(".tt").textContent = it.name || "";
    if (it.video) {
      l1.classList.remove("show"); l2.classList.remove("show");
      v.style.display = ""; v.src = it.src; v.play().catch(() => {});
      clearTimeout(timer);
      return;
    }
    v.pause(); v.style.display = "none";
    const next = front === l1 ? l2 : l1;
    const img = new Image();
    img.onload = () => {
      next.style.background = `#000 url("${img.src}") center/contain no-repeat`;
      next.classList.remove("kb"); void next.offsetWidth;
      if (playing) next.classList.add("kb");
      next.classList.add("show"); front.classList.remove("show"); front = next;
      schedule();
      const pre = items[(idx + 1) % items.length];
      if (pre && !pre.video) new Image().src = pre.src;
    };
    img.onerror = () => { if (playing) timer = setTimeout(() => go(1), 1000); };
    img.src = it.src;
  };
  const go = (d) => show(idx + d);
  v.addEventListener("ended", () => { if (playing) go(1); });
  push({
    el,
    busy: () => playing || !v.paused,
    destroy() { clearTimeout(timer); clearTimeout(hideT); v.pause(); },
    key(e) {
      const k = e.key;
      if (k === "ArrowLeft") { go(1); showOsd(); return true; }
      if (k === "ArrowRight") { go(-1); showOsd(); return true; }
      if (k === "Enter" || k === " " || k === "MediaPlayPause") {
        if (items[idx].video && !playing) { v.paused ? v.play() : v.pause(); return true; }
        playing = !playing; toast(playing ? "عرض الشرائح" : "إيقاف عرض الشرائح", 1500); schedule(); return true;
      }
      if (k === "ArrowUp") { if (items[idx].video) volUp(); else showOsd(); return true; }
      if (k === "ArrowDown") { if (items[idx].video) volDown(); else showOsd(); return true; }
      return false;
    },
  });
  show(idx);
  showOsd();
}

// ============================================================== مكتبة الصور
async function photosScreen(t) {
  let items = [], nextOff = 0;
  const load = async () => {
    const d = await api(`/api/tv/photos?offset=${nextOff}`);
    items = items.concat(d.items);
    nextOff = d.next;
    return d.items;
  };
  try { await load(); } catch (e) { toast(e.message); return; }
  const fmtMonth = new Intl.DateTimeFormat("ar-SY-u-nu-latn", { month: "long", year: "numeric" });
  let lastMonth = "";
  const cell = (x, i) => {
    let head = "";
    const m = (x.taken_at || "").slice(0, 7);
    if (m && m !== lastMonth) {
      lastMonth = m;
      const [y, mo] = m.split("-").map(Number);
      head = `<div class="monthh">${esc(fmtMonth.format(new Date(y, mo - 1, 1)))}</div>`;
    }
    return `${head}<button class="it f" data-i="${i}"><div class="th"><img loading="lazy" src="/api/tv/photo/${x.id}/thumb" alt="">${x.is_video ? `<span class="tag">${A.PLAY}</span>` : ""}</div></button>`;
  };
  const kid = isKid();
  const el = h(`<div class="${kid ? "bg-kidsdark" : "bg-dark"} photos">
    ${header(t, t.title, "", items.length ? `<button class="btn gold f js-show">${A.PLAY}عرض شرائح</button>` : "")}
    ${items.length ? `<div class="grid-wrap"><div class="grid" style="--cols:6">${items.map(cell).join("")}</div></div>`
      : `<div class="empty">${A.icon("photos")}<div>لا توجد صور بعد.<br>ارفع الصور من الهاتف إلى تطبيق «الصور» في السيرفر.</div></div>`}
    ${hints([["موافق", "عرض الصورة"], ["رجوع", "الرئيسية"]])}</div>`);
  const grid = el.querySelector(".grid");
  const toView = () => items.map((x) => ({ src: `/api/tv/photo/${x.id}/view`, video: !!x.is_video, name: "" }));
  const bind = (root) => root.querySelectorAll(".it:not([data-b])").forEach((b) => {
    b.dataset.b = 1;
    b.addEventListener("click", () => viewerScreen(toView(), +b.dataset.i));
  });
  bind(el);
  el.querySelector(".js-back").addEventListener("click", pop);
  el.querySelector(".js-show")?.addEventListener("click", () => viewerScreen(toView(), 0, true));
  let loading = false;
  push({
    el,
    initial: () => el.querySelector(".it") || el.querySelector(".js-back"),
    async onFocus(f) {
      if (loading || nextOff == null || !f.dataset.i || +f.dataset.i < items.length - 18) return;
      loading = true;
      try {
        const start = items.length;
        const more = await load();
        grid.insertAdjacentHTML("beforeend", more.map((x, j) => cell(x, start + j)).join(""));
        bind(grid);
      } catch { /* تجاهل */ } finally { loading = false; }
    },
  });
}

// ============================================================== الألعاب
function gameScreen(t, path) {
  const el = h(`<div class="game"><iframe src="/tv/game/${t.id}/${path ? `${encPath(path)}/` : ""}" allow="autoplay; fullscreen; gamepad" title="${esc(path)}"></iframe>
    <div class="exit">للخروج من اللعبة اضغط «رجوع» (Esc)</div></div>`);
  const fr = el.querySelector("iframe");
  const onKey = (e) => { activity(); if (e.key === "Escape" || e.key === "BrowserBack" || e.key === "GoBack") { e.preventDefault(); pop(); } };
  fr.addEventListener("load", () => {
    try {
      fr.contentWindow.addEventListener("keydown", onKey);
      fr.contentWindow.addEventListener("mousemove", activity);
      fr.contentWindow.focus();
    } catch { /* لعبة من مصدر آخر */ }
  });
  setTimeout(() => { const x = el.querySelector(".exit"); if (x) x.style.opacity = 0; }, 5000);
  push({
    el,
    busy: () => true,
    key(e) { if (e.key === "Escape" || BACK_KEYS.has(e.key)) { pop(); return true; } return false; },
  });
  setTimeout(() => { try { fr.contentWindow.focus(); } catch { /* */ } }, 300);
}

// ============================================================== الكتب (PDF): صفحات تُقلب بالأسهم
async function bookScreen(t, path) {
  let pages = null;
  try { pages = (await api(`/api/tv/tile/${t.id}/pdfinfo?p=${encodeURIComponent(path)}`)).pages; } catch (e) { toast(e.message); return; }
  if (!pages) {
    const el = h(`<div class="book" style="background:#525659"><iframe class="pdffall" src="${fileUrl(t, path)}"></iframe></div>`);
    push({ el });
    return;
  }
  const key = `tvbook:${t.id}:${path}`;
  let n = 1;
  try { n = Math.min(pages, Math.max(1, +localStorage.getItem(key) || 1)); } catch { /* */ }
  const el = h(`<div class="player book"><div class="grid-wrap" style="top:0;bottom:0;padding:0"><img class="pg" alt=""></div><div class="counter"></div>
    <div class="osd hide"><div class="keys"><span><b>←</b>الصفحة التالية</span><span><b>→</b>السابقة</span><span><b>موافق</b>تكبير</span><span><b>رجوع</b>خروج</span></div></div></div>`);
  const img = el.querySelector(".pg"), wrap = el.querySelector(".grid-wrap"), counter = el.querySelector(".counter"), osd = el.querySelector(".osd");
  const url = (i) => `/api/tv/tile/${t.id}/page?p=${encodeURIComponent(path)}&n=${i}`;
  let hideT = 0;
  const show = (i) => {
    n = Math.min(pages, Math.max(1, i));
    img.src = url(n);
    wrap.scrollTop = 0;
    counter.textContent = `${n} / ${pages}`;
    try { localStorage.setItem(key, n); } catch { /* */ }
    if (n < pages) new Image().src = url(n + 1);
    osd.classList.remove("hide"); clearTimeout(hideT); hideT = setTimeout(() => osd.classList.add("hide"), 2500);
  };
  push({
    el,
    destroy() { clearTimeout(hideT); },
    key(e) {
      const k = e.key;
      if (k === "ArrowLeft" || k === "PageDown") { show(n + 1); return true; }
      if (k === "ArrowRight" || k === "PageUp") { show(n - 1); return true; }
      if (k === "Enter" || k === " ") { img.classList.toggle("zoom"); wrap.scrollTop = 0; return true; }
      if (k === "ArrowDown") { wrap.scrollBy({ top: 200, behavior: "smooth" }); return true; }
      if (k === "ArrowUp") { wrap.scrollBy({ top: -200, behavior: "smooth" }); return true; }
      return false;
    },
  });
  show(n);
}

// ============================================================== شاشة التوقف + منع إطفاء الشاشة
let lastAct = Date.now();
let saverEl = null, saverTimer = 0;
function activity() { lastAct = Date.now(); }
function inNight() {
  const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(settings.night_off || "");
  if (!m) return false;
  const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
  const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4];
  return a <= b ? cur >= a && cur < b : cur >= a || cur < b;
}
async function showSaver(night) {
  saverEl = h(`<div class="saver ${night ? "night" : ""}"><div class="blurbg"></div><div class="ph"></div><div class="blurbg"></div><div class="ph"></div>
    <div class="sclock"><div class="tm js-tm"></div><div class="dt js-dt"></div></div></div>`);
  stage.appendChild(saverEl);
  tick();
  const el = saverEl;
  let ids = [];
  if (!night && me) { try { ids = (await api("/api/tv/wallpaper")).ids; } catch { /* */ } }
  if (el !== saverEl) return;
  if (!ids.length) {
    el.classList.add("empty");
    const clock = el.querySelector(".sclock");
    const wander = () => { clock.style.right = `${40 + Math.random() * 700}px`; clock.style.bottom = `${40 + Math.random() * 480}px`; };
    saverTimer = setInterval(wander, 20000);
    return;
  }
  const phs = el.querySelectorAll(".ph"), bgs = el.querySelectorAll(".blurbg");
  let i = 0, k = 0;
  const next = () => {
    const img = new Image();
    img.onload = () => {
      const a = k % 2, b = 1 - a;
      phs[a].style.backgroundImage = bgs[a].style.backgroundImage = `url("${img.src}")`;
      phs[a].classList.add("show"); bgs[a].classList.add("show");
      phs[b].classList.remove("show"); bgs[b].classList.remove("show");
      k++;
    };
    img.src = `/api/tv/photo/${ids[i++ % ids.length]}/view`;
  };
  next();
  saverTimer = setInterval(next, 12000);
}
function hideSaver() {
  clearInterval(saverTimer);
  saverEl?.remove();
  saverEl = null;
  activity();
}
setInterval(() => {
  if (saverEl) {
    if (saverEl.classList.contains("night") && !inNight()) hideSaver();
    return;
  }
  const t = top();
  if (t?.busy?.()) { activity(); return; }
  const night = inNight();
  const lim = night ? 1 : +settings.saver_min || 0;
  if (lim && Date.now() - lastAct > lim * 60000) showSaver(night);
}, 10000);

let wakeLock = null;
async function keepAwake() {
  if (!settings.nosleep || !navigator.wakeLock || document.visibilityState !== "visible") return;
  try { if (!wakeLock || wakeLock.released) wakeLock = await navigator.wakeLock.request("screen"); } catch { /* غير متاح */ }
}
function applyPrefs() {
  fit();
  if (settings.nosleep) keepAwake();
  else if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener("visibilitychange", keepAwake);

// تحديث المواقيت وكلمة اليوم كل نصف ساعة (وعند منتصف الليل)
setInterval(async () => {
  try {
    const c = await api("/api/tv/clock");
    stack.forEach((s) => s.refresh?.(c));
  } catch { /* */ }
}, 30 * 60000);

// ============================================================== البدء
if (TV.preview) {
  const b = h(`<div class="badge-preview">معاينة من الكمبيوتر: الأسهم للتنقل، Enter للاختيار، Esc للرجوع</div>`);
  stage.appendChild(b);
  setTimeout(() => { b.style.opacity = 0; }, 7000);
}
whoScreen(true);
