"""
مواقيت الصلاة - Prayer times
============================

المصدر الأساسي: تطبيق/موقع «مواقيت» (Mawaqit) - أوقات المسجد الذي تختاره كما
يضبطها إمام/إدارة المسجد بالضبط، مع أوقات الإقامة والجمعة إن وُجدت.

الاحتياط: إن لم يتوفّر الإنترنت نستخدم آخر تقويم سنوي محفوظ من مواقيت، وإن لم
يوجد فنحسب الأوقات فلكياً لمدينة موسكرون (تقريبي - زاوية 12° للفجر والعشاء،
وهو الشائع في مساجد بلجيكا وشمال فرنسا).
"""

from __future__ import annotations

import datetime as dt
import json
import math
import re
import time
import urllib.parse
import urllib.request

MAWAQIT = "https://mawaqit.net"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
PRAYERS = ("fajr", "shuruq", "dhuhr", "asr", "maghrib", "isha")

# Mouscron / Moeskroen, Belgium
DEFAULT_CITY = {"name": "موسكرون", "name_latin": "Mouscron", "lat": 50.7446, "lng": 3.2142, "tz": "Europe/Brussels"}

_SLUG_RE = re.compile(r"^[a-z0-9-]{2,120}$")
_TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")


def parse_slug(value: str) -> str:
    """Accept a slug or any mawaqit.net URL (…/fr/<slug>, …/fr/w/<slug>)."""
    value = (value or "").strip()
    if "mawaqit.net" in value:
        parts = [p for p in urllib.parse.urlparse(value).path.split("/") if p]
        parts = [p for p in parts if len(p) > 2 and p not in ("w", "m", "id")]
        value = parts[-1] if parts else ""
    value = value.lower()
    if not _SLUG_RE.match(value):
        raise ValueError("رابط أو اسم مسجد مواقيت غير صالح")
    return value


def _get(url: str, timeout: float = 10) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "fr,en"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "replace")


# --------------------------------------------------------------------------- #
#  Mawaqit                                                                    #
# --------------------------------------------------------------------------- #
def search_mosques(word: str) -> list[dict]:
    word = (word or "Mouscron").strip()[:60]
    raw = _get(f"{MAWAQIT}/api/2.0/mosque/search?" + urllib.parse.urlencode({"word": word}))
    items = json.loads(raw)
    if isinstance(items, dict):
        items = items.get("mosques") or items.get("data") or []
    out = []
    for m in items:
        slug = m.get("slug") or ""
        if not _SLUG_RE.match(str(slug)):
            continue
        out.append(
            {
                "slug": slug,
                "name": m.get("name") or m.get("label") or slug,
                "address": m.get("localisation") or m.get("address") or "",
            }
        )
    return out


def _extract_conf(html: str) -> dict:
    m = re.search(r"confData\s*=\s*(?=\{)", html)
    if not m:
        raise ValueError("تعذّر قراءة بيانات المسجد من صفحة مواقيت")
    conf, _ = json.JSONDecoder().raw_decode(html, m.end())
    return conf


def _clean(t) -> str | None:
    t = str(t or "").strip()
    return t if _TIME_RE.match(t) else None


def fetch_mosque(slug: str) -> dict:
    """Return today's times + yearly calendar for a Mawaqit mosque."""
    conf = _extract_conf(_get(f"{MAWAQIT}/fr/{slug}"))
    t5 = conf.get("times") or []
    times = {
        "fajr": _clean(t5[0]) if len(t5) > 0 else None,
        "shuruq": _clean(conf.get("shuruq")),
        "dhuhr": _clean(t5[1]) if len(t5) > 1 else None,
        "asr": _clean(t5[2]) if len(t5) > 2 else None,
        "maghrib": _clean(t5[3]) if len(t5) > 3 else None,
        "isha": _clean(t5[4]) if len(t5) > 4 else None,
    }
    # Iqama: today's offsets ("+10") or fixed times
    iqama = {}
    try:
        today = dt.date.today()
        row = conf["iqamaCalendar"][today.month - 1][str(today.day)]
        for name, val in zip(("fajr", "dhuhr", "asr", "maghrib", "isha"), row):
            val = str(val).strip()
            if val.startswith("+") and times.get(name):
                h, mi = map(int, times[name].split(":"))
                total = h * 60 + mi + int(val[1:] or 0)
                iqama[name] = f"{total // 60 % 24:02d}:{total % 60:02d}"
            elif _clean(val):
                iqama[name] = val
    except (KeyError, IndexError, TypeError, ValueError):
        pass
    return {
        "source": "mawaqit",
        "mosque": conf.get("name") or slug,
        "address": conf.get("localisation") or "",
        "slug": slug,
        "times": times,
        "iqama": iqama,
        "jumua": _clean(conf.get("jumua")),
        "jumua2": _clean(conf.get("jumua2")),
        "calendar": conf.get("calendar") or [],
        "fetched": time.time(),
    }


