/**
 * WE-Core | Active Users + Team Chat v3
 * دايرة فيها عدد المستخدمين النشطين، وبالضغط عليها تفتح محادثة الفريق
 * (نص / فويس / صور / PDF) واسم المرسل ظاهر فوق كل رسالة.
 * يتحمّل في أي صفحة بسطر واحد: <script src="/assets/js/active-users-widget.js"></script>
 */
(function () {
  'use strict';
  if (window.top !== window.self) return;          // مفيش ودجت داخل iframes
  if (window.__weChatLoaded) return;
  window.__weChatLoaded = true;

  var SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
  var SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
  var BUCKET = 'chat-files';
  var MAX_BYTES = 10 * 1024 * 1024;
  var MAX_REC_SEC = 180;
  var OK_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;

  // ---------- session helper (لو الصفحة ما حمّلتش auth.js) ----------
  if (!window.WEAuth) {
    (function () {
      var cached = null, exp = 0, inflight = null, HDR = { 'X-Requested-With': 'WE' };
      function jwtExp(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch (e) { return 0; } }
      async function fetchSession(force) {
        var r = await fetch('/api/session' + (force ? '?force=1' : ''), { credentials: 'same-origin', headers: HDR, cache: 'no-store' });
        if (!r.ok) return null;
        var d = await r.json(); cached = d.access_token; exp = jwtExp(cached); window._sbUserFromSession = d.user; return d;
      }
      window.WEAuth = {
        getToken: async function (force) {
          if (!force && cached && Date.now() < exp - 60000) return cached;
          if (!inflight) inflight = fetchSession(!!force).finally(function () { inflight = null; });
          var d = await inflight; return d ? d.access_token : null;
        },
        logout: async function () { cached = null; exp = 0; try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin', headers: HDR }); } catch (e) {} }
      };
    })();
  }

  // ---------- CSS ----------
  var CSS = '' +
  '#weu-fab{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9999;width:52px;height:52px;border-radius:50%;border:1px solid rgba(255,107,53,.45);background:linear-gradient(135deg,#1a1a2e,#16213e);box-shadow:0 4px 20px rgba(0,0,0,.35);cursor:pointer;display:flex;align-items:center;justify-content:center;font:700 18px Cairo,Tahoma,sans-serif;color:#fb923c;padding:0;transition:transform .2s,box-shadow .2s;-webkit-tap-highlight-color:transparent}' +
  '#weu-fab:hover{transform:translateY(-2px);box-shadow:0 6px 25px rgba(255,107,53,.35)}' +
  '#weu-fab .dot{position:absolute;top:5px;right:5px;width:10px;height:10px;border-radius:50%;background:#4ade80;border:2px solid #16213e}' +
  '#weu-fab .unread{position:absolute;top:-6px;left:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#ef4444;color:#fff;font:700 11px/20px Cairo,Tahoma,sans-serif;text-align:center;display:none}' +
  '#weu-panel{position:fixed;z-index:10000;left:0;right:0;bottom:0;height:82vh;max-height:calc(100dvh - 12px);background:#111827;color:#e2e8f0;border:1px solid rgba(255,107,53,.35);border-radius:16px 16px 0 0;box-shadow:0 12px 40px rgba(0,0,0,.55);display:none;flex-direction:column;font-family:Cairo,Tahoma,Arial,sans-serif;direction:rtl;overflow:hidden}' +
  '#weu-panel.open{display:flex}' +
  '@media(min-width:640px){#weu-panel{left:16px;right:auto;bottom:calc(80px + env(safe-area-inset-bottom,0px));width:380px;height:560px;border-radius:16px}}' +
  '#weu-panel .hd{display:flex;align-items:center;gap:8px;padding:12px 14px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-bottom:1px solid rgba(255,255,255,.08)}' +
  '#weu-panel .hd b{flex:1;font-size:14px}' +
  '#weu-panel .hd button{background:rgba(255,255,255,.08);border:0;color:#e2e8f0;border-radius:18px;padding:5px 10px;font:600 12px Cairo,Tahoma,sans-serif;cursor:pointer}' +
  '#weu-panel .hd .x{font-size:18px;line-height:1;padding:4px 10px}' +
  '#weu-users{display:none;max-height:150px;overflow:auto;padding:8px 14px;background:#0f172a;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px}' +
  '#weu-users.show{display:block}#weu-users div{padding:3px 0;display:flex;gap:6px;align-items:center}' +
  '#weu-users i{width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block}' +
  '#weu-note{font-size:10.5px;color:#fbbf24;background:rgba(251,191,36,.08);padding:4px 14px;text-align:center}' +
  '#weu-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}' +
  '.weu-m{max-width:82%;display:flex;flex-direction:column;gap:2px}' +
  '.weu-m.me{align-self:flex-start}.weu-m.other{align-self:flex-end}' +
  '.weu-m .nm{font-size:11px;font-weight:700;color:#fb923c;padding:0 6px}' +
  '.weu-m.me .nm{color:#86efac}' +
  '.weu-m .bb{border-radius:14px;padding:8px 11px;font-size:14px;line-height:1.55;word-break:break-word;white-space:pre-wrap}' +
  '.weu-m.me .bb{background:#7c2d12;border-top-right-radius:4px}.weu-m.other .bb{background:#1e293b;border-top-left-radius:4px}' +
  '.weu-m .tm{font-size:10px;color:#64748b;padding:0 6px;display:flex;gap:8px;align-items:center}' +
  '.weu-m .tm button{background:none;border:0;color:#94a3b8;cursor:pointer;font-size:11px;padding:0}' +
  '.weu-m img{display:block;max-width:100%;max-height:260px;border-radius:10px;cursor:zoom-in;background:#0f172a;min-height:60px;min-width:120px}' +
  '.weu-m audio{width:230px;max-width:100%;height:38px}' +
  '.weu-m a.pdf{display:flex;align-items:center;gap:8px;color:#e2e8f0;text-decoration:none;white-space:normal}' +
  '.weu-m a.pdf span{font-size:13px;text-decoration:underline;word-break:break-all}' +
  '#weu-more{align-self:center;background:rgba(255,255,255,.08);border:0;color:#cbd5e1;border-radius:14px;padding:4px 12px;font:12px Cairo,Tahoma,sans-serif;cursor:pointer}' +
  '#weu-empty{margin:auto;color:#64748b;font-size:13px;text-align:center}' +
  '#weu-comp{display:flex;align-items:flex-end;gap:6px;padding:8px;background:#0f172a;border-top:1px solid rgba(255,255,255,.08);padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))}' +
  '#weu-comp textarea{flex:1;resize:none;max-height:110px;min-height:40px;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:#1e293b;color:#e2e8f0;padding:9px 14px;font:14px Cairo,Tahoma,sans-serif;outline:none;direction:rtl}' +
  '#weu-comp textarea:focus{border-color:#fb923c}' +
  '.weu-ib{width:40px;height:40px;flex:0 0 40px;border-radius:50%;border:0;background:#1e293b;color:#e2e8f0;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.weu-ib.pri{background:#ea580c;color:#fff}.weu-ib:disabled{opacity:.5;cursor:default}' +
  '#weu-rec{display:none;flex:1;align-items:center;gap:10px;color:#fca5a5;font-size:14px}' +
  '#weu-rec i{width:10px;height:10px;border-radius:50%;background:#ef4444;animation:weuP 1s infinite}@keyframes weuP{50%{opacity:.25}}' +
  '#weu-comp.rec #weu-rec{display:flex}#weu-comp.rec .norm{display:none}' +
  '#weu-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:70px;background:#334155;color:#fff;font-size:12px;padding:6px 12px;border-radius:14px;display:none;max-width:90%;text-align:center}' +
  '#weu-view{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.88);display:none;align-items:center;justify-content:center;cursor:zoom-out}' +
  '#weu-view img{max-width:96vw;max-height:92vh;border-radius:8px}';

  // ---------- state ----------
  var me = null, sb = null, presenceCh = null, chatCh = null;
  var msgs = [], seen = {}, online = {}, unread = 0, isOpen = false, oldestTs = null, loadedAll = false;
  var urlCache = {}, rec = null;
  var $ = {};

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function jwtSub(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; } catch (e) { return null; } }
  function fmtTime(iso) { var d = new Date(iso); return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
  function fmtDur(s) { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function toast(t) { $.toast.textContent = t; $.toast.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(function () { $.toast.style.display = 'none'; }, 3000); }

  // ---------- UI ----------
  function buildUI() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    $.fab = el('button'); $.fab.id = 'weu-fab'; $.fab.type = 'button'; $.fab.setAttribute('aria-label', 'محادثة الفريق والمستخدمين النشطين');
    $.count = el('span', null, '1'); $.fab.appendChild(el('span', 'dot')); $.fab.appendChild($.count);
    $.unread = el('span', 'unread'); $.fab.appendChild($.unread);
    $.fab.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });

    $.panel = el('div'); $.panel.id = 'weu-panel'; $.panel.setAttribute('role', 'dialog'); $.panel.setAttribute('aria-label', 'محادثة الفريق');
    var hd = el('div', 'hd'); hd.appendChild(el('b', null, '💬 محادثة الفريق'));
    $.usersBtn = el('button', null, '👥 1'); $.usersBtn.type = 'button';
    $.usersBtn.addEventListener('click', function () { $.users.classList.toggle('show'); });
    var x = el('button', 'x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'إغلاق'); x.addEventListener('click', togglePanel);
    hd.appendChild($.usersBtn); hd.appendChild(x);
    $.users = el('div'); $.users.id = 'weu-users';
    var note = el('div', null, '⚠️ ممنوع إرسال صور بطاقات العملاء أو العقود في الشات'); note.id = 'weu-note';
    $.msgs = el('div'); $.msgs.id = 'weu-msgs';

    $.comp = el('div'); $.comp.id = 'weu-comp';
    $.file = document.createElement('input'); $.file.type = 'file'; $.file.accept = 'image/*,application/pdf'; $.file.style.display = 'none';
    $.file.addEventListener('change', function () { var f = $.file.files[0]; $.file.value = ''; if (f) sendFile(f); });
    $.attach = el('button', 'weu-ib norm', '📎'); $.attach.type = 'button'; $.attach.setAttribute('aria-label', 'إرفاق صورة أو PDF');
    $.attach.addEventListener('click', function () { $.file.click(); });
    $.text = document.createElement('textarea'); $.text.className = 'norm'; $.text.rows = 1; $.text.placeholder = 'اكتب رسالة...'; $.text.maxLength = 2000;
    $.text.addEventListener('input', function () { $.text.style.height = 'auto'; $.text.style.height = Math.min($.text.scrollHeight, 110) + 'px'; syncBtn(); });
    $.text.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 640) { e.preventDefault(); sendText(); } });
    $.send = el('button', 'weu-ib pri norm', '➤'); $.send.type = 'button'; $.send.setAttribute('aria-label', 'إرسال'); $.send.style.display = 'none';
    $.send.addEventListener('click', sendText);
    $.mic = el('button', 'weu-ib norm', '🎙'); $.mic.type = 'button'; $.mic.setAttribute('aria-label', 'تسجيل رسالة صوتية');
    $.mic.addEventListener('click', startRec);
    $.rec = el('div'); $.rec.id = 'weu-rec'; $.rec.appendChild(el('i')); $.recT = el('span', null, '0:00'); $.rec.appendChild($.recT);
    var rs = el('div'); rs.style.flex = '1'; $.rec.appendChild(rs);
    var cancel = el('button', 'weu-ib', '🗑'); cancel.type = 'button'; cancel.setAttribute('aria-label', 'إلغاء التسجيل'); cancel.addEventListener('click', function () { stopRec(false); });
    var okb = el('button', 'weu-ib pri', '➤'); okb.type = 'button'; okb.setAttribute('aria-label', 'إرسال التسجيل'); okb.addEventListener('click', function () { stopRec(true); });
    $.rec.appendChild(cancel); $.rec.appendChild(okb);
    [$.file, $.attach, $.text, $.send, $.mic, $.rec].forEach(function (n) { $.comp.appendChild(n); });
    $.toast = el('div'); $.toast.id = 'weu-toast';

    [hd, $.users, note, $.msgs, $.comp, $.toast].forEach(function (n) { $.panel.appendChild(n); });
    $.view = el('div'); $.view.id = 'weu-view'; $.viewImg = document.createElement('img'); $.view.appendChild($.viewImg);
    $.view.addEventListener('click', function () { $.view.style.display = 'none'; $.viewImg.src = ''; });

    document.body.appendChild($.fab); document.body.appendChild($.panel); document.body.appendChild($.view);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) togglePanel(); });
    renderMessages();
  }

  function syncBtn() { var has = $.text.value.trim().length > 0; $.send.style.display = has ? 'flex' : 'none'; $.mic.style.display = has ? 'none' : 'flex'; }

  function togglePanel() {
    isOpen = !isOpen; $.panel.classList.toggle('open', isOpen);
    if (isOpen) { unread = 0; paintUnread(); scrollBottom(true); setTimeout(function () { try { $.text.focus({ preventScroll: true }); } catch (e) {} }, 60); }
    else if (rec) stopRec(false);
  }
  function paintUnread() { $.unread.style.display = unread ? 'block' : 'none'; $.unread.textContent = unread > 99 ? '99+' : unread; }
  function scrollBottom(force) {
    var m = $.msgs; if (force || m.scrollHeight - m.scrollTop - m.clientHeight < 140) requestAnimationFrame(function () { m.scrollTop = m.scrollHeight; });
  }

  // ---------- rendering ----------
  async function signedUrl(path) {
    var c = urlCache[path]; if (c && c.exp > Date.now() + 60000) return c.url;
    var r = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (r.error || !r.data) throw r.error || new Error('no url');
    urlCache[path] = { url: r.data.signedUrl, exp: Date.now() + 3600000 }; return r.data.signedUrl;
  }

  function msgNode(m) {
    var mine = m.user_id === me.id;
    var w = el('div', 'weu-m ' + (mine ? 'me' : 'other')); w.dataset.id = m.id;
    w.appendChild(el('div', 'nm', (m.sender_name || 'مستخدم') + (mine ? ' (أنت)' : '')));
    var bb = el('div', 'bb');
    if (m.kind === 'text') { bb.textContent = m.body; }
    else if (m.kind === 'image') {
      var img = document.createElement('img'); img.alt = m.file_name || 'صورة'; img.loading = 'lazy';
      signedUrl(m.file_path).then(function (u) { img.src = u; }).catch(function () { img.alt = 'تعذّر تحميل الصورة'; });
      img.addEventListener('click', function () { if (img.src) { $.viewImg.src = img.src; $.view.style.display = 'flex'; } });
      bb.style.padding = '4px'; bb.appendChild(img);
    } else if (m.kind === 'voice') {
      var au = document.createElement('audio'); au.controls = true; au.preload = 'none';
      signedUrl(m.file_path).then(function (u) { au.src = u; }).catch(function () { bb.textContent = 'تعذّر تحميل الصوت'; });
      bb.appendChild(au);
      if (m.duration_s) bb.appendChild(el('div', 'tm', '🎙 ' + fmtDur(m.duration_s)));
    } else if (m.kind === 'pdf') {
      var a = el('a', 'pdf'); a.href = '#'; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.appendChild(el('div', null, '📄')); a.appendChild(el('span', null, m.file_name || 'ملف PDF'));
      a.addEventListener('click', function (e) { e.preventDefault(); signedUrl(m.file_path).then(function (u) { window.open(u, '_blank', 'noopener'); }).catch(function () { toast('تعذّر فتح الملف'); }); });
      bb.appendChild(a);
    }
    w.appendChild(bb);
    var tm = el('div', 'tm'); tm.appendChild(el('span', null, fmtTime(m.created_at)));
    if (mine) { var del = el('button', null, 'حذف'); del.type = 'button'; del.addEventListener('click', function () { deleteMsg(m); }); tm.appendChild(del); }
    w.appendChild(tm); return w;
  }

  function renderMessages() {
    $.msgs.textContent = '';
    if (!loadedAll && msgs.length) { var more = el('button', null, 'عرض رسائل أقدم'); more.id = 'weu-more'; more.type = 'button'; more.addEventListener('click', loadOlder); $.msgs.appendChild(more); }
    if (!msgs.length) { $.msgs.appendChild(el('div', null, 'مفيش رسائل لسه. ابدأ المحادثة 👋')).id = 'weu-empty'; return; }
    msgs.forEach(function (m) { $.msgs.appendChild(msgNode(m)); });
    scrollBottom(true);
  }

  function addMessage(m) {
    if (!m || seen[m.id]) return; seen[m.id] = 1;
    msgs.push(m); msgs.sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    var empty = document.getElementById('weu-empty'); if (empty) empty.remove();
    var node = msgNode(m); var idx = msgs.indexOf(m);
    var nextEl = $.msgs.querySelector('.weu-m[data-id="' + (msgs[idx + 1] ? msgs[idx + 1].id : '') + '"]');
    if (nextEl) $.msgs.insertBefore(node, nextEl); else $.msgs.appendChild(node);
    if (m.user_id === me.id) scrollBottom(true); else { scrollBottom(false); if (!isOpen) { unread++; paintUnread(); } }
  }

  function removeMessage(id) {
    msgs = msgs.filter(function (m) { return m.id !== id; });
    var n = $.msgs.querySelector('.weu-m[data-id="' + id + '"]'); if (n) n.remove();
    if (!msgs.length) renderMessages();
  }

  // ---------- data ----------
  async function loadHistory() {
    var r = await sb.from('team_chat_messages').select('*').order('created_at', { ascending: false }).limit(60);
    if (r.error) { console.warn('[chat] history', r.error.message); return; }
    var rows = (r.data || []).reverse(); loadedAll = rows.length < 60;
    rows.forEach(function (m) { seen[m.id] = 1; }); msgs = rows; oldestTs = rows.length ? rows[0].created_at : null; renderMessages();
  }
  async function loadOlder() {
    if (!oldestTs) return;
    var r = await sb.from('team_chat_messages').select('*').lt('created_at', oldestTs).order('created_at', { ascending: false }).limit(40);
    if (r.error) return toast('تعذّر تحميل الرسائل');
    var rows = (r.data || []).reverse(); loadedAll = rows.length < 40;
    rows.forEach(function (m) { seen[m.id] = 1; }); msgs = rows.concat(msgs); if (rows.length) oldestTs = rows[0].created_at;
    var prev = $.msgs.scrollHeight; renderMessages(); $.msgs.scrollTop = $.msgs.scrollHeight - prev;
  }
  async function pollNew() {
    if (!msgs.length) return loadHistory();
    var last = msgs[msgs.length - 1].created_at;
    var r = await sb.from('team_chat_messages').select('*').gt('created_at', last).order('created_at', { ascending: true }).limit(50);
    if (!r.error) (r.data || []).forEach(addMessage);
  }

  async function insertMsg(row) {
    var r = await sb.from('team_chat_messages').insert(row).select().single();
    if (r.error) { toast('تعذّر الإرسال'); console.warn('[chat] insert', r.error.message); return false; }
    addMessage(r.data); return true;
  }
  async function sendText() {
    var t = $.text.value.trim(); if (!t) return;
    $.text.value = ''; $.text.style.height = 'auto'; syncBtn();
    if (!(await insertMsg({ kind: 'text', body: t }))) { $.text.value = t; syncBtn(); }
  }
  async function deleteMsg(m) {
    if (!confirm('تحذف الرسالة دي؟')) return;
    var r = await sb.from('team_chat_messages').delete().eq('id', m.id);
    if (r.error) return toast('تعذّر الحذف');
    removeMessage(m.id);
    if (m.file_path) { try { await sb.storage.from(BUCKET).remove([m.file_path]); } catch (e) {} }
  }

  function downscale(file) {
    return new Promise(function (resolve) {
      if (file.type === 'image/gif' || file.size < 400 * 1024) return resolve(file);
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b && b.size < file.size ? b : file); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); }; img.src = url;
    });
  }
  async function upload(blob, ext, mime) {
    var path = me.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var r = await sb.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false });
    if (r.error) throw r.error; return path;
  }
  async function sendFile(file) {
    if (!OK_TYPES.test(file.type)) return toast('مسموح بالصور وملفات PDF فقط');
    if (file.size > MAX_BYTES * 2) return toast('الملف كبير (الحد 10 ميجا)');
    toast('جاري الرفع...');
    try {
      var isImg = file.type.indexOf('image/') === 0, blob = isImg ? await downscale(file) : file;
      if (blob.size > MAX_BYTES) return toast('الملف كبير (الحد 10 ميجا)');
      var mime = isImg && blob !== file ? 'image/jpeg' : file.type;
      var ext = mime === 'application/pdf' ? 'pdf' : mime.split('/')[1].replace('jpeg', 'jpg');
      var path = await upload(blob, ext, mime);
      if (await insertMsg({ kind: isImg ? 'image' : 'pdf', file_path: path, file_name: String(file.name || '').slice(0, 120), mime: mime })) $.toast.style.display = 'none';
    } catch (e) { console.warn('[chat] upload', e); toast('تعذّر رفع الملف'); }
  }

  // ---------- voice ----------
  function pickMime() {
    var c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < c.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(c[i])) return c[i]; return '';
  }
  async function startRec() {
    if (rec) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('المتصفح لا يدعم التسجيل الصوتي');
    var stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast('اسمح بالوصول للميكروفون'); }
    var mt = pickMime(), mr = mt ? new MediaRecorder(stream, { mimeType: mt }) : new MediaRecorder(stream);
    rec = { mr: mr, chunks: [], t0: Date.now(), send: false, stream: stream, mime: mr.mimeType || mt || 'audio/webm' };
    mr.ondataavailable = function (e) { if (e.data && e.data.size) rec.chunks.push(e.data); };
    mr.onstop = onRecStop; mr.start(); $.comp.classList.add('rec'); $.recT.textContent = '0:00';
    rec.timer = setInterval(function () {
      var s = (Date.now() - rec.t0) / 1000; $.recT.textContent = fmtDur(s); if (s >= MAX_REC_SEC) stopRec(true);
    }, 250);
  }
  function stopRec(send) { if (!rec) return; rec.send = !!send; clearInterval(rec.timer); try { rec.mr.state !== 'inactive' && rec.mr.stop(); } catch (e) { onRecStop(); } }
  async function onRecStop() {
    var r = rec; if (!r) return; rec = null; clearInterval(r.timer);
    r.stream.getTracks().forEach(function (t) { t.stop(); }); $.comp.classList.remove('rec');
    if (!r.send) return;
    var dur = (Date.now() - r.t0) / 1000; if (dur < 1) return toast('التسجيل قصير جداً');
    var type = (r.mime || 'audio/webm').split(';')[0], blob = new Blob(r.chunks, { type: type });
    if (blob.size > MAX_BYTES) return toast('التسجيل كبير');
    toast('جاري إرسال التسجيل...');
    try {
      var ext = type.indexOf('mp4') > -1 ? 'm4a' : type.indexOf('ogg') > -1 ? 'ogg' : 'webm';
      var path = await upload(blob, ext, type);
      if (await insertMsg({ kind: 'voice', file_path: path, mime: type, duration_s: Math.round(dur) })) $.toast.style.display = 'none';
    } catch (e) { console.warn('[chat] voice', e); toast('تعذّر إرسال التسجيل'); }
  }

  // ---------- presence + realtime ----------
  function paintOnline() {
    var ids = Object.keys(online), n = Math.max(1, ids.length);
    $.count.textContent = n; $.usersBtn.textContent = '👥 ' + n;
    $.users.textContent = '';
    ids.forEach(function (id) { var d = el('div'); d.appendChild(el('i')); d.appendChild(el('span', null, online[id].name + (id === me.id ? ' (أنت)' : ''))); $.users.appendChild(d); });
  }
  function connect() {
    sb.realtime.setAuth(window.__weTok);
    presenceCh = sb.channel('we-core-presence', { config: { presence: { key: me.id } } });
    function sync() {
      var st = presenceCh.presenceState(); online = {};
      Object.keys(st).forEach(function (k) { var p = (st[k] && st[k][0]) || {}; online[k] = { name: p.display_name || 'مستخدم' }; });
      paintOnline();
    }
    presenceCh.on('presence', { event: 'sync' }, sync).on('presence', { event: 'join' }, sync).on('presence', { event: 'leave' }, sync)
      .subscribe(function (s) { if (s === 'SUBSCRIBED') presenceCh.track({ user_id: me.id, display_name: me.name, page: location.pathname.split('/').pop() || 'index', online_at: new Date().toISOString() }); });
    chatCh = sb.channel('team-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_chat_messages' }, function (p) { addMessage(p.new); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'team_chat_messages' }, function (p) { if (p.old && p.old.id) removeMessage(p.old.id); })
      .subscribe();
    window.addEventListener('beforeunload', function () { try { presenceCh.untrack(); } catch (e) {} });
    setInterval(async function () { var t = await window.WEAuth.getToken(); if (t && t !== window.__weTok) { window.__weTok = t; sb.realtime.setAuth(t); } }, 5 * 60 * 1000);
    setInterval(function () { if (!document.hidden) pollNew(); }, 20000);
  }

  function loadSupabase() {
    return new Promise(function (res, rej) {
      if (window.supabase && window.supabase.createClient) return res();
      var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }

  async function boot() {
    var tok = await window.WEAuth.getToken(); if (!tok) return;      // مفيش جلسة = مفيش ودجت
    window.__weTok = tok;
    var uid = jwtSub(tok); if (!uid) return;
    await loadSupabase();
    sb = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async function (url, opts) {
        opts = opts || {}; var t = await window.WEAuth.getToken(); var h = new Headers(opts.headers || {});
        if (t) h.set('Authorization', 'Bearer ' + t); return fetch(url, Object.assign({}, opts, { headers: h }));
      } }
    });
    var name = (window._sbUserFromSession && window._sbUserFromSession.email) || 'مستخدم';
    try {
      var p = await sb.from('profiles').select('full_name').eq('id', uid).maybeSingle();
      if (p.data && p.data.full_name) name = p.data.full_name;
    } catch (e) {}
    me = { id: uid, name: name };
    buildUI(); paintOnline(); connect(); loadHistory();
  }

  function start() { boot().catch(function (e) { console.warn('[WE-Core] widget', e); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // توافق مع الصفحات اللي بتنادي ActiveUsersWidget.init(...)
  window.ActiveUsersWidget = { init: function () {} };
})();
