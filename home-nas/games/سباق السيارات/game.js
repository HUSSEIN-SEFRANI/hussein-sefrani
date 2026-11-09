// سباق الأبطال — لعبة سباق ثلاثية الأبعاد للأطفال (تعمل بدون إنترنت).
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
function strip(offA, offB, y, material, uScale) {
  const pos = [], uv = [], idx = [];
  let acc = 0;
  for (let i = 0; i <= N; i++) {
    if (i) acc += P[i].distanceTo(P[i - 1]);
    const a = P[i].clone().addScaledVector(NRM[i], offA), b = P[i].clone().addScaledVector(NRM[i], offB);
    pos.push(a.x, y, a.z, b.x, y, b.z);
    uv.push(acc / uScale, 0, acc / uScale, 1);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
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

// الأرض
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat("#7ccf5d"));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// خط البداية + قوس قزح
const startLine = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 3), new THREE.MeshLambertMaterial({
  map: canvasTex(64, 16, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * 4, y * 4, 4, 4); } }),
}));
startLine.rotation.x = -Math.PI / 2;
const sl = new THREE.Group(); sl.add(startLine); place(sl, 0, 0, 0.08); scene.add(sl);
const rainbow = new THREE.Group();
["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7"].forEach((c, i) => {
  const r = new THREE.Mesh(new THREE.TorusGeometry(ROAD_W / 2 + 4 - i * 0.9, 0.48, 8, 40, Math.PI), mat(c));
  rainbow.add(r);
});
place(rainbow, 2, 0); scene.add(rainbow);

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
  if (nearRoad(x, z, 6)) continue;
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

// ------------------------------------------------------------------ المركبات
function wheel(r = 0.55, w = 0.5) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), mat("#1f2937"));
  t.rotation.z = Math.PI / 2; g.add(t);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, w + 0.02, 8), mat("#e5e7eb"));
  hub.rotation.z = Math.PI / 2; g.add(hub);
  return g;
}
function makeVehicle(type, color) {
  const g = new THREE.Group(), wheels = [];
  const body = mat(color), glass = mat("#bae6fd"), dark = mat("#374151");
  const addWheels = (list, r) => list.forEach(([x, z]) => { const w = wheel(r); w.position.set(x, r, z); g.add(w); wheels.push(w); });
  const eyes = (z, y, x = 0.5) => [-x, x].forEach((ex) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), mat("#ffffff")); e.position.set(ex, y, z); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat("#111827")); p.position.set(ex, y, z + 0.18); g.add(p);
  });
  if (type === "car") {
    const b = box(2.3, 0.75, 4.2, body); b.position.y = 0.85; g.add(b);
    const c = box(1.8, 0.7, 2, glass); c.position.set(0, 1.55, -0.3); g.add(c);
    const sp = box(2.4, 0.15, 0.6, body); sp.position.set(0, 1.6, -1.9); g.add(sp);
    [-0.9, 0.9].forEach((x) => { const l = box(0.15, 0.5, 0.15, dark); l.position.set(x, 1.3, -1.9); g.add(l); });
    eyes(2.12, 1.0);
    addWheels([[-1.2, 1.3], [1.2, 1.3], [-1.2, -1.3], [1.2, -1.3]], 0.55);
  } else if (type === "truck") {
    const cab = box(2.4, 1.8, 1.8, body); cab.position.set(0, 1.5, 1.6); g.add(cab);
    const win = box(2.0, 0.7, 0.1, glass); win.position.set(0, 1.9, 2.52); g.add(win);
    const cargo = box(2.6, 2.2, 3.6, mat("#f8fafc")); cargo.position.set(0, 1.75, -1.3); g.add(cargo);
    const stripe = box(2.65, 0.5, 3.65, body); stripe.position.set(0, 1.4, -1.3); g.add(stripe);
    eyes(2.55, 1.0, 0.7);
    addWheels([[-1.25, 1.6], [1.25, 1.6], [-1.25, -0.6], [1.25, -0.6], [-1.25, -2.2], [1.25, -2.2]], 0.6);
  } else if (type === "dump") {
    const cab = box(2.4, 1.7, 1.7, body); cab.position.set(0, 1.5, 1.7); g.add(cab);
    const win = box(2.0, 0.6, 0.1, glass); win.position.set(0, 1.9, 2.57); g.add(win);
    const bed = new THREE.Group();
    const floor = box(2.6, 0.25, 3.4, mat("#facc15")); bed.add(floor);
    [[-1.25, 0], [1.25, 0]].forEach(([x]) => { const s = box(0.15, 1.1, 3.4, mat("#facc15")); s.position.set(x, 0.6, 0); bed.add(s); });
    const back = box(2.6, 1.1, 0.15, mat("#facc15")); back.position.set(0, 0.6, 1.6); bed.add(back);
    const sand = box(2.3, 0.6, 3.0, mat("#d6a35c")); sand.position.y = 0.75; bed.add(sand);
    bed.position.set(0, 1.0, -1.1); bed.rotation.x = -0.12; g.add(bed);
    g.userData.bed = bed;
    eyes(2.6, 1.0, 0.7);
    addWheels([[-1.25, 1.7], [1.25, 1.7], [-1.25, -1.6], [1.25, -1.6]], 0.7);
  } else { // حفارة
    [-1.05, 1.05].forEach((x) => { const tr = box(0.7, 0.8, 3.8, dark); tr.position.set(x, 0.45, 0); g.add(tr); });
    const base = box(2.2, 0.9, 2.6, body); base.position.y = 1.25; g.add(base);
    const cab = box(1.2, 1.3, 1.3, body); cab.position.set(-0.45, 2.3, -0.2); g.add(cab);
    const win = box(1.0, 0.6, 0.1, glass); win.position.set(-0.45, 2.5, 0.47); g.add(win);
    const arm = new THREE.Group();
    const a1 = box(0.4, 0.4, 2.6, body); a1.position.set(0, 0, 1.2); arm.add(a1);
    const a2 = new THREE.Group(); a2.position.set(0, 0, 2.5);
    const a2b = box(0.35, 0.35, 2.0, body); a2b.position.set(0, 0, 0.9); a2.add(a2b);
    const bucket = box(1.1, 0.7, 0.6, dark); bucket.position.set(0, -0.3, 1.9); a2.add(bucket);
    a2.rotation.x = 0.9; arm.add(a2);
    arm.position.set(0.55, 2.0, 0.6); arm.rotation.x = -0.45; g.add(arm);
    g.userData.arm = arm;
    eyes(1.32, 1.35, 0.55);
  }
  g.userData.wheels = wheels;
  return g;
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
for (const s of [L * 0.22, L * 0.5, L * 0.78]) {
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
  place(holder, s, x, 0.09);
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
};

