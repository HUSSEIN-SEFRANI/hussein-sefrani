"""رصيد النجوم للعائلة.

- لكل شخص في العائلة (من له ملف على التلفاز) رصيد يبدأ بـ 10 نجوم.
- الأب والأم (ملف «بالغ») يضيفون نجوماً أو يخصمونها مع ذكر السبب.
- كل شخص يستطيع تحويل نجوم من رصيده لغيره مع كتابة السبب (الوالدان أيضاً).
- التطبيقات التعليمية على التلفاز تضيف نجمة واحدة عند إنهاء الدرس (POST /api/tv/stars/earn)، بحدّ يومي يضبطه
  الأب أو الأم. الألعاب لا تضيف نجوماً (v1.9.6). السيرفر هو الذي يقرر حسب مكان التطبيق، لا التطبيق نفسه.
- كل شيء مسجّل في سجل يراه الجميع.
يعمل من التلفاز (جلسة التلفاز) ومن الهاتف أو الكمبيوتر (تسجيل الدخول العادي).
"""
from __future__ import annotations

import re
from datetime import date, datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

from flask import Blueprint, abort, jsonify, request
from werkzeug.security import check_password_hash

from .core import body, current_user, get_db, get_setting, log_action, login_required, now_iso, set_setting

bp = Blueprint("stars", __name__)

START = 10
MAX_MOVE = 100
GAME_MAX_ONE = 10        # أكبر عدد يقبله الطلب (يبقى للتوافق مع الألعاب القديمة؛ التعليم يُعطى نجمة واحدة)
GAME_DAILY_DEFAULT = 20  # الحد اليومي لنجوم التعليم لكل شخص (كل التطبيقات معاً)
LEARN_STARS = 1          # إنهاء الدرس في تطبيق تعليمي = نجمة واحدة
LEARN_REPEAT_SEC = 20    # طلب ثانٍ من نفس التطبيق خلال 20 ثانية = نفس الدرس (لا نجمة ثانية)
EARN_KINDS = ("game", "learn")   # «game»: سجلات قديمة قبل v1.9.6
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


def game_daily_limit() -> int:
    try:
        return max(0, min(500, int(get_setting("stars_game_daily") or GAME_DAILY_DEFAULT)))
    except ValueError:
        return GAME_DAILY_DEFAULT


def earned_today(db, uid: int) -> int:
    """نجوم التعليم (والألعاب قديماً) التي ربحها الشخص اليوم (حسب ساعة السيرفر)."""
    row = db.execute("SELECT COALESCE(SUM(amount),0) AS n FROM stars_log WHERE kind IN ('game','learn') AND to_id=? AND ts>=?",
                     (uid, date.today().isoformat())).fetchone()
    return int(row["n"])


def caller_app(u) -> tuple[str, str]:
    """من أي تطبيق جاء الطلب؟ من عنوان الصفحة التي أرسلته (/tv/game/<المربع>/<التطبيق>/...).
    يرجع (النوع، اسم التطبيق): النوع «learn» للتعليم و«games» لغيره (وكذلك إن لم يُعرف المصدر)."""
    m = re.match(r"^/tv/game/(\d+)/(.*)$", urlparse(request.referrer or "").path)
    if not m:
        return "games", ""
    from .core import paths
    from .tv import app_category, safe_sub, tile_folder
    db = get_db()
    t = db.execute("SELECT * FROM tv_tiles WHERE id=? AND user_id=? AND enabled=1", (int(m.group(1)), u["id"])).fetchone()
    if not t or t["kind"] in ("photos", "cameras"):
        return "games", ""
    base = tile_folder(u, t)
    if base is None:
        return "games", ""
    parts = [unquote(x) for x in m.group(2).split("/") if x]
    if parts and "." in parts[-1]:
        parts.pop()   # اسم الملف (index.html)
    try:
        app_dir = safe_sub(base, "/".join(parts))   # مجلد التطبيق (الذي فيه index.html) داخل مجلد المربع
    except Exception:
        return "games", ""
    return app_category(Path(app_dir), db, paths()), (parts[-1] if parts else t["title"])


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
    log = [{"id": r["id"], "ts": r["ts"], "kind": r["kind"], "amount": r["amount"],
            "reason": re.sub(r"^\[[^\]]*\]\s*", "", r["reason"] or ""),   # [التطبيق] علامة داخلية لمنع التكرار
            "by": names.get(r["by_id"]), "from": names.get(r["from_id"]), "to": names.get(r["to_id"]),
            "to_id": r["to_id"], "from_id": r["from_id"]}
           for r in db.execute("SELECT * FROM stars_log ORDER BY id DESC LIMIT 40")]
    mine = next((p for p in people if me and p["id"] == me["id"]), None)
    return {"people": people, "log": log, "me": me["id"] if me else None, "my_balance": mine["balance"] if mine else None,
            "can_manage": can_manage, "start": START, "game_daily": game_daily_limit()}


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
    bal = balance(db, me["id"])
    if bal < amount:
        hint = "، ولتعطي نجوماً دون أن ينقص رصيدك اختر «⭐ أعطِ نجوماً»" if is_parent(me) else ""
        abort(400, f"الإهداء من رصيدك، ورصيدك ⭐ {bal} فقط{hint}")
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


