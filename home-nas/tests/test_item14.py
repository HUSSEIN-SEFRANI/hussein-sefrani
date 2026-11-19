import json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]); REPO = APP.parent; sys.path.insert(0, str(APP))
from homenas import create_app, tv
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at,tv_role) VALUES ('kid',?,0,'x','kid')", (generate_password_hash("x"),)); db.commit()
games = tv.share_dir(db, P, "games")
old = games / "قديمة"; old.mkdir()
(old / "index.html").write_text("<html></html>")
(old / "kit.js").write_bytes(subprocess.run(["git", "-C", str(REPO), "show", "7921c03:home-nas/games/لعبة الذاكرة/kit.js"], capture_output=True).stdout)
(old / "kit.css").write_bytes(subprocess.run(["git", "-C", str(REPO), "show", "7921c03:home-nas/games/لعبة الذاكرة/kit.css"], capture_output=True).stdout)
own = games / "خاصة"; own.mkdir(); (own / "index.html").write_text("x"); (own / "kit.js").write_text("// my own kit\nconsole.log(1)")
db.execute("INSERT INTO tv_tiles(user_id,title,kind,path,icon,color,position,created_at) VALUES (1,'ألعاب','games',?, 'games','#000,#111',0,'x')", (tv.GAMES_PATH,)); db.commit()
tid = db.execute("SELECT id FROM tv_tiles").fetchone()[0]
c = app.test_client(); c.post("/api/tv/login", json={"id": 1})
res.append(ok(b"lessonDone" not in (old / "kit.js").read_bytes(), "اللعبة على القرص فيها kit.js القديم (1.9.4)"))
r = c.get(f"/tv/game/{tid}/قديمة/kit.js"); res.append(ok(r.status_code == 200 and b"K.lessonDone" in r.data and b"K.carry" in r.data, "السيرفر يعطيها kit.js الجديد"))
r = c.get(f"/tv/game/{tid}/قديمة/kit.css"); res.append(ok(r.status_code == 200 and b".lesson-star" in r.data, "و kit.css الجديد"))
r = c.get(f"/tv/game/{tid}/خاصة/kit.js"); res.append(ok(r.data.startswith(b"// my own kit"), "لعبة لها نسختها الخاصة تبقى على نسختها"))
r = c.get(f"/tv/game/{tid}/قديمة/index.html"); res.append(ok(r.data == b"<html></html>", "باقي الملفات من مجلد اللعبة كما هي"))
same = (APP / "static/kit/kit.js").read_bytes() == (APP / "games/_kit/kit.js").read_bytes() and (APP / "static/kit/kit.css").read_bytes() == (APP / "games/_kit/kit.css").read_bytes()
res.append(ok(same, "static/kit مطابقة لـ games/_kit"))
wf = (REPO / ".github/workflows/homenas-iso.yml").read_text()
res.append(ok("static" not in " ".join(re.findall(r"--exclude=\S+", wf)), "حزمة التحديث تحمل static/kit (والألعاب نفسها منذ البند 47)"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
