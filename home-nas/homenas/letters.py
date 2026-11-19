"""البند 46: رسائل العائلة (تطبيق «الرسائل» على التلفاز).

الطفل يكتب رسالة على ورقة العنب، والتطبيق يصنع منها PDF ويرسلها هنا. نحفظ الملف في مجلد كل فرد:
  <المجلد الشخصي>/تلفاز/تطبيقات/الرسائل/{الوارد,الصادر,المحفوظة}
فيجدها أيضاً في «الملفات» وعلى قرص الشبكة. الجدول letters يحفظ من/إلى/الموضوع/النص/قُرئت.
الخدمات (للشخص الذي اختار نفسه على التلفاز، tv_user):
  GET  /api/tv/letters?box=in|out|saved   ← {letters: [...] الأحدث أولاً, unread}
  POST /api/tv/letters/send[?save=1]       ← meta (JSON) + pdf ؛ ← {ok, folder}
  POST /api/tv/letters/<id>/read
  POST /api/tv/letters/<id>/delete?box=…
"""
from __future__ import annotations

import json
import re
import secrets
from pathlib import Path

from flask import Blueprint, abort, jsonify, request, send_file

from .core import INVALID_NAME_CHARS, get_db, home_dir, log_action, now_iso, unique_path

bp = Blueprint("letters", __name__)

BOXES = {"in": "الوارد", "out": "الصادر", "saved": "المحفوظة"}
BASE = ("تلفاز", "تطبيقات", "الرسائل")
MAX_PDF = 15 * 1024 * 1024
SCHEMA = """CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY, owner_id INTEGER NOT NULL, box TEXT NOT NULL, from_id INTEGER, to_id INTEGER,
  ts TEXT NOT NULL, subject TEXT, body TEXT, file TEXT, read INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS letters_owner ON letters(owner_id, box, ts);"""


def db():
    d = get_db()
    d.executescript(SCHEMA)
    return d


def folder_rel(box: str) -> str:
    return "/".join(BASE + (BOXES[box],))


def box_dir(username: str, box: str) -> Path:
    p = home_dir(username).joinpath(*BASE, BOXES[box])
    p.mkdir(parents=True, exist_ok=True)
    return p


def safe_file_name(name: str) -> str:
    """اسم الملف كما يقترحه التطبيق («رسالة من سارة إلى بابا - عيد 2026-11-19») بلا رموز ممنوعة."""
    name = "".join(" " if (c in INVALID_NAME_CHARS or ord(c) < 32) else c for c in str(name or ""))
    name = re.sub(r"\s+", " ", name).strip(" .")[:150]
    return (name or "رسالة") + ".pdf"


def person(u) -> dict:
    from .tv import display_name
    return {"id": u["id"], "name": display_name(u), "photo_v": u["photo_v"] or 0} if u else {"id": 0, "name": "؟"}


def tv_person():
    from .tv import tv_user
    return tv_user()


def check_box(box: str) -> str:
    if box not in BOXES:
        abort(400, "صندوق غير معروف")
    return box


@bp.get("/api/tv/letters")
def api_list():
    u = tv_person()
    box = check_box(request.args.get("box", "in"))
    d = db()
    from .tv import user_row
    cache = {}
    def who(uid):
        if uid not in cache:
            cache[uid] = person(user_row(uid) if uid else None)
        return cache[uid]
    rows = d.execute("SELECT * FROM letters WHERE owner_id=? AND box=? ORDER BY ts DESC LIMIT 500", (u["id"], box)).fetchall()
    letters = [{"id": r["id"], "from": who(r["from_id"]), "to": who(r["to_id"]), "ts": r["ts"], "subject": r["subject"] or "",
                "body": r["body"] or "", "read": bool(r["read"]), "box": box} for r in rows]
    unread = d.execute("SELECT COUNT(*) FROM letters WHERE owner_id=? AND box='in' AND read=0", (u["id"],)).fetchone()[0]
    return jsonify(letters=letters, unread=unread, folder=folder_rel(box))


