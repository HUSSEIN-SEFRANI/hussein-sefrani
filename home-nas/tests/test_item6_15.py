"""البند 6 و15: تصدير/استيراد وإعادة ضبط المصنع، على الكود الحقيقي بجهازين مؤقتين."""
import io, json, os, sqlite3, subprocess, sys, tarfile, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
def device(tag):
    tmp = Path(tempfile.mkdtemp(prefix=tag))
    cfg = {"secret_key": "t", "data_dir": str(tmp / f"data-{tag}"), "port": 8099, "host": "127.0.0.1", "max_upload_gb": 1}
    app = create_app(cfg, start_indexer=False); app.testing = True
    return tmp, cfg, app, Paths(cfg["data_dir"])
def admin_client(app, P, uid=1):
    c = app.test_client(); db = connect(P.db)
    with c.session_transaction() as s:
        s["uid"] = uid; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=?", (uid,)).fetchone()[0][-12:]
    return c
# ---- الجهاز القديم
tA, cA, appA, PA = device("A")
db = connect(PA.db); now = "2026-01-01T00:00:00"
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at,tv_role) VALUES ('admin',?,1,?,'adult')", (generate_password_hash("oldpass1"), now))
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at,tv_role) VALUES ('kid',?,0,?,'kid')", (generate_password_hash("x123456"), now))
db.execute("INSERT INTO stars(user_id,balance) VALUES (2, 37)")
db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES ('act_code','OLD-DEVICE-CODE'), ('tv_city','brussels')")
db.commit()
(PA.system / "adhan").mkdir(exist_ok=True); (PA.system / "adhan" / "main.mp3").write_bytes(b"ADHAN")
(PA.homes / "kid").mkdir(exist_ok=True); (PA.homes / "kid" / "drawing.txt").write_text("رسمتي")
from homenas import tv
with appA.app_context():
    tv.share_dir(db, PA, "games")
cA_ = admin_client(appA, PA)
r = cA_.post("/api/admin/transfer/export", json={"password": "123"}); res.append(ok(r.status_code == 400, "كلمة سر قصيرة مرفوضة"))
rf = cA_.post("/api/admin/transfer/export", json={"password": "sirri123", "files": True}); res.append(ok(rf.status_code == 400, "v1.9.8: كل الملفات عبر المتصفح مرفوض (تُنقل بالقرص)"))
r = cA_.post("/api/admin/transfer/export", json={"password": "sirri123"}); j = r.get_json()
res.append(ok(r.status_code == 200 and j["url"].startswith("/api/admin/transfer/download/"), f"تجهيز التصدير الكامل: {j.get('name')} {j.get('size')} بايت"))
r = cA_.get(j["url"] + "?name=" + j["name"]); blob = r.data; r.close()
res.append(ok(r.status_code == 200 and len(blob) == j["size"] and b"ADHAN" not in blob and b"oldpass" not in blob, "التنزيل يعمل، والملف مشفّر (لا نص مقروء)"))
dec = subprocess.run(["openssl", "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-pass", "pass:sirri123"], input=blob, capture_output=True)
names = tarfile.open(fileobj=io.BytesIO(dec.stdout), mode="r:gz").getnames()
res.append(ok("nas.db" in names and "system/adhan/main.mp3" in names and not any(n.startswith("homes") for n in names), "المحتوى: قاعدة البيانات والأذان، بلا الملفات"))
inner = tarfile.open(fileobj=io.BytesIO(dec.stdout), mode="r:gz").extractfile("nas.db").read()
tmpdb = Path(tempfile.mktemp()); tmpdb.write_bytes(inner)
res.append(ok(sqlite3.connect(tmpdb).execute("SELECT COUNT(*) FROM settings WHERE key LIKE 'act_%'").fetchone()[0] == 0, "كود تفعيل الجهاز القديم ليس في الملف"))
small = cA_.post("/api/admin/transfer/export", json={"password": "sirri123"}).get_json()
blob_small = cA_.get(small["url"]).data
# ---- الجهاز الجديد
tB, cB, appB, PB = device("B")
dbB = connect(PB.db)
dbB.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('newadmin',?,1,?)", (generate_password_hash("newpass1"), now))
dbB.execute("INSERT OR REPLACE INTO settings(key,value) VALUES ('act_code','NEW-DEVICE-CODE')"); dbB.commit()
cB_ = admin_client(appB, PB)
bad = cB_.post("/api/admin/transfer/import", data={"file": (io.BytesIO(blob), "x.anab"), "password": "wrongpw"}, content_type="multipart/form-data")
res.append(ok(bad.status_code == 400 and not (PB.system / "import-pending").exists(), f"كلمة سر خاطئة مرفوضة: {bad.get_json()}"))
junk = cB_.post("/api/admin/transfer/import", data={"file": (io.BytesIO(b"not a file"), "x.anab"), "password": "sirri123"}, content_type="multipart/form-data")
res.append(ok(junk.status_code == 400, "ملف عشوائي مرفوض"))
good = cB_.post("/api/admin/transfer/import", data={"file": (io.BytesIO(blob), "x.anab"), "password": "sirri123"}, content_type="multipart/form-data")
g = good.get_json(); res.append(ok(good.status_code == 200 and g["manifest"]["users"] == 2 and not g["manifest"]["files"] and g["restart"] is False, f"استيراد مقبول: {g.get('manifest')}"))
st = cB_.get("/api/admin/transfer").get_json(); res.append(ok(st["pending_import"] is not None, "الحالة: ينتظر إعادة التشغيل"))
# «إعادة التشغيل»
appB2 = create_app(cB, start_indexer=False)
dbB2 = connect(PB.db)
users = [r[0] for r in dbB2.execute("SELECT username FROM users ORDER BY id")]
res.append(ok(users == ["admin", "kid"], f"بعد إعادة التشغيل: مستخدمو الجهاز القديم {users}"))
res.append(ok(dbB2.execute("SELECT balance FROM stars WHERE user_id=2").fetchone()[0] == 37, "نجوم الطفل انتقلت (37)"))
res.append(ok(dbB2.execute("SELECT value FROM settings WHERE key='act_code'").fetchone()[0] == "NEW-DEVICE-CODE", "تفعيل الجهاز الجديد بقي كما هو"))
res.append(ok(dbB2.execute("SELECT value FROM settings WHERE key='tv_city'").fetchone()[0] == "brussels", "إعدادات التلفاز انتقلت"))
res.append(ok((PB.system / "adhan" / "main.mp3").read_bytes() == b"ADHAN", "الأذان انتقل"))
(PB.homes / "kid").mkdir(parents=True, exist_ok=True); (PB.homes / "kid" / "drawing.txt").write_text("رسمتي")
paths_ = [r[0] for r in dbB2.execute("SELECT path FROM folders")]
res.append(ok(paths_ and all(p_.startswith(str(PB.data)) for p_ in paths_), f"مسارات المجلدات المشتركة صُحّحت للجهاز الجديد: {paths_}"))
kept = [x.name for x in PB.system.iterdir() if ".before-" in x.name]
res.append(ok(any(k.startswith("nas.db.before-") for k in kept), f"قاعدة بيانات الجهاز الجديد محفوظة بجانبها: {kept}"))
res.append(ok(not (PB.system / "import-pending").exists(), "ملفات الاستيراد المؤقتة حُذفت"))
# ملف من إصدار أحدث
newer = Path(tempfile.mkdtemp()); man = {"magic": "HOME ANAB", "format": 1, "version": "9.9.9"}
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode="w:gz") as t:
    d = json.dumps(man).encode(); ti = tarfile.TarInfo("manifest.json"); ti.size = len(d); t.addfile(ti, io.BytesIO(d))
    d2 = inner; ti2 = tarfile.TarInfo("nas.db"); ti2.size = len(d2); t.addfile(ti2, io.BytesIO(d2))
    ev = b"x"; ti3 = tarfile.TarInfo("../../evil.txt"); ti3.size = 1; t.addfile(ti3, io.BytesIO(ev))
