// HOME ANAB — الكاميرات: مشاهدة مباشرة، تسجيلات بالأيام، وإضافة الكاميرات (يجد النظام رابط البث وحده)
import { ME, $, $$, h, esc, icon, api, guard, toast, modal, fmtSize, menuAt, registerApp } from '../core.js';

const BRANDS = [['cisco', 'Cisco'], ['hikvision', 'Hikvision'], ['dahua', 'Dahua / Imou'], ['ezviz', 'Ezviz'], ['tapo', 'Tapo / TP-Link'],
  ['reolink', 'Reolink'], ['axis', 'Axis'], ['', 'نوع آخر / لا أعرف']];
const STATE = { rec: ['يسجّل', 'ok'], live: ['مباشر', 'accent'], connecting: ['يتصل…', 'warn'], error: ['لا يعمل', 'err'], off: ['متوقفة', ''] };
const WHY = { auth: 'اسم المستخدم أو كلمة المرور غير صحيحة.', offline: 'لا يوجد جهاز يرد على هذا العنوان. تأكد من العنوان وأن الكاميرا موصولة.',
  notfound: 'الكاميرا ترد، لكن لم نجد رابط البث. فعّل RTSP أو ONVIF من إعدادات الكاميرا، أو اكتب الرابط يدوياً.' };

// تشغيل البث المباشر: HLS أصلي (سفاري والآيفون) أو hls.js
let hlsLib = null;
function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (!hlsLib) hlsLib = new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/static/vendor/hls.light.min.js'; s.onload = () => res(window.Hls); s.onerror = rej; document.head.appendChild(s); });
  return hlsLib;
}
export async function playLive(video, src) {
  if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = src; video.play().catch(() => {}); return () => { video.removeAttribute('src'); video.load(); }; }
  const Hls = await loadHls();
  if (!Hls || !Hls.isSupported()) throw new Error('hls');
  const hls = new Hls({ liveSyncDurationCount: 2, maxBufferLength: 8, lowLatencyMode: false });
  hls.loadSource(src); hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
  hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { if (d.type === Hls.ErrorTypes.NETWORK_ERROR) setTimeout(() => hls.startLoad(), 2000); else hls.recoverMediaError(); } });
  return () => hls.destroy();
}

registerApp({
  id: 'cameras', title: 'الكاميرات', icon: 'video', color: 'linear-gradient(135deg,#0f172a,#2563eb)', width: 1040, height: 700,
  hidden: !ME.is_admin && !ME.cameras,   // المدير ومن يختارهم
  open(win) { new CamerasApp(win); },
});

class CamerasApp {
  constructor(win) {
    this.win = win;
    win.body.innerHTML = '<div class="scroll cams-app"></div>';
    this.box = $('.scroll', win.body);
    this.timers = [];
    this.stopLive = null;
    win.onClose(() => this.cleanup());
    this.load();
  }

  cleanup() {
    this.timers.forEach(clearInterval); this.timers = [];
    if (this.stopLive) { this.stopLive(); this.stopLive = null; }
  }

  async load() {
    this.cleanup();
    const d = await guard(() => api.get('/api/cameras'));
    if (!d) return;
    this.d = d;
    this.grid();
  }

