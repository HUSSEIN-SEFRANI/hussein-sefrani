// ====================================================================
// تطبيق «الملفات» — مدير ملفات كامل
// ====================================================================
import {
  $, $$, h, esc, icon, api, guard, toast, modal, form, confirmBox, promptBox, menu, menuAt, shareDialog,
  pickFolder, registerApp, openApp, uploads, ARROW, filesFromDrop, chooseFiles, openViewer, fmtSize, fmtEpoch,
  fileType, THUMBABLE, TEXT_EDITABLE, encPath, isTouch, debounce, download,
} from '../core.js';

const FOLDER_SVG = '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

function fileIcon(it, path, big = false) {
  if (it.dir) return `<div class="ficon folder">${FOLDER_SVG}</div>`;
  const t = fileType(it.ext);
  if (THUMBABLE.has(it.ext)) {
    return `<div class="ficon t-${t}"><img loading="lazy" alt="" src="/api/files/thumb?path=${encPath(path + '/' + it.name)}" onerror="this.remove()"></div>`;
  }
  return `<div class="ficon t-${t}">${esc((it.ext || '?').slice(0, 4))}</div>`;
}

registerApp({
  id: 'files', title: 'الملفات', icon: 'folder', color: 'linear-gradient(135deg,#f7b733,#fc8f3a)', width: 1000, height: 640,
  open(win, opts) { new FilesApp(win, opts); },
});

class FilesApp {
  constructor(win, opts) {
    this.win = win; this.path = ''; this.items = []; this.sel = new Set(); this.anchor = null;
    this.history = []; this.fwd = []; this.view = localStorage.getItem('files.view') || 'list';
    this.sort = { key: 'name', dir: 1 }; this.searchMode = false;
    win.body.innerHTML = `<div class="app">
      <aside class="app-side"></aside>
      <section class="app-main">
        <div class="toolbar">
          <button class="btn ghost icon side-toggle" data-a="side">${icon('menu')}</button>
          <button class="btn ghost icon" data-a="back" title="رجوع">${icon(ARROW.back)}</button>
          <button class="btn ghost icon" data-a="fwd" title="تقدّم">${icon(ARROW.fwd)}</button>
          <button class="btn ghost icon" data-a="up" title="المجلد الأعلى">${icon('up')}</button>
          <div class="crumbs"></div>
          <label class="search"><input class="field" placeholder="بحث في هذا المجلد…">${icon('search')}</label>
        </div>
        <div class="toolbar acts">
          <button class="btn primary" data-a="upload">${icon('upload')} رفع</button>
          <button class="btn" data-a="mkdir">${icon('folderPlus')} مجلد جديد</button>
          <span class="grow"></span>
          <button class="btn ghost" data-a="download" disabled>${icon('download')} <span class="lbl-t">تنزيل</span></button>
          <button class="btn ghost" data-a="share" disabled>${icon('link')} <span class="lbl-t">مشاركة</span></button>
          <button class="btn ghost icon" data-a="more" disabled title="المزيد">${icon('more')}</button>
          <button class="btn ghost icon" data-a="view" title="طريقة العرض">${icon(this.view === 'list' ? 'grid' : 'list')}</button>
          <button class="btn ghost icon" data-a="refresh" title="تحديث">${icon('refresh')}</button>
        </div>
        <div class="scroll"></div>
        <div class="statusbar"><span class="st-count"></span><span class="st-sel"></span><span class="grow" style="flex:1"></span><span class="st-perm"></span></div>
      </section></div>`;
    this.side = $('.app-side', win.body); this.scroll = $('.scroll', win.body);
    $$('[data-a]', win.body).forEach(b => b.addEventListener('click', e => this.action(b.dataset.a, b, e)));
    const search = $('.search input', win.body);
    search.addEventListener('input', debounce(() => this.search(search.value.trim()), 350));
    this.searchInput = search;
    this.bindDrop(); this.bindKeys();
    win.reopen = (o) => o.path && this.go(o.path);
    this.loadRoots().then(() => this.go(opts.path || '/home'));
  }

