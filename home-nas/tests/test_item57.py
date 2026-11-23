"""البند 57: الجهاز لا يتصل وحده بأي جهة خارجية.
متصفح التلفاز لا يصل إلا إلى السيرفر نفسه (وسيط ميت + خدمات Google الخلفية مطفأة)، وتحديثات الأمان التلقائية والطقس
مطفأة افتراضياً مع خيار لكل منهما في لوحة التحكم، والتنصيب/التحديث لا يتصل بديبيان إذا كانت كل الحزم مثبتة."""
import collections, http.server, importlib.machinery, importlib.util, json, os, re, shutil, subprocess, sys, tempfile, threading, time
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
HX = APP / "appliance/hsef-extras"
loader = importlib.machinery.SourceFileLoader("hx", str(HX))
spec = importlib.util.spec_from_loader("hx", loader); hx = importlib.util.module_from_spec(spec); loader.exec_module(hx)
src = HX.read_text(encoding="utf-8")
T = Path(tempfile.mkdtemp())

# ------------------------------------------------------------------ متصفح التلفاز
fl = hx.CHROMIUM_FLAGS.split()
res.append(ok("--proxy-server=http://127.0.0.1:9" in fl and "--proxy-bypass-list=127.0.0.1;localhost;[::1]" in fl and "<-loopback>" not in hx.CHROMIUM_FLAGS
              and {"--disable-background-networking", "--disable-component-update"} <= set(fl),
              "علامات المتصفح: وسيط ميت لكل ما هو خارج الجهاز، والسيرفر نفسه يتجاوزه، وخدمات Google الخلفية مطفأة"))
res.append(ok('"ProxySettings": {"ProxyMode": "fixed_servers", "ProxyServer": TV_PROXY, "ProxyBypassList": TV_PROXY_BYPASS}' in src
              and '"ComponentUpdatesEnabled": False' in src and '"SafeBrowsingProtectionLevel": 0' in src and '"URLBlocklist": ["*"]' in src,
              "سياسات المتصفح (tv_write) فيها الشيء نفسه"))

chrome = next((c for c in ("/opt/pw-browsers/chromium", shutil.which("chromium") or "", shutil.which("chromium-browser") or "") if c and os.path.exists(c)), None)
if not chrome:
    res.append(ok(True, "(لا يوجد Chromium هنا: فُحصت العلامات فقط)"))
