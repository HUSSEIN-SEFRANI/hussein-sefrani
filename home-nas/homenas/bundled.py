"""البند 47: الألعاب والتطبيقات التعليمية تأتي مع النظام.

البرنامج يحمل التطبيقات في `games/` (في الإيزو وفي حزمة التحديث). عند تشغيل السيرفر بعد تنصيب أو تحديث:
- كل تطبيق لم يوضع من قبل يُنسخ إلى مجلده المشترك حسب نوعه في app.json: «الألعاب» أو «التعليم».
- تطبيق وضعناه من قبل ثم حذفه المدير لا يرجع.
- تطبيق لم يغيّره أحد يُحدَّث إلى النسخة الجديدة (القديمة تذهب إلى سلة المحذوفات في المجلد).
- تطبيق غيّره المدير (أو نسخة رفعها بنفسه وتختلف) يبقى كما هو.
الحالة في الإعداد `bundled_apps`: {الاسم: بصمة المحتوى كما وضعناه}.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import time
from pathlib import Path

from .core import RECYCLE, now_iso

BUNDLE = Path(__file__).resolve().parent.parent / "games"
SKIP_FILES = {"kit.js", "kit.css", "app.json"}   # kit يعطيها السيرفر بآخر نسخة، وapp.json قد يتغير نوعه عند النقل
# البند 59: مجلدات تضع فيها العائلة محتواها داخل التطبيق (مثل «كلماتي» في «لغتي العربية»): لا تُحسب تعديلاً،
# وتُنقل كما هي إلى النسخة الجديدة عند التحديث
USER_DIRS = {"كلماتي"}
STATE_KEY, STAMP_KEY = "bundled_apps", "bundled_stamp"


def bundle_apps(root: Path = BUNDLE) -> list[Path]:
    try:
        return sorted(d for d in root.iterdir() if d.is_dir() and not d.name.startswith(("_", ".", "#", "@"))
                      and (d / "index.html").is_file())
    except OSError:
        return []


def fingerprint(d: Path) -> str:
    """بصمة محتوى التطبيق (الملفات وأسماؤها)، بلا kit وapp.json."""
    h = hashlib.sha1()
    try:
        files = sorted(p for p in d.rglob("*") if p.is_file() and p.name not in SKIP_FILES
                       and not any(part.startswith(("#", "@", ".")) for part in p.relative_to(d).parts)
                       and p.relative_to(d).parts[0] not in USER_DIRS)
    except OSError:
        return ""
    for p in files:
        h.update(str(p.relative_to(d)).encode("utf-8", "surrogateescape") + b"\0")
        try:
            with p.open("rb") as f:
                for chunk in iter(lambda: f.read(1 << 20), b""):
                    h.update(chunk)
        except OSError:
            return ""
        h.update(b"\1")
    return h.hexdigest()


def _kind_of(app: Path) -> str:
    from .tv import app_type
    return "learn" if app_type(app) == "education" else "games"


def _get(db, key, default):
    row = db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    try:
        return json.loads(row["value"]) if row else default
    except (ValueError, TypeError):
        return default


def _set(db, key, value):
    db.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
               (key, json.dumps(value, ensure_ascii=False)))


def _copy(src: Path, dst: Path):
    tmp = dst.with_name(f".{dst.name}.new")
    shutil.rmtree(tmp, ignore_errors=True)
    shutil.copytree(src, tmp, ignore=shutil.ignore_patterns("*.zip", "__pycache__"))
    tmp.rename(dst)


def _to_recycle(share: Path, d: Path):
    rec = share / RECYCLE
    rec.mkdir(exist_ok=True)
    target = rec / d.name
    if target.exists():
        target = rec / f"{d.name} ({time.strftime('%Y-%m-%d %H%M%S')})"
    d.rename(target)
    return target


def _carry_user_dirs(old: Path, new: Path):
    """محتوى العائلة في التطبيق القديم (مثل صور «كلماتي») ينتقل إلى النسخة الجديدة."""
    for n in USER_DIRS:
        src = old / n
        try:
            if src.is_dir() and any(src.iterdir()):
                shutil.rmtree(new / n, ignore_errors=True)
                shutil.move(str(src), str(new / n))
        except OSError:
            pass


def find(shares: dict, name: str) -> Path | None:
    """مكان التطبيق في «الألعاب» أو «التعليم»: مباشرة، أو داخل مجلد فُكّ فيه ملف ZIP (مثل «الألعاب-22/…»)."""
    for k in ("games", "learn"):
        if (shares[k] / name).exists():
            return shares[k] / name
    for k in ("games", "learn"):
        try:
            for sub in shares[k].iterdir():
                if sub.is_dir() and not sub.name.startswith(("#", "@", ".")) and (sub / name / "index.html").is_file():
                    return sub / name
        except OSError:
            pass
    return None


def start(cfg_data_dir: str):
    """في الخلفية حتى لا يتأخر تشغيل السيرفر."""
    import threading

    def run():
        from .core import Paths, connect
        try:
            p = Paths(cfg_data_dir)
            db = connect(p.db)
            seed(db, p)
            db.close()
        except Exception:  # noqa: BLE001
            import logging
            logging.getLogger(__name__).exception("bundled apps")
    threading.Thread(target=run, name="bundled-apps", daemon=True).start()


def seed(db, data_paths, root: Path = BUNDLE, force: bool = False) -> dict:
    """يضع التطبيقات المرفقة في المجلدين المشتركين. يرجع {added, updated, kept, skipped} بأسماء التطبيقات."""
    from .tv import share_dir
    apps = bundle_apps(root)
    out = {"added": [], "updated": [], "kept": [], "skipped": []}
    if not apps:
        return out
    stamp = hashlib.sha1("".join(f"{a.name}:{int(a.stat().st_mtime)}:{sum(1 for _ in a.rglob('*'))}|" for a in apps).encode()).hexdigest()
    if not force and _get(db, STAMP_KEY, "") == stamp:
        return out   # نفس التطبيقات التي وضعناها في التشغيل السابق: لا شيء نعمله
    state = _get(db, STATE_KEY, {})
    shares = {k: share_dir(db, data_paths, k) for k in ("games", "learn")}
    for app in apps:
        name, new = app.name, fingerprint(app)
        where = find(shares, name)
        try:
            if where is None:
                if name in state:          # وضعناه من قبل وحذفه المدير: لا نرجعه
                    out["skipped"].append(name)
                    continue
                _copy(app, shares[_kind_of(app)] / name)
                state[name] = new
                out["added"].append(name)
                continue
            cur = fingerprint(where)
            if name not in state:          # نسخة رفعها المدير قبل أن تصبح التطبيقات جزءاً من النظام
                state[name] = cur
            if cur == new:
                state[name] = new
                out["kept"].append(name)
            elif cur == state[name]:       # لم يغيّره أحد بعد أن وضعناه: نحدّثه
                top = next(v for v in shares.values() if v == where.parent or v in where.parents)
                old = _to_recycle(top, where)
                _copy(app, where.parent / name)
                _carry_user_dirs(old, where.parent / name)
                state[name] = new
                out["updated"].append(name)
            else:                          # غيّره المدير: نتركه
                out["kept"].append(name)
        except OSError:
            out["skipped"].append(name)
    _set(db, STATE_KEY, state)
    _set(db, STAMP_KEY, stamp)
    _set(db, "bundled_last", {"at": now_iso(), **{k: len(v) for k, v in out.items()}})
    db.commit()
    return out
