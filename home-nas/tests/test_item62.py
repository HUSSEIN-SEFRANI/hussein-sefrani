"""البند 62: الموسيقى تستمر بعد الخروج من تطبيق الصوت مع إشعار، وتتوقف عند الفيديو والألعاب وغيرها."""
import re, sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
css = (APP / "static/css/tv.css").read_text(encoding="utf-8")
au = js.split("function audioScreen(t, paths, idx) {")[1].split("\nfunction ")[0]
res.append(ok("keep = !au.paused" in au and "back: leave" in au and "startBg(t, paths, au" in au, "الخروج بزر «رجوع» والصوت يعمل ← يستمر في الخلفية (والمتوقف يُغلق)"))
res.append(ok("function reset(scr)" in js and "keep" not in js.split("function reset(scr)")[1].split("\n}")[0], "تبديل المستخدم (reset) لا يُبقي الصوت"))
stops = ["async function whoScreen(boot = false) {", "function videoScreen(t, paths, idx) {", "function camLiveScreen(cams, idx, auto = false) {",
         "async function gameScreen(t, path) {", "function appScreen(url, title) {", "function storyPlayer(t, x) {"]
res.append(ok(all(js.split(s)[1].lstrip().startswith("stopBg();") for s in stops), "يتوقف عند الفيديو والكاميرا واللعبة والتطبيق والقصة وتبديل المستخدم"))
res.append(ok("resume" in au and "au.currentTime = resume.at" in au, "فتح المربع نفسه (أو الضغط على الإشعار) يكمل من حيث وصل"))
res.append(ok(".bgmusic" in css and 'class="bgmusic"' in js and "MediaPlayPause" in js.split("let bgPlay")[1].split("function audioScreen")[0], "إشعار «قيد التشغيل» أعلى الشاشة، وزر التشغيل/الإيقاف في الريموت"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
