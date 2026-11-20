// لعبة الطبخ — قيد الإنشاء (نصنعها مع صاحب المشروع خطوة خطوة).
(() => {
  "use strict";
  const GAME = "لعبة الطبخ";

  function homeScreen() {
    K.begin();
    K.paint(`
      <div class="title"><span class="emo">🍳</span><div><h1>${GAME}</h1><div class="sub">اطبخ أطيب الأكلات 🥘🍰</div></div></div>
      <div class="soon">قريباً…</div>`);
  }

  K.start(homeScreen);
})();
