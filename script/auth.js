/**
 * WE-Core Authentication Guard (V4 - SessionStorage Only)
 * This script ensures that the user is logged in before accessing any page.
 * It uses sessionStorage so data is cleared when the tab/browser is closed.
 */

(async function() {
    // 1. Configuration
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
    
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path === '/' || path.endsWith('.icu/') || path === '';

    if (isLoginPage) return;

    // 2. Immediate hide to prevent flash of content
    if (document.documentElement) {
        document.documentElement.style.display = 'none';
    }

    // 3. Check for session in sessionStorage (Clears on tab close)
    const savedUser = sessionStorage.getItem('we_user');
    const savedPass = sessionStorage.getItem('we_pass');

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
        const response = await fetch(`${SB_URL}/rest/v1/we_users?username=eq.${encodeURIComponent(savedUser)}&password=eq.${encodeURIComponent(savedPass)}&select=username`, {
            headers: {
                'apikey': SB_KEY,
                'Authorization': `Bearer ${SB_KEY}`
            }
        });
        
        const data = await response.json();

        if (data && data.length > 0) {
            // Valid session, show the page
            document.documentElement.style.display = '';
        } else {
            // Invalid session
            sessionStorage.removeItem('we_user');
            sessionStorage.removeItem('we_pass');
            redirectToLogin();
        }
    } catch (error) {
        console.error('Auth validation error:', error);
        redirectToLogin();
    }
})();
