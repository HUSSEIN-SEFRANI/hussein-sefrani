// روبوت البرمجة — المحرك: قراءة الخريطة، وتشغيل البرنامج خطوة خطوة (بدون رسوم)
(() => {
  "use strict";
  const R = (window.ROBO = {});
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 أعلى، 1 يمين، 2 أسفل، 3 يسار
  R.DX = DX; R.DY = DY;
  R.BLOCK = { rep: 1, ifw: 1, ifg: 1 };
  R.MAX_STEPS = 600;

  R.parseMap = (lv) => {
    const rows = lv.map, H = rows.length, W = rows[0].length;
    const m = { W, H, cells: [], gems: [], start: null, star: null };
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        let c = rows[y][x] || "#";
        const d = "^>v<".indexOf(c);
        if (d >= 0) { m.start = { x, y, d }; c = "."; }
        if (c === "*") { m.star = { x, y }; c = "."; }
        if (c === "g") { m.gems.push(x + "," + y); c = "."; }
        row.push(c);
      }
      m.cells.push(row);
    }
    if (!m.star) m.star = { x: m.start.x, y: m.start.y };
    return m;
  };
  R.at = (m, x, y) => (x < 0 || y < 0 || x >= m.W || y >= m.H ? "edge" : m.cells[y][x]);
  R.free = (m, x, y) => R.at(m, x, y) === ".";

  // tokens: [{t:"F"}, {t:"rep", n:3}, {t:"E"}...] -> شجرة {t, i, n, body}
  R.tree = (tokens) => {
    const root = { body: [] }, st = [root];
    tokens.forEach((tk, i) => {
      if (tk.t === "E") { if (st.length > 1) st.pop(); return; }
      const node = { t: tk.t, i, n: tk.n, body: [] };
      st[st.length - 1].body.push(node);
      if (R.BLOCK[tk.t]) st.push(node);
    });
    return root.body;
  };
  R.size = (tokens) => tokens.filter((t) => t.t !== "E").length;

  // يشغّل البرنامج ويعيد قائمة الخطوات للعرض
  // خطوة: {i, k, x, y, d, got?, val?, fail?, win?}
  R.run = (lv, tokens) => {
    const m = R.parseMap(lv);
    const s = { x: m.start.x, y: m.start.y, d: m.start.d, gems: new Set(m.gems) };
    const steps = [];
    let end = null;
    const push = (o) => { steps.push(Object.assign({ x: s.x, y: s.y, d: s.d, left: s.gems.size }, o)); if (steps.length > R.MAX_STEPS && !end) end = "forever"; };
    const atStar = () => s.x === m.star.x && s.y === m.star.y;
    const checkWin = () => { if (atStar() && !s.gems.size) { end = "win"; return true; } return false; };
    const ahead = () => ({ x: s.x + DX[s.d], y: s.y + DY[s.d] });
    const act = (n) => {
      const a = ahead();
      if (n.t === "F") {
        const c = R.at(m, a.x, a.y);
        if (c !== ".") { push({ i: n.i, k: "bump", fail: c === "edge" ? "edge" : c === "~" ? "water" : c === "b" ? "box" : "bump" }); end = "fail"; return; }
        s.x = a.x; s.y = a.y; push({ i: n.i, k: "move" });
      } else if (n.t === "R" || n.t === "L") {
        s.d = (s.d + (n.t === "R" ? 1 : 3)) % 4; push({ i: n.i, k: "turn", turn: n.t === "R" ? 1 : -1 });
      } else if (n.t === "J") {
        const mid = R.at(m, a.x, a.y), lx = a.x + DX[s.d], ly = a.y + DY[s.d], land = R.at(m, lx, ly);
        if (mid === "#") { push({ i: n.i, k: "bump", fail: "high" }); end = "fail"; return; }
        if (land !== ".") { push({ i: n.i, k: "bump", fail: land === "edge" ? "edge" : "land" }); end = "fail"; return; }
        s.x = lx; s.y = ly; push({ i: n.i, k: "jump" });
      } else if (n.t === "P") {
        const key = s.x + "," + s.y;
        if (!s.gems.has(key)) { push({ i: n.i, k: "nogem", fail: "nogem" }); end = "fail"; return; }
        s.gems.delete(key); push({ i: n.i, k: "pick", got: key });
      }
      checkWin();
    };
    const exec = (list) => {
      for (const n of list) {
        if (end) return;
        if (n.t === "rep") {
          const times = n.n === 0 ? Infinity : n.n;
          for (let k = 0; k < times && !end; k++) { push({ i: n.i, k: "loop", it: k + 1 }); if (end) return; exec(n.body); }
        } else if (n.t === "ifw" || n.t === "ifg") {
          const a = ahead();
          const val = n.t === "ifw" ? !R.free(m, a.x, a.y) : s.gems.has(s.x + "," + s.y);
          push({ i: n.i, k: "cond", val });
          if (val && !end) exec(n.body);
        } else act(n);
      }
    };
    if (!R.size(tokens)) return { steps, end: "fail", why: "empty", map: m };
    exec(R.tree(tokens));
    let why = null;
    if (!end) { end = "fail"; why = atStar() ? "gems" : "short"; }
    else if (end === "forever") { end = "fail"; why = "forever"; steps.length = R.MAX_STEPS; }
    else if (end === "fail") why = steps[steps.length - 1].fail;
    return { steps, end, why, map: m };
  };

  // "r3{ F L } F" -> tokens (للاختبار وللحلول المرجعية)
  R.parseSol = (s) => s.trim().split(/\s+/).map((w) => {
    if (w === "}") return { t: "E" };
    if (w[0] === "r") return { t: "rep", n: w[1] === "*" ? 0 : parseInt(w.slice(1)) };
    if (w === "w{") return { t: "ifw" };
    if (w === "g{") return { t: "ifg" };
    return { t: w };
  });
})();
