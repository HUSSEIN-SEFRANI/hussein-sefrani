"""تمييز الوجوه في الصور (ميزة اختيارية).

- كشف الوجوه: YuNet، وتمييزها: SFace (نماذج OpenCV الخفيفة، تعمل على المعالج بدون كرت شاشة).
- عامل في الخلفية بأولوية منخفضة يعالج صورة بعد أخرى، ويجمع الوجوه المتشابهة في «أشخاص».
- كل شيء يتم على الجهاز نفسه: لا تُرسل أي صورة إلى الإنترنت.
"""
from __future__ import annotations

import hashlib
import importlib
import json
import os
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify, request, send_file

from .core import (IMAGE_EXT, admin_required, body, connect, current_user, get_db, log_action, login_required,
                   now_iso, open_image, set_setting)

bp = Blueprint("faces", __name__)

MODELS = {
    "face_detection_yunet_2023mar.onnx": (
        "models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4"),
    "face_recognition_sface_2021dec.onnx": (
        "models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79"),
}
MODEL_HOSTS = ("https://media.githubusercontent.com/media/opencv/opencv_zoo/main/",
               "https://github.com/opencv/opencv_zoo/raw/main/")
MATCH = 0.40          # تشابه جيب التمام اللازم لاعتبار وجهين لنفس الشخص (SFace يوصي بـ 0.363)
MIN_FACE = 36         # أصغر وجه يُعالج (بالبكسل، بعد التصغير)
MAX_SIDE = 1280       # تصغير الصورة قبل الكشف لتسريع المعالجة
MIN_SHOWN = 2         # لا يظهر «شخص» في القائمة إلا إذا ظهر في صورتين على الأقل

SCHEMA = """
CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY,
    library TEXT NOT NULL,
    name TEXT,
    centroid BLOB,
    hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_persons_lib ON persons(library);
CREATE TABLE IF NOT EXISTS faces (
    id INTEGER PRIMARY KEY,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    bbox TEXT NOT NULL,
    score REAL,
    embedding BLOB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_faces_media ON faces(media_id);
CREATE INDEX IF NOT EXISTS idx_faces_person ON faces(person_id);
"""


def migrate(db):
    db.executescript(SCHEMA)
    cols = {r[1] for r in db.execute("PRAGMA table_info(media)")}
    if "faces" not in cols:  # 0 = لم تُعالج، 1 = تمت، 2 = خطأ/ليست صورة
        db.execute("ALTER TABLE media ADD COLUMN faces INTEGER NOT NULL DEFAULT 0")
    db.commit()


def cv2_module():
    try:
        importlib.invalidate_caches()
        import cv2  # noqa
        return cv2 if hasattr(cv2, "FaceDetectorYN") and hasattr(cv2, "FaceRecognizerSF") else None
    except Exception:
        return None


