"""تفعيل HOME ANAB: رقم الجهاز، والتحقق من كود التفعيل بدون إنترنت، والتجربة المجانية.

الكود يصنعه البائع في «برنامج الأكواد» ويختمه بمفتاحه الخاص (Ed25519). هنا المفتاح العام فقط:
يكفي للتحقق أن الكود من البائع، ولا يكفي لصنع كود جديد.

صيغة الكود (العقد HA1 مع برنامج الأكواد — أي تغيير هنا يجب أن يطابقه هناك):
    HA1-{device8}-{YYYYMMDD}-{kind}{serial4}-{sig103}
    الرسالة الموقّعة: "HA1|{device8}|{YYYYMMDD}|{kind}|{serial4}"
    kind: P مدفوع، F مجاني/عائلي (20991231). الكود يعمل حتى نهاية اليوم YYYYMMDD.

بعد انتهاء التجربة أو الكود: الملفات والصور والتلفاز والنسخ الاحتياطي تبقى تعمل كالعادة.
يتوقف فقط تحديث النظام وتثبيت تطبيقات جديدة من مركز التطبيقات حتى التجديد.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import threading
import time
import urllib.parse
from pathlib import Path

from flask import Blueprint, abort, jsonify, redirect, render_template, request

from .core import body, get_db, log_action

bp = Blueprint("activation", __name__)

APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"
HELPER = "/usr/local/sbin/hsef-extras"

# «صورة الختم»: المفتاح العام لبرنامج الأكواد (ليس سرياً). البصمة PJ9W.
PUBLIC_KEY = bytes.fromhex("64382426abd4de4d3d00405dc6a1f301a1f4c3d465702972825545c57845c8ec")
SELLER_WHATSAPP = "32494499430"
SELLER_PHONE = "+32 494 49 94 30"
TRIAL_DAYS = 14
WARN_DAYS = 30

ALPH = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"   # Crockford base32 (بدون I L O U)
_IDX = {c: i for i, c in enumerate(ALPH)}


# ==========================================================================
# Ed25519 (RFC 8032) — التحقق فقط، Python خالص
# ==========================================================================

_P = 2 ** 255 - 19
_L = 2 ** 252 + 27742317777372353535851937790883648493
_D = (-121665 * pow(121666, _P - 2, _P)) % _P
_SQRT_M1 = pow(2, (_P - 1) // 4, _P)


def _add(p1, p2):
    x1, y1, z1, t1 = p1
    x2, y2, z2, t2 = p2
    a = (y1 - x1) * (y2 - x2) % _P
    b = (y1 + x1) * (y2 + x2) % _P
    c = 2 * t1 * t2 * _D % _P
    d = 2 * z1 * z2 % _P
    e, f, g, h = b - a, d - c, d + c, b + a
    return (e * f % _P, g * h % _P, f * g % _P, e * h % _P)


def _mul(s, pt):
    q = (0, 1, 1, 0)
    while s > 0:
        if s & 1:
            q = _add(q, pt)
        pt = _add(pt, pt)
        s >>= 1
    return q


def _recover_x(y, sign):
    if y >= _P:
        return None
    x2 = (y * y - 1) * pow(_D * y * y + 1, _P - 2, _P) % _P
    if x2 == 0:
        return None if sign else 0
    x = pow(x2, (_P + 3) // 8, _P)
    if (x * x - x2) % _P != 0:
        x = x * _SQRT_M1 % _P
    if (x * x - x2) % _P != 0:
        return None
    if (x & 1) != sign:
        x = _P - x
    return x


_GY = 4 * pow(5, _P - 2, _P) % _P
_GX = _recover_x(_GY, 0)
_G = (_GX, _GY, 1, _GX * _GY % _P)


def _decompress(s: bytes):
    if len(s) != 32:
        return None
    y = int.from_bytes(s, "little")
    sign = y >> 255
    y &= (1 << 255) - 1
    x = _recover_x(y, sign)
    return None if x is None else (x, y, 1, x * y % _P)


def ed25519_verify(pub: bytes, msg: bytes, sig: bytes) -> bool:
    if len(pub) != 32 or len(sig) != 64:
        return False
    A, R = _decompress(pub), _decompress(sig[:32])
    if A is None or R is None:
        return False
    s = int.from_bytes(sig[32:], "little")
    if s >= _L:
        return False
    k = int.from_bytes(hashlib.sha512(sig[:32] + pub + msg).digest(), "little") % _L
    x1, y1, z1, _ = _mul(s, _G)
    x2, y2, z2, _ = _add(R, _mul(k, A))
    return (x1 * z2 - x2 * z1) % _P == 0 and (y1 * z2 - y2 * z1) % _P == 0


# ==========================================================================
# رقم الجهاز والكود
# ==========================================================================

def b32(data: bytes) -> str:
    bits = len(data) * 8
    n = int.from_bytes(data, "big")
    nchars = -(-bits // 5)
    n <<= nchars * 5 - bits
    return "".join(ALPH[(n >> (5 * (nchars - 1 - i))) & 31] for i in range(nchars))


def _b32decode(text: str, nbytes: int) -> bytes | None:
    nchars = -(-nbytes * 8 // 5)
    if len(text) != nchars or any(c not in _IDX for c in text):
        return None
    n = 0
    for c in text:
        n = (n << 5) | _IDX[c]
    pad = nchars * 5 - nbytes * 8
    if n & ((1 << pad) - 1):
        return None   # بتات الحشو يجب أن تكون أصفاراً
    return int.to_bytes(n >> pad, nbytes, "big")


def check_char(core7: str) -> str:
    return ALPH[hashlib.sha256(("HA" + core7).encode()).digest()[0] >> 3]


def show_device(d: str) -> str:
    return f"HA-{d[:4]}-{d[4:]}" if d else ""


def fingerprint(pub: bytes = PUBLIC_KEY) -> str:
    return b32(hashlib.sha256(pub).digest())[:4]


def _fix(s: str) -> str:
    return s.replace("O", "0").replace("I", "1").replace("L", "1")


def clean_code(text: str) -> str:
    s = re.sub(r"\s+", "", text or "")
    m = re.search(r"[?&][cC]=([^&#]+)", s)   # لُصق الرابط كاملاً
    if m:
        s = urllib.parse.unquote(m.group(1))
    s = s.upper()
    if s.startswith("HA1-"):
        s = "HA1-" + _fix(s[4:])
    return s


_CODE_RE = re.compile(r"HA1-([0-9A-Z]{8})-(\d{8})-([PF])([0-9A-Z]{4})-([0-9A-Z]{103})")


def _ymd(s: str) -> dt.date | None:
    try:
        return dt.date(int(s[:4]), int(s[4:6]), int(s[6:8]))
    except ValueError:
        return None


def verify(text: str, device8: str) -> dict:
    """يفحص الكود: الشكل، والختم، ورقم الجهاز. لا يفحص التاريخ (هذا في status)."""
    s = clean_code(text)
    m = _CODE_RE.fullmatch(s)
    if not m:
        return {"ok": False, "reason": "شكل الكود غير صحيح. انسخه كاملاً من رسالة واتساب"}
    dev, exp, kind, s4, sig = m.groups()
    if any(c not in _IDX for c in dev + s4) or check_char(dev[:7]) != dev[7] or not _ymd(exp):
        return {"ok": False, "reason": "الكود فيه حرف خطأ. انسخه كاملاً من رسالة واتساب"}
    raw = _b32decode(sig, 64)
    if raw is None or not ed25519_verify(PUBLIC_KEY, f"HA1|{dev}|{exp}|{kind}|{s4}".encode(), raw):
        return {"ok": False, "reason": "الكود غير صحيح أو فيه حرف خطأ. انسخه كاملاً من رسالة واتساب"}
    if dev != device8:
        return {"ok": False, "reason": f"هذا الكود لجهاز آخر ({show_device(dev)})، ورقم هذا الجهاز {show_device(device8)}"}
    serial = 0
    for c in s4:
        serial = serial * 32 + _IDX[c]
    return {"ok": True, "code": s, "device": dev, "expiry": _ymd(exp), "kind": kind, "serial": serial}


_vcache: dict[tuple, dict] = {}


def verify_cached(text: str, device8: str) -> dict:
    key = (text, device8)
    if key not in _vcache:
        if len(_vcache) > 64:
            _vcache.clear()
        _vcache[key] = verify(text, device8)
    return _vcache[key]


# ==========================================================================
# رقم هذا الجهاز
# ==========================================================================

_dev = {"value": None, "tried": 0.0}
_dev_lock = threading.Lock()


def _machine_device() -> str:
    """خارج جهاز HOME ANAB المخصص (تشغيل من مجلد على كمبيوتر عادي)."""
    mid = ""
    for f in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            mid = Path(f).read_text().strip()
            break
        except OSError:
            pass
    if not mid:
        import uuid
        mid = f"{uuid.getnode():012x}"
    core = b32(hashlib.sha256(f"HOMEANAB-DEV1|-|-|{mid}".encode()).digest())[:7]
    return core + check_char(core)


def device() -> str | None:
    """الحروف الثمانية لرقم الجهاز. على الجهاز المخصص يحسبها root من العتاد (hsef-extras device-id)."""
    with _dev_lock:
        if _dev["value"]:
            return _dev["value"]
        if not (APPLIANCE and os.path.exists(HELPER)):
            _dev["value"] = _machine_device()
            return _dev["value"]
        if time.time() - _dev["tried"] < 30:
            return None
        _dev["tried"] = time.time()
        try:
            r = subprocess.run(["sudo", "-n", HELPER, "device-id"], capture_output=True, text=True, timeout=20)
            d = json.loads(r.stdout or "{}").get("device", "") if r.returncode == 0 else ""
        except (subprocess.TimeoutExpired, ValueError, OSError):
            d = ""
        if len(d) == 8 and all(c in _IDX for c in d) and check_char(d[:7]) == d[7]:
            _dev["value"] = d
        return _dev["value"]


# ==========================================================================
# الحالة
# ==========================================================================

def _setting(db, key):
    row = db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else None


def _put(db, key, value):
    db.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, str(value)))
    db.commit()


def ensure_trial(db) -> None:
    """يبدأ التجربة المجانية عند أول تشغيل (وعند التحديث من إصدار قديم)."""
    if not _setting(db, "act_trial_start"):
        _put(db, "act_trial_start", dt.date.today().isoformat())


def _today(db) -> dt.date:
    """اليوم، ولا يرجع إلى الوراء: إن أُرجعت ساعة الجهاز نستعمل آخر يوم رأيناه."""
    today = dt.date.today()
    try:
        last = dt.date.fromisoformat(_setting(db, "act_last_seen") or "")
    except ValueError:
        last = None
    if last and last > today:
        return last
    if last != today:
        _put(db, "act_last_seen", today.isoformat())
    return today


def _fmt(d: dt.date) -> str:
    return d.strftime("%d/%m/%Y")


def whatsapp_url(dev: str) -> str:
    text = f"تفعيل HOME ANAB: {show_device(dev)}"   # قصير حتى يبقى رمز QR سهل القراءة من بعيد
    return f"https://wa.me/{SELLER_WHATSAPP}?text=" + urllib.parse.quote(text, safe="")


def status(db=None) -> dict:
    db = db or get_db()
    dev = device()
    out = {"device": dev or "", "display": show_device(dev or ""), "seller": SELLER_PHONE, "trial_days": TRIAL_DAYS,
           "whatsapp": whatsapp_url(dev) if dev else f"https://wa.me/{SELLER_WHATSAPP}",
           "state": "unknown", "days_left": None, "expiry": None, "kind": None, "problem": None,
           "limited": False, "warn": False}
    if not dev:
        return out
    today = _today(db)
    code = _setting(db, "act_code")
    info = verify_cached(code, dev) if code else None
    if info and not info["ok"]:
        out["problem"] = "الكود المحفوظ لا يطابق هذا الجهاز (ربما تغيّرت قطعة في الجهاز). أرسل رقم الجهاز للبائع ليعطيك كوداً جديداً."
        info = None
    try:
        start = dt.date.fromisoformat(_setting(db, "act_trial_start") or "")
    except ValueError:
        start = today
    trial_end = start + dt.timedelta(days=TRIAL_DAYS - 1)
    if info and info["kind"] == "F":
        out.update(state="free", kind="F")
    elif info and today <= info["expiry"]:
        out.update(state="active", kind="P", expiry=info["expiry"].isoformat(), expiry_text=_fmt(info["expiry"]),
                   days_left=(info["expiry"] - today).days + 1)
    elif today <= trial_end and not info:
        out.update(state="trial", expiry=trial_end.isoformat(), expiry_text=_fmt(trial_end),
                   days_left=(trial_end - today).days + 1)
    else:
        end = info["expiry"] if info else trial_end
        out.update(state="expired", ended=end.isoformat(), ended_text=_fmt(end), was="code" if info else "trial")
    out["limited"] = out["state"] == "expired"
    out["warn"] = out["state"] in ("trial", "expired") or (out["state"] == "active" and out["days_left"] <= WARN_DAYS)
    if info:
        out["serial"] = info["serial"]
    return out


def summary(db=None) -> dict:
    """ملخص صغير لشريط التنبيه في سطح المكتب والتلفاز."""
    s = status(db)
    return {k: s.get(k) for k in ("state", "days_left", "expiry_text", "ended_text", "warn", "limited", "display")}


LIMITED_MSG = "انتهت فترة التفعيل، فتوقفت التحديثات وتثبيت التطبيقات الجديدة. جدّد من لوحة التحكم ← التفعيل"


def require_active() -> None:
    """للتحديثات وتثبيت التطبيقات: تتوقف بعد انتهاء التجربة أو الكود."""
    if status().get("limited"):
        abort(403, LIMITED_MSG)


def activate(text: str) -> tuple[bool, str]:
    db = get_db()
    dev = device()
    if not dev:
        return False, "تعذرت قراءة رقم الجهاز. أعد المحاولة بعد دقيقة."
    if not (text or "").strip():
        return False, "الصق كود التفعيل أولاً"
    r = verify(text, dev)
    if not r["ok"]:
        return False, r["reason"]
    today = _today(db)
    if r["kind"] == "P" and r["expiry"] < today:
        return False, f"هذا الكود صحيح لكن مدته انتهت في {_fmt(r['expiry'])}. اطلب كود تجديد."
    cur_code = _setting(db, "act_code")
    cur = verify_cached(cur_code, dev) if cur_code else None
    if cur and cur["ok"]:
        if cur["code"] == r["code"]:
            return True, "هذا الكود مفعّل على هذا الجهاز أصلاً"
        if cur["kind"] == "F" and r["kind"] == "P":
            return False, "هذا الجهاز مفعّل بدون تاريخ انتهاء، فلا يحتاج هذا الكود"
        if cur["kind"] == "P" and r["kind"] == "P" and r["expiry"] < cur["expiry"] and cur["expiry"] >= today:
            return False, f"هذا الجهاز مفعّل حتى {_fmt(cur['expiry'])}، وهذا الكود أقصر منه"
    _put(db, "act_code", r["code"])
    until = "بدون تاريخ انتهاء" if r["kind"] == "F" else f"حتى {_fmt(r['expiry'])}"
    log_action("التفعيل", f"{until} · رقم الكود {r['serial']}")
    return True, f"تم التفعيل {until}"


# ==========================================================================
# المسارات
# ==========================================================================

_fails: dict[str, list] = {}


def _too_many() -> bool:
    ip = request.remote_addr or "?"
    now = time.time()
    _fails[ip] = [t for t in _fails.get(ip, []) if now - t < 600]
    return len(_fails[ip]) >= 20


def _failed():
    _fails.setdefault(request.remote_addr or "?", []).append(time.time())


@bp.get("/api/activation")
def api_activation():
    return jsonify(status())


@bp.post("/api/activation")
def api_activate():
    """لا يحتاج تسجيل دخول: الكود الصحيح لهذا الجهاز فقط يُقبل، ولا يُقبل كود أقصر من الحالي."""
    if _too_many():
        abort(429, "محاولات خاطئة كثيرة. انتظر 10 دقائق.")
    ok, msg = activate(body().get("code", ""))
    if not ok:
        _failed()
        abort(400, msg)
    return jsonify(ok=True, message=msg, status=status())


@bp.route("/activate", methods=["GET", "POST"])
def activate_page():
    """الرابط الذي يرسله البائع: ‎/activate?c=الكود — يفتح صفحة فيها الكود جاهزاً وزر «تفعيل»."""
    from .system import user_count
    code = request.values.get("c", "") or request.values.get("code", "")
    if user_count() == 0:
        return redirect("/setup" + ("?c=" + urllib.parse.quote(clean_code(code), safe="") if code else ""))
    msg, ok = None, None
    if request.method == "POST":
        if _too_many():
            msg, ok = "محاولات خاطئة كثيرة. انتظر 10 دقائق.", False
        else:
            ok, msg = activate(code)
            if not ok:
                _failed()
    return render_template("activate.html", st=status(), code=clean_code(code) if code else "", msg=msg, ok=ok,
                           server_name="HOME ANAB")
