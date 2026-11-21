"""يصنع ملف الإضافة (ZIP) لرفعه من لوحة التحكم ← الإضافات.

  python3 addons/build.py whatsapp [مجلد_الإخراج]
الإضافات ليست في الإيزو ولا في حزمة التحديث (خارج home-nas). مجلد dev/ (أدوات الاختبار) لا يدخل الملف.
"""
import json
import sys
import zipfile
from pathlib import Path

SKIP_DIRS = {"dev", "__pycache__", ".git"}


def build(name: str, out_dir: Path) -> Path:
    src = Path(__file__).resolve().parent / name
    meta = json.loads((src / "addon.json").read_text(encoding="utf-8"))
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{meta['id']}-{meta['version']}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(src.rglob("*")):
            rel = f.relative_to(src)
            if f.is_file() and not (set(rel.parts) & SKIP_DIRS) and f.suffix != ".pyc":
                z.write(f, rel.as_posix())
    return out


if __name__ == "__main__":
    print(build(sys.argv[1], Path(sys.argv[2]) if len(sys.argv) > 2 else Path.cwd()))
