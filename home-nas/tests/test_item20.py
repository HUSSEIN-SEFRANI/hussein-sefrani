import os, sys, tempfile, shutil, time, json, sqlite3
from datetime import datetime
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app, backup, transfer
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),))
for k, v in (("server_name", "بيتنا"), ("tv_lite", "1"), ("act_code", "XYZ")): db.execute("INSERT INTO settings VALUES (?,?)", (k, v))
db.commit()
(P.homes / "admin").mkdir(parents=True, exist_ok=True); (P.homes / "admin" / "a.txt").write_text("hi"); (P.system / "adhan").mkdir(exist_ok=True); (P.system / "adhan" / "x.mp3").write_bytes(b"1")
dest = tmp / "usb"; dest.mkdir(); (dest / backup.MARKER).write_text("x")
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
c.post("/api/backup/settings", json={"target": str(dest)})
eng = app.extensions["nas_backup"]
def wait():
    for _ in range(100):
        if not eng.status["running"]: return
        time.sleep(0.1)
# is_due
S = {"enabled": True, "hour": 3, "last": None}
fri = datetime(2026, 11, 20, 3, 5); thu = datetime(2026, 11, 19, 3, 5); d1 = datetime(2026, 12, 1, 3, 0)
res.append(ok(backup.is_due({**S, "freq": "daily"}, thu) and backup.is_due({**S, "freq": "weekly"}, fri) and not backup.is_due({**S, "freq": "weekly"}, thu)
              and backup.is_due({**S, "freq": "monthly"}, d1) and not backup.is_due({**S, "freq": "monthly"}, fri), "يومي / أسبوعي (الجمعة) / شهري (يوم 1)"))
res.append(ok(c.post("/api/backup/settings", json={"what": "settings", "freq": "monthly", "enabled": True}).status_code == 200
              and c.get("/api/backup").get_json()["settings"]["freq"] == "monthly", "حفظ ماذا ومتى"))
c.post("/api/backup/run", json={"what": "settings"}); wait(); time.sleep(1.1)
snaps = backup.list_snapshots(dest / backup.ROOT_NAME); s1 = dest / backup.ROOT_NAME / snaps[0]
res.append(ok((s1 / "@system" / "nas.db").is_file() and (s1 / "@system" / "system" / "adhan" / "x.mp3").is_file() and not (s1 / "homes").exists(), "«الإعدادات فقط»: قاعدة البيانات وملفات النظام بلا الملفات"))
time.sleep(60 - datetime.now().second + 0.5) if False else None
# اسم مختلف للنسخة الثانية
os.rename(s1, s1.with_name("2026-01-01_0000")); s1 = s1.with_name("2026-01-01_0000")
c.post("/api/backup/run", json={"what": "files"}); wait()
snaps = backup.list_snapshots(dest / backup.ROOT_NAME); s2 = dest / backup.ROOT_NAME / snaps[0]
res.append(ok((s2 / "homes" / "admin" / "a.txt").is_file() and not (s2 / "@system" / "nas.db").exists(), "«الملفات فقط»: بلا إعدادات"))
lst = c.get("/api/backup/restore").get_json()
res.append(ok(lst["connected"] and {x["what"] for x in lst["snapshots"]} == {"settings", "files"}, "قائمة النسخ للاسترجاع مع محتواها"))
# استرجاع الملفات
(P.homes / "admin" / "a.txt").unlink(); (P.homes / "admin" / "new.txt").write_text("keep")
c.post("/api/backup/restore", json={"snapshot": s2.name, "part": "files"})
for _ in range(50):
    if not backup._restore_job["running"]: break
    time.sleep(0.1)
res.append(ok((P.homes / "admin" / "a.txt").read_text() == "hi" and (P.homes / "admin" / "new.txt").exists(), "استرجاع الملفات: يرجع الناقص ولا يحذف شيئاً"))
# استرجاع الإعدادات من نسخة «جهاز آخر»
x = sqlite3.connect(s1 / "@system" / "nas.db"); x.execute("UPDATE settings SET value='0' WHERE key='tv_lite'"); x.execute("UPDATE settings SET value='بيت جدي' WHERE key='server_name'"); x.commit(); x.close()
db.execute("UPDATE settings SET value='1' WHERE key='tv_lite'"); db.commit()
r = c.post("/api/backup/restore", json={"snapshot": s1.name, "part": "settings"})
res.append(ok(r.status_code == 200 and (P.system / "import-pending" / "ready").exists(), "استرجاع الإعدادات يُجهَّز ليُطبَّق عند إعادة التشغيل"))
db.close()
done = transfer.apply_pending(P)
x = sqlite3.connect(P.db); kv = dict(x.execute("SELECT key, value FROM settings").fetchall()); x.close()
res.append(ok(done == "import" and kv.get("server_name") == "بيت جدي", "بعد إعادة التشغيل: الإعدادات من النسخة"))
res.append(ok(kv.get("tv_lite") == "1" and kv.get("act_code") == "XYZ" and str(dest) == kv.get("backup_target"), "التفعيل وإعدادات عتاد هذا الجهاز بقيت كما هي"))
r = c.post("/api/admin/transfer/export", json={"password": "123456", "files": True})
res.append(ok(r.status_code == 400 and "النسخ الاحتياطي" in r.get_json()["error"], "تصدير كل الملفات عبر المتصفح: رسالة واضحة بدل التعليق"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
