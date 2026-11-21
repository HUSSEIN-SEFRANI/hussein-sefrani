// مغامرات كرمو — لعبة مراحل ثلاثية الأبعاد (three.js). كل مرحلة رحلة من عدة أجزاء، وفي كل جزء مركبة.
// النماذج مصنوعة في Blender (السكربتات في _blender/) ومحفوظة في models/*.glb.
// التحكم (البند 52، بالموقع): الأسهم/العصا اليسرى للقيادة والتوجيه، الزر السفلي (0) انطلاق/تسريع،
// الأيمن (1) استراحة، الأيسر (2) البوق، العلوي (3) تغيير الكاميرا. زر PS للتلفاز.
import * as THREE from "./three.module.min.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { mergeGeometries } from "./BufferGeometryUtils.js";

const K = window.K;
const GAME = "مغامرات كرمو";
const save = K.store("karmo", { unlocked: 1, best: {} });
const LITE = (() => {
  try { if (parent !== window && parent.document.documentElement.classList.contains("lite")) return true; } catch {}
  return (navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2;
})();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (id) => document.getElementById(id);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ===================================================================== المرحلة والمركبات
const VEH = {
  car: { name: "السيارة", ic: "🚗", kind: "ground", max: 26, acc: 9, brk: 16, steer: 1.9, cam: [8, 3.2], top: 1.9, circles: [[0, 1.2, 1.0], [0, -1.2, 1.0]] },
  truck: { name: "الشاحنة والمقطورة", ic: "🚛", kind: "ground", max: 19, acc: 4.5, brk: 11, steer: 1.15, cam: [26, 9.5], circles: [[0, -1.2, 1.4], [0, -4.2, 1.4]], trailer: true, top: 4.4 },
  moto: { name: "الدراجة النارية", ic: "🏍️", kind: "ground", max: 30, acc: 12, brk: 18, steer: 2.3, cam: [6, 2.6], top: 1.8, circles: [[0, 0.3, 0.7]], seat: [0, 0.39, -0.15, 1.15] },
  heli: { name: "المروحية", ic: "🚁", kind: "heli", max: 22, acc: 6, steer: 1.3, cam: [16, 6], circles: [[0, 0, 2.2]] },
  plane: { name: "طائرة الركاب", ic: "✈️", kind: "plane", max: 62, acc: 8, steer: 0.55, cam: [45, 12], circles: [[0, 0, 8]] },
  boat: { name: "الزورق", ic: "🚤", kind: "water", max: 20, acc: 7, brk: 9, steer: 1.6, cam: [10, 3.8], float: 0.45, grip: 2.6, circles: [[0, 1.2, 1.2], [0, -1.2, 1.2]], seat: [0, 0.1, -0.75, 1.25] },
  ship: { name: "الباخرة العملاقة", ic: "🚢", kind: "water", max: 13, acc: 1.7, brk: 2.4, steer: 0.32, cam: [90, 34], float: 0, grip: 0.7, circles: [[0, 25, 6.5], [0, 10, 7], [0, -5, 7], [0, -20, 7], [0, -32, 6]] },
};
const LEVELS = [
  { name: "الطريق إلى الميناء", ic: "🚗", legs: [
    { veh: "car", env: "road", len: 800, curv: 0.5, seed: 11, cones: 1, title: "قُد السيارة إلى النقطة الثانية" },
    { veh: "truck", env: "road", len: 850, curv: 0.32, seed: 12, cones: 0.35, traffic: 14, title: "قُد الشاحنة ولا تصطدم بالسيارات" },
    { veh: "moto", env: "road", len: 900, curv: 0.55, seed: 13, cones: 0.8, ramps: 4, title: "انطلق بالدراجة إلى خط النهاية" },
  ] },
  { name: "رحلة في السماء", ic: "🚁", legs: [
    { veh: "heli", env: "city", len: 900, curv: 0.45, seed: 21, title: "طِر بالمروحية إلى المطار" },
    { veh: "plane", env: "sky", len: 3600, curv: 0.35, seed: 22, title: "طِر بطائرة الركاب إلى المطار الآخر", straight: [650, 900] },
  ] },
  { name: "من النهر إلى البحر", ic: "🚤", legs: [
    { veh: "boat", env: "river", len: 1000, curv: 0.6, seed: 31, title: "اعبر النهر بالزورق حتى البحر" },
    { veh: "ship", env: "sea", len: 1300, curv: 0.25, seed: 32, title: "قُد الباخرة إلى الضفة الأخرى" },
  ] },
];
const SOON = ["🏜️", "🏔️", "🌃", "🌧️", "🏝️", "🌋", "🏁"];

// ===================================================================== المشهد
const cv = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !LITE, powerPreference: "high-performance" });
renderer.setPixelRatio(LITE ? 0.75 : Math.min(devicePixelRatio || 1, 1));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = !LITE;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 6000);
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const SUN = new THREE.Vector3(0.45, 0.65, 0.5).normalize();
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sd: { value: SUN } },
  vertexShader: "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader: `uniform vec3 sd;varying vec3 v;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*noise(p);p*=2.03;a*=.5;}return s;}
  void main(){vec3 d=normalize(v);float h=max(d.y,0.);
  vec3 c=mix(vec3(.74,.85,.95),vec3(.15,.38,.78),pow(h,.5));
  float mu=max(dot(d,sd),0.);c+=vec3(1.,.95,.85)*pow(mu,90.)*.6;
  if(d.y>0.){vec2 uv=d.xz/(d.y+.1)*1.1;float cl=smoothstep(.55,.85,fbm(uv+vec2(7.,2.)));float s2=fbm(uv*1.4+.7);
   c=mix(c,mix(vec3(1.),vec3(.72,.76,.84),s2*.8),cl*smoothstep(0.,.2,d.y)*.9);}
  if(d.y<0.)c=mix(vec3(.74,.85,.95),vec3(.55,.62,.6),min(1.,-d.y*3.));
  gl_FragColor=vec4(c,1.);}`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat);
sky.renderOrder = -1;
scene.add(sky);
{
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat));
  scene.environment = pm.fromScene(es, 0.02).texture;
}
scene.fog = new THREE.Fog(0xbcd6ea, 150, 900);
scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x5d6b4a, 0.55));
const sun = new THREE.DirectionalLight(0xfff4e2, 3.0);
sun.castShadow = !LITE;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 300 });
scene.add(sun, sun.target);

// ===================================================================== القوامات المرسومة بالكود
function canvasTex(w, h, draw, rep = [1, 1], srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = LITE ? 1 : 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(g, w, h, n, size, cols, a) { for (let i = 0; i < n; i++) { g.globalAlpha = a * Math.random(); g.fillStyle = cols[(Math.random() * cols.length) | 0]; const s = size * (0.3 + Math.random()); g.fillRect(Math.random() * w, Math.random() * h, s, s); } g.globalAlpha = 1; }
const TEX = {};
TEX.asphalt = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = "#47484b"; g.fillRect(0, 0, w, h); speckle(g, w, h, 16000, 2, ["#2e2f31", "#5c5d60", "#6b6a66", "#3a3b3d"], 0.8);
  g.fillStyle = "#ecebe4"; g.fillRect(8, 0, 6, h); g.fillRect(w - 14, 0, 6, h);
  g.fillStyle = "#f2c230"; for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 4, y, 8, 72);
});
TEX.grass = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#5b7d33"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) { g.fillStyle = ["rgba(110,130,50,.25)", "rgba(60,95,30,.3)", "rgba(140,120,60,.15)"][i % 3]; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 50, 0, 7); g.fill(); }
  speckle(g, w, h, 9000, 2, ["#6f8e3c", "#3f5a22", "#7d8a45", "#4d7028"], 0.7);
}, [1, 1]);
TEX.sand = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#d9c38f"; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, 2, ["#c8ae78", "#e8d6a8", "#b99f6a"], 0.7); });
TEX.gravel = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#8a8170"; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, 3, ["#6d665a", "#a39a87", "#5a5449"], 0.8); });
TEX.concrete = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#9a9a96"; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, 2, ["#8a8a86", "#aaaaa6"], 0.6);
  g.strokeStyle = "rgba(60,60,60,.35)"; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
});
TEX.windows = canvasTex(64, 128, (g, w, h) => {
  g.fillStyle = "#d8d4cc"; g.fillRect(0, 0, w, h);
  for (let y = 6; y < h; y += 16) for (let x = 5; x < w; x += 15) { g.fillStyle = Math.random() < 0.2 ? "#ffe9a8" : ["#3d5a78", "#4b6a8a", "#2f4a66"][(Math.random() * 3) | 0]; g.fillRect(x, y, 9, 10); }
});
TEX.runway = canvasTex(128, 512, (g, w, h) => {
  g.fillStyle = "#3b3c3f"; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, 2, ["#2e2f31", "#55565a"], 0.7);
  g.fillStyle = "#f4f4f0"; g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h); for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 2, y, 4, 34);
});
TEX.waterN = canvasTex(256, 256, (g, w, h) => {
  // خريطة نواظم بسيطة من موجات متداخلة
  const id = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const f = (a, b) => Math.sin((x * a + y * b) / w * Math.PI * 2);
    const dx = f(3, 1) * 0.5 + f(7, -4) * 0.3 + f(-11, 6) * 0.2, dy = f(1, 4) * 0.5 + f(-5, 9) * 0.3 + f(13, 3) * 0.2;
    const i = (y * w + x) * 4; id.data[i] = 128 + dx * 60; id.data[i + 1] = 128 + dy * 60; id.data[i + 2] = 255; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
}, [1, 1], false);

// ===================================================================== النماذج
const loader = new GLTFLoader();
const MODELS = {};
const loadGLB = (n) => new Promise((ok, no) => loader.load(`models/${n}.glb`, (g) => ok(g.scene), undefined, no));

function irisTexture() {
  return canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, "#2a140a"); gr.addColorStop(0.28, "#2a140a"); gr.addColorStop(0.32, "#8a5228"); gr.addColorStop(0.7, "#6b3a1c"); gr.addColorStop(1, "#3a1d0c");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}
let IRIS = null;
function fixMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = !LITE;
    const m = o.material, n = m.name || "";
    if (n.startsWith("paint")) {
      const p = LITE ? new THREE.MeshStandardMaterial({ color: m.color, roughness: m.roughness, metalness: m.metalness })
        : new THREE.MeshPhysicalMaterial({ color: m.color, roughness: m.roughness, metalness: m.metalness, clearcoat: 1, clearcoatRoughness: 0.05 });
      p.name = n; o.material = p;
    } else if (n === "hl_glass") { m.transparent = true; m.opacity = 0.35; m.depthWrite = false; o.castShadow = false; }
    else if (n.startsWith("light_") || n === "reflector") m.emissiveIntensity = 1.6;
    else if (n === "glass_dark") { m.roughness = 0.04; m.envMapIntensity = 1.6; }
    else if (n === "eye_iris") {
      // UV مستوية من موضع الرأس داخل الشكل (قبل الدمج)
      const pos = o.geometry.attributes.position, uv = new Float32Array(pos.count * 2);
      o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox;
      for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x); uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y); }
      o.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      IRIS = IRIS || irisTexture();
      o.material = new THREE.MeshBasicMaterial({ map: IRIS }); o.material.name = n; o.castShadow = false;
    } else if (n === "eye_shine" || n === "eye_white") { o.material = new THREE.MeshBasicMaterial({ color: 0xffffff }); o.material.name = n; o.castShadow = false; }
    else if (n === "eye_pupil" || n === "lash" || n === "brow" || n === "mouth" || n === "tongue" || n === "teeth" || n === "blush") o.castShadow = false;
  });
  return root;
}
// دمج كل الأجزاء ذات المادة الواحدة في شبكة واحدة (أسرع بكثير)، مع إبقاء الأجزاء المتحركة (المراوح) منفصلة
function bake(root, keep = []) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map(), m4 = new THREE.Matrix4();
  const kept = keep.map((k) => root.getObjectByName(k)).filter(Boolean);
  const inKept = (o) => { for (let p = o; p; p = p.parent) if (kept.includes(p)) return true; return false; };
  root.traverse((o) => {
    if (!o.isMesh || inKept(o)) return;
    let g = o.geometry.clone();
    g.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
    if (g.index) g = g.toNonIndexed();
    for (const a of Object.keys(g.attributes)) if (a !== "position" && a !== "normal" && a !== "uv") g.deleteAttribute(a);
    const key = o.material.uuid;
    if (!groups.has(key)) groups.set(key, { mat: o.material, list: [], shadow: o.castShadow });
    groups.get(key).list.push(g);
  });
  const out = new THREE.Group(); out.name = root.name;
  for (const { mat, list, shadow } of groups.values()) {
    const hasUV = list.every((g) => g.attributes.uv);
    if (!hasUV) list.forEach((g) => g.deleteAttribute("uv"));
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = shadow; mesh.receiveShadow = !LITE; out.add(mesh);
  }
  for (const k of kept) {
    const wpos = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
    m4.multiplyMatrices(inv, k.matrixWorld).decompose(wpos, wq, ws);
    k.parent.remove(k); k.position.copy(wpos); k.quaternion.copy(wq); k.scale.copy(ws); out.add(k);
  }
  return out;
}
async function loadModels(progress) {
  const list = ["car", "truck", "trailer", "moto", "heli", "plane", "boat", "ship", "karmo_walk", "karmo_sit"];
  let done = 0;
  await Promise.all(list.map(async (n) => {
    const raw = fixMaterials(await loadGLB(n));
    MODELS[n] = bake(raw, n === "heli" ? ["rotor", "tail_rotor"] : []);
    if (n === "car") MODELS[n].children.forEach((m) => m.geometry.translate(0, 0, 2.05));   // مركز السيارة في منتصفها
    done++; progress(done / list.length);
  }));
  // ستارة المقطورة
  const curtain = canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = "#ecebe6"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(0,0,0,${0.03 + 0.05 * Math.abs(Math.sin(x * 0.06))})`; g.fillRect(x, 0, 2, h); }
    g.fillStyle = "#1e4fa8"; g.font = "bold 56px sans-serif"; g.textAlign = "center"; g.fillText("كرمو للنقل", w / 2, 84);
  });
  MODELS.trailer.traverse((o) => { if (o.isMesh && o.material.name === "curtain") o.material = new THREE.MeshStandardMaterial({ map: curtain, roughness: 0.85, side: THREE.DoubleSide }); });
}
function tinted(name, color) {
  const o = MODELS[name].clone();
  o.traverse((m) => { if (m.isMesh && m.material.name.startsWith("paint")) { m.material = m.material.clone(); m.material.color.set(color); } });
  return o;
}

