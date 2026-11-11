// ====================================================================
// لوحة التحكم ← وضع التلفاز: الملفات (المستخدمون على التلفاز)، المربعات، الإعدادات، والشاشة الموصولة
// ====================================================================
import { $, $$, h, esc, icon, api, guard, toast, modal, confirmBox, openApp, pickFolder } from '../core.js';
import * as A from '../tv-art.js';

const ROLE_LABEL = { none: 'لا يظهر على التلفاز', adult: 'بالغ', kid: 'طفل', little: 'طفل صغير (أقل من 6 سنوات)' };
const KIND_LABEL = { media: 'وسائط (فيديو، صوت، صور، كتب)', games: 'ألعاب', photos: 'مكتبة صوري' };

const tileIcon = (t, size = 40) => `<span class="tv-ic" style="width:${size}px;height:${size}px;background:${A.gradient(t.color)}">${A.icon(t.icon)}</span>`;
const adminPath = (u, p) => (p && (p === '/home' || p.startsWith('/home/')) ? `/homes/${u.username}${p.slice(5)}` : p);
const ageLine = (u) => (u.age != null ? `العمر ${u.age} · عيد الميلاد بعد ${u.birthday_in} يوماً` : '');

export async function tvSection(sc, section) {
  const d = await guard(() => api.get('/api/admin/tv')); if (!d) return;
  const reload = () => { sc.innerHTML = ''; tvSection(sc, section); };
  const p = section(sc, 'وضع التلفاز',
    'واجهة ملونة تظهر على الشاشة أو التلفاز الموصول بالسيرفر (HDMI)، تُدار بالكامل من هنا. الكمبيوتر والهاتف يبقيان على الواجهة العادية. '
    + 'لكل شخص «ملف» على التلفاز، ولكل ملف «مربعات»، وكل مربع مرتبط بمجلد في ملفاته: ما تضعه في المجلد يظهر على التلفاز.',
    `<a class="btn primary" href="/tv" target="_blank" rel="noopener">${icon('external')} معاينة واجهة التلفاز</a>`);

  p.appendChild(kioskCard(d, reload));
  p.appendChild(h('<h3 class="tv-h">الأشخاص على التلفاز</h3>'));
  for (const u of d.users) p.appendChild(userCard(u, d, reload));
  p.appendChild(h('<h3 class="tv-h">الشاشة والمواقيت</h3>'));
  p.appendChild(settingsCard(d, reload));
}

// --------------------------------------------------------------------- الشاشة الموصولة (kiosk)
function kioskCard(d, reload) {
  if (!d.available) {
    return h(`<div class="card">${icon('info')} على جهاز HOME ANAB المخصص (المثبّت من ملف ISO) تظهر هذه الواجهة تلقائياً على الشاشة الموصولة بالسيرفر.
      يمكنك الآن معاينتها من زر «معاينة» أعلاه (تحكّم بالأسهم و Enter و Esc).</div>`);
  }
  const k = d.kiosk || {};
  const state = k.installing ? '<span class="badge accent">جارٍ التثبيت…</span>'
    : !k.installed ? '<span class="badge">غير مثبّت</span>'
    : k.active ? '<span class="badge ok">يعمل على الشاشة</span>' : k.enabled ? '<span class="badge warn">مفعّل لكنه متوقف</span>' : '<span class="badge">متوقف</span>';
  const c = h(`<div class="card"><h4>${icon('video')} الشاشة الموصولة بالسيرفر ${state}</h4>
    ${k.error ? `<p class="alert err small" translate="no">${esc(k.error)}</p>` : ''}
    ${!k.installed && !k.installing ? `<p>اضغط «تثبيت» مرة واحدة (يحتاج إنترنت، حوالي 300 ميغابايت). بعدها تظهر شاشة «من يشاهد الآن؟» عند تشغيل السيرفر بدل الشاشة السوداء.</p>
      <button class="btn primary" data-k="setup">${icon('download')} تثبيت وضع التلفاز</button>` : ''}
    ${k.installing ? '<p class="muted">قد يستغرق التثبيت بضع دقائق. ستتحدث الصفحة تلقائياً.</p>' : ''}
    ${k.installed && !k.installing ? `<p class="muted">يمكنك التحكم بالواجهة بريموت لاسلكي (Air Mouse) أو لوحة مفاتيح: الأسهم، موافق (Enter)، رجوع (Esc).</p>
      ${k.enabled ? `<button class="btn" data-k="restart">${icon('refresh')} إعادة تشغيل الشاشة</button> <button class="btn" data-k="disable">إيقاف العرض على الشاشة</button>`
        : `<button class="btn primary" data-k="enable">${icon('play')} تشغيل العرض على الشاشة</button>`}` : ''}</div>`);
  $$('[data-k]', c).forEach(b => b.onclick = async () => {
    b.disabled = true;
    if (await guard(() => api.post('/api/admin/tv/kiosk', { action: b.dataset.k }))) { toast('تم', 'ok'); setTimeout(reload, 1500); }
    b.disabled = false;
  });
  if (k.installing) setTimeout(() => { if (document.body.contains(c)) reload(); }, 5000);
  if (k.installed && k.active) { c.appendChild(displayBox()); c.appendChild(audioBox()); }
  return c;
}

