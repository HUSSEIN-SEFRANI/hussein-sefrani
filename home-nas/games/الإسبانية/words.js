// words.js — الكلمات: [الإسبانية، العربية، النطق بالحروف العربية، مفتاح الرسم في art.js]
// الأسماء مع el (مذكر) / la (مؤنث). الأرقام والألوان والتحيات بدون أداة.
window.ES_CATS = [
  { id: "animales", name: "الحيوانات", es: "Los animales", icon: "Hund", bg: "linear-gradient(135deg,#f97316,#ef4444)", words: [
    ["el perro", "كلب", "إل بيرّو", "Hund"], ["el gato", "قطة", "إل غاتو", "Katze"], ["la vaca", "بقرة", "لا باكا", "Kuh"], ["el caballo", "حصان", "إل كابايو", "Pferd"],
    ["la oveja", "خروف", "لا أوبيخا", "Schaf"], ["el conejo", "أرنب", "إل كونيخو", "Hase"], ["la gallina", "دجاجة", "لا غايينا", "Huhn"], ["el pato", "بطة", "إل باتو", "Ente"],
    ["el pez", "سمكة", "إل بيس", "Fisch"], ["el pájaro", "عصفور", "إل باخارو", "Vogel"], ["el león", "أسد", "إل ليون", "Löwe"], ["el elefante", "فيل", "إل إليفانتي", "Elefant"],
    ["el mono", "قرد", "إل مونو", "Affe"], ["la jirafa", "زرافة", "لا خيرافا", "Giraffe"], ["el oso", "دب", "إل أوسو", "Bär"], ["el ratón", "فأر", "إل راتون", "Maus"],
    ["la rana", "ضفدع", "لا رانا", "Frosch"], ["la serpiente", "أفعى", "لا سيربيِنتي", "Schlange"], ["el tigre", "نمر", "إل تيغري", "Tiger"], ["la cebra", "حمار وحشي", "لا سيبرا", "Zebra"],
    ["la tortuga", "سلحفاة", "لا تورتوغا", "Schildkröte"], ["la mariposa", "فراشة", "لا ماريبوسا", "Schmetterling"], ["la abeja", "نحلة", "لا أبيخا", "Biene"], ["el búho", "بومة", "إل بووو", "Eule"],
    ["el zorro", "ثعلب", "إل سورّو", "Fuchs"], ["el camello", "جمل", "إل كاميو", "Kamel"], ["el pingüino", "بطريق", "إل بينغوينو", "Pinguin"], ["el tiburón", "قرش", "إل تيبورون", "Hai"],
    ["la araña", "عنكبوت", "لا أرانْيا", "Spinne"], ["el cerdo", "خنزير", "إل سيردو", "Schwein"]] },
  { id: "comida", name: "الطعام", es: "La comida", icon: "Apfel", bg: "linear-gradient(135deg,#22c55e,#15803d)", words: [
    ["la manzana", "تفاحة", "لا مانسانا", "Apfel"], ["el plátano", "موزة", "إل بلاتانو", "Banane"], ["la naranja", "برتقالة", "لا نارانخا", "Orange"], ["la fresa", "فراولة", "لا فريسا", "Erdbeere"],
    ["la uva", "عنب", "لا أوبا", "Traube"], ["la pera", "إجاصة", "لا بيرا", "Birne"], ["la cereza", "كرز", "لا سيريسا", "Kirsche"], ["la sandía", "بطيخ", "لا سانديا", "Wassermelone"],
    ["el limón", "ليمون", "إل ليمون", "Zitrone"], ["la zanahoria", "جزرة", "لا ساناؤريا", "Karotte"], ["el tomate", "طماطم", "إل توماتي", "Tomate"], ["la patata", "بطاطا", "لا باتاتا", "Kartoffel"],
    ["el pan", "خبز", "إل بان", "Brot"], ["la leche", "حليب", "لا ليتشي", "Milch"], ["el queso", "جبن", "إل كيسو", "Käse"], ["el huevo", "بيضة", "إل وِيبو", "Ei"],
    ["el pastel", "كعكة", "إل باستيل", "Kuchen"], ["el agua", "ماء", "إل أغوا", "Wasser"], ["el arroz", "أرز", "إل أرّوس", "Reis"], ["la sopa", "حساء", "لا سوبا", "Suppe"],
    ["el helado", "مثلجات", "إل إيلادو", "Eis"], ["el jugo", "عصير", "إل خوغو", "Saft"], ["la miel", "عسل", "لا مييل", "Honig"], ["el pepino", "خيار", "إل بيبينو", "Gurke"],
    ["la piña", "أناناس", "لا بينْيا", "Ananas"]] },
  { id: "colores", name: "الألوان", es: "Los colores", icon: "bunt", bg: "linear-gradient(135deg,#06b6d4,#2563eb)", words: [
    ["rojo", "أحمر", "روخو", "rot"], ["azul", "أزرق", "أسول", "blau"], ["verde", "أخضر", "بيردي", "grün"], ["amarillo", "أصفر", "أماريّو", "gelb"],
    ["naranja", "برتقالي", "نارانخا", "orange"], ["morado", "بنفسجي", "مورادو", "lila"], ["rosa", "وردي", "روسا", "rosa"], ["negro", "أسود", "نيغرو", "schwarz"],
    ["blanco", "أبيض", "بلانكو", "weiß"], ["marrón", "بني", "مارّون", "braun"], ["gris", "رمادي", "غريس", "grau"], ["multicolor", "ملوّن", "مولتيكولور", "bunt"]] },
  { id: "numeros", name: "الأرقام", es: "Los números", icon: "#3", bg: "linear-gradient(135deg,#a855f7,#ec4899)", words: [
    ["uno", "واحد", "أونو"], ["dos", "اثنان", "دوس"], ["tres", "ثلاثة", "تريس"], ["cuatro", "أربعة", "كواترو"], ["cinco", "خمسة", "سينكو"],
    ["seis", "ستة", "سييس"], ["siete", "سبعة", "سييتي"], ["ocho", "ثمانية", "أوتشو"], ["nueve", "تسعة", "نويبي"], ["diez", "عشرة", "دييس"],
    ["once", "أحد عشر", "أونسي"], ["doce", "اثنا عشر", "دوسي"], ["trece", "ثلاثة عشر", "تريسي"], ["catorce", "أربعة عشر", "كاتورسي"], ["quince", "خمسة عشر", "كينسي"],
    ["dieciséis", "ستة عشر", "دييسي-سييس"], ["diecisiete", "سبعة عشر", "دييسي-سييتي"], ["dieciocho", "ثمانية عشر", "دييسي-أوتشو"], ["diecinueve", "تسعة عشر", "دييسي-نويبي"], ["veinte", "عشرون", "بيينتي"]] },
  { id: "cuerpo", name: "الجسم", es: "El cuerpo", icon: "Hand", bg: "linear-gradient(135deg,#f59e0b,#b45309)", words: [
    ["la cabeza", "رأس", "لا كابيسا", "Kopf"], ["el ojo", "عين", "إل أوخو", "Auge"], ["la oreja", "أذن", "لا أوريخا", "Ohr"], ["la nariz", "أنف", "لا ناريس", "Nase"],
    ["la boca", "فم", "لا بوكا", "Mund"], ["el diente", "سن", "إل دييِنتي", "Zahn"], ["la lengua", "لسان", "لا لينغوا", "Zunge"], ["el pelo", "شعر", "إل بيلو", "Haar"],
    ["la mano", "يد", "لا مانو", "Hand"], ["el dedo", "إصبع", "إل ديدو", "Finger"], ["el brazo", "ذراع", "إل براسو", "Arm"], ["la pierna", "ساق", "لا بييرنا", "Bein"],
    ["la barriga", "بطن", "لا بارّيغا", "Bauch"], ["la rodilla", "ركبة", "لا روديّا", "Knie"], ["el pie", "قدم", "إل بييه", "Fuß"], ["el corazón", "قلب", "إل كوراسون", "Herz"]] },
  { id: "alrededor", name: "حولنا", es: "La casa y la escuela", icon: "Haus", bg: "linear-gradient(135deg,#10b981,#0e7490)", words: [
    ["la casa", "بيت", "لا كاسا", "Haus"], ["la puerta", "باب", "لا بويرتا", "Tür"], ["la ventana", "نافذة", "لا بينتانا", "Fenster"], ["la mesa", "طاولة", "لا ميسا", "Tisch"],
    ["la silla", "كرسي", "لا سيّا", "Stuhl"], ["la cama", "سرير", "لا كاما", "Bett"], ["la lámpara", "مصباح", "لا لامبارا", "Lampe"], ["el reloj", "ساعة", "إل ريلوخ", "Uhr"],
    ["la llave", "مفتاح", "لا يابي", "Schlüssel"], ["el libro", "كتاب", "إل ليبرو", "Buch"], ["el lápiz", "قلم رصاص", "إل لابيس", "Stift"], ["la escuela", "مدرسة", "لا إسكويلا", "Schule"],
    ["la mochila", "حقيبة", "لا موتشيلا", "Tasche"], ["el cuaderno", "دفتر", "إل كواديرنو", "Heft"], ["la tijera", "مقص", "لا تيخيرا", "Schere"], ["la pelota", "كرة", "لا بيلوتا", "Ball"],
    ["el coche", "سيارة", "إل كوتشي", "Auto"], ["la bicicleta", "دراجة", "لا بيسيكليتا", "Fahrrad"], ["el autobús", "حافلة", "إل آوتوبوس", "Bus"], ["el sol", "شمس", "إل سول", "Sonne"],
    ["la luna", "قمر", "لا لونا", "Mond"], ["la estrella", "نجمة", "لا إستريّا", "Stern"], ["el árbol", "شجرة", "إل آربول", "Baum"], ["la flor", "زهرة", "لا فلور", "Blume"]] },
  { id: "familia", name: "العائلة", es: "La familia", icon: "Familie", bg: "linear-gradient(135deg,#ec4899,#be185d)", words: [
    ["la madre", "أم", "لا مادري", "Mutter"], ["el padre", "أب", "إل بادري", "Vater"], ["el hermano", "أخ", "إل إيرمانو", "Bruder"], ["la hermana", "أخت", "لا إيرمانا", "Schwester"],
    ["el bebé", "رضيع", "إل بيبيه", "Baby"], ["la abuela", "جدة", "لا أبويلا", "Oma"], ["el abuelo", "جد", "إل أبويلو", "Opa"], ["el tío", "عم / خال", "إل تيو", "Onkel"],
    ["la tía", "عمة / خالة", "لا تيا", "Tante"], ["la familia", "عائلة", "لا فاميليا", "Familie"], ["el niño", "ولد", "إل نينْيو", "Junge"], ["la niña", "بنت", "لا نينْيا", "Mädchen"]] },
  { id: "frases", name: "التحيات وجمل", es: "¡Hola!", icon: "Hallo", bg: "linear-gradient(135deg,#6366f1,#7c3aed)", words: [
    ["¡Hola!", "مرحباً", "أولا!", "Hallo"], ["¡Buenos días!", "صباح الخير", "بوينوس دياس!", "Guten Morgen"], ["¡Buenas tardes!", "مساء الخير (بعد الظهر)", "بويناس تاردِس!", "Guten Tag"],
    ["¡Buenas noches!", "مساء الخير / ليلة سعيدة", "بويناس نوتشِس!", "Guten Abend"], ["¡Dulces sueños!", "أحلاماً سعيدة", "دولسِس سوينْيوس!", "Gute Nacht"],
    ["¡Hasta luego!", "أراك لاحقاً", "أستا لويغو!", "Tschüss"], ["¡Adiós!", "مع السلامة", "أدْيوس!", "Auf Wiedersehen"], ["¡Gracias!", "شكراً", "غراسياس!", "Danke"],
    ["Por favor", "من فضلك", "بور فابور", "Bitte"], ["Sí", "نعم", "سي", "Ja"], ["No", "لا", "نو", "Nein"], ["Lo siento", "آسف", "لو سيينتو", "Entschuldigung"],
    ["¿Cómo estás?", "كيف حالك؟", "كومو إستاس؟", "Wie geht's?"], ["Estoy bien", "أنا بخير", "إستوي بيين", "Mir geht es gut"], ["Me llamo …", "اسمي …", "مي يامو", "Ich heiße …"],
    ["Te quiero", "أحبك", "تي كييرو", "Ich liebe dich"], ["¡Bienvenido!", "أهلاً وسهلاً", "بيينبينيدو!", "Willkommen"], ["Tengo hambre", "أنا جائع", "تينغو آمبري", "Ich habe Hunger"],
    ["Estoy cansado", "أنا متعب", "إستوي كانسادو", "Ich bin müde"]] },
];
