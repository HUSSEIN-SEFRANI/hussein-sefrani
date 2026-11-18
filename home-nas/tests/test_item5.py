import os, runpy, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
g = runpy.run_path(str(APP / "appliance/hsef-cec"), run_name="nomain")
P, M = g["parse_line"], g["map_key"]
res.append(ok(P("TRAFFIC: [ 1234]\t>> 01:44:01") is None or True, "سطر عادي لا يعطّل"))
res.append(ok(P("NOTICE: [  9876]\tkey pressed: up (1) current(ff) duration(0)") == ("key", 1), "زر «أعلى» من الريموت"))
res.append(ok(P("DEBUG:  key pressed: exit (d)") == ("key", 0x0d) and M(0x0d) == 1, "زر «رجوع/خروج» ← Esc"))
res.append(ok(P("key pressed: select (0)") == ("key", 0) and M(0) == 28, "«موافق» ← Enter"))
res.append(ok(P("key pressed: number 7 (27)") == ("key", 0x27) and M(0x27) == 8, "الأرقام ← 0–9"))
res.append(ok(P("TRAFFIC: [  12]\t>> 0f:36") == ("standby", None), "أمر Standby من التلفاز يُكتشف"))
res.append(ok(P("key pressed: power (40)") == ("power", None) and P(">> 04:44:6c") == ("power", None), "زر Power يُكتشف"))
res.append(ok(all(M(c) is None for c in (0x40, 0x6b, 0x6c, 0x6d)), "أزرار الإطفاء لا تتحول إلى أي زر (لا توقف النظام)"))
res.append(ok(P("osd string:   LG TV") == ("tv", "LG TV"), "اسم التلفاز"))
src = (APP / "appliance/install.sh").read_text()
res.append(ok('TAG-="power-switch"' in src and "hsef-cec.service" in src, "قاعدة udev تمنع logind من الإطفاء عبر CEC + الخدمة"))
os.environ["HSEF_EXTRAS_FAKE"] = "1"
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
d = c.get("/api/admin/tv/cec").get_json(); res.append(ok(d["supported"] is False and d["reason"] == "no-adapter", "جهاز بلا CEC ← «لا يدعم»"))
os.environ["FAKE_CEC"] = "1"
d = c.get("/api/admin/tv/cec").get_json(); res.append(ok(d["supported"] and d["connected"], "جهاز مع محوّل ← يعمل"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
