"""درجة الحرارة على التلفاز من Open-Meteo (مجاني، بلا حساب ولا مفتاح).

يُرسل فقط إحداثيات المدينة المختارة لمواقيت الصلاة. النتيجة تُحفظ نصف ساعة، والجلب في الخلفية حتى لا تتأخر الشاشة.
في وضع «بدون إنترنت» لا يتصل أبداً.
"""
from __future__ import annotations

import json
import threading
import time
import urllib.request

_cache: dict = {}
_lock = threading.Lock()
_busy: set = set()

# رموز الطقس العالمية (WMO) → وصف ورمز
CODES = {
    0: ("صحو", "☀️"), 1: ("صحو غالباً", "🌤️"), 2: ("غائم جزئياً", "⛅"), 3: ("غائم", "☁️"),
    45: ("ضباب", "🌫️"), 48: ("ضباب", "🌫️"), 51: ("رذاذ خفيف", "🌦️"), 53: ("رذاذ", "🌦️"), 55: ("رذاذ كثيف", "🌧️"),
    56: ("رذاذ متجمد", "🌧️"), 57: ("رذاذ متجمد", "🌧️"), 61: ("مطر خفيف", "🌧️"), 63: ("مطر", "🌧️"), 65: ("مطر غزير", "🌧️"),
    66: ("مطر متجمد", "🌧️"), 67: ("مطر متجمد", "🌧️"), 71: ("ثلج خفيف", "🌨️"), 73: ("ثلج", "🌨️"), 75: ("ثلج كثيف", "❄️"),
    77: ("حبات ثلج", "🌨️"), 80: ("زخات مطر", "🌦️"), 81: ("زخات مطر", "🌧️"), 82: ("زخات قوية", "⛈️"),
    85: ("زخات ثلج", "🌨️"), 86: ("زخات ثلج", "🌨️"), 95: ("عاصفة رعدية", "⛈️"), 96: ("عاصفة وبَرَد", "⛈️"), 99: ("عاصفة وبَرَد", "⛈️"),
}


def _fetch(key, lat, lon):
    try:
        url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat:.3f}&longitude={lon:.3f}"
               "&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1")
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "HOME-ANAB"}), timeout=10) as r:
            d = json.loads(r.read())
        cur, day = d.get("current") or {}, d.get("daily") or {}
        code = int(cur.get("weather_code") or 0)
        desc, icon = CODES.get(code, ("", "🌡️"))
        if code in (0, 1) and not cur.get("is_day", 1):
            icon = "🌙"
        rnd = lambda v: round(v) if isinstance(v, (int, float)) else None  # noqa: E731
        first = lambda k: (day.get(k) or [None])[0]  # noqa: E731
        if not isinstance(cur.get("temperature_2m"), (int, float)):
            return
        data = {"temp": rnd(cur["temperature_2m"]), "desc": desc, "icon": icon,
                "max": rnd(first("temperature_2m_max")), "min": rnd(first("temperature_2m_min"))}
        with _lock:
            _cache[key] = (time.time(), data)
    except Exception:  # لا إنترنت أو خطأ مؤقت: نبقي القديم
        pass
    finally:
        with _lock:
            _busy.discard(key)


def current(lat: float, lon: float, offline: bool) -> dict | None:
    key = (round(lat, 2), round(lon, 2))
    with _lock:
        hit = _cache.get(key)
        stale = not hit or time.time() - hit[0] > 1800
        if stale and not offline and key not in _busy:
            _busy.add(key)
            threading.Thread(target=_fetch, args=(key, lat, lon), daemon=True).start()
    if hit and time.time() - hit[0] < 6 * 3600:
        return hit[1]
    return None
