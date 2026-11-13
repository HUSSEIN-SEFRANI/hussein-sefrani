// سباق كريم — لعبة سباق ثلاثية الأبعاد للأطفال (تعمل بدون إنترنت).
// التحكم: ← → توجيه، ↑ توربو، ↓ تمهّل، موافق/مسافة = بوق. يد التحكم (Gamepad) مدعومة.
import * as THREE from "./three.module.min.js";

// ------------------------------------------------------------------ الإعدادات
const LAPS = 2;
const ROAD_W = 16;          // عرض الطريق
const N = 700;              // عدد نقاط المسار
const CRUISE = 20, TURBO = 31, SLOW = 9;
const VEHICLES = [
  { id: "car", name: "سيارة سباق", ic: "🏎️" },
  { id: "coupe", name: "سيارة", ic: "🚗" },
  { id: "police", name: "شرطة", ic: "🚓" },
  { id: "jeep", name: "جيب", ic: "🚙" },
  { id: "bus", name: "حافلة", ic: "🚌" },
  { id: "fire", name: "إطفاء", ic: "🚒" },
  { id: "truck", name: "شاحنة", ic: "🚚" },
  { id: "digger", name: "حفارة", ic: "🏗️" },
  { id: "dump", name: "قلاب", ic: "🚛" },
];
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#facc15", "#a855f7", "#f97316", "#ec4899"];
const ORDINAL = ["الأول", "الثاني", "الثالث", "الرابع"];

// ------------------------------------------------------------------ المشهد
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#8fd3ff");
scene.fog = new THREE.Fog("#bfe6ff", 160, 420);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 800);
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
const hemi = new THREE.HemisphereLight("#ffffff", "#7cc36a", 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff6dd", 1.4);
sun.position.set(80, 120, 40);
scene.add(sun);

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === "string" ? mat(c) : c);

// ------------------------------------------------------------------ الخرائط
// قطع الطريق الجاهزة: نقاط [مسافة من بداية القطعة، ارتفاع] وفجوة القفز
const FEAT = {
  jump: { kn: [[0, 0], [45, 7], [70, 7], [88, 6], [106, 6], [145, 0]], gap: [70, 88] },            // جسر ثم قفزة إلى جسر آخر
  jump2: { kn: [[0, 0], [40, 6], [48, 6], [65, 5.5], [78, 5.5], [110, 0]], gap: [48, 65] },        // قفزة ثانية بين جسرين
  slide: { kn: [[0, 0], [67, 15], [81, 15], [119, 2.5], [126, 4], [145, 3.5], [157, 3.5], [190, 0]], gap: [126, 145] }, // نزول سريع ثم قفزة
  slide2: { kn: [[0, 0], [44, 10], [56, 10], [88, 1.5], [95, 3], [113, 2.5], [122, 2.5], [145, 0]], gap: [95, 113] },
};
const MAPS = [
  {
    name: "الريف", PTS: [[0, 0], [70, -15], [140, 5], [175, 60], [150, 125], [90, 140], [55, 105], [5, 125], [-60, 135], [-120, 100], [-135, 40], [-90, -5]],
    feats: [["jump", 70], ["jump2", 300], ["slide", 545], ["slide2", 790]], tunnel: 236, pads: [255, 480, 965],
    th: { sky: "#8fd3ff", fog: "#bfe6ff", hemi: ["#ffffff", "#7cc36a"], ground: "#7ccf5d", trees: "green", rocks: ["#a8a59c", "#b9b6ad", "#8f8c84", "#c4c0b6"], rockP: 0.35,
      water: ["#2f8fd8", "#7cc6f5"], hills: ["#6b8fd6", "#7c9be0"], stone: "#8d877b", tunIn: ["#b8b2a6", "#9c968a"], top: "#5fae46", curb: ["#ef4444", "#ffffff"] },
  },
  {
    name: "الصحراء", PTS: [[0, 0], [90, -25], [175, -10], [215, 50], [200, 120], [140, 150], [80, 125], [20, 150], [-50, 175], [-125, 150], [-160, 85], [-110, 15]],
    feats: [["jump", 80], ["jump2", 330], ["slide", 640], ["slide2", 860]], tunnel: 260, pads: [470, 1050, 1150],
    th: { sky: "#8ccdf2", fog: "#f1dcb6", hemi: ["#fff4e0", "#d8a868"], ground: "#e6c07a", trees: "cactus", rocks: ["#d08a52", "#c47a45", "#e0a46c", "#b86d3c"], rockP: 0.5,
      water: ["#20aebf", "#7fe0e8"], hills: ["#d9925b", "#c97f4a"], stone: "#b9824f", tunIn: ["#d8a874", "#bf8d5a"], top: "#e2b56f", curb: ["#ef4444", "#ffffff"] },
  },
  {
    name: "الثلج", PTS: [[0, 0], [80, 10], [150, -20], [215, 5], [230, 75], [175, 120], [110, 100], [70, 150], [-5, 175], [-90, 150], [-135, 85], [-85, 20]],
    feats: [["jump", 60], ["jump2", 230], ["slide", 640], ["slide2", 850]], tunnel: 420, pads: [375, 520, 1050],
    th: { sky: "#bcdcf5", fog: "#e6f1fb", hemi: ["#ffffff", "#c9d8ea"], ground: "#f1f6fb", trees: "pine", rocks: ["#8e9aaa", "#a4afbd", "#7b8797", "#b9c3cf"], rockP: 0.3,
      water: ["#7cc3e8", "#d8f1fb"], hills: ["#e8eff8", "#c8d7ec"], stone: "#7d8794", tunIn: ["#aab3bf", "#8f99a6"], top: "#f1f6fb", curb: ["#2563eb", "#ffffff"], snow: true },
  },
];

// ------------------------------------------------------------------ المسار (يُبنى من الخريطة المختارة)
let MAP, curve, L, P = [], T = [], NRM = [], KN = [[0, 0]], GAPS = [], TUN = [0, 0];
let world = null, gate = null, gapMids = [], stars = [], pads = [], clouds = null, snowFx = null;
function frameAt(s) {
  const u = (((s % L) + L) % L) / L * N;
  const i = Math.floor(u), f = u - i;
  const p = P[i].clone().lerp(P[i + 1], f);
  const t = T[i].clone().lerp(T[i + 1], f).normalize();
  return { p, t, n: new THREE.Vector3(-t.z, 0, t.x) };
}
function place(obj, s, x, y = 0) {
  const { p, t, n } = frameAt(s);
  obj.position.copy(p).addScaledVector(n, x);
  obj.position.y = y;
  obj.rotation.y = Math.atan2(t.x, t.z);
}

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ------------------------------------------------------------------ الجسور والمنحدرات والقفزات
const wrapS = (s) => ((s % L) + L) % L;
function H(s) {
  s = wrapS(s);
  for (let i = 1; i < KN.length; i++) {
    if (s <= KN[i][0]) {
      const [s0, h0] = KN[i - 1], [s1, h1] = KN[i];
      const u = (s - s0) / (s1 - s0 || 1), e = u * u * (3 - 2 * u);
      return h0 + (h1 - h0) * e;
    }
  }
  return 0;
}
const slopeAt = (s) => (H(s + 1) - H(s - 1)) / 2;
const gapAt = (s) => { s = wrapS(s); return GAPS.find(([a, b]) => s > a && s < b); };
const inTunnel = (s) => wrapS(s) > TUN[0] && wrapS(s) < TUN[1];
// ارتفاع مسار القفزة فوق الفجوة (قوس يهبط دائماً على الطريق التالي)
function arcY(s, jump) {
  const g = gapAt(s); if (!g) return H(s);
  const u = (wrapS(s) - g[0]) / (g[1] - g[0]);
  return H(g[0]) + (H(g[1]) - H(g[0])) * u + jump * 4 * u * (1 - u);
}

let texAniso = 4;
function canvasTex(w, h, draw, repeatU = 1) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tx = new THREE.CanvasTexture(c);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.anisotropy = texAniso;
  tx.repeat.set(repeatU, 1);
  return tx;
}
// شريط على طول المسار: offA/offB إزاحة جانبية، y/yB ارتفاع فوق الطريق (لعمل الجدران)، و only تختار المقاطع
function strip(offA, offB, y, material, uScale, yB = y, only = null) {
  const pos = [], uv = [], idx = [];
  let acc = 0;
  for (let i = 0; i <= N; i++) {
    if (i) acc += P[i].distanceTo(P[i - 1]);
    const h = H((i / N) * L);
    const a = P[i].clone().addScaledVector(NRM[i], offA), b = P[i].clone().addScaledVector(NRM[i], offB);
    pos.push(a.x, h + y, a.z, b.x, h + yB, b.z);
    uv.push(acc / uScale, 0, acc / uScale, 1);
    const sm = ((i + 0.5) / N) * L;
    if (i < N && !gapAt(sm) && (!only || only(sm))) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.material.side = THREE.DoubleSide;
  world.add(m);
  return m;
}
function nearRoad(x, z, margin) {
  for (let i = 0; i < N; i += 4) if (Math.hypot(P[i].x - x, P[i].z - z) < ROAD_W / 2 + margin) return true;
  return false;
}
// مجسمات مكررة كثيرة في رسمة واحدة (أشجار، صخور...) لتبقى اللعبة خفيفة
function instanced(geo, material, list) {
  const m = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  m.count = list.length;
  const o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach(([px, py, pz, sx, sy, sz, ry, col, rx = 0, rz = 0], i) => {
    o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (col) m.setColorAt(i, c.set(col));
  });
  world.add(m);
  return m;
}
const starGeo = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1.1, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false });
})();

