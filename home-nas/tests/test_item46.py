"""البند 46: تطبيق «الرسائل» على التلفاز: خدمة /api/tv/letters، والملفات في مجلد كل فرد، ومربع في القائمة الرئيسية."""
import json, subprocess, sys, tempfile, shutil, io
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
for n, adm, role in (("baba", 1, "adult"), ("sara", 0, "kid"), ("off", 0, "none")):
    db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,created_at) VALUES (?,?,?,?,'x')", (n, generate_password_hash("p"), adm, role))
db.commit()
def tv(uid):
    c = app.test_client()
    with c.session_transaction() as s: s["tv_uid"] = uid
    return c
baba, sara = tv(1), tv(2)
PDF = b"%PDF-1.4\n% letter\n" + b"x" * 2000
def send(c, to, subject="عيد سعيد", name="رسالة من بابا إلى سارة - عيد سعيد 2026-11-19", save=False):
    return c.post("/api/tv/letters/send" + ("?save=1" if save else ""), data={"meta": json.dumps({"to": to, "subject": subject, "body": "أحبك", "name": name}),
                  "pdf": (io.BytesIO(PDF), "letter.pdf")}, content_type="multipart/form-data")
r = send(baba, 2)
res.append(ok(r.status_code == 200 and r.get_json()["folder"] == "تلفاز/تطبيقات/الرسائل/الصادر", f"إرسال رسالة من بابا إلى سارة ← {r.get_json()}"))
inbox = sara.get("/api/tv/letters?box=in").get_json()
m = inbox["letters"][0] if inbox["letters"] else {}
res.append(ok(inbox["unread"] == 1 and m.get("from", {}).get("id") == 1 and m.get("to", {}).get("id") == 2 and m.get("subject") == "عيد سعيد" and not m.get("read"),
              "وصلت إلى «الوارد» عند سارة: جديدة، من بابا، بموضوعها"))
out = baba.get("/api/tv/letters?box=out").get_json()
res.append(ok(len(out["letters"]) == 1 and out["letters"][0]["read"] and out["unread"] == 0, "وعند بابا في «الصادر»"))
f_in = P.homes / "sara" / "تلفاز/تطبيقات/الرسائل/الوارد" / "رسالة من بابا إلى سارة - عيد سعيد 2026-11-19.pdf"
f_out = P.homes / "baba" / "تلفاز/تطبيقات/الرسائل/الصادر" / f_in.name
res.append(ok(f_in.read_bytes() == PDF and f_out.read_bytes() == PDF, "ملف PDF في مجلد كل فرد (يظهر في «الملفات» وقرص الشبكة)"))
r = send(baba, 2, name="../../etc/x:y*?")
res.append(ok(r.status_code == 200 and not (T / "etc").exists() and any(p.name.startswith("..") is False for p in (P.homes / "sara" / "تلفاز/تطبيقات/الرسائل/الوارد").iterdir()),
              "اسم ملف خطير يُنظَّف ويبقى داخل الصندوق"))
res.append(ok(send(baba, 3).status_code == 400, "لا رسائل لحساب ليس على التلفاز"))
bad = baba.post("/api/tv/letters/send", data={"meta": json.dumps({"to": 2}), "pdf": (io.BytesIO(b"<html>"), "x.pdf")}, content_type="multipart/form-data")
res.append(ok(bad.status_code == 400, "ملف ليس PDF ← مرفوض"))
r = send(sara, None, save=True)
res.append(ok(r.status_code == 200 and len(sara.get("/api/tv/letters?box=saved").get_json()["letters"]) == 1, "«احفظها عندي» ← المحفوظة"))
# المربع في القائمة الرئيسية وعدد الجديدة
home = sara.get("/api/tv/home").get_json()
t = next((x for x in home["tiles"] if x["id"] == "letters"), None)
res.append(ok(t and t["kind"] == "messages" and t["icon"] == "mail" and t["count"] == 2, f"مربع «الرسائل» في القائمة الرئيسية وعليه {t and t.get('count')} جديدة"))
sara.post(f"/api/tv/letters/{m['id']}/read")
res.append(ok(sara.get("/api/tv/letters?box=in").get_json()["unread"] == 1, "«قُرئت» ينقص العدد"))
res.append(ok(baba.post(f"/api/tv/letters/{m['id']}/read").status_code == 404, "لا يستطيع أحد لمس رسائل غيره"))
r = sara.post(f"/api/tv/letters/{m['id']}/delete?box=in")
res.append(ok(r.status_code == 200 and not f_in.exists() and any((P.homes / "sara" / "#recycle").glob("*.pdf")) and f_out.exists(),
              "الحذف من صندوقي فقط، والملف إلى سلة المحذوفات، ونسخة بابا باقية"))
res.append(ok(app.test_client().get("/api/tv/letters?box=in").status_code == 401, "بلا اختيار شخص على التلفاز ← ممنوع"))
# التطبيق نفسه مدمج
idx = baba.get("/tv/letters/"); kit = baba.get("/tv/letters/kit.js")
res.append(ok(idx.status_code == 200 and "game.js" in idx.get_data(as_text=True) and kit.status_code == 200 and baba.get("/tv/letters/../letters.py").status_code == 404,
              "التطبيق يُخدم من النظام على ‎/tv/letters/ (و kit.js من static/kit)"))
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
res.append(ok('t.kind === "messages") appScreen("/tv/letters/"' in js and "tcount" in js, "المربع يفتح التطبيق، والعدد يظهر عليه"))
g = (APP / "static/tvapps/letters/game.js").read_text(encoding="utf-8")
res.append(ok("1.9.12" in g and "1.9.11" not in g, "رسالة «حدّث الجهاز» تذكر 1.9.12"))
res.append(ok(all(subprocess.run(["node", "--check", str(APP / f)]).returncode == 0 for f in ("static/js/tv.js", "static/js/tv-art.js", "static/tvapps/letters/game.js")), "ملفات JS سليمة"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
