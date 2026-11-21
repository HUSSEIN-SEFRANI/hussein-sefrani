"""البند 55: «الإضافات» (تطبيقات جانبية بملف ZIP) وإضافة «نسخ الواتساب» (الآيفون ← مجلد فيه PDF والفيديوهات).

الهاتف هنا نسخة آيفون تجريبية (addons/whatsapp/dev/fake_backup.py) ببيانات عامة، عادية ومشفّرة.
"""
import glob, io, json, os, shutil, subprocess, sys, tempfile, time, zipfile
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ADD = APP.parent / "addons"
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
T = Path(tempfile.mkdtemp())
if not shutil.which("chromium"):
    c = sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome"))
    if c:
        os.environ["HSEF_CHROMIUM"] = c[-1]
os.environ["HSEF_IPHONE_STATUS"] = str(T / "iphone.json")

# ------------------------------------------------------------------ AES ونسخة الآيفون المشفّرة
sys.path.insert(0, str(ADD / "whatsapp"))
from wa import aes
rk = aes.expand(bytes(range(32)))
kek = bytes.fromhex("000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F")
key = bytes.fromhex("00112233445566778899AABBCCDDEEFF000102030405060708090A0B0C0D0E0F")
res.append(ok(aes.encrypt_block(rk, bytes.fromhex("00112233445566778899aabbccddeeff")).hex() == "8ea2b7ca516745bfeafc49904b496089"
              and aes.wrap(kek, key).hex().upper() == "28C9F404C4B810F4CBCCB35CFB87F8263F5786E2D80ED326CBC7F0E71A99F43BFB988B9B7A02DD21"
              and aes.unwrap(kek, aes.wrap(kek, key)) == key and aes.unwrap(b"k" * 32, aes.wrap(kek, key)) is None,
              "AES-256 وRFC 3394 تطابق القيم الرسمية، والمفتاح الخطأ يُكتشف"))
sys.path.insert(0, str(ADD / "whatsapp" / "dev"))
import fake_backup
PLAIN = T / "phone-plain"; ENC = T / "phone-enc"
fake_backup.make(PLAIN); fake_backup.make(ENC, "سر 123")
for k in [k for k in sys.modules if k == "wa" or k.startswith("wa.")]:
    sys.modules.pop(k)   # الإضافة تحمّل نسختها الخاصة

# ------------------------------------------------------------------ السيرفر
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
for n, adm in (("baba", 1), ("sara", 0)):
    db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES (?,?,?,'x')", (n, generate_password_hash("pw"), adm))
db.commit()
def client(uid):
    c = app.test_client()
    with c.session_transaction() as s:
        s["uid"] = uid; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=?", (uid,)).fetchone()[0][-12:]
    return c
baba, sara, anon = client(1), client(2), app.test_client()

def zbytes(files: dict, links=()):
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        for n, d in files.items():
            z.writestr(n, d)
        for n in links:
            zi = zipfile.ZipInfo(n); zi.external_attr = (0o120777 << 16); z.writestr(zi, "/etc/passwd")
    return b.getvalue()
def up(c, data, pw="pw"):
    return c.post("/api/admin/addons", data={"file": (io.BytesIO(data), "a.zip"), "password": pw}, content_type="multipart/form-data")
HELLO = {"addon.json": json.dumps({"id": "hello", "name": "تجربة", "version": "1.0", "ui": "ui.js"}),
         "addon.py": "from homenas.addons import Router\nrouter = Router()\nV='1'\n@router.get('/hi/<int:n>')\ndef hi(n):\n    return {'n': n * 2, 'v': V}\n",
         "web/ui.js": "export const x = 1;\n"}

# ------------------------------------------------------------------ المرحلة 1: الإضافات
res.append(ok(up(sara, zbytes(HELLO)).status_code == 403 and up(baba, zbytes(HELLO), pw="x").status_code == 403,
              "الرفع للمدير فقط، وبكلمة مروره"))
