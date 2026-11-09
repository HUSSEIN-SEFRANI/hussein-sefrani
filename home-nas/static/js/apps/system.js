// ====================================================================
// تطبيقات: روابط المشاركة، مراقب النظام، لوحة التحكم
// ====================================================================
import {
  ME, $, $$, h, esc, icon, api, guard, toast, modal, form, confirmBox, registerApp, openApp, linkBox, copyText,
  fmtSize, fmtDateTime, fmtDuration,
} from '../core.js';

// --------------------------------------------------------------------- روابط المشاركة
registerApp({
  id: 'links', title: 'روابط المشاركة', icon: 'link', color: 'linear-gradient(135deg,#7f5af0,#2cb1bc)', width: 860, height: 520,
  open(win) {
    let all = false;
    win.body.innerHTML = `<div class="toolbar"><strong>الروابط التي أنشأتها</strong><span class="grow"></span>
      ${ME.is_admin ? '<label class="check" style="margin:0"><input type="checkbox" class="all"> عرض روابط كل المستخدمين</label>' : ''}
      <button class="btn ghost icon" data-a="r">${icon('refresh')}</button></div><div class="scroll"></div>`;
    const sc = $('.scroll', win.body);
    async function load() {
      const rows = await guard(() => api.get('/api/links' + (all ? '?all=1' : ''))); if (!rows) return;
      if (!rows.length) { sc.innerHTML = `<div class="empty-state">${icon('link')}<p><b>لا توجد روابط مشاركة</b></p>
        <p>أنشئ رابطاً من «الملفات» (زر مشاركة) أو من ألبوم في «الصور».</p></div>`; return; }
      const t = h(`<table class="tbl"><thead><tr><th>العنصر</th><th>النوع</th>${all ? '<th>المالك</th>' : ''}<th>الحالة</th><th>المشاهدات</th><th></th></tr></thead><tbody></tbody></table>`);
      for (const l of rows) {
        const tr = h(`<tr><td><b></b><div class="muted ltr" style="font-size:12px"></div></td>
          <td>${l.kind === 'album' ? 'ألبوم' : 'ملف/مجلد'}</td>${all ? `<td>${esc(l.owner)}</td>` : ''}
          <td>${l.expired ? '<span class="badge err">منتهي</span>' : l.expires_at ? `<span class="badge warn">حتى ${esc(fmtDateTime(l.expires_at))}</span>` : '<span class="badge ok">دائم</span>'}
            ${l.has_password ? `<span class="badge">${icon('lock')}</span>` : ''}</td>
          <td>${l.views}</td>
          <td style="white-space:nowrap"><button class="btn ghost icon sm" data-x="copy" title="نسخ الرابط">${icon('copy')}</button>
            <button class="btn ghost icon sm" data-x="open" title="فتح">${icon('link')}</button>
            <button class="btn ghost icon sm danger" data-x="del" title="حذف">${icon('trash')}</button></td></tr>`);
        $('b', tr).textContent = l.title; $('.muted', tr).textContent = l.kind === 'path' ? l.target : '';
        $('[data-x=copy]', tr).onclick = async () => toast(await copyText(l.url) ? 'تم نسخ الرابط' : l.url, 'ok');
        $('[data-x=open]', tr).onclick = () => window.open(l.url, '_blank');
        $('[data-x=del]', tr).onclick = async () => {
          if (await confirmBox('حذف هذا الرابط؟ لن يعمل بعد الآن.', { ok: 'حذف', danger: true }) && await guard(() => api.del('/api/links/' + l.id))) load();
        };
        $('tbody', t).appendChild(tr);
      }
      sc.innerHTML = ''; sc.appendChild(t);
    }
    $('[data-a=r]', win.body).onclick = load;
    const cb = $('.all', win.body); if (cb) cb.onchange = () => { all = cb.checked; load(); };
    load();
  },
});

