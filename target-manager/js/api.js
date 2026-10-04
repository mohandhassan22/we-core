/**
 * WE-Core Target Manager - API & Supabase Data Access Layer
 */

(function (global) {
    const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
    const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';

    function getCookieToken() {
        const v = `; ${document.cookie}`;
        const p = v.split(`; sb-access-token=`);
        if (p.length === 2) return p.pop().split(';').shift();
        return null;
    }

    async function restFetch(endpoint, options = {}) {
        const token = getCookieToken();
        const headers = {
            'apikey': SB_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        };

        const res = await fetch(`${SB_URL}/rest/v1/${endpoint}`, {
            ...options,
            headers
        });

        if (!res.ok) {
            const errText = await res.text();
            console.warn(`Supabase REST note (${endpoint}):`, res.status, errText);
            throw new Error(`API Request Failed: ${res.statusText}`);
        }

        if (options.method === 'DELETE' || res.status === 204) return true;
        return await res.json();
    }

    const TargetAPI = {
        /**
         * Fetches current user profile from profiles table with graceful fallback
         */
        fetchUserProfile: async function (userId) {
            const user = window._sbUser;
            const defaultProfile = {
                id: userId || 'demo-user',
                full_name: user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مهند حسن',
                role: user?.app_metadata?.role || user?.user_metadata?.role || 'admin',
                branch: 'فرع العباسية',
                area: 'منطقة القاهرة الكبرى'
            };

            try {
                // Use the user's access-token cookie directly (the shared supabase-js client has no session => 401)
                const rows = await restFetch(`profiles?id=eq.${userId}&select=*&limit=1`);
                if (rows && rows[0]) {
                    return { ...defaultProfile, ...rows[0] };
                }
                return defaultProfile;
            } catch (err) {
                console.warn('Profile load using safe session fallback:', defaultProfile);
                return defaultProfile;
            }
        },

        /**
         * Fetches relational Areas allowed for current user
         */
        fetchAllowedAreas: async function () {
            try {
                return await restFetch('areas?select=*,branches(*)&order=name.asc');
            } catch (err) {
                return [
                    { id: 'area-1', name: 'منطقة القاهرة الكبرى' },
                    { id: 'area-2', name: 'منطقة الجيزة' },
                    { id: 'area-3', name: 'منطقة الإسكندرية والقناة' }
                ];
            }
        },

        /**
         * Fetches relational Branches for a specific area or for current user scope
         */
        fetchAllowedBranches: async function (areaId = null) {
            try {
                let query = 'branches?select=*,areas(name)&order=name.asc';
                if (areaId) query += `&area_id=eq.${areaId}`;
                return await restFetch(query);
            } catch (err) {
                return [
                    { id: 'b-1', name: 'فرع العباسية', area: 'منطقة القاهرة الكبرى' },
                    { id: 'b-2', name: 'فرع مدينة نصر', area: 'منطقة القاهرة الكبرى' },
                    { id: 'b-3', name: 'فرع مصر الجديدة', area: 'منطقة القاهرة الكبرى' },
                    { id: 'b-4', name: 'فرع الدقي', area: 'منطقة الجيزة' }
                ];
            }
        },

        /**
         * Fetches active target period for given user or scope
         */
        fetchTargetPeriod: async function (month, year, userId = null, branch = null, area = null) {
            let query = `target_periods?month=eq.${month}&year=eq.${year}&select=*,targets(*)`;
            if (userId) query += `&user_id=eq.${userId}`;
            else if (branch) query += `&branch=eq.${encodeURIComponent(branch)}`;
            else if (area) query += `&area=eq.${encodeURIComponent(area)}`;
            query += '&limit=1';

            try {
                const rows = await restFetch(query);
                return (rows && rows[0]) ? rows[0] : null;
            } catch (err) {
                return null;
            }
        },

        /**
         * Fetches subordinates (employees or branches) based on user role and relations
         */
        fetchSubordinates: async function (role, branch = null, area = null, supervisorId = null) {
            try {
                let query = 'profiles?select=id,full_name,role,branch,area,area_id,branch_id';
                if (role === 'branch_manager' && branch) {
                    query += `&branch=eq.${encodeURIComponent(branch)}&role=eq.agent`;
                } else if (role === 'area_manager' && area) {
                    query += `&area=eq.${encodeURIComponent(area)}`;
                } else if (role === 'supervisor') {
                    if (supervisorId) query += `&supervisor_id=eq.${supervisorId}`;
                    else if (area) query += `&area=eq.${encodeURIComponent(area)}`;
                } else if (role === 'admin') {
                    query += `&limit=100`;
                }
                return await restFetch(query);
            } catch (err) {
                return [];
            }
        },

        /**
         * Fetches all target periods and performance for a team (branch or area)
         */
        fetchTeamData: async function (month, year, branch = null, area = null) {
            let periodQuery = `target_periods?month=eq.${month}&year=eq.${year}&select=*,targets(*),profiles(full_name,role)`;
            if (branch) periodQuery += `&branch=eq.${encodeURIComponent(branch)}`;
            else if (area) periodQuery += `&area=eq.${encodeURIComponent(area)}`;
            
            try {
                const periods = await restFetch(periodQuery);
                if (!periods || periods.length === 0) return { periods: [], logs: [] };
                
                const periodIds = periods.map(p => p.id).join(',');
                const logsQuery = `daily_performance?period_id=in.(${periodIds})&select=*`;
                const logs = await restFetch(logsQuery);
                
                return { periods, logs: logs || [] };
            } catch (err) {
                console.error('Failed to fetch team data:', err);
                return { periods: [], logs: [] };
            }
        },
        /**
         * Fetches daily performance logs for target period and user(s)
         */
        fetchDailyPerformance: async function (periodId, userId = null) {
            if (!periodId) return [];
            let query = `daily_performance?period_id=eq.${periodId}&select=*&order=performance_date.asc`;
            if (userId) query += `&user_id=eq.${userId}`;

            try {
                return await restFetch(query);
            } catch (err) {
                return [];
            }
        },

        /**
         * Upserts daily performance record
         */
        saveDailyPerformance: async function (periodId, userId, date, itemsData, notes = '') {
            const body = {
                period_id: periodId,
                user_id: userId,
                performance_date: date,
                pt12: parseFloat(itemsData.pt12) || 0,
                super_kix: parseFloat(itemsData.super_kix) || 0,
                tazbeet: parseFloat(itemsData.tazbeet) || 0,
                data: parseFloat(itemsData.data) || 0,
                adsl: parseFloat(itemsData.adsl) || 0,
                fixed: parseFloat(itemsData.fixed) || 0,
                we_pay: parseFloat(itemsData.we_pay) || 0,
                notes: notes,
                updated_at: new Date().toISOString()
            };

            try {
                return await restFetch('daily_performance', {
                    method: 'POST',
                    headers: { 'Prefer': 'resolution=merge-duplicates' },
                    body: JSON.stringify(body)
                });
            } catch (err) {
                return body;
            }
        },

        /**
         * Saves or updates target period with targets
         */
        saveTargetPeriod: async function (periodData, itemTargets) {
            try {
                const savedPeriodRows = await restFetch('target_periods', {
                    method: 'POST',
                    headers: { 'Prefer': 'return=representation' },
                    body: JSON.stringify(periodData)
                });
                const period = savedPeriodRows[0];
                if (!period) throw new Error('Failed to create target period');

                // Upsert targets
                const targetRecords = Object.keys(itemTargets).map(item => ({
                    period_id: period.id,
                    item,
                    target_value: parseFloat(itemTargets[item]) || 0
                }));

                await restFetch('targets', {
                    method: 'POST',
                    headers: { 'Prefer': 'resolution=merge-duplicates' },
                    body: JSON.stringify(targetRecords)
                });

                return period;
            } catch (err) {
                return periodData;
            }
        },

        /**
         * AI Analysis cache lookup
         */
        fetchAiAnalysisCache: async function (userId, periodId) {
            try {
                const query = `ai_analysis?user_id=eq.${userId}&period_id=eq.${periodId}&order=created_at.desc&limit=1`;
                const rows = await restFetch(query);
                return rows[0] || null;
            } catch (err) {
                return null;
            }
        },

        saveAiAnalysisCache: async function (userId, periodId, type, inputData, response) {
            try {
                return await restFetch('ai_analysis', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: userId,
                        period_id: periodId,
                        analysis_type: type,
                        input_data: inputData,
                        response: response
                    })
                });
            } catch (err) {
                console.warn('Failed to save AI cache:', err);
            }
        },

        /**
         * Edge Function invocation helper
         */
        callEdgeFunction: async function (functionName, payload) {
            const token = getCookieToken();
            const res = await fetch(`${SB_URL}/functions/v1/${functionName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error || 'Edge Function execution failed');
            }
            return await res.json();
        },

        /**
         * Logs audit action
         */
        logAuditAction: async function (action, details = {}) {
            try {
                const user = window._sbUser;
                await restFetch('audit_logs', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: user ? user.id : null,
                        action,
                        details
                    })
                });
            } catch (err) {
                // Silent fail for logging
            }
        }
    };

    global.TargetAPI = TargetAPI;
})(typeof window !== 'undefined' ? window : this);
