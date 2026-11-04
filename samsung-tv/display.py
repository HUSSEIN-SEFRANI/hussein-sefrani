"""
شاشة العرض على التلفاز - TV display helpers
==========================================

* الطقس من Open-Meteo (مجاني وبدون مفتاح) لمدينة موسكرون، مع ذاكرة مؤقتة.
* قائمة الخلفيات: أي صورة تضعها في مجلد wallpapers/ تظهر تلقائياً بالتناوب
  مع الخلفيات الإسلامية المرسومة داخل الصفحة.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

WALLPAPER_DIR = Path(__file__).resolve().parent / "wallpapers"
IMAGE_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}

_weather_lock = threading.Lock()
_weather_cache: dict = {}

# WMO weather codes -> (Arabic description, icon group)
WMO = {
    0: ("صافٍ", "sun"), 1: ("صافٍ غالباً", "sun"), 2: ("غائم جزئياً", "partly"), 3: ("غائم", "cloud"),
    45: ("ضباب", "fog"), 48: ("ضباب متجمّد", "fog"),
    51: ("رذاذ خفيف", "rain"), 53: ("رذاذ", "rain"), 55: ("رذاذ كثيف", "rain"),
    56: ("رذاذ متجمّد", "rain"), 57: ("رذاذ متجمّد", "rain"),
    61: ("مطر خفيف", "rain"), 63: ("مطر", "rain"), 65: ("مطر غزير", "rain"),
    66: ("مطر متجمّد", "rain"), 67: ("مطر متجمّد", "rain"),
    71: ("ثلج خفيف", "snow"), 73: ("ثلج", "snow"), 75: ("ثلج كثيف", "snow"), 77: ("حبيبات ثلج", "snow"),
    80: ("زخات مطر", "rain"), 81: ("زخات مطر", "rain"), 82: ("زخات غزيرة", "rain"),
    85: ("زخات ثلج", "snow"), 86: ("زخات ثلج", "snow"),
    95: ("عاصفة رعدية", "storm"), 96: ("عاصفة رعدية مع برد", "storm"), 99: ("عاصفة رعدية مع برد", "storm"),
}


def _describe(code) -> tuple[str, str]:
    try:
        return WMO.get(int(code), ("—", "cloud"))
    except (TypeError, ValueError):
        return ("—", "cloud")


def fetch_weather(lat: float, lng: float, tz: str) -> dict:
    query = urllib.parse.urlencode({
        "latitude": lat, "longitude": lng, "timezone": tz, "forecast_days": 4,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    })
    req = urllib.request.Request(
        "https://api.open-meteo.com/v1/forecast?" + query, headers={"User-Agent": "TVManager"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
    cur = raw.get("current") or {}
    desc, icon = _describe(cur.get("weather_code"))
    daily = raw.get("daily") or {}
    days = []
    for i, day in enumerate(daily.get("time") or []):
        d_desc, d_icon = _describe((daily.get("weather_code") or [None])[i])
        days.append({
            "date": day,
            "max": round((daily.get("temperature_2m_max") or [0])[i]),
            "min": round((daily.get("temperature_2m_min") or [0])[i]),
            "rain": (daily.get("precipitation_probability_max") or [None])[i],
            "desc": d_desc, "icon": d_icon,
        })
    return {
        "temp": round(cur.get("temperature_2m", 0)),
        "feels": round(cur.get("apparent_temperature", 0)),
        "humidity": cur.get("relative_humidity_2m"),
        "wind": round(cur.get("wind_speed_10m", 0)),
        "desc": desc, "icon": icon, "is_day": bool(cur.get("is_day", 1)),
        "days": days, "fetched": time.time(),
    }


def get_weather(city: dict) -> dict:
    """Weather with a 20-minute cache; on failure returns the last good value."""
    with _weather_lock:
        if _weather_cache and time.time() - _weather_cache.get("fetched", 0) < 20 * 60:
            return dict(_weather_cache)
        try:
            fresh = fetch_weather(city["lat"], city["lng"], city["tz"])
            _weather_cache.clear()
            _weather_cache.update(fresh)
            return dict(_weather_cache)
        except Exception as exc:  # offline / API change
            if _weather_cache:
                return dict(_weather_cache, stale=True)
            return {"error": f"تعذّر جلب الطقس ({exc.__class__.__name__})"}


def list_wallpapers() -> list[str]:
    if not WALLPAPER_DIR.is_dir():
        return []
    return sorted(
        p.name for p in WALLPAPER_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_TYPES
    )[:200]
