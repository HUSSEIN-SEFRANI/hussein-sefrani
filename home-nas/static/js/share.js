// صفحة رابط المشاركة العامة (بدون تسجيل دخول)
import { $, h, esc, icon, api, toast, ARROW, openViewer, fmtSize, fmtEpoch, fmtDateTime, fileType, THUMBABLE, download } from './core.js';

const T = window.__TOKEN__, base = `/s/${T}`;
const body = $('#sh-body'), actions = $('#sh-actions');
const BROWSER_IMG = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);
const FOLDER = '<div class="ficon folder"><svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>';
const q = (sub) => 'sub=' + encodeURIComponent(sub);

async function start() {
  let info;
  try { info = await api.get(`${base}/api/info`); }
  catch (e) {
    if (e.status === 401) return passwordForm();
    body.innerHTML = `<div class="sh-box empty-state">${esc(e.message)}</div>`; return;
  }
  $('#sh-title').textContent = info.title;
  $('#sh-sub').textContent = `شاركه ${info.owner}` + (info.expires_at ? ` · ينتهي ${fmtDateTime(info.expires_at)}` : '');
  if (info.kind === 'album') return album();
  if (info.is_dir) return folder('');
  single(info);
}

function passwordForm() {
  $('#sh-title').textContent = 'رابط محمي';
  body.innerHTML = `<form class="sh-box pw"><p>${icon('lock')} أدخل كلمة المرور لعرض المحتوى</p>
    <input class="field" type="password" autofocus><button class="btn primary" style="width:100%;margin-top:12px">متابعة</button></form>`;
  $('form', body).onsubmit = async (e) => {
    e.preventDefault();
    try { await api.post(`${base}/auth`, { password: $('input', body).value }); start(); }
    catch (err) { toast(err.message, 'err'); }
  };
}

function single(info) {
  const ext = (info.name.split('.').pop() || '').toLowerCase(); const t = fileType(ext);
  const box = h(`<div class="sh-box one"></div>`);
  if (t === 'image') {
    const img = h(`<img class="prev" alt="">`); img.src = BROWSER_IMG.has(ext) ? `${base}/raw?${q('')}` : `${base}/thumb?s=big&${q('')}`;
    img.onclick = () => openViewer([info], 0, { kind: () => 'image', src: () => img.src, title: () => info.name });
    box.appendChild(img);
  } else if (t === 'video' || t === 'audio') {
    const m = document.createElement(t); m.src = `${base}/raw?${q('')}`; m.controls = true; m.playsInline = true;
    m.style.cssText = 'max-width:100%;max-height:60vh;border-radius:12px;margin-bottom:16px'; box.appendChild(m);
  } else box.appendChild(h(`<div class="ficon t-${t}">${esc(ext.slice(0, 4))}</div>`));
  box.appendChild(h(`<div><b></b><p class="muted">${fmtSize(info.size)}</p></div>`)); $('b', box).textContent = info.name;
  const dl = h(`<button class="btn primary">${icon('download')} تنزيل</button>`); dl.onclick = () => download(`${base}/raw?dl=1&${q('')}`);
  box.appendChild(dl); body.innerHTML = ''; body.appendChild(box);
}

