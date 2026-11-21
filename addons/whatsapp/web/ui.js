// إضافة «نسخ الواتساب»: صِل الآيفون ← اقرأ المحادثات ← اختر محادثة ← مجلد فيه PDF والفيديوهات
import { $, $$, h, esc, icon, api, guard, toast, registerApp, openApp, fmtSize, confirmBox } from '/static/js/core.js';

const API = '/api/addons/whatsapp';
const GREEN = 'linear-gradient(135deg,#22c55e,#15803d)';
const CSS = `
.wa { padding: 18px 22px; max-width: 760px; margin: 0 auto; font-family: Arial, "Liberation Sans", "Noto Sans Arabic", sans-serif; }
.wa .field, .wa .btn { font-family: inherit; }
.wa .steps { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.wa .steps span { flex: 1; min-width: 120px; padding: 8px 10px; border-radius: 10px; background: var(--card, #f1f5f9); opacity: .55; font-size: 13px; text-align: center; }
.wa .steps span.on { opacity: 1; outline: 2px solid #16a34a; font-weight: bold; }
.wa .steps span.ok { opacity: .9; }
.wa .big { display: flex; gap: 16px; align-items: center; }
.wa .big .ic { width: 64px; height: 64px; border-radius: 18px; background: ${GREEN}; color: #fff; display: grid; place-items: center; flex: none; }
.wa .big .ic svg { width: 34px; height: 34px; }
.wa .big h3 { font-size: 19px; }
.wa .big .muted { font-size: 14px; line-height: 1.7; }
.wa .bar { height: 12px; border-radius: 6px; background: rgba(127,127,127,.2); overflow: hidden; margin: 12px 0 6px; }
.wa .bar div { height: 100%; background: ${GREEN}; transition: width .4s; }
.wa .list { max-height: 52vh; overflow: auto; margin-top: 10px; border-radius: 10px; }
.wa .chat { display: flex; gap: 12px; align-items: center; width: 100%; text-align: start; padding: 10px 12px; border: 0; border-bottom: 1px solid rgba(127,127,127,.15); background: none; color: inherit; cursor: pointer; font: inherit; }
.wa .chat:hover, .wa .chat:focus { background: rgba(34,197,94,.10); outline: none; }
.wa .chat .av { width: 40px; height: 40px; border-radius: 50%; background: ${GREEN}; color: #fff; display: grid; place-items: center; font-weight: bold; flex: none; }
.wa .chat .nm { flex: 1; min-width: 0; }
.wa .chat .nm b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wa .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.wa .err { color: #dc2626; }
`;

const DEV = {
  none: ['phone', 'صِل الآيفون بالسيرفر', 'صِل الهاتف بالكابل بمنفذ USB في السيرفر، وافتح قفله.'],
  need_trust: ['lock', 'اضغط «وثوق» على الهاتف', 'تظهر على شاشة الآيفون رسالة «الوثوق بهذا الكمبيوتر؟». اضغط «وثوق» واكتب رمز القفل.'],
  locked: ['lock', 'افتح قفل الهاتف', 'افتح قفل الآيفون وأبقه موصولاً.'],
  not_installed: ['info', 'أدوات الآيفون غير موجودة', 'هذا الجهاز لا يحتوي أدوات الآيفون (libimobiledevice). حدّث النظام.'],
};
const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric', numberingSystem: 'latn' }) : '');

