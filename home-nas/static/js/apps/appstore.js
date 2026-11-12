// ====================================================================
// «مركز التطبيقات» — تثبيت تطبيقات خوادم منزلية بضغطة زر
// ====================================================================
import { ME, I18N, $, $$, h, esc, icon, api, guard, toast, modal, confirmBox, menuAt, registerApp } from '../core.js';

const CATS = [['all', 'الكل'], ['media', 'الوسائط'], ['home', 'المنزل الذكي'], ['network', 'الشبكة'], ['files', 'الملفات'], ['tools', 'أدوات']];
const tr = (o) => (o && (o[I18N.lang] || o.ar)) || '';
// بعض التطبيقات (مثل Frigate) تعمل عبر https فقط
export const appUrl = (port, path, scheme) => `${scheme ? scheme + ':' : location.protocol}//${location.hostname}:${port}${path || '/'}`;

registerApp({
  id: 'appstore', title: 'مركز التطبيقات', icon: 'store', color: 'linear-gradient(135deg,#f43f5e,#8b5cf6)', width: 1040, height: 680, admin: true,
  open(win) { new AppStore(win); },
});

class AppStore {
  constructor(win) {
    this.win = win; this.cat = 'all';
    win.body.innerHTML = `<div class="toolbar"><div class="chips"></div><span class="grow"></span>
      <button class="btn ghost icon" data-a="r" title="تحديث">${icon('refresh')}</button></div><div class="scroll"><div class="pad store"></div></div>`;
    this.box = $('.store', win.body);
    const chips = $('.chips', win.body);
    for (const [id, label] of CATS) {
      const b = h(`<button class="chip ${id === 'all' ? 'on' : ''}">${esc(label)}</button>`);
      b.onclick = () => { this.cat = id; $$('.chip', chips).forEach(x => x.classList.remove('on')); b.classList.add('on'); this.render(); };
      chips.appendChild(b);
    }
    $('[data-a=r]', win.body).onclick = () => this.load();
    this.load();
    this.timer = setInterval(() => { if (this.data && (this.data.apps.some(a => a.op && a.op.running) || (this.data.engine_op && this.data.engine_op.running))) this.load(true); }, 2500);
    win.onClose(() => clearInterval(this.timer));
  }

  async load(quiet) {
    const d = await (quiet ? api.get('/api/appstore').catch(() => null) : guard(() => api.get('/api/appstore')));
    if (!d) return;
    const wasRunning = this.data ? new Set(this.data.apps.filter(a => a.op && a.op.running).map(a => a.id)) : new Set();
    this.data = d;
    for (const a of d.apps) {
      if (wasRunning.has(a.id) && a.op && !a.op.running) {
        toast(a.op.error ? `${a.name}: ${a.op.error}` : `${a.name} ✓`, a.op.error ? 'err' : 'ok');
        window.dispatchEvent(new Event('nas-apps'));
      }
    }
    this.render();
  }

  render() {
    const d = this.data, box = this.box;
    box.innerHTML = '';
    if (!d.available) {
      box.appendChild(h(`<div class="empty-state">${icon('store')}<p><b>مركز التطبيقات متاح على جهاز HOME ANAB المخصص</b></p>
        <p>ثبّت HOME ANAB من ملف ISO على كمبيوتر مخصص لاستخدام التطبيقات.</p></div>`));
      return;
    }
    const eng = d.engine || {};
    if (!eng.docker || !eng.running) {
      const op = d.engine_op;
      const card = h(`<div class="card" style="margin-bottom:16px"><h4>${icon('server')} محرك التطبيقات</h4>
        <p>${op && op.running ? 'جارٍ تثبيت محرك التطبيقات… قد يستغرق عدة دقائق.' : 'تعمل التطبيقات داخل حاويات معزولة. يجب تثبيت محرك الحاويات مرة واحدة (يحتاج اتصالاً بالإنترنت).'}</p>
        ${op && op.error ? `<p class="alert err" translate="no">${esc(op.error)}</p>` : ''}
        ${op && op.running ? '<pre class="applog"></pre>' : `<button class="btn primary">${icon('download')} تثبيت محرك التطبيقات</button>`}</div>`);
      const b = $('button', card);
      if (b) b.onclick = async () => { if (await guard(() => api.post('/api/appstore/engine'))) this.load(); };
      if (op && op.running) this.tailLog('_engine', $('.applog', card));
      box.appendChild(card);
    }
    const grid = h('<div class="appgrid"></div>');
    for (const a of d.apps.filter(a => this.cat === 'all' || a.category === this.cat)) grid.appendChild(this.card(a, eng));
    box.appendChild(grid);
  }

