// شوارع بلجيكا — العالم ثلاثي الأبعاد للقيادة (three.js من مجلد اللعبة، بلا إنترنت).
// الإحداثيات: x = x في الخريطة، z = y في الخريطة، y للأعلى. الوحدة بكسل الخريطة (طول السيارة ≈ 62).
(() => {
  "use strict";
  let R = null, glc = null; // مُصيِّر واحد لكل الجلسة (عدد سياقات WebGL محدود)
  const FONT = (px) => `800 ${px}px Baloo, "Noto Sans Arabic", Tahoma, sans-serif`;
  const EMOF = (px) => `${px}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

  function renderer() {
    const T = window.THREE;
    if (!T) return null;
    if (R) return R;
    try {
      glc = document.createElement("canvas"); glc.id = "gl";
      document.body.insertBefore(glc, document.body.firstChild);
      R = new T.WebGLRenderer({ canvas: glc, antialias: true, powerPreference: "high-performance" });
      R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      R.setSize(innerWidth, innerHeight);
      addEventListener("resize", () => R && R.setSize(innerWidth, innerHeight));
      return R;
    } catch (e) { R = null; if (glc) glc.remove(); return null; }
  }

  // نص أو إيموجي كلافتة تواجه الكاميرا
  function label(T, txt, { size = 44, color = "#fff", stroke = "#0f172a", bg = null, emoji = false } = {}) {
    const c = document.createElement("canvas"), x = c.getContext("2d");
    x.font = emoji ? EMOF(size) : FONT(size);
    const w = Math.ceil(x.measureText(txt).width) + size, h = Math.ceil(size * 1.6);
    c.width = w; c.height = h;
    x.font = emoji ? EMOF(size) : FONT(size); x.textAlign = "center"; x.textBaseline = "middle";
    if (bg) { x.fillStyle = bg; const r = h / 2.4; x.beginPath(); x.roundRect ? x.roundRect(2, 2, w - 4, h - 4, r) : x.rect(2, 2, w - 4, h - 4); x.fill(); }
    if (stroke && !emoji) { x.lineWidth = size / 6; x.strokeStyle = stroke; x.lineJoin = "round"; x.strokeText(txt, w / 2, h / 2 + 2); }
    x.fillStyle = color; x.fillText(txt, w / 2, h / 2 + 2);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
    const s = new T.Sprite(new T.SpriteMaterial({ map: tx, depthWrite: false }));
    s.userData.aspect = w / h;
    return s;
  }
  const scaleSprite = (s, hgt) => s.scale.set(hgt * s.userData.aspect, hgt, 1);

  function roadTex(T, kind) { // أسفلت مع خط متقطع في الوسط
    const c = document.createElement("canvas"); c.width = 64; c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = { c: "#4b5563", h: "#5b6270", n: "#6b6f78", l: "#8a8680", o: "#4b5563" }[kind]; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; x.fillRect(Math.random() * 64, Math.random() * 128, 2, 2); }
    if (kind !== "o") { x.fillStyle = kind === "h" ? "#fde047" : "#f8fafc"; x.fillRect(29, 0, 6, 64); }
    if (kind === "h") { x.fillStyle = "#f8fafc"; x.fillRect(2, 0, 3, 128); x.fillRect(59, 0, 3, 128); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  window.D3 = {
    available() { return !!renderer(); },
    // يبني المشهد لخريطة المرحلة. o = { veh, brand, npcs, stars, birds, skyStars, brandColor, brandShape }
    build(map, o) {
      const T = window.THREE, r = renderer();
      if (!T || !r) return null;
      const city = map.kind === "city";
      const scene = new T.Scene();
      const sky = new T.Color(city ? "#9fd3ff" : "#a5d8ff");
      scene.background = sky;
      const far = o.fly ? 5200 : city ? 2200 : 3200;
      scene.fog = new T.Fog(sky, far * 0.45, far);
      const cam = new T.PerspectiveCamera(60, innerWidth / innerHeight, 4, far + 200);
      scene.add(new T.HemisphereLight("#ffffff", "#5b8c3a", 1.6));
      const sun = new T.DirectionalLight("#fff6e0", 1.6); sun.position.set(-0.6, 1, -0.4); scene.add(sun);
      const disp = [];
      const M = (c, extra = {}) => { const m = new T.MeshLambertMaterial({ color: c, ...extra }); disp.push(m); return m; };
      const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); disp.push(geo); return m; };
      const B = map.wide;
      // الأرض
      const gw = B.x1 - B.x0 + 8000, gh = B.y1 - B.y0 + 8000;
      const ground = add(new T.PlaneGeometry(gw, gh), M(city ? "#86c56b" : "#93cd6f"), (B.x0 + B.x1) / 2, 0, (B.y0 + B.y1) / 2);
      ground.rotation.x = -Math.PI / 2;
      const flat = (w, h, col, x, z, y = 0.2, rot = 0) => { const m = add(new T.PlaneGeometry(w, h), M(col), x, y, z); m.rotation.x = -Math.PI / 2; m.rotation.z = -rot; return m; };
      // صناديق كثيرة بلون لكل واحد
      const boxes = (list, geo) => {
        if (!list.length) return;
        const mesh = new T.InstancedMesh(geo, M("#ffffff"), list.length), d = new T.Object3D(), c = new T.Color();
        list.forEach((b, i) => { d.position.set(b.x, b.y, b.z); d.rotation.set(0, b.ry || 0, 0); d.scale.set(b.sx, b.sy, b.sz); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); mesh.setColorAt(i, c.set(b.c)); });
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        scene.add(mesh); disp.push(geo);
      };
      const box = new T.BoxGeometry(1, 1, 1);
      const roof = new T.ConeGeometry(0.75, 1, 4); roof.rotateY(Math.PI / 4);
      const crown = new T.IcosahedronGeometry(1, 0), trunk = new T.CylinderGeometry(0.25, 0.3, 1, 6);
      const houses = [], roofs = [], trees = [], trunks = [];
      const tree = (x, z, s) => { trunks.push({ x, y: s * 0.5, z, sx: s * 0.6, sy: s, sz: s * 0.6, c: "#7c4a1e" }); trees.push({ x, y: s * 1.5, z, sx: s, sy: s * 1.1, sz: s, c: Math.random() < 0.5 ? "#15803d" : "#16a34a" }); };
      const ROOF = ["#7f1d1d", "#92400e", "#57534e", "#991b1b", "#44403c"];
      if (city) {
        const { G, COLS, ROWS } = map.grid;
        flat((COLS - 1) * G + 120, (ROWS - 1) * G + 120, "#d6cdbb", (COLS - 1) * G / 2, (ROWS - 1) * G / 2, 0.15);
        let i = 0;
        for (const h of map.houses) {
          if (h.tree) { tree(h.x, h.y, h.s * 0.9); continue; }
          const hh = 46 + ((i++ * 37) % 60), cx = h.x + h.w / 2, cz = h.y + h.h / 2;
          houses.push({ x: cx, y: hh / 2, z: cz, sx: h.w - 2, sy: hh, sz: h.h - 2, c: h.c });
          roofs.push({ x: cx, y: hh + 12, z: cz, sx: (h.w - 2) * 1.0, sy: 24, sz: (h.h - 2) * 1.0, c: ROOF[i % ROOF.length] });
        }
        for (const p of map.places) place(p);
      } else {
        // الحقول
        const fl = map.fields.map((f) => ({ x: f.x + f.w / 2, y: 0.1, z: f.y + f.h / 2, sx: f.w, sy: 0.2, sz: f.h, c: f.c }));
        boxes(fl, new T.BoxGeometry(1, 1, 1));
        // البحر والأنهار
        const s = map.shp, sh = new T.Shape();
        sh.moveTo(s.coast[0].x, -(B.y0 - 6000)); s.coast.forEach((q) => sh.lineTo(q.x, -q.y)); sh.lineTo(B.x0 - 6000, -s.coast[s.coast.length - 1].y); sh.lineTo(B.x0 - 6000, -(B.y0 - 6000));
        const sea = add(new T.ShapeGeometry(sh), M("#38bdf8"), 0, 0.4, 0); sea.rotation.x = -Math.PI / 2;
        for (const rv of s.rivers) for (let k = 1; k < rv.length; k++) {
          const a = rv[k - 1], b = rv[k], L = Math.hypot(b.x - a.x, b.y - a.y);
          flat(14, L + 14, "#3b82f6", (a.x + b.x) / 2, (a.y + b.y) / 2, 0.35, Math.atan2(b.x - a.x, b.y - a.y) * -1 + Math.PI);
        }
        for (const l of s.labels) { const sp = label(T, l.t, { size: 60, stroke: "#5b21b6" }); scaleSprite(sp, 120); sp.position.set(l.x, 260, l.y); scene.add(sp); }
        let i = 0;
        for (const tw of map.towns) {
          flat(tw.R * 2 + 40, tw.R * 2 + 40, "#e7dcc8", tw.n.x, tw.n.y, 0.3);
          for (const h of tw.hs) {
            const hh = 18 + ((i++ * 13) % 22);
            houses.push({ x: h.x, y: hh / 2, z: h.y, sx: h.w, sy: hh, sz: h.h, c: h.c });
            roofs.push({ x: h.x, y: hh + 6, z: h.y, sx: h.w, sy: 12, sz: h.h, c: ROOF[i % ROOF.length] });
          }
          if (tw.n.size >= 2) for (let k = 0; k < tw.n.size * 2; k++) { const a = k * 2.4, d = tw.R * 0.35; houses.push({ x: tw.n.x + Math.cos(a) * d, y: 60, z: tw.n.y + Math.sin(a) * d, sx: 26, sy: 120, sz: 26, c: "#cbd5e1" }); }
          const sp = label(T, (tw.n.emo ? tw.n.emo + " " : "") + tw.n.name, { size: 56 }); scaleSprite(sp, tw.n.size === 3 ? 90 : tw.n.size === 2 ? 70 : 52);
          sp.position.set(tw.n.x, tw.n.size === 3 ? 230 : 170, tw.n.y); scene.add(sp);
        }
      }
      for (const t of map.trees) tree(t.x, t.y, t.s * 0.9);
      boxes(houses, box); boxes(roofs, roof); boxes(trees, crown); boxes(trunks, trunk);

      // الطرق
      const tex = {}, rmat = {};
      const W = city ? { c: 54 } : { h: 64, n: 50, l: 40 };
      const KW = city ? { c: 64 } : { h: 74, n: 58, l: 48 };
      for (const e of map.edges) {
        const k = e.oneway ? "o" : e.type;
        if (!tex[k]) { tex[k] = roadTex(T, k); disp.push(tex[k]); }
        const A = map.nodes[e.a], Bn = map.nodes[e.b], ang = Math.atan2(Bn.x - A.x, Bn.y - A.y), mx = (A.x + Bn.x) / 2, mz = (A.y + Bn.y) / 2;
        const curb = flat(KW[e.type], e.len, city ? "#cbd5e1" : e.type === "h" ? "#1e3a8a" : "#57534e", mx, mz, 0.5); curb.rotation.z = ang;
        const t = tex[k].clone(); t.needsUpdate = true; t.repeat.set(1, e.len / 90); disp.push(t);
        const m = new T.MeshLambertMaterial({ map: t }); disp.push(m);
        const g = new T.PlaneGeometry(W[e.type], e.len); disp.push(g);
        const road = new T.Mesh(g, m); road.rotation.x = -Math.PI / 2; road.rotation.z = ang; road.position.set(mx, 0.8, mz); scene.add(road);
        if (e.works) { // حاجز أشغال 🚧
          const bar = add(new T.BoxGeometry(KW[e.type] + 10, 14, 6), M("#f97316"), mx, 14, mz); bar.rotation.y = ang + Math.PI / 2;
          for (const s2 of [-1, 1]) { const st = add(new T.BoxGeometry(5, 20, 5), M("#f8fafc"), mx + Math.cos(ang) * s2 * KW[e.type] / 2, 10, mz - Math.sin(ang) * s2 * KW[e.type] / 2); st.rotation.y = ang; }
          const sp = label(T, "🚧", { size: 60, emoji: true }); scaleSprite(sp, 46); sp.position.set(mx, 46, mz); scene.add(sp);
        }
        if (e.oneway) { // أسهم الاتجاه الواحد
          const fwd = e.oneway === e.a ? 1 : -1;
          for (let f = 0.25; f < 0.9; f += 0.25) {
            const ar = new T.Shape(); ar.moveTo(0, 14); ar.lineTo(-10, -2); ar.lineTo(-4, -2); ar.lineTo(-4, -14); ar.lineTo(4, -14); ar.lineTo(4, -2); ar.lineTo(10, -2); ar.closePath();
            const mesh = add(new T.ShapeGeometry(ar), M("#ffffff"), A.x + (Bn.x - A.x) * f, 1.1, A.y + (Bn.y - A.y) * f);
            mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = ang + (fwd > 0 ? Math.PI : 0);
          }
        }
        if (e.zone) { const sp = label(T, String(e.zone), { size: 50, color: "#111827", stroke: null, bg: "#fff" }); scaleSprite(sp, 30); sp.position.set(A.x + (Bn.x - A.x) * 0.3 + Math.cos(ang) * 40, 40, A.y + (Bn.y - A.y) * 0.3 - Math.sin(ang) * 40); scene.add(sp); }
        if (e.radar != null) {
          const rx = A.x + (Bn.x - A.x) * e.radar + Math.cos(ang) * (KW[e.type] / 2 + 18), rz = A.y + (Bn.y - A.y) * e.radar - Math.sin(ang) * (KW[e.type] / 2 + 18);
          add(new T.CylinderGeometry(2, 2, 40, 6), M("#64748b"), rx, 20, rz);
          add(new T.BoxGeometry(16, 14, 16), M("#334155"), rx, 46, rz);
          const sp = label(T, "📷", { size: 60, emoji: true }); scaleSprite(sp, 26); sp.position.set(rx, 66, rz); scene.add(sp);
        }
      }
      const junc = new T.CircleGeometry(1, 24); disp.push(junc);
      for (const k in map.nodes) {
        const n = map.nodes[k], ww = Math.max(...map.adj[k].map((e) => W[e.type]), 0);
        if (!ww) continue;
        const m = new T.Mesh(junc, M(city ? "#4b5563" : "#6b6f78")); m.scale.set(ww / 2 + 2, ww / 2 + 2, 1); m.rotation.x = -Math.PI / 2; m.position.set(n.x, 0.9, n.y); scene.add(m);
      }
      // الإشارات الضوئية
      const lights = map.lights.map((k) => {
        const n = map.nodes[k];
        add(new T.CylinderGeometry(2.5, 2.5, 70, 6), M("#1f2937"), n.x + 42, 35, n.y - 42);
        add(new T.BoxGeometry(14, 30, 14), M("#111827"), n.x + 42, 76, n.y - 42);
        const red = add(new T.SphereGeometry(5, 10, 8), new T.MeshBasicMaterial({ color: "#ef4444" }), n.x + 42, 84, n.y - 34);
        const green = add(new T.SphereGeometry(5, 10, 8), new T.MeshBasicMaterial({ color: "#22c55e" }), n.x + 42, 68, n.y - 34);
        disp.push(red.material, green.material);
        return { k, red, green };
      });
      // البداية والهدف
      const goal = map.nodes[map.goal], start = map.nodes[map.start];
      const arch = new T.Group();
      for (const s2 of [-1, 1]) { const p = new T.Mesh(new T.BoxGeometry(8, 90, 8), M("#f8fafc")); p.position.set(s2 * 50, 45, 0); arch.add(p); }
      const ck = document.createElement("canvas"); ck.width = 128; ck.height = 32; const cx2 = ck.getContext("2d");
      for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { cx2.fillStyle = (i + j) % 2 ? "#111" : "#fff"; cx2.fillRect(i * 8, j * 8, 8, 8); }
      const ckt = new T.CanvasTexture(ck); ckt.colorSpace = T.SRGBColorSpace; disp.push(ckt);
      const banner = new T.Mesh(new T.BoxGeometry(108, 20, 4), new T.MeshLambertMaterial({ map: ckt })); banner.position.y = 90; arch.add(banner);
      arch.position.set(goal.x, 0, goal.y); scene.add(arch);
      const gsp = label(T, (goal.emo || "🏁"), { size: 120, emoji: true }); scaleSprite(gsp, 90); gsp.position.set(goal.x, 170, goal.y); scene.add(gsp);
      const gname = label(T, goal.label || goal.name || "", { size: 56, bg: "#dc2626", stroke: null }); scaleSprite(gname, 44); gname.position.set(goal.x, 112, goal.y); scene.add(gname);
      void start;

      // المركبات
      const carGeo = { body: new T.BoxGeometry(1, 1, 1) };
      const wheelG = new T.CylinderGeometry(6, 6, 6, 10); wheelG.rotateX(Math.PI / 2); disp.push(wheelG);
      function carMesh(color, kind = "sedan", vid = "car") {
        const g = new T.Group(); let L = 62, Wd = 30, Hh = 18;
        if (kind === "suv") { L = 64; Wd = 32; Hh = 22; } if (kind === "sport") { L = 64; Wd = 29; Hh = 14; } if (kind === "hatch") { L = 54; Wd = 30; Hh = 18; } if (kind === "wagon") { L = 68; Wd = 30; Hh = 18; } if (kind === "van") { L = 72; Wd = 34; Hh = 34; }
        const body = new T.Mesh(carGeo.body, M(color)); body.scale.set(L, Hh, Wd); body.position.y = 6 + Hh / 2; g.add(body);
        if (kind !== "van") {
          const cl = kind === "hatch" ? L * 0.55 : kind === "sport" ? L * 0.42 : L * 0.5;
          const cab = new T.Mesh(carGeo.body, M("#1e293b")); cab.scale.set(cl, Hh * 0.7, Wd * 0.86); cab.position.set(kind === "hatch" ? -L * 0.08 : -L * 0.04, 6 + Hh + Hh * 0.35, 0); g.add(cab);
          const top = new T.Mesh(carGeo.body, M(color)); top.scale.set(cl * 0.8, 2, Wd * 0.8); top.position.set(cab.position.x, cab.position.y + Hh * 0.36, 0); g.add(top);
        } else { const ws = new T.Mesh(carGeo.body, M("#1e293b")); ws.scale.set(2, Hh * 0.4, Wd * 0.8); ws.position.set(L / 2, 6 + Hh * 0.75, 0); g.add(ws); }
        for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const w = new T.Mesh(wheelG, M("#111827")); w.position.set(a * L * 0.32, 6, b * Wd / 2); g.add(w); }
        const hl = new T.Mesh(carGeo.body, new T.MeshBasicMaterial({ color: "#fef9c3" })); hl.scale.set(1, 4, Wd * 0.8); hl.position.set(L / 2 + 0.5, 6 + Hh * 0.6, 0); g.add(hl);
        const tl = new T.Mesh(carGeo.body, new T.MeshBasicMaterial({ color: "#dc2626" })); tl.scale.set(1, 4, Wd * 0.8); tl.position.set(-L / 2 - 0.5, 6 + Hh * 0.6, 0); g.add(tl);
        if (vid === "police") { const s2 = new T.Mesh(carGeo.body, M("#1d4ed8")); s2.scale.set(L + 0.5, 4, Wd + 0.5); s2.position.y = 6 + Hh * 0.45; g.add(s2); }
        if (vid === "ambulance") { const s2 = new T.Mesh(carGeo.body, M("#16a34a")); s2.scale.set(L + 0.5, 5, Wd + 0.5); s2.position.y = 6 + Hh * 0.35; g.add(s2); }
        if (vid === "police" || vid === "ambulance") {
          const r2 = new T.Mesh(carGeo.body, new T.MeshBasicMaterial({ color: "#ef4444" })), b2 = new T.Mesh(carGeo.body, new T.MeshBasicMaterial({ color: "#3b82f6" }));
          const yy = kind === "van" ? 6 + Hh + 3 : 6 + Hh * 1.9;
          r2.scale.set(8, 5, 10); b2.scale.set(8, 5, 10); r2.position.set(0, yy, 7); b2.position.set(0, yy, -7); g.add(r2, b2);
          g.userData.siren = [r2, b2];
        }
        const sh = new T.Mesh(junc, new T.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.25, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.scale.set(L * 0.6, Wd * 0.75, 1); sh.position.y = 1.2; g.add(sh);
        return g;
      }
      function motoMesh() {
        const g = new T.Group();
        const b = new T.Mesh(carGeo.body, M("#ea580c")); b.scale.set(40, 12, 10); b.position.y = 14; g.add(b);
        for (const a of [1, -1]) { const w = new T.Mesh(wheelG, M("#111827")); w.scale.set(1.3, 1.3, 0.8); w.position.set(a * 18, 8, 0); g.add(w); }
        const rider = new T.Mesh(carGeo.body, M("#1e40af")); rider.scale.set(12, 22, 12); rider.position.set(-4, 30, 0); g.add(rider);
        const head = new T.Mesh(new T.SphereGeometry(7, 12, 10), M("#facc15")); head.position.set(-2, 46, 0); g.add(head);
        const sh = new T.Mesh(junc, new T.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.25, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.scale.set(26, 9, 1); sh.position.y = 1.2; g.add(sh);
        return g;
      }
      function planeMesh() {
        const g = new T.Group();
        const fus = new T.Mesh(new T.CylinderGeometry(8, 6, 90, 12), M("#f8fafc")); fus.rotation.z = Math.PI / 2; g.add(fus);
        const nose = new T.Mesh(new T.ConeGeometry(8, 18, 12), M("#ef4444")); nose.rotation.z = -Math.PI / 2; nose.position.x = 54; g.add(nose);
        const wing = new T.Mesh(carGeo.body, M("#1d4ed8")); wing.scale.set(22, 3, 110); g.add(wing);
        const tail = new T.Mesh(carGeo.body, M("#1d4ed8")); tail.scale.set(12, 3, 40); tail.position.x = -40; g.add(tail);
        const fin = new T.Mesh(carGeo.body, M("#ef4444")); fin.scale.set(14, 22, 3); fin.position.set(-40, 12, 0); g.add(fin);
        const win = new T.Mesh(carGeo.body, M("#38bdf8")); win.scale.set(10, 5, 10); win.position.set(38, 6, 0); g.add(win);
        return g;
      }
      const me = o.veh === "plane" ? planeMesh() : o.veh === "moto" ? motoMesh() : carMesh(o.veh === "police" ? "#f8fafc" : o.veh === "ambulance" ? "#facc15" : o.brandColor, o.veh === "ambulance" ? "van" : o.veh === "police" ? "sedan" : o.brandShape, o.veh);
      scene.add(me);
      let shadow = null;
      if (o.veh === "plane") { shadow = new T.Mesh(junc, new T.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.2, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.scale.set(50, 50, 1); scene.add(shadow); }
      const npcM = (o.npcs || []).map((n) => { const m = carMesh(n.c, "sedan", "npc"); m.scale.setScalar(0.85); scene.add(m); return m; });
      // النجوم والطيور
      const starTex = label(T, "⭐", { size: 96, emoji: true }).material.map; disp.push(starTex);
      const starMat = new T.SpriteMaterial({ map: starTex, depthWrite: false }); disp.push(starMat);
      const stars = [];
      for (const e of map.edges) if (e.stars) for (const s2 of e.stars) {
        const A = map.nodes[e.a], Bn = map.nodes[e.b], sp = new T.Sprite(starMat);
        sp.scale.set(30, 30, 1); sp.position.set(A.x + (Bn.x - A.x) * s2.f, 24, A.y + (Bn.y - A.y) * s2.f); scene.add(sp); stars.push({ s: s2, sp });
      }
      for (const s2 of o.skyStars || []) { const sp = new T.Sprite(starMat); sp.scale.set(44, 44, 1); sp.position.set(s2.x, 250, s2.y); scene.add(sp); stars.push({ s: s2, sp, sky: true }); }
      const birdTex = label(T, "🐦", { size: 96, emoji: true }).material.map; disp.push(birdTex);
      const birds = (o.birds || []).map((b) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: birdTex, depthWrite: false })); sp.scale.set(40, 40, 1); scene.add(sp); disp.push(sp.material); return { b, sp }; });

      const camPos = new T.Vector3(), camLook = new T.Vector3();
      let first = true;
      return {
        // s = { x, y, a, v, alt, roll, t, npcs:[{x,y,a}], lightGreen(k) }
        render(s) {
          const fly = o.veh === "plane";
          const alt = fly ? s.alt : 0;
          me.position.set(s.x, alt, s.y); me.rotation.set(0, -s.a, 0);
          if (fly) { me.rotation.order = "YXZ"; me.rotation.set(0, -s.a, 0); me.rotateX(s.roll || 0); }
          if (o.veh === "moto") me.rotation.x = -(s.roll || 0) * 0.6;
          if (me.userData.siren) { const on = Math.floor(s.t * 6) % 2; me.userData.siren[0].visible = !!on; me.userData.siren[1].visible = !on; }
          if (shadow) shadow.position.set(s.x, 1.5, s.y);
          (s.npcs || []).forEach((n, i) => { const m = npcM[i]; if (m) { m.position.set(n.x, 0, n.y); m.rotation.y = -n.a; } });
          for (const l of lights) { const gr = s.lightGreen(l.k); l.red.material.color.set(gr ? "#3f3f46" : "#ef4444"); l.green.material.color.set(gr ? "#22c55e" : "#3f3f46"); }
          for (const st of stars) { st.sp.visible = !st.s.got; if (!st.s.got) st.sp.position.y = (st.sky ? 250 : 24) + Math.sin(s.t * 4 + st.sp.position.x) * 4; }
          for (const b of birds) b.sp.position.set(b.b.x, 250 + Math.sin(s.t * 3 + b.b.a) * 10, b.b.y);
          gsp.position.y = 170 + Math.sin(s.t * 2.5) * 8;
          // كاميرا خلف المركبة
          const back = fly ? 230 : 150 + Math.min(70, s.v * 0.35), up = fly ? 90 : 84 + Math.min(30, s.v * 0.15);
          const ca = s.camA != null ? s.camA : s.a;
          camPos.set(s.x - Math.cos(ca) * back, alt + up, s.y - Math.sin(ca) * back);
          const look = new T.Vector3(s.x + Math.cos(ca) * 90, alt + (fly ? 10 : 22), s.y + Math.sin(ca) * 90);
          if (first) { cam.position.copy(camPos); camLook.copy(look); first = false; }
          else { cam.position.lerp(camPos, 0.12); camLook.lerp(look, 0.2); }
          cam.lookAt(camLook);
          cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
          r.render(scene, cam);
        },
        show(on) { glc.style.display = on ? "block" : "none"; },
        dispose() {
          scene.traverse((m) => { if (m.isInstancedMesh) m.dispose(); if (m.isSprite && m.material.map && !disp.includes(m.material.map)) { m.material.map.dispose(); m.material.dispose(); } });
          for (const d of disp) { try { d.dispose(); } catch {} }
          glc.style.display = "none";
        },
      };

      function place(p) {
        const { G } = map.grid, px = p.cell[0] * G + 34, pz = p.cell[1] * G + 34, s = G - 68, hh = (p.h || 1) * G - 68, cx = px + s / 2, cz = pz + hh / 2;
        const hi = { park: 0, burger: 70, church: 90, station: 60, stadium: 30, school: 70, pool: 0, shop: 60 }[p.kind];
        if (p.kind === "park") {
          flat(s, hh, "#4ade80", cx, cz, 0.3);
          const pond = add(new T.CircleGeometry(48, 24), M("#38bdf8"), cx, 0.5, cz - 20); pond.rotation.x = -Math.PI / 2; pond.scale.set(1.3, 0.8, 1);
          for (let i = 0; i < 12; i++) tree(px + 30 + ((i * 53) % (s - 60)), pz + 30 + ((i * 97) % (hh - 60)), 18);
        } else if (p.kind === "pool") {
          flat(s, hh, "#e2e8f0", cx, cz, 0.3); flat(s - 60, hh - 60, "#0ea5e9", cx, cz, 0.5);
        } else if (p.kind === "stadium") {
          flat(s, hh, "#d1d5db", cx, cz, 0.3); flat(s - 40, hh - 40, "#16a34a", cx, cz, 0.5);
          for (const sgn of [-1, 1]) add(new T.BoxGeometry(s - 40, 26, 18), M("#2563eb"), cx, 13, cz + sgn * (hh / 2 - 12));
        } else {
          flat(s, hh, "#d1d5db", cx, cz, 0.3);
          const col = { burger: "#b91c1c", church: "#e7e5e4", station: "#a16207", school: "#fb923c", shop: "#60a5fa" }[p.kind];
          add(new T.BoxGeometry(s * 0.55, hi, hh * 0.5), M(col), cx + s * 0.1, hi / 2, cz - hh * 0.1);
          if (p.kind === "burger") add(new T.BoxGeometry(s * 0.56, 10, hh * 0.51), M("#facc15"), cx + s * 0.1, hi - 4, cz - hh * 0.1);
          if (p.kind === "church") { add(new T.BoxGeometry(34, 170, 34), M("#a8a29e"), cx - s * 0.2, 85, cz); const sp2 = add(new T.ConeGeometry(26, 60, 4), M("#57534e"), cx - s * 0.2, 200, cz); sp2.rotation.y = Math.PI / 4; }
        }
        const top = Math.max(hi, 60);
        const sp = label(T, p.emo, { size: 110, emoji: true }); scaleSprite(sp, p.kind === "burger" ? 80 : 60); sp.position.set(cx, top + 150, cz); scene.add(sp);
        const nm = label(T, p.name, { size: 50, bg: p.kind === "burger" ? "#b91c1c" : "#1e3a8a", stroke: null }); scaleSprite(nm, p.kind === "burger" ? 36 : 28); nm.position.set(cx, top + 95, cz); scene.add(nm);
      }
    },
  };
})();