function buildWorld(mi) {
  if (world) {
    scene.remove(world);
    world.traverse((o) => {
      if (o.geometry && o.geometry !== starGeo) o.geometry.dispose();
      [].concat(o.material || []).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
  }
  MAP = MAPS[mi]; const th = MAP.th;
  world = new THREE.Group(); scene.add(world);
  seed = 7 + mi * 101;
  scene.background.set(th.sky); scene.fog.color.set(th.fog);
  hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]);

  // المسار
  curve = new THREE.CatmullRomCurve3(MAP.PTS.map(([x, z]) => new THREE.Vector3(x * 1.3, 0, z * 1.3)), true, "centripetal");
  L = curve.getLength();
  P = []; T = []; NRM = [];
  for (let i = 0; i <= N; i++) {
    const u = (i % N) / N;
    const p = curve.getPointAt(u), t = curve.getTangentAt(u).setY(0).normalize();
    P.push(p); T.push(t); NRM.push(new THREE.Vector3(-t.z, 0, t.x)); // إلى اليسار
  }
  KN = [[0, 0]]; GAPS = [];
  MAP.feats.forEach(([k, s0]) => { FEAT[k].kn.forEach(([d, h]) => KN.push([s0 + d, h])); GAPS.push([s0 + FEAT[k].gap[0], s0 + FEAT[k].gap[1]]); });
  KN.sort((a, b) => a[0] - b[0]);
  TUN = [MAP.tunnel, MAP.tunnel + 50];
  const bb = new THREE.Box3().setFromPoints(P), mid = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3());

  // الطريق السريع: خطوط صفراء مزدوجة وخطوط مسارات بيضاء
  strip(ROAD_W / 2, -ROAD_W / 2, 0.03, new THREE.MeshLambertMaterial({
    map: canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = "#4b515c"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { g.fillStyle = ["#444a54", "#555b66", "#3f444d"][i % 3]; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = "#f5f5f0"; g.fillRect(0, 6, w, 4); g.fillRect(0, h - 10, w, 4);
      g.fillRect(0, h / 4 - 2, w / 2, 4); g.fillRect(0, (h * 3) / 4 - 2, w / 2, 4);
      g.fillStyle = "#f4c21b"; g.fillRect(0, h / 2 - 6, w, 4); g.fillRect(0, h / 2 + 2, w, 4);
    }),
  }), 10);
  // الأرصفة الملونة
  const curbMat = new THREE.MeshLambertMaterial({
    map: canvasTex(64, 16, (g, w, h) => { g.fillStyle = th.curb[0]; g.fillRect(0, 0, w, h); g.fillStyle = th.curb[1]; g.fillRect(w / 2, 0, w / 2, h); }),
  });
  strip(ROAD_W / 2 + 1.6, ROAD_W / 2, 0.06, curbMat, 4);
  strip(-ROAD_W / 2, -ROAD_W / 2 - 1.6, 0.06, curbMat, 4);
  // جوانب الجسور: حاجز إسمنتي من تحت الطريق حتى فوقه قليلاً
  const concrete = new THREE.MeshLambertMaterial({
    map: canvasTex(64, 32, (g, w, h) => {
      g.fillStyle = "#d4d8de"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#b8bec7"; g.fillRect(0, 0, w, 5); g.fillRect(w - 2, 0, 2, h);
      g.fillStyle = "#f59e0b"; g.fillRect(0, 5, w, 3);
    }),
  });
  const onBridge = (s) => H(s) > 0.3;
  [ROAD_W / 2 + 1.6, -ROAD_W / 2 - 1.6].forEach((x) => strip(x, x, 0.75, concrete, 6, -1.3, onBridge));
  strip(ROAD_W / 2 + 1.6, -ROAD_W / 2 - 1.6, -1.3, new THREE.MeshLambertMaterial({ color: "#9aa1ab" }), 10, -1.3, onBridge);
  // أعمدة تحت الجسور وأكتاف على حافتي كل فجوة
  const o = new THREE.Object3D(), mat4 = (s, x, y, sx = 1, sy = 1, sz = 1) => { place(o, s, x, y); return [o.position.x, o.position.y, o.position.z, sx, sy, sz, o.rotation.y]; };
  const cols = [];
  for (let s = 0; s < L; s += 11) {
    const h = H(s);
    if (h > 1.6 && !gapAt(s) && !gapAt(s + 3) && !gapAt(s - 3)) [-ROAD_W / 2 + 2, ROAD_W / 2 - 2].forEach((x) => cols.push(mat4(s, x, (h - 1.2) / 2, 1, h - 1.2, 1)));
  }
  GAPS.forEach(([a, b]) => [a - 1.5, b + 1.5].forEach((s) => [-ROAD_W / 2 + 2, 0, ROAD_W / 2 - 2].forEach((x) => cols.push(mat4(s, x, (H(s) - 1.2) / 2, 1, H(s) - 1.2, 1)))));
  instanced(new THREE.BoxGeometry(1.8, 1, 1.8), new THREE.MeshLambertMaterial({ color: "#c3c8cf" }), cols);
  // حواجز معدنية على جانبي الطريق الأرضي
  const rail = new THREE.MeshPhongMaterial({
    map: canvasTex(32, 32, (g, w, h) => { g.fillStyle = "#c9ced6"; g.fillRect(0, 0, w, h); g.fillStyle = "#9097a2"; g.fillRect(0, h / 2 - 3, w, 6); g.fillStyle = "#eef1f5"; g.fillRect(0, 3, w, 4); }),
    specular: "#ffffff", shininess: 70, side: THREE.DoubleSide,
  });
  const railHere = (s) => H(s) <= 0.3 && !inTunnel(s) && (wrapS(s) > 12 || wrapS(s) < L - 12);
  const RX = ROAD_W / 2 + 2.3;
  [RX, -RX].forEach((x) => strip(x, x, 0.95, rail, 3, 0.55, railHere));
  const posts = [];
  for (let s = 0; s < L; s += 4) if (railHere(s)) [RX + 0.12, -RX - 0.12].forEach((x) => posts.push(mat4(s, x, 0.5)));
  instanced(new THREE.BoxGeometry(0.16, 1, 0.16), new THREE.MeshLambertMaterial({ color: "#7b828d" }), posts);
  // صخور كبيرة على جوانب الأجزاء المستوية
  const rocks = [];
  for (let s = 32; s < L - 20; s += 4.5) {
    if (H(s) > 0.1 || H(s - 15) > 0.1 || H(s + 15) > 0.1 || rnd() > th.rockP) continue;
    const side = rnd() < 0.5 ? -1 : 1, r = 3 + rnd() * 5;
    place(o, s + rnd() * 3, side * (ROAD_W / 2 + 7 + rnd() * 9), r * 0.35);
    rocks.push([o.position.x, o.position.y, o.position.z, r, r * (0.9 + rnd() * 0.8), r, rnd() * 3, th.rocks[rocks.length % 4], rnd() * 3, rnd() * 3]);
  }
  instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true }), rocks);
  // نفق حجري بقوس فوق الطريق
  {
    const inner = new THREE.MeshLambertMaterial({
      map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = th.tunIn[0]; g.fillRect(0, 0, w, h); g.strokeStyle = th.tunIn[1]; g.lineWidth = 2; for (let y = 0; y < h; y += 16) { g.strokeRect(-2, y, w + 4, 16); g.beginPath(); g.moveTo((y / 16) % 2 ? 16 : 48, y); g.lineTo((y / 16) % 2 ? 16 : 48, y + 16); g.stroke(); } g.fillStyle = "#fff7d6"; g.fillRect(28, 0, 8, 6); }),
    });
    const R0 = ROAD_W / 2 + 3, SEG = 9;
    for (let k = 0; k < SEG; k++) {
      const a0 = (k / SEG) * Math.PI, a1 = ((k + 1) / SEG) * Math.PI;
      strip(Math.cos(a0) * R0, Math.cos(a1) * R0, Math.sin(a0) * R0 * 0.8, inner, 6, Math.sin(a1) * R0 * 0.8, inTunnel);
    }
    const stone = new THREE.MeshLambertMaterial({ color: th.stone, flatShading: true });
    const topMat = mat(th.top);
    [TUN[0], TUN[1]].forEach((s) => {
      const W = R0 + 6, HT = R0 * 0.8 + 4.5;
      const sh = new THREE.Shape();
      sh.moveTo(-W, 0); sh.lineTo(-R0, 0);
      for (let k = 0; k <= 16; k++) { const a = Math.PI - (k / 16) * Math.PI; sh.lineTo(Math.cos(a) * R0, Math.sin(a) * R0 * 0.8); }
      sh.lineTo(W, 0); sh.lineTo(W, HT - 2); sh.quadraticCurveTo(W, HT, W - 2, HT); sh.lineTo(-W + 2, HT); sh.quadraticCurveTo(-W, HT, -W, HT - 2); sh.lineTo(-W, 0);
      const fg = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false }); fg.translate(0, 0, -0.8);
      const portal = new THREE.Group(); portal.add(new THREE.Mesh(fg, stone));
      const top = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 0.4, 0.5, 2.2), topMat); top.position.y = HT + 0.1; portal.add(top);
      place(portal, s, 0, 0); world.add(portal);
    });
    for (let k = 0; k < SEG; k++) {
      const a0 = (k / SEG) * Math.PI, a1 = ((k + 1) / SEG) * Math.PI, R1 = R0 + 2.2;
      strip(Math.cos(a0) * R1, Math.cos(a1) * R1, Math.sin(a0) * (R0 * 0.8 + 3.5), topMat, 6, Math.sin(a1) * (R0 * 0.8 + 3.5), (s) => wrapS(s) > TUN[0] + 0.8 && wrapS(s) < TUN[1] - 0.8);
    }
  }
  // ماء تحت كل فجوة، ولوحة تحذير صفراء عند الحافتين
  const water = new THREE.MeshLambertMaterial({
    map: canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = th.water[0]; g.fillRect(0, 0, w, h);
      g.strokeStyle = th.water[1]; g.lineWidth = 2;
      for (let y = 6; y < h; y += 12) { g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin(x / 5) * 2); g.stroke(); }
    }, 4),
  });
  water.map.repeat.set(4, 3);
  const hazard = new THREE.MeshLambertMaterial({
    map: canvasTex(64, 8, (g, cw, ch) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#111" : "#facc15"; g.beginPath(); g.moveTo(i * 8, ch); g.lineTo(i * 8 + 4, 0); g.lineTo(i * 8 + 12, 0); g.lineTo(i * 8 + 8, ch); g.fill(); } }),
  });
  gapMids = GAPS.map(([a, b]) => frameAt((a + b) / 2).p);
  GAPS.forEach(([a, b]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(46, b - a + 26), water);
    w.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group(); holder.add(w); place(holder, (a + b) / 2, 0, 0.05); world.add(holder);
    [[a - 0.2, H(a)], [b + 0.2, H(b)]].forEach(([s, h]) => { const sg = box(ROAD_W + 3.2, 0.5, 0.3, hazard); place(sg, s, 0, h - 0.3); world.add(sg); });
  });
  // الأرض
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), mat(th.ground));
  ground.rotation.x = -Math.PI / 2; ground.position.set(mid.x, 0, mid.z);
  world.add(ground);
  // خط البداية + بوابة «سباق كريم»
  const startLine = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 3), new THREE.MeshLambertMaterial({
    map: canvasTex(64, 16, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * 4, y * 4, 4, 4); } }),
  }));
  startLine.rotation.x = -Math.PI / 2;
  const sl = new THREE.Group(); sl.add(startLine); place(sl, 0, 0, 0.08); world.add(sl);
  gate = new THREE.Group();
  {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 192;
    const bannerTex = new THREE.CanvasTexture(c); bannerTex.colorSpace = THREE.SRGBColorSpace; bannerTex.anisotropy = texAniso;
    const draw = () => {
      const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, "#1d4ed8"); gr.addColorStop(1, "#1e3a8a");
      g.fillStyle = gr; g.fillRect(0, 0, 1024, 192);
      for (let x = 0; x < 1024; x += 32) for (let y = 0; y < 2; y++) { g.fillStyle = (x / 32 + y) % 2 ? "#111" : "#fff"; g.fillRect(x, y * 16, 32, 16); g.fillRect(x, 160 + y * 16, 32, 16); }
      g.direction = "rtl"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = '800 104px Baloo, "Noto Sans Arabic", Tahoma, sans-serif';
      g.lineWidth = 10; g.strokeStyle = "#0b1d4d"; g.strokeText("سباق كريم", 512, 100);
      g.fillStyle = "#fde047"; g.fillText("سباق كريم", 512, 100);
      bannerTex.needsUpdate = true;
    };
    draw();
    if (document.fonts) document.fonts.load("800 104px Baloo").then(draw, () => {});
    const banner = new THREE.MeshLambertMaterial({ map: bannerTex }), side = mat("#1e3a8a");
    const W = ROAD_W + 5;
    const b = box(W, 2.7, 0.5, [side, side, side, side, banner, banner]); b.position.y = 9.6; gate.add(b);
    const pm = new THREE.MeshPhongMaterial({ color: "#e5e7eb", shininess: 60 });
    [-W / 2 + 0.4, W / 2 - 0.4].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 11, 12), pm); p.position.set(x, 5.5, 0); gate.add(p); });
  }
  place(gate, 2, 0); world.add(gate);

  // نباتات حسب الخريطة: أشجار، صبار، أو صنوبر عليه ثلج
  const spread = (k) => [bb.min.x - 150 + rnd() * (size.x + 300), bb.min.z - 150 + rnd() * (size.z + 300)];
  const okSpot = (x, z) => !nearRoad(x, z, 6) && !gapMids.some((m) => Math.hypot(m.x - x, m.z - z) < 34);
  const A = { trunk: [], cone: [], ball: [], flower: [], snowcap: [], arm: [] };
  const treeCols = ["#16a34a", "#22c55e", "#15803d", "#65a30d"], flowerCols = ["#f43f5e", "#facc15", "#ffffff", "#a855f7", "#fb923c"];
  for (let k = 0; k < 280; k++) {
    const [x, z] = spread(k);
    if (!okSpot(x, z)) continue;
    const h = 5 + rnd() * 6;
    if (th.trees === "cactus") {
      if (rnd() < 0.6) {
        A.trunk.push([x, h * 0.4, z, 0.9, h * 0.8, 0.9, 0, "#3f8f3a"]);
        [-1, 1].forEach((sd) => { if (rnd() < 0.75) { const ay = h * (0.35 + rnd() * 0.25); A.arm.push([x + sd * 1.0, ay, z, 0.55, 0.3, 0.55, 0, "#3f8f3a", 0, sd * Math.PI / 2]); A.trunk.push([x + sd * 1.6, ay + 0.9, z, 0.55, 1.8 / 1, 0.55, 0, "#46a040"]); } });
      } else A.ball.push([x, 0.6, z, 1.6 + rnd(), 0.9, 1.6 + rnd(), 0, ["#a68a4a", "#8f7a3e", "#b59a58"][k % 3]]);
    } else if (th.trees === "pine") {
      A.trunk.push([x, h * 0.15, z, 0.7, h * 0.3, 0.7, 0, "#6b4423"]);
      A.cone.push([x, h * 0.6, z, h * 0.38, h * 0.9, h * 0.38, rnd() * 3, ["#1f5f3a", "#25704a", "#1a5233"][k % 3]]);
      A.snowcap.push([x, h * 0.92, z, h * 0.2, h * 0.32, h * 0.2, rnd() * 3, "#ffffff"]);
    } else if (rnd() < 0.75) {
      A.trunk.push([x, h * 0.2, z, 1, h * 0.4, 1, 0, "#92400e"]);
      if (rnd() < 0.5) A.cone.push([x, h * 0.6, z, h * 0.35, h * 0.8, h * 0.35, rnd() * 3, treeCols[k % 4]]);
      else A.ball.push([x, h * 0.6, z, h * 0.35, h * 0.35, h * 0.35, rnd() * 3, treeCols[k % 4]]);
    } else for (let j = 0; j < 5; j++) A.flower.push([x + rnd() * 4 - 2, 0.4, z + rnd() * 4 - 2, 0.5, 0.5, 0.5, 0, flowerCols[(k + j) % 5]]);
  }
  const vc = () => new THREE.MeshLambertMaterial({ color: "#ffffff" });
  instanced(new THREE.CylinderGeometry(0.5, 0.65, 1, 7), vc(), A.trunk);
  instanced(new THREE.CylinderGeometry(0.5, 0.5, 1, 7), vc(), A.arm);
  instanced(new THREE.ConeGeometry(1, 1, 7), vc(), A.cone);
  instanced(new THREE.ConeGeometry(1, 1, 7), vc(), A.snowcap);
  instanced(new THREE.SphereGeometry(0.85, 8, 6), vc(), A.ball);
  instanced(new THREE.SphereGeometry(1, 6, 4), vc(), A.flower);
  // جبال بعيدة
  const hills = [], R = Math.max(size.x, size.z) / 2 + 190;
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2, r = R + rnd() * 40, hw = 50 + rnd() * 40, hh = 70 + rnd() * 70;
    hills.push([mid.x + Math.cos(a) * r, hh / 2 - 5, mid.z + Math.sin(a) * r, hw, hh, hw, rnd() * 3, th.hills[k % 2]]);
    if (MAP.th.snow || MAP.th.trees === "green") hills.push([mid.x + Math.cos(a) * r, hh - 5 - hh * 0.14, mid.z + Math.sin(a) * r, hw * 0.3, hh * 0.3, hw * 0.3, 0, "#f8fbff"]);
  }
  instanced(new THREE.ConeGeometry(1, 1, 6), new THREE.MeshLambertMaterial({ color: "#ffffff" }), hills);
  // غيوم (رسمة واحدة تتحرك ببطء)
  const cl = [];
  for (let k = 0; k < 18; k++) {
    const cx = mid.x - 320 + rnd() * 640, cy = 55 + rnd() * 30, cz = mid.z - 260 + rnd() * 520;
    for (let j = 0; j < 4; j++) { const r = 5 + rnd() * 4; cl.push([cx + j * 6 - 9, cy + rnd() * 2, cz + rnd() * 4, r, r, r, 0]); }
  }
  clouds = instanced(new THREE.SphereGeometry(1, 8, 6), mat("#ffffff"), cl);
  clouds.userData = { list: cl, minX: mid.x - 340, maxX: mid.x + 340 };
  // ثلج يتساقط حول الكاميرا
  snowFx = null;
  if (th.snow) {
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = rnd() * 120 - 60; pos[i * 3 + 1] = rnd() * 40; pos[i * 3 + 2] = rnd() * 120 - 60; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    snowFx = new THREE.Points(g, new THREE.PointsMaterial({ color: "#ffffff", size: 0.35, transparent: true, opacity: 0.9, depthWrite: false }));
    world.add(snowFx);
  }
  // النجوم ومنصات التوربو
  stars = [];
  const starMat = new THREE.MeshLambertMaterial({ color: "#fde047", emissive: "#a16207" });
  for (let s = 60; s < L - 20; s += 34) {
    const m = new THREE.Mesh(starGeo, starMat);
    world.add(m);
    stars.push({ m, s, x: [-4.5, 0, 4.5][Math.floor(rnd() * 3)], taken: false });
  }
  pads = [];
  const padMat = new THREE.MeshBasicMaterial({
    transparent: true,
    map: canvasTex(64, 64, (g) => {
      const gr = g.createLinearGradient(0, 0, 64, 0);
      ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7"].forEach((c, i) => gr.addColorStop(i / 5, c));
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      g.fillStyle = "#fff";
      for (const y of [10, 34]) { g.beginPath(); g.moveTo(16, y + 18); g.lineTo(32, y); g.lineTo(48, y + 18); g.lineTo(40, y + 18); g.lineTo(32, y + 9); g.lineTo(24, y + 18); g.fill(); }
    }),
  });
  for (const s of MAP.pads) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), padMat);
    m.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group(); holder.add(m);
    const x = (rnd() - 0.5) * 6;
    place(holder, s, x, H(s) + 0.09);
    holder.rotation.y += Math.PI;
    world.add(holder);
    pads.push({ s, x });
  }
}

