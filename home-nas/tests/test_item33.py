"""البند 33: انقطاع الكابل: حماية (USB autosuspend وEEE) وبطاقة «فحص الكابل»."""
import os, runpy, subprocess, sys, tempfile, shutil
os.environ["HSEF_EXTRAS_FAKE"] = "1"
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
# ---- الحماية: قاعدة udev وسكربت if-up
g = runpy.run_path(str(APP / "appliance/hsef-extras"), run_name="nomain")
t = Path(tempfile.mkdtemp()); fn = g["wired_hardening"]
fn.__globals__["WIRED_RULES"] = t / "80-hsef-wired.rules"; fn.__globals__["EEE_HOOK"] = t / "if-up.d/hsef-wired"
fn()
rule = (t / "80-hsef-wired.rules").read_text(); hook = t / "if-up.d/hsef-wired"
res.append(ok('SUBSYSTEMS=="usb"' in rule and "power/control" in rule and "$$p" in rule and "$p " not in rule.replace("$$p", ""),
              "محوّل USB إلى Ethernet لا ينام (قاعدة udev، و$$ للمتغير)"))
res.append(ok(os.access(hook, os.X_OK) and subprocess.run(["sh", "-n", str(hook)]).returncode == 0, "سكربت if-up سليم وقابل للتشغيل"))
res.append(ok("--set-eee" in hook.read_text() and "wl*" in hook.read_text(), "EEE يُطفأ على منافذ الكابل فقط (لا الوايفاي)"))
env = {**os.environ, "IFACE": "wlan0", "PATH": "/nonexistent"}
res.append(ok(subprocess.run(["/bin/sh", str(hook)], env=env).returncode == 0, "السكربت لا يفشل أبداً (حتى بلا ethtool)"))
src = (APP / "appliance/hsef-extras").read_text(encoding="utf-8")
res.append(ok("wired_hardening()   # البند 33" in src, "تُطبَّق مع net-fixups (عند كل تحديث)"))
res.append(ok(" ethtool " in (APP / "installer/build-installer-iso.sh").read_text(), "ethtool في حزم الإيزو"))
# ---- الواجهة: /api/admin/net/diag
from homenas import create_app, sysadmin
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
real_run = subprocess.run
def fake_run(cmd, *a, **k):
    if cmd[:3] == ["sudo", "-n", sysadmin.HELPER]:
        cmd = [sys.executable, str(APP / "appliance/hsef-extras"), *cmd[3:]]
    return real_run(cmd, *a, **k)
sysadmin.subprocess.run = fake_run; sysadmin.available = lambda: True
cfg = {"secret_key": "t", "data_dir": str(t / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
d = c.get("/api/admin/net/diag").get_json()
p0 = (d.get("ports") or [{}])[0]
res.append(ok(d["available"] and p0.get("iface") == "enp1s0" and p0.get("downs") == 3 and p0.get("driver") == "r8169", f"الفحص: المنفذ والكرت وعدد الانقطاعات ({p0})"))
res.append(ok("Link is Down" in " ".join(d.get("log", [])), "رسائل النظام عن الانقطاع"))
js = (APP / "static/js/apps/device.js").read_text(encoding="utf-8")
res.append(ok("p.appendChild(cableCard());" in js and "/api/admin/net/diag" in js, "بطاقة «فحص الكابل» في «الشبكة والأجهزة»"))
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/apps/device.js")]).returncode == 0, "device.js سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(t, ignore_errors=True); sys.exit(0 if all(res) else 1)