@bp.post("/api/tv/letters/send")
def api_send():
    u = tv_person()
    save_only = request.args.get("save") == "1"
    try:
        meta = json.loads(request.form.get("meta") or "{}")
    except ValueError:
        abort(400, "بيانات الرسالة غير صالحة")
    f = request.files.get("pdf")
    if not f:
        abort(400, "الرسالة فارغة")
    data = f.read(MAX_PDF + 1)
    if len(data) > MAX_PDF:
        abort(400, "الرسالة كبيرة جداً")
    if not data.startswith(b"%PDF"):
        abort(400, "ملف الرسالة غير صالح")
    subject, text = str(meta.get("subject") or "")[:120], str(meta.get("body") or "")[:20000]
    from .tv import user_row
    if save_only:
        to = u
    else:
        try:
            to = user_row(int(meta.get("to") or 0))
        except (TypeError, ValueError):
            to = None
        if not to or to["disabled"] or (to["tv_role"] or "none") == "none":
            abort(400, "اختر لمن الرسالة")
    fname = safe_file_name(meta.get("name"))
    ts = now_iso()
    d = db()
    from .files import touched
    written = []
    def put(owner, box, read):
        dest = unique_path(box_dir(owner["username"], box) / fname)
        dest.write_bytes(data)
        written.append(dest)
        d.execute("INSERT INTO letters(id, owner_id, box, from_id, to_id, ts, subject, body, file, read) VALUES (?,?,?,?,?,?,?,?,?,?)",
                  (secrets.token_hex(8), owner["id"], box, u["id"], (to["id"] if to else None), ts, subject, text, str(dest), 1 if read else 0))
    if save_only:
        put(u, "saved", True)
    else:
        put(u, "out", True)        # عندي في «الصادر»
        put(to, "in", False)       # عنده في «الوارد»، جديدة
    d.commit()
    try:
        touched(*{p.parent for p in written})
    except Exception:  # noqa: BLE001 - الفهرسة لا تُفشل الإرسال
        pass
    log_action("رسالة" if not save_only else "حفظ رسالة", f"{person(u)['name']} ← {person(to)['name']}", u["username"])
    return jsonify(ok=True, folder=folder_rel("saved" if save_only else "out"))


def own_row(lid: str, uid: int, box: str | None = None):
    q, a = "SELECT * FROM letters WHERE id=? AND owner_id=?", [lid, uid]
    if box:
        q += " AND box=?"; a.append(box)
    r = db().execute(q, a).fetchone()
    if not r:
        abort(404, "الرسالة غير موجودة")
    return r


@bp.post("/api/tv/letters/<lid>/read")
def api_read(lid):
    u = tv_person()
    own_row(lid, u["id"])
    d = db()
    d.execute("UPDATE letters SET read=1 WHERE id=? AND owner_id=?", (lid, u["id"]))
    d.commit()
    return jsonify(ok=True)


@bp.post("/api/tv/letters/<lid>/delete")
def api_delete(lid):
    """يحذف الرسالة من صندوقي فقط (نسخة الآخر تبقى عنده)، وملفها إلى سلة المحذوفات."""
    u = tv_person()
    box = request.args.get("box")
    r = own_row(lid, u["id"], check_box(box) if box else None)
    p = Path(r["file"] or "")
    home = home_dir(u["username"]).resolve()
    if p.name and p.exists() and home in p.resolve().parents:
        from .core import RECYCLE
        bin_ = unique_path(home / RECYCLE / p.name)
        bin_.parent.mkdir(parents=True, exist_ok=True)
        p.replace(bin_)
        try:
            from .files import touched
            touched(p.parent)
        except Exception:  # noqa: BLE001
            pass
    d = db()
    d.execute("DELETE FROM letters WHERE id=? AND owner_id=?", (lid, u["id"]))
    d.commit()
    return jsonify(ok=True)


# ----------------------------------------------------------------------------- التطبيق نفسه (مدمج في النظام)
APP_DIR = Path(__file__).resolve().parent.parent / "static" / "tvapps" / "letters"
KIT_DIR = Path(__file__).resolve().parent.parent / "static" / "kit"


@bp.get("/tv/letters/", defaults={"sub": "index.html"})
@bp.get("/tv/letters/<path:sub>")
def tv_app(sub):
    """يُخدم من ملفات البرنامج (لا من مجلد «الألعاب»)، فيتحدّث مع كل تحديث. kit.js وkit.css من static/kit."""
    from .tv import tv_guard
    tv_guard()
    if sub in ("kit.js", "kit.css"):
        p = KIT_DIR / sub
    else:
        p = (APP_DIR / sub).resolve()
        if APP_DIR.resolve() not in p.parents:
            abort(404)
    if not p.is_file():
        abort(404)
    return send_file(p, conditional=True, max_age=0)


def unread(db_, uid: int) -> int:
    try:
        db_.executescript(SCHEMA)
        return db_.execute("SELECT COUNT(*) FROM letters WHERE owner_id=? AND box='in' AND read=0", (uid,)).fetchone()[0]
    except Exception:  # noqa: BLE001
        return 0