// ------------------------------------------------------------------ القنابل (تجنّبها! لمسها يُنقص النجوم)
let bombs = [], bombGroup = null;
const fxList = [];
function buildBombs(count) {
  if (bombGroup) { scene.remove(bombGroup); bombGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  bombGroup = new THREE.Group(); scene.add(bombGroup); bombs = [];
  const body = new THREE.MeshPhongMaterial({ color: "#1b1d22", specular: "#ffffff", shininess: 90 });
  const capM = new THREE.MeshPhongMaterial({ color: "#8b8f97", shininess: 60 });
  const fuseM = new THREE.MeshLambertMaterial({ color: "#c9a26b" });
  const sparkM = new THREE.MeshBasicMaterial({ color: "#ffd23f" });
  const ringM = new THREE.MeshBasicMaterial({ color: "#ff2b2b", transparent: true, opacity: 0.55, depthWrite: false });
  const sphere = new THREE.SphereGeometry(0.85, 16, 12), cap = new THREE.CylinderGeometry(0.28, 0.32, 0.25, 12), fuse = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6), spark = new THREE.SphereGeometry(0.17, 8, 6), ring = new THREE.RingGeometry(1.15, 1.5, 24);
  // أماكن مستوية فقط (ليست على الجسور أو قرب منصات التوربو)، ثم توزيع متساوٍ عليها
  const spots = [];
  for (let s = 90; s < L - 40; s += 5) if (H(s) < 0.05 && H(s - 12) < 0.05 && H(s + 12) < 0.05 && !MAP.pads.some((p) => Math.abs(p - s) < 14)) spots.push(s);
  for (let i = 0; i < count && spots.length; i++) {
    const s = spots[Math.min(spots.length - 1, Math.floor((spots.length * (i + 0.25 + rnd() * 0.5)) / count))];
    const x = [-4.5, 0, 4.5][Math.floor(rnd() * 3)];
    const g = new THREE.Group();
    const b = new THREE.Mesh(sphere, body); b.position.y = 0.85; g.add(b);
    const c = new THREE.Mesh(cap, capM); c.position.y = 1.72; g.add(c);
    const f = new THREE.Mesh(fuse, fuseM); f.position.set(0.12, 2.0, 0); f.rotation.z = -0.4; g.add(f);
    const sp = new THREE.Mesh(spark, sparkM); sp.position.set(0.24, 2.28, 0); g.add(sp);
    const rg = new THREE.Mesh(ring, ringM); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.1; g.add(rg);
    place(g, s, x, H(s));
    bombGroup.add(g);
    bombs.push({ g, sp, s, x, off: 0 });
  }
}
function boomFx(pos) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: "#ff8a1f", transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.copy(pos); m.position.y += 1; scene.add(m);
  const m2 = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshLambertMaterial({ color: "#555", transparent: true, opacity: 0.7, depthWrite: false }));
  m2.position.copy(m.position); scene.add(m2);
  fxList.push({ m, m2, t: 0 });
}
function updateFx(dt) {
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i]; f.t += dt;
    const u = f.t / 0.8;
    f.m.scale.setScalar(1 + u * 3.5); f.m.material.opacity = Math.max(0, 0.95 * (1 - u * 1.4));
    f.m2.scale.setScalar(1 + u * 3); f.m2.position.y += dt * 3; f.m2.material.opacity = Math.max(0, 0.6 * (1 - u));
    if (u >= 1) { [f.m, f.m2].forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); fxList.splice(i, 1); }
  }
}

