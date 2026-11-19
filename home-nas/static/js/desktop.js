// ====================================================================
// HOME ANAB — سطح المكتب: الأيقونات، شريط المهام، قائمة البدء، الساعة
// ====================================================================
import { ME, I18N, $, $$, h, esc, icon, api, apps, openApp, closePopovers, isMobile, toast, fileOps, menu, modal, tileHTML, appLook, ICON_NAMES, glyph } from './core.js';
import { FRUITS, ANIMALS } from './icon-art.js';
import './apps/files.js';
import './apps/photos.js';
import './apps/system.js';
import './apps/stars.js';
import './apps/cameras.js';
import './apps/media.js';
import './apps/family.js';
import { appUrl } from './apps/appstore.js';
import { vine } from './tv-fruit.js';

const desktop = $('#desktop');
const deskVine = $('#desk-vine');
function drawVine(on) {
  if (!deskVine) return;
  deskVine.innerHTML = on ? vine('grape', { hang: [260, 520, 760, 1020] }) : '';
  const sv = deskVine.querySelector('svg');
  if (sv) { sv.setAttribute('preserveAspectRatio', 'xMidYMin slice'); sv.removeAttribute('width'); sv.removeAttribute('height'); }
}
// خلفية سطح المكتب وصورة المستخدم (تتغير من لوحة التحكم ← حسابي)
function applyLook(l) {
  Object.assign(ME, l);
  desktop.style.background = l.wallpaper_css || '';
  if (l.wallpaper_css) desktop.style.backgroundAttachment = 'fixed';
  drawVine(!l.wallpaper_css || String(l.wallpaper).startsWith('preset:'));
}
applyLook(ME);
window.addEventListener('hsef-look', (e) => applyLook(e.detail));
const visible = () => apps().filter(a => !a.hidden);

// أيقونات سطح المكتب
const icons = $('#icons');
let famPending = 0;   // مهام أنهاها الأطفال وتنتظر تأكيد الأب أو الأم
const shortcuts = [...visible(), { id: 'phone', title: 'ربط الآيفون والأندرويد', icon: 'phone', color: 'linear-gradient(135deg,#00b4db,#0083b0)', launch: () => openApp('control', { section: 'phone' }) }];
function drawIcons() {
  icons.innerHTML = '';
  for (const a of shortcuts) {
    const badge = a.id === 'family' && famPending ? `<i class="dbadge">${famPending}</i>` : '';
    const b = h(`<button class="dicon">${tileHTML(a, '', badge)}<span ${a.external ? 'translate="no"' : ''}>${esc(a.title)}</span></button>`);
    b.onclick = () => a.launch ? a.launch() : openApp(a.id);
    // البند 44: زر أيمن (أو ضغطة طويلة) ← تغيير الأيقونة
    if (!a.media) b.oncontextmenu = (e) => {
      e.preventDefault(); e.stopPropagation();
      menu(e.clientX, e.clientY, [
        { label: 'فتح', icon: 'external', fn: () => b.click() },
        '-',
        { label: 'تغيير الأيقونة…', icon: 'edit', fn: () => changeIcon(a) },
        { label: 'الأيقونة الأصلية', icon: 'refresh', hidden: !(ME.icons || {})[a.id], fn: () => resetIcon(a) },
      ]);
    };
    icons.appendChild(b);
  }
}
drawIcons();

// التطبيقات المثبتة من «مركز التطبيقات» تظهر كأيقونات تفتح في تبويب جديد
async function loadInstalledApps() {
  const list = await api.get('/api/appstore/installed').catch(() => []);
  for (let i = shortcuts.length - 1; i >= 0; i--) if (shortcuts[i].external) shortcuts.splice(i, 1);
  for (const a of list) shortcuts.push({ id: 'x-' + a.id, title: a.name, icon: a.icon, color: a.color, external: true,
    launch: () => window.open(appUrl(a.port, a.path, a.scheme), '_blank') });
  drawIcons();
}
loadInstalledApps();
addEventListener('nas-apps', loadInstalledApps);

