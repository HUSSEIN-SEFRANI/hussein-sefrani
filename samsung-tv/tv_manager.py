#!/usr/bin/env python3
"""
Samsung TV Manager - مدير تلفاز سامسونغ
=======================================

أداة محلية (بدون أي مكتبات خارجية) تعمل على حاسوبك المتصل بنفس شبكة التلفاز:
  * تبحث عن أجهزة تلفاز سامسونغ (Tizen) في الشبكة المحلية (SSDP + فحص الشبكة).
  * تعرض معلومات الجهاز وحالة "وضع المطوّر / الخبير".
  * تقترن بالتلفاز عبر واجهة التحكم الرسمية (WebSocket على المنفذ 8002).
  * تعرض التطبيقات المثبّتة، وتشغّلها، وتُخفيها من الواجهة، وتحذف ما يمكن حذفه
    عبر أداة sdb (عند تفعيل وضع المطوّر).
  * تنشئ قائمة حظر نطاقات الإعلانات والتتبّع لاستخدامها في الراوتر / Pi-hole / AdGuard.
  * تقدّم واجهة ويب بسيطة وجميلة تختار منها تطبيقاتك المفضّلة وتتحكم بالتلفاز.

التشغيل:
    python3 tv_manager.py            ثم افتح  http://localhost:8765
    python3 tv_manager.py --port 9000 --no-browser
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import ipaddress
import json
import os
import re
import shutil
import socket
import ssl
import struct
import subprocess
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import prayer

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_FILE = BASE_DIR / "tv_data.json"  # tokens + favourites + hidden apps
APP_NAME = "TV Manager"

REST_PORT = 8001  # http  - device info / app status
WSS_PORT = 8002  # wss   - remote control (token based)
SDB_PORT = 26101  # Tizen developer bridge

_data_lock = threading.Lock()


# --------------------------------------------------------------------------- #
#  Persistent data                                                            #
# --------------------------------------------------------------------------- #
def load_data() -> dict:
    with _data_lock:
        if DATA_FILE.exists():
            try:
                return json.loads(DATA_FILE.read_text("utf-8"))
            except (OSError, ValueError):
                pass
        return {"tvs": {}}


def save_data(data: dict) -> None:
    with _data_lock:
        tmp = DATA_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
        tmp.replace(DATA_FILE)


def tv_record(data: dict, ip: str) -> dict:
    rec = data["tvs"].setdefault(ip, {})
    rec.setdefault("favorites", [])
    rec.setdefault("hidden", [])
    return rec


# --------------------------------------------------------------------------- #
#  Validation helpers                                                         #
# --------------------------------------------------------------------------- #
def valid_ip(ip: str) -> str:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError as exc:
        raise ValueError("عنوان IP غير صالح") from exc
    if not addr.is_private:
        raise ValueError("يُسمح فقط بعناوين الشبكة المحلية")
    return str(addr)


_APP_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
_KEY_RE = re.compile(r"^KEY_[A-Z0-9_]{1,32}$")


def valid_app_id(app_id: str) -> str:
    if not isinstance(app_id, str) or not _APP_ID_RE.match(app_id):
        raise ValueError("معرّف التطبيق غير صالح")
    return app_id


# --------------------------------------------------------------------------- #
#  Discovery                                                                  #
# --------------------------------------------------------------------------- #
SSDP_TARGETS = (
    "urn:samsung.com:device:RemoteControlReceiver:1",
    "urn:dial-multiscreen-org:service:dial:1",
    "ssdp:all",
)


_TV_SSL = ssl.create_default_context()
_TV_SSL.check_hostname = False
_TV_SSL.verify_mode = ssl.CERT_NONE  # TVs use a self-signed certificate
LAN = urllib.request.build_opener(
    urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=_TV_SSL)
)


def api_bases(ip: str) -> list[str]:
    """2016-2023 models serve the REST API on http:8001; 2024+ only on https:8002."""
    return [f"http://{ip}:{REST_PORT}", f"https://{ip}:{WSS_PORT}"]


def lan_get(url: str, timeout: float = 3.0, method: str = "GET") -> tuple[int, str]:
    """HTTP request to a LAN device, bypassing any system proxy."""
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "TVManager"})
    try:
        with LAN.open(req, timeout=timeout) as resp:
            return resp.status, resp.read(200_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(2000).decode("utf-8", "replace")


def get_device_info(ip: str, timeout: float = 2.0) -> dict | None:
    """GET http://ip:8001/api/v2/  -> Samsung Tizen device description."""
    try:
        info = None
        for base in api_bases(ip):
            try:
                status, text = lan_get(f"{base}/api/v2/", timeout)
            except (OSError, urllib.error.URLError):
                continue
            if status == 200:
                info = json.loads(text)
                break
    except ValueError:
        return None
    if not isinstance(info, dict):
        return None
    dev = info.get("device") or {}
    if not dev:
        # 2016 models answer with a flat structure
        if "samsung" not in json.dumps(info).lower() and "tizen" not in json.dumps(info).lower():
            return None
        dev = {"name": info.get("name"), "modelName": info.get("model") or info.get("modelName"),
               "OS": "Tizen", "firmwareVersion": info.get("version", "")}
    return {
        "ip": ip,
        "name": dev.get("name") or info.get("name") or "Samsung TV",
        "model": dev.get("modelName") or dev.get("model") or "",
        "os": dev.get("OS") or "Tizen",
        "firmware": dev.get("firmwareVersion") or "",
        "mac": dev.get("wifiMac") or "",
        "network": dev.get("networkType") or "",
        "resolution": dev.get("resolution") or "",
        "power": dev.get("PowerState") or "on",
        "token_auth": dev.get("TokenAuthSupport") == "true",
        "developer_mode": str(dev.get("developerMode", "0")) == "1",
        "developer_ip": dev.get("developerIP") or "",
        "frame_tv": dev.get("FrameTVSupport") == "true",
        "id": dev.get("id") or info.get("id") or "",
    }


