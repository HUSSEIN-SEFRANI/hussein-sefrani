// من هذا؟ — تعرّف على أفراد العائلة من صورهم
// الصور: ضع صور العائلة في مجلد family داخل مجلد اللعبة، واسم كل صورة هو اسم الشخص:
//   بابا.jpg  ماما.jpg  سارة.jpg  سارة 2.jpg  جدو (1).jpg
(() => {
  "use strict";
  const save = K.store("who", { stars: {} });
  let people = null; // [{ name, photos: [url] }]

  const personName = (file) => file.replace(/\.[^.]+$/, "").replace(/[\s_\-]*(\(\d+\)|\d+)$/u, "").trim();
  async function loadPeople() {
    const imgs = await K.listImages("family");
    const map = new Map();
    for (const im of imgs) {
      const n = personName(im.name);
      if (!n) continue;
      if (!map.has(n)) map.set(n, []);
      map.get(n).push(im.url);
    }
    return [...map].map(([name, photos]) => ({ name, photos }));
  }
  const photo = (url) => `<img src="${url}" alt="">`;
  const say = (p) => K.tts(p.name, "ar");

  async function homeScreen() {
    K.begin();
    if (!people) {
      K.paint(`<h1>من هذا؟</h1><div class="sub">لحظة…</div>`);
      people = await loadPeople();
      K.begin();
    }
    if (people.length < 2) return howTo();
    const thumbs = people.slice(0, 12).map((p) => `<div class="face"><img src="${p.photos[0]}" alt=""><b>${K.esc(p.name)}</b></div>`).join("");
    K.paint(`
      <div class="title"><span class="mascot emo">🕵️</span><div><h1>من هذا؟</h1><div class="sub">هل تعرف عائلتك؟</div></div></div>
      <div class="faces">${thumbs}</div>
      <div class="modes">
        <button class="mode f" style="background:linear-gradient(135deg,#f97316,#ef4444)" ${K.act("who", () => K.show(K.quizScreen, whoQuiz()))}>
          <span class="big emo">🤔</span><b>من هذا؟</b><small>اختر الاسم</small><span class="st">${K.starsHtml(save.stars.who || 0)}</span></button>
        <button class="mode f" style="background:linear-gradient(135deg,#06b6d4,#2563eb)" ${K.act("where", () => K.show(K.quizScreen, whereQuiz()))}>
          <span class="big emo">🔍</span><b>أين…؟</b><small>اختر الصورة</small><span class="st">${K.starsHtml(save.stars.where || 0)}</span></button>
      </div>
      ${K.HELP}`, "who");
  }

  function howTo() {
    K.paint(`
      <div class="title"><span class="mascot emo">🕵️</span><h1>من هذا؟</h1></div>
      <div class="note">
        <b>للأهل:</b> هذه اللعبة تحتاج صور العائلة.<br>
        ١) افتح مجلد هذه اللعبة على السيرفر، وأنشئ داخله مجلداً اسمه <code>family</code><br>
        ٢) ضع فيه صور الأشخاص، واكتب <b>اسم الشخص</b> اسماً للصورة:<br>
        <code>بابا.jpg</code> · <code>ماما.jpg</code> · <code>سارة.jpg</code> · <code>سارة 2.jpg</code><br>
        ٣) يكفي شخصان أو أكثر (ويُفضّل صورة واضحة للوجه).
      </div>
      ${K.HELP}`);
  }

  function whoQuiz() {
    return {
      title: "من هذا؟",
      optsCls: "txt",
      make() {
        const n = Math.min(8, Math.max(5, people.length * 2));
        return Array.from({ length: n }, () => {
          const p = K.pick(people);
          const opts = K.options(p, people, 3, (a, b) => a.name === b.name);
          return { prompt: `<div class="col">${photo(K.pick(p.photos))}<div class="q">من هذا؟</div></div>`, opts: opts.map((o) => K.esc(o.name)), answer: opts.indexOf(p), sayOk: () => say(p) };
        });
      },
      done(score, s) { save.stars.who = Math.max(save.stars.who || 0, s); save.save(); },
    };
  }

  function whereQuiz() {
    return {
      title: "أين…؟",
      optsCls: "photos",
      make() {
        const n = Math.min(8, Math.max(5, people.length * 2));
        return Array.from({ length: n }, () => {
          const p = K.pick(people);
          const opts = K.options(p, people, Math.min(3, people.length), (a, b) => a.name === b.name);
          return { prompt: `<div class="q big">أين <b>${K.esc(p.name)}</b>؟</div>`, opts: opts.map((o) => photo(K.pick(o.photos))), answer: opts.indexOf(p), say: () => say(p) };
        });
      },
      done(score, s) { save.stars.where = Math.max(save.stars.where || 0, s); save.save(); },
    };
  }

  K.start(homeScreen);
})();