async function folder(sub) {
  let res; try { res = await api.get(`${base}/api/list?${q(sub)}`); } catch (e) { return toast(e.message, 'err'); }
  actions.innerHTML = ''; const zip = h(`<button class="btn">${icon('download')} تنزيل الكل (ZIP)</button>`);
  zip.onclick = () => download(`${base}/zip?${q(sub)}`); actions.appendChild(zip);
  const box = h(`<div class="sh-box"><div class="toolbar"><div class="crumbs"></div></div><table class="flist"><tbody></tbody></table></div>`);
  const cr = $('.crumbs', box); const parts = sub.split('/').filter(Boolean);
  const root = h(`<button>${icon('home')}</button>`); root.onclick = () => folder(''); cr.appendChild(root);
  parts.forEach((p, i) => { const path = parts.slice(0, i + 1).join('/'); cr.appendChild(h(`<span class="sep">${ARROW.sep}</span>`));
    const b = h('<button translate="no"></button>'); b.textContent = p; b.onclick = () => folder(path); cr.appendChild(b); });
  const media = res.items.filter(i => !i.dir && ['image', 'video', 'audio'].includes(fileType(i.ext)));
  const path = (it) => (sub ? sub + '/' : '') + it.name;
  if (!res.items.length) box.appendChild(h('<div class="empty-state">المجلد فارغ</div>'));
  for (const it of res.items) {
    const ic = it.dir ? FOLDER : THUMBABLE.has(it.ext) ? `<div class="ficon t-${fileType(it.ext)}"><img loading="lazy" src="${base}/thumb?${q(path(it))}" onerror="this.remove()"></div>`
      : `<div class="ficon t-${fileType(it.ext)}">${esc((it.ext || '?').slice(0, 4))}</div>`;
    const tr = h(`<tr class="row"><td><div class="nm">${ic}<span></span></div></td><td class="c-size muted">${it.dir ? '' : fmtSize(it.size)}</td>
      <td class="c-date muted">${fmtEpoch(it.mtime)}</td><td class="c-more">${it.dir ? '' : `<button class="btn ghost icon sm">${icon('download')}</button>`}</td></tr>`);
    $('.nm span', tr).textContent = it.name; $('.nm span', tr).setAttribute('translate', 'no');
    tr.style.cursor = 'pointer';
    tr.onclick = (e) => {
      if (e.target.closest('button')) return download(`${base}/raw?dl=1&${q(path(it))}`);
      if (it.dir) return folder(path(it));
      const mi = media.indexOf(it);
      if (mi < 0) return download(`${base}/raw?dl=1&${q(path(it))}`);
      openViewer(media, mi, {
        kind: x => fileType(x.ext), title: x => x.name, meta: x => fmtSize(x.size),
        src: x => fileType(x.ext) === 'image' && !BROWSER_IMG.has(x.ext) ? `${base}/thumb?s=big&${q(path(x))}` : `${base}/raw?${q(path(x))}`,
        thumb: x => THUMBABLE.has(x.ext) ? `${base}/thumb?${q(path(x))}` : '',
        actions: x => [{ icon: 'download', label: 'تنزيل', fn: () => download(`${base}/raw?dl=1&${q(path(x))}`) }],
      });
    };
    $('tbody', box).appendChild(tr);
  }
  body.innerHTML = ''; body.appendChild(box);
}

async function album() {
  const res = await api.get(`${base}/api/items`);
  $('#sh-sub').textContent += ` · ${res.items.length} عنصر`;
  actions.innerHTML = ''; const zip = h(`<button class="btn">${icon('download')} تنزيل الكل (ZIP)</button>`);
  zip.onclick = () => download(`${base}/zip`); actions.appendChild(zip);
  const grid = h('<div class="ph-grid" style="--cell:170px;--cell-m:110px"></div>');
  res.items.forEach((it, i) => {
    const c = h(`<div class="ph-cell"><img loading="lazy" alt="" src="${base}/m/${it.id}/thumb">${it.is_video ? `<span class="badge-v">${icon('play')}</span>` : ''}</div>`);
    c.onclick = () => openViewer(res.items, i, {
      kind: x => x.is_video ? 'video' : 'image', src: x => `${base}/m/${x.id}/view`, thumb: x => `${base}/m/${x.id}/thumb`,
      title: x => x.name, meta: x => fmtDateTime(x.taken_at),
      actions: x => [{ icon: 'download', label: 'تنزيل', fn: () => download(`${base}/m/${x.id}/download`) }],
    });
    grid.appendChild(c);
  });
  body.innerHTML = ''; body.appendChild(res.items.length ? grid : h('<div class="sh-box empty-state">الألبوم فارغ</div>'));
}

start();
