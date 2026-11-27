// ====================================================================
// لوحة التحكم ← وضع التلفاز: الملفات (المستخدمون على التلفاز)، المربعات، الإعدادات، والشاشة الموصولة
// ====================================================================
import { $, $$, h, esc, icon, api, guard, toast, modal, confirmBox, openApp, pickFolder, fmtSize } from '../core.js';
import * as A from '../tv-art.js';

const ROLE_LABEL = { none: 'لا يظهر على التلفاز', adult: 'بالغ', kid: 'طفل', little: 'طفل صغير (أقل من 6 سنوات)' };
const KIND_LABEL = { media: 'وسائط (فيديو، صوت، صور، كتب)', games: 'ألعاب (بلا نجوم)', learn: 'تعليم (نجمة عند إنهاء الدرس)', photos: 'مكتبة صوري', cameras: 'الكاميرات (مشاهدة مباشرة وتسجيلات)' };

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

  // البند 60: الأجزاء في تبويبات. «المظهر» و«الصلاة والأذان» و«صفحة كل شخص» أجزاء من نموذج واحد (زر «حفظ» واحد يحفظ الكل)
  const set = settingsCard(d, reload);
  const panes = {
    screen: [kioskCard(d, reload)],
    people: d.users.map((u) => userCard(u, d, reload)),
    apps: [appsCard()],
    video: [prepCard()],
    look: [set], prayer: [set], daily: [set],
  };
  const bar = h(`<div class="cp-tabs tv-tabs" role="tablist" style="padding:0;margin:0 0 14px;position:static">${TV_TABS.map(([id, label]) =>
    `<button role="tab" data-t="${id}">${label}</button>`).join('')}</div>`);
  const body = h('<div></div>');
  p.appendChild(bar); p.appendChild(body);
  const open = (id) => {
    if (!panes[id]) id = 'screen';
    tvTab = id;
    $$('[data-t]', bar).forEach((b) => b.classList.toggle('on', b.dataset.t === id));
    body.innerHTML = '';
    panes[id].forEach((el) => body.appendChild(el));
    set.dataset.part = id;
  };
  $$('[data-t]', bar).forEach((b) => (b.onclick = () => open(b.dataset.t)));
  open(tvTab);
}

// البند 63: بطاقات الشاشة الرئيسية للبالغين (بترتيب العرض)
const HOME_CARDS = [['prayer', '🕌 مواقيت الصلاة'], ['text', '📖 نص اليوم'], ['word', '🔤 كلمة اليوم'], ['calendar', '📅 التقويم والمناسبات'],
  ['family', '👨‍👩‍👧 العائلة (أعياد الميلاد والنجوم)'], ['memory', '📸 ذكرى من هذا اليوم']];
// التبويب المفتوح يبقى بعد الحفظ وإعادة التحميل
let tvTab = 'screen';
const TV_TABS = [
  ['screen', '📺 الشاشة والصوت'], ['people', '👨‍👩‍👧 الأشخاص'], ['apps', '🎮 الألعاب والتعليم'], ['video', '🎬 الفيديو'],
  ['look', '🎨 المظهر'], ['prayer', '🕌 الصلاة والأذان'], ['daily', '📖 صفحة كل شخص'],
];

