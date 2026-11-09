"""نظام الملفات الافتراضي: يحوّل مسارات مثل /home/Photos إلى مسارات حقيقية مع التحقق من الصلاحيات.

الجذور المتاحة لكل مستخدم:
  /home          ← المجلد الشخصي (قراءة وكتابة)
  /homes         ← مجلدات كل المستخدمين (للمدير فقط)
  /<اسم المجلد>  ← المجلدات المشتركة حسب الصلاحية (ro / rw)
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from flask import abort

from .core import get_db, home_dir, is_within, paths

PERM_LABELS = {"rw": "قراءة وكتابة", "ro": "قراءة فقط"}


@dataclass
class Root:
    name: str
    label: str
    path: Path
    perm: str  # 'rw' | 'ro'
    kind: str  # 'home' | 'homes' | 'share'
    folder_id: int | None = None

    def as_dict(self) -> dict:
        return {"name": self.name, "label": self.label, "perm": self.perm, "kind": self.kind}


def folder_perm(user, folder_id: int) -> str | None:
    if user["is_admin"]:
        return "rw"
    row = get_db().execute("SELECT perm FROM folder_perms WHERE folder_id=? AND user_id=?",
                           (folder_id, user["id"])).fetchone()
    return row["perm"] if row and row["perm"] in ("ro", "rw") else None


def roots_for(user) -> list[Root]:
    roots = [Root("home", "المجلد الشخصي", home_dir(user["username"]), "rw", "home")]
    if user["is_admin"]:
        roots.append(Root("homes", "مجلدات المستخدمين", paths().homes, "rw", "homes"))
    for f in get_db().execute("SELECT * FROM folders ORDER BY name COLLATE NOCASE"):
        perm = folder_perm(user, f["id"])
        if perm:
            p = Path(f["path"])
            p.mkdir(parents=True, exist_ok=True)
            roots.append(Root(f["name"], f["name"], p, perm, "share", f["id"]))
    return roots


def split(vpath: str) -> list[str]:
    parts = [p for p in (vpath or "").replace("\\", "/").split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts):
        abort(400, "مسار غير صالح")
    return parts


def resolve(user, vpath: str, need_write: bool = False) -> tuple[Root, Path]:
    parts = split(vpath)
    if not parts:
        abort(400, "اختر مجلداً")
    root = next((r for r in roots_for(user) if r.name.lower() == parts[0].lower()), None)
    if root is None:
        abort(404, "المجلد غير موجود أو لا تملك صلاحية الوصول")
    base = root.path.resolve()
    target = base.joinpath(*parts[1:]).resolve() if len(parts) > 1 else base
    if not is_within(target, base):
        abort(403, "خارج المجلد المسموح")
    if need_write and root.perm != "rw":
        abort(403, "لا تملك صلاحية الكتابة في هذا المجلد")
    return root, target


def to_vpath(root: Root, abs_path: Path) -> str:
    rel = abs_path.resolve().relative_to(root.path.resolve()).as_posix()
    return f"/{root.name}" + ("" if rel == "." else f"/{rel}")
