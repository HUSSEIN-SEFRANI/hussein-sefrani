"""البند 51: زر PS يُخرج من اللعبة بعد رسالة تأكيد (واللعبة متوقفة خلفها)، و«موافق/رجوع» في الألعاب كما في التلفاز
(إعداد «الموافقة بزر ○» ويد نينتندو)، فلا يختلط زر الرجوع بزر الدائرة."""
import json, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
kit = (APP / "static/kit/kit.js").read_text(encoding="utf-8")
start = kit.index("  const pad = { dir: null"); end = kit.index("\n  requestAnimationFrame(poll);\n", start)
sim = r"""
const K = { log: [], move(d) { this.log.push(d); }, press() { this.log.push("ok"); }, back() { this.log.push("back"); }, audioCtx() {} };
const localStorage = { getItem: () => null };
let pads = [], swapAll = false;
const navigator = { getGamepads: () => pads };
const window = { parent: { hsefPadOrder: () => [], hsefPadSwap: (g) => swapAll !== /Pro Controller/.test(g.id) } };
const requestAnimationFrame = () => {};
const mk = (i, id, b = {}) => ({ id, index: i, connected: true, mapping: "standard", axes: [0, 0], buttons: Array.from({ length: 17 }, (_, k) => ({ pressed: !!b[k], value: b[k] ? 1 : 0 })) });
""" + kit[start:end] + r"""
const DS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", NS = "Pro Controller (Vendor: 057e Product: 2009)";
let t = 1000;
const tap = (id, k) => { pads = [mk(0, id, { [k]: 1 })]; poll(t += 100); pads = [mk(0, id)]; poll(t += 100); };
const run = (id, sw) => { swapAll = sw; K.log = []; tap(id, 0); tap(id, 1); return K.log.join(","); };
console.log(JSON.stringify({ ps: run(DS, false), psSwap: run(DS, true), nin: run(NS, false) }));
"""
out = subprocess.run(["node", "-e", sim], capture_output=True, text=True)
v = json.loads(out.stdout) if out.returncode == 0 else {}
res.append(ok(v.get("ps") == "ok,back", f"يد بلايستيشن: ✕ موافق و○ رجوع داخل اللعبة ← {v or out.stderr[-300:]}"))
res.append(ok(v.get("psSwap") == "back,ok", "مع إعداد التلفاز «الموافقة بزر ○»: اللعبة تتبعه (○ موافق و✕ رجوع)"))
res.append(ok(v.get("nin") == "back,ok", "يد نينتندو: موافق ورجوع في اللعبة كما في التلفاز (معكوسان)"))

tv = (APP / "static/js/tv.js").read_text(encoding="utf-8")
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/tv.js")]).returncode == 0, "tv.js سليم"))
res.append(ok("window.hsefPadSwap" in tv and "padPrefs.swap !== (padKind(g) === \"nintendo\")" in tv, "التلفاز يعطي الألعاب إعداد موافق/رجوع لكل يد"))
res.append(ok('if (name === "ps") { if (t.askExit) t.askExit(); else padKey("Escape"); }' in tv and 'if (name === "ps") { t.closeAsk(true); return; }' in tv,
              "زر PS في اللعبة: يسأل أولاً، ومرة ثانية يخرج"))
gs = tv[tv.index("async function gameScreen"):tv.index("function appScreen")]
res.append(ok("askGameExit(scr, fr); return true;" in gs and "pop(); return true" not in gs and "e.preventDefault(); pop();" not in gs,
              "«رجوع» في الريموت وEsc يسألان أيضاً (لا خروج مباشر)"))
res.append(ok("if (padsBlocked) return [];" in tv and "fr.inert = true" in tv and "freezeGame(fr, true)" in tv and "whenPadsReleased" in tv,
              "أثناء الرسالة: اللعبة متوقفة ولا ترى الأيادي، ولا تصلها ضغطة «أكمل اللعب»"))
res.append(ok("الخروج من اللعبة؟" in tv and "أكمل اللعب" in tv and "نعم، اخرج" in tv and 'setFocus(box.querySelector(".js-stay"))' in tv,
              "الرسالة: «الخروج من اللعبة؟» والتركيز على «أكمل اللعب» (الضغط بالخطأ لا يُخرج)"))
i18n = (APP / "static/js/i18n-tv.js").read_text(encoding="utf-8")
res.append(ok(all(f'"{k}":' in i18n for k in ("الخروج من اللعبة؟", "أكمل اللعب", "نعم، اخرج", "للخروج", "للعودة إلى اللعبة", "زر «رجوع» في الريموت")),
              "الرسالة مترجمة (الإنجليزية والفرنسية والتركية والهولندية)"))
res.append(ok("<b>PS</b> للخروج من اللعبة" in kit, "مساعدة الألعاب تذكر زر PS للخروج"))
copies = list((APP / "games").rglob("kit.js"))
res.append(ok(all(p.read_bytes() == (APP / "static/kit/kit.js").read_bytes() for p in copies), f"نسخ kit.js ({len(copies)}) محدّثة"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
