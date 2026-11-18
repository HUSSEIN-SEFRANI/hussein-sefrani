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


SETUP_CONTACT = "+32 494 49 94 30"


def ensure_setup_code(p: Paths) -> str:
    """لم يعد هناك رمز يُعرض: الملف القديم يُحذف إن وُجد."""
    setup_code_file(p).unlink(missing_ok=True)
    return ""


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


# البند 25: مجلدات تظهر على قرص الشبكة (SMB) للمدير فقط: ألعاب التلفاز ودروسه ومكتباته، يضيف إليها المدير من الكمبيوتر
SMB_ADMIN_DEFAULT = ("الألعاب", "التعليم", "القرآن الصوتي", "ذكريات العائلة")


def init_db(db_path: Path) -> None:
    with connect(db_path) as db:
        db.executescript(SCHEMA)
        cols = {r[1] for r in db.execute("PRAGMA table_info(folders)")}
        if "smb" not in cols:   # v1.9.8: 'all' = حسب الصلاحيات، 'admin' = للمدير فقط على قرص الشبكة
            db.execute("ALTER TABLE folders ADD COLUMN smb TEXT NOT NULL DEFAULT 'all'")
            db.execute(f"UPDATE folders SET smb='admin' WHERE name IN ({','.join('?' * len(SMB_ADMIN_DEFAULT))})", SMB_ADMIN_DEFAULT)
            db.commit()


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


# ----------------------------------------------------------------------------- صور DNG (البند 26)
# DNG = صورة خام (RAW) بصيغة TIFF من الآيفون (ProRAW) وهواتف أندرويد والكاميرات. البيانات الخام نفسها لا تُعرض،
# لكن الملف يحمل معاينة JPEG جاهزة (غالباً بالحجم الكامل أو قريباً منه): نأخذ أكبرها، ونديرها حسب اتجاه الصورة.
DNG_EXT = {".dng"}


