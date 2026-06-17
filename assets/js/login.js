(function() {
    const $ = id => document.getElementById(id);
    const showErr = msg => { $('errMsg').textContent = msg; $('errMsg').classList.add('show'); };
    
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
            // 1. جلب الإيميل من الـ Edge Function
            const { data: emailData, error: emailErr } = await sb.functions.invoke('hyper-task', {
                body: { action: 'get_email', username: username }
            });

            if (emailErr || !emailData?.email) throw new Error('المستخدم غير موجود');

            // 2. Auth
            const { data, error } = await sb.auth.signInWithPassword({
                email: emailData.email,
                password: password
            });

            if (error) throw error;

            // 3. Cookie للـ Edge Functions (اختياري)
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=86400; SameSite=Lax`;
            
            // 4. التحويل لصفحة Index
            window.location.href = 'index.html';

        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = 'تسجيل الدخول';
            showErr(e.message === 'المستخدم غير موجود' ? e.message : 'بيانات الدخول غير صحيحة');
        }
    };
})();