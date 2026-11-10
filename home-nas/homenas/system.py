"""تسجيل الدخول، الحساب الشخصي، لوحة التحكم (المستخدمون والمجلدات والإعدادات والسجلات)، ومراقب النظام."""
from __future__ import annotations

import json
import os
import platform
import re
import secrets
import shutil
import socket
import time
from pathlib import Path

from flask import (Blueprint, abort, current_app, jsonify, redirect, render_template, request, session,
                   url_for)
from werkzeug.security import check_password_hash, generate_password_hash

from .core import (FFMPEG, admin_required, heic_supported, body, current_user, get_db, get_setting, home_dir,
                   human_size, log_action, login_required, now_iso, paths, set_setting, setup_code_file, SETUP_CODE)
from .network import on_change, on_password, on_user_deleted
from .photos import indexer

try:
    import psutil
except ImportError:  # pragma: no cover
    psutil = None

bp = Blueprint("auth", __name__)
STARTED = time.time()
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{2,32}$")
RESERVED_NAMES = {"home", "homes", "backup", "@system", "#recycle"}


def server_name() -> str:
    return get_setting("server_name") or "H.SEF"


def is_local_request() -> bool:
    return request.remote_addr in ("127.0.0.1", "::1", "localhost")


def user_count() -> int:
    return get_db().execute("SELECT COUNT(*) FROM users").fetchone()[0]


def start_session(user):
    session.clear()
    session["uid"] = user["id"]
    session["pwv"] = user["password_hash"][-12:]
    session.permanent = True


def check_password_strength(pw: str):
    if len(pw or "") < 6:
        abort(400, "كلمة المرور يجب أن تكون 6 أحرف على الأقل")


# ==========================================================================
# الدخول والإعداد الأول
# ==========================================================================

_failed: dict[str, list[float]] = {}
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


@bp.route("/login", methods=["GET", "POST"])
def login():
    if user_count() == 0:
        return redirect(url_for("auth.setup"))
    error = None
    if request.method == "POST":
        ip = request.remote_addr or "?"
        now = time.time()
        attempts = [t for t in _failed.get(ip, []) if now - t < 600]
        username = (request.form.get("username") or "").strip()
        user = get_db().execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        if len(attempts) >= 10:
            error = "محاولات خاطئة كثيرة. انتظر 10 دقائق."
        elif user and not user["disabled"] and check_password_hash(user["password_hash"],
                                                                    request.form.get("password", "")):
            _failed.pop(ip, None)
            start_session(user)
            log_action("تسجيل دخول", "", user["username"])
            nxt = request.args.get("next") or "/"
            return redirect(nxt if nxt.startswith("/") and not nxt.startswith("//") else "/")
        else:
            attempts.append(now)
            _failed[ip] = attempts
            error = "اسم المستخدم أو كلمة المرور غير صحيحة"
            log_action("فشل تسجيل الدخول", username, username or "?")
    return render_template("login.html", error=error, server_name=server_name())


@bp.route("/setup", methods=["GET", "POST"])
def setup():
    if user_count() > 0:
        return redirect(url_for("auth.login"))
    code_file = setup_code_file(paths())
    need_code = not is_local_request()
    error = None
    if request.method == "POST":
        ip = request.remote_addr or "?"
        attempts = [t for t in _failed.get(ip, []) if time.time() - t < 600]
        # الرمز يظهر على الشاشة بمسافات (1 2 3 4 5 6)، ولوحة مفاتيح الهاتف العربية تكتب ١٢٣ — نقبل الشكلين
        given = re.sub(r"\D", "", (request.form.get("code") or "").translate(_DIGITS))
        if need_code and len(attempts) >= 10:
            return render_template("setup.html", need_code=True, error="محاولات خاطئة كثيرة. انتظر 10 دقائق.",
                                   server_name="H.SEF"), 429
        if need_code and not secrets.compare_digest(given, SETUP_CODE):
            _failed[ip] = attempts + [time.time()]
            return render_template("setup.html", need_code=True, error="رمز الإعداد غير صحيح",
                                   server_name="H.SEF"), 403
        username = (request.form.get("username") or "").strip()
        pw = request.form.get("password", "")
        if not USERNAME_RE.match(username) or username.lower() in RESERVED_NAMES:
            error = "اسم المستخدم: أحرف إنجليزية وأرقام فقط (2-32)"
        elif len(pw) < 6:
            error = "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
        elif pw != request.form.get("password2"):
            error = "كلمتا المرور غير متطابقتين"
        else:
            db = get_db()
            db.execute("INSERT INTO users(username, password_hash, is_admin, api_token, created_at)"
                       " VALUES (?,?,1,?,?)",
                       (username, generate_password_hash(pw), secrets.token_urlsafe(24), now_iso()))
            name = (request.form.get("server_name") or "").strip()[:40]
            if name:
                set_setting("server_name", name)
            db.commit()
            home_dir(username)
            user = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
            start_session(user)
            log_action("الإعداد الأول", "إنشاء حساب المدير", username)
            indexer().enqueue(f"u:{user['id']}")
            code_file.unlink(missing_ok=True)
            on_password(user["id"], username, pw)
            tz = (request.form.get("tz") or "").strip()
            if tz and APPLIANCE:
                set_timezone(tz)
            return redirect("/")
    return render_template("setup.html", need_code=need_code, error=error, server_name="H.SEF")


