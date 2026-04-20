/**
 * WE-Core Authentication Guard (V14 - Edge Functions)
 * This script ensures that the user is logged in before accessing any page.
 */

(async function() {
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
    
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html') || path.endsWith('.icu/');

    if (isLoginPage) return;

    // 1. Immediate hide
    if (document.documentElement) {
        document.documentElement.style.display = 'none';
    }

    async function redirectToLogin() {
        window.location.replace('login.html');
    }

    const savedUser = sessionStorage.getItem('we_user');

    if (!savedUser) {
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

        // Initialize client
        const sb = supabase.createClient(SB_URL, SB_KEY);
        
        // Check if user has an active session
        const { data: { session }, error: sessionError } = await sb.auth.getSession();
        
        if (session && !sessionError) {
            // User has a valid session
            document.documentElement.style.display = '';
        } else {
            // No valid session
            console.log('No active session found');
            redirectToLogin();
        }
    } catch (error) {
        console.error('Auth system error:', error);
        redirectToLogin();
    }
})();
