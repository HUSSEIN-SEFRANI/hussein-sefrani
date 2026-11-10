// ====================================================================
// H.SEF — سطح المكتب: الأيقونات، شريط المهام، قائمة البدء، الساعة
// ====================================================================
import { ME, I18N, $, h, esc, icon, api, apps, openApp, closePopovers, isMobile } from './core.js';
import './apps/files.js';
import './apps/photos.js';
import './apps/system.js';
import { appUrl } from './apps/appstore.js';

const desktop = $('#desktop');
// خلفية سطح المكتب وصورة المستخدم (تتغير من لوحة التحكم ← حسابي)
function applyLook(l) {
  Object.assign(ME, l);
  desktop.style.background = l.wallpaper_css || '';
  if (l.wallpaper_css) desktop.style.backgroundAttachment = 'fixed';
}
applyLook(ME);
window.addEventListener('hsef-look', (e) => applyLook(e.detail));
const visible = () => apps().filter(a => !a.hidden);

// أيقونات سطح المكتب
const icons = $('#icons');
const shortcuts = [...visible(), { id: 'phone', title: 'ربط الآيفون', icon: 'phone', color: 'linear-gradient(135deg,#00b4db,#0083b0)', launch: () => openApp('control', { section: 'phone' }) }];
function drawIcons() {
  icons.innerHTML = '';
  for (const a of shortcuts) {
    const b = h(`<button class="dicon"><div class="app-tile" style="background:${a.color}">${icon(a.icon)}</div><span ${a.external ? 'translate="no"' : ''}>${esc(a.title)}</span></button>`);
    b.onclick = () => a.launch ? a.launch() : openApp(a.id);
    icons.appendChild(b);
  }
}
drawIcons();

// التطبيقات المثبتة من «مركز التطبيقات» تظهر كأيقونات تفتح في تبويب جديد
async function loadInstalledApps() {
  const list = await api.get('/api/appstore/installed').catch(() => []);
  for (let i = shortcuts.length - 1; i >= 0; i--) if (shortcuts[i].external) shortcuts.splice(i, 1);
  for (const a of list) shortcuts.push({ id: 'x-' + a.id, title: a.name, icon: a.icon, color: a.color, external: true,
    launch: () => window.open(appUrl(a.port, a.path), '_blank') });
  drawIcons();
}
loadInstalledApps();
addEventListener('nas-apps', loadInstalledApps);

// قائمة البدء
$('#tb-start').onclick = (e) => {
  e.stopPropagation();
  const existing = $('#startmenu'); if (existing) { existing.remove(); return; }
  const m = h(`<div class="popover" id="startmenu"><div class="apps"></div>
    <div class="who"><div class="av"></div><div class="nm"><b></b><div class="muted" style="font-size:12px"></div></div>
    <a class="btn ghost" href="/logout">${icon('logout')} خروج</a></div></div>`);
  for (const a of shortcuts) {
    const b = h(`<button><div class="app-tile" style="background:${a.color}">${icon(a.icon)}</div><span ${a.external ? 'translate="no"' : ''}>${esc(a.title)}</span></button>`);
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