// ------------------------------------------------------------------ المركبات (نماذج أقرب للحقيقة)
// انعكاس بسيط للسماء والأرض على الطلاء والزجاج (مكعّب صغير مرسوم مرة واحدة — خفيف على الجهاز)
const envMap = (() => {
  const face = (top, mid, bot) => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, top); gr.addColorStop(0.5, mid); gr.addColorStop(0.56, bot); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  };
  const side = () => face("#7fc0ff", "#f4fbff", "#6b726e");
  const t = new THREE.CubeTexture([side(), side(), face("#4aa3ff", "#4aa3ff", "#4aa3ff"), face("#5a605c", "#5a605c", "#5a605c"), side(), side()]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
})();
const matCache = {};
const cached = (k, f) => matCache[k] || (matCache[k] = f());
const paint = (c) => cached("p" + c, () => new THREE.MeshPhongMaterial({ color: c, specular: "#ffffff", shininess: 90, envMap, reflectivity: 0.1, combine: THREE.MixOperation }));
const M = {
  glass: () => cached("glass", () => new THREE.MeshPhongMaterial({ color: "#1a2433", specular: "#ffffff", shininess: 120, envMap, reflectivity: 0.32, combine: THREE.MixOperation })),
  chrome: () => cached("chrome", () => new THREE.MeshPhongMaterial({ color: "#c7ccd3", specular: "#ffffff", shininess: 100, envMap, reflectivity: 0.6, combine: THREE.MixOperation })),
  black: () => cached("black", () => new THREE.MeshPhongMaterial({ color: "#1c1f24", specular: "#333333", shininess: 30 })),
  grey: () => cached("grey", () => new THREE.MeshPhongMaterial({ color: "#4b5260", specular: "#555555", shininess: 40 })),
  white: () => cached("white", () => new THREE.MeshPhongMaterial({ color: "#f3f5f8", specular: "#ffffff", shininess: 60, envMap, reflectivity: 0.12, combine: THREE.MixOperation })),
  head: () => cached("head", () => new THREE.MeshBasicMaterial({ color: "#fffbe8" })),
  tail: () => cached("tail", () => new THREE.MeshBasicMaterial({ color: "#ff1f1f" })),
  amber: () => cached("amber", () => new THREE.MeshBasicMaterial({ color: "#ffa21a" })),
};
const tex = (k, w, h, draw) => cached("t" + k, () => { const t = canvasTex(w, h, draw); t.colorSpace = THREE.SRGBColorSpace; return t; });
const texMat = (k, w, h, draw) => cached("m" + k, () => new THREE.MeshPhongMaterial({ map: tex(k, w, h, draw), shininess: 30 }));
// شبك أمامي بقضبان أفقية
const grille = () => texMat("grille", 64, 32, (g, w, h) => {
  g.fillStyle = "#15181d"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#9aa1ab"; for (let y = 3; y < h; y += 6) g.fillRect(2, y, w - 4, 2);
  g.strokeStyle = "#c7ccd3"; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
});
// وجه الإطار: مطاط أسود وجنط فضي بأذرع
function rimMat(kind) {
  return cached("rim" + kind, () => {
    const t = tex("rim" + kind, 128, 128, (g, w) => {
      const c = w / 2;
      g.fillStyle = "#16181c"; g.fillRect(0, 0, w, w);
      g.strokeStyle = "#2a2d33"; g.lineWidth = 4; g.beginPath(); g.arc(c, c, c * 0.92, 0, 7); g.stroke();
      const rr = kind === "sport" ? 0.66 : 0.58;
      const gr = g.createRadialGradient(c, c, 4, c, c, c * rr);
      gr.addColorStop(0, "#f2f4f7"); gr.addColorStop(0.85, "#b9bfc8"); gr.addColorStop(1, "#7d838c");
      g.fillStyle = gr; g.beginPath(); g.arc(c, c, c * rr, 0, 7); g.fill();
      if (kind === "sport") { // جنط رياضي بخمسة أذرع
        g.fillStyle = "#2b2f36";
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
          g.beginPath(); g.moveTo(c + Math.cos(a - 0.17) * c * 0.2, c + Math.sin(a - 0.17) * c * 0.2);
          g.arc(c, c, c * 0.6, a - 0.45, a + 0.45); g.lineTo(c + Math.cos(a + 0.17) * c * 0.2, c + Math.sin(a + 0.17) * c * 0.2); g.fill();
        }
      } else { // جنط شاحنة بثقوب
        g.fillStyle = "#3a3f47";
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.4, c + Math.sin(a) * c * 0.4, c * 0.07, 0, 7); g.fill(); }
        g.strokeStyle = "#8b9099"; g.lineWidth = 3; g.beginPath(); g.arc(c, c, c * 0.25, 0, 7); g.stroke();
      }
      g.fillStyle = "#d9dde3"; g.beginPath(); g.arc(c, c, c * 0.12, 0, 7); g.fill();
    });
    return new THREE.MeshPhongMaterial({ map: t, specular: "#888888", shininess: 70 });
  });
}
const tyreSide = () => cached("tyre", () => new THREE.MeshPhongMaterial({
  map: tex("tread", 16, 64, (g, w, h) => { g.fillStyle = "#1d1f23"; g.fillRect(0, 0, w, h); g.fillStyle = "#0f1013"; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 3); }),
  shininess: 8,
}));
function wheel(r, w, kind = "truck") {
  // مجسم واحد لكل إطار (المطاط على المحيط والجنط مرسوم على الوجهين) ليبقى خفيفاً
  const geo = new THREE.CylinderGeometry(r, r, w, 18);
  const m = new THREE.Mesh(geo, [tyreSide(), rimMat(kind), rimMat(kind)]);
  m.rotation.z = Math.PI / 2;
  const g = new THREE.Group(); g.add(m);
  return g;
}
// جسم ناعم: رسم جانبي (z للأمام، y للأعلى) يُبثق بعرض w مع حواف مدوّرة
function profile(pts, w, material, bev = 0.07, squeeze = null) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => {
    if (p.arch) { const [cz, cy, r] = p.arch; s.lineTo(cz - r, cy); s.absarc(cz, cy, r, Math.PI, 0, true); }
    else if (i === 0) s.moveTo(p[0], p[1]); else s.lineTo(p[0], p[1]);
  });
  const geo = new THREE.ExtrudeGeometry(s, { depth: w - bev * 2, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 7 });
  geo.translate(0, 0, -(w - bev * 2) / 2);
  geo.rotateY(-Math.PI / 2);
  if (squeeze) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * squeeze(p.getZ(i), p.getY(i)));
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}
const part = (g, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };
const shadowMat = () => cached("shadow", () => new THREE.MeshBasicMaterial({
  transparent: true, depthWrite: false,
  map: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
}));
function lamps(g, z, y, x, w, h, front) {
  const d = front ? 1 : -1;
  [-x, x].forEach((lx) => part(g, box(w, h, 0.06, front ? M.head() : M.tail()), lx, y, z + d * 0.02));
}
// كابينة شاحنة: زجاج أمامي مائل ونوافذ جانبية ومرايا وشبك ومصابيح
function truckCab(g, body, front, back, floor, top, wr, wz, W) {
  const slope = 0.28;
  part(g, profile([[back, floor], [wz - wr - 0.08, floor], { arch: [wz, floor, wr + 0.08] }, [front, floor], [front, floor + 0.95], [front - slope, top - 0.12], [front - slope - 0.12, top], [back, top]], W, body, 0.1));
  const gl = part(g, box(W - 0.35, (top - floor - 1.05), 0.05, M.glass()), 0, (floor + 0.95 + top) / 2 - 0.02, front - slope / 2 + 0.06);
  gl.rotation.x = -Math.atan2(slope, top - floor - 0.95);
  part(g, box(W + 0.02, 0.62, 0.85, M.glass()), 0, top - 0.48, front - slope - 0.62);
  part(g, box(W - 0.6, 0.55, 0.06, grille()), 0, floor + 0.55, front + 0.07);
  lamps(g, front + 0.05, floor + 0.55, W / 2 - 0.22, 0.34, 0.24, true);
  [-1, 1].forEach((sx) => part(g, box(0.06, 0.18, 0.18, M.amber()), sx * (W / 2 + 0.06), floor + 0.55, front - 0.15));
  part(g, box(W + 0.1, 0.28, 0.3, M.grey()), 0, floor + 0.1, front + 0.1);
  [-1, 1].forEach((sx) => {
    part(g, box(0.35, 0.05, 0.05, M.black()), sx * (W / 2 + 0.15), top - 0.45, front - 0.35);
    part(g, box(0.08, 0.5, 0.28, M.black()), sx * (W / 2 + 0.33), top - 0.45, front - 0.35);
  });
}
// جسم منحوت: مقاطع عرضية ناعمة على طول السيارة (z)، كل مقطع شكل بيضاوي مربّع
// st: قائمة [z, نصف العرض, أسفل, أعلى]؛ n: حدّة الزوايا؛ tuck: تضييق الجزء العلوي؛ th: مدى الزاوية (للأسطح الجزئية)
function loft(st, material, { n = 3, tuck = 0.2, M = 22, th = [0, Math.PI * 2], cap = true, grow = 0 } = {}) {
  const pos = [], idx = [];
  const ring = th[1] - th[0] >= Math.PI * 2 - 1e-6;
  const cols = ring ? M : M + 1;
  st.forEach(([z, w, b, t]) => {
    const my = (b + t) / 2, hy = (t - b) / 2 + grow;
    for (let j = 0; j < cols; j++) {
      const a = th[0] + ((th[1] - th[0]) * j) / M, c = Math.cos(a), sn = Math.sin(a);
      const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n), py = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      const tk = py > 0 ? 1 - tuck * py * py : 1;
      pos.push(px * (w + grow) * tk, my + py * hy, z);
    }
  });
  for (let i = 0; i < st.length - 1; i++)
    for (let j = 0; j < (ring ? M : M); j++) {
      const a = i * cols + j, b2 = i * cols + ((j + 1) % cols), c = a + cols, d = b2 + cols;
      idx.push(a, c, b2, b2, c, d);
    }
  if (cap && ring) [0, st.length - 1].forEach((i, k) => {
    const ci = pos.length / 3, [z, , b, t] = st[i];
    pos.push(0, (b + t) / 2, z);
    for (let j = 0; j < M; j++) { const a = i * cols + j, b2 = i * cols + ((j + 1) % M); k ? idx.push(ci, b2, a) : idx.push(ci, a, b2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  if (!ring) m.material.side = THREE.DoubleSide;
  return m;
}
// يبني محطات المقاطع من دوال، مع قوس فوق كل عجلة
function stations(z0, z1, count, wF, tF, arches, base = 0.3) {
  const out = [];
  for (let i = 0; i <= count; i++) {
    const u = i / count, z = z0 + (z1 - z0) * (0.5 - 0.5 * Math.cos(u * Math.PI)); // كثافة أعلى عند الأطراف
    let b = base;
    for (const [zc, cy, r] of arches) { const dz = z - zc; if (Math.abs(dz) < r) b = Math.max(b, cy + Math.sqrt(r * r - dz * dz)); }
    const e = Math.min(1, Math.min(z - z0, z1 - z) / 0.22), round = Math.sqrt(Math.max(0.02, e * (2 - e)));
    const t = tF(z), w = wF(z) * (0.82 + 0.18 * round);
    const mid = (b + t) / 2, hh = ((t - b) / 2) * (0.75 + 0.25 * round);
    out.push([z, w, mid - hh, mid + hh]);
  }
  return out;
}
const lerpTab = (tab) => (z) => {
  if (z <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (z <= tab[i][0]) { const [z0, v0] = tab[i - 1], [z1, v1] = tab[i], u = (z - z0) / (z1 - z0); return v0 + (v1 - v0) * (u * u * (3 - 2 * u)); }
  return tab[tab.length - 1][1];
};
const flameMat = () => cached("flame", () => new THREE.MeshBasicMaterial({ color: "#3d9bff", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
const flameCore = () => cached("flameCore", () => new THREE.MeshBasicMaterial({ color: "#d9f1ff", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
const flameGeo = (() => { const g = new THREE.ConeGeometry(0.16, 1, 10, 1, true); g.translate(0, 0.5, 0); g.rotateX(-Math.PI / 2); return g; })();
function addFlames(g, list) {
  g.userData.flames = list.map(([x, y, z]) => {
    const f = new THREE.Group();
    f.add(new THREE.Mesh(flameGeo, flameMat()));
    const core = new THREE.Mesh(flameGeo, flameCore()); core.scale.set(0.35, 0.35, 0.5); f.add(core);
    f.position.set(x, y, z); f.visible = false; g.add(f); return f;
  });
}
// أضواء طوارئ وامضة (شرطة وإطفاء)
function siren(g, list) {
  g.userData.siren = list.map(([x, y, z, red]) => part(g, box(0.34, 0.16, 0.26, cached(red ? "sirR" : "sirB", () => new THREE.MeshBasicMaterial({ color: red ? "#ff2020" : "#1f6bff" }))), x, y, z));
}
function makeVehicle(type, color) {
  const g = new THREE.Group(), wheels = [];
  const body = paint(color);
  const addWheels = (list, r, w, kind) => list.forEach(([x, z]) => { const wh = wheel(r, w, kind); wh.position.set(x, r, z); g.add(wh); wheels.push(wh); });
  let shadowL = 5.2, shadowW = 3;
  if (type === "car") {
    // سيارة خارقة منحوتة: مقدمة منخفضة جداً، أكتاف خلفية عريضة، وكابينة زجاجية على شكل قطرة
    const wr = 0.44, arches = [[-1.45, 0.3, 0.56], [1.45, 0.3, 0.54]];
    const W = lerpTab([[-2.45, 1.02], [-1.45, 1.13], [-0.4, 1.02], [0.6, 1.0], [1.45, 1.06], [2.45, 0.86]]);
    const T = lerpTab([[-2.45, 0.98], [-1.6, 1.0], [-0.6, 0.93], [0.6, 0.84], [1.45, 0.78], [2.1, 0.62], [2.45, 0.5]]);
    part(g, loft(stations(-2.45, 2.45, 30, W, T, arches), body, { n: 3.2, tuck: 0.22, M: 26 }));
    // الكابينة الزجاجية والسقف بلون السيارة
    const cab = stations(-1.95, 0.95, 14, lerpTab([[-1.95, 0.7], [-0.6, 0.86], [0.95, 0.8]]), lerpTab([[-1.95, 1.0], [-0.9, 1.33], [-0.2, 1.37], [0.95, 0.86]]), [], 0.8);
    part(g, loft(cab, M.glass(), { n: 2.6, tuck: 0.38, M: 22 }));
    const roof = cab.filter(([z]) => z > -1.05 && z < -0.05);
    part(g, loft(roof, body, { n: 2.6, tuck: 0.38, M: 12, th: [0.85, Math.PI - 0.85], cap: false, grow: 0.012 }));
    // فتحات هواء جانبية
    [-1, 1].forEach((sx) => { const v = part(g, box(0.04, 0.2, 0.7, M.black()), sx * 1.06, 0.66, -0.75); v.rotation.y = sx * 0.1; });
    // المقدمة: شبك منخفض ومصابيح مائلة
    part(g, box(1.2, 0.1, 0.12, grille()), 0, 0.36, 2.4);
    [-1, 1].forEach((sx) => { const l = part(g, box(0.36, 0.05, 0.3, M.head()), sx * 0.46, 0.5, 2.12); l.rotation.set(-0.42, sx * -0.3, 0); });
    // الخلف: لوحة سوداء وأضواء دائرية مزدوجة وعوادم
    part(g, box(1.55, 0.36, 0.06, M.black()), 0, 0.72, -2.44);
    const ring = cached("ringGeo", () => new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16));
    [-0.72, -0.44, 0.44, 0.72].forEach((x) => { const t = part(g, new THREE.Mesh(ring, M.tail()), x, 0.76, -2.47); t.rotation.x = Math.PI / 2; });
    part(g, box(1.6, 0.18, 0.2, M.black()), 0, 0.34, -2.32);
    [-0.3, -0.12, 0.12, 0.3].forEach((x) => { const e = part(g, new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.18, 10), M.chrome()), x, 0.36, -2.45); e.rotation.x = Math.PI / 2; });
    addFlames(g, [[-0.21, 0.36, -2.52], [0.21, 0.36, -2.52]]);
    // جناح خلفي صغير ومرايا
    part(g, box(1.6, 0.05, 0.3, body), 0, 1.1, -2.2);
    [-1, 1].forEach((sx) => { part(g, box(0.22, 0.04, 0.05, M.black()), sx * 0.86, 0.95, 0.55); part(g, box(0.1, 0.13, 0.22, body), sx * 0.99, 0.99, 0.52); });
    addWheels([[-1.0, 1.45], [1.0, 1.45], [-1.03, -1.45], [1.03, -1.45]], wr, 0.46, "sport");
    shadowL = 5.6; shadowW = 3;
  } else if (type === "coupe" || type === "police") {
    // سيارة عادية أنيقة: غطاء محرك أطول وكابينة أعلى
    const arches = [[-1.35, 0.3, 0.52], [1.35, 0.3, 0.52]];
    const W = lerpTab([[-2.25, 0.96], [-1.35, 1.02], [0, 0.98], [1.35, 1.0], [2.3, 0.9]]);
    const T = lerpTab([[-2.25, 0.95], [-1.4, 1.0], [0.5, 0.95], [1.6, 0.86], [2.3, 0.66]]);
    part(g, loft(stations(-2.25, 2.3, 26, W, T, arches), body, { n: 3.4, tuck: 0.2, M: 24 }));
    const cab = stations(-1.65, 0.75, 12, lerpTab([[-1.65, 0.78], [-0.5, 0.86], [0.75, 0.82]]), lerpTab([[-1.65, 1.0], [-1.15, 1.5], [-0.1, 1.55], [0.75, 0.95]]), [], 0.85);
    part(g, loft(cab, M.glass(), { n: 3, tuck: 0.3, M: 22 }));
    part(g, loft(cab.filter(([z]) => z > -1.2 && z < -0.05), body, { n: 3, tuck: 0.3, M: 12, th: [0.85, Math.PI - 0.85], cap: false, grow: 0.012 }));
    part(g, box(1.3, 0.22, 0.08, grille()), 0, 0.5, 2.28);
    [-1, 1].forEach((sx) => { const l = part(g, box(0.4, 0.1, 0.2, M.head()), sx * 0.5, 0.56, 2.2); l.rotation.x = -0.5; });
    [-1, 1].forEach((sx) => part(g, box(0.5, 0.16, 0.06, M.tail()), sx * 0.6, 0.86, -2.27));
    part(g, box(1.7, 0.2, 0.14, M.black()), 0, 0.42, -2.22);
    part(g, box(0.5, 0.16, 0.03, M.white()), 0, 0.62, -2.28);
    addFlames(g, [[-0.5, 0.36, -2.3]]);
    [-1, 1].forEach((sx) => part(g, box(0.1, 0.13, 0.22, body), sx * 0.98, 1.05, 0.6));
    addWheels([[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]], 0.44, 0.42, "sport");
    if (type === "police") {
      // شريط أبيض على الجانبين وأضواء حمراء وزرقاء فوق السقف
      [-1, 1].forEach((sx) => { const st = part(g, box(0.04, 0.24, 2.6, M.white()), sx * 1.0, 0.72, 0); st.rotation.z = sx * 0.12; });
      part(g, box(1.15, 0.1, 0.32, M.black()), 0, 1.6, -0.62);
      siren(g, [[-0.32, 1.7, -0.62, true], [0.32, 1.7, -0.62, false]]);
    }
    shadowL = 5.4; shadowW = 2.9;
  } else if (type === "jeep") {
    // سيارة دفع رباعي: عالية عن الأرض، جسم مربّع بحواف ناعمة، وعجلة احتياط في الخلف
    const arches = [[-1.45, 0.52, 0.66], [1.45, 0.52, 0.66]];
    part(g, loft(stations(-2.3, 2.35, 22, lerpTab([[-2.3, 1.08], [0, 1.12], [2.35, 1.05]]), lerpTab([[-2.3, 1.3], [1.2, 1.25], [2.0, 1.15], [2.35, 0.98]]), arches, 0.5), body, { n: 5, tuck: 0.1, M: 24 }));
    const cab = stations(-2.15, 0.85, 12, lerpTab([[-2.15, 1.0], [0.85, 0.98]]), lerpTab([[-2.15, 2.1], [0.2, 2.12], [0.85, 1.3]]), [], 1.2);
    part(g, loft(cab, M.glass(), { n: 5, tuck: 0.12, M: 22 }));
    part(g, loft(cab.filter(([z]) => z > -2.05 && z < 0.15), body, { n: 5, tuck: 0.12, M: 12, th: [0.7, Math.PI - 0.7], cap: false, grow: 0.015 }));
    [-0.55, 0.55].forEach((x) => part(g, box(0.07, 0.08, 2.3, M.black()), x, 2.2, -0.95));
    part(g, box(1.9, 0.3, 0.06, grille()), 0, 0.95, 2.37);
    [-1, 1].forEach((sx) => part(g, new THREE.Mesh(cached("jeepLamp", () => new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14)), M.head()), sx * 0.72, 1.0, 2.37).rotation.x = Math.PI / 2);
    part(g, box(2.3, 0.3, 0.3, M.black()), 0, 0.62, 2.4);
    part(g, box(2.3, 0.3, 0.3, M.black()), 0, 0.62, -2.35);
    [-1, 1].forEach((sx) => part(g, box(0.18, 0.4, 0.06, M.tail()), sx * 0.98, 1.05, -2.33));
    const spare = wheel(0.5, 0.32, "truck"); spare.rotation.y = Math.PI / 2; part(g, spare, 0, 1.25, -2.52);
    addFlames(g, [[0.6, 0.55, -2.45]]);
    [-1, 1].forEach((sx) => part(g, box(0.1, 0.16, 0.26, M.black()), sx * 1.1, 1.55, 0.75));
    addWheels([[-1.05, 1.45], [1.05, 1.45], [-1.05, -1.45], [1.05, -1.45]], 0.56, 0.52, "truck");
    shadowL = 5.6; shadowW = 3.2;
  } else if (type === "fire") {
    // سيارة إطفاء: كابينة بأضواء وامضة، وصندوق بأبواب معدات، وسلّم فوقه
    const W = 2.45;
    part(g, box(1.6, 0.32, 6.4, M.black()), 0, 0.8, -0.8);
    truckCab(g, body, 3.0, 1.2, 0.7, 2.9, 0.62, 2.1, W);
    siren(g, [[-0.6, 3.0, 1.9, true], [0.6, 3.0, 1.9, true], [0, 3.0, 1.9, false]]);
    part(g, profile([[-4.05, 1.0], [1.05, 1.0], [1.05, 2.75], [-4.05, 2.75]], 2.5, body, 0.07));
    const doorsTex = texMat("fireDoors", 128, 32, (c, w, h) => {
      c.fillStyle = "#c3c8cf"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#9aa1ab"; for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 2, h);
      c.fillStyle = "#adb3bb"; for (let y = 3; y < h; y += 5) c.fillRect(0, y, w, 1);
    });
    [-1, 1].forEach((sx) => { part(g, box(0.03, 1.1, 4.3, doorsTex), sx * 1.26, 1.85, -1.5); part(g, box(0.03, 0.18, 4.95, M.white()), sx * 1.27, 1.12, -1.5); });
    const ladder = new THREE.MeshPhongMaterial({
      transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, shininess: 80,
      map: tex("ladder", 32, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = "#e5e7eb"; c.fillRect(0, 0, 5, h); c.fillRect(w - 5, 0, 5, h); for (let y = 6; y < h; y += 16) c.fillRect(0, y, w, 4); }),
    });
    const ld = part(g, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 5.4), ladder), 0, 2.98, -1.4); ld.rotation.x = -Math.PI / 2;
    [-0.5, 0.5].forEach((x) => part(g, box(0.08, 0.2, 5.4, M.chrome()), x, 2.92, -1.4));
    part(g, box(2.3, 1.55, 0.04, doorsTex), 0, 1.88, -4.1);
    part(g, box(2.52, 0.18, 0.05, M.white()), 0, 1.12, -4.11);
    lamps(g, -4.14, 1.2, 1.0, 0.26, 0.3, false);
    part(g, box(2.4, 0.22, 0.2, M.grey()), 0, 0.72, -4.1);
    addFlames(g, [[-0.6, 0.65, -4.2], [0.6, 0.65, -4.2]]);
    addWheels([[-1.1, 2.1], [1.1, 2.1], [-1.1, -2.2], [1.1, -2.2], [-1.1, -3.35], [1.1, -3.35]], 0.62, 0.48, "truck");
    shadowL = 8.6; shadowW = 3.3;
  } else if (type === "bus") {
    // حافلة مدينة: جسم طويل بحواف مدوّرة وشريط نوافذ وسقف أبيض
    const L2 = 4.3;
    part(g, loft(stations(-L2, L2, 18, () => 1.28, lerpTab([[-L2, 3.2], [L2 - 0.6, 3.2], [L2, 2.9]]), [[-2.6, 0.35, 0.72], [2.6, 0.35, 0.72]], 0.4), body, { n: 6, tuck: 0.08, M: 24 }));
    part(g, box(2.5, 0.12, 8.2, M.white()), 0, 3.22, 0);
    [-1, 1].forEach((sx) => {
      part(g, box(0.05, 0.95, 7.6, M.glass()), sx * 1.29, 2.35, 0.1);
      for (let z = -3.2; z <= 3.3; z += 1.3) part(g, box(0.07, 0.95, 0.09, M.black()), sx * 1.3, 2.35, z);
    });
    part(g, box(2.3, 1.3, 0.05, M.glass()), 0, 2.25, L2 + 0.02);
    part(g, box(2.1, 0.8, 0.05, M.glass()), 0, 2.4, -L2 - 0.02);
    part(g, box(1.6, 0.3, 0.05, M.black()), 0, 2.95, L2 + 0.03);
    lamps(g, L2 + 0.02, 0.9, 0.85, 0.36, 0.22, true);
    lamps(g, -L2 - 0.03, 0.95, 0.95, 0.24, 0.42, false);
    part(g, box(2.5, 0.25, 0.2, M.grey()), 0, 0.5, L2 + 0.05);
    part(g, box(2.5, 0.25, 0.2, M.grey()), 0, 0.5, -L2 - 0.05);
    addFlames(g, [[0.7, 0.45, -L2 - 0.1]]);
    addWheels([[-1.08, 2.6], [1.08, 2.6], [-1.08, -2.6], [1.08, -2.6]], 0.6, 0.45, "truck");
    shadowL = 9.5; shadowW = 3.3;
  } else if (type === "truck") {
    // شاحنة نقل بصندوق
    const W = 2.4;
    part(g, box(1.6, 0.3, 5.4, M.black()), 0, 0.72, -0.4);
    truckCab(g, body, 2.85, 1.1, 0.62, 2.75, 0.58, 2.0, W);
    part(g, profile([[-3.15, 0.95], [0.95, 0.95], [0.95, 3.35], [-3.15, 3.35]], 2.6, M.white(), 0.08));
    [-1, 1].forEach((sx) => part(g, box(0.02, 0.38, 4.0, body), sx * 1.31, 1.45, -1.1));
    part(g, box(2.4, 2.25, 0.04, texMat("doors", 64, 64, (c, w, h) => {
      c.fillStyle = "#e5e8ec"; c.fillRect(0, 0, w, h); c.fillStyle = "#9aa1ab"; c.fillRect(w / 2 - 1, 0, 2, h);
      c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2); c.fillStyle = "#555b65"; c.fillRect(w / 2 - 8, h / 2 - 6, 3, 12); c.fillRect(w / 2 + 5, h / 2 - 6, 3, 12);
    })), 0, 2.15, -3.25);
    lamps(g, -3.2, 0.82, 1.0, 0.3, 0.2, false);
    part(g, box(2.3, 0.18, 0.15, M.grey()), 0, 0.62, -3.15);
    addWheels([[-1.07, 2.0], [1.07, 2.0], [-1.07, -1.35], [1.07, -1.35], [-1.07, -2.45], [1.07, -2.45]], 0.58, 0.45, "truck");
    addFlames(g, [[-0.6, 0.6, -3.3], [0.6, 0.6, -3.3]]);
    shadowL = 7; shadowW = 3.2;
  } else if (type === "dump") {
    // قلاب: كابينة عالية وصندوق يُرفع من الخلف
    const W = 2.4;
    part(g, box(1.5, 0.35, 5.2, M.black()), 0, 0.95, -0.5);
    truckCab(g, body, 2.95, 1.25, 0.85, 2.9, 0.72, 1.95, W);
    part(g, box(0.5, 0.9, 0.5, M.grey()), 0.75, 1.5, 0.95);
    part(g, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 10), M.chrome()), -1.12, 2.5, 1.18);
    const bed = new THREE.Group();
    const bodyBed = (pts, w, x) => part(bed, profile(pts, w, body, 0.05), x, 0, 0);
    part(bed, box(2.5, 0.18, 3.75, M.grey()), 0, 0.09, 1.9);
    [-1, 1].forEach((sx) => bodyBed([[0, 0.1], [3.8, 0.1], [3.85, 1.4], [0.15, 1.15]], 0.12, sx * 1.25));
    bodyBed([[3.65, 0.1], [3.85, 0.1], [4.3, 1.75], [4.1, 1.75]], 2.62, 0);
    part(bed, box(2.5, 1.0, 0.12, body), 0, 0.6, 0.0);
    [0.8, 1.6, 2.4, 3.2].forEach((z) => [-1, 1].forEach((sx) => part(bed, box(0.08, 1.0, 0.12, M.grey()), sx * 1.33, 0.7, z)));
    const sand = part(bed, new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), texMat("sand", 64, 64, (c, w, h) => {
      c.fillStyle = "#c89a5b"; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { c.fillStyle = Math.random() < 0.5 ? "#b5874a" : "#dbb173"; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    })), 0, 0.95, 1.95);
    sand.scale.set(1.15, 0.5, 1.7);
    lamps(bed, -0.07, 0.35, 1.0, 0.3, 0.18, false);
    bed.position.set(0, 1.2, -3.0);
    g.add(bed);
    g.userData.bed = bed;
    addWheels([[-1.05, 1.95], [1.05, 1.95], [-1.05, -1.35], [1.05, -1.35], [-1.05, -2.6], [1.05, -2.6]], 0.72, 0.55, "truck");
    addFlames(g, [[-0.5, 0.85, -3.2], [0.5, 0.85, -3.2]]);
    shadowL = 7; shadowW = 3.3;
  } else { // حفارة بجنازير
    const trackSide = cached("trackCap", () => {
      const t = canvasTex(256, 64, (c, w, h) => {
        c.fillStyle = "#23262b"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#3b4048"; c.fillRect(14, 12, w - 28, h - 24);
        c.fillStyle = "#6b7280";
        for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(30 + i * 49, h / 2 + 2, 11, 0, 7); c.fill(); }
        c.fillStyle = "#9ca3af"; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(30 + i * 49, h / 2 + 2, 4, 0, 7); c.fill(); }
      });
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.repeat.set(1 / 4.2, 1 / 0.95); t.offset.set(0.5, 0);
      return new THREE.MeshPhongMaterial({ map: t, shininess: 20 });
    });
    const tread = cached("treadMat", () => new THREE.MeshPhongMaterial({
      map: tex("treadT", 16, 16, (c, w, h) => { c.fillStyle = "#2a2d32"; c.fillRect(0, 0, w, h); c.fillStyle = "#111316"; c.fillRect(0, 0, w, 5); }), shininess: 10,
    }));
    tread.map.repeat.set(6, 6);
    [-1.05, 1.05].forEach((x) => {
      const s = new THREE.Shape();
      s.moveTo(-1.6, 0.0); s.lineTo(1.6, 0.0); s.absarc(1.6, 0.47, 0.47, -Math.PI / 2, Math.PI / 2, false);
      s.lineTo(-1.6, 0.95); s.absarc(-1.6, 0.47, 0.47, Math.PI / 2, Math.PI * 1.5, false);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: false, curveSegments: 8 });
      geo.translate(0, 0, -0.35); geo.rotateY(-Math.PI / 2);
      part(g, new THREE.Mesh(geo, [trackSide, tread]), x, 0, 0);
    });
    part(g, box(1.4, 0.4, 2.6, M.grey()), 0, 0.85, 0);
    part(g, new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.25, 16), M.black()), 0, 1.15, 0);
    // الجسم العلوي مع ثقل موازن مدوّر في الخلف
    const up = new THREE.Shape();
    up.moveTo(-1.15, 1.35); up.lineTo(1.15, 1.35); up.lineTo(1.15, -0.8); up.absarc(0, -0.8, 1.15, 0, Math.PI, true); up.lineTo(-1.15, 1.35);
    const upGeo = new THREE.ExtrudeGeometry(up, { depth: 0.95, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 10 });
    upGeo.rotateX(Math.PI / 2); upGeo.translate(0, 2.25, 0);
    part(g, new THREE.Mesh(upGeo, body), 0, 0, 0);
    part(g, box(0.9, 0.35, 1.2, M.grey()), 0.55, 2.42, -0.95);
    part(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), M.black()), 0.9, 2.75, -0.6);
    part(g, profile([[1.25, 2.25], [1.25, 3.25], [1.05, 3.55], [-0.25, 3.55], [-0.25, 2.25]], 1.0, body, 0.06), -0.6, 0, 0);
    part(g, profile([[1.3, 2.4], [1.3, 3.18], [1.08, 3.45], [-0.15, 3.45], [-0.15, 2.4]], 1.04, M.glass(), 0.04), -0.6, 0, 0);
    part(g, box(0.8, 0.55, 0.04, M.glass()), -0.6, 3.05, -0.29);
    lamps(g, 1.33, 3.3, 0.25, 0.14, 0.1, true);
    g.children[g.children.length - 1].position.x -= 0.6; g.children[g.children.length - 2].position.x -= 0.6;
    const arm = new THREE.Group();
    part(arm, profile([[-0.2, -0.25], [1.4, 0.15], [2.7, -0.1], [2.7, 0.25], [1.4, 0.55], [-0.2, 0.25]], 0.38, body, 0.05), 0, 0, 0);
    const a2 = new THREE.Group(); a2.position.set(0, 0.05, 2.55);
    part(a2, profile([[0, -0.17], [2.0, -0.12], [2.0, 0.12], [0, 0.2]], 0.32, body, 0.04), 0, 0, 0);
    const ram = part(a2, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), M.chrome()), 0, 0.3, 0.9);
    ram.rotation.x = Math.PI / 2;
    part(a2, profile([[0, 0.3], [0.15, -0.35], [0.55, -0.5], [0.85, -0.2], [0.4, 0.35]], 1.05, M.grey(), 0.04), 0, -0.05, 1.85);
    for (let i = 0; i < 4; i++) part(a2, box(0.12, 0.1, 0.22, M.chrome()), -0.39 + i * 0.26, -0.29, 2.78);
    a2.rotation.x = 0.9; arm.add(a2);
    arm.position.set(0.45, 2.15, 0.75); arm.rotation.x = -0.45; g.add(arm);
    g.userData.arm = arm;
    addFlames(g, [[-0.45, 0.5, -2.15], [0.45, 0.5, -2.15]]);
    shadowL = 5.2; shadowW = 3.4;
  }
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(shadowW, shadowL), shadowMat());
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.075; sh.renderOrder = -1;
  g.add(sh);
  g.userData.wheels = wheels;
  return g;
}
// تحرير الأشكال عند إزالة مركبة (المواد مشتركة وتبقى)
function dropVehicle(o) {
  if (!o) return;
  scene.remove(o);
  o.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
}
// ------------------------------------------------------------------ الصوت
let ac = null, engine = null, engineGain = null;
function audio() {
  if (ac) return ac;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    engine = ac.createOscillator(); engine.type = "sawtooth";
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
    engineGain = ac.createGain(); engineGain.gain.value = 0;
    engine.connect(lp).connect(engineGain).connect(ac.destination);
    engine.start();
  } catch { ac = null; }
  return ac;
}
function tone(freq, dur, type = "square", vol = 0.12, when = 0, slide = 0) {
  if (!audio()) return;
  const t0 = ac.currentTime + when;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const sfx = {
  star: () => { tone(880, 0.12, "triangle", 0.15); tone(1320, 0.18, "triangle", 0.15, 0.08); },
  horn: () => { tone(392, 0.32, "square", 0.08); tone(494, 0.32, "square", 0.08); tone(392, 0.25, "square", 0.08, 0.38); tone(494, 0.25, "square", 0.08, 0.38); },
  beep: (hi) => tone(hi ? 880 : 440, hi ? 0.5 : 0.2, "square", 0.1),
  boing: () => tone(300, 0.3, "sine", 0.2, 0, 90),
  turbo: () => tone(200, 0.6, "sawtooth", 0.06, 0, 900),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, "triangle", 0.15, i * 0.16)),
  move: () => tone(660, 0.06, "triangle", 0.08),
  boom: (v = 1) => {
    if (!audio()) return;
    const n = ac.sampleRate * 0.7, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
    const src = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; lp.type = "lowpass"; lp.frequency.value = 700; g.gain.value = 0.5 * v;
    src.connect(lp).connect(g).connect(ac.destination); src.start();
    tone(90, 0.5, "sine", 0.3 * v, 0, 40);
  },
  jump: () => tone(260, 0.45, "sine", 0.18, 0, 780),
  land: () => { tone(110, 0.18, "triangle", 0.22); tone(70, 0.25, "sine", 0.2, 0.03); },
};

