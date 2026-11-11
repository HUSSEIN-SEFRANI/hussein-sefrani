// HOME ANAB TV — واجهة التلفاز. تعمل بالأسهم و«موافق» و«رجوع» (ريموت أو لوحة مفاتيح)، والفأرة أيضاً.
import * as A from "./tv-art.js";
import * as F from "./tv-fruit.js";

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
  const hs = el.closest(".profiles");
  if (hs) {  // شريط أفقي
    const r = el.getBoundingClientRect(), c = hs.getBoundingClientRect(), p = 60 * scale;
    if (r.left < c.left + p) hs.scrollBy({ left: (r.left - c.left - p) / scale, behavior: "smooth" });
    else if (r.right > c.right - p) hs.scrollBy({ left: (r.right - c.right + p) / scale, behavior: "smooth" });
    return;
  }
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
  const t = top();
  if (VOL_KEYS[e.key] && !(t && t.typing)) { VOL_KEYS[e.key](); e.preventDefault(); return; }
  if (e.key === "Home" && me && !(t && t.isGame)) { homeScreen(); e.preventDefault(); return; }
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
  return `<div class="brand">${F.LOGO(Math.round(size * 0.8))}<div class="t2">منزل العنب</div></div>`;
}
// ============================================================== نجوم العائلة
async function fillBalance(el) {
  try { const r = await api("/api/tv/stars"); el.querySelectorAll(".js-sb").forEach((b) => { b.textContent = r.my_balance ?? ""; }); } catch { /* لا شيء */ }
}
const STAR_REASONS = {
  give: ["ترتيب الغرفة 🧹", "المساعدة في البيت 🏠", "الصلاة في وقتها 🕌", "قراءة القرآن 📖", "إنهاء الواجبات 📚", "إنهاء الطعام 🍽️", "النوم مبكراً 😴", "الكلام اللطيف 💬", "مشاركة الإخوة 🤝"],
  take: ["عدم سماع الكلام", "الشجار", "التأخر عن النوم", "عدم ترتيب الأغراض", "الكلام غير اللطيف"],
  transfer: ["هدية 🎁", "شكراً لمساعدتك 🙏", "لأنك لطيف 💖", "تهنئة 🎉", "أردّ ما استلفته 🤝"],
};
function starBurst() {
  const fx = h(`<div class="starburst">${Array.from({ length: 26 }, (_, i) => `<i class="emo" style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * 0.12}s">${i % 3 ? "⭐" : "🌟"}</i>`).join("")}</div>`);
  stage.appendChild(fx); setTimeout(() => fx.remove(), 3200);
}
function ago(ts) {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  return m < 1 ? "الآن" : m < 60 ? `قبل ${m} د` : m < 1440 ? `قبل ${Math.round(m / 60)} س` : `قبل ${Math.round(m / 1440)} يوم`;
}
function starsLine(x) {
  const n = `<b class="sv">⭐ ${x.amount}</b>`;
  const what = x.kind === "transfer" ? `${esc(x.from || "?")} ← ${esc(x.to || "?")} ${n}` : x.kind === "give" ? `${esc(x.by || "?")} أعطى ${esc(x.to || "?")} ${n}`
    : x.kind === "game" ? `🎮 ${esc(x.to || "?")} ربح ${n}` : `${esc(x.by || "?")} خصم من ${esc(x.to || "?")} ${n}`;
  return `<div class="sl ${x.kind}"><span>${what}</span><i>${esc(x.reason)}</i><small>${ago(x.ts)}</small></div>`;
}
async function starsScreen() {
  let r;
  try { r = await api("/api/tv/stars"); } catch (e) { toast(e.message); return; }
  const el = h(`<div class="bg-dark stars-scr"><div class="bhead"><button class="back f js-back">${A.CHEVRON}<span>الرئيسية</span></button>
    <div class="ti emo" style="background:linear-gradient(135deg,#fef3c7,#f59e0b);font-size:34px">⭐</div><h1>نجوم العائلة</h1></div>
    <div class="sp-row"></div><div class="sp-acts"></div><div class="sp-log"></div>
    ${hints([["موافق", "اختيار"], ["رجوع", "الرئيسية"]])}</div>`);
  const draw = (d) => {
    r = d;
    const top1 = Math.max(...d.people.map((p) => p.balance));
    el.querySelector(".sp-row").innerHTML = [...d.people].sort((a, b) => b.balance - a.balance).map((p) => `<div class="sp${p.id === d.me ? " me" : ""}">
      ${p.balance === top1 && top1 > 0 ? `<span class="crown emo">👑</span>` : ""}<div class="ring">${face(p)}</div><b>${esc(p.name)}</b><div class="bal"><span class="emo">⭐</span> ${p.balance}</div></div>`).join("");
    const acts = [];
    if (d.my_balance != null) acts.push(`<button class="btn gold f" data-a="transfer">🎁 أهدِ نجوماً (رصيدك ${d.my_balance})</button>`);
    if (d.can_manage) acts.push(`<button class="btn f" data-a="give">➕ أضف نجوماً</button><button class="btn f" data-a="take">➖ اخصم نجوماً</button>`);
    el.querySelector(".sp-acts").innerHTML = acts.join("");
    el.querySelector(".sp-log").innerHTML = d.log.length ? d.log.slice(0, 7).map(starsLine).join("") : `<p class="set-msg">لا توجد حركات بعد. كل شخص يبدأ بـ ${d.start} نجوم ⭐</p>`;
    el.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => starFlow(b.dataset.a, r, draw)));
  };
  draw(r);
  el.querySelector(".js-back").addEventListener("click", pop);
  push({ el, isStars: true, initial: () => el.querySelector("[data-a]") || el.querySelector(".js-back") });
}
function choiceScreen(title, items, onPick, cols = 4) {
  const el = h(`<div class="bg-dark"><div class="bhead"><button class="back f js-back">${A.CHEVRON}<span>رجوع</span></button><h1>${title}</h1></div>
    <div class="choice-grid" style="grid-template-columns:repeat(${cols},1fr)">${items.map((it, i) => `<button class="choice f" data-i="${i}">${it.html}</button>`).join("")}</div>
    ${hints([["موافق", "اختيار"], ["رجوع", "رجوع"]])}</div>`);
  el.querySelector(".js-back").addEventListener("click", pop);
  el.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => onPick(items[+b.dataset.i].value)));
  push({ el, initial: () => el.querySelector(".choice") });
}
function starFlow(kind, r, redraw) {
  const meP = r.people.find((p) => p.id === r.me);
  const verb = { transfer: "أهدِ نجوماً", give: "أضف نجوماً", take: "اخصم نجوماً" }[kind];
  const people = r.people.filter((p) => kind !== "transfer" || p.id !== r.me);
  const backToStars = () => { while (stack.length > 1 && !top().isStars) pop(); };
  choiceScreen(`${verb}: لمن؟`, people.map((p) => ({ value: p, html: `<div class="ring">${face(p)}</div><b>${esc(p.name)}</b><small>⭐ ${p.balance}</small>` })), (to) => {
    const max = kind === "transfer" ? meP.balance : kind === "take" ? to.balance : 100;
    const amounts = [1, 2, 3, 5, 10, 20].filter((n) => n <= max);
    if (!amounts.length) { toast(kind === "transfer" ? "رصيدك لا يكفي" : "الرصيد صفر"); return; }
    choiceScreen(`${verb} لـ ${esc(to.name)}: كم نجمة؟`, amounts.map((n) => ({ value: n, html: `<span class="big">${n}</span><span class="emo">${"⭐".repeat(Math.min(n, 5))}</span>` })), (amount) => {
      const reasons = STAR_REASONS[kind].map((t) => ({ value: t, html: `<b>${esc(t)}</b>` }));
      reasons.push({ value: null, html: `<b>✏️ سبب آخر…</b>` });
      choiceScreen("ما السبب؟", reasons, (reason) => {
        const send = async (why, pin) => {
          const url = kind === "transfer" ? "/api/tv/stars/transfer" : "/api/tv/stars/adjust";
          const d = await api(url, { json: { to: to.id, amount, reason: why, kind, pin } });
          backToStars(); redraw(d); starBurst();
          toast(kind === "take" ? `خُصمت ${amount} من ${to.name}` : `⭐ ${amount} لـ ${to.name}`, 3500);
        };
        const withPin = (why) => {
          if (kind === "transfer" && r.has_pin) pinScreen({ title: "رمزك للتأكيد", sub: `${amount} ⭐ ← ${to.name}`, face: face(meP) }, (pin) => send(why, pin));
          else send(why).catch((e) => toast(e.message, 5000));
        };
        if (reason) withPin(reason);
        else oskScreen({ title: "اكتب السبب", okLabel: "تم" }, (txt) => { if (txt && txt.trim()) withPin(txt.trim()); });
      }, 3);
    }, 6);
  }, Math.min(6, Math.max(3, people.length)));
}

