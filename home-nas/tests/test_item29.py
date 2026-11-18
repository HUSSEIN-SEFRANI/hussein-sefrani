"""البند 29: ترتيب لوحة التحكم الجديد (قائمة واحدة، وتبويبات داخل القسم)."""
import json, re, subprocess, sys
from pathlib import Path
APP = Path(sys.argv[1])
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
js = (APP / "static/js/apps/system.js").read_text(encoding="utf-8")

# نقرأ SECTIONS كما هي من الملف (بـ node) حتى نختبر الترتيب الحقيقي
m = re.search(r"const SECTIONS = (\[.*?\n\]);", js, re.S)
res.append(ok(bool(m), "مصفوفة SECTIONS موجودة"))
out = subprocess.run(["node", "-e", f"const S={m.group(1)};console.log(JSON.stringify(S))"], capture_output=True, text=True)
S = json.loads(out.stdout)
labels = [s["label"] for s in S]
want = ["نظرة عامة", "عام", "حسابي", "المستخدمون", "الملفات والصور", "ربط الآيفون والأندرويد", "النسخ الاحتياطي",
        "وضع التلفاز", "اسم الجهاز على الشبكة", "من خارج المنزل", "التفعيل", "التصدير والاستيراد وإعادة الضبط",
        "إدارة التخزين", "المعالج", "الشبكة والأجهزة", "سجل النشاط"]
res.append(ok(labels == want, f"الترتيب كما طلب صاحب المشروع ({len(labels)} قسماً)"))
res.append(ok("GROUPS" not in js and not any("group" in s for s in S), "لا مجموعات في القائمة الجانبية"))
tabs = {s["id"]: [t["label"] for t in s.get("tabs", [])] for s in S}
res.append(ok(tabs["files"] == ["المجلدات المشتركة", "إعدادات الصور"], "الملفات والصور = المجلدات المشتركة + إعدادات الصور (تبويبان)"))
res.append(ok(tabs["hostname"] == ["اسم الجهاز", "قرص الشبكة والتلفاز الذكي"], "اسم الجهاز على الشبكة = اسم الجهاز + قرص الشبكة والتلفاز الذكي"))

# كل قسم وكل تبويب له دالة عرض في CP
cp = set(re.findall(r"^  (?:async )?(\w+)\(sc", js, re.M))
need = {t["id"] for s in S for t in s.get("tabs", [])} | {s["id"] for s in S if not s.get("tabs")}
res.append(ok(need <= cp, f"لكل قسم وتبويب دالة عرض (الناقص: {sorted(need - cp)})"))

# الروابط القديمة (photos، network، folders) تفتح القسم الصحيح
res.append(ok("TAB_PARENT" in js and "TAB_PARENT[id] || id" in js, "openApp('control', {section:'photos'}) يفتح «الملفات والصور» على تبويبها"))
# المستخدم العادي يبقى يرى «قرص الشبكة» (كان متاحاً له قبل)
net = next(t for s in S for t in s.get("tabs", []) if t["id"] == "network")
host = next(s for s in S if s["id"] == "hostname")
res.append(ok(not net.get("admin") and not host.get("admin"), "قرص الشبكة والتلفاز الذكي يبقى ظاهراً للمستخدم العادي"))

# حفظ الإعدادات في ملف انتقل من «النسخ الاحتياطي» إلى «التصدير والاستيراد وإعادة الضبط»
def body(name):
    a = js.index(f"  async {name}(sc")
    b = re.search(r"\n  (?:async )?\w+\(sc", js[a + 10:]).start() + a + 10
    return js[a:b]
bk, tr = body("backup"), body("transfer")
res.append(ok("/api/admin/transfer/export" not in bk and "/api/admin/transfer/import" not in bk, "لا تصدير/استيراد ملف في «النسخ الاحتياطي»"))
res.append(ok("/api/admin/transfer/export" in tr and "/api/admin/transfer/import" in tr and "/api/admin/transfer/reset" in tr,
              "التصدير والاستيراد وإعادة الضبط في قسم واحد"))
res.append(ok("Chrome" in body("phone"), "ربط الهاتف فيه خطوات أندرويد"))

# الترجمات للأسماء الجديدة
d = (APP / "static/js/i18n-dict.js").read_text(encoding="utf-8")
miss = [l for l in labels + [t for v in tabs.values() for t in v] if f'"{l}":' not in d]
res.append(ok(not miss, f"كل الأسماء مترجمة (الناقص: {miss})"))
res.append(ok(subprocess.run(["node", "--check", str(APP / "static/js/apps/system.js")]).returncode == 0, "system.js سليم"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
