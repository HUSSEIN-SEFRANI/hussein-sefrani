// ====================================================================
// تطبيقات: روابط المشاركة، مراقب النظام، لوحة التحكم
// ====================================================================
import {
  ME, $, $$, h, esc, icon, api, guard, toast, modal, form, confirmBox, registerApp, openApp, linkBox, copyText,
  fmtSize, fmtDateTime, fmtDuration, download,
} from '../core.js';
import { tvSection } from './tvadmin.js';
import { deviceSection } from './device.js';

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
        const tr = h(`<tr><td translate="no"><b></b><div class="muted ltr" style="font-size:12px"></div></td>
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
      $('.v-info', cards).innerHTML = `<dt>الإصدار</dt><dd translate="no">HOME ANAB v${esc(s.version)}</dd><dt>الاسم</dt><dd>${esc(s.server_name)} (${esc(s.hostname)})</dd><dt>النظام</dt><dd class="ltr">${esc(s.os)}</dd>
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
// البند 29 (v1.9.9): قائمة واحدة بترتيب صاحب المشروع (بلا مجموعات). القسم الذي فيه tabs يعرض أجزاءه تبويبات في أعلى الصفحة،
// وأسماء الأجزاء القديمة (folders، photos، network) تبقى تعمل في openApp('control', { section }) فتفتح القسم على تبويبها.
// keys: كلمات إضافية للبحث
const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: 'grid', admin: true, keys: 'الحالة ملخص تنبيهات' },
  { id: 'general', label: 'عام', icon: 'sliders', admin: true, keys: 'اسم السيرفر المنطقة الزمنية تحديث إصدار بدون إنترنت' },
  { id: 'account', label: 'حسابي', icon: 'user', keys: 'كلمة المرور الخلفية الصورة اللغة خروج' },
  { id: 'users', label: 'المستخدمون', icon: 'users', admin: true, keys: 'حساب مستخدم جديد صلاحيات أطفال' },
  { id: 'files', label: 'الملفات والصور', icon: 'image', tabs: [
    { id: 'folders', label: 'المجلدات المشتركة', admin: true, keys: 'مشاركة صلاحيات الألعاب التعليم' },
    { id: 'photos', label: 'إعدادات الصور', admin: true, keys: 'الوجوه الأشخاص تمييز فهرسة' }] },
  { id: 'phone', label: 'ربط الآيفون والأندرويد', icon: 'phone', keys: 'هاتف صور آيفون أندرويد اندرويد سامسونج مزامنة' },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: 'save', admin: true, keys: 'قرص خارجي نسخة استعادة استرجاع يومي أسبوعي شهري usb فلاشة' },
  { id: 'tv', label: 'وضع التلفاز', icon: 'video', admin: true, keys: 'شاشة مربعات ألعاب تعليم أذان مواقيت الصلاة خلفية شاشة التوقف' },
  { id: 'hostname', label: 'اسم الجهاز على الشبكة', icon: 'wifi', tabs: [
    { id: 'hostname', label: 'اسم الجهاز', admin: true, keys: 'hsef local اسم الشبكة عنوان جهازين' },
    { id: 'network', label: 'قرص الشبكة والتلفاز الذكي', keys: 'SMB DLNA ويندوز سامبا ماك قرص الشبكة التلفاز الذكي' }] },
  { id: 'remote', label: 'من خارج المنزل', icon: 'shield', admin: true, keys: 'إنترنت وصول بعيد tailscale البيت' },
  { id: 'activation', label: 'التفعيل', icon: 'key', admin: true, keys: 'كود رقم الجهاز تجربة' },
  { id: 'transfer', label: 'التصدير والاستيراد وإعادة الضبط', icon: 'refresh', admin: true, keys: 'تصدير استيراد نقل جهاز جديد ملف anab إعادة ضبط المصنع مسح بداية جديدة' },
  { id: 'storage', label: 'إدارة التخزين', icon: 'hdd', admin: true, keys: 'قرص اقراص هارد RAID مرآة مساحة ممتلئ SMART صحة حرارة سلة' },
  { id: 'cpu', label: 'المعالج', icon: 'cpu', admin: true, keys: 'معالج حرارة ساخن مروحة بطء استهلاك intel amd' },
  { id: 'device', label: 'الشبكة والأجهزة', icon: 'server', admin: true, keys: 'وايفاي wifi بلوتوث قبضة يد تحكم سماعة تعريفات عتاد صوت IP كابل' },
  { id: 'addons', label: 'الإضافات', icon: 'store', admin: true, keys: 'إضافة اضافة تطبيق جانبي zip واتساب واتس' },
  { id: 'logs', label: 'سجل النشاط', icon: 'clock', admin: true, keys: 'سجل من فعل ماذا' },
];
// القسم الأب لكل تبويب (لفتح الروابط القديمة على التبويب الصحيح)
const TAB_PARENT = Object.fromEntries(SECTIONS.flatMap((s) => (s.tabs || []).map((t) => [t.id, s.id])));

// رموز QR محلية (بدون إنترنت): تُحمَّل عند الحاجة فقط
let qrReady = null;
function loadQR() {
  if (window.HSEF_QR) return Promise.resolve();
  qrReady = qrReady || ['/static/vendor/qrcode.js', '/static/js/qr.js'].reduce((p, src) => p.then(() => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  })), Promise.resolve());
  return qrReady;
}

function activationSection(sc) {
  const p = section(sc, 'التفعيل', 'لكل جهاز رقم خاص، وكود التفعيل يُصنع لهذا الرقم فقط ويعمل بدون إنترنت.');
  const c = h('<div class="card" style="max-width:620px"><div class="muted">جارٍ القراءة…</div></div>');
  p.appendChild(c);
  p.appendChild(h(`<div class="card" style="max-width:620px;margin-top:14px"><h4>${icon('info')} بعد انتهاء المدة</h4>
    <p class="small" style="margin:0 0 6px">تبقى <b>الملفات والصور والتلفاز والنسخ الاحتياطي</b> تعمل كالعادة.</p>
    <p class="small muted" style="margin:0">تتوقف فقط <b>تحديثات النظام وتثبيت تطبيقات جديدة</b> من مركز التطبيقات، حتى تُدخل كود التجديد.</p></div>`));
  const draw = (s) => {
    const badge = s.state === 'free' ? '<span class="badge ok">مفعّل بدون تاريخ انتهاء</span>'
      : s.state === 'active' ? `<span class="badge ${s.warn ? 'warn' : 'ok'}">مفعّل حتى <bdi>${esc(s.expiry_text)}</bdi> · باقي ${s.days_left} يوماً</span>`
      : s.state === 'trial' ? `<span class="badge warn">تجربة مجانية: باقي ${s.days_left} يوماً (حتى <bdi>${esc(s.expiry_text)}</bdi>)</span>`
      : s.state === 'expired' ? `<span class="badge err">${s.was === 'trial' ? 'انتهت التجربة المجانية' : 'انتهى التفعيل'} في <bdi>${esc(s.ended_text)}</bdi></span>`
      : '<span class="badge">لم تُقرأ حالة التفعيل بعد</span>';
    c.innerHTML = `<h4>${icon('key')} حالة هذا الجهاز</h4>
      <p style="margin:0 0 12px">${badge}</p>
      ${s.problem ? `<p class="alert warn small">${esc(s.problem)}</p>` : ''}
      ${s.device ? `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <span class="act-qr" title="امسح الرمز بكاميرا الهاتف لإرسال رقم الجهاز عبر واتساب"></span>
        <div style="min-width:0"><div class="muted small">رقم هذا الجهاز</div>
          <div class="act-dev-big" translate="no">${esc(s.display)}</div>
          <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">
            <button class="btn sm" data-a="copy">${icon('copy')} نسخ الرقم</button>
            <a class="btn sm" href="${esc(s.whatsapp)}" target="_blank" rel="noopener">إرسال الرقم للبائع عبر واتساب</a></div></div></div>` : ''}
      <label class="lbl">كود التفعيل</label>
      <textarea class="field act-code" placeholder="HA1-…" autocapitalize="characters" spellcheck="false"></textarea>
      <p class="muted small" style="margin:6px 0 10px">الصقه كما وصلك في واتساب، أو اضغط الرابط الذي في الرسالة.</p>
      <button class="btn primary" data-a="go">${icon('check')} تفعيل الكود</button>`;
    if (s.device) loadQR().then(() => { const q = $('.act-qr', c); if (q) q.innerHTML = window.HSEF_QR(s.whatsapp); }).catch(() => { const q = $('.act-qr', c); if (q) q.remove(); });
    const cp = $('[data-a=copy]', c);
    if (cp) cp.onclick = async () => toast(await copyText(s.display) ? 'تم نسخ رقم الجهاز' : s.display, 'ok');
    $('[data-a=go]', c).onclick = async () => {
      const code = $('textarea', c).value.trim();
      if (!code) { toast('الصق كود التفعيل أولاً', 'err'); return; }
      const r = await guard(() => api.post('/api/activation', { code }));
      if (!r) return;
      toast(r.message, 'ok');
      dispatchEvent(new CustomEvent('nas-activation', { detail: r.status }));
      draw(r.status);
    };
  };
  api.get('/api/activation').then(draw).catch(() => { c.innerHTML = '<p class="muted">تعذر الاتصال بالسيرفر</p>'; });
}

registerApp({
  id: 'control', title: 'لوحة التحكم', icon: 'sliders', color: 'linear-gradient(135deg,#536976,#292e49)', width: 980, height: 640,
  open(win, opts) {
    win.body.innerHTML = `<div class="app"><aside class="app-side"></aside><section class="app-main">
      <div class="toolbar side-toggle-bar" style="display:none"><button class="btn ghost icon side-toggle">${icon('menu')}</button><strong class="st"></strong></div>
      <div class="scroll"></div></section></div>`;
    const side = $('.app-side', win.body), sc = $('.scroll', win.body);
    $('.side-toggle', win.body).onclick = () => side.classList.toggle('open');
    if (matchMedia('(max-width:760px)').matches) $('.side-toggle-bar', win.body).style.display = '';
    // للمستخدم العادي: الأقسام والتبويبات المسموحة فقط (القسم الذي لم يبق فيه تبويب يختفي)
    const ok = (x) => !x.admin || ME.is_admin;
    const mine = SECTIONS.filter(ok).map((s) => (s.tabs ? { ...s, tabs: s.tabs.filter(ok) } : s)).filter((s) => !s.tabs || s.tabs.length);
    const show = (id) => {
      const s = mine.find(x => x.id === (TAB_PARENT[id] || id)) || mine[0];
      $$('.side-item', side).forEach(b => b.classList.toggle('active', b.dataset.s === s.id));
      $('.st', win.body).textContent = s.label; side.classList.remove('open');
      sc.innerHTML = ''; sc.scrollTop = 0;
      if (!s.tabs) { CP[s.id](sc, show); return; }
      // قسم بتبويبات: شريط في الأعلى، والجزء المختار تحته
      const tab = s.tabs.find((t) => t.id === id) || s.tabs[0];
      const bar = h(`<div class="cp-tabs" role="tablist">${s.tabs.map((t) => `<button role="tab" class="${t.id === tab.id ? 'on' : ''}" data-t="${t.id}">${esc(t.label)}</button>`).join('')}</div>`);
      const body = h('<div></div>');
      sc.appendChild(bar); sc.appendChild(body);
      $$('[data-t]', bar).forEach((b) => (b.onclick = () => {
        $$('[data-t]', bar).forEach((x) => x.classList.toggle('on', x === b));
        body.innerHTML = ''; CP[b.dataset.t](body, show);
      }));
      CP[tab.id](body, show);
    };
    // مربع البحث: يُظهر الأقسام التي في اسمها أو كلماتها ما كُتب، و Enter يفتح أولها
    const search = h(`<div class="side-search"><input class="field" type="search" placeholder="بحث في الإعدادات…" aria-label="بحث في الإعدادات"></div>`);
    side.appendChild(search);
    const norm = (t) => String(t).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    const words = (s) => [s.label, s.keys || '', ...(s.tabs || []).map((t) => `${t.label} ${t.keys || ''}`)].join(' ');
    const item = (s) => { const b = h(`<button class="side-item" data-s="${s.id}" data-q="${esc(norm(words(s)))}">${icon(s.icon)}<span>${s.label}</span></button>`); b.onclick = () => show(s.id); return b; };
    for (const s of mine) side.appendChild(item(s));
    const inp = $('input', search);
    inp.oninput = () => {
      const q = norm(inp.value.trim());
      $$('.side-item', side).forEach(b => b.hidden = !!q && !b.dataset.q.includes(q));
    };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { const b = $$('.side-item', side).find(x => !x.hidden); if (b) { show(b.dataset.s); inp.value = ''; inp.oninput(); } } };
    win.reopen = (o) => o.section && show(o.section);
    show(opts.section || (ME.is_admin ? 'overview' : 'account'));
  },
});

function section(sc, title, desc, actions = '') {
  const el = h(`<div><div class="section-h"><h2>${esc(title)}</h2>${actions}</div>${desc ? `<p class="section-p">${desc}</p>` : ''}<div class="pad" style="padding-top:0"></div></div>`);
  sc.appendChild(el); return $('.pad', el);
}

// البند 22: القراءة والكتابة على القرص (ميغابايت/ثانية) ومن يستعملها
const mbs = (b) => `${(b / 1048576).toFixed(b >= 10 * 1048576 ? 0 : 1)} MB/s`;
function ioHtml(d, n = 8) {
  const top = (d.top || []).slice(0, n);
  return `<div class="ov-row"><span>⬇ قراءة</span><b dir="ltr" translate="no">${mbs(d.read)}</b></div>
    <div class="ov-row"><span>⬆ كتابة</span><b dir="ltr" translate="no">${mbs(d.write)}</b></div>
    ${top.length ? `<div class="muted small" style="margin:8px 0 2px">يستعمل القرص الآن:</div>${top.map((x) => `<div class="ov-row small"><span>${esc(x.name)}</span>
      <span class="muted" dir="ltr" translate="no">⬇${mbs(x.read)} ⬆${mbs(x.write)}</span></div>`).join('')}`
      : '<div class="muted small" style="margin-top:8px">لا يوجد برنامج يستعمل القرص الآن.</div>'}`;
}

