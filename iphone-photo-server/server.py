#!/usr/bin/env python3
"""
iPhone Photo Server - سيرفر محلي لحفظ صور وفيديوهات الآيفون على جهاز الكمبيوتر.

يعمل بالكامل على الشبكة المحلية (Wi-Fi) بدون إنترنت وبدون أي خدمة سحابية.
"""
from __future__ import annotations

import argparse
import getpass
import hashlib
import json
import mimetypes
import os
import secrets
import shutil
import socket
import sqlite3
import sys
import threading
import time
from datetime import datetime
from functools import wraps
from pathlib import Path

from flask import (Flask, abort, g, jsonify, redirect, render_template,
                   request, send_file, session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

try:
    from PIL import Image, ImageOps
    PIL_OK = True
except ImportError:  # pragma: no cover
    PIL_OK = False

HEIF_OK = False
if PIL_OK:
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
        HEIF_OK = True
    except ImportError:
        pass

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".gif", ".webp", ".tif", ".tiff", ".bmp", ".dng"}
VIDEO_EXT = {".mov", ".mp4", ".m4v", ".3gp", ".avi", ".mkv"}
ALLOWED_EXT = IMAGE_EXT | VIDEO_EXT
BROWSER_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

EXIF_DATETIME_ORIGINAL = 36867
EXIF_DATETIME_DIGITIZED = 36868
EXIF_DATETIME = 306
EXIF_IFD = 0x8769

THUMB_SIZE = 400
PREVIEW_SIZE = 2048

# --------------------------------------------------------------------------
# الإعدادات
# --------------------------------------------------------------------------

DEFAULT_CONFIG = {
    "port": 8080,
    "host": "0.0.0.0",
    "storage_dir": str(BASE_DIR / "storage"),
    "max_upload_gb": 8,
    "password_hash": "",
    "secret_key": "",
    "api_token": "",
}


def load_config() -> dict:
    cfg = dict(DEFAULT_CONFIG)
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, encoding="utf-8") as f:
            cfg.update(json.load(f))
    return cfg


def save_config(cfg: dict) -> None:
    tmp = CONFIG_PATH.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CONFIG_PATH)


def set_password(cfg: dict, password: str) -> None:
    cfg["password_hash"] = generate_password_hash(password)


def ensure_config(interactive: bool = True) -> dict:
    cfg = load_config()
    changed = False
    if not cfg.get("secret_key"):
        cfg["secret_key"] = secrets.token_hex(32)
        changed = True
    if not cfg.get("api_token"):
        cfg["api_token"] = secrets.token_urlsafe(24)
        changed = True
    if not cfg.get("password_hash"):
        password = None
        if interactive and sys.stdin and sys.stdin.isatty():
            print("\n=== الإعداد الأول / First-time setup ===")
            while True:
                p1 = getpass.getpass("اختر كلمة مرور للدخول (Password): ")
                p2 = getpass.getpass("أعد كتابة كلمة المرور (Repeat): ")
                if len(p1) < 4:
                    print("كلمة المرور قصيرة جداً (4 أحرف على الأقل).")
                elif p1 != p2:
                    print("كلمتا المرور غير متطابقتين، حاول مجدداً.")
                else:
                    password = p1
                    break
        else:
            password = secrets.token_urlsafe(8)
            print(f"\n[!] تم إنشاء كلمة مرور تلقائية: {password}")
            print("    يمكنك تغييرها لاحقاً بالأمر: python server.py --set-password\n")
        set_password(cfg, password)
        changed = True
    if changed:
        save_config(cfg)
    return cfg


# --------------------------------------------------------------------------
# قاعدة البيانات
# --------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS media (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    sha256        TEXT    NOT NULL UNIQUE,
    original_name TEXT    NOT NULL,
    rel_path      TEXT    NOT NULL UNIQUE,
    size          INTEGER NOT NULL,
    mime          TEXT,
    is_video      INTEGER NOT NULL DEFAULT 0,
    width         INTEGER,
    height        INTEGER,
    taken_at      TEXT    NOT NULL,
    uploaded_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_taken ON media(taken_at DESC);
