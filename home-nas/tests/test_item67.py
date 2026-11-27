"""البند 67: «ماذا يشغل المساحة؟» عرض حيّ: حلقة، حسب المكان/النوع، وما بداخل كل مجلد."""
import os, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
os.environ["HSEF_EXTRAS_FAKE"] = "1"
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import storage
from homenas.core import Paths
T = Path(tempfile.mkdtemp()); P = Paths(str(T / "d"))
for p in (P.homes, P.cache, P.system): p.mkdir(parents=True, exist_ok=True)
def put(p, n):
    p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(b"x" * n)
put(P.homes / "baba" / "Photos" / "a.JPG", 5000); put(P.homes / "baba" / "Photos" / "v.mp4", 9000)
put(P.homes / "baba" / "Docs" / "f.pdf", 300); put(P.homes / "baba" / "#recycle" / "z.zip", 700); put(P.homes / "baba" / "loose.xyz", 50)
for i in range(9): put(P.homes / "baba" / f"d{i}" / "x.txt", 10 + i)
sh = T / "share"; put(sh / "Movies" / "m.mkv", 4000); put(sh / "song.mp3", 600)
storage._usage["running"] = True
storage._compute(P, [("أفلام", str(sh))], {"baba": "بابا"})
u = storage._usage["result"]
b = u["people"][0]
names = [c["name"] for c in b["children"]]
res.append(ok(b["name"] == "بابا" and b["total"] == 5000 + 9000 + 300 + 700 + 50 + sum(10 + i for i in range(9)), f"المجموع صحيح ({b['total']})"))
res.append(ok(names[:2] == ["Photos", "سلة المحذوفات"] and names[-1] == "ملفات أخرى" and len(names) == 7, f"أكبر 6 مجلدات ثم «ملفات أخرى»، و#recycle = «سلة المحذوفات»: {names}"))
res.append(ok(sum(c["total"] for c in b["children"]) == b["total"], "مجموع ما بالداخل = المجموع"))
k = u["kinds"]
res.append(ok(k.get("photo") == 5000 and k.get("video") == 9000 + 4000 and k.get("doc") == 300 + sum(10 + i for i in range(9)) and k.get("archive") == 700 and k.get("audio") == 600 and k.get("other") == 50, f"حسب النوع: {k}"))
res.append(ok(u["shares"][0]["children"][0] == {"name": "Movies", "total": 4000}, "والمجلدات المشتركة أيضاً"))
js = (APP / "static/js/apps/system.js").read_text(encoding="utf-8")
res.append(ok("usageView" in js and "donut(" in js and "us-kids" in js and "data-v=\"kind\"" in js.replace("data-v=\\\"kind\\\"", 'data-v="kind"'), "الواجهة: حلقة، وزرّا «حسب المكان/النوع»، وفتح ما بالداخل"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
