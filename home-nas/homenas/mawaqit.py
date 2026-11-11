"""مواقيت المسجد من Mawaqit.

صفحة كل مسجد على mawaqit.net تحمل جدول السنة كاملة (لكل يوم: الفجر، الشروق، الظهر، العصر، المغرب، العشاء)
داخل كائن confData. نقرأ الجدول مرة واحدة ونحفظه، فيعمل السيرفر بعدها بدون إنترنت طوال السنة.
طريقتان: من رابط الصفحة (يحتاج إنترنت لحظة التحديث)، أو من ملف الصفحة محفوظاً من المتصفح (بدون إنترنت أبداً).
"""
from __future__ import annotations

import json
import re
import urllib.request
from datetime import date, datetime
from pathlib import Path

KEYS = ("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")
HOSTS = ("mawaqit.net", "www.mawaqit.net")


def _object_after(text: str, marker: str) -> dict | None:
    """يستخرج كائن JSON الذي يلي marker (مثل confData =) بعدّ الأقواس مع احترام النصوص."""
    m = re.search(marker, text)
    if not m:
        return None
    i = text.find("{", m.end())
    if i < 0:
        return None
    depth, in_str, esc = 0, False, False
    for j in range(i, len(text)):
        c = text[j]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[i:j + 1])
                except ValueError:
                    return None
    return None


def _hm(v) -> str | None:
    m = re.match(r"^\s*(\d{1,2}):(\d{2})", str(v or ""))
    return f"{int(m.group(1)):02d}:{m.group(2)}" if m else None


def parse(html: str) -> dict:
    conf = _object_after(html, r"(?:var|let|const)\s+confData\s*=") or _object_after(html, r"confData\s*=")
    if not conf or not isinstance(conf.get("calendar"), list) or len(conf["calendar"]) != 12:
        raise ValueError("لم أجد جدول المواقيت في هذه الصفحة. تأكد أنها صفحة مسجد على Mawaqit.")
    cal = []
    for month in conf["calendar"]:
        days = {}
        for d, row in (month or {}).items():
            if isinstance(row, list) and len(row) >= 6:
                t = [_hm(x) for x in row[:6]]
                if all(t):
                    days[str(int(d))] = t
        cal.append(days)
    if sum(len(m) for m in cal) < 300:
        raise ValueError("جدول المواقيت في الصفحة ناقص")
    iqama = conf.get("iqamaCalendar") if isinstance(conf.get("iqamaCalendar"), list) else None
    jumua = _hm(conf.get("jumua")) or None
    return {"name": str(conf.get("name") or "").strip()[:80] or "المسجد", "calendar": cal, "iqama": iqama, "jumua": jumua,
            "fetched": datetime.now().isoformat(timespec="minutes"), "year": date.today().year}


def check_url(url: str) -> str:
    url = (url or "").strip()
    m = re.match(r"^https://([^/]+)/[A-Za-z0-9_\-/%.]+$", url)
    if not m or m.group(1).lower() not in HOSTS:
        raise ValueError("ضع رابط صفحة المسجد على mawaqit.net، مثل: https://mawaqit.net/fr/اسم-المسجد")
    return url


def fetch(url: str) -> dict:
    req = urllib.request.Request(check_url(url), headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) HOME-ANAB", "Accept-Language": "fr,ar,en"})
    with urllib.request.urlopen(req, timeout=25) as r:
        html = r.read(6 * 1024 * 1024).decode("utf-8", "replace")
    data = parse(html)
    data["url"] = url
    return data


# ----------------------------------------------------------------------------- الحفظ والقراءة
def file(system_dir: Path) -> Path:
    return system_dir / "mawaqit.json"


def save(system_dir: Path, data: dict):
    f = file(system_dir)
    f.write_text(json.dumps(data, ensure_ascii=False))


def load(system_dir: Path) -> dict | None:
    try:
        return json.loads(file(system_dir).read_text())
    except (OSError, ValueError):
        return None


def times_for(data: dict | None, d: date) -> dict | None:
    if not data:
        return None
    try:
        row = data["calendar"][d.month - 1].get(str(d.day))
    except (KeyError, IndexError, AttributeError):
        return None
    return dict(zip(KEYS, row)) if row else None


def summary(data: dict | None) -> dict | None:
    if not data:
        return None
    return {"name": data.get("name"), "url": data.get("url"), "fetched": data.get("fetched"), "year": data.get("year"),
            "days": sum(len(m) for m in data.get("calendar") or []), "jumua": data.get("jumua")}
