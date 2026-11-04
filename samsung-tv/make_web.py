#!/usr/bin/env python3
"""
Build the standalone web version of the TV display (no computer needed).

    python3 make_web.py            -> ../docs/index.html

The result is a single HTML file that the Samsung TV browser opens directly
from GitHub Pages: prayer times are calculated in the page itself (same
method as prayer.py), weather comes straight from Open-Meteo, and the adhan
plays from adhan.mp3 next to the page when it exists (otherwise a chime).
"""

from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "static" / "tv.html"
OUT = HERE.parent / "docs" / "index.html"

CALC_JS = r"""
// ---------- standalone: settings from the address (all optional) ----------
// ?city=Mouscron&lat=50.7446&lng=3.2142&fajr=12&isha=12&adj=0,0,0,0,0,0
const Q = new URLSearchParams(location.search);
const CITY = { name: Q.get('city') || 'موسكرون', lat: +(Q.get('lat') || 50.7446), lng: +(Q.get('lng') || 3.2142) };
const ANGLES = { fajr: +(Q.get('fajr') || 12), isha: +(Q.get('isha') || 12) };
const ADJ = (Q.get('adj') || '').split(',').map(x => parseInt(x, 10) || 0);

// ---------- prayer-time calculation (same as prayer.py) ----------
const d2r = d => d * Math.PI / 180, r2d = r => r * 180 / Math.PI, fix = (a, b) => a - b * Math.floor(a / b);
function sunPos(jd){
  const d = jd - 2451545.0;
  const g = d2r(fix(357.529 + 0.98560028 * d, 360));
  const q = fix(280.459 + 0.98564736 * d, 360);
  const L = d2r(fix(q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g), 360));
  const e = d2r(23.439 - 0.00000036 * d);
  const ra = r2d(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
  return { decl: Math.asin(Math.sin(e) * Math.sin(L)), eqt: q / 15 - fix(ra, 24) };
}
function computeTimes(day){
  const y = day.getFullYear(), m = day.getMonth() + 1, dd = day.getDate();
  // Julian day at local midnight (same formula as Python's toordinal() + 1721424.5)
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  const jdn = dd + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  const jd = jdn - 0.5 - CITY.lng / 360, lat = d2r(CITY.lat);
  const noon = t => fix(12 - sunPos(jd + t / 24).eqt, 24);
  const angleTime = (ang, t, ccw) => {
    const decl = sunPos(jd + t / 24).decl;
    let x = (-Math.sin(d2r(ang)) - Math.sin(decl) * Math.sin(lat)) / (Math.cos(decl) * Math.cos(lat));
    x = Math.max(-1, Math.min(1, x));
    const diff = r2d(Math.acos(x)) / 15;
    return noon(t) + (ccw ? -diff : diff);
  };
  const asrTime = t => {
    const decl = sunPos(jd + t / 24).decl;
    return angleTime(-r2d(Math.atan(1 / (1 + Math.tan(Math.abs(lat - decl))))), t, false);
  };
  const raw = { fajr: angleTime(ANGLES.fajr, 5, true), shuruq: angleTime(0.833, 6, true), dhuhr: noon(12),
                asr: asrTime(13), maghrib: angleTime(0.833, 18, false), isha: angleTime(ANGLES.isha, 18, false) };
  const tz = -new Date(y, m - 1, dd, 12).getTimezoneOffset() / 60;  // the TV's own time zone
  const off = tz - CITY.lng / 15, safety = { dhuhr: 1 / 60, maghrib: 1 / 60 };
  const out = {};
  ['fajr','shuruq','dhuhr','asr','maghrib','isha'].forEach((p, i) => {
    const v = fix(raw[p] + off + (safety[p] || 0) + (ADJ[i] || 0) / 60, 24);
    const mins = Math.round(v * 60) % 1440;
    out[p] = pad(mins / 60) + ':' + pad(mins % 60);
  });
  return out;
}
async function loadPrayer(){
  const now = new Date();
  pt = { source: 'calc', mosque: 'مواقيت الصلاة — ' + CITY.name, times: computeTimes(now), iqama: {},
         jumua: null, date: now.toLocaleDateString('sv') };
  render();
}

// ---------- weather straight from Open-Meteo ----------
const WMO = {0:['صافٍ','sun'],1:['صافٍ غالباً','sun'],2:['غائم جزئياً','partly'],3:['غائم','cloud'],45:['ضباب','fog'],48:['ضباب','fog'],
  51:['رذاذ خفيف','rain'],53:['رذاذ','rain'],55:['رذاذ كثيف','rain'],56:['رذاذ متجمّد','rain'],57:['رذاذ متجمّد','rain'],
  61:['مطر خفيف','rain'],63:['مطر','rain'],65:['مطر غزير','rain'],66:['مطر متجمّد','rain'],67:['مطر متجمّد','rain'],
  71:['ثلج خفيف','snow'],73:['ثلج','snow'],75:['ثلج كثيف','snow'],77:['حبيبات ثلج','snow'],80:['زخات مطر','rain'],81:['زخات مطر','rain'],
  82:['زخات غزيرة','rain'],85:['زخات ثلج','snow'],86:['زخات ثلج','snow'],95:['عاصفة رعدية','storm'],96:['عاصفة رعدية','storm'],99:['عاصفة رعدية','storm']};
let lastWeather = null;
async function fetchWeather(){
  const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + CITY.lat + '&longitude=' + CITY.lng + '&timezone=auto&forecast_days=4'
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min';
  try {
    const r = await (await fetch(u)).json(), c = r.current || {}, dl = r.daily || {};
    const [desc, icon] = WMO[c.weather_code] || ['—', 'cloud'];
    lastWeather = { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: c.relative_humidity_2m,
      wind: Math.round(c.wind_speed_10m), desc, icon, is_day: !!c.is_day,
      days: (dl.time || []).map((t, i) => ({ date: t, max: Math.round(dl.temperature_2m_max[i]), min: Math.round(dl.temperature_2m_min[i]),
        icon: (WMO[dl.weather_code[i]] || ['', 'cloud'])[1] })) };
    return lastWeather;
  } catch(e) {
    return lastWeather ? Object.assign({ stale: true }, lastWeather) : { error: 'لا يوجد اتصال بالإنترنت للطقس' };
  }
}
"""

