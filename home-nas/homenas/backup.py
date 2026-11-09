"""النسخ الاحتياطي إلى قرص خارجي (أو أي مجلد).

- كل نسخة مجلد مستقل باسم التاريخ: HomeNAS-Backup/2026-11-09_0300/homes/... ملفات عادية يمكن فتحها مباشرة.
- الملفات غير المتغيرة تُربط (hard link) بالنسخة السابقة فلا تأخذ مساحة إضافية.
- إذا كان القرص لا يدعم الروابط (exFAT/FAT32) نستخدم "مرآة" واحدة تُحدَّث تدريجياً ولا يُحذف منها شيء.
- لا يُكتب شيء إلا إذا وُجد ملف العلامة .homenas-backup في الوجهة، حتى لا نملأ قرص النظام
  عندما يكون القرص الخارجي غير موصول.
"""
from __future__ import annotations

import json
import os
import shutil
import sqlite3
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify

from .core import RECYCLE, admin_required, body, connect, get_db, get_setting, log_action, now_iso, set_setting

bp = Blueprint("backup", __name__)

MARKER = ".homenas-backup"
ROOT_NAME = "HomeNAS-Backup"
DEFAULT_APPLIANCE_TARGET = "/srv/homenas/backup"
SKIP_DIRS = {RECYCLE, "@system", ".cache"}


def backup_root(target: str | None) -> Path | None:
    """مجلد النسخ داخل الوجهة، أو None إذا لم تكن الوجهة جاهزة/موصولة."""
    if not target:
        return None
    t = Path(target)
    try:
        if (t / MARKER).is_file():
            return t / ROOT_NAME
    except OSError:
        pass
    return None


def list_snapshots(root: Path) -> list[str]:
    try:
        return sorted((p.name for p in root.iterdir() if p.is_dir() and p.name[:4].isdigit()), reverse=True)
    except OSError:
        return []


def supports_hardlinks(root: Path) -> bool:
    a, b = root / ".linktest-a", root / ".linktest-b"
    try:
        a.write_text("x")
        os.link(a, b)
        return True
    except OSError:
        return False
    finally:
        for p in (a, b):
            try:
                p.unlink()
            except OSError:
                pass


