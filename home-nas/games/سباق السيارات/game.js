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
scene.add(new THREE.HemisphereLight("#ffffff", "#7cc36a", 1.1));
const sun = new THREE.DirectionalLight("#fff6dd", 1.4);
sun.position.set(80, 120, 40);
scene.add(sun);

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === "string" ? mat(c) : c);

// ------------------------------------------------------------------ المسار
const PTS = [[0, 0], [70, -15], [140, 5], [175, 60], [150, 125], [90, 140], [55, 105], [5, 125], [-60, 135], [-120, 100], [-135, 40], [-90, -5]];
const curve = new THREE.CatmullRomCurve3(PTS.map(([x, z]) => new THREE.Vector3(x * 1.3, 0, z * 1.3)), true, "centripetal");
const L = curve.getLength();
const P = [], T = [], NRM = [];
for (let i = 0; i <= N; i++) {
  const u = (i % N) / N;
  const p = curve.getPointAt(u), t = curve.getTangentAt(u).setY(0).normalize();
  P.push(p); T.push(t); NRM.push(new THREE.Vector3(-t.z, 0, t.x)); // إلى اليسار
}
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

// ------------------------------------------------------------------ الجسور والمنحدرات والقفزات
// ارتفاع الطريق عند كل مسافة s: نقاط [المسافة، الارتفاع] بينها انتقال ناعم
const KN = [
  [0, 0], [70, 0], [115, 7], [140, 7], [158, 6], [176, 6], [215, 0],          // جسر ثم قفزة إلى جسر آخر
  [300, 0], [340, 6], [348, 6], [365, 5.5], [378, 5.5], [410, 0],            // قفزة ثانية بين جسرين
  [545, 0], [612, 15], [626, 15], [664, 2.5], [671, 4], [690, 3.5], [702, 3.5], [735, 0], // نزول سريع ثم قفزة
  [790, 0], [834, 10], [846, 10], [878, 1.5], [885, 3], [903, 2.5], [912, 2.5], [935, 0], // نزول سريع وقفزة أخرى
];
// الفجوات التي تطير فوقها المركبة (لا طريق فيها، وتحتها ماء)
const GAPS = [[140, 158], [348, 365], [671, 690], [885, 903]];
const wrapS = (s) => ((s % L) + L) % L;
function H(s) {
  s = wrapS(s);
  for (let i = 1; i < KN.length; i++) {
    if (s <= KN[i][0]) {
      const [s0, h0] = KN[i - 1], [s1, h1] = KN[i];
      const u = (s - s0) / (s1 - s0), e = u * u * (3 - 2 * u);
      return h0 + (h1 - h0) * e;
    }
  }
  return 0;
}
const slopeAt = (s) => (H(s + 1) - H(s - 1)) / 2;
const gapAt = (s) => { s = wrapS(s); return GAPS.find(([a, b]) => s > a && s < b); };
// ارتفاع مسار القفزة فوق الفجوة (قوس يهبط دائماً على الطريق التالي)
function arcY(s, jump) {
  const g = gapAt(s); if (!g) return H(s);
  const u = (wrapS(s) - g[0]) / (g[1] - g[0]);
  return H(g[0]) + (H(g[1]) - H(g[0])) * u + jump * 4 * u * (1 - u);
}

