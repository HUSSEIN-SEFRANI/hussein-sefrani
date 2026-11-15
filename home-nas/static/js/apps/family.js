// HOME ANAB — «العائلة» للأب والأم: تقرير الأسبوع، مهام الأطفال، قصص بصوتنا، تعلّم ثم العب، رمضان
import { ME, $, $$, h, esc, icon, api, guard, toast, confirmBox, registerApp } from '../core.js';

const TABS = [
  ['report', '📊 تقرير الأسبوع'], ['chores', '✅ مهام الأطفال'], ['stories', '🎙️ قصص بصوتنا'],
  ['rules', '⏱️ تعلّم ثم العب'], ['ramadan', '🌙 رمضان'],
];
const DAY = (iso) => { try { return new Intl.DateTimeFormat('ar', { weekday: 'short' }).format(new Date(iso + 'T12:00:00')); } catch { return iso.slice(5); } };
const mins = (n) => n >= 60 ? `${Math.floor(n / 60)} س ${n % 60 ? `${n % 60} د` : ''}` : `${n} د`;

registerApp({
  id: 'family', title: 'العائلة', icon: 'users', color: 'linear-gradient(135deg,#ec4899,#8b5cf6)', width: 980, height: 700,
  hidden: !ME.parent,
  open(win, opts = {}) {
    win.body.innerHTML = `<div class="fam"><div class="fam-tabs">${TABS.map(([k, l]) => `<button class="btn ghost sm" data-t="${k}">${l}</button>`).join('')}</div>
      <div class="scroll fam-body"></div></div>`;
    const body = $('.fam-body', win.body);
    const show = (k) => {
      $$('[data-t]', win.body).forEach((b) => b.classList.toggle('primary', b.dataset.t === k));
      body.innerHTML = '<p class="muted">جارٍ القراءة…</p>';
      ({ report, chores, stories, rules, ramadan })[k](body);
    };
    $$('[data-t]', win.body).forEach((b) => (b.onclick = () => show(b.dataset.t)));
    win.reopen = (o) => o.tab && show(o.tab);
    show(opts.tab || 'report');
  },
});

// ------------------------------------------------------------------------- تقرير الأسبوع
async function report(box) {
  const r = await guard(() => api.get('/api/kids/report?days=7')); if (!r) return;
  if (!r.kids.length) { box.innerHTML = '<p class="muted">لا يوجد أطفال على التلفاز بعد. اختر «طفل» لكل ابن أو ابنة من لوحة التحكم ← وضع التلفاز.</p>'; return; }
  box.innerHTML = r.kids.map((k) => {
    const max = Math.max(30, ...k.days.map((d) => d.learn + d.play));
    const bars = k.days.map((d) => `<div class="fam-bar" title="${esc(d.day)}: تعلّم ${d.learn} د، لعب ${d.play} د">
      <div class="st"><i class="pl" style="height:${(100 * d.play) / max}%"></i><i class="le" style="height:${(100 * d.learn) / max}%"></i></div><span>${esc(DAY(d.day))}</span></div>`).join('');
    const empty = !k.learn_min && !k.play_min && !k.answers;
    return `<div class="card fam-kid"><h4>${icon('user')} <bdi translate="no">${esc(k.name)}</bdi></h4>
      ${empty ? '<p class="muted small">لا توجد بيانات هذا الأسبوع بعد. تظهر بعد أن يلعب على التلفاز.</p>' : `
      <div class="fam-kpis">
        <div><b>${mins(k.learn_min)}</b><span>تعلّم</span></div><div><b>${mins(k.play_min)}</b><span>لعب</span></div>
        <div><b translate="no">⭐ ${k.stars}</b><span>نجوم هذا الأسبوع</span></div><div><b translate="no">${k.chores}</b><span>مهام أنجزها</span></div>
        <div><b translate="no">${k.correct_pct == null ? '—' : k.correct_pct + '%'}</b><span>إجابات صحيحة (${k.answers})</span></div></div>
      <div class="fam-chart">${bars}</div>
      <div class="fam-leg"><span><i class="le"></i>تعلّم</span><span><i class="pl"></i>لعب</span></div>
      <div class="fam-cols">
        <div><b class="small">أكثر ما استعمله</b><ul class="fam-list">${k.games.map((g) => `<li><span translate="no">${esc(g.game)}</span><span class="badge ${g.kind === 'learn' ? 'ok' : ''}">${g.kind === 'learn' ? 'تعلّم' : 'لعب'}</span><span class="muted">${mins(g.minutes)}</span></li>`).join('') || '<li class="muted">—</li>'}</ul></div>
        <div><b class="small">يحتاج مساعدة في</b><ul class="fam-list">${k.mistakes.map((m) => `<li><span translate="no">${esc(m.topic)}</span><span class="muted small" translate="no">${esc(m.game)}</span><span class="badge err">${m.wrong} / ${m.total}</span></li>`).join('') || '<li class="muted small">لا أخطاء متكررة 👏</li>'}</ul></div>
      </div>`}</div>`;
  }).join('') + `<p class="muted small">آخر 7 أيام. الألعاب التعليمية تُختار من «تعلّم ثم العب».</p>`;
}

