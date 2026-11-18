"""البند 38: كلمة تأكيد «إدارة التخزين» = 123 في كل اللغات (مثل إعادة ضبط المصنع)."""
import subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import storage
src = (APP / "homenas/storage.py").read_text(encoding="utf-8")
res.append(ok(storage.CONFIRM_WORD == "123", "كلمة التأكيد = 123"))
res.append(ok("confirm_ok(d.get(\"confirm\"))" in src, "تقبل 123 و١٢٣ و۱۲۳ والمسافات"))
js = (APP / "static/js/apps/system.js").read_text(encoding="utf-8")
res.append(ok(js.count('inputmode="numeric" dir="ltr" maxlength="6"') == 2, "حقل التأكيد رقمي في القسمين"))
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/apps/system.js")]).returncode == 0, "system.js سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
