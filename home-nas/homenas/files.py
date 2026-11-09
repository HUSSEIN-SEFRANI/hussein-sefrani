"""مدير الملفات: تصفّح، رفع، تنزيل، نسخ، نقل، إعادة تسمية، حذف، بحث، تحرير نصوص."""
from __future__ import annotations

import hashlib
import mimetypes
import os
import shutil
import time
from pathlib import Path

from flask import Blueprint, Response, abort, current_app, jsonify, request, send_file

from .core import (IMAGE_EXT, RECYCLE, TEXT_EXT, VIDEO_EXT, body, clean_name, current_user, get_db,
                   is_within, log_action, login_required, make_thumb, paths, unique_path, walk_files,
                   zip_generator)
from .photos import indexer
from .vfs import Root, resolve, roots_for, split, to_vpath

bp = Blueprint("files", __name__)

TEXT_LIMIT = 2 * 1024 * 1024


def entry(p: Path, st: os.stat_result | None = None) -> dict:
    st = st or p.stat()
    is_dir = p.is_dir()
    return {"name": p.name, "dir": is_dir, "size": 0 if is_dir else st.st_size, "mtime": st.st_mtime,
            "ext": "" if is_dir else p.suffix.lower().lstrip(".")}


def touched(*abs_paths: Path):
    db = get_db()
    for p in abs_paths:
        try:
            indexer().notify_path(db, p)
        except Exception:
            pass


def protect_top(root: Root, vpath: str):
    """يمنع حذف/نقل/إعادة تسمية المجلدات الرئيسية ومجلدات المستخدمين ومجلد Photos."""
    parts = split(vpath)
    if len(parts) < 2 or (root.kind == "homes" and len(parts) < 3) or \
            (root.kind == "home" and len(parts) == 2 and parts[1] in ("Photos", "#recycle")):
        abort(400, "لا يمكن تعديل هذا المجلد الرئيسي")


def recycle_base(root: Root, target: Path) -> Path:
    if root.kind == "homes":
        rel = target.resolve().relative_to(root.path.resolve()).parts
        return root.path / rel[0] if rel else root.path
    return root.path


@bp.get("/api/files/roots")
@login_required
def api_roots():
    return jsonify([r.as_dict() for r in roots_for(current_user())])


@bp.get("/api/files/list")
@login_required
def api_list():
    root, target = resolve(current_user(), request.args.get("path", ""))
    if not target.is_dir():
        abort(404, "المجلد غير موجود")
    items = []
    with os.scandir(target) as it:
        for e in it:
            if e.name.startswith(".") or (root.kind == "home" and e.name == "@system"):
                continue
            try:
                st = e.stat()
                items.append({"name": e.name, "dir": e.is_dir(), "size": 0 if e.is_dir() else st.st_size,
                              "mtime": st.st_mtime,
                              "ext": "" if e.is_dir() else os.path.splitext(e.name)[1].lower().lstrip(".")})
            except OSError:
                continue
    items.sort(key=lambda x: (not x["dir"], x["name"].casefold()))
    return jsonify(path=to_vpath(root, target), perm=root.perm, root=root.as_dict(), items=items)


@bp.get("/api/files/search")
@login_required
def api_search():
    root, target = resolve(current_user(), request.args.get("path", ""))
    q = (request.args.get("q") or "").strip().casefold()
    if not q:
        return jsonify(items=[])
    out = []
    for dirpath, dirnames, filenames in os.walk(target):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for name in dirnames + filenames:
            if q in name.casefold():
                p = Path(dirpath) / name
                try:
                    e = entry(p)
                except OSError:
                    continue
                e["parent"] = to_vpath(root, p.parent)
                out.append(e)
                if len(out) >= 300:
                    return jsonify(items=out, truncated=True)
    return jsonify(items=out, truncated=False)


@bp.post("/api/files/mkdir")
@login_required
def api_mkdir():
    data = body()
    root, parent = resolve(current_user(), data.get("path", ""), need_write=True)
    name = clean_name(data.get("name"))
    dest = parent / name
    if dest.exists():
        abort(409, "يوجد ملف أو مجلد بنفس الاسم")
    dest.mkdir(parents=True)
    log_action("إنشاء مجلد", to_vpath(root, dest))
    return jsonify(ok=True, path=to_vpath(root, dest))


