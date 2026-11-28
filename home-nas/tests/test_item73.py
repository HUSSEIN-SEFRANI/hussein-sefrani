"""البند 73: «يد التحكم» من جديد: قائمة القبضات (تعديل · فصل · إلغاء الاقتران) و«إضافة قبضة» بالأسفل،
و«تعديل» فيه رسم القبضة (يضيء مع الضغط)، والتعديلات معلّقة حتى «حفظ التعديل» ثم رسالة تأكيد."""
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
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,tv_pin,created_at) VALUES ('baba',?,1,'adult',?,'x')",
           (generate_password_hash("p"), generate_password_hash("1234")))
db.execute("INSERT INTO users(username,password_hash,is_admin,tv_role,created_at) VALUES ('sara',?,0,'kid','x')", (generate_password_hash("p"),)); db.commit()
c = app.test_client()
with c.session_transaction() as s:
    s["tv_uid"] = 1
kid = app.test_client()
with kid.session_transaction() as s:
    s["tv_uid"] = 2

# ------------------------------------------------------------------ السيرفر: «فصل» يد واحدة
HX = APP / "appliance/hsef-extras"
fake = {"HSEF_EXTRAS_FAKE": "1", "PATH": "/usr/bin:/bin"}
res.append(ok(subprocess.run([sys.executable, str(HX), "bt-disconnect", "AA:BB:CC:DD:EE:FF"], env=fake).returncode == 0
              and subprocess.run([sys.executable, str(HX), "bt-disconnect", "bad"], env=fake, capture_output=True).returncode != 0,
              "hsef-extras bt-disconnect: يد واحدة بعنوانها، وعنوان غير صالح يُرفض"))
r1 = c.post("/api/tv/admin/bt/disconnect", json={"mac": "AA:BB:CC:DD:EE:FF"}).status_code
r2 = c.post("/api/tv/admin/bt/bogus", json={"mac": "AA:BB:CC:DD:EE:FF"}).status_code
r3 = kid.post("/api/tv/admin/bt/disconnect", json={"mac": "AA:BB:CC:DD:EE:FF"}).status_code
res.append(ok(r1 == 400 and r2 == 404 and r3 == 403, f"التلفاز: «disconnect» معروف (خارج الجهاز المخصص: غير متاح)، وللمدير فقط ← {r1}, {r2}, {r3}"))

cookie = c.get_cookie("session").value
node = shutil.which("node")
if not (node and subprocess.run([node, "-e", "require('playwright')"], capture_output=True).returncode == 0):
    res.append(ok(True, "(لا يوجد Playwright هنا: فُحص السيرفر فقط)"))
