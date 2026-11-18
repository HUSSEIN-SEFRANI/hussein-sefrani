"""البند 32: شاشة اختيار الأقراص في المثبّت تتمرر (لا يُقص شيء)، والأسهم تنزل إلى المختار، وأزرار الأسفل ظاهرة دائماً."""
import re, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1])
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
css = (APP / "installer/ui/style.css").read_text(encoding="utf-8")
js = (APP / "installer/ui/app.js").read_text(encoding="utf-8")
res.append(ok(re.search(r"main \{[^}]*overflow-y: auto", css) is not None, "الشاشة تتمرر إن طال المحتوى"))
res.append(ok("main > * { flex-shrink: 0; }" in css, "العناصر لا تنضغط فوق بعضها"))
res.append(ok(re.search(r"main \.bottom \{[^}]*position: sticky", css) is not None, "أزرار «تثبيت» و«رجوع» ثابتة في الأسفل"))
res.append(ok('scrollIntoView({ block: "nearest" })' in js, "الأسهم والريموت تُنزل الشاشة إلى العنصر المختار"))
res.append(ok('main.classList.toggle("dense", view === "disk")' in js and "main.dense" in css, "شاشة الأقراص أكثف"))
res.append(ok(subprocess.run(["node", "--check", str(APP / "installer/ui/app.js")]).returncode == 0, "app.js سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
