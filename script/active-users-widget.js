/**
 * ====================================================
 * WE-Core | Active Users Widget v2.0
 * نظام تتبع المستخدمين النشطين - مع عرض الأسماء
 * ====================================================
 *
 * طريقة التضمين في أي صفحة HTML:
 * <script src="script/active-users-widget.js"></script>
 *
 * ثم في آخر الـ <body>:
 * <div id="active-users-widget"></div>
 *
 * أو:
 * ActiveUsersWidget.init({ position: 'corner' });
 * ====================================================
 */

const ActiveUsersWidget = (() => {

  const CONFIG = {
    supabaseUrl:     'https://iygwhapcpdmsasqlfelv.supabase.co',
    supabaseKey:     'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP',
    channelName:     'we-core-presence',
    fallbackInterval: 5000,
    position:        'corner',
    containerId:     'active-users-widget',
  };

  const STYLES = `
    #we-active-users-corner {
      position: fixed;
      bottom: 16px;
      left: 16px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid rgba(255, 107, 53, 0.35);
      border-radius: 50px;
      padding: 7px 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,107,53,0.1);
      cursor: pointer;
      font-family: 'Cairo', sans-serif;
      transition: all 0.3s ease;
      animation: slideInCorner 0.5s ease forwards;
      user-select: none;
    }
    #we-active-users-corner:hover {
      box-shadow: 0 6px 25px rgba(255,107,53,0.3), 0 0 0 1px rgba(255,107,53,0.4);
      transform: translateY(-2px);
    }
    @keyframes slideInCorner {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .we-active-dot {
      width: 8px; height: 8px;
      background: #4ade80;
      border-radius: 50%;
      flex-shrink: 0;
      animation: wePulse 2s infinite;
    }
    @keyframes wePulse {
      0%   { box-shadow: 0 0 0 0 rgba(74,222,128,.6); }
      70%  { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
      100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
    }
    .we-active-text { display: flex; align-items: center; gap: 3px; }
    .we-active-count {
      color: #fb923c; font-weight: 700; font-size: 13px;
      transition: transform 0.2s;
    }
    .we-active-label { color: #94a3b8; font-size: 10px; white-space: nowrap; }

    /* ── Popup ── */
    #we-users-popup {
      position: fixed;
      bottom: 56px;
      left: 16px;
      z-index: 10000;
      background: linear-gradient(160deg, #1e2a45 0%, #111827 100%);
      border: 1px solid rgba(255,107,53,0.4);
      border-radius: 14px;
      min-width: 220px;
      max-width: 280px;
      box-shadow: 0 12px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(255,107,53,.15);
      font-family: 'Cairo', sans-serif;
      animation: wePopupIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;
      overflow: hidden;
    }
    @keyframes wePopupIn {
      from { opacity:0; transform:translateY(10px) scale(.95); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }
    .we-popup-header {
      display:flex; align-items:center; gap:8px;
      padding: 12px 16px 10px;
      border-bottom: 1px solid rgba(255,255,255,.07);
    }
    .we-popup-title { color:#e2e8f0; font-size:12px; font-weight:600; flex:1; }
    .we-popup-count-badge {
      background: rgba(251,146,60,.15);
      border: 1px solid rgba(251,146,60,.3);
      color: #fb923c; font-size:11px; font-weight:700;
      padding: 1px 8px; border-radius:20px;
    }
    .we-users-list {
      max-height:240px; overflow-y:auto; padding:8px 0;
      scrollbar-width:thin; scrollbar-color:rgba(255,107,53,.3) transparent;
    }
    .we-users-list::-webkit-scrollbar { width:4px; }
    .we-users-list::-webkit-scrollbar-thumb { background:rgba(255,107,53,.3); border-radius:4px; }
    .we-user-item {
      display:flex; align-items:center; gap:10px;
      padding:7px 16px; transition:background .15s;
    }
    .we-user-item:hover { background:rgba(255,255,255,.04); }
    .we-user-avatar {
      width:30px; height:30px; border-radius:50%;
      background:linear-gradient(135deg,#fb923c,#f97316);
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:700; color:#fff; flex-shrink:0;
    }
    .we-user-info { flex:1; min-width:0; }
    .we-user-name {
      color:#e2e8f0; font-size:12px; font-weight:600;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .we-user-status { display:flex; align-items:center; gap:4px; margin-top:1px; }
    .we-user-dot { width:5px; height:5px; background:#4ade80; border-radius:50%; }
    .we-user-online-text { color:#64748b; font-size:10px; }
    .we-popup-footer {
      padding:8px 16px; border-top:1px solid rgba(255,255,255,.06);
      text-align:center; color:#475569; font-size:10px;
    }
    .we-loading-text { color:#64748b; font-size:11px; padding:16px; text-align:center; }

    /* Inline */
    .we-active-inline-card {
      display:flex; align-items:center; gap:12px;
      background:linear-gradient(135deg,#1a1a2e,#16213e);
      border:1px solid rgba(255,107,53,.3); border-radius:12px;
      padding:14px 20px; font-family:'Cairo',sans-serif; cursor:pointer;
    }
    .we-active-inline-card:hover { border-color:rgba(255,107,53,.5); }
    .we-active-inline-card .we-active-icon { font-size:22px; }
    .we-active-inline-card .we-active-info { display:flex; flex-direction:column; }
    .we-active-inline-card .we-active-num { font-size:24px; font-weight:700; color:#fb923c; line-height:1; }
    .we-active-inline-card .we-active-desc { font-size:12px; color:#94a3b8; margin-top:2px; }
  `;

  let supabaseChannel = null;
  let supabaseClient  = null;
  let activeCount     = 1;
  let widgetEl        = null;
  let countEl         = null;
  let popupEl         = null;
  let popupVisible    = false;
  let activeUsersMap  = {};

  function getUserId() {
    let uid = localStorage.getItem('we_user_uid');
    if (!uid) { uid = 'user_' + Math.random().toString(36).substr(2,9); localStorage.setItem('we_user_uid', uid); }
    return uid;
  }

  function getDisplayName() {
    if (window._sbUser) {
      const u = window._sbUser;
      return u.user_metadata?.full_name || u.email || null;
    }
    return localStorage.getItem('we_display_name') || null;
  }

  function updateCount(count) {
    activeCount = count;
    if (countEl) {
      countEl.textContent = count;
      countEl.style.transform = 'scale(1.25)';
      setTimeout(() => { if (countEl) countEl.style.transform = ''; }, 200);
    }
    if (popupVisible) renderPopup();
  }

  async function fetchUserNames(userIds) {
    if (!userIds.length) return {};
    try {
      const ids = userIds.join(',');
      const res = await fetch(
        `${CONFIG.supabaseUrl}/rest/v1/profiles?select=id,full_name&id=in.(${ids})`,
        { headers: { apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}` } }
      );
      if (!res.ok) return {};
      const rows = await res.json();
      const map = {};
      rows.forEach(r => { map[r.id] = r.full_name || null; });
      return map;
    } catch { return {}; }
  }

  async function renderPopup() {
    if (!popupEl) return;
    const users = Object.entries(activeUsersMap);
    const badge = popupEl.querySelector('.we-popup-count-badge');
    if (badge) badge.textContent = users.length;
    const list = popupEl.querySelector('.we-users-list');
    if (!list) return;
    if (!users.length) { list.innerHTML = '<div class="we-loading-text">لا يوجد مستخدمون نشطون</div>'; return; }
    list.innerHTML = '<div class="we-loading-text">جاري التحميل...</div>';

    const supabaseIds = users.map(([id]) => id).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}/.test(id));
    const nameMap = await fetchUserNames(supabaseIds);

    list.innerHTML = users.map(([uid, info]) => {
      const name    = nameMap[uid] || info.name || 'مستخدم';
      const initial = [...name].find(c => /\S/.test(c)) || '؟';
      const page    = info.page ? info.page.replace('.html','').replace(/_/g,' ') : '';
      return `<div class="we-user-item">
        <div class="we-user-avatar">${initial}</div>
        <div class="we-user-info">
          <div class="we-user-name">${name}</div>
          <div class="we-user-status">
            <div class="we-user-dot"></div>
            <span class="we-user-online-text">نشط الآن${page ? ' · ' + page : ''}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function createPopup() {
    const div = document.createElement('div');
    div.id = 'we-users-popup';
    div.innerHTML = `
      <div class="we-popup-header">
        <span>👥</span>
        <span class="we-popup-title">المستخدمون النشطون</span>
        <span class="we-popup-count-badge">${activeCount}</span>
      </div>
      <div class="we-users-list"><div class="we-loading-text">جاري التحميل...</div></div>
      <div class="we-popup-footer">يتحدث كل 5 ثوانٍ تلقائياً</div>`;
    document.body.appendChild(div);
    popupEl = div;
    renderPopup();
    setTimeout(() => document.addEventListener('click', outsideClick), 50);
  }

  function outsideClick(e) {
    if (popupEl && !popupEl.contains(e.target) && widgetEl && !widgetEl.contains(e.target)) closePopup();
  }

  function closePopup() {
    if (popupEl) { popupEl.remove(); popupEl = null; }
    popupVisible = false;
    document.removeEventListener('click', outsideClick);
  }

  function togglePopup() {
    if (popupVisible) closePopup(); else { popupVisible = true; createPopup(); }
  }

  function createCornerWidget() {
    const div = document.createElement('div');
    div.id = 'we-active-users-corner';
    div.title = 'اضغط لعرض المستخدمين النشطين';
    div.innerHTML = `
      <div class="we-active-dot"></div>
      <div class="we-active-text">
        <span class="we-active-count" id="we-count">1</span>
        <span class="we-active-label"> مستخدم نشط</span>
      </div>`;
    div.addEventListener('click', e => { e.stopPropagation(); togglePopup(); });
    document.body.appendChild(div);
    widgetEl = div;
    countEl  = document.getElementById('we-count');
  }

  function createInlineWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="we-active-inline-card" id="we-inline-card">
        <span class="we-active-icon">👥</span>
        <div class="we-active-info">
          <span class="we-active-num" id="we-count">1</span>
          <span class="we-active-desc">مستخدم نشط الآن — اضغط لعرض الأسماء</span>
        </div>
      </div>`;
    document.getElementById('we-inline-card')?.addEventListener('click', e => { e.stopPropagation(); togglePopup(); });
    countEl  = document.getElementById('we-count');
    widgetEl = document.getElementById('we-inline-card');
  }

  function connectSupabase(url, key) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => {
      const { createClient } = supabase;
      supabaseClient = createClient(url, key);
      const userId   = getUserId();
      const pageName = window.location.pathname.split('/').pop() || 'index';

      function syncState() {
        const state = supabaseChannel.presenceState();
        activeUsersMap = {};
        Object.entries(state).forEach(([uid, presences]) => {
          const p = presences[0] || {};
          activeUsersMap[uid] = { name: p.display_name || p.email || null, page: p.page || '', online_at: p.online_at || '' };
        });
        updateCount(Object.keys(activeUsersMap).length);
      }

      function doTrack() {
        const displayName = getDisplayName();
        supabaseChannel = supabaseClient.channel(CONFIG.channelName, { config: { presence: { key: userId } } });
        supabaseChannel
          .on('presence', { event: 'sync'  }, syncState)
          .on('presence', { event: 'join'  }, syncState)
          .on('presence', { event: 'leave' }, syncState)
          .subscribe(async status => {
            if (status === 'SUBSCRIBED') {
              await supabaseChannel.track({ user_id: userId, display_name: displayName, page: pageName, online_at: new Date().toISOString() });
              console.log('[WE-Core] ✅ Presence connected');
            }
          });
      }

      if (window._sbUser) { doTrack(); }
      else {
        window.addEventListener('authSuccess', doTrack, { once: true });
        setTimeout(() => { if (!supabaseChannel) doTrack(); }, 3000);
      }

      window.addEventListener('beforeunload', () => { if (supabaseChannel) supabaseChannel.untrack(); });
    };
    document.head.appendChild(script);
  }

  function startFallbackTracking() {
    const userId      = getUserId();
    const STORAGE_KEY = 'we_active_users';
    const TIMEOUT     = 15000;

    function heartbeat() {
      const now  = Date.now();
      const name = getDisplayName() || userId;
      let users  = {};
      try { users = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
      users[userId] = { ts: now, name, page: window.location.pathname.split('/').pop() || 'index' };
      Object.keys(users).forEach(uid => { if (now - users[uid].ts > TIMEOUT) delete users[uid]; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      activeUsersMap = {};
      Object.entries(users).forEach(([uid, info]) => { activeUsersMap[uid] = { name: info.name, page: info.page, online_at: '' }; });
      updateCount(Object.keys(users).length);
    }

    heartbeat();
    setInterval(heartbeat, CONFIG.fallbackInterval);

    window.addEventListener('storage', e => {
      if (e.key !== STORAGE_KEY) return;
      const users = JSON.parse(e.newValue || '{}');
      const now   = Date.now();
      activeUsersMap = {};
      Object.entries(users).forEach(([uid, info]) => { if (now - info.ts < TIMEOUT) activeUsersMap[uid] = { name: info.name, page: info.page, online_at: '' }; });
      updateCount(Object.keys(activeUsersMap).length);
      if (popupVisible) renderPopup();
    });

    window.addEventListener('beforeunload', () => {
      let users = {};
      try { users = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
      delete users[userId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    });
    console.log('[WE-Core] ⚡ Fallback mode');
  }

  function init(options = {}) {
    const cfg = { ...CONFIG, ...options };
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
    if (cfg.position === 'corner')       createCornerWidget();
    else if (cfg.position === 'inline')  createInlineWidget(cfg.containerId);
    const hasSupabase = cfg.supabaseUrl && cfg.supabaseUrl !== 'YOUR_SUPABASE_URL';
    if (hasSupabase) connectSupabase(cfg.supabaseUrl, cfg.supabaseKey);
    else             startFallbackTracking();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tag = document.querySelector('script[data-we-active-users]');
    if (tag) init({ supabaseUrl: tag.dataset.supabaseUrl, supabaseKey: tag.dataset.supabaseKey, position: tag.dataset.position || 'corner', containerId: tag.dataset.containerId || 'active-users-widget' });
  });

  return { init };
})();
