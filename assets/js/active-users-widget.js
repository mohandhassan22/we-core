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
  .we-m.mine .s{display:none}
  .we-m .t{display:block;font-size:10px;opacity:.6;margin-top:2px}
  .we-m .x{cursor:pointer;opacity:.5;font-size:11px;margin-inline-start:6px}
  #we-chat-form{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff}
  #we-chat-input{flex:1;border:1px solid #ddd;border-radius:20px;padding:9px 14px;font-family:inherit;font-size:14px;outline:none;resize:none;max-height:90px}
  #we-chat-send{border:0;border-radius:50%;width:40px;height:40px;background:#591685;color:#fff;cursor:pointer;font-size:16px}
  #we-chat-send:disabled{opacity:.5}
  .we-empty{margin:auto;color:#999;font-size:13px;text-align:center}
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
      <form id="we-chat-form"><textarea id="we-chat-input" rows="1" maxlength="1000" placeholder="اكتب رسالتك..."></textarea>
        <button id="we-chat-send" type="submit">➤</button></form>`;
    document.body.appendChild(fab); document.body.appendChild(panel);
    el = { fab, panel, count: fab.querySelector('#we-chat-count'), count2: panel.querySelector('#we-chat-count2'), unread: fab.querySelector('#we-chat-unread'),
           msgs: panel.querySelector('#we-chat-msgs'), online: panel.querySelector('#we-chat-online'), input: panel.querySelector('#we-chat-input'), send: panel.querySelector('#we-chat-send') };
    fab.addEventListener('click', toggle);
    panel.querySelector('#we-chat-close').addEventListener('click', toggle);
    panel.querySelector('#we-chat-toggle-online').addEventListener('click', () => el.online.classList.toggle('show'));
    panel.querySelector('#we-chat-form').addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
    el.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    el.msgs.addEventListener('click', (e) => { const x = e.target.closest('[data-del]'); if (x) deleteMessage(x.dataset.del); });
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
  function msgHtml(m) {
    const mine = m.user_id === me.id;
    return `<div class="we-m${mine ? ' mine' : ''}" data-id="${m.id}"><span class="s">${esc(m.sender_name)}</span>${esc(m.body)}<span class="t">${fmtTime(m.created_at)}${mine ? ` <span class="x" data-del="${m.id}" title="حذف">🗑</span>` : ''}</span></div>`;
  }
  function renderMessages(scroll) {
    if (!messages.length) { el.msgs.innerHTML = '<div class="we-empty">لا توجد رسائل بعد. ابدأ المحادثة 👋</div>'; return; }
    const nearBottom = el.msgs.scrollHeight - el.msgs.scrollTop - el.msgs.clientHeight < 80;
    el.msgs.innerHTML = messages.map(msgHtml).join('');
    if (scroll || nearBottom) el.msgs.scrollTop = el.msgs.scrollHeight;
  }

  async function loadMessages() {
    const { data, error } = await client.from('chat_room_messages').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);
    if (error) { el.msgs.innerHTML = '<div class="we-empty">تعذر تحميل الرسائل</div>'; return; }
    messages = (data || []).reverse();
    renderMessages(true);
  }

  async function sendMessage() {
    const body = el.input.value.trim();
    if (!body) return;
    el.send.disabled = true;
    const { data, error } = await client.from('chat_room_messages').insert({ body }).select().single();
    el.send.disabled = false;
    if (error) { alert('تعذر إرسال الرسالة'); return; }
    el.input.value = '';
    if (data && !messages.some(m => m.id === data.id)) { messages.push(data); renderMessages(true); }
  }

  async function deleteMessage(id) {
    const { error } = await client.from('chat_room_messages').delete().eq('id', id);
    if (!error) { messages = messages.filter(m => String(m.id) !== String(id)); renderMessages(false); }
  }

  function subscribe() {
    chatCh = client.channel('we-chat-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_room_messages' }, (p) => {
        const m = p.new; if (!m || messages.some(x => x.id === m.id)) return;
        messages.push(m); if (messages.length > 300) messages.shift();
        renderMessages(false);
        if (!open && m.user_id !== me.id) { unread++; renderUnread(); }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_room_messages' }, (p) => {
        const id = p.old && p.old.id; if (id == null) return;
        messages = messages.filter(x => x.id !== id); renderMessages(false);
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
