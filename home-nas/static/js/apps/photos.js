// ====================================================================
// تطبيق «الصور» — خط زمني، فيديو، مفضلة، ألبومات، تحديد متعدد، رفع
// ====================================================================
import {
  $, $$, h, esc, icon, api, guard, toast, modal, confirmBox, promptBox, menuAt, shareDialog, registerApp,
  uploads, chooseFiles, openViewer, fmtSize, fmtDateTime, debounce, download, isTouch, isMobile,
} from '../core.js';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const PAGE = 240;

registerApp({
  id: 'photos', title: 'الصور', icon: 'image', color: 'linear-gradient(135deg,#ff5f6d,#ffc371)', width: 1100, height: 700,
  open(win, opts) { new PhotosApp(win, opts); },
});

class PhotosApp {
  constructor(win) {
    this.win = win; this.view = 'timeline'; this.lib = null; this.album = null;
    this.items = []; this.next = 0; this.loading = false; this.sel = new Set(); this.selecting = false; this.q = '';
    this.cell = +(localStorage.getItem('photos.cell') || 150);
    win.body.innerHTML = `<div class="app">
      <aside class="app-side"></aside>
      <section class="app-main">
        <div class="toolbar">
          <button class="btn ghost icon side-toggle" data-a="side">${icon('menu')}</button>
          <strong class="v-title" style="font-size:16px"></strong><span class="v-sub muted"></span>
          <span class="grow"></span>
          <label class="search"><input class="field" placeholder="بحث بالاسم أو الكاميرا أو التاريخ">${icon('search')}</label>
          <button class="btn ghost icon" data-a="zoomout" title="تصغير">${icon('zoomOut')}</button>
          <button class="btn ghost icon" data-a="zoomin" title="تكبير">${icon('zoomIn')}</button>
          <button class="btn" data-a="select">${icon('check')} تحديد</button>
          <button class="btn primary" data-a="upload">${icon('upload')} رفع</button>
        </div>
        <div class="scroll ph-scroll"></div>
        <div class="index-note"></div>
      </section></div>`;
    this.side = $('.app-side', win.body); this.scroll = $('.scroll', win.body); this.main = $('.app-main', win.body);
    this.main.style.setProperty('--cell', this.cell + 'px');
    this.main.style.setProperty('--cell-m', Math.round(this.cell * 0.64) + 'px');
    $$('[data-a]', win.body).forEach(b => b.onclick = () => this.action(b.dataset.a, b));
    $('.search input', win.body).addEventListener('input', debounce(e => { this.q = e.target.value.trim(); this.reload(); }, 350));
    this.scroll.addEventListener('scroll', () => { if (this.scroll.scrollTop + this.scroll.clientHeight > this.scroll.scrollHeight - 900) this.loadMore(); });
    this.bindDrop();
    this.init();
    const timer = setInterval(() => this.indexStatus(), 5000);
    win.onClose(() => clearInterval(timer));
    win.onResize = () => this.loadMore();
  }

  async init() {
    this.libs = await guard(() => api.get('/api/photos/libraries')) || [];
    this.lib = this.libs[0] && this.libs[0].id;
    this.renderSide(); this.reload(); this.indexStatus();
  }