// ------------------------------------------------------------------ الحالة
const $ = (id) => document.getElementById(id);
let state = "menu", selV = 0, selC = 0, menuRow = 0;
let racers = [], player = null, countdown = 0, starCount = 0, finishOrder = [], endT = 0;
let preview = null;

function buildMenu() {
  $("vehicles").innerHTML = VEHICLES.map((v, i) => `<div class="card ${i === selV ? "sel" : ""}"><div class="ic">${v.ic}</div>${v.name}</div>`).join("");
  $("colors").innerHTML = COLORS.map((c, i) => `<div class="dot ${i === selC ? "sel" : ""}" style="background:${c}"></div>`).join("");
  $("vehicles").classList.toggle("dim", menuRow !== 0);
  $("colors").classList.toggle("dim", menuRow !== 1);
  if (preview) scene.remove(preview);
  preview = makeVehicle(VEHICLES[selV].id, COLORS[selC]);
  preview.scale.setScalar(1.6);
  place(preview, 12, 0);
  scene.add(preview);
}

function startRace() {
  scene.remove(preview); preview = null;
  racers.forEach((r) => scene.remove(r.obj));
  const others = VEHICLES.map((v) => v.id).filter((id) => id !== VEHICLES[selV].id);
  const oc = COLORS.filter((_, i) => i !== selC);
  const grid = [[0, -12], [-4.5, 6], [4.5, 6], [0, -2]];
  racers = [{ type: VEHICLES[selV].id, color: COLORS[selC], me: true }, ...others.map((t, i) => ({ type: t, color: oc[(i * 2 + 1) % oc.length] }))]
    .map((r, i) => {
      const obj = makeVehicle(r.type, r.color);
      scene.add(obj);
      return { ...r, obj, s: grid[i][1], x: grid[i][0], speed: 0, base: 17 + i * 1.3, lane: grid[i][0], laneT: 0, boost: 0, done: false };
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
    racers.forEach((r) => scene.remove(r.obj)); racers = []; buildMenu();
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
  r.speed += (target - r.speed) * Math.min(1, dt * (target > r.speed ? 1.4 : 2.5));
  r.boost = Math.max(0, r.boost - dt);
  r.s += r.speed * dt;
  r.x = Math.max(-ROAD_W / 2 + 1.4, Math.min(ROAD_W / 2 - 1.4, r.x));
  // منصات التوربو
  for (const p of pads) {
    const ds = (((r.s - p.s) % L) + L) % L;
    if (ds < 2.5 && Math.abs(r.x - p.x) < 2.8 && r.boost < 1.6) { r.boost = 2; if (r.me) sfx.turbo(); }
  }
  // المظهر
  place(r.obj, r.s, r.x);
  const tilt = r.me ? ctl.steer * 0.12 : 0;
  r.obj.rotation.z = tilt * 0.4; r.obj.rotation.y += tilt;
  r.obj.userData.wheels.forEach((w) => { w.rotation.x += r.speed * dt / 0.6; });
  if (r.obj.userData.arm) r.obj.userData.arm.rotation.x = -0.45 + Math.sin(performance.now() / 300) * 0.15;
  if (r.obj.userData.bed) r.obj.userData.bed.rotation.x = -0.12 - Math.max(0, Math.sin(performance.now() / 700)) * 0.1;
  // نهاية السباق
  if (!r.done && r.s >= LAPS * L) { r.done = true; finishOrder.push(r); if (r.me) finish(); }
}

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = performance.now() / 1000;
  const pad = pollPad();
  clouds.forEach((c, i) => { c.position.x += dt * (1.5 + (i % 3)); if (c.position.x > 320) c.position.x = -320; });
  stars.forEach((st) => { if (st.m.visible) { place(st.m, st.s, st.x, 1.6 + Math.sin(t * 3 + st.s) * 0.25); st.m.rotation.y = t * 2.5; } });

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
    camPos.copy(back.p).addScaledVector(back.n, player.x * 0.7); camPos.y = 5.2;
    camLook.copy(ahead.p).addScaledVector(ahead.n, player.x * 0.5); camLook.y = 1.4;
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
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

buildMenu();
tick();