// --------------------------------------------------------------------- مراقب النظام
function gauge(pct) {
  const r = 36, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 86 86"><circle class="track" cx="43" cy="43" r="${r}"/>
    <circle class="val" cx="43" cy="43" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(100, pct) / 100)}"
    style="stroke:${pct > 90 ? 'var(--err)' : pct > 70 ? 'var(--warn)' : 'var(--accent)'}"/></svg>`;
}
function drawSpark(cv, a, b) {
  const dpr = devicePixelRatio || 1, w = cv.clientWidth, hh = cv.clientHeight;
  cv.width = w * dpr; cv.height = hh * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const max = Math.max(1, ...a, ...b);
  const css = getComputedStyle(document.documentElement);
  for (const [arr, col] of [[a, css.getPropertyValue('--accent')], [b, '#1aa59a']]) {
    g.beginPath(); arr.forEach((v, i) => { const x = w - (arr.length - 1 - i) * (w / 59); const y = hh - 2 - (v / max) * (hh - 6); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = col; g.lineWidth = 2; g.stroke();
  }
}
registerApp({
  id: 'monitor', title: 'مراقب النظام', icon: 'activity', color: 'linear-gradient(135deg,#11998e,#38ef7d)', width: 900, height: 620,
  open(win) {
    win.body.innerHTML = '<div class="scroll"><div class="cards"></div></div>';
    const cards = $('.cards', win.body);
    let last = null; const up = [], down = []; let built = false;
    function build(s) {
      cards.innerHTML = `
        ${s.cpu != null ? `<div class="card"><h4>${icon('cpu')} المعالج</h4><div class="gauge"><span class="g-cpu"></span><div><div class="big v-cpu"></div><div class="muted">${s.cpu_count} أنوية</div></div></div></div>
        <div class="card"><h4>${icon('memory')} الذاكرة</h4><div class="gauge"><span class="g-mem"></span><div><div class="big v-mem"></div><div class="muted v-mem2"></div></div></div></div>
        <div class="card"><h4>${icon('wifi')} الشبكة</h4><canvas class="spark"></canvas><div class="muted" style="font-size:12px;margin-top:6px">
          <span style="color:var(--accent)">▲ إرسال <b class="v-up"></b></span> &nbsp; <span style="color:#1aa59a">▼ استقبال <b class="v-down"></b></span></div></div>`
          : '<div class="card"><h4>معلومات الأداء</h4><p class="muted">ثبّت المكتبة psutil لعرض المعالج والذاكرة والشبكة.</p></div>'}
        <div class="card span2"><h4>${icon('hdd')} التخزين</h4><div class="vols"></div></div>
        <div class="card"><h4>${icon('server')} النظام</h4><dl class="kv v-info"></dl></div>
        <div class="card"><h4>${icon('phone')} عنوان السيرفر</h4><div class="v-urls"></div><p class="muted" style="font-size:12px">افتحه من أي جهاز على نفس شبكة Wi-Fi.</p></div>
        ${ME.is_admin ? `<div class="card span2"><h4>${icon('shield')} صحة الأقراص و RAID</h4><div class="v-health muted">جارٍ الفحص…</div></div>
          <div class="card"><h4>${icon('save')} النسخ الاحتياطي</h4><div class="v-backup"></div></div>` : ''}
        ${ME.is_admin ? `<div class="card span2"><h4>${icon('clock')} آخر النشاطات</h4><div class="v-recent"></div></div>` : ''}`;
      built = true;
    }
    async function tick() {
      const s = await api.get('/api/system/status').catch(() => null); if (!s) return;
      if (!built) build(s);
      if (s.cpu != null) {
        $('.g-cpu', cards).innerHTML = gauge(s.cpu); $('.v-cpu', cards).textContent = Math.round(s.cpu) + '%';
        $('.g-mem', cards).innerHTML = gauge(s.mem.percent); $('.v-mem', cards).textContent = Math.round(s.mem.percent) + '%';
        $('.v-mem2', cards).textContent = `${fmtSize(s.mem.used)} من ${fmtSize(s.mem.total)}`;
        if (last) {
          const dt = (s.time - last.time) || 1;
          up.push(Math.max(0, (s.net.sent - last.net.sent) / dt)); down.push(Math.max(0, (s.net.recv - last.net.recv) / dt));
          if (up.length > 60) { up.shift(); down.shift(); }
          $('.v-up', cards).textContent = fmtSize(up.at(-1)) + '/ث'; $('.v-down', cards).textContent = fmtSize(down.at(-1)) + '/ث';
          drawSpark($('.spark', cards), up, down);
        }
      }
      $('.vols', cards).innerHTML = s.volumes.map(v => {
        const p = v.used / v.total * 100;
        return `<div style="margin-bottom:12px"><div style="display:flex;gap:8px"><b>${esc(v.labels.join('، '))}</b><span class="grow" style="flex:1"></span>
          <span class="muted">${fmtSize(v.used)} مستخدم من ${fmtSize(v.total)} · <b>${fmtSize(v.free)}</b> متاح</span></div>
          <div class="meter ${p > 90 ? 'err' : p > 75 ? 'warn' : ''}"><div style="width:${p}%"></div></div>
          ${v.path ? `<div class="muted ltr" style="font-size:12px">${esc(v.path)}</div>` : ''}</div>`;
      }).join('');
      $('.v-info', cards).innerHTML = `<dt>الاسم</dt><dd>${esc(s.server_name)} (${esc(s.hostname)})</dd><dt>النظام</dt><dd class="ltr">${esc(s.os)}</dd>
        ${s.uptime ? `<dt>تشغيل الجهاز</dt><dd>${fmtDuration(s.uptime)}</dd>` : ''}<dt>تشغيل السيرفر</dt><dd>${fmtDuration(s.server_uptime)}</dd>
        <dt>الوسائط</dt><dd>${s.media_count} (${fmtSize(s.media_size)})</dd><dt>المستخدمون</dt><dd>${s.users}</dd><dt>روابط المشاركة</dt><dd>${s.links}</dd>
        ${s.indexer.running ? `<dt>الفهرسة</dt><dd>${s.indexer.done}/${s.indexer.total}</dd>` : ''}`;
      $('.v-urls', cards).innerHTML = s.urls.map(u => `<div class="code" style="margin-bottom:6px;display:inline-block">${esc(u)}</div>`).join('<br>');
      if (ME.is_admin && s.recent) $('.v-recent', cards).innerHTML = logTable(s.recent);
      last = s;
    }
    async function health() {
      if (!ME.is_admin || !built) return;
      const r = await api.get('/api/system/health').catch(() => null); if (!r) return;
      const box = $('.v-health', cards); if (!box) return;
      box.classList.remove('muted');
      box.innerHTML = healthHtml(r);
      const b = r.backup;
      $('.v-backup', cards).innerHTML = !b.enabled && !b.last ? '<p class="muted">غير مفعّل. فعّله من لوحة التحكم ← النسخ الاحتياطي.</p>'
        : `<div style="margin-bottom:6px">${b.running ? '<span class="badge accent">يعمل الآن…</span>' : !b.connected ? '<span class="badge err">القرص غير موصول</span>'
          : b.last && !b.last.ok ? '<span class="badge err">فشل آخر نسخ</span>' : '<span class="badge ok">سليم</span>'}</div>
          <dl class="kv"><dt>آخر نسخة ناجحة</dt><dd>${esc(fmtDateTime(b.last_success) || '—')}</dd></dl>`;
    }
    tick(); const t = setInterval(tick, 2000);
    setTimeout(health, 300); const t2 = setInterval(health, 30000);
    win.onClose(() => { clearInterval(t); clearInterval(t2); });
  },
});

export function healthHtml(r) {
  let html = '';
  for (const a of r.alerts) html += `<div class="alert ${a.level}"><b>${esc(a.title)}</b><div>${esc(a.text)}</div></div>`;
  for (const a of r.arrays) {
    const st = !a.healthy ? '<span class="badge err">متدهورة</span>' : a.action ? `<span class="badge warn">${a.action === 'check' ? 'فحص' : 'إعادة بناء'} ${a.progress}%</span>` : '<span class="badge ok">سليمة</span>';
    html += `<div style="margin:8px 0"><b>${esc(a.name)}</b> <span class="muted">${esc(a.level.toUpperCase())}</span> ${st}
      <span class="muted" style="font-size:12px">— ${a.members.map(m => esc(m.dev) + (m.failed ? ' ❌' : '')).join('، ')}</span>
      ${a.progress != null ? `<div class="meter ${a.healthy ? '' : 'err'}"><div style="width:${a.progress}%"></div></div>` : ''}</div>`;
  }
  if (r.disks.length) {
    html += `<table class="tbl" style="margin-top:6px"><thead><tr><th>القرص</th><th>الحجم</th><th>SMART</th><th>الحرارة</th><th>ساعات التشغيل</th></tr></thead><tbody>
      ${r.disks.map(d => `<tr><td><b>${esc(d.name)}</b> <span class="muted" style="font-size:12px">${esc(d.model)}${d.transport ? ' · ' + esc(d.transport) : ''}</span></td>
        <td>${fmtSize(d.size)}</td>
        <td>${d.passed === true ? '<span class="badge ok">سليم</span>' : d.passed === false ? '<span class="badge err">فشل</span>' : '<span class="muted">—</span>'}</td>
        <td>${d.temp != null ? d.temp + '°' : '—'}</td><td>${d.hours != null ? d.hours.toLocaleString('en') : '—'}</td></tr>`).join('')}</tbody></table>`;
  }
  if (!html) html = '<p class="muted">لا توجد بيانات عن الأقراص على هذا الجهاز.</p>';
  else if (!r.alerts.length) html = '<div class="alert ok"><b>كل شيء سليم ✓</b></div>' + html;
  return html;
}

function logTable(rows) {
  if (!rows.length) return '<p class="muted">لا توجد سجلات</p>';
  return `<table class="tbl"><tbody>${rows.map(r => `<tr><td class="muted" style="white-space:nowrap;font-size:12px">${esc(fmtDateTime(r.ts))}</td>
    <td><b>${esc(r.username || '—')}</b></td><td>${esc(r.action)}</td><td class="muted" style="font-size:12px">${esc(r.detail || '')}</td>
    <td class="muted ltr" style="font-size:12px">${esc(r.ip || '')}</td></tr>`).join('')}</tbody></table>`;
}

// --------------------------------------------------------------------- لوحة التحكم
const SECTIONS = [
  { id: 'account', label: 'حسابي', icon: 'user' },
  { id: 'phone', label: 'ربط الآيفون', icon: 'phone' },
  { id: 'users', label: 'المستخدمون', icon: 'users', admin: true },
  { id: 'folders', label: 'المجلدات المشتركة', icon: 'hdd', admin: true },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: 'save', admin: true },
  { id: 'photos', label: 'إعدادات الصور', icon: 'image', admin: true },
  { id: 'general', label: 'عام', icon: 'sliders', admin: true },
  { id: 'logs', label: 'سجل النشاط', icon: 'clock', admin: true },
];

registerApp({
  id: 'control', title: 'لوحة التحكم', icon: 'sliders', color: 'linear-gradient(135deg,#536976,#292e49)', width: 980, height: 640,
  open(win, opts) {
    win.body.innerHTML = `<div class="app"><aside class="app-side"></aside><section class="app-main">
      <div class="toolbar side-toggle-bar" style="display:none"><button class="btn ghost icon side-toggle">${icon('menu')}</button><strong class="st"></strong></div>
      <div class="scroll"></div></section></div>`;
    const side = $('.app-side', win.body), sc = $('.scroll', win.body);
    $('.side-toggle', win.body).onclick = () => side.classList.toggle('open');
    if (matchMedia('(max-width:760px)').matches) $('.side-toggle-bar', win.body).style.display = '';
    const show = (id) => {
      const s = SECTIONS.find(x => x.id === id) || SECTIONS[0];
      $$('.side-item', side).forEach(b => b.classList.toggle('active', b.dataset.s === s.id));
      $('.st', win.body).textContent = s.label; side.classList.remove('open');
      sc.innerHTML = ''; sc.scrollTop = 0; CP[s.id](sc);
    };
    for (const s of SECTIONS.filter(s => !s.admin || ME.is_admin)) {
      if (s.id === 'users') side.appendChild(h('<div class="sect">الإدارة</div>'));
      const b = h(`<button class="side-item" data-s="${s.id}">${icon(s.icon)}<span>${s.label}</span></button>`);
      b.onclick = () => show(s.id); side.appendChild(b);
    }
    win.reopen = (o) => o.section && show(o.section);
    show(opts.section || 'account');
  },
});

function section(sc, title, desc, actions = '') {
  const el = h(`<div><div class="section-h"><h2>${esc(title)}</h2>${actions}</div>${desc ? `<p class="section-p">${desc}</p>` : ''}<div class="pad" style="padding-top:0"></div></div>`);
  sc.appendChild(el); return $('.pad', el);
}

const CP = {
  async account(sc) {
    const me = await guard(() => api.get('/api/me')); if (!me) return;
    const p = section(sc, 'حسابي', `مسجّل باسم <b>${esc(me.username)}</b>${me.is_admin ? ' <span class="badge accent">مدير</span>' : ''}`);
    const card = h(`<div class="card" style="max-width:460px"><h4>${icon('key')} تغيير كلمة المرور</h4>
      <label class="lbl">كلمة المرور الحالية</label><input class="field" type="password" name="old" autocomplete="current-password">
      <label class="lbl">كلمة المرور الجديدة (6 أحرف على الأقل)</label><input class="field" type="password" name="new" autocomplete="new-password">
      <label class="lbl">تأكيد كلمة المرور الجديدة</label><input class="field" type="password" name="new2" autocomplete="new-password">
      <div style="margin-top:14px"><button class="btn primary">حفظ</button></div></div>`);
    $('button', card).onclick = async () => {
      const v = n => $(`[name=${n}]`, card).value;
      if (v('new') !== v('new2')) return toast('كلمتا المرور غير متطابقتين', 'err');
      if (await guard(() => api.post('/api/me/password', { old: v('old'), new: v('new') }))) { toast('تم تغيير كلمة المرور', 'ok'); $$('input', card).forEach(i => i.value = ''); }
    };
    p.appendChild(card);
    const out = h(`<p><a class="btn danger" href="/logout">${icon('logout')} تسجيل الخروج</a></p>`); p.appendChild(out);
  },

  async phone(sc) {
    const [me, st] = await Promise.all([guard(() => api.get('/api/me')), guard(() => api.get('/api/system/status'))]);
    if (!me || !st) return;
    const url = st.urls[0];
    const p = section(sc, 'ربط الآيفون', 'احفظ صور هاتفك على هذا الكمبيوتر عبر شبكة Wi-Fi المنزلية — بدون إنترنت وبدون أي خدمة سحابية.');
    p.appendChild(h(`<div class="cards" style="padding:0">
      <div class="card span2"><h4>${icon('phone')} ١. افتح السيرفر من Safari</h4>
        <ol class="steps"><li>اتصل بنفس شبكة Wi-Fi التي يتصل بها الكمبيوتر.</li>
        <li>افتح Safari واكتب: ${st.urls.map(u => `<span class="code">${esc(u)}</span>`).join(' أو ')}</li>
        <li>بعد تسجيل الدخول اضغط زر المشاركة <b>⎋</b> ثم <b>«إضافة إلى الشاشة الرئيسية»</b> ليظهر كتطبيق.</li>
        <li>لفتح الصور مباشرة استخدم: <span class="code">${esc(url)}/?app=photos</span></li></ol></div>
      <div class="card span2"><h4>${icon('upload')} ٢. رفع الصور</h4>
        <ol class="steps"><li>افتح تطبيق <b>الصور</b> ← <b>رفع</b> ← اختر الصور (يمكنك تحديد مئات الصور).</li>
        <li>الصور المكررة تُتجاهل تلقائياً، فلا مشكلة في رفع نفس الصور مرة أخرى.</li>
        <li>تُحفظ في مجلدك الشخصي <span class="code">Photos/السنة/الشهر</span> حسب تاريخ الالتقاط.</li>
        <li>للحفاظ على صيغة HEIC الأصلية: في نافذة اختيار الصور اضغط <b>«الخيارات»</b> واختر <b>«الحالي»</b> إن ظهر.</li></ol></div>
      <div class="card span2"><h4>${icon('refresh')} ٣. نسخ احتياطي تلقائي (تطبيق «الاختصارات»)</h4>
        <ol class="steps"><li>أنشئ اختصاراً جديداً وأضف: <b>البحث عن صور</b> (مثلاً: تاريخ الإنشاء ضمن آخر يوم).</li>
        <li>أضف <b>تكرار مع كل عنصر</b>، وبداخله <b>الحصول على محتويات URL</b>:</li>
        <li>الرابط: <span class="code">${esc(url)}/api/photos/upload</span> — الطريقة: <b>POST</b></li>
        <li>الترويسات: <span class="code">Authorization</span> = <span class="code">Bearer الرمز</span></li>
        <li>نص الطلب: <b>Form</b> — حقل من نوع <b>ملف</b> اسمه <span class="code">file</span> وقيمته «عنصر التكرار».</li>
        <li>من تبويب <b>الأتمتة</b> شغّله تلقائياً عند الاتصال بشبكة المنزل أو كل ليلة.</li></ol>
        <label class="lbl">رمز API الخاص بك (لا تشاركه مع أحد)</label><div class="tok"></div>
        <button class="btn" style="margin-top:8px">${icon('refresh')} توليد رمز جديد</button></div></div>`));
    const tok = $('.tok', p); tok.appendChild(linkBox(me.api_token));
    $('.tok + .btn', p).onclick = async () => {
      if (!await confirmBox('سيتوقف الرمز القديم عن العمل في الاختصارات. متابعة؟')) return;
      const r = await guard(() => api.post('/api/me/token')); if (r) { tok.innerHTML = ''; tok.appendChild(linkBox(r.api_token)); }
    };
  },

  async users(sc) {
    const p = section(sc, 'المستخدمون', 'لكل مستخدم مجلد شخصي ومكتبة صور خاصة لا يراها غيره. حدد صلاحياته على المجلدات المشتركة.',
      `<button class="btn primary add">${icon('plus')} مستخدم جديد</button>`);
    $('.add', sc).onclick = () => editUser(null, () => { sc.innerHTML = ''; CP.users(sc); });
    const rows = await guard(() => api.get('/api/admin/users')); if (!rows) return;
    const t = h(`<table class="tbl"><thead><tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>الصور</th><th>آخر دخول</th><th></th></tr></thead><tbody></tbody></table>`);
    for (const u of rows) {
      const tr = h(`<tr><td><b></b></td><td>${u.is_admin ? '<span class="badge accent">مدير</span>' : 'مستخدم'}</td>
        <td>${u.disabled ? '<span class="badge err">معطّل</span>' : '<span class="badge ok">نشط</span>'}</td><td>${u.photos}</td>
        <td class="muted">${esc(fmtDateTime(u.last_login) || '—')}</td>
        <td style="white-space:nowrap"><button class="btn sm" data-x="edit">${icon('edit')} تعديل</button>
        ${u.id !== ME.id ? `<button class="btn ghost icon sm danger" data-x="del">${icon('trash')}</button>` : ''}</td></tr>`);
      $('b', tr).textContent = u.username;
      $('[data-x=edit]', tr).onclick = () => editUser(u, () => { sc.innerHTML = ''; CP.users(sc); });
      const del = $('[data-x=del]', tr);
      if (del) del.onclick = async () => {
        const r = await modal({ title: `حذف المستخدم «${u.username}»`, body: `<p>سيُحذف الحساب وألبوماته وروابطه.</p>
          <label class="check"><input type="checkbox" class="df"> حذف ملفاته الشخصية وصوره من القرص أيضاً (لا يمكن التراجع)</label>`,
          buttons: [{ label: 'إلغاء', value: null }, { label: 'حذف', cls: 'danger solid', value: (b) => ({ files: $('.df', b).checked }) }] });
        if (r && await guard(() => api.del(`/api/admin/users/${u.id}${r.files ? '?delete_files=1' : ''}`))) { toast('تم الحذف', 'ok'); sc.innerHTML = ''; CP.users(sc); }
      };
      $('tbody', t).appendChild(tr);
    }
    p.appendChild(t);
  },

  async folders(sc) {
    const p = section(sc, 'المجلدات المشتركة', 'مجلدات يتشاركها أفراد العائلة (أفلام، مستندات، صور العائلة…). يمكنك ربط مجلد موجود مسبقاً على الكمبيوتر مثل <span class="code">D:\\Movies</span>.',
      `<button class="btn primary add">${icon('plus')} مجلد مشترك</button>`);
    const reload = () => { sc.innerHTML = ''; CP.folders(sc); };
    $('.add', sc).onclick = () => editFolder(null, reload);
    const rows = await guard(() => api.get('/api/admin/folders')); if (!rows) return;
    if (!rows.length) { p.appendChild(h(`<div class="empty-state">${icon('hdd')}<p>لا توجد مجلدات مشتركة بعد</p></div>`)); return; }
    const users = await guard(() => api.get('/api/admin/users')) || [];
    const t = h(`<table class="tbl"><thead><tr><th>الاسم</th><th>المسار على الكمبيوتر</th><th>المستخدمون</th><th></th></tr></thead><tbody></tbody></table>`);
    for (const f of rows) {
      const who = Object.entries(f.perms).map(([uid, perm]) => { const u = users.find(x => x.id == uid); return u ? `${esc(u.username)} <span class="muted">(${perm === 'rw' ? 'كتابة' : 'قراءة'})</span>` : ''; }).filter(Boolean).join('، ') || '<span class="muted">المدير فقط</span>';
      const tr = h(`<tr><td><b></b><div class="muted" style="font-size:12px"></div></td><td class="ltr muted" style="font-size:12px"></td><td>${who}</td>
        <td style="white-space:nowrap"><button class="btn sm" data-x="edit">${icon('edit')} الصلاحيات</button>
        <button class="btn ghost icon sm danger" data-x="del">${icon('trash')}</button></td></tr>`);
      $('b', tr).textContent = f.name; $('div.muted', tr).textContent = f.description; $('td.ltr', tr).textContent = f.path + (f.exists ? '' : ' ⚠️');
      $('[data-x=edit]', tr).onclick = () => editFolder(f, reload);
      $('[data-x=del]', tr).onclick = async () => {
        if (await confirmBox(`إزالة المجلد المشترك «${f.name}» من النظام؟ الملفات نفسها تبقى على القرص.`, { ok: 'إزالة', danger: true })
          && await guard(() => api.del('/api/admin/folders/' + f.id))) reload();
      };
      $('tbody', t).appendChild(tr);
    }
    p.appendChild(t);
  },

  async backup(sc) {
    const r = await guard(() => api.get('/api/backup')); if (!r) return;
    const { settings: st, status, target: tg } = r;
    const p = section(sc, 'النسخ الاحتياطي', 'نسخ تلقائي لكل الملفات والصور إلى قرص خارجي. كل نسخة محفوظة كمجلد بالتاريخ، والملفات غير المتغيرة لا تأخذ مساحة إضافية. احتفظ بالقرص في مكان آمن.');
    const last = st.last;
    const stateBadge = status.running ? '<span class="badge accent">يعمل الآن…</span>'
      : !st.target ? '<span class="badge">غير مُعدّ</span>'
      : !tg.connected ? '<span class="badge err">القرص غير موصول</span>'
      : last && !last.ok ? '<span class="badge err">فشل آخر نسخ</span>'
      : last ? '<span class="badge ok">سليم</span>' : '<span class="badge warn">لم يُنسخ بعد</span>';
    const card = h(`<div class="cards" style="padding:0">
      <div class="card"><h4>${icon('shield')} الحالة</h4><div style="margin-bottom:8px">${stateBadge}</div>
        <dl class="kv">
          <dt>آخر نسخة ناجحة</dt><dd>${esc(fmtDateTime(st.last_success) || '—')}</dd>
          ${last ? `<dt>آخر محاولة</dt><dd>${esc(fmtDateTime(last.finished))}<br><span class="muted">${esc(last.ok ? (last.summary || '') : (last.error || last.summary || ''))}</span></dd>` : ''}
          ${tg.connected && tg.total ? `<dt>مساحة القرص</dt><dd>${fmtSize(tg.free)} متاح من ${fmtSize(tg.total)}</dd>` : ''}
          ${tg.connected ? `<dt>النسخ المحفوظة</dt><dd>${tg.mirror && !tg.snapshots.length ? 'مرآة واحدة (القرص لا يدعم الإصدارات)' : tg.snapshots.length}</dd>` : ''}
        </dl>
        <div class="run-st muted" style="font-size:12px;margin-top:8px"></div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary" data-b="run" ${tg.connected && !status.running ? '' : 'disabled'}>${icon('save')} نسخ احتياطي الآن</button>
          ${tg.connected && (tg.snapshots.length || tg.mirror) ? `<button class="btn" data-b="browse">${icon('folder')} استعراض واسترجاع</button>` : ''}
        </div></div>
      <div class="card"><h4>${icon('hdd')} الوجهة والجدولة</h4>
        <label class="lbl">مجلد الوجهة (على القرص الخارجي)</label>
        <input class="field" name="target" dir="ltr" placeholder="${esc(st.suggested || 'E:\\H.SEF-Backup')}">
        ${tg.exists && !tg.initialized ? `<div class="muted" style="font-size:12px;margin-top:6px">⚠️ المجلد موجود لكنه غير مُجهز كوجهة نسخ. اضغط «تجهيز».</div>` : ''}
        ${st.target && !tg.exists ? `<div class="muted" style="font-size:12px;margin-top:6px">⚠️ المجلد غير موجود — صِل القرص.</div>` : ''}
        <label class="check"><input type="checkbox" name="enabled" ${st.enabled ? 'checked' : ''}> نسخ تلقائي كل يوم</label>
        <div style="display:flex;gap:10px">
          <div style="flex:1"><label class="lbl">الساعة</label><select class="field" name="hour">${Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${i === st.hour ? 'selected' : ''}>${String(i).padStart(2, '0')}:00</option>`).join('')}</select></div>
          <div style="flex:1"><label class="lbl">عدد النسخ المحفوظة</label><input class="field" name="keep" type="number" min="1" max="365" value="${st.keep}"></div>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary" data-b="save">حفظ</button>
          ${tg.exists && !tg.initialized ? `<button class="btn" data-b="init">${icon('check')} تجهيز هذا المجلد</button>` : ''}
        </div></div>
      <div class="card span2"><h4>${icon('info')} ما الذي يُنسخ؟</h4>
        <p style="margin:0">${r.sources.map(x => `<span class="code">${esc(x)}</span>`).join(' ')} <span class="code">@system/nas.db</span></p>
        <p class="muted" style="font-size:13px">كل الملفات والصور لكل المستخدمين، والمجلدات المشتركة (حتى المربوطة بأقراص أخرى)، وقاعدة البيانات (الحسابات والألبومات والمفضلة). سلال المحذوفات والمصغرات لا تُنسخ.</p>
        <p class="muted" style="font-size:13px"><b>على جهاز H.SEF المخصص:</b> جهّز قرص USB مرة واحدة من شاشة الجهاز بالأمر
          <span class="code">sudo homenas-disk backup-disk /dev/sdX</span> ثم استخدم المسار <span class="code">/srv/homenas/backup</span>.</p></div></div>`);
    $('[name=target]', card).value = st.target || '';
    const reload = () => { sc.innerHTML = ''; CP.backup(sc); };
    $('[data-b=save]', card).onclick = async () => {
      const d = { target: $('[name=target]', card).value, enabled: $('[name=enabled]', card).checked,
        hour: +$('[name=hour]', card).value, keep: +$('[name=keep]', card).value };
      if (await guard(() => api.post('/api/backup/settings', d))) { toast('تم الحفظ', 'ok'); reload(); }
    };
    const init = $('[data-b=init]', card);
    if (init) init.onclick = async () => { if (await guard(() => api.post('/api/backup/init'))) { toast('أصبح المجلد جاهزاً للنسخ الاحتياطي', 'ok'); reload(); } };
    const browse = $('[data-b=browse]', card);
    if (browse) browse.onclick = () => openApp('files', { path: '/backup', forceNew: false });
    const runBtn = $('[data-b=run]', card);
    runBtn.onclick = async () => { if (await guard(() => api.post('/api/backup/run'))) { toast('بدأ النسخ الاحتياطي', 'ok'); setTimeout(poll, 700); } };
    p.appendChild(card);
    async function poll() {
      const x = await api.get('/api/backup').catch(() => null);
      if (!x || !document.body.contains(card)) return;
      if (x.status.running) {
        runBtn.disabled = true;
        $('.run-st', card).textContent = `جارٍ النسخ: ${x.status.files} ملف (${x.status.copied} جديد) — ${x.status.current}`;
        setTimeout(poll, 1500);
      } else {
        const ok = x.settings.last && x.settings.last.ok;
        toast(ok ? 'اكتمل النسخ الاحتياطي' : 'فشل النسخ الاحتياطي', ok ? 'ok' : 'err');
        window.dispatchEvent(new Event('nas-health'));
        reload();
      }
    }
    if (status.running) poll();
  },

  async photos(sc) {
    const [s, folders] = await Promise.all([guard(() => api.get('/api/admin/settings')), guard(() => api.get('/api/admin/folders'))]);
    if (!s || !folders) return;
    const p = section(sc, 'إعدادات الصور', '');
    const card = h(`<div class="card" style="max-width:560px"><h4>${icon('users')} المساحة المشتركة للصور</h4>
      <p class="muted">بالإضافة إلى المساحة الشخصية لكل مستخدم، يمكنك تخصيص مجلد مشترك كمكتبة صور عائلية. يراها كل من له صلاحية على ذلك المجلد.</p>
      <select class="field"><option value="">— معطّلة —</option>${folders.map(f => `<option value="${f.id}" ${String(f.id) === String(s.photo_shared_folder) ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
      ${folders.length ? '' : '<p class="muted" style="font-size:12px">أنشئ مجلداً مشتركاً أولاً من «المجلدات المشتركة».</p>'}
      <div style="margin-top:14px"><button class="btn primary">حفظ</button></div></div>`);
    $('button', card).onclick = async () => { if (await guard(() => api.post('/api/admin/settings', { photo_shared_folder: $('select', card).value }))) toast('تم الحفظ — بدأت فهرسة المساحة المشتركة', 'ok'); };
    p.appendChild(card);
    p.appendChild(h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('info')} الدعم</h4>
      <dl class="kv"><dt>صور HEIC</dt><dd>${s.heif ? '<span class="badge ok">مدعومة</span>' : '<span class="badge err">غير مدعومة — ثبّت pillow-heif</span>'}</dd>
      <dt>مصغرات الفيديو</dt><dd>${s.ffmpeg ? '<span class="badge ok">مفعّلة (ffmpeg)</span>' : '<span class="badge warn">ثبّت ffmpeg لتفعيلها (اختياري)</span>'}</dd></dl></div>`));
  },

  async general(sc) {
    const s = await guard(() => api.get('/api/admin/settings')); if (!s) return;
    const p = section(sc, 'عام', '');
    const card = h(`<div class="card" style="max-width:560px"><h4>${icon('server')} اسم السيرفر</h4>
      <input class="field" maxlength="40"><div style="margin-top:14px"><button class="btn primary">حفظ</button></div></div>`);
    $('input', card).value = s.server_name;
    $('button', card).onclick = async () => { if (await guard(() => api.post('/api/admin/settings', { server_name: $('input', card).value }))) { toast('تم الحفظ', 'ok'); document.title = $('input', card).value; } };
    p.appendChild(card);
    p.appendChild(h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('info')} معلومات</h4><dl class="kv">
      <dt>مجلد البيانات</dt><dd class="ltr">${esc(s.data_dir)}</dd><dt>المنفذ</dt><dd>${s.port}</dd>
      <dt>مراقبة الأداء</dt><dd>${s.psutil ? '<span class="badge ok">مفعّلة</span>' : '<span class="badge warn">ثبّت psutil</span>'}</dd></dl>
      <p class="muted" style="font-size:12px">لتغيير المنفذ أو مجلد البيانات شغّل: <span class="code">python server.py --port 9000 --data "D:\\NAS"</span></p></div>`));
    if (s.appliance) {
      const tz = await guard(() => api.get('/api/admin/timezone'));
      if (tz) {
        const card = h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('clock')} المنطقة الزمنية</h4>
          <p class="muted">تُستخدم في سجل النشاط وتواريخ الملفات. الحالية: <b class="ltr"></b></p>
          <select class="field" dir="ltr"></select><div style="margin-top:14px"><button class="btn primary">حفظ</button></div></div>`);
        $('b', card).textContent = tz.current;
        $('select', card).innerHTML = tz.zones.map(z => `<option ${z === tz.current ? 'selected' : ''}>${esc(z)}</option>`).join('');
        $('button', card).onclick = async () => {
          const v = $('select', card).value;
          if (await guard(() => api.post('/api/admin/timezone', { tz: v }))) { $('b', card).textContent = v; toast('تم تغيير المنطقة الزمنية', 'ok'); }
        };
        p.appendChild(card);
      }
      const pw = h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('server')} تشغيل الجهاز</h4>
        <p class="muted">إعادة تشغيل جهاز السيرفر أو إيقافه بأمان. بعد الإيقاف شغّله من زر الطاقة.</p>
        <button class="btn" data-p="reboot">${icon('refresh')} إعادة التشغيل</button>
        <button class="btn danger" data-p="poweroff">${icon('logout')} إيقاف التشغيل</button></div>`);
      $$('[data-p]', pw).forEach(b => b.onclick = async () => {
        const off = b.dataset.p === 'poweroff';
        if (!await confirmBox(off ? 'إيقاف تشغيل جهاز السيرفر؟ لن يمكن الوصول إليه حتى تشغّله يدوياً.' : 'إعادة تشغيل جهاز السيرفر؟ سيعود خلال دقيقة أو دقيقتين.',
          { ok: off ? 'إيقاف' : 'إعادة التشغيل', danger: off })) return;
        if (await guard(() => api.post('/api/admin/power', { action: b.dataset.p }))) toast(off ? 'جارِ إيقاف التشغيل…' : 'جارِ إعادة التشغيل…', 'ok');
      });
      p.appendChild(pw);
    }
  },

  async logs(sc) {
    const p = section(sc, 'سجل النشاط', '', `<input class="field q" placeholder="بحث…" style="width:200px">`);
    let offset = 0; const box = h('<div></div>'); const more = h('<button class="btn" style="margin-top:10px">تحميل المزيد</button>');
    p.appendChild(box); p.appendChild(more);
    const load = async (reset) => {
      if (reset) { offset = 0; box.innerHTML = ''; }
      const rows = await guard(() => api.get(`/api/admin/logs?offset=${offset}&q=${encodeURIComponent($('.q', sc).value)}`)); if (!rows) return;
      offset += rows.length; box.insertAdjacentHTML('beforeend', logTable(rows)); more.classList.toggle('hidden', rows.length < 100);
    };
    more.onclick = () => load(false);
    let t; $('.q', sc).oninput = () => { clearTimeout(t); t = setTimeout(() => load(true), 300); };
    load(true);
  },
};

function permSeg(value, onChange) {
  const seg = h(`<div class="seg"><button data-v="">لا شيء</button><button data-v="ro">قراءة</button><button data-v="rw">قراءة وكتابة</button></div>`);
  const set = v => { value = v; $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === v)); onChange(v); };
  $$('button', seg).forEach(b => b.onclick = () => set(b.dataset.v)); set(value || '');
  return seg;
}

async function editUser(u, done) {
  const folders = await guard(() => api.get('/api/admin/folders')) || [];
  const perms = u ? await guard(() => api.get(`/api/admin/users/${u.id}/perms`)) || {} : {};
  const body = h(`<div>
    ${u ? '' : '<label class="lbl">اسم المستخدم (أحرف إنجليزية وأرقام)</label><input class="field" name="username" dir="ltr" autocomplete="off">'}
    <label class="lbl">${u ? 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور (6 أحرف على الأقل)'}</label><input class="field" name="password" type="password" autocomplete="new-password">
    <label class="check"><input type="checkbox" name="is_admin" ${u && u.is_admin ? 'checked' : ''}> مدير (صلاحية كاملة على كل شيء)</label>
    ${u ? `<label class="check"><input type="checkbox" name="disabled" ${u.disabled ? 'checked' : ''}> تعطيل الحساب</label>` : ''}
    ${folders.length ? '<label class="lbl">الصلاحيات على المجلدات المشتركة</label><div class="perm-grid"></div>' : ''}</div>`);
  const grid = $('.perm-grid', body);
  for (const f of folders) {
    grid.appendChild(h(`<span>${icon('hdd')} ${esc(f.name)}</span>`));
    grid.appendChild(permSeg(perms[f.id] || '', v => { perms[f.id] = v; }));
  }
  const ok = await modal({ title: u ? `تعديل «${u.username}»` : 'مستخدم جديد', body, wide: true, buttons: [{ label: 'إلغاء', value: null }, {
    label: 'حفظ', cls: 'primary', value: true, validate: async (b) => {
      const v = n => $(`[name=${n}]`, b);
      const data = { password: v('password').value, is_admin: v('is_admin').checked, perms };
      if (u) { data.disabled = v('disabled').checked; if (!data.password) delete data.password; }
      else data.username = v('username').value.trim();
      return !!await guard(() => u ? api.patch(`/api/admin/users/${u.id}`, data) : api.post('/api/admin/users', data));
    } }] });
  if (ok) { toast('تم الحفظ', 'ok'); done(); }
}

async function editFolder(f, done) {
  const users = (await guard(() => api.get('/api/admin/users')) || []).filter(u => !u.is_admin);
  const perms = { ...(f ? f.perms : {}) };
  const body = h(`<div>
    ${f ? '' : `<label class="lbl">اسم المجلد</label><input class="field" name="name" placeholder="مثال: أفلام">
      <label class="lbl">المسار على الكمبيوتر (اختياري)</label><input class="field" name="path" dir="ltr" placeholder="D:\\Movies">
      <div class="muted" style="font-size:12px;margin-top:4px">اتركه فارغاً لإنشاء مجلد جديد داخل مجلد بيانات النظام، أو اكتب مسار مجلد موجود لمشاركته.</div>`}
    <label class="lbl">الوصف</label><input class="field" name="description">
    <label class="lbl">صلاحيات المستخدمين (المدير يملك صلاحية كاملة دائماً)</label>
    <div class="perm-grid"></div>${users.length ? '' : '<p class="muted">لا يوجد مستخدمون عاديون بعد.</p>'}</div>`);
  $('[name=description]', body).value = f ? f.description : '';
  const grid = $('.perm-grid', body);
  for (const u of users) {
    grid.appendChild(h(`<span>${icon('user')} ${esc(u.username)}</span>`));
    grid.appendChild(permSeg(perms[u.id] || '', v => { perms[u.id] = v; }));
  }
  const ok = await modal({ title: f ? `صلاحيات «${f.name}»` : 'مجلد مشترك جديد', body, wide: true, buttons: [{ label: 'إلغاء', value: null }, {
    label: 'حفظ', cls: 'primary', value: true, validate: async (b) => {
      const data = { description: $('[name=description]', b).value, perms };
      if (!f) { data.name = $('[name=name]', b).value.trim(); data.path = $('[name=path]', b).value.trim(); }
      return !!await guard(() => f ? api.patch('/api/admin/folders/' + f.id, data) : api.post('/api/admin/folders', data));
    } }] });
  if (ok) { toast('تم الحفظ', 'ok'); done(); }
}