function canvasTex(w, h, draw, repeatU = 1) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tx = new THREE.CanvasTexture(c);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.anisotropy = 4;
  tx.repeat.set(repeatU, 1);
  return tx;
}
// شريط على طول المسار: offA/offB إزاحة جانبية، yA/yB ارتفاع فوق الطريق (لعمل الجدران)، و only تختار المقاطع
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
  scene.add(m);
  return m;
}
// الطريق: إسفلت وخط أبيض متقطع في المنتصف
strip(ROAD_W / 2, -ROAD_W / 2, 0.03, new THREE.MeshLambertMaterial({
  map: canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#5b6475"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < .5 ? "#545c6c" : "#636c7e"; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = "#fff"; g.fillRect(0, h / 2 - 3, w / 2, 6);
  }),
}), 10);
// الأرصفة الملونة
const curbMat = () => new THREE.MeshLambertMaterial({
  map: canvasTex(64, 16, (g, w, h) => { g.fillStyle = "#ef4444"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.fillRect(w / 2, 0, w / 2, h); }),
});
strip(ROAD_W / 2 + 1.6, ROAD_W / 2, 0.06, curbMat(), 4);
strip(-ROAD_W / 2, -ROAD_W / 2 - 1.6, 0.06, curbMat(), 4);
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
// أعمدة تحت الجسور (مجسم واحد مكرر ليبقى خفيفاً)
{
  const spots = [];
  for (let s = 0; s < L; s += 11) {
    const h = H(s);
    if (h > 1.6 && !gapAt(s) && !gapAt(s + 3) && !gapAt(s - 3)) [-ROAD_W / 2 + 2, ROAD_W / 2 - 2].forEach((x) => spots.push([s, x, h]));
  }
  // أكتاف على حافتي كل فجوة
  GAPS.forEach(([a, b]) => [a - 1.5, b + 1.5].forEach((s) => [-ROAD_W / 2 + 2, 0, ROAD_W / 2 - 2].forEach((x) => spots.push([s, x, H(s)]))));
  const col = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1, 1.8), new THREE.MeshLambertMaterial({ color: "#c3c8cf" }), spots.length);
  const o = new THREE.Object3D();
  spots.forEach(([s, x, h], i) => { place(o, s, x, (h - 1.2) / 2); o.scale.set(1, h - 1.2, 1); o.updateMatrix(); col.setMatrixAt(i, o.matrix); });
  scene.add(col);
}
// ماء تحت كل فجوة، ولوحة تحذير صفراء عند حافة الانطلاق
const water = new THREE.MeshLambertMaterial({
  map: canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = "#2f8fd8"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#7cc6f5"; g.lineWidth = 2;
    for (let y = 6; y < h; y += 12) { g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin(x / 5) * 2); g.stroke(); }
  }, 4),
});
water.map.repeat.set(4, 3);
const gapMids = GAPS.map(([a, b]) => frameAt((a + b) / 2).p);
GAPS.forEach(([a, b]) => {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(46, b - a + 26), water);
  w.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group(); holder.add(w); place(holder, (a + b) / 2, 0, 0.05); scene.add(holder);
  const sign = box(ROAD_W + 3.2, 0.5, 0.3, new THREE.MeshLambertMaterial({
    map: canvasTex(64, 8, (g, cw, ch) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#111" : "#facc15"; g.beginPath(); g.moveTo(i * 8, ch); g.lineTo(i * 8 + 4, 0); g.lineTo(i * 8 + 12, 0); g.lineTo(i * 8 + 8, ch); g.fill(); } }),
  }));
  place(sign, a - 0.2, 0, H(a) - 0.3); scene.add(sign);
  const sign2 = sign.clone(); place(sign2, b + 0.2, 0, H(b) - 0.3); scene.add(sign2);
});

// الأرض
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat("#7ccf5d"));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// خط البداية + بوابة «سباق كريم»
const startLine = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 3), new THREE.MeshLambertMaterial({
  map: canvasTex(64, 16, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * 4, y * 4, 4, 4); } }),
}));
startLine.rotation.x = -Math.PI / 2;
const sl = new THREE.Group(); sl.add(startLine); place(sl, 0, 0, 0.08); scene.add(sl);
const gate = new THREE.Group();
{
  const c = document.createElement("canvas"); c.width = 1024; c.height = 192;
  const bannerTex = new THREE.CanvasTexture(c); bannerTex.colorSpace = THREE.SRGBColorSpace; bannerTex.anisotropy = 4;
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
  if (document.fonts) document.fonts.load('800 104px Baloo').then(draw, () => {});
  const banner = new THREE.MeshLambertMaterial({ map: bannerTex }), side = mat("#1e3a8a");
  const W = ROAD_W + 5;
  const b = box(W, 2.7, 0.5, [side, side, side, side, banner, banner]); b.position.y = 9.6; gate.add(b);
  [-W / 2 + 0.4, W / 2 - 0.4].forEach((x) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 11, 12), new THREE.MeshPhongMaterial({ color: "#e5e7eb", shininess: 60 }));
    p.position.set(x, 5.5, 0); gate.add(p);
  });
}
place(gate, 2, 0); scene.add(gate);

