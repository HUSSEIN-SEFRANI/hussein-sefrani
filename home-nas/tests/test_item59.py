"""البند 59: «لغتي العربية»: المواضيع (أيام، أشهر، أماكن، اتجاهات…)، و«كلماتي»، و«أسماء عائلتي»، واسم الصانع."""
import json, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
G = APP / "games" / "لغتي العربية"
js = subprocess.run(["node", "-e", f"""
global.window = {{}}; require({json.dumps(str(G / 'words.js'))});
const T = window.LUGHATI.topics, ok = (s) => /^[\\u0621-\\u064A\\u064B-\\u0652 ]+$/.test(s);
const out = {{}};
for (const [k, t] of Object.entries(T)) out[k] = {{ n: t.words.length, ok: t.words.every((w) => ok(w[0]) && w[1]) }};
console.log(JSON.stringify(out));"""], capture_output=True, text=True)
d = json.loads(js.stdout or "{}")
need = {"days": 7, "months": 12, "hijri": 12, "places": 10, "dirs": 10, "colors": 8, "nums": 10, "family": 10, "times": 8}
res.append(ok(all(k in d and d[k]["n"] >= v and d[k]["ok"] for k, v in need.items()), f"المواضيع وعدد كلماتها، وكلها حروف عربية مع صورة: { {k: v['n'] for k, v in d.items()} }"))
g = (G / "game.js").read_text(encoding="utf-8")
res.append(ok('K.listImages("كلماتي")' in g and (G / "كلماتي" / "اقرأني.txt").exists(), "«كلماتي»: صور مجلد «كلماتي» (واسم الصورة هو الكلمة)، والمجلد فيه شرح"))
res.append(ok("/api/tv/family/people" in g and "/api/tv/face/" in g and "/api/tv/home" in g, "«أسماء عائلتي»: اسم الطفل والأشخاص المسمَّون مع صورهم"))
res.append(ok('AUTHOR = "SEFRANI HUSSEIN"' in g and "${AUTHOR}" in g, "اسم الصانع في الشاشة الأولى"))
res.append(ok(not list((G / "كلماتي").glob("*.jp*g")), "لا صور شخصية في المستودع"))
# صور «كلماتي» لا تمنع تحديث اللعبة، وتبقى بعده
import tempfile, shutil, os
sys.path.insert(0, str(APP))
from homenas import bundled
t = Path(tempfile.mkdtemp()); a = t / "app"; shutil.copytree(G, a)
f0 = bundled.fingerprint(a); (a / "كلماتي" / "جدو.jpg").write_bytes(b"x")
res.append(ok(bundled.fingerprint(a) == f0, "صور «كلماتي» لا تُحسب تعديلاً على اللعبة (فتصلها التحديثات)"))
new = t / "new"; shutil.copytree(G, new); old = t / "old"; a.rename(old)
bundled._carry_user_dirs(old, new)
res.append(ok((new / "كلماتي" / "جدو.jpg").exists(), "وبعد التحديث تبقى صور «كلماتي» في النسخة الجديدة"))
shutil.rmtree(t, ignore_errors=True)
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
