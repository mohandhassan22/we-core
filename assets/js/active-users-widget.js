/**
 * WE-Core | Active Users + Group Chat widget v3
 * - Floating circle showing the number of active users (Supabase Presence)
 * - Click -> group chat with all users (table chat_room_messages, Supabase Realtime)
 * Self-initialising: just include this script on any page. Shown only for logged-in users.
 */
const ActiveUsersWidget = (() => {
  const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
  const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
  const PAGE_SIZE = 100;

  let client = null, presenceCh = null, chatCh = null;
  let me = { id: null, name: 'مستخدم' };
  let online = {}, messages = [], open = false, unread = 0, started = false;
  let el = {};

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function getToken() {
    const m = (document.cookie || '').match(/(?:^|;\s*)sb-access-token=([^;]+)/);
    return m ? decodeURIComponent(m[1]).replace(/"/g, '') : null;
  }
  function jwtPayload(t) {
    try { return JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; }
  }

  const CSS = `
  #we-chat-fab{position:fixed;bottom:16px;left:16px;width:58px;height:58px;border-radius:50%;z-index:9998;border:0;cursor:pointer;
    background:linear-gradient(135deg,#591685,#8e2de2);color:#fff;font-family:'Cairo',Tahoma,sans-serif;box-shadow:0 6px 22px rgba(89,22,133,.45);
    display:flex;align-items:center;justify-content:center;flex-direction:column;line-height:1;transition:transform .2s}
  #we-chat-fab:hover{transform:scale(1.08)}
  #we-chat-fab .n{font-size:22px;font-weight:800}
  #we-chat-fab .d{position:absolute;top:6px;right:6px;width:11px;height:11px;border-radius:50%;background:#4ade80;border:2px solid #fff}
  #we-chat-fab .u{position:absolute;top:-2px;left:-2px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;display:none;align-items:center;justify-content:center}
  #we-chat-panel{position:fixed;bottom:84px;left:16px;width:350px;max-width:calc(100vw - 24px);height:480px;max-height:calc(100vh - 110px);z-index:9999;
    background:#fff;color:#222;border-radius:18px;box-shadow:0 14px 50px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;direction:rtl;font-family:'Cairo',Tahoma,sans-serif}
  #we-chat-panel.show{display:flex}
  #we-chat-panel .h{background:linear-gradient(135deg,#591685,#8e2de2);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:8px}
  #we-chat-panel .h b{flex:1;font-size:15px}
  #we-chat-panel .h button{background:rgba(255,255,255,.18);border:0;color:#fff;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit;font-size:12px}
  #we-chat-online{display:none;max-height:130px;overflow:auto;padding:8px 12px;background:#f6f1f8;border-bottom:1px solid #eee;font-size:13px}
  #we-chat-online.show{display:block}
  #we-chat-online div{padding:3px 0;display:flex;align-items:center;gap:6px}
  #we-chat-online i{width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block}
  #we-chat-msgs{flex:1;overflow-y:auto;padding:12px;background:#faf8fb;display:flex;flex-direction:column;gap:8px}
  .we-m{max-width:82%;padding:7px 11px;border-radius:14px;font-size:14px;line-height:1.6;word-wrap:break-word;white-space:pre-wrap;background:#fff;border:1px solid #eee;align-self:flex-start}
  .we-m.mine{align-self:flex-end;background:#591685;color:#fff;border-color:#591685}
  .we-m .s{display:block;font-size:11px;font-weight:700;color:#8e2de2;margin-bottom:1px}
  .we-m.mine .s{color:#e9d5ff}
  .we-m .t{display:block;font-size:10px;opacity:.6;margin-top:2px}
  .we-m .x{cursor:pointer;opacity:.5;font-size:11px;margin-inline-start:6px}
  #we-chat-form{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff}
  #we-chat-input{flex:1;border:1px solid #ddd;border-radius:20px;padding:9px 14px;font-family:inherit;font-size:14px;outline:none;resize:none;max-height:90px}
  #we-chat-send{border:0;border-radius:50%;width:40px;height:40px;background:#591685;color:#fff;cursor:pointer;font-size:16px}
  #we-chat-send:disabled{opacity:.5}
  .we-empty{margin:auto;color:#999;font-size:13px;text-align:center}

  #we-chat-note{font-size:10.5px;color:#92400e;background:#fffbeb;padding:3px 10px;text-align:center;border-bottom:1px solid #fde68a}
  .we-m img.we-img{display:block;max-width:100%;max-height:240px;border-radius:10px;cursor:zoom-in;min-width:120px;min-height:60px;background:#eee;margin:3px 0}
  .we-m audio{display:block;width:220px;max-width:100%;height:36px;margin:3px 0}
  .we-m a.we-pdf{display:flex;align-items:center;gap:6px;color:inherit;text-decoration:underline;cursor:pointer;margin:3px 0}
  #we-chat-form{align-items:flex-end}
  .we-ib{border:0;border-radius:50%;width:40px;height:40px;flex:0 0 40px;background:#f1e9f6;color:#591685;cursor:pointer;font-size:17px;padding:0}
  #we-chat-rec{display:none;flex:1;align-items:center;gap:10px;color:#dc2626;font-size:14px}
  #we-chat-rec i{width:10px;height:10px;border-radius:50%;background:#ef4444;animation:weRecP 1s infinite}
  @keyframes weRecP{50%{opacity:.25}}
  #we-chat-form.rec #we-chat-rec{display:flex}#we-chat-form.rec .we-norm{display:none!important}
  #we-chat-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:64px;background:#333;color:#fff;font-size:12px;padding:6px 12px;border-radius:14px;display:none;max-width:90%;text-align:center}
  #we-chat-view{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.88);display:none;align-items:center;justify-content:center;cursor:zoom-out}
  #we-chat-view img{max-width:96vw;max-height:92vh;border-radius:8px}
  @media(max-width:520px){#we-chat-panel{left:8px;right:8px;width:auto;bottom:80px}}
  `;

  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const fab = document.createElement('button');
    fab.id = 'we-chat-fab'; fab.type = 'button'; fab.title = 'المستخدمون النشطون والشات';
    fab.innerHTML = '<span class="d"></span><span class="u" id="we-chat-unread"></span><span class="n" id="we-chat-count">1</span>';
    const panel = document.createElement('div'); panel.id = 'we-chat-panel';
    panel.innerHTML = `
      <div class="h"><span>💬</span><b>الشات العام</b>
        <button type="button" id="we-chat-toggle-online">👥 <span id="we-chat-count2">1</span> نشط</button>
        <button type="button" id="we-chat-close">✕</button></div>
      <div id="we-chat-online"></div>
      <div id="we-chat-msgs"><div class="we-empty">جاري تحميل الرسائل...</div></div>
      <div id="we-chat-note">⚠️ ممنوع إرسال صور بطاقات العملاء أو العقود في الشات</div>
      <form id="we-chat-form">
        <input type="file" id="we-chat-file" accept="image/*,application/pdf" style="display:none">
        <button type="button" class="we-ib we-norm" id="we-chat-attach" aria-label="إرفاق صورة أو PDF">📎</button>
        <textarea id="we-chat-input" class="we-norm" rows="1" maxlength="1000" placeholder="اكتب رسالتك..."></textarea>
        <button type="button" class="we-ib we-norm" id="we-chat-mic" aria-label="تسجيل رسالة صوتية">🎙</button>
        <button id="we-chat-send" class="we-norm" type="submit" style="display:none">➤</button>
        <div id="we-chat-rec"><i></i><span id="we-chat-rect">0:00</span><span style="flex:1"></span>
          <button type="button" class="we-ib" id="we-chat-rec-cancel" aria-label="إلغاء">🗑</button>
          <button type="button" class="we-ib" id="we-chat-rec-send" aria-label="إرسال" style="background:#591685;color:#fff">➤</button></div>
      </form>
      <div id="we-chat-toast"></div>`;
    const view = document.createElement('div'); view.id = 'we-chat-view'; view.innerHTML = '<img alt="">'; document.body.appendChild(view);
    view.addEventListener('click', () => { view.style.display = 'none'; view.firstChild.src = ''; });
    document.body.appendChild(fab); document.body.appendChild(panel);
    el = { fab, panel, count: fab.querySelector('#we-chat-count'), count2: panel.querySelector('#we-chat-count2'), unread: fab.querySelector('#we-chat-unread'),
           msgs: panel.querySelector('#we-chat-msgs'), online: panel.querySelector('#we-chat-online'), input: panel.querySelector('#we-chat-input'), send: panel.querySelector('#we-chat-send') };
    fab.addEventListener('click', toggle);
    panel.querySelector('#we-chat-close').addEventListener('click', toggle);
    panel.querySelector('#we-chat-toggle-online').addEventListener('click', () => el.online.classList.toggle('show'));
    panel.querySelector('#we-chat-form').addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
    el.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    el.msgs.addEventListener('click', (e) => {
      const x = e.target.closest('[data-del]'); if (x) return deleteMessage(x.dataset.del);
      const im = e.target.closest('img.we-img'); if (im && im.src) { const v = document.getElementById('we-chat-view'); v.firstChild.src = im.src; v.style.display = 'flex'; return; }
      const pd = e.target.closest('[data-pdf]'); if (pd) openPdf(pd.dataset.pdf);
    });
    el.file = panel.querySelector('#we-chat-file'); el.mic = panel.querySelector('#we-chat-mic'); el.form = panel.querySelector('#we-chat-form');
    el.toast = panel.querySelector('#we-chat-toast'); el.rect = panel.querySelector('#we-chat-rect');
    panel.querySelector('#we-chat-attach').addEventListener('click', () => el.file.click());
    el.file.addEventListener('change', () => { const f = el.file.files[0]; el.file.value = ''; if (f) sendFile(f); });
    el.mic.addEventListener('click', startRec);
    panel.querySelector('#we-chat-rec-cancel').addEventListener('click', () => stopRec(false));
    panel.querySelector('#we-chat-rec-send').addEventListener('click', () => stopRec(true));
    el.input.addEventListener('input', syncBtns);
  }

  function toggle() {
    open = !open;
    el.panel.classList.toggle('show', open);
    if (open) { unread = 0; renderUnread(); renderMessages(true); setTimeout(() => el.input.focus(), 50); }
  }
  function renderUnread() { el.unread.style.display = unread ? 'flex' : 'none'; el.unread.textContent = unread > 99 ? '99+' : unread; }

  function renderOnline() {
    const list = Object.values(online);
    const n = Math.max(list.length, 1);
    el.count.textContent = n; el.count2.textContent = n;
    el.online.innerHTML = list.map(u => `<div><i></i>${esc(u.name || 'مستخدم')}</div>`).join('') || '<div>لا يوجد</div>';
  }

  const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const BUCKET = 'chat-files', MAX_BYTES = 10 * 1024 * 1024, MAX_REC = 180;
  const urlCache = {};
  const fmtDur = (n) => { n = Math.round(n || 0); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
  function toast(t) { if (!el.toast) return; el.toast.textContent = t; el.toast.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => { el.toast.style.display = 'none'; }, 3000); }
  async function signedUrl(path) {
    const c = urlCache[path]; if (c && c.exp > Date.now() + 60000) return c.url;
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data) throw error || new Error('no url');
    urlCache[path] = { url: data.signedUrl, exp: Date.now() + 3600000 }; return data.signedUrl;
  }
  async function openPdf(path) { try { window.open(await signedUrl(path), '_blank', 'noopener'); } catch (e) { toast('تعذّر فتح الملف'); } }
  function hydrate(root) {
    root.querySelectorAll('[data-src-path]').forEach((n) => {
      if (n.getAttribute('src')) return;
      signedUrl(n.dataset.srcPath).then((u) => { n.src = u; }).catch(() => { n.alt = 'تعذّر التحميل'; });
    });
  }
  function msgHtml(m) {
    const mine = m.user_id === me.id;
    const kind = m.kind || 'text';
    let content;
    if (kind === 'image' && m.file_path) content = `<img class="we-img" alt="${esc(m.file_name || 'صورة')}" loading="lazy" data-src-path="${esc(m.file_path)}">`;
    else if (kind === 'voice' && m.file_path) content = `<audio controls preload="none" data-src-path="${esc(m.file_path)}"></audio>${m.duration_s ? `<span class="t">🎙 ${fmtDur(m.duration_s)}</span>` : ''}`;
    else if (kind === 'pdf' && m.file_path) content = `<a class="we-pdf" data-pdf="${esc(m.file_path)}">📄 ${esc(m.file_name || 'ملف PDF')}</a>`;
    else content = esc(m.body);
    return `<div class="we-m${mine ? ' mine' : ''}" data-id="${m.id}"><span class="s">${esc(m.sender_name)}${mine ? ' (أنت)' : ''}</span>${content}<span class="t">${fmtTime(m.created_at)}${mine ? ` <span class="x" data-del="${m.id}" title="حذف">🗑</span>` : ''}</span></div>`;
  }
  function appendMessage(m) {
    if (!messages.some(x => x.id === m.id)) messages.push(m);
    const empty = el.msgs.querySelector('.we-empty'); if (empty) el.msgs.innerHTML = '';
    if (el.msgs.querySelector('[data-id="' + m.id + '"]')) return;
    const near = el.msgs.scrollHeight - el.msgs.scrollTop - el.msgs.clientHeight < 120;
    el.msgs.insertAdjacentHTML('beforeend', msgHtml(m)); hydrate(el.msgs);
    if (near || m.user_id === me.id) el.msgs.scrollTop = el.msgs.scrollHeight;
  }
  function removeNode(id) {
    messages = messages.filter(x => String(x.id) !== String(id));
    const n = el.msgs.querySelector('[data-id="' + id + '"]'); if (n) n.remove();
    if (!messages.length) renderMessages(false);
  }
  function renderMessages(scroll) {
    if (!messages.length) { el.msgs.innerHTML = '<div class="we-empty">لا توجد رسائل بعد. ابدأ المحادثة 👋</div>'; return; }
    const nearBottom = el.msgs.scrollHeight - el.msgs.scrollTop - el.msgs.clientHeight < 80;
    el.msgs.innerHTML = messages.map(msgHtml).join(''); hydrate(el.msgs);
    if (scroll || nearBottom) el.msgs.scrollTop = el.msgs.scrollHeight;
  }

  async function loadMessages() {
    const { data, error } = await client.from('chat_room_messages').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);
    if (error) { el.msgs.innerHTML = '<div class="we-empty">تعذر تحميل الرسائل</div>'; return; }
    messages = (data || []).reverse();
    renderMessages(true);
  }

  function syncBtns() { const has = el.input.value.trim().length > 0; el.send.style.display = has ? 'inline-block' : 'none'; el.mic.style.display = has ? 'none' : 'inline-block'; }

  async function insertRow(row) {
    const { data, error } = await client.from('chat_room_messages').insert(row).select().single();
    if (error) { toast('تعذر إرسال الرسالة'); return false; }
    if (data) { appendMessage(data); if (!open) { /* keep unread logic for others only */ } }
    return true;
  }
  async function sendMessage() {
    const body = el.input.value.trim();
    if (!body) return;
    el.send.disabled = true;
    const ok = await insertRow({ body });
    el.send.disabled = false;
    if (ok) { el.input.value = ''; syncBtns(); }
  }

  async function deleteMessage(id) {
    const m = messages.find(x => String(x.id) === String(id));
    const { error } = await client.from('chat_room_messages').delete().eq('id', id);
    if (error) return;
    removeNode(id);
    if (m && m.file_path) { try { await client.storage.from(BUCKET).remove([m.file_path]); } catch (e) {} }
  }

  function downscale(file) {
    return new Promise((resolve) => {
      if (file.type === 'image/gif' || file.size < 400 * 1024) return resolve(file);
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob((b) => resolve(b && b.size < file.size ? b : file), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); }; img.src = url;
    });
  }
  async function upload(blob, ext, mime) {
    const path = me.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { error } = await client.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false });
    if (error) throw error; return path;
  }
  async function sendFile(file) {
    if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(file.type)) return toast('مسموح بالصور وملفات PDF فقط');
    if (file.size > MAX_BYTES * 2) return toast('الملف كبير (الحد 10 ميجا)');
    toast('جاري الرفع...');
    try {
      const isImg = file.type.indexOf('image/') === 0, blob = isImg ? await downscale(file) : file;
      if (blob.size > MAX_BYTES) return toast('الملف كبير (الحد 10 ميجا)');
      const mime = isImg && blob !== file ? 'image/jpeg' : file.type;
      const ext = mime === 'application/pdf' ? 'pdf' : mime.split('/')[1].replace('jpeg', 'jpg');
      const path = await upload(blob, ext, mime);
      const name = String(file.name || '').slice(0, 120);
      if (await insertRow({ kind: isImg ? 'image' : 'pdf', body: isImg ? '📷 صورة' : '📄 ' + (name || 'ملف PDF'), file_path: path, file_name: name, mime })) el.toast.style.display = 'none';
    } catch (e) { console.warn('[WE-Core] upload', e); toast('تعذّر رفع الملف'); }
  }

  // ---- voice messages
  let rec = null;
  function pickMime() { const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']; for (const t of c) if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t; return ''; }
  async function startRec() {
    if (rec) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('المتصفح لا يدعم التسجيل الصوتي');
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast('اسمح بالوصول للميكروفون'); }
    const mt = pickMime(), mr = mt ? new MediaRecorder(stream, { mimeType: mt }) : new MediaRecorder(stream);
    rec = { mr, stream, chunks: [], t0: Date.now(), send: false, mime: mr.mimeType || mt || 'audio/webm' };
    mr.ondataavailable = (e) => { if (e.data && e.data.size) rec.chunks.push(e.data); };
    mr.onstop = onRecStop; mr.start(); el.form.classList.add('rec'); el.rect.textContent = '0:00';
    rec.timer = setInterval(() => { const sec = (Date.now() - rec.t0) / 1000; el.rect.textContent = fmtDur(sec); if (sec >= MAX_REC) stopRec(true); }, 250);
  }
  function stopRec(send) { if (!rec) return; rec.send = !!send; clearInterval(rec.timer); try { if (rec.mr.state !== 'inactive') rec.mr.stop(); else onRecStop(); } catch (e) { onRecStop(); } }
  async function onRecStop() {
    const r = rec; if (!r) return; rec = null; clearInterval(r.timer);
    r.stream.getTracks().forEach(t => t.stop()); el.form.classList.remove('rec');
    if (!r.send) return;
    const dur = (Date.now() - r.t0) / 1000; if (dur < 1) return toast('التسجيل قصير جداً');
    const type = (r.mime || 'audio/webm').split(';')[0], blob = new Blob(r.chunks, { type });
    if (blob.size > MAX_BYTES) return toast('التسجيل كبير');
    toast('جاري إرسال التسجيل...');
    try {
      const ext = type.indexOf('mp4') > -1 ? 'm4a' : type.indexOf('ogg') > -1 ? 'ogg' : 'webm';
      const path = await upload(blob, ext, type);
      if (await insertRow({ kind: 'voice', body: '🎙 رسالة صوتية', file_path: path, mime: type, duration_s: Math.round(dur) })) el.toast.style.display = 'none';
    } catch (e) { console.warn('[WE-Core] voice', e); toast('تعذّر إرسال التسجيل'); }
  }

  function subscribe() {
    chatCh = client.channel('we-chat-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_room_messages' }, (p) => {
        const m = p.new; if (!m || messages.some(x => x.id === m.id)) return;
        appendMessage(m); if (messages.length > 300) messages.shift();
        if (!open && m.user_id !== me.id) { unread++; renderUnread(); }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_room_messages' }, (p) => {
        const id = p.old && p.old.id; if (id == null) return;
        removeNode(id);
      })
      .subscribe();

    const page = (location.pathname.split('/').pop() || 'index').replace('.html', '');
    presenceCh = client.channel('we-core-presence', { config: { presence: { key: me.id } } });
    const sync = () => {
      online = {};
      Object.entries(presenceCh.presenceState()).forEach(([uid, arr]) => { const p = (arr && arr[0]) || {}; online[uid] = { name: p.display_name || null }; });
      renderOnline();
    };
    presenceCh.on('presence', { event: 'sync' }, sync).on('presence', { event: 'join' }, sync).on('presence', { event: 'leave' }, sync)
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await presenceCh.track({ user_id: me.id, display_name: me.name, page, online_at: new Date().toISOString() }); });
    window.addEventListener('beforeunload', () => { try { presenceCh.untrack(); } catch (e) {} });
  }

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
  }

  async function start() {
    if (started) return;
    const token = getToken(); const pl = token && jwtPayload(token);
    if (!pl || !pl.sub) return;           // not logged in -> no widget
    started = true;
    me.id = pl.sub;
    build();
    try {
      await loadSdk();
      client = window.supabase.createClient(SB_URL, SB_KEY, {
        accessToken: async () => getToken() || SB_KEY,
        realtime: { params: { eventsPerSecond: 10 } }
      });
      const { data } = await client.from('profiles').select('full_name,username').eq('id', me.id).maybeSingle();
      me.name = (data && (data.full_name || data.username)) || pl.email || 'مستخدم';
      renderOnline();
      await loadMessages();
      subscribe();
    } catch (e) { console.warn('[WE-Core] chat widget error', e); }
  }

  function init() { start(); }
  const boot = () => {
    start();
    if (!started) { window.addEventListener('authSuccess', start, { once: true }); setTimeout(start, 2500); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  return { init };
})();
