"""المشاركة عبر الشبكة: محرك أقراص شبكة (SMB) للكمبيوتر والآيفون، وخادم وسائط للتلفاز (DLNA).

- SMB: نفس المستخدمين وكلمات المرور والصلاحيات الموجودة في الواجهة.
  كلمة مرور SMB تُضبط عند إدخال كلمة المرور (الإعداد، التغيير، إنشاء مستخدم)، لأن Samba
  يحتاج صيغة مختلفة لا يمكن اشتقاقها من التشفير المخزّن.
- التلفاز: مكتبة خاصة (روابط) تحتوي فقط ما اختاره المدير، بدون سلة المحذوفات،
  مع تحويل صور HEIC إلى JPEG لأن أغلب أجهزة التلفاز لا تعرضها.
- التطبيق لا يملك صلاحيات root؛ يكتب network.json ويطلب من hsef-net تطبيقه.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import threading
import time
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify
from werkzeug.security import check_password_hash

from .core import (BROWSER_IMAGE_EXT, CONFIG_PATH, IMAGE_EXT, RECYCLE, VIDEO_EXT, admin_required, body, connect,
                   current_user, get_db, get_setting, log_action, login_required, make_thumb, set_setting)

bp = Blueprint("network", __name__)

HELPER = "/usr/local/sbin/hsef-net"
APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"
AUDIO_EXT = {".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".opus"}
TV_EXT = IMAGE_EXT | VIDEO_EXT | AUDIO_EXT


def helper_available() -> bool:
    return APPLIANCE and os.path.exists(HELPER)


def run_helper(*args, stdin: str | None = None) -> tuple[bool, str]:
    if not helper_available():
        return False, "not available"
    try:
        r = subprocess.run(["sudo", "-n", HELPER, *args], input=stdin, text=True, capture_output=True, timeout=120)
        return r.returncode == 0, (r.stdout or r.stderr).strip()
    except Exception as exc:  # pragma: no cover
        return False, str(exc)


class Network:
    def __init__(self, data_paths):
        self.paths = data_paths
        self.tv_root = data_paths.system / "tv"
        self.event = threading.Event()
        self.need_apply = False
        self.need_tv = False
        self.status = {"tv_running": False, "tv_items": 0, "tv_last": None, "apply_error": None}
        self.thread = threading.Thread(target=self.loop, daemon=True, name="network")

    def start(self):
        self.request(apply=True, tv=True)
        self.thread.start()

    def request(self, apply=False, tv=False):
        """طلب إعادة تطبيق الإعدادات / إعادة بناء مكتبة التلفاز (يُنفذ في الخلفية)."""
        self.need_apply |= apply
        self.need_tv |= tv
        self.event.set()

    def loop(self):
        while True:
            fired = self.event.wait(timeout=900)
            self.event.clear()
            time.sleep(1.5)  # تجميع عدة تغييرات متتالية في عملية واحدة
            try:
                if self.need_apply:
                    self.need_apply = False
                    self.apply()
                if self.need_tv or not fired:
                    self.need_tv = False
                    self.build_tv()
            except Exception as exc:  # pragma: no cover
                print(f"[network] {exc}")

    # ------------------------------------------------------------ الإعدادات
    def settings(self, db) -> dict:
        def g(k, d=None):
            r = db.execute("SELECT value FROM settings WHERE key=?", (k,)).fetchone()
            return r["value"] if r else d
        return {
            "smb_enabled": g("smb_enabled", "0") == "1",
            "dlna_enabled": g("dlna_enabled", "0") == "1",
            "dlna_folders": [int(x) for x in json.loads(g("dlna_folders", "[]") or "[]")],
            "dlna_users": [int(r["key"].split("_")[-1]) for r in
                           db.execute("SELECT key FROM settings WHERE key LIKE 'dlna_user_%' AND value='1'")],
            "server_name": g("server_name") or "H.SEF",
        }

    def build_config(self, db) -> dict:
        s = self.settings(db)
        users = [{"id": u["id"], "name": u["username"], "admin": bool(u["is_admin"])}
                 for u in db.execute("SELECT * FROM users WHERE disabled=0")]
        shares = []
        for f in db.execute("SELECT * FROM folders"):
            perms = db.execute("SELECT user_id, perm FROM folder_perms WHERE folder_id=?", (f["id"],)).fetchall()
            shares.append({"name": f["name"], "path": f["path"], "comment": f["description"],
                           "read": [p["user_id"] for p in perms if p["perm"] == "ro"],
                           "write": [p["user_id"] for p in perms if p["perm"] == "rw"]})
        return {"server_name": s["server_name"], "data_dir": str(self.paths.data),
                "smb": {"enabled": s["smb_enabled"], "users": users, "shares": shares},
                "dlna": {"enabled": s["dlna_enabled"], "dirs": [str(self.tv_root)] if s["dlna_enabled"] else []}}

    def apply(self):
        db = connect(self.paths.db)
        try:
            cfg = self.build_config(db)
        finally:
            db.close()
        target = CONFIG_PATH.parent / "network.json"
        try:
            tmp = target.with_suffix(".tmp")
            tmp.write_text(json.dumps(cfg, ensure_ascii=False, indent=1))
            os.replace(tmp, target)
        except OSError as exc:
            self.status["apply_error"] = str(exc)
            return
        ok, out = run_helper("apply")
        self.status["apply_error"] = None if ok or not helper_available() else out

    # ------------------------------------------------------------ مكتبة التلفاز
    def tv_preview(self, src: Path, sha: str | None) -> Path | None:
        """نسخة JPEG للتلفاز (نفس ذاكرة معاينات الواجهة)."""
        if sha:
            cache = self.paths.cache / "previews" / sha[:2] / f"{sha}.jpg"
        else:
            st = src.stat()
            key = hashlib.sha1(f"{src}|{st.st_size}|{st.st_mtime}|True".encode()).hexdigest()
            cache = self.paths.cache / "fpreview" / key[:2] / f"{key}.jpg"
        if cache.exists() or make_thumb(src, cache, 1920):
            return cache
        return None

    def build_tv(self):
        db = connect(self.paths.db)
        try:
            s = self.settings(db)
            if not s["dlna_enabled"]:
                if self.tv_root.exists():
                    shutil.rmtree(self.tv_root, ignore_errors=True)
                self.status["tv_items"] = 0
                return
            self.status["tv_running"] = True
            wanted: dict[Path, Path] = {}

            # صور المستخدمين الذين وافقوا على عرض صورهم على التلفاز
            for uid in s["dlna_users"]:
                u = db.execute("SELECT username FROM users WHERE id=? AND disabled=0", (uid,)).fetchone()
                if not u:
                    continue
                base = self.paths.homes / u["username"] / "Photos"
                label = f"Photos - {u['username']}"
                for r in db.execute("SELECT rel_path, sha256, is_video, name, taken_at FROM media WHERE library=?",
                                    (f"u:{uid}",)):
                    src = base / r["rel_path"]
                    folder = self.tv_root / label / r["taken_at"][:4] / r["taken_at"][5:7]
                    self._want(wanted, src, folder, r["sha256"])

            # المجلدات المشتركة المختارة (أفلام، موسيقى، صور العائلة…)
            for fid in s["dlna_folders"]:
                f = db.execute("SELECT name, path FROM folders WHERE id=?", (fid,)).fetchone()
                if not f:
                    continue
                root = Path(f["path"])
                for dirpath, dirnames, filenames in os.walk(root):
                    dirnames[:] = [d for d in dirnames if d != RECYCLE and not d.startswith((".", "@"))]
                    rel = Path(dirpath).relative_to(root)
                    for fn in filenames:
                        if not fn.startswith(".") and Path(fn).suffix.lower() in TV_EXT:
                            self._want(wanted, Path(dirpath) / fn, self.tv_root / f["name"] / rel, None)
        finally:
            db.close()

        # تطبيق التغييرات على شجرة الروابط
        self.tv_root.mkdir(parents=True, exist_ok=True)
        for dirpath, dirnames, filenames in os.walk(self.tv_root, topdown=False):
            for fn in filenames:
                p = Path(dirpath) / fn
                if p not in wanted or not p.is_symlink() or os.readlink(p) != str(wanted[p]):
                    p.unlink(missing_ok=True)
            if dirpath != str(self.tv_root) and not os.listdir(dirpath):
                os.rmdir(dirpath)
        for link, target in wanted.items():
            if not link.is_symlink():
                link.parent.mkdir(parents=True, exist_ok=True)
                try:
                    link.symlink_to(target)
                except OSError:
                    pass
        self.status.update(tv_running=False, tv_items=len(wanted), tv_last=time.strftime("%Y-%m-%dT%H:%M:%S"))

    def _want(self, wanted: dict, src: Path, folder: Path, sha: str | None):
        ext = src.suffix.lower()
        try:
            if ext in IMAGE_EXT and ext not in BROWSER_IMAGE_EXT:
                prev = self.tv_preview(src, sha)  # HEIC وغيرها → JPEG
                if prev:
                    wanted[folder / f"{src.stem}.jpg"] = prev
            elif src.exists():
                wanted[folder / src.name] = src
        except OSError:
            pass

    # ------------------------------------------------------------ كلمات مرور SMB
    def set_password(self, uid: int, username: str, password: str) -> bool:
        ok, _ = run_helper("passwd", str(uid), username, stdin=password + "\n")
        if ok:
            db = connect(self.paths.db)
            db.execute("INSERT INTO settings(key,value) VALUES(?, '1') ON CONFLICT(key) DO UPDATE SET value='1'",
                       (f"smb_pw_{uid}",))
            db.commit()
            db.close()
        return ok

    def delete_user(self, uid: int):
        run_helper("deluser", str(uid))


def net() -> Network:
    return current_app.extensions["nas_net"]


# ----------------------------------------------------------------------------- واجهة API

def server_names() -> dict:
    import socket
    from .system import local_ips
    host = socket.gethostname()
    return {"host": host, "ips": local_ips()}


@bp.get("/api/network")
@login_required
def api_network():
    user = current_user()
    db = get_db()
    s = net().settings(db)
    out = {
        "available": helper_available(),
        "smb_enabled": s["smb_enabled"],
        "dlna_enabled": s["dlna_enabled"],
        "me": {"smb_ready": get_setting(f"smb_pw_{user['id']}") == "1",
               "tv_photos": user["id"] in s["dlna_users"]},
        **server_names(),
    }
    if user["is_admin"]:
        out["dlna_folders"] = s["dlna_folders"]
        out["folders"] = [{"id": f["id"], "name": f["name"]} for f in db.execute("SELECT id, name FROM folders ORDER BY name")]
        out["tv"] = net().status
        out["users_smb"] = [{"id": u["id"], "username": u["username"], "ready": get_setting(f"smb_pw_{u['id']}") == "1",
                             "tv_photos": u["id"] in s["dlna_users"]} for u in db.execute("SELECT * FROM users ORDER BY username")]
        if helper_available():
            ok, outp = run_helper("status")
            try:
                out["services"] = json.loads(outp) if ok else None
            except ValueError:
                out["services"] = None
    return jsonify(out)


@bp.post("/api/admin/network")
@admin_required
def api_network_save():
    data = body()
    if not helper_available():
        abort(400, "هذه الميزة متاحة على جهاز H.SEF المخصص فقط")
    if "smb_enabled" in data:
        set_setting("smb_enabled", "1" if data["smb_enabled"] else "0")
    if "dlna_enabled" in data:
        set_setting("dlna_enabled", "1" if data["dlna_enabled"] else "0")
    if "dlna_folders" in data:
        ids = [int(x) for x in data["dlna_folders"] if str(x).isdigit()]
        set_setting("dlna_folders", json.dumps(ids))
    net().request(apply=True, tv=True)
    log_action("تعديل إعدادات المشاركة عبر الشبكة")
    return jsonify(ok=True)


@bp.post("/api/me/smb")
@login_required
def api_me_smb():
    """تفعيل الوصول عبر SMB لحساب موجود: يحتاج كلمة المرور الحالية مرة واحدة."""
    user = current_user()
    pw = body().get("password", "")
    if not check_password_hash(user["password_hash"], pw):
        abort(400, "كلمة المرور غير صحيحة")
    if not net().set_password(user["id"], user["username"], pw):
        abort(500, "تعذر تفعيل الوصول عبر الشبكة")
    net().request(apply=True)
    log_action("تفعيل الوصول عبر الشبكة (SMB)")
    return jsonify(ok=True)


@bp.post("/api/me/tv")
@login_required
def api_me_tv():
    user = current_user()
    set_setting(f"dlna_user_{user['id']}", "1" if body().get("enabled") else None)
    net().request(tv=True)
    return jsonify(ok=True)


# ----------------------------------------------------------------------------- خطافات من باقي النظام

def on_password(user_id: int, username: str, password: str):
    """يُستدعى عند معرفة كلمة المرور (إعداد، تغيير، إنشاء مستخدم) لضبط كلمة مرور SMB."""
    n = current_app.extensions.get("nas_net")
    if not n or not helper_available():
        return

    def work():
        if n.set_password(user_id, username, password):
            n.request(apply=True)
    threading.Thread(target=work, daemon=True).start()


def on_change(tv: bool = False):
    n = current_app.extensions.get("nas_net")
    if n:
        n.request(apply=True, tv=tv)


def on_user_deleted(user_id: int):
    n = current_app.extensions.get("nas_net")
    if n:
        n.delete_user(user_id)
        n.request(apply=True, tv=True)
