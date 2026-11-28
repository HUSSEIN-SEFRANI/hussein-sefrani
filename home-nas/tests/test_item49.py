"""البند 49: ربط اليد بضغطة واحدة، والقائمة أبسط (الأيادي أولاً)، واليد الأساسية (اللاعب 1) ثابتة في كل الألعاب."""
import importlib.machinery, importlib.util, json, os, subprocess, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
HX = APP / "appliance/hsef-extras"
env = {**os.environ, "HSEF_EXTRAS_FAKE": "1"}
r = subprocess.run([sys.executable, str(HX), "bt-pair-pad"], capture_output=True, text=True, env=env)
res.append(ok(r.returncode == 0 and json.loads(r.stdout).get("name") == "DualSense Wireless Controller", "«ربط يد جديدة»: يجد اليد ويربطها ويرجع اسمها"))
st = json.loads(subprocess.run([sys.executable, str(HX), "bt-status"], capture_output=True, text=True, env=env).stdout)
res.append(ok([d["pad"] for d in st["devices"]] == [True, False], "كل جهاز معلَّم: يد ألعاب أم لا"))
loader = importlib.machinery.SourceFileLoader("hx", str(HX))
spec = importlib.util.spec_from_loader("hx", loader); hx = importlib.util.module_from_spec(spec); loader.exec_module(hx)
names = {"DualSense Wireless Controller": True, "Wireless Controller": True, "Xbox Wireless Controller": True, "Pro Controller": True,
         "8BitDo SN30 Pro": True, "Galaxy S21": False, "JBL Flip 5": False, "Magic Keyboard": False}
res.append(ok(all(hx.is_pad({"name": n}) == v for n, v in names.items()) and hx.is_pad({"name": "?", "icon": "input-gaming"}),
              "التعرف على الأيادي: بلايستيشن، إكس بوكس، سويتش، 8BitDo (لا الهواتف والسماعات)"))
src = HX.read_text(encoding="utf-8")
res.append(ok('"--timeout", str(wait), "scan", "on"' in src and "bt_pair(found[\"mac\"])" in src and 'not d["paired"] and is_pad(d)' in src,
              "يبحث حتى تظهر يد غير مربوطة ثم يربطها فوراً (بلا سباق مع ضوء اليد)"))
# المسارات: التلفاز ولوحة التحكم
from homenas import create_app, sysadmin
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,created_at) VALUES ('baba',?,1,'adult','x')", (generate_password_hash("p"),)); db.execute("UPDATE users SET tv_pin='x'"); db.commit()
calls = []
def fake_helper(*a, **kw):
    calls.append(a[0])
    return {"mac": "AA:BB:CC:DD:EE:01", "name": "DualSense Wireless Controller"} if a[0] == "bt-pair-pad" else {"installed": True, "adapter": True, "devices": []}
sysadmin.helper = fake_helper; sysadmin.available = lambda: True
c = app.test_client()
with c.session_transaction() as s: s["tv_uid"] = 1
r = c.post("/api/tv/admin/bt/pairpad", json={})
res.append(ok(r.status_code == 200 and r.get_json()["paired"]["name"].startswith("DualSense") and "bt-pair-pad" in calls, f"التلفاز: ‎/api/tv/admin/bt/pairpad ← {r.status_code}"))
c2 = app.test_client()
with c2.session_transaction() as s: s["uid"] = 1
r2 = c2.post("/api/admin/bt/pairpad", json={})
res.append(ok(r2.status_code in (200, 401, 403), f"لوحة التحكم: ‎/api/admin/bt/pairpad موجود ({r2.status_code})"))
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
res.append(ok("function padPairScreen" in js and "/api/tv/admin/bt/pairpad" in js and "js-pairpad" in js and "أجهزة أخرى" in js,
              "التلفاز: «ربط يد جديدة» أولاً، والأيادي المربوطة، و«أجهزة أخرى» مطوية"))
res.append(ok("window.hsefPadOrder" in js and "setMainPad(g.index, true)" in js and "MAIN_KEY" in js and "padTouch(gp)" in js and "gamepaddisconnected" in js,
              "التلفاز: اليد الأساسية (أول يد، أو المختارة وتُحفظ باسمها) وترتيب اللاعبين"))
kit = (APP / "static/kit/kit.js").read_text(encoding="utf-8")
res.append(ok("window.parent.hsefPadOrder" in kit and "K.mainPad" in kit, "الألعاب تأخذ ترتيب اللاعبين من التلفاز (اللاعب 1 نفسه في كل لعبة)"))
copies = [p for p in (APP / "games").rglob("kit.js")]
res.append(ok(copies and all(p.read_bytes() == (APP / "static/kit/kit.js").read_bytes() for p in copies), f"نسخ kit.js في الألعاب ({len(copies)}) محدّثة"))
dj = (APP / "static/js/apps/device.js").read_text(encoding="utf-8")
res.append(ok('data-a="pairpad"' in dj and "devs2" in dj, "لوحة التحكم: «ربط يد جديدة» والأجهزة الأخرى مطوية"))
res.append(ok(all(subprocess.run(["node", "--check", str(APP / f)]).returncode == 0 for f in ("static/js/tv.js", "static/kit/kit.js", "static/js/apps/device.js")), "ملفات JS سليمة"))
# محاكاة منطق ترتيب اللاعبين في Node
sim = r"""
let pads=[{index:0,id:'Wired X',connected:true},{index:1,id:'DualSense',connected:true},{index:2,id:'DualSense',connected:true}];
const navigator={getGamepads:()=>pads}; const localStorage={s:{},getItem(k){return this.s[k]||null},setItem(k,v){this.s[k]=v}};
const window={};
""" + js[js.index("let PADSEEN"):js.index("const playerNo")] + r"""
padTouch(pads[1]); padTouch(pads[2]);
const a = window.hsefPadOrder().join();
setMainPad(2,true); const b = window.hsefPadOrder().join();
pads = pads.filter(p=>p.index!==2); const c = window.hsefPadOrder().join();
console.log(JSON.stringify([a,b,c,localStorage.getItem(MAIN_KEY)]));
"""
out = subprocess.run(["node", "-e", sim], capture_output=True, text=True)
v = json.loads(out.stdout or "null") if out.returncode == 0 else None
res.append(ok(v == ["1,2", "2,1", "1", "DualSense"], f"اليد السلكية المنسية لا تأخذ مكان اللاعب 1، والاختيار يغيّر الترتيب، والفصل يرجع للتالية ← {v or out.stderr[-200:]}"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
