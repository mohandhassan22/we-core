/**
 * WE-Core Authentication Guard (V15 - Cookie Based)
 * This script ensures that the user is logged in before accessing any page.
 * It uses Supabase's official session management and stores tokens in cookies.
 */

(function() {
    // 1. وظائف مساعدة للكوكيز
    const setCookie = (name, value, days) => {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
    };

    const getCookie = (name) => {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };

    const eraseCookie = (name) => {
        document.cookie = name + '=; Max-Age=-99999999; path=/;';
    };

    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
    
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path === '/' || path.endsWith('.icu/') || path === '';

    if (isLoginPage) return;

    // 2. Immediate hide
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

    async function checkAuth() {
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
            
            // Check session
            const { data: { session }, error } = await sb.auth.getSession();

            if (session && !error) {
                // Success - user is authenticated
                // تخزين الـ Token في الكوكيز لاستخدامه في طلبات الـ API
                setCookie('sb-access-token', session.access_token, 7);
                document.documentElement.style.display = '';
            } else {
                // Authentication failed
                console.error('Auth check failed:', error?.message || 'No active session');
                redirectToLogin();
            }
        } catch (error) {
            console.error('Auth system error:', error);
            redirectToLogin();
        }
    }

    // تشغيل التحقق
    checkAuth();

    // تصدير الوظائف للاستخدام في الصفحات
    window.AuthSystem = { setCookie, getCookie, eraseCookie };
})();
