"""الإضافات: تطبيقات جانبية ليست في الإيزو، يرفعها المدير بملف ZIP (بكلمة المرور) فتظهر على سطح المكتب.

ملف الإضافة (ZIP) فيه:
- addon.json: {"id", "name", "version", "summary", "icon", "color", "entry": "addon.py", "ui": "ui.js",
  "admin": false, "min_system": "1.9.16"}
- addon.py: كود Python يعمل داخل السيرفر (بصلاحية التطبيق homenas، لا root). يعرّف `router = Router()`
  ويسجّل عليه الطرق: ‎@router.get("/status") ← ‎/api/addons/<id>/status. ويمكن أن يعرّف setup(ctx) وunload().
- web/: ملفات الواجهة، تُخدم على ‎/addons/<id>/...، و ui يقع داخلها (وحدة JS تستورد ‎/static/js/core.js
  وتسجّل نافذة بالمعرّف addon-<id>).

الإضافة تُحمَّل عند أول طلب لها، وتُستبدل أو تُحذف دون إعادة تشغيل السيرفر.
"""
from __future__ import annotations

import importlib.util
import json
import os
import re
import secrets
import shutil
import sys
import threading
import time
import traceback
import zipfile
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException
from werkzeug.routing import Map, Rule
from werkzeug.security import check_password_hash

from .core import admin_required, body, current_user, is_within, log_action, login_required, paths

bp = Blueprint("addons", __name__)

ID_RE = re.compile(r"^[a-z][a-z0-9_]{1,31}$")
VER_RE = re.compile(r"^[0-9A-Za-z.\-]{1,20}$")
ICON_RE = re.compile(r"^[a-z\-]{2,24}$")
COLOR_RE = re.compile(r"^[a-z0-9#(),.% \-]{3,120}$", re.I)
FILE_RE = re.compile(r"^[A-Za-z0-9_\-]+(/[A-Za-z0-9_\-]+)*\.[A-Za-z0-9]{1,8}$")
MAX_ZIP = 100 * 1024 ** 2        # حجم الملف المرفوع
MAX_UNZIPPED = 300 * 1024 ** 2   # الحجم بعد الفك
MAX_ENTRIES = 3000
DEFAULT_COLOR = "linear-gradient(135deg,#0ea5e9,#6366f1)"


def vtuple(v: str) -> tuple:
    return tuple(int(x) for x in re.findall(r"\d+", str(v))[:4])


def system_version() -> str:
    from . import __version__
    return __version__


def addons_dir() -> Path:
    d = paths().system / "addons"
    d.mkdir(parents=True, exist_ok=True)
    return d


def data_dir(addon_id: str) -> Path:
    """مجلد بيانات الإضافة (داخل ‎@system، فلا يظهر في قرص الشبكة)."""
    return paths().system / "addon-data" / addon_id


# ----------------------------------------------------------------------------- الطرق داخل الإضافة
class Router:
    """مثل Blueprint صغير: الإضافة تسجّل عليه طرقها، والسيرفر يوجّه إليها ‎/api/addons/<id>/<المسار>."""

    def __init__(self):
        self.rules: list[tuple[str, tuple, object]] = []
        self._map = None

    def route(self, rule: str, methods=("GET",)):
        def deco(fn):
            self.rules.append((rule if rule.startswith("/") else "/" + rule, tuple(m.upper() for m in methods), fn))
            self._map = None
            return fn
        return deco

    def get(self, rule):
        return self.route(rule, ("GET",))

    def post(self, rule):
        return self.route(rule, ("POST",))

    def delete(self, rule):
        return self.route(rule, ("DELETE",))

    def dispatch(self, sub: str, method: str):
        if self._map is None:
            self._map = Map([Rule(r, methods=m, endpoint=i) for i, (r, m, _f) in enumerate(self.rules)], strict_slashes=False)
        endpoint, args = self._map.bind("addon").match("/" + sub, method=method)
        return self.rules[endpoint][2](**args)


