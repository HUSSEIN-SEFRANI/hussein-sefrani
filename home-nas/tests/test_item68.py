"""البند 68: «حسابي»: «صورتي وخلفية سطح المكتب» و«تغيير كلمة المرور» بجانب بعضهما."""
import sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
js = (APP / "static/js/apps/system.js").read_text(encoding="utf-8")
css = (APP / "static/css/desktop.css").read_text(encoding="utf-8")
acc = js.split("async account(sc) {")[1].split("\n  },")[0]
res.append(ok('h(\'<div class="acc-row"></div>\')' in acc and "row.append(look, card)" in acc, "البطاقتان في صف واحد: الصورة والخلفية أولاً ثم كلمة المرور"))
res.append(ok(".acc-row { display: flex;" in css and "flex-wrap: wrap" in css.split(".acc-row {")[1].split("}")[0], "وتنزلان تحت بعضهما في الشاشة الضيقة"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
