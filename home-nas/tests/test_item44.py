"""البند 44: زر أيمن على أيقونة في سطح المكتب ← تغيير الأيقونة (رمز ولون أو صورة)، لكل مستخدم."""
import io, os, subprocess, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
from PIL import Image
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
for n, adm in (("baba", 1), ("kid", 0)):
    db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES (?,?,?,'x')", (n, generate_password_hash("p"), adm))
db.commit()
def client(uid):
    c = app.test_client()
    with c.session_transaction() as s: s["uid"] = uid; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=?", (uid,)).fetchone()[0][-12:]
    return c
c, k = client(1), client(2)
G = "linear-gradient(135deg,#10b981,#059669)"
r = c.put("/api/me/icons/appstore", json={"icon": "grid", "color": G})
res.append(ok(r.status_code == 200 and r.get_json()["icons"]["appstore"] == {"icon": "grid", "color": G}, "تغيير رمز «مركز التطبيقات» ولونه"))
html = c.get("/").get_data(as_text=True)
res.append(ok('"appstore": {"color": "' + G + '", "icon": "grid"}' in html or ('"appstore":' in html and '"icon": "grid"' in html), "الصفحة تحمل الأيقونات المختارة (ME.icons)"))
res.append(ok(k.get("/api/me/look").get_json()["icons"] == {}, "أيقونات كل مستخدم له وحده"))
for bad in ('red;background:url(x)', 'red" onmouseover="x', "expression(alert(1))", "url(http://x/y.png)"):
    res.append(ok(c.put("/api/me/icons/appstore", json={"color": bad}).status_code == 400, f"لون مرفوض: {bad!r}"))
res.append(ok(c.put("/api/me/icons/..%2Fx", json={"icon": "grid"}).status_code in (400, 404), "اسم برنامج غير صالح مرفوض"))
res.append(ok(c.put("/api/me/icons/files", json={"icon": "<svg>"}).status_code == 400, "رمز غير صالح مرفوض"))
b = io.BytesIO(); Image.new("RGB", (640, 400), (200, 30, 90)).save(b, "PNG"); b.seek(0)
r = c.post("/api/me/icons/x-frigate/image", data={"image": (b, "me.png")}, content_type="multipart/form-data")
res.append(ok(r.status_code == 200 and "img" in r.get_json()["icons"]["x-frigate"], "رفع صورة أيقونة (لتطبيق من المركز)"))
img = c.get("/api/me/icons/x-frigate/image")
res.append(ok(img.status_code == 200 and Image.open(io.BytesIO(img.data)).size == (256, 256), "الصورة قُصّت مربعاً 256×256"))
res.append(ok(k.get("/api/me/icons/x-frigate/image").status_code == 404, "ولا يراها مستخدم آخر"))
r = c.put("/api/me/icons/x-frigate", json={"icon": "video"})
res.append(ok(r.get_json()["icons"]["x-frigate"] == {"icon": "video"} and c.get("/api/me/icons/x-frigate/image").status_code == 404, "اختيار رمز بعد الصورة يحذف الصورة"))
r = c.delete("/api/me/icons/appstore")
res.append(ok("appstore" not in r.get_json()["icons"], "«الأيقونة الأصلية»"))
js = (APP / "static/js/desktop.js").read_text(encoding="utf-8"); core = (APP / "static/js/core.js").read_text(encoding="utf-8")
res.append(ok("oncontextmenu" in js and "تغيير الأيقونة…" in js and "الأيقونة الأصلية" in js, "زر أيمن على الأيقونة: «تغيير الأيقونة…» و«الأيقونة الأصلية»"))
res.append(ok("${tileHTML(app, 'sm')}" in core and "appLook(app)" in core, "الأيقونة الجديدة في عنوان النافذة وشريط المهام أيضاً"))
res.append(ok(all(subprocess.run(["node", "--check", str(APP / f)]).returncode == 0 for f in ("static/js/core.js", "static/js/desktop.js")), "ملفات JS سليمة"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
