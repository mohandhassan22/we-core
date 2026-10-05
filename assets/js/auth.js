/**
 * WE-Core Authentication Guard (V16.0.3 - Robust Path Version)
 */

(async function() {
    const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';

    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html') || path.endsWith('.icu/') || path.includes('access_denied.html');
    if (isLoginPage) return;

    // Hide content immediately
    if (document.documentElement) { document.documentElement.style.display = 'none'; }

    function getLoginPath() {
        // Calculate depth to return to root
        const segments = path.split('/').filter(s => s.length > 0);
        // If we are on a domain like we-core.icu/Services/page.html
        // segments will be ["Services", "page.html"]
        // We need to go up (segments.length - 1) times if the last segment is a file
        // Or segments.length times if it's a directory.
        
        let depth = 0;
        if (path.endsWith('/')) {
            depth = segments.length;
        } else {
            depth = segments.length > 0 ? segments.length - 1 : 0;
        }

        // Special case for GitHub Pages or subfolder hosting
        // If the path contains 'we-core', we might need to adjust.
        // But based on the user's URL, it's root domain.
        
        if (depth <= 0) return 'login.html';
        return '../'.repeat(depth) + 'login.html';
    }

    async function redirectToLogin() {
        document.cookie = "sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.replace(getLoginPath());
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    function getAccessDeniedPath() {
        return '/access_denied.html';
    }

    function normalizeRole(rawRole) {
        const role = String(rawRole || '').toLowerCase().trim();
        if (role === 'admin') return 'admin';
        if (role === 'supervisor') return 'supervisor';
        if (role === 'area_manager' || role === 'area-manager') return 'area_manager';
        if (role === 'branch_manager' || role === 'branch-manager' || role === 'manager' || role === 'store-manager') return 'branch_manager';
        return 'agent';
    }

    function isAllowedRoute(role, currentPath) {
        const normalized = normalizeRole(role);
        const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
        if (pageName === 'admin.html') return normalized === 'admin';
        if (!currentPath.includes('/target-manager/')) return true;
        if (pageName === 'index.html' || pageName === '') return true;
        const allowed = {
            agent: ['agent.html', 'performance.html', 'history.html'],
            branch_manager: ['branch-manager.html', 'agent.html', 'performance.html', 'history.html', 'settings.html'],
            area_manager: ['area-manager.html', 'branch-manager.html', 'agent.html', 'history.html'],
            supervisor: ['supervisor.html', 'area-manager.html', 'branch-manager.html', 'agent.html', 'history.html'],
            admin: ['supervisor.html', 'area-manager.html', 'branch-manager.html', 'agent.html', 'performance.html', 'history.html', 'settings.html']
        };
        return (allowed[normalized] || allowed.agent).includes(pageName);
    }

    async function enforceRouteAccess(sb, user) {
        if (!path.includes('/target-manager/') && !path.endsWith('/admin.html')) return true;
        const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).limit(1).maybeSingle();
        const role = profile?.role || user.app_metadata?.role;
        if (!isAllowedRoute(role, path)) {
            window.location.replace(getAccessDeniedPath());
            return false;
        }
        return true;
    }

    const savedToken = getCookie('sb-access-token');
    if (!savedToken) {
        redirectToLogin();
        return;
    }

    try {
        // Load SDK if not present
        if (typeof supabase === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        // Create Client
        const sb = supabase.createClient(SB_URL, SB_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            },
            // send the user's token so RLS lets us read their own profile (role)
            global: { headers: { Authorization: `Bearer ${savedToken}` } }
        });

        // Verify Token
        const { data: { user }, error } = await sb.auth.getUser(savedToken);

        if (user && !error) {
            window._sbClient = sb;
            window._sbUser   = user;

            if (!(await enforceRouteAccess(sb, user))) return;

            // First-login default password: block the page until it is changed
            if (user.app_metadata && user.app_metadata.must_change_password === true) {
                if (!window.ForcePassword) {
                    await new Promise((resolve, reject) => {
                        const s = document.createElement('script');
                        s.src = SCRIPT_SRC.replace(/auth\.js.*$/, 'force-password.js?v=1');
                        s.onload = resolve; s.onerror = reject;
                        document.head.appendChild(s);
                    });
                }
                await window.ForcePassword.ensure(user, savedToken);
            }

            document.documentElement.style.display = '';
            const appDiv = document.getElementById('app');
            if (appDiv) appDiv.style.display = 'block';

            window.dispatchEvent(new CustomEvent('authSuccess', { detail: { token: savedToken } }));
        } else {
            redirectToLogin();
        }
    } catch (error) {
        console.error('Auth system error:', error);
        redirectToLogin();
    }
})();

