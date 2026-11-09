// ====================================================================
// HomeNAS — سطح المكتب: الأيقونات، شريط المهام، قائمة البدء، الساعة
// ====================================================================
import { ME, $, h, esc, icon, apps, openApp, closePopovers, isMobile } from './core.js';
import './apps/files.js';
import './apps/photos.js';
import './apps/system.js';

const desktop = $('#desktop');
const visible = () => apps().filter(a => !a.hidden);

// أيقونات سطح المكتب
const icons = $('#icons');
const shortcuts = [...visible(), { id: 'phone', title: 'ربط الآيفون', icon: 'phone', color: 'linear-gradient(135deg,#00b4db,#0083b0)', open: () => openApp('control', { section: 'phone' }) }];
for (const a of shortcuts) {
  const b = h(`<button class="dicon"><div class="app-tile" style="background:${a.color}">${icon(a.icon)}</div><span>${esc(a.title)}</span></button>`);
  b.onclick = () => a.id === 'phone' ? a.open() : openApp(a.id);
  icons.appendChild(b);
}

// قائمة البدء
$('#tb-start').onclick = (e) => {
  e.stopPropagation();
  const existing = $('#startmenu'); if (existing) { existing.remove(); return; }
  const m = h(`<div class="popover" id="startmenu"><div class="apps"></div>
    <div class="who"><div class="av"></div><div class="nm"><b></b><div class="muted" style="font-size:12px"></div></div>
    <a class="btn ghost" href="/logout">${icon('logout')} خروج</a></div></div>`);
  for (const a of shortcuts) {
    const b = h(`<button><div class="app-tile" style="background:${a.color}">${icon(a.icon)}</div><span>${esc(a.title)}</span></button>`);
    b.onclick = () => { m.remove(); a.id === 'phone' ? a.open() : openApp(a.id); };
    $('.apps', m).appendChild(b);
  }
  $('.av', m).textContent = (ME.username || '?')[0].toUpperCase();
  $('.nm b', m).textContent = ME.username; $('.nm .muted', m).textContent = ME.is_admin ? 'مدير النظام' : 'مستخدم';
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('pointerdown', function off(ev) {
    if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); }
  }, true));
};

// الساعة
const clock = $('#tb-clock');
const tick = () => { clock.textContent = new Intl.DateTimeFormat('ar', { weekday: 'short', hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' }).format(new Date()); };
tick(); setInterval(tick, 15000);

desktop.addEventListener('contextmenu', e => { if (e.target === desktop || e.target === icons) e.preventDefault(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closePopovers(); });

// فتح تطبيق مباشرة من الرابط: /?app=photos
const params = new URLSearchParams(location.search);
const start = params.get('app');
if (start) openApp(start, { maximize: true, path: params.get('path') || undefined, section: params.get('section') || undefined });