class FaceEngine:
    def __init__(self, data_paths):
        self.paths = data_paths
        self.models = data_paths.system / "models"
        self.cache = data_paths.cache / "faces"
        self.status = {"running": False, "done": 0, "total": 0, "installing": False, "error": None, "last": None}
        self.event = threading.Event()
        self.thread = threading.Thread(target=self.loop, daemon=True, name="faces")
        self._det = self._rec = None

    # ------------------------------------------------------------ الجاهزية والتثبيت
    def models_ready(self) -> bool:
        return all((self.models / n).exists() for n in MODELS)

    def ready(self) -> bool:
        return self.models_ready() and cv2_module() is not None

    def enabled(self, db) -> bool:
        r = db.execute("SELECT value FROM settings WHERE key='faces_enabled'").fetchone()
        return bool(r and r["value"] == "1")

    def install(self, appliance: bool, run_helper):
        """تثبيت OpenCV وتنزيل النماذج (في الخلفية)."""
        if self.status["installing"]:
            return
        self.status.update(installing=True, error=None)

        def work():
            try:
                if cv2_module() is None:
                    if appliance:
                        ok, out = run_helper("faces-deps")
                        if not ok:
                            raise RuntimeError(out or "تعذر تثبيت OpenCV")
                    else:
                        r = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "opencv-python-headless"],
                                           capture_output=True, text=True, timeout=1800)
                        if r.returncode != 0:
                            raise RuntimeError((r.stderr or r.stdout).strip()[-300:])
                    if cv2_module() is None:
                        raise RuntimeError("OpenCV غير متاح بعد التثبيت")
                self.download_models()
                db = connect(self.paths.db)
                db.execute("INSERT INTO settings(key,value) VALUES('faces_enabled','1') "
                           "ON CONFLICT(key) DO UPDATE SET value='1'")
                db.commit()
                db.close()
                self.event.set()
            except Exception as exc:
                self.status["error"] = str(exc)
            finally:
                self.status["installing"] = False
        threading.Thread(target=work, daemon=True, name="faces-install").start()

    def download_models(self):
        self.models.mkdir(parents=True, exist_ok=True)
        for name, (rel, sha) in MODELS.items():
            dest = self.models / name
            if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() == sha:
                continue
            last = None
            for host in MODEL_HOSTS:
                try:
                    tmp = dest.with_suffix(".part")
                    with urllib.request.urlopen(host + rel, timeout=120) as r, open(tmp, "wb") as f:
                        while chunk := r.read(1 << 16):
                            f.write(chunk)
                    if hashlib.sha256(tmp.read_bytes()).hexdigest() != sha:
                        tmp.unlink(missing_ok=True)
                        raise RuntimeError("checksum mismatch")
                    os.replace(tmp, dest)
                    last = None
                    break
                except Exception as exc:
                    last = exc
            if last:
                raise RuntimeError(f"تعذر تنزيل نموذج {name}: {last}")

    # ------------------------------------------------------------ المعالجة
    def start(self):
        self.thread.start()

    def loop(self):
        try:  # أولوية منخفضة جداً حتى لا تبطئ الواجهة على الأجهزة القديمة
            os.setpriority(os.PRIO_PROCESS, threading.get_native_id(), 19)
        except (AttributeError, OSError):
            pass
        while True:
            self.event.wait(timeout=300)
            self.event.clear()
            try:
                self.process_pending()
            except Exception as exc:  # pragma: no cover
                self.status["error"] = str(exc)
                print(f"[faces] {exc}")
            self.status["running"] = False

    def load(self):
        if self._det is None:
            cv2 = cv2_module()
            cv2.setNumThreads(1)
            self._det = cv2.FaceDetectorYN.create(str(self.models / "face_detection_yunet_2023mar.onnx"), "",
                                                  (320, 320), 0.85, 0.3, 50)
            self._rec = cv2.FaceRecognizerSF.create(str(self.models / "face_recognition_sface_2021dec.onnx"), "")
        return self._det, self._rec

    def process_pending(self):
        db = connect(self.paths.db)
        try:
            if not self.enabled(db) or not self.ready():
                return
            total = db.execute("SELECT COUNT(*) FROM media WHERE is_video=0").fetchone()[0]
            todo = db.execute("SELECT COUNT(*) FROM media WHERE is_video=0 AND faces=0").fetchone()[0]
            if not todo:
                return
            self.status.update(running=True, total=total, done=total - todo)
            from .photos import all_libraries
            bases = dict(all_libraries(db, self.paths))
            while True:
                if not self.enabled(db):
                    break
                rows = db.execute("SELECT id, library, rel_path FROM media WHERE is_video=0 AND faces=0 "
                                  "ORDER BY taken_at DESC LIMIT 20").fetchall()
                if not rows:
                    break
                for r in rows:
                    base = bases.get(r["library"])
                    state = 2
                    if base is not None:
                        try:
                            self.process_image(db, r["id"], r["library"], base / r["rel_path"])
                            state = 1
                        except Exception as exc:
                            print(f"[faces] {r['rel_path']}: {exc}")
                    db.execute("UPDATE media SET faces=? WHERE id=?", (state, r["id"]))
                    db.commit()
                    self.status["done"] += 1
                    time.sleep(0.05)
            self.status["last"] = now_iso()
        finally:
            db.close()

    def process_image(self, db, media_id: int, library: str, path: Path):
        import numpy as np
        cv2 = cv2_module()
        from PIL import ImageOps
        if path.suffix.lower() not in IMAGE_EXT:
            return
        with open_image(path) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((MAX_SIDE, MAX_SIDE))
            img = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
        h, w = img.shape[:2]
        det, rec = self.load()
        det.setInputSize((w, h))
        _, found = det.detect(img)
        db.execute("DELETE FROM faces WHERE media_id=?", (media_id,))
        if found is None:
            return
        for f in found:
            x, y, fw, fh = (float(v) for v in f[:4])
            if min(fw, fh) < MIN_FACE:
                continue
            feat = rec.feature(rec.alignCrop(img, f)).flatten().astype("float32")
            feat /= (np.linalg.norm(feat) or 1.0)
            bbox = [round(x / w, 4), round(y / h, 4), round(fw / w, 4), round(fh / h, 4)]
            pid = self.assign(db, library, feat)
            cur = db.execute("INSERT INTO faces(media_id, person_id, bbox, score, embedding) VALUES (?,?,?,?,?)",
                             (media_id, pid, json.dumps(bbox), float(f[-1]), feat.tobytes()))
            self.save_crop(img, cur.lastrowid, x, y, fw, fh)

    def assign(self, db, library: str, feat) -> int:
        """يضم الوجه لأقرب شخص معروف، أو ينشئ شخصاً جديداً."""
        import numpy as np
        best, best_sim = None, -1.0
        for p in db.execute("SELECT id, centroid FROM persons WHERE library=?", (library,)):
            c = np.frombuffer(p["centroid"], dtype="float32")
            sim = float(np.dot(c, feat))
            if sim > best_sim:
                best, best_sim = p["id"], sim
        if best is not None and best_sim >= MATCH:
            self.update_centroid(db, best, extra=feat)
            return best
        cur = db.execute("INSERT INTO persons(library, centroid, created_at) VALUES (?,?,?)",
                         (library, feat.tobytes(), now_iso()))
        return cur.lastrowid

    @staticmethod
    def update_centroid(db, pid: int, extra=None):
        import numpy as np
        vecs = [np.frombuffer(r["embedding"], dtype="float32")
                for r in db.execute("SELECT embedding FROM faces WHERE person_id=?", (pid,))]
        if extra is not None:
            vecs.append(extra)
        if not vecs:
            return
        c = np.mean(vecs, axis=0).astype("float32")
        c /= (np.linalg.norm(c) or 1.0)
        db.execute("UPDATE persons SET centroid=? WHERE id=?", (c.tobytes(), pid))

    def save_crop(self, img, face_id: int, x, y, fw, fh):
        import cv2  # noqa
        m = 0.35  # هامش حول الوجه
        x0, y0 = max(0, int(x - fw * m)), max(0, int(y - fh * m))
        x1, y1 = min(img.shape[1], int(x + fw * (1 + m))), min(img.shape[0], int(y + fh * (1 + m)))
        crop = img[y0:y1, x0:x1]
        if crop.size == 0:
            return
        side = 192
        scale = side / max(crop.shape[:2])
        crop = cv2.resize(crop, (max(1, int(crop.shape[1] * scale)), max(1, int(crop.shape[0] * scale))))
        self.cache.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(self.cache / f"{face_id}.jpg"), crop, [cv2.IMWRITE_JPEG_QUALITY, 85])


