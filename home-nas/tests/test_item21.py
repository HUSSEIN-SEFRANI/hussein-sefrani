import os, sys, tempfile, shutil, time
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app, tv, tvvideo, storage
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at,tv_role) VALUES ('admin',?,1,'x','none')", (generate_password_hash("p"),)); db.commit()
sh = tmp / "films"; sh.mkdir(); db.execute("INSERT INTO folders(name,path,created_at) VALUES ('أفلام',?,'x')", (str(sh),)); db.commit()
(P.homes / "admin" / "Videos").mkdir(parents=True)
a = P.homes / "admin" / "Videos" / "iphone.mov"; a.write_bytes(b"A" * 9000); os.utime(a, (1600000000, 1600000000))
b = sh / "old.avi"; b.write_bytes(b"B" * 7000)
v = tvvideo.get(P.cache)
for f, n in ((a, 3000), (b, 2000)):
    k = v.key(f); v.out(k).parent.mkdir(parents=True, exist_ok=True); v.out(k).write_bytes(b"M" * n); v.srcmap[k] = str(f)
v.save_srcmap()
src = tv.prep_sources(P); res.append(ok(a not in src and b not in src, "الافتراضي: مربعات التلفاز فقط"))
db.execute("INSERT INTO settings VALUES ('tv_prep_scope','all')"); db.commit()
src = tv.prep_sources(P); res.append(ok(a in src and b in src, "«كل الفيديو»: الملفات الشخصية والمجلدات المشتركة"))
res.append(ok(tvvideo.DEFAULT_SHARE == 0.10, "الحد التلقائي 10% من القرص"))
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
info = c.get("/api/admin/tv/prep/replace").get_json()
res.append(ok(info["count"] == 2 and info["saving"] == (9000 + 7000) - (3000 + 2000), f"المرشحون للاستبدال: {info['count']}، التوفير {info['saving']} بايت"))
# حذف الأصل ← تُحذف النسخة المجهّزة
kb = v.key(b); b.unlink()
v.drop_orphans(); res.append(ok(not v.out(kb).exists() and kb not in v.srcmap, "حُذف الأصل ← حُذفت نسخته المجهّزة"))
c.post("/api/admin/tv/prep/replace")
for _ in range(50):
    if not tv._replace_job["running"]: break
    time.sleep(0.1)
new = a.with_suffix(".mp4")
res.append(ok(new.read_bytes() == b"M" * 3000 and not a.exists() and int(new.stat().st_mtime) == 1600000000, "الأصل استُبدل بالمجهّز (MP4)، وبقي تاريخه"))
res.append(ok((P.homes / "admin" / "#recycle" / "Videos" / "iphone.mov").read_bytes() == b"A" * 9000, "الأصل في سلة المحذوفات (يمكن إرجاعه)"))
# تفريغ
k2 = "ab" + "0" * 38; v.out(k2).parent.mkdir(parents=True, exist_ok=True); v.out(k2).write_bytes(b"x" * 500)
(P.cache / "thumbs" / "aa").mkdir(parents=True); (P.cache / "thumbs" / "aa" / "1.jpg").write_bytes(b"j" * 100)
r1 = c.post("/api/admin/storage/clear", json={"what": "tv-video"}).get_json(); r2 = c.post("/api/admin/storage/clear", json={"what": "thumbs"}).get_json()
res.append(ok(r1["freed"] == 500 and r2["freed"] == 100 and not (P.cache / "thumbs").exists(), "تفريغ الفيديو المجهّز والمصغرات كلٌّ وحده"))
(P.cache / "fthumbs").mkdir(); (P.cache / "fthumbs" / "x.jpg").write_bytes(b"1"); storage._usage["running"] = True; storage._compute(P, [("أفلام", str(sh))], {}); names = [x["name"] for x in storage._usage["result"]["other"]]
res.append(ok("فيديو التلفاز المجهّز" in names and "مصغرات الصور والمعاينات" in names, "سطران منفصلان في «ماذا يشغل المساحة؟»"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