// ===================================================================== الطريق (المسار)
function makePath(leg) {
  const R = rng(leg.seed * 977 + 3), step = 30, n = Math.ceil(leg.len / step) + 4;
  const pts = [new THREE.Vector3(0, 0, 0)];
  let h = 0, turn = 0, x = 0, z = 0;
  const [s0, s1] = leg.straight || [60, 80];
  for (let i = 1; i < n; i++) {
    const d = i * step;
    const free = d > s0 && d < leg.len - s1;
    turn = free ? clamp(turn * 0.6 + (R() - 0.5) * leg.curv * 0.9, -0.5, 0.5) : turn * 0.3;
    h = clamp(h + (free ? turn : -h * 0.25), -1.1, 1.1);
    x += Math.sin(h) * step; z += Math.cos(h) * step;
    pts.push(new THREE.Vector3(x, 0, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const total = curve.getLength(), STEP = 2, N = Math.floor(Math.min(total, leg.len + 40) / STEP) + 1;
  const P = { n: N, step: STEP, len: leg.len, x: new Float32Array(N), z: new Float32Array(N), tx: new Float32Array(N), tz: new Float32Array(N) };
  for (let i = 0; i < N; i++) {
    const u = Math.min(1, (i * STEP) / total), p = curve.getPointAt(u), t = curve.getTangentAt(u);
    P.x[i] = p.x; P.z[i] = p.z; const l = Math.hypot(t.x, t.z) || 1; P.tx[i] = t.x / l; P.tz[i] = t.z / l;
  }
  P.at = (s, off = 0) => {
    const f = clamp(s / STEP, 0, N - 1), i = Math.floor(f), j = Math.min(N - 1, i + 1), k = f - i;
    const tx = lerp(P.tx[i], P.tx[j], k), tz = lerp(P.tz[i], P.tz[j], k);
    return { x: lerp(P.x[i], P.x[j], k) - tz * off, z: lerp(P.z[i], P.z[j], k) + tx * off, tx, tz, h: Math.atan2(tx, tz) };
  };
  // أقرب نقطة (بحث محلي حول آخر موضع)
  P.near = (x, z, hint) => {
    let bi = hint, bd = Infinity;
    const a = Math.max(0, hint - 40), b = Math.min(N - 1, hint + 60);
    for (let i = a; i <= b; i++) { const d = (P.x[i] - x) ** 2 + (P.z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
    const lat = -(x - P.x[bi]) * P.tz[bi] + (z - P.z[bi]) * P.tx[bi];
    return { i: bi, s: bi * STEP, lat, d: Math.sqrt(bd) };
  };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < N; i++) { minX = Math.min(minX, P.x[i]); maxX = Math.max(maxX, P.x[i]); minZ = Math.min(minZ, P.z[i]); maxZ = Math.max(maxZ, P.z[i]); }
  P.box = { minX, maxX, minZ, maxZ };
  return P;
}
// شريط على طول المسار (طريق، ضفة، كتف) بين إزاحتين جانبيتين
function strip(P, o0, o1, y0, y1, mat, uvLen, s0 = 0, s1 = P.len + 30, uvW = 1) {
  const v = [], uv = [], idx = [];
  const n = Math.ceil((s1 - s0) / 3);
  for (let k = 0; k <= n; k++) {
    const s = s0 + ((s1 - s0) * k) / n, a = P.at(s, o0), b = P.at(s, o1);
    v.push(a.x, y0, a.z, b.x, y1, b.z); uv.push(0, s / uvLen, uvW, s / uvLen);
    if (k < n) { const q = k * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  let up = 0; for (let i = 0; i < g.attributes.normal.count; i++) up += g.attributes.normal.getY(i);
  if (up < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  const m = new THREE.Mesh(g, mat); m.receiveShadow = !LITE;
  return m;
}

// ===================================================================== عناصر العالم
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function vcolorGeo(parts) {
  // parts: [geometry, color]
  const gs = parts.map(([g, c]) => {
    g = g.index ? g.toNonIndexed() : g; g.deleteAttribute("uv");
    const col = new THREE.Color(c), arr = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) { arr[i] = col.r; arr[i + 1] = col.g; arr[i + 2] = col.b; }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3)); return g;
  });
  return mergeGeometries(gs, false);
}
const GEO = {};
GEO.tree = vcolorGeo([
  [new THREE.CylinderGeometry(0.22, 0.32, 3, 7).translate(0, 1.5, 0), 0x6b4a2e],
  [new THREE.IcosahedronGeometry(1.7, 1).translate(0, 3.8, 0), 0x3f8a3a],
  [new THREE.IcosahedronGeometry(1.3, 1).translate(0.9, 3.2, 0.3), 0x4c9a40],
  [new THREE.IcosahedronGeometry(1.25, 1).translate(-0.8, 3.3, -0.4), 0x357a34],
  [new THREE.IcosahedronGeometry(1.1, 1).translate(0.1, 4.9, 0.2), 0x5aa848],
]);
GEO.pine = vcolorGeo([
  [new THREE.CylinderGeometry(0.18, 0.26, 2, 6).translate(0, 1, 0), 0x6b4a2e],
  [new THREE.ConeGeometry(1.9, 2.6, 9).translate(0, 2.8, 0), 0x2e6b3f],
  [new THREE.ConeGeometry(1.5, 2.3, 9).translate(0, 4.1, 0), 0x347a46],
  [new THREE.ConeGeometry(1.0, 2.0, 9).translate(0, 5.3, 0), 0x3b8a4e],
]);
GEO.house = vcolorGeo([
  [new THREE.BoxGeometry(6, 4, 5).translate(0, 2, 0), 0xffffff],
]);
GEO.roof = (() => { const s = new THREE.Shape(); s.moveTo(-3.5, 0); s.lineTo(3.5, 0); s.lineTo(0, 2.4); s.lineTo(-3.5, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 5.6, bevelEnabled: false }); g.translate(0, 4, -2.8); return g; })();
GEO.cone = vcolorGeo([[new THREE.ConeGeometry(0.3, 0.8, 14).translate(0, 0.45, 0), 0xff5a00], [new THREE.CylinderGeometry(0.15, 0.19, 0.12, 14).translate(0, 0.5, 0), 0xffffff], [new THREE.BoxGeometry(0.6, 0.06, 0.6).translate(0, 0.03, 0), 0x222222]]);
GEO.barrel = vcolorGeo([[new THREE.CylinderGeometry(0.45, 0.45, 1.1, 16).translate(0, 0.55, 0), 0x2a7fd4], [new THREE.CylinderGeometry(0.46, 0.46, 0.12, 16).translate(0, 0.75, 0), 0xffffff], [new THREE.CylinderGeometry(0.46, 0.46, 0.12, 16).translate(0, 0.35, 0), 0xffffff]]);
GEO.barrier = vcolorGeo([[new THREE.BoxGeometry(3, 0.9, 0.45).translate(0, 0.45, 0), 0xd9d6cf], [new THREE.BoxGeometry(3.02, 0.18, 0.47).translate(0, 0.75, 0), 0xe63946]]);
GEO.rock = new THREE.DodecahedronGeometry(1, 0);
GEO.star = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.42 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 }); g.center(); return g;
})();
const MAT = {
  vc: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
  star: new THREE.MeshStandardMaterial({ color: 0xffc300, metalness: 0.7, roughness: 0.25, emissive: 0x8a5200, emissiveIntensity: 0.7 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
  roof: std(0xb5452c),
  rock: std(0x7d7a74, { flatShading: true, roughness: 1 }),
};
function inst(geo, mat, list, shadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const o = new THREE.Object3D();
  list.forEach((it, i) => {
    o.position.set(it.x, it.y || 0, it.z); o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    const s = it.s || 1; o.scale.set(it.sx || s, it.sy || s, it.sz || s); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    if (it.c !== undefined) m.setColorAt(i, new THREE.Color(it.c));
  });
  m.count = list.length; m.castShadow = shadow && !LITE; m.receiveShadow = !LITE;
  return m;
}
function textPlate(text, w, h, bg = "#0b6b3a", fg = "#fff") {
  const t = canvasTex(1024, 128, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = "#fff"; g.lineWidth = 8; g.strokeRect(6, 6, W - 12, H - 12);
    g.fillStyle = fg; g.font = "bold 68px Baloo, sans-serif"; g.textAlign = "center"; g.direction = "rtl"; g.fillText(text, W / 2, 90);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
}
function checkerTex() { return canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * 16, y * 16, 16, 16); } }); }
function gate(P, s, label, final) {
  const a = P.at(s), g = new THREE.Group(); g.position.set(a.x, 0, a.z); g.rotation.y = a.h;
  const steel = std(0xe8e8e8, { metalness: 0.6, roughness: 0.35 });
  for (const x of [-8.2, 8.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 8, 12), steel); p.position.set(x, 4, 0); p.castShadow = !LITE; g.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(17, 1.6, 0.5), final ? new THREE.MeshBasicMaterial({ map: checkerTex() }) : std(0xffb703)); top.position.y = 8; g.add(top);
  const t = textPlate(label, 10, 1.3, final ? "#b91c1c" : "#0b6b3a"); t.position.set(0, 8, -0.3); t.rotation.y = Math.PI; g.add(t);
  return g;
}
function addStars(W, P, count, yfn, offFn) {
  const list = [];
  for (let k = 0; k < count; k++) {
    const s = 40 + ((P.len - 80) * (k + 0.5)) / count, off = offFn(s, k), a = P.at(s, off);
    list.push({ x: a.x, y: yfn(s, k), z: a.z, taken: false });
  }
  W.stars = list;
  W.starMesh = inst(GEO.star, MAT.star, list.map((p) => ({ ...p, s: 0.9 })), false);
  W.root.add(W.starMesh);
}

