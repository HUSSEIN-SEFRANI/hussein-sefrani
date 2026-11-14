"""خادم تجريبي صغير يحاكي التلفاز لتجربة الألعاب على الكمبيوتر.

    python3 games/_kit/tools/mock.py 8766
ثم افتح: http://127.0.0.1:8766/tv/game/1/<اسم اللعبة>/index.html

- يخدم مجلدات الألعاب كما يخدمها التلفاز (/tv/game/1/...)، والخطوط من /static.
- /api/tv/tile/1/list?sub=<مجلد>: قائمة ملفات مجلد داخل games (مثل صور اللعبة).
- /api/tv/wallpaper و /api/tv/photo/<n>/view: «صور الطفل» من مجلد tools/photos إن وُجد.
- POST /api/tv/stars/earn: يحاكي إضافة النجوم (رصيد يبدأ بـ 10، وحد يومي 20)، انظر _kit/API.txt.
- /api/tv/family/people و /api/tv/face/<n> و /api/tv/face/<n>/photo: «صور العائلة» من tools/faces/<الاسم>/*.jpg
  إن وُجد، وإلا وجوه مرسومة لأربعة أشخاص (بابا، ماما، جدّو، تيتا).
- POST /api/tv/learn/result: يطبع النتيجة فقط (لتقرير الأهل)، انظر _kit/API.txt.
"""
import http.server
import json
import mimetypes
import os
import sys
import urllib.parse

TOOLS = os.path.dirname(os.path.abspath(__file__))
GAMES = os.path.dirname(os.path.dirname(TOOLS))          # home-nas/games
ROOT = os.path.dirname(GAMES)                             # home-nas
PHOTOS = os.path.join(TOOLS, "photos")


STARS = {"balance": 10, "today": 0, "limit": 20}
FACES_DIR = os.path.join(TOOLS, "faces")
COLORS = ["#f59e0b", "#ec4899", "#22c55e", "#3b82f6", "#a855f7", "#ef4444"]


def family():
    """[(id, name, path_or_None)] — من tools/faces إن وُجد، وإلا وجوه مرسومة."""
    out, n = [], 0
    if os.path.isdir(FACES_DIR):
        for name in sorted(os.listdir(FACES_DIR)):
            d = os.path.join(FACES_DIR, name)
            if os.path.isdir(d):
                for f in sorted(os.listdir(d)):
                    if f.lower().endswith((".jpg", ".jpeg", ".png")):
                        n += 1
                        out.append((n, name, os.path.join(d, f)))
    if not out:
        for name in ("بابا", "ماما", "جدّو", "تيتا"):
            for _ in range(3):
                n += 1
                out.append((n, name, None))
    return out


def face_svg(fid, name):
    c = COLORS[(fid - 1) % len(COLORS)]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="{c}"/>'
            f'<circle cx="100" cy="92" r="58" fill="#fde2c8"/><circle cx="80" cy="85" r="7" fill="#333"/><circle cx="120" cy="85" r="7" fill="#333"/>'
            f'<path d="M78 112 Q100 {128 + fid % 3 * 4} 122 112" stroke="#333" stroke-width="6" fill="none" stroke-linecap="round"/>'
            f'<text x="100" y="190" font-size="26" text-anchor="middle" fill="#fff" font-family="sans-serif">{name}</text></svg>').encode()


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def file(self, p):
        if os.path.isdir(p):
            p = os.path.join(p, "index.html")
        if not os.path.isfile(p):
            return self.send(404, b"not found", "text/plain")
        self.send(200, open(p, "rb").read(), mimetypes.guess_type(p)[0] or "application/octet-stream")

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        path, qs = urllib.parse.unquote(u.path), urllib.parse.parse_qs(u.query)
        if path.startswith("/tv/game/1/"):
            return self.file(os.path.join(GAMES, path[len("/tv/game/1/"):]))
        if path.startswith("/static/"):
            return self.file(os.path.join(ROOT, path[1:]))
        if path == "/api/tv/tile/1/list":
            d = os.path.join(GAMES, qs.get("sub", [""])[0])
            if not os.path.isdir(d):
                return self.send(200, json.dumps({"items": [], "missing": True}).encode())
            items = [{"name": n, "type": "image" if n.lower().endswith((".jpg", ".jpeg", ".png", ".webp")) else "other"} for n in sorted(os.listdir(d))]
            return self.send(200, json.dumps({"items": items}).encode())
        if path == "/api/tv/family/people":
            people = {}
            for fid, name, _ in family():
                people.setdefault(name, []).append(fid)
            data = [{"id": i + 1, "name": k, "faces": v[:6], "count": len(v)} for i, (k, v) in enumerate(people.items())]
            return self.send(200, json.dumps({"people": data}, ensure_ascii=False).encode())
        if path.startswith("/api/tv/face/"):
            fid = int(path.split("/")[4])
            hit = next((x for x in family() if x[0] == fid), None)
            if not hit:
                return self.send(404, b"nf", "text/plain")
            return self.file(hit[2]) if hit[2] else self.send(200, face_svg(fid, hit[1]), "image/svg+xml")
        photos = sorted(os.listdir(PHOTOS)) if os.path.isdir(PHOTOS) else []
        if path == "/api/tv/wallpaper":
            return self.send(200, json.dumps({"ids": list(range(1, len(photos) + 1))}).encode())
        if path.startswith("/api/tv/photo/"):
            i = int(path.split("/")[4])
            return self.file(os.path.join(PHOTOS, photos[i - 1])) if 0 < i <= len(photos) else self.send(404, b"nf", "text/plain")
        self.send(404, b"not found", "text/plain")

    def do_POST(self):
        path = urllib.parse.unquote(urllib.parse.urlparse(self.path).path)
        n = int(self.headers.get("Content-Length") or 0)
        try:
            d = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            d = {}
        if path == "/api/tv/learn/result":
            print(f"📘 {d.get('game')} · {d.get('topic')} · {'✓' if d.get('ok') else '✗'}", flush=True)
            return self.send(200, json.dumps({"ok": True, "stored": True}).encode())
        if path != "/api/tv/stars/earn":
            return self.send(404, b"not found", "text/plain")
        try:
            amount = int(d.get("amount"))
        except (TypeError, ValueError):
            return self.send(400, json.dumps({"error": "amount غير صالح"}).encode())
        if not 1 <= amount <= 10 or not str(d.get("game") or "").strip():
            return self.send(400, json.dumps({"error": "amount من 1 إلى 10، و game مطلوب"}).encode())
        added = max(0, min(amount, STARS["limit"] - STARS["today"]))
        STARS["balance"] += added
        STARS["today"] += added
        print(f"⭐ +{added} ({d.get('game')}: {d.get('reason')}) → {STARS['balance']}", flush=True)
        self.send(200, json.dumps({"ok": True, "added": added, "balance": STARS["balance"], "today": STARS["today"],
                                   "limit": STARS["limit"], "capped": added < amount}).encode())


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f"http://127.0.0.1:{port}/tv/game/1/<اسم اللعبة>/index.html")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
