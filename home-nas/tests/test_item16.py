import os, sys, tempfile, shutil, time
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import create_app, recycle, health
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
tmp = Path(tempfile.mkdtemp()); cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at,display_name) VALUES ('admin',?,1,'x','الأب')", (generate_password_hash("p"),)); db.commit()
(P.homes / "admin" / "#recycle" / "Photos").mkdir(parents=True); sh = tmp / "share"; (sh / "#recycle").mkdir(parents=True)
db.execute("INSERT INTO folders(name,path,created_at) VALUES ('أفلام',?, 'x')", (str(sh),)); db.commit()
old = P.homes / "admin" / "#recycle" / "Photos" / "old.jpg"; old.write_bytes(b"x" * 5000)
new = P.homes / "admin" / "#recycle" / "new.txt"; new.write_bytes(b"y" * 300)
(sh / "#recycle" / "film.mkv").write_bytes(b"z" * 7000)
s = recycle.summary(db, P)
res.append(ok(s["total"] == 12300 and s["count"] == 3 and s["days"] == 30, f"الحجم: {s['total']} بايت في {s['count']} ملفات، المدة الافتراضية 30 يوماً"))
res.append(ok({b["name"] for b in s["bins"]} == {"الأب", "أفلام"}, "كل سلة باسم صاحبها أو المجلد"))
r = recycle.purge(db, P, 30, now=time.time() + 31 * 86400)
res.append(ok(r["files"] == 3, "بعد 31 يوماً: كل الملفات تُمسح"))
old.parent.mkdir(parents=True, exist_ok=True); old.write_bytes(b"x" * 5000)
r = recycle.purge(db, P, 30); res.append(ok(r["files"] == 0 and old.exists(), "ملف حُذف اليوم يبقى"))
r = recycle.purge(db, P, 0, now=time.time() + 999 * 86400); res.append(ok(r["files"] == 0 and old.exists(), "«لا تفريغ تلقائي» لا يمسح شيئاً"))
c = app.test_client()
with c.session_transaction() as ss: ss["uid"] = 1; ss["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
res.append(ok(c.post("/api/admin/recycle", json={"days": 7}).status_code == 200 and c.get("/api/admin/recycle").get_json()["days"] == 7, "تغيير المدة يُحفظ"))
res.append(ok(c.post("/api/admin/recycle", json={"days": 3}).status_code == 400, "مدة غير مسموحة تُرفض"))
d = c.post("/api/admin/recycle", json={"action": "empty"}).get_json()
res.append(ok(d["files"] == 1 and not old.exists() and d["summary"]["total"] == 0, "تفريغ الكل"))
recycle.BIG_BYTES = 1000; (sh / "#recycle").mkdir(exist_ok=True); (sh / "#recycle" / "a").write_bytes(b"q" * 2000); recycle.summary(db, P)
res.append(ok(any(a["title"] == "سلة المحذوفات كبيرة" for a in recycle.alerts(P)), "تنبيه عند كبر السلة"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
