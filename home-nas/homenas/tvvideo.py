"""فيديو التلفاز.

متصفح التلفاز لا يشغّل فيديو الآيفون (HEVC / H.265) ولا الصيغ القديمة (AVI، RMVB، ASF/WMV، VOB/MPEG-2، FLV…).
نفحص كل فيديو بـ ffprobe: إن كان صالحاً يُرسل كما هو، وإلا يُحوَّل مرة واحدة في الخلفية إلى MP4 (H.264 + AAC)
بدقة لا تتجاوز 1080p، وتُحفظ النسخة المحوّلة في مجلد الذاكرة المؤقتة. الملف الأصلي لا يُمس أبداً.
فيديو الآيفون الملوّن الواسع (HDR) تُضبط ألوانه حتى لا يظهر باهتاً.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import threading
import time
from pathlib import Path

FFMPEG = shutil.which("ffmpeg")
FFPROBE = shutil.which("ffprobe")
OK_VIDEO = {"h264", "vp8", "vp9", "av1"}
OK_AUDIO = {"aac", "mp3", "opus", "vorbis", "flac"}
OK_CONTAINER = {".mp4", ".m4v", ".mov", ".webm"}
HDR = {"arib-std-b67", "smpte2084"}
CACHE_LIMIT = 30 * 1024 ** 3  # حد مساحة النسخ المحوّلة: الأقدم يُحذف أولاً


class TvVideo:
    def __init__(self, cache: Path):
        self.dir = cache
        self.lock = threading.Lock()
        self.queue: list[tuple[str, Path]] = []
        self.jobs: dict[str, dict] = {}
        self.probes: dict[str, dict] = {}
        self.event = threading.Event()
        self.thread: threading.Thread | None = None

    # ------------------------------------------------------------------ فحص
    @staticmethod
    def key(src: Path) -> str:
        st = src.stat()
        return hashlib.sha1(f"{src}|{st.st_size}|{int(st.st_mtime)}".encode()).hexdigest()

    def out(self, key: str) -> Path:
        return self.dir / key[:2] / f"{key}.mp4"

    def probe(self, src: Path, key: str) -> dict:
        if key in self.probes:
            return self.probes[key]
        info = {}
        try:
            r = subprocess.run([FFPROBE, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(src)],
                               capture_output=True, text=True, timeout=60)
            info = json.loads(r.stdout or "{}")
        except (subprocess.SubprocessError, ValueError, OSError):
            pass
        self.probes[key] = info
        return info

    @staticmethod
    def playable(src: Path, info: dict) -> bool:
        streams = info.get("streams") or []
        v = next((s for s in streams if s.get("codec_type") == "video" and not (s.get("disposition") or {}).get("attached_pic")), None)
        a = next((s for s in streams if s.get("codec_type") == "audio"), None)
        if not v:
            return True  # لا نعرف شيئاً: نترك المتصفح يحاول
        if src.suffix.lower() not in OK_CONTAINER or v.get("codec_name") not in OK_VIDEO:
            return False
        if a and a.get("codec_name") not in OK_AUDIO:
            return False
        if v.get("codec_name") == "h264" and v.get("pix_fmt") not in (None, "yuv420p", "yuvj420p"):
            return False  # H.264 بعشر بتات أو 4:2:2 لا يعمل في المتصفح
        return True

    # ------------------------------------------------------------------ الحالة
    def status(self, src: Path, front: bool = True) -> dict:
        """mode: direct (يُشغّل كما هو) | ready (النسخة المحوّلة جاهزة) | preparing (جارٍ التحويل) | error"""
        if not (FFMPEG and FFPROBE):
            return {"mode": "direct"}
        key = self.key(src)
        if self.out(key).exists():
            return {"mode": "ready", "key": key}
        info = self.probe(src, key)
        if self.playable(src, info):
            return {"mode": "direct"}
        job = self.jobs.get(key) or {}
        if job.get("error"):
            return {"mode": "error", "error": job["error"]}
        self.enqueue(key, src, front)
        return {"mode": "preparing", "progress": job.get("progress", 0), "position": self.position(key)}

    def position(self, key: str) -> int:
        with self.lock:
            if self.jobs.get(key, {}).get("running"):
                return 0
            return next((i + 1 for i, (k, _) in enumerate(self.queue) if k == key), 0)

    def ready_file(self, key: str) -> Path | None:
        p = self.out(key)
        return p if p.exists() else None

    def enqueue(self, key: str, src: Path, front: bool = False):
        with self.lock:
            if self.jobs.get(key, {}).get("running"):
                return
            self.queue = [q for q in self.queue if q[0] != key]
            (self.queue.insert(0, (key, src)) if front else self.queue.append((key, src)))
            self.jobs.setdefault(key, {"progress": 0})
            if not self.thread or not self.thread.is_alive():
                self.thread = threading.Thread(target=self.loop, name="tv-video", daemon=True)
                self.thread.start()
        self.event.set()

    def prefetch(self, files: list[Path], limit: int = 6):
        """عند فتح مجلد على التلفاز: نجهّز أول الفيديوهات غير الصالحة مسبقاً (بأولوية منخفضة)."""
        if not (FFMPEG and FFPROBE):
            return
        n = 0
        for f in files:
            if n >= limit:
                break
            try:
                key = self.key(f)
                if self.out(key).exists() or self.playable(f, self.probe(f, key)):
                    continue
            except OSError:
                continue
            self.enqueue(key, f, front=False)
            n += 1

    # ------------------------------------------------------------------ التحويل
    def loop(self):
        while True:
            with self.lock:
                if not self.queue:
                    self.thread = None
                    return
                key, src = self.queue.pop(0)
                job = self.jobs.setdefault(key, {"progress": 0})
                job["running"] = True
            try:
                self.transcode(key, src)
            except Exception as exc:  # pragma: no cover
                job["error"] = str(exc)[:200]
            finally:
                job["running"] = False

    def transcode(self, key: str, src: Path):
        job = self.jobs[key]
        out = self.out(key)
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix(".part.mp4")
        info = self.probe(src, key)
        dur = float((info.get("format") or {}).get("duration") or 0) or 1.0
        v = next((s for s in info.get("streams") or [] if s.get("codec_type") == "video"), {})
        scale = "scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"
        tone = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,"
                "zscale=t=bt709:m=bt709:r=tv,format=yuv420p,")
        filters = [tone + scale, scale] if v.get("color_transfer") in HDR else [scale]
        a = next((s for s in info.get("streams") or [] if s.get("codec_type") == "audio"), {})
        audio = ["-c:a", "copy"] if a.get("codec_name") in ("aac", "mp3") else ["-c:a", "aac", "-b:a", "160k", "-ac", "2"]
        head = ["nice", "-n", "10", FFMPEG, "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-fflags", "+genpts",
                "-i", str(src), "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-dn"]
        tail = ["-movflags", "+faststart", "-progress", "pipe:1", str(tmp)]
        attempts = []
        # الصورة صالحة للمتصفح والمشكلة في الغلاف فقط (FLV، MKV، TS…): نقل بدون تحويل، يأخذ ثوانٍ
        if (v.get("codec_name") == "h264" and v.get("pix_fmt") in (None, "yuv420p", "yuvj420p")
                and int(v.get("width") or 0) <= 1920 and v.get("color_transfer") not in HDR):
            attempts.append(head + ["-c:v", "copy"] + audio + tail)
        for vf in filters:
            attempts.append(head + ["-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
                                    "-profile:v", "high", "-c:a", "aac", "-b:a", "160k", "-ac", "2"] + tail)
        last_err = ""
        for cmd in attempts:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            for line in p.stdout:
                if line.startswith("out_time_us=") or line.startswith("out_time_ms="):
                    try:
                        job["progress"] = min(99, int(int(line.split("=")[1]) / 1e6 / dur * 100))
                    except ValueError:
                        pass
            p.wait()
            last_err = (p.stderr.read() or "")[-300:]
            if p.returncode == 0 and tmp.exists() and tmp.stat().st_size > 0:
                tmp.replace(out)
                job.update(progress=100, error=None)
                self.prune()
                return
            tmp.unlink(missing_ok=True)
        job["error"] = last_err.strip() or "ffmpeg failed"

    def prune(self):
        try:
            files = sorted(self.dir.rglob("*.mp4"), key=lambda f: f.stat().st_mtime)
            total = sum(f.stat().st_size for f in files)
            while files and total > CACHE_LIMIT:
                f = files.pop(0)
                total -= f.stat().st_size
                f.unlink(missing_ok=True)
        except OSError:
            pass


_instance: TvVideo | None = None
_ilock = threading.Lock()


def get(cache_root: Path) -> TvVideo:
    global _instance
    with _ilock:
        if _instance is None:
            _instance = TvVideo(cache_root / "tv-video")
        return _instance


def touch(p: Path):
    """يُحدَّث وقت الملف عند المشاهدة حتى لا يُحذف كأقدم ملف."""
    try:
        os.utime(p, (time.time(), time.time()))
    except OSError:
        pass
