// لعبة المنزل — البيانات: الأغراض، الوصفات، أنواع الأشياء في العالم، الحيوانات، الألوان.
window.D = (() => {
  "use strict";
  // c: الفئة في الحقيبة · o: الشيء الذي يوضع في العالم · g: نوع الأرضية · food: كم يُشبع
  const ITEMS = {
    wood: { n: "خشب", c: "mat" }, stone: { n: "حجر", c: "mat" }, cotton: { n: "قطن", c: "mat" },
    gold: { n: "ذهب", c: "mat" }, diamond: { n: "ألماس", c: "mat" }, ruby: { n: "ياقوت", c: "mat" },

    apple: { n: "تفاحة", c: "food", food: 25 }, berry: { n: "توت", c: "food", food: 15 }, straw: { n: "فراولة", c: "food", food: 15 },
    carrot: { n: "جزرة", c: "food", food: 20 }, corn: { n: "ذرة", c: "food", food: 25 }, melon: { n: "بطيخة", c: "food", food: 45 },
    egg: { n: "بيضة", c: "food", food: 30 },

    bed: { n: "سرير", c: "furn", o: "bed" }, wardrobe: { n: "خزانة", c: "furn", o: "wardrobe" }, table: { n: "طاولة", c: "furn", o: "table" },
    chair: { n: "كرسي", c: "furn", o: "chair" }, sofa: { n: "كنبة", c: "furn", o: "sofa" }, rug: { n: "سجادة", c: "furn", o: "rug" },
    bookshelf: { n: "رف كتب", c: "furn", o: "bookshelf" }, toybox: { n: "صندوق ألعاب", c: "furn", o: "toybox" },
    pot: { n: "أصيص نبتة", c: "furn", o: "pot" }, fireplace: { n: "مدفأة", c: "furn", o: "fireplace" },

    lamp: { n: "مصباح", c: "furn", o: "lamp" }, floorlamp: { n: "مصباح طويل", c: "furn", o: "floorlamp" },
    lights: { n: "أضواء ملوّنة", c: "furn", o: "lights" }, radio: { n: "صندوق موسيقى", c: "furn", o: "radio" },
    tv: { n: "تلفاز", c: "furn", o: "tv" }, fridge: { n: "ثلاجة", c: "furn", o: "fridge" }, mirror: { n: "مرآة", c: "furn", o: "mirror" },
    aquarium: { n: "حوض أسماك", c: "furn", o: "aquarium" },

    ball: { n: "كرة", c: "furn", o: "ball" }, teddy: { n: "دبدوب", c: "furn", o: "teddy" }, books: { n: "كتب", c: "furn", o: "books" },
    toycar: { n: "سيارة لعبة", c: "furn", o: "toycar" }, cushion: { n: "وسادة", c: "furn", o: "cushion" }, doll: { n: "دمية", c: "furn", o: "doll" },
    vase: { n: "مزهرية", c: "furn", o: "vase" },

    wall: { n: "جدار", c: "build", o: "wall" }, door: { n: "باب", c: "build", o: "door" }, window: { n: "نافذة", c: "build", o: "window" },
    floor_wood: { n: "أرضية خشب", c: "build", g: 6 }, floor_tile: { n: "أرضية بلاط", c: "build", g: 7 }, floor_carpet: { n: "أرضية ناعمة", c: "build", g: 8 },
    path: { n: "ممر حجري", c: "garden", g: 5 }, fence: { n: "سياج", c: "garden", o: "fence" }, bench: { n: "مقعد الحديقة", c: "garden", o: "bench" },
    glamp: { n: "فانوس الحديقة", c: "garden", o: "glamp" }, fountain: { n: "نافورة", c: "garden", o: "fountain" },
    sapling: { n: "شتلة شجرة", c: "garden", o: "sapling" }, asapling: { n: "شتلة تفاح", c: "garden", o: "asapling" },
    fl0: { n: "زهرة وردية", c: "garden", o: "flower", v: 0 }, fl1: { n: "زهرة صفراء", c: "garden", o: "flower", v: 1 },
    fl2: { n: "زهرة زرقاء", c: "garden", o: "flower", v: 2 }, fl3: { n: "زهرة بيضاء", c: "garden", o: "flower", v: 3 },
  };

  // [الغرض، ماذا يحتاج، كم يصنع]
  const RECIPES = {
    work: [
      ["bed", { wood: 4, cotton: 2 }], ["wardrobe", { wood: 5 }], ["table", { wood: 3 }], ["chair", { wood: 2 }],
      ["sofa", { wood: 3, cotton: 3 }], ["rug", { cotton: 3 }], ["bookshelf", { wood: 4 }], ["toybox", { wood: 3 }],
      ["pot", { stone: 2 }], ["fireplace", { stone: 5 }], ["bench", { wood: 3, stone: 1 }], ["fence", { wood: 1 }, 3],
    ],
    build: [
      ["wall", { stone: 1 }, 2], ["door", { wood: 2 }], ["window", { wood: 1, stone: 1 }],
      ["floor_wood", { wood: 1 }, 4], ["floor_tile", { stone: 1 }, 4], ["floor_carpet", { cotton: 1 }, 4], ["path", { stone: 1 }, 4],
    ],
    gems: [
      ["lamp", { gold: 1 }], ["floorlamp", { gold: 1, stone: 1 }], ["glamp", { gold: 1, stone: 2 }], ["lights", { gold: 1, ruby: 1 }],
      ["radio", { gold: 2 }], ["fridge", { gold: 2, ruby: 1 }], ["tv", { gold: 2, diamond: 1 }], ["mirror", { gold: 1, diamond: 1 }],
      ["aquarium", { gold: 1, ruby: 1, diamond: 1 }], ["fountain", { stone: 4, diamond: 1 }],
    ],
  };
  const TABS = { work: "🔨 الأثاث", build: "🧱 البناء", gems: "💎 الأجهزة" };

  // أنواع الأشياء في العالم. solid: لا يُمشى فوقه · flat: يُرسم على الأرض · light: يضيء ليلاً · k: نوع التفاعل
  const OBJ = {
    tree: { solid: 1, k: "chop", n: "شجرة" }, bigtree: { solid: 1, k: "big", n: "شجرة كبيرة" }, appletree: { solid: 1, k: "apple", n: "شجرة تفاح" },
    stump: { solid: 1, k: "stump", n: "جذع" }, sapling: { solid: 1, k: "grow", n: "شتلة" }, asapling: { solid: 1, k: "grow", n: "شتلة تفاح" },
    bush: { solid: 1, k: "bush", n: "شجيرة توت" }, crop: { solid: 1, k: "crop", n: "نبتة" }, cotton: { solid: 1, k: "cotton", n: "نبتة قطن" },
    rock: { solid: 1, k: "mine", n: "صخرة", hits: 2 }, goldrock: { solid: 1, k: "mine", n: "صخرة لامعة", hits: 3 }, crystal: { solid: 1, k: "mine", n: "بلّورة", hits: 3 },
    wflower: { flat: 1, k: "wild", n: "أزهار برية" }, egg: { flat: 1, k: "egg", n: "بيضة" }, wool: { flat: 1, k: "wool", n: "صوف" },
    flower: { flat: 1, k: "furn", n: "زهرة" }, rug: { flat: 1, k: "furn", n: "سجادة" },
    wall: { solid: 1, k: "furn", wall: 1, n: "جدار" }, window: { solid: 1, k: "furn", wall: 1, n: "نافذة" }, door: { k: "furn", wall: 1, n: "باب" },
    fence: { solid: 1, k: "furn" }, bench: { solid: 1, k: "furn", use: "sit" }, glamp: { solid: 1, k: "furn", light: 1, use: "toggle" },
    fountain: { solid: 1, k: "furn", use: "splash", light: 0.6 },
    bed: { solid: 1, k: "furn", use: "sleep" }, wardrobe: { solid: 1, k: "furn", use: "dress" }, table: { solid: 1, k: "furn" }, chair: { solid: 1, k: "furn", use: "sit" },
    sofa: { solid: 1, k: "furn", use: "sit" }, bookshelf: { solid: 1, k: "furn", use: "read" }, toybox: { solid: 1, k: "furn", use: "play" },
    pot: { solid: 1, k: "furn" }, fireplace: { solid: 1, k: "furn", light: 1, use: "toggle" },
    lamp: { solid: 1, k: "furn", light: 1, use: "toggle" }, floorlamp: { solid: 1, k: "furn", light: 1, use: "toggle" }, lights: { solid: 1, k: "furn", light: 1.3, use: "toggle" },
    radio: { solid: 1, k: "furn", use: "music" }, tv: { solid: 1, k: "furn", use: "tv", light: 0.5 }, fridge: { solid: 1, k: "furn", use: "fridge" },
    mirror: { solid: 1, k: "furn", use: "dress" }, aquarium: { solid: 1, k: "furn", use: "fish", light: 0.5 },
    ball: { solid: 1, k: "furn", use: "play" }, teddy: { solid: 1, k: "furn", use: "hug" }, books: { solid: 1, k: "furn", use: "read" },
    toycar: { solid: 1, k: "furn", use: "play" }, cushion: { solid: 1, k: "furn" }, doll: { solid: 1, k: "furn", use: "hug" }, vase: { solid: 1, k: "furn" },
  };
  const TOYS = ["ball", "teddy", "books", "toycar", "cushion", "doll", "vase"];
  const CROPS = [["carrot", "جزر"], ["straw", "فراولة"], ["corn", "ذرة"], ["melon", "بطيخ"]];

  const ANIMALS = {
    cat: { n: "القطة", food: null }, rabbit: { n: "الأرنب", food: "carrot" }, chick: { n: "الدجاجة", food: "corn" },
    duck: { n: "البطة", food: "berry" }, sheep: { n: "الخروف", food: "apple" },
  };

  const WALLC = [["كريمي", "#f4dfbd"], ["وردي", "#f7b2c4"], ["سماوي", "#9dd2f3"], ["بنفسجي", "#c6b2f2"], ["نعناعي", "#a3e3bd"],
    ["أصفر", "#f8dc7d"], ["برتقالي", "#f6b783"], ["أبيض", "#eef0f3"], ["طوبي", "#e08b78"], ["أزرق", "#7ea4e2"]];

  // ألوان الشخصية
  const HAIR = ["#3a2416", "#6e4122", "#b8803f", "#f0cf6c", "#1f1b1b", "#b94a2c", "#e283b9", "#6ea6e6"];
  const SCARF = ["#f9a8d4", "#c4b5fd", "#93c5fd", "#86efac", "#fde68a", "#fca5a5", "#f5f5f4", "#5eead4"];
  const SKIN = ["#fde3cc", "#f6caa2", "#dca677", "#ad764d", "#7c5133"];
  const OUT = ["#f472b6", "#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#fb923c", "#2dd4bf", "#f5f5f4"];
  const HAIRS = ["قصير", "ذيل حصان", "ضفيرتان", "كعكة", "طويل", "قصير جداً", "مجعّد", "حجاب"];
  const TOPS = ["فستان", "قميص وبنطال", "بلوزة وتنورة"];
  const ACCS = ["بدون", "فيونكة", "زهرة", "قبعة", "نظارة", "تاج"];

  return { ITEMS, RECIPES, TABS, OBJ, TOYS, CROPS, ANIMALS, WALLC, HAIR, SCARF, SKIN, OUT, HAIRS, TOPS, ACCS };
})();
