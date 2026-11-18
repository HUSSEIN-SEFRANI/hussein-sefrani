import os, sys, tempfile, time, shutil
os.environ["HSEF_EXTRAS_FAKE"] = "1"
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); app.testing = True; P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at,display_name) VALUES ('admin',?,1,'x','بابا')", (generate_password_hash("pass1234"),)); db.commit()
(P.homes / "admin" / "Photos").mkdir(parents=True); (P.homes / "admin" / "Photos" / "a.jpg").write_bytes(b"x" * 300000); (P.homes / "admin" / "doc.txt").write_bytes(b"y" * 100000)
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
d = c.get("/api/admin/storage").get_json()
res.append(ok(d["available"] and [x["role"] for x in d["disks"]] == ["system", "raid", "raid", "new"], f"الأقراص وأدوارها: {[(x['name'], x['role']) for x in d['disks']]}"))
for _ in range(20):
    time.sleep(0.3); d = c.get("/api/admin/storage").get_json()
    if d["usage"]: break
u = d["usage"]; me = u["people"][0] if u else {}
res.append(ok(me.get("name") == "بابا" and me.get("total") == 400000 and me.get("photos") == 300000, f"ماذا يشغل المساحة: {me}"))
run = lambda **k: c.post("/api/admin/storage/run", json={"password": "pass1234", "confirm": "مسح", **k})
r = c.post("/api/admin/storage/run", json={"op": "add", "devs": ["sdd"], "name": "x1", "password": "bad", "confirm": "مسح"}); res.append(ok(r.status_code == 403, "كلمة مرور خاطئة ← مرفوض"))
r = c.post("/api/admin/storage/run", json={"op": "add", "devs": ["sdd"], "name": "x1", "password": "pass1234", "confirm": "نعم"}); res.append(ok(r.status_code == 400, "كلمة التأكيد خاطئة ← مرفوض"))
r = run(op="add", devs=["sdb"], name="x1"); res.append(ok(r.status_code == 400 and "مستعمل" in r.get_json()["error"], "قرص في المرآة لا يُمسح"))
r = run(op="add", devs=["sda"], name="x1"); res.append(ok(r.status_code == 400, "قرص النظام لا يُمسح"))
r = run(op="add", devs=["sdd"], name="قرصي"); res.append(ok(r.status_code == 400, "اسم بحروف عربية مرفوض (اسم الشبكة بالإنجليزية)"))
r = run(op="mirror", devs=["sdd"]); res.append(ok(r.status_code == 400, "المرآة تحتاج قرصين"))
r = run(op="replace", devs=["sdd"]); res.append(ok(r.status_code == 400 and "متدهورة" in r.get_json()["error"], "استبدال بلا مرآة متدهورة ← مرفوض"))
r = run(op="format", devs=["sdd"]); res.append(ok(r.status_code == 400, "عملية غير معروفة ← مرفوض"))
r = run(op="add", devs=["sdd"], name="extra1"); j = r.get_json(); res.append(ok(r.status_code == 200 and j["op"]["op"] == "add" and j["op"]["done"], f"قرص منفصل يبدأ: {j.get('op', {}).get('label')}"))
st = c.get("/api/admin/storage/op").get_json(); res.append(ok("homenas-disk add /dev/sdd extra1" in st["op"]["log"], "سجل العملية يظهر"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
