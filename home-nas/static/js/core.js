// ====================================================================
// HOME ANAB — النواة: الأيقونات، الاتصال بالسيرفر، مدير النوافذ، الحوارات،
// قائمة الرفع، عارض الصور والفيديو.
// ====================================================================

export const ME = window.__ME__ || {};
export const I18N = window.I18N || { lang: 'ar', rtl: true, locale: 'ar', t: (x) => x };
export const RTL = I18N.rtl;
/** سهم «السابق/الرجوع» و«التالي» حسب اتجاه اللغة */
export const ARROW = { back: RTL ? 'right' : 'left', fwd: RTL ? 'left' : 'right', sep: RTL ? '‹' : '›' };

// ---------------------------------------------------------------- أيقونات
const P = {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  chart: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.3a3.5 3.5 0 0 1 0 7"/><path d="M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  heart: '<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  album: '<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  move: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  minus: '<path d="M5 12h14"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6M11 8v6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  hdd: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 14h18M7 17h.01M11 17h.01"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  memory: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 7v10M11 7v10M15 7v10M3 20h18"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/>',
  store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 13a3 3 0 0 0 6 0"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
};
export function icon(name, cls = '') {
  return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.file}</svg>`;
}

// ---------------------------------------------------------------- أدوات
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function fmtSize(n) {
  if (n == null) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i ? n.toFixed(n < 10 ? 2 : 1) : n) + ' ' + u[i];
}
const dtf = new Intl.DateTimeFormat(I18N.locale, { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });
const df = new Intl.DateTimeFormat(I18N.locale, { dateStyle: 'medium', numberingSystem: 'latn' });
export const fmtDateTime = (d) => d ? dtf.format(d instanceof Date ? d : new Date(d)) : '';
export const fmtDate = (d) => d ? df.format(d instanceof Date ? d : new Date(d)) : '';
export const fmtEpoch = (s) => s ? fmtDateTime(new Date(s * 1000)) : '';
export function fmtDuration(sec) {
  sec = Math.floor(sec); const d = Math.floor(sec / 86400), hh = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
  return d ? `${d} يوم ${hh} ساعة` : hh ? `${hh} ساعة ${m} دقيقة` : `${m} دقيقة`;
}
export function debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export const isTouch = () => matchMedia('(pointer: coarse)').matches;
export const isMobile = () => matchMedia('(max-width: 760px)').matches;
export function encPath(p) { return encodeURIComponent(p); }

// ---------------------------------------------------------------- الاتصال
export class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }
export async function api(method, url, data) {
  const opt = { method, headers: { 'X-Requested-With': 'fetch' } };
  if (data !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(data); }
  const r = await fetch(url, opt);
  if (r.status === 401 && !url.startsWith('/s/')) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); throw new ApiError('', 401); }
  let j = null;
  try { j = await r.json(); } catch (_) { }
  if (!r.ok) throw new ApiError((j && j.error) || `خطأ ${r.status}`, r.status);
  return j;
}
api.get = (u) => api('GET', u);
api.post = (u, d = {}) => api('POST', u, d);
api.patch = (u, d = {}) => api('PATCH', u, d);
api.del = (u) => api('DELETE', u);

/** يشغّل دالة ويعرض الخطأ كرسالة. */
export async function guard(fn) {
  try { return await fn(); } catch (e) { if (e.status !== 401) toast(e.message || String(e), 'err'); return undefined; }
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) { }
  const ta = h('<textarea style="position:fixed;opacity:0"></textarea>');
  ta.value = text; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (_) { }
  ta.remove(); return ok;
}

export function download(url) {
  const a = h('<a hidden></a>'); a.href = url; a.download = ''; document.body.appendChild(a); a.click(); a.remove();
}

// ---------------------------------------------------------------- إشعارات وحوارات
export function toast(msg, type = '') {
  let box = $('#toasts'); if (!box) { box = h('<div id="toasts"></div>'); document.body.appendChild(box); }
  const t = h(`<div class="toast ${type}"></div>`); t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.remove(), type === 'err' ? 4500 : 2600);
}

/** نافذة حوار عامة. buttons: [{label, value, cls}] → تعيد value للزر المضغوط (أو null). */
export function modal({ title = '', body = '', buttons = [{ label: 'حسناً', value: true, cls: 'primary' }], wide = false, onOpen } = {}) {
  return new Promise(resolve => {
    const back = h(`<div class="modal-back"><div class="modal ${wide ? 'wide' : ''}" role="dialog">
      ${title ? `<div class="modal-h">${esc(title)}</div>` : ''}<div class="modal-b"></div><div class="modal-f"></div></div></div>`);
    const b = $('.modal-b', back);
    if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
    for (const btn of buttons) {
      const el = h(`<button class="btn ${btn.cls || ''}">${esc(btn.label)}</button>`);
      el.onclick = async () => {
        if (btn.validate) { const ok = await btn.validate(back); if (!ok) return; }
        close(typeof btn.value === 'function' ? btn.value(back) : btn.value);
      };
      $('.modal-f', back).appendChild(el);
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(null); }
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        const p = $('.modal-f .primary, .modal-f .solid', back); if (p) { e.preventDefault(); p.click(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('mousedown', e => { if (e.target === back) close(null); });
    document.body.appendChild(back);
    onOpen && onOpen(back);
    const f = $('input, select, textarea', b); if (f && !isTouch()) setTimeout(() => { if (!back.contains(document.activeElement)) { f.focus(); f.select && f.select(); } }, 30);
  });
}

export async function confirmBox(msg, { title = 'تأكيد', ok = 'متابعة', danger = false } = {}) {
  const r = await modal({ title, body: `<p>${esc(msg)}</p>`,
    buttons: [{ label: 'إلغاء', value: false }, { label: ok, value: true, cls: danger ? 'danger solid' : 'primary' }] });
  return !!r;
}

/** نموذج إدخال: fields = [{name, label, type, value, options, placeholder, hint}] */
export async function form(title, fields, { ok = 'حفظ', wide = false } = {}) {
  const body = h('<div></div>');
  for (const f of fields) {
    if (f.type === 'checkbox') {
      body.appendChild(h(`<label class="check"><input type="checkbox" name="${f.name}" ${f.value ? 'checked' : ''}> ${esc(f.label)}</label>`));
    } else if (f.type === 'select') {
      body.appendChild(h(`<div><label class="lbl">${esc(f.label)}</label><select class="field" name="${f.name}">
        ${f.options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(f.value ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`));
    } else if (f.type === 'html') {
      body.appendChild(typeof f.html === 'string' ? h(`<div>${f.html}</div>`) : f.html);
    } else {
      body.appendChild(h(`<div><label class="lbl">${esc(f.label)}</label>
        <input class="field" name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}" ${f.ltr ? 'dir="ltr"' : ''} autocomplete="off">
        ${f.hint ? `<div class="muted" style="font-size:12px;margin-top:4px">${esc(f.hint)}</div>` : ''}</div>`));
    }
  }
  const read = (back) => {
    const out = {};
    for (const f of fields) {
      const el = $(`[name="${f.name}"]`, back); if (!el) continue;
      out[f.name] = f.type === 'checkbox' ? el.checked : el.value;
    }
    return out;
  };
  return modal({ title, body, wide, buttons: [{ label: 'إلغاء', value: null }, { label: ok, cls: 'primary', value: read }] });
}

export async function promptBox(title, label, value = '', ok = 'موافق') {
  const r = await form(title, [{ name: 'v', label, value }], { ok });
  return r ? r.v.trim() : null;
}

/** قائمة سياقية. items: [{label, icon, fn, danger, disabled}] أو '-' */
export function menu(x, y, items) {
  closePopovers();
  const m = h('<div class="popover menu"></div>');
  for (const it of items) {
    if (it === '-') { m.appendChild(h('<hr>')); continue; }
    if (!it || it.hidden) continue;
    const b = h(`<button class="${it.danger ? 'danger' : ''}" ${it.disabled ? 'disabled' : ''}>${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span></button>`);
    b.onclick = (e) => { e.stopPropagation(); m.remove(); it.fn && it.fn(); };
    m.appendChild(b);
  }
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(6, Math.min(x - (document.dir === 'rtl' ? r.width : 0), innerWidth - r.width - 6)) + 'px';
  m.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', function off(e) {
    if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); }
  }, true));
  return m;
}
export function menuAt(el, items) { const r = el.getBoundingClientRect(); return menu(r.right, r.bottom + 4, items); }
export function closePopovers() { $$('.popover.menu').forEach(m => m.remove()); }

/** يعرض رابطاً مع زر نسخ. */
export function linkBox(url) {
  const box = h(`<div class="copybox"><input class="field" readonly><button class="btn primary">${icon('copy')} نسخ</button></div>`);
  $('input', box).value = url;
  $('button', box).onclick = async () => { toast(await copyText(url) ? 'تم النسخ' : 'انسخ الرابط يدوياً', 'ok'); $('input', box).select(); };
  return box;
}

/** حوار إنشاء رابط مشاركة لملف/مجلد أو ألبوم. */
export async function shareDialog(kind, target, title) {
  const r = await form(`مشاركة «${title}»`, [
    { type: 'html', html: '<p class="muted" style="margin:0">أي شخص على الشبكة يملك الرابط يمكنه المشاهدة والتنزيل.</p>' },
    { name: 'expires_days', label: 'صلاحية الرابط', type: 'select', value: '', options: [
      { value: '', label: 'لا تنتهي' }, { value: '1', label: 'يوم واحد' }, { value: '7', label: 'أسبوع' }, { value: '30', label: 'شهر' }] },
    { name: 'password', label: 'كلمة مرور (اختياري)', placeholder: 'اتركها فارغة للوصول بدون كلمة مرور' },
  ], { ok: 'إنشاء الرابط' });
  if (!r) return;
  const res = await guard(() => api.post('/api/links', { kind, target, ...r }));
  if (!res) return;
  const body = h('<div><p>تم إنشاء الرابط:</p></div>');
  body.appendChild(linkBox(res.url));
  await modal({ title: 'رابط المشاركة', body });
}

/** اختيار مجلد من شجرة الملفات. */
export function pickFolder(title = 'اختر مجلداً', start = '') {
  return new Promise(async resolve => {
    let cur = start;
    const body = h(`<div><div class="crumbs" style="border:1px solid var(--border);border-radius:10px;padding:4px"></div><div class="picker-list"></div></div>`);
    const roots = await guard(() => api.get('/api/files/roots')) || [];
    async function load(path) {
      cur = path;
      const list = $('.picker-list', body); list.innerHTML = '';
      const cr = $('.crumbs', body); cr.innerHTML = '';
      const top = h(`<button>${icon('home')}</button>`); top.onclick = () => load(''); cr.appendChild(top);
      if (!path) {
        for (const r of roots.filter(r => r.perm === 'rw')) {
          const b = h(`<button>${icon('folder')} ${esc(r.label)}</button>`); b.onclick = () => load('/' + r.name); list.appendChild(b);
        }
        return;
      }
      const parts = path.split('/').filter(Boolean); let acc = '';
      parts.forEach((p, i) => { acc += '/' + p; const a = acc; cr.appendChild(h(`<span class="sep">${ARROW.sep}</span>`));
        const b = h(`<button ${i ? 'translate="no"' : ''}>${esc(i === 0 ? (roots.find(r => r.name === p) || {}).label || p : p)}</button>`); b.onclick = () => load(a); cr.appendChild(b); });
      const res = await guard(() => api.get('/api/files/list?path=' + encPath(path)));
      if (!res) return;
      const dirs = res.items.filter(i => i.dir && i.name !== '#recycle');
      if (!dirs.length) list.appendChild(h('<div class="muted" style="padding:14px">لا توجد مجلدات فرعية</div>'));
      for (const d of dirs) { const b = h(`<button>${icon('folder')} <span translate="no"></span></button>`); $('span', b).textContent = d.name; b.onclick = () => load(path + '/' + d.name); list.appendChild(b); }
    }
    load(start);
    const r = await modal({ title, body, buttons: [{ label: 'إلغاء', value: null }, { label: 'اختيار هذا المجلد', cls: 'primary', value: () => cur,
      validate: () => { if (!cur) { toast('افتح مجلداً أولاً', 'err'); return false; } return true; } }] });
    resolve(r);
  });
}

// ---------------------------------------------------------------- مدير النوافذ
const APPS = new Map();
export function registerApp(app) { APPS.set(app.id, app); }
export function apps() { return [...APPS.values()].filter(a => !a.admin || ME.is_admin); }

let zTop = 100, winSeq = 0;
export const windows = new Set();

export class Win {
  constructor(app, { title, width = 900, height = 600, key } = {}) {
    this.app = app; this.key = key || app.id; this.id = ++winSeq; this.closeHandlers = [];
    const el = this.el = h(`<div class="win" tabindex="-1">
      <div class="win-titlebar"><div class="app-tile sm" style="background:${app.color}">${icon(app.icon)}</div>
        <div class="win-title"></div>
        <div class="win-btns"><button class="min" title="تصغير">${icon('minus')}</button><button class="max" title="تكبير">${icon('square')}</button><button class="close" title="إغلاق">${icon('x')}</button></div>
      </div><div class="win-body"></div><div class="win-resize"></div></div>`);
    this.body = $('.win-body', el);
    this.setTitle(title || app.title);
    const area = { w: innerWidth, h: innerHeight - 44 };
    width = Math.min(width, area.w - 40); height = Math.min(height, area.h - 40);
    const off = (windows.size % 6) * 28;
    Object.assign(el.style, { width: width + 'px', height: height + 'px',
      left: Math.max(10, (area.w - width) / 2 + off - 60) + 'px', top: Math.max(54, 44 + (area.h - height) / 2 + off - 40) + 'px' });
    $('#desktop').appendChild(el);
    windows.add(this);
    this.tb = h(`<button class="tb-btn"><span class="mini" style="background:${app.color}">${icon(app.icon)}</span><span></span></button>`);
    $('span:last-child', this.tb).textContent = this.title;
    this.tb.onclick = () => (this.focused && !el.classList.contains('minimized')) ? this.minimize() : this.focus();
    $('#tb-windows').appendChild(this.tb);
    $('.close', el).onclick = () => this.close();
    $('.min', el).onclick = () => this.minimize();
    $('.max', el).onclick = () => this.toggleMax();
    el.addEventListener('pointerdown', () => this.focus(), true);
    $('.win-titlebar', el).addEventListener('dblclick', e => { if (!e.target.closest('button')) this.toggleMax(); });
    this.enableDrag(); this.enableResize();
    this.focus();
  }
  setTitle(t) { this.title = t; $('.win-title', this.el).textContent = t; if (this.tb) $('span:last-child', this.tb).textContent = t; }
  focus() {
    this.el.classList.remove('minimized');
    if (this.focused && this.el.style.zIndex == zTop) return;
    windows.forEach(w => { w.focused = false; w.el.classList.remove('focused'); w.tb.classList.remove('focused'); });
    this.focused = true; this.el.classList.add('focused'); this.tb.classList.add('focused');
    this.el.style.zIndex = ++zTop;
  }
  minimize() { this.el.classList.add('minimized'); this.focused = false; this.tb.classList.remove('focused'); }
  toggleMax() { this.el.classList.toggle('maximized'); this.onResize && this.onResize(); }
  maximize() { this.el.classList.add('maximized'); }
  onClose(fn) { this.closeHandlers.push(fn); }
  close() {
    this.closeHandlers.forEach(fn => { try { fn(); } catch (_) { } });
    this.el.remove(); this.tb.remove(); windows.delete(this);
    const next = [...windows].sort((a, b) => b.el.style.zIndex - a.el.style.zIndex).find(w => !w.el.classList.contains('minimized'));
    next && next.focus();
  }
  enableDrag() {
    const bar = $('.win-titlebar', this.el);
    bar.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button') || isMobile() || this.el.classList.contains('maximized')) return;
      const sx = e.clientX, sy = e.clientY, ox = this.el.offsetLeft, oy = this.el.offsetTop;
      bar.setPointerCapture(e.pointerId);
      const move = ev => {
        this.el.style.left = Math.min(innerWidth - 80, Math.max(-this.el.offsetWidth + 120, ox + ev.clientX - sx)) + 'px';
        this.el.style.top = Math.min(innerHeight - 50, Math.max(44, oy + ev.clientY - sy)) + 'px';
      };
      const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up);
    });
  }
  enableResize() {
    const grip = $('.win-resize', this.el);
    grip.addEventListener('pointerdown', e => {
      e.preventDefault(); grip.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, ow = this.el.offsetWidth, oh = this.el.offsetHeight;
      const move = ev => { this.el.style.width = Math.max(320, ow + ev.clientX - sx) + 'px'; this.el.style.height = Math.max(220, oh + ev.clientY - sy) + 'px'; };
      const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); this.onResize && this.onResize(); };
      grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
    });
  }
}

/** يفتح تطبيقاً (أو يُظهر نافذته إن كانت مفتوحة). */
export function openApp(id, opts = {}) {
  const app = APPS.get(id); if (!app) return;
  const key = opts.key || id;
  const existing = [...windows].find(w => w.key === key);
  if (existing && !opts.forceNew) { existing.focus(); existing.reopen && existing.reopen(opts); return existing; }
  const win = new Win(app, { width: app.width, height: app.height, key });
  if (opts.maximize) win.maximize();
  app.open(win, opts);
  return win;
}

// ---------------------------------------------------------------- قائمة الرفع
export const uploads = (() => {
  const CONC = 3, RETRIES = 2;
  let queue = [], active = 0, panel = null, groupDone = null;
  const st = { total: 0, done: 0, saved: 0, dup: 0, err: 0, bytes: 0, sent: 0 };

  function ensurePanel() {
    if (panel) return;
    panel = h(`<div id="uploads"><div class="uh">${icon('upload')}<span class="t"></span>
      <button class="btn ghost icon sm x" title="إغلاق">${icon('x')}</button></div><div class="bar"><div></div></div><ul></ul></div>`);
    $('.uh', panel).onclick = (e) => { if (!e.target.closest('.x')) panel.classList.toggle('collapsed'); };
    $('.x', panel).onclick = () => {
      if (active || queue.some(j => j.state === 'pending')) {
        if (!confirm('إيقاف الرفع المتبقي؟')) return;
        queue.forEach(j => { if (j.state === 'pending') j.state = 'cancelled'; j.xhr && j.xhr.abort(); });
      }
      panel.remove(); panel = null; queue = []; Object.keys(st).forEach(k => st[k] = 0);
    };
    document.body.appendChild(panel);
  }
  function render() {
    if (!panel) return;
    const left = st.total - st.done;
    $('.t', panel).textContent = left ? `جارِ الرفع… ${st.done} من ${st.total}` :
      `اكتمل الرفع: ${st.saved} جديد` + (st.dup ? ` · ${st.dup} مكرر` : '') + (st.err ? ` · ${st.err} فشل` : '');
    $('.bar div', panel).style.width = (st.bytes ? st.sent / st.bytes * 100 : 0) + '%';
  }
  function row(job, text, cls = 'muted') { const s = $('.s', job.li); s.textContent = text; s.className = 's ' + cls; }

  /** jobs: [{file, url, fields, name}] ; onDone(job, result) لكل ملف ، onAll() عند الانتهاء */
  function add(jobs, { onDone, onAll } = {}) {
    if (!jobs.length) return;
    ensurePanel();
    for (const j of jobs) {
      j.state = 'pending'; j.tries = 0; j.onDone = onDone; j.onAll = onAll; j.loaded = 0;
      j.li = h(`<li><span class="n" translate="no"></span><span class="s muted">بالانتظار</span></li>`);
      $('.n', j.li).textContent = j.name || j.file.name;
      $('ul', panel).appendChild(j.li);
      queue.push(j); st.total++; st.bytes += j.file.size || 1;
    }
    render(); pump();
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { uploads.lock = l; }).catch(() => { }); } catch (_) { }
  }
  function pump() {
    while (active < CONC) {
      const j = queue.find(x => x.state === 'pending'); if (!j) break;
      send(j);
    }
    if (!active && !queue.some(x => x.state === 'pending')) {
      const cbs = new Set(queue.filter(x => x.onAll && !x.allFired).map(x => { x.allFired = true; return x.onAll; }));
      cbs.forEach(fn => fn());
      if (uploads.lock) { uploads.lock.release().catch(() => { }); uploads.lock = null; }
    }
  }
  function send(j) {
    j.state = 'up'; active++;
    const fd = new FormData();
    for (const [k, v] of Object.entries(j.fields || {})) fd.append(k, v);
    fd.append('last_modified', j.file.lastModified || '');
    fd.append('file', j.file, j.file.name);
    const x = j.xhr = new XMLHttpRequest();
    x.open('POST', j.url);
    x.upload.onprogress = e => { if (e.lengthComputable) { st.sent += e.loaded - j.loaded; j.loaded = e.loaded; row(j, Math.round(e.loaded / e.total * 100) + '%'); render(); } };
    x.onload = () => {
      let res = null; try { res = JSON.parse(x.responseText); } catch (_) { }
      if (x.status === 200 && res && res.results) {
        const r = res.results[0] || {};
        if (r.status === 'saved') { st.saved++; row(j, '✓', 'ok'); $('.s', j.li).style.color = 'var(--ok)'; }
        else if (r.status === 'duplicate' || r.status === 'skipped') { st.dup++; row(j, 'موجود مسبقاً'); }
        else { st.err++; row(j, r.error || 'فشل'); $('.s', j.li).style.color = 'var(--err)'; }
        finish(j, r);
      } else retry(j, (res && res.error) || ('خطأ ' + x.status));
    };
    x.onerror = () => retry(j, 'انقطع الاتصال');
    x.onabort = () => { active--; j.state = 'cancelled'; };
    x.send(fd);
  }
  function retry(j, msg) {
    st.sent -= j.loaded; j.loaded = 0;
    if (j.tries < RETRIES && j.state !== 'cancelled') { j.tries++; j.state = 'pending'; active--; row(j, 'إعادة المحاولة…'); setTimeout(pump, 1500 * j.tries); return; }
    st.err++; row(j, msg); $('.s', j.li).style.color = 'var(--err)'; finish(j, { status: 'error', error: msg });
  }
  function finish(j, r) {
    j.state = 'done'; active--; st.done++;
    st.sent += (j.file.size || 1) - j.loaded; j.loaded = j.file.size || 1;
    render(); j.onDone && j.onDone(j, r); pump();
  }
  addEventListener('beforeunload', e => { if (active) { e.preventDefault(); e.returnValue = ''; } });
  return { add, get busy() { return active > 0; } };
})();

/** يقرأ الملفات (والمجلدات) من عملية سحب وإفلات. يعيد [{file, rel}] */
export async function filesFromDrop(dt) {
  const out = [];
  const items = [...(dt.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!items.length) return [...dt.files].map(f => ({ file: f, rel: f.name }));
  async function walk(entry, prefix) {
    if (entry.isFile) { await new Promise(res => entry.file(f => { out.push({ file: f, rel: prefix + f.name }); res(); }, res)); return; }
    const reader = entry.createReader();
    let batch;
    do {
      batch = await new Promise(res => reader.readEntries(res, () => res([])));
      for (const e of batch) await walk(e, prefix + entry.name + '/');
    } while (batch.length);
  }
  for (const e of items) await walk(e, '');
  return out;
}

/** اختيار ملفات عبر نافذة النظام. */
export function chooseFiles({ accept = '', multiple = true, folder = false } = {}) {
  return new Promise(resolve => {
    const inp = h('<input type="file" hidden>');
    if (accept) inp.accept = accept;
    inp.multiple = multiple;
    if (folder) inp.webkitdirectory = true;
    inp.onchange = () => { resolve([...inp.files]); inp.remove(); };
    document.body.appendChild(inp); inp.click();
  });
}

// ---------------------------------------------------------------- عارض الوسائط
/**
 * items: مصفوفة عناصر. opts: { src(it), thumb(it), kind(it) → 'image'|'video'|'audio', title(it), meta(it),
 *   actions(it, viewer) → [{icon, label, fn, on}] , onIndex(i) }
 */
export function openViewer(items, index, opts) {
  closeViewer();
  let i = index;
  const v = h(`<div id="viewer"><div class="vbar"><button class="vbtn close">${icon('x')}</button><div class="t" translate="no"></div><div class="acts" style="display:flex;gap:6px"></div></div>
    <div class="stage"></div><button class="nav prev">${icon(ARROW.back)}</button><button class="nav next">${icon(ARROW.fwd)}</button><div class="meta"></div></div>`);
  const stage = $('.stage', v);
  const api_ = {
    get index() { return i; }, get item() { return items[i]; },
    show, close: closeViewer, refresh: () => show(i),
    remove() { items.splice(i, 1); if (!items.length) return closeViewer(); show(Math.min(i, items.length - 1)); },
  };
  function show(n) {
    if (n < 0 || n >= items.length) return;
    i = n; const it = items[i]; const kind = opts.kind(it);
    stage.innerHTML = '';
    if (kind === 'video' || kind === 'audio') {
      const m = document.createElement(kind); m.src = opts.src(it); m.controls = true; m.autoplay = true; m.playsInline = true; stage.appendChild(m);
    } else {
      const img = document.createElement('img'); img.alt = '';
      if (opts.thumb) img.src = opts.thumb(it);
      const full = new Image(); full.onload = () => { if (i === n) img.src = full.src; }; full.src = opts.src(it);
      stage.appendChild(img);
    }
    $('.t', v).textContent = opts.title(it);
    $('.meta', v).textContent = opts.meta ? opts.meta(it) : '';
    const acts = $('.acts', v); acts.innerHTML = '';
    for (const a of (opts.actions ? opts.actions(it, api_) : [])) {
      const b = h(`<button class="vbtn ${a.on ? 'on' : ''}" title="${esc(a.label)}">${icon(a.icon)}</button>`);
      b.onclick = () => a.fn(it, api_); acts.appendChild(b);
    }
    $('.prev', v).style.visibility = i > 0 ? '' : 'hidden';
    $('.next', v).style.visibility = i < items.length - 1 ? '' : 'hidden';
    opts.onIndex && opts.onIndex(i);
    // تحميل مسبق للصورة التالية
    const nx = items[i + 1]; if (nx && opts.kind(nx) === 'image') { const p = new Image(); p.src = opts.src(nx); }
  }
  $('.close', v).onclick = closeViewer;
  $('.prev', v).onclick = () => show(i - 1);
  $('.next', v).onclick = () => show(i + 1);
  let sx = null, sy = null;
  stage.addEventListener('touchstart', e => { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) show(i + ((dx > 0) === RTL ? 1 : -1));
    else if (dy > 120 && Math.abs(dy) > Math.abs(dx)) closeViewer();
  });
  v._key = e => {
    if ($('.modal-back')) return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowLeft') show(i + (RTL ? 1 : -1));
    else if (e.key === 'ArrowRight') show(i + (RTL ? -1 : 1));
  };
  document.addEventListener('keydown', v._key);
  document.body.appendChild(v);
  show(i);
  return api_;
}
export function closeViewer() {
  const v = $('#viewer'); if (!v) return;
  document.removeEventListener('keydown', v._key); v.remove();
}

// ---------------------------------------------------------------- أنواع الملفات
const TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif', 'tif', 'tiff', 'dng'],
  video: ['mp4', 'mov', 'm4v', 'mkv', 'avi', 'webm', '3gp', 'wmv'],
  audio: ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus'],
  pdf: ['pdf'], zip: ['zip', 'rar', '7z', 'tar', 'gz'],
  doc: ['doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'pages'], sheet: ['xls', 'xlsx', 'csv', 'ods', 'numbers'],
  code: ['py', 'js', 'css', 'html', 'htm', 'json', 'xml', 'yml', 'yaml', 'sh', 'bat', 'sql', 'ini', 'cfg', 'conf', 'log'],
};
export function fileType(ext) { for (const [t, l] of Object.entries(TYPES)) if (l.includes(ext)) return t; return 'other'; }
export const THUMBABLE = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif', 'tif', 'tiff', 'mp4', 'mov', 'm4v', 'mkv', 'avi', 'webm', '3gp']);
export const TEXT_EDITABLE = new Set(['txt', 'md', 'json', 'csv', 'log', 'xml', 'yml', 'yaml', 'ini', 'cfg', 'conf', 'py', 'js', 'css', 'html', 'htm', 'sh', 'bat', 'sql', 'srt']);