def engine() -> FaceEngine:
    return current_app.extensions["nas_faces"]


# ----------------------------------------------------------------------------- API

def _libs(user) -> list[str]:
    from .photos import libraries_for
    return [x["id"] for x in libraries_for(user)]


def own_person(user, pid: int):
    row = get_db().execute("SELECT * FROM persons WHERE id=?", (pid,)).fetchone()
    if not row or row["library"] not in _libs(user):
        abort(404)
    return row


@bp.get("/api/faces/status")
@login_required
def api_status():
    db = get_db()
    e = engine()
    total = db.execute("SELECT COUNT(*) FROM media WHERE is_video=0").fetchone()[0]
    done = db.execute("SELECT COUNT(*) FROM media WHERE is_video=0 AND faces<>0").fetchone()[0]
    return jsonify(ready=e.ready(), cv2=cv2_module() is not None, models=e.models_ready(), enabled=e.enabled(db),
                   installing=e.status["installing"], error=e.status["error"], running=e.status["running"],
                   done=done, total=total, faces=db.execute("SELECT COUNT(*) FROM faces").fetchone()[0])


@bp.post("/api/faces/setup")
@admin_required
def api_setup():
    from .network import APPLIANCE

    def helper(*args):
        if not APPLIANCE:
            return False, ""
        try:
            r = subprocess.run(["sudo", "-n", "/usr/local/sbin/hsef-extras", *args], capture_output=True, text=True,
                               timeout=3600)
            return r.returncode == 0, (r.stderr or r.stdout).strip()
        except Exception as exc:
            return False, str(exc)
    engine().install(APPLIANCE, helper)
    log_action("تفعيل تمييز الوجوه")
    return jsonify(ok=True)


@bp.post("/api/faces/enable")
@admin_required
def api_enable():
    on = bool(body().get("enabled"))
    set_setting("faces_enabled", "1" if on else "0")
    if on:
        engine().event.set()
    return jsonify(ok=True)


