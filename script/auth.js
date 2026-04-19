/**
 * WE-Core Authentication Guard (V11 - Separate Login Page)
 * This script ensures that the user is logged in before accessing any page.
 */

(async function() {
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
    
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('login.html');

    if (isLoginPage) return;

    // 1. Immediate hide to prevent flash
    if (document.documentElement) {
        document.documentElement.style.display = 'none';
    }

    function getLoginPath() {
        const depth = (path.split('/').length - (path.endsWith('/') ? 2 : 1)) - (window.location.hostname.includes('github.io') ? 1 : 0);
        // Fallback simple check
        if (path.includes('/info/') || path.includes('/offers/') || path.includes('/Corces/')) {
            return '../login.html';
        }
        return 'login.html';
    }

    async function redirectToLogin() {
        window.location.replace(getLoginPath());
    }

    const savedUser = sessionStorage.getItem('we_user');
    const savedPass = sessionStorage.getItem('we_pass');

    if (!savedUser || !savedPass) {
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

        const sb = supabase.createClient(SB_URL, SB_KEY);
        
        const { data, error } = await sb
            .from('profiles')
            .select('username')
            .match({ username: savedUser, password: savedPass })
            .maybeSingle();

        if (data && !error) {
            // Success: show page and ensure app div is visible if it exists
            document.documentElement.style.display = '';
            const appDiv = document.getElementById('app');
            if (appDiv) appDiv.style.display = 'block';
        } else {
            sessionStorage.clear();
            redirectToLogin();
        }
    } catch (error) {
        console.error('Auth system error:', error);
        redirectToLogin();
    }
})();
