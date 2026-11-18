import json, runpy, sys
g = runpy.run_path(sys.argv[1] + "/appliance/hsef-extras", run_name="nomain")
plan = g["screen_plan"]
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
M = lambda w, h, cur=False: {"width": w, "height": h, "current": cur}
outs = [{"name": "HDMI-A-1", "enabled": True, "modes": [M(3840, 2160, True), M(1920, 1080)]},
        {"name": "HDMI-A-2", "enabled": False, "modes": [M(1920, 1080), M(1280, 720)]},
        {"name": "eDP-1", "enabled": False, "modes": [M(1366, 768)]}]
res = []
res.append(ok(plan(outs) == [], "تلقائي: HDMI-A-1 معروضة أصلاً ← لا تغيير"))
c = plan(outs, prefer="HDMI-A-2")
res.append(ok(c[0] == ["--output", "HDMI-A-2", "--on", "--pos", "0,0"] and ["--output", "HDMI-A-1", "--off"] in c, f"اختيار HDMI-A-2 ← تُشغَّل وتُطفأ الأولى: {c}"))
c = plan(outs, prefer="DP-9")
res.append(ok(c == [], "الشاشة المختارة غير موصولة ← التلقائي (HDMI-A-1)"))
t = set(); c = plan(outs, "", t, "HDMI-A-1", {"HDMI-A-1": "1920x1080", "HDMI-A-2": "1280x720"})
res.append(ok(c == [["--output", "HDMI-A-1", "--mode", "1920x1080"]], f"دقة محفوظة لكل شاشة: {c}"))
res.append(ok(plan(outs, "", t, "HDMI-A-1", {"HDMI-A-1": "1920x1080"}) == [], "لا تُعاد المحاولة نفسها"))
t = set(); c = plan(outs, "1920x1080", t, "", {})
res.append(ok(c == [["--output", "HDMI-A-1", "--mode", "1920x1080"]], "الدقة العامة القديمة (tv-mode) ما زالت تعمل"))
lap = [{"name": "eDP-1", "enabled": True, "modes": [M(1366, 768, True)]}, {"name": "HDMI-A-1", "enabled": False, "modes": [M(1920, 1080)]}]
res.append(ok(plan(lap)[0] == ["--output", "HDMI-A-1", "--on", "--pos", "0,0"], "لابتوب + تلفاز ← التلفاز تلقائياً (كما كان)"))
res.append(ok(plan(lap, prefer="eDP-1") == [], "واختيار شاشة اللابتوب يدوياً ممكن"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
