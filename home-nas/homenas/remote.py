"""الوصول الآمن من خارج البيت عبر Tailscale، مع HTTPS بشهادة حقيقية.

Tailscale يربط أجهزتك (الآيفون، الكمبيوتر، السيرفر) بشبكة خاصة مشفّرة (tailnet).
السيرفر لا يُفتح للإنترنت: لا يصل إليه إلا أجهزتك المسجّلة بنفس الحساب.
"""
from __future__ import annotations

import json
import os
import subprocess
import threading

from flask import Blueprint, abort, jsonify

from .core import admin_required, body, log_action, login_required

bp = Blueprint("remote", __name__)

HELPER = "/usr/local/sbin/hsef-extras"
APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"
LOOPBACK = {"127.0.0.1", "::1"}

_op = {"running": False, "error": None, "what": None}


def available() -> bool:
    return APPLIANCE and os.path.exists(HELPER)


def helper(*args, timeout=600) -> tuple[bool, str]:
    if not available():
        return False, "not available"
    try:
        r = subprocess.run(["sudo", "-n", HELPER, *args], capture_output=True, text=True, timeout=timeout)
        return r.returncode == 0, (r.stdout if r.returncode == 0 else (r.stderr or r.stdout)).strip()
    except subprocess.TimeoutExpired:
        return False, "timeout"


class LocalProxyFix:
    """يقبل ترويسات X-Forwarded-* فقط من وكيل على نفس الجهاز (tailscale serve).

    بذلك يرى التطبيق عنوان الجهاز الحقيقي و https، ولا يستطيع أحد على الشبكة المنزلية
    انتحال صفة «طلب محلي» بإرسال هذه الترويسات بنفسه.
    """

    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        if environ.get("REMOTE_ADDR") in LOOPBACK:
            xff = environ.get("HTTP_X_FORWARDED_FOR", "")
            if xff:
                environ["REMOTE_ADDR"] = xff.split(",")[0].strip()
            proto = environ.get("HTTP_X_FORWARDED_PROTO", "")
            if proto in ("http", "https"):
                environ["wsgi.url_scheme"] = proto
            host = environ.get("HTTP_X_FORWARDED_HOST", "")
            if host and "/" not in host and " " not in host:
                environ["HTTP_HOST"] = host
        return self.app(environ, start_response)


def _background(what: str, *steps):
    if _op["running"]:
        abort(409, "هناك عملية أخرى قيد التنفيذ، انتظر انتهاءها")
    _op.update(running=True, error=None, what=what)

    def work():
        try:
            for args in steps:
                ok, out = helper(*args, timeout=3600)
                if not ok:
                    _op["error"] = out.splitlines()[-1] if out else "error"
                    break
        finally:
            _op["running"] = False
    threading.Thread(target=work, daemon=True, name=f"remote-{what}").start()


@bp.get("/api/remote")
@login_required
def api_remote():
    out = {"available": available(), "op": dict(_op)}
    if available():
        ok, st = helper("ts-status", timeout=60)
        try:
            out["ts"] = json.loads(st) if ok else {"installed": False}
        except ValueError:
            out["ts"] = {"installed": False}
    return jsonify(out)


@bp.post("/api/remote/setup")
@admin_required
def api_setup():
    if not available():
        abort(400, "هذه الميزة متاحة على جهاز HOME ANAB المخصص فقط")
    _background("setup", ("ts-setup",), ("ts-login",))
    log_action("تثبيت Tailscale")
    return jsonify(ok=True)


@bp.post("/api/remote/login")
@admin_required
def api_login():
    _background("login", ("ts-login",))
    return jsonify(ok=True)


@bp.post("/api/remote/https")
@admin_required
def api_https():
    on = bool(body().get("on"))
    ok, out = helper("ts-https", "on" if on else "off", timeout=180)
    if not ok:
        if "HTTPS_DISABLED" in out:
            abort(400, "فعّل HTTPS في لوحة Tailscale أولاً: DNS ← HTTPS Certificates ← Enable")
        abort(400, out or "error")
    log_action("تفعيل HTTPS عبر Tailscale" if on else "إيقاف HTTPS عبر Tailscale")
    return jsonify(ok=True)


@bp.post("/api/remote/logout")
@admin_required
def api_logout():
    ok, out = helper("ts-logout", timeout=120)
    if not ok:
        abort(400, out or "error")
    log_action("فصل Tailscale")
    return jsonify(ok=True)
