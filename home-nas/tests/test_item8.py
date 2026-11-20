"""البند 8: مكتبة التعريفات: كرت الشاشة وتسريع الفيديو (VA-API)، وأجهزة PCI بلا تعريف (وايفاي 6/7، كروت الشبكة)، والكاميرات."""
import importlib.machinery, importlib.util, json, os, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
HX = APP / "appliance/hsef-extras"
d = json.loads(subprocess.run([sys.executable, str(HX), "hw-diag"], capture_output=True, text=True, env={**os.environ, "HSEF_EXTRAS_FAKE": "1"}).stdout)
res.append(ok(all(k in d for k in ("gpu", "vaapi", "nodriver", "cameras")), "الفحص فيه: كرت الشاشة، تسريع الفيديو، أجهزة بلا تعريف، الكاميرات"))
loader = importlib.machinery.SourceFileLoader("hx", str(HX)); spec = importlib.util.spec_from_loader("hx", loader)
hx = importlib.util.module_from_spec(spec); loader.exec_module(hx)
SAMPLE = """libva info: VA-API version 1.22.0
vainfo: Driver version: Intel iHD driver for Intel(R) Gen Graphics - 24.4.4 ()
vainfo: Supported profile and entrypoints
      VAProfileH264Main               :	VAEntrypointVLD
      VAProfileH264Main               :	VAEntrypointEncSliceLP
      VAProfileH264High               :	VAEntrypointVLD
      VAProfileHEVCMain               :	VAEntrypointVLD
      VAProfileHEVCMain10             :	VAEntrypointEncSliceLP
      VAProfileVP9Profile0            :	VAEntrypointVLD
      VAProfileAV1Profile0            :	VAEntrypointVLD
      VAProfileJPEGBaseline           :	VAEntrypointEncPicture
      VAProfileNone                   :	VAEntrypointVideoProc
"""
class R: stdout = SAMPLE; stderr = ""
_real_run = subprocess.run
import types; hx.subprocess = types.SimpleNamespace(**{k: getattr(subprocess, k) for k in dir(subprocess) if not k.startswith("__")})
hx.subprocess.run = lambda *a, **k: R()
hx.Path = type(Path())   # كما هو
hx.shutil = types.SimpleNamespace(which=lambda n: "/usr/bin/" + n)
dri = Path("/dev/dri")
if any(dri.glob("renderD*")):
    v = hx.vaapi_info()
else:   # بيئة الاختبار بلا كرت: نختبر القارئ مباشرة بمسار وهمي
    orig = hx.Path
    class FakeP(type(Path())):
        def exists(self): return True if str(self) == "/dev/dri" else super().exists()
        def glob(self, pat): return iter([orig("/dev/dri/renderD128")]) if str(self) == "/dev/dri" else super().glob(pat)
    hx.Path = FakeP
    v = hx.vaapi_info()
    hx.Path = orig
res.append(ok(v["decode"] == ["H264", "HEVC", "VP9", "AV1"] and v["encode"] == ["H264", "HEVC", "JPEG"] and "iHD" in v["driver"],
              f"قراءة vainfo: تشغيل {v['decode']}، وترميز {v['encode']}"))
iso = (APP / "installer/build-installer-iso.sh").read_text(encoding="utf-8")
res.append(ok(all(p in iso for p in ("intel-media-va-driver-non-free", "i965-va-driver", "mesa-va-drivers", "vainfo", "pciutils")), "الإيزو فيه تعريفات تسريع الفيديو (Intel القديم والجديد، وAMD)"))
src = HX.read_text(encoding="utf-8")
res.append(ok("need += [pk for pk in va_packages()" in src and '"intel-media-va-driver-non-free", "i965-va-driver"' in src and '"mesa-va-drivers"' in src,
              "«تثبيت التعريفات الناقصة» يضيف تعريف تسريع الفيديو حسب كرت الشاشة (للأجهزة الموجودة)"))
sh = (APP / "appliance/install.sh").read_text(encoding="utf-8")
res.append(ok("usermod -aG $g homenas" in sh, "برنامج السيرفر يستطيع استعمال كرت الشاشة (مجموعة render)"))
tvv = (APP / "homenas/tvvideo.py").read_text(encoding="utf-8")
i_va, i_x264 = tvv.find('"h264_vaapi"'), tvv.find('"libx264"')
res.append(ok(0 < i_va < i_x264 and "def vaapi_node" in tvv and 'not in HDR else ""' in tvv, "تجهيز الفيديو بكرت الشاشة أولاً، والمعالج احتياطاً (وفيديو HDR بالمعالج)"))
from homenas import tvvideo
tvvideo._VAAPI.clear(); n = tvvideo.vaapi_node()
res.append(ok(isinstance(n, str), f"فحص كرت الشاشة لا ينهار بلا كرت ← «{n}»"))
dj = (APP / "static/js/apps/device.js").read_text(encoding="utf-8")
res.append(ok("تسريع الفيديو بكرت الشاشة" in dj and "بطاقة وايفاي" in dj and "كاميرا USB" in dj and subprocess.run(["node", "--check", str(APP / "static/js/apps/device.js")]).returncode == 0,
              "«تشخيص الأجهزة» يعرض كل ذلك مع ما يجب فعله"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
