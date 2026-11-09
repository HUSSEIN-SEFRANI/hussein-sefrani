"""روابط المشاركة: مشاركة ملف أو مجلد أو ألبوم برابط (مع كلمة مرور وتاريخ انتهاء اختياريين)."""
from __future__ import annotations

import os
import secrets
import time
from datetime import datetime, timedelta

from flask import Blueprint, Response, abort, jsonify, render_template, request, send_file, session
from werkzeug.security import check_password_hash, generate_password_hash

from .core import (RECYCLE, body, current_user, get_db, log_action, login_required, now_iso, walk_files,
                   zip_generator)
from .photos import ITEM_COLS, libraries_for, media_for, media_path, send_thumb, send_view
from .vfs import resolve, split, to_vpath

bp = Blueprint("links", __name__)


def link_url(token: str) -> str:
    return f"{request.host_url}s/{token}"


def link_dict(r) -> dict:
    d = {k: r[k] for k in ("id", "token", "kind", "target", "title", "expires_at", "views", "created_at")}
    d["has_password"] = bool(r["password_hash"])
    d["url"] = link_url(r["token"])
    d["expired"] = bool(r["expires_at"] and r["expires_at"] < now_iso())
    if "owner" in r.keys():
        d["owner"] = r["owner"]
    return d


@bp.get("/api/links")
@login_required
def api_links():
    user = current_user()
    db = get_db()
    if user["is_admin"] and request.args.get("all"):
        rows = db.execute("SELECT l.*, u.username AS owner FROM links l JOIN users u ON u.id=l.owner_id"
                          " ORDER BY l.created_at DESC").fetchall()
    else:
        rows = db.execute("SELECT l.*, u.username AS owner FROM links l JOIN users u ON u.id=l.owner_id"
                          " WHERE owner_id=? ORDER BY l.created_at DESC", (user["id"],)).fetchall()
    return jsonify([link_dict(r) for r in rows])


@bp.post("/api/links")
@login_required
def api_link_create():
    user = current_user()
    data = body()
    kind = data.get("kind")
    target = str(data.get("target") or "")
    db = get_db()
    if kind == "path":
        root, p = resolve(user, target)
        if not p.exists():
            abort(404, "غير موجود")
        target = to_vpath(root, p)
        title = p.name or root.label
    elif kind == "album":
        a = db.execute("SELECT * FROM albums WHERE id=? AND owner_id=?", (target, user["id"])).fetchone()
        if not a:
            abort(404, "الألبوم غير موجود")
        title = a["name"]
    else:
        abort(400)
    pw = (data.get("password") or "").strip()
    days = data.get("expires_days")
    expires = None
    if days:
        try:
            expires = (datetime.now() + timedelta(days=float(days))).isoformat(timespec="seconds")
        except (TypeError, ValueError):
            abort(400, "مدة غير صالحة")
    token = secrets.token_urlsafe(9)
    db.execute("INSERT INTO links(token, owner_id, kind, target, title, password_hash, expires_at, created_at)"
               " VALUES (?,?,?,?,?,?,?,?)",
               (token, user["id"], kind, target, title, generate_password_hash(pw) if pw else None,
                expires, now_iso()))
    db.commit()
    log_action("إنشاء رابط مشاركة", title)
    return jsonify(ok=True, url=link_url(token), token=token)


@bp.delete("/api/links/<int:lid>")
@login_required
def api_link_delete(lid):
    user = current_user()
    db = get_db()
    row = db.execute("SELECT * FROM links WHERE id=?", (lid,)).fetchone()
    if not row or (row["owner_id"] != user["id"] and not user["is_admin"]):
        abort(404)
    db.execute("DELETE FROM links WHERE id=?", (lid,))
    db.commit()
    return jsonify(ok=True)


# ==========================================================================
# الصفحة العامة للرابط (بدون تسجيل دخول)
# ==========================================================================

def load_link(token: str, check_auth: bool = True):
    db = get_db()
    link = db.execute("SELECT * FROM links WHERE token=?", (token,)).fetchone()
    if not link or (link["expires_at"] and link["expires_at"] < now_iso()):
        abort(404, "الرابط غير موجود أو انتهت صلاحيته")
    owner = db.execute("SELECT * FROM users WHERE id=? AND disabled=0", (link["owner_id"],)).fetchone()
    if not owner:
        abort(404, "الرابط غير متاح")
    if check_auth and link["password_hash"] and token not in session.get("links", []):
        abort(401, "هذا الرابط محمي بكلمة مرور")
    return link, owner


def link_path(link, owner, sub: str = ""):
    if link["kind"] != "path":
        abort(404)
    parts = split(sub)
    if RECYCLE in parts:
        abort(404)
    vp = link["target"] + ("/" + "/".join(parts) if parts else "")
    _root, p = resolve(owner, vp)
    if not p.exists():
        abort(404, "غير موجود")
    return p