// بطاقة الذاكرة والفلاشات (للمدير): أيقونة تظهر عند إدخالها وتختفي عند سحبها
if (ME.is_admin) {
  let known = null, timer = 0;
  const pollMedia = async () => {
    clearTimeout(timer);
    const r = await api.get('/api/media').catch(() => null);
    if (r) {
      const sig = r.cards.map((c) => c.dev + (c.mount ? '+' : '')).join(',');
      if (sig !== known) {
        const before = (known || '').split(',').map((x) => x.replace('+', ''));
        const added = known === null ? [] : r.cards.filter((c) => !before.includes(c.dev));
        known = sig;
        for (let i = shortcuts.length - 1; i >= 0; i--) if (shortcuts[i].media) shortcuts.splice(i, 1);
        for (const c of [...r.cards].reverse()) shortcuts.unshift({ id: 'm-' + c.dev, title: c.title, icon: 'save', media: true,
          color: 'linear-gradient(135deg,#0ea5e9,#6366f1)', launch: () => openApp('media', { dev: c.dev }) });
        drawIcons();
        if (added.length) toast(`💾 ${added[0].title}: اضغط أيقونتها على سطح المكتب لفتحها`, 'ok');
      }
    }
    timer = setTimeout(pollMedia, document.hidden ? 20000 : 4000);
  };
  pollMedia();
  addEventListener('nas-media', pollMedia);
}

