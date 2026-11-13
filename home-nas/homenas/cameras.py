"""الكاميرات: تسجيل كاميرات المراقبة الموجودة في شبكة البيت ومشاهدتها.

- تضيف الكاميرا بعنوانها واسم المستخدم وكلمة المرور، ويجد النظام رابط البث وحده
  (ONVIF أولاً، ثم الروابط المعروفة لكل نوع: Cisco و Hikvision و Dahua و Tapo و Reolink …).
- لكل كاميرا عملية ffmpeg واحدة تعمل بالنسخ بدون تحويل (خفيفة جداً على الجهاز):
    1) تسجيل مستمر في مقاطع من 5 دقائق (إن كان التسجيل مفعّلاً)
    2) بث مباشر HLS في الذاكرة للمشاهدة من الهاتف والتلفاز
    3) صورة حية تتجدد من الإطارات المفتاحية فقط
  كاميرات MJPEG القديمة تُحوَّل إلى H.264 عند التسجيل لأن المتصفحات لا تشغّل MJPEG داخل MP4.
- تُحذف التسجيلات الأقدم من عدد الأيام المختار، أو عند تجاوز الحد الأقصى للمساحة، أو عند امتلاء القرص.
- المشاهدة: المدير ومن يختارهم المدير، وعلى التلفاز من أُضيف له مربع «الكاميرات».
"""
from __future__ import annotations

import base64
import collections
import hashlib
import html
import json
import os
import re
import shutil
import socket
import subprocess
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify, request, send_file, session

from .core import FFMPEG, body, connect, current_user, get_db, get_setting, log_action, now_iso, set_setting

bp = Blueprint("cameras", __name__)

FFPROBE = shutil.which("ffprobe")
SEG_SECONDS = 300
KEEP_DAYS_DEFAULT = 7
MIN_FREE_PCT = 5            # لا نترك القرص يمتلئ: أقل من 5% فارغ → نحذف الأقدم
SEG_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.mp4$")
SCHEMA = """
CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, username TEXT, password TEXT,
    codec TEXT, audio TEXT, width INTEGER, height INTEGER,
    record INTEGER NOT NULL DEFAULT 1, enabled INTEGER NOT NULL DEFAULT 1, position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT
);
"""


def migrate(db):
    db.executescript(SCHEMA)
    db.commit()


# ============================================================================ الروابط
def with_auth(url: str, user: str | None, pw: str | None) -> str:
    """يضع اسم المستخدم وكلمة المرور داخل الرابط (كما يفهمه ffmpeg)."""
    if not user:
        return url
    u = urllib.parse.urlsplit(url)
    host = u.hostname or ""
    if ":" in host:
        host = f"[{host}]"
    netloc = f"{urllib.parse.quote(user, safe='')}:{urllib.parse.quote(pw or '', safe='')}@{host}" + (f":{u.port}" if u.port else "")
    return urllib.parse.urlunsplit((u.scheme, netloc, u.path, u.query, u.fragment))


def strip_auth(url: str) -> str:
    u = urllib.parse.urlsplit(url)
    if "@" not in u.netloc:
        return url
    return urllib.parse.urlunsplit((u.scheme, u.netloc.rsplit("@", 1)[1], u.path, u.query, u.fragment))


def hide_secrets(text: str, *secrets) -> str:
    text = re.sub(r"(rtsps?|https?)://[^/@\s]+@", r"\1://***@", text or "")
    for s in secrets:
        if s:
            text = text.replace(s, "***").replace(urllib.parse.quote(s, safe=""), "***")
    return text


