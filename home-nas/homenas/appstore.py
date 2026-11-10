"""مركز التطبيقات: تثبيت تطبيقات خوادم منزلية جاهزة (حاويات Docker) بضغطة زر.

قائمة التطبيقات في apps/catalog.json. التثبيت الفعلي يتم عبر المساعد hsef-apps (root)،
والتطبيق هنا يكتب فقط اختيارات المستخدم (المنفذ والمجلدات) ويتابع التقدّم.
"""
from __future__ import annotations

import json
import os
import re
import secrets
import subprocess
import threading
import time
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify, request

from .core import APP_DIR, CONFIG_PATH, admin_required, body, connect, current_user, get_db, log_action, login_required, now_iso

bp = Blueprint("appstore", __name__)

HELPER = "/usr/local/sbin/hsef-apps"
APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"
LOG_DIR = Path("/var/lib/homenas/apps")
ALLOWED_ROOTS = ("/srv/", "/mnt/", "/media/")
RESERVED_PORTS = {22, 53, 80, 443, 445, 139, 5353, 8200, 631}
CATALOG_FILE = APP_DIR / "apps" / "catalog.json"


def available() -> bool:
    return APPLIANCE and os.path.exists(HELPER)


def load_catalog() -> dict:
    return {a["id"]: a for a in json.loads(CATALOG_FILE.read_text(encoding="utf-8"))["apps"]}


def helper(*args, timeout=3600) -> tuple[bool, str]:
    if not available():
        return False, "not available"
    try:
        r = subprocess.run(["sudo", "-n", HELPER, *args], capture_output=True, text=True, timeout=timeout)
        return r.returncode == 0, (r.stdout if r.returncode == 0 else (r.stderr or r.stdout)).strip()
    except subprocess.TimeoutExpired:
        return False, "timeout"


class AppStore:
    def __init__(self, data_paths):
        self.paths = data_paths
        self.ops: dict[str, dict] = {}
        self.lock = threading.Lock()

    def busy(self) -> bool:
        return any(o["running"] for o in self.ops.values())

    def run(self, key: str, args: list[str], on_done=None):
        """تنفيذ عملية طويلة في الخلفية (واحدة في كل مرة)."""
        if self.busy():
            abort(409, "هناك عملية أخرى قيد التنفيذ، انتظر انتهاءها")
        op = {"op": args[0], "running": True, "error": None, "started": now_iso()}
        self.ops[key] = op

        def work():
            with self.lock:
                ok, out = helper(*args)
                op.update(running=False, error=None if ok else (out.splitlines()[-1] if out else "error"),
                          finished=now_iso())
                if on_done:
                    try:
                        on_done(ok)
                    except Exception as exc:  # pragma: no cover
                        print(f"[appstore] {exc}")
        threading.Thread(target=work, daemon=True, name=f"app-{key}").start()


def store() -> AppStore:
    return current_app.extensions["nas_apps"]


def installed_rows(db) -> dict:
    return {r["id"]: dict(r) for r in db.execute("SELECT * FROM installed_apps")}


def shared_folders(db) -> list[dict]:
    out = []
    for f in db.execute("SELECT id, name, path FROM folders ORDER BY name"):
        real = os.path.realpath(f["path"])
        out.append({"id": f["id"], "name": f["name"],
                    "usable": any((real + "/").startswith(r) for r in ALLOWED_ROOTS)})
    return out


def read_log(app_id: str, lines: int = 40) -> str:
    try:
        text = (LOG_DIR / f"{app_id}.log").read_text(errors="replace")
    except OSError:
        return ""
    return "\n".join(text.splitlines()[-lines:])


# ----------------------------------------------------------------------------- API

@bp.get("/api/appstore")
@admin_required
def api_store():
    db = get_db()
    cat = load_catalog()
    rows = installed_rows(db)
    engine = None
    states = {}
    if available():
        ok, out = helper("check", timeout=30)
        engine = json.loads(out) if ok else {"docker": False, "running": False, "compose": False}
        if engine.get("docker"):
            ok, out = helper("status", timeout=60)
            states = json.loads(out) if ok and out else {}
    ram = None
    try:
        import psutil
        ram = psutil.virtual_memory().total // (1024 * 1024)
    except Exception:
        pass
    apps = []
    for app_id, a in cat.items():
        item = {k: a.get(k) for k in ("id", "name", "category", "icon", "color", "ram_mb", "port", "path",
                                      "summary", "notes", "folders", "fixed_port", "uses_dns")}
        inst = rows.get(app_id)
        if inst:
            opts = json.loads(inst["options"] or "{}")
            item["installed"] = {"port": inst["port"], "show_all": bool(inst["show_all"]),
                                 "installed_at": inst["installed_at"], "folders": opts.get("folder_ids", {}),
                                 "password": opts.get("password")}
        item["state"] = (states.get(app_id) or {}).get("state")
        item["op"] = store().ops.get(app_id)
        apps.append(item)
    return jsonify(available=available(), engine=engine, engine_op=store().ops.get("_engine"), ram_mb=ram,
                   apps=apps, folders=shared_folders(db))


