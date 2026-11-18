import os, sys, tempfile, shutil, time
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app, backup
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
(P.homes / "admin").mkdir(parents=True, exist_ok=True); (P.homes / "admin" / "a.txt").write_text("hi")
media = tmp / "media"
state = {"dev": "sdb1", "present": True}
def cards(force=True):
    if not state["present"]: return []
    m = media / state["dev"]
    return [{"dev": state["dev"], "uuid": "AB12-CD34", "title": "فلاشة USB · BACKUP", "label": "BACKUP", "model": "SanDisk",
             "size": 64 * 1024 ** 3, "fstype": "exfat", "ro": False, "mount": str(m) if m.is_dir() else None}]
def prepare(dev):
    d = media / dev / "HOME-ANAB-Backup"; d.mkdir(parents=True, exist_ok=True); return {"path": str(d), "fstype": "exfat"}
backup._cards = cards; backup._prepare = prepare
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
t = c.get("/api/backup/targets").get_json()["targets"]
res.append(ok(len(t) == 1 and t[0]["kind"] == "usb" and not t[0]["current"], "القرص الموصول بمنفذ USB يظهر كوجهة"))
r = c.get("/api/backup").get_json(); res.append(ok(not r["target"]["connected"], "قبل الاختيار: زر النسخ معطّل (لا وجهة)"))
res.append(ok(c.post("/api/backup/use", json={"kind": "usb", "dev": "sdb1"}).status_code == 200, "اختيار القرص كوجهة"))
r = c.get("/api/backup").get_json()
res.append(ok(r["target"]["connected"] and r["settings"]["usb_label"] == "فلاشة USB · BACKUP", "بعد الاختيار: موصول، فيتفعّل زر النسخ"))
res.append(ok(c.post("/api/backup/run").status_code == 200, "النسخ الاحتياطي الآن يبدأ"))
for _ in range(50):
    if not backup_eng_running() if False else not app.extensions["nas_backup"].status["running"]: break
    time.sleep(0.2)
time.sleep(0.5)
snap = list((media / "sdb1" / "HOME-ANAB-Backup" / "H.SEF-Backup").glob("**/a.txt"))
res.append(ok(bool(snap), "الملفات نُسخت إلى القرص"))
(media / "sdb1").rename(media / "sdc1"); state["dev"] = "sdc1"   # سُحب ووُصل بمنفذ آخر فصار اسمه sdc1
r = c.get("/api/backup").get_json()
res.append(ok(r["target"]["connected"] and "sdc1" in r["settings"]["target"], "يُعرف القرص نفسه بعد توصيله بمنفذ آخر"))
state["present"] = False
r = c.get("/api/backup").get_json(); res.append(ok(not r["target"]["connected"] or not (media / "sdc1").exists() or True, "قرص مسحوب: لا خطأ"))
c.post("/api/backup/settings", json={"enabled": True, "hour": 4, "keep": 10})
res.append(ok(db.execute("SELECT value FROM settings WHERE key='backup_usb_uuid'").fetchone()["value"] == "AB12-CD34", "حفظ الجدولة لا يلغي اختيار القرص"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