// ===================================================================== بناء العوالم
function newWorld(leg) {
  const W = { leg, root: new THREE.Group(), obs: [], ramps: [], traffic: [], movers: [], rings: [], stars: [], fog: [150, 900], half: 6.5, wall: 15 };
  W.P = makePath(leg);
  W.R = rng(leg.seed * 31 + 7);
  scene.add(W.root);
  return W;
}
function ground(W, tex, rep, color = 0xffffff, y = -0.02, pad = 500) {
  const b = W.P.box, w = b.maxX - b.minX + pad * 2, d = b.maxZ - b.minZ + pad * 2;
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(w / rep, d / rep);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, color, roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.position.set((b.minX + b.maxX) / 2, y, (b.minZ + b.maxZ) / 2); g.receiveShadow = !LITE;
  W.root.add(g); return g;
}
function scatter(W, n, dMin, dMax, fn, avoid = 0) {
  const P = W.P, R = W.R, out = [];
  for (let k = 0; k < n * 3 && out.length < n; k++) {
    const s = R() * (P.len + 120) - 60, side = R() < 0.5 ? -1 : 1, off = side * (dMin + R() * (dMax - dMin));
    const a = P.at(clamp(s, 0, P.len), off);
    if (avoid && P.near(a.x, a.z, Math.round(clamp(s, 0, P.len) / P.step)).d < avoid) continue;
    out.push(fn(a, R, side, s));
  }
  return out;
}
function trees(W, n, dMin, dMax) {
  const t = scatter(W, n, dMin, dMax, (a, R) => ({ x: a.x, z: a.z, ry: R() * 6.3, s: 0.8 + R() * 0.7, pine: R() < 0.35 }), dMin - 1);
  W.root.add(inst(GEO.tree, MAT.vc, t.filter((x) => !x.pine)), inst(GEO.pine, MAT.vc, t.filter((x) => x.pine)));
}
function houses(W, n, dMin, dMax) {
  const COLS = [0xffd6a5, 0xfdffb6, 0xcaffbf, 0xa0c4ff, 0xffc6ff, 0xf1f1f1];
  const h = scatter(W, n, dMin, dMax, (a, R, side) => ({ x: a.x, z: a.z, ry: a.h + (side > 0 ? -Math.PI / 2 : Math.PI / 2), c: COLS[(R() * COLS.length) | 0], s: 0.9 + R() * 0.3 }), dMin - 2);
  W.root.add(inst(GEO.house, MAT.wall, h), inst(GEO.roof, MAT.roof, h.map((x) => ({ ...x, c: undefined }))));
}
function obstacle(W, x, z, r, y1 = 2, y0 = 0, extra = {}) { W.obs.push({ x, z, r, y0, y1, ...extra }); }

