(function() {
    const $ = id => document.getElementById(id);
    const showErr = msg => { 
        $('errMsg').textContent = msg; 
        $('errMsg').classList.add('show'); 
    };
    
    const sb = supabase.createClient(
        'https://iygwhapcpdmsasqlfelv.supabase.co',
        'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP',
        { auth: { persistSession: true, autoRefreshToken: true } }
    );

    window.doLogin = async function() {
        const username = $('uname').value.trim();
        const password = $('upass').value;
        if (!username || !password) return showErr('أدخل البيانات كاملة');
        
        const btn = $('loginBtn');
        btn.disabled = true;
        btn.innerHTML = 'جاري التحقق...';

        try {
            // 1+2. تسجيل الدخول عبر الخادم (لا يتم كشف الإيميل للمتصفح)
            const { data: res, error: fnErr } = await sb.functions.invoke('secure-login', {
                body: { username: username, password: password }
            });
            if (fnErr || !res?.session) throw new Error('بيانات الدخول غير صحيحة');
            const { data, error } = await sb.auth.setSession({
                access_token: res.session.access_token,
                refresh_token: res.session.refresh_token
            });
            if (error || !data?.session) throw new Error('بيانات الدخول غير صحيحة');

            // 3. تخزين الـ Cookie للـ Edge Functions (اختياري)
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=86400; SameSite=Lax; Secure`;
            
            // 4. جلب الرتبة (Role) من جدول profiles للتأكد من الصلاحيات
            const user = data.user;
            const { data: profileData, error: profileErr } = await sb
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileErr) {
                console.warn('Error fetching profile role:', profileErr);
            }

            const userRole = profileData?.role || user?.user_metadata?.role || user?.app_metadata?.role;

            // 5. التوجيه بناءً على الرتبة
            if (userRole === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }

        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = 'تسجيل الدخول';
            // إظهار رسالة الخطأ المحددة أو رسالة عامة
            showErr('بيانات الدخول غير صحيحة');
        }
    };
})();
