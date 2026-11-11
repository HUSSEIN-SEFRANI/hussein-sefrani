"""وضع التلفاز: واجهة تظهر على الشاشة الموصولة بالسيرفر، تُدار بالكامل من لوحة التحكم.

- كل مستخدم له «ملف» على التلفاز: بالغ (برمز PIN)، طفل (يظهر تاريخ ميلاده)، أو طفل صغير.
- لكل ملف «مربعات» يضيفها المدير ويحذفها ويرتبها؛ كل مربع مرتبط بمجلد في ملفات المستخدم
  (مثل سارة/التلفاز/رسوم متحركة): ما يوضع في المجلد يظهر على التلفاز.
- أنواع المربعات: وسائط (فيديو، صوت، صور، كتب/صفحات)، ألعاب (كل لعبة مجلد فيه index.html)،
  ومكتبة صوري (صور المستخدم في تطبيق الصور).
- واجهة التلفاز تعمل من نفس الجهاز (127.0.0.1)؛ ويستطيع المدير معاينتها من متصفحه.
"""
from __future__ import annotations

import json
import mimetypes
import os
import re
import subprocess
from urllib.parse import quote
from datetime import date, datetime
from pathlib import Path

from flask import Blueprint, abort, jsonify, render_template, request, send_file, session
from werkzeug.security import check_password_hash, generate_password_hash

from .core import (BROWSER_IMAGE_EXT, IMAGE_EXT, RECYCLE, VIDEO_EXT, admin_required, body, current_user, get_db, get_setting,
                   log_action, now_iso, paths, set_setting)
from . import mawaqit, prayer

bp = Blueprint("tv", __name__)

