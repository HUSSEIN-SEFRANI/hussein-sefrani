"""البند 30: النسخ والنقل والحذف تعمل على السيرفر وتستمر حتى لو أُغلق المتصفح."""
import os, sys, tempfile, time, shutil, subprocess
os.environ["HSEF_EXTRAS_FAKE"] = "1"
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app, files
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
home = P.homes / "admin"; (home / "src").mkdir(parents=True); (home / "dst").mkdir()
(home / "src" / "big.bin").write_bytes(os.urandom(1024 * 1024) * 40)          # 40 MB
(home / "src" / "sub").mkdir(); (home / "src" / "sub" / "a.txt").write_text("a"); (home / "src" / "sub" / "b.txt").write_text("bb")
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]

def wait(jid, t=60):
    end = time.time() + t
    while time.time() < end:
        j = next((x for x in c.get("/api/files/jobs").get_json()["jobs"] if x["id"] == jid), None)
        if j and j["state"] != "running":
            return j
        time.sleep(0.05)
    return j

# ---- 1. نسخ في الخلفية: الطلب يرجع فوراً، والتقدّم بالبايت
files.CHUNK = 1024 * 1024
real_cp = files.progress_copy
def slow_copy(job):   # نبطّئ النسخ قليلاً لنرى التقدّم
    cp = real_cp(job)
    def wrapped(src, dst, **k):
        time.sleep(0.02); return cp(src, dst, **k)
    return wrapped
files.progress_copy = slow_copy
t0 = time.time()
r = c.post("/api/files/transfer", json={"paths": ["/home/src"], "dest": "/home/dst", "move": False, "background": True}).get_json()
res.append(ok(r["ok"] and r["job"]["state"] == "running" and time.time() - t0 < 2, "الطلب يرجع فوراً والعملية تعمل على السيرفر"))
res.append(ok(r["job"]["total_files"] == 3 and r["job"]["total_bytes"] == 40 * 1024 * 1024 + 3, f"المجموع معروف مسبقاً: {r['job']['total_files']} ملف، {r['job']['total_bytes']} بايت"))
j = wait(r["job"]["id"])
res.append(ok(j["state"] == "done" and j["done_bytes"] == j["total_bytes"] and j["count"] == 1, f"اكتمل النسخ ({j['state']}، {j['done_bytes']}/{j['total_bytes']})"))
res.append(ok((home / "dst" / "src" / "big.bin").stat().st_size == 40 * 1024 * 1024 and (home / "dst" / "src" / "sub" / "b.txt").read_text() == "bb", "الملفات نُسخت كاملة"))

# ---- 2. الإيقاف: لا تبقى نسخة ناقصة
def very_slow(job):
    cp = real_cp(job)
    def wrapped(src, dst, **k):
        time.sleep(0.3); return cp(src, dst, **k)
    return wrapped
files.progress_copy = very_slow
r = c.post("/api/files/transfer", json={"paths": ["/home/src"], "dest": "/home/dst", "move": False, "background": True}).get_json()
time.sleep(0.1)
c.post(f"/api/files/jobs/{r['job']['id']}/cancel", json={})
j = wait(r["job"]["id"])
res.append(ok(j["state"] == "cancelled" and not (home / "dst" / "src (1)").exists(), f"«إيقاف» يوقف النسخ ويحذف النسخة الناقصة ({j['state']})"))
files.progress_copy = real_cp

# ---- 3. النقل في الخلفية
r = c.post("/api/files/transfer", json={"paths": ["/home/dst/src/sub"], "dest": "/home", "move": True, "background": True}).get_json()
j = wait(r["job"]["id"])
res.append(ok(j["state"] == "done" and (home / "sub" / "a.txt").exists() and not (home / "dst" / "src" / "sub").exists(), "النقل في الخلفية"))

# ---- 4. الحذف في الخلفية إلى سلة المحذوفات
r = c.post("/api/files/delete", json={"paths": ["/home/sub"], "background": True}).get_json()
j = wait(r["job"]["id"])
res.append(ok(j["state"] == "done" and j["count"] == 1 and not (home / "sub").exists() and any((home / "#recycle").rglob("a.txt")), "الحذف في الخلفية إلى السلة"))

# ---- 5. خطأ واضح: لا مساحة
def full(job):
    def cp(src, dst, **k):
        raise OSError(28, "No space left on device")
    return cp
files.progress_copy = full
r = c.post("/api/files/transfer", json={"paths": ["/home/src/big.bin"], "dest": "/home/dst", "move": False, "background": True}).get_json()
j = wait(r["job"]["id"])
res.append(ok(j["state"] == "error" and j["error"] == "لا توجد مساحة كافية في القرص" and not (home / "dst" / "big.bin").exists(), f"امتلاء القرص ← رسالة مفهومة ({j['error']})"))
files.progress_copy = real_cp

# ---- 6. العمليات لصاحبها فقط، والطريقة القديمة (بدون background) ما زالت تعمل
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('kid',?,0,'x')", (generate_password_hash("p"),)); db.commit()
c2 = app.test_client()
with c2.session_transaction() as s: s["uid"] = 2; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=2").fetchone()[0][-12:]
res.append(ok(c2.get("/api/files/jobs").get_json()["jobs"] == [] and c2.post(f"/api/files/jobs/{r['job']['id']}/cancel", json={}).status_code == 404, "لا يرى أحد عمليات غيره ولا يوقفها"))
r = c.post("/api/files/transfer", json={"paths": ["/home/src/sub"], "dest": "/home", "move": False}).get_json()
res.append(ok(r == {"ok": True, "count": 1} and (home / "sub" / "b.txt").exists(), "الطلب العادي (بلا background) كما كان"))
res.append(ok("نسخ" in [a for (a,) in db.execute("SELECT action FROM logs")], "العملية في سجل النشاط"))

js = (APP / "static/js/apps/files.js").read_text(encoding="utf-8")
res.append(ok(js.count("background: true") == 2 and "nas-files-changed" in js, "الواجهة تستعمل الخلفية وتتحدّث عند الانتهاء"))
res.append(ok("fileOps.resume();" in (APP / "static/js/desktop.js").read_text(encoding="utf-8"), "عند فتح المتصفح من جديد تظهر العمليات التي ما زالت تعمل"))
res.append(ok(all(subprocess.run(["node", "--check", str(APP / f)]).returncode == 0 for f in ("static/js/core.js", "static/js/apps/files.js", "static/js/desktop.js")), "ملفات JS سليمة"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