// ثيم الفاكهة: الدالية أعلى الشاشة ولون التوهج
function vineLayer(theme, hang) { return `<div class="vinelayer">${F.vine(theme, hang ? { hang } : undefined)}</div>`; }
function setTheme(theme) { stage.style.setProperty("--glow1", F.themeOf(theme).glow); stage.style.setProperty("--accent", F.themeOf(theme).accent); }

function themeScreen() {
  const cur = (me && me.user && me.user.theme) || "grape";
  const el = h(`<div class="bg-dark"><div class="bhead"><button class="back f js-back">${A.CHEVRON}<span>الرئيسية</span></button>
    <div class="ti emo" style="background:linear-gradient(135deg,#faf5ff,#e9d5ff);font-size:34px">${F.themeOf(cur).emoji}</div><h1>ثيمي: اختر فاكهتك</h1></div>
    <div class="theme-grid">${Object.entries(F.THEMES).map(([k, t]) => `<button class="theme-card f${k === cur ? " on" : ""}" data-k="${k}" style="--c:${t.accent}">
      <div class="tv-prev">${F.vine(k, { hang: [640] })}</div><div class="tm">${F.mascot(k, 96)}</div><b>${t.name}</b>${k === cur ? "<i>✓ ثيمي الآن</i>" : ""}</button>`).join("")}</div>
    ${hints([["موافق", "اختيار"], ["رجوع", "الرئيسية"]])}</div>`);
  el.querySelector(".js-back").addEventListener("click", pop);
  el.querySelectorAll(".theme-card").forEach((b) => b.addEventListener("click", async () => {
    try { await api("/api/tv/theme", { json: { theme: b.dataset.k } }); } catch (e) { toast(e.message); return; }
    toast(`صار ثيمك: ${F.themeOf(b.dataset.k).name} ${F.themeOf(b.dataset.k).emoji}`, 3000);
    homeScreen();
  }));
  push({ el, initial: () => el.querySelector(".theme-card.on") || el.querySelector(".theme-card") });
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
  const art = (size) => (w.emoji ? `<span class="emo" style="font-size:${Math.round(size * 0.82)}px;line-height:1">${w.emoji}</span>` : A.wordArt(w.icon, size));
  if (kids) {
    return `<div class="kcard" style="top:${topPx}px;left:40px">${art(66)}<div><div class="lbl">كلمة اليوم</div>
      <div class="big">${esc(w.ar)}</div><div class="tr">${tr}</div></div></div>`;
  }
  return `<div class="card glass word" style="top:${topPx}px">${art(76)}<div style="flex:1"><div class="lbl">كلمة اليوم</div>
    <div class="ar">${esc(w.ar)}</div><div class="tr">${tr}</div></div></div>`;
}