  card(a, eng) {
    const inst = a.installed, op = a.op, running = op && op.running;
    const ready = eng.docker && eng.running;
    const lowRam = this.data.ram_mb && a.ram_mb > this.data.ram_mb * 0.6;
    const state = running ? `<span class="badge accent">${esc({ install: 'جارٍ التثبيت…', remove: 'جارٍ الإزالة…', update: 'جارٍ التحديث…', start: 'جارٍ التشغيل…', stop: 'جارٍ الإيقاف…', restart: 'جارٍ إعادة التشغيل…' }[op.op] || '…')}</span>`
      : !inst ? '' : a.state === 'running' ? '<span class="badge ok">يعمل</span>' : a.state ? '<span class="badge warn">متوقف</span>' : '<span class="badge">مثبت</span>';
    const c = h(`<div class="appcard">
      <div class="top"><div class="app-tile" style="background:${a.color}">${icon(a.icon)}</div>
        <div class="meta"><b translate="no">${esc(a.name)}</b><div>${state}</div></div></div>
      <p class="sum" translate="no">${esc(tr(a.summary))}</p>
      <div class="muted small">${icon('memory')} <span translate="no" dir="ltr">${a.ram_mb >= 1024 ? a.ram_mb / 1024 + ' GB' : a.ram_mb + ' MB'} RAM</span>
        ${inst ? ` · <span translate="no">:${inst.port}</span>` : ''}${lowRam ? ' · <span class="warn-t">قد يكون ثقيلاً على هذا الجهاز</span>' : ''}</div>
      ${op && op.error && !running ? `<div class="alert err small" translate="no">${esc(op.error)}</div>` : ''}
      ${running ? '<pre class="applog"></pre>' : ''}
      <div class="acts"></div></div>`);
    const acts = $('.acts', c);
    const btn = (label, ic, cls, fn) => { const b = h(`<button class="btn ${cls}">${ic ? icon(ic) : ''} ${esc(label)}</button>`); b.onclick = fn; b.disabled = running || !ready; acts.appendChild(b); return b; };
    if (!inst) btn('تثبيت', 'download', 'primary', () => this.install(a));
    else {
      const open = btn('فتح', 'external', 'primary', () => window.open(appUrl(inst.port, a.path, a.scheme), '_blank'));
      open.disabled = running || a.state !== 'running';
      if (a.state === 'running') btn('إيقاف', 'square', '', () => this.action(a, 'stop'));
      else btn('تشغيل', 'play', '', () => this.action(a, 'start'));
      const more = btn('', 'more', 'ghost icon', (e) => menuAt(more, [
        { label: 'الإعدادات (المجلدات والمنفذ)', icon: 'sliders', fn: () => this.install(a) },
        { label: 'تحديث إلى آخر إصدار', icon: 'refresh', fn: () => this.action(a, 'update') },
        { label: 'إعادة التشغيل', icon: 'refresh', fn: () => this.action(a, 'restart') },
        { label: 'سجل التطبيق', icon: 'file', fn: () => this.showLog(a) },
        { label: inst.show_all ? 'إخفاء عن المستخدمين الآخرين' : 'إظهار لكل المستخدمين', icon: 'users', fn: () => this.visibility(a, !inst.show_all) },
        '-', { label: 'إزالة', icon: 'trash', danger: true, fn: () => this.remove(a) }]));
      more.disabled = running;
    }
    if (running) this.tailLog(a.id, $('.applog', c));
    return c;
  }

  async tailLog(id, pre) {
    const r = await api.get(`/api/appstore/${id}/log`).catch(() => null);
    if (r && pre && document.body.contains(pre)) { pre.textContent = r.log.split('\n').slice(-6).join('\n'); pre.scrollTop = pre.scrollHeight; }
  }

