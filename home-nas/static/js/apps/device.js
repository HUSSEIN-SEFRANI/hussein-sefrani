// ====================================================================
// لوحة التحكم ← الجهاز ← الشبكة والأجهزة: عنوان IP ثابت، الوايفاي، الوقت، وضع بدون إنترنت، البلوتوث
// ====================================================================
import { $, $$, h, esc, icon, api, guard, toast, confirmBox, modal } from '../core.js';

export async function deviceSection(sc, section) {
  const d = await guard(() => api.get('/api/admin/device')); if (!d) return;
  const reload = () => { sc.innerHTML = ''; deviceSection(sc, section); };
  const p = section(sc, 'الشبكة والأجهزة', 'عنوان السيرفر في الشبكة، والوايفاي، والوقت، ووضع العمل بدون إنترنت، وأجهزة البلوتوث مثل يد بلايستيشن.');
  if (!d.available) {
    p.appendChild(h(`<div class="card">${icon('info')} هذه الإعدادات متاحة على جهاز HOME ANAB المخصص (المثبّت من ملف ISO).</div>`));
    return;
  }
  p.appendChild(netCard(d.net, reload));
  p.appendChild(wifiCard(d.net.wifi || {}, reload));
  p.appendChild(timeCard(d.sys, reload));
  p.appendChild(btCard());
  p.appendChild(diagCard());
}

