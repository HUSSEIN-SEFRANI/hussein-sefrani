import io, struct, sys, tempfile, shutil
from pathlib import Path
APP = Path(sys.argv[1]); sys.path.insert(0, str(APP))
ok = lambda c, m: print(("✅ " if c else "❌ ") + m) or c
res = []
from PIL import Image
from homenas import core

def make_dng(path, orient=6, big=(1200, 800)):
    """DNG صغير: IFD0 معاينة صغيرة غير مضغوطة + بيانات EXIF، و SubIFD فيه JPEG كبير، و SubIFD خام CFA."""
    jb = io.BytesIO(); Image.new("RGB", big, (200, 30, 30)).save(jb, "JPEG"); jpg = jb.getvalue()
    thumb = bytes([10, 200, 10] * (16 * 12))
    raw = b"\x00\x11" * 5000
    out = bytearray(b"II*\x00" + struct.pack("<I", 0))
    def blob(b):
        off = len(out); out.extend(b); 
        if len(out) % 2: out.append(0)
        return off
    o_thumb, o_jpg, o_raw = blob(thumb), blob(jpg), blob(raw)
    o_make, o_model, o_date = blob(b"Apple\x00"), blob(b"iPhone 15 Pro\x00"), blob(b"2025:07:04 18:30:00\x00")
    def ifd(entries, nxt=0):
        off = len(out)
        out.extend(struct.pack("<H", len(entries)))
        for tag, typ, cnt, val in sorted(entries):
            out.extend(struct.pack("<HHI", tag, typ, cnt)); out.extend(struct.pack("<I", val) if typ == 4 or typ == 2 else struct.pack("<HH", val, 0))
        out.extend(struct.pack("<I", nxt)); return off
    sub_jpg = ifd([(254, 4, 1, 1), (256, 4, 1, big[0]), (257, 4, 1, big[1]), (259, 3, 1, 7), (262, 3, 1, 6), (273, 4, 1, o_jpg), (279, 4, 1, len(jpg))])
    sub_raw = ifd([(254, 4, 1, 0), (256, 4, 1, 4000), (257, 4, 1, 3000), (259, 3, 1, 7), (262, 3, 1, 32803), (273, 4, 1, o_raw), (279, 4, 1, len(raw))])
    o_subs = blob(struct.pack("<II", sub_jpg, sub_raw))
    ifd0 = ifd([(254, 4, 1, 1), (256, 4, 1, 16), (257, 4, 1, 12), (258, 3, 1, 8), (259, 3, 1, 1), (262, 3, 1, 2), (271, 2, 6, o_make), (272, 2, 14, o_model),
                (273, 4, 1, o_thumb), (274, 3, 1, orient), (277, 3, 1, 3), (279, 4, 1, len(thumb)), (306, 2, 20, o_date), (330, 4, 2, o_subs)])
    out[4:8] = struct.pack("<I", ifd0)
    Path(path).write_bytes(bytes(out))

tmp = Path(tempfile.mkdtemp()); f = tmp / "IMG_0001.DNG"; make_dng(f)
jpg, orient = core.dng_preview(f)
w, h = Image.open(io.BytesIO(jpg)).size if jpg else (0, 0)
res.append(ok((w, h) == (1200, 800) and orient == 6, f"أكبر معاينة JPEG داخل DNG: {w}×{h}، الاتجاه {orient} (لا الخام CFA ولا المصغرة)"))
th = tmp / "t.jpg"; okth = core.make_thumb(f, th, 300)
res.append(ok(okth and Image.open(th).size == (200, 300), f"صورة مصغرة مُدارة (عمودية): {Image.open(th).size if okth else None}"))
meta = core.image_meta(f)
res.append(ok(meta["taken"] and meta["taken"].year == 2025 and meta["camera"] == "Apple iPhone 15 Pro" and (meta["width"], meta["height"]) == (800, 1200), f"التاريخ والكاميرا والأبعاد: {meta}"))
res.append(ok(".dng" in core.IMAGE_EXT, "DNG ضمن الصور (المعرض والتلفاز)"))
print(f"\n{sum(res)}/{len(res)} نجح"); shutil.rmtree(tmp, ignore_errors=True); sys.exit(0 if all(res) else 1)
