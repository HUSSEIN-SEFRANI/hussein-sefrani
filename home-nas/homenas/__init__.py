"""HOME ANAB - نظام تخزين منزلي شخصي يعمل على جهاز الكمبيوتر."""
from __future__ import annotations

import os

from datetime import timedelta

from flask import Flask, g, jsonify, request
from werkzeug.exceptions import HTTPException

from .core import Paths, init_db
from .appstore import AppStore
from .backup import Backup
from .faces import FaceEngine
from .faces import migrate as faces_migrate
from .network import Network
from .photos import Indexer

__version__ = "1.9.13"


def create_app(cfg: dict, start_indexer: bool = True) -> Flask:
    app = Flask(__name__, static_folder="../static", template_folder="../templates")
    app.secret_key = cfg["secret_key"]
    app.config.update(
        NAS_CFG=cfg,
        MAX_CONTENT_LENGTH=int(float(cfg.get("max_upload_gb", 20)) * 1024 ** 3),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),
        MAX_FORM_MEMORY_SIZE=8 * 1024 * 1024,
    )
    data_paths = Paths(cfg["data_dir"])
    from .transfer import apply_pending   # استيراد نظام أو إعادة ضبط مصنع طُلبت قبل إعادة التشغيل
    applied = apply_pending(data_paths)
    init_db(data_paths.db)
    from .core import connect as _connect
    _db = _connect(data_paths.db)
    faces_migrate(_db)
    from . import tv as _tv
    _tv.migrate(_db)
    _tv.games_migrate(_db, data_paths)
    _tv.learn_migrate(_db, data_paths)   # v1.9.6: مجلد «التعليم» المشترك
    if cfg.get("seed_apps", os.environ.get("HOMENAS_APPLIANCE") == "1"):   # البند 47: الألعاب والتعليم مع النظام
        from .bundled import start as _seed_apps
        _seed_apps(cfg["data_dir"])
    from . import stars as _stars
    _stars.migrate(_db)
    from . import cameras as _cams
    _cams.migrate(_db)
    from . import kids as _kids
    _kids.migrate(_db)
    from . import activation as _act
    _act.ensure_trial(_db)   # التجربة المجانية تبدأ عند أول تشغيل
    try:
        from .system import register_extra_disks
        register_extra_disks(_db)   # الأقراص الإضافية من التنصيب ← مجلدات مشتركة
    except Exception as exc:  # pragma: no cover
        print(f"[disks] {exc}")
    _db.close()
    app.extensions["nas_paths"] = data_paths
    if applied:   # يُسجَّل في سجل النشاط ما طُبّق عند هذا التشغيل
        _db = _connect(data_paths.db)
        from .core import now_iso
        _db.execute("INSERT INTO logs(ts, username, action, detail) VALUES (?, ?, ?, ?)",
                    (now_iso(), "system", "إعادة ضبط المصنع: تمت" if applied == "reset" else "استيراد النظام: تم", ""))
        _db.commit()
        _db.close()
    app.extensions["nas_indexer"] = idx = Indexer(data_paths)
    app.extensions["nas_backup"] = bk = Backup(data_paths)
    app.extensions["nas_net"] = nw = Network(data_paths)
    app.extensions["nas_apps"] = AppStore(data_paths)
    app.extensions["nas_faces"] = fc = FaceEngine(data_paths)
    app.extensions["nas_cams"] = cams = _cams.CameraManager(data_paths)
    from .iphone import IphoneSync
    app.extensions["nas_iphone"] = iph = IphoneSync(data_paths, idx)
    def _on_indexed(lib):
        fc.event.set()
        nw.request(tv=True)
    idx.on_indexed = _on_indexed
    if start_indexer:
        idx.start()
        bk.start()
        nw.start()
        fc.start()
        iph.start()
        cams.start()
        from .tv import start_tv_prep
        start_tv_prep(data_paths)   # تجهيز الفيديو للتلفاز في الخلفية
        from .cpuinfo import start_sampler
        start_sampler()             # حرارة المعالج واستعماله لرسم آخر ساعة
        from .recycle import start_auto
        start_auto(data_paths)      # تفريغ سلة المحذوفات تلقائياً مرة كل يوم

    from . import (activation, appstore, backup, cameras, cpuinfo, faces, files, health, iphone, letters, links, saves, media_cards, network, photos, profile, remote,
                   kids, recycle, stars, storage, sysadmin, system, transfer, tv, welcome)
    for mod in (system, files, photos, links, backup, health, network, appstore, faces, remote, tv, profile, sysadmin, iphone, stars, welcome,
                cameras, media_cards, activation, kids, transfer, storage, cpuinfo, recycle, letters, saves):
        app.register_blueprint(mod.bp)

    @app.teardown_appcontext
    def close_db(_exc):
        db = g.pop("db", None)
        if db is not None:
            db.close()

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        resp.headers.setdefault("Referrer-Policy", "same-origin")
        return resp

    @app.errorhandler(HTTPException)
    def http_error(e: HTTPException):
        if "/api/" not in request.path:
            return e
        msg = e.description if isinstance(e.description, str) else ""
        if e.code == 404 and (not msg or msg.startswith("The requested URL")):
            msg = "غير موجود"
        elif e.code == 413:
            msg = "الملف أكبر من الحد المسموح"
        return jsonify(error=msg or e.name), e.code

    app.wsgi_app = remote.LocalProxyFix(app.wsgi_app)
    return app