REPLACEMENTS = [
    # data sources
    ("async function loadPrayer(){ try { pt = await getJSON('/api/prayer'); render(); } catch(e) { $('#warn').textContent = 'تعذّر تحميل المواقيت'; } }",
     CALC_JS),
    ("async function loadWallpapers(){ try { wallpapers = (await getJSON('/api/wallpapers')).files || []; } catch(e) {} }",
     "async function loadWallpapers(){ wallpapers = []; }"),
    ("    const w = await getJSON('/api/weather');", "    const w = await fetchWeather();"),
    ("<div class=\"w-city\">موسكرون</div><div class=\"w-now\">${w.error}</div>",
     "<div class=\"w-city\">${CITY.name}</div><div class=\"w-now\">${w.error}</div>"),
    ("<div class=\"w-city\">موسكرون${w.stale", "<div class=\"w-city\">${CITY.name}${w.stale"),
    # adhan file next to the page (uploaded to the repository), else chime
    ("async function loadSounds(){ try { sounds = await getJSON('/api/sounds'); } catch(e) {} }",
     "async function loadSounds(){\n"
     "  const has = async f => { try { return (await fetch(f, { method: 'HEAD', cache: 'no-store' })).ok; } catch(e) { return false; } };\n"
     "  sounds = { adhan: (await has('adhan.mp3')) ? 'adhan.mp3' : null, fajr: (await has('adhan-fajr.mp3')) ? 'adhan-fajr.mp3' : null };\n"
     "}"),
    ("player = new Audio('/sounds/' + encodeURIComponent(file));", "player = new Audio(file);"),
    # notes
    ("$('#warn').textContent = pt.source === 'calc' ? 'أوقات تقريبية — اختر مسجدك من تطبيق مواقيت في الأداة' : (pt.warning || '');",
     "$('#warn').textContent = ADJ.some(Boolean) ? '' : 'أوقات محسوبة فلكياً — قد تختلف دقائق عن مسجدك';"),
    # first OK: also go full screen (hides the browser's address bar)
    ("  audioOK = true; $('#unlock').style.display = 'none';",
     "  audioOK = true; $('#unlock').style.display = 'none';\n"
     "  try { const el = document.documentElement, r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (r && r.catch) r.catch(() => {}); } catch(e) {}"),
    ("🔊 اضغط OK في الريموت مرة واحدة لتفعيل صوت الأذان", "🔊 اضغط OK في الريموت مرة واحدة: ملء الشاشة وتفعيل صوت الأذان"),
    ("<title>شاشة البيت</title>", "<title>مواقيت الصلاة</title>"),
]


TREE_SRC = HERE / "static" / "tree.html"
TREE_OUT = OUT.parent / "tree.html"
TREE_ICON = OUT.parent / "tree-icon.png"


def calc_core() -> str:
    """Settings + prayer-time calculation only (shared by every page)."""
    start = CALC_JS.index("// ---------- standalone: settings")
    end = CALC_JS.index("async function loadPrayer(){")
    return CALC_JS[start:end]


def tree_icon_pixel(x: int, y: int):
    """180x180 iPhone icon: green tree on a dark background."""
    import math

    bg = (10, 31, 25)
    if 82 <= x <= 98 and 95 <= y <= 150:
        return (107, 68, 35)                       # trunk
    for cx, cy, r in ((90, 70, 42), (60, 92, 28), (120, 92, 28)):
        if math.hypot(x - cx, y - cy) <= r:
            return (63, 174, 90) if (x + y) % 17 else (227, 179, 65)
    if 150 < y < 158 and 40 < x < 140:
        return (18, 51, 38)                        # ground
    return bg


def build_tree() -> None:
    from make_tizen import png  # small PNG writer, no third-party modules

    tree = TREE_SRC.read_text("utf-8")
    if "/*CALC*/" not in tree:
        raise SystemExit("make_web.py: /*CALC*/ placeholder missing in tree.html")
    TREE_OUT.write_text(tree.replace("/*CALC*/", calc_core(), 1), "utf-8")
    TREE_ICON.write_bytes(png(180, 180, tree_icon_pixel))
    print(f"written {TREE_OUT}")


def main() -> None:
    html = SRC.read_text("utf-8")
    for old, new in REPLACEMENTS:
        if old not in html:
            raise SystemExit(f"make_web.py: pattern not found in tv.html:\n  {old[:80]}")
        html = html.replace(old, new, 1)
    # remote: green button (or the T key) opens the prayer tree
    html = html.replace("</body>", "<script>document.addEventListener('keydown', e => {"
                        " if (e.keyCode === 404 || e.key === 't') location.href = 'tree.html'; });</script>\n</body>", 1)
    if "/api/" in html:
        raise SystemExit("make_web.py: the page still calls the local /api/")
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, "utf-8")
    print(f"written {OUT}")
    build_tree()


if __name__ == "__main__":
    main()