# أشهر روابط البث لكل نوع ({h} العنوان، {p} منفذ RTSP)
BRANDS = {
    "cisco": ["rtsp://{h}:{p}/StreamingSetting?version=1.0&action=getRTSPStream&ChannelID=1&ChannelName=Channel1",
              "rtsp://{h}:{p}/img/media.sav", "rtsp://{h}:9000/live", "rtsp://{h}:{p}/live.sdp",
              "rtsp://{h}:{p}/MediaInput/h264", "rtsp://{h}:{p}/MediaInput/mpeg4",
              "http://{h}/img/video.mjpeg", "http://{h}/img/mjpeg.cgi", "http://{h}/video.mjpg"],
    "hikvision": ["rtsp://{h}:{p}/Streaming/Channels/101", "rtsp://{h}:{p}/h264/ch1/main/av_stream"],
    "ezviz": ["rtsp://{h}:{p}/H.264", "rtsp://{h}:{p}/Streaming/Channels/101"],
    "dahua": ["rtsp://{h}:{p}/cam/realmonitor?channel=1&subtype=0"],
    "tapo": ["rtsp://{h}:{p}/stream1"],
    "reolink": ["rtsp://{h}:{p}/h264Preview_01_main", "rtsp://{h}:{p}/Preview_01_main"],
    "axis": ["rtsp://{h}:{p}/axis-media/media.amp"],
}
GENERIC = ["rtsp://{h}:{p}/", "rtsp://{h}:{p}/live", "rtsp://{h}:{p}/live.sdp", "rtsp://{h}:{p}/stream1", "rtsp://{h}:{p}/h264",
           "rtsp://{h}:{p}/ch0_0.h264", "rtsp://{h}:{p}/11", "rtsp://{h}:{p}/onvif1", "rtsp://{h}:{p}/videoMain",
           "rtsp://{h}:{p}/video1", "rtsp://{h}:{p}/media/video1", "rtsp://{h}:{p}/Streaming/Channels/101",
           "rtsp://{h}:{p}/cam/realmonitor?channel=1&subtype=0", "rtsp://{h}:{p}/h264Preview_01_main",
           "http://{h}/video.mjpg", "http://{h}/mjpg/video.mjpg", "http://{h}/videostream.cgi", "http://{h}/img/video.mjpeg"]


def input_args(url: str) -> list:
    if url.startswith("rtsp"):
        return ["-rtsp_transport", "tcp", "-timeout", "10000000"]
    return ["-rw_timeout", "15000000"]


def probe(url: str, timeout=12) -> dict:
    """يفحص رابط بث: يرجع نوع الصورة والصوت، أو سبب الفشل."""
    if not FFPROBE:
        return {"ok": False, "why": "ffprobe"}
    io = ["-rtsp_transport", "tcp", "-timeout", "6000000"] if url.startswith("rtsp") else ["-rw_timeout", "6000000"]
    cmd = [FFPROBE, "-v", "error", *io, "-show_entries", "stream=codec_type,codec_name,width,height", "-of", "json", url]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return {"ok": False, "why": "timeout"}
    err = r.stderr or ""
    try:
        streams = json.loads(r.stdout or "{}").get("streams", [])
    except ValueError:
        streams = []
    v = next((s for s in streams if s.get("codec_type") == "video"), None)
    if r.returncode == 0 and v:
        a = next((s for s in streams if s.get("codec_type") == "audio"), None)
        return {"ok": True, "codec": v.get("codec_name"), "width": v.get("width"), "height": v.get("height"),
                "audio": a.get("codec_name") if a else None}
    if re.search(r"401|Unauthorized|authorization failed", err, re.I):
        return {"ok": False, "why": "auth"}
    if re.search(r"refused", err, re.I):
        return {"ok": False, "why": "refused"}
    if re.search(r"404|Not Found", err, re.I):
        return {"ok": False, "why": "notfound"}
    return {"ok": False, "why": "other"}


# ---------------------------------------------------------------------------- ONVIF
_NOPROXY = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def _xml(s: str) -> str:
    return html.escape(s or "", quote=True)


def onvif_call(url: str, body_xml: str, user: str, pw: str, timeout=5) -> str:
    sec = ""
    if user:
        nonce = os.urandom(16)
        created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        digest = base64.b64encode(hashlib.sha1(nonce + created.encode() + (pw or "").encode()).digest()).decode()
        sec = ('<s:Header><Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">'
               f'<UsernameToken><Username>{_xml(user)}</Username>'
               '<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">'
               f'{digest}</Password><Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">'
               f'{base64.b64encode(nonce).decode()}</Nonce>'
               f'<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">{created}</Created>'
               '</UsernameToken></Security></s:Header>')
    env = ('<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">'
           f'{sec}<s:Body>{body_xml}</s:Body></s:Envelope>')
    req = urllib.request.Request(url, data=env.encode(), headers={"Content-Type": "application/soap+xml; charset=utf-8"})
    with _NOPROXY.open(req, timeout=timeout) as r:
        return r.read(500000).decode("utf-8", "replace")


