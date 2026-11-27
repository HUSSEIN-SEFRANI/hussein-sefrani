"""البند 4: بطارية الأيادي وشحنها، ونوع اليد من Vendor/Product مع التصحيح اليدوي."""
import json, os, subprocess, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
T = Path(tempfile.mkdtemp())
ps = T / "class/power_supply"
def bat(name, cap=None, status="Discharging", hid_name="", hid_id="", scope="Device", level=None, uniq=""):
    d = ps / name; (d / "device").mkdir(parents=True)
    (d / "type").write_text("Battery\n"); (d / "status").write_text(status + "\n")
    if scope: (d / "scope").write_text(scope + "\n")
    if cap is not None: (d / "capacity").write_text(f"{cap}\n")
    if level: (d / "capacity_level").write_text(level + "\n")
    (d / "device/uevent").write_text(f"HID_ID={hid_id}\nHID_NAME={hid_name}\nHID_UNIQ={uniq}\n")
bat("ps-controller-battery-a0:5a:5c:11:22:33", 80, "Discharging", "DualSense Wireless Controller", "0005:0000054C:00000CE6")
bat("nintendo_switch_controller_battery_98:b6:e9:00:11:22", None, "Charging", "Pro Controller", "0005:0000057E:00002009", level="Normal")
bat("BAT0", 55, scope="System")   # بطارية اللابتوب نفسه: لا تظهر
(ps / "AC").mkdir(); (ps / "AC/type").write_text("Mains\n")
os.environ["HSEF_SYSFS_ROOT"] = str(T)
from homenas import pads
b = pads.batteries()
res.append(ok(len(b) == 2 and {x["mac"] for x in b} == {"A0:5A:5C:11:22:33", "98:B6:E9:00:11:22"}, "بطاريات الأيادي فقط (لا بطارية الجهاز ولا الكهرباء)، وعنوان كل يد"))
d = next(x for x in b if x["vendor"] == "054c")
res.append(ok(d["capacity"] == 80 and d["status"] == "Discharging" and d["model"] == "DualSense (PS5)" and d["kind"] == "ps", "يد PS5: 80%، والنوع من 054c:0ce6"))
n = next(x for x in b if x["vendor"] == "057e")
res.append(ok(n["capacity"] is None and n["level"] == "Normal" and n["status"] == "Charging" and n["kind"] == "nintendo" and n["model"] == "Switch Pro",
              "يد سويتش: تشحن، ومستوى بلا نسبة"))
from homenas import create_app
from homenas.core import connect, Paths
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False)
r = app.test_client().get("/api/tv/pads/battery")
res.append(ok(r.status_code == 200 and len(r.get_json()["pads"]) == 2, "التلفاز: ‎/api/tv/pads/battery"))
res.append(ok(app.test_client().get("/api/admin/pads/battery").status_code in (401, 403), "لوحة التحكم: للمدير فقط"))
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
sim = r"""
const localStorage = { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; } };
const window = {}; const livePads = () => [];
""" + js[js.index("const PAD_KINDS ="):js.index("window.hsefPadKind")] + r"""
const g1 = { id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)" };
const g2 = { id: "057e-2009-Pro Controller" }, g3 = { id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)" }, g4 = { id: "USB Gamepad (Vendor: 0079 Product: 0006)" };
const a = [padKind(g1), padKind(g2), padKind(g3), padKind(g4)];
setPadKind(g4, "nintendo"); const b = padKind(g4); setPadKind(g4, null); const c = padKind(g4);
console.log(JSON.stringify({ a, b, c, saved: localStorage.s["hsef-padtypes"] }));
"""
out = subprocess.run(["node", "-e", sim], capture_output=True, text=True)
v = json.loads(out.stdout) if out.returncode == 0 else {}
res.append(ok(v.get("a") == ["ps", "nintendo", "xbox", "generic"], f"النوع من Vendor/Product: بلايستيشن، نينتندو، إكس بوكس، عامة ← {v.get('a') or out.stderr[-200:]}"))
res.append(ok(v.get("b") == "nintendo" and v.get("c") == "generic", "التصحيح اليدوي يُحفظ، و«تلقائي» يرجعه"))
res.append(ok("const swap = !!padPrefs.swap;" in js, "يد نينتندو: نفس الموقع كباقي الأيادي (البند 52 ألغى العكس)"))
res.append(ok("function pollBattery" in js and "ضعيفة" in js and "js-kind" in js and "batHTML(batFor(g, used))" in js, "التلفاز: البطارية والشحن لكل لاعب، وتنبيه البطارية الضعيفة، وزر «النوع»"))
dj = (APP / "static/js/apps/device.js").read_text(encoding="utf-8")
res.append(ok("/api/admin/pads/battery" in dj and "window.__padBat" in dj, "لوحة التحكم: البطارية بجانب اليد المربوطة"))
res.append(ok(all(subprocess.run(["node", "--check", str(APP / f)]).returncode == 0 for f in ("static/js/tv.js", "static/js/apps/device.js")), "ملفات JS سليمة"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); sys.exit(0 if all(res) else 1)
