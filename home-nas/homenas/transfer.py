"""تصدير النظام واستيراده، وإعادة ضبط المصنع (v1.9.7).

- التصدير: ملف واحد ‎.anab مشفّر بكلمة سر (AES-256 عبر openssl). فيه قاعدة البيانات (المستخدمون وكلمات السر
  ورموز الدخول، النجوم، مربعات التلفاز وإعداداته، الكاميرات، المجلدات المشتركة…) وملفات النظام (الأذان،
  الخلفيات، مواقيت المسجد…)، واختيارياً كل الملفات والصور.
- الاستيراد: يُفك الملف ويُفحص ويُجهَّز، ثم يُطبَّق عند إعادة تشغيل البرنامج (قبل فتح قاعدة البيانات).
  النسخة الحالية تُحفظ بجانبه (‎*.before-import) فلا يضيع شيء.
- إعادة ضبط المصنع: تحذف الإعدادات والمستخدمين (والملفات إن اختار المدير)، ثم يرجع الجهاز لشاشة الإعداد الأول.
- في الحالتين يبقى تفعيل هذا الجهاز كما هو (كود التفعيل مرتبط برقم الجهاز، فلا يُنقل ولا يُمسح).
  وإعدادات الوايفاي والشبكة (في ‎/etc/homenas) لا تتغير.
"""
from __future__ import annotations

import io
import json
import os
import shutil
import sqlite3
import subprocess
import tarfile
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Blueprint, abort, after_this_request, current_app, jsonify, request, send_file
from werkzeug.security import check_password_hash

from .core import admin_required, body, current_user, get_db, log_action, paths

bp = Blueprint("transfer", __name__)

MAGIC = "HOME ANAB"
FORMAT = 1
KEEP_SETTINGS = "act_%"          # التفعيل يبقى مع الجهاز
SKIP_SYSTEM = {"cache", "tmp", "nas.db", "nas.db-wal", "nas.db-shm", "import-pending", "factory-reset.json"}
PENDING = "import-pending"
RESET_FLAG = "factory-reset.json"
APPLIANCE = os.environ.get("HOMENAS_APPLIANCE") == "1"


# ----------------------------------------------------------------------------- التشفير (openssl)
def _openssl(args: list[str], password: str, stdin, stdout) -> subprocess.Popen:
    if not shutil.which("openssl"):
        abort(500, "برنامج openssl غير موجود على هذا الجهاز")
    r, w = os.pipe()   # كلمة السر عبر أنبوب خاص، لا في سطر الأوامر ولا في متغيرات البيئة
    os.write(w, password.encode() + b"\n")
    os.close(w)
    try:
        return subprocess.Popen(["openssl", "enc", "-aes-256-cbc", "-salt", "-pbkdf2", "-iter", "200000", *args,
                                 "-pass", f"fd:{r}"], stdin=stdin, stdout=stdout, stderr=subprocess.PIPE, pass_fds=(r,))
    finally:
        os.close(r)


def _version_tuple(v: str) -> tuple:
    try:
        return tuple(int(x) for x in str(v).split("."))
    except ValueError:
        return (0,)


# ----------------------------------------------------------------------------- التصدير
def _db_copy(src: Path, dst: Path):
    """نسخة متسقة من قاعدة البيانات (حتى أثناء العمل)، بلا إعدادات التفعيل."""
    s, d = sqlite3.connect(src), sqlite3.connect(dst)
    try:
        s.backup(d)
        d.execute("DELETE FROM settings WHERE key LIKE ?", (KEEP_SETTINGS,))
        d.commit()
    finally:
        s.close()
        d.close()


def _dir_size(p: Path) -> int:
    n = 0
    for r, _ds, fs in os.walk(p):
        for f in fs:
            try:
                n += os.lstat(os.path.join(r, f)).st_size
            except OSError:
                pass
    return n


