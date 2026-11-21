"""المحادثة ← مجلد باسمها: ملف PDF (الرسائل والصور، ومكان كل فيديو صورة مصغرة واسمه) + الفيديوهات بأسماء متسلسلة.

الـPDF يُصنع من صفحة HTML بمتصفح Chromium الموجود في الجهاز (يكتب العربية والرموز التعبيرية صحيحة)،
وللمحادثات الطويلة على أجزاء تُجمع بأمر pdfunite.
"""
from __future__ import annotations

import html
import os
import re
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

from .chats import ChatDB

PART_MESSAGES = 2500   # رسائل كل جزء
PART_MEDIA = 300       # صور كل جزء
BAD = re.compile(r'[\\/:*?"<>|\x00-\x1f]')
DAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
NAMES = {"video": "فيديو", "audio": "صوت", "doc": "ملف"}


class Cancelled(Exception):
    pass


def safe_name(name: str, fallback="محادثة") -> str:
    n = BAD.sub(" ", name or "").strip().strip(".").strip()
    n = re.sub(r"\s+", " ", n)[:80].strip()
    return n or fallback


def unique_dir(p: Path) -> Path:
    if not p.exists():
        return p
    i = 2
    while (p.parent / f"{p.name} ({i})").exists():
        i += 1
    return p.parent / f"{p.name} ({i})"


def day_text(d: datetime) -> str:
    return f"{DAYS[d.weekday()]} {d.day} {MONTHS[d.month - 1]} {d.year}"


def find_chromium() -> str | None:
    for c in (os.environ.get("HSEF_CHROMIUM"), "chromium", "chromium-browser", "google-chrome"):
        if c and (shutil.which(c) or Path(c).is_file()):
            return shutil.which(c) or c
    return None


def arial_css(*dirs: Path) -> str:
    """الخط Arial دائماً (طلب صاحب المشروع). ليس في ديبيان ولا يجوز توزيعه، فإن وُضع arial.ttf
    (وarialbd.ttf للعريض) في مجلد whatsapp أو مجلد الإضافة fonts/ يُستعمل، وإلا Arial المثبت أو خط قريب منه."""
    found = {}
    for d in dirs:
        if d and d.is_dir():
            for f in d.iterdir():
                n = f.name.lower()
                if n in ("arial.ttf", "arialbd.ttf") and f.is_file():
                    found.setdefault("700" if n == "arialbd.ttf" else "400", f)
    return "".join(f'@font-face {{ font-family: Arial; font-weight: {w}; src: url("{f.resolve().as_uri()}"); }}\n'
                   for w, f in found.items())


def video_thumb(src: Path, dst: Path) -> bool:
    for ss in ("1", "0"):
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", ss, "-i", str(src), "-frames:v", "1",
                            "-vf", "scale='min(640,iw)':-2", str(dst)], capture_output=True, timeout=120)
        if r.returncode == 0 and dst.is_file() and dst.stat().st_size:
            return True
    return False


def small_image(src: Path, dst: Path, size=1400, png=False) -> bool:
    try:
        from PIL import Image, ImageOps
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)
            im.thumbnail((size, size))
            if png:
                im.save(dst, "PNG")
            else:
                im.convert("RGB").save(dst, "JPEG", quality=82)
        return True
    except Exception:
        return False


class MediaIndex:
    """مسار الملف كما في قاعدة الواتساب ← سطره في Manifest.db."""

    def __init__(self, bk, domain):
        self.bk = bk
        self.rows, self.base = {}, {}
        for r in bk.files(domain, "Message/%"):
            self.rows[r["relativePath"]] = r
            self.base.setdefault(r["relativePath"].rsplit("/", 1)[-1], r)

    def get(self, path: str | None):
        if not path:
            return None
        p = path.lstrip("/")
        return self.rows.get(p) or self.rows.get("Message/" + p) or self.base.get(p.rsplit("/", 1)[-1])