// --------------------------------------------------------------------- الألعاب والتعليم
// كل تطبيق إما في «الألعاب» (بلا نجوم) أو في «التعليم» (نجمة عند إنهاء الدرس). النقل لا يمس تقدّم الأطفال.
function appsCard() {
  const c = h(`<div class="card"><p class="muted small" style="margin:0 0 10px">مجلدان مشتركان لكل العائلة: 🎮 «الألعاب» للمتعة بلا نجوم،
    و📚 «التعليم» يعطي نجمة واحدة عند إنهاء كل درس (ضمن الحد اليومي في «نجوم العائلة»). لإضافة تطبيق جديد ضع مجلده في أحدهما
    من «الملفات» أو من الكمبيوتر: المجلد الذي تختاره هو نوعه. وإن كان في التطبيق ملف app.json بنوع مختلف يظهر هنا تنبيه.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <label class="btn primary sm" style="cursor:pointer">${icon('upload')} إضافة تطبيق (ملف ZIP)<input type="file" accept=".zip" data-up="zip" hidden></label>
      <label class="btn sm" style="cursor:pointer">${icon('folder')} إضافة تطبيق (مجلد)<input type="file" webkitdirectory multiple data-up="dir" hidden></label>
      <button class="btn sm" data-x="dupes">${icon('copy')} إزالة الألعاب المكررة</button>
      <span class="muted small up-st"></span></div>
    <div class="tv-apps muted">جارٍ القراءة…</div></div>`);
  const box = $('.tv-apps', c);
  // البند 53: نسخة واحدة من كل لعبة. نعرض أولاً ما نُبقي وما ينتقل إلى سلة المحذوفات، وتقدّم الأطفال يتبع اللعبة باسمها
  $('[data-x=dupes]', c).onclick = async () => {
    const r = await guard(() => api.get('/api/admin/tv/apps/dupes')); if (!r) return;
    if (!r.dupes.length) { toast('لا توجد ألعاب مكررة ✓', 'ok'); return; }
    const n = r.dupes.reduce((k, d) => k + d.remove.length, 0);
    const list = r.dupes.map((d) => `<li><b translate="no">${esc(d.name)}</b>
      <div class="small">✅ نُبقي: <bdi translate="no">${esc(d.keep)}</bdi></div>
      ${d.remove.map((x) => `<div class="small muted">🗑 إلى سلة المحذوفات: <bdi translate="no">${esc(x)}</bdi></div>`).join('')}</li>`).join('');
    const ok = await modal({ title: `ألعاب مكررة: ${r.dupes.length}`, wide: true,
      body: `<p class="small">نُبقي نسخة واحدة من كل لعبة، وننقل ${n} نسخة إلى سلة المحذوفات (تُسترجع منها خلال مدة السلة).
        <b>تقدّم الأطفال لا يضيع:</b> يتبع اللعبة باسمها أينما كانت.</p><ul class="dupes" style="max-height:52vh;overflow:auto;margin:0;padding-inline-start:18px">${list}</ul>`,
      buttons: [{ label: 'إلغاء', value: false }, { label: `إزالة ${n} نسخة مكررة`, cls: 'primary', value: true }] });
    if (!ok) return;
    const y = await guard(() => api.post('/api/admin/tv/apps/dupes', {})); if (!y) return;
    toast(`✓ نُقلت ${y.moved.length} نسخة مكررة إلى سلة المحذوفات`, 'ok', 6000);
    draw(y.apps);
  };
  // البند 28: إضافة تطبيق من الكمبيوتر (ZIP أو مجلد كامل)
  $$('[data-up]', c).forEach((inp) => (inp.onchange = async () => {
    const files = [...inp.files]; inp.value = '';
    if (!files.length) return;
    const to = await modal({ title: 'أين يوضع التطبيق؟', body: '<p class="muted small">التطبيق المتوافق صفحة ويب تعمل بلا إنترنت: مجلد فيه index.html.</p>',
      buttons: [{ label: 'إلغاء', value: null }, { label: '🎮 الألعاب (بلا نجوم)', value: 'games' }, { label: '📚 التعليم (نجمة عند إنهاء الدرس)', cls: 'primary', value: 'learn' }] });
    if (!to) return;
    const send = async (replace) => {
      const fd = new FormData();
      fd.append('to', to); if (replace) fd.append('replace', '1');
      for (const f of files) { fd.append('files', f); fd.append('paths', f.webkitRelativePath || f.name); }
      $('.up-st', c).textContent = `جارٍ الرفع… (${files.length} ملف)`;
      const r = await fetch('/api/admin/tv/apps/upload', { method: 'POST', body: fd, headers: { 'X-Requested-With': 'fetch' } });
      const j = await r.json().catch(() => ({}));
      $('.up-st', c).textContent = '';
      if (r.status === 409 && await confirmBox(`${j.error} استبداله بالجديد؟`, { ok: 'استبدال', danger: true })) return send(true);
      if (!r.ok) { toast(j.error || `خطأ ${r.status}`, 'err', 8000); return; }
      toast('أُضيف التطبيق ✓ يظهر على التلفاز الآن', 'ok'); draw(j);
    };
    send(false);
  }));
  const col = (kind, title, list, other) => `<div class="tv-appcol"><b>${title} <span class="muted" translate="no">(${list.filter((x) => x.app).length})</span></b>
    ${list.length ? `<ul>${list.map((x) => `<li><span translate="no">${esc(x.name)}</span>
      ${!x.app ? '<span class="badge">مجلد</span>' : ''}
      ${x.declared && x.declared !== (kind === 'learn' ? 'education' : 'game') ? `<span class="badge warn" title="app.json">يقول إنه ${x.declared === 'education' ? 'تعليمي' : 'لعبة'}</span>` : ''}
      ${x.app ? `<button class="btn ghost sm" data-mv="${esc(x.name)}" data-to="${other}">نقل إلى ${other === 'learn' ? '📚 التعليم' : '🎮 الألعاب'}</button>` : ''}</li>`).join('')}</ul>`
      : '<p class="muted small">فارغ</p>'}</div>`;
  const draw = (d) => {
    box.classList.remove('muted');
    box.innerHTML = `<div class="tv-appcols">${col('games', '🎮 الألعاب', d.games, 'learn')}${col('learn', '📚 التعليم', d.learn, 'games')}</div>`;
    $$('[data-mv]', box).forEach((b) => (b.onclick = async () => {
      const r = await guard(() => api.post('/api/admin/tv/apps/move', { name: b.dataset.mv, to: b.dataset.to }));
      if (r) { toast(`نُقل «${b.dataset.mv}»`, 'ok'); draw(r); }
    }));
  };
  guard(() => api.get('/api/admin/tv/apps')).then((d) => d && draw(d));
  return c;
}