@bp.post("/api/admin/transfer/export")
@admin_required
def api_export():
    d = body()
    pw = str(d.get("password") or "")
    if len(pw) < 6:
        abort(400, "اختر كلمة سر للملف من 6 أحرف على الأقل، واحفظها: بدونها لا يمكن فتح الملف")
    files = bool(d.get("files"))
    p = paths()
    from . import __version__
    from .system import server_name
    if files:
        need = _dir_size(p.homes) + _dir_size(p.shares)
        free = shutil.disk_usage(p.tmp).free
        if need * 1.05 + 200 * 1024 ** 2 > free:
            abort(400, "لا توجد مساحة كافية على القرص لتجهيز ملف فيه كل الملفات والصور. صدّر «الإعدادات والبيانات» فقط، "
                       "وانقل الملفات بالنسخ الاحتياطي على قرص خارجي.")
    exp = p.tmp / "exports"
    exp.mkdir(parents=True, exist_ok=True)
    for old in exp.glob("*.anab"):   # ملفات تصدير قديمة لم تُنزَّل
        if time.time() - old.stat().st_mtime > 3600:
            old.unlink(missing_ok=True)
    import secrets
    token = secrets.token_hex(12)
    work = p.tmp / f"export-{token}"
    work.mkdir(parents=True)
    out = exp / f"{token}.anab"
    try:
        _db_copy(p.db, work / "nas.db")
        manifest = {"magic": MAGIC, "format": FORMAT, "version": __version__, "created": datetime.now().isoformat(timespec="seconds"),
                    "server_name": server_name(), "files": files, "data_dir": str(p.data),
                    "users": sqlite3.connect(work / "nas.db").execute("SELECT COUNT(*) FROM users").fetchone()[0]}
        with open(out, "wb") as fo:
            enc = _openssl([], pw, subprocess.PIPE, fo)
            with tarfile.open(fileobj=enc.stdin, mode="w|gz") as tar:
                data = json.dumps(manifest, ensure_ascii=False, indent=1).encode()
                ti = tarfile.TarInfo("manifest.json"); ti.size = len(data); ti.mtime = int(time.time())
                tar.addfile(ti, io.BytesIO(data))
                tar.add(work / "nas.db", "nas.db")
                for x in sorted(p.system.iterdir()):
                    if x.name not in SKIP_SYSTEM and not x.name.endswith(".before-import"):
                        tar.add(x, f"system/{x.name}")
                if files:
                    tar.add(p.homes, "homes")
                    tar.add(p.shares, "shares")
            enc.stdin.close()
            if enc.wait() != 0:
                abort(500, "فشل التشفير: " + enc.stderr.read().decode(errors="replace")[-200:])
    except Exception:
        out.unlink(missing_ok=True)
        raise
    finally:
        shutil.rmtree(work, ignore_errors=True)
    log_action("تصدير النظام", "مع الملفات والصور" if files else "الإعدادات والبيانات")
    name = f"HOME-ANAB-{datetime.now():%Y-%m-%d}{'-كامل' if files else ''}.anab"
    return jsonify(ok=True, url=f"/api/admin/transfer/download/{token}", name=name, size=out.stat().st_size)


@bp.get("/api/admin/transfer/download/<token>")
@admin_required
def api_export_download(token):
    if not token.isalnum():
        abort(404)
    f = paths().tmp / "exports" / f"{token}.anab"
    if not f.is_file():
        abort(404, "انتهت صلاحية الملف، صدّر من جديد")

    @after_this_request
    def _cleanup(resp):
        # يُحذف بعد بدء الإرسال (على لينكس يبقى الملف المفتوح حتى ينتهي التنزيل)
        threading.Timer(10, lambda: f.unlink(missing_ok=True)).start()
        return resp
    name = request.args.get("name") or "HOME-ANAB.anab"
    return send_file(f, as_attachment=True, download_name=name if name.endswith(".anab") else "HOME-ANAB.anab",
                     mimetype="application/octet-stream")


# ----------------------------------------------------------------------------- الاستيراد
def _safe_members(tar: tarfile.TarFile):
    for m in tar:
        name = m.name.lstrip("./")
        parts = Path(name).parts
        if m.issym() or m.islnk() or m.isdev() or not name or ".." in parts or Path(m.name).is_absolute():
            continue   # لا روابط ولا مسارات خارج المجلد
        if parts[0] not in ("manifest.json", "nas.db", "system", "homes", "shares"):
            continue
        m.name = name
        yield m


