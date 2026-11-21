"""يصنع نسخة آيفون تجريبية (مثل ما يكتبه idevicebackup2) فيها واتساب ببيانات عامة، للاختبار فقط.

  python3 dev/fake_backup.py <المجلد> [--encrypted كلمة_السر]
لا يدخل في ملف الإضافة (ZIP).
"""
from __future__ import annotations

import hashlib
import os
import plistlib
import sqlite3
import struct
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from wa import aes  # noqa: E402

DOMAIN = "AppDomainGroup-group.net.whatsapp.WhatsApp.shared"
T0 = 785000000   # ثوانٍ منذ 2001-01-01 (نوفمبر 2025)


def _jpeg(path: Path, color, size=(800, 600)):
    from PIL import Image, ImageDraw
    im = Image.new("RGB", size, color)
    d = ImageDraw.Draw(im)
    d.ellipse((size[0] // 4, size[1] // 4, size[0] * 3 // 4, size[1] * 3 // 4), fill=(255, 255, 255))
    im.save(path, "JPEG")


def _mp4(path: Path):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=10", "-t", "2",
                    "-pix_fmt", "yuv420p", str(path)], check=True)


def chat_db(path: Path):
    db = sqlite3.connect(path)
    db.executescript("""
    CREATE TABLE ZWACHATSESSION (Z_PK INTEGER PRIMARY KEY, ZPARTNERNAME VARCHAR, ZCONTACTJID VARCHAR, ZSESSIONTYPE INTEGER,
        ZLASTMESSAGEDATE TIMESTAMP, ZREMOVED INTEGER);
    CREATE TABLE ZWAMESSAGE (Z_PK INTEGER PRIMARY KEY, ZCHATSESSION INTEGER, ZISFROMME INTEGER, ZMESSAGEDATE TIMESTAMP,
        ZTEXT VARCHAR, ZMESSAGETYPE INTEGER, ZFROMJID VARCHAR, ZPUSHNAME VARCHAR, ZMEDIAITEM INTEGER, ZGROUPMEMBER INTEGER);
    CREATE TABLE ZWAMEDIAITEM (Z_PK INTEGER PRIMARY KEY, ZMESSAGE INTEGER, ZMEDIALOCALPATH VARCHAR, ZTHUMBNAILLOCALPATH VARCHAR,
        ZTITLE VARCHAR, ZMOVIEDURATION INTEGER, ZLATITUDE FLOAT, ZLONGITUDE FLOAT, ZVCARDNAME VARCHAR, ZFILESIZE INTEGER);
    CREATE TABLE ZWAGROUPMEMBER (Z_PK INTEGER PRIMARY KEY, ZCONTACTNAME VARCHAR, ZFIRSTNAME VARCHAR, ZMEMBERJID VARCHAR);
    CREATE TABLE ZWAPROFILEPUSHNAME (Z_PK INTEGER PRIMARY KEY, ZJID VARCHAR, ZPUSHNAME VARCHAR);
    """)
    A, G = "10000000001@s.whatsapp.net", "10000000002-1600000000@g.us"
    db.execute("INSERT INTO ZWACHATSESSION VALUES (1,'صديق تجربة',?,0,?,0)", (A, T0 + 600))
    db.execute("INSERT INTO ZWACHATSESSION VALUES (2,'مجموعة العائلة',?,1,?,0)", (G, T0 + 90000))
    db.execute("INSERT INTO ZWACHATSESSION VALUES (3,'','status@broadcast',0,?,0)", (T0,))
    db.execute("INSERT INTO ZWAGROUPMEMBER VALUES (1,'العضو الأول',NULL,'10000000003@s.whatsapp.net')")
    db.execute("INSERT INTO ZWAGROUPMEMBER VALUES (2,NULL,NULL,'10000000004@s.whatsapp.net')")
    db.execute("INSERT INTO ZWAPROFILEPUSHNAME VALUES (1,'10000000004@s.whatsapp.net','العضو الثاني')")
    media = [  # (رقم، المسار، النوع)
        (1, f"Media/{A}/a/1/img-1.jpg", None), (2, f"Media/{A}/b/2/vid-1.mp4", f"Media/{A}/b/2/vid-1.thumb"),
        (3, f"Media/{A}/c/3/voice-1.opus", None), (4, f"Media/{A}/d/4/missing.jpg", None),
        (5, f"Media/{G}/e/5/img-2.jpg", None), (6, f"Media/{G}/f/6/vid-2.mp4", None), (7, f"Media/{G}/g/7/doc-1.pdf", None),
    ]
    for pk, p, th in media:
        db.execute("INSERT INTO ZWAMEDIAITEM (Z_PK, ZMEDIALOCALPATH, ZTHUMBNAILLOCALPATH, ZTITLE) VALUES (?,?,?,?)",
                   (pk, p, th, "تقرير.pdf" if pk == 7 else ("صورة من الرحلة 🌴" if pk == 1 else None)))
    db.execute("UPDATE ZWAMEDIAITEM SET ZLATITUDE=50.85, ZLONGITUDE=4.35 WHERE Z_PK=1")
    rows = [  # (جلسة، مني، الوقت، النص، النوع، وسائط، عضو)
        (1, 0, 0, "السلام عليكم، كيف الحال؟ 😊", 0, None, None),
        (1, 1, 60, "وعليكم السلام، الحمد لله\nبخير", 0, None, None),
        (1, 0, 120, None, 1, 1, None),
        (1, 1, 180, None, 2, 2, None),
        (1, 0, 240, None, 3, 3, None),
        (1, 1, 300, None, 1, 4, None),
        (1, 0, 360, None, 14, None, None),
        (1, 1, 600, "Hello in English 👍 https://example.com", 0, None, None),
        (2, 0, 86400, "صباح الخير للجميع", 0, None, 1),
        (2, 0, 86460, None, 1, 5, 2),
        (2, 1, 86520, "جميلة!", 0, None, None),
        (2, 0, 86580, None, 2, 6, 1),
        (2, 0, 86640, None, 8, 7, 2),
        (2, 1, 90000, "تصبحون على خير", 0, None, None),
    ]
    for i, (s, me, t, txt, typ, mi, gm) in enumerate(rows, 1):
        db.execute("INSERT INTO ZWAMESSAGE VALUES (?,?,?,?,?,?,?,?,?,?)",
                   (i, s, me, T0 + t, txt, typ, None if me else "x@s.whatsapp.net", None, mi, gm))
    db.execute("INSERT INTO ZWAMESSAGE VALUES (99,3,0,?,'حالة',0,NULL,NULL,NULL,NULL)", (T0,))
    db.commit()
    db.close()
    return media


