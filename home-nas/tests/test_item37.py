"""البند 37: لا يُثبَّت عنوان IP يستعمله جهاز آخر، و«فحص الكابل» يكشف التعارض."""
import json, os, runpy, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
H = str(APP / "appliance/hsef-extras")
env = {**os.environ, "HSEF_EXTRAS_FAKE": "1"}
r = subprocess.run([sys.executable, H, "net-set", "static", "192.168.1.77", "24", "192.168.1.1", "192.168.1.1"], capture_output=True, text=True, env=env)
res.append(ok(r.returncode != 0 and "يستعمله جهاز آخر" in r.stderr and "aa:bb:cc:dd:ee:ff" in r.stderr, f"عنوان مستعمل ← مرفوض برسالة واضحة: {r.stderr.strip()[:90]}"))
r = subprocess.run([sys.executable, H, "net-set", "static", "192.168.1.1", "24", "192.168.1.1", "192.168.1.1"], capture_output=True, text=True, env=env)
res.append(ok(r.returncode != 0 and "الراوتر" in r.stderr, "عنوان الراوتر نفسه ← مرفوض"))
r = subprocess.run([sys.executable, H, "net-set", "static", "192.168.1.200", "24", "192.168.1.1", "192.168.1.1"], capture_output=True, text=True, env=env)
res.append(ok(r.returncode == 0, "عنوان حر ← مقبول"))
# فحص ARP الحقيقي: البناء والتحليل (إطار الطلب، وتجاهل رد هذا الجهاز نفسه)
os.environ.pop("HSEF_EXTRAS_FAKE", None)
g = runpy.run_path(H, run_name="nomain")
import socket, struct
class FakeSock:
    sent = []
    def __init__(self, *a): self.q = []
    def bind(self, a): pass
    def send(self, f):
        FakeSock.sent.append(f)
        tip = f[38:42]
        def reply(mac): return b"\0" * 12 + b"\x08\x06" + struct.pack("!HHBBH", 1, 0x0800, 6, 4, 2) + mac + tip + b"\0" * 10
        self.q = [reply(bytes.fromhex("112233445566")), reply(bytes.fromhex("aabbccddeeff")), reply(bytes.fromhex("aabbccddeeff"))]
    def recv(self, n): return self.q.pop(0)
    def close(self): pass
import select as _sel
real_select = _sel.select
fns = g["arp_probe"].__globals__
fns["_mac_of"] = lambda ifc: bytes.fromhex("112233445566")
socket.socket = FakeSock
_sel.select = lambda r, w, x, t: (r if r and r[0].q else [], [], [])
macs = g["arp_probe"]("eth0", "192.168.1.50", timeout=0.2, tries=1)
f = FakeSock.sent[0]
res.append(ok(f[:6] == b"\xff" * 6 and f[12:14] == b"\x08\x06" and f[28:32] == b"\0\0\0\0" and socket.inet_ntoa(f[38:42]) == "192.168.1.50",
              "الطلب: بث ARP «من عنده 192.168.1.50؟» بمرسِل 0.0.0.0"))
res.append(ok(macs == ["aa:bb:cc:dd:ee:ff"], f"يُعرف الجهاز الآخر ويُتجاهل هذا الجهاز نفسه: {macs}"))
_sel.select = real_select
src = Path(H).read_text(encoding="utf-8")
res.append(ok("p[\"conflict\"] = m" in src and "same_ip = same_ip or bool(conflicts)" in src, "«فحص الكابل» يسأل الشبكة عن عنوان الجهاز الحالي"))
js = (APP / "static/js/apps/device.js").read_text(encoding="utf-8")
res.append(ok("x.conflict" in js and "هذا سبب الانقطاع" in js, "البطاقة تشرح السبب والحل"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