CSS = """
@page { size: A4; margin: 10mm 9mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, "Liberation Sans", "Noto Sans Arabic", "Noto Sans", "DejaVu Sans", sans-serif, "Noto Color Emoji";
       font-size: 9.5pt; line-height: 1.35; color: #111827; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.head { border: 2px solid #16a34a; border-radius: 12px; padding: 10px 14px; margin-bottom: 8px; break-inside: avoid; }
/* الصفحة مقسومة من الوسط: عمودان، الأول على اليمين، والرسائل تكمل في العمود الثاني ثم الصفحة التالية */
.cols { column-count: 2; column-gap: 7mm; column-rule: 1px solid #d1d5db; column-fill: auto; }
.head h1 { margin: 0 0 4px; font-size: 16pt; color: #14532d; }
.head .row { color: #374151; font-size: 9pt; }
.day { text-align: center; margin: 7px 0 4px; break-after: avoid; }
.day span { background: #e5e7eb; border-radius: 9px; padding: 1px 10px; font-size: 8pt; color: #374151; }
.msg { display: flex; margin: 2px 0; break-inside: avoid; }
.msg.me { justify-content: flex-end; }
.b { max-width: 88%; padding: 3px 8px 2px; border-radius: 9px; background: #f3f4f6; border: 1px solid #e5e7eb; }
.me .b { background: #dcfce7; border-color: #bbf7d0; }
.who { font-weight: bold; color: #0369a1; font-size: 8pt; }
.txt { white-space: pre-wrap; overflow-wrap: anywhere; unicode-bidi: plaintext; }
.t { font-size: 7pt; color: #6b7280; direction: ltr; text-align: left; }
.ph { display: block; max-width: 100%; max-height: 70mm; border-radius: 6px; margin: 2px 0; }
.st { max-width: 26mm; max-height: 26mm; }
.vid { position: relative; display: inline-block; }
.vid .play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.vid .play i { width: 34px; height: 34px; border-radius: 50%; background: rgba(0,0,0,.55); position: relative; }
.vid .play i::after { content: ""; position: absolute; left: 13px; top: 9px; border-left: 12px solid #fff; border-top: 8px solid transparent; border-bottom: 8px solid transparent; }
.novid { width: 60mm; height: 32mm; background: #1f2937; border-radius: 7px; }
.fname { font-weight: bold; font-size: 9pt; }
.note { color: #6b7280; font-style: italic; font-size: 8.5pt; }
.sys { text-align: center; color: #6b7280; font-size: 8pt; margin: 4px 0; break-inside: avoid; }
"""


