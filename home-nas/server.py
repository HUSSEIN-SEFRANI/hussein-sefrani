#!/usr/bin/env python3
"""تشغيل H.SEF.

    python server.py                   تشغيل السيرفر
    python server.py --port 9000       تغيير المنفذ
    python server.py --data "D:\\NAS"  تغيير مجلد البيانات
    python server.py --reset-password admin   إعادة تعيين كلمة مرور مستخدم
"""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

from homenas import __version__, create_app
from homenas.core import FFMPEG, Paths, connect, heic_supported, init_db, load_config, save_config


def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description="H.SEF")
    ap.add_argument("--port", type=int)
    ap.add_argument("--data", help="مجلد البيانات")
    ap.add_argument("--reset-password", metavar="USERNAME", help="إعادة تعيين كلمة مرور مستخدم")
    ap.add_argument("--dev", action="store_true", help="خادم التطوير")
    args = ap.parse_args()

    cfg = load_config()
    if args.port:
        cfg["port"] = args.port
    if args.data:
        cfg["data_dir"] = str(Path(args.data).expanduser().resolve())
    if args.port or args.data:
        save_config(cfg)

    if args.reset_password:
        from werkzeug.security import generate_password_hash
        p = Paths(cfg["data_dir"])
        init_db(p.db)
        db = connect(p.db)
        if not db.execute("SELECT 1 FROM users WHERE username=?", (args.reset_password,)).fetchone():
            sys.exit("المستخدم غير موجود")
        pw = getpass.getpass("كلمة المرور الجديدة: ")
        if len(pw) < 6 or pw != getpass.getpass("أعد كتابتها: "):
            sys.exit("كلمة مرور قصيرة أو غير متطابقة")
        db.execute("UPDATE users SET password_hash=?, disabled=0 WHERE username=?",
                   (generate_password_hash(pw), args.reset_password))
        db.commit()
        print("تم تغيير كلمة المرور.")
        return

    app = create_app(cfg)
    from homenas.core import ensure_setup_code
    from homenas.system import server_urls
    port = int(cfg["port"])
    with app.app_context():
        from homenas.core import get_db
        first_run = get_db().execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
    code = ensure_setup_code(app.extensions["nas_paths"]) if first_run else None

    line = "=" * 62
    print(f"\n{line}\n  H.SEF {__version__} يعمل الآن\n{line}")
    if first_run:
        print("\n  ★ الإعداد الأول: افتح الرابط وأنشئ حساب المدير.\n"
              "    من جهاز آخر سيُطلب رمز الإعداد: اطلبه من المطوّر عبر واتساب +32 494 49 94 30\n")
    print("  من الهاتف أو أي جهاز على نفس شبكة Wi-Fi افتح:")
    for url in server_urls(port):
        print(f"       {url}")
    print(f"\n  مجلد البيانات: {app.extensions['nas_paths'].data}")
    if not heic_supported():
        print("  [!] pillow-heif غير مثبتة: لن تظهر معاينة صور HEIC")
    if not FFMPEG:
        print("  [i] ffmpeg غير مثبت: لن تظهر مصغرات الفيديو (اختياري)")
    print(f"  للإيقاف اضغط Ctrl+C\n{line}\n")

    if args.dev:
        app.run(host=cfg["host"], port=port, threaded=True)
        return
    try:
        from waitress import serve
        serve(app, host=cfg["host"], port=port, threads=16, channel_timeout=900,
              max_request_body_size=app.config["MAX_CONTENT_LENGTH"], ident="H.SEF")
    except ImportError:
        app.run(host=cfg["host"], port=port, threaded=True)


if __name__ == "__main__":
    main()
