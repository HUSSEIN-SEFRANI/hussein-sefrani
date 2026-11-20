// لعبة المزارع — قيد الإنشاء (نصنعها مع صاحب المشروع خطوة خطوة).
(() => {
  "use strict";
  const GAME = "لعبة المزارع";

  function homeScreen() {
    K.begin();
    K.paint(`
      <div class="title"><span class="emo">🚜</span><div><h1>${GAME}</h1><div class="sub">ازرع واسقِ واحصد 🌱🌽🐄</div></div></div>
      <div class="soon">قريباً…</div>`);
  }

  K.start(homeScreen);
})();
