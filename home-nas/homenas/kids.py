"""مزايا الأطفال والعائلة على التلفاز: صور العائلة للألعاب، ونتائج التعلّم لتقرير الأهل.

واجهات الألعاب موثّقة في games/_kit/API.txt.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import math
import time
from pathlib import Path

from flask import Blueprint, abort, jsonify, request, send_file
from werkzeug.security import check_password_hash

from .core import body, current_user, get_db, get_setting, log_action, login_required, now_iso, paths, set_setting

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
CREATE TABLE IF NOT EXISTS tv_usage (
    user_id INTEGER NOT NULL, day TEXT NOT NULL, game TEXT NOT NULL, kind TEXT NOT NULL,
    seconds INTEGER NOT NULL DEFAULT 0, last REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day, game)
);
CREATE TABLE IF NOT EXISTS chores (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL, icon TEXT, stars INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1, created_at TEXT
);
CREATE TABLE IF NOT EXISTS chore_log (
    id INTEGER PRIMARY KEY, chore_id INTEGER NOT NULL, user_id INTEGER NOT NULL, day TEXT NOT NULL,
    status TEXT NOT NULL, ts TEXT NOT NULL, by_id INTEGER, UNIQUE(chore_id, day)
);
CREATE TABLE IF NOT EXISTS khatma (hyear INTEGER NOT NULL, juz INTEGER NOT NULL, user_id INTEGER NOT NULL, ts TEXT,
    PRIMARY KEY (hyear, juz));
CREATE TABLE IF NOT EXISTS ramadan_done (user_id INTEGER NOT NULL, day TEXT NOT NULL, PRIMARY KEY (user_id, day));
CREATE TABLE IF NOT EXISTS voice_stories (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, by_id INTEGER, file TEXT NOT NULL, mime TEXT,
    created_at TEXT, plays INTEGER NOT NULL DEFAULT 0
);
"""


def migrate(db) -> None:
    db.executescript(SCHEMA)
    cutoff = (dt.datetime.now() - dt.timedelta(days=180)).isoformat(timespec="seconds")
    db.execute("DELETE FROM learn_results WHERE ts < ?", (cutoff,))
    db.execute("DELETE FROM tv_usage WHERE day < ?", (cutoff[:10],))
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


# ============================================================================= مشترك
def _members(db, kids_only=False):
    rows = db.execute("SELECT * FROM users WHERE disabled=0 AND COALESCE(tv_role,'none')!='none' ORDER BY id").fetchall()
    return [r for r in rows if not kids_only or r["tv_role"] in ("kid", "little")]


def _name(u) -> str:
    from .tv import display_name
    return display_name(u)


def _is_kid(u) -> bool:
    return (u["tv_role"] or "") in ("kid", "little")


def _parent():
    """الأب أو الأم (ملف «بالغ» على التلفاز) أو مدير النظام، من الهاتف أو الكمبيوتر."""
    u = current_user()
    if not u:
        abort(401)
    if not (u["is_admin"] or (u["tv_role"] or "") == "adult"):
        abort(403, "هذه الصفحة للأب والأم فقط")
    return u


def grant_stars(db, uid: int, amount: int, kind: str, reason: str, by_id: int | None) -> None:
    from .stars import balance
    balance(db, uid)
    db.execute("UPDATE stars SET balance=balance+? WHERE user_id=?", (amount, uid))
    db.execute("INSERT INTO stars_log(ts, by_id, from_id, to_id, amount, kind, reason) VALUES(?,?,?,?,?,?,?)",
               (now_iso(), by_id, None, uid, amount, "give", reason))


# ============================================================================= «تعلّم ثم العب» ووقت اللعب
# v1.9.6: قائمة DEFAULT_LEARN اليدوية حُذفت: التعليمي هو ما في مجلد «التعليم» (انظر tv.EDU_APPS للنقل الأول)
BEAT = 30   # ثانية بين كل نبضة من التلفاز أثناء اللعب


def learn_games() -> set[str]:
    """التطبيقات التعليمية = ما في المجلد المشترك «التعليم» (v1.9.6). قبله كانت قائمة يدوية (kids_learn_games)."""
    return set(_apps("learn"))


def rules() -> dict:
    try:
        v = json.loads(get_setting("kids_rules") or "{}")
    except ValueError:
        v = {}
    return v if isinstance(v, dict) else {}


def _hm(v, default: str = "") -> str:
    v = str(v or "").strip()
    return v if re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v) else default


def rule_for(uid: int) -> dict:
    r = rules().get(str(uid)) or {}
    return {"play": max(0, int(r.get("play") or 0)), "learn": max(0, int(r.get("learn") or 0)),
            "screen": max(0, int(r.get("screen") or 0)),          # وقت الشاشة اليومي كله (فيديو، أناشيد، ألعاب…)
            "bed": _hm(r.get("bed")), "wake": _hm(r.get("wake"), "07:00")}   # وقت النوم: يُقفل الحساب حتى الاستيقاظ


