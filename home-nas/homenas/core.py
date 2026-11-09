"""الإعدادات وقاعدة البيانات والأدوات المشتركة والمصادقة."""
from __future__ import annotations

import io
import json
import os
import secrets
import shutil
import sqlite3
import subprocess
import tempfile
import threading
import time
import zipfile
from datetime import datetime
from functools import wraps
from pathlib import Path

from flask import abort, current_app, g, jsonify, redirect, request, session, url_for

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

FFMPEG = shutil.which("ffmpeg")
# بديل لصور HEIC عند عدم توفر pillow-heif: أداة heif-dec/heif-convert من Debian (libheif-examples)
HEIF_CLI = shutil.which("heif-dec") or shutil.which("heif-convert")
HEIC_EXT = {".heic", ".heif"}

APP_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(os.environ.get("HOMENAS_CONFIG") or APP_DIR / "config.json")

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".gif", ".webp", ".tif", ".tiff", ".bmp", ".dng"}
VIDEO_EXT = {".mov", ".mp4", ".m4v", ".3gp", ".avi", ".mkv", ".webm"}
MEDIA_EXT = IMAGE_EXT | VIDEO_EXT
BROWSER_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
TEXT_EXT = {".txt", ".md", ".json", ".csv", ".log", ".xml", ".yml", ".yaml", ".ini", ".cfg",
            ".conf", ".py", ".js", ".css", ".html", ".htm", ".sh", ".bat", ".sql", ".srt"}
RECYCLE = "#recycle"

# ==========================================================================
# الإعدادات
# ==========================================================================

DEFAULT_CONFIG = {
    "host": "0.0.0.0",
    "port": 8080,
    "data_dir": str(APP_DIR / "data"),
    "max_upload_gb": 20,
    "secret_key": "",
}


def load_config() -> dict:
    cfg = dict(DEFAULT_CONFIG)
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, encoding="utf-8") as f:
            cfg.update(json.load(f))
    if not cfg["secret_key"]:
        cfg["secret_key"] = secrets.token_hex(32)
        save_config(cfg)
    return cfg


def save_config(cfg: dict) -> None:
    tmp = CONFIG_PATH.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CONFIG_PATH)


class Paths:
    def __init__(self, data_dir: str):
        self.data = Path(data_dir).expanduser().resolve()
        self.homes = self.data / "homes"
        self.shares = self.data / "shares"
        self.system = self.data / "@system"
        self.cache = self.system / "cache"
        self.tmp = self.system / "tmp"
        self.db = self.system / "nas.db"
        for d in (self.homes, self.shares, self.cache, self.tmp):
            d.mkdir(parents=True, exist_ok=True)


def setup_code_file(p: Paths) -> Path:
    return p.system / "setup_code"


# رمز ثابت لإنشاء حساب المدير أول مرة من الهاتف أو الكمبيوتر (لا يحتاج النظر إلى شاشة السيرفر)
SETUP_CODE = "0554609954"


def ensure_setup_code(p: Paths) -> str:
    """رمز الإعداد الأول: ثابت دائماً، ويُكتب في الملف أيضاً لمن يبحث عنه على الجهاز."""
    f = setup_code_file(p)
    if not f.exists() or f.read_text().strip() != SETUP_CODE:
        f.write_text(SETUP_CODE)
    return SETUP_CODE


def paths() -> Paths:
    return current_app.extensions["nas_paths"]


