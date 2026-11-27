"""البند 56: صوت HDMI في الأجهزة التي فيها صوت HDMI على كرت منفصل (AMD مثل HP ProDesk 405 G6):
المخرج الافتراضي يصير التلفاز (لا سماعة الجهاز)، والأصوات الجارية تنتقل إليه، و5.1/7.1 مخفية، ورسائل التعريفات غير المهمة لا تظهر."""
import importlib.machinery, importlib.util, json, re, subprocess, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
HX = APP / "appliance/hsef-extras"
loader = importlib.machinery.SourceFileLoader("hx", str(HX))
spec = importlib.util.spec_from_loader("hx", loader); hx = importlib.util.module_from_spec(spec); loader.exec_module(hx)
hx.TV_AUDIO_CHOICE = Path(tempfile.mkdtemp()) / "none.json"   # بلا اختيار يدوي

HDMI, ANALOG = "alsa_card.pci-0000_0a_00.1", "alsa_card.pci-0000_0a_00.6"
def setup(props=True):
    st = {"profile": {HDMI: "off", ANALOG: "output:analog-stereo+input:analog-stereo"}, "default": "alsa_output.pci-0000_0a_00.6.analog-stereo",
          "inputs": [{"index": 5, "sink": 60}], "calls": []}
    port = lambda avail, profs: {"type": "HDMI", "availability": avail, "profiles": profs}
    cards = [
        {"index": 50, "name": HDMI, "properties": {"alsa.card": "0"} if props else {},
         "profiles": {"output:hdmi-stereo": {"description": "Digital Stereo (HDMI) Output", "priority": 5900},
                      "output:hdmi-stereo-extra1": {"description": "Digital Stereo (HDMI 2) Output", "priority": 5700},
                      "output:hdmi-surround-extra1": {"description": "Digital Surround 5.1 (HDMI 2) Output", "priority": 800},
                      "off": {"description": "Off"}},
         "ports": {"hdmi-output-0": port("not available", ["output:hdmi-stereo"]),
                   "hdmi-output-1": port("available", ["output:hdmi-stereo-extra1", "output:hdmi-surround-extra1"])}},
        {"index": 51, "name": ANALOG, "properties": {"alsa.card": "1"} if props else {},
         "profiles": {"output:analog-stereo+input:analog-stereo": {"description": "Analog Stereo Duplex", "priority": 6565}},
         "ports": {"analog-output-speaker": {"type": "Speaker", "availability": "unknown", "profiles": ["output:analog-stereo+input:analog-stereo"]}}},
    ]
    def pactl(*a):
        st["calls"].append(a)
        if a[:3] == ("-f", "json", "list"):
            if a[3] == "cards":
                return json.dumps([{**c, "active_profile": st["profile"][c["name"]]} for c in cards])
            if a[3] == "sinks":   # مثل pactl الحقيقي: لا حقل «card» في المخارج
                out = [{"index": 60, "name": "alsa_output.pci-0000_0a_00.6.analog-stereo", "properties": {"alsa.card": "1"} if props else {}}]
                if st["profile"][HDMI].startswith("output:hdmi"):
                    out.append({"index": 70, "name": "alsa_output.pci-0000_0a_00.1." + st["profile"][HDMI][7:], "properties": {"alsa.card": "0"} if props else {}})
                return json.dumps(out)
            if a[3] == "sink-inputs":
                return json.dumps(st["inputs"])
        if a[0] == "set-card-profile":
            st["profile"][a[1]] = a[2]
        if a[0] == "get-default-sink":
            return st["default"] + "\n"
        if a[0] == "set-default-sink":
            st["default"] = a[1]
        if a[0] == "move-sink-input":
            for si in st["inputs"]:
                if str(si["index"]) == a[1]:
                    si["sink"] = 70
        return ""
    return st, pactl

for props in (True, False):
    st, pactl = setup(props)
    r = hx.audio_pick(pactl)
    how = "بخصائص ALSA" if props else "بالاسم فقط"
    res.append(ok(st["profile"][HDMI] == "output:hdmi-stereo-extra1", f"({how}) يختار ستيريو على المنفذ الموصول فعلاً (HDMI 2)، لا 5.1"))
    res.append(ok(st["default"] == "alsa_output.pci-0000_0a_00.1.hdmi-stereo-extra1",
                  f"({how}) المخرج الافتراضي صار التلفاز، لا سماعة الجهاز ← {st['default']}"))
    res.append(ok(st["inputs"][0]["sink"] == 70, f"({how}) الصوت الجاري (المتصفح) انتقل إلى التلفاز"))

src = HX.read_text(encoding="utf-8")
res.append(ok('"surround": "surround" in name' in src, "قائمة المخارج تعلّم 5.1/7.1"))
tv = (APP / "static/js/tv.js").read_text(encoding="utf-8"); adm = (APP / "static/js/apps/tvadmin.js").read_text(encoding="utf-8")
res.append(ok("o.surround && !o.active" in tv and "o.surround && !o.active" in adm
              and all(subprocess.run(["node", "--check", str(APP / f)]).returncode == 0 for f in ("static/js/tv.js", "static/js/apps/tvadmin.js")),
              "5.1/7.1 مخفية في إعدادات الصوت على التلفاز وفي لوحة التحكم (إلا المختار الآن، مع تنبيه)"))
harmless = ["amdgpu 0000:0a:00.0: amdgpu: [drm] Optional firmware \"amdgpu/picasso_ip_discovery.bin\" was not found",
            "amdgpu 0000:0a:00.0: firmware: failed to load amdgpu/picasso_ip_discovery.bin (-2)",
            "iwlwifi 0000:07:00.0: firmware: failed to load iwl-debug-yoyo.bin (-2)",
            "wmi_bus wmi_bus-PNP0C14:02: [Firmware Bug]: WQZZ data block query control method not found"]
real = ["rtw88_8821cu 1-2:1.0: failed to request firmware", "iwlwifi 0000:00:14.3: Direct firmware load for iwlwifi-ty-a0-gf-a0-89.ucode failed with error -2"]
res.append(ok(not any(re.search(hx.HARMLESS_FW, l, re.I) for l in real) and all(re.search(hx.HARMLESS_FW, l, re.I) for l in harmless),
              "رسائل HP غير المهمة (ملف اختياري، ملف تصحيح، ملاحظة BIOS) لا تظهر كأخطاء، والناقص الحقيقي يظهر"))
out = subprocess.run([sys.executable, str(HX), "tv-audio-status"], capture_output=True, text=True, env={"HSEF_EXTRAS_FAKE": "1", "PATH": "/usr/bin:/bin"})
res.append(ok(out.returncode == 0 and any(o.get("surround") for o in json.loads(out.stdout)["outputs"]), "المساعد يعمل (الوضع التجريبي)"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