  renderSide() {
    const s = this.side; s.innerHTML = '';
    if (this.libs.length > 1) {
      s.appendChild(h('<div class="sect">المكتبة</div>'));
      for (const l of this.libs) {
        const b = h(`<button class="side-item" data-lib="${l.id}">${icon(l.id === 's' ? 'users' : 'user')}<span>${esc(l.label)}</span></button>`);
        b.onclick = () => { this.lib = l.id; if (this.view === 'albums' || this.view === 'album' || this.view === 'favorites') this.view = 'timeline'; this.reload(); this.closeSide(); };
        s.appendChild(b);
      }
    }
    s.appendChild(h('<div class="sect">عرض</div>'));
    for (const [v, label, ic] of [['timeline', 'كل الصور', 'image'], ['videos', 'الفيديو', 'video'], ['favorites', 'المفضلة', 'heart'], ['albums', 'الألبومات', 'album']]) {
      const b = h(`<button class="side-item" data-view="${v}">${icon(ic)}<span>${label}</span></button>`);
      b.onclick = () => { this.view = v; this.album = null; this.reload(); this.closeSide(); };
      s.appendChild(b);
    }
    this.periodBox = h('<div></div>'); s.appendChild(this.periodBox);
    s.appendChild(h('<div class="sect">أدوات</div>'));
    const re = h(`<button class="side-item">${icon('refresh')}<span>فهرسة المكتبة الآن</span></button>`);
    re.onclick = async () => { await guard(() => api.post('/api/photos/reindex', { lib: this.lib })); toast('بدأت الفهرسة في الخلفية'); setTimeout(() => this.indexStatus(), 800); };
    s.appendChild(re);
    s.appendChild(h(`<p class="muted" style="font-size:12px;padding:8px 10px">💡 الصور التي تنسخها بمدير الملفات إلى مجلد <b>Photos</b> تظهر هنا تلقائياً.</p>`));
  }
  closeSide() { this.side.classList.remove('open'); }

  updateSide() {
    $$('[data-lib]', this.side).forEach(b => b.classList.toggle('active', b.dataset.lib === this.lib && ['timeline', 'videos'].includes(this.view)));
    $$('[data-view]', this.side).forEach(b => b.classList.toggle('active', b.dataset.view === this.view || (this.view === 'album' && b.dataset.view === 'albums')));
  }

  async loadPeriods() {
    this.periodBox.innerHTML = '';
    if (!['timeline', 'videos'].includes(this.view)) return;
    const s = await guard(() => api.get('/api/photos/summary?lib=' + this.lib)); if (!s) return;
    this.summary = s;
    const years = {};
    for (const m of s.months) { const y = m.period.slice(0, 4); years[y] = (years[y] || 0) + m.n; }
    const ys = Object.keys(years).sort().reverse();
    if (ys.length < 2) return;
    this.periodBox.appendChild(h('<div class="sect">السنوات</div>'));
    for (const y of ys) {
      const b = h(`<button class="side-item ${this.period === y ? 'active' : ''}">${icon('clock')}<span>${y}</span><span class="cnt">${years[y]}</span></button>`);
      b.onclick = () => { this.period = this.period === y ? null : y; this.reload(); this.closeSide(); };
      this.periodBox.appendChild(b);
    }
  }

  // ------------------------------------------------------------ تحميل وعرض
  query() {
    const p = new URLSearchParams({ limit: PAGE, offset: this.next });
    if (this.view === 'favorites') p.set('fav', 1);
    else if (this.view === 'album') p.set('album', this.album.id);
    else p.set('lib', this.lib);
    if (this.view === 'videos') p.set('kind', 'videos');
    if (this.q) p.set('q', this.q);
    if (this.period && ['timeline', 'videos'].includes(this.view)) p.set('period', this.period);
    return '/api/photos/items?' + p;
  }

  reload() {
    this.items = []; this.next = 0; this.sel.clear(); this.setSelecting(false);
    this.scroll.innerHTML = ''; this.scroll.scrollTop = 0; this.lastGroup = null; this.gridEl = null;
    this.updateSide(); this.renderHeader();
    if (this.periodBox) this.periodBox.innerHTML = '';
    if (this.view === 'albums') return this.renderAlbums();
    if (!['timeline', 'videos'].includes(this.view)) this.period = null;
    this.loadPeriods();
    this.loadMore();
  }