@bp.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))


@bp.get("/manifest.webmanifest")
def manifest():
    """يجعل H.SEF قابلاً للتثبيت كتطبيق (إضافة إلى الشاشة الرئيسية)."""
    name = server_name()
    data = {
        "name": name, "short_name": name, "start_url": "/", "scope": "/", "display": "standalone",
        "background_color": "#0d2547", "theme_color": "#0d2547", "dir": "auto",
        "icons": [{"src": "/static/img/icon.png", "sizes": "180x180", "type": "image/png"},
                  {"src": "/static/img/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}],
        "shortcuts": [{"name": "Photos", "url": "/?app=photos"}, {"name": "Files", "url": "/?app=files"}],
    }
    return current_app.response_class(json.dumps(data, ensure_ascii=False), mimetype="application/manifest+json")


@bp.get("/sw.js")
def service_worker():
    resp = current_app.send_static_file("js/sw.js")
    resp.headers["Service-Worker-Allowed"] = "/"
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@bp.get("/")
@login_required
def desktop():
    from .profile import look
    user = current_user()
    return render_template("desktop.html", server_name=server_name(),
                           me={"id": user["id"], "username": user["username"], "is_admin": bool(user["is_admin"]), **look(user)})


# ==========================================================================
# الحساب الشخصي
# ==========================================================================

@bp.get("/api/me")
@login_required
def api_me():
    u = current_user()
    return jsonify(id=u["id"], username=u["username"], is_admin=bool(u["is_admin"]),
                   api_token=u["api_token"], server_name=server_name())


@bp.post("/api/me/password")
@login_required
def api_me_password():
    u = current_user()
    data = body()
    if not check_password_hash(u["password_hash"], data.get("old", "")):
        abort(400, "كلمة المرور الحالية غير صحيحة")
    check_password_strength(data.get("new"))
    db = get_db()
    new_hash = generate_password_hash(data["new"])
    db.execute("UPDATE users SET password_hash=? WHERE id=?", (new_hash, u["id"]))
    db.commit()
    session["pwv"] = new_hash[-12:]
    on_password(u["id"], u["username"], data["new"])
    log_action("تغيير كلمة المرور")
    return jsonify(ok=True)


@bp.post("/api/me/token")
@login_required
def api_me_token():
    token = secrets.token_urlsafe(24)
    db = get_db()
    db.execute("UPDATE users SET api_token=? WHERE id=?", (token, current_user()["id"]))
    db.commit()
    return jsonify(ok=True, api_token=token)


# ==========================================================================
# المستخدمون (للمدير)
# ==========================================================================

@bp.get("/api/admin/users")
@admin_required
def api_users():
    rows = get_db().execute(
        "SELECT u.id, u.username, u.is_admin, u.disabled, u.created_at,"
        " (SELECT COUNT(*) FROM media m WHERE m.library='u:'||u.id) AS photos,"
        " (SELECT MAX(ts) FROM logs l WHERE l.username=u.username AND l.action='تسجيل دخول') AS last_login"
        " FROM users u ORDER BY u.username COLLATE NOCASE").fetchall()
    return jsonify([dict(r) for r in rows])


@bp.post("/api/admin/users")
@admin_required
def api_user_create():
    data = body()
    username = (data.get("username") or "").strip()
    if not USERNAME_RE.match(username) or username.lower() in RESERVED_NAMES:
        abort(400, "اسم المستخدم: أحرف إنجليزية وأرقام و . _ - فقط (2-32 حرفاً)")
    check_password_strength(data.get("password"))
    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
        abort(409, "اسم المستخدم موجود مسبقاً")
    cur = db.execute("INSERT INTO users(username, password_hash, is_admin, api_token, created_at) VALUES (?,?,?,?,?)",
                     (username, generate_password_hash(data["password"]), int(bool(data.get("is_admin"))),
                      secrets.token_urlsafe(24), now_iso()))
    for fid, perm in (data.get("perms") or {}).items():
        if perm in ("ro", "rw"):
            db.execute("INSERT OR REPLACE INTO folder_perms(folder_id, user_id, perm) VALUES (?,?,?)",
                       (int(fid), cur.lastrowid, perm))
    db.commit()
    home_dir(username)
    indexer().enqueue(f"u:{cur.lastrowid}")
    on_password(cur.lastrowid, username, data["password"])
    on_change()
    log_action("إضافة مستخدم", username)
    return jsonify(ok=True, id=cur.lastrowid)


def admin_count(db) -> int:
    return db.execute("SELECT COUNT(*) FROM users WHERE is_admin=1 AND disabled=0").fetchone()[0]


@bp.patch("/api/admin/users/<int:uid>")
@admin_required
def api_user_update(uid):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not user:
        abort(404)
    data = body()
    me = current_user()
    if "password" in data and data["password"]:
        check_password_strength(data["password"])
        db.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(data["password"]), uid))
    if "is_admin" in data:
        if uid == me["id"] and not data["is_admin"]:
            abort(400, "لا يمكنك إزالة صلاحية المدير عن نفسك")
        db.execute("UPDATE users SET is_admin=? WHERE id=?", (int(bool(data["is_admin"])), uid))
    if "disabled" in data:
        if uid == me["id"] and data["disabled"]:
            abort(400, "لا يمكنك تعطيل حسابك")
        db.execute("UPDATE users SET disabled=? WHERE id=?", (int(bool(data["disabled"])), uid))
    if "perms" in data:
        for fid, perm in (data.get("perms") or {}).items():
            if perm in ("ro", "rw"):
                db.execute("INSERT OR REPLACE INTO folder_perms(folder_id, user_id, perm) VALUES (?,?,?)",
                           (int(fid), uid, perm))
            else:
                db.execute("DELETE FROM folder_perms WHERE folder_id=? AND user_id=?", (int(fid), uid))
    if admin_count(db) == 0:
        db.rollback()
        abort(400, "يجب أن يبقى مدير واحد على الأقل")
    db.commit()
    if data.get("password"):
        on_password(uid, user["username"], data["password"])
    on_change(tv=True)
    log_action("تعديل مستخدم", user["username"])
    return jsonify(ok=True)


