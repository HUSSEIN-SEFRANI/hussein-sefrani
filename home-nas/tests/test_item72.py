"""البند 72: إعدادات أكثر في التلفاز نفسه (بالرمز PIN للمدير): حجم الصورة، والليل ومؤقّت النوم، والصفحة الرئيسية،
والمظهر، والصلاة والأذان، ومدة شاشة التوقف وإطفاء القبضات، و«عن الجهاز» (التحديث وإعادة التشغيل بتأكيد)."""
import json, os, shutil, subprocess, sys, tempfile, threading
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP)); os.chdir(APP)
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import create_app
from homenas.core import connect, Paths
from werkzeug.security import generate_password_hash
T = Path(tempfile.mkdtemp())
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False)
db = connect(Paths(cfg["data_dir"]).db)
for n, adm, role, pin in (("baba", 1, "adult", "1234"), ("mama", 1, "adult", None), ("sara", 0, "kid", None)):
    db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,tv_pin,created_at) VALUES (?,?,?,?,?,'x')",
               (n, generate_password_hash("p"), adm, role, generate_password_hash(pin) if pin else None))
db.commit()
def tv(uid):
    c = app.test_client()
    with c.session_transaction() as s:
        s["tv_uid"] = uid
    return c
baba, mama, sara = tv(1), tv(2), tv(3)
setting = lambda k: (db.execute("SELECT value FROM settings WHERE key=?", (k,)).fetchone() or [None])[0]

# ------------------------------------------------------------------ الحفظ من التلفاز
r = baba.post("/api/tv/admin/settings", json={"zoom": 200, "margin": 3, "night_off": "23:00-06:00", "pad_sleep": 30, "saver_min": 5,
                                              "home_cards": ["prayer", "calendar", "bad"], "weather": True, "is_admin": 1})
s = r.get_json().get("settings", {})
res.append(ok(r.status_code == 200 and s.get("zoom") == 130 and s.get("margin") == 3 and s.get("night_off") == "23:00-06:00" and s.get("pad_sleep") == 30
              and s.get("saver_min") == 5 and s.get("home_cards") == ["prayer", "calendar"] and s.get("weather") is True,
              "المدير يحفظ من التلفاز بالدالة نفسها التي في لوحة التحكم (مع الحدود: الحجم 200 ← 130، وبطاقة غير معروفة تُرمى)"))
res.append(ok(setting("tv_zoom") == "130" and db.execute("SELECT is_admin FROM users WHERE id=3").fetchone()[0] == 0,
              "مفتاح غير مسموح (is_admin) يُتجاهل"))
ad = {"on": True, "prayers": ["fajr", "maghrib"], "volume": 70, "remind": 10, "pause": True}
r = baba.post("/api/tv/admin/settings", json={"adhan": ad, "prayer": False, "lang": "fr", "lite": "on", "wallpaper": "islamic"})
s = r.get_json()["settings"]
res.append(ok(s["adhan"]["on"] and s["adhan"]["prayers"] == ["fajr", "maghrib"] and s["adhan"]["volume"] == 70 and s["prayer"] is False
              and s["lang"] == "fr" and s["lite"] == "on" and s["wallpaper"] == "islamic", "الأذان واللغة والمظهر تُحفظ"))
res.append(ok(mama.post("/api/tv/admin/settings", json={"zoom": 90}).status_code == 403 and sara.post("/api/tv/admin/settings", json={"zoom": 90}).status_code == 403
              and app.test_client().post("/api/tv/admin/settings", json={"zoom": 90}).status_code in (401, 403) and setting("tv_zoom") == "130",
              "للمدير الذي له رمز PIN فقط (لا الطفل، ولا مدير بلا رمز، ولا بلا دخول)"))
res.append(ok(baba.post("/api/tv/admin/settings", json={"nothing": 1}).status_code == 400, "طلب بلا شيء معروف ← 400"))

