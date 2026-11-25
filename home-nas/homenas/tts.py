"""البند 58: صوت عربي آلي للألعاب والدروس، بلا إنترنت (espeak-ng على الجهاز).

متصفح التلفاز لا يملك صوتاً عربياً، فتطلب اللعبة الملف الصوتي من السيرفر:
    GET /api/tv/tts?t=<النص>&r=<السرعة 80–200>    ← audio/wav
النص المشكول يُنطق أفضل. الملفات تُحفظ في الذاكرة المؤقتة فلا يُصنع النص نفسه مرتين.
إن لم يكن espeak-ng مثبتاً يرجع 404، فتكمل اللعبة بلا صوت (أو بصوت المتصفح إن وُجد).
"""
from __future__ import annotations

import hashlib
import shutil
import subprocess
import unicodedata

from flask import Blueprint, abort, request, send_file

from .core import paths

bp = Blueprint("tts", __name__)

MAX_CHARS = 200


def engine() -> str | None:
    return shutil.which("espeak-ng") or shutil.which("espeak")


def clean(text: str) -> str:
    """نص قصير بلا رموز تحكم (يبقى التشكيل)."""
    t = "".join(" " if ch.isspace() else ch for ch in unicodedata.normalize("NFC", text or "") if ch.isspace() or unicodedata.category(ch)[0] in "LMNP")
    return " ".join(t.split())[:MAX_CHARS]


def speak(text: str, rate: int = 130):
    exe = engine()
    t = clean(text)
    if not exe or not t:
        return None
    rate = max(80, min(200, int(rate)))
    d = paths().cache / "tts"
    d.mkdir(parents=True, exist_ok=True)
    f = d / (hashlib.sha1(f"{rate}|{t}".encode()).hexdigest() + ".wav")
    if not f.exists():
        tmp = f.with_suffix(".tmp")
        try:
            r = subprocess.run([exe, "-v", "ar", "-s", str(rate), "-w", str(tmp), "--", t], capture_output=True, timeout=20)
        except (OSError, subprocess.TimeoutExpired):
            return None
        if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 100:
            tmp.unlink(missing_ok=True)
            return None
        tmp.replace(f)
    return f


@bp.get("/api/tv/tts")
def api_tts():
    from .tv import tv_user
    from .core import current_user
    try:
        tv_user()
    except Exception:          # من الهاتف أو الكمبيوتر بحساب عادي يعمل أيضاً
        if not current_user():
            abort(401)
    try:
        rate = int(request.args.get("r") or 130)
    except ValueError:
        rate = 130
    f = speak(request.args.get("t") or "", rate)
    if f is None:
        abort(404)
    resp = send_file(f, mimetype="audio/wav", max_age=86400)
    return resp