@bp.get("/s/<token>")
def share_page(token):
    try:
        link, _owner = load_link(token, check_auth=False)
    except Exception:
        return render_template("share.html", token=token, missing=True), 404
    db = get_db()
    db.execute("UPDATE links SET views=views+1 WHERE id=?", (link["id"],))
    db.commit()
    return render_template("share.html", token=token, missing=False, title=link["title"])


@bp.post("/s/<token>/auth")
def share_auth(token):
    link, _ = load_link(token, check_auth=False)
    if link["password_hash"] and not check_password_hash(link["password_hash"], body().get("password", "")):
        time.sleep(1)
        return jsonify(error="كلمة المرور غير صحيحة"), 403
    session["links"] = (session.get("links", []) + [token])[-50:]
    return jsonify(ok=True)


@bp.get("/s/<token>/api/info")
def share_info(token):
    link, owner = load_link(token)
    info = {"kind": link["kind"], "title": link["title"], "owner": owner["username"],
            "expires_at": link["expires_at"]}
    if link["kind"] == "path":
        p = link_path(link, owner)
        info["is_dir"] = p.is_dir()
        info["size"] = 0 if p.is_dir() else p.stat().st_size
        info["name"] = p.name
    return jsonify(info)


@bp.get("/s/<token>/api/list")
def share_list(token):
    link, owner = load_link(token)
    p = link_path(link, owner, request.args.get("sub", ""))
    if not p.is_dir():
        abort(400)
    items = []
    for e in sorted(os.scandir(p), key=lambda e: (not e.is_dir(), e.name.casefold())):
        if e.name.startswith(".") or e.name == RECYCLE:
            continue
        st = e.stat()
        items.append({"name": e.name, "dir": e.is_dir(), "size": 0 if e.is_dir() else st.st_size,
                      "mtime": st.st_mtime, "ext": os.path.splitext(e.name)[1].lower().lstrip(".")})
    return jsonify(items=items)


@bp.get("/s/<token>/raw")
def share_raw(token):
    link, owner = load_link(token)
    p = link_path(link, owner, request.args.get("sub", ""))
    if not p.is_file():
        abort(404)
    dl = request.args.get("dl") == "1"
    return send_file(p, as_attachment=dl, download_name=p.name, conditional=True,
                     mimetype=None if dl or p.suffix.lower() not in {".html", ".htm", ".svg", ".xml"} else "text/plain")


@bp.get("/s/<token>/thumb")
def share_thumb(token):
    from .files import thumb_response
    link, owner = load_link(token)
    p = link_path(link, owner, request.args.get("sub", ""))
    return thumb_response(p, request.args.get("s") == "big")


@bp.get("/s/<token>/zip")
def share_zip(token):
    link, owner = load_link(token)
    if link["kind"] == "album":
        entries = [(media_path(owner, r), r["name"]) for r in album_rows(link, owner)]
    else:
        p = link_path(link, owner, request.args.get("sub", ""))
        entries = list(walk_files(p, p.name))
        entries = [(s, a) for s, a in entries if f"/{RECYCLE}/" not in f"/{a}/"]
    if not entries:
        abort(404)
    return Response(zip_generator(entries), mimetype="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="share-{token}.zip"'})


def album_rows(link, owner):
    libs = [x["id"] for x in libraries_for(owner)]
    ph = ",".join("?" * len(libs))
    return get_db().execute(
        f"SELECT {ITEM_COLS}, m.sha256 FROM media m JOIN album_items ai ON ai.media_id=m.id"
        f" WHERE ai.album_id=? AND m.library IN ({ph}) ORDER BY m.taken_at DESC",
        [int(link["target"])] + libs).fetchall()


@bp.get("/s/<token>/api/items")
def share_items(token):
    link, owner = load_link(token)
    if link["kind"] != "album":
        abort(404)
    return jsonify(items=[{k: r[k] for k in ("id", "name", "size", "is_video", "width", "height", "taken_at")}
                          for r in album_rows(link, owner)])


def album_media(link, owner, mid: int):
    if link["kind"] != "album":
        abort(404)
    if not get_db().execute("SELECT 1 FROM album_items WHERE album_id=? AND media_id=?",
                            (int(link["target"]), mid)).fetchone():
        abort(404)
    row = media_for(owner, mid)
    return row, media_path(owner, row)


@bp.get("/s/<token>/m/<int:mid>/<what>")
def share_media(token, mid, what):
    link, owner = load_link(token)
    row, p = album_media(link, owner, mid)
    if what == "thumb":
        return send_thumb(row, p)
    if what == "view":
        return send_view(row, p)
    if what == "download":
        return send_file(p, as_attachment=True, download_name=row["name"], conditional=True)
    abort(404)
