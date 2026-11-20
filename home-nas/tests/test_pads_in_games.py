"""إصلاح (1.9.15): القبضة لا تتحكم داخل الألعاب مع أكثر من قبضة.
السبب: منذ البند 49 «اللاعب 1» في اللعبة = اليد الأساسية في التلفاز ولو لم يُضغط فيها شيء داخل اللعبة، والقوائم تتحرك بها وحدها.
فإن كانت الأساسية يداً أخرى (أو «مستشعر الحركة» في يد PS5) لا تستجيب اليد التي في اليد."""
import json, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
kit = (APP / "static/kit/kit.js").read_text(encoding="utf-8")
start = kit.index("  const pad = { dir: null"); end = kit.index("\n  requestAnimationFrame(poll);\n", start)
sim = r"""
const K = { moves: [], presses: 0, move(d) { this.moves.push(d); }, press() { this.presses++; }, back() {}, audioCtx() {} };
const localStorage = { getItem: () => null };
let pads = [];
const navigator = { getGamepads: () => pads };
let parentOrder = [];
const window = { parent: { hsefPadOrder: () => parentOrder } };
let rafCb = null; const requestAnimationFrame = (f) => { rafCb = f; };
const mk = (i, id, b = {}, ax = [0, 0]) => ({ id, index: i, connected: true, mapping: "standard", axes: ax, buttons: Array.from({ length: 17 }, (_, k) => ({ pressed: !!b[k], value: b[k] ? 1 : 0 })) });
""" + kit[start:end] + r"""
const step = (t) => poll(t);
const DS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
// يد 0 = «الأساسية» في التلفاز وموضوعة جانباً، ويد 2 = مستشعر الحركة (أرقامه تتحرك)، ويد 1 = التي يلعب بها الطفل
parentOrder = [0, 1];
pads = [mk(0, DS), mk(1, DS), mk(2, "DualSense Wireless Controller Motion Sensors", {}, [0.9, -0.8])]; step(1000);
const before = K.pads().map((g) => g.index);
pads[1] = mk(1, DS, { 15: 1 }); step(2000); pads[1] = mk(1, DS); step(2100);
pads[1] = mk(1, DS, { 0: 1 }); step(2200); pads[1] = mk(1, DS); step(2300);
const after = K.pads().map((g) => g.index);
// الأساسية تنضم بعد ذلك: تصير اللاعب 1 (ترتيب التلفاز) والثانية اللاعب 2
pads[0] = mk(0, DS, { 0: 1 }); step(3000); pads[0] = mk(0, DS); step(3100);
console.log(JSON.stringify({ before, moves: K.moves, presses: K.presses, after, both: K.pads().map((g) => g.index) }));
"""
out = subprocess.run(["node", "-e", sim], capture_output=True, text=True)
v = json.loads(out.stdout) if out.returncode == 0 else {}
res.append(ok(v.get("before") == [], f"قبل أي ضغطة داخل اللعبة: لا لاعبين (لا «الأساسية» الموضوعة جانباً ولا مستشعر الحركة) ← {v or out.stderr[-300:]}"))
res.append(ok(v.get("moves") == ["right"] and v.get("presses") == 2 and v.get("after") == [1], "اليد التي في اليد تحرّك القوائم وتختار، وتصير اللاعب 1 (وكل يد تُستعمل تختار)"))
res.append(ok(v.get("both") == [0, 1], "حين تُستعمل اليد الأساسية أيضاً: هي اللاعب 1 (ترتيب التلفاز) والأخرى اللاعب 2"))
tv = (APP / "static/js/tv.js").read_text(encoding="utf-8")
res.append(ok("motion sensors|touchpad" in tv and "motion sensors|touchpad" in kit, "مستشعر الحركة ليس يداً في التلفاز ولا في الألعاب"))
for g in ("حروفي العربية", "سارة والتفكير", "سباق السيارات"):
    t = (APP / "games" / g / "game.js").read_text(encoding="utf-8")
    res.append(ok("motion sensors|touchpad" in t and subprocess.run(["node", "--check", str(APP / "games" / g / "game.js")]).returncode == 0, f"«{g}» (تقرأ اليد بنفسها) تتجاهل مستشعر الحركة"))
copies = list((APP / "games").rglob("kit.js"))
res.append(ok(all(p.read_bytes() == (APP / "static/kit/kit.js").read_bytes() for p in copies), f"نسخ kit.js ({len(copies)}) محدّثة"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