  // ------------------------------------------------------------ تحميل
  async loadRoots() {
    this.roots = await guard(() => api.get('/api/files/roots')) || [];
    this.side.innerHTML = '<div class="sect">المجلدات</div>';
    for (const r of this.roots) {
      const ic = r.kind === 'home' ? 'home' : r.kind === 'homes' ? 'users' : r.kind === 'removable' ? 'save' : 'hdd';
      const b = h(`<button class="side-item" data-root="${esc(r.name)}">${icon(ic)}<span></span>${r.perm === 'ro' ? `<span class="cnt">${icon('lock')}</span>` : ''}</button>`);
      $('span', b).textContent = r.label;
      b.onclick = () => { this.go('/' + r.name); this.side.classList.remove('open'); };
      this.side.appendChild(b);
    }
    this.side.appendChild(h('<div class="sect">اختصارات</div>'));
    for (const [label, p, ic] of [['الصور', '/home/Photos', 'image'], ['سلة المحذوفات', '/home/#recycle', 'trash']]) {
      const b = h(`<button class="side-item">${icon(ic)}<span>${label}</span></button>`);
      b.onclick = () => { this.go(p); this.side.classList.remove('open'); }; this.side.appendChild(b);
    }
  }

  rootLabel(name) { const r = this.roots.find(x => x.name === name); return r ? r.label : name; }

  async go(path, { push = true } = {}) {
    const res = await guard(() => api.get('/api/files/list?path=' + encPath(path)));
    if (!res) { if (path.endsWith('#recycle')) toast('سلة المحذوفات فارغة'); return; }
    if (push && this.path && this.path !== res.path) { this.history.push(this.path); this.fwd = []; }
    this.path = res.path; this.perm = res.perm; this.items = res.items; this.sel.clear(); this.searchMode = false;
    this.searchInput.value = '';
    this.win.setTitle('الملفات — ' + (res.path.split('/').pop() === res.root.name ? res.root.label : res.path.split('/').pop()));
    $$('.side-item', this.side).forEach(b => b.classList.toggle('active', b.dataset.root === res.root.name));
    this.renderCrumbs(); this.render();
  }
  refresh() { return this.go(this.path, { push: false }); }

  async search(q) {
    if (!q) return this.refresh();
    const res = await guard(() => api.get(`/api/files/search?path=${encPath(this.path)}&q=${encodeURIComponent(q)}`));
    if (!res) return;
    this.searchMode = true; this.items = res.items; this.sel.clear(); this.render();
    $('.st-count', this.win.body).textContent = `${res.items.length}${res.truncated ? '+' : ''} نتيجة بحث`;
  }

  renderCrumbs() {
    const c = $('.crumbs', this.win.body); c.innerHTML = '';
    const parts = this.path.split('/').filter(Boolean); let acc = '';
    parts.forEach((p, i) => {
      acc += '/' + p; const target = acc;
      if (i) c.appendChild(h(`<span class="sep">${ARROW.sep}</span>`));
      const b = h(i ? '<button translate="no"></button>' : '<button></button>'); b.textContent = i === 0 ? this.rootLabel(p) : p; b.onclick = () => this.go(target);
      c.appendChild(b);
    });
    c.scrollLeft = -c.scrollWidth;
    $('[data-a=back]', this.win.body).disabled = !this.history.length;
    $('[data-a=fwd]', this.win.body).disabled = !this.fwd.length;
    $('[data-a=up]', this.win.body).disabled = parts.length < 2;
  }

  sorted() {
    const { key, dir } = this.sort;
    return [...this.items].sort((a, b) => (b.dir - a.dir) || dir * (key === 'name' ? a.name.localeCompare(b.name, 'ar', { numeric: true }) : (a[key] - b[key])));
  }
  itemPath(it) { return (it.parent || this.path) + '/' + it.name; }