def from_calendar(cached: dict, day: dt.date) -> dict | None:
    """Use the cached Mawaqit yearly calendar when offline."""
    try:
        row = cached["calendar"][day.month - 1][str(day.day)]
    except (KeyError, IndexError, TypeError):
        return None
    if len(row) < 6:
        return None
    out = dict(cached)
    out["times"] = {p: _clean(v) for p, v in zip(PRAYERS, row)}
    out["iqama"] = {}
    out["source"] = "mawaqit-cache"
    return out


# --------------------------------------------------------------------------- #
#  Astronomical fallback                                                      #
# --------------------------------------------------------------------------- #
def _d2r(d):
    return d * math.pi / 180


def _r2d(r):
    return r * 180 / math.pi


def _fix(a, b):
    return a - b * math.floor(a / b)


def _sun(jd: float):
    d = jd - 2451545.0
    g = _d2r(_fix(357.529 + 0.98560028 * d, 360))
    q = _fix(280.459 + 0.98564736 * d, 360)
    lam = _d2r(_fix(q + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g), 360))
    e = _d2r(23.439 - 0.00000036 * d)
    ra = _r2d(math.atan2(math.cos(e) * math.sin(lam), math.cos(lam))) / 15
    eqt = q / 15 - _fix(ra, 24)
    decl = math.asin(math.sin(e) * math.sin(lam))
    return decl, eqt


def _tz_offset(day: dt.date, tz: str) -> float:
    try:
        from zoneinfo import ZoneInfo

        noon = dt.datetime(day.year, day.month, day.day, 12, tzinfo=ZoneInfo(tz))
        return noon.utcoffset().total_seconds() / 3600
    except Exception:  # no tz database (e.g. Windows without tzdata)
        local = time.localtime(time.mktime(day.timetuple()) + 43200)
        return local.tm_gmtoff / 3600


def calculate(day: dt.date, lat: float, lng: float, tz: str,
              fajr_angle: float = 12.0, isha_angle: float = 12.0) -> dict:
    jd = day.toordinal() + 1721424.5 - lng / 360  # Julian day at local midnight
    lat_r = _d2r(lat)

    def noon(t):
        return _fix(12 - _sun(jd + t / 24)[1], 24)

    def angle_time(angle, t, ccw):
        decl = _sun(jd + t / 24)[0]
        x = (-math.sin(_d2r(angle)) - math.sin(decl) * math.sin(lat_r)) / (
            math.cos(decl) * math.cos(lat_r)
        )
        x = max(-1.0, min(1.0, x))
        diff = _r2d(math.acos(x)) / 15
        return noon(t) + (-diff if ccw else diff)

    def asr_time(t):
        decl = _sun(jd + t / 24)[0]
        a = -_r2d(math.atan(1 / (1 + math.tan(abs(lat_r - decl)))))  # Shafi'i
        return angle_time(a, t, False)

    raw = {
        "fajr": angle_time(fajr_angle, 5, True),
        "shuruq": angle_time(0.833, 6, True),
        "dhuhr": noon(12),
        "asr": asr_time(13),
        "maghrib": angle_time(0.833, 18, False),
        "isha": angle_time(isha_angle, 18, False),
    }
    off = _tz_offset(day, tz) - lng / 15
    adjust = {"dhuhr": 1 / 60, "maghrib": 1 / 60}  # safety minutes
    times = {}
    for name, val in raw.items():
        v = _fix(val + off + adjust.get(name, 0), 24)
        mins = int(round(v * 60)) % 1440
        times[name] = f"{mins // 60:02d}:{mins % 60:02d}"
    return times


def fallback(city: dict | None = None, day: dt.date | None = None) -> dict:
    city = city or DEFAULT_CITY
    day = day or dt.date.today()
    return {
        "source": "calc",
        "mosque": f"مواقيت الصلاة — {city['name']}",
        "address": "",
        "slug": "",
        "times": calculate(day, city["lat"], city["lng"], city["tz"]),
        "iqama": {},
        "jumua": None,
        "jumua2": None,
    }


def get_times(cfg: dict, save_cache) -> dict:
    """cfg = {"slug": ..., "cache": {...}}; save_cache(dict) persists the cache."""
    today = dt.date.today()
    slug = cfg.get("slug")
    cache = cfg.get("cache") or {}
    if slug:
        fresh = cache.get("slug") == slug and time.time() - cache.get("fetched", 0) < 3 * 3600 \
            and dt.date.fromtimestamp(cache.get("fetched", 0)) == today
        if fresh:
            result = dict(cache)
        else:
            try:
                result = fetch_mosque(slug)
                save_cache(result)
            except Exception as exc:  # offline / site changed
                result = from_calendar(cache, today) if cache.get("slug") == slug else None
                if not result:
                    result = fallback()
                result["warning"] = f"تعذّر الاتصال بمواقيت ({exc.__class__.__name__})"
    else:
        result = fallback()
    result.pop("calendar", None)
    result["date"] = today.isoformat()
    return result
