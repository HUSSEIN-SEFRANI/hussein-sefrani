"""البند 40: قرص الشبكة يظهر فارغاً في ويندوز والآيفون، و«home» لا يُفتح (بينما المسار المباشر يعمل)."""
import os, runpy, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1])
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
tmp = Path(tempfile.mkdtemp())
os.environ["HSEF_ROOT"] = str(tmp / "root"); os.environ["HSEF_NO_SYSTEMD"] = "1"
g = runpy.run_path(str(APP / "appliance/hsef-net"), run_name="nomain")
class R:
    stdout, stderr, returncode = "", "", 0
g["run"].__globals__["run"] = lambda *a, **k: R()
data = tmp / "data"; (data / "homes" / "baba").mkdir(parents=True); (data / "homes" / "kid").mkdir()
users = [{"id": 1, "name": "baba", "admin": True}, {"id": 2, "name": "kid", "admin": False}]
cfg = {"data_dir": str(data), "server_name": "HOME ANAB", "smb": {"enabled": False, "users": users, "shares": [], "known_ids": [1, 2]}}
conf = g["render_smb"](cfg)
res.append(ok("access based share enum" not in conf.replace("«access based share enum»", ""), "لا إخفاء للمجلدات من القائمة (كان يخفيها كلها)"))
res.append(ok("[home]" in conf and "[ANAB SERVER FILE]" in conf, "المجلد الشخصي و«ANAB SERVER FILE» في القائمة"))
g["apply_smb"](cfg)
links = Path(os.environ["HSEF_ROOT"]) / "var/lib/homenas/smb-homes"
res.append(ok(os.readlink(links / "hsef1") == str(data / "homes" / "baba") and os.readlink(links / "hsef2") == str(data / "homes" / "kid"),
              "رابط المجلد الشخصي باسم الحساب الداخلي (hsef1 ← baba)، فيُفتح «home» مهما كان %U"))
res.append(ok(os.readlink(links / "Baba") == str(data / "homes" / "baba"), "وما زال يعمل بالاسم المكتوب (Baba/baba)"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
