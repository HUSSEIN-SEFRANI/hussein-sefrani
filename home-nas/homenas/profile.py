"""صورة كل مستخدم وخلفية سطح المكتب الخاصة به.

- الصورة تظهر على التلفاز (بدل الرسم) وفي قائمة البداية ولوحة التحكم.
- الخلفية: ألوان جاهزة أو صورة يرفعها المستخدم؛ لكل مستخدم خلفيته.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from flask import Blueprint, abort, jsonify, request, send_file
from PIL import Image, ImageOps

from .core import admin_required, body, current_user, get_db, login_required, open_image, paths

bp = Blueprint("profile", __name__)

PRESETS = {
    "default": None,
    "sunset": "linear-gradient(160deg,#ff9a76 0%,#f6c177 45%,#7cc6f2 100%)",
    "forest": "linear-gradient(160deg,#134e4a 0%,#15803d 55%,#a3e635 100%)",
    "ocean": "linear-gradient(160deg,#0c4a6e 0%,#0284c7 55%,#67e8f9 100%)",
    "night": "radial-gradient(900px 600px at 80% 10%,#6d28d9 0%,transparent 60%),linear-gradient(160deg,#0b1630 0%,#1e1b4b 60%,#312e81 100%)",
    "rose": "linear-gradient(160deg,#831843 0%,#db2777 55%,#fbcfe8 100%)",
    "sand": "linear-gradient(160deg,#78350f 0%,#d97706 50%,#fde68a 100%)",
}
MAX_UPLOAD = 40 * 1024 * 1024


def folder() -> Path:
    d = paths().system / "profile"
    d.mkdir(parents=True, exist_ok=True)
    return d


def photo_file(uid: int) -> Path:
    return folder() / f"photo-{uid}.jpg"


def wall_file(uid: int) -> Path:
    return folder() / f"wall-{uid}.jpg"


def look(u) -> dict:
    """ما تحتاجه الواجهة: رقم نسخة الصورة (0 = لا صورة) والخلفية، وأيقونات البرامج التي غيّرها (البند 44)."""
    w = u["wallpaper"] if "wallpaper" in u.keys() else None
    return {"photo_v": (u["photo_v"] if "photo_v" in u.keys() else 0) or 0, "wallpaper": w or "preset:default",
            "wallpaper_css": wall_css(u), "icons": get_icons(u["id"])}


# ------------------------------------------------------------------ البند 44: أيقونات البرامج لكل مستخدم
# زر أيمن على أيقونة في سطح المكتب ← «تغيير الأيقونة»: رمز ولون، أو صورة. لكل مستخدم أيقوناته.
ICON_KEY = re.compile(r"^[a-z0-9][a-z0-9_-]{0,47}$")      # appstore، files، x-frigate، phone …
ICON_NAME = re.compile(r"^[a-z0-9-]{1,20}$")
ICON_COLOR = re.compile(r"^[a-z0-9#(),.% -]{3,160}$", re.I)   # لون أو تدرج، بلا ; ولا " ولا :
MAX_ICONS = 200


def get_icons(uid: int) -> dict:
    from .core import get_setting
    try:
        d = json.loads(get_setting(f"icons_{uid}") or "{}")
    except ValueError:
        return {}
    return d if isinstance(d, dict) else {}


def put_icons(uid: int, d: dict):
    from .core import set_setting
    set_setting(f"icons_{uid}", json.dumps(d, separators=(",", ":")))


def icon_file(uid: int, key: str) -> Path:
    return folder() / f"icon-{uid}-{key}.jpg"


def _key(key: str) -> str:
    if not ICON_KEY.match(key or ""):
        abort(400, "برنامج غير صالح")
    return key


def wall_css(u) -> str | None:
    w = (u["wallpaper"] if "wallpaper" in u.keys() else None) or ""
    if w.startswith("preset:"):
        return PRESETS.get(w[7:])
    if w.startswith("image:"):
        return f'url("/api/me/wallpaper/image?v={w[6:]}") center/cover no-repeat'
    return None


def save_image(fs, dest: Path, square: int | None = None, max_side: int = 2560):
    if not fs or not fs.filename:
        abort(400, "اختر صورة")
    tmp = dest.with_suffix(".upload")
    fs.save(tmp)
    try:
        if tmp.stat().st_size > MAX_UPLOAD:
            abort(400, "الصورة كبيرة جداً")
        with open_image(tmp) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            if square:
                im = ImageOps.fit(im, (square, square), Image.LANCZOS, centering=(0.5, 0.4))
            else:
                im.thumbnail((max_side, max_side), Image.LANCZOS)
            im.save(dest, "JPEG", quality=88)
    except OSError:
        abort(400, "تعذّر فتح الصورة")
    finally:
        tmp.unlink(missing_ok=True)


def set_photo(uid: int, fs):
    save_image(fs, photo_file(uid), square=512)
    db = get_db()
    db.execute("UPDATE users SET photo_v=? WHERE id=?", (int(time.time()), uid))
    db.commit()


def clear_photo(uid: int):
    photo_file(uid).unlink(missing_ok=True)
    db = get_db()
    db.execute("UPDATE users SET photo_v=0 WHERE id=?", (uid,))
    db.commit()


def user_row(uid: int):
    u = get_db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not u:
        abort(404)
    return u


# ------------------------------------------------------------------ صورة المستخدم
@bp.post("/api/me/photo")
@login_required
def api_me_photo():
    set_photo(current_user()["id"], request.files.get("image"))
    return jsonify(ok=True, **look(user_row(current_user()["id"])))


@bp.delete("/api/me/photo")
@login_required
def api_me_photo_delete():
    clear_photo(current_user()["id"])
    return jsonify(ok=True)


@bp.post("/api/admin/users/<int:uid>/photo")
@admin_required
def api_admin_photo(uid):
    user_row(uid)
    set_photo(uid, request.files.get("image"))
    return jsonify(ok=True, **look(user_row(uid)))


@bp.delete("/api/admin/users/<int:uid>/photo")
@admin_required
def api_admin_photo_delete(uid):
    user_row(uid)
    clear_photo(uid)
    return jsonify(ok=True)


@bp.get("/api/users/<int:uid>/photo")
def api_user_photo(uid):
    """للمستخدمين المسجلين ولشاشة التلفاز."""
    from .tv import tv_allowed
    if not (current_user() or tv_allowed()):
        abort(401)
    f = photo_file(uid)
    if not f.exists():
        abort(404)
    return send_file(f, mimetype="image/jpeg", max_age=86400 * 30)


# ------------------------------------------------------------------ خلفية سطح المكتب
@bp.get("/api/me/look")
@login_required
def api_me_look():
    return jsonify(presets={k: v for k, v in PRESETS.items()}, **look(user_row(current_user()["id"])))


@bp.post("/api/me/wallpaper")
@login_required
def api_me_wallpaper():
    uid = current_user()["id"]
    if request.files.get("image"):
        save_image(request.files["image"], wall_file(uid))
        val = f"image:{int(time.time())}"
    else:
        preset = body().get("preset") or "default"
        if preset not in PRESETS:
            abort(400)
        val = f"preset:{preset}"
        wall_file(uid).unlink(missing_ok=True)
    db = get_db()
    db.execute("UPDATE users SET wallpaper=? WHERE id=?", (val, uid))
    db.commit()
    return jsonify(ok=True, **look(user_row(uid)))


@bp.put("/api/me/icons/<key>")
@login_required
def api_icon_set(key):
    """رمز ولون (أو أحدهما). الصورة المرفوعة تُحذف إن اختار رمزاً."""
    uid, key = current_user()["id"], _key(key)
    d = body()
    name, color = str(d.get("icon") or ""), str(d.get("color") or "")
    if name and not ICON_NAME.match(name):
        abort(400, "رمز غير صالح")
    if color and (not ICON_COLOR.match(color) or re.search(r"url|expression|var|attr|image", color, re.I)):
        abort(400, "لون غير صالح")
    if not name and not color:
        abort(400, "اختر رمزاً أو لوناً")
    icons = get_icons(uid)
    if key not in icons and len(icons) >= MAX_ICONS:
        abort(400, "أيقونات كثيرة")
    icons[key] = {k: v for k, v in (("icon", name), ("color", color)) if v}
    icon_file(uid, key).unlink(missing_ok=True)
    put_icons(uid, icons)
    return jsonify(ok=True, icons=icons)


@bp.post("/api/me/icons/<key>/image")
@login_required
def api_icon_image(key):
    uid, key = current_user()["id"], _key(key)
    icons = get_icons(uid)
    if key not in icons and len(icons) >= MAX_ICONS:
        abort(400, "أيقونات كثيرة")
    save_image(request.files.get("image"), icon_file(uid, key), square=256)
    icons[key] = {"img": int(time.time())}
    put_icons(uid, icons)
    return jsonify(ok=True, icons=icons)


@bp.get("/api/me/icons/<key>/image")
@login_required
def api_icon_image_get(key):
    f = icon_file(current_user()["id"], _key(key))
    if not f.exists():
        abort(404)
    return send_file(f, mimetype="image/jpeg", max_age=86400 * 30)


@bp.delete("/api/me/icons/<key>")
@login_required
def api_icon_reset(key):
    """«الأيقونة الأصلية»."""
    uid, key = current_user()["id"], _key(key)
    icons = get_icons(uid)
    icons.pop(key, None)
    icon_file(uid, key).unlink(missing_ok=True)
    put_icons(uid, icons)
    return jsonify(ok=True, icons=icons)


@bp.get("/api/me/wallpaper/image")
@login_required
def api_me_wallpaper_image():
    f = wall_file(current_user()["id"])
    if not f.exists():
        abort(404)
    return send_file(f, mimetype="image/jpeg", max_age=86400 * 30)