def _apps(kind: str) -> list[str]:
    from .tv import _only_sub, share_dir
    d = share_dir(get_db(), paths(), kind)
    out = []
    try:
        for x in sorted(d.iterdir()):
            if x.is_dir() and not x.name.startswith((".", "_", "#")) and (
                    (x / "index.html").is_file() or any((s / "index.html").is_file() for s in _only_sub(x))):
                out.append(x.name)
    except OSError:
        pass
    return out


def installed_games() -> list[str]:
    """كل التطبيقات على التلفاز: «الألعاب» و«التعليم» معاً."""
    return sorted(set(_apps("games")) | set(_apps("learn")))


def usage_today(db, uid: int) -> dict:
    day = dt.date.today().isoformat()
    out = {"learn": 0, "play": 0, "screen": 0}
    for r in db.execute("SELECT kind, SUM(seconds) s FROM tv_usage WHERE user_id=? AND day=? GROUP BY kind", (uid, day)):
        out[r["kind"]] = int(r["s"] or 0)
    return out


def _check(u, game: str) -> dict:
    kind = "learn" if game in learn_games() else "play"
    out = {"allowed": True, "kind": kind, "reason": None}
    if not _is_kid(u):
        return out
    r, used = rule_for(u["id"]), usage_today(get_db(), u["id"])
    if r["play"]:
        out["play_left"] = max(0, math.ceil((r["play"] * 60 - used["play"]) / 60))
    if kind == "play":
        if r["play"] and used["play"] >= r["play"] * 60:
            out.update(allowed=False, reason="limit")
        elif r["learn"] and used["learn"] < r["learn"] * 60:
            out.update(allowed=False, reason="learn_first", learn_need=math.ceil((r["learn"] * 60 - used["learn"]) / 60))
    if not out["allowed"]:
        out["learn_games"] = sorted(learn_games())
        lt = get_db().execute("SELECT id FROM tv_tiles WHERE user_id=? AND kind='learn' AND enabled=1 ORDER BY position LIMIT 1",
                              (u["id"],)).fetchone()
        out["learn_tile"] = lt["id"] if lt else None   # التطبيقات التعليمية تُفتح من مربع «التعليم»
    return out


@bp.get("/api/tv/play/check")
def api_play_check():
    u = _tv_user()
    return jsonify(_check(u, (request.args.get("game") or "").strip()[:80]))


@bp.post("/api/tv/play/beat")
def api_play_beat():
    """نبضة كل 30 ثانية من التلفاز أثناء فتح لعبة: تُحسب مدة اللعب والتعلّم لكل طفل."""
    u = _tv_user()
    game = str(body().get("game") or "").strip()[:80]
    if not game:
        abort(400)
    kind = "learn" if game in learn_games() else "play"
    db = get_db()
    day, now = dt.date.today().isoformat(), time.time()
    row = db.execute("SELECT last FROM tv_usage WHERE user_id=? AND day=? AND game=?", (u["id"], day, game)).fetchone()
    if row is None:
        db.execute("INSERT INTO tv_usage(user_id, day, game, kind, seconds, last) VALUES (?,?,?,?,?,?)",
                   (u["id"], day, game, kind, BEAT, now))
    elif now - row["last"] >= BEAT - 8:
        db.execute("UPDATE tv_usage SET seconds=seconds+?, last=?, kind=? WHERE user_id=? AND day=? AND game=?",
                   (BEAT, now, kind, u["id"], day, game))
    db.commit()
    c = _check(u, game)
    return jsonify(stop=not c["allowed"] and c["reason"] == "limit", **c)


# ============================================================================= وقت الشاشة ووقت النوم
SCREEN = "__screen__"    # صف الاستعمال اليومي الكامل للحساب في tv_usage
WARN_SEC = 5 * 60        # تنبيه «باقي 5 دقائق»
EXTRA_MIN = 15           # «وقت إضافي» يضيفه الأب أو الأم برمزه
_extra_fail: dict[int, list] = {}


def _extra(uid: int) -> dict:
    """الدقائق الإضافية لليوم: {"screen": د، "bed": د}"""
    try:
        v = json.loads(get_setting("kids_extra") or "{}").get(str(uid)) or {}
    except ValueError:
        v = {}
    return v if v.get("day") == dt.date.today().isoformat() else {}


def _mins(hm: str) -> int:
    h, m = hm.split(":")
    return int(h) * 60 + int(m)


