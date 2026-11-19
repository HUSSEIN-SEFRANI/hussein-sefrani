// الرسائل — يكتب الطفل رسالة على ورقة A4 مسطّرة مزخرفة بأغصان العنب، ويختار لمن هي من أعلى الورقة.
// الصناديق على السيرفر في مجلد كل فرد: تلفاز/تطبيقات/الرسائل/{الوارد,الصادر,المحفوظة}
// الإرسال: PDF في «الصادر» عند المرسل و«الوارد» عند المرسَل إليه (‎/api/tv/letters — البند 43، v1.9.11).
(() => {
  "use strict";
  const K = window.K;
  const esc = K.esc;
  const DEMO = "anab-letters-demo";   // خارج التلفاز فقط (تجربة على الكمبيوتر)
  const DRAFT = "anab-letter-draft-v1";

  // ---------------------------------------------------------------- الأشخاص
  let me = null, people = [], onTV = false;
  async function loadPeople() {
    try {
      const [h, p] = await Promise.all([
        fetch("/api/tv/home", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)),
        fetch("/api/tv/profiles", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (h && h.user && p && p.profiles) {
        me = { id: h.user.id, name: h.user.name, photo_v: h.user.photo_v };
        people = p.profiles.map((x) => ({ id: x.id, name: x.name, photo_v: x.photo_v, role: x.role }));
        onTV = true;
        return;
      }
    } catch { /* خارج التلفاز */ }
    me = { id: 1, name: "أنا" };   // للتجربة على الكمبيوتر
    people = [me, { id: 2, name: "سارة" }, { id: 3, name: "عمر" }, { id: 4, name: "ماما" }, { id: 5, name: "بابا" }];
  }
  const COLORS = ["#ec4899", "#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6"];
  const face = (p, cls = "") => `<span class="face ${cls}" style="background:${COLORS[p.id % COLORS.length]}">${esc((p.name || "؟").trim().charAt(0))}${
    p.photo_v && onTV ? `<img src="/api/users/${p.id}/photo?v=${p.photo_v}" alt="" onerror="this.remove()">` : ""}</span>`;

  // ---------------------------------------------------------------- صندوق الرسائل (في متصفح التلفاز، مشترك بين أفراد العائلة)
  const BOX = { in: { t: "📥 الوارد", f: "الوارد" }, out: { t: "📤 الصادر", f: "الصادر" }, saved: { t: "💾 المحفوظة", f: "المحفوظة" } };
  const folderOf = (box) => `تلفاز/تطبيقات/الرسائل/${BOX[box].f}`;
  let OLD = false;   // سيرفر أقدم من 1.9.11 (لا توجد صناديق)
  const OLD_MSG = "حدّث الجهاز (الإصدار 1.9.11 أو أحدث) لتعمل صناديق الرسائل";
  async function api(path, opt = {}) {
    const r = await fetch(path, { credentials: "same-origin", ...opt });
    const d = await r.json().catch(() => ({}));
    if (r.status === 404 && !d.error || r.status === 405) { OLD = true; throw new Error(OLD_MSG); }
    if (!r.ok) throw new Error(d.error || "خطأ " + r.status);
    return d;
  }
  const demo = () => { try { return JSON.parse(localStorage.getItem(DEMO) || "[]"); } catch { return []; } };
  const demoSave = (a) => { try { localStorage.setItem(DEMO, JSON.stringify(a.slice(-200))); } catch { /* */ } };
  // ← { letters: [...] الأحدث أولاً, unread }
  async function listBox(box) {
    if (!onTV) {
      const a = demo();
      return { letters: a.filter((m) => m.box === box).reverse(), unread: a.filter((m) => m.box === "in" && !m.read).length };
    }
    return api(`/api/tv/letters?box=${box}`);
  }
  async function markRead(m) {
    if (!onTV) { const a = demo(); a.forEach((x) => { if (x.id === m.id && x.box === "in") x.read = true; }); demoSave(a); return; }
    await api(`/api/tv/letters/${encodeURIComponent(m.id)}/read`, { method: "POST" }).catch(() => {});
  }
  async function remove(m, box) {
    if (!onTV) { demoSave(demo().filter((x) => !(x.id === m.id && x.box === box))); return; }
    await api(`/api/tv/letters/${encodeURIComponent(m.id)}/delete?box=${box}`, { method: "POST" });
  }
  // كل شاشة تأخذ رقماً؛ إن تغيّرت الشاشة أثناء التحميل لا نرسم فوقها
  let gen = 0;
  const draftKey = () => `${DRAFT}-${me.id}`;
  const loadDraft = () => { try { return JSON.parse(localStorage.getItem(draftKey()) || "null"); } catch { return null; } };
  const saveDraft = (d) => { try { localStorage.setItem(draftKey(), JSON.stringify(d)); } catch { /* */ } };

  // ---------------------------------------------------------------- الورقة (ترسم على canvas: نفس الشكل على الشاشة وفي PDF)
  const A4 = 1.41421;
  const U = 794;   // عرض الورقة بوحدات التصميم (A4 = 794 × 1123)
  function leaf(x, y, rot, s = 1, c = "#3f8f2f") {
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C-3 -2 -6 -1 -7 -4 C-9 -3 -10 -6 -9 -8 C-11 -9 -10 -12 -7 -12 C-7 -15 -4 -16 -2 -14 C-1 -17 1 -17 2 -14 C4 -16 7 -15 7 -12 C10 -12 11 -9 9 -8 C10 -6 9 -3 7 -4 C6 -1 3 -2 0 0Z" fill="${c}"/><path d="M0 0 L0 -13 M0 -5 L-6 -9 M0 -5 L6 -9" stroke="#2a6b1f" stroke-width=".7" fill="none"/></g>`;
  }
  function cluster(x, y, s = 1.7) {
    let g = `<path d="M${x} ${y - 4 * s} q ${2 * s} ${-6 * s} ${-s} ${-9 * s}" stroke="#6b3e1e" stroke-width="2" fill="none"/>`;
    [[-6, -2, 2, 6], [-4, 0, 4], [-2, 2], [0]].forEach((r, i) => r.forEach((dx) => { g += `<circle cx="${x + dx * 1.05 * s}" cy="${y + i * 4.4 * s}" r="${2.75 * s}" fill="url(#gr)"/>`; }));
    return g;
  }
  // إطار بتسع قطع 240×240: الزوايا 80 فيها عنقود، والأطراف قطع 80 تتكرر بلا انقطاع
  function frameSvg() {
    const vine = `stroke="#7a4b23" stroke-width="2.6" fill="none" stroke-linecap="round"`;
    const corner = `<path d="M80 40 C60 40 40 60 40 80" ${vine}/>${leaf(62, 50, -40, 1.6)}<path d="M47 52 c-6 -4 -9 2 -5 5 c3 2 5 -2 2 -3" stroke="#4d9a3a" stroke-width="1.1" fill="none"/>`;
    const edge = `<path d="M80 40 C93 32 107 32 120 40 C133 48 147 48 160 40" ${vine}/>${leaf(104, 35, -160, 1.25)}${leaf(138, 46, 20, 1.1, "#4d9a3a")}`;
    const tr = (list, body) => list.map((m) => `<g transform="matrix(${m.join(" ")})">${body}</g>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="480" height="480"><defs><radialGradient id="gr" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#e9d5ff"/><stop offset=".5" stop-color="#9333ea"/><stop offset="1" stop-color="#4c1d95"/></radialGradient></defs>`
      + tr([[1, 0, 0, 1, 0, 0], [1, 0, 0, -1, 0, 240], [0, 1, 1, 0, 0, 0], [0, 1, -1, 0, 240, 0]], edge)
      + tr([[1, 0, 0, 1, 0, 0], [-1, 0, 0, 1, 240, 0], [1, 0, 0, -1, 0, 240], [-1, 0, 0, -1, 240, 240]], corner)
      + [[34, 26], [206, 26], [34, 184], [206, 184]].map(([x, y]) => cluster(x, y)).join("") + "</svg>";
  }
  const IMG = {};
  const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let FONT = "'Noto Sans Arabic', Tahoma, sans-serif";
  async function loadAssets() {
    IMG.frame = await loadImg("data:image/svg+xml," + encodeURIComponent(frameSvg()));
    IMG.logo = await loadImg("/static/img/logo.svg");
    try {
      const fs = [new FontFace("LetterCairo", "url(/static/fonts/cairo-ar.woff2)", { weight: "200 900", unicodeRange: "U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC" }),
        new FontFace("LetterCairo", "url(/static/fonts/cairo-lat.woff2)", { weight: "200 900", unicodeRange: "U+0000-00FF, U+2000-206F" })];
      await Promise.all(fs.map((f) => f.load()));
      fs.forEach((f) => document.fonts.add(f));
      FONT = "LetterCairo, " + FONT;
    } catch { /* خط النظام */ }
  }
  const fnt = (w, px) => `${w} ${px}px ${FONT}`;

  function letterDate(ts) {
    const d = new Date(ts || Date.now());
    const g = d.toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric", numberingSystem: "latn" });
    let hj = "";
    try { hj = d.toLocaleDateString("ar-u-ca-islamic-umalqura", { year: "numeric", month: "long", day: "numeric", numberingSystem: "latn" }); } catch { /* */ }
    return hj && hj !== g ? `${g} · ${hj}` : g;
  }

  // تقسيم النص إلى أسطر بعرض معيّن
  function wrap(ctx, text, width) {
    const out = [];
    for (const para of String(text || "").split("\n")) {
      let line = "";
      for (const word of para.split(/(\s+)/)) {
        if (!word) continue;
        const test = line + word;
        if (ctx.measureText(test).width <= width || !line.trim()) {
          if (ctx.measureText(test).width > width) {   // كلمة أطول من السطر
            let part = line;
            for (const ch of [...word]) {
              if (ctx.measureText(part + ch).width > width && part) { out.push(part); part = ""; }
              part += ch;
            }
            line = part;
          } else line = test;
        } else { out.push(line.trimEnd()); line = word.trimStart(); }
      }
      out.push(line);
    }
    return out;
  }

  // التخطيط بوحدات التصميم (794 عرضاً)
  const L = { border: 70, pad: 24, line: 38, bodyFont: 21 };
  const inner = () => ({ x0: L.border + L.pad, x1: U - L.border - L.pad });

  // m = { from, to, ts, subject, body }   active: الحقل الذي يُكتب فيه الآن (للمؤشر)
  function layout(ctx, m) {
    ctx.font = fnt(400, L.bodyFont);
    const { x0, x1 } = inner();
    const lines = wrap(ctx, m.body, x1 - x0);
    const first = Math.floor((U * A4 - L.border - 26 - 430) / L.line);   // أسطر الصفحة الأولى
    const rest = Math.floor((U * A4 - 2 * L.border - 26 - 80) / L.line);
    const pages = [lines.slice(0, first)];
    for (let i = first; i < lines.length; i += rest) pages.push(lines.slice(i, i + rest));
    return { pages, first, rest };
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function frame(ctx, H) {
    const im = IMG.frame, b = L.border, s = im ? im.width / 240 : 1, c = 80 * s;
    if (!im) { ctx.strokeStyle = "#7e22ce"; ctx.lineWidth = 6; ctx.strokeRect(20, 20, U - 40, H - 40); return; }
    const pieces = (len) => Math.max(1, Math.round(len / b));
    ctx.drawImage(im, 0, 0, c, c, 0, 0, b, b);
    ctx.drawImage(im, 2 * c, 0, c, c, U - b, 0, b, b);
    ctx.drawImage(im, 0, 2 * c, c, c, 0, H - b, b, b);
    ctx.drawImage(im, 2 * c, 2 * c, c, c, U - b, H - b, b, b);
    const nx = pieces(U - 2 * b), wx = (U - 2 * b) / nx, ny = pieces(H - 2 * b), hy = (H - 2 * b) / ny;
    for (let i = 0; i < nx; i++) {
      ctx.drawImage(im, c, 0, c, c, b + i * wx, 0, wx + 0.5, b);
      ctx.drawImage(im, c, 2 * c, c, c, b + i * wx, H - b, wx + 0.5, b);
    }
    for (let i = 0; i < ny; i++) {
      ctx.drawImage(im, 0, c, c, c, 0, b + i * hy, b, hy + 0.5);
      ctx.drawImage(im, 2 * c, c, c, c, U - b, b + i * hy, b, hy + 0.5);
    }
  }
  function textR(ctx, s, x, y, font, color) {
    ctx.font = font; ctx.fillStyle = color; ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.fillText(s, x, y);
    return ctx.measureText(s).width;
  }

  // ترسم صفحة واحدة على ctx بمقياس scale. يرجع أماكن الحقول (لمعرفة أين المؤشر)
  function drawPage(ctx, m, lay, pi, scale, opts = {}) {
    const H = U * A4;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, U, H);
    frame(ctx, H);
    const { x0, x1 } = inner();
    const ink = "#2b1b3d", grape = "#7e22ce", muted = "#6b5a7d", lineC = "#e3d3f3";
    const spots = {};
    let y;
    const caret = (x, y0, show) => { if (show) { ctx.fillStyle = "#db2777"; ctx.fillRect(x - 3, y0, 3, 30); } };
    const hl = (key, y0, h) => {
      if (opts.active !== key) return;
      ctx.fillStyle = "rgba(250, 204, 21, .18)"; rr(ctx, x0 - 10, y0, x1 - x0 + 20, h, 10); ctx.fill();
    };
    if (pi === 0) {
      // الترويسة: الشعار في مستطيل
      const hy = L.border + 8, hh = 118;
      rr(ctx, x0, hy, x1 - x0, hh, 18);
      const g = ctx.createLinearGradient(x0, hy, x1, hy + hh);
      g.addColorStop(0, "#faf5ff"); g.addColorStop(0.55, "#f3e8ff"); g.addColorStop(1, "#ede9fe");
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = grape; ctx.stroke();
      rr(ctx, x0 + 7, hy + 7, x1 - x0 - 14, hh - 14, 13); ctx.lineWidth = 1; ctx.strokeStyle = "#d8b4fe"; ctx.stroke();
      if (IMG.logo) {
        const lh = 76, lw = Math.min((x1 - x0) * 0.86, lh * IMG.logo.width / IMG.logo.height);
        ctx.drawImage(IMG.logo, (x0 + x1) / 2 - lw / 2, hy + (hh - lw * IMG.logo.height / IMG.logo.width) / 2, lw, lw * IMG.logo.height / IMG.logo.width);
      } else {
        ctx.font = fnt(800, 54); ctx.fillStyle = grape; ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.fillText("HOME ANAB", (x0 + x1) / 2, hy + 78);
      }
      // إلى (في أعلى الرسالة)
      y = hy + hh + 22;
      hl("to", y - 4, 52);
      let w = textR(ctx, "إلى: ", x1, y + 36, fnt(700, 26), muted);
      const toName = m.to ? m.to.name : "اختر لمن الرسالة ⬇";
      textR(ctx, toName, x1 - w, y + 36, fnt(800, 30), m.to ? "#db2777" : "#c4a3dc");
      spots.to = y;
      // اسم المرسل ثم التاريخ
      y += 58;
      w = textR(ctx, "من: ", x1, y + 34, fnt(700, 22), muted);
      textR(ctx, m.from ? m.from.name : "", x1 - w, y + 34, fnt(800, 28), grape);
      y += 44;
      textR(ctx, letterDate(m.ts), x1, y + 26, fnt(400, 17), muted);
      y += 40;
      ctx.fillStyle = lineC; ctx.fillRect(x0, y, x1 - x0, 2);
      // الموضوع
      y += 14;
      hl("subject", y - 4, 50);
      w = textR(ctx, "الموضوع: ", x1, y + 32, fnt(800, 23), grape);
      ctx.font = fnt(700, 23);
      let subj = m.subject || "";
      while (subj && ctx.measureText(subj).width > x1 - x0 - w - 10) subj = subj.slice(1);
      const sw = textR(ctx, subj || (opts.active === "subject" ? "" : "…"), x1 - w, y + 32, fnt(700, 23), ink);
      caret(x1 - w - sw - 2, y + 8, opts.active === "subject" && opts.blink);
      spots.subject = y;
      y += 58;
    } else {
      y = L.border + 22;
      textR(ctx, `${m.from ? m.from.name : ""} ← ${m.to ? m.to.name : ""} · صفحة ${pi + 1}`, x1, y + 22, fnt(600, 16), muted);
      y += 44;
    }
    // النص على ورقة مسطّرة
    const lines = lay.pages[pi] || [];
    const nLines = pi === 0 ? lay.first : lay.rest;
    if (pi === 0) hl("body", y - 6, nLines * L.line + 12);
    spots.body = y;
    for (let i = 0; i < nLines; i++) { ctx.fillStyle = lineC; ctx.fillRect(x0, y + (i + 1) * L.line - 4, x1 - x0, 1.5); }
    ctx.font = fnt(400, L.bodyFont);
    lines.forEach((ln, i) => textR(ctx, ln, x1, y + (i + 1) * L.line - 12, fnt(400, L.bodyFont), ink));
    if (opts.active === "body" && opts.blink && pi === lay.pages.length - 1) {
      const last = lines.length ? lines[lines.length - 1] : "";
      ctx.font = fnt(400, L.bodyFont);
      const li = Math.max(0, lines.length - 1);
      caret(x1 - ctx.measureText(last).width - 3, y + li * L.line + 4, true);
      spots.caret = y + li * L.line;
    }
    if (!m.body && opts.active !== "body" && pi === 0) textR(ctx, "اكتب رسالتك هنا…", x1, y + L.line - 12, fnt(400, L.bodyFont), "#c4a3dc");
    ctx.restore();
    return spots;
  }

  // الورقة كاملة (كل الصفحات) في عنصر canvas واحد للعرض على الشاشة
  function paintPaper(cv, m, opts = {}) {
    const ctx = cv.getContext("2d");
    const lay = layout(ctx, m);
    const W = cv.clientWidth || 600, dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = (W * dpr) / U, ph = Math.round(U * A4 * s), gap = Math.round(18 * dpr);
    const n = lay.pages.length;
    cv.width = Math.round(W * dpr);
    cv.height = n * ph + (n - 1) * gap;
    cv.style.height = cv.height / dpr + "px";
    let spots = {};
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.translate(0, i * (ph + gap));
      const sp = drawPage(ctx, m, lay, i, s, opts);
      ctx.restore();
      if (i === 0) spots = { ...sp };
      if (sp.caret != null) spots.caretY = (i * (ph + gap)) / dpr + sp.caret * s / dpr;
    }
    for (const k of ["to", "subject", "body"]) if (spots[k] != null) spots[k] = spots[k] * s / dpr;
    return spots;
  }

  // ---------------------------------------------------------------- PDF (صفحات JPEG داخل ملف PDF، بلا مكتبات)
  async function pagesJpeg(m) {
    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d");
    const lay = layout(ctx, m);
    const s = 1240 / U;   // 150 نقطة في البوصة
    cv.width = 1240; cv.height = Math.round(U * A4 * s);
    const out = [];
    for (let i = 0; i < lay.pages.length; i++) {
      drawPage(ctx, m, lay, i, s);
      const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.9));
      out.push({ data: new Uint8Array(await blob.arrayBuffer()), w: cv.width, h: cv.height });
    }
    return out;
  }
  function buildPdf(pages, title) {
    const enc = new TextEncoder();
    const parts = [], offs = [];
    let len = 0;
    const put = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); body(); put("\nendobj\n"); };
    const PW = 595.28, PH = 841.89;
    const n = pages.length;
    // 1 الكتالوج، 2 الصفحات، 3 المعلومات، ثم لكل صفحة: صفحة، محتوى، صورة
    const hex = (s) => "<FEFF" + [...s].map((c) => { const u = c.codePointAt(0); if (u < 0x10000) return u.toString(16).padStart(4, "0"); const v = u - 0x10000; return ((0xd800 + (v >> 10)).toString(16) + (0xdc00 + (v & 0x3ff)).toString(16)); }).join("").toUpperCase() + ">";
    put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    obj(1, () => put("<< /Type /Catalog /Pages 2 0 R >>"));
    obj(2, () => put(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${4 + i * 3} 0 R`).join(" ")}] >>`));
    obj(3, () => put(`<< /Title ${hex(title)} /Producer (HOME ANAB) >>`));
    pages.forEach((p, i) => {
      const pg = 4 + i * 3, ct = pg + 1, im = pg + 2;
      obj(pg, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /P${i} ${im} 0 R >> >> /Contents ${ct} 0 R >>`));
      const cs = `q ${PW} 0 0 ${PH} 0 0 cm /P${i} Do Q`;
      obj(ct, () => put(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
      obj(im, () => { put(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.data.length} >>\nstream\n`); put(p.data); put("\nendstream"); });
    });
    const total = 4 + n * 3;
    const x = len;
    let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++) xref += String(offs[i]).padStart(10, "0") + " 00000 n \n";
    put(xref + `trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${x}\n%%EOF\n`);
    return new Blob(parts, { type: "application/pdf" });
  }
  const fileName = (m) => {
    const d = new Date(m.ts);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return `رسالة من ${m.from.name} إلى ${m.to.name}${m.subject ? " - " + m.subject : ""} ${day}`;
  };
  // يرسل الرسالة (أو يحفظها عندي مع saveOnly). يرجع { ok, folder } أو { ok: false, why }
  async function deliver(m, saveOnly) {
    const pdf = buildPdf(await pagesJpeg(m), m.subject || "رسالة");
    if (!onTV) {   // خارج التلفاز: تنزيل الملف للتجربة، والصناديق في هذا المتصفح
      const a = document.createElement("a");
      a.href = URL.createObjectURL(pdf); a.download = fileName(m) + ".pdf"; a.click();
      const id = Date.now().toString(36);
      const x = { id, from: m.from, to: m.to, ts: new Date(m.ts).toISOString(), subject: m.subject, body: m.body };
      const list = demo();
      if (saveOnly) list.push({ ...x, box: "saved", read: true });
      else list.push({ ...x, box: "out", read: true }, { ...x, box: "in", read: false });
      demoSave(list);
      return { ok: true, local: true, folder: folderOf(saveOnly ? "saved" : "out") };
    }
    const fd = new FormData();
    fd.append("meta", JSON.stringify({ to: m.to.id, subject: m.subject, body: m.body, name: fileName(m) }));
    fd.append("pdf", pdf, "letter.pdf");
    try {
      const d = await api("/api/tv/letters/send" + (saveOnly ? "?save=1" : ""), { method: "POST", body: fd });
      return { ok: true, folder: d.folder };
    } catch (e) { return { ok: false, why: e.message || "تعذّر الاتصال بالجهاز" }; }
  }

  // ---------------------------------------------------------------- الشاشة الرئيسية
  async function home() {
    const g = ++gen;
    K.begin();
    let n = 0, why = "";
    try { n = (await listBox("in")).unread; } catch (e) { why = e.message; }
    if (g !== gen) return;
    K.paint(`
      <div class="title"><span class="mascot emo">💌</span><div><h1>الرسائل</h1><p class="sub">أهلاً يا ${esc(me.name)}! اكتب رسالة جميلة لمن تحب</p></div></div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(160deg,#a855f7,#7e22ce)" ${K.act("write", () => K.show(compose, null))}>
          <span class="big emo">✍️</span><b>اكتب رسالة</b><small>على ورقة العنب</small></button>
        <button class="mode f" style="background:linear-gradient(160deg,#ec4899,#be185d)" ${K.act("in", () => K.show(box, "in"))}>
          <span class="big emo">📥</span><b>الوارد</b><small>${n ? `<span class="badge">${n}</span> رسالة جديدة` : "رسائل وصلتني"}</small></button>
        <button class="mode f" style="background:linear-gradient(160deg,#0ea5e9,#0369a1)" ${K.act("out", () => K.show(box, "out"))}>
          <span class="big emo">📤</span><b>الصادر</b><small>رسائل أرسلتُها</small></button>
        <button class="mode f" style="background:linear-gradient(160deg,#22c55e,#15803d)" ${K.act("saved", () => K.show(box, "saved"))}>
          <span class="big emo">💾</span><b>المحفوظة</b><small>رسائل حفظتُها</small></button>
      </div>
      ${why ? `<p class="sub warn">${esc(why)}</p>` : ""}
      ${onTV ? "" : `<p class="sub warn">تجربة خارج التلفاز: الملف يُنزّل، والصناديق في هذا المتصفح فقط.</p>`}
      ${K.HELP}`, "write");
    if (n) K.sfx.pop();
  }

  // ---------------------------------------------------------------- الصندوق (الوارد أو المرسل)
  const when = (ts) => new Date(ts).toLocaleDateString("ar", { day: "numeric", month: "long", numberingSystem: "latn" });
  async function box(kind) {
    const g = ++gen;
    K.begin();
    K.paint(`<div class="top"><span class="pill">${BOX[kind].t}</span>${K.backBtn()}</div><div class="empty"><span class="emo">⏳</span></div>`, "back");
    let list = [], why = "";
    try { list = (await listBox(kind)).letters || []; } catch (e) { why = e.message; }
    if (g !== gen) return;
    K.begin();
    if (K.top() && K.top().focus === "back") K.top().focus = null;   // التركيز على أول رسالة بعد التحميل
    const cards = list.slice(0, 60).map((m, i) => {
      const who = kind === "in" ? m.from : m.to;
      return `<button class="card f ${kind === "in" && !m.read ? "new" : ""}" ${K.act("m" + i, () => K.show(read, m, kind))}>
        ${face(who)}<div class="ct"><b>${kind === "in" ? "من" : kind === "out" ? "إلى" : "لـ"} ${esc(who.name)}</b><span>${esc(m.subject || "بلا موضوع")}</span><small>${when(m.ts)}</small></div>
        ${kind === "in" && !m.read ? `<i class="dot"></i>` : ""}</button>`;
    }).join("");
    K.paint(`
      <div class="top"><span class="pill">${BOX[kind].t}</span>${K.backBtn()}</div>
      ${list.length ? `<div class="cards">${cards}</div>` : `<div class="empty"><span class="emo">${why ? "⚠️" : kind === "in" ? "📭" : "✉️"}</span>
        <b>${why ? esc(why) : kind === "in" ? "لا توجد رسائل بعد" : "لا توجد رسائل هنا بعد"}</b>
        <button class="btn go f" ${K.act("w", () => K.replace(compose, null))}>✍️ اكتب رسالة</button></div>`}
      <p class="hint">📁 في ملفاتك: ${esc(folderOf(kind))}</p>
      ${K.HELP}`, list.length ? "m0" : "w");
  }

  // ---------------------------------------------------------------- قراءة رسالة
  function read(m, kind) {
    ++gen;
    K.begin();
    if (kind === "in" && !m.read) { m.read = true; markRead(m); }
    const back = K.act("back", K.back);
    K.paint(`
      <div class="reader">
        <div class="paperbox" id="pb"><canvas id="cv" class="paper"></canvas></div>
        <div class="side">
          <div class="pill">${kind === "in" ? `من ${esc(m.from.name)}` : `إلى ${esc(m.to.name)}`}</div>
          <p class="hint">📁 ${esc(folderOf(kind))}</p>
          ${kind === "in" ? `<button class="btn go f" ${K.act("reply", () => K.replace(compose, { to: m.from, subject: m.subject ? "رد: " + m.subject.replace(/^رد: /, "") : "رد" }))}>↩️ ردّ عليها</button>` : ""}
          <button class="btn f" ${K.act("del", (b) => twice(b, "اضغط مرة ثانية للحذف من صندوقك", async () => {
            try { await remove(m, kind); K.back(); } catch (e) { toast(e.message, false); }
          }))}>🗑️ احذف</button>
          <button class="btn f" ${back}>→ رجوع</button>
          <p class="hint">⬆⬇ لتحريك الورقة</p>
        </div>
      </div>`, kind === "in" ? "reply" : "back");
    const cv = document.getElementById("cv"), pb = document.getElementById("pb");
    paintPaper(cv, m);
    K.mode = { key(e) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const before = pb.scrollTop;
        pb.scrollBy({ top: e.key === "ArrowUp" ? -160 : 160, behavior: "smooth" });
        if (!e.pad) return true;
        return pb.scrollTop !== before || (e.key === "ArrowDown" ? pb.scrollTop + pb.clientHeight < pb.scrollHeight - 2 : pb.scrollTop > 0);
      }
      return false;
    } };
  }

  // ---------------------------------------------------------------- كتابة رسالة
  const KB = {
    ar: ["ضصثقفغعهخحج", "شسيبلاتنمكط", "ذئءؤرىةوزظد", ["أ", "إ", "آ", "ـ", "،", ".", "؟", "!", ":", "-"]],
    num: ["1234567890", ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"], ["(", ")", "«", "»", "/", "+", "=", "%", "*", "\""],
      ["😀", "😂", "🥰", "😍", "👍", "🎉", "🌹", "⭐", "🌙", "❤️"]],
    en: ["qwertyuiop", "asdfghjkl", "zxcvbnm", [",", ".", "?", "!", "'", "@", "-"]],
  };
  function compose(start) {
    ++gen;
    K.begin();
    const dr = !start ? loadDraft() : null;
    const m = {
      from: { id: me.id, name: me.name },
      to: start && start.to ? people.find((p) => p.id === start.to.id) || start.to : dr && dr.to ? people.find((p) => p.id === dr.to.id) || null : null,
      subject: (start && start.subject) || (dr && dr.subject) || "",
      body: (dr && dr.body) || "",
      ts: Date.now(),
    };
    let active = m.to ? (m.subject ? "body" : "subject") : "to", lay = "ar", blink = true, lastKey = 0, spots = {};
    const keep = () => saveDraft({ to: m.to, subject: m.subject, body: m.body });
    const keys = () => KB[lay].map((row, r) => `<div class="krow">${[...row].map((ch, i) =>
      `<button class="key f emo-ok" ${K.act(`k${r}-${i}`, () => type(ch))}>${esc(ch)}</button>`).join("")}</div>`).join("");
    const fieldBtn = (k, label) => `<button class="fld f ${active === k ? "on" : ""}" ${K.act("f-" + k, () => setActive(k))}>${label}</button>`;
    const paint = () => {
      K.begin();
      K.paint(`
        <div class="composer">
          <div class="paperbox" id="pb"><canvas id="cv" class="paper"></canvas></div>
          <div class="side">
            <div class="flds">${fieldBtn("to", "👤 إلى")}${fieldBtn("subject", "📝 الموضوع")}${fieldBtn("body", "✍️ الرسالة")}</div>
            <div class="kb">${keys()}
              <div class="krow">
                <button class="key wide f" ${K.act("lay", () => { lay = lay === "ar" ? "num" : lay === "num" ? "en" : "ar"; paint(); })}>${lay === "ar" ? "123 😀" : lay === "num" ? "ABC" : "أبج"}</button>
                <button class="key space f" ${K.act("sp", () => type(" "))}>مسافة</button>
                <button class="key wide f" ${K.act("del", del)}>⌫</button>
                <button class="key wide f" ${K.act("nl", () => type("\n"))}>↵ سطر</button>
              </div></div>
            <div class="acts">
              <button class="btn go f" ${K.act("send", send)}>📮 أرسل</button>
              <button class="btn f" ${K.act("mine", async (b) => {
                if (!m.body.trim()) { toast("اكتب الرسالة أولاً", false); return; }
                b.textContent = "⏳ …";
                const r = await deliver({ ...m, to: m.to || me, ts: Date.now() }, true);
                b.textContent = "💾 احفظ لي";
                toast(r.ok ? `✅ حُفظت في ملفاتك: ${r.folder}` : r.why, r.ok);
              })}>💾 احفظ لي</button>
              <button class="btn f" ${K.act("clr", (b) => twice(b, "اضغط مرة ثانية للمسح", () => { m.body = ""; m.subject = ""; keep(); draw(); }))}>🧽 امسح</button>
              <button class="btn f" ${K.act("back", K.back)}>→ رجوع</button>
            </div>
          </div>
        </div>`, active === "to" ? "f-to" : "k0-0");
      draw();
    };
    const cvEl = () => document.getElementById("cv");
    function draw() {
      const cv = cvEl();
      if (!cv) return;
      spots = paintPaper(cv, m, { active, blink });
    }
    function follow() {
      const pb = document.getElementById("pb");
      if (!pb) return;
      const y = active === "body" ? (spots.caretY != null ? spots.caretY : spots.body) : spots[active] || 0;
      if (y < pb.scrollTop + 40 || y > pb.scrollTop + pb.clientHeight - 90) pb.scrollTo({ top: Math.max(0, y - pb.clientHeight / 2), behavior: "smooth" });
    }
    function setActive(k) {
      if (k === "to") { K.show(pick, (p) => { m.to = p; active = m.subject ? "body" : "subject"; keep(); }); return; }
      active = k;
      document.querySelectorAll(".fld").forEach((b) => b.classList.toggle("on", b.dataset.k === "f-" + k));
      draw(); follow();
    }
    function type(ch) {
      if (active === "to") { setActive("to"); return; }
      if (active === "subject") {
        if (ch === "\n") { setActive("body"); return; }
        if (m.subject.length < 80) m.subject += ch;
      } else if (m.body.length < 6000) m.body += ch;
      K.sfx.tick(); blink = true; keep(); draw(); follow();
    }
    function del() {
      if (active === "subject") m.subject = [...m.subject].slice(0, -1).join("");
      else if (active === "body") m.body = [...m.body].slice(0, -1).join("");
      blink = true; keep(); draw(); follow();
    }
    async function send() {
      if (!m.to) { setActive("to"); return; }
      if (!m.body.trim()) { toast("اكتب الرسالة أولاً ✍️", false); setActive("body"); return; }
      if (m.to.id === me.id) { toast("اختر شخصاً آخر", false); setActive("to"); return; }
      const b = document.querySelector('[data-k="send"]');
      if (b) { b.disabled = true; b.textContent = "⏳ أرسل…"; }
      const letter = { from: m.from, to: { id: m.to.id, name: m.to.name }, subject: m.subject.trim(), body: m.body.replace(/\s+$/, ""), ts: Date.now() };
      const r = await deliver(letter, false);
      if (!r.ok) {   // لم تُرسل: تبقى الكتابة كما هي
        if (b) { b.disabled = false; b.textContent = "📮 أرسل"; }
        toast(r.why, false);
        return;
      }
      saveDraft(null);
      K.replace(done, letter, r);
    }
    paint();
    K.every(() => { blink = !blink; draw(); }, 600);
    K.mode = {
      key(e) {
        if (e.pad) {
          if (e.key === "Backspace") { del(); return true; }   // ○ في يد التحكم = حذف حرف
          return false;
        }
        if (e.ctrlKey || e.altKey || e.metaKey) return false;
        if (e.key === "Backspace") { del(); return true; }
        if (e.key === "Enter" && Date.now() - lastKey < 5000 && active !== "to") { type("\n"); lastKey = Date.now(); return true; }
        if (e.key.length >= 1 && [...e.key].length === 1 && e.key !== " " || e.key === " " && Date.now() - lastKey < 5000) {
          if (active === "to") return false;
          lastKey = Date.now(); type(e.key); return true;
        }
        return false;
      },
    };
  }

  // اختيار لمن الرسالة
  function pick(onPick) {
    ++gen;
    K.begin();
    const list = people.filter((p) => p.id !== me.id);
    K.paint(`
      <div class="top"><span class="pill">👤 لمن الرسالة؟</span>${K.backBtn()}</div>
      <div class="people">${list.map((p) => `<button class="person f" ${K.act("p" + p.id, () => { onPick(p); K.back(); })}>${face(p, "big")}<b>${esc(p.name)}</b></button>`).join("")
        || "<p class=\"sub\">لا يوجد أفراد آخرون على التلفاز</p>"}</div>
      ${K.HELP}`, list[0] ? "p" + list[0].id : "back");
  }

  // بعد الإرسال
  function done(letter, r) {
    ++gen;
    K.begin();
    K.paint(`
      <div class="sent"><span class="emo big">📮</span>
        <h1>وصلت رسالتك!</h1>
        <p class="sub">إلى ${esc(letter.to.name)} ${letter.subject ? "· " + esc(letter.subject) : ""}</p>
        <p class="note">📥 في «الوارد» عند ${esc(letter.to.name)}، و📤 في «الصادر» عندك${r.local ? " (تجربة: نُزّل ملف PDF)" : ""}</p>
        <div class="mini"><button class="btn go f" ${K.act("again", () => K.replace(compose, null))}>✍️ رسالة أخرى</button>
        <button class="btn f" ${K.act("home", K.home)}>🏠 الرئيسية</button></div>
      </div>`, "home");
    K.confetti(30, "💌✉️⭐🍇💜");
    K.sfx.win();
  }

  // زر خطير: الضغطة الأولى تسأل، والثانية خلال 3 ثوانٍ تنفّذ
  function twice(b, ask, fn) {
    if (b.dataset.armed && Date.now() - +b.dataset.armed < 3000) { delete b.dataset.armed; fn(); return; }
    b.dataset.armed = Date.now();
    toast(ask, false);
  }

  // رسالة قصيرة أسفل الشاشة
  function toast(msg, ok = true) {
    const t = document.createElement("div");
    t.className = "toast" + (ok ? "" : " bad");
    t.textContent = msg;
    document.body.append(t);
    setTimeout(() => t.remove(), 4000);
    (ok ? K.sfx.ok : K.sfx.bad)();
  }

  // ---------------------------------------------------------------- البداية
  (async () => {
    await Promise.all([loadPeople(), loadAssets()]);
    K.start(home);
  })();
})();
