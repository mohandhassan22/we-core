/**
 * WE-Core: force first-login password change (blocking widget)
 * Usage: await ForcePassword.ensure(user, accessToken)  -> resolves once the password was changed (or not required)
 */
(function (global) {
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';

    function required(user) {
        return !!(user && user.app_metadata && user.app_metadata.must_change_password === true);
    }

    function build() {
        const ov = document.createElement('div');
        ov.id = 'forcePwOverlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(20,10,30,.78);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Cairo,Tahoma,sans-serif;direction:rtl;';
        ov.innerHTML = `
        <form id="forcePwForm" style="background:#fff;color:#222;width:100%;max-width:420px;border-radius:18px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35);">
            <div style="font-size:34px;text-align:center">🔐</div>
            <h2 style="margin:6px 0 4px;text-align:center;font-size:20px;font-weight:800;">لازم تغيّر الباسورد</h2>
            <p style="margin:0 0 16px;text-align:center;color:#666;font-size:14px;line-height:1.7">ده أول دخول ليك بالباسورد الافتراضي. اكتب الباسورد القديم واختار باسورد جديد عشان تكمل.</p>
            <label style="font-size:13px;font-weight:700">الباسورد القديم (الافتراضي)</label>
            <input id="fpOld" type="password" autocomplete="current-password" required style="width:100%;box-sizing:border-box;margin:4px 0 12px;padding:11px;border:1px solid #ccc;border-radius:10px;font-size:15px;">
            <label style="font-size:13px;font-weight:700">الباسورد الجديد (8 أحرف على الأقل)</label>
            <input id="fpNew" type="password" autocomplete="new-password" minlength="8" required style="width:100%;box-sizing:border-box;margin:4px 0 12px;padding:11px;border:1px solid #ccc;border-radius:10px;font-size:15px;">
            <label style="font-size:13px;font-weight:700">تأكيد الباسورد الجديد</label>
            <input id="fpNew2" type="password" autocomplete="new-password" minlength="8" required style="width:100%;box-sizing:border-box;margin:4px 0 12px;padding:11px;border:1px solid #ccc;border-radius:10px;font-size:15px;">
            <div id="fpMsg" style="min-height:20px;color:#c0392b;font-size:13px;margin-bottom:8px;"></div>
            <button id="fpBtn" type="submit" style="width:100%;padding:12px;border:0;border-radius:10px;background:#591685;color:#fff;font-size:16px;font-weight:800;cursor:pointer;">حفظ الباسورد الجديد</button>
        </form>`;
        document.body.appendChild(ov);
        return ov;
    }

    async function loadSdk() {
        if (typeof supabase !== 'undefined') return;
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function ensure(user, accessToken) {
        if (!required(user)) return Promise.resolve();
        document.documentElement.style.display = '';
        return new Promise((resolve) => {
            const ov = build();
            const $ = (id) => document.getElementById(id);
            $('forcePwForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const oldPw = $('fpOld').value, newPw = $('fpNew').value, newPw2 = $('fpNew2').value;
                const msg = (t) => { $('fpMsg').textContent = t; };
                if (newPw.length < 8) return msg('الباسورد الجديد لازم يكون 8 أحرف على الأقل');
                if (newPw !== newPw2) return msg('تأكيد الباسورد مش مطابق');
                if (newPw === oldPw) return msg('الباسورد الجديد لازم يكون مختلف عن القديم');
                const btn = $('fpBtn'); btn.disabled = true; btn.textContent = 'جاري الحفظ...'; msg('');
                try {
                    const res = await fetch(`${SB_URL}/functions/v1/change-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${accessToken}` },
                        body: JSON.stringify({ old_password: oldPw, new_password: newPw })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || 'تعذر تغيير الباسورد');

                    // refresh the server-side session so the HttpOnly cookies carry the updated claims
                    try { if (window.WEAuth) await window.WEAuth.getToken(true); } catch (_) { /* user can log in again */ }

                    ov.remove();
                    if (user.app_metadata) user.app_metadata.must_change_password = false;
                    resolve();
                } catch (err) {
                    msg(err.message || 'حصل خطأ');
                    btn.disabled = false; btn.textContent = 'حفظ الباسورد الجديد';
                }
            });
        });
    }

    global.ForcePassword = { ensure, required };
})(window);
