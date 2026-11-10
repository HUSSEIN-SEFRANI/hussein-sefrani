"""رصيد النجوم للعائلة.

- لكل شخص في العائلة (من له ملف على التلفاز) رصيد يبدأ بـ 10 نجوم.
- الأب والأم (ملف «بالغ») يضيفون نجوماً أو يخصمونها مع ذكر السبب.
- كل شخص يستطيع تحويل نجوم من رصيده لغيره مع كتابة السبب (الوالدان أيضاً).
- كل شيء مسجّل في سجل يراه الجميع.
يعمل من التلفاز (جلسة التلفاز) ومن الهاتف أو الكمبيوتر (تسجيل الدخول العادي).
"""
from __future__ import annotations

from flask import Blueprint, abort, jsonify
from werkzeug.security import check_password_hash

from .core import body, current_user, get_db, log_action, login_required, now_iso

bp = Blueprint("stars", __name__)

START = 10
MAX_MOVE = 100
SCHEMA = """
CREATE TABLE IF NOT EXISTS stars (user_id INTEGER PRIMARY KEY, balance INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS stars_log (
    id INTEGER PRIMARY KEY, ts TEXT NOT NULL, by_id INTEGER, from_id INTEGER, to_id INTEGER,
    amount INTEGER NOT NULL, kind TEXT NOT NULL, reason TEXT
);
CREATE INDEX IF NOT EXISTS stars_log_ts ON stars_log(id DESC);
"""


def migrate(db):
    db.executescript(SCHEMA)
    db.commit()


def members(db):
    return db.execute("SELECT * FROM users WHERE disabled=0 AND COALESCE(tv_role,'none')!='none' ORDER BY id").fetchall()


def balance(db, uid: int) -> int:
    db.execute("INSERT OR IGNORE INTO stars(user_id, balance) VALUES(?,?)", (uid, START))
    return db.execute("SELECT balance FROM stars WHERE user_id=?", (uid,)).fetchone()["balance"]


def is_parent(u) -> bool:
    return bool(u) and ((u["tv_role"] or "") == "adult")


def board(me, can_manage: bool) -> dict:
    from .tv import display_name
    db = get_db()
    people = []
    for u in members(db):
        people.append({"id": u["id"], "name": display_name(u), "role": u["tv_role"], "avatar": u["avatar"] or 0,
                       "photo_v": u["photo_v"] or 0, "balance": balance(db, u["id"]), "parent": is_parent(u)})
    db.commit()
    names = {p["id"]: p["name"] for p in people}
    for u in db.execute("SELECT id, username, display_name FROM users"):
        names.setdefault(u["id"], (u["display_name"] or "").strip() or u["username"])
    log = [{"id": r["id"], "ts": r["ts"], "kind": r["kind"], "amount": r["amount"], "reason": r["reason"] or "",
            "by": names.get(r["by_id"]), "from": names.get(r["from_id"]), "to": names.get(r["to_id"]),
            "to_id": r["to_id"], "from_id": r["from_id"]}
           for r in db.execute("SELECT * FROM stars_log ORDER BY id DESC LIMIT 40")]
    mine = next((p for p in people if me and p["id"] == me["id"]), None)
    return {"people": people, "log": log, "me": me["id"] if me else None, "my_balance": mine["balance"] if mine else None,
            "can_manage": can_manage, "start": START}


def _parse(d, me_id: int | None):
    db = get_db()
    try:
        to, amount = int(d.get("to") or 0), int(d.get("amount") or 0)
    except (TypeError, ValueError):
        abort(400)
    reason = " ".join(str(d.get("reason") or "").split())[:80]
    if not reason:
        abort(400, "اكتب السبب")
    if not 1 <= amount <= MAX_MOVE:
        abort(400, f"العدد من 1 إلى {MAX_MOVE}")
    target = db.execute("SELECT * FROM users WHERE id=? AND disabled=0 AND COALESCE(tv_role,'none')!='none'", (to,)).fetchone()
    if not target:
        abort(404, "الشخص غير موجود")
    if me_id is not None and to == me_id:
        abort(400, "اختر شخصاً آخر")
    return target, amount, reason