# ==========================================================================
# قاعدة البيانات
# ==========================================================================

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    disabled INTEGER NOT NULL DEFAULT 0,
    api_token TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    path TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS folder_perms (
    folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    perm TEXT NOT NULL,
    PRIMARY KEY (folder_id, user_id)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY,
    library TEXT NOT NULL,
    rel_path TEXT NOT NULL,
    sha256 TEXT,
    name TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mtime REAL NOT NULL DEFAULT 0,
    is_video INTEGER NOT NULL DEFAULT 0,
    width INTEGER,
    height INTEGER,
    camera TEXT,
    taken_at TEXT NOT NULL,
    indexed_at TEXT,
    UNIQUE (library, rel_path)
);
CREATE INDEX IF NOT EXISTS idx_media_lib_taken ON media(library, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_lib_sha ON media(library, sha256);
CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, media_id)
);
CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS album_items (
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    added_at TEXT,
    PRIMARY KEY (album_id, media_id)
);
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    title TEXT,
    password_hash TEXT,
    expires_at TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS installed_apps (
    id TEXT PRIMARY KEY,
    port INTEGER NOT NULL,
    options TEXT,
    show_all INTEGER NOT NULL DEFAULT 1,
    installed_at TEXT
);
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY,
    ts TEXT NOT NULL,
    username TEXT,
    ip TEXT,
    action TEXT NOT NULL,
    detail TEXT
);
"""


def connect(db_path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(db_path, timeout=30, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    return db


def init_db(db_path: Path) -> None:
    with connect(db_path) as db:
        db.executescript(SCHEMA)


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = connect(paths().db)
    return g.db


def get_setting(key: str, default=None):
    row = get_db().execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(key: str, value) -> None:
    db = get_db()
    if value is None:
        db.execute("DELETE FROM settings WHERE key=?", (key,))
    else:
        db.execute("INSERT INTO settings(key,value) VALUES(?,?) "
                   "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, str(value)))
    db.commit()


# ==========================================================================
# أدوات
# ==========================================================================

def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def human_size(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{int(n)} B" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return str(n)


INVALID_NAME_CHARS = set('/\\:*?"<>|\0')


def clean_name(name: str) -> str:
    """يتحقق من اسم ملف/مجلد (يسمح بالعربية) ويرفض الأسماء الخطرة."""
    name = (name or "").strip().replace("\r", "").replace("\n", "")
    if not name or name in (".", "..") or any(c in INVALID_NAME_CHARS for c in name) or len(name) > 255:
        abort(400, "اسم غير صالح")
    return name


def unique_path(dest: Path) -> Path:
    if not dest.exists():
        return dest
    stem, ext = dest.stem, dest.suffix
    if dest.is_dir():
        stem, ext = dest.name, ""
    n = 1
    while True:
        cand = dest.with_name(f"{stem} ({n}){ext}")
        if not cand.exists():
            return cand
        n += 1


def is_within(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def parse_exif_date(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, bytes):
        value = value.decode(errors="ignore")
    value = str(value).strip().strip("\x00")
    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(value[:19], fmt)
            if dt.year > 1970:
                return dt
        except ValueError:
            continue
    return None


class open_image:
    """يفتح صورة بـ Pillow، مع تحويل HEIC إلى JPEG مؤقت عند عدم توفر pillow-heif."""

    def __init__(self, path: Path):
        self.path, self.tmp, self.im = Path(path), None, None

    def __enter__(self):
        src = self.path
        if src.suffix.lower() in HEIC_EXT and not HEIF_OK and HEIF_CLI:
            self.tmp = Path(tempfile.gettempdir()) / f"hsef-{secrets.token_hex(6)}.jpg"
            subprocess.run([HEIF_CLI, "-q", "92", str(src), str(self.tmp)], capture_output=True, timeout=120,
                           stdin=subprocess.DEVNULL, check=True)
            src = self.tmp
        self.im = Image.open(src)
        return self.im

    def __exit__(self, *exc):
        if self.im is not None:
            self.im.close()
        if self.tmp is not None:
            self.tmp.unlink(missing_ok=True)
        return False


def heic_supported() -> bool:
    return HEIF_OK or bool(HEIF_CLI)


def image_meta(path: Path) -> dict:
    """تاريخ الالتقاط والأبعاد والكاميرا من بيانات EXIF."""
    meta = {"taken": None, "width": None, "height": None, "camera": None}
    if not PIL_OK:
        return meta
    try:
        with open_image(path) as im:
            w, h = im.size
            exif = im.getexif()
            if exif:
                sub = exif.get_ifd(0x8769)
                meta["taken"] = (parse_exif_date(sub.get(36867)) or parse_exif_date(sub.get(36868))
                                 or parse_exif_date(exif.get(306)))
                make = str(exif.get(271) or "").strip("\x00 ")
                model = str(exif.get(272) or "").strip("\x00 ")
                if model:
                    meta["camera"] = model if make and model.startswith(make) else f"{make} {model}".strip()
                if exif.get(0x0112) in (5, 6, 7, 8):
                    w, h = h, w
            meta["width"], meta["height"] = w, h
    except Exception:
        pass
    return meta


def make_thumb(src: Path, dest: Path, size: int, is_video: bool = False) -> bool:
    """ينشئ صورة مصغرة JPEG. الفيديو يحتاج ffmpeg."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + f".{secrets.token_hex(4)}.tmp.jpg")
    try:
        if is_video:
            if not FFMPEG:
                return False
            for seek in ("1", "0"):
                subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", seek, "-i", str(src),
                                "-frames:v", "1", "-vf", f"scale='min({size},iw)':-2", str(tmp)],
                               timeout=30, stdin=subprocess.DEVNULL, check=False)
                if tmp.exists() and tmp.stat().st_size > 0:
                    break
            if not tmp.exists():
                return False
            os.replace(tmp, dest)
            return True
        if not PIL_OK:
            return False
        with open_image(src) as im:
            im = ImageOps.exif_transpose(im)
            im.thumbnail((size, size))
            if im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            im.save(tmp, "JPEG", quality=82)
        os.replace(tmp, dest)
        return True
    except Exception:
        return False
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)