encd = subprocess.run(["openssl", "enc", "-aes-256-cbc", "-salt", "-pbkdf2", "-iter", "200000", "-pass", "pass:pw123456"], input=buf.getvalue(), capture_output=True).stdout
cB2 = admin_client(appB2, PB)
r = cB2.post("/api/admin/transfer/import", data={"file": (io.BytesIO(encd), "x.anab"), "password": "pw123456"}, content_type="multipart/form-data")
res.append(ok(r.status_code == 400 and "أحدث" in r.get_json()["error"], "ملف من إصدار أحدث مرفوض"))
res.append(ok(not any(Path(tB).rglob("evil.txt")) and not (PB.system.parent.parent / "evil.txt").exists(), "مسار خبيث داخل الملف لا يُكتب خارج المجلد"))
# ---- إعادة ضبط المصنع (الإعدادات فقط)
r = cB2.post("/api/admin/transfer/reset", json={"password": "bad", "confirm": "123"}); res.append(ok(r.status_code == 403, "كلمة مرور الحساب خاطئة ← مرفوض"))
r = cB2.post("/api/admin/transfer/reset", json={"password": "oldpass1", "confirm": "نعم"}); res.append(ok(r.status_code == 400, "كلمة التأكيد خاطئة ← مرفوض"))
r = cB2.post("/api/admin/transfer/reset", json={"password": "oldpass1", "confirm": "123", "wipe_files": False}); res.append(ok(r.status_code == 200, "طلب إعادة الضبط مقبول"))
appB3 = create_app(cB, start_indexer=False); dbB3 = connect(PB.db)
res.append(ok(dbB3.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0, "بعد إعادة التشغيل: لا مستخدمين (شاشة الإعداد الأول)"))
res.append(ok(dbB3.execute("SELECT value FROM settings WHERE key='act_code'").fetchone()[0] == "NEW-DEVICE-CODE", "التفعيل بقي بعد إعادة الضبط"))
res.append(ok((PB.homes / "kid" / "drawing.txt").exists() and not (PB.system / "adhan").exists(), "الملفات بقيت، وملفات النظام (الأذان) حُذفت"))
r = appB3.test_client().get("/api/tv/profiles"); res.append(ok(r.status_code == 200 and r.get_json().get("setup") is not None, "التلفاز يعرض شاشة الإعداد الأول"))
# ---- إعادة ضبط كاملة
dbB3.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('a2',?,1,?)", (generate_password_hash("pass1234"), now)); dbB3.commit()
c3 = admin_client(appB3, PB)
r = c3.post("/api/admin/transfer/reset", json={"password": "pass1234", "confirm": " ١٢٣ ", "wipe_files": True}); res.append(ok(r.status_code == 200, "إعادة ضبط كاملة مقبولة («١٢٣» بالأرقام العربية والمسافات الزائدة تُتجاهل)"))
create_app(cB, start_indexer=False)
res.append(ok(not any(PB.homes.iterdir()) and connect(PB.db).execute("SELECT value FROM settings WHERE key='act_code'").fetchone()[0] == "NEW-DEVICE-CODE", "الملفات حُذفت، والتفعيل بقي"))
print(f"\n{sum(res)}/{len(res)} نجح")
for t in (tA, tB): shutil.rmtree(t, ignore_errors=True)
sys.exit(0 if all(res) else 1)
