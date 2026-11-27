"""البند 5 (إصلاح سامسونغ): قراءة أزرار الريموت من رسائل الاتصال (-d 8)، وإعلان «المصدر النشط»، وإرشاد Anynet+."""
import sys, subprocess
from pathlib import Path
APP = Path(sys.argv[1]).resolve()
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
g = {"__name__": "x"}; exec(compile((APP / "appliance/hsef-cec").read_text(encoding="utf-8"), "hsef-cec", "exec"), g)
P = g["parse_line"]
res.append(ok(P("TRAFFIC: [  1234]\t>> 04:44:01") == ("key", 1), "زر «أعلى» من رسالة الاتصال ‎>> 04:44:01 (بلا سطر DEBUG)"))
res.append(ok(P(">> 04:44:00") == ("key", 0) and P(">> 04:44:0d") == ("key", 0x0d) and P(">> 04:44:91") == ("key", 0x91), "«موافق» و«رجوع» (سامسونغ 0x91)"))
res.append(ok(P(">> 04:45") == ("traffic", None), "رفع الإصبع عن الزر لا يُحسب ضغطة ثانية"))
res.append(ok(P(">> 04:44:40") == ("power", None) and P(">> 0f:36") == ("standby", None), "زر الإطفاء ما زال يُتجاهل"))
res.append(ok(P(">> 0f:85") == ("ask", None) and P(">> 0f:86:10:00") == ("ask", None), "التلفاز يسأل عن المصدر ← نرد «as»"))
res.append(ok(P("<< 40:82:10:00") is None, "رسائلنا نحن (<<) لا تُحسب"))
src = (APP / "appliance/hsef-cec").read_text(encoding="utf-8")
res.append(ok('for c in ("as", "osd 0")' in src and 'state["keys"] += 1' in src and 'state["traffic"] += 1' in src, "عند الاتصال نعلن أننا المصدر النشط، ونعدّ الرسائل والأزرار"))
js = (APP / "static/js/apps/tvadmin.js").read_text(encoding="utf-8")
res.append(ok("Anynet+" in js and "r.traffic" in js and subprocess.run(["node", "--check", str(APP / "static/js/apps/tvadmin.js")]).returncode == 0, "إرشاد سامسونغ Anynet+ وعدد رسائل التلفاز في «ريموت التلفاز»"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
