"""البند 60: «وضع التلفاز» في لوحة التحكم مقسّم إلى تبويبات، وزر «حفظ» واحد يحفظ أجزاء الإعدادات الثلاثة."""
import re, sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
js = (APP / "static/js/apps/tvadmin.js").read_text(encoding="utf-8")
css = (APP / "static/css/desktop.css").read_text(encoding="utf-8")
tabs = re.findall(r"\['(\w+)', '[^']+'\]", js.split("const TV_TABS")[1].split("];")[0])
res.append(ok(tabs == ["screen", "people", "apps", "video", "look", "prayer", "daily"], f"سبعة تبويبات: {tabs}"))
res.append(ok(all(f'data-p="{p}"' in js for p in ("look", "prayer", "daily")) and js.split("function settingsCard")[1].count('data-x="save"') == 1, "أجزاء الإعدادات الثلاثة في نموذج واحد بزر «حفظ» واحد"))
res.append(ok("set.dataset.part = id" in js and ".tv-set[data-part=prayer] [data-p=prayer]" in css, "يظهر جزء التبويب المفتوح فقط"))
res.append(ok("let tvTab" in js and "open(tvTab)" in js, "التبويب المفتوح يبقى بعد الحفظ"))
res.append(ok('<h3 class="tv-h">' not in js.split("export async function tvSection")[1].split("\n}\n")[0], "لا عناوين طويلة في صفحة واحدة"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