@bp.post("/api/faces/rescan")
@admin_required
def api_rescan():
    db = get_db()
    db.execute("UPDATE media SET faces=0 WHERE is_video=0")
    db.commit()
    engine().event.set()
    return jsonify(ok=True)


@bp.get("/api/people")
@login_required
def api_people():
    user = current_user()
    from .photos import get_library
    lib = get_library(user, request.args.get("lib"))
    rows = get_db().execute(
        """SELECT p.id, p.name, p.hidden, COUNT(DISTINCT f.media_id) AS photos,
                  (SELECT f2.id FROM faces f2 WHERE f2.person_id=p.id ORDER BY f2.score DESC LIMIT 1) AS cover
           FROM persons p JOIN faces f ON f.person_id=p.id
           WHERE p.library=? GROUP BY p.id
           HAVING photos >= ? OR p.name IS NOT NULL
           ORDER BY (p.name IS NULL), photos DESC""", (lib["id"], MIN_SHOWN)).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.patch("/api/people/<int:pid>")
@login_required
def api_person_update(pid):
    own_person(current_user(), pid)
    data = body()
    db = get_db()
    if "name" in data:
        name = (data.get("name") or "").strip()[:80] or None
        db.execute("UPDATE persons SET name=? WHERE id=?", (name, pid))
    if "hidden" in data:
        db.execute("UPDATE persons SET hidden=? WHERE id=?", (int(bool(data["hidden"])), pid))
    db.commit()
    return jsonify(ok=True)


@bp.post("/api/people/<int:pid>/merge")
@login_required
def api_person_merge(pid):
    """دمج شخص في آخر (عندما يظهر نفس الشخص مرتين)."""
    user = current_user()
    src = own_person(user, pid)
    target = own_person(user, int(body().get("into") or 0))
    if src["id"] == target["id"] or src["library"] != target["library"]:
        abort(400)
    db = get_db()
    db.execute("UPDATE faces SET person_id=? WHERE person_id=?", (target["id"], src["id"]))
    if not target["name"] and src["name"]:
        db.execute("UPDATE persons SET name=? WHERE id=?", (src["name"], target["id"]))
    db.execute("DELETE FROM persons WHERE id=?", (src["id"],))
    FaceEngine.update_centroid(db, target["id"])
    db.commit()
    return jsonify(ok=True, id=target["id"])


@bp.post("/api/faces/<int:fid>/detach")
@login_required
def api_face_detach(fid):
    """«ليس هذا الشخص»: يفصل الوجه عن الشخص."""
    user = current_user()
    db = get_db()
    f = db.execute("SELECT f.*, m.library FROM faces f JOIN media m ON m.id=f.media_id WHERE f.id=?", (fid,)).fetchone()
    if not f or f["library"] not in _libs(user):
        abort(404)
    old = f["person_id"]
    cur = db.execute("INSERT INTO persons(library, centroid, created_at) VALUES (?,?,?)",
                     (f["library"], f["embedding"], now_iso()))
    db.execute("UPDATE faces SET person_id=? WHERE id=?", (cur.lastrowid, fid))
    if old:
        FaceEngine.update_centroid(db, old)
    db.commit()
    return jsonify(ok=True)


@bp.get("/api/faces/<int:fid>/thumb")
@login_required
def api_face_thumb(fid):
    user = current_user()
    f = get_db().execute("SELECT m.library FROM faces f JOIN media m ON m.id=f.media_id WHERE f.id=?", (fid,)).fetchone()
    if not f or f["library"] not in _libs(user):
        abort(404)
    p = engine().cache / f"{fid}.jpg"
    if not p.exists():
        abort(404)
    return send_file(p, mimetype="image/jpeg", max_age=86400 * 30)


@bp.get("/api/photos/<int:mid>/faces")
@login_required
def api_media_faces(mid):
    user = current_user()
    db = get_db()
    m = db.execute("SELECT library FROM media WHERE id=?", (mid,)).fetchone()
    if not m or m["library"] not in _libs(user):
        abort(404)
    rows = db.execute("SELECT f.id, f.bbox, f.person_id, p.name FROM faces f LEFT JOIN persons p ON p.id=f.person_id "
                      "WHERE f.media_id=?", (mid,)).fetchall()
    return jsonify([{"id": r["id"], "bbox": json.loads(r["bbox"]), "person": r["person_id"], "name": r["name"]}
                    for r in rows])
