/**
 * WE Target Manager - bootstrap
 * Auth is owned by the site (assets/js/auth.js). We only wait for it and read the verified user.
 */
(function (global) {
    var App = {
        ctx: null,

        init: function () {
            Utils.applyTheme();
            this.bindEvents();
            if (global._sbUser) this.onAuthReady(global._sbUser);
            else global.addEventListener('authSuccess', function () { if (global._sbUser) App.onAuthReady(global._sbUser); });
        },

        onAuthReady: async function (user) {
            if (this._started) return;
            this._started = true;
            try {
                this.ctx = await TargetAPI.getContext(user.id);
            } catch (err) {
                this.showFatal(err.message || 'تعذر تحميل بياناتك');
                return;
            }
            var ctx = this.ctx;
            if (Permissions.enforcePageAccess(ctx.role)) return; // redirecting

            Permissions.renderSidebar('sidebarNav', ctx.role);
            this.updateHeader(ctx);

            var page = document.body.getAttribute('data-page');
            try {
                if (page === 'agent' || page === 'branch' || page === 'area') {
                    await Dashboard.init(ctx, page);
                } else if (global.PageModules && global.PageModules[page]) {
                    await global.PageModules[page](ctx);
                }
            } catch (err) {
                console.error('Page init failed', err);
                this.showFatal(err.message || 'حدث خطأ غير متوقع');
            }
        },

        showFatal: function (message) {
            var host = document.getElementById('mainDashboardContent') || document.querySelector('.dashboard-content');
            if (!host) return;
            host.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem;color:var(--status-danger);"></i>'
                + '<h2>' + Utils.esc(message) + '</h2>'
                + '<button class="btn btn-primary" onclick="window.location.reload()"><i class="fa-solid fa-rotate"></i> إعادة المحاولة</button></div>';
        },

        updateHeader: function (ctx) {
            var cfg = Permissions.getRoleConfig(ctx.role);
            var name = ctx.profile.full_name || ctx.profile.username || 'زميلنا';
            var set = function (id, text) { var el = document.getElementById(id); if (el) el.textContent = text; };
            set('headerUserName', name);
            set('headerUserRole', cfg.title);
            set('headerUserAvatar', name.substring(0, 2).toUpperCase());
            var sub = document.querySelector('.sidebar-sub');
            if (sub) sub.textContent = cfg.title;
            document.title = cfg.title + ' | WE Target Manager';
        },

        bindEvents: function () {
            var dark = document.getElementById('darkToggleBtn');
            if (dark) dark.addEventListener('click', function () {
                Utils.setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
            });
            var sb = document.querySelector('.sidebar'), ov = document.querySelector('.sidebar-overlay');
            var menu = document.getElementById('mobileMenuBtn');
            if (menu) menu.addEventListener('click', function () { sb && sb.classList.toggle('open'); ov && ov.classList.toggle('show'); });
            if (ov) ov.addEventListener('click', function () { sb && sb.classList.remove('open'); ov.classList.remove('show'); });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(function (m) { m.classList.remove('active'); });
            });
        }
    };

    global.App = App;
    document.addEventListener('DOMContentLoaded', function () { App.init(); });
})(typeof window !== 'undefined' ? window : this);
