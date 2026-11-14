"""مزايا الأطفال والعائلة على التلفاز: صور العائلة للألعاب، ونتائج التعلّم لتقرير الأهل.

واجهات الألعاب موثّقة في games/_kit/API.txt.
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

from flask import Blueprint, abort, jsonify, request, send_file

from .core import body, get_db, get_setting, now_iso, paths

bp = Blueprint("kids", __name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS learn_results (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    game TEXT NOT NULL,
    topic TEXT,
    ok INTEGER NOT NULL,
    ts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS learn_results_user_ts ON learn_results(user_id, ts);
"""


def migrate(db) -> None:
    db.executescript(SCHEMA)
    cutoff = (dt.datetime.now() - dt.timedelta(days=180)).isoformat(timespec="seconds")
    db.execute("DELETE FROM learn_results WHERE ts < ?", (cutoff,))
    db.commit()


def _tv_user():
    from .tv import tv_user
    return tv_user()


# ----------------------------------------------------------------------------- مكتبات الصور التي يراها الشخص على التلفاز
def tv_libraries(u) -> list[str]:
    """مكتبته، والمساحة المشتركة إن كان له حق فيها، ومكتبات من اختار «صوري على التلفاز»."""
    db = get_db()
    libs = [f"u:{u['id']}"]
    sid = get_setting("photo_shared_folder")
    if sid:
        from .vfs import folder_perm
        try:
            if folder_perm(u, int(sid)):
                libs.append("s")
        except (TypeError, ValueError):
            pass
    for r in db.execute("SELECT key FROM settings WHERE key LIKE 'dlna_user_%' AND value='1'"):
        try:
            libs.append(f"u:{int(r['key'].split('_')[-1])}")
        except ValueError:
            pass
    return list(dict.fromkeys(libs))


def library_base(library: str) -> Path | None:
    db = get_db()
    if library.startswith("u:"):
        row = db.execute("SELECT username FROM users WHERE id=?", (int(library[2:]),)).fetchone()
        return paths().homes / row["username"] / "Photos" if row else None
    if library == "s":
        sid = get_setting("photo_shared_folder")
        row = db.execute("SELECT path FROM folders WHERE id=?", (sid,)).fetchone() if sid else None
        return Path(row["path"]) if row else None
    return None


# ----------------------------------------------------------------------------- صور العائلة للألعاب
@bp.get("/api/tv/family/people")
def api_family_people():
    """الأشخاص المسمَّون في «الأشخاص» (تمييز الوجوه) من الصور التي يراها هذا الطفل."""
    u = _tv_user()
    libs = tv_libraries(u)
    limit = max(1, min(60, request.args.get("limit", 40, type=int)))
    per = max(1, min(12, request.args.get("faces", 6, type=int)))
    from .faces import engine
    cache = engine().cache
    q = ",".join("?" * len(libs))
    db = get_db()
    rows = db.execute(
        f"""SELECT p.id, p.name, COUNT(f.id) AS n FROM persons p JOIN faces f ON f.person_id=p.id
            WHERE p.library IN ({q}) AND p.name IS NOT NULL AND TRIM(p.name)!='' AND p.hidden=0
            GROUP BY p.id ORDER BY n DESC LIMIT ?""", (*libs, limit)).fetchall()
    people = []
    for r in rows:
        fids = [f["id"] for f in db.execute(
            "SELECT id FROM faces WHERE person_id=? ORDER BY score DESC LIMIT ?", (r["id"], per * 3))
            if (cache / f"{f['id']}.jpg").exists()][:per]
        if fids:
            people.append({"id": r["id"], "name": r["name"].strip(), "faces": fids, "count": r["n"]})
    return jsonify(people=people)


def _face_row(fid: int):
    u = _tv_user()
    f = get_db().execute("SELECT f.id, f.media_id, m.library, m.rel_path FROM faces f JOIN media m ON m.id=f.media_id "
                         "JOIN persons p ON p.id=f.person_id WHERE f.id=? AND p.hidden=0", (fid,)).fetchone()
    if not f or f["library"] not in tv_libraries(u):
        abort(404)
    return f


@bp.get("/api/tv/face/<int:fid>")
def api_tv_face(fid):
    """صورة الوجه مربعة (JPEG)."""
    _face_row(fid)
    from .faces import engine
    p = engine().cache / f"{fid}.jpg"
    if not p.exists():
        abort(404)
    return send_file(p, mimetype="image/jpeg", max_age=86400)


@bp.get("/api/tv/face/<int:fid>/photo")
def api_tv_face_photo(fid):
    """الصورة الكاملة التي فيها هذا الوجه (حجم مناسب للشاشة)."""
    f = _face_row(fid)
    base = library_base(f["library"])
    if base is None:
        abort(404)
    p = (base / f["rel_path"]).resolve()
    if not p.is_file():
        abort(404)
    row = get_db().execute("SELECT * FROM media WHERE id=?", (f["media_id"],)).fetchone()
    from .photos import send_view
    return send_view(row, p)


# ----------------------------------------------------------------------------- نتائج التعلّم (لتقرير الأهل الأسبوعي)
@bp.post("/api/tv/learn/result")
def api_learn_result():
    u = _tv_user()
    d = body()
    game = str(d.get("game") or "").strip()[:60]
    if not game:
        abort(400, "game مطلوب")
    topic = str(d.get("topic") or "").strip()[:80] or None
    db = get_db()
    today = dt.date.today().isoformat()
    n = db.execute("SELECT COUNT(*) FROM learn_results WHERE user_id=? AND ts>=?", (u["id"], today)).fetchone()[0]
    if n >= 3000:   # حماية من لعبة فيها خطأ ترسل بلا توقف
        return jsonify(ok=True, stored=False)
    db.execute("INSERT INTO learn_results(user_id, game, topic, ok, ts) VALUES (?,?,?,?,?)",
               (u["id"], game, topic, 1 if d.get("ok") else 0, now_iso()))
    db.commit()
    return jsonify(ok=True, stored=True)