// ------------------------------------------------------------------ الإعدادات المختارة (تُحفظ لكل طفل)
const DIFF = [
  { name: "سهل", base: 15, step: 1.0, ahead: 15, aheadPen: -8, behind: -10, behindBoost: 12, boost: 6, bombs: 5, loss: 2 },
  { name: "متوسط", base: 17, step: 1.3, ahead: 25, aheadPen: -6, behind: -12, behindBoost: 12, boost: 8, bombs: 9, loss: 3 },
  { name: "صعب", base: 20, step: 1.4, ahead: 45, aheadPen: -3, behind: -18, behindBoost: 9, boost: 10, bombs: 14, loss: 4 },
];
// [المسافة خلف المركبة، الارتفاع، كم تنظر للأمام، ارتفاع نقطة النظر]
const CAMS = [
  { name: "عالية", v: [10.5, 5.6, 16, 1.2] },
  { name: "قريبة", v: [6.2, 2.75, 24, 0.6] },
  { name: "من الأعلى", v: [3, 21, 9, 0] },
];
const QUAL = [
  { name: "عادية", pr: Math.min(devicePixelRatio, 1.25), an: 4 },
  { name: "عالية", pr: Math.min(2, Math.max(1.5, devicePixelRatio)), an: 8 },
];
const SIZE = { car: 1, coupe: 1.03, police: 1.03, jeep: 1.15, bus: 1.75, truck: 1.4, fire: 1.5, dump: 1.4, digger: 1.3 };
const SAVE_KEY = "karim-race:" + location.pathname;
const set = { v: 0, c: 0, map: 0, diff: 1, cam: 0, q: 0 };
try { Object.assign(set, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch {}
const clampSet = () => { set.v = (set.v | 0) % VEHICLES.length; set.c = (set.c | 0) % COLORS.length; set.map = (set.map | 0) % MAPS.length; set.diff = (set.diff | 0) % DIFF.length; set.cam = (set.cam | 0) % CAMS.length; set.q = (set.q | 0) % QUAL.length; };
clampSet();
const saveSet = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...set, v: selV, c: selC })); } catch {} };
function applyQuality() {
  const q = QUAL[set.q];
  renderer.setPixelRatio(q.pr); renderer.setSize(innerWidth, innerHeight);
  texAniso = q.an; thumbColor = null;
}

