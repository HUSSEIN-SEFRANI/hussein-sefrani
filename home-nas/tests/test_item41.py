"""البند 41: «FileNotFoundError: docker»: المحرك يُثبَّت بلا أمر docker (حزمة docker-cli في ديبيان 13)."""
import io, os, runpy, shutil, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1])
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
src = (APP / "appliance/hsef-apps").read_text(encoding="utf-8")
res.append(ok('("docker-cli", "docker-compose") if apt_has(p)' in src, "التثبيت يضيف docker-cli (إن وُجدت في ديبيان)"))
import tempfile; T = tempfile.mkdtemp()
os.environ.pop("HSEF_APPS_FAKE", None); os.environ.update(HSEF_APPS_TEST="1", HSEF_APPS_CATALOG=str(APP / "apps/catalog.json"), HSEF_APPS_LOGS=T, HSEF_APPS_ROOT=T)
g = runpy.run_path(str(APP / "appliance/hsef-apps"), run_name="nomain")
G = g["cmd_check"].__globals__
G["shutil"].which = lambda n: None if n == "docker" else "/usr/bin/" + n   # المحرك بلا أمر docker
calls = []
real = subprocess.run
G["subprocess"].run = lambda cmd, *a, **k: calls.append(cmd) or real(["true"], *a, **{x: y for x, y in k.items() if x != "env"})
import contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    g["cmd_check"]()
res.append(ok('"docker": false' in buf.getvalue() and not any(c[0] == "docker" for c in calls),
              f"بلا أمر docker: «غير مثبت» (فيُثبَّت docker-cli) بلا انهيار: {buf.getvalue().strip()}"))
res.append(ok(g["docker_ok"]() is False and "docker-cli" in g["docker_error"](), "docker_ok/docker_error لا ينهاران"))
G["time"].sleep = lambda s: None
lp = Path(T) / "engine.log"
with open(lp, "w+") as log:
    w = g["wait_engine"](log, seconds=3)
res.append(ok(w is False and "docker-cli missing" in lp.read_text(), "انتظار المحرك يكتب السبب في السجل"))
res.append(ok("except FileNotFoundError as exc" in src, "أي أمر ناقص ← رسالة قصيرة لا تتبّع Python"))
G["subprocess"].run = real
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
