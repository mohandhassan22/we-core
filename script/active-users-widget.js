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
    fallbackInterval: 5000,
    position: 'corner', // Default to corner to show on all pages
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
      font-size: 20px;
      transition: color 0.2s;
    }

    .we-modal-close:hover {
      color: #fff;
    }

    .we-modal-body {
      padding: 10px;
      overflow-y: auto;
      flex: 1;
    }

    .we-user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      border-radius: 12px;
      transition: background 0.2s;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }

    .we-user-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .we-user-avatar {
      width: 35px;
      height: 35px;
      background: linear-gradient(135deg, #fb923c, #ea580c);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
    }

    .we-user-info {
      display: flex;
      flex-direction: column;
    }

    .we-user-name {
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 600;
    }

    .we-user-page {
      color: #94a3b8;
      font-size: 10px;
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
    // Try to get name from Supabase user object if available
    if (window._sbUser) {
        return window._sbUser.user_metadata?.full_name || window._sbUser.user_metadata?.username || window._sbUser.email.split('@')[0];
    }
    // Fallback to localStorage if we stored it there
    return localStorage.getItem('we_username') || 'مستخدم';
  }

  function updateCount(count) {
    if (countEl) {
      countEl.textContent = count;
    }
  }

  function createModal() {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'we-users-modal-overlay';
    modalOverlay.innerHTML = `
      <div id="we-users-modal">
        <div class="we-modal-header">
          <span class="we-modal-title">المستخدمين النشطين</span>
          <span class="we-modal-close">&times;</span>
        </div>
        <div class="we-modal-body" id="we-users-list">
          <!-- Users will be listed here -->
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

  function showUsers() {
    if (!modalOverlay) createModal();
    const list = document.getElementById('we-users-list');
    list.innerHTML = '';

    const users = Object.values(activeUsers);
    if (users.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">لا يوجد مستخدمين آخرين</div>';
    } else {
        users.forEach(user => {
            const name = user.name || 'مستخدم مجهول';
            const initial = name.charAt(0).toUpperCase();
            const page = user.page || 'الرئيسية';
            
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
    modalOverlay.style.display = 'flex';
  }

  function createCornerWidget() {
    const div = document.createElement('div');
    div.id = 'we-active-users-corner';
    div.innerHTML = `
      <div class="we-active-dot"></div>
      <div class="we-active-text">
        <span class="we-active-count" id="we-count">1</span>
        <span class="we-active-label"> مستخدم نشط</span>
      </div>
    `;
    div.onclick = showUsers;
    document.body.appendChild(div);
    widgetEl = div;
    countEl = document.getElementById('we-count');
  }

  function connectSupabase(url, key) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => {
      const { createClient } = supabase;
      const client = createClient(url, key);
      const userId = getUserId();
      const userName = getUserName();
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
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await supabaseChannel.track({
              user_id: userId,
              name: userName,
              page: pageTitle,
              online_at: new Date().toISOString()
            });
          }
        });

      window.addEventListener('beforeunload', () => {
        supabaseChannel.untrack();
      });
    };
    document.head.appendChild(script);
  }

  function init(options = {}) {
    const cfg = { ...CONFIG, ...options };
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    createCornerWidget();
    connectSupabase(cfg.supabaseUrl, cfg.supabaseKey);
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  return { init };

})();
