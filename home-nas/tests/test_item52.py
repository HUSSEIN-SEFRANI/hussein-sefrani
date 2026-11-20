"""البند 52: الأزرار الأربعة اليمنى بالموقع لا بالرمز في كل الأيادي (بلايستيشن، نينتندو، غير الأصلية):
السفلي موافق، الأيمن رجوع، الأيسر والعلوي فعلان إضافيان، والأسهم أو العصا اليسرى للتوجيه دائماً."""
import json, re, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
tv = (APP / "static/js/tv.js").read_text(encoding="utf-8")
fire = tv[tv.index("function padFire(name, gp) {"):tv.index("\n}\n", tv.index("function padFire(name, gp) {")) + 2]
sim = r"""
const keys = []; const padKey = (k) => keys.push(k); const rumble = () => {}; const top = () => null;
const padPrefs = { swap: false }; const padKind = (g) => g.kind;
""" + fire + r"""
const run = (kind, swap) => { padPrefs.swap = swap; keys.length = 0; for (const n of ["cross", "circle", "square", "triangle", "up", "left"]) padFire(n, { kind }); return keys.join(","); };
console.log(JSON.stringify({ ps: run("ps", false), nin: run("nintendo", false), gen: run("generic", false), ninSwap: run("nintendo", true), psSwap: run("ps", true) }));
"""
out = subprocess.run(["node", "-e", sim], capture_output=True, text=True)
v = json.loads(out.stdout) if out.returncode == 0 else {}
want = "Enter,Escape,F2,ContextMenu,ArrowUp,ArrowLeft"
res.append(ok(v.get("ps") == want, f"بلايستيشن: السفلي موافق، الأيمن رجوع، الأيسر والعلوي إضافيان، والأسهم للتوجيه ← {v or out.stderr[-300:]}"))
res.append(ok(v.get("nin") == want and v.get("gen") == want, "نينتندو والأيادي غير الأصلية: نفس الوظيفة لنفس الموقع (لا عكس حسب النوع)"))
res.append(ok(v.get("ninSwap") == v.get("psSwap") == "Escape,Enter,F2,ContextMenu,ArrowUp,ArrowLeft",
              "إعداد «الموافقة بالزر الأيمن» يبدّل كل الأيادي معاً (يبقى الموقع نفسه بينها)"))
swapfn = re.search(r"window\.hsefPadSwap = [^\n]+", tv)
res.append(ok(bool(swapfn) and "nintendo" not in swapfn.group(0) and "nintendo" not in fire, "الألعاب أيضاً بلا عكس لنينتندو (hsefPadSwap)"))
steps = tv[tv.index("const PAD_STEPS"):tv.index("function padSetupScreen")]
res.append(ok(all(w in steps for w in ("الزر السفلي", "الزر الأيمن", "الزر الأيسر", "الزر العلوي")) and not re.search("[✕○□△]", steps)
              and 'const FACE_STEP = { a: "down", b: "right", x: "left", y: "up" }' in steps,
              "«إعداد يد جديدة» يسأل بالموقع (السفلي/الأيمن/الأيسر/العلوي) مع رسم الزر، لا بالرموز"))
code = "\n".join(l for l in tv.split("\n") if not l.strip().startswith("//"))
res.append(ok(not re.search("[✕○□△]", code), "لا رموز بلايستيشن في شاشات التلفاز: رسم الأزرار الأربعة بالموقع (faceIcon)"))
face = tv[tv.index("function faceIcon"):tv.index("\n}\n", tv.index("function faceIcon")) + 2]
fsim = "const FACE_NAME = {down:'s',right:'r',left:'l',up:'u'};\n" + face + "\nconsole.log(JSON.stringify(['down','right','left','up'].map((p) => { const s = faceIcon(p); const m = [...s.matchAll(/cx=\"(\\d+)\" cy=\"(\\d+)\" r=\"([\\d.]+)\"/g)]; return m.filter((x) => x[3] === '4.8').map((x) => x[1] + ',' + x[2]).join('') + '/' + m.length; })))"
fo = subprocess.run(["node", "-e", fsim], capture_output=True, text=True)
res.append(ok(fo.stdout.strip() == json.dumps(["12,19/4", "19,12/4", "5,12/4", "12,5/4"]).replace(" ", ""), f"الرسم: أربع دوائر والمقصودة مضيئة في موقعها الصحيح ← {fo.stdout.strip() or fo.stderr[-200:]}"))
api = (APP / "games/_kit/API.txt").read_text(encoding="utf-8")
res.append(ok("الأزرار بالموقع لا بالرمز" in api and "buttons[0] الزر السفلي" in api and "لا تعكس الأزرار حسب نوع اليد" in api, "القاعدة مكتوبة للألعاب القادمة (API.txt)"))
i18n = (APP / "static/js/i18n-tv.js").read_text(encoding="utf-8")
res.append(ok(all(f'"{k}":' in i18n for k in ("الزر السفلي", "الزر الأيمن", "الزر الأيسر", "الزر العلوي", "اضغط الزر السفلي من الأزرار الأربعة", "الموافقة بالزر الأيمن")),
              "النصوص الجديدة مترجمة"))
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/tv.js")]).returncode == 0, "tv.js سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
