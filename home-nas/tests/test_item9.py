import sys, tempfile, shutil, time
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
from homenas import create_app, cpuinfo
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); app.testing = True; P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("pass1234"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
d = c.get("/api/admin/cpu").get_json()
res.append(ok(d["available"] and d["model"] and d["threads"] >= 1 and len(d["per_core"]) == d["threads"], f"النوع والأنوية: {d['model']} · {d['cores']}/{d['threads']}"))
res.append(ok(d["temp"] is None and d["level"] is None, "بلا حساس حرارة ← «غير متوفرة» بدل رقم خاطئ"))
res.append(ok(isinstance(d["top"], list), f"ما يستهلك المعالج: {d['top'][:3]}"))
res.append(ok(cpuinfo.friendly("python3", ["/opt/homenas/venv/bin/python", "/opt/homenas/app/server.py"]).startswith("HOME ANAB")
              and cpuinfo.friendly("ffmpeg", ["ffmpeg", "-i"]) == "تجهيز الفيديو وتسجيل الكاميرات"
              and cpuinfo.friendly("chromium", ["/usr/lib/chromium/chromium"]) == "شاشة التلفاز", "أسماء مفهومة للعمليات"))
orig = cpuinfo.temperature
for t, want in ((60, 0), (88, "warn"), (97, "err")):
    cpuinfo.temperature = lambda t=t: {"current": t, "high": 100, "source": "coretemp"}
    a = cpuinfo.alerts(); res.append(ok((not a) if want == 0 else (a and a[0]["level"] == want), f"حرارة {t}° ← {a[0]['title'] if a else 'لا تنبيه'}"))
cpuinfo.temperature = lambda: {"current": 97, "high": 100, "source": "coretemp"}
h = c.get("/api/system/health").get_json(); res.append(ok(any("المعالج" in x["title"] for x in h["alerts"]), "التنبيه يظهر في «نظرة عامة»"))
cpuinfo.temperature = orig
cpuinfo._history.extend([{"t": int(time.time()) - 60, "cpu": 10, "temp": None}, {"t": int(time.time()), "cpu": 30, "temp": None}])
res.append(ok(len(c.get("/api/admin/cpu").get_json()["history"]) == 2, "سجل آخر ساعة"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
