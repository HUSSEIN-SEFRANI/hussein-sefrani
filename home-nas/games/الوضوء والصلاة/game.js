// الوضوء والصلاة — تعليم الأطفال الوضوء والصلاة خطوة بخطوة (على ما عليه جمهور أهل السنة)، مع ألعاب واختبار
(() => {
  "use strict";
  const GAME = "الوضوء والصلاة";
  const save = K.store("wudu", { kid: null, best: {} });
  const ar = (n) => Number(n).toLocaleString("ar-EG");
  const begin0 = K.begin; K.begin = () => { K.onFocus = null; begin0(); };

  // ---------------------------------------------------------------- واجهات السيرفر (تُتجاهل أخطاؤها)
  const report = (topic, ok) => { try { fetch("/api/tv/learn/result", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game: GAME, topic: String(topic).slice(0, 80), ok: !!ok }) }).catch(() => {}); } catch {} };
  const earn = (amount, reason) => { if (amount < 1) return;
    fetch("/api/tv/stars/earn", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, game: GAME, reason }) })
      .then((r) => (r.ok ? r.json() : null)).then((d) => {
        if (!d || !d.added) return;
        const s = K.app.querySelector(".screen"); if (!s) return;
        const e = document.createElement("div"); e.className = "earned"; e.innerHTML = `+${ar(d.added)} <span class="emo">⭐</span> أُضيفت إلى نجومك`;
        s.querySelector(".nav") ? s.insertBefore(e, s.querySelector(".nav")) : s.appendChild(e);
      }).catch(() => {}); };

  // ---------------------------------------------------------------- رسم الطفل (من الأمام) للوضوء
  const SKIN = "#f6c7a1", SKIND = "#c98a5c", Y = "#facc15";
  const kidOf = () => save.kid || "boy";
  const CROP = { mouth: "16 -22 168 136", nose: "16 -22 168 136", face: "16 -22 168 136", ears: "16 -22 168 136", head: "16 -22 168 136", say: "16 -22 204 136", heart: "10 -10 180 170", hands: "0 70 200 140", arms: "0 70 200 140", feet: "36 186 128 70" };
  function front(kid, hl, extra = "", crop = false) {
    const g = kid === "girl", shirt = g ? "#ec4899" : "#3b82f6", shirtD = g ? "#9d174d" : "#1e3a8a",
      low = g ? "#a855f7" : "#1e40af", hair = g ? "#6b3e1f" : "#3b2314";
    const limb = (pts, w, c, o) => `<polyline points="${pts}" fill="none" stroke="${o}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const s = [];
    if (g) s.push(`<circle cx="60" cy="70" r="15" fill="${hair}"/><circle cx="140" cy="70" r="15" fill="${hair}"/>`);
    s.push(limb("90,176 88,236", 17, SKIN, SKIND), limb("110,176 112,236", 17, SKIN, SKIND));
    s.push(`<ellipse cx="84" cy="242" rx="15" ry="8" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/><ellipse cx="116" cy="242" rx="15" ry="8" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/>`);
    s.push(g ? `<path d="M72 160 H128 L142 206 H58 Z" fill="${low}" stroke="#6b21a8" stroke-width="2.5" stroke-linejoin="round"/>`
             : `<path d="M70 166 H130 L134 200 H104 L100 188 L96 200 H66 Z" fill="${low}" stroke="#172554" stroke-width="2.5" stroke-linejoin="round"/>`);
    s.push(limb("74,104 56,140 50,170", 15, SKIN, SKIND), limb("126,104 144,140 150,170", 15, SKIN, SKIND));
    s.push(`<circle cx="49" cy="176" r="10" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/><circle cx="151" cy="176" r="10" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/>`);
    s.push(`<rect x="70" y="90" width="60" height="84" rx="18" fill="${shirt}" stroke="${shirtD}" stroke-width="2.5"/>`);
    s.push(`<circle cx="75" cy="105" r="14" fill="${shirt}" stroke="${shirtD}" stroke-width="2.5"/><circle cx="125" cy="105" r="14" fill="${shirt}" stroke="${shirtD}" stroke-width="2.5"/>`);
    s.push(`<rect x="76" y="94" width="48" height="30" rx="10" fill="${shirt}"/>`);
    s.push(`<rect x="92" y="80" width="16" height="14" fill="${SKIN}"/>`);
    s.push(`<circle cx="66" cy="58" r="9" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/><circle cx="134" cy="58" r="9" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/>`);
    s.push(`<circle cx="100" cy="56" r="34" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/>`);
    s.push(g ? `<path d="M66 54 Q64 18 100 18 Q136 18 134 54 Q128 34 112 32 Q100 42 84 36 Q72 40 66 54 Z" fill="${hair}"/>
               <path d="M118 22 l14 -10 v22 z M118 22 l-14 -10 v22 z" fill="#f472b6" stroke="#be185d" stroke-width="2"/><circle cx="118" cy="22" r="4" fill="#be185d"/>`
             : `<path d="M66 52 Q64 18 100 18 Q136 18 134 52 Q126 32 100 33 Q76 32 66 52 Z" fill="${hair}"/>`);
    s.push(`<circle cx="88" cy="54" r="4.5" fill="#1f2937"/><circle cx="112" cy="54" r="4.5" fill="#1f2937"/><circle cx="89.5" cy="52.5" r="1.4" fill="#fff"/><circle cx="113.5" cy="52.5" r="1.4" fill="#fff"/>
      <circle cx="80" cy="67" r="6" fill="#fb7185" opacity=".35"/><circle cx="120" cy="67" r="6" fill="#fb7185" opacity=".35"/>
      <path d="M100 58 q4 6 0 9" fill="none" stroke="${SKIND}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M90 75 Q100 83 110 75" fill="none" stroke="#9f1239" stroke-width="3" stroke-linecap="round"/>`);
    s.push(glow(hl), extra);
    return `<svg class="kid" viewBox="${crop && CROP[hl] ? CROP[hl] : "-20 -22 240 276"}" xmlns="http://www.w3.org/2000/svg">${s.join("")}</svg>`;
  }
  const drop = (x, y, d = 0) => `<path class="drop" style="animation-delay:${d}s" d="M${x} ${y - 7} Q${x + 6} ${y + 1} ${x} ${y + 5} Q${x - 6} ${y + 1} ${x} ${y - 7} Z" fill="#38bdf8" stroke="#0369a1" stroke-width="1.2"/>`;
  const num = (x, y, n) => `<circle cx="${x}" cy="${y}" r="11" fill="#fff" stroke="#0f766e" stroke-width="2.5"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="800" fill="#0f766e">${ar(n)}</text>`;
  function glow(hl) {
    const G = (sh) => `<g class="hl">${sh}</g>`, st = `fill="rgba(250,204,21,.28)" stroke="${Y}" stroke-width="5"`;
    switch (hl) {
      case "heart": return `<path class="beat" d="M100 146 C70 126 80 104 100 118 C120 104 130 126 100 146 Z" fill="#ef4444" stroke="#991b1b" stroke-width="2.5"/>`;
      case "say": return `<g class="pop"><rect x="122" y="-18" width="94" height="36" rx="14" fill="#fff" stroke="#0f766e" stroke-width="3"/><path d="M134 16 L118 46 L148 17 Z" fill="#fff" stroke="#0f766e" stroke-width="3" stroke-linejoin="round"/><rect x="133" y="12" width="16" height="6" fill="#fff"/>
        <text x="169" y="7" text-anchor="middle" font-size="19" font-weight="800" fill="#0f766e">بسم الله</text></g>`;
      case "hands": return G(`<circle cx="49" cy="176" r="17" ${st}/><circle cx="151" cy="176" r="17" ${st}/>`) + drop(49, 152) + drop(151, 152, .5);
      case "mouth": return G(`<ellipse cx="100" cy="77" rx="16" ry="10" ${st}/>`) + drop(116, 92, .2);
      case "nose": return G(`<ellipse cx="100" cy="62" rx="9" ry="12" ${st}/>`) + drop(114, 74, .2);
      case "face": return G(`<ellipse cx="100" cy="57" rx="32" ry="34" fill="rgba(250,204,21,.22)" stroke="${Y}" stroke-width="6"/>`) + drop(80, 30) + drop(118, 34, .6);
      case "arms": return G(`<polyline points="49,178 56,140 64,124" fill="none" stroke="rgba(250,204,21,.55)" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="151,178 144,140 136,124" fill="none" stroke="rgba(250,204,21,.55)" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>`)
        + drop(40, 130) + drop(160, 130, .7) + num(24, 196, 1) + num(176, 196, 2);
      case "head": return G(`<ellipse cx="100" cy="30" rx="38" ry="19" ${st}/>`) + `<path class="swipe" d="M72 4 Q100 -12 128 4" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 6"/>`;
      case "ears": return G(`<circle cx="66" cy="58" r="14" ${st}/><circle cx="134" cy="58" r="14" ${st}/>`);
      case "feet": return G(`<ellipse cx="84" cy="236" rx="22" ry="16" ${st}/><ellipse cx="116" cy="236" rx="22" ry="16" ${st}/>`) + drop(78, 210) + drop(122, 210, .6) + num(56, 250, 1) + num(144, 250, 2);
      case "done": return `<g class="pop"><text x="20" y="20" font-size="26">✨</text><text x="160" y="110" font-size="26">✨</text><text x="10" y="150" font-size="22">⭐</text></g>`;
    }
    return "";
  }

  // ---------------------------------------------------------------- رسم المصلّي (من الجانب)
  const P = {
    stand:  { H: [100, 42], N: [100, 62], S: [100, 68], E: [100, 96], W: [101, 120], P: [100, 118], K: [100, 148], A: [100, 176], T: [116, 181], look: 0 },
    takbir: { E: [114, 86], W: [119, 54] },
    qiyam:  { E: [108, 100], W: [117, 90] },
    ruku:   { H: [160, 114], N: [142, 112], S: [136, 114], E: [118, 130], W: [101, 146], P: [92, 112], K: [94, 148], A: [94, 176], T: [110, 181], look: 62 },
    sujud:  { H: [163, 166], N: [148, 164], S: [143, 162], E: [128, 165], W: [153, 180], P: [100, 146], K: [121, 177], A: [86, 171], T: [83, 182], look: 82 },
    julus:  { H: [98, 80], N: [96, 100], S: [96, 106], E: [104, 134], W: [121, 162], P: [94, 156], K: [128, 172], A: [94, 178], T: [79, 181], look: 8 },
  };
  P.takbir = { ...P.stand, ...P.takbir }; P.qiyam = { ...P.stand, ...P.qiyam }; P.itidal = P.stand;
  P.tasleem = { ...P.julus, front: true };
  function pose(kid, name, cls = "") {
    const j = P[name], g = kid === "girl";
    const cl = g ? "#f9a8d4" : "#f8fafc", ol = g ? "#9d174d" : "#475569";
    const pt = (...ks) => ks.map((k) => j[k].join(",")).join(" ");
    const line = (pts, w, c, o) => `<polyline points="${pts}" fill="none" stroke="${o}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const [hx, hy] = j.H;
    let head;
    if (j.front) {
      head = g ? `<circle cx="${hx}" cy="${hy}" r="19" fill="${cl}" stroke="${ol}" stroke-width="2.5"/><circle cx="${hx}" cy="${hy + 2}" r="12.5" fill="${SKIN}"/>`
               : `<circle cx="${hx}" cy="${hy}" r="16" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/><path d="M${hx - 16} ${hy - 3} A16 16 0 0 1 ${hx + 16} ${hy - 3} Z" fill="#fff" stroke="${ol}" stroke-width="2"/>`;
      head += `<circle cx="${hx - 5}" cy="${hy + 1}" r="2.2" fill="#1f2937"/><circle cx="${hx + 5}" cy="${hy + 1}" r="2.2" fill="#1f2937"/><path d="M${hx - 4} ${hy + 7} q4 3 8 0" fill="none" stroke="#9f1239" stroke-width="1.8" stroke-linecap="round"/>
        <path class="turn" d="M${hx + 24} ${hy - 6} q14 6 0 16" fill="none" stroke="#0f766e" stroke-width="3" stroke-linecap="round"/><path d="M${hx + 20} ${hy + 8} l5 3 l-1 -6" fill="#0f766e" stroke="#0f766e" stroke-width="2"/>
        <path d="M${hx - 24} ${hy - 6} q-14 6 0 16" fill="none" stroke="#0f766e" stroke-width="3" stroke-linecap="round" opacity=".45"/>`;
    } else {
      const face = g ? `<circle cx="${hx}" cy="${hy}" r="19" fill="${cl}" stroke="${ol}" stroke-width="2.5"/><circle cx="${hx + 5}" cy="${hy + 1}" r="12" fill="${SKIN}"/>
          <circle cx="${hx + 11}" cy="${hy - 1}" r="2.1" fill="#1f2937"/><path d="M${hx + 9} ${hy + 6} q3 2 6 0" fill="none" stroke="#9f1239" stroke-width="1.8" stroke-linecap="round"/>`
        : `<circle cx="${hx}" cy="${hy}" r="16" fill="${SKIN}" stroke="${SKIND}" stroke-width="2.5"/><path d="M${hx - 16} ${hy - 3} A16 16 0 0 1 ${hx + 16} ${hy - 3} Z" fill="#fff" stroke="${ol}" stroke-width="2"/>
          <circle cx="${hx + 9}" cy="${hy + 2}" r="2.1" fill="#1f2937"/><path d="M${hx + 8} ${hy + 8} q3 2 6 -1" fill="none" stroke="#9f1239" stroke-width="1.8" stroke-linecap="round"/><circle cx="${hx - 3}" cy="${hy + 3}" r="3.5" fill="${SKIN}" stroke="${SKIND}" stroke-width="1.5"/>`;
      head = `<g transform="rotate(${j.look} ${hx} ${hy})">${face}</g>`;
    }
    const legC = g ? cl : cl;
    return `<svg class="pose ${cls}" viewBox="34 14 172 182" xmlns="http://www.w3.org/2000/svg">
      <rect x="44" y="182" width="156" height="9" rx="3" fill="#16a34a"/><path d="M48 186.5 H196" stroke="#bbf7d0" stroke-width="1.5" stroke-dasharray="4 4"/>
      ${line(pt("P", "K", "A"), 14, legC, ol)}${line(pt("A", "T"), 7, SKIN, SKIND)}
      ${line(pt("N", "P"), 24, cl, ol)}
      ${line(pt("S", "E", "W"), 11, cl, ol)}<circle cx="${j.W[0]}" cy="${j.W[1]}" r="6" fill="${SKIN}" stroke="${SKIND}" stroke-width="2"/>
      ${head}</svg>`;
  }

  // ---------------------------------------------------------------- المحتوى
  // الوضوء: rank — الخطوات التي لها نفس الرتبة يجوز تبديلها في لعبة الترتيب (النية والتسمية معاً في البداية)
  const WUDU = [
    { k: "niyya", rank: 0, t: "النية", s: "النية", hl: "heart", n: 0, d: "انوِ بقلبك أنك تتوضأ لله تعالى. مكان النية هو القلب." },
    { k: "bism", rank: 0, t: "التسمية", s: "بسم الله", hl: "say", n: 0, d: "قل قبل أن تبدأ:", dh: "بِسْمِ اللَّهِ" },
    { k: "hands", rank: 1, t: "غسل الكفّين", s: "الكفّان", hl: "hands", n: 3, d: "اغسل كفّيك جيداً، وخلّل بين أصابعك." },
    { k: "mouth", rank: 2, t: "المضمضة", s: "المضمضة", hl: "mouth", n: 3, d: "خذ ماءً بيدك اليمنى، وحرّكه في فمك، ثم أخرجه." },
    { k: "nose", rank: 3, t: "الاستنشاق", s: "الاستنشاق", hl: "nose", n: 3, d: "أدخل الماء إلى أنفك بلطف بيدك اليمنى، ثم أخرجه بيدك اليسرى." },
    { k: "face", rank: 4, t: "غسل الوجه", s: "الوجه", hl: "face", n: 3, d: "اغسل وجهك كله: من منابت شعر الرأس إلى الذقن، ومن الأذن إلى الأذن." },
    { k: "arms", rank: 5, t: "غسل اليدين إلى المرفقين", s: "اليدان", hl: "arms", n: 3, d: "اغسل يدك اليمنى من أطراف الأصابع حتى المرفق، ثم اليسرى مثلها." },
    { k: "head", rank: 6, t: "مسح الرأس", s: "الرأس", hl: "head", n: 1, d: "بلّل يديك وامسح رأسك من الأمام إلى الخلف، ثم ارجع بهما إلى الأمام." },
    { k: "ears", rank: 7, t: "مسح الأذنين", s: "الأذنان", hl: "ears", n: 1, d: "امسح أذنيك: السبّابتان داخل الأذنين، والإبهامان خلفهما." },
    { k: "feet", rank: 8, t: "غسل الرجلين إلى الكعبين", s: "الرجلان", hl: "feet", n: 3, d: "اغسل رجلك اليمنى مع الكعبين وبين الأصابع، ثم اليسرى مثلها." },
  ];
  const WUDU_DUA = "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ";

  const BREAKS = [
    { e: "🚽", t: "البول والغائط", yes: true },
    { e: "💨", t: "خروج الريح", yes: true },
    { e: "😴", t: "النوم العميق", yes: true },
    { e: "😵", t: "الإغماء وفقدان الوعي", yes: true },
    { e: "🥤", t: "شرب الماء", yes: false },
    { e: "🍎", t: "أكل التفاحة", yes: false },
    { e: "🗣️", t: "الكلام مع أهلي", yes: false },
    { e: "🏃", t: "الجري واللعب", yes: false },
    { e: "📖", t: "قراءة كتاب", yes: false },
    { e: "🙂", t: "الابتسامة", yes: false },
  ];

  const PRAYERS = [
    { k: "fajr", t: "الفجر", r: 2, when: "قبل شروق الشمس", sky: ["#1e3a8a", "#f9a8d4"], sun: [50, 92], moon: false },
    { k: "dhuhr", t: "الظهر", r: 4, when: "بعد منتصف النهار", sky: ["#38bdf8", "#bae6fd"], sun: [50, 22], moon: false },
    { k: "asr", t: "العصر", r: 4, when: "بعد الظهر، والشمس ما زالت في السماء", sky: ["#0ea5e9", "#fde68a"], sun: [26, 46], moon: false },
    { k: "maghrib", t: "المغرب", r: 3, when: "بعد غروب الشمس مباشرة", sky: ["#7c3aed", "#fb923c"], sun: [50, 78], moon: false },
    { k: "isha", t: "العشاء", r: 4, when: "عندما يحلّ الليل ويظلم", sky: ["#0f172a", "#312e81"], sun: null, moon: true },
  ];
  const skySvg = (p) => `<svg viewBox="0 0 100 80" class="skyp" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g${p.k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>
    <rect width="100" height="80" fill="url(#g${p.k})"/>
    ${p.sun ? `<circle cx="${p.sun[0]}" cy="${p.sun[1]}" r="11" fill="${p.k === "maghrib" ? "#f97316" : p.k === "fajr" ? "#fdba74" : "#fde047"}" opacity="${p.k === "fajr" ? .8 : 1}"/>` : ""}
    ${p.moon ? `<circle cx="64" cy="22" r="10" fill="#fef9c3"/><circle cx="69" cy="19" r="9" fill="#1e1b4b"/><circle cx="20" cy="14" r="1.4" fill="#fff"/><circle cx="36" cy="30" r="1" fill="#fff"/><circle cx="84" cy="40" r="1.2" fill="#fff"/><circle cx="12" cy="38" r="1" fill="#fff"/>` : ""}
    <path d="M0 66 Q25 58 50 66 T100 64 V80 H0 Z" fill="#15803d"/>
    <path d="M44 66 V52 Q50 44 56 52 V66 Z M49 46 h2 v-5 h-2 Z" fill="#fef3c7" stroke="#92400e" stroke-width="1"/><rect x="60" y="44" width="4" height="22" fill="#fef3c7" stroke="#92400e" stroke-width="1"/></svg>`;

  // نصوص الأذكار بالتشكيل
  // سورة الفاتحة بالرسم العثماني، منقولة كما هي من «حفظ القرآن» (quran-json 3.1.2، CC BY 4.0)
  const FATIHA = ["بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ", "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ", "ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ", "مَٰلِكِ يَوۡمِ ٱلدِّينِ", "إِيَّاكَ نَعۡبُدُ وَإِيَّاكَ نَسۡتَعِينُ", "ٱهۡدِنَا ٱلصِّرَٰطَ ٱلۡمُسۡتَقِيمَ", "صِرَٰطَ ٱلَّذِينَ أَنۡعَمۡتَ عَلَيۡهِمۡ غَيۡرِ ٱلۡمَغۡضُوبِ عَلَيۡهِمۡ وَلَا ٱلضَّآلِّينَ"];
  const DH = {
    takbir: "اللَّهُ أَكْبَرُ",
    ruku: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
    raf: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ<br>رَبَّنَا وَلَكَ الْحَمْدُ",
    sujud: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
    julus: "رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي",
    tashahhud: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
    ibrahim: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
    salam: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ",
  };
  const fatihaHtml = () => FATIHA.map((a, i) => `${a} <span class="an">${ar(i + 1)}</span>`).join(" ");

  const RAKA = [
    { p: "stand", t: "القيام واستقبال القبلة", d: "قف باتجاه القبلة (الكعبة)، وانوِ بقلبك الصلاة التي ستصلّيها." },
    { p: "takbir", t: "تكبيرة الإحرام", d: "ارفع يديك وقل:", dh: DH.takbir, sh: "التكبير" },
    { p: "qiyam", t: "قراءة الفاتحة", d: "ضع يدك اليمنى على اليسرى، واقرأ سورة الفاتحة. وفي الركعتين الأوليين تقرأ بعدها ما تحفظ من القرآن.", dh: "fatiha", sh: "الفاتحة" },
    { p: "ruku", t: "الركوع", d: "قل «الله أكبر» وانحنِ، وضع يديك على ركبتيك، واجعل ظهرك مستوياً، وقل:", dh: DH.ruku, n: "٣ مرات", sh: "الركوع" },
    { p: "itidal", t: "الرفع من الركوع", d: "ارفع رأسك وقف مستقيماً وقل:", dh: DH.raf, sh: "الرفع" },
    { p: "sujud", t: "السجود", d: "قل «الله أكبر» واسجد على: الجبهة مع الأنف، والكفّين، والركبتين، وأطراف القدمين. وقل:", dh: DH.sujud, n: "٣ مرات", sh: "السجود" },
    { p: "julus", t: "الجلوس بين السجدتين", d: "قل «الله أكبر» وارفع رأسك واجلس، وقل:", dh: DH.julus, sh: "الجلوس" },
    { p: "sujud", t: "السجدة الثانية", d: "قل «الله أكبر» واسجد مرة ثانية مثل الأولى، وقل:", dh: DH.sujud, n: "٣ مرات", sh: "السجدة ٢" },
    { p: "stand", t: "انتهت الركعة! 🎉", d: "قل «الله أكبر» وقم للركعة التالية، وصلّها مثل الأولى. وإذا أنهيت الركعة الثانية فلا تقم، بل اجلس للتشهد." },
    { p: "julus", t: "التشهد", d: "بعد كل ركعتين تجلس وتقرأ التشهد. وفي المغرب والظهر والعصر والعشاء: بعد التشهد الأول تقوم للركعة الثالثة.", dh: DH.tashahhud },
    { p: "julus", t: "الصلاة الإبراهيمية", d: "في الجلسة الأخيرة من الصلاة، بعد التشهد تقول:", dh: DH.ibrahim },
    { p: "tasleem", t: "التسليم", d: "التفت إلى اليمين وقل، ثم التفت إلى اليسار وقل مثلها. وبهذا تنتهي الصلاة 🎉", dh: DH.salam },
  ];
  const RAKA_ORDER = RAKA.slice(0, 8).map((s, i) => ({ ...s, rank: i, k: "r" + i }));

  const ADHKAR = [
    { t: "تكبيرة الإحرام", w: "في أول الصلاة، مع رفع اليدين", p: "takbir", dh: DH.takbir },
    { t: "سورة الفاتحة", w: "في القيام، في كل ركعة", p: "qiyam", dh: "fatiha" },
    { t: "ذكر الركوع", w: "في الركوع، ٣ مرات", p: "ruku", dh: DH.ruku },
    { t: "الرفع من الركوع", w: "عند القيام من الركوع", p: "itidal", dh: DH.raf },
    { t: "ذكر السجود", w: "في كل سجدة، ٣ مرات", p: "sujud", dh: DH.sujud },
    { t: "بين السجدتين", w: "في الجلوس بين السجدتين", p: "julus", dh: DH.julus },
    { t: "التشهد", w: "في الجلوس بعد كل ركعتين", p: "julus", dh: DH.tashahhud },
    { t: "الصلاة الإبراهيمية", w: "في الجلسة الأخيرة بعد التشهد", p: "julus", dh: DH.ibrahim },
    { t: "التسليم", w: "يميناً ثم يساراً، في آخر الصلاة", p: "tasleem", dh: DH.salam },
  ];
  const dhHtml = (dh) => (dh === "fatiha" ? fatihaHtml() : dh);
  const dhSize = (dh, big = 1) => { const l = dh === "fatiha" ? 260 : dh.replace(/<[^>]+>/g, "").replace(/\p{M}/gu, "").length;
    return (l > 200 ? 3.5 : l > 120 ? 4.2 : l > 50 ? 5 : l > 25 ? 6.4 : 8) * big; };

  // ---------------------------------------------------------------- القائمة
  const best = (k) => save.best[k] || 0;
  const setBest = (k, s) => { save.best[k] = Math.max(best(k), s); save.save(); };
  function homeScreen() {
    K.begin();
    const card = (key, bg, icon, title, desc, fn, st) => `
      <button class="mode f" style="background:${bg}" ${K.act(key, fn)}>
        <span class="big">${icon}</span><b>${title}</b><small>${desc}</small>${st !== undefined ? `<span class="st">${K.starsHtml(st)}</span>` : ""}
      </button>`;
    const kid = kidOf();
    const needKid = (fn, ...a) => () => (save.kid ? K.show(fn, ...a) : K.show(kidScreen, fn, a));
    K.paint(`
      <div class="top"><button class="btn f kidbtn" ${K.act("kid", () => K.show(kidScreen, null, []))}><span class="emo">${kid === "girl" ? "👧" : "👦"}</span> ${kid === "girl" ? "بنت" : "ولد"}</button>
        <div class="title"><h1>الوضوء والصلاة</h1></div><span class="pill">🕌</span></div>
      <div class="modes sm">
        ${card("wl", "linear-gradient(135deg,#06b6d4,#0369a1)", `<span class="ico">${front(kid, "face", "", true)}</span>`, "تعلّم الوضوء", "خطوة بخطوة", needKid(wuduScreen, 0))}
        ${card("wo", "linear-gradient(135deg,#10b981,#047857)", `<span class="emo">🧩</span>`, "رتّب الوضوء", "ما الخطوة التالية؟", needKid(orderScreen, "wudu"), best("o:wudu"))}
        ${card("wb", "linear-gradient(135deg,#f43f5e,#be123c)", `<span class="emo">🚫</span>`, "ما ينقض الوضوء", "تعلّم والعب", () => K.show(breakScreen))}
        ${card("pf", "linear-gradient(135deg,#f59e0b,#c2410c)", `<span class="emo">🌅</span>`, "الصلوات الخمس", "وعدد الركعات", () => K.show(prayersScreen))}
      </div>
      <div class="modes sm">
        ${card("pr", "linear-gradient(135deg,#8b5cf6,#5b21b6)", `<span class="ico">${pose(kid, "ruku")}</span>`, "خطوات الركعة", "كيف أصلّي؟", needKid(rakaScreen, 0))}
        ${card("po", "linear-gradient(135deg,#6366f1,#3730a3)", `<span class="emo">🧩</span>`, "رتّب الركعة", "ما الحركة التالية؟", needKid(orderScreen, "raka"), best("o:raka"))}
        ${card("pa", "linear-gradient(135deg,#14b8a6,#0f766e)", `<span class="emo">📿</span>`, "أذكار الصلاة", "ماذا أقول؟", needKid(dhikrScreen, 0))}
        ${card("qz", "linear-gradient(135deg,#eab308,#a16207)", `<span class="emo">📝</span>`, "اختبر نفسك", "واربح النجوم", needKid(testStart), best("test"))}
      </div>
      ${K.HELP}`, "wl");
  }

  function kidScreen(next, args) {
    K.begin();
    const pick = (k) => () => { save.kid = k; save.save(); if (next) K.replace(next, ...args); else K.back(); };
    K.paint(`
      <div class="top">${K.backBtn()}<h2>من أنت؟</h2><span></span></div>
      <div class="sub">اختر الطفل الذي يتعلّم معك</div>
      <div class="kids">
        <button class="kidc f" ${K.act("boy", pick("boy"))}>${front("boy", "done")}<b>ولد</b></button>
        <button class="kidc f" ${K.act("girl", pick("girl"))}>${front("girl", "done")}<b>بنت</b></button>
      </div>
      ${K.HELP}`, save.kid || "boy");
  }

  // ---------------------------------------------------------------- تعلّم الوضوء
  function wuduScreen(i) {
    K.begin();
    const n = WUDU.length, last = i === n, s = WUDU[i] || { t: "الدعاء بعد الوضوء", hl: "done", d: "أحسنت! انتهى وضوؤك. وبعد الوضوء قل:", dh: WUDU_DUA };
    const go = (d) => { const j = i + d; if (j < 0 || j > n) return; K.top().args = [j]; K.top().focus = d > 0 ? "next" : "prev"; K.render(); };
    const drops = s.n ? `<div class="times">${Array.from({ length: s.n }, (_, k) => `<span class="dr" style="animation-delay:${k * .5}s"><svg viewBox="0 0 20 26"><path d="M10 1 Q19 13 18 17 A8 8 0 0 1 2 17 Q1 13 10 1 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="1.5"/></svg></span>`).join("")}<b>${s.n === 3 ? "٣ مرات" : "مرة واحدة"}</b></div>
      ${s.n === 3 ? `<div class="tip">مرة واحدة تكفي، والثلاث أفضل (سُنّة) 💧</div>` : ""}` : "";
    K.paint(`
      <div class="top">${K.backBtn()}<h2>تعلّم الوضوء</h2><span class="pill">${last ? "✨" : `${ar(i + 1)} / ${ar(n)}`}</span></div>
      <div class="lesson">
        <div class="fig">${front(kidOf(), s.hl)}</div>
        <div class="card">
          <div class="stepn">${last ? "النهاية" : `الخطوة ${ar(i + 1)}`}</div>
          <h3>${s.t}</h3>
          <p>${s.d}</p>
          ${s.dh ? `<div class="dh qr" style="font-size:${dhSize(s.dh, .8)}vh">${s.dh}</div>` : ""}
          ${drops}
          ${i === 0 ? `<div class="tip">لا تُسرف في الماء حتى لو كان كثيراً 🚰</div>` : ""}
        </div>
      </div>
      <div class="nav">
        ${i > 0 ? `<button class="btn f" ${K.act("prev", () => go(-1))}>→ السابقة</button>` : ""}
        ${!last ? `<button class="btn f go" ${K.act("next", () => go(1))}>التالية ←</button>`
                : `<button class="btn f go" ${K.act("play", () => K.replace(orderScreen, "wudu"))}>🧩 رتّب الخطوات</button>`}
      </div>
      ${K.HELP}`, "next");
  }

  // ---------------------------------------------------------------- لعبة الترتيب
  function orderScreen(which) {
    const W = which === "wudu";
    const items = W ? WUDU : RAKA_ORDER, kid = kidOf();
    const icon = (s) => (W ? front(kid, s.hl, "", true) : pose(kid, s.p));
    const label = (s) => (W ? s.s : s.sh);
    const st = { placed: [], pool: K.shuffle(items), miss: 0 };
    draw();
    function draw(msg = "") {
      K.begin();
      const n = st.placed.length;
      const slots = items.map((_, k) => `<div class="slot${k < n ? " full" : k === n ? " now" : ""}">${k < n ? `<span class="ic">${icon(st.placed[k])}</span><small>${label(st.placed[k])}</small>` : `<b>${ar(k + 1)}</b>`}</div>`).join("");
      const pool = st.pool.map((s) => `<button class="otile f" ${K.act(s.k, (el) => pick(s, el))}><span class="ic">${icon(s)}</span><b>${label(s)}</b></button>`).join("");
      K.paint(`
        <div class="top">${K.backBtn()}<h2>${W ? "رتّب خطوات الوضوء" : "رتّب حركات الركعة"}</h2><span class="pill">${ar(n)} / ${ar(items.length)}</span></div>
        <div class="slots" style="--n:${items.length}">${slots}</div>
        <div class="sub q2">${n < items.length ? `ما الخطوة رقم ${ar(n + 1)}؟` : ""}</div>
        <div class="pool" style="--cols:${Math.ceil(st.pool.length / 2)}">${pool}</div>
        <div class="cheer">${msg}</div>
        ${K.HELP}`, st.pool[0] && st.pool[0].k);
    }
    function pick(s, el) {
      const want = items[st.placed.length];
      const ok = s.rank === want.rank;
      report(`${W ? "ترتيب الوضوء" : "ترتيب الركعة"}: ${W ? want.t : want.t}`, ok);
      if (!ok) { st.miss++; el.classList.add("bad"); K.sfx.bad(); setTimeout(() => el.classList.remove("bad"), 500); K.app.querySelector(".cheer").textContent = "ليست هذه، فكّر مرة أخرى 💪"; return; }
      K.sfx.ok(); st.placed.push(s); st.pool = st.pool.filter((x) => x !== s);
      if (st.pool.length) { K.top().focus = null; draw(K.pick(["أحسنت! 👏", "صحيح! ✅", "رائع! 🌟", "ممتاز! 🎉"])); K.confetti(6); return; }
      const total = items.length, score = total - Math.min(total, st.miss), s3 = st.miss === 0 ? 3 : st.miss <= 2 ? 2 : 1;
      setBest("o:" + which, s3);
      draw("🎉"); K.later(() => {
        K.replace(K.resultScreen, { s: s3, title: W ? "ترتيب الوضوء" : "ترتيب الركعة", msg: s3 === 3 ? "ممتاز! رتّبتها كلها 🏆" : s3 === 2 ? "أحسنت! 👏" : "جيد! حاول مرة أخرى 💪",
          extra: `<div class="sub">${st.miss ? `أخطأت ${ar(st.miss)} ${st.miss === 1 ? "مرة" : st.miss === 2 ? "مرتين" : "مرات"}` : "بدون أي خطأ!"}</div>`,
          again: () => K.replace(orderScreen, which), next: { label: W ? "ما ينقض الوضوء" : "أذكار الصلاة", fn: () => (W ? K.replace(breakScreen) : K.replace(dhikrScreen, 0)) } });
        earn(s3 === 3 ? 2 : s3 === 2 ? 1 : 0, W ? "رتّب خطوات الوضوء" : "رتّب حركات الركعة");
      }, 1200);
      void score;
    }
  }

  // ---------------------------------------------------------------- ما ينقض الوضوء
  function breakScreen() {
    K.begin();
    const li = (b) => `<li><span class="emo">${b.e}</span> ${b.t}</li>`;
    K.paint(`
      <div class="top">${K.backBtn()}<h2>ما ينقض الوضوء</h2><span></span></div>
      <div class="two">
        <div class="col yes"><h3>🚫 ينقض الوضوء</h3><ul>${BREAKS.filter((b) => b.yes).map(li).join("")}</ul>
          <div class="tip">إذا انتقض وضوؤك فتوضأ من جديد قبل الصلاة 💧</div></div>
        <div class="col no"><h3>✅ لا ينقض الوضوء</h3><ul>${BREAKS.filter((b) => !b.yes).map(li).join("")}</ul></div>
      </div>
      <div class="nav"><button class="btn f go" ${K.act("play", () => K.show(quiz, breakQuiz()))}>🎮 العب: هل ينقض الوضوء؟</button></div>
      ${K.HELP}`, "play");
  }
  const YN = ["نعم، ينقض ❌", "لا ينقض ✅"];
  const breakQ = (b) => ({ topic: "ينقض الوضوء؟ " + b.t, prompt: `<div class="col"><span class="emo pic">${b.e}</span><div class="q">هل ينقض الوضوء: ${b.t}؟</div></div>`, opts: YN, answer: b.yes ? 0 : 1, cls: "txt yn" });
  const breakQuiz = () => ({ key: "breaks", title: "ما ينقض الوضوء", make: () => K.shuffle(BREAKS).slice(0, 8).map(breakQ), stars: (s) => (s === 3 ? 1 : 0), reason: "ما ينقض الوضوء" });

  // ---------------------------------------------------------------- الصلوات الخمس
  function prayersScreen() {
    K.begin();
    const map = (p) => { const r = []; for (let k = 1; k <= p.r; k++) { r.push(`<i class="rk">${ar(k)}</i>`); if (k === 2 && p.r > 2) r.push(`<i class="ts" title="التشهد الأول">🪑</i>`); }
      r.push(`<i class="ts">🪑</i><i class="ts">👋</i>`); return r.join(""); };
    const info = (p) => `<b>صلاة ${p.t}: ${ar(p.r)} ${p.r === 2 ? "ركعتان" : "ركعات"}</b><div class="map">${map(p)}</div>
      <small>${p.r === 2 ? "ركعتان، ثم التشهد والتسليم" : p.r === 3 ? "ركعتان ← التشهد الأول ← ركعة ← التشهد الأخير والتسليم" : "ركعتان ← التشهد الأول ← ركعتان ← التشهد الأخير والتسليم"} &nbsp; (🪑 جلوس للتشهد · 👋 التسليم)</small>`;
    K.onFocus = (el) => { const p = PRAYERS.find((x) => x.k === el.dataset.k); const d = K.app.querySelector(".pinfo"); if (p && d) d.innerHTML = info(p); };
    K.paint(`
      <div class="top">${K.backBtn()}<h2>الصلوات الخمس</h2><span class="pill">${ar(17)} ركعة في اليوم</span></div>
      <div class="prayers">${PRAYERS.map((p) => `
        <button class="pcard f" ${K.act(p.k, () => {})}>${skySvg(p)}<b>${p.t}</b><span class="rn">${ar(p.r)}</span><small>${p.when}</small></button>`).join("")}</div>
      <div class="pinfo"></div>
      ${K.HELP}`, "fajr");
    const f = K.current(); if (f) K.onFocus(f);
  }

  // ---------------------------------------------------------------- خطوات الركعة
  function rakaScreen(i) {
    K.begin();
    K.onFocus = null;
    const s = RAKA[i], n = RAKA.length;
    const go = (d) => { const j = i + d; if (j < 0 || j >= n) return; K.top().args = [j]; K.top().focus = d > 0 ? "next" : "prev"; K.render(); };
    K.paint(`
      <div class="top">${K.backBtn()}<h2>كيف أصلّي؟</h2><span class="pill">${ar(i + 1)} / ${ar(n)}</span></div>
      <div class="lesson">
        <div class="fig side">${pose(kidOf(), s.p)}</div>
        <div class="card">
          <h3>${s.t}</h3>
          <p>${s.d}</p>
          ${s.dh ? `<div class="dh qr" style="font-size:${dhSize(s.dh, s.dh === "fatiha" ? .95 : .85)}vh">${dhHtml(s.dh)}</div>` : ""}
          ${s.n ? `<div class="times"><b>${s.n}</b></div>` : ""}
        </div>
      </div>
      <div class="nav">
        ${i > 0 ? `<button class="btn f" ${K.act("prev", () => go(-1))}>→ السابقة</button>` : ""}
        ${i < n - 1 ? `<button class="btn f go" ${K.act("next", () => go(1))}>التالية ←</button>`
                    : `<button class="btn f go" ${K.act("play", () => K.replace(orderScreen, "raka"))}>🧩 رتّب الركعة</button>`}
      </div>
      ${K.HELP}`, "next");
  }

  // ---------------------------------------------------------------- أذكار الصلاة
  function dhikrScreen(i) {
    K.begin();
    K.onFocus = null;
    const s = ADHKAR[i];
    const voice = K.voice("ar");
    const chips = ADHKAR.map((a, k) => `<button class="chip f${k === i ? " on" : ""}" ${K.act("c" + k, () => { K.top().args = [k]; K.top().focus = "c" + k; K.render(); })}>${a.t}</button>`).join("");
    K.paint(`
      <div class="top">${K.backBtn()}<h2>أذكار الصلاة</h2><span class="pill">${ar(i + 1)} / ${ar(ADHKAR.length)}</span></div>
      <div class="chips">${chips}</div>
      <div class="lesson dl">
        <div class="fig side sm">${pose(kidOf(), s.p)}</div>
        <div class="card">
          <h3>${s.t}</h3><p class="when">🕐 ${s.w}</p>
          <div class="dh qr" style="font-size:${dhSize(s.dh, s.dh === "fatiha" ? 1.05 : 1)}vh">${dhHtml(s.dh)}</div>
          ${voice && s.dh !== "fatiha" ? `<button class="btn f say" ${K.act("say", () => K.tts(s.dh.replace(/<br>/g, "، "), "ar", .75))}><span class="emo">🔊</span> استمع</button>` : ""}
        </div>
      </div>
      ${K.HELP}`, "c" + i);
  }

  // ---------------------------------------------------------------- محرك الأسئلة (مع إرسال كل نتيجة لتقرير الأهل)
  // o = { key, title, make: () => [{ topic, prompt, opts, answer, cls }], stars(s) -> amount, reason }
  const GOOD = ["أحسنت! 👏", "رائع! 🌟", "ممتاز! 🎉", "بطل! 🏆", "شاطر! 💪", "صحيح! ✅"];
  function quiz(o) {
    const qs = o.make();
    let q = 0, score = 0;
    const results = [];
    ask();
    function ask() {
      K.begin();
      const Q = qs[q];
      let wrong = false, locked = false, sent = false;
      const dots = qs.map((_, k) => `<i class="${k < q ? (results[k] ? "ok" : "") : k === q ? "now" : ""}"></i>`).join("");
      const choose = (j, el) => {
        if (locked || el.dataset.dead) return;
        if (!sent) { sent = true; report(Q.topic, j === Q.answer); }
        const cheer = K.app.querySelector(".cheer");
        if (j === Q.answer) {
          locked = true; el.classList.add("ok");
          if (!wrong) score++;
          results[q] = !wrong;
          K.sfx.ok(); K.confetti(10); cheer.textContent = K.pick(GOOD);
          K.later(() => { q++; if (q < qs.length) { K.top().focus = null; ask(); } else finish(); }, 1600);
        } else {
          wrong = true; el.classList.add("bad"); el.dataset.dead = "1"; K.sfx.bad();
          cheer.textContent = "حاول مرة أخرى 💪";
        }
      };
      K.paint(`
        <div class="top">${K.backBtn()}<div class="dots">${dots}</div><span class="pill">${ar(q + 1)} / ${ar(qs.length)}</span></div>
        <div class="prompt">${Q.prompt}</div>
        <div class="opts ${Q.cls || "txt"}">${Q.opts.map((h, j) => `<button class="opt f" ${K.act("o" + j, (el) => choose(j, el))}>${h}</button>`).join("")}</div>
        <div class="cheer"></div>
        ${K.HELP}`, "o0");
    }
    function finish() {
      const s = K.starsFor(score, qs.length);
      setBest(o.key, s);
      K.replace(K.resultScreen, { s, score: ar(score), total: ar(qs.length), title: o.title, again: () => K.replace(quiz, o), next: o.next });
      earn(o.stars(s), o.reason);
    }
  }

  // ---------------------------------------------------------------- اختبر نفسك
  const NUMS = ["٢", "٣", "٤", "٥"];
  const mc = (topic, q, right, wrongs, cls = "txt", pic = "") => {
    const opts = K.shuffle([right, ...K.shuffle(wrongs).slice(0, 3)]);
    return { topic, prompt: `<div class="col">${pic}<div class="q">${q}</div></div>`, opts, answer: opts.indexOf(right), cls };
  };
  function testBank() {
    const kid = kidOf(), B = [];
    PRAYERS.forEach((p) => B.push(() => mc(`ركعات ${p.t}`, `كم ركعة في صلاة ${p.t}؟`, ar(p.r), NUMS.filter((x) => x !== ar(p.r)), "txt num", skySvg(p))));
    B.push(() => mc("صلاة من ٣ ركعات", "أي صلاة فيها ٣ ركعات؟", "المغرب", ["الفجر", "الظهر", "العشاء", "العصر"]));
    B.push(() => mc("صلاة من ركعتين", "أي صلاة فيها ركعتان فقط؟", "الفجر", ["المغرب", "الظهر", "العشاء", "العصر"]));
    B.push(() => mc("عدد الصلوات", "كم صلاة نصلّي في اليوم والليلة؟", "٥", ["٣", "٤", "٧"], "txt num"));
    B.push(() => mc("وقت المغرب", "متى نصلّي المغرب؟", "بعد غروب الشمس", ["قبل شروق الشمس", "في منتصف النهار", "في منتصف الليل"], "wide"));
    B.push(() => mc("وقت الفجر", "متى نصلّي الفجر؟", "قبل شروق الشمس", ["بعد غروب الشمس", "في منتصف النهار", "بعد العصر"], "wide"));
    B.push(() => mc("التسمية", "ماذا نقول قبل أن نبدأ الوضوء؟", "بسم الله", ["الله أكبر", "السلام عليكم", "الحمد لله"]));
    B.push(() => mc("مكان النية", "أين مكان النية؟", "في القلب", ["في اليد", "في الرأس", "في القدم"]));
    B.push(() => mc("أول الغسل", "ما أول عضو نغسله في الوضوء؟", "الكفّان", ["الوجه", "الرجلان", "الرأس"]));
    B.push(() => mc("بعد الوجه", "ماذا نغسل بعد الوجه؟", "اليدين إلى المرفقين", ["الرجلين", "الكفّين", "الأذنين"], "wide"));
    B.push(() => mc("آخر الوضوء", "ما آخر ما نغسله في الوضوء؟", "الرجلان إلى الكعبين", ["الوجه", "اليدان", "الكفّان"], "wide"));
    B.push(() => mc("اليمين أولاً", "بأي جهة نبدأ عند غسل اليدين والرجلين؟", "اليمنى", ["اليسرى"]));
    B.push(() => mc("مسح الرأس", "الرأس في الوضوء…", "نمسحه بأيدينا المبلولة", ["نغسله بالصابون", "لا نلمسه"], "wide"));
    B.push(() => mc("التثليث", "كم مرة يُستحب أن نغسل الوجه؟", "٣ مرات", ["٥ مرات", "٧ مرات", "١٠ مرات"]));
    WUDU.filter((s) => s.n).forEach((s) => B.push(() => mc(`صورة: ${s.t}`, "ما اسم هذه الخطوة؟", s.t, WUDU.filter((x) => x.n && x !== s).map((x) => x.t), "wide", `<span class="qpic">${front(kid, s.hl, "", true)}</span>`)));
    BREAKS.forEach((b) => B.push(() => breakQ(b)));
    B.push(() => mc("ذكر الركوع", "ماذا نقول في الركوع؟", DH.ruku, [DH.sujud, DH.julus, DH.salam], "wide qr", `<span class="qpic">${pose(kid, "ruku")}</span>`));
    B.push(() => mc("ذكر السجود", "ماذا نقول في السجود؟", DH.sujud, [DH.ruku, DH.takbir, DH.salam], "wide qr", `<span class="qpic">${pose(kid, "sujud")}</span>`));
    B.push(() => mc("بين السجدتين", "ماذا نقول في الجلوس بين السجدتين؟", DH.julus, [DH.ruku, DH.sujud, DH.salam], "wide qr", `<span class="qpic">${pose(kid, "julus")}</span>`));
    B.push(() => mc("الرفع من الركوع", "ماذا نقول عند الرفع من الركوع؟", "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ", [DH.sujud, DH.salam, DH.takbir + " " + DH.takbir], "wide qr", `<span class="qpic">${pose(kid, "itidal")}</span>`));
    B.push(() => mc("تكبيرة الإحرام", "بماذا نبدأ الصلاة؟", DH.takbir, [DH.salam, "بِسْمِ اللَّهِ", DH.ruku], "wide qr", `<span class="qpic">${pose(kid, "takbir")}</span>`));
    B.push(() => mc("التسليم", "كيف نختم الصلاة؟", "بالتسليم يميناً ثم يساراً", ["بالتكبير", "بالركوع", "بالسجود"], "wide"));
    B.push(() => mc("الفاتحة", "أي سورة نقرأ في كل ركعة؟", "الفاتحة", ["الإخلاص", "الناس", "الكوثر"]));
    B.push(() => mc("عدد السجدات", "كم سجدة في كل ركعة؟", "٢", ["١", "٣", "٤"], "txt num"));
    B.push(() => mc("القبلة", "إلى أين نتّجه في الصلاة؟", "إلى القبلة (الكعبة)", ["إلى الباب", "إلى النافذة", "إلى أي جهة"], "wide"));
    B.push(() => mc("التشهد الأول", "متى نجلس للتشهد الأول في صلاة الظهر؟", "بعد الركعة الثانية", ["بعد الركعة الأولى", "بعد الركعة الثالثة", "قبل الركوع"], "wide"));
    B.push(() => mc("بعد الركوع", "ماذا نفعل بعد الركوع؟", "نرفع ونقف مستقيمين", ["نسلّم", "نجلس للتشهد", "نقرأ الفاتحة"], "wide"));
    [["qiyam", "القيام"], ["ruku", "الركوع"], ["sujud", "السجود"], ["julus", "الجلوس"]].forEach(([p, t], _, all) =>
      B.push(() => mc(`صورة: ${t}`, "ما اسم هذه الحركة؟", t, all.map((x) => x[1]).filter((x) => x !== t), "txt", `<span class="qpic">${pose(kid, p)}</span>`)));
    return B;
  }
  const testQuiz = () => ({ key: "test", title: "اختبر نفسك", make: () => K.shuffle(testBank()).slice(0, 10).map((f) => f()), stars: (s) => (s >= 2 ? s : 0), reason: "اختبر نفسك: الوضوء والصلاة" });
  function testStart() { K.replace(quiz, testQuiz()); }

  K.draw = { pose, front }; // للتجربة
  K.start(homeScreen);
})();