@bp.get("/api/admin/users/<int:uid>/perms")
@admin_required
def api_user_perms(uid):
    rows = get_db().execute("SELECT folder_id, perm FROM folder_perms WHERE user_id=?", (uid,)).fetchall()
    return jsonify({str(r["folder_id"]): r["perm"] for r in rows})


@bp.delete("/api/admin/users/<int:uid>")
@admin_required
def api_user_delete(uid):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not user:
        abort(404)
    if uid == current_user()["id"]:
        abort(400, "لا يمكنك حذف حسابك")
    db.execute("DELETE FROM media WHERE library=?", (f"u:{uid}",))
    db.execute("DELETE FROM users WHERE id=?", (uid,))
    if admin_count(db) == 0:
        db.rollback()
        abort(400, "يجب أن يبقى مدير واحد على الأقل")
    db.commit()
    if request.args.get("delete_files") == "1":
        shutil.rmtree(paths().homes / user["username"], ignore_errors=True)
    on_user_deleted(uid)
    log_action("حذف مستخدم", user["username"])
    return jsonify(ok=True)


# ==========================================================================
# المجلدات المشتركة (للمدير)
# ==========================================================================

@bp.get("/api/admin/folders")
@admin_required
def api_folders():
    db = get_db()
    out = []
    for f in db.execute("SELECT * FROM folders ORDER BY name COLLATE NOCASE"):
        d = dict(f)
        d["perms"] = {str(r["user_id"]): r["perm"] for r in
                      db.execute("SELECT user_id, perm FROM folder_perms WHERE folder_id=?", (f["id"],))}
        d["exists"] = Path(f["path"]).is_dir()
        out.append(d)
    return jsonify(out)


