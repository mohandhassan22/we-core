/**
 * ====================================================
 * WE-Core | Active Users Widget
 * نظام تتبع المستخدمين النشطين
 * ====================================================
 */

const ActiveUsersWidget = (() => {

  // =====================
  // ⚙️ الإعدادات
  // =====================
  const CONFIG = {
    supabaseUrl: 'https://iygwhapcpdmsasqlfelv.supabase.co',
    supabaseKey: 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP',
    channelName: 'we-core-presence',
    position: 'corner',
    containerId: 'active-users-widget',
  };

  // =====================
  // 🎨 الـ Styles
  // =====================
  const STYLES = `
    #we-active-users-corner {
      position: fixed;
      bottom: 16px;
      left: 16px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 5px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid rgba(255, 107, 53, 0.3);
      border-radius: 50px;
      padding: 6px 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,107,53,0.1);
      cursor: pointer;
      font-family: 'Cairo', sans-serif;
      transition: all 0.3s ease;
      animation: slideInCorner 0.5s ease forwards;
      min-width: 80px;
      user-select: none;
    }

    #we-active-users-corner:hover {
      box-shadow: 0 6px 25px rgba(255,107,53,0.25), 0 0 0 1px rgba(255,107,53,0.3);
      transform: translateY(-2px);
    }

    @keyframes slideInCorner {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .we-active-dot {
      width: 7px;
      height: 7px;
      background: #4ade80;
      border-radius: 50%;
      flex-shrink: 0;
      animation: pulse 2s infinite;
      box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5);
    }

    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.6); }
      70%  { box-shadow: 0 0 0 7px rgba(74, 222, 128, 0); }
      100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }

    .we-active-text {
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }

    .we-active-count {
      color: #fb923c;
      font-weight: 700;
      font-size: 12px;
    }

    .we-active-label {
      color: #94a3b8;
      font-size: 10px;
    }

    /* Modal Styles */
    #we-users-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease;
    }

    #we-users-modal {
      background: #1a1a2e;
      border: 1px solid rgba(255, 107, 53, 0.3);
      border-radius: 20px;
      width: 100%;
      max-width: 350px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      font-family: 'Cairo', sans-serif;
      direction: rtl;
    }

    .we-modal-header {
      padding: 15px 20px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .we-modal-title {
      color: #fff;
      font-weight: 700;
      font-size: 16px;
    }

    .we-modal-close {
      color: #94a3b8;
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
      transition: color 0.2s;
    }

    .we-modal-close:hover {
      color: #fff;
    }

    .we-modal-body {
      padding: 10px;
      overflow-y: auto;
      flex: 1;
      min-height: 100px;
    }

    .we-user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      border-radius: 12px;
      transition: background 0.2s;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }

    .we-user-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .we-user-avatar {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #fb923c, #ea580c);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }

    .we-user-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .we-user-name {
      color: #e2e8f0;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .we-user-page {
      color: #94a3b8;
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  let supabaseChannel = null;
  let activeUsers = {};
  let widgetEl = null;
  let countEl = null;
  let modalOverlay = null;

  function getUserId() {
    let uid = localStorage.getItem('we_user_uid');
    if (!uid) {
      uid = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('we_user_uid', uid);
    }
    return uid;
  }

  function getUserName() {
    // 1. Try Supabase Global Object (most reliable)
    if (window._sbUser && window._sbUser.user_metadata) {
        const meta = window._sbUser.user_metadata;
        return meta.full_name || meta.username || window._sbUser.email.split('@')[0];
    }
    
    // 2. Try to find in localStorage
    const storedName = localStorage.getItem('we_username');
    if (storedName) return storedName;

    // 3. Try to parse from welcome banner if exists
    const welcomeName = document.querySelector('.welcome-name')?.textContent;
    if (welcomeName) return welcomeName;

    return 'جهاز نشط';
  }

  function updateCount(count) {
    if (countEl) {
      countEl.textContent = count;
    }
  }

  function createModal() {
    if (document.getElementById('we-users-modal-overlay')) return;
    
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'we-users-modal-overlay';
    modalOverlay.innerHTML = `
      <div id="we-users-modal">
        <div class="we-modal-header">
          <span class="we-modal-title">الأجهزة المتصلة حالياً</span>
          <span class="we-modal-close">&times;</span>
        </div>
        <div class="we-modal-body" id="we-users-list">
          <div style="text-align:center; padding:20px; color:#94a3b8;">جاري تحميل القائمة...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    modalOverlay.querySelector('.we-modal-close').onclick = () => {
      modalOverlay.style.display = 'none';
    };

    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    };
  }

  function renderUsersList() {
    const list = document.getElementById('we-users-list');
    if (!list) return;
    
    list.innerHTML = '';
    const users = Object.values(activeUsers);
    
    if (users.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">لا يوجد أجهزة أخرى نشطة</div>';
    } else {
        users.forEach(user => {
            const name = user.name || 'جهاز مجهول';
            const initial = name.charAt(0).toUpperCase();
            const page = user.page || 'تصفح عام';
            
            const item = document.createElement('div');
            item.className = 'we-user-item';
            item.innerHTML = `
                <div class="we-user-avatar">${initial}</div>
                <div class="we-user-info">
                    <span class="we-user-name">${name}</span>
                    <span class="we-user-page">يتصفح: ${page}</span>
                </div>
            `;
            list.appendChild(item);
        });
    }
  }

  function showUsers() {
    createModal();
    renderUsersList();
    modalOverlay.style.display = 'flex';
  }

  function createCornerWidget() {
    if (document.getElementById('we-active-users-corner')) return;
    
    const div = document.createElement('div');
    div.id = 'we-active-users-corner';
    div.innerHTML = `
      <div class="we-active-dot"></div>
      <div class="we-active-text">
        <span class="we-active-count" id="we-count">1</span>
        <span class="we-active-label"> جهاز نشط</span>
      </div>
    `;
    div.onclick = showUsers;
    document.body.appendChild(div);
    widgetEl = div;
    countEl = document.getElementById('we-count');
  }

  function connectSupabase(url, key) {
    // Check if SDK is already loaded
    if (typeof supabase !== 'undefined') {
        startTracking(supabase);
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        script.onload = () => startTracking(supabase);
        document.head.appendChild(script);
    }

    function startTracking(sb) {
      const { createClient } = sb;
      const client = createClient(url, key);
      const userId = getUserId();
      const pageTitle = document.title.split('|')[0].trim();

      supabaseChannel = client.channel(CONFIG.channelName, {
        config: { presence: { key: userId } }
      });

      supabaseChannel
        .on('presence', { event: 'sync' }, () => {
          const state = supabaseChannel.presenceState();
          activeUsers = {};
          Object.keys(state).forEach(key => {
            activeUsers[key] = state[key][0];
          });
          updateCount(Object.keys(state).length);
          if (modalOverlay && modalOverlay.style.display === 'flex') {
            renderUsersList();
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // دالة لعمل track بالاسم الحالي
            async function trackPresence() {
              const userName = getUserName();
              await supabaseChannel.track({
                user_id: userId,
                name: userName,
                page: pageTitle,
                online_at: new Date().toISOString()
              });
            }

            // Track مباشرة
            await trackPresence();

            // لو الاسم مش حقيقي بعد، استنى authSuccess وعيد الـ track
            if (!window._sbUser) {
              window.addEventListener('authSuccess', async () => {
                await trackPresence();
              }, { once: true });
            }
          }
        });

      window.addEventListener('beforeunload', () => {
        supabaseChannel.untrack();
      });
    }
  }

  function init(options = {}) {
    const cfg = { ...CONFIG, ...options };
    
    // Only init if not already initialized
    if (window._weWidgetInited) return;
    window._weWidgetInited = true;

    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    createCornerWidget();
    connectSupabase(cfg.supabaseUrl, cfg.supabaseKey);
  }

  // Auto-init with safety check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  return { init };

})();
