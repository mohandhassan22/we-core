/**
 * WE-Core Authentication Guard (V15 - Cookies Only Version)
 */
(async function() {
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('login.html');
    if (isLoginPage) return;
    
    if (document.documentElement) { document.documentElement.style.display = 'none'; }
    
    function getLoginPath() {
        if (path.includes('/info/') || path.includes('/offers/') || path.includes('/Corces/')) { return '../login.html'; }
        return 'login.html';
    }
    
    async function redirectToLogin() { 
        // مسح الكوكيز عند التوجيه لتسجيل الدخول
        document.cookie = "sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.replace(getLoginPath()); 
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // الاعتماد على الكوكيز فقط
    const savedToken = getCookie('sb-access-token');

    if (!savedToken) {
        redirectToLogin();
        return;
    }

    try {
        if (typeof supabase === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // إنشاء العميل بدون تخزين محلي
        const sb = supabase.createClient(SB_URL, SB_KEY, { 
            auth: { 
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            } 
        });
        
        // التحقق من التوكن المستخرج من الكوكيز
        const { data: { user }, error } = await sb.auth.getUser(savedToken);

        if (user && !error) {
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