  render() {
    const list = this.sorted(); this.view_ = list;
    this.scroll.innerHTML = '';
    if (!list.length) {
      this.scroll.innerHTML = `<div class="empty-state">${icon(this.searchMode ? 'search' : 'folder')}<p>${this.searchMode ? 'لا توجد نتائج' : 'المجلد فارغ'}</p>
        ${!this.searchMode && this.perm === 'rw' ? '<p class="muted">اسحب الملفات إلى هنا أو اضغط «رفع»</p>' : ''}</div>`;
    } else if (this.view === 'grid') {
      const g = h('<div class="fgrid"></div>');
      list.forEach((it, idx) => {
        const t = h(`<div class="tile" data-i="${idx}">${fileIcon(it, it.parent || this.path, true)}<div class="nm" translate="no"></div></div>`);
        $('.nm', t).textContent = it.name; this.bindItem(t, it, idx); g.appendChild(t);
      });
      this.scroll.appendChild(g);
    } else {
      const arrow = (k) => this.sort.key === k ? (this.sort.dir > 0 ? ' ▲' : ' ▼') : '';
      const tbl = h(`<table class="flist"><thead><tr>
        <th data-k="name">الاسم${arrow('name')}</th><th data-k="size" class="c-size c-size-h">الحجم${arrow('size')}</th>
        <th data-k="mtime" class="c-date">آخر تعديل${arrow('mtime')}</th><th class="c-more"></th></tr></thead><tbody></tbody></table>`);
      $$('th[data-k]', tbl).forEach(th => th.onclick = () => {
        const k = th.dataset.k; this.sort = { key: k, dir: this.sort.key === k ? -this.sort.dir : 1 }; this.render();
      });
      const tb = $('tbody', tbl);
      list.forEach((it, idx) => {
        const tr = h(`<tr class="row" data-i="${idx}"><td><div class="nm">${fileIcon(it, it.parent || this.path)}<span translate="no"></span></div></td>
          <td class="c-size">${it.dir ? '—' : fmtSize(it.size)}</td><td class="c-date">${fmtEpoch(it.mtime)}</td>
          <td class="c-more"><button class="btn ghost icon sm more">${icon('more')}</button></td></tr>`);
        $('.nm span', tr).textContent = it.name + (it.parent ? `  —  ${it.parent}` : '');
        $('.more', tr).onclick = (e) => { e.stopPropagation(); if (!this.sel.has(idx)) this.select(idx, false); this.contextMenu(e.currentTarget); };
        this.bindItem(tr, it, idx); tb.appendChild(tr);
      });
      this.scroll.appendChild(tbl);
    }
    this.updateSel();
  }