# ------------------------------------------------------------------ عن الجهاز، والتحديث، وإعادة التشغيل
a = baba.get("/api/tv/admin/about").get_json()
from homenas import __version__
res.append(ok(a.get("version") == __version__ and a.get("disk", {}).get("total", 0) > 0 and "name" in a, f"«عن الجهاز»: الإصدار والمساحة والاسم ← {a.get('version')}"))
u = baba.get("/api/tv/admin/update").get_json()
res.append(ok(u.get("available") is False and u.get("appliance") is False, "البحث عن تحديث يعمل (على غير الجهاز المخصص: لا تحديث)"))
res.append(ok(baba.post("/api/tv/admin/power", json={"action": "reboot"}).status_code == 400 and sara.post("/api/tv/admin/power", json={"action": "tv"}).status_code == 403,
              "إعادة التشغيل: للمدير فقط، ولا تعمل خارج الجهاز المخصص"))
res.append(ok(app.test_client().get("/api/admin/update").status_code in (401, 403), "لوحة التحكم: البحث عن تحديث كما كان (للمدير)"))

# ------------------------------------------------------------------ في المتصفح: الأسهم، والتأكيد، ومؤقّت النوم
baba.post("/api/tv/admin/settings", json={"zoom": 100, "margin": 0, "lang": "ar", "lite": "auto", "night_off": ""})
node = shutil.which("node")
if not (node and subprocess.run([node, "-e", "require('playwright')"], capture_output=True).returncode == 0):
    res.append(ok(True, "(لا يوجد Playwright هنا: فُحص السيرفر فقط)"))