def kid_status(db, u) -> dict:
    """هل حساب الطفل مقفل الآن (انتهى وقت الشاشة أو حان وقت النوم)؟ مع تنبيه قبل 5 دقائق."""
    if not _is_kid(u):
        return {"locked": False}
    r, ex = rule_for(u["id"]), _extra(u["id"])
    out = {"locked": False, "reason": None, "warn": None, "screen_left": None, "bed": r["bed"] or None}
    if r["screen"]:
        left = (r["screen"] + int(ex.get("screen") or 0)) * 60 - usage_today(db, u["id"])["screen"]
        out["screen_left"] = max(0, math.ceil(left / 60))
        if left <= 0:
            out.update(locked=True, reason="screen")
        elif left <= WARN_SEC:
            out["warn"] = "screen"
    if r["bed"]:
        now = dt.datetime.now()
        m = now.hour * 60 + now.minute
        bed = (_mins(r["bed"]) + int(ex.get("bed") or 0)) % 1440
        wake = _mins(r["wake"] or "07:00")
        night = (m >= bed or m < wake) if bed > wake else (bed <= m < wake)
        if night:
            out.update(locked=True, reason="bed")
        elif 0 < (bed - m) % 1440 <= WARN_SEC // 60 and not out["warn"]:
            out["warn"] = "bed"
    return out


@bp.get("/api/tv/kid/status")
def api_kid_status():
    u = _tv_user()
    return jsonify(kid_status(get_db(), u))


@bp.post("/api/tv/kid/beat")
def api_kid_beat():
    """نبضة كل 30 ثانية ما دام الطفل يستعمل التلفاز (ليس أثناء شاشة التوقف): يُحسب وقت الشاشة اليومي."""
    u = _tv_user()
    db = get_db()
    if _is_kid(u):
        day, now = dt.date.today().isoformat(), time.time()
        row = db.execute("SELECT last FROM tv_usage WHERE user_id=? AND day=? AND game=?", (u["id"], day, SCREEN)).fetchone()
        if row is None:
            db.execute("INSERT INTO tv_usage(user_id, day, game, kind, seconds, last) VALUES (?,?,?,?,?,?)",
                       (u["id"], day, SCREEN, "screen", BEAT, now))
        elif now - row["last"] >= BEAT - 8:
            db.execute("UPDATE tv_usage SET seconds=seconds+?, last=? WHERE user_id=? AND day=? AND game=?",
                       (BEAT, now, u["id"], day, SCREEN))
        db.commit()
    return jsonify(kid_status(db, u))


@bp.post("/api/tv/kid/extra")
def api_kid_extra():
    """«وقت إضافي»: الأب أو الأم يكتب رمزه على التلفاز فيُضاف للطفل 15 دقيقة اليوم (للشاشة أو بعد وقت النوم)."""
    u = _tv_user()
    if not _is_kid(u):
        abort(400)
    fails = [t for t in _extra_fail.get(u["id"], []) if time.time() - t < 600]
    if len(fails) >= 6:
        abort(429, "محاولات كثيرة. انتظر 10 دقائق")
    pin = str(body().get("pin") or "")
    db = get_db()
    parent = None
    for p in db.execute("SELECT id, username, tv_pin FROM users WHERE disabled=0 AND tv_pin IS NOT NULL AND (tv_role='adult' OR is_admin=1)"):
        if check_password_hash(p["tv_pin"], pin):
            parent = p
            break
    if parent is None:
        _extra_fail[u["id"]] = fails + [time.time()]
        abort(403, "الرمز غير صحيح. يحتاج رمز الأب أو الأم")
    st = kid_status(db, u)
    try:
        allx = json.loads(get_setting("kids_extra") or "{}")
    except ValueError:
        allx = {}
    cur = _extra(u["id"]) or {"day": dt.date.today().isoformat()}
    key = "bed" if st.get("reason") == "bed" else "screen"
    if key == "bed":   # بعد وقت النوم: 15 دقيقة من الآن
        r = rule_for(u["id"])
        now = dt.datetime.now()
        cur["bed"] = ((now.hour * 60 + now.minute + EXTRA_MIN) - _mins(r["bed"])) % 1440
    else:
        cur["screen"] = int(cur.get("screen") or 0) + EXTRA_MIN
    allx[str(u["id"])] = cur
    set_setting("kids_extra", json.dumps(allx))
    log_action("وقت إضافي على التلفاز", f"{EXTRA_MIN} دقيقة لـ {_name(u)}", parent["username"])
    return jsonify(kid_status(db, u))


@bp.get("/api/kids/settings")
@login_required
def api_kids_settings():
    _parent()
    db = get_db()
    lg, have = learn_games(), installed_games()
    return jsonify(games=[{"name": g, "learn": g in lg, "installed": g in have} for g in (have or sorted(lg))],
                   kids=[{"id": m["id"], "name": _name(m), "role": m["tv_role"], **rule_for(m["id"]),
                          "today": usage_today(db, m["id"])} for m in _members(db, kids_only=True)])


