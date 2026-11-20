"""البند 50: تقدّم الألعاب في السيرفر لكل فرد (يدخل في النسخ الاحتياطي)، ونقل التقدّم القديم من متصفح التلفاز."""
import json, subprocess, sys, tempfile, shutil, sqlite3
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import create_app
from homenas.core import connect, Paths
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
K = "memory:الأفعى"
res.append(ok(sara.get("/api/tv/save", query_string={"key": K}).get_json() == {"found": False}, "لا تقدّم بعد"))
r = sara.put("/api/tv/save", json={"key": K, "value": {"level": 4, "best": {"1": 3}}})
got = sara.get("/api/tv/save", query_string={"key": K}).get_json()
res.append(ok(r.status_code == 200 and got["found"] and got["value"] == {"level": 4, "best": {"1": 3}}, "حفظ التقدّم وقراءته"))
res.append(ok(omar.get("/api/tv/save", query_string={"key": K}).get_json() == {"found": False}, "لكل طفل تقدّمه (عمر لا يرى تقدّم سارة)"))
sara.put("/api/tv/save", json={"key": K, "value": {"level": 5}})
res.append(ok(sara.get("/api/tv/save", query_string={"key": K}).get_json()["value"] == {"level": 5}, "الحفظ الجديد يحل محل القديم"))
res.append(ok(sara.put("/api/tv/save", json={"key": K, "value": "x"}).status_code == 400 and sara.put("/api/tv/save", json={"key": "", "value": {}}).status_code == 400
              and sara.put("/api/tv/save", json={"key": K, "value": {"x": "a" * 300000}}).status_code == 413, "يرفض القيم الخاطئة والكبيرة جداً"))
res.append(ok(app.test_client().get("/api/tv/save", query_string={"key": K}).status_code == 401, "بلا اختيار شخص على التلفاز ← ممنوع"))
# النسخ الاحتياطي والتصدير يأخذان قاعدة البيانات كاملة
db.execute("PRAGMA wal_checkpoint(FULL)")
res.append(ok(sqlite3.connect(P.db).execute("SELECT COUNT(*) FROM game_saves WHERE user_id=2").fetchone()[0] == 1, "التقدّم في قاعدة البيانات (التي تدخل في النسخ الاحتياطي والتصدير)"))
# حذف فرد يحذف تقدّمه
from homenas.saves import forget_user
forget_user(db, 2); db.commit()
res.append(ok(db.execute("SELECT COUNT(*) FROM game_saves WHERE user_id=2").fetchone()[0] == 0, "حذف الفرد يحذف تقدّمه"))
sysx = (APP / "homenas/system.py").read_text(encoding="utf-8")
res.append(ok("_forget_saves(db, uid)" in sysx, "…ويُستدعى عند حذف المستخدم"))
# محاكاة K.store في Node: نقل القديم، القراءة من السيرفر، والحفظ
kit = (APP / "static/kit/kit.js").read_text(encoding="utf-8")
start = kit.index("  K.saveKey = (name) =>"); end = kit.index("    return data;\n  };", start) + len("    return data;\n  };")
sim = r"""
const K = {}; const store = {}; const server = {}; const sent = [];
const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, get length() { return Object.keys(store).length; }, key: (i) => Object.keys(store)[i] };
let location = { pathname: "/tv/game/12/%D8%A7%D9%84%D8%A3%D9%81%D8%B9%D9%89/" };
let status = 200;
class XMLHttpRequest { open(m, u) { this.u = u; } send() { this.status = status; const k = decodeURIComponent(this.u.split("key=")[1]); this.responseText = JSON.stringify(k in server ? { found: true, value: server[k] } : { found: false }); } }
const fetch = (u, o) => { const b = JSON.parse(o.body); sent.push(b.key); server[b.key] = b.value; return Promise.resolve({}); };
K.carry = () => {};
""" + kit[start:end] + r"""
// 1) تقدّم قديم على التلفاز فقط ← يُرفع إلى السيرفر
store["memory:" + location.pathname] = JSON.stringify({ level: 7 });
const a = K.store("memory", { level: 1 });
// 2) بعد إعادة التنصيب: المتصفح فارغ، والسيرفر عنده التقدّم، ورقم المربع تغيّر
for (const k in store) delete store[k];
location = { pathname: "/tv/game/40/%D8%A7%D9%84%D8%A3%D9%81%D8%B9%D9%89/index.html" };
const b = K.store("memory", { level: 1 });
b.level = 8; b.save();
// 3) سيرفر قديم (404): يبقى الحفظ في المتصفح فقط
status = 404; const n = sent.length;
const c = K.store("other", { x: 1 }); c.x = 2; c.save();
console.log(JSON.stringify({ a: a.level, b: b.level, key: sent[0], server: server["memory:الأفعى"], local: store["memory:" + location.pathname], oldsrv: sent.length === n, c: JSON.parse(store["other:" + location.pathname]).x }));
"""
out = subprocess.run(["node", "-e", sim], capture_output=True, text=True)
v = json.loads(out.stdout) if out.returncode == 0 else {}
res.append(ok(v.get("a") == 7 and v.get("key") == "memory:الأفعى", f"التقدّم القديم على التلفاز يُنقل إلى السيرفر ← {v or out.stderr[-300:]}"))
res.append(ok(v.get("b") == 8 and v.get("server") == {"level": 8} and json.loads(v.get("local") or "{}").get("level") == 8,
              "بعد إعادة التنصيب يرجع التقدّم من السيرفر (ولو تغيّر رقم المربع)، والحفظ يذهب للاثنين"))
res.append(ok(v.get("oldsrv") is True and v.get("c") == 2, "خارج التلفاز أو مع سيرفر قديم: الحفظ في المتصفح كما كان"))
copies = list((APP / "games").rglob("kit.js"))
res.append(ok(all(p.read_bytes() == (APP / "static/kit/kit.js").read_bytes() for p in copies), f"نسخ kit.js في الألعاب ({len(copies)}) محدّثة"))
three = [APP / "games" / g / "game.js" for g in ("حروفي العربية", "سارة والتفكير", "سباق السيارات")]
res.append(ok(all("hsefStore(" in p.read_text(encoding="utf-8") and subprocess.run(["node", "--check", str(p)]).returncode == 0 for p in three),
              "الألعاب الثلاث التي تحفظ بطريقتها تحفظ في السيرفر أيضاً"))
res.append(ok('hsefStore(STORE, STORE' in three[1].read_text(encoding="utf-8"), "«سارة والتفكير»: صار لكل طفل تقدّمه (كان واحداً للجميع)"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