@bp.post("/api/files/rename")
@login_required
def api_rename():
    data = body()
    user = current_user()
    root, src = resolve(user, data.get("path", ""), need_write=True)
    protect_top(root, data.get("path", ""))
    if not src.exists():
        abort(404, "غير موجود")
    name = clean_name(data.get("name"))
    dest = src.with_name(name)
    if dest.exists() and dest.resolve() != src.resolve():
        abort(409, "يوجد ملف أو مجلد بنفس الاسم")
    src.rename(dest)
    log_action("إعادة تسمية", f"{to_vpath(root, dest.parent)}/{src.name} ← {name}")
    touched(dest.parent)
    return jsonify(ok=True)


@bp.post("/api/files/delete")
@login_required
def api_delete():
    user = current_user()
    count = 0
    affected = []
    for vp in body().get("paths") or []:
        root, target = resolve(user, vp, need_write=True)
        protect_top(root, vp)
        if not target.exists():
            continue
        rbase = recycle_base(root, target)
        recycle = rbase / RECYCLE
        if is_within(target.resolve(), recycle.resolve()):
            # حذف نهائي من داخل سلة المحذوفات
            shutil.rmtree(target) if target.is_dir() else target.unlink()
        else:
            rel = target.resolve().relative_to(rbase.resolve())
            dest = unique_path(recycle / rel)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(target), dest)
        affected.append(target.parent)
        count += 1
    if count:
        log_action("حذف ملفات", f"{count} عنصر")
        touched(*set(affected))
    return jsonify(ok=True, count=count)


@bp.post("/api/files/empty-recycle")
@login_required
def api_empty_recycle():
    root, base = resolve(current_user(), body().get("path", ""), need_write=True)
    recycle = recycle_base(root, base) / RECYCLE
    if recycle.exists():
        shutil.rmtree(recycle)
    log_action("تفريغ سلة المحذوفات", f"/{root.name}")
    return jsonify(ok=True)


@bp.post("/api/files/transfer")
@login_required
def api_transfer():
    """نسخ أو نقل عناصر إلى مجلد آخر (حتى بين المجلدات المشتركة المختلفة)."""
    user = current_user()
    data = body()
    move = bool(data.get("move"))
    droot, dest_dir = resolve(user, data.get("dest", ""), need_write=True)
    if not dest_dir.is_dir():
        abort(404, "مجلد الوجهة غير موجود")
    done = 0
    for vp in data.get("paths") or []:
        sroot, src = resolve(user, vp, need_write=move)
        if move:
            protect_top(sroot, vp)
        if not src.exists():
            continue
        if src.is_dir() and is_within(dest_dir.resolve(), src.resolve()):
            abort(400, "لا يمكن نسخ مجلد إلى داخل نفسه")
        if move and src.parent.resolve() == dest_dir.resolve():
            continue
        dest = unique_path(dest_dir / src.name)
        if move:
            shutil.move(str(src), dest)
        elif src.is_dir():
            shutil.copytree(src, dest, ignore=shutil.ignore_patterns(RECYCLE))
        else:
            shutil.copy2(src, dest)
        touched(src.parent, dest)
        done += 1
    log_action("نقل" if move else "نسخ", f"{done} عنصر إلى {to_vpath(droot, dest_dir)}")
    return jsonify(ok=True, count=done)


@bp.post("/api/files/upload")
@login_required
def api_upload():
    user = current_user()
    root, dest_dir = resolve(user, request.args.get("path", ""), need_write=True)
    if not dest_dir.is_dir():
        abort(404, "مجلد الوجهة غير موجود")
    policy = request.args.get("conflict", "rename")
    relpath = (request.form.get("relpath") or "").replace("\\", "/")
    mtime = request.form.get("last_modified", type=float)
    results = []
    for fs in request.files.getlist("file"):
        rel_parts = [clean_name(p) for p in (relpath or fs.filename or "file").split("/") if p not in ("", ".")]
        if not rel_parts or ".." in rel_parts:
            abort(400, "اسم غير صالح")
        target = dest_dir.joinpath(*rel_parts)
        if not is_within(target.resolve(), dest_dir.resolve()):
            abort(400, "اسم غير صالح")
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            if policy == "skip":
                results.append({"name": target.name, "status": "skipped"})
                continue
            if policy != "overwrite" or target.is_dir():
                target = unique_path(target)
        tmp = target.with_name(f".{target.name}.uploading")
        try:
            fs.save(tmp)
            os.replace(tmp, target)
        finally:
            tmp.unlink(missing_ok=True)
        if mtime:
            try:
                os.utime(target, (mtime / 1000, mtime / 1000))
            except (OSError, ValueError, OverflowError):
                pass
        results.append({"name": target.name, "status": "saved"})
    touched(dest_dir)
    return jsonify(results=results)