// ------------------------------------------------------------------------- مهام الأطفال
const SUGGEST = ['ترتيب السرير', 'ترتيب الألعاب', 'تنظيف الأسنان', 'الصلاة في وقتها', 'الواجب المدرسي', 'المساعدة في المائدة', 'إطعام القطة', 'سقي النباتات', 'قراءة كتاب'];
async function chores(box) {
  const d = await guard(() => api.get('/api/kids/chores')); if (!d) return;
  const kid = Object.fromEntries(d.kids.map((k) => [k.id, k.name]));
  const pending = d.log.filter((l) => l.status === 'done');
  const draw = (dd) => chores_draw(box, dd || d, kid, pending);
  draw();
}
function chores_draw(box, d, kid, pending) {
  pending = d.log.filter((l) => l.status === 'done');
  if (!d.kids.length) { box.innerHTML = '<p class="muted">لا يوجد أطفال على التلفاز بعد.</p>'; return; }
  box.innerHTML = `
    <div class="card"><h4>⏳ تنتظر تأكيدك (${pending.length})</h4>
      ${pending.length ? `<ul class="fam-list">${pending.map((l) => `<li><span>${esc(l.icon)} ${esc(l.title)}</span><bdi class="muted" translate="no">${esc(kid[l.user_id] || '')}</bdi>
        <span class="muted small" translate="no">${esc(l.day)}</span><span class="grow"></span>
        <button class="btn sm primary" data-ok="${l.id}">✓ تأكيد ⭐ ${l.stars}</button><button class="btn sm ghost" data-no="${l.id}">✗</button></li>`).join('')}</ul>`
        : '<p class="muted small">عندما يضغط الطفل «فعلتها» على التلفاز تظهر المهمة هنا، فتؤكدها وتُضاف النجوم.</p>'}</div>
    <div class="card" style="margin-top:14px"><h4>➕ مهمة يومية جديدة</h4>
      <input class="field fam-t" maxlength="60" placeholder="مثل: ترتيب السرير" list="fam-sug"><datalist id="fam-sug">${SUGGEST.map((x) => `<option value="${x}">`).join('')}</datalist>
      <div class="fam-icons">${d.icons.map((x, i) => `<button class="btn ghost sm ${i === 0 ? 'primary' : ''}" data-ic="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <div class="row" style="gap:12px;flex-wrap:wrap;align-items:center;margin-top:8px">
        <label class="small">النجوم: <select class="field fam-s" style="width:auto;display:inline-block">${[1, 2, 3, 4, 5].map((n) => `<option>${n}</option>`).join('')}</select></label>
        ${d.kids.map((k) => `<label class="check" style="margin:0"><input type="checkbox" value="${k.id}" checked> <bdi translate="no">${esc(k.name)}</bdi></label>`).join('')}
        <button class="btn primary fam-add">إضافة</button></div></div>
    <div class="card" style="margin-top:14px"><h4>📋 المهام الحالية</h4>
      ${d.kids.map((k) => { const list = d.chores.filter((c) => c.user_id === k.id); return `<b class="small"><bdi translate="no">${esc(k.name)}</bdi></b>
        <ul class="fam-list">${list.map((c) => `<li><span>${esc(c.icon || '⭐')} ${esc(c.title)}</span><span class="muted" translate="no">⭐ ${c.stars}</span><span class="grow"></span>
          <button class="btn ghost icon sm danger" data-del="${c.id}" title="حذف">${icon('trash')}</button></li>`).join('') || '<li class="muted small">لا مهام</li>'}</ul>`; }).join('')}</div>`;
  let ic = d.icons[0];
  $$('[data-ic]', box).forEach((b) => (b.onclick = () => { ic = b.dataset.ic; $$('[data-ic]', box).forEach((x) => x.classList.toggle('primary', x === b)); }));
  const redraw = (dd) => { if (dd) chores_draw(box, dd, kid); };
  $('.fam-add', box).onclick = async () => {
    const users = $$('input[type=checkbox]', box).filter((x) => x.checked).map((x) => +x.value);
    const dd = await guard(() => api.post('/api/kids/chores', { title: $('.fam-t', box).value, icon: ic, stars: +$('.fam-s', box).value, users }));
    if (dd) { toast('أُضيفت المهمة', 'ok'); redraw(dd); }
  };
  $$('[data-del]', box).forEach((b) => (b.onclick = async () => { if (await confirmBox('حذف هذه المهمة؟')) redraw(await guard(() => api.del('/api/kids/chores/' + b.dataset.del))); }));
  $$('[data-ok]', box).forEach((b) => (b.onclick = async () => { const dd = await guard(() => api.post(`/api/kids/chores/log/${b.dataset.ok}`, { action: 'confirm' })); if (dd) { toast('أُضيفت النجوم ⭐', 'ok'); redraw(dd); } }));
  $$('[data-no]', box).forEach((b) => (b.onclick = async () => redraw(await guard(() => api.post(`/api/kids/chores/log/${b.dataset.no}`, { action: 'reject' })))));
}

// ------------------------------------------------------------------------- قصص بصوتنا
async function stories(box) {
  const d = await guard(() => api.get('/api/kids/stories')); if (!d) return;
  const canRec = !!(window.isSecureContext && navigator.mediaDevices && window.MediaRecorder);
  box.innerHTML = `<div class="card"><h4>🎙️ قصة جديدة بصوتك</h4>
      <p class="muted small" style="margin:0 0 8px">تظهر على تلفاز الأطفال في مربع «قصص بصوتنا»، بعنوانها واسم من سجّلها.</p>
      <input class="field fam-st" maxlength="80" placeholder="عنوان القصة، مثل: الأرنب والسلحفاة">
      <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:10px;align-items:center">
        ${canRec ? '<button class="btn primary fam-rec">🎙️ ابدأ التسجيل</button>' : ''}
        <label class="btn">${icon('upload')} اختيار ملف صوت<input type="file" accept="audio/*" class="hidden fam-file"></label>
        <span class="small fam-state muted"></span></div>
      ${canRec ? '' : '<p class="muted small" style="margin:8px 0 0">لتسجيل قصة من الهاتف: سجّلها بتطبيق «المسجّل» أو «المذكرات الصوتية»، ثم اختر الملف هنا.</p>'}
      <audio class="fam-prev hidden" controls style="width:100%;margin-top:10px"></audio>
      <div class="fam-save hidden" style="margin-top:10px"><button class="btn primary">حفظ القصة</button></div></div>
    <div class="card" style="margin-top:14px"><h4>📚 القصص (${d.items.length})</h4>
      <ul class="fam-list">${d.items.map((x) => `<li><span>🎧 ${esc(x.title)}</span><span class="muted small">بصوت <bdi translate="no">${esc(x.by)}</bdi></span>
        <span class="muted small">استُمع إليها ${x.plays}</span><span class="grow"></span>
        <button class="btn ghost icon sm" data-play="${x.id}" title="استمع">${icon('play')}</button>
        <button class="btn ghost icon sm danger" data-del="${x.id}" title="حذف">${icon('trash')}</button></li>`).join('') || '<li class="muted small">لا توجد قصص بعد.</li>'}</ul></div>`;
  let blob = null, name = 'story.webm', rec = null, chunks = [];
  const prev = $('.fam-prev', box), save = $('.fam-save', box), st = $('.fam-state', box);
  const ready = (b, n) => { blob = b; name = n; prev.src = URL.createObjectURL(b); prev.classList.remove('hidden'); save.classList.remove('hidden'); };
  $('.fam-file', box).onchange = (e) => { const f = e.target.files[0]; if (f) { ready(f, f.name); st.textContent = f.name; } };
  const rb = $('.fam-rec', box);
  if (rb) rb.onclick = async () => {
    if (rec) { rec.stop(); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast('لا يوجد إذن للميكروفون', 'err'); return; }
    chunks = []; rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = rec.mimeType || 'audio/webm';
      ready(new Blob(chunks, { type }), type.includes('mp4') ? 'story.m4a' : 'story.webm');
      rec = null; rb.textContent = '🎙️ سجّل من جديد'; st.textContent = 'استمع، ثم احفظ';
    };
    rec.start(); rb.textContent = '⏹️ إيقاف التسجيل'; st.textContent = '● يسجّل الآن…';
  };
  $('button', save).onclick = async () => {
    const title = $('.fam-st', box).value.trim();
    if (!title) { toast('اكتب عنوان القصة', 'err'); return; }
    const fd = new FormData(); fd.append('title', title); fd.append('audio', blob, name);
    st.textContent = 'جارٍ الرفع…';
    try {
      const res = await fetch('/api/kids/stories', { method: 'POST', body: fd, credentials: 'same-origin' });
      const r = await res.json(); if (!res.ok) throw new Error(r.error || res.status);
      toast('حُفظت القصة', 'ok'); stories(box);
    } catch (e) { toast(e.message, 'err'); st.textContent = ''; }
  };
  $$('[data-play]', box).forEach((b) => (b.onclick = () => { prev.src = `/api/kids/stories/${b.dataset.play}/audio`; prev.classList.remove('hidden'); prev.play(); }));
  $$('[data-del]', box).forEach((b) => (b.onclick = async () => { if (await confirmBox('حذف هذه القصة؟')) { await guard(() => api.del('/api/kids/stories/' + b.dataset.del)); stories(box); } }));
}

// ------------------------------------------------------------------------- تعلّم ثم العب
async function rules(box) {
  const d = await guard(() => api.get('/api/kids/settings')); if (!d) return;
  const opt = (vals, cur, none) => vals.map((v) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v ? `${v} دقيقة` : none}</option>`).join('');
  box.innerHTML = `<div class="card"><h4>⏱️ لكل طفل</h4>
      <p class="muted small" style="margin:0 0 10px">«تعلّم أولاً»: تُفتح ألعاب اللعب بعد أن يقضي الطفل هذه المدة في الألعاب التعليمية اليوم.
        «وقت اللعب»: أقصى مدة يومية لألعاب اللعب. الألعاب التعليمية مسموحة دائماً.</p>
      ${d.kids.map((k) => `<div class="fam-rule" data-u="${k.id}"><b><bdi translate="no">${esc(k.name)}</bdi></b>
        <label class="small">تعلّم أولاً <select class="field" data-x="learn">${opt([0, 10, 15, 20, 30, 45], k.learn, 'لا')}</select></label>
        <label class="small">وقت اللعب اليومي <select class="field" data-x="play">${opt([0, 30, 45, 60, 90, 120, 180], k.play, 'بلا حد')}</select></label>
        <label class="small">وقت الشاشة اليومي (كل التلفاز) <select class="field" data-x="screen">${opt([0, 30, 45, 60, 90, 120, 150, 180, 240], k.screen || 0, 'بلا حد')}</select></label>
        <label class="small">وقت النوم <input class="field" type="time" data-x="bed" value="${esc(k.bed || '')}"></label>
        <label class="small">حتى الصباح <input class="field" type="time" data-x="wake" value="${esc(k.wake || '07:00')}"></label>
        <span class="muted small">اليوم: شاشة ${Math.round((k.today.screen || 0) / 60)} د · تعلّم ${Math.round(k.today.learn / 60)} د · لعب ${Math.round(k.today.play / 60)} د</span></div>`).join('') || '<p class="muted">لا يوجد أطفال على التلفاز بعد.</p>'}
      <p class="muted small" style="margin:10px 0 0">عند انتهاء وقت الشاشة أو في وقت النوم يُقفل حساب الطفل على التلفاز، مع تنبيه قبل 5 دقائق. «وقت إضافي»: الأب أو الأم يكتب رمزه على التلفاز فيضيف 15 دقيقة. اترك «وقت النوم» فارغاً لإيقافه.</p></div>
    <div class="card" style="margin-top:14px"><h4>📚 الألعاب التعليمية</h4>
      <p class="muted small" style="margin:0 0 8px">الألعاب المعلَّمة هنا تُحسب «تعلّماً»، والباقي «لعباً».</p>
      <div class="fam-games">${d.games.map((g) => `<label class="check" style="margin:0"><input type="checkbox" value="${esc(g.name)}" ${g.learn ? 'checked' : ''}> <span translate="no">${esc(g.name)}</span></label>`).join('') || '<p class="muted small">لا توجد ألعاب في مجلد «الألعاب» بعد.</p>'}</div></div>
    <div style="margin-top:14px"><button class="btn primary fam-save">حفظ</button></div>`;
  $('.fam-save', box).onclick = async () => {
    const rulesObj = {};
    $$('.fam-rule', box).forEach((r) => { rulesObj[r.dataset.u] = { learn: +$('[data-x=learn]', r).value, play: +$('[data-x=play]', r).value,
      screen: +$('[data-x=screen]', r).value, bed: $('[data-x=bed]', r).value, wake: $('[data-x=wake]', r).value || '07:00' }; });
    const learn_games = $$('.fam-games input', box).filter((x) => x.checked).map((x) => x.value);
    if (await guard(() => api.post('/api/kids/settings', { rules: rulesObj, ...(d.games.length ? { learn_games } : {}) }))) toast('تم الحفظ', 'ok');
  };
}

