"""لوحة التحكم ← الجهاز ← المعالج (v1.9.7): النوع، والحرارة، والاستعمال لكل نواة، ورسم آخر ساعة،
وما يستهلك المعالج الآن بأسماء مفهومة، وتنبيه عند ارتفاع الحرارة (يظهر في «نظرة عامة» مع باقي التنبيهات).

الحرارة من حساسات النواة عبر psutil: coretemp (Intel) و k10temp و zenpower (AMD)، وإلا acpitz.
بعض الأجهزة لا تعطي قراءة، فيظهر «غير متوفرة» بدل رقم خاطئ.
"""
from __future__ import annotations

import os
import threading
import time
from collections import deque

from flask import Blueprint, jsonify

from .core import admin_required

try:
    import psutil
except ImportError:   # pragma: no cover
    psutil = None

bp = Blueprint("cpuinfo", __name__)

WARN_C, HOT_C = 85, 95          # دافئ / ساخن جداً (درجة مئوية)
SAMPLE_SEC, KEEP = 30, 120      # عيّنة كل 30 ثانية، وآخر ساعة
_history: deque = deque(maxlen=KEEP)
_started = False

# أسماء مفهومة لما يستهلك المعالج
FRIENDLY = [
    ("ffmpeg", "تجهيز الفيديو وتسجيل الكاميرات"),
    ("chromium", "شاشة التلفاز"), ("chrome", "شاشة التلفاز"), ("cage", "شاشة التلفاز"),
    ("frigate", "Frigate (تمييز الأشخاص في الكاميرات)"), ("go2rtc", "Frigate (تمييز الأشخاص في الكاميرات)"),
    ("smbd", "قرص الشبكة (ويندوز)"), ("minidlna", "التلفاز الذكي (DLNA)"),
    ("rsync", "النسخ الاحتياطي"), ("tailscale", "الوصول من خارج البيت"),
    ("pipewire", "الصوت"), ("wireplumber", "الصوت"), ("bluetoothd", "البلوتوث"),
    ("mdadm", "مرآة RAID"), ("md0_resync", "مرآة RAID"), ("apt", "تثبيت حزم"), ("dpkg", "تثبيت حزم"),
]


def friendly(name: str, cmd: list[str]) -> str:
    n = (name or "").lower()
    joined = " ".join(cmd or []).lower()
    if "server.py" in joined or "homenas" in joined:
        return "HOME ANAB (الصور والوجوه والملفات)"
    for key, label in FRIENDLY:
        if n.startswith(key) or f"/{key}" in joined.split(" ")[0]:
            return label
    return name or "?"


def model() -> str:
    try:
        with open("/proc/cpuinfo", encoding="utf-8", errors="replace") as f:
            for line in f:
                if line.startswith(("model name", "Hardware", "Model")):
                    return " ".join(line.split(":", 1)[1].split())
    except OSError:
        pass
    import platform
    return platform.processor() or platform.machine()


def temperature() -> dict | None:
    """أعلى حرارة للمعالج نفسه (Package/Tctl)، أو None إن لم يعطِ الجهاز قراءة."""
    if not psutil or not hasattr(psutil, "sensors_temperatures"):
        return None
    try:
        sens = psutil.sensors_temperatures() or {}
    except Exception:
        return None
    for chip in ("coretemp", "k10temp", "zenpower", "cpu_thermal", "acpitz"):
        rows = [r for r in sens.get(chip, []) if r.current and 0 < r.current < 130]
        if not rows:
            continue
        main = next((r for r in rows if (r.label or "").lower().startswith(("package", "tctl", "tdie"))), None)
        cur = (main or max(rows, key=lambda r: r.current)).current
        high = next((r.high for r in rows if r.high and r.high > 40), None)
        return {"current": round(cur, 1), "high": high, "source": chip}
    return None


def level(t: float | None) -> str | None:
    if t is None:
        return None
    return "hot" if t >= HOT_C else "warm" if t >= WARN_C else "ok"


def _sampler():
    while True:
        try:
            t = temperature()
            _history.append({"t": int(time.time()), "cpu": psutil.cpu_percent(interval=1), "temp": t["current"] if t else None})
        except Exception:
            pass
        time.sleep(SAMPLE_SEC - 1)


def start_sampler():
    """يبدأ مع السيرفر: عيّنة كل 30 ثانية لرسم آخر ساعة."""
    global _started
    if _started or not psutil:
        return
    _started = True
    threading.Thread(target=_sampler, daemon=True, name="cpu-sampler").start()


def alerts() -> list[dict]:
    """لتنبيهات «نظرة عامة» (health.build_alerts)."""
    t = temperature()
    if not t:
        return []
    if t["current"] >= HOT_C:
        return [{"level": "err", "title": f"حرارة المعالج مرتفعة جداً ({t['current']:.0f}°)",
                 "text": "تأكد أن فتحات التهوية غير مغطاة وأن المروحة تعمل. الأعمال الثقيلة (مثل تجهيز الفيديو) تُبطئ الجهاز الآن."}]
    if t["current"] >= WARN_C:
        return [{"level": "warn", "title": f"حرارة المعالج مرتفعة ({t['current']:.0f}°)", "text": "تأكد من التهوية حول الجهاز."}]
    return []


def top_processes(n: int = 6) -> list[dict]:
    if not psutil:
        return []
    procs = []
    for p in psutil.process_iter(["name", "cmdline"]):
        try:
            p.cpu_percent(None)
            procs.append(p)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    time.sleep(0.5)
    groups: dict[str, float] = {}
    for p in procs:
        try:
            c = p.cpu_percent(None)
            if c <= 0:
                continue
            label = friendly(p.info.get("name") or "", p.info.get("cmdline") or [])
            groups[label] = groups.get(label, 0) + c
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    ncpu = psutil.cpu_count() or 1
    rows = [{"name": k, "cpu": round(v / ncpu, 1)} for k, v in groups.items()]
    return sorted(rows, key=lambda r: -r["cpu"])[:n]


@bp.get("/api/admin/cpu")
@admin_required
def api_cpu():
    if not psutil:
        return jsonify(available=False, model=model())
    per = psutil.cpu_percent(interval=0.3, percpu=True)
    t = temperature()
    try:
        fr = psutil.cpu_freq()
    except Exception:
        fr = None
    try:
        load = [round(x, 2) for x in os.getloadavg()]
    except OSError:
        load = None
    return jsonify(available=True, model=model(), cores=psutil.cpu_count(logical=False), threads=psutil.cpu_count(),
                   freq={"current": round(fr.current), "max": round(fr.max)} if fr and fr.current else None,
                   usage=round(sum(per) / max(1, len(per)), 1), per_core=per, load=load,
                   temp=t, level=level(t["current"] if t else None), warn_c=WARN_C, hot_c=HOT_C,
                   history=list(_history), top=top_processes())
