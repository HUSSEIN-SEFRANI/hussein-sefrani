"""تطبيق الصور: المكتبات، الفهرسة التلقائية، الرفع، الألبومات، المفضلة."""
from __future__ import annotations

import hashlib
import mimetypes
import os
import secrets
import shutil
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Blueprint, Response, abort, current_app, jsonify, request, send_file

from .core import (BROWSER_IMAGE_EXT, MEDIA_EXT, RECYCLE, VIDEO_EXT, body, connect, current_user,
                   get_db, get_setting, image_meta, is_within, log_action, login_required, make_thumb,
                   named_lock, now_iso, paths, unique_path, zip_generator)
from .vfs import folder_perm

bp = Blueprint("photos", __name__)

THUMB = 360
PREVIEW = 1920


# ==========================================================================
# المكتبات
# ==========================================================================

def all_libraries(db, data_paths) -> list[tuple[str, Path]]:
    """كل مكتبات الصور في النظام: (المعرف، المجلد)."""
    libs = []
    for u in db.execute("SELECT id, username FROM users"):
        base = data_paths.homes / u["username"] / "Photos"
        base.mkdir(parents=True, exist_ok=True)
        libs.append((f"u:{u['id']}", base))
    sid = db.execute("SELECT value FROM settings WHERE key='photo_shared_folder'").fetchone()
    if sid and sid["value"]:
        f = db.execute("SELECT path FROM folders WHERE id=?", (sid["value"],)).fetchone()
        if f:
            libs.append(("s", Path(f["path"])))
    return libs


def libraries_for(user) -> list[dict]:
    libs = [{"id": f"u:{user['id']}", "label": "مساحتي الشخصية", "writable": True,
             "base": paths().homes / user["username"] / "Photos"}]
    sid = get_setting("photo_shared_folder")
    if sid:
        f = get_db().execute("SELECT * FROM folders WHERE id=?", (sid,)).fetchone()
        if f:
            perm = folder_perm(user, f["id"])
            if perm:
                libs.append({"id": "s", "label": "المساحة المشتركة", "writable": perm == "rw",
                             "base": Path(f["path"])})
    for lib in libs:
        lib["base"].mkdir(parents=True, exist_ok=True)
    return libs


def get_library(user, lib_id: str | None, need_write=False) -> dict:
    libs = libraries_for(user)
    lib = next((x for x in libs if x["id"] == lib_id), None) if lib_id else libs[0]
    if not lib:
        abort(404, "المكتبة غير متاحة")
    if need_write and not lib["writable"]:
        abort(403, "لا تملك صلاحية الإضافة إلى هذه المكتبة")
    return lib


def recycle_dir(lib: dict) -> Path:
    base = lib["base"]
    if lib["id"].startswith("u:"):
        return base.parent / RECYCLE / "Photos"
    return base / RECYCLE


# ==========================================================================
# الفهرسة في الخلفية
# ==========================================================================

