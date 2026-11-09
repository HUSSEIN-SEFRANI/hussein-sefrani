// رسومات واجهة التلفاز: الشعار، الصور الرمزية للمستخدمين، أيقونات المربعات، ورسومات كلمة اليوم.

let uid = 0;
const nid = (p) => `${p}${++uid}`;

export function falcon(size = 54) {
  const a = nid("fb"), b = nid("fk");
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  <defs><linearGradient id="${a}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d2547"/><stop offset="1" stop-color="#1d5f9e"/></linearGradient>
  <linearGradient id="${b}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd25e"/><stop offset="1" stop-color="#e09a1a"/></linearGradient></defs>
  <rect width="100" height="100" rx="22" fill="url(#${a})"/>
  <path d="M20 100 C14 74 16 46 32 30 C44 18 64 15 75 25 C79 29 81 33 81 37 L71 48 C66 55 66 63 70 71 C73 79 76 90 77 100 Z" fill="#eef2f7"/>
  <path d="M29 35 C41 20 63 16 75 26 C78 29 79.5 33 79.5 36.5 L69 41 C64 43 61 48 59 56 C57.5 63 53 66 50.5 61 C48.5 56 50 49 46 47 C40 45 33 50 26 58 C23 50 24 42 29 35 Z" fill="#10213b"/>
  <path d="M71 31 C80 27 89.5 30.5 92 39.5 C93.5 46.5 90 53.5 84 59 C85.6 52.5 84.2 48 79.5 46.5 L71 46.5 Z" fill="url(#${b})"/>
  <circle cx="61" cy="34.5" r="6" fill="#ffcf4a"/><circle cx="61.4" cy="34.6" r="4.1" fill="#090c12"/><circle cx="62.8" cy="33.1" r="1.3" fill="#fff"/>
  <path d="M49 30.5 C56 28.5 65 27.5 74 27 L69.5 32.5 C64.5 31 58 31 51 32.5 Z" fill="#050b16"/></svg>`;
}

export function mascot(size = 150) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 150 150" aria-hidden="true">
  <ellipse cx="75" cy="98" rx="44" ry="42" fill="#1e3a8a"/><ellipse cx="75" cy="106" rx="28" ry="28" fill="#e0f2fe"/>
  <circle cx="75" cy="58" r="38" fill="#1e40af"/>
  <path d="M44 66 C44 48 58 38 75 38 C92 38 106 48 106 66 C98 74 86 78 75 78 C64 78 52 74 44 66 Z" fill="#e0f2fe"/>
  <circle cx="62" cy="58" r="10" fill="#fff"/><circle cx="88" cy="58" r="10" fill="#fff"/>
  <circle cx="64" cy="59" r="5.5" fill="#0f172a"/><circle cx="86" cy="59" r="5.5" fill="#0f172a"/>
  <circle cx="66" cy="57" r="1.8" fill="#fff"/><circle cx="88" cy="57" r="1.8" fill="#fff"/>
  <path d="M67 70 L83 70 L75 84 Z" fill="#f59e0b"/>
  <path d="M30 96 C20 86 22 70 32 66 C36 80 40 90 46 96 Z" fill="#1e3a8a"/><path d="M120 96 C130 86 128 70 118 66 C114 80 110 90 104 96 Z" fill="#1e3a8a"/>
  <circle cx="54" cy="72" r="5" fill="#fda4af" opacity=".8"/><circle cx="96" cy="72" r="5" fill="#fda4af" opacity=".8"/></svg>`;
}

