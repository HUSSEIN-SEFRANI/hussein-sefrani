// HOME ANAB — نجوم العائلة: الرصيد، الإهداء، والإضافة والخصم للأب والأم (من الهاتف أو الكمبيوتر)
import { ME, $, h, esc, icon, api, guard, toast, form, registerApp, fmtDateTime } from '../core.js';

const REASONS = {
  give: ['ترتيب الغرفة 🧹', 'المساعدة في البيت 🏠', 'الصلاة في وقتها 🕌', 'قراءة القرآن 📖', 'إنهاء الواجبات 📚', 'إنهاء الطعام 🍽️', 'النوم مبكراً 😴', 'الكلام اللطيف 💬', 'مشاركة الإخوة 🤝'],
  take: ['عدم سماع الكلام', 'الشجار', 'التأخر عن النوم', 'عدم ترتيب الأغراض', 'الكلام غير اللطيف'],
  transfer: ['هدية 🎁', 'شكراً لمساعدتك 🙏', 'لأنك لطيف 💖', 'تهنئة 🎉', 'أردّ ما استلفته 🤝'],
};

registerApp({
  id: 'stars', title: 'نجوم العائلة', icon: 'star', color: 'linear-gradient(135deg,#fbbf24,#f97316)', width: 820, height: 640,
  open(win) {
    win.body.innerHTML = '<div class="scroll stars-app"></div>';
    const box = $('.scroll', win.body);
    let d = null;
    const face = (p) => `<span class="st-ava" translate="no">${p.photo_v ? `<img src="/api/users/${p.id}/photo?v=${p.photo_v}" alt="">` : esc((p.name || '?').slice(0, 1))}</span>`;
    const line = (x) => {
      const n = (v) => `<bdi translate="no">${esc(v || '?')}</bdi>`;
      const who = x.kind === 'transfer' ? `${n(x.from)} ← ${n(x.to)}` : x.kind === 'give' ? `${n(x.by)} <span>أعطى</span> ${n(x.to)}` : `${n(x.by)} <span>خصم من</span> ${n(x.to)}`;
      return `<tr><td>${who}</td><td class="${x.kind === 'take' ? 'bad' : 'good'}" translate="no">${x.kind === 'take' ? '−' : '+'}${x.amount} ⭐</td><td translate="no">${esc(x.reason)}</td><td class="muted small">${fmtDateTime(x.ts)}</td></tr>`;
    };
    const draw = () => {
      const top1 = Math.max(0, ...d.people.map((p) => p.balance));
      box.innerHTML = `
        <div class="st-people">${[...d.people].sort((a, b) => b.balance - a.balance).map((p) => `<div class="st-p ${p.id === d.me ? 'me' : ''}">
          ${p.balance === top1 && top1 > 0 ? '<span class="st-crown">👑</span>' : ''}${face(p)}<b translate="no">${esc(p.name)}</b><span class="st-bal" translate="no">⭐ ${p.balance}</span></div>`).join('')
          || '<p class="muted">لا يوجد أفراد بعد. أضف ملفات العائلة من لوحة التحكم ← وضع التلفاز.</p>'}</div>
        <div class="st-acts">
          ${d.my_balance != null ? `<button class="btn primary" data-a="transfer">🎁 أهدِ نجوماً (رصيدك <span translate="no">${d.my_balance}</span>)</button>` : ''}
          ${d.can_manage ? '<button class="btn" data-a="give">➕ أضف نجوماً</button><button class="btn" data-a="take">➖ اخصم نجوماً</button>' : ''}
        </div>
        <h4 style="margin:18px 0 8px">${icon('list')} آخر الحركات</h4>
        ${d.log.length ? `<table class="tbl"><tbody>${d.log.map(line).join('')}</tbody></table>` : `<p class="muted">لا توجد حركات بعد. كل شخص يبدأ بـ <span translate="no">${d.start}</span> نجوم ⭐</p>`}`;
      box.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => act(b.dataset.a)));
    };
    const act = async (kind) => {
      const people = d.people.filter((p) => kind !== 'transfer' || p.id !== d.me);
      const title = { transfer: 'أهدِ نجوماً', give: 'أضف نجوماً', take: 'اخصم نجوماً' }[kind];
      const v = await form(title, [
        { name: 'to', label: 'لمن؟', type: 'select', options: people.map((p) => ({ value: p.id, label: `${p.name} (⭐ ${p.balance})` })) },
        { name: 'amount', label: 'كم نجمة؟', type: 'select', value: 1, options: [1, 2, 3, 5, 10, 20].map((n) => ({ value: n, label: String(n) })) },
        { name: 'preset', label: 'السبب', type: 'select', value: REASONS[kind][0], options: [...REASONS[kind].map((r) => ({ value: r, label: r })), { value: '', label: 'سبب آخر (اكتبه أدناه)' }] },
        { name: 'reason', label: 'سبب آخر', placeholder: 'اختياري إذا اخترت سبباً من القائمة' },
      ], { ok: title });
      if (!v) return;
      const reason = (v.reason || '').trim() || v.preset;
      if (!reason) { toast('اكتب السبب', 'err'); return; }
      const r = await guard(() => api.post(kind === 'transfer' ? '/api/stars/transfer' : '/api/stars/adjust', { to: +v.to, amount: +v.amount, reason, kind }));
      if (r) { d = r; draw(); toast(kind === 'take' ? 'تم الخصم' : 'تم ⭐', 'ok'); }
    };
    (async () => { d = await guard(() => api.get('/api/stars')); if (d) draw(); })();
  },
});
