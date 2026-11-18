"""النسخ الاحتياطي إلى قرص خارجي (أو أي مجلد).

- كل نسخة مجلد مستقل باسم التاريخ: H.SEF-Backup/2026-11-09_0300/homes/... ملفات عادية يمكن فتحها مباشرة.
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
ROOT_NAME = "H.SEF-Backup"
DEFAULT_APPLIANCE_TARGET = "/srv/homenas/backup"
SKIP_DIRS = {RECYCLE, "@system", ".cache"}
# البند 20: ماذا يُنسخ، وكم مرة
WHAT = {"full": "كامل: الإعدادات مع الملفات والصور", "files": "الملفات والصور فقط", "settings": "إعدادات النظام فقط"}
FREQ = {"daily": "كل يوم", "weekly": "كل أسبوع (الجمعة)", "monthly": "كل شهر (يوم 1)"}
WEEKDAY = 4          # الجمعة
SKIP_SYSTEM_FILES = {"cache", "tmp", "nas.db", "nas.db-wal", "nas.db-shm", "import-pending", "factory-reset.json"}


def is_due(s: dict, now: datetime) -> bool:
    """هل حان وقت النسخ المجدول؟"""
    if not s["enabled"] or now.hour != s["hour"]:
        return False
    if (s["last"] or {}).get("started", "")[:10] == now.strftime("%Y-%m-%d"):
        return False
    if s["freq"] == "weekly":
        return now.weekday() == WEEKDAY
    if s["freq"] == "monthly":
        return now.day == 1
    return True


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
            "usb_uuid": g("backup_usb_uuid", ""),
            "what": g("backup_what", "full") if g("backup_what", "full") in WHAT else "full",
            "freq": g("backup_freq", "daily") if g("backup_freq", "daily") in FREQ else "daily",
            "usb_label": g("backup_usb_label", ""),
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
                if is_due(s, now):
                    if s["usb_uuid"]:
                        db = connect(self.paths.db)
                        s["target"] = usb_target(db) or s["target"]
                        db.close()
                    if backup_root(s["target"]):
                        self.run()
                    else:
                        self.save_result({"ok": False, "started": now_iso(), "finished": now_iso(),
                                          "error": "قرص النسخ الاحتياطي غير موصول"})
            except Exception as exc:  # pragma: no cover
                print(f"[backup] scheduler: {exc}")

    def run_async(self, what: str | None = None) -> bool:
        if self.status["running"]:
            return False
        threading.Thread(target=self.run, args=(what,), daemon=True, name="backup").start()
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

    def run(self, what: str | None = None):
        if not self.lock.acquire(blocking=False):
            return
        st = self.status
        st.update(running=True, files=0, copied=0, linked=0, bytes=0, errors=0, current="", started=now_iso())
        result = {"ok": False, "started": st["started"]}
        try:
            db = connect(self.paths.db)
            s = self.settings(db)
            what = what if what in WHAT else s["what"]
            sources = self.sources(db) if what in ("full", "files") else []
            # تسجيلات الكاميرات (المجلد المشترك «الكاميرات») لا تُنسخ: كبيرة وتتجدد وحدها
            row = db.execute("SELECT path FROM folders WHERE name='الكاميرات'").fetchone()
            self.skip = {str(Path(row["path"]).resolve())} if row else set()
            sources = [(lab, src) for lab, src in sources if str(Path(src).resolve()) not in self.skip]
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
            if what in ("full", "settings"):
                st["current"] = "الإعدادات"
                self.copy_database(dest / "@system")
                self.copy_system(dest / "@system")
            self.write_manifest(dest, what)

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
            result.update(ok=st["errors"] == 0 or st["errors"] < max(1, st["files"]) * 0.01, snapshot=name, what=what,
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
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")
                           and str((Path(dirpath) / d).resolve()) not in getattr(self, "skip", ())]
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

    def copy_system(self, dst: Path):
        """ملفات الإعدادات (الأذان، الخلفيات، المواقيت…) بجانب قاعدة البيانات."""
        out = dst / "system"
        shutil.rmtree(out, ignore_errors=True)
        out.mkdir(parents=True, exist_ok=True)
        for x in sorted(self.paths.system.iterdir()):
            if x.name in SKIP_SYSTEM_FILES or ".before-" in x.name or x.is_symlink():
                continue
            try:
                if x.is_dir():
                    shutil.copytree(x, out / x.name, symlinks=False)
                else:
                    shutil.copy2(x, out / x.name)
            except OSError:
                self.status["errors"] += 1

    def write_manifest(self, dest: Path, what: str):
        from . import __version__
        try:
            db = connect(self.paths.db)
            row = db.execute("SELECT value FROM settings WHERE key='server_name'").fetchone()
            db.close()
            name = row["value"] if row else "HOME ANAB"
        except Exception:  # noqa: BLE001
            name = ""
        (dest / "@system").mkdir(parents=True, exist_ok=True)
        (dest / "@system" / "manifest.json").write_text(json.dumps(
            {"what": what, "version": __version__, "created": now_iso(), "server_name": name, "data_dir": str(self.paths.data)},
            ensure_ascii=False))

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
# v1.9.8 (البند 17): قرص USB كوجهة. يُعرف بمعرّف القرص (UUID)، لأن اسمه في النظام (sdb1، sdc1…) يتغير
# عند كل توصيل. قبل كل نسخ (يدوي أو مجدول) نفتحه ونحدّث المسار.
# ==========================================================================
USB_DIR = "HOME-ANAB-Backup"


def _cards(force=True) -> list:
    try:
        from .media_cards import cards
        return cards(force=force)
    except Exception:  # noqa: BLE001
        return []


def _set(db, key, value):
    if value is None:
        db.execute("DELETE FROM settings WHERE key=?", (key,))
    else:
        db.execute("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                   (key, str(value)))
    db.commit()


def _prepare(dev: str) -> dict | None:
    from .sysadmin import helper
    try:
        return helper("backup-usb", dev, timeout=90, as_json=True)
    except Exception:  # noqa: BLE001
        return None


def usb_target(db) -> str | None:
    """قرص USB المختار: موصول؟ نفتحه ونعيد مسار النسخ عليه (ونحدّثه في الإعدادات)، وإلا None."""
    row = db.execute("SELECT value FROM settings WHERE key='backup_usb_uuid'").fetchone()
    uuid = row["value"] if row else ""
    if not uuid:
        return None
    c = next((x for x in _cards() if x.get("uuid") == uuid), None)
    if not c:
        return None
    if c.get("mount") and (Path(c["mount"]) / USB_DIR / MARKER).is_file():
        path = str(Path(c["mount"]) / USB_DIR)
    else:
        r = _prepare(c["dev"])
        if not r:
            return None
        path = r["path"]
    _set(db, "backup_target", path)
    return path


def targets(db) -> list[dict]:
    s = backup_engine().settings(db)
    out = []
    if Path(DEFAULT_APPLIANCE_TARGET).is_dir():
        info = target_info(DEFAULT_APPLIANCE_TARGET)
        out.append({"kind": "internal", "title": "قرص النسخ الاحتياطي الداخلي", "path": DEFAULT_APPLIANCE_TARGET,
                    "free": info["free"], "total": info["total"], "current": s["target"] == DEFAULT_APPLIANCE_TARGET and not s["usb_uuid"]})
    for c in _cards():
        if not c.get("uuid"):
            continue
        free = None
        if c.get("mount"):
            try:
                free = shutil.disk_usage(c["mount"]).free
            except OSError:
                pass
        out.append({"kind": "usb", "dev": c["dev"], "uuid": c["uuid"], "title": c.get("title") or c["dev"],
                    "label": c.get("label", ""), "model": c.get("model", ""), "size": c.get("size"), "free": free,
                    "fstype": c.get("fstype"), "ro": bool(c.get("ro")), "versions": c.get("fstype") == "ext4" or c.get("fstype") == "ntfs",
                    "current": c["uuid"] == s["usb_uuid"]})
    return out


@bp.get("/api/backup/targets")
@admin_required
def api_backup_targets():
    return jsonify(targets=targets(get_db()))


@bp.post("/api/backup/use")
@admin_required
def api_backup_use():
    """{kind: "usb", dev} أو {kind: "internal"}: يجعل القرص وجهة النسخ الاحتياطي ويجهّزه."""
    d = body()
    db = get_db()
    if d.get("kind") == "internal":
        p = Path(DEFAULT_APPLIANCE_TARGET)
        if not p.is_dir():
            abort(404, "لا يوجد قرص نسخ احتياطي داخلي")
        try:
            if not (p / MARKER).is_file():
                (p / MARKER).write_text("H.SEF backup destination\n")
            (p / ROOT_NAME).mkdir(exist_ok=True)
        except OSError as exc:
            abort(400, f"لا يمكن الكتابة في القرص: {exc}")
        _set(db, "backup_target", str(p))
        _set(db, "backup_usb_uuid", None)
        _set(db, "backup_usb_label", None)
        log_action("وجهة النسخ الاحتياطي", "القرص الداخلي")
        return jsonify(ok=True)
    dev = str(d.get("dev") or "")
    c = next((x for x in _cards() if x["dev"] == dev), None)
    if not c or not c.get("uuid"):
        abort(404, "القرص غير موجود. هل سُحب؟")
    if c.get("ro"):
        abort(400, "القرص للقراءة فقط (قد يكون مقفولاً، أو لم يُغلق جيداً في ويندوز)")
    r = _prepare(dev)
    if not r:
        abort(400, "تعذّر فتح القرص")
    t = Path(r["path"])
    try:
        (t / MARKER).write_text("H.SEF backup destination\n")
        (t / ROOT_NAME).mkdir(exist_ok=True)
    except OSError as exc:
        abort(400, f"لا يمكن الكتابة في القرص: {exc}")
    _set(db, "backup_target", str(t))
    _set(db, "backup_usb_uuid", c["uuid"])
    _set(db, "backup_usb_label", c.get("title") or dev)
    log_action("وجهة النسخ الاحتياطي", c.get("title") or dev)
    return jsonify(ok=True)


# ==========================================================================
# واجهة API (للمدير)
# ==========================================================================

@bp.get("/api/backup")
@admin_required
def api_backup():
    eng = backup_engine()
    s = eng.settings(get_db())
    if s["usb_uuid"] and not eng.status["running"]:
        s["target"] = usb_target(get_db()) or s["target"]
    if not s["target"] and Path(DEFAULT_APPLIANCE_TARGET, MARKER).is_file():
        s["target"] = DEFAULT_APPLIANCE_TARGET
    s["suggested"] = DEFAULT_APPLIANCE_TARGET if Path(DEFAULT_APPLIANCE_TARGET).exists() else ""
    return jsonify(settings=s, status=eng.status, target=target_info(s["target"]), what_choices=WHAT, freq_choices=FREQ,
                   restore=_restore_job,
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
        set_setting("backup_usb_uuid", None)
        set_setting("backup_usb_label", None)
    if "enabled" in data:
        set_setting("backup_enabled", "1" if data["enabled"] else "0")
    if "hour" in data:
        set_setting("backup_hour", str(max(0, min(23, int(data["hour"])))))
    if "keep" in data:
        set_setting("backup_keep", str(max(1, min(365, int(data["keep"])))))
    if data.get("what") in WHAT:
        set_setting("backup_what", data["what"])
    if data.get("freq") in FREQ:
        set_setting("backup_freq", data["freq"])
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
        (p / MARKER).write_text("H.SEF backup destination\n")
        (p / ROOT_NAME).mkdir(exist_ok=True)
    except OSError as exc:
        abort(400, f"لا يمكن الكتابة في هذا المجلد: {exc}")
    log_action("تجهيز قرص النسخ الاحتياطي", target)
    return jsonify(ok=True)


@bp.post("/api/backup/run")
@admin_required
def api_backup_run():
    target = get_setting("backup_target")
    if get_setting("backup_usb_uuid") and not backup_engine().status["running"]:
        target = usb_target(get_db()) or target
    if not backup_root(target):
        abort(400, "قرص النسخ الاحتياطي غير موصول أو غير مُهيأ")
    what = body().get("what")
    if not backup_engine().run_async(what if what in WHAT else None):
        abort(409, "النسخ الاحتياطي يعمل الآن")
    log_action("بدء نسخ احتياطي يدوي")
    return jsonify(ok=True)


# ==========================================================================
# البند 20: الاسترجاع من قرص النسخ الاحتياطي
# - الإعدادات: تُجهَّز كـ«استيراد» (transfer.stage_from_folder) وتُطبَّق بإعادة تشغيل البرنامج.
#   التفعيل وإعدادات عتاد هذا الجهاز تبقى كما هي.
# - الملفات والصور: تُنسخ في الخلفية ما كان ناقصاً أو مختلفاً. لا يُحذف شيء ولا يُستبدل ملف أحدث.
# ==========================================================================
_restore_job = {"running": False, "files": 0, "copied": 0, "current": "", "done": None, "error": None}


def snapshot_info(root: Path, name: str) -> dict:
    d = root / name
    man = {}
    try:
        man = json.loads((d / "@system" / "manifest.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass
    has_settings = (d / "@system" / "nas.db").is_file()
    has_files = any((d / x).is_dir() for x in ("homes", "shares")) or (d / "folders").is_dir()
    return {"name": name, "created": man.get("created"), "what": man.get("what") or ("full" if has_files and has_settings else
            "files" if has_files else "settings"), "settings": has_settings, "files": has_files,
            "version": man.get("version"), "server_name": man.get("server_name")}


def _snap_dir(name: str) -> Path:
    root = backup_root(get_setting("backup_target"))
    if not root:
        abort(400, "قرص النسخ الاحتياطي غير موصول")
    if not (name == "mirror" or (name[:4].isdigit() and "/" not in name and ".." not in name)):
        abort(400)
    d = root / name
    if not d.is_dir():
        abort(404, "النسخة غير موجودة")
    return d


@bp.get("/api/backup/restore")
@admin_required
def api_restore_list():
    s = backup_engine().settings(get_db())
    target = s["target"]
    if s["usb_uuid"] and not backup_engine().status["running"]:
        target = usb_target(get_db()) or target
    root = backup_root(target)
    if not root or not root.exists():
        return jsonify(connected=False, snapshots=[], job=_restore_job)
    names = list_snapshots(root) + (["mirror"] if (root / "mirror").is_dir() else [])
    return jsonify(connected=True, snapshots=[snapshot_info(root, n) for n in names], job=_restore_job)


def _restore_files(snap: Path, data_paths, folders: dict):
    job = _restore_job
    try:
        pairs = [(snap / "homes", data_paths.homes), (snap / "shares", data_paths.shares)]
        if (snap / "folders").is_dir():
            for x in (snap / "folders").iterdir():
                if x.name in folders:
                    pairs.append((x, Path(folders[x.name])))
        for src, dst in pairs:
            if not src.is_dir():
                continue
            for dirpath, dirnames, filenames in os.walk(src):
                rel = Path(dirpath).relative_to(src)
                for fn in filenames:
                    s_path, d_path = Path(dirpath) / fn, dst / rel / fn
                    job["files"] += 1
                    job["current"] = str(rel / fn)
                    try:
                        s_st = s_path.stat()
                        if d_path.exists():
                            d_st = d_path.stat()
                            if d_st.st_size == s_st.st_size or d_st.st_mtime >= s_st.st_mtime:
                                continue   # موجود، أو الموجود أحدث: لا نستبدله
                        d_path.parent.mkdir(parents=True, exist_ok=True)
                        tmp = d_path.with_name(d_path.name + ".hnpart")
                        shutil.copy2(s_path, tmp)
                        os.replace(tmp, d_path)
                        job["copied"] += 1
                    except OSError:
                        pass
    except Exception as exc:  # noqa: BLE001
        job["error"] = str(exc)
    finally:
        job.update(running=False, current="", done=now_iso())
        try:
            db = connect(data_paths.db)
            db.execute("INSERT INTO logs(ts, username, ip, action, detail) VALUES (?,?,?,?,?)",
                       (now_iso(), "النظام", None, "استرجاع الملفات من النسخة الاحتياطية", f"{job['copied']} ملف"))
            db.commit()
            db.close()
        except Exception:  # noqa: BLE001
            pass


@bp.post("/api/backup/restore")
@admin_required
def api_restore():
    """{snapshot, part: "settings" | "files"}"""
    from .core import current_user, paths
    d = body()
    snap = _snap_dir(str(d.get("snapshot") or ""))
    part = d.get("part")
    if backup_engine().status["running"] or _restore_job["running"]:
        abort(409, "انتظر حتى ينتهي النسخ أو الاسترجاع الجاري")
    if part == "files":
        info = snapshot_info(snap.parent, snap.name)
        if not info["files"]:
            abort(400, "هذه النسخة بلا ملفات")
        folders = {r["name"]: r["path"] for r in get_db().execute("SELECT name, path FROM folders")}
        _restore_job.update(running=True, files=0, copied=0, current="", done=None, error=None)
        threading.Thread(target=_restore_files, args=(snap, paths(), folders), daemon=True, name="restore").start()
        log_action("استرجاع الملفات من النسخة الاحتياطية", snap.name)
        return jsonify(ok=True, job=_restore_job)
    if part == "settings":
        if not (snap / "@system" / "nas.db").is_file():
            abort(400, "هذه النسخة بلا إعدادات")
        from . import transfer
        info = snapshot_info(snap.parent, snap.name)
        from . import __version__
        if info.get("version") and transfer._version_tuple(info["version"]) > transfer._version_tuple(__version__):
            abort(400, f"النسخة من إصدار أحدث ({info['version']}). حدّث هذا الجهاز أولاً.")
        man = {"version": info.get("version") or __version__, "created": info.get("created") or snap.name,
               "server_name": info.get("server_name") or "", "data_dir": (json.loads((snap / "@system" / "manifest.json").read_text())
                                                                         .get("data_dir") if (snap / "@system" / "manifest.json").is_file() else "")}
        transfer.stage_from_folder(snap / "@system" / "nas.db", snap / "@system" / "system", man, current_user()["username"])
        log_action("استرجاع الإعدادات من النسخة الاحتياطية", f"{snap.name}، تُطبَّق عند إعادة التشغيل")
        return jsonify(ok=True, restart=transfer.restart_soon())
    abort(400)
