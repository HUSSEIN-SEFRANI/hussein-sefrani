"""فيديو التلفاز.

متصفح التلفاز لا يشغّل فيديو الآيفون (HEVC / H.265) ولا الصيغ القديمة (AVI، RMVB، ASF/WMV، VOB/MPEG-2، FLV…).
نفحص كل فيديو بـ ffprobe: إن كان صالحاً يُرسل كما هو، وإلا يُحوَّل مرة واحدة في الخلفية إلى MP4 (H.264 + AAC)
بدقة لا تتجاوز 1080p، وتُحفظ النسخة المحوّلة في مجلد الذاكرة المؤقتة. الملف الأصلي لا يُمس أبداً.
فيديو الآيفون الملوّن الواسع (HDR) تُضبط ألوانه حتى لا يظهر باهتاً.

«تجهيز الفيديو للتلفاز»: يُجهَّز كل فيديو مسبقاً في الخلفية (عندما لا يُستعمل التلفاز، أو ليلاً، أو بزر «جهّز الآن»)
فيعمل فوراً عند الضغط عليه. إن طلب التلفاز فيديو آخر أثناء ذلك، يتوقف التجهيز مؤقتاً (SIGSTOP) ثم يكمل.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import signal
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
CACHE_LIMIT = 30 * 1024 ** 3  # أقل حد لمساحة النسخ المحوّلة: الأقدم يُحذف أولاً
IDLE_SECS = 15 * 60           # التلفاز «غير مستعمل» بعد 15 دقيقة بلا مشاهدة أو تصفح
NIGHT = (1, 7)                # الليل: من 1 إلى 7 صباحاً


class TvVideo:
    def __init__(self, cache: Path):
        self.dir = cache
        self.lock = threading.Lock()
        self.queue: list[tuple[str, Path]] = []
        self.jobs: dict[str, dict] = {}
        self.probes: dict[str, dict] = {}
        self.event = threading.Event()
        self.thread: threading.Thread | None = None
        # التجهيز المسبق في الخلفية
        self.limit = CACHE_LIMIT
        self.bg_proc: subprocess.Popen | None = None
        self.bg_key: str | None = None
        self.bg_paused = False
        self.bg_worker: threading.Thread | None = None
        self.want_key: str | None = None
        self.last_use = 0.0
        self.manual = False
        self.rescan = True
        self.prep_wake = threading.Event()
        self.prep = {"state": "idle", "total": 0, "ready": 0, "todo": 0, "done_now": 0, "failed": 0, "current": None,
                     "scanned": None, "cache_bytes": 0}
        self.decisions: dict[str, str] = {}
        try:
            self.decisions = json.loads((self.dir / "prep.json").read_text())
        except (OSError, ValueError):
            pass

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
        if self.decisions.get(key) == "ok":
            return {"mode": "direct"}
        info = self.probe(src, key)
        if self.playable(src, info):
            return {"mode": "direct"}
        job = self.jobs.get(key) or {}
        if key == self.bg_key:   # يُجهَّز الآن في الخلفية: نكمله فوراً
            self.want_key = key
            self._signal_bg(False)
            return {"mode": "preparing", "progress": job.get("progress", 0), "position": 0}
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
            self._signal_bg(True)   # طلب من التلفاز: التجهيز في الخلفية ينتظر
            try:
                self.transcode(key, src)
            except Exception as exc:  # pragma: no cover
                job["error"] = str(exc)[:200]
            finally:
                job["running"] = False

    def transcode(self, key: str, src: Path, bg: bool = False):
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
        head = ["nice", "-n", "19" if bg else "10", FFMPEG, "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-fflags", "+genpts",
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
            if bg:
                self.bg_proc, self.bg_paused = p, False
                self.prep_wake.set()
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
            while files and total > self.limit:
                f = files.pop(0)
                total -= f.stat().st_size
                f.unlink(missing_ok=True)
        except OSError:
            pass


    # ------------------------------------------------------------------ التجهيز المسبق
    def used(self):
        """التلفاز يُستعمل الآن (مشاهدة أو تصفح)."""
        self.last_use = time.time()

    def _signal_bg(self, pause: bool):
        p = self.bg_proc
        if p is not None and p.poll() is None and self.bg_paused != pause:
            try:
                os.kill(p.pid, signal.SIGSTOP if pause else signal.SIGCONT)
                self.bg_paused = pause
            except OSError:
                pass

    def save_decisions(self):
        try:
            self.dir.mkdir(parents=True, exist_ok=True)
            tmp = self.dir / "prep.json.tmp"
            tmp.write_text(json.dumps(self.decisions))
            tmp.replace(self.dir / "prep.json")
        except OSError:
            pass

    def allowed(self, mode: str) -> tuple[bool, str]:
        if self.want_key:
            return True, "wanted"
        if self.queue or any(j.get("running") for k, j in self.jobs.items() if k != self.bg_key):
            return False, "demand"          # التلفاز يطلب فيديو الآن
        if self.manual:
            return True, "manual"
        if mode == "off":
            return False, "off"
        h = time.localtime().tm_hour
        if NIGHT[0] <= h < NIGHT[1]:
            return True, "night"
        if mode == "idle":
            return (True, "idle") if time.time() - self.last_use > IDLE_SECS else (False, "tv_in_use")
        return False, "wait_night"

    def cache_size(self) -> int:
        try:
            return sum(f.stat().st_size for f in self.dir.rglob("*.mp4"))
        except OSError:
            return 0

    def space_ok(self) -> bool:
        try:
            du = shutil.disk_usage(self.dir if self.dir.exists() else self.dir.parent)
        except OSError:
            return False
        reserve = max(3 * 1024 ** 3, min(du.total * 0.05, 20 * 1024 ** 3))   # نترك دائماً مساحة فارغة للنظام والملفات
        return du.free > reserve and self.prep["cache_bytes"] < self.limit - 2 * 1024 ** 3

    def scan(self) -> list:
        todo, ready, failed, total, changed = [], 0, 0, 0, False
        seen = set()
        for f in self.sources():
            try:
                if not f.is_file():
                    continue
                key = self.key(f)
            except OSError:
                continue
            if key in seen:
                continue
            seen.add(key)
            total += 1
            if self.out(key).exists():
                ready += 1
                continue
            d = self.decisions.get(key)
            if d is None:
                d = "ok" if self.playable(f, self.probe(f, key)) else "conv"
                self.probes.pop(key, None)
                self.decisions[key] = d
                changed = True
            if d == "ok":
                ready += 1
            elif d == "conv":
                todo.append((key, f))
            else:
                failed += 1
        # قرارات ملفات لم تعد موجودة
        for k in [k for k in self.decisions if k not in seen]:
            del self.decisions[k]
            changed = True
        if changed:
            self.save_decisions()
        self.prep.update(total=total, ready=ready, todo=len(todo), failed=failed, scanned=time.time(),
                         cache_bytes=self.cache_size())
        return todo

    def start_prep(self, sources, settings):
        """sources() ← قائمة ملفات فيديو التلفاز؛ settings() ← {"mode": idle|night|off, "max_gb": رقم}."""
        if not (FFMPEG and FFPROBE):
            return
        self.sources, self.settings = sources, settings
        threading.Thread(target=self.prep_loop, name="tv-prep", daemon=True).start()

    def prep_loop(self):
        todo: list = []
        last_scan = 0.0
        time.sleep(int(os.environ.get("HSEF_PREP_DELAY", "60")))   # لا نبدأ مع إقلاع الجهاز مباشرة
        while True:
            try:
                st = self.settings()
                gb = float(st.get("max_gb") or 0)
                try:
                    total_disk = shutil.disk_usage(self.dir.parent).total
                except OSError:
                    total_disk = 0
                self.limit = int(gb * 1024 ** 3) if gb > 0 else max(CACHE_LIMIT, int(total_disk * 0.4))
                ok, why = self.allowed(st.get("mode", "idle"))
                running = self.bg_worker is not None and self.bg_worker.is_alive()
                if running:
                    self._signal_bg(not ok)
                    self.prep["state"] = "working" if ok else "paused:" + why
                elif not ok:
                    self.prep["state"] = why
                else:
                    if self.rescan or (not todo and time.time() - last_scan > 900) or time.time() - last_scan > 6 * 3600:
                        self.prep["state"] = "scanning"
                        todo = self.scan()
                        last_scan, self.rescan = time.time(), False
                    todo = [(k, f) for k, f in todo if not self.out(k).exists() and not self.jobs.get(k, {}).get("running")]
                    if not todo:
                        self.manual = False
                        self.prep.update(state="done", todo=0, current=None)
                    elif not self.space_ok():
                        self.manual = False
                        self.prep["state"] = "space"
                    else:
                        key, src = todo.pop(0)
                        self.bg_worker = threading.Thread(target=self._bg_convert, args=(key, src), name="tv-prep-job", daemon=True)
                        self.bg_worker.start()
                        self.prep["state"] = "working"
            except Exception as exc:  # pragma: no cover
                self.prep["state"] = "error"
                self.prep["error"] = str(exc)[:200]
            self.prep_wake.wait(10)
            self.prep_wake.clear()

    def _bg_convert(self, key: str, src: Path):
        job = self.jobs.setdefault(key, {"progress": 0})
        job.update(running=True, progress=0, error=None)
        self.bg_key = key
        self.prep["current"] = src.name
        try:
            self.transcode(key, src, bg=True)
        except Exception as exc:  # pragma: no cover
            job["error"] = str(exc)[:200]
        finally:
            job["running"] = False
            self.bg_key, self.bg_proc, self.bg_paused = None, None, False
            if self.want_key == key:
                self.want_key = None
        if self.out(key).exists():
            self.prep["ready"] += 1
            self.prep["done_now"] += 1
            self.prep["cache_bytes"] += self.out(key).stat().st_size
        else:
            self.decisions[key] = "err"   # لا نعيد المحاولة كل مرة
            self.save_decisions()
            self.prep["failed"] += 1
        self.prep["todo"] = max(0, self.prep["todo"] - 1)
        self.prep["current"] = None
        self.prep_wake.set()

    def prep_status(self) -> dict:
        cur = self.jobs.get(self.bg_key or "", {})
        return {**self.prep, "manual": self.manual, "limit": self.limit, "progress": cur.get("progress", 0) if self.bg_key else 0,
                "paused": self.bg_paused, "night": list(NIGHT)}


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
