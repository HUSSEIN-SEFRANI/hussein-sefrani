"""حفظ الألعاب في مجلد اللاعب (لعبة المزارع): /api/tv/gamesave يكتب في <المجلد الشخصي>/تلفاز/تطبيقات/<اللعبة>/حفظ.json."""
import json, shutil, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
now = "2026-01-01T00:00:00"
for n in ("sara", "omar"):
    db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,created_at) VALUES (?,?,0,'kid',?)", (n, generate_password_hash("p"), now))
db.commit()
from homenas import tv
games = tv.share_dir(db, P, "games")
shutil.copytree(APP / "games" / "لعبة المزارع", games / "لعبة المزارع")
for uid in (1, 2):
    db.execute("INSERT INTO tv_tiles(user_id,title,kind,path,icon,color,position,created_at) VALUES (?,'ألعاب','games',?,'games','#000,#111',0,?)", (uid, tv.GAMES_PATH, now))
db.commit()
tiles = {r["user_id"]: r["id"] for r in db.execute("SELECT id,user_id FROM tv_tiles")}
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
def kid(uid):
    c = app.test_client()
    c.post("/api/tv/login", json={"id": uid})
    ref = {"Referer": f"http://127.0.0.1/tv/game/{tiles[uid]}/%D9%84%D8%B9%D8%A8%D8%A9%20%D8%A7%D9%84%D9%85%D8%B2%D8%A7%D8%B1%D8%B9/index.html"}
    return c, ref
sara, H1 = kid(1)
omar, H2 = kid(2)
r = sara.get("/api/tv/gamesave", headers=H1).get_json()
res.append(ok(r["data"] is None and r["folder"] == "تلفاز/تطبيقات/لعبة المزارع", f"أول مرة: لا حفظ ← {r}"))
farm = {"farms": [{"av": "👧", "coins": 99, "tiles": [{"o": 1}]}], "cur": 0, "ts": 1}
r = sara.put("/api/tv/gamesave", data=json.dumps(farm, ensure_ascii=False).encode(), headers={**H1, "Content-Type": "application/json"})
f = P.homes / "sara" / "تلفاز/تطبيقات/لعبة المزارع/حفظ.json"
res.append(ok(r.status_code == 200 and json.loads(f.read_text("utf-8")) == farm, "الحفظ في مجلد سارة: تلفاز/تطبيقات/لعبة المزارع/حفظ.json"))
res.append(ok(sara.get("/api/tv/gamesave", headers=H1).get_json()["data"] == farm, "سارة تقرأ مزرعتها"))
res.append(ok(omar.get("/api/tv/gamesave", headers=H2).get_json()["data"] is None, "عمر لا يرى مزرعة سارة (لكل لاعب مزرعته)"))
farm2 = dict(farm, ts=2)
sara.put("/api/tv/gamesave", json=farm2, headers=H1)
prev = f.with_name("حفظ.السابق.json")
res.append(ok(json.loads(prev.read_text("utf-8")) == farm and json.loads(f.read_text("utf-8")) == farm2, "النسخة السابقة تبقى في حفظ.السابق.json"))
f.write_text("{bad", "utf-8")
res.append(ok(sara.get("/api/tv/gamesave", headers=H1).get_json()["data"] == farm, "ملف تالف ← تُقرأ النسخة السابقة"))
res.append(ok(sara.put("/api/tv/gamesave", data=b"[1,2]", headers={**H1, "Content-Type": "application/json"}).status_code == 400, "ليس كائن JSON ← 400"))
res.append(ok(sara.put("/api/tv/gamesave", data=b"{" + b" " * (1024 * 1024 + 10) + b"}", headers={**H1, "Content-Type": "application/json"}).status_code == 413, "أكبر من 1MB ← 413"))
res.append(ok(sara.get("/api/tv/gamesave").status_code == 400, "بلا صفحة لعبة (Referer) ← 400"))
bad = {"Referer": f"http://127.0.0.1/tv/game/{tiles[2]}/x/index.html"}
res.append(ok(sara.get("/api/tv/gamesave", headers=bad).status_code == 400, "مربع طفل آخر ← لا تُعرف اللعبة"))
res.append(ok(sara.get("/api/tv/gamesave?key=../x", headers=H1).status_code == 400, "مفتاح خطير ← 400"))
evil = {"Referer": f"http://127.0.0.1/tv/game/{tiles[1]}/..%2F..%2Fetc/index.html"}
sara.put("/api/tv/gamesave", json={"a": 1}, headers=evil)
res.append(ok(not (T / "d" / "etc").exists() and not any((P.homes / "sara").glob("**/etc")), "مسار لعبة خطير لا يخرج من المجلد"))
nobody = app.test_client()
res.append(ok(nobody.get("/api/tv/gamesave", headers=H1).status_code == 401, "بلا لاعب مختار على التلفاز ← 401 (اللعبة تحفظ في المتصفح)"))
print(f"{sum(res)}/{len(res)} نجح")