// --------------------------------------------------------------------- تجهيز الفيديو للتلفاز
const PREP_STATE = {
  working: '⏳ يُجهَّز الآن', done: '✅ كل الفيديوهات جاهزة', scanning: '🔎 يبحث عن فيديوهات جديدة…',
  tv_in_use: '⏸ ينتظر: التلفاز قيد الاستعمال (يكمل بعد 15 دقيقة من التوقف، أو ليلاً)', wait_night: '🌙 ينتظر الليل (1–7 صباحاً)',
  off: 'التجهيز التلقائي متوقف', demand: '⏸ ينتظر: التلفاز يجهّز فيديو طلبته الآن', space: '⚠ توقف: المساحة المخصصة امتلأت أو القرص شبه ممتلئ',
  idle: '…', error: 'حدث خطأ',
};
function prepCard() {
  const c = h(`<div class="card" style="margin-top:14px"><h4>${icon('video')} تجهيز الفيديو للتلفاز</h4>
    <p class="muted small" style="margin:0 0 10px">بعض الفيديوهات (فيديو الآيفون، AVI، RMVB، VOB…) يجب تحويلها مرة واحدة قبل أن يشغّلها التلفاز.
      هنا تُجهَّز كلها مسبقاً في الخلفية، فتعمل فوراً عند الضغط عليها. الملفات الأصلية لا تتغير.</p><div class="pb muted">جارٍ القراءة…</div></div>`);
  const b = $('.pb', c);
  let timer = 0;
  const draw = (r) => {
    if (!document.body.contains(c) && timer) { clearTimeout(timer); return; }
    if (!r.available) { b.textContent = 'برنامج ffmpeg غير موجود على السيرفر.'; return; }
    b.classList.remove('muted');
    const st = String(r.state || 'idle');
    const paused = st.startsWith('paused:');
    const label = paused ? `⏸ متوقف مؤقتاً — ${PREP_STATE[st.slice(7)] || ''}`.replace('⏸ متوقف مؤقتاً — ⏸ ينتظر: ', '⏸ متوقف مؤقتاً: ') : (PREP_STATE[st] || st);
    const pct = r.total ? Math.round((r.ready / r.total) * 100) : 100;
    b.innerHTML = `
      <div class="prep-stat"><b>${esc(label)}</b>${r.manual ? ' <span class="badge accent">تجهيز يدوي</span>' : ''}</div>
      <div class="media-bar" style="margin:8px 0"><i style="width:${pct}%"></i></div>
      <div class="small">جاهز للتشغيل الفوري: <b translate="no">${r.ready}</b> من <b translate="no">${r.total}</b> فيديو${r.todo ? ` · ينتظر التجهيز: <b translate="no">${r.todo}</b>` : ''}${r.failed ? ` · تعذّر: <span translate="no">${r.failed}</span>` : ''}</div>
      ${r.current ? `<div class="small" style="margin-top:4px">الآن: <span translate="no" dir="auto">${esc(r.current)}</span> · <b translate="no">${r.progress}%</b></div>` : ''}
      <div class="muted small" style="margin-top:4px">النسخ الجاهزة تشغل <bdi dir="ltr" translate="no">${fmtSize(r.cache_bytes || 0)}</bdi> من <bdi dir="ltr" translate="no">${fmtSize(r.limit || 0)}</bdi> مسموحة</div>
      <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">
        ${r.manual ? '<button class="btn" data-a="stop">⏸ إيقاف التجهيز اليدوي</button>' : `<button class="btn primary" data-a="start">${icon('play')} جهّز الآن كل الفيديوهات</button>`}
        <label class="small">تلقائياً: <select class="field" data-x="mode" style="width:auto;display:inline-block">
          <option value="idle">عندما لا يُستعمل التلفاز (وفي الليل)</option>
          <option value="night">ليلاً فقط (1–7 صباحاً)</option>
          <option value="off">متوقف (فقط بالزر)</option></select></label>
        <button class="btn ghost sm" data-a="space">المساحة…</button>
      </div>
      <label class="lbl">أي فيديو يُجهَّز؟</label>
      <select class="field" data-x="scope" style="max-width:520px">
        <option value="tv">فيديو مربعات التلفاز و«صوري» فقط</option>
        <option value="all">كل الفيديو: الملفات الشخصية لكل العائلة وكل المجلدات المشتركة</option></select>
      <div class="rp" style="margin-top:14px;border-top:1px solid var(--border);padding-top:10px"></div>`;
    $('[data-x=scope]', b).value = r.scope || 'tv';
    $('[data-x=scope]', b).onchange = async (e) => { const x = await guard(() => api.post('/api/admin/tv/prep', { scope: e.target.value })); if (x) { toast('تم الحفظ. يُعاد فحص الفيديو الآن.', 'ok'); draw(x); } };
    drawReplace($('.rp', b));
    $('[data-x=mode]', b).value = r.mode;
    $('[data-x=mode]', b).onchange = async (e) => { const x = await guard(() => api.post('/api/admin/tv/prep', { mode: e.target.value })); if (x) { toast('تم الحفظ', 'ok'); draw(x); } };
    b.querySelectorAll('[data-a]').forEach((x) => (x.onclick = async () => {
      if (x.dataset.a === 'space') {
        const v = await modal({ title: 'مساحة النسخ الجاهزة', body: `<label class="lbl">أقصى مساحة بالـGB (0 = تلقائي: 10% من القرص)</label><input class="field" name="gb" type="number" min="0" value="${r.max_gb || 0}">`,
          buttons: [{ label: 'إلغاء', value: null }, { label: 'حفظ', cls: 'primary', value: (bk) => +$('[name=gb]', bk).value || 0 }] });
        if (v === null) return;
        const y = await guard(() => api.post('/api/admin/tv/prep', { max_gb: v })); if (y) draw(y);
        return;
      }
      const y = await guard(() => api.post('/api/admin/tv/prep', { action: x.dataset.a }));
      if (y) { draw(y); toast(x.dataset.a === 'start' ? 'بدأ التجهيز. يمكنك إغلاق الصفحة، سيكمل وحده.' : 'تم', 'ok'); }
    }));
  };
  // البند 21: استبدال الأصل بالنسخة المجهّزة لتوفير المساحة
  let rpInfo = null, rpAt = 0;
  async function drawReplace(box) {
    if (!rpInfo || Date.now() - rpAt > 30000 || (rpInfo.job && rpInfo.job.running)) {
      rpInfo = await api.get('/api/admin/tv/prep/replace').catch(() => null); rpAt = Date.now();
    }
    const x = rpInfo; if (!x || !box.isConnected) return;
    const j = x.job;
    box.innerHTML = `<b class="small">توفير المساحة: احذف الأصل وأبقِ المجهّز</b>
      <p class="muted small" style="margin:4px 0 8px">النسخة المجهّزة تأخذ مكان الفيديو الأصلي في المجلد نفسه، ويذهب الأصل إلى سلة المحذوفات (تستطيع إرجاعه حتى تُفرَّغ السلة).
        <b>الجودة تصير 1080p على الأكثر، وألوان فيديو الآيفون الواسعة (HDR) تصير عادية.</b> لا تفعل هذا لفيديوهات تريدها بأعلى جودة.</p>
      ${j.running ? `<div class="small">⏳ جارٍ الاستبدال: ${j.done} من ${j.total} — <span translate="no" dir="auto">${esc(j.current)}</span></div>`
        : j.finished ? `<div class="small" style="margin-bottom:6px">✅ آخر مرة: استُبدل ${j.done} فيديو، ووُفّر <bdi dir="ltr">${fmtSize(j.saved)}</bdi> (بعد تفريغ السلة).${j.error ? ` <span class="muted">${esc(j.error)}</span>` : ''}</div>` : ''}
      ${!j.running ? (x.count ? `<button class="btn sm danger" data-x="replace">استبدال ${x.count} فيديو (توفير نحو <bdi dir="ltr">${fmtSize(x.saving)}</bdi>)</button>`
        : '<p class="muted small" style="margin:0">لا توجد فيديوهات مجهّزة بعد. جهّزها أولاً.</p>') : ''}`;
    const btn = $('[data-x=replace]', box);
    if (btn) btn.onclick = async () => {
      if (!(await confirmBox(`سيُستبدل ${x.count} فيديو أصلي بنسخته المجهّزة (1080p على الأكثر)، وتذهب الأصول إلى سلة المحذوفات. المساحة تتحرر عند تفريغ السلة. متابعة؟`, { ok: 'استبدال', danger: true }))) return;
      const res = await guard(() => api.post('/api/admin/tv/prep/replace'));
      if (res) { rpInfo = null; toast('بدأ الاستبدال في الخلفية', 'ok'); drawReplace(box); }
    };
  }
  const load = async () => {
    const r = await api.get('/api/admin/tv/prep').catch(() => null);
    if (r) draw(r);
    if (document.body.contains(c) || !timer) timer = setTimeout(load, 4000);
  };
  load();
  return c;
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
  if (k.installed && k.active) { c.appendChild(displayBox()); c.appendChild(audioBox()); c.appendChild(cecBox()); }
  return c;
}