class Ctx:
    """ما تعطيه الإضافة في setup(ctx): معرّفها ومجلدها ومجلد بياناتها."""

    def __init__(self, meta: dict, folder: Path, data: Path, nas_paths):
        self.id = meta["id"]
        self.meta = meta
        self.dir = folder
        self.data = data
        self.paths = nas_paths


_lock = threading.Lock()
_loaded: dict[str, tuple[float, object]] = {}   # المعرّف ← (وقت التنصيب، الوحدة)


def read_meta(folder: Path) -> dict | None:
    try:
        return validate_meta(json.loads((folder / "addon.json").read_text(encoding="utf-8-sig")))
    except (OSError, ValueError):
        return None


def installed() -> list[dict]:
    out = []
    for d in sorted(addons_dir().iterdir()):
        if d.is_dir() and not d.name.startswith(".") and ID_RE.match(d.name):
            m = read_meta(d)
            if m and m["id"] == d.name:
                m["installed"] = (d / "addon.json").stat().st_mtime
                out.append(m)
    return out


def _unload(addon_id: str):
    old = _loaded.pop(addon_id, None)
    name = f"hsef_addon_{addon_id}"
    for k in [k for k in sys.modules if k == name or k.startswith(name + ".")]:
        sys.modules.pop(k, None)
    if old and hasattr(old[1], "unload"):
        try:
            old[1].unload()
        except Exception:  # pragma: no cover
            traceback.print_exc()


def load(addon_id: str):
    """يرجع وحدة الإضافة (يحمّلها عند أول طلب، ومن جديد إن استُبدلت)."""
    folder = addons_dir() / addon_id
    meta = read_meta(folder) if ID_RE.match(addon_id) and folder.is_dir() else None
    if not meta or meta["id"] != addon_id:
        abort(404, "الإضافة غير موجودة")
    stamp = (folder / "addon.json").stat().st_mtime
    with _lock:
        hit = _loaded.get(addon_id)
        if hit and hit[0] == stamp:
            return meta, hit[1]
        _unload(addon_id)
        name = f"hsef_addon_{addon_id}"
        spec = importlib.util.spec_from_file_location(name, folder / meta["entry"], submodule_search_locations=[str(folder)])
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod
        try:
            spec.loader.exec_module(mod)
            if not isinstance(getattr(mod, "router", None), Router):
                raise RuntimeError("addon.py must define router = Router()")
            if hasattr(mod, "setup"):
                dd = data_dir(addon_id)
                dd.mkdir(parents=True, exist_ok=True)
                mod.setup(Ctx(meta, folder, dd, paths()))
        except Exception as exc:
            sys.modules.pop(name, None)
            traceback.print_exc()
            abort(500, f"تعذر تشغيل الإضافة: {str(exc)[:200]}")
        _loaded[addon_id] = (stamp, mod)
        return meta, mod


# ----------------------------------------------------------------------------- التحقق من الملف المرفوع
def _text(v, n=200):
    return str(v or "").strip().replace("\n", " ")[:n]


