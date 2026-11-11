// ====================================================================
// لوحة التحكم ← الجهاز والاتصال: عنوان IP ثابت، الوايفاي، الوقت، وضع بدون إنترنت، البلوتوث
// ====================================================================
import { $, $$, h, esc, icon, api, guard, toast, confirmBox, modal } from '../core.js';

export async function deviceSection(sc, section) {
  const d = await guard(() => api.get('/api/admin/device')); if (!d) return;
  const reload = () => { sc.innerHTML = ''; deviceSection(sc, section); };
  const p = section(sc, 'الجهاز والاتصال', 'عنوان السيرفر في الشبكة، والوايفاي، والوقت، ووضع العمل بدون إنترنت، وأجهزة البلوتوث مثل يد بلايستيشن.');
  if (!d.available) {
    p.appendChild(h(`<div class="card">${icon('info')} هذه الإعدادات متاحة على جهاز HOME ANAB المخصص (المثبّت من ملف ISO).</div>`));
    return;
  }
  p.appendChild(netCard(d.net, reload));
  p.appendChild(wifiCard(d.net.wifi || {}, reload));
  p.appendChild(timeCard(d.sys, reload));
  p.appendChild(btCard());
}

// ------------------------------------------------------------------ عنوان IP
function netCard(n, reload) {
  const c = h(`<div class="card" style="max-width:640px"><h4>${icon('wifi')} عنوان السيرفر في الشبكة (كابل)</h4>
    ${n.pending ? `<div class="alert small" style="background:var(--accent-soft);padding:10px;border-radius:10px;margin-bottom:10px">
      <b>العنوان الجديد يعمل؟</b> اضغط «تأكيد» خلال 3 دقائق، وإلا يعود العنوان القديم تلقائياً.
      <div style="margin-top:8px"><button class="btn primary sm" data-x="confirm">${icon('check')} تأكيد العنوان</button></div></div>` : ''}
    <p class="muted small">العنوان الحالي: <b class="ltr">${esc(n.ip || '—')}</b> · البوابة: <span class="ltr">${esc(n.gateway || '—')}</span> · الطريقة: ${n.mode === 'static' ? 'ثابت' : 'تلقائي (DHCP)'}</p>
    ${!n.supported ? '<p class="muted">لا يمكن تغيير العنوان على هذا الجهاز.</p>' : `
    <label class="check"><input type="radio" name="m" value="dhcp"> تلقائي من الراوتر (DHCP)</label>
    <label class="check"><input type="radio" name="m" value="static"> عنوان ثابت</label>
    <div class="tv-grid st">
      <label>العنوان<input class="field" name="ip" dir="ltr" placeholder="192.168.1.50"></label>
      <label>البادئة (24 = 255.255.255.0)<input class="field" name="prefix" dir="ltr" value="24"></label>
      <label>البوابة (الراوتر)<input class="field" name="gateway" dir="ltr"></label>
      <label>DNS (اختياري)<input class="field" name="dns" dir="ltr"></label>
    </div>
    <p class="muted small">اختر عنواناً خارج نطاق التوزيع التلقائي في الراوتر (مثل .50 أو .200). بعد الحفظ ينقطع الاتصال لحظات: افتح العنوان الجديد واضغط «تأكيد».</p>
    <button class="btn primary" data-x="save">حفظ</button>`}</div>`);
  const conf = $('[data-x=confirm]', c);
  if (conf) conf.onclick = async () => { if (await guard(() => api.post('/api/admin/net/confirm', {}))) { toast('تم تثبيت العنوان', 'ok'); reload(); } };
  if (!n.supported) return c;
  const f = (k) => $(`[name=${k}]`, c);
  f('ip').value = n.ip || ''; f('prefix').value = n.prefix || 24; f('gateway').value = n.gateway || ''; f('dns').value = (n.dns || []).join(', ');
  $$('[name=m]', c).forEach(r => { r.checked = r.value === n.mode; r.onchange = sync; });
  function sync() { $('.st', c).style.display = $('[name=m]:checked', c)?.value === 'static' ? '' : 'none'; }
  sync();
  $('[data-x=save]', c).onclick = async () => {
    const mode = $('[name=m]:checked', c)?.value || 'dhcp';
    const data = { mode, ip: f('ip').value.trim(), prefix: f('prefix').value.trim(), gateway: f('gateway').value.trim(), dns: f('dns').value };
    const target = mode === 'static' ? data.ip : null;
    if (!await confirmBox(mode === 'static'
      ? `سيصبح عنوان السيرفر ${target}. سينقطع الاتصال لحظات، ثم افتح http://${target} واضغط «تأكيد العنوان» خلال 3 دقائق.`
      : 'سيأخذ السيرفر عنوانه من الراوتر تلقائياً. قد يتغير العنوان، واستخدم hsef.local للوصول إليه.', { ok: 'تطبيق' })) return;
    if (!await guard(() => api.post('/api/admin/net', data))) return;
    toast('جارٍ تطبيق الإعداد…', 'ok');
    if (target) setTimeout(() => { location.href = `http://${target}${location.port ? ':' + location.port : ''}/`; }, 6000);
    else setTimeout(() => location.reload(), 8000);
  };
  return c;
}

