"""إضافة «نسخ الواتساب»: صِل الآيفون بالسيرفر ← اختر محادثة ← مجلد باسمها في ملفاتك (whatsapp/<الاسم>)
فيه ملف PDF بالرسائل والصور، والفيديوهات بأسماء متسلسلة.

1. نسخة مؤقتة كاملة من الهاتف بالكابل (idevicebackup2؛ الآيفون لا يعطي الواتساب وحده).
2. قراءة ChatStorage.sqlite من النسخة (وفكّها بكلمة السر إن كانت النسخ مشفّرة).
3. المحادثة المختارة ← PDF + فيديوهات.
4. «انتهيت» (أو بعد ساعتين بلا استعمال، أو عند تشغيل السيرفر) ← تُحذف النسخة المؤقتة. لا يبقى إلا ما اخترته.

هاتف واحد في كل مرة، والنسخة لمن بدأها فقط.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path

from flask import abort, jsonify

from homenas.addons import Router
from homenas.core import body, current_user, log_action, paths

from .wa import chats as wachats
from .wa.export import Cancelled, Exporter, find_chromium
from .wa.ios_backup import Backup, NeedPassword, WrongPassword, find_root

router = Router()
IPH_STATUS = Path(os.environ.get("HSEF_IPHONE_STATUS", "/run/hsef-iphone/status.json"))
IDLE_CLEAN = 2 * 3600
FOLDER = "whatsapp"

S = {"dir": None}
JOB: dict = {}
LOCK = threading.Lock()
PROC = {"p": None}
CANCEL = threading.Event()
OPEN = {"bk": None, "cdb": None, "domain": None}


def reset_job():
    JOB.clear()
    JOB.update(state="idle", owner=None, owner_name="", udid=None, device="", pct=0, text="", error="",
               encrypted=False, chats=[], result=None, touched=time.time())


reset_job()


def fake() -> str:
    return os.environ.get("HSEF_WA_FAKE", "")


def work() -> Path:
    return S["dir"] / "backup"


def setup(ctx):
    S["dir"] = ctx.data
    cleanup()   # بقايا من تشغيل سابق
    threading.Thread(target=_janitor, daemon=True, name="wa-janitor").start()


def unload():
    CANCEL.set()
    _kill()


def _kill():
    p = PROC["p"]
    if p and p.poll() is None:
        try:
            p.terminate()
            p.wait(10)
        except Exception:
            p.kill()


def cleanup():
    _close()
    if S["dir"]:
        shutil.rmtree(work(), ignore_errors=True)
        shutil.rmtree(S["dir"] / "tmp", ignore_errors=True)


def _close():
    for k in ("cdb", "bk"):
        try:
            OPEN[k] and OPEN[k].close()
        except Exception:
            pass
        OPEN[k] = None


def _janitor():
    while S["dir"]:
        time.sleep(300)
        with LOCK:
            idle = JOB["state"] in ("ready", "done", "error", "need_password") and time.time() - JOB["touched"] > IDLE_CLEAN
            if idle:
                cleanup()
                reset_job()


# ----------------------------------------------------------------------------- الهاتف
def run(*cmd, timeout=20) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(list(cmd), capture_output=True, text=True, timeout=timeout)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return subprocess.CompletedProcess(cmd, 1, "", str(exc))


def device() -> dict:
    """{state: none|need_trust|locked|ready|not_installed, udid, name, encrypted, used, free}"""
    if fake():
        info = {}
        try:
            import plistlib
            root = find_root(Path(fake()))
            info = plistlib.loads((root / "Manifest.plist").read_bytes()) if root else {}
        except Exception:
            pass
        return {"state": "ready", "udid": "FAKE-UDID", "name": "iPhone (تجربة)", "encrypted": bool(info.get("IsEncrypted")),
                "used": 1 << 20}
    if not shutil.which("idevicebackup2"):
        return {"state": "not_installed"}
    try:
        st = json.loads(IPH_STATUS.read_text())
    except (OSError, ValueError):
        st = {}
    udid = (run("idevice_id", "-l").stdout.split("\n")[0] or "").strip()
    if not udid:
        return {"state": "none"}
    if st.get("udid") == udid and st.get("state") in ("need_trust", "locked", "detected"):
        return {"state": st["state"] if st["state"] != "detected" else "need_trust", "udid": udid}
    name = run("ideviceinfo", "-u", udid, "-k", "DeviceName").stdout.strip()
    if not name:   # لم يُقترن بعد (الهاتف لم يضغط «وثوق»)
        return {"state": "need_trust", "udid": udid}
    enc = run("ideviceinfo", "-u", udid, "-q", "com.apple.mobile.backup", "-k", "WillEncrypt").stdout.strip().lower() == "true"
    used = 0
    cap = run("ideviceinfo", "-u", udid, "-q", "com.apple.disk_usage").stdout
    m1, m2 = re.search(r"TotalDataCapacity:\s*(\d+)", cap), re.search(r"TotalDataAvailable:\s*(\d+)", cap)
    if m1 and m2:
        used = max(0, int(m1.group(1)) - int(m2.group(1)))
    return {"state": "ready", "udid": udid, "name": name, "encrypted": enc, "used": used}


def _set(**kw):
    JOB.update(kw, touched=time.time())


def _backup_thread(udid: str):
    out = work()
    try:
        out.mkdir(parents=True, exist_ok=True)
        if fake():
            src = find_root(Path(fake()))
            for i in range(5):
                if CANCEL.is_set():
                    raise Cancelled()
                _set(pct=i * 20, text="جارٍ نسخ الهاتف")
                time.sleep(0.2)
            shutil.copytree(src, out / "FAKE-UDID", dirs_exist_ok=True)
        else:
            p = PROC["p"] = subprocess.Popen(["idevicebackup2", "-u", udid, "backup", "--full", str(out)],
                                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=0)
            buf, tail = b"", b""
            while True:
                ch = p.stdout.read(512)
                if not ch:
                    break
                buf = (buf + ch)[-4000:]
                tail = (tail + ch)[-1500:]
                pcts = re.findall(rb"(\d{1,3})% Finished", buf) or re.findall(rb"(\d{1,3}(?:\.\d+)?)%", buf)
                if pcts:
                    _set(pct=min(99, int(float(pcts[-1]))), text="جارٍ نسخ الهاتف")
                low = buf.lower()
                if b"passcode" in low or b"enter the passcode" in low:
                    _set(text="اكتب رمز القفل على الهاتف إن طلبه")
            p.wait()
            if CANCEL.is_set():
                raise Cancelled()
            if p.returncode != 0 or find_root(out) is None:
                msg = tail.decode("utf-8", "replace").strip().splitlines()[-3:]
                raise RuntimeError("تعذر نسخ الهاتف. افتح قفل الهاتف وأبقِ الكابل موصولاً ثم حاول مرة أخرى."
                                   + (f" ({' / '.join(msg)})" if msg else ""))
        _set(pct=100, text="")
        _open(None)
    except Cancelled:
        cleanup()
        reset_job()
    except Exception as exc:
        _set(state="error", error=str(exc)[:500])
    finally:
        PROC["p"] = None


def _open(password):
    """يفتح النسخة ويقرأ قائمة المحادثات (أو يطلب كلمة السر)."""
    _close()
    root = find_root(work())
    if root is None:
        raise RuntimeError("النسخة المؤقتة غير موجودة. ابدأ من جديد")
    bk = Backup(root, S["dir"] / "tmp")
    try:
        bk.open(password)
    except NeedPassword:
        _set(state="need_password", encrypted=True, error="")
        return
    except WrongPassword:
        _set(state="need_password", encrypted=True, error="كلمة السر غير صحيحة")
        return
    row = domain = None
    for d in wachats.DOMAINS:
        row = bk.find(d, "ChatStorage.sqlite")
        if row:
            domain = d
            break
    if not row:
        bk.close()
        raise RuntimeError("لا يوجد واتساب في نسخة هذا الهاتف")
    db = S["dir"] / "tmp" / "ChatStorage.sqlite"
    for suf in ("-wal",):   # آخر الرسائل قد تكون في ملف WAL
        r2 = bk.find(domain, "ChatStorage.sqlite" + suf)
        if r2:
            bk.extract(r2, Path(str(db) + suf))
    bk.extract(row, db)
    cdb = wachats.ChatDB(db)
    OPEN.update(bk=bk, cdb=cdb, domain=domain)
    _set(state="ready", chats=cdb.chats(), device=bk.device_name() if JOB["device"] in ("", "iPhone") else JOB["device"],
         encrypted=bk.encrypted, error="")


def _export_thread(chat_id: int, out_root: Path, username: str):
    try:
        ex = Exporter(OPEN["bk"], OPEN["domain"], OPEN["cdb"], S["dir"] / "tmp",
                      progress=lambda pct, text: _set(pct=pct, text=text), cancelled=CANCEL.is_set,
                      font_dirs=(Path(__file__).parent / "fonts",))
        r = ex.run(chat_id, out_root, JOB["device"] or "iPhone")
        rel = f"/home/{FOLDER}/{r['name']}"
        _set(state="done", result={"name": r["name"], "path": rel, "pdf": f"{rel}/{r['pdf'].name}", "stats": r["stats"]})
        log_action("نسخ محادثة واتساب", r["name"], username=username)
    except Cancelled:
        _set(state="ready", pct=0, text="")
    except Exception as exc:
        _set(state="error_export", error=str(exc)[:500])


# ----------------------------------------------------------------------------- الطرق
def _mine() -> bool:
    return JOB["owner"] == current_user()["id"]


def _view() -> dict:
    u = current_user()
    if JOB["owner"] and not _mine():
        return {"state": "busy", "owner_name": JOB["owner_name"]}
    v = {k: JOB[k] for k in ("state", "device", "pct", "text", "error", "encrypted", "result")}
    v["chats"] = len(JOB["chats"])
    v["me"] = u["username"]
    return v


@router.get("/status")
def api_status():
    with LOCK:
        job = _view()
    idle = job["state"] in ("idle",)
    dev = device() if idle or job["state"] == "error" else None
    free = shutil.disk_usage(paths().data).free
    return jsonify(job=job, device=dev, free=free, tools={"pdf": bool(find_chromium()), "ffmpeg": bool(shutil.which("ffmpeg"))},
                   folder=FOLDER)


@router.post("/read")
def api_read():
    u = current_user()
    with LOCK:
        if JOB["owner"] and not _mine():
            abort(409, f"الهاتف مستعمل الآن من {JOB['owner_name']}")
        if JOB["state"] in ("backup", "export"):
            abort(409, "العمل جارٍ")
        dev = device()
        if dev.get("state") != "ready":
            abort(400, "صِل الآيفون بالسيرفر، وافتح قفله، واضغط «وثوق»")
        need = dev.get("used") or 0
        free = shutil.disk_usage(paths().data).free
        if need and free < need * 1.1 + (2 << 30):
            gb = lambda b: f"{b / 1024 ** 3:.0f} GB"
            abort(400, f"لا توجد مساحة كافية للنسخة المؤقتة: الهاتف فيه {gb(need)} والمتاح {gb(free)}")
        cleanup()
        reset_job()
        CANCEL.clear()
        _set(state="backup", owner=u["id"], owner_name=u["username"], udid=dev["udid"], device=dev.get("name") or "iPhone",
             encrypted=bool(dev.get("encrypted")), text="جارٍ بدء النسخ")
        threading.Thread(target=_backup_thread, args=(dev["udid"],), daemon=True, name="wa-backup").start()
    return jsonify(ok=True)


@router.post("/password")
def api_password():
    with LOCK:
        if not _mine() or JOB["state"] != "need_password":
            abort(409, "لا تحتاج كلمة سر الآن")
        pw = str(body().get("password") or "")
        if not pw:
            abort(400, "اكتب كلمة سر نسخ الآيفون")
        _set(text="جارٍ فتح النسخة المشفّرة")
        try:
            _open(pw)
        except Exception as exc:
            _set(state="error", error=str(exc)[:500])
        return jsonify(job=_view())


@router.get("/chats")
def api_chats():
    with LOCK:
        if not _mine():
            abort(403, "ابدأ بقراءة هاتفك أولاً")
        _set()
        return jsonify(chats=JOB["chats"])


@router.post("/export")
def api_export():
    u = current_user()
    with LOCK:
        if not _mine() or JOB["state"] not in ("ready", "done", "error_export"):
            abort(409, "اقرأ الهاتف أولاً")
        try:
            cid = int(body().get("chat"))
        except (TypeError, ValueError):
            abort(400, "اختر محادثة")
        if not any(c["id"] == cid for c in JOB["chats"]):
            abort(404, "المحادثة غير موجودة")
        out_root = paths().homes / u["username"] / FOLDER
        CANCEL.clear()
        _set(state="export", pct=0, text="جارٍ التحضير", result=None, error="")
        threading.Thread(target=_export_thread, args=(cid, out_root, u["username"]), daemon=True, name="wa-export").start()
    return jsonify(ok=True)


@router.post("/cancel")
def api_cancel():
    with LOCK:
        if not _mine():
            abort(403)
        CANCEL.set()
        state = JOB["state"]
    if state == "backup":
        _kill()
    return jsonify(ok=True)


@router.post("/finish")
def api_finish():
    """«انتهيت»: تُحذف النسخة المؤقتة من السيرفر (المجلدات التي صنعتها تبقى)."""
    with LOCK:
        if JOB["owner"] and not _mine() and not current_user()["is_admin"]:
            abort(403, f"الهاتف مستعمل الآن من {JOB['owner_name']}")
        if JOB["state"] in ("backup", "export"):
            CANCEL.set()
            _kill()
        cleanup()
        reset_job()
    return jsonify(ok=True)


@router.post("/back")
def api_back():
    """«محادثة أخرى»: الرجوع إلى قائمة المحادثات بعد انتهاء محادثة."""
    with LOCK:
        if not _mine():
            abort(403)
        if JOB["state"] in ("done", "error_export"):
            _set(state="ready", result=None, error="", pct=0, text="")
    return jsonify(ok=True)