bad = {
    "بلا addon.json": zbytes({"addon.py": "x=1"}),
    "مسار ../": zbytes({**HELLO, "../evil.py": "x"}),
    "رابط رمزي": zbytes(HELLO, links=["web/link"]),
    "معرّف غير صالح": zbytes({**HELLO, "addon.json": json.dumps({"id": "../x", "name": "a", "version": "1"})}),
    "خطأ في كود Python": zbytes({**HELLO, "addon.py": "def (:\n"}),
    "تحتاج نظاماً أحدث": zbytes({**HELLO, "addon.json": json.dumps({"id": "hello", "name": "a", "version": "1", "min_system": "99.0"})}),
    "ليس ZIP": b"not a zip",
}
codes = {k: up(baba, v) for k, v in bad.items()}
res.append(ok(all(r.status_code == 400 for r in codes.values()) and not (P.system / "evil.py").exists()
              and not (P.system / "addons" / "hello").exists() and not list((P.system / "addons").glob(".new-*")),
              "ملفات مرفوضة برسالة: " + "، ".join(f"{k} ({v.get_json()['error'][:30]}…)" for k, v in list(codes.items())[:3])))
r = up(baba, zbytes({f"hello/{k}": v for k, v in HELLO.items()}))   # مضغوط مع مجلده
res.append(ok(r.status_code == 200 and r.get_json()["addon"]["id"] == "hello" and not r.get_json()["upgraded"], "تنصيب إضافة (ZIP فيه المجلد نفسه)"))
lst = sara.get("/api/addons").get_json()["addons"]
res.append(ok([a["id"] for a in lst] == ["hello"] and lst[0]["ui"] == "ui.js", "تظهر لكل المستخدمين (أيقونة على سطح المكتب)"))
res.append(ok(sara.get("/api/addons/hello/hi/21").get_json() == {"n": 42, "v": "1"}, "طرق الإضافة تعمل على ‎/api/addons/<id>/… بلا إعادة تشغيل"))
res.append(ok(sara.get("/addons/hello/ui.js").status_code == 200 and anon.get("/addons/hello/ui.js").status_code in (302, 401)
              and anon.get("/api/addons/hello/hi/1").status_code == 401 and sara.get("/addons/hello/../addon.py").status_code == 404,
              "الواجهة تُخدم من web/ فقط، ولمن دخل فقط"))
res.append(ok(sara.get("/api/addons/hello/nope").status_code == 404 and sara.get("/api/addons/zzz/x").status_code == 404, "طريق أو إضافة غير موجودة ← 404"))
r = up(baba, zbytes({**HELLO, "addon.py": HELLO["addon.py"].replace("V='1'", "V='2'"),
                     "addon.json": json.dumps({"id": "hello", "name": "تجربة", "version": "1.1", "ui": "ui.js", "admin": True})}))
res.append(ok(r.get_json().get("upgraded") and baba.get("/api/addons/hello/hi/1").get_json()["v"] == "2", "رفعها مرة أخرى يستبدلها، والكود الجديد يعمل فوراً"))
res.append(ok(sara.get("/api/addons").get_json()["addons"] == [] and sara.get("/api/addons/hello/hi/1").status_code == 403, "إضافة «للمدير فقط» مخفية عن غيره"))
(P.system / "addon-data" / "hello").mkdir(parents=True, exist_ok=True)
res.append(ok(baba.post("/api/admin/addons/hello/remove", json={"password": "x"}).status_code == 403
              and baba.post("/api/admin/addons/hello/remove", json={"password": "pw"}).status_code == 200
              and not (P.system / "addons" / "hello").exists() and not (P.system / "addon-data" / "hello").exists()
              and baba.get("/api/addons/hello/hi/1").status_code == 404, "الحذف بكلمة المرور يزيلها مع بياناتها"))

