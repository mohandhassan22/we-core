(function() {
    const $ = id => document.getElementById(id);
    const showErr = msg => { 
        $('errMsg').textContent = msg; 
        $('errMsg').classList.add('show'); 
    };
    
    const sb = supabase.createClient(
        'https://iygwhapcpdmsasqlfelv.supabase.co',
        'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP',
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    window.doLogin = async function() {
        const username = $('uname').value.trim();
        const password = $('upass').value;
        if (!username || !password) return showErr('أدخل البيانات كاملة');
        
        const btn = $('loginBtn');
        btn.disabled = true;
        btn.innerHTML = 'جاري التحقق...';

        try {
            // 1+2+3. تسجيل الدخول عبر السيرفر: الكوكيز HttpOnly بيحطها /api/login (مفيش توكن بيتخزن في المتصفح)
            const lr = await fetch('/api/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'WE' },
                body: JSON.stringify({ username: username, password: password })
            });
            if (!lr.ok) throw new Error('بيانات الدخول غير صحيحة');
            const sr = await fetch('/api/session', { credentials: 'same-origin', headers: { 'X-Requested-With': 'WE' }, cache: 'no-store' });
            if (!sr.ok) throw new Error('بيانات الدخول غير صحيحة');
            const sess = await sr.json();
            const user = sess.user;
            const sbAuthed = supabase.createClient(
                'https://iygwhapcpdmsasqlfelv.supabase.co',
                'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP',
                { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
                  global: { headers: { Authorization: 'Bearer ' + sess.access_token } } }
            );

            // 4. جلب الرتبة (Role) من جدول profiles للتأكد من الصلاحيات
            const { data: profileData, error: profileErr } = await sbAuthed
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
