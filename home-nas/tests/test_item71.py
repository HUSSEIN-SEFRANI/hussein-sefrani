"""البند 71: صفحة «الإعدادات» في التلفاز: كل البطاقات بعرض واحد وارتفاع واحد، وعنوان كل مجموعة فوق بطاقاتها، والأسهم تتنقل كما كانت."""
import json, os, shutil, subprocess, sys, tempfile, threading
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
css = (APP / "static/css/tv.css").read_text(encoding="utf-8")
res.append(ok("repeat(var(--cols), minmax(0, 1fr))" in css and ".set-group, .set-groups .set-grid { display: contents; }" in css,
              "شبكة واحدة بأعمدة متساوية لكل البطاقات"))
node = shutil.which("node")
if not (node and subprocess.run([node, "-e", "require('playwright')"], capture_output=True).returncode == 0):
    res.append(ok(True, "(لا يوجد Playwright هنا: فُحص الكود فقط)"))
else:
    os.chdir(APP)
    from homenas import create_app
    from werkzeug.serving import make_server
    T = Path(tempfile.mkdtemp())
    app = create_app({"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}, start_indexer=False)
    srv = make_server("127.0.0.1", 0, app, threaded=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    js = r"""
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.route(/\/static\/js\/tv\.js/, async (route) => {   // للاختبار فقط: فتح صفحة الإعدادات مباشرة
    const r = await route.fetch(); const body = (await r.text()).replace('function settingsScreen() {', 'window.settingsScreen = settingsScreen; function settingsScreen() {');
    route.fulfill({ response: r, body });
  });
  await p.goto(process.env.T_URL); await p.waitForTimeout(1200);
  await p.evaluate(() => settingsScreen()); await p.waitForTimeout(600);
  const size = () => p.evaluate(() => ({
    cards: [...document.querySelectorAll('.set-card')].map((c) => [c.dataset.k, c.offsetWidth, c.offsetHeight, c.offsetTop]),
    heads: [...document.querySelectorAll('.set-gh')].map((g) => [g.textContent, g.offsetWidth]),
    focus: document.querySelector('.set-card.focus')?.dataset.k }));
  const a = await size();
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(250);
  const b1 = (await size()).focus;
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(250);
  const b3 = (await size()).focus;
  console.log(JSON.stringify({ a, b1, b3, errs })); await b.close();
})();
"""
    out = subprocess.run([node, "-e", js], capture_output=True, text=True, timeout=120,
                         env={**os.environ, "T_URL": f"http://127.0.0.1:{srv.server_port}/tv"})
    srv.shutdown()
    try:
        r = json.loads(out.stdout.strip().splitlines()[-1])
    except Exception:
        r = {"a": {"cards": [], "heads": []}, "error": (out.stderr or out.stdout)[-300:]}
    cards = r["a"]["cards"]
    ws, hs, tops = {c[1] for c in cards}, {c[2] for c in cards}, {round(c[3]) for c in cards}
    res.append(ok(len(cards) == 6 and len(ws) == 1 and len(hs) == 1, f"البطاقات الست بعرض واحد وارتفاع واحد ← {sorted(ws)}×{sorted(hs)}"))
    res.append(ok(len(tops) == 1, f"كلها على السطر نفسه ← {sorted(tops)}"))
    w = next(iter(ws)) if len(ws) == 1 else 0
    heads = dict(r["a"]["heads"])
    res.append(ok(w and abs(heads.get("التلفاز", 0) - (3 * w + 2 * 18 - 12)) <= 2 and abs(heads.get("الألعاب", 0) - (2 * w + 18 - 12)) <= 2
                  and abs(heads.get("الشبكة", 0) - (w - 12)) <= 2, f"عنوان كل مجموعة فوق بطاقاتها تماماً ← {heads}"))
    res.append(ok(r["a"].get("focus") == "screen" and r.get("b1") == "audio" and r.get("b3") == "pad" and not r.get("errs"),
                  f"الأسهم تتنقل بين البطاقات كما كانت (الشاشة ← الصوت ← … ← يد التحكم) ← {r.get('a', {}).get('focus')}, {r.get('b1')}, {r.get('b3')} {r.get('error', '')}"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
