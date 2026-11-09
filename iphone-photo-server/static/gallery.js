(() => {
  const $ = (id) => document.getElementById(id);
  const PAGE = 150;
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  let items = [], next = 0, loading = false, kind = 'all', current = -1, lastMonth = null, grid = null;

  document.querySelectorAll('.filters button').forEach(b => b.onclick = () => {
    document.querySelectorAll('.filters button').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); kind = b.dataset.kind; reset();
  });

  function reset() { items = []; next = 0; lastMonth = null; grid = null; $('gallery').innerHTML = ''; load(); }

  async function load() {
    if (loading || next === null) return;
    loading = true;
    try {
      const r = await fetch(`/api/media?limit=${PAGE}&offset=${next}&kind=${kind}`);
      if (r.status === 401) { location.href = '/login?next=/gallery'; return; }
      const j = await r.json();
      j.items.forEach(add);
      next = j.next;
      $('empty').hidden = items.length > 0;
    } finally { loading = false; }
    if (next !== null && isVisible($('sentinel'))) load();
  }

  function add(it) {
    const idx = items.push(it) - 1;
    const d = new Date(it.taken_at);
    const key = d.getFullYear() + '-' + d.getMonth();
    if (key !== lastMonth) {
      lastMonth = key;
      const h = document.createElement('div');
      h.className = 'grid-month';
      h.textContent = `${months[d.getMonth()]} ${d.getFullYear()}`;
      $('gallery').appendChild(h);
      grid = document.createElement('div'); grid.className = 'grid';
      $('gallery').appendChild(grid);
    }
    const c = document.createElement('div');
    c.className = 'cell';
    c.innerHTML = `<img loading="lazy" decoding="async" src="/thumb/${it.id}" alt="">` + (it.is_video ? '<span class="vid">▶ فيديو</span>' : '');
    c.onclick = () => open(idx);
    it.el = c;
    grid.appendChild(c);
  }

  function isVisible(el) { const r = el.getBoundingClientRect(); return r.top < innerHeight + 600; }
  new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) load(); }, { rootMargin: '600px' }).observe($('sentinel'));

  // ---------- viewer
  function fmt(n) { const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++; } return n.toFixed(i ? 1 : 0) + ' ' + u[i]; }

  function open(i) {
    if (i < 0 || i >= items.length) return;
    current = i;
    const it = items[i];
    const stage = $('vStage');
    stage.innerHTML = '';
    if (it.is_video) {
      const v = document.createElement('video');
      v.src = `/view/${it.id}`; v.controls = true; v.playsInline = true; v.autoplay = true;
      stage.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = `/thumb/${it.id}`;
      const full = new Image();
      full.onload = () => { if (current === i) img.src = full.src; };
      full.src = `/view/${it.id}`;
      stage.appendChild(img);
    }
    $('vTitle').textContent = it.original_name;
    $('vDownload').href = `/download/${it.id}`;
    const dims = it.width ? ` · ${it.width}×${it.height}` : '';
    $('vMeta').textContent = `${new Date(it.taken_at).toLocaleString('ar')} · ${fmt(it.size)}${dims}`;
    $('viewer').classList.add('open');
    document.body.style.overflow = 'hidden';
    if (i > items.length - 10) load();
  }

  function close() {
    $('viewer').classList.remove('open'); $('vStage').innerHTML = '';
    document.body.style.overflow = ''; current = -1;
  }

  $('vClose').onclick = close;
  $('vNext').onclick = () => open(current + 1);
  $('vPrev').onclick = () => open(current - 1);
  $('vDelete').onclick = async () => {
    const it = items[current];
    if (!confirm('نقل هذا الملف إلى سلة المحذوفات على الكمبيوتر؟')) return;
    const r = await fetch(`/api/media/${it.id}`, { method: 'DELETE' });
    if (r.ok) {
      it.el.remove(); items.splice(current, 1);
      if (items.length) open(Math.min(current, items.length - 1)); else { close(); $('empty').hidden = false; }
      items.forEach((x, k) => x.el.onclick = () => open(k));
    }
  };
  document.addEventListener('keydown', e => {
    if (current < 0) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') open(current + 1);
    if (e.key === 'ArrowRight') open(current - 1);
  });
  // سحب باليد للتنقل
  let sx = null;
  $('vStage').addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  $('vStage').addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 60) open(current + (dx > 0 ? 1 : -1));
  });

  load();
})();