def _keybag(password: str) -> tuple[bytes, dict]:
    def tlv(tag, v):
        if isinstance(v, int):
            v = struct.pack(">I", v)
        return tag.encode() + struct.pack(">I", len(v)) + v
    salt, dpsl = os.urandom(20), os.urandom(20)
    it, dpic = 10, 10
    pw = hashlib.pbkdf2_hmac("sha256", password.encode(), dpsl, dpic, 32)
    kek = hashlib.pbkdf2_hmac("sha1", pw, salt, it, 32)
    blob = b"".join([tlv("VERS", 4), tlv("TYPE", 1), tlv("UUID", os.urandom(16)), tlv("HMCK", os.urandom(40)), tlv("WRAP", 0),
                     tlv("SALT", salt), tlv("ITER", it), tlv("DPWT", 1), tlv("DPIC", dpic), tlv("DPSL", dpsl)])
    keys = {}
    for cls in (1, 2, 3, 4):
        k = os.urandom(32)
        keys[cls] = k
        blob += b"".join([tlv("UUID", os.urandom(16)), tlv("CLAS", cls), tlv("WRAP", 3), tlv("KTYP", 0), tlv("WPKY", aes.wrap(kek, k))])
    return blob, keys


def _enc(key: bytes, src: Path, dst: Path):
    subprocess.run(["openssl", "enc", "-e", "-aes-256-cbc", "-K", key.hex(), "-iv", "0" * 32, "-in", str(src), "-out", str(dst)], check=True)


