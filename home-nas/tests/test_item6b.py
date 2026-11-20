"""البند 6 (الباقي): الاستيراد من شاشة الإعداد الأول على جهاز جديد بلا حسابات."""
import io, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash, check_password_hash
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
def device(tag):
    tmp = Path(tempfile.mkdtemp(prefix=tag))
    cfg = {"secret_key": "t", "data_dir": str(tmp / f"data-{tag}"), "port": 8099, "host": "127.0.0.1", "max_upload_gb": 1}
    app = create_app(cfg, start_indexer=False); app.testing = True
    return tmp, cfg, app, Paths(cfg["data_dir"])
tA, cA, appA, PA = device("A")
db = connect(PA.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at,tv_role) VALUES ('baba',?,1,'x','adult')", (generate_password_hash("oldpass1"),))
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at,tv_role) VALUES ('kid',?,0,'x','kid')", (generate_password_hash("x123456"),))
db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES ('server_name','بيتنا')"); db.commit()
c = appA.test_client()
with c.session_transaction() as s:
    s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
j = c.post("/api/admin/transfer/export", json={"password": "sirri123"}).get_json()
blob = c.get(j["url"] + "?name=" + j["name"]).data
# جهاز جديد: شاشة الإعداد الأول
tB, cB, appB, PB = device("B")
page = appB.test_client().get("/setup").get_data(as_text=True)
res.append(ok("انقل كل شيء منه" in page and "/api/setup/import" in page, "شاشة الإعداد الأول فيها «عندك جهاز قديم؟ انقل كل شيء منه»"))
cb = appB.test_client()
bad = cb.post("/api/setup/import", data={"file": (io.BytesIO(blob), "x.anab"), "password": "wrongpw"}, content_type="multipart/form-data")
res.append(ok(bad.status_code == 400 and not (PB.system / "import-pending").exists(), "كلمة سر خاطئة ← رسالة واضحة ولا شيء يُجهَّز"))
good = cb.post("/api/setup/import", data={"file": (io.BytesIO(blob), "x.anab"), "password": "sirri123"}, content_type="multipart/form-data")
m = (good.get_json() or {}).get("manifest", {})
res.append(ok(good.status_code == 200 and m.get("users") == 2 and (PB.system / "import-pending/ready").exists(), f"الملف الصحيح يُجهَّز للتطبيق ({m.get('server_name')}، {m.get('users')} حساب)"))
appB2 = create_app(cB, start_indexer=False)   # إعادة التشغيل
dbB = connect(PB.db)
u = dbB.execute("SELECT password_hash FROM users WHERE username='baba'").fetchone()
res.append(ok(u and check_password_hash(u[0], "oldpass1") and dbB.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 2,
              "بعد إعادة التشغيل: حسابات الجهاز القديم وكلمات مرورها"))
res.append(ok(appB2.test_client().get("/setup").status_code == 302, "وشاشة الإعداد الأول لا تظهر بعدها (الدخول بحساب الجهاز القديم)"))
again = appB2.test_client().post("/api/setup/import", data={"file": (io.BytesIO(blob), "x.anab"), "password": "sirri123"}, content_type="multipart/form-data")
res.append(ok(again.status_code == 403, "جهاز مُعدّ: الاستيراد من هنا ممنوع (لوحة التحكم فقط، للمدير)"))
ca = appA.test_client()
with ca.session_transaction() as s:
    s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
old = ca.post("/api/admin/transfer/import", data={"file": (io.BytesIO(blob), "x.anab"), "password": "sirri123"}, content_type="multipart/form-data")
res.append(ok(old.status_code == 200, "الاستيراد من لوحة التحكم يعمل كما كان"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tA, ignore_errors=True); shutil.rmtree(tB, ignore_errors=True); sys.exit(0 if all(res) else 1)