# ------------------------------------------------------------------ المراحل 2-4: نسخ الواتساب
sys.path.insert(0, str(ADD)); import build
zp = build.build("whatsapp", T / "dist")
names = zipfile.ZipFile(zp).namelist()
res.append(ok("addon.json" in names and "web/ui.js" in names and "wa/export.py" in names and not any(n.startswith("dev/") for n in names),
              f"ملف الإضافة {zp.name} ({zp.stat().st_size // 1024} KB، بلا أدوات الاختبار)"))
res.append(ok(up(baba, zp.read_bytes()).status_code == 200, "تنصيب «نسخ الواتساب» من ملف ZIP"))
W = "/api/addons/whatsapp"
def wait(c, states, t=90):
    end = time.time() + t
    while time.time() < end:
        j = c.get(W + "/status").get_json()["job"]
        if j["state"] in states:
            return j
        time.sleep(0.3)
    return j
os.environ["HSEF_WA_FAKE"] = str(PLAIN)
s = sara.get(W + "/status").get_json()
res.append(ok(s["device"]["state"] == "ready" and s["tools"]["pdf"] and s["job"]["state"] == "idle", "الهاتف موصول وجاهز، وChromium موجود لصنع PDF"))
res.append(ok(sara.post(W + "/read").status_code == 200, "«اقرأ المحادثات من الهاتف» ← نسخة مؤقتة"))
j = wait(sara, ("ready", "error"))
chats = sara.get(W + "/chats").get_json()["chats"]
res.append(ok(j["state"] == "ready" and [c["name"] for c in chats] == ["مجموعة العائلة", "صديق تجربة"]
              and chats[1]["messages"] == 8 and chats[1]["images"] == 2 and chats[1]["videos"] == 1 and chats[0]["group"],
              "قائمة المحادثات بأسمائها وعدد الرسائل والصور والفيديو (بلا «الحالة»)"))
bs = baba.get(W + "/status").get_json()["job"]
res.append(ok(bs == {"state": "busy", "owner_name": "sara"} and baba.post(W + "/read").status_code == 409 and baba.get(W + "/chats").status_code == 403
              and baba.post(W + "/export", json={"chat": 1}).status_code == 409, "هاتف واحد في كل مرة: غيرها لا يرى المحادثات ولا يأخذها"))
res.append(ok(sara.post(W + "/export", json={"chat": 1}).status_code == 200, "اختيار «صديق تجربة»"))
j = wait(sara, ("done", "error_export"))
F = P.homes / "sara" / "whatsapp" / "صديق تجربة"
files = sorted(p.name for p in F.iterdir()) if F.is_dir() else []
res.append(ok(j["state"] == "done" and files == ["صديق تجربة.pdf", "صوت-001.opus", "فيديو-001.mp4"] and j["result"]["path"] == "/home/whatsapp/صديق تجربة",
              f"مجلد باسم المحادثة في ملفاتها (whatsapp): {files}"))
pdf = (F / "صديق تجربة.pdf").read_bytes() if files else b""
txt = subprocess.run(["pdftotext", "-layout", str(F / "صديق تجربة.pdf"), "-"], capture_output=True, text=True).stdout if files else ""
imgs = subprocess.run(["pdfimages", "-list", str(F / "صديق تجربة.pdf")], capture_output=True, text=True).stdout.count("image") if files else 0
res.append(ok(pdf.startswith(b"%PDF") and "Hello in English" in txt and "001" in txt and imgs >= 2,
              f"ملف PDF فيه الرسائل والصور ({imgs} صورة: الصورة والصورة المصغرة من الفيديو) واسم الفيديو"))
probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(F / "فيديو-001.mp4")], capture_output=True, text=True).stdout
res.append(ok(abs(float(probe or 0) - 2) < 0.5 and j["result"]["stats"]["missing"] == 1, "الفيديو سليم (ثانيتان)، والصورة غير المحمّلة على الهاتف مذكورة"))
sara.post(W + "/back"); sara.post(W + "/export", json={"chat": 1}); j = wait(sara, ("done", "error_export"))
TTF = next(iter(sorted(glob.glob("/usr/share/fonts/truetype/jetbrains-mono/*.ttf"))), None)
fonts0 = subprocess.run(["pdffonts", str(F / "صديق تجربة.pdf")], capture_output=True, text=True).stdout
res.append(ok(j["result"]["name"] == "صديق تجربة (2)" and F.exists(), "نسخها مرة ثانية ← مجلد جديد «(2)» ولا يُمسح القديم"))
if TTF:   # الخط Arial دائماً: arial.ttf يضعه المستعمل في مجلد whatsapp (لا يجوز توزيعه مع الإضافة)
    shutil.copy(TTF, P.homes / "sara" / "whatsapp" / "arial.ttf")
    sara.post(W + "/back"); sara.post(W + "/export", json={"chat": 1}); j = wait(sara, ("done", "error_export"))
    f3 = subprocess.run(["pdffonts", str(P.homes / "sara" / "whatsapp" / "صديق تجربة (3)" / "صديق تجربة.pdf")], capture_output=True, text=True).stdout
    res.append(ok("JetBrains" not in fonts0 and "JetBrains" in f3, "الخط Arial: ملف arial.ttf في مجلد whatsapp يُستعمل في الـPDF"))
wd = P.system / "addon-data" / "whatsapp" / "backup"
had = wd.exists()
res.append(ok(had and sara.post(W + "/finish").status_code == 200 and not wd.exists() and sara.get(W + "/status").get_json()["job"]["state"] == "idle"
              and F.exists(), "«انتهيت» تحذف النسخة المؤقتة، والمجلدات تبقى"))
sara.post(W + "/read"); sara.post(W + "/cancel"); j = wait(sara, ("idle", "ready"), 20)
res.append(ok(j["state"] == "idle" and not wd.exists(), "«إيقاف» أثناء النسخ يحذف ما نُسخ"))

os.environ["HSEF_WA_FAKE"] = str(ENC)
res.append(ok(baba.get(W + "/status").get_json()["device"]["encrypted"], "الهاتف بنسخ مشفّرة يُعرف قبل البدء"))
baba.post(W + "/read"); j = wait(baba, ("need_password", "ready", "error"))
r = baba.post(W + "/password", json={"password": "خطأ"}).get_json()["job"]
res.append(ok(j["state"] == "need_password" and r["state"] == "need_password" and "غير صحيحة" in r["error"], "نسخة مشفّرة ← تُطلب كلمة السر، والخاطئة تُرفض"))
r = baba.post(W + "/password", json={"password": "سر 123"}).get_json()["job"]
baba.post(W + "/export", json={"chat": 2}); j = wait(baba, ("done", "error_export"))
G = P.homes / "baba" / "whatsapp" / "مجموعة العائلة"
gf = sorted(p.name for p in G.iterdir()) if G.is_dir() else []
gt = subprocess.run(["pdftotext", str(G / "مجموعة العائلة.pdf"), "-"], capture_output=True, text=True).stdout if gf else ""
res.append(ok(r["state"] == "ready" and gf == ["فيديو-001.mp4", "مجموعة العائلة.pdf", "ملف-001.pdf"] and (G / "ملف-001.pdf").read_bytes() == b"%PDF-1.4 test",
              f"كلمة السر الصحيحة تفك النسخة، والمجموعة ← {gf}"))
res.append(ok(any(w in gt for w in ("ﺍﻟﻌﻀﻮ", "العضو")) and j["result"]["stats"]["images"] == 1, "أسماء أعضاء المجموعة في الملف"))
baba.post(W + "/finish")
res.append(ok(not wd.exists() and not (P.system / "addon-data" / "whatsapp" / "tmp").exists(), "لا يبقى شيء من نسخة الهاتف على السيرفر"))
res.append(ok(all(subprocess.run(["node", "--check", str(f)]).returncode == 0 for f in
                  (APP / "static/js/desktop.js", APP / "static/js/apps/system.js", ADD / "whatsapp/web/ui.js")), "ملفات JS سليمة"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
