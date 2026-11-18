"""لوحة التحكم ← الجهاز ← إدارة التخزين (v1.9.7).

- الأقراص: الحجم، والنوع، ودور كل قرص (النظام، مرآة RAID، بيانات، نسخ احتياطي، جديد)، وصحته (SMART) وحرارته.
- مصفوفات RAID مع تقدّم إعادة البناء.
- «ماذا يشغل المساحة؟»: لكل فرد من العائلة (والصور منها)، ولكل مجلد مشترك، وتسجيلات الكاميرات، وفيديو التلفاز
  المجهّز. يُحسب في الخلفية ويُحفظ، لأن حساب أحجام المجلدات بطيء على الأقراص الكبيرة.
- العمليات على قرص جديد (عبر hsef-extras disk-run ← homenas-disk، في الخلفية): قرص منفصل، أو قرص نسخ احتياطي،
  أو مرآة RAID 1 من قرصين، أو استبدال قرص معطوب في مرآة. كلها تمسح القرص، فتحتاج كلمة مرور المدير وكتابة «مسح».
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path

from flask import Blueprint, abort, jsonify
from werkzeug.security import check_password_hash

from .core import admin_required, body, current_user, get_db, log_action, paths

bp = Blueprint("storage", __name__)

HELPER = "/usr/local/sbin/hsef-extras"
APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"
CONFIRM_WORD = "123"   # البند 38: أرقام تُكتب بأي لغة (مثل إعادة ضبط المصنع)
OP_LABEL = {"add": "قرص منفصل", "backup-disk": "قرص النسخ الاحتياطي", "mirror": "مرآة RAID 1", "replace": "استبدال قرص في المرآة"}

_usage = {"running": False, "result": None}
THUMB_DIRS = ("thumbs", "previews", "fthumbs", "fpreview", "tvpdf")   # تُصنع من جديد وحدها عند الحاجة
_lock = threading.Lock()


def helper(*args, timeout=60) -> tuple[bool, str]:
    fake = os.environ.get("HSEF_EXTRAS_FAKE") == "1"
    if not fake and not (APPLIANCE and os.path.exists(HELPER)):
        return False, "not available"
    cmd = [HELPER, *args] if not fake else ["python3", str(Path(__file__).resolve().parent.parent / "appliance" / "hsef-extras"), *args]
    try:
        r = subprocess.run(cmd if fake else ["sudo", "-n", *cmd], capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return False, "timeout"
    return r.returncode == 0, (r.stdout if r.returncode == 0 else (r.stderr or r.stdout)).strip()


def available() -> bool:
    return os.environ.get("HSEF_EXTRAS_FAKE") == "1" or (APPLIANCE and os.path.exists(HELPER))


# ----------------------------------------------------------------------------- ماذا يشغل المساحة؟
def _size(p: Path) -> int:
    n = 0
    for r, ds, fs in os.walk(p, onerror=lambda e: None):
        ds[:] = [d for d in ds if not os.path.islink(os.path.join(r, d))]
        for f in fs:
            try:
                n += os.lstat(os.path.join(r, f)).st_size
            except OSError:
                pass
    return n


def _compute(data_paths, folders: list[tuple[str, str]], users: dict):
    try:
        people = []
        for u in sorted(os.listdir(data_paths.homes)):
            d = data_paths.homes / u
            if d.is_dir():
                photos = _size(d / "Photos") if (d / "Photos").is_dir() else 0
                people.append({"name": users.get(u, u), "total": _size(d), "photos": photos})
        shares, seen = [], set()
        for name, path in folders:
            p = Path(path)
            if p.is_dir() and str(p.resolve()) not in seen:
                seen.add(str(p.resolve()))
                shares.append({"name": name, "total": _size(p)})
        thumbs = sum(_size(data_paths.cache / d) for d in THUMB_DIRS if (data_paths.cache / d).is_dir())
        other = [{"name": "تسجيلات الكاميرات", "total": _size(data_paths.system / "cameras")},
                 {"name": "فيديو التلفاز المجهّز", "total": _size(data_paths.cache / "tv-video"), "clear": "tv-video"},
                 {"name": "مصغرات الصور والمعاينات", "total": thumbs, "clear": "thumbs"}]
        res = {"t": int(time.time()), "people": sorted(people, key=lambda x: -x["total"]),
               "shares": sorted(shares, key=lambda x: -x["total"]), "other": [x for x in other if x["total"]]}
        try:
            (data_paths.cache / "storage-usage.json").write_text(json.dumps(res, ensure_ascii=False))
        except OSError:
            pass
        _usage["result"] = res
    finally:
        _usage["running"] = False


def usage_result(data_paths):
    if _usage["result"] is None:
        try:
            _usage["result"] = json.loads((data_paths.cache / "storage-usage.json").read_text())
        except (OSError, ValueError):
            pass
    return _usage["result"]


def start_usage():
    with _lock:
        if _usage["running"]:
            return
        _usage["running"] = True
    db = get_db()
    folders = [(r["name"], r["path"]) for r in db.execute("SELECT name, path FROM folders ORDER BY name")]
    users = {r["username"]: (r["display_name"] or "").strip() or r["username"] for r in db.execute("SELECT username, display_name FROM users")}
    threading.Thread(target=_compute, args=(paths(), folders, users), daemon=True).start()


# ----------------------------------------------------------------------------- الواجهات
def _disks() -> list[dict]:
    from .health import smart_disks
    ok, out = helper("disk-info", timeout=30)
    roles = {d["name"]: d for d in (json.loads(out).get("disks", []) if ok else [])}
    smart = {d["name"]: d for d in smart_disks()}
    names = list(roles) or list(smart)
    out = []
    for n in names:
        d = {**smart.get(n, {}), **roles.get(n, {})}
        d.setdefault("name", n)
        d["health"] = ("bad" if smart.get(n, {}).get("passed") is False
                       else "warn" if (smart.get(n, {}).get("reallocated") or 0) > 0 or (smart.get(n, {}).get("pending") or 0) > 0
                       else "ok" if smart.get(n, {}).get("passed") else None)
        for k in ("temp", "hours", "reallocated", "pending", "passed"):
            d[k] = smart.get(n, {}).get(k)
        out.append(d)
    return out


def _volumes() -> list[dict]:
    vols, seen = [], set()
    cand = [("البيانات", paths().data)] + [(r["name"], Path(r["path"])) for r in get_db().execute("SELECT name, path FROM folders")]
    for label, p in cand:
        try:
            du = shutil.disk_usage(p)
        except OSError:
            continue
        key = (du.total, du.used)
        if key in seen:
            next(v for v in vols if v["key"] == key)["labels"].append(label)
            continue
        seen.add(key)
        vols.append({"key": key, "labels": [label], "total": du.total, "used": du.used, "free": du.free})
    for v in vols:
        v.pop("key")
    return vols


def _op_status() -> dict | None:
    ok, out = helper("disk-status", timeout=20)
    if not ok:
        return None
    st = json.loads(out)
    if st.get("op"):
        st["label"] = OP_LABEL.get(st["op"], st["op"])
    return st if st.get("op") else None


@bp.get("/api/admin/storage")
@admin_required
def api_storage():
    from .health import raid_arrays
    if usage_result(paths()) is None:
        start_usage()
    return jsonify(available=available(), disks=_disks(), arrays=raid_arrays(), volumes=_volumes(),
                   usage=usage_result(paths()), usage_running=_usage["running"], op=_op_status(),
                   confirm_word=CONFIRM_WORD, ops=OP_LABEL)


@bp.post("/api/admin/storage/usage")
@admin_required
def api_storage_usage():
    start_usage()
    return jsonify(ok=True, running=_usage["running"])


@bp.get("/api/admin/storage/op")
@admin_required
def api_storage_op():
    from .health import raid_arrays
    return jsonify(op=_op_status(), arrays=raid_arrays())


@bp.post("/api/admin/storage/run")
@admin_required
def api_storage_run():
    """عملية على قرص جديد. JSON: {op, devs: [..], name?, password, confirm}"""
    if not available():
        abort(400, "إدارة الأقراص متاحة على جهاز HOME ANAB المثبّت من ملف ISO فقط")
    d = body()
    u = current_user()
    if not check_password_hash(u["password_hash"], str(d.get("password") or "")):
        abort(403, "كلمة مرور حسابك غير صحيحة")
    from .transfer import confirm_ok
    if not confirm_ok(d.get("confirm")):   # تقبل 123 و١٢٣ و۱۲۳
        abort(400, f"اكتب «{CONFIRM_WORD}» للتأكيد")
    op = d.get("op")
    devs = [str(x) for x in d.get("devs") or []]
    need = {"add": 1, "backup-disk": 1, "mirror": 2, "replace": 1}.get(op)
    if not need or len(devs) != need or len(set(devs)) != need:
        abort(400, "اختر القرص المناسب")
    disks = {x["name"]: x for x in _disks()}
    for n in devs:
        if not re.match(r"^[a-zA-Z0-9]+$", n) or n not in disks:
            abort(400, "قرص غير موجود")
        if disks[n].get("role") != "new":
            abort(400, f"القرص {n} مستعمل ({disks[n].get('role')}). العمليات هنا للأقراص الجديدة فقط، حتى لا يُمسح قرص فيه بياناتك.")
    if op == "replace":
        from .health import raid_arrays
        if not any(not a["healthy"] for a in raid_arrays()):
            abort(400, "لا توجد مرآة RAID متدهورة تحتاج استبدال قرص")
    args = [f"/dev/{x}" for x in devs]
    if op == "add":
        name = str(d.get("name") or "").strip()
        if not re.match(r"^[A-Za-z0-9_-]{1,24}$", name):
            abort(400, "اسم القرص بحروف إنجليزية وأرقام فقط (مثل extra1)")
        args.append(name)
    cur = _op_status()
    if cur and not cur.get("done"):
        abort(400, "توجد عملية على الأقراص قيد التنفيذ. انتظر حتى تنتهي.")
    ok, out = helper("disk-run", op, *args, timeout=60)
    if not ok:
        abort(500, out[-300:] or "فشل البدء")
    log_action("إدارة التخزين", f"{OP_LABEL[op]}: {' '.join(devs)}")
    return jsonify(ok=True, op=_op_status())


@bp.post("/api/admin/storage/clear")
@admin_required
def api_storage_clear():
    """البند 21: تفريغ الذاكرة المؤقتة: فيديو التلفاز المجهّز، أو المصغرات. الأصل لا يُمس، وكلها تُصنع من جديد عند الحاجة."""
    what = body().get("what")
    p = paths()
    if what == "tv-video":
        from .tv import _tvv
        n = _tvv().clear()
        log_action("تفريغ فيديو التلفاز المجهّز", f"{n // 1048576} MB")
    elif what == "thumbs":
        n = 0
        for d in THUMB_DIRS:
            if (p.cache / d).is_dir():
                n += _size(p.cache / d)
                shutil.rmtree(p.cache / d, ignore_errors=True)
        log_action("تفريغ مصغرات الصور", f"{n // 1048576} MB")
    else:
        abort(400)
    res = usage_result(p)
    if res:   # نحدّث الرقم المعروض دون إعادة حساب كل شيء
        for x in res.get("other", []):
            if x.get("clear") == what:
                x["total"] = 0
    return jsonify(ok=True, freed=n, usage=res)