function displayBox() {
  const box = h(`<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px"><h4 style="margin-top:0">${icon('video')} دقة الشاشة</h4>
    <div class="db muted small">جارٍ القراءة…</div></div>`);
  const db = $('.db', box);
  api.get('/api/admin/tv/display').then((r) => {
    if (r.error) { db.textContent = 'تعذرت قراءة الشاشة.'; return; }
    db.classList.remove('muted', 'small');
    const opts = (r.modes || []).map(m => `<option ${m === r.saved ? 'selected' : ''}>${m}</option>`).join('');
    db.innerHTML = `<select class="field" style="max-width:240px" dir="ltr"><option value="">تلقائي (أفضل دقة للتلفاز)</option>${opts}</select>
      <button class="btn sm" data-a="set">تطبيق</button>
      <p class="muted small">الحالية: <span class="ltr">${esc(r.current || '—')}</span>. ${r.available ? '' : 'اختيار الدقة يثبّت أداة صغيرة (يحتاج إنترنت مرة واحدة).'}
      للفيديو الأنعم على تلفاز 4K اختر <span class="ltr">1920x1080</span>.</p>`;
    $('[data-a=set]', db).onclick = async () => {
      if (await guard(() => api.post('/api/admin/tv/display', { mode: $('select', db).value }))) toast('تم — تُعاد تشغيل الشاشة', 'ok');
    };
  }).catch(e => { db.textContent = e.message; });
  return box;
}

function audioBox() {
  const box = h(`<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px"><h4 style="margin-top:0">${icon('audio')} صوت الشاشة</h4>
    <div class="ab muted small">جارٍ قراءة مخارج الصوت…</div></div>`);
  const ab = $('.ab', box);
  (async () => {
    const r = await api.get('/api/admin/tv/audio').catch(e => ({ error: e.message }));
    if (r.error) { ab.innerHTML = `<span class="muted">تعذرت قراءة مخارج الصوت.</span> <span class="small" translate="no">${esc(r.error)}</span>`; return; }
    ab.classList.remove('muted', 'small');
    ab.innerHTML = `<label class="lbl" style="margin-top:0">مخرج الصوت</label>
      <select class="field" style="max-width:420px"><option value="auto" ${r.auto ? 'selected' : ''}>تلقائي: HDMI الموصول بالتلفاز (موصى به)</option>${r.outputs.map((o, i) => `<option value="${i}" ${!r.auto && o.active ? 'selected' : ''}>${esc(o.name)}${o.plugged ? ' — موصول' : ''}</option>`).join('')}</select>
      <p class="muted small">لصوت التلفاز اختر المخرج الذي فيه <b translate="no">HDMI</b> أو <b translate="no">DisplayPort</b>. المستوى الحالي: <span translate="no">${r.volume ?? '—'}%</span>${r.muted ? ' (صامت)' : ''}</p>
      <button class="btn primary sm" data-a="set">تطبيق</button> <button class="btn sm" data-a="test">${icon('play')} تجربة الصوت</button>`;
    $('[data-a=set]', ab).onclick = async () => {
      const v = $('select', ab).value, o = r.outputs[+v];
      if (v !== 'auto' && !o) return;
      if (await guard(() => api.post('/api/admin/tv/audio', v === 'auto' ? { action: 'auto' } : { card: o.card, profile: o.profile }))) toast('تم — جرّب الصوت الآن', 'ok');
    };
    $('[data-a=test]', ab).onclick = async () => { if (await guard(() => api.post('/api/admin/tv/audio', { action: 'test' }))) toast('يجب أن تسمع ثلاث نغمات من التلفاز', 'ok'); };
  })();
  return box;
}