// قائمة البدء
$('#tb-start').onclick = (e) => {
  e.stopPropagation();
  const existing = $('#startmenu'); if (existing) { existing.remove(); return; }
  const m = h(`<div class="popover" id="startmenu"><div class="apps"></div>
    <div class="who"><div class="av"></div><div class="nm"><b></b><div class="muted" style="font-size:12px"></div></div>
    <a class="btn ghost" href="/logout">${icon('logout')} خروج</a></div></div>`);
  for (const a of shortcuts) {
    const b = h(`<button>${tileHTML(a)}<span ${a.external ? 'translate="no"' : ''}>${esc(a.title)}</span></button>`);
    b.onclick = () => { m.remove(); a.launch ? a.launch() : openApp(a.id); };
    $('.apps', m).appendChild(b);
  }
  if (ME.photo_v) $('.av', m).innerHTML = `<img src="/api/users/${ME.id}/photo?v=${ME.photo_v}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  else $('.av', m).textContent = (ME.username || '?')[0].toUpperCase();
  $('.nm b', m).textContent = ME.username; $('.nm .muted', m).textContent = ME.is_admin ? 'مدير النظام' : 'مستخدم';
  if (window.I18N && I18N.switcher) m.appendChild(I18N.switcher());
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('pointerdown', function off(ev) {
    if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); }
  }, true));
};

// الساعة
const clock = $('#tb-clock');
const tick = () => { clock.textContent = new Intl.DateTimeFormat(I18N.locale, { weekday: 'short', hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' }).format(new Date()); };
tick(); setInterval(tick, 15000);

desktop.addEventListener('contextmenu', e => { if (e.target === desktop || e.target === icons) e.preventDefault(); });

// ---------------------------------------------------------------- البند 44: تغيير أيقونة برنامج (لكل مستخدم)
const ICON_COLORS = [
  'linear-gradient(135deg,#f43f5e,#8b5cf6)', 'linear-gradient(135deg,#7c3aed,#db2777)', 'linear-gradient(135deg,#00b4db,#0083b0)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)', 'linear-gradient(135deg,#10b981,#059669)', 'linear-gradient(135deg,#84cc16,#16a34a)',
  'linear-gradient(135deg,#f59e0b,#ea580c)', 'linear-gradient(135deg,#f97316,#ef4444)', 'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#64748b,#334155)', 'linear-gradient(135deg,#111827,#374151)', 'linear-gradient(135deg,#a16207,#713f12)',
  // فاتحة: تناسب أيقونات الفواكه والحيوانات الملونة (البند 45)
  'linear-gradient(135deg,#ffffff,#e2e8f0)', 'linear-gradient(135deg,#fef9c3,#fde68a)', 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
  'linear-gradient(135deg,#e0f2fe,#bae6fd)', 'linear-gradient(135deg,#fce7f3,#fbcfe8)', 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
];
// رموز أزرار الواجهة (أسهم، إغلاق…) لا تصلح أيقونة برنامج
const UI_ONLY = new Set(['left', 'right', 'up', 'x', 'minus', 'square', 'check', 'more', 'menu', 'plus', 'refresh', 'external', 'logout', 'move', 'copy', 'edit', 'list', 'search', 'upload', 'download', 'trash', 'link']);
const PICK_ICONS = ICON_NAMES.filter((n) => !UI_ONLY.has(n));
function setIcons(r) { if (r && r.icons) { ME.icons = r.icons; drawIcons(); } }
async function resetIcon(a) {
  const r = await api.del(`/api/me/icons/${encodeURIComponent(a.id)}`).catch((e) => toast(e.message, 'err'));
  if (r) { setIcons(r); toast('رجعت الأيقونة الأصلية', 'ok'); }
}
async function changeIcon(a) {
  const cur = appLook(a);
  let pick = { icon: cur.img ? a.icon : cur.icon, color: cur.color || ICON_COLORS[0] };
  const body = h(`<div class="icon-picker">
    <div class="ip-prev">${tileHTML(a)}<b>${esc(a.title)}</b></div>
    <div class="ip-tabs cp-tabs" style="padding:0;margin-bottom:8px"><button data-t="sym" class="on">رموز</button><button data-t="fruit">فواكه</button><button data-t="animal">حيوانات</button></div>
    <div class="ip-icons" data-g="sym">${PICK_ICONS.map((n) => `<button data-i="${n}" title="${n}">${icon(n)}</button>`).join('')}</div>
    <div class="ip-icons art" data-g="fruit" hidden>${Object.entries(FRUITS).map(([k, [t]]) => `<button data-i="art-${k}" title="${esc(t)}">${glyph('art-' + k)}</button>`).join('')}</div>
    <div class="ip-icons art" data-g="animal" hidden>${Object.entries(ANIMALS).map(([k, [t]]) => `<button data-i="art-${k}" title="${esc(t)}">${glyph('art-' + k)}</button>`).join('')}</div>
    <div class="lbl">اللون</div><div class="ip-colors">${ICON_COLORS.map((c, i) => `<button data-c="${i}" style="background:${c}"></button>`).join('')}</div>
    <div class="lbl">أو صورة من عندك</div>
    <label class="btn sm" style="cursor:pointer">${icon('upload')} رفع صورة<input type="file" accept="image/*" hidden></label>
    <span class="muted small">تُقص مربعاً تلقائياً.</span></div>`);
  const prev = () => {
    $('.ip-prev .app-tile', body).outerHTML = `<div class="app-tile" style="background:${pick.color}">${glyph(pick.icon)}</div>`;
    $$('[data-i]', body).forEach((b) => b.classList.toggle('on', b.dataset.i === pick.icon));
    $$('[data-c]', body).forEach((b) => b.classList.toggle('on', ICON_COLORS[b.dataset.c] === pick.color));
  };
  $$('[data-i]', body).forEach((b) => (b.onclick = () => {
    // أول اختيار لفاكهة أو حيوان على خلفية داكنة ← خلفية فاتحة تُظهر ألوانه
    if (b.dataset.i.startsWith('art-') && !pick.icon.startsWith('art-') && ICON_COLORS.indexOf(pick.color) < 12) pick.color = ICON_COLORS[12];
    pick.icon = b.dataset.i; prev();
  }));
  $$('.ip-tabs [data-t]', body).forEach((t) => (t.onclick = () => {
    $$('.ip-tabs [data-t]', body).forEach((x) => x.classList.toggle('on', x === t));
    $$('[data-g]', body).forEach((g) => (g.hidden = g.dataset.g !== t.dataset.t));
  }));
  $$('[data-c]', body).forEach((b) => (b.onclick = () => { pick.color = ICON_COLORS[b.dataset.c]; prev(); }));
  let uploaded = false;
  $('input[type=file]', body).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('image', f);
    const r = await fetch(`/api/me/icons/${encodeURIComponent(a.id)}/image`, { method: 'POST', body: fd, headers: { 'X-Requested-With': 'fetch' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return toast(j.error || 'تعذّر رفع الصورة', 'err');
    uploaded = true; setIcons(j); toast('تغيّرت الأيقونة', 'ok');
    $('.modal-back .modal-f .btn', document)?.click();   // أغلق النافذة: الصورة محفوظة
  };
  if (!cur.img) setTimeout(prev);
  const ok = await modal({ title: 'تغيير الأيقونة', body, wide: true,
    buttons: [{ label: 'إلغاء', value: false }, { label: 'حفظ', cls: 'primary', value: true }] });
  if (!ok || uploaded) return;
  const r = await api('PUT', `/api/me/icons/${encodeURIComponent(a.id)}`, pick).catch((e) => toast(e.message, 'err'));
  if (r) { setIcons(r); toast('تغيّرت الأيقونة', 'ok'); }
}
addEventListener('keydown', e => { if (e.key === 'Escape') closePopovers(); });

// تطبيق قابل للتثبيت: عامل الخدمة يعمل عبر HTTPS (مثل Tailscale) أو localhost
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/sw.js').catch(() => { });

// فتح تطبيق مباشرة من الرابط: /?app=photos
const params = new URLSearchParams(location.search);
const start = params.get('app');
if (start) openApp(start, { maximize: true, path: params.get('path') || undefined, section: params.get('section') || undefined });

// تنبيهات صحة التخزين (للمدير): زر أحمر في شريط المهام عند وجود مشكلة
async function checkHealth() {
  if (!ME.is_admin) return;
  const r = await api.get('/api/system/health').catch(() => null);
  let btn = $('#tb-alert');
  if (!r || !r.alerts.length) { btn && btn.remove(); return; }
  if (!btn) {
    btn = h(`<button class="tb-btn" id="tb-alert">${icon('shield')}<span></span></button>`);
    btn.onclick = () => openApp('monitor');
    $('#tb-clock').before(btn);
  }
  const err = r.alerts.some(a => a.level === 'err');
  btn.classList.toggle('warn', !err);
  $('span', btn).textContent = r.alerts.length === 1 ? r.alerts[0].title : `${r.alerts.length} تنبيهات`;
  btn.title = r.alerts.map(a => a.title).join('\n');
}
checkHealth(); setInterval(checkHealth, 120000);
addEventListener('nas-health', checkHealth);

// التفعيل (للمدير): زر في شريط المهام أثناء التجربة، وقبل الانتهاء بـ30 يوماً، وبعد الانتهاء
function drawActivation(a) {
  let btn = $('#tb-act');
  if (!a || !a.warn) { btn && btn.remove(); return; }
  if (!btn) {
    btn = h(`<button class="tb-btn" id="tb-act">${icon('key')}<span></span></button>`);
    btn.onclick = () => openApp('control', { section: 'activation' });
    $('#tb-clock').before(btn);
  }
  const text = a.state === 'expired' ? 'انتهى التفعيل'
    : a.state === 'trial' ? `تجربة مجانية: باقي ${a.days_left} يوماً` : `التفعيل: باقي ${a.days_left} يوماً`;
  $('span', btn).textContent = text;
  btn.title = a.state === 'expired' ? 'توقفت التحديثات وتثبيت التطبيقات الجديدة. اضغط للتجديد.' : 'اضغط لإدخال كود التفعيل';
  btn.classList.toggle('warn', a.state !== 'expired');
  try {
    if ((a.state === 'expired' || a.days_left <= 7) && !sessionStorage.getItem('hsef-act-toast')) {
      sessionStorage.setItem('hsef-act-toast', '1');
      toast(a.state === 'expired' ? 'انتهى تفعيل HOME ANAB: ملفاتك تعمل كالعادة، لكن التحديثات متوقفة حتى التجديد' : `${text}. جدّد من لوحة التحكم ← التفعيل`, a.state === 'expired' ? 'err' : 'ok');
    }
  } catch (e) { /* التخزين غير متاح */ }
}
if (ME.is_admin) {
  drawActivation(ME.activation);
  addEventListener('nas-activation', (e) => { ME.activation = e.detail; drawActivation(e.detail); });
}

// مهام الأطفال: رقم أحمر على «العائلة» وتنبيه عند مهمة جديدة تنتظر التأكيد (للأب والأم)
if (ME.parent) {
  let first = true, timer = 0;
  const pollPending = async () => {
    clearTimeout(timer);
    const r = await api.get('/api/kids/pending').catch(() => null);
    if (r) {
      if (!first && r.count > famPending && r.items[0]) toast(`🧹 ${r.items[0].kid} أنهى: ${r.items[0].title}. افتح «العائلة» ← المهام للتأكيد`, 'ok');
      if (r.count !== famPending) { famPending = r.count; drawIcons(); }
      first = false;
    }
    timer = setTimeout(pollPending, document.hidden ? 120000 : 45000);
  };
  pollPending();
  addEventListener('nas-chores', pollPending);
}

// البند 30: نسخ/نقل/حذف ما زال يعمل على السيرفر (بدأ قبل إغلاق المتصفح أو من جهاز آخر) ← أظهر تقدّمه
fileOps.resume();