def _tiff_ifds(data: bytes):
    """يمر على كل IFD في ملف TIFF/DNG (السلسلة الرئيسية و SubIFDs)، ويرجع قاموس الوسوم لكل واحد."""
    import struct
    if data[:2] == b"II":
        e = "<"
    elif data[:2] == b"MM":
        e = ">"
    else:
        return
    if struct.unpack(e + "H", data[2:4])[0] != 42:
        return
    sizes = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4}
    todo, seen = [struct.unpack(e + "I", data[4:8])[0]], set()
    while todo and len(seen) < 64:
        off = todo.pop(0)
        if off in seen or off <= 0 or off + 2 > len(data):
            continue
        seen.add(off)
        n = struct.unpack(e + "H", data[off:off + 2])[0]
        tags = {}
        for i in range(min(n, 500)):
            ent = off + 2 + i * 12
            if ent + 12 > len(data):
                break
            tag, typ, cnt = struct.unpack(e + "HHI", data[ent:ent + 8])
            size = sizes.get(typ, 1) * cnt
            voff = ent + 8 if size <= 4 else struct.unpack(e + "I", data[ent + 8:ent + 12])[0]
            raw = data[voff:voff + size]
            if typ in (3, 8):
                vals = list(struct.unpack(e + "%dH" % (len(raw) // 2), raw[:len(raw) // 2 * 2]))
            elif typ in (4, 9, 13):
                vals = list(struct.unpack(e + "%dI" % (len(raw) // 4), raw[:len(raw) // 4 * 4]))
            elif typ in (1, 7, 6):
                vals = list(raw) if cnt <= 16 else raw
            else:
                vals = raw
            tags[tag] = vals
        yield tags
        if 330 in tags and isinstance(tags[330], list):    # SubIFDs
            todo.extend(tags[330])
        nxt = off + 2 + n * 12
        if nxt + 4 <= len(data):
            todo.append(struct.unpack(e + "I", data[nxt:nxt + 4])[0])


def dng_preview(path: Path) -> tuple[bytes | None, int]:
    """(أكبر معاينة JPEG داخل ملف DNG، واتجاه الصورة Orientation)."""
    try:
        data = Path(path).read_bytes()
    except OSError:
        return None, 1
    best, area, orient = None, 0, 1
    first = True
    for t in _tiff_ifds(data):
        g1 = lambda k, d=None: (t.get(k) or [d])[0] if isinstance(t.get(k), list) else d
        if first:
            orient = g1(274, 1) or 1
            first = False
        cands = []
        if 513 in t and 514 in t:                                   # JPEGInterchangeFormat
            cands.append((g1(513), g1(514)))
        comp, photo = g1(259), g1(262)
        offs, cnts = t.get(273), t.get(279)
        if comp in (6, 7) and photo in (2, 6) and isinstance(offs, list) and len(offs) == 1 and isinstance(cnts, list):
            cands.append((offs[0], cnts[0]))                         # معاينة JPEG في شريط واحد (لا الخام CFA/LinearRaw)
        for o, n in cands:
            if not o or not n or o + n > len(data) or data[o:o + 2] != b"\xff\xd8":
                continue
            w, h = g1(256, 0) or 0, g1(257, 0) or 0
            if not (w and h):
                try:
                    with Image.open(io.BytesIO(data[o:o + n])) as im:
                        w, h = im.size
                except Exception:
                    continue
            if w * h > area:
                best, area = data[o:o + n], w * h
    return best, int(orient or 1)


def dng_to_jpeg(src: Path, dest: Path) -> bool:
    """يحفظ معاينة DNG كصورة JPEG مُدارة في الاتجاه الصحيح."""
    jpg, orient = dng_preview(src)
    if not jpg or not PIL_OK:
        return False
    try:
        with Image.open(io.BytesIO(jpg)) as im:
            im.load()
            op = {2: Image.Transpose.FLIP_LEFT_RIGHT, 3: Image.Transpose.ROTATE_180, 4: Image.Transpose.FLIP_TOP_BOTTOM,
                  5: Image.Transpose.TRANSPOSE, 6: Image.Transpose.ROTATE_270, 7: Image.Transpose.TRANSVERSE,
                  8: Image.Transpose.ROTATE_90}.get(orient)
            out = im.transpose(op) if op else im
            if out.mode not in ("RGB", "L"):
                out = out.convert("RGB")
            out.save(dest, "JPEG", quality=92)
        return True
    except Exception:
        return False


class open_image:
    """يفتح صورة بـ Pillow، مع تحويل HEIC إلى JPEG مؤقت عند عدم توفر pillow-heif، و DNG إلى معاينتها."""

    def __init__(self, path: Path):
        self.path, self.tmp, self.im = Path(path), None, None

    def __enter__(self):
        src = self.path
        if src.suffix.lower() in HEIC_EXT and not HEIF_OK and HEIF_CLI:
            self.tmp = Path(tempfile.gettempdir()) / f"hsef-{secrets.token_hex(6)}.jpg"
            subprocess.run([HEIF_CLI, "-q", "92", str(src), str(self.tmp)], capture_output=True, timeout=120,
                           stdin=subprocess.DEVNULL, check=True)
            src = self.tmp
        elif src.suffix.lower() in DNG_EXT:
            self.tmp = Path(tempfile.gettempdir()) / f"hsef-{secrets.token_hex(6)}.jpg"
            if dng_to_jpeg(src, self.tmp):
                src = self.tmp
            else:
                self.tmp.unlink(missing_ok=True)
                self.tmp = None
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
        if Path(path).suffix.lower() in DNG_EXT:   # التاريخ والكاميرا من الملف الأصلي، والأبعاد من المعاينة (مُدارة مسبقاً)
            with Image.open(path) as raw:
                exif = raw.getexif()
            with open_image(path) as im:
                w, h = im.size
            if exif:
                sub = exif.get_ifd(0x8769)
                meta["taken"] = (parse_exif_date(sub.get(36867)) or parse_exif_date(sub.get(36868))
                                 or parse_exif_date(exif.get(306)))
                make = str(exif.get(271) or "").strip("\x00 ")
                model = str(exif.get(272) or "").strip("\x00 ")
                if model:
                    meta["camera"] = model if make and model.startswith(make) else f"{make} {model}".strip()
            meta["width"], meta["height"] = w, h
            return meta
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