@bp.post("/api/kids/settings")
@login_required
def api_kids_settings_set():
    u = _parent()
    d = body()
    if isinstance(d.get("learn_games"), list):
        # v1.9.6: «تعليمي» = في مجلد «التعليم». تغيير الاختيار هنا ينقل التطبيق بين المجلدين
        from .tv import share_dir, set_app_type
        want = {str(x)[:80] for x in d["learn_games"]}
        db = get_db()
        for name in set(_apps("games")) | set(_apps("learn")):
            to = "learn" if name in want else "games"
            src = share_dir(db, paths(), "games" if to == "learn" else "learn") / name
            dst = share_dir(db, paths(), to) / name
            if src.is_dir() and not dst.exists():
                src.rename(dst)
                set_app_type(dst, "education" if to == "learn" else "game")
    if isinstance(d.get("rules"), dict):
        cur = rules()
        for k, v in d["rules"].items():
            if isinstance(v, dict):
                cur[str(int(k))] = {"play": max(0, min(600, int(v.get("play") or 0))),
                                    "learn": max(0, min(240, int(v.get("learn") or 0))),
                                    "screen": max(0, min(720, int(v.get("screen") or 0))),
                                    "bed": _hm(v.get("bed")), "wake": _hm(v.get("wake"), "07:00")}
        set_setting("kids_rules", json.dumps(cur))
    log_action("تعلّم ثم العب", "تغيير الإعدادات", u["username"])
    return api_kids_settings()


# ============================================================================= تقرير الأهل
@bp.get("/api/kids/report")
@login_required
def api_kids_report():
    _parent()
    db = get_db()
    days = max(1, min(31, request.args.get("days", 7, type=int)))
    end = dt.date.today()
    start = end - dt.timedelta(days=days - 1)
    s0 = start.isoformat()
    out = []
    for m in _members(db, kids_only=True):
        uid = m["id"]
        per_day = {(start + dt.timedelta(days=i)).isoformat(): {"learn": 0, "play": 0, "screen": 0} for i in range(days)}
        games: dict[str, dict] = {}
        for r in db.execute("SELECT day, game, kind, seconds FROM tv_usage WHERE user_id=? AND day>=?", (uid, s0)):
            if r["day"] in per_day and r["kind"] in per_day[r["day"]]:
                per_day[r["day"]][r["kind"]] += r["seconds"]
            if r["kind"] == "screen":
                continue
            g = games.setdefault(r["game"], {"game": r["game"], "kind": r["kind"], "seconds": 0})
            g["seconds"] += r["seconds"]
        acc = {}
        for r in db.execute("SELECT game, SUM(ok) ok, COUNT(*) n FROM learn_results WHERE user_id=? AND ts>=? GROUP BY game",
                            (uid, s0)):
            acc[r["game"]] = {"game": r["game"], "ok": r["ok"] or 0, "total": r["n"]}
        mistakes = [dict(r) for r in db.execute(
            """SELECT game, topic, SUM(1-ok) wrong, COUNT(*) total FROM learn_results
               WHERE user_id=? AND ts>=? AND topic IS NOT NULL GROUP BY game, topic HAVING wrong>0
               ORDER BY wrong DESC, total DESC LIMIT 10""", (uid, s0))]
        stars = db.execute("SELECT COALESCE(SUM(amount),0) FROM stars_log WHERE to_id=? AND ts>=? AND kind!='take'",
                           (uid, s0)).fetchone()[0]
        chores_done = db.execute("SELECT COUNT(*) FROM chore_log WHERE user_id=? AND day>=? AND status='confirmed'",
                                 (uid, s0)).fetchone()[0]
        total_ok = sum(a["ok"] for a in acc.values())
        total_n = sum(a["total"] for a in acc.values())
        out.append({
            "id": uid, "name": _name(m), "role": m["tv_role"],
            "days": [{"day": k, "learn": round(v["learn"] / 60), "play": round(v["play"] / 60), "screen": round(v["screen"] / 60)}
                     for k, v in per_day.items()],
            "screen_min": round(sum(v["screen"] for v in per_day.values()) / 60),
            "learn_min": round(sum(v["learn"] for v in per_day.values()) / 60),
            "play_min": round(sum(v["play"] for v in per_day.values()) / 60),
            "games": sorted(({**g, "minutes": round(g["seconds"] / 60)} for g in games.values()), key=lambda x: -x["seconds"])[:8],
            "accuracy": sorted(acc.values(), key=lambda x: -x["total"]),
            "answers": total_n, "correct_pct": round(100 * total_ok / total_n) if total_n else None,
            "mistakes": mistakes, "stars": stars, "chores": chores_done,
        })
    return jsonify(start=s0, end=end.isoformat(), kids=out)


# ============================================================================= «في مثل هذا اليوم»
def onthisday_rows(db, u, limit=80):
    libs = tv_libraries(u)
    today = dt.date.today()
    q = ",".join("?" * len(libs))
    return db.execute(
        f"""SELECT id, taken_at FROM media WHERE library IN ({q}) AND is_video=0
            AND substr(taken_at,6,5)=? AND substr(taken_at,1,4)<? ORDER BY taken_at DESC LIMIT ?""",
        (*libs, today.strftime("%m-%d"), str(today.year), limit)).fetchall()