  bindItem(el, it, idx) {
    el.addEventListener('click', e => {
      if (isTouch() && !e.ctrlKey && !e.shiftKey && !this.sel.size) return this.open(it, idx);
      if (e.shiftKey && this.anchor != null) {
        const [a, b] = [Math.min(this.anchor, idx), Math.max(this.anchor, idx)];
        if (!e.ctrlKey && !e.metaKey) this.sel.clear();
        for (let k = a; k <= b; k++) this.sel.add(k);
        this.updateSel();
      } else this.select(idx, e.ctrlKey || e.metaKey || (isTouch() && this.sel.size > 0));
    });
    el.addEventListener('dblclick', () => this.open(it, idx));
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); if (!this.sel.has(idx)) this.select(idx, false);
      this.contextMenu(null, e.clientX, e.clientY);
    });
    // الضغط المطوّل على الهاتف = تحديد
    let t; el.addEventListener('touchstart', () => { t = setTimeout(() => { this.select(idx, true); navigator.vibrate && navigator.vibrate(20); el._lp = true; }, 500); }, { passive: true });
    el.addEventListener('touchend', e => { clearTimeout(t); if (el._lp) { e.preventDefault(); el._lp = false; } });
    el.addEventListener('touchmove', () => clearTimeout(t), { passive: true });
  }

  select(idx, toggle) {
    if (!toggle) this.sel.clear();
    if (toggle && this.sel.has(idx)) this.sel.delete(idx); else this.sel.add(idx);
    this.anchor = idx; this.updateSel();
  }
  selected() { return [...this.sel].map(i => this.view_[i]).filter(Boolean); }

  updateSel() {
    $$('[data-i]', this.scroll).forEach(el => el.classList.toggle('sel', this.sel.has(+el.dataset.i)));
    const n = this.sel.size, b = this.win.body;
    ['download', 'share', 'more'].forEach(a => $(`[data-a=${a}]`, b).disabled = !n);
    $('[data-a=share]', b).disabled = n !== 1;
    $('[data-a=upload]', b).disabled = $('[data-a=mkdir]', b).disabled = this.perm !== 'rw' || this.searchMode;
    if (!this.searchMode) {
      const dirs = this.items.filter(i => i.dir).length;
      $('.st-count', b).textContent = `${dirs} مجلد · ${this.items.length - dirs} ملف`;
    }
    const size = this.selected().reduce((s, i) => s + (i.size || 0), 0);
    $('.st-sel', b).textContent = n ? `محدد: ${n}${size ? ' (' + fmtSize(size) + ')' : ''}` : '';
    $('.st-perm', b).innerHTML = this.perm === 'ro' ? `${icon('lock')} قراءة فقط` : '';
  }

  // ------------------------------------------------------------ الأوامر
  action(a, btn, e) {
    const b = this.win.body;
    switch (a) {
      case 'side': this.side.classList.toggle('open'); break;
      case 'back': if (this.history.length) { this.fwd.push(this.path); this.go(this.history.pop(), { push: false }); } break;
      case 'fwd': if (this.fwd.length) { this.history.push(this.path); this.go(this.fwd.pop(), { push: false }); } break;
      case 'up': this.go(this.path.split('/').slice(0, -1).join('/')); break;
      case 'refresh': this.refresh(); break;
      case 'view':
        this.view = this.view === 'list' ? 'grid' : 'list'; localStorage.setItem('files.view', this.view);
        btn.innerHTML = icon(this.view === 'list' ? 'grid' : 'list'); this.render(); break;
      case 'upload': menuAt(btn, [
        { label: 'رفع ملفات', icon: 'file', fn: async () => this.upload((await chooseFiles()).map(f => ({ file: f, rel: f.name }))) },
        { label: 'رفع مجلد كامل', icon: 'folder', fn: async () => this.upload((await chooseFiles({ folder: true })).map(f => ({ file: f, rel: f.webkitRelativePath || f.name }))) },
      ]); break;
      case 'mkdir': this.mkdir(); break;
      case 'download': this.download(); break;
      case 'share': { const it = this.selected()[0]; if (it) shareDialog('path', this.itemPath(it), it.name); break; }
      case 'more': this.contextMenu(btn); break;
    }
  }

  contextMenu(anchor, x, y) {
    const sel = this.selected(); const one = sel.length === 1 ? sel[0] : null; const rw = this.perm === 'rw';
    const items = [
      one && { label: 'فتح', icon: one.dir ? 'folder' : 'file', fn: () => this.open(one) },
      this.searchMode && one && { label: 'فتح المجلد الحاوي', icon: 'folder', fn: () => this.go(one.parent) },
      { label: 'تنزيل', icon: 'download', fn: () => this.download() },
      one && { label: 'إنشاء رابط مشاركة', icon: 'link', fn: () => shareDialog('path', this.itemPath(one), one.name) },
      '-',
      { label: 'نسخ إلى…', icon: 'copy', fn: () => this.transfer(false) },
      { label: 'نقل إلى…', icon: 'move', fn: () => this.transfer(true), disabled: !rw },
      one && { label: 'إعادة تسمية', icon: 'edit', fn: () => this.rename(one), disabled: !rw },
      one && !one.dir && TEXT_EDITABLE.has(one.ext) && { label: 'تحرير كنص', icon: 'edit', fn: () => openTextEditor(this.itemPath(one), this) },
      { label: 'خصائص', icon: 'info', fn: () => this.properties(one) },
      '-',
      { label: this.path.includes('#recycle') || this.path.startsWith('/card-') ? 'حذف نهائي' : 'حذف', icon: 'trash', danger: true, fn: () => this.remove(), disabled: !rw },
    ].filter(Boolean);
    if (this.path.endsWith('#recycle') || this.path.includes('#recycle/')) items.push({ label: 'تفريغ سلة المحذوفات', icon: 'trash', danger: true, fn: () => this.emptyRecycle() });
    anchor ? menuAt(anchor, items) : menu(x, y, items);
  }

  open(it, idx) {
    const p = this.itemPath(it);
    if (it.dir) return this.go(p);
    const t = fileType(it.ext);
    if (t === 'image' || t === 'video' || t === 'audio') {
      const media = this.view_.filter(x => !x.dir && ['image', 'video', 'audio'].includes(fileType(x.ext)));
      const browserImg = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);
      openViewer(media, Math.max(0, media.indexOf(it)), {
        kind: x => fileType(x.ext),
        src: x => fileType(x.ext) === 'image' && !browserImg.has(x.ext) ? `/api/files/thumb?s=big&path=${encPath(this.itemPath(x))}` : `/api/files/raw?path=${encPath(this.itemPath(x))}`,
        thumb: x => THUMBABLE.has(x.ext) ? `/api/files/thumb?path=${encPath(this.itemPath(x))}` : '',
        title: x => x.name, meta: x => `${fmtSize(x.size)} · ${fmtEpoch(x.mtime)}`,
        actions: x => [{ icon: 'download', label: 'تنزيل', fn: () => download(`/api/files/raw?dl=1&path=${encPath(this.itemPath(x))}`) }],
      });
    } else if (TEXT_EDITABLE.has(it.ext)) openTextEditor(p, this);
    else if (it.ext === 'pdf') window.open(`/api/files/raw?path=${encPath(p)}`, '_blank');
    else download(`/api/files/raw?dl=1&path=${encPath(p)}`);
  }

  download() {
    const sel = this.selected(); if (!sel.length) return;
    if (sel.length === 1 && !sel[0].dir) return download(`/api/files/raw?dl=1&path=${encPath(this.itemPath(sel[0]))}`);
    download('/api/files/zip?' + sel.map(i => 'p=' + encPath(this.itemPath(i))).join('&'));
    toast('جارِ تجهيز ملف ZIP…');
  }

  async mkdir() {
    const name = await promptBox('مجلد جديد', 'اسم المجلد', 'مجلد جديد', 'إنشاء');
    if (!name) return;
    if (await guard(() => api.post('/api/files/mkdir', { path: this.path, name }))) this.refresh();
  }
  async rename(it) {
    const name = await promptBox('إعادة تسمية', 'الاسم الجديد', it.name, 'حفظ');
    if (!name || name === it.name) return;
    if (await guard(() => api.post('/api/files/rename', { path: this.itemPath(it), name }))) this.refresh();
  }
  async remove() {
    const sel = this.selected(); if (!sel.length) return;
    const perm = this.path.includes('#recycle') || this.path.startsWith('/card-');   // البطاقة بلا سلة محذوفات
    const msg = perm ? `سيتم حذف ${sel.length} عنصر نهائياً ولا يمكن استرجاعه.` : `نقل ${sel.length} عنصر إلى سلة المحذوفات؟`;
    if (!await confirmBox(msg, { ok: 'حذف', danger: true })) return;
    const r = await guard(() => api.post('/api/files/delete', { paths: sel.map(i => this.itemPath(i)) }));
    if (r) { toast(perm ? 'تم الحذف' : 'نُقلت إلى سلة المحذوفات', 'ok'); this.refresh(); }
  }
  async emptyRecycle() {
    if (!await confirmBox('حذف كل محتويات سلة المحذوفات نهائياً؟', { ok: 'تفريغ', danger: true })) return;
    if (await guard(() => api.post('/api/files/empty-recycle', { path: this.path.split('/').slice(0, this.path.startsWith('/homes') ? 3 : 2).join('/') }))) {
      toast('تم تفريغ السلة', 'ok'); this.go('/' + this.path.split('/')[1]);
    }
  }
  async transfer(move) {
    const sel = this.selected(); if (!sel.length) return;
    const dest = await pickFolder(move ? 'نقل إلى' : 'نسخ إلى', this.path);
    if (!dest) return;
    toast(move ? 'جارِ النقل…' : 'جارِ النسخ…');
    const r = await guard(() => api.post('/api/files/transfer', { paths: sel.map(i => this.itemPath(i)), dest, move }));
    if (r) { toast(`تم ${move ? 'نقل' : 'نسخ'} ${r.count} عنصر`, 'ok'); this.refresh(); }
  }
  async properties(one) {
    const p = one ? this.itemPath(one) : this.path;
    const i = await guard(() => api.get('/api/files/info?path=' + encPath(p))); if (!i) return;
    modal({ title: 'خصائص', body: `<dl class="kv">
      <dt>الاسم</dt><dd>${esc(i.name)}</dd><dt>المسار</dt><dd class="ltr">${esc(i.path)}</dd>
      <dt>الحجم</dt><dd>${fmtSize(i.size)}</dd>
      ${i.dir ? `<dt>المحتوى</dt><dd>${i.files} ملف، ${i.folders} مجلد</dd>` : ''}
      <dt>آخر تعديل</dt><dd>${fmtEpoch(i.mtime)}</dd></dl>` });
  }

  // ------------------------------------------------------------ الرفع
  upload(list) {
    if (!list.length) return;
    if (this.perm !== 'rw') return toast('لا تملك صلاحية الكتابة هنا', 'err');
    const path = this.path;
    const done = debounce(() => { if (this.path === path) this.refresh(); }, 800);
    uploads.add(list.map(({ file, rel }) => ({
      file, name: rel, url: `/api/files/upload?path=${encPath(path)}`, fields: { relpath: rel },
    })), { onDone: done, onAll: done });
  }
  bindDrop() {
    const main = $('.app-main', this.win.body); let hint = null, depth = 0;
    main.addEventListener('dragenter', e => {
      if (![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault(); depth++;
      if (!hint) { hint = h('<div class="drop-hint">أفلت الملفات هنا لرفعها</div>'); main.appendChild(hint); }
    });
    main.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    main.addEventListener('dragleave', () => { if (--depth <= 0 && hint) { hint.remove(); hint = null; depth = 0; } });
    main.addEventListener('drop', async e => {
      e.preventDefault(); depth = 0; hint && hint.remove(); hint = null;
      this.upload(await filesFromDrop(e.dataTransfer));
    });
  }
  bindKeys() {
    this.win.el.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'Delete') this.remove();
      else if (e.key === 'F2') { const s = this.selected(); s.length === 1 && this.rename(s[0]); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); this.view_.forEach((_, i) => this.sel.add(i)); this.updateSel(); }
      else if (e.key === 'Enter') { const s = this.selected(); s.length === 1 && this.open(s[0]); }
      else if (e.key === 'Backspace') this.action('up');
    });
    this.scroll.addEventListener('click', e => { if (e.target === this.scroll || e.target.classList.contains('fgrid')) { this.sel.clear(); this.updateSel(); } });
  }
}

