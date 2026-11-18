import os, runpy, sys, tempfile, shutil, json
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
os.environ["HSEF_INSTALLER_FAKE_TAKEN"] = "home-anab,home-anab-2"
g = runpy.run_path(str(APP / "installer/hsef-installer"), run_name="nomain")
res.append(ok(g["free_name"]() == "home-anab-3", f"المثبّت يقترح اسماً غير مستعمل: {g['free_name']()}"))
os.environ["HSEF_INSTALLER_FAKE_TAKEN"] = ""
res.append(ok(g["free_name"]() == "home-anab", "بلا أجهزة أخرى ← home-anab"))
R = g["HOST_RE"]
res.append(ok(all(R.match(x) for x in ("beit-ahmad", "nas2", "a")) and not any(R.match(x) for x in ("بيت", "Beit", "-x", "x-", "a b", "a_b", "x" * 64)), "قواعد الاسم (إنجليزي صغير وأرقام وشرطة، 1–63)"))
from homenas import create_app, system
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
res.append(ok(system.suggest_hostname("Beit Ahmad") == "beit-ahmad" and system.suggest_hostname("منزل العنب") == "home-anab", "اقتراح اسم من اسم العرض"))
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
system.mdns_name = lambda: "home-anab-2"; system._mdns_cache.update(t=0, name=None)
import socket; socket.gethostname = lambda: "home-anab"
d = c.get("/api/admin/hostname").get_json()
res.append(ok(d["conflict"] and d["mdns"] == "home-anab-2", f"تعارض في الشبكة يظهر: {d['hostname']} ← {d['mdns']}"))
r = c.post("/api/admin/hostname", json={"name": "Beit_Ahmad"}); res.append(ok(r.status_code == 400, "اسم غير صالح مرفوض"))
r = c.post("/api/admin/hostname", json={"name": "beit-ahmad"}); res.append(ok(r.status_code == 400 and "ISO" in r.get_json()["error"], "على كمبيوتر عادي: رسالة واضحة"))
system.APPLIANCE = True; system._extras = lambda *a, **k: (True, json.dumps({"ok": True, "hostname": a[1]}))
r = c.post("/api/admin/hostname", json={"name": "beit-ahmad"}); res.append(ok(r.status_code == 200, "على جهاز HOME ANAB: يُغيَّر الاسم"))
h = runpy.run_path(str(APP / "appliance/hsef-extras"), run_name="nomain")
res.append(ok(h["HOST_RE"].match("beit-ahmad") and not h["HOST_RE"].match("Beit Ahmad"), "hsef-extras يتحقق من الاسم أيضاً"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
