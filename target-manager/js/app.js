/**
 * WE-Core Target Manager - Main Application Controller
 */

(function (global) {
    document.addEventListener('DOMContentLoaded', function () {
        App.init();
    });

    const App = {
        userProfile: null,

        init: function () {
            this.initDarkMode();
            this.initAuthListener();
            this.bindEvents();
        },

        initDarkMode: function () {
            const savedDark = localStorage.getItem('wc-dark') || localStorage.getItem('darkMode');
            if (savedDark === 'true') {
                document.body.classList.add('dark');
            }
        },

        toggleDarkMode: function () {
            const isDark = document.body.classList.toggle('dark');
            localStorage.setItem('wc-dark', isDark);
            const icon = document.getElementById('darkToggleIcon');
            if (icon) {
                icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
        },

        initAuthListener: function () {
            // Check if already authenticated by auth.js
            if (window._sbUser) {
                this.onAuthReady(window._sbUser);
            } else {
                window.addEventListener('authSuccess', () => {
                    if (window._sbUser) this.onAuthReady(window._sbUser);
                });
            }
        },

        onAuthReady: async function (user) {
            try {
                // Fetch profile
                const profile = await TargetAPI.fetchUserProfile(user.id);
                this.userProfile = profile || {
                    id: user.id,
                    full_name: user.user_metadata?.username || user.email.split('@')[0],
                    role: 'agent',
                    branch: 'الفرع الرئيسي',
                    area: 'القاهرة'
                };

                // Check page access permission
                Permissions.enforcePageAccess(this.userProfile);

                // Render Sidebar menu
                const normRole = Permissions.normalizeRole(this.userProfile.role);
                Permissions.renderSidebar('sidebarNav', normRole);

                // Update Header Display
                this.updateHeaderUI();

                // Initialize Dashboard Renderer
                if (typeof Dashboard !== 'undefined') {
                    await Dashboard.init(this.userProfile);
                }
            } catch (err) {
                console.error('App init failed:', err);
            }
        },

        updateHeaderUI: function () {
            const prof = this.userProfile;
            if (!prof) return;

            const nameEl = document.getElementById('headerUserName');
            if (nameEl) nameEl.textContent = prof.full_name || 'زميلنا';

            const config = Permissions.getRoleConfig(prof.role);

            const roleEl = document.getElementById('headerUserRole');
            if (roleEl) {
                roleEl.textContent = config.title;
            }

            // Update document title dynamically
            document.title = `${config.title} | WE Target Manager`;

            // Update sidebar sub-title
            const sidebarSub = document.querySelector('.sidebar-sub');
            if (sidebarSub) {
                sidebarSub.textContent = `لوحة ${config.title}`;
            }

            const avatarEl = document.getElementById('headerUserAvatar');
            if (avatarEl) {
                const initials = (prof.full_name || 'WE').substring(0, 2).toUpperCase();
                avatarEl.textContent = initials;
            }
        },

        bindEvents: function () {
            const darkBtn = document.getElementById('darkToggleBtn');
            if (darkBtn) darkBtn.addEventListener('click', () => this.toggleDarkMode());

            const mobileBtn = document.getElementById('mobileMenuBtn');
            if (mobileBtn) {
                mobileBtn.addEventListener('click', () => {
                    const sb = document.querySelector('.sidebar');
                    const overlay = document.querySelector('.sidebar-overlay');
                    if (sb) sb.classList.toggle('open');
                    if (overlay) overlay.classList.toggle('show');
                });
            }

            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    const sb = document.querySelector('.sidebar');
                    if (sb) sb.classList.remove('open');
                    overlay.classList.remove('show');
                });
            }
        }
    };

    global.App = App;
})(typeof window !== 'undefined' ? window : this);