class Backup:
    def __init__(self, data_paths):
        self.paths = data_paths
        self.lock = threading.Lock()
        self.status = {"running": False, "files": 0, "copied": 0, "linked": 0, "bytes": 0, "errors": 0,
                       "current": "", "started": None}
        self.thread = threading.Thread(target=self.scheduler, daemon=True, name="backup-scheduler")

    # ------------------------------------------------------------ الإعدادات
    def settings(self, db) -> dict:
        def g(k, d=None):
            r = db.execute("SELECT value FROM settings WHERE key=?", (k,)).fetchone()
            return r["value"] if r else d
        last = g("backup_last")
        return {
            "target": g("backup_target", ""),
            "enabled": g("backup_enabled", "0") == "1",
            "hour": int(g("backup_hour", "3")),
            "keep": int(g("backup_keep", "14")),
            "last": json.loads(last) if last else None,
            "last_success": g("backup_last_success"),
        }

    def sources(self, db) -> list[tuple[str, Path]]:
        """ما يُنسخ: مجلدات المستخدمين، المجلدات المشتركة (حتى المربوطة بأقراص أخرى)."""
        src = [("homes", self.paths.homes)]
        data = self.paths.data.resolve()
        shares_added = False
        for f in db.execute("SELECT name, path FROM folders ORDER BY name"):
            p = Path(f["path"]).resolve()
            if p.parent == self.paths.shares.resolve():
                if not shares_added:
                    src.append(("shares", self.paths.shares))
                    shares_added = True
            elif not str(p).startswith(str(data)):
                src.append((f"folders/{f['name']}", p))
        return src

    # ------------------------------------------------------------ الجدولة
    def start(self):
        self.thread.start()

    def scheduler(self):
        while True:
            time.sleep(60)
            try:
                db = connect(self.paths.db)
                s = self.settings(db)
                db.close()
                now = datetime.now()
                last_day = (s["last"] or {}).get("started", "")[:10]
                if s["enabled"] and now.hour == s["hour"] and last_day != now.strftime("%Y-%m-%d"):
                    if backup_root(s["target"]):
                        self.run()
                    else:
                        self.save_result({"ok": False, "started": now_iso(), "finished": now_iso(),
                                          "error": "قرص النسخ الاحتياطي غير موصول"})
            except Exception as exc:  # pragma: no cover
                print(f"[backup] scheduler: {exc}")

    def run_async(self) -> bool:
        if self.status["running"]:
            return False
        threading.Thread(target=self.run, daemon=True, name="backup").start()
        return True

    # ------------------------------------------------------------ التنفيذ
    def save_result(self, result: dict):
        db = connect(self.paths.db)
        try:
            db.execute("INSERT INTO settings(key,value) VALUES('backup_last',?) "
                       "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (json.dumps(result, ensure_ascii=False),))
            if result.get("ok"):
                db.execute("INSERT INTO settings(key,value) VALUES('backup_last_success',?) "
                           "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (result["finished"],))
            db.execute("INSERT INTO logs(ts, username, ip, action, detail) VALUES (?,?,?,?,?)",
                       (now_iso(), "النظام", None, "نسخ احتياطي" if result.get("ok") else "فشل النسخ الاحتياطي",
                        result.get("summary") or result.get("error") or ""))
            db.commit()
        finally:
            db.close()

    def run(self):
        if not self.lock.acquire(blocking=False):
            return
        st = self.status
        st.update(running=True, files=0, copied=0, linked=0, bytes=0, errors=0, current="", started=now_iso())
        result = {"ok": False, "started": st["started"]}
        try:
            db = connect(self.paths.db)
            s = self.settings(db)
            sources = self.sources(db)
            db.close()
            root = backup_root(s["target"])
            if root is None:
                raise RuntimeError("قرص النسخ الاحتياطي غير موصول أو غير مُهيأ")
            root.mkdir(exist_ok=True)
            hard = supports_hardlinks(root)
            if hard:
                snaps = list_snapshots(root)
                prev = root / snaps[0] if snaps else None
                name = datetime.now().strftime("%Y-%m-%d_%H%M")
                dest = root / f".partial-{name}"
                if dest.exists():
                    shutil.rmtree(dest, ignore_errors=True)
            else:
                prev, name = None, "mirror"
                dest = root / "mirror"
            dest.mkdir(parents=True, exist_ok=True)

            for label, src in sources:
                if src.exists():
                    self.copy_tree(src, dest / label, (prev / label) if prev else None, mirror=not hard)
            self.copy_database(dest / "@system")

            if hard:
                final = root / name
                if final.exists():
                    shutil.rmtree(final, ignore_errors=True)
                dest.rename(final)
                for old in list_snapshots(root)[max(1, s["keep"]):]:
                    st["current"] = f"حذف النسخة القديمة {old}"
                    shutil.rmtree(root / old, ignore_errors=True)
                for p in root.glob(".partial-*"):
                    shutil.rmtree(p, ignore_errors=True)
            summary = (f"{st['files']} ملف — {st['copied']} جديد/معدّل ({st['bytes'] / 1048576:.1f} MB)"
                       + (f"، {st['errors']} خطأ" if st["errors"] else ""))
            result.update(ok=st["errors"] == 0 or st["errors"] < st["files"] * 0.01, snapshot=name,
                          mode="snapshots" if hard else "mirror", files=st["files"], copied=st["copied"],
                          bytes=st["bytes"], errors=st["errors"], summary=summary)
        except Exception as exc:
            result.update(ok=False, error=str(exc))
        finally:
            result["finished"] = now_iso()
            st.update(running=False, current="")
            self.save_result(result)
            self.lock.release()

    def copy_tree(self, src: Path, dst: Path, prev: Path | None, mirror: bool):
        st = self.status
        for dirpath, dirnames, filenames in os.walk(src):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
            rel = Path(dirpath).relative_to(src)
            out_dir = dst / rel
            out_dir.mkdir(parents=True, exist_ok=True)
            for fn in filenames:
                if fn.startswith(".") and fn.endswith((".uploading", ".saving", ".tmp")):
                    continue
                s_path = Path(dirpath) / fn
                d_path = out_dir / fn
                st["files"] += 1
                st["current"] = str(rel / fn)
                try:
                    s_st = s_path.stat()
                    ref = d_path if mirror else (prev / rel / fn if prev else None)
                    same = False
                    if ref is not None:
                        try:
                            r_st = ref.stat()
                            same = r_st.st_size == s_st.st_size and int(r_st.st_mtime) == int(s_st.st_mtime)
                        except OSError:
                            same = False
                    if same and mirror:
                        continue
                    if same:
                        os.link(ref, d_path)
                        st["linked"] += 1
                    else:
                        tmp = d_path.with_name(d_path.name + ".hnpart")
                        shutil.copy2(s_path, tmp)
                        os.replace(tmp, d_path)
                        st["copied"] += 1
                        st["bytes"] += s_st.st_size
                except OSError:
                    st["errors"] += 1

    def copy_database(self, dst: Path):
        """نسخة متسقة من قاعدة البيانات (الألبومات، المفضلة، المستخدمون)."""
        dst.mkdir(parents=True, exist_ok=True)
        src = sqlite3.connect(self.paths.db)
        out = sqlite3.connect(dst / "nas.db")
        try:
            src.backup(out)
        finally:
            out.close()
            src.close()


def backup_engine() -> Backup:
    return current_app.extensions["nas_backup"]


def target_info(target: str) -> dict:
    info = {"connected": False, "initialized": False, "exists": False, "free": None, "total": None, "snapshots": []}
    if not target:
        return info
    t = Path(target)
    try:
        info["exists"] = t.is_dir()
        info["initialized"] = (t / MARKER).is_file()
    except OSError:
        pass
    root = backup_root(target)
    if root:
        info["connected"] = True
        try:
            du = shutil.disk_usage(t)
            info.update(free=du.free, total=du.total)
        except OSError:
            pass
        info["snapshots"] = list_snapshots(root) if root.exists() else []
        info["mirror"] = (root / "mirror").is_dir()
    return info


# ==========================================================================
# واجهة API (للمدير)
# ==========================================================================

@bp.get("/api/backup")
@admin_required
def api_backup():
    eng = backup_engine()
    s = eng.settings(get_db())
    if not s["target"] and Path(DEFAULT_APPLIANCE_TARGET, MARKER).is_file():
        s["target"] = DEFAULT_APPLIANCE_TARGET
    s["suggested"] = DEFAULT_APPLIANCE_TARGET if Path(DEFAULT_APPLIANCE_TARGET).exists() else ""
    return jsonify(settings=s, status=eng.status, target=target_info(s["target"]),
                   sources=[label for label, _ in eng.sources(get_db())])


@bp.post("/api/backup/settings")
@admin_required
def api_backup_settings():
    data = body()
    if "target" in data:
        target = (data["target"] or "").strip()
        if target:
            p = Path(target).expanduser()
            if not p.is_absolute():
                abort(400, "اكتب المسار الكامل، مثل E:\\Backup أو /srv/homenas/backup")
            data_dir = Path(current_app.extensions["nas_paths"].data).resolve()
            try:
                rp = p.resolve()
            except OSError:
                rp = p
            if rp == data_dir or data_dir in rp.parents or rp in data_dir.parents:
                abort(400, "لا يمكن وضع النسخة الاحتياطية داخل مجلد البيانات نفسه")
            target = str(p)
        set_setting("backup_target", target)
    if "enabled" in data:
        set_setting("backup_enabled", "1" if data["enabled"] else "0")
    if "hour" in data:
        set_setting("backup_hour", str(max(0, min(23, int(data["hour"])))))
    if "keep" in data:
        set_setting("backup_keep", str(max(1, min(365, int(data["keep"])))))
    log_action("تعديل إعدادات النسخ الاحتياطي")
    return jsonify(ok=True)


@bp.post("/api/backup/init")
@admin_required
def api_backup_init():
    """يجهز المجلد كوجهة نسخ احتياطي (ينشئ ملف العلامة)."""
    target = get_setting("backup_target")
    if not target:
        abort(400, "اختر مجلد الوجهة أولاً")
    p = Path(target)
    if not p.is_dir():
        abort(404, "المجلد غير موجود — هل القرص موصول؟")
    try:
        (p / MARKER).write_text("HomeNAS backup destination\n")
        (p / ROOT_NAME).mkdir(exist_ok=True)
    except OSError as exc:
        abort(400, f"لا يمكن الكتابة في هذا المجلد: {exc}")
    log_action("تجهيز قرص النسخ الاحتياطي", target)
    return jsonify(ok=True)


@bp.post("/api/backup/run")
@admin_required
def api_backup_run():
    if not backup_root(get_setting("backup_target")):
        abort(400, "قرص النسخ الاحتياطي غير موصول أو غير مُهيأ")
    if not backup_engine().run_async():
        abort(409, "النسخ الاحتياطي يعمل الآن")
    log_action("بدء نسخ احتياطي يدوي")
    return jsonify(ok=True)