def do_transfer(me, d):
    if not me or (me["tv_role"] or "none") == "none":
        abort(403, "ليس لك رصيد نجوم")
    target, amount, reason = _parse(d, me["id"])
    db = get_db()
    if balance(db, me["id"]) < amount:
        abort(400, "رصيدك لا يكفي")
    balance(db, target["id"])
    db.execute("UPDATE stars SET balance=balance-? WHERE user_id=?", (amount, me["id"]))
    db.execute("UPDATE stars SET balance=balance+? WHERE user_id=?", (amount, target["id"]))
    db.execute("INSERT INTO stars_log(ts, by_id, from_id, to_id, amount, kind, reason) VALUES(?,?,?,?,?,?,?)",
               (now_iso(), me["id"], me["id"], target["id"], amount, "transfer", reason))
    db.commit()
    log_action("تحويل نجوم", f"{amount} → {target['username']}: {reason}", me["username"])


def do_adjust(me, d):
    kind = d.get("kind")
    if kind not in ("give", "take"):
        abort(400)
    target, amount, reason = _parse(d, None)
    db = get_db()
    cur = balance(db, target["id"])
    if kind == "take":
        amount = min(amount, cur)
        if amount <= 0:
            abort(400, "الرصيد صفر")
    db.execute("UPDATE stars SET balance=balance+? WHERE user_id=?", (amount if kind == "give" else -amount, target["id"]))
    db.execute("INSERT INTO stars_log(ts, by_id, from_id, to_id, amount, kind, reason) VALUES(?,?,?,?,?,?,?)",
               (now_iso(), me["id"], None, target["id"], amount, kind, reason))
    db.commit()
    log_action("نجوم: " + ("إضافة" if kind == "give" else "خصم"), f"{amount} {target['username']}: {reason}", me["username"])


# ----------------------------------------------------------------------------- من التلفاز
def _tv_parent():
    from .tv import tv_user
    u = tv_user()
    if not is_parent(u):
        abort(403, "إضافة النجوم وخصمها للأب والأم فقط")
    if not u["tv_pin"]:
        abort(403, "ضع رمز دخول (PIN) لحسابك على التلفاز أولاً، من لوحة التحكم ← وضع التلفاز")
    return u


@bp.get("/api/tv/stars")
def api_tv_stars():
    from .tv import tv_user
    u = tv_user()
    return jsonify(board(u, is_parent(u) and bool(u["tv_pin"])) | {"has_pin": bool(u["tv_pin"])})


@bp.post("/api/tv/stars/transfer")
def api_tv_stars_transfer():
    from .tv import tv_user
    u = tv_user()
    d = body()
    if u["tv_pin"] and not check_password_hash(u["tv_pin"], str(d.get("pin") or "")):
        abort(403, "الرمز غير صحيح")
    do_transfer(u, d)
    return jsonify(board(u, is_parent(u) and bool(u["tv_pin"])))


@bp.post("/api/tv/stars/adjust")
def api_tv_stars_adjust():
    u = _tv_parent()
    do_adjust(u, body())
    return jsonify(board(u, True))


# ----------------------------------------------------------------------------- من الهاتف أو الكمبيوتر
def _web_can_manage(u) -> bool:
    return is_parent(u) or bool(u["is_admin"])


@bp.get("/api/stars")
@login_required
def api_stars():
    u = current_user()
    return jsonify(board(u, _web_can_manage(u)))


@bp.post("/api/stars/transfer")
@login_required
def api_stars_transfer():
    u = current_user()
    do_transfer(u, body())
    return jsonify(board(u, _web_can_manage(u)))


@bp.post("/api/stars/adjust")
@login_required
def api_stars_adjust():
    u = current_user()
    if not _web_can_manage(u):
        abort(403, "إضافة النجوم وخصمها للأب والأم فقط")
    do_adjust(u, body())
    return jsonify(board(u, True))
