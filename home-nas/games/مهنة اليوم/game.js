// مهنة اليوم — قيد الإنشاء (نصنعها مع صاحب المشروع خطوة خطوة).
(() => {
  "use strict";
  const GAME = "مهنة اليوم";

  function homeScreen() {
    K.begin();
    K.paint(`
      <div class="title"><span class="emo">👩‍🚒</span><div><h1>${GAME}</h1><div class="sub">من أكون اليوم؟ 👨‍⚕️👩‍🏫👨‍🍳</div></div></div>
      <div class="soon">قريباً…</div>`);
  }

  K.start(homeScreen);
})();