def onvif_stream(host: str, user: str, pw: str) -> str | None:
    """يسأل الكاميرا (ONVIF) عن رابط بثها الرئيسي."""
    for port in (80, 8000, 8080, 2020):
        dev = f"http://{host}:{port}/onvif/device_service"
        try:
            caps = onvif_call(dev, '<GetCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl"><Category>Media</Category></GetCapabilities>', user, pw)
        except Exception:  # noqa: BLE001
            continue
        m = re.search(r"Media>.*?XAddr>\s*([^<\s]+)\s*<", caps, re.S)
        media = m.group(1) if m else dev
        mu = urllib.parse.urlsplit(media)
        media = urllib.parse.urlunsplit((mu.scheme or "http", f"{host}:{mu.port or port}", mu.path or "/onvif/media_service", mu.query, ""))
        try:
            prof = onvif_call(media, '<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>', user, pw)
            tok = re.search(r'Profiles[^>]*token="([^"]+)"', prof)
            if not tok:
                continue
            res = onvif_call(media, '<GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl"><StreamSetup>'
                                    '<Stream xmlns="http://www.onvif.org/ver10/schema">RTP-Unicast</Stream>'
                                    '<Transport xmlns="http://www.onvif.org/ver10/schema"><Protocol>RTSP</Protocol></Transport>'
                                    f'</StreamSetup><ProfileToken>{_xml(tok.group(1))}</ProfileToken></GetStreamUri>', user, pw)
        except Exception:  # noqa: BLE001
            continue
        u = re.search(r"Uri>\s*([^<\s]+)\s*<", res)
        if u:
            su = urllib.parse.urlsplit(html.unescape(u.group(1)))
            # بعض الكاميرات تذكر عنواناً داخلياً مختلفاً: نستعمل العنوان الذي نعرفه
            return urllib.parse.urlunsplit((su.scheme, f"{host}:{su.port}" if su.port else host, su.path, su.query, ""))
    return None