// --------------------------------------------------------------- الصور الرمزية (12 شكلاً)
const FACE = (skin, y = 70, r = 30) => `<circle cx="84" cy="${y}" r="${r}" fill="${skin}"/>
  <circle cx="74" cy="${y + 2}" r="3.5" fill="#2b1d14"/><circle cx="94" cy="${y + 2}" r="3.5" fill="#2b1d14"/>
  <path d="M76 ${y + 16} Q84 ${y + 23} 92 ${y + 16}" stroke="#2b1d14" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const BODY = (c, y = 106) => `<path d="M34 168 C38 ${y + 18} 58 ${y} 84 ${y} C110 ${y} 130 ${y + 18} 134 168 Z" fill="${c}"/>`;
const CHEEKS = (y = 80) => `<circle cx="66" cy="${y}" r="5" fill="#fda4af" opacity=".8"/><circle cx="102" cy="${y}" r="5" fill="#fda4af" opacity=".8"/>`;

const AVATARS = [
  { bg: "#2563eb", label: "رجل", svg: () => BODY("#1e3a8a") + FACE("#fde7c8") +
      `<path d="M56 62 C58 40 72 32 86 32 C102 32 114 42 112 64 C106 52 94 48 84 50 C72 50 62 54 56 62 Z" fill="#3b2a20"/>` },
  { bg: "#db2777", label: "امرأة بحجاب", svg: () => `<path d="M40 112 C36 56 60 32 84 32 C108 32 132 56 128 112 C120 126 48 126 40 112 Z" fill="#7c3aed"/>` +
      BODY("#a78bfa", 110) + FACE("#f6d2b4", 72, 26) + `<path d="M58 70 C58 50 70 42 84 42 C98 42 110 50 110 70 C104 56 64 56 58 70 Z" fill="#7c3aed"/>` },
  { bg: "#0d9488", label: "امرأة", svg: () => `<path d="M44 110 C38 50 64 30 84 30 C104 30 130 50 124 110 Z" fill="#4a2c1d"/>` + BODY("#fbcfe8", 108) + FACE("#f6d2b4", 72, 28) },
  { bg: "#facc15", label: "بنت بضفيرتين", svg: () => `<circle cx="44" cy="70" r="16" fill="#7c2d12"/><circle cx="124" cy="70" r="16" fill="#7c2d12"/>` +
      BODY("#f472b6", 112) + FACE("#fde7c8", 74, 30) + CHEEKS(86) +
      `<path d="M54 66 C56 44 70 38 84 38 C98 38 112 44 114 66 C102 54 66 54 54 66 Z" fill="#7c2d12"/><circle cx="44" cy="70" r="5" fill="#f43f5e"/><circle cx="124" cy="70" r="5" fill="#f43f5e"/>` },
  { bg: "#a855f7", label: "بنت بفيونكة", svg: () => `<path d="M46 116 C40 56 64 36 84 36 C104 36 128 56 122 116 Z" fill="#1f2937"/>` +
      BODY("#fde047", 114) + FACE("#f6d2b4", 76, 28) + CHEEKS(88) +
      `<path d="M96 38 L118 28 L116 50 Z M96 38 L104 18 L120 30 Z" fill="#f43f5e"/><circle cx="100" cy="38" r="5" fill="#be123c"/>` },
  { bg: "#f97316", label: "ولد", svg: () => BODY("#22c55e", 110) + FACE("#fde7c8", 74, 30) + CHEEKS(86) +
      `<g fill="#1f2937"><circle cx="62" cy="50" r="12"/><circle cx="78" cy="42" r="13"/><circle cx="96" cy="43" r="13"/><circle cx="110" cy="54" r="11"/></g>` },
  { bg: "#fde047", label: "طفلان", svg: () => `<circle cx="60" cy="58" r="22" fill="#fb7185"/><circle cx="106" cy="50" r="22" fill="#38bdf8"/>
      <path d="M60 80 L64 112 M106 72 L100 112" stroke="#7c2d12" stroke-width="3"/><circle cx="84" cy="122" r="30" fill="#fff7ed"/>
      <circle cx="74" cy="118" r="4" fill="#1f2937"/><circle cx="94" cy="118" r="4" fill="#1f2937"/>
      <path d="M72 132 Q84 144 96 132" stroke="#1f2937" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="66" cy="128" r="5" fill="#fda4af"/><circle cx="102" cy="128" r="5" fill="#fda4af"/>` },
  { bg: "#38bdf8", label: "رضيع", svg: () => BODY("#fef08a", 116) + `<circle cx="84" cy="80" r="36" fill="#fde7c8"/>` +
      `<circle cx="72" cy="80" r="4" fill="#2b1d14"/><circle cx="96" cy="80" r="4" fill="#2b1d14"/><ellipse cx="84" cy="98" rx="7" ry="5" fill="#f472b6"/>` + CHEEKS(92) +
      `<path d="M84 44 C78 36 86 30 90 36" stroke="#a16207" stroke-width="4" fill="none" stroke-linecap="round"/>` },
  { bg: "#16a34a", label: "رجل بلحية", svg: () => BODY("#14532d") + FACE("#f1c9a5") +
      `<path d="M54 70 C54 100 70 108 84 108 C98 108 114 100 114 70 C110 92 100 96 84 96 C68 96 58 92 54 70 Z" fill="#3b2a20"/>` +
      `<path d="M56 62 C58 40 72 32 86 32 C102 32 114 42 112 64 C106 52 94 48 84 50 C72 50 62 54 56 62 Z" fill="#3b2a20"/>` },
  { bg: "#64748b", label: "جدة", svg: () => `<path d="M40 112 C36 56 60 32 84 32 C108 32 132 56 128 112 C120 126 48 126 40 112 Z" fill="#e2e8f0"/>` +
      BODY("#0f766e", 110) + FACE("#f1c9a5", 72, 26) + `<circle cx="74" cy="74" r="8" fill="none" stroke="#475569" stroke-width="2"/><circle cx="94" cy="74" r="8" fill="none" stroke="#475569" stroke-width="2"/>` },
  { bg: "#1e3a8a", label: "صقر", svg: () => `<g transform="translate(9 14)">${mascot(150).replace(/<svg[^>]*>|<\/svg>/g, "")}</g>` },
  { bg: "#fb923c", label: "قطة", svg: () => `<path d="M40 64 L52 22 L74 52 Z M128 64 L116 22 L94 52 Z" fill="#fdba74"/><circle cx="84" cy="90" r="50" fill="#fdba74"/>
      <circle cx="66" cy="82" r="6" fill="#1f2937"/><circle cx="102" cy="82" r="6" fill="#1f2937"/><path d="M78 98 L90 98 L84 105 Z" fill="#be185d"/>
      <path d="M40 100 L66 96 M40 112 L66 104 M128 100 L102 96 M128 112 L102 104" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round"/>` },
];
export const AVATAR_COUNT = AVATARS.length;
export const avatarLabels = AVATARS.map((a) => a.label);