else:
    got = []
    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            got.append(self.path); b = b"<!doctype html><meta charset=utf-8><title>tv</title><h1>HOME ANAB</h1>"
            self.send_response(200 if self.path == "/tv" else 404); self.send_header("Content-Type", "text/html"); self.end_headers()
            self.wfile.write(b)
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H); port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    keep = [f for f in fl if not f.startswith(("--kiosk", "--ozone-platform", "--user-data-dir"))]
    log = T / "net.json"
    env = {k: v for k, v in os.environ.items() if "proxy" not in k.lower()}
    p = subprocess.Popen([chrome, "--headless=new", "--no-sandbox", f"--user-data-dir={T / 'prof'}", f"--log-net-log={log}", *keep,
                          f"http://127.0.0.1:{port}/tv"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(45); p.terminate(); p.wait(20); srv.shutdown()
    t = log.read_text(errors="replace").rstrip()
    d = json.loads(t if t.endswith("}") else t.rstrip(",") + "]}")
    N = {v: k for k, v in d["constants"]["logEventTypes"].items()}
    out = collections.Counter()
    for e in d["events"]:
        a = (e.get("params") or {}).get("address")
        if N.get(e["type"]) in ("TCP_CONNECT_ATTEMPT", "UDP_CONNECT") and a:
            out[a] += 1
    ext = [a for a in out if not a.startswith(("127.", "[::1]"))]
    res.append(ok("/tv" in got, f"صفحة التلفاز تُفتح من السيرفر نفسه ← {got[:2]}"))
    res.append(ok(not ext, f"Chromium بإعدادات التلفاز 45 ثانية: لا اتصال ولا بحث DNS خارج الجهاز ← {ext or 'لا شيء'}"))

# ------------------------------------------------------------------ تحديثات الأمان التلقائية
env = {"HSEF_EXTRAS_FAKE": "1", "PATH": "/usr/bin:/bin", "HSEF_APT_AUTO": str(T / "20auto-upgrades"), "HSEF_APT_CHOICE": str(T / "choice")}
st = lambda: json.loads(subprocess.run([sys.executable, str(HX), "sys-status"], capture_output=True, text=True, env=env).stdout)
s0 = st()
subprocess.run([sys.executable, str(HX), "auto-updates", "on"], env=env, check=True); s1 = st()
on_txt = (T / "20auto-upgrades").read_text(); on_choice = (T / "choice").read_text().strip()
subprocess.run([sys.executable, str(HX), "auto-updates", "off"], env=env, check=True); s2 = st()
res.append(ok(s0["auto_updates"] is False and s1["auto_updates"] is True and s2["auto_updates"] is False
              and 'Unattended-Upgrade "1"' in on_txt and on_choice == "1" and (T / "choice").read_text().strip() == "0",
              "الخيار في لوحة التحكم يشغّل تحديثات الأمان ويطفئها (والحالة تظهر في sys-status)"))

# ------------------------------------------------------------------ install.sh: لا اتصال بديبيان إذا كان كل شيء مثبتاً، والاختيار يبقى
inst = (APP / "appliance/install.sh").read_text(encoding="utf-8")
cut = lambda a, b: inst[inst.index(a):inst.index(b, inst.index(a))]
apt_part = cut('PKGS="', "# تعريفات إضافية")
fw_part = cut("# تعريفات إضافية", "\n\n")
au_part = cut("# البند 57 (طلب صاحب المشروع)", "\nEOF\n") + "\nEOF\n"
au_part = au_part.replace("/etc/apt/apt.conf.d/20auto-upgrades", str(T / "sh-auto")).replace("/etc/homenas/auto-updates", str(T / "sh-choice"))
bin_ = T / "bin"; bin_.mkdir()
(bin_ / "dpkg").write_text('#!/bin/sh\nfor m in $MISSING_PKGS; do [ "$2" = "$m" ] && exit 1; done\nexit 0\n')
(bin_ / "apt-get").write_text(f'#!/bin/sh\necho "$@" >> {T}/apt.log\nexit 0\n')
for f in ("dpkg", "apt-get"):
    (bin_ / f).chmod(0o755)
def sh(missing="", choice=None):
    (T / "apt.log").unlink(missing_ok=True); (T / "sh-choice").unlink(missing_ok=True)
    if choice is not None:
        (T / "sh-choice").write_text(choice + "\n")
    script = "set -euo pipefail\nlog(){ :; }\nretry(){ \"$@\"; }\n" + apt_part + fw_part + "\n" + au_part
    r = subprocess.run(["bash", "-c", script], capture_output=True, text=True,
                       env={"PATH": f"{bin_}:/usr/bin:/bin", "MISSING_PKGS": missing})
    calls = (T / "apt.log").read_text() if (T / "apt.log").exists() else ""
    return r.returncode, calls, (T / "sh-auto").read_text()
rc, calls, auto = sh()
res.append(ok(rc == 0 and calls == "" and 'Unattended-Upgrade "0"' in auto,
              f"تنصيب/تحديث والحزم كلها مثبتة: لا اتصال بديبيان، وتحديثات الأمان مطفأة افتراضياً ← {calls.strip() or 'لا أوامر apt'}"))
rc, calls, auto = sh(choice="1")
res.append(ok(rc == 0 and 'Unattended-Upgrade "1"' in auto, "إذا شغّلها المدير فالتحديث لا يطفئها"))
rc, calls, auto = sh(missing="python3-venv")
res.append(ok(rc == 0 and calls.startswith("update"), "إذا نقصت حزمة فقط: يتصل بديبيان ليثبّتها (كما كان)"))

# ------------------------------------------------------------------ الطقس
from homenas import create_app
from homenas.core import connect, Paths, get_setting
from werkzeug.security import generate_password_hash
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,created_at) VALUES ('baba',?,1,'adult','x')", (generate_password_hash("p"),)); db.commit()
from homenas.tv import tv_settings
with app.test_request_context():
    w0 = tv_settings()["weather"]
admin = app.test_client()
with admin.session_transaction() as s:
    s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
r = admin.post("/api/admin/weather", json={"on": True})
with app.test_request_context():
    w1, raw = tv_settings()["weather"], get_setting("tv_weather")
res.append(ok(w0 is False and r.status_code == 200 and w1 is True and raw == "1", "الطقس مطفأ افتراضياً، والخيار في لوحة التحكم يشغّله (نفس إعداد التلفاز)"))
res.append(ok(app.test_client().post("/api/admin/weather", json={"on": True}).status_code in (401, 403)
              and "/api/admin/auto-updates" in {r.rule for r in app.url_map.iter_rules()}, "الخياران للمدير فقط"))
js = (APP / "static/js/apps/device.js").read_text(encoding="utf-8")
res.append(ok('name="au"' in js and 'name="wx"' in js and "/api/admin/auto-updates" in js and "/api/admin/weather" in js
              and subprocess.run(["node", "--check", str(APP / "static/js/apps/device.js")]).returncode == 0,
              "الخياران في لوحة التحكم ← الجهاز ← «الوقت والعمل بدون إنترنت»"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