def detect(host: str, user: str, pw: str, brand: str = "", rtsp_port: int = 554) -> dict:
    """يجد رابط البث: ONVIF، ثم روابط النوع المختار، ثم الروابط الشائعة."""
    host = host.strip()
    tried, auth_fail = [], False
    cands = []
    try:
        u = onvif_stream(host, user, pw)
        if u:
            cands.append(u)
    except Exception:  # noqa: BLE001
        pass
    for t in BRANDS.get(brand, []) + [x for b, lst in BRANDS.items() if b != brand for x in lst] + GENERIC:
        c = t.format(h=host, p=rtsp_port)
        if c not in cands:
            cands.append(c)
    # RTSP مغلق؟ نتجاوز روابطه بسرعة
    def port_open(port):
        try:
            with socket.create_connection((host, port), timeout=1.5):
                return True
        except OSError:
            return False
    open_ports = {p: port_open(p) for p in {rtsp_port, 9000, 80}}
    def usable(c):
        u = urllib.parse.urlsplit(c)
        return open_ports.get(u.port or (554 if u.scheme == "rtsp" else 80), True)
    cands = [c for c in cands if usable(c)][:28]
    results = {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {c: ex.submit(probe, with_auth(c, user, pw)) for c in cands}
        for c in cands:
            try:
                results[c] = futs[c].result(timeout=40)
            except Exception:  # noqa: BLE001
                results[c] = {"ok": False, "why": "timeout"}
    for c in cands:
        r = results[c]
        tried.append({"url": c, "why": r.get("why", "ok")})
        if r["ok"]:
            return {"ok": True, "url": c, **{k: r.get(k) for k in ("codec", "audio", "width", "height")}}
        auth_fail = auth_fail or r.get("why") == "auth"
    if not any(open_ports.values()):
        return {"ok": False, "why": "offline", "tried": tried}
    return {"ok": False, "why": "auth" if auth_fail else "notfound", "tried": tried}


def discover(timeout=3.0) -> list:
    """يبحث عن الكاميرات في الشبكة: ONVIF (WS-Discovery) ثم كل عنوان فيه منفذ RTSP مفتوح."""
    found = {}
    probe_msg = ('<?xml version="1.0" encoding="UTF-8"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" '
                 'xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" '
                 'xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><e:Header><w:MessageID>uuid:' + os.urandom(16).hex() +
                 '</w:MessageID><w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>'
                 '<w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>'
                 '<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>')
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        s.settimeout(0.5)
        s.sendto(probe_msg.encode(), ("239.255.255.250", 3702))
        end = time.time() + timeout
        while time.time() < end:
            try:
                data, addr = s.recvfrom(65535)
            except socket.timeout:
                continue
            txt = data.decode("utf-8", "replace")
            name = re.search(r"onvif://www\.onvif\.org/name/([^\s<]+)", txt)
            hw = re.search(r"onvif://www\.onvif\.org/hardware/([^\s<]+)", txt)
            found[addr[0]] = {"ip": addr[0], "onvif": True,
                              "name": " ".join(urllib.parse.unquote(x.group(1)) for x in (name, hw) if x)[:60]}
        s.close()
    except OSError:
        pass
    # عناوين الشبكة المحلية (/24) التي فيها منفذ RTSP مفتوح
    try:
        t = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        t.connect(("10.255.255.255", 1))
        me = t.getsockname()[0]
        t.close()
    except OSError:
        me = None
    if me and not me.startswith("127."):
        base = me.rsplit(".", 1)[0]

        def check(i):
            ip = f"{base}.{i}"
            if ip == me or ip in found:
                return None
            try:
                with socket.create_connection((ip, 554), timeout=0.4):
                    return ip
            except OSError:
                return None
        with ThreadPoolExecutor(max_workers=64) as ex:
            for ip in ex.map(check, range(1, 255)):
                if ip:
                    found[ip] = {"ip": ip, "onvif": False, "name": ""}
    return sorted(found.values(), key=lambda x: tuple(int(p) for p in x["ip"].split(".")) if x["ip"].count(".") == 3 else (0,))


# ============================================================================ التسجيل
def _pdeath():
    """إذا توقف HOME ANAB تتوقف عمليات ffmpeg معه."""
    try:
        import ctypes
        ctypes.CDLL("libc.so.6").prctl(1, 15)
    except Exception:  # noqa: BLE001
        pass


class CameraManager:
    def __init__(self, data_paths):
        self.paths = data_paths
        self.rec_root = data_paths.system / "cameras"
        shm = Path("/dev/shm")
        self.live_root = (shm / f"hsef-cams-{os.getuid()}") if shm.is_dir() and os.access(shm, os.W_OK) else data_paths.tmp / "cams"
        self.procs: dict[int, dict] = {}
        self.wake = threading.Event()
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self.loop, daemon=True, name="cameras")
        self.last_clean = 0.0

    def start(self):
        if FFMPEG:
            self.thread.start()

    def rec_dir(self, cid: int) -> Path:
        return self.rec_root / str(cid)

    def live_dir(self, cid: int) -> Path:
        return self.live_root / str(cid)

    # ------------------------------------------------------------ الحلقة
    def loop(self):
        while True:
            try:
                self.sync()
                if time.time() - self.last_clean > 300:
                    self.last_clean = time.time()
                    self.cleanup()
            except Exception as e:  # noqa: BLE001
                print("cameras:", e, flush=True)
            self.wake.wait(5 if self.procs else 30)   # بلا كاميرات: فحص نادر
            self.wake.clear()

    def sync(self):
        db = connect(self.paths.db)
        try:
            cams = {r["id"]: dict(r) for r in db.execute("SELECT * FROM cameras WHERE enabled=1")}
        finally:
            db.close()
        now = time.time()
        with self.lock:
            for cid in list(self.procs):
                c = cams.get(cid)
                if not c or self.procs[cid]["sig"] != self.signature(c):
                    self.stop(cid)
            for cid, c in cams.items():
                st = self.procs.get(cid)
                if st and st["p"] is not None:
                    if st["p"].poll() is None:
                        if st["started"] and now - st["started"] > 120 and self.fresh(cid, 90):
                            st["fails"] = 0
                        continue
                    st["err"].append(f"[stopped {st['p'].returncode}]")
                    st["p"] = None
                    st["fails"] += 1
                    st["next"] = now + min(120, 5 * 2 ** min(st["fails"], 5))
                if st and now < st.get("next", 0):
                    continue
                self.launch(c, st)

    @staticmethod
    def signature(c: dict) -> str:
        return json.dumps([c["url"], c["username"], c["password"], c["record"], c["codec"], c["audio"]])

    def command(self, c: dict) -> list:
        cid = c["id"]
        live, rec = self.live_dir(cid), self.rec_dir(cid)
        url = with_auth(c["url"], c["username"], c["password"])
        mjpeg = (c["codec"] or "").lower() in ("mjpeg", "jpeg")
        hevc = (c["codec"] or "").lower() in ("hevc", "h265")
        cmd = [FFMPEG, "-hide_banner", "-loglevel", "error", "-nostdin", *input_args(c["url"])]
        if not mjpeg:
            cmd += ["-skip_frame:v", "nokey"]   # الصورة الحية من الإطارات المفتاحية فقط (لا تحويل للفيديو كله)
        cmd += ["-fflags", "+genpts+discardcorrupt", "-i", url]
        tag = ["-tag:v", "hvc1"] if hevc else []
        aud = ["-map", "0:a:0?", "-c:a", "copy" if (c["audio"] or "") == "aac" else "aac", "-b:a", "64k"] if c["audio"] else []
        if c["record"]:
            # MJPEG بلا توقيت صحيح: نختم كل صورة بساعة الجهاز لحظة وصولها، ثم نحوّلها إلى H.264
            vcodec = (["-vf", "setpts=(RTCTIME-RTCSTART)/(TB*1000000)", "-fps_mode", "vfr",
                       "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", "-g", "50"] if mjpeg
                      else ["-c:v", "copy", *tag])
            cmd += ["-map", "0:v:0", *vcodec, *aud,
                    "-f", "segment", "-segment_time", str(SEG_SECONDS), "-segment_atclocktime", "1", "-reset_timestamps", "1",
                    "-strftime", "1", "-segment_format", "mp4", "-segment_format_options", "movflags=+faststart",
                    str(rec / "%Y-%m-%d_%H-%M-%S.mp4")]
        if not mjpeg:  # البث المباشر بالنسخ (MJPEG يُشاهد بالصور)
            cmd += ["-map", "0:v:0", "-c:v", "copy", *tag, *aud,
                    "-f", "hls", "-hls_time", "2", "-hls_list_size", "5", "-hls_segment_type", "fmp4",
                    "-hls_flags", "delete_segments+independent_segments+omit_endlist",
                    "-hls_fmp4_init_filename", "init.mp4", "-hls_segment_filename", str(live / "s%d.m4s"), str(live / "live.m3u8")]
        cmd += ["-map", "0:v:0", "-an", "-vf", ("fps=3," if mjpeg else "") + "scale='min(960,iw)':-2", "-fps_mode", "vfr",
                "-q:v", "6", "-update", "1", "-atomic_writing", "1", "-f", "image2", str(live / "snap.jpg")]
        return cmd

    def launch(self, c: dict, st: dict | None):
        cid = c["id"]
        live = self.live_dir(cid)
        shutil.rmtree(live, ignore_errors=True)
        live.mkdir(parents=True, exist_ok=True)
        self.rec_dir(cid).mkdir(parents=True, exist_ok=True)
        st = st or {"fails": 0, "err": collections.deque(maxlen=12)}
        st.update(sig=self.signature(c), started=time.time(), secrets=(c["password"], c["username"]))
        try:
            p = subprocess.Popen(self.command(c), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                                 text=True, errors="replace", preexec_fn=_pdeath)
        except OSError as e:
            st["err"].append(str(e))
            st["p"] = None
            st["next"] = time.time() + 60
            self.procs[cid] = st
            return
        st["p"] = p

        def reader():
            for line in p.stderr:
                line = line.strip()
                if line:
                    st["err"].append(hide_secrets(line, *st["secrets"])[:300])
        threading.Thread(target=reader, daemon=True).start()
        self.procs[cid] = st

    def stop(self, cid: int):
        st = self.procs.pop(cid, None)
        if st and st.get("p") and st["p"].poll() is None:
            st["p"].terminate()
            try:
                st["p"].wait(timeout=8)
            except subprocess.TimeoutExpired:
                st["p"].kill()
        shutil.rmtree(self.live_dir(cid), ignore_errors=True)

    def fresh(self, cid: int, secs: float) -> bool:
        try:
            return time.time() - (self.live_dir(cid) / "snap.jpg").stat().st_mtime < secs
        except OSError:
            return False

    def status(self, c: dict) -> dict:
        cid = c["id"]
        st = self.procs.get(cid)
        if not c["enabled"]:
            state = "off"
        elif not FFMPEG:
            state = "error"
        elif self.fresh(cid, 30):
            state = "rec" if c["record"] else "live"
        elif st is None or (st.get("p") is not None and time.time() - st["started"] < 40):
            state = "connecting"   # أضيفت للتو أو تتصل الآن
        else:
            state = "error"
        last = self.latest(cid)
        return {"state": state, "error": (list(st["err"])[-3:] if st and state == "error" else []),
                "live": (self.live_dir(cid) / "live.m3u8").exists(), "last_rec": last}

    # ------------------------------------------------------------ التسجيلات
    def segments(self, cid: int) -> list[Path]:
        d = self.rec_dir(cid)
        return sorted(f for f in d.glob("*.mp4") if SEG_RE.match(f.name)) if d.is_dir() else []

    def latest(self, cid: int) -> str | None:
        s = self.segments(cid)
        return s[-1].name if s else None

    def cleanup(self):
        db = connect(self.paths.db)
        try:
            g = lambda k, d: (db.execute("SELECT value FROM settings WHERE key=?", (k,)).fetchone() or {"value": d})["value"]
            keep = max(1, int(g("cam_keep_days", KEEP_DAYS_DEFAULT)))
            max_gb = float(g("cam_max_gb", 0) or 0)
            ids = [r["id"] for r in db.execute("SELECT id FROM cameras")]
        finally:
            db.close()
        if not self.rec_root.is_dir():
            return
        # كاميرات محذوفة
        for d in self.rec_root.iterdir():
            if d.is_dir() and d.name.isdigit() and int(d.name) not in ids:
                shutil.rmtree(d, ignore_errors=True)
        cutoff = (date.today() - timedelta(days=keep)).isoformat()
        files = []
        for cid in ids:
            segs = self.segments(cid)
            for f in segs[:-1]:  # الأحدث قد يكون قيد الكتابة
                if f.name[:10] < cutoff:
                    f.unlink(missing_ok=True)
                else:
                    files.append(f)
        files.sort(key=lambda f: f.name)
        total = sum(f.stat().st_size for f in files if f.exists())

        def low_disk():
            du = shutil.disk_usage(self.rec_root)
            return du.free / du.total * 100 < MIN_FREE_PCT
        while files and ((max_gb and total > max_gb * 1024 ** 3) or low_disk()):
            f = files.pop(0)
            try:
                total -= f.stat().st_size
                f.unlink()
            except OSError:
                pass

    def usage(self) -> dict:
        size = sum(f.stat().st_size for f in self.rec_root.rglob("*.mp4")) if self.rec_root.is_dir() else 0
        self.rec_root.mkdir(parents=True, exist_ok=True)
        du = shutil.disk_usage(self.rec_root)
        return {"bytes": size, "disk_free": du.free, "disk_total": du.total}