class Indexer:
    def __init__(self, data_paths):
        self.paths = data_paths
        self.queue: list[str] = []
        self.event = threading.Event()
        self.lock = threading.Lock()
        self.status = {"running": False, "library": None, "done": 0, "total": 0, "last_run": None}
        self.thread = threading.Thread(target=self.loop, daemon=True, name="indexer")
        self.on_indexed = None  # تُستدعى بعد فهرسة مكتبة (لتحديث مكتبة التلفاز)

    def start(self):
        self.enqueue_all()
        self.thread.start()

    def enqueue(self, lib: str):
        with self.lock:
            if lib not in self.queue:
                self.queue.append(lib)
        self.event.set()

    def enqueue_all(self):
        db = connect(self.paths.db)
        try:
            for lib, _ in all_libraries(db, self.paths):
                self.enqueue(lib)
        finally:
            db.close()

    def notify_path(self, db, changed: Path):
        """يُستدعى بعد تعديل الملفات من مدير الملفات لإعادة فهرسة المكتبة المتأثرة."""
        changed = changed.resolve()
        for lib, base in all_libraries(db, self.paths):
            base = base.resolve()
            if is_within(changed, base) or is_within(base, changed):
                self.enqueue(lib)

    def loop(self):
        while True:
            if not self.event.wait(timeout=600):
                self.enqueue_all()  # فهرسة دورية كل 10 دقائق
            self.event.clear()
            while True:
                with self.lock:
                    if not self.queue:
                        break
                    lib = self.queue.pop(0)
                try:
                    self.index(lib)
                    if self.on_indexed:
                        self.on_indexed(lib)
                except Exception as exc:  # pragma: no cover
                    print(f"[indexer] {lib}: {exc}")
            self.status.update(running=False, library=None)

    def index(self, lib: str):
        db = connect(self.paths.db)
        try:
            base = dict(all_libraries(db, self.paths)).get(lib)
            if base is None:
                db.execute("DELETE FROM media WHERE library=?", (lib,))
                db.commit()
                return
            self._index(db, lib, base)
        finally:
            db.close()

    def _index(self, db, lib: str, base: Path):
        known = {r["rel_path"]: r for r in db.execute(
            "SELECT id, rel_path, size, mtime FROM media WHERE library=?", (lib,))}
        found: list[tuple[str, Path, os.stat_result]] = []
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d != RECYCLE and not d.startswith((".", "@"))]
            for fn in filenames:
                p = Path(dirpath) / fn
                if p.suffix.lower() in MEDIA_EXT and not fn.startswith("."):
                    try:
                        found.append((p.relative_to(base).as_posix(), p, p.stat()))
                    except OSError:
                        pass
        todo = [(rel, p, st) for rel, p, st in found
                if rel not in known or known[rel]["size"] != st.st_size
                or abs(known[rel]["mtime"] - st.st_mtime) > 1]
        self.status.update(running=True, library=lib, done=0, total=len(todo))
        for i, (rel, p, st) in enumerate(todo):
            try:
                rec = describe_file(p, st)
            except OSError:
                continue
            db.execute(
                "INSERT INTO media(library, rel_path, sha256, name, size, mtime, is_video, width, height,"
                " camera, taken_at, indexed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
                " ON CONFLICT(library, rel_path) DO UPDATE SET sha256=excluded.sha256, size=excluded.size,"
                " mtime=excluded.mtime, width=excluded.width, height=excluded.height,"
                " camera=excluded.camera, taken_at=excluded.taken_at, indexed_at=excluded.indexed_at",
                (lib, rel, rec["sha256"], p.name, st.st_size, st.st_mtime, rec["is_video"], rec["width"],
                 rec["height"], rec["camera"], rec["taken_at"], now_iso()))
            self.status["done"] = i + 1
            if i % 50 == 0:
                db.commit()
        present = {rel for rel, _, _ in found}
        gone = [r["id"] for rel, r in known.items() if rel not in present]
        for mid in gone:
            db.execute("DELETE FROM media WHERE id=?", (mid,))
        db.commit()
        self.status["last_run"] = now_iso()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def describe_file(p: Path, st: os.stat_result, fallback_time: datetime | None = None) -> dict:
    is_video = p.suffix.lower() in VIDEO_EXT
    meta = image_meta(p) if not is_video else {"taken": None, "width": None, "height": None, "camera": None}
    taken = meta["taken"] or fallback_time or datetime.fromtimestamp(st.st_mtime)
    return {"sha256": sha256_file(p), "is_video": int(is_video), "width": meta["width"],
            "height": meta["height"], "camera": meta["camera"],
            "taken_at": taken.isoformat(timespec="seconds")}


def indexer() -> Indexer:
    return current_app.extensions["nas_indexer"]


# ==========================================================================
# الوصول إلى العناصر
# ==========================================================================

ITEM_COLS = ("m.id, m.library, m.name, m.size, m.is_video, m.width, m.height, m.camera, m.taken_at,"
             " m.rel_path")


def lib_base(user, lib_id: str) -> Path:
    for lib in libraries_for(user):
        if lib["id"] == lib_id:
            return lib["base"]
    abort(404)


def media_for(user, mid: int):
    row = get_db().execute("SELECT * FROM media WHERE id=?", (mid,)).fetchone()
    if not row or row["library"] not in {x["id"] for x in libraries_for(user)}:
        abort(404)
    return row


def media_path(user, row) -> Path:
    base = lib_base(user, row["library"]).resolve()
    p = (base / row["rel_path"]).resolve()
    if not is_within(p, base) or not p.exists():
        abort(404, "الملف غير موجود")
    return p


def thumb_cache(row, kind: str) -> Path:
    key = row["sha256"] or f"id{row['id']}"
    return paths().cache / kind / key[:2] / f"{key}.jpg"


def send_thumb(row, src: Path, kind="thumbs"):
    cache = thumb_cache(row, kind)
    if not cache.exists():
        size = THUMB if kind == "thumbs" else PREVIEW
        if not make_thumb(src, cache, size, bool(row["is_video"])):
            icon = "video.svg" if row["is_video"] else "image.svg"
            return send_file(Path(current_app.static_folder) / "img" / icon, mimetype="image/svg+xml")
    return send_file(cache, mimetype="image/jpeg", max_age=86400 * 30)