// --------------------------------------------------------------------- ملف الشخص + مربعاته
function userCard(u, d, reload) {
  const c = h(`<div class="card tv-user ${u.tv_role === 'none' ? 'off' : ''}">
    <div class="tv-uh"><button class="tv-ava" title="تغيير الصورة">${u.photo_v ? `<img src="/api/users/${u.id}/photo?v=${u.photo_v}" alt="" style="width:100%;height:100%;object-fit:cover">` : A.avatar(u.avatar)}</button>
      <div class="tv-uf">
        <div class="tv-row"><label>الاسم على التلفاز<input class="field" name="display_name" placeholder="${esc(u.username)}"></label>
          <label>النوع<select class="field" name="tv_role">${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}" ${u.tv_role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="bd">تاريخ الميلاد<input class="field" type="date" name="birthdate"></label>
          <label class="pin">رمز الدخول (4-8 أرقام)<input class="field" name="pin" inputmode="numeric" autocomplete="off" placeholder="${u.has_pin ? '•••• (محفوظ)' : 'بدون رمز'}"></label></div>
        <div class="muted small tv-note"></div>
        <div style="margin-top:8px"><button class="btn primary sm" data-x="save">حفظ</button>
          ${u.has_pin ? '<button class="btn sm" data-x="nopin">إزالة الرمز</button>' : ''}
          <span class="muted small" translate="no">${esc(u.username)}</span></div></div></div>
    <div class="tv-tiles"></div></div>`);
  $('[name=display_name]', c).value = u.display_name;
  $('[name=birthdate]', c).value = u.birthdate;
  let avatar = u.avatar;
  const role = $('[name=tv_role]', c);
  const syncRole = () => {
    const r = role.value;
    $('.bd', c).style.display = r === 'kid' || r === 'little' ? '' : 'none';
    $('.pin', c).style.display = r === 'none' ? 'none' : '';
    $('.tv-note', c).textContent = r === 'adult' ? 'رمز البالغين يُستخدم أيضاً كـ«رمز ماما أو بابا» للخروج من حسابات الأطفال.'
      : r === 'kid' || r === 'little' ? `يرى فقط مربعاته، والخروج منها يحتاج رمز أحد البالغين. ${ageLine(u)}` : '';
  };
  role.onchange = syncRole; syncRole();
  $('.tv-ava', c).onclick = async () => {
    const grid = h(`<div><div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
        <button class="btn primary sm" data-p="up">${icon('upload')} رفع صورة حقيقية</button>
        ${u.photo_v ? `<button class="btn sm" data-p="del">إزالة الصورة الحقيقية</button>` : ''}
        <span class="muted small">أو اختر رسماً:</span><input type="file" accept="image/*" class="hidden"></div>
      <div class="tv-avas">${Array.from({ length: A.AVATAR_COUNT }, (_, i) => `<button data-i="${i}" class="${i === avatar ? 'on' : ''}" title="${A.avatarLabels[i]}">${A.avatar(i)}</button>`).join('')}</div></div>`);
    const fin = $('input[type=file]', grid);
    $('[data-p=up]', grid).onclick = () => fin.click();
    fin.onchange = async () => {
      const f = fin.files[0]; if (!f) return;
      const fd = new FormData(); fd.append('image', f);
      try {
        const res = await fetch(`/api/admin/users/${u.id}/photo`, { method: 'POST', body: fd, credentials: 'same-origin' });
        const r = await res.json(); if (!res.ok) throw new Error(r.error || res.status);
        toast('تم رفع الصورة', 'ok'); $('.modal-back')?.remove(); reload();
      } catch (e) { toast(e.message, 'err'); }
    };
    const pd = $('[data-p=del]', grid);
    if (pd) pd.onclick = async () => { if (await guard(() => api.del(`/api/admin/users/${u.id}/photo`))) { $('.modal-back')?.remove(); reload(); } };
    const pick = await modal({ title: 'اختر صورة', body: grid, buttons: [{ label: 'إلغاء', value: null }],
      onOpen: (back) => $$('button[data-i]', back).forEach(b => b.onclick = () => { avatar = +b.dataset.i; $('.tv-ava', c).innerHTML = A.avatar(avatar); $('.modal .btn', back)?.click(); }) });
    void pick;
  };
  const save = async (extra = {}) => {
    const data = { display_name: $('[name=display_name]', c).value, tv_role: role.value, birthdate: $('[name=birthdate]', c).value, avatar, ...extra };
    const pin = $('[name=pin]', c).value.trim();
    if (pin && !('pin' in extra)) data.pin = pin;
    if (await guard(() => api.patch(`/api/admin/tv/users/${u.id}`, data))) {
      if (data.tv_role !== 'none' && !u.tiles.length && data.tv_role !== u.tv_role) {
        await guard(() => api.post(`/api/admin/tv/users/${u.id}/defaults`, { role: data.tv_role }));
        toast('تم الحفظ وإضافة المربعات الأساسية ومجلداتها', 'ok');
      } else toast('تم الحفظ', 'ok');
      reload();
    }
  };
  $('[data-x=save]', c).onclick = () => save();
  const np = $('[data-x=nopin]', c);
  if (np) np.onclick = async () => { if (await confirmBox('إزالة رمز الدخول لهذا الشخص؟')) save({ pin: '' }); };

  const tl = $('.tv-tiles', c);
  if (u.tv_role === 'none') {
    tl.innerHTML = '<p class="muted small" style="margin:0">اختر النوع (بالغ أو طفل) ثم «حفظ» ليظهر على التلفاز.</p>';
    return c;
  }
  for (const [i, t] of u.tiles.entries()) {
    const row = h(`<div class="tv-tile ${t.enabled ? '' : 'off'}">${tileIcon(t)}
      <div class="tv-tt"><b></b><div class="muted small">${KIND_LABEL[t.kind] || t.kind}${t.kind !== 'photos' && t.path ? ` · <a href="#" class="tv-path" translate="no"></a>` : ''}</div></div>
      <button class="btn ghost icon sm" data-t="up" title="تقديم" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
      <button class="btn ghost icon sm" data-t="down" title="تأخير" ${i === u.tiles.length - 1 ? 'disabled' : ''}><span style="display:inline-flex;transform:rotate(180deg)">${icon('up')}</span></button>
      <label class="check sm" title="إظهار على التلفاز"><input type="checkbox" ${t.enabled ? 'checked' : ''}> ظاهر</label>
      <button class="btn ghost icon sm" data-t="edit" title="تعديل">${icon('edit')}</button>
      <button class="btn ghost icon sm danger" data-t="del" title="حذف">${icon('trash')}</button></div>`);
    $('b', row).textContent = t.title;
    const pa = $('.tv-path', row);
    if (pa) {
      pa.textContent = adminPath(u, t.path);
      pa.onclick = (e) => { e.preventDefault(); openApp('files', { path: adminPath(u, t.path) }); };
    }
    $('[data-t=up]', row).onclick = async () => { if (await guard(() => api.patch(`/api/admin/tv/tiles/${t.id}`, { move: -1 }))) reload(); };
    $('[data-t=down]', row).onclick = async () => { if (await guard(() => api.patch(`/api/admin/tv/tiles/${t.id}`, { move: 1 }))) reload(); };
    $('input', row).onchange = async (e) => { if (await guard(() => api.patch(`/api/admin/tv/tiles/${t.id}`, { enabled: e.target.checked }))) row.classList.toggle('off', !e.target.checked); };
    $('[data-t=edit]', row).onclick = () => editTile(u, t, d, reload);
    $('[data-t=del]', row).onclick = async () => {
      if (await confirmBox(`حذف المربع «${t.title}» من تلفاز ${u.display_name || u.username}؟ الملفات نفسها لا تُحذف وتبقى في مجلدها.`, { ok: 'حذف', danger: true })
        && await guard(() => api.del(`/api/admin/tv/tiles/${t.id}`))) reload();
    };
    tl.appendChild(row);
  }
  const acts = h(`<div class="tv-acts"><button class="btn sm" data-a="add">${icon('plus')} إضافة مربع</button>
    <button class="btn ghost sm" data-a="def">إضافة المربعات الأساسية الناقصة</button></div>`);
  $('[data-a=add]', acts).onclick = () => editTile(u, null, d, reload);
  $('[data-a=def]', acts).onclick = async () => {
    const r = await guard(() => api.post(`/api/admin/tv/users/${u.id}/defaults`, {}));
    if (r) { toast(r.added ? `أُضيف ${r.added} مربع` : 'كل المربعات الأساسية موجودة', 'ok'); reload(); }
  };
  if (!u.tiles.length) tl.appendChild(h('<p class="muted small" style="margin:0 0 8px">لا توجد مربعات بعد.</p>'));
  tl.appendChild(acts);
  return c;
}

