"""البند 69: إزالة الصوت الآلي espeak-ng (ثبّته 2.0.1 للبند 58 الملغى) من الأجهزة عند التحديث، بلا إنترنت،
مع مكتباته فقط، ولا يُلمس جهاز غير مخصص ولا برنامج آخر يحتاج المكتبات."""
import subprocess, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
inst = (APP / "appliance/install.sh").read_text(encoding="utf-8")
a = inst.index("# البند 69:"); block = inst[a:inst.index('\nlog "Creating service user"', a)]
T = Path(tempfile.mkdtemp()); bin_ = T / "bin"; bin_.mkdir()
(bin_ / "dpkg").write_text('#!/bin/sh\nfor m in $INSTALLED; do [ "$2" = "$m" ] && exit 0; done\nexit 1\n')
# apt-get -s purge يطبع «Purg» لكل حزمة ستُزال، ومنها EXTRA إن كان برنامج آخر يعتمد على المكتبات
(bin_ / "apt-get").write_text(f'''#!/bin/sh
echo "$@" >> {T}/apt.log
if [ "$1" = "-s" ]; then shift 2; for p in "$@" $EXTRA; do echo "Purg $p [1.0]"; done; fi
exit 0
''')
for f in ("dpkg", "apt-get"):
    (bin_ / f).chmod(0o755)
ALL = "espeak-ng espeak-ng-data libespeak-ng1 libsonic0 libpcaudio0"
def run(installed, appliance=1, extra=""):
    (T / "apt.log").unlink(missing_ok=True)
    r = subprocess.run(["bash", "-c", "set -euo pipefail\n" + block], capture_output=True, text=True,
                       env={"PATH": f"{bin_}:/usr/bin:/bin", "INSTALLED": installed, "APPLIANCE": str(appliance), "EXTRA": extra})
    calls = (T / "apt.log").read_text().splitlines() if (T / "apt.log").exists() else []
    purge = next((c.split()[2:] for c in calls if c.startswith("purge -y")), None)
    return r.returncode, calls, purge
rc, calls, purge = run(ALL)
res.append(ok(rc == 0 and sorted(purge or []) == sorted(ALL.split()), f"جهاز حدّث إلى 2.0.1: يُزال espeak-ng ومكتباته الأربع ← {purge}"))
res.append(ok(not any(c.startswith(("update", "install")) for c in calls), "بلا إنترنت: لا apt-get update ولا install"))
rc, calls, purge = run("python3 ffmpeg")
res.append(ok(rc == 0 and calls == [], "جهاز بلا espeak-ng (تنصيب 2.0 أو أحدث): لا شيء يحدث"))
rc, calls, purge = run(ALL, appliance=0)
res.append(ok(rc == 0 and calls == [], "تنصيب على ديبيان عادي (ليس الجهاز المخصص): لا يُزال شيء ثبّته صاحب الكمبيوتر"))
rc, calls, purge = run(ALL, extra="orca")
res.append(ok(rc == 0 and purge == ["espeak-ng"], f"برنامج آخر يحتاج المكتبات: يُزال espeak-ng وحده ولا يُلمس الآخر ← {purge}"))
iso = (APP / "installer/build-installer-iso.sh").read_text(encoding="utf-8")
pk = inst[inst.index('PKGS="'):inst.index('"', inst.index('PKGS="') + 6)]
res.append(ok("espeak" not in pk and "espeak" not in iso, "espeak-ng ليس في PKGS ولا في الإيزو (فلا يعود)"))
res.append(ok(subprocess.run(["bash", "-n", str(APP / "appliance/install.sh")]).returncode == 0, "install.sh صياغته سليمة"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
