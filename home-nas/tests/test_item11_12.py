"""البندان 11 و12 (الباقي): الشاشة والدقة من إعدادات التلفاز نفسه، والإعدادات في مجموعات."""
import os, subprocess, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
os.environ["HSEF_EXTRAS_FAKE"] = "1"
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import create_app, tv
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,tv_pin,created_at) VALUES ('baba',?,1,'adult','x','x')", (generate_password_hash("p"),))
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,created_at) VALUES ('sara',?,0,'kid','x')", (generate_password_hash("p"),)); db.commit()
calls = []
tv.kiosk_helper = lambda *a, **k: (calls.append(a), (True, '{"screens": [{"name": "HDMI-A-1", "modes": ["1920x1080"]}], "shown": "HDMI-A-1"}' if a[0] == "tv-modes" else ""))[1]
def cl(uid):
    c = app.test_client()
    with c.session_transaction() as s: s["tv_uid"] = uid
    return c
baba, sara = cl(1), cl(2)
r = baba.get("/api/tv/admin/display")
res.append(ok(r.status_code == 200 and r.get_json()["shown"] == "HDMI-A-1", "التلفاز: قراءة الشاشات والدقات"))
res.append(ok(baba.post("/api/tv/admin/screen", json={"name": "HDMI-A-2", "try": True}).status_code == 200 and calls[-1] == ("tv-screen-set", "HDMI-A-2", "20"),
              "تجربة شاشة أخرى 20 ثانية"))
res.append(ok(baba.post("/api/tv/admin/screen", json={"name": "HDMI-A-2"}).status_code == 200 and calls[-1] == ("tv-screen-set", "HDMI-A-2"), "حفظ الشاشة"))
res.append(ok(baba.post("/api/tv/admin/display", json={"mode": "1920x1080"}).status_code == 200 and calls[-1] == ("tv-mode-set", "1920x1080"), "تغيير الدقة"))
res.append(ok(baba.post("/api/tv/admin/display", json={"mode": "1920x1080; rm"}).status_code == 400 and baba.post("/api/tv/admin/screen", json={"name": "../x"}).status_code == 400,
              "قيم غريبة مرفوضة"))
res.append(ok(sara.get("/api/tv/admin/display").status_code == 403 and sara.post("/api/tv/admin/screen", json={"name": "auto"}).status_code == 403, "الأطفال لا يغيّرون الشاشة"))
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
res.append(ok("async function screenSetScreen" in js and "/api/tv/admin/display" in js and "js-keep" in js, "شاشة «الشاشة» في إعدادات التلفاز (مع «حفظ» بعد التجربة)"))
res.append(ok("const SET_GROUPS" in js and all(g in js for g in ('["التلفاز"', '["الألعاب"', '["الشبكة"')) and "set-group" in js, "الإعدادات في ثلاث مجموعات: التلفاز، الألعاب، الشبكة"))
res.append(ok(".set-groups" in (APP / "static/css/tv.css").read_text(encoding="utf-8") and subprocess.run(["node", "--check", str(APP / "static/js/tv.js")]).returncode == 0, "التنسيق وملف JS سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