const CP = {
  // نظرة عامة: حالة كل شيء بنظرة واحدة، وكل بطاقة تفتح قسمها
  async overview(sc, go) {
    const p = section(sc, 'نظرة عامة', 'حالة الجهاز بنظرة واحدة. اضغط أي بطاقة لتفتح قسمها.');
    const box = h('<div class="ov-grid"><div class="muted">جارٍ القراءة…</div></div>');
    p.appendChild(box);
    const [st, he, ac] = await Promise.all([api.get('/api/system/status').catch(() => null),
      api.get('/api/system/health').catch(() => null), api.get('/api/activation').catch(() => null)]);
    const card = (to, ic, title, body, cls = '') => `<button class="card ov-card ${cls}" data-go="${to}"><div class="ov-h">${icon(ic)} ${title}</div>${body}</button>`;
    const bar = (pct, warn) => `<div class="ov-bar"><i style="width:${Math.min(100, Math.max(1, pct))}%" class="${warn ? 'warn' : ''}"></i></div>`;
    const alerts = he ? he.alerts || [] : [];
    const cards = [];
    cards.push(card(alerts.length ? (alerts.some(a => a.level === 'err') ? 'backup' : 'device') : 'overview', alerts.length ? 'info' : 'check',
      alerts.length ? `تنبيهات (${alerts.length})` : 'كل شيء سليم',
      alerts.length ? `<ul class="ov-list">${alerts.slice(0, 4).map(a => `<li class="${a.level === 'err' ? 'err' : 'warn'}"><b>${esc(a.title)}</b><span>${esc(a.text)}</span></li>`).join('')}</ul>`
        : '<p class="muted small">لا توجد مشاكل في الأقراص أو المساحة أو النسخ الاحتياطي.</p>', alerts.some(a => a.level === 'err') ? 'err' : alerts.length ? 'warn' : 'ok'));
    if (st) {
      const vols = (st.volumes || []).map(v => { const pct = v.total ? (100 * v.used) / v.total : 0;
        return `<div class="ov-vol"><div class="ov-row"><span translate="no">${esc(v.labels.slice(0, 3).join('، '))}${v.labels.length > 3 ? '…' : ''}</span>
          <span class="muted small" translate="no" dir="ltr">${fmtSize(v.used)} / ${fmtSize(v.total)}</span></div>${bar(pct, pct > 90)}</div>`; }).join('');
      const raid = he && he.arrays && he.arrays.length ? `<p class="small" style="margin:8px 0 0">RAID: ${he.arrays.map(a => `<span class="badge ${a.healthy ? 'ok' : 'err'}" translate="no">${esc(a.name)} ${a.healthy ? 'سليم' : 'متدهور'}</span>`).join(' ')}</p>` : '';
      cards.push(card('storage', 'hdd', 'التخزين', (vols || '<p class="muted small">لا توجد معلومات</p>') + raid));
      cards.push(card('cpu', 'cpu', 'الجهاز', `
        ${st.cpu != null ? `<div class="ov-row"><span>المعالج</span><span translate="no" dir="ltr">${Math.round(st.cpu)}%</span></div>${bar(st.cpu, st.cpu > 85)}` : ''}
        ${st.mem ? `<div class="ov-row"><span>الذاكرة</span><span translate="no" dir="ltr">${Math.round(st.mem.percent)}%</span></div>${bar(st.mem.percent, st.mem.percent > 90)}` : ''}
        <p class="muted small" style="margin:8px 0 0">${st.uptime ? `يعمل منذ ${esc(fmtDuration(st.uptime))} · ` : ''}الإصدار <span translate="no">${esc(st.version)}</span></p>`));
    }
    if (he && he.backup) {
      const b = he.backup;
      cards.push(card('backup', 'save', 'النسخ الاحتياطي', !b.enabled ? '<p class="small"><span class="badge warn">متوقف</span></p><p class="muted small">فعّله لتحفظ نسخة من ملفاتك على قرص خارجي.</p>'
        : `<p class="small" style="margin:0 0 6px">${b.running ? '<span class="badge accent">يعمل الآن</span>' : b.connected ? '<span class="badge ok">القرص موصول</span>' : '<span class="badge warn">قرص النسخ غير موصول</span>'}</p>
           <p class="muted small" style="margin:0">آخر نسخة ناجحة: ${b.last_success ? `<bdi>${esc(fmtDateTime(b.last_success))}</bdi>` : 'لا توجد بعد'}</p>`));
    }
    if (st) cards.push(card('users', 'users', 'العائلة والملفات', `<div class="ov-row"><span>المستخدمون</span><b translate="no">${st.users}</b></div>
      <div class="ov-row"><span>الصور والفيديو</span><b translate="no">${(st.media_count || 0).toLocaleString('en')}</b></div>
      <div class="ov-row"><span>روابط المشاركة</span><b translate="no">${st.links || 0}</b></div>`));
    if (ac) cards.push(card('activation', 'key', 'التفعيل', `<p class="small" style="margin:0">${ac.state === 'free' ? '<span class="badge ok">مفعّل</span>'
      : ac.state === 'active' ? `<span class="badge ${ac.warn ? 'warn' : 'ok'}">مفعّل · باقي ${ac.days_left} يوماً</span>`
      : ac.state === 'trial' ? `<span class="badge warn">تجربة: باقي ${ac.days_left} يوماً</span>`
      : ac.state === 'expired' ? '<span class="badge err">منتهٍ</span>' : '<span class="badge">—</span>'}</p>`));
    if (st) cards.push(card('storage', 'activity', 'القرص الآن', '<div class="ov-io muted small">جارٍ القياس…</div>'));
    box.innerHTML = cards.join('') || '<p class="muted">تعذر الاتصال بالسيرفر</p>';
    $$('[data-go]', box).forEach(b => { if (b.dataset.go === 'overview') b.disabled = true; else b.onclick = () => go(b.dataset.go); });
    // البند 22: القراءة والكتابة على القرص، ومن يستعمله (يُقاس ثانيتين، فلا يؤخر بقية البطاقات)
    const io = $('.ov-io', box);
    if (io) {
      const loadIo = async () => {
        const d = await api.get('/api/admin/disk-io').catch(() => null);
        if (!io.isConnected) return;
        if (!d || !d.available) { io.textContent = 'غير متاح على هذا الجهاز.'; return; }
        io.classList.remove('muted', 'small');
        io.innerHTML = ioHtml(d, 3);
        setTimeout(loadIo, 5000);
      };
      loadIo();
    }
  },

  // البند 6 و15 و29: حفظ الإعدادات في ملف على الكمبيوتر واستيرادها، وإعادة ضبط المصنع
  async transfer(sc) {
    const st = await guard(() => api.get('/api/admin/transfer')); if (!st) return;
    const p = section(sc, 'التصدير والاستيراد وإعادة الضبط',
      'انقل إعدادات هذا الجهاز إلى جهاز HOME ANAB آخر بملف على الكمبيوتر، أو ابدأ هذا الجهاز من جديد. الملفات والصور تُنقل بقرص «النسخ الاحتياطي».');
    const reload = () => { sc.innerHTML = ''; CP.transfer(sc); };
    const tr = st;
    // ---- حفظ الإعدادات في ملف واستيرادها
    if (tr && (tr.pending_import || tr.pending_reset)) {
      const w = h(`<div class="alert warn" style="margin-bottom:14px"><b>${tr.pending_reset ? 'إعادة ضبط المصنع' : 'استيراد الإعدادات'} ينتظر إعادة التشغيل.</b>
        ${tr.appliance ? 'يُطبَّق خلال لحظات.' : 'أعد تشغيل البرنامج ليُطبَّق.'} <button class="btn sm" data-x="cancel">إلغاء</button></div>`);
      $('[data-x=cancel]', w).onclick = async () => { if (await guard(() => api.del(tr.pending_reset ? '/api/admin/transfer/reset' : '/api/admin/transfer/import'))) { toast('أُلغي', 'ok'); reload(); } };
      p.appendChild(w);
    }
    const pc = h(`<div class="cards" style="padding:0">
      <div class="card"><h4>${icon('download')} حفظ الإعدادات في ملف على الكمبيوتر</h4>
        <p class="muted small" style="margin:0 0 10px">ملف صغير ‎.anab مشفّر بكلمة سر، فيه الإعدادات فقط. لنقلها إلى جهاز HOME ANAB آخر. الملفات والصور تُنقل بقرص «النسخ الاحتياطي».</p>
        <div class="tv-grid"><label>كلمة سر الملف<input class="field" type="password" name="pw" autocomplete="new-password"></label>
          <label>أعد كتابتها<input class="field" type="password" name="pw2" autocomplete="new-password"></label></div>
        <p class="alert warn small" style="margin:8px 0">احفظ كلمة السر: بدونها لا يمكن فتح الملف أبداً.</p>
        <button class="btn primary" data-x="export" ${tr && tr.openssl ? '' : 'disabled'}>${icon('download')} تنزيل ملف الإعدادات</button></div>
      <div class="card"><h4>${icon('upload')} الاستيراد من الكمبيوتر</h4>
        <p class="muted small" style="margin:0 0 10px">ملف ‎.anab من هذا الجهاز أو من جهاز آخر. يستبدل الإعدادات والمستخدمين (تُحفظ نسخة من الحالية)، ثم يُعاد تشغيل البرنامج. إعدادات عتاد هذا الجهاز تبقى.</p>
        <input class="field" type="file" name="f" accept=".anab">
        <label class="lbl">كلمة سر الملف</label><input class="field" type="password" name="ipw" autocomplete="off">
        <div style="margin-top:12px"><button class="btn" data-x="import" ${tr && tr.openssl ? '' : 'disabled'}>${icon('upload')} استيراد</button> <span class="muted small im-st"></span></div></div></div>`);
    p.appendChild(pc);
    $('[data-x=export]', pc).onclick = async (e) => {
      const pw = $('[name=pw]', pc).value;
      if (pw.length < 6) return toast('كلمة السر 6 أحرف على الأقل', 'err');
      if (pw !== $('[name=pw2]', pc).value) return toast('كلمتا السر غير متطابقتين', 'err');
      e.target.disabled = true;
      const x = await guard(() => api.post('/api/admin/transfer/export', { password: pw, files: false }));
      e.target.disabled = false;
      if (!x) return;
      $$('input[type=password]', pc).forEach((i) => (i.value = ''));
      download(`${x.url}?name=${encodeURIComponent(x.name)}`);
      toast(`جاهز: ${x.name} (${fmtSize(x.size)})`, 'ok');
    };
    $('[data-x=import]', pc).onclick = async (e) => {
      const f = $('[name=f]', pc).files[0], pw = $('[name=ipw]', pc).value;
      if (!f || !pw) return toast('اختر الملف واكتب كلمة سره', 'err');
      if (!await confirmBox('ستُستبدل إعدادات هذا الجهاز ومستخدموه بما في الملف، ثم يُعاد تشغيل البرنامج. متابعة؟', { ok: 'استيراد' })) return;
      const fd = new FormData(); fd.append('file', f); fd.append('password', pw);
      e.target.disabled = true; $('.im-st', pc).textContent = 'جارٍ الرفع والفحص…';
      try {
        const res = await fetch('/api/admin/transfer/import', { method: 'POST', body: fd, headers: { 'X-Requested-With': 'fetch' } });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || `خطأ ${res.status}`);
        const m = j.manifest;
        $('.im-st', pc).textContent = '';
        await modal({ title: '✅ الملف سليم', body: h(`<div><p>من «<b translate="no">${esc(m.server_name || '')}</b>»، بتاريخ <bdi>${esc(fmtDateTime(m.created))}</bdi>، فيه ${m.users} مستخدم.</p>
          <p class="muted">${j.restart ? 'يُعاد تشغيل البرنامج الآن. انتظر نصف دقيقة ثم حدّث الصفحة.' : 'أعد تشغيل البرنامج ليُطبَّق الاستيراد.'}</p></div>`) });
        if (j.restart) setTimeout(() => location.reload(), 30000);
      } catch (err) { $('.im-st', pc).textContent = ''; toast(err.message, 'err'); }
      e.target.disabled = false;
    };

    // ---- إعادة ضبط المصنع
    const rs = h(`<div class="card" style="max-width:720px;margin-top:14px;border-color:var(--err)"><h4 style="color:var(--err)">${icon('refresh')} إعادة ضبط المصنع</h4>
      <p class="small" style="margin:0 0 6px">يرجع الجهاز كما كان بعد التنصيب: تُحذف كل الحسابات وكلمات السر والنجوم ومربعات التلفاز والإعدادات، وتظهر شاشة الإعداد الأول.</p>
      <p class="muted small" style="margin:0 0 10px">يبقى: تفعيل هذا الجهاز، وإعدادات الوايفاي والشبكة، والبرنامج نفسه. <b>احفظ الإعدادات في ملف أولاً</b> (أعلاه) إن أردت الرجوع إلى ما عندك الآن.</p>
      <label class="check"><input type="radio" name="wipe" value="0" checked> الإعدادات فقط: الملفات والصور تبقى على القرص</label>
      <label class="check"><input type="radio" name="wipe" value="1"> <b>كل شيء</b>: تُحذف أيضاً كل الملفات والصور نهائياً (لا يمكن التراجع)</label>
      <div class="tv-grid" style="margin-top:10px"><label>كلمة مرور حسابك<input class="field" type="password" name="apw" autocomplete="current-password"></label>
        <label>اكتب «${esc(st.confirm_word)}» للتأكيد<input class="field" name="cw" autocomplete="off" inputmode="numeric" dir="ltr" maxlength="6"></label></div>
      <button class="btn danger" data-x="reset" style="margin-top:6px">${icon('refresh')} إعادة ضبط المصنع</button></div>`);
    $('[data-x=reset]', rs).onclick = async (e) => {
      const wipe = $('[name=wipe]:checked', rs).value === '1';
      const cw = $('[name=cw]', rs).value.replace(/\s/g, '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
      if (cw !== st.confirm_word) return toast(`اكتب «${st.confirm_word}» للتأكيد`, 'err');
      if (!await confirmBox(wipe ? 'سيُحذف كل شيء نهائياً: الحسابات والإعدادات وكل الملفات والصور. لا يمكن التراجع. متأكد؟'
        : 'ستُحذف كل الحسابات والإعدادات، وتبقى الملفات والصور على القرص. متأكد؟', { ok: 'إعادة ضبط', danger: true })) return;
      e.target.disabled = true;
      const r = await guard(() => api.post('/api/admin/transfer/reset', { password: $('[name=apw]', rs).value, confirm: $('[name=cw]', rs).value, wipe_files: wipe }));
      e.target.disabled = false;
      if (!r) return;
      await modal({ title: 'إعادة ضبط المصنع', body: h(`<p>${r.restart ? 'يُعاد تشغيل البرنامج الآن. بعد نصف دقيقة تظهر شاشة الإعداد الأول.' : 'أعد تشغيل البرنامج لتُطبَّق إعادة الضبط.'}</p>`), buttons: [{ label: 'حسناً', cls: 'primary', value: true }] });
      if (r.restart) setTimeout(() => location.reload(), 30000);
    };
    p.appendChild(rs);
  },

  // البند 7: إدارة التخزين
  async storage(sc, go) {
    const d = await guard(() => api.get('/api/admin/storage')); if (!d) return;
    const p = section(sc, 'إدارة التخزين', 'أقراص الجهاز وصحتها، ومن يشغل المساحة، واستعمال الأقراص الجديدة.',
      `<button class="btn ghost sm" data-x="reload">${icon('refresh')} تحديث</button>`);
    $('[data-x=reload]', sc).onclick = () => { sc.innerHTML = ''; CP.storage(sc, go); };
    const ROLE = { system: ['النظام', 'accent'], raid: ['مرآة RAID', 'ok'], data: ['بيانات', ''], backup: ['نسخ احتياطي', ''], new: ['جديد غير مستعمل', 'warn'] };
    const HEALTH = { ok: ['سليم', 'ok'], warn: ['علامات تلف', 'warn'], bad: ['يوشك على التعطّل', 'err'] };
    const bar = (pct) => `<div class="ov-bar"><i style="width:${Math.min(100, Math.max(1, pct))}%" class="${pct > 90 ? 'warn' : ''}"></i></div>`;
    if (!d.available) p.appendChild(h('<div class="alert warn small">استعمال الأقراص الجديدة وتفاصيلها متاح على جهاز HOME ANAB المثبّت من ملف ISO. هنا تظهر المساحة فقط.</div>'));
    // ---- عملية جارية
    let poll = 0;
    const opBox = h('<div></div>'); p.appendChild(opBox);
    const drawOp = (op) => {
      if (!op) { opBox.innerHTML = ''; return; }
      const run = !op.done;
      opBox.innerHTML = `<div class="card" style="margin-bottom:14px;border-color:${run ? 'var(--accent)' : op.rc === 0 ? 'var(--ok)' : 'var(--err)'}">
        <h4>${run ? '⏳' : op.rc === 0 ? '✅' : '❌'} ${esc(op.label)} <span class="muted small" translate="no" dir="ltr">${esc((op.args || []).join(' '))}</span></h4>
        <p class="small" style="margin:0 0 8px">${run ? 'تعمل الآن في الخلفية. قد تأخذ وقتاً طويلاً إن كانت تنسخ البيانات. لا تفصل الأقراص ولا تطفئ الجهاز.' : op.rc === 0 ? 'انتهت بنجاح.' : 'لم تكتمل. انظر التفاصيل.'}</p>
        <pre class="ov-log" dir="ltr">${esc((op.log || '').split('\n').slice(-12).join('\n'))}</pre></div>`;
      clearTimeout(poll);
      if (run) poll = setTimeout(async () => { if (!sc.isConnected) return; const r = await api.get('/api/admin/storage/op').catch(() => null); if (r) drawOp(r.op); }, 5000);
    };
    drawOp(d.op);
    // ---- الأقراص
    const news = d.disks.filter((x) => x.role === 'new');
    const degraded = d.arrays.some((a) => !a.healthy);
    const dc = h(`<div class="card"><h4>${icon('hdd')} الأقراص</h4>
      ${d.disks.length ? `<table class="tbl"><thead><tr><th>القرص</th><th>الحجم</th><th>الدور</th><th>الصحة</th><th>الحرارة</th><th></th></tr></thead><tbody>
      ${d.disks.map((x) => `<tr><td><b translate="no">${esc(x.model || x.name)}</b><div class="muted small" translate="no">${esc(x.name)} · ${x.tran === 'usb' ? 'USB' : x.tran === 'nvme' ? 'NVMe' : x.rota ? 'HDD' : 'SSD'}</div></td>
        <td translate="no" dir="ltr">${x.size ? fmtSize(x.size) : '—'}</td>
        <td>${ROLE[x.role] ? `<span class="badge ${ROLE[x.role][1]}">${ROLE[x.role][0]}</span>` : '—'}${x.raid ? ` <span class="muted small" translate="no">${esc(x.raid)}</span>` : ''}</td>
        <td>${HEALTH[x.health] ? `<span class="badge ${HEALTH[x.health][1]}">${HEALTH[x.health][0]}</span>` : '<span class="muted small">—</span>'}</td>
        <td translate="no" dir="ltr">${x.temp != null ? x.temp + '°' : '—'}</td>
        <td>${x.role === 'new' && d.available ? `<button class="btn sm primary" data-use="${esc(x.name)}">استعمال القرص</button>` : ''}</td></tr>`).join('')}</tbody></table>`
      : '<p class="muted">لا توجد معلومات عن الأقراص على هذا الجهاز.</p>'}
      ${d.arrays.map((a) => `<div style="margin-top:12px"><div class="ov-row"><b translate="no">RAID ${esc(a.name)} (${esc(a.level)})</b>
        <span class="badge ${a.healthy ? 'ok' : 'err'}">${a.healthy ? 'سليم' : 'متدهور: قرص معطّل'}</span></div>
        ${a.action ? `<div class="ov-row small"><span>${a.action === 'recovery' ? 'إعادة البناء' : 'مزامنة'}</span><span dir="ltr">${a.progress}% · ${esc(a.finish || '')}</span></div>${bar(a.progress)}` : ''}</div>`).join('')}</div>`);
    p.appendChild(dc);
    $$('[data-use]', dc).forEach((b) => (b.onclick = () => useDisk(b.dataset.use)));
    // ---- المساحة
    p.appendChild(h(`<div class="card" style="margin-top:14px"><h4>${icon('chart')} المساحة</h4>${d.volumes.map((v) => { const pct = v.total ? 100 * v.used / v.total : 0;
      return `<div class="ov-vol"><div class="ov-row"><span translate="no">${esc(v.labels.join('، '))}</span><span class="muted small" dir="ltr" translate="no">${fmtSize(v.used)} / ${fmtSize(v.total)} · ${Math.round(pct)}%</span></div>${bar(pct)}</div>`; }).join('')}</div>`));
    // ---- نشاط القرص (البند 22)
    const ioc = h(`<div class="card" style="margin-top:14px"><h4>${icon('activity')} نشاط القرص الآن</h4><div class="iob muted small">جارٍ القياس…</div></div>`);
    p.appendChild(ioc);
    const ioLoop = async () => {
      const x = await api.get('/api/admin/disk-io').catch(() => null);
      if (!ioc.isConnected) return;
      const b = $('.iob', ioc);
      if (!x || !x.available) { b.textContent = 'غير متاح على هذا الجهاز.'; return; }
      b.classList.remove('muted', 'small');
      const hist = x.history.slice(-60), hmax = Math.max(1, ...hist.map((r) => Math.max(r.rd, r.wr)));
      b.innerHTML = ioHtml(x) + (hist.length > 2 ? `<div class="muted small" style="margin:10px 0 4px">آخر ساعة (أعلى: <span dir="ltr">${mbs(hmax)}</span>):</div>
        <svg viewBox="0 0 ${hist.length} 40" preserveAspectRatio="none" style="width:100%;height:60px;display:block;direction:ltr">
          <polyline fill="none" stroke="var(--accent)" stroke-width="1" vector-effect="non-scaling-stroke" points="${hist.map((r, i) => `${i},${40 - 38 * r.rd / hmax}`).join(' ')}"/>
          <polyline fill="none" stroke="var(--warn)" stroke-width="1" vector-effect="non-scaling-stroke" points="${hist.map((r, i) => `${i},${40 - 38 * r.wr / hmax}`).join(' ')}"/></svg>
        <div class="small"><span style="color:var(--accent)">━ قراءة</span> &nbsp; <span style="color:var(--warn)">━ كتابة</span></div>` : '');
      setTimeout(ioLoop, 5000);
    };
    ioLoop();
    // ---- ماذا يشغل المساحة؟
    const uc = h(`<div class="card" style="margin-top:14px"><div class="ov-row"><h4 style="margin:0">${icon('grid')} ماذا يشغل المساحة؟</h4>
      <button class="btn ghost sm" data-x="usage">${icon('refresh')} احسب الآن</button></div><div class="ub"></div></div>`);
    p.appendChild(uc);
    // البند 67: عرض حيّ: حلقة للقرص كله (حسب المكان أو حسب النوع)، والمرور على سطر يضيء جزءه، والضغط يفتح ما بداخله
    const PAL = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#eab308'];
    const KIND = { photo: ['🖼️ صور', '#ec4899'], video: ['🎬 فيديو', '#8b5cf6'], audio: ['🎵 صوت', '#06b6d4'], doc: ['📄 مستندات', '#f59e0b'], archive: ['📦 أرشيف وبرامج', '#84cc16'], other: ['📁 أخرى', '#94a3b8'] };
    let usageView = 'place';
    const donut = (segs, total, center) => {
      let a0 = -Math.PI / 2;
      const R = 80, r = 54, cx = 100, cy = 100;
      const arc = (s0, s1, cls, col, i) => {
        const big = s1 - s0 > Math.PI ? 1 : 0, p = (a, rad) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
        return `<path class="dn-seg ${cls}" data-i="${i}" fill="${col}" d="M${p(s0, R)} A${R} ${R} 0 ${big} 1 ${p(s1, R)} L${p(s1, r)} A${r} ${r} 0 ${big} 0 ${p(s0, r)}Z"><title>${esc(segs[i].name)}: ${fmtSize(segs[i].total)}</title></path>`;
      };
      const paths = segs.map((x, i) => {
        const f = Math.max(0, x.total) / Math.max(1, total);
        if (f <= 0.0005) return '';
        const s0 = a0, s1 = a0 + Math.min(f, 0.9999) * 2 * Math.PI; a0 = s1;
        return arc(s0, s1, x.free ? 'free' : '', x.color, i);
      }).join('');
      return `<svg viewBox="0 0 200 200" class="dn" role="img" aria-label="${esc(center[0])}">${paths}
        <text x="100" y="96" text-anchor="middle" class="dn-big">${esc(center[0])}</text><text x="100" y="118" text-anchor="middle" class="dn-small">${esc(center[1])}</text></svg>`;
    };
    const drawUsage = (u, running) => {
      const ub = $('.ub', uc);
      if (!u) { ub.innerHTML = `<p class="muted small">${running ? 'يُحسب الآن في الخلفية… قد يأخذ دقائق على الأقراص الكبيرة.' : 'لم يُحسب بعد.'}</p>`; return; }
      const vol = (d.volumes || [])[0];
      const sum = (l) => l.reduce((n, x) => n + (x.total || 0), 0);
      const known = sum(u.people) + sum(u.shares) + sum(u.other);
      let segs;
      if (usageView === 'kind' && u.kinds) {
        segs = Object.entries(u.kinds).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ name: (KIND[k] || [k])[0], total: v, color: (KIND[k] || [0, '#94a3b8'])[1] }));
      } else {
        segs = [...u.people.map((x) => ({ ...x, group: 'أفراد العائلة' })), ...u.shares.map((x) => ({ ...x, group: 'المجلدات المشتركة' })), ...u.other.map((x) => ({ ...x, group: 'النظام' }))]
          .filter((x) => x.total).map((x, i) => ({ ...x, color: PAL[i % PAL.length] }));
      }
      if (vol) {
        const sys = Math.max(0, vol.used - (usageView === 'kind' ? sum(segs) : known));
        if (sys > vol.total * 0.005) segs.push({ name: '⚙️ النظام والبرامج', total: sys, color: '#64748b', group: 'النظام', sys: true });
      }
      // الحلقة = المستعمل فقط (حتى تظهر الأجزاء الصغيرة)، والشريط فوق القائمة = القرص كله: مستعمل وفارغ
      const used = Math.max(1, sum(segs));
      const disk = vol ? vol.used + vol.free : used;
      const top = Math.max(1, ...segs.map((x) => x.total || 0));
      if (vol) segs.push({ name: 'مساحة فارغة', total: vol.free, color: 'var(--surface-3)', free: true });
      const total = disk;
      const pct = (n) => `${(100 * n / Math.max(1, total)).toFixed(n / total < 0.01 ? 1 : 0)}%`;
      const center = vol ? [`${Math.round(100 * vol.used / (vol.used + vol.free))}%`, `من القرص مستعمل`] : [fmtSize(known), 'المجموع'];
      let lastGroup = '';
      const rows = segs.map((x, i) => {
        const head = usageView === 'place' && x.group && x.group !== lastGroup ? `<h5 class="ov-sub">${esc((lastGroup = x.group))}</h5>` : '';
        const kids = (x.children || []).filter((c) => c.total);
        return `${head}<div class="us-row${kids.length ? ' has' : ''}${x.free ? ' free' : ''}" data-i="${i}" tabindex="0">
          <span class="dot" style="background:${x.color}"></span><span class="nm" translate="no">${esc(x.name)}${kids.length ? ' <i class="arr">‹</i>' : ''}</span>
          ${x.clear && x.total ? `<button class="btn ghost sm" data-clear="${x.clear}" style="padding:0 8px">تفريغ</button>` : ''}
          <span class="pc muted">${pct(x.total)}</span><b class="sz" dir="ltr" translate="no">${fmtSize(x.total)}</b>
          ${x.free ? '' : `<div class="us-bar"><i style="--w:${Math.max(0.5, 100 * x.total / top)}%;background:${x.color}"></i></div>`}
          ${kids.length ? `<div class="us-kids" hidden>${kids.map((c) => `<div class="us-kid"><span translate="no">${esc(c.name)}</span><span dir="ltr" class="muted" translate="no">${fmtSize(c.total)}</span>
            <div class="us-bar sm"><i style="--w:${Math.max(1, 100 * c.total / Math.max(1, x.total))}%;background:${x.color}"></i></div></div>`).join('')}
            ${x.photos ? `<div class="muted small" style="margin-top:4px">منها الصور والفيديو في «الصور»: <span dir="ltr" translate="no">${fmtSize(x.photos)}</span></div>` : ''}</div>` : ''}
        </div>`;
      }).join('');
      ub.innerHTML = `<div class="us-tabs"><button class="btn sm ${usageView === 'place' ? 'primary' : 'ghost'}" data-v="place">حسب المكان</button>
          <button class="btn sm ${usageView === 'kind' ? 'primary' : 'ghost'}" data-v="kind" ${u.kinds ? '' : 'disabled title="احسب الآن لتظهر الأنواع"'}>حسب النوع</button></div>
        <div class="us-wrap"><div class="us-chart">${donut(segs.filter((x) => !x.free), used, center)}${vol ? `<div class="muted small" style="text-align:center">الحلقة: ما يشغل <span dir="ltr">${fmtSize(vol.used)}</span></div>` : ''}</div>
          <div class="us-list">${vol ? `<div class="us-disk" title="القرص كله"><i style="--w:${(100 * vol.used / disk).toFixed(1)}%"></i></div>
            <div class="muted small" style="display:flex;justify-content:space-between;margin:2px 0 8px"><span>مستعمل <b dir="ltr">${fmtSize(vol.used)}</b></span><span>فارغ <b dir="ltr">${fmtSize(vol.free)}</b></span></div>` : ''}${rows}</div></div>
        ${u.other.some((x) => x.clear) && usageView === 'place' ? '<p class="muted small" style="margin:6px 0 0">الفيديو المجهّز والمصغرات ذاكرة مؤقتة: الأصل لا يُمس، وتُصنع من جديد عند الحاجة (أول تشغيل أو عرض يكون أبطأ قليلاً).</p>' : ''}
        <p class="muted small" style="margin:10px 0 0">آخر حساب: <bdi>${esc(fmtDateTime(new Date(u.t * 1000).toISOString()))}</bdi>${running ? ' · يُعاد الحساب الآن…' : ''}</p>`;
      // الأشرطة تنمو بعد الرسم
      requestAnimationFrame(() => requestAnimationFrame(() => ub.classList.add('grown')));
      const hl = (i) => { $$('.dn-seg', ub).forEach((x) => x.classList.toggle('dim', i != null && x.dataset.i !== String(i))); $$('.us-row', ub).forEach((x) => x.classList.toggle('hl', x.dataset.i === String(i))); };
      $$('.us-row', ub).forEach((row) => {
        row.onmouseenter = row.onfocus = () => hl(row.dataset.i);
        row.onmouseleave = row.onblur = () => hl(null);
        row.onclick = (e) => { if (e.target.closest('[data-clear]')) return; const k = $('.us-kids', row); if (k) { k.hidden = !k.hidden; row.classList.toggle('open', !k.hidden); } };
        row.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.onclick(e); } };
      });
      $$('.dn-seg', ub).forEach((sg) => {
        sg.onmouseenter = () => hl(sg.dataset.i); sg.onmouseleave = () => hl(null);
        sg.onclick = () => { const row = $(`.us-row[data-i="${sg.dataset.i}"]`, ub); if (row) { row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); row.click(); } };
      });
      $$('[data-v]', ub).forEach((b) => (b.onclick = () => { usageView = b.dataset.v; drawUsage(u, running); }));
      $$('[data-clear]', ub).forEach((b) => (b.onclick = async () => {
        const tv = b.dataset.clear === 'tv-video';
        if (!(await confirmBox(tv ? 'تُحذف كل نسخ الفيديو المجهّزة للتلفاز. الأصل لا يُمس، ويُجهَّز الفيديو من جديد عند تشغيله أو في الخلفية.' : 'تُحذف كل مصغرات الصور والمعاينات، وتُصنع من جديد عند فتح الصور.', { ok: 'تفريغ' }))) return;
        const r = await guard(() => api.post('/api/admin/storage/clear', { what: b.dataset.clear }));
        if (r) { toast(`تم تحرير ${fmtSize(r.freed)}`, 'ok'); drawUsage(r.usage, false); }
      }));
    };
    drawUsage(d.usage, d.usage_running);
    let up = 0;
    const pollUsage = () => { clearTimeout(up); up = setTimeout(async () => { if (!uc.isConnected) return; const r = await api.get('/api/admin/storage').catch(() => null); if (!r) return; drawUsage(r.usage, r.usage_running); if (r.usage_running) pollUsage(); }, 4000); };
    if (d.usage_running) pollUsage();
    $('[data-x=usage]', uc).onclick = async () => { if (await guard(() => api.post('/api/admin/storage/usage'))) { drawUsage(d.usage, true); pollUsage(); } };

    // ---- سلة المحذوفات (البند 16)
    const rc = h(`<div class="card" style="margin-top:14px"><h4>${icon('trash')} سلة المحذوفات</h4><div class="rb muted small">جارٍ الحساب…</div></div>`);
    p.appendChild(rc);
    const drawRecycle = (r) => {
      const rb = $('.rb', rc); rb.classList.remove('muted', 'small');
      rb.innerHTML = `<p class="small" style="margin:0 0 8px">الملفات المحذوفة لا تُمسح فوراً: تبقى في سلة المحذوفات وتشغل مساحتها، حتى تُفرَّغ.</p>
        <div class="ov-row"><b>المجموع</b><span dir="ltr" translate="no">${fmtSize(r.total)} · ${r.count} ملف</span></div>
        ${r.bins.map((x) => `<div class="ov-row small" style="margin-top:6px"><span translate="no">${esc(x.name)}</span><span class="muted" dir="ltr" translate="no">${fmtSize(x.size)} · ${x.count}</span></div>`).join('')}
        <label class="lbl" style="margin-top:12px">التفريغ التلقائي</label>
        <select class="field" name="rdays" style="max-width:320px">${r.choices.map((d) => `<option value="${d}" ${d === r.days ? 'selected' : ''}>${d ? `امسح نهائياً ما مرّ على حذفه ${d} يوماً` : 'لا تفريغ تلقائي'}</option>`).join('')}</select>
        <p class="muted small" style="margin:4px 0 10px">يعمل مرة كل يوم.</p>
        <button class="btn danger sm" data-x="empty" ${r.count ? '' : 'disabled'}>تفريغ كل السلال الآن</button>`;
      $('[name=rdays]', rb).onchange = async (e) => {
        const res = await guard(() => api.post('/api/admin/recycle', { days: +e.target.value }));
        if (res) { toast(res.files ? `تم. حُذف نهائياً ${res.files} ملف (${fmtSize(res.bytes)})` : 'تم', 'ok'); drawRecycle(res.summary); }
      };
      $('[data-x=empty]', rb).onclick = async () => {
        if (!(await confirmBox(`ستُحذف نهائياً كل الملفات في سلال المحذوفات لكل العائلة (${fmtSize(r.total)}). لا يمكن استرجاعها بعد ذلك.`, { ok: 'تفريغ', danger: true }))) return;
        const res = await guard(() => api.post('/api/admin/recycle', { action: 'empty' }));
        if (res) { toast(`تم تحرير ${fmtSize(res.bytes)}`, 'ok'); drawRecycle(res.summary); }
      };
    };
    api.get('/api/admin/recycle').then(drawRecycle).catch((e) => { $('.rb', rc).textContent = e.message; });

    // ---- استعمال قرص جديد
    async function useDisk(dev) {
      const x = d.disks.find((k) => k.name === dev);
      const others = news.filter((k) => k.name !== dev);
      const body = h(`<div>
        <p>القرص <b translate="no">${esc(x.model || x.name)}</b> (<span dir="ltr" translate="no">${fmtSize(x.size || 0)}</span>). اختر كيف تستعمله:</p>
        <label class="check"><input type="radio" name="op" value="add" checked> <b>قرص منفصل</b>: مساحة إضافية بلا حماية. يظهر كمجلد يمكن مشاركته.</label>
        <div class="op-add" style="margin:4px 26px 8px"><input class="field" name="nm" placeholder="اسم القرص بالإنجليزية، مثل extra1" dir="ltr" style="max-width:260px"></div>
        <label class="check"><input type="radio" name="op" value="backup-disk"> <b>قرص النسخ الاحتياطي</b>: تُحفظ عليه نسخة من كل الملفات (مناسب لقرص USB).</label>
        <label class="check"><input type="radio" name="op" value="mirror" ${others.length ? '' : 'disabled'}> <b>مرآة RAID 1 مع قرص آخر</b>: نسختان متطابقتان، فلا تضيع البيانات إذا تعطّل أحدهما.
          ${others.length ? '' : '<span class="muted small">(يحتاج قرصاً جديداً ثانياً)</span>'}</label>
        <div class="op-mirror" style="margin:4px 26px 8px" hidden><select class="field" name="second" style="max-width:320px">${others.map((k) => `<option value="${esc(k.name)}">${esc(k.model || k.name)} (${fmtSize(k.size || 0)})</option>`).join('')}</select>
          <p class="muted small" style="margin:6px 0 0">تصبح المرآة هي التخزين الرئيسي، وتُنقل إليها كل البيانات الحالية. المساحة = أصغر القرصين.</p></div>
        <label class="check"><input type="radio" name="op" value="replace" ${degraded ? '' : 'disabled'}> <b>استبدال القرص المعطّل في المرآة</b>
          ${degraded ? '' : '<span class="muted small">(لا توجد مرآة متدهورة)</span>'}</label>
        <div class="alert warn small" style="margin:12px 0 8px">⚠️ سيُمسح كل ما على القرص المختار نهائياً.</div>
        <div class="tv-grid"><label>كلمة مرور حسابك<input class="field" type="password" name="pw" autocomplete="current-password"></label>
          <label>اكتب «${esc(d.confirm_word)}» للتأكيد<input class="field" name="cw" autocomplete="off" inputmode="numeric" dir="ltr" maxlength="6"></label></div></div>`);
      const sync = () => { const op = $('[name=op]:checked', body).value; $('.op-add', body).hidden = op !== 'add'; $('.op-mirror', body).hidden = op !== 'mirror'; };
      $$('[name=op]', body).forEach((r) => (r.onchange = sync)); sync();
      const ok = await modal({ title: 'استعمال قرص جديد', body, wide: true, buttons: [{ label: 'إلغاء', value: null }, { label: 'ابدأ', cls: 'danger', value: true, validate: async () => {
        const op = $('[name=op]:checked', body).value;
        const devs = op === 'mirror' ? [dev, $('[name=second]', body).value] : [dev];
        const cw = $('[name=cw]', body).value.replace(/\s/g, '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
        if (cw !== d.confirm_word) { toast(`اكتب «${d.confirm_word}» للتأكيد`, 'err'); return false; }
        const r = await guard(() => api.post('/api/admin/storage/run', { op, devs, name: $('[name=nm]', body).value.trim(), password: $('[name=pw]', body).value, confirm: $('[name=cw]', body).value }));
        if (r) drawOp(r.op);
        return !!r;
      } }] });
      if (ok) toast('بدأت العملية', 'ok');
    }
  },

  // البند 9: المعالج
  async cpu(sc) {
    const p = section(sc, 'المعالج', 'نوع المعالج وحرارته واستعماله، وماذا يستهلكه الآن. يُحدَّث كل 5 ثوانٍ.');
    const box = h('<div class="ov-grid cpu-grid"><div class="muted">جارٍ القراءة…</div></div>');
    p.appendChild(box);
    const LV = { ok: ['طبيعي', 'ok', '🟢'], warm: ['دافئ: تأكد من التهوية', 'warn', '🟡'], hot: ['ساخن جداً', 'err', '🔴'] };
    const spark = (hist, key, max, color) => {
      const pts = hist.filter((x) => x[key] != null);
      if (pts.length < 2) return '<p class="muted small">يظهر الرسم بعد دقائق من تشغيل الجهاز.</p>';
      const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
      const xy = pts.map((x) => `${(300 * (x.t - t0) / Math.max(1, t1 - t0)).toFixed(1)},${(60 - 58 * Math.min(1, x[key] / max)).toFixed(1)}`).join(' ');
      return `<svg viewBox="0 0 300 62" class="cpu-spark" preserveAspectRatio="none"><polyline points="${xy}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
    };
    let timer = 0;
    const draw = async () => {
      if (!box.isConnected) return;
      const d = await api.get('/api/admin/cpu').catch(() => null);
      if (!d) { box.innerHTML = '<p class="muted">تعذر الاتصال بالسيرفر</p>'; return; }
      const lv = LV[d.level];
      box.innerHTML = `
        <div class="card"><div class="ov-h">${icon('cpu')} النوع</div>
          <p style="margin:0 0 6px"><b translate="no" dir="ltr">${esc(d.model || '—')}</b></p>
          <div class="ov-row small"><span>الأنوية</span><span translate="no">${d.cores || '—'} (${d.threads || '—'} مسار)</span></div>
          ${d.freq ? `<div class="ov-row small"><span>السرعة الآن</span><span translate="no" dir="ltr">${(d.freq.current / 1000).toFixed(2)} GHz${d.freq.max ? ` / ${(d.freq.max / 1000).toFixed(2)}` : ''}</span></div>` : ''}
          ${d.load ? `<div class="ov-row small"><span>الحِمل (1، 5، 15 دقيقة)</span><span translate="no" dir="ltr">${d.load.join(' · ')}</span></div>` : ''}</div>
        <div class="card ${lv ? lv[1] : ''}"><div class="ov-h">🌡️ الحرارة</div>
          ${d.temp ? `<div class="cpu-big" dir="ltr">${Math.round(d.temp.current)}°</div><p style="margin:0">${lv[2]} ${lv[0]}</p>
            <p class="muted small" style="margin:6px 0 0">تنبيه عند ${d.warn_c}°، وخطر عند ${d.hot_c}°.</p>`
            : '<p class="muted">الحرارة غير متوفرة في هذا الجهاز (لا يعطي المعالج قراءة).</p>'}
          ${spark(d.history, 'temp', 100, '#e5484d')}</div>
        <div class="card"><div class="ov-h">${icon('activity')} الاستعمال</div>
          <div class="cpu-big" dir="ltr">${Math.round(d.usage)}%</div>
          <div class="cpu-cores">${d.per_core.map((c, i) => `<div title="النواة ${i + 1}: ${Math.round(c)}%"><i style="height:${Math.max(3, c)}%"></i></div>`).join('')}</div>
          ${spark(d.history, 'cpu', 100, 'var(--accent)')}<p class="muted small" style="margin:4px 0 0">آخر ساعة</p></div>
        <div class="card"><div class="ov-h">${icon('list')} ماذا يستهلك المعالج الآن؟</div>
          ${d.top.length ? d.top.map((x) => `<div class="ov-row small"><span>${esc(x.name)}</span><span translate="no" dir="ltr">${x.cpu}%</span></div>
            <div class="ov-bar"><i style="width:${Math.max(1, Math.min(100, x.cpu))}%"></i></div>`).join('') : '<p class="muted small">لا شيء ثقيل الآن.</p>'}</div>`;
      clearTimeout(timer); timer = setTimeout(draw, 5000);
    };
    draw();
  },

  // البند 10: اسم الجهاز على الشبكة
  async hostname(sc) {
    const d = await guard(() => api.get('/api/admin/hostname')); if (!d) return;
    const p = section(sc, 'اسم الجهاز على الشبكة', 'الاسم الذي تفتح به HOME ANAB من الهاتف أو الكمبيوتر في البيت، مثل <span dir="ltr">beit-ahmad.local</span>. إن كان في البيت أكثر من جهاز HOME ANAB فأعطِ كل واحد اسماً مختلفاً.');
    const c = h(`<div class="card" style="max-width:640px">
      <p style="margin:0 0 4px" class="muted small">العنوان الآن</p>
      <div class="cpu-big" dir="ltr" style="font-size:28px;text-align:left" translate="no">${esc(d.mdns)}.local</div>
      ${d.conflict ? `<div class="alert warn small">يوجد جهاز آخر في الشبكة اسمه <b dir="ltr">${esc(d.hostname)}</b>، فصار اسم هذا الجهاز <b dir="ltr">${esc(d.mdns)}</b> وحده. أعطه اسماً خاصاً به حتى لا يختلط الجهازان.</div>` : ''}
      <label class="lbl">الاسم الجديد</label>
      <div class="row" dir="ltr" style="gap:8px;align-items:center;justify-content:flex-end"><input class="field" name="hn" dir="ltr" maxlength="40" style="max-width:300px" autocomplete="off" placeholder="${esc(d.suggest)}" value="${esc(d.hostname)}"><span dir="ltr" class="muted">.local</span></div>
      <p class="muted small">حروف إنجليزية صغيرة وأرقام وشرطة (-) فقط. اسم العرض العربي للجهاز (مثل «منزل أحمد») يبقى كما هو في «عام».</p>
      <button class="btn primary" data-x="save">حفظ الاسم</button>
      ${d.appliance ? '' : '<p class="alert warn small" style="margin-top:10px">متاح على جهاز HOME ANAB المثبّت من ملف ISO.</p>'}
      <p class="muted small" style="margin:12px 0 0">يمكنك دائماً الفتح بعنوان IP أيضاً: <span dir="ltr" translate="no">${d.urls.filter((u) => !u.endsWith('.local') && !/\.local[:/]/.test(u)).map(esc).join(' · ')}</span></p></div>`);
    const inp = $('[name=hn]', c);
    inp.oninput = () => { const v = inp.value.toLowerCase().replace(/[\s_.]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').slice(0, 40); if (v !== inp.value) inp.value = v; };
    $('[data-x=save]', c).onclick = async (e) => {
      const name = inp.value.replace(/^-+|-+$/g, '');
      if (!name) return toast('اكتب اسماً', 'err');
      e.target.disabled = true;
      const r = await guard(() => api.post('/api/admin/hostname', { name }));
      e.target.disabled = false;
      if (!r) return;
      toast(`صار الاسم ${r.mdns}.local`, 'ok');
      if (location.hostname.endsWith('.local') && location.hostname !== `${r.mdns}.local`) setTimeout(() => { location.href = `${location.protocol}//${r.mdns}.local${location.port ? ':' + location.port : ''}/`; }, 3000);
      else { sc.innerHTML = ''; CP.hostname(sc); }
    };
    p.appendChild(c);
  },

  tv(sc) { return tvSection(sc, section); },
  device(sc) { return deviceSection(sc, section); },
  activation(sc) { return activationSection(sc); },

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
    p.appendChild(await lookCard());
    if (window.I18N && I18N.switcher) {
      const lc = h(`<div class="card" style="max-width:460px;margin-top:14px"><h4 translate="no">${icon('info')} Language · اللغة · Langue</h4></div>`);
      const sw = I18N.switcher(); sw.style.justifyContent = 'flex-start'; sw.style.marginTop = '0'; lc.appendChild(sw); p.appendChild(lc);
    }
    if (!ME.is_admin) p.appendChild(aboutCard());
    const out = h(`<p><a class="btn danger" href="/logout">${icon('logout')} تسجيل الخروج</a></p>`); p.appendChild(out);
  },

  async network(sc) {
    const n = await guard(() => api.get('/api/network')); if (!n) return;
    const host = n.host, ip = n.ips[0];
    const p = section(sc, 'قرص الشبكة والتلفاز الذكي', 'افتح ملفات HOME ANAB كقرص شبكة من الكمبيوتر وتطبيق «الملفات» في الآيفون، واعرض الصور والفيديو على التلفاز الذكي.');
    if (!n.available) {
      p.appendChild(h(`<div class="card"><p>${icon('info')} قرص الشبكة (SMB) وخادم التلفاز (DLNA) متاحان على جهاز HOME ANAB المخصص (المثبّت من ملف ISO).</p>
        <p class="muted">على ويندوز يمكنك بدلاً من ذلك مشاركة مجلد البيانات من خصائص المجلد ← مشاركة.</p></div>`));
      return;
    }
    const reload = () => { sc.innerHTML = ''; CP.network(sc); };
    const me = n.me;
    // --- حسابي على الشبكة (لكل المستخدمين)
    const mine = h(`<div class="cards" style="padding:0">
      <div class="card"><h4>${icon('hdd')} قرص الشبكة لحسابي</h4>
        ${!n.smb_enabled ? '<p class="muted">قرص الشبكة غير مفعّل على السيرفر (يفعّله المدير).</p>'
        : me.smb_ready ? `<p><span class="badge ok">جاهز</span> سجّل الدخول باسم المستخدم وكلمة المرور نفسها التي تستخدمها هنا.</p>`
        : `<p class="muted">أدخل كلمة مرورك مرة واحدة لتفعيل الوصول عبر الشبكة لحسابك.</p>
           <input class="field" type="password" name="pw" placeholder="كلمة المرور الحالية" autocomplete="current-password">
           <div style="margin-top:10px"><button class="btn primary" data-x="smb">تفعيل</button></div>`}</div>
      <div class="card"><h4>${icon('image')} صوري على التلفاز</h4>
        ${!n.dlna_enabled ? '<p class="muted">خادم التلفاز غير مفعّل على السيرفر (يفعّله المدير).</p>'
        : `<label class="check"><input type="checkbox" name="tv" ${me.tv_photos ? 'checked' : ''}> اعرض صوري وفيديوهاتي على تلفاز المنزل</label>
           <p class="muted" style="font-size:12px">⚠️ التلفاز لا يطلب كلمة مرور: أي شخص في المنزل يرى ما تختار عرضه.</p>`}</div></div>`);
    const smbBtn = $('[data-x=smb]', mine);
    if (smbBtn) smbBtn.onclick = async () => {
      if (await guard(() => api.post('/api/me/smb', { password: $('[name=pw]', mine).value }))) { toast('تم تفعيل قرص الشبكة لحسابك', 'ok'); reload(); }
    };
    const tv = $('[name=tv]', mine);
    if (tv) tv.onchange = async () => { if (await guard(() => api.post('/api/me/tv', { enabled: tv.checked }))) toast(tv.checked ? 'ستظهر صورك على التلفاز خلال دقائق' : 'لن تظهر صورك على التلفاز', 'ok'); };
    p.appendChild(mine);

    // --- طريقة الاتصال
    p.appendChild(h(`<div class="cards" style="padding:14px 0 0">
      <div class="card"><h4>${icon('server')} من كمبيوتر ويندوز</h4><ol class="steps">
        <li>افتح «مستكشف الملفات» واكتب في شريط العنوان: <span class="code">\\\\${esc(host)}</span> أو <span class="code">\\\\${esc(ip)}</span></li>
        <li>أدخل اسم المستخدم وكلمة المرور.</li>
        <li>لربطه كحرف قرص: انقر بالزر الأيمن على المجلد ← «تعيين محرك أقراص شبكة».</li></ol>
        ${ME.is_admin ? `<p class="small" style="margin:8px 0 0">🗂️ <b>للمدير:</b> المجلد <b translate="no">ANAB SERVER FILE</b> فيه كل ملفات السيرفر: مجلدات كل المستخدمين كاملة (<span translate="no">homes</span>)، وكل المجلدات المشتركة ومنها الألعاب والتعليم والكاميرات (<span translate="no">shares</span>).
          اربطه كحرف قرص فتظهر له أيقونة في «هذا الكمبيوتر»: <span class="code" dir="ltr">\\\\${esc(host)}\\ANAB SERVER FILE</span></p>` : ''}</div>
      <div class="card"><h4>${icon('phone')} من الآيفون / الآيباد</h4><ol class="steps">
        <li>افتح تطبيق <b>الملفات</b> ← زر <b>⋯</b> في الأعلى ← <b>الاتصال بالخادم</b>.</li>
        <li>اكتب: <span class="code">smb://${esc(host)}.local</span> (أو <span class="code">smb://${esc(ip)}</span>)</li>
        <li>اختر «مستخدم مسجل» وأدخل اسم المستخدم وكلمة المرور. يظهر السيرفر بعدها في قائمة «المواقع».</li></ol></div>
      <div class="card"><h4>${icon('server')} من ماك</h4><ol class="steps">
        <li>Finder ← <b>انتقال</b> ← <b>الاتصال بالخادم</b> (⌘K).</li>
        <li>اكتب: <span class="code">smb://${esc(host)}.local</span></li></ol></div>
      <div class="card"><h4>${icon('video')} تلفاز سامسونغ</h4><ol class="steps">
        <li>تأكد أن التلفاز متصل بنفس شبكة المنزل.</li>
        <li>اضغط زر <b>Home</b> ← <b>المصدر <span class="ar-only">(Source)</span></b> أو <b>الأجهزة المتصلة</b>.</li>
        <li>اختر <b>${esc(n.host)}</b> / <b>HOME ANAB</b> ← تصفح المجلدات وشغّل الصور والفيديو.</li>
        <li>في الأجهزة الأقدم: تطبيق <b>Media</b> أو <b>AllShare</b>.</li></ol>
        <p class="muted" style="font-size:12px">يعمل أيضاً مع أغلب أجهزة التلفاز الذكية (LG، سوني…) ومشغلات مثل VLC و Kodi.</p></div></div>`));

    if (!ME.is_admin) return;
    // --- إعدادات المدير
    const srv = n.services || {};
    const admin = h(`<div class="card" style="margin-top:14px"><h4>${icon('sliders')} إعدادات السيرفر (المدير)</h4>
      <label class="check"><input type="checkbox" name="smb" ${n.smb_enabled ? 'checked' : ''}> <b>قرص الشبكة (SMB)</b> — للكمبيوتر وتطبيق الملفات في الآيفون
        ${n.smb_enabled ? (srv.smb === false ? ' <span class="badge err">متوقف</span>' : ' <span class="badge ok">يعمل</span>') : ''}</label>
      <label class="check"><input type="checkbox" name="dlna" ${n.dlna_enabled ? 'checked' : ''}> <b>خادم التلفاز (DLNA)</b>
        ${n.dlna_enabled ? (srv.dlna === false ? ' <span class="badge err">متوقف</span>' : ` <span class="badge ok">يعمل — ${n.tv.tv_items} ملف</span>`) : ''}</label>
      <label class="lbl">المجلدات المشتركة التي تظهر على التلفاز</label>
      <div class="tvf">${n.folders.length ? n.folders.map(f => `<label class="check" style="margin-inline-end:16px"><input type="checkbox" value="${f.id}" ${n.dlna_folders.includes(f.id) ? 'checked' : ''}> ${esc(f.name)}</label>`).join('') : '<span class="muted">لا توجد مجلدات مشتركة</span>'}</div>
      <p class="muted" style="font-size:12px">صور المستخدمين الخاصة لا تظهر على التلفاز إلا إذا وافق صاحبها من «صوري على التلفاز». صور HEIC تُحوّل تلقائياً إلى JPEG للتلفاز.</p>
      <div style="margin-top:10px"><button class="btn primary" data-x="save">حفظ</button></div>
      <table class="tbl" style="margin-top:14px"><thead><tr><th>المستخدم</th><th>قرص الشبكة</th><th>صوره على التلفاز</th></tr></thead><tbody>
        ${n.users_smb.map(u => `<tr><td>${esc(u.username)}</td><td>${u.ready ? '<span class="badge ok">جاهز</span>' : '<span class="badge warn">ينتظر إدخال كلمة المرور</span>'}</td>
          <td>${u.tv_photos ? '✓' : '—'}</td></tr>`).join('')}</tbody></table>
      <p class="muted" style="font-size:12px">الحسابات القديمة: يفعّل كل مستخدم قرص الشبكة بإدخال كلمة مروره مرة واحدة في هذه الصفحة، أو عيّن له المدير كلمة مرور جديدة.</p></div>`);
    $('[data-x=save]', admin).onclick = async () => {
      const d = { smb_enabled: $('[name=smb]', admin).checked, dlna_enabled: $('[name=dlna]', admin).checked,
        dlna_folders: $$('.tvf input:checked', admin).map(i => +i.value) };
      if (await guard(() => api.post('/api/admin/network', d))) { toast('تم الحفظ — يُطبَّق خلال ثوانٍ', 'ok'); setTimeout(reload, 2500); }
    };
    p.appendChild(admin);
  },

  async remote(sc) {
    const p = section(sc, 'الوصول من خارج المنزل', 'افتح HOME ANAB من أي مكان في العالم بأمان، باتصال مشفّر (HTTPS)، عبر Tailscale المجاني. السيرفر لا يُفتح للإنترنت: لا يصل إليه إلا أجهزتك المسجّلة في حسابك.');
    const box = h('<div></div>'); p.appendChild(box);
    let timer = null;
    const draw = async () => {
      clearTimeout(timer);
      const r = await api.get('/api/remote').catch(() => null);
      if (!r || !document.body.contains(box)) return;
      const ts = r.ts || {}, op = r.op || {};
      if (!r.available) {
        box.innerHTML = `<div class="card"><p>${icon('info')} هذه الميزة متاحة على جهاز HOME ANAB المخصص (المثبّت من ملف ISO).</p></div>`; return;
      }
      let html = '';
      if (op.error) html += `<p class="alert err small" translate="no">${esc(op.error)}</p>`;
      if (op.running) {
        html += `<div class="card"><p><span class="badge accent">جارٍ العمل…</span> ${op.what === 'setup' ? 'تثبيت Tailscale قد يستغرق دقيقة أو دقيقتين.' : ''}</p></div>`;
        timer = setTimeout(draw, 2500);
      } else if (!ts.installed) {
        html += `<div class="card"><h4>${icon('download')} الخطوة ١: التثبيت</h4>
          <p>يُثبَّت Tailscale على هذا السيرفر من موقعه الرسمي (يحتاج إنترنت).</p>
          <button class="btn primary" data-x="setup">${icon('download')} تثبيت Tailscale</button></div>`;
      } else if (ts.state !== 'Running') {
        html += `<div class="card"><h4>${icon('key')} الخطوة ٢: تسجيل الدخول</h4>
          ${ts.auth_url ? `<p>اضغط الزر وسجّل الدخول بحساب Google أو Apple أو Microsoft (أو أنشئ حساب Tailscale مجاناً). هذا يربط السيرفر بحسابك.</p>
            <a class="btn primary" href="${esc(ts.auth_url)}" target="_blank" rel="noopener">${icon('external')} تسجيل الدخول إلى Tailscale</a>
            <p class="muted small">بعد تسجيل الدخول ستتحدث هذه الصفحة تلقائياً.</p>`
          : `<p>جارٍ تجهيز رابط تسجيل الدخول…</p><button class="btn" data-x="login">${icon('refresh')} طلب رابط جديد</button>`}</div>`;
        timer = setTimeout(draw, 3000);
      } else {
        const url = ts.dns_name ? `https://${ts.dns_name}` : '';
        html += `<div class="cards" style="padding:0">
          <div class="card"><h4>${icon('check')} متصل</h4><dl class="kv">
            <dt>الحساب</dt><dd translate="no">${esc(ts.user || '—')}</dd>
            <dt>اسم السيرفر</dt><dd class="ltr">${esc(ts.dns_name || '—')}</dd>
            <dt>العنوان</dt><dd class="ltr">${esc((ts.ips || [])[0] || '—')}</dd></dl>
            <label class="check" style="margin-top:12px"><input type="checkbox" name="https" ${ts.https ? 'checked' : ''}> <b>HTTPS</b> — اتصال مشفّر بشهادة حقيقية</label>
            ${ts.https && url ? `<p>العنوان من أي مكان:</p><div class="lb"></div>` : ''}
            <button class="btn danger ghost" data-x="logout" style="margin-top:10px">${icon('logout')} فصل السيرفر عن Tailscale</button></div>
          <div class="card"><h4>${icon('phone')} على الآيفون</h4><ol class="steps">
            <li>ثبّت تطبيق <b>Tailscale</b> من متجر App Store.</li>
            <li>سجّل الدخول بنفس الحساب: <span translate="no">${esc(ts.user || '')}</span></li>
            <li>شغّل الاتصال (VPN) في التطبيق.</li>
            <li>افتح في Safari: ${url ? `<span class="code">${esc(url)}</span>` : '—'}</li>
            <li>أضفه إلى الشاشة الرئيسية ليعمل كتطبيق في البيت وخارجه.</li></ol>
            <p class="muted small">قرص الشبكة (SMB) يعمل أيضاً من خارج البيت: <span class="code">smb://${esc(ts.dns_name || '')}</span></p></div></div>
          ${!ts.https ? `<p class="muted small">إن ظهر خطأ عند تفعيل HTTPS: افتح لوحة Tailscale ← DNS ← فعّل MagicDNS و HTTPS Certificates، ثم حاول مجدداً.</p>` : ''}`;
      }
      box.innerHTML = html;
      const lb = $('.lb', box); if (lb && ts.dns_name) lb.appendChild(linkBox(`https://${ts.dns_name}`));
      const act = (sel, fn) => { const b = $(sel, box); if (b) b.onclick = fn; };
      act('[data-x=setup]', async () => { if (await guard(() => api.post('/api/remote/setup'))) draw(); });
      act('[data-x=login]', async () => { if (await guard(() => api.post('/api/remote/login'))) setTimeout(draw, 3000); });
      act('[data-x=logout]', async () => { if (await confirmBox('فصل السيرفر عن Tailscale؟ لن تصل إليه من خارج البيت حتى تسجل الدخول مجدداً.', { danger: true, ok: 'فصل' }) && await guard(() => api.post('/api/remote/logout'))) draw(); });
      const hs = $('[name=https]', box);
      if (hs) hs.onchange = async () => { toast('لحظة…'); await guard(() => api.post('/api/remote/https', { on: hs.checked })); draw(); };
    };
    draw();
  },

  async phone(sc) {
    const [me, st] = await Promise.all([guard(() => api.get('/api/me')), guard(() => api.get('/api/system/status'))]);
    if (!me || !st) return;
    const url = st.urls[0];
    const p = section(sc, 'ربط الآيفون والأندرويد', 'احفظ صور هاتفك على هذا الكمبيوتر عبر شبكة Wi-Fi المنزلية — بدون إنترنت وبدون أي خدمة سحابية.');
    if (ME.is_admin) p.appendChild(usbIphoneCard());
    p.appendChild(h(`<div class="cards" style="padding:0">
      <div class="card span2"><h4>${icon('phone')} ١. الآيفون: افتح السيرفر من Safari</h4>
        <ol class="steps"><li>اتصل بنفس شبكة Wi-Fi التي يتصل بها الكمبيوتر.</li>
        <li>افتح Safari واكتب: ${st.urls.map(u => `<span class="code">${esc(u)}</span>`).join(' أو ')}</li>
        <li>بعد تسجيل الدخول اضغط زر المشاركة <b>⎋</b> ثم <b>«إضافة إلى الشاشة الرئيسية»</b>: يظهر HOME ANAB كتطبيق بأيقونة العنب ويفتح بملء الشاشة.</li>
        <li>لفتح الصور مباشرة استخدم: <span class="code">${esc(url)}/?app=photos</span></li></ol></div>
      <div class="card span2"><h4>${icon('phone')} أندرويد: افتح السيرفر من Chrome</h4>
        <ol class="steps"><li>اتصل بنفس شبكة Wi-Fi.</li>
        <li>افتح Chrome واكتب: ${st.urls.map(u => `<span class="code">${esc(u)}</span>`).join(' أو ')}</li>
        <li>بعد تسجيل الدخول اضغط <b>⋮</b> ثم <b>«إضافة إلى الشاشة الرئيسية»</b> أو <b>«تثبيت التطبيق»</b>: يظهر HOME ANAB بأيقونة العنب.</li>
        <li>رفع الصور مثل الآيفون تماماً (الخطوة ٢)، ويظهر في الاختيار «المعرض» أو «صور Google».</li></ol></div>
      <div class="card span2"><h4>${icon('upload')} ٢. رفع الصور</h4>
        <ol class="steps"><li>افتح تطبيق <b>الصور</b> ← <b>رفع</b> ← اختر الصور (يمكنك تحديد مئات الصور).</li>
        <li>اختر كل صور الأيام الأخيرة دون تفكير: الصور المحفوظة مسبقاً تُكتشف قبل الرفع وتُتخطى خلال ثوانٍ.</li>
        <li>💡 لتحديد صور كثيرة بسرعة: اضغط «تحديد» في نافذة الصور ثم اسحب إصبعك على الصور.</li>
        <li>تُحفظ في مجلدك الشخصي <span class="code">Photos/السنة/الشهر</span> حسب تاريخ الالتقاط.</li>
        <li>للحفاظ على صيغة HEIC الأصلية: في نافذة اختيار الصور اضغط <b>«الخيارات»</b> واختر <b>«الحالي»</b> إن ظهر.</li></ol></div>
      <div class="card span2"><h4>${icon('refresh')} ٣. نسخ احتياطي تلقائي من الآيفون (تطبيق «الاختصارات»)</h4>
        <p class="muted">يرفع الصور الجديدة تلقائياً كلما وصلت إلى البيت. الصور المحفوظة مسبقاً تُتجاهل.</p>
        <ol class="steps">
        <li>في تطبيق <b>الاختصارات</b> أنشئ اختصاراً جديداً باسم «HOME ANAB».</li>
        <li>أضف <b>الحصول على محتويات URL</b> بهذا الرابط (تاريخ آخر نسخ):<div class="u-since"></div></li>
        <li>أضف <b>البحث عن صور</b>: «تاريخ الالتقاط» <b>بعد</b> «محتويات URL»، ورتّبها حسب تاريخ الالتقاط.</li>
        <li>أضف <b>تكرار مع كل عنصر</b>، وبداخله <b>الحصول على محتويات URL</b> بهذا الرابط:<div class="u-up"></div>
          الطريقة <b>POST</b>، نص الطلب <b>Form</b>، أضف حقلاً من نوع <b>ملف</b> اسمه <span class="code">file</span> وقيمته «عنصر التكرار».</li>
        <li>من تبويب <b>الأتمتة</b>: «عند الاتصال بشبكة Wi-Fi» ← اختر شبكة المنزل ← شغّل «HOME ANAB» مباشرة دون سؤال.</li></ol>
        <p class="muted small">⚠️ الرابطان يحتويان رمزك السري: لا تشاركهما مع أحد. إن تسرّب الرمز ولّد رمزاً جديداً وحدّث الاختصار.</p>
        <label class="lbl">رمز API الخاص بك</label><div class="tok"></div>
        <button class="btn" style="margin-top:8px">${icon('refresh')} توليد رمز جديد</button></div></div>`));
    const tok = $('.tok', p);
    const fill = (t) => {
      tok.innerHTML = ''; tok.appendChild(linkBox(t));
      for (const [sel, path] of [['.u-since', '/api/photos/since'], ['.u-up', '/api/photos/upload']]) {
        const el = $(sel, p); el.innerHTML = ''; el.appendChild(linkBox(`${location.origin}${path}?token=${encodeURIComponent(t)}`));
      }
    };
    fill(me.api_token);
    $('.tok + .btn', p).onclick = async () => {
      if (!await confirmBox('سيتوقف الرمز القديم عن العمل في الاختصارات. متابعة؟')) return;
      const r = await guard(() => api.post('/api/me/token')); if (r) fill(r.api_token);
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
    const t = h(`<table class="tbl"><thead><tr><th>الاسم</th><th>المسار على الكمبيوتر</th><th>المستخدمون</th><th>قرص الشبكة</th><th></th></tr></thead><tbody></tbody></table>`);
    for (const f of rows) {
      const who = Object.entries(f.perms).map(([uid, perm]) => { const u = users.find(x => x.id == uid); return u ? `${esc(u.username)} <span class="muted">(${perm === 'rw' ? 'كتابة' : 'قراءة'})</span>` : ''; }).filter(Boolean).join('، ') || '<span class="muted">المدير فقط</span>';
      const tr = h(`<tr><td translate="no"><b></b><div class="muted" style="font-size:12px"></div></td><td class="ltr muted" style="font-size:12px"></td><td>${who}</td>
        <td><button class="btn ghost sm" data-x="smb" title="من يرى هذا المجلد على قرص الشبكة (ويندوز والماك)">${f.smb === 'admin' ? '🔒 للمدير فقط' : '👥 حسب الصلاحيات'}</button></td>
        <td style="white-space:nowrap"><button class="btn sm" data-x="edit">${icon('edit')} الصلاحيات</button>
        <button class="btn ghost icon sm danger" data-x="del">${icon('trash')}</button></td></tr>`);
      $('b', tr).textContent = f.name; $('div.muted', tr).textContent = f.description; $('td.ltr', tr).textContent = f.path + (f.exists ? '' : ' ⚠️');
      $('[data-x=edit]', tr).onclick = () => editFolder(f, reload);
      $('[data-x=smb]', tr).onclick = async () => {
        const v = f.smb === 'admin' ? 'all' : 'admin';
        if (await guard(() => api.patch('/api/admin/folders/' + f.id, { smb: v }))) { toast(v === 'admin' ? 'على قرص الشبكة: للمدير فقط' : 'على قرص الشبكة: حسب الصلاحيات', 'ok'); reload(); }
      };
      $('[data-x=del]', tr).onclick = async () => {
        if (await confirmBox(`إزالة المجلد المشترك «${f.name}» من النظام؟ الملفات نفسها تبقى على القرص.`, { ok: 'إزالة', danger: true })
          && await guard(() => api.del('/api/admin/folders/' + f.id))) reload();
      };
      $('tbody', t).appendChild(tr);
    }
    p.appendChild(t);
  },

  // البند 20: النسخ الاحتياطي والاسترجاع من القرص (حفظ الإعدادات في ملف انتقل إلى «التصدير والاستيراد وإعادة الضبط»، البند 29)
  async backup(sc) {
    const r = await guard(() => api.get('/api/backup')); if (!r) return;
    const { settings: st, status, target: tg } = r;
    const p = section(sc, 'النسخ الاحتياطي', 'انسخ الملفات والصور والإعدادات إلى قرص موصول بالجهاز، يدوياً أو تلقائياً، واسترجعها منه.');
    const reload = () => { sc.innerHTML = ''; CP.backup(sc); };
    const last = st.last;
    const WHAT = r.what_choices, FREQ = r.freq_choices;
    const ord = (o, keys) => keys.filter((k) => o[k]).map((k) => [k, o[k]]);   // الخادم يرتّب المفاتيح أبجدياً
    const WHAT_L = ord(WHAT, ['full', 'files', 'settings']), FREQ_L = ord(FREQ, ['daily', 'weekly', 'monthly']);
    // البند 34: ثلاث خطوات، وكل معلومة تظهر مرة واحدة:
    // ١. القرص (الحالي عليه علامة ومساحته)  ٢. ماذا ومتى  ٣. الحالة وزر «انسخ الآن» (ينسخ حسب اختيار الخطوة ٢)
    const card = h(`<div class="cards" style="padding:0">
      <div class="card"><h4>${icon('hdd')} ١. القرص</h4>
        <div class="bk-dests muted small">جارٍ البحث عن الأقراص الموصولة…</div>
        <details class="bk-other" style="margin-top:8px"><summary class="small">مسار آخر (متقدم)</summary>
          <input class="field" name="target" dir="ltr" placeholder="${esc(st.suggested || '/srv/homenas/backup')}" style="margin-top:6px">
          ${tg.exists && !tg.initialized ? `<div class="muted" style="font-size:12px;margin-top:6px">⚠️ المجلد موجود لكنه غير مُجهز كوجهة نسخ. اضغط «تجهيز».</div><button class="btn sm" data-b="init" style="margin-top:6px">${icon('check')} تجهيز هذا المجلد</button>` : ''}
          <button class="btn sm" data-b="save-path" style="margin-top:6px">حفظ المسار</button>
        </details></div>
      <div class="card"><h4>${icon('clock')} ٢. ماذا يُنسخ، ومتى؟</h4>
        ${WHAT_L.map(([k, v]) => `<label class="check" style="display:flex"><input type="radio" name="what" value="${k}" ${k === st.what ? 'checked' : ''}> ${esc(v)}</label>`).join('')}
        <p class="muted small" style="margin:4px 0 10px">الإعدادات = المستخدمون وكلمات السر، ونجوم العائلة، ومربعات التلفاز وإعداداته، والكاميرات، والمجلدات المشتركة.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div style="flex:2;min-width:140px"><label class="lbl" style="margin-top:0">متى</label>
            <select class="field" name="freq"><option value="off" ${st.enabled ? '' : 'selected'}>يدوياً فقط</option>
              ${FREQ_L.map(([k, v]) => `<option value="${k}" ${st.enabled && k === st.freq ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
          <div style="flex:1;min-width:90px" class="bk-hour"><label class="lbl" style="margin-top:0">الساعة</label><select class="field" name="hour">${Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${i === st.hour ? 'selected' : ''}>${String(i).padStart(2, '0')}:00</option>`).join('')}</select></div>
          <div style="flex:1;min-width:90px"><label class="lbl" style="margin-top:0">عدد النسخ</label><input class="field" name="keep" type="number" min="1" max="365" value="${st.keep}"></div>
        </div>
        <div style="margin-top:12px"><button class="btn primary" data-b="save">حفظ</button></div></div>
      <div class="card span2"><h4>${icon('shield')} ٣. الحالة</h4>
        <p class="bk-state" style="margin:0 0 10px"></p>
        <div class="run-st muted" style="font-size:12px;margin-bottom:8px"></div>
        <button class="btn primary" data-b="run" ${tg.connected && !status.running ? '' : 'disabled'}>${icon('save')} انسخ الآن</button>
        ${!tg.connected ? '<span class="muted small" style="margin-inline-start:8px">اختر القرص في الخطوة ١ ليعمل الزر.</span>' : ''}</div></div>`);
    $('[name=target]', card).value = st.usb_uuid ? '' : (st.target || '');
    // الحالة في سطر واحد: يعمل الآن، أو القرص غير موصول، أو آخر نسخة (ناجحة أو سبب الفشل)
    $('.bk-state', card).innerHTML = status.running ? '<span class="badge accent">يعمل الآن…</span>'
      : !st.target ? '<span class="badge">لم يُختر القرص بعد</span>'
      : !tg.connected ? '<span class="badge err">القرص غير موصول</span> صِله بالجهاز ليعمل النسخ.'
      : last && !last.ok ? `<span class="badge err">فشل آخر نسخ</span> <bdi>${esc(fmtDateTime(last.finished))}</bdi>: ${esc(last.error || last.summary || '')}${st.last_success ? `<br><span class="muted small">آخر نسخة ناجحة: <bdi>${esc(fmtDateTime(st.last_success))}</bdi></span>` : ''}`
      : st.last_success ? `<span class="badge ok">سليم</span> آخر نسخة: <bdi>${esc(fmtDateTime(st.last_success))}</bdi>${last && last.summary ? ` <span class="muted small">(${esc(last.summary)})</span>` : ''}`
      : '<span class="badge warn">لم يُنسخ بعد</span>';
    const freqSel = $('[name=freq]', card);
    const syncHour = () => { $('.bk-hour', card).hidden = freqSel.value === 'off'; };
    freqSel.onchange = syncHour; syncHour();
    p.appendChild(card);
    // ١. الأقراص الموصولة: الحالي عليه علامة ومساحته المتاحة
    const dests = $('.bk-dests', card);
    const drawDests = async () => {
      const t = await api.get('/api/backup/targets').catch(() => null);
      if (!t) { dests.textContent = 'تعذرت قراءة الأقراص.'; return; }
      dests.classList.remove('muted', 'small');
      const cur = t.targets.some((x) => x.current);
      dests.innerHTML = (st.target && !cur ? `<div class="alert ${tg.connected ? '' : 'err'} small" style="margin:0 0 6px">القرص المختار: <b translate="no">${st.usb_label ? esc(st.usb_label) : `<bdi dir="ltr">${esc(st.target)}</bdi>`}</b>${tg.connected ? (tg.total ? ` · متاح ${fmtSize(tg.free)} من ${fmtSize(tg.total)}` : '') : ' — غير موصول'}</div>` : '')
        + (t.targets.length ? t.targets.map((x) => `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1;min-width:0"><b translate="no">${esc(x.title)}</b>
            <div class="muted small" translate="no">${[x.model ? `<bdi>${esc(x.model)}</bdi>` : '', (x.size || x.total) ? `<bdi dir="ltr">${fmtSize(x.size || x.total)}</bdi>` : '', x.free != null ? `متاح <bdi dir="ltr">${fmtSize(x.free)}</bdi>` : '', x.fstype ? `<bdi>${esc(x.fstype)}</bdi>` : ''].filter(Boolean).join(' · ')}</div>
            ${x.kind === 'usb' && !x.versions ? '<div class="muted small">هذه الصيغة تحفظ نسخة واحدة تُحدَّث (بلا نسخ بالتاريخ).</div>' : ''}</div>
          ${x.current ? '<span class="badge ok">✓ المختار</span>' : x.ro ? '<span class="badge warn">للقراءة فقط</span>'
            : `<button class="btn sm" style="white-space:nowrap" data-use="${esc(x.kind === 'usb' ? x.dev : 'internal')}">اختر هذا القرص</button>`}</div>`).join('')
        : '<div class="alert warn small" style="margin:0">لا يوجد قرص موصول. صِل قرصاً خارجياً أو فلاشة بمنفذ USB.</div>')
        + '<button class="btn ghost sm" data-b="rescan" style="margin-top:6px">بحث مرة أخرى</button>';
      $('[data-b=rescan]', dests).onclick = () => { dests.innerHTML = '<span class="muted small">جارٍ البحث…</span>'; drawDests(); };
      $$('[data-use]', dests).forEach((b) => (b.onclick = async () => {
        b.disabled = true;
        const v = b.dataset.use;
        const ok = await guard(() => api.post('/api/backup/use', v === 'internal' ? { kind: 'internal' } : { kind: 'usb', dev: v }));
        b.disabled = false;
        if (ok) { toast('صار هذا القرص وجهة النسخ الاحتياطي', 'ok', 5000); reload(); }
      }));
    };
    drawDests();
    const saveSettings = () => {
      const freq = freqSel.value;
      return guard(() => api.post('/api/backup/settings', { enabled: freq !== 'off', ...(freq !== 'off' ? { freq } : {}),
        what: $('[name=what]:checked', card).value, hour: +$('[name=hour]', card).value, keep: +$('[name=keep]', card).value }));
    };
    $('[data-b=save]', card).onclick = async () => { if (await saveSettings()) { toast('تم الحفظ', 'ok'); reload(); } };
    $('[data-b=save-path]', card).onclick = async () => {
      if (await guard(() => api.post('/api/backup/settings', { target: $('[name=target]', card).value.trim() }))) { toast('تم الحفظ', 'ok'); reload(); }
    };
    const init = $('[data-b=init]', card);
    if (init) init.onclick = async () => { if (await guard(() => api.post('/api/backup/init'))) { toast('أصبح المجلد جاهزاً للنسخ الاحتياطي', 'ok'); reload(); } };
    const runBtn = $('[data-b=run]', card);
    // «انسخ الآن» ينسخ ما هو مختار في الخطوة ٢
    runBtn.onclick = async () => { if (await guard(() => api.post('/api/backup/run', { what: $('[name=what]:checked', card).value }))) { toast('بدأ النسخ الاحتياطي', 'ok'); setTimeout(poll, 700); } };
    async function poll() {
      const x = await api.get('/api/backup').catch(() => null);
      if (!x || !document.body.contains(card)) return;
      if (x.status.running) {
        runBtn.disabled = true;
        $('.bk-state', card).innerHTML = '<span class="badge accent">يعمل الآن…</span>';
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

    // ---- 2. الاستيراد: من القرص الموصول
    const rs = h(`<div class="card" style="margin-top:14px"><h4>${icon('upload')} الاسترجاع من القرص</h4>
      <p class="muted small" style="margin:0 0 8px">«استرجاع الملفات» ينسخ الناقص فقط، ولا يحذف شيئاً ولا يستبدل ملفاً أحدث. «استرجاع الإعدادات» يستبدل الإعدادات الحالية (تُحفظ نسخة منها) ثم يُعاد تشغيل البرنامج. تفعيل هذا الجهاز وإعدادات عتاده تبقى كما هي، حتى لو كانت النسخة من جهاز آخر.</p>
      <div class="rs-body muted small">جارٍ القراءة…</div></div>`);
    p.appendChild(rs);
    const rb = $('.rs-body', rs);
    let rpoll = 0;
    const drawRestore = async () => {
      const x = await api.get('/api/backup/restore').catch(() => null);
      if (!x || !rs.isConnected) return;
      rb.classList.remove('muted', 'small');
      const job = x.job;
      const jobHtml = job.running ? `<div class="alert small" style="margin:0 0 8px">⏳ جارٍ استرجاع الملفات: ${job.files} ملف فُحص، ${job.copied} نُسخ — <span translate="no">${esc(job.current)}</span></div>`
        : job.done ? `<div class="alert ${job.error ? 'err' : 'ok'} small" style="margin:0 0 8px">${job.error ? esc(job.error) : `✅ اكتمل استرجاع الملفات: ${job.copied} ملف.`}</div>` : '';
      if (!x.connected) { rb.innerHTML = jobHtml + '<p class="muted small" style="margin:0">صِل قرص النسخ الاحتياطي واختره في الخطوة ١ لترى نسخه هنا. ويمكن اختيار قرص فيه نسخ من جهاز آخر.</p>'; return; }
      rb.innerHTML = jobHtml + (x.snapshots.length ? `<table class="tbl"><thead><tr><th>النسخة</th><th>فيها</th><th></th></tr></thead><tbody>
        ${x.snapshots.map((s) => `<tr><td><bdi>${esc(s.name === 'mirror' ? 'النسخة المحدَّثة' : fmtDateTime(s.created) || s.name)}</bdi>${s.server_name ? `<div class="muted small" translate="no">${esc(s.server_name)}${s.version ? ` · v${esc(s.version)}` : ''}</div>` : ''}</td>
          <td>${s.settings ? '<span class="badge">الإعدادات</span> ' : ''}${s.files ? '<span class="badge">الملفات والصور</span>' : ''}</td>
          <td style="white-space:nowrap"><button class="btn sm ghost" data-browse="${esc(s.name)}">${icon('folder')} استعراض</button> ${s.files ? `<button class="btn sm" data-r="files" data-s="${esc(s.name)}" ${job.running ? 'disabled' : ''}>استرجاع الملفات</button> ` : ''}
            ${s.settings ? `<button class="btn sm" data-r="settings" data-s="${esc(s.name)}" ${job.running ? 'disabled' : ''}>استرجاع الإعدادات</button>` : ''}</td></tr>`).join('')}</tbody></table>`
        : '<p class="muted small" style="margin:0">لا توجد نسخ على هذا القرص بعد.</p>');
      $$('[data-browse]', rb).forEach((b) => (b.onclick = () => openApp('files', { path: `/backup/${b.dataset.browse}`, forceNew: false })));
      $$('[data-r]', rb).forEach((b) => (b.onclick = async () => {
        const part = b.dataset.r;
        if (!(await confirmBox(part === 'settings' ? 'ستُستبدل إعدادات هذا الجهاز ومستخدموه بما في النسخة، ثم يُعاد تشغيل البرنامج. متأكد؟'
          : 'ستُنسخ الملفات والصور الناقصة من النسخة إلى الجهاز. لا يُحذف شيء. متابعة؟', { ok: 'استرجاع' }))) return;
        const res = await guard(() => api.post('/api/backup/restore', { snapshot: b.dataset.s, part }));
        if (!res) return;
        if (part === 'settings') {
          await modal({ title: 'استرجاع الإعدادات', body: h(`<p>${res.restart ? 'يُعاد تشغيل البرنامج الآن. انتظر نصف دقيقة ثم حدّث الصفحة وادخل بحساب من النسخة.' : 'أعد تشغيل البرنامج ليُطبَّق الاسترجاع.'}</p>`) });
          if (res.restart) setTimeout(() => location.reload(), 30000);
        } else { toast('بدأ استرجاع الملفات', 'ok'); drawRestore(); }
      }));
      clearTimeout(rpoll);
      if (job.running) rpoll = setTimeout(drawRestore, 2000);
    };
    drawRestore();

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
    const fs = await guard(() => api.get('/api/faces/status'));
    if (fs) {
      const fc = h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('users')} تمييز الوجوه</h4>
        <p class="muted">يجمع صور كل شخص في «الأشخاص» داخل تطبيق الصور، ويمكنك البحث باسم الشخص. تتم المعالجة على هذا الجهاز فقط، ولا تُرسل أي صورة إلى الإنترنت.</p>
        <div class="fstate"></div></div>`);
      const st = $('.fstate', fc);
      const draw = (s) => {
        if (s.installing) { st.innerHTML = `<p><span class="badge accent">جارٍ التثبيت…</span> تنزيل OpenCV ونماذج التمييز (حوالي 40 MB).</p>`; return true; }
        if (!s.ready) {
          st.innerHTML = `${s.error ? `<p class="alert err small" translate="no">${esc(s.error)}</p>` : ''}
            <p class="muted small">يحتاج إنترنت مرة واحدة، وقد يكون بطيئاً على الأجهزة القديمة في البداية (يعمل في الخلفية بأولوية منخفضة).</p>
            <button class="btn primary">${icon('download')} تثبيت وتفعيل</button>`;
          $('button', st).onclick = async () => { if (await guard(() => api.post('/api/faces/setup'))) poll(); };
          return false;
        }
        const pct = s.total ? Math.round(s.done / s.total * 100) : 100;
        st.innerHTML = `<label class="check"><input type="checkbox" ${s.enabled ? 'checked' : ''}> تمييز الوجوه مفعّل</label>
          ${s.enabled ? `<div class="meter"><div style="width:${pct}%"></div></div>
          <p class="muted small">تمت معالجة ${s.done} من ${s.total} صورة · ${s.faces} وجه</p>` : ''}
          <button class="btn ghost sm">${icon('refresh')} إعادة فحص كل الصور</button>`;
        $('input', st).onchange = async (e) => { await guard(() => api.post('/api/faces/enable', { enabled: e.target.checked })); poll(); };
        $('.btn', st).onclick = async () => { if (await confirmBox('إعادة البحث عن الوجوه في كل الصور؟ قد يستغرق ذلك وقتاً.')) { await guard(() => api.post('/api/faces/rescan')); poll(); } };
        return s.enabled && s.done < s.total;
      };
      const poll = async () => { const s = await api.get('/api/faces/status').catch(() => null); if (s && document.body.contains(fc) && draw(s)) setTimeout(poll, 3000); };
      if (draw(fs)) setTimeout(poll, 3000);
      p.appendChild(fc);
    }
    p.appendChild(h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('info')} الدعم</h4>
      <dl class="kv"><dt>صور HEIC</dt><dd>${s.heif ? '<span class="badge ok">مدعومة</span>' : '<span class="badge err">غير مدعومة — ثبّت pillow-heif</span>'}</dd>
      <dt>مصغرات الفيديو</dt><dd>${s.ffmpeg ? '<span class="badge ok">مفعّلة (ffmpeg)</span>' : '<span class="badge warn">ثبّت ffmpeg لتفعيلها (اختياري)</span>'}</dd></dl></div>`));
  },

  async general(sc) {
    const s = await guard(() => api.get('/api/admin/settings')); if (!s) return;
    const p = section(sc, 'عام', '');
    p.appendChild(aboutCard());
    const card = h(`<div class="card" style="max-width:560px"><h4>${icon('server')} اسم السيرفر</h4>
      <input class="field" maxlength="40"><div style="margin-top:14px"><button class="btn primary">حفظ</button></div></div>`);
    $('input', card).value = s.server_name;
    $('button', card).onclick = async () => { if (await guard(() => api.post('/api/admin/settings', { server_name: $('input', card).value }))) { toast('تم الحفظ', 'ok'); document.title = $('input', card).value; } };
    p.appendChild(card);
    p.appendChild(h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('info')} معلومات</h4><dl class="kv">
      <dt>الإصدار</dt><dd translate="no">HOME ANAB v${esc(s.version)}</dd>
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
      p.appendChild(updateCard());
    }
  },

  // الإضافات: تطبيقات جانبية ليست مع النظام، تُرفع بملف ZIP وتظهر على سطح المكتب
  async addons(sc) {
    const p = section(sc, 'الإضافات', 'تطبيقات جانبية ليست مع النظام. ترفعها بملف ZIP فتظهر أيقونتها على سطح المكتب. ارفع فقط ملفاً تثق بمن صنعه: الإضافة تعمل داخل السيرفر.',
      `<button class="btn primary" data-a="up">${icon('upload')} رفع إضافة</button>`);
    const box = h('<div class="muted">جارٍ القراءة…</div>');
    p.appendChild(box);
    const tell = () => dispatchEvent(new CustomEvent('nas-addons'));
    const load = async () => {
      const r = await guard(() => api.get('/api/admin/addons')); if (!r) return;
      box.className = '';
      box.innerHTML = r.addons.length ? r.addons.map((a) => `<div class="card addon-card" style="max-width:620px;margin-bottom:12px;display:flex;gap:14px;align-items:center">
          <span style="background:${esc(a.color)};width:44px;height:44px;border-radius:12px;display:grid;place-items:center;color:#fff;flex:none">${icon(a.icon)}</span>
          <div style="flex:1;min-width:0"><b>${esc(a.name)}</b> <span class="badge" translate="no">${esc(a.version)}</span>${a.admin ? ' <span class="badge">للمدير فقط</span>' : ''}
            <div class="muted small">${esc(a.summary || '')}</div>
            <div class="muted small">نُصّبت في ${fmtDateTime(new Date(a.installed * 1000))}</div></div>
          <button class="btn ghost" data-del="${esc(a.id)}">${icon('trash')} حذف</button></div>`).join('')
        : '<p class="muted">لا توجد إضافات بعد. اضغط «رفع إضافة» واختر ملف ZIP.</p>';
      $$('[data-del]', box).forEach((b) => (b.onclick = async () => {
        const a = r.addons.find((x) => x.id === b.dataset.del);
        const v = await form(`حذف «${a.name}»`, [{ name: 'pw', label: 'كلمة مرور حسابك', type: 'password' }], { ok: 'حذف' });
        if (!v) return;
        if (await guard(() => api.post(`/api/admin/addons/${a.id}/remove`, { password: v.pw }))) { toast('حُذفت الإضافة. الملفات التي صنعتها تبقى في مجلدات أصحابها', 'ok'); tell(); load(); }
      }));
    };
    $('[data-a=up]', sc).onclick = async () => {
      const body = h(`<div><label class="lbl">ملف الإضافة (ZIP)</label><input class="field" type="file" name="f" accept=".zip">
        <label class="lbl">كلمة مرور حسابك</label><input class="field" type="password" name="pw" autocomplete="current-password">
        <p class="muted small">إن كانت الإضافة منصّبة من قبل تُستبدل بالإصدار الجديد.</p></div>`);
      const ok = await modal({ title: 'رفع إضافة', body, buttons: [{ label: 'إلغاء', value: null }, {
        label: 'رفع', cls: 'primary', value: true, validate: async (b) => {
          const f = $('[name=f]', b).files[0];
          if (!f) { toast('اختر ملف الإضافة', 'err'); return false; }
          const fd = new FormData(); fd.append('file', f); fd.append('password', $('[name=pw]', b).value);
          const r = await fetch('/api/admin/addons', { method: 'POST', body: fd, headers: { 'X-Requested-With': 'fetch' } });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { toast(j.error || 'تعذر رفع الإضافة', 'err', 9000); return false; }
          toast(`${j.upgraded ? 'حُدّثت' : 'نُصّبت'} «${j.addon.name}». أيقونتها على سطح المكتب`, 'ok'); return true;
        } }] });
      if (ok) { tell(); load(); }
    };
    load();
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

async function lookCard() {
  const l = await guard(() => api.get('/api/me/look')); if (!l) return h('<div></div>');
  const c = h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('image')} صورتي وخلفية سطح المكتب</h4>
    <div style="display:flex;align-items:center;gap:14px">
      <div class="me-photo"></div>
      <div><button class="btn" data-x="photo">${icon('upload')} رفع صورة</button> <button class="btn ghost" data-x="nophoto">إزالة الصورة</button>
        <div class="muted small" style="margin-top:4px">تظهر على التلفاز وفي قائمة البداية.</div></div></div>
    <label class="lbl" style="margin-top:14px">الخلفية</label>
    <div class="walls"></div>
    <div style="margin-top:10px"><button class="btn" data-x="wall">${icon('upload')} صورة من جهازي كخلفية</button></div>
    <input type="file" accept="image/*" class="hidden" data-f="photo"><input type="file" accept="image/*" class="hidden" data-f="wall"></div>`);
  const tell = (x) => window.dispatchEvent(new CustomEvent('hsef-look', { detail: x }));
  const draw = (x) => {
    Object.assign(l, x);
    $('.me-photo', c).innerHTML = l.photo_v ? `<img src="/api/users/${ME.id}/photo?v=${l.photo_v}" alt="">` : `<span>${esc((ME.username || '?')[0].toUpperCase())}</span>`;
    $('[data-x=nophoto]', c).style.display = l.photo_v ? '' : 'none';
    $('.walls', c).innerHTML = Object.entries(l.presets).map(([k, v]) => `<button class="wall ${l.wallpaper === 'preset:' + k ? 'on' : ''}" data-w="${k}"
      style="background:${v || 'var(--wall)'}"></button>`).join('') + (l.wallpaper.startsWith('image:') ? `<button class="wall on" style="background:${l.wallpaper_css}"></button>` : '');
    $$('.walls [data-w]', c).forEach(b => b.onclick = async () => {
      const r = await guard(() => api.post('/api/me/wallpaper', { preset: b.dataset.w })); if (r) { draw(r); tell(r); }
    });
  };
  const upload = async (url, f) => {
    const fd = new FormData(); fd.append('image', f);
    toast('جارٍ الرفع…');
    try {
      const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
      const r = await res.json(); if (!res.ok) throw new Error(r.error || res.status);
      draw(r); tell(r); toast('تم', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  };
  for (const k of ['photo', 'wall']) {
    const inp = $(`[data-f=${k}]`, c);
    $(`[data-x=${k}]`, c).onclick = () => inp.click();
    inp.onchange = () => { const f = inp.files[0]; inp.value = ''; if (f) upload(k === 'photo' ? '/api/me/photo' : '/api/me/wallpaper', f); };
  }
  $('[data-x=nophoto]', c).onclick = async () => {
    if (await guard(() => api.del('/api/me/photo'))) { draw({ photo_v: 0 }); tell({ ...l, photo_v: 0 }); }
  };
  draw({});
  return c;
}

function usbIphoneCard() {
  const c = h(`<div class="card" style="margin-bottom:14px"><h4>${icon('phone')} نسخ الصور بالكابل (USB)</h4>
    <ol class="steps"><li>صِل الآيفون بأي منفذ USB في جهاز السيرفر بكابل الشحن.</li>
      <li>افتح قفل الهاتف، واضغط <b>«الوثوق»</b> عند السؤال، وأدخل رمز الهاتف.</li>
      <li>تُنسخ كل الصور والفيديوهات الجديدة تلقائياً إلى «الصور» لصاحب الهاتف. النسخ القادم ينسخ الجديد فقط.</li></ol>
    <div class="ub"></div></div>`);
  const box = $('.ub', c);
  const STATE = { none: 'لا يوجد هاتف موصول', detected: 'تم اكتشاف جهاز Apple…', need_trust: 'افتح قفل الهاتف واضغط «الوثوق»',
    locked: 'افتح قفل الهاتف أولاً', mounted: 'الهاتف موصول', error: 'تعذر فتح صور الهاتف', not_installed: 'يحتاج تثبيت أدوات الآيفون' };
  let timer = 0;
  const draw = async () => {
    clearTimeout(timer);
    if (!document.body.contains(c) && box.dataset.drawn) return;
    box.dataset.drawn = 1;
    const r = await api.get('/api/admin/iphone').catch(() => null);
    if (!r) return;
    if (!r.installed) {
      box.innerHTML = r.appliance ? `<p class="muted">أدوات الآيفون غير مثبتة على هذا السيرفر (تُثبّت مرة واحدة وتحتاج إنترنت).</p>
        <button class="btn primary" data-x="inst">${icon('download')} تثبيت</button>` : '<p class="muted">متاح على جهاز HOME ANAB المخصص.</p>';
      const b = $('[data-x=inst]', box);
      if (b) b.onclick = async () => { b.disabled = true; toast('جارٍ التثبيت…'); if (await guard(() => api.post('/api/admin/iphone/install', {}))) { toast('تم', 'ok'); draw(); } b.disabled = false; };
      return;
    }
    const st = r.status || {}, pr = r.progress || {};
    const pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0;
    let html = `<p><span class="badge ${st.state === 'mounted' ? 'ok' : st.state === 'need_trust' || st.state === 'locked' ? 'warn' : ''}">${esc(STATE[st.state] || st.state)}</span>
      ${st.name ? ` <b>${esc(st.name)}</b>` : ''}</p>`;
    if (pr.running) {
      html += `<div style="height:10px;border-radius:99px;background:var(--surface-3);overflow:hidden" dir="ltr"><div style="height:100%;width:${pct}%;background:var(--accent)"></div></div>
        <p class="small">جارٍ النسخ إلى «${esc(pr.user || '')}»: ${pr.done} من ${pr.total} · جديدة ${pr.copied}</p>`;
    } else if (pr.finished && pr.udid === st.udid) {
      html += `<p class="small"><span class="badge ok">انتهى</span> نُسخت ${pr.copied} صورة جديدة من ${pr.total}${pr.error ? ` · <span class="badge err">${esc(pr.error)}</span>` : ''}. يمكنك فصل الهاتف.</p>`;
    }
    const devs = Object.entries(r.devices || {});
    if (devs.length) {
      html += `<table class="tbl" style="margin-top:8px"><thead><tr><th>الهاتف</th><th>صاحبه (تُنسخ الصور إلى صوره)</th><th>تلقائي</th><th>آخر نسخ</th><th></th></tr></thead><tbody>
        ${devs.map(([udid, d]) => `<tr data-u="${esc(udid)}"><td><b>${esc(d.name)}</b><div class="muted small ltr">${esc(udid.slice(0, 13))}…</div></td>
          <td><select class="field" style="min-width:140px"><option value="">— اختر —</option>${r.users.map(u => `<option value="${u.id}" ${u.id === d.user_id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></td>
          <td><input type="checkbox" ${d.auto ? 'checked' : ''}></td>
          <td class="small">${d.last ? `${esc(d.last.at.replace('T', ' '))} · ${d.last.copied} جديدة` : '—'}</td>
          <td style="white-space:nowrap">${st.udid === udid && st.state === 'mounted' && !pr.running ? `<button class="btn sm" data-x="sync">نسخ الآن</button>` : ''}
            <button class="btn ghost icon sm danger" data-x="forget" title="نسيان">${icon('trash')}</button></td></tr>`).join('')}</tbody></table>
        <p class="muted small">عند توصيل هاتف جديد يظهر هنا، فاختر صاحبه مرة واحدة.</p>`;
    }
    box.innerHTML = html;
    $$('tr[data-u]', box).forEach(tr => {
      const udid = tr.dataset.u;
      $('select', tr).onchange = (e) => guard(() => api.post('/api/admin/iphone/device', { udid, user_id: e.target.value || null })).then(draw);
      $('input', tr).onchange = (e) => guard(() => api.post('/api/admin/iphone/device', { udid, auto: e.target.checked }));
      const s = $('[data-x=sync]', tr); if (s) s.onclick = () => guard(() => api.post('/api/admin/iphone/sync', {})).then(draw);
      $('[data-x=forget]', tr).onclick = async () => { if (await confirmBox('نسيان هذا الهاتف؟ الصور المنسوخة تبقى.')) guard(() => api.post('/api/admin/iphone/device', { udid, forget: true })).then(draw); };
    });
    timer = setTimeout(draw, pr.running || ['detected', 'need_trust', 'locked'].includes(st.state) ? 1500 : 4000);
  };
  draw();
  return c;
}

function aboutCard() {
  return h(`<div class="card about-card" style="max-width:560px;margin-top:14px"><h4>${icon('info')} حول النظام</h4>
    <div style="background:#fff;border-radius:12px;padding:12px 16px;margin-bottom:12px;text-align:center"><img src="/static/img/logo.svg" alt="HOME ANAB" style="height:56px;max-width:100%">
      <div style="color:#15803d;font-weight:700">منزل العنب — نظام النسخ الاحتياطي المنزلي</div></div>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <img src="/static/img/whatsapp-qr.png" alt="رمز QR للتواصل عبر واتساب" style="width:132px;height:132px;border-radius:10px;background:#fff;padding:4px">
      <div style="line-height:1.9">
        <div>صمّم هذا النظام وكتبه: <b translate="no">Hussein Sefrani</b></div>
        <div>الهاتف وواتساب: <a dir="ltr" href="tel:+32494499430" translate="no">0032 494 49 94 30</a></div>
        <div>البريد: <a dir="ltr" href="mailto:Hussein@sefrani.com" translate="no">Hussein@sefrani.com</a></div>
        <div class="muted small">امسح الرمز بكاميرا الهاتف للتواصل عبر واتساب</div>
      </div></div></div>`);
}

function updateCard() {
  const c = h(`<div class="card" style="max-width:560px;margin-top:14px"><h4>${icon('download')} تحديث النظام</h4><div class="ub muted">جارٍ البحث عن تحديث…</div>
    <div class="uf" style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px">
      <b>تحديث من فلاشة (بدون إنترنت)</b>
      <p class="muted small" style="margin:4px 0 8px">ضع ملف <span class="code">hsef-app-…tar.gz</span> من صفحة التحديثات على فلاشة، صِلها بهذا الكمبيوتر واختر الملف.<br><a dir="ltr" translate="no" target="_blank" rel="noopener" href="https://github.com/HUSSEIN-SEFRANI/hussein-sefrani/tree/updates">github.com/HUSSEIN-SEFRANI/hussein-sefrani/tree/updates</a></p>
      <input type="file" accept=".gz,application/gzip" class="hidden"><button class="btn">${icon('upload')} اختيار ملف التحديث</button></div></div>`);
  const box = $('.ub', c);
  if (ME.activation && ME.activation.limited) {
    const al = h(`<p class="alert warn small">انتهى التفعيل، فتحديثات النظام متوقفة. <a href="#">جدّد من صفحة «التفعيل»</a></p>`);
    $('a', al).onclick = (e) => { e.preventDefault(); openApp('control', { section: 'activation' }); };
    box.before(al);
  }
  const fileIn = $('.uf input', c);
  $('.uf button', c).onclick = () => fileIn.click();
  fileIn.onchange = async () => {
    const f = fileIn.files[0]; fileIn.value = ''; if (!f) return;
    const fd = new FormData(); fd.append('pkg', f);
    toast('جارٍ رفع الملف…');
    let r;
    try {
      const res = await fetch('/api/admin/update/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
      r = await res.json(); if (!res.ok) throw new Error(r.error || res.status);
    } catch (e) { toast(e.message, 'err'); return; }
    const msg = r.version === r.current ? `الملف هو نفس الإصدار الحالي v${r.version}. إعادة تثبيته؟` : `تحديث HOME ANAB من v${r.current} إلى v${r.version}؟ سيتوقف السيرفر لحظات.`;
    if (!await confirmBox(msg, { ok: 'تحديث' })) return;
    if (await guard(() => api.post('/api/admin/update/apply-file', {}))) {
      toast('بدأ التحديث', 'ok');
      let was = false;
      const wait = async () => {
        const s = await api.get('/api/admin/update').catch(() => null);
        if (s && s.status && s.status.running) was = true;
        if (s && (was || s.current === r.version) && !(s.status && s.status.running)) { location.reload(); return; }
        setTimeout(wait, 4000);
      };
      setTimeout(draw, 1500); setTimeout(wait, 5000);
    }
  };
  let timer = 0;
  const draw = async () => {
    clearTimeout(timer);
    if (!document.body.contains(c) && timer) return;
    const r = await api.get('/api/admin/update').catch(() => null);
    if (!r) { box.textContent = 'تعذر الاتصال بالسيرفر'; timer = setTimeout(draw, 5000); return; }
    const st = r.status || {};
    const rb = st.rolled_back;
    const prevBox = () => {
      const parts = [];
      if (rb && rb.from && !st.running) parts.push(`<p class="alert warn small">${rb.reason === 'manual' ? 'رجعت إلى الإصدار السابق' : 'التحديث الأخير لم يعمل، فأعاد النظام الإصدار السابق تلقائياً'}: <b translate="no">v${esc(rb.to)}</b> (بدل <span translate="no">v${esc(rb.from)}</span>).</p>`);
      if (st.previous && st.previous !== r.current && !st.running)
        parts.push(`<p class="small" style="margin-top:10px"><button class="btn sm" data-a="rollback">${icon('refresh')} الرجوع إلى الإصدار السابق <span translate="no">v${esc(st.previous)}</span></button> <span class="muted">إن ظهرت مشكلة بعد التحديث</span></p>`);
      return parts.join('');
    };
    const wireRollback = () => {
      const b = $('[data-a=rollback]', box); if (!b) return;
      b.onclick = async () => {
        if (!await confirmBox(`الرجوع إلى الإصدار v${st.previous}؟ تبقى كل الملفات والصور والإعدادات.`, { ok: 'رجوع' })) return;
        if (await guard(() => api.post('/api/admin/update/rollback', {}))) { toast('جارٍ الرجوع…', 'ok'); setTimeout(draw, 2000); }
      };
    };
    if (st.running) {
      box.innerHTML = `<p><span class="badge accent">جارٍ التحديث…</span> لا تطفئ الجهاز. قد يستغرق بضع دقائق، وستُعاد الصفحة تلقائياً.</p><pre class="code" style="white-space:pre-wrap" translate="no"></pre>`;
      $('pre', box).textContent = st.log || '';
      timer = setTimeout(draw, 4000); return;
    }
    if (r.error) {
      const e = String(r.error);
      const why = r.offline ? 'وضع «بدون إنترنت» مفعّل في إعدادات الجهاز (قسم الجهاز). أوقفه مؤقتاً للتحديث عبر الإنترنت.'
        : /certificate|CERTIFICATE|not yet valid|expired/.test(e) ? 'ساعة الجهاز غير صحيحة، فرُفض الاتصال الآمن. صحّح التاريخ والوقت من قسم الجهاز ثم أعد المحاولة.'
        : /name resolution|Name or service|getaddrinfo|Errno -[23]|No address/.test(e) ? 'السيرفر غير متصل بالإنترنت (الراوتر بلا إنترنت أو الكابل غير موصول).'
        : /timed out|timeout/i.test(e) ? 'انتهت مهلة الاتصال: الإنترنت بطيء أو غير متاح.'
        : /refused|unreachable|Network is/.test(e) ? 'لا يوجد اتصال بالشبكة الخارجية.'
        : /403|rate limit/i.test(e) ? 'GitHub رفض الطلب مؤقتاً. أعد المحاولة بعد ساعة.' : '';
      box.innerHTML = prevBox() + `<p class="muted">الإصدار الحالي <b translate="no">v${esc(r.current)}</b>. تعذر التحقق من التحديثات عبر الإنترنت.</p>
        ${why ? `<p class="alert warn small">${why}</p>` : ''}
        <details class="small"><summary>التفاصيل التقنية</summary><code translate="no" style="white-space:pre-wrap">${esc(e)}</code></details>
        <p class="muted small">يمكنك دائماً التحديث من فلاشة (أدناه).</p> <button class="btn sm" data-a="retry">${icon('refresh')} إعادة المحاولة</button>`;
      $('[data-a=retry]', box).onclick = () => { box.textContent = 'جارٍ التحقق…'; draw(); };
      wireRollback();
      return;
    }
    if (!r.available) {
      box.innerHTML = `<p><span class="badge ok">النظام محدّث</span> الإصدار الحالي <b translate="no">v${esc(r.current)}</b></p>`
        + (st.failed && !rb ? `<p class="alert err small" translate="no">${esc(st.log || '')}</p>` : '') + prevBox();
      wireRollback();
      return;
    }
    box.innerHTML = `<p>يتوفر إصدار جديد: <b translate="no">v${esc(r.latest)}</b> (الحالي <span translate="no">v${esc(r.current)}</span>)</p>
      <details><summary>ما الجديد</summary><div class="muted small" style="white-space:pre-wrap"></div></details>
      <p class="muted small">التحديث يحافظ على كل الملفات والصور والإعدادات.</p>
      <button class="btn primary">${icon('download')} تحديث الآن</button>`;
    $('details div', box).textContent = r.notes || '';
    $('button', box).onclick = async () => {
      if (!await confirmBox(`تحديث HOME ANAB إلى v${r.latest}؟ سيتوقف السيرفر لحظات أثناء التحديث.`, { ok: 'تحديث' })) return;
      if (await guard(() => api.post('/api/admin/update', {}))) {
        toast('بدأ التحديث', 'ok');
        let was = false;
        const wait = async () => {
          const s = await api.get('/api/admin/update').catch(() => null);
          if (s && s.status && s.status.running) was = true;
          if (s && was && !(s.status && s.status.running)) { location.reload(); return; }
          if (s && !was && s.current === r.latest) { location.reload(); return; }
          setTimeout(wait, 4000);
        };
        setTimeout(draw, 1500); setTimeout(wait, 5000);
      }
    };
  };
  draw();
  return c;
}

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
    ${u ? `<label class="lbl">الصورة الشخصية</label><div style="display:flex;align-items:center;gap:10px"><div class="me-photo" style="width:56px;height:56px;font-size:22px"><img src="/api/users/${u.id}/photo?t=${Date.now()}" alt="" onerror="this.replaceWith(document.createTextNode('${esc((u.username || '?')[0].toUpperCase())}'))"></div>
      <button type="button" class="btn sm" data-ph="up">${icon('upload')} رفع صورة</button><button type="button" class="btn ghost sm" data-ph="del">إزالة</button><input type="file" accept="image/*" class="hidden" data-ph="file"></div>` : ''}
    ${folders.length ? '<label class="lbl">الصلاحيات على المجلدات المشتركة</label><div class="perm-grid"></div>' : ''}</div>`);
  if (u) {
    const fin = $('[data-ph=file]', body), box = $('.me-photo', body);
    $('[data-ph=up]', body).onclick = () => fin.click();
    fin.onchange = async () => {
      const f = fin.files[0]; fin.value = ''; if (!f) return;
      const fd = new FormData(); fd.append('image', f);
      try {
        const res = await fetch(`/api/admin/users/${u.id}/photo`, { method: 'POST', body: fd, credentials: 'same-origin' });
        const r = await res.json(); if (!res.ok) throw new Error(r.error || res.status);
        box.innerHTML = `<img src="/api/users/${u.id}/photo?v=${r.photo_v}" alt="">`; toast('تم رفع الصورة', 'ok');
      } catch (e) { toast(e.message, 'err'); }
    };
    $('[data-ph=del]', body).onclick = async () => { if (await guard(() => api.del(`/api/admin/users/${u.id}/photo`))) box.textContent = (u.username || '?')[0].toUpperCase(); };
  }
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
