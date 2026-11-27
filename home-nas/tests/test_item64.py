"""البند 64: زر الإطفاء في ريموت USB أو لوحة مفاتيح USB/بلوتوث لا يطفئ السيرفر (زر الجهاز نفسه يبقى)."""
import re, sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
sh = (APP / "appliance/install.sh").read_text(encoding="utf-8")
rule = re.search(r"71-homenas-remote-power\.rules <<'EOF'\n(.*?)\nEOF", sh, re.S)
r = rule.group(1) if rule else ""
res.append(ok('ENV{ID_BUS}=="usb|bluetooth"' in r and 'TAG-="power-switch"' in r and 'KERNEL=="event*"' in r, "قاعدة udev تنزع «زر التشغيل» عن أجهزة الإدخال USB والبلوتوث"))
res.append(ok("acpi" not in r.lower() and "platform" not in r.lower(), "زر الإطفاء في الجهاز نفسه (ACPI) لا يتأثر"))
res.append(ok("udevadm trigger --subsystem-match=input --action=change" in sh, "تُطبَّق فوراً بعد التحديث بلا إعادة تشغيل"))
blk = sh.split('if [ "$APPLIANCE" -eq 1 ]; then\n    # v1.9.7 (البند 5)')[1].split("\nfi\n")[0] if "(البند 5)" in sh else ""
res.append(ok("71-homenas-remote-power" in blk, "داخل إعداد الجهاز (APPLIANCE) فيصل مع التحديث"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
