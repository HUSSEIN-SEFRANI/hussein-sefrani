"""البند 66: إلغاء الصوت الآلي (البند 58) بطلب صاحب المشروع: القراءة بصوت المتصفح العربي فقط إن وُجد."""
import os, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
os.environ["HSEF_EXTRAS_FAKE"] = "1"
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
kits = [p for p in APP.rglob("kit.js") if "node_modules" not in p.parts]
main = (APP / "games/_kit/kit.js").read_text(encoding="utf-8")
res.append(ok(kits and all(p.read_text(encoding="utf-8") == main for p in kits), f"كل نسخ kit.js ({len(kits)}) مثل _kit"))
res.append(ok("serverTts" not in main and "/api/tv/tts" not in main and "if (!v || !text) return false;" in main, "K.tts بلا صوت السيرفر"))
res.append(ok(not (APP / "homenas/tts.py").exists(), "لا وحدة tts في السيرفر"))
inst = (APP / "appliance/install.sh").read_text(encoding="utf-8")
pkgs = inst[inst.index('PKGS="'):inst.index('"', inst.index('PKGS="') + 6)]   # البند 69 يذكر espeak-ng في install.sh ليُزيله، لا ليثبّته
sh = pkgs + (APP / "installer/build-installer-iso.sh").read_text(encoding="utf-8")
res.append(ok("espeak" not in sh and "apt-get install -y --no-install-recommends espeak" not in inst,
              "espeak-ng ليس في الحزم ولا في الإيزو (فلا يتصل التحديث بالإنترنت لأجله)"))
from homenas import create_app
T = Path(tempfile.mkdtemp())
app = create_app({"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}, start_indexer=False)
res.append(ok(app.test_client().get("/api/tv/tts?t=x").status_code == 404, "لا طريق /api/tv/tts"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