// ------------------------------------------------------------------------- رمضان
async function ramadan(box) {
  const d = await guard(() => api.get('/api/kids/ramadan')); if (!d) return;
  box.innerHTML = `<div class="card" style="max-width:620px"><h4>🌙 وضع رمضان على التلفاز</h4>
    <p class="muted small" style="margin:0 0 10px">يظهر مربع «رمضان كريم» لكل العائلة: عدّ تنازلي للإفطار والسحور، وختمة العائلة (30 جزءاً يضع كل شخص علامة على ما قرأه)،
      وتحدّي يومي للأطفال بنجمتين.</p>
    ${[['auto', 'تلقائي: طوال شهر رمضان حسب التقويم'], ['on', 'مفعّل الآن'], ['off', 'متوقف']].map(([v, l]) => `<label class="check"><input type="radio" name="rm" value="${v}" ${d.mode === v ? 'checked' : ''}> ${l}</label>`).join('')}
    <p class="small" style="margin:10px 0 0">الحالة الآن: ${d.on ? '<span class="badge ok">يظهر على التلفاز</span>' : '<span class="badge">لا يظهر</span>'}</p></div>`;
  $$('input[name=rm]', box).forEach((x) => (x.onchange = async () => { const r = await guard(() => api.post('/api/kids/ramadan', { mode: x.value })); if (r) { toast('تم الحفظ', 'ok'); ramadan(box); } }));
}
