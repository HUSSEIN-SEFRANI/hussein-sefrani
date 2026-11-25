"""البند 58: صوت عربي آلي للألعاب (espeak-ng على السيرفر)، واللعبة «لغتي العربية»."""
import json, os, stat, subprocess, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
tmp = Path(tempfile.mkdtemp())
# espeak-ng مزيف: يكتب ملف wav صغيراً ويسجل النص الذي طُلب
fake = tmp / "bin"; fake.mkdir()
(fake / "espeak-ng").write_text('#!/bin/sh\nfor a; do last="$a"; done\nprev=""; out=""\nfor a; do [ "$prev" = "-w" ] && out="$a"; prev="$a"; done\n'
                                 'printf "RIFF%0200d" 0 > "$out"\necho "$last" >> "' + str(tmp / "said.txt") + '"\n')
(fake / "espeak-ng").chmod(0o755)
os.environ["PATH"] = f"{fake}:{os.environ['PATH']}"
from homenas import create_app, tts
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
cfg = {"secret_key": "t", "data_dir": str(tmp / "d"), "port": 80, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); db = connect(Paths(cfg["data_dir"]).db)
db.execute("INSERT INTO users(username,password_hash,is_admin,created_at) VALUES ('admin',?,1,'x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
res.append(ok(c.get("/api/tv/tts?t=قلم").status_code == 401, "بلا دخول: مرفوض"))
with c.session_transaction() as s: s["uid"] = 1; s["pwv"] = db.execute("SELECT password_hash FROM users WHERE id=1").fetchone()[0][-12:]
r = c.get("/api/tv/tts?t=" + "سَيَّارَة" + "&r=120")
res.append(ok(r.status_code == 200 and r.mimetype == "audio/wav" and r.data.startswith(b"RIFF"), "ينطق الكلمة (wav)"))
c.get("/api/tv/tts?t=" + "سَيَّارَة" + "&r=120")
said = (tmp / "said.txt").read_text().split()
res.append(ok(said == ["سَيَّارَة"], "التشكيل يصل كما هو، والنص نفسه لا يُصنع مرتين (ذاكرة مؤقتة)"))
res.append(ok(tts.clean("قلم\x00\n\tكتاب") == "قلم كتاب" and len(tts.clean("ب" * 500)) == 200, "النص يُنظَّف من رموز التحكم ويُقصّ (ويُمرَّر كوسيط لا عبر صدفة)"))
ORIG = os.environ["PATH"]; os.environ["PATH"] = "/nonexistent"
res.append(ok(c.get("/api/tv/tts?t=باب").status_code == 404, "بلا espeak-ng: 404 فتكمل اللعبة بلا صوت"))
os.environ["PATH"] = ORIG
ins = (APP / "appliance/install.sh").read_text(); iso = (APP / "installer/build-installer-iso.sh").read_text()
res.append(ok("espeak-ng" in ins and "espeak-ng" in iso, "espeak-ng في الإيزو وفي التحديث"))
G = APP / "games" / "لغتي العربية"
app_json = json.loads((G / "app.json").read_text())
res.append(ok(app_json["type"] == "education" and (G / "cover.jpg").exists(), "اللعبة تعليمية (نجمة عند إنهاء الدرس) ولها غلاف"))
kit = (APP / "games/_kit/kit.js").read_bytes()
same = all(p.read_bytes() == kit for p in list((APP / "games").glob("*/kit.js")) + [APP / "static/kit/kit.js"])
res.append(ok(same and b"/api/tv/tts" in kit, "kit.js: صوت السيرفر عند غياب الصوت العربي، ونسخه متطابقة"))
# بيانات الكلمات: صالحة ولكل مستوى ما يكفي
js = subprocess.run(["node", "-e", f"""
global.window = {{}}; require({json.dumps(str(G / 'words.js'))});
const D = window.LUGHATI, M = /[\\u064B-\\u0652]/g, H = /[أإآءؤئ]/;
const n = (w) => [...w.replace(M, '')].length;
const easy = D.words.filter((w) => !H.test(w[0]));
console.log(JSON.stringify({{ l1: easy.filter((w) => n(w[0]) <= 3).length, l2: easy.filter((w) => n(w[0]) === 4).length,
  l3: easy.filter((w) => n(w[0]) >= 5).length, all: D.words.length, ta: D.ta.length, hz: D.hamza.filter((w) => H.test(w[0])).length,
  hzAll: D.hamza.length, emo: D.words.every((w) => w[1]) }}));"""], capture_output=True, text=True)
print(js.stderr[:600]) if js.returncode else None
d = json.loads(js.stdout or "{}")
res.append(ok(bool(d) and d["l1"] >= 10 and d["l2"] >= 10 and d["l3"] >= 10 and d["hz"] == d["hzAll"] and d["emo"], f"الكلمات: {d}"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
