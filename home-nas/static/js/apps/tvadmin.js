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
    return h(`<div class="card">${icon('info')} على جهاز H.SEF المخصص (المثبّت من ملف ISO) تظهر هذه الواجهة تلقائياً على الشاشة الموصولة بالسيرفر.
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
  if (k.installed && k.active) c.appendChild(audioBox());
  return c;
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
      <select class="field" style="max-width:420px">${r.outputs.map((o, i) => `<option value="${i}" ${o.active ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>
      <p class="muted small">لصوت التلفاز اختر المخرج الذي فيه <b translate="no">HDMI</b> أو <b translate="no">DisplayPort</b>. المستوى الحالي: <span translate="no">${r.volume ?? '—'}%</span>${r.muted ? ' (صامت)' : ''}</p>
      <button class="btn primary sm" data-a="set">تطبيق</button> <button class="btn sm" data-a="test">${icon('play')} تجربة الصوت</button>`;
    $('[data-a=set]', ab).onclick = async () => {
      const o = r.outputs[+$('select', ab).value]; if (!o) return;
      if (await guard(() => api.post('/api/admin/tv/audio', { card: o.card, profile: o.profile }))) toast('تم — جرّب الصوت الآن', 'ok');
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
    <div class="muted small tv-today"></div>
    <h4 style="margin-top:16px">${icon('book')} كلمة اليوم</h4>
    <label class="check" style="display:inline-flex;margin-inline-end:16px"><input type="checkbox" name="w_fr"> الفرنسية</label>
    <label class="check" style="display:inline-flex"><input type="checkbox" name="w_en"> الإنجليزية</label>
    <div style="margin-top:14px"><button class="btn primary" data-x="save">حفظ</button></div></div>`);
  const f = (n) => $(`[name=${n}]`, c);
  f('wallpaper').value = s.wallpaper; f('saver_min').value = s.saver_min; f('nosleep').checked = s.nosleep;
  f('night_from').value = nf || ''; f('night_to').value = nt || '';
  f('prayer').checked = s.prayer; f('city').value = s.city || ''; f('lat').value = s.lat || ''; f('lon').value = s.lon || '';
  f('method').value = s.method; f('hanafi').checked = s.hanafi;
  f('w_fr').checked = s.words.includes('fr'); f('w_en').checked = s.words.includes('en');
  const syncCity = () => $$('.ll', c).forEach(l => { l.style.display = f('city').value ? 'none' : ''; });
  f('city').onchange = syncCity; syncCity();
  if (d.prayer && d.prayer.times) {
    $('.tv-today', c).textContent = 'اليوم: ' + d.prayer.times.map(t => `${t.name} ${t.time}`).join(' · ');
  }
  $('[data-x=save]', c).onclick = async () => {
    const nightFrom = f('night_from').value, nightTo = f('night_to').value;
    const data = {
      wallpaper: f('wallpaper').value, saver_min: +f('saver_min').value || 0, nosleep: f('nosleep').checked,
      night_off: nightFrom && nightTo ? `${nightFrom}-${nightTo}` : '',
      prayer: f('prayer').checked, city: f('city').value, method: f('method').value, hanafi: f('hanafi').checked,
      words: ['ar', ...(f('w_fr').checked ? ['fr'] : []), ...(f('w_en').checked ? ['en'] : [])],
    };
    if (!data.city) { data.lat = f('lat').value; data.lon = f('lon').value; }
    if (await guard(() => api.post('/api/admin/tv/settings', data))) { toast('تم الحفظ — يتحدث التلفاز خلال دقائق', 'ok'); reload(); }
  };
  return c;
}
