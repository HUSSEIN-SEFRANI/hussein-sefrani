"""شاشة الترحيب عند دخول كل شخص على التلفاز: كلمة جديدة بثلاث لغات، وحديث نبوي.

الأحاديث في data/hadith.json: كل نص فيها تحقّقنا آلياً أنه موجود بلفظه في صحيح البخاري أو صحيح مسلم
(المصدر مكتوب مع كل حديث، و«متفق عليه» إذا وُجد في الاثنين). الشرح البسيط للأطفال من كلامنا وليس من الحديث.
لكل شخص ترتيب مختلف، ولا يتكرر شيء حتى يمرّ على القائمة كلها.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

from flask import Blueprint, jsonify

from .core import admin_required, get_setting, set_setting

bp = Blueprint("welcome", __name__)

# (الرسمة، العربية، الفرنسية، الإنجليزية)
WORDS = [
    # الحيوانات
    ("🐱", "قطة", "le chat", "cat"), ("🐶", "كلب", "le chien", "dog"), ("🐄", "بقرة", "la vache", "cow"),
    ("🐴", "حصان", "le cheval", "horse"), ("🐑", "خروف", "le mouton", "sheep"), ("🐐", "ماعز", "la chèvre", "goat"),
    ("🐔", "دجاجة", "la poule", "hen"), ("🦆", "بطة", "le canard", "duck"), ("🐇", "أرنب", "le lapin", "rabbit"),
    ("🐟", "سمكة", "le poisson", "fish"), ("🐦", "عصفور", "l'oiseau", "bird"), ("🦁", "أسد", "le lion", "lion"),
    ("🐘", "فيل", "l'éléphant", "elephant"), ("🐒", "قرد", "le singe", "monkey"), ("🦒", "زرافة", "la girafe", "giraffe"),
    ("🐻", "دب", "l'ours", "bear"), ("🦊", "ثعلب", "le renard", "fox"), ("🐢", "سلحفاة", "la tortue", "turtle"),
    ("🐸", "ضفدع", "la grenouille", "frog"), ("🐝", "نحلة", "l'abeille", "bee"), ("🦋", "فراشة", "le papillon", "butterfly"),
    ("🐫", "جمل", "le chameau", "camel"), ("🐧", "بطريق", "le manchot", "penguin"), ("🐬", "دلفين", "le dauphin", "dolphin"),
    ("🐭", "فأر", "la souris", "mouse"), ("🦉", "بومة", "le hibou", "owl"), ("🐍", "أفعى", "le serpent", "snake"),
    ("🐜", "نملة", "la fourmi", "ant"), ("🐌", "حلزون", "l'escargot", "snail"), ("🐳", "حوت", "la baleine", "whale"),
    # الطعام
    ("🍎", "تفاحة", "la pomme", "apple"), ("🍌", "موزة", "la banane", "banana"), ("🍊", "برتقالة", "l'orange", "orange"),
    ("🍓", "فراولة", "la fraise", "strawberry"), ("🍇", "عنب", "le raisin", "grapes"), ("🍐", "إجاصة", "la poire", "pear"),
    ("🍉", "بطيخ", "la pastèque", "watermelon"), ("🍋", "ليمونة", "le citron", "lemon"), ("🍒", "كرز", "la cerise", "cherry"),
    ("🥕", "جزرة", "la carotte", "carrot"), ("🍅", "طماطم", "la tomate", "tomato"), ("🥔", "بطاطا", "la pomme de terre", "potato"),
    ("🍞", "خبز", "le pain", "bread"), ("🥛", "حليب", "le lait", "milk"), ("🧀", "جبن", "le fromage", "cheese"),
    ("🥚", "بيضة", "l'œuf", "egg"), ("🍰", "كعكة", "le gâteau", "cake"), ("🍯", "عسل", "le miel", "honey"),
    ("🍚", "أرز", "le riz", "rice"), ("💧", "ماء", "l'eau", "water"), ("🥒", "خيار", "le concombre", "cucumber"),
    ("🧅", "بصل", "l'oignon", "onion"), ("🍪", "بسكويت", "le biscuit", "cookie"), ("🥣", "حساء", "la soupe", "soup"),
    # البيت والأشياء
    ("🏠", "بيت", "la maison", "house"), ("🚪", "باب", "la porte", "door"), ("🪟", "نافذة", "la fenêtre", "window"),
    ("🪑", "كرسي", "la chaise", "chair"), ("🛏️", "سرير", "le lit", "bed"), ("🔑", "مفتاح", "la clé", "key"),
    ("📖", "كتاب", "le livre", "book"), ("✏️", "قلم رصاص", "le crayon", "pencil"), ("🎒", "حقيبة مدرسية", "le cartable", "school bag"),
    ("⚽", "كرة", "le ballon", "ball"), ("🧸", "دبدوب", "l'ours en peluche", "teddy bear"), ("🕰️", "ساعة حائط", "l'horloge", "clock"),
    ("💡", "مصباح", "la lampe", "lamp"), ("📺", "تلفاز", "la télévision", "television"), ("📱", "هاتف", "le téléphone", "phone"),
    ("🧦", "جوارب", "les chaussettes", "socks"), ("👕", "قميص", "le t-shirt", "T-shirt"), ("👟", "حذاء", "la chaussure", "shoe"),
    ("🧢", "قبعة", "la casquette", "cap"), ("🪥", "فرشاة أسنان", "la brosse à dents", "toothbrush"), ("🧼", "صابون", "le savon", "soap"),
    ("🍽️", "صحن", "l'assiette", "plate"), ("🥄", "ملعقة", "la cuillère", "spoon"), ("🔔", "جرس", "la cloche", "bell"),
    ("☂️", "مظلة", "le parapluie", "umbrella"), ("🎁", "هدية", "le cadeau", "gift"), ("🧩", "لغز", "le puzzle", "puzzle"),
    # الطبيعة
    ("☀️", "شمس", "le soleil", "sun"), ("🌙", "قمر", "la lune", "moon"), ("⭐", "نجمة", "l'étoile", "star"),
    ("☁️", "غيمة", "le nuage", "cloud"), ("🌧️", "مطر", "la pluie", "rain"), ("❄️", "ثلج", "la neige", "snow"),
    ("🌈", "قوس قزح", "l'arc-en-ciel", "rainbow"), ("🌳", "شجرة", "l'arbre", "tree"), ("🌸", "زهرة", "la fleur", "flower"),
    ("🍃", "ورقة شجر", "la feuille", "leaf"), ("⛰️", "جبل", "la montagne", "mountain"), ("🌊", "بحر", "la mer", "sea"),
    ("🏖️", "شاطئ", "la plage", "beach"), ("🔥", "نار", "le feu", "fire"), ("🌍", "الأرض", "la Terre", "Earth"),
    ("💨", "ريح", "le vent", "wind"), ("🪨", "حجر", "la pierre", "stone"), ("🌱", "نبتة", "la plante", "plant"),
    # المواصلات
    ("🚗", "سيارة", "la voiture", "car"), ("🚌", "حافلة", "le bus", "bus"), ("🚲", "دراجة", "le vélo", "bicycle"),
    ("✈️", "طائرة", "l'avion", "airplane"), ("🚆", "قطار", "le train", "train"), ("🚢", "سفينة", "le bateau", "ship"),
    ("🚒", "سيارة إطفاء", "le camion de pompiers", "fire truck"), ("🚑", "سيارة إسعاف", "l'ambulance", "ambulance"),
    ("🚜", "جرّار", "le tracteur", "tractor"), ("🚀", "صاروخ", "la fusée", "rocket"),
    # الجسم
    ("✋", "يد", "la main", "hand"), ("🦶", "قدم", "le pied", "foot"), ("👁️", "عين", "l'œil", "eye"),
    ("👂", "أذن", "l'oreille", "ear"), ("👃", "أنف", "le nez", "nose"), ("👄", "فم", "la bouche", "mouth"),
    ("🦷", "سن", "la dent", "tooth"), ("❤️", "قلب", "le cœur", "heart"), ("💪", "ذراع", "le bras", "arm"),
    # العائلة والناس
    ("👨", "أب", "le père", "father"), ("👩", "أم", "la mère", "mother"), ("👦", "ولد", "le garçon", "boy"),
    ("👧", "بنت", "la fille", "girl"), ("👴", "جد", "le grand-père", "grandfather"), ("👵", "جدة", "la grand-mère", "grandmother"),
    ("👶", "رضيع", "le bébé", "baby"), ("🧑‍🏫", "معلّم", "l'enseignant", "teacher"), ("🧑‍⚕️", "طبيب", "le médecin", "doctor"),
    ("🤝", "صديق", "l'ami", "friend"),
    # المدرسة والألوان والمشاعر
    ("🏫", "مدرسة", "l'école", "school"), ("🕌", "مسجد", "la mosquée", "mosque"), ("📿", "مسبحة", "le chapelet", "prayer beads"),
    ("🔴", "أحمر", "rouge", "red"), ("🔵", "أزرق", "bleu", "blue"), ("🟢", "أخضر", "vert", "green"),
    ("🟡", "أصفر", "jaune", "yellow"), ("⚫", "أسود", "noir", "black"), ("⚪", "أبيض", "blanc", "white"),
    ("😊", "سعيد", "content", "happy"), ("😢", "حزين", "triste", "sad"), ("😴", "نعسان", "fatigué", "sleepy"),
]

# أمثال شعبية عربية مشهورة مع معناها
PROVERBS = [
    ("الصبر مفتاح الفرج", "بالصبر تنفرج الأمور الصعبة."),
    ("من جدّ وجد، ومن زرع حصد", "من يعمل بجد ينال ثمرة عمله."),
    ("العلم في الصغر كالنقش على الحجر", "ما نتعلمه ونحن صغار يبقى معنا طويلاً."),
    ("الجار قبل الدار", "اختر الجار الطيب قبل أن تختار البيت."),
    ("في التأني السلامة وفي العجلة الندامة", "التمهّل يحمينا من الخطأ."),
    ("القناعة كنز لا يفنى", "الرضا بما عندك غنى دائم."),
    ("الوقت كالسيف إن لم تقطعه قطعك", "استغل وقتك قبل أن يضيع."),
    ("درهم وقاية خير من قنطار علاج", "الوقاية أسهل من العلاج."),
    ("يد واحدة لا تصفّق", "العمل معاً يحقق ما لا يحققه شخص وحده."),
    ("الصديق وقت الضيق", "الصديق الحقيقي يظهر عند الحاجة."),
    ("لكل مجتهد نصيب", "كل من يجتهد ينال نصيباً من النجاح."),
    ("رُبّ أخٍ لك لم تلده أمك", "قد يكون الصديق قريباً منك مثل الأخ."),
    ("من حفر حفرة لأخيه وقع فيها", "من يؤذِ غيره يرجع الأذى عليه."),
    ("كل إناء بما فيه ينضح", "كلام الإنسان وأفعاله تدل على ما في داخله."),
    ("خير الكلام ما قلّ ودلّ", "الكلام القصير المفيد أفضل من الطويل."),
    ("لا تؤجّل عمل اليوم إلى الغد", "أنجز عملك في وقته."),
    ("إذا كان الكلام من فضة فالسكوت من ذهب", "السكوت أحياناً أفضل من الكلام."),
    ("الطيور على أشكالها تقع", "الناس يصاحبون من يشبههم."),
    ("من سار على الدرب وصل", "من يستمر في طريقه يصل إلى هدفه."),
    ("العقل السليم في الجسم السليم", "اهتم بصحتك لينشط عقلك."),
    ("لسانك حصانك، إن صنته صانك", "احفظ لسانك يحفظك."),
    ("أول الغيث قطرة", "الأشياء الكبيرة تبدأ صغيرة."),
    ("عصفور في اليد خير من عشرة على الشجرة", "ما تملكه الآن خير مما تتمناه."),
    ("الحاجة أم الاختراع", "الحاجة تدفعنا إلى الإبداع."),
    ("ليس كل ما يلمع ذهباً", "المظاهر قد تخدع."),
]
# جمل جميلة (حِكَم) بلا نسبة لأحد
WISDOM = [
    "ابتسم، فالابتسامة تجعل يومك ويوم غيرك أجمل.", "كل يوم فرصة جديدة لتتعلم شيئاً جميلاً.", "القراءة نافذة ترى منها العالم.",
    "احترم الكبير، وارحم الصغير.", "«شكراً» و«من فضلك» كلمتان سحريتان.", "النجاح خطوات صغيرة نكررها كل يوم.",
    "لا بأس أن تخطئ، المهم أن تتعلم من خطئك.", "ساعد غيرك، فالسعادة تكبر حين نتقاسمها.", "النظافة تجعل الجسم صحيحاً والمكان جميلاً.",
    "الصدق يجعل الناس يثقون بك.", "من يقرأ كثيراً يعرف كثيراً.", "الصديق الحقيقي يفرح لفرحك ويساعدك وقت حاجتك.",
    "اشرب الماء وكُل الفاكهة، فجسمك أمانة.", "النوم المبكر يمنحك نشاطاً في الصباح.", "اعمل بإتقان، حتى لو لم يرك أحد.",
    "الكلمة الجميلة تبني، والكلمة القاسية تجرح.", "كل لغة جديدة تتعلمها تفتح لك باباً جديداً.", "الأسرة كنز، فحافظ عليها.",
    "رتّب أغراضك، فالترتيب يوفّر الوقت.", "الشجاعة أن تقول الحق بأدب.", "فكّر قبل أن تتكلم، وتمهّل قبل أن تغضب.",
    "اجعل اليوم أفضل من الأمس.", "الأخلاق الجميلة أجمل من الثياب الجميلة.", "لا تقارن نفسك بغيرك، قارن نفسك بنفسك أمس.",
]
KIND_LABEL = {"hadith": "حديث نبوي ﷺ", "proverb": "مثل شعبي", "wisdom": "حكمة اليوم"}

HADITH_FILE = Path(__file__).parent / "data" / "hadith.json"
_hadith: list | None = None


def hadiths() -> list:
    global _hadith
    if _hadith is None:
        try:
            _hadith = json.loads(HADITH_FILE.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            _hadith = []
    return _hadith


def _pick(uid: int, kind: str, pool: list, state: dict):
    if not pool:
        return None
    order = list(range(len(pool)))
    random.Random(f"{uid}-{kind}-{len(pool)}").shuffle(order)
    n = int(state.get(kind, 0))
    state[kind] = n + 1
    return pool[order[n % len(order)]]


def daily_kinds() -> list:
    try:
        k = json.loads(get_setting("tv_daily_kinds") or '["hadith","proverb","wisdom"]')
    except ValueError:
        k = ["hadith", "proverb", "wisdom"]
    return [x for x in k if x in KIND_LABEL]



def daily(u) -> dict:
    """كلمة اليوم ونص اليوم لهذا الشخص: يتغيّران مع كل دخول، ولكل شخص ترتيب مختلف ولا يتكرر شيء."""
    key = f"welcome:{u['id']}"
    try:
        state = json.loads(get_setting(key) or "{}")
    except ValueError:
        state = {}
    kid = (u["tv_role"] or "") in ("kid", "little")
    w = _pick(u["id"], "w", WORDS, state)
    out = {"word": {"emoji": w[0], "ar": w[1], "fr": w[2], "en": w[3]}, "text": None}
    kinds = daily_kinds()
    if kinds:
        kind = kinds[int(state.get("k", 0)) % len(kinds)]
        state["k"] = int(state.get("k", 0)) + 1
        if kind == "hadith":
            pool = [h for h in hadiths() if h.get("kids") or not kid]
            h = _pick(u["id"], "h" + ("k" if kid else "a"), pool, state)
            if h:
                out["text"] = {"kind": kind, "label": KIND_LABEL[kind], "text": h["text"], "source": h["source"], "explain": h.get("explain", "")}
        elif kind == "proverb":
            t, ex = _pick(u["id"], "p", PROVERBS, state)
            out["text"] = {"kind": kind, "label": KIND_LABEL[kind], "text": t, "source": "", "explain": ex}
        else:
            out["text"] = {"kind": kind, "label": KIND_LABEL[kind], "text": _pick(u["id"], "q", WISDOM, state), "source": "", "explain": ""}
    set_setting(key, json.dumps(state))
    return out


@bp.get("/api/admin/welcome/hadith")
@admin_required
def api_admin_hadith_list():
    """قائمة الأحاديث لمراجعتها من لوحة التحكم."""
    return jsonify(hadith=[{k: h[k] for k in ("text", "source", "explain", "kids")} for h in hadiths()], words=len(WORDS),
                   proverbs=[{"text": t, "explain": e} for t, e in PROVERBS], wisdom=WISDOM, kinds=daily_kinds())