// --------------------------------------------------------------------- محرر المربع
async function editTile(u, t, d, reload) {
  const cur = t ? { ...t } : { title: '', kind: 'media', icon: 'star', color: d.colors[u.tiles.length % d.colors.length], path: '' };
  let folder = t ? adminPath(u, t.path) || '' : '';
  const body = h(`<div class="tv-edit">
    <div class="tv-prev"></div>
    <label class="lbl">اسم المربع</label><input class="field" name="title" placeholder="مثال: رسوم متحركة">
    <label class="lbl">النوع</label><select class="field" name="kind">${Object.entries(KIND_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <div class="kindhelp muted small"></div>
    <label class="lbl">الرسم</label><div class="tv-icons">${d.icons.map(n => `<button type="button" data-i="${n}">${A.icon(n)}</button>`).join('')}</div>
    <label class="lbl">اللون</label><div class="tv-colors">${d.colors.map(cl => `<button type="button" data-c="${cl}" style="background:${A.gradient(cl)}"></button>`).join('')}</div>
    <div class="fold"><label class="lbl">المجلد المرتبط</label>
      <div class="tv-fold"><span class="fp muted" translate="no"></span>
        <button type="button" class="btn sm" data-f="pick">${icon('folder')} اختيار مجلد</button>
        <button type="button" class="btn ghost sm" data-f="auto">تلقائي</button></div>
      <div class="muted small">«تلقائي»: يُنشأ مجلد باسم المربع داخل <span translate="no">${esc(u.username)}/التلفاز</span>. يمكنك أيضاً اختيار مجلد موجود أو مجلد مشترك (مثل الأفلام) يملك الشخص صلاحية عليه.</div></div></div>`);
  const $b = (s) => $(s, body);
  $b('[name=title]').value = cur.title;
  $b('[name=kind]').value = cur.kind;
  const draw = () => {
    cur.title = $b('[name=title]').value; cur.kind = $b('[name=kind]').value;
    $b('.tv-prev').innerHTML = `${tileIcon(cur, 64)}<b>${esc(cur.title || 'مربع جديد')}</b>`;
    $$('.tv-icons button', body).forEach(b => b.classList.toggle('on', b.dataset.i === cur.icon));
    $$('.tv-colors button', body).forEach(b => b.classList.toggle('on', b.dataset.c === cur.color));
    $b('.fold').style.display = cur.kind === 'photos' ? 'none' : '';
    $b('.fp').textContent = folder || (t ? '' : `${u.username}/التلفاز/${cur.title || '…'} (جديد)`);
    $b('.kindhelp').textContent = cur.kind === 'games' ? 'ضع كل لعبة في مجلد خاص بها داخل مجلد المربع (فيه index.html)، ويمكن إضافة صورة cover.jpg لتظهر كغلاف.'
      : cur.kind === 'photos' ? 'يعرض صور الشخص وفيديوهاته من تطبيق «الصور» (المرفوعة من الهاتف) مع عرض الشرائح.'
      : 'يعرض الفيديو (mp4) والصوت (mp3) والصور وملفات PDF (مثل المصحف أو القصص) والمجلدات الفرعية.';
  };
  $b('[name=title]').oninput = draw;
  $b('[name=kind]').onchange = () => { if (cur.kind !== $b('[name=kind]').value && ['star', 'photos', 'games'].includes(cur.icon)) cur.icon = { photos: 'photos', games: 'games' }[$b('[name=kind]').value] || 'star'; draw(); };
  $$('.tv-icons button', body).forEach(b => b.onclick = () => { cur.icon = b.dataset.i; draw(); });
  $$('.tv-colors button', body).forEach(b => b.onclick = () => { cur.color = b.dataset.c; draw(); });
  $b('[data-f=pick]').onclick = async () => {
    const f = await pickFolder('اختر المجلد المرتبط بالمربع', folder || `/homes/${u.username}`);
    if (f) { folder = f; draw(); }
  };
  $b('[data-f=auto]').onclick = () => { folder = ''; draw(); };
  draw();
  const ok = await modal({ title: t ? `تعديل «${t.title}»` : `مربع جديد لـ ${u.display_name || u.username}`, body, wide: true,
    buttons: [{ label: 'إلغاء', value: null }, { label: 'حفظ', cls: 'primary', value: true, validate: async () => {
      draw();
      if (!cur.title.trim()) { toast('اكتب اسماً للمربع', 'err'); return false; }
      const data = { title: cur.title.trim(), icon: cur.icon, color: cur.color };
      if (t) {
        if (cur.kind === t.kind) {
          if (cur.kind !== 'photos' && folder !== (adminPath(u, t.path) || '')) data.path = folder;
          return !!await guard(() => api.patch(`/api/admin/tv/tiles/${t.id}`, data));
        }
        // تغيير النوع = مربع جديد مكان القديم
        const r = await guard(() => api.post(`/api/admin/tv/users/${u.id}/tiles`, { ...data, kind: cur.kind, path: folder }));
        if (!r) return false;
        await guard(() => api.del(`/api/admin/tv/tiles/${t.id}`));
        return true;
      }
      return !!await guard(() => api.post(`/api/admin/tv/users/${u.id}/tiles`, { ...data, kind: cur.kind, path: folder }));
    } }] });
  if (ok) { toast('تم الحفظ', 'ok'); reload(); }
}