def send_view(row, src: Path):
    if row["is_video"] or src.suffix.lower() in BROWSER_IMAGE_EXT:
        return send_file(src, conditional=True, max_age=3600)
    return send_thumb(row, src, "previews")


def item_dict(r, favs: set[int]) -> dict:
    d = {k: r[k] for k in ("id", "library", "name", "size", "is_video", "width", "height", "camera", "taken_at")}
    d["fav"] = r["id"] in favs
    return d


# ==========================================================================
# واجهة API
# ==========================================================================

@bp.get("/api/photos/libraries")
@login_required
def api_libraries():
    return jsonify([{k: v for k, v in lib.items() if k != "base"} for lib in libraries_for(current_user())])


@bp.get("/api/photos/items")
@login_required
def api_items():
    user = current_user()
    db = get_db()
    libs = [x["id"] for x in libraries_for(user)]
    limit = min(request.args.get("limit", 200, type=int), 1000)
    offset = max(request.args.get("offset", 0, type=int), 0)
    where, args = [], []
    joins = ""
    album = request.args.get("album", type=int)
    if album:
        a = db.execute("SELECT id FROM albums WHERE id=? AND owner_id=?", (album, user["id"])).fetchone()
        if not a:
            abort(404)
        joins = "JOIN album_items ai ON ai.media_id=m.id AND ai.album_id=?"
        args.append(album)
        where.append(f"m.library IN ({','.join('?' * len(libs))})")
        args += libs
    elif request.args.get("fav"):
        joins = "JOIN favorites f ON f.media_id=m.id AND f.user_id=?"
        args.append(user["id"])
        where.append(f"m.library IN ({','.join('?' * len(libs))})")
        args += libs
    else:
        lib = request.args.get("lib") or libs[0]
        if lib not in libs:
            abort(404)
        where.append("m.library=?")
        args.append(lib)
    kind = request.args.get("kind")
    if kind == "videos":
        where.append("m.is_video=1")
    elif kind == "photos":
        where.append("m.is_video=0")
    q = (request.args.get("q") or "").strip()
    if q:
        where.append("(m.name LIKE ? OR m.camera LIKE ? OR m.taken_at LIKE ?)")
        args += [f"%{q}%"] * 3
    period = request.args.get("period")
    if period:
        where.append("m.taken_at LIKE ?")
        args.append(f"{period}%")
    sql = (f"SELECT {ITEM_COLS} FROM media m {joins} WHERE {' AND '.join(where)}"
           f" ORDER BY m.taken_at DESC, m.id DESC LIMIT ? OFFSET ?")
    rows = db.execute(sql, args + [limit, offset]).fetchall()
    favs = {r["media_id"] for r in db.execute("SELECT media_id FROM favorites WHERE user_id=?", (user["id"],))}
    return jsonify(items=[item_dict(r, favs) for r in rows],
                   next=offset + len(rows) if len(rows) == limit else None)


@bp.get("/api/photos/summary")
@login_required
def api_summary():
    user = current_user()
    lib = get_library(user, request.args.get("lib"))
    db = get_db()
    months = [dict(r) for r in db.execute(
        "SELECT substr(taken_at,1,7) AS period, COUNT(*) AS n FROM media WHERE library=?"
        " GROUP BY period ORDER BY period DESC", (lib["id"],))]
    tot = db.execute("SELECT COUNT(*) n, COALESCE(SUM(is_video),0) v, COALESCE(SUM(size),0) s"
                     " FROM media WHERE library=?", (lib["id"],)).fetchone()
    return jsonify(months=months, count=tot["n"], videos=tot["v"], size=tot["s"],
                   indexer=indexer().status)


@bp.post("/api/photos/reindex")
@login_required
def api_reindex():
    lib = get_library(current_user(), body().get("lib"))
    indexer().enqueue(lib["id"])
    return jsonify(ok=True)


@bp.post("/api/photos/upload")
@login_required
def api_upload():
    user = current_user()
    lib = get_library(user, request.args.get("lib") or request.form.get("lib"), need_write=True)
    files = request.files.getlist("file") or list(request.files.values())
    if not files:
        return jsonify(error="لم يتم إرسال ملف"), 400
    client_mtime = request.form.get("last_modified", type=float)
    results = [save_media_upload(user, lib, f, client_mtime) for f in files]
    saved = sum(1 for r in results if r["status"] == "saved")
    if saved:
        log_action("رفع صور", f"{saved} ملف إلى {lib['label']}")
    return jsonify(results=results)


