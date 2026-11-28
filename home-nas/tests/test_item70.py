"""البند 70: لا قراءة عربية آلية في الألعاب أبداً، ولو كان في المتصفح صوت عربي (كان «اكتشف بلجيكا» يقول
«مرحباً بك في بروكسل» بصوت المتصفح). النطق بلغة أخرى في ألعاب اللغات يبقى، والملفات المسجّلة تبقى."""
import http.server, json, os, shutil, subprocess, sys, threading, urllib.parse
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
main = (APP / "games/_kit/kit.js").read_text(encoding="utf-8")
kits = [p for p in APP.rglob("kit.js") if "node_modules" not in p.parts]
res.append(ok(kits and all(p.read_text(encoding="utf-8") == main for p in kits), f"كل نسخ kit.js ({len(kits)}) فيها التعديل نفسه (ومنها نسخة السيرفر static/kit)"))
res.append(ok("const NO_VOICE = /^ar/i;" in main and "if (!v || !text) return false;" in main, "K.voice(\"ar\") لا يعطي صوتاً، فلا يقرأ K.tts بالعربية"))
direct = [p for p in (APP / "games").rglob("*.js") if p.name != "kit.js" and "speechSynthesis.getVoices().find((v) => /^ar/i" in p.read_text(encoding="utf-8")]
res.append(ok(not direct, f"لا لعبة تأخذ صوتاً عربياً من المتصفح بنفسها ← {[p.parent.name for p in direct] or 'لا شيء'}"))

node = shutil.which("node")
has_pw = node and subprocess.run([node, "-e", "require('playwright')"], capture_output=True).returncode == 0
if not has_pw:
    res.append(ok(True, "(لا يوجد Playwright هنا: فُحص الكود فقط)"))
else:
    os.chdir(APP / "games")
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), type("H", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{srv.server_address[1]}/" + urllib.parse.quote("اكتشف بلجيكا") + "/index.html"
    js = r"""
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => {
    window.__spoken = [];
    const voices = [{ lang: 'ar-SA', name: 'Arabic' }, { lang: 'fr-FR', name: 'French' }];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => voices, speak: (u) => window.__spoken.push([u.text, u.lang]), cancel() {}, onvoiceschanged: null } });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });
  await p.goto(process.env.T_URL); await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({
    ar: !!K.voice('ar'), arTts: K.tts('مرحباً بك في بروكسل'), frTts: K.tts('bonjour', 'fr'), spoken: window.__spoken }));
  console.log(JSON.stringify(r)); await b.close();
})();
"""
    out = subprocess.run([node, "-e", js], capture_output=True, text=True, timeout=120, cwd=str(APP), env={**os.environ, "T_URL": url})
    srv.shutdown()
    try:
        r = json.loads(out.stdout.strip().splitlines()[-1])
    except Exception:
        r = {"error": (out.stderr or out.stdout)[-300:]}
    res.append(ok(r.get("ar") is False and r.get("arTts") is False and not any(t == "مرحباً بك في بروكسل" for t, _ in r.get("spoken", [])),
                  f"«اكتشف بلجيكا» في Chromium فيه صوت عربي: لا تقول «مرحباً بك في بروكسل» ← {r}"))
    res.append(ok(r.get("frTts") is True and ["bonjour", "fr-FR"] in r.get("spoken", []), "النطق بالفرنسية (ألعاب اللغات) ما زال يعمل"))
huruf = (APP / "games/حروفي العربية/game.js").read_text(encoding="utf-8")
res.append(ok("const pickVoice = () => { voice = null; };" in huruf and "sounds/" in huruf, "«حروفي العربية»: لا صوت آلي، والحروف المسجّلة (sounds/) تبقى"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
