// مغامرات كرمو — لعبة WebGL (قيد الإنشاء مع صاحب المشروع خطوة خطوة).
(() => {
  "use strict";
  const GAME = "مغامرات كرمو";

  function homeScreen() {
    K.begin();
    K.paint(`
      <div class="title"><span class="emo">🧭</span><div><h1>${GAME}</h1><div class="sub">مغامرة ثلاثية الأبعاد ✨</div></div></div>
      <div class="soon">قريباً…</div>`);
  }

  K.start(homeScreen);
})();
