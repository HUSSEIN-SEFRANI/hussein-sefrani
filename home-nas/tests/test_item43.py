"""البند 43: صناديق «الرسائل» في مجلد كل فرد: تلفاز/تطبيقات/الرسائل/{الوارد,الصادر,المحفوظة}."""
import io, json, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
tmp = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(tmp / "data"), "port": 8099, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False)
P = Paths(cfg["data_dir"])
db = connect(P.db)
for name, role in (("admin", "none"), ("sara", "kid"), ("omar", "kid"), ("nobody", "none")):
    db.execute("INSERT INTO users(username, password_hash, is_admin, created_at, tv_role) VALUES (?, ?, ?, ?, ?)",
               (name, generate_password_hash("x"), 1 if name == "admin" else 0, "2026-01-01T00:00:00", role))
db.commit()
from homenas import kids
res.append(ok(kids.pdf_name('رسالة/إلى: "عمر"?') == "رسالة إلى عمر.pdf" and kids.pdf_name("") == "رسالة.pdf", "اسم الملف آمن"))
PDF = b"%PDF-1.4\n%test\n%%EOF\n"
REF = {"Referer": "http://127.0.0.1/tv/game/7/%D8%A7%D9%84%D8%B1%D8%B3%D8%A7%D8%A6%D9%84/index.html"}
def send(c, meta, pdf=PDF, q="", headers=REF):
    return c.post("/api/tv/letters/send" + q, data={"meta": json.dumps(meta), "pdf": (io.BytesIO(pdf), "l.pdf")}, headers=headers,
                  content_type="multipart/form-data")
sara, omar = app.test_client(), app.test_client()
r = send(sara, {"to": 3}); res.append(ok(r.status_code == 401, "بلا شخص على التلفاز: 401"))
sara.post("/api/tv/login", json={"id": 2}); omar.post("/api/tv/login", json={"id": 3})
r = send(sara, {"to": 3}, headers={}); res.append(ok(r.status_code == 403, "ليس من لعبة: 403"))
r = send(sara, {"to": 3}, pdf=b"hello"); res.append(ok(r.status_code == 400, "ليس PDF: 400"))
r = send(sara, {"to": 4}); res.append(ok(r.status_code == 404, "ليس من أفراد التلفاز: 404"))
r = send(sara, {"to": 2}); res.append(ok(r.status_code == 400, "لنفسي: 400"))
r = send(sara, {"to": 3, "subject": "زيارة", "body": "السلام عليكم", "name": "رسالة من سارة إلى عمر"})
d = r.get_json() or {}
res.append(ok(r.status_code == 200 and d.get("to", {}).get("id") == 3, f"الإرسال: {d}"))
root = Path("تلفاز") / "تطبيقات" / "الرسائل"
f_out = P.homes / "sara" / root / "الصادر" / "رسالة من سارة إلى عمر.pdf"
f_in = P.homes / "omar" / root / "الوارد" / "رسالة من سارة إلى عمر.pdf"
res.append(ok(f_out.read_bytes() == PDF and f_in.read_bytes() == PDF, "PDF في «الصادر» عند سارة و«الوارد» عند عمر"))
o = sara.get("/api/tv/letters?box=out").get_json()
i = omar.get("/api/tv/letters?box=in").get_json()
res.append(ok(len(o["letters"]) == 1 and o["letters"][0]["to"]["id"] == 3 and o["unread"] == 0, "صادر سارة"))
res.append(ok(len(i["letters"]) == 1 and i["unread"] == 1 and i["letters"][0]["body"] == "السلام عليكم"
              and i["letters"][0]["from"]["id"] == 2 and not i["letters"][0]["read"], "وارد عمر: غير مقروءة، والنص والمرسل"))
res.append(ok(sara.get("/api/tv/letters?box=in").get_json()["letters"] == [], "وارد سارة فارغ"))
lid = i["letters"][0]["id"]
omar.post(f"/api/tv/letters/{lid}/read")
res.append(ok(omar.get("/api/tv/letters?box=in").get_json()["unread"] == 0, "قُرئت"))
send(sara, {"to": 3, "subject": "ثانية", "name": "رسالة من سارة إلى عمر"})
res.append(ok((f_in.parent / "رسالة من سارة إلى عمر (2).pdf").is_file(), "اسم مكرر ← (2)"))
r = omar.post(f"/api/tv/letters/{lid}/delete?box=in")
res.append(ok(r.status_code == 200 and not f_in.exists() and f_out.exists() and len(sara.get("/api/tv/letters?box=out").get_json()["letters"]) == 2,
              "الحذف من وارد عمر فقط؛ صادر سارة يبقى"))
(f_out.parent / "رسالة من سارة إلى عمر (2).pdf").unlink()
res.append(ok(len(sara.get("/api/tv/letters?box=out").get_json()["letters"]) == 1, "حذف الـPDF من «الملفات» يخفيها من الصندوق"))
r = send(sara, {"subject": "لي", "name": "../../x"}, q="?save=1")
res.append(ok(r.status_code == 200 and (P.homes / "sara" / root / "المحفوظة" / "x.pdf").is_file()
              and len(sara.get("/api/tv/letters?box=saved").get_json()["letters"]) == 1, "«احفظ لي» في المحفوظة، بلا خروج من المجلد"))
res.append(ok(sara.get("/api/tv/letters?box=zz").status_code == 400, "صندوق غير معروف: 400"))
big = b"%PDF-" + b"0" * (kids.PDF_MAX + 1)
res.append(ok(send(sara, {"to": 3}, pdf=big).status_code == 413, "ملف كبير: 413"))
res.append(ok("/api/tv/letters/send" in (APP / "games/_kit/API.txt").read_text(encoding="utf-8"), "موثّقة في API.txt"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