// ------------------------------------------------------------------ الوايفاي
function wifiCard(w, reload) {
  const c = h(`<div class="card" style="max-width:640px;margin-top:14px"><h4>${icon('wifi')} الوايفاي</h4><div class="wb"></div></div>`);
  const b = $('.wb', c);
  if (!w.iface) {
    b.innerHTML = `<p class="muted">لا توجد بطاقة وايفاي ظاهرة في هذا الجهاز. إن كانت موجودة فقد تحتاج تعريفاً:</p>
      <button class="btn" data-x="inst">${icon('download')} تثبيت تعريفات الوايفاي (يحتاج إنترنت)</button>
      <p class="muted small">بعد التثبيت أعد تشغيل الجهاز. الكابل أسرع وأثبت للسيرفر دائماً.</p>`;
  } else if (!w.installed) {
    b.innerHTML = `<p>بطاقة الوايفاي <b class="ltr">${esc(w.iface)}</b> موجودة. ثبّت أدوات الاتصال أولاً (يحتاج إنترنت عبر الكابل):</p>
      <button class="btn primary" data-x="inst">${icon('download')} تثبيت الوايفاي</button>`;
  } else {
    b.innerHTML = `${w.ssid ? `<p>متصل بـ <b>${esc(w.ssid)}</b> ${w.ip ? `· <span class="ltr">${esc(w.ip)}</span>` : '<span class="badge warn">بلا عنوان</span>'}
        <button class="btn ghost sm" data-x="forget">نسيان الشبكة</button></p>` : '<p class="muted">غير متصل بأي شبكة وايفاي.</p>'}
      <button class="btn" data-x="scan">${icon('search')} البحث عن الشبكات</button><div class="nets" style="margin-top:10px"></div>`;
  }
  const inst = $('[data-x=inst]', c);
  if (inst) inst.onclick = async () => { inst.disabled = true; toast('جارٍ التثبيت… قد يستغرق دقائق'); if (await guard(() => api.post('/api/admin/wifi/install', {}))) { toast('تم. أعد تشغيل الجهاز إن لم تظهر البطاقة', 'ok'); reload(); } inst.disabled = false; };
  const fg = $('[data-x=forget]', c);
  if (fg) fg.onclick = async () => { if (await guard(() => api.del('/api/admin/wifi'))) reload(); };
  const scan = $('[data-x=scan]', c);
  if (scan) scan.onclick = async () => {
    scan.disabled = true; $('.nets', c).innerHTML = '<p class="muted">جارٍ البحث…</p>';
    const r = await guard(() => api.get('/api/admin/wifi/scan')); scan.disabled = false;
    if (!r) { $('.nets', c).innerHTML = ''; return; }
    $('.nets', c).innerHTML = r.networks.length ? '' : '<p class="muted">لم تُعثر على شبكات.</p>';
    for (const n of r.networks) {
      const bars = n.signal > -55 ? '▂▄▆█' : n.signal > -70 ? '▂▄▆' : '▂▄';
      const row = h(`<div class="tv-tile"><span class="ltr" style="width:40px">${bars}</span><div class="tv-tt"><b></b></div><button class="btn sm">اتصال</button></div>`);
      $('b', row).textContent = n.ssid;
      $('button', row).onclick = async () => {
        const pw = prompt(`كلمة مرور «${n.ssid}» (اتركها فارغة للشبكة المفتوحة)`); if (pw === null) return;
        toast('جارٍ الاتصال…');
        if (await guard(() => api.post('/api/admin/wifi', { ssid: n.ssid, password: pw }))) { toast('تم الاتصال', 'ok'); reload(); }
      };
      $('.nets', c).appendChild(row);
    }
  };
  return c;
}