def validate_meta(d) -> dict:
    if not isinstance(d, dict):
        raise ValueError("addon.json غير صالح")
    aid = str(d.get("id", "")).strip()
    if not ID_RE.match(aid):
        raise ValueError("المعرّف id في addon.json: حروف إنجليزية صغيرة وأرقام فقط (2-32)")
    name = _text(d.get("name"), 40)
    if not name:
        raise ValueError("الاسم name مطلوب في addon.json")
    ver = str(d.get("version", "")).strip()
    if not VER_RE.match(ver):
        raise ValueError("رقم الإصدار version مطلوب في addon.json")
    entry = str(d.get("entry") or "addon.py")
    if not FILE_RE.match(entry) or not entry.endswith(".py"):
        raise ValueError("entry في addon.json يجب أن يكون ملف .py")
    ui = str(d.get("ui") or "")
    if ui and (not FILE_RE.match(ui) or not ui.endswith(".js")):
        raise ValueError("ui في addon.json يجب أن يكون ملف .js داخل web/")
    icon = str(d.get("icon") or "grid")
    color = str(d.get("color") or DEFAULT_COLOR)
    return {"id": aid, "name": name, "version": ver, "summary": _text(d.get("summary"), 300), "entry": entry, "ui": ui,
            "icon": icon if ICON_RE.match(icon) else "grid", "color": color if COLOR_RE.match(color) else DEFAULT_COLOR,
            "admin": bool(d.get("admin")), "min_system": str(d.get("min_system") or ""),
            "width": max(360, min(int(d.get("width") or 900), 1600)) if str(d.get("width") or "0").isdigit() else 900,
            "height": max(300, min(int(d.get("height") or 640), 1200)) if str(d.get("height") or "0").isdigit() else 640}


def unpack(zpath: Path, dest: Path) -> dict:
    """يفك ملف الإضافة إلى dest بعد التحقق من كل مسار فيه، ويرجع addon.json نظيفاً."""
    try:
        z = zipfile.ZipFile(zpath)
    except (zipfile.BadZipFile, OSError):
        raise ValueError("الملف ليس ZIP صالحاً")
    with z:
        infos = [i for i in z.infolist() if not i.is_dir()]
        if not infos or len(infos) > MAX_ENTRIES:
            raise ValueError("ملف الإضافة فارغ أو فيه ملفات كثيرة جداً")
        if sum(i.file_size for i in infos) > MAX_UNZIPPED:
            raise ValueError("ملف الإضافة كبير جداً بعد الفك")
        names = [i.filename.replace("\\", "/") for i in infos]
        # كل الملفات داخل مجلد واحد في أعلى الملف؟ (عند ضغط المجلد نفسه)
        prefix = ""
        if "addon.json" not in names:
            tops = {n.split("/", 1)[0] for n in names}
            if len(tops) == 1 and f"{next(iter(tops))}/addon.json" in names:
                prefix = next(iter(tops)) + "/"
            else:
                raise ValueError("لا يوجد addon.json في ملف الإضافة")
        try:
            meta = validate_meta(json.loads(z.read(prefix + "addon.json").decode("utf-8-sig")))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ValueError("addon.json غير صالح (JSON)")
        if meta["min_system"] and vtuple(system_version()) < vtuple(meta["min_system"]):
            raise ValueError(f"هذه الإضافة تحتاج النظام {meta['min_system']} أو أحدث. حدّث الجهاز أولاً")
        dest.mkdir(parents=True)
        root = dest.resolve()
        for info, n in zip(infos, names):
            rel = n[len(prefix):]
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError(f"روابط رمزية غير مسموحة: {rel}")
            if not rel or rel.startswith("/") or ":" in rel or any(p in ("", ".", "..") for p in rel.split("/")):
                raise ValueError(f"مسار غير آمن في الملف: {rel}")
            out = (root / rel).resolve()
            if not is_within(out, root):
                raise ValueError(f"مسار غير آمن في الملف: {rel}")
            out.parent.mkdir(parents=True, exist_ok=True)
            with z.open(info) as src, open(out, "wb") as dst:
                shutil.copyfileobj(src, dst)
    if not (dest / meta["entry"]).is_file():
        raise ValueError(f"الملف {meta['entry']} غير موجود في الإضافة")
    if meta["ui"] and not (dest / "web" / meta["ui"]).is_file():
        raise ValueError(f"ملف الواجهة web/{meta['ui']} غير موجود في الإضافة")
    for py in dest.rglob("*.py"):   # خطأ في الكتابة يظهر الآن، لا عند أول استعمال
        try:
            compile(py.read_text(encoding="utf-8"), str(py.relative_to(dest)), "exec")
        except (SyntaxError, UnicodeDecodeError) as exc:
            raise ValueError(f"خطأ في {py.relative_to(dest)}: {exc}")
    return meta


