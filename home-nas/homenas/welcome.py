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


def enabled() -> dict:
    return {"on": (get_setting("tv_welcome") or "1") == "1", "hadith": (get_setting("tv_welcome_hadith") or "1") == "1"}


@bp.get("/api/tv/welcome")
def api_tv_welcome():
    from .tv import display_name, tv_settings, tv_user
    u = tv_user()
    if not enabled()["on"]:
        return jsonify(show=False)
    key = f"welcome:{u['id']}"
    try:
        state = json.loads(get_setting(key) or "{}")
    except ValueError:
        state = {}
    kid = (u["tv_role"] or "") in ("kid", "little")
    w = _pick(u["id"], "w", WORDS, state)
    pool = [h for h in hadiths() if h.get("kids") or not kid]
    h = _pick(u["id"], "h" + ("k" if kid else "a"), pool, state) if enabled()["hadith"] else None
    set_setting(key, json.dumps(state))
    langs = tv_settings()["words"]
    word = {"emoji": w[0], "ar": w[1]}
    if "fr" in langs:
        word["fr"] = w[2]
    if "en" in langs:
        word["en"] = w[3]
    return jsonify(show=True, name=display_name(u), kid=kid, word=word,
                   hadith={"text": h["text"], "source": h["source"], "explain": h.get("explain") if kid else ""} if h else None)


@bp.get("/api/admin/welcome/hadith")
@admin_required
def api_admin_hadith_list():
    """قائمة الأحاديث لمراجعتها من لوحة التحكم."""
    return jsonify(hadith=[{k: h[k] for k in ("text", "source", "explain", "kids")} for h in hadiths()], words=len(WORDS), **enabled())
