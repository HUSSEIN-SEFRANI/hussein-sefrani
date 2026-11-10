"""إعدادات الجهاز (v1.3): عنوان IP ثابت، الوايفاي، الوقت، وضع بدون إنترنت، البلوتوث.

كل التغييرات على النظام تمر عبر المساعد الجذري hsef-extras، ويتحقق هو من كل قيمة.
"""
from __future__ import annotations

import json
import os
import re
import subprocess

from flask import Blueprint, abort, jsonify

from .core import admin_required, body, log_action

bp = Blueprint("sysadmin", __name__)
HELPER = "/usr/local/sbin/hsef-extras"
APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"
OFFLINE_FLAG = "/etc/homenas/offline"


def available() -> bool:
    return APPLIANCE and os.path.exists(HELPER)


def helper(*args, timeout=120, stdin: str | None = None, as_json=False):
    if not available():
        abort(400, "متاح على جهاز HOME ANAB المخصص فقط")
    try:
        r = subprocess.run(["sudo", "-n", HELPER, *args], capture_output=True, text=True, timeout=timeout, input=stdin)
    except subprocess.TimeoutExpired:
        abort(504, "انتهت المهلة")
    if r.returncode != 0:
        abort(400, (r.stderr or r.stdout).strip().replace("hsef-extras: ", "") or "error")
    if as_json:
        try:
            return json.loads(r.stdout or "null")
        except ValueError:
            abort(500, "bad helper output")
    return r.stdout


def is_offline() -> bool:
    return os.path.exists(OFFLINE_FLAG)


# ------------------------------------------------------------------ الشبكة والوقت
@bp.get("/api/admin/device")
@admin_required
def api_device():
    if not available():
        return jsonify(available=False)
    return jsonify(available=True, net=helper("net-status", as_json=True), sys=helper("sys-status", as_json=True))


IP = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")


@bp.post("/api/admin/net")
@admin_required
def api_net_set():
    d = body()
    if d.get("mode") == "dhcp":
        helper("net-set", "dhcp")
    else:
        ip, gw = str(d.get("ip", "")).strip(), str(d.get("gateway", "")).strip()
        prefix = str(d.get("prefix") or "24").strip()
        dns = ",".join(x.strip() for x in str(d.get("dns") or "").split(",") if IP.match(x.strip()))
        if not (IP.match(ip) and IP.match(gw) and prefix.isdigit()):
            abort(400, "تحقق من العنوان والبوابة")
        helper("net-set", "static", ip, prefix, gw, dns or gw)
    log_action("تغيير إعدادات الشبكة", d.get("mode", "static"))
    return jsonify(ok=True)


@bp.post("/api/admin/net/confirm")
@admin_required
def api_net_confirm():
    helper("net-confirm")
    log_action("تأكيد عنوان الشبكة الجديد")
    return jsonify(ok=True)


@bp.post("/api/admin/time")
@admin_required
def api_time():
    v = str(body().get("datetime") or "").strip().replace("T", " ")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?", v):
        abort(400, "تاريخ أو وقت غير صالح")
    helper("time-set", v)
    log_action("ضبط الوقت يدوياً", v)
    return jsonify(ok=True)


@bp.post("/api/admin/offline")
@admin_required
def api_offline():
    on = bool(body().get("on"))
    helper("offline", "on" if on else "off")
    log_action("وضع بدون إنترنت", "تشغيل" if on else "إيقاف")
    return jsonify(ok=True)


# ------------------------------------------------------------------ الوايفاي
@bp.post("/api/admin/wifi/install")
@admin_required
def api_wifi_install():
    helper("wifi-install", timeout=3600)
    return jsonify(ok=True)


@bp.get("/api/admin/wifi/scan")
@admin_required
def api_wifi_scan():
    return jsonify(networks=helper("wifi-scan", timeout=60, as_json=True))


@bp.post("/api/admin/wifi")
@admin_required
def api_wifi_connect():
    d = body()
    ssid = str(d.get("ssid") or "").strip()
    if not ssid:
        abort(400, "اختر شبكة")
    helper("wifi-connect", ssid, stdin=str(d.get("password") or ""), timeout=120)
    log_action("الاتصال بالوايفاي", ssid)
    return jsonify(ok=True)


@bp.delete("/api/admin/wifi")
@admin_required
def api_wifi_forget():
    helper("wifi-forget", timeout=60)
    return jsonify(ok=True)


# ------------------------------------------------------------------ البلوتوث
MAC = re.compile(r"^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$")


@bp.get("/api/admin/bt")
@admin_required
def api_bt():
    if not available():
        return jsonify(available=False)
    return jsonify(available=True, **helper("bt-status", as_json=True))


@bp.post("/api/admin/bt/<action>")
@admin_required
def api_bt_action(action):
    mac = str(body().get("mac") or "")
    if action == "install":
        helper("bt-install", timeout=1800)
    elif action == "scan":
        helper("bt-scan", timeout=60)
    elif action in ("pair", "remove"):
        if not MAC.match(mac):
            abort(400)
        helper(f"bt-{action}", mac, timeout=90)
        log_action("بلوتوث", f"{action} {mac}")
    else:
        abort(404)
    return jsonify(available=True, **helper("bt-status", as_json=True))