// ------------------------------------------------------------------ الوقت ووضع بدون إنترنت
function timeCard(s, reload) {
  const c = h(`<div class="card" style="max-width:640px;margin-top:14px"><h4>${icon('clock')} الوقت والعمل بدون إنترنت</h4>
    <p class="muted small">وقت السيرفر الآن: <b class="ltr">${esc(s.now)}</b> · ${s.ntp ? 'يُضبط تلقائياً من الإنترنت' : 'يُضبط يدوياً'}</p>
    <button class="btn" data-x="mine">${icon('clock')} خذ الوقت من هذا الجهاز</button>
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><input class="field" type="datetime-local" name="dt" style="max-width:260px"><button class="btn sm" data-x="set">ضبط</button></div>
    <hr style="border:0;border-top:1px solid var(--border);margin:14px 0">
    <label class="check"><input type="checkbox" name="off" ${s.offline ? 'checked' : ''}> <b>وضع بدون إنترنت</b></label>
    <p class="muted small">يوقف كل اتصال يبدؤه السيرفر بالخارج: التحديثات التلقائية، وضبط الوقت من الإنترنت، والبحث عن تحديثات HOME ANAB. التحديث بعدها من فلاشة (لوحة التحكم ← عام).</p></div>`);
  const pad = (x) => String(x).padStart(2, '0');
  const now = new Date();
  $('[name=dt]', c).value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const setTime = async (v) => { if (await guard(() => api.post('/api/admin/time', { datetime: v }))) { toast('تم ضبط الوقت', 'ok'); reload(); } };
  $('[data-x=mine]', c).onclick = () => { const n = new Date(); setTime(`${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`); };
  $('[data-x=set]', c).onclick = () => setTime($('[name=dt]', c).value);
  $('[name=off]', c).onchange = async (e) => {
    if (await guard(() => api.post('/api/admin/offline', { on: e.target.checked }))) { toast(e.target.checked ? 'وضع بدون إنترنت مفعّل' : 'تم إيقاف وضع بدون إنترنت', 'ok'); reload(); }
    else e.target.checked = !e.target.checked;
  };
  return c;
}

