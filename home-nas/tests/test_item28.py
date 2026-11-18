import io, os, sys, tempfile, shutil, zipfile, json
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
def z(files):
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as zf:
        for n, d in files.items(): zf.writestr(n, d)
    b.seek(0); return b
up = lambda data: c.post("/api/admin/tv/apps/upload", data=data, content_type="multipart/form-data")
r = up({"to": "games", "files": (z({"2048/index.html": "<h1>2048</h1>", "2048/js/a.js": "x"}), "2048.zip")})
g = P.shares / "الألعاب" / "2048"
res.append(ok(r.status_code == 200 and (g / "index.html").is_file() and json.loads((g / "app.json").read_text())["type"] == "game", "ZIP (التطبيق داخل مجلد) ← «الألعاب/2048» مع app.json"))
r = up({"to": "learn", "files": [(io.BytesIO(b"<h1>x</h1>"), "index.html"), (io.BytesIO(b"y"), "img/a.png")], "paths": ["الحروف/index.html", "الحروف/img/a.png"]})
e = P.shares / "التعليم" / "الحروف"
res.append(ok(r.status_code == 200 and (e / "img" / "a.png").is_file() and json.loads((e / "app.json").read_text())["type"] == "education", "مجلد كامل ← «التعليم/الحروف» تعليمي"))
r = up({"to": "games", "files": (z({"readme.txt": "x"}), "bad.zip")}); res.append(ok(r.status_code == 400 and "index.html" in r.get_json()["error"], "بلا index.html: رسالة واضحة"))
r = up({"to": "games", "files": (z({"../../evil/index.html": "x", "index.html": "ok"}), "evil.zip")})
res.append(ok(not (P.shares / "evil").exists() and not (P.data / "evil").exists(), "مسارات خارج المجلد (..) تُتجاهل"))
r = up({"to": "games", "files": (z({"index.html": "v2"}), "2048.zip")}); res.append(ok(r.status_code == 409, "الاسم موجود: يسأل عن الاستبدال"))
r = up({"to": "games", "replace": "1", "files": (z({"index.html": "v2"}), "2048.zip")}); res.append(ok(r.status_code == 200 and (g / "index.html").read_text() == "v2", "الاستبدال"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
