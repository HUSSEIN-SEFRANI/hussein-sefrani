// قطارات أحمد — النصوص بثلاث لغات: العربية، English، Türkçe
(() => {
  "use strict";
  const S = {
    ar: {
      title: "قطارات أحمد", hello: "أحمد سائق القطار! 🚂", lang: "العربية",
      drive: "قُد القطار", driveSub: "محطات وجبال ومنعطفات", build: "ابنِ السكة", buildSub: "{0} من {1} لغزاً",
      deliver: "التوصيل", deliverSub: "ألوان وأرقام", garage: "قاطراتي", garageSub: "⭐ {0}",
      back: "→ رجوع", help: "<b>الأسهم</b> للتنقل · <b>Enter</b> أو <b>✕</b> للاختيار · <b>Backspace</b> أو <b>○</b> للرجوع",
      driveHelp: "<b>→</b> أسرع · <b>←</b> أبطأ · <b>↑ ↓</b> تحويلة · <b>✕</b> صفّارة · <b>□</b> توقف · <b>○</b> استراحة",
      faster: "أسرع", slower: "أبطأ", stop: "توقف", whistle: "صفّارة", up: "فوق", down: "تحت", daynight: "نهار/ليل",
      pause: "استراحة ⏸️", resume: "▶️ متابعة", restart: "🔁 من البداية", menu: "🏠 القائمة",
      start: "انطلق! اضغط «أسرع» ⟶", hill: "جبل! زِد السرعة ⛰️", hillOk: "قوة رائعة على الجبل! ⛰️",
      curve: "منعطف! خفّف السرعة 🐢", easy: "طريق هادئ… خفّف السرعة 🐢", tooFast: "نخفّف السرعة معاً 🙂",
      red: "الإشارة حمراء! توقف 🔴", green: "أخضر! انطلق 🟢", arrow: "انظر إلى السهم وغيّر المسار ↕️",
      arrowUp: "السهم إلى فوق ⬆️", arrowDown: "السهم إلى تحت ⬇️", closed: "الطريق مغلق! نرجع ونتبع السهم 🙂",
      station: "محطة! توقف عند 🛑", stopHere: "تقدّم قليلاً حتى 🛑", over: "توقفنا! المرة القادمة توقف عند 🛑",
      longer: "القطار صار أطول! {0} عربات 🚃", longer1: "القطار صار أطول! عربة جديدة 🚃",
      well: "أحسنت! ⭐", tripDone: "وصلنا! رحلة رائعة 🎉", tunnel: "نفق! أضأنا المصباح 💡", bridge: "جسر فوق النهر 🌉",
      sum: "⭐ {0} نجمة · 🚃 {1} عربات · 🚉 {2} محطات", again: "🔁 رحلة جديدة", earned: "+{0} ⭐ في رصيدك!",
      level: "المرحلة {0}", go: "🚂 انطلق", erase: "🧽 امسح", buildTip: "اضغط على المربع لتضع قطعة سكة، ثم «انطلق»",
      missing: "السكة ناقصة هنا 🔧 نحاول مجدداً", arrived: "وصل القطار إلى المحطة! 🎉", next: "التالية ←", levels: "🗺️ المراحل",
      bridgeOnly: "على الماء نضع جسراً 🌉", tries: "المحاولات: {0}",
      howMany: "كم عربة يجرّ القطار؟", pick: "محطة {0}! اختر العربات {0}", count: "كم عربة نزلت هنا؟",
      notThis: "هذه {0} 🙂 نريد {1}", yes: "صحيح! ✅", tryAgain: "حاول مرة أخرى 💪", allDone: "وصلت كل الحمولات! 🎉",
      round: "الجولة {0}", unlockAt: "🔒 ⭐ {0}", chosen: "✅", locos: "القاطرات", colors: "الألوان",
      loco: { steam: "بخارية", electric: "كهربائية", fast: "سريعة", freight: "بضائع" },
      col: { red: "الحمراء", blue: "الزرقاء", green: "الخضراء", yellow: "الصفراء", orange: "البرتقالية", purple: "البنفسجية", pink: "الوردية", silver: "الفضية" },
    },
    en: {
      title: "Ahmad's Trains", hello: "Ahmad is the train driver! 🚂", lang: "English",
      drive: "Drive the Train", driveSub: "Stations, hills and curves", build: "Build the Track", buildSub: "{0} of {1} puzzles",
      deliver: "Delivery", deliverSub: "Colors and numbers", garage: "My Trains", garageSub: "⭐ {0}",
      back: "← Back", help: "<b>Arrows</b> to move · <b>Enter</b> or <b>✕</b> to choose · <b>Backspace</b> or <b>○</b> to go back",
      driveHelp: "<b>→</b> faster · <b>←</b> slower · <b>↑ ↓</b> switch · <b>✕</b> whistle · <b>□</b> stop · <b>○</b> pause",
      faster: "Faster", slower: "Slower", stop: "Stop", whistle: "Whistle", up: "Up", down: "Down", daynight: "Day/Night",
      pause: "Pause ⏸️", resume: "▶️ Continue", restart: "🔁 Restart", menu: "🏠 Menu",
      start: "Let's go! Press “Faster” ⟶", hill: "A hill! Speed up ⛰️", hillOk: "Great power on the hill! ⛰️",
      curve: "A curve! Slow down 🐢", easy: "Quiet road… slow down 🐢", tooFast: "Let's slow down together 🙂",
      red: "Red light! Stop 🔴", green: "Green! Go 🟢", arrow: "Look at the arrow and switch tracks ↕️",
      arrowUp: "The arrow points up ⬆️", arrowDown: "The arrow points down ⬇️", closed: "This way is closed! Let's go back and follow the arrow 🙂",
      station: "A station! Stop at 🛑", stopHere: "A little more, up to 🛑", over: "We stopped! Next time stop at 🛑",
      longer: "The train is longer! {0} cars 🚃", longer1: "The train is longer! A new car 🚃",
      well: "Well done! ⭐", tripDone: "We made it! Great trip 🎉", tunnel: "A tunnel! Lights on 💡", bridge: "A bridge over the river 🌉",
      sum: "⭐ {0} stars · 🚃 {1} cars · 🚉 {2} stations", again: "🔁 New trip", earned: "+{0} ⭐ added!",
      level: "Level {0}", go: "🚂 Go", erase: "🧽 Erase", buildTip: "Tap a square to place track, then “Go”",
      missing: "Track missing here 🔧 Let's try again", arrived: "The train reached the station! 🎉", next: "Next →", levels: "🗺️ Levels",
      bridgeOnly: "On water we put a bridge 🌉", tries: "Tries: {0}",
      howMany: "How many cars does the train pull?", pick: "The {0} station! Choose the {0} cars", count: "How many cars got off here?",
      notThis: "This one is {0} 🙂 we need {1}", yes: "Correct! ✅", tryAgain: "Try again 💪", allDone: "Everything is delivered! 🎉",
      round: "Round {0}", unlockAt: "🔒 ⭐ {0}", chosen: "✅", locos: "Engines", colors: "Colors",
      loco: { steam: "Steam", electric: "Electric", fast: "High-speed", freight: "Freight" },
      col: { red: "red", blue: "blue", green: "green", yellow: "yellow", orange: "orange", purple: "purple", pink: "pink", silver: "silver" },
    },
    tr: {
      title: "Ahmet'in Trenleri", hello: "Ahmet tren sürücüsü! 🚂", lang: "Türkçe",
      drive: "Treni Sür", driveSub: "İstasyonlar, dağlar, virajlar", build: "Rayı Kur", buildSub: "{1} bulmacadan {0}",
      deliver: "Teslimat", deliverSub: "Renkler ve sayılar", garage: "Trenlerim", garageSub: "⭐ {0}",
      back: "← Geri", help: "<b>Oklar</b> ile gez · <b>Enter</b> veya <b>✕</b> seç · <b>Backspace</b> veya <b>○</b> geri",
      driveHelp: "<b>→</b> hızlan · <b>←</b> yavaşla · <b>↑ ↓</b> makas · <b>✕</b> düdük · <b>□</b> dur · <b>○</b> mola",
      faster: "Hızlan", slower: "Yavaşla", stop: "Dur", whistle: "Düdük", up: "Yukarı", down: "Aşağı", daynight: "Gündüz/Gece",
      pause: "Mola ⏸️", resume: "▶️ Devam", restart: "🔁 Baştan", menu: "🏠 Menü",
      start: "Hadi! “Hızlan”a bas ⟶", hill: "Dağ! Hızlan ⛰️", hillOk: "Dağda harika güç! ⛰️",
      curve: "Viraj! Yavaşla 🐢", easy: "Sakin yol… yavaşla 🐢", tooFast: "Birlikte yavaşlayalım 🙂",
      red: "Kırmızı ışık! Dur 🔴", green: "Yeşil! Git 🟢", arrow: "Oka bak ve yol değiştir ↕️",
      arrowUp: "Ok yukarıyı gösteriyor ⬆️", arrowDown: "Ok aşağıyı gösteriyor ⬇️", closed: "Bu yol kapalı! Geri dönüp oku takip edelim 🙂",
      station: "İstasyon! 🛑 işaretinde dur", stopHere: "Biraz daha, 🛑 işaretine kadar", over: "Durduk! Bir dahakine 🛑 işaretinde dur",
      longer: "Tren uzadı! {0} vagon 🚃", longer1: "Tren uzadı! Yeni bir vagon 🚃",
      well: "Aferin! ⭐", tripDone: "Vardık! Harika yolculuk 🎉", tunnel: "Tünel! Farlar açık 💡", bridge: "Nehrin üstünde köprü 🌉",
      sum: "⭐ {0} yıldız · 🚃 {1} vagon · 🚉 {2} istasyon", again: "🔁 Yeni yolculuk", earned: "+{0} ⭐ eklendi!",
      level: "Seviye {0}", go: "🚂 Git", erase: "🧽 Sil", buildTip: "Kare seç ve ray koy, sonra “Git”",
      missing: "Burada ray eksik 🔧 Tekrar deneyelim", arrived: "Tren istasyona vardı! 🎉", next: "Sonraki →", levels: "🗺️ Seviyeler",
      bridgeOnly: "Suyun üstüne köprü koyarız 🌉", tries: "Deneme: {0}",
      howMany: "Tren kaç vagon çekiyor?", pick: "{0} istasyon! {0} vagonları seç", count: "Burada kaç vagon indi?",
      notThis: "Bu {0} 🙂 bize {1} lazım", yes: "Doğru! ✅", tryAgain: "Tekrar dene 💪", allDone: "Her şey teslim edildi! 🎉",
      round: "Tur {0}", unlockAt: "🔒 ⭐ {0}", chosen: "✅", locos: "Lokomotifler", colors: "Renkler",
      loco: { steam: "Buharlı", electric: "Elektrikli", fast: "Hızlı", freight: "Yük" },
      col: { red: "kırmızı", blue: "mavi", green: "yeşil", yellow: "sarı", orange: "turuncu", purple: "mor", pink: "pembe", silver: "gümüş" },
    },
  };
  const I = (window.I = { S, lang: "ar", list: ["ar", "en", "tr"] });
  I.t = (k, ...a) => {
    let v = (S[I.lang] && S[I.lang][k]) ?? S.ar[k] ?? k;
    a.forEach((x, i) => { v = v.split("{" + i + "}").join(x); });
    return v;
  };
  I.col = (c) => S[I.lang].col[c] || c;
  I.loco = (c) => S[I.lang].loco[c] || c;
  I.set = (l) => {
    I.lang = S[l] ? l : "ar";
    document.documentElement.lang = I.lang;
    document.documentElement.dir = I.lang === "ar" ? "rtl" : "ltr";
    document.title = S[I.lang].title;
  };
})();