// ------------------------------------------------------------------ البلوتوث
function btCard() {
  const c = h(`<div class="card" style="max-width:640px;margin-top:14px"><h4>${icon('activity')} البلوتوث ويد الألعاب</h4><div class="bb muted">جارٍ القراءة…</div></div>`);
  const b = $('.bb', c);
  const draw = (r) => {
    b.classList.remove('muted');
    if (!r.installed) {
      b.innerHTML = `<p>ثبّت دعم البلوتوث مرة واحدة (يحتاج إنترنت):</p><button class="btn primary" data-a="install">${icon('download')} تثبيت البلوتوث</button>`;
    } else if (!r.adapter) {
      b.innerHTML = '<p class="muted">لا يوجد محوّل بلوتوث في الجهاز. يمكنك شراء قطعة USB صغيرة للبلوتوث ووصلها.</p>';
    } else {
      b.innerHTML = `<div class="devs"></div>
        <p class="small muted" style="margin-top:10px"><b>يد بلايستيشن 5:</b> اضغط معاً زر <b>Create</b> (يسار اللوحة اللمسية) وزر <b>PS</b> حتى يبدأ الضوء بالوميض السريع، ثم اضغط «البحث»، ثم «ربط» مباشرة. بعدها تكفي ضغطة على <b>PS</b> لتتصل.</p>
        <button class="btn" data-a="scan">${icon('search')} البحث عن أجهزة</button>
        <button class="btn ghost" data-x="diag">🩺 تشخيص يد التحكم</button>`;
      const box = $('.devs', b);
      if (!r.devices.length) box.innerHTML = '<p class="muted">لا توجد أجهزة بعد.</p>';
      for (const dv of r.devices) {
        const row = h(`<div class="tv-tile"><span style="font-size:22px">${dv.icon === 'input-gaming' ? '🎮' : dv.icon && dv.icon.startsWith('audio') ? '🎧' : dv.icon === 'input-keyboard' ? '⌨️' : '🔵'}</span>
          <div class="tv-tt"><b></b><div class="muted small ltr">${esc(dv.mac)}</div></div>
          ${dv.connected ? '<span class="badge ok">متصل</span>' : dv.paired ? '<span class="badge">مقترن</span>' : ''}
          ${dv.paired ? '' : '<button class="btn primary sm" data-p="pair">ربط</button>'}
          ${dv.paired && !dv.connected ? '<button class="btn sm" data-p="pair">اتصال</button>' : ''}
          ${dv.paired ? '<button class="btn ghost icon sm danger" data-p="remove" title="إزالة">' + icon('trash') + '</button>' : ''}</div>`);
        $('b', row).textContent = dv.name;
        $$('[data-p]', row).forEach(x => x.onclick = () => act(x.dataset.p, dv.mac));
        box.appendChild(row);
      }
    }
    $$('[data-a]', b).forEach(x => x.onclick = () => act(x.dataset.a));
    const dg = $('[data-x=diag]', b); if (dg) dg.onclick = padDiag;
  };
  const padDiag = async () => {
    const d = await guard(() => api.get('/api/admin/pad/diag')); if (!d) return;
    const ok = (v) => (v ? '✅' : '❌');
    const k = d.kernel || [], m = d.modules || {}, bt = d.bt || {};
    const line = (t, v) => `<div style="margin:4px 0">${t} <span class="ltr" style="unicode-bidi:isolate">${esc(v)}</span></div>`;
    modal({ title: 'تشخيص يد التحكم', wide: true, body: `<div style="font-size:14px">
      ${line(`${ok(k.length)} النظام يرى اليد:`, k.map((x) => `${x.name} (${x.bus}, ${x.handlers})`).join(' | ') || 'لا')}
      ${line(`${ok(k.some((x) => /js\d/.test(x.handlers)))} ملف اليد للألعاب:`, (d.js || []).join(' | ') || '—')}
      ${line(`${ok(/\binput\b/.test(d.tv_groups || ''))} صلاحية التلفاز:`, d.tv_groups || '—')}
      ${line(`${ok(m.joydev && m.hid_playstation)} التعريفات:`, Object.entries(m).map(([n, v]) => n + (v ? '✓' : '✗')).join(' '))}
      ${line('🔵 البلوتوث:', bt.adapter || '—')}
      ${(bt.devices || []).map((x) => line('', `${x.name || x.mac} — paired:${x.paired} bonded:${x.bonded || '?'} trusted:${x.trusted} connected:${x.connected}`)).join('')}
      ${(d.log || []).length ? `<pre class="ltr" style="white-space:pre-wrap;font-size:12px;max-height:220px;overflow:auto;background:var(--bg2,#0001);padding:8px;border-radius:8px">${esc(d.log.join('\n'))}</pre>` : ''}
      <p class="muted small">صوّر هذه النافذة وأرسلها إن لم تعمل اليد.</p></div>` });
  };
  const act = async (a, mac) => {
    $$('button', b).forEach(x => { x.disabled = true; });
    toast({ install: 'جارٍ التثبيت…', scan: 'جارٍ البحث 15 ثانية…', pair: 'جارٍ الربط…', remove: 'جارٍ الإزالة…' }[a]);
    let r = null;
    try { r = await api.post(`/api/admin/bt/${a}`, { mac }); } catch (e) {
      const m = String(e.message || e);
      toast(/press the PS/i.test(m) ? 'تم الربط، لكن اليد لم تتصل بعد: اضغط زر PS في اليد مرة واحدة'
        : /not found|not available/i.test(m) ? 'لم نجد اليد: اضغط Create و PS معاً حتى يومض الضوء بسرعة، ثم «البحث» ثم «ربط» مباشرة'
        : /pairing failed/i.test(m) ? 'لم ينجح الربط. احذف اليد إن وُجدت، ثم ضعها في وضع الربط (Create + PS) وأعد المحاولة' : m, 'err');
    }
    if (r) { draw(r); if (a === 'pair') toast('تم الربط ✓ اضغط أي زر في اليد', 'ok'); }
    else $$('button', b).forEach(x => { x.disabled = false; });
  };
  api.get('/api/admin/bt').then(draw).catch(e => { b.textContent = e.message; });
  return c;
}
