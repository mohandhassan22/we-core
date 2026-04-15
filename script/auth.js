/**
 * WE-Core Authentication Guard (V3 - Supabase Real-time Validation)
 * This script ensures that the user is logged in before accessing any page.
 * It validates the session against Supabase.
 */

(async function() {
    // 1. Configuration
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
    
    const path = window.location.pathname;
    const isLoginPage = path.endswith('index.html') || path === '/' || path.endsWith('.icu/') || path === '';

    if (isLoginPage) return;

    // 2. Immediate hide to prevent flash of content
    if (document.documentElement) {
        document.documentElement.style.display = 'none';
    }

    // 3. Check for saved credentials
    const savedUser = localStorage.getItem('we_user');
    const savedPass = localStorage.getItem('we_pass'); // We need to store password or a session token

    async function redirectToLogin() {
        const depth = (path.match(/\//g) || []).length - 1;
        let rootPath = 'index.html';
        if (depth > 0) {
            rootPath = '../'.repeat(depth) + 'index.html';
        }
        window.location.replace(rootPath);
    }

    if (!savedUser || !savedPass) {
        redirectToLogin();
        return;
    }

    // 4. Validate against Supabase
    try {
        // We use a simple fetch to avoid loading the whole Supabase SDK here for speed
        // Or we can assume Supabase is loaded if it's in the page, but auth.js is at the top.
        // Let's use a direct REST API call to Supabase to check if user/pass is valid.
        const response = await fetch(`${SB_URL}/rest/v1/we_users?username=eq.${encodeURIComponent(savedUser)}&password=eq.${encodeURIComponent(savedPass)}&select=username`, {
            headers: {
                'apikey': SB_KEY,
                'Authorization': `Bearer ${SB_KEY}`
            }
        });
        
        const data = await response.json();

        if (data && data.length > 0) {
            // Valid user, show the page
            document.documentElement.style.display = '';
        } else {
            // Invalid session
            localStorage.removeItem('we_user');
            localStorage.removeItem('we_pass');
            redirectToLogin();
        }
    } catch (error) {
        console.error('Auth validation error:', error);
        // In case of network error, we might want to allow or block. 
        // Blocking is safer.
        redirectToLogin();
    }
})();