def ssdp_discover(timeout: float = 3.0) -> set[str]:
    found: set[str] = set()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
    sock.settimeout(0.5)
    try:
        for st in SSDP_TARGETS:
            msg = (
                "M-SEARCH * HTTP/1.1\r\n"
                "HOST: 239.255.255.250:1900\r\n"
                'MAN: "ssdp:discover"\r\n'
                "MX: 2\r\n"
                f"ST: {st}\r\n\r\n"
            ).encode()
            try:
                sock.sendto(msg, ("239.255.255.250", 1900))
            except OSError:
                return found
        end = _now() + timeout
        while _now() < end:
            try:
                payload, addr = sock.recvfrom(4096)
            except socket.timeout:
                continue
            except OSError:
                break
            text = payload.decode("utf-8", "replace").lower()
            if "samsung" in text or "tizen" in text or "dial" in text:
                found.add(addr[0])
    finally:
        sock.close()
    return found


def _now() -> float:
    import time

    return time.monotonic()


def local_ipv4() -> str | None:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def port_open(ip: str, port: int, timeout: float = 0.35) -> bool:
    try:
        with socket.create_connection((ip, port), timeout=timeout):
            return True
    except OSError:
        return False


def subnet_scan(extra_subnet: str | None = None) -> set[str]:
    """Scan the local /24 for hosts answering on 8001 (Samsung REST API)."""
    nets = []
    me = local_ipv4()
    if me:
        nets.append(ipaddress.ip_network(f"{me}/24", strict=False))
    if extra_subnet:
        net = ipaddress.ip_network(extra_subnet, strict=False)
        if net.num_addresses <= 1024 and net.is_private:
            nets.append(net)
    hosts = {str(h) for n in nets for h in n.hosts()}
    hosts.discard(me or "")
    with concurrent.futures.ThreadPoolExecutor(max_workers=128) as pool:
        results = pool.map(
            lambda h: (h, port_open(h, REST_PORT) or port_open(h, WSS_PORT)), sorted(hosts)
        )
        return {h for h, ok in results if ok}


def discover(subnet: str | None = None) -> list[dict]:
    candidates = ssdp_discover() | subnet_scan(subnet)
    data = load_data()
    candidates |= set(data["tvs"].keys())  # previously paired TVs
    tvs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for info in pool.map(get_device_info, sorted(candidates)):
            if info:
                info["paired"] = bool(data["tvs"].get(info["ip"], {}).get("token"))
                tvs.append(info)
    return tvs


