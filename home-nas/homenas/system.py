"""تسجيل الدخول، الحساب الشخصي، لوحة التحكم (المستخدمون والمجلدات والإعدادات والسجلات)، ومراقب النظام."""
from __future__ import annotations

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

from .core import (FFMPEG, HEIF_OK, admin_required, body, current_user, get_db, get_setting, home_dir,
                   human_size, log_action, login_required, now_iso, paths, set_setting)
from .photos import indexer

try:
    import psutil
except ImportError:  # pragma: no cover
    psutil = None

bp = Blueprint("auth", __name__)
STARTED = time.time()
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{2,32}$")
RESERVED_NAMES = {"home", "homes", "@system", "#recycle"}


def server_name() -> str:
    return get_setting("server_name") or "HomeNAS"


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
    if not is_local_request():
        return render_template("setup.html", remote=True, server_name="HomeNAS"), 403
    error = None
    if request.method == "POST":
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
            return redirect("/")
    return render_template("setup.html", remote=False, error=error, server_name="HomeNAS")


@bp.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))


@bp.get("/")
@login_required
def desktop():
    user = current_user()
    return render_template("desktop.html", server_name=server_name(),
                           me={"id": user["id"], "username": user["username"], "is_admin": bool(user["is_admin"])})


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
    log_action("حذف مجلد مشترك", f"{f['name']} (الملفات لم تُحذف من القرص)")
    return jsonify(ok=True)


# ==========================================================================
# الإعدادات العامة والسجلات
# ==========================================================================

@bp.get("/api/admin/settings")
@admin_required
def api_settings():
    cfg = current_app.config["NAS_CFG"]
    return jsonify(server_name=server_name(), photo_shared_folder=get_setting("photo_shared_folder"),
                   port=cfg["port"], data_dir=str(paths().data), heif=HEIF_OK, ffmpeg=bool(FFMPEG),
                   psutil=psutil is not None)


@bp.post("/api/admin/settings")
@admin_required
def api_settings_save():
    data = body()
    if "server_name" in data:
        set_setting("server_name", (data["server_name"] or "HomeNAS").strip()[:40])
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
    out = {
        "server_name": server_name(),
        "hostname": socket.gethostname(),
        "os": f"{platform.system()} {platform.release()}",
        "python": platform.python_version(),
        "server_uptime": time.time() - STARTED,
        "urls": [f"http://{ip}:{cfg['port']}" for ip in local_ips()],
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
