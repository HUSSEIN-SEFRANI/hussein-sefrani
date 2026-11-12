"""بطاقة الذاكرة (SD) والفلاشات: عند إدخالها تظهر أيقونة على سطح المكتب للمدير.

- «فتح في الملفات»: تظهر البطاقة كمجلد في تطبيق «الملفات» للنسخ منها وإليها (النسخ والنقل والرفع والتنزيل كالعادة).
- «استيراد الصور والفيديو»: ينسخ الجديد فقط إلى «صوري» (Photos/بطاقة الذاكرة/السنة-الشهر) ثم تُفهرس.
- «نسخ كل البطاقة»: ينسخ كل محتوياتها إلى مجلد تختاره في السيرفر.
- «إخراج آمن» قبل سحبها.
التركيب والإخراج عبر المساعد الجذري (hsef-extras media-*)، والفحص المتكرر رخيص: لا نسأل المساعد إلا إذا تغيّر شيء في الأقراص.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify

from .core import IMAGE_EXT, VIDEO_EXT, body, connect, current_user, log_action, unique_path

bp = Blueprint("media", __name__)
DEV_RE = re.compile(r"^(sd[a-z]+\d*|mmcblk\d+(p\d+)?)$")
FAKE_FLAG = Path("/tmp/hsef-fake-card")
_cache = {"fp": None, "cards": [], "t": 0.0}
_lock = threading.Lock()
job: dict = {"running": False}


def _fingerprint() -> str:
    items = []
    for p in sorted(Path("/sys/class/block").glob("*")):
        if DEV_RE.match(p.name):
            try:
                items.append((p.name, (p / "size").read_text().strip()))
            except OSError:
                pass
    try:
        mounts = [l.split()[1] for l in Path("/proc/mounts").read_text().splitlines() if " /media/hsef/" in l]
    except OSError:
        mounts = []
    if os.environ.get("HSEF_EXTRAS_FAKE") == "1":
        items.append(("fake", FAKE_FLAG.exists()))
    return json.dumps([items, mounts])


def cards(force: bool = False) -> list:
    from .sysadmin import available, helper
    if not available():
        return []
    with _lock:
        fp = _fingerprint()
        if force or fp != _cache["fp"] or time.time() - _cache["t"] > 120:
            try:
                _cache["cards"] = helper("media-list", timeout=30, as_json=True) or []
            except Exception:  # noqa: BLE001
                _cache["cards"] = []
            _cache.update(fp=fp, t=time.time())
        return [dict(c, root=root_name(c), title=title(c)) for c in _cache["cards"]]


def root_name(c: dict) -> str:
    return f"card-{c['dev']}"


def title(c: dict) -> str:
    base = "بطاقة الذاكرة" if c.get("kind") == "sd" else "فلاشة USB"
    return f"{base} · {c['label']}" if c.get("label") else base


def mounted_roots() -> list:
    """للـ«الملفات»: البطاقات المفتوحة الآن (للمدير)."""
    from .vfs import Root
    return [Root(c["root"], c["title"], Path(c["mount"]), "ro" if c.get("ro") else "rw", "removable")
            for c in cards() if c.get("mount")]


def require_admin():
    u = current_user()
    if not u:
        abort(401, "يجب تسجيل الدخول")
    if not u["is_admin"]:
        abort(403, "هذه العملية للمدير فقط")
    return u


def card(dev: str) -> dict:
    if not DEV_RE.match(dev):
        abort(400)
    c = next((x for x in cards() if x["dev"] == dev), None)
    if not c:
        abort(404, "البطاقة غير موجودة. هل سُحبت؟")
    return c


def ensure_mounted(c: dict) -> dict:
    from .sysadmin import helper
    if not c.get("mount"):
        helper("media-mount", c["dev"], timeout=60, as_json=True)
        c = next((x for x in cards(force=True) if x["dev"] == c["dev"]), None)
        if not c or not c.get("mount"):
            abort(400, "تعذّر فتح البطاقة")
    return c


def usage(c: dict) -> dict:
    try:
        du = shutil.disk_usage(c["mount"])
        return {"used": du.used, "free": du.free, "total": du.total}
    except (OSError, TypeError):
        return {}


# ---------------------------------------------------------------------------- الواجهة
@bp.get("/api/media")
def api_list():
    require_admin()
    out = []
    for c in cards():
        out.append(dict(c, usage=usage(c) if c.get("mount") else {}))
    return jsonify(cards=out, job=job)


@bp.post("/api/media/<dev>/open")
def api_open(dev):
    u = require_admin()
    c = ensure_mounted(card(dev))
    log_action("فتح بطاقة ذاكرة", c["title"], u["username"])
    return jsonify(card=dict(c, usage=usage(c)))


@bp.post("/api/media/<dev>/eject")
def api_eject(dev):
    from .sysadmin import helper
    u = require_admin()
    c = card(dev)
    if job.get("running") and job.get("dev") == dev:
        abort(409, "انتظر حتى ينتهي النسخ")
    helper("media-eject", dev, timeout=320)
    cards(force=True)
    log_action("إخراج بطاقة ذاكرة", c["title"], u["username"])
    return jsonify(ok=True)


def _start(kind: str, c: dict, fn):
    if job.get("running"):
        abort(409, "يوجد نسخ آخر يعمل الآن")
    job.clear()
    job.update(running=True, kind=kind, dev=c["dev"], title=c["title"], done=0, total=0, copied=0, skipped=0, bytes=0,
               error=None, started=time.time(), finished=None)
    threading.Thread(target=fn, daemon=True, name=f"media-{kind}").start()


@bp.post("/api/media/<dev>/import")
def api_import(dev):
    """الصور والفيديو الجديدة فقط إلى «صوري» للمستخدم الحالي."""
    u = require_admin()
    c = ensure_mounted(card(dev))
    paths = current_app.extensions["nas_paths"]
    indexer = current_app.extensions["nas_indexer"]
    user = {"id": u["id"], "username": u["username"]}
    src = Path(c["mount"])
    ext = IMAGE_EXT | VIDEO_EXT

    def run():
        db = connect(paths.db)
        try:
            lib = f"u:{user['id']}"
            known = {(r["name"].lower(), r["size"]) for r in db.execute("SELECT name, size FROM media WHERE library=?", (lib,))}
            dest_base = paths.homes / user["username"] / "Photos" / "بطاقة الذاكرة"
            files = [Path(r) / n for r, ds, ns in os.walk(src) for n in ns
                     if Path(n).suffix.lower() in ext and not n.startswith("._") and "/." not in r]
            job["total"] = len(files)
            for f in sorted(files):
                try:
                    st = f.stat()
                    if (f.name.lower(), st.st_size) in known:
                        job["skipped"] += 1
                    else:
                        folder = dest_base / datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m")
                        folder.mkdir(parents=True, exist_ok=True)
                        target = folder / f.name
                        if target.exists() and target.stat().st_size == st.st_size:
                            job["skipped"] += 1
                        else:
                            target = unique_path(target)
                            tmp = target.with_name(target.name + ".part")
                            shutil.copyfile(f, tmp)
                            os.utime(tmp, (st.st_mtime, st.st_mtime))
                            tmp.replace(target)
                            known.add((f.name.lower(), st.st_size))
                            job["copied"] += 1
                            job["bytes"] += st.st_size
                except OSError as e:
                    if not src.exists() or not os.path.ismount(src):
                        job["error"] = "سُحبت البطاقة أثناء النسخ"
                        break
                    job["error"] = str(e)[:200]
                job["done"] += 1
            if job["copied"]:
                indexer.enqueue(lib)
            db.execute("INSERT INTO logs(ts, username, action, detail, ip) VALUES(?,?,?,?,?)",
                       (datetime.now().isoformat(timespec="seconds"), user["username"], "استيراد صور من بطاقة الذاكرة",
                        f"{job['copied']} جديدة من {job['total']}", "card"))
            db.commit()
        finally:
            db.close()
            job.update(running=False, finished=time.time())
    _start("import", c, run)
    return jsonify(job=job)


@bp.post("/api/media/<dev>/copy")
def api_copy(dev):
    """كل محتويات البطاقة إلى مجلد في السيرفر (داخل مجلد جديد باسم البطاقة والتاريخ)."""
    from .vfs import resolve
    u = require_admin()
    c = ensure_mounted(card(dev))
    _root, dest_dir = resolve(u, body().get("dest", ""), need_write=True)
    if not dest_dir.is_dir():
        abort(404, "مجلد الوجهة غير موجود")
    src = Path(c["mount"])
    target = unique_path(dest_dir / f"{c.get('label') or title(c).split(' · ')[0]} {datetime.now():%Y-%m-%d}")

    def run():
        try:
            files = [Path(r) / n for r, ds, ns in os.walk(src) for n in ns if not n.startswith("._")]
            job["total"] = len(files)
            for f in files:
                try:
                    out = target / f.relative_to(src)
                    out.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(f, out)
                    st = f.stat()
                    os.utime(out, (st.st_mtime, st.st_mtime))
                    job["copied"] += 1
                    job["bytes"] += st.st_size
                except OSError as e:
                    if not os.path.ismount(src):
                        job["error"] = "سُحبت البطاقة أثناء النسخ"
                        break
                    job["error"] = str(e)[:200]
                job["done"] += 1
        finally:
            job.update(running=False, finished=time.time(), dest=str(target.name))
    _start("copy", c, run)
    log_action("نسخ بطاقة ذاكرة", f"{c['title']} → {target.name}", u["username"])
    return jsonify(job=job)