  async install(a) {
    const d = this.data, inst = a.installed;
    const usable = d.folders.filter(f => f.usable);
    const body = h(`<div>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><div class="app-tile" style="background:${a.color}">${icon(a.icon)}</div>
        <div><b translate="no">${esc(a.name)}</b><div class="muted small" translate="no">${esc(tr(a.summary))}</div></div></div>
      ${a.folders.map(f => `<label class="lbl" translate="no">${esc(tr(f.label))}${f.write ? '' : ` <span class="muted">(${I18N.lang === 'fr' ? 'lecture seule' : I18N.lang === 'en' ? 'read only' : 'قراءة فقط'})</span>`}</label>
        <select class="field" name="f_${f.key}">${usable.length ? usable.map(x => `<option value="${x.id}" ${inst && inst.folders[f.key] == x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('') : ''}</select>`).join('')}
      ${a.folders.length && !usable.length ? '<p class="alert warn small">أنشئ مجلداً مشتركاً أولاً من «لوحة التحكم ← المجلدات المشتركة»، مثل «أفلام» أو «موسيقى».</p>' : ''}
      ${a.fixed_port ? '' : `<label class="lbl">المنفذ</label><input class="field" name="port" type="number" min="1024" max="65535" value="${inst ? inst.port : a.port}" dir="ltr">`}
      <label class="check"><input type="checkbox" name="show_all" ${!inst || inst.show_all ? 'checked' : ''}> إظهار أيقونة التطبيق لكل المستخدمين</label>
      <p class="muted small" translate="no">💡 ${esc(tr(a.notes))}</p></div>`);
    const ok = await modal({ title: inst ? 'إعدادات التطبيق' : 'تثبيت تطبيق', body, wide: true, buttons: [{ label: 'إلغاء', value: null }, {
      label: inst ? 'حفظ وإعادة التشغيل' : 'تثبيت', cls: 'primary', value: true, validate: async (b) => {
        const folders = {}; for (const f of a.folders) folders[f.key] = +$(`[name=f_${f.key}]`, b).value || null;
        const port = a.fixed_port ? a.port : +$('[name=port]', b).value;
        return !!await guard(() => api.post(`/api/appstore/${a.id}/install`, { folders, port, show_all: $('[name=show_all]', b).checked }));
      } }] });
    if (ok) { toast(inst ? 'جارٍ تطبيق الإعدادات…' : 'بدأ التثبيت — قد يستغرق التنزيل عدة دقائق', 'ok'); this.load(); }
  }

  async action(a, action) {
    if (await guard(() => api.post(`/api/appstore/${a.id}/${action}`))) this.load();
  }

  async remove(a) {
    const r = await modal({ title: `إزالة ${a.name}`, body: `<p>سيتم إيقاف التطبيق وإزالته. ملفاتك في المجلدات المشتركة لن تُحذف.</p>
      <label class="check"><input type="checkbox" class="pg"> حذف إعدادات التطبيق وبياناته الداخلية أيضاً</label>`,
      buttons: [{ label: 'إلغاء', value: null }, { label: 'إزالة', cls: 'danger solid', value: (b) => ({ purge: $('.pg', b).checked }) }] });
    if (r && await guard(() => api.post(`/api/appstore/${a.id}/remove`, r))) this.load();
  }

  async visibility(a, show) {
    if (await guard(() => api.post(`/api/appstore/${a.id}/visibility`, { show_all: show }))) { window.dispatchEvent(new Event('nas-apps')); this.load(); }
  }

  async showLog(a) {
    const r = await guard(() => api.get(`/api/appstore/${a.id}/log?container=1`)); if (!r) return;
    const pre = h('<pre class="applog big" translate="no"></pre>'); pre.textContent = r.log || '—';
    const pw = a.installed && a.installed.password;
    const body = h('<div></div>');
    if (pw) body.appendChild(h(`<p>كلمة مرور لوحة التحكم: <span class="code" translate="no">${esc(pw)}</span></p>`));
    body.appendChild(pre);
    modal({ title: `سجل ${a.name}`, body, wide: true });
  }
}