@bp.post("/api/admin/transfer/import")
@admin_required
def api_import():
    f = request.files.get("file")
    pw = request.form.get("password") or ""
    if not f or not pw:
        abort(400, "اختر ملف ‎.anab واكتب كلمة سره")
    p = paths()
    pend = p.system / PENDING
    shutil.rmtree(pend, ignore_errors=True)
    pend.mkdir(parents=True)
    src = p.tmp / f"import-{int(time.time())}.anab"
    f.save(src)
    try:
        with open(src, "rb") as fi:
            dec = _openssl(["-d"], pw, fi, subprocess.PIPE)
            try:
                with tarfile.open(fileobj=dec.stdout, mode="r|gz") as tar:
                    for m in _safe_members(tar):
                        tar.extract(m, pend, set_attrs=False)
            except (tarfile.TarError, OSError, EOFError):
                dec.kill()
                dec.wait()
                abort(400, "كلمة السر غير صحيحة، أو الملف ليس ملف تصدير من HOME ANAB")
            if dec.wait() != 0:
                abort(400, "كلمة السر غير صحيحة، أو الملف تالف")
        try:
            man = json.loads((pend / "manifest.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            abort(400, "الملف ليس ملف تصدير من HOME ANAB")
        from . import __version__
        if man.get("magic") != MAGIC or not (pend / "nas.db").is_file():
            abort(400, "الملف ليس ملف تصدير من HOME ANAB")
        if _version_tuple(man.get("version")) > _version_tuple(__version__):
            abort(400, f"الملف من إصدار أحدث ({man.get('version')}). حدّث هذا الجهاز أولاً ثم استورد.")
        (pend / "ready").write_text(json.dumps({"by": current_user()["username"], "at": datetime.now().isoformat(timespec="seconds")}))
    except BaseException:
        shutil.rmtree(pend, ignore_errors=True)
        raise
    finally:
        src.unlink(missing_ok=True)
    log_action("استيراد النظام", f"ملف من {man.get('created')} ({man.get('server_name')})، يُطبَّق عند إعادة التشغيل")
    return jsonify(ok=True, manifest={k: man.get(k) for k in ("version", "created", "server_name", "files", "users")},
                   restart=_restart_soon())


@bp.delete("/api/admin/transfer/import")
@admin_required
def api_import_cancel():
    shutil.rmtree(paths().system / PENDING, ignore_errors=True)
    return jsonify(ok=True)


# ----------------------------------------------------------------------------- إعادة ضبط المصنع
CONFIRM_WORD = "إعادة ضبط"


@bp.post("/api/admin/transfer/reset")
@admin_required
def api_reset():
    d = body()
    u = current_user()
    if not check_password_hash(u["password_hash"], str(d.get("password") or "")):
        abort(403, "كلمة مرور حسابك غير صحيحة")
    if " ".join(str(d.get("confirm") or "").split()) != CONFIRM_WORD:
        abort(400, f"اكتب «{CONFIRM_WORD}» للتأكيد")
    wipe = bool(d.get("wipe_files"))
    (paths().system / RESET_FLAG).write_text(json.dumps({"wipe_files": wipe, "by": u["username"],
                                                         "at": datetime.now().isoformat(timespec="seconds")}))
    log_action("إعادة ضبط المصنع", "مع حذف كل الملفات" if wipe else "الإعدادات فقط (الملفات باقية)")
    return jsonify(ok=True, restart=_restart_soon())


@bp.delete("/api/admin/transfer/reset")
@admin_required
def api_reset_cancel():
    (paths().system / RESET_FLAG).unlink(missing_ok=True)
    return jsonify(ok=True)


def _restart_soon() -> bool:
    """على جهاز HOME ANAB: البرنامج يخرج بعد ثانيتين وتعيد الخدمة تشغيله (Restart=always) فيُطبَّق التغيير.
    على كمبيوتر عادي: يجب إعادة التشغيل يدوياً."""
    if not APPLIANCE or current_app.testing:
        return False
    threading.Timer(2.0, lambda: os._exit(3)).start()
    return True


# ----------------------------------------------------------------------------- التطبيق عند بدء التشغيل
def _keep_activation(old_db: Path) -> list[tuple]:
    if not old_db.exists():
        return []
    c = sqlite3.connect(old_db)
    try:
        return c.execute("SELECT key, value FROM settings WHERE key LIKE ?", (KEEP_SETTINGS,)).fetchall()
    except sqlite3.Error:
        return []
    finally:
        c.close()


def _put_activation(db_path: Path, rows: list[tuple]):
    c = sqlite3.connect(db_path)
    try:
        c.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)")
        c.execute("DELETE FROM settings WHERE key LIKE ?", (KEEP_SETTINGS,))
        c.executemany("INSERT INTO settings(key, value) VALUES (?,?)", rows)
        c.commit()
    finally:
        c.close()


def _set_aside(p: Path, stamp: str):
    if p.exists():
        p.rename(p.with_name(f"{p.name}.before-{stamp}"))


def apply_pending(data_paths) -> str | None:
    """يُستدعى عند بدء التشغيل قبل فتح قاعدة البيانات. يرجع ما طُبّق (أو None)."""
    sysd = data_paths.system
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    flag = sysd / RESET_FLAG
    if flag.exists():
        try:
            opts = json.loads(flag.read_text())
        except (OSError, ValueError):
            opts = {}
        act = _keep_activation(data_paths.db)
        for x in list(sysd.iterdir()):   # كل ملفات النظام إلا الكاش والمؤقت
            if x.name in ("cache", "tmp") or ".before-" in x.name:
                continue
            if x.name.startswith("nas.db"):
                x.unlink(missing_ok=True)
            elif x.is_dir():
                shutil.rmtree(x, ignore_errors=True)
            else:
                x.unlink(missing_ok=True)
        shutil.rmtree(data_paths.cache, ignore_errors=True)
        data_paths.cache.mkdir(parents=True, exist_ok=True)
        if opts.get("wipe_files"):
            for root in (data_paths.homes, data_paths.shares):
                for x in list(root.iterdir()):
                    shutil.rmtree(x, ignore_errors=True) if x.is_dir() and not x.is_symlink() else x.unlink(missing_ok=True)
        if act:
            _put_activation(data_paths.db, act)
        return "reset"
    pend = sysd / PENDING
    if (pend / "ready").exists():
        man = json.loads((pend / "manifest.json").read_text(encoding="utf-8"))
        act = _keep_activation(data_paths.db)
        for x in ("nas.db-wal", "nas.db-shm"):
            (sysd / x).unlink(missing_ok=True)
        _set_aside(data_paths.db, stamp)
        (pend / "nas.db").rename(data_paths.db)
        _put_activation(data_paths.db, act)
        # المجلدات المشتركة محفوظة بمسارها الكامل: إن اختلف مجلد البيانات في الجهاز الجديد نصحّحه
        old, new = str(man.get("data_dir") or ""), str(data_paths.data)
        if old and old != new:
            c = sqlite3.connect(data_paths.db)
            try:
                c.execute("UPDATE folders SET path = ? || substr(path, ?) WHERE path = ? OR path LIKE ?",
                          (new, len(old) + 1, old, old.rstrip("/") + "/%"))
                c.commit()
            except sqlite3.Error:
                pass
            finally:
                c.close()
        if (pend / "system").is_dir():
            for x in (pend / "system").iterdir():
                _set_aside(sysd / x.name, stamp)
                x.rename(sysd / x.name)
        if man.get("files"):
            for name, root in (("homes", data_paths.homes), ("shares", data_paths.shares)):
                if (pend / name).is_dir():
                    _set_aside(root, stamp)
                    (pend / name).rename(root)
        shutil.rmtree(data_paths.cache, ignore_errors=True)
        data_paths.cache.mkdir(parents=True, exist_ok=True)
        shutil.rmtree(pend, ignore_errors=True)
        return "import"
    return None


@bp.get("/api/admin/transfer")
@admin_required
def api_transfer_status():
    p = paths()
    pend = p.system / PENDING
    man = None
    if (pend / "ready").exists():
        try:
            man = json.loads((pend / "manifest.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            man = None
    kept = sorted(x.name for x in list(p.system.iterdir()) + [p.data / x for x in os.listdir(p.data)] if ".before-" in x.name)
    return jsonify(pending_import={k: man.get(k) for k in ("version", "created", "server_name", "files", "users")} if man else None,
                   pending_reset=(p.system / RESET_FLAG).exists(), appliance=APPLIANCE,
                   openssl=bool(shutil.which("openssl")), confirm_word=CONFIRM_WORD, kept=kept)
