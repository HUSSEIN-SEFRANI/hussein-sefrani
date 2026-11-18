import os, sys, tempfile, shutil, sqlite3, json, runpy
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
tmp = Path(tempfile.mkdtemp()); dbp = tmp / "old.db"
# قاعدة بيانات «قديمة» بلا العمود الجديد، فيها المجلدات الأربعة ومجلد عادي
from homenas import core
c = sqlite3.connect(dbp); c.executescript(core.SCHEMA.replace("smb TEXT", "x TEXT"))
for n in ("الألعاب", "التعليم", "القرآن الصوتي", "ذكريات العائلة", "أفلام"):
    c.execute("INSERT INTO folders(name,path,created_at) VALUES (?,?, 'x')", (n, f"/srv/{n}"))
c.commit(); c.close()
core.init_db(dbp)
c = sqlite3.connect(dbp); c.row_factory = sqlite3.Row
smb = {r["name"]: r["smb"] for r in c.execute("SELECT name, smb FROM folders")}
res.append(ok(smb == {"الألعاب": "admin", "التعليم": "admin", "القرآن الصوتي": "admin", "ذكريات العائلة": "admin", "أفلام": "all"}, f"بعد التحديث: الأربعة للمدير فقط، والباقي كما هو: {smb}"))
c.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('baba','x',1,'x'), ('kid','x',0,'x')")
for fid in (1, 5): c.execute("INSERT INTO folder_perms VALUES (?, 2, 'ro')", (fid,))
c.commit()
from homenas.network import Network as NetworkManager
class P: pass
p = P(); p.data = tmp; p.cache = tmp; p.db = dbp
nm = NetworkManager.__new__(NetworkManager); nm.paths = p; nm.tv_root = tmp
cfg = nm.build_config(c)
sh = {s["name"]: s for s in cfg["smb"]["shares"]}
res.append(ok(sh["الألعاب"]["read"] == [] and sh["أفلام"]["read"] == [2], "الإعدادات: «الألعاب» بلا مستخدمين (المدير فقط)، «أفلام» حسب الصلاحيات"))
g = runpy.run_path(str(APP / "appliance/hsef-net"), run_name="nomain")
conf = g["render_smb"]({**cfg, "smb": {**cfg["smb"], "users": [{"id": 1, "name": "baba", "admin": True}, {"id": 2, "name": "kid", "admin": False}]}})
def block(n):
    i = conf.index(f"[{n}]"); j = conf.find("\n[", i + 1); return conf[i:j if j > 0 else None]
vu = lambda n: [l for l in block(n).splitlines() if "valid users" in l][0]
res.append(ok("hsef2" not in vu("الألعاب") and "hsef1" in vu("الألعاب"), f"Samba: «الألعاب» للمدير فقط ({vu('الألعاب').strip()})"))
res.append(ok("hsef2" in vu("أفلام"), f"Samba: «أفلام» يراه المستخدم ({vu('أفلام').strip()})"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