# --------------------------------------------------------------------------- #
#  Minimal WebSocket client (RFC 6455) - stdlib only                          #
# --------------------------------------------------------------------------- #
class WSClosed(Exception):
    pass


class WebSocket:
    def __init__(self, host: str, port: int, path: str, secure: bool, timeout=10):
        raw = socket.create_connection((host, port), timeout=timeout)
        if secure:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE  # TV uses a self-signed certificate
            raw = ctx.wrap_socket(raw, server_hostname=host)
        self.sock = raw
        self.buf = b""
        key = base64.b64encode(os.urandom(16)).decode()
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(request.encode())
        while b"\r\n\r\n" not in self.buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise WSClosed("handshake failed")
            self.buf += chunk
        head, self.buf = self.buf.split(b"\r\n\r\n", 1)
        status = head.split(b"\r\n", 1)[0]
        if b" 101 " not in status + b" ":
            raise WSClosed(status.decode("latin-1"))

    def settimeout(self, t: float) -> None:
        self.sock.settimeout(t)

    def _read(self, n: int) -> bytes:
        while len(self.buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise WSClosed("connection closed")
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def _send_frame(self, opcode: int, payload: bytes) -> None:
        header = bytes([0x80 | opcode])
        n = len(payload)
        if n < 126:
            header += bytes([0x80 | n])
        elif n < 65536:
            header += bytes([0x80 | 126]) + struct.pack("!H", n)
        else:
            header += bytes([0x80 | 127]) + struct.pack("!Q", n)
        mask = os.urandom(4)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(header + mask + masked)

    def send_json(self, obj: dict) -> None:
        self._send_frame(0x1, json.dumps(obj).encode())

    def recv_json(self) -> dict:
        message = b""
        while True:
            b1, b2 = self._read(2)
            fin, opcode = b1 & 0x80, b1 & 0x0F
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack("!H", self._read(2))[0]
            elif n == 127:
                n = struct.unpack("!Q", self._read(8))[0]
            mask = self._read(4) if b2 & 0x80 else None
            payload = self._read(n)
            if mask:
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
            if opcode == 0x8:
                raise WSClosed("closed by TV")
            if opcode == 0x9:
                self._send_frame(0xA, payload)
                continue
            if opcode in (0x0, 0x1, 0x2):
                message += payload
                if fin:
                    try:
                        return json.loads(message.decode("utf-8", "replace"))
                    except ValueError:
                        message = b""
                        continue

    def close(self) -> None:
        try:
            self._send_frame(0x8, b"")
        except OSError:
            pass
        try:
            self.sock.close()
        except OSError:
            pass


# --------------------------------------------------------------------------- #
#  Samsung remote-control channel                                             #
# --------------------------------------------------------------------------- #
class TVError(Exception):
    pass


def open_channel(ip: str, pair_timeout: float = 30.0) -> WebSocket:
    """Open the remote-control channel, pairing on first use.

    The first time, the TV shows an "Allow" prompt; the token it returns is
    stored so later connections are silent.
    """
    data = load_data()
    rec = tv_record(data, ip)
    name = base64.b64encode(APP_NAME.encode()).decode()
    query = {"name": name}
    if rec.get("token"):
        query["token"] = rec["token"]
    path = "/api/v2/channels/samsung.remote.control?" + urllib.parse.urlencode(query)

    try:
        ws = WebSocket(ip, WSS_PORT, path, secure=True)
    except (OSError, WSClosed):
        # Older models (2016-2017) only expose plain ws on 8001.
        try:
            ws = WebSocket(ip, REST_PORT, path, secure=False)
        except (OSError, WSClosed) as exc:
            raise TVError(f"تعذّر الاتصال بالتلفاز: {exc}") from exc

    ws.settimeout(pair_timeout)
    try:
        while True:
            msg = ws.recv_json()
            event = msg.get("event")
            if event == "ms.channel.connect":
                token = (msg.get("data") or {}).get("token")
                if token and token != rec.get("token"):
                    data = load_data()
                    tv_record(data, ip)["token"] = token
                    save_data(data)
                ws.settimeout(10)
                return ws
            if event in ("ms.channel.unauthorized", "ms.channel.timeOut"):
                ws.close()
                raise TVError("رُفض الاتصال - اضغط «سماح / Allow» على شاشة التلفاز ثم أعد المحاولة")
    except socket.timeout as exc:
        ws.close()
        raise TVError("انتهت المهلة - وافق على طلب الاقتران من شاشة التلفاز") from exc
    except WSClosed as exc:
        raise TVError(f"أُغلق الاتصال: {exc}") from exc


LEGACY_PORT = 55000


def legacy_key(ip: str, key: str) -> None:
    """Samsung legacy remote protocol (C/D/E/F/H series, 2010-2014)."""
    def chunk(data: bytes) -> bytes:
        return struct.pack("<H", len(data)) + data

    def b64(text: str) -> bytes:
        return base64.b64encode(text.encode())

    app = b"iphone..iapp.samsung"
    auth = b"\x64\x00" + chunk(b64(local_ipv4() or "0.0.0.0")) + chunk(b64("00-00-00-00-00-00")) \
        + chunk(b64(APP_NAME))
    cmd = b"\x00\x00\x00" + chunk(b64(key))
    try:
        with socket.create_connection((ip, LEGACY_PORT), timeout=30) as sock:
            sock.sendall(b"\x00" + chunk(app) + chunk(auth))
            reply = sock.recv(4096)
            if b"\x64\x00\x00\x00" in reply:
                raise TVError("رفض التلفاز الاتصال - اختر «سماح» على الشاشة")
            sock.sendall(b"\x00" + chunk(app) + chunk(cmd))
            sock.recv(4096)
    except socket.timeout as exc:
        raise TVError("انتهت المهلة - وافق على طلب الاتصال على شاشة التلفاز") from exc
    except OSError as exc:
        raise TVError(f"تعذّر الاتصال بالتلفاز (منفذ 55000): {exc}") from exc


def send_key(ip: str, key: str) -> None:
    if not _KEY_RE.match(key):
        raise ValueError("زر غير صالح")
    try:
        ws = open_channel(ip)
    except TVError:
        if port_open(ip, LEGACY_PORT, 1.0):
            return legacy_key(ip, key)
        raise
    try:
        ws.send_json(
            {
                "method": "ms.remote.control",
                "params": {
                    "Cmd": "Click",
                    "DataOfCmd": key,
                    "Option": "false",
                    "TypeOfRemote": "SendRemoteKey",
                },
            }
        )
    finally:
        ws.close()


def list_apps(ip: str) -> list[dict]:
    ws = open_channel(ip)
    try:
        ws.send_json(
            {
                "method": "ms.channel.emit",
                "params": {"event": "ed.installedApp.get", "to": "host"},
            }
        )
        while True:
            msg = ws.recv_json()
            if msg.get("event") == "ed.installedApp.get":
                apps = (msg.get("data") or {}).get("data") or []
                break
    except socket.timeout as exc:
        raise TVError("التلفاز لم يُرجع قائمة التطبيقات") from exc
    finally:
        ws.close()
    out = []
    for app in apps:
        app_id = str(app.get("appId", ""))
        if not _APP_ID_RE.match(app_id):
            continue
        out.append(
            {
                "appId": app_id,
                "name": app.get("name") or app_id,
                "type": app.get("app_type", 2),
                "icon": app.get("icon") or "",
                "bloat": is_bloat(app.get("name") or ""),
            }
        )
    out.sort(key=lambda a: a["name"].lower())
    return out


def launch_app(ip: str, app_id: str, app_type: int = 2) -> None:
    app_id = valid_app_id(app_id)
    # REST launch works on most models without pairing.
    for base in api_bases(ip):
        try:
            status, _ = lan_get(f"{base}/api/v2/applications/{app_id}", 4, "POST")
            if status < 400:
                return
        except (OSError, urllib.error.URLError):
            pass
    ws = open_channel(ip)
    try:
        ws.send_json(
            {
                "method": "ms.channel.emit",
                "params": {
                    "event": "ed.apps.launch",
                    "to": "host",
                    "data": {
                        "appId": app_id,
                        "action_type": "NATIVE_LAUNCH" if app_type == 4 else "DEEP_LINK",
                    },
                },
            }
        )
    finally:
        ws.close()


# --------------------------------------------------------------------------- #
#  Bloatware heuristics & ad-blocking lists                                   #
# --------------------------------------------------------------------------- #
BLOAT_KEYWORDS = (
    "tv plus", "promotion", "samsung health", "gaming hub", "game launcher",
    "art store", "universal guide", "bixby", "alexa", "rakuten", "samsung daily+",
    "samsung daily", "smartthings", "workout", "e-manual", "samsung free",
    "samsung promotion", "shop", "deezer", "tiktok", "facebook watch",
)


def is_bloat(name: str) -> bool:
    n = name.lower()
    return any(k in n for k in BLOAT_KEYWORDS)


AD_DOMAINS = {
    "safe": [
        # Samsung Ads network
        "ads.samsung.com",
        "samsungads.com",
        "config.samsungads.com",
        "ad.samsungadhub.com",
        "samsungadhub.com",
        "ads.samsungads.com",
        "gpm.samsungqbe.com",
        # Automatic Content Recognition (viewing-habit tracking)
        "samsungacr.com",
        "log-config.samsungacr.com",
        "log-ingestion.samsungacr.com",
        "acr0.samsungcloudsolution.com",
        # Analytics / tracking
        "samsung-com.112.2o7.net",
        "analytics.samsungknox.com",
        "samsung.d2.sc.omtrdc.net",
        "insights.samsung.com",
        "nmetrics.samsung.com",
        "smetrics.samsung.com",
        "bigdata.ssp.samsung.com",
    ],
    "aggressive": [
        # قد يؤثر على بعض البلاطات في Smart Hub أو على اقتراحات المحتوى
        "samsungqbe.com",
        "lcprd1.samsungcloudsolution.net",
        "lcprd2.samsungcloudsolution.net",
        "noticecdn.samsungcloudsolution.com",
        "samsungrm.net",
        "samsungcloudcdn.com",
        "doubleclick.net",
        "googleads.g.doubleclick.net",
        "pubads.g.doubleclick.net",
        "app-measurement.com",
    ],
}


def build_blocklist(level: str, fmt: str) -> str:
    domains = list(AD_DOMAINS["safe"])
    if level == "aggressive":
        domains += AD_DOMAINS["aggressive"]
    lines = [
        "# Samsung TV ad & tracking blocklist - generated by tv_manager.py",
        f"# level: {level}",
    ]
    for d in domains:
        if fmt == "hosts":
            lines.append(f"0.0.0.0 {d}")
        elif fmt == "adguard":
            lines.append(f"||{d}^")
        elif fmt == "dnsmasq":
            lines.append(f"address=/{d}/0.0.0.0")
        else:
            lines.append(d)
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------- #
#  sdb (Tizen developer bridge) - uninstall user apps                         #
# --------------------------------------------------------------------------- #
def sdb_path() -> str | None:
    found = shutil.which("sdb")
    if found:
        return found
    for cand in (
        Path.home() / "tizen-studio/tools/sdb",
        Path.home() / "tizen-studio/tools/sdb.exe",
        Path("C:/tizen-studio/tools/sdb.exe"),
    ):
        if cand.exists():
            return str(cand)
    return None


def sdb_uninstall(ip: str, app_id: str) -> str:
    app_id = valid_app_id(app_id)
    sdb = sdb_path()
    if not sdb:
        raise TVError("أداة sdb غير موجودة - ثبّت Tizen Studio (انظر الدليل)")
    target = f"{ip}:{SDB_PORT}"
    log = []
    for cmd in (
        [sdb, "connect", target],
        [sdb, "-s", target, "shell", "0", "vd_appuninstall", app_id],
    ):
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        log.append(f"$ {' '.join(cmd[1:])}\n{res.stdout}{res.stderr}".strip())
    out = "\n".join(log)
    if "fail" in out.lower() or "error" in out.lower():
        raise TVError("لم يسمح التلفاز بحذف التطبيق (تطبيقات النظام محميّة)\n" + out)
    return out


# --------------------------------------------------------------------------- #
#  HTTP API + static UI                                                       #
# --------------------------------------------------------------------------- #
MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "SamsungTVManager/1.0"

    def log_message(self, fmt, *args):  # quieter console
        if "/api/" in (args[0] if args else ""):
            super().log_message(fmt, *args)

    # ---- helpers ---------------------------------------------------------
    def _json(self, obj, status=HTTPStatus.OK):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _text(self, text: str, filename: str):
        body = text.encode()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n > 100_000:
            raise ValueError("طلب كبير جداً")
        raw = self.rfile.read(n) if n else b"{}"
        return json.loads(raw or b"{}")

    def _same_origin(self) -> bool:
        # Block cross-site requests from other web pages to this local API.
        origin = self.headers.get("Origin")
        if not origin:
            return True
        host = self.headers.get("Host", "")
        return urllib.parse.urlparse(origin).netloc == host

    # ---- routing ---------------------------------------------------------
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = dict(urllib.parse.parse_qsl(url.query))
        try:
            if url.path == "/api/discover":
                subnet = q.get("subnet") or None
                return self._json({"tvs": discover(subnet), "me": local_ipv4()})
            if url.path == "/api/tv":
                ip = valid_ip(q.get("ip", ""))
                info = get_device_info(ip)
                if not info:
                    return self._json({"error": "لم يتم العثور على تلفاز سامسونغ في هذا العنوان"}, 404)
                rec = load_data()["tvs"].get(ip, {})
                info["paired"] = bool(rec.get("token"))
                info["sdb"] = bool(sdb_path())
                info["sdb_port_open"] = port_open(ip, SDB_PORT, 0.8)
                info["me"] = local_ipv4()
                return self._json(info)
            if url.path == "/api/apps":
                ip = valid_ip(q.get("ip", ""))
                apps = list_apps(ip)
                data = load_data()
                rec = tv_record(data, ip)
                return self._json(
                    {"apps": apps, "favorites": rec["favorites"], "hidden": rec["hidden"]}
                )
            if url.path == "/api/prefs":
                ip = valid_ip(q.get("ip", ""))
                rec = tv_record(load_data(), ip)
                return self._json({"favorites": rec["favorites"], "hidden": rec["hidden"]})
            if url.path == "/api/blocklist":
                level = "aggressive" if q.get("level") == "aggressive" else "safe"
                fmt = q.get("format", "plain")
                if fmt not in ("plain", "hosts", "adguard", "dnsmasq"):
                    fmt = "plain"
                return self._text(build_blocklist(level, fmt), f"samsung-tv-{level}-{fmt}.txt")
            if url.path == "/api/prayer":
                data = load_data()
                cfg = data.get("prayer") or {}

                def save_cache(result):
                    d = load_data()
                    d.setdefault("prayer", {})["cache"] = result
                    save_data(d)

                return self._json(prayer.get_times(cfg, save_cache))
            if url.path == "/api/prayer/search":
                try:
                    return self._json({"mosques": prayer.search_mosques(q.get("q", "Mouscron"))})
                except (OSError, ValueError) as exc:
                    return self._json({"error": f"تعذّر البحث في مواقيت: {exc}"}, 502)
            if url.path == "/api/domains":
                return self._json(AD_DOMAINS)
            return self._static(url.path)
        except ValueError as exc:
            self._json({"error": str(exc)}, 400)
        except TVError as exc:
            self._json({"error": str(exc)}, 502)

    def do_POST(self):
        if not self._same_origin():
            return self._json({"error": "forbidden"}, 403)
        url = urllib.parse.urlparse(self.path)
        try:
            body = self._body()
            if url.path == "/api/prayer/config":
                data = load_data()
                slug = str(body.get("slug") or "").strip()
                data["prayer"] = {"slug": prayer.parse_slug(slug)} if slug else {}
                save_data(data)
                return self._json({"ok": True})
            ip = valid_ip(str(body.get("ip", "")))
            if url.path == "/api/pair":
                open_channel(ip, pair_timeout=40).close()
                return self._json({"ok": True})
            if url.path == "/api/key":
                send_key(ip, str(body.get("key", "")))
                return self._json({"ok": True})
            if url.path == "/api/launch":
                launch_app(ip, str(body.get("appId", "")), int(body.get("type", 2)))
                return self._json({"ok": True})
            if url.path == "/api/uninstall":
                out = sdb_uninstall(ip, str(body.get("appId", "")))
                return self._json({"ok": True, "log": out})
            if url.path == "/api/prefs":
                data = load_data()
                rec = tv_record(data, ip)
                for field in ("favorites", "hidden"):
                    if field in body:
                        rec[field] = [valid_app_id(a) for a in body[field]][:200]
                save_data(data)
                return self._json({"ok": True})
            return self._json({"error": "not found"}, 404)
        except ValueError as exc:
            self._json({"error": str(exc)}, 400)
        except TVError as exc:
            self._json({"error": str(exc)}, 502)
        except (OSError, subprocess.SubprocessError) as exc:
            self._json({"error": f"خطأ: {exc}"}, 500)

    def _static(self, path: str):
        if path in ("", "/"):
            path = "/index.html"
        target = (STATIC_DIR / path.lstrip("/")).resolve()
        if STATIC_DIR not in target.parents or not target.is_file():
            return self._json({"error": "not found"}, 404)
        body = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", MIME.get(target.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)



def check(ip: str | None) -> None:
    """Explain step by step why a TV is (not) reachable."""
    import platform

    ok = lambda b: "✔" if b else "✘"
    me = local_ipv4()
    print(f"نظام الحاسوب: {platform.system()}  |  عنوان هذا الحاسوب: {me or 'غير معروف'}")
    if not me:
        print("✘ الحاسوب غير متصل بأي شبكة.")
        return
    if not ipaddress.ip_address(me).is_private:
        print("✘ عنوان الحاسوب ليس عنوان شبكة منزلية - هل يعمل VPN؟ أوقفه وأعد المحاولة.")
    if not ip:
        print("\nالبحث التلقائي…")
        tvs = discover()
        if tvs:
            for tv in tvs:
                print(f"✔ وُجد: {tv['ip']}  {tv['name']}  [{tv['model']}]")
            return
        print("✘ لم يُعثر على تلفاز تلقائياً.")
        print("  أدخل عنوان التلفاز يدوياً:  python3 tv_manager.py --check 192.168.1.50")
        print("  (على التلفاز: الإعدادات ← عام ← الشبكة ← حالة الشبكة ← إعدادات IP)")
        return
    ip = valid_ip(ip)
    same = ipaddress.ip_address(ip) in ipaddress.ip_network(f"{me}/24", strict=False)
    print(f"\nالتلفاز: {ip}")
    print(f"{ok(same)} نفس الشبكة الفرعية" + ("" if same else
          " - التلفاز والحاسوب على شبكتين مختلفتين (شبكة ضيوف؟ موسّع شبكة؟ راوترين؟)"))
    p8001, p8002, psdb = (port_open(ip, prt, 1.5) for prt in (REST_PORT, WSS_PORT, SDB_PORT))
    print(f"{ok(p8001)} منفذ 8001 (الواجهة القديمة)" + ("" if p8001 or not p8002 else
          " - طبيعي في موديلات 2024 وما بعدها"))
    print(f"{ok(p8002)} منفذ 8002 (التحكم عن بُعد)")
    print(f"{ok(psdb)} منفذ 26101 (وضع المطوّر / Tizen)")
    info = get_device_info(ip, 4) if (p8001 or p8002) else None
    if info:
        print(f"✔ تلفاز سامسونغ: {info['name']} [{info['model']}]")
        dev_ok = info["developer_mode"]
        print(f"{ok(dev_ok)} وضع المطوّر " + ("مفعّل" if dev_ok else "غير مفعّل"))
        if dev_ok and info["developer_ip"] and info["developer_ip"] != me:
            print(f"✘ وضع المطوّر مضبوط على عنوان آخر ({info['developer_ip']}) وليس {me}"
                  " - غيّره في التلفاز (Apps ← 12345) ثم أعد تشغيل التلفاز.")
        print("\nكل شيء جاهز ✔  شغّل: python3 tv_manager.py")
        return
    print("\nالتشخيص:")
    extra = {prt: port_open(ip, prt, 1.5) for prt in (LEGACY_PORT, 8080, 8000, 7676, 9197, 9119)}
    print("منافذ أخرى: " + "  ".join(f"{ok(v)} {k}" for k, v in extra.items()))
    if p8001 or p8002:
        print("\nما يردّ به الجهاز:")
        for base, path in [(b, pth) for b in api_bases(ip) for pth in ("/api/v2/", "/ms/1.0/")]:
            try:
                status, text = lan_get(f"{base}{path}", 4)
                print(f"  {base}{path} → HTTP {status}: {' '.join(text.split())[:300]}")
            except (OSError, urllib.error.URLError) as exc:
                print(f"  {base}{path} → خطأ: {exc}")
        if p8002:
            print("\nتجربة الاقتران عبر 8002 - انظر إلى شاشة التلفاز واضغط «سماح / Allow» خلال 30 ثانية…")
            try:
                open_channel(ip).close()
                print("✔ تم الاقتران! التحكم يعمل. شغّل الآن: py tv_manager.py")
                return
            except TVError as exc:
                print(f"✘ {exc}")
        status_ms = None
        try:
            status_ms, _ = lan_get(f"http://{ip}:{REST_PORT}/ms/1.0/", 4)
        except (OSError, urllib.error.URLError):
            pass
        if status_ms == 200:
            print(" • يبدو أنه تلفاز سامسونغ موديل 2015 (سلسلة J، Tizen 2.3) يستخدم واجهة قديمة.")
        if extra[LEGACY_PORT]:
            print(" • المنفذ 55000 مفتوح: تلفاز سامسونغ موديل 2010-2014. أزرار الريموت ستعمل عبر البروتوكول القديم،"
                  " لكن قائمة التطبيقات غير مدعومة في هذه الموديلات.")
        print(" • أرسل هذه النتيجة كاملة، مع موديل التلفاز (الإعدادات ← الدعم ← حول هذا التلفاز)، لأضيف الدعم المناسب.")
    if not (p8001 or p8002 or psdb):
        print(" • التلفاز لا يردّ إطلاقاً. تأكد أنه مُشغَّل (وليس في وضع الاستعداد)، وأن العنوان صحيح.")
        print(" • فعّل في التلفاز: الإعدادات ← عام ← مدير الأجهزة الخارجية ← إعدادات اتصال الجهاز ← الوصول = تشغيل.")
        print(" • فعّل: الإعدادات ← عام ← الشبكة ← إعدادات الخبير ← التشغيل عبر الشبكة/الجوال (Power On with Mobile).")
        print(" • في الراوتر أوقف «عزل العملاء / AP Isolation» ولا تستخدم شبكة الضيوف.")
        print(" • أوقف VPN على الحاسوب، واسمح لـ Python في جدار حماية ويندوز (شبكة خاصة).")
    elif psdb and not p8001:
        print(" • وضع المطوّر يعمل لكن واجهة التحكم مغلقة - أعد تشغيل التلفاز.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Samsung TV Manager")
    parser.add_argument("--host", default="127.0.0.1", help="listen address")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--scan", action="store_true", help="discover TVs and exit")
    parser.add_argument("--check", nargs="?", const="", metavar="TV_IP",
                        help="diagnose why the TV is not found")
    args = parser.parse_args()

    if args.check is not None:
        return check(args.check or None)
    if args.scan:
        tvs = discover()
        if not tvs:
            print("لم يتم العثور على أي تلفاز سامسونغ. تأكد أن التلفاز يعمل وعلى نفس الشبكة.")
        for tv in tvs:
            dev = "مفعّل" if tv["developer_mode"] else "غير مفعّل"
            print(f"{tv['ip']:15}  {tv['name']}  [{tv['model']}]  وضع المطوّر: {dev}")
        return

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = f"http://{'localhost' if args.host in ('127.0.0.1', '0.0.0.0') else args.host}:{args.port}"
    print(f"Samsung TV Manager يعمل على: {url}   (Ctrl+C للإيقاف)")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nتم الإيقاف.")


if __name__ == "__main__":
    main()