@bp.post("/api/admin/folders")
@admin_required
def api_folder_create():
    data = body()
    name = (data.get("name") or "").strip()
    if not name or len(name) > 64 or any(c in name for c in '/\\:*?"<>|#') or name.lower() in RESERVED_NAMES \
            or name.startswith("."):
        abort(400, "اسم المجلد غير صالح")
    custom = (data.get("path") or "").strip()
    if custom:
        path = Path(custom).expanduser()
        if not path.is_absolute():
            abort(400, "اكتب المسار الكامل، مثل D:\\Movies")
        sysdir = paths().system.resolve()
        if path.resolve() == sysdir or sysdir in path.resolve().parents:
            abort(400, "مسار غير مسموح")
    else:
        path = paths().shares / name
    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        abort(400, f"تعذر إنشاء المجلد: {exc}")
    db = get_db()
    if db.execute("SELECT 1 FROM folders WHERE name=?", (name,)).fetchone():
        abort(409, "يوجد مجلد مشترك بنفس الاسم")
    cur = db.execute("INSERT INTO folders(name, path, description, created_at) VALUES (?,?,?,?)",
                     (name, str(path.resolve()), (data.get("description") or "")[:200], now_iso()))
    for uid, perm in (data.get("perms") or {}).items():
        if perm in ("ro", "rw"):
            db.execute("INSERT INTO folder_perms(folder_id, user_id, perm) VALUES (?,?,?)",
                       (cur.lastrowid, int(uid), perm))
    db.commit()
    on_change()
    log_action("إنشاء مجلد مشترك", f"{name} ← {path}")
    return jsonify(ok=True, id=cur.lastrowid)


@bp.patch("/api/admin/folders/<int:fid>")
@admin_required
def api_folder_update(fid):
    db = get_db()
    f = db.execute("SELECT * FROM folders WHERE id=?", (fid,)).fetchone()
    if not f:
        abort(404)
    data = body()
    if "description" in data:
        db.execute("UPDATE folders SET description=? WHERE id=?", ((data["description"] or "")[:200], fid))
    if "perms" in data:
        db.execute("DELETE FROM folder_perms WHERE folder_id=?", (fid,))
        for uid, perm in (data.get("perms") or {}).items():
            if perm in ("ro", "rw"):
                db.execute("INSERT INTO folder_perms(folder_id, user_id, perm) VALUES (?,?,?)", (fid, int(uid), perm))
    db.commit()
    on_change()
    log_action("تعديل مجلد مشترك", f["name"])
    return jsonify(ok=True)


@bp.delete("/api/admin/folders/<int:fid>")
@admin_required
def api_folder_delete(fid):
    db = get_db()
    f = db.execute("SELECT * FROM folders WHERE id=?", (fid,)).fetchone()
    if not f:
        abort(404)
    db.execute("DELETE FROM folders WHERE id=?", (fid,))
    if get_setting("photo_shared_folder") == str(fid):
        db.execute("DELETE FROM settings WHERE key='photo_shared_folder'")
        db.execute("DELETE FROM media WHERE library='s'")
    db.commit()
    on_change(tv=True)
    log_action("حذف مجلد مشترك", f"{f['name']} (الملفات لم تُحذف من القرص)")
    return jsonify(ok=True)


# ==========================================================================
# الإعدادات العامة والسجلات
# ==========================================================================

@bp.get("/api/admin/settings")
@admin_required
def api_settings():
    cfg = current_app.config["NAS_CFG"]
    from . import __version__
    return jsonify(version=__version__, server_name=server_name(), photo_shared_folder=get_setting("photo_shared_folder"), appliance=APPLIANCE,
                   port=cfg["port"], data_dir=str(paths().data), heif=heic_supported(), ffmpeg=bool(FFMPEG),
                   psutil=psutil is not None)


