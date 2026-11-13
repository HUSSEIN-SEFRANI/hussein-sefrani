// يبني map.js (خريطة العالم المبسطة) — للمطور فقط، لا تحتاجه اللعبة.
// الاستعمال: npm i world-atlas@2 topojson-client@3 topojson-simplify@3 d3-geo@3 i18n-iso-countries@7
//            node tools/buildmap.js > map.js
// البيانات: Natural Earth (ملكية عامة) عبر world-atlas.
const fs = require("fs"), path = require("path");
const topo = require("world-atlas/countries-50m.json");
const { feature, merge } = require("topojson-client");
const { presimplify, simplify, quantile } = require("topojson-simplify");
const d3 = require("d3-geo"), iso = require("i18n-iso-countries");

const want = fs.readFileSync(path.join(__dirname, "../data.js"), "utf8").split("\n").map((l) => l.split("|")[0]).filter((c) => /^[A-Z]{2}$/.test(c));
const t = simplify(presimplify(topo), quantile(presimplify(topo), 0.42));
const geoms = t.objects.countries.geometries;
// دمج: إسرائيل ضمن فلسطين (قرار المستخدم)، وأجزاء تابعة لدولها
const MERGE = { "Israel": "PS", "Somaliland": "SO", "N. Cyprus": "CY", "Hong Kong": "CN", "Macao": "CN", "Åland": "FI" };
const groups = {}, other = [];
for (const g of geoms) {
  const name = g.properties.name;
  if (name === "Antarctica" || name === "Fr. S. Antarctic Lands" || name === "Heard I. and McDonald Is.") continue;
  const a2 = MERGE[name] || (g.id ? iso.numericToAlpha2(g.id) : null);
  if (a2 && want.includes(a2)) (groups[a2] = groups[a2] || []).push(g); else other.push(g);
}
const W = 2000, H = 1000;
const proj = d3.geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: "Sphere" });
const ph = d3.geoPath(proj).digits(1);
const out = { W, H: 0, c: {}, land: "" };
const polys = (f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);
let maxY = 0;
for (const [a2, gs] of Object.entries(groups)) {
  const f = { type: "Feature", geometry: merge(t, gs) };
  // الإطار: أكبر جزء + الأجزاء القريبة منه
  const parts = polys(f).map((p) => { const pf = { type: "Polygon", coordinates: p }; return { a: ph.area(pf), b: ph.bounds(pf) }; }).sort((x, y) => y.a - x.a);
  const m = parts[0].b; let [x0, y0] = m[0], [x1, y1] = m[1];
  for (const p of parts.slice(1)) {
    const cx = (p.b[0][0] + p.b[1][0]) / 2, cy = (p.b[0][1] + p.b[1][1]) / 2;
    if (cx > m[0][0] - 60 && cx < m[1][0] + 60 && cy > m[0][1] - 60 && cy < m[1][1] + 60) { x0 = Math.min(x0, p.b[0][0]); y0 = Math.min(y0, p.b[0][1]); x1 = Math.max(x1, p.b[1][0]); y1 = Math.max(y1, p.b[1][1]); }
  }
  const r = (v) => Math.round(v * 10) / 10;
  out.c[a2] = { d: ph(f), b: [r(x0), r(y0), r(x1 - x0), r(y1 - y0)], s: ph.area(f) < 30 ? 1 : 0 };
  maxY = Math.max(maxY, ph.bounds(f)[1][1]);
}
// دول تعبر خط الطول 180: إطار يدوي
const BOX = { FJ: [[177, -19.2], [180, -16]] };
for (const [a2, [p0, p1]] of Object.entries(BOX)) { const a = proj(p0), b = proj(p1), r = (v) => Math.round(v * 10) / 10; out.c[a2].b = [r(Math.min(a[0], b[0])), r(Math.min(a[1], b[1])), r(Math.abs(b[0] - a[0])), r(Math.abs(b[1] - a[1]))]; }
// دول لا تظهر في البيانات: نقطة في مكانها
const POINTS = { TV: [179.2, -8.52] };
for (const [a2, ll] of Object.entries(POINTS)) { const [x, y] = proj(ll).map((v) => Math.round(v * 10) / 10); out.c[a2] = { d: `M${x - 1.5},${y}a1.5,1.5 0 1,0 3,0a1.5,1.5 0 1,0 -3,0Z`, b: [x - 1, y - 1, 2, 2], s: 1 }; }
out.land = other.map((g) => ph(feature(t, g))).filter(Boolean).join("");
out.H = Math.ceil(maxY + 10);
const miss = want.filter((c) => !out.c[c]);
if (miss.length) console.error("missing", miss);
process.stdout.write("// خريطة العالم المبسطة (Natural Earth، ملكية عامة) — مولّدة بـ tools/buildmap.js\nwindow.MAP = " + JSON.stringify(out) + ";\n");