@bp.get("/api/files/raw")
@login_required
def api_raw():
    _root, target = resolve(current_user(), request.args.get("path", ""))
    if not target.is_file():
        abort(404, "الملف غير موجود")
    dl = request.args.get("dl") == "1"
    mime = mimetypes.guess_type(target.name)[0]
    if not dl and target.suffix.lower() in TEXT_EXT | {".html", ".htm", ".svg", ".xml"}:
        mime = "text/plain; charset=utf-8"  # لا نعرض HTML/SVG كصفحة لمنع تشغيل سكربتات
    return send_file(target, as_attachment=dl, download_name=target.name, mimetype=mime, conditional=True)


@bp.get("/api/files/thumb")
@login_required
def api_thumb():
    _root, target = resolve(current_user(), request.args.get("path", ""))
    return thumb_response(target, request.args.get("s") == "big")


def thumb_response(target: Path, big: bool):
    if not target.is_file():
        abort(404)
    ext = target.suffix.lower()
    if ext not in IMAGE_EXT and ext not in VIDEO_EXT:
        abort(404)
    st = target.stat()
    key = hashlib.sha1(f"{target}|{st.st_size}|{st.st_mtime}|{big}".encode()).hexdigest()
    cache = paths().cache / ("fpreview" if big else "fthumbs") / key[:2] / f"{key}.jpg"
    if not cache.exists():
        if not make_thumb(target, cache, 1920 if big else 240, ext in VIDEO_EXT):
            icon = "video.svg" if ext in VIDEO_EXT else "image.svg"
            return send_file(Path(current_app.static_folder) / "img" / icon, mimetype="image/svg+xml")
    return send_file(cache, mimetype="image/jpeg", max_age=86400 * 30)


@bp.get("/api/files/zip")
@login_required
def api_zip():
    user = current_user()
    entries = []
    vps = request.args.getlist("p")
    for vp in vps:
        _root, target = resolve(user, vp)
        if target.exists():
            entries.extend(walk_files(target, target.name))
    if not entries:
        abort(404, "لا توجد ملفات")
    name = (Path(split(vps[0])[-1]).stem if len(vps) == 1 else "files") or "files"
    return Response(zip_generator(entries), mimetype="application/zip",
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_quote(name)}-{int(time.time())}.zip"})


def _quote(s: str) -> str:
    from urllib.parse import quote
    return quote(s)


@bp.get("/api/files/text")
@login_required
def api_text_get():
    _root, target = resolve(current_user(), request.args.get("path", ""))
    if not target.is_file():
        abort(404)
    if target.stat().st_size > TEXT_LIMIT:
        abort(413, "الملف كبير جداً للتحرير")
    raw = target.read_bytes()
    for enc in ("utf-8-sig", "cp1256", "latin-1"):
        try:
            return jsonify(content=raw.decode(enc), encoding=enc)
        except UnicodeDecodeError:
            continue
    abort(415)


@bp.post("/api/files/text")
@login_required
def api_text_save():
    data = body()
    root, target = resolve(current_user(), data.get("path", ""), need_write=True)
    if target.exists() and not target.is_file():
        abort(400)
    content = data.get("content", "")
    if not isinstance(content, str) or len(content.encode()) > TEXT_LIMIT:
        abort(413, "النص كبير جداً")
    tmp = target.with_name(f".{target.name}.saving")
    tmp.write_text(content, encoding="utf-8")
    os.replace(tmp, target)
    log_action("تعديل ملف نصي", to_vpath(root, target))
    return jsonify(ok=True)


@bp.get("/api/files/info")
@login_required
def api_info():
    root, target = resolve(current_user(), request.args.get("path", ""))
    if not target.exists():
        abort(404)
    st = target.stat()
    info = {"name": target.name or root.label, "path": to_vpath(root, target), "dir": target.is_dir(),
            "mtime": st.st_mtime, "ctime": st.st_ctime, "size": st.st_size, "files": 0, "folders": 0}
    if target.is_dir():
        size = files = folders = 0
        for n, (dirpath, dirnames, filenames) in enumerate(os.walk(target)):
            folders += len(dirnames)
            for fn in filenames:
                try:
                    size += (Path(dirpath) / fn).stat().st_size
                    files += 1
                except OSError:
                    pass
            if n > 50000:
                break
        info.update(size=size, files=files, folders=folders)
    return jsonify(info)
