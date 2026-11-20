"""البند 4: بطارية أيادي التحكم وشحنها، ونوع اليد من رقم الشركة والمنتج (Vendor/Product ID).

تعريفات لينكس (hid-playstation، hid-sony، hid-nintendo، xpadneo…) تكتب بطارية كل يد في
/sys/class/power_supply/<الاسم>/ ويقرؤها أي برنامج بلا صلاحيات root.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

from flask import Blueprint, jsonify

from .core import admin_required

bp = Blueprint("pads", __name__)

MAC_RE = re.compile(r"([0-9a-f]{2}(?:[:_][0-9a-f]{2}){5})", re.I)
# Vendor:Product ← النوع (للأزرار: بلايستيشن ✕○□△، إكس بوكس A B X Y، نينتندو A يمين)
VENDORS = {"054c": "ps", "045e": "xbox", "057e": "nintendo", "2dc8": "8bitdo", "0f0d": "ps", "0e6f": "xbox",
           "24c6": "xbox", "046d": "xbox", "0738": "xbox", "20d6": "nintendo", "1532": "xbox"}
PRODUCTS = {"054c:0ce6": "DualSense (PS5)", "054c:0df2": "DualSense Edge (PS5)", "054c:05c4": "DualShock 4 (PS4)",
            "054c:09cc": "DualShock 4 (PS4)", "054c:0268": "DualShock 3 (PS3)", "057e:2009": "Switch Pro",
            "057e:2006": "Joy-Con (L)", "057e:2007": "Joy-Con (R)", "045e:0b12": "Xbox Series", "045e:0b13": "Xbox Series",
            "045e:0b20": "Xbox Series", "045e:02fd": "Xbox One S", "045e:02ea": "Xbox One S", "045e:02e0": "Xbox One S",
            "045e:028e": "Xbox 360"}


def sysfs() -> Path:
    return Path(os.environ.get("HSEF_SYSFS_ROOT", "/sys")) / "class" / "power_supply"


def _read(p: Path) -> str:
    try:
        return p.read_text(errors="replace").strip()
    except OSError:
        return ""


def batteries() -> list[dict]:
    """بطاريات الأجهزة الموصولة (الأيادي، والسماعات أحياناً)، لا بطارية اللابتوب نفسه."""
    out = []
    try:
        items = sorted(sysfs().iterdir())
    except OSError:
        return out
    for d in items:
        if _read(d / "type") != "Battery" or _read(d / "scope") != "Device":
            continue   # بطارية الجهاز نفسه (لابتوب) لها scope=System أو بلا scope
        cap = _read(d / "capacity")
        hid = dict(line.split("=", 1) for line in _read(d / "device" / "uevent").splitlines() if "=" in line)
        m = MAC_RE.search(d.name) or MAC_RE.search(hid.get("HID_UNIQ", ""))
        vid = pid = ""
        hm = re.match(r"[0-9A-F]{4}:([0-9A-F]{8}):([0-9A-F]{8})", hid.get("HID_ID", ""), re.I)
        if hm:
            vid, pid = hm.group(1)[-4:].lower(), hm.group(2)[-4:].lower()
        out.append({
            "id": d.name,
            "mac": m.group(1).replace("_", ":").upper() if m else "",
            "name": hid.get("HID_NAME", "") or d.name,
            "capacity": int(cap) if cap.isdigit() else None,
            "level": _read(d / "capacity_level") or None,          # بعض الأيادي تعطي مستوى فقط (Low/Normal/Full)
            "status": _read(d / "status") or "Unknown",            # Charging / Discharging / Full
            "vendor": vid, "product": pid,
            "kind": VENDORS.get(vid, ""), "model": PRODUCTS.get(f"{vid}:{pid}", ""),
        })
    return out


@bp.get("/api/tv/pads/battery")
def api_tv_battery():
    from .tv import tv_guard
    tv_guard()
    return jsonify(pads=batteries())


@bp.get("/api/admin/pads/battery")
@admin_required
def api_admin_battery():
    return jsonify(pads=batteries())
