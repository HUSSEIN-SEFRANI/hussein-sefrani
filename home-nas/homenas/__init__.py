"""H.SEF - نظام تخزين منزلي شخصي يعمل على جهاز الكمبيوتر."""
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

__version__ = "1.2"


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
    _db.close()
    app.extensions["nas_paths"] = data_paths
    app.extensions["nas_indexer"] = idx = Indexer(data_paths)
    app.extensions["nas_backup"] = bk = Backup(data_paths)
    app.extensions["nas_net"] = nw = Network(data_paths)
    app.extensions["nas_apps"] = AppStore(data_paths)
    app.extensions["nas_faces"] = fc = FaceEngine(data_paths)
    def _on_indexed(lib):
        fc.event.set()
        nw.request(tv=True)
    idx.on_indexed = _on_indexed
    if start_indexer:
        idx.start()
        bk.start()
        nw.start()
        fc.start()

    from . import appstore, backup, faces, files, health, links, network, photos, remote, system, tv
    for mod in (system, files, photos, links, backup, health, network, appstore, faces, remote, tv):
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
