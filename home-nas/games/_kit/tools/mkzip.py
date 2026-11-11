"""يصنع الملفات المضغوطة للألعاب (أسماء عربية بترميز UTF-8، ومع المجلدات الفارغة مثل sounds و صور).

    python3 games/_kit/tools/mkzip.py "<اسم اللعبة>"   ← games/<اسم اللعبة>.zip (لعبة واحدة)
    python3 games/_kit/tools/mkzip.py --all            ← «ألعاب الأطفال.zip» (كل الألعاب) و«تطبيقات التعلم.zip»
"""
import os
import sys
import urllib.parse
import zipfile

GAMES = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = "https://github.com/HUSSEIN-SEFRANI/hussein-sefrani/raw/claude/eager-wright-ytkzo1/home-nas/games/"
LEARN = ["الجمع والطرح", "موسوعة الحيوانات", "حديقتي", "جملة", "جغرافيا"]


def all_games():
    return sorted(d for d in os.listdir(GAMES) if not d.startswith("_") and os.path.isfile(os.path.join(GAMES, d, "index.html")))


def build(out_name, games, top=None, readme=False):
    out = os.path.join(GAMES, out_name)
    pre = (top + "/") if top else ""
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        if readme:
            z.write(os.path.join(GAMES, "اقرأني.txt"), pre + "اقرأني.txt")
        for g in games:
            for dp, dn, fn in os.walk(os.path.join(GAMES, g)):
                dn.sort()
                z.writestr(pre + os.path.relpath(dp, GAMES) + "/", "")
                for f in sorted(fn):
                    p = os.path.join(dp, f)
                    z.write(p, pre + os.path.relpath(p, GAMES))
    n = len(zipfile.ZipFile(out).namelist())
    print(f"{out_name}: {os.path.getsize(out) // 1024} KB, {n} ملف")
    print("   " + RAW + urllib.parse.quote(out_name))


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args == ["--all"]:
        build("ألعاب الأطفال.zip", all_games(), "ألعاب الأطفال", readme=True)
        build("تطبيقات التعلم.zip", LEARN, "تطبيقات التعلم", readme=True)
    else:
        for g in args:
            if g not in all_games():
                sys.exit(f"لا توجد لعبة باسم «{g}»")
            build(g + ".zip", [g])
