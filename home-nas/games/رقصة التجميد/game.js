// رقصة التجميد — ارقصوا مع الموسيقى، وعندما تتوقف تجمّدوا!
// موسيقى (اختياري): ضع أناشيد mp3 في مجلد music باسم 1.mp3 و 2.mp3 و 3.mp3 … وإلا تُعزف موسيقى مدمجة.
(() => {
  "use strict";
  const save = K.store("freeze", { rounds: 8 });
  const POSES = [["كالتمثال", "🗿"], ["على رِجلٍ واحدة", "🦩"], ["كالشجرة", "🌳"], ["ارفعوا أيديكم", "🙌"], ["كالقطة", "🐈"], ["كالطائرة", "✈️"], ["كالنجمة", "⭐"], ["كالروبوت", "🤖"], ["كالأرنب", "🐰"], ["كالبطريق", "🐧"]];
  // تمارين رياضية منظّمة تظهر أثناء الرقص بالترتيب: إحماء ← تمارين ← مرح ← تهدئة (في آخر جولة)
  const STAGES = [
    ["🔥 إحماء", [["امشِ في مكانك", "🚶"], ["ارفع يديك وتمدّد للأعلى", "🙆"], ["حرّك كتفيك في دوائر", "🔄"], ["انظر يمين يسار", "👀"], ["انظر يسار يسار", "👈"]]],
    ["💪 تمرين", [["اقفز اقفز", "🦘"], ["اركض في مكانك", "🏃"], ["ارفع ركبتيك عالياً", "🦵"], ["افتح يديك ورجليك واقفز كالنجمة", "⭐"], ["انزل واجلس ثم قم", "🏋️"], ["ارفع يدك", "🙋"], ["المس أصابع قدميك", "🦶"], ["قف على رِجلٍ واحدة", "🦩"]]],
    ["😄 مرح", [["مُدّ لسانك", "😛"], ["حرّك يديك كالطائرة", "✈️"], ["صفّق بيديك", "👏"], ["امشِ كالبطريق", "🐧"]]],
  ];
  const COOL = ["🌿 تهدئة", [["تنفّس بعمق ببطء", "🌬️"], ["هزّ يديك برفق", "👐"], ["ابتسم وارتح", "😊"]]];
  const flat = (list) => list.flatMap(([tag, ms]) => ms.map(([m, e]) => [tag, m, e]));
  const MOVES = flat(STAGES), COOLS = flat([COOL]);
  const DANCERS = ["💃", "🕺", "🐻", "🐵", "🐧", "🦄", "🐸", "🐼"];
  let songs = null;

  async function findSongs() {
    const out = [];
    for (let i = 1; i <= 30; i++) {
      try { const r = await fetch(`music/${i}.mp3`, { method: "HEAD" }); if (!r.ok) break; out.push(`music/${i}.mp3`); } catch { break; }
    }
    return out;
  }

  // ---------------------------------------------------------------- موسيقى مدمجة (Web Audio)
  function synth() {
    const ac = K.audioCtx();
    if (!ac) return { play() {}, pause() {}, stop() {} };
    const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const noise = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const mid = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const note = (f, t, d, type, v) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02); };
    const kick = (t) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g).connect(master); o.start(t); o.stop(t + 0.2); };
    const hit = (t, d, v, hp) => { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise; f.type = "highpass"; f.frequency.value = hp; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + d); };
    const CH = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]; // دو، صول، لا صغير، فا
    const MEL = [
      [72, 0, 76, 0, 79, 0, 76, 79, 77, 0, 76, 0, 74, 0, 72, 0], [74, 0, 79, 0, 83, 0, 79, 83, 81, 0, 79, 0, 77, 0, 74, 0],
      [76, 0, 81, 0, 84, 0, 81, 84, 83, 0, 81, 0, 79, 0, 76, 0], [77, 0, 81, 0, 84, 0, 81, 79, 77, 0, 76, 0, 74, 0, 0, 0]];
    const spb = 60 / 120 / 4; // مدة الخطوة (نوتة سادسة عشرة) على سرعة 120
    let step = 0, next = 0, timer = 0;
    const schedule = () => {
      while (next < ac.currentTime + 0.12) {
        const bar = Math.floor(step / 16) % 4, s = step % 16, t = next;
        if (s % 4 === 0) kick(t);
        if (s === 4 || s === 12) hit(t, 0.15, 0.25, 1200);
        if (s % 2 === 1) hit(t, 0.04, 0.08, 7000);
        if (s === 0 || s === 6 || s === 8 || s === 14) note(mid(CH[bar][0] - 12), t, 0.22, "triangle", 0.25);
        if (s === 0 || s === 8) CH[bar].forEach((m) => note(mid(m), t, 0.35, "square", 0.025));
        if (MEL[bar][s]) note(mid(MEL[bar][s]), t, 0.2, "triangle", 0.12);
        step++; next += spb;
      }
    };
    return {
      play() { if (timer) return; next = ac.currentTime + 0.05; master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0.8, ac.currentTime, 0.02); timer = setInterval(schedule, 25); schedule(); },
      pause() { clearInterval(timer); timer = 0; master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, 0.015); },
      stop() { this.pause(); setTimeout(() => master.disconnect(), 300); },
    };
  }
  function filePlayer(list) {
    const a = new Audio(K.pick(list)); a.loop = true;
    return { play() { a.play().catch(() => {}); }, pause() { a.pause(); }, stop() { a.pause(); a.src = ""; } };
  }

  async function homeScreen() {
    K.begin();
    if (songs === null) songs = await findSongs();
    K.begin();
    K.paint(`
      <div class="title"><span class="mascot emo">🕺</span><div><h1>رقصة التجميد</h1><div class="sub">ارقصوا مع الموسيقى… وعندما تتوقف: تجمّدوا! 🧊</div></div></div>
      <div class="dancers emo">${DANCERS.slice(0, 5).map((d, i) => `<span style="animation-delay:${-i * 0.2}s">${d}</span>`).join("")}</div>
      <div class="mini">
        <button class="btn f go big" ${K.act("go", () => K.show(danceScreen))}>▶️ ابدأ الرقص</button>
        <button class="btn f" ${K.act("rounds", () => { save.rounds = save.rounds === 5 ? 8 : save.rounds === 8 ? 12 : 5; save.save(); K.render(); })}>🔁 عدد الجولات: ${save.rounds}</button>
      </div>
      <div class="sub">${songs.length ? `🎵 ${songs.length} أنشودة من مجلد music` : `🎵 موسيقى مدمجة — يمكنك وضع أناشيدك في مجلد <bdi>music</bdi> بأسماء <bdi dir="ltr">1.mp3</bdi> و <bdi dir="ltr">2.mp3</bdi> …`}</div>
      ${K.HELP}`, "go");
  }

  function danceScreen() {
    K.begin();
    const music = songs.length ? filePlayer(songs) : synth();
    let round = 0, state = "ready", paused = false, left = 0, tEnd = 0;
    K.mode = {
      stop: () => music.stop(),
      key(e) { if (e.key === "Enter" || e.key === " ") { togglePause(); return true; } return false; },
    };
    K.paint(`
      <div class="top">${K.backBtn()}<span class="pill round"></span><span class="pill">Enter = إيقاف مؤقت</span></div>
      <div class="stage"><div class="big-emo emo"></div><div class="word"></div><div class="pose"></div></div>`, "back");
    const $ = (s) => K.app.querySelector(s);
    const show = (cls, emo, word, pose = "") => {
      document.body.dataset.state = cls;
      $(".big-emo").innerHTML = emo; $(".word").textContent = word; $(".pose").innerHTML = pose;
      $(".round").textContent = `الجولة ${Math.max(1, Math.min(round, save.rounds))} / ${save.rounds}`;
    };
    const dance = () => {
      round++;
      if (round > save.rounds) return finish();
      state = "dance";
      const d = K.shuffle(DANCERS).slice(0, 3).map((x, i) => `<span style="animation-delay:${-i * 0.25}s">${x}</span>`).join("");
      show("dance", d, "ارقصوا! 🎶");
      music.play();
      moves();
      wait(round === 1 ? 9000 : 6000 + Math.random() * 9000, freeze);
    };
    const freeze = () => {
      state = "freeze";
      clearTimeout(moveTid); music.pause(); K.sfx.bad();
      const [p, e] = K.pick(POSES);
      show("freeze", "🧊", "تجمّدوا!", `<span class="emo">${e}</span> ${p}`);
      wait(4000 + Math.random() * 2500, dance);
    };
    let tid = 0, moveTid = 0, moveIdx = 0, coolIdx = 0;
    function moves() {
      const last = round >= save.rounds;
      const [tag, m, e] = last ? COOLS[coolIdx++ % COOLS.length] : MOVES[moveIdx++ % MOVES.length];
      $(".pose").innerHTML = `<small class="tag">${tag}</small> <span class="emo">${e}</span> ${m}`; K.sfx.tick();
      moveTid = K.later(moves, last ? 6000 : 5000);
    }
    function wait(ms, fn) { left = ms; tEnd = performance.now() + ms; tid = K.later(fn, ms); }
    function togglePause() {
      if (state === "ready" || state === "done") return;
      if (!paused) { paused = true; clearTimeout(tid); clearTimeout(moveTid); left = tEnd - performance.now(); music.pause(); $(".word").textContent = "⏸️ استراحة — Enter للمتابعة"; }
      else { paused = false; $(".word").textContent = state === "dance" ? "ارقصوا! 🎶" : "تجمّدوا!"; if (state === "dance") { music.play(); moves(); } wait(left, state === "dance" ? freeze : dance); }
    }
    function finish() {
      state = "done"; clearTimeout(moveTid); music.pause(); delete document.body.dataset.state;
      K.replace(K.resultScreen, { s: 3, msg: "أحسنتم! أبطال الرقص 🏆", again: () => K.replace(danceScreen) });
    }
    // عدّ تنازلي
    show("ready", "3", "استعدّوا…");
    [2, 1].forEach((n, i) => K.later(() => { $(".big-emo").textContent = n; K.sfx.tick(); }, 1000 * (i + 1)));
    K.later(dance, 3000);
  }
  const _back = K.back;
  K.back = () => { delete document.body.dataset.state; _back(); };

  K.start(homeScreen);
})();