else:
    from werkzeug.serving import make_server
    srv = make_server("127.0.0.1", 0, app, threaded=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    js = r"""
    const { chromium } = require('playwright');
    const FNS = ['padScreen', 'padEditScreen'];
    (async () => {
      const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      await ctx.addCookies([{ name: 'session', value: process.env.T_COOKIE, domain: '127.0.0.1', path: '/' }]);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
      await p.addInitScript(() => {
        const mk = (id, index) => ({ id, index, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0],
          buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) });
        window.__pads = [mk('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', 0), mk('Xbox 360 Controller (XInput STANDARD GAMEPAD)', 1)];
        navigator.getGamepads = () => window.__pads;
      });
      const calls = [];
      await p.route('**/api/tv/admin/bt**', (route) => {
        const u = route.request().url(); if (route.request().method() === 'POST') calls.push([u.split('/').pop(), route.request().postData()]);
        route.fulfill({ json: { available: true, installed: true, adapter: true, powered: true, devices: [
          { mac: 'AA:BB:CC:DD:EE:FF', name: 'DualSense Wireless Controller', paired: true, connected: true, icon: 'input-gaming', pad: true },
          { mac: '11:22:33:44:55:66', name: 'Pro Controller', paired: true, connected: false, icon: 'input-gaming', pad: true },
          { mac: '77:88:99:AA:BB:CC', name: 'Galaxy S21', paired: false, connected: false, icon: 'phone', pad: false }] } });
      });
      await p.route('**/api/tv/pads/battery', (route) => route.fulfill({ json: { pads: [{ id: 'x', name: 'DualSense Wireless Controller', mac: 'AA:BB:CC:DD:EE:FF', capacity: 76, status: 'Discharging', vendor: '054c', product: '0ce6' }] } }));
      await p.route(/\/static\/js\/tv\.js/, async (route) => {
        const r = await route.fetch(); let body = await r.text();
        for (const f of FNS) body = body.replace(new RegExp(`(async )?function ${f}\\(`), (m) => `window.${f} = ${f}; ${m}`);
        route.fulfill({ response: r, body });
      });
      await p.goto(process.env.T_URL); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
      // كأن اليدين اتصلتا وضُغط فيهما زر (فتصير الأولى «اللاعب 1»)
      await p.evaluate(() => { for (const g of window.__pads) { const e = new Event('gamepadconnected'); e.gamepad = g; window.dispatchEvent(e); } });
      for (const i of [0, 1]) { await p.evaluate((i) => { window.__pads[i].buttons[3].pressed = true; }, i); await p.waitForTimeout(150); await p.evaluate((i) => { window.__pads[i].buttons[3].pressed = false; }, i); await p.waitForTimeout(150); }
      const out = { errs };
      await p.evaluate(() => padScreen()); await p.waitForTimeout(1500);
      out.rows = await p.evaluate(() => [...document.querySelectorAll('.pad-row')].map((r) => [r.querySelector('.pr-tx b').textContent, r.querySelector('.pr-tx span').textContent,
        [...r.querySelectorAll('[data-a]')].map((b) => b.dataset.a).join(','), r.querySelector('.pr-bat em')?.textContent || '', [...r.querySelectorAll('.btn')].map((x) => x.offsetWidth).join('/')]));
      // «فصل» ← رسالة تأكيد ← «إلغاء» لا يرسل شيئاً، ثم «فصل» يرسل
      await p.evaluate(() => document.querySelector('.pad-row [data-a="disc"]').click()); await p.waitForTimeout(300);
      out.modalFocus = await p.evaluate(() => document.querySelector('.tv-modal .focus')?.textContent);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      out.afterCancel = [calls.length, await p.evaluate(() => !!document.querySelector('.tv-modal'))];
      await p.evaluate(() => document.querySelector('.pad-row [data-a="disc"]').click()); await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelector('.tv-modal .js-yes').click()); await p.waitForTimeout(600);
      out.calls = calls.slice();
      // «تعديل» الأولى: الرسم يضيء مع الضغط، والتعديل معلّق حتى «حفظ» ثم التأكيد
      await p.evaluate(() => document.querySelector('.pad-row [data-a="edit"]').click()); await p.waitForTimeout(800);
      await p.evaluate(() => { window.__pads[0].buttons[0].pressed = true; window.__pads[0].buttons[6].pressed = true; window.__pads[0].axes[0] = 1; }); await p.waitForTimeout(200);
      out.lit = await p.evaluate(() => [...document.querySelectorAll('.pad-svg [data-p].on')].map((e) => e.dataset.p).join(','));
      await p.evaluate(() => { window.__pads[0].buttons[0].pressed = false; window.__pads[0].buttons[6].pressed = false; window.__pads[0].axes[0] = 0; }); await p.waitForTimeout(200);
      out.rowsEdit = await p.evaluate(() => [...document.querySelectorAll('.js-opts .opt-row b')].map((b) => b.firstChild.textContent));
      // النوع: ← مرتين (تلقائي ← بلايستيشن ← إكس بوكس) ثم «حفظ» ← تأكيد ← نعم
      await p.evaluate(() => { const r = [...document.querySelectorAll('.js-opts .opt-row')].find((x) => x.textContent.includes('نوع اليد')); r.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
      await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(200);
      out.pendingKind = await p.evaluate(() => [...document.querySelectorAll('.js-opts .opt-row.changed .ov em')].map((e) => e.textContent).join('|'));
      out.kindBefore = await p.evaluate(() => localStorage.getItem('hsef-padtypes'));
      await p.evaluate(() => document.querySelector('.js-save').click()); await p.waitForTimeout(300);
      out.confirmText = await p.evaluate(() => document.querySelector('.tv-modal')?.innerText);
      await p.evaluate(() => document.querySelector('.tv-modal .js-yes').click()); await p.waitForTimeout(500);
      out.kindAfter = await p.evaluate(() => localStorage.getItem('hsef-padtypes'));
      out.backOnList = await p.evaluate(() => !!document.querySelector('.pad-list'));
      console.log(JSON.stringify(out)); await b.close();
    })();
    """
    out = subprocess.run([node, "-e", js], capture_output=True, text=True, timeout=240,
                         env={**os.environ, "T_URL": f"http://127.0.0.1:{srv.server_port}/tv", "T_OUT": str(T), "T_COOKIE": cookie})
    srv.shutdown()
    try:
        r = json.loads(out.stdout.strip().splitlines()[-1])
    except Exception:
        r = {"rows": [], "error": (out.stderr or out.stdout)[-400:]}
    rows = {x[0]: x for x in r.get("rows", [])}
    ds, xb, pro = rows.get("DualSense Wireless Controller"), rows.get("Xbox 360 Controller"), rows.get("Pro Controller")
    res.append(ok(ds and xb and pro and ds[2] == "edit,disc,unpair" and xb[2] == "edit" and pro[2] == "edit,unpair" and "Galaxy S21" not in rows,
                  f"القائمة: القبضات فقط (لا الهاتف)، والأزرار حسب الحالة: متصلة بالبلوتوث (تعديل·فصل·إلغاء) وسلكية (تعديل) ومقترنة غير متصلة (تعديل·إلغاء) ← {list(rows.values())} {r.get('error', '')}"))
    res.append(ok(ds and "اللاعب 1" in ds[1] and "الأساسية" in ds[1] and ds[3] == "76%" and xb and "سلكية" in xb[1] and pro and "غير متصلة" in pro[1],
                  "الحالة: اللاعب والأساسية، والبطارية بالنسبة، وسلكية، وغير متصلة"))
    widths = {w for x in r.get("rows", []) for w in x[4].split("/") if w}
    res.append(ok(len(widths) == 1, f"كل الأزرار بعرض واحد ← {sorted(widths)}"))
    res.append(ok(r.get("modalFocus") == "فصل" and r.get("afterCancel") == [0, False] and r.get("calls") == [["disconnect", '{"mac":"AA:BB:CC:DD:EE:FF"}']],
                  f"«فصل» ← رسالة تأكيد؛ «إلغاء» لا يرسل شيئاً، و«فصل» يرسل للقبضة الصحيحة ← {r.get('afterCancel')}, {r.get('calls')}"))
    res.append(ok(r.get("lit") == "l2,b0,ls", f"«تعديل»: رسم القبضة يضيء مع الضغط (L2، الزر السفلي، العصا اليسرى) ← {r.get('lit')}"))
    res.append(ok(r.get("pendingKind") == "إكس بوكس" and r.get("kindBefore") is None and "تأكيد التعديل" in (r.get("confirmText") or "")
                  and "النوع: إكس بوكس" in (r.get("confirmText") or "") and json.loads(r.get("kindAfter") or "{}") == {"DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)": "xbox"}
                  and r.get("backOnList") is True,
                  f"التعديل معلّق (✎) حتى «حفظ التعديل»، ثم رسالة تأكيد فيها ما سيتغير، ثم يُطبَّق ويرجع إلى القائمة ← {r.get('kindBefore')} → {r.get('kindAfter')}"))
    res.append(ok("errs" in r and not r["errs"], f"لا أخطاء في الصفحة ← {r.get('errs', r.get('error'))}"))
js_src = (APP / "static/js/tv.js").read_text(encoding="utf-8")
tr = (APP / "static/js/i18n-tv.js").read_text(encoding="utf-8")
need = ["إضافة قبضة", "إلغاء الاقتران", "فصل", "تعديل القبضة", "حفظ التعديل", "تأكيد التعديل", "نعم، احفظ", "نوع اليد", "زر الموافقة"]
res.append(ok("function playersHTML" not in js_src and "function padMainScreen" not in js_src and all(f'"{k}":' in tr for k in need)
              and 't.padTest && ["l1", "r1", "l2", "r2"' in js_src,
              "لا بقايا للشاشة القديمة، والترجمة موجودة، وتجربة الأزرار في «تعديل» لا تغيّر الصوت"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
