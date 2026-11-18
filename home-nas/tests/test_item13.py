"""اختبار البند 13 على الكود الحقيقي ببيانات مؤقتة."""
import json, shutil, sys, tempfile, time
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash

tmp = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(tmp / "data"), "port": 8099, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False)
P = Paths(cfg["data_dir"])
db = connect(P.db)
now = "2026-01-01T00:00:00"
db.execute("INSERT INTO users(username, password_hash, is_admin, created_at) VALUES ('admin', ?, 1, ?)", (generate_password_hash("x"), now))
db.execute("INSERT INTO users(username, password_hash, is_admin, created_at, tv_role) VALUES ('kid1', ?, 0, ?, 'kid')", (generate_password_hash("x"), now))
db.commit()
from homenas import tv
games = tv.share_dir(db, P, "games")
# كما على جهاز قديم: لعبة وتطبيق تعليمي في «الألعاب»، وتطبيق تعليمي داخل مجلد ZIP مفكوك
for name in ("جدول الضرب", "الأفعى"):
    shutil.copytree(APP / "games" / name, games / name)
(games / "ألعاب الأطفال").mkdir()
shutil.copytree(APP / "games" / "جغرافيا", games / "ألعاب الأطفال" / "جغرافيا")
shutil.copytree(APP / "games" / "الدبابات", games / "ألعاب الأطفال" / "الدبابات")
# مربع «ألعاب» قديم للطفل
db.execute("INSERT INTO tv_tiles(user_id,title,kind,path,icon,color,position,created_at) VALUES (2,'ألعاب','games',?, 'games','#000,#111',0,?)", (tv.GAMES_PATH, now))
db.execute("INSERT INTO tv_tiles(user_id,title,kind,path,icon,color,position,created_at) VALUES (2,'رسوم','media','/home/التلفاز/رسوم','cartoon','#000,#111',1,?)", (now,))
db.execute("DELETE FROM settings WHERE key='learn_shared_v1'"); db.commit()
tv.learn_migrate(db, P)
edu = tv.share_dir(db, P, "learn")
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
res.append(ok((edu / "جدول الضرب" / "index.html").is_file(), "جدول الضرب نُقل إلى «التعليم»"))
res.append(ok((games / "الأفعى" / "index.html").is_file(), "الأفعى بقيت في «الألعاب»"))
res.append(ok((edu / "جغرافيا" / "index.html").is_file(), "جغرافيا نُقلت من داخل مجلد ZIP المفكوك"))
res.append(ok((games / "ألعاب الأطفال" / "الدبابات" / "index.html").is_file(), "الدبابات بقيت في مكانها داخل مجلد ZIP"))
tiles = db.execute("SELECT id,title,kind,path,position FROM tv_tiles WHERE user_id=2 ORDER BY position").fetchall()
res.append(ok([t["kind"] for t in tiles] == ["games", "learn", "media"], f"مربع «التعليم» بجانب «ألعاب»: {[t['title'] for t in tiles]}"))
gid = tiles[0]["id"]; lid = tiles[1]["id"]
tv.learn_migrate(db, P)   # مرة ثانية: لا شيء
res.append(ok(db.execute("SELECT COUNT(*) FROM tv_tiles WHERE user_id=2 AND kind='learn'").fetchone()[0] == 1, "النقل يحدث مرة واحدة فقط"))

c = app.test_client()
r = c.post("/api/tv/login", json={"id": 2}); res.append(ok(r.status_code == 200, "دخول الطفل على التلفاز"))
home = c.get("/api/tv/home").get_json()
res.append(ok(any(t["kind"] == "learn" for t in home["tiles"]), "مربع التعليم يظهر في الصفحة الرئيسية"))
lst = c.get(f"/api/tv/tile/{lid}/list").get_json()
res.append(ok(sorted(x["name"] for x in lst["items"]) == ["جدول الضرب", "جغرافيا"], f"قائمة التعليم: {[x['name'] for x in lst['items']]}"))
r = c.get(f"/tv/game/{lid}/جدول الضرب/index.html"); res.append(ok(r.status_code == 200, "فتح تطبيق تعليمي"))
r = c.get(f"/tv/game/{gid}/الأفعى/index.html"); res.append(ok(r.status_code == 200, "فتح لعبة"))

def earn(ref, amount=3):
    h = {"Referer": f"http://127.0.0.1{ref}"} if ref else {}
    return c.post("/api/tv/stars/earn", json={"amount": amount, "game": "x", "reason": "اختبار"}, headers=h).get_json()