// ------------------------------------------------------------------ الحالة
const $ = (id) => document.getElementById(id);
let state = "menu", selV = set.v, selC = set.c, menuRow = 0;
let racers = [], player = null, countdown = 0, starCount = 0, finishOrder = [], endT = 0;
let preview = null;

// صور المركبات في القائمة: تُرسم بنفس النماذج ثلاثية الأبعاد وباللون المختار
const thumbScene = new THREE.Scene();
thumbScene.background = new THREE.Color("#dbeafe");
thumbScene.add(new THREE.HemisphereLight("#ffffff", "#9fb4c9", 1.2));
const thumbSun = new THREE.DirectionalLight("#fff6dd", 1.6); thumbSun.position.set(6, 10, 8); thumbScene.add(thumbSun);
const thumbCam = new THREE.PerspectiveCamera(28, 4 / 3, 0.5, 100);
const thumbs = {}; let thumbColor = null;
function renderThumbs() {
  const TW = 240, TH = 180, pr = renderer.getPixelRatio();
  const cssW = TW / pr, cssH = TH / pr, bufH = renderer.domElement.height;
  const out = document.createElement("canvas"); out.width = TW; out.height = TH;
  const ctx = out.getContext("2d");
  renderer.setScissorTest(true);
  renderer.setViewport(0, 0, cssW, cssH); renderer.setScissor(0, 0, cssW, cssH);
  VEHICLES.forEach((v) => {
    const obj = makeVehicle(v.id, COLORS[selC]);
    thumbScene.add(obj);
    const bb = new THREE.Box3().setFromObject(obj), c = bb.getCenter(new THREE.Vector3()), r = bb.getSize(new THREE.Vector3()).length() / 2;
    const dir = new THREE.Vector3(1.1, 0.6, 1.3).normalize();
    thumbCam.position.copy(c).addScaledVector(dir, r / Math.sin(THREE.MathUtils.degToRad(14)) * 0.62);
    thumbCam.lookAt(c.x, c.y - r * 0.08, c.z);
    renderer.render(thumbScene, thumbCam);
    ctx.drawImage(renderer.domElement, 0, bufH - TH, TW, TH, 0, 0, TW, TH);
    thumbs[v.id] = out.toDataURL("image/jpeg", 0.88);
    thumbScene.remove(obj); obj.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  });
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
  thumbColor = COLORS[selC];
}
function buildCards() {
  $("vehicles").innerHTML = VEHICLES.map((v, i) => `<div class="card ${i === selV ? "sel" : ""}">${thumbs[v.id] ? `<img class="pic" src="${thumbs[v.id]}">` : `<div class="ic">${v.ic}</div>`}${v.name}</div>`).join("");
}
const MENU_ORDER = [2, 3, 4, 5, 0, 1]; // ترتيب الصفوف بالأسهم ↑ ↓
function buildOpts() {
  const rows = [["🗺️", "الخريطة", MAPS[set.map].name], ["🎯", "الصعوبة", DIFF[set.diff].name], ["🎥", "الكاميرا", CAMS[set.cam].name], ["✨", "الدقة", QUAL[set.q].name]];
  $("opts").innerHTML = rows.map(([ic, k, v], i) => `<div class="opt ${menuRow === i + 2 ? "sel" : ""}"><span>${ic} ${k}</span><b>‹ ${v} ›</b></div>`).join("");
}
function buildMenu() {
  buildCards();
  buildOpts();
  $("colors").innerHTML = COLORS.map((c, i) => `<div class="dot ${i === selC ? "sel" : ""}" style="background:${c}"></div>`).join("");
  $("vehicles").classList.toggle("dim", menuRow !== 0);
  $("colors").classList.toggle("dim", menuRow !== 1);
  dropVehicle(preview);
  preview = makeVehicle(VEHICLES[selV].id, COLORS[selC]);
  preview.scale.setScalar(1.6);
  place(preview, 12, 0);
  scene.add(preview);
}

