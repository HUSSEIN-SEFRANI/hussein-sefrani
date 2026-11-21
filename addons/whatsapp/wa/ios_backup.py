"""قراءة نسخة آيفون محلية (من idevicebackup2): Manifest.db والملفات، عادية أو مشفّرة بكلمة سر.

النسخة المشفّرة: BackupKeyBag في Manifest.plist ← كلمة السر (PBKDF2) ← مفاتيح الفئات (RFC 3394)
← مفتاح Manifest.db ومفتاح كل ملف (من بيانات الملف في Manifest.db) ← AES-256-CBC (بأمر openssl).
"""
from __future__ import annotations

import hashlib
import plistlib
import shutil
import sqlite3
import struct
import subprocess
from pathlib import Path

from . import aes

WRAP_PASSCODE = 2


class WrongPassword(Exception):
    pass


class NeedPassword(Exception):
    pass


def find_root(base: Path) -> Path | None:
    """idevicebackup2 يكتب النسخة في <المجلد>/<UDID>/ ؛ نرجع المجلد الذي فيه Manifest.db."""
    if (base / "Manifest.db").is_file():
        return base
    for d in sorted(base.iterdir()) if base.is_dir() else []:
        if d.is_dir() and (d / "Manifest.db").is_file():
            return d
    return None


def parse_keybag(blob: bytes) -> tuple[dict, dict]:
    """يرجع (الرأس، {الفئة: {WPKY, WRAP, …}})."""
    head, classes, cur = {}, {}, None
    i = 0
    while i + 8 <= len(blob):
        tag = blob[i:i + 4].decode("latin-1")
        n = struct.unpack(">I", blob[i + 4:i + 8])[0]
        val = blob[i + 8:i + 8 + n]
        i += 8 + n
        if n == 4:
            val = struct.unpack(">I", val)[0]
        if tag == "UUID" and "UUID" in head:
            if cur and "CLAS" in cur:
                classes[cur["CLAS"]] = cur
            cur = {"UUID": val}
        elif cur is not None:
            cur[tag] = val
        else:
            head[tag] = val
    if cur and "CLAS" in cur:
        classes[cur["CLAS"]] = cur
    return head, classes


def unlock_keybag(blob: bytes, password: str) -> dict:
    head, classes = parse_keybag(blob)
    pw = password.encode("utf-8")
    if "DPSL" in head:   # iOS 10.2 وما بعده: PBKDF2 مرتين
        pw = hashlib.pbkdf2_hmac("sha256", pw, head["DPSL"], head["DPIC"], 32)
    kek = hashlib.pbkdf2_hmac("sha1", pw, head["SALT"], head["ITER"], 32)
    keys = {}
    for cls, c in classes.items():
        if "WPKY" in c and c.get("WRAP", 0) & WRAP_PASSCODE:
            k = aes.unwrap(kek, c["WPKY"])
            if k is None:
                raise WrongPassword()
            keys[cls] = k
    if not keys:
        raise WrongPassword()
    return keys


def openssl_decrypt(key: bytes, src: Path, dst: Path, size: int | None = None):
    """AES-256-CBC بمتجه أصفار، ثم إزالة الحشو (PKCS7) أو القص إلى الحجم الأصلي."""
    r = subprocess.run(["openssl", "enc", "-d", "-aes-256-cbc", "-nopad", "-K", key.hex(), "-iv", "0" * 32,
                        "-in", str(src), "-out", str(dst)], capture_output=True)
    if r.returncode != 0:
        raise OSError("openssl: " + r.stderr.decode("utf-8", "replace")[-200:])
    total = dst.stat().st_size
    if size is not None and 0 <= size <= total:
        cut = size
    else:
        with open(dst, "rb") as f:
            f.seek(max(0, total - 16))
            tail = f.read()
        p = tail[-1] if tail else 0
        cut = total - p if 1 <= p <= 16 and tail.endswith(bytes([p]) * p) else total
    if cut != total:
        with open(dst, "r+b") as f:
            f.truncate(cut)


