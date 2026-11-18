"""البند 43: الألعاب على التلفاز تحفظ PDF في مجلد «الرسائل» الشخصي (لعبة «الرسائل»)."""
import sys, tempfile
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
now = "2026-01-01T00:00:00"
for name, role in (("admin", "none"), ("sara", "kid"), ("omar", "kid"), ("nobody", "none")):
    db.execute("INSERT INTO users(username, password_hash, is_admin, created_at, tv_role) VALUES (?, ?, ?, ?, ?)",
               (name, generate_password_hash("x"), 1 if name == "admin" else 0, now, role))
db.commit()
from homenas import kids
res.append(ok(kids.pdf_name('رسالة/إلى: "عمر"?') == "رسالة إلى عمر.pdf", "اسم الملف آمن"))
res.append(ok(kids.pdf_name("") == "رسالة.pdf" and kids.pdf_name("x.PDF") == "x.PDF", "اسم فارغ، وامتداد موجود"))
c = app.test_client()
PDF = b"%PDF-1.4\n%test\n%%EOF\n"
REF = {"Referer": "http://127.0.0.1/tv/game/7/%D8%A7%D9%84%D8%B1%D8%B3%D8%A7%D8%A6%D9%84/index.html", "Content-Type": "application/pdf"}
r = c.post("/api/tv/files/pdf?to=3", data=PDF, headers=REF); res.append(ok(r.status_code == 401, "بلا شخص على التلفاز: 401"))
c.post("/api/tv/login", json={"id": 2})
r = c.post("/api/tv/files/pdf?to=3", data=PDF, headers={"Content-Type": "application/pdf"}); res.append(ok(r.status_code == 403, "ليس من لعبة: 403"))
r = c.post("/api/tv/files/pdf?to=3", data=b"hello", headers=REF); res.append(ok(r.status_code == 400, "ليس PDF: 400"))
r = c.post("/api/tv/files/pdf?to=4", data=PDF, headers=REF); res.append(ok(r.status_code == 404, "شخص ليس من أفراد التلفاز: 404"))
r = c.post("/api/tv/files/pdf?to=3&copy=1&name=" + "رسالة إلى omar", data=PDF, headers=REF)
d = r.get_json() or {}
res.append(ok(r.status_code == 200 and len(d.get("saved", [])) == 2, f"حُفظت عند المرسَل إليه ونسخة عند المرسل: {d}"))
f1 = P.homes / "omar" / "الرسائل" / "رسالة إلى omar.pdf"
f2 = P.homes / "sara" / "الرسائل" / "المرسلة" / "رسالة إلى omar.pdf"
res.append(ok(f1.read_bytes() == PDF and f2.read_bytes() == PDF, "الملفان في المجلدين الشخصيين"))
r = c.post("/api/tv/files/pdf?to=3&name=" + "رسالة إلى omar", data=PDF, headers=REF)
res.append(ok((P.homes / "omar" / "الرسائل" / "رسالة إلى omar (2).pdf").is_file(), "اسم مكرر ← (2)"))
r = c.post("/api/tv/files/pdf?name=../../x", data=PDF, headers=REF)
res.append(ok(r.status_code == 200 and (P.homes / "sara" / "الرسائل" / "x.pdf").is_file() and not (P.homes / "x.pdf").exists(), "لا خروج من المجلد، وبلا to تُحفظ للاعب"))
big = b"%PDF-" + b"0" * (kids.PDF_MAX + 1)
r = c.post("/api/tv/files/pdf?to=3", data=big, headers=REF); res.append(ok(r.status_code == 413, "ملف كبير: 413"))
api = (APP / "games/_kit/API.txt").read_text(encoding="utf-8")
res.append(ok("/api/tv/files/pdf" in api, "موثّقة في API.txt"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
