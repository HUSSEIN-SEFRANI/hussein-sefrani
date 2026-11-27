// بيانات «اكتشف بلجيكا»: الشخصيات الخمس عشرة والمدن الست (ومعالم كل مدينة ترسم في الخلفية: bg)
window.BEL = {
  CH: [
    { n: "برق", p: "speed", pl: "السرعة", d: "يركض أسرع بمرة ونصف", body: "#FDDA24", pants: "#222", hat: "cap", hc: "#EF3340", skin: "#f2c29b" },
    { n: "جمرة", p: "fire", pl: "النار", d: "يرمي كرات نار ترتدّ على الأرض", body: "#e5392f", pants: "#5a1a14", hat: "band", hc: "#ffb020", skin: "#e9b48a" },
    { n: "فارس", p: "sword", pl: "السيف", d: "ضربة سيف تهزم الأعداء وتكسر الطوب", body: "#9aa6b2", pants: "#3a4350", hat: "helmet", hc: "#c9d2dc", skin: "#f2c29b", item: "sword" },
    { n: "ثلج", p: "ice", pl: "التجميد", d: "يجمّد الأعداء فيصبحون بلا خطر", body: "#7fd3f5", pants: "#22577a", hat: "hood", hc: "#e8f8ff", skin: "#f6d3b5" },
    { n: "زرافة", p: "legs", pl: "الساقان الطويلتان", d: "قفزة عالية جداً", body: "#f39c34", pants: "#6b3d12", hat: "cap", hc: "#6b3d12", skin: "#d9a273", legs: 20 },
    { n: "رأسون", p: "head", pl: "الرأس الكبير", d: "يكسر الطوب برأسه ومعه قلب إضافي", body: "#3fa34d", pants: "#1f4d26", hat: "none", hc: "#3b2412", skin: "#f2c29b", big: 1 },
    { n: "ريشة", p: "double", pl: "القفزة المزدوجة", d: "يقفز مرة ثانية في الهواء", body: "#f7a8c8", pants: "#7a2c52", hat: "band", hc: "#fff", skin: "#f6d3b5" },
    { n: "درع", p: "shield", pl: "الدرع", d: "فقاعة حماية لثلاث ثوانٍ", body: "#2c4fa3", pants: "#15264f", hat: "helmet", hc: "#FDDA24", skin: "#c98e62" },
    { n: "مغناطيس", p: "magnet", pl: "المغناطيس", d: "يجذب الوافل والشوكولاتة من بعيد", body: "#7b4bc4", pants: "#2e1a52", hat: "top", hc: "#1b1b1b", skin: "#f2c29b" },
    { n: "نسر", p: "glide", pl: "الطيران الشراعي", d: "اضغط القفز في الهواء ليهبط ببطء", body: "#8a5a33", pants: "#3d2614", hat: "beret", hc: "#1b1b1b", skin: "#e0aa7e", cape: "#EF3340" },
    { n: "طيف", p: "ghost", pl: "الشبح", d: "يمرّ عبر الأعداء لثوانٍ", body: "#c7ccd6", pants: "#6d7482", hat: "hood", hc: "#aeb5c2", skin: "#eef0f4" },
    { n: "رعد", p: "thunder", pl: "الصاعقة", d: "يهزم كل الأعداء الظاهرين على الشاشة", body: "#2b2b2b", pants: "#111", hat: "spike", hc: "#FDDA24", skin: "#f2c29b" },
    { n: "مطرقة", p: "hammer", pl: "الضربة الأرضية", d: "اضغط القوة في الهواء لتضرب الأرض", body: "#b5452c", pants: "#4a1d12", hat: "helmet", hc: "#ffcf3a", skin: "#c98e62", item: "hammer" },
    { n: "ساعة", p: "time", pl: "إبطاء الزمن", d: "الأعداء يتحرّكون بنصف السرعة", body: "#1f9e93", pants: "#0d4a45", hat: "top", hc: "#0d4a45", skin: "#f2c29b" },
    { n: "حظ", p: "luck", pl: "الحظ", d: "كل النقاط مضاعفة", body: "#2e8b57", pants: "#14402a", hat: "beret", hc: "#e8c25a", skin: "#f6d3b5" },
  ],
  // مدة الانتظار بين استعمالين للقوة (إطارات، 60 في الثانية)
  CD: { fire: 18, ice: 26, sword: 26, shield: 600, ghost: 480, thunder: 900, hammer: 30 },
  CITIES: [
    { n: "بروكسل", e: "🏛️", bg: "bxl", sky: ["#6fc3f0", "#dff3ff"], gr: ["#3a3c41", "#8c8f96", "#70737a"], water: 0, gap: 0.28, sp: 0.35, pg: 0.08 },
    { n: "بروج", e: "🛶", bg: "bru", sky: ["#f6b98a", "#fff1de"], gr: ["#3d2f2a", "#a5503a", "#7d3a28"], water: 1, gap: 0.32, sp: 0.4, pg: 0.15 },
    { n: "غنت", e: "🏰", bg: "gnt", sky: ["#8fb8de", "#eef4fb"], gr: ["#34363a", "#7f7a70", "#5f5b53"], water: 1, gap: 0.34, sp: 0.45, pg: 0.18 },
    { n: "أنتويرب", e: "💎", bg: "ant", sky: ["#9fd0e6", "#f2fbff"], gr: ["#2f3135", "#6d7480", "#565c66"], water: 0, gap: 0.36, sp: 0.45, pg: 0.22 },
    { n: "لييج", e: "🚉", bg: "lie", sky: ["#b3c7e6", "#f4f0ea"], gr: ["#2e2f33", "#8a7d6c", "#6b5f50"], water: 1, gap: 0.4, sp: 0.5, pg: 0.25 },
    { n: "دينان", e: "🎷", bg: "din", sky: ["#7fc1e0", "#e9f7ee"], gr: ["#33302c", "#8f8a80", "#6e6a61"], water: 1, gap: 0.42, sp: 0.5, pg: 0.3 },
  ],
};