class ZipStream(io.RawIOBase):
    """مخزن مؤقت يسمح ببث ملف ZIP أثناء إنشائه بدون حفظه على القرص."""

    def __init__(self):
        self.buf = bytearray()

    def writable(self):
        return True

    def write(self, b):
        self.buf.extend(b)
        return len(b)

    def take(self) -> bytes:
        out = bytes(self.buf)
        self.buf.clear()
        return out


def zip_generator(entries):
    """entries: قائمة (المسار على القرص، الاسم داخل الأرشيف)."""
    stream = ZipStream()
    with zipfile.ZipFile(stream, "w", zipfile.ZIP_STORED, allowZip64=True) as zf:
        for src, arc in entries:
            try:
                st = src.stat()
                info = zipfile.ZipInfo(arc, time.localtime(max(st.st_mtime, 315532800))[:6])
                info.compress_type = zipfile.ZIP_STORED
                info.file_size = st.st_size
                with open(src, "rb") as f, zf.open(info, "w", force_zip64=True) as out:
                    for chunk in iter(lambda: f.read(1024 * 1024), b""):
                        out.write(chunk)
                        yield stream.take()
            except OSError:
                continue
    yield stream.take()


def walk_files(root: Path, prefix: str):
    """يعيد كل الملفات داخل مجلد كأزواج (مسار، اسم نسبي) متجاهلاً سلة المحذوفات."""
    if root.is_file():
        yield root, prefix or root.name
        return
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != RECYCLE]
        for fn in filenames:
            p = Path(dirpath) / fn
            yield p, f"{prefix}/{p.relative_to(root).as_posix()}" if prefix else p.relative_to(root).as_posix()


# ==========================================================================
# المستخدمون والمصادقة
# ==========================================================================

def current_user():
    if "user" in g:
        return g.user
    user = None
    db = get_db()
    uid = session.get("uid")
    if uid:
        user = db.execute("SELECT * FROM users WHERE id=? AND disabled=0", (uid,)).fetchone()
        if user and session.get("pwv") != user["password_hash"][-12:]:
            user = None  # تغيّرت كلمة المرور: إنهاء الجلسات القديمة
    if user is None:
        token = request.headers.get("X-Token") or request.args.get("token")
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
        if token and len(token) >= 16:
            user = db.execute("SELECT * FROM users WHERE api_token=? AND disabled=0", (token,)).fetchone()
    g.user = user
    return user


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if current_user() is None:
            if request.path.startswith("/api/"):
                return jsonify(error="يجب تسجيل الدخول"), 401
            return redirect(url_for("auth.login", next=request.full_path.rstrip("?")))
        return view(*args, **kwargs)
    return wrapper


def admin_required(view):
    @wraps(view)
    @login_required
    def wrapper(*args, **kwargs):
        if not current_user()["is_admin"]:
            return jsonify(error="هذه العملية للمدير فقط"), 403
        return view(*args, **kwargs)
    return wrapper


def home_dir(username: str) -> Path:
    p = paths().homes / username
    (p / "Photos").mkdir(parents=True, exist_ok=True)
    return p


def log_action(action: str, detail: str = "", username: str | None = None) -> None:
    try:
        if username is None:
            u = g.get("user")
            username = u["username"] if u else None
        db = get_db()
        db.execute("INSERT INTO logs(ts, username, ip, action, detail) VALUES (?,?,?,?,?)",
                   (now_iso(), username, request.remote_addr if request else None, action, detail[:500]))
        db.commit()
    except Exception:
        pass


def body() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def named_lock(name: str) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(name, threading.Lock())