export function avatar(n) {
  const a = AVATARS[((n | 0) % AVATARS.length + AVATARS.length) % AVATARS.length];
  return `<svg viewBox="0 0 168 168" aria-hidden="true" style="background:${a.bg}">${a.svg()}</svg>`;
}

// --------------------------------------------------------------- أيقونات المربعات (54×54)
const ICONS = {
  cartoon: `<rect x="6" y="14" width="42" height="30" rx="7" fill="#fff"/><path d="M23 22 L34 29 L23 36 Z" fill="#a855f7"/><circle cx="10" cy="9" r="4" fill="#fde047"/><circle cx="46" cy="49" r="3.5" fill="#fde047"/><path d="M20 14 L15 6 M34 14 L39 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  music: `<path d="M21 38 V14 L42 9 V33" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="38" r="6" fill="#fff"/><circle cx="37" cy="33" r="6" fill="#fff"/>`,
  animals: `<circle cx="14" cy="14" r="7" fill="#fff"/><circle cx="40" cy="14" r="7" fill="#fff"/><circle cx="27" cy="29" r="18" fill="#fff"/><circle cx="20" cy="26" r="2.6" fill="#14532d"/><circle cx="34" cy="26" r="2.6" fill="#14532d"/><ellipse cx="27" cy="35" rx="5" ry="3.6" fill="#14532d"/><path d="M27 38 v4" stroke="#14532d" stroke-width="2"/>`,
  math: `<rect x="6" y="6" width="19" height="19" rx="5" fill="#fff"/><rect x="29" y="6" width="19" height="19" rx="5" fill="#fde047"/><rect x="6" y="29" width="19" height="19" rx="5" fill="#fde047"/><rect x="29" y="29" width="19" height="19" rx="5" fill="#fff"/>
    <path d="M15.5 10.5v10M10.5 15.5h10" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/><path d="M33 15.5h11" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/><path d="M11.5 34l8 8M19.5 34l-8 8" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/><path d="M33 38.5h11" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/><circle cx="38.5" cy="33.5" r="2" fill="#2563eb"/><circle cx="38.5" cy="43.5" r="2" fill="#2563eb"/>`,
  games: `<path d="M15 16 H39 C46 16 50 23 50 32 C50 41 45 44 41 41 L35 36 H19 L13 41 C9 44 4 41 4 32 C4 23 8 16 15 16 Z" fill="#fff"/><rect x="14" y="24" width="4" height="11" rx="1.5" fill="#7c3aed"/><rect x="10.5" y="27.5" width="11" height="4" rx="1.5" fill="#7c3aed"/><circle cx="37" cy="26" r="3" fill="#facc15"/><circle cx="42" cy="31" r="3" fill="#06b6d4"/><circle cx="32" cy="31" r="3" fill="#f472b6"/>`,
  photos: `<rect x="6" y="12" width="42" height="32" rx="6" fill="#fff"/><circle cx="18" cy="23" r="4.5" fill="#fbbf24"/><path d="M10 40 L22 28 L30 35 L36 30 L44 40 Z" fill="#34d399"/>`,
  video: `<rect x="6" y="14" width="30" height="27" rx="6" fill="#fff"/><path d="M36 23 L48 16 V39 L36 32 Z" fill="#fff"/><path d="M17 21 L27 27.5 L17 34 Z" fill="#6366f1"/>`,
  quran: `<path d="M27 16 C20 11 11 10 5 12 V44 C11 42 20 43 27 48 C34 43 43 42 49 44 V12 C43 10 34 11 27 16 Z" fill="#fff"/><path d="M27 16 V48" stroke="#0f766e" stroke-width="2"/>
    <path d="M38 4 a6 6 0 1 0 6 8 a4.6 4.6 0 1 1 -6 -8 Z" fill="#fde047"/><path d="M10 22 h12 M10 28 h12 M10 34 h12 M32 22 h12 M32 28 h12 M32 34 h12" stroke="#0f766e" stroke-width="2" stroke-linecap="round" opacity=".55"/>`,
  book: `<rect x="10" y="6" width="34" height="42" rx="4" fill="#fff"/><rect x="10" y="6" width="7" height="42" rx="2" fill="#fde047"/><path d="M22 16 h16 M22 23 h16 M22 30 h10" stroke="#475569" stroke-width="2.6" stroke-linecap="round"/>`,
  film: `<rect x="8" y="10" width="38" height="34" rx="4" fill="#fff"/><g fill="#ef4444"><rect x="11" y="14" width="5" height="5" rx="1"/><rect x="11" y="24" width="5" height="5" rx="1"/><rect x="11" y="34" width="5" height="5" rx="1"/><rect x="38" y="14" width="5" height="5" rx="1"/><rect x="38" y="24" width="5" height="5" rx="1"/><rect x="38" y="34" width="5" height="5" rx="1"/></g><path d="M23 20 L33 27 L23 34 Z" fill="#111827"/>`,
  star: `<path d="M27 5 L33.5 19 L49 20.5 L37.5 31 L41 46 L27 38 L13 46 L16.5 31 L5 20.5 L20.5 19 Z" fill="#fff"/><circle cx="22" cy="26" r="2" fill="#f59e0b"/><circle cx="32" cy="26" r="2" fill="#f59e0b"/><path d="M23 31 Q27 34 31 31" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  heart: `<path d="M27 46 C14 37 5 29 5 19 C5 12 10 7 17 7 C21.5 7 25 9.5 27 13 C29 9.5 32.5 7 37 7 C44 7 49 12 49 19 C49 29 40 37 27 46 Z" fill="#fff"/>`,
  science: `<ellipse cx="27" cy="27" rx="21" ry="8" fill="none" stroke="#fff" stroke-width="3"/><ellipse cx="27" cy="27" rx="21" ry="8" fill="none" stroke="#fff" stroke-width="3" transform="rotate(60 27 27)"/><ellipse cx="27" cy="27" rx="21" ry="8" fill="none" stroke="#fff" stroke-width="3" transform="rotate(-60 27 27)"/><circle cx="27" cy="27" r="5" fill="#fde047"/>`,
  letters: `<text x="27" y="30" text-anchor="middle" font-family="Baloo Bhaijaan 2, Cairo, sans-serif" font-weight="800" font-size="26" fill="#fff">أ ب</text><text x="27" y="50" text-anchor="middle" font-family="Baloo Bhaijaan 2, sans-serif" font-weight="800" font-size="17" fill="#fde047">A B C</text>`,
  nature: `<rect x="24" y="30" width="6" height="18" rx="2" fill="#a16207"/><circle cx="27" cy="20" r="13" fill="#fff"/><circle cx="17" cy="28" r="8" fill="#fff"/><circle cx="37" cy="28" r="8" fill="#fff"/><circle cx="22" cy="18" r="2.5" fill="#f43f5e"/><circle cx="33" cy="24" r="2.5" fill="#f43f5e"/>`,
  sport: `<circle cx="27" cy="27" r="21" fill="#fff"/><path d="M27 15 L36 21 L33 32 L21 32 L18 21 Z" fill="#111827"/><path d="M27 15 V6 M36 21 L45 17 M33 32 L39 41 M21 32 L15 41 M18 21 L9 17" stroke="#111827" stroke-width="2"/>`,
  folder: `<path d="M5 14 C5 11 7 9 10 9 H21 L26 14 H44 C47 14 49 16 49 19 V40 C49 43 47 45 44 45 H10 C7 45 5 43 5 40 Z" fill="#fde68a"/><path d="M5 20 H49 V40 C49 43 47 45 44 45 H10 C7 45 5 43 5 40 Z" fill="#fbbf24"/>`,
  audio: `<circle cx="27" cy="27" r="22" fill="rgba(255,255,255,.18)"/><path d="M22 36 V16 L38 12 V31" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="36" r="5" fill="#fff"/><circle cx="34" cy="31" r="5" fill="#fff"/>`,
  pdf: `<path d="M12 5 H34 L44 15 V49 H12 Z" fill="#fff"/><path d="M34 5 V15 H44" fill="#cbd5e1"/><path d="M18 24 h20 M18 31 h20 M18 38 h13" stroke="#64748b" stroke-width="2.6" stroke-linecap="round"/>`,
  play: `<path d="M18 12 L42 27 L18 42 Z" fill="#fff"/>`,
};
export const iconNames = Object.keys(ICONS);
export function icon(name) {
  return `<svg viewBox="0 0 54 54" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`;
}

