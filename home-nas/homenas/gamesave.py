"""حفظ تقدّم الألعاب في مجلد اللاعب نفسه (للعبة المزارع أولاً، وتصلح لأي لعبة).

اللعبة على التلفاز تحفظ حالتها (JSON) للشخص الذي اختار نفسه على التلفاز، في مجلده الشخصي:
  <المجلد الشخصي>/تلفاز/تطبيقات/<اسم مجلد اللعبة>/<المفتاح>.json
فيبقى التقدّم لكل طفل وحده، ويظهر في «الملفات» وعلى قرص الشبكة، ويدخل في النسخ الاحتياطي.
اللعبة تُعرف من عنوان الصفحة التي أرسلت الطلب (/tv/game/<المربع>/<المجلد>/...) كما في stars.caller_app.
  GET /api/tv/gamesave[?key=save]   ← {data: {...} أو null, folder}
  PUT /api/tv/gamesave[?key=save]   ← الجسم JSON (حتى 1MB) ← {ok, folder}
قبل الكتابة تُنقل النسخة السابقة إلى «<المفتاح>.السابق.json»، والكتابة ذرّية (ملف مؤقت ثم replace).
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from flask import Blueprint, abort, jsonify, request

from .core import INVALID_NAME_CHARS, home_dir

bp = Blueprint("gamesave", __name__)

BASE = ("تلفاز", "تطبيقات")
MAX = 1024 * 1024
KEY_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")


def clean_name(name: str) -> str:
    name = "".join(" " if (c in INVALID_NAME_CHARS or ord(c) < 32) else c for c in str(name or ""))
    name = re.sub(r"\s+", " ", name).strip(" .")[:80]
    if not name or name in (".", ".."):
        abort(400, "لم تُعرف اللعبة")
    return name


def target(u) -> tuple[Path, str]:
    from .stars import caller_app
    _, app = caller_app(u)
    if not app:
        abort(400, "لم تُعرف اللعبة (افتحها من التلفاز)")
    key = request.args.get("key", "save")
    if not KEY_RE.match(key):
        abort(400, "مفتاح غير صالح")
    game = clean_name(app)
    folder = home_dir(u["username"]).joinpath(*BASE, game)
    fname = "حفظ.json" if key == "save" else key + ".json"
    return folder / fname, "/".join(BASE + (game,))


@bp.get("/api/tv/gamesave")
def api_get():
    from .tv import tv_user
    u = tv_user()
    path, rel = target(u)
    data = None
    for p in (path, path.with_name(path.stem + ".السابق.json")):   # إن تلف الملف نأخذ النسخة السابقة
        try:
            data = json.loads(p.read_text("utf-8"))
            break
        except (OSError, ValueError):
            continue
    return jsonify(data=data, folder=rel)


@bp.put("/api/tv/gamesave")
def api_put():
    from .tv import tv_user
    u = tv_user()
    raw = request.get_data(cache=False)
    if len(raw) > MAX:
        abort(413, "الحفظ كبير جداً")
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        abort(400, "بيانات غير صالحة")
    if not isinstance(data, dict):
        abort(400, "بيانات غير صالحة")
    path, rel = target(u)
    new = path.parent.exists() is False
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), "utf-8")
    if path.exists():
        os.replace(path, path.with_name(path.stem + ".السابق.json"))
    os.replace(tmp, path)
    if new:
        try:
            from .files import touched
            touched(path.parent)
        except Exception:  # noqa: BLE001 - الفهرسة لا تُفشل الحفظ
            pass
    return jsonify(ok=True, folder=rel)