// --------------------------------------------------------------------- محرر النصوص
registerApp({
  id: 'editor', title: 'محرر النصوص', icon: 'edit', color: 'linear-gradient(135deg,#64748b,#334155)', width: 760, height: 560, hidden: true,
  open(win, { path, owner }) {
    let dirty = false;
    win.setTitle(path.split('/').pop());
    win.body.innerHTML = `<div class="toolbar"><button class="btn primary" data-a="save">${icon('save')} حفظ</button>
      <span class="muted ltr" style="font-size:12px" translate="no"></span><span class="grow"></span><span class="st muted"></span></div>
      <textarea class="editor" spellcheck="false" dir="auto"></textarea>`;
    const ta = $('textarea', win.body); $('.ltr', win.body).textContent = path;
    guard(() => api.get('/api/files/text?path=' + encPath(path))).then(r => { if (r) ta.value = r.content; });
    ta.addEventListener('input', () => { dirty = true; $('.st', win.body).textContent = 'غير محفوظ'; });
    const save = async () => {
      if (await guard(() => api.post('/api/files/text', { path, content: ta.value }))) {
        dirty = false; $('.st', win.body).textContent = 'تم الحفظ'; toast('تم الحفظ', 'ok'); owner && owner.refresh();
      }
    };
    $('[data-a=save]', win.body).onclick = save;
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); }
    });
    const close = win.close.bind(win);
    win.close = () => { if (!dirty || confirm('توجد تغييرات غير محفوظة. إغلاق بدون حفظ؟')) close(); };
  },
});
function openTextEditor(path, owner) { openApp('editor', { key: 'editor:' + path, path, owner }); }