registerApp({
  id: 'addon-whatsapp', title: 'نسخ الواتساب', icon: 'phone', color: GREEN, width: 820, height: 680,
  open(win) {
    if (!document.getElementById('wa-css')) document.head.appendChild(h(`<style id="wa-css">${CSS}</style>`));
    win.body.innerHTML = '<div class="scroll"><div class="wa"></div></div>';
    const box = $('.wa', win.body);
    let st = null, chats = null, timer = 0, sel = null, q = '', alive = true, sig = '';
    win.onClose(() => { alive = false; clearTimeout(timer); });

    const steps = (n) => `<div class="steps">${['١ صِل الهاتف', '٢ اقرأ المحادثات', '٣ اختر محادثة', '٤ المجلد جاهز']
      .map((t, i) => `<span class="${i + 1 === n ? 'on' : i + 1 < n ? 'ok' : ''}">${i + 1 < n ? '✓ ' : ''}${t}</span>`).join('')}</div>`;
    const big = (ic, title, text, extra = '') => `<div class="card"><div class="big"><span class="ic">${icon(ic)}</span>
      <div style="flex:1;min-width:0"><h3 style="margin:0 0 4px">${esc(title)}</h3><div class="muted">${text}</div></div></div>${extra}</div>`;
    const bar = (j) => `<div class="bar"><div style="width:${Math.max(2, j.pct || 0)}%"></div></div>
      <div class="muted small"><bdi dir="ltr">${j.pct || 0}%</bdi> · ${esc(j.text || '')}</div>`;
    const finishBtn = '<button class="btn ghost" data-a="finish">انتهيت (احذف النسخة المؤقتة)</button>';

    async function poll() {
      clearTimeout(timer);
      if (!alive) return;
      const r = await api.get(`${API}/status`).catch(() => null);
      if (r) {
        st = r;
        if (st.job.state === 'ready' && !chats) chats = (await guard(() => api.get(`${API}/chats`)) || {}).chats || [];
        if (st.job.state !== 'ready' && st.job.state !== 'done' && st.job.state !== 'error_export' && st.job.state !== 'export') chats = null;
        draw();
      }
      const busy = r && ['backup', 'export'].includes(r.job.state);
      timer = setTimeout(poll, busy ? 1200 : 3000);
    }

    function draw() {
      const j = st.job, d = st.device || {};
      // لا نعيد الرسم إن لم يتغير شيء (حتى لا يضيع ما يكتبه المستعمل في البحث أو كلمة السر)
      const s = JSON.stringify([j, d.state, d.name, d.encrypted, chats && chats.length, sel]);
      if (s === sig) return; sig = s;
      if (!st.tools.pdf) { box.innerHTML = big('info', 'لا يمكن صنع ملف PDF', 'متصفح Chromium غير موجود على هذا الجهاز.'); return; }
      if (j.state === 'busy') { box.innerHTML = steps(1) + big('lock', 'الهاتف مستعمل الآن', `يستعمل <b>${esc(j.owner_name)}</b> «نسخ الواتساب» الآن. انتظر حتى ينتهي.`); return; }
      if (j.state === 'idle' || j.state === 'error') {
        if (d.state !== 'ready') {
          const [ic, t, x] = DEV[d.state] || DEV.none;
          box.innerHTML = steps(1) + big(ic, t, x, j.error ? `<p class="err small">${esc(j.error)}</p>` : '');
          return;
        }
        box.innerHTML = steps(1) + big('phone', d.name || 'iPhone', `الهاتف موصول وجاهز.${d.used ? ` فيه <bdi dir="ltr">${fmtSize(d.used)}</bdi>، والمتاح في السيرفر <bdi dir="ltr">${fmtSize(st.free)}</bdi>.` : ''}`,
          `${j.error ? `<p class="err small">${esc(j.error)}</p>` : ''}
          <p class="small">لقراءة المحادثات تؤخذ من الهاتف <b>نسخة مؤقتة كاملة</b> (الآيفون لا يعطي الواتساب وحده). المرة الأولى قد تأخذ وقتاً طويلاً حسب حجم الهاتف.
          النسخة تُحذف عندما تضغط «انتهيت»، ولا يبقى في ملفاتك إلا المحادثات التي تختارها.</p>
          ${d.encrypted ? '<p class="small">🔒 نسخ هذا الهاتف مشفّرة: بعد النسخ سنطلب كلمة سرها (التي اخترتها في iTunes أو Finder).</p>' : ''}
          <div class="row"><button class="btn primary" data-a="read">${icon('download')} اقرأ المحادثات من الهاتف</button></div>`);
        return;
      }
      if (j.state === 'backup') {
        box.innerHTML = steps(2) + big('download', 'جارٍ نسخ الهاتف…', `أبقِ <b>${esc(j.device)}</b> موصولاً ومفتوح القفل حتى ينتهي.`,
          `${bar(j)}<div class="row"><button class="btn ghost" data-a="cancel">إيقاف</button></div>`);
        return;
      }
      if (j.state === 'need_password') {
        box.innerHTML = steps(2) + big('lock', 'كلمة سر نسخ الآيفون', 'نسخ هذا الهاتف مشفّرة. اكتب كلمة السر التي اخترتها لنسخ الآيفون (ليست رمز قفل الهاتف).',
          `${j.error ? `<p class="err small">${esc(j.error)}</p>` : ''}
          <input class="field" type="password" name="pw" autocomplete="off" style="margin-top:12px" placeholder="كلمة السر">
          <div class="row"><button class="btn primary" data-a="pw">${icon('key')} افتح النسخة</button>${finishBtn}</div>`);
        const inp = $('[name=pw]', box); inp.focus(); inp.onkeydown = (e) => { if (e.key === 'Enter') $('[data-a=pw]', box).click(); };
        return;
      }
      if (j.state === 'ready' || j.state === 'error_export') {
        const list = chats || [];
        box.innerHTML = steps(3) + `<div class="card">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h3 style="margin:0;flex:1">اختر المحادثة (${list.length})</h3>
            <input class="field" type="search" name="q" placeholder="بحث بالاسم…" style="max-width:240px" value="${esc(q)}"></div>
          ${j.state === 'error_export' ? `<p class="err small">${esc(j.error)}</p>` : ''}
          <div class="list"></div>
          <div class="row">${finishBtn}</div></div>`;
        const lb = $('.list', box), qi = $('[name=q]', box);
        const fill = () => {
          const norm = (t) => String(t).toLowerCase();
          const shown = list.filter((c) => !q || norm(c.name).includes(norm(q)));
          lb.innerHTML = shown.map((c) => `<button class="chat" data-c="${c.id}"><span class="av">${c.group ? icon('users') : esc((c.name || '?').slice(0, 1))}</span>
            <span class="nm"><b translate="no">${esc(c.name)}</b><span class="muted small">${c.messages} رسالة · ${c.images} صورة · ${c.videos} فيديو${c.group ? ' · مجموعة' : ''}</span></span>
            <span class="muted small">${fmtDay(c.last)}</span></button>`).join('') || '<p class="muted" style="padding:12px">لا توجد محادثة بهذا الاسم</p>';
          $$('[data-c]', lb).forEach((b) => (b.onclick = () => pick(list.find((c) => c.id === +b.dataset.c))));
        };
        qi.oninput = () => { q = qi.value; fill(); };
        fill();
        return;
      }
      if (j.state === 'export') {
        box.innerHTML = steps(3) + big('file', 'جارٍ صنع الملف…', 'تُنسخ الصور والفيديوهات ثم يُصنع ملف PDF. يمكنك إغلاق النافذة: العمل يستمر في السيرفر.',
          `${bar(j)}<div class="row"><button class="btn ghost" data-a="cancel">إيقاف</button></div>`);
        return;
      }
      if (j.state === 'done' && j.result) {
        const r = j.result, s = r.stats;
        box.innerHTML = steps(4) + big('check', 'المجلد جاهز', `في ملفاتك: <b translate="no">${esc(st.folder)} / ${esc(r.name)}</b>`,
          `<p class="small">ملف PDF فيه <b>${s.messages}</b> رسالة و<b>${s.images}</b> صورة${s.videos ? `، و<b>${s.videos}</b> فيديو بجانبه في المجلد` : ''}${s.audio ? `، و<b>${s.audio}</b> رسالة صوتية` : ''}${s.docs ? `، و<b>${s.docs}</b> ملف` : ''}.
          ${s.missing ? `<br><span class="muted">${s.missing} من الوسائط غير موجودة على الهاتف (لم تُحمَّل في الواتساب)، ومكانها مكتوب في الملف.</span>` : ''}</p>
          <div class="row"><button class="btn primary" data-a="open">${icon('folder')} افتح المجلد</button>
          <button class="btn" data-a="more">محادثة أخرى</button>${finishBtn}</div>`);
      }
    }

    async function pick(c) {
      const ok = await confirmBox(`تُنسخ «${c.name}» (${c.messages} رسالة، ${c.images} صورة، ${c.videos} فيديو) إلى مجلد باسمها في «${st.folder}» في ملفاتك.`, { title: 'نسخ المحادثة', ok: 'اصنع الملف' });
      if (!ok) return;
      if (await guard(() => api.post(`${API}/export`, { chat: c.id }))) poll();
    }

    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'read') { b.disabled = true; if (!await guard(() => api.post(`${API}/read`))) b.disabled = false; }
      else if (a === 'cancel') await guard(() => api.post(`${API}/cancel`));
      else if (a === 'pw') {
        b.disabled = true;
        const r = await guard(() => api.post(`${API}/password`, { password: $('[name=pw]', box).value }));
        b.disabled = false;
        if (r && r.job.state === 'need_password') toast(r.job.error || 'كلمة السر غير صحيحة', 'err');
      }
      else if (a === 'finish') {
        if (!await confirmBox('تُحذف النسخة المؤقتة من السيرفر. المجلدات التي صنعتها تبقى في ملفاتك.', { title: 'انتهيت', ok: 'احذف النسخة' })) return;
        if (await guard(() => api.post(`${API}/finish`))) { chats = null; q = ''; toast('حُذفت النسخة المؤقتة', 'ok'); }
      }
      else if (a === 'open') openApp('files', { path: st.job.result.path });
      else if (a === 'more') await guard(() => api.post(`${API}/back`));
      sig = ''; poll();
    });
    box.innerHTML = '<p class="muted">جارٍ القراءة…</p>';
    poll();
  },
});