function displayBox() {
  const box = h(`<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px"><h4 style="margin-top:0">${icon('video')} الشاشة والدقة</h4>
    <div class="db muted small">جارٍ القراءة…</div></div>`);
  const db = $('.db', box);
  const label = (x) => {
    const brand = (x.make || '').split(' ')[0], model = x.model || '';
    const name = model && brand && model.toLowerCase().includes(brand.toLowerCase()) ? model : [brand, model].filter(Boolean).join(' ');
    return `${x.internal || /^(eDP|LVDS|DSI)/.test(x.name) ? 'شاشة اللابتوب' : x.name.replace(/-A-/, ' ').replace(/-/g, ' ')}${name ? ` — ${name}` : ''}`;
  };
  const load = () => api.get('/api/admin/tv/display').then((r) => {
    if (r.error) { db.textContent = 'تعذرت قراءة الشاشة.'; return; }
    db.classList.remove('muted', 'small');
    const screens = r.screens || [];
    const many = screens.length > 1;
    let sel = r.preferred && screens.some((x) => x.name === r.preferred) ? r.preferred : (r.shown || (screens[0] && screens[0].name) || '');
    const draw = () => {
      const cur = screens.find((x) => x.name === sel) || { modes: r.modes || [], saved: r.saved, current: r.current };
      db.innerHTML = `${many ? `<p class="small" style="margin:0 0 6px">موصول ${screens.length} شاشات. وضع التلفاز يظهر على واحدة فقط:</p>
        <div class="scr-list">
          <label class="check"><input type="radio" name="scr" value="auto" ${!r.preferred ? 'checked' : ''}> <b>تلقائي</b> <span class="muted small">(HDMI أولاً، ثم DisplayPort، ثم شاشة اللابتوب)</span></label>
          ${screens.map((x) => `<label class="check"><input type="radio" name="scr" value="${esc(x.name)}" ${r.preferred === x.name ? 'checked' : ''}>
            <span translate="no">${esc(label(x))}</span> ${x.name === r.shown ? '<span class="badge ok">معروضة الآن</span>' : ''}</label>`).join('')}
        </div>
        <div class="row" style="gap:8px;margin:6px 0 12px;flex-wrap:wrap"><button class="btn sm" data-a="try">👁️ جرّب الشاشة المختارة 20 ثانية</button>
          <button class="btn sm primary" data-a="save-scr">حفظ الشاشة</button></div>` : ''}
        <label class="lbl">الدقة${many ? ` لـ <span translate="no">${esc(label(screens.find((x) => x.name === sel) || {name: sel, make: '', model: ''}))}</span>` : ''}</label>
        <select class="field" style="max-width:240px" dir="ltr" name="mode"><option value="">تلقائي (أفضل دقة)</option>${(cur.modes || []).map((m) => `<option ${m === cur.saved ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <button class="btn sm" data-a="set">تطبيق</button>
        <p class="muted small">الحالية: <span class="ltr">${esc(cur.current || '—')}</span>. ${r.available ? '' : 'اختيار الدقة يثبّت أداة صغيرة (يحتاج إنترنت مرة واحدة).'}
        للفيديو الأنعم على تلفاز 4K اختر <span class="ltr">1920x1080</span>.${many ? ' كل شاشة تحفظ دقتها.' : ''}</p>`;
      $$('[name=scr]', db).forEach((x) => (x.onchange = () => { if (x.value !== 'auto') { sel = x.value; draw(); $$('[name=scr]', db).forEach((y) => (y.checked = y.value === sel)); } }));
      const pick = () => ($('[name=scr]:checked', db) || {}).value || 'auto';
      const tr = $('[data-a=try]', db);
      if (tr) tr.onclick = async () => { if (await guard(() => api.post('/api/admin/tv/screen', { name: pick(), try: true }))) toast('انظر إلى الشاشات: وضع التلفاز يظهر على المختارة لمدة 20 ثانية، ثم يرجع', 'ok', 8000); };
      const sv = $('[data-a=save-scr]', db);
      if (sv) sv.onclick = async () => { if (await guard(() => api.post('/api/admin/tv/screen', { name: pick() }))) { toast('حُفظت الشاشة', 'ok'); setTimeout(load, 4000); } };
      $('[data-a=set]', db).onclick = async () => {
        if (await guard(() => api.post('/api/admin/tv/display', { mode: $('[name=mode]', db).value, ...(many ? { screen: sel } : {}) }))) toast('تم — تُعاد تشغيل الشاشة', 'ok');
      };
    };
    draw();
  }).catch(e => { db.textContent = e.message; });
  load();
  return box;
}

// البند 5: ريموت التلفاز عبر HDMI-CEC
function cecBox() {
  const box = h(`<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px"><h4 style="margin-top:0">${icon('tv')} ريموت التلفاز (HDMI-CEC)</h4>
    <div class="cb muted small">جارٍ الفحص…</div></div>`);
  const cb = $('.cb', box);
  const why = {
    'no-adapter': 'منفذ HDMI في هذا الجهاز لا يوصل إشارة ريموت التلفاز (CEC). هذا طبيعي في أغلب أجهزة الكمبيوتر واللابتوب.',
    'no-tool': 'أداة CEC غير مثبّتة بعد. تُثبَّت مع التحديث القادم عند توفر الإنترنت.',
    'no-service': 'خدمة ريموت التلفاز لا تعمل على هذا الجهاز (تعمل على جهاز HOME ANAB المثبّت من ملف ISO).',
  };
  const load = async () => {
    const r = await api.get('/api/admin/tv/cec').catch((e) => ({ error: e.message }));
    if (r.error) { cb.textContent = r.error; return; }
    cb.classList.remove('muted', 'small');
    const off = r.enabled === false;
    if (!r.supported && !off) {
      cb.innerHTML = `<div class="alert warn small" style="margin:0"><b>هذا الجهاز لا يدعم ريموت التلفاز.</b> ${why[r.reason] || esc(r.reason || '')}</div>
        <p class="muted small" style="margin:8px 0 0">الحل: محوّل <span translate="no">USB-CEC</span> صغير (مثل <span translate="no">Pulse-Eight</span>) بين الجهاز والتلفاز. عند توصيله يكتشفه HOME ANAB وحده خلال دقيقة. ويبقى ريموت أو يد ألعاب أو لوحة مفاتيح بديلاً.</p>`;
      return;
    }
    cb.innerHTML = `<p style="margin:0 0 6px">${off ? '<span class="badge">موقوف</span>' : r.connected ? '<span class="badge ok">يعمل</span>' : '<span class="badge warn">يبحث عن التلفاز…</span>'}
        ${r.tv ? ` التلفاز: <b translate="no">${esc(r.tv)}</b>` : ''} ${r.adapter ? `<span class="muted small" translate="no">(${esc(r.adapter)})</span>` : ''}</p>
      <p class="muted small" style="margin:0 0 8px">استعمل أسهم ريموت التلفاز و«موافق» و«رجوع» و«الرئيسية» في وضع التلفاز. <b>زر الإطفاء في ريموت التلفاز يطفئ التلفاز فقط، ولا يوقف HOME ANAB أبداً.</b>
        ${r.power_ignored ? ` (تجاهلنا أمر الإطفاء ${r.power_ignored} مرة.)` : ''}</p>
      ${!off && r.supported && !r.keys ? `<div class="alert warn small" style="margin:0 0 8px"><b>لم يصل أي زر من الريموت بعد${r.traffic ? '' : '، ولا أي رسالة من التلفاز'}.</b>
        في تلفاز <b>سامسونغ</b>: الإعدادات ← عام ← <b>مدير الأجهزة الخارجية</b> ← فعّل <b translate="no">Anynet+ (HDMI-CEC)</b>.
        (إل جي: <span translate="no">SIMPLINK</span>، سوني: <span translate="no">BRAVIA Sync</span>.) ثم اختر مدخل HDMI الموصول بـ HOME ANAB، وأطفئ التلفاز وشغّله مرة.
        ${r.traffic ? '' : ' إن بقي العدد صفراً فمنفذ HDMI في هذا الجهاز لا يوصل سلك CEC: يلزم محوّل USB-CEC.'}
        <span class="muted">(رسائل من التلفاز: ${r.traffic || 0})</span></div>` : ''}
      ${r.last_key && !off ? `<p class="small" style="margin:0 0 8px">آخر زر وصل: <span class="ltr" translate="no">0x${esc(r.last_key)}</span> <span class="muted ltr">${esc(r.last_at || '')}</span> — اضغط زراً في ريموت التلفاز ثم «تحديث» لتتأكد.</p>` : ''}
      <button class="btn sm" data-a="toggle">${off ? 'تشغيل الريموت' : 'إيقاف الريموت'}</button> <button class="btn sm" data-a="re">تحديث</button>`;
    $('[data-a=re]', cb).onclick = load;
    $('[data-a=toggle]', cb).onclick = async (e) => {
      e.target.disabled = true;
      if (await guard(() => api.post('/api/admin/tv/cec', { enabled: off }))) { toast('تم', 'ok'); setTimeout(load, 3000); }
      e.target.disabled = false;
    };
  };
  load();
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
      <select class="field" style="max-width:420px"><option value="auto" ${r.auto ? 'selected' : ''}>تلقائي: HDMI الموصول بالتلفاز (موصى به)</option>${r.outputs.map((o, i) => (o.surround && !o.active ? '' : `<option value="${i}" ${!r.auto && o.active ? 'selected' : ''}>${esc(o.name)}${o.surround ? ' — 5.1/7.1: أغلب التلفازات لا تُخرج صوتها' : o.plugged ? ' — موصول' : o.detected === false ? ' — غير مكتشف، جرّبه' : ''}</option>`)).join('')}</select>
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
      <div class="tv-tt"><b></b><div class="muted small">${KIND_LABEL[t.kind] || t.kind}${!['photos', 'cameras'].includes(t.kind) && t.path ? ` · <a href="#" class="tv-path" translate="no"></a>` : ''}</div></div>
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
    $b('.fold').style.display = ['photos', 'cameras'].includes(cur.kind) ? 'none' : '';
    $b('.fp').textContent = folder || (t ? '' : `${u.username}/التلفاز/${cur.title || '…'} (جديد)`);
    $b('.kindhelp').textContent = cur.kind === 'games' ? 'الألعاب في المجلد المشترك «الألعاب» وتظهر لكل أفراد العائلة، ولا تعطي نجوماً. ضع كل لعبة في مجلد خاص بها داخله (فيه index.html)، ويمكن إضافة صورة cover.jpg كغلاف. اترك المجلد تلقائياً ليستعمل المجلد المشترك.'
      : cur.kind === 'learn' ? 'التطبيقات التعليمية في المجلد المشترك «التعليم» وتظهر لكل أفراد العائلة. إنهاء الدرس يعطي نجمة واحدة (ضمن الحد اليومي). ضع كل تطبيق في مجلد خاص به داخله. اترك المجلد تلقائياً ليستعمل المجلد المشترك.'
      : cur.kind === 'photos' ? 'يعرض صور الشخص وفيديوهاته من تطبيق «الصور» (المرفوعة من الهاتف) مع عرض الشرائح.'
      : cur.kind === 'cameras' ? 'يعرض كاميرات المراقبة (البث المباشر والتسجيلات) لمن تضيف له هذا المربع فقط. أضف الكاميرات من تطبيق «الكاميرات».'
      : 'يعرض الفيديو (mp4) والصوت (mp3) والصور وملفات PDF (مثل المصحف أو القصص) والمجلدات الفرعية.';
  };
  $b('[name=title]').oninput = draw;
  $b('[name=kind]').onchange = () => { if (cur.kind !== $b('[name=kind]').value && ['star', 'photos', 'games', 'letters', 'camera'].includes(cur.icon)) cur.icon = { photos: 'photos', games: 'games', learn: 'letters', cameras: 'camera' }[$b('[name=kind]').value] || 'star'; draw(); };
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
  const c = h(`<div class="card tv-set">
    <div data-p="look"><div class="tv-grid">
      <label>خلفية شاشة البالغين<select class="field" name="wallpaper">
        <option value="animated">سماء متحركة</option><option value="photos">صوري المفضلة (تتبدل)</option><option value="dark">ليلي هادئ</option>
        <option value="cars">🚗 سيارات</option><option value="islamic">🕌 إسلامية (مسجد وهلال وفوانيس)</option><option value="custom">🖼️ صورة من اختياري</option></select></label>
      <label>خلفية شاشة الأطفال<select class="field" name="kids_wallpaper">
        <option value="garden">🌳 حديقة وسماء</option><option value="cars">🚗 سيارات</option><option value="islamic">🕌 إسلامية</option><option value="custom">🖼️ صورة من اختياري</option></select></label>
      <label>شاشة التوقف بعد (دقيقة، 0 = أبداً)<input class="field" type="number" min="0" max="240" name="saver_min"></label>
      <label>نوع شاشة التوقف<select class="field" name="saver_kind">
        <option value="prayer">🕌 مواقيت الصلاة بكامل الشاشة</option><option value="photos">🖼️ صوري المفضلة</option><option value="fire">🔥 نار (مدفأة)</option>
        <option value="text">📜 نص: آيات وأحاديث وحِكم</option><option value="rain">🌧️ أمطار</option><option value="galaxy">🌌 درب التبانة</option>
        <option value="calendar">📅 التقويم (ميلادي وهجري والمناسبات)</option><option value="nature">🏞️ الطبيعة (تتغير مع وقت اليوم)</option>
        <option value="sea">🐠 تحت الماء</option><option value="snow">❄️ ثلج</option><option value="moon">🌕 القمر الليلة</option><option value="clock">🕰️ ساعة كبيرة</option>
        <option value="mix">🔀 تنويع (تتبدّل كل 4 دقائق)</option></select></label>
      <label>نص خاص لشاشة «نص» (اختياري، وإلا تُعرض الآيات والأحاديث)<input class="field" name="saver_text" maxlength="160" placeholder="مثال: سبحان الله وبحمده"></label>
      <label>إطفاء الشاشة ليلاً من<input class="field" type="time" name="night_from"></label>
      <label>إلى<input class="field" type="time" name="night_to"></label>
      <label>حجم الواجهة على الشاشة (%)<input class="field" type="number" min="70" max="130" step="5" name="zoom"></label>
      <label>هامش حول الواجهة (% إن كان التلفاز يقص الأطراف)<input class="field" type="number" min="0" max="8" name="margin"></label>
      <label>لغة واجهة التلفاز<select class="field" name="lang" translate="no"><option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option><option value="tr">Türkçe</option><option value="nl">Nederlands</option></select></label>
      <label>إضاءة خفيفة في الليل<select class="field" name="night_dim"><option value="auto">تلقائي: من العشاء حتى الشروق</option><option value="off">متوقف</option></select></label>
      <label>الوضع الخفيف (للتلفاز أو الجهاز الضعيف)<select class="field" name="lite"><option value="auto">تلقائي حسب الجهاز</option><option value="on">مفعّل دائماً</option><option value="off">متوقف</option></select></label>
    </div>
    <div class="wall-files" style="margin:8px 0"></div>
    <label class="check"><input type="checkbox" name="nosleep"> منع الشاشة من الانطفاء أثناء الاستخدام</label></div>
    <div data-p="prayer"><h4>${icon('clock')} مواقيت الصلاة</h4>
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
    </div></div>
    <div data-p="daily"><h4>🏠 البطاقات في الشاشة الرئيسية (للبالغين)</h4>
    <div style="display:flex;gap:16px;flex-wrap:wrap">${HOME_CARDS.map(([k, n]) => `<label class="check" style="margin:0"><input type="checkbox" name="hc_${k}"> ${n}</label>`).join('')}</div>
    <p class="muted small" style="margin:4px 0 12px">تظهر بهذا الترتيب في عمودين بجانب الساعة. إن لم يتسع المكان لكلها لا تظهر الأخيرة (أنسب عدد: 3 أو 4).</p>
    <h4>${icon('book')} كلمة اليوم</h4>
    <label class="check" style="display:inline-flex;margin-inline-end:16px"><input type="checkbox" name="w_fr"> الفرنسية</label>
    <label class="check" style="display:inline-flex"><input type="checkbox" name="w_en"> الإنجليزية</label>
    <p class="muted small" style="margin:6px 0 0">تتغيّر الكلمة مع كل تسجيل دخول، وتظهر في صفحة كل شخص.</p>
    <h4 style="margin-top:16px">${icon('book')} نص اليوم في صفحة كل شخص</h4>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <label class="check" style="margin:0"><input type="checkbox" name="dk_hadith"> حديث نبوي ﷺ (من الصحيحين)</label>
      <label class="check" style="margin:0"><input type="checkbox" name="dk_ayah"> آية كريمة</label>
      <label class="check" style="margin:0"><input type="checkbox" name="dk_proverb"> مثل شعبي</label>
      <label class="check" style="margin:0"><input type="checkbox" name="dk_wisdom"> حكمة / جملة جميلة</label></div>
    <p class="muted small" style="margin:4px 0 6px">يتناوب النوع المختار مع كل دخول. ألغِ الكل لإخفاء البطاقة.</p>
    <button class="btn sm" data-x="hlist">${icon('book')} مراجعة النصوص</button>
    <h4 style="margin-top:16px">☀️ درجة الحرارة</h4>
    <label class="check"><input type="checkbox" name="weather"> عرض الطقس لمدينة المواقيت تحت الساعة (من Open-Meteo، بلا حساب)</label></div>
    <div style="margin-top:14px"><button class="btn primary" data-x="save">حفظ</button>
      <span class="muted small" style="margin-inline-start:8px">يحفظ «المظهر» و«الصلاة والأذان» و«صفحة كل شخص» معاً</span></div></div>`);
  const f = (n) => $(`[name=${n}]`, c);
  f('wallpaper').value = s.wallpaper; f('kids_wallpaper').value = s.kids_wallpaper || 'garden'; f('saver_min').value = s.saver_min; f('nosleep').checked = s.nosleep; f('lite').value = s.lite || 'auto'; f('lang').value = s.lang || 'ar'; f('night_dim').value = s.night_dim || 'auto';
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
  // صورة خلفية من اختيار الأهل (لشاشة البالغين وشاشة الأطفال)
  const wallFiles = (walls) => {
    const row = (w, label) => `<div style="margin:4px 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap">${label}: ${walls[w]
      ? `<img src="/api/tv/wall/${w}?v=${walls[w]}" alt="" style="height:44px;border-radius:6px"> <button class="btn sm ghost" data-wall-del="${w}">حذف</button>`
      : '<span class="muted">لا توجد</span>'} <label class="btn sm" style="cursor:pointer">${icon('upload')} رفع صورة<input type="file" accept="image/*" data-wall-up="${w}" hidden></label></div>`;
    const box = $('.wall-files', c);
    box.innerHTML = '<div class="muted small">«صورة من اختياري»:</div>' + row('adult', 'صورة شاشة البالغين') + row('kids', 'صورة شاشة الأطفال');
    box.querySelectorAll('[data-wall-del]').forEach((b) => (b.onclick = async () => { const r = await guard(() => api.del(`/api/admin/tv/wall/${b.dataset.wallDel}`)); if (r) wallFiles(r.walls); }));
    box.querySelectorAll('[data-wall-up]').forEach((inp) => (inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const fd = new FormData(); fd.append('file', file);
      try {
        const res = await fetch(`/api/admin/tv/wall/${inp.dataset.wallUp}`, { method: 'POST', body: fd }); const r = await res.json();
        if (!res.ok) throw new Error(r.error || res.status);
        toast('تم رفع الصورة. اختر «صورة من اختياري» ثم احفظ', 'ok'); wallFiles(r.walls);
      } catch (e) { toast(e.message, 'err'); }
    }));
  };
  wallFiles(s.walls || {});
  f('w_fr').checked = s.words.includes('fr'); f('w_en').checked = s.words.includes('en');
  for (const k of ['hadith', 'ayah', 'proverb', 'wisdom']) f('dk_' + k).checked = (s.daily_kinds || []).includes(k);
  f('saver_kind').value = s.saver_kind || 'prayer'; f('saver_text').value = s.saver_text || '';
  f('weather').checked = s.weather !== false;
  for (const [k] of HOME_CARDS) f('hc_' + k).checked = (s.home_cards || ['prayer', 'text', 'word']).includes(k);
  $('[data-x=hlist]', c).onclick = async () => {
    const r = await guard(() => api.get('/api/admin/welcome/hadith')); if (!r) return;
    modal({ title: `نصوص اليوم — كلمات: ${r.words}`, wide: true, body: h(`<div style="max-height:60vh;overflow:auto">
      <h4>🕌 الأحاديث (${r.hadith.length})</h4>
      <p class="muted small">كل نص هنا موجود بلفظه في صحيح البخاري أو صحيح مسلم (تحقّقنا منه آلياً). ⭐ = يظهر للأطفال، ومعه شرح بسيط من كلامنا.</p>
      <ol style="line-height:1.9">${r.hadith.map((x) => `<li><b>«${esc(x.text)}»</b> <span class="muted">— ${esc(x.source)}</span> ${x.kids ? '⭐' : ''}${x.explain ? `<div class="small muted">💡 ${esc(x.explain)}</div>` : ''}</li>`).join('')}</ol>
      <h4>📖 الآيات (${(r.ayat || []).length})</h4>
      <p class="muted small">منقولة حرفياً بالرسم العثماني من مصحف المدينة، ومعها معنى بسيط للأطفال.</p>
      <ol style="line-height:2.1">${(r.ayat || []).map((x) => `<li><b style="font-family:'Amiri Quran',serif;font-weight:400;font-size:1.25em">﴿${esc(x.text)}﴾</b> <span class="muted">— ${esc(x.source)}</span><div class="small muted">💡 ${esc(x.explain)}</div></li>`).join('')}</ol>
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
      wallpaper: f('wallpaper').value, kids_wallpaper: f('kids_wallpaper').value, saver_min: +f('saver_min').value || 0, nosleep: f('nosleep').checked, lite: f('lite').value, lang: f('lang').value, night_dim: f('night_dim').value,
      zoom: +f('zoom').value || 100, margin: +f('margin').value || 0,
      night_off: nightFrom && nightTo ? `${nightFrom}-${nightTo}` : '',
      prayer: f('prayer').checked, city: f('city').value, method: f('method').value, hanafi: f('hanafi').checked,
      words: ['ar', ...(f('w_fr').checked ? ['fr'] : []), ...(f('w_en').checked ? ['en'] : [])],
      daily_kinds: ['hadith', 'ayah', 'wisdom', 'proverb'].filter((k) => f('dk_' + k).checked), weather: f('weather').checked,
      saver_kind: f('saver_kind').value, saver_text: f('saver_text').value,
      home_cards: HOME_CARDS.map(([k]) => k).filter((k) => f('hc_' + k).checked),
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