@bp.get("/api/tv/onthisday")
def api_onthisday():
    u = _tv_user()
    rows = onthisday_rows(get_db(), u)
    year = dt.date.today().year
    return jsonify(items=[{"id": r["id"], "year": int(r["taken_at"][:4]), "ago": year - int(r["taken_at"][:4])} for r in rows])


@bp.get("/api/tv/media/<int:mid>/<what>")
def api_tv_media(mid, what):
    """صورة من المكتبات التي يراها هذا الشخص على التلفاز (لـ«في مثل هذا اليوم»)."""
    u = _tv_user()
    row = get_db().execute("SELECT * FROM media WHERE id=?", (mid,)).fetchone()
    if not row or row["library"] not in tv_libraries(u):
        abort(404)
    base = library_base(row["library"])
    p = (base / row["rel_path"]).resolve() if base else None
    if not p or not p.is_file():
        abort(404)
    from .photos import send_thumb, send_view
    if what == "thumb":
        return send_thumb(row, p)
    if what == "view":
        return send_view(row, p)
    abort(404)


# ============================================================================= لوحة المهام اليومية
CHORE_ICONS = ["🛏️", "🧸", "🦷", "🕌", "📚", "🍽️", "🧺", "🪴", "🐱", "🧹", "👕", "💧", "🤲", "⭐"]


def _chores_for(db, uid, day):
    rows = db.execute("SELECT * FROM chores WHERE user_id=? AND active=1 ORDER BY id", (uid,)).fetchall()
    log = {r["chore_id"]: r["status"] for r in db.execute("SELECT chore_id, status FROM chore_log WHERE user_id=? AND day=?",
                                                         (uid, day))}
    return [{"id": r["id"], "title": r["title"], "icon": r["icon"] or "⭐", "stars": r["stars"], "status": log.get(r["id"])}
            for r in rows]


@bp.get("/api/tv/chores")
def api_tv_chores():
    u = _tv_user()
    return jsonify(items=_chores_for(get_db(), u["id"], dt.date.today().isoformat()))


@bp.post("/api/tv/chores/<int:cid>/done")
def api_tv_chore_done(cid):
    """الطفل يضع علامة «فعلتها»؛ النجوم تُضاف عندما يؤكد الأب أو الأم."""
    u = _tv_user()
    db = get_db()
    c = db.execute("SELECT * FROM chores WHERE id=? AND user_id=? AND active=1", (cid, u["id"])).fetchone()
    if not c:
        abort(404)
    day = dt.date.today().isoformat()
    row = db.execute("SELECT status FROM chore_log WHERE chore_id=? AND day=?", (cid, day)).fetchone()
    if row and row["status"] == "confirmed":
        abort(400, "أكّدها الأهل وأُضيفت النجوم")
    if row:
        db.execute("DELETE FROM chore_log WHERE chore_id=? AND day=?", (cid, day))   # تراجع
    else:
        db.execute("INSERT INTO chore_log(chore_id, user_id, day, status, ts) VALUES (?,?,?,?,?)",
                   (cid, u["id"], day, "done", now_iso()))
    db.commit()
    return jsonify(items=_chores_for(db, u["id"], day))


@bp.get("/api/kids/chores")
@login_required
def api_kids_chores():
    _parent()
    db = get_db()
    since = (dt.date.today() - dt.timedelta(days=6)).isoformat()
    kids = [{"id": m["id"], "name": _name(m)} for m in _members(db, kids_only=True)]
    chores = [dict(r) for r in db.execute("SELECT * FROM chores WHERE active=1 ORDER BY user_id, id")]
    pending = [dict(r) for r in db.execute(
        """SELECT l.id, l.day, l.status, l.user_id, c.title, c.icon, c.stars FROM chore_log l JOIN chores c ON c.id=l.chore_id
           WHERE l.day>=? ORDER BY l.status='done' DESC, l.day DESC, l.id DESC""", (since,))]
    return jsonify(kids=kids, chores=chores, log=pending, icons=CHORE_ICONS)


@bp.post("/api/kids/chores")
@login_required
def api_kids_chore_add():
    u = _parent()
    d = body()
    title = " ".join(str(d.get("title") or "").split())[:60]
    if not title:
        abort(400, "اكتب المهمة")
    uids = d.get("users") if isinstance(d.get("users"), list) else [d.get("user_id")]
    db = get_db()
    kid_ids = {m["id"] for m in _members(db, kids_only=True)}
    stars = max(1, min(10, int(d.get("stars") or 1)))
    icon = str(d.get("icon") or "⭐")[:4]
    n = 0
    for uid in uids:
        try:
            uid = int(uid)
        except (TypeError, ValueError):
            continue
        if uid in kid_ids:
            db.execute("INSERT INTO chores(user_id, title, icon, stars, created_at) VALUES (?,?,?,?,?)",
                       (uid, title, icon, stars, now_iso()))
            n += 1
    if not n:
        abort(400, "اختر طفلاً واحداً على الأقل")
    db.commit()
    log_action("مهام الأطفال", f"إضافة: {title}", u["username"])
    return api_kids_chores()


