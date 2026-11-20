"""البند 50: تقدّم الألعاب والتطبيقات التعليمية يُحفظ في السيرفر لكل فرد.

كان `K.store` في kit.js يحفظ في localStorage لمتصفح التلفاز فقط (‎/var/lib/hseftv/chromium)، فيضيع مع إعادة
التنصيب ولا يدخل في النسخ الاحتياطي. الآن: جدول `game_saves` في قاعدة البيانات (فيدخل في النسخ والتصدير).
المفتاح يكتبه kit.js: «اسم الحفظ:مسار التطبيق» بلا رقم المربع، فيبقى التقدّم لو نُقل التطبيق بين «الألعاب» و«التعليم».
"""
from __future__ import annotations

import json

from flask import Blueprint, abort, jsonify, request

from .core import get_db, now_iso

bp = Blueprint("saves", __name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS game_saves (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);
"""
MAX_KEY = 400
MAX_VALUE = 256 * 1024      # تقدّم لعبة واحدة لا يحتاج أكثر
MAX_KEYS = 3000             # لكل فرد


def db():
    d = get_db()
    d.executescript(SCHEMA)
    return d


def _key() -> str:
    k = (request.args.get("key") or (request.get_json(silent=True) or {}).get("key") or "").strip()
    if not k or len(k) > MAX_KEY or "\0" in k:
        abort(400, "bad key")
    return k


@bp.get("/api/tv/save")
def get_save():
    from .tv import tv_user
    u = tv_user()
    row = db().execute("SELECT value, updated FROM game_saves WHERE user_id=? AND key=?", (u["id"], _key())).fetchone()
    if not row:
        return jsonify(found=False)
    return jsonify(found=True, value=json.loads(row["value"]), updated=row["updated"])


@bp.put("/api/tv/save")
def put_save():
    from .tv import tv_user
    u = tv_user()
    data = request.get_json(silent=True) or {}
    key = _key()
    if not isinstance(data.get("value"), dict):
        abort(400, "value must be an object")
    raw = json.dumps(data["value"], ensure_ascii=False, separators=(",", ":"))
    if len(raw.encode()) > MAX_VALUE:
        abort(413, "too big")
    d = db()
    exists = d.execute("SELECT 1 FROM game_saves WHERE user_id=? AND key=?", (u["id"], key)).fetchone()
    if not exists and d.execute("SELECT COUNT(*) FROM game_saves WHERE user_id=?", (u["id"],)).fetchone()[0] >= MAX_KEYS:
        abort(413, "too many saves")
    d.execute("INSERT INTO game_saves(user_id, key, value, updated) VALUES (?,?,?,?) "
              "ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value, updated=excluded.updated",
              (u["id"], key, raw, now_iso()))
    d.commit()
    return jsonify(ok=True)


def forget_user(db_, uid: int):
    """عند حذف فرد من العائلة."""
    try:
        db_.executescript(SCHEMA)
        db_.execute("DELETE FROM game_saves WHERE user_id=?", (uid,))
    except Exception:  # noqa: BLE001
        pass
