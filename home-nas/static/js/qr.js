/* رموز QR محلية (بدون إنترنت): يرسم رمزاً في كل عنصر فيه data-qr. يعتمد على vendor/qrcode.js (MIT).
   للاستعمال من الوحدات: window.HSEF_QR(text) يعيد نص SVG، أو loadQR() في core/tv يحمّل الملفين عند الحاجة. */
(function () {
  function svg(text) {
    if (!window.qrcode || !text) return '';
    var q = window.qrcode(0, 'M');
    q.addData(String(text));
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }
  window.HSEF_QR = svg;
  function drawAll() {
    var els = document.querySelectorAll('[data-qr]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.dataset.qrDone) continue;
      el.innerHTML = svg(el.getAttribute('data-qr'));
      el.dataset.qrDone = '1';
      var s = el.querySelector('svg');
      if (s) { s.style.width = '100%'; s.style.height = '100%'; s.style.background = '#fff'; }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', drawAll); else drawAll();
})();
