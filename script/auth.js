/**
 * WE-Core Authentication Guard (V8 - Robust Validation)
 * This script ensures that the user is logged in before accessing any page.
 * It uses Supabase SDK for secure and robust validation of credentials.
 */

(async function() {
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
    
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path === '/' || path.endsWith('.icu/') || path === '';

    if (isLoginPage) return;

    // 1. Immediate hide to prevent flash of content
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

    // 2. Check for session in sessionStorage
    const savedUser = sessionStorage.getItem('we_user');
    const savedPass = sessionStorage.getItem('we_pass');

    if (!savedUser || !savedPass) {
        redirectToLogin();
        return;
    }

    // 3. Validate against Supabase using the official SDK for robustness
    try {
        // Load Supabase SDK dynamically if not already present
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
            .eq('username', savedUser)
            .eq('password', savedPass)
            .maybeSingle();

        if (data && !error) {
            // Valid session, show the page
            document.documentElement.style.display = '';
        } else {
            // Invalid session or error
            console.error('Auth validation failed:', error);
            sessionStorage.removeItem('we_user');
            sessionStorage.removeItem('we_pass');
            redirectToLogin();
        }
    } catch (error) {
        console.error('Critical Auth Error:', error);
        redirectToLogin();
    }
})();
