(() => {
  const CONCURRENCY = 3;
  const MAX_RETRIES = 2;
  const $ = (id) => document.getElementById(id);
  const picker = $('picker'), drop = $('drop');
  let queue = [], active = 0, stopped = false, wakeLock = null;
  const counts = { done: 0, total: 0, saved: 0, dup: 0, err: 0 };

  $('choose').onclick = () => picker.click();
  picker.onchange = () => { addFiles([...picker.files]); picker.value = ''; };

  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addFiles([...e.dataTransfer.files]));

  $('cancel').onclick = () => { stopped = true; $('queueTitle').textContent = 'تم الإيقاف'; releaseWake(); };
  $('retry').onclick = () => {
    const failed = queue.filter(j => j.state === 'error');
    failed.forEach(j => { j.state = 'pending'; j.tries = 0; setRow(j, 'بالانتظار', ''); });
    counts.err -= failed.length; counts.done -= failed.length;
    $('retry').hidden = true; stopped = false; render(); pump();
  };

  function fmt(n) {
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(i ? 1 : 0) + ' ' + u[i];
  }

  function addFiles(files) {
    if (!files.length) return;
    $('queueCard').hidden = false;
    stopped = false;
    for (const f of files) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="n"></span><span class="s muted">بالانتظار</span><div class="progress bar"><div></div></div>';
      li.querySelector('.n').textContent = `${f.name} (${fmt(f.size)})`;
      $('list').appendChild(li);
      queue.push({ file: f, li, state: 'pending', tries: 0 });
      counts.total++;
    }
    render();
    requestWake();
    pump();
  }

  function setRow(job, text, cls, pct) {
    const s = job.li.querySelector('.s');
    s.textContent = text; s.className = 's ' + (cls || 'muted');
    if (pct !== undefined) job.li.querySelector('.bar > div').style.width = pct + '%';
  }

  function render() {
    $('cntDone').textContent = `${counts.done} / ${counts.total}`;
    $('cntSaved').textContent = `جديد: ${counts.saved}`;
    $('cntDup').textContent = `مكرر: ${counts.dup}`;
    $('cntErr').textContent = `فشل: ${counts.err}`;
    $('totalBar').style.width = (counts.total ? counts.done / counts.total * 100 : 0) + '%';
    if (counts.done === counts.total && counts.total) {
      $('queueTitle').textContent = counts.err ? 'انتهى مع وجود أخطاء' : '✅ اكتمل الرفع';
      $('retry').hidden = !counts.err;
      releaseWake();
      refreshStats();
    } else if (!stopped) {
      $('queueTitle').textContent = 'جارِ الرفع…';
    }
  }

  function pump() {
    while (!stopped && active < CONCURRENCY) {
      const job = queue.find(j => j.state === 'pending');
      if (!job) return;
      upload(job);
    }
  }

  function upload(job) {
    job.state = 'uploading'; active++;
    setRow(job, 'يرفع…', 'muted', 0);
    const fd = new FormData();
    fd.append('last_modified', job.file.lastModified || '');
    fd.append('file', job.file, job.file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = e => { if (e.lengthComputable) setRow(job, 'يرفع… ' + Math.round(e.loaded / e.total * 100) + '%', 'muted', e.loaded / e.total * 100); };
    xhr.onload = () => {
      let res = null;
      try { res = JSON.parse(xhr.responseText).results[0]; } catch (_) {}
      if (xhr.status === 401) { location.href = '/login?next=/'; return; }
      if (xhr.status === 200 && res) {
        if (res.status === 'saved') { counts.saved++; finish(job, 'saved', '✓ حُفظ', 'ok'); }
        else if (res.status === 'duplicate') { counts.dup++; finish(job, 'dup', 'موجود مسبقاً', 'warn'); }
        else { counts.err++; finish(job, 'error', res.error || 'فشل', 'err'); }
      } else fail(job, xhr.status === 413 ? 'الملف كبير جداً' : 'خطأ ' + xhr.status);
    };
    xhr.onerror = () => fail(job, 'انقطع الاتصال');
    xhr.send(fd);
  }

  function fail(job, msg) {
    if (job.tries < MAX_RETRIES) {
      job.tries++; job.state = 'pending'; active--;
      setRow(job, 'إعادة المحاولة…', 'warn');
      setTimeout(pump, 1500 * job.tries);
      return;
    }
    counts.err++; finish(job, 'error', msg, 'err');
  }

  function finish(job, state, text, cls) {
    job.state = state; active--; counts.done++;
    setRow(job, text, cls, 100);
    render(); pump();
  }

  async function refreshStats() {
    try {
      const s = await (await fetch('/api/stats')).json();
      document.getElementById('stats').textContent = `${s.photos} صورة · ${s.videos} فيديو · ${s.total}`;
    } catch (_) {}
  }

  async function requestWake() {
    try { if ('wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
  }
  function releaseWake() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
  window.addEventListener('beforeunload', e => { if (active) { e.preventDefault(); e.returnValue = ''; } });
})();