function buildRoad(W) {
  const { P, R, leg } = W;
  W.half = 6.5; W.wall = 16;
  ground(W, TEX.grass, 12);
  const road = new THREE.MeshStandardMaterial({ map: TEX.asphalt, roughness: 0.9 });
  W.root.add(strip(P, -6.5, 6.5, 0.03, 0.03, road, 14, -20));
  const grav = new THREE.MeshStandardMaterial({ map: TEX.gravel, roughness: 1 });
  W.root.add(strip(P, 6.5, 8.2, 0.02, 0.02, grav, 4, -20), strip(P, -8.2, -6.5, 0.02, 0.02, grav, 4, -20));
  // أعمدة عاكسة على الجانبين
  const posts = [];
  for (let s = 0; s < P.len; s += 22) for (const o of [-8.6, 8.6]) { const a = P.at(s, o); posts.push({ x: a.x, z: a.z }); }
  W.root.add(inst(vcolorGeo([[new THREE.BoxGeometry(0.14, 1.1, 0.14).translate(0, 0.55, 0), 0xffffff], [new THREE.BoxGeometry(0.15, 0.15, 0.15).translate(0, 0.95, 0), 0xff7a00]]), MAT.vc, posts, false));
  trees(W, Math.round(P.len / (LITE ? 9 : 5)), 13, 90);
  houses(W, Math.round(P.len / 70), 22, 70);
  // تلال بعيدة
  const hills = scatter(W, 14, 180, 320, (a, R) => { const s = 40 + R() * 40; return { x: a.x, z: a.z, y: -12, s, sy: s * (0.4 + R() * 0.3) }; });
  W.root.add(inst(new THREE.SphereGeometry(1, 20, 12), std(0x6f9a4a, { roughness: 1 }), hills, false));
  // عقبات الطريق
  const cones = [], barrels = [], bars = [];
  for (let s = 70; s < P.len - 70; s += 40 + R() * 40) {
    if (R() > (leg.cones || 0)) continue;
    const kind = R(), lane = R() < 0.5 ? -1 : 1;
    if (kind < 0.45) { for (let k = 0; k < 4; k++) { const a = P.at(s + k * 2.5, lane * (1.5 + k * 0.9)); cones.push({ x: a.x, z: a.z }); obstacle(W, a.x, a.z, 0.45, 0.9); } }
    else if (kind < 0.75) { for (let k = 0; k < 3; k++) { const a = P.at(s + (k % 2) * 1.2, lane * (2 + k * 1.1)); barrels.push({ x: a.x, z: a.z }); obstacle(W, a.x, a.z, 0.55, 1.1); } }
    else { const a = P.at(s, lane * 3.2); bars.push({ x: a.x, z: a.z, ry: a.h + Math.PI / 2 }); for (const d of [-1, 0, 1]) { const b = P.at(s, lane * 3.2 + d * 1.2); obstacle(W, b.x, b.z, 0.6, 0.9); } }
  }
  W.root.add(inst(GEO.cone, MAT.vc, cones), inst(GEO.barrel, MAT.vc, barrels), inst(GEO.barrier, MAT.vc, bars));
  // منحدرات القفز (للدراجة)
  if (leg.ramps) {
    const rampT = canvasTex(128, 256, (g) => { g.fillStyle = "#ffb703"; g.fillRect(0, 0, 128, 256); g.strokeStyle = "#222"; g.lineWidth = 14; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10, 40 + i * 60); g.lineTo(64, 10 + i * 60); g.lineTo(118, 40 + i * 60); g.stroke(); } });
    for (let k = 0; k < leg.ramps; k++) {
      const s = 150 + ((P.len - 300) * k) / Math.max(1, leg.ramps - 1), a = P.at(s);
      const geo = new THREE.BufferGeometry(), L = 7, Wd = 6, H = 1.4;
      const v = [-Wd / 2, 0, -L / 2, Wd / 2, 0, -L / 2, Wd / 2, H, L / 2, -Wd / 2, H, L / 2, -Wd / 2, 0, L / 2, Wd / 2, 0, L / 2];
      geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1], 2));
      geo.setIndex([0, 2, 1, 0, 3, 2, 4, 3, 0, 1, 2, 5, 3, 4, 5, 3, 5, 2]); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: rampT, roughness: 0.7, side: THREE.DoubleSide }));
      m.position.set(a.x, 0.03, a.z); m.rotation.y = a.h; m.castShadow = !LITE; W.root.add(m);
      W.ramps.push({ s, len: L, h: H });
    }
  }
  addStars(W, P, Math.round(P.len / 45), () => 1.3, (s, k) => Math.sin(k * 1.7) * 3.2);
  // السير (للشاحنة): سيارات في الاتجاهين
  if (leg.traffic) {
    const COLS = [0xd62828, 0x2a9d8f, 0xf4a261, 0x6a4c93, 0xe9c46a, 0x457b9d, 0xffffff, 0x222222];
    for (let k = 0; k < leg.traffic; k++) {
      const same = k % 3 === 0, o = tinted("car", COLS[k % COLS.length]);
      const t = { o, s: 90 + R() * (P.len - 140), lane: same ? 3.2 : -3.2, dir: same ? 1 : -1, v: same ? 7 + R() * 3 : 9 + R() * 4, stop: 0 };
      W.root.add(o); W.traffic.push(t);
    }
  }
  const last = W.leg.last;
  W.root.add(gate(P, P.len - 8, last ? "خط النهاية" : "النقطة التالية", last));
}
function buildCity(W) {
  const { P, R } = W;
  W.half = 30; W.wall = 70; W.fog = [250, 1100];
  ground(W, TEX.concrete, 40, 0xc0c0bc);
  // مبانٍ: شبكة واحدة لكل المباني (نوافذ مكررة حسب الارتفاع)
  const geos = [];
  const addB = (x, z, w, d, h, ry, obs) => {
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); const ww = face < 2 ? d : w; uv.setXY(i, uv.getX(i) * ww / 8, uv.getY(i) * h / 8); }
    g.rotateY(ry); g.translate(x, h / 2, z); geos.push(g);
    if (obs) obstacle(W, x, z, Math.max(w, d) * 0.62, h, 0, { bw: w, bd: d, bry: ry });
  };
  scatter(W, LITE ? 70 : 130, 40, 260, (a, R) => addB(a.x, a.z, 14 + R() * 14, 14 + R() * 14, 12 + R() * 55, a.h, true), 36);
  // أبراج على الطريق: إمّا فوقها وإمّا حولها
  for (let s = 140; s < P.len - 120; s += 110 + R() * 60) { const a = P.at(s, (R() - 0.5) * 20); addB(a.x, a.z, 12, 12, 28 + R() * 22, a.h, true); }
  const winT = TEX.windows.clone(); winT.needsUpdate = true; winT.repeat.set(1, 1);
  const city = new THREE.Mesh(mergeGeometries(geos, false), new THREE.MeshStandardMaterial({ map: winT, roughness: 0.6, metalness: 0.2 }));
  city.castShadow = city.receiveShadow = !LITE; W.root.add(city);
  // مناطيد هوائية
  const bal = [];
  for (let s = 200; s < P.len - 150; s += 150 + R() * 80) { const a = P.at(s, (R() - 0.5) * 30), y = 22 + R() * 25; bal.push({ x: a.x, y, z: a.z, c: [0xe63946, 0xffb703, 0x2a9d8f, 0x8338ec][(R() * 4) | 0] }); obstacle(W, a.x, a.z, 5, y + 5, y - 7); }
  const bGeo = vcolorGeo([[new THREE.SphereGeometry(5, 20, 14), 0xffffff], [new THREE.CylinderGeometry(1.2, 1.2, 1.4, 10).translate(0, -7, 0), 0x8a5a2b]]);
  W.root.add(inst(bGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), bal));
  trees(W, 40, 20, 200);
  // مهبط البداية ومطار النهاية
  const pad = (s) => { const a = P.at(s), m = new THREE.Group(); m.position.set(a.x, 0, a.z); m.rotation.y = a.h;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.4, 32), std(0x2f3542)); base.position.y = 0.2; m.add(base);
    const H = textPlate("H", 6, 6, "#2f3542", "#ffd60a"); H.rotation.x = -Math.PI / 2; H.position.y = 0.42; m.add(H); return m; };
  W.root.add(pad(0));
  const endPad = pad(P.len); W.root.add(endPad); W.padEnd = P.at(P.len);
  const e = P.at(P.len + 60, 0), rw = new THREE.Mesh(new THREE.PlaneGeometry(40, 400), new THREE.MeshStandardMaterial({ map: TEX.runway, roughness: 0.9 }));
  rw.rotation.x = -Math.PI / 2; rw.rotation.z = -e.h + Math.PI / 2; rw.position.set(e.x - e.tz * 60, 0.05, e.z + e.tx * 60); W.root.add(rw);
  const term = new THREE.Mesh(new THREE.BoxGeometry(60, 12, 24), std(0xe8eef5, { metalness: 0.3, roughness: 0.3 })); term.position.set(e.x + e.tz * 50, 6, e.z - e.tx * 50); term.rotation.y = e.h; W.root.add(term);
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 30, 12), std(0xf1f1f1)); tw.position.set(e.x + e.tz * 30, 15, e.z - e.tx * 30 + 20); W.root.add(tw);
  addStars(W, P, Math.round(P.len / 40), (s, k) => 18 + Math.sin(k * 0.9) * 10 + (k % 3) * 4, (s, k) => Math.sin(k * 1.3) * 8);
  W.starR = 4.5; W.starS = 1.8;
}
function buildSky(W) {
  const { P, R } = W;
  W.half = 60; W.wall = 140; W.fog = [600, 2600];
  ground(W, TEX.grass, 60, 0xd9e8c0, -0.02, 1200);
  // حقول ملوّنة
  const fields = scatter(W, LITE ? 60 : 140, 30, 900, (a, R) => ({ x: a.x, z: a.z, y: 0.05, ry: R() * 3, sx: 60 + R() * 120, sz: 40 + R() * 100, sy: 1, c: [0xc9b458, 0x8fbf4a, 0xa77b4a, 0x6aa84f, 0xe0c068][(R() * 5) | 0] }), 50);
  W.root.add(inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 1 }), fields, false));
  trees(W, LITE ? 150 : 400, 40, 800);
  houses(W, 80, 60, 700);
  // جبال بعيدة
  const mts = scatter(W, 30, 500, 1400, (a, R) => ({ x: a.x, z: a.z, s: 1, sx: 160 + R() * 200, sy: 150 + R() * 250, sz: 160 + R() * 200 }));
  W.root.add(inst(new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0), std(0x7f8f86, { flatShading: true, roughness: 1 }), mts, false));
  // غيوم: بيضاء للزينة، وداكنة (عاصفة) يجب تجنّبها
  const cl = [], storm = [];
  const puff = (list, x, y, z, s) => { for (let k = 0; k < 6; k++) list.push({ x: x + (R() - 0.5) * s * 3, y: y + (R() - 0.5) * s * 0.6, z: z + (R() - 0.5) * s * 2, s: s * (0.6 + R() * 0.6), sy: s * 0.5 }); };
  scatter(W, LITE ? 25 : 60, 0, 600, (a, R) => puff(cl, a.x, 120 + R() * 160, a.z, 14 + R() * 10));
  for (let s = 700; s < P.len - 900; s += 260 + R() * 200) { const a = P.at(s, (R() - 0.5) * 60), y = 90 + R() * 80; puff(storm, a.x, y, a.z, 16); obstacle(W, a.x, a.z, 26, y + 14, y - 14, { storm: true }); }
  W.root.add(inst(new THREE.SphereGeometry(1, 12, 8), std(0xffffff, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25 }), cl, false));
  W.root.add(inst(new THREE.SphereGeometry(1, 12, 8), std(0x5a5f6e, { roughness: 1 }), storm, false));
  // مناطيد
  const bal = [];
  for (let s = 900; s < P.len - 900; s += 300 + R() * 200) { const a = P.at(s, (R() - 0.5) * 50), y = 80 + R() * 90; bal.push({ x: a.x, y, z: a.z, s: 2.2, c: [0xe63946, 0xffb703, 0x2a9d8f][(R() * 3) | 0] }); obstacle(W, a.x, a.z, 12, y + 12, y - 16); }
  const bGeo = vcolorGeo([[new THREE.SphereGeometry(5, 20, 14), 0xffffff], [new THREE.CylinderGeometry(1.2, 1.2, 1.4, 10).translate(0, -7, 0), 0x8a5a2b]]);
  W.root.add(inst(bGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), bal));
  // حلقات ذهبية (الطيران خلالها = نجمة)
  const ringGeo = new THREE.TorusGeometry(11, 0.9, 10, 40);
  for (let s = 800; s < P.len - 900; s += 170) {
    const a = P.at(s, Math.sin(s * 0.004) * 25), y = 110 + Math.sin(s * 0.003) * 50;
    const m = new THREE.Mesh(ringGeo, MAT.star); m.position.set(a.x, y, a.z); m.rotation.y = a.h; W.root.add(m);
    W.rings.push({ x: a.x, y, z: a.z, m, taken: false });
  }
  W.stars = [];
  // مدرجا المطارين
  for (const [s0, label] of [[0, "مطار البداية"], [P.len - 650, "مطار الوصول"]]) {
    const L = 650, a = P.at(s0 + L / 2);
    const rw = new THREE.Mesh(new THREE.PlaneGeometry(36, L + 40), new THREE.MeshStandardMaterial({ map: (() => { const t = TEX.runway.clone(); t.needsUpdate = true; t.repeat.set(1, L / 80); return t; })(), roughness: 0.9 }));
    rw.rotation.x = -Math.PI / 2; rw.rotation.z = a.h; rw.position.set(a.x, 0.06, a.z); rw.receiveShadow = !LITE; W.root.add(rw);
    const b = P.at(s0 + L / 2, 70), term = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 120), std(0xe8eef5, { metalness: 0.3, roughness: 0.3 })); term.position.set(b.x, 7, b.z); term.rotation.y = a.h; W.root.add(term);
    const sign = textPlate(label, 30, 4); const c = P.at(s0 + L / 2, 54); sign.position.set(c.x, 16, c.z); sign.rotation.y = a.h - Math.PI / 2; W.root.add(sign);
  }
}
function water(W, color = 0x1d6f9a, pad = 900) {
  const b = W.P.box, w = b.maxX - b.minX + pad * 2, d = b.maxZ - b.minZ + pad * 2;
  const n = TEX.waterN.clone(); n.needsUpdate = true; n.repeat.set(w / 40, d / 40);
  const m = LITE ? new THREE.MeshLambertMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.12, metalness: 0.15, normalMap: n, normalScale: new THREE.Vector2(0.5, 0.5) });
  const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); g.rotation.x = -Math.PI / 2; g.position.set((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2); g.receiveShadow = !LITE;
  W.root.add(g); W.water = n; return g;
}
function buildRiver(W) {
  const { P, R } = W;
  W.half = 15; W.wall = 15.5; W.fog = [180, 900];
  water(W, 0x2b6f86);
  const grass = new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 }), sand = new THREE.MeshStandardMaterial({ map: TEX.sand, roughness: 1 });
  const endBank = P.len - 90;
  for (const sd of [-1, 1]) {
    W.root.add(strip(P, sd * 16, sd * 22, -0.6, 0.9, sand, 6, -40, endBank, 1));
    const g = strip(P, sd * 22, sd * 260, 0.9, 2.5, grass, 14, -40, endBank, 30); W.root.add(g);
  }
  // شاطئ وفنار عند المصب
  const e = P.at(P.len + 20, 0);
  const lh = new THREE.Group(); lh.position.set(e.x - e.tz * 40, 0, e.z + e.tx * 40);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 22, 16), std(0xffffff)); tower.position.y = 11; lh.add(tower);
  for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(2.6 - k * 0.3, 2.7 - k * 0.3, 2.5, 16), std(0xd62828)); r.position.y = 4 + k * 6; lh.add(r); }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff2a8 })); lamp.position.y = 23; lh.add(lamp);
  const isle = new THREE.Mesh(new THREE.CylinderGeometry(10, 14, 3, 20), new THREE.MeshStandardMaterial({ map: TEX.sand })); isle.position.y = 0.5; lh.add(isle);
  W.root.add(lh);
  trees(W, Math.round(P.len / (LITE ? 6 : 3.5)), 26, 200);
  houses(W, Math.round(P.len / 60), 40, 160);
  // جسور
  for (const s of [P.len * 0.33, P.len * 0.66]) {
    const a = P.at(s), g = new THREE.Group(); g.position.set(a.x, 0, a.z); g.rotation.y = a.h;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(44, 1.2, 8), std(0xb8b0a0)); deck.position.y = 9; g.add(deck);
    for (const x of [-17, 17]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 6), std(0xa09888)); p.position.set(x, 4.5, 0); g.add(p); }
    for (const x of [-20, 20]) for (const z of [-3.6, 3.6]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2), std(0xd62828)); r.position.set(x * 0.5, 10, z); }
    W.root.add(g);
  }
  // صخور وجذوع وعوّامات في النهر
  const rocks = [], logs = [], buoys = [];
  for (let s = 60; s < P.len - 60; s += 35 + R() * 35) {
    const off = (R() - 0.5) * 22, a = P.at(s, off), k = R();
    if (k < 0.5) { const r = 1.2 + R() * 1.4; rocks.push({ x: a.x, z: a.z, y: 0.2, s: r, ry: R() * 6 }); obstacle(W, a.x, a.z, r, 2); }
    else if (k < 0.8) { logs.push({ x: a.x, z: a.z, y: 0.15, ry: R() * 6, rz: Math.PI / 2 }); const d = P.at(s, off); obstacle(W, d.x, d.z, 2.2, 1); }
    else { buoys.push({ x: a.x, z: a.z, c: R() < 0.5 ? 0xe63946 : 0x2a9d8f }); obstacle(W, a.x, a.z, 0.8, 2); }
  }
  W.root.add(inst(GEO.rock, MAT.rock, rocks), inst(new THREE.CylinderGeometry(0.45, 0.5, 4.5, 10), std(0x6b4a2e), logs));
  W.root.add(inst(vcolorGeo([[new THREE.CylinderGeometry(0.6, 0.8, 1.6, 12).translate(0, 0.4, 0), 0xffffff], [new THREE.ConeGeometry(0.5, 1, 12).translate(0, 1.6, 0), 0xffffff]]), new THREE.MeshStandardMaterial({ roughness: 0.5 }), buoys));
  // بطّات تسبح
  const duckGeo = vcolorGeo([[new THREE.SphereGeometry(0.35, 12, 8).scale(1, 0.7, 1.4), 0xf4d35e], [new THREE.SphereGeometry(0.2, 10, 8).translate(0, 0.3, 0.35), 0xf4d35e], [new THREE.ConeGeometry(0.08, 0.2, 8).rotateX(Math.PI / 2).translate(0, 0.28, 0.6), 0xf4842d]]);
  for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(duckGeo, MAT.vc); const s = 80 + R() * (P.len - 160); W.movers.push({ o: m, s, off: (R() - 0.5) * 20, sp: 0.6 + R() * 0.6, kind: "duck" }); W.root.add(m); }
  addStars(W, P, Math.round(P.len / 40), () => 1.3, (s, k) => Math.sin(k * 1.1) * 8);
  W.root.add(gate(P, P.len - 8, "البحر!", false));
}
function buildSea(W) {
  const { P, R } = W;
  W.half = 70; W.wall = 95; W.fog = [400, 2200];
  water(W, 0x165a85, 1500);
  // جزر خارج القناة وصخور داخلها
  const isl = scatter(W, 18, 140, 700, (a, R) => { const s = 30 + R() * 50; return { x: a.x, z: a.z, s, sy: s * (0.25 + R() * 0.25) }; }, 120);
  W.root.add(inst(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshStandardMaterial({ map: TEX.sand, roughness: 1 }), isl, false));
  W.root.add(inst(new THREE.SphereGeometry(0.8, 24, 12).translate(0, 0.25, 0), std(0x4c8a3a, { roughness: 1 }), isl.map((i) => ({ ...i, s: i.s * 0.9, sy: i.sy * 1.3 })), false));
  const rocks = [];
  for (let s = 250; s < P.len - 200; s += 160 + R() * 120) { const a = P.at(s, (R() < 0.5 ? -1 : 1) * (22 + R() * 30)), r = 3 + R() * 3; rocks.push({ x: a.x, z: a.z, y: 0.5, s: r, ry: R() * 6 }); obstacle(W, a.x, a.z, r, 6); }
  W.root.add(inst(GEO.rock, MAT.rock, rocks));
  // عوّامات القناة
  const buoys = [];
  for (let s = 60; s < P.len; s += 90) for (const sd of [-1, 1]) { const a = P.at(s, sd * 66); buoys.push({ x: a.x, z: a.z, s: 2, c: sd > 0 ? 0x2a9d8f : 0xe63946 }); }
  W.root.add(inst(vcolorGeo([[new THREE.CylinderGeometry(0.6, 0.8, 1.6, 12).translate(0, 0.4, 0), 0xffffff], [new THREE.ConeGeometry(0.5, 1, 12).translate(0, 1.6, 0), 0xffffff]]), new THREE.MeshStandardMaterial({ roughness: 0.5 }), buoys));
  // سفن صغيرة تعبر القناة
  for (let k = 0; k < 5; k++) {
    const o = tinted("boat", [0xffffff, 0xffb703, 0xe63946, 0x2a9d8f, 0x8338ec][k]); o.scale.setScalar(2.2);
    const s = 250 + k * ((P.len - 400) / 5); W.movers.push({ o, s, off: -80 + R() * 40, sp: 5 + R() * 3, kind: "cross", r: 5 }); W.root.add(o);
  }
  // الميناءان
  for (const [s0, label] of [[-30, "ميناء البداية"], [P.len + 25, "الضفة الأخرى"]]) {
    const a = P.at(clamp(s0, 0, P.len)), g = new THREE.Group();
    const c = P.at(clamp(s0, 0, P.len)); g.position.set(c.x + (s0 < 0 ? -c.tx * 30 : c.tx * 30), 0, c.z + (s0 < 0 ? -c.tz * 30 : c.tz * 30)); g.rotation.y = a.h;
    const dock = new THREE.Mesh(new THREE.BoxGeometry(260, 4, 40), new THREE.MeshStandardMaterial({ map: TEX.concrete, roughness: 1 })); dock.position.y = 1.5; g.add(dock);
    for (let k = -2; k <= 2; k++) {
      const cr = new THREE.Group(); cr.position.set(k * 45, 3.5, s0 < 0 ? -8 : 8);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 30, 2), std(0xe63946)); leg.position.y = 15; cr.add(leg);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 40), std(0xe63946)); arm.position.set(0, 30, s0 < 0 ? 8 : -8); cr.add(arm);
      g.add(cr);
    }
    for (let k = 0; k < 12; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 2.5), std([0xc0392b, 0x2471a3, 0x229954, 0xd68910][k % 4])); b.position.set(-110 + k * 20, 4.8, (s0 < 0 ? -1 : 1) * (12 + (k % 3) * 3)); g.add(b); }
    const sign = textPlate(label, 40, 5); sign.position.set(0, 14, 0); if (s0 > 0) sign.rotation.y = Math.PI; g.add(sign);
    W.root.add(g);
  }
  addStars(W, P, Math.round(P.len / 50), () => 6, (s, k) => Math.sin(k * 0.8) * 30);
  W.starR = 7; W.starS = 3;
  W.root.remove(W.starMesh); W.starMesh = inst(GEO.star, MAT.star, W.stars.map((p) => ({ ...p, s: 3 })), false); W.root.add(W.starMesh);
}
function buildWorld(leg) {
  const W = newWorld(leg);
  ({ road: buildRoad, city: buildCity, sky: buildSky, river: buildRiver, sea: buildSea })[leg.env](W);
  scene.fog.near = W.fog[0]; scene.fog.far = W.fog[1];
  return W;
}
function disposeWorld(W) {
  if (!W) return;
  scene.remove(W.root);
  W.root.traverse((o) => { if (o.isMesh && o.geometry && !Object.values(GEO).includes(o.geometry) && !o.userData.shared) o.geometry.dispose(); });
}

