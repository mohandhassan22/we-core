/**
 * ====================================================
 * WE-Core | Active Users Widget
 * نظام تتبع المستخدمين النشطين
 * ====================================================
 * 
 * طريقة التضمين في أي صفحة HTML:
 * <script src="script/active-users-widget.js"></script>
 * 
 * ثم أضف في آخر الـ <body>:
 * <div id="active-users-widget"></div>
 * 
 * أو استدعي مباشرة:
 * ActiveUsersWidget.init({ supabaseUrl: '...', supabaseKey: '...' });
 * ====================================================
 */

const ActiveUsersWidget = (() => {

  // =====================
  // ⚙️ الإعدادات
  // =====================
  const CONFIG = {
    // 🔴 ضع هنا بيانات Supabase بتاعتك
    supabaseUrl: 'YOUR_SUPABASE_URL',       // مثال: https://xxxx.supabase.co
    supabaseKey: 'YOUR_SUPABASE_ANON_KEY',  // Anon Public Key من Supabase Dashboard

    // اسم الـ channel في Supabase Realtime
    channelName: 'we-core-presence',

    // كل كام ثانية يتحدث العداد (بدون Supabase)
    fallbackInterval: 5000,

    // وين الـ Widget يظهر؟ 'corner' | 'inline'
    position: 'corner',

    // الـ Element اللي هيتضاف فيه لو position = 'inline'
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
      cursor: default;
      font-family: 'Cairo', sans-serif;
      transition: all 0.3s ease;
      animation: slideInCorner 0.5s ease forwards;
      min-width: 80px;
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

    /* Dark mode support */
    [data-theme="light"] #we-active-users-corner {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-color: rgba(255, 107, 53, 0.2);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    [data-theme="light"] .we-active-text { color: #1e293b; }
    [data-theme="light"] .we-active-label { color: #64748b; }

    /* Inline card style */
    .we-active-inline-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 1px solid rgba(255, 107, 53, 0.3);
      border-radius: 12px;
      padding: 14px 20px;
      font-family: 'Cairo', sans-serif;
    }

    .we-active-inline-card .we-active-icon {
      font-size: 22px;
    }

    .we-active-inline-card .we-active-info {
      display: flex;
      flex-direction: column;
    }

    .we-active-inline-card .we-active-num {
      font-size: 24px;
      font-weight: 700;
      color: #fb923c;
      line-height: 1;
    }

    .we-active-inline-card .we-active-desc {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
    }
  `;

  // =====================
  // 🔧 المنطق الأساسي
  // =====================

  let supabaseChannel = null;
  let activeCount = 1;
  let widgetEl = null;
  let countEl = null;
  let useSupabase = false;

  // إنشاء ID فريد للمستخدم الحالي
  function getUserId() {
    let uid = localStorage.getItem('we_user_uid');
    if (!uid) {
      uid = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('we_user_uid', uid);
    }
    return uid;
  }

  // تحديث عرض العداد
  function updateCount(count) {
    activeCount = count;
    if (countEl) {
      countEl.textContent = count;
      countEl.style.animation = 'none';
      setTimeout(() => countEl.style.animation = '', 10);
    }
  }

  // إنشاء الـ Widget HTML
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
    document.body.appendChild(div);
    widgetEl = div;
    countEl = document.getElementById('we-count');
  }

  function createInlineWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="we-active-inline-card">
        <span class="we-active-icon">👥</span>
        <div class="we-active-info">
          <span class="we-active-num" id="we-count">1</span>
          <span class="we-active-desc">مستخدم نشط الآن</span>
        </div>
      </div>
    `;
    countEl = document.getElementById('we-count');
  }

  // =====================
  // 🔌 Supabase Realtime
  // =====================
  function connectSupabase(url, key) {
    // تحميل Supabase JS SDK ديناميكياً
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => {
      const { createClient } = supabase;
      const client = createClient(url, key);
      const userId = getUserId();

      const pageName = window.location.pathname.split('/').pop() || 'index';

      supabaseChannel = client.channel(CONFIG.channelName, {
        config: { presence: { key: userId } }
      });

      supabaseChannel
        .on('presence', { event: 'sync' }, () => {
          const state = supabaseChannel.presenceState();
          const count = Object.keys(state).length;
          updateCount(count);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          const state = supabaseChannel.presenceState();
          updateCount(Object.keys(state).length);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          const state = supabaseChannel.presenceState();
          updateCount(Object.keys(state).length);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await supabaseChannel.track({
              user_id: userId,
              page: pageName,
              online_at: new Date().toISOString()
            });
            console.log('[WE-Core] ✅ Connected to Supabase Realtime Presence');
          }
        });

      // تنظيف عند إغلاق الصفحة
      window.addEventListener('beforeunload', () => {
        supabaseChannel.untrack();
      });
    };

    document.head.appendChild(script);
  }

  // =====================
  // 🔄 Fallback (بدون Supabase)
  // تقريبي - يستخدم localStorage + BroadcastChannel
  // =====================
  function startFallbackTracking() {
    const userId = getUserId();
    const STORAGE_KEY = 'we_active_users';
    const TIMEOUT = 15000; // 15 ثانية

    function heartbeat() {
      const now = Date.now();
      let users = {};
      try {
        users = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch (e) {}

      // أضف/حدث نفسك
      users[userId] = now;

      // احذف اللي انقطعوا
      Object.keys(users).forEach(uid => {
        if (now - users[uid] > TIMEOUT) delete users[uid];
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      updateCount(Object.keys(users).length);
    }

    heartbeat();
    setInterval(heartbeat, CONFIG.fallbackInterval);

    // استمع لتغييرات من tabs تانية
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        const users = JSON.parse(e.newValue || '{}');
        const now = Date.now();
        const active = Object.keys(users).filter(uid => now - users[uid] < TIMEOUT);
        updateCount(active.length);
      }
    });

    window.addEventListener('beforeunload', () => {
      let users = {};
      try { users = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) {}
      delete users[userId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    });

    console.log('[WE-Core] ⚡ Running in fallback mode (localStorage)');
  }

  // =====================
  // 🚀 الدالة الرئيسية
  // =====================
  function init(options = {}) {
    const cfg = { ...CONFIG, ...options };

    // أضف الـ CSS
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    // أنشئ الـ Widget
    if (cfg.position === 'corner') {
      createCornerWidget();
    } else if (cfg.position === 'inline') {
      createInlineWidget(cfg.containerId);
    }

    // اختار الطريقة
    const hasSupabase = cfg.supabaseUrl && cfg.supabaseUrl !== 'YOUR_SUPABASE_URL';
    if (hasSupabase) {
      connectSupabase(cfg.supabaseUrl, cfg.supabaseKey);
    } else {
      startFallbackTracking();
    }
  }

  // Auto-init لو في attributes في الـ script tag
  document.addEventListener('DOMContentLoaded', () => {
    const scriptTag = document.querySelector('script[data-we-active-users]');
    if (scriptTag) {
      init({
        supabaseUrl: scriptTag.dataset.supabaseUrl,
        supabaseKey: scriptTag.dataset.supabaseKey,
        position: scriptTag.dataset.position || 'corner',
        containerId: scriptTag.dataset.containerId || 'active-users-widget',
      });
    }
  });

  return { init };

})();
