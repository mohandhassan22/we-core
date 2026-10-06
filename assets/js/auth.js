/**
 * WE-Core session helper. Tokens live in HttpOnly cookies; JS only ever holds a short-lived
 * access token in memory, fetched from /api/session.
 */
(function () {
    if (window.WEAuth) return;
    let cached = null, exp = 0, inflight = null;
    const HDR = { 'X-Requested-With': 'WE' };

    function jwtExp(t) {
        try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch (_) { return 0; }
    }
    async function fetchSession(force) {
        const r = await fetch('/api/session' + (force ? '?force=1' : ''), { credentials: 'same-origin', headers: HDR, cache: 'no-store' });
        if (!r.ok) return null;
        const d = await r.json();
        cached = d.access_token; exp = jwtExp(cached);
        window._sbUserFromSession = d.user;
        return d;
    }
    window.WEAuth = {
        // Resolves to an access token string, or null if not signed in.
        async getToken(force) {
            if (!force && cached && Date.now() < exp - 60000) return cached;
            if (!inflight) inflight = fetchSession(!!force).finally(() => { inflight = null; });
            const d = await inflight;
            return d ? d.access_token : null;
        },
        async logout() {
            cached = null; exp = 0;
            try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin', headers: HDR }); } catch (_) {}
        },
    };
})();

/**
 * WE-Core Authentication Guard (V16.0.3 - Robust Path Version)
 */

(async function() {
    const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';

    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html') || path.endsWith('.icu/');
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
        await window.WEAuth.logout();
        window.location.replace(getLoginPath());
    }

    const savedToken = await window.WEAuth.getToken();
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
            }
        });

        // Verify Token
        const { data: { user }, error } = await sb.auth.getUser(savedToken);

        if (user && !error) {
            window._sbClient = sb;
            window._sbUser   = user;

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


