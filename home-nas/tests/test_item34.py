"""البند 34: قسم «النسخ الاحتياطي» بلا تكرار."""
import re, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1])
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
js = (APP / "static/js/apps/system.js").read_text(encoding="utf-8")
a = js.index("  async backup(sc"); b = re.search(r"\n  (?:async )?\w+\(sc", js[a + 10:]).start() + a + 10
bk = js[a:b]
steps = re.findall(r"<h4>\$\{icon\('\w+'\)\} ([^<]+)</h4>", bk)
res.append(ok(steps == ["١. القرص", "٢. ماذا يُنسخ، ومتى؟", "٣. الحالة", "الاسترجاع من القرص"], f"الترتيب: {steps}"))
res.append(ok(bk.count('name="what"') == 1 and "now-what" not in bk, "«ماذا يُنسخ» مرة واحدة (زر «انسخ الآن» يأخذ اختيار الخطوة ٢)"))
res.append(ok("التلقائي</dt>" not in bk and "<dl" not in bk, "لا سطر «التلقائي» مكرر في الحالة"))
res.append(ok("الوجهة الآن" not in bk and "مساحة القرص</dt>" not in bk, "القرص المختار يظهر في الخطوة ١ فقط"))
res.append(ok("استعراض النسخ" not in bk and "data-browse" in bk and "/backup/${b.dataset.browse}" in bk, "«استعراض» لكل نسخة في جدول الاسترجاع بدل زر منفصل"))
res.append(ok("آخر محاولة" not in bk, "الحالة في سطر واحد"))
res.append(ok("/api/admin/transfer/export" not in bk, "حفظ الإعدادات في ملف ليس هنا (البند 29)"))
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/apps/system.js")]).returncode == 0, "system.js سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
