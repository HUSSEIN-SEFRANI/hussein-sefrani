// صورة الغلاف لكل لعبة (cover.jpg بحجم 640×360) من شاشتها الأولى.
//   node games/_kit/tools/covers.js "<اسم اللعبة>" ["<لعبة أخرى>" ...]
// يحتاج الخادم التجريبي يعمل على 8766: python3 games/_kit/tools/mock.py 8766
const { chromium } = require('playwright');
const path = require('path');
const GAMES = path.resolve(__dirname, '..', '..');
const games = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const gm of games) {
    const p = await b.newPage({ viewport: { width: 640, height: 360 } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://127.0.0.1:8766/tv/game/1/' + encodeURIComponent(gm) + '/index.html');
    await p.waitForTimeout(1500);
    // إخفاء سطر المساعدة وإطار التحديد ليبدو الغلاف نظيفاً
    await p.addStyleTag({ content: '.help{display:none!important} .f.sel{transform:none!important;box-shadow:0 1.5vh 3vh rgba(30,58,138,.3)!important}' });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(GAMES, gm, 'cover.jpg'), type: 'jpeg', quality: 85 });
    console.log(gm, errs.length ? errs : 'ok');
    await p.close();
  }
  await b.close();
})();
