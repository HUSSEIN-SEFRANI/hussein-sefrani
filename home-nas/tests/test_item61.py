"""البند 61: شاشات توقف جديدة (التقويم، الطبيعة، تحت الماء، ثلج، القمر، ساعة كبيرة) ومعاينة صغيرة متحركة عند الاختيار."""
import re, subprocess, sys, json
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
css = (APP / "static/css/tv.css").read_text(encoding="utf-8")
adm = (APP / "static/js/apps/tvadmin.js").read_text(encoding="utf-8")
from homenas import tv
NEW = ["calendar", "nature", "sea", "snow", "moon", "clock"]
kinds = re.findall(r'\["(\w+)", "[^"]+", "[^"]+"\]', js.split("const SAVERS")[1].split("];")[0])
res.append(ok(all(k in kinds for k in NEW) and set(kinds) == set(tv.SAVER_KINDS), f"الشاشات في التلفاز والسيرفر معاً ({len(kinds)})"))
fn = js.split("function startSaver")[1].split("};")[0]
res.append(ok(all(f"{k}: sv" in fn for k in NEW), "لكل شاشة جديدة رسمها"))
res.append(ok(all(f'value="{k}"' in adm for k in NEW), "وفي لوحة التحكم ← وضع التلفاز ← المظهر"))
res.append(ok("sv-mini" in js and ".saver.sv-mini" in css and "card.dataset.k === \"mix\"" in js, "معاينة صغيرة متحركة للشاشة التي عليها التركيز"))
res.append(ok(not re.search(r"https?://", js.split("البند 61: شاشات توقف جديدة")[1].split("let wakeLock")[0]), "كلها بلا إنترنت"))
# المناسبات الهجرية وطور القمر
code = js.split("let fmtHijriNum = null;")[1].split("const occDays")[0]
moon = "const MOON_NAMES" + js.split("const MOON_NAMES")[1].split("function svMoon")[0]
out = subprocess.run(["node", "-e", "let fmtHijriNum=null;" + code + moon + """
const o = nextOccasions(5), p = moonPhase(new Date(Date.UTC(2026, 10, 24, 12))), q = moonPhase(new Date(Date.UTC(2026, 10, 10, 12)));
console.log(JSON.stringify({o, p, q}));"""], capture_output=True, text=True)
d = json.loads(out.stdout or "{}")
names = [x["name"] for x in d.get("o", [])]
res.append(ok("رمضان المبارك" in names and "عيد الأضحى" in names and all(x["days"] < 390 for x in d["o"]), f"المناسبات القادمة: {names}"))
res.append(ok(0.4 < d.get("p", 0) < 0.6 and (d.get("q", 0.5) < 0.08 or d.get("q", 0.5) > 0.92), f"طور القمر: بدر 24/11/2026 ({d.get('p', 0):.2f})، ومحاق 10/11/2026 ({d.get('q', 0):.2f})"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
