"""البند 35: كلمة تأكيد إعادة ضبط المصنع = 123 في كل اللغات."""
import sys
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from homenas import transfer
res.append(ok(transfer.CONFIRM_WORD == "123", "كلمة التأكيد = 123"))
for t in ("123", " 123 ", "١٢٣", "۱۲۳", "1 2 3"):
    res.append(ok(transfer.confirm_ok(t), f"مقبول: {t!r}"))
for t in ("", "12", "1234", "إعادة ضبط", None):
    res.append(ok(not transfer.confirm_ok(t), f"مرفوض: {t!r}"))
js = (APP / "static/js/apps/system.js").read_text(encoding="utf-8")
res.append(ok('inputmode="numeric"' in js and "[٠-٩]" in js, "الحقل رقمي، والواجهة تقبل الأرقام العربية"))
res.append(ok('"اكتب «123» للتأكيد":' in (APP / "static/js/i18n-dict.js").read_text(encoding="utf-8"), "الجملة مترجمة"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