  // ------------------------------------------------------------ الشبكة
  grid() {
    const d = this.d;
    const cams = d.cameras;
    const usage = d.usage ? `<span class="muted small">التسجيلات: <b translate="no">${fmtSize(d.usage.bytes)}</b> · المتبقي في القرص <span translate="no">${fmtSize(d.usage.disk_free)}</span> · تُحفظ ${d.settings.keep_days} أيام</span>` : '';
    this.box.innerHTML = `
      <div class="cams-top">${d.admin ? `<button class="btn primary" data-a="add">${icon('plus')} إضافة كاميرا</button>
        <button class="btn" data-a="find">${icon('search')} البحث في الشبكة</button><button class="btn ghost" data-a="settings">${icon('sliders')} الإعدادات</button>` : ''}
        <span style="flex:1"></span>${usage}</div>
      ${!d.ffmpeg ? '<div class="alert err">برنامج ffmpeg غير موجود على السيرفر، فلا يمكن التسجيل.</div>' : ''}
      <div class="cams-grid">${cams.map((c) => this.card(c)).join('') || `<div class="cams-empty">${icon('video')}<p>لا توجد كاميرات بعد.</p>
        ${d.admin ? '<p class="muted">اضغط «إضافة كاميرا»، أو «البحث في الشبكة» ليجد النظام كاميراتك.</p>' : ''}</div>`}</div>`;
    $$('[data-a]', this.box).forEach((b) => (b.onclick = () => ({ add: () => this.addDialog(), find: () => this.findDialog(), settings: () => this.settingsDialog() })[b.dataset.a]()));
    $$('.cam-card', this.box).forEach((el) => {
      const c = cams.find((x) => x.id === +el.dataset.id);
      $('.cam-shot', el).onclick = () => this.view(c);
      const m = $('[data-m]', el); if (m) m.onclick = (e) => { e.stopPropagation(); this.menu(c, m); };
    });
    // الصور الحية تتجدد كل ثانيتين، والحالة كل 10 ثوانٍ
    this.timers.push(setInterval(() => $$('.cam-card img', this.box).forEach((im) => { im.src = `/api/cameras/${im.dataset.id}/snap?t=${Date.now()}`; }), 2000));
    this.timers.push(setInterval(async () => {
      const r = await api.get('/api/cameras').catch(() => null);
      if (!r || !document.body.contains(this.box)) return;
      this.d = r;
      for (const c of r.cameras) {
        const el = $(`.cam-card[data-id="${c.id}"] .cam-st`, this.box);
        if (el) el.outerHTML = this.badge(c);
      }
    }, 10000));
  }

  badge(c) {
    const [t, cls] = STATE[c.state] || [c.state, ''];
    return `<span class="cam-st badge ${cls}">${c.state === 'rec' ? '● ' : ''}${t}</span>`;
  }

  card(c) {
    return `<div class="cam-card" data-id="${c.id}"><div class="cam-shot">
        <img data-id="${c.id}" src="/api/cameras/${c.id}/snap?t=${Date.now()}" alt="" onerror="this.style.visibility='hidden'" onload="this.style.visibility=''">
        <span class="cam-ph">${icon('video')}</span></div>
      <div class="cam-meta"><b>${esc(c.name)}</b>${this.badge(c)}<span style="flex:1"></span>
        ${this.d.admin ? `<button class="btn ghost icon sm" data-m="1" title="خيارات">${icon('more')}</button>` : ''}</div>
      ${c.error && c.error.length ? `<div class="cam-err ltr small" translate="no">${esc(c.error[c.error.length - 1])}</div>` : ''}</div>`;
  }

