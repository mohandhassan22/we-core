/**
 * WE-Core Authentication Guard (V16.0.3 - Robust Path Version)
 */

(async function() {
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
        document.cookie = "sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.replace(getLoginPath());
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
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
            }
        });

        // Verify Token
        const { data: { user }, error } = await sb.auth.getUser(savedToken);

        if (user && !error) {
            window._sbClient = sb;
            window._sbUser   = user;

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