export function gradient(color) {
  const [a, b] = String(color || "#6366f1,#8b5cf6").split(",");
  return `linear-gradient(135deg,${a},${b || a})`;
}

// --------------------------------------------------------------- رسومات كلمة اليوم
const WORD_ART = {
  sun: `<circle cx="40" cy="40" r="17" fill="#fcd34d"/><g stroke="#fcd34d" stroke-width="5" stroke-linecap="round"><path d="M40 6v10M40 64v10M6 40h10M64 40h10M16 16l7 7M57 57l7 7M16 64l7-7M57 23l7-7"/></g><circle cx="34" cy="38" r="2.5" fill="#7c2d12"/><circle cx="46" cy="38" r="2.5" fill="#7c2d12"/><path d="M33 46 Q40 52 47 46" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  moon: `<path d="M50 10 a30 30 0 1 0 20 46 a24 24 0 1 1 -20 -46 Z" fill="#fde68a"/><circle cx="18" cy="16" r="2.5" fill="#fff"/><circle cx="66" cy="22" r="2" fill="#fff"/>`,
  cat: `<path d="M14 26 L20 8 L32 22 Z M66 26 L60 8 L48 22 Z" fill="#fb923c"/><circle cx="40" cy="44" r="26" fill="#fb923c"/><circle cx="31" cy="40" r="3.5" fill="#1f2937"/><circle cx="49" cy="40" r="3.5" fill="#1f2937"/><path d="M37 48 L43 48 L40 52 Z" fill="#be185d"/><path d="M14 50 L28 48 M14 56 L28 52 M66 50 L52 48 M66 56 L52 52" stroke="#1f2937" stroke-width="1.6" stroke-linecap="round"/>`,
  star: `<path d="M40 6 L49 28 L73 29 L54 44 L61 68 L40 54 L19 68 L26 44 L7 29 L31 28 Z" fill="#fde047"/>`,
  tree: `<rect x="35" y="48" width="10" height="26" rx="3" fill="#a16207"/><circle cx="40" cy="32" r="22" fill="#22c55e"/><circle cx="26" cy="44" r="12" fill="#16a34a"/><circle cx="54" cy="44" r="12" fill="#16a34a"/>`,
  apple: `<path d="M40 24 C30 14 10 18 12 42 C14 62 28 74 40 68 C52 74 66 62 68 42 C70 18 50 14 40 24 Z" fill="#ef4444"/><path d="M40 24 C40 16 44 10 50 8" stroke="#78350f" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M44 14 C52 6 62 10 62 10 C58 18 50 18 44 14 Z" fill="#22c55e"/>`,
  house: `<path d="M10 38 L40 12 L70 38 Z" fill="#ef4444"/><rect x="18" y="36" width="44" height="34" fill="#fde68a"/><rect x="34" y="50" width="12" height="20" fill="#92400e"/><rect x="22" y="42" width="9" height="9" fill="#38bdf8"/><rect x="49" y="42" width="9" height="9" fill="#38bdf8"/>`,
  book: `<path d="M40 20 C30 12 18 12 8 14 V66 C18 64 30 64 40 72 C50 64 62 64 72 66 V14 C62 12 50 12 40 20 Z" fill="#fff"/><path d="M40 20 V72" stroke="#2563eb" stroke-width="3"/><path d="M14 28h18M14 38h18M48 28h18M48 38h18" stroke="#93c5fd" stroke-width="3" stroke-linecap="round"/>`,
  fish: `<path d="M12 40 C24 18 52 18 62 40 C52 62 24 62 12 40 Z" fill="#38bdf8"/><path d="M60 40 L76 26 V54 Z" fill="#0ea5e9"/><circle cx="26" cy="36" r="3.5" fill="#0f172a"/>`,
  bird: `<ellipse cx="38" cy="44" rx="24" ry="18" fill="#60a5fa"/><circle cx="56" cy="30" r="12" fill="#60a5fa"/><path d="M66 30 L76 33 L66 36 Z" fill="#f59e0b"/><circle cx="58" cy="28" r="2.5" fill="#0f172a"/><path d="M22 40 C30 30 44 32 46 44 C38 50 28 50 22 40 Z" fill="#2563eb"/>`,
  ball: `<circle cx="40" cy="40" r="28" fill="#f43f5e"/><path d="M12 40 H68 M40 12 C26 26 26 54 40 68 M40 12 C54 26 54 54 40 68" stroke="#fff" stroke-width="4" fill="none"/>`,
  heart: `<path d="M40 70 C20 56 6 44 6 28 C6 18 14 10 24 10 C31 10 37 14 40 20 C43 14 49 10 56 10 C66 10 74 18 74 28 C74 44 60 56 40 70 Z" fill="#f43f5e"/>`,
  flower: `<g fill="#f472b6"><circle cx="40" cy="22" r="11"/><circle cx="56" cy="34" r="11"/><circle cx="50" cy="52" r="11"/><circle cx="30" cy="52" r="11"/><circle cx="24" cy="34" r="11"/></g><circle cx="40" cy="38" r="9" fill="#fde047"/>`,
  car: `<path d="M8 50 V40 L20 26 H54 L66 40 H72 V50 Z" fill="#ef4444"/><path d="M24 30 H38 V40 H16 Z M42 30 H52 L60 40 H42 Z" fill="#bae6fd"/><circle cx="24" cy="54" r="8" fill="#1f2937"/><circle cx="56" cy="54" r="8" fill="#1f2937"/>`,
  water: `<path d="M40 8 C30 26 18 38 18 50 C18 62 28 72 40 72 C52 72 62 62 62 50 C62 38 50 26 40 8 Z" fill="#38bdf8"/><path d="M30 52 C30 58 34 62 40 62" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  cloud: `<path d="M18 60 C6 60 6 42 18 40 C18 26 36 20 44 32 C50 20 70 24 68 40 C78 42 78 60 66 60 Z" fill="#fff" stroke="#93c5fd" stroke-width="3"/>`,
};
export function wordArt(name, size = 76) {
  const body = WORD_ART[name] || `<circle cx="40" cy="40" r="30" fill="#fde68a"/><text x="40" y="52" text-anchor="middle" font-size="34" font-weight="800" fill="#b45309" font-family="Baloo Bhaijaan 2, sans-serif">أ</text>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" aria-hidden="true">${body}</svg>`;
}

