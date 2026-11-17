#!/usr/bin/env python3
"""Writes /etc/issue — the text shown on the NAS's own screen above the login prompt.

It tells the user which address to open from a phone or computer, this device's number for
activation and, before the first admin account exists, how to reach the seller on WhatsApp.
Runs as root just before the HOME ANAB service starts (ExecStartPre=+ in the unit).
"""
import json
import os
import pwd
import secrets
import socket
import sqlite3
from pathlib import Path

CONF = Path(os.environ.get("HOMENAS_CONFIG", "/etc/homenas/config.json"))
cfg = json.loads(CONF.read_text()) if CONF.exists() else {}
data = Path(cfg.get("data_dir", "/srv/homenas/data"))
port = int(cfg.get("port", 80))
system = data / "@system"
db = system / "nas.db"
code_file = system / "setup_code"


def user_count() -> int:
    if not db.exists():
        return 0
    try:
        # immutable=1: read without creating WAL/SHM files owned by root
        con = sqlite3.connect(f"file:{db}?immutable=1", uri=True)
        return con.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    except Exception:
        return 1  # in doubt, treat setup as done


code = None
if user_count() == 0:
    system.mkdir(parents=True, exist_ok=True)
    code = "ask"  # الرمز سرّي: يُطلب من المطوّر
    code_file.unlink(missing_ok=True)
    try:
        pw = pwd.getpwnam("homenas")
        for p in (data, system, code_file):
            os.chown(p, pw.pw_uid, pw.pw_gid) if p.exists() else None
    except KeyError:
        pass

suffix = "" if port == 80 else f":{port}"
host = socket.gethostname()
try:   # الاسم الفعلي على الشبكة: avahi تغيّره وحدها (مثل hsef-2) إن وُجد جهاز آخر بالاسم نفسه
    import re as _re, subprocess as _sp, time as _time
    for _ in range(10):   # عند الإقلاع قد تتأخر avahi ثوانٍ
        _r = _sp.run(["busctl", "call", "org.freedesktop.Avahi", "/", "org.freedesktop.Avahi.Server", "GetHostName"],
                     capture_output=True, text=True, timeout=5)
        _m = _re.match(r'^s "([^"]+)"', _r.stdout.strip())
        if _r.returncode == 0 and _m:
            host = _m.group(1)
            break
        _time.sleep(1)
except Exception:
    pass
lines = [
    r"\S{PRETTY_NAME}  -  \l",
    "",
    "  ==========================================================",
    "          HOME ANAB - Free Home Backup System is running",
    "  ==========================================================",
    "",
    "   On your phone or computer (same network), open:",
    "",
    rf"        http://\4{suffix}",
    f"        http://{host}.local{suffix}",
    "",
]
QR = [
    "     █████████████████████████████",
    "     ██ ▄▄▄▄▄ █ ▀▀▄ ███▄█ ▄▄▄▄▄ ██",
    "     ██ █   █ ███ ▄▄ █▄▀█ █   █ ██",
    "     ██ █▄▄▄█ █ ▄▄ █▄▀█▄█ █▄▄▄█ ██",
    "     ██▄▄▄▄▄▄▄█ █ ▀ █▄▀▄█▄▄▄▄▄▄▄██",
    "     ██▄  ▀█▄▄▀▄  ███  █▄  ▄▀█  ██",
    "     ███▄▀▀▀█▄▀▄▀█▄█▄█ █ ▄▀█ ▄█▄██",
    "     ██▄▀▄▀▄█▄ ▀ █▄ ▀  █▄ ▀███▀ ██",
    "     ██▄▄▀▄▀█▄▄▀▀▄▀ ▄  ▀█▀▀▀ ▄█▄██",
    "     ██▄▄██▄▄▄▄ ▄▄█▄▀ █ ▄▄▄ ██▄▀██",
    "     ██ ▄▄▄▄▄ █▀  ▄▄▄ █ █▄█ ██▀▄██",
    "     ██ █   █ ██▀█ ██  ▄ ▄▄ █▀ ███",
    "     ██ █▄▄▄█ █ ▀▄ █▄██  ▀  ▄█▄▄██",
    "     ██▄▄▄▄▄▄▄█▄██▄██▄█▄█▄██▄██▄██",
    "     █████████████████████████████",
]
if code:
    lines += ["   Free trial: 14 days. To activate, send the device number to the seller on WhatsApp", ""] + QR + [
        "     WhatsApp: +32 494 49 94 30", ""]
try:   # رقم الجهاز للتفعيل (يحسبه hsef-extras من العتاد)
    import subprocess
    dev = json.loads(subprocess.run(["/usr/local/sbin/hsef-extras", "device-id"], capture_output=True, text=True,
                                    timeout=20).stdout or "{}").get("device", "")
except Exception:
    dev = ""
if len(dev) == 8:
    lines += [f"   Device number (for activation):  HA-{dev[:4]}-{dev[4:]}", ""]
lines += ["   If the web page stops working after an update, log in here and type:",
          "       sudo hsef-extras update-rollback", ""]
lines += ["   HOME ANAB by Hussein Sefrani  -  +32 494 49 94 30  -  Hussein@sefrani.com",
          "  ==========================================================", "", ""]
Path("/etc/issue").write_text("\n".join(lines), encoding="utf-8")