L = f"/tv/game/{lid}/%D8%AC%D8%AF%D9%88%D9%84%20%D8%A7%D9%84%D8%B6%D8%B1%D8%A8/index.html"
G = f"/tv/game/{gid}/%D8%A7%D9%84%D8%A3%D9%81%D8%B9%D9%89/index.html"
a = earn(L); res.append(ok(a["added"] == 1 and a["learn"], f"تطبيق تعليمي طلب 3 ← أُضيفت نجمة واحدة: {a}"))
b = earn(L); res.append(ok(b["added"] == 0, "طلب ثانٍ لنفس الدرس فوراً ← لا نجمة"))
g = earn(G); res.append(ok(g["added"] == 0 and not g["learn"], "لعبة ← لا نجوم"))
n = earn(None); res.append(ok(n["added"] == 0, "طلب بلا مصدر معروف ← لا نجوم"))
f = earn("/tv/game/99999/x/index.html"); res.append(ok(f["added"] == 0, "مربع ليس للطفل ← لا نجوم"))
# بعد 20 ثانية: درس جديد في نفس التطبيق
db.execute("UPDATE stars_log SET ts=? WHERE kind='learn'", (time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(time.time() - 60)),)); db.commit()
d2 = earn(L); res.append(ok(d2["added"] == 1, "درس جديد بعد دقيقة ← نجمة"))
# الحد اليومي
db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('stars_game_daily','2')"); db.commit()
db.execute("UPDATE stars_log SET ts=? WHERE kind='learn'", (time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(time.time() - 60)),)); db.commit()
d3 = earn(L); res.append(ok(d3["added"] == 0 and d3["capped"], f"الحد اليومي (2) ← لا نجمة ثالثة: today={d3['today']}"))
board = c.get("/api/tv/stars").get_json()
lg = [x for x in board["log"] if x["kind"] == "learn"]
res.append(ok(len(lg) == 2 and not lg[0]["reason"].startswith("["), f"السجل: {[x['reason'] for x in lg]}"))

# «تعلّم ثم العب»: التعليمي من المجلد
from homenas import kids
with app.test_request_context():
    from flask import g as fg
    res.append(ok(kids.learn_games() == {"جدول الضرب", "جغرافيا"}, f"learn_games من المجلد: {kids.learn_games()}"))
    res.append(ok(set(kids.installed_games()) == {"جدول الضرب", "جغرافيا", "الأفعى", "ألعاب الأطفال"}, f"installed: {kids.installed_games()}"))
db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('kids_rules', ?)", (json.dumps({"2": {"play": 30, "learn": 10}}),)); db.commit()
chk = c.get("/api/tv/play/check?game=الأفعى").get_json()
res.append(ok(chk["allowed"] is False and chk.get("learn_tile") == lid, f"تعلّم أولاً ← يقترح مربع التعليم: {chk}"))

# المدير
ca = app.test_client()
with ca.session_transaction() as s:
    u = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()
    s["uid"] = 1; s["pwv"] = u["password_hash"][-12:]
r = ca.get("/api/admin/tv/apps"); d = r.get_json()
res.append(ok(r.status_code == 200 and [x["name"] for x in d["learn"]] == ["جدول الضرب", "جغرافيا"], f"قائمة المدير: games={[x['name'] for x in d['games']]} learn={[x['name'] for x in d['learn']]}"))
r = ca.post("/api/admin/tv/apps/move", json={"name": "الأفعى", "to": "learn"}); d = r.get_json()
res.append(ok(r.status_code == 200 and (edu / "الأفعى").is_dir() and json.loads((edu / "الأفعى" / "app.json").read_text())["type"] == "education", "نقل الأفعى إلى التعليم + app.json"))
r = ca.post("/api/admin/tv/apps/move", json={"name": "الأفعى", "to": "games"})
res.append(ok(r.status_code == 200 and (games / "الأفعى").is_dir() and json.loads((games / "الأفعى" / "app.json").read_text())["type"] == "game", "إرجاعها إلى الألعاب"))
r = ca.post("/api/admin/tv/apps/move", json={"name": "../x", "to": "games"}); res.append(ok(r.status_code == 400, "اسم غير آمن مرفوض"))
r = ca.post("/api/admin/tv/apps/move", json={"name": "الأفعى", "to": "games"}); res.append(ok(r.status_code == 404, "نقل إلى نفس المكان ← غير موجود"))
r = ca.post("/api/admin/tv/users/2/tiles", json={"title": "تعليم ٢", "kind": "learn"}); res.append(ok(r.status_code == 200 and r.get_json()["path"] == tv.EDU_PATH, "إنشاء مربع تعليم جديد يستعمل المجلد المشترك"))
r = ca.post("/api/kids/settings", json={"learn_games": ["جدول الضرب", "جغرافيا", "الأفعى"]})
res.append(ok(r.status_code == 200 and (edu / "الأفعى").is_dir(), "اختيار «تعليمي» من تطبيق العائلة ينقل التطبيق"))
s = ca.get("/api/kids/settings").get_json()
res.append(ok({x["name"] for x in s["games"] if x["learn"]} == {"جدول الضرب", "جغرافيا", "الأفعى"}, "تطبيق العائلة يقرأ من المجلد"))
print(f"\n{sum(res)}/{len(res)} نجح")
shutil.rmtree(tmp)
sys.exit(0 if all(res) else 1)
