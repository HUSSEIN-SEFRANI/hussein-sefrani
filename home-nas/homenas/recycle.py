"""سلة المحذوفات (v1.9.8، البند 16).

الحذف من الملفات والصور وقرص الشبكة ينقل الملف إلى مجلد «#recycle» (في مجلد كل فرد وكل مجلد مشترك)، فيبقى يشغل
مساحته. هنا:
- تفريغ تلقائي مرة كل يوم للملفات التي مرّ على حذفها أكثر من «recycle_days» يوماً (الافتراضي 30، و0 = لا تفريغ).
  وقت الحذف = ctime للملف، لأن نقل الملف إلى السلة يغيّره، ولا يغيّر وقت التعديل mtime.
- حجم كل سلة، وتفريغ الكل، في «إدارة التخزين»، وتنبيه في «نظرة عامة» إذا كبرت السلة.
"""
from __future__ import annotations

import json
import os
import shutil
import threading
import time
from pathlib import Path

from flask import Blueprint, abort, jsonify

from .core import RECYCLE, admin_required, body, connect, get_db, log_action, paths

bp = Blueprint("recycle", __name__)

DEFAULT_DAYS = 30
CHOICES = (0, 7, 14, 30, 60, 90)
BIG_BYTES = 20 * 1024 ** 3          # تنبيه إذا تجاوزت السلال معاً 20 غيغا
BIG_SHARE = 0.10                    # أو 10% من القرص
_state = {"last": None}


def _days(db) -> int:
    row = db.execute("SELECT value FROM settings WHERE key='recycle_days'").fetchone()
    try:
        d = int(row["value"]) if row else DEFAULT_DAYS
    except (TypeError, ValueError):
        d = DEFAULT_DAYS
    return d if d >= 0 else DEFAULT_DAYS


def bins(db, data_paths) -> list[tuple[str, Path]]:
    """كل سلال المحذوفات: (الاسم المعروض، المسار)."""
    out, seen = [], set()
    names = {r["username"]: (r["display_name"] or "").strip() or r["username"]
             for r in db.execute("SELECT username, display_name FROM users")}

    def add(label, p: Path):
        try:
            key = str(p.resolve())
        except OSError:
            return
        if key not in seen and p.is_dir():
            seen.add(key)
            out.append((label, p))

    if data_paths.homes.is_dir():
        add("مجلد العائلة", data_paths.homes / RECYCLE)
        for u in sorted(os.listdir(data_paths.homes)):
            if (data_paths.homes / u).is_dir() and u != RECYCLE:
                add(names.get(u, u), data_paths.homes / u / RECYCLE)
    for r in db.execute("SELECT name, path FROM folders ORDER BY name"):
        add(r["name"], Path(r["path"]) / RECYCLE)
    return out


def _walk(p: Path):
    for r, ds, fs in os.walk(p, onerror=lambda e: None):
        ds[:] = [d for d in ds if not os.path.islink(os.path.join(r, d))]
        for f in fs:
            fp = os.path.join(r, f)
            try:
                yield fp, os.lstat(fp)
            except OSError:
                pass


def size_of(p: Path) -> tuple[int, int]:
    n = c = 0
    for _, st in _walk(p):
        n += st.st_size
        c += 1
    return n, c


def purge(db, data_paths, days: int | None = None, now: float | None = None) -> dict:
    """يحذف نهائياً ما مرّ على حذفه أكثر من days يوماً (days=0: لا شيء). يعيد {files, bytes}."""
    days = _days(db) if days is None else days
    now = now or time.time()
    files = freed = 0
    if days <= 0:
        return {"files": 0, "bytes": 0}
    limit = now - days * 86400
    for _, b in bins(db, data_paths):
        for fp, st in _walk(b):
            if st.st_ctime < limit:
                try:
                    os.unlink(fp)
                    files += 1
                    freed += st.st_size
                except OSError:
                    pass
        # المجلدات التي فرغت
        for r, ds, fs in os.walk(b, topdown=False):
            if r != str(b) and not ds and not fs:
                try:
                    os.rmdir(r)
                except OSError:
                    pass
    return {"files": files, "bytes": freed}


def empty_all(db, data_paths) -> dict:
    files = freed = 0
    for _, b in bins(db, data_paths):
        n, c = size_of(b)
        shutil.rmtree(b, ignore_errors=True)
        files += c
        freed += n
    return {"files": files, "bytes": freed}


def summary(db, data_paths) -> dict:
    items = []
    for label, b in bins(db, data_paths):
        n, c = size_of(b)
        if c:
            items.append({"name": label, "size": n, "count": c})
    total = sum(x["size"] for x in items)
    res = {"days": _days(db), "choices": list(CHOICES), "bins": sorted(items, key=lambda x: -x["size"]),
           "total": total, "count": sum(x["count"] for x in items), "t": int(time.time()), "last_purge": _state["last"]}
    try:
        (data_paths.cache / "recycle.json").write_text(json.dumps({"total": total, "t": res["t"]}))
    except OSError:
        pass
    return res


def alerts(data_paths) -> list[dict]:
    """تنبيه «نظرة عامة» من آخر حجم محسوب (بلا مرور على الأقراص)."""
    try:
        total = json.loads((data_paths.cache / "recycle.json").read_text())["total"]
        du = shutil.disk_usage(data_paths.data)
    except (OSError, ValueError, KeyError):
        return []
    if total >= BIG_BYTES or (du.total and total / du.total >= BIG_SHARE):
        gb = total / 1024 ** 3
        return [{"level": "warn", "title": "سلة المحذوفات كبيرة",
                 "text": f"الملفات المحذوفة ما زالت تشغل {gb:.1f} غيغا. فرّغها من «إدارة التخزين» لتحرير المساحة.",
                 "section": "storage"}]
    return []


def start_auto(data_paths):
    """تفريغ تلقائي: بعد 10 دقائق من التشغيل، ثم مرة كل يوم."""
    def loop():
        time.sleep(600)
        while True:
            try:
                db = connect(data_paths.db)
                r = purge(db, data_paths)
                _state["last"] = {"t": int(time.time()), **r}
                if r["files"]:
                    db.execute("INSERT INTO logs(ts, username, ip, action, detail) VALUES (?, '', '', ?, ?)", (time.strftime("%Y-%m-%dT%H:%M:%S"),
                               "تفريغ تلقائي لسلة المحذوفات", f"{r['files']} ملف"))
                    db.commit()
                summary(db, data_paths)
                db.close()
            except Exception:
                pass
            time.sleep(86400)
    threading.Thread(target=loop, daemon=True, name="recycle-auto").start()


@bp.get("/api/admin/recycle")
@admin_required
def api_recycle():
    return jsonify(summary(get_db(), paths()))


@bp.post("/api/admin/recycle")
@admin_required
def api_recycle_set():
    d = body()
    db = get_db()
    if d.get("action") == "empty":
        r = empty_all(db, paths())
        log_action("تفريغ كل سلال المحذوفات", f"{r['files']} ملف")
        return jsonify(ok=True, **r, summary=summary(db, paths()))
    try:
        days = int(d.get("days"))
    except (TypeError, ValueError):
        abort(400)
    if days not in CHOICES:
        abort(400)
    db.execute("INSERT INTO settings(key, value) VALUES ('recycle_days', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
               (str(days),))
    db.commit()
    log_action("مدة سلة المحذوفات", "بلا تفريغ تلقائي" if days == 0 else f"{days} يوماً")
    r = purge(db, paths(), days) if days else {"files": 0, "bytes": 0}
    return jsonify(ok=True, **r, summary=summary(db, paths()))
