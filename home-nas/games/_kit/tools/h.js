// تجربة لعبة بالأزرار وتصوير الشاشة (يحتاج الخادم التجريبي: python3 games/_kit/tools/mock.py 8766)
// node h.js "<game folder>" outdir step1 step2 ...   steps: key names, w<ms>, s<name> (screenshot), e<js> (eval & print), c<selector> (click)
const { chromium } = require('playwright');
(async () => {
  const [game, out, ...steps] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('response', r => { if (r.status() >= 400 && !/\/(audio|sounds|sons|music)\/|\.mp3|\.m4a/.test(decodeURI(r.url()))) errs.push(r.status() + ' ' + decodeURI(r.url())); });
  await p.goto('http://127.0.0.1:8766/tv/game/1/' + encodeURIComponent(game) + '/index.html');
  await p.waitForTimeout(700);
  for (const s of steps) {
    if (s[0] === 'w' && /^w\d+$/.test(s)) await p.waitForTimeout(+s.slice(1));
    else if (s.startsWith('s:')) await p.screenshot({ path: `${out}/${s.slice(2)}.png` });
    else if (s.startsWith('e:')) console.log('EVAL', JSON.stringify(await p.evaluate(s.slice(2))));
    else if (s.startsWith('c:')) { await p.click(s.slice(2)); await p.waitForTimeout(150); }
    else { const [k, n] = s.split('*'); for (let i = 0; i < (+n || 1); i++) { await p.keyboard.press(k); await p.waitForTimeout(140); } }
  }
  console.log('ERRORS', errs.length ? errs : 'none');
  await b.close();
})();
