"""البند 31: قرص الشبكة (SMB) لا يعرض شيئاً بعد استرجاع نسخة من جهاز آخر.
السبب: كلمات سر سامبا على الجهاز نفسه لا في النسخة، بينما علامات «جاهز» (smb_pw_<id>) تصل من الجهاز القديم."""
import json, os, runpy, shutil, sqlite3, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
os.environ["HSEF_EXTRAS_FAKE"] = "1"
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app, transfer, network, core
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash

# ---- 1. بعد الاستيراد تُمسح علامات «جاهز» القديمة
tmp = Path(tempfile.mkdtemp()); dp = Paths(str(tmp / "d"))
core.init_db(dp.db)
old = tmp / "old.db"; core.init_db(old)
c = sqlite3.connect(old)
c.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('baba',?,1,'x')", (generate_password_hash("oldpass1"),))
c.executemany("INSERT INTO settings(key,value) VALUES (?,?)", [("smb_pw_1", "1"), ("smb_pw_2", "1"), ("smb_enabled", "1")])
c.commit(); c.execute("PRAGMA wal_checkpoint(TRUNCATE)"); c.close()
pend = dp.system / transfer.PENDING; pend.mkdir(parents=True)
shutil.copy(old, pend / "nas.db")
(pend / "manifest.json").write_text(json.dumps({"data_dir": str(dp.data), "files": False}))
(pend / "ready").write_text("{}")
res.append(ok(transfer.apply_pending(dp) == "import", "الاستيراد طُبّق"))
c = sqlite3.connect(dp.db)
keys = {k for (k,) in c.execute("SELECT key FROM settings")}
users = [u for (u,) in c.execute("SELECT username FROM users")]
c.close()
res.append(ok(not any(k.startswith("smb_pw_") for k in keys), "علامات «قرص الشبكة جاهز» من الجهاز القديم مُسحت"))
res.append(ok("smb_enabled" in keys and users == ["baba"], "المستخدمون وتشغيل قرص الشبكة جاءت من النسخة"))

# ---- 2. عند الدخول إلى الواجهة تُضبط كلمة سر سامبا تلقائياً إن لم تكن جاهزة
calls = []
network.on_password = lambda uid, name, pw: calls.append((uid, name, pw))
cfg = {"secret_key": "t", "data_dir": str(tmp / "d2"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('baba',?,1,'x')", (generate_password_hash("oldpass1"),)); db.commit()
cl = app.test_client()
r = cl.post("/login", data={"username": "baba", "password": "oldpass1"})
res.append(ok(r.status_code == 302 and calls == [(1, "baba", "oldpass1")], f"أول دخول بعد الاستيراد ← كلمة سر قرص الشبكة تُضبط ({calls})"))
db.execute("INSERT INTO settings(key,value) VALUES ('smb_pw_1','1')"); db.commit()
calls.clear(); cl.get("/logout"); cl.post("/login", data={"username": "baba", "password": "oldpass1"})
res.append(ok(calls == [(1, "baba", "oldpass1")], "وكل دخول يضبطها من جديد (تبقى مطابقة لكلمة سر الواجهة)"))
calls.clear(); cl.post("/login", data={"username": "baba", "password": "wrong"})
res.append(ok(calls == [], "كلمة سر خاطئة ← لا شيء"))
nm = network.Network.__new__(network.Network); nm.paths = Paths(cfg["data_dir"]); nm.tv_root = tmp
db.execute("INSERT INTO users(username,password_hash,is_admin,disabled,created_at) VALUES ('off','x',0,1,'x')"); db.commit()
conf = nm.build_config(db)["smb"]
res.append(ok(conf["known_ids"] == [1, 2] and [u["id"] for u in conf["users"]] == [1], "known_ids فيها الحسابات الموقوفة أيضاً"))

# ---- الإصلاح الذاتي: علامة «جاهز» لشخص لا يعرفه سامبا تُمسح
db.execute("INSERT INTO settings(key,value) VALUES ('smb_pw_2','1') ON CONFLICT(key) DO UPDATE SET value='1'"); db.commit()
network.run_helper = lambda *a, **k: (True, json.dumps({"smb_users": ["hsef1"]}))
network.helper_available = lambda: True
nm.heal_marks()
marks = {k for (k,) in db.execute("SELECT key FROM settings WHERE key LIKE 'smb_pw_%'")}
res.append(ok(marks == {"smb_pw_1"}, f"علامة smb_pw_2 مُسحت لأن سامبا لا يعرف hsef2، وبقيت smb_pw_1: {sorted(marks)}"))
network.run_helper = lambda *a, **k: (False, "")
db.execute("INSERT INTO settings(key,value) VALUES ('smb_pw_2','1')"); db.commit(); nm.heal_marks()
res.append(ok(db.execute("SELECT 1 FROM settings WHERE key='smb_pw_2'").fetchone() is not None, "إن تعذّر سؤال سامبا لا يُمسح شيء"))

# ---- 3. حسابات سامبا لأشخاص غير موجودين تُزال (والموقوف لا يُزال)
root = tmp / "root"; os.environ["HSEF_ROOT"] = str(root); os.environ["HSEF_NO_SYSTEMD"] = "1"
g = runpy.run_path(str(APP / "appliance/hsef-net"), run_name="nomain")
ran = []
class R:
    def __init__(self, out=""): self.stdout, self.returncode, self.stderr = out, 0, ""
def fake_run(*cmd, **kw):
    ran.append(cmd)
    return R("hsef1:1001:\nhsef2:1002:\nhsef9:1009:\nroot:0:\n" if cmd[:2] == ("pdbedit", "-L") else "")
g["run"].__globals__["run"] = fake_run
g["shutil"].which = lambda n: "/usr/bin/" + n
g["apply_smb"]({"data_dir": str(tmp / "data"), "smb": {**conf, "enabled": False}})
removed = [c[2] for c in ran if c[:2] == ("smbpasswd", "-x")]
res.append(ok(removed == ["hsef9"], f"يُزال hsef9 فقط (غير موجود)، ويبقى hsef1 وhsef2 الموقوف: {removed}"))
ran.clear()
g["apply_smb"]({"data_dir": str(tmp / "data"), "smb": {"enabled": False, "users": conf["users"], "shares": []}})
res.append(ok(not any(c[:2] == ("smbpasswd", "-x") for c in ran), "إعدادات من إصدار أقدم بلا known_ids ← لا يُحذف شيء"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
