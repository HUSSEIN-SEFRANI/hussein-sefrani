"""البند 65: حفظ شحن القبضات: تُطفأ قبضات البلوتوث بعد مدة بلا لعب (أو بزر)، وتبقى مربوطة."""
import os, subprocess, sys, tempfile, json
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
os.environ["HSEF_EXTRAS_FAKE"] = "1"
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
ex = (APP / "appliance/hsef-extras").read_text(encoding="utf-8")
fn = ex.split("def bt_pads_off():")[1].split("\ndef ")[0]
res.append(ok('"disconnect"' in fn and 'd["connected"] and is_pad(d)' in fn and '"remove"' not in fn and '"untrust"' not in fn, "تفصل القبضات الموصولة فقط (disconnect)، فتبقى مربوطة ولا تُحذف"))
r = subprocess.run([sys.executable, str(APP / "appliance/hsef-extras"), "bt-pads-off"], capture_output=True, text=True, env={**os.environ, "HSEF_EXTRAS_FAKE": "1"})
res.append(ok(json.loads(r.stdout or "{}").get("off") == ["DualSense Wireless Controller"], f"الأمر bt-pads-off: {r.stdout.strip()}"))
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,created_at) VALUES ('baba',?,1,'adult','x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client(); c.post("/login", data={"username": "baba", "password": "p"})
s0 = c.get("/api/admin/tv").get_json()["settings"]["pad_sleep"]
c.post("/api/admin/tv/settings", json={"pad_sleep": 999})
s1 = c.get("/api/admin/tv").get_json()["settings"]["pad_sleep"]
res.append(ok(s0 == 15 and s1 == 240, f"الإعداد: افتراضياً 15 دقيقة، وحده الأعلى 240 ({s0}، {s1})"))
res.append(ok(app.test_client().post("/api/tv/pads/off", json={}).status_code in (401, 403), "الإطفاء من التلفاز فقط (لا يُطلب من خارج جلسة التلفاز)"))
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
res.append(ok("padSeen" in js and "settings?.pad_sleep" in js and "padSlept = true" in js and 'class="btn f js-off"' in js, "التلفاز يعدّ الدقائق بلا لعب في كل الأيادي، مرة واحدة، وزر «أطفئ القبضات الآن»"))
adm = (APP / "static/js/apps/tvadmin.js").read_text(encoding="utf-8")
res.append(ok('name="pad_sleep"' in adm and "pad_sleep: +f('pad_sleep').value" in adm, "المدة في لوحة التحكم ← وضع التلفاز ← المظهر"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
