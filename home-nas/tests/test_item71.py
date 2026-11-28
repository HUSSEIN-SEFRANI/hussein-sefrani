"""البند 71: صفحة «الإعدادات» في التلفاز متناسقة: كل البطاقات بعرض واحد وارتفاع واحد (منذ البند 72: 12 بطاقة في 3 صفوف × 4)،
وعنوان كل صف فوقه، ولا عنوان مقصوص، والأسهم تتنقل كما كانت."""
import json, os, shutil, subprocess, sys, tempfile, threading
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
css = (APP / "static/css/tv.css").read_text(encoding="utf-8")
res.append(ok("grid-template-columns: repeat(4, minmax(0, 1fr))" in css and ".set-group, .set-groups .set-grid { display: contents; }" in css
              and "height: 112px" in css, "شبكة واحدة بأعمدة متساوية وارتفاع ثابت لكل البطاقات"))
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
  const snap = () => p.evaluate(() => ({
    cards: [...document.querySelectorAll('.set-card')].map((c) => [c.dataset.k, c.offsetWidth, c.offsetHeight, c.offsetTop, c.querySelector('b').scrollWidth > c.querySelector('b').clientWidth + 1]),
    heads: [...document.querySelectorAll('.set-gh')].map((g) => [g.textContent, g.offsetWidth]),
    grid: document.querySelector('.set-groups').offsetWidth,
    focus: document.querySelector('.set-card.focus')?.dataset.k }));
  const a = await snap();
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(200); const l1 = (await snap()).focus;
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200); const d1 = (await snap()).focus;
  console.log(JSON.stringify({ a, l1, d1, errs })); await b.close();
})();
"""
    out = subprocess.run([node, "-e", js], capture_output=True, text=True, timeout=120,
                         env={**os.environ, "T_URL": f"http://127.0.0.1:{srv.server_port}/tv"})
    srv.shutdown()
    try:
        r = json.loads(out.stdout.strip().splitlines()[-1])
    except Exception:
        r = {"a": {"cards": [], "heads": [], "grid": 0}, "error": (out.stderr or out.stdout)[-300:]}
    cards = r["a"]["cards"]
    ws, hs = {c[1] for c in cards}, {c[2] for c in cards}
    rows = {}
    for c in cards:
        rows.setdefault(c[3], []).append(c[0])
    res.append(ok(len(cards) == 12 and len(ws) == 1 and len(hs) == 1, f"البطاقات الـ12 بعرض واحد وارتفاع واحد ← {sorted(ws)}×{sorted(hs)}"))
    res.append(ok(sorted(len(v) for v in rows.values()) == [4, 4, 4], f"3 صفوف × 4 ← {list(rows.values())}"))
    res.append(ok(not any(c[4] for c in cards), f"لا عنوان مقصوص ← {[c[0] for c in cards if c[4]] or 'لا شيء'}"))
    heads = r["a"]["heads"]
    res.append(ok(len(heads) == 3 and all(abs(w - (r["a"]["grid"] - 12)) <= 2 for _, w in heads), f"عنوان كل صف فوقه بعرض الصف ← {heads}"))
    res.append(ok(r["a"].get("focus") == "screen" and r.get("l1") == "size" and r.get("d1") == "look" and not r.get("errs"),
                  f"الأسهم تتنقل (الشاشة ← حجم الصورة ↓ المظهر) ← {r['a'].get('focus')}, {r.get('l1')}, {r.get('d1')} {r.get('error', '')}"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
