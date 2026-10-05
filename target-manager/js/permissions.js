/**
 * WE-Core Target Manager - Permissions & Hierarchy Access Guard
 */

(function (global) {
    const ROLE_CONFIGS = {
        agent: {
            title: 'موظف مبيعات',
            allowedPages: ['agent.html', 'performance.html', 'history.html'],
            defaultPage: 'agent.html',
            menu: [
                { id: 'dashboard', label: 'لوحة الأداء الشخصي', icon: 'fa-chart-pie', href: 'agent.html' },
                { id: 'daily', label: 'الأداء اليومي', icon: 'fa-calendar-check', href: 'performance.html' },
                { id: 'history', label: 'السجل والتقارير', icon: 'fa-clock-rotate-left', href: 'history.html' },
                { id: 'ai', label: 'مدرب الذكاء الاصطناعي', icon: 'fa-wand-magic-sparkles', href: 'agent.html#ai-section' }
            ]
        },
        branch_manager: {
            title: 'مدير فرع',
            allowedPages: ['branch-manager.html', 'agent.html', 'performance.html', 'history.html', 'settings.html'],
            defaultPage: 'branch-manager.html',
            menu: [
                { id: 'dashboard', label: 'لوحة أداء الفرع', icon: 'fa-store', href: 'branch-manager.html' },
                { id: 'branch-perf', label: 'تفاصيل المبيعات', icon: 'fa-chart-line', href: 'branch-manager.html#branch-section' },
                { id: 'employees', label: 'أداء الموظفين', icon: 'fa-users', href: 'branch-manager.html#employees-section' },
                { id: 'daily', label: 'الأداء اليومي', icon: 'fa-calendar-check', href: 'performance.html' },
                { id: 'history', label: 'السجل والتصدير', icon: 'fa-file-excel', href: 'history.html' },
                { id: 'ai', label: 'تحليل الفرع بالذكاء', icon: 'fa-wand-magic-sparkles', href: 'branch-manager.html#ai-section' },
                { id: 'settings', label: 'تارجت الفرع', icon: 'fa-bullseye', href: 'settings.html' }
            ]
        },
        area_manager: {
            title: 'مدير منطقة',
            allowedPages: ['area-manager.html', 'branch-manager.html', 'agent.html', 'history.html'],
            defaultPage: 'area-manager.html',
            menu: [
                { id: 'dashboard', label: 'لوحة أداء المنطقة', icon: 'fa-city', href: 'area-manager.html' },
                { id: 'area-perf', label: 'تحليل الفروع', icon: 'fa-chart-column', href: 'area-manager.html#branches-section' },
                { id: 'branches', label: 'قائمة الفروع', icon: 'fa-network-wired', href: 'area-manager.html#branches-grid' },
                { id: 'employees', label: 'ملخص الموظفين', icon: 'fa-user-group', href: 'area-manager.html#employees-section' },
                { id: 'history', label: 'تقارير المنطقة', icon: 'fa-file-excel', href: 'history.html' },
                { id: 'ai', label: 'تحليل المنطقة بالذكاء', icon: 'fa-robot', href: 'area-manager.html#ai-section' }
            ]
        },
        supervisor: {
            title: 'مشرف مبيعات',
            allowedPages: ['supervisor.html', 'area-manager.html', 'branch-manager.html', 'agent.html', 'history.html'],
            defaultPage: 'supervisor.html',
            menu: [
                { id: 'dashboard', label: 'لوحة المشرف', icon: 'fa-user-tie', href: 'supervisor.html' },
                { id: 'areas', label: 'المناطق المتاحة', icon: 'fa-layer-group', href: 'supervisor.html#areas-section' },
                { id: 'branches', label: 'الفروع التابعة', icon: 'fa-store', href: 'supervisor.html#branches-section' },
                { id: 'employees', label: 'الموظفون', icon: 'fa-users', href: 'supervisor.html#employees-section' },
                { id: 'history', label: 'التقارير والسجل', icon: 'fa-clock-rotate-left', href: 'history.html' },
                { id: 'ai', label: 'مستشار الذكاء الاصطناعي', icon: 'fa-brain', href: 'supervisor.html#ai-section' }
            ]
        },
        admin: {
            title: 'مسؤول النظام (Admin)',
            allowedPages: ['supervisor.html', 'area-manager.html', 'branch-manager.html', 'agent.html', 'performance.html', 'history.html', 'settings.html'],
            defaultPage: 'supervisor.html',
            menu: [
                { id: 'supervisor', label: 'لوحة المشرف العام', icon: 'fa-shield-halved', href: 'supervisor.html' },
                { id: 'area', label: 'لوحة المنطقة', icon: 'fa-city', href: 'area-manager.html' },
                { id: 'branch', label: 'لوحة الفرع', icon: 'fa-store', href: 'branch-manager.html' },
                { id: 'agent', label: 'لوحة الموظف', icon: 'fa-user', href: 'agent.html' },
                { id: 'history', label: 'جميع التقارير', icon: 'fa-file-excel', href: 'history.html' },
                { id: 'settings', label: 'تارجت الفرع', icon: 'fa-bullseye', href: 'settings.html' }
            ]
        }
    };

    const Permissions = {
        normalizeRole: function (rawRole) {
            if (!rawRole) return 'agent';
            const r = String(rawRole).toLowerCase().trim();
            if (r === 'admin') return 'admin';
            if (r === 'supervisor') return 'supervisor';
            if (r === 'area_manager' || r === 'area-manager') return 'area_manager';
            if (r === 'branch_manager' || r === 'branch-manager' || r === 'manager' || r === 'store-manager') return 'branch_manager';
            return 'agent';
        },

        getRoleConfig: function (role) {
            const normRole = this.normalizeRole(role);
            return ROLE_CONFIGS[normRole] || ROLE_CONFIGS.agent;
        },

        /**
         * Renders Sidebar Menu dynamically based on role
         */
        renderSidebar: function (containerId, currentRole, activeTabId = null) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const config = this.getRoleConfig(currentRole);
            const isPagesSubdir = window.location.pathname.includes('/pages/');
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';

            const html = config.menu.map(item => {
                let isActive = '';
                if (activeTabId) {
                    isActive = item.id === activeTabId ? 'active' : '';
                } else {
                    // Detect by page name
                    const itemPage = item.href.split('#')[0].split('/').pop();
                    if (currentPath === itemPage) {
                        isActive = 'active';
                    }
                }

                const href = isPagesSubdir ? item.href : (item.href.startsWith('pages/') ? item.href : `pages/${item.href}`);
                return `
                    <a href="${href}" class="nav-item ${isActive}">
                        <i class="fa-solid ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            }).join('');

            container.innerHTML = html;
        },

        /**
         * Page Authorization Guard
         */
        enforcePageAccess: function (userProfile) {
            if (!userProfile) return;
            const normRole = this.normalizeRole(userProfile.role);
            const config = this.getRoleConfig(normRole);

            const path = window.location.pathname;
            const pageName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

            const accessDenied = () => {
                window.location.replace('/access_denied.html');
            };

            // If on index.html or root, redirect to default page
            if (pageName === 'index.html' || pageName === '') {
                if (path.includes('/pages/')) {
                    window.location.replace(config.defaultPage);
                } else {
                    window.location.replace('pages/' + config.defaultPage);
                }
                return;
            }

            // Auto-redirect: if user lands on a dashboard page that doesn't match their role
            const dashboardPages = ['agent.html', 'branch-manager.html', 'area-manager.html', 'supervisor.html'];
            if (dashboardPages.includes(pageName) && pageName !== config.defaultPage) {
                // not allowed for this role -> access denied page; allowed/admin -> own dashboard
                if (normRole !== 'admin' && !config.allowedPages.includes(pageName)) accessDenied();
                else window.location.replace(config.defaultPage);
                return;
            }

            if (!config.allowedPages.includes(pageName) && normRole !== 'admin') {
                console.warn(`Unauthorized access to ${pageName} for role ${normRole}. Redirecting...`);
                accessDenied();
            }
        },

        /**
         * Verifies strict hierarchical access control for Areas, Branches, and Employees
         */
        canViewTargetData: function (userProfile, targetUser, targetBranch, targetArea) {
            if (!userProfile) return false;
            const normRole = this.normalizeRole(userProfile.role);

            if (normRole === 'admin') return true;

            if (normRole === 'agent') {
                return targetUser && targetUser.id === userProfile.id;
            }

            if (normRole === 'branch_manager') {
                return (targetBranch && userProfile.branch && targetBranch.toLowerCase() === userProfile.branch.toLowerCase()) ||
                       (targetUser && targetUser.branch_id === userProfile.branch_id);
            }

            if (normRole === 'area_manager') {
                return (targetArea && userProfile.area && targetArea.toLowerCase() === userProfile.area.toLowerCase()) ||
                       (targetUser && targetUser.area_id === userProfile.area_id);
            }

            if (normRole === 'supervisor') {
                if (userProfile.area_id && targetUser && targetUser.area_id === userProfile.area_id) return true;
                if (userProfile.area && targetArea && userProfile.area.toLowerCase() === targetArea.toLowerCase()) return true;
                if (targetUser && targetUser.supervisor_id === userProfile.id) return true;
                return true;
            }

            return false;
        }
    };

    global.Permissions = Permissions;
})(typeof window !== 'undefined' ? window : this);