// الطقس ونص اليوم (حديث، آية، حكمة، مثل) في الصفحة الرئيسية
function weatherLine(w) {
  if (!w) return "";
  const range = w.max != null && w.min != null ? ` · <bdi dir="ltr">${w.min}° / ${w.max}°</bdi>` : "";
  return `<span class="emo">${w.icon}</span> <b><bdi dir="ltr">${w.temp}°</bdi></b> <small>${esc(w.desc || "")}${w.city ? ` · ${esc(w.city)}` : ""}${range}</small>`;
}
const TEXT_ICON = { hadith: "🕌", ayah: "📖", proverb: "📜", wisdom: "💡" };
const letters = (t) => t.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").length;
function textBody(t) {
  if (t.kind === "ayah") return `<span class="qr">﴿${esc(t.text)}﴾</span>`;
  return t.kind === "hadith" ? `«${esc(t.text)}»` : esc(t.text);
}
function textCard(t, kids = false, cls = "") {
  if (!t) return "";
  const icon = TEXT_ICON[t.kind] || "✨";
  const long = letters(t.text) > (kids ? 42 : 55) ? " long" : "";
  return `<div class="tcard ${kids ? "kid" : "glass"} ${t.kind}${long} ${cls}"><div class="lbl"><span class="emo">${icon}</span> ${esc(t.label)}</div>
    <div class="tx">${textBody(t)}</div>
    ${t.source ? `<div class="src">${esc(t.source)}</div>` : ""}${t.explain && (kids || t.kind === "proverb") ? `<div class="ex">${esc(t.explain)}</div>` : ""}</div>`;
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
      <div class="nm baloo">${esc(p.name)}</div><div class="pf-stars"><span class="emo">⭐</span> ${p.stars ?? 0}</div><div class="sub">${sub}</div>${age}</button>`;
  }).join("");
  setTheme("grape");
  const el = h(`<div class="who bg-night">${nightBg()}${vineLayer("grape")}
    <div class="topbar">${brand()}<div style="text-align:left"><div class="baloo js-tm" style="font-weight:700;font-size:34px;line-height:1;direction:ltr"></div><div class="js-dt" style="font-size:14px;color:#bfd3f2"></div></div></div>
    ${d.setup ? "" : "<h1>من يشاهد الآن؟</h1>"}
    ${d.setup ? `<div class="empty-who"><b style="font-size:30px;color:#fff">أهلاً بك في HOME ANAB!</b><br>لإنشاء حساب المدير افتح من هاتفك أو كمبيوترك:<br>
      ${d.setup.urls.map((u) => `<bdi dir="ltr"><b style="font-size:30px;color:#fde68a">${esc(u)}</b></bdi>`).join("<br>")}
      <div style="display:flex;gap:18px;align-items:center;justify-content:center;margin-top:18px"><img src="/static/img/whatsapp-qr.png" alt="" style="width:120px;height:120px;border-radius:12px;background:#fff;padding:4px">
      <span style="text-align:right">رمز الإعداد: اطلبه من المطوّر عبر واتساب<br><bdi dir="ltr"><b>+32 494 49 94 30</b></bdi></span></div></div>`
    : d.profiles.length ? `<div class="pf-wrap"><div class="profiles">${cards}</div><div class="pf-arrow r">›</div><div class="pf-arrow l">‹</div></div>` : `<div class="empty-who">لا توجد ملفات على التلفاز بعد.<br>من الكمبيوتر افتح لوحة التحكم ← <b>وضع التلفاز</b> واختر نوع كل مستخدم (بالغ أو طفل).</div>`}
    ${hints([["← →", "للتنقل"], ["موافق", "للدخول"]])}</div>`);
  const byId = Object.fromEntries(d.profiles.map((p) => [String(p.id), p]));
  el.querySelectorAll(".pf").forEach((b) => b.addEventListener("click", () => chooseProfile(byId[b.dataset.id])));
  // شريط واحد يمرَّر يميناً ويساراً، مع سهمين عند وجود أشخاص خارج الشاشة
  const row = el.querySelector(".profiles");
  const arrows = () => {
    if (!row) return;
    const c = row.getBoundingClientRect(), cards = row.querySelectorAll(".pf");
    const xs = [...cards].map((x) => x.getBoundingClientRect());
    el.querySelector(".pf-arrow.l").classList.toggle("on", xs.some((r) => r.left < c.left - 2));
    el.querySelector(".pf-arrow.r").classList.toggle("on", xs.some((r) => r.right > c.right + 2));
  };
  row?.addEventListener("scroll", arrows);
  reset({ el, back() {}, refresh: null, onFocus: () => setTimeout(arrows, 350) });
  setTimeout(arrows, 50);
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
  const setTile = `<button class="dk f js-stars"><div class="ic emo" style="background:linear-gradient(135deg,#fef3c7,#f59e0b)">⭐</div><span>النجوم <b class="js-sb"></b></span></button>`
    + `<button class="dk f js-theme"><div class="ic emo" style="background:linear-gradient(135deg,#faf5ff,#e9d5ff)">${F.themeOf(u.theme).emoji}</div><span>ثيمي</span></button>`
    + (u.admin ? `<button class="dk f js-settings"><div class="ic" style="background:linear-gradient(135deg,#64748b,#1e293b)">${GEAR}</div><span>الإعدادات</span></button>` : "");
  const hasPrayer = d.prayer && settings.prayer;
  setTheme(u.theme);
  const el = h(`<div class="${bgCls}">${bgHtml}${vineLayer(u.theme, [490, 620, 750])}
    <div class="topbar"><div style="display:flex;align-items:center;gap:12px">${F.GRAPE(54)}
      <div class="user-pill glass"><div class="mini">${face(u)}</div><span style="font-weight:700;font-size:16px">${esc(u.name)}</span></div></div>
      <button class="pill glass f js-switch">تبديل المستخدم</button></div>
    <div class="clockbig"><div class="tm js-tm"></div><div class="dt js-dt"></div><div class="hj js-hj"></div><div class="wx js-wx">${weatherLine(d.weather)}</div></div>
    ${textCard(d.text, false, hasPrayer ? "beside" : "solo")}
    <div class="cards">${hasPrayer ? prayerCard(d.prayer, 112) : ""}${wordCard(d.word, hasPrayer ? 336 : 112)}</div>
    <nav class="dock glass">${dock}${setTile}</nav></div>`);
  const tiles = Object.fromEntries(d.tiles.map((t) => [String(t.id), t]));
  el.querySelector(".js-settings")?.addEventListener("click", settingsScreen);
  el.querySelector(".js-theme").addEventListener("click", themeScreen);
  el.querySelector(".js-stars").addEventListener("click", starsScreen);
  fillBalance(el);
  el.querySelectorAll(".dk[data-id]").forEach((b) => b.addEventListener("click", () => openTile(tiles[b.dataset.id])));
  el.querySelector(".js-switch").addEventListener("click", leave);
  const scr = {
    el,
    initial: () => el.querySelector(".dk"),
    back: () => setFocus(el.querySelector(".js-switch")),
    onShow: () => fillBalance(el),
    refresh(c) {
      d.prayer = c.prayer;
      el.querySelector(".cards").innerHTML = (hasPrayer ? prayerCard(c.prayer, 112) : "") + wordCard(d.word, hasPrayer ? 336 : 112);
      el.querySelector(".js-wx").innerHTML = weatherLine(c.weather);
    },
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
  setTheme(u.theme);
  const el = h(`<div class="kids bg-kids">${kidsBg()}${vineLayer(u.theme, [480, 610])}${confetti}
    <div class="mascot">${F.mascot(u.theme, 150)}</div>
    <div class="kgreet"><div class="h">${greet}</div><div class="s">ماذا نشاهد اليوم؟</div></div>
    <div class="kclock"><div class="tm js-tm"></div><div class="dt js-dt"></div><div class="wx js-wx">${weatherLine(d.weather)}</div></div>
    ${bday}<div class="kwords">${wordCard(d.word, 180, true)}</div>${textCard(d.text, true)}
    <div class="ktiles">${tiles}</div>
    <button class="kexit f">${exitTxt}</button>
    <div class="kbar"><button class="kstars f"><span class="emo">⭐</span> نجومي <b class="js-sb"></b></button><button class="ktheme f"><span class="emo">${F.themeOf(u.theme).emoji}</span> ثيمي</button></div>
    <div class="knote">${u.role === "little" ? "" : "فقط ما اختاره ماما وبابا"}</div></div>`);
  const byId = Object.fromEntries(d.tiles.map((t) => [String(t.id), t]));
  el.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => openTile(byId[b.dataset.id])));
  el.querySelector(".kexit").addEventListener("click", leave);
  el.querySelector(".ktheme").addEventListener("click", themeScreen);
  el.querySelector(".kstars").addEventListener("click", starsScreen);
  fillBalance(el);
  return {
    el,
    initial: () => el.querySelector(".kt"),
    back() {},
    onShow: () => fillBalance(el),
    refresh(c) { el.querySelector(".js-wx").innerHTML = weatherLine(c.weather); },
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
const vinfoUrl = (t, p) => `/api/tv/tile/${t.id}/vinfo?p=${encodeURIComponent(p)}`;
// فيديو الآيفون (HEVC) وغيره: يسأل السيرفر هل يُشغَّل كما هو أم يحتاج تحويلاً، وينتظر التحويل مع عرض التقدم
const PREP = `<div class="prep" hidden><div class="spin"></div><b>جارٍ تجهيز الفيديو للتلفاز…</b><span class="pp"></span>
  <small>فيديو الآيفون يُحوَّل مرة واحدة فقط، ثم يعمل فوراً في كل مرة</small></div>`;
async function videoSource(infoUrl, directUrl, alive, prep) {
  for (;;) {
    let r;
    try { r = await api(infoUrl); } catch { return directUrl; }
    if (!alive()) return undefined;
    if (r.mode === "direct") { prep.hidden = true; return directUrl; }
    if (r.mode === "ready") { prep.hidden = true; return r.url; }
    if (r.mode === "error") { prep.hidden = true; return null; }
    prep.hidden = false;
    prep.querySelector(".pp").textContent = r.position > 1 ? `في الانتظار: قبله ${r.position - 1}` : `${r.progress || 0}%`;
    await new Promise((res) => setTimeout(res, 2000));
    if (!alive()) return undefined;
  }
}

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
  const el = h(`<div class="player"><video autoplay playsinline></video>${PREP}
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
  let loadTok = 0;
  const load = async (i) => {
    idx = i;
    const tok = ++loadTok;
    v.removeAttribute("src"); v.load();
    el.querySelector(".tt").textContent = paths[i].split("/").pop().replace(/\.[^.]+$/, "");
    counter.textContent = paths.length > 1 ? `${i + 1} / ${paths.length}` : "";
    showOsd();
    const src = await videoSource(vinfoUrl(t, paths[i]), fileUrl(t, paths[i]), () => tok === loadTok && el.isConnected, el.querySelector(".prep"));
    if (src === undefined) return;
    if (!src) { toast("تعذر تجهيز هذا الفيديو للتلفاز"); setTimeout(next, 2500); return; }
    v.src = src;
    v.play().catch(() => {});
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
  const el = h(`<div class="player"><div class="pimg"></div><div class="pimg"></div><video playsinline style="display:none"></video>${PREP}
    <div class="counter"></div>
    <div class="osd hide"><div class="tt"></div><div class="keys"><span><b>← →</b>التالي/السابق</span><span><b>موافق</b>عرض شرائح</span><span><b>رجوع</b>خروج</span></div></div></div>`);
  const [l1, l2] = el.querySelectorAll(".pimg");
  const v = el.querySelector("video"), counter = el.querySelector(".counter"), osd = el.querySelector(".osd");
  let front = l1, timer = 0, hideT = 0, playing = slideshow, showTok = 0;
  const showOsd = (ms = 3000) => { osd.classList.remove("hide"); counter.style.opacity = 1; clearTimeout(hideT); hideT = setTimeout(() => { osd.classList.add("hide"); if (playing) counter.style.opacity = 0; }, ms); };
  const schedule = () => { clearTimeout(timer); if (playing && !items[idx].video) timer = setTimeout(() => go(1), 6500); };
  const show = (i) => {
    idx = (i + items.length) % items.length;
    const it = items[idx];
    counter.textContent = `${idx + 1} / ${items.length}`;
    el.querySelector(".tt").textContent = it.name || "";
    const tok = ++showTok;
    if (it.video) {
      l1.classList.remove("show"); l2.classList.remove("show");
      v.style.display = ""; v.removeAttribute("src"); v.load();
      clearTimeout(timer);
      (it.info ? videoSource(it.info, it.src, () => tok === showTok && el.isConnected, el.querySelector(".prep")) : Promise.resolve(it.src)).then((src) => {
        if (src === undefined) return;
        if (!src) { toast("تعذر تجهيز هذا الفيديو للتلفاز"); return; }
        v.src = src; v.play().catch(() => {});
      });
      return;
    }
    el.querySelector(".prep").hidden = true;
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
  const toView = () => items.map((x) => ({ src: `/api/tv/photo/${x.id}/view`, video: !!x.is_video, name: "", info: x.is_video ? `/api/tv/photo/${x.id}/vinfo` : null }));
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
    isGame: true,
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
// الأنواع: مواقيت الصلاة، صوري، نار، نص، أمطار، درب التبانة، وتنويع (يتبدّل كل 4 دقائق)
const SAVERS = [["prayer", "مواقيت الصلاة", "🕌"], ["photos", "صوري", "🖼️"], ["fire", "نار", "🔥"], ["text", "نص", "📜"],
  ["rain", "أمطار", "🌧️"], ["galaxy", "درب التبانة", "🌌"], ["mix", "تنويع", "🔀"]];
let lastAct = Date.now();
let saverEl = null, saverTimer = 0, saverStop = null;
function activity() { lastAct = Date.now(); }
function inNight() {
  const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(settings.night_off || "");
  if (!m) return false;
  const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
  const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4];
  return a <= b ? cur >= a && cur < b : cur >= a || cur < b;
}
const prayerOk = () => !!(clockData && clockData.prayer && clockData.prayer.times && clockData.prayer.times.length);
const SCLOCK = `<div class="sclock"><div class="tm js-tm"></div><div class="dt js-dt"></div></div>`;
const rnd = (a, b) => a + Math.random() * (b - a);

function showSaver(night, kind) {
  if (saverEl) hideSaver();
  saverEl = h(`<div class="saver"></div>`);
  stage.appendChild(saverEl);
  const el = saverEl;
  if (night) { el.classList.add("night"); el.innerHTML = SCLOCK; tick(); return; }
  kind = kind || settings.saver_kind || "prayer";
  if (kind === "mix") {
    const order = ["prayer", "galaxy", "fire", "text", "rain"].filter((k) => k !== "prayer" || prayerOk());
    let i = Math.floor(Math.random() * order.length);
    const run = () => {
      if (el !== saverEl) return;
      try { saverStop?.(); } catch { /* */ }
      el.innerHTML = ""; el.className = "saver";
      saverStop = startSaver(el, order[i++ % order.length]);
    };
    run();
    saverTimer = setInterval(run, 4 * 60000);
    return;
  }
  saverStop = startSaver(el, kind);
}
function startSaver(el, kind) {
  if (kind === "prayer" && !prayerOk()) kind = "galaxy";
  const fn = { prayer: svPrayer, photos: svPhotos, fire: svFire, text: svText, rain: svRain, galaxy: svGalaxy }[kind] || svPrayer;
  el.classList.add("sv-" + kind);
  const stop = fn(el);
  tick();
  // الساعة الصغيرة تتحرك قليلاً كل دقيقة حتى لا تحترق الشاشة
  const sc = el.querySelector(".sclock");
  const drift = sc ? setInterval(() => { sc.style.transform = `translate(${rnd(-40, 40)}px, ${rnd(-20, 20)}px)`; }, 60000) : 0;
  return () => { clearInterval(drift); stop?.(); };
}
function hideSaver() {
  clearInterval(saverTimer);
  try { saverStop?.(); } catch { /* */ }
  saverStop = null;
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

// حلقة رسم بعدد إطارات محدود (أخف على جهاز السيرفر)
function frameLoop(fn, fps = 30) {
  let id = 0, last = 0, stopped = false;
  const f = (t) => {
    if (stopped) return;
    id = requestAnimationFrame(f);
    if (last && t - last < 1000 / fps - 3) return;
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / fps;
    last = t;
    fn(dt, t / 1000);
  };
  id = requestAnimationFrame(f);
  return () => { stopped = true; cancelAnimationFrame(id); };
}
function svCanvas(el, cls) {
  const k = Math.max(1, Math.min(1.6, scale || 1));
  const c = document.createElement("canvas");
  c.className = "svc " + (cls || "");
  c.width = Math.round(1280 * k); c.height = Math.round(720 * k);
  el.appendChild(c);
  const ctx = c.getContext("2d");
  ctx.scale(k, k);
  return { c, ctx, k };
}
const starsHtml = (n, h0 = 720) => Array.from({ length: n }, () => `<i style="left:${rnd(0, 1280).toFixed(0)}px;top:${rnd(0, h0).toFixed(0)}px;--d:${rnd(2, 6).toFixed(1)}s;--s:${rnd(1, 3).toFixed(1)}px;animation-delay:-${rnd(0, 6).toFixed(1)}s"></i>`).join("");

// ---------------------------------------------------------------- 1) مواقيت الصلاة بكامل الشاشة
const MOSQUE = `<svg class="pr-mosque" viewBox="0 0 1280 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="#070b1f">
  <rect x="150" y="96" width="18" height="124"/><path d="M146 96h26l-13-34z"/><rect x="143" y="120" width="32" height="6"/>
  <rect x="1112" y="96" width="18" height="124"/><path d="M1108 96h26l-13-34z"/><rect x="1105" y="120" width="32" height="6"/>
  <rect x="300" y="40" width="30" height="180"/><path d="M294 40h42l-21-48z"/><rect x="288" y="78" width="54" height="9"/><rect x="288" y="128" width="54" height="9"/>
  <rect x="950" y="40" width="30" height="180"/><path d="M944 40h42l-21-48z"/><rect x="938" y="78" width="54" height="9"/><rect x="938" y="128" width="54" height="9"/>
  <path d="M520 132 C 520 52, 760 52, 760 132 Z"/><rect x="636" y="34" width="8" height="26"/><circle cx="640" cy="30" r="7"/>
  <path d="M400 160 C 400 110, 500 110, 500 160 Z"/><path d="M780 160 C 780 110, 880 110, 880 160 Z"/>
  <rect x="380" y="158" width="520" height="62"/><rect x="480" y="130" width="320" height="40"/><rect x="0" y="206" width="1280" height="14"/></g>
  <g fill="#fbbf24" opacity=".75">${[420, 450, 480, 520, 560, 600, 680, 720, 760, 800, 830, 860].map((x) => `<path d="M${x} 200v-18a7 7 0 0 1 14 0v18z"/>`).join("")}
  <path d="M628 150v-22a12 12 0 0 1 24 0v22z"/></g></svg>`;
const MOON = `<svg class="pr-moon" viewBox="0 0 100 120" aria-hidden="true"><path d="M60 8 A52 52 0 1 0 60 112 A40 52 0 1 1 60 8Z" fill="#fef3c7"/></svg>`;
function svPrayer(el) {
  const p = clockData.prayer;
  el.innerHTML = `<div class="pr-sky">${starsHtml(90, 520)}</div>${MOON}${MOSQUE}
    <div class="pr-wrap"><div class="pr-clock js-tm"></div><div class="pr-date"><span class="js-dt"></span>${fmtHijri ? ` · <span class="js-hj"></span>` : ""}</div>
      <div class="pr-next"></div>
      <div class="pr-row">${p.times.map((t) => `<div class="pr-p${t.key === "sunrise" ? " sr" : ""}" data-k="${t.key}" data-t="${t.time}" data-n="${esc(t.name)}"><b>${esc(t.name)}</b><span class="ltr">${t.time}</span></div>`).join("")}</div>
      ${p.city ? `<div class="pr-city">${esc(p.city)}</div>` : ""}</div>`;
  const wrap = el.querySelector(".pr-wrap");
  const mins = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const upd = () => {
    const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
    const cells = [...el.querySelectorAll(".pr-p")], cand = cells.filter((c) => c.dataset.k !== "sunrise");
    let nx = cand.find((c) => mins(c.dataset.t) > nowM), diff;
    if (nx) diff = mins(nx.dataset.t) - nowM; else { nx = cand[0]; diff = 1440 - nowM + mins(nx.dataset.t); }
    cells.forEach((c) => { c.classList.toggle("nx", c === nx); c.classList.toggle("past", mins(c.dataset.t) <= nowM && c !== nx); });
    const hh = Math.floor(diff / 60), mm = diff % 60;
    el.querySelector(".pr-next").innerHTML = `<span>${diff <= 1 ? `حان الآن وقت صلاة ${nx.dataset.n}` : `صلاة <b>${nx.dataset.n}</b> بعد ${hh ? `${hh} ساعة و ` : ""}${mm} دقيقة`}</span>`;
  };
  upd();
  const id = setInterval(upd, 15000);
  const shift = setInterval(() => { wrap.style.transform = `translate(${rnd(-14, 14)}px, ${rnd(-10, 10)}px)`; }, 60000);
  return () => { clearInterval(id); clearInterval(shift); };
}

// ---------------------------------------------------------------- 2) صوري (كما كانت)
function svPhotos(el) {
  el.innerHTML = `<div class="blurbg"></div><div class="ph"></div><div class="blurbg"></div><div class="ph"></div>${SCLOCK}`;
  let timer = 0, alive = true;
  (async () => {
    let ids = [];
    if (me) { try { ids = (await api("/api/tv/wallpaper")).ids; } catch { /* */ } }
    if (!alive) return;
    if (!ids.length) {
      el.classList.add("empty");
      const clock = el.querySelector(".sclock");
      timer = setInterval(() => { clock.style.right = `${40 + Math.random() * 700}px`; clock.style.bottom = `${40 + Math.random() * 480}px`; }, 20000);
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
    timer = setInterval(next, 12000);
  })();
  return () => { alive = false; clearInterval(timer); };
}

// ---------------------------------------------------------------- 3) نار (مدفأة): جزيئات لهب ناعمة فوق الحطب
const LOGS = `<svg class="fire-logs" viewBox="0 0 600 120" aria-hidden="true">
  <g transform="rotate(-8 300 80)"><rect x="90" y="62" width="420" height="40" rx="20" fill="#3b2314"/><ellipse cx="500" cy="82" rx="14" ry="20" fill="#7c4a26"/><ellipse cx="500" cy="82" rx="7" ry="11" fill="#a0673a"/></g>
  <g transform="rotate(9 300 80)"><rect x="80" y="70" width="430" height="38" rx="19" fill="#2c1a0e"/><ellipse cx="92" cy="89" rx="13" ry="19" fill="#6b3f20"/><ellipse cx="92" cy="89" rx="6" ry="10" fill="#94592f"/></g>
  <rect x="40" y="104" width="520" height="16" rx="8" fill="#1a0f08"/></svg>`;
function flameSprite(stops) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}
function svFire(el) {
  el.innerHTML = `<div class="fire-glow"></div>${LOGS}${SCLOCK}`;
  const { ctx } = svCanvas(el, "flames");
  el.querySelector(".fire-logs").before(el.querySelector(".flames"));
  const SPR = [
    flameSprite([[0, "rgba(255,236,160,.85)"], [0.3, "rgba(255,200,80,.55)"], [0.65, "rgba(255,140,30,.2)"], [1, "rgba(255,120,0,0)"]]),
    flameSprite([[0, "rgba(255,200,80,.85)"], [0.35, "rgba(255,130,20,.5)"], [1, "rgba(220,60,0,0)"]]),
    flameSprite([[0, "rgba(230,80,10,.6)"], [0.45, "rgba(170,30,5,.28)"], [1, "rgba(90,10,0,0)"]]),
  ];
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const parts = [], sparks = [];
  return frameLoop((dt, t) => {
    // لهب جديد من فوق الحطب، أكثف في الوسط
    for (let n = 0; n < 12; n++) {
      const off = gauss() * 190;
      parts.push({ x: 640 + off, y: rnd(590, 615), vx: -off * 0.25 + rnd(-15, 15), vy: rnd(-230, -130) * (1 - Math.abs(off) / 420), life: 0, max: rnd(0.7, 1.5), s: rnd(70, 120) });
    }
    if (sparks.length < 40 && Math.random() < 0.4) sparks.push({ x: 640 + gauss() * 150, y: rnd(560, 600), vx: rnd(-25, 25), vy: rnd(-110, -50), life: 0, max: rnd(1.6, 3.4), r: rnd(1.2, 2.6) });
    ctx.clearRect(0, 0, 1280, 720);
    ctx.globalCompositeOperation = "lighter";
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { parts.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(t * 3 + p.y * 0.02) * 22) * dt; p.y += p.vy * dt; p.vx *= 0.97;
      const size = p.s * (1 - k * 0.75), spr = SPR[k < 0.3 ? 0 : k < 0.65 ? 1 : 2];
      ctx.globalAlpha = Math.min(1, (1 - k) * 1.4) * 0.42;
      ctx.drawImage(spr, p.x - size / 2, p.y - size / 2, size, size * 1.25);
    }
    ctx.globalAlpha = 1;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += dt; p.x += (p.vx + Math.sin(p.life * 6 + p.max) * 18) * dt; p.y += p.vy * dt;
      if (p.life > p.max) { sparks.splice(i, 1); continue; }
      const a = 1 - p.life / p.max;
      ctx.fillStyle = `rgba(255,${(150 + 100 * a) | 0},60,${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }, 30);
}

// ---------------------------------------------------------------- 4) نص: آيات وأحاديث وحِكم تتبدّل، أو نص يختاره المدير
function svText(el) {
  const custom = (settings.saver_text || "").trim();
  el.innerHTML = `<div class="tx-bg"></div><div class="tx-orbs">${Array.from({ length: 14 }, () => `<i style="left:${rnd(0, 1200) | 0}px;top:${rnd(0, 680) | 0}px;--z:${rnd(40, 160) | 0}px;--d:${rnd(14, 30) | 0}s;animation-delay:-${rnd(0, 20) | 0}s"></i>`).join("")}</div>
    <div class="tx-box"></div>${SCLOCK}`;
  const box = el.querySelector(".tx-box");
  let alive = true, timer = 0, stopLoop = null;
  if (custom) {
    box.classList.add("bounce");
    box.innerHTML = `<div class="tx-custom">${esc(custom)}</div>`;
    let x = 200, y = 200, vx = 70, vy = 48, hue = 0;
    stopLoop = frameLoop((dt) => {
      const w = box.offsetWidth, hh = box.offsetHeight;
      x += vx * dt; y += vy * dt;
      if (x < 0 || x + w > 1280) { vx = -vx; x = Math.max(0, Math.min(1280 - w, x)); hue += 60; }
      if (y < 0 || y + hh > 640) { vy = -vy; y = Math.max(0, Math.min(640 - hh, y)); hue += 60; }
      box.style.transform = `translate(${x}px, ${y}px)`;
      box.style.filter = `hue-rotate(${hue % 360}deg)`;
    }, 30);
  } else {
    let list = [], i = 0;
    const show = () => {
      if (!alive || !list.length) return;
      const t = list[i++ % list.length];
      box.classList.remove("in");
      setTimeout(() => {
        if (!alive) return;
        box.className = `tx-box rot ${t.kind}`;
        box.innerHTML = `<div class="lbl">${TEXT_ICON[t.kind] || "✨"} ${esc(t.label)}</div><div class="tx">${textBody(t)}</div>${t.source ? `<div class="src">${esc(t.source)}</div>` : ""}`;
        box.style.transform = `translate(${rnd(-110, 110) | 0}px, ${rnd(-60, 50) | 0}px)`;
        box.classList.add("in");
      }, 1200);
    };
    api("/api/tv/saver").then((d) => { list = d.texts || []; show(); timer = setInterval(show, 20000); }).catch(() => {
      box.className = "tx-box rot in"; box.innerHTML = `<div class="tx">HOME ANAB</div>`;
    });
  }
  return () => { alive = false; clearInterval(timer); stopLoop?.(); };
}

// ---------------------------------------------------------------- 5) أمطار فوق المدينة ليلاً
function skyline(seed, color, hmin, hmax, lit) {
  let x = 0, s = "", w = "";
  let r = seed;
  const R = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  while (x < 1280) {
    const bw = 40 + R() * 70, bh = hmin + R() * (hmax - hmin);
    s += `<rect x="${x.toFixed(0)}" y="${(720 - bh).toFixed(0)}" width="${(bw + 1).toFixed(0)}" height="${bh.toFixed(0)}"/>`;
    if (lit) for (let wy = 720 - bh + 12; wy < 700; wy += 18) for (let wx = x + 8; wx < x + bw - 10; wx += 14) if (R() < 0.16) w += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="6" height="8"/>`;
    x += bw;
  }
  return `<svg class="rn-city" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true"><g fill="${color}">${s}</g><g fill="#fcd34d" opacity=".55">${w}</g></svg>`;
}
function svRain(el) {
  el.innerHTML = `<div class="rn-sky"></div>${skyline(7, "#1e293b", 120, 300, false)}${skyline(31, "#0f172a", 60, 220, true)}<div class="rn-flash"></div>${SCLOCK}`;
  const { ctx } = svCanvas(el, "rain");
  const drops = [], ripples = [], wind = -0.18;
  const mk = (top) => {
    const z = Math.random(), sp = 520 + z * 700;
    return { x: rnd(-60, 1340), y: top ? rnd(-720, 0) : -40, len: 10 + z * 26, sp, z, ground: 650 + z * 60 };
  };
  for (let i = 0; i < 320; i++) drops.push(mk(true));
  const flash = el.querySelector(".rn-flash");
  let nextFlash = rnd(20, 50), tt = 0;
  const stop = frameLoop((dt) => {
    tt += dt;
    if (tt > nextFlash) { tt = 0; nextFlash = rnd(25, 70); flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go"); }
    ctx.clearRect(0, 0, 1280, 720);
    ctx.lineCap = "round";
    for (const d of drops) {
      d.y += d.sp * dt; d.x += d.sp * wind * dt;
      if (d.y > d.ground) {
        if (d.z > 0.45 && ripples.length < 90) ripples.push({ x: d.x, y: d.y, r: 1, max: 6 + d.z * 12, a: 0.5 });
        Object.assign(d, mk(false));
        continue;
      }
      ctx.strokeStyle = `rgba(186,206,235,${0.18 + d.z * 0.42})`;
      ctx.lineWidth = 0.6 + d.z * 1.3;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * wind, d.y - d.len); ctx.stroke();
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const p = ripples[i];
      p.r += 26 * dt; p.a -= 0.9 * dt;
      if (p.a <= 0 || p.r > p.max) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(186,206,235,${p.a})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.3, 0, 0, 7); ctx.stroke();
    }
  }, 30);
  return stop;
}

// ---------------------------------------------------------------- 6) درب التبانة
function galaxyImage(D) {
  const c = document.createElement("canvas");
  c.width = c.height = D;
  const g = c.getContext("2d"), m = D / 2;
  g.fillStyle = "#02030b"; g.fillRect(0, 0, D, D);
  g.translate(m, m); g.rotate(-0.55); g.translate(-m, -m);
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 1100; i++) {
    const t = Math.random() * 2 - 1, x = m + t * D * 0.55, y = m + gauss() * D * 0.07 * (1.15 - Math.abs(t) * 0.4);
    const core = Math.max(0, 1 - Math.abs(t + 0.1) * 2.2), r = rnd(18, 80) * (D / 1500);
    const col = core > 0.3 ? `255,${(190 + 40 * Math.random()) | 0},${(140 + 50 * Math.random()) | 0}` : Math.random() < 0.5 ? "150,170,255" : "190,150,255";
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${(0.035 + core * 0.05).toFixed(3)})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalCompositeOperation = "source-over";
  for (let i = 0; i < 260; i++) {
    const t = Math.random() * 2 - 1, x = m + t * D * 0.5, y = m + gauss() * D * 0.022 + Math.sin(t * 5) * D * 0.012, r = rnd(8, 26) * (D / 1500);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(2,3,11,.15)"); gr.addColorStop(1, "rgba(2,3,11,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalCompositeOperation = "lighter";
  const k = D / 1500;
  for (let i = 0; i < 4200; i++) {
    const near = Math.random() < 0.55, x = near ? m + (Math.random() * 2 - 1) * D * 0.55 : Math.random() * D, y = near ? m + gauss() * D * 0.11 : Math.random() * D;
    const r = (Math.random() < 0.96 ? rnd(0.3, 0.9) : rnd(1, 1.7)) * k, tint = Math.random();
    g.fillStyle = `rgba(${tint < 0.2 ? "255,214,170" : tint < 0.4 ? "180,200,255" : "255,255,255"},${rnd(0.35, 1).toFixed(2)})`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * D, y = Math.random() * D, r = rnd(5, 11) * k;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(0.2, "rgba(200,220,255,.4)"); gr.addColorStop(1, "rgba(200,220,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  return c;
}
const HILLS = `<svg class="gx-hills" viewBox="0 0 1280 200" preserveAspectRatio="none" aria-hidden="true"><g fill="#010207">
  <path d="M0 120 C 180 60, 320 70, 470 110 C 620 150, 760 80, 940 70 C 1080 62, 1180 96, 1280 90 V200 H0Z"/>
  ${[[150, 92], [190, 84], [230, 90], [1010, 74], [1045, 66], [1085, 76]].map(([x, y]) => `<path d="M${x} ${y - 46}l15 46h-30z"/><path d="M${x} ${y - 30}l19 42h-38z"/><rect x="${x - 2}" y="${y + 8}" width="4" height="10"/>`).join("")}</g></svg>`;
function svGalaxy(el) {
  const k = Math.max(1, Math.min(1.6, scale || 1)), D = Math.ceil(1470 * k);
  const bg = galaxyImage(D);
  bg.className = "gx-bg";
  bg.style.width = bg.style.height = "1470px";
  el.appendChild(bg);
  el.insertAdjacentHTML("beforeend", `${HILLS}${SCLOCK}`);
  const { ctx } = svCanvas(el, "gx-fx");
  const tw = Array.from({ length: 140 }, () => ({ x: rnd(0, 1280), y: rnd(0, 600), r: rnd(0.6, 1.6), ph: rnd(0, 6.3), f: rnd(0.6, 2) }));
  let meteor = null, nextM = rnd(5, 14), tt = 0;
  return frameLoop((dt, t) => {
    ctx.clearRect(0, 0, 1280, 720);
    for (const s of tw) {
      const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.f + s.ph));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    }
    tt += dt;
    if (!meteor && tt > nextM) { tt = 0; nextM = rnd(8, 20); meteor = { x: rnd(200, 1200), y: rnd(20, 260), vx: rnd(-700, -480), vy: rnd(160, 300), life: 0 }; }
    if (meteor) {
      const p = meteor;
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const a = Math.max(0, 1 - p.life / 0.9);
      const gr = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 0.18, p.y - p.vy * 0.18);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = gr; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.18, p.y - p.vy * 0.18); ctx.stroke();
      if (p.life > 0.9) meteor = null;
    }
  }, 20);
}

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
let clockData = null;
async function loadClock(refresh = true) {
  try {
    clockData = await api("/api/tv/clock");
    if (refresh) stack.forEach((s) => s.refresh?.(clockData));
  } catch { /* */ }
}
setInterval(loadClock, 30 * 60000);
setTimeout(() => loadClock(false), 3000);

// ============================================================== الأذان
const adhanDone = {};
const hmShift = (hm, m) => { const [a, b] = hm.split(":").map(Number); const t = (a * 60 + b + m + 1440) % 1440; return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
function localDay(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function chime(seconds = 7) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 659.25, 523.25, 392];
    for (let i = 0; i < seconds; i++) {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 1.1;
      o.type = "sine"; o.frequency.value = notes[i % notes.length];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 1.7);
    }
    setTimeout(() => ac.close(), seconds * 1100 + 2000);
  } catch { /* */ }
}
function playingMedia() {
  const out = [];
  const scan = (doc) => { try { doc.querySelectorAll("video, audio").forEach((m) => { if (!m.paused && !m.ended) out.push(m); }); doc.querySelectorAll("iframe").forEach((f) => { try { scan(f.contentDocument); } catch { /* */ } }); } catch { /* */ } };
  scan(document);
  return out;
}
function playAdhan(t, c) {
  const a = c.adhan;
  const paused = a.pause ? playingMedia() : [];
  paused.forEach((m) => m.pause());
  const ov = h(`<div class="adhan-ov"><div class="adhan-card"><div class="emo mosque">🕌</div><h2>حان الآن وقت صلاة ${esc(t.name)}</h2>
    <p>${esc(c.prayer.city || "")} · <span class="ltr">${esc(t.time)}</span></p><small>اضغط أي زر لإيقاف الأذان</small></div></div>`);
  stage.appendChild(ov);
  let au = null, done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.removeEventListener("keydown", stopKey, true);
    au?.pause();
    ov.classList.add("out"); setTimeout(() => ov.remove(), 600);
    setTimeout(() => paused.forEach((m) => m.play().catch(() => {})), 1200);
  };
  const stopKey = (e) => { e.stopPropagation(); e.preventDefault(); finish(); };
  document.addEventListener("keydown", stopKey, true);
  const src = t.key === "fajr" && a.files.fajr ? "/api/tv/adhan/fajr" : a.files.main ? "/api/tv/adhan/main" : null;
  if (src) {
    au = new Audio(src); au.volume = Math.max(0.1, Math.min(1, (a.volume || 80) / 100));
    au.onended = () => setTimeout(finish, 4000);
    au.onerror = () => { chime(); setTimeout(finish, 12000); };
    au.play().catch(() => { chime(); setTimeout(finish, 12000); });
  } else { chime(); setTimeout(finish, 15000); }
  setTimeout(finish, 6 * 60000);
}
function adhanTick() {
  const c = clockData;
  if (!c || !c.adhan || !c.adhan.on || !c.prayer || !c.prayer.times) return;
  const now = new Date(), day = localDay(now);
  if (c.prayer.date && c.prayer.date !== day) { loadClock(); return; }
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  for (const t of c.prayer.times) {
    if (t.key === "sunrise" || !(c.adhan.prayers || []).includes(t.key)) continue;
    const k = day + t.key;
    if (t.time === hm && !adhanDone[k]) { adhanDone[k] = 1; playAdhan(t, c); }
    if (c.adhan.remind && hmShift(t.time, -c.adhan.remind) === hm && !adhanDone[k + "r"]) {
      adhanDone[k + "r"] = 1; chime(2); toast(`🕌 بعد ${c.adhan.remind} دقيقة: صلاة ${t.name}`, 10000);
    }
  }
}
setInterval(adhanTick, 15000);