"""


class Storage:
    def __init__(self, root: Path):
        self.root = root
        self.media_dir = root / "photos"
        self.thumb_dir = root / ".cache" / "thumbs"
        self.preview_dir = root / ".cache" / "previews"
        self.tmp_dir = root / ".cache" / "tmp"
        self.db_path = root / "library.db"
        for d in (self.media_dir, self.thumb_dir, self.preview_dir, self.tmp_dir):
            d.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        with self.connect() as db:
            db.executescript(SCHEMA)

    def connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.db_path, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA journal_mode=WAL")
        return db

    def abs_path(self, rel_path: str) -> Path:
        p = (self.media_dir / rel_path).resolve()
        if self.media_dir.resolve() not in p.parents:
            abort(404)
        return p


# --------------------------------------------------------------------------
# أدوات مساعدة
# --------------------------------------------------------------------------

def parse_exif_date(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, bytes):
        value = value.decode(errors="ignore")
    value = str(value).strip().strip("\x00")
    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y:%m:%d %H:%M"):
        try:
            dt = datetime.strptime(value[:19], fmt)
            if dt.year > 1970:
                return dt
        except ValueError:
            continue
    return None


def read_image_meta(path: Path) -> tuple[datetime | None, int | None, int | None]:
    """يقرأ تاريخ الالتقاط والأبعاد من الصورة (يدعم HEIC إن توفرت المكتبة)."""
    if not PIL_OK:
        return None, None, None
    try:
        with Image.open(path) as im:
            w, h = im.size
            exif = im.getexif()
            dt = None
            if exif:
                sub = exif.get_ifd(EXIF_IFD) if hasattr(exif, "get_ifd") else {}
                dt = (parse_exif_date(sub.get(EXIF_DATETIME_ORIGINAL))
                      or parse_exif_date(sub.get(EXIF_DATETIME_DIGITIZED))
                      or parse_exif_date(exif.get(EXIF_DATETIME)))
                orientation = exif.get(0x0112)
                if orientation in (5, 6, 7, 8):
                    w, h = h, w
            return dt, w, h
    except Exception:
        return None, None, None


def unique_destination(directory: Path, filename: str) -> Path:
    dest = directory / filename
    stem, ext = os.path.splitext(filename)
    n = 1
    while dest.exists():
        dest = directory / f"{stem}_{n}{ext}"
        n += 1
    return dest


def human_size(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024
    return str(n)


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


# --------------------------------------------------------------------------
# التطبيق
# --------------------------------------------------------------------------

def create_app(cfg: dict) -> Flask:
    app = Flask(__name__)
    app.secret_key = cfg["secret_key"]
    app.config["MAX_CONTENT_LENGTH"] = int(float(cfg.get("max_upload_gb", 8)) * 1024 ** 3)
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["PERMANENT_SESSION_LIFETIME"] = 60 * 60 * 24 * 90  # 90 يوماً
    app.config["CFG"] = cfg

    storage = Storage(Path(cfg["storage_dir"]).expanduser().resolve())
    app.config["STORAGE"] = storage

    # ------------------------------------------------------------------ auth
    def token_ok() -> bool:
        token = (request.headers.get("X-Token")
                 or request.args.get("token")
                 or request.form.get("token"))
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
        return bool(token) and secrets.compare_digest(token, cfg["api_token"])

    def login_required(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            if session.get("auth") or token_ok():
                return view(*args, **kwargs)
            if request.path.startswith("/api/"):
                return jsonify(error="unauthorized"), 401
            return redirect(url_for("login", next=request.path))
        return wrapper

    @app.before_request
    def open_db():
        g.db = storage.connect()

    @app.teardown_request
    def close_db(_exc):
        db = g.pop("db", None)
        if db is not None:
            db.close()

    # Simple brute-force protection
    failed: dict[str, list[float]] = {}

    @app.route("/login", methods=["GET", "POST"])
    def login():
        error = None
        if request.method == "POST":
            ip = request.remote_addr or "?"
            now = time.time()
            attempts = [t for t in failed.get(ip, []) if now - t < 300]
            if len(attempts) >= 10:
                error = "محاولات كثيرة، انتظر 5 دقائق."
            elif check_password_hash(cfg["password_hash"], request.form.get("password", "")):
                session.clear()
                session["auth"] = True
                session.permanent = True
                failed.pop(ip, None)
                nxt = request.args.get("next") or "/"
                if not nxt.startswith("/") or nxt.startswith("//"):
                    nxt = "/"
                return redirect(nxt)
            else:
                attempts.append(now)
                failed[ip] = attempts
                error = "كلمة المرور غير صحيحة"
        return render_template("login.html", error=error)

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    # ----------------------------------------------------------------- pages
    @app.route("/")
    @login_required
    def index():
        return render_template("upload.html", stats=get_stats())

    @app.route("/gallery")
    @login_required
    def gallery():
        return render_template("gallery.html", stats=get_stats())

    @app.route("/settings")
    @login_required
    def settings():
        port = cfg["port"]
        urls = [f"http://{ip}:{port}" for ip in local_ips()]
        return render_template("settings.html", stats=get_stats(), urls=urls,
                               token=cfg["api_token"], heif_ok=HEIF_OK,
                               storage_dir=str(storage.media_dir))

    @app.route("/settings/password", methods=["POST"])
    @login_required
    def change_password():
        old = request.form.get("old", "")
        new = request.form.get("new", "")
        if not check_password_hash(cfg["password_hash"], old):
            return jsonify(ok=False, error="كلمة المرور الحالية غير صحيحة"), 400
        if len(new) < 4:
            return jsonify(ok=False, error="كلمة المرور الجديدة قصيرة جداً"), 400
        set_password(cfg, new)
        save_config(cfg)
        return jsonify(ok=True)

    @app.route("/settings/token", methods=["POST"])
    @login_required
    def regenerate_token():
        cfg["api_token"] = secrets.token_urlsafe(24)
        save_config(cfg)
        return jsonify(ok=True, token=cfg["api_token"])

    # ------------------------------------------------------------------- API
    def get_stats() -> dict:
        row = g.db.execute(
            "SELECT COUNT(*) AS n, COALESCE(SUM(size),0) AS total, "
            "COALESCE(SUM(is_video),0) AS videos FROM media").fetchone()
        try:
            free = shutil.disk_usage(storage.root).free
        except OSError:
            free = 0
        return {
            "count": row["n"],
            "videos": row["videos"],
            "photos": row["n"] - row["videos"],
            "total": human_size(row["total"]),
            "free": human_size(free),
        }

    @app.route("/api/stats")
    @login_required
    def api_stats():
        return jsonify(get_stats())

    @app.route("/api/upload", methods=["POST"])
    @login_required
    def api_upload():
        files = request.files.getlist("file") or request.files.getlist("files")
        if not files:
            files = list(request.files.values())
        if not files:
            return jsonify(error="no file"), 400
        client_mtime = request.form.get("last_modified", type=float)
        results = [save_upload(f, client_mtime) for f in files]
        return jsonify(results=results)

    def save_upload(fs, client_mtime: float | None) -> dict:
        original = fs.filename or "file"
        name = secure_filename(original) or f"file_{int(time.time())}"
        ext = os.path.splitext(name)[1].lower()
        if not ext:
            guessed = mimetypes.guess_extension(fs.mimetype or "") or ""
            ext = guessed.lower()
            name += ext
        if ext not in ALLOWED_EXT:
            return {"name": original, "status": "rejected", "error": "نوع ملف غير مدعوم"}

        tmp = storage.tmp_dir / f"{secrets.token_hex(8)}{ext}"
        h = hashlib.sha256()
        size = 0
        try:
            with open(tmp, "wb") as out:
                while True:
                    chunk = fs.stream.read(1024 * 1024)
                    if not chunk:
                        break
                    h.update(chunk)
                    out.write(chunk)
                    size += len(chunk)
            digest = h.hexdigest()
            if size == 0:
                tmp.unlink(missing_ok=True)
                return {"name": original, "status": "rejected", "error": "ملف فارغ"}

            existing = g.db.execute("SELECT id FROM media WHERE sha256=?", (digest,)).fetchone()
            if existing:
                tmp.unlink(missing_ok=True)
                return {"name": original, "status": "duplicate", "id": existing["id"]}

            is_video = ext in VIDEO_EXT
            taken, w, hgt = (None, None, None) if is_video else read_image_meta(tmp)
            if taken is None and client_mtime:
                try:
                    taken = datetime.fromtimestamp(client_mtime / 1000.0)
                except (ValueError, OSError, OverflowError):
                    taken = None
            if taken is None:
                taken = datetime.now()

            with storage.lock:
                # تحقق مرة أخرى داخل القفل لتجنب التكرار عند الرفع المتوازي
                existing = g.db.execute("SELECT id FROM media WHERE sha256=?", (digest,)).fetchone()
                if existing:
                    tmp.unlink(missing_ok=True)
                    return {"name": original, "status": "duplicate", "id": existing["id"]}
                folder = storage.media_dir / f"{taken:%Y}" / f"{taken:%m}"
                folder.mkdir(parents=True, exist_ok=True)
                dest = unique_destination(folder, name)
                shutil.move(str(tmp), dest)
                ts = taken.timestamp()
                try:
                    os.utime(dest, (ts, ts))
                except OSError:
                    pass
                rel = dest.relative_to(storage.media_dir).as_posix()
                mime = mimetypes.guess_type(dest.name)[0] or fs.mimetype
                cur = g.db.execute(
                    "INSERT INTO media (sha256, original_name, rel_path, size, mime, is_video,"
                    " width, height, taken_at, uploaded_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (digest, original, rel, size, mime, int(is_video), w, hgt,
                     taken.isoformat(timespec="seconds"),
                     datetime.now().isoformat(timespec="seconds")))
                g.db.commit()
            return {"name": original, "status": "saved", "id": cur.lastrowid, "path": rel}
        except Exception as exc:  # pragma: no cover
            tmp.unlink(missing_ok=True)
            return {"name": original, "status": "error", "error": str(exc)}

    @app.route("/api/media")
    @login_required
    def api_media():
        limit = min(request.args.get("limit", 120, type=int), 500)
        offset = max(request.args.get("offset", 0, type=int), 0)
        kind = request.args.get("kind", "all")
        where = ""
        if kind == "photos":
            where = "WHERE is_video=0"
        elif kind == "videos":
            where = "WHERE is_video=1"
        rows = g.db.execute(
            f"SELECT id, original_name, rel_path, size, is_video, width, height, taken_at "
            f"FROM media {where} ORDER BY taken_at DESC, id DESC LIMIT ? OFFSET ?",
            (limit, offset)).fetchall()
        return jsonify(items=[dict(r) for r in rows], next=offset + len(rows) if len(rows) == limit else None)

    def get_row(media_id: int) -> sqlite3.Row:
        row = g.db.execute("SELECT * FROM media WHERE id=?", (media_id,)).fetchone()
        if not row:
            abort(404)
        return row

    @app.route("/thumb/<int:media_id>")
    @login_required
    def thumb(media_id: int):
        row = get_row(media_id)
        if row["is_video"] or not PIL_OK:
            return send_file(BASE_DIR / "static" / "video.svg", mimetype="image/svg+xml",
                             max_age=86400)
        cache = storage.thumb_dir / f"{media_id}.jpg"
        if not cache.exists():
            try:
                with Image.open(storage.abs_path(row["rel_path"])) as im:
                    im = ImageOps.exif_transpose(im)
                    im.thumbnail((THUMB_SIZE, THUMB_SIZE))
                    im.convert("RGB").save(cache, "JPEG", quality=80)
            except Exception:
                return send_file(BASE_DIR / "static" / "image.svg", mimetype="image/svg+xml")
        return send_file(cache, mimetype="image/jpeg", max_age=86400 * 30)

    @app.route("/view/<int:media_id>")
    @login_required
    def view(media_id: int):
        """يعرض الملف بصيغة يفهمها المتصفح (يحوّل HEIC إلى JPEG عند الحاجة)."""
        row = get_row(media_id)
        path = storage.abs_path(row["rel_path"])
        ext = path.suffix.lower()
        if row["is_video"] or ext in BROWSER_IMAGE_EXT or not PIL_OK:
            return send_file(path, conditional=True, max_age=3600)
        cache = storage.preview_dir / f"{media_id}.jpg"
        if not cache.exists():
            try:
                with Image.open(path) as im:
                    im = ImageOps.exif_transpose(im)
                    im.thumbnail((PREVIEW_SIZE, PREVIEW_SIZE))
                    im.convert("RGB").save(cache, "JPEG", quality=88)
            except Exception:
                return send_file(path, conditional=True)
        return send_file(cache, mimetype="image/jpeg", max_age=86400 * 30)

    @app.route("/download/<int:media_id>")
    @login_required
    def download(media_id: int):
        row = get_row(media_id)
        return send_file(storage.abs_path(row["rel_path"]), as_attachment=True,
                         download_name=row["original_name"], conditional=True)

    @app.route("/api/media/<int:media_id>", methods=["DELETE"])
    @login_required
    def delete_media(media_id: int):
        row = get_row(media_id)
        path = storage.abs_path(row["rel_path"])
        trash = storage.root / "trash" / row["rel_path"]
        trash.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            shutil.move(str(path), unique_destination(trash.parent, trash.name))
        for c in (storage.thumb_dir / f"{media_id}.jpg", storage.preview_dir / f"{media_id}.jpg"):
            c.unlink(missing_ok=True)
        g.db.execute("DELETE FROM media WHERE id=?", (media_id,))
        g.db.commit()
        return jsonify(ok=True)

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify(error="الملف أكبر من الحد المسموح"), 413

    return app


# --------------------------------------------------------------------------
# فهرسة ملفات موجودة مسبقاً في مجلد التخزين
# --------------------------------------------------------------------------

def rescan(cfg: dict) -> None:
    storage = Storage(Path(cfg["storage_dir"]).expanduser().resolve())
    db = storage.connect()
    known = {r[0] for r in db.execute("SELECT rel_path FROM media")}
    added = removed = 0
    for path in storage.media_dir.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in ALLOWED_EXT:
            continue
        rel = path.relative_to(storage.media_dir).as_posix()
        if rel in known:
            continue
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
        is_video = path.suffix.lower() in VIDEO_EXT
        taken, w, hgt = (None, None, None) if is_video else read_image_meta(path)
        taken = taken or datetime.fromtimestamp(path.stat().st_mtime)
        try:
            db.execute(
                "INSERT INTO media (sha256, original_name, rel_path, size, mime, is_video,"
                " width, height, taken_at, uploaded_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (h.hexdigest(), path.name, rel, path.stat().st_size,
                 mimetypes.guess_type(path.name)[0], int(is_video), w, hgt,
                 taken.isoformat(timespec="seconds"), datetime.now().isoformat(timespec="seconds")))
            added += 1
        except sqlite3.IntegrityError:
            pass  # ملف مكرر بنفس المحتوى
    for rel in known:
        if not (storage.media_dir / rel).exists():
            db.execute("DELETE FROM media WHERE rel_path=?", (rel,))
            removed += 1
    db.commit()
    db.close()
    print(f"تمت الفهرسة: أضيف {added} ملف، وحُذف {removed} سجل لملفات غير موجودة.")


# --------------------------------------------------------------------------
# التشغيل
# --------------------------------------------------------------------------

def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(description="iPhone Photo Server")
    parser.add_argument("--port", type=int, help="رقم المنفذ (افتراضي 8080)")
    parser.add_argument("--storage", help="مجلد حفظ الصور")
    parser.add_argument("--set-password", action="store_true", help="تغيير كلمة المرور")
    parser.add_argument("--rescan", action="store_true", help="فهرسة الملفات الموجودة في مجلد التخزين")
    parser.add_argument("--dev", action="store_true", help="تشغيل خادم التطوير الخاص بـ Flask")
    args = parser.parse_args()

    cfg = load_config()
    if args.port:
        cfg["port"] = args.port
    if args.storage:
        cfg["storage_dir"] = str(Path(args.storage).expanduser().resolve())
    if args.port or args.storage:
        save_config(cfg)
    if args.set_password:
        cfg["password_hash"] = ""
        save_config(cfg)
    cfg = ensure_config()

    if args.rescan:
        rescan(cfg)
        return

    app = create_app(cfg)
    port = int(cfg["port"])
    print("\n" + "=" * 60)
    print("  📷  iPhone Photo Server يعمل الآن")
    print("=" * 60)
    print("  افتح أحد هذه الروابط من متصفح Safari على الآيفون")
    print("  (يجب أن يكون الهاتف والكمبيوتر على نفس شبكة Wi-Fi):\n")
    for ip in local_ips():
        print(f"     ->  http://{ip}:{port}")
    print(f"\n  مجلد الحفظ: {app.config['STORAGE'].media_dir}")
    if not HEIF_OK:
        print("  [!] مكتبة pillow-heif غير مثبتة: صور HEIC تُحفظ لكن بدون معاينة.")
    print("  للإيقاف اضغط Ctrl+C")
    print("=" * 60 + "\n")

    if args.dev:
        app.run(host=cfg["host"], port=port, debug=False, threaded=True)
        return
    try:
        from waitress import serve
        serve(app, host=cfg["host"], port=port, threads=8,
              max_request_body_size=app.config["MAX_CONTENT_LENGTH"],
              channel_timeout=600)
    except ImportError:
        app.run(host=cfg["host"], port=port, threaded=True)


if __name__ == "__main__":
    main()