@bp.delete("/api/kids/chores/<int:cid>")
@login_required
def api_kids_chore_del(cid):
    _parent()
    db = get_db()
    db.execute("UPDATE chores SET active=0 WHERE id=?", (cid,))
    db.commit()
    return api_kids_chores()


def chore_decide(db, lid: int, action, by_id: int) -> None:
    """تأكيد مهمة أنهاها طفل (تُضاف النجوم) أو رفضها (ترجع إليه ليعيدها)."""
    row = db.execute("SELECT l.*, c.title, c.stars FROM chore_log l JOIN chores c ON c.id=l.chore_id WHERE l.id=?",
                     (lid,)).fetchone()
    if not row or row["status"] != "done":
        abort(400, "لا يوجد ما يُؤكَّد")
    if action == "confirm":
        db.execute("UPDATE chore_log SET status='confirmed', by_id=? WHERE id=?", (by_id, lid))
        grant_stars(db, row["user_id"], row["stars"], "give", f"✅ {row['title']}", by_id)
    elif action == "reject":
        db.execute("DELETE FROM chore_log WHERE id=?", (lid,))
    else:
        abort(400)
    db.commit()


def pending_chores(db) -> list[dict]:
    """المهام التي أنهاها الأطفال وتنتظر تأكيد الأب أو الأم."""
    names = {m["id"]: _name(m) for m in _members(db, kids_only=True)}
    rows = db.execute("""SELECT l.id, l.day, l.user_id, c.title, c.icon, c.stars FROM chore_log l JOIN chores c ON c.id=l.chore_id
                         WHERE l.status='done' ORDER BY l.day DESC, l.id DESC LIMIT 60""").fetchall()
    return [{**dict(r), "kid": names.get(r["user_id"], "?")} for r in rows]


@bp.post("/api/kids/chores/log/<int:lid>")
@login_required
def api_kids_chore_confirm(lid):
    u = _parent()
    chore_decide(get_db(), lid, body().get("action"), u["id"])
    return api_kids_chores()


@bp.get("/api/kids/pending")
@login_required
def api_kids_pending():
    """عدد المهام المنتظرة: رقم أحمر على أيقونة «العائلة» للأب والأم."""
    u = current_user()
    if not u or not (u["is_admin"] or (u["tv_role"] or "") == "adult"):
        return jsonify(count=0, items=[])
    items = pending_chores(get_db())
    return jsonify(count=len(items), items=items[:10])


def _tv_parent():
    u = _tv_user()
    if not (u["is_admin"] or (u["tv_role"] or "") == "adult"):
        abort(403, "للأب والأم فقط")
    return u


@bp.get("/api/tv/chores/pending")
def api_tv_chores_pending():
    u = _tv_parent()
    items = pending_chores(get_db())
    return jsonify(count=len(items), items=items, has_pin=bool(u["tv_pin"]))


@bp.post("/api/tv/chores/pending")
def api_tv_chores_decide():
    """من التلفاز: الأب أو الأم يؤكد أو يرفض برمزه (حتى لا يؤكد الطفل مهامه من حساب أبيه)."""
    u = _tv_parent()
    d = body()
    if not u["tv_pin"]:
        abort(400, "ضع رمز دخول لحسابك على التلفاز أولاً، من لوحة التحكم ← وضع التلفاز")
    if not check_password_hash(u["tv_pin"], str(d.get("pin") or "")):
        abort(403, "الرمز غير صحيح")
    if d.get("id"):
        chore_decide(get_db(), int(d["id"]), d.get("action"), u["id"])
    return api_tv_chores_pending()


# ============================================================================= رمضان
CHALLENGES = [
    "ابتسم في وجه كل من تراه اليوم", "ساعد في تجهيز مائدة الإفطار", "اقرأ صفحة من القرآن مع أحد والديك",
    "قل «جزاك الله خيراً» لثلاثة أشخاص", "رتّب غرفتك قبل المغرب", "ادعُ لجدّك وجدّتك", "تصدّق ولو بشيء صغير",
    "احفظ دعاء الإفطار", "قدّم الماء للصائمين عند الأذان", "اتصل بقريب وقل له رمضان كريم",
    "اقرأ قصة نبي وأخبر بها عائلتك", "لا تغضب اليوم أبداً", "ساعد في غسل الأطباق", "صلِّ صلاة في وقتها مع العائلة",
    "اكتب رسالة شكر لأمك", "اكتب رسالة شكر لأبيك", "علّم أخاك الصغير شيئاً جميلاً", "سبّح الله 33 مرة",
    "أطعم طائراً أو حيواناً", "شارك ألعابك مع إخوتك", "احفظ آية جديدة", "قل الصدق في كل شيء اليوم",
    "ساعد في ترتيب البيت للعيد", "ادعُ لكل المسلمين", "ابدأ يومك بـ«بسم الله»", "أطفئ الأنوار التي لا نحتاجها",
    "صِل رحمك بزيارة أو اتصال", "قل كلمة طيبة لكل فرد في العائلة", "تصدّق بلعبة لا تستعملها",
    "جهّز بطاقة تهنئة بالعيد لعائلتك",
]