  menu(c, anchor) {
    menuAt(anchor, [
      { label: 'تغيير الاسم', icon: 'edit', fn: async () => { const v = await this.ask('اسم الكاميرا', c.name); if (v) this.update(c, { name: v }); } },
      { label: c.record ? 'إيقاف التسجيل (مشاهدة فقط)' : 'تشغيل التسجيل', icon: c.record ? 'square' : 'play', fn: () => this.update(c, { record: !c.record }) },
      { label: c.enabled ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا', icon: 'square', fn: () => this.update(c, { enabled: !c.enabled }) },
      { label: 'تعديل الرابط أو كلمة المرور', icon: 'key', fn: () => this.editDialog(c) },
      { label: 'نقل للأمام', icon: 'right', fn: () => this.update(c, { move: -1 }) },
      { label: 'نقل للخلف', icon: 'left', fn: () => this.update(c, { move: 1 }) },
      { label: 'حذف', icon: 'trash', danger: true, fn: () => this.remove(c) },
    ]);
  }

  async ask(title, value) {
    const r = await modal({ title, body: `<input class="field" name="v" value="${esc(value || '')}">`,
      buttons: [{ label: 'إلغاء', value: null }, { label: 'حفظ', cls: 'primary', value: (b) => $('[name=v]', b).value.trim() }] });
    return r;
  }

  async update(c, data) {
    const r = await guard(() => api.post(`/api/cameras/${c.id}`, data));
    if (r) { toast('تم', 'ok'); setTimeout(() => this.load(), 600); }
  }

  async remove(c) {
    const r = await modal({ title: 'حذف الكاميرا', body: `<p>حذف «${esc(c.name)}»؟</p><label class="check"><input type="checkbox" class="pg"> حذف تسجيلاتها أيضاً</label>`,
      buttons: [{ label: 'إلغاء', value: null }, { label: 'حذف', cls: 'danger solid', value: (b) => ({ purge: $('.pg', b).checked }) }] });
    if (!r) return;
    if (await guard(() => api.del(`/api/cameras/${c.id}${r.purge ? '?purge=1' : ''}`))) { toast('تم الحذف', 'ok'); this.load(); }
  }

  // ------------------------------------------------------------ المشاهدة والتسجيلات
  async view(c, tab = 'live') {
    this.cleanup();
    this.box.innerHTML = `<div class="cams-top"><button class="btn" data-a="back">${icon('right')} كل الكاميرات</button>
        <b class="cam-title">${esc(c.name)}</b>${this.badge(c)}<span style="flex:1"></span>
        <div class="seg"><button class="btn ${tab === 'live' ? 'primary' : ''}" data-t="live">مباشر</button><button class="btn ${tab === 'rec' ? 'primary' : ''}" data-t="rec">التسجيلات</button></div></div>
      <div class="cam-stage"></div><div class="cam-below"></div>`;
    $('[data-a=back]', this.box).onclick = () => this.load();
    $$('[data-t]', this.box).forEach((b) => (b.onclick = () => this.view(c, b.dataset.t)));
    const stage = $('.cam-stage', this.box), below = $('.cam-below', this.box);
    if (tab === 'live') return this.live(c, stage, below);
    return this.recordings(c, stage, below);
  }

  async live(c, stage, below) {
    const mj = (c.codec || '').startsWith('mjpeg');
    if (c.live && !mj) {
      stage.innerHTML = '<video class="cam-video" muted autoplay playsinline controls></video>';
      try { this.stopLive = await playLive($('video', stage), `/api/cameras/${c.id}/live/live.m3u8`); return; } catch { /* نكمل بالصور */ }
    }
    stage.innerHTML = `<img class="cam-video" src="/api/cameras/${c.id}/snap?t=${Date.now()}" alt="">`;
    const im = $('img', stage);
    this.timers.push(setInterval(() => { im.src = `/api/cameras/${c.id}/snap?t=${Date.now()}`; }, mj ? 400 : 1500));
    below.innerHTML = `<p class="muted small">${mj ? 'هذه الكاميرا ترسل صوراً متتالية (MJPEG)، فتظهر كصور تتجدد.' : 'البث المباشر غير جاهز بعد، تظهر صورة تتجدد.'}</p>`;
  }

  async recordings(c, stage, below) {
    stage.innerHTML = '<video class="cam-video" controls playsinline></video>';
    const video = $('video', stage);
    const dd = await guard(() => api.get(`/api/cameras/${c.id}/days`));
    if (!dd) return;
    if (!dd.days.length) { below.innerHTML = '<p class="muted">لا توجد تسجيلات بعد.</p>'; return; }
    const showDay = async (day) => {
      const r = await guard(() => api.get(`/api/cameras/${c.id}/rec?day=${day}`)); if (!r) return;
      const hours = {};
      for (const it of r.items) (hours[it.time.slice(0, 2)] = hours[it.time.slice(0, 2)] || []).push(it);
      $('.rec-list', below).innerHTML = Object.keys(hours).sort().reverse().map((hh) => `<div class="rec-hour"><b translate="no">${hh}:00</b>
        <div>${hours[hh].map((it) => `<button class="btn sm rec-it" data-n="${esc(it.name)}" ${it.busy ? 'disabled title="قيد التسجيل الآن"' : ''} translate="no">${it.time}${it.busy ? ' ●' : ''}</button>`).join('')}</div></div>`).join('');
      $$('.rec-it', below).forEach((b) => (b.onclick = () => {
        $$('.rec-it.on', below).forEach((x) => x.classList.remove('on')); b.classList.add('on');
        video.src = `/api/cameras/${c.id}/rec/${encodeURIComponent(b.dataset.n)}`; video.play().catch(() => {});
        $('.rec-dl', below).href = `${video.src}?dl=1`; $('.rec-dl', below).hidden = false;
      }));
      $$('.day', below).forEach((x) => x.classList.toggle('primary', x.dataset.d === day));
    };
    const fmtDay = (s) => { try { return new Date(s + 'T12:00').toLocaleDateString('ar-SY-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return s; } };
    below.innerHTML = `<div class="days">${dd.days.map((x) => `<button class="btn sm day" data-d="${x.day}">${fmtDay(x.day)} <span class="muted" translate="no">${fmtSize(x.bytes)}</span></button>`).join('')}
      <span style="flex:1"></span><a class="btn sm rec-dl" hidden download>${icon('download')} تنزيل المقطع</a></div><div class="rec-list"></div>`;
    $$('.day', below).forEach((b) => (b.onclick = () => showDay(b.dataset.d)));
    video.onerror = () => toast('لا يستطيع هذا المتصفح تشغيل المقطع (ربما H.265). نزّله وشغّله ببرنامج VLC.', 'err');
    showDay(dd.days[0].day);
  }

  // ------------------------------------------------------------ الإضافة
  async addDialog(pre = {}) {
    const body = h(`<div class="cam-add">
      <div><label class="lbl">اسم الكاميرا</label><input class="field" name="name" value="${esc(pre.name || '')}" placeholder="مثلاً: باب البيت"></div>
      <div class="row2"><div><label class="lbl">نوع الكاميرا</label><select class="field" name="brand">${BRANDS.map(([k, n]) => `<option value="${k}" ${k === (pre.brand ?? 'cisco') ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div><label class="lbl">عنوان الكاميرا (IP)</label><input class="field" name="host" dir="ltr" value="${esc(pre.ip || '')}" placeholder="192.168.1.50"></div></div>
      <div class="row2"><div><label class="lbl">اسم المستخدم</label><input class="field" name="username" dir="ltr" autocomplete="off" value="admin"></div>
        <div><label class="lbl">كلمة المرور</label><input class="field" name="password" type="password" dir="ltr" autocomplete="new-password"></div></div>
      <details><summary class="muted small">أعرف رابط البث (متقدم)</summary><input class="field" name="url" dir="ltr" placeholder="rtsp://192.168.1.50:554/..."></details>
      <label class="check"><input type="checkbox" name="record" checked> تسجيل مستمر (يمكن إيقافه لاحقاً)</label>
      <div class="det muted small">اضغط «فحص» ليجد النظام رابط البث. قد يأخذ حتى نصف دقيقة.</div></div>`);
    let found = null;
    const val = (b, n) => $(`[name=${n}]`, b);
    const check = async (b) => {
      const det = $('.det', b);
      if (val(b, 'url').value.trim()) { found = { url: val(b, 'url').value.trim() }; return true; }
      if (!val(b, 'host').value.trim()) { det.innerHTML = '<span class="err-t">اكتب عنوان الكاميرا.</span>'; return false; }
      det.innerHTML = '<span class="spin"></span> جارٍ البحث عن رابط البث…';
      const r = await api.post('/api/cameras/detect', { host: val(b, 'host').value, username: val(b, 'username').value, password: val(b, 'password').value, brand: val(b, 'brand').value }).catch((e) => ({ ok: false, why: 'x', msg: e.message }));
      if (r.ok) {
        found = r;
        det.innerHTML = `✅ وجدنا البث: <span translate="no" dir="ltr">${esc(r.codec || '')} ${r.width ? `${r.width}×${r.height}` : ''}</span><div class="ltr small" translate="no">${esc(r.url)}</div>`;
        return true;
      }
      found = null;
      det.innerHTML = `<span class="err-t">❌ ${esc(WHY[r.why] || r.msg || 'لم نستطع الاتصال بالكاميرا.')}</span>`;
      return false;
    };
    const r = await modal({ title: 'إضافة كاميرا', wide: true, body,
      onOpen: (back) => { const f = h(`<button class="btn">${icon('search')} فحص</button>`); f.onclick = () => check(back); $('.modal-f', back).prepend(f); },
      buttons: [{ label: 'إلغاء', value: null }, { label: 'إضافة', cls: 'primary', validate: async (b) => found || check(b), value: (b) => ({
        name: val(b, 'name').value.trim() || val(b, 'host').value.trim(), username: val(b, 'username').value, password: val(b, 'password').value,
        record: val(b, 'record').checked }) }] });
    if (!r || !found) return;
    const res = await guard(() => api.post('/api/cameras', { ...r, url: found.url }));
    if (res) { toast('أضيفت الكاميرا ✓ تبدأ خلال ثوانٍ', 'ok'); this.load(); }
  }

  async editDialog(c) {
    const r = await modal({ title: `تعديل «${c.name}»`, wide: true, body: `<div class="cam-add">
        <div><label class="lbl">رابط البث</label><input class="field" name="url" dir="ltr" value="${esc(c.url || '')}"></div>
        <div class="row2"><div><label class="lbl">اسم المستخدم</label><input class="field" name="username" dir="ltr" value="${esc(c.username || '')}"></div>
        <div><label class="lbl">كلمة المرور</label><input class="field" name="password" type="password" dir="ltr" autocomplete="new-password" placeholder="${c.has_password ? 'اتركها فارغة لتبقى كما هي' : ''}"></div></div></div>`,
      buttons: [{ label: 'إلغاء', value: null }, { label: 'حفظ', cls: 'primary', value: (b) => ({ url: $('[name=url]', b).value.trim(), username: $('[name=username]', b).value, password: $('[name=password]', b).value }) }] });
    if (!r) return;
    if (!r.password) delete r.password;
    toast('جارٍ الفحص…');
    this.update(c, r);
  }

  async findDialog() {
    const box = h('<div><p class="muted"><span class="spin"></span> جارٍ البحث عن الكاميرات في شبكة البيت (حوالي 10 ثوانٍ)…</p></div>');
    const p = modal({ title: 'البحث في الشبكة', wide: true, body: box, buttons: [{ label: 'إغلاق', value: null }] });
    const r = await api.post('/api/cameras/discover', {}).catch((e) => ({ error: e.message }));
    if (!document.body.contains(box)) return;
    if (r.error || !r.found.length) {
      box.innerHTML = `<p>${r.error ? esc(r.error) : 'لم نجد كاميرات. تأكد أنها موصولة بالشبكة نفسها، أو أضفها بعنوانها.'}</p>`;
      return;
    }
    box.innerHTML = `<p class="muted small">أجهزة فيها خدمة كاميرا (ONVIF أو RTSP):</p><div class="found">${r.found.map((x, i) => `<div class="tv-tile"><span>📹</span>
      <div class="tv-tt"><b translate="no" dir="ltr">${esc(x.ip)}</b><div class="muted small" translate="no">${esc(x.name || (x.onvif ? 'ONVIF' : 'RTSP'))}</div></div>
      ${x.added ? '<span class="badge ok">مضافة</span>' : `<button class="btn primary sm" data-i="${i}">إضافة</button>`}</div>`).join('')}</div>`;
    $$('[data-i]', box).forEach((b) => (b.onclick = () => {
      const x = r.found[+b.dataset.i];
      $('.modal-back .modal-f .btn', document.body)?.click();
      this.addDialog({ ip: x.ip, name: '', brand: /cisco/i.test(x.name) ? 'cisco' : '' });
    }));
    await p;
  }

  async settingsDialog() {
    const s = this.d.settings, users = this.d.users || [];
    const r = await modal({ title: 'إعدادات الكاميرات', body: `<div class="cam-add">
        <div><label class="lbl">احتفظ بالتسجيلات (أيام)</label><input class="field" name="keep" type="number" min="1" max="365" value="${s.keep_days}"></div>
        <div><label class="lbl">أقصى مساحة للتسجيلات (GB، 0 = بلا حد)</label><input class="field" name="max" type="number" min="0" step="1" value="${s.max_gb || 0}">
          <div class="muted small">عند امتلاء القرص تُحذف أقدم التسجيلات تلقائياً.</div></div>
        <div><label class="lbl">من يشاهد الكاميرات (غير المدير)؟</label>${users.filter((u) => !u.admin).map((u) => `<label class="check"><input type="checkbox" value="${u.id}" ${s.viewers.includes(u.id) ? 'checked' : ''}> ${esc(u.name)}</label>`).join('') || '<p class="muted small">لا يوجد مستخدمون آخرون.</p>'}
          <div class="muted small">على التلفاز: أضف مربع «الكاميرات» لملف الشخص من لوحة التحكم ← وضع التلفاز.</div></div></div>`,
      buttons: [{ label: 'إلغاء', value: null }, { label: 'حفظ', cls: 'primary', value: (b) => ({ keep_days: +$('[name=keep]', b).value || 7, max_gb: +$('[name=max]', b).value || 0,
        viewers: $$('input[type=checkbox]:checked', b).map((x) => +x.value) }) }] });
    if (r && await guard(() => api.post('/api/cameras/settings', r))) { toast('تم الحفظ', 'ok'); this.load(); }
  }
}