// ============================================================== يد التحكم (بلايستيشن وغيرها)
// ✕ موافق، ○ رجوع، الأسهم أو العصا للتنقل، L1/R1 السابق/التالي، L2/R2 الصوت، Options تشغيل/إيقاف، PS الرئيسية.
const padPrefs = { swap: false, rumble: true };
try { Object.assign(padPrefs, JSON.parse(localStorage.getItem("tvpad") || "{}")); } catch { /* */ }
const savePad = () => { try { localStorage.setItem("tvpad", JSON.stringify(padPrefs)); } catch { /* */ } };
let padPrev = {}, padRep = {}, padState = {}, padName = "";
const padKey = (key) => document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
function rumble(gp, ms = 40) {
  if (!padPrefs.rumble) return;
  try { gp.vibrationActuator && gp.vibrationActuator.playEffect("dual-rumble", { duration: ms, strongMagnitude: 0.4, weakMagnitude: 0.6 }); } catch { /* */ }
}
function padFire(name, gp) {
  const t = top();
  if (t && t.isGame) { if (name === "ps") padKey("Escape"); return; }  // داخل اللعبة: اليد للعبة، وزر PS للخروج
  const okB = padPrefs.swap ? "circle" : "cross", backB = padPrefs.swap ? "cross" : "circle";
  const map = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", options: "MediaPlayPause",
    l1: "MediaTrackPrevious", r1: "MediaTrackNext", l2: "AudioVolumeDown", r2: "AudioVolumeUp", ps: "Home",
    triangle: "ContextMenu", square: "F2" };
  map[okB] = "Enter"; map[backB] = "Escape";
  if (name === okB) rumble(gp);
  if (map[name]) padKey(map[name]);
}
function pollPads() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const now = performance.now();
  for (const gp of pads) {
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const st = { up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6,
      cross: b(0), circle: b(1), square: b(2), triangle: b(3), l1: b(4), r1: b(5), l2: b(6), r2: b(7),
      create: b(8), options: b(9), ps: b(16) };
    const prev = padPrev[gp.index] || {};
    for (const [name, on] of Object.entries(st)) {
      const k = gp.index + name;
      if (on && !prev[name]) { padRep[k] = now + 420; activity(); padFire(name, gp); }
      else if (on && ["up", "down", "left", "right"].includes(name) && now > (padRep[k] || 0)) { padRep[k] = now + 140; padFire(name, gp); }
    }
    padPrev[gp.index] = st;
    padState = st; padName = gp.id;
  }
  requestAnimationFrame(pollPads);
}
addEventListener("gamepadconnected", (e) => { toast(`🎮 ${e.gamepad.id.replace(/\(.*\)/, "").trim() || "يد تحكم"}`, 2000); rumble(e.gamepad, 120); });
requestAnimationFrame(pollPads);