  renderHeader() {
    const lib = this.libs.find(l => l.id === this.lib);
    const titles = { timeline: 'كل الصور', videos: 'الفيديو', favorites: 'المفضلة', albums: 'الألبومات' };
    $('.v-title', this.win.body).textContent = this.view === 'album' ? this.album.name : titles[this.view] + (this.period ? ` — ${this.period}` : '');
    $('.v-sub', this.win.body).textContent = this.libs.length > 1 && ['timeline', 'videos'].includes(this.view) && lib ? '· ' + lib.label : '';
    const upBtn = $('[data-a=upload]', this.win.body);
    upBtn.disabled = !(lib && lib.writable);
    $('[data-a=select]', this.win.body).classList.toggle('hidden', this.view === 'albums');
    this.win.setTitle('الصور — ' + $('.v-title', this.win.body).textContent);
    if (this.view === 'album') {
      const bar = h(`<div class="toolbar" style="border:0;padding:12px 4px 0">
        <button class="btn ghost" data-b="back">${icon('right')} الألبومات</button><span class="grow"></span>
        <button class="btn" data-b="share">${icon('link')} مشاركة</button>
        <button class="btn ghost icon" data-b="more">${icon('more')}</button></div>`);
      $('[data-b=back]', bar).onclick = () => { this.view = 'albums'; this.reload(); };
      $('[data-b=share]', bar).onclick = () => shareDialog('album', this.album.id, this.album.name);
      $('[data-b=more]', bar).onclick = (e) => menuAt(e.currentTarget, [
        { label: 'إعادة تسمية الألبوم', icon: 'edit', fn: () => this.renameAlbum(this.album) },
        { label: 'تنزيل الألبوم كاملاً', icon: 'download', fn: () => this.downloadIds(this.items.map(i => i.id)) },
        '-', { label: 'حذف الألبوم (الصور تبقى)', icon: 'trash', danger: true, fn: () => this.deleteAlbum(this.album) },
      ]);
      this.scroll.appendChild(bar);
    }
  }

  async loadMore() {
    if (this.loading || this.next === null || ['albums'].includes(this.view)) return;
    this.loading = true;
    try {
      const r = await guard(() => api.get(this.query())); if (!r) return;
      const start = this.items.length;
      this.items.push(...r.items); this.next = r.next;
      this.appendCells(start);
      if (!this.items.length) this.empty();
    } finally { this.loading = false; }
    if (this.next !== null && this.scroll.scrollHeight <= this.scroll.clientHeight + 900) this.loadMore();
  }

  empty() {
    const msgs = {
      timeline: ['image', 'لا توجد صور بعد', 'اضغط «رفع» لإضافة صور من جهازك، أو انسخها بمدير الملفات إلى مجلد Photos.'],
      videos: ['video', 'لا توجد فيديوهات', ''], favorites: ['heart', 'لا توجد صور مفضلة', 'اضغط على ♥ عند عرض أي صورة لإضافتها هنا.'],
      album: ['album', 'الألبوم فارغ', 'حدّد صوراً من «كل الصور» ثم اختر «إضافة إلى ألبوم».'],
    }[this.view] || ['image', 'لا يوجد شيء', ''];
    if (this.q) msgs[1] = 'لا توجد نتائج';
    this.scroll.appendChild(h(`<div class="empty-state">${icon(msgs[0])}<p><b>${msgs[1]}</b></p><p>${msgs[2]}</p></div>`));
  }