function startRace() {
  dropVehicle(preview); preview = null;
  racers.forEach((r) => dropVehicle(r.obj));
  // ثلاثة منافسين: سيارتان ومركبة ثقيلة
  const me = VEHICLES[selV].id;
  const pick = (list) => list.splice(Math.floor(Math.random() * list.length), 1)[0];
  const cars = ["car", "coupe", "police", "jeep", "bus"].filter((id) => id !== me), heavy = ["truck", "fire", "dump", "digger"].filter((id) => id !== me);
  const others = [pick(cars), pick(cars), pick(heavy)];
  const D = DIFF[set.diff];
  buildBombs(D.bombs);
  saveSet();
  const oc = COLORS.filter((_, i) => i !== selC);
  const grid = [[0, -12], [-4.5, 6], [4.5, 6], [0, -2]];
  racers = [{ type: VEHICLES[selV].id, color: COLORS[selC], me: true }, ...others.map((t, i) => ({ type: t, color: oc[(i * 2 + 1) % oc.length] }))]
    .map((r, i) => {
      const obj = makeVehicle(r.type, r.color);
      scene.add(obj);
      return { ...r, obj, s: grid[i][1], x: grid[i][0], speed: 0, y: 0, air: 0, bump: 0, base: D.base + i * D.step, spin: 0, lane: grid[i][0], laneT: 0, boost: 0, done: false };
    });
  // اللاعب يبدأ في المنتصف الخلفي ليسبق الآخرين
  player = racers[0];
  stars.forEach((st) => { st.taken = false; st.m.visible = true; });
  starCount = 0; finishOrder = []; countdown = 3.999;
  state = "count";
  $("menu").style.display = "none"; $("end").classList.remove("on"); $("hud").classList.add("on");
  audio();
}

function rankOf(r) {
  const order = [...finishOrder, ...racers.filter((o) => !o.done).sort((a, b) => b.s - a.s)];
  return order.indexOf(r) + 1;
}

let bigT = 0;
function showBig(txt, cls = "") {
  const b = $("big"); b.textContent = txt; b.className = "big " + cls; void b.offsetWidth; b.classList.add("show");
  clearTimeout(bigT); bigT = setTimeout(() => b.classList.remove("show"), 950);
}

function finish() {
  state = "end"; endT = 0;
  const rank = finishOrder.indexOf(player) + 1;
  $("cup").textContent = rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🎉";
  $("t1").textContent = rank === 1 ? "أنت البطل!" : `رائع! المركز ${ORDINAL[rank - 1]}`;
  $("t2").textContent = `جمعت ${starCount} ⭐`;
  const end = $("end");
  end.querySelectorAll(".conf").forEach((c) => c.remove());
  for (let i = 0; i < 60; i++) {
    const c = document.createElement("i"); c.className = "conf";
    c.style.cssText = `left:${(i * 37) % 100}%;background:${COLORS[i % COLORS.length]};animation-duration:${3 + (i % 4)}s;animation-delay:-${(i * 0.37) % 4}s`;
    end.appendChild(c);
  }
  end.classList.add("on");
  sfx.win();
}

// ------------------------------------------------------------------ التحكم (لوحة مفاتيح + ريموت + يد تحكم)
const keys = new Set();
addEventListener("keydown", (e) => {
  if (e.key === "Escape") return; // محجوز لواجهة التلفاز (الخروج)
  keys.add(e.key);
  if (!e.repeat) press(e.key);
  if (e.key.startsWith("Arrow") || e.key === " " || e.key === "Enter" || e.key === "Backspace") e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.key));
function press(k) {
  audio();
  if (state === "menu") {
    // في العربية: السهم الأيسر = التالي
    const d = k === "ArrowLeft" ? 1 : k === "ArrowRight" ? -1 : 0;
    if (d) {
      const step = (v, n) => (v + d + n) % n;
      if (menuRow === 0) selV = step(selV, VEHICLES.length);
      else if (menuRow === 1) selC = step(selC, COLORS.length);
      else if (menuRow === 2) { set.map = step(set.map, MAPS.length); buildWorld(set.map); }
      else if (menuRow === 3) set.diff = step(set.diff, DIFF.length);
      else if (menuRow === 4) set.cam = step(set.cam, CAMS.length);
      else { set.q = step(set.q, QUAL.length); applyQuality(); }
      sfx.move(); buildMenu(); saveSet();
    } else if (k === "ArrowDown" || k === "ArrowUp") {
      const i = MENU_ORDER.indexOf(menuRow), n = MENU_ORDER.length;
      menuRow = MENU_ORDER[(i + (k === "ArrowDown" ? 1 : n - 1)) % n]; sfx.move(); buildMenu();
    } else if (k === "Enter" || k === " ") startRace();
  } else if (state === "race" || state === "count") {
    if (k === "Enter" || k === " ") sfx.horn();
    else if (k === "Backspace") backToMenu();
  } else if (state === "end" && endT > 1.2 && (k === "Enter" || k === " " || k === "Backspace")) backToMenu();
}
function backToMenu() {
  state = "menu"; $("end").classList.remove("on"); $("hud").classList.remove("on"); $("menu").style.display = "";
  $("big").classList.remove("show");
  racers.forEach((r) => dropVehicle(r.obj)); racers = [];
  if (bombGroup) bombGroup.visible = false;
  stars.forEach((st) => { st.taken = false; st.m.visible = true; });
  buildMenu();
}
let padPrev = [];
function pollPad() {
  const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
  if (!gp) return { steer: 0, turbo: false, slow: false };
  const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const edge = (i, key) => { if (b(i) && !padPrev[i]) press(key); };
  edge(0, "Enter"); edge(1, "Backspace"); edge(12, "ArrowUp"); edge(13, "ArrowDown"); edge(14, "ArrowLeft"); edge(15, "ArrowRight");
  const ax = gp.axes[0] || 0;
  if (state === "menu") {
    if (ax < -0.6 && !padPrev.axL) press("ArrowLeft");
    if (ax > 0.6 && !padPrev.axR) press("ArrowRight");
  }
  padPrev = gp.buttons.map((x) => x.pressed); padPrev.axL = ax < -0.6; padPrev.axR = ax > 0.6;
  return { steer: Math.abs(ax) > 0.15 ? -ax : 0, turbo: b(7) || b(5), slow: b(6) || b(4) };
}

// ------------------------------------------------------------------ الحلقة الرئيسية
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const cloudObj = new THREE.Object3D();
function sirenBlink(obj) {
  const sr = obj.userData.siren; if (!sr) return;
  const on = Math.floor(performance.now() / 220) % 2;
  sr.forEach((m, i) => { m.visible = (i + on) % 2 === 0; });
}
let menuAngle = 0, turboShown = false, shownKmh = -1;