// ============================================================== لوحة مفاتيح على الشاشة
function oskScreen(opt, done) {
  let val = opt.value || "", shift = false, sym = false, show = !opt.password;
  const LET = ["1234567890", "qwertyuiop", "asdfghjkl@", "zxcvbnm-_."];
  const SYM = ["1234567890", "!#$%&*()+=", "/\\:;?,'[]{", "<>|~^`€£§}"];
  const el = h(`<div class="bg-dark osk"><div class="bhead"><button class="back f js-back">${A.CHEVRON}<span>رجوع</span></button><h1>${esc(opt.title)}</h1></div>
    <div class="osk-in ltr"><span class="v"></span><i class="caret"></i></div><div class="osk-keys ltr"></div>
    ${hints([["موافق", "اختيار الحرف"], ["△", "حذف"], ["رجوع", "إلغاء"]])}</div>`);
  const draw = () => {
    el.querySelector(".v").textContent = show ? val : "•".repeat(val.length);
    const rows = (sym ? SYM : LET).map((r) => `<div class="osk-row">${[...r].map((c) => {
      const ch = shift && !sym ? c.toUpperCase() : c;
      return `<button class="key f" data-c="${esc(ch)}">${esc(ch)}</button>`;
    }).join("")}</div>`).join("");
    const keep = cur && cur.dataset ? (cur.dataset.c ? `[data-c="${CSS.escape(cur.dataset.c)}"]` : cur.dataset.a ? `[data-a="${cur.dataset.a}"]` : null) : null;
    el.querySelector(".osk-keys").innerHTML = rows + `<div class="osk-row">
      <button class="key wide f ${shift ? "on" : ""}" data-a="shift">⇧</button><button class="key wide f" data-a="sym">${sym ? "abc" : "#+="}</button>
      <button class="key space f" data-a="space">مسافة</button><button class="key wide f" data-a="del">⌫</button>
      ${opt.password ? `<button class="key wide f" data-a="eye">${show ? "إخفاء" : "إظهار"}</button>` : ""}
      <button class="key ok wide f" data-a="ok">${esc(opt.okLabel || "تم")}</button></div>`;
    el.querySelectorAll(".osk-keys [data-c]").forEach((b) => b.addEventListener("click", () => { val += b.dataset.c; if (shift) shift = false; draw(); }));
    el.querySelectorAll(".osk-keys [data-a]").forEach((b) => b.addEventListener("click", () => act(b.dataset.a)));
    if (keep) { const n = el.querySelector(keep); if (n) setFocus(n, false); }
  };
  const act = (a) => {
    if (a === "shift") shift = !shift;
    else if (a === "sym") sym = !sym;
    else if (a === "space") val += " ";
    else if (a === "del") val = val.slice(0, -1);
    else if (a === "eye") show = !show;
    else if (a === "ok") { pop(); done(val); return; }
    draw();
  };
  el.querySelector(".js-back").addEventListener("click", pop);
  draw();
  push({
    el, typing: true,
    initial: () => el.querySelector('[data-c="q"]') || el.querySelector(".key"),
    key(e) {
      if (e.key.length === 1 && e.key !== " " && !e.ctrlKey) { val += e.key; draw(); return true; }
      if (e.key === "Backspace" || e.key === "ContextMenu") { act("del"); return true; }
      if (e.key === "F2") { act("space"); return true; }
      return false;
    },
  });
}

