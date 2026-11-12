// HOME ANAB — بطاقة الذاكرة والفلاشة: فتحها في «الملفات»، استيراد الصور، نسخ كل محتواها، إخراج آمن
import { $, h, esc, icon, api, guard, toast, fmtSize, openApp, pickFolder, registerApp } from '../core.js';

registerApp({
  id: 'media', title: 'بطاقة الذاكرة', icon: 'save', color: 'linear-gradient(135deg,#0ea5e9,#6366f1)', width: 580, height: 560,
  hidden: true,   // تظهر أيقونتها على سطح المكتب فقط عند إدخال بطاقة
  admin: true,
  open(win, opts) { new MediaWin(win, opts.dev); },
});

class MediaWin {
  constructor(win, dev) {
    this.win = win; this.dev = dev; this.c = null; this.gone = false;
    win.body.innerHTML = '<div class="scroll media-app"><p class="muted"><span class="spin"></span> جارٍ فتح البطاقة…</p></div>';
    this.box = $('.scroll', win.body);
    win.reopen = (o) => { if (o.dev && o.dev !== this.dev) { this.dev = o.dev; this.open(); } };
    this.timer = setInterval(() => this.refresh(), 1500);
    win.onClose(() => clearInterval(this.timer));
    this.open();
  }

  async open() {
    try {
      const r = await api.post(`/api/media/${this.dev}/open`, {});
      this.c = r.card; this.draw();
    } catch (e) { this.box.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  }

  async refresh() {
    const r = await api.get('/api/media').catch(() => null);
    if (!r || !document.body.contains(this.box)) return;
    const c = r.cards.find((x) => x.dev === this.dev);
    if (!c) {
      if (!this.gone) { this.gone = true; this.box.innerHTML = '<div class="media-gone">💾<p>سُحبت البطاقة.</p></div>'; }
      return;
    }
    this.job = r.job;
    if (this.gone) { this.gone = false; this.c = c; this.draw(); return; }
    this.drawJob();
  }

  draw() {
    const c = this.c, u = c.usage || {};
    const pct = u.total ? Math.round((u.used / u.total) * 100) : 0;
    this.box.innerHTML = `
      <div class="media-head"><div class="app-tile" style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">${icon('save')}</div>
        <div><b>${esc(c.title)}</b><div class="muted small"><bdi dir="ltr" translate="no">${fmtSize(c.size)} · ${esc((c.fstype || '').toUpperCase())}</bdi>${c.ro ? ' · <span class="badge warn">قراءة فقط</span>' : ''}</div></div></div>
      ${u.total ? `<div class="media-bar"><i style="width:${pct}%"></i></div><div class="muted small">مستعمل <bdi dir="ltr" translate="no">${fmtSize(u.used)}</bdi> · فارغ <bdi dir="ltr" translate="no">${fmtSize(u.free)}</bdi></div>` : ''}
      <div class="media-acts">
        <button class="btn primary" data-a="files">${icon('folder')} فتح في «الملفات»</button>
        <button class="btn" data-a="import">${icon('image')} استيراد الصور والفيديو إلى «صوري»</button>
        <button class="btn" data-a="copy">${icon('copy')} نسخ كل البطاقة إلى مجلد في السيرفر…</button>
        <button class="btn" data-a="eject">⏏ إخراج آمن</button>
      </div>
      <div class="media-job"></div>
      <p class="muted small">للنسخ من السيرفر إلى البطاقة: افتح «الملفات»، حدّد الملفات، ثم «نسخ إلى…» واختر «${esc(c.title)}».
        ${c.ro ? '<br>البطاقة مقفولة للكتابة: حرّك زر القفل الصغير على جانبها ثم أدخلها من جديد.' : ''}</p>`;
    this.box.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => this[b.dataset.a]()));
    this.drawJob();
  }

  drawJob() {
    const j = this.job, box = $('.media-job', this.box);
    if (!box) return;
    if (!j || !j.kind || j.dev !== this.dev) { box.innerHTML = ''; return; }
    const pct = j.total ? Math.round((j.done / j.total) * 100) : 0;
    const what = j.kind === 'import' ? 'استيراد الصور والفيديو' : 'نسخ البطاقة';
    box.innerHTML = j.running
      ? `<div class="card"><b>${what}…</b><div class="media-bar"><i style="width:${pct}%"></i></div>
          <div class="muted small"><bdi dir="ltr" translate="no">${j.done} / ${j.total} · ${fmtSize(j.bytes || 0)}</bdi></div></div>`
      : `<div class="card"><b>✅ انتهى ${what}</b><div class="muted small">${j.kind === 'import'
          ? `جديدة: ${j.copied} · موجودة سابقاً: ${j.skipped}. تجدها في «الصور» ← بطاقة الذاكرة.`
          : `نُسخ ${j.copied} ملفاً إلى المجلد «${esc(j.dest || '')}».`}</div>${j.error ? `<div class="err-t small">${esc(j.error)}</div>` : ''}</div>`;
    this.box.querySelectorAll('[data-a=import],[data-a=copy],[data-a=eject]').forEach((b) => { b.disabled = !!j.running; });
  }

  files() { openApp('files', { path: '/' + this.c.root }); }

  async import() {
    const r = await guard(() => api.post(`/api/media/${this.dev}/import`, {}));
    if (r) { this.job = r.job; this.drawJob(); }
  }

  async copy() {
    const dest = await pickFolder('اختر المجلد الذي تُنسخ إليه البطاقة', '/home');
    if (!dest) return;
    const r = await guard(() => api.post(`/api/media/${this.dev}/copy`, { dest }));
    if (r) { this.job = r.job; this.drawJob(); }
  }

  async eject() {
    toast('جارٍ الإخراج…');
    if (await guard(() => api.post(`/api/media/${this.dev}/eject`, {}))) {
      toast('يمكنك سحب البطاقة الآن ✓', 'ok');
      window.dispatchEvent(new Event('nas-media'));
      this.win.close();
    }
  }
}