@bp.get("/api/appstore/installed")
@login_required
def api_installed():
    """التطبيقات المثبتة التي تظهر على سطح المكتب."""
    user = current_user()
    db = get_db()
    cat = load_catalog()
    out = []
    for r in db.execute("SELECT * FROM installed_apps ORDER BY installed_at"):
        a = cat.get(r["id"])
        if a and (user["is_admin"] or r["show_all"]):
            out.append({"id": a["id"], "name": a["name"], "icon": a["icon"], "color": a["color"],
                        "port": r["port"], "path": a.get("path", "/")})
    return jsonify(out)


@bp.post("/api/appstore/engine")
@admin_required
def api_engine():
    if not available():
        abort(400, "هذه الميزة متاحة على جهاز HOME ANAB المخصص فقط")
    store().run("_engine", ["setup"])
    log_action("تثبيت محرك التطبيقات")
    return jsonify(ok=True)


@bp.post("/api/appstore/<app_id>/install")
@admin_required
def api_install(app_id):
    if not available():
        abort(400, "هذه الميزة متاحة على جهاز HOME ANAB المخصص فقط")
    cat = load_catalog()
    app = cat.get(app_id)
    if not app:
        abort(404)
    data = body()
    db = get_db()
    rows = installed_rows(db)

    port = app["port"] if app.get("fixed_port") else int(data.get("port") or app["port"])
    hsef_port = int(current_app.config["NAS_CFG"].get("port", 80))
    used = {r["port"]: i for i, r in rows.items() if i != app_id}
    if not (1024 <= port <= 65535) or port in RESERVED_PORTS or port == hsef_port:
        abort(400, "المنفذ غير مسموح، اختر رقماً بين 1024 و 65535")
    if port in used:
        abort(409, f"المنفذ {port} مستخدم من تطبيق آخر")
    if app.get("uses_dns") and any(cat.get(i, {}).get("uses_dns") for i in rows if i != app_id):
        abort(409, "يوجد تطبيق DNS آخر مثبت")

    folder_ids, folder_paths = {}, {}
    for f in app.get("folders", []):
        fid = (data.get("folders") or {}).get(f["key"])
        row = db.execute("SELECT * FROM folders WHERE id=?", (fid,)).fetchone() if fid else None
        if not row:
            abort(400, "اختر مجلداً مشتركاً لكل حقل")
        real = os.path.realpath(row["path"])
        if not any((real + "/").startswith(r) for r in ALLOWED_ROOTS):
            abort(400, "هذا المجلد خارج الأماكن المسموحة للتطبيقات (/srv أو /mnt أو /media)")
        folder_ids[f["key"]] = row["id"]
        folder_paths[f["key"]] = real

    prev = json.loads(rows[app_id]["options"]) if app_id in rows else {}
    opts = {"port": port, "folders": folder_paths, "folder_ids": folder_ids}
    if app.get("password"):
        opts["password"] = prev.get("password") or "".join(
            secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789") for _ in range(14))

    opt_dir = CONFIG_PATH.parent / "apps"
    opt_dir.mkdir(parents=True, exist_ok=True)
    (opt_dir / f"{app_id}.json").write_text(json.dumps(opts))
    db.execute("INSERT INTO installed_apps(id, port, options, show_all, installed_at) VALUES (?,?,?,?,?) "
               "ON CONFLICT(id) DO UPDATE SET port=excluded.port, options=excluded.options, show_all=excluded.show_all",
               (app_id, port, json.dumps(opts), int(bool(data.get("show_all", True))), now_iso()))
    db.commit()
    store().run(app_id, ["install", app_id])
    log_action("تثبيت تطبيق", app["name"])
    return jsonify(ok=True)


@bp.post("/api/appstore/<app_id>/<action>")
@admin_required
def api_action(app_id, action):
    cat = load_catalog()
    if app_id not in cat or action not in ("start", "stop", "restart", "update", "remove"):
        abort(404)
    db = get_db()
    if not db.execute("SELECT 1 FROM installed_apps WHERE id=?", (app_id,)).fetchone():
        abort(404, "التطبيق غير مثبت")
    if action == "remove":
        purge = bool(body().get("purge"))
        db_path = store().paths.db

        def done(ok):
            if ok:
                c = connect(db_path)
                c.execute("DELETE FROM installed_apps WHERE id=?", (app_id,))
                c.commit()
                c.close()
        store().run(app_id, ["remove", app_id] + (["--purge"] if purge else []), on_done=done)
        log_action("إزالة تطبيق", cat[app_id]["name"])
    else:
        store().run(app_id, [action, app_id])
        log_action({"start": "تشغيل تطبيق", "stop": "إيقاف تطبيق", "restart": "إعادة تشغيل تطبيق",
                    "update": "تحديث تطبيق"}[action], cat[app_id]["name"])
    return jsonify(ok=True)


@bp.post("/api/appstore/<app_id>/visibility")
@admin_required
def api_visibility(app_id):
    db = get_db()
    db.execute("UPDATE installed_apps SET show_all=? WHERE id=?", (int(bool(body().get("show_all"))), app_id))
    db.commit()
    return jsonify(ok=True)


@bp.get("/api/appstore/<app_id>/log")
@admin_required
def api_log(app_id):
    if not re.match(r"^[a-z0-9_]{2,32}$", app_id):
        abort(404)
    text = read_log(app_id, 60)
    if request.args.get("container") == "1" and app_id != "_engine":
        ok, out = helper("logs", app_id, timeout=90)
        text = out if ok else text
    return jsonify(log=text, op=store().ops.get(app_id))