def _archive(size: int, ek: bytes | None) -> bytes:
    root = {"$class": plistlib.UID(3), "Size": size, "ProtectionClass": 3, "Mode": 33188}
    objs = ["$null", root, {"$classname": "NSData", "$classes": ["NSData", "NSObject"]},
            {"$classname": "MBFile", "$classes": ["MBFile", "NSObject"]}]
    if ek:
        objs.append({"NS.data": ek, "$class": plistlib.UID(2)})
        root["EncryptionKey"] = plistlib.UID(4)
    return plistlib.dumps({"$version": 100000, "$archiver": "NSKeyedArchiver", "$top": {"root": plistlib.UID(1)}, "$objects": objs},
                          fmt=plistlib.FMT_BINARY)


def make(dest: Path, encrypted: str | None = None) -> Path:
    root = dest / "00008030-TEST"
    stage = dest / ".stage"
    stage.mkdir(parents=True, exist_ok=True)
    root.mkdir(parents=True, exist_ok=True)
    media = chat_db(stage / "ChatStorage.sqlite")
    files = {"ChatStorage.sqlite": stage / "ChatStorage.sqlite"}
    colors = [(200, 40, 40), (40, 160, 70)]
    for pk, p, th in media:
        if "missing" in p:
            continue   # صورة لم تُحمَّل على الهاتف
        f = stage / Path(p).name
        if p.endswith(".jpg"):
            _jpeg(f, colors[pk % 2])
        elif p.endswith(".mp4"):
            _mp4(f)
        else:
            f.write_bytes(b"%PDF-1.4 test" if p.endswith(".pdf") else b"OggS" + os.urandom(500))
        files["Message/" + p] = f
        if th:
            tf = stage / (Path(th).name + ".jpg")
            _jpeg(tf, (0, 0, 200), (160, 120))
            files["Message/" + th] = tf
    keys = None
    info = {"IsEncrypted": bool(encrypted), "Version": "10.0"}
    if encrypted:
        bag, keys = _keybag(encrypted)
        info["BackupKeyBag"] = bag
    mdb = stage / "Manifest.db"
    db = sqlite3.connect(mdb)
    db.execute("CREATE TABLE Files (fileID TEXT PRIMARY KEY, domain TEXT, relativePath TEXT, flags INTEGER, file BLOB)")
    db.execute("INSERT INTO Files VALUES (?,?,?,?,?)", (hashlib.sha1(b"x").hexdigest(), "CameraRollDomain", "Media/DCIM/x.jpg", 1, None))
    for rel, f in files.items():
        fid = hashlib.sha1(f"{DOMAIN}-{rel}".encode()).hexdigest()
        out = root / fid[:2] / fid
        out.parent.mkdir(parents=True, exist_ok=True)
        ek = None
        if keys:
            fk = os.urandom(32)
            ek = struct.pack("<I", 3) + aes.wrap(keys[3], fk)
            _enc(fk, f, out)
        else:
            out.write_bytes(f.read_bytes())
        db.execute("INSERT INTO Files VALUES (?,?,?,?,?)", (fid, DOMAIN, rel, 1, _archive(f.stat().st_size, ek)))
    db.execute("INSERT INTO Files VALUES (?,?,?,?,?)", ("d" * 40, DOMAIN, "Message/Media", 2, None))
    db.commit()
    db.close()
    if keys:
        mk = os.urandom(32)
        info["ManifestKey"] = struct.pack("<I", 4) + aes.wrap(keys[4], mk)
        _enc(mk, mdb, root / "Manifest.db")
    else:
        (root / "Manifest.db").write_bytes(mdb.read_bytes())
    (root / "Manifest.plist").write_bytes(plistlib.dumps(info, fmt=plistlib.FMT_BINARY))
    (root / "Info.plist").write_bytes(plistlib.dumps({"Device Name": "iPhone (تجربة)", "Product Type": "iPhone14,2"}))
    (root / "Status.plist").write_bytes(plistlib.dumps({"SnapshotState": "finished"}))
    for f in stage.iterdir():
        f.unlink()
    stage.rmdir()
    return root


if __name__ == "__main__":
    pw = sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == "--encrypted" else None
    print(make(Path(sys.argv[1]), pw))