class Exporter:
    def __init__(self, bk, domain: str, chatdb: ChatDB, work: Path, progress=None, cancelled=None, font_dirs=()):
        self.bk, self.domain, self.cdb, self.work = bk, domain, chatdb, work
        self.font_dirs = tuple(font_dirs)
        self.progress = progress or (lambda pct, text: None)
        self.cancelled = cancelled or (lambda: False)

    def check(self):
        if self.cancelled():
            raise Cancelled()

    def run(self, chat_id: int, out_root: Path, device: str = "iPhone") -> dict:
        chat = self.cdb.chat(chat_id)
        if not chat:
            raise ValueError("المحادثة غير موجودة")
        msgs = self.cdb.messages(chat_id)
        name = safe_name(chat["name"])
        out_root.mkdir(parents=True, exist_ok=True)
        self.out_root = out_root
        folder = unique_dir(out_root / name)
        tmp = self.work / f"export-{chat_id}"
        shutil.rmtree(tmp, ignore_errors=True)
        (tmp / "img").mkdir(parents=True)
        stage = tmp / "out"   # المجلد يُبنى هنا ثم يُنقل كاملاً (لا مجلد ناقص عند الإلغاء أو الخطأ)
        stage.mkdir()
        idx = MediaIndex(self.bk, self.domain)
        counters = {"video": 0, "audio": 0, "doc": 0}
        width = max(3, len(str(max(chat["videos"], 1))))
        stats = {"messages": 0, "images": 0, "videos": 0, "audio": 0, "docs": 0, "missing": 0}
        items = []
        n_media = sum(1 for m in msgs if m["kind"] in ("image", "video", "audio", "doc", "sticker")) or 1
        done = 0
        for m in msgs:
            self.check()
            it = dict(m)
            k = m["kind"]
            if k in ("image", "video", "audio", "doc", "sticker"):
                done += 1
                self.progress(5 + int(70 * done / n_media), f"الوسائط {done} من {n_media}")
                row = idx.get(m["path"])
                raw = tmp / f"m{m['id']}{Path(m['path'] or '').suffix.lower()}"
                got = bool(row) and self.bk.extract(row, raw)
                if k in ("image", "sticker"):
                    img = tmp / "img" / f"{m['id']}.{'png' if k == 'sticker' else 'jpg'}"
                    if got and small_image(raw, img, 420 if k == "sticker" else 1400, png=k == "sticker"):
                        it["img"] = f"img/{img.name}"
                        stats["images"] += k == "image"
                    else:
                        it["missing"] = True
                        stats["missing"] += 1
                else:
                    counters[k] += 1
                    ext = Path(m["path"] or "").suffix.lower() or {"video": ".mp4", "audio": ".opus", "doc": ""}[k]
                    fname = f"{NAMES[k]}-{counters[k]:0{width if k == 'video' else 3}d}{ext}"
                    it["file"] = fname
                    if got:
                        shutil.move(str(raw), stage / fname)
                        stats[{"video": "videos", "audio": "audio", "doc": "docs"}[k]] += 1
                        if k == "video":
                            th = tmp / "img" / f"v{m['id']}.jpg"
                            if video_thumb(stage / fname, th) or self._wa_thumb(idx, m, th):
                                it["img"] = f"img/{th.name}"
                    else:
                        it["file"] = None
                        it["missing"] = True
                        counters[k] -= 1
                        stats["missing"] += 1
                raw.unlink(missing_ok=True)
            stats["messages"] += 1
            items.append(it)
        self.progress(78, "صنع ملف PDF")
        pdf = stage / f"{name}.pdf"
        self._pdf(items, chat, device, tmp, pdf)
        self.check()
        shutil.move(str(stage), folder)
        shutil.rmtree(tmp, ignore_errors=True)
        self.progress(100, "تم")
        return {"folder": folder, "pdf": folder / pdf.name, "stats": stats, "name": folder.name}

    def _wa_thumb(self, idx, m, th) -> bool:
        row = idx.get(m["thumb"])
        if not row:
            return False
        raw = th.with_suffix(".raw")
        ok = self.bk.extract(row, raw) and small_image(raw, th, 640)
        raw.unlink(missing_ok=True)
        return ok

    # ------------------------------------------------------------------ HTML ← PDF
    def _bubble(self, it, group: bool) -> str:
        e = html.escape

        def label(f):   # «فيديو-001» بلا الامتداد: العربي مع .mp4 ينقلب ترتيبه في الصفحة
            return e(Path(f).stem)
        k = it["kind"]
        if k == "system":
            return f'<div class="sys">{e(it["text"])}</div>' if it["text"] else ""
        body = []
        if group and not it["me"] and it["sender"]:
            body.append(f'<div class="who">{e(it["sender"])}</div>')
        if k in ("image", "sticker"):
            body.append(f'<img class="ph{" st" if k == "sticker" else ""}" src="{it["img"]}">' if it.get("img")
                        else '<div class="note">📷 صورة غير موجودة على الهاتف</div>')
        elif k == "video":
            if it.get("file"):
                pic = f'<img class="ph" src="{it["img"]}">' if it.get("img") else '<div class="novid"></div>'
                body.append(f'<div class="vid">{pic}<div class="play"><i></i></div></div><div class="fname">🎬 {label(it["file"])}</div>')
            else:
                body.append('<div class="note">🎬 فيديو غير موجود على الهاتف</div>')
        elif k == "audio":
            body.append(f'<div class="fname">🎤 {label(it["file"])}</div>' if it.get("file") else '<div class="note">🎤 رسالة صوتية غير موجودة على الهاتف</div>')
        elif k == "doc":
            t = it["title"] or it["text"]
            body.append((f'<div class="fname">📄 {label(it["file"])}</div>' if it.get("file") else '<div class="note">📄 ملف غير موجود على الهاتف</div>')
                        + (f'<div class="txt">{e(t)}</div>' if t else ""))
            it = {**it, "text": ""}
        elif k == "location":
            body.append(f'<div class="txt">📍 موقع: <bdi dir="ltr">{it["lat"] or 0:.5f}, {it["lon"] or 0:.5f}</bdi></div>')
        elif k == "contact":
            body.append(f'<div class="txt">👤 جهة اتصال: {e(it["vcard"] or it["title"] or it["text"] or "")}</div>')
            it = {**it, "text": ""}
        elif k == "deleted":
            body.append('<div class="note">🚫 حُذفت هذه الرسالة</div>')
        if it["text"] and k not in ("deleted", "location"):
            body.append(f'<div class="txt">{e(it["text"])}</div>')
        t = it["when"].strftime("%H:%M") if it["when"] else ""
        body.append(f'<div class="t">{t}</div>')
        return f'<div class="msg{" me" if it["me"] else ""}"><div class="b">{"".join(body)}</div></div>'

    @staticmethod
    def _cols(p: list) -> str:
        """العنوان بعرض الصفحة، والرسائل في عمودين."""
        head = p[0] if p and p[0].startswith('<div class="head">') else ""
        return head + '<div class="cols">' + "".join(p[1:] if head else p) + "</div>"

    def _pdf(self, items, chat, device, tmp: Path, pdf: Path):
        fonts = arial_css(self.out_root, *self.font_dirs)   # arial.ttf في مجلد whatsapp
        chrome = find_chromium()
        if not chrome:
            raise RuntimeError("لا يوجد متصفح Chromium على الجهاز لصنع ملف PDF")
        e = html.escape
        first = items[0]["when"] if items and items[0]["when"] else None
        last = items[-1]["when"] if items and items[-1]["when"] else None
        head = (f'<div class="head"><h1>{e(chat["name"])}</h1>'
                f'<div class="row">{"من " + day_text(first) + " إلى " + day_text(last) if first and last else ""}</div>'
                f'<div class="row">{chat["messages"]} رسالة · {chat["images"]} صورة · {chat["videos"]} فيديو</div>'
                f'<div class="row">نُسخت من {e(device)} في {day_text(datetime.now())}. الفيديوهات في المجلد نفسه بالأسماء المكتوبة هنا.</div></div>')
        parts, cur, n_msg, n_img, day = [], [head], 0, 0, None
        for it in items:
            d = it["when"].date() if it["when"] else None
            if d and d != day:
                day = d
                cur.append(f'<div class="day"><span>{day_text(it["when"])}</span></div>')
            cur.append(self._bubble(it, chat["group"]))
            n_msg += 1
            n_img += bool(it.get("img"))
            if n_msg >= PART_MESSAGES or n_img >= PART_MEDIA:
                parts.append(cur)
                cur, n_msg, n_img = [], 0, 0
                if day:
                    cur.append(f'<div class="day"><span>{day_text(it["when"])}</span></div>')
        if len(cur) > 1 or not parts:
            parts.append(cur)
        pdfs = []
        for i, p in enumerate(parts):
            self.check()
            self.progress(78 + int(20 * i / len(parts)), f"صنع ملف PDF ({i + 1} من {len(parts)})" if len(parts) > 1 else "صنع ملف PDF")
            page = tmp / f"part{i}.html"
            page.write_text(f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
                            "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src file: data:; style-src 'unsafe-inline'; font-src file: data:\">"
                            f'<style>{fonts}{CSS}</style></head>'
                            f'<body>{self._cols(p)}</body></html>', encoding="utf-8")
            out = tmp / f"part{i}.pdf"
            r = subprocess.run([chrome, "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
                                "--no-pdf-header-footer", "--print-to-pdf-no-header",
                                "--allow-file-access-from-files", f"--user-data-dir={tmp / 'chrome'}",
                                f"--print-to-pdf={out}", page.as_uri()], capture_output=True, timeout=900)
            if not out.is_file() or out.stat().st_size < 100:
                raise RuntimeError("تعذر صنع ملف PDF: " + r.stderr.decode("utf-8", "replace")[-300:])
            pdfs.append(out)
        if len(pdfs) == 1:
            shutil.move(str(pdfs[0]), pdf)
        else:
            r = subprocess.run(["pdfunite", *map(str, pdfs), str(pdf)], capture_output=True, timeout=600)
            if r.returncode != 0:
                raise RuntimeError("تعذر جمع أجزاء ملف PDF: " + r.stderr.decode("utf-8", "replace")[-200:])