export function cake(size = 60) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="32" width="44" height="24" rx="5" fill="#f9a8d4"/><path d="M10 40 C16 44 22 36 28 40 C34 44 40 36 46 40 C50 42 52 40 54 39" stroke="#fff" stroke-width="3" fill="none"/>
  <rect x="6" y="54" width="52" height="5" rx="2.5" fill="#be185d"/><g fill="#fde047"><rect x="20" y="20" width="4" height="12" rx="1"/><rect x="30" y="18" width="4" height="14" rx="1"/><rect x="40" y="20" width="4" height="12" rx="1"/></g>
  <g fill="#f97316"><ellipse cx="22" cy="16" rx="2.6" ry="4"/><ellipse cx="32" cy="14" rx="2.6" ry="4"/><ellipse cx="42" cy="16" rx="2.6" ry="4"/></g></svg>`;
}

export const LOCK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
export const CHEVRON = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
export const PLAY = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
export const PAUSE = `<svg width="60" height="60" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`;
export const BIGPLAY = `<svg width="64" height="64" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
export const BACKSP = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>`;
export const CHECK = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>`;
export const CLOUD = `<svg viewBox="0 0 260 90" aria-hidden="true"><path d="M30 80 C0 80 0 46 30 44 C30 20 64 10 82 28 C96 0 150 4 156 36 C190 26 214 48 206 66 C236 64 246 80 226 80 Z" fill="#fff"/></svg>`;