// أشجار وجبال وغيوم بعيداً عن الطريق
function nearRoad(x, z, margin) {
  for (let i = 0; i < N; i += 4) if (Math.hypot(P[i].x - x, P[i].z - z) < ROAD_W / 2 + margin) return true;
  return false;
}
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const treeCols = ["#16a34a", "#22c55e", "#15803d", "#65a30d"], flowerCols = ["#f43f5e", "#facc15", "#ffffff", "#a855f7", "#fb923c"];
for (let k = 0; k < 260; k++) {
  const x = -320 + rnd() * 640, z = -260 + rnd() * 560;
  if (nearRoad(x, z, 6) || gapMids.some((m) => Math.hypot(m.x - x, m.z - z) < 34)) continue;
  const g = new THREE.Group();
  if (rnd() < 0.75) {
    const h = 5 + rnd() * 6;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, h * 0.4, 6), mat("#92400e"));
    trunk.position.y = h * 0.2; g.add(trunk);
    const top = rnd() < .5 ? new THREE.Mesh(new THREE.ConeGeometry(h * 0.35, h * 0.8, 7), mat(treeCols[k % 4]))
      : new THREE.Mesh(new THREE.SphereGeometry(h * 0.3, 8, 6), mat(treeCols[k % 4]));
    top.position.y = h * 0.6; g.add(top);
  } else {
    for (let j = 0; j < 5; j++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), mat(flowerCols[(k + j) % 5]));
      f.position.set(rnd() * 4 - 2, 0.4, rnd() * 4 - 2); g.add(f);
    }
  }
  g.position.set(x, 0, z);
  scene.add(g);
}
for (let k = 0; k < 14; k++) {
  const a = (k / 14) * Math.PI * 2, r = 330 + rnd() * 40;
  const m = new THREE.Mesh(new THREE.ConeGeometry(50 + rnd() * 40, 70 + rnd() * 70, 6), mat(k % 2 ? "#6b8fd6" : "#7c9be0"));
  m.position.set(20 + Math.cos(a) * r, 30, 60 + Math.sin(a) * r);
  scene.add(m);
}
const clouds = [];
for (let k = 0; k < 18; k++) {
  const c = new THREE.Group();
  for (let j = 0; j < 4; j++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(5 + rnd() * 4, 8, 6), mat("#ffffff"));
    b.position.set(j * 6 - 9, rnd() * 2, rnd() * 4); c.add(b);
  }
  c.position.set(-300 + rnd() * 600, 55 + rnd() * 30, -250 + rnd() * 500);
  clouds.push(c); scene.add(c);
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
function profile(pts, w, material, bev = 0.07) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => {
    if (p.arch) { const [cz, cy, r] = p.arch; s.lineTo(cz - r, cy); s.absarc(cz, cy, r, Math.PI, 0, true); }
    else if (i === 0) s.moveTo(p[0], p[1]); else s.lineTo(p[0], p[1]);
  });
  const geo = new THREE.ExtrudeGeometry(s, { depth: w - bev * 2, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 7 });
  geo.translate(0, 0, -(w - bev * 2) / 2);
  geo.rotateY(-Math.PI / 2);
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
function makeVehicle(type, color) {
  const g = new THREE.Group(), wheels = [];
  const body = paint(color);
  const addWheels = (list, r, w, kind) => list.forEach(([x, z]) => { const wh = wheel(r, w, kind); wh.position.set(x, r, z); g.add(wh); wheels.push(wh); });
  let shadowL = 5.2, shadowW = 3;
  if (type === "car") {
    // سيارة رياضية منخفضة بخطوط انسيابية
    const wr = 0.42;
    part(g, profile([[-2.2, 0.3], { arch: [-1.35, 0.32, 0.5] }, { arch: [1.35, 0.32, 0.5] }, [2.15, 0.3], [2.32, 0.45], [2.28, 0.62], [1.8, 0.86], [0.85, 0.96], [-1.3, 1.0], [-2.1, 1.02], [-2.3, 0.9], [-2.32, 0.5]], 2.06, body, 0.09));
    part(g, profile([[0.9, 0.94], [-0.05, 1.42], [-0.95, 1.46], [-1.95, 1.0]], 1.62, M.glass(), 0.07));
    part(g, profile([[0.0, 1.39], [-0.98, 1.43], [-0.95, 1.49], [-0.02, 1.46]], 1.66, body, 0.04));
    part(g, box(1.3, 0.13, 0.1, grille()), 0, 0.42, 2.3);
    lamps(g, 2.2, 0.68, 0.66, 0.46, 0.12, true);
    g.children[g.children.length - 1].rotation.x = g.children[g.children.length - 2].rotation.x = -0.6;
    lamps(g, -2.44, 0.84, 0.68, 0.52, 0.12, false);
    part(g, box(1.7, 0.18, 0.12, M.black()), 0, 0.4, -2.4);
    [-0.45, 0.45].forEach((x) => { const e = part(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 10), M.chrome()), x, 0.36, -2.47); e.rotation.x = Math.PI / 2; });
    part(g, box(2.0, 0.06, 0.42, body), 0, 1.36, -1.95);
    [-0.7, 0.7].forEach((x) => part(g, box(0.07, 0.3, 0.2, M.black()), x, 1.19, -1.95));
    [-1, 1].forEach((sx) => part(g, box(0.18, 0.12, 0.22, body), sx * 0.98, 1.08, 0.5));
    addWheels([[-0.92, 1.35], [0.92, 1.35], [-0.92, -1.35], [0.92, -1.35]], wr, 0.4, "sport");
    shadowL = 5.4; shadowW = 2.8;
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
// ------------------------------------------------------------------ النجوم ومنصات التوربو
const starGeo = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1.1, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false });
})();
const stars = [];
for (let s = 60; s < L - 20; s += 34) {
  const m = new THREE.Mesh(starGeo, new THREE.MeshLambertMaterial({ color: "#fde047", emissive: "#a16207" }));
  const x = [-4.5, 0, 4.5][Math.floor(rnd() * 3)];
  scene.add(m);
  stars.push({ m, s, x, taken: false });
}
const pads = [];
for (const s of [255, 480, 965]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({
    transparent: true,
    map: canvasTex(64, 64, (g) => {
      const gr = g.createLinearGradient(0, 0, 64, 0);
      ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7"].forEach((c, i) => gr.addColorStop(i / 5, c));
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      g.fillStyle = "#fff";
      for (const y of [10, 34]) { g.beginPath(); g.moveTo(16, y + 18); g.lineTo(32, y); g.lineTo(48, y + 18); g.lineTo(40, y + 18); g.lineTo(32, y + 9); g.lineTo(24, y + 18); g.fill(); }
    }),
  }));
  m.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group(); holder.add(m);
  const x = (rnd() - 0.5) * 6;
  place(holder, s, x, H(s) + 0.09);
  holder.rotation.y += Math.PI;
  scene.add(holder);
  pads.push({ s, x });
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
  jump: () => tone(260, 0.45, "sine", 0.18, 0, 780),
  land: () => { tone(110, 0.18, "triangle", 0.22); tone(70, 0.25, "sine", 0.2, 0.03); },
};

