// قصة قبل النوم — قصص قصيرة هادئة، قراءة تلقائية، ووضع النوم (موسيقى هادئة ثم شاشة مظلمة)
// صوت (اختياري): سجّل القصة بصوتك وضع الملفات في مجلد audio بأسماء: <رقم القصة>-<رقم الصفحة>.mp3 مثل 1-1.mp3 و 1-2.mp3
(() => {
  "use strict";
  const save = K.store("story", { read: {}, sleep: 10 });
  const ST = [
    { t: "الأرنب الصغير والقمر", i: "🐰", c: "#6366f1", pages: [
      ["في ليلةٍ هادئة، نظر الأرنب الصغير «نونو» من نافذة بيته، فرأى القمر كبيراً ومضيئاً.", "🐰🪟🌕"],
      ["قال نونو: أريد أن ألمس القمر! ثم قفز… وقفز… لكن القمر بقي بعيداً.", "🐰💨🌕"],
      ["صعد نونو إلى أعلى التلّة، ومدّ يديه الصغيرتين نحو السماء.", "⛰️🐰🙌"],
      ["جاءت أمّه وقالت بلطف: يا نونو، القمر بعيدٌ جداً، لكنه يرسل لنا نوره كل ليلة ليضيء طريقنا.", "🐇💛🐰"],
      ["ابتسم نونو وقال: إذن القمر صديقي، يسهر معي حتى أنام.", "🐰😊🌙"],
      ["عاد نونو إلى سريره الدافئ وقال: تصبح على خير يا قمر… ثم نام نوماً عميقاً.", "🛏️🐰😴"]] },
    { t: "النجمة الصغيرة", i: "⭐", c: "#0ea5e9", pages: [
      ["في السماء الواسعة، كانت هناك نجمة صغيرة اسمها «لمعة»، ضوؤها خافتٌ قليلاً.", "🌌⭐✨"],
      ["كانت لمعة تقول: النجوم الأخرى أكبر مني وأجمل، فما فائدة ضوئي الصغير؟", "⭐😔"],
      ["وفي تلك الليلة، ضلّ عصفورٌ صغير طريقه إلى عشّه في الظلام.", "🐦❓🌲"],
      ["رأى العصفور ضوء لمعة القريب، فطار نحوه حتى وصل إلى شجرته وعشّه.", "🐦⭐🪺"],
      ["قال العصفور: شكراً لكِ يا لمعة، ضوؤكِ الصغير أوصلني إلى بيتي!", "🐦💛⭐"],
      ["فرحت لمعة، وعرفت أن كل واحدٍ منّا مهمّ مهما كان صغيراً. ثم أغمضت عينيها ونامت.", "⭐😊💤"]] },
    { t: "الفيل الذي خاف من الظلام", i: "🐘", c: "#8b5cf6", pages: [
      ["كان الفيل الصغير «فوفو» يخاف من الظلام كثيراً.", "🐘😟🌑"],
      ["عندما تغيب الشمس، كان يختبئ قرب أمّه ولا يريد أن ينام.", "🌇🐘🐘"],
      ["قالت له البومة الحكيمة: تعال يا فوفو، سأريك أسرار الليل الجميلة.", "🦉✨🐘"],
      ["نظر فوفو إلى السماء، فرأى آلاف النجوم تلمع مثل الجواهر.", "🌌✨🐘"],
      ["وسمع الصراصير تغنّي بهدوء، وشمّ رائحة الأزهار الليلية.", "🦗🎶🌸"],
      ["قال فوفو: الليل ليس مخيفاً، إنه هادئٌ وجميل! ثم تثاءب ونام قرب أمّه مطمئناً.", "🐘😴💤"]] },
    { t: "سارة وبذرة التفاح", i: "🍎", c: "#16a34a", pages: [
      ["وجدت سارة بذرة تفاحٍ صغيرة، فزرعتها في حديقة البيت.", "👧🌱"],
      ["كل صباح، كانت تسقيها بالماء وتقول: اكبري يا بذرتي الصغيرة.", "👧💧🌱"],
      ["مرّت الأيام، وصارت البذرة نبتةً خضراء صغيرة.", "☀️🌿"],
      ["ثم كبرت النبتة… وكبرت… حتى صارت شجرةً عالية.", "🌳"],
      ["وفي يومٍ جميل، رأت سارة تفاحاتٍ حمراء لامعة على الأغصان!", "🌳🍎🍎"],
      ["قطفت سارة التفاح وشاركته مع عائلتها، وقالت: الصبر يجعل الأشياء الجميلة تكبر.", "👧🍎❤️"]] },
    { t: "السلحفاة والنملة", i: "🐢", c: "#0d9488", pages: [
      ["أرادت النملة الصغيرة أن تعبر النهر لتصل إلى بيتها.", "🐜🌊🏠"],
      ["لكن النهر كان واسعاً، والنملة لا تعرف السباحة.", "🐜😟🌊"],
      ["مرّت السلحفاة الطيّبة وقالت: اصعدي على ظهري، سأوصلك.", "🐢💬🐜"],
      ["سبحت السلحفاة ببطءٍ وهدوء، والنملة تمسك جيداً.", "🐢🐜🌊"],
      ["وصلتا إلى الضفّة الأخرى، فقالت النملة: شكراً يا صديقتي!", "🐜💛🐢"],
      ["ومنذ ذلك اليوم صارتا صديقتين، تساعد كلٌّ منهما الأخرى.", "🐜🤝🐢"]] },
    { t: "مشمش وكرة الصوف", i: "🐱", c: "#ea580c", pages: [
      ["كان للقطة «مشمش» كرة صوفٍ حمراء تحب أن تلعب بها.", "🐱🧶"],
      ["وفي يومٍ من الأيام، تدحرجت الكرة بعيداً واختفت!", "🧶💨"],
      ["بحثت مشمش تحت الكرسي، وخلف الباب، وفي الحديقة.", "🐱🔍🚪"],
      ["جاء الكلب «بندق» وقال: لقد رأيت كرتك قرب شجرة الورد.", "🐕💬🌹"],
      ["وجدت مشمش كرتها وقالت: شكراً يا بندق، تعال نلعب معاً!", "🐱🧶🐕"],
      ["لعبا معاً حتى تعبا، ثم ناما متجاورين بسعادة.", "🐱🐕😴"]] },
  ];
  const SLEEP = [0, 5, 10, 20, 30];
  let auto = true;

  function homeScreen() {
    K.begin();
    const cards = ST.map((s, i) => `
      <button class="book f" style="--c:${s.c}" ${K.act("s" + i, () => K.show(pageScreen, i, 0))}>
        <span class="emo">${s.i}</span><b>${s.t}</b>${save.read[i] ? `<small>✓ قرأتها</small>` : ""}</button>`).join("");
    K.paint(`
      <div class="title"><span class="mascot emo">🌙</span><div><h1>قصة قبل النوم</h1><div class="sub">اختر قصة، ثم استرخِ واستمع</div></div></div>
      <div class="books">${cards}</div>
      <div class="mini">
        <button class="btn f" ${K.act("auto", () => { auto = !auto; K.render(); })}>${auto ? "▶️ قراءة تلقائية: نعم" : "⏸️ قراءة تلقائية: لا"}</button>
        <button class="btn f" ${K.act("timer", () => { save.sleep = SLEEP[(SLEEP.indexOf(save.sleep) + 1) % SLEEP.length]; save.save(); K.render(); })}>
          ⏲️ وضع النوم بعد القصة: ${save.sleep ? save.sleep + " دقيقة" : "لا"}</button>
        <button class="btn f" ${K.act("night", () => K.show(nightScreen))}>😴 نَم الآن</button>
      </div>
      ${K.HELP}`, "s0");
  }

  function pageScreen(si, pi) {
    K.begin();
    const s = ST[si], pg = s.pages[pi], last = pi === s.pages.length - 1;
    const go = (d) => {
      const j = pi + d;
      if (j < 0) return;
      if (j >= s.pages.length) { save.read[si] = 1; save.save(); return save.sleep ? K.replace(nightScreen) : K.replace(endScreen, si); }
      K.top().args = [si, j]; K.top().focus = d > 0 ? "next" : "prev"; K.render();
    };
    K.paint(`
      <div class="top">${K.backBtn()}<h2>${s.t}</h2><span class="pill">${pi + 1} / ${s.pages.length}</span></div>
      <div class="page" style="--c:${s.c}">
        <div class="scene emo">${[...pg[1]].filter((c) => c !== "️").map((c, k) => `<span style="animation-delay:${-k * 0.8}s">${c}</span>`).join("")}</div>
        <p>${pg[0]}</p>
      </div>
      <div class="nav">
        <button class="btn f" ${K.act("prev", () => go(-1))}>→ السابقة</button>
        <button class="btn f" ${K.act("read", () => read())}><span class="emo">🔊</span> اقرأ</button>
        <button class="btn f go" ${K.act("next", () => go(1))}>${last ? "النهاية 🌙" : "التالية ←"}</button>
      </div>`, "next");
    function read(then) {
      let done = false;
      const fin = () => { if (!done) { done = true; then && then(); } };
      K.play([`audio/${si + 1}-${pi + 1}.mp3`], null, "ar", fin, () => {
        const spoken = K.tts(pg[0], "ar", 0.8);
        K.later(fin, 3500 + pg[0].length * (spoken ? 110 : 90));
      });
    }
    if (auto) K.later(() => read(() => K.later(() => go(1), 1200)), 700);
  }

  function endScreen(si) {
    K.begin();
    K.paint(`
      <h1>النهاية 🌙</h1>
      <div class="scene emo big"><span>${ST[si].i}</span><span>💤</span></div>
      <div class="sub">تصبح على خير</div>
      <div class="nav">
        ${si < ST.length - 1 ? `<button class="btn f go" ${K.act("next", () => K.replace(pageScreen, si + 1, 0))}>قصة أخرى ←</button>` : ""}
        <button class="btn f" ${K.act("night", () => K.replace(nightScreen))}>😴 وضع النوم</button>
        <button class="btn f" ${K.act("home", K.home)}><span class="emo">🏠</span> القصص</button>
      </div>`, "night");
  }

  // ---------------------------------------------------------------- وضع النوم: نجوم وقمر وموسيقى هادئة، ثم شاشة مظلمة
  function nightScreen() {
    K.begin();
    const mins = save.sleep || 10;
    const stars = K.range(0, 40).map(() => `<i style="left:${Math.random() * 100}vw;top:${Math.random() * 70}vh;animation-delay:${-Math.random() * 4}s;font-size:${1 + Math.random() * 2}vh">✦</i>`).join("");
    K.paint(`
      <div class="night">${stars}<div class="moon"></div>
        <div class="gn">تصبح على خير 🌙<small>اضغط رجوع للخروج</small></div>
        <div class="dark"></div>
      </div>
      <button class="btn f hidden-btn" ${K.act("back", K.back)}>رجوع</button>`, "back");
    const ac = K.audioCtx();
    let stopAt = performance.now() + mins * 60000, alive = true;
    const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // سلّم خماسي هادئ
    const bell = (f, t) => {
      if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 3);
    };
    const tick = () => {
      if (!alive) return;
      const left = stopAt - performance.now();
      if (left <= 0) { K.app.querySelector(".dark").classList.add("on"); return; }
      if (ac) { const t = ac.currentTime + 0.05; bell(K.pick(notes) / (Math.random() < 0.3 ? 2 : 1), t); if (Math.random() < 0.4) bell(K.pick(notes) / 2, t + 0.6); }
      K.later(tick, 1400 + Math.random() * 900);
    };
    tick();
    K.mode = { stop: () => { alive = false; } };
  }

  K.start(homeScreen);
})();
