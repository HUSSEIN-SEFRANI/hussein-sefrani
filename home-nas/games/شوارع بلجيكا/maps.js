// شوارع بلجيكا — الخرائط والمراحل.
// خريطة موسكرون الداخلية مرسومة (أسماء شوارع مستوحاة من المدينة، ليست مطابقة للواقع).
// خريطة بلجيكا: مواقع المدن والطرق الكبرى تقريبية من الجغرافيا الحقيقية، والمسافات بالكيلومتر من المواقع.
(() => {
  "use strict";

  // ---------------------------------------------------------------- موسكرون (المدينة)
  // شبكة 8×5 تقاطعات، المسافة بين تقاطعين 340 بكسل (≈ 120 متراً)
  const G = 340, COLS = 8, ROWS = 5;
  const ROWN = ["شارع كورتريك", "شارع المحطة", "شارع الكنيسة", "شارع الحديقة", "شارع لوان"];
  const COLN = ["شارع ليل", "شارع المدرسة", "شارع الورود", "شارع السوق", "شارع الطاحونة", "شارع تورناي", "شارع الملعب", "شارع دوتينيي"];
  const id = (x, y) => `c${x}_${y}`;
  const cityNodes = {};
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) cityNodes[id(x, y)] = { x: x * G, y: y * G };
  const cityEdges = [];
  const MISSING = new Set(["c6_2|c6_3", "c2_4|c3_4", "c0_0|c0_1", "c7_3|c7_4"]);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS - 1; x++) {
    const k = id(x, y) + "|" + id(x + 1, y);
    if (!MISSING.has(k)) cityEdges.push({ a: id(x, y), b: id(x + 1, y), name: ROWN[y] });
  }
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS - 1; y++) {
    const k = id(x, y) + "|" + id(x, y + 1);
    if (!MISSING.has(k)) cityEdges.push({ a: id(x, y), b: id(x, y + 1), name: COLN[x] });
  }
  // جادة مائلة (طريق مختصر): من الحديقة إلى الشمال الشرقي
  cityEdges.push({ a: "c1_3", b: "c2_2", name: "جادة الملك" }, { a: "c2_2", b: "c3_1", name: "جادة الملك" }, { a: "c3_1", b: "c4_0", name: "جادة الملك" });
  const E = (a, b) => cityEdges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  E("c4_0", "c5_0").works = true;                       // أشغال 🚧
  // كل الطرق ذهاب وإياب (طلب صاحب المشروع)
  E("c3_3", "c4_3").zone = 30; E("c4_3", "c5_3").zone = 30; E("c4_3", "c4_4").zone = 30;                      // قرب المدرسة: 30
  E("c3_3", "c4_3").radar = 0.5; E("c1_1", "c2_1").radar = 0.5; E("c5_2", "c6_2").radar = 0.4;

  const CITY = {
    kind: "city", name: "موسكرون", nodes: cityNodes, edges: cityEdges, grid: { G, COLS, ROWS },
    limit: 50, kmPerPx: 0.12 / G * 1, // 340 بكسل = 120 متر
    lights: ["c2_2", "c5_2", "c3_3", "c6_1"],
    places: [
      { cell: [0, 2], h: 2, kind: "park", name: "الحديقة", emo: "🌳" },
      { cell: [5, 0], kind: "burger", name: "ماكدونالدز", emo: "🍔" },
      { cell: [3, 2], kind: "church", name: "الساحة الكبرى", emo: "⛪" },
      { cell: [2, 0], kind: "station", name: "محطة القطار", emo: "🚉" },
      { cell: [6, 3], kind: "stadium", name: "الملعب", emo: "⚽" },
      { cell: [4, 3], kind: "school", name: "المدرسة", emo: "🏫" },
      { cell: [1, 0], kind: "pool", name: "المسبح", emo: "🏊" },
      { cell: [5, 2], kind: "shop", name: "السوق", emo: "🛒" },
    ],
  };

  // ---------------------------------------------------------------- بلجيكا (المدن والطرق)
  // [الاسم، خط العرض، خط الطول، الحجم 1..3، رمز]
  const T = {
    mouscron: ["موسكرون", 50.744, 3.214, 2, "🏘️"], menen: ["مينين", 50.797, 3.121, 1], wevelgem: ["فيفلغيم", 50.810, 3.183, 1],
    kortrijk: ["كورتريك", 50.828, 3.265, 2, "🏙️"], zwevegem: ["زفيفيغيم", 50.811, 3.341, 1], dottignies: ["دوتينيي", 50.730, 3.296, 1],
    estaimpuis: ["إستمبوي", 50.703, 3.270, 1], pecq: ["بيك", 50.686, 3.340, 1], tournai: ["تورناي", 50.606, 3.389, 2, "⛪"],
    antoing: ["أنطوان", 50.567, 3.450, 1], avelgem: ["أفيلغيم", 50.776, 3.443, 1], harelbeke: ["هارلبيكه", 50.856, 3.307, 1],
    roubaix: ["روبيه", 50.690, 3.181, 2], tourcoing: ["توركوان", 50.724, 3.161, 2], lille: ["ليل", 50.629, 3.057, 3],
    leuze: ["لوز", 50.600, 3.617, 1], ronse: ["رونسه", 50.746, 3.600, 1], ath: ["آث", 50.630, 3.778, 1], lessines: ["ليسين", 50.712, 3.836, 1],
    mons: ["مونس", 50.454, 3.952, 2], soignies: ["سوانيي", 50.579, 4.071, 1], louviere: ["لا لوفيير", 50.480, 4.187, 2],
    binche: ["بانش", 50.411, 4.166, 1], nivelles: ["نيفيل", 50.598, 4.328, 1], charleroi: ["شارلروا", 50.411, 4.444, 3],
    airport: ["مطار شارلروا", 50.459, 4.453, 2, "✈️"], peruwelz: ["بيرويلز", 50.510, 3.593, 1],
    ostend: ["أوستند", 51.215, 2.927, 2, "🌊"], bruges: ["بروج", 51.209, 3.225, 2, "🏰"], jabbeke: ["يابيكه", 51.182, 3.087, 1],
    torhout: ["تورهاوت", 51.065, 3.101, 1], roeselare: ["رسلاره", 50.946, 3.123, 2], ieper: ["إيبر", 50.851, 2.885, 1],
    diksmuide: ["ديكسمود", 51.033, 2.864, 1], tielt: ["تيلت", 50.999, 3.327, 1], aalter: ["آلتر", 51.089, 3.447, 1],
    deinze: ["داينزه", 50.984, 3.527, 1], gent: ["غنت", 51.054, 3.717, 3, "🏰"], eeklo: ["إيكلو", 51.186, 3.564, 1],
    waregem: ["فاريغيم", 50.889, 3.426, 1], oudenaarde: ["أودينارده", 50.845, 3.605, 1], zottegem: ["زوتيغيم", 50.869, 3.811, 1],
    aalst: ["آلست", 50.937, 4.040, 2], ninove: ["نينوفه", 50.828, 4.025, 1], geraardsbergen: ["خيراردسبيرخن", 50.773, 3.882, 1],
    dendermonde: ["دندرموند", 51.028, 4.101, 1], lokeren: ["لوكرن", 51.104, 3.993, 1], sintniklaas: ["سينت نيكلاس", 51.165, 4.143, 2],
    antwerp: ["أنتويرب", 51.219, 4.402, 3, "⚓"], mechelen: ["ميخلن", 51.026, 4.478, 2], boom: ["بوم", 51.088, 4.367, 1],
    vilvoorde: ["فيلفوردة", 50.928, 4.425, 1], brussels: ["بروكسل", 50.847, 4.357, 3, "🏛️"], halle: ["هالة", 50.735, 4.238, 1],
    enghien: ["أنغيان", 50.693, 4.040, 1], asse: ["آسه", 50.910, 4.198, 1], leuven: ["لوفان", 50.879, 4.700, 2],
  };
  // [من، إلى، اسم الطريق، النوع: h طريق سريع (120)، n طريق وطني (90)، l طريق محلي (70)]
  const R = [
    ["mouscron", "kortrijk", "A17", "h"], ["mouscron", "tournai", "A17", "h"], ["kortrijk", "roeselare", "A17", "h"], ["roeselare", "torhout", "A17", "h"], ["torhout", "bruges", "A17", "h"],
    ["mouscron", "menen", "N58", "n"], ["menen", "wevelgem", "N8", "n"], ["wevelgem", "kortrijk", "N8", "n"], ["kortrijk", "wevelgem", "A19", "h"], ["wevelgem", "ieper", "A19", "h"],
    ["mouscron", "dottignies", "طريق محلي", "l"], ["dottignies", "zwevegem", "طريق محلي", "l"], ["zwevegem", "kortrijk", "طريق محلي", "l"], ["kortrijk", "harelbeke", "N43", "n"],
    ["mouscron", "tourcoing", "طريق فرنسا", "l"], ["tourcoing", "roubaix", "طريق فرنسا", "l"], ["roubaix", "lille", "طريق فرنسا", "n"], ["lille", "tournai", "E42", "h"], ["roubaix", "estaimpuis", "طريق محلي", "l"],
    ["mouscron", "estaimpuis", "N511", "l"], ["estaimpuis", "pecq", "طريق محلي", "l"], ["pecq", "tournai", "N50", "n"], ["dottignies", "pecq", "طريق محلي", "l"],
    ["kortrijk", "avelgem", "N8", "n"], ["zwevegem", "avelgem", "طريق محلي", "l"], ["pecq", "avelgem", "طريق محلي", "l"], ["avelgem", "ronse", "N8", "n"], ["avelgem", "oudenaarde", "N8", "n"],
    ["tournai", "antoing", "طريق محلي", "l"], ["antoing", "peruwelz", "طريق محلي", "l"], ["tournai", "leuze", "N7", "n"], ["leuze", "ath", "N7", "n"], ["peruwelz", "leuze", "طريق محلي", "l"],
    ["tournai", "mons", "E42", "h"], ["tournai", "ath", "A8", "h"], ["ath", "enghien", "A8", "h"], ["enghien", "halle", "A8", "h"], ["halle", "brussels", "A8", "h"],
    ["ronse", "leuze", "N60", "n"], ["ronse", "lessines", "طريق محلي", "l"], ["ath", "lessines", "N56", "n"], ["ath", "soignies", "N57", "n"], ["ath", "mons", "N56", "n"],
    ["mons", "louviere", "E42", "h"], ["louviere", "airport", "E42", "h"], ["mons", "binche", "N90", "n"], ["binche", "charleroi", "N90", "n"], ["louviere", "charleroi", "طريق محلي", "l"],
    ["soignies", "nivelles", "طريق محلي", "l"], ["soignies", "louviere", "N55", "n"], ["nivelles", "airport", "A54", "h"], ["charleroi", "airport", "R3", "h"],
    ["brussels", "nivelles", "E19", "h"], ["nivelles", "mons", "E19", "h"], ["soignies", "enghien", "طريق محلي", "l"], ["lessines", "enghien", "N57", "n"],
    ["ostend", "jabbeke", "E40", "h"], ["jabbeke", "bruges", "E40", "h"], ["bruges", "aalter", "E40", "h"], ["aalter", "gent", "E40", "h"], ["gent", "aalst", "E40", "h"], ["aalst", "asse", "E40", "h"], ["asse", "brussels", "E40", "h"],
    ["ostend", "bruges", "N9", "n"], ["ostend", "diksmuide", "N369", "n"], ["diksmuide", "ieper", "N369", "n"], ["diksmuide", "torhout", "N35", "n"], ["jabbeke", "torhout", "طريق محلي", "l"],
    ["ieper", "roeselare", "N36", "n"], ["ieper", "menen", "N8", "n"], ["roeselare", "tielt", "N35", "n"], ["tielt", "aalter", "طريق محلي", "l"], ["tielt", "deinze", "N35", "n"], ["torhout", "tielt", "طريق محلي", "l"],
    ["kortrijk", "waregem", "E17", "h"], ["waregem", "deinze", "E17", "h"], ["deinze", "gent", "E17", "h"], ["harelbeke", "waregem", "N43", "n"], ["harelbeke", "deinze", "N43", "n"],
    ["gent", "lokeren", "E17", "h"], ["lokeren", "sintniklaas", "E17", "h"], ["sintniklaas", "antwerp", "E17", "h"],
    ["bruges", "eeklo", "N9", "n"], ["eeklo", "gent", "N9", "n"], ["waregem", "oudenaarde", "N382", "n"], ["oudenaarde", "gent", "N60", "n"], ["oudenaarde", "ronse", "N60", "n"],
    ["oudenaarde", "zottegem", "طريق محلي", "l"], ["zottegem", "aalst", "N46", "n"], ["zottegem", "geraardsbergen", "طريق محلي", "l"], ["geraardsbergen", "ninove", "N45", "n"], ["geraardsbergen", "lessines", "طريق محلي", "l"],
    ["ninove", "aalst", "N405", "n"], ["ninove", "brussels", "N8", "n"], ["ninove", "enghien", "طريق محلي", "l"], ["asse", "ninove", "طريق محلي", "l"],
    ["aalst", "dendermonde", "N41", "n"], ["dendermonde", "lokeren", "N47", "n"], ["dendermonde", "mechelen", "طريق محلي", "l"], ["dendermonde", "boom", "طريق محلي", "l"], ["sintniklaas", "boom", "طريق محلي", "l"],
    ["brussels", "vilvoorde", "E19", "h"], ["vilvoorde", "mechelen", "E19", "h"], ["mechelen", "antwerp", "E19", "h"], ["brussels", "boom", "A12", "h"], ["boom", "antwerp", "A12", "h"], ["boom", "mechelen", "طريق محلي", "l"],
    ["brussels", "leuven", "E40", "h"], ["leuven", "mechelen", "طريق محلي", "l"], ["nivelles", "leuven", "طريق محلي", "l"], ["asse", "vilvoorde", "R0", "h"], ["halle", "nivelles", "طريق محلي", "l"],
  ];
  // حدود ومياه للزينة: [عرض، طول]
  const SHAPES = {
    coast: [[51.40, 3.40], [51.37, 3.36], [51.33, 3.20], [51.24, 3.03], [51.21, 2.92], [51.14, 2.72], [51.09, 2.54]],
    france: [[51.09, 2.54], [50.95, 2.60], [50.82, 2.86], [50.78, 3.04], [50.72, 3.15], [50.69, 3.24], [50.62, 3.28], [50.52, 3.45], [50.45, 3.66], [50.35, 3.77], [50.30, 4.10]],
    holland: [[51.37, 3.36], [51.27, 3.50], [51.26, 3.80], [51.21, 3.90], [51.30, 4.25], [51.37, 4.40], [51.45, 4.55]],
    rivers: [
      [[50.50, 3.43], [50.567, 3.45], [50.606, 3.389], [50.686, 3.34], [50.776, 3.443], [50.845, 3.605], [50.95, 3.66], [51.054, 3.717], [51.03, 3.95], [51.028, 4.101], [51.125, 4.21], [51.22, 4.40], [51.35, 4.30]],
      [[50.69, 2.88], [50.797, 3.121], [50.810, 3.183], [50.828, 3.265], [50.856, 3.307], [50.984, 3.527], [51.054, 3.717]],
      [[50.66, 4.20], [50.735, 4.238], [50.847, 4.357], [50.928, 4.425], [51.026, 4.478]],
    ],
    labels: [["فرنسا 🇫🇷", 50.55, 3.15], ["هولندا 🇳🇱", 51.33, 3.95], ["بحر الشمال", 51.32, 2.85]],
  };
  const REGION = { towns: T, roads: R, shapes: SHAPES, limits: { h: 120, n: 90, l: 70 } };

  // ---------------------------------------------------------------- المراحل
  const STAGES = [
    { id: 1, city: true, from: "c0_3", to: "c6_0", fromName: "الحديقة", toName: "ماكدونالدز", fromEmo: "🌳", toEmo: "🍔", title: "موسكرون", color: "#22c55e" },
    { id: 2, from: "mouscron", to: "kortrijk", title: "إلى كورتريك", color: "#3b82f6" },
    { id: 3, from: "mouscron", to: "tournai", title: "إلى تورناي", color: "#f59e0b", works: [["mouscron", "tournai"]] },
    { id: 4, from: "mouscron", to: "airport", title: "إلى مطار شارلروا", color: "#8b5cf6" },
    { id: 5, from: "mouscron", to: "brussels", title: "إلى بروكسل", color: "#ef4444" },
    { id: 6, from: "brussels", to: "antwerp", title: "من بروكسل إلى أنتويرب", color: "#0ea5e9" },
    { id: 7, from: "gent", to: "bruges", title: "من غنت إلى بروج", color: "#14b8a6", works: [["aalter", "gent"]] },
    { id: 8, from: "bruges", to: "mouscron", title: "من بروج إلى موسكرون", color: "#ec4899" },
    { id: 9, from: "ostend", to: "brussels", title: "من أوستند إلى بروكسل", color: "#f97316" },
  ];

  // ---------------------------------------------------------------- المركبات
  const VEHICLES = [
    { id: "car", name: "سيارة", emo: "🚗", max: 150 },
    { id: "plane", name: "طيارة", emo: "✈️", max: 260, fly: true },
    { id: "moto", name: "دراجة نارية", emo: "🏍️", max: 160 },
    { id: "police", name: "سيارة شرطة", emo: "🚓", max: 170 },
    { id: "ambulance", name: "سيارة إسعاف", emo: "🚑", max: 150 },
    { id: "truck", name: "شاحنة", emo: "🚚", max: 110 },
  ];
  // ماركات السيارات: الاسم واللون والشكل فقط (بلا شعارات)
  const BRANDS = [
    { id: "mercedes", name: "مرسيدس", color: "#cbd5e1", shape: "sedan" },
    { id: "bmw", name: "بي إم دبليو", color: "#1d4ed8", shape: "sport" },
    { id: "kia", name: "كيا", color: "#dc2626", shape: "suv" },
    { id: "renault", name: "رينو", color: "#facc15", shape: "hatch" },
    { id: "vw", name: "فولكس فاغن", color: "#0f766e", shape: "hatch" },
    { id: "toyota", name: "تويوتا", color: "#f8fafc", shape: "suv" },
    { id: "peugeot", name: "بيجو", color: "#7c3aed", shape: "sedan" },
    { id: "audi", name: "أودي", color: "#111827", shape: "sport" },
    { id: "volvo", name: "فولفو", color: "#475569", shape: "wagon" },
    { id: "tesla", name: "تسلا", color: "#e11d48", shape: "sedan" },
  ];

  window.D = { CITY, REGION, STAGES, VEHICLES, BRANDS };
})();
