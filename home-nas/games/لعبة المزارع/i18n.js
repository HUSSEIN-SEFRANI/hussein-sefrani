// لعبة المزارع — النصوص بلغات السيرفر: العربية، English، Français، Türkçe، Nederlands
// اللغة: لغة التلفاز (الصفحة الأم) ثم لغة المتصفح المحفوظة في السيرفر، ويستطيع الطفل تغييرها من شاشة البداية.
(() => {
  "use strict";
  const S = {
    ar: {
      day: "اليوم {0}", welcome: "أهلاً بعودتك! 🌞 {0} جاهز للحصاد ✨", welcome0: "أهلاً بعودتك! 🌞 مزرعتك بانتظارك", tomorrow: "🌙 هذا المحصول يحتاج وقتاً طويلاً — تعال غداً لتحصده!", longTag: "🌙 محصول الغد", hr: "س", mn: "د",
      lang: "العربية", title: "لعبة المزارع", by: "تمت برمجتها بواسطة ( حسين سفراني )", tag: "ازرع واحصد وكبّر مزرعتك 🌱",
      newFarm: "مزرعة جديدة", del: "حذف", delQ: "نحذف هذه المزرعة؟ لا يمكن إرجاعها.", yes: "نعم", no: "لا", back: "→ رجوع",
      choose: "اختر المزارع", market: "السوق", shop: "المتجر", seeds: "البذور", animals: "الحيوانات", decor: "الزينة",
      sellAll: "بيع كل شيء", empty: "المخزن فارغ — احصد شيئاً أولاً 🌽", plantQ: "ماذا نزرع هنا؟",
      lockPlots: "🔒 {0} 🟫", lockHarvest: "🔒 بعد أول حصاد", eats: "يأكل {0}", gives: "يعطي {0}",
      hLock: "🔒 أرض للبيع بـ {0} 🪙 — اضغط Enter للشراء", hEmpty: "أرض جاهزة — اضغط Enter لتزرع 🌱",
      hDry: "{0} — وقت السقي 💧 اضغط Enter", hGrow: "{0} — ينمو… ⏱ {1}", hReady: "{0} — حان وقت الحصاد ✨ اضغط Enter",
      hHungry: "{0} — وقت الطعام! أعطِ {1} (عندك {2})", hMaking: "{0} — {1} بعد ⏱ {2}", hProd: "{0} — اضغط Enter لتأخذ {1}",
      hMarket: "بِع محصولك واحصل على النقود 🪙", hShop: "اشترِ حيوانات وزينة 🐄🌳", hPlace: "📍 اختر مكاناً فارغاً لـ {0} ثم Enter · Backspace للإلغاء",
      buyLandQ: "تشتري هذه الأرض بـ {0} 🪙؟", buy: "شراء", landOk: "أرض جديدة! 🎉", noMoney: "النقود لا تكفي 🙂 بِع محصولك في السوق 🏪",
      watered: "سقيتها 💧", firstH: "أول حصاد! 🎉 بِعه في السوق 🏪 — والبرسيم ☘️ صار متاحاً", unlocked: "جديد: {0}",
      animalsOpen: "الحيوانات صارت في المتجر 🛒🐄", noFeed: "لا يوجد {0} في المخزن — ازرعه أولاً!", fed: "😋 شكراً!",
      busy: "هذا المكان مشغول 🙂", placed: "رائع! ✨", gift: "هدية من الجيران 🎁 +{0} 🪙", sellFor: "بيع بـ {0} 🪙", move: "نقل",
      start: "ازرع الذرة 🌽: اختر أرضاً واضغط Enter", have: "عندك {0}", plots: "الأرض",
      help: "<b>الأسهم</b> للتنقل · <b>Enter</b> أو <b>✕</b> للاختيار · <b>Backspace</b> أو <b>○</b> للرجوع",
      n: {
        pineapple: "الأناناس", grapes: "العنب", banana: "الموز",
        corn: "الذرة", clover: "البرسيم", wheat: "القمح", carrot: "الجزر", tomato: "الطماطم", strawberry: "الفراولة", sunflower: "دوار الشمس",
        watermelon: "البطيخ", pumpkin: "اليقطين", chicken: "الدجاجة", sheep: "الخروف", cow: "البقرة", egg: "البيض", wool: "الصوف", milk: "الحليب",
        flowers: "الزهور", mushroom: "الفطر", rock: "الصخرة", balloon: "البالون", pine: "الصنوبرة", tree: "الشجرة", lantern: "الفانوس",
        duck: "البطة", cat: "القطة", dog: "الكلب", hut: "الكوخ", fountain: "النافورة", house: "البيت", tractor: "الجرّار",
      },
    },
    en: {
      day: "Day {0}", welcome: "Welcome back! 🌞 {0} ready to harvest ✨", welcome0: "Welcome back! 🌞 Your farm is waiting", tomorrow: "🌙 This crop takes a long time — come back tomorrow to harvest it!", longTag: "🌙 Tomorrow crop", hr: "h", mn: "m",
      lang: "English", title: "The Farm Game", by: "Programmed by ( Hussein Sefrani )", tag: "Plant, harvest and grow your farm 🌱",
      newFarm: "New farm", del: "Delete", delQ: "Delete this farm? It cannot be undone.", yes: "Yes", no: "No", back: "← Back",
      choose: "Choose your farmer", market: "Market", shop: "Shop", seeds: "Seeds", animals: "Animals", decor: "Decorations",
      sellAll: "Sell everything", empty: "The barn is empty — harvest something first 🌽", plantQ: "What shall we plant here?",
      lockPlots: "🔒 {0} 🟫", lockHarvest: "🔒 after the first harvest", eats: "Eats {0}", gives: "Gives {0}",
      hLock: "🔒 Land for sale: {0} 🪙 — press Enter to buy", hEmpty: "Ready soil — press Enter to plant 🌱",
      hDry: "{0} — time to water 💧 press Enter", hGrow: "{0} — growing… ⏱ {1}", hReady: "{0} — ready to harvest ✨ press Enter",
      hHungry: "{0} — feeding time! Give {1} (you have {2})", hMaking: "{0} — {1} in ⏱ {2}", hProd: "{0} — press Enter to collect {1}",
      hMarket: "Sell your harvest and earn coins 🪙", hShop: "Buy animals and decorations 🐄🌳", hPlace: "📍 Choose an empty spot for {0}, then Enter · Backspace to cancel",
      buyLandQ: "Buy this land for {0} 🪙?", buy: "Buy", landOk: "New land! 🎉", noMoney: "Not enough coins 🙂 sell your harvest at the market 🏪",
      watered: "Watered 💧", firstH: "First harvest! 🎉 Sell it at the market 🏪 — and clover ☘️ is now available", unlocked: "New: {0}",
      animalsOpen: "Animals are now in the shop 🛒🐄", noFeed: "No {0} in the barn — plant some first!", fed: "😋 Thank you!",
      busy: "This spot is taken 🙂", placed: "Great! ✨", gift: "A gift from the neighbours 🎁 +{0} 🪙", sellFor: "Sell for {0} 🪙", move: "Move",
      start: "Plant corn 🌽: pick a field and press Enter", have: "you have {0}", plots: "Land",
      help: "<b>Arrows</b> to move · <b>Enter</b> or <b>✕</b> to choose · <b>Backspace</b> or <b>○</b> to go back",
      n: {
        pineapple: "Pineapple", grapes: "Grapes", banana: "Bananas",
        corn: "Corn", clover: "Clover", wheat: "Wheat", carrot: "Carrots", tomato: "Tomatoes", strawberry: "Strawberries", sunflower: "Sunflowers",
        watermelon: "Watermelon", pumpkin: "Pumpkin", chicken: "Chicken", sheep: "Sheep", cow: "Cow", egg: "Eggs", wool: "Wool", milk: "Milk",
        flowers: "Flowers", mushroom: "Mushroom", rock: "Rock", balloon: "Balloon", pine: "Pine tree", tree: "Tree", lantern: "Lantern",
        duck: "Duck", cat: "Cat", dog: "Dog", hut: "Hut", fountain: "Fountain", house: "House", tractor: "Tractor",
      },
    },
    fr: {
      day: "Jour {0}", welcome: "Bon retour ! 🌞 {0} prêt à récolter ✨", welcome0: "Bon retour ! 🌞 Ta ferme t'attend", tomorrow: "🌙 Cette culture prend du temps — reviens demain pour la récolter !", longTag: "🌙 Pour demain", hr: "h", mn: "min",
      lang: "Français", title: "Le jeu de la ferme", by: "Programmé par ( Hussein Sefrani )", tag: "Plante, récolte et agrandis ta ferme 🌱",
      newFarm: "Nouvelle ferme", del: "Supprimer", delQ: "Supprimer cette ferme ? C'est définitif.", yes: "Oui", no: "Non", back: "← Retour",
      choose: "Choisis ton fermier", market: "Marché", shop: "Boutique", seeds: "Graines", animals: "Animaux", decor: "Décorations",
      sellAll: "Tout vendre", empty: "La grange est vide — récolte d'abord 🌽", plantQ: "Que plantons-nous ici ?",
      lockPlots: "🔒 {0} 🟫", lockHarvest: "🔒 après la première récolte", eats: "Mange : {0}", gives: "Donne : {0}",
      hLock: "🔒 Terrain à vendre : {0} 🪙 — appuie sur Enter", hEmpty: "Terre prête — appuie sur Enter pour planter 🌱",
      hDry: "{0} — il faut arroser 💧 appuie sur Enter", hGrow: "{0} — ça pousse… ⏱ {1}", hReady: "{0} — prêt à récolter ✨ appuie sur Enter",
      hHungry: "{0} — c'est l'heure du repas ! Donne {1} (tu en as {2})", hMaking: "{0} — {1} dans ⏱ {2}", hProd: "{0} — appuie sur Enter pour prendre {1}",
      hMarket: "Vends ta récolte et gagne des pièces 🪙", hShop: "Achète des animaux et des décorations 🐄🌳", hPlace: "📍 Choisis une place libre pour {0}, puis Enter · Backspace pour annuler",
      buyLandQ: "Acheter ce terrain pour {0} 🪙 ?", buy: "Acheter", landOk: "Nouveau terrain ! 🎉", noMoney: "Pas assez de pièces 🙂 vends ta récolte au marché 🏪",
      watered: "Arrosé 💧", firstH: "Première récolte ! 🎉 Vends-la au marché 🏪 — et le trèfle ☘️ est disponible", unlocked: "Nouveau : {0}",
      animalsOpen: "Les animaux sont dans la boutique 🛒🐄", noFeed: "Pas de {0} dans la grange — plantes-en d'abord !", fed: "😋 Merci !",
      busy: "Cette place est prise 🙂", placed: "Super ! ✨", gift: "Un cadeau des voisins 🎁 +{0} 🪙", sellFor: "Vendre pour {0} 🪙", move: "Déplacer",
      start: "Plante du maïs 🌽 : choisis un champ et appuie sur Enter", have: "tu en as {0}", plots: "Terrain",
      help: "<b>Flèches</b> pour bouger · <b>Enter</b> ou <b>✕</b> pour choisir · <b>Backspace</b> ou <b>○</b> pour revenir",
      n: {
        pineapple: "Ananas", grapes: "Raisin", banana: "Bananes",
        corn: "Maïs", clover: "Trèfle", wheat: "Blé", carrot: "Carottes", tomato: "Tomates", strawberry: "Fraises", sunflower: "Tournesols",
        watermelon: "Pastèque", pumpkin: "Citrouille", chicken: "Poule", sheep: "Mouton", cow: "Vache", egg: "Œufs", wool: "Laine", milk: "Lait",
        flowers: "Fleurs", mushroom: "Champignon", rock: "Rocher", balloon: "Ballon", pine: "Sapin", tree: "Arbre", lantern: "Lanterne",
        duck: "Canard", cat: "Chat", dog: "Chien", hut: "Cabane", fountain: "Fontaine", house: "Maison", tractor: "Tracteur",
      },
    },
    tr: {
      day: "{0}. gün", welcome: "Tekrar hoş geldin! 🌞 {0} hasada hazır ✨", welcome0: "Tekrar hoş geldin! 🌞 Çiftliğin seni bekliyor", tomorrow: "🌙 Bu ürün uzun sürer — hasat için yarın gel!", longTag: "🌙 Yarının ürünü", hr: "sa", mn: "dk",
      lang: "Türkçe", title: "Çiftlik Oyunu", by: "Programlayan: ( Hussein Sefrani )", tag: "Ek, hasat et ve çiftliğini büyüt 🌱",
      newFarm: "Yeni çiftlik", del: "Sil", delQ: "Bu çiftlik silinsin mi? Geri alınamaz.", yes: "Evet", no: "Hayır", back: "← Geri",
      choose: "Çiftçini seç", market: "Pazar", shop: "Dükkân", seeds: "Tohumlar", animals: "Hayvanlar", decor: "Süsler",
      sellAll: "Hepsini sat", empty: "Ambar boş — önce hasat yap 🌽", plantQ: "Buraya ne ekelim?",
      lockPlots: "🔒 {0} 🟫", lockHarvest: "🔒 ilk hasattan sonra", eats: "Yer: {0}", gives: "Verir: {0}",
      hLock: "🔒 Satılık arazi: {0} 🪙 — almak için Enter", hEmpty: "Toprak hazır — ekmek için Enter 🌱",
      hDry: "{0} — sulama zamanı 💧 Enter'a bas", hGrow: "{0} — büyüyor… ⏱ {1}", hReady: "{0} — hasat zamanı ✨ Enter'a bas",
      hHungry: "{0} — yemek zamanı! {1} ver ({2} var)", hMaking: "{0} — {1}: ⏱ {2}", hProd: "{0} — {1} almak için Enter",
      hMarket: "Ürününü sat, para kazan 🪙", hShop: "Hayvan ve süs al 🐄🌳", hPlace: "📍 {0} için boş bir yer seç, sonra Enter · iptal için Backspace",
      buyLandQ: "Bu araziyi {0} 🪙 karşılığında al?", buy: "Al", landOk: "Yeni arazi! 🎉", noMoney: "Para yetmiyor 🙂 ürününü pazarda sat 🏪",
      watered: "Sulandı 💧", firstH: "İlk hasat! 🎉 Pazarda sat 🏪 — yonca ☘️ artık var", unlocked: "Yeni: {0}",
      animalsOpen: "Hayvanlar artık dükkânda 🛒🐄", noFeed: "Ambarda {0} yok — önce ek!", fed: "😋 Teşekkürler!",
      busy: "Bu yer dolu 🙂", placed: "Harika! ✨", gift: "Komşulardan hediye 🎁 +{0} 🪙", sellFor: "{0} 🪙 karşılığında sat", move: "Taşı",
      start: "Mısır ek 🌽: bir tarla seç ve Enter'a bas", have: "{0} var", plots: "Arazi",
      help: "<b>Oklar</b> ile gez · <b>Enter</b> veya <b>✕</b> seç · <b>Backspace</b> veya <b>○</b> geri",
      n: {
        pineapple: "Ananas", grapes: "Üzüm", banana: "Muz",
        corn: "Mısır", clover: "Yonca", wheat: "Buğday", carrot: "Havuç", tomato: "Domates", strawberry: "Çilek", sunflower: "Ayçiçeği",
        watermelon: "Karpuz", pumpkin: "Balkabağı", chicken: "Tavuk", sheep: "Koyun", cow: "İnek", egg: "Yumurta", wool: "Yün", milk: "Süt",
        flowers: "Çiçekler", mushroom: "Mantar", rock: "Kaya", balloon: "Balon", pine: "Çam", tree: "Ağaç", lantern: "Fener",
        duck: "Ördek", cat: "Kedi", dog: "Köpek", hut: "Kulübe", fountain: "Çeşme", house: "Ev", tractor: "Traktör",
      },
    },
    nl: {
      day: "Dag {0}", welcome: "Welkom terug! 🌞 {0} klaar om te oogsten ✨", welcome0: "Welkom terug! 🌞 Je boerderij wacht op je", tomorrow: "🌙 Dit gewas duurt lang — kom morgen terug om te oogsten!", longTag: "🌙 Voor morgen", hr: "u", mn: "min",
      lang: "Nederlands", title: "Het Boerderijspel", by: "Geprogrammeerd door ( Hussein Sefrani )", tag: "Zaai, oogst en laat je boerderij groeien 🌱",
      newFarm: "Nieuwe boerderij", del: "Wissen", delQ: "Deze boerderij wissen? Dit kan niet terug.", yes: "Ja", no: "Nee", back: "← Terug",
      choose: "Kies je boer", market: "Markt", shop: "Winkel", seeds: "Zaden", animals: "Dieren", decor: "Versiering",
      sellAll: "Alles verkopen", empty: "De schuur is leeg — oogst eerst iets 🌽", plantQ: "Wat zaaien we hier?",
      lockPlots: "🔒 {0} 🟫", lockHarvest: "🔒 na de eerste oogst", eats: "Eet {0}", gives: "Geeft {0}",
      hLock: "🔒 Land te koop: {0} 🪙 — druk op Enter", hEmpty: "Grond klaar — druk op Enter om te zaaien 🌱",
      hDry: "{0} — tijd om water te geven 💧 druk op Enter", hGrow: "{0} — groeit… ⏱ {1}", hReady: "{0} — klaar om te oogsten ✨ druk op Enter",
      hHungry: "{0} — etenstijd! Geef {1} (je hebt {2})", hMaking: "{0} — {1} over ⏱ {2}", hProd: "{0} — druk op Enter voor {1}",
      hMarket: "Verkoop je oogst en verdien munten 🪙", hShop: "Koop dieren en versiering 🐄🌳", hPlace: "📍 Kies een lege plek voor {0}, dan Enter · Backspace om te stoppen",
      buyLandQ: "Dit land kopen voor {0} 🪙?", buy: "Kopen", landOk: "Nieuw land! 🎉", noMoney: "Niet genoeg munten 🙂 verkoop je oogst op de markt 🏪",
      watered: "Water gegeven 💧", firstH: "Eerste oogst! 🎉 Verkoop hem op de markt 🏪 — en klaver ☘️ is er nu", unlocked: "Nieuw: {0}",
      animalsOpen: "Er zijn nu dieren in de winkel 🛒🐄", noFeed: "Geen {0} in de schuur — zaai eerst!", fed: "😋 Dank je!",
      busy: "Deze plek is bezet 🙂", placed: "Mooi! ✨", gift: "Een cadeau van de buren 🎁 +{0} 🪙", sellFor: "Verkopen voor {0} 🪙", move: "Verplaatsen",
      start: "Zaai maïs 🌽: kies een veld en druk op Enter", have: "je hebt {0}", plots: "Land",
      help: "<b>Pijltjes</b> om te bewegen · <b>Enter</b> of <b>✕</b> om te kiezen · <b>Backspace</b> of <b>○</b> terug",
      n: {
        pineapple: "Ananas", grapes: "Druiven", banana: "Bananen",
        corn: "Maïs", clover: "Klaver", wheat: "Tarwe", carrot: "Wortels", tomato: "Tomaten", strawberry: "Aardbeien", sunflower: "Zonnebloemen",
        watermelon: "Watermeloen", pumpkin: "Pompoen", chicken: "Kip", sheep: "Schaap", cow: "Koe", egg: "Eieren", wool: "Wol", milk: "Melk",
        flowers: "Bloemen", mushroom: "Paddenstoel", rock: "Steen", balloon: "Ballon", pine: "Den", tree: "Boom", lantern: "Lantaarn",
        duck: "Eend", cat: "Kat", dog: "Hond", hut: "Hut", fountain: "Fontein", house: "Huis", tractor: "Tractor",
      },
    },
  };
  const LIST = Object.keys(S);
  const ok = (l) => LIST.includes(l);
  function detect() {
    try { const p = window.parent; if (p !== window) { const l = p.FORCE_LANG || (p.I18N && p.I18N.lang); if (ok(l)) return l; } } catch {}
    try { const l = localStorage.getItem("lang"); if (ok(l)) return l; } catch {}
    const m = document.cookie.match(/(?:^|; )lang=(\w+)/);
    if (m && ok(m[1])) return m[1];
    return "ar";
  }
  const L = (window.FL = { S, list: LIST, lang: "ar" });
  L.set = (l) => {
    L.lang = ok(l) ? l : detect();
    const h = document.documentElement;
    h.lang = L.lang; h.dir = L.lang === "ar" ? "rtl" : "ltr";
    document.title = S[L.lang].title;
  };
  L.t = (k, ...a) => String(S[L.lang][k] ?? S.ar[k] ?? k).replace(/\{(\d)\}/g, (_, i) => a[i] ?? "");
  L.n = (id) => S[L.lang].n[id] || S.ar.n[id] || id;
  L.set(detect());
})();