def mgr() -> CameraManager:
    return current_app.extensions["nas_cams"]


# ============================================================================ الصلاحيات
def viewers() -> list[int]:
    try:
        return [int(x) for x in json.loads(get_setting("cam_viewers") or "[]")]
    except (ValueError, TypeError):
        return []


def web_viewer():
    u = current_user()
    return u if u and (u["is_admin"] or u["id"] in viewers()) else None


def tv_viewer():
    """على التلفاز: المدير ومن يختارهم، ومن أُضيف له مربع «الكاميرات»."""
    from . import tv
    if not tv.tv_allowed() or not session.get("tv_uid"):
        return None
    uid = session["tv_uid"]
    u = get_db().execute("SELECT is_admin FROM users WHERE id=? AND disabled=0", (uid,)).fetchone()
    if u and (u["is_admin"] or uid in viewers()):
        return uid
    row = get_db().execute("SELECT 1 FROM tv_tiles WHERE user_id=? AND kind='cameras' AND enabled=1", (uid,)).fetchone()
    return uid if row else None


def require_viewer():
    if web_viewer() is None and tv_viewer() is None:
        if current_user() is None and not session.get("tv_uid"):
            abort(401, "يجب تسجيل الدخول")
        abort(403, "مشاهدة الكاميرات للمدير ومن يختارهم")


