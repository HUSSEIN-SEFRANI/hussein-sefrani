import os, sys, tempfile, shutil, time, json
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app, cameras
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),))
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('kid',?,0,'x')", (generate_password_hash("p"),))
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('mama',?,0,'x')", (generate_password_hash("p"),))
db.execute("INSERT INTO cameras(name,url,record,enabled,position,created_at) VALUES ('باب البيت','rtsp://x/1',1,1,0,'x')")
db.execute("INSERT INTO cameras(name,url,record,enabled,position,created_at) VALUES ('الحديقة/الخلفية','rtsp://x/2',1,1,1,'x')")
db.execute("INSERT INTO settings VALUES ('cam_viewers', '[3]')")
db.commit()
kid = 2
db.execute("INSERT INTO tv_tiles(user_id, kind, title, enabled, position) VALUES (?, 'cameras', 'الكاميرات', 1, 0)", (kid,)); db.commit()
old = P.system / "cameras" / "1"; old.mkdir(parents=True); (old / "2026-11-17_10-00-00.mp4").write_bytes(b"v" * 100)
m = app.extensions["nas_cams"]
m.sync_share()
share = P.shares / "الكاميرات"
res.append(ok((share / "باب البيت" / "2026-11-17_10-00-00.mp4").is_file() and not old.exists(), "التسجيلات القديمة انتقلت إلى «الكاميرات/باب البيت»"))
res.append(ok((share / "الحديقة_الخلفية").is_dir(), "اسم المجلد آمن (بلا /)"))
fid = db.execute("SELECT id FROM folders WHERE name='الكاميرات'").fetchone()["id"]
perms = {r["user_id"]: r["perm"] for r in db.execute("SELECT user_id, perm FROM folder_perms WHERE folder_id=?", (fid,))}
res.append(ok(perms == {2: "ro", 3: "ro"}, f"قراءة فقط لمن يشاهد الكاميرات (التلفاز ومن اختاره المدير): {perms}"))
db.execute("UPDATE tv_tiles SET enabled=0 WHERE user_id=2"); db.commit(); m.sync_share()
perms = {r["user_id"]: r["perm"] for r in db.execute("SELECT user_id, perm FROM folder_perms WHERE folder_id=?", (fid,))}
res.append(ok(perms == {3: "ro"}, "من لم يعد يشاهد الكاميرات تُزال صلاحيته"))
res.append(ok(m.rec_dir(1) == share / "باب البيت", "مكان التسجيل الجديد"))
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
d = c.get("/api/cameras/1/days").get_json(); res.append(ok(d["days"] and d["days"][0]["day"] == "2026-11-17", "التسجيلات تظهر في قائمة الأيام"))
r = c.post("/api/cameras/1", json={"name": "المدخل"}); res.append(ok(r.status_code == 200 and (share / "المدخل" / "2026-11-17_10-00-00.mp4").is_file(), "تغيير اسم الكاميرا يغيّر اسم مجلدها"))
v = c.get("/api/cameras/1/rec/2026-11-17_10-00-00.mp4/vinfo"); res.append(ok(v.status_code == 200 and "mode" in v.get_json(), f"تجهيز التسجيل للتشغيل: {v.get_json()}"))
cmd = m.command({"id": 1, "url": "rtsp://x/1", "username": None, "password": None, "codec": "h264", "audio": "aac", "record": 1})
res.append(ok("movflags=+frag_keyframe+empty_moov+default_base_moof" in cmd, "المقاطع MP4 مجزّأة (تُشغَّل أثناء التسجيل ولا تتلف)"))
lst = c.get("/api/cameras").get_json()["cameras"]; res.append(ok("audio" in lst[0], "التلفاز يعرف هل في الكاميرا صوت"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
