"""البند 36: محرك التطبيقات: بعد «تثبيت» كان لا يحدث شيء وتبقى الأزرار معطلة بلا سبب."""
import json, os, subprocess, sys, tempfile, time, shutil
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
tmp = Path(tempfile.mkdtemp())
# ---- المساعد hsef-apps في وضع الاختبار
env = {**os.environ, "HSEF_APPS_FAKE": "1", "HSEF_APPS_TEST": "1", "HSEF_FAKE_NO_INTERNET": "1"}
src = (APP / "appliance/hsef-apps").read_text(encoding="utf-8")
res.append(ok("def internet_ok" in src and 'die("no-internet")' in src, "فحص الإنترنت قبل التنزيل"))
res.append(ok("wait_engine(log)" in src and 'die("not-running")' in src, "بعد التثبيت ينتظر أن يعمل المحرك فعلاً، وإلا يفشل بسبب واضح"))
res.append(ok('a == ["start-engine"]' in src and '"restart", "containerd", "docker"' in src, "أمر «تشغيل المحرك» للمحرك المثبت المتوقف"))
res.append(ok('"iptables"' in src, "iptables مع المحرك (يحتاجه docker ليعمل)"))
# ---- الواجهة
from homenas import appstore, create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
appstore.available = lambda: True
appstore.LOG_DIR = tmp / "logs"; appstore.LOG_DIR.mkdir()
state = {"check": {"docker": False, "running": False, "compose": False}, "setup": (False, "hsef-apps: no-internet")}
calls = []
def fake_helper(*args, timeout=3600):
    calls.append(args[0])
    if args[0] == "check":
        return True, json.dumps(state["check"])
    if args[0] == "status":
        return True, "{}"
    if args[0] in ("setup", "start-engine"):
        (appstore.LOG_DIR / "_engine.log").write_text("$ apt-get update\nErr: Could not resolve deb.debian.org\n[exit 1]\n")
        return state["setup"]
    return True, ""
appstore.helper = fake_helper
cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
def settle():
    for _ in range(100):
        d = c.get("/api/appstore").get_json()
        if not (d.get("engine_op") and d["engine_op"]["running"]):
            return d
        time.sleep(0.05)
    return d
r = c.post("/api/appstore/engine", json={})
d = settle()
res.append(ok(calls.count("setup") == 1, "غير مثبت ← «تثبيت»"))
res.append(ok("الإنترنت" in (d["engine"].get("why") or "") and "Could not resolve" in d["engine"].get("log", ""), f"بلا إنترنت ← رسالة مفهومة والسجل: {d['engine'].get('why')}"))
state["check"] = {"docker": True, "running": False, "compose": True, "error": "Cannot connect to the Docker daemon"}
state["setup"] = (True, "")
calls.clear(); c.post("/api/appstore/engine", json={}); settle()
res.append(ok(calls.count("start-engine") == 1 and "setup" not in calls, "مثبت ومتوقف ← «تشغيل المحرك» لا إعادة التثبيت"))
state["setup"] = (False, "hsef-apps: not-running")
c.post("/api/appstore/engine", json={}); d = settle()
res.append(ok("لا يعمل" in d["engine"].get("why", "") and d["engine"].get("error"), "يبقى متوقفاً ← السبب من docker يظهر"))
js = (APP / "static/js/apps/appstore.js").read_text(encoding="utf-8")
res.append(ok("تشغيل المحرك" in js and "eng.why" in js and "eng.log" in js, "الواجهة تعرض الحالة والسبب والسجل"))
res.append(ok("شغّل محرك التطبيقات أولاً" in js, "الأزرار المعطلة تقول لماذا"))
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/apps/appstore.js")]).returncode == 0, "appstore.js سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
