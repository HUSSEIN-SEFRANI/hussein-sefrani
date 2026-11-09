#!/usr/bin/env python3
"""Writes /etc/issue — the text shown on the NAS's own screen above the login prompt.

It tells the user which address to open from a phone or computer and, before the
first admin account exists, the 6-digit setup code needed to create it remotely.
Runs as root just before the HomeNAS service starts (ExecStartPre=+ in the unit).
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
        return 1  # in doubt, do not show a setup code


code = None
if user_count() == 0:
    system.mkdir(parents=True, exist_ok=True)
    if code_file.exists() and code_file.read_text().strip():
        code = code_file.read_text().strip()
    else:
        code = f"{secrets.randbelow(10 ** 6):06d}"
        code_file.write_text(code)
    try:
        pw = pwd.getpwnam("homenas")
        for p in (data, system, code_file):
            os.chown(p, pw.pw_uid, pw.pw_gid)
    except KeyError:
        pass

suffix = "" if port == 80 else f":{port}"
host = socket.gethostname()
lines = [
    r"\S{PRETTY_NAME}  -  \l",
    "",
    "  ==========================================================",
    "                    HomeNAS is running",
    "  ==========================================================",
    "",
    "   On your phone or computer (same network), open:",
    "",
    rf"        http://\4{suffix}",
    f"        http://{host}.local{suffix}",
    "",
]
if code:
    lines += [
        "   First-time setup code:   " + " ".join(code),
        "   (needed once, to create the administrator account)",
        "",
    ]
lines += ["  ==========================================================", "", ""]
Path("/etc/issue").write_text("\n".join(lines))
