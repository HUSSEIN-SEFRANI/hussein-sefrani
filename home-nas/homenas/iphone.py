"""نسخ صور الآيفون بالكابل: صِل الهاتف بمنفذ USB في السيرفر، فتُنسخ الصور الجديدة تلقائياً.

- المساعد الجذري (hsef-extras iphone-attach) يطلب «الوثوق» ويفتح مجلد DCIM للقراءة فقط،
  ويكتب حالته في /run/hsef-iphone/status.json.
- هنا (بصلاحية التطبيق) نقرأ الحالة، ونربط كل هاتف بصاحبه، وننسخ الجديد فقط إلى
  مكتبة صوره (Photos/iPhone/السنة-الشهر)، ثم نطلب الفهرسة.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify

from .core import IMAGE_EXT, VIDEO_EXT, admin_required, body, connect, log_action, unique_path

bp = Blueprint("iphone", __name__)
STATUS = Path(os.environ.get("HSEF_IPHONE_STATUS", "/run/hsef-iphone/status.json"))
HELPER = "/usr/local/sbin/hsef-extras"
COPY_EXT = IMAGE_EXT | VIDEO_EXT


def read_status() -> dict:
    try:
        st = json.loads(STATUS.read_text())
    except (OSError, ValueError):
        return {"state": "none"}
    return st


class IphoneSync:
    def __init__(self, data_paths, indexer):
        self.paths = data_paths
        self.indexer = indexer
        self.progress = {"running": False, "udid": None, "done": 0, "total": 0, "copied": 0, "skipped": 0,
                         "error": None, "finished": None}
        self.last_attach = None
        self.force = threading.Event()
        self.thread = threading.Thread(target=self.loop, daemon=True, name="iphone")

    # -------------------------------------------------- الإعدادات (جدول settings)
    def _get(self, db, key, default):
        r = db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        try:
            return json.loads(r["value"]) if r and r["value"] else default
        except ValueError:
            return default

    def _set(self, db, key, value):
        db.execute("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                   (key, json.dumps(value)))
        db.commit()

    def devices(self, db) -> dict:
        return self._get(db, "iphone_devices", {})

    def save_devices(self, db, devs):
        self._set(db, "iphone_devices", devs)

    # -------------------------------------------------- الحلقة
    def start(self):
        self.thread.start()

    def loop(self):
        while True:
            self.force.wait(timeout=3)
            forced = self.force.is_set()
            self.force.clear()
            try:
                self.tick(forced)
            except Exception as exc:  # pragma: no cover
                self.progress.update(running=False, error=str(exc)[:300])

    def tick(self, forced=False):
        st = read_status()
        if st.get("state") != "mounted":
            if st.get("state") in ("none", None):
                self.last_attach = None
            return
        udid = st.get("udid")
        db = connect(self.paths.db)
        try:
            devs = self.devices(db)
            d = devs.get(udid)
            if d is None:  # هاتف جديد: يُسجَّل وينتظر أن يختار المدير صاحبه
                devs[udid] = {"name": st.get("name") or "iPhone", "user_id": None, "auto": True, "last": None}
                self.save_devices(db, devs)
                return
            if d.get("name") != st.get("name") and st.get("name"):
                d["name"] = st["name"]
                self.save_devices(db, devs)
            if not d.get("user_id"):
                return
            if not forced and (not d.get("auto") or self.last_attach == st.get("attach_id")):
                return
            user = db.execute("SELECT id, username FROM users WHERE id=?", (d["user_id"],)).fetchone()
            if not user:
                return
            self.last_attach = st.get("attach_id")
            self.sync(db, st, user, devs, udid)
        finally:
            db.close()

    def sync(self, db, st, user, devs, udid):
        src = Path(st["mount"]) / "DCIM"
        dest_base = self.paths.homes / user["username"] / "Photos" / "iPhone"
        lib = f"u:{user['id']}"
        known = {(r["name"].lower(), r["size"]) for r in db.execute("SELECT name, size FROM media WHERE library=?", (lib,))}
        self.progress.update(running=True, udid=udid, done=0, total=0, copied=0, skipped=0, error=None, finished=None,
                             user=user["username"])
        files = []
        for root, _dirs, names in os.walk(src):
            for n in names:
                if Path(n).suffix.lower() in COPY_EXT:
                    files.append(Path(root) / n)
        self.progress["total"] = len(files)
        for f in sorted(files):
            try:
                stt = f.stat()
                if (f.name.lower(), stt.st_size) in known:
                    self.progress["skipped"] += 1
                else:
                    month = datetime.fromtimestamp(stt.st_mtime).strftime("%Y-%m")
                    folder = dest_base / month
                    folder.mkdir(parents=True, exist_ok=True)
                    target = folder / f.name
                    if target.exists() and target.stat().st_size == stt.st_size:
                        self.progress["skipped"] += 1
                    else:
                        target = unique_path(target)
                        tmp = target.with_name(target.name + ".part")
                        shutil.copyfile(f, tmp)
                        os.utime(tmp, (stt.st_mtime, stt.st_mtime))
                        tmp.replace(target)
                        known.add((f.name.lower(), stt.st_size))
                        self.progress["copied"] += 1
            except OSError as exc:
                if not read_status().get("state") == "mounted":
                    self.progress.update(running=False, error="انفصل الهاتف أثناء النسخ")
                    break
                self.progress["error"] = str(exc)[:200]
            self.progress["done"] += 1
        self.progress.update(running=False, finished=time.time())
        devs[udid]["last"] = {"at": datetime.now().isoformat(timespec="minutes"), "copied": self.progress["copied"],
                              "total": self.progress["total"]}
        self.save_devices(db, devs)
        if self.progress["copied"]:
            self.indexer.enqueue(lib)
        db.execute("INSERT INTO logs(ts, username, action, detail, ip) VALUES(?,?,?,?,?)",
                   (datetime.now().isoformat(timespec="seconds"), user["username"], "نسخ صور الآيفون بالكابل",
                    f"{self.progress['copied']} جديدة من {self.progress['total']}", "usb"))
        db.commit()


def engine() -> IphoneSync:
    return current_app.extensions["nas_iphone"]


@bp.get("/api/admin/iphone")
@admin_required
def api_iphone():
    from .core import get_db
    db = get_db()
    e = engine()
    users = [{"id": u["id"], "name": u["username"]} for u in db.execute("SELECT id, username FROM users WHERE disabled=0 ORDER BY id")]
    return jsonify(installed=bool(shutil.which("ifuse")), appliance=os.environ.get("HOMENAS_APPLIANCE") == "1",
                   status=read_status(), devices=e.devices(db), progress=e.progress, users=users)


@bp.post("/api/admin/iphone/device")
@admin_required
def api_iphone_device():
    from .core import get_db
    d = body()
    db = get_db()
    e = engine()
    devs = e.devices(db)
    udid = str(d.get("udid") or "")
    if udid not in devs:
        abort(404)
    if "user_id" in d:
        devs[udid]["user_id"] = int(d["user_id"]) if d["user_id"] else None
    if "auto" in d:
        devs[udid]["auto"] = bool(d["auto"])
    if d.get("forget"):
        devs.pop(udid)
    e.save_devices(db, devs)
    e.force.set()
    log_action("إعداد الآيفون بالكابل", udid[:8])
    return jsonify(ok=True)


@bp.post("/api/admin/iphone/sync")
@admin_required
def api_iphone_sync():
    e = engine()
    if e.progress.get("running"):
        abort(409, "النسخ يعمل الآن")
    e.last_attach = None
    e.force.set()
    return jsonify(ok=True)


@bp.post("/api/admin/iphone/install")
@admin_required
def api_iphone_install():
    if not os.path.exists(HELPER):
        abort(400, "متاح على جهاز H.SEF المخصص فقط")
    r = subprocess.run(["sudo", "-n", HELPER, "iphone-install"], capture_output=True, text=True, timeout=1800)
    if r.returncode != 0:
        abort(400, (r.stderr or r.stdout).strip()[-300:])
    return jsonify(ok=True)