// ------------------------------------------------------------------ الحالة
const $ = (id) => document.getElementById(id);
let state = "menu", selV = 0, selC = 0, menuRow = 0;
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
function buildMenu() {
  buildCards();
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
  const others = VEHICLES.map((v) => v.id).filter((id) => id !== VEHICLES[selV].id);
  const oc = COLORS.filter((_, i) => i !== selC);
  const grid = [[0, -12], [-4.5, 6], [4.5, 6], [0, -2]];
  racers = [{ type: VEHICLES[selV].id, color: COLORS[selC], me: true }, ...others.map((t, i) => ({ type: t, color: oc[(i * 2 + 1) % oc.length] }))]
    .map((r, i) => {
      const obj = makeVehicle(r.type, r.color);
      scene.add(obj);
      return { ...r, obj, s: grid[i][1], x: grid[i][0], speed: 0, y: 0, air: 0, bump: 0, base: 17 + i * 1.3, lane: grid[i][0], laneT: 0, boost: 0, done: false };
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
function showBig(txt) {
  const b = $("big"); b.textContent = txt; b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
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
  if (e.key.startsWith("Arrow") || e.key === " " || e.key === "Enter") e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.key));
function press(k) {
  audio();
  if (state === "menu") {
    const n = menuRow === 0 ? VEHICLES.length : COLORS.length;
    // في العربية: السهم الأيسر = التالي
    if (k === "ArrowLeft") { if (menuRow === 0) selV = (selV + 1) % n; else selC = (selC + 1) % n; sfx.move(); buildMenu(); }
    else if (k === "ArrowRight") { if (menuRow === 0) selV = (selV - 1 + n) % n; else selC = (selC - 1 + n) % n; sfx.move(); buildMenu(); }
    else if (k === "ArrowDown" || k === "ArrowUp") { menuRow = 1 - menuRow; sfx.move(); buildMenu(); }
    else if (k === "Enter" || k === " ") startRace();
  } else if (state === "race" || state === "count") {
    if (k === "Enter" || k === " ") sfx.horn();
  } else if (state === "end" && endT > 1.2 && (k === "Enter" || k === " ")) {
    state = "menu"; $("end").classList.remove("on"); $("hud").classList.remove("on"); $("menu").style.display = "";
    racers.forEach((r) => dropVehicle(r.obj)); racers = []; buildMenu();
  }
}
let padPrev = [];
function pollPad() {
  const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
  if (!gp) return { steer: 0, turbo: false, slow: false };
  const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const edge = (i, key) => { if (b(i) && !padPrev[i]) press(key); };
  edge(0, "Enter"); edge(12, "ArrowUp"); edge(13, "ArrowDown"); edge(14, "ArrowLeft"); edge(15, "ArrowRight");
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
let menuAngle = 0, turboShown = false;

function updateRacer(r, dt, ctl) {
  let target;
  if (r.me) {
    target = r.boost > 0 || ctl.turbo ? TURBO : ctl.slow ? SLOW : CRUISE;
    r.x -= ctl.steer * 13 * dt; // NRM يشير إلى اليمين
  } else {
    // منافسون لطفاء: يقتربون من اللاعب دائماً ليبقى السباق ممتعاً
    const gap = r.s - player.s;
    target = r.base + (gap > 25 ? -6 : gap < -12 ? 12 : 0) + (r.boost > 0 ? 8 : 0);
    r.laneT -= dt;
    if (r.laneT <= 0) { r.lane = [-4.5, 0, 4.5][Math.floor(Math.random() * 3)]; r.laneT = 2 + Math.random() * 3; }
    r.x += Math.sign(r.lane - r.x) * Math.min(Math.abs(r.lane - r.x), 4 * dt);
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
  // المظهر
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
  r.obj.userData.wheels.forEach((w) => { w.rotation.x += r.speed * dt / 0.6; });
  if (r.obj.userData.arm) r.obj.userData.arm.rotation.x = -0.45 + Math.sin(performance.now() / 300) * 0.15;
  if (r.obj.userData.bed) r.obj.userData.bed.rotation.x = -Math.max(0, Math.sin(performance.now() / 700)) * 0.2;
  // نهاية السباق
  if (!r.done && r.s >= LAPS * L) { r.done = true; finishOrder.push(r); if (r.me) finish(); }
}

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = performance.now() / 1000;
  const pad = pollPad();
  clouds.forEach((c, i) => { c.position.x += dt * (1.5 + (i % 3)); if (c.position.x > 320) c.position.x = -320; });
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
    const back = frameAt(player.s - 10), ahead = frameAt(player.s + 8);
    camPos.copy(back.p).addScaledVector(back.n, player.x * 0.7); camPos.y = Math.max(player.y, H(player.s - 10)) + 5.2;
    camLook.copy(ahead.p).addScaledVector(ahead.n, player.x * 0.5); camLook.y = (player.y + H(player.s + 8)) / 2 + 1.4;
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    camera.lookAt(camLook);
    const fov = 62 + (player.speed > CRUISE + 2 ? 8 : 0);
    camera.fov += (fov - camera.fov) * dt * 3; camera.updateProjectionMatrix();
    // الواجهة
    const lap = Math.min(LAPS, Math.max(1, Math.floor(player.s / L) + 1));
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

buildMenu();
tick();
