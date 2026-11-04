#!/usr/bin/env python3
"""
Build the Samsung TV (Tizen) app: «مواقيت البيت».

    python3 make_tizen.py            -> dist/MawaqitBayt.wgt  (unsigned)

The app is the standalone display (docs/index.html, built by make_web.py)
packaged as a Tizen web app: prayer times calculated on the TV, the adhan
while the app is open (sounds from tizen-app/adhan.mp3 if you add one,
otherwise a chime), weather, Islamic backgrounds, verses and adhkar.

Samsung TVs only install SIGNED apps, and only through Developer Mode:
sign the .wgt in Tizen Studio (Certificate Manager, a Samsung TV
certificate with the TV's DUID) and install it with Device Manager.
"""

import struct
import zipfile
import zlib
from pathlib import Path

import make_web

HERE = Path(__file__).resolve().parent
APP_DIR = HERE / "tizen-app"
DIST = HERE / "dist"
WGT = DIST / "MawaqitBayt.wgt"

CONFIG_XML = """<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets"
        id="https://github.com/HUSSEIN-SEFRANI/hussein-sefrani/mawaqit-bayt" version="1.0.0" viewmodes="maximized">
    <tizen:application id="MwqtBayt01.MawaqitBayt" package="MwqtBayt01" required_version="2.3"/>
    <name>مواقيت البيت</name>
    <author href="https://github.com/HUSSEIN-SEFRANI/hussein-sefrani">Hussein Sefrani</author>
    <description>Prayer times, adhan, weather and Islamic backgrounds for the home TV.</description>
    <content src="index.html"/>
    <icon src="icon.png"/>
    <feature name="http://tizen.org/feature/screen.size.all"/>
    <access origin="*" subdomains="true"/>
    <tizen:privilege name="http://tizen.org/privilege/internet"/>
    <tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>
    <tizen:profile name="tv-samsung"/>
    <tizen:setting screen-orientation="landscape" context-menu="disable" background-support="disable"
                   encryption="disable" install-location="auto" hwkey-event="enable"/>
</widget>
"""

# Extra script for the TV: keep the screen saver away, Back key exits,
# audio needs no "press OK" inside an installed app (but OK still works).
TIZEN_JS = r"""
<script src="$WEBAPIS/webapis/webapis.js"></script>
<script>
(function(){
  // keep the TV's screen saver off while the app is in front
  function noSaver(){
    try { webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF); } catch(e) {}
  }
  noSaver(); setInterval(noSaver, 10 * 60 * 1000);
  document.addEventListener('keydown', function(e){
    if (e.keyCode === 10009) {            // Back / Return on the Samsung remote
      try { tizen.application.getCurrentApplication().exit(); } catch(err) {}
    }
  });
  // installed apps may play sound without a key press: try right away
  window.addEventListener('load', function(){ setTimeout(function(){ try { unlockAudio(); } catch(e) {} }, 1500); });
})();
</script>
"""


def png(width: int, height: int, pixel) -> bytes:
    """Tiny PNG writer (no third-party modules)."""
    rows = b"".join(
        b"\x00" + b"".join(bytes(pixel(x, y)) for x in range(width)) for y in range(height)
    )

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


def icon_pixel(x: int, y: int):
    """512x423 icon: emerald background, gold crescent and star."""
    import math

    w, h = 512, 423
    cx, cy = w / 2, h / 2
    # background gradient
    t = math.hypot(x - cx, y - cy) / math.hypot(cx, cy)
    bg = (int(11 + (4 - 11) * t), int(61 + (20 - 61) * t), int(46 + (15 - 46) * t))
    gold = (230, 197, 90)
    # crescent: big circle minus shifted circle
    in_big = (x - (cx - 20)) ** 2 + (y - cy) ** 2 <= 130 ** 2
    in_cut = (x - (cx + 25)) ** 2 + (y - (cy - 20)) ** 2 <= 112 ** 2
    if in_big and not in_cut:
        return gold
    # five-pointed star
    sx, sy, r_out, r_in = cx + 95, cy - 25, 38, 16
    ang = math.atan2(y - sy, x - sx)
    dist = math.hypot(x - sx, y - sy)
    k = (ang + math.pi / 2) % (2 * math.pi / 5) / (2 * math.pi / 5)
    edge = r_in + (r_out - r_in) * abs(1 - 2 * k)
    if dist <= edge:
        return gold
    return bg


def main() -> None:
    make_web.main()  # refresh docs/index.html from static/tv.html
    html = make_web.OUT.read_text("utf-8")
    if "</body>" not in html:
        raise SystemExit("make_tizen.py: unexpected page structure")
    html = html.replace("</body>", TIZEN_JS + "</body>", 1)
    html = html.replace("🔊 اضغط OK في الريموت (أو المس الشاشة) مرة واحدة: ملء الشاشة وتفعيل صوت الأذان",
                        "🔊 اضغط OK في الريموت لتفعيل صوت الأذان")

    APP_DIR.mkdir(exist_ok=True)
    # inside an installed app the sound files are known at build time
    start = html.index("async function loadSounds(){")
    end = html.index("\n}", start) + 2
    adhan = "'adhan.mp3'" if (APP_DIR / "adhan.mp3").exists() else "null"
    fajr = "'adhan-fajr.mp3'" if (APP_DIR / "adhan-fajr.mp3").exists() else "null"
    html = html[:start] + f"async function loadSounds(){{ sounds = {{ adhan: {adhan}, fajr: {fajr} }}; }}" + html[end:]
    (APP_DIR / "index.html").write_text(html, "utf-8")
    (APP_DIR / "config.xml").write_text(CONFIG_XML, "utf-8")
    (APP_DIR / "icon.png").write_bytes(png(512, 423, icon_pixel))

    DIST.mkdir(exist_ok=True)
    with zipfile.ZipFile(WGT, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(APP_DIR.iterdir()):
            if f.is_file() and f.name != "README.txt":
                z.write(f, f.name)
    print(f"written {WGT}  ({WGT.stat().st_size // 1024} KB, unsigned)")


if __name__ == "__main__":
    main()