// --------------------------------------------------------------------- الإعدادات العامة
function settingsCard(d, reload) {
  const s = d.settings;
  const [nf, nt] = (s.night_off || '').split('-');
  const c = h(`<div class="card">
    <div class="tv-grid">
      <label>خلفية شاشة البالغين<select class="field" name="wallpaper">
        <option value="animated">سماء متحركة</option><option value="photos">صوري المفضلة (تتبدل)</option><option value="dark">ليلي هادئ</option></select></label>
      <label>شاشة التوقف بعد (دقيقة، 0 = أبداً)<input class="field" type="number" min="0" max="240" name="saver_min"></label>
      <label>إطفاء الشاشة ليلاً من<input class="field" type="time" name="night_from"></label>
      <label>إلى<input class="field" type="time" name="night_to"></label>
      <label>حجم الواجهة على الشاشة (%)<input class="field" type="number" min="70" max="130" step="5" name="zoom"></label>
      <label>هامش حول الواجهة (% إن كان التلفاز يقص الأطراف)<input class="field" type="number" min="0" max="8" name="margin"></label>
    </div>
    <label class="check"><input type="checkbox" name="nosleep"> منع الشاشة من الانطفاء أثناء الاستخدام</label>
    <h4 style="margin-top:16px">${icon('clock')} مواقيت الصلاة</h4>
    <label class="check"><input type="checkbox" name="prayer"> عرض مواقيت الصلاة على شاشة البالغين</label>
    <div class="tv-grid">
      <label>المدينة<select class="field" name="city"><option value="">— إحداثيات يدوية —</option>${d.cities.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>
      <label class="ll">خط العرض<input class="field" name="lat" dir="ltr" placeholder="36.20"></label>
      <label class="ll">خط الطول<input class="field" name="lon" dir="ltr" placeholder="37.13"></label>
      <label>طريقة الحساب<select class="field" name="method">${d.methods.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>
    </div>
    <label class="check"><input type="checkbox" name="hanafi"> العصر حسب المذهب الحنفي</label>
    <label style="display:block;margin-top:10px">مصدر المواقيت<select class="field" name="source" style="max-width:420px">
      <option value="calc">الحساب حسب المدينة (بدون إنترنت)</option><option value="mawaqit">جدول مسجدي من Mawaqit</option></select></label>
    <div class="tv-mq" style="margin-top:8px;padding:10px 12px;border:1px solid var(--border);border-radius:10px">
      <div class="mq-st small"></div>
      <label class="lbl">رابط صفحة المسجد على Mawaqit</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input class="field" name="mq_url" dir="ltr" placeholder="https://mawaqit.net/fr/..." style="flex:1;min-width:240px">
        <button class="btn sm" data-x="mq_fetch">${icon('download')} تحميل جدول السنة</button></div>
      <p class="muted small" style="margin:8px 0 4px">بدون إنترنت على السيرفر: افتح صفحة المسجد على الكمبيوتر، احفظها بـ <b translate="no">Ctrl+S</b> (صفحة ويب، HTML)، ثم ارفع الملف هنا:</p>
      <input type="file" name="mq_file" accept=".html,.htm,text/html"> <button class="btn sm ghost" data-x="mq_del">حذف الجدول</button>
    </div>
    <label class="lbl" style="margin-top:10px">تعديل بالدقائق لتطابق مسجدك (+ تأخير، − تقديم)</label>
    <div class="tv-off" style="display:flex;gap:8px;flex-wrap:wrap">${[['fajr', 'الفجر'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']].map(([k, n]) =>
      `<label style="width:90px">${n}<input class="field" type="number" min="-60" max="60" name="off_${k}" dir="ltr"></label>`).join('')}</div>
    <div class="muted small tv-today"></div>
    <h4 style="margin-top:16px">${icon('audio')} الأذان على التلفاز</h4>
    <label class="check"><input type="checkbox" name="ad_on"> تشغيل الأذان على التلفاز عند دخول وقت الصلاة</label>
    <div class="tv-ad">
      <div style="display:flex;gap:14px;flex-wrap:wrap">${[['fajr', 'الفجر'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']].map(([k, n]) =>
        `<label class="check" style="margin:0"><input type="checkbox" name="ad_${k}"> ${n}</label>`).join('')}</div>
      <div class="tv-grid" style="margin-top:8px">
        <label>مستوى صوت الأذان (%)<input class="field" type="number" min="10" max="100" step="10" name="ad_volume"></label>
        <label>تنبيه قبل الصلاة بـ (دقيقة، 0 = بدون)<input class="field" type="number" min="0" max="60" name="ad_remind"></label>
      </div>
      <label class="check"><input type="checkbox" name="ad_pause"> إيقاف الفيديو والأناشيد مؤقتاً أثناء الأذان</label>
      <div class="ad-files small" style="margin-top:6px"></div>
    </div>
    <h4 style="margin-top:16px">${icon('book')} كلمة اليوم</h4>
    <label class="check" style="display:inline-flex;margin-inline-end:16px"><input type="checkbox" name="w_fr"> الفرنسية</label>
    <label class="check" style="display:inline-flex"><input type="checkbox" name="w_en"> الإنجليزية</label>
    <p class="muted small" style="margin:6px 0 0">تتغيّر الكلمة مع كل تسجيل دخول، وتظهر في صفحة كل شخص.</p>
    <h4 style="margin-top:16px">${icon('book')} نص اليوم في صفحة كل شخص</h4>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <label class="check" style="margin:0"><input type="checkbox" name="dk_hadith"> حديث نبوي ﷺ (من الصحيحين)</label>
      <label class="check" style="margin:0"><input type="checkbox" name="dk_proverb"> مثل شعبي</label>
      <label class="check" style="margin:0"><input type="checkbox" name="dk_wisdom"> حكمة / جملة جميلة</label></div>
    <p class="muted small" style="margin:4px 0 6px">يتناوب النوع المختار مع كل دخول. ألغِ الكل لإخفاء البطاقة.</p>
    <button class="btn sm" data-x="hlist">${icon('book')} مراجعة النصوص</button>
    <h4 style="margin-top:16px">☀️ درجة الحرارة</h4>
    <label class="check"><input type="checkbox" name="weather"> عرض الطقس لمدينة المواقيت تحت الساعة (من Open-Meteo، بلا حساب)</label>
    <div style="margin-top:14px"><button class="btn primary" data-x="save">حفظ</button></div></div>`);
  const f = (n) => $(`[name=${n}]`, c);
  f('wallpaper').value = s.wallpaper; f('saver_min').value = s.saver_min; f('nosleep').checked = s.nosleep;
  f('zoom').value = s.zoom || 100; f('margin').value = s.margin || 0;
  f('night_from').value = nf || ''; f('night_to').value = nt || '';
  f('prayer').checked = s.prayer; f('city').value = s.city || ''; f('lat').value = s.lat || ''; f('lon').value = s.lon || '';
  f('method').value = s.method; f('hanafi').checked = s.hanafi;
  f('source').value = s.source || 'calc';
  for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) { f('off_' + k).value = (s.offsets || {})[k] || 0; f('ad_' + k).checked = (s.adhan.prayers || []).includes(k); }
  f('ad_on').checked = !!s.adhan.on; f('ad_volume').value = s.adhan.volume || 80; f('ad_remind').value = s.adhan.remind || 0; f('ad_pause').checked = s.adhan.pause !== false;
  const mqStatus = (m) => {
    $('.mq-st', c).innerHTML = m ? `<span class="badge ok">✓</span> <b>${esc(m.name || '')}</b> · <span translate="no">${m.days}</span> يوماً من سنة <span translate="no">${m.year}</span>`
      + (m.jumua ? ` · الجمعة <span translate="no">${esc(m.jumua)}</span>` : '') + ` <span class="muted">(حُمّل <span translate="no">${esc((m.fetched || '').replace('T', ' '))}</span>)</span>` : '<span class="muted">لم يُحمّل جدول بعد.</span>';
    if (m && m.url) f('mq_url').value = m.url;
  };
  mqStatus(d.mawaqit);
  const syncSrc = () => { $('.tv-mq', c).style.display = f('source').value === 'mawaqit' ? '' : 'none'; };
  f('source').onchange = syncSrc; syncSrc();
  const syncAd = () => { $('.tv-ad', c).style.display = f('ad_on').checked ? '' : 'none'; };
  f('ad_on').onchange = syncAd; syncAd();
  $('[data-x=mq_fetch]', c).onclick = async () => {
    const url = f('mq_url').value.trim(); if (!url) { toast('ضع رابط صفحة المسجد', 'err'); return; }
    toast('جارٍ التحميل…');
    const r = await guard(() => api.post('/api/admin/tv/mawaqit', { url }));
    if (r) { mqStatus(r.mawaqit); toast('تم: مواقيت المسجد للسنة كاملة', 'ok'); reload(); }
  };
  f('mq_file').onchange = async () => {
    const file = f('mq_file').files[0]; if (!file) return;
    const fd = new FormData(); fd.append('page', file); fd.append('url', f('mq_url').value.trim());
    try {
      const res = await fetch('/api/admin/tv/mawaqit', { method: 'POST', body: fd }); const r = await res.json();
      if (!res.ok) throw new Error(r.error || res.status);
      mqStatus(r.mawaqit); toast('تم: مواقيت المسجد للسنة كاملة', 'ok'); reload();
    } catch (e) { toast(e.message, 'err'); }
  };
  $('[data-x=mq_del]', c).onclick = async () => { if (await guard(() => api.del('/api/admin/tv/mawaqit'))) { toast('تم الحذف', 'ok'); reload(); } };
  const adFiles = (files) => {
    const row = (w, label) => `<div style="margin:4px 0">${label}: ${files[w] ? `<span class="badge ok">موجود</span> <button class="btn sm ghost" data-ad-play="${w}">▶ استماع</button> <button class="btn sm ghost" data-ad-del="${w}">حذف</button>`
      : '<span class="muted">لا يوجد — تُستعمل نغمة تنبيه هادئة</span>'} <label class="btn sm" style="cursor:pointer">${icon('upload')} رفع ملف MP3<input type="file" accept=".mp3,.m4a,.ogg,.wav,audio/*" data-ad-up="${w}" hidden></label></div>`;
    const box = $('.ad-files', c);
    box.innerHTML = row('main', 'صوت الأذان') + row('fajr', 'أذان الفجر (اختياري)');
    let au = null;
    box.querySelectorAll('[data-ad-play]').forEach((b) => (b.onclick = () => { au?.pause(); au = new Audio(`/api/tv/adhan/${b.dataset.adPlay}?t=${Date.now()}`); au.play(); }));
    box.querySelectorAll('[data-ad-del]').forEach((b) => (b.onclick = async () => { const r = await guard(() => api.del(`/api/admin/tv/adhan/${b.dataset.adDel}`)); if (r) adFiles(r.files); }));
    box.querySelectorAll('[data-ad-up]').forEach((inp) => (inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const fd = new FormData(); fd.append('file', file);
      try {
        const res = await fetch(`/api/admin/tv/adhan/${inp.dataset.adUp}`, { method: 'POST', body: fd }); const r = await res.json();
        if (!res.ok) throw new Error(r.error || res.status);
        toast('تم رفع ملف الأذان', 'ok'); adFiles(r.files);
      } catch (e) { toast(e.message, 'err'); }
    }));
  };
  adFiles(d.adhan_files || {});
  f('w_fr').checked = s.words.includes('fr'); f('w_en').checked = s.words.includes('en');
  for (const k of ['hadith', 'proverb', 'wisdom']) f('dk_' + k).checked = (s.daily_kinds || []).includes(k);
  f('weather').checked = s.weather !== false;
  $('[data-x=hlist]', c).onclick = async () => {
    const r = await guard(() => api.get('/api/admin/welcome/hadith')); if (!r) return;
    modal({ title: `نصوص اليوم — كلمات: ${r.words}`, wide: true, body: h(`<div style="max-height:60vh;overflow:auto">
      <h4>🕌 الأحاديث (${r.hadith.length})</h4>
      <p class="muted small">كل نص هنا موجود بلفظه في صحيح البخاري أو صحيح مسلم (تحقّقنا منه آلياً). ⭐ = يظهر للأطفال، ومعه شرح بسيط من كلامنا.</p>
      <ol style="line-height:1.9">${r.hadith.map((x) => `<li><b>«${esc(x.text)}»</b> <span class="muted">— ${esc(x.source)}</span> ${x.kids ? '⭐' : ''}${x.explain ? `<div class="small muted">💡 ${esc(x.explain)}</div>` : ''}</li>`).join('')}</ol>
      <h4>📜 الأمثال الشعبية (${(r.proverbs || []).length})</h4>
      <ol style="line-height:1.9">${(r.proverbs || []).map((x) => `<li><b>${esc(x.text)}</b>${x.explain ? `<div class="small muted">💡 ${esc(x.explain)}</div>` : ''}</li>`).join('')}</ol>
      <h4>💡 الحِكم (${(r.wisdom || []).length})</h4>
      <ol style="line-height:1.9">${(r.wisdom || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`) });
  };
  const syncCity = () => $$('.ll', c).forEach(l => { l.style.display = f('city').value ? 'none' : ''; });
  f('city').onchange = syncCity; syncCity();
  if (d.prayer && d.prayer.times) {
    $('.tv-today', c).textContent = (d.prayer.source === 'mawaqit' ? `اليوم (${d.prayer.city || 'المسجد'}): ` : 'اليوم: ') + d.prayer.times.map(t => `${t.name} ${t.time}`).join(' · ');
  }
  $('[data-x=save]', c).onclick = async () => {
    const nightFrom = f('night_from').value, nightTo = f('night_to').value;
    const data = {
      wallpaper: f('wallpaper').value, saver_min: +f('saver_min').value || 0, nosleep: f('nosleep').checked,
      zoom: +f('zoom').value || 100, margin: +f('margin').value || 0,
      night_off: nightFrom && nightTo ? `${nightFrom}-${nightTo}` : '',
      prayer: f('prayer').checked, city: f('city').value, method: f('method').value, hanafi: f('hanafi').checked,
      words: ['ar', ...(f('w_fr').checked ? ['fr'] : []), ...(f('w_en').checked ? ['en'] : [])],
      daily_kinds: ['hadith', 'proverb', 'wisdom'].filter((k) => f('dk_' + k).checked), weather: f('weather').checked,
      source: f('source').value,
      offsets: Object.fromEntries(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((k) => [k, +f('off_' + k).value || 0])),
      adhan: { on: f('ad_on').checked, volume: +f('ad_volume').value || 80, remind: +f('ad_remind').value || 0, pause: f('ad_pause').checked,
        prayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((k) => f('ad_' + k).checked) },
    };
    if (!data.city) { data.lat = f('lat').value; data.lon = f('lon').value; }
    if (await guard(() => api.post('/api/admin/tv/settings', data))) { toast('تم الحفظ — يتحدث التلفاز خلال دقائق', 'ok'); reload(); }
  };
  return c;
}