@bp.post("/api/admin/settings")
@admin_required
def api_settings_save():
    data = body()
    if "server_name" in data:
        set_setting("server_name", (data["server_name"] or "H.SEF").strip()[:40])
        on_change()
    if "photo_shared_folder" in data:
        old = get_setting("photo_shared_folder")
        new = str(data["photo_shared_folder"] or "") or None
        if new and not get_db().execute("SELECT 1 FROM folders WHERE id=?", (new,)).fetchone():
            abort(404)
        set_setting("photo_shared_folder", new)
        if old != new:
            db = get_db()
            db.execute("DELETE FROM media WHERE library='s'")
            db.commit()
            if new:
                indexer().enqueue("s")
    log_action("تعديل الإعدادات العامة")
    return jsonify(ok=True)


@bp.get("/api/admin/logs")
@admin_required
def api_logs():
    offset = request.args.get("offset", 0, type=int)
    q = (request.args.get("q") or "").strip()
    where, args = "", []
    if q:
        where = "WHERE username LIKE ? OR action LIKE ? OR detail LIKE ? OR ip LIKE ?"
        args = [f"%{q}%"] * 4
    rows = get_db().execute(f"SELECT * FROM logs {where} ORDER BY id DESC LIMIT 100 OFFSET ?",
                            args + [offset]).fetchall()
    return jsonify([dict(r) for r in rows])


# ==========================================================================
# مراقب النظام
# ==========================================================================

def local_ips() -> list[str]:
    ips: set[str] = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    ips.discard("127.0.0.1")
    return sorted(ips) or ["127.0.0.1"]


def server_urls(port) -> list[str]:
    suffix = "" if int(port) == 80 else f":{port}"
    urls = [f"http://{ip}{suffix}" for ip in local_ips()]
    if shutil.which("avahi-daemon"):  # mDNS: يعمل على الآيفون والماك وأغلب الأجهزة
        urls.append(f"http://{socket.gethostname()}.local{suffix}")
    return urls


APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"


def list_timezones() -> list[str]:
    try:
        import zoneinfo
        return sorted(z for z in zoneinfo.available_timezones() if "/" in z and not z.startswith(("Etc/", "SystemV/", "posix/", "right/")))
    except Exception:
        return []


def current_timezone() -> str:
    try:
        link = os.readlink("/etc/localtime")
        return link.split("zoneinfo/", 1)[1]
    except (OSError, IndexError):
        return time.tzname[0]


def set_timezone(tz: str) -> bool:
    """يغيّر المنطقة الزمنية للجهاز (فقط على جهاز H.SEF المخصص)."""
    if not APPLIANCE or tz not in list_timezones():
        return False
    import subprocess
    r = subprocess.run(["sudo", "-n", "/usr/bin/timedatectl", "set-timezone", tz], capture_output=True, timeout=20)
    time.tzset()
    return r.returncode == 0


@bp.get("/api/admin/timezone")
@admin_required
def api_timezone():
    return jsonify(current=current_timezone(), zones=list_timezones(), editable=APPLIANCE)


@bp.post("/api/admin/timezone")
@admin_required
def api_timezone_set():
    tz = body().get("tz", "")
    if not set_timezone(tz):
        abort(400, "تعذر تغيير المنطقة الزمنية")
    log_action("تغيير المنطقة الزمنية", tz)
    return jsonify(ok=True)


@bp.post("/api/admin/power")
@admin_required
def api_power():
    action = body().get("action")
    if not APPLIANCE or action not in ("reboot", "poweroff"):
        abort(400, "غير متاح على هذا الجهاز")
    log_action("إعادة تشغيل الجهاز" if action == "reboot" else "إيقاف تشغيل الجهاز")
    import subprocess
    subprocess.Popen(["sudo", "-n", "/usr/bin/systemctl", action])
    return jsonify(ok=True)


