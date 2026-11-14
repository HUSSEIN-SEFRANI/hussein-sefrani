"""HOME ANAB - نظام تخزين منزلي شخصي يعمل على جهاز الكمبيوتر."""
from __future__ import annotations

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

__version__ = "1.6.2"


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
    init_db(data_paths.db)
    from .core import connect as _connect
    _db = _connect(data_paths.db)
    faces_migrate(_db)
    from . import tv as _tv
    _tv.migrate(_db)
    _tv.games_migrate(_db, data_paths)
    from . import stars as _stars
    _stars.migrate(_db)
    from . import cameras as _cams
    _cams.migrate(_db)
    _db.close()
    app.extensions["nas_paths"] = data_paths
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

    from . import (appstore, backup, cameras, faces, files, health, iphone, links, media_cards, network, photos, profile, remote, stars,
                   sysadmin, system, tv, welcome)
    for mod in (system, files, photos, links, backup, health, network, appstore, faces, remote, tv, profile, sysadmin, iphone, stars, welcome,
                cameras, media_cards):
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