@bp.post("/api/tv/stars/earn")
def api_tv_stars_earn():
    """تطبيق تعليمي على التلفاز أنهى الطفل فيه درساً: نجمة واحدة للشخص الذي يلعب الآن.
    JSON: {amount: 1..10, game: "اسم التطبيق", reason: "السبب"}  (amount يبقى للتوافق، والمُضاف دائماً نجمة واحدة)
    يرجع 200 مع: added (ما أُضيف فعلاً: 1، أو 0 للألعاب أو عند بلوغ الحد اليومي أو تكرار نفس الدرس)،
    balance، today، limit، capped، learn (هل التطبيق تعليمي)."""
    from .tv import tv_user
    u = tv_user()
    d = body()
    try:
        amount = int(d.get("amount"))
    except (TypeError, ValueError):
        abort(400, "amount غير صالح")
    if not 1 <= amount <= GAME_MAX_ONE:
        abort(400, f"amount من 1 إلى {GAME_MAX_ONE}")
    game = " ".join(str(d.get("game") or "").split())[:40]
    reason = " ".join(str(d.get("reason") or "").split())[:80]
    if not game:
        abort(400, "اسم اللعبة (game) مطلوب")
    db = get_db()
    kind, app = caller_app(u)
    limit, today = game_daily_limit(), earned_today(db, u["id"])
    bal = balance(db, u["id"])
    added = 0
    if kind == "learn":
        added = max(0, min(LEARN_STARS, limit - today))
        tag = f"[{app or game}]"
        last = db.execute("SELECT ts FROM stars_log WHERE kind='learn' AND to_id=? AND reason LIKE ? ORDER BY id DESC LIMIT 1",
                          (u["id"], tag.replace("%", "") + "%")).fetchone()
        if added and last:
            try:
                if (datetime.now() - datetime.fromisoformat(last["ts"])).total_seconds() < LEARN_REPEAT_SEC:
                    added = 0   # التطبيق ومكتبة الألعاب أرسلا معاً عند نهاية الدرس نفسه
            except ValueError:
                pass
        if added:
            db.execute("UPDATE stars SET balance=balance+? WHERE user_id=?", (added, u["id"]))
            db.execute("INSERT INTO stars_log(ts, by_id, from_id, to_id, amount, kind, reason) VALUES(?,?,?,?,?,?,?)",
                       (now_iso(), u["id"], None, u["id"], added, "learn", f"{tag} {game}: {reason}" if reason else f"{tag} {game}"))
    db.commit()
    return jsonify(ok=True, added=added, balance=bal + added, today=today + added, limit=limit,
                   capped=kind == "learn" and added < LEARN_STARS, learn=kind == "learn")


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


@bp.post("/api/stars/settings")
@login_required
def api_stars_settings():
    """الحد اليومي لنجوم التعليم (للأب والأم والمدير). 0 = التطبيقات التعليمية لا تضيف نجوماً."""
    u = current_user()
    if not _web_can_manage(u):
        abort(403, "للأب والأم فقط")
    try:
        n = max(0, min(500, int(body().get("game_daily"))))
    except (TypeError, ValueError):
        abort(400, "رقم غير صالح")
    set_setting("stars_game_daily", str(n))
    log_action("نجوم التعليم: الحد اليومي", str(n), u["username"])
    return jsonify(board(u, True))


@bp.post("/api/stars/adjust")
@login_required
def api_stars_adjust():
    u = current_user()
    if not _web_can_manage(u):
        abort(403, "إضافة النجوم وخصمها للأب والأم فقط")
    do_adjust(u, body())
    return jsonify(board(u, True))