  appendCells(start) {
    for (let i = start; i < this.items.length; i++) {
      const it = this.items[i];
      const d = new Date(it.taken_at);
      const g = `${d.getFullYear()}-${d.getMonth()}`;
      if (g !== this.lastGroup) {
        this.lastGroup = g;
        const grp = h(`<div class="ph-group"><h3>${MONTHS[d.getMonth()]} ${d.getFullYear()} <span class="muted"></span></h3><div class="ph-grid"></div></div>`);
        const sm = this.summary && this.view === 'timeline' && !this.q && this.summary.months.find(m => m.period === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        if (sm) $('h3 .muted', grp).textContent = `${sm.n} عنصر`;
        this.scroll.appendChild(grp); this.gridEl = $('.ph-grid', grp);
      }
      const c = h(`<div class="ph-cell" data-i="${i}"><img loading="lazy" decoding="async" alt="" src="/api/photos/${it.id}/thumb">
        <span class="tick">${icon('check')}</span>
        ${it.is_video ? `<span class="badge-v">${icon('play')}</span>` : ''}${it.fav ? `<span class="fav">${icon('heart')}</span>` : ''}</div>`);
      it.el = c;
      c.onclick = (e) => {
        if (e.target.closest('.tick') || this.selecting || e.ctrlKey || e.metaKey || e.shiftKey) { this.toggle(i, e.shiftKey); return; }
        this.openViewer(i);
      };
      let t; c.addEventListener('touchstart', () => { t = setTimeout(() => { c._lp = true; this.setSelecting(true); this.toggle(i); navigator.vibrate && navigator.vibrate(20); }, 480); }, { passive: true });
      c.addEventListener('touchend', e => { clearTimeout(t); if (c._lp) { e.preventDefault(); c._lp = false; } });
      c.addEventListener('touchmove', () => clearTimeout(t), { passive: true });
      c.addEventListener('contextmenu', e => { if (!isTouch()) { e.preventDefault(); if (!this.sel.has(i)) this.toggle(i); } });
      this.gridEl.appendChild(c);
    }
  }

  // ------------------------------------------------------------ التحديد
  setSelecting(on) {
    this.selecting = on; this.main.classList.toggle('selecting', on);
    if (!on) { this.sel.forEach(i => this.items[i] && this.items[i].el && this.items[i].el.classList.remove('sel')); this.sel.clear(); }
    $('[data-a=select]', this.win.body).innerHTML = on ? `${icon('x')} إلغاء` : `${icon('check')} تحديد`;
    this.renderSelbar();
  }
  toggle(i, range = false) {
    if (!this.selecting) this.setSelecting(true);
    if (range && this.lastSel != null) {
      const [a, b] = [Math.min(this.lastSel, i), Math.max(this.lastSel, i)];
      for (let k = a; k <= b; k++) { this.sel.add(k); this.items[k].el.classList.add('sel'); }
    } else {
      this.sel.has(i) ? this.sel.delete(i) : this.sel.add(i);
      this.items[i].el.classList.toggle('sel', this.sel.has(i));
    }
    this.lastSel = i;
    if (!this.sel.size && !isTouch()) this.setSelecting(false); else this.renderSelbar();
  }
  selIds() { return [...this.sel].map(i => this.items[i].id); }

  renderSelbar() {
    $('.selbar', this.main)?.remove();
    if (!this.selecting) return;
    const n = this.sel.size;
    const bar = h(`<div class="selbar"><span class="count">${n ? `${n} محدد` : 'اختر صوراً'}</span>
      <button class="btn ghost" data-s="all">الكل</button>
      ${this.view === 'album' ? `<button class="btn ghost" data-s="unalbum" ${n ? '' : 'disabled'}>${icon('minus')} إزالة من الألبوم</button>`
        : `<button class="btn ghost" data-s="album" ${n ? '' : 'disabled'}>${icon('album')} <span>إلى ألبوم</span></button>`}
      <button class="btn ghost icon" data-s="fav" title="مفضلة" ${n ? '' : 'disabled'}>${icon('heart')}</button>
      <button class="btn ghost icon" data-s="dl" title="تنزيل" ${n ? '' : 'disabled'}>${icon('download')}</button>
      <button class="btn ghost icon danger" data-s="del" title="حذف" ${n ? '' : 'disabled'}>${icon('trash')}</button>
      <button class="btn ghost icon" data-s="close" title="إلغاء">${icon('x')}</button></div>`);
    $$('[data-s]', bar).forEach(b => b.onclick = () => this.selAction(b.dataset.s, b));
    this.main.appendChild(bar);
  }

  async selAction(a, btn) {
    const ids = this.selIds();
    if (a === 'close') return this.setSelecting(false);
    if (a === 'all') { this.items.forEach((it, i) => { this.sel.add(i); it.el.classList.add('sel'); }); return this.renderSelbar(); }
    if (a === 'dl') return this.downloadIds(ids);
    if (a === 'fav') {
      const allFav = [...this.sel].every(i => this.items[i].fav);
      if (await guard(() => api.post('/api/photos/favorite', { ids, value: !allFav }))) {
        toast(allFav ? 'أزيلت من المفضلة' : 'أضيفت إلى المفضلة', 'ok');
        if (this.view === 'favorites') this.reload(); else { this.sel.forEach(i => this.setFav(this.items[i], !allFav)); this.setSelecting(false); }
      }
    }
    if (a === 'album') return this.addToAlbum(ids, btn);
    if (a === 'unalbum') {
      if (await guard(() => api.post(`/api/albums/${this.album.id}/remove`, { ids }))) { toast('أزيلت من الألبوم', 'ok'); this.reload(); }
    }
    if (a === 'del') this.deleteIds(ids);
  }

  setFav(it, v) {
    it.fav = v; const f = $('.fav', it.el);
    if (v && !f) it.el.appendChild(h(`<span class="fav">${icon('heart')}</span>`)); else if (!v && f) f.remove();
  }

  downloadIds(ids) {
    if (!ids.length) return;
    if (ids.length === 1) return download(`/api/photos/${ids[0]}/download`);
    download('/api/photos/zip?ids=' + ids.join(',')); toast('جارِ تجهيز ملف ZIP…');
  }

  async deleteIds(ids, viewer) {
    if (!await confirmBox(`نقل ${ids.length} عنصر إلى سلة المحذوفات؟ يمكنك استرجاعها من مدير الملفات.`, { ok: 'حذف', danger: true })) return false;
    if (!await guard(() => api.post('/api/photos/delete', { ids }))) return false;
    toast('تم الحذف', 'ok');
    if (!viewer) this.reload();
    return true;
  }

  async addToAlbum(ids, btn) {
    const albums = await guard(() => api.get('/api/albums')) || [];
    const create = async () => {
      const name = await promptBox('ألبوم جديد', 'اسم الألبوم', '', 'إنشاء'); if (!name) return;
      if (await guard(() => api.post('/api/albums', { name, ids }))) { toast(`أنشئ الألبوم «${name}»`, 'ok'); this.setSelecting(false); }
    };
    if (!albums.length) return create();
    menuAt(btn, [{ label: 'ألبوم جديد…', icon: 'plus', fn: create }, '-',
      ...albums.slice(0, 15).map(a => ({ label: `${a.name} (${a.count})`, icon: 'album', fn: async () => {
        if (await guard(() => api.post(`/api/albums/${a.id}/add`, { ids }))) { toast(`أضيفت إلى «${a.name}»`, 'ok'); this.setSelecting(false); }
      } }))]);
  }

  // ------------------------------------------------------------ العارض
  openViewer(i) {
    openViewer(this.items, i, {
      kind: it => it.is_video ? 'video' : 'image',
      src: it => `/api/photos/${it.id}/view`, thumb: it => `/api/photos/${it.id}/thumb`,
      title: it => it.name,
      meta: it => [fmtDateTime(it.taken_at), it.camera, it.width ? `${it.width}×${it.height}` : '', fmtSize(it.size)].filter(Boolean).join(' · '),
      actions: (it, v) => [
        { icon: 'heart', label: 'مفضلة', on: it.fav, fn: async () => {
          if (await guard(() => api.post('/api/photos/favorite', { ids: [it.id], value: !it.fav }))) { this.setFav(it, !it.fav); v.refresh(); }
        } },
        { icon: 'album', label: 'إضافة إلى ألبوم', fn: (_, vv) => this.addToAlbum([it.id], $('#viewer .acts button:nth-child(2)')) },
        { icon: 'download', label: 'تنزيل', fn: () => download(`/api/photos/${it.id}/download`) },
        { icon: 'trash', label: 'حذف', fn: async () => { if (await this.deleteIds([it.id], true)) { it.el.remove(); v.remove(); } } },
      ],
    });
  }

  // ------------------------------------------------------------ الألبومات
  async renderAlbums() {
    const albums = await guard(() => api.get('/api/albums')); if (!albums) return;
    const wrap = h(`<div><div class="toolbar" style="border:0;padding:12px 4px 0"><span class="grow"></span>
      <button class="btn primary">${icon('plus')} ألبوم جديد</button></div><div class="albums"></div></div>`);
    $('.btn', wrap).onclick = async () => {
      const name = await promptBox('ألبوم جديد', 'اسم الألبوم', '', 'إنشاء'); if (!name) return;
      if (await guard(() => api.post('/api/albums', { name }))) this.reload();
    };
    const grid = $('.albums', wrap);
    if (!albums.length) grid.appendChild(h(`<div class="empty-state" style="grid-column:1/-1">${icon('album')}<p>لا توجد ألبومات بعد</p></div>`));
    for (const a of albums) {
      const card = h(`<div class="album-card"><div class="cover">${a.cover ? `<img loading="lazy" src="/api/photos/${a.cover}/thumb" alt="">` : icon('album')}</div>
        <div class="t"></div><div class="s">${a.count} عنصر</div></div>`);
      $('.t', card).textContent = a.name;
      card.onclick = () => { this.view = 'album'; this.album = a; this.reload(); };
      card.oncontextmenu = (e) => { e.preventDefault(); menuAt(card, [
        { label: 'مشاركة', icon: 'link', fn: () => shareDialog('album', a.id, a.name) },
        { label: 'إعادة تسمية', icon: 'edit', fn: () => this.renameAlbum(a) },
        { label: 'حذف الألبوم', icon: 'trash', danger: true, fn: () => this.deleteAlbum(a) }]); };
      grid.appendChild(card);
    }
    this.scroll.appendChild(wrap);
  }
  async renameAlbum(a) {
    const name = await promptBox('إعادة تسمية الألبوم', 'الاسم', a.name); if (!name) return;
    if (await guard(() => api.patch(`/api/albums/${a.id}`, { name }))) { a.name = name; this.reload(); }
  }
  async deleteAlbum(a) {
    if (!await confirmBox(`حذف الألبوم «${a.name}»؟ الصور نفسها لن تُحذف.`, { ok: 'حذف', danger: true })) return;
    if (await guard(() => api.del(`/api/albums/${a.id}`))) { this.view = 'albums'; this.reload(); }
  }

  // ------------------------------------------------------------ أوامر الشريط
  action(a) {
    if (a === 'side') return this.side.classList.toggle('open');
    if (a === 'select') return this.setSelecting(!this.selecting);
    if (a === 'zoomin' || a === 'zoomout') {
      this.cell = Math.max(80, Math.min(320, this.cell + (a === 'zoomin' ? 40 : -40)));
      localStorage.setItem('photos.cell', this.cell);
      this.main.style.setProperty('--cell', this.cell + 'px'); this.main.style.setProperty('--cell-m', Math.round(this.cell * 0.64) + 'px');
      return this.loadMore();
    }
    if (a === 'upload') chooseFiles({ accept: 'image/*,video/*,.heic,.heif,.mov,.dng' }).then(f => this.upload(f));
  }

  upload(files) {
    if (!files.length) return;
    const lib = this.libs.find(l => l.id === this.lib) || this.libs[0];
    if (!lib.writable) return toast('لا تملك صلاحية الرفع لهذه المكتبة', 'err');
    const refresh = debounce(() => { if (['timeline', 'videos'].includes(this.view)) this.reload(); }, 1500);
    uploads.add(files.map(file => ({ file, url: `/api/photos/upload?lib=${encodeURIComponent(lib.id)}` })), { onAll: refresh });
  }
  bindDrop() {
    this.main.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    this.main.addEventListener('drop', e => { e.preventDefault(); this.upload([...e.dataTransfer.files]); });
  }

  async indexStatus() {
    const s = await api.get('/api/photos/summary?lib=' + this.lib).catch(() => null); if (!s) return;
    const ix = s.indexer; const note = $('.index-note', this.win.body);
    note.textContent = ix.running ? `جارِ فهرسة الصور… ${ix.done} من ${ix.total}` : `${s.count - s.videos} صورة · ${s.videos} فيديو · ${fmtSize(s.size)}`;
    if (this.wasIndexing && !ix.running && ['timeline', 'videos'].includes(this.view) && !this.selecting) this.reload();
    this.wasIndexing = ix.running;
  }
}