// ------------------------------------------------------------------ تشخيص الأجهزة
// لماذا لا يعمل الوايفاي أو البلوتوث أو صوت التلفاز؟ صورة واحدة (لقطة شاشة) تكفي لمعرفة السبب
function diagCard() {
  const c = h(`<div class="card" style="max-width:640px;margin-top:14px"><h4>${icon('activity')} تشخيص الأجهزة</h4>
    <p class="muted small" style="margin:0 0 8px">إن لم يعمل الوايفاي أو البلوتوث أو صوت التلفاز: اضغط «فحص»، ثم صوّر النتيجة وأرسلها.</p>
    <button class="btn" data-x="run">${icon('search')} فحص</button> <button class="btn ghost hidden" data-x="copy">نسخ النتيجة</button>
    <div class="dg" style="margin-top:10px;font-size:13px;line-height:1.7"></div></div>`);
  const box = $('.dg', c);
  let raw = '';
  $('[data-x=run]', c).onclick = async () => {
    box.innerHTML = '<p class="muted">جارٍ الفحص…</p>';
    const r = await guard(() => api.get('/api/admin/hwdiag')); if (!r) { box.innerHTML = ''; return; }
    raw = JSON.stringify(r, null, 1);
    $('[data-x=copy]', c).classList.remove('hidden');
    const ok = (b) => (b ? '✅' : '❌');
    const wl = r.net.filter((n) => n.wireless);
    const cd = r.usb.filter((u) => u.drivers.includes('usb-storage') && /^(0bda|0e8d|2357|148f|7392):/.test(u.id));
    const nodrv = r.usb.filter((u) => !u.drivers.length);
    const outs = (r.audio && r.audio.outputs) || [];
    box.innerHTML = `
      <div>${ok(wl.length)} <b>الوايفاي:</b> ${wl.length ? wl.map((n) => `<span class="ltr">${esc(n.name)}</span> (${esc(n.state)})`).join('، ') : 'لا توجد بطاقة'}</div>
      <div>${ok(r.bt.length)} <b>البلوتوث:</b> ${r.bt.length ? esc(r.bt.join('، ')) : 'لا يوجد'}</div>
      ${r.rfkill.filter((x) => x.soft || x.hard).map((x) => `<div>⚠️ ${esc(x.type)} <span class="ltr">${esc(x.name)}</span> مقفول ${x.hard ? '(بمفتاح في الجهاز)' : '(برمجياً)'}</div>`).join('')}
      ${cd.length ? `<div>⚠️ <b>بطاقة USB تظهر كقرص تعريفات</b> (<span class="ltr">${cd.map((u) => esc(u.id)).join(', ')}</span>): ${r.modeswitch ? 'أخرجها وأدخلها مرة أخرى.' : 'تحتاج أداة التحويل: حدّث النظام ثم أعد إدخالها.'}</div>` : ''}
      <div>${ok(r.monitors.length)} <b>الشاشة على منفذ الصوت (HDMI/DP):</b> ${r.monitors.length ? r.monitors.map((m) => `${esc(m.name || 'شاشة')} <span class="ltr">(${esc(m.card)} ${esc(m.pin)})</span>`).join('، ') : 'لم تُكتشف شاشة تدعم الصوت'}</div>
      <div>${ok(outs.some((o) => o.active && o.plugged))} <b>مخرج الصوت:</b> ${outs.length ? outs.map((o) => `${o.active ? '🔊' : '🔈'} ${esc(o.name)}${o.plugged ? ' (موصول)' : ''}`).join('، ') : 'لا توجد مخارج (شاشة التلفاز غير مفعّلة أو الصوت لا يعمل)'}</div>
      <details style="margin-top:6px"><summary>أجهزة USB (${r.usb.length})</summary>${r.usb.map((u) => `<div class="ltr" style="text-align:left">${esc(u.id)} ${esc(u.name)} → ${u.drivers.length ? esc(u.drivers.join(', ')) : '<b style="color:#dc2626">بلا تعريف</b>'}</div>`).join('')}</details>
      ${nodrv.length ? `<div>⚠️ ${nodrv.length} جهاز USB بلا تعريف</div>` : ''}
      ${r.firmware.length ? `<details open style="margin-top:6px"><summary>أخطاء التعريفات</summary>${r.firmware.map((l) => `<div class="ltr small" style="text-align:left">${esc(l)}</div>`).join('')}</details>` : ''}
      <pre class="small muted ltr" style="text-align:left;white-space:pre-wrap;margin-top:6px">${esc(r.sound)}</pre>
      ${(r.missing || []).length ? `<div class="alert warn small" style="margin-top:8px">🧩 تعريفات ناقصة لهذا الجهاز: <span class="ltr">${r.missing.map((m) => esc(m.pkg)).join(', ')}</span>
        <button class="btn primary sm" data-x="fwi">تثبيت التعريفات الناقصة (يحتاج إنترنت)</button></div>` : ''}
      ${r.sof_missing ? `<div class="alert warn small" style="margin-top:8px">🔇 لا توجد بطاقة صوت: تعريف الصوت في هذا الجهاز يحتاج ملفاً ناقصاً (SOF).
        <button class="btn primary sm" data-x="afix">إصلاح الصوت</button></div>` : ''}`;
    const fwi = $('[data-x=fwi]', box);
    if (fwi) fwi.onclick = async () => {
      fwi.disabled = true; toast('جارٍ تثبيت التعريفات… قد يستغرق دقائق');
      const x = await guard(() => api.post('/api/admin/fw-install', {})); fwi.disabled = false; if (!x) return;
      if (x.failed.length) toast('لم تُثبَّت: ' + x.failed.join(', '), 'err');
      if (x.reboot && await confirmBox('ثُبّتت التعريفات. يجب إعادة تشغيل الجهاز لتعمل. إعادة التشغيل الآن؟')) {
        await guard(() => api.post('/api/admin/power', { action: 'reboot' })); toast('يعاد التشغيل… انتظر دقيقتين', 'ok');
      }
    };
    const af = $('[data-x=afix]', box);
    if (af) af.onclick = async () => {
      af.disabled = true; toast('جارٍ الإصلاح… قد يستغرق دقائق');
      const x = await guard(() => api.post('/api/admin/audio-fix', {})); af.disabled = false; if (!x) return;
      if (await confirmBox('تم. يجب إعادة تشغيل الجهاز ليعمل الصوت. إعادة التشغيل الآن؟')) {
        await guard(() => api.post('/api/admin/power', { action: 'reboot' })); toast('يعاد التشغيل… انتظر دقيقتين', 'ok');
      }
    };
  };
  $('[data-x=copy]', c).onclick = async () => { try { await navigator.clipboard.writeText(raw); toast('نُسخت النتيجة', 'ok'); } catch { toast('تعذّر النسخ، صوّر الشاشة بدلاً منه', 'err'); } };
  return c;
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
      : 'سيأخذ السيرفر عنوانه من الراوتر تلقائياً. قد يتغير العنوان، فاستخدم اسم الجهاز (مثل home-anab.local) للوصول إليه.', { ok: 'تطبيق' })) return;
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
    // بطاقة وايفاي USB: تظهر هنا تلقائياً خلال ثوانٍ من توصيلها
    const t = setInterval(async () => {
      if (!c.isConnected) return clearInterval(t);
      const r = await api.get('/api/admin/device').catch(() => null);
      if (r && r.net && r.net.wifi && r.net.wifi.iface) { clearInterval(t); toast('ظهرت بطاقة الوايفاي', 'ok'); reload(); }
    }, 5000);
    b.innerHTML = `<p class="muted">لا توجد بطاقة وايفاي ظاهرة في هذا الجهاز. يمكنك وصل بطاقة وايفاي USB فتظهر هنا خلال ثوانٍ. إن لم تظهر فقد تحتاج تعريفاً:</p>
      <button class="btn" data-x="inst">${icon('download')} تثبيت تعريفات الوايفاي (يحتاج إنترنت)</button>
      <p class="muted small">بعد التثبيت أعد تشغيل الجهاز. الكابل أسرع وأثبت للسيرفر دائماً.</p>`;
  } else if (!w.installed) {
    b.innerHTML = `<p>بطاقة الوايفاي <b class="ltr">${esc(w.iface)}</b> موجودة. ثبّت أدوات الاتصال أولاً (يحتاج إنترنت عبر الكابل):</p>
      <button class="btn primary" data-x="inst">${icon('download')} تثبيت الوايفاي</button>`;
  } else {
    b.innerHTML = `${w.usb ? `<p class="muted small">${icon('wifi')} بطاقة وايفاي USB <span class="ltr">${esc(w.iface)}</span></p>` : ''}${w.ssid ? `<p>متصل بـ <b>${esc(w.ssid)}</b> ${w.ip ? `· <span class="ltr">${esc(w.ip)}</span>` : '<span class="badge warn">بلا عنوان</span>'}
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
    <p class="muted small">يوقف كل اتصال يبدؤه السيرفر بالخارج: التحديثات التلقائية، وضبط الوقت من الإنترنت، والبحث عن تحديثات HOME ANAB. التحديث بعدها من فلاشة (لوحة التحكم ← النظام ← عام والتحديث).</p></div>`);
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
      // الأجهزة بلا اسم (عنوان MAC فقط) مطوية: غالباً هواتف وأجهزة الجيران
      const nameless = r.devices.filter((dv) => dv.named === false && !dv.paired);
      const shown = r.devices.filter((dv) => !(dv.named === false && !dv.paired));
      if (nameless.length) {
        const more = h(`<button class="btn ghost sm" style="margin-top:6px">إظهار ${nameless.length} أجهزة بلا اسم</button>`);
        more.onclick = () => { more.remove(); draw({ ...r, devices: r.devices.map((dv) => ({ ...dv, named: true })) }); };
        setTimeout(() => box.appendChild(more));
      }
      for (const dv of shown) {
        const row = h(`<div class="tv-tile"><span style="font-size:22px">${dv.icon === 'input-gaming' ? '🎮' : dv.icon && dv.icon.startsWith('audio') ? '🎧' : dv.icon === 'input-keyboard' ? '⌨️' : '🔵'}</span>
          <div class="tv-tt"><b></b><div class="muted small ltr">${esc(dv.mac)}${dv.rssi != null ? ` · ${dv.rssi > -60 ? '▂▄▆█' : dv.rssi > -75 ? '▂▄▆' : '▂▄'}` : ''}</div></div>
          ${dv.connected ? '<span class="badge ok">متصل</span>' : dv.paired ? '<span class="badge">مقترن</span>' : ''}
          ${dv.paired ? '' : '<button class="btn primary sm" data-p="pair">ربط</button>'}
          ${dv.paired && !dv.connected ? '<button class="btn sm" data-p="pair">اتصال</button>' : ''}
          <button class="btn ghost icon sm danger" data-p="remove" title="إزالة من القائمة">${icon('trash')}</button></div>`);
        $('b', row).textContent = dv.name;
        $$('[data-p]', row).forEach(x => x.onclick = async () => {
          if (x.dataset.p === 'remove' && dv.paired && !(await confirmBox(`إزالة «${dv.name}»؟ ${dv.icon === 'input-gaming' ? 'لاستعمال اليد مرة أخرى ستحتاج إلى ربطها من جديد.' : 'لاستعماله مرة أخرى ستحتاج إلى ربطه من جديد.'}`, { ok: 'إزالة', danger: true }))) return;
          act(x.dataset.p, dv.mac);
        });
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
        : /could not remove/i.test(m) ? 'لم تنجح الإزالة. أطفئ الجهاز أو أبعده ثم حاول مرة أخرى'
        : /pairing failed/i.test(m) ? 'لم ينجح الربط. احذف اليد إن وُجدت، ثم ضعها في وضع الربط (Create + PS) وأعد المحاولة' : m, 'err');
    }
    if (r) { draw(r); if (a === 'pair') toast('تم الربط ✓ اضغط أي زر في اليد', 'ok'); }
    else $$('button', b).forEach(x => { x.disabled = false; });
  };
  api.get('/api/admin/bt').then(draw).catch(e => { b.textContent = e.message; });
  return c;
}