def _archived(blob):
    """NSKeyedArchiver: يرجع كائن الجذر مع حل المراجع (UID) لمستوى واحد."""
    try:
        d = plistlib.loads(blob)
    except Exception:
        return {}
    objs = d.get("$objects") or []
    top = (d.get("$top") or {}).get("root")
    root = objs[top.data] if isinstance(top, plistlib.UID) and top.data < len(objs) else {}
    if not isinstance(root, dict):
        return {}

    def res(v):
        if isinstance(v, plistlib.UID) and v.data < len(objs):
            v = objs[v.data]
        if isinstance(v, dict) and "NS.data" in v:
            v = v["NS.data"]
        return v
    return {k: res(v) for k, v in root.items()}


class Backup:
    def __init__(self, root: Path, work: Path):
        self.root = root
        self.work = work   # مجلد مؤقت لـ Manifest.db المفكوك
        self.work.mkdir(parents=True, exist_ok=True)
        info = plistlib.loads((root / "Manifest.plist").read_bytes())
        self.encrypted = bool(info.get("IsEncrypted"))
        self._info = info
        self.class_keys = None
        self._rk = {}
        self.db_path = root / "Manifest.db"
        self.db = None

    def open(self, password: str | None = None):
        if self.encrypted:
            if not password:
                raise NeedPassword()
            self.class_keys = unlock_keybag(self._info["BackupKeyBag"], password)
            mk = self._info["ManifestKey"]
            cls = struct.unpack("<I", mk[:4])[0]
            key = aes.unwrap(self.class_keys[cls], mk[4:]) if cls in self.class_keys else None
            if key is None:
                raise WrongPassword()
            plain = self.work / "Manifest.db"
            openssl_decrypt(key, self.root / "Manifest.db", plain)
            self.db_path = plain
        self.db = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        try:
            self.db.execute("SELECT 1 FROM Files LIMIT 1").fetchall()
        except sqlite3.DatabaseError:
            if self.encrypted:
                raise WrongPassword()
            raise
        return self

    def close(self):
        if self.db:
            self.db.close()
            self.db = None

    def device_name(self) -> str:
        try:
            info = plistlib.loads((self.root / "Info.plist").read_bytes())
            return str(info.get("Device Name") or info.get("Display Name") or "iPhone")
        except Exception:
            return "iPhone"

    def files(self, domain: str, like: str = "%") -> list[sqlite3.Row]:
        return self.db.execute("SELECT fileID, relativePath, flags, file FROM Files WHERE domain=? AND relativePath LIKE ? AND flags=1",
                               (domain, like)).fetchall()

    def find(self, domain: str, rel: str):
        return self.db.execute("SELECT fileID, relativePath, flags, file FROM Files WHERE domain=? AND relativePath=?", (domain, rel)).fetchone()

    def extract(self, row, dest: Path) -> bool:
        """ينسخ (أو يفك) ملفاً من النسخة إلى dest. يرجع False إن لم يكن موجوداً."""
        fid = row["fileID"]
        src = self.root / fid[:2] / fid
        if not src.is_file():
            src = self.root / fid
            if not src.is_file():
                return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not self.encrypted:
            shutil.copyfile(src, dest)
            return True
        meta = _archived(row["file"]) if row["file"] else {}
        ek = meta.get("EncryptionKey")
        if not isinstance(ek, (bytes, bytearray)) or len(ek) < 44:
            shutil.copyfile(src, dest)   # ملف بلا تشفير داخل نسخة مشفّرة
            return True
        cls = struct.unpack("<I", ek[:4])[0]
        ck = self.class_keys.get(cls) or self.class_keys.get(meta.get("ProtectionClass"))
        key = aes.unwrap(ck, bytes(ek[4:])) if ck else None
        if key is None:
            return False
        size = meta.get("Size")
        openssl_decrypt(key, src, dest, size if isinstance(size, int) else None)
        return True
