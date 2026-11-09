"""حساب مواقيت الصلاة محلياً (بدون إنترنت) بالمعادلات الفلكية المعتمدة.

الطريقة: موقع الشمس من التاريخ اليولياني، ثم أوقات الزوايا لكل صلاة.
في خطوط العرض العالية (صيف أوروبا الشمالية) حين لا تصل الشمس لزاوية الفجر/العشاء
نستخدم «نسبة من الليل» (الطريقة المعتمدة في مثل هذه الحالات).
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta

# (اسم، زاوية الفجر، زاوية العشاء أو None، دقائق العشاء بعد المغرب أو None)
METHODS = {
    "mwl": ("رابطة العالم الإسلامي", 18.0, 17.0, None),
    "umm_alqura": ("أم القرى (مكة)", 18.5, None, 90),
    "egypt": ("الهيئة المصرية العامة للمساحة", 19.5, 17.5, None),
    "karachi": ("جامعة العلوم الإسلامية، كراتشي", 18.0, 18.0, None),
    "isna": ("أمريكا الشمالية (ISNA)", 15.0, 15.0, None),
    "france": ("اتحاد المنظمات الإسلامية في فرنسا", 12.0, 12.0, None),
    "turkey": ("رئاسة الشؤون الدينية التركية", 18.0, 17.0, None),
}

CITIES = {
    "aleppo": ("حلب", 36.2021, 37.1343), "damascus": ("دمشق", 33.5138, 36.2765), "homs": ("حمص", 34.7324, 36.7137),
    "hama": ("حماة", 35.1318, 36.7578), "latakia": ("اللاذقية", 35.5317, 35.7911), "idlib": ("إدلب", 35.9306, 36.6339),
    "gaziantep": ("غازي عنتاب", 37.0662, 37.3833), "istanbul": ("إسطنبول", 41.0082, 28.9784),
    "beirut": ("بيروت", 33.8938, 35.5018), "amman": ("عمّان", 31.9539, 35.9106), "baghdad": ("بغداد", 33.3152, 44.3661),
    "riyadh": ("الرياض", 24.7136, 46.6753), "mecca": ("مكة المكرمة", 21.3891, 39.8579), "medina": ("المدينة المنورة", 24.5247, 39.5692),
    "dubai": ("دبي", 25.2048, 55.2708), "doha": ("الدوحة", 25.2854, 51.5310), "kuwait": ("الكويت", 29.3759, 47.9774),
    "cairo": ("القاهرة", 30.0444, 31.2357), "paris": ("باريس", 48.8566, 2.3522), "lyon": ("ليون", 45.7640, 4.8357),
    "marseille": ("مرسيليا", 43.2965, 5.3698), "toulouse": ("تولوز", 43.6047, 1.4442), "lille": ("ليل", 50.6292, 3.0573),
    "strasbourg": ("ستراسبورغ", 48.5734, 7.7521), "brussels": ("بروكسل", 50.8503, 4.3517), "berlin": ("برلين", 52.5200, 13.4050),
    "hamburg": ("هامبورغ", 53.5511, 9.9937), "munich": ("ميونخ", 48.1351, 11.5820), "amsterdam": ("أمستردام", 52.3676, 4.9041),
    "stockholm": ("ستوكهولم", 59.3293, 18.0686), "london": ("لندن", 51.5074, -0.1278), "toronto": ("تورونتو", 43.6532, -79.3832),
}

NAMES = [("fajr", "الفجر"), ("sunrise", "الشروق"), ("dhuhr", "الظهر"), ("asr", "العصر"), ("maghrib", "المغرب"), ("isha", "العشاء")]


def _sun(jd: float):
    d = jd - 2451545.0
    g = math.radians((357.529 + 0.98560028 * d) % 360)
    q = (280.459 + 0.98564736 * d) % 360
    L = math.radians((q + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)) % 360)
    e = math.radians(23.439 - 0.00000036 * d)
    ra = math.degrees(math.atan2(math.cos(e) * math.sin(L), math.cos(L))) / 15.0
    decl = math.asin(math.sin(e) * math.sin(L))
    eqt = q / 15.0 - (ra % 24)
    eqt = (eqt + 12) % 24 - 12
    return decl, eqt


def _julian(d: date) -> float:
    y, m = d.year, d.month
    if m <= 2:
        y, m = y - 1, m + 12
    a = y // 100
    b = 2 - a + a // 4
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d.day + b - 1524.5


def _hour_angle(angle: float, lat: float, decl: float) -> float | None:
    x = (-math.sin(math.radians(angle)) - math.sin(decl) * math.sin(math.radians(lat))) / (
        math.cos(decl) * math.cos(math.radians(lat)))
    if x < -1 or x > 1:
        return None
    return math.degrees(math.acos(x)) / 15.0


def times_for(d: date, lat: float, lon: float, utc_offset_h: float, method: str = "mwl", hanafi: bool = False) -> dict:
    name, fajr_a, isha_a, isha_min = METHODS.get(method, METHODS["mwl"])
    decl, eqt = _sun(_julian(d) + 0.5 - lon / 360.0)
    dhuhr = 12 + utc_offset_h - lon / 15.0 - eqt
    rise = _hour_angle(0.833, lat, decl)
    sunrise = dhuhr - rise if rise is not None else dhuhr - 6
    sunset = dhuhr + rise if rise is not None else dhuhr + 6
    night = 24 - (sunset - sunrise)
    fa = _hour_angle(fajr_a, lat, decl)
    fajr = dhuhr - fa if fa is not None else sunrise - night * fajr_a / 60.0
    if isha_min is not None:
        isha = sunset + isha_min / 60.0
    else:
        ia = _hour_angle(isha_a, lat, decl)
        isha = dhuhr + ia if ia is not None else sunset + night * isha_a / 60.0
    # العصر: طول الظل = (1 أو 2) + ظل الزوال
    factor = 2 if hanafi else 1
    alt = math.degrees(math.atan(1.0 / (factor + math.tan(abs(math.radians(lat) - decl)))))
    aa = _hour_angle(-alt, lat, decl)
    asr = dhuhr + aa if aa is not None else dhuhr + 3
    raw = {"fajr": fajr, "sunrise": sunrise, "dhuhr": dhuhr + 2 / 60.0, "asr": asr, "maghrib": sunset + 1 / 60.0, "isha": isha}

    def hm(h: float) -> str:
        m = int(round((h % 24) * 60)) % (24 * 60)
        return f"{m // 60:02d}:{m % 60:02d}"
    return {k: hm(v) for k, v in raw.items()}


def today(lat: float, lon: float, method: str = "mwl", hanafi: bool = False, now: datetime | None = None) -> dict:
    now = now or datetime.now().astimezone()
    off = now.utcoffset().total_seconds() / 3600 if now.utcoffset() else 0
    t = times_for(now.date(), lat, lon, off, method, hanafi)
    cur = now.strftime("%H:%M")
    nxt = next((k for k, _ in NAMES if k != "sunrise" and t[k] > cur), "fajr")
    return {"times": [{"key": k, "name": n, "time": t[k], "next": k == nxt} for k, n in NAMES], "next": nxt}