def _check_password():
    pw = request.form.get("password") if request.form else None
    if pw is None:
        pw = body().get("password")
    if not check_password_hash(current_user()["password_hash"], str(pw or "")):
        abort(403, "كلمة المرور غير صحيحة")


# ----------------------------------------------------------------------------- الطرق
def _public(m: dict) -> dict:
    return {k: m[k] for k in ("id", "name", "version", "summary", "icon", "color", "ui", "admin", "width", "height")}


@bp.get("/api/addons")
@login_required
def api_list():
    adm = bool(current_user()["is_admin"])
    return jsonify(addons=[_public(m) for m in installed() if adm or not m["admin"]])


@bp.get("/api/admin/addons")
@admin_required
def api_admin_list():
    return jsonify(addons=[{**_public(m), "installed": m["installed"]} for m in installed()], system=system_version())


@bp.post("/api/admin/addons")
@admin_required
def api_install():
    _check_password()
    f = request.files.get("file")
    if not f:
        abort(400, "اختر ملف الإضافة (ZIP)")
    tmpd = paths().tmp / f"addon-{secrets.token_hex(6)}"
    tmpd.mkdir(parents=True)
    try:
        zp = tmpd / "upload.zip"
        f.save(zp)
        if zp.stat().st_size > MAX_ZIP:
            abort(400, "ملف الإضافة أكبر من 100MB")
        stage = addons_dir() / f".new-{secrets.token_hex(6)}"
        try:
            meta = unpack(zp, stage)
        except ValueError as exc:
            shutil.rmtree(stage, ignore_errors=True)
            abort(400, str(exc))
        final = addons_dir() / meta["id"]
        with _lock:
            _unload(meta["id"])
            old = None
            if final.exists():
                old = addons_dir() / f".old-{secrets.token_hex(6)}"
                final.rename(old)
            stage.rename(final)
            if old:
                shutil.rmtree(old, ignore_errors=True)
            now = time.time()
            os.utime(final / "addon.json", (now, now))   # وقت التنصيب = علامة لإعادة التحميل
        log_action("تنصيب إضافة", f"{meta['name']} {meta['version']}")
        return jsonify(ok=True, addon=_public(meta), upgraded=bool(old))
    finally:
        shutil.rmtree(tmpd, ignore_errors=True)


@bp.post("/api/admin/addons/<addon_id>/remove")
@admin_required
def api_remove(addon_id):
    if not ID_RE.match(addon_id) or not (addons_dir() / addon_id).is_dir():
        abort(404, "الإضافة غير موجودة")
    _check_password()
    meta = read_meta(addons_dir() / addon_id) or {"name": addon_id}
    with _lock:
        _unload(addon_id)
        shutil.rmtree(addons_dir() / addon_id, ignore_errors=True)
        shutil.rmtree(data_dir(addon_id), ignore_errors=True)
    log_action("حذف إضافة", meta["name"])
    return jsonify(ok=True)


@bp.route("/api/addons/<addon_id>/<path:sub>", methods=["GET", "POST", "PUT", "DELETE"])
@login_required
def api_dispatch(addon_id, sub):
    meta, mod = load(addon_id)
    if meta["admin"] and not current_user()["is_admin"]:
        abort(403, "هذه الإضافة للمدير فقط")
    try:
        return mod.router.dispatch(sub, request.method)
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        current_app.logger.error("addon %s: %s", addon_id, exc)
        abort(500, f"خطأ في الإضافة: {str(exc)[:200]}")


@bp.get("/addons/<addon_id>/<path:fname>")
@login_required
def web_file(addon_id, fname):
    folder = addons_dir() / addon_id / "web"
    if not ID_RE.match(addon_id) or not folder.is_dir():
        abort(404)
    resp = send_from_directory(folder, fname, max_age=0)
    resp.headers["Cache-Control"] = "no-cache"
    return resp