function updateRacer(r, dt, ctl) {
  let target;
  if (r.me) {
    target = r.boost > 0 || ctl.turbo ? TURBO : ctl.slow ? SLOW : CRUISE;
    r.x -= ctl.steer * 13 * dt; // NRM يشير إلى اليمين
  } else {
    // منافسون لطفاء: يقتربون من اللاعب دائماً ليبقى السباق ممتعاً
    const D = DIFF[set.diff], gap = r.s - player.s;
    target = r.base + (gap > D.ahead ? D.aheadPen : gap < D.behind ? D.behindBoost : 0) + (r.boost > 0 ? D.boost : 0);
    r.laneT -= dt;
    if (r.laneT <= 0) { r.lane = [-4.5, 0, 4.5][Math.floor(Math.random() * 3)]; r.laneT = 2 + Math.random() * 3; }
    // يغيّر مساره إن رأى قنبلة أمامه
    for (const b of bombs) {
      if (b.off > 0) continue;
      const ds = wrapS(b.s - r.s);
      if (ds < 40 && Math.abs(b.x - r.lane) < 2.2) { const free = [-4.5, 0, 4.5].filter((l) => Math.abs(l - b.x) > 2.2); r.lane = free[Math.floor(Math.random() * free.length)]; r.laneT = 2.5; }
    }
    r.x += Math.sign(r.lane - r.x) * Math.min(Math.abs(r.lane - r.x), 6 * dt);
  }
  // النزول السريع: المنحدر يزيد السرعة كأن المركبة تنزلق
  if (!r.air) target += Math.max(0, -slopeAt(r.s)) * 55;
  r.speed += (target - r.speed) * Math.min(1, dt * (target > r.speed ? 1.4 : 2.5));
  if (r.air) r.speed = Math.max(r.speed, 16); // لا تتوقف في الهواء
  r.boost = Math.max(0, r.boost - dt);
  r.s += r.speed * dt;
  r.x = Math.max(-ROAD_W / 2 + 1.4, Math.min(ROAD_W / 2 - 1.4, r.x));
  // منصات التوربو
  for (const p of pads) {
    const ds = (((r.s - p.s) % L) + L) % L;
    if (ds < 2.5 && Math.abs(r.x - p.x) < 2.8 && r.boost < 1.6) { r.boost = 2; if (r.me) sfx.turbo(); }
  }
  // القنابل: انفجار وقفزة ودوران، والطفل يخسر بعض النجوم
  if (!r.air) for (const b of bombs) {
    if (b.off > 0) continue;
    const ds = wrapS(r.s - b.s);
    if ((ds < 1.9 || ds > L - 1.9) && Math.abs(r.x - b.x) < 1.8) {
      b.off = 7; b.g.visible = false; boomFx(b.g.position);
      r.speed *= 0.35; r.spin = 0.8; r.bump = 0.35;
      if (r.me) {
        const loss = Math.min(starCount, DIFF[set.diff].loss);
        starCount -= loss; sfx.boom();
        showBig(loss ? `💥 خسرت ${loss} ⭐` : "💥 بوم!", "hurt");
      } else if (Math.abs(wrapS(r.s - player.s + L / 2) - L / 2) < 60) sfx.boom(0.4);
    }
  }
  // القفز فوق الفجوة: قوس محسوب يهبط دائماً على الطريق التالي
  const g = gapAt(r.s);
  let pitch;
  if (g) {
    if (!r.air) { r.air = 3 + r.speed * 0.13; if (r.me) sfx.jump(); }
    r.y = arcY(r.s, r.air);
    pitch = -Math.atan((arcY(r.s + 1, r.air) - arcY(r.s - 1, r.air)) / 2) * 0.8;
  } else {
    if (r.air) { r.air = 0; r.bump = 0.35; if (r.me) sfx.land(); }
    r.y = H(r.s);
    pitch = -Math.atan(slopeAt(r.s));
  }
  r.bump = Math.max(0, (r.bump || 0) - dt);
  place(r.obj, r.s, r.x, r.y - Math.sin(r.bump / 0.35 * Math.PI) * 0.25);
  r.obj.rotation.order = "YXZ";
  r.obj.rotation.x = pitch;
  const tilt = r.me ? ctl.steer * 0.12 : 0;
  r.obj.rotation.z = tilt * 0.4; r.obj.rotation.y += tilt;
  if (r.spin > 0) { r.spin = Math.max(0, r.spin - dt); r.obj.rotation.y += (1 - r.spin / 0.8) * Math.PI * 2; }
  sirenBlink(r.obj);
  r.obj.userData.wheels.forEach((w) => { w.rotation.x += r.speed * dt / 0.6; });
  const fast = r.boost > 0 || r.speed > CRUISE + 3;
  (r.obj.userData.flames || []).forEach((f) => {
    f.visible = fast || r.type === "car";
    const len = (fast ? 1.5 : 0.55) * (0.8 + Math.random() * 0.4);
    f.scale.set(fast ? 1.25 : 1, fast ? 1.25 : 1, len);
  });
  if (r.obj.userData.arm) r.obj.userData.arm.rotation.x = -0.45 + Math.sin(performance.now() / 300) * 0.15;
  if (r.obj.userData.bed) r.obj.userData.bed.rotation.x = -Math.max(0, Math.sin(performance.now() / 700)) * 0.2;
  // نهاية السباق
  if (!r.done && r.s >= LAPS * L) { r.done = true; finishOrder.push(r); if (r.me) finish(); }
}

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = performance.now() / 1000;
  const pad = pollPad();
  // الغيوم تتحرك ببطء (رسمة واحدة)
  {
    const cd = clouds.userData, o = cloudObj;
    cd.list.forEach((c, i) => {
      c[0] += dt * (1.5 + ((i >> 2) % 3)); if (c[0] > cd.maxX) c[0] = cd.minX;
      o.position.set(c[0], c[1], c[2]); o.scale.set(c[3], c[4], c[5]); o.updateMatrix(); clouds.setMatrixAt(i, o.matrix);
    });
    clouds.instanceMatrix.needsUpdate = true;
  }
  // الثلج يتساقط حول الكاميرا
  if (snowFx) {
    const a = snowFx.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 6; if (y < 0) y += 40; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t + i) * dt * 0.6); }
    a.needsUpdate = true;
    snowFx.position.set(camera.position.x, camera.position.y - 15, camera.position.z);
  }
  // القنابل: شرارة الفتيل تومض، وتعود بعد الانفجار بقليل
  if (bombGroup && bombGroup.visible) bombs.forEach((b) => {
    if (b.off > 0) { b.off -= dt; if (b.off <= 0) b.g.visible = true; }
    b.sp.scale.setScalar(0.7 + Math.random() * 0.7);
  });
  updateFx(dt);
  stars.forEach((st) => { if (st.m.visible) { place(st.m, st.s, st.x, arcY(st.s, 5) + 1.6 + Math.sin(t * 3 + st.s) * 0.25); st.m.rotation.y = t * 2.5; } });

  gate.visible = state !== "menu";
  if (state === "menu") {
    if (preview) {
      menuAngle += dt * 0.5;
      const { p } = frameAt(12);
      camera.position.set(p.x + Math.cos(menuAngle) * 13, 6, p.z + Math.sin(menuAngle) * 13);
      camera.lookAt(p.x, 1.5, p.z);
      preview.userData.wheels.forEach((w) => { w.rotation.x += dt * 3; });
      if (preview.userData.arm) preview.userData.arm.rotation.x = -0.45 + Math.sin(t * 3) * 0.2;
      sirenBlink(preview);
    }
    if (engineGain) engineGain.gain.value = 0;
  } else {
    const ctl = { steer: 0, turbo: false, slow: false };
    if (state === "race") {
      ctl.steer = (keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0) + pad.steer;
      ctl.turbo = keys.has("ArrowUp") || pad.turbo;
      ctl.slow = keys.has("ArrowDown") || pad.slow;
    }
    if (state === "count") {
      const before = Math.ceil(countdown);
      countdown -= dt;
      const now = Math.ceil(countdown);
      if (now !== before || countdown > 3.95) {
        if (now > 0 && now <= 3) { showBig(String(now)); sfx.beep(false); }
      }
      if (countdown <= 0) { state = "race"; showBig("انطلق!"); sfx.beep(true); }
      racers.forEach((r) => { place(r.obj, r.s, r.x); });
    } else {
      racers.forEach((r) => { if (!r.done || state === "end") updateRacer(r, dt, r.me && state === "race" ? ctl : { steer: 0 }); });
      // تصادم لطيف
      for (const o of racers) {
        if (o === player) continue;
        const ds = o.s - player.s, dx = o.x - player.x;
        if (Math.abs(ds) < 4 && Math.abs(dx) < 2.2) {
          const push = (2.2 - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1);
          o.x += push; player.x -= push;
          if (ds > 0) player.speed *= 0.9; else o.speed *= 0.9;
          if (!player.bonk || t - player.bonk > 0.6) { player.bonk = t; sfx.boing(); }
        }
      }
      // النجوم
      for (const st of stars) {
        if (st.taken) continue;
        const ds = (((player.s - st.s) % L) + L) % L;
        if ((ds < 2.2 || ds > L - 1) && Math.abs(player.x - st.x) < 2) { st.taken = true; st.m.visible = false; starCount++; sfx.star(); }
      }
      // النجوم تعود في اللفة الثانية
      if (player.s > L && !player.lapReset) { player.lapReset = true; stars.forEach((st) => { st.taken = false; st.m.visible = true; }); }
    }
    // الكاميرا خلف اللاعب
    const [cb, ch, ca, cly] = CAMS[set.cam].v, sz = SIZE[player.type] || 1;
    const backD = cb * sz, hgt = set.cam === 2 ? ch + (sz - 1) * 8 : ch * sz;
    const back = frameAt(player.s - backD), ahead = frameAt(player.s + ca);
    camPos.copy(back.p).addScaledVector(back.n, player.x * 0.92); camPos.y = Math.max(player.y, H(player.s - backD)) + hgt;
    camLook.copy(ahead.p).addScaledVector(ahead.n, player.x * 0.6); camLook.y = (player.y + H(player.s + ca)) / 2 + cly;
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    camera.lookAt(camLook);
    const fov = 58 + (player.speed > CRUISE + 2 ? 9 : 0);
    camera.fov += (fov - camera.fov) * dt * 3; camera.updateProjectionMatrix();
    // الواجهة
    const lap = Math.min(LAPS, Math.max(1, Math.floor(player.s / L) + 1));
    const kmh = Math.round(player.speed * 4.2);
    if (kmh !== shownKmh) { shownKmh = kmh; $("kmh").textContent = String(kmh).padStart(3, "0"); $("needle").style.transform = `rotate(${-120 + Math.min(1, kmh / 200) * 240}deg)`; }
    $("lap").textContent = `اللفة ${lap} / ${LAPS}`;
    $("stars").textContent = `⭐ ${starCount}`;
    $("pos").textContent = `المركز ${ORDINAL[rankOf(player) - 1]}`;
    const tb = player.boost > 0 || (state === "race" && (keys.has("ArrowUp") || pad.turbo));
    if (tb !== turboShown) { $("turbo").classList.toggle("on", tb); turboShown = tb; }
    if (engineGain) { engine.frequency.value = 50 + player.speed * 4.5; engineGain.gain.value = state === "end" ? 0.015 : 0.035; }
    if (state === "end") endT += dt;
  }
  // تحديث صور القائمة عند تغيّر اللون (قبل رسم المشهد مباشرة فلا يظهر أي وميض)
  if (state === "menu" && thumbColor !== COLORS[selC]) { renderThumbs(); buildCards(); }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// تدريجات عدّاد السرعة (0 إلى 200)
{
  let svg = '<path d="M ' + (Math.cos(Math.PI * (-18) / 180) * 82) + ' ' + (Math.sin(Math.PI * (-18) / 180) * 82) + ' A 82 82 0 0 1 ' + (Math.cos(Math.PI * 30 / 180) * 82) + ' ' + (Math.sin(Math.PI * 30 / 180) * 82) + '" stroke="#ef4444" stroke-width="7" fill="none"/>';
  for (let v = 0; v <= 200; v += 10) {
    const a = (Math.PI / 180) * (-210 + (v / 200) * 240), big = v % 40 === 0;
    const r1 = big ? 70 : 76, c = Math.cos(a), sn = Math.sin(a);
    svg += `<line x1="${c * r1}" y1="${sn * r1}" x2="${c * 86}" y2="${sn * 86}" stroke="#e2e8f0" stroke-width="${big ? 4 : 2}"/>`;
    if (big) svg += `<text x="${c * 55}" y="${sn * 55 + 6}" fill="#f8fafc" font-size="17" font-weight="800" text-anchor="middle" font-family="Baloo, sans-serif">${v}</text>`;
  }
  $("dial").innerHTML = svg;
}
applyQuality();
buildWorld(set.map);
buildMenu();
tick();
