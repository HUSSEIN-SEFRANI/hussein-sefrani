"""البند 63: المدير يختار بطاقات الشاشة الرئيسية للبالغين (الصلاة، نص اليوم، كلمة اليوم، التقويم، العائلة، ذكرى من هذا اليوم)."""
import os, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
os.environ["HSEF_EXTRAS_FAKE"] = "1"
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import create_app, tv
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
import datetime as dt
T = Path(tempfile.mkdtemp())
near = (dt.date.today() + dt.timedelta(days=6)).strftime("2018-%m-%d").replace("-02-29", "-02-28")
far = (dt.date.today() + dt.timedelta(days=95)).strftime("1989-%m-%d").replace("-02-29", "-02-28")
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,birthdate,created_at) VALUES ('baba',?,1,'adult',?,'x')", (generate_password_hash("p"), far))
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,birthdate,created_at) VALUES ('sara',?,0,'kid',?,'x')", (generate_password_hash("p"), near)); db.commit()
c = app.test_client(); c.post("/login", data={"username": "baba", "password": "p"})
s = c.get("/api/admin/tv").get_json()["settings"]
res.append(ok(s["home_cards"] == ["prayer", "text", "word"], "الافتراضي كما كان: الصلاة ونص اليوم وكلمة اليوم"))
c.post("/api/admin/tv/settings", json={"home_cards": ["memory", "calendar", "family", "x", "prayer"]})
s = c.get("/api/admin/tv").get_json()["settings"]
res.append(ok(s["home_cards"] == ["prayer", "calendar", "family", "memory"], f"يُحفظ بالترتيب الثابت وبلا أنواع غريبة: {s['home_cards']}"))
with app.test_request_context():
    from homenas.core import get_db
    f = tv.home_family(get_db())
res.append(ok([b["name"] for b in f["birthdays"]] == ["sara", "baba"] and f["stars"] and f["stars"][0]["name"] == "sara", f"العائلة: أقرب عيد ميلاد أولاً، ونجوم الأطفال: {f}"))
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
adm = (APP / "static/js/apps/tvadmin.js").read_text(encoding="utf-8")
res.append(ok("function layoutHome" in js and 'c.style.transition = "none"' in js and "homeCards(d, hasPrayer)" in js, "الأماكن تُحسب من الطول الحقيقي (عمودان ومكان تحت الساعة)"))
res.append(ok("nextOccasions(1)" in js and "/api/tv/media/${m.id}/thumb" in js, "التقويم مع المناسبة القادمة، والذكرى صورة من المكتبة"))
res.append(ok("home_cards: HOME_CARDS" in adm and "hc_${k}" in adm, "الاختيار في لوحة التحكم ← وضع التلفاز ← صفحة كل شخص"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
