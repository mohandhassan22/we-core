/**
 * WE Target Manager - menus & page routing
 *
 * IMPORTANT: this file only decides what to SHOW. It never grants access to data.
 * Data access is enforced by Supabase RLS and the get-dashboard-data Edge Function,
 * so editing this file in DevTools reveals nothing the server would not already return.
 *
 * Roles: agent (employee) | branch_manager (Store Manager) | area_manager | admin
 * (There is no role above area manager in this system.)
 */
(function (global) {
    var ROLE_CONFIGS = {
        agent: {
            title: 'موظف مبيعات',
            defaultPage: 'agent.html',
            allowedPages: ['agent.html', 'performance.html', 'history.html', 'settings.html'],
            menu: [
                { id: 'dashboard', label: 'لوحة الأداء', icon: 'fa-chart-pie', href: 'agent.html' },
                { id: 'target', label: 'الهدف والمنتجات', icon: 'fa-bullseye', href: 'agent.html#items-section' },
                { id: 'daily', label: 'الأداء اليومي', icon: 'fa-calendar-check', href: 'performance.html' },
                { id: 'history', label: 'السجل والتقارير', icon: 'fa-clock-rotate-left', href: 'history.html' },
                { id: 'ai', label: 'مدرب الذكاء الاصطناعي', icon: 'fa-wand-magic-sparkles', href: 'agent.html#ai-section' },
                { id: 'settings', label: 'الإعدادات', icon: 'fa-gear', href: 'settings.html' }
            ]
        },
        branch_manager: {
            title: 'مدير فرع',
            defaultPage: 'branch-manager.html',
            allowedPages: ['branch-manager.html', 'agent.html', 'history.html', 'settings.html'],
            menu: [
                { id: 'dashboard', label: 'لوحة أداء الفرع', icon: 'fa-store', href: 'branch-manager.html' },
                { id: 'employees', label: 'الموظفون', icon: 'fa-users', href: 'branch-manager.html#employees-section' },
                { id: 'daily', label: 'الأداء اليومي', icon: 'fa-calendar-check', href: 'branch-manager.html#daily-section' },
                { id: 'history', label: 'السجل والتصدير', icon: 'fa-file-excel', href: 'history.html' },
                { id: 'ai', label: 'تحليل الفرع', icon: 'fa-wand-magic-sparkles', href: 'branch-manager.html#ai-section' },
                { id: 'settings', label: 'الإعدادات', icon: 'fa-gear', href: 'settings.html' }
            ]
        },
        area_manager: {
            title: 'مدير منطقة',
            defaultPage: 'area-manager.html',
            allowedPages: ['area-manager.html', 'branch-manager.html', 'agent.html', 'history.html', 'settings.html'],
            menu: [
                { id: 'dashboard', label: 'لوحة أداء المنطقة', icon: 'fa-city', href: 'area-manager.html' },
                { id: 'branches', label: 'الفروع والموظفون', icon: 'fa-network-wired', href: 'area-manager.html#branches-section' },
                { id: 'daily', label: 'الأداء اليومي', icon: 'fa-calendar-check', href: 'area-manager.html#daily-section' },
                { id: 'history', label: 'تقارير المنطقة', icon: 'fa-file-excel', href: 'history.html' },
                { id: 'ai', label: 'تحليل المنطقة', icon: 'fa-wand-magic-sparkles', href: 'area-manager.html#ai-section' },
                { id: 'settings', label: 'الإعدادات', icon: 'fa-gear', href: 'settings.html' }
            ]
        },
        admin: {
            title: 'مسؤول النظام',
            defaultPage: 'area-manager.html',
            allowedPages: ['area-manager.html', 'branch-manager.html', 'agent.html', 'performance.html', 'history.html', 'settings.html'],
            menu: [
                { id: 'dashboard', label: 'لوحة المنطقة', icon: 'fa-city', href: 'area-manager.html' },
                { id: 'branches', label: 'الفروع والموظفون', icon: 'fa-network-wired', href: 'area-manager.html#branches-section' },
                { id: 'history', label: 'جميع التقارير', icon: 'fa-file-excel', href: 'history.html' },
                { id: 'settings', label: 'الإعدادات', icon: 'fa-gear', href: 'settings.html' }
            ]
        }
    };

    function currentPageName() {
        var p = window.location.pathname;
        return p.substring(p.lastIndexOf('/') + 1) || 'index.html';
    }

    var Permissions = {
        ROLE_CONFIGS: ROLE_CONFIGS,

        /** Maps the server's app_role() value to a UI role. 'other'/unknown -> agent (own data only). */
        normalizeRole: function (role) {
            return ROLE_CONFIGS[role] ? role : 'agent';
        },
        getRoleConfig: function (role) { return ROLE_CONFIGS[this.normalizeRole(role)]; },
        isManager: function (role) { return role === 'branch_manager' || role === 'area_manager' || role === 'admin'; },

        pageHref: function (page) {
            var inPages = window.location.pathname.indexOf('/pages/') !== -1;
            return (inPages ? '' : 'pages/') + page;
        },

        renderSidebar: function (containerId, role) {
            var el = document.getElementById(containerId);
            if (!el) return;
            var cfg = this.getRoleConfig(role);
            var current = currentPageName();
            var hash = window.location.hash;
            el.innerHTML = cfg.menu.map(function (item) {
                var page = item.href.split('#')[0];
                var itemHash = item.href.indexOf('#') !== -1 ? '#' + item.href.split('#')[1] : '';
                var active = page === current && (itemHash ? itemHash === hash : !hash) ? 'active' : '';
                return '<a href="' + Permissions.pageHref(item.href) + '" class="nav-item ' + active + '">'
                    + '<i class="fa-solid ' + Utils.esc(item.icon) + '"></i><span>' + Utils.esc(item.label) + '</span></a>';
            }).join('');
        },

        /** Sends the user to the right landing page. Returns true when a redirect was triggered. */
        enforcePageAccess: function (role) {
            var cfg = this.getRoleConfig(role);
            var page = currentPageName();
            var inPages = window.location.pathname.indexOf('/pages/') !== -1;
            var go = function (p) { window.location.replace((inPages ? '' : 'pages/') + p); return true; };

            if (page === 'index.html' || page === '') return go(cfg.defaultPage);
            if (cfg.allowedPages.indexOf(page) === -1) return go(cfg.defaultPage);
            // A manager opening agent.html without ?emp= has no personal dashboard to show
            return false;
        }
    };

    global.Permissions = Permissions;
})(typeof window !== 'undefined' ? window : this);