def hijri(d: dt.date) -> tuple[int, int, int]:
    """التقويم الهجري الجدولي (تقريبي ± يوم). العرض على التلفاز يستعمل تقويم أم القرى من المتصفح."""
    jd = d.toordinal() + 1721424.5

    def to_jd(y, m, dd):
        return dd + math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + math.floor((3 + 11 * y) / 30) + 1948439.5 - 1
    jd = math.floor(jd) + 0.5
    y = math.floor((30 * (jd - 1948439.5) + 10646) / 10631)
    m = min(12, math.ceil((jd - (29 + to_jd(y, 1, 1))) / 29.5) + 1)
    dd = int(jd - to_jd(y, m, 1) + 1)
    return int(y), int(m), dd


def ramadan_on() -> bool:
    mode = get_setting("ramadan_mode") or "auto"
    if mode in ("on", "off"):
        return mode == "on"
    return hijri(dt.date.today())[1] == 9


@bp.get("/api/tv/ramadan")
def api_tv_ramadan():
    u = _tv_user()
    db = get_db()
    hy, hm, hd = hijri(dt.date.today())
    try:
        hy = int(request.args.get("hy") or hy)
        hd = int(request.args.get("hd") or hd)
    except ValueError:
        pass
    names = {m["id"]: _name(m) for m in _members(db)}
    kh = {r["juz"]: {"juz": r["juz"], "user_id": r["user_id"], "name": names.get(r["user_id"], "؟")}
          for r in db.execute("SELECT * FROM khatma WHERE hyear=?", (hy,))}
    day = dt.date.today().isoformat()
    done = bool(db.execute("SELECT 1 FROM ramadan_done WHERE user_id=? AND day=?", (u["id"], day)).fetchone())
    return jsonify(on=ramadan_on(), hy=hy, khatma=[kh.get(j, {"juz": j}) for j in range(1, 31)],
                   challenge={"text": CHALLENGES[(max(1, hd) - 1) % len(CHALLENGES)], "done": done, "day": hd})


@bp.post("/api/tv/ramadan/khatma")
def api_tv_khatma():
    u = _tv_user()
    d = body()
    try:
        hy, juz = int(d.get("hy")), int(d.get("juz"))
    except (TypeError, ValueError):
        abort(400)
    if not 1 <= juz <= 30:
        abort(400)
    db = get_db()
    row = db.execute("SELECT user_id FROM khatma WHERE hyear=? AND juz=?", (hy, juz)).fetchone()
    if row and row["user_id"] != u["id"]:
        abort(400, "هذا الجزء قرأه شخص آخر")
    if row:
        db.execute("DELETE FROM khatma WHERE hyear=? AND juz=?", (hy, juz))
    else:
        db.execute("INSERT INTO khatma(hyear, juz, user_id, ts) VALUES (?,?,?,?)", (hy, juz, u["id"], now_iso()))
    db.commit()
    return api_tv_ramadan()


@bp.post("/api/tv/ramadan/challenge")
def api_tv_challenge():
    """«تحدّي اليوم»: مرة واحدة في اليوم، ونجمتان."""
    u = _tv_user()
    db = get_db()
    day = dt.date.today().isoformat()
    if db.execute("SELECT 1 FROM ramadan_done WHERE user_id=? AND day=?", (u["id"], day)).fetchone():
        return jsonify(ok=True, added=0)
    db.execute("INSERT INTO ramadan_done(user_id, day) VALUES (?,?)", (u["id"], day))
    grant_stars(db, u["id"], 2, "give", "🌙 تحدّي رمضان", u["id"])
    db.commit()
    return jsonify(ok=True, added=2)


@bp.post("/api/kids/ramadan")
@login_required
def api_kids_ramadan_mode():
    _parent()
    mode = body().get("mode")
    if mode not in ("auto", "on", "off"):
        abort(400)
    set_setting("ramadan_mode", mode)
    return jsonify(ok=True, mode=mode, on=ramadan_on())


@bp.get("/api/kids/ramadan")
@login_required
def api_kids_ramadan_get():
    _parent()
    return jsonify(mode=get_setting("ramadan_mode") or "auto", on=ramadan_on(), hijri=hijri(dt.date.today()))


# ============================================================================= قصص بصوت العائلة
AUDIO_EXT = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".aac": "audio/aac", ".wav": "audio/wav",
             ".ogg": "audio/ogg", ".oga": "audio/ogg", ".webm": "audio/webm", ".opus": "audio/ogg", ".caf": "audio/x-caf"}


