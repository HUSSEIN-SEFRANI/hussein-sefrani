"""صحة التخزين: حالة RAID، فحص SMART للأقراص، والتنبيهات."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path

from flask import Blueprint, jsonify

from .backup import backup_engine, backup_root
from .core import current_user, get_db, login_required, paths

bp = Blueprint("health", __name__)

_smart_cache: dict = {"t": 0, "disks": []}


def raid_arrays() -> list[dict]:
    """يقرأ /proc/mdstat (لا يحتاج صلاحيات root)."""
    try:
        text = Path("/proc/mdstat").read_text()
    except OSError:
        return []
    arrays, cur = [], None
    for line in text.splitlines():
        m = re.match(r"^(md\S+)\s*:\s*(\S+)\s+(?:\(\S+\)\s+)?(raid\d+|linear)?\s*(.*)$", line)
        if m:
            members = []
            for d in m.group(4).split():
                dm = re.match(r"([^\[]+)\[\d+\](\((F|S)\))?", d)
                if dm:
                    members.append({"dev": dm.group(1), "failed": dm.group(3) == "F", "spare": dm.group(3) == "S"})
            cur = {"name": m.group(1), "state": m.group(2), "level": m.group(3) or "", "members": members,
                   "slots": "", "healthy": True, "action": None, "progress": None, "finish": None}
            arrays.append(cur)
            continue
        if cur is None:
            continue
        sm = re.search(r"\[(\d+)/(\d+)\]\s+\[([U_]+)\]", line)
        if sm:
            cur["slots"] = sm.group(3)
            cur["healthy"] = sm.group(1) == sm.group(2) and "_" not in sm.group(3)
        pm = re.search(r"(recovery|resync|reshape|check)\s*=\s*([\d.]+)%.*?finish=([\d.]+min)?", line)
        if pm:
            cur.update(action=pm.group(1), progress=float(pm.group(2)), finish=pm.group(3))
    for a in arrays:
        if any(m["failed"] for m in a["members"]):
            a["healthy"] = False
    return arrays


def list_disks() -> list[dict]:
    if not shutil.which("lsblk"):
        return []
    try:
        out = subprocess.run(["lsblk", "-J", "-d", "-b", "-o", "NAME,SIZE,MODEL,TYPE,TRAN,ROTA"],
                             capture_output=True, text=True, timeout=10).stdout
        return [d for d in json.loads(out)["blockdevices"] if d.get("type") == "disk"
                and not d["name"].startswith(("zram", "loop", "sr", "fd"))]
    except Exception:
        return []


def smart_disks(force: bool = False) -> list[dict]:
    """يقرأ حالة SMART (يتطلب smartctl وصلاحية sudo محددة؛ يُخزن 10 دقائق)."""
    if not force and time.time() - _smart_cache["t"] < 600:
        return _smart_cache["disks"]
    disks = []
    smartctl = shutil.which("smartctl") or ("/usr/sbin/smartctl" if os.path.exists("/usr/sbin/smartctl") else None)
    for d in list_disks():
        info = {"name": d["name"], "size": d.get("size"), "model": (d.get("model") or "").strip(),
                "transport": d.get("tran"), "hdd": bool(d.get("rota")), "smart": None, "passed": None,
                "temp": None, "hours": None, "reallocated": None, "pending": None}
        if smartctl and os.environ.get("HOMENAS_APPLIANCE") == "1":
            try:
                r = subprocess.run(["sudo", "-n", "/usr/sbin/smartctl", "-j", "-H", "-A", f"/dev/{d['name']}"],
                                   capture_output=True, text=True, timeout=30)
                j = json.loads(r.stdout or "{}")
                if "smart_status" in j:
                    info["smart"] = True
                    info["passed"] = bool(j["smart_status"].get("passed"))
                    info["temp"] = (j.get("temperature") or {}).get("current")
                    info["hours"] = (j.get("power_on_time") or {}).get("hours")
                    for attr in (j.get("ata_smart_attributes") or {}).get("table", []):
                        if attr.get("id") == 5:
                            info["reallocated"] = attr.get("raw", {}).get("value")
                        if attr.get("id") == 197:
                            info["pending"] = attr.get("raw", {}).get("value")
                    nv = j.get("nvme_smart_health_information_log")
                    if nv and info["temp"] is None:
                        info["temp"] = nv.get("temperature")
            except Exception:
                pass
        disks.append(info)
    _smart_cache.update(t=time.time(), disks=disks)
    return disks


def build_alerts(db, arrays, disks) -> list[dict]:
    alerts = []
    for a in arrays:
        if not a["healthy"]:
            failed = [m["dev"] for m in a["members"] if m["failed"]]
            alerts.append({"level": "err", "title": f"مصفوفة RAID {a['name']} متدهورة",
                           "text": ("القرص المعطّل: " + "، ".join(failed) + ". " if failed else "")
                           + "بياناتك ما زالت سليمة على القرص الآخر، لكن استبدل القرص المعطّل في أقرب وقت: "
                             "sudo homenas-disk replace /dev/sdX"})
        elif a["action"] in ("recovery", "resync"):
            alerts.append({"level": "warn", "title": f"إعادة بناء RAID {a['name']}",
                           "text": f"{a['progress']}% — المتبقي تقريباً {a['finish'] or '؟'}"})
    for d in disks:
        if d["passed"] is False:
            alerts.append({"level": "err", "title": f"القرص {d['name']} يوشك على التعطّل",
                           "text": f"فحص SMART فشل ({d['model']}). انسخ بياناتك احتياطياً واستبدله."})
        elif (d["reallocated"] or 0) > 0 or (d["pending"] or 0) > 0:
            alerts.append({"level": "warn", "title": f"علامات تلف على القرص {d['name']}",
                           "text": f"قطاعات معطوبة: {d['reallocated'] or 0}، قيد الانتظار: {d['pending'] or 0}. راقب القرص."})
    try:
        du = shutil.disk_usage(paths().data)
        if du.used / du.total > 0.92:
            alerts.append({"level": "warn", "title": "مساحة التخزين أوشكت على الامتلاء",
                           "text": f"المستخدم {du.used * 100 // du.total}%."})
    except OSError:
        pass
    s = backup_engine().settings(db)
    if s["enabled"]:
        last_ok = s["last_success"]
        stale = not last_ok or datetime.fromisoformat(last_ok) < datetime.now() - timedelta(days=3)
        if s["last"] and not s["last"].get("ok"):
            alerts.append({"level": "warn", "title": "فشل آخر نسخ احتياطي",
                           "text": s["last"].get("error") or s["last"].get("summary") or ""})
        elif stale and s["last"]:
            alerts.append({"level": "warn", "title": "لم يتم نسخ احتياطي منذ أكثر من 3 أيام",
                           "text": "تأكد أن قرص النسخ الاحتياطي موصول."})
    return alerts


@bp.get("/api/system/health")
@login_required
def api_health():
    if not current_user()["is_admin"]:
        return jsonify(alerts=[], arrays=[], disks=[])
    arrays = raid_arrays()
    disks = smart_disks()
    db = get_db()
    s = backup_engine().settings(db)
    return jsonify(alerts=build_alerts(db, arrays, disks), arrays=arrays, disks=disks,
                   backup={"enabled": s["enabled"], "last": s["last"], "last_success": s["last_success"],
                           "connected": bool(backup_root(s["target"])), "running": backup_engine().status["running"]})