// ============================================================== إعدادات التلفاز (للمدير فقط)
function settingsScreen() {
  const items = [["wifi", "الوايفاي", "الاتصال بشبكة لاسلكية", "#06b6d4,#2563eb"], ["bt", "البلوتوث", "يد بلايستيشن وأجهزة أخرى", "#8b5cf6,#06b6d4"],
    ["pad", "يد التحكم", "الأزرار والاهتزاز وتجربتها", "#a855f7,#ec4899"], ["audio", "الصوت", "مخرج الصوت وتجربته", "#f59e0b,#ea580c"],
    ["saver", "شاشة التوقف", "مواقيت، نار، أمطار، نجوم…", "#0ea5e9,#6366f1"]];
  const el = h(`<div class="bg-dark"><div class="bhead"><button class="back f js-back">${A.CHEVRON}<span>الرئيسية</span></button>
    <div class="ti" style="background:linear-gradient(135deg,#64748b,#1e293b)">${GEAR}</div><h1>الإعدادات</h1></div>
    <div class="set-grid">${items.map(([k, t, s, c]) => `<button class="set-card f" data-k="${k}"><div class="ic" style="background:${A.gradient(c)}">${SET_ICON[k]}</div>
      <b>${t}</b><span>${s}</span></button>`).join("")}</div>
    ${hints([["موافق", "فتح"], ["رجوع", "الرئيسية"]])}</div>`);
  el.querySelector(".js-back").addEventListener("click", pop);
  el.querySelectorAll(".set-card").forEach((b) => b.addEventListener("click", () => ({ wifi: wifiScreen, bt: btScreen, pad: padScreen, audio: soundSetScreen, saver: saverSetScreen })[b.dataset.k]()));
  push({ el, initial: () => el.querySelector(".set-card") });
}
const GEAR = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;
const SET_ICON = {
  saver: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 3v3M15.5 4.5h3M20.5 8.5v2M19.5 9.5h2"/></svg>`,
  wifi: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2" fill="#fff"/></svg>`,
  bt: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10-5 5V2l5 5L7 17"/></svg>`,
  pad: A.icon("games"),
  audio: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>`,
};

// اختيار شاشة التوقف من التلفاز: تظهر فوراً للتجربة
function saverSetScreen() {
  const el = subScreen("شاشة التوقف", "saver"), body = el.querySelector(".set-body");
  const draw = () => {
    const cur = settings.saver_kind || "prayer";
    body.innerHTML = `<p class="set-msg">اختر شاشة، وستظهر لك فوراً للتجربة. اضغط أي زر للرجوع.</p>
      <div class="sv-grid">${SAVERS.map(([k, n, ic]) => `<button class="sv-card f${k === cur ? " on" : ""}" data-k="${k}"><span class="emo">${ic}</span><b>${n}</b>${k === cur ? "<i>✓ المختارة</i>" : ""}</button>`).join("")}</div>
      <p class="set-msg">تظهر بعد ${+settings.saver_min || 0} دقيقة بلا استعمال (تغيّر المدة من لوحة تحكم السيرفر ← وضع التلفاز).</p>`;
    body.querySelectorAll(".sv-card").forEach((b) => b.addEventListener("click", async () => {
      const k = b.dataset.k;
      try { await api("/api/tv/admin/saver", { json: { kind: k } }); } catch (e) { toast(e.message); return; }
      settings.saver_kind = k;
      draw();
      setFocus(body.querySelector(`.sv-card[data-k="${k}"]`));
      showSaver(false, k);
    }));
  };
  draw();
  push({ el, initial: () => el.querySelector(".sv-card.on") || el.querySelector(".sv-card") });
}

function subScreen(title, iconKey) {
  const el = h(`<div class="bg-dark"><div class="bhead"><button class="back f js-back">${A.CHEVRON}<span>الإعدادات</span></button>
    <div class="ti" style="background:linear-gradient(135deg,#06b6d4,#2563eb)">${SET_ICON[iconKey]}</div><h1>${title}</h1></div>
    <div class="set-body"></div>${hints([["موافق", "اختيار"], ["رجوع", "الإعدادات"]])}</div>`);
  el.querySelector(".js-back").addEventListener("click", pop);
  return el;
}

async function wifiScreen() {
  const el = subScreen("الوايفاي", "wifi"), body = el.querySelector(".set-body");
  const scr = { el };
  push(scr);
  const draw = async (nets) => {
    let d;
    try { d = await api("/api/tv/admin/net"); } catch (e) { body.innerHTML = `<p class="set-msg">${esc(e.message)}</p>`; return; }
    if (!d.available) { body.innerHTML = `<p class="set-msg">متاح على جهاز HOME ANAB المخصص فقط.</p>`; return; }
    const w = d.net.wifi || {};
    let html = `<div class="set-status"><div>الكابل: <b class="ltr">${esc(d.net.ip || "غير موصول")}</b></div>
      <div>الوايفاي: ${w.ssid ? `<b>${esc(w.ssid)}</b> ${w.ip ? `<b class="ltr">${esc(w.ip)}</b>` : "<span class='bad'>بلا عنوان</span>"}` : "غير متصل"}</div></div>`;
    if (!w.iface) html += `<p class="set-msg">لا توجد بطاقة وايفاي في هذا الجهاز.</p>`;
    else if (!w.installed) html += `<button class="btn gold f" data-a="install">تثبيت الوايفاي (يحتاج الكابل والإنترنت)</button>`;
    else {
      html += `<div class="set-row"><button class="btn gold f" data-a="scan">البحث عن الشبكات</button>${w.ssid ? `<button class="btn f" data-a="forget">نسيان «${esc(w.ssid)}»</button>` : ""}</div>`;
      if (nets) html += nets.length ? `<div class="set-list">${nets.map((n, i) => `<button class="set-item f" data-n="${i}"><span class="ltr">${n.signal > -55 ? "▂▄▆█" : n.signal > -70 ? "▂▄▆" : "▂▄"}</span><b>${esc(n.ssid)}</b></button>`).join("")}</div>`
        : `<p class="set-msg">لم تُعثر على شبكات.</p>`;
    }
    body.innerHTML = html;
    body.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => act(b.dataset.a)));
    body.querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => {
      const n = nets[+b.dataset.n];
      oskScreen({ title: `كلمة مرور «${n.ssid}»`, password: true, okLabel: "اتصال" }, async (pw) => {
        toast("جارٍ الاتصال…", 4000);
        try { const r = await api("/api/tv/admin/wifi/connect", { json: { ssid: n.ssid, password: pw } }); toast(`تم الاتصال ✓ ${r.net && r.net.wifi && r.net.wifi.ip ? r.net.wifi.ip : ""}`, 5000); draw(); }
        catch (e) { toast(`لم ينجح الاتصال: ${e.message}`, 6000); }
      });
    }));
    setFocus(body.querySelector("[data-n]") || body.querySelector(".f") || el.querySelector(".js-back"));
  };
  const act = async (a) => {
    try {
      if (a === "scan") { toast("جارٍ البحث…", 3000); const r = await api("/api/tv/admin/wifi/scan", { json: {} }); return draw(r.networks); }
      if (a === "forget") { await api("/api/tv/admin/wifi/forget", { json: {} }); toast("تم"); }
      if (a === "install") { toast("جارٍ التثبيت… قد يستغرق دقائق", 6000); await api("/api/tv/admin/wifi/install", { json: {} }); toast("تم. أعد تشغيل الجهاز إن لم تظهر البطاقة", 6000); }
    } catch (e) { toast(e.message, 5000); }
    draw();
  };
  draw();
}

async function btScreen() {
  const el = subScreen("البلوتوث", "bt"), body = el.querySelector(".set-body");
  push({ el });
  const draw = (r) => {
    if (!r.available) { body.innerHTML = `<p class="set-msg">متاح على جهاز HOME ANAB المخصص فقط.</p>`; return; }
    let html = "";
    if (!r.installed) html = `<button class="btn gold f" data-a="install">تثبيت البلوتوث (يحتاج الإنترنت)</button>`;
    else if (!r.adapter) html = `<p class="set-msg">لا يوجد بلوتوث في هذا الجهاز. يمكنك وصل قطعة بلوتوث USB صغيرة.</p>`;
    else {
      html = `<p class="set-msg">يد بلايستيشن 5: اضغط معاً <b>Create</b> و <b>PS</b> حتى يومض الضوء بسرعة، ثم «البحث».</p>
        <div class="set-row"><button class="btn gold f" data-a="scan">البحث عن أجهزة</button></div>
        <div class="set-list">${r.devices.map((d) => `<div class="set-item"><span>${d.icon === "input-gaming" ? "🎮" : "🔵"}</span><b>${esc(d.name)}</b>
          ${d.connected ? `<span class="ok">متصل</span>` : d.paired ? `<span>مقترن</span>` : ""}
          ${!d.connected ? `<button class="btn f" data-p="pair" data-m="${d.mac}">${d.paired ? "اتصال" : "ربط"}</button>` : ""}
          ${d.paired ? `<button class="btn f" data-p="remove" data-m="${d.mac}">إزالة</button>` : ""}</div>`).join("") || `<p class="set-msg">لا توجد أجهزة بعد.</p>`}</div>`;
    }
    body.innerHTML = html;
    body.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => act(b.dataset.a)));
    body.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => act(b.dataset.p, b.dataset.m)));
    setFocus(body.querySelector(".f") || el.querySelector(".js-back"));
  };
  const act = async (a, mac) => {
    toast({ install: "جارٍ التثبيت…", scan: "جارٍ البحث 15 ثانية…", pair: "جارٍ الربط…", remove: "جارٍ الإزالة…" }[a], 5000);
    try { draw(await api(`/api/tv/admin/bt/${a}`, { json: { mac } })); if (a === "pair") toast("تم الربط ✓"); }
    catch (e) { toast(e.message, 5000); }
  };
  try { draw(await api("/api/tv/admin/bt")); } catch (e) { body.innerHTML = `<p class="set-msg">${esc(e.message)}</p>`; }
}

async function soundSetScreen() {
  const el = subScreen("الصوت", "audio"), body = el.querySelector(".set-body");
  push({ el });
  const draw = async () => {
    let r;
    try { r = await api("/api/tv/admin/audio"); } catch (e) { body.innerHTML = `<p class="set-msg">${esc(e.message)}</p>`; return; }
    if (r.error) { body.innerHTML = `<p class="set-msg">تعذرت قراءة مخارج الصوت: <span class="ltr">${esc(r.error)}</span></p>`; return; }
    const cur = r.outputs.find((o) => o.active);
    body.innerHTML = `<div class="set-status"><div>المخرج الحالي: <b>${esc(cur ? cur.name : "—")}</b></div>
        <div>المستوى: <b class="ltr">${r.volume ?? "—"}%</b>${r.muted ? " <span class='bad'>صامت</span>" : ""} · الاختيار: <b>${r.auto ? "تلقائي" : "يدوي"}</b></div></div>
      <div class="set-row"><button class="btn gold f" data-a="test">🔔 تجربة الصوت</button><button class="btn f" data-a="auto">${r.auto ? "✓ " : ""}تلقائي (HDMI التلفاز)</button></div>
      <div class="set-list">${r.outputs.map((o, i) => `<button class="set-item f" data-o="${i}"><span>${o.active ? "🔊" : "🔈"}</span><b>${esc(o.name)}</b>${o.plugged ? `<span class="ok">موصول</span>` : ""}</button>`).join("")}</div>
      <p class="set-msg">إن لم تسمع صوتاً: اختر المخرج الذي فيه <b class="ltr">HDMI</b> وعليه «موصول»، ثم «تجربة الصوت». وتأكد أن صوت التلفاز نفسه ليس صامتاً.</p>`;
    body.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => act({ action: b.dataset.a })));
    body.querySelectorAll("[data-o]").forEach((b) => b.addEventListener("click", () => { const o = r.outputs[+b.dataset.o]; act({ card: o.card, profile: o.profile }); }));
    setFocus(body.querySelector(".f") || el.querySelector(".js-back"));
  };
  const act = async (d) => {
    try {
      await api("/api/tv/admin/audio", { json: d });
      toast(d.action === "test" ? "يجب أن تسمع ثلاث نغمات 🎵" : "تم ✓ جرّب الصوت", 4000);
    } catch (e) { toast(e.message, 5000); }
    if (d.action !== "test") draw();
  };
  draw();
}

function padScreen() {
  const el = subScreen("يد التحكم", "pad"), body = el.querySelector(".set-body");
  const BTN = [["cross", "✕"], ["circle", "○"], ["square", "□"], ["triangle", "△"], ["up", "↑"], ["down", "↓"], ["left", "←"], ["right", "→"],
    ["l1", "L1"], ["r1", "R1"], ["l2", "L2"], ["r2", "R2"], ["options", "Options"], ["create", "Create"], ["ps", "PS"]];
  body.innerHTML = `<div class="set-status"><div>اليد: <b class="ltr js-pn">اضغط أي زر في اليد…</b></div></div>
    <div class="pad-test ltr">${BTN.map(([k, t]) => `<span data-b="${k}">${t}</span>`).join("")}</div>
    <div class="set-row"><button class="btn f js-swap"></button><button class="btn f js-rum"></button></div>
    <p class="set-msg">✕ موافق · ○ رجوع · الأسهم أو العصا للتنقل · L1/R1 السابق/التالي · L2/R2 الصوت · Options تشغيل/إيقاف · PS الرئيسية (وفي الألعاب: الخروج)</p>`;
  const lab = () => {
    el.querySelector(".js-swap").textContent = padPrefs.swap ? "الموافقة بزر ○ (اضغط للتبديل)" : "الموافقة بزر ✕ (اضغط للتبديل)";
    el.querySelector(".js-rum").textContent = padPrefs.rumble ? "الاهتزاز: يعمل" : "الاهتزاز: متوقف";
  };
  el.querySelector(".js-swap").addEventListener("click", () => { padPrefs.swap = !padPrefs.swap; savePad(); lab(); });
  el.querySelector(".js-rum").addEventListener("click", () => { padPrefs.rumble = !padPrefs.rumble; savePad(); lab(); });
  lab();
  let raf = 0;
  const live = () => {
    el.querySelectorAll("[data-b]").forEach((s) => s.classList.toggle("on", !!padState[s.dataset.b]));
    if (padName) el.querySelector(".js-pn").textContent = padName;
    raf = requestAnimationFrame(live);
  };
  live();
  push({ el, initial: () => el.querySelector(".js-swap"), destroy() { cancelAnimationFrame(raf); } });
}

// ============================================================== البدء
if (TV.preview) {
  const b = h(`<div class="badge-preview">معاينة من الكمبيوتر: الأسهم للتنقل، Enter للاختيار، Esc للرجوع</div>`);
  stage.appendChild(b);
  setTimeout(() => { b.style.opacity = 0; }, 7000);
}
whoScreen(true);