@bp.get("/api/system/status")
@login_required
def api_status():
    user = current_user()
    db = get_db()
    cfg = current_app.config["NAS_CFG"]
    volumes = {}
    candidates = [("البيانات", paths().data)]
    if user["is_admin"]:
        candidates += [(f["name"], Path(f["path"])) for f in db.execute("SELECT name, path FROM folders")]
    for label, p in candidates:
        try:
            du = shutil.disk_usage(p)
        except OSError:
            continue
        key = (du.total, du.used)  # المجلدات على نفس القرص تُعرض مرة واحدة
        if key in volumes:
            volumes[key]["labels"].append(label)
            continue
        volumes[key] = {"labels": [label], "path": str(p) if user["is_admin"] else "",
                        "total": du.total, "used": du.used, "free": du.free}
    from . import __version__
    out = {
        "version": __version__,
        "server_name": server_name(),
        "hostname": socket.gethostname(),
        "os": f"{platform.system()} {platform.release()}",
        "python": platform.python_version(),
        "server_uptime": time.time() - STARTED,
        "urls": server_urls(cfg["port"]),
        "volumes": list(volumes.values()),
        "time": time.time(),
        "indexer": indexer().status,
    }
    counts = db.execute("SELECT COUNT(*) n, COALESCE(SUM(size),0) s FROM media").fetchone()
    out["media_count"], out["media_size"] = counts["n"], counts["s"]
    out["users"] = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    out["links"] = db.execute("SELECT COUNT(*) FROM links").fetchone()[0]
    if psutil:
        vm = psutil.virtual_memory()
        net = psutil.net_io_counters()
        out.update(
            cpu=psutil.cpu_percent(interval=None),
            cpu_count=psutil.cpu_count(),
            mem={"total": vm.total, "used": vm.total - vm.available, "percent": vm.percent},
            net={"sent": net.bytes_sent, "recv": net.bytes_recv},
            uptime=time.time() - psutil.boot_time(),
        )
    if user["is_admin"]:
        out["recent"] = [dict(r) for r in db.execute("SELECT * FROM logs ORDER BY id DESC LIMIT 8")]
    return jsonify(out)


# ==========================================================================
# التحديث من داخل النظام (جهاز H.SEF المخصص فقط)
# ==========================================================================

def _extras(*args, timeout=60) -> tuple[bool, str]:
    helper = "/usr/local/sbin/hsef-extras"
    if not (APPLIANCE and os.path.exists(helper)):
        return False, "not available"
    import subprocess
    try:
        r = subprocess.run(["sudo", "-n", helper, *args], capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return False, "timeout"
    return r.returncode == 0, (r.stdout if r.returncode == 0 else (r.stderr or r.stdout)).strip()


@bp.get("/api/admin/update")
@admin_required
def api_update_check():
    from . import __version__
    if not APPLIANCE:
        return jsonify(available=False, appliance=False, current=__version__)
    ok, st = _extras("update-status")
    status = json.loads(st) if ok else {}
    if status.get("running"):
        return jsonify(appliance=True, current=__version__, status=status)
    ok, out = _extras("update-check")
    if not ok:
        return jsonify(appliance=True, current=__version__, error=out, status=status)
    return jsonify(appliance=True, status=status, **json.loads(out))


@bp.post("/api/admin/update")
@admin_required
def api_update_run():
    ok, out = _extras("update-run")
    if not ok:
        abort(400, out or "error")
    log_action("تحديث النظام")
    return jsonify(ok=True)


@bp.post("/api/admin/update/upload")
@admin_required
def api_update_upload():
    """تحديث من ملف hsef-app-X.Y.tar.gz (من فلاشة على الكمبيوتر): نتحقق منه ونعيد رقم إصداره."""
    import tarfile
    f = request.files.get("pkg")
    if not f or not (f.filename or "").endswith(".tar.gz"):
        abort(400, "اختر ملف التحديث hsef-app-….tar.gz")
    dest = paths().tmp / "hsef-update.tar.gz"
    f.save(dest)
    try:
        with tarfile.open(dest) as t:
            names = {n.lstrip("./") for n in t.getnames()}
            if "appliance/install.sh" not in names or "homenas/__init__.py" not in names:
                raise ValueError
            m = t.extractfile(next(x for x in t.getmembers() if x.name.lstrip("./") == "homenas/__init__.py"))
            ver = re.search(r'__version__ = "(.+?)"', m.read().decode()).group(1)
    except Exception:
        dest.unlink(missing_ok=True)
        abort(400, "هذا ليس ملف تحديث H.SEF صالحاً")
    from . import __version__
    return jsonify(ok=True, version=ver, current=__version__, appliance=APPLIANCE)


@bp.post("/api/admin/update/apply-file")
@admin_required
def api_update_apply_file():
    dest = paths().tmp / "hsef-update.tar.gz"
    if not dest.exists():
        abort(400, "ارفع ملف التحديث أولاً")
    os.chmod(dest, 0o644)
    ok, out = _extras("update-file", str(dest))
    if not ok:
        abort(400, out or "error")
    log_action("تحديث النظام من ملف")
    return jsonify(ok=True)