def save_media_upload(user, lib: dict, fs, client_mtime: float | None) -> dict:
    original = os.path.basename((fs.filename or "file").replace("\\", "/")) or "file"
    ext = os.path.splitext(original)[1].lower()
    if not ext:
        ext = (mimetypes.guess_extension(fs.mimetype or "") or "").lower()
        original += ext
    if ext not in MEDIA_EXT or any(c in original for c in '/\\:*?"<>|'):
        return {"name": original, "status": "rejected", "error": "نوع ملف غير مدعوم"}
    tmp = paths().tmp / f"{secrets.token_hex(8)}{ext}"
    h = hashlib.sha256()
    size = 0
    try:
        with open(tmp, "wb") as out:
            for chunk in iter(lambda: fs.stream.read(1024 * 1024), b""):
                h.update(chunk)
                out.write(chunk)
                size += len(chunk)
        if not size:
            return {"name": original, "status": "rejected", "error": "ملف فارغ"}
        digest = h.hexdigest()
        db = get_db()
        fallback = None
        if client_mtime:
            try:
                fallback = datetime.fromtimestamp(client_mtime / 1000.0)
            except (ValueError, OSError, OverflowError):
                pass
        is_video = ext in VIDEO_EXT
        meta = image_meta(tmp) if not is_video else {"taken": None, "width": None, "height": None, "camera": None}
        taken = meta["taken"] or fallback or datetime.now()
        with named_lock(f"lib:{lib['id']}"):
            dup = db.execute("SELECT id FROM media WHERE library=? AND sha256=?", (lib["id"], digest)).fetchone()
            if dup:
                return {"name": original, "status": "duplicate", "id": dup["id"]}
            folder = lib["base"] / f"{taken:%Y}" / f"{taken:%m}"
            folder.mkdir(parents=True, exist_ok=True)
            dest = unique_path(folder / original)
            shutil.move(str(tmp), dest)
            ts = taken.timestamp()
            try:
                os.utime(dest, (ts, ts))
            except OSError:
                pass
            st = dest.stat()
            rel = dest.relative_to(lib["base"]).as_posix()
            # upsert: قد يسبقنا المفهرس في الخلفية إلى هذا الملف
            db.execute(
                "INSERT INTO media(library, rel_path, sha256, name, size, mtime, is_video, width, height,"
                " camera, taken_at, indexed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
                " ON CONFLICT(library, rel_path) DO UPDATE SET sha256=excluded.sha256",
                (lib["id"], rel, digest, dest.name, st.st_size, st.st_mtime, int(is_video), meta["width"],
                 meta["height"], meta["camera"], taken.isoformat(timespec="seconds"), now_iso()))
            db.commit()
            mid = db.execute("SELECT id FROM media WHERE library=? AND rel_path=?", (lib["id"], rel)).fetchone()["id"]
        return {"name": original, "status": "saved", "id": mid}
    except Exception as exc:  # pragma: no cover
        return {"name": original, "status": "error", "error": str(exc)}
    finally:
        tmp.unlink(missing_ok=True)


@bp.get("/api/photos/<int:mid>/thumb")
@login_required
def api_thumb(mid):
    user = current_user()
    row = media_for(user, mid)
    return send_thumb(row, media_path(user, row))


@bp.get("/api/photos/<int:mid>/view")
@login_required
def api_view(mid):
    user = current_user()
    row = media_for(user, mid)
    return send_view(row, media_path(user, row))


@bp.get("/api/photos/<int:mid>/download")
@login_required
def api_download(mid):
    user = current_user()
    row = media_for(user, mid)
    return send_file(media_path(user, row), as_attachment=True, download_name=row["name"], conditional=True)


def ids_param() -> list[int]:
    raw = body().get("ids")
    if raw is None:
        raw = (request.args.get("ids") or "").split(",")
    out = []
    for x in raw:
        try:
            out.append(int(x))
        except (TypeError, ValueError):
            pass
    return out[:5000]


