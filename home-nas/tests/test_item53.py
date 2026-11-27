"""البند 53: تقدّم الطفل يتبع اللعبة باسمها أينما كان مجلدها، وزر «إزالة الألعاب المكررة» (إلى سلة المحذوفات)."""
import json, subprocess, sys, tempfile, time
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import create_app
from homenas.core import connect, Paths, RECYCLE
from werkzeug.security import generate_password_hash
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
for n, adm, role in (("baba", 1, "adult"), ("sara", 0, "kid"), ("omar", 0, "kid")):
    db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,created_at) VALUES (?,?,?,?,'x')", (n, generate_password_hash("p"), adm, role))
db.commit()
def tv(uid):
    c = app.test_client()
    with c.session_transaction() as s: s["tv_uid"] = uid
    return c
sara, omar = tv(2), tv(3)
get = lambda c, k: c.get("/api/tv/save", query_string={"key": k}).get_json()

# ------------------------------------------------------------------ التقدّم يتبع اللعبة باسمها
TOP, ZIP, LEARN = "hurufi:حروفي العربية", "hurufi:الألعاب-22/حروفي العربية", "hurufi:حروفي العربية"
sara.put("/api/tv/save", json={"key": ZIP, "value": {"level": 7}})
res.append(ok(get(sara, TOP).get("value") == {"level": 7}, "النسخة المباشرة بلا تقدّم ← تأخذ تقدّم النسخة داخل «الألعاب-22» (نفس اللعبة)"))
time.sleep(1.1)
sara.put("/api/tv/save", json={"key": TOP, "value": {"level": 8}})
res.append(ok(get(sara, ZIP).get("value") == {"level": 8} and get(sara, TOP).get("value") == {"level": 8}, "الأحدث يفوز في كل النسخ (لعب في نسخة ثم في أخرى)"))
res.append(ok(get(omar, TOP) == {"found": False}, "لكل طفل تقدّمه وحده"))
res.append(ok(get(sara, "hurufi:الحروف المتساقطة").get("found") is False and get(sara, "other:حروفي العربية").get("found") is False,
              "لعبة أخرى (اسم مجلد أو اسم حفظ مختلف) لا تأخذ هذا التقدّم"))
sara.put("/api/tv/save", json={"key": "a_b:لعبة", "value": {"x": 1}})
res.append(ok(get(sara, "aXb:لعبة").get("found") is False, "الرموز % و_ في اسم الحفظ لا تخلط الألعاب"))

# ------------------------------------------------------------------ إزالة الألعاب المكررة
from homenas.tv import share_dir
games, learn = share_dir(db, P, "games"), share_dir(db, P, "learn")
def mkapp(d: Path, typ=None, txt="x"):
    d.mkdir(parents=True, exist_ok=True); (d / "index.html").write_text(txt)
    if typ: (d / "app.json").write_text(json.dumps({"name": d.name, "type": typ}))
mkapp(learn / "حروفي العربية", "education", "new")            # حيث يضعها النظام (تعليمية)
mkapp(games / "الألعاب-22" / "حروفي العربية", "education")      # نسخة قديمة من ملف ZIP
mkapp(games / "حروفي العربية" / "حروفي العربية", "education")   # نسخة داخل مجلد بالاسم نفسه
mkapp(games / "الألعاب-22" / "الأفعى", "game")                  # لعبة وحيدة (لا تُمس)
mkapp(games / "التلوين", "game"); mkapp(games / "قديم" / "التلوين", "game")
(games / "قديم" / "صورة.txt").write_text("ملف آخر")               # مجلد فيه شيء آخر لا يُحذف
admin = app.test_client()
with admin.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
d = admin.get("/api/admin/tv/apps/dupes").get_json()["dupes"]
byname = {x["name"]: x for x in d}
res.append(ok(set(byname) == {"حروفي العربية", "التلوين"}, f"يجد المكرر فقط ← {sorted(byname)}"))
h = byname.get("حروفي العربية", {})
res.append(ok(h.get("keep") == "التعليم/حروفي العربية" and sorted(h.get("remove", [])) == ["الألعاب/الألعاب-22/حروفي العربية", "الألعاب/حروفي العربية"],
              "يُبقي النسخة المباشرة في المجلد الذي يقوله نوعها (التعليم)، والباقي إلى السلة"))
res.append(ok(byname.get("التلوين", {}).get("keep") == "الألعاب/التلوين", "يفضّل النسخة المباشرة على نسخة داخل مجلد آخر"))
res.append(ok(app.test_client().get("/api/admin/tv/apps/dupes").status_code in (401, 403), "للمدير فقط"))
r = admin.post("/api/admin/tv/apps/dupes", json={}).get_json()
res.append(ok(len(r["moved"]) == 3 and (learn / "حروفي العربية" / "index.html").read_text() == "new"
              and not (games / "حروفي العربية").exists() and (games / "الألعاب-22" / "الأفعى").is_dir() and (games / "التلوين").is_dir(),
              f"ينقل 3 نسخ ويُبقي اللعبة الوحيدة والنسخ المختارة ← {r['moved']}"))
rec = sorted(p.name for p in (games / RECYCLE).iterdir()) if (games / RECYCLE).is_dir() else []
res.append(ok(rec == ["التلوين", "حروفي العربية", "حروفي العربية (" + rec[-1].split("(", 1)[-1]] if len(rec) == 3 else False,
              f"النسخ في سلة المحذوفات (تُسترجع) ← {rec}"))
res.append(ok((games / "قديم" / "صورة.txt").is_file() and (games / "الألعاب-22").is_dir(), "مجلد فيه ملفات أخرى أو ألعاب أخرى يبقى"))
res.append(ok(admin.get("/api/admin/tv/apps/dupes").get_json()["dupes"] == [], "بعدها: لا مكرر"))
res.append(ok(get(sara, "hurufi:حروفي العربية").get("value") == {"level": 8}, "تقدّم سارة باقٍ في النسخة التي بقيت"))
js = (APP / "static/js/apps/tvadmin.js").read_text(encoding="utf-8")
res.append(ok("data-x=dupes" in js and "/api/admin/tv/apps/dupes" in js and subprocess.run(["node", "--check", str(APP / "static/js/apps/tvadmin.js")]).returncode == 0,
              "زر «إزالة الألعاب المكررة» في بطاقة التطبيقات (مع عرض ما سيُنقل قبل التنفيذ)"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
