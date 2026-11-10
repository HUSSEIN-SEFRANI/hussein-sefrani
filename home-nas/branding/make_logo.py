#!/usr/bin/env python3
"""يولّد شعار HOME ANAB: حرف B من حبات العنب + النص كمسارات (لا يحتاج خطاً).
   python3 branding/make_logo.py   ← يكتب static/img/{logo.svg, logo-dark.svg, grape.svg, icon.svg} و installer/ui/logo.svg"""
import math
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "static/fonts/baloo-lat.woff2"

# ---------------------------------------------------------------- حرف B من العنب (الوحدة: ارتفاع الحرف ≈ 100، الخط الأساسي y=96)
SHADES = [("#d8b4fe", "#9333ea", "#581c87"), ("#c084fc", "#7e22ce", "#4c1d95"), ("#e9d5ff", "#a855f7", "#6b21a8")]


def grape_points():
    pts = [(13, y) for y in range(13, 90, 19)]
    def arc(cx, cy, r, a0, a1, n):
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    pts.append((32, 12)); arc(38, 31, 19.5, -55, 70, 3); pts.append((32, 51))
    arc(42, 70.5, 22, -50, 78, 4); pts.append((34, 90))
    return sorted(pts, key=lambda p: p[1])


def leaf_path():
    lobes = [(-112, .62), (-56, .86), (0, 1), (56, .86), (112, .62)]
    R = 26
    def P(ang, k):
        a = math.radians(ang - 90)
        return f"{k * R * math.cos(a):.1f} {k * R * math.sin(a):.1f}"
    d = "M0 0"
    for i, (a, k) in enumerate(lobes):
        prev = (lobes[i - 1][0] + a) / 2 if i else a - 28
        d += f" Q {P(prev, .45 if i else .2)} {P(prev, .52 if i else .28)} Q {P(a - 14, k * .95)} {P(a, k)}"
    d += f" Q {P(140, .3)} 0 0 Z"
    veins = " ".join(f"M0 0 L {P(a, k * .8)}" for a, k in lobes)
    return d, veins


def grape_b(prefix="g"):
    """يرجع (defs, body) لحرف B؛ العرض ≈ 78، من y=-36 (الورقة) إلى y=104."""
    defs = "".join(f'<radialGradient id="{prefix}{i}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="{a}"/><stop offset=".55" stop-color="{b}"/>'
                   f'<stop offset="1" stop-color="{c}"/></radialGradient>' for i, (a, b, c) in enumerate(SHADES))
    r = 13
    body = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="url(#{prefix}{(i * 7) % 3})"/>'
                   f'<ellipse cx="{x - 3.6:.1f}" cy="{y - 4.2:.1f}" rx="3.2" ry="2.4" fill="#fff" opacity=".6"/>' for i, (x, y) in enumerate(grape_points()))
    d, veins = leaf_path()
    stem = '<path d="M14 2 C 14 -5 18 -8 25 -7" stroke="#78350f" stroke-width="3.6" fill="none" stroke-linecap="round"/>'
    tendril = '<path d="M15 -4 C 7 -8 3 -16 8 -20 C 12 -23 15 -18 11 -16" stroke="#16a34a" stroke-width="2" fill="none" stroke-linecap="round"/>'
    leaf = (f'<g transform="translate(26 -6) rotate(28)"><path d="{d}" fill="#22c55e" stroke="#15803d" stroke-width="1.5" stroke-linejoin="round"/>'
            f'<path d="{veins}" stroke="#15803d" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".8"/></g>')
    return defs, stem + tendril + body + leaf


# ---------------------------------------------------------------- النص كمسارات
def text_paths(text, size, x0, baseline, font):
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    scale = size / font["head"].unitsPerEm
    x, out = x0, []
    for ch in text:
        gname = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[gname].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        if pen.getCommands():
            out.append(pen.getCommands())
        x += hmtx[gname][0] * scale
    return " ".join(out), x


def main():
    font = instantiateVariableFont(TTFont(str(FONT)), {"wght": 800})
    size, base = 140, 96
    # "HOME " ثم "ANA"
    home_d, x1 = text_paths("HOME ", size, 0, base, font)
    ana_d, x2 = text_paths("ANA", size, x1, base, font)
    bx = x2 + 10
    width = bx + 80
    out = ROOT / "static/img"

    def wordmark(home, ana, prefix="w"):
        defs, b = grape_b(prefix)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -40 {width + 12:.0f} 150" role="img" aria-label="HOME ANAB">'
                f'<defs>{defs}</defs><path d="{home_d}" fill="{home}"/><path d="{ana_d}" fill="{ana}"/>'
                f'<g transform="translate({bx:.1f} 2)">{b}</g></svg>')

    (out / "logo.svg").write_text(wordmark("#16a34a", "#6b21a8"))
    (out / "logo-dark.svg").write_text(wordmark("#86efac", "#ffffff", prefix="d"))
    defs, b = grape_b("i")
    grape = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -36 96 140" role="img" aria-label="HOME ANAB"><defs>{defs}</defs>{b}</svg>'
    (out / "grape.svg").write_text(grape)
    # أيقونة: خلفية بيضاء مستديرة
    icon = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>{defs}</defs>'
            f'<rect width="512" height="512" rx="112" fill="#ffffff"/><rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="#ede9fe" stroke-width="12"/>'
            f'<g transform="translate(140 146) scale(3.0)">{b}</g></svg>')
    (out / "icon.svg").write_text(icon)
    # أيقونة مربعة كاملة (maskable) للهاتف: يقصّها النظام بنفسه
    (out / "icon-maskable.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>{defs}</defs>'
                                           f'<rect width="512" height="512" fill="#ffffff"/><g transform="translate(156 161) scale(2.6)">{b}</g></svg>')
    (ROOT / "installer/ui/logo.svg").write_text((out / "logo-dark.svg").read_text())
    print("ok", round(width), "wide")


if __name__ == "__main__":
    main()