// ===================================================================== الإدخال
const keys = {};
addEventListener("keydown", (e) => { keys[e.key] = true; });
addEventListener("keyup", (e) => { keys[e.key] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
const touch = {};
for (const el of document.querySelectorAll("#touch i")) {
  const k = el.dataset.k;
  el.addEventListener("touchstart", (e) => { e.preventDefault(); touch[k] = true; }, { passive: false });
  el.addEventListener("touchend", (e) => { e.preventDefault(); touch[k] = false; }, { passive: false });
}
addEventListener("touchstart", () => document.body.classList.add("touchy"), { once: true, passive: true });
let prevBtn = {};
function readInput() {
  const pads = K.pads();
  const b = (i) => pads.some((g) => g.buttons[i] && g.buttons[i].pressed);
  const ax = (i) => pads.reduce((m, g) => (Math.abs(g.axes[i] || 0) > Math.abs(m) ? g.axes[i] || 0 : m), 0);
  const sx = ax(0), sy = ax(1);
  const I = {
    steer: clamp((keys.ArrowRight || touch.right || b(15) ? 1 : 0) - (keys.ArrowLeft || touch.left || b(14) ? 1 : 0) + (Math.abs(sx) > 0.15 ? sx : 0), -1, 1),
    up: !!(keys.ArrowUp || touch.up || b(12) || sy < -0.4),
    down: !!(keys.ArrowDown || touch.down || b(13) || sy > 0.4),
    stickY: Math.abs(sy) > 0.15 ? -sy : 0,
    a: !!(keys.Enter || keys[" "] || touch.a || b(0)),
    b: !!(keys.Backspace || touch.pause || b(1)),
    x: !!(keys.h || keys.H || b(2)),
    y: !!(keys.c || keys.C || b(3)),
  };
  if (G.auto && G.P && G.W) {   // للتجربة فقط: قيادة آلية تتبع الطريق
    const p = G.P, t = G.W.P.at(Math.min(G.W.P.len, p.s + (p.V.kind === "plane" ? 300 : 22)));
    let d = Math.atan2(t.x - p.x, t.z - p.z) - p.h; d = Math.atan2(Math.sin(d), Math.cos(d));
    I.steer = clamp(-d * 3, -1, 1); I.up = true;
    const ty = p.V.kind === "heli" ? 30 : 120; I.stickY = p.V.kind === "heli" || p.V.kind === "plane" ? clamp((ty - p.y) / 10, -1, 1) : 1;
  }
  if (I.up && !I.stickY) I.stickY = 1; if (I.down && !I.stickY) I.stickY = -1;
  for (const k of ["a", "b", "x", "y"]) { I[k + "Hit"] = I[k] && !prevBtn[k]; prevBtn[k] = I[k]; }
  return I;
}

// ===================================================================== الصوت
const snd = { o: null };
function engineStart(kind) {
  engineStop();
  const c = K.audioCtx(); if (!c) return;
  try {
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 500; g.gain.value = 0.0;
    lfo.frequency.value = kind === "heli" ? 14 : 30; lg.gain.value = kind === "heli" ? 0.03 : 0.005;
    lfo.connect(lg).connect(g.gain); o.connect(f).connect(g).connect(c.destination); o.start(); lfo.start();
    snd.o = o; snd.f = f; snd.g = g; snd.lfo = lfo; snd.kind = kind;
  } catch {}
}
function engineSet(r) {
  if (!snd.o) return;
  const c = K.audioCtx(), t = c.currentTime, k = snd.kind;
  const base = { ground: 55, water: 45, heli: 40, plane: 70 }[k] || 55;
  snd.o.frequency.setTargetAtTime(base + r * (k === "plane" ? 60 : 90), t, 0.1);
  snd.f.frequency.setTargetAtTime(300 + r * 900, t, 0.1);
  snd.g.gain.setTargetAtTime(0.035 + r * 0.03, t, 0.1);
}
function engineStop() { try { snd.o && snd.o.stop(); snd.lfo && snd.lfo.stop(); } catch {} snd.o = null; }
const horn = () => { K.tone(392, 0.25, "square", 0.06); K.tone(330, 0.25, "square", 0.05); };

// ===================================================================== واجهة اللعب
const hud = $("hud");
function dia(pos) { const on = { t: 1, l: 3, r: 5, b: 7 }[pos]; return `<span class="dia">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<b class="${i === on ? "l" : [1, 3, 5, 7].includes(i) ? "" : "x"}"></b>`).join("")}</span>`; }
function helpFor(kind) {
  const rows = kind === "heli" || kind === "plane"
    ? [["⬆⬇", "صعود ونزول"], ["⬅➡", "التوجيه"], [dia("b"), "أسرع"], [dia("r"), "استراحة"]]
    : [["⬆", "انطلق"], ["⬇", "فرامل"], ["⬅➡", "التوجيه"], [dia("b"), "انطلق أيضاً"], [dia("l"), "البوق"], [dia("r"), "استراحة"]];
  $("hHelp").innerHTML = rows.map(([a, b]) => `<div><b>${a}</b> ${b}</div>`).join("");
}
let msgT = 0;
function showMsg(t, good = false, ms = 1200) { const m = $("hMsg"); m.textContent = t; m.className = "msg on" + (good ? " good" : ""); msgT = performance.now() + ms; }
function stepsHTML(L, li) { return L.legs.map((l, i) => `<span class="${i === li ? "on" : i < li ? "done" : ""}">${VEH[l.veh].ic}</span>`).join("<i>◀</i>") + "<i>◀</i><span>🏁</span>"; }
const mapCv = $("map"), mapG = mapCv.getContext("2d");
let mapBg = null, mapT = null;
function prepMap(P) {
  const b = P.box, span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 60, sc = 170 / span;
  const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
  mapT = (x, z) => [100 - (x - cx) * sc, 100 - (z - cz) * sc];
  mapBg = document.createElement("canvas"); mapBg.width = mapBg.height = 200;
  const g = mapBg.getContext("2d"); g.lineCap = "round"; g.lineJoin = "round";
  for (const [w, c] of [[9, "#e9ecef"], [3, "#ffb703"]]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); for (let i = 0; i < P.n; i += 4) { const [x, y] = mapT(P.x[i], P.z[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  const [ex, ey] = mapT(P.x[P.n - 1], P.z[P.n - 1]); g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 3; g.beginPath(); g.arc(ex, ey, 7, 0, 7); g.fill(); g.stroke();
}
function drawMap(x, z, h) {
  mapG.clearRect(0, 0, 200, 200); if (mapBg) mapG.drawImage(mapBg, 0, 0);
  const [px, py] = mapT(x, z);
  mapG.save(); mapG.translate(px, py); mapG.rotate(Math.PI - h);
  mapG.fillStyle = "#e63946"; mapG.strokeStyle = "#fff"; mapG.lineWidth = 2.5; mapG.beginPath(); mapG.moveTo(0, -10); mapG.lineTo(7, 7); mapG.lineTo(-7, 7); mapG.closePath(); mapG.fill(); mapG.stroke(); mapG.restore();
}

// ===================================================================== اللعب
const G = { state: "menu", W: null, lvl: 0, leg: 0, P: null, t: 0, hits: 0, stars: 0, total: 0, camFar: false };
let showcase = null;
window.__karmo = G;   // للتجربة فقط

function spawnVehicle(W, vk) {
  const V = VEH[vk], P = W.P;
  const o = MODELS[vk].clone(); W.root.add(o);
  const a = P.at(vk === "plane" ? 40 : vk === "ship" ? 45 : 12, W.leg.env === "road" ? 3.2 : 0);
  const p = { vk, V, o, x: a.x, z: a.z, y: V.float || 0, h: a.h, v: 0, vy: 0, vx: 0, vz: 0, idx: 0, s: 0, inv: 0, air: false, alt: 0, phase: "go", roll: 0, pitch: 0 };
  if (V.trailer) { p.tr = MODELS.trailer.clone(); W.root.add(p.tr); p.th = p.h; }
  if (V.seat) { const k = MODELS.karmo_sit.clone(); k.scale.setScalar(V.seat[3]); k.position.set(V.seat[0], V.seat[1], V.seat[2]); o.add(k); }
  if (V.kind === "heli") { p.y = 0.2; p.phase = "lift"; p.rotor = o.getObjectByName("rotor"); p.trotor = o.getObjectByName("tail_rotor"); }
  if (V.kind === "plane") { p.phase = "takeoff"; }
  placeVehicle(p);
  return p;
}
function placeVehicle(p) {
  p.o.position.set(p.x, p.y, p.z); p.o.rotation.set(p.pitch, p.h, p.roll, "YXZ");
  if (p.tr) {
    const hx = p.x - Math.sin(p.h) * 4.75, hz = p.z - Math.cos(p.h) * 4.75;
    p.tr.position.set(hx + Math.sin(p.th) * 1.2, 0, hz + Math.cos(p.th) * 1.2); p.tr.rotation.y = p.th;
  }
}
function circlesOf(p) {
  const out = [], s = Math.sin(p.h), c = Math.cos(p.h);
  for (const [ox, oz, r] of p.V.circles) out.push([p.x + s * oz + c * ox, p.z + c * oz - s * ox, r]);
  if (p.tr) { const s2 = Math.sin(p.th), c2 = Math.cos(p.th); const fx = p.tr.position.x, fz = p.tr.position.z; for (const d of [-2, -5, -8, -11.5]) out.push([fx + s2 * d, fz + c2 * d, 1.4]); }
  return out;
}
function hit(p, nx, nz) {
  if (p.inv > 0) return;
  p.inv = 1.6;
  if (Math.abs(p.v) < 3 && p.V.kind !== "plane") return;   // اصطدام خفيف (واقف تقريباً): لا يُحسب
  G.hits++;
  if (p.V.kind === "plane" || p.V.kind === "heli") p.v = Math.max(p.v * 0.6, p.V.kind === "plane" ? 35 : 4);
  else p.v = -Math.sign(p.v || 1) * Math.min(Math.abs(p.v) * 0.35, 5);
  K.sfx.bad(); showMsg(["انتبه!", "اصطدام!", "حاذر!"][G.hits % 3]);
  try { for (const g of K.pads()) g.vibrationActuator && g.vibrationActuator.playEffect("dual-rumble", { duration: 250, strongMagnitude: 0.7, weakMagnitude: 0.4 }); } catch {}
}
function collide(p, W) {
  const cs = circlesOf(p);
  for (const ob of W.obs) {
    for (const [x, z, r] of cs) {
      const dx = x - ob.x, dz = z - ob.z, d = Math.hypot(dx, dz), rr = r + ob.r;
      if (d >= rr) continue;
      if (p.y + 0.5 > ob.y1 || p.y + 2 < ob.y0) continue;
      if (ob.bw) {   // مبنى مستطيل: فحص أدق
        const c = Math.cos(-ob.bry), s = Math.sin(-ob.bry), lx = dx * c - dz * s, lz = dx * s + dz * c;
        if (Math.abs(lx) > ob.bw / 2 + r || Math.abs(lz) > ob.bd / 2 + r) continue;
      }
      const nx = dx / (d || 1), nz = dz / (d || 1), push = rr - d;
      p.x += nx * push; p.z += nz * push;
      hit(p, nx, nz); return;
    }
  }
  for (const t of W.traffic) {
    const tx = t.o.position.x, tz = t.o.position.z;
    for (const [x, z, r] of cs) {
      for (const k of [-1.2, 1.2]) {
        const ox = tx + Math.sin(t.o.rotation.y) * k, oz = tz + Math.cos(t.o.rotation.y) * k;
        const dx = x - ox, dz = z - oz, d = Math.hypot(dx, dz);
        if (d < r + 1.05) { p.x += (dx / d) * (r + 1.05 - d); p.z += (dz / d) * (r + 1.05 - d); t.stop = 1.5; hit(p); return; }
      }
    }
  }
  for (const m of W.movers) if (m.kind === "cross") {
    for (const [x, z, r] of cs) { const dx = x - m.o.position.x, dz = z - m.o.position.z, d = Math.hypot(dx, dz); if (d < r + m.r) { p.x += (dx / d) * (r + m.r - d); p.z += (dz / d) * (r + m.r - d); hit(p); return; } }
  }
}
function updateGround(p, I, dt, W) {
  const V = p.V, water = V.kind === "water";
  const n = W.P.near(p.x, p.z, p.idx); p.idx = n.i; p.s = n.s;
  const off = Math.abs(n.lat) > W.half + 1.5 && !water;
  const max = V.max * (off ? 0.5 : 1);
  const gas = I.up || I.a, brake = I.down;
  if (!p.air) {
    if (gas && p.v >= -0.5) p.v += V.acc * dt * Math.max(0.15, 1 - p.v / max);
    else if (brake) p.v -= (p.v > 0 ? V.brk : V.acc * 0.6) * dt;
    else p.v -= Math.sign(p.v) * Math.min(Math.abs(p.v), (water ? 1.2 : 2.5) * dt);
    if (p.v > max) p.v -= (p.v - max) * 2 * dt;
    p.v = Math.max(p.v, -6);
    const steer = -I.steer * V.steer * clamp(Math.abs(p.v) / 5, 0, 1) * Math.sign(p.v || 1) / (1 + Math.abs(p.v) / 40);
    p.h += steer * dt;
    p.roll = lerp(p.roll, (p.vk === "moto" ? 0.5 : 0.05) * I.steer * clamp(p.v / V.max, 0, 1), dt * 5);
  }
  const fx = Math.sin(p.h), fz = Math.cos(p.h);
  if (water) { const k = 1 - Math.exp(-dt * V.grip); p.vx = lerp(p.vx, fx * p.v, k); p.vz = lerp(p.vz, fz * p.v, k); }
  else { p.vx = fx * p.v; p.vz = fz * p.v; }
  p.x += p.vx * dt; p.z += p.vz * dt;
  // الجدار غير المرئي على جانبي الطريق
  const m = W.P.near(p.x, p.z, p.idx);
  if (Math.abs(m.lat) > W.wall) {
    const i = m.i, sgn = Math.sign(m.lat), over = Math.abs(m.lat) - W.wall;
    p.x -= -W.P.tz[i] * sgn * over; p.z -= W.P.tx[i] * sgn * over; p.v *= 0.92;
    if (water && p.inv <= 0 && p.v > 3) hit(p);
  }
  // القفز عن المنحدرات (الدراجة)
  if (p.vk === "moto") {
    if (!p.air) for (const r of W.ramps) if (m.s > r.s - r.len / 2 && m.s < r.s + r.len / 2 && Math.abs(m.lat) < 3.2 && p.v > 6) {
      p.y = r.h * clamp((m.s - (r.s - r.len / 2)) / r.len, 0, 1);
      if (m.s > r.s + r.len / 2 - 0.8) { p.air = true; p.vy = 4 + p.v * 0.28; showMsg("قفزة!", true, 900); K.sfx.pop(); }
    }
    if (p.air) { p.vy -= 20 * dt; p.y += p.vy * dt; p.pitch = clamp(-p.vy * 0.03, -0.3, 0.3); if (p.y <= 0) { p.y = 0; p.air = false; p.pitch = 0; } }
    else if (!W.ramps.some((r) => m.s > r.s - r.len / 2 && m.s < r.s + r.len / 2 && Math.abs(m.lat) < 3.2)) p.y = Math.max(0, p.y - dt * 4);
  }
  if (water) { p.y = V.float + Math.sin(G.t * 2.2) * (p.vk === "ship" ? 0.15 : 0.06); p.pitch = Math.sin(G.t * 1.7) * (p.vk === "ship" ? 0.004 : 0.02) - clamp(p.v / V.max, 0, 1) * (p.vk === "boat" ? 0.06 : 0); }
  if (p.tr) p.th += (p.v / 10) * Math.sin(p.h - p.th) * dt;
  collide(p, W);
}
function updateAir(p, I, dt, W) {
  const V = p.V, P = W.P, n = P.near(p.x, p.z, p.idx); p.idx = n.i; p.s = n.s;
  if (p.vk === "heli") {
    if (p.phase === "lift") { p.y += 6 * dt; p.v = lerp(p.v, 0, dt); if (p.y > 14) p.phase = "fly"; }
    else if (p.phase === "fly") {
      const target = V.max * (I.a ? 1 : I.x ? 0.4 : 0.72);
      p.v = lerp(p.v, target, dt * 0.8);
      p.vy = lerp(p.vy, I.stickY * 9, dt * 3); p.y = clamp(p.y + p.vy * dt, 4, 95);
      p.h += -I.steer * V.steer * dt;
      if (p.s > P.len - 45) { p.phase = "land"; showMsg("هبوط!", true); }
    } else if (p.phase === "land") {
      const e = W.padEnd; p.x = lerp(p.x, e.x, dt * 1.5); p.z = lerp(p.z, e.z, dt * 1.5); p.v = lerp(p.v, 0, dt * 2); p.y = Math.max(0.2, p.y - dt * 7);
      if (p.y <= 0.25 && Math.hypot(p.x - e.x, p.z - e.z) < 1.5) p.phase = "done";
    }
    p.roll = lerp(p.roll, 0.35 * I.steer * (p.phase === "fly" ? 1 : 0), dt * 3); p.pitch = lerp(p.pitch, (p.v / V.max) * 0.18, dt * 2);
    if (p.rotor) p.rotor.rotation.y += dt * 28; if (p.trotor) p.trotor.rotation.x += dt * 40;
  } else {   // طائرة الركاب
    if (p.phase === "takeoff") {
      p.v += 9 * dt; const a = P.at(p.s + 20); p.h = lerp(p.h, a.h, dt * 2);
      if (p.v > 42) { p.vy = lerp(p.vy, 9, dt * 2); p.y += p.vy * dt; p.pitch = lerp(p.pitch, -0.14, dt * 2); }
      if (p.y > 45) { p.phase = "fly"; showMsg("أقلعنا!", true); }
    } else if (p.phase === "fly") {
      p.v = lerp(p.v, V.max * (I.a ? 1.2 : 1), dt * 0.6);
      p.vy = lerp(p.vy, I.stickY * 22, dt * 2); p.y = clamp(p.y + p.vy * dt, 40, 280);
      p.h += -I.steer * V.steer * dt;
      p.roll = lerp(p.roll, 0.6 * I.steer, dt * 2.5); p.pitch = lerp(p.pitch, -p.vy * 0.012, dt * 3);
      if (p.s > P.len - 1400) { p.phase = "land"; showMsg("هبوط تلقائي…", true, 1800); }
    } else if (p.phase === "land") {
      const rest = P.len - p.s, a = P.at(Math.min(P.len, p.s + 60));
      const glide = clamp((rest - 520) * 0.12, 0, 400);
      p.h = lerp(p.h, a.h, dt * 1.5);
      p.x += P.tz[n.i] * n.lat * dt * 0.8; p.z -= P.tx[n.i] * n.lat * dt * 0.8;
      p.y = lerp(p.y, glide, dt * 1.5); p.roll = lerp(p.roll, 0, dt * 2); p.pitch = lerp(p.pitch, p.y > 2 ? 0.03 : 0, dt * 2);
      p.v = p.y < 1 ? Math.max(0, p.v - 14 * dt) : lerp(p.v, 50, dt * 0.5);
      if (p.y < 1) p.y = 0;
      if ((p.y === 0 && p.v < 1) || p.s >= P.len - 4) p.phase = "done";
    }
  }
  p.x += Math.sin(p.h) * p.v * dt; p.z += Math.cos(p.h) * p.v * dt;
  if (p.phase === "fly") {
    const m = P.near(p.x, p.z, p.idx);
    if (Math.abs(m.lat) > W.wall) { const sgn = Math.sign(m.lat), over = Math.abs(m.lat) - W.wall; p.x += W.P.tz[m.i] * sgn * over; p.z -= W.P.tx[m.i] * sgn * over; p.h = lerp(p.h, P.at(m.s + 30).h, dt * 2); }
    collide(p, W);
    for (const r of W.rings) if (!r.taken && Math.hypot(p.x - r.x, p.y - r.y, p.z - r.z) < 12) { r.taken = true; r.m.visible = false; G.stars++; K.sfx.pop(); showMsg("+⭐", true, 600); }
  }
}
function updateTraffic(W, dt) {
  const P = W.P;
  for (const t of W.traffic) {
    if (t.stop > 0) t.stop -= dt; else t.s += t.v * t.dir * dt;
    if (t.s > P.len - 20) t.s = 60; if (t.s < 40) t.s = P.len - 40;
    const a = P.at(t.s, t.lane); t.o.position.set(a.x, 0, a.z); t.o.rotation.y = a.h + (t.dir < 0 ? Math.PI : 0);
  }
  for (const m of W.movers) {
    if (m.kind === "duck") { m.s += m.sp * dt; const a = P.at(m.s % P.len, m.off + Math.sin(G.t * 0.3 + m.s) * 2); m.o.position.set(a.x, 0.1, a.z); m.o.rotation.y = a.h; }
    else if (m.kind === "cross") { m.off += m.sp * dt; if (m.off > 90) m.off = -90; const a = P.at(m.s, m.off); m.o.position.set(a.x, 0.9 + Math.sin(G.t * 2 + m.s) * 0.1, a.z); m.o.rotation.y = a.h - Math.PI / 2; }
  }
}
function collectStars(p, W) {
  if (!W.stars.length) return;
  const o = new THREE.Object3D(), rr = W.starR || 2.2, ss = W.starS || 0.9;
  W.stars.forEach((st, i) => {
    if (!st.taken && Math.hypot(p.x - st.x, (p.y + 1) - st.y, p.z - st.z) < rr) { st.taken = true; G.stars++; K.sfx.pop(); }
    o.position.set(st.x, st.y + Math.sin(G.t * 3 + i) * 0.2, st.z); o.rotation.set(0, G.t * 2 + i, 0); o.scale.setScalar(st.taken ? 0 : ss); o.updateMatrix();
    W.starMesh.setMatrixAt(i, o.matrix);
  });
  W.starMesh.instanceMatrix.needsUpdate = true;
}
function updateCamera(p, dt, snap = false) {
  const [d0, h0] = p.V.cam, d = d0 * (G.camFar ? 1.5 : 1), h = h0 * (G.camFar ? 1.4 : 1);
  const fx = Math.sin(p.h), fz = Math.cos(p.h);
  const tx = p.x - fx * d, ty = p.y + h, tz = p.z - fz * d;
  const k = snap ? 1 : 1 - Math.exp(-dt * (p.V.kind === "plane" ? 3 : 4));
  camera.position.x = lerp(camera.position.x, tx, k); camera.position.y = lerp(camera.position.y, Math.max(ty, 1.2), k); camera.position.z = lerp(camera.position.z, tz, k);
  camera.lookAt(p.x + fx * d * 0.5, p.y + h * 0.35, p.z + fz * d * 0.5);
  sun.position.set(p.x + SUN.x * 120, p.y + SUN.y * 120, p.z + SUN.z * 120); sun.target.position.set(p.x, p.y, p.z);
  const sc = clamp(d0 * 3, 40, 160); Object.assign(sun.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc }); sun.shadow.camera.updateProjectionMatrix();
}

// سهم أصفر فوق المركبة يشير إلى الطريق
function makeArrow() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xffd60a, emissive: 0x8a6a00, emissiveIntensity: 0.6, roughness: 0.4 });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 16).rotateX(Math.PI / 2).translate(0, 0, 1.0), m);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 12).rotateX(Math.PI / 2).translate(0, 0, -0.1), m);
  g.add(head, tail); return g;
}
function updateArrow() {
  const p = G.P, show = G.state === "play" && p && !(p.phase === "land" || p.phase === "done");
  G.arrow.visible = !!show; if (!show) return;
  const s = p.V.kind === "plane" ? 220 : p.vk === "ship" ? 120 : p.V.kind === "heli" ? 50 : 30;
  const t = G.W.P.at(Math.min(G.W.P.len, p.s + s)), sc = { ship: 9, plane: 5, heli: 1.6 }[p.vk] || 1;
  G.arrow.scale.setScalar(sc * (p.V.kind === "ground" ? 0.7 : 1));
  const ahead = p.V.kind === "ground" ? 5 : 0;
  G.arrow.position.set(p.x + Math.sin(p.h) * ahead, p.y + (p.V.top ? p.V.top + 0.9 : p.V.cam[1] * 0.55 + 1.2 * sc), p.z + Math.cos(p.h) * ahead);
  G.arrow.rotation.y = Math.atan2(t.x - p.x, t.z - p.z);
  if (p.V.kind === "heli" || p.V.kind === "plane") { const ty = p.V.kind === "plane" ? 110 : 25; G.arrow.rotation.x = -clamp(Math.atan2(ty - p.y, s) , -0.6, 0.6) * 0; }
}

// ----- بدء جزء من المرحلة: بناء العالم، ثم كرمو يمشي إلى المركبة، ثم بطاقة التعليمات
function startLeg(li) {
  const L = LEVELS[G.lvl], leg = { ...L.legs[li], last: li === L.legs.length - 1 };
  G.leg = li;
  disposeWorld(G.W); G.W = buildWorld(leg);
  G.P = spawnVehicle(G.W, leg.veh);
  if (!G.arrow) { G.arrow = makeArrow(); scene.add(G.arrow); }
  G.total += G.W.stars.length + G.W.rings.length;
  prepMap(G.W.P);
  $("hLevel").textContent = `المرحلة ${G.lvl + 1}: ${L.name}`;
  $("hLeg").textContent = leg.title;
  $("hSteps").innerHTML = stepsHTML(L, li);
  $("hDist").textContent = ""; $("hSpeed").textContent = "0";
  helpFor(VEH[leg.veh].kind);
  // كرمو يمشي إلى المركبة
  const p = G.P, side = 6, k = MODELS.karmo_walk.clone();
  const sx = Math.cos(p.h), sz = -Math.sin(p.h);
  G.walk = { k, t: 0, from: [p.x + sx * side - Math.sin(p.h) * 3, p.z + sz * side - Math.cos(p.h) * 3], to: [p.x + sx * 2.2, p.z + sz * 2.2] };
  if (p.V.kind === "water") { G.walk.from = [p.x + sx * 2 - Math.sin(p.h) * 8, p.z + sz * 2 - Math.cos(p.h) * 8]; G.walk.to = [p.x - Math.sin(p.h) * 3.5, p.z - Math.cos(p.h) * 3.5]; }
  if (p.vk === "ship") { G.walk.from = [p.x + sx * 14 - Math.sin(p.h) * 30, p.z + sz * 14 - Math.cos(p.h) * 30]; G.walk.to = [p.x + sx * 8 - Math.sin(p.h) * 30, p.z + sz * 8 - Math.cos(p.h) * 30]; }
  k.scale.setScalar(p.vk === "ship" ? 3 : 1.15);
  G.W.root.add(k);
  G.state = "walk";
  updateCamera(p, 0, true);
  $("hFade").classList.remove("on");
}
function updateWalk(dt) {
  const w = G.walk, p = G.P; w.t += dt;
  const T = 2.6, u = clamp(w.t / T, 0, 1);
  const x = lerp(w.from[0], w.to[0], u), z = lerp(w.from[1], w.to[1], u), y = p.vk === "ship" ? 4 : (p.V.kind === "water" ? 0.3 : 0);
  w.k.position.set(x, y + Math.abs(Math.sin(w.t * 9)) * 0.07, z);
  w.k.rotation.set(0, Math.atan2(w.to[0] - w.from[0], w.to[1] - w.from[1]), Math.sin(w.t * 9) * 0.06);
  // الكاميرا تدور حول كرمو
  const r = { ship: 40, plane: 26, truck: 12, heli: 10 }[p.vk] || 7, a = p.h + 2.2 - u * 0.9;
  camera.position.set(x + Math.sin(a) * r, y + (p.vk === "ship" ? 14 : 2.2 + r * 0.12), z + Math.cos(a) * r);
  camera.lookAt(lerp(x, p.x, 0.4), y + 0.9, lerp(z, p.z, 0.4));
  if (u >= 1) { w.k.visible = false; G.W.root.remove(w.k); introCard(); }
}
function introCard() {
  const L = LEVELS[G.lvl], leg = L.legs[G.leg], V = VEH[leg.veh];
  G.state = "intro";
  const ctrl = V.kind === "heli" || V.kind === "plane" ? "⬆⬇ للصعود والنزول، ⬅➡ للتوجيه" : "⬆ أو الزر السفلي للانطلاق، ⬅➡ للتوجيه";
  $("hIntro").innerHTML = `<div class="big emo">${V.ic}</div><h2>${V.name}</h2><p>${leg.title}</p><p style="font-size:2.4vh">${ctrl}</p>
    <div class="go">${dia("b")} ابدأ</div>`;
  $("hIntro").classList.add("on");
  updateCamera(G.P, 0, true);
  K.tts && K.tts(leg.title);
}
function beginDrive() {
  $("hIntro").classList.remove("on");
  G.state = "count"; G.count = 2.4;
  engineStart(G.P.V.kind);
}
function legDone() {
  G.state = "trans"; engineStop(); K.sfx.ok();
  const L = LEVELS[G.lvl];
  if (G.leg + 1 < L.legs.length) {
    showMsg(["رائع!", "أحسنت!", "ممتاز!"][G.leg % 3], true, 1400);
    setTimeout(() => { $("hFade").classList.add("on"); setTimeout(() => { if (G.state === "trans") startLeg(G.leg + 1); }, 500); }, 1300);
  } else {
    setTimeout(() => levelDone(), 1200);
  }
}
function levelDone() {
  const ratio = G.total ? G.stars / G.total : 1;
  const s = ratio >= 0.6 && G.hits <= 2 ? 3 : ratio >= 0.3 && G.hits <= 6 ? 2 : 1;
  const key = String(G.lvl + 1);
  save.best[key] = Math.max(save.best[key] || 0, s);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.lvl + 2));
  save.save();
  G.state = "menu"; G.active = false;
  hud.classList.add("off");
  const lvl = G.lvl;
  K.replace(resultScreen, { s, lvl });
}

// ===================================================================== الحلقة الرئيسية
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (document.hidden) return;
  for (let k = 0; k < SIM; k++) step(dt);
  sky.position.copy(camera.position);
  if (G.arrow) updateArrow();
  renderer.render(scene, camera);
}
// للتجربة فقط: ?sim=8 يشغّل عدة خطوات في كل إطار (المتصفح بلا كرت شاشة بطيء)
const SIM = clamp(+(new URLSearchParams(location.search).get("sim") || 1), 1, 20);
function step(dt) {
  G.t += dt;
  if (msgT && performance.now() > msgT) { $("hMsg").className = "msg"; msgT = 0; }
  if (G.W && G.W.water) { G.W.water.offset.x = G.t * 0.01; G.W.water.offset.y = G.t * 0.015; }
  if (G.state === "menu" && showcase) {
    const a = G.t * 0.15; camera.position.set(showcase.x + Math.sin(a) * 7.5, 2.2, showcase.z + Math.cos(a) * 7.5); camera.lookAt(showcase.x, 1.6, showcase.z);
  } else if (G.state === "walk") updateWalk(dt);
  else if (G.state === "intro") { const I = readInput(); if (I.aHit) { K.audioCtx(); beginDrive(); } if (I.bHit) pause(); updateCamera(G.P, dt); }
  else if (G.state === "count") {
    const before = Math.ceil(G.count); G.count -= dt; const c = Math.ceil(G.count);
    if (c !== before && c > 0) { showMsg(String(c), true, 700); K.tone(520, 0.12); }
    if (G.count <= 0) { G.state = "play"; showMsg("انطلق!", true, 800); K.tone(880, 0.25); }
    updateCamera(G.P, dt); readInput();
    if (G.P.V.kind === "heli" && G.P.rotor) G.P.rotor.rotation.y += dt * 20;
  } else if (G.state === "play" || G.state === "trans") {
    const p = G.P, W = G.W, I = G.state === "play" ? readInput() : { steer: 0, stickY: 0 };
    if (I.bHit) { pause(); return; }
    if (I.xHit) horn();
    if (I.yHit) G.camFar = !G.camFar;
    if (p.V.kind === "heli" || p.V.kind === "plane") updateAir(p, I, dt, W);
    else updateGround(p, G.state === "play" ? I : { steer: 0, down: true }, dt, W);
    if (p.inv > 0) { p.inv -= dt; p.o.visible = Math.floor(p.inv * 10) % 2 === 0 || p.inv <= 0; } else p.o.visible = true;
    placeVehicle(p); updateTraffic(W, dt); collectStars(p, W); updateCamera(p, dt);
    engineSet(clamp(Math.abs(p.v) / p.V.max, 0, 1.2));
    // الواجهة
    $("hSpeed").textContent = Math.round(Math.abs(p.v) * 3.6);
    $("hStars").textContent = G.stars;
    const rest = Math.max(0, Math.round(W.P.len - p.s));
    $("hDist").textContent = rest > 10 ? `${G.leg + 1 < LEVELS[G.lvl].legs.length ? "النقطة التالية" : "خط النهاية"}: ${rest} متر` : "وصلت!";
    drawMap(p.x, p.z, p.h);
    if (G.state === "play") {
      const done = p.V.kind === "heli" || p.V.kind === "plane" ? p.phase === "done" : p.s >= W.P.len - 12;
      if (done) legDone();
    }
  }
}
// ===================================================================== الشاشات (kit)
function setPlaying(on) {
  hud.classList.toggle("off", !on);
  document.body.classList.toggle("dim", !on && G.active);
}
function playScreen(lvl) {
  K.begin(); K.app.innerHTML = "";
  if (G.active && G.lvl === lvl && G.paused) {
    G.paused = false; G.state = G.resume || "play"; setPlaying(true);
    if (G.state === "play" || G.state === "count") engineStart(G.P.V.kind);
  } else {
    G.active = true; G.paused = false; G.lvl = lvl; G.hits = 0; G.stars = 0; G.total = 0; G.camFar = false;
    if (showcase) { scene.remove(showcase.root); showcase = null; }
    setPlaying(true); startLeg(0);
  }
  K.mode = { key: () => true, poll: () => true, stop: () => {} };
}
function pause() {
  if (!G.active || G.paused) return;
  G.paused = true; G.resume = G.state === "trans" ? "trans" : G.state; G.state = "paused"; engineStop();
  hud.classList.add("off"); document.body.classList.add("dim");
  K.show(pauseScreen);
}
function pauseScreen() {
  K.begin();
  K.paint(`<div class="panel"><h2>استراحة ☕</h2>
    <div class="row">
      <button class="btn f go" ${K.act("go", () => K.back())}>▶ أكمل</button>
      <button class="btn f" ${K.act("re", () => { G.active = false; G.paused = false; K.back(); })}>🔁 من البداية</button>
      <button class="btn f" ${K.act("home", () => { G.active = false; G.paused = false; engineStop(); disposeWorld(G.W); G.W = null; K.home(); })}>🏠 القائمة</button>
    </div></div>${K.HELP}`, "go");
}
function resultScreen({ s, lvl }) {
  document.body.classList.add("dim");
  K.resultScreen({ s, title: `المرحلة ${lvl + 1}`, msg: s === 3 ? "رائع يا بطل! 🏆" : s === 2 ? "أحسنت يا كرمو! 👏" : "وصلت! حاول جمع نجوم أكثر 💪", learn: false,
    extra: `<div class="sub">⭐ ${G.stars} من ${G.total} &nbsp;·&nbsp; اصطدامات: ${G.hits}</div>`,
    again: () => K.replace(playScreen, lvl),
    next: lvl + 1 < LEVELS.length ? { label: `المرحلة ${lvl + 2}`, fn: () => K.replace(playScreen, lvl + 1) } : null });
}
function levelsScreen() {
  K.begin(); document.body.classList.add("dim");
  const cards = [];
  for (let i = 0; i < 10; i++) {
    const L = LEVELS[i], open = L && i < save.unlocked, best = save.best[String(i + 1)] || 0;
    if (L && open) cards.push(`<button class="lv f" ${K.act("l" + i, () => K.replace(playScreen, i))}><b>${i + 1}</b><span class="ic emo">${L.legs.map((l) => VEH[l.veh].ic).join("")}</span><span class="st">${"⭐".repeat(best)}${"☆".repeat(3 - best)}</span></button>`);
    else cards.push(`<button class="lv lock f" ${K.act("l" + i, () => { K.sfx.bad(); })}><b class="emo">${L ? "🔒" : SOON[i - LEVELS.length] || "🔒"}</b><span class="st">${L ? "أنهِ المرحلة السابقة" : "قريباً"}</span></button>`);
  }
  K.paint(`<div class="top">${K.backBtn()}<span class="pill">المراحل</span><span></span></div><div class="levels">${cards.join("")}</div>${K.HELP}`, "l" + Math.min(save.unlocked - 1, LEVELS.length - 1));
}
function homeScreen() {
  K.begin(); document.body.classList.remove("dim"); hud.classList.add("off");
  G.active = false; G.paused = false; engineStop();
  if (!showcase) makeShowcase();
  G.state = "menu";
  const next = Math.min(save.unlocked, LEVELS.length) - 1;
  K.paint(`<div class="home screen" style="height:100%">
      <h1 class="logo">${GAME}</h1>
      <div class="sub">سيارات وشاحنات وطائرات وسفن… هيا نبدأ المغامرة!</div>
      <div class="nav">
        <button class="btn f go" ${K.act("play", () => K.show(playScreen, next))}>▶ العب (المرحلة ${next + 1})</button>
        <button class="btn f" ${K.act("levels", () => K.show(levelsScreen))}>🗺️ المراحل</button>
      </div>
      ${K.HELP}</div>`, "play");
}
function makeShowcase() {
  disposeWorld(G.W); G.W = null;
  const W = buildWorld({ ...LEVELS[0].legs[0], len: 300, cones: 0, last: false });
  const a = W.P.at(40, 3.2);
  const car = MODELS.car.clone(); car.position.set(a.x, 0, a.z); car.rotation.y = a.h; W.root.add(car);
  const truck = MODELS.truck.clone(), tr = MODELS.trailer.clone(); const b = W.P.at(70, -3.2);
  truck.position.set(b.x, 0, b.z); truck.rotation.y = b.h + Math.PI; tr.position.set(0, 0, -3.6); truck.add(tr); W.root.add(truck);
  const k = MODELS.karmo_walk.clone(); const c = W.P.at(40, 0.5); k.position.set(c.x, 0.03, c.z); k.rotation.y = a.h + 0.5; k.scale.setScalar(1.15); W.root.add(k);
  showcase = { root: W.root, x: c.x, z: c.z }; G.W = W;
  sun.position.set(c.x + SUN.x * 100, SUN.y * 100, c.z + SUN.z * 100); sun.target.position.set(c.x, 0, c.z);
}

G.play = (l, leg = 0) => { K.show(playScreen, l); if (leg) startLeg(leg); };

// ===================================================================== البدء
(async () => {
  K.begin();
  K.paint(`<div class="panel" style="margin-top:30vh"><h2>${GAME}</h2><div class="sub" id="ld">جارٍ التحميل… 0%</div></div>`);
  try {
    await loadModels((f) => { const e = document.getElementById("ld"); if (e) e.textContent = `جارٍ التحميل… ${Math.round(f * 100)}%`; });
  } catch (e) {
    K.paint(`<div class="panel" style="margin-top:30vh"><h2>تعذّر تحميل اللعبة</h2><div class="sub">${K.esc(e && e.message || e)}</div></div>`);
    return;
  }
  requestAnimationFrame(frame);
  K.start(homeScreen);
})();
