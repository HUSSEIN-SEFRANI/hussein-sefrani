"""البند 47: الألعاب والتطبيقات التعليمية تأتي مع النظام (الإيزو والتحديث)، وتوضع في «الألعاب» و«التعليم»."""
import json, shutil, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import create_app
from homenas.core import connect, Paths
from homenas import bundled
from homenas.tv import share_dir
T = Path(tempfile.mkdtemp())
# حزمة صغيرة: لعبتان وتطبيق تعليمي
B = T / "bundle"
def mk(name, typ, text="v1"):
    d = B / name; d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(f"<h1>{name} {text}</h1>", encoding="utf-8")
    (d / "game.js").write_text(f"// {text}", encoding="utf-8")
    (d / "kit.js").write_text("// kit.js — old", encoding="utf-8")
    (d / "app.json").write_text(json.dumps({"name": name, "type": typ}), encoding="utf-8")
mk("الأفعى", "game"); mk("كرة القدم", "game"); mk("جدول الضرب", "education")
(B / "_kit").mkdir(); (B / "_kit/index.html").write_text("x"); (B / "قديم.zip").write_bytes(b"PK")
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
app = create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
G, E = share_dir(db, P, "games"), share_dir(db, P, "learn")
r = bundled.seed(db, P, root=B)
res.append(ok(sorted(r["added"]) == sorted(["الأفعى", "كرة القدم", "جدول الضرب"]), f"أول تشغيل: 3 تطبيقات وُضعت ← {r['added']}"))
res.append(ok((G / "الأفعى/index.html").is_file() and (G / "كرة القدم").is_dir() and (E / "جدول الضرب/index.html").is_file() and not (G / "_kit").exists(),
              "الألعاب في «الألعاب» والتعليم في «التعليم» حسب app.json (و_kit لا يُنسخ)"))
res.append(ok(bundled.seed(db, P, root=B) == {"added": [], "updated": [], "kept": [], "skipped": []}, "التشغيل التالي بلا تغيير: لا شيء يُعمل"))
# المدير يحذف لعبة ويعدّل أخرى، ثم يأتي تحديث بنسخ جديدة
shutil.rmtree(G / "كرة القدم")
(G / "الأفعى/game.js").write_text("// عدّلها المدير", encoding="utf-8")
mk("الأفعى", "game", "v2"); mk("كرة القدم", "game", "v2"); mk("جدول الضرب", "education", "v2"); mk("الطائرات", "game")
r = bundled.seed(db, P, root=B, force=True)
res.append(ok(r["added"] == ["الطائرات"] and "كرة القدم" in r["skipped"] and not (G / "كرة القدم").exists(), "تطبيق جديد يُضاف، والمحذوف لا يرجع"))
res.append(ok("جدول الضرب" in r["updated"] and "v2" in (E / "جدول الضرب/index.html").read_text(encoding="utf-8")
              and any((E / "#recycle").glob("جدول الضرب*")), "تطبيق لم يغيّره أحد يُحدَّث، والقديم إلى سلة المحذوفات"))
res.append(ok("الأفعى" in r["kept"] and (G / "الأفعى/game.js").read_text(encoding="utf-8") == "// عدّلها المدير", "تطبيق عدّله المدير يبقى كما هو"))
# جهاز قديم: المدير رفع الألعاب بنفسه (بعضها داخل مجلد ZIP)، ونقل لعبة إلى «التعليم»
T2 = Path(tempfile.mkdtemp())
cfg2 = {**cfg, "data_dir": str(T2 / "d")}
create_app(cfg2, start_indexer=False); P2 = Paths(cfg2["data_dir"]); db2 = connect(P2.db)
G2, E2 = share_dir(db2, P2, "games"), share_dir(db2, P2, "learn")
shutil.copytree(B / "الأفعى", G2 / "الألعاب-22" / "الأفعى")     # فُكّ فيه ملف ZIP
shutil.copytree(B / "كرة القدم", E2 / "كرة القدم")               # نقلها المدير إلى «التعليم»
(G2 / "الألعاب-22/الأفعى/kit.js").write_text("// kit.js — newer", encoding="utf-8")   # kit لا يُحسب
r = bundled.seed(db2, P2, root=B)
res.append(ok(not (G2 / "الأفعى").exists() and not (G2 / "كرة القدم").exists() and "الأفعى" in r["kept"] and "كرة القدم" in r["kept"],
              "لا تكرار: يجد اللعبة داخل مجلد ZIP، أو في المجلد الآخر إن نقلها المدير"))
res.append(ok(sorted(r["added"]) == sorted(["جدول الضرب", "الطائرات"]), "ويضيف الناقص فقط"))
# الحزمة الحقيقية في المستودع
real = bundled.bundle_apps()
types = [json.loads((a / "app.json").read_text(encoding="utf-8")).get("type") for a in real]
res.append(ok(len(real) >= 43 and types.count("game") >= 22 and types.count("education") >= 21, f"المستودع فيه {types.count('game')} لعبة و{types.count('education')} تطبيقاً تعليمياً"))
iso = (APP / "installer/build-installer-iso.sh").read_text(encoding="utf-8")
wf = (APP.parent / ".github/workflows/homenas-iso.yml").read_text(encoding="utf-8")
res.append(ok("--exclude=./games " not in iso and "--exclude=./games \\" not in wf and "./games/*.zip" in iso and "./games/*.zip" in wf,
              "الإيزو وحزمة التحديث فيهما الألعاب (بلا ملفات ZIP)"))
init = (APP / "homenas/__init__.py").read_text(encoding="utf-8")
res.append(ok('cfg.get("seed_apps", os.environ.get("HOMENAS_APPLIANCE") == "1")' in init, "يعمل تلقائياً على الجهاز عند كل تشغيل بعد تنصيب أو تحديث"))
st = json.loads(db2.execute("SELECT value FROM settings WHERE key='bundled_last'").fetchone()["value"])
res.append(ok(st.get("added") == 2, "يُسجَّل آخر وضع للتطبيقات"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(T, ignore_errors=True); shutil.rmtree(T2, ignore_errors=True); sys.exit(0 if all(res) else 1)