else:
    from werkzeug.serving import make_server
    srv = make_server("127.0.0.1", 0, app, threaded=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    cookie = baba.get_cookie("session").value
    js = r"""
const { chromium } = require('playwright');
const FNS = ['settingsScreen', 'sizeSetScreen', 'nightSetScreen', 'aboutScreen', 'padScreen', 'saverSetScreen'];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addCookies([{ name: 'session', value: process.env.T_COOKIE, domain: '127.0.0.1', path: '/' }]);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  let power = 0; p.on('request', (q) => { if (q.url().includes('/api/tv/admin/power')) power++; });
  await p.clock.install();
  await p.route(/\/static\/js\/tv\.js/, async (route) => {   // للاختبار فقط: فتح الشاشات مباشرة
    const r = await route.fetch(); let body = await r.text();
    for (const f of FNS) body = body.replace(new RegExp(`(async )?function ${f}\\(`), (m) => `window.${f} = ${f}; ${m}`);
    route.fulfill({ response: r, body });
  });
  await p.goto(process.env.T_URL); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500); await p.clock.runFor(2000); await p.waitForTimeout(500);
  const val = () => p.evaluate(() => { const r = document.querySelector('.opt-row.focus'); return (r?.querySelector('.ov em') || r?.querySelector('.ov'))?.textContent.trim(); });
  const press = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.clock.runFor(400); } };
  const out = {};
  await p.evaluate(() => sizeSetScreen()); await p.clock.runFor(600);
  await press('ArrowLeft', 2); out.zoom = await val();            // العربية: ← = التالي ← 110%
  await press('ArrowRight'); out.zoom2 = await val();            // → = السابق ← 105%
  out.guide = await p.evaluate(() => document.querySelectorAll('.size-guide i').length);
  await press('Escape');
  await p.evaluate(() => aboutScreen()); await p.clock.runFor(800);
  await press('ArrowDown');                                       // «أعد تشغيل التلفاز»
  out.row = await p.evaluate(() => document.querySelector('.opt-row.focus b')?.firstChild.textContent);
  await press('Enter'); out.armed = await val(); out.p1 = power;
  await press('Enter'); out.p2 = power;
  await press('Escape');
  await p.evaluate(() => padScreen()); await p.clock.runFor(600);
  out.padRow = await p.evaluate(() => { const r = document.querySelector('.js-padsleep .opt-row'); return r ? [r.offsetHeight, r.querySelector('.ov em').textContent] : null; });
  await press('Escape');
  await p.evaluate(() => nightSetScreen()); await p.clock.runFor(600);
  await press('ArrowDown', 2); await press('ArrowLeft');          // مؤقّت النوم: بعد 15 دقيقة
  out.sleep = await val();
  await press('Escape'); await press('Escape');
  await p.evaluate(() => { const a = document.createElement('audio'); a.id = 'tst'; document.body.appendChild(a); });
  await p.clock.runFor(14 * 60000); out.before = await p.evaluate(() => !!document.querySelector('.saver.night'));
  await p.clock.runFor(2 * 60000); out.after = await p.evaluate(() => !!document.querySelector('.saver.night'));
  await press('Enter'); out.woke = await p.evaluate(() => !document.querySelector('.saver'));
  out.errs = errs; console.log(JSON.stringify(out)); await b.close();
})();
"""
    out = subprocess.run([node, "-e", js], capture_output=True, text=True, timeout=180,
                         env={**os.environ, "T_URL": f"http://127.0.0.1:{srv.server_port}/tv", "T_COOKIE": cookie})
    srv.shutdown()
    try:
        r = json.loads(out.stdout.strip().splitlines()[-1])
    except Exception:
        r = {"error": (out.stderr or out.stdout)[-400:]}
    res.append(ok(r.get("zoom") == "110%" and r.get("zoom2") == "105%" and setting("tv_zoom") == "105" and r.get("guide") == 4,
                  f"«حجم الصورة»: ← تزيد و→ تنقص، وتُحفظ فوراً، والزوايا الأربع ظاهرة ← {r.get('zoom')}, {r.get('zoom2')}, {setting('tv_zoom')} {r.get('error', '')}"))
    res.append(ok(r.get("row") == "أعد تشغيل التلفاز" and r.get("armed") == "اضغط مرة ثانية للتأكيد" and r.get("p1") == 0 and r.get("p2") == 1,
                  f"إعادة التشغيل تحتاج ضغطتين (الأولى تطلب التأكيد ولا ترسل شيئاً) ← {r.get('armed')}, {r.get('p1')}→{r.get('p2')}"))
    res.append(ok(r.get("padRow") and r["padRow"][0] >= 40 and r["padRow"][1] == "30 دقيقة", f"«يد التحكم»: صف مدة إطفاء القبضات ظاهر بقيمته ← {r.get('padRow')}"))
    res.append(ok(r.get("sleep") == "بعد 15 دقيقة" and r.get("before") is False and r.get("after") is True and r.get("woke") is True,
                  f"مؤقّت النوم: بعد 15 دقيقة تنطفئ الشاشة (لا قبلها)، وأي زر يعيدها ← {r.get('sleep')}, {r.get('before')}, {r.get('after')}, {r.get('woke')}"))
    res.append(ok("errs" in r and not r["errs"], f"اكتملت التجربة بلا أخطاء في الصفحة ← {r.get('errs', r.get('error'))}"))
js = (APP / "static/js/tv.js").read_text(encoding="utf-8")
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/tv.js")]).returncode == 0 and "(المدة من لوحة تحكم السيرفر" not in js,
              "tv.js سليم، ولا «المدة من لوحة تحكم السيرفر» بعد الآن (المدتان في التلفاز نفسه)"))
tr = (APP / "static/js/i18n-tv.js").read_text(encoding="utf-8")
need = ["الشاشة والصوت", "ما يظهر على التلفاز", "الأجهزة والشبكة", "حجم الصورة", "الليل", "الصفحة الرئيسية", "المظهر", "الصلاة والأذان", "شاشة التوقف",
        "عن الجهاز", "مؤقّت النوم", "اضغط مرة ثانية للتأكيد", "ابحث عن تحديث", "أعد تشغيل التلفاز", "أعد تشغيل الجهاز"]
res.append(ok(all(f'"{k}":' in tr for k in need) and subprocess.run(["node", "--check", str(APP / "static/js/i18n-tv.js")]).returncode == 0,
              f"الترجمة (الإنجليزية والفرنسية والتركية والهولندية) للعناوين الجديدة ← {[k for k in need if f'\"{k}\":' not in tr] or 'كلها'}"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
