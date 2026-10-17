/**
 * WE-Core Admin extras
 *  - AdminOnline : who is online now / who left and for how long (table user_sessions via rpc admin_presence)
 *  - AdminFiles  : upload / browse / delete files in Supabase Storage buckets
 * Relies on globals from admin.js: SUPABASE_URL, SUPABASE_KEY, cookieToken, escapeHtml, $
 */
(function () {
  'use strict';

  // Client that always uses the session cookie token (same as the rest of the site)
  let _client = null;
  function client() {
    if (!_client) {
      _client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        accessToken: async () => cookieToken() || SUPABASE_KEY,
      });
    }
    return _client;
  }

  const ROLE_LABEL = {
    admin: 'مسؤول', supervisor: 'Supervisor', area_manager: 'مدير منطقة',
    branch_manager: 'مدير فرع', agent: 'موظف',
  };
  const PAGE_LABEL = {
    index: 'الرئيسية', admin: 'لوحة التحكم', login: 'تسجيل الدخول', trainer: 'المدرب', quiz: 'الكويز',
    remedy: 'Remedy', offer: 'العروض', mobil: 'Mobile', adsl: 'ADSL', pdf: 'PDF', info: 'المعلومات',
    postpaid: 'Postpaid', prepaid: 'Prepaid', tutorial: 'الدورات', services: 'الخدمات', game: 'الألعاب',
    packages: 'الباقات', ruls: 'القوانين', ntra: 'NTRA', 'we pay': 'WE Pay', 'target-manager': 'التارجت',
  };

  const pad = (n) => String(n).padStart(2, '0');
  function fmtDur(ms) {
    ms = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(ms / 86400), h = Math.floor((ms % 86400) / 3600), m = Math.floor((ms % 3600) / 60), s = ms % 60;
    if (d) return `${d} يوم ${h} س`;
    if (h) return `${h} س ${pad(m)} د`;
    if (m) return `${m} د ${pad(s)} ث`;
    return `${s} ث`;
  }
  function fmtClock(ms) {
    try { return new Date(ms).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }
  function initials(name) {
    const p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }

  // ═════════════════════════ ONLINE USERS ═════════════════════════
  const AdminOnline = (function () {
    const STALE_MS = 100 * 1000;    // heartbeat is every ~20s (background tabs throttle to ~60s); no beat for 100s => offline
    const GAP_MS = 120 * 1000;      // sessions closer than this are one continuous visit
    const POLL_MS = 10 * 1000;

    let visible = false, timer = null, tick = null, offset = 0, busy = false, filter = '';
    let onlineList = [], leftList = [];

    const nowS = () => Date.now() + offset;

    function build(rows) {
      const byUser = new Map();
      rows.forEach((r) => {
        if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
        byUser.get(r.user_id).push(r);
      });
      const on = [], left = [];
      byUser.forEach((list) => {
        const sess = list.map((r) => {
          const start = Date.parse(r.started_at);
          const seen = Date.parse(r.last_seen_at);
          const ended = r.ended_at ? Date.parse(r.ended_at) : null;
          const active = !ended && nowS() - seen < STALE_MS;
          return { start, end: ended || seen, active, page: r.page, r };
        }).sort((a, b) => a.start - b.start);

        // merge into continuous visits, keep the latest one
        let cur = null;
        sess.forEach((s) => {
          if (cur && s.start <= cur.end + GAP_MS) {
            cur.end = Math.max(cur.end, s.end);
            cur.active = cur.active || s.active;
            cur.page = s.page || cur.page;
          } else {
            cur = { start: s.start, end: s.end, active: s.active, page: s.page, r: s.r };
          }
        });
        const meta = cur.r;
        const item = {
          id: meta.user_id,
          name: meta.full_name || meta.username || 'مستخدم',
          role: meta.role, branch: meta.branch,
          start: cur.start, end: cur.end, page: cur.page,
        };
        (cur.active ? on : left).push(item);
      });
      on.sort((a, b) => a.start - b.start);
      left.sort((a, b) => b.end - a.end);
      return { on, left };
    }

    function pageLabel(p) {
      const k = String(p || '').toLowerCase();
      return PAGE_LABEL[k] || p || '—';
    }
    function userCell(u) {
      return `<div class="user-cell"><div class="u-avatar">${escapeHtml(initials(u.name))}</div>
        <div><div class="u-name">${escapeHtml(u.name)}</div></div></div>`;
    }
    function roleCell(u) {
      const r = ROLE_LABEL[u.role] || u.role || '—';
      return `<div>${escapeHtml(r)}</div>${u.branch ? `<div class="u-email">${escapeHtml(u.branch)}</div>` : ''}`;
    }
    const match = (u) => !filter || u.name.toLowerCase().includes(filter);

    function render() {
      const on = onlineList.filter(match), left = leftList.filter(match);
      const hourAgo = nowS() - 3600 * 1000;

      const badge = $('onlineNavBadge'); if (badge) badge.textContent = onlineList.length;
      if (!visible) return;
      $('onStatNow').textContent = onlineList.length;
      $('onStatHour').textContent = leftList.filter((u) => u.end >= hourAgo).length;
      $('onStatDay').textContent = onlineList.length + leftList.length;

      $('onlineNowBody').innerHTML = on.length ? on.map((u) => `
        <tr>
          <td>${userCell(u)}</td>
          <td>${roleCell(u)}</td>
          <td><span class="page-chip">${escapeHtml(pageLabel(u.page))}</span></td>
          <td>${fmtClock(u.start)}</td>
          <td><span class="dur-live" data-since="${u.start}">${fmtDur(nowS() - u.start)}</span></td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty-cell">لا يوجد مستخدمون متصلون حالياً</td></tr>';

      $('onlineLeftBody').innerHTML = left.length ? left.map((u) => `
        <tr>
          <td>${userCell(u)}</td>
          <td>${roleCell(u)}</td>
          <td><span class="page-chip muted">${escapeHtml(pageLabel(u.page))}</span></td>
          <td>${fmtClock(u.end)} <span class="u-email">(منذ <span class="ago-live" data-end="${u.end}">${fmtDur(nowS() - u.end)}</span>)</span></td>
          <td>${fmtDur(u.end - u.start)}</td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty-cell">لا يوجد</td></tr>';
    }

    function tickDurations() {
      if (!visible) return;
      document.querySelectorAll('.dur-live').forEach((n) => { n.textContent = fmtDur(nowS() - Number(n.dataset.since)); });
      document.querySelectorAll('.ago-live').forEach((n) => { n.textContent = fmtDur(nowS() - Number(n.dataset.end)); });
    }

    async function refresh() {
      if (busy) return; busy = true;
      try {
        const { data, error } = await client().rpc('admin_presence', { p_hours: 24 });
        if (error) throw error;
        const rows = data || [];
        if (rows.length) offset = Date.parse(rows[0].server_now) - Date.now();
        const r = build(rows);
        onlineList = r.on; leftList = r.left;
        const msg = $('onlineMessage'); if (msg) msg.classList.remove('show');
        render();
      } catch (e) {
        console.warn('[admin online]', e);
        if (visible && typeof showMessage === 'function') {
          const missing = /admin_presence|user_sessions|does not exist|PGRST202/i.test(String(e.message || e));
          showMessage('onlineMessage', missing
            ? 'تتبع المتصلين محتاج تشغيل migration: 20261017034500_admin_presence_and_storage.sql على Supabase'
            : 'تعذر تحميل المتصلين: ' + (e.message || e), 'error');
        }
      } finally { busy = false; }
    }

    function start() { visible = true; render(); refresh(); }
    function pause() { visible = false; }

    function init() {
      const s = $('onlineSearch');
      if (s) s.addEventListener('input', (e) => { filter = e.target.value.trim().toLowerCase(); render(); });
      const b = $('onlineRefreshBtn'); if (b) b.addEventListener('click', refresh);
      timer = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
      tick = setInterval(tickDurations, 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
      setTimeout(refresh, 1500);   // fills the sidebar badge
    }
    return { init, start, pause, refresh };
  })();

  // ═════════════════════════ FILES / STORAGE ═════════════════════════
  const AdminFiles = (function () {
    const PUBLIC_BUCKETS = new Set(['items-images', 'widget']);
    const MAX_BYTES = 50 * 1024 * 1024;
    let queue = [], prefix = '', opened = false, uploading = false;

    const bucket = () => {
      const v = $('fileBucket').value;
      return v === '__custom' ? ($('fileBucketCustom').value || '').trim() : v;
    };
    const cleanFolder = (v) => String(v || '').replace(/\\/g, '/').split('/').map((x) => x.trim()).filter(Boolean).join('/');
    function safeName(name) {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
      let b = base.normalize('NFKD').replace(/[^A-Za-z0-9._\- ()]/g, '_').replace(/_+/g, '_').replace(/^[_\s.]+|[_\s]+$/g, '');
      if (!b) b = 'file';
      return b + ext.replace(/[^a-z0-9.]/g, '');
    }
    const fmtSize = (n) => {
      if (n == null) return '—';
      if (n < 1024) return n + ' B';
      if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
      return (n / 1048576).toFixed(1) + ' MB';
    };
    const msg = (t, type) => { if (typeof showMessage === 'function') showMessage('fileMessage', t, type || 'success'); };

    function renderQueue() {
      const q = $('fileQueue');
      q.innerHTML = queue.map((it, i) => `
        <div class="fq-item" data-i="${i}">
          <i class="ti ti-file"></i>
          <div class="fq-info"><div class="fq-name">${escapeHtml(it.file.name)}</div>
            <div class="fq-sub">${fmtSize(it.file.size)} <span class="fq-status ${it.state || ''}">${escapeHtml(it.text || '')}</span></div>
            <div class="fq-bar"><span style="width:${it.pct || 0}%"></span></div></div>
          ${uploading ? '' : `<button type="button" class="fq-x" data-rm="${i}" aria-label="إزالة"><i class="ti ti-x"></i></button>`}
        </div>`).join('');
      $('fileUploadBtn').disabled = !queue.length || uploading;
    }
    function addFiles(list) {
      Array.from(list || []).forEach((f) => {
        if (f.size > MAX_BYTES) { msg(`"${f.name}" أكبر من 50 ميجا`, 'error'); return; }
        queue.push({ file: f, pct: 0 });
      });
      renderQueue();
    }

    async function uploadAll() {
      const b = bucket();
      if (!b) return msg('اختار الـ bucket', 'error');
      const folder = cleanFolder($('fileFolder').value);
      const upsert = $('fileUpsert').checked;
      uploading = true; renderQueue();
      let ok = 0, fail = 0;
      for (const it of queue) {
        if (it.state === 'ok') continue;
        it.text = 'جاري الرفع...'; it.state = ''; it.pct = 40; renderQueue();
        const path = (folder ? folder + '/' : '') + safeName(it.file.name);
        const { error } = await client().storage.from(b).upload(path, it.file, {
          upsert, contentType: it.file.type || undefined, cacheControl: '3600',
        });
        if (error) {
          fail++; it.state = 'err'; it.pct = 0;
          it.text = /already exists|Duplicate/i.test(error.message) ? 'موجود بنفس الاسم (فعّل الاستبدال)' : (error.message || 'فشل');
        } else { ok++; it.state = 'ok'; it.pct = 100; it.text = 'تم الرفع ✓'; }
        renderQueue();
      }
      uploading = false;
      queue = queue.filter((it) => it.state !== 'ok');
      renderQueue();
      msg(fail ? `تم رفع ${ok} وفشل ${fail}` : `تم رفع ${ok} ملف بنجاح`, fail ? 'error' : 'success');
      if (ok) { prefix = folder; loadList(); }
    }

    function crumbs() {
      const parts = prefix ? prefix.split('/') : [];
      let acc = '';
      const html = [`<button type="button" data-go="">${escapeHtml(bucket() || 'bucket')}</button>`].concat(parts.map((p) => {
        acc += (acc ? '/' : '') + p; return `<span>/</span><button type="button" data-go="${escapeHtml(acc)}">${escapeHtml(p)}</button>`;
      }));
      $('fileCrumbs').innerHTML = html.join('');
    }

    async function loadList() {
      const b = bucket(); const body = $('fileListBody');
      crumbs();
      if (!b) { body.innerHTML = '<tr><td colspan="4" class="empty-cell">اختار bucket لعرض الملفات</td></tr>'; return; }
      body.innerHTML = '<tr><td colspan="4" class="empty-cell">جاري التحميل...</td></tr>';
      const { data, error } = await client().storage.from(b).list(prefix, { limit: 200, sortBy: { column: 'name', order: 'asc' } });
      if (error) { body.innerHTML = `<tr><td colspan="4" class="empty-cell err">${escapeHtml(error.message)}</td></tr>`; return; }
      const items = (data || []).filter((x) => x.name !== '.emptyFolderPlaceholder');
      if (!items.length) { body.innerHTML = '<tr><td colspan="4" class="empty-cell">لا توجد ملفات</td></tr>'; return; }
      items.sort((a, c) => (!!a.id) - (!!c.id) || a.name.localeCompare(c.name));
      body.innerHTML = items.map((x) => {
        const full = (prefix ? prefix + '/' : '') + x.name;
        if (!x.id) return `<tr><td colspan="3"><button type="button" class="folder-link" data-open="${escapeHtml(full)}"><i class="ti ti-folder"></i> ${escapeHtml(x.name)}</button></td><td></td></tr>`;
        const when = x.updated_at || x.created_at; let d = '—';
        try { d = new Date(when).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) {}
        return `<tr>
          <td><div class="file-name"><i class="ti ti-file"></i><span>${escapeHtml(x.name)}</span></div></td>
          <td>${fmtSize(x.metadata && x.metadata.size)}</td>
          <td>${escapeHtml(d)}</td>
          <td><div class="acts">
            <button type="button" class="act-btn magic" data-view="${escapeHtml(full)}"><i class="ti ti-external-link"></i> فتح</button>
            <button type="button" class="act-btn otp" data-copy="${escapeHtml(full)}"><i class="ti ti-copy"></i> رابط</button>
            <button type="button" class="act-btn del" data-del="${escapeHtml(full)}"><i class="ti ti-trash"></i> حذف</button>
          </div></td></tr>`;
      }).join('');
    }

    async function urlFor(path, forCopy) {
      const b = bucket();
      if (PUBLIC_BUCKETS.has(b)) return client().storage.from(b).getPublicUrl(path).data.publicUrl;
      const { data, error } = await client().storage.from(b).createSignedUrl(path, forCopy ? 7 * 86400 : 3600);
      if (error) throw error; return data.signedUrl;
    }

    function init() {
      const drop = $('fileDrop'), input = $('fileInput');
      drop.addEventListener('click', () => input.click());
      input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

      $('fileQueue').addEventListener('click', (e) => {
        const x = e.target.closest('[data-rm]'); if (!x || uploading) return;
        queue.splice(Number(x.dataset.rm), 1); renderQueue();
      });
      $('fileUploadBtn').addEventListener('click', uploadAll);
      $('fileClearBtn').addEventListener('click', () => { if (!uploading) { queue = []; renderQueue(); } });
      $('fileListRefreshBtn').addEventListener('click', loadList);
      $('fileBucket').addEventListener('change', () => {
        $('fileBucketCustom').style.display = $('fileBucket').value === '__custom' ? '' : 'none';
        prefix = ''; loadList();
      });
      $('fileBucketCustom').addEventListener('change', () => { prefix = ''; loadList(); });
      $('fileCrumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { prefix = b.dataset.go; loadList(); } });
      $('fileListBody').addEventListener('click', async (e) => {
        const o = e.target.closest('[data-open]'); if (o) { prefix = o.dataset.open; return loadList(); }
        const v = e.target.closest('[data-view]'), c = e.target.closest('[data-copy]'), d = e.target.closest('[data-del]');
        try {
          if (v) window.open(await urlFor(v.dataset.view), '_blank', 'noopener');
          else if (c) {
            const u = await urlFor(c.dataset.copy, true);
            try { await navigator.clipboard.writeText(u); msg(PUBLIC_BUCKETS.has(bucket()) ? 'تم نسخ الرابط' : 'تم نسخ رابط مؤقت (صالح 7 أيام)'); }
            catch (_) { window.prompt('انسخ الرابط:', u); }
          } else if (d) {
            if (!confirm('حذف الملف نهائياً؟\n' + d.dataset.del)) return;
            const { error } = await client().storage.from(bucket()).remove([d.dataset.del]);
            if (error) throw error; msg('تم الحذف'); loadList();
          }
        } catch (err) { msg(err.message || 'حدث خطأ', 'error'); }
      });
      renderQueue();
    }
    function open() { if (!opened) { opened = true; } loadList(); }
    return { init, open };
  })();

  window.AdminOnline = AdminOnline;
  window.AdminFiles = AdminFiles;
  const boot = () => { AdminOnline.init(); AdminFiles.init(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