@bp.get("/api/photos/zip")
@login_required
def api_zip():
    user = current_user()
    entries, used = [], set()
    for mid in ids_param():
        row = media_for(user, mid)
        name = row["name"]
        stem, ext = os.path.splitext(name)
        n = 1
        while name.lower() in used:
            name = f"{stem} ({n}){ext}"
            n += 1
        used.add(name.lower())
        entries.append((media_path(user, row), name))
    if not entries:
        abort(400)
    return Response(zip_generator(entries), mimetype="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="photos-{int(time.time())}.zip"'})


@bp.post("/api/photos/favorite")
@login_required
def api_favorite():
    user = current_user()
    db = get_db()
    value = bool(body().get("value", True))
    for mid in ids_param():
        media_for(user, mid)
        if value:
            db.execute("INSERT OR IGNORE INTO favorites(user_id, media_id) VALUES (?,?)", (user["id"], mid))
        else:
            db.execute("DELETE FROM favorites WHERE user_id=? AND media_id=?", (user["id"], mid))
    db.commit()
    return jsonify(ok=True)


@bp.post("/api/photos/delete")
@login_required
def api_delete():
    user = current_user()
    db = get_db()
    libs = {x["id"]: x for x in libraries_for(user)}
    count = 0
    for mid in ids_param():
        row = media_for(user, mid)
        lib = libs[row["library"]]
        if not lib["writable"]:
            abort(403, "لا تملك صلاحية الحذف من هذه المكتبة")
        src = (lib["base"] / row["rel_path"])
        if src.exists():
            dest = unique_path(recycle_dir(lib) / row["rel_path"])
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), dest)
        db.execute("DELETE FROM media WHERE id=?", (mid,))
        count += 1
    db.commit()
    if count:
        log_action("حذف صور", f"{count} ملف (نُقلت إلى سلة المحذوفات)")
    return jsonify(ok=True, count=count)


# ------------------------------------------------------------------ الألبومات

@bp.get("/api/albums")
@login_required
def api_albums():
    user = current_user()
    libs = [x["id"] for x in libraries_for(user)]
    ph = ",".join("?" * len(libs))
    rows = get_db().execute(
        f"""SELECT a.id, a.name, a.created_at,
              (SELECT COUNT(*) FROM album_items ai JOIN media m ON m.id=ai.media_id
                 WHERE ai.album_id=a.id AND m.library IN ({ph})) AS count,
              (SELECT m.id FROM album_items ai JOIN media m ON m.id=ai.media_id
                 WHERE ai.album_id=a.id AND m.library IN ({ph}) ORDER BY m.taken_at DESC LIMIT 1) AS cover
            FROM albums a WHERE a.owner_id=? ORDER BY a.created_at DESC""",
        libs + libs + [user["id"]]).fetchall()
    return jsonify([dict(r) for r in rows])


def own_album(aid: int):
    row = get_db().execute("SELECT * FROM albums WHERE id=? AND owner_id=?", (aid, current_user()["id"])).fetchone()
    if not row:
        abort(404, "الألبوم غير موجود")
    return row


@bp.post("/api/albums")
@login_required
def api_album_create():
    user = current_user()
    name = (body().get("name") or "").strip()[:120]
    if not name:
        abort(400, "اكتب اسماً للألبوم")
    db = get_db()
    cur = db.execute("INSERT INTO albums(owner_id, name, created_at) VALUES (?,?,?)", (user["id"], name, now_iso()))
    for mid in ids_param():
        media_for(user, mid)
        db.execute("INSERT OR IGNORE INTO album_items(album_id, media_id, added_at) VALUES (?,?,?)",
                   (cur.lastrowid, mid, now_iso()))
    db.commit()
    return jsonify(ok=True, id=cur.lastrowid)


@bp.patch("/api/albums/<int:aid>")
@login_required
def api_album_rename(aid):
    own_album(aid)
    name = (body().get("name") or "").strip()[:120]
    if not name:
        abort(400, "اكتب اسماً للألبوم")
    db = get_db()
    db.execute("UPDATE albums SET name=? WHERE id=?", (name, aid))
    db.commit()
    return jsonify(ok=True)


@bp.delete("/api/albums/<int:aid>")
@login_required
def api_album_delete(aid):
    own_album(aid)
    db = get_db()
    db.execute("DELETE FROM albums WHERE id=?", (aid,))
    db.execute("DELETE FROM links WHERE kind='album' AND target=?", (str(aid),))
    db.commit()
    return jsonify(ok=True)


@bp.post("/api/albums/<int:aid>/add")
@login_required
def api_album_add(aid):
    user = current_user()
    own_album(aid)
    db = get_db()
    for mid in ids_param():
        media_for(user, mid)
        db.execute("INSERT OR IGNORE INTO album_items(album_id, media_id, added_at) VALUES (?,?,?)",
                   (aid, mid, now_iso()))
    db.commit()
    return jsonify(ok=True)


@bp.post("/api/albums/<int:aid>/remove")
@login_required
def api_album_remove(aid):
    own_album(aid)
    db = get_db()
    for mid in ids_param():
        db.execute("DELETE FROM album_items WHERE album_id=? AND media_id=?", (aid, mid))
    db.commit()
    return jsonify(ok=True)