def require_admin():
    u = current_user()
    if not u:
        abort(401, "يجب تسجيل الدخول")
    if not u["is_admin"]:
        abort(403, "هذه العملية للمدير فقط")
    return u


def cam_row(cid: int):
    c = get_db().execute("SELECT * FROM cameras WHERE id=?", (cid,)).fetchone()
    if not c:
        abort(404)
    return dict(c)


def cam_public(c: dict, admin: bool) -> dict:
    out = {"id": c["id"], "name": c["name"], "record": bool(c["record"]), "enabled": bool(c["enabled"]),
           "codec": c["codec"], "width": c["width"], "height": c["height"], **mgr().status(c)}
    if admin:
        out.update(url=strip_auth(c["url"]), username=c["username"] or "", has_password=bool(c["password"]))
    else:
        out.pop("error", None)
    return out


# ============================================================================ الواجهة
@bp.get("/api/cameras")
def api_list():
    require_viewer()
    admin = bool(current_user() and current_user()["is_admin"])
    cams = [cam_public(dict(r), admin) for r in get_db().execute("SELECT * FROM cameras ORDER BY position, id")]
    out = {"cameras": cams, "ffmpeg": bool(FFMPEG), "admin": admin}
    if admin:
        out["settings"] = {"keep_days": int(get_setting("cam_keep_days") or KEEP_DAYS_DEFAULT),
                           "max_gb": float(get_setting("cam_max_gb") or 0), "viewers": viewers()}
        out["usage"] = mgr().usage()
        out["users"] = [{"id": u["id"], "name": u["display_name"] or u["username"], "admin": bool(u["is_admin"])}
                        for u in get_db().execute("SELECT * FROM users WHERE disabled=0 ORDER BY id")]
    return jsonify(out)


