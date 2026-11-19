"""البند 48: شعار السيرفر عند الإقلاع، وإقلاع أسرع، و«سرعة الإقلاع» في لوحة التحكم."""
import subprocess, sys, tempfile, shutil, re
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
T = Path(tempfile.mkdtemp())
for p in (APP / "appliance/splash").glob("logo-*.png"):
    shutil.copy(p, T)
r = subprocess.run([sys.executable, str(APP / "appliance/hsef-splash"), "--test", str(T)], capture_output=True, text=True)
raw = (T / "fb.raw").read_bytes() if (T / "fb.raw").exists() else b""
res.append(ok(r.returncode == 0 and len(raw) == 1280 * 720 * 4, f"يرسم الإطار على شاشة 1280×720 ({r.stdout.strip() or r.stderr[-200:]})"))
px = lambda x, y: tuple(raw[(y * 1280 + x) * 4:(y * 1280 + x) * 4 + 3][::-1])
res.append(ok(px(5, 5) == (0x14, 0x0A, 0x26) and px(1275, 715) == (0x14, 0x0A, 0x26), "الخلفية بلون الشعار الداكن"))
logo = {px(x, 360) for x in range(300, 980, 4)}
res.append(ok(len(logo) > 10 and any(c[1] > 200 for c in logo), "الشعار في وسط الشاشة"))
cx, cy = map(int, re.findall(r"\((\d+), (\d+)", r.stdout)[0]) if "(" in r.stdout else (0, 0)
res.append(ok(cy > 400 and px(cx - 30, cy + 2) != (0x14, 0x0A, 0x26), "النقاط المتحركة تحت الشعار"))
src = (APP / "appliance/hsef-splash").read_text(encoding="utf-8")
res.append(ok("hsef_installer" in src and "KD_GRAPHICS" in src and '"hsef-tv.service") == "active"' in src and "MAX_S" in src,
              "لا يعمل في المثبّت، ويمنع نص النواة فوقه، ويتوقف عندما تفتح شاشة التلفاز"))
sh = (APP / "appliance/install.sh").read_text(encoding="utf-8")
res.append(ok("hsef-splash.service" in sh and "WantedBy=sysinit.target" in sh and "/usr/local/share/hsef-splash" in sh,
              "install.sh يثبّت الشعار (فيصل إلى الأجهزة الموجودة مع التحديث)"))
res.append(ok("TimeoutStartSec=15" in sh and "WAIT_ONLINE_TIMEOUT=10" in sh, "انتظار الشبكة عند الإقلاع 15 ثانية على الأكثر"))
res.append(ok("GRUB_TIMEOUT_STYLE=hidden" in sh and "vt.global_cursor_default=0" in sh and 'NEED_GRUB' in sh, "قائمة GRUB مخفية وبلا مؤشر يومض"))
res.append(ok(subprocess.run(["bash", "-n", str(APP / "appliance/install.sh")]).returncode == 0, "install.sh سليم"))
# إقلاع وهمي: تجربة sed على ملف grub
g = T / "grub"; g.write_text('GRUB_DEFAULT=0\nGRUB_TIMEOUT=2\nGRUB_CMDLINE_LINUX_DEFAULT="quiet loglevel=3"\n')
block = sh[sh.index("    if [ -f /etc/default/grub ]; then\n        G=/etc/default/grub"):]
block = block[:block.index("    fi\n") + 7].replace("/etc/default/grub", str(g))
for _ in range(2):
    subprocess.run(["bash", "-c", block + 'echo "N=${NEED_GRUB:-0}"'], capture_output=True, text=True)
gt = g.read_text()
res.append(ok("GRUB_TIMEOUT=1" in gt and gt.count("GRUB_TIMEOUT_STYLE=hidden") == 1 and gt.count("vt.global_cursor_default=0") == 1,
              "تعديل GRUB مرة واحدة فقط ولو تكرر التحديث"))
from homenas.sysadmin import parse_boot
b = parse_boot("Startup finished in 8.112s (firmware) + 1.002s (loader) + 2.345s (kernel) + 41.505s (userspace) = 52.964s\ngraphical.target reached",
               "30.012s ifupdown-wait-online.service\n 1min 2.100s docker.service\n812ms homenas.service\n")
res.append(ok(b["total"] == 52.96 and b["parts"]["userspace"] == 41.51 and b["parts"]["firmware"] == 8.11, f"قراءة مدة الإقلاع ← {b['total']} ث"))
res.append(ok([x["secs"] for x in b["slow"]] == [30.01, 62.1, 0.81] and b["slow"][0]["name"] == "انتظار الشبكة", "أبطأ الخدمات بأسماء عربية"))
js = (APP / "static/js/apps/device.js").read_text(encoding="utf-8")
res.append(ok("bootCard()" in js and "/api/admin/boot-time" in js and subprocess.run(["node", "--check", str(APP / "static/js/apps/device.js")]).returncode == 0,
              "بطاقة «سرعة الإقلاع» في «الشبكة والأجهزة»"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