def stories_dir() -> Path:
    d = paths().system / "stories"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _stories(db):
    names = {m["id"]: _name(m) for m in db.execute("SELECT * FROM users")}
    return [{"id": r["id"], "title": r["title"], "by": names.get(r["by_id"], ""), "created_at": r["created_at"],
             "plays": r["plays"]} for r in db.execute("SELECT * FROM voice_stories ORDER BY id DESC")]


@bp.get("/api/kids/stories")
@login_required
def api_kids_stories():
    _parent()
    return jsonify(items=_stories(get_db()))


@bp.post("/api/kids/stories")
@login_required
def api_kids_story_add():
    u = _parent()
    f = request.files.get("audio")
    title = " ".join(str(request.form.get("title") or "").split())[:80]
    if not f or not title:
        abort(400, "اكتب عنوان القصة واختر التسجيل")
    ext = Path(f.filename or "").suffix.lower()
    if ext not in AUDIO_EXT:
        mt = (f.mimetype or "").split(";")[0]
        ext = next((e for e, m in AUDIO_EXT.items() if m == mt), "")
    if ext not in AUDIO_EXT:
        abort(400, "هذا ليس ملف صوت مدعوماً (mp3، m4a، wav، ogg، webm)")
    db = get_db()
    cur = db.execute("INSERT INTO voice_stories(title, by_id, file, mime, created_at) VALUES (?,?,?,?,?)",
                     (title, u["id"], "", AUDIO_EXT[ext], now_iso()))
    name = f"{cur.lastrowid}{ext}"
    dest = stories_dir() / name
    f.save(dest)
    if dest.stat().st_size > 200 * 1024 * 1024:
        dest.unlink(missing_ok=True)
        db.rollback()
        abort(400, "التسجيل أكبر من 200MB")
    db.execute("UPDATE voice_stories SET file=? WHERE id=?", (name, cur.lastrowid))
    db.commit()
    log_action("قصص بصوتنا", f"إضافة: {title}", u["username"])
    return jsonify(items=_stories(db))


@bp.delete("/api/kids/stories/<int:sid>")
@login_required
def api_kids_story_del(sid):
    _parent()
    db = get_db()
    row = db.execute("SELECT file FROM voice_stories WHERE id=?", (sid,)).fetchone()
    if row:
        (stories_dir() / row["file"]).unlink(missing_ok=True)
        db.execute("DELETE FROM voice_stories WHERE id=?", (sid,))
        db.commit()
    return jsonify(items=_stories(db))


@bp.get("/api/kids/stories/<int:sid>/audio")
@login_required
def api_kids_story_audio(sid):
    _parent()
    return _story_file(sid, count=False)


def _story_file(sid, count=True):
    db = get_db()
    row = db.execute("SELECT * FROM voice_stories WHERE id=?", (sid,)).fetchone()
    if not row:
        abort(404)
    p = stories_dir() / row["file"]
    if not p.is_file():
        abort(404)
    if count and request.headers.get("Range", "bytes=0-").startswith("bytes=0-"):
        db.execute("UPDATE voice_stories SET plays=plays+1 WHERE id=?", (sid,))
        db.commit()
    return send_file(p, mimetype=row["mime"] or "audio/mpeg", conditional=True)


@bp.get("/api/tv/stories")
def api_tv_stories():
    _tv_user()
    return jsonify(items=_stories(get_db()))


@bp.get("/api/tv/stories/<int:sid>/audio")
def api_tv_story_audio(sid):
    _tv_user()
    return _story_file(sid)


# ============================================================================= مربعات التلفاز الإضافية
def extra_tiles(db, u) -> list[dict]:
    """مربعات تظهر وحدها على شاشة الشخص عندما يكون لها محتوى."""
    out = []

    def add(tid, title, kind, icon, color):
        out.append({"id": tid, "user_id": u["id"], "title": title, "kind": kind, "path": None, "icon": icon,
                    "color": color, "position": 900 + len(out), "enabled": 1})
    try:
        if _is_kid(u) and db.execute("SELECT 1 FROM chores WHERE user_id=? AND active=1 LIMIT 1", (u["id"],)).fetchone():
            add("chores", "مهامي اليوم", "chores", "star", "#f59e0b,#ef4444")
        if ramadan_on():
            add("ramadan", "رمضان كريم", "ramadan", "moon", "#1e1b4b,#7c3aed")
        if db.execute("SELECT 1 FROM voice_stories LIMIT 1").fetchone():
            add("stories", "قصص بصوتنا", "stories", "audio", "#ec4899,#8b5cf6")
        if onthisday_rows(db, u, limit=1):
            add("onthisday", "في مثل هذا اليوم", "onthisday", "photos", "#0ea5e9,#22c55e")
    except Exception:   # لا نُفسد الشاشة الرئيسية بسبب ميزة إضافية
        pass
    return out