def _clean_host(h: str) -> str:
    h = (h or "").strip()
    h = re.sub(r"^[a-z]+://", "", h, flags=re.I).split("/")[0]
    if "@" in h:
        h = h.rsplit("@", 1)[1]
    if not re.fullmatch(r"[A-Za-z0-9.\-]{1,253}(:\d{1,5})?", h):
        abort(400, "عنوان الكاميرا غير صحيح")
    return h


@bp.post("/api/cameras/discover")
def api_discover():
    require_admin()
    have = {urllib.parse.urlsplit(r["url"]).hostname for r in get_db().execute("SELECT url FROM cameras")}
    return jsonify(found=[dict(x, added=x["ip"] in have) for x in discover()])


@bp.post("/api/cameras/detect")
def api_detect():
    require_admin()
    d = body()
    hostport = _clean_host(d.get("host"))
    host, _, port = hostport.partition(":")
    r = detect(host, str(d.get("username") or ""), str(d.get("password") or ""), str(d.get("brand") or ""), int(port or 554))
    return jsonify(r)


def _check_url(url: str) -> str:
    url = (url or "").strip()
    if not re.match(r"^(rtsps?|https?)://[^\s]+$", url, re.I) or len(url) > 600:
        abort(400, "الرابط يجب أن يبدأ بـ rtsp:// أو http://")
    return url


@bp.post("/api/cameras")
def api_add():
    u = require_admin()
    d = body()
    name = str(d.get("name") or "").strip()[:60] or "كاميرا"
    user, pw = str(d.get("username") or "").strip(), str(d.get("password") or "")
    if d.get("url"):
        url = _check_url(d["url"])
        # اسم المستخدم داخل الرابط؟ ننقله إلى الحقول
        parts = urllib.parse.urlsplit(url)
        if parts.username and not user:
            user, pw = urllib.parse.unquote(parts.username), urllib.parse.unquote(parts.password or "")
        url = strip_auth(url)
        info = probe(with_auth(url, user, pw))
        if not info["ok"]:
            abort(400, {"auth": "اسم المستخدم أو كلمة المرور غير صحيحة", "refused": "الكاميرا لا تقبل الاتصال على هذا المنفذ",
                        "notfound": "الرابط غير موجود في الكاميرا", "timeout": "الكاميرا لا تستجيب"}.get(info["why"], "لم نستطع فتح البث"))
    else:
        abort(400, "اختر رابط البث")
    db = get_db()
    pos = (db.execute("SELECT COALESCE(MAX(position),0)+1 AS n FROM cameras").fetchone())["n"]
    cur = db.execute("INSERT INTO cameras(name,url,username,password,codec,audio,width,height,record,enabled,position,created_at) "
                     "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                     (name, url, user or None, pw or None, info.get("codec"), info.get("audio"), info.get("width"), info.get("height"),
                      1 if d.get("record", True) else 0, 1, pos, now_iso()))
    db.commit()
    log_action("إضافة كاميرا", name, u["username"])
    mgr().wake.set()
    return jsonify(camera=cam_public(cam_row(cur.lastrowid), True))


@bp.post("/api/cameras/<int:cid>")
def api_update(cid):
    u = require_admin()
    c = cam_row(cid)
    d = body()
    db = get_db()
    if "name" in d:
        db.execute("UPDATE cameras SET name=? WHERE id=?", (str(d["name"]).strip()[:60] or c["name"], cid))
    for k in ("record", "enabled"):
        if k in d:
            db.execute(f"UPDATE cameras SET {k}=? WHERE id=?", (1 if d[k] else 0, cid))
    if "move" in d:
        ids = [r["id"] for r in db.execute("SELECT id FROM cameras ORDER BY position, id")]
        i = ids.index(cid)
        j = max(0, min(len(ids) - 1, i + (1 if d["move"] > 0 else -1)))
        ids[i], ids[j] = ids[j], ids[i]
        for n, x in enumerate(ids):
            db.execute("UPDATE cameras SET position=? WHERE id=?", (n, x))
    if d.get("url") or "password" in d or "username" in d:
        url = strip_auth(_check_url(d["url"])) if d.get("url") else c["url"]
        user = str(d.get("username", c["username"] or "")).strip()
        pw = str(d["password"]) if d.get("password") else (c["password"] or "")
        info = probe(with_auth(url, user, pw))
        if not info["ok"]:
            abort(400, "لم نستطع فتح البث بهذه البيانات" if info["why"] != "auth" else "اسم المستخدم أو كلمة المرور غير صحيحة")
        db.execute("UPDATE cameras SET url=?, username=?, password=?, codec=?, audio=?, width=?, height=? WHERE id=?",
                   (url, user or None, pw or None, info.get("codec"), info.get("audio"), info.get("width"), info.get("height"), cid))
    db.commit()
    log_action("تعديل كاميرا", c["name"], u["username"])
    mgr().wake.set()
    return jsonify(camera=cam_public(cam_row(cid), True))


