// مهنة اليوم — الأجزاء المشتركة: قائمة المهن، والحفظ، وفتح مهنة كل يوم، والنوافذ فوق اللعب.
(() => {
  "use strict";
  const Jobs = (window.Jobs = {});

  // الأجهزة الضعيفة: رسم أخف و30 إطاراً في الثانية
  Jobs.LITE = (() => {
    try { if (parent !== window && parent.document.documentElement.classList.contains("lite")) return true; } catch {}
    return (navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2;
  })();
  Jobs.TEST = /[?&]all\b/.test(location.search);   // للتجربة: كل المهن مفتوحة ووردية قصيرة

  // المهن بترتيب فتحها: مهنة جديدة كل يوم
  Jobs.list = [
    { id: "driver", name: "السائق", emo: "🚕", who: "🚖", color: "#f59e0b", tools: "🚕 🗺️ ⛽ 💰", goal: "وصّل الركاب إلى أماكنهم" },
    { id: "chef", name: "الطباخ", emo: "🍳", who: "👨‍🍳", color: "#ef4444", tools: "🍳 🔥 🍔 🧾", goal: "حضّر طلبات الزبائن بسرعة" },
    { id: "pilot", name: "الطيار", emo: "✈️", who: "👩‍✈️", color: "#0ea5e9", tools: "✈️ 🕒 🧭 🛫", goal: "أقلع بكل رحلة في موعدها" },
    { id: "teacher", name: "المعلم", emo: "🏫", who: "👩‍🏫", color: "#8b5cf6", tools: "📚 ✏️ 🔔 🧮", goal: "أدِر الصف وساعد الطلاب" },
    { id: "fire", name: "الإطفائي", emo: "🚒", who: "🧑‍🚒", color: "#dc2626", tools: "🚒 🧯 💧 🪜", goal: "أطفئ الحرائق وأنقذ الناس" },
    { id: "doctor", name: "الطبيب", emo: "🩺", who: "👨‍⚕️", color: "#14b8a6", tools: "🩺 🌡️ 💊 🩹", goal: "افحص المرضى وعالجهم" },
    { id: "mail", name: "ساعي البريد", emo: "📮", who: "🧑‍💼", color: "#e11d48", tools: "📮 ✉️ 📦 🗺️", goal: "وزّع الرسائل والطرود" },
    { id: "police", name: "المحقق", emo: "🔎", who: "🕵️", color: "#1d4ed8", tools: "🔎 📋 👣 🗂️", goal: "اجمع الأدلة واكشف الفاعل" },
    { id: "mechanic", name: "الميكانيكي", emo: "🔧", who: "🧑‍🔧", color: "#64748b", tools: "🔧 🔩 🛞 🔋", goal: "اكتشف العطل وأصلح السيارات" },
    { id: "farmer", name: "المزارع", emo: "🌾", who: "🧑‍🌾", color: "#65a30d", tools: "🌱 💧 🧺 🚜", goal: "ازرع واسقِ واحصد وبِع" },
    { id: "candy", name: "بائع الحلوى", emo: "🍬", who: "🧑‍🍳", color: "#ec4899", tools: "🍫 🍭 ⚖️ 💰", goal: "بِع الحلوى واحسب الحساب والعروض" },
    { id: "factory", name: "عامل المصنع", emo: "🏭", who: "👷", color: "#ea580c", tools: "🦺 ⛑️ 📦 ⚙️", goal: "افحص المنتجات ورتّبها في الصناديق" },
    { id: "engineer", name: "المهندس", emo: "🏗️", who: "👷‍♀️", color: "#0891b2", tools: "📐 📏 🧱 🏗️", goal: "صمّم وابنِ مبنى من الأساس إلى السطح" },
    { id: "scientist", name: "العالِم", emo: "🔬", who: "👩‍🔬", color: "#7c3aed", tools: "🔬 🧪 🌡️ 📊", goal: "أجرِ التجارب واكتشف النتائج" },
    { id: "programmer", name: "المبرمج", emo: "💻", who: "🧑‍💻", color: "#0f766e", tools: "💻 ⌨️ 🐞 🔁", goal: "اكتب البرامج واصطد الأخطاء" },
  ];
  Jobs.play = {};   // id ← function(screen helpers) تسجلها ملفات المهن
  Jobs.register = (id, fn) => { Jobs.play[id] = fn; };
  Jobs.byId = (id) => Jobs.list.find((j) => j.id === id);

  // ---------------------------------------------------------------- الحفظ وفتح المهن
  Jobs.save = K.store("jobs", { first: null, shifts: {}, runs: {}, best: {}, cert: {} });
  if (!Jobs.save.cert) Jobs.save.cert = {};
  const dayNo = (d = new Date()) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);
  if (!Jobs.save.first) { Jobs.save.first = dayNo(); Jobs.save.save(); }
  Jobs.today = () => dayNo() - Jobs.save.first;                 // اليوم كم منذ أول لعب (0 = اليوم الأول)
  Jobs.unlocked = () => (Jobs.TEST ? Jobs.list.length : Math.min(Jobs.list.length, Math.max(1, Jobs.today() + 1)));
  Jobs.isOpen = (j) => Jobs.list.indexOf(j) < Jobs.unlocked();
  Jobs.daysLeft = (j) => Jobs.list.indexOf(j) - Jobs.today();
  // مهنة اليوم: الجديدة إن فُتحت اليوم، وبعد فتح الكل تدور كل يوم
  Jobs.featured = () => {
    const t = Math.max(0, Jobs.today()), n = Jobs.list.length;
    return t < n ? Jobs.list[t] : Jobs.list[dayNo() % n];
  };
  Jobs.shift = (id) => Jobs.save.shifts[id] || 0;                // عدد الورديات التي أنهاها (يحدد الصعوبة)

  // ---------------------------------------------------------------- نوافذ وتنبيهات فوق شاشة اللعب
  Jobs.ov = null;   // النافذة المفتوحة الآن: { back() }
  Jobs.guard = false; // بعد فتح نافذة بزر اليد: لا تُضغط أزرارها حتى تُرفع الأصابع
  // buttons: [{ label, fn, cls }]  — fn تُستدعى بعد إغلاق النافذة
  Jobs.overlay = (html, buttons, opt = {}) => {
    Jobs.closeOverlay();
    const sc = K.app.querySelector(".screen");
    const d = document.createElement("div");
    d.className = "ov";
    const id = "ov" + Math.random().toString(36).slice(2, 7);
    d.innerHTML = `<div class="ovbox ${opt.cls || ""}">${html}<div class="ovbtns ${opt.btnCls || ""}">${buttons.map((b, i) =>
      `<button class="btn f ${b.cls || ""}" ${K.act(id + i, () => { if (!b.keep) Jobs.closeOverlay(); b.fn && b.fn(); })}>${b.label}</button>`).join("")}</div></div>`;
    sc.appendChild(d);
    Jobs.ov = { el: d, back: opt.back || null, prev: K.current() };
    Jobs.guard = true;
    K.focus(d.querySelector(`.f[data-k="${id + (opt.focus || 0)}"]`));
    return d;
  };
  Jobs.closeOverlay = () => {
    if (!Jobs.ov) return;
    const { el, prev } = Jobs.ov;
    el.remove(); Jobs.ov = null;
    // التركيز يرجع إلى الزر الذي كان قبل النافذة (في الشاشات المصنوعة من أزرار)
    const k = prev && prev.dataset.k;
    const f = (prev && K.app.contains(prev) && prev) || (k && K.app.querySelector(`.f[data-k="${k}"]`)) || K.app.querySelector(".f");
    if (f) K.focus(f);
  };
  Jobs.toast = (text, cls = "", ms = 2600) => {
    const sc = K.app.querySelector(".screen");
    if (!sc) return;
    const t = document.createElement("div");
    t.className = "toast " + cls;
    t.innerHTML = text;
    sc.appendChild(t);
    setTimeout(() => t.remove(), ms);
  };

  // ---------------------------------------------------------------- تحكم مشترك للشاشات الحية (Canvas)
  // يعيد الاتجاه المضغوط الآن من لوحة المفاتيح أو اليد أو أزرار اللمس، وينادي onBack وonOk.
  Jobs.controls = ({ onBack, onOk }) => {
    const held = [];   // آخر اتجاه مضغوط في الآخر
    const DIR = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const pad = { prev: [], dir: null };
    let touchDir = null;
    const c = {
      dir: () => touchDir || pad.dir || held[held.length - 1] || null,
      clear() { held.length = 0; pad.dir = null; touchDir = null; },
      mode: {
        key(e) {
          if (Jobs.ov) {
            if (e.key === "Backspace") { if (Jobs.ov.back) { const b = Jobs.ov.back; Jobs.closeOverlay(); b(); } return true; }
            if (Jobs.guard && e.pad) return true;
            return false;
          }
          const d = DIR[e.key];
          if (d) { if (e.pad) return true; if (!held.includes(d)) held.push(d); return true; }
          if (e.pad) return true;
          if (e.key === "Enter" || e.key === " ") { if (!e.repeat && onOk) onOk(); return true; }
          if (e.key === "Backspace") { c.clear(); onBack(); return true; }
          return false;
        },
        keyup(e) { const d = DIR[e.key]; if (d) { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); } },
        poll(pads) {
          if (!pads.length) { pad.prev = []; pad.dir = null; return false; }
          const g = pads[0], b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
          const edge = (i) => b(i) && !pad.prev[i];
          const any = g.buttons.some((x) => x && x.pressed);
          pad.prev = g.buttons.map((x) => x && x.pressed);
          if (Jobs.ov) { pad.dir = null; if (Jobs.guard) { if (any) return true; Jobs.guard = false; } return false; }
          const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
          pad.dir = b(12) || ay < -0.5 ? "up" : b(13) || ay > 0.5 ? "down" : b(14) || ax < -0.5 ? "left" : b(15) || ax > 0.5 ? "right" : null;
          if (edge(1) || edge(9)) { c.clear(); onBack(); }
          else if (edge(0) && onOk) onOk();
          return true;
        },
      },
      // أزرار أسهم للمس والفأرة
      dpad(root) {
        const d = document.createElement("div");
        d.className = "dpad";
        d.innerHTML = `<b data-d="up">▲</b><b data-d="left">◀</b><b data-d="right">▶</b><b data-d="down">▼</b>`;
        const up = () => { touchDir = null; };
        d.addEventListener("pointerdown", (e) => { const b = e.target.closest("b"); if (!b) return; e.preventDefault(); K.audioCtx(); touchDir = b.dataset.d; try { d.setPointerCapture(e.pointerId); } catch {} });
        d.addEventListener("pointermove", (e) => {
          if (!touchDir) return;
          const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest && el.closest(".dpad b");
          if (b) touchDir = b.dataset.d;
        });
        d.addEventListener("pointerup", up); d.addEventListener("pointercancel", up); d.addEventListener("lostpointercapture", up);
        root.appendChild(d);
      },
    };
    // عند الانتقال لنافذة أخرى في المتصفح: لا تبقَ الأزرار مضغوطة
    addEventListener("blur", c.clear);
    return c;
  };

  // شاشات من أزرار (الطباخ، الطيار…): الأسهم وEnter كالعادة، وBackspace يفتح الاستراحة بدل الخروج
  Jobs.domMode = (onBack) => ({
    key(e) {
      if (Jobs.ov) {
        if (e.key === "Backspace") { if (Jobs.ov.back) { const b = Jobs.ov.back; Jobs.closeOverlay(); b(); } return true; }
        return false;
      }
      if (e.key === "Backspace") { onBack(); return true; }
      return false;
    },
  });
  // يعيد رسم جزء من الشاشة ويبقي التركيز على الزر نفسه (حسب data-k)
  Jobs.fill = (el, html) => {
    if (!el) return;
    const c = K.current(), k = c && c.dataset.k;
    el.innerHTML = html;
    if (Jobs.ov) return;
    if (c && K.app.contains(c)) return;
    const f = (k && K.app.querySelector(`.f[data-k="${k}"]`)) || el.querySelector(".f") || K.app.querySelector(".f");
    if (f) K.focus(f);
  };
  // نافذة الاستراحة المشتركة
  Jobs.pause = (api, run, text) => {
    Jobs.overlay(`<h2>⏸ استراحة</h2><div class="sub">${text}</div>`, [
      { label: "▶ تابع", cls: "go" },
      { label: "🏠 احفظ واخرج", fn: () => { api.keep(run); api.exit(); } },
    ], { back: () => {} });
  };
  // نجوم الوردية من نسبة الصواب والأخطاء
  Jobs.grade = (ok, total, bad = 0) => (ok >= total * 0.85 && bad <= 1 ? 3 : ok >= total * 0.6 ? 2 : 1);

  // حلقة رسم: dt بالثواني، 30 إطاراً على الأجهزة الضعيفة. يعيد دالة الإيقاف.
  Jobs.loop = (fn) => {
    let raf = 0, last = 0, acc = 0, on = true;
    const step = (now) => {
      if (!on) return;
      raf = requestAnimationFrame(step);
      if (!last) last = now;
      let dt = (now - last) / 1000;
      if (Jobs.LITE) { acc += dt; if (acc < 1 / 30) { last = now; return; } dt = acc; acc = 0; }
      last = now;
      fn(Math.min(dt, 0.1));
    };
    raf = requestAnimationFrame(step);
    return () => { on = false; cancelAnimationFrame(raf); };
  };

  // سؤال باقي النقود وغيره: خيارات أرقام قريبة من الجواب
  Jobs.numOptions = (ans, n = 3, spread = [1, 2, 5, 10]) => {
    const s = new Set([ans]);
    let guard = 0;
    while (s.size < n && guard++ < 50) {
      const v = ans + K.pick(spread) * (Math.random() < 0.5 ? -1 : 1);
      if (v > 0) s.add(v);
    }
    return K.shuffle([...s]);
  };
})();
