/**
 * WE-Core Authentication Guard (V9 - Final Fix)
 * This script ensures that the user is logged in before accessing any page.
 * It uses the official Supabase SDK methods to avoid URL encoding issues.
 */

(async function() {
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
    
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path === '/' || path.endsWith('.icu/') || path === '';

    if (isLoginPage) return;

    // 1. Immediate hide
    if (document.documentElement) {
        document.documentElement.style.display = 'none';
    }

    async function redirectToLogin() {
        const depth = (path.match(/\//g) || []).length - 1;
        let rootPath = 'index.html';
        if (depth > 0) {
            rootPath = '../'.repeat(depth) + 'index.html';
        }
        window.location.replace(rootPath);
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

        // Initialize client
        const sb = supabase.createClient(SB_URL, SB_KEY);
        
        // Use SDK query builder instead of fetch to handle special characters correctly
        const { data, error } = await sb
            .from('profiles')
            .select('username')
            .eq('username', savedUser)
            .eq('password', savedPass)
            .maybeSingle();

        if (data && !error) {
            // Success
            document.documentElement.style.display = '';
        } else {
            console.error('Auth check failed');
            sessionStorage.clear();
            redirectToLogin();
        }
    } catch (error) {
        console.error('Auth system error:', error);
        redirectToLogin();
    }
})();
