"""البند 74: «شوارع بلجيكا» حُذفت من الإيزو وحزمة التحديث، والتحديث ينقلها من الأجهزة إلى سلة المحذوفات
(المباشرة وداخل مجلد ZIP، ولو عُدّلت)، ولا يلمس نسخة يضيفها المدير بنفسه بعد ذلك."""
import json, sys, tempfile
from pathlib import Path
APP = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or bool(c)
res = []
from homenas import bundled, create_app
from homenas.core import connect, Paths, RECYCLE
from homenas.tv import share_dir
NAME = "شوارع بلجيكا"
res.append(ok(not (APP / "games" / NAME).exists() and NAME in bundled.REMOVED, "اللعبة ليست في games/ (فلا تدخل الإيزو ولا التحديث)، وهي في قائمة «أُزيلت»"))
res.append(ok(NAME not in {a.name for a in bundled.bundle_apps()}, "لا تُوضع على جهاز جديد"))

T = Path(tempfile.mkdtemp())
def bundle(dirname, names):
    B = T / dirname
    for n in names:
        d = B / n; d.mkdir(parents=True)
        (d / "index.html").write_text(n); (d / "app.json").write_text(json.dumps({"name": n, "type": "game"}))
    return B
old_b = bundle("old", ["الأفعى", NAME])            # الإصدار القديم (2.0.2) فيه اللعبة
new_b = bundle("new", ["الأفعى"])                  # الإصدار الجديد بلاها
cfg = {"secret_key": "t", "data_dir": str(T / "d"), "port": 1, "host": "127.0.0.1", "max_upload_gb": 1}
create_app(cfg, start_indexer=False); P = Paths(cfg["data_dir"]); db = connect(P.db)
G = share_dir(db, P, "games")
r = bundled.seed(db, P, root=old_b)
zipcopy = G / "الألعاب-22" / NAME                  # ونسخة ثانية فكّها المدير من ملف ZIP
zipcopy.mkdir(parents=True); (zipcopy / "index.html").write_text("zip")
(G / NAME / "ملاحظة.txt").write_text("عدّلها المدير")   # والمباشرة معدّلة
res.append(ok(NAME in r["added"] and (G / NAME / "index.html").is_file(), "قبل التحديث: اللعبة على الجهاز (من 2.0.2)"))
r = bundled.seed(db, P, root=new_b)
rec = sorted(p.name for p in (G / RECYCLE).iterdir()) if (G / RECYCLE).is_dir() else []
res.append(ok(r.get("removed") == [NAME] and not (G / NAME).exists() and not zipcopy.exists(),
              f"بعد التحديث: أُزيلت النسختان (المباشرة المعدّلة وداخل مجلد ZIP) ← {r}"))
res.append(ok(len([x for x in rec if x.startswith(NAME)]) == 2 and (G / "الأفعى/index.html").is_file() and (G / "الألعاب-22").is_dir(),
              f"إلى سلة المحذوفات (تُسترجع خلال 30 يوماً)، وباقي الألعاب والمجلد كما هي ← {rec}"))
res.append(ok(NAME not in json.loads(db.execute("SELECT value FROM settings WHERE key='bundled_apps'").fetchone()[0]),
              "لم تعد في حالة التطبيقات المرفقة"))
(G / NAME).mkdir(); (G / NAME / "index.html").write_text("أضافها المدير بنفسه")
r = bundled.seed(db, P, root=new_b, force=True)
res.append(ok(not r.get("removed") and (G / NAME / "index.html").is_file(), "نسخة يضيفها المدير بنفسه بعد ذلك لا تُلمس"))
print(f"\n{sum(res)}/{len(res)} نجح"); sys.exit(0 if all(res) else 1)
