"""البند 42: رفع ملف تطبيق من صنع صاحب الجهاز إلى مركز التطبيقات."""
import io, json, os, subprocess, sys, tempfile, shutil, zipfile
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
T = Path(tempfile.mkdtemp())
os.environ.update(HSEF_APPS_TEST="1", HSEF_APPS_CATALOG=str(APP / "apps/catalog.json"), HSEF_APPS_LOGS=str(T / "logs"),
                  HSEF_APPS_CUSTOM=str(T / "custom"), HSEF_APPS_DIR=str(T / "apps"), HSEF_APPS_OPTIONS=str(T / "opts"))
(T / "logs").mkdir()
from homenas import appstore, create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
appstore.available = lambda: True
appstore.CUSTOM_DIR = T / "custom"
def helper(*args, timeout=3600):   # المساعد الحقيقي hsef-apps (وضع الاختبار)
    if args[0] in ("custom-add", "custom-remove"):
        r = subprocess.run([sys.executable, str(APP / "appliance/hsef-apps"), *args], capture_output=True, text=True)
        return r.returncode == 0, (r.stdout if r.returncode == 0 else r.stderr).strip()
    if args[0] == "check":
        return True, json.dumps({"docker": True, "running": True, "compose": True})
    return True, "{}"
appstore.helper = helper
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("pass1234"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
COMPOSE = 'services:\n  app:\n    image: nginx:alpine\n    ports:\n      - "{{port}}:80"\n    volumes:\n      - "{{data}}:/usr/share/nginx/html"\n      - "{{folder:docs}}:/docs:ro"\n    restart: unless-stopped\n'
def pkg(app_json, compose=COMPOSE, sub="ملاحظاتي/"):
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        z.writestr(sub + "app.json", json.dumps(app_json, ensure_ascii=False)); z.writestr(sub + "compose.yaml", compose)
    b.seek(0); return b
A = {"id": "mynotes", "name": "ملاحظاتي", "port": 8099, "summary": "ملاحظات العائلة", "folders": [{"key": "docs", "label": "المستندات"}]}
up = lambda f, pw="pass1234", name="app.zip": c.post("/api/appstore/custom", data={"file": (f, name), "password": pw}, content_type="multipart/form-data")
r = up(pkg(A), pw="bad")
res.append(ok(r.status_code == 403, "كلمة مرور خاطئة ← مرفوض"))
r = up(pkg(A))
res.append(ok(r.status_code == 200 and r.get_json()["name"] == "ملاحظاتي", f"رفع ZIP (app.json + compose.yaml داخل مجلد) ← أُضيف: {r.get_json()}"))
d = c.get("/api/appstore").get_json()
mine = next((a for a in d["apps"] if a["id"] == "mynotes"), None)
res.append(ok(mine and mine["custom"] and mine["category"] == "custom" and mine["port"] == 8099 and mine["folders"][0]["key"] == "docs",
              "يظهر في المركز كتطبيق «من صنعك» بمجلده ومنفذه"))
r = up(pkg({**A, "id": "evil"}, COMPOSE.replace("restart:", "privileged: true\n    restart:")))
res.append(ok(r.status_code == 400 and "سيطرة على الجهاز" in r.get_json()["error"], f"privileged ← مرفوض: {r.get_json()['error']}"))
r = up(pkg({**A, "id": "evil2"}, COMPOSE.replace('"{{data}}:', '"/etc:')))
res.append(ok(r.status_code == 400 and "مسارات" not in "" and "host path" in r.get_json()["error"], f"مسار من الجهاز ← مرفوض: {r.get_json()['error']}"))
r = up(pkg({**A, "id": "jellyfin"}))
res.append(ok(r.status_code == 400 and "مستعمل" in r.get_json()["error"], "رقم تطبيق من المركز ← مرفوض"))
r = up(io.BytesIO(json.dumps({**A, "id": "single", "compose": COMPOSE}).encode()), name="app.json")
res.append(ok(r.status_code == 200, "ملف app.json وحده (فيه compose) مقبول"))
r = up(io.BytesIO(b"not a zip"))
res.append(ok(r.status_code == 400 and "ZIP" in r.get_json()["error"], "ملف غير صالح ← رسالة واضحة"))
r = c.delete("/api/appstore/custom/single")
res.append(ok(r.status_code == 200 and not (T / "custom/single.json").exists(), "حذف التطبيق المرفوع من المركز"))
res.append(ok(c.delete("/api/appstore/custom/jellyfin").status_code == 400, "لا يُحذف تطبيق من تطبيقات المركز الأصلية"))
# المساعد يرى التطبيق المرفوع عند التثبيت (render بالمتغيرات)
import runpy
g = runpy.run_path(str(APP / "appliance/hsef-apps"), run_name="nomain")
a = g["catalog"]()["mynotes"]
(T / "share").mkdir()
g["safe_folder"].__globals__["ALLOWED_ROOTS"] = (str(T) + "/",)
txt = g["render"](a, {"port": 8099, "folders": {"docs": str(T / "share")}})
res.append(ok('"8099:80"' in txt and str(T / "share") in txt and "{{" not in txt, "التثبيت يملأ المتغيرات ({{port}} و{{data}} و{{folder:docs}})"))
js = (APP / "static/js/apps/appstore.js").read_text(encoding="utf-8")
res.append(ok("أضف تطبيقك" in js and "['custom', 'من صنعي']" in js and "removeCustom" in js, "الواجهة: زر «أضف تطبيقك» وتصنيف «من صنعي» والحذف"))
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/apps/appstore.js")]).returncode == 0, "appstore.js سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