AUDIO_EXT = {".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".opus"}
BOOK_EXT = {".pdf"}
ROLES = ("none", "adult", "kid", "little")
KINDS = ("media", "games", "photos")
TV_DIR = "التلفاز"
HELPER = "/usr/local/sbin/hsef-extras"
APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"

ICONS = ["cartoon", "music", "animals", "math", "games", "photos", "video", "quran", "book", "film", "star", "heart",
         "science", "letters", "nature", "sport"]
COLORS = ["#a855f7,#ec4899", "#f97316,#ef4444", "#22c55e,#15803d", "#06b6d4,#2563eb", "#8b5cf6,#06b6d4",
          "#f59e0b,#f97316", "#10b981,#0ea5e9", "#0f766e,#14532d", "#64748b,#1e293b", "#e11d48,#7f1d1d"]

DEFAULT_TILES = {
    "kid": [("رسوم متحركة", "media", "cartoon", 0), ("أناشيد", "media", "music", 1), ("عالم الحيوان", "media", "animals", 2),
            ("عالم الرياضيات", "media", "math", 3), ("ألعاب", "games", "games", 4), ("صوري", "photos", "photos", 5),
            ("فيديوهاتي", "media", "video", 6), ("القرآن الكريم", "media", "quran", 7)],
    "little": [("ألعاب", "games", "games", 4), ("رسوم متحركة", "media", "cartoon", 0), ("أناشيد", "media", "music", 1),
               ("عالم الحيوان", "media", "animals", 2)],
    "adult": [("صوري", "photos", "photos", 5), ("الفيديو", "media", "video", 3), ("الأفلام", "media", "film", 9),
              ("الموسيقى", "media", "music", 2), ("القرآن الكريم", "media", "quran", 7)],
}

WORDS = [  # كلمة اليوم: عربي، فرنسي، إنجليزي، رسم
    ("شمس", "Soleil", "Sun", "sun"), ("قمر", "Lune", "Moon", "moon"), ("قطة", "Chat", "Cat", "cat"),
    ("نجمة", "Étoile", "Star", "star"), ("شجرة", "Arbre", "Tree", "tree"), ("تفاحة", "Pomme", "Apple", "apple"),
    ("بيت", "Maison", "House", "house"), ("كتاب", "Livre", "Book", "book"), ("سمكة", "Poisson", "Fish", "fish"),
    ("عصفور", "Oiseau", "Bird", "bird"), ("كرة", "Ballon", "Ball", "ball"), ("قلب", "Cœur", "Heart", "heart"),
    ("وردة", "Fleur", "Flower", "flower"), ("سيارة", "Voiture", "Car", "car"), ("ماء", "Eau", "Water", "water"),
    ("غيمة", "Nuage", "Cloud", "cloud"), ("مدرسة", "École", "School", None), ("صديق", "Ami", "Friend", None),
    ("عائلة", "Famille", "Family", None), ("أم", "Mère", "Mother", None), ("أب", "Père", "Father", None),
    ("أخت", "Sœur", "Sister", None), ("أخ", "Frère", "Brother", None), ("قلم", "Crayon", "Pencil", None),
    ("باب", "Porte", "Door", None), ("نافذة", "Fenêtre", "Window", None), ("حليب", "Lait", "Milk", None),
    ("خبز", "Pain", "Bread", None), ("بحر", "Mer", "Sea", None), ("جبل", "Montagne", "Mountain", None),
    ("مطر", "Pluie", "Rain", None), ("ثلج", "Neige", "Snow", None), ("أحمر", "Rouge", "Red", None),
    ("أزرق", "Bleu", "Blue", None), ("أخضر", "Vert", "Green", None), ("أصفر", "Jaune", "Yellow", None),
    ("واحد", "Un", "One", None), ("اثنان", "Deux", "Two", None), ("ثلاثة", "Trois", "Three", None),
    ("شكراً", "Merci", "Thank you", None), ("صباح الخير", "Bonjour", "Good morning", None), ("سلام", "Paix", "Peace", None),
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS tv_tiles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'media',
    path TEXT,
    icon TEXT,
    color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tv_tiles_user ON tv_tiles(user_id, position);
"""


def migrate(db):
    db.executescript(SCHEMA)
    cols = {r[1] for r in db.execute("PRAGMA table_info(users)")}
    for col, decl in (("display_name", "TEXT"), ("tv_role", "TEXT NOT NULL DEFAULT 'none'"), ("birthdate", "TEXT"),
                      ("avatar", "INTEGER NOT NULL DEFAULT 0"), ("tv_pin", "TEXT"),
                      ("photo_v", "INTEGER NOT NULL DEFAULT 0"), ("wallpaper", "TEXT"), ("theme", "TEXT")):
        if col not in cols:
            db.execute(f"ALTER TABLE users ADD COLUMN {col} {decl}")
    # v1.5: الاسم الجديد للسيرفر
    db.execute("UPDATE settings SET value='HOME ANAB' WHERE key='server_name' AND value='H.SEF'")
    db.commit()


# ----------------------------------------------------------------------------- مساعدات

def display_name(u) -> str:
    return (u["display_name"] or "").strip() or u["username"]


def age_info(birthdate: str | None) -> dict:
    if not birthdate:
        return {}
    try:
        b = date.fromisoformat(birthdate)
    except ValueError:
        return {}
    t = date.today()
    age = t.year - b.year - ((t.month, t.day) < (b.month, b.day))
    nxt = b.replace(year=t.year)
    if nxt < t:
        nxt = b.replace(year=t.year + 1)
    return {"age": age, "birthday_in": (nxt - t).days, "birthday_today": (nxt - t).days == 0,
            "birth_day": b.day, "birth_month": b.month, "birth_year": b.year}


def tv_settings() -> dict:
    def g(k, d):
        v = get_setting(k)
        return d if v is None else v
    return {
        "theme": g("tv_theme", "playful"), "wallpaper": g("tv_wallpaper", "animated"),
        "city": g("tv_city", ""), "lat": g("tv_lat", ""), "lon": g("tv_lon", ""), "method": g("tv_method", "mwl"),
        "hanafi": g("tv_hanafi", "0") == "1", "prayer": g("tv_prayer", "1") == "1",
        "words": json.loads(g("tv_words", '["ar","fr","en"]')), "nosleep": g("tv_nosleep", "1") == "1",
        "saver_min": int(g("tv_saver_min", "10")), "night_off": g("tv_night_off", ""),
        "zoom": int(g("tv_zoom", "100")), "margin": int(g("tv_margin", "0")), "text": int(g("tv_text", "100")),
        "source": g("tv_prayer_source", "calc"), "offsets": json.loads(g("tv_prayer_off", "{}")),
        "adhan": {**ADHAN_DEFAULT, **json.loads(g("tv_adhan", "{}"))},
        "weather": g("tv_weather", "1") == "1",
        "daily_kinds": [k for k in json.loads(g("tv_daily_kinds", '["hadith","proverb","wisdom"]')) if k in ("hadith", "proverb", "wisdom")],
    }


def city_coords(s: dict):
    if s["city"] in prayer.CITIES:
        name, lat, lon = prayer.CITIES[s["city"]]
        return name, lat, lon
    try:
        return None, float(s["lat"]), float(s["lon"])
    except (TypeError, ValueError):
        return None, None, None


def weather_now(s: dict) -> dict | None:
    """درجة الحرارة لمدينة المواقيت (تُجلب في الخلفية وتُحفظ نصف ساعة)."""
    if not s.get("weather"):
        return None
    name, lat, lon = city_coords(s)
    if lat is None:
        return None
    from . import weather
    from .sysadmin import is_offline
    w = weather.current(lat, lon, is_offline())
    return (w | {"city": name}) if w else None


ADHAN_DEFAULT = {"on": False, "prayers": ["fajr", "dhuhr", "asr", "maghrib", "isha"], "volume": 80, "remind": 0, "pause": True}
PRAYER_KEYS = ("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")


def adhan_dir() -> Path:
    d = paths().system / "adhan"
    d.mkdir(parents=True, exist_ok=True)
    return d


def adhan_files() -> dict:
    return {w: (adhan_dir() / f"{w}.mp3").exists() for w in ("main", "fajr")}


def prayer_now(s: dict) -> dict | None:
    if not s["prayer"] and not s["adhan"].get("on"):
        return None
    if s.get("source") == "mawaqit":
        from . import mawaqit
        data = mawaqit.load(paths().system)
        now = datetime.now().astimezone()
        t = mawaqit.times_for(data, now.date())
        if t:
            out = prayer.finish(t, now, s.get("offsets"))
            out["city"] = data.get("name")
            out["source"] = "mawaqit"
            out["jumua"] = data.get("jumua")
            return out
    lat, lon = s["lat"], s["lon"]
    if s["city"] in prayer.CITIES:
        _, lat, lon = prayer.CITIES[s["city"]]
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return {"city": None, "times": None}
    out = prayer.today(lat, lon, s["method"], s["hanafi"], offsets=s.get("offsets"))
    out["city"] = prayer.CITIES[s["city"]][0] if s["city"] in prayer.CITIES else None
    out["source"] = "calc"
    return out


def word_of_day() -> dict:
    w = WORDS[date.today().toordinal() % len(WORDS)]
    return {"ar": w[0], "fr": w[1], "en": w[2], "icon": w[3]}


def file_kind(name: str) -> str | None:
    ext = os.path.splitext(name)[1].lower()
    if ext in VIDEO_EXT:
        return "video"
    if ext in AUDIO_EXT:
        return "audio"
    if ext in IMAGE_EXT:
        return "image"
    if ext in BOOK_EXT:
        return "pdf"
    return None


def user_row(uid: int):
    return get_db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()


def tile_folder(owner, tile) -> Path | None:
    """المجلد الحقيقي للمربع، بصلاحيات صاحبه (لا يصل لأي مكان لا يصل إليه المستخدم نفسه)."""
    from .vfs import resolve
    if not tile["path"]:
        return None
    try:
        _root, p = resolve(owner, tile["path"])
    except Exception:
        return None
    return p


def safe_sub(base: Path, sub: str) -> Path:
    parts = [p for p in (sub or "").replace("\\", "/").split("/") if p not in ("", ".")]
    if any(p == ".." or p == RECYCLE for p in parts):
        abort(400)
    p = base.joinpath(*parts).resolve() if parts else base.resolve()
    try:
        p.relative_to(base.resolve())
    except ValueError:
        abort(403)
    return p


def make_tile_folder(owner, title: str) -> str:
    from .core import home_dir
    name = re.sub(r'[\\/:*?"<>|#\x00]', "", title).strip() or "مربع"
    folder = home_dir(owner["username"]) / TV_DIR / name
    folder.mkdir(parents=True, exist_ok=True)
    return f"/home/{TV_DIR}/{name}"


def norm_tile_path(owner, path: str | None) -> str | None:
    """يقبل مسار المدير (/homes/سارة/...) ويحوّله لمسار صاحب المربع (/home/...)، ويتأكد أن صاحبه يصل إليه."""
    path = (path or "").strip()
    if not path:
        return None
    parts = [p for p in path.replace("\\", "/").split("/") if p]
    if len(parts) >= 2 and parts[0] == "homes" and parts[1].lower() == owner["username"].lower():
        parts = ["home"] + parts[2:]
    path = "/" + "/".join(parts)
    from .vfs import resolve
    try:
        _root, p = resolve(owner, path)
    except Exception:
        abort(400, "هذا المستخدم لا يملك صلاحية على هذا المجلد. اختر مجلداً داخل ملفاته أو مجلداً مشتركاً مسموحاً له.")
    if not p.is_dir():
        abort(400, "المجلد غير موجود")
    return path


def tile_dict(t) -> dict:
    return {k: t[k] for k in ("id", "user_id", "title", "kind", "path", "icon", "color", "position", "enabled")}


# ----------------------------------------------------------------------------- الإدارة (من لوحة التحكم)

def kiosk_helper(*args, timeout=1800) -> tuple[bool, str]:
    if not (APPLIANCE and os.path.exists(HELPER)):
        return False, "not available"
    r = subprocess.run(["sudo", "-n", HELPER, *args], capture_output=True, text=True, timeout=timeout)
    return r.returncode == 0, (r.stdout if r.returncode == 0 else (r.stderr or r.stdout)).strip()


@bp.get("/api/admin/tv")
@admin_required
def api_admin_tv():
    db = get_db()
    users = []
    for u in db.execute("SELECT * FROM users ORDER BY id"):
        tiles = [tile_dict(t) for t in db.execute("SELECT * FROM tv_tiles WHERE user_id=? ORDER BY position, id", (u["id"],))]
        users.append({"id": u["id"], "username": u["username"], "display_name": u["display_name"] or "",
                      "tv_role": u["tv_role"] or "none", "birthdate": u["birthdate"] or "", "avatar": u["avatar"] or 0,
                      "photo_v": u["photo_v"] or 0,
                      "has_pin": bool(u["tv_pin"]), "disabled": bool(u["disabled"]), "tiles": tiles, **age_info(u["birthdate"])})
    kiosk = None
    if APPLIANCE and os.path.exists(HELPER):
        ok, out = kiosk_helper("tv-status", timeout=30)
        try:
            kiosk = json.loads(out) if ok else None
        except ValueError:
            kiosk = None
    return jsonify(settings=tv_settings(), users=users, kiosk=kiosk, available=APPLIANCE and os.path.exists(HELPER),
                   cities=[{"id": k, "name": v[0]} for k, v in prayer.CITIES.items()],
                   methods=[{"id": k, "name": v[0]} for k, v in prayer.METHODS.items()],
                   icons=ICONS, colors=COLORS, prayer=prayer_now(tv_settings()),
                   mawaqit=mawaqit.summary(mawaqit.load(paths().system)),
                   adhan_files=adhan_files())


@bp.post("/api/admin/tv/settings")
@admin_required
def api_admin_tv_settings():
    d = body()
    for key, sk in (("theme", "tv_theme"), ("wallpaper", "tv_wallpaper"), ("city", "tv_city"), ("method", "tv_method"),
                    ("night_off", "tv_night_off")):
        if key in d:
            set_setting(sk, str(d[key] or "")[:40])
    for key, sk in (("lat", "tv_lat"), ("lon", "tv_lon")):
        if key in d:
            try:
                set_setting(sk, str(float(d[key])) if str(d[key]).strip() else "")
            except ValueError:
                abort(400, "إحداثيات غير صالحة")
    for key, sk in (("hanafi", "tv_hanafi"), ("prayer", "tv_prayer"), ("nosleep", "tv_nosleep")):
        if key in d:
            set_setting(sk, "1" if d[key] else "0")
    for key, sk, lo, hi in (("zoom", "tv_zoom", 70, 130), ("margin", "tv_margin", 0, 8), ("text", "tv_text", 80, 150)):
        if key in d:
            set_setting(sk, str(max(lo, min(hi, int(d[key] or 0)))))
    if "saver_min" in d:
        set_setting("tv_saver_min", str(max(0, min(240, int(d["saver_min"] or 0)))))
    if "words" in d:
        set_setting("tv_words", json.dumps([x for x in d["words"] if x in ("ar", "fr", "en")]))
    if "weather" in d:
        set_setting("tv_weather", "1" if d["weather"] else "0")
    if isinstance(d.get("daily_kinds"), list):
        set_setting("tv_daily_kinds", json.dumps([k for k in d["daily_kinds"] if k in ("hadith", "proverb", "wisdom")]))
    if d.get("source") in ("calc", "mawaqit"):
        set_setting("tv_prayer_source", d["source"])
    if isinstance(d.get("offsets"), dict):
        set_setting("tv_prayer_off", json.dumps({k: max(-60, min(60, int(d["offsets"].get(k) or 0))) for k in PRAYER_KEYS}))
    if isinstance(d.get("adhan"), dict):
        a = d["adhan"]
        set_setting("tv_adhan", json.dumps({
            "on": bool(a.get("on")), "pause": bool(a.get("pause", True)),
            "prayers": [k for k in a.get("prayers") or [] if k in PRAYER_KEYS and k != "sunrise"],
            "volume": max(10, min(100, int(a.get("volume") or 80))), "remind": max(0, min(60, int(a.get("remind") or 0)))}))
    log_action("تعديل إعدادات وضع التلفاز")
    return jsonify(ok=True)


@bp.post("/api/admin/tv/mawaqit")
@admin_required
def api_admin_mawaqit():
    """جدول السنة من صفحة المسجد على Mawaqit: من الرابط (إنترنت) أو من ملف الصفحة المحفوظ (بدون إنترنت)."""
    from . import mawaqit
    from .sysadmin import is_offline
    try:
        if request.files.get("page"):
            data = mawaqit.parse(request.files["page"].read(8 * 1024 * 1024).decode("utf-8", "replace"))
            data["url"] = (request.form.get("url") or "").strip()[:300] or None
        else:
            if is_offline():
                abort(400, "وضع «بدون إنترنت» مفعّل. احفظ صفحة المسجد من الكمبيوتر وارفع الملف بدل الرابط.")
            data = mawaqit.fetch(str(body().get("url") or ""))
    except ValueError as e:
        abort(400, str(e))
    except OSError as e:
        abort(400, f"تعذر الوصول إلى Mawaqit (لا إنترنت؟). يمكنك حفظ صفحة المسجد من الكمبيوتر ورفع الملف. ({e})")
    mawaqit.save(paths().system, data)
    set_setting("tv_prayer_source", "mawaqit")
    log_action("مواقيت المسجد من Mawaqit", data.get("name") or "")
    return jsonify(ok=True, mawaqit=mawaqit.summary(data), prayer=prayer_now(tv_settings()))


@bp.delete("/api/admin/tv/mawaqit")
@admin_required
def api_admin_mawaqit_delete():
    from . import mawaqit
    mawaqit.file(paths().system).unlink(missing_ok=True)
    set_setting("tv_prayer_source", "calc")
    return jsonify(ok=True)


@bp.post("/api/admin/tv/adhan/<which>")
@admin_required
def api_admin_adhan_upload(which):
    if which not in ("main", "fajr"):
        abort(404)
    f = request.files.get("file")
    if not f or not (f.filename or "").lower().endswith((".mp3", ".m4a", ".ogg", ".wav")):
        abort(400, "اختر ملف صوت (MP3)")
    data = f.read(30 * 1024 * 1024 + 1)
    if len(data) > 30 * 1024 * 1024:
        abort(400, "الملف كبير جداً (الحد 30 ميغابايت)")
    (adhan_dir() / f"{which}.mp3").write_bytes(data)
    log_action("ملف الأذان", which)
    return jsonify(ok=True, files=adhan_files())


@bp.delete("/api/admin/tv/adhan/<which>")
@admin_required
def api_admin_adhan_delete(which):
    if which not in ("main", "fajr"):
        abort(404)
    (adhan_dir() / f"{which}.mp3").unlink(missing_ok=True)
    return jsonify(ok=True, files=adhan_files())


@bp.get("/api/tv/adhan/<which>")
def api_tv_adhan(which):
    if not (tv_allowed() or current_user()):
        abort(403)
    f = adhan_dir() / f"{which}.mp3"
    if which not in ("main", "fajr") or not f.exists():
        abort(404)
    return send_file(f, conditional=True, mimetype="audio/mpeg")


@bp.patch("/api/admin/tv/users/<int:uid>")
@admin_required
def api_admin_tv_user(uid):
    u = user_row(uid)
    if not u:
        abort(404)
    d = body()
    db = get_db()
    if "display_name" in d:
        db.execute("UPDATE users SET display_name=? WHERE id=?", ((d["display_name"] or "").strip()[:40] or None, uid))
    if "tv_role" in d:
        if d["tv_role"] not in ROLES:
            abort(400)
        db.execute("UPDATE users SET tv_role=? WHERE id=?", (d["tv_role"], uid))
    if "birthdate" in d:
        b = (d["birthdate"] or "").strip()
        if b:
            try:
                date.fromisoformat(b)
            except ValueError:
                abort(400, "تاريخ الميلاد غير صالح")
        db.execute("UPDATE users SET birthdate=? WHERE id=?", (b or None, uid))
    if "avatar" in d:
        db.execute("UPDATE users SET avatar=? WHERE id=?", (int(d["avatar"]) % 12, uid))
    if "pin" in d:
        pin = str(d["pin"] or "").strip()
        if pin and not re.fullmatch(r"\d{4,8}", pin):
            abort(400, "الرمز يجب أن يكون من 4 إلى 8 أرقام")
        db.execute("UPDATE users SET tv_pin=? WHERE id=?", (generate_password_hash(pin) if pin else None, uid))
    db.commit()
    return jsonify(ok=True)


@bp.post("/api/admin/tv/users/<int:uid>/tiles")
@admin_required
def api_admin_tile_create(uid):
    u = user_row(uid)
    if not u:
        abort(404)
    d = body()
    title = (d.get("title") or "").strip()[:40]
    kind = d.get("kind") or "media"
    if not title or kind not in KINDS:
        abort(400, "اكتب اسماً للمربع")
    path = norm_tile_path(u, d.get("path")) if kind != "photos" else None
    if kind != "photos" and not path:
        path = make_tile_folder(u, title)
    db = get_db()
    pos = db.execute("SELECT COALESCE(MAX(position),-1)+1 FROM tv_tiles WHERE user_id=?", (uid,)).fetchone()[0]
    cur = db.execute("INSERT INTO tv_tiles(user_id, title, kind, path, icon, color, position, created_at) VALUES (?,?,?,?,?,?,?,?)",
                     (uid, title, kind, path, d.get("icon") or ("photos" if kind == "photos" else "star"),
                      d.get("color") or COLORS[pos % len(COLORS)], pos, now_iso()))
    db.commit()
    log_action("إضافة مربع للتلفاز", f"{display_name(u)}: {title}")
    return jsonify(ok=True, id=cur.lastrowid, path=path)


@bp.post("/api/admin/tv/users/<int:uid>/defaults")
@admin_required
def api_admin_tile_defaults(uid):
    u = user_row(uid)
    if not u:
        abort(404)
    role = body().get("role") or u["tv_role"]
    if role not in DEFAULT_TILES:
        abort(400, "اختر نوع الملف أولاً")
    db = get_db()
    have = {r["title"] for r in db.execute("SELECT title FROM tv_tiles WHERE user_id=?", (uid,))}
    pos = db.execute("SELECT COALESCE(MAX(position),-1)+1 FROM tv_tiles WHERE user_id=?", (uid,)).fetchone()[0]
    added = 0
    for title, kind, icon, color in DEFAULT_TILES[role]:
        if title in have:
            continue
        path = None if kind == "photos" else make_tile_folder(u, title)
        db.execute("INSERT INTO tv_tiles(user_id, title, kind, path, icon, color, position, created_at) VALUES (?,?,?,?,?,?,?,?)",
                   (uid, title, kind, path, icon, COLORS[color % len(COLORS)], pos, now_iso()))
        pos += 1
        added += 1
    db.commit()
    return jsonify(ok=True, added=added)


@bp.patch("/api/admin/tv/tiles/<int:tid>")
@admin_required
def api_admin_tile_update(tid):
    db = get_db()
    t = db.execute("SELECT * FROM tv_tiles WHERE id=?", (tid,)).fetchone()
    if not t:
        abort(404)
    d = body()
    if "title" in d and (d["title"] or "").strip():
        db.execute("UPDATE tv_tiles SET title=? WHERE id=?", (d["title"].strip()[:40], tid))
    for k in ("icon", "color"):
        if k in d:
            db.execute(f"UPDATE tv_tiles SET {k}=? WHERE id=?", ((d[k] or "").strip() or None, tid))
    if "path" in d and t["kind"] != "photos":
        owner = user_row(t["user_id"])
        path = norm_tile_path(owner, d["path"]) or make_tile_folder(owner, d.get("title") or t["title"])
        db.execute("UPDATE tv_tiles SET path=? WHERE id=?", (path, tid))
    if "enabled" in d:
        db.execute("UPDATE tv_tiles SET enabled=? WHERE id=?", (int(bool(d["enabled"])), tid))
    if "move" in d:
        sib = db.execute("SELECT id, position FROM tv_tiles WHERE user_id=? ORDER BY position, id", (t["user_id"],)).fetchall()
        ids = [r["id"] for r in sib]
        i = ids.index(tid)
        j = i + (1 if d["move"] > 0 else -1)
        if 0 <= j < len(ids):
            ids[i], ids[j] = ids[j], ids[i]
        for n, x in enumerate(ids):
            db.execute("UPDATE tv_tiles SET position=? WHERE id=?", (n, x))
    db.commit()
    return jsonify(ok=True)


@bp.delete("/api/admin/tv/tiles/<int:tid>")
@admin_required
def api_admin_tile_delete(tid):
    db = get_db()
    db.execute("DELETE FROM tv_tiles WHERE id=?", (tid,))
    db.commit()
    return jsonify(ok=True)


@bp.post("/api/admin/tv/kiosk")
@admin_required
def api_admin_kiosk():
    action = body().get("action")
    if action not in ("setup", "enable", "disable", "restart"):
        abort(400)
    ok, out = kiosk_helper("tv-" + action, timeout=3600)
    if not ok:
        abort(400, out or "error")
    log_action("وضع التلفاز على الشاشة", action)
    return jsonify(ok=True)


@bp.get("/api/admin/tv/display")
@admin_required
def api_admin_tv_display():
    ok, out = kiosk_helper("tv-modes", timeout=60)
    if not ok:
        return jsonify(error=out)
    return jsonify(json.loads(out))


@bp.post("/api/admin/tv/display")
@admin_required
def api_admin_tv_display_set():
    mode = str(body().get("mode") or "")
    if mode and not re.fullmatch(r"\d{3,4}x\d{3,4}", mode):
        abort(400)
    ok, out = kiosk_helper("tv-mode-set", *( [mode] if mode else [] ), timeout=900)
    if not ok:
        abort(400, out or "error")
    return jsonify(ok=True)


@bp.get("/api/admin/tv/audio")
@admin_required
def api_admin_tv_audio():
    ok, out = kiosk_helper("tv-audio-status", timeout=300)
    if not ok:
        return jsonify(error=out)
    return jsonify(json.loads(out))


@bp.post("/api/admin/tv/audio")
@admin_required
def api_admin_tv_audio_set():
    d = body()
    if d.get("action") == "test":
        ok, out = kiosk_helper("tv-audio-test", timeout=60)
    else:
        ok, out = audio_set(d)
    if not ok:
        abort(400, out or "error")
    return jsonify(ok=True)


def audio_set(d) -> tuple[bool, str]:
    if d.get("action") == "auto":
        return kiosk_helper("tv-audio-set", "auto", "auto", timeout=60)
    card, prof = str(d.get("card") or ""), str(d.get("profile") or "")
    if not re.fullmatch(r"[\w.:+-]{1,200}", card) or not re.fullmatch(r"[\w.:+-]{1,200}", prof):
        abort(400)
    return kiosk_helper("tv-audio-set", card, prof, timeout=60)


# ----------------------------------------------------------------------------- واجهة التلفاز

def tv_allowed() -> bool:
    """التلفاز نفسه (متصفح على نفس الجهاز)، أو مدير مسجّل يعاين من كمبيوتره."""
    if request.remote_addr in ("127.0.0.1", "::1"):
        return True
    u = current_user()
    return bool(u and u["is_admin"])


def tv_guard():
    if not tv_allowed():
        abort(403, "واجهة التلفاز تعمل على الشاشة الموصولة بالسيرفر")


def tv_user():
    tv_guard()
    uid = session.get("tv_uid")
    u = user_row(uid) if uid else None
    if not u or u["disabled"] or (u["tv_role"] or "none") == "none":
        abort(401, "اختر المستخدم")
    return u


def profile_dict(u) -> dict:
    return {"id": u["id"], "name": display_name(u), "role": u["tv_role"], "avatar": u["avatar"] or 0,
            "photo_v": u["photo_v"] or 0, "has_pin": bool(u["tv_pin"]), "admin": bool(u["is_admin"]),
            "theme": (u["theme"] if "theme" in u.keys() else None) or "grape",
            **age_info(u["birthdate"])}


@bp.get("/tv")
def tv_page():
    if not tv_allowed():
        return render_template("tv_denied.html"), 403
    from . import __version__
    from .system import server_name
    local = request.remote_addr in ("127.0.0.1", "::1")
    return render_template("tv.html", server_name=server_name(), version=__version__, preview=not local)


@bp.get("/api/tv/profiles")
def api_tv_profiles():
    tv_guard()
    db = get_db()
    order = {"adult": 0, "kid": 1, "little": 2}
    rows = [u for u in db.execute("SELECT * FROM users WHERE disabled=0") if (u["tv_role"] or "none") != "none"]
    rows.sort(key=lambda u: (order.get(u["tv_role"], 9), u["id"]))
    setup = None
    if not db.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        from flask import current_app
        from .system import server_urls
        setup = {"urls": server_urls(current_app.config["NAS_CFG"].get("port", 80))}
    from .stars import balance
    profiles = [profile_dict(u) | {"stars": balance(db, u["id"])} for u in rows]
    weather_now(tv_settings())  # يبدأ جلب الطقس في الخلفية
    db.commit()
    return jsonify(profiles=profiles, settings=tv_settings(), current=session.get("tv_uid"), setup=setup)


def any_adult_pin_ok(pin: str) -> bool:
    for u in get_db().execute("SELECT tv_pin FROM users WHERE tv_role='adult' AND disabled=0 AND tv_pin IS NOT NULL"):
        if check_password_hash(u["tv_pin"], pin):
            return True
    return False


def adults_have_pins() -> bool:
    return bool(get_db().execute("SELECT 1 FROM users WHERE tv_role='adult' AND disabled=0 AND tv_pin IS NOT NULL").fetchone())


@bp.post("/api/tv/login")
def api_tv_login():
    tv_guard()
    d = body()
    u = user_row(int(d.get("id") or 0))
    if not u or u["disabled"] or (u["tv_role"] or "none") == "none":
        abort(404)
    cur = session.get("tv_uid")
    cu = user_row(cur) if cur else None
    # الخروج من ملف طفل إلى ملف آخر يحتاج رمز أحد الوالدين
    if cu and cu["tv_role"] in ("kid", "little") and cu["id"] != u["id"] and adults_have_pins():
        if not any_adult_pin_ok(str(d.get("parent_pin") or "")):
            abort(403, "يحتاج رمز ماما أو بابا")
    if u["tv_pin"] and not check_password_hash(u["tv_pin"], str(d.get("pin") or "")):
        abort(403, "الرمز غير صحيح")
    session["tv_uid"] = u["id"]
    from . import welcome
    session["tv_daily"] = welcome.daily(u)  # كلمة ونص جديدان مع كل دخول
    return jsonify(ok=True)


@bp.post("/api/tv/leave")
def api_tv_leave():
    """العودة إلى شاشة اختيار المستخدم."""
    tv_guard()
    cur = session.get("tv_uid")
    cu = user_row(cur) if cur else None
    if cu and cu["tv_role"] in ("kid", "little") and adults_have_pins():
        if not any_adult_pin_ok(str(body().get("parent_pin") or "")):
            abort(403, "يحتاج رمز ماما أو بابا")
    session.pop("tv_uid", None)
    return jsonify(ok=True)


@bp.get("/api/tv/home")
def api_tv_home():
    u = tv_user()
    db = get_db()
    tiles = [tile_dict(t) for t in db.execute("SELECT * FROM tv_tiles WHERE user_id=? AND enabled=1 ORDER BY position, id",
                                              (u["id"],))]
    s = tv_settings()
    from . import welcome
    daily = session.get("tv_daily")
    if not daily:
        daily = session["tv_daily"] = welcome.daily(u)
    return jsonify(user=profile_dict(u), tiles=tiles, settings=s, prayer=prayer_now(s), word=daily["word"],
                   text=daily.get("text") if s["daily_kinds"] else None, weather=weather_now(s),
                   parent_lock=u["tv_role"] in ("kid", "little") and adults_have_pins())


THEMES = ("grape", "apple", "orange", "strawberry", "lemon", "watermelon")


@bp.post("/api/tv/theme")
def api_tv_theme():
    """كل شخص يختار ثيم الفاكهة الذي يحبه."""
    u = tv_user()
    t = str(body().get("theme") or "")
    if t not in THEMES:
        abort(400)
    db = get_db()
    db.execute("UPDATE users SET theme=? WHERE id=?", (t, u["id"]))
    db.commit()
    return jsonify(ok=True, theme=t)


@bp.get("/api/tv/clock")
def api_tv_clock():
    tv_guard()
    s = tv_settings()
    return jsonify(prayer=prayer_now(s), word=word_of_day(), now=datetime.now().isoformat(timespec="seconds"),
                   adhan=s["adhan"] | {"files": adhan_files()}, weather=weather_now(s))


def my_tile(tid: int):
    u = tv_user()
    t = get_db().execute("SELECT * FROM tv_tiles WHERE id=? AND user_id=? AND enabled=1", (tid, u["id"])).fetchone()
    if not t:
        abort(404)
    return u, t


@bp.get("/api/tv/tile/<int:tid>/list")
def api_tv_tile_list(tid):
    u, t = my_tile(tid)
    if t["kind"] == "photos":
        abort(400)
    base = tile_folder(u, t)
    if base is None or not base.is_dir():
        return jsonify(tile=tile_dict(t), items=[], missing=True)
    folder = safe_sub(base, request.args.get("sub", ""))
    items = []
    covers = ("cover.jpg", "cover.png", "cover.jpeg", "icon.png", "folder.jpg")

    def game_entry(d: Path) -> str | None:
        """مسار اللعبة داخل المجلد: index.html فيه مباشرة، أو في مجلد وحيد بداخله (بعد فك الضغط)."""
        if (d / "index.html").is_file():
            return ""
        try:
            subs = [x for x in d.iterdir() if x.is_dir() and not x.name.startswith((".", "@")) and x.name != RECYCLE]
        except OSError:
            return None
        if len(subs) == 1 and (subs[0] / "index.html").is_file():
            return subs[0].name
        return None

    # ملفات لعبة موضوعة مباشرة في هذا المجلد
    if (folder / "index.html").is_file():
        items.append({"name": "", "type": "game", "self": True, "entry": "",
                      "cover": next((c for c in covers if (folder / c).is_file()), None)})
    with os.scandir(folder) as it:
        for e in it:
            if e.name.startswith((".", "@")) or e.name == RECYCLE:
                continue
            if e.is_dir():
                entry = game_entry(Path(e.path))
                gdir = Path(e.path) / entry if entry else Path(e.path)
                cover = next((c for c in covers if (gdir / c).is_file()), None)
                if entry is not None:
                    items.append({"name": e.name, "type": "game", "entry": entry,
                                  "cover": f"{entry}/{cover}" if (entry and cover) else cover})
                else:
                    items.append({"name": e.name, "type": "folder", "cover": cover})
            else:
                if items and items[0].get("self") and e.name in covers:
                    continue
                k = file_kind(e.name)
                if k:
                    items.append({"name": e.name, "type": k, "size": e.stat().st_size})
    items.sort(key=lambda x: (not x.get("self"), x["type"] not in ("folder", "game"), x["name"].casefold()))
    vids = [folder / x["name"] for x in items if x["type"] == "video"]
    if vids:
        import threading
        threading.Thread(target=_tvv().prefetch, args=(vids,), daemon=True).start()
    return jsonify(tile=tile_dict(t), items=items, sub=request.args.get("sub", ""))


def tile_file(tid) -> Path:
    u, t = my_tile(tid)
    base = tile_folder(u, t)
    if base is None:
        abort(404)
    p = safe_sub(base, request.args.get("p", ""))
    if not p.is_file() or not file_kind(p.name) and p.suffix.lower() not in (".jpg", ".png", ".jpeg"):
        abort(404)
    return p


@bp.get("/api/tv/tile/<int:tid>/file")
def api_tv_tile_file(tid):
    p = tile_file(tid)
    if file_kind(p.name) == "image" and p.suffix.lower() not in BROWSER_IMAGE_EXT:
        from .files import thumb_response  # صور الآيفون HEIC وغيرها: JPEG يعرضه التلفاز
        return thumb_response(p, True)
    return send_file(p, conditional=True, mimetype=mimetypes.guess_type(p.name)[0])


# ----------------------------------------------------------------------------- فيديو الآيفون وغيره: تحويل لصيغة يشغّلها التلفاز
def _tvv():
    from . import tvvideo
    return tvvideo.get(paths().cache)


def _vinfo(src: Path, ready_url: str):
    st = _tvv().status(src)
    if st["mode"] == "ready":
        st["url"] = ready_url
    return jsonify(st)


def _send_ready(src: Path):
    from . import tvvideo
    st = _tvv().status(src)
    f = _tvv().ready_file(st.get("key", "")) if st["mode"] == "ready" else None
    if not f:
        abort(404)
    tvvideo.touch(f)
    return send_file(f, conditional=True, mimetype="video/mp4")


@bp.get("/api/tv/tile/<int:tid>/vinfo")
def api_tv_tile_vinfo(tid):
    p = tile_file(tid)
    return _vinfo(p, f"/api/tv/tile/{tid}/tvvideo?p={quote(request.args.get('p', ''))}")


@bp.get("/api/tv/tile/<int:tid>/tvvideo")
def api_tv_tile_tvvideo(tid):
    return _send_ready(tile_file(tid))


def library_file(mid) -> Path:
    u = tv_user()
    row = get_db().execute("SELECT * FROM media WHERE id=? AND library=?", (mid, f"u:{u['id']}")).fetchone()
    if not row:
        abort(404)
    p = (paths().homes / u["username"] / "Photos" / row["rel_path"]).resolve()
    if not p.is_file():
        abort(404)
    return p


@bp.get("/api/tv/photo/<int:mid>/vinfo")
def api_tv_photo_vinfo(mid):
    return _vinfo(library_file(mid), f"/api/tv/photo/{mid}/tvvideo")


@bp.get("/api/tv/photo/<int:mid>/tvvideo")
def api_tv_photo_tvvideo(mid):
    return _send_ready(library_file(mid))


@bp.get("/api/tv/tile/<int:tid>/thumb")
def api_tv_tile_thumb(tid):
    u, t = my_tile(tid)
    base = tile_folder(u, t)
    if base is None:
        abort(404)
    p = safe_sub(base, request.args.get("p", ""))
    from .files import thumb_response
    return thumb_response(p, request.args.get("s") == "big")


@bp.get("/tv/game/<int:tid>/", defaults={"sub": ""})
@bp.get("/tv/game/<int:tid>/<path:sub>")
def tv_game_file(tid, sub):
    u, t = my_tile(tid)
    if t["kind"] == "photos":
        abort(404)
    base = tile_folder(u, t)
    if base is None:
        abort(404)
    p = safe_sub(base, sub)
    if p.is_dir():
        p = p / "index.html"
    if not p.is_file():
        abort(404)
    return send_file(p, conditional=True)


@bp.get("/api/tv/photos")
def api_tv_photos():
    u = tv_user()
    off = max(0, request.args.get("offset", 0, type=int))
    rows = get_db().execute("SELECT id, name, is_video, taken_at FROM media WHERE library=? "
                            "ORDER BY taken_at DESC, id DESC LIMIT 120 OFFSET ?", (f"u:{u['id']}", off)).fetchall()
    return jsonify(items=[dict(r) for r in rows], next=off + len(rows) if len(rows) == 120 else None)


@bp.get("/api/tv/wallpaper")
def api_tv_wallpaper():
    """صور عشوائية من مكتبة المستخدم (المفضلة أولاً) للخلفية وإطار الصور."""
    u = tv_user()
    db = get_db()
    rows = db.execute("SELECT m.id FROM media m JOIN favorites f ON f.media_id=m.id AND f.user_id=? "
                      "WHERE m.library=? AND m.is_video=0 ORDER BY RANDOM() LIMIT 30", (u["id"], f"u:{u['id']}")).fetchall()
    if len(rows) < 10:
        rows += db.execute("SELECT id FROM media WHERE library=? AND is_video=0 ORDER BY RANDOM() LIMIT 30",
                           (f"u:{u['id']}",)).fetchall()
    ids = list(dict.fromkeys(r["id"] for r in rows))[:30]
    return jsonify(ids=ids)


@bp.get("/api/tv/photo/<int:mid>/<what>")
def api_tv_photo(mid, what):
    u = tv_user()
    row = get_db().execute("SELECT * FROM media WHERE id=? AND library=?", (mid, f"u:{u['id']}")).fetchone()
    if not row:
        abort(404)
    from .photos import send_thumb, send_view
    base = paths().homes / u["username"] / "Photos"
    p = (base / row["rel_path"]).resolve()
    if not p.exists():
        abort(404)
    if what == "thumb":
        return send_thumb(row, p)
    if what == "view":
        return send_view(row, p)
    abort(404)


# ----------------------------------------------------------------------------- الكتب (PDF) كصفحات

def _pdf_target(tid: int) -> Path:
    u, t = my_tile(tid)
    base = tile_folder(u, t)
    if base is None:
        abort(404)
    p = safe_sub(base, request.args.get("p", ""))
    if not p.is_file() or p.suffix.lower() != ".pdf":
        abort(404)
    return p


@bp.get("/api/tv/tile/<int:tid>/pdfinfo")
def api_tv_pdfinfo(tid):
    """عدد صفحات الكتاب؛ إن لم تتوفر أدوات poppler يعرض التلفاز الملف مباشرة."""
    p = _pdf_target(tid)
    import shutil as _sh
    if not (_sh.which("pdfinfo") and _sh.which("pdftoppm")):
        return jsonify(pages=None)
    try:
        r = subprocess.run(["pdfinfo", str(p)], capture_output=True, text=True, timeout=30)
        m = re.search(r"^Pages:\s+(\d+)", r.stdout, re.M)
        return jsonify(pages=int(m.group(1)) if m else None)
    except (subprocess.TimeoutExpired, OSError):
        return jsonify(pages=None)


@bp.get("/api/tv/tile/<int:tid>/page")
def api_tv_pdf_page(tid):
    p = _pdf_target(tid)
    page = max(1, request.args.get("n", 1, type=int))
    import hashlib
    st = p.stat()
    key = hashlib.sha1(f"{p}|{st.st_size}|{st.st_mtime}".encode()).hexdigest()
    out = paths().cache / "tvpdf" / key[:2] / key / f"{page}.jpg"
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        stem = out.with_suffix("")
        try:
            subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=85", "-scale-to", "1600", "-f", str(page),
                            "-l", str(page), "-singlefile", str(p), str(stem)], capture_output=True, timeout=120)
        except (subprocess.TimeoutExpired, OSError):
            abort(500)
        if not out.exists():
            abort(404)
    return send_file(out, mimetype="image/jpeg", max_age=86400 * 30)


# ----------------------------------------------------------------------------- إعدادات من التلفاز (للمدير فقط)

def tv_admin():
    u = tv_user()
    if not u["is_admin"]:
        abort(403, "للمدير فقط")
    if not u["tv_pin"]:
        abort(403, "ضع رمز دخول (PIN) لحساب المدير على التلفاز أولاً")
    return u


@bp.get("/api/tv/admin/net")
def api_tv_admin_net():
    tv_admin()
    from .sysadmin import available, helper
    if not available():
        return jsonify(available=False)
    return jsonify(available=True, net=helper("net-status", as_json=True))


@bp.post("/api/tv/admin/wifi/<action>")
def api_tv_admin_wifi(action):
    u = tv_admin()
    from .sysadmin import helper
    d = body()
    if action == "scan":
        return jsonify(networks=helper("wifi-scan", timeout=60, as_json=True))
    if action == "connect":
        ssid = str(d.get("ssid") or "").strip()
        if not ssid:
            abort(400)
        helper("wifi-connect", ssid, stdin=str(d.get("password") or ""), timeout=120)
        log_action("الاتصال بالوايفاي من التلفاز", ssid, u["username"])
        return jsonify(ok=True, net=helper("net-status", as_json=True))
    if action == "forget":
        helper("wifi-forget", timeout=60)
        return jsonify(ok=True)
    if action == "install":
        helper("wifi-install", timeout=3600)
        return jsonify(ok=True)
    abort(404)


@bp.get("/api/tv/admin/audio")
def api_tv_admin_audio():
    tv_admin()
    ok, out = kiosk_helper("tv-audio-status", timeout=120)
    if not ok:
        return jsonify(error=out or "error")
    return jsonify(json.loads(out))


@bp.post("/api/tv/admin/audio")
def api_tv_admin_audio_set():
    u = tv_admin()
    d = body()
    ok, out = kiosk_helper("tv-audio-test", timeout=60) if d.get("action") == "test" else audio_set(d)
    if not ok:
        abort(400, out or "error")
    if d.get("action") != "test":
        log_action("مخرج صوت التلفاز", d.get("profile") or d.get("action") or "", u["username"])
    return jsonify(ok=True)


@bp.get("/api/tv/admin/bt")
def api_tv_admin_bt():
    tv_admin()
    from .sysadmin import available, helper
    if not available():
        return jsonify(available=False)
    return jsonify(available=True, **helper("bt-status", as_json=True))


@bp.post("/api/tv/admin/bt/<action>")
def api_tv_admin_bt_action(action):
    u = tv_admin()
    from .sysadmin import helper
    mac = str(body().get("mac") or "")
    if action == "install":
        helper("bt-install", timeout=1800)
    elif action == "scan":
        helper("bt-scan", timeout=60)
    elif action in ("pair", "remove"):
        if not re.fullmatch(r"[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}", mac):
            abort(400)
        helper(f"bt-{action}", mac, timeout=90)
        log_action("بلوتوث من التلفاز", f"{action} {mac}", u["username"])
    else:
        abort(404)
    return jsonify(available=True, **helper("bt-status", as_json=True))
