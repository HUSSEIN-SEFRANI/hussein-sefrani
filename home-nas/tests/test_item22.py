import os, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
os.environ["HSEF_EXTRAS_FAKE"] = "1"
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app, cpuinfo
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
res.append(ok(cpuinfo.DISK_RE.match("sda") and cpuinfo.DISK_RE.match("nvme0n1") and not cpuinfo.DISK_RE.match("sda1") and not cpuinfo.DISK_RE.match("md0") and not cpuinfo.DISK_RE.match("loop0"), "الأقراص كاملة فقط (لا الأقسام ولا RAID ولا loop)"))
cpuinfo.disk_bytes = lambda it=iter([(1000, 2000), (3_000_000 + 1000, 5_000_000 + 2000)]): next(it)
cpuinfo.time.sleep = lambda s: None
d = c.get("/api/admin/disk-io").get_json()
res.append(ok(d["available"] and d["read"] == 3_000_000 and d["write"] == 5_000_000, f"السرعة الآن: قراءة {d['read']} كتابة {d['write']} بايت/ث"))
names = [x["name"] for x in d["top"]]
res.append(ok(names[0] == "قرص الشبكة (ويندوز)" and "تجهيز الفيديو وتسجيل الكاميرات" in names and any("HOME ANAB" in n for n in names), f"البرامج بأسماء مفهومة: {names}"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