@bp.delete("/api/cameras/<int:cid>")
def api_delete(cid):
    u = require_admin()
    c = cam_row(cid)
    db = get_db()
    db.execute("DELETE FROM cameras WHERE id=?", (cid,))
    db.commit()
    m = mgr()
    with m.lock:
        m.stop(cid)
    if request.args.get("purge") == "1":
        shutil.rmtree(m.rec_dir(cid), ignore_errors=True)
    log_action("حذف كاميرا", c["name"], u["username"])
    return jsonify(ok=True)


@bp.post("/api/cameras/settings")
def api_settings():
    u = require_admin()
    d = body()
    if "keep_days" in d:
        set_setting("cam_keep_days", max(1, min(365, int(d["keep_days"] or KEEP_DAYS_DEFAULT))))
    if "max_gb" in d:
        set_setting("cam_max_gb", max(0.0, min(100000.0, float(d["max_gb"] or 0))))
    if "viewers" in d:
        set_setting("cam_viewers", json.dumps([int(x) for x in d["viewers"] if str(x).isdigit()]))
    log_action("إعدادات الكاميرات", "", u["username"])
    m = mgr()
    m.last_clean = 0
    m.wake.set()
    return jsonify(ok=True)


# ---------------------------------------------------------------------------- المشاهدة
def _nocache(resp):
    resp.headers["Cache-Control"] = "no-store"
    return resp


@bp.get("/api/cameras/<int:cid>/snap")
def api_snap(cid):
    require_viewer()
    cam_row(cid)
    f = mgr().live_dir(cid) / "snap.jpg"
    if not f.exists():
        abort(404, "لا توجد صورة بعد")
    return _nocache(send_file(f, mimetype="image/jpeg", conditional=False, max_age=0))


@bp.get("/api/cameras/<int:cid>/live/<name>")
def api_live(cid, name):
    require_viewer()
    cam_row(cid)
    if not re.fullmatch(r"(live\.m3u8|init\.mp4|s\d+\.m4s)", name):
        abort(404)
    f = mgr().live_dir(cid) / name
    if not f.exists():
        abort(404)
    mt = "application/vnd.apple.mpegurl" if name.endswith(".m3u8") else "video/mp4" if name.endswith(".mp4") else "video/iso.segment"
    return _nocache(send_file(f, mimetype=mt, conditional=False, max_age=0))


@bp.get("/api/cameras/<int:cid>/days")
def api_days(cid):
    require_viewer()
    cam_row(cid)
    days = collections.OrderedDict()
    for f in reversed(mgr().segments(cid)):
        k = f.name[:10]
        days.setdefault(k, {"day": k, "count": 0, "bytes": 0})
        days[k]["count"] += 1
        days[k]["bytes"] += f.stat().st_size
    return jsonify(days=list(days.values()))


@bp.get("/api/cameras/<int:cid>/rec")
def api_rec(cid):
    require_viewer()
    cam_row(cid)
    day = request.args.get("day") or date.today().isoformat()
    segs = mgr().segments(cid)
    out = []
    for i, f in enumerate(segs):
        m = SEG_RE.match(f.name)
        if m.group(1) != day:
            continue
        st = f.stat()
        busy = i == len(segs) - 1 and time.time() - st.st_mtime < 30
        out.append({"name": f.name, "time": f"{m.group(2)}:{m.group(3)}", "bytes": st.st_size, "busy": busy})
    return jsonify(day=day, items=out)


@bp.get("/api/cameras/<int:cid>/rec/<name>")
def api_rec_file(cid, name):
    require_viewer()
    c = cam_row(cid)
    if not SEG_RE.match(name):
        abort(404)
    f = mgr().rec_dir(cid) / name
    if not f.exists():
        abort(404)
    dl = request.args.get("dl") == "1"
    return send_file(f, mimetype="video/mp4", conditional=True, as_attachment=dl,
                     download_name=f"{c['name']} {name}" if dl else None)
