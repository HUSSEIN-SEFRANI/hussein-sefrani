"""البند 45: أيقونات ملونة على شكل فواكه وحيوانات في «تغيير الأيقونة»."""
import json, subprocess, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
out = subprocess.run(["node", "--input-type=module", "-e",
    f"import {{FRUITS, ANIMALS, ART, artSvg}} from '{(APP / 'static/js/icon-art.js').resolve()}'; console.log(JSON.stringify({{f: Object.keys(FRUITS), a: Object.keys(ANIMALS), n: Object.keys(ART).length, svg: artSvg('cat')}}))"],
    capture_output=True, text=True)
d = json.loads(out.stdout)
res.append(ok(len(d["f"]) >= 10 and len(d["a"]) >= 10, f"{len(d['f'])} فاكهة و{len(d['a'])} حيواناً"))
res.append(ok(d["n"] == len(d["f"]) + len(d["a"]) and d["svg"].startswith('<svg class="art') and "<path" in d["svg"], "كل رسم SVG ملوّن (48×48)"))
res.append(ok(not any("<script" in v or "href" in v for v in [d["svg"]]), "بلا سكربت ولا روابط"))
# الاسم art-<..> يمر بفحص الخادم ويُحفظ
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('kid',?,0,'x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
r = c.put("/api/me/icons/files", json={"icon": "art-strawberry", "color": "linear-gradient(135deg,#fce7f3,#fbcfe8)"})
res.append(ok(r.status_code == 200 and r.get_json()["icons"]["files"]["icon"] == "art-strawberry", "«الملفات» بأيقونة فراولة على خلفية وردية فاتحة"))
core = (APP / "static/js/core.js").read_text(encoding="utf-8"); js = (APP / "static/js/desktop.js").read_text(encoding="utf-8")
res.append(ok("startsWith('art-')" in core and "glyph(l.icon)" in core and "glyph(lk.icon)" in core, "سطح المكتب وقائمة البدء والنافذة وشريط المهام ترسمها"))
res.append(ok('data-t="fruit"' in js and 'data-t="animal"' in js and "ICON_COLORS[12]" in js, "تبويبات «فواكه» و«حيوانات»، وخلفية فاتحة تلقائياً"))
css = (APP / "static/css/desktop.css").read_text(encoding="utf-8")
res.append(ok(".app-tile svg.art { width: 80%; height: 80%; stroke: none; }" in css and ".ip-icons[hidden]" in css, "الرسوم بألوانها (لا خط أبيض)، والتبويب يخفي غيره"))
res.append(ok(all(subprocess.run(["node", "--check", str(APP / f)]).returncode == 0 for f in ("static/js/core.js", "static/js/desktop.js", "static/js/icon-art.js")), "ملفات JS سليمة"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
