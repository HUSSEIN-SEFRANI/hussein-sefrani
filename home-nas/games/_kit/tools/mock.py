"""خادم تجريبي صغير يحاكي التلفاز لتجربة الألعاب على الكمبيوتر.

    python3 games/_kit/tools/mock.py 8766
ثم افتح: http://127.0.0.1:8766/tv/game/1/<اسم اللعبة>/index.html

- يخدم مجلدات الألعاب كما يخدمها التلفاز (/tv/game/1/...)، والخطوط من /static.
- /api/tv/tile/1/list?sub=<مجلد>: قائمة ملفات مجلد داخل games (مثل صور اللعبة).
- /api/tv/wallpaper و /api/tv/photo/<n>/view: «صور الطفل» من مجلد tools/photos إن وُجد.
- POST /api/tv/stars/earn: يحاكي إضافة النجوم (رصيد يبدأ بـ 10، وحد يومي 20)، انظر _kit/API.txt.
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
