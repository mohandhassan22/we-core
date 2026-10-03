/**
 * WE Target Manager - API layer
 *
 * - Uses the session the site's assets/js/auth.js already verified (cookie sb-access-token).
 * - Every request carries the USER's JWT, so Postgres RLS decides what is visible/writable.
 * - There are NO demo fallbacks: an error is thrown and shown, never replaced with fake data.
 */
(function (global) {
    var SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    var SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP'; // public (publishable) key - safe in the browser
    var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var ITEMS = ['pt12', 'super_kix', 'tazbeet', 'data', 'adsl', 'fixed', 'we_pay'];

    function ApiError(status, message, code) {
        this.name = 'ApiError';
        this.status = status;
        this.code = code || '';
        this.message = message;
    }
    ApiError.prototype = Object.create(Error.prototype);

    function getToken() {
        var m = document.cookie.match(/(?:^|;\s*)sb-access-token=([^;]*)/);
        return m ? m[1] : null;
    }

    function friendly(status, body) {
        var code = body && (body.code || body.error);
        var msg = body && (body.message || body.error);
        if (status === 401 || /jwt/i.test(String(msg))) return 'انتهت جلسة الدخول، سجّل الدخول مرة أخرى';
        if (status === 403 || code === '42501' || code === 'forbidden') return 'غير مسموح لك بهذه العملية';
        if (code === '23505') return 'هذه البيانات مسجلة بالفعل';
        if (code === '23514' || code === '23502') return 'قيمة غير صالحة';
        if (code === 'invalid_month' || code === 'invalid_year') return 'الشهر غير صالح';
        if (status === 404) return 'غير موجود';
        return msg ? 'تعذر تنفيذ الطلب' : 'تعذر الاتصال بالخادم';
    }

    function loginPath() {
        return window.location.pathname.indexOf('/pages/') !== -1 ? '../../login.html' : '../login.html';
    }

    async function http(url, opts) {
        var token = getToken();
        if (!token) {
            window.location.replace(loginPath());
            throw new ApiError(401, 'لا توجد جلسة دخول', 'no_session');
        }
        var headers = Object.assign({
            'apikey': SB_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }, (opts && opts.headers) || {});

        var res;
        try {
            res = await fetch(url, Object.assign({}, opts, { headers: headers }));
        } catch (e) {
            throw new ApiError(0, 'تعذر الاتصال بالخادم، تحقق من الإنترنت', 'network');
        }
        var text = await res.text();
        var body = null;
        if (text) { try { body = JSON.parse(text); } catch (e) { body = { message: text }; } }

        if (!res.ok) {
            if (res.status === 401) setTimeout(function () { window.location.replace(loginPath()); }, 1800);
            console.warn('API error', res.status, url, body);
            throw new ApiError(res.status, friendly(res.status, body), body && (body.code || body.error));
        }
        return body;
    }

    function rest(path, opts) { return http(SB_URL + '/rest/v1/' + path, opts); }
    function rpc(name, args) { return rest('rpc/' + name, { method: 'POST', body: JSON.stringify(args || {}) }); }
    function edge(name, payload) {
        return http(SB_URL + '/functions/v1/' + name, { method: 'POST', body: JSON.stringify(payload || {}) });
    }
    function idList(ids) {
        ids.forEach(function (i) { if (!UUID.test(i)) throw new ApiError(400, 'معرّف غير صالح', 'invalid_id'); });
        return ids.join(',');
    }

    var TargetAPI = {
        ApiError: ApiError,
        ITEMS: ITEMS,

        /** Who am I + what do I manage. Role comes from the SERVER (app_role), not from user_metadata. */
        getContext: async function (userId) {
            var r = await Promise.all([
                rest('profiles?id=eq.' + userId + '&select=id,full_name,username,role,branch_id,area_id&limit=1'),
                rpc('app_role'),
                rpc('is_admin'),
                rest('areas?select=id,name,manager_id&order=name'),
                rest('branches?select=id,name,code,area_id,manager_id&order=name')
            ]);
            var profile = r[0] && r[0][0];
            if (!profile) throw new ApiError(404, 'لم يتم العثور على ملفك الشخصي في النظام', 'profile_not_found');
            var isAdmin = r[2] === true;
            var areas = r[3] || [], branches = r[4] || [];
            var role = isAdmin ? 'admin' : (r[1] || 'agent');
            var managedAreas = isAdmin ? areas : areas.filter(function (a) { return a.manager_id === userId; });
            var managedBranches = branches.filter(function (b) { return b.manager_id === userId; });
            return {
                userId: userId,
                profile: profile,
                role: role,
                isAdmin: isAdmin,
                areas: areas,
                branches: branches,
                managedAreas: managedAreas,
                managedBranches: managedBranches,
                myBranch: branches.find(function (b) { return b.id === profile.branch_id; }) || null
            };
        },

        /** Aggregated, server-authorised dashboard data: view = me | employee | branch | area */
        dashboard: function (payload) { return edge('get-dashboard-data', payload); },

        /** Existing plans (period + 7 targets) for these employees in a month - used to pre-fill the targets form */
        fetchPlans: async function (userIds, month, year) {
            if (!userIds.length) return [];
            return await rest('target_periods?select=id,user_id,period_type,start_date,end_date,target_days,targets(item,target_value)'
                + '&month=eq.' + Number(month) + '&year=eq.' + Number(year) + '&user_id=in.(' + idList(userIds) + ')') || [];
        },

        /**
         * Manager writes ONE employee's period + 7 targets. Throws on any failure (RLS decides who may).
         * plan: { userId, month, year, period_type, start_date, end_date, target_days, items:{pt12:..} }
         */
        saveTargetPlan: async function (plan) {
            var rows = await rest('target_periods?on_conflict=user_id,month,year', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
                body: JSON.stringify({
                    user_id: plan.userId, month: plan.month, year: plan.year,
                    period_type: plan.period_type, start_date: plan.start_date, end_date: plan.end_date,
                    target_days: plan.target_days, updated_at: new Date().toISOString()
                })
            });
            var period = rows && rows[0];
            if (!period) throw new ApiError(500, 'لم يتم حفظ الفترة', 'no_period');
            await rest('targets?on_conflict=period_id,item', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify(ITEMS.map(function (k) {
                    return { period_id: period.id, item: k, target_value: Math.max(Number(plan.items[k]) || 0, 0) };
                }))
            });
            return period;
        },

        /** Save many plans; never stops at the first failure. Returns {saved:n, failed:[{userId,message}]} */
        saveTargetPlans: async function (plans) {
            var failed = [], saved = 0;
            for (var i = 0; i < plans.length; i++) {
                try { await this.saveTargetPlan(plans[i]); saved++; }
                catch (e) { failed.push({ userId: plans[i].userId, message: e.message }); }
            }
            return { saved: saved, failed: failed };
        },

        /** Employee records ONE day against HIS OWN period (RLS enforces owner + date inside the period) */
        saveDailyPerformance: async function (periodId, userId, date, items, notes) {
            if (!UUID.test(periodId || '')) throw new ApiError(400, 'لا توجد فترة Target لهذا الشهر، اطلب من مدير الفرع تحديدها', 'no_period');
            var body = { period_id: periodId, user_id: userId, performance_date: date, notes: notes || '', updated_at: new Date().toISOString() };
            ITEMS.forEach(function (k) { body[k] = Math.max(Number(items[k]) || 0, 0); });
            await rest('daily_performance?on_conflict=period_id,user_id,performance_date', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify(body)
            });
            return true;
        },

        fetchDailyLogs: async function (periodId, userId) {
            if (!UUID.test(periodId || '') || !UUID.test(userId || '')) return [];
            return await rest('daily_performance?period_id=eq.' + periodId + '&user_id=eq.' + userId
                + '&select=performance_date,pt12,super_kix,tazbeet,data,adsl,fixed,we_pay,notes&order=performance_date.desc') || [];
        },

        /** The user may only change their own display name (column grant + RLS) */
        updateMyName: function (userId, fullName) {
            return rest('profiles?id=eq.' + userId, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({ full_name: String(fullName || '').trim().slice(0, 80) })
            });
        }
    };

    global.TargetAPI = TargetAPI;
})(typeof window !== 'undefined' ? window : this);
