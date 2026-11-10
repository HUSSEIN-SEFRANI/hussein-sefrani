// HOME ANAB — interface language (العربية / English / Français).
// Loaded in <head> on every page, before anything is drawn. The interface is written in
// Arabic; for English and French every Arabic phrase on screen is replaced from
// I18N_DICT as soon as it appears (pages, dialogs, server messages, dynamic text),
// and the layout switches to left-to-right.
(function () {
  var SUPPORTED = ['ar', 'en', 'fr'];
  var NAMES = { ar: 'العربية', en: 'English', fr: 'Français' };

  function pick() {
    try { var s = localStorage.getItem('lang'); if (SUPPORTED.indexOf(s) >= 0) return s; } catch (e) { }
    var m = document.cookie.match(/(?:^|; )lang=(\w+)/);
    if (m && SUPPORTED.indexOf(m[1]) >= 0) return m[1];
    return 'ar';  // العربية افتراضياً؛ الاختيار يُحفظ لكل جهاز
  }

  var lang = pick();
  var I18N = window.I18N = {
    lang: lang,
    rtl: lang === 'ar',
    locale: { ar: 'ar', en: 'en-GB', fr: 'fr-FR' }[lang],
    names: NAMES,
    supported: SUPPORTED,
    t: function (s) { return s; },
    set: function (l) {
      if (SUPPORTED.indexOf(l) < 0) return;
      try { localStorage.setItem('lang', l); } catch (e) { }
      document.cookie = 'lang=' + l + '; path=/; max-age=31536000; samesite=lax';
      location.reload();
    },
    /** أزرار اختيار اللغة */
    switcher: function () {
      var box = document.createElement('div');
      box.className = 'lang-switch';
      box.setAttribute('translate', 'no');
      SUPPORTED.forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = NAMES[l];
        if (l === lang) b.className = 'on';
        b.onclick = function () { I18N.set(l); };
        box.appendChild(b);
      });
      return box;
    },
  };

  if (lang === 'ar') return;

  var html = document.documentElement;
  html.lang = lang;
  html.dir = 'ltr';

  var col = lang === 'en' ? 0 : 1;
  var DICT = window.I18N_DICT || {};
  var HAS_AR = /[؀-ۿ]/;
  var RUN = /[؀-ۿ](?:[؀-ۿً-ٟ«»،؛؟\s\-]*[؀-ۿً-ٟ»])?/g;

  var PUNCT = { '،': ',', '؛': ';', '؟': '?' };

  // عبارة غير معروفة كاملةً: نقسمها إلى أطول أجزاء معروفة (مثل «ملف إلى» + «مساحتي الشخصية»)
  function pieces(phrase) {
    var words = phrase.split(' '), out = [], i = 0;
    while (i < words.length) {
      var hit = false;
      for (var j = words.length; j > i; j--) {
        var key = words.slice(i, j).join(' '), tail = '';
        var m = key.match(/^(.*?)([،؛؟]+)$/);
        if (!DICT[key] && m && DICT[m[1]]) { tail = m[2].replace(/[،؛؟]/g, function (c) { return PUNCT[c]; }); key = m[1]; }
        if (DICT[key]) { out.push(DICT[key][col] + tail); i = j; hit = true; break; }
      }
      if (!hit) { out.push(words[i]); i++; }
    }
    return out.join(' ');
  }

  function t(s) {
    if (!s || !(HAS_AR.test(s) || s.indexOf('←') >= 0)) return s;
    var out = s.replace(RUN, function (m) {
      var key = m.replace(/\s+/g, ' ').trim();
      var v = DICT[key];
      return v ? v[col] : pieces(key);
    });
    // أسهم الخطوات تتبع اتجاه القراءة، وعلامات الاقتباس حسب اللغة
    out = out.replace(/←/g, '→');
    if (lang === 'en') out = out.replace(/«\s?/g, '“').replace(/\s?»/g, '”');
    return out;
  }
  I18N.t = t;

  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };

  function skipped(el) {
    // محتوى المستخدم (أسماء ملفاته مثلاً) يبقى كما هو
    for (var e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (SKIP[e.tagName] || e.getAttribute('translate') === 'no' || e.isContentEditable) return true;
    }
    return false;
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (v && HAS_AR.test(v)) {
        var n = t(v);
        if (n !== v) el.setAttribute(ATTRS[i], n);
      }
    }
  }

  function walk(node) {
    if (node.nodeType === 3) {
      var v = node.nodeValue;
      if ((HAS_AR.test(v) || v.indexOf('←') >= 0) && !skipped(node.parentNode)) {
        var n = t(v);
        if (n !== v) node.nodeValue = n;
      }
      return;
    }
    if (node.nodeType !== 1 || skipped(node)) return;
    translateAttrs(node);
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') walk(m.target);
      else if (m.type === 'attributes') { if (!skipped(m.target)) translateAttrs(m.target); }
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
  }).observe(html, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  if (document.body) walk(document.body);
  if (document.head) walk(document.head);

  // الرسائل الأصلية للمتصفح
  var _confirm = window.confirm, _alert = window.alert, _prompt = window.prompt;
  window.confirm = function (m) { return _confirm.call(window, t(String(m))); };
  window.alert = function (m) { return _alert.call(window, t(String(m))); };
  window.prompt = function (m, d) { return _prompt.call(window, t(String(m)), d); };
})();
